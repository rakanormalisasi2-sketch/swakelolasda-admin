/**
 * GEOCODING UTILITY - PRIORITAS
 * 
 * PRIORITAS 1: AUTO-KOORDINAT (dari nama desa/kecamatan)
 *   - Koordinat HARUS di dalam area: Bojonegoro > Kecamatan > Desa
 *   - Validasi: Koordinat dalam batas Bojonegoro + address match Bojonegoro
 * 
 * PRIORITAS 2: MANUAL KOORDINAT (dari input user)
 *   - Jika auto gagal, gunakan manual
 *   - Di handle di level page.js / peta/page.js
 */

const GEOCODER_CACHE = {};
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Geoapify API Key
const GEOAPIFY_API_KEY = 'ceebe7ceb7d44a9389015ecc111c2fa5';

// Batas wilayah Bojonegoro (verified)
const BOJONEGORO_BOUNDS = {
  minLat: -7.55,
  maxLat: -7.0,
  minLng: 111.4,
  maxLng: 112.0
};

// Daftar kecamatan Bojonegoro (untuk validasi)
const KECAMATAN_BOJONEGORO = [
  'BALEN', 'BAURENO', 'BOJONEGORO', 'BUBULAN', 'DANDER', 'GAYAM',
  'GONDANG', 'KALITIDU', 'KANOR', 'KAPAS', 'KASIMAN', 'KEDEWAN',
  'KEDUNGADEM', 'KEPOHBARU', 'MALO', 'MARGOMULYO', 'NGAMBON', 'NGASEM',
  'NGRAHO', 'PADANGAN', 'PURWOSARI', 'SEKAR', 'SUGIHWARAS', 'SUKOSEWU',
  'SUMBEREJO', 'TAMBAKREJO', 'TEMAYANG', 'TRUCUK'
];

function cacheKey(desa, kecamatan) {
  return `${String(desa).trim().toLowerCase()}|${String(kecamatan).trim().toLowerCase()}`;
}

function isExpired(entry) {
  return Date.now() - entry.timestamp > CACHE_TTL_MS;
}

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(`geo_cache_${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (isExpired(entry)) {
      localStorage.removeItem(`geo_cache_${key}`);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(
      `geo_cache_${key}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // storage full or unavailable — silently skip
  }
}

function normalizeName(name) {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Validasi apakah koordinat ada di dalam area Bojonegoro
 */
function isInBojonegoroArea(lat, lng) {
  return (
    lat >= BOJONEGORO_BOUNDS.minLat &&
    lat <= BOJONEGORO_BOUNDS.maxLat &&
    lng >= BOJONEGORO_BOUNDS.minLng &&
    lng <= BOJONEGORO_BOUNDS.maxLng
  );
}

/**
 * Validasi result geocoder
 * Koordinat harus:
 * 1. Di dalam batas Bojonegoro
 * 2. Address menyebutkan Bojonegoro atau Jawa Timur
 */
function validateBojonegoroResult(result, targetDesa, targetKecamatan) {
  if (!result || !result.lat || !result.lng) {
    return { valid: false, reason: 'No coordinates' };
  }
  
  const lat = parseFloat(result.lat);
  const lng = parseFloat(result.lng);
  const displayAddr = (result.displayName || result.formatted || '').toLowerCase();
  
  // Normalize target names for comparison
  const targetDesaNorm = normalizeName(targetDesa).toLowerCase();
  const targetKecNorm = normalizeName(targetKecamatan).toLowerCase();
  
  // Check 1: Koordinat harus di dalam batas Bojonegoro
  const coordInBojonegoro = isInBojonegoroArea(lat, lng);
  if (!coordInBojonegoro) {
    return { valid: false, reason: 'Coordinates outside Bojonegoro bounds' };
  }
  
  // Check 2: Address harus menyebutkan Bojonegoro / Jawa Timur
  const mentionsBojonegoro = 
    displayAddr.includes('bojoneg') ||
    displayAddr.includes('kabupaten bojoneg');
  
  const mentionsJawaTimur = 
    displayAddr.includes('jawa timur') ||
    displayAddr.includes('east java') ||
    displayAddr.includes('jatim');
  
  if (!mentionsBojonegoro && !mentionsJawaTimur) {
    return { valid: false, reason: 'Address does not mention Bojonegoro or East Java' };
  }
  
  // Check 3: Priority - check if mentions the specific kecamatan
  const mentionsKecamatan = 
    displayAddr.includes(targetKecNorm) ||
    (result.district && result.district.toLowerCase().includes(targetKecNorm)) ||
    (result.county && result.county.toLowerCase().includes(targetKecNorm)) ||
    (result.city && result.city.toLowerCase().includes(targetKecNorm));
  
  // Check 4: Check if mentions the specific desa (lower priority - some geocoders don't have village level)
  const mentionsDesa = 
    displayAddr.includes(targetDesaNorm) ||
    (result.village && result.village.toLowerCase().includes(targetDesaNorm)) ||
    (result.suburb && result.suburb.toLowerCase().includes(targetDesaNorm));
  
  // Calculate confidence score
  let confidence = 0;
  if (coordInBojonegoro) confidence += 40;
  if (mentionsBojonegoro) confidence += 30;
  if (mentionsJawaTimur) confidence += 10;
  if (mentionsKecamatan) confidence += 15;
  if (mentionsDesa) confidence += 5;
  
  const isValid = confidence >= 70; // Minimum 70% confidence
  
  return {
    valid: isValid,
    confidence,
    lat,
    lng,
    address: result.displayName || result.formatted,
    mentionsDesa,
    mentionsKecamatan,
    mentionsBojonegoro,
    reason: isValid ? 'Valid Bojonegoro location' : `Low confidence (${confidence}%)`
  };
}

/**
 * Geocode using Geoapify - PRIMARY (Rate limit: 10,000/day)
 */
async function geocodeWithGeoapify(desa, kecamatan) {
  try {
    // Query formats - prioritas spesifik Bojonegoro
    const queries = [
      // Prioritas 1: Desa + Kecamatan + Kabupaten + Provinsi (Sangat spesifik)
      `Desa ${normalizeName(desa)}, Kecamatan ${normalizeName(kecamatan)}, Kabupaten Bojonegoro, Jawa Timur`,
      // Prioritas 2: Kantor Desa (biasanya titik pusat pemerintahan yang akurat)
      `Kantor Desa ${normalizeName(desa)}, Bojonegoro`,
      // Prioritas 3: Nama Desa + Kecamatan + Bojonegoro
      `${normalizeName(desa)}, ${normalizeName(kecamatan)}, Bojonegoro`,
      // Prioritas 4: Nama Desa + Bojonegoro
      `${normalizeName(desa)}, Bojonegoro, East Java`,
    ];

    for (const query of queries) {
      console.log(`[Geoapify] Trying: "${query}"`);
      
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&format=json&apiKey=${GEOAPIFY_API_KEY}&countrycode=id`;
      
      const res = await fetch(url);
      
      if (res.status === 429) {
        console.warn(`[Geoapify] Rate limited!`);
        return { lat: null, lng: null, isRateLimited: true };
      }
      
      if (!res.ok) continue;
      
      const data = await res.json();
      
      if (data && data.results && data.results.length > 0) {
        // Cari result terbaik yang valid di Bojonegoro
        let bestResult = null;
        let bestConfidence = 0;
        
        for (const result of data.results) {
          const validation = validateBojonegoroResult(result, desa, kecamatan);
          
          if (validation.valid && validation.confidence > bestConfidence) {
            bestResult = {
              lat: validation.lat,
              lng: validation.lng,
              displayName: validation.address,
              confidence: validation.confidence,
              mentionsDesa: validation.mentionsDesa,
              mentionsKecamatan: validation.mentionsKecamatan
            };
            bestConfidence = validation.confidence;
          }
        }
        
        if (bestResult) {
          console.log(`[Geoapify] ✅ Found: ${bestResult.displayName} (${bestResult.confidence}%)`);
          return {
            lat: bestResult.lat,
            lng: bestResult.lng,
            displayName: bestResult.displayName,
            source: 'geoapify',
            isRateLimited: false
          };
        }
        
        // Jika tidak ada yang valid, coba result pertama jika di Bojonegoro
        const firstResult = data.results[0];
        if (firstResult && isInBojonegoroArea(firstResult.lat, firstResult.lon)) {
          console.log(`[Geoapify] ⚠️ Using first result (low confidence): ${firstResult.formatted}`);
          return {
            lat: firstResult.lat,
            lng: firstResult.lon,
            displayName: firstResult.formatted,
            source: 'geoapify',
            isRateLimited: false
          };
        }
      }
    }
  } catch (err) {
    console.warn('Geoapify failed:', err);
  }
  return { lat: null, lng: null, isRateLimited: true };
}

/**
 * Fallback: LocationIQ
 */
async function geocodeWithLocationIQ(desa, kecamatan) {
  try {
    const LOCATIONIQ_KEY = 'pk.e053e5a22b03c9cf3278074603e93dc7';
    
    const queries = [
      `${normalizeName(desa)}, ${normalizeName(kecamatan)}, Bojonegoro, Jawa Timur, Indonesia`,
      `Desa ${normalizeName(desa)}, Bojonegoro, East Java`,
      `${normalizeName(desa)}, Bojonegoro, East Java`,
    ];

    for (const query of queries) {
      console.log(`[LocationIQ] Trying: "${query}"`);
      
      const url = `https://us1.locationiq.com/v1/search.php?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=id`;
      
      const res = await fetch(url);
      if (!res.ok) continue;
      
      const results = await res.json();
      
      if (results && results.length > 0) {
        for (const result of results) {
          const validation = validateBojonegoroResult({
            lat: result.lat,
            lng: result.lon,
            displayName: result.display_name,
            district: result.address?.county || result.address?.district,
            city: result.address?.city,
            state: result.address?.state
          }, desa, kecamatan);
          
          if (validation.valid) {
            console.log(`[LocationIQ] ✅ Found: ${validation.address} (${validation.confidence}%)`);
            return {
              lat: validation.lat,
              lng: validation.lng,
              displayName: validation.address,
              source: 'locationiq'
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('LocationIQ failed:', err);
  }
  return null;
}

/**
 * Final Fallback: Nominatim with Bojonegoro bounding box
 */
async function geocodeWithNominatim(desa, kecamatan) {
  try {
    // Bounding box untuk Bojonegoro: minLon,minLat,maxLon,maxLat
    const bbox = '111.4,-7.55,112.0,-7.0';
    
    const queries = [
      `${normalizeName(desa)}, ${normalizeName(kecamatan)}, Bojonegoro, East Java, Indonesia`,
      `Desa ${normalizeName(desa)}, Bojonegoro, Jawa Timur`,
      `${normalizeName(desa)}, Bojonegoro`,
    ];

    for (const query of queries) {
      console.log(`[Nominatim] Trying: "${query}"`);
      
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=id&viewbox=${bbox}&bounded=1`;
      
      const res = await fetch(url, {
        headers: { 'User-Agent': 'PU-SDA-Monitoring/1.0' }
      });
      
      if (!res.ok) continue;
      
      const results = await res.json();
      
      if (results && results.length > 0) {
        for (const result of results) {
          const validation = validateBojonegoroResult({
            lat: result.lat,
            lng: result.lon,
            displayName: result.display_name,
            state: result.address?.state
          }, desa, kecamatan);
          
          if (validation.valid) {
            console.log(`[Nominatim] ✅ Found: ${validation.address} (${validation.confidence}%)`);
            return {
              lat: validation.lat,
              lng: validation.lng,
              displayName: validation.address,
              source: 'nominatim'
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Nominatim failed:', err);
  }
  return null;
}

/**
 * =====================================================
 * MAIN EXPORT: geocodeLocation()
 * =====================================================
 * PRIORITAS 1: AUTO-KOORDINAT (dari nama desa/kecamatan)
 *   - Mencari koordinat di dalam area Bojonegoro
 *   - Validasi: Bojonegoro > Kecamatan > Desa
 * 
 * PRIORITAS 2: MANUAL KOORDINAT
 *   - Jika auto gagal, return null
 *   - Level page.js akan handle manual coordinates
 * =====================================================
 */
export async function geocodeLocation(desa, kecamatan) {
  // Validasi input
  if (!desa || !kecamatan) {
    console.warn('[Geocoder] ❌ Missing desa or kecamatan');
    return null;
  }
  
  const key = cacheKey(desa, kecamatan);
  
  // Check in-memory cache
  if (GEOCODER_CACHE[key] && !isExpired(GEOCODER_CACHE[key])) {
    console.log(`[Geocoder] 💾 Cache hit: ${desa}, ${kecamatan}`);
    return GEOCODER_CACHE[key].data;
  }

  // Check localStorage cache
  const stored = loadFromStorage(key);
  if (stored) {
    GEOCODER_CACHE[key] = { data: stored, timestamp: Date.now() };
    console.log(`[Geocoder] 💾 LocalStorage cache: ${desa}, ${kecamatan}`);
    return stored;
  }

  console.log(`[Geocoder] 🔍 Searching: "${desa}, ${kecamatan}" (Bojonegoro)`);

  let result = null;

  // ========================================
  // PRIORITAS 1: AUTO-GEOCODING (Geoapify)
  // ========================================
  console.log(`[Geocoder] 📡 Step 1: Geoapify (primary)`);
  result = await geocodeWithGeoapify(desa, kecamatan);
  
  if (result && result.lat && result.lng && !result.isRateLimited) {
    console.log(`[Geocoder] ✅ SUCCESS via Geoapify`);
    GEOCODER_CACHE[key] = { data: { lat: result.lat, lng: result.lng }, timestamp: Date.now() };
    saveToStorage(key, { lat: result.lat, lng: result.lng });
    return { lat: result.lat, lng: result.lng };
  }

  // ========================================
  // FALLBACK 1: LocationIQ
  // ========================================
  if (result?.isRateLimited) {
    console.log(`[Geocoder] ⚠️ Geoapify rate limited, switching to LocationIQ`);
  } else {
    console.log(`[Geocoder] ⚠️ Geoapify failed, trying LocationIQ`);
  }
  
  result = await geocodeWithLocationIQ(desa, kecamatan);
  
  if (result) {
    console.log(`[Geocoder] ✅ SUCCESS via LocationIQ`);
    GEOCODER_CACHE[key] = { data: { lat: result.lat, lng: result.lng }, timestamp: Date.now() };
    saveToStorage(key, { lat: result.lat, lng: result.lng });
    return { lat: result.lat, lng: result.lng };
  }

  // ========================================
  // FALLBACK 2: Nominatim
  // ========================================
  console.log(`[Geocoder] ⚠️ LocationIQ failed, trying Nominatim`);
  result = await geocodeWithNominatim(desa, kecamatan);
  
  if (result) {
    console.log(`[Geocoder] ✅ SUCCESS via Nominatim`);
    GEOCODER_CACHE[key] = { data: { lat: result.lat, lng: result.lng }, timestamp: Date.now() };
    saveToStorage(key, { lat: result.lat, lng: result.lng });
    return { lat: result.lat, lng: result.lng };
  }

  // ========================================
  // GAGAL: Return null (bukan fallback manual di sini)
  // Manual akan dihandle di level page.js
  // ========================================
  // Cache negative result untuk 1 jam
  GEOCODER_CACHE[key] = { data: null, timestamp: Date.now() - CACHE_TTL_MS + 60 * 60 * 1000 };
  console.warn(`[Geocoder] ❌ ALL FAILED for: ${desa}, ${kecamatan}`);
  console.warn(`[Geocoder] 💡 Tip: Gunakan input koordinat manual jika auto gagal`);
  
  return null;
}

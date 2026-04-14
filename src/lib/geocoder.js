/**
 * Geocoding utility using ArcGIS World Geocoding Service.
 * High limits, no auth required for basic searches, and highly reliable.
 * Results are cached per (normalized_desa|kecamatan) pair.
 */

const GEOCODER_CACHE = {};
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
 * Geocode a desa/kecamatan pair in Bojonegoro.
 * Returns { lat, lng } or null if geocoding fails.
 */
export async function geocodeLocation(desa, kecamatan) {
  const key = cacheKey(desa, kecamatan);

  // check in-memory cache
  if (GEOCODER_CACHE[key] && !isExpired(GEOCODER_CACHE[key])) {
    return GEOCODER_CACHE[key].data;
  }

  // check localStorage cache
  const stored = loadFromStorage(key);
  if (stored) {
    GEOCODER_CACHE[key] = { data: stored, timestamp: Date.now() };
    return stored;
  }

  // call ArcGIS API
  try {
    const query = encodeURIComponent(`${normalizeName(desa)}, ${normalizeName(kecamatan)}, Bojonegoro, East Java, Indonesia`);
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${query}&f=json&maxLocations=1`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`ArcGIS HTTP ${res.status}`);

    const results = await res.json();

    if (results && results.candidates && results.candidates.length > 0) {
      const location = results.candidates[0].location;
      const entry = {
        lat: location.y,
        lng: location.x,
      };

      GEOCODER_CACHE[key] = { data: entry, timestamp: Date.now() };
      saveToStorage(key, entry);
      return entry;
    }
  } catch (err) {
    console.warn('Geocoding failed for', desa, kecamatan, err);
  }

  // cache negative result too, but with shorter TTL
  GEOCODER_CACHE[key] = { data: null, timestamp: Date.now() - CACHE_TTL_MS + 60 * 60 * 1000 };
  return null;
}

export const CALC_CONSTANTS = {
  // AHSP SNI Soil Factors
  SOIL_FACTOR: {
    biasa: 1.20, // Swelling 20%
    keras: 1.25, // Formasi 25%
    lumpur: 1.50
  }
};

export const MASTER_EXCAVATOR_SPECS = {
  'PC50': { name: 'Excavator Standard PC 50', hp: 39, bucket: 0.22 },
  'PC75': { name: 'Excavator Standard PC 75', hp: 60, bucket: 0.30 },
  'PC100': { name: 'Excavator Standard PC 100', hp: 75, bucket: 0.40 },
  'PC200': { name: 'Excavator Standard PC 200', hp: 138, bucket: 0.90 },
  'PC200LA': { name: 'Excavator PC 200 Long Arm', hp: 138, bucket: 0.50 }
};

/**
 * Formula Konsumsi BBM (Modul Termodinamika AHSP 2026 / Jurnal)
 * L/Jam = HP * Load Factor * Specific Fuel Consumption (SFC dalam L/kWh) * Konstanta Konversi HP ke kW
 */
export function calculateFuelPerHour(hp, loadFactor, sfc) {
   const KW_PER_HP = 0.7457;
   // Liter / Jam = Power_Dikeluarkan (kW) * Spesific Fuel Consumption (L/kWh)
   // Power_Dikeluarkan (kW) = HP * Kw_Per_Hp * Load Factor   
   const lJam = hp * KW_PER_HP * loadFactor * sfc;
   return lJam;
}

/**
 * Fungsi Smart STA Splitter
 * Input: { panjangTotal, lebarDasar, kedalamanTarget, slopeRasio }
 * Output: Array of 5 STA Objek [{ sta: "0+x", w, h, area, vol }, ...]
 * Requirement: Total agregat Volume harus sama absolut dengan volume master!
 */
export function generateSmartSTA(panjang, wDasar, hTarget, mSlope) {
    const segments = 5;
    const interval = panjang / (segments - 1);
    
    // Target murni dari 1 Prisma ideal
    const wAtasTarget = wDasar + 2 * (mSlope * hTarget);
    const areaTarget = ((wDasar + wAtasTarget) / 2) * hTarget;
    const volumeTarget = areaTarget * panjang; // Target master mutlak

    let stas = [];
    let cumulativeLength = 0;

    // 1. Generate Raw Variations (Deviasi max 5%)
    for(let i=0; i<segments; i++) {
        let label = `0+${String(Math.round(cumulativeLength)).padStart(3, '0')}`;
        
        // Pseudo-random variance between 0.95 and 1.05
        let varianceW = 1 + (Math.sin(i * 13) * 0.05); 
        let varianceH = 1 + (Math.cos(i * 17) * 0.05);

        let curW = wDasar * varianceW;
        let curH = hTarget * varianceH;

        stas.push({
            sta: label,
            wDasar: curW,
            h: curH,
            lengthAt: cumulativeLength
        });

        cumulativeLength += interval;
    }

    // 2. Hitung Raw Volume dengan Rumus Kesalahan (Average End Area)
    let rawTotalVolume = 0;
    for(let i=0; i<segments-1; i++) {
        let s1 = stas[i];
        let s2 = stas[i+1];
        
        // Hitung luas s1
        let wa1 = s1.wDasar + 2*(mSlope * s1.h);
        let a1 = ((s1.wDasar + wa1)/2) * s1.h;

        // Hitung luas s2
        let wa2 = s2.wDasar + 2*(mSlope * s2.h);
        let a2 = ((s2.wDasar + wa2)/2) * s2.h;

        let volPias = ((a1 + a2)/2) * interval;
        rawTotalVolume += volPias;
    }

    // 3. Kalkulasi Equalizer (Normalization Ratio)
    // Karena Volume proporsional secara kubik/kuadratik terhadap dimensi (A ~ w*h)
    // Kita gunakan perbandingan akar untuk normalisasi dimensi
    const ratioArea = volumeTarget / rawTotalVolume;
    const ratioLinier = Math.sqrt(ratioArea);

    // 4. Terapkan Equalizer agar totalnya sama persis
    stas = stas.map(s => ({
        ...s,
        wDasar: s.wDasar * ratioLinier,
        h: s.h * ratioLinier
    }));

    return stas;
}

/**
 * Fungsi Goalseek (Bisection Method)
 * Mencari Waktu Siklus (T1) agar Volume Galian/Jam sesuai dengan target
 */
export function doGoalSeek(targetGalianPerJam, { kapasitasBucket, faktorBucket, efisiensiAlat, faktorKembang }) {
    // Rumus Dasar Produksi Excavator: Q = (V * Fb * Fa * 60) / (T1 * Fv)
    // targetGalianPerJam = Q
    // T1 = (V * Fb * Fa * 60) / (Q * Fv)
    
    // Dalam metode Bisection murni kita mencari f(x) = 0
    // Namun karena fungsinya linier kebalikan (1/x), kita bisa pecah langsung secara analitis:
    
    let V = kapasitasBucket; // m3
    let Fb = faktorBucket; 
    let Fa = efisiensiAlat;
    let Fv = faktorKembang; // Soil Swelling (1.2 normal)

    if(targetGalianPerJam === 0) return 0;

    let targetMenitT1 = (V * Fb * Fa * 60) / (targetGalianPerJam * Fv);
    
    return targetMenitT1;
}

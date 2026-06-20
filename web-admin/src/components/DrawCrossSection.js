'use client';
import React from 'react';

/**
 * Komponen Sketsa Cross-Section (Trapesium) untuk Lampiran Gambar Teknik & Panduan UI.
 * Dirancang oleh: OpenClaude & Antigravity
 */
export default function DrawCrossSection({ 
    wDasar = 5, 
    hTarget = 2, 
    mSlope = 1,
    staLabel = "0+000",
    panjang = 500,
    isPrintMode = false,
    kopData = {}
}) {
  // Hitung Lebar Atas
  const wAtas = wDasar + 2 * (mSlope * hTarget);

  // Parameter Kanvas SVG
  const svgWidth = 800;
  const svgHeight = 400;
  const paddingX = 100;
  const paddingY = 150;
  
  // Lebar maksimal yang akan digambar menyesuaikan 800px area
  const scale = (svgWidth - 2 * paddingX) / (wAtas || 10);
  
  const drawWAtas = wAtas * scale;
  const drawWDasar = wDasar * scale;
  const drawH = hTarget * scale;

  // Titik Koordinat Trapesium
  // x1,y1 (Kiri Atas)
  const x1 = paddingX;
  const y1 = paddingY;
  // x2,y2 (Kanan Atas)
  const x2 = paddingX + drawWAtas;
  const y2 = paddingY;
  // x3,y3 (Kanan Bawah)
  const x3 = paddingX + drawWAtas - (mSlope * hTarget * scale);
  const y3 = paddingY + drawH;
  // x4,y4 (Kiri Bawah)
  const x4 = paddingX + (mSlope * hTarget * scale);
  const y4 = paddingY + drawH;

  return (
    <div className={`cross-section-container ${isPrintMode ? 'print-landscape-page' : ''}`} style={!isPrintMode ? {border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden', background:'#f8fafc'} : { pageBreakInside: 'avoid', height: '100vh', display:'flex', flexDirection:'column' }}>
      
      {isPrintMode && (
         <div style={{ border: '2px solid black', padding: 10, margin: 20, marginBottom: 0, display:'flex', fontSize:12, fontWeight:'bold', textTransform:'uppercase' }}>
           <div style={{flex:1, borderRight:'2px solid black', paddingRight:10}}>
              <div>PEMERINTAH KABUPATEN BOJONEGORO</div>
              <div>DINAS PEKERJAAN UMUM SUMBER DAYA AIR</div>
              <div style={{fontSize:10, fontWeight:'normal', marginTop:4}}>JL. LETTU SUYITNO NO. 39 BOJONEGORO</div>
           </div>
           <div style={{flex:2, paddingLeft:10}}>
              <table style={{width:'100%', borderCollapse:'collapse'}} border="1">
                 <tbody>
                    <tr><td width="20%" style={{padding:4}}>PROGRAM</td><td style={{padding:4}}>: {kopData.program || '-'}</td></tr>
                    <tr><td style={{padding:4}}>KEGIATAN</td><td style={{padding:4}}>: {kopData.kegiatan || '-'}</td></tr>
                    <tr><td style={{padding:4}}>PEKERJAAN</td><td style={{padding:4}}>: {kopData.pekerjaan || '-'}</td></tr>
                    <tr><td style={{padding:4}}>LOKASI</td><td style={{padding:4}}>: {kopData.lokasi || '-'}</td></tr>
                 </tbody>
              </table>
           </div>
           <div style={{flex:1.5, paddingLeft:10}}>
              <table style={{width:'100%', borderCollapse:'collapse', textAlign:'center'}} border="1">
                 <tbody>
                    <tr>
                       <td style={{padding:4}} colSpan={2}><b>JUDUL GAMBAR</b><br/>{kopData.judul_gambar || `CROSS SECTION STA ${staLabel}`}</td>
                    </tr>
                    <tr><td style={{padding:4}}>KODE GAMBAR<br/>{kopData.kode_gambar || 'CS-01'}</td><td style={{padding:4}}>SKALA<br/>FIT TO PAPER</td></tr>
                    <tr><td style={{padding:4}}>DIBUAT TGL<br/>{kopData.tahun || new Date().getFullYear()}</td><td style={{padding:4}}>LBR: {kopData.no_lembar || 1} / {kopData.jumlah_lembar || 5}</td></tr>
                 </tbody>
              </table>
           </div>
         </div>
      )}

      <div style={{ width: '100%', height: isPrintMode ? '100%' : 'auto', display:'flex', justifyContent:'center', alignItems:'center', background:'#fff', minHeight:400 }}>
        <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width:'100%', height:'auto' }}>
          {/* Grid lines */}
          <g stroke="#f1f5f9" strokeWidth="1">
            {Array.from({length: 20}).map((_, i) => <line key={`h${i}`} x1="0" y1={i*20} x2={svgWidth} y2={i*20} />)}
            {Array.from({length: 40}).map((_, i) => <line key={`v${i}`} x1={i*20} y1="0" x2={i*20} y2={svgHeight} />)}
          </g>

          {/* Garis Muka Tanah Existing (Ground Level) */}
          <line x1="20" y1={y1} x2={svgWidth-20} y2={y1} stroke="#10b981" strokeWidth="2" strokeDasharray="5,5" />
          <text x="25" y={y1 - 10} fill="#10b981" fontSize="12" fontWeight="bold">Muka Tanah (Ground Level)</text>

          {/* Bangun Trapesium Galian */}
          <polygon 
            points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`} 
            fill="#e2e8f0" 
            stroke="#475569" 
            strokeWidth="3" 
            fillOpacity="0.4"
          />

          {/* Garis Dimensi Lebar Atas */}
          <line x1={x1} y1={y1 - 30} x2={x2} y2={y1 - 30} stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
          <text x={x1 + (drawWAtas/2)} y={y1 - 40} textAnchor="middle" fill="#1d4ed8" fontSize="14" fontWeight="bold">Lebar Atas (b) = {wAtas.toFixed(2)} m</text>

          {/* Garis Dimensi Lebar Bawah */}
          <line x1={x4} y1={y3 + 30} x2={x3} y2={y3 + 30} stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
          <text x={x4 + (drawWDasar/2)} y={y3 + 50} textAnchor="middle" fill="#1d4ed8" fontSize="14" fontWeight="bold">Lebar Dasar (B) = {wDasar.toFixed(2)} m</text>

          {/* Garis Dimensi Kedalaman */}
          <line x1={x2 + 40} y1={y1} x2={x2 + 40} y2={y3} stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
          <text x={x2 + 50} y={y1 + (drawH/2)} alignmentBaseline="middle" fill="#b91c1c" fontSize="14" fontWeight="bold">H = {hTarget.toFixed(2)} m</text>

          {/* Label Kemiringan (Slope) */}
          <text x={x1 + ((x4-x1)/2) - 30} y={y1 + (drawH/2)} fill="#0f766e" fontSize="13" fontWeight="bold" transform={`rotate(-${Math.atan(drawH/(x4-x1)) * 180 / Math.PI}, ${x1 + ((x4-x1)/2)}, ${y1 + (drawH/2)})`}>
             Slope (1:{mSlope})
          </text>

          {/* Markers */}
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
}

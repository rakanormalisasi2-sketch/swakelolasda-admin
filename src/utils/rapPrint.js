'use client';

/**
 * rapPrint.js
 * PDF Print Utilities untuk RAP Module
 *
 * Generates printable documents with Cross-Section images
 * 10 gambar: 5 Perencanaan + 5 Pelaksanaan
 */

/**
 * Generate SVG string untuk satu gambar cross-section dengan kop
 * Digunakan untuk print/PDF
 */
export function generatePrintableSVG(staData, kopData, options = {}) {
  const {
    width = 800,
    height = 600,
    jenis = 'PERENCANAAN'
  } = options;

  const { dimensi, luasGalian = 0 } = staData;
  const { b1, b2, b3, h, hPrime, slope = 1 } = dimensi;

  // Scale calculations
  const padding = { top: 30, right: 150, bottom: 30, left: 30 };
  const drawWidth = width - padding.left - padding.right;
  const drawHeight = height - padding.top - padding.bottom;

  const scaleX = drawWidth / (b3 + 1);
  const scaleY = drawHeight / (hPrime + 0.5);
  const scale = Math.min(scaleX, scaleY);

  const originX = padding.left;
  const originY = padding.top + drawHeight - (hPrime * scale);

  const toSvg = (x, y) => ({
    x: originX + x * scale,
    y: originY - (hPrime - y) * scale
  });

  // Generate kontur
  const generateEksistingPath = () => {
    const points = [];
    for (let i = 0; i < 15; i++) {
      const x = (i / 14) * b3;
      const undulation = Math.sin(i * 1.5) * 0.1 * hPrime;
      points.push({ x, y: hPrime + undulation });
    }
    const svgPoints = points.map(p => toSvg(p.x, p.y));
    let path = `M ${svgPoints[0].x} ${svgPoints[0].y}`;
    for (let i = 1; i < svgPoints.length - 1; i++) {
      const midX = (svgPoints[i].x + svgPoints[i + 1].x) / 2;
      const midY = (svgPoints[i].y + svgPoints[i + 1].y) / 2;
      path += ` Q ${svgPoints[i].x} ${svgPoints[i].y} ${midX} ${midY}`;
    }
    path += ` L ${svgPoints[svgPoints.length - 1].x} ${svgPoints[svgPoints.length - 1].y}`;
    return path;
  };

  const rencanaPoints = [
    { x: 0, y: hPrime },
    { x: b3, y: hPrime },
    { x: b1 + slope * h, y: hPrime - h },
    { x: -slope * h, y: hPrime - h }
  ];
  const rencanaCoords = rencanaPoints.map(p => toSvg(p.x, p.y));
  const rencanaPath = rencanaCoords.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ') + ' Z';

  // Area galian
  const eksistingPoints = [];
  for (let i = 0; i < 15; i++) {
    const x = (i / 14) * b3;
    const undulation = Math.sin(i * 1.5) * 0.1 * hPrime;
    eksistingPoints.push({ x, y: hPrime + undulation });
  }
  const areaPoints = [...rencanaCoords.slice(0, 2), ...eksistingPoints.reverse().map(p => toSvg(p.x, p.y))];
  const areaPath = areaPoints.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ') + ' Z';

  const midLuas = toSvg(b3 / 2, hPrime - h / 2);

  // SVG Template
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="10">
          <line x1="3" y1="0" x2="3" y2="10" stroke="#991b1b" stroke-width="1"/>
        </pattern>
      </defs>

      <!-- Grid -->
      <g stroke="#f1f5f9" stroke-width="0.5">
        ${Array.from({length: 15}, (_, i) => `<line x1="0" y1="${i * 40}" x2="${width}" y2="${i * 40}"/>`).join('')}
        ${Array.from({length: 20}, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="${height}"/>`).join('')}
      </g>

      <!-- Ground Level -->
      <line x1="${originX - 10}" y1="${toSvg(0, hPrime).y}" x2="${originX + (b3 + 1) * scale}" y2="${toSvg(0, hPrime).y}" stroke="#10b981" stroke-width="2" stroke-dasharray="5,5"/>
      <text x="${originX - 5}" y="${toSvg(0, hPrime).y - 8}" fill="#10b981" font-size="10" text-anchor="end">Muka Tanah</text>

      <!-- Area Galian (di-arsir) -->
      <polygon points="${areaPath}" fill="url(#hatch)" opacity="0.8"/>

      <!-- Garis Eksisting -->
      <path d="${generateEksistingPath()}" stroke="#1e40af" stroke-width="2.5" fill="none"/>

      <!-- Garis Rencana -->
      <polygon points="${rencanaPath}" stroke="#1f2937" stroke-width="2.5" fill="none"/>

      <!-- Dimensi Labels -->
      <text x="${toSvg(b1/2, hPrime - h).x}" y="${toSvg(b1/2, hPrime - h).y + 30}" text-anchor="middle" fill="#1d4ed8" font-size="10" font-weight="bold">b₁ = ${b1.toFixed(3)} m</text>
      <text x="${toSvg(b3/2, hPrime).x}" y="${toSvg(b3/2, hPrime).y - 30}" text-anchor="middle" fill="#1d4ed8" font-size="10" font-weight="bold">b₃ = ${b3.toFixed(3)} m</text>
      <text x="${toSvg(b3 + 0.3, hPrime - h/2).x + 10}" y="${toSvg(b3 + 0.3, hPrime - h/2).y}" fill="#b91c1c" font-size="10" font-weight="bold">h = ${h.toFixed(3)} m</text>
      <text x="${toSvg(b3 + 0.3, hPrime/2).x + 10}" y="${toSvg(b3 + 0.3, hPrime/2).y}" fill="#64748b" font-size="9">h' = ${hPrime.toFixed(3)} m</text>

      <!-- Luas Label -->
      <text x="${midLuas.x}" y="${midLuas.y}" text-anchor="middle" fill="#991b1b" font-size="14" font-weight="bold" stroke="white" stroke-width="3" paint-order="stroke">Luas = ${Number(luasGalian).toFixed(3)} m²</text>

      <!-- Legenda -->
      <g transform="translate(${padding.left}, ${height - 20})">
        <line x1="0" y1="0" x2="30" y2="0" stroke="#1e40af" stroke-width="2.5"/>
        <text x="35" y="4" font-size="8" fill="#1e40af">Kontur Eksisting</text>
        <line x1="120" y1="0" x2="150" y2="0" stroke="#1f2937" stroke-width="2.5"/>
        <text x="155" y="4" font-size="8" fill="#1f2937">Rencana Galian</text>
        <rect x="250" y="-8" width="20" height="16" fill="url(#hatch)"/>
        <text x="275" y="4" font-size="8" fill="#991b1b">Area Galian</text>
      </g>

      <!-- KOP (di kanan) -->
      <foreignObject x="${width - 140}" y="0" width="140" height="250">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:140px;height:250px;border-left:2px solid black;padding:4px;font-size:7px;font-family:Arial,sans-serif;display:flex;flex-direction:column;background:white;box-sizing:border-box;overflow:hidden;">
          <div style="text-align:center;border-bottom:1px solid black;padding-bottom:2px;margin-bottom:2px;">
            <div style="font-weight:bold;">PEMERINTAH KABUPATEN BOJONEGORO</div>
            <div style="font-weight:bold;">DINAS PU SUMBER DAYA AIR</div>
          </div>
          <div style="margin-bottom:2px;border-bottom:1px solid #ccc;padding-bottom:1px;">
            <div style="font-weight:bold;">PROGRAM:</div>
            <div style="line-height:1.1;">${kopData?.program || '-'}</div>
          </div>
          <div style="margin-bottom:2px;border-bottom:1px solid #ccc;padding-bottom:1px;">
            <div style="font-weight:bold;">KEGIATAN:</div>
            <div style="line-height:1.1;">${kopData?.kegiatan || '-'}</div>
          </div>
          <div style="margin-bottom:2px;border-bottom:1px solid #ccc;padding-bottom:1px;">
            <div style="font-weight:bold;">PEKERJAAN:</div>
            <div style="line-height:1.1;">${kopData?.pekerjaan || '-'}</div>
          </div>
          <div style="margin-bottom:2px;border-bottom:1px solid #ccc;padding-bottom:1px;">
            <div style="font-weight:bold;">LOKASI:</div>
            <div style="line-height:1.1;">${kopData?.lokasi || '-'}</div>
          </div>
          <div style="margin-bottom:2px;border-bottom:1px solid #ccc;padding-bottom:1px;">
            <div style="font-weight:bold;">TAHUN: ${kopData?.tahun || new Date().getFullYear()}</div>
          </div>
          <div style="margin-bottom:2px;border-bottom:1px solid #ccc;padding-bottom:1px;background:${jenis === 'PELAKSANAAN' ? '#dcfce7' : '#dbeafe'}">
            <div style="font-weight:bold;">JENIS:</div>
            <div style="font-weight:bold;color:${jenis === 'PELAKSANAAN' ? '#166534' : '#1e40af'}">${jenis}</div>
          </div>
          <div style="flex:1"></div>
          <div style="border-top:1px solid black;padding-top:2px;text-align:center;">
            <div style="font-weight:bold;">STA: ${kopData?.sta || '0+000'}</div>
            <div>SKALA: ${kopData?.skala || '1:40'}</div>
          </div>
          <div style="border-top:1px solid black;padding-top:2px;margin-top:2px;text-align:center;">
            <div style="font-weight:bold;">JUDUL GAMBAR</div>
            <div>CROSS SECTION STA ${kopData?.sta || '0+000'}</div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:2px;font-size:6px;">
            <div>KODE: ${kopData?.kodeGambar || 'NS-01'}</div>
            <div>LBR: ${kopData?.noLembar || 1}/${kopData?.jumlahLembar || 5}</div>
          </div>
        </div>
      </foreignObject>
    </svg>
  `;
}

/**
 * Generate all 10 SVGs (5 Perencanaan + 5 Pelaksanaan)
 */
export function generateAllSVGs(rapState) {
  const { geometri, backupPelaksanaan } = rapState;
  const svgs = [];

  // 5 Perencanaan
  geometri.stas?.forEach((sta, i) => {
    svgs.push({
      jenis: 'PERENCANAAN',
      sta: sta.sta,
      index: i,
      svg: generatePrintableSVG(
        {
          dimensi: { b1: sta.b1, b2: sta.b2, b3: sta.b3, h: sta.h, hPrime: sta.hPrime, slope: geometri.slope },
          luasGalian: sta.luas
        },
        {
          ...geometri.kopData,
          sta: sta.sta,
          noLembar: i + 1,
          jumlahLembar: geometri.stas?.length || 5,
          jenis: 'PERENCANAAN'
        },
        { jenis: 'PERENCANAAN' }
      )
    });
  });

  // 5 Pelaksanaan
  backupPelaksanaan.stas?.forEach((sta, i) => {
    svgs.push({
      jenis: 'PELAKSANAAN',
      sta: sta.sta,
      index: i,
      svg: generatePrintableSVG(
        {
          dimensi: { b1: sta.b1, b2: sta.b2, b3: sta.b3, h: sta.h, hPrime: sta.hPrime, slope: geometri.slope },
          luasGalian: sta.luas
        },
        {
          ...geometri.kopData,
          sta: sta.sta,
          noLembar: i + 1,
          jumlahLembar: backupPelaksanaan.stas?.length || 5,
          jenis: 'PELAKSANAAN'
        },
        { jenis: 'PELAKSANAAN' }
      )
    });
  });

  return svgs;
}

/**
 * Create print window dengan 10 gambar
 */
export function printCrossSections(rapState) {
  const svgs = generateAllSVGs(rapState);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>RAP - Cross Section Print</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .page { page-break-after: always; width: 100%; height: 100vh; display: flex; flex-direction: column; }
        .page:last-child { page-break-after: avoid; }
        .header { text-align: center; padding: 10px; border-bottom: 2px solid black; }
        .header h1 { margin: 0; font-size: 16px; }
        .header h2 { margin: 5px 0 0; font-size: 12px; color: #666; }
        .images-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px; flex: 1; }
        .image-item { border: 1px solid #ccc; padding: 5px; text-align: center; }
        .image-item svg { width: 100%; height: auto; }
        .caption { font-size: 10px; font-weight: bold; margin-top: 5px; }
        .page-number { text-align: center; padding: 5px; font-size: 10px; }
        @media print { .page { page-break-after: always; } }
      </style>
    </head>
    <body>
      <div style="padding: 20px;">
        <h1 style="text-align: center;">GAMBAR CROSS SECTION</h1>
        <h2 style="text-align: center; color: #666;">RAP - ${rapState.geometri?.kopData?.pekerjaan || 'Perhitungan'}</h2>
      </div>

      ${svgs.map((item, idx) => `
        <div style="page-break-after: always; padding: 20px;">
          <div style="text-align: center; font-weight: bold; margin-bottom: 10px;">
            ${item.jenis} - STA ${item.sta} (Lembar ${item.index + 1})
          </div>
          <div style="display: flex; justify-content: center;">
            ${item.svg}
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Download SVG as image file
 */
export async function downloadSVGAsImage(svgString, filename = 'cross-section.svg') {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Download all SVGs as ZIP
 */
export async function downloadAllSVGsAsZip(rapState) {
  const svgs = generateAllSVGs(rapState);

  // For now, just open print dialog with all SVGs
  // In production, you would use JSZip library
  printCrossSections(rapState);
}
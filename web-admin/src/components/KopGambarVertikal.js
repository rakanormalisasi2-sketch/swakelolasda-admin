'use client';

/**
 * KopGambarVertikal.js
 * Komponen Kop Gambar Teknik - Posisi VERTIKAL di KANAN
 *
 * Format sesuai SUNGAI SEMAR MENDEM JEMBATAwwN.pdf
 * Digunakan untuk setiap gambar Cross-Section STA
 */

/**
 * Komponen KOP Gambar Teknik
 * Posisi: VERTIKAL di KANAN gambar
 */
const KopGambarVertikal = ({
  data = {},
  width = 150,
  height = 250
}) => {
  const {
    program = 'PROGRAM PENGELOLAAN SUMBER DAYA AIR (SDA)',
    kegiatan = 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI',
    pekerjaan = 'NORMALISASI SUNGAI',
    lokasi = '-',
    tahun = new Date().getFullYear(),
    sta = '0+000',
    skala = '1:40',
    kodeGambar = 'NS-01',
    noLembar = 1,
    jumlahLembar = 5,
    judulGambar = 'CROSS SECTION STA 0+000',
    jenis = 'PERENCANAAN'
  } = data;

  const isPelaksanaan = jenis === 'PELAKSANAAN';

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: 0,
      width: `${width}px`,
      height: `${height}px`,
      borderLeft: '2px solid black',
      padding: '8px',
      fontSize: '8px',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'white',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        borderBottom: '1px solid black',
        paddingBottom: '4px',
        marginBottom: '4px'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '7px' }}>PEMERINTAH KABUPATEN BOJONEGORO</div>
        <div style={{ fontWeight: 'bold', fontSize: '7px' }}>DINAS PU SUMBER DAYA AIR</div>
      </div>

      {/* Program */}
      <div style={{ marginBottom: '3px', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '6px', marginBottom: '1px' }}>PROGRAM:</div>
        <div style={{ fontSize: '6px', color: '#333', lineHeight: 1.2 }}>{program}</div>
      </div>

      {/* Kegiatan */}
      <div style={{ marginBottom: '3px', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '6px', marginBottom: '1px' }}>KEGIATAN:</div>
        <div style={{ fontSize: '6px', color: '#333', lineHeight: 1.2 }}>{kegiatan}</div>
      </div>

      {/* Pekerjaan */}
      <div style={{ marginBottom: '3px', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '6px', marginBottom: '1px' }}>PEKERJAAN:</div>
        <div style={{ fontSize: '6px', color: '#333', lineHeight: 1.2 }}>{pekerjaan}</div>
      </div>

      {/* Lokasi */}
      <div style={{ marginBottom: '3px', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '6px', marginBottom: '1px' }}>LOKASI:</div>
        <div style={{ fontSize: '6px', color: '#333', lineHeight: 1.2 }}>{lokasi}</div>
      </div>

      {/* Tahun */}
      <div style={{ marginBottom: '3px', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '6px', marginBottom: '1px' }}>TAHUN:</div>
        <div style={{ fontSize: '6px', color: '#333' }}>{tahun}</div>
      </div>

      {/* Jenis */}
      <div style={{
        marginBottom: '3px',
        borderBottom: '1px solid #ccc',
        paddingBottom: '2px',
        backgroundColor: isPelaksanaan ? '#dcfce7' : '#dbeafe'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '6px', marginBottom: '1px' }}>JENIS:</div>
        <div style={{
          fontSize: '7px',
          color: isPelaksanaan ? '#166534' : '#1e40af',
          fontWeight: 'bold'
        }}>
          {jenis}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* STA Info */}
      <div style={{
        borderTop: '1px solid black',
        paddingTop: '4px',
        marginTop: '4px',
        textAlign: 'center'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '8px' }}>STA: {sta}</div>
        <div style={{ fontSize: '7px', marginTop: '2px' }}>SKALA: {skala}</div>
      </div>

      {/* Footer - Judul Gambar */}
      <div style={{
        borderTop: '1px solid black',
        paddingTop: '4px',
        marginTop: '4px',
        fontSize: '6px',
        textAlign: 'center'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '7px' }}>JUDUL GAMBAR</div>
        <div style={{ marginTop: '2px', lineHeight: 1.2 }}>{judulGambar}</div>
      </div>

      {/* Info Tambahan */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '4px',
        fontSize: '6px',
        borderTop: '1px solid black',
        paddingTop: '4px'
      }}>
        <div>KODE: {kodeGambar}</div>
        <div>LBR: {noLembar}/{jumlahLembar}</div>
      </div>
    </div>
  );
};

export default KopGambarVertikal;
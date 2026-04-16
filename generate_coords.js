const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = 'C:\\Users\\dinas\\Downloads\\Untitled spreadsheet (1).xlsx';
const OUTPUT_PATH = path.join(__dirname, 'src', 'lib', 'wilayah_coords.json');

function generate() {
    console.log('Reading Excel from:', EXCEL_PATH);
    
    if (!fs.existsSync(EXCEL_PATH)) {
        console.error('Error: Excel file not found at', EXCEL_PATH);
        process.exit(1);
    }

    try {
        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        const coords = {};

        rawData.forEach(row => {
            const kec = String(row.Kecamatan || '').trim().toUpperCase();
            const desa = String(row.Desa || '').trim().toUpperCase();
            const lat = parseFloat(row.Latitude);
            const lng = parseFloat(row.Longitude);

            if (kec && desa && !isNaN(lat) && !isNaN(lng)) {
                if (!coords[kec]) {
                    coords[kec] = {};
                }
                coords[kec][desa] = { lat, lng };
            }
        });

        const jsonContent = JSON.stringify(coords, null, 2);
        
        // Ensure directory exists
        const dir = path.dirname(OUTPUT_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_PATH, jsonContent);
        console.log('Successfully generated:', OUTPUT_PATH);
        console.log(`Total Kecamatan: ${Object.keys(coords).length}`);
        
        let totalDesa = 0;
        Object.values(coords).forEach(d => { totalDesa += Object.keys(d).length; });
        console.log(`Total Desa: ${totalDesa}`);

    } catch (error) {
        console.error('Unexpected error:', error);
        process.exit(1);
    }
}

generate();

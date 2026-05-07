const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = "C:\\Users\\dinas\\Downloads\\Documents\\Lampiran-II-SE-DJBK-No-47-Tahun-2026-Acuan-dalam-Penyusunan-AHSP.pdf";

if (!fs.existsSync(pdfPath)) {
  console.log("File not found at", pdfPath);
  process.exit(1);
}

let dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
  const text = data.text;
  
  // Try to find sections matching "Faktor Bucket", "Efisiensi", "Kapasitas Bucket", "Excavator"
  const lines = text.split('\n');
  let capturing = false;
  let matches = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/faktor bucket|efisiensi|kapasitas|excavator/i)) {
      // Capture context
      let context = [];
      for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 10); j++) {
        context.push(lines[j]);
      }
      matches.push("--- MATCH ---");
      matches.push(context.join('\n'));
      i += 10; // skip ahead to avoid overlapping contexts too much
    }
  }
  
  // Write to a text file to easily view
  fs.writeFileSync('C:\\Users\\dinas\\.gemini\\antigravity\\brain\\77f6933f-abeb-40c2-80a1-b3ffefde0f0e\\scratch\\pdf_output.txt', matches.join('\n'));
  console.log("PDF parsed, output written to scratch.");
}).catch(function(error){
  console.error(error);
});

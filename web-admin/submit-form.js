const fs = require('fs');

// Fungsi untuk format tanggal ke YYYY-MM-DD (format standar HTML5 date yg sering diterima GForm)
function formatDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    return dateStr;
}

async function submitForm(data) {
    const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScXDOnJxmGvR_RTmY02ySSF1bwmgR8_bmGusUMnZKseWFVaHA/formResponse";

    for (const [index, respondent] of data.entries()) {
        const formData = new URLSearchParams();
        
        // Pemetaan ke Entry ID Google Form
        formData.append("entry.379774172", respondent.nama); // Nama CV
        formData.append("entry.793615406", formatDate(respondent.tanggal)); // Tanggal Pengisian
        formData.append("entry.1529319228", respondent.sesi); // Jam/Sesi (09:00 WIB (Pre-test) ATAU 11:00 WIB (Post-test))
        
        // Jawaban Soal
        formData.append("entry.733168768", respondent.q1); 
        formData.append("entry.153950579", respondent.q2);
        formData.append("entry.823571245", respondent.q3);
        formData.append("entry.2021260350", respondent.q4);
        formData.append("entry.1917343733", respondent.q5);

        try {
            console.log(`Mengirim data responden ke-${index + 1}: ${respondent.nama}...`);
            const response = await fetch(formUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: formData.toString()
            });

            if (response.ok || response.status === 200) {
                console.log(`✅ Berhasil mengirim data: ${respondent.nama}`);
            } else {
                console.log(`⚠️ Gagal mengirim data: ${respondent.nama} (Status: ${response.status})`);
            }
        } catch (error) {
            console.error(`❌ Error saat mengirim data ${respondent.nama}:`, error.message);
        }

        // Jeda 2 detik antar pengiriman agar tidak dianggap spam
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// Baca file JSON
try {
    const rawData = fs.readFileSync('data_responden.json', 'utf8');
    const jsonData = JSON.parse(rawData);
    submitForm(jsonData);
} catch (error) {
    console.error("Gagal membaca file data_responden.json. Pastikan file ada dan berformat JSON yang valid.");
    console.error("Pesan Error:", error.message);
}

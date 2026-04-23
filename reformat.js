const fs = require('fs');

const path = 'src/app/dashboard/seksi/perhitungan-rap/page.js';
let content = fs.readFileSync(path, 'utf8');

// Hapus block TabNavigation
content = content.replace(/\{\/\* Tab Bar \*\/\}(.|\n)*?<div className="tab-content">/, '<div className="content-container">');

// Hapus conditons activeTab === 'tabX' && (
content = content.replace(/\{activeTab === 'tab\d+' && \(/g, '<div className="bg-white rounded-xl shadow p-6 mb-6">');

// Hapus penutup )} untuk tab conditions. Ini agak tricky dengan regex biasa.
// Lebih baik kita replace blok return utama secara manual dengan text replacement?
// Mari kita tulis script ini hanya untuk inspect.

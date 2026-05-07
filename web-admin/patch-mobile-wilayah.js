const fs = require('fs');
let content = fs.readFileSync('../mobile-app/app/operator/laporan.tsx', 'utf8');

const newMap = `/* KECAMATAN & DESA - Data resmi Kabupaten Bojonegoro (28 kec, 430 desa) */
const DESA_MAP = {
  'BALEN': ['Balenrejo','Bulaklo','Bulu','Kabunan','Kedungbondo','Kedungdowo','Kemamang','Kenep','Lengkong','Margomulyo','Mayangkawis','Mulyoagung','Mulyorejo','Ngadiluhur','Penganten','Pilanggede','Pohbogo','Prambatan','Sarisejo','Sekaran','Sidobandung','Sobontoro','Swaloh'],
  'BAURENO': ['Banjaran','Banjaranyar','Baureno','Blongsong','Bumiayu','Drajat','Gajah','Gunungsari','Kalisari','Karangdayu','Kauman','Kedungrejo','Lebaksari','Ngemplak','Pasinan','Pomahan','Pucangarum','Selorejo','Sembunglor','Sraturejo','Sumuragung','Tanggungan','Tlogoagung','Trojalu','Tulungagung'],
  'BOJONEGORO': ['Campurejo','Kalirejo','Kauman','Mulyoagung','Pacul','Semanding','Sukorejo','Banjarejo','Jetak','Kadipaten','Karang Pacar','Kepatihan','Klangon','Ledok Kulon','Ledok Wetan','Mojokampung','Ngrowo','Sumbang'],
  'BUBULAN': ['Bubulan','Cancung','Clebung','Ngorogunung','Sumberbendo'],
  'DANDER': ['Dander','Growok','Jatiblimbing','Karangsono','Kunci','Mojoranu','Ngablak','Ngraseh','Ngulanan','Ngumpakdalem','Ngunut','Sendangrejo','Sumberagung','Sumberarum','Sumbertlaseh','Sumodikaran'],
  'GAYAM': ['Begadon','Beged','Bonorejo','Brabowan','Cengungklung','Gayam','Katur','Manukan','Mojodelik','Ngraho','Ringintunggal','Sudu'],
  'GONDANG': ['Gondang','Jari','Krondonan','Pajeng','Pragelan','Sambongrejo','Senganten'],
  'KALITIDU': ['Brenggolo','Grebegan','Kalitidu','Leran','Mayanggeneng','Mayangrejo','Mlaten','Mojo','Mojosari','Ngringinrejo','Ngujo','Panjunan','Pilangsari','Pungpungan','Sukoharjo','Sumengko','Talok','Wotanngare'],
  'KANOR': ['Bakung','Bungur','Cangakan','Caruban','Gedongarum','Kabalan','Kanor','Kedungprimpen','Nglarangan','Palembon','Pesen','Pilang','Piyak','Prigi','Samberan','Sarangan','Sedeng','Semambung','Simbatan','Simorejo','Sroyo','Sumberwangi','Tambahrejo','Tejo','Temu'],
  'KAPAS': ['Bakalan','Bangilan','Bendo','Bogo','Kalianyar','Kapas','Kedaton','Klampok','Kumpulrejo','Mojodeso','Ngampel','Padang Mentoyo','Plesungan','Sambiroto','Sembung','Semenpinggir','Sukowati','Tanjungharjo','Tapelan','Tikusan','Wedi'],
  'KASIMAN': ['Batokan','Besah','Betet','Kasiman','Ngaglik','Sambeng','Sekaran','Sidomukti','Tambakmerak','Tembeling'],
  'KEDEWAN': ['Beji','Hargomulyo','Kedewan','Kawengan','Wonocolo'],
  'KEDUNGADEM': ['Babad','Balongcabe','Dayukidul','Drokilo','Duwel','Geger','Jamberejo','Kedungadem','Kedungrejo','Kepohkidul','Kendung','Kesongo','Megale','Mlideg','Mojorejo','Ngrandu','Panjang','Pejok','Sidorejo','Sidomulyo','Tlogoagung','Tondomulo','Tumbrasanom'],
  'KEPOHBARU': ['Balongdowo','Bayemgede','Betet','Brangkal','Bumirejo','Cengkir','Jipo','Karangan','Kepoh','Krangkong','Mojosari','Mudung','Nglumber','Ngranggonanyar','Pejok','Pohwates','Sidomukti','Simorejo','Sugihwaras','Sumberagung','Sumbergede','Sumberoto','Tlogorejo','Turigede','Woro'],
  'MALO': ['Banaran','Dukohlor','Kacangan','Kedungrejo','Kemiri','Ketileng','Kliteh','Petak','Malo','Ngujung','Rendeng','Semlaran','Sudah','Sukorejo','Sumberejo','Tambakromo','Tanggir','Tinawun','Trembes','Tulungagung'],
  'MARGOMULYO': ['Geneng','Kalangan','Margomulyo','Meduri','Ngelo','Sumberejo'],
  'NGAMBON': ['Bondol','Karangmangu','Ngambon','Nglamping','Sengon'],
  'NGASEM': ['Bandungrejo','Bareng','Butoh','Dukoh Kidul','Jampet','Jelu','Kolong','Mediyunan','Ngadiluwih','Ngantru','Ngasem','Sambong','Sendangharjo','Setren','Tengger','Trenggulunan','Wadang'],
  'NGRAHO': ['Bancer','Blimbinggede','Jumok','Kalirejo','Klempun','Luwihaji','Mojorejo','Nganti','Ngraho','Pandan','Payaman','Sugihwaras','Sumberagung','Sumberarum','Tanggungan','Tapelan'],
  'PADANGAN': ['Banjarejo','Cendono','Dengok','Kebonagung','Kendung','Kuncan','Ngasiman','Ngeper','Ngradin','Nguken','Padangan','Prangi','Purworejo','Sidorejo','Sonorejo','Tebon'],
  'PURWOSARI': ['Donan','Gapluk','Kaliombo','Kuniran','Ngrejeng','Pelem','Pojok','Punggur','Purwosari','Sedahkidul','Tinumpuk','Tlatah'],
  'SEKAR': ['Bareng','Bobol','Deling','Klino','Miyono','Sekar'],
  'SUGIHWARAS': ['Alasgung','Balongrejo','Bareng','Bulu','Drenges','Genjor','Glagahan','Glagahwangi','Jatitengah','Kedungdowo','Nglajang','Panemon','Panunggalan','Siwalan','Sugihwaras','Trate','Wedoro'],
  'SUKOSEWU': ['Duyungan','Jumput','Kalicilik','Klepek','Pacing','Purwoasri','Semawot','Semen Kidul','Sidodadi','Sidorejo','Sitiaji','Sukosewu','Sumberjo Kidul','Tegalkodo'],
  'SUMBEREJO': ['Banjarjo','Bogangin','Butoh','Deru','Jatigede','Karangdinoyo','Karangdowo','Kayulemah','Kedungrejo','Margoagung','Mejuwet','Mlinjeng','Ngampal','Pejambon','Pekuwon','Prayungan','Sambongrejo','Sendangagung','Sumberharjo','Sumberejo','Sumuragung','Talun','Teleng','Tlogohaji','Tulungrejo','Wotan'],
  'TAMBAKREJO': ['Bakalan','Dolokgede','Gading','Gamongan','Jatimulyo','Jawik','Kacangan','Kalisumber','Malingmati','Mulyorejo','Napis','Ngrancang','Pengkol','Sendangrejo','Sukorejo','Tambakrejo','Tanjung','Turi'],
  'TEMAYANG': ['Bakulan','Belun','Buntalan','Jono','Kedungsari','Kedungsumber','Ngujung','Pancur','Pandantoyo','Papringan','Soko','Temayang'],
  'TRUCUK': ['Banjarsari','Guyangan','Kandangan','Kanten','Mori','Padang','Pagerwesi','Sranak','Sumbangtimun','Sumberejo','Trucuk','Tulungrejo'],
};`;

const startMarker = '/* \u2500\u2500\u2500 KECAMATAN';
const endIdx_search = '};';
let startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
  // Try legacy marker
  startIdx = content.indexOf('const DESA_MAP');
}
if (startIdx === -1) { console.log('DESA_MAP not found'); process.exit(1); }
let endIdx = content.indexOf('};', startIdx) + 2;
content = content.slice(0, startIdx) + newMap + '\n' + content.slice(endIdx);
fs.writeFileSync('../mobile-app/app/operator/laporan.tsx', content);
console.log('OK');

// generate-age-gender-merged.js (dijalankan sekali via `node generate-age-gender-merged.js`)
const fs = require('fs');

function parseCSV(path) {
  const lines = fs.readFileSync(path, 'utf-8').trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

const sumViews = rows => rows.reduce((sum, r) => sum + Number(r.views), 0);

const cityKevin = parseCSV('./KevinPutra/city_raw.csv');
const citySouo  = parseCSV('./SouoOno/city_raw.csv');
const ageKevin  = parseCSV('./KevinPutra/age_gender_raw.csv');
const ageSouo   = parseCSV('./SouoOno/age_gender_raw.csv'); // proxy dari Mas Vinix

const totalKevin = sumViews(cityKevin);
const totalSouo  = sumViews(citySouo);
const totalGabungan = totalKevin + totalSouo;

const key = row => `${row.ageGroup}_${row.gender}`;
const mapKevin = Object.fromEntries(ageKevin.map(r => [key(r), Number(r.viewerPercentage)]));
const mapSouo  = Object.fromEntries(ageSouo.map(r => [key(r), Number(r.viewerPercentage)]));
const allKeys  = new Set([...Object.keys(mapKevin), ...Object.keys(mapSouo)]);

const merged = [...allKeys].map(k => {
  const [ageGroup, gender] = k.split('_');
  const pKevin = mapKevin[k] || 0;
  const pSouo  = mapSouo[k] || 0;
  const percentageMerged = (pKevin * totalKevin + pSouo * totalSouo) / totalGabungan;
  return { ageGroup, gender, viewerPercentage: percentageMerged.toFixed(2) };
});

const csvOutput = 'ageGroup,gender,viewerPercentage\n' +
  merged.map(r => `${r.ageGroup},${r.gender},${r.viewerPercentage}`).join('\n');

fs.writeFileSync('./data/age_gender_merged.csv', csvOutput);
console.log('✅ age_gender_merged.csv berhasil dibuat.');
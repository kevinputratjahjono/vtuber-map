// ============================================================
//  data.js  —  CSV Parsing & Data Aggregation
//  Handles all data processing for the Vtuber Map
// ============================================================

const DataModule = (() => {

  /* ---- Raw storage ---- */
  let rawRows = [];

  /* ---- Province name normalizer ---- */
  // Target names harus cocok dengan nilai PROVINSI di GeoJSON
  const PROVINCE_ALIASES = {
    // Langsung / sudah cocok
    'DKI Jakarta':              'DKI Jakarta',
    'Jawa Barat':               'Jawa Barat',
    'Jawa Tengah':              'Jawa Tengah',
    'Jawa Timur':               'Jawa Timur',
    'Banten':                   'Banten',
    'Bali':                     'Bali',
    'Sumatera Utara':           'Sumatera Utara',
    'Sumatera Barat':           'Sumatera Barat',
    'Sumatera Selatan':         'Sumatera Selatan',
    'Riau':                     'Riau',
    'Kepulauan Riau':           'Kepulauan Riau',
    'Jambi':                    'Jambi',
    'Bengkulu':                 'Bengkulu',
    'Lampung':                  'Lampung',
    'Kalimantan Barat':         'Kalimantan Barat',
    'Kalimantan Tengah':        'Kalimantan Tengah',
    'Kalimantan Selatan':       'Kalimantan Selatan',
    'Kalimantan Timur':         'Kalimantan Timur',
    'Kalimantan Utara':         'Kalimantan Utara',
    'Sulawesi Utara':           'Sulawesi Utara',
    'Sulawesi Tengah':          'Sulawesi Tengah',
    'Sulawesi Selatan':         'Sulawesi Selatan',
    'Sulawesi Tenggara':        'Sulawesi Tenggara',
    'Sulawesi Barat':           'Sulawesi Barat',
    'Gorontalo':                'Gorontalo',
    'Maluku':                   'Maluku',
    'Maluku Utara':             'Maluku Utara',
    'Papua':                    'Papua',
    'Papua Barat':              'Papua Barat',
    'Aceh':                     'Aceh',
    'Bangka Belitung':          'Kepulauan Bangka Belitung',
    'Kepulauan Bangka Belitung':'Kepulauan Bangka Belitung',

    // Alias umum dari CSV
    'NTB':                      'Nusa Tenggara Barat',
    'Nusa Tenggara Barat':      'Nusa Tenggara Barat',
    'NTT':                      'Nusa Tenggara Timur',
    'Nusa Tenggara Timur':      'Nusa Tenggara Timur',

    // GeoJSON pakai "Daerah Istimewa Yogyakarta"
    'DIY':                      'Daerah Istimewa Yogyakarta',
    'DI Yogyakarta':            'Daerah Istimewa Yogyakarta',
    'Yogyakarta':               'Daerah Istimewa Yogyakarta',
    'Daerah Istimewa Yogyakarta':'Daerah Istimewa Yogyakarta',

    // Papua pemekaran — fallback ke Papua
    'Papua Tengah':             'Papua Tengah',
    'Papua Selatan':            'Papua Selatan',
    'Papua Barat Daya':         'Papua Barat Daya',
    'Papua Pegunungan':         'Papua Pegunungan',
  };

  /* ---- Parse one CSV line into fields, RFC4180-aware ---- */
  // Menangani: field yang dibungkus tanda kutip ("..."), koma di dalam
  // tanda kutip (mis. komentar YouTube asli "keren, mantap!"), dan
  // tanda kutip ganda ("") sebagai escape untuk kutip literal.
  function parseCSVLine(line) {
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuotes = false; }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { fields.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    fields.push(cur);
    return fields;
  }

  /* ---- Parse CSV text → array of objects ---- */
  function parseCSV(csvText) {
    // Dukung baris baru \r\n maupun \n, dan buang baris kosong di akhir file
    const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
    if (!lines.length) return [];
    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    return lines.slice(1)
      .filter(line => line.trim() !== '')
      .map(line => {
        const parts = parseCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = (parts[i] !== undefined ? parts[i] : '').trim();
        });
        return obj;
      })
      .filter(r => r.province);
  }

  /* ---- Normalize province name ---- */
  function normalizeProvince(name) {
    return PROVINCE_ALIASES[name] || name;
  }

  /* ---- Aggregate data by province ---- */
  function aggregateByProvince(rows) {
    const map = {};
    rows.forEach(row => {
      const prov = normalizeProvince(row.province);
      if (!map[prov]) {
        map[prov] = {
          name: prov,
          total: 0,
          male: 0, female: 0,
          ages: [],
          statuses: { Student: 0, Worker: 0, Unemployed: 0 },
          watchStarts: [], watchEnds: [],
          messages: [],
          cities: {}
        };
      }
      const p = map[prov];
      p.total++;

      // Gender — handle both 'Male'/'Female' dan 'male'/'female' / 'laki-laki'/'perempuan'
      const g = (row.gender || '').toLowerCase();
      if (g === 'male' || g === 'laki' || g === 'laki-laki') p.male++;
      else if (g === 'female' || g === 'perempuan') p.female++;

      // Age
      const age = parseInt(row.age);
      if (!isNaN(age)) p.ages.push(age);

      // Status
      const s = (row.status || '').toLowerCase();
      if (s === 'student' || s === 'pelajar' || s === 'mahasiswa') p.statuses.Student++;
      else if (s === 'worker' || s === 'pekerja' || s === 'karyawan') p.statuses.Worker++;
      else p.statuses.Unemployed++;

      // Watch time — clamp jam ke 0-23 (CSV ada nilai 24 → 0)
      const start = parseInt(row.watch_start_hour) % 24;
      const end   = parseInt(row.watch_end_hour)   % 24;
      if (!isNaN(start)) p.watchStarts.push(start);
      if (!isNaN(end))   p.watchEnds.push(end);

      // Message
      if (row.message && row.message.trim()) {
        p.messages.push({ text: row.message.trim(), city: row.city || prov });
      }

      // City sub-breakdown
      const city = row.city || 'Lainnya';
      p.cities[city] = (p.cities[city] || 0) + 1;
    });
    return map;
  }

  /* ---- Compute global stats ---- */
  function computeGlobal(rows) {
    const totalMale   = rows.filter(r => (r.gender||'').toLowerCase() === 'male' || (r.gender||'').toLowerCase() === 'laki-laki').length;
    const totalFemale = rows.filter(r => (r.gender||'').toLowerCase() === 'female' || (r.gender||'').toLowerCase() === 'perempuan').length;
    const ages = rows.map(r => parseInt(r.age)).filter(a => !isNaN(a));
    const avgAge = ages.length ? (ages.reduce((a,b)=>a+b,0)/ages.length).toFixed(1) : 0;

    const provinces = new Set(rows.map(r => normalizeProvince(r.province)));

    // Peak hour distribution (all viewers)
    const hourDist = Array(24).fill(0);
    rows.forEach(r => {
      const s = parseInt(r.watch_start_hour) % 24;
      const e = parseInt(r.watch_end_hour)   % 24;
      if (isNaN(s)||isNaN(e)) return;
      let cur = s;
      while (cur !== e) {
        hourDist[cur % 24]++;
        cur = (cur + 1) % 24;
      }
    });

    return { total: rows.length, totalMale, totalFemale, avgAge, provinces: provinces.size, hourDist };
  }

  /* ---- Get age group distribution for a province ---- */
  function getAgeGroups(ages) {
    const groups = { '13–17': 0, '18–22': 0, '23–27': 0, '28–35': 0, '35+': 0 };
    ages.forEach(a => {
      if (a <= 17) groups['13–17']++;
      else if (a <= 22) groups['18–22']++;
      else if (a <= 27) groups['23–27']++;
      else if (a <= 35) groups['28–35']++;
      else groups['35+']++;
    });
    return groups;
  }

  /* ---- Build 24h peak time data for a province ---- */
  function getPeakTimeData(provData) {
    const hourDist = Array(24).fill(0);
    provData.watchStarts.forEach((s, i) => {
      const e = provData.watchEnds[i];
      if (isNaN(s)||isNaN(e)) return;
      let cur = s;
      while (cur !== e) {
        hourDist[cur % 24]++;
        cur = (cur + 1) % 24;
      }
    });
    return hourDist;
  }

  /* ---- Color scale based on density ---- */
  function getDensityColor(count, max) {
    const t = max > 0 ? count / max : 0;
    if (t === 0) return { fill: 'rgba(10,15,40,0.4)', stroke: 'rgba(0,245,255,0.15)' };
    if (t < 0.1) return { fill: 'rgba(0,100,180,0.35)', stroke: 'rgba(0,180,255,0.4)' };
    if (t < 0.25) return { fill: 'rgba(0,150,220,0.45)', stroke: 'rgba(0,220,255,0.5)' };
    if (t < 0.45) return { fill: 'rgba(80,60,220,0.5)', stroke: 'rgba(100,100,255,0.6)' };
    if (t < 0.65) return { fill: 'rgba(150,30,220,0.55)', stroke: 'rgba(180,80,255,0.7)' };
    if (t < 0.80) return { fill: 'rgba(200,20,150,0.6)', stroke: 'rgba(255,60,180,0.75)' };
    return { fill: 'rgba(255,30,100,0.7)', stroke: 'rgba(255,80,160,0.9)' };
  }

  /* ---- Public API ---- */
  // csvUrls bisa berupa string tunggal atau array string.
  // Setiap URL di-fetch & di-parse; hasilnya digabung jadi satu rawRows.
  // Kalau salah satu file gagal (mis. belum ada data/viewers_youtube.csv),
  // itu di-skip dengan warning — tidak menggagalkan seluruh load selama
  // MINIMAL SATU file berhasil dimuat.
  async function load(csvUrls) {
    const urls = Array.isArray(csvUrls) ? csvUrls : [csvUrls];
    let merged = [];
    let anySuccess = false;
    let nextId = 1;

    for (const url of urls) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status + ' — ' + url);
        const text = await resp.text();
        const parsed = parseCSV(text);
        // Re-number id supaya tidak bentrok antar file saat digabung
        parsed.forEach(r => { r.id = String(nextId++); });
        merged = merged.concat(parsed);
        anySuccess = true;
      } catch (e) {
        console.warn('Lewati file CSV (gagal dimuat):', url, e.message);
      }
    }

    if (!anySuccess) {
      throw new Error('Semua file CSV gagal dimuat: ' + urls.join(', '));
    }

    rawRows = merged;
    return rawRows;
  }

  function getRawRows() { return rawRows; }

  function getProvSummary() {
    return aggregateByProvince(rawRows);
  }

  function getGlobal() {
    return computeGlobal(rawRows);
  }

  function getAgeGroupsFor(provData) {
    return getAgeGroups(provData.ages);
  }

  function getPeakFor(provData) {
    return getPeakTimeData(provData);
  }

  function getAllMessages() {
    return rawRows
      .filter(r => r.message && r.message.trim())
      .map(r => ({
        text: r.message.trim(),
        city: r.city,
        province: normalizeProvince(r.province),
        gender: r.gender
      }));
  }

  function getMaxProvCount(provMap) {
    return Math.max(...Object.values(provMap).map(p => p.total), 1);
  }

  function getColorFor(count, max) {
    return getDensityColor(count, max);
  }

  function getProvRanking(provMap) {
    return Object.values(provMap).sort((a,b)=>b.total-a.total);
  }

  return { load, getRawRows, getProvSummary, getGlobal, getAgeGroupsFor, getPeakFor,
           getAllMessages, getMaxProvCount, getColorFor, getProvRanking };

})();

window.DataModule = DataModule;

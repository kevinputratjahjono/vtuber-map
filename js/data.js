// ============================================================
//  data.js  —  CSV/JSON Parsing & Data Aggregation
//  Handles all data processing for the Vtuber Map
//
//  PERUBAHAN UTAMA:
//  - Tambah loader untuk age_gender_merged.csv & summary_form.json
//  - computeGlobalCombined() → gabungkan data YouTube + Form
//    untuk gender dan umur (se-Indonesia)
//  - Status & waktu tonton → murni dari summary_form.json (form saja)
//  - aggregateByProvince() tetap ada → hanya untuk kepadatan peta
//  - Panel kanan tidak lagi per-daerah; semua chart pakai data global
// ============================================================

const DataModule = (() => {

  /* ---- Raw storage ---- */
  let rawRows      = [];   // dari viewers_merged.csv (untuk peta)
  let ageGenderYT  = [];   // dari age_gender_merged.csv
  let summaryForm  = null; // dari summary_form.json

  /* ---- Province name normalizer ---- */
  const PROVINCE_ALIASES = {
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
    'NTB':                      'Nusa Tenggara Barat',
    'Nusa Tenggara Barat':      'Nusa Tenggara Barat',
    'NTT':                      'Nusa Tenggara Timur',
    'Nusa Tenggara Timur':      'Nusa Tenggara Timur',
    'DIY':                      'Daerah Istimewa Yogyakarta',
    'DI Yogyakarta':            'Daerah Istimewa Yogyakarta',
    'Yogyakarta':               'Daerah Istimewa Yogyakarta',
    'Daerah Istimewa Yogyakarta':'Daerah Istimewa Yogyakarta',
    'Papua Tengah':             'Papua Tengah',
    'Papua Selatan':            'Papua Selatan',
    'Papua Barat Daya':         'Papua Barat Daya',
    'Papua Pegunungan':         'Papua Pegunungan',
  };

  /* ---- Parse one CSV line (RFC4180-aware) ---- */
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
        } else { cur += ch; }
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

  /* ---- Aggregate data by province (untuk peta kepadatan saja) ---- */
  function aggregateByProvince(rows) {
    const map = {};
    rows.forEach(row => {
      const prov = normalizeProvince(row.province);
      if (!map[prov]) {
        map[prov] = { name: prov, total: 0 };
      }
      map[prov].total++;
    });
    return map;
  }

  // ══════════════════════════════════════════════════════════════
  //  GABUNGAN DATA YOUTUBE + FORM  (se-Indonesia, bukan per daerah)
  // ══════════════════════════════════════════════════════════════

  /**
   * computeGlobalCombined()
   * ─────────────────────────────────────────────────────────────
   * Menggabungkan dua sumber data menjadi satu ringkasan global:
   *
   *  GENDER
   *    YouTube (age_gender_merged.csv) → viewerPercentage per gender
   *    dikali total views YouTube (sum output_province) → angka absolut YT
   *    lalu ditambah angka absolut dari summary_form.json
   *
   *  UMUR — 3 bucket: "0–14 tahun", "15–64 tahun", ">65 tahun"
   *    YouTube memakai label age13-17, age18-24, ..., age55-64
   *    Mapping ke bucket:
   *      age13-17              → "0–14 tahun"
   *      age18-24 ... age55-64 → "15–64 tahun"
   *      (tidak ada age65+)    → ">65 tahun" hanya dari form
   *    Persentase YT × total views → angka absolut → + angka form
   *
   *  STATUS & WAKTU TONTON
   *    Murni dari summary_form.json (form Google Sheets saja)
   *
   * @param {number} totalViewsYT  — sum semua views di output_province.csv
   * @returns {object}
   */
  function computeGlobalCombined(totalViewsYT) {
    if (!summaryForm) {
      console.warn('summary_form.json belum dimuat');
      return null;
    }

    // ── Gender ───────────────────────────────────────────────────
    // Kumpulkan % per gender dari YouTube
    let malePctYT = 0, femalePctYT = 0;
    ageGenderYT.forEach(row => {
      const pct = parseFloat(row.viewerPercentage) || 0;
      const g   = (row.gender || '').toLowerCase();
      if (g === 'male')   malePctYT   += pct;
      if (g === 'female') femalePctYT += pct;
    });

    // Konversi % → angka absolut YouTube
    const maleYT   = Math.round((malePctYT   / 100) * totalViewsYT);
    const femaleYT = Math.round((femalePctYT / 100) * totalViewsYT);

    // Tambah angka form
    const maleForm   = summaryForm.gender['Laki-Laki'] || 0;
    const femaleForm = summaryForm.gender['Perempuan']  || 0;

    const gender = {
      'Laki-Laki': maleYT   + maleForm,
      'Perempuan':  femaleYT + femaleForm,
      // Simpan komponen terpisah untuk tooltip informatif
      _yt:   { 'Laki-Laki': maleYT,   'Perempuan': femaleYT },
      _form: { 'Laki-Laki': maleForm, 'Perempuan': femaleForm },
    };

    // ── Umur ─────────────────────────────────────────────────────
    // Mapping label YouTube → bucket sheets_clean
    const YT_TO_BUCKET = {
      'age13-17': '0–14 tahun',
      'age18-24': '15–64 tahun',
      'age25-34': '15–64 tahun',
      'age35-44': '15–64 tahun',
      'age45-54': '15–64 tahun',
      'age55-64': '15–64 tahun',
      // age65+ tidak ada di data YouTube kita → hanya form
    };

    // Hitung % per bucket dari YouTube
    const pctPerBucket = { '0–14 tahun': 0, '15–64 tahun': 0, '>65 tahun': 0 };
    ageGenderYT.forEach(row => {
      const bucket = YT_TO_BUCKET[row.ageGroup];
      if (bucket) {
        pctPerBucket[bucket] += parseFloat(row.viewerPercentage) || 0;
      }
    });

    // Konversi % → angka absolut YouTube per bucket
    const umurYT = {};
    Object.entries(pctPerBucket).forEach(([bucket, pct]) => {
      umurYT[bucket] = Math.round((pct / 100) * totalViewsYT);
    });

    // Tambah angka form per bucket
    const umurForm = summaryForm.umur || {};
    const umur = {
      '0–14 tahun':  (umurYT['0–14 tahun']  || 0) + (umurForm['0–14 tahun']  || 0),
      '15–64 tahun': (umurYT['15–64 tahun'] || 0) + (umurForm['15–64 tahun'] || 0),
      '>65 tahun':   (umurYT['>65 tahun']   || 0) + (umurForm['>65 tahun']   || 0),
      // Komponen terpisah untuk tooltip
      _yt:   umurYT,
      _form: umurForm,
    };

    // ── Status (form saja) ────────────────────────────────────────
    const status = {
      Student:    summaryForm.status['Pelajar']       || 0,
      Worker:     summaryForm.status['Pekerja']       || 0,
      Unemployed: summaryForm.status['Tidak Bekerja'] || 0,
    };

    // ── Peak time (form saja) ─────────────────────────────────────
    const hourDist = summaryForm.hour_dist || Array(24).fill(0);

    // ── Meta ──────────────────────────────────────────────────────
    const totalGender = gender['Laki-Laki'] + gender['Perempuan'];
    const totalForm   = summaryForm.total_responden_form || 0;

    return {
      totalViewsYT,
      totalForm,
      totalGabungan: totalViewsYT + totalForm,
      gender,
      umur,
      status,
      hourDist,
      durasi_rata_rata_jam: summaryForm.durasi_rata_rata_jam || 0,
      durasi_median_jam:    summaryForm.durasi_median_jam    || 0,
      periode:              summaryForm.periode || '',
    };
  }

  /* ── Hitung total views YouTube dari output_province.csv ── */
  async function loadTotalViewsYT(url) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const text = await resp.text();
      const lines = text.trim().split('\n').slice(1); // skip header
      let total = 0;
      lines.forEach(line => {
        const parts = line.split(',');
        const v = parseInt(parts[1]);
        if (!isNaN(v)) total += v;
      });
      return total;
    } catch (e) {
      console.warn('output_province.csv gagal dimuat, total YT = 0:', e.message);
      return 0;
    }
  }

  /* ---- Quantile breaks untuk warna peta ---- */
  function computeBreaks(provMap, numBuckets = 6) {
    const counts = Object.values(provMap)
      .map(p => p.total)
      .filter(c => c > 0)
      .sort((a, b) => a - b);
    if (!counts.length) return [];
    const breaks = [];
    for (let i = 1; i < numBuckets; i++) {
      const idx = Math.min(counts.length - 1, Math.max(0, Math.ceil((i / numBuckets) * counts.length) - 1));
      breaks.push(counts[idx]);
    }
    return breaks;
  }

  function bucketIndex(count, breaks) {
    const safeBreaks = Array.isArray(breaks) ? breaks : [];
    const n = Number(count);
    if (!Number.isFinite(n) || n <= 0) return 0;
    for (let i = 0; i < safeBreaks.length; i++) {
      if (n <= safeBreaks[i]) return i + 1;
    }
    return safeBreaks.length + 1;
  }

  /* ---- Color scale ---- */
  const DENSITY_COLORS = [
    { fill: 'rgba(10,15,40,0.4)',    stroke: 'rgba(0,245,255,0.15)' },
    { fill: 'rgba(0,100,180,0.4)',   stroke: 'rgba(0,180,255,0.5)'  },
    { fill: 'rgba(0,160,210,0.5)',   stroke: 'rgba(0,220,255,0.6)'  },
    { fill: 'rgba(60,120,230,0.55)', stroke: 'rgba(100,150,255,0.65)' },
    { fill: 'rgba(140,50,220,0.6)',  stroke: 'rgba(180,90,255,0.7)' },
    { fill: 'rgba(220,20,160,0.65)', stroke: 'rgba(255,70,190,0.8)' },
    { fill: 'rgba(255,30,90,0.75)',  stroke: 'rgba(255,90,140,0.9)' },
  ];

  function getDensityColor(count, breaks) {
    const idx = bucketIndex(count, breaks);
    return DENSITY_COLORS[idx] || DENSITY_COLORS[0];
  }

  // ══════════════════════════════════════════════════════════════
  //  PUBLIC API — load()
  // ══════════════════════════════════════════════════════════════
  /**
   * load({ mapCsvUrls, ageGenderUrl, summaryFormUrl, provinceUrl })
   *
   * mapCsvUrls     — array URL viewers_merged.csv (untuk peta)
   * ageGenderUrl   — URL age_gender_merged.csv (YouTube Analytics)
   * summaryFormUrl — URL summary_form.json (output clean_sheets.py)
   * provinceUrl    — URL output_province.csv (untuk total views YT)
   */
  async function load({ mapCsvUrls, ageGenderUrl, summaryFormUrl, provinceUrl }) {
    const urls = Array.isArray(mapCsvUrls) ? mapCsvUrls : [mapCsvUrls];

    // ── 1. Load CSV peta (viewers_merged) ──────────────────────
    let merged = [];
    let anySuccess = false;
    let nextId = 1;
    for (const url of urls) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status + ' — ' + url);
        const text = await resp.text();
        const parsed = parseCSV(text);
        parsed.forEach(r => { r.id = String(nextId++); });
        merged = merged.concat(parsed);
        anySuccess = true;
      } catch (e) {
        console.warn('Lewati file CSV peta (gagal):', url, e.message);
      }
    }
    if (!anySuccess) throw new Error('Semua CSV peta gagal dimuat: ' + urls.join(', '));
    rawRows = merged;

    // ── 2. Load age_gender_merged.csv ──────────────────────────
    try {
      const resp = await fetch(ageGenderUrl);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const text = await resp.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      ageGenderYT = lines.slice(1)
        .filter(l => l.trim())
        .map(l => {
          const parts = l.split(',');
          const obj = {};
          headers.forEach((h, i) => { obj[h] = (parts[i] || '').trim(); });
          return obj;
        });
      console.info('age_gender_merged.csv dimuat:', ageGenderYT.length, 'baris');
    } catch (e) {
      console.warn('age_gender_merged.csv gagal dimuat:', e.message);
      ageGenderYT = [];
    }

    // ── 3. Load summary_form.json ───────────────────────────────
    try {
      const resp = await fetch(summaryFormUrl);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      summaryForm = await resp.json();
      console.info('summary_form.json dimuat, responden:', summaryForm.total_responden_form);
    } catch (e) {
      console.warn('summary_form.json gagal dimuat:', e.message);
      summaryForm = null;
    }

    // ── 4. Total views YouTube dari output_province.csv ─────────
    const totalViewsYT = await loadTotalViewsYT(provinceUrl);
    console.info('Total views YouTube:', totalViewsYT);

    return { rawRows, totalViewsYT };
  }

  /* ---- Public getters ---- */
  function getRawRows()    { return rawRows; }
  function getSummaryForm(){ return summaryForm; }
  function getAgeGenderYT(){ return ageGenderYT; }

  function getProvSummary() {
    return aggregateByProvince(rawRows);
  }

  // computeGlobalCombined dipanggil dari app.js setelah load()
  // dengan totalViewsYT yang sudah diketahui
  function getGlobalCombined(totalViewsYT) {
    return computeGlobalCombined(totalViewsYT);
  }

  // Legacy getGlobal — masih dipakai untuk header stats (total, provinsi)
  function getGlobal() {
    const provinces = new Set(rawRows.map(r => normalizeProvince(r.province)));
    const sf = summaryForm || {};
    return {
      total:       (sf.total_responden_form || 0),
      totalMale:   (sf.gender || {})['Laki-Laki'] || 0,
      totalFemale: (sf.gender || {})['Perempuan']  || 0,
      provinces:   provinces.size,
    };
  }

  function getAllMessages() {
    return rawRows
      .filter(r => r.message && r.message.trim())
      .map(r => ({
        text:     r.message.trim(),
        city:     r.city,
        province: normalizeProvince(r.province),
        gender:   r.gender,
      }));
  }

  function getColorFor(count, breaks) { return getDensityColor(count, breaks); }
  function getBreaks(provMap)          { return computeBreaks(provMap); }
  function getProvRanking(provMap)     { return Object.values(provMap).sort((a,b)=>b.total-a.total); }

  return {
    load,
    getRawRows, getSummaryForm, getAgeGenderYT,
    getProvSummary, getGlobal, getGlobalCombined,
    getAllMessages, getColorFor, getProvRanking, getBreaks,
  };

})();

window.DataModule = DataModule;

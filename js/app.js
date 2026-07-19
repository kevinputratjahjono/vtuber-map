// ============================================================
//  app.js  —  Main Application Entry Point
//  Orchestrates: Data, Map, Charts, Messages
//
//  PERUBAHAN UTAMA:
//  - DataModule.load() sekarang terima object {mapCsvUrls, ...}
//  - Panel kanan FIXED data global se-Indonesia (tidak berubah saat klik peta)
//  - globalData dari getGlobalCombined(totalViewsYT) untuk gender & umur
//  - Klik provinsi → highlight peta + highlight ranking saja
//  - renderRightPanel() dipanggil SEKALI di awal, tidak lagi di onProvinceClick
// ============================================================

(async () => {
  'use strict';

  // ---- 1. Load & process data ----
  let provMap, totalViewsYT, globalData, globalLegacy;
  try {
    const result = await DataModule.load({
      mapCsvUrls:     ['data/viewers_merged.csv'],
      ageGenderUrl:   'data/youtube/age_gender_merged.csv',
      summaryFormUrl: 'data/GSheets/summary_form.json',
      provinceUrl:    'data/youtube/output_province.csv',
    });
    totalViewsYT = result.totalViewsYT;
    provMap      = DataModule.getProvSummary();
    globalData   = DataModule.getGlobalCombined(totalViewsYT);
    globalLegacy = DataModule.getGlobal();
  } catch (e) {
    console.error('Data load failed:', e);
    document.getElementById('loading').innerHTML =
      '<div style="color:#ff2d9f;text-align:center;padding:20px;">' +
      '❌ Gagal memuat data.<br>' +
      'Pastikan file <code>data/viewers_merged.csv</code>, ' +
      '<code>data/summary_form.json</code>, dan ' +
      '<code>data/youtube/age_gender_merged.csv</code> tersedia.' +
      '</div>';
    return;
  }

  // ---- 2. Update header stats ----
  // Total gabungan: YouTube views + responden form
  const totalGabungan = globalData ? globalData.totalGabungan : globalLegacy.total;
  document.getElementById('stat-total').textContent  = totalGabungan.toLocaleString('id-ID');
  document.getElementById('stat-prov').textContent   = globalLegacy.provinces;
  document.getElementById('stat-male').textContent   =
    globalData ? globalData.gender['Laki-Laki'].toLocaleString('id-ID') : globalLegacy.totalMale;
  document.getElementById('stat-female').textContent =
    globalData ? globalData.gender['Perempuan'].toLocaleString('id-ID')  : globalLegacy.totalFemale;

  // ---- 3. Apply Chart.js global defaults ----
  ChartsModule.applyGlobalDefaults();

  // ---- 4. Render panel kiri: global peak time (bar chart overview) ----
  const hourDist = globalData ? globalData.hourDist : Array(24).fill(0);
  ChartsModule.renderGlobalPeak('chart-global-peak', hourDist);

  // ---- 5. Build province ranking list ----
  buildProvRanking(provMap);

  // ---- 6. Init map (tanpa clickCallback untuk panel kanan) ----
  const breaks = DataModule.getBreaks(provMap);
  MapModule.init('map', provMap, breaks);

  // ---- 7. Build legend ----
  buildLegend(breaks);

  // ---- 8. Render panel kanan SEKALI — fixed data global se-Indonesia ----
  renderRightPanel();

  // ---- 9. Start floating messages ----
  const allMsgs = DataModule.getAllMessages();
  MessagesModule.init(allMsgs, 'floating-messages');

  // ---- 10. Hide loading screen ----
  setTimeout(() => {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.opacity = '0';
      setTimeout(() => loading.remove(), 400);
    }
  }, 500);


  // ===========================================================
  //  RIGHT PANEL — FIXED DATA SE-INDONESIA
  //  Dipanggil sekali saat load, tidak berubah saat klik peta
  // ===========================================================
  function renderRightPanel() {
    // ── Header panel kanan ──────────────────────────────────
    const header = document.getElementById('province-header');
    if (header) {
      const totalForm = globalData ? globalData.totalForm : 0;
      header.innerHTML = `
        <div class="province-name glitch" style="color:#00f5ff;">🇮🇩 DATA SE-INDONESIA</div>
        <div class="province-count" style="margin-top:4px;">
          Periode <span>Jan 2025 – Jul 2026</span>
        </div>
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
          <span class="stat-badge cyan">📺 ${totalViewsYT.toLocaleString('id-ID')} viewers YT</span>
          <span class="stat-badge purple">📋 ${totalForm.toLocaleString('id-ID')} responden form</span>
        </div>
      `;
    }

    if (!globalData) return;

    // ── Peak watching time (dari form — jam tonton responden) ─
    ChartsModule.renderPeakTime('chart-peak', globalData.hourDist);

    // ── Gender (gabungan YouTube + Form) ─────────────────────
    ChartsModule.renderGender('chart-gender', globalData.gender);

    // ── Distribusi umur (gabungan YouTube + Form, 3 bucket) ──
    ChartsModule.renderAge('chart-age', globalData.umur);

    // ── Status penonton (dari form saja) ─────────────────────
    ChartsModule.renderStatus('chart-status', globalData.status);
  }


  // ===========================================================
  //  PROVINCE RANKING LIST (LEFT PANEL)
  //  Klik item → highlight peta saja, panel kanan tidak berubah
  // ===========================================================
  function buildProvRanking(provMap) {
    const ranked    = DataModule.getProvRanking(provMap);
    const container = document.getElementById('prov-ranking');
    const maxVal    = ranked[0] ? ranked[0].total : 1;

    container.innerHTML = '';
    ranked.forEach((pd, i) => {
      const pct = ((pd.total / maxVal) * 100).toFixed(0);
      const el  = document.createElement('div');
      el.className    = 'prov-list-item';
      el.dataset.prov = pd.name;
      el.title        = `${pd.name}: ${pd.total} penonton`;
      el.innerHTML = `
        <span class="prov-rank">${String(i + 1).padStart(2, '0')}</span>
        <span style="font-size:11px;color:#e8eaf6;flex:0 0 90px;
                     overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">
          ${pd.name}
        </span>
        <span class="prov-bar-wrap">
          <span class="prov-bar" style="width:${pct}%"></span>
        </span>
        <span class="prov-num">${pd.total.toLocaleString('id-ID')}</span>
      `;

      // Klik → highlight peta + highlight item list
      // Panel kanan TIDAK berubah
      el.addEventListener('click', () => {
        MapModule.selectProvince(pd.name);
        document.querySelectorAll('.prov-list-item')
          .forEach(el => el.classList.remove('active'));
        el.classList.add('active');
      });

      container.appendChild(el);
    });
  }


  // ===========================================================
  //  DENSITY LEGEND
  // ===========================================================
  function buildLegend(breaks) {
    const container = document.getElementById('density-legend');
    container.innerHTML = '';

    const items = [{ label: 'Tidak ada data', sample: 0 }];
    let prev = 0;
    breaks.forEach(b => {
      const lo = prev + 1;
      const hi = b;
      items.push({ label: lo === hi ? `${lo}` : `${lo} – ${hi}`, sample: hi });
      prev = b;
    });
    items.push({ label: `> ${prev}`, sample: prev + 1 });

    items.forEach(({ label, sample }) => {
      const { fill } = DataModule.getColorFor(sample, breaks);
      const el = document.createElement('div');
      el.className = 'legend-item';
      el.innerHTML = `
        <span class="legend-dot"
              style="background:${fill};border:1px solid rgba(0,245,255,0.3);">
        </span>
        <span>${label}${sample === 0 ? '' : ' penonton'}</span>
      `;
      container.appendChild(el);
    });
  }


  // ===========================================================
  //  RESET BUTTON — reset view peta saja, panel kanan tetap
  // ===========================================================
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    MapModule.resetView();
    document.querySelectorAll('.prov-list-item')
      .forEach(el => el.classList.remove('active'));
    // Panel kanan tidak di-reset karena sudah fixed global
  });


  // ===========================================================
  //  CSV UPLOAD (optional live reload)
  // ===========================================================
  document.getElementById('csv-upload')?.addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;
    // Simple reload — bisa dikembangkan jadi hot-reload tanpa refresh
    location.reload();
  });

})();

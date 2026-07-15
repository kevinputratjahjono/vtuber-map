// ============================================================
//  app.js  —  Main Application Entry Point
//  Orchestrates: Data, Map, Charts, Messages
// ============================================================

(async () => {
  'use strict';

  // ---- 1. Load & process data ----
  let rows, provMap, global;
  try {
    rows    = await DataModule.load('data/viewers.csv');
    provMap = DataModule.getProvSummary();
    global  = DataModule.getGlobal();
  } catch(e) {
    console.error('Data load failed:', e);
    document.getElementById('loading').innerHTML =
      '<div style="color:#ff2d9f;text-align:center;">❌ Gagal memuat data CSV.<br>Pastikan file <code>data/viewers.csv</code> ada.</div>';
    return;
  }

  // ---- 2. Update header stats ----
  document.getElementById('stat-total').textContent  = global.total.toLocaleString();
  document.getElementById('stat-prov').textContent   = global.provinces;
  document.getElementById('stat-male').textContent   = global.totalMale;
  document.getElementById('stat-female').textContent = global.totalFemale;

  // ---- 3. Apply Chart.js global defaults ----
  ChartsModule.applyGlobalDefaults();

  // ---- 4. Render global peak time (left panel) ----
  ChartsModule.renderGlobalPeak('chart-global-peak', global.hourDist);

  // ---- 5. Build province ranking list ----
  buildProvRanking(provMap);

  // ---- 6. Init map ----
  const maxCount = DataModule.getMaxProvCount(provMap);
  MapModule.init('map', provMap, maxCount, onProvinceClick);

  // ---- 7. Build legend ----
  buildLegend(maxCount);

  // ---- 8. Init default right panel (all-Indonesia view) ----
  renderRightPanel(null);

  // ---- 9. Start floating messages ----
  const allMsgs = DataModule.getAllMessages();
  MessagesModule.init(allMsgs, 'floating-messages');

  // ---- 10. Hide loading screen ----
  setTimeout(() => {
    const loading = document.getElementById('loading');
    if (loading) { loading.style.opacity = '0'; setTimeout(()=>loading.remove(), 400); }
  }, 500);


  // ===========================================================
  //  PROVINCE CLICK HANDLER
  // ===========================================================
  function onProvinceClick(pd, geoName) {
    renderRightPanel(pd);
    MessagesModule.triggerProvinceMessages(pd.messages.map(m => ({
      text: m.text, city: m.city, province: pd.name, gender: ''
    })));
    // Update province list highlight
    document.querySelectorAll('.prov-list-item').forEach(el => {
      el.classList.toggle('active', el.dataset.prov === pd.name);
    });
  }


  // ===========================================================
  //  RIGHT PANEL RENDERER
  // ===========================================================
  function renderRightPanel(pd) {
    // Province header
    const header = document.getElementById('province-header');
    const isAll  = pd === null;

    if (isAll) {
      header.innerHTML = `
        <div class="province-name glitch">🇮🇩 INDONESIA</div>
        <div class="province-count">Total <span>${global.total}</span> penonton dari <span>${global.provinces}</span> provinsi</div>
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
          <span class="stat-badge cyan">💙 ${global.totalMale} Laki-laki</span>
          <span class="stat-badge pink">🩷 ${global.totalFemale} Perempuan</span>
        </div>
      `;
    } else {
      const topCity = Object.entries(pd.cities).sort((a,b)=>b[1]-a[1])[0];
      header.innerHTML = `
        <div class="province-name">${pd.name}</div>
        <div class="province-count"><span>${pd.total}</span> penonton terdaftar</div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
          <span class="stat-badge cyan">💙 ${pd.male} M</span>
          <span class="stat-badge pink">🩷 ${pd.female} F</span>
          ${topCity ? `<span class="stat-badge purple">📍 ${topCity[0]}</span>` : ''}
        </div>
      `;
    }

    // Peak time chart
    if (isAll) {
      ChartsModule.renderPeakTime('chart-peak', global.hourDist, 'Semua Provinsi');
    } else {
      const peakData = DataModule.getPeakFor(pd);
      ChartsModule.renderPeakTime('chart-peak', peakData, pd.name);
    }

    // Gender chart
    if (isAll) {
      ChartsModule.renderGender('chart-gender', global.totalMale, global.totalFemale);
    } else {
      ChartsModule.renderGender('chart-gender', pd.male, pd.female);
    }

    // Age chart
    const ageGroups = isAll
      ? DataModule.getAgeGroupsFor({ ages: rows.map(r=>parseInt(r.age)).filter(a=>!isNaN(a)) })
      : DataModule.getAgeGroupsFor(pd);
    ChartsModule.renderAge('chart-age', ageGroups);

    // Status chart
    if (isAll) {
      const allStatus = { Student: 0, Worker: 0, Unemployed: 0 };
      Object.values(provMap).forEach(p => {
        allStatus.Student    += p.statuses.Student;
        allStatus.Worker     += p.statuses.Worker;
        allStatus.Unemployed += p.statuses.Unemployed;
      });
      ChartsModule.renderStatus('chart-status', allStatus);
    } else {
      ChartsModule.renderStatus('chart-status', pd.statuses);
    }
  }


  // ===========================================================
  //  PROVINCE RANKING LIST (LEFT PANEL)
  // ===========================================================
  function buildProvRanking(provMap) {
    const ranked = DataModule.getProvRanking(provMap);
    const container = document.getElementById('prov-ranking');
    const maxVal = ranked[0] ? ranked[0].total : 1;

    container.innerHTML = '';
    ranked.forEach((pd, i) => {
      const pct = ((pd.total / maxVal) * 100).toFixed(0);
      const el  = document.createElement('div');
      el.className = 'prov-list-item';
      el.dataset.prov = pd.name;
      el.title = `${pd.name}: ${pd.total} penonton`;
      el.innerHTML = `
        <span class="prov-rank">${String(i+1).padStart(2,'0')}</span>
        <span style="font-size:11px;color:#e8eaf6;flex:0 0 90px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${pd.name}</span>
        <span class="prov-bar-wrap"><span class="prov-bar" style="width:${pct}%"></span></span>
        <span class="prov-num">${pd.total}</span>
      `;
      el.addEventListener('click', () => {
        MapModule.selectProvince(pd.name);
        onProvinceClick(pd, pd.name);
      });
      container.appendChild(el);
    });
  }


  // ===========================================================
  //  DENSITY LEGEND
  // ===========================================================
  function buildLegend(maxCount) {
    const tiers = [
      { label: 'Tidak ada data', t: 0 },
      { label: '1 – 25%', t: 0.1 },
      { label: '25 – 45%', t: 0.3 },
      { label: '45 – 65%', t: 0.5 },
      { label: '65 – 80%', t: 0.7 },
      { label: '> 80%', t: 0.9 },
    ];
    const container = document.getElementById('density-legend');
    container.innerHTML = '';
    tiers.forEach(({ label, t }) => {
      const count = Math.round(t * maxCount);
      const { fill } = DataModule.getColorFor(count, maxCount);
      const el = document.createElement('div');
      el.className = 'legend-item';
      el.innerHTML = `
        <span class="legend-dot" style="background:${fill};border:1px solid rgba(0,245,255,0.3);"></span>
        <span>${label}</span>
      `;
      container.appendChild(el);
    });
  }


  // ===========================================================
  //  RESET BUTTON
  // ===========================================================
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    MapModule.resetView();
    renderRightPanel(null);
    document.querySelectorAll('.prov-list-item').forEach(el => el.classList.remove('active'));
  });


  // ===========================================================
  //  CSV UPLOAD (optional live reload)
  // ===========================================================
  document.getElementById('csv-upload')?.addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;
    const text = await file.text();
    // Re-init with new data
    const tempLink = URL.createObjectURL(new Blob([text], {type:'text/csv'}));
    location.href = location.href; // simple reload approach
  });

})();

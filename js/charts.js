// ============================================================
//  charts.js  —  All Chart.js Chart Rendering
//
//  PERUBAHAN UTAMA:
//  - renderGender()   → terima data gabungan {YT + form}, tampilkan
//                       komponen terpisah di tooltip
//  - renderAge()      → terima bucket "0–14 tahun","15–64 tahun",">65 tahun"
//                       (bukan angka mentah lagi), gabungan YT + form
//  - renderStatus()   → tidak berubah, tapi kini hanya dipanggil sekali
//                       dengan data global (bukan per-klik provinsi)
//  - renderPeakTime() → tidak berubah, dipanggil dengan hourDist global
//  - renderGlobalPeak()→ tidak berubah (panel kiri)
//  - DIHAPUS         : semua fungsi yang hanya dipakai untuk per-daerah
// ============================================================

const ChartsModule = (() => {

  /* ---- Stored chart instances (for destroy on re-render) ---- */
  const _charts = {};

  /* ---- Shared theme tokens ---- */
  const T = {
    cyan:        '#00f5ff',
    pink:        '#ff2d9f',
    purple:      '#b24bff',
    yellow:      '#f5e642',
    teal:        '#00e5c4',
    orange:      '#ff8c42',
    bgCard:      '#0d1428',
    textPrim:    '#e8eaf6',
    textMuted:   '#4a5568',
    grid:        'rgba(255,255,255,0.05)',
    font:        "'Rajdhani', sans-serif",
    fontDisplay: "'Orbitron', monospace",
  };

  /* ---- Neon gradient helper ---- */
  function neonGradient(ctx, color1, color2) {
    const grad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    grad.addColorStop(0, color1 + 'cc');
    grad.addColorStop(1, color2 + '22');
    return grad;
  }

  /* ---- Destroy old chart ---- */
  function destroyChart(id) {
    if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
  }

  /* ---- Default Chart.js global options ---- */
  function applyGlobalDefaults() {
    Chart.defaults.color = T.textMuted;
    Chart.defaults.font.family = T.font;
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyleWidth = 8;
  }

  // ══════════════════════════════════════════════════════════════
  //  PEAK TIME CHART — panel kanan (data form, global)
  // ══════════════════════════════════════════════════════════════
  /**
   * renderPeakTime(canvasId, hourData)
   * hourData — array 24 elemen dari summary_form.json → hour_dist
   */
  function renderPeakTime(canvasId, hourData) {
    destroyChart('peakTime');
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const labels = Array.from({ length: 24 }, (_, i) => {
      if (i === 0)  return '00:00';
      if (i === 6)  return '06:00';
      if (i === 12) return '12:00';
      if (i === 18) return '18:00';
      if (i === 23) return '23:00';
      return '';
    });

    const grad = neonGradient(ctx, T.cyan, '#001a2c');

    _charts['peakTime'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
        datasets: [{
          label: 'Se-Indonesia',
          data:  hourData,
          borderColor:          T.cyan,
          borderWidth:          2,
          backgroundColor:      grad,
          fill:                 true,
          tension:              0.4,
          pointRadius:          2,
          pointHoverRadius:     5,
          pointBackgroundColor: T.cyan,
          pointBorderColor:     T.bgCard,
          pointBorderWidth:     1,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { color: T.grid },
            ticks: {
              color: T.textMuted,
              font: { size: 9, family: T.fontDisplay },
              maxRotation: 0,
              callback: (val, i) => labels[i],
            },
            border: { display: false },
          },
          y: {
            grid: { color: T.grid },
            ticks: { color: T.textMuted, font: { size: 9 } },
            border: { display: false },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0d1428',
            borderColor:     'rgba(0,245,255,0.3)',
            borderWidth:     1,
            titleColor:      T.cyan,
            bodyColor:       T.textPrim,
            titleFont:       { family: T.fontDisplay, size: 10 },
            callbacks: {
              title: items  => `⏰ ${items[0].label}`,
              label: item   => ` ${item.raw} responden aktif`,
            },
          },
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  GENDER BAR CHART — gabungan YouTube + Form
  // ══════════════════════════════════════════════════════════════
  /**
   * renderGender(canvasId, genderData)
   *
   * genderData — objek dari computeGlobalCombined():
   *   {
   *     'Laki-Laki': <total gabungan>,
   *     'Perempuan':  <total gabungan>,
   *     _yt:   { 'Laki-Laki': <YT>, 'Perempuan': <YT> },
   *     _form: { 'Laki-Laki': <form>, 'Perempuan': <form> },
   *   }
   *
   * Tooltip menampilkan breakdown YT vs Form secara informatif.
   */
  function renderGender(canvasId, genderData) {
    destroyChart('gender');
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const male   = genderData['Laki-Laki'] || 0;
    const female = genderData['Perempuan']  || 0;
    const total  = male + female || 1;

    const malePct  = ((male   / total) * 100).toFixed(1);
    const femPct   = ((female / total) * 100).toFixed(1);

    // Komponen YT & form untuk tooltip
    const ytM  = (genderData._yt   || {})['Laki-Laki'] || 0;
    const ytF  = (genderData._yt   || {})['Perempuan']  || 0;
    const fmM  = (genderData._form || {})['Laki-Laki'] || 0;
    const fmF  = (genderData._form || {})['Perempuan']  || 0;

    _charts['gender'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels:   ['Laki-laki', 'Perempuan'],
        datasets: [{
          data: [male, female],
          backgroundColor: [
            'rgba(0,245,255,0.25)',
            'rgba(255,45,159,0.25)',
          ],
          borderColor:          [T.cyan, T.pink],
          borderWidth:          2,
          borderRadius:         6,
          borderSkipped:        false,
          hoverBackgroundColor: [
            'rgba(0,245,255,0.45)',
            'rgba(255,45,159,0.45)',
          ],
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 500, easing: 'easeOutBack' },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: T.textPrim, font: { family: T.font, weight: '600' } },
            border: { display: false },
          },
          y: {
            grid: { color: T.grid },
            ticks: { color: T.textMuted, font: { size: 9 } },
            border: { display: false },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0d1428',
            borderColor:     'rgba(0,245,255,0.3)',
            borderWidth:     1,
            titleColor:      T.cyan,
            bodyColor:       T.textPrim,
            titleFont:       { family: T.fontDisplay, size: 10 },
            callbacks: {
              label: item => {
                const isM  = item.dataIndex === 0;
                const pct  = isM ? malePct : femPct;
                const yt   = isM ? ytM : ytF;
                const fm   = isM ? fmM : fmF;
                return [
                  ` Total: ${item.raw.toLocaleString('id-ID')} (${pct}%)`,
                  `   YouTube : ${yt.toLocaleString('id-ID')}`,
                  `   Form    : ${fm.toLocaleString('id-ID')}`,
                ];
              },
            },
          },
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  AGE DOUGHNUT CHART — gabungan YouTube + Form
  // ══════════════════════════════════════════════════════════════
  /**
   * renderAge(canvasId, umurData)
   *
   * umurData — objek dari computeGlobalCombined():
   *   {
   *     '0–14 tahun':  <total gabungan>,
   *     '15–64 tahun': <total gabungan>,
   *     '>65 tahun':   <total gabungan>,
   *     _yt:   { ... },
   *     _form: { ... },
   *   }
   */
  function renderAge(canvasId, umurData) {
    destroyChart('age');
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const BUCKETS = ['0–14 tahun', '15–64 tahun', '>65 tahun'];
    const values  = BUCKETS.map(b => umurData[b] || 0);
    const colors  = [T.purple, T.cyan, T.yellow];
    const total   = values.reduce((a, b) => a + b, 0) || 1;

    // Komponen YT & form untuk tooltip
    const ytData  = umurData._yt   || {};
    const fmData  = umurData._form || {};

    _charts['age'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels:   BUCKETS,
        datasets: [{
          data:               values,
          backgroundColor:    colors.map(c => c + '40'),
          borderColor:        colors,
          borderWidth:        2,
          hoverBorderWidth:   3,
          hoverOffset:        6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        animation: { animateRotate: true, duration: 600 },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: T.textMuted,
              font: { size: 10, family: T.font },
              padding: 8,
              generateLabels: chart => {
                const data = chart.data;
                return data.labels.map((lbl, i) => ({
                  text:        `${lbl}  ${((data.datasets[0].data[i] / total) * 100).toFixed(0)}%`,
                  fillStyle:   data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth:   1.5,
                  pointStyle:  'rectRounded',
                  index:       i,
                }));
              },
            },
          },
          tooltip: {
            backgroundColor: '#0d1428',
            borderColor:     'rgba(0,245,255,0.3)',
            borderWidth:     1,
            titleColor:      T.cyan,
            bodyColor:       T.textPrim,
            titleFont:       { family: T.fontDisplay, size: 10 },
            callbacks: {
              label: item => {
                const bucket = BUCKETS[item.dataIndex];
                const yt     = ytData[bucket]  || 0;
                const fm     = fmData[bucket]  || 0;
                const pct    = ((item.raw / total) * 100).toFixed(1);
                return [
                  ` Total: ${item.raw.toLocaleString('id-ID')} (${pct}%)`,
                  `   YouTube : ${yt.toLocaleString('id-ID')}`,
                  `   Form    : ${fm.toLocaleString('id-ID')}`,
                ];
              },
            },
          },
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  STATUS PIE / POLAR CHART — form saja, global
  // ══════════════════════════════════════════════════════════════
  /**
   * renderStatus(canvasId, statuses)
   * statuses — { Student, Worker, Unemployed } dari getGlobalCombined()
   */
  function renderStatus(canvasId, statuses) {
    destroyChart('status');
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const labels = ['Pelajar/Mahasiswa', 'Pekerja', 'Tidak Bekerja'];
    const values = [
      statuses.Student    || 0,
      statuses.Worker     || 0,
      statuses.Unemployed || 0,
    ];
    const colors = [T.purple, T.teal, T.orange];
    const total  = values.reduce((a, b) => a + b, 0) || 1;

    _charts['status'] = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels,
        datasets: [{
          data:            values,
          backgroundColor: colors.map(c => c + '40'),
          borderColor:     colors,
          borderWidth:     2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 600 },
        scales: {
          r: {
            grid:        { color: T.grid },
            ticks:       { display: false },
            pointLabels: { display: false },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: T.textMuted,
              font: { size: 9, family: T.font },
              padding: 8,
              generateLabels: chart => {
                const data = chart.data;
                return data.labels.map((lbl, i) => ({
                  text:        `${lbl} ${((data.datasets[0].data[i] / total) * 100).toFixed(0)}%`,
                  fillStyle:   data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth:   1.5,
                  pointStyle:  'rectRounded',
                  index:       i,
                }));
              },
            },
          },
          tooltip: {
            backgroundColor: '#0d1428',
            borderColor:     'rgba(0,245,255,0.3)',
            borderWidth:     1,
            titleColor:      T.cyan,
            bodyColor:       T.textPrim,
            titleFont:       { family: T.fontDisplay, size: 10 },
            callbacks: {
              label: item => ` ${item.raw} orang (${((item.raw / total) * 100).toFixed(1)}%)`,
            },
          },
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  GLOBAL PEAK TIME — panel kiri (bar, overview)
  // ══════════════════════════════════════════════════════════════
  function renderGlobalPeak(canvasId, hourData) {
    destroyChart('globalPeak');
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
    grad.addColorStop(0,   T.cyan   + '55');
    grad.addColorStop(0.5, T.pink   + '55');
    grad.addColorStop(1,   T.purple + '55');

    _charts['globalPeak'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels:   Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}`),
        datasets: [{
          data:                 hourData,
          backgroundColor:      grad,
          borderColor:          T.cyan + 'aa',
          borderWidth:          1,
          borderRadius:         3,
          hoverBackgroundColor: T.pink + '99',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 700 },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: T.textMuted,
              font: { size: 8, family: T.fontDisplay },
              maxRotation: 0,
              callback: (val, i) => (i % 3 === 0 ? `${String(i).padStart(2, '0')}h` : ''),
            },
            border: { display: false },
          },
          y: {
            grid:        { color: T.grid },
            ticks:       { color: T.textMuted, font: { size: 9 } },
            border:      { display: false },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0d1428',
            borderColor:     'rgba(0,245,255,0.3)',
            borderWidth:     1,
            titleColor:      T.cyan,
            bodyColor:       T.textPrim,
            titleFont:       { family: T.fontDisplay, size: 10 },
            callbacks: {
              title: items => `⏰ ${String(items[0].dataIndex).padStart(2, '0')}:00`,
              label: item  => ` ${item.raw} responden aktif`,
            },
          },
        },
      },
    });
  }

  return {
    applyGlobalDefaults,
    renderPeakTime,
    renderGender,
    renderAge,
    renderStatus,
    renderGlobalPeak,
  };

})();

window.ChartsModule = ChartsModule;

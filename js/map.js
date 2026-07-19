// ============================================================
//  map.js  —  Leaflet Map + Choropleth Layer
//
//  PERUBAHAN UTAMA:
//  - Klik provinsi TIDAK lagi mengupdate panel kanan
//    (panel kanan sekarang fixed data global se-Indonesia)
//  - Tooltip hover tetap ada: nama provinsi + jumlah views
//  - onClickCb dihapus — tidak ada callback ke app.js untuk
//    update chart panel kanan
//  - selectProvince() tetap ada untuk highlight visual saja
//    (dipakai dari ranking list di panel kiri)
// ============================================================

const MapModule = (() => {

  let map          = null;
  let geoLayer     = null;
  let provData     = {};
  let breaks       = [];
  let selectedProv = null;

  /* ── Ambil nama provinsi dari GeoJSON feature ── */
  function getGeoName(feature) {
    return feature.properties.PROVINSI ||
           feature.properties.NAME_1   ||
           feature.properties.name     ||
           feature.properties.provinsi || '';
  }

  function findProvData(geoName) {
    if (provData[geoName]) return provData[geoName];
    for (const [key, val] of Object.entries(provData)) {
      if (geoName.includes(key) || key.includes(geoName)) return val;
    }
    return null;
  }

  /* ── Warna berdasarkan kepadatan ── */
  function getColor(count) {
    return window.DataModule.getColorFor(count, breaks);
  }

  /* ── Style tiap fitur GeoJSON ── */
  function featureStyle(feature) {
    const geoName = getGeoName(feature);
    const pd      = findProvData(geoName);
    const count   = pd ? pd.total : 0;
    const { fill, stroke } = getColor(count);
    const isSelected = selectedProv && pd && pd.name === selectedProv;

    return {
      fillColor:   fill,
      fillOpacity: 1,
      color:       isSelected ? '#ff2d9f' : stroke,
      weight:      isSelected ? 2.5 : 1,
      opacity:     1,
    };
  }

  /* ── Hover & klik per fitur ── */
  let hoveredLayer = null;

  function onEachFeature(feature, layer) {
    const geoName = getGeoName(feature);
    const pd      = findProvData(geoName);
    const count   = pd ? pd.total : 0;

    // Tooltip: nama + jumlah views (tidak ada gender per daerah lagi)
    layer.bindTooltip(`
      <div style="font-family:'Orbitron',monospace;font-size:10px;
                  color:#00f5ff;margin-bottom:4px;letter-spacing:1px;">
        ${geoName}
      </div>
      <div style="font-family:'Rajdhani',sans-serif;font-size:12px;color:#e8eaf6;">
        ${count.toLocaleString('id-ID')} penonton
      </div>
    `, {
      sticky:    true,
      opacity:   0.95,
      direction: 'auto',
    });

    layer.on({
      mouseover(e) {
        // Reset warna layer sebelumnya yang di-hover
        if (hoveredLayer && hoveredLayer !== layer) {
          const pn  = getGeoName(hoveredLayer.feature);
          const ppd = findProvData(pn);
          const isS = selectedProv && ppd && ppd.name === selectedProv;
          const { stroke } = getColor(ppd ? ppd.total : 0);
          hoveredLayer.setStyle({
            weight: isS ? 2.5 : 1,
            color:  isS ? '#ff2d9f' : stroke,
            fillOpacity: 1,
          });
        }
        hoveredLayer = layer;
        layer.setStyle({
          weight:      2,
          color:       selectedProv && pd && pd.name === selectedProv ? '#ff2d9f' : '#00f5ff',
          fillOpacity: 1,
        });
        layer.bringToFront();
      },

      mouseout() {
        const isS = selectedProv && pd && pd.name === selectedProv;
        const { stroke } = getColor(count);
        layer.setStyle({
          weight:      isS ? 2.5 : 1,
          color:       isS ? '#ff2d9f' : stroke,
          fillOpacity: 1,
        });
      },

      // Klik provinsi → highlight visual saja, TIDAK update panel kanan
      click() {
        // Toggle: klik provinsi yang sama → deselect
        selectedProv = (selectedProv === (pd ? pd.name : null)) ? null : (pd ? pd.name : null);

        // Refresh style semua layer
        geoLayer.eachLayer(l => {
          const n        = getGeoName(l.feature);
          const d        = findProvData(n);
          const { fill, stroke } = getColor(d ? d.total : 0);
          const isSel    = selectedProv && d && d.name === selectedProv;
          l.setStyle({
            fillColor:   fill,
            fillOpacity: 1,
            color:       isSel ? '#ff2d9f' : stroke,
            weight:      isSel ? 2.5 : 1,
          });
        });
      },
    });
  }

  /* ── Init map ── */
  function init(containerId, data, breaksArr) {
    provData = data;
    breaks   = breaksArr || [];

    map = L.map(containerId, {
      center:           [-2.5, 118],
      zoom:             5,
      minZoom:          4,
      maxZoom:          9,
      zoomControl:      true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom:    19,
    }).addTo(map);

    L.control.attribution({ prefix: false })
      .addAttribution('<span style="color:#4a5568;font-size:9px;">© CartoDB © OSM</span>')
      .addTo(map);

    fetch('data/indonesia.geojson')
      .then(r => {
        if (!r.ok) throw new Error('GeoJSON HTTP ' + r.status);
        return r.json();
      })
      .then(geojson => {
        geoLayer = L.geoJSON(geojson, {
          style:         featureStyle,
          onEachFeature,
        }).addTo(map);
        console.info('GeoJSON dimuat:', geojson.features.length, 'provinsi');
      })
      .catch(err => {
        console.warn('GeoJSON gagal, pakai marker fallback:', err.message);
        drawFallbackMarkers();
      });
  }

  /* ── Fallback markers ── */
  const PROVINCE_COORDS = {
    'DKI Jakarta':               [-6.2088,  106.8456],
    'Jawa Barat':                [-6.9147,  107.6098],
    'Jawa Tengah':               [-7.1500,  110.1403],
    'Jawa Timur':                [-7.5361,  112.2384],
    'Banten':                    [-6.4058,  106.0640],
    'Bali':                      [-8.3405,  115.0920],
    'Sumatera Utara':            [ 2.1153,   99.5451],
    'Sumatera Barat':            [-0.7399,  100.8000],
    'Riau':                      [ 0.2933,  101.7068],
    'Kepulauan Riau':            [ 3.9457,  108.1429],
    'Jambi':                     [-1.6101,  103.6131],
    'Sumatera Selatan':          [-3.3194,  103.9144],
    'Bengkulu':                  [-3.5778,  102.3464],
    'Lampung':                   [-4.5586,  105.4068],
    'Kalimantan Barat':          [ 0.0000,  109.5068],
    'Kalimantan Tengah':         [-1.6815,  113.3824],
    'Kalimantan Selatan':        [-3.0926,  115.2838],
    'Kalimantan Timur':          [ 0.5387,  116.4194],
    'Kalimantan Utara':          [ 3.0731,  116.0413],
    'Sulawesi Utara':            [ 0.6246,  123.9750],
    'Sulawesi Tengah':           [-1.4300,  121.4456],
    'Sulawesi Selatan':          [-3.6687,  119.9740],
    'Sulawesi Tenggara':         [-4.1449,  122.1746],
    'Sulawesi Barat':            [-2.8441,  119.2321],
    'Gorontalo':                 [ 0.5435,  123.0568],
    'Maluku':                    [-3.2385,  130.1453],
    'Maluku Utara':              [ 1.5709,  127.8088],
    'Papua':                     [-4.2699,  138.0804],
    'Papua Barat':               [-1.3361,  133.1747],
    'Papua Tengah':              [-4.0000,  136.0000],
    'Papua Selatan':             [-7.5000,  139.5000],
    'Papua Barat Daya':          [-1.5000,  131.5000],
    'Papua Pegunungan':          [-4.5000,  139.5000],
    'Nusa Tenggara Barat':       [-8.6529,  117.3616],
    'Nusa Tenggara Timur':       [-8.6574,  121.0794],
    'Daerah Istimewa Yogyakarta':[-7.7956,  110.3695],
    'Aceh':                      [ 4.6951,   96.7494],
    'Kepulauan Bangka Belitung': [-2.7411,  106.4406],
  };

  function drawFallbackMarkers() {
    const maxCount = Math.max(...Object.values(provData).map(p => p.total), 1);
    Object.entries(provData).forEach(([provName, pd]) => {
      const coords = PROVINCE_COORDS[provName];
      if (!coords) return;
      const { fill, stroke } = getColor(pd.total);
      const radius = 8 + (pd.total / maxCount) * 24;

      const circle = L.circleMarker(coords, {
        radius, color: stroke, fillColor: fill,
        weight: 1.5, fillOpacity: 0.85,
      }).addTo(map);

      circle.bindTooltip(
        `<b style="color:#00f5ff">${provName}</b><br>${pd.total.toLocaleString('id-ID')} penonton`,
        { sticky: true }
      );

      // Klik fallback marker → highlight visual saja
      circle.on('click', () => {
        selectedProv = selectedProv === provName ? null : provName;
      });
    });
  }

  /* ── Highlight provinsi dari luar (ranking list) ── */
  function selectProvince(provName) {
    selectedProv = provName;
    if (geoLayer) {
      geoLayer.eachLayer(l => {
        const n        = getGeoName(l.feature);
        const d        = findProvData(n);
        const { fill, stroke } = getColor(d ? d.total : 0);
        const isSel    = d && d.name === provName;
        l.setStyle({
          fillColor:   fill,
          fillOpacity: 1,
          color:       isSel ? '#ff2d9f' : stroke,
          weight:      isSel ? 2.5 : 1,
        });
        if (isSel) {
          l.bringToFront();
          map.fitBounds(l.getBounds(), { padding: [40, 40] });
        }
      });
    }
  }

  function resetView() {
    map && map.setView([-2.5, 118], 5);
    selectedProv = null;
    if (geoLayer) {
      geoLayer.eachLayer(l => {
        const n        = getGeoName(l.feature);
        const d        = findProvData(n);
        const { fill, stroke } = getColor(d ? d.total : 0);
        l.setStyle({ fillColor: fill, fillOpacity: 1, color: stroke, weight: 1 });
      });
    }
  }

  return { init, selectProvince, resetView };

})();

window.MapModule = MapModule;

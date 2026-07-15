# 🌸 VTuber Map Indonesia

> Interactive analytics map — persebaran penonton VTuber di seluruh Indonesia

![screenshot placeholder](screenshot.png)

---

## 📁 Struktur Project

```
vtuber-map/
│
├── index.html              ← Entry point website
│
├── css/
│   └── style.css           ← Semua styles (cyberpunk/neon dark theme)
│
├── js/
│   ├── data.js             ← CSV parsing & data aggregation
│   ├── charts.js           ← Chart.js chart renderers
│   ├── messages.js         ← Floating message system
│   ├── map.js              ← Leaflet map + choropleth layer
│   └── app.js              ← Main orchestrator / entry point
│
├── data/
│   ├── viewers.csv         ← ⭐ DATA ANDA — ganti file ini
│   └── indonesia.geojson   ← Peta GeoJSON Indonesia
│
└── l2d-widget/
    └── README.md           ← Panduan plugin Live2D
```

---

## 📊 Format CSV

File `data/viewers.csv` harus memiliki kolom berikut:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | number | ID unik responden |
| `province` | string | Nama provinsi (wajib) |
| `city` | string | Nama kota/kabupaten |
| `gender` | string | `Male` / `Female` atau `Laki-laki` / `Perempuan` |
| `age` | number | Umur penonton |
| `status` | string | `Student` / `Worker` / `Unemployed` |
| `watch_start_hour` | number | Jam mulai menonton (0–23) |
| `watch_end_hour` | number | Jam selesai menonton (0–23) |
| `message` | string | Pesan dari penonton (opsional) |

### Contoh baris CSV:
```csv
id,province,city,gender,age,status,watch_start_hour,watch_end_hour,message
1,DKI Jakarta,Jakarta Selatan,Female,22,Worker,21,24,Hana Macchia suara merdu!
2,Jawa Barat,Bandung,Male,18,Student,19,22,Kobo Kanaeru lucu bgt
```

---

## 🚀 Cara Menjalankan

### Opsi 1: Live Server (Rekomendasi)
```bash
# Jika punya VS Code, install extension "Live Server"
# Klik kanan index.html → Open with Live Server
```

### Opsi 2: Python HTTP Server
```bash
cd vtuber-map/
python3 -m http.server 8080
# Buka browser: http://localhost:8080
```

### Opsi 3: Node.js HTTP Server
```bash
npx serve .
```

> ⚠️ **Tidak bisa dibuka langsung dengan double-click** karena butuh HTTP server untuk load CSV dan GeoJSON.

---

## 🎮 Fitur Website

| Fitur | Deskripsi |
|---|---|
| 🗺️ Interactive Map | Peta choropleth kepadatan penonton per provinsi |
| ⏰ Peak Time Chart | Grafik jam aktif menonton (24 jam) |
| 👥 Gender Chart | Perbandingan laki-laki vs perempuan per daerah |
| 🎂 Age Distribution | Donut chart distribusi umur penonton |
| 💼 Status Chart | Polar chart pelajar/pekerja/tidak bekerja |
| 💬 Floating Messages | Pesan penonton yang muncul sebagai chat bubble |
| 📊 Province Ranking | Daftar provinsi berdasarkan jumlah penonton |
| 📁 Ganti CSV | Upload CSV baru langsung dari browser |

---

## 🌸 Live2D Widget

Lihat folder `l2d-widget/README.md` untuk panduan integrasi plugin Live2D.

Plugin yang disarankan:
- [live2d-widget by stevenjoezhang](https://github.com/stevenjoezhang/live2d-widget)
- [oh-my-live2d](https://github.com/oh-my-live2d/oh-my-live2d)

---

## 🎨 Desain

**Tema:** Cyberpunk Idol / Neon Dark

**Palette:**
- Background: `#050810` (deep space)
- Cyan accent: `#00f5ff`
- Pink accent: `#ff2d9f`
- Purple accent: `#b24bff`

**Font:**
- Display: Orbitron (futuristic)
- UI: Rajdhani (clean sans)
- Supplement: Noto Sans JP

---

## 📝 Lisensi

MIT — bebas digunakan dan dimodifikasi

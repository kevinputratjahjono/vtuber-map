# 📁 Live2D Widget Plugin Folder

Place your Live2D widget plugin files here.

## Cara Menggunakan

### 1. Plugin yang Didukung
Folder ini dirancang untuk plugin Live2D berikut:
- **live2d-widget** (Steven Ye / stevenjoezhang) — paling populer
- **oh-my-live2d**
- Plugin L2D custom lainnya

### 2. Struktur Folder yang Disarankan
```
l2d-widget/
├── README.md              ← File ini
├── autoload.js            ← File plugin utama (ganti nama jika perlu)
├── waifu.css              ← Style widget
├── waifu-tips.js          ← Konfigurasi tips/dialog
├── waifu-tips.json        ← Pesan dialog
└── models/                ← Folder model L2D
    └── [nama-model]/
        ├── model.json
        ├── *.moc
        └── textures/
```

### 3. Cara Integrasi ke Website

Buka file `index.html`, cari komentar `<!-- L2D WIDGET HOOK -->` dan tambahkan:

```html
<!-- Live2D Widget (taruh sebelum </body>) -->
<link rel="stylesheet" href="l2d-widget/waifu.css" />
<script src="l2d-widget/autoload.js"></script>
```

Atau jika menggunakan CDN:
```html
<script src="https://fastly.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/autoload.js"></script>
```

### 4. Konfigurasi (waifu-tips.json atau autoload.js)
```javascript
// Contoh konfigurasi di autoload.js:
const live2d_settings = {
  modelId: 1,
  modelTexturesId: 1,
  waifuEdgeSide: 'right:0',  // posisi widget
  waifuMinWidth: 'disable',
  waifuDraggable: 'axis-x',
};
```

### 5. Download Plugin
- GitHub: https://github.com/stevenjoezhang/live2d-widget
- CDN: https://fastly.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/

---
Folder ini sengaja dibuat kosong agar tidak confict dengan plugin pilihan Anda. 🌸

# aggregate.py
# Baca city_raw.csv dari BANYAK channel → mapping ke provinsi → agregasi gabungan
#
# Membaca beberapa file city_raw.csv sekaligus (1 per akun/channel YouTube)
# dan menjumlahkan views & watch time-nya jadi SATU total per provinsi
# (tidak dipecah per channel — semua channel dianggap satu populasi viewer),
# supaya hasilnya bisa langsung dipakai untuk dihitung bareng data gender/umur.
#
# Cara pakai:
#   1. Isi CHANNEL_FILES di bawah dengan path city_raw.csv tiap channel.
#   2. Jalankan: python aggregate.py
#   3. Hasil gabungan tersimpan di output_province.csv (folder yang sama
#      dengan script ini) — ini yang dibaca build_viewers.py.

import os
import pandas as pd
from city_to_province import get_province

# ── Daftar channel & path city_raw.csv masing-masing ─────────────────────────
# Path di sini RELATIF terhadap folder tempat aggregate.py ini berada
# (data/youtube/), karena script-nya sekarang ditaruh sejajar dengan
# city_to_province.py di situ.
# Tambah/kurangi baris di sini untuk channel lain di masa depan.
CHANNEL_FILES = [
    {
        "channel": "Suou Ono Ch. (ARVI)",
        "path": r"output_Suou Ono Ch__ARVI__UCZoZhv9PkSryZSN4-WVi0nA\city_raw.csv",
    },
    {
        "channel": "Kevin Putra",
        "path": r"output_Kevin Putra_UCU51lTlTALwxJu6YwJrDJuw\city_raw.csv",
    },
]

# Output gabungan disimpan di folder yang sama dengan script ini
# (data/youtube/), sesuai lokasi yang dibaca build_viewers.py.
OUTPUT_DIR      = "."
OUTPUT_COMBINED = os.path.join(OUTPUT_DIR, "output_province.csv")


# ── 1. Baca semua city_raw.csv dan gabung jadi satu (tanpa label channel) ────
frames = []
for entry in CHANNEL_FILES:
    path = entry["path"]
    if not os.path.exists(path):
        print(f"⚠️  Lewati '{entry['channel']}': file tidak ditemukan → {path}")
        continue
    df_ch = pd.read_csv(path)
    print(f"📍 {entry['channel']}: {len(df_ch)} kota dari API")
    frames.append(df_ch)

if not frames:
    raise SystemExit("❌ Tidak ada city_raw.csv yang berhasil dibaca. Cek path di CHANNEL_FILES.")

df = pd.concat(frames, ignore_index=True)
print(f"\n📊 Total gabungan: {len(df)} baris kota dari {len(frames)} channel\n")

# ── 2. Map city → provinsi ────────────────────────────────────────────────────
df["province"] = df["city"].apply(get_province)

unmatched = df[df["province"] == "Unknown"]
matched   = df[df["province"] != "Unknown"]

if not unmatched.empty:
    print(f"⚠️  {len(unmatched)} baris kota tidak dikenali:")
    for _, row in unmatched.iterrows():
        print(f"     - '{row['city']}' ({int(row['views']):,} views)")
    print()

# ── 3. Agregasi per provinsi, semua channel dijumlah jadi satu total ─────────
result = (
    matched
    .groupby("province")
    .agg(
        views=("views", "sum"),
        watch_minutes=("estimatedMinutesWatched", "sum"),
        city_count=("city", "count"),
    )
    .sort_values("views", ascending=False)
    .reset_index()
)
result["avg_watch_per_view"] = (result["watch_minutes"] / result["views"]).round(1)

# ── 4. Tampilkan ──────────────────────────────────────────────────────────────
print(result.to_string(index=False))

# ── 5. Simpan ─────────────────────────────────────────────────────────────────
os.makedirs(OUTPUT_DIR, exist_ok=True)
result.to_csv(OUTPUT_COMBINED, index=False)
print(f"\n💾 Disimpan ke: {OUTPUT_COMBINED}")

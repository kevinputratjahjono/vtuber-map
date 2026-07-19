"""
clean_sheets.py
───────────────
Bersihkan data dari sheets_raw.csv dan siapkan untuk di-merge
dengan data YouTube Analytics.

Output:
    sheets_clean.csv   ← data bersih, siap merge
    summary_form.json  ← ringkasan statistik GLOBAL se-Indonesia
                         (tidak ada breakdown per provinsi)
"""

import pandas as pd
import json
from datetime import datetime

# ── Anonimisasi ────────────────────────────────────────────────────────────
def buat_kolom_responden_id(df):
    """Ganti nama & email dengan ID pseudonim sekuensial (resp_0001, ...).
    Baris dengan email/nama yang sama dapat ID yang sama, tapi tidak bisa
    dibalik ke identitas asli."""
    kunci = df["email"].fillna("").str.strip().str.lower()
    kosong = kunci == ""
    kunci[kosong] = df.loc[kosong, "nama"].fillna("").str.strip().str.lower()
    kode, _ = pd.factorize(kunci)
    return ["resp_" + str(k + 1).zfill(4) for k in kode]

# ── Load ──────────────────────────────────────────────────────────────────
df = pd.read_csv("sheets_raw.csv")
print(f"📋 Raw data: {len(df)} baris, {len(df.columns)} kolom")
print(f"   Kolom asli: {list(df.columns)}\n")

# ── 1. Bersihkan nama kolom ───────────────────────────────────────────────
df.columns = df.columns.str.strip()
df = df.rename(columns={
    "Jam Mulai Menonton":   "jam_mulai",
    "Jam Selesai Menonton": "jam_selesai",
    "Pesan pesan yang ingin disampaikan untuk para Vtuber Singer": "pesan",
    "Suggestions for improvement (untuk perorangan atau keseluruhan Vtuber Singer)": "saran",
    "Jenis Kelamin": "jenis_kelamin",
    "Email Address": "email",
    "Name":          "nama",
    "Umur":          "umur",
    "Status":        "status",
    "Provinsi":      "provinsi",
    "Timestamp":     "timestamp",
})
print("✅ Nama kolom dibersihkan")

# ── 2. Normalisasi Provinsi (tetap disimpan untuk kepadatan peta) ─────────
PROVINSI_NORMALIZE = {
    "jawa barat":            "Jawa Barat",
    "jawa tengah":           "Jawa Tengah",
    "jawa timur":            "Jawa Timur",
    "dki jakarta":           "DKI Jakarta",
    "di yogyakarta":         "DI Yogyakarta",
    "banten":                "Banten",
    "bali":                  "Bali",
    "sumatera utara":        "Sumatera Utara",
    "sumatera barat":        "Sumatera Barat",
    "sumatera selatan":      "Sumatera Selatan",
    "riau":                  "Riau",
    "kepulauan riau":        "Kepulauan Riau",
    "lampung":               "Lampung",
    "kalimantan barat":      "Kalimantan Barat",
    "kalimantan tengah":     "Kalimantan Tengah",
    "kalimantan selatan":    "Kalimantan Selatan",
    "kalimantan timur":      "Kalimantan Timur",
    "kalimantan utara":      "Kalimantan Utara",
    "sulawesi selatan":      "Sulawesi Selatan",
    "sulawesi tengah":       "Sulawesi Tengah",
    "sulawesi tenggara":     "Sulawesi Tenggara",
    "sulawesi utara":        "Sulawesi Utara",
    "sulawesi barat":        "Sulawesi Barat",
    "gorontalo":             "Gorontalo",
    "maluku":                "Maluku",
    "maluku utara":          "Maluku Utara",
    "papua":                 "Papua",
    "papua barat":           "Papua Barat",
    "papua tengah":          "Papua Tengah",
    "papua pegunungan":      "Papua Pegunungan",
    "papua selatan":         "Papua Selatan",
    "papua barat daya":      "Papua Barat Daya",
    "nusa tenggara barat":   "Nusa Tenggara Barat",
    "nusa tenggara timur":   "Nusa Tenggara Timur",
    "aceh":                  "Aceh",
    "jambi":                 "Jambi",
    "bengkulu":              "Bengkulu",
    "bangka belitung":       "Bangka Belitung",
}

def normalize_provinsi(val):
    if pd.isna(val):
        return "Tidak Diketahui"
    key = val.strip().lower()
    return PROVINSI_NORMALIZE.get(key, val.strip().title())

df["provinsi"] = df["provinsi"].apply(normalize_provinsi)
print(f"✅ Provinsi dinormalisasi ({df['provinsi'].nunique()} provinsi unik)")

# ── 3. Parse timestamp ────────────────────────────────────────────────────
df["timestamp"] = pd.to_datetime(df["timestamp"], format="mixed")
df["tanggal"]   = df["timestamp"].dt.date.astype(str)
df["bulan"]     = df["timestamp"].dt.to_period("M").astype(str)

# ── 4. Hitung durasi menonton (jam) ──────────────────────────────────────
def parse_time(t):
    if pd.isna(t) or str(t).strip() == "":
        return None
    try:
        dt = datetime.strptime(str(t).strip(), "%I:%M:%S %p")
        return dt.hour + dt.minute / 60
    except:
        return None

df["jam_mulai_num"]   = df["jam_mulai"].apply(parse_time)
df["jam_selesai_num"] = df["jam_selesai"].apply(parse_time)

def hitung_durasi(mulai, selesai):
    if mulai is None or selesai is None:
        return None
    durasi = selesai - mulai
    if durasi < 0:
        durasi += 24
    return round(durasi, 2)

df["durasi_jam"] = df.apply(
    lambda r: hitung_durasi(r["jam_mulai_num"], r["jam_selesai_num"]), axis=1
)
print(f"✅ Durasi menonton dihitung (rata-rata: {df['durasi_jam'].mean():.1f} jam)")

# ── 5. Bersihkan kolom teks ───────────────────────────────────────────────
df["jenis_kelamin"] = df["jenis_kelamin"].str.strip()
df["status"]        = df["status"].str.strip()
df["umur"]          = df["umur"].str.strip()
df["email"]         = df["email"].fillna("").str.strip()
df["pesan"]         = df["pesan"].fillna("").str.strip()
df["saran"]         = df["saran"].fillna("").str.strip()
df["nama"]          = df["nama"].str.strip()

# ── 5b. Anonimkan identitas ───────────────────────────────────────────────
df["responden_id"] = buat_kolom_responden_id(df)
df = df.drop(columns=["nama", "email"])

# ── 6. Simpan CSV bersih ──────────────────────────────────────────────────
KOLOM_OUTPUT = [
    "responden_id", "timestamp", "tanggal", "bulan",
    "jenis_kelamin", "umur", "status", "provinsi",
    "jam_mulai", "jam_selesai", "durasi_jam",
    "pesan", "saran",
]
df_clean = df[KOLOM_OUTPUT]
df_clean.to_csv("sheets_clean.csv", index=False)
print(f"\n💾 sheets_clean.csv disimpan ({len(df_clean)} baris)")

# ── 7. Hitung distribusi jam tonton (untuk peak time chart) ──────────────
# Bangun distribusi 24 jam dari jam_mulai → jam_selesai tiap responden
hour_dist = [0] * 24

def parse_hour(t):
    """Parse '8:00:00 PM' → jam integer (0-23)."""
    if pd.isna(t) or str(t).strip() == "":
        return None
    try:
        dt = datetime.strptime(str(t).strip(), "%I:%M:%S %p")
        return dt.hour
    except:
        return None

for _, row in df.iterrows():
    s = parse_hour(row["jam_mulai"])
    e = parse_hour(row["jam_selesai"])
    if s is None or e is None:
        continue
    cur = s
    while cur != e:
        hour_dist[cur % 24] += 1
        cur = (cur + 1) % 24

# ── 8. Ringkasan GLOBAL se-Indonesia (tidak ada per provinsi) ─────────────
#
# Perubahan utama dari versi sebelumnya:
#   - DIHAPUS : groupby("provinsi") → tidak ada breakdown per daerah
#   - DITAMBAH: distribusi jam tonton (hour_dist) untuk chart peak time
#   - DITAMBAH: bucket umur dalam format "0–14 tahun", "15–64 tahun", ">65 tahun"
#               agar cocok dengan format age_gender_merged.csv dari YouTube
#   - TETAP   : data provinsi hanya disimpan di sheets_clean.csv
#               untuk keperluan kepadatan peta (diproses di viewers_merged)

# Gender
gender_counts = df["jenis_kelamin"].value_counts().to_dict()

# Umur — bucket sesuai format sheets_clean.csv
# Nilai asli: '0–14 tahun', '15–64 tahun', '>65 tahun'
umur_counts = df["umur"].value_counts().to_dict()

# Pastikan semua bucket ada (meski 0) agar JS tidak error
for bucket in ["0–14 tahun", "15–64 tahun", ">65 tahun"]:
    umur_counts.setdefault(bucket, 0)

# Status
status_counts = df["status"].value_counts().to_dict()
for s in ["Pelajar", "Pekerja", "Tidak Bekerja"]:
    status_counts.setdefault(s, 0)

# Durasi
durasi_valid = df["durasi_jam"].dropna()

summary = {
    # ── Meta ──────────────────────────────────────────────────────
    "periode":              "2025-01-01 s/d 2026-07-01",
    "total_responden_form": int(len(df)),
    "total_provinsi":       int(df["provinsi"].nunique()),

    # ── Gender (dari form; akan digabung YT di JS) ────────────────
    # Key menggunakan nama yang sama persis dengan nilai di CSV
    # supaya JS tinggal lookup langsung tanpa mapping tambahan.
    "gender": {
        "Laki-Laki":  int(gender_counts.get("Laki-Laki", 0)),
        "Perempuan":  int(gender_counts.get("Perempuan", 0)),
    },

    # ── Umur per bucket (dari form; akan digabung YT di JS) ───────
    # Bucket: "0–14 tahun", "15–64 tahun", ">65 tahun"
    "umur": {
        "0–14 tahun":  int(umur_counts.get("0–14 tahun",  0)),
        "15–64 tahun": int(umur_counts.get("15–64 tahun", 0)),
        ">65 tahun":   int(umur_counts.get(">65 tahun",   0)),
    },

    # ── Status (form saja; tidak digabung YT) ─────────────────────
    "status": {
        "Pelajar":       int(status_counts.get("Pelajar",       0)),
        "Pekerja":       int(status_counts.get("Pekerja",       0)),
        "Tidak Bekerja": int(status_counts.get("Tidak Bekerja", 0)),
    },

    # ── Waktu tonton (form saja) ───────────────────────────────────
    "durasi_rata_rata_jam": round(float(durasi_valid.mean()), 2) if len(durasi_valid) else 0,
    "durasi_median_jam":    round(float(durasi_valid.median()), 2) if len(durasi_valid) else 0,

    # ── Distribusi jam 0-23 (untuk peak time chart) ───────────────
    # hour_dist[i] = jumlah responden yang masih menonton pada jam ke-i
    "hour_dist": hour_dist,
}

with open("summary_form.json", "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)

# ── 9. Print ringkasan ────────────────────────────────────────────────────
print("\n📊 RINGKASAN GLOBAL SE-INDONESIA")
print("─" * 50)
print(f"  Periode          : {summary['periode']}")
print(f"  Total responden  : {summary['total_responden_form']}")
print(f"  Provinsi tercakup: {summary['total_provinsi']}")
print(f"\n  Gender:")
for k, v in summary["gender"].items():
    print(f"    {k:<15}: {v}")
print(f"\n  Umur:")
for k, v in summary["umur"].items():
    print(f"    {k:<15}: {v}")
print(f"\n  Status:")
for k, v in summary["status"].items():
    print(f"    {k:<15}: {v}")
print(f"\n  Durasi rata-rata : {summary['durasi_rata_rata_jam']} jam")
print(f"  Durasi median    : {summary['durasi_median_jam']} jam")
print(f"\n💾 summary_form.json disimpan")
print("─" * 50)

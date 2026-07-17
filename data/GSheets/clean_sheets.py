"""
clean_sheets.py
───────────────
Bersihkan data dari sheets_raw.csv dan siapkan untuk di-merge
dengan data YouTube Analytics.

Output:
    sheets_clean.csv   ← data bersih, siap merge
    summary_form.json  ← ringkasan statistik per provinsi
"""

import pandas as pd
import json
from datetime import datetime

# ── Anonimisasi ────────────────────────────────────────────────────────────
def buat_kolom_responden_id(df):
    """Ganti nama & email dengan ID pseudonim sekuensial (resp_0001, resp_0002, ...).
    Baris dengan email/nama yang sama akan dapat ID yang sama, tapi ID tidak
    bisa dibalik ke identitas asli."""
    kunci = df["email"].fillna("").str.strip().str.lower()
    kosong = kunci == ""
    kunci[kosong] = df.loc[kosong, "nama"].fillna("").str.strip().str.lower()

    kode, _ = pd.factorize(kunci)  # angka unik per identitas, urut kemunculan
    return ["resp_" + str(k + 1).zfill(4) for k in kode]

# ── Load ──────────────────────────────────────────────────────────────────────
df = pd.read_csv("sheets_raw.csv")

print(f"📋 Raw data: {len(df)} baris, {len(df.columns)} kolom")
print(f"   Kolom asli: {list(df.columns)}\n")

# ── 1. Bersihkan nama kolom (hapus trailing spasi) ────────────────────────────
df.columns = df.columns.str.strip()

# Rename kolom panjang jadi lebih pendek
df = df.rename(columns={
    "Jam Mulai Menonton":   "jam_mulai",
    "Jam Selesai Menonton": "jam_selesai",
    "Pesan pesan yang ingin disampaikan untuk para Vtuber Singer": "pesan",
    "Suggestions for improvement (untuk perorangan atau keseluruhan Vtuber Singer)": "saran",
    "Jenis Kelamin": "jenis_kelamin",
    "Email Address": "email",
    "Name": "nama",
    "Umur": "umur",
    "Status": "status",
    "Provinsi": "provinsi",
    "Timestamp": "timestamp",
})

print("✅ Nama kolom dibersihkan")
print(f"   Kolom baru: {list(df.columns)}\n")

# ── 2. Normalisasi kolom Provinsi ─────────────────────────────────────────────
# Mapping variasi penulisan → nama standar
PROVINSI_NORMALIZE = {
    "jawa barat":        "Jawa Barat",
    "jawa tengah":       "Jawa Tengah",
    "jawa timur":        "Jawa Timur",
    "dki jakarta":       "DKI Jakarta",
    "di yogyakarta":     "DI Yogyakarta",
    "banten":            "Banten",
    "bali":              "Bali",
    "sumatera utara":    "Sumatera Utara",
    "sumatera barat":    "Sumatera Barat",
    "sumatera selatan":  "Sumatera Selatan",
    "riau":              "Riau",
    "kepulauan riau":    "Kepulauan Riau",
    "lampung":           "Lampung",
    "kalimantan barat":  "Kalimantan Barat",
    "kalimantan tengah": "Kalimantan Tengah",
    "kalimantan selatan":"Kalimantan Selatan",
    "kalimantan timur":  "Kalimantan Timur",
    "kalimantan utara":  "Kalimantan Utara",
    "sulawesi selatan":  "Sulawesi Selatan",
    "sulawesi tengah":   "Sulawesi Tengah",
    "sulawesi tenggara": "Sulawesi Tenggara",
    "sulawesi utara":    "Sulawesi Utara",
    "sulawesi barat":    "Sulawesi Barat",
    "gorontalo":         "Gorontalo",
    "maluku":            "Maluku",
    "maluku utara":      "Maluku Utara",
    "papua":             "Papua",
    "papua barat":       "Papua Barat",
    "papua tengah":      "Papua Tengah",
    "papua pegunungan":  "Papua Pegunungan",
    "papua selatan":     "Papua Selatan",
    "papua barat daya":  "Papua Barat Daya",
    "nusa tenggara barat": "Nusa Tenggara Barat",
    "nusa tenggara timur": "Nusa Tenggara Timur",
    "aceh":              "Aceh",
    "jambi":             "Jambi",
    "bengkulu":          "Bengkulu",
    "bangka belitung":   "Bangka Belitung",
}

def normalize_provinsi(val):
    if pd.isna(val):
        return "Tidak Diketahui"
    key = val.strip().lower()
    return PROVINSI_NORMALIZE.get(key, val.strip().title())

df["provinsi"] = df["provinsi"].apply(normalize_provinsi)

print("✅ Provinsi dinormalisasi")
print(f"   Provinsi unik: {sorted(df['provinsi'].unique())}\n")

# ── 3. Parse timestamp ────────────────────────────────────────────────────────
df["timestamp"] = pd.to_datetime(df["timestamp"], format="mixed")
df["tanggal"]   = df["timestamp"].dt.date.astype(str)
df["bulan"]     = df["timestamp"].dt.to_period("M").astype(str)

# ── 4. Hitung durasi menonton (jam) ──────────────────────────────────────────
def parse_time(t):
    """Parse string waktu '8:00:00 PM' → jam dalam float (0-24)."""
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
    """Hitung durasi; tangani kasus tengah malam (misal 11PM - 1AM = 2 jam)."""
    if mulai is None or selesai is None:
        return None
    durasi = selesai - mulai
    if durasi < 0:
        durasi += 24   # lewat tengah malam
    return round(durasi, 2)

df["durasi_jam"] = df.apply(
    lambda r: hitung_durasi(r["jam_mulai_num"], r["jam_selesai_num"]), axis=1
)

print("✅ Durasi menonton dihitung")
print(f"   Rata-rata durasi: {df['durasi_jam'].mean():.1f} jam\n")

# ── 5. Bersihkan kolom lain ───────────────────────────────────────────────────
df["jenis_kelamin"] = df["jenis_kelamin"].str.strip()
df["status"]        = df["status"].str.strip()
df["umur"]          = df["umur"].str.strip()
df["email"]         = df["email"].fillna("").str.strip()
df["pesan"]         = df["pesan"].fillna("").str.strip()
df["saran"]         = df["saran"].fillna("").str.strip()
df["nama"]          = df["nama"].str.strip()

# ── 5b. Anonimkan identitas (WAJIB sebelum di-export/dibagikan) ──────────────
# `nama` dan `email` adalah data pribadi (PII) dan TIDAK BOLEH ikut ke file
# output. Kita ganti dengan ID pseudonim yang di-hash agar baris tetap bisa
# dibedakan/di-merge tanpa membuka identitas asli responden.
df["responden_id"] = buat_kolom_responden_id(df)

# nama & email HANYA dipakai sampai titik ini (mis. untuk keperluan internal
# seperti verifikasi duplikat), lalu di-drop dari dataframe kerja supaya
# tidak keikut ke langkah-langkah selanjutnya (CSV, JSON, print, dsb).
df = df.drop(columns=["nama", "email"])

# ── 6. Simpan CSV bersih ──────────────────────────────────────────────────────
KOLOM_OUTPUT = [
    "responden_id", "timestamp", "tanggal", "bulan",
    "jenis_kelamin", "umur", "status", "provinsi",
    "jam_mulai", "jam_selesai", "durasi_jam",
    "pesan", "saran",
]

df_clean = df[KOLOM_OUTPUT]
df_clean.to_csv("sheets_clean.csv", index=False)
print(f"💾 sheets_clean.csv disimpan ({len(df_clean)} baris, tanpa nama/email — sudah dianonimkan)\n")

# ── 7. Ringkasan per provinsi ─────────────────────────────────────────────────
summary = (
    df.groupby("provinsi")
    .agg(
        jumlah_responden=("responden_id", "count"),
        durasi_rata_rata=("durasi_jam", "mean"),
        pelajar=("status", lambda x: (x == "Pelajar").sum()),
        pekerja=("status", lambda x: (x == "Pekerja").sum()),
        laki_laki=("jenis_kelamin", lambda x: (x == "Laki-Laki").sum()),
        perempuan=("jenis_kelamin", lambda x: (x == "Perempuan").sum()),
    )
    .round({"durasi_rata_rata": 1})
    .sort_values("jumlah_responden", ascending=False)
    .reset_index()
)

print("📊 RINGKASAN PER PROVINSI")
print("─" * 65)
print(f"{'Provinsi':<25} {'Resp':>5} {'Durasi':>7} {'Pelajar':>8} {'Pekerja':>8} {'L':>4} {'P':>4}")
print("─" * 65)
for _, r in summary.iterrows():
    print(
        f"{r['provinsi']:<25} {r['jumlah_responden']:>5} "
        f"{r['durasi_rata_rata']:>6.1f}j "
        f"{r['pelajar']:>8} {r['pekerja']:>8} "
        f"{r['laki_laki']:>4} {r['perempuan']:>4}"
    )

# Simpan ke JSON untuk dipakai di website
summary_dict = summary.to_dict(orient="records")
with open("summary_form.json", "w", encoding="utf-8") as f:
    json.dump({
        "total_responden": len(df),
        "per_provinsi": summary_dict,
        "per_status": df["status"].value_counts().to_dict(),
        "per_gender": df["jenis_kelamin"].value_counts().to_dict(),
        "per_umur": df["umur"].value_counts().to_dict(),
        "durasi_rata_rata_keseluruhan": round(df["durasi_jam"].mean(), 1),
    }, f, ensure_ascii=False, indent=2)

print("\n💾 summary_form.json disimpan")
print("─" * 65)
print(f"Total responden : {len(df)}")
print(f"Total provinsi  : {df['provinsi'].nunique()}")
print(f"Durasi rata-rata: {df['durasi_jam'].mean():.1f} jam")

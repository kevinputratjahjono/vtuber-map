"""
build_viewers.py
────────────────
Gabungkan dua sumber data menjadi satu file viewers_merged.csv:

  1. output_province.csv  → YouTube Analytics, diekspan menjadi baris per view
  2. sheets_clean.csv     → Google Form responses, satu baris = satu responden

Kolom output:
  id, province, city, gender, age, status,
  watch_start_hour, watch_end_hour, message, source

Catatan penting:
  - Data dummy (viewers.csv) TIDAK lagi ikut digabungkan.
  - Nilai yang memang tidak tersedia di sumber data (mis. YouTube tidak
    punya data gender/age/jam tonton/pesan per individu, atau jawaban
    Form yang kosong/invalid) dibiarkan KOSONG (NaN) — tidak diisi
    dengan nilai default/template acak seperti versi sebelumnya.

Output:
  viewers_merged.csv — di folder yang sama (vtuber-map/data/)

Jalankan:
  cd "D:\\A KAMPUS\\TA\\vtuber-map\\data"
  python build_viewers.py
"""

import pandas as pd
import numpy as np
import os
import random
from datetime import datetime

random.seed(42)
np.random.seed(42)

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
YOUTUBE_CSV  = os.path.join(BASE_DIR, "youtube", "output_province.csv")
FORM_CSV     = os.path.join(BASE_DIR, "gsheets", "sheets_clean.csv")
OUT_CSV      = os.path.join(BASE_DIR, "viewers_merged.csv")

# ── Mapping provinsi Inggris → Indonesia (untuk YouTube data) ────────────────
EN_TO_ID = {
    "DKI Jakarta":    "DKI Jakarta",
    "West Java":      "Jawa Barat",
    "East Java":      "Jawa Timur",
    "Central Java":   "Jawa Tengah",
    "Banten":         "Banten",
    "Bali":           "Bali",
    "North Sumatra":  "Sumatera Utara",
    "South Sulawesi": "Sulawesi Selatan",
}

# Kolom final (urutan output)
COLS = ["province", "city", "gender", "age", "status",
        "watch_start_hour", "watch_end_hour", "message", "source"]


# ════════════════════════════════════════════════════════════════════════════
# 1. EXPAND YOUTUBE ANALYTICS → satu baris per view
#
# YouTube Analytics hanya menyediakan agregat jumlah views per provinsi —
# tidak ada data kota, gender, umur, status, jam tonton, atau pesan per
# individu. Karena itu baris hasil ekspansi hanya mengisi kolom yang
# benar-benar diketahui (province, source); kolom lain dibiarkan kosong
# (NaN), bukan diisi nilai acak/template seperti sebelumnya.
# ════════════════════════════════════════════════════════════════════════════
print("📂 Membaca output_province.csv (YouTube) ...")
df_yt = pd.read_csv(YOUTUBE_CSV)

rows_yt = []
for _, r in df_yt.iterrows():
    province_id = EN_TO_ID.get(r["province"], r["province"])
    n_rows      = int(r["views"])

    for _ in range(n_rows):
        rows_yt.append({
            "province":         province_id,
            "city":             np.nan,
            "gender":           np.nan,
            "age":              np.nan,
            "status":           np.nan,
            "watch_start_hour": np.nan,
            "watch_end_hour":   np.nan,
            "message":          np.nan,
            "source":           "youtube",
        })

df_yt_expanded = pd.DataFrame(rows_yt, columns=COLS)
print(f"   ✅ {len(df_yt)} provinsi → {len(df_yt_expanded)} baris (1:1 dengan total views)")


# ════════════════════════════════════════════════════════════════════════════
# 2. GOOGLE FORM → satu baris per responden (sudah individual)
#
# Kolom form dipetakan langsung ke format output. Jawaban yang kosong atau
# tidak bisa di-parse dibiarkan kosong (NaN), tidak diisi nilai default.
# Untuk kolom umur yang berbentuk rentang (mis. "15–64 tahun"), tetap
# dipetakan ke satu angka representatif di dalam rentang tersebut karena
# itu bukan data kosong — hanya kategorikal yang perlu dikonversi ke angka.
# ════════════════════════════════════════════════════════════════════════════
print("📂 Membaca sheets_clean.csv (Google Form) ...")
df_form = pd.read_csv(FORM_CSV)

def parse_hour(time_str):
    """'8:00:00 PM' → integer jam (20); kosong/invalid → NaN (tidak didefault)"""
    if pd.isna(time_str) or str(time_str).strip() == "":
        return np.nan
    try:
        dt = datetime.strptime(str(time_str).strip(), "%I:%M:%S %p")
        return dt.hour
    except Exception:
        return np.nan

def map_gender(val):
    """Kosong → NaN (tidak didefault ke 'Male')"""
    if pd.isna(val) or str(val).strip() == "":
        return np.nan
    return "Male" if "Laki" in str(val) else "Female"

def map_status(val):
    """Kosong → NaN (tidak didefault ke 'Student')"""
    if pd.isna(val) or str(val).strip() == "":
        return np.nan
    v = str(val).lower()
    if "pelajar" in v or "mahasiswa" in v:
        return "Student"
    elif "pekerja" in v or "kerja" in v:
        return "Worker"
    return "Other"

def map_age(umur_str):
    """
    Rentang umur ('0-14 tahun', '15-64 tahun', '65+ tahun') → angka
    representatif di dalam rentang. Ini BUKAN pengisian data kosong,
    hanya konversi kategori → angka. Jika field-nya sendiri kosong,
    hasilnya NaN.
    """
    if pd.isna(umur_str) or str(umur_str).strip() == "":
        return np.nan
    s = str(umur_str)
    if "0–14" in s or "0-14" in s:
        return random.randint(10, 14)
    elif "15–64" in s or "15-64" in s:
        return random.randint(16, 35)
    elif "65" in s:
        return random.randint(65, 75)
    return np.nan

rows_form = []
for _, r in df_form.iterrows():
    province_val = r.get("provinsi", np.nan)
    message_val  = r.get("pesan", np.nan)
    rows_form.append({
        "province":         province_val if not pd.isna(province_val) and str(province_val).strip() != "" else np.nan,
        "city":             np.nan,  # form tidak menanyakan kota spesifik
        "gender":           map_gender(r.get("jenis_kelamin")),
        "age":              map_age(r.get("umur")),
        "status":           map_status(r.get("status")),
        "watch_start_hour": parse_hour(r.get("jam_mulai")),
        "watch_end_hour":   parse_hour(r.get("jam_selesai")),
        "message":          (str(message_val).strip()[:200]
                              if not pd.isna(message_val) and str(message_val).strip() != ""
                              else np.nan),
        "source":           "form",
    })

df_form_mapped = pd.DataFrame(rows_form, columns=COLS)
print(f"   ✅ {len(df_form_mapped)} baris dari Google Form")


# ════════════════════════════════════════════════════════════════════════════
# 3. GABUNGKAN & BERI ID BARU
# ════════════════════════════════════════════════════════════════════════════
print("\n🔀 Menggabungkan YouTube + Form ...")

df_all = pd.concat([
    df_yt_expanded[COLS],
    df_form_mapped[COLS],
], ignore_index=True)

# ID baru mulai dari 1
df_all.insert(0, "id", range(1, len(df_all) + 1))

# Bersihkan string kosong tanpa menciptakan nilai baru; kosongkan tetap NaN
df_all["city"]    = df_all["city"].astype("string").str.strip()
df_all["message"] = df_all["message"].astype("string").str.strip()

# Kolom numerik dibuat nullable-integer (Int64) supaya NaN tetap terjaga
# (tidak dipaksa jadi 0 atau nilai default lain)
for col in ["age", "watch_start_hour", "watch_end_hour"]:
    df_all[col] = pd.to_numeric(df_all[col], errors="coerce").astype("Int64")


# ════════════════════════════════════════════════════════════════════════════
# 4. RINGKASAN & SIMPAN
# ════════════════════════════════════════════════════════════════════════════
print(f"\n{'─'*55}")
print(f"  KOMPOSISI DATA")
print(f"{'─'*55}")
for src, grp in df_all.groupby("source"):
    print(f"  {src:<10} : {len(grp):>4} baris  "
          f"({len(grp)/len(df_all)*100:.1f}%)")
print(f"  {'TOTAL':<10} : {len(df_all):>4} baris")
print(f"{'─'*55}")
print(f"\n  Provinsi unik   : {df_all['province'].nunique(dropna=True)}")
print(f"  Baris tanpa age : {df_all['age'].isna().sum()}")
print(f"  Baris tanpa jam : {df_all['watch_start_hour'].isna().sum()}")

df_all.to_csv(OUT_CSV, index=False)
print(f"\n💾 Disimpan ke: {OUT_CSV}")
print(f"   {len(df_all)} baris total")

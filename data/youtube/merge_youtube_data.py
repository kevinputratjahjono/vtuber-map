"""
merge_youtube_data.py
----------------------
Menggabungkan raw data YouTube Analytics dari beberapa channel menjadi:
  - data/youtube/age_gender_merged.csv  (weighted merge per age/gender)
  - data/youtube/output_province.csv    (agregasi city -> province)

Channel folder di-auto-discover (semua folder yang diawali "output_"),
jadi tidak perlu edit script kalau ada channel baru ditambahkan.

Cara pakai (dijalankan dari dalam folder data/youtube):
  python merge_youtube_data.py
"""

import re
from pathlib import Path

import pandas as pd
from city_to_province import get_province

# ── Konfigurasi ───────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent  # data/youtube/
OUT_DIR = BASE_DIR
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Auto-discover semua folder channel: data/youtube/output_*/
CHANNELS = {
    p.name: p
    for p in BASE_DIR.iterdir()
    if p.is_dir() and p.name.startswith("output_")
}

if not CHANNELS:
    raise SystemExit(
        f"❌ Tidak ada folder 'output_*' ditemukan di {BASE_DIR}. "
        "Pastikan script ini dijalankan dari dalam data/youtube/."
    )

print(f"📂 Channel terdeteksi ({len(CHANNELS)}):")
for name in CHANNELS:
    print(f"   - {name}")

# Suffix umum yang suka ditempel YouTube Analytics API di nama kota,
# perlu di-strip dulu sebelum lookup ke city_to_province.py
_SUFFIX_PATTERN = re.compile(r"\s+(regency|city|kabupaten|kota)$", re.IGNORECASE)


def normalize_city_name(city: str) -> str:
    """Strip suffix seperti 'Regency'/'City' sebelum di-lookup ke mapping provinsi."""
    return _SUFFIX_PATTERN.sub("", city.strip())


def load_channel_data(folder: Path):
    city = pd.read_csv(folder / "city_raw.csv")
    age_gender = pd.read_csv(folder / "age_gender_raw.csv")
    total_views = city["views"].sum()
    return city, age_gender, total_views


# ── Step 1: Load semua channel ───────────────────────────────────────────
channel_data = {name: load_channel_data(path) for name, path in CHANNELS.items()}

# ── Step 2: Weighted merge age_gender ────────────────────────────────────
all_keys = set()
for _, age_gender, _ in channel_data.values():
    all_keys.update(zip(age_gender["ageGroup"], age_gender["gender"]))

merged_rows = []
for age_group, gender in sorted(all_keys):
    numerator = 0.0
    denominator = 0.0
    for _, age_gender, total_views in channel_data.values():
        match = age_gender[(age_gender["ageGroup"] == age_group) & (age_gender["gender"] == gender)]
        pct = float(match["viewerPercentage"].iloc[0]) if not match.empty else 0.0
        numerator += pct * total_views
        denominator += total_views
    merged_pct = numerator / denominator if denominator else 0.0
    merged_rows.append({"ageGroup": age_group, "gender": gender, "viewerPercentage": round(merged_pct, 2)})

age_gender_merged = pd.DataFrame(merged_rows)
age_gender_merged.to_csv(OUT_DIR / "age_gender_merged.csv", index=False)
print(f"✅ age_gender_merged.csv dibuat ({len(age_gender_merged)} baris)")

# ── Step 3: Gabung city_raw semua channel ────────────────────────────────
all_city = pd.concat([city for city, _, _ in channel_data.values()], ignore_index=True)
city_merged = (
    all_city.groupby("city", as_index=False)
    .agg(views=("views", "sum"), estimatedMinutesWatched=("estimatedMinutesWatched", "sum"))
)

# ── Step 4: Agregasi ke level province ───────────────────────────────────
city_merged["province"] = city_merged["city"].apply(
    lambda c: get_province(normalize_city_name(c))
)

unknown_cities = city_merged.loc[city_merged["province"] == "Unknown", "city"].tolist()
if unknown_cities:
    print(f"⚠️  {len(unknown_cities)} kota tidak ketemu mapping-nya, dimasukkan ke 'Unknown':")
    for c in unknown_cities:
        print(f"    - {c}")
    print("    → tambahkan ke city_to_province.py kalau perlu.")

province_df = (
    city_merged.groupby("province", as_index=False)
    .agg(views=("views", "sum"), estimatedMinutesWatched=("estimatedMinutesWatched", "sum"))
    .sort_values("views", ascending=False)
)

province_df.to_csv(OUT_DIR / "output_province.csv", index=False)
print(f"✅ output_province.csv dibuat ({len(province_df)} baris)")

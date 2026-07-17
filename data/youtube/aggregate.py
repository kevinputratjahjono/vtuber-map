# aggregate.py
# Baca city_raw.csv → mapping ke provinsi → agregasi

import pandas as pd
import json
from city_to_province import get_province

# ── Baca hasil fetch ──────────────────────────────────────────────────────────
df = pd.read_csv("city_raw.csv")
print(f"📍 {len(df)} kota dari API\n")

# ── Map city → provinsi ───────────────────────────────────────────────────────
df["province"] = df["city"].apply(get_province)

# Pisahkan yang tidak dikenali
unmatched = df[df["province"] == "Unknown"]
matched   = df[df["province"] != "Unknown"]

if not unmatched.empty:
    print(f"⚠️  {len(unmatched)} kota tidak dikenali:")
    for _, row in unmatched.iterrows():
        print(f"     - '{row['city']}' ({int(row['views']):,} views)")
    print()

# ── Agregasi per provinsi ─────────────────────────────────────────────────────
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

# ── Tampilkan ─────────────────────────────────────────────────────────────────
print(result.to_string(index=False))

# ── Simpan ────────────────────────────────────────────────────────────────────
result.to_csv("output_province.csv", index=False)
print("\n💾 Disimpan ke output_province.csv")
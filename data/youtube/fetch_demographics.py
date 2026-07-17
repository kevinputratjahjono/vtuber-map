# fetch_demographics.py

import os
import json
import pandas as pd
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# ── Scopes ────────────────────────────────────────────────────────────────────
# Tambahan scope 'youtube.readonly' diperlukan supaya kita bisa ambil
# nama & ID channel (dipakai untuk penamaan file/folder per akun).
SCOPES = [
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/youtube.readonly",
]
CLIENT_SECRET_FILE = "client_secret_663909966366-mbj44s2q80gimi28baa62sh6us6e6t10.apps.googleusercontent.com.json"

# ── Authenticate ─────────────────────────────────────────────────────────────
flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
credentials = flow.run_local_server(port=0)

# ── Ambil identitas channel yang sedang login ────────────────────────────────
youtube_data = build("youtube", "v3", credentials=credentials)
channel_info = youtube_data.channels().list(part="snippet", mine=True).execute()

channel_id = channel_info["items"][0]["id"]
channel_title = channel_info["items"][0]["snippet"]["title"]

# Bikin nama folder yang aman dari karakter aneh (spasi, /, dll)
safe_title = "".join(c if c.isalnum() or c in (" ", "-", "_") else "_" for c in channel_title).strip()
account_folder = f"output_{safe_title}_{channel_id}"
os.makedirs(account_folder, exist_ok=True)

print(f"📺 Login sebagai: {channel_title} ({channel_id})")
print(f"📁 Output akan disimpan di folder: {account_folder}/")

# ── Simpan refresh token PER AKUN ────────────────────────────────────────────
token_path = os.path.join(account_folder, "token.json")
with open(token_path, "w") as f:
    json.dump({
        "refresh_token": credentials.refresh_token,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
    }, f, indent=2)
print(f"✅ Refresh token disimpan ke {token_path}")

# ── Build client Analytics ───────────────────────────────────────────────────
youtube_analytics = build("youtubeAnalytics", "v2", credentials=credentials)

# ── Fetch city data Indonesia ─────────────────────────────────────────────────
response = youtube_analytics.reports().query(
    ids="channel==MINE",
    startDate="2025-01-01",
    endDate="2026-07-01",
    metrics="views,estimatedMinutesWatched",
    dimensions="city",
    filters="country==ID",
    sort="-views",
    maxResults=250,
).execute()

headers = [h["name"] for h in response["columnHeaders"]]
rows = response.get("rows", [])

city_csv_path = os.path.join(account_folder, "city_raw.csv")
if not rows:
    print("⚠️  Tidak ada data city yang dikembalikan API")
else:
    df = pd.DataFrame(rows, columns=headers)
    df["views"] = df["views"].astype(int)
    df["estimatedMinutesWatched"] = df["estimatedMinutesWatched"].astype(int)

    print(f"\n📍 {len(df)} kota ditemukan\n")
    print(df.to_string(index=False))

    df.to_csv(city_csv_path, index=False)
    print(f"\n💾 Disimpan ke {city_csv_path}")

# ── Fetch age group & gender data Indonesia ───────────────────────────────────
response_age = youtube_analytics.reports().query(
    ids="channel==MINE",
    startDate="2023-02-01",
    endDate="2025-07-15",
    metrics="viewerPercentage",
    dimensions="ageGroup,gender",
    filters="country==ID",
    sort="gender,ageGroup",
).execute()

headers_age = [h["name"] for h in response_age["columnHeaders"]]
rows_age = response_age.get("rows", [])

age_csv_path = os.path.join(account_folder, "age_gender_raw.csv")
if not rows_age:
    print("⚠️  Tidak ada data ageGroup/gender yang dikembalikan API")
else:
    df_age = pd.DataFrame(rows_age, columns=headers_age)
    df_age["viewerPercentage"] = df_age["viewerPercentage"].astype(float)

    print(f"\n👥 {len(df_age)} baris data umur & gender ditemukan\n")
    print(df_age.to_string(index=False))

    df_age.to_csv(age_csv_path, index=False)
    print(f"\n💾 Disimpan ke {age_csv_path}")

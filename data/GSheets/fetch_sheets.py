# fetch_sheets.py

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import pandas as pd

CLIENT_SECRET_FILE = "client_secret_663909966366-mbj44s2q80gimi28baa62sh6us6e6t10.apps.googleusercontent.com.json"

# Gabungkan scope YouTube + Sheets sekaligus
SCOPES = [
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
]

SPREADSHEET_ID = "1_145EzLSAsuK5-rZrObiUfQLfI35MRp_MPfuZ7ZQNmE"
RANGE = "Form Responses 1!A1:K1000"  # sesuaikan nama sheet dan range-nya

# ── Authenticate ──────────────────────────────────────────────────────────────
flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET_FILE, SCOPES)
credentials = flow.run_local_server(port=0)

# ── Build Sheets client ───────────────────────────────────────────────────────
sheets = build("sheets", "v4", credentials=credentials)

# ── Fetch data ────────────────────────────────────────────────────────────────
result = sheets.spreadsheets().values().get(
    spreadsheetId=SPREADSHEET_ID,
    range=RANGE,
).execute()

rows = result.get("values", [])

if not rows:
    print("⚠️  Spreadsheet kosong atau range tidak ditemukan")
else:
    header = rows[0]       # baris pertama = nama kolom
    data   = rows[1:]      # baris selanjutnya = isi data

    df = pd.DataFrame(data, columns=header)

    print(f"✅ {len(df)} baris, {len(df.columns)} kolom")
    print(f"   Kolom: {list(df.columns)}\n")
    print(df.head(10).to_string(index=False))

    df.to_csv("sheets_raw.csv", index=False)
    print("\n💾 Disimpan ke sheets_raw.csv")
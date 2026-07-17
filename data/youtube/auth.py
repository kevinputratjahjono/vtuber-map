from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import pandas as pd

SCOPES = ["https://www.googleapis.com/auth/yt-analytics.readonly"]

# Authenticate
flow = InstalledAppFlow.from_client_secrets_file("client_secret_663909966366-mbj44s2q80gimi28baa62sh6us6e6t10.apps.googleusercontent.com.json", SCOPES)
credentials = flow.run_local_server(port=0)

# Build the Analytics API client
youtube_analytics = build("youtubeAnalytics", "v2", credentials=credentials)
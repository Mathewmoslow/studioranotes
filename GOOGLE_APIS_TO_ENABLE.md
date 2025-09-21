# Google APIs to Enable

Go to Google Cloud Console: https://console.cloud.google.com/apis/library

Search for and enable these APIs:

## Required for Authentication:
1. **Google+ API** or **Google Identity Toolkit API**
2. **People API** - For user profile information

## Required for Features:
3. **Google Drive API** - For backup/restore functionality
4. **Google Calendar API** - For calendar sync features

## How to Enable:
1. Go to https://console.cloud.google.com/apis/library
2. Make sure you're in the correct project
3. Search for each API name
4. Click on the API
5. Click "Enable"

## Also Required:
Make sure OAuth 2.0 is configured with these redirect URIs:
- https://studioranotes.vercel.app/api/auth/callback/google
- http://localhost:3000/api/auth/callback/google (for local development)
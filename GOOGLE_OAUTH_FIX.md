# Google OAuth Configuration Fix

## Issue
Getting 400 error when trying to login with Google OAuth

## Required Actions in Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Add these **Authorized redirect URIs** (EXACTLY as shown):
   ```
   https://studioranotes.vercel.app/api/auth/callback/google
   https://studioranotes-git-main-mathew-moslows-projects.vercel.app/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```

4. Under **Authorized JavaScript origins**, add:
   ```
   https://studioranotes.vercel.app
   https://studioranotes-git-main-mathew-moslows-projects.vercel.app
   http://localhost:3000
   ```

## Required Environment Variables in Vercel

Make sure these are set in Vercel (Settings > Environment Variables):

1. `NEXTAUTH_URL` = `https://studioranotes.vercel.app`
2. `NEXTAUTH_SECRET` = (your secret - can be any random string)
3. `GOOGLE_CLIENT_ID` = (your client ID from Google)
4. `GOOGLE_CLIENT_SECRET` = (your client secret from Google)

## Common Issues

1. **Redirect URI mismatch**: The URI in Google Console must EXACTLY match what NextAuth sends
2. **Missing NEXTAUTH_URL**: This must be set to your production domain
3. **Wrong domain format**: Don't include trailing slashes in domains

## Testing

After making changes:
1. Wait 5 minutes for Google to update
2. Clear browser cache/cookies
3. Try logging in again
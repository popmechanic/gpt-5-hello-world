# Setting up Dexie Cloud Sync

## Quick Setup Guide

1. **Create a Dexie Cloud database:**
   ```bash
   npx dexie-cloud create
   ```
   - Enter your email address when prompted
   - Choose a database name (e.g., "playful-data-lab")
   - Copy the database URL provided

2. **Whitelist your app origins:**
   ```bash
   npx dexie-cloud whitelist http://localhost:3000
   npx dexie-cloud whitelist https://your-production-domain.com
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   - Edit `.env` and update `DEXIE_CLOUD_URL` with your actual database URL

4. **Update database configuration:**
   - Open `database.js`
   - Replace the demo URL in the `databaseUrl` field with your actual URL
   - Set `requireAuth: true` if you want to require authentication

## Features Enabled

✅ **Real-time sync** - Changes sync instantly across devices
✅ **Offline support** - Works without internet, syncs when reconnected  
✅ **Email authentication** - Passwordless login with email OTP
✅ **Per-user data** - Each user sees only their own notes and images
✅ **Conflict resolution** - Automatic handling of concurrent changes

## Authentication Flow

1. User enters email address
2. Dexie Cloud sends magic link/OTP to email
3. User clicks link or enters OTP
4. App automatically syncs data for that user

## Sync Status Indicators

- 🔴 **Red dot** - Offline
- 🟡 **Yellow dot (pulsing)** - Syncing in progress
- 🟢 **Green dot** - Online and synced

## Testing Sync

1. Open app in multiple browser windows/tabs
2. Sign in with the same email in both
3. Create a note in one window
4. Watch it appear instantly in the other

## Pricing

- **Free tier**: 3 production users, 100 MB storage
- **Production tier**: $0.12/user/month
- **Enterprise**: Custom pricing

For more details, visit: https://dexie.org/cloud/
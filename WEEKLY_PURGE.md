# Weekly Purge Feature

## Overview

The app automatically purges old data every week to maintain a minimal database size. This keeps the chat focused on recent, relevant conversations.

## What Gets Purged

- **Messages** older than 7 days
- **Message translations** (cascades automatically)
- **Image files** in storage associated with deleted messages

## What's Preserved

- **User accounts** (for quick re-login)
- **System rooms** (General, Machine Issues, etc.)
- **Recent messages** (last 7 days)

## Schedule

- **Frequency**: Every Sunday
- **Time**: 3:00 AM UTC
- **Method**: Vercel Cron Job

## Setup

### 1. Environment Variable

Add to your `.env.local` and Vercel environment variables:

```env
CRON_SECRET=your_random_secret_string_here
```

Generate a secure random string:
```bash
openssl rand -hex 32
```

### 2. Vercel Configuration

The cron job is automatically configured via `vercel.json`. No additional setup needed after deployment.

## Testing Manually

### Option 1: Test via API Route

```bash
curl -X GET "https://your-domain.com/api/cron/purge" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option 2: Test Locally

```bash
# Set CRON_SECRET in your .env.local first
curl -X GET "http://localhost:3000/api/cron/purge" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option 3: Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to the "Crons" tab
3. Click "Run Now" to trigger manually

## Response Format

Successful purge returns:

```json
{
  "success": true,
  "deletedMessages": 42,
  "deletedImages": 5,
  "cutoffDate": "2024-01-15T03:00:00.000Z",
  "purgeDate": "2024-01-22T03:00:00.000Z"
}
```

## Troubleshooting

### Purge not running?

1. **Check Vercel Cron configuration**
   - Verify `vercel.json` is deployed
   - Check "Crons" tab in Vercel dashboard

2. **Check environment variables**
   - Ensure `CRON_SECRET` is set in Vercel
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set

3. **Check logs**
   - View Vercel function logs
   - Look for errors in the cron execution

### Images not deleting?

- Storage paths are automatically extracted from message URLs
- Check Supabase Storage bucket permissions
- Verify service role key has storage access

## Customization

### Change purge interval

Edit `vercel.json` cron schedule:

```json
{
  "crons": [{
    "path": "/api/cron/purge",
    "schedule": "0 3 * * 0"  // Sunday at 3 AM UTC
  }]
}
```

Cron format: `minute hour day-of-month month day-of-week`

Examples:
- Daily at 3 AM: `0 3 * * *`
- Weekly on Monday: `0 3 * * 1`
- Every 6 hours: `0 */6 * * *`

### Change retention period

Edit `app/api/cron/purge/route.ts`:

```typescript
// Change from 7 days to 14 days
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 14);
```

### Enable user cleanup

Uncomment the user cleanup section in the purge route if you want to also delete inactive users.

## Security

- The endpoint is protected by `CRON_SECRET` authorization
- Only Vercel Cron (with the secret) or manual calls with the secret can trigger it
- Uses service role key for database operations (bypasses RLS)


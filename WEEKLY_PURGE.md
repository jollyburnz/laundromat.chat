# Weekly Purge Feature

## Overview

The app automatically performs a **full reset** every week to maintain a minimal database size. This completely clears all chat data while preserving system infrastructure and staff accounts.

## What Gets Purged

- **ALL Messages** (full reset)
- **Message translations** (cascades automatically)
- **Image files** in storage associated with deleted messages
- **ALL User accounts** (except staff/admin)

## What's Preserved

- **Staff/Admin user accounts** (preserved for system access)
- **System rooms** (General, Machine Issues, etc.)

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
  "deletedUsers": 15,
  "resetDate": "2024-01-22T03:00:00.000Z",
  "message": "Full weekly reset completed successfully"
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

### Change from full reset to age-based purging

If you want to change from full reset to age-based purging, edit `app/api/cron/purge/route.ts`:

```typescript
// Replace the full reset logic with age-based purging
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const { error: deleteError, count } = await supabase
  .from('messages')
  .delete({ count: 'exact' })
  .lt('created_at', sevenDaysAgo.toISOString());
```

### Modify user cleanup behavior

The user cleanup is currently enabled and deletes all non-staff/admin users. To change this behavior, modify the user deletion logic in the purge route.

## Security

- The endpoint is protected by `CRON_SECRET` authorization
- Only Vercel Cron (with the secret) or manual calls with the secret can trigger it
- Uses service role key for database operations (bypasses RLS)


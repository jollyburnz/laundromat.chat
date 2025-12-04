# Laundromat Chat

A hyperlocal multilingual chat webapp for laundromats with real-time messaging, room-based channels, staff moderation, and auto-translation features.

## Features

- **Multilingual Support**: English, Traditional Chinese (繁體中文), and Spanish (Español)
- **Real-time Messaging**: Powered by Supabase Realtime
- **Multiple Rooms**: General Chat, Machine Issues, Lost & Found, Announcements, Support
- **Auto-translation**: Messages are automatically translated to user's preferred language
- **Staff Features**: Staff badges, moderation tools, staff-only rooms
- **Authentication**: Phone OTP, QR Code, or Anonymous login
- **Push Notifications**: Web push notifications for new messages
- **Image Upload**: Support for image attachments in messages

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TailwindCSS
- **Backend & Realtime**: Supabase (PostgreSQL, Realtime, Auth, Storage)
- **i18n**: next-intl
- **Translation**: Azure Translator API (Free tier: 2M characters/month)
- **Hosting**: Vercel (recommended)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project at https://supabase.com
2. Run the migration file: `supabase/migrations/001_initial_schema.sql`
3. Enable Realtime for the `messages` table
4. Create a storage bucket named `images` for image uploads
5. Configure Row Level Security (RLS) policies as specified in the migration

### 3. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AZURE_TRANSLATOR_KEY=your_azure_translator_key
AZURE_TRANSLATOR_REGION=global
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
NEXT_PUBLIC_ENABLE_TRANSLATIONS=true
CRON_SECRET=your_random_secret_string_here
```

**Translation Feature**: Set `NEXT_PUBLIC_ENABLE_TRANSLATIONS=false` to disable auto-translation. When disabled, messages display in their original language only.

**Weekly Purge**: The `CRON_SECRET` is required for the automatic weekly purge feature. Generate a random string (e.g., `openssl rand -hex 32`) and add it to your environment variables. The purge runs automatically every Sunday at 3 AM UTC to delete messages older than 7 days.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Management

### Weekly Purge

The app automatically purges old data every week to keep the database minimal:

- **Schedule**: Every Sunday at 3 AM UTC
- **What gets deleted**:
  - Messages older than 7 days
  - Associated image files in storage
  - Message translations (cascades with messages)
- **What's preserved**:
  - User accounts (for quick re-login)
  - System rooms
  - Recent messages (last 7 days)

The purge runs automatically via Vercel Cron. Make sure to set the `CRON_SECRET` environment variable.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel dashboard (including `CRON_SECRET`)
4. Deploy - the cron job will be automatically configured from `vercel.json`

### Custom Domain

Point your domain `laundromat.chat` to your Vercel deployment.

## Database Schema

The app uses the following main tables:
- `users`: User accounts and preferences
- `rooms`: Chat rooms/channels
- `messages`: Chat messages
- `message_translations`: Cached translations

See `supabase/migrations/001_initial_schema.sql` for the complete schema.

## Usage

### For Customers

**Option 1: QR Code (Recommended)**
1. Scan the QR code poster in the laundromat
2. New users: Create a unique nickname
3. Returning users: Auto-login instantly
4. Start chatting!

**Option 2: Manual Login**
1. Visit the login page
2. Choose login method (Phone or Anonymous)
3. New users: Create a unique nickname
4. Select a room to chat in
5. Messages are automatically translated to your preferred language

### For Staff

1. Login with staff credentials
2. Access staff-only Support room
3. Use moderation tools to manage messages
4. Post announcements to the Announcements room

## License

ISC


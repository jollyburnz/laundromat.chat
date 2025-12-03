# Laundromat.chat Webapp Implementation Plan

## Overview

Build a hyperlocal chat webapp for a family laundromat with bilingual support (English/Traditional Chinese), real-time messaging, room-based channels, staff moderation, and message auto-translation.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TailwindCSS
- **Backend & Realtime**: Supabase (PostgreSQL, Realtime, Auth, Storage)
- **i18n**: next-intl for bilingual UI
- **Translation**: OpenAI API (gpt-4o-mini) for message translation
- **Hosting**: Vercel
- **Push Notifications**: Web Push API (via service worker)

## Project Structure

```
laundromat-chat/
├── app/
│   ├── [locale]/           # i18n routes (en, zh)
│   │   ├── login/
│   │   ├── chat/
│   │   └── layout.tsx
│   ├── api/
│   │   ├── translate/      # Translation endpoint
│   │   └── auth/           # Auth callbacks
│   └── layout.tsx
├── components/
│   ├── chat/
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   ├── RoomSelector.tsx
│   │   └── StaffBadge.tsx
│   ├── auth/
│   │   ├── PhoneLogin.tsx
│   │   └── QRCodeLogin.tsx
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── translations.ts     # Translation service
│   └── utils.ts
├── messages/               # next-intl translation files
│   ├── en.json
│   └── zh.json
├── supabase/
│   └── migrations/         # Database migrations
└── public/
    └── icons/
```

## Database Schema (Supabase)

### users table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE,
  nickname TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'zh')),
  device_id TEXT,  -- For anonymous users
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### rooms table

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,  -- English name
  name_zh TEXT,  -- Chinese name
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'announcement', 'support')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### messages table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  image_url TEXT,
  language TEXT,  -- Detected language of original message
  is_staff BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### message_translations table

```sql
CREATE TABLE message_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  target_language TEXT CHECK (target_language IN ('en', 'zh')),
  translated_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, target_language)
);
```

### Enable Realtime

- Enable realtime replication on `messages` table
- Set up Row Level Security (RLS) policies for read/write access

## Implementation Steps

### 1. Project Setup

- Initialize Next.js 14+ project with TypeScript
- Install dependencies: `@supabase/supabase-js`, `next-intl`, `tailwindcss`, `openai`
- Configure TailwindCSS
- Set up next-intl with locale routing (`en`, `zh`)
- Create translation files in `messages/en.json` and `messages/zh.json`

### 2. Supabase Configuration

- Create Supabase project
- Run database migrations (create tables, enable RTL)
- Set up authentication (phone OTP or anonymous auth)
- Configure storage bucket for image uploads
- Set up RLS policies:
  - Users can read messages in rooms
  - Users can create messages
  - Staff can delete/moderate messages
- Enable Realtime subscriptions on messages table

### 3. Authentication System

- **Phone Login**: Implement OTP flow using Supabase Auth
- **QR Code Login**: Generate unique QR codes that link to a short-lived token
- **Anonymous Mode**: Allow device-based temporary accounts with nicknames
- Store user language preference in user profile
- Create login page at `app/[locale]/login/page.tsx`

### 4. Chat Interface

- **Message List Component** (`components/chat/MessageList.tsx`):
  - Display messages with user nicknames
  - Show staff badges
  - Auto-scroll to bottom
  - Show translated messages based on user preference
  - Display images inline
- **Message Input Component** (`components/chat/MessageInput.tsx`):
  - Text input with send button
  - Image upload capability
  - Character limit and rate limiting
- **Room Selector** (`components/chat/RoomSelector.tsx`):
  - List of available rooms (General, Machine Issues, Lost & Found, etc.)
  - Show unread counts
  - Staff-only rooms (Support)

### 5. Real-time Messaging

- Set up Supabase Realtime subscription in chat page
- Listen for INSERT events on messages table
- Update UI immediately when new messages arrive
- Handle connection errors and reconnection logic
- Implement optimistic UI updates

### 6. Bilingual UI

- Translate all UI elements using next-intl
- Language toggle in header/navigation
- Store language preference in user profile and localStorage
- Translate system messages, error messages, and notifications
- Create comprehensive translation files for laundromat-specific terms

### 7. Auto-Translation System

- **Language Detection**: Detect language of incoming messages (use OpenAI or simple heuristics)
- **Translation API** (`app/api/translate/route.ts`):
  - Accept message text and target language
  - Check cache in `message_translations` table first
  - If not cached, call OpenAI API for translation
  - Store translation in database
  - Return translated text
- **Client-side Integration**:
  - When displaying messages, check user's language preference
  - If message language ≠ user language, fetch/show translation
  - Show "Original" toggle to view untranslated message

### 8. Staff Features

- **Staff Badge**: Visual indicator for staff members
- **Moderation Tools**:
  - Delete messages
  - Mute users
  - Ban users (device-based)
- **Staff-only Rooms**: Support channel for staff communication
- **Announcements**: Staff can post to announcement room

### 9. Push Notifications

- Set up service worker for web push
- Request notification permission on first visit
- Subscribe to push notifications via Supabase or Firebase Cloud Messaging
- Send notifications for:
  - New messages in user's active room
  - Direct mentions (if implemented)
  - Staff announcements
- Handle notification clicks to navigate to chat

### 10. Additional Features

- **Rate Limiting**: Implement client and server-side rate limits
- **Message Auto-delete**: Background job to delete messages older than X days
- **Image Upload**: Upload to Supabase Storage, display in messages
- **Report Issue Button**: Quick action to post to "Machine Issues" room
- **Lost & Found**: Special room with image upload emphasis

### 11. UI/UX Polish

- Mobile-responsive design (primary use case)
- Loading states and error handling
- Smooth animations for message appearance
- Dark/light mode support (optional)
- Accessible design (keyboard navigation, screen readers)

### 12. Deployment

- Push code to GitHub repository
- Deploy to Vercel
- Configure environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`
- Set up custom domain `laundromat.chat`
- Configure CORS and security headers

## Key Files to Create

1. **`lib/supabase/client.ts`** - Supabase client for browser
2. **`lib/supabase/server.ts`** - Supabase client for server components
3. **`app/[locale]/chat/page.tsx`** - Main chat interface
4. **`components/chat/MessageList.tsx`** - Message display component
5. **`components/chat/MessageInput.tsx`** - Message input with image upload
6. **`app/api/translate/route.ts`** - Translation API endpoint
7. **`messages/en.json`** - English translations
8. **`messages/zh.json`** - Traditional Chinese translations
9. **`supabase/migrations/001_initial_schema.sql`** - Database schema

## Security Considerations

- Implement rate limiting (Supabase Edge Functions or API routes)
- Sanitize user input
- Validate image uploads (type, size)
- Use RLS policies for data access control
- Implement device fingerprinting for anonymous users
- Set up CORS properly
- Use HTTPS only

## Future Enhancements (Post-v1)

- Location gating (geofencing/WiFi verification)
- Machine status integration (IoT APIs)
- AI concierge for FAQs
- Simplified Chinese support
- Message search functionality
# Setup Guide

## Prerequisites

1. Node.js 18+ installed
2. A Supabase account (free tier works)
3. An Azure Translator API key (for translation features) - Free tier: 2M characters/month

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Go to https://supabase.com and create a new project
2. Wait for the project to be fully provisioned
3. Go to SQL Editor in your Supabase dashboard
4. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
5. Run the migration
6. Copy and paste the contents of `supabase/migrations/002_add_nickname_unique.sql`
7. Run the second migration (adds unique nickname constraint)
8. Copy and paste the contents of `supabase/migrations/003_add_spanish_language.sql`
9. Run the third migration (adds Spanish language support)
10. Copy and paste the contents of `supabase/migrations/004_add_spanish_room_names.sql`
11. Run the fourth migration (adds Spanish names to rooms)
12. Copy and paste the contents of `supabase/migrations/005_add_reply_system.sql`
13. Run the fifth migration (adds reply system functionality)
14. Go to Storage and create a new bucket named `images` with public access
15. Go to Database > Replication and enable replication for the `messages` table
16. Go to Settings > API and copy your:
   - Project URL
   - `anon` public key
   - `service_role` key (keep this secret!)

### 3. Set Up Azure Translator (for Translation Feature)

1. Go to https://azure.microsoft.com/en-us/services/cognitive-services/translator/
2. Click "Get started for free" or sign in to Azure Portal
3. Create a Translator resource in Azure Portal:
   - Go to "Create a resource" > "AI + Machine Learning" > "Translator"
   - Choose a subscription and resource group
   - Select the Free tier (F0) - 2 million characters per month free
   - Note your region (e.g., "global", "eastus", "westus")
4. After creation, go to "Keys and Endpoint" in your resource
5. Copy your **Key 1** (this is your `AZURE_TRANSLATOR_KEY`)
6. Note your **Location/Region** (this is your `AZURE_TRANSLATOR_REGION`)

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AZURE_TRANSLATOR_KEY=your-azure-translator-key
AZURE_TRANSLATOR_REGION=global
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
NEXT_PUBLIC_ENABLE_TRANSLATIONS=true
```

**Note**: 
- Set `NEXT_PUBLIC_ENABLE_TRANSLATIONS=false` to disable the auto-translation feature. When disabled, messages will display in their original language only.
- Azure Translator free tier provides 2 million characters per month - perfect for a laundromat chat app!

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Test the Application

1. Navigate to `/en/login` or `/zh/login`
2. Try the anonymous login (easiest to test)
3. Enter a nickname and continue
4. You should see the chat interface with rooms

## Creating Staff Users

To create a staff user, you can either:

1. **Via Supabase Dashboard:**
   - Go to Table Editor > users
   - Find your user record
   - Change the `role` field to `staff` or `admin`

2. **Via SQL:**
   ```sql
   UPDATE users SET role = 'staff' WHERE device_id = 'your-device-id';
   ```

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure your `.env.local` file exists and has all required variables
- Restart your development server after adding environment variables

### "Realtime not working"
- Make sure you enabled replication for the `messages` table in Supabase
- Check that RLS policies allow reading messages

### "Translation not working"
- Verify your Azure Translator API key is correct
- Check that you haven't exceeded the free tier limit (2M characters/month)
- Verify your Azure Translator region is set correctly (default: "global")
- Look at the browser console for error messages

### "Image upload fails"
- Make sure you created the `images` storage bucket in Supabase
- Verify the bucket has public access enabled
- Check file size (max 5MB)

## QR Code Setup

To create the QR code poster for your laundromat:

1. **Generate QR Code URL**: 
   - Production: `https://laundromat.chat/en/qr-login` (or `/zh/qr-login` for Chinese)
   - Development: `http://localhost:3000/en/qr-login`

2. **Create QR Code**:
   - Use any QR code generator (online or app)
   - Input the URL above
   - Print the QR code on a poster

3. **Poster Content** (Bilingual):
   - English: "Scan to join the chat!"
   - Chinese: "掃描加入聊天！"
   - Include the QR code
   - Optional: Add instructions in both languages

4. **How It Works**:
   - Customers scan the QR code
   - New users: Create unique nickname → Join chat
   - Returning users: Auto-login → Join chat instantly

## Next Steps

- Customize the room names and types
- Add your laundromat branding
- Set up push notifications (requires HTTPS)
- Deploy to Vercel for production
- Print and display QR code poster in your laundromat


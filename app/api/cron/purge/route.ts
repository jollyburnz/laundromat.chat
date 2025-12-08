import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Weekly full reset cron job endpoint
 * Deletes ALL messages, ALL user accounts (except staff/admin), and associated images
 * Called automatically by Vercel Cron every Sunday at 3 AM
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (security check)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET environment variable not set');
    return NextResponse.json(
      { error: 'Cron secret not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Step 1: Get ALL messages with images before deletion (full reset)
    const { data: allMessages, error: fetchError } = await supabase
      .from('messages')
      .select('id, image_url');

    if (fetchError) {
      console.error('Error fetching messages:', fetchError);
      throw fetchError;
    }

    let deletedMessagesCount = 0;
    let deletedImagesCount = 0;
    let deletedUsersCount = 0;

    if (allMessages && allMessages.length > 0) {
      // Step 2: Delete images from storage
      const imageUrls = allMessages
        .map((msg) => msg.image_url)
        .filter((url): url is string => Boolean(url));

      if (imageUrls.length > 0) {
        // Extract file paths from URLs
        // Images are stored as: messages/${userId}_${timestamp}.${ext}
        // URL format: https://[project].supabase.co/storage/v1/object/public/images/messages/[filename]
        const imagePaths = imageUrls
          .map((url) => {
            try {
              // Extract path after /images/ (which includes "messages/filename")
              const match = url.match(/\/images\/(.+)$/);
              if (match && match[1]) {
                // Decode the path in case it's URL encoded
                return decodeURIComponent(match[1]);
              }
              return null;
            } catch (error) {
              console.error('Error parsing image URL:', url, error);
              return null;
            }
          })
          .filter((path): path is string => Boolean(path));

        if (imagePaths.length > 0) {
          const { error: storageError, data: deletedFiles } = await supabase.storage
            .from('images')
            .remove(imagePaths);

          if (storageError) {
            console.error('Error deleting images from storage:', storageError);
            // Don't throw - continue with message deletion even if image deletion fails
          } else {
            deletedImagesCount = deletedFiles?.length || imagePaths.length;
          }
        }
      }

      // Step 3: Delete ALL messages (translations will cascade delete)
      const { error: deleteError, count } = await supabase
        .from('messages')
        .delete({ count: 'exact' })
        .neq('id', null); // WHERE id IS NOT NULL (deletes all messages)

      if (deleteError) {
        console.error('Error deleting messages:', deleteError);
        throw deleteError;
      }

      deletedMessagesCount = count || allMessages.length;
    }

    // Step 4: Delete ALL users except staff/admin (full reset)
    const { error: userDeleteError, count: userCount } = await supabase
      .from('users')
      .delete({ count: 'exact' })
      .not('role', 'in', '(staff,admin)');

    if (userDeleteError) {
      console.error('Error deleting users:', userDeleteError);
      // Don't throw - continue even if user deletion fails
    } else {
      deletedUsersCount = userCount || 0;
    }

    return NextResponse.json({
      success: true,
      deletedMessages: deletedMessagesCount,
      deletedImages: deletedImagesCount,
      deletedUsers: deletedUsersCount,
      resetDate: new Date().toISOString(),
      message: 'Full weekly reset completed successfully',
    });
  } catch (error: any) {
    console.error('Purge error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to purge old data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


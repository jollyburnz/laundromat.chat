import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { nickname } = await request.json();

    if (!nickname || nickname.trim().length === 0) {
      return NextResponse.json(
        { available: false, error: 'Nickname is required' },
        { status: 400 }
      );
    }

    // Validate nickname format (3-20 characters, alphanumeric, underscores, hyphens)
    const nicknameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!nicknameRegex.test(nickname)) {
      return NextResponse.json(
        { 
          available: false, 
          error: 'Nickname must be 3-20 characters and contain only letters, numbers, underscores, or hyphens' 
        },
        { status: 400 }
      );
    }

    // Check if nickname exists (case-insensitive)
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .ilike('nickname', nickname.trim())
      .limit(1);

    if (error) {
      console.error('Error checking nickname:', error);
      return NextResponse.json(
        { available: false, error: 'Error checking nickname availability' },
        { status: 500 }
      );
    }

    const available = !data || data.length === 0;

    return NextResponse.json({ available });
  } catch (error: any) {
    console.error('Nickname check error:', error);
    return NextResponse.json(
      { available: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


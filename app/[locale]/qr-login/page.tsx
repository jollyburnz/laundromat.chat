'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import { getVisitorId, getCachedVisitorId } from '@/lib/fingerprint';
import NicknameSetup from '@/components/auth/NicknameSetup';
import DataRetentionNotice from '@/components/ui/DataRetentionNotice';

export default function QRLoginPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const [existingNickname, setExistingNickname] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkExistingUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // checkExistingUser is stable, safe to omit

  const checkExistingUser = async () => {
    try {
      // First check localStorage for user_id (more reliable than device_id)
      const storedUserId = localStorage.getItem('user_id');
      
      if (storedUserId) {
        const { data: user } = await supabase
          .from('users')
          .select('id, nickname, role, language, device_id')
          .eq('id', storedUserId)
          .single();

        if (user) {
          // User found via localStorage - update device_id if it changed
          const currentDeviceId = await getVisitorId();
          if (user.device_id !== currentDeviceId) {
            // Update device_id silently (fire and forget)
            supabase
              .from('users')
              .update({ device_id: currentDeviceId })
              .eq('id', user.id);
          }
          // Auto-login with existing account
          await handleAutoLogin(user);
          return;
        }
        // User ID in localStorage but not in database - clear it
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_nickname');
        localStorage.removeItem('user_role');
      }

      // Fallback: Try cached visitor ID for faster check
      const cachedId = getCachedVisitorId();
      
      if (cachedId) {
        // Quick check with cached ID
        const { data: quickCheck } = await supabase
          .from('users')
          .select('id, nickname, role, language, device_id')
          .eq('device_id', cachedId)
          .single();

        if (quickCheck) {
          // Found user, auto-login immediately
          await handleAutoLogin(quickCheck);
          return;
        }
      }

      // Get full fingerprint (if cached ID didn't work or doesn't exist)
      const deviceId = await getVisitorId();
      
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, nickname, role, language, device_id')
        .eq('device_id', deviceId)
        .single();

      if (existingUser) {
        // Recurring user - auto login
        setIsNewUser(false);
        setExistingNickname(existingUser.nickname);
        await handleAutoLogin(existingUser);
      } else {
        // New user - show nickname setup
        setIsNewUser(true);
      }
    } catch (err) {
      // User doesn't exist, treat as new user
      setIsNewUser(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoLogin = async (userData: { id: string; nickname: string; role: string; language: string | null }) => {
    const language = localStorage.getItem('language') || userData.language || 'en';
    
    // Update language preference if changed (fire and forget - don't wait)
    supabase
      .from('users')
      .update({ language: language })
      .eq('id', userData.id);

    // Store user in localStorage
    localStorage.setItem('user_id', userData.id);
    localStorage.setItem('user_nickname', userData.nickname);
    localStorage.setItem('user_role', userData.role);

    // Redirect to chat immediately
    router.push(`/${language}/chat`);
  };

  const handleNicknameSet = async (nickname: string) => {
    setLoading(true);
    setError(null);

    try {
      const deviceId = await getVisitorId();
      const language = localStorage.getItem('language') || 'en';

      // Create new user with the unique nickname
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          device_id: deviceId,
          nickname: nickname,
          role: 'customer',
          language: language,
        })
        .select()
        .single();

      if (insertError) {
        // Check if it's a unique constraint violation
        if (insertError.code === '23505' || insertError.message.includes('unique')) {
          setError(t('nicknameTaken'));
        } else {
          throw insertError;
        }
        setLoading(false);
        return;
      }

      // Store user in localStorage
      localStorage.setItem('user_id', newUser.id);
      localStorage.setItem('user_nickname', newUser.nickname);
      localStorage.setItem('user_role', newUser.role);

      // Redirect to chat
      router.push(`/${language}/chat`);
    } catch (err: any) {
      setError(err.message || t('nicknameCheckError'));
      setLoading(false);
    }
  };

  if (loading && isNewUser === null) {
    return (
      <div className="min-h-screen bg-laundry-blue-light flex items-center justify-center">
        <div className="text-center">
          <p className="text-black text-lg mb-2">{tCommon('loading')}</p>
          <p className="text-black opacity-60 text-sm">{t('settingUp')}</p>
        </div>
      </div>
    );
  }

  // New user - show nickname setup
  if (isNewUser) {
    return (
      <div className="min-h-screen bg-laundry-blue-light flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 border-2 border-laundry-blue">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-laundry-blue mb-2">{t('welcome')}</h1>
            <p className="text-black text-sm">{t('createNicknamePrompt')}</p>
          </div>
          {error && <p className="text-red-600 text-sm font-medium mb-4">{error}</p>}
          <NicknameSetup onNicknameSet={handleNicknameSet} loading={loading} />
          <DataRetentionNotice variant="footer" />
        </div>
      </div>
    );
  }

  // This shouldn't be reached for recurring users (they auto-redirect)
  // But just in case, show loading
  return (
    <div className="min-h-screen bg-laundry-blue-light flex items-center justify-center">
      <div className="text-center">
        <p className="text-black text-lg">{tCommon('loading')}</p>
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import { getVisitorId, getCachedVisitorId } from '@/lib/fingerprint';
import NicknameSetup from './NicknameSetup';

export default function AnonymousLogin() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null);
  const [existingNickname, setExistingNickname] = useState<string>('');

  useEffect(() => {
    checkExistingUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // checkExistingUser is stable, safe to omit

  const checkExistingUser = async () => {
    try {
      const cachedId = getCachedVisitorId();
      let deviceId = cachedId;

      if (!deviceId) {
        deviceId = await getVisitorId();
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('nickname, id, role')
        .eq('device_id', deviceId)
        .single();

      if (existingUser) {
        setIsNewUser(false);
        setExistingNickname(existingUser.nickname);
      } else {
        setIsNewUser(true);
      }
    } catch (err) {
      // User doesn't exist, treat as new user
      setIsNewUser(true);
    }
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

      window.location.href = `/${locale}/chat`;
    } catch (err: any) {
      setError(err.message || t('nicknameCheckError'));
      setLoading(false);
    }
  };

  const handleExistingUserLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const deviceId = await getVisitorId();
      const language = localStorage.getItem('language') || 'en';

      // Update existing user's language preference
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ language: language })
        .eq('device_id', deviceId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Store user in localStorage
      localStorage.setItem('user_id', updatedUser.id);
      localStorage.setItem('user_nickname', updatedUser.nickname);
      localStorage.setItem('user_role', updatedUser.role);

      window.location.href = `/${locale}/chat`;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (isNewUser === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-black">{tCommon('loading')}</p>
      </div>
    );
  }

  // New user - show nickname setup
  if (isNewUser) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <p className="text-black text-sm">{t('createNicknamePrompt')}</p>
        </div>
        {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
        <NicknameSetup onNicknameSet={handleNicknameSet} loading={loading} />
      </div>
    );
  }

  // Existing user - show welcome back message
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-black font-medium mb-2">
          {t('welcomeBack')} {existingNickname}!
        </p>
        <p className="text-black text-sm opacity-70">{t('continueAsExisting')}</p>
      </div>
      {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
      <button
        onClick={handleExistingUserLogin}
        disabled={loading}
        className="w-full bg-laundry-blue text-white py-3 lg:py-2 rounded-lg hover:bg-laundry-blue-dark active:bg-laundry-blue-dark disabled:opacity-50 font-medium min-h-[44px] text-base lg:text-sm"
      >
        {loading ? '...' : t('anonymousLogin')}
      </button>
    </div>
  );
}


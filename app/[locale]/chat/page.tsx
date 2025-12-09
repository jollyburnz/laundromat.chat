'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import RoomSelector from '@/components/chat/RoomSelector';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import LanguageToggle from '@/components/ui/LanguageToggle';
import ReportIssueButton from '@/components/chat/ReportIssueButton';
import NicknameIndicator from '@/components/ui/NicknameIndicator';
import { getCachedVisitorId } from '@/lib/fingerprint';
import { requestNotificationPermission, registerServiceWorker } from '@/lib/notifications';

export default function ChatPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale(); // Route locale is now the source of truth
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('customer');
  const [userNickname, setUserNickname] = useState<string>('');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    initializeNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // checkAuth and initializeNotifications are stable functions, safe to omit

  const initializeNotifications = async () => {
    const permission = await requestNotificationPermission();
    if (permission) {
      await registerServiceWorker();
    }
  };

  // Sync database with route locale when it changes
  useEffect(() => {
    if (locale && ['en', 'zh', 'es'].includes(locale) && userId) {
      localStorage.setItem('language', locale);
      supabase
        .from('users')
        .update({ language: locale })
        .eq('id', userId);
    }
  }, [locale, userId]); // Route locale is the source of truth

  const checkAuth = async () => {
    try {
      // Check for Supabase auth session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User is authenticated via Supabase Auth
        const { data: userData } = await supabase
          .from('users')
          .select('id, role, language, nickname')
          .eq('id', session.user.id)
          .single();

        if (userData) {
          setUserId(userData.id);
          setUserRole(userData.role || 'customer');
          setUserNickname(userData.nickname || '');
        } else {
          // Create user record if it doesn't exist
          const { data: newUser } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              phone: session.user.phone,
              role: 'customer',
              language: localStorage.getItem('language') || 'en',
            })
            .select()
            .single();

          if (newUser) {
            setUserId(newUser.id);
            setUserRole(newUser.role);
            setUserNickname(newUser.nickname || '');
          }
        }
      } else {
        // Check for anonymous user
        const storedUserId = localStorage.getItem('user_id');
        // Note: deviceId not needed here as we're checking storedUserId

        if (storedUserId) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, role, language, nickname')
            .eq('id', storedUserId)
            .single();

          if (userData) {
            setUserId(userData.id);
            setUserRole(userData.role || 'customer');
            setUserNickname(userData.nickname || '');
          } else {
            // User not found, redirect to login
            router.push('/en/login');
            return;
          }
        } else {
          // No user found, redirect to login
          router.push('/en/login');
          return;
        }
      }

      // Get first room as default
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1);

      if (rooms && rooms.length > 0) {
        setCurrentRoomId(rooms[0].id);
      }
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/en/login');
    } finally {
      setLoading(false);
    }
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_nickname');
    localStorage.removeItem('user_role');
    router.push('/en/login');
  };

  const handleMessageSent = () => {
    // Message sent, could trigger notifications or other actions
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-laundry-blue-light">
        <p className="text-black">{t('common.loading')}</p>
      </div>
    );
  }

  if (!userId || !currentRoomId) {
    return null;
  }

  const handleRoomSelect = (roomId: string) => {
    setCurrentRoomId(roomId);
  };

  return (
    <div className="h-screen-dynamic flex flex-col overflow-hidden">
      <header className="bg-white text-laundry-blue border-b-2 border-laundry-blue px-3 lg:px-4 py-1.5 lg:py-2 flex items-center justify-between shadow-md safe-top">
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Mobile logo */}
          <img
            src="/laundromat.chat.mobile.svg"
            alt="Laundromat Chat"
            className="h-8 w-auto lg:hidden"
          />
          {/* Desktop logo */}
          <img
            src="/laundromat.chat.svg"
            alt="Laundromat Chat"
            className="h-7 w-auto hidden lg:block"
          />
        </div>
        <div className="flex items-center gap-2 lg:gap-3">
          <ReportIssueButton
            userId={userId}
            isStaff={userRole === 'staff' || userRole === 'admin'}
            onIssueReported={handleMessageSent}
            inHeader={true}
          />
          <LanguageToggle inHeader={true} />
          <button
            onClick={handleLogout}
            className="px-3 py-2 text-sm border-2 border-laundry-blue rounded-lg hover:bg-laundry-blue hover:text-white font-medium transition-colors text-laundry-blue min-h-[40px] flex items-center justify-center"
          >
            <span className="hidden sm:inline">{t('common.logout')}</span>
            <span className="sm:hidden text-lg">⏻</span>
          </button>
        </div>
      </header>

      {/* Nickname indicator bar */}
      <div className="bg-laundry-blue-light border-b border-laundry-blue/20 px-4 py-1">
        <NicknameIndicator nickname={userNickname} />
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Room Selector - Always visible, icon-only on mobile */}
        <RoomSelector
          currentRoomId={currentRoomId}
          onRoomSelect={handleRoomSelect}
          userRole={userRole}
        />
        <div className="flex-1 flex flex-col bg-laundry-blue-light min-w-0">
          <MessageList
            roomId={currentRoomId}
            userId={userId}
            userRole={userRole}
          />
          <MessageInput
            roomId={currentRoomId}
            userId={userId}
            isStaff={userRole === 'staff' || userRole === 'admin'}
            onMessageSent={handleMessageSent}
          />
        </div>
      </div>
    </div>
  );
}


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
import { generateDeviceId } from '@/lib/utils';
import { requestNotificationPermission, registerServiceWorker } from '@/lib/notifications';

export default function ChatPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale(); // Route locale is now the source of truth
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('customer');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    initializeNotifications();
  }, []);

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
          .select('id, role, language')
          .eq('id', session.user.id)
          .single();

        if (userData) {
          setUserId(userData.id);
          setUserRole(userData.role || 'customer');
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
          }
        }
      } else {
        // Check for anonymous user
        const storedUserId = localStorage.getItem('user_id');
        const deviceId = generateDeviceId();

        if (storedUserId) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, role, language')
            .eq('id', storedUserId)
            .single();

          if (userData) {
            setUserId(userData.id);
            setUserRole(userData.role || 'customer');
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

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-laundry-blue text-white border-b-2 border-laundry-blue-dark px-4 py-3 flex items-center justify-between shadow-md">
        <h1 className="text-xl font-bold text-white">Laundromat Chat</h1>
        <div className="flex items-center gap-4">
          <ReportIssueButton
            userId={userId}
            isStaff={userRole === 'staff' || userRole === 'admin'}
            onIssueReported={handleMessageSent}
            inHeader={true}
          />
          <LanguageToggle inHeader={true} />
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm border-2 border-white rounded-lg hover:bg-white hover:text-laundry-blue font-medium transition-colors text-white"
          >
            {t('common.logout')}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <RoomSelector
          currentRoomId={currentRoomId}
          onRoomSelect={setCurrentRoomId}
          userRole={userRole}
        />
        <div className="flex-1 flex flex-col bg-laundry-blue-light">
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


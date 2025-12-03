'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import StaffBadge from './StaffBadge';
import ModerationTools from './ModerationTools';
import { detectLanguage } from '@/lib/utils';
import { showNotification } from '@/lib/notifications';
import { useMessageTranslations } from '@/lib/hooks/useMessageTranslations';

interface Message {
  id: string;
  user_id: string;
  room_id: string;
  text: string;
  image_url: string | null;
  language: string | null;
  is_staff: boolean;
  created_at: string;
  user?: {
    nickname: string;
    role: string;
  };
}

interface MessageListProps {
  roomId: string;
  userId: string;
  userRole?: string;
}

export default function MessageList({ roomId, userId, userRole = 'customer' }: MessageListProps) {
  const t = useTranslations();
  const locale = useLocale(); // Get locale directly from route (source of truth)
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use custom hook for translation management
  const {
    translations,
    showOriginal,
    toggleOriginal,
    fetchTranslationForMessage,
    isLoading: translationsLoading,
  } = useMessageTranslations({
    messages,
    locale,
  });

  useEffect(() => {
    if (!roomId) return;
    fetchMessages();
    subscribeToMessages();
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user:users(id, nickname, role)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };


  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Fetch user data for the new message
          const { data: userData } = await supabase
            .from('users')
            .select('nickname, role')
            .eq('id', newMessage.user_id)
            .single();

          const messageWithUser = {
            ...newMessage,
            user: userData || { nickname: 'Unknown', role: 'customer' },
          };

          setMessages(prev => [...prev, messageWithUser]);
          
          // Show notification for new message
          if (newMessage.user_id !== userId) {
            showNotification(
              t('notifications.newMessage'),
              {
                body: newMessage.text.substring(0, 50) + (newMessage.text.length > 50 ? '...' : ''),
                tag: `message-${newMessage.id}`,
              }
            );
          }
          
          // Fetch translation if needed using the hook
          if (newMessage.language && newMessage.language !== locale) {
            fetchTranslationForMessage(newMessage);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };


  const getDisplayText = (msg: Message) => {
    const translationsEnabled = process.env.NEXT_PUBLIC_ENABLE_TRANSLATIONS === 'true';
    
    if (showOriginal[msg.id] || !translationsEnabled) {
      return msg.text;
    }
    if (msg.language && msg.language !== locale && translations[msg.id]) {
      return translations[msg.id];
    }
    return msg.text;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const localeMap: Record<string, string> = {
      'zh': 'zh-TW',
      'es': 'es-ES',
      'en': 'en-US'
    };
    return date.toLocaleTimeString(localeMap[locale] || 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-laundry-blue-light">
        <p className="text-black">{t('common.loading')}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-laundry-blue-light">
        <p className="text-black opacity-60">{t('chat.noMessages')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-laundry-blue-light">
      {messages.map((msg) => {
        const isOwnMessage = msg.user_id === userId;
        const displayText = getDisplayText(msg);
        const translationsEnabled = process.env.NEXT_PUBLIC_ENABLE_TRANSLATIONS === 'true';
        const needsTranslation = translationsEnabled && msg.language && msg.language !== locale;

        return (
          <div
            key={msg.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOwnMessage
                  ? 'bg-laundry-blue text-white'
                  : 'bg-white border-2 border-laundry-blue-light text-black'
              }`}
            >
              {!isOwnMessage && (
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-semibold text-sm ${
                    isOwnMessage ? 'text-white' : 'text-black'
                  }`}>
                    {msg.user?.nickname || 'Unknown'}
                  </span>
                  <StaffBadge isStaff={msg.is_staff} />
                </div>
              )}
              {msg.image_url && (
                <img
                  src={msg.image_url}
                  alt="Message attachment"
                  className="max-w-full h-auto rounded mb-2"
                />
              )}
              {displayText && (
                <p className={`text-sm whitespace-pre-wrap break-words ${
                  isOwnMessage ? 'text-white' : 'text-black'
                }`}>{displayText}</p>
              )}
              {needsTranslation && (
                <button
                  onClick={() => toggleOriginal(msg.id)}
                  className={`text-xs mt-1 opacity-70 hover:opacity-100 underline ${
                    isOwnMessage ? 'text-white' : 'text-laundry-blue'
                  }`}
                >
                  {showOriginal[msg.id] ? t('chat.translate') : t('chat.original')}
                </button>
              )}
              <div className="flex items-center justify-between mt-1">
                <div className={`text-xs opacity-70 ${
                  isOwnMessage ? 'text-white' : 'text-black'
                }`}>
                  {formatTime(msg.created_at)}
                </div>
                {(userRole === 'staff' || userRole === 'admin') && (
                  <ModerationTools
                    messageId={msg.id}
                    userId={userId}
                    isStaff={true}
                    onMessageDeleted={() => {
                      setMessages(prev => prev.filter(m => m.id !== msg.id));
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}


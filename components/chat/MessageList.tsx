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
    const cleanup = subscribeToMessages();
    
    // Properly clean up subscription when roomId changes or component unmounts
    return () => {
      cleanup();
    };
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
          
          // Check if message already exists to prevent duplicates
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) {
              return prev; // Message already exists
            }
            
            // Add message temporarily while we fetch user data
            return [...prev, newMessage];
          });
          
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

          // Update the message with user data
          setMessages(prev => prev.map(m => 
            m.id === newMessage.id ? messageWithUser : m
          ));
          
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
            fetchTranslationForMessage(messageWithUser);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to messages');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error, attempting to resubscribe...');
          // Optionally implement reconnection logic here
        }
      });

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
    <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3 lg:space-y-4 bg-laundry-blue-light">
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
            <div className={`max-w-[85%] sm:max-w-[75%] lg:max-w-lg px-4 py-3 rounded-2xl relative ${
              isOwnMessage
                ? 'bg-laundry-blue text-white ml-12'
                : 'bg-white border border-gray-200 text-black mr-12 shadow-md'
            }`}>

              {/* Translation indicator at top for all messages that need translation */}
              {needsTranslation && (
                <div className="mb-2">
                  <button
                    onClick={() => toggleOriginal(msg.id)}
                    className={`inline-flex items-center gap-1 text-xs ${
                        isOwnMessage
                          ? 'text-white hover:text-white/80'
                          : 'text-laundry-blue hover:text-laundry-blue-dark'
                      } transition-colors`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {showOriginal[msg.id] ? t('chat.translated') : t('chat.showOriginal')}
                  </button>
                </div>
              )}

              {/* User name for received messages */}
              {!isOwnMessage && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-laundry-blue">
                    {msg.user?.nickname || 'Unknown'}
                  </span>
                  <StaffBadge isStaff={msg.is_staff} />
                </div>
              )}

              {/* Message content */}
              <div className="space-y-2">
                {msg.image_url && (
                  <img
                    src={msg.image_url}
                    alt="Message attachment"
                    className="max-w-full h-auto rounded-lg"
                  />
                )}

                {displayText && (
                  <p className={`text-base whitespace-pre-wrap break-words leading-relaxed ${
                    isOwnMessage ? 'text-white' : 'text-black'
                  }`}>
                    {displayText}
                  </p>
                )}
              </div>

              {/* Timestamp */}
              <div className={`text-xs opacity-70 mt-2 text-right ${
                isOwnMessage ? 'text-white/70' : 'text-black/50'
              }`}>
                {formatTime(msg.created_at)}
              </div>

              {/* Moderation tools for staff */}
              {(userRole === 'staff' || userRole === 'admin') && (
                <div className="absolute -top-2 -right-2">
                  <ModerationTools
                    messageId={msg.id}
                    userId={userId}
                    isStaff={true}
                    onMessageDeleted={() => {
                      setMessages(prev => prev.filter(m => m.id !== msg.id));
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}


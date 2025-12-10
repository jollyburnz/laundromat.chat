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
  reply_to_message_id?: string;
  reply_to?: {
    id: string;
    text: string;
    language?: string;
    user: {
      nickname: string;
    };
  };
  user?: {
    nickname: string;
    role: string;
  };
}

interface MessageListProps {
  roomId: string;
  userId: string;
  userRole?: string;
  onReply?: (message: Message) => void;
}

export default function MessageList({ roomId, userId, userRole = 'customer', onReply }: MessageListProps) {
  const t = useTranslations();
  const locale = useLocale(); // Get locale directly from route (source of truth)
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track previous message count for purge detection
  const prevMessageCountRef = useRef<number>(0);

  // Use custom hook for translation management
  const {
    translations,
    showOriginal,
    toggleOriginal,
    fetchTranslationForMessage,
    clearCaches,
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

  // Component-level purge detection
  useEffect(() => {
    const currentCount = messages.length;
    const previousCount = prevMessageCountRef.current;

    // Detect significant message count drop (indicating purge)
    if (previousCount > 0 && currentCount < previousCount - 5) {
      console.log(`Purge detected: messages dropped from ${previousCount} to ${currentCount}`);

      // Force clear all translation caches
      // This will prevent stale browser sessions from making unnecessary API calls
      clearCaches();

      // Optional: Show user notification about data reset
      console.log('Chat data has been reset - all previous messages were cleared');
    }

    // Update previous count
    prevMessageCountRef.current = currentCount;
  }, [messages.length, clearCaches]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToMessage = (messageId: string) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center' // Center the message in the viewport
      });

      // Trigger highlight animation by restarting the CSS animation
      const hasOwnHighlight = messageElement.classList.contains('message-own');
      const hasReceivedHighlight = messageElement.classList.contains('message-received');

      if (hasOwnHighlight) {
        messageElement.classList.add('message-highlight-own');
        setTimeout(() => messageElement.classList.remove('message-highlight-own'), 2000);
      } else if (hasReceivedHighlight) {
        messageElement.classList.add('message-highlight-received');
        setTimeout(() => messageElement.classList.remove('message-highlight-received'), 2000);
      }
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user:users(id, nickname, role),
          reply_to:reply_to_message_id(
            id,
            text,
            language,
            user:users(nickname)
          )
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
            return prev;
          });
          
          // Fetch user data for the new message FIRST
          const { data: userData } = await supabase
            .from('users')
            .select('nickname, role')
            .eq('id', newMessage.user_id)
            .single();

          let messageWithData = {
            ...newMessage,
            user: userData || { nickname: 'Unknown', role: 'customer' },
          };

          // If this is a reply, fetch the reply_to data
          if (newMessage.reply_to_message_id) {
            const { data: replyMessage } = await supabase
              .from('messages')
              .select('id, text, language, user_id')
              .eq('id', newMessage.reply_to_message_id)
              .single();

            if (replyMessage) {
              // Fetch the user for the replied message
              const { data: replyUser } = await supabase
                .from('users')
                .select('nickname')
                .eq('id', replyMessage.user_id)
                .single();

              messageWithData.reply_to = {
                id: replyMessage.id,
                text: replyMessage.text,
                language: replyMessage.language,
                user: replyUser ? { nickname: replyUser.nickname } : { nickname: 'Unknown' }
              };
            }
          }

          // NOW add the complete message with all data and ensure chronological ordering
          setMessages(prev => {
            // Check again to prevent race conditions
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            // Add message and sort chronologically
            return [...prev, messageWithData].sort((a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
          
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
            fetchTranslationForMessage(messageWithData);
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

  const formatDateDivider = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = date.toDateString();
    const todayOnly = today.toDateString();
    const yesterdayOnly = yesterday.toDateString();

    if (dateOnly === todayOnly) {
      return t('common.today');
    } else if (dateOnly === yesterdayOnly) {
      return t('common.yesterday');
    } else {
      // Return full date
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      };

      const localeMap: Record<string, string> = {
        'zh': 'zh-TW',
        'es': 'es-ES',
        'en': 'en-US'
      };

      return date.toLocaleDateString(localeMap[locale] || 'en-US', options);
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];

    messages.forEach(msg => {
      const messageDate = new Date(msg.created_at).toDateString();
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup || lastGroup.date !== messageDate) {
        groups.push({ date: messageDate, messages: [msg] });
      } else {
        lastGroup.messages.push(msg);
      }
    });

    return groups;
  };

  const renderMessage = (msg: Message) => {
    const isOwnMessage = msg.user_id === userId;
    const displayText = getDisplayText(msg);
    const translationsEnabled = process.env.NEXT_PUBLIC_ENABLE_TRANSLATIONS === 'true';
    const needsTranslation = translationsEnabled && msg.language && msg.language !== locale;

    return (
      <div
        key={msg.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} relative mb-2`}
      >
        <div
          className={`max-w-[85%] sm:max-w-[75%] lg:max-w-lg px-4 py-3 rounded-2xl relative ${
            isOwnMessage
              ? 'bg-laundry-blue text-white ml-12 message-own'
              : 'bg-white border border-gray-200 text-black mr-12 shadow-md message-received'
          }`}
          data-message-id={msg.id}
        >

          {/* Header with Translation and Reply indicators */}
          {(needsTranslation || (!isOwnMessage && onReply) || msg.reply_to) && (
            <div className="mb-2 flex items-center gap-3">
              {/* Translation indicator */}
              {needsTranslation && (
                <button
                  onClick={() => toggleOriginal(msg.id)}
                  className={`inline-flex mr-auto items-center gap-1 text-xs ${
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
              )}

              {/* Reply button - consistent with translation button */}
              {!isOwnMessage && onReply && (
                <button
                  onClick={() => onReply(msg)}
                  className={`inline-flex ml-auto items-center gap-1 text-xs transition-colors ${
                      isOwnMessage
                        ? 'text-white hover:text-white/80'
                        : 'text-laundry-blue hover:text-laundry-blue-dark'
                    }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span className="font-medium">{t('chat.reply')}</span>
                </button>
              )}

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
          {/* Embedded original message for replies */}
          {msg.reply_to && (
            <div
              className={`p-3 rounded-lg border-l-3 border-laundry-blue/50 cursor-pointer transition-colors ${
                isOwnMessage
                  ? 'bg-white/10 hover:bg-white/20'
                  : 'bg-laundry-blue-light/30 hover:bg-laundry-blue-light/40'
              }`}
              onClick={() => msg.reply_to && scrollToMessage(msg.reply_to.id)}
            >
              <div className={`text-sm font-medium mb-1 ${
                isOwnMessage ? 'text-white/90' : 'text-laundry-blue'
              }`}>
                {msg.reply_to.user.nickname}
              </div>
              <div className={`text-sm line-clamp-2 break-words ${
                isOwnMessage ? 'text-white/80' : 'text-gray-600'
              }`}>
                {msg.reply_to.text}
              </div>
            </div>
          )}

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

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex-1 overflow-y-auto p-3 lg:p-4 bg-laundry-blue-light">
      {messageGroups.map((group, groupIndex) => (
        <div key={group.date}>
          {/* Date Divider - Visual Option B: Full Width Line */}
          <div className="flex items-center justify-center my-6 lg:my-8">
            <div className="flex items-center w-full max-w-xs">
              <div className="flex-1 h-px bg-gray-300"></div>
              <div className="bg-laundry-blue-light px-3 py-1 rounded-full border border-gray-300">
                <span className="text-xs text-gray-600 font-medium">
                  {formatDateDivider(group.date)}
                </span>
              </div>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>
          </div>

          {/* Messages for this date */}
          <div className="space-y-3 lg:space-y-4">
            {group.messages.map((msg) => renderMessage(msg))}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}


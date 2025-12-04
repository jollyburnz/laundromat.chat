'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import { detectLanguage } from '@/lib/utils';

interface MessageInputProps {
  roomId: string;
  userId: string;
  isStaff: boolean;
  onMessageSent: () => void;
}

export default function MessageInput({ roomId, userId, isStaff, onMessageSent }: MessageInputProps) {
  const t = useTranslations();
  const [isFocused, setIsFocused] = useState(false);
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageTime = useRef<number>(0);
  const MESSAGE_LIMIT = 500;
  const RATE_LIMIT_MS = 2000; // 2 seconds between messages

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(t('errors.uploadFailed'));
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert(t('errors.invalidImage'));
        return;
      }
      setImageFile(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `messages/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() && !imageFile) return;

    // Rate limiting
    const now = Date.now();
    if (now - lastMessageTime.current < RATE_LIMIT_MS) {
      alert(t('errors.rateLimit'));
      return;
    }

    if (message.length > MESSAGE_LIMIT) {
      alert(t('errors.messageTooLong'));
      return;
    }

    setUploading(true);
    lastMessageTime.current = now;

    // Store original message for optimistic update
    const tempMessage = message.trim();
    const tempImageFile = imageFile;

    // Clear input immediately for better UX
    setMessage('');
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      let imageUrl: string | null = null;

      if (tempImageFile) {
        imageUrl = await uploadImage(tempImageFile);
      }

      const language = detectLanguage(tempMessage || '');

      const { error } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          room_id: roomId,
          text: tempMessage || '',
          image_url: imageUrl,
          language: language,
          is_staff: isStaff,
        });

      if (error) throw error;

      // Message will appear via real-time subscription
      onMessageSent();
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Restore message on error
      setMessage(tempMessage);
      setImageFile(tempImageFile);
      alert(error.message || t('errors.networkError'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSend} className="border-t-2 border-laundry-blue-light px-3 py-3 lg:px-4 lg:py-4 bg-white safe-bottom">
      {imageFile && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm lg:text-sm text-black flex-1 truncate">{imageFile.name}</span>
          <button
            type="button"
            onClick={() => {
              setImageFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="text-laundry-blue text-lg lg:text-sm hover:text-laundry-blue-dark font-medium min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex gap-2 lg:gap-2 relative">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className="px-2 py-2 lg:px-4 lg:py-2 border-2 border-laundry-blue-light rounded-lg cursor-pointer hover:bg-laundry-blue-light active:bg-laundry-blue-light text-black min-w-[36px] min-h-[36px] lg:min-w-[44px] lg:min-h-[44px] flex items-center justify-center text-lg lg:text-base"
          title={t('uploadImage')}
        >
          <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </label>
        <textarea
          value={message}
          onChange={e => {
            setMessage(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          placeholder={t('common.enterMessage')}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          className={`flex-1 px-3 py-3 lg:px-4 lg:py-2 ${
            (message.trim() || imageFile) ? 'pr-14' : 'pr-12'
          } lg:pr-20 border-2 border-laundry-blue-light rounded-lg focus:outline-none focus:ring-2 focus:ring-laundry-blue focus:border-laundry-blue text-black text-sm lg:text-sm min-h-[44px] resize-none overflow-hidden`}
          rows={1}
          maxLength={MESSAGE_LIMIT}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={uploading || (!message.trim() && !imageFile)}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => {
            // Small delay to ensure active state is visible before removing
            setTimeout(() => setIsPressed(false), 150);
          }}
          className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-2 lg:px-3 lg:py-1.5 rounded-full shadow-lg font-medium text-base lg:text-xs min-w-[36px] min-h-[36px] lg:min-w-auto lg:min-h-[36px] transition-all duration-200 ${
            message.trim() || imageFile
              ? 'bg-laundry-blue text-white scale-105 shadow-xl'
              : 'bg-gray-300 text-gray-600 scale-95'
          } ${isPressed ? 'bg-laundry-blue-dark text-gray-300' : ''} hover:bg-laundry-blue-dark hover:text-gray-300 active:bg-laundry-blue-dark disabled:opacity-50 disabled:cursor-not-allowed`}
          title={t('common.send')}
        >
          {uploading 
            ? '...'
            : (message.trim() || imageFile ? (
              <>
                <span className="hidden lg:inline">{t('common.send')}</span>
                <svg className="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-4-4l4 4-4 4" />
                </svg>
              </>
            ) : (
              <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-4-4l4 4-4 4" />
              </svg>
            ))
          }
        </button>
      </div>
    </form>
  );
}


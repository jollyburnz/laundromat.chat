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
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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
    <form onSubmit={handleSend} className="border-t-2 border-laundry-blue-light p-4 bg-white">
      {imageFile && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm text-black">{imageFile.name}</span>
          <button
            type="button"
            onClick={() => {
              setImageFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="text-laundry-blue text-sm hover:text-laundry-blue-dark font-medium"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex gap-2">
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
          className="px-4 py-2 border-2 border-laundry-blue-light rounded-lg cursor-pointer hover:bg-laundry-blue-light text-black"
        >
          📷
        </label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('common.enterMessage')}
          className="flex-1 px-4 py-2 border-2 border-laundry-blue-light rounded-lg focus:outline-none focus:ring-2 focus:ring-laundry-blue focus:border-laundry-blue text-black"
          maxLength={MESSAGE_LIMIT}
        />
        <button
          type="submit"
          disabled={uploading || (!message.trim() && !imageFile)}
          className="px-6 py-2 bg-laundry-blue text-white rounded-lg hover:bg-laundry-blue-dark disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {uploading ? '...' : t('common.send')}
        </button>
      </div>
    </form>
  );
}


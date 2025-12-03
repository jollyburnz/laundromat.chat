'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

interface ModerationToolsProps {
  messageId: string;
  userId: string;
  isStaff: boolean;
  onMessageDeleted: () => void;
}

export default function ModerationTools({
  messageId,
  userId,
  isStaff,
  onMessageDeleted,
}: ModerationToolsProps) {
  const t = useTranslations('moderation');
  const [showMenu, setShowMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!isStaff) return null;

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      onMessageDeleted();
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    } finally {
      setConfirming(false);
      setShowMenu(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-black opacity-60 hover:opacity-100 active:opacity-100 text-lg lg:text-sm min-w-[44px] min-h-[44px] lg:min-h-0 flex items-center justify-center"
        aria-label="Moderation menu"
      >
        ⋮
      </button>
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-laundry-blue-light rounded-lg shadow-lg z-20">
            <button
              onClick={handleDelete}
              className="w-full text-left px-4 py-3 lg:py-2 text-red-600 hover:bg-red-50 active:bg-red-50 text-sm font-medium min-h-[44px]"
            >
              {confirming ? t('confirmDelete') : t('deleteMessage')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}


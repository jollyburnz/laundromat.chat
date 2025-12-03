'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import { detectLanguage } from '@/lib/utils';

interface ReportIssueButtonProps {
  userId: string;
  isStaff: boolean;
  onIssueReported: () => void;
  inHeader?: boolean;
}

export default function ReportIssueButton({
  userId,
  isStaff,
  onIssueReported,
  inHeader = false,
}: ReportIssueButtonProps) {
  const t = useTranslations('chat');
  const [showModal, setShowModal] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReport = async () => {
    if (!issueText.trim()) return;

    setSubmitting(true);

    try {
      // Find the machine issues room
      const { data: room } = await supabase
        .from('rooms')
        .select('id')
        .eq('name', 'machine-issues')
        .single();

      if (!room) {
        throw new Error('Machine issues room not found');
      }

      const language = detectLanguage(issueText);

      const { error } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          room_id: room.id,
          text: issueText,
          language: language,
          is_staff: isStaff,
        });

      if (error) throw error;

      setIssueText('');
      setShowModal(false);
      onIssueReported();
    } catch (error: any) {
      console.error('Error reporting issue:', error);
      alert(error.message || 'Failed to report issue');
    } finally {
      setSubmitting(false);
    }
  };

  if (showModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold mb-4 text-black">{t('reportIssue')}</h2>
          <textarea
            value={issueText}
            onChange={(e) => setIssueText(e.target.value)}
            placeholder="Describe the issue..."
            className="w-full px-4 py-2 border-2 border-laundry-blue-light rounded-lg mb-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-laundry-blue focus:border-laundry-blue text-black"
            maxLength={500}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 px-4 py-2 border-2 border-laundry-blue-light rounded-lg hover:bg-laundry-blue-light text-black font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleReport}
              disabled={submitting || !issueText.trim()}
              className="flex-1 px-4 py-2 bg-laundry-blue text-white rounded-lg hover:bg-laundry-blue-dark disabled:opacity-50 font-medium"
            >
              {submitting ? '...' : 'Report'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (inHeader) {
    return (
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-transparent border-2 border-laundry-blue text-laundry-blue rounded-lg hover:bg-laundry-blue hover:text-white text-sm font-medium transition-colors"
      >
        {t('reportIssue')}
      </button>
    );
  }

  return (
    <button
      onClick={() => setShowModal(true)}
      className="px-4 py-2 bg-white border-2 border-laundry-blue text-laundry-blue rounded-lg hover:bg-laundry-blue-light text-sm font-medium"
    >
      {t('reportIssue')}
    </button>
  );
}


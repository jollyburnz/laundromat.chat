'use client';

import { useTranslations } from 'next-intl';

interface DataRetentionNoticeProps {
  variant?: 'footer' | 'full';
}

export default function DataRetentionNotice({ variant = 'footer' }: DataRetentionNoticeProps) {
  const t = useTranslations('dataRetention');

  if (variant === 'footer') {
    return (
      <p className="text-xs text-black opacity-50 text-center px-4 py-2">
        {t('footer')}
      </p>
    );
  }

  return (
    <div className="text-sm text-black opacity-70 space-y-3 p-4 bg-laundry-blue-light rounded-lg border border-laundry-blue-light">
      <h3 className="font-semibold text-base">{t('title')}</h3>
      <p className="text-sm">{t('description')}</p>
      <ul className="list-disc list-inside space-y-1 text-sm">
        <li>{t('includes1')}</li>
        <li>{t('includes2')}</li>
        <li>{t('includes3')}</li>
        <li>{t('includes4')}</li>
      </ul>
      <p className="text-sm font-medium">{t('preserved')}</p>
      <p className="text-sm">{t('purpose')}</p>
      <p className="text-xs opacity-70 border-t border-laundry-blue-light pt-2 mt-2">
        {t('schedule')}
      </p>
      <p className="text-xs opacity-70 italic">
        {t('howToContinue')}
      </p>
    </div>
  );
}


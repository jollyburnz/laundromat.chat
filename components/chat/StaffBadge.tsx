'use client';

import { useTranslations } from 'next-intl';

interface StaffBadgeProps {
  isStaff: boolean;
}

export default function StaffBadge({ isStaff }: StaffBadgeProps) {
  const t = useTranslations('chat');

  if (!isStaff) return null;

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-laundry-blue-dark text-white ml-2 border border-laundry-blue">
      {t('staff')}
    </span>
  );
}


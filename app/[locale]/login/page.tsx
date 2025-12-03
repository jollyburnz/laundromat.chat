'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import PhoneLogin from '@/components/auth/PhoneLogin';
import QRCodeLogin from '@/components/auth/QRCodeLogin';
import AnonymousLogin from '@/components/auth/AnonymousLogin';
import LanguageToggle from '@/components/ui/LanguageToggle';

type LoginMethod = 'phone' | 'qr' | 'anonymous';

export default function LoginPage() {
  const t = useTranslations();
  const [method, setMethod] = useState<LoginMethod>('anonymous');

  return (
    <div className="min-h-screen bg-laundry-blue-light flex items-center justify-center p-4 safe-top safe-bottom">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 lg:p-8 border-2 border-laundry-blue">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl lg:text-2xl font-bold text-laundry-blue">{t('common.welcome')}</h1>
          <LanguageToggle />
        </div>

        <div className="mb-6">
          <div className="flex border-b-2 border-laundry-blue-light">
            <button
              onClick={() => setMethod('phone')}
              className={`flex-1 py-3 lg:py-2 px-2 lg:px-4 text-center min-h-[44px] text-sm lg:text-base ${
                method === 'phone'
                  ? 'border-b-2 border-laundry-blue text-laundry-blue font-medium'
                  : 'text-black hover:text-laundry-blue active:text-laundry-blue'
              }`}
            >
              {t('auth.phoneLogin')}
            </button>
            <button
              onClick={() => setMethod('qr')}
              className={`flex-1 py-3 lg:py-2 px-2 lg:px-4 text-center min-h-[44px] text-sm lg:text-base ${
                method === 'qr'
                  ? 'border-b-2 border-laundry-blue text-laundry-blue font-medium'
                  : 'text-black hover:text-laundry-blue active:text-laundry-blue'
              }`}
            >
              {t('auth.qrCodeLogin')}
            </button>
            <button
              onClick={() => setMethod('anonymous')}
              className={`flex-1 py-3 lg:py-2 px-2 lg:px-4 text-center min-h-[44px] text-sm lg:text-base ${
                method === 'anonymous'
                  ? 'border-b-2 border-laundry-blue text-laundry-blue font-medium'
                  : 'text-black hover:text-laundry-blue active:text-laundry-blue'
              }`}
            >
              {t('auth.anonymousLogin')}
            </button>
          </div>
        </div>

        <div className="mt-6">
          {method === 'phone' && <PhoneLogin />}
          {method === 'qr' && <QRCodeLogin />}
          {method === 'anonymous' && <AnonymousLogin />}
        </div>
      </div>
    </div>
  );
}


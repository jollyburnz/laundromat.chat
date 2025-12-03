'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeLogin() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  useEffect(() => {
    // Generate the QR code URL - this is what should be on the physical poster
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/${locale}/qr-login`;
      setQrCodeUrl(url);
    } else {
      setQrCodeUrl(`https://laundromat.chat/${locale}/qr-login`);
    }
  }, [locale]);

  if (!qrCodeUrl) {
    return (
      <div className="text-center space-y-4">
        <div className="bg-laundry-blue-light p-8 rounded-lg inline-block">
          <div className="w-48 h-48 bg-white border-2 border-dashed border-laundry-blue flex items-center justify-center rounded">
            <span className="text-laundry-blue text-sm">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <div className="bg-laundry-blue-light p-8 rounded-lg inline-block">
        <div className="w-48 h-48 bg-white border-2 border-laundry-blue flex items-center justify-center rounded p-2">
          <QRCodeSVG
            value={qrCodeUrl}
            size={184}
            level="H"
            includeMargin={false}
          />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-black">{t('qrCodeLogin')}</p>
        <p className="text-xs text-black opacity-60">{t('qrCodeInstructions')}</p>
        <p className="text-xs text-black opacity-40 font-mono break-all px-4">
          {qrCodeUrl}
        </p>
      </div>
    </div>
  );
}



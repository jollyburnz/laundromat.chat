'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

export default function PhoneLogin() {
  const t = useTranslations('auth');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
      });

      if (error) throw error;
      setStep('code');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: code,
        type: 'sms',
      });

      if (error) throw error;
      window.location.href = '/en/chat';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'code') {
    return (
      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('enterCode')}
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-3 lg:py-2 border-2 border-laundry-blue-light rounded-lg focus:outline-none focus:ring-2 focus:ring-laundry-blue focus:border-laundry-blue text-black text-base lg:text-sm min-h-[44px]"
            placeholder="123456"
            maxLength={6}
            required
            inputMode="numeric"
          />
        </div>
        {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-laundry-blue text-white py-3 lg:py-2 rounded-lg hover:bg-laundry-blue-dark active:bg-laundry-blue-dark disabled:opacity-50 font-medium min-h-[44px] text-base lg:text-sm"
        >
          {loading ? '...' : t('verify')}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('enterPhone')}
        </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 lg:py-2 border-2 border-laundry-blue-light rounded-lg focus:outline-none focus:ring-2 focus:ring-laundry-blue focus:border-laundry-blue text-black text-base lg:text-sm min-h-[44px]"
            placeholder="+1234567890"
            required
            inputMode="tel"
          />
      </div>
      {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-laundry-blue text-white py-3 lg:py-2 rounded-lg hover:bg-laundry-blue-dark active:bg-laundry-blue-dark disabled:opacity-50 font-medium min-h-[44px] text-base lg:text-sm"
      >
        {loading ? '...' : t('sendCode')}
      </button>
    </form>
  );
}


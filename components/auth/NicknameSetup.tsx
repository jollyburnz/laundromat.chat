'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface NicknameSetupProps {
  onNicknameSet: (nickname: string) => void;
  loading?: boolean;
  initialNickname?: string;
}

export default function NicknameSetup({ onNicknameSet, loading = false, initialNickname = '' }: NicknameSetupProps) {
  const t = useTranslations('auth');
  const [nickname, setNickname] = useState(initialNickname);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Reset state when nickname changes
    if (nickname.trim().length === 0) {
      setAvailable(null);
      setError(null);
      return;
    }

    // Validate format first
    const nicknameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!nicknameRegex.test(nickname.trim())) {
      if (nickname.trim().length < 3) {
        setError(t('nicknameTooShort'));
        setAvailable(false);
      } else if (nickname.trim().length > 20) {
        setError(t('nicknameTooLong'));
        setAvailable(false);
      } else {
        setError(t('nicknameInvalidChars'));
        setAvailable(false);
      }
      return;
    }

    // Debounce API call
    setChecking(true);
    setError(null);
    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/nickname/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname: nickname.trim() }),
        });

        const data = await response.json();

        if (response.ok) {
          setAvailable(data.available);
          if (!data.available) {
            setError(t('nicknameTaken'));
          } else {
            setError(null);
          }
        } else {
          setAvailable(false);
          setError(data.error || t('nicknameCheckError'));
        }
      } catch (err: any) {
        setAvailable(false);
        setError(t('nicknameCheckError'));
      } finally {
        setChecking(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [nickname, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (available && nickname.trim().length >= 3 && nickname.trim().length <= 20) {
      onNicknameSet(nickname.trim());
    }
  };

  const getInputBorderColor = () => {
    if (checking) return 'border-laundry-blue';
    if (available === true) return 'border-green-500';
    if (available === false) return 'border-red-500';
    return 'border-laundry-blue-light';
  };

  const getStatusIcon = () => {
    if (checking) {
      return (
        <span className="text-laundry-blue animate-pulse">⏳</span>
      );
    }
    if (available === true) {
      return (
        <span className="text-green-500">✓</span>
      );
    }
    if (available === false) {
      return (
        <span className="text-red-500">✗</span>
      );
    }
    return null;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2 text-black">
          {t('enterNickname')} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className={`w-full px-4 py-3 lg:py-2 pr-10 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-laundry-blue focus:border-laundry-blue text-black text-base lg:text-sm min-h-[44px] ${getInputBorderColor()}`}
            placeholder={t('nicknamePlaceholder')}
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_-]{3,20}"
            required
            disabled={loading}
            autoComplete="username"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {getStatusIcon()}
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="text-xs text-black opacity-60">
            {t('nicknameRequirements')}
          </div>
          <div className={`text-xs ${nickname.length > 20 ? 'text-red-500' : 'text-black opacity-60'}`}>
            {nickname.length}/20
          </div>
        </div>
        {error && (
          <p className="text-red-600 text-sm font-medium mt-1">{error}</p>
        )}
        {available === true && (
          <p className="text-green-600 text-sm font-medium mt-1">{t('nicknameAvailable')}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={loading || !available || checking || nickname.trim().length < 3}
        className="w-full bg-laundry-blue text-white py-3 lg:py-2 rounded-lg hover:bg-laundry-blue-dark active:bg-laundry-blue-dark disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px] text-base lg:text-sm"
      >
        {loading ? t('creating') : t('continue')}
      </button>
    </form>
  );
}


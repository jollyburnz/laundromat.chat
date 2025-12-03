'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

interface LanguageToggleProps {
  inHeader?: boolean;
}

const languages = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'es', label: 'Español' },
];

export default function LanguageToggle({ inHeader = false }: LanguageToggleProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    
    localStorage.setItem('language', newLocale);
    
    // Replace locale in pathname
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
    router.refresh();
  };

  const baseClasses = "px-3 py-2.5 lg:py-1.5 text-sm rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 cursor-pointer appearance-none min-w-[44px] min-h-[44px] lg:min-h-0";
  
  if (inHeader) {
    return (
      <select
        value={locale}
        onChange={handleLanguageChange}
        className={`${baseClasses} border-2 border-laundry-blue bg-white text-laundry-blue hover:bg-laundry-blue hover:text-white focus:ring-laundry-blue pr-8`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%230066cc' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.5rem center',
          backgroundSize: '1em 1em',
        }}
        aria-label={t('language')}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} style={{ backgroundColor: '#ffffff', color: '#0066cc' }}>
            {lang.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <select
      value={locale}
      onChange={handleLanguageChange}
      className={`${baseClasses} border-2 border-laundry-blue bg-white text-laundry-blue hover:bg-laundry-blue-light focus:ring-laundry-blue pr-8`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%230066cc' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.5rem center',
        backgroundSize: '1em 1em',
      }}
      aria-label={t('language')}
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}


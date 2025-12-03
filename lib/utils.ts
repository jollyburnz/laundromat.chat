import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function detectLanguage(text: string): 'en' | 'zh' | 'es' {
  // Simple heuristic: check for Chinese and Spanish characters
  const chineseRegex = /[\u4e00-\u9fff]/;
  const spanishRegex = /[áéíóúñüÁÉÍÓÚÑÜ]/;
  
  if (chineseRegex.test(text)) return 'zh';
  if (spanishRegex.test(text)) return 'es';
  return 'en';
}

export function generateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}


import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function detectLanguage(text: string): 'en' | 'zh' | 'es' {
  if (!text || text.trim().length === 0) return 'en';
  
  // Check for Chinese characters (most reliable indicator)
  const chineseRegex = /[\u4e00-\u9fff]/;
  if (chineseRegex.test(text)) return 'zh';
  
  // Check for Spanish-specific characters and common Spanish words
  const spanishRegex = /[áéíóúñüÁÉÍÓÚÑÜ]/;
  const spanishWords = /\b(hola|que|de|la|el|en|y|a|es|un|por|con|para|del|los|las|una|más|muy|este|esta|estos|estas|como|pero|o|si|no|también|todo|todos|todas|bien|hasta|desde|hacia|sobre|entre|durante|según|contra|sin|mediante|excepto|además|aunque|mientras|cuando|donde|quien|quienes|cuál|cuales|por qué|porque|así que|por lo tanto|entonces|después|antes|ahora|hoy|mañana|ayer|siempre|nunca|a veces|a menudo|rápidamente|lentamente|mejor|peor|mucho|muchos|muchas|poco|pocos|pocas|algo|nada|alguno|algunos|algunas|ninguno|ningunos|ningunas|otro|otros|otras|mismo|misma|mismos|mismas|tanto|tantos|tantas|demasiado|demasiados|demasiadas|bastante|bastantes|suficiente|suficientes)\b/i;
  
  if (spanishRegex.test(text) || spanishWords.test(text)) return 'es';
  
  // Default to English
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


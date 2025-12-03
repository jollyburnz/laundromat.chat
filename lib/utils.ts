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
  
  // Try localStorage first (most common case)
  let deviceId = localStorage.getItem('device_id');
  
  if (deviceId) {
    return deviceId;
  }
  
  // If not in localStorage, try sessionStorage as fallback
  deviceId = sessionStorage.getItem('device_id');
  
  if (deviceId) {
    // Persist to localStorage for future sessions
    localStorage.setItem('device_id', deviceId);
    return deviceId;
  }
  
  // Generate a new device ID using a combination of:
  // 1. User agent (browser fingerprint)
  // 2. Screen resolution
  // 3. Timezone
  // 4. Random component
  const fingerprint = [
    navigator.userAgent,
    screen.width,
    screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    Date.now(),
    Math.random().toString(36).substring(2, 11)
  ].join('_');
  
  // Create a hash-like ID from the fingerprint
  // Use encodeURIComponent and btoa to safely encode, then clean up
  try {
    const encoded = btoa(encodeURIComponent(fingerprint));
    deviceId = `device_${encoded.replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)}`;
  } catch (e) {
    // Fallback to simple hash if btoa fails
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    deviceId = `device_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
  }
  
  // Store in both localStorage and sessionStorage for redundancy
  try {
    localStorage.setItem('device_id', deviceId);
    sessionStorage.setItem('device_id', deviceId);
  } catch (e) {
    // If storage fails (e.g., private mode), at least return the ID
    console.warn('Could not persist device_id to storage:', e);
  }
  
  return deviceId;
}


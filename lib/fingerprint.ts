import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<any> | null = null;
let cachedVisitorId: string | null = null;

// Initialize FingerprintJS (only once)
function getFingerprintJS() {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  return fpPromise;
}

// Get visitor ID with caching
export async function getVisitorId(): Promise<string> {
  // Return cached ID if available
  if (cachedVisitorId) {
    return cachedVisitorId;
  }

  // Check localStorage first
  if (typeof window !== 'undefined') {
    const storedId = localStorage.getItem('fp_visitor_id');
    if (storedId) {
      cachedVisitorId = storedId;
      return storedId;
    }
  }

  try {
    const fp = await getFingerprintJS();
    const result = await fp.get();
    const visitorId = result.visitorId;

    // Cache in memory and localStorage
    cachedVisitorId = visitorId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('fp_visitor_id', visitorId);
    }

    return visitorId;
  } catch (error) {
    console.error('Error getting fingerprint:', error);
    // Fallback to a simple ID if FingerprintJS fails
    const fallbackId = `fp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('fp_visitor_id', fallbackId);
    }
    return fallbackId;
  }
}

// Get visitor ID synchronously (returns cached or null)
export function getCachedVisitorId(): string | null {
  if (cachedVisitorId) return cachedVisitorId;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('fp_visitor_id');
  }
  return null;
}

// Pre-initialize FingerprintJS in the background
export function preInitializeFingerprintJS() {
  if (typeof window === 'undefined') return;
  
  // Start loading FingerprintJS immediately
  getFingerprintJS().then((fp) => {
    // Optionally get the visitor ID in the background
    fp.get().then((result) => {
      cachedVisitorId = result.visitorId;
      if (typeof window !== 'undefined') {
        localStorage.setItem('fp_visitor_id', result.visitorId);
      }
    }).catch((error) => {
      console.warn('Background fingerprint initialization failed:', error);
    });
  });
}


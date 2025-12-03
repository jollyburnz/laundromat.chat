'use client';

import { useEffect } from 'react';
import { preInitializeFingerprintJS } from '@/lib/fingerprint';

export default function FingerprintInitializer() {
  useEffect(() => {
    // Pre-initialize FingerprintJS when component mounts
    preInitializeFingerprintJS();
  }, []);

  // This component doesn't render anything
  return null;
}


import { useEffect, useState } from 'react';
import { useSettings } from '../state/data';

function systemReduced() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** True when animations should be calm (phone setting or the in-app toggle). */
export function useCalm(): boolean {
  const settings = useSettings();
  const [sys, setSys] = useState(systemReduced);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setSys(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const mode = settings?.motion ?? 'system';
  return mode === 'reduced' || (mode === 'system' && sys);
}

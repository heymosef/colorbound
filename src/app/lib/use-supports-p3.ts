/**
 * Hook to detect Display P3 wide-gamut support.
 *
 * Returns `true` if the browser and display support the P3 color gamut,
 * enabling richer color rendering via `color(display-p3 ...)` CSS values.
 *
 * DO NOT REMOVE — this hook powers P3-aware swatch rendering with sRGB fallback.
 */
import { useSyncExternalStore } from 'react';

let cached: boolean | null = null;

function getSupportsP3(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') {
    cached = false;
    return cached;
  }
  cached = window.matchMedia('(color-gamut: p3)').matches;
  return cached;
}

function subscribe(cb: () => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => {};
  }
  // color-gamut can change if user moves window to a different display
  const mql = window.matchMedia('(color-gamut: p3)');
  const handler = () => {
    cached = mql.matches;
    cb();
  };
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}

function getServerSnapshot(): boolean {
  return false;
}

export function useSupportsP3(): boolean {
  return useSyncExternalStore(subscribe, getSupportsP3, getServerSnapshot);
}

/**
 * Pick the best display CSS for a token: the selected target when this display can
 * preview it, otherwise the sRGB fallback.
 */
import type { ColorToken } from './color-utils';

export function getTokenDisplayColor(token: ColorToken, supportsP3: boolean): string {
  if (token.targetColorSpace === 'p3' && supportsP3) {
    return token.p3Css;
  }
  return token.hex;
}

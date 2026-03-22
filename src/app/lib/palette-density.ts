import type { ColorToken, Palette } from './color-utils';
import { SCALE_STEPS } from './color-utils';

export type PaletteDensity = 5 | 7 | 9 | 11;

export const PALETTE_DENSITY_OPTIONS: PaletteDensity[] = [5, 7, 9, 11];
export const DEFAULT_PALETTE_DENSITY: PaletteDensity = 11;

const CANONICAL_SAMPLE_INDICES_BY_DENSITY: Record<PaletteDensity, readonly number[]> = {
  5: [0, 3, 5, 7, 10],
  7: [0, 2, 3, 5, 7, 8, 10],
  9: [0, 1, 2, 4, 5, 6, 8, 9, 10],
  11: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};

export function isPaletteDensity(value: unknown): value is PaletteDensity {
  return value === 5 || value === 7 || value === 9 || value === 11;
}

export function sanitizePaletteDensity(value: unknown): PaletteDensity {
  return isPaletteDensity(value) ? value : DEFAULT_PALETTE_DENSITY;
}

export function sampleCanonicalScale<T>(
  items: readonly T[],
  density: PaletteDensity,
): T[] {
  if (items.length !== SCALE_STEPS.length) {
    throw new Error(`sampleCanonicalScale expects ${SCALE_STEPS.length} canonical items`);
  }

  return CANONICAL_SAMPLE_INDICES_BY_DENSITY[density].map((index) => items[index]);
}

export function getVisibleCanonicalSteps(density: PaletteDensity): number[] {
  return sampleCanonicalScale(SCALE_STEPS, density);
}

export function getVisiblePaletteTokens(palette: Pick<Palette, 'tokens' | 'density'>): ColorToken[] {
  const visibleSteps = new Set(getVisibleCanonicalSteps(sanitizePaletteDensity(palette.density)));
  return palette.tokens.filter((token) => visibleSteps.has(token.step));
}

export function getPaletteWithVisibleTokens(palette: Palette): Palette {
  return {
    ...palette,
    tokens: getVisiblePaletteTokens(palette),
  };
}

export function getVisibleTokenCount(density: PaletteDensity): number {
  return CANONICAL_SAMPLE_INDICES_BY_DENSITY[sanitizePaletteDensity(density)].length;
}

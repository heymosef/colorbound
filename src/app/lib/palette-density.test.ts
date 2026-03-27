import { describe, expect, it } from 'vitest';
import { SCALE_STEPS, type ColorToken, type Palette } from './color-utils';
import {
  DEFAULT_PALETTE_DENSITY,
  getPaletteWithVisibleTokens,
  getVisibleCanonicalSteps,
  getVisiblePaletteTokens,
  sampleCanonicalScale,
  sanitizePaletteDensity,
} from './palette-density';

function makeToken(step: number): ColorToken {
  return {
    step,
    targetColorSpace: 'srgb',
    authoredOklch: { l: 0.5, c: 0.1, h: 200 },
    srgbOklch: { l: 0.5, c: 0.1, h: 200 },
    p3Oklch: { l: 0.5, c: 0.1, h: 200 },
    targetOklch: { l: 0.5, c: 0.1, h: 200 },
    authoredCss: 'oklch(0.5 0.1 200)',
    srgbCss: 'oklch(0.5 0.1 200)',
    targetCss: 'oklch(0.5 0.1 200)',
    rgb: 'rgb(0, 0, 0)',
    hex: '#000000',
    p3Css: 'color(display-p3 0 0 0)',
    authoredGamut: 'srgb',
    fallbackDiffers: false,
  };
}

function makePalette(density: 5 | 7 | 9 | 11): Palette {
  return {
    id: 'palette-1',
    name: 'Ocean',
    tokens: SCALE_STEPS.map((step) => makeToken(step)),
    hue: 210,
    chroma: 0.12,
    lightness50: 0.985,
    lightness950: 0.025,
    density,
    targetColorSpace: 'srgb',
    generationVersion: 1,
  };
}

describe('palette-density', () => {
  it('returns the expected canonical step mappings', () => {
    expect(getVisibleCanonicalSteps(5)).toEqual([50, 300, 500, 700, 950]);
    expect(getVisibleCanonicalSteps(7)).toEqual([50, 200, 300, 500, 700, 800, 950]);
    expect(getVisibleCanonicalSteps(9)).toEqual([50, 100, 200, 400, 500, 600, 800, 900, 950]);
    expect(getVisibleCanonicalSteps(11)).toEqual(SCALE_STEPS);
  });

  it('samples canonical arrays by the expected indices', () => {
    expect(sampleCanonicalScale(SCALE_STEPS, 5)).toEqual([50, 300, 500, 700, 950]);
    expect(sampleCanonicalScale(SCALE_STEPS, 7)).toEqual([50, 200, 300, 500, 700, 800, 950]);
    expect(sampleCanonicalScale(SCALE_STEPS, 9)).toEqual([50, 100, 200, 400, 500, 600, 800, 900, 950]);
  });

  it('always includes the canonical endpoints', () => {
    for (const density of [5, 7, 9, 11] as const) {
      const steps = getVisibleCanonicalSteps(density);
      expect(steps[0]).toBe(50);
      expect(steps[steps.length - 1]).toBe(950);
    }
  });

  it('returns visible palette tokens using the palette density', () => {
    const palette = makePalette(7);
    expect(getVisiblePaletteTokens(palette).map((token) => token.step)).toEqual([50, 200, 300, 500, 700, 800, 950]);
  });

  it('can clone a palette with only its visible tokens', () => {
    const palette = makePalette(5);
    const visiblePalette = getPaletteWithVisibleTokens(palette);

    expect(visiblePalette.tokens.map((token) => token.step)).toEqual([50, 300, 500, 700, 950]);
    expect(palette.tokens).toHaveLength(11);
  });

  it('sanitizes invalid density values back to the default', () => {
    expect(sanitizePaletteDensity(6)).toBe(DEFAULT_PALETTE_DENSITY);
    expect(sanitizePaletteDensity(undefined)).toBe(DEFAULT_PALETTE_DENSITY);
  });

  it.each([
    [5, 5],
    [7, 7],
    [9, 9],
    [11, 11],
  ] as const)('getVisiblePaletteTokens returns %i tokens for density %i', (density, expectedCount) => {
    const palette = makePalette(density);
    const visible = getVisiblePaletteTokens(palette);
    expect(visible).toHaveLength(expectedCount);
  });
});

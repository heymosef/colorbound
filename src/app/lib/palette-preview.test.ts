import { describe, expect, it } from 'vitest';
import type { Collection } from './collection-types';
import type { Palette, ColorToken } from './color-utils';
import { SCALE_STEPS } from './color-utils';
import {
  getCollectionPreviewColors,
  getRampColors,
  getRampDisplayColors,
  RAMP_SAMPLE_STEPS,
} from './palette-preview';

function makeToken(step: number, hex = '#aabbcc', displayCss = '#ddeeff'): ColorToken {
  return {
    step,
    oklch: { l: 0.5, c: 0.1, h: 200 },
    oklchMapped: { l: 0.5, c: 0.1, h: 200 },
    css: 'oklch(0.500 0.100 200.0)',
    rgb: 'rgb(100,150,200)',
    hex,
    p3Css: 'color(display-p3 0.3922 0.5882 0.7843)',
    gamut: 'srgb',
    displayCss,
  };
}

function makePalette(overrides: Partial<Palette> = {}): Palette {
  return {
    id: overrides.id ?? 'pal-1',
    name: overrides.name ?? 'Blue',
    tokens: overrides.tokens ?? SCALE_STEPS.map((step) => makeToken(step)),
    hue: 220,
    chroma: 0.18,
    lightness50: 0.985,
    lightness950: 0.025,
    ...overrides,
  };
}

function makeCollection(palettes: Palette[]): Collection {
  return {
    id: 'col-1',
    name: 'Collection',
    slug: 'collection',
    createdAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
    palettes,
  };
}

describe('RAMP_SAMPLE_STEPS', () => {
  it('contains exactly 5 steps', () => {
    expect(RAMP_SAMPLE_STEPS).toHaveLength(5);
  });

  it('contains only values present in SCALE_STEPS', () => {
    for (const step of RAMP_SAMPLE_STEPS) {
      expect(SCALE_STEPS).toContain(step);
    }
  });

  it('is ordered from lightest to darkest', () => {
    for (let i = 1; i < RAMP_SAMPLE_STEPS.length; i += 1) {
      expect(RAMP_SAMPLE_STEPS[i]).toBeGreaterThan(RAMP_SAMPLE_STEPS[i - 1]);
    }
  });
});

describe('getRampColors', () => {
  it('returns hex colors for each sample step', () => {
    const tokens = SCALE_STEPS.map((step) =>
      makeToken(step, `#${String(step).padStart(6, '0')}`)
    );

    const result = getRampColors(tokens);

    expect(result).toHaveLength(5);
    expect(result[0]).toBe('#000050');
    expect(result[2]).toBe('#000500');
    expect(result[4]).toBe('#000950');
  });

  it('falls back to #888888 for missing steps', () => {
    const result = getRampColors([
      makeToken(100, '#111111'),
      makeToken(500, '#555555'),
    ]);

    expect(result[0]).toBe('#888888');
    expect(result[2]).toBe('#555555');
  });
});

describe('getRampDisplayColors', () => {
  it('returns display colors for each sample step', () => {
    const tokens = SCALE_STEPS.map((step) =>
      makeToken(step, '#000000', `oklch(${step})`)
    );

    expect(getRampDisplayColors(tokens)).toEqual([
      'oklch(50)',
      'oklch(200)',
      'oklch(500)',
      'oklch(800)',
      'oklch(950)',
    ]);
  });
});

describe('getCollectionPreviewColors', () => {
  it('samples step 500 display colors from each palette up to the limit', () => {
    const collection = makeCollection(
      Array.from({ length: 12 }, (_, index) =>
        makePalette({
          id: `pal-${index}`,
          tokens: SCALE_STEPS.map((step) =>
            makeToken(step, '#000000', step === 500 ? `display-${index}` : `other-${index}-${step}`)
          ),
        })
      ),
    );

    expect(getCollectionPreviewColors(collection, { step: 500, limit: 10 })).toEqual([
      'display-0',
      'display-1',
      'display-2',
      'display-3',
      'display-4',
      'display-5',
      'display-6',
      'display-7',
      'display-8',
      'display-9',
    ]);
  });

  it('skips palettes that do not include the requested step', () => {
    const collection = makeCollection([
      makePalette({
        id: 'has-step',
        tokens: SCALE_STEPS.map((step) => makeToken(step, '#000000', `color-${step}`)),
      }),
      makePalette({
        id: 'missing-step',
        tokens: SCALE_STEPS.filter((step) => step !== 500).map((step) =>
          makeToken(step, '#000000', `other-${step}`)
        ),
      }),
    ]);

    expect(getCollectionPreviewColors(collection, { step: 500, limit: 10 })).toEqual([
      'color-500',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  CANONICAL_SHARE_FIELDS,
  DUPLICATE_PALETTE_NAME_MESSAGE,
  hasDuplicatePaletteNames,
  normalizePaletteEntry,
  sanitizePaletteEntry,
  SHARE_SCHEMA_VERSION,
} from './share-contract';

describe('share-contract', () => {
  it('accepts the canonical payload without group or isNeutral', () => {
    expect(normalizePaletteEntry({
      name: 'Ocean',
      hue: 210,
      chroma: 0.12,
      lightness50: 0.985,
      lightness950: 0.025,
    })).toEqual({
      name: 'Ocean',
      hue: 210,
      chroma50: 0.12,
      chroma: 0.12,
      chroma950: 0.12,
      lightCurve: 0,
      darkCurve: 0,
      lightness50: 0.985,
      lightness950: 0.025,
      density: 11,
      targetColorSpace: 'srgb',
      generationVersion: 6,
    });
  });

  it('still accepts legacy blackRange and whiteRange payloads', () => {
    const result = normalizePaletteEntry({
      name: 'Legacy',
      hue: 200,
      chroma: 0.15,
      blackRange: 0.85,
      whiteRange: 0.9,
    });

    expect(result).toMatchObject({
      name: 'Legacy',
      hue: 200,
      chroma: 0.15,
    });
    expect(result?.lightness50).toBeCloseTo(0.985, 3);
    expect(result?.lightness950).toBeCloseTo(0.0225, 3);
    expect(result?.lightCurve).toBe(0);
    expect(result?.darkCurve).toBe(0);
  });

  it('normalizes the legacy auto-seeded bias pair to neutral curves', () => {
    expect(normalizePaletteEntry({
      name: 'Legacy',
      hue: 200,
      chroma: 0.15,
      lightBias: 0.2,
      darkBias: 0.35,
      lightness50: 0.985,
      lightness950: 0.025,
    })).toEqual({
      name: 'Legacy',
      hue: 200,
      chroma50: 0.15,
      chroma: 0.15,
      chroma950: 0.15,
      lightCurve: 0,
      darkCurve: 0,
      lightness50: 0.985,
      lightness950: 0.025,
      density: 11,
      targetColorSpace: 'srgb',
      generationVersion: 6,
    });
  });

  it('inverts v5 explicit curves when the midpoint is the more saturated anchor', () => {
    expect(normalizePaletteEntry({
      name: 'Legacy Curves',
      hue: 200,
      chroma: 0.15,
      chroma50: 0.04,
      chroma950: 0.04,
      lightCurve: 0.75,
      darkCurve: -0.5,
      lightness50: 0.985,
      lightness950: 0.025,
      generationVersion: 5,
    })).toEqual({
      name: 'Legacy Curves',
      hue: 200,
      chroma50: 0.04,
      chroma: 0.15,
      chroma950: 0.04,
      lightCurve: -0.75,
      darkCurve: -0.5,
      lightness50: 0.985,
      lightness950: 0.025,
      density: 11,
      targetColorSpace: 'srgb',
      generationVersion: 6,
    });
  });

  it('does not require removed legacy metadata fields', () => {
    expect(normalizePaletteEntry({
      name: 'Ocean',
      hue: 210,
      chroma: 0.12,
      lightness50: 0.985,
      lightness950: 0.025,
      group: 'Custom',
    })).not.toBeNull();
  });

  it('sanitizes names to the supported maximum', () => {
    const sanitized = sanitizePaletteEntry({
      name: 'A'.repeat(120),
      hue: 210,
      chroma50: 0.12,
      chroma: 0.12,
      chroma950: 0.12,
      lightCurve: 0,
      darkCurve: 0,
      lightness50: 0.985,
      lightness950: 0.025,
      density: 11,
      targetColorSpace: 'srgb',
      generationVersion: 6,
    });

    expect(sanitized.name).toHaveLength(100);
  });

  it('exports the current schema contract metadata', () => {
    expect(SHARE_SCHEMA_VERSION).toBe(9);
    expect(CANONICAL_SHARE_FIELDS).toEqual([
      'name',
      'hue',
      'chroma50',
      'chroma',
      'chroma950',
      'lightCurve',
      'darkCurve',
      'lightness50',
      'lightness950',
      'density',
      'targetColorSpace',
      'generationVersion',
    ]);
  });

  it('detects duplicate collection palette names using normalized comparison', () => {
    expect(hasDuplicatePaletteNames([
      { name: 'Ocean' },
      { name: '  ocean ' },
    ])).toBe(true);
    expect(DUPLICATE_PALETTE_NAME_MESSAGE).toBe(
      'A palette with this name already exists in this collection.',
    );
  });
});

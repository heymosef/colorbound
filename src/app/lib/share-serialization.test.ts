import { describe, it, expect } from 'vitest';
import {
  serializePaletteConfig,
  deserializePaletteConfig,
  deserializePaletteEntry,
  serializeCollection,
  deserializeCollection,
  configToPalette,
  configToDarkPalette,
} from './share-serialization';
import type { PaletteConfig } from './palette-context-types';
import type { SharedPaletteEntry } from './share-api';
import { GENERATION_VERSION } from './color-utils';

const VALID_CONFIG: PaletteConfig = {
  name: 'Ocean Blue',
  hue: 220,
  chroma: 0.18,
  lightness50: 0.985,
  lightness950: 0.025,
  targetColorSpace: 'srgb',
  generationVersion: GENERATION_VERSION,
};

const VALID_ENTRY: SharedPaletteEntry = {
  ...VALID_CONFIG,
};

describe('serializePaletteConfig', () => {
  it('serializes a valid config without changing canonical fields', () => {
    const result = serializePaletteConfig(VALID_CONFIG);
    expect(result).toEqual(VALID_ENTRY);
  });

  it('does not emit removed group or isNeutral fields', () => {
    const result = serializePaletteConfig(VALID_CONFIG);
    expect(result).not.toHaveProperty('group');
    expect(result).not.toHaveProperty('isNeutral');
  });

  it('clamps chroma to 0.4 max', () => {
    const result = serializePaletteConfig({ ...VALID_CONFIG, chroma: 0.6 });
    expect(result.chroma).toBe(0.4);
  });

  it('clamps hue to 0-360 range', () => {
    expect(serializePaletteConfig({ ...VALID_CONFIG, hue: -10 }).hue).toBe(0);
    expect(serializePaletteConfig({ ...VALID_CONFIG, hue: 400 }).hue).toBe(360);
  });

  it('truncates name to 100 chars', () => {
    const result = serializePaletteConfig({ ...VALID_CONFIG, name: 'A'.repeat(200) });
    expect(result.name).toHaveLength(100);
  });
});

describe('deserializePaletteConfig', () => {
  it('round-trips a valid config', () => {
    const serialized = serializePaletteConfig(VALID_CONFIG);
    expect(deserializePaletteConfig(serialized)).toEqual(VALID_CONFIG);
  });

  it('returns null for null, non-object, or empty input', () => {
    expect(deserializePaletteConfig(null)).toBeNull();
    expect(deserializePaletteConfig('hello')).toBeNull();
    expect(deserializePaletteConfig(42)).toBeNull();
    expect(deserializePaletteConfig({})).toBeNull();
  });

  it('applies defaults for missing fields', () => {
    const result = deserializePaletteConfig({ hue: 120 });
    expect(result).toEqual({
      name: 'Untitled',
      hue: 120,
      chroma: 0.18,
      lightness50: 0.985,
      lightness950: 0.025,
      targetColorSpace: 'srgb',
      generationVersion: GENERATION_VERSION,
    });
  });

  it('handles legacy blackRange/whiteRange fields', () => {
    const result = deserializePaletteConfig({
      hue: 200,
      chroma: 0.15,
      blackRange: 0.85,
      whiteRange: 0.9,
      name: 'Legacy',
    });
    expect(result).not.toBeNull();
    expect(result!.lightness50).toBeCloseTo(0.985, 3);
    expect(result!.lightness950).toBeCloseTo(0.0225, 3);
  });

  it('clamps out-of-range lightness values', () => {
    const result = deserializePaletteConfig({
      hue: 100,
      lightness50: 2,
      lightness950: -1,
      name: 'Test',
    });
    expect(result).toEqual({
      name: 'Test',
      hue: 100,
      chroma: 0.18,
      lightness50: 1,
      lightness950: 0,
      targetColorSpace: 'srgb',
      generationVersion: GENERATION_VERSION,
    });
  });

  it('defaults invalid numeric values', () => {
    const result = deserializePaletteConfig({
      hue: NaN,
      chroma: true as unknown,
      name: 'Test',
    });
    expect(result).toEqual({
      name: 'Test',
      hue: 240,
      chroma: 0.18,
      lightness50: 0.985,
      lightness950: 0.025,
      targetColorSpace: 'srgb',
      generationVersion: GENERATION_VERSION,
    });
  });

  it('preserves Display P3 as the target color space', () => {
    const result = deserializePaletteConfig({
      ...VALID_ENTRY,
      targetColorSpace: 'p3',
    });

    expect(result).toEqual({
      ...VALID_CONFIG,
      targetColorSpace: 'p3',
      generationVersion: GENERATION_VERSION,
    });
  });
});

describe('deserializePaletteEntry', () => {
  it('returns a config for a valid shared entry', () => {
    expect(deserializePaletteEntry(VALID_ENTRY)).toEqual(VALID_CONFIG);
  });

  it('returns null for invalid input', () => {
    expect(deserializePaletteEntry(null)).toBeNull();
    expect(deserializePaletteEntry({})).toBeNull();
  });
});

describe('serializeCollection', () => {
  it('serializes an array of palette configs', () => {
    const result = serializeCollection([VALID_CONFIG], 'My Palettes');
    expect(result.name).toBe('My Palettes');
    expect(result.palettes).toEqual([VALID_ENTRY]);
  });

  it('defaults the collection name', () => {
    const result = serializeCollection([VALID_CONFIG]);
    expect(result.name).toBe('My Collection');
  });
});

describe('deserializeCollection', () => {
  it('round-trips a collection', () => {
    const serialized = serializeCollection(
      [
        VALID_CONFIG,
        { ...VALID_CONFIG, hue: 0, name: 'Red' },
      ],
      'Test Collection',
    );
    const deserialized = deserializeCollection(serialized);
    expect(deserialized).toEqual({
      name: 'Test Collection',
      entries: [
        VALID_CONFIG,
        { ...VALID_CONFIG, hue: 0, name: 'Red' },
      ],
    });
  });

  it('returns null for missing or empty palette arrays', () => {
    expect(deserializeCollection({ name: 'Test' })).toBeNull();
    expect(deserializeCollection({ palettes: [] })).toBeNull();
  });

  it('filters out invalid entries and keeps valid ones', () => {
    const result = deserializeCollection({
      name: 'Mixed',
      palettes: [
        VALID_ENTRY,
        null,
        {},
        { hue: 100, name: 'Partial' },
      ],
    });
    expect(result).toEqual({
      name: 'Mixed',
      entries: [
        VALID_CONFIG,
        {
          name: 'Partial',
          hue: 100,
          chroma: 0.18,
          lightness50: 0.985,
          lightness950: 0.025,
          targetColorSpace: 'srgb',
          generationVersion: GENERATION_VERSION,
        },
      ],
    });
  });

  it('preserves entry order', () => {
    const result = deserializeCollection({
      palettes: [
        { ...VALID_ENTRY, name: 'A' },
        { ...VALID_ENTRY, name: 'B' },
        { ...VALID_ENTRY, name: 'C' },
      ],
    });
    expect(result!.entries.map((entry) => entry.name)).toEqual(['A', 'B', 'C']);
  });
});

describe('configToPalette', () => {
  it('builds a palette with 11 tokens and no group field', () => {
    const palette = configToPalette(VALID_CONFIG, 'test-id');
    expect(palette.id).toBe('test-id');
    expect(palette.name).toBe('Ocean Blue');
    expect(palette.tokens).toHaveLength(11);
    expect(palette.hue).toBe(220);
    expect(palette).not.toHaveProperty('group');
    expect(palette).not.toHaveProperty('isNeutral');
  });
});

describe('configToDarkPalette', () => {
  it('builds a dark palette with 11 tokens', () => {
    const palette = configToDarkPalette(VALID_CONFIG, 'dark-id');
    expect(palette.id).toBe('dark-id');
    expect(palette.tokens).toHaveLength(11);
  });
});

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

// ─── Test data ───

const VALID_CONFIG: PaletteConfig = {
  name: 'Ocean Blue',
  hue: 220,
  chroma: 0.18,
  lightness50: 0.985,
  lightness950: 0.025,
  isNeutral: false,
};

const VALID_ENTRY: SharedPaletteEntry = {
  ...VALID_CONFIG,
  group: 'Primary',
};

// ─── serializePaletteConfig ───

describe('serializePaletteConfig', () => {
  it('serializes a valid config without changes', () => {
    const result = serializePaletteConfig(VALID_CONFIG, 'Primary');
    expect(result.name).toBe('Ocean Blue');
    expect(result.group).toBe('Primary');
    expect(result.hue).toBe(220);
    expect(result.chroma).toBe(0.18);
    expect(result.lightness50).toBe(0.985);
    expect(result.lightness950).toBe(0.025);
    expect(result.isNeutral).toBe(false);
  });

  it('clamps chroma to 0.4 max', () => {
    const result = serializePaletteConfig({ ...VALID_CONFIG, chroma: 0.6 });
    expect(result.chroma).toBe(0.4);
  });

  it('clamps hue to 0–360 range', () => {
    expect(serializePaletteConfig({ ...VALID_CONFIG, hue: -10 }).hue).toBe(0);
    expect(serializePaletteConfig({ ...VALID_CONFIG, hue: 400 }).hue).toBe(360);
  });

  it('truncates name to 100 chars', () => {
    const longName = 'A'.repeat(200);
    const result = serializePaletteConfig({ ...VALID_CONFIG, name: longName });
    expect(result.name).toHaveLength(100);
  });

  it('defaults group based on isNeutral when not provided', () => {
    const result = serializePaletteConfig(VALID_CONFIG);
    expect(result.group).toBe('Custom');

    const neutral = serializePaletteConfig({ ...VALID_CONFIG, isNeutral: true });
    expect(neutral.group).toBe('Neutral');
  });
});

// ─── deserializePaletteConfig ───

describe('deserializePaletteConfig', () => {
  it('round-trips a valid config', () => {
    const serialized = serializePaletteConfig(VALID_CONFIG, 'Primary');
    const deserialized = deserializePaletteConfig(serialized);
    expect(deserialized).not.toBeNull();
    expect(deserialized!.name).toBe(VALID_CONFIG.name);
    expect(deserialized!.hue).toBe(VALID_CONFIG.hue);
    expect(deserialized!.chroma).toBe(VALID_CONFIG.chroma);
    expect(deserialized!.lightness50).toBe(VALID_CONFIG.lightness50);
    expect(deserialized!.lightness950).toBe(VALID_CONFIG.lightness950);
    expect(deserialized!.isNeutral).toBe(VALID_CONFIG.isNeutral);
  });

  it('returns null for null input', () => {
    expect(deserializePaletteConfig(null)).toBeNull();
  });

  it('returns null for non-object', () => {
    expect(deserializePaletteConfig('hello')).toBeNull();
    expect(deserializePaletteConfig(42)).toBeNull();
  });

  it('returns null for empty object', () => {
    expect(deserializePaletteConfig({})).toBeNull();
  });

  it('applies defaults for missing fields', () => {
    const result = deserializePaletteConfig({ hue: 120 });
    expect(result).not.toBeNull();
    expect(result!.hue).toBe(120);
    expect(result!.name).toBe('Untitled');
    expect(result!.chroma).toBe(0.18);
    expect(result!.lightness50).toBe(0.985);
    expect(result!.lightness950).toBe(0.025);
    expect(result!.isNeutral).toBe(false);
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
    expect(result).not.toBeNull();
    expect(result!.lightness50).toBe(1);
    expect(result!.lightness950).toBe(0);
  });

  it('defaults NaN values', () => {
    const result = deserializePaletteConfig({
      hue: NaN,
      chroma: NaN,
      name: 'Test',
    });
    expect(result).not.toBeNull();
    expect(result!.hue).toBe(240); // default
    expect(result!.chroma).toBe(0.18); // default
  });

  it('defaults string-where-number-expected', () => {
    const result = deserializePaletteConfig({
      hue: 'not a number' as unknown,
      chroma: true as unknown,
      name: 'Test',
    });
    expect(result).not.toBeNull();
    expect(result!.hue).toBe(240);
    expect(result!.chroma).toBe(0.18);
  });

  it('defaults non-boolean isNeutral', () => {
    const result = deserializePaletteConfig({
      hue: 100,
      isNeutral: 'yes' as unknown,
    });
    expect(result).not.toBeNull();
    expect(result!.isNeutral).toBe(false);
  });
});

// ─── deserializePaletteEntry ───

describe('deserializePaletteEntry', () => {
  it('extracts config and group from a valid entry', () => {
    const result = deserializePaletteEntry(VALID_ENTRY);
    expect(result).not.toBeNull();
    expect(result!.config.name).toBe('Ocean Blue');
    expect(result!.group).toBe('Primary');
  });

  it('defaults group based on isNeutral', () => {
    const result = deserializePaletteEntry({ ...VALID_ENTRY, group: undefined as any });
    expect(result).not.toBeNull();
    expect(result!.group).toBe('Custom');

    const neutral = deserializePaletteEntry({ ...VALID_ENTRY, isNeutral: true, group: undefined as any });
    expect(neutral).not.toBeNull();
    expect(neutral!.group).toBe('Neutral');
  });

  it('returns null for invalid input', () => {
    expect(deserializePaletteEntry(null)).toBeNull();
    expect(deserializePaletteEntry({})).toBeNull();
  });
});

// ─── serializeCollection ───

describe('serializeCollection', () => {
  it('serializes an array of palette configs', () => {
    const result = serializeCollection(
      [{ config: VALID_CONFIG, group: 'Primary' }],
      'My Palettes',
    );
    expect(result.name).toBe('My Palettes');
    expect(result.palettes).toHaveLength(1);
    expect(result.palettes[0].name).toBe('Ocean Blue');
  });

  it('defaults collection name', () => {
    const result = serializeCollection([{ config: VALID_CONFIG }]);
    expect(result.name).toBe('My Collection');
  });
});

// ─── deserializeCollection ───

describe('deserializeCollection', () => {
  it('round-trips a collection', () => {
    const serialized = serializeCollection(
      [
        { config: VALID_CONFIG, group: 'Primary' },
        { config: { ...VALID_CONFIG, hue: 0, name: 'Red' }, group: 'Danger' },
      ],
      'Test Collection',
    );
    const deserialized = deserializeCollection(serialized);
    expect(deserialized).not.toBeNull();
    expect(deserialized!.name).toBe('Test Collection');
    expect(deserialized!.entries).toHaveLength(2);
    expect(deserialized!.entries[0].config.name).toBe('Ocean Blue');
    expect(deserialized!.entries[1].config.name).toBe('Red');
  });

  it('returns null for missing palettes array', () => {
    expect(deserializeCollection({ name: 'Test' })).toBeNull();
  });

  it('returns null for empty palettes array', () => {
    expect(deserializeCollection({ palettes: [] })).toBeNull();
  });

  it('filters out invalid entries, keeps valid ones', () => {
    const result = deserializeCollection({
      name: 'Mixed',
      palettes: [
        VALID_ENTRY,
        null, // invalid
        {}, // invalid (no recognized fields)
        { hue: 100, name: 'Partial' }, // valid with defaults
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(2);
    expect(result!.entries[0].config.name).toBe('Ocean Blue');
    expect(result!.entries[1].config.name).toBe('Partial');
  });

  it('returns null when all entries are invalid', () => {
    expect(deserializeCollection({
      name: 'Bad',
      palettes: [null, undefined, 42, {}],
    })).toBeNull();
  });

  it('preserves entry order', () => {
    const result = deserializeCollection({
      palettes: [
        { ...VALID_ENTRY, name: 'A' },
        { ...VALID_ENTRY, name: 'B' },
        { ...VALID_ENTRY, name: 'C' },
      ],
    });
    expect(result!.entries.map((e) => e.config.name)).toEqual(['A', 'B', 'C']);
  });
});

// ─── configToPalette / configToDarkPalette ───

describe('configToPalette', () => {
  it('builds a palette with 11 tokens', () => {
    const palette = configToPalette(VALID_CONFIG, 'test-id', 'Primary');
    expect(palette.id).toBe('test-id');
    expect(palette.name).toBe('Ocean Blue');
    expect(palette.group).toBe('Primary');
    expect(palette.tokens).toHaveLength(11);
    expect(palette.hue).toBe(220);
  });

  it('defaults group from isNeutral when not provided', () => {
    expect(configToPalette(VALID_CONFIG, 'id').group).toBe('Custom');
    expect(configToPalette({ ...VALID_CONFIG, isNeutral: true }, 'id').group).toBe('Neutral');
  });
});

describe('configToDarkPalette', () => {
  it('builds a dark palette with 11 tokens', () => {
    const palette = configToDarkPalette(VALID_CONFIG, 'dark-id');
    expect(palette.id).toBe('dark-id');
    expect(palette.tokens).toHaveLength(11);
  });
});

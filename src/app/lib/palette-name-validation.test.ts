import { describe, expect, it } from 'vitest';
import {
  buildPaletteNameIndex,
  getPaletteNameKey,
  normalizePaletteName,
  partitionPalettesByUniqueName,
  validatePaletteName,
} from './palette-name-validation';

const palettes = [
  { id: 'palette-1', name: 'Ocean Blue' },
  { id: 'palette-2', name: 'Slate' },
];

describe('palette-name-validation', () => {
  it('normalizes palette names for display and uniqueness', () => {
    expect(normalizePaletteName('  Ocean   Blue  ')).toBe('Ocean Blue');
    expect(getPaletteNameKey('  Ocean   Blue  ')).toBe('ocean blue');
  });

  it('rejects case-insensitive duplicate names', () => {
    const index = buildPaletteNameIndex(palettes);
    expect(validatePaletteName('  ocean blue ', palettes, { index })).toMatchObject({
      valid: false,
      error: 'duplicate',
    });
  });

  it('allows renaming a palette to its current normalized name', () => {
    const index = buildPaletteNameIndex(palettes);
    expect(
      validatePaletteName(' ocean   blue ', palettes, {
        excludePaletteId: 'palette-1',
        index,
      }),
    ).toMatchObject({
      valid: true,
      normalizedName: 'ocean blue',
    });
  });

  it('partitions later duplicates into conflicted palettes', () => {
    const partitioned = partitionPalettesByUniqueName([
      { id: 'a', name: 'Ocean' },
      { id: 'b', name: '  ocean ' },
      { id: 'c', name: 'Slate' },
      { id: 'd', name: 'Slate' },
    ]);

    expect(partitioned.activePalettes.map((palette) => palette.id)).toEqual(['a', 'c']);
    expect(partitioned.conflictedPalettes.map((palette) => palette.id)).toEqual(['b', 'd']);
  });
});

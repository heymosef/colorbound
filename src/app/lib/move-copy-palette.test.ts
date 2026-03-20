import { describe, it, expect, beforeEach } from 'vitest';
import { generatePalette, generateId, type Palette } from './color-utils';
import type { Collection } from './collection-types';
import {
  copyPaletteToCollection,
  findPaletteLocation,
  movePaletteBetweenCollections,
} from './collection-operations';

function makePalette(name: string, hue = 200): Palette {
  const tokens = generatePalette(hue, 0.18, 0.985, 0.025);
  return {
    id: generateId(),
    name,
    tokens,
    hue,
    chroma: 0.18,
    lightness50: 0.985,
    lightness950: 0.025,
  };
}

function makeCollection(name: string, palettes: Palette[] = []): Collection {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    createdAt: now,
    lastModifiedAt: now,
    palettes,
    conflictedPalettes: [],
  };
}

describe('findPaletteLocation', () => {
  it('finds a palette across collections', () => {
    const palette = makePalette('Blue');
    const collections = [makeCollection('A'), makeCollection('B', [palette])];

    const result = findPaletteLocation(collections, palette.id);

    expect(result).not.toBeNull();
    expect(result?.collection.name).toBe('B');
    expect(result?.collectionSlug).toBe('b');
    expect(result?.palette.name).toBe('Blue');
  });

  it('returns null when the palette does not exist', () => {
    const result = findPaletteLocation([makeCollection('A')], 'missing');
    expect(result).toBeNull();
  });
});

describe('movePaletteBetweenCollections', () => {
  let collA: Collection;
  let collB: Collection;
  let palette1: Palette;
  let palette2: Palette;

  beforeEach(() => {
    palette1 = makePalette('Blue');
    palette2 = makePalette('Red', 0);
    collA = makeCollection('Collection A', [palette1, palette2]);
    collB = makeCollection('Collection B', []);
  });

  it('removes the palette from the source collection and adds it to the target collection', () => {
    const result = movePaletteBetweenCollections([collA, collB], collA.id, palette1.id, collB.id);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sourceAfter = result.collections.find((collection) => collection.id === collA.id)!;
    const targetAfter = result.collections.find((collection) => collection.id === collB.id)!;

    expect(sourceAfter.palettes).toHaveLength(1);
    expect(sourceAfter.palettes[0].id).toBe(palette2.id);
    expect(targetAfter.palettes).toHaveLength(1);
    expect(targetAfter.palettes[0].id).toBe(palette1.id);
    expect(result.targetCollectionSlug).toBe(collB.slug);
  });

  it('preserves the moved palette data', () => {
    const result = movePaletteBetweenCollections([collA, collB], collA.id, palette1.id, collB.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.palette.hue).toBe(palette1.hue);
    expect(result.palette.chroma).toBe(palette1.chroma);
    expect(result.palette.tokens).toHaveLength(palette1.tokens.length);
  });

  it('returns an error when source and target are the same collection', () => {
    const result = movePaletteBetweenCollections([collA, collB], collA.id, palette1.id, collA.id);
    expect(result).toEqual({ ok: false, reason: 'same_collection' });
  });

  it('returns an error when the source palette is missing', () => {
    const result = movePaletteBetweenCollections([collA, collB], collA.id, 'missing', collB.id);
    expect(result).toEqual({ ok: false, reason: 'palette_not_found' });
  });

  it('returns a duplicate_name error when the target collection already has the same palette name', () => {
    collB = makeCollection('Collection B', [makePalette(' blue ')]);

    const result = movePaletteBetweenCollections([collA, collB], collA.id, palette1.id, collB.id);

    expect(result).toEqual({
      ok: false,
      reason: 'duplicate_name',
      message: 'A palette with this name already exists in this collection.',
    });
  });
});

describe('copyPaletteToCollection', () => {
  let collA: Collection;
  let collB: Collection;
  let palette1: Palette;

  beforeEach(() => {
    palette1 = makePalette('Blue');
    collA = makeCollection('Collection A', [palette1]);
    collB = makeCollection('Collection B', []);
  });

  it('creates a new palette with a different ID and leaves the source untouched', () => {
    const result = copyPaletteToCollection([collA, collB], collA.id, palette1.id, collB.id, () => 'copy-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sourceAfter = result.collections.find((collection) => collection.id === collA.id)!;
    const targetAfter = result.collections.find((collection) => collection.id === collB.id)!;

    expect(sourceAfter.palettes).toHaveLength(1);
    expect(sourceAfter.palettes[0].id).toBe(palette1.id);
    expect(targetAfter.palettes).toHaveLength(1);
    expect(targetAfter.palettes[0].id).toBe('copy-id');
    expect(result.newPaletteId).toBe('copy-id');
    expect(result.targetCollectionSlug).toBe(collB.slug);
  });

  it('copies the palette payload exactly', () => {
    const result = copyPaletteToCollection([collA, collB], collA.id, palette1.id, collB.id, () => 'copy-id');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.palette.hue).toBe(palette1.hue);
    expect(result.palette.chroma).toBe(palette1.chroma);
    expect(result.palette.lightness50).toBe(palette1.lightness50);
    expect(result.palette.lightness950).toBe(palette1.lightness950);
    expect(result.palette.name).toBe(palette1.name);
  });

  it('returns an error when source and target are the same collection', () => {
    const result = copyPaletteToCollection([collA, collB], collA.id, palette1.id, collA.id, () => 'copy-id');
    expect(result).toEqual({ ok: false, reason: 'same_collection' });
  });

  it('returns an error when the source palette is missing', () => {
    const result = copyPaletteToCollection([collA, collB], collA.id, 'missing', collB.id, () => 'copy-id');
    expect(result).toEqual({ ok: false, reason: 'palette_not_found' });
  });

  it('returns a duplicate_name error when the target collection already has the same palette name', () => {
    collB = makeCollection('Collection B', [makePalette(' blue ')]);

    const result = copyPaletteToCollection([collA, collB], collA.id, palette1.id, collB.id, () => 'copy-id');

    expect(result).toEqual({
      ok: false,
      reason: 'duplicate_name',
      message: 'A palette with this name already exists in this collection.',
    });
  });
});

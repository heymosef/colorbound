import React from 'react';
import '@testing-library/jest-dom/vitest';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaletteProvider, usePaletteContext } from './palette-context';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../components/aria-live-announcer', () => ({
  announce: vi.fn(),
  announcePolite: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(PaletteProvider, null, children);
}

describe('import collection behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('creates fresh palette IDs, preserves imported order, and deduplicates collection names and slugs', () => {
    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    let existingPaletteIds = new Set<string>();

    act(() => {
      const addResult = result.current.handleAddToCollection();
      if (!addResult.ok) {
        throw new Error('Expected the palette to be added to the default collection');
      }
      existingPaletteIds = new Set(
        result.current.collections.flatMap((collection) =>
          collection.palettes.map((palette) => palette.id),
        ),
      );
    });

    act(() => {
      const created = result.current.handleCreateCollection('Imported Collection');
      expect(created.slug).toBe('imported-collection');
    });

    const entries = [
      {
        name: 'First import',
        hue: 10,
        chroma: 0.12,
        lightness50: 0.98,
        lightness950: 0.03,
      },
      {
        name: 'Second import',
        hue: 40,
        chroma: 0.14,
        lightness50: 0.97,
        lightness950: 0.04,
      },
      {
        name: 'Third import',
        hue: 80,
        chroma: 0.16,
        lightness50: 0.96,
        lightness950: 0.05,
      },
    ];

    let importResult: { count: number; collectionSlug: string } | undefined;
    act(() => {
      importResult = result.current.handleImportCollection(entries, 'Imported Collection');
    });

    expect(importResult).toEqual({
      count: 3,
      collectionSlug: 'imported-collection-2',
    });

    const collectionSlugs = result.current.collections.map((collection) => collection.slug);
    expect(collectionSlugs).toEqual([
      'my-collection',
      'imported-collection',
      'imported-collection-2',
    ]);

    const importedCollection = result.current.collections.at(-1);
    expect(importedCollection?.name).toBe('Imported Collection (2)');
    expect(importedCollection?.slug).toBe('imported-collection-2');
    expect(importedCollection?.palettes.map((palette) => palette.name)).toEqual([
      'First import',
      'Second import',
      'Third import',
    ]);
    expect(importedCollection?.palettes.map((palette) => palette.hue)).toEqual([10, 40, 80]);

    const importedPaletteIds = importedCollection?.palettes.map((palette) => palette.id) ?? [];
    expect(new Set(importedPaletteIds).size).toBe(importedPaletteIds.length);
    expect(importedPaletteIds.every((id) => !existingPaletteIds.has(id))).toBe(true);
  });
});

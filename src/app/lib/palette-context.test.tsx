import React from 'react';
import '@testing-library/jest-dom/vitest';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaletteProvider, usePaletteContext } from './palette-context';
import { suggestPaletteName } from './color-utils';

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
  return <PaletteProvider>{children}</PaletteProvider>;
}

describe('PaletteProvider naming behavior', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('auto-updates the generated name when lightness changes affect the 500-step chroma', () => {
    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    act(() => {
      result.current.handleConfigChange({ hue: 250, chroma: 0.18 });
    });
    act(() => {
      result.current.handleConfigChange({ lightness50: 0, lightness950: 0 });
    });

    expect(result.current.config.name).toBe(
      suggestPaletteName(250, 0.18, 0, 0),
    );
    expect(result.current.config.name).toBe('Slate');
  });

  it('does not overwrite a manual name after config changes', () => {
    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    act(() => {
      result.current.handleNameChange('Manual Name');
    });
    act(() => {
      result.current.handleConfigChange({
        hue: 250,
        chroma: 0.18,
        lightness50: 0,
        lightness950: 0,
      });
    });

    expect(result.current.config.name).toBe('Manual Name');
  });

  it('creates a collection without changing editor selection when activate is false', () => {
    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    let savedPaletteId = '';
    let activeCollectionId = '';

    act(() => {
      const addResult = result.current.handleAddToCollection();
      if (!addResult.ok) {
        throw new Error('Expected palette to be added to the active collection');
      }
      savedPaletteId = addResult.paletteId;
      activeCollectionId = addResult.collectionId;
    });

    act(() => {
      result.current.handleNameChange('Edited before creating collection');
    });

    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.handleCreateCollection(undefined, { activate: false });
    });

    expect(result.current.collections).toHaveLength(2);
    expect(result.current.activeCollectionId).toBe(activeCollectionId);
    expect(result.current.activePaletteId).toBe(savedPaletteId);
    expect(result.current.isDirty).toBe(true);
  });

  it('still activates a newly created collection by default', () => {
    const { result } = renderHook(() => usePaletteContext(), { wrapper });
    const previousCollectionId = result.current.activeCollectionId;

    act(() => {
      result.current.handleCreateCollection();
    });

    expect(result.current.collections).toHaveLength(2);
    expect(result.current.activeCollectionId).not.toBe(previousCollectionId);
    expect(result.current.activePaletteId).toBeNull();
    expect(result.current.isDirty).toBe(false);
  });

  it('rejects adding a palette when an active collection already has the same normalized name', () => {
    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    act(() => {
      result.current.handleNameChange('Ocean');
    });

    let firstPaletteId = '';
    act(() => {
      const addResult = result.current.handleAddToCollection();
      if (!addResult.ok) {
        throw new Error('Expected the first palette to save');
      }
      firstPaletteId = addResult.paletteId;
    });

    act(() => {
      result.current.startDraftPalette(result.current.activeCollectionId ?? undefined);
      result.current.handleNameChange('  ocean  ');
    });

    let duplicateResult: ReturnType<typeof result.current.handleAddToCollection> | null = null;
    act(() => {
      duplicateResult = result.current.handleAddToCollection();
    });

    expect(duplicateResult).toEqual({
      ok: false,
      error: 'duplicate',
      message: 'A palette with this name already exists in this collection.',
    });
    expect(result.current.collection).toHaveLength(1);
    expect(result.current.collection[0].id).toBe(firstPaletteId);
    expect(result.current.config.name).toBe('  ocean  ');
  });

  it('resolves conflicted palettes by renaming them back into the active collection', () => {
    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    act(() => {
      result.current.handleImportCollection([
        {
          name: 'Ocean',
          hue: 210,
          chroma: 0.12,
          lightness50: 0.985,
          lightness950: 0.025,
          targetColorSpace: 'srgb',
          generationVersion: 1,
        },
        {
          name: ' ocean ',
          hue: 220,
          chroma: 0.15,
          lightness50: 0.98,
          lightness950: 0.03,
          targetColorSpace: 'srgb',
          generationVersion: 1,
        },
      ], 'Imported Collection');
    });

    const importedCollection = result.current.activeCollection;
    expect(importedCollection?.palettes).toHaveLength(1);
    expect(importedCollection?.conflictedPalettes).toHaveLength(1);

    const conflictedPalette = importedCollection!.conflictedPalettes[0];

    let resolveResult: ReturnType<typeof result.current.handleResolveConflictedPalette> | null = null;
    act(() => {
      resolveResult = result.current.handleResolveConflictedPalette(
        importedCollection!.id,
        conflictedPalette.id,
        'Ocean Alt',
      );
    });

    expect(resolveResult).toEqual({
      ok: true,
      collectionId: importedCollection!.id,
      paletteId: conflictedPalette.id,
      name: 'Ocean Alt',
    });
    expect(result.current.activeCollection?.palettes).toHaveLength(2);
    expect(result.current.activeCollection?.conflictedPalettes).toHaveLength(0);
    expect(result.current.activeCollection?.palettes.map((palette) => palette.name)).toEqual([
      'Ocean',
      'Ocean Alt',
    ]);
  });
});

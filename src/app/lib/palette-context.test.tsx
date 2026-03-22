import React from 'react';
import '@testing-library/jest-dom/vitest';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaletteProvider, usePaletteContext } from './palette-context';
import { GENERATION_VERSION, suggestPaletteName } from './color-utils';
import { createDefaultCollection, saveState } from './local-storage';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('../components/aria-live-announcer', () => ({
  announce: vi.fn(),
  announcePolite: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <PaletteProvider>{children}</PaletteProvider>;
}

function makeSavedPalette(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: 'Saved Palette',
    tokens: [],
    hue: 210,
    chroma: 0.12,
    lightness50: 0.985,
    lightness950: 0.025,
    targetColorSpace: 'srgb' as const,
    generationVersion: GENERATION_VERSION,
    ...overrides,
  };
}

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Draft',
    hue: 100,
    chroma: 0.15,
    lightness50: 0.985,
    lightness950: 0.025,
    targetColorSpace: 'srgb' as const,
    generationVersion: GENERATION_VERSION,
    ...overrides,
  };
}

function seedHydratedState(options: {
  palettes: ReturnType<typeof makeSavedPalette>[];
  activePaletteId?: string | null;
  lastViewedSavedPaletteId?: string | null;
  config?: ReturnType<typeof makeConfig>;
}) {
  const collection = createDefaultCollection(options.palettes);
  const activePalette = options.palettes.find((palette) => palette.id === options.activePaletteId) ?? null;

  saveState({
    collections: [collection],
    activeCollectionId: collection.id,
    activePaletteId: options.activePaletteId ?? null,
    lastViewedSavedPaletteId: options.lastViewedSavedPaletteId ?? null,
    config: options.config ?? makeConfig(activePalette ?? {}),
    nameManuallyEdited: true,
    contrastAlgorithm: 'wcag',
    isDirty: false,
    hasCompletedFirstRun: true,
  });

  return collection;
}

describe('PaletteProvider naming behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
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

  it('preserves the current name when applying hex to a saved palette', () => {
    const savedPalette = makeSavedPalette('saved-1', { name: 'Ocean' });
    const collection = seedHydratedState({
      palettes: [savedPalette],
      activePaletteId: savedPalette.id,
      lastViewedSavedPaletteId: savedPalette.id,
      config: makeConfig(savedPalette),
    });

    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    act(() => {
      result.current.selectPaletteInCollection(collection.id, savedPalette.id);
    });

    act(() => {
      result.current.handleApplyHex(120, 0.222);
    });

    expect(result.current.config.name).toBe('Ocean');
    expect(result.current.config.hue).toBe(120);
    expect(result.current.config.chroma).toBe(0.222);

    act(() => {
      result.current.handleConfigChange({ hue: 140 });
    });

    expect(result.current.config.name).toBe('Ocean');
  });

  it('keeps auto-naming drafts when applying hex', () => {
    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    act(() => {
      result.current.handleApplyHex(120, 0.222);
    });

    expect(result.current.config.name).toBe(
      suggestPaletteName(120, 0.222, 0.985, 0.025),
    );
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

  it('seeds a new draft from the last viewed saved display-p3 palette', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const p3Palette = makeSavedPalette('saved-p3', {
      name: 'P3 Sky',
      hue: 220,
      chroma: 0.28,
      lightness50: 0.97,
      lightness950: 0.04,
      targetColorSpace: 'p3',
    });
    const collection = seedHydratedState({ palettes: [p3Palette] });

    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    act(() => {
      result.current.selectPaletteInCollection(collection.id, p3Palette.id);
    });

    act(() => {
      result.current.startDraftPalette(collection.id);
    });

    expect(result.current.activePaletteId).toBeNull();
    expect(result.current.config.hue).toBe(180);
    expect(result.current.config.targetColorSpace).toBe('p3');
    expect(result.current.config.chroma).toBe(0.28);
    expect(result.current.config.lightness50).toBe(0.97);
    expect(result.current.config.lightness950).toBe(0.04);
    expect(result.current.config.name).toBe(suggestPaletteName(180, 0.28, 0.97, 0.04));
  });

  it('seeds a new draft from the last viewed saved srgb palette', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const srgbPalette = makeSavedPalette('saved-srgb', {
      name: 'sRGB Mint',
      hue: 120,
      chroma: 0.14,
      lightness50: 0.99,
      lightness950: 0.03,
      targetColorSpace: 'srgb',
    });
    const collection = seedHydratedState({ palettes: [srgbPalette] });

    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    act(() => {
      result.current.selectPaletteInCollection(collection.id, srgbPalette.id);
    });

    act(() => {
      result.current.startDraftPalette(collection.id);
    });

    expect(result.current.config.hue).toBe(90);
    expect(result.current.config.targetColorSpace).toBe('srgb');
    expect(result.current.config.chroma).toBe(0.14);
    expect(result.current.config.lightness50).toBe(0.99);
    expect(result.current.config.lightness950).toBe(0.03);
  });

  it('ignores unsaved gamut changes when starting another new palette until that draft is saved', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const srgbPalette = makeSavedPalette('saved-srgb', {
      name: 'Baseline',
      chroma: 0.13,
      lightness50: 0.99,
      lightness950: 0.03,
      targetColorSpace: 'srgb',
    });
    const collection = seedHydratedState({
      palettes: [srgbPalette],
      activePaletteId: srgbPalette.id,
      lastViewedSavedPaletteId: srgbPalette.id,
    });

    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    act(() => {
      result.current.startDraftPalette(collection.id);
    });

    act(() => {
      result.current.handleConfigChange({
        targetColorSpace: 'p3',
        chroma: 0.27,
        lightness50: 0.96,
        lightness950: 0.05,
      });
    });

    act(() => {
      result.current.startDraftPalette(collection.id);
    });

    expect(result.current.config.targetColorSpace).toBe('srgb');
    expect(result.current.config.chroma).toBe(0.13);
    expect(result.current.config.lightness50).toBe(0.99);
    expect(result.current.config.lightness950).toBe(0.03);

    act(() => {
      result.current.handleConfigChange({
        targetColorSpace: 'p3',
        chroma: 0.27,
        lightness50: 0.96,
        lightness950: 0.05,
      });
    });

    act(() => {
      const addResult = result.current.handleAddToCollection();
      if (!addResult.ok) {
        throw new Error('Expected the updated draft to save');
      }
    });

    act(() => {
      result.current.startDraftPalette(collection.id);
    });

    expect(result.current.config.targetColorSpace).toBe('p3');
    expect(result.current.config.chroma).toBe(0.27);
    expect(result.current.config.lightness50).toBe(0.96);
    expect(result.current.config.lightness950).toBe(0.05);
  });

  it('reloads with the remembered saved palette and reuses its target color space for new drafts', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    const rememberedPalette = makeSavedPalette('saved-p3', {
      chroma: 0.24,
      lightness50: 0.98,
      lightness950: 0.02,
      targetColorSpace: 'p3',
    });
    const collection = seedHydratedState({
      palettes: [rememberedPalette],
      activePaletteId: null,
      lastViewedSavedPaletteId: rememberedPalette.id,
      config: makeConfig({ targetColorSpace: 'srgb', chroma: 0.1 }),
    });

    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    act(() => {
      result.current.startDraftPalette(collection.id);
    });

    expect(result.current.config.targetColorSpace).toBe('p3');
    expect(result.current.config.chroma).toBe(0.24);
    expect(result.current.config.lightness50).toBe(0.98);
    expect(result.current.config.lightness950).toBe(0.02);
  });

  it('falls back to defaults when the remembered palette is deleted', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const rememberedPalette = makeSavedPalette('saved-p3', {
      chroma: 0.29,
      lightness50: 0.97,
      lightness950: 0.05,
      targetColorSpace: 'p3',
    });
    const collection = seedHydratedState({
      palettes: [rememberedPalette],
      activePaletteId: rememberedPalette.id,
      lastViewedSavedPaletteId: rememberedPalette.id,
    });

    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    act(() => {
      result.current.handleRemove(rememberedPalette.id);
    });

    act(() => {
      result.current.startDraftPalette(collection.id);
    });

    expect(result.current.config.targetColorSpace).toBe('srgb');
    expect(result.current.config.chroma).toBe(0.18);
    expect(result.current.config.lightness50).toBe(0.985);
    expect(result.current.config.lightness950).toBe(0.025);
  });

  it('clears active selection and falls back to defaults when the remembered palette collection is deleted', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const otherCollectionPalette = makeSavedPalette('other-palette');
    const rememberedPalette = makeSavedPalette('saved-p3', {
      chroma: 0.26,
      targetColorSpace: 'p3',
    });
    const firstCollection = createDefaultCollection([otherCollectionPalette]);
    const secondCollection = createDefaultCollection([rememberedPalette]);

    saveState({
      collections: [firstCollection, secondCollection],
      activeCollectionId: secondCollection.id,
      activePaletteId: rememberedPalette.id,
      lastViewedSavedPaletteId: rememberedPalette.id,
      config: makeConfig(rememberedPalette),
      nameManuallyEdited: true,
      contrastAlgorithm: 'wcag',
      isDirty: false,
      hasCompletedFirstRun: true,
    });

    const { result } = renderHook(() => usePaletteContext(), { wrapper });

    act(() => {
      result.current.handleDeleteCollection(secondCollection.id);
    });

    expect(result.current.activeCollectionId).toBeNull();
    expect(result.current.activePaletteId).toBeNull();

    act(() => {
      result.current.startDraftPalette(firstCollection.id);
    });

    expect(result.current.activeCollectionId).toBe(firstCollection.id);
    expect(result.current.config.targetColorSpace).toBe('srgb');
    expect(result.current.config.chroma).toBe(0.18);
    expect(result.current.config.lightness50).toBe(0.985);
    expect(result.current.config.lightness950).toBe(0.025);
  });
});

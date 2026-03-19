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
});

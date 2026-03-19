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
});

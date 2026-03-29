import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PaletteWorkspace } from './palette-workspace';

let paletteContextValue: any;

function makePalette() {
  return {
    id: 'palette-1',
    name: 'Ocean',
    hue: 210,
    chroma: 0.12,
    lightness50: 0.985,
    lightness950: 0.025,
    targetColorSpace: 'srgb',
    generationVersion: 1,
    tokens: [
      {
        step: 500,
        targetColorSpace: 'srgb',
        targetCss: 'oklch(0.6 0.12 210)',
        css: 'oklch(0.6 0.12 210)',
        hex: '#00aac8',
        rgb: 'rgb(0, 170, 200)',
        gamut: 'srgb',
        oklch: { l: 0.6, c: 0.12, h: 210 },
      },
    ],
  };
}

vi.mock('../lib/palette-context', () => ({
  usePaletteContext: () => paletteContextValue,
}));

vi.mock('./copyable-token-swatch', () => ({
  CopyableTokenSwatch: () => <div>Token swatch</div>,
}));

vi.mock('./contrast-indicator', () => ({
  ContrastRow: () => <div>Contrast row</div>,
}));

vi.mock('./ui-preview', () => ({
  UIPreview: () => <div>UI preview</div>,
}));

vi.mock('../lib/use-supports-p3', () => ({
  useSupportsP3: () => false,
  getTokenDisplayColor: () => '#00aac8',
}));

vi.mock('./palette-view-mode-toggle', () => ({
  ViewModeToggle: () => <div>View mode toggle</div>,
}));

function renderWorkspace(overrides: Record<string, unknown> = {}) {
  const palette = (overrides.palette as ReturnType<typeof makePalette> | undefined) ?? makePalette();

  return render(
    <PaletteWorkspace
      palette={palette}
      darkPalette={(overrides.darkPalette as ReturnType<typeof makePalette> | undefined) ?? palette}
      {...overrides}
    />,
  );
}

describe('Palette workspace collection actions', () => {
  beforeEach(() => {
    paletteContextValue = {
      contrastAlgorithm: 'wcag',
      setContrastAlgorithm: vi.fn(),
      collections: [
        {
          id: 'collection-1',
          name: 'My Project',
          slug: 'my-project',
          palettes: [makePalette()],
        },
      ],
      activeCollectionId: 'collection-1',
      activePaletteId: 'palette-1',
    };
  });

  it('keeps the workspace focused on view controls instead of palette identity', () => {
    renderWorkspace();

    expect(screen.getByText('View mode toggle')).toBeInTheDocument();
    expect(screen.queryByText('Algorithm toggle')).not.toBeInTheDocument();
    expect(screen.queryByText('Ocean')).not.toBeInTheDocument();
  });

  it('shows simplified Token Values headers and helper text', () => {
    const palette = {
      ...makePalette(),
      targetColorSpace: 'p3',
      tokens: [
        {
          ...makePalette().tokens[0],
          targetColorSpace: 'p3',
          targetCss: 'oklch(0.6 0.12 210)',
        },
      ],
    };

    renderWorkspace({ palette });

    const valuesTab = screen.getByRole('tab', { name: 'Token values' });
    fireEvent.click(valuesTab);
    fireEvent.keyDown(valuesTab, { key: 'Enter' });

    expect(screen.getByRole('columnheader', { name: 'OKLCH' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Hex' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'RGB' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Authored Gamut' })).not.toBeInTheDocument();
    expect(screen.getByText(/OKLCH is the main color value for this palette and is designed for Display P3/i)).toBeInTheDocument();
  });

  it('adds top clearance to the swatch rail without changing the swatch layout', () => {
    const palette = makePalette();

    const { container } = renderWorkspace({ palette });

    const swatchRail = container.querySelector('div.overflow-x-auto.pt-2.pb-2');
    expect(swatchRail).toBeInTheDocument();
    expect(swatchRail).toHaveClass('pt-2');
    expect(swatchRail).toHaveClass('pb-2');
    expect(screen.getByText('Token swatch')).toBeInTheDocument();
  });
});

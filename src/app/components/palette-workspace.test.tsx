import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MobileMoreMenu, PaletteWorkspace } from './palette-workspace';

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
  AlgorithmToggle: () => <div>Algorithm toggle</div>,
}));

vi.mock('./ui-preview', () => ({
  UIPreview: () => <div>UI preview</div>,
}));

vi.mock('./palette-action-dialogs', () => ({
  PaletteActionDialogs: ({ dupOpen, shareOpen, deleteOpen }: { dupOpen: boolean; shareOpen: boolean; deleteOpen: boolean }) => (
    <div>
      {dupOpen && <div>Duplicate dialog</div>}
      {shareOpen && <div>Share dialog</div>}
      {deleteOpen && <div>Delete dialog</div>}
    </div>
  ),
}));

vi.mock('../lib/use-supports-p3', () => ({
  useSupportsP3: () => false,
  getTokenDisplayColor: () => '#00aac8',
}));

vi.mock('./palette-view-mode-toggle', () => ({
  ViewModeToggle: () => <div>View mode toggle</div>,
}));

describe('Palette workspace collection actions', () => {
  beforeEach(() => {
    paletteContextValue = {
      contrastAlgorithm: 'wcag',
      setContrastAlgorithm: vi.fn(),
      collections: [
        {
          id: 'collection-1',
          name: 'My Collection',
          slug: 'my-collection',
          palettes: [makePalette()],
        },
      ],
      activeCollectionId: 'collection-1',
      activePaletteId: 'palette-1',
    };
  });

  it('keeps move to collection enabled in the desktop workspace when only one collection exists', async () => {
    const palette = makePalette();
    const onCollectionAction = vi.fn();

    render(
      <PaletteWorkspace
        palette={palette}
        darkPalette={palette}
        isEditingCollection
        onCollectionAction={onCollectionAction}
      />,
    );

    fireEvent.click(screen.getByLabelText('More actions'));

    const moveButton = await screen.findByRole('button', { name: /move to collection/i });
    expect(moveButton).toBeEnabled();

    fireEvent.click(moveButton);

    expect(onCollectionAction).toHaveBeenCalledWith('move', palette);
  });

  it('keeps duplicate to collection enabled in the mobile menu when only one collection exists', async () => {
    const palette = makePalette();
    const onCollectionAction = vi.fn();

    render(
      <MobileMoreMenu
        isEditingCollection
        onCollectionAction={onCollectionAction}
        palette={palette}
      />,
    );

    fireEvent.click(screen.getByLabelText('More actions'));

    const duplicateButton = await screen.findByRole('button', { name: /duplicate to collection/i });
    expect(duplicateButton).toBeEnabled();

    fireEvent.click(duplicateButton);

    expect(onCollectionAction).toHaveBeenCalledWith('copy', palette);
  });

  it('loads the duplicate dialog only after the action is selected', async () => {
    const palette = makePalette();

    render(
      <PaletteWorkspace
        palette={palette}
        darkPalette={palette}
        onDuplicate={vi.fn()}
      />,
    );

    expect(screen.queryByText('Duplicate dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('More actions'));
    fireEvent.click(await screen.findByRole('button', { name: /duplicate palette/i }));

    expect(await screen.findByText('Duplicate dialog')).toBeInTheDocument();
  });

  it('loads the share dialog only after the action is selected', async () => {
    const palette = makePalette();

    render(
      <PaletteWorkspace
        palette={palette}
        darkPalette={palette}
      />,
    );

    expect(screen.queryByText('Share dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('More actions'));
    fireEvent.click(await screen.findByRole('button', { name: /share palette/i }));

    expect(await screen.findByText('Share dialog')).toBeInTheDocument();
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

    render(
      <PaletteWorkspace
        palette={palette}
        darkPalette={palette}
      />,
    );

    const valuesTab = screen.getByRole('tab', { name: 'Token Values' });
    fireEvent.click(valuesTab);
    fireEvent.keyDown(valuesTab, { key: 'Enter' });

    expect(screen.getByRole('columnheader', { name: 'OKLCH' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Hex' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'RGB' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Authored Gamut' })).not.toBeInTheDocument();
    expect(screen.getByText(/OKLCH is the main color value for this palette and is designed for Display P3/i)).toBeInTheDocument();
  });
});

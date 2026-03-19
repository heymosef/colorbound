import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionsPage } from './collections-page';

const handleRenameCollection = vi.fn();
const startDraftPalette = vi.fn();
let paletteContextValue: any;

vi.mock('../lib/palette-context', () => ({
  usePaletteContext: () => paletteContextValue,
}));

vi.mock('../lib/use-document-title', () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock('./share-dialog', () => ({
  ShareCollectionButton: () => null,
  SharePaletteButton: () => null,
}));

vi.mock('./palette-color-ramp', () => ({
  PaletteColorRamp: () => <div>Palette ramp</div>,
}));

describe('CollectionsPage rename validation', () => {
  beforeEach(() => {
    handleRenameCollection.mockReset();
    startDraftPalette.mockReset();
    paletteContextValue = {
      collection: [],
      activeCollection: {
        id: 'collection-1',
        name: 'Marketing',
        slug: 'marketing',
      },
      collections: [
        { id: 'collection-1', name: 'Marketing', slug: 'marketing', palettes: [] },
        { id: 'collection-2', name: 'Product Team', slug: 'product-team', palettes: [] },
      ],
      startDraftPalette,
      handleRemove: vi.fn(),
      handleRename: vi.fn(),
      handleRenameCollection,
      handleDeleteCollection: vi.fn(),
    };
  });

  it('shows an inline error and does not submit duplicate collection names', () => {
    render(
      <MemoryRouter>
        <CollectionsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText('Options for Marketing'));
    fireEvent.click(screen.getByText('Rename'));

    const input = screen.getByLabelText('Edit collection name');
    fireEvent.change(input, { target: { value: 'product   team' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('Collection name must be unique')).toBeInTheDocument();
    expect(handleRenameCollection).not.toHaveBeenCalled();
  });

  it('shows hue metadata instead of a Neutral label for saved palettes', () => {
    const palette = {
      id: 'palette-1',
      name: 'Slate',
      tokens: [
        {
          step: 500,
          oklch: { l: 0.6, c: 0.01, h: 210 },
          oklchMapped: { l: 0.6, c: 0.01, h: 210 },
          css: 'oklch(0.600 0.010 210)',
          rgb: 'rgb(120, 130, 140)',
          hex: '#78828c',
          p3Css: 'color(display-p3 0.47 0.51 0.55)',
          gamut: 'srgb',
          displayCss: '#78828c',
        },
      ],
      hue: 210,
      chroma: 0.01,
      lightness50: 0.985,
      lightness950: 0.025,
    };

    paletteContextValue = {
      ...paletteContextValue,
      collection: [palette],
      activeCollection: {
        id: 'collection-1',
        name: 'Marketing',
        slug: 'marketing',
      },
      collections: [
        { id: 'collection-1', name: 'Marketing', slug: 'marketing', palettes: [palette] },
      ],
    };

    render(
      <MemoryRouter>
        <CollectionsPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('210°').length).toBeGreaterThan(0);
    expect(screen.queryByText('Neutral')).not.toBeInTheDocument();
  });
});

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionsPage } from './collections-page';

const handleRenameCollection = vi.fn();
const startDraftPalette = vi.fn();

vi.mock('../lib/palette-context', () => ({
  usePaletteContext: () => ({
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
  }),
}));

vi.mock('../lib/use-document-title', () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock('./share-dialog', () => ({
  ShareCollectionButton: () => null,
  SharePaletteButton: () => null,
}));

describe('CollectionsPage rename validation', () => {
  beforeEach(() => {
    handleRenameCollection.mockReset();
    startDraftPalette.mockReset();
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
});

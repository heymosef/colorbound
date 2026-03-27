import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionsListPage } from './collections-list-page';

const handleRenameCollection = vi.fn();

vi.mock('../lib/palette-context', () => ({
  useCollectionsContext: () => ({
    collections: [
      {
        id: 'collection-1',
        name: 'Marketing',
        slug: 'marketing',
        createdAt: '2025-01-01T00:00:00.000Z',
        lastModifiedAt: '2025-01-01T00:00:00.000Z',
        palettes: [],
      },
      {
        id: 'collection-2',
        name: 'Product Team',
        slug: 'product-team',
        createdAt: '2025-01-02T00:00:00.000Z',
        lastModifiedAt: '2025-01-02T00:00:00.000Z',
        palettes: [],
      },
    ],
    collectionSortBy: 'lastModified',
    setCollectionSortBy: vi.fn(),
    handleCreateCollection: vi.fn(),
    handleRenameCollection,
    handleDeleteCollection: vi.fn(),
    handleSelectCollection: vi.fn(),
  }),
}));

vi.mock('../lib/use-document-title', () => ({
  useDocumentTitle: vi.fn(),
}));

describe('CollectionsListPage rename validation', () => {
  beforeEach(() => {
    handleRenameCollection.mockReset();
  });

  it('shows an inline error and does not submit duplicate collection names', () => {
    render(
      <MemoryRouter>
        <CollectionsListPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText('Options for Marketing'));
    fireEvent.click(screen.getByText('Rename'));

    const input = screen.getByLabelText('Edit project name');
    fireEvent.change(input, { target: { value: '  product team  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('Project name must be unique')).toBeInTheDocument();
    expect(handleRenameCollection).not.toHaveBeenCalled();
  });
});

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MoveToCollectionDialog } from './move-to-collection-dialog';

const handleMovePalette = vi.fn();
const handleCopyPalette = vi.fn();

let paletteContextValue: any;

const baseCollections = [
  { id: 'source', name: 'Source', slug: 'source', palettes: [] },
  { id: 'target', name: 'Target', slug: 'target', palettes: [] },
];

vi.mock('../lib/palette-context', () => ({
  usePaletteContext: () => paletteContextValue,
}));

function DialogHarness({
  mode,
  initialCollections = baseCollections,
}: {
  mode: 'move' | 'copy';
  initialCollections?: Array<{ id: string; name: string; slug: string; palettes: unknown[] }>;
}) {
  const [collections, setCollections] = React.useState(initialCollections);

  paletteContextValue = {
    collections,
    handleMovePalette,
    handleCopyPalette,
  };

  return (
    <MoveToCollectionDialog
      open
      onOpenChange={vi.fn()}
      sourceCollectionId="source"
      paletteId="palette-1"
      paletteName="Ocean"
      mode={mode}
      onCreateCollection={() => {
        const createdCollection = {
          id: 'created',
          name: 'Untitled Collection',
          slug: 'untitled-collection',
          palettes: [],
        };
        setCollections((prev) => [...prev, createdCollection]);
        return { id: createdCollection.id, slug: createdCollection.slug };
      }}
    />
  );
}

function renderDialog(mode: 'move' | 'copy', initialCollections = baseCollections) {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: <DialogHarness mode={mode} initialCollections={initialCollections} />,
      },
    ],
    { initialEntries: ['/source/edit/palette-1'] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('MoveToCollectionDialog', () => {
  beforeEach(() => {
    handleMovePalette.mockReset();
    handleCopyPalette.mockReset();
    paletteContextValue = {
      collections: baseCollections,
      handleMovePalette,
      handleCopyPalette,
    };
  });

  it('replaces the route with the moved palette location', async () => {
    handleMovePalette.mockReturnValue({
      ok: true,
      collections: baseCollections,
      sourceCollectionId: 'source',
      targetCollectionId: 'target',
      targetCollectionSlug: 'target',
      paletteId: 'palette-1',
      palette: { id: 'palette-1', name: 'Ocean', tokens: [] },
    });

    const router = renderDialog('move');

    fireEvent.click(screen.getByRole('button', { name: /target/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/target/edit/palette-1');
    });

    expect(handleMovePalette).toHaveBeenCalledWith('source', 'palette-1', 'target');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('pushes the route with the duplicated palette location', async () => {
    handleCopyPalette.mockReturnValue({
      ok: true,
      collections: baseCollections,
      sourceCollectionId: 'source',
      targetCollectionId: 'target',
      targetCollectionSlug: 'target',
      sourcePaletteId: 'palette-1',
      newPaletteId: 'palette-2',
      palette: { id: 'palette-2', name: 'Ocean', tokens: [] },
    });

    const router = renderDialog('copy');

    fireEvent.click(screen.getByRole('button', { name: /target/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/target/edit/palette-2');
    });

    expect(handleCopyPalette).toHaveBeenCalledWith('source', 'palette-1', 'target');
    expect(router.state.historyAction).toBe('PUSH');
  });

  it('shows an empty state and lets the user create a destination collection inline for move', async () => {
    handleMovePalette.mockReturnValue({
      ok: true,
      collections: [
        { id: 'source', name: 'Source', slug: 'source', palettes: [] },
        { id: 'created', name: 'Untitled Collection', slug: 'untitled-collection', palettes: [] },
      ],
      sourceCollectionId: 'source',
      targetCollectionId: 'created',
      targetCollectionSlug: 'untitled-collection',
      paletteId: 'palette-1',
      palette: { id: 'palette-1', name: 'Ocean', tokens: [] },
    });

    const router = renderDialog('move', [
      { id: 'source', name: 'Source', slug: 'source', palettes: [] },
    ]);

    expect(screen.getByText('No destination collections yet')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    const createdCollectionButton = await screen.findByRole('button', { name: /untitled collection/i });
    expect(router.state.location.pathname).toBe('/source/edit/palette-1');

    fireEvent.click(createdCollectionButton);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/untitled-collection/edit/palette-1');
    });

    expect(handleMovePalette).toHaveBeenCalledWith('source', 'palette-1', 'created');
  });

  it('lets the user create a destination collection inline for duplicate', async () => {
    handleCopyPalette.mockReturnValue({
      ok: true,
      collections: [
        { id: 'source', name: 'Source', slug: 'source', palettes: [] },
        { id: 'created', name: 'Untitled Collection', slug: 'untitled-collection', palettes: [] },
      ],
      sourceCollectionId: 'source',
      targetCollectionId: 'created',
      targetCollectionSlug: 'untitled-collection',
      sourcePaletteId: 'palette-1',
      newPaletteId: 'palette-2',
      palette: { id: 'palette-2', name: 'Ocean', tokens: [] },
    });

    const router = renderDialog('copy', [
      { id: 'source', name: 'Source', slug: 'source', palettes: [] },
    ]);

    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));
    fireEvent.click(await screen.findByRole('button', { name: /untitled collection/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/untitled-collection/edit/palette-2');
    });

    expect(handleCopyPalette).toHaveBeenCalledWith('source', 'palette-1', 'created');
  });

  it('shows an inline duplicate-name error and stays on the same route', async () => {
    handleMovePalette.mockReturnValue({
      ok: false,
      reason: 'duplicate_name',
      message: 'A palette with this name already exists in this collection.',
    });

    const router = renderDialog('move');

    fireEvent.click(screen.getByRole('button', { name: /target/i }));

    await waitFor(() => {
      expect(screen.getByText('A palette with this name already exists in this collection.')).toBeInTheDocument();
    });

    expect(router.state.location.pathname).toBe('/source/edit/palette-1');
  });
});

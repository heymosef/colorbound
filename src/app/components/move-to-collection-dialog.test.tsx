import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MoveToCollectionDialog } from './move-to-collection-dialog';

const handleMovePalette = vi.fn();
const handleCopyPalette = vi.fn();

const collections = [
  { id: 'source', name: 'Source', slug: 'source', palettes: [] },
  { id: 'target', name: 'Target', slug: 'target', palettes: [] },
];

vi.mock('../lib/palette-context', () => ({
  usePaletteContext: () => ({
    collections,
    activeCollectionId: 'source',
    handleMovePalette,
    handleCopyPalette,
  }),
}));

function renderDialog(mode: 'move' | 'copy') {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <MoveToCollectionDialog
            open
            onOpenChange={vi.fn()}
            sourceCollectionId="source"
            paletteId="palette-1"
            paletteName="Ocean"
            mode={mode}
          />
        ),
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
  });

  it('replaces the route with the moved palette location', async () => {
    handleMovePalette.mockReturnValue({
      ok: true,
      collections,
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
      collections,
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
});

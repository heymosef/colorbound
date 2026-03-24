import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HomeEntryPage } from './home-entry-page';

const startDraftPalette = vi.fn();

vi.mock('../lib/palette-context', () => ({
  usePaletteContext: () => ({
    activeCollection: { id: 'collection-1', slug: 'my-collection' },
    startDraftPalette,
  }),
}));

vi.mock('./collections-list-page', () => ({
  CollectionsListPage: () => <div>Collections list</div>,
}));

function makeRouter(isFirstTime: boolean) {
  return createMemoryRouter(
    [
      {
        path: '/',
        element: <HomeEntryPage />,
        loader: () => ({ isFirstTime }),
      },
      { path: '/:collectionSlug/edit', element: <div>Draft editor</div> },
    ],
    { initialEntries: ['/'] },
  );
}

describe('HomeEntryPage', () => {
  beforeEach(() => {
    startDraftPalette.mockReset();
  });

  it('redirects first-time users into the draft editor', async () => {
    const router = makeRouter(true);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/my-collection/edit');
    });

    expect(startDraftPalette).toHaveBeenCalledWith('collection-1');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(screen.getByText('Draft editor')).toBeInTheDocument();
  });

  it('renders CollectionsListPage for returning users', async () => {
    const router = makeRouter(false);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Collections list')).toBeInTheDocument();
    });
    expect(startDraftPalette).not.toHaveBeenCalled();
  });
});

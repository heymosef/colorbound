import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from './components/root-layout';
import { HomeEntryPage } from './components/home-entry-page';
import { ChunkErrorBoundary } from './components/chunk-error-boundary';
import { isFirstTimeUser } from './lib/first-time-detection';
import { lazyImport } from './lib/lazy-import';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: ChunkErrorBoundary,
    children: [
      /**
       * ROUTING LOGIC:
       * - `/` → First-time users: redirect to draft palette editor
       *         Returning users: Collections list (all collections)
       * - `/:collectionSlug` → Collection detail (palette list within one collection)
       * - `/:collectionSlug/edit/:paletteId` → Palette editor within a collection
       * - `/edit/:paletteId?` → Legacy editor route (redirects or operates on active collection)
       * - `/p/:shareId` → Shared palette import
       * - `/c/:shareId` → Shared collection import
       */
      { index: true, loader: () => ({ isFirstTime: isFirstTimeUser() }), Component: HomeEntryPage },
      { path: 'edit/:paletteId?', lazy: lazyImport(() => import('./route-modules/edit-palette.route')) },
      {
        path: 'p/:shareId',
        lazy: lazyImport(() => import('./route-modules/shared-palette.route')),
      },
      {
        path: 'c/:shareId',
        lazy: lazyImport(() => import('./route-modules/shared-collection.route')),
      },
      { path: ':collectionSlug/edit', lazy: lazyImport(() => import('./route-modules/edit-palette.route')) },
      { path: ':collectionSlug/edit/:paletteId', lazy: lazyImport(() => import('./route-modules/edit-palette.route')) },
      { path: ':collectionSlug', lazy: lazyImport(() => import('./route-modules/collection-detail.route')) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

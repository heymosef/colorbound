import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from './components/root-layout';
import { HomeEntryPage } from './components/home-entry-page';
import { CollectionDetailPage } from './components/collection-detail-page';
import { EditPalettePage } from './components/edit-palette-page';
import { SharedPalettePage } from './components/shared-palette-page';
import { SharedCollectionPage } from './components/shared-collection-page';
import { ShareErrorBoundary } from './components/share-error-boundary';
import { getSharedPalette, getSharedCollection } from './lib/share-api';

// ─── Route loaders for shared pages ───

export async function sharedPaletteLoader({ params }: { params: Record<string, string | undefined> }) {
  const shareId = params.shareId;
  if (!shareId) throw new Error('Invalid share link');
  try {
    return await getSharedPalette(shareId);
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : 'Failed to load shared palette',
    );
  }
}

export async function sharedCollectionLoader({ params }: { params: Record<string, string | undefined> }) {
  const shareId = params.shareId;
  if (!shareId) throw new Error('Invalid share link');
  try {
    return await getSharedCollection(shareId);
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : 'Failed to load shared collection',
    );
  }
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      /**
       * ROUTING LOGIC:
       * - `/` → Collections list (all collections)
       * - `/:collectionSlug` → Collection detail (palette list within one collection)
       * - `/:collectionSlug/edit/:paletteId` → Palette editor within a collection
       * - `/edit/:paletteId?` → Legacy editor route (redirects or operates on active collection)
       * - `/p/:shareId` → Shared palette import
       * - `/c/:shareId` → Shared collection import
       */
      { index: true, Component: HomeEntryPage },
      { path: 'edit/:paletteId?', Component: EditPalettePage },
      {
        path: 'p/:shareId',
        Component: SharedPalettePage,
        loader: sharedPaletteLoader,
        ErrorBoundary: ShareErrorBoundary,
      },
      {
        path: 'c/:shareId',
        Component: SharedCollectionPage,
        loader: sharedCollectionLoader,
        ErrorBoundary: ShareErrorBoundary,
      },
      { path: ':collectionSlug/edit', Component: EditPalettePage },
      { path: ':collectionSlug/edit/:paletteId', Component: EditPalettePage },
      { path: ':collectionSlug', Component: CollectionDetailPage },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

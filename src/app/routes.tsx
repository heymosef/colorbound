import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { RootLayout } from './components/root-layout';
import { HomeEntryPage } from './components/home-entry-page';

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
      { path: 'edit/:paletteId?', lazy: () => import('./route-modules/edit-palette.route') },
      {
        path: 'p/:shareId',
        lazy: () => import('./route-modules/shared-palette.route'),
      },
      {
        path: 'c/:shareId',
        lazy: () => import('./route-modules/shared-collection.route'),
      },
      { path: ':collectionSlug/edit', lazy: () => import('./route-modules/edit-palette.route') },
      { path: ':collectionSlug/edit/:paletteId', lazy: () => import('./route-modules/edit-palette.route') },
      { path: ':collectionSlug', lazy: () => import('./route-modules/collection-detail.route') },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

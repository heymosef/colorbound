import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RootLayout } from './root-layout';

let breakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop';

vi.mock('../lib/use-breakpoint', () => ({
  useBreakpoint: () => breakpoint,
}));

vi.mock('../lib/palette-context', () => ({
  usePaletteContext: () => ({
    collections: [
      {
        id: 'collection-1',
        name: 'My Collection',
        slug: 'my-collection',
        palettes: [
          {
            id: 'palette-1',
            name: 'Cyan',
            group: 'Primary',
            tokens: [
              {
                step: 500,
                oklch: { l: 0.6, c: 0.12, h: 210 },
                oklchMapped: { l: 0.6, c: 0.12, h: 210 },
                css: 'oklch(0.600 0.120 210)',
                rgb: 'rgb(0, 170, 200)',
                hex: '#00aac8',
                p3Css: 'color(display-p3 0 0.66 0.78)',
                gamut: 'srgb',
                displayCss: '#00aac8',
              },
            ],
          },
        ],
      },
    ],
    collection: [
      {
        id: 'palette-1',
        name: 'Cyan',
        group: 'Primary',
        tokens: [
          {
            step: 500,
            oklch: { l: 0.6, c: 0.12, h: 210 },
            oklchMapped: { l: 0.6, c: 0.12, h: 210 },
            css: 'oklch(0.600 0.120 210)',
            rgb: 'rgb(0, 170, 200)',
            hex: '#00aac8',
            p3Css: 'color(display-p3 0 0.66 0.78)',
            gamut: 'srgb',
            displayCss: '#00aac8',
          },
        ],
        hue: 210,
        chroma: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
        isNeutral: false,
      },
    ],
    config: {
      name: 'Cyan',
      group: 'Primary',
      hue: 210,
      chroma: 0.12,
      lightness50: 0.985,
      lightness950: 0.025,
      isNeutral: false,
    },
    currentPalette: {
      id: 'palette-1',
      name: 'Cyan',
      group: 'Primary',
      tokens: [
        {
          step: 500,
          oklch: { l: 0.6, c: 0.12, h: 210 },
          oklchMapped: { l: 0.6, c: 0.12, h: 210 },
          css: 'oklch(0.600 0.120 210)',
          rgb: 'rgb(0, 170, 200)',
          hex: '#00aac8',
          p3Css: 'color(display-p3 0 0.66 0.78)',
          gamut: 'srgb',
          displayCss: '#00aac8',
        },
      ],
      hue: 210,
      chroma: 0.12,
      lightness50: 0.985,
      lightness950: 0.025,
      isNeutral: false,
    },
    activePaletteId: 'palette-1',
    activeCollection: {
      id: 'collection-1',
      name: 'My Collection',
      slug: 'my-collection',
      palettes: [],
    },
    isDirty: false,
    handleSelectFromCollection: vi.fn(),
    handleUpdateInCollection: vi.fn(),
    handleAddToCollection: vi.fn(),
    startDraftPalette: vi.fn(),
    handleCreateCollection: vi.fn(() => ({ id: 'collection-2', slug: 'new-collection' })),
    handleSelectCollection: vi.fn(),
  }),
}));

function renderAt(pathname: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <RootLayout />,
        children: [
          { path: ':collectionSlug/edit', element: <div>Draft editor page</div> },
          { path: ':collectionSlug/edit/:paletteId', element: <div>Saved editor page</div> },
          { path: ':collectionSlug', element: <div>Collection detail page</div> },
        ],
      },
    ],
    { initialEntries: [pathname] },
  );

  return render(<RouterProvider router={router} />);
}

describe('RootLayout route classification', () => {
  beforeEach(() => {
    breakpoint = 'desktop';
  });

  it('shows the palette switcher in the header for collection draft editor routes', () => {
    renderAt('/my-collection/edit');

    expect(
      screen.getByLabelText('Switch palette. Currently editing: Cyan'),
    ).toBeInTheDocument();
  });

  it('shows the palette switcher in the header for collection saved editor routes', () => {
    renderAt('/my-collection/edit/palette-1');

    expect(
      screen.getByLabelText('Switch palette. Currently editing: Cyan'),
    ).toBeInTheDocument();
  });

  it('does not show the palette switcher in the header for collection detail routes', () => {
    renderAt('/my-collection');

    expect(
      screen.queryByLabelText('Switch palette. Currently editing: Cyan'),
    ).not.toBeInTheDocument();
  });

  it('hides the global header on mobile draft editor routes', () => {
    breakpoint = 'mobile';

    renderAt('/my-collection/edit');

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('hides the global header on mobile saved editor routes', () => {
    breakpoint = 'mobile';

    renderAt('/my-collection/edit/palette-1');

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});

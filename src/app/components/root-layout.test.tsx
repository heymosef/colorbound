import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RootLayout } from './root-layout';

let breakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop';

vi.mock('../lib/use-breakpoint', () => ({
  useBreakpoint: () => breakpoint,
}));

const paletteToken = {
  step: 500,
  oklch: { l: 0.6, c: 0.12, h: 210 },
  oklchMapped: { l: 0.6, c: 0.12, h: 210 },
  css: 'oklch(0.600 0.120 210)',
  rgb: 'rgb(0, 170, 200)',
  hex: '#00aac8',
  p3Css: 'color(display-p3 0 0.66 0.78)',
  gamut: 'srgb',
  displayCss: '#00aac8',
};

const palette = {
  id: 'palette-1',
  name: 'Cyan',
  tokens: [paletteToken],
  hue: 210,
  chroma: 0.12,
  lightness50: 0.985,
  lightness950: 0.025,
};

function makeCollection(index: number) {
  return {
    id: `collection-${index + 1}`,
    name: index === 0 ? 'My Project' : `Project ${index + 1}`,
    slug: index === 0 ? 'my-project' : `project-${index + 1}`,
    palettes: [palette],
  };
}

function makePaletteContextValue(collectionCount = 1) {
  const collections = Array.from({ length: collectionCount }, (_, index) => makeCollection(index));
  const activeCollection = collections[0] ?? null;

  return {
    collections,
    collection: activeCollection?.palettes ?? [],
    config: {
      name: 'Cyan',
      hue: 210,
      chroma: 0.12,
      lightness50: 0.985,
      lightness950: 0.025,
    },
    currentPalette: palette,
    activeCollectionId: activeCollection?.id ?? null,
    activePaletteId: 'palette-1',
    activeCollection,
    isDirty: false,
    handleSelectFromCollection: vi.fn(),
    handleUpdateInCollection: vi.fn(),
    handleAddToCollection: vi.fn(),
    startDraftPalette: vi.fn(),
    handleDuplicatePalette: vi.fn(() => ({ ok: true, paletteId: 'palette-2', collectionId: 'collection-1', name: 'Cyan Copy' })),
    handleRemove: vi.fn(),
    handleCreateCollection: vi.fn(() => ({ id: 'collection-2', slug: 'new-collection' })),
    handleSelectCollection: vi.fn(),
  };
}

let paletteContextValue = makePaletteContextValue();

vi.mock('../lib/palette-context', () => ({
  usePaletteContext: () => paletteContextValue,
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
    paletteContextValue = makePaletteContextValue();
  });

  it('shows the palette menu in the header for collection draft editor routes', () => {
    renderAt('/my-project/edit');

    expect(
      screen.getByLabelText('Palette menu. Currently editing: Cyan'),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-slot="collection-icon"]')).toBeInTheDocument();
    expect(document.querySelector('[data-layout-shell="document"]')).toBeInTheDocument();
  });

  it('shows the palette menu in the header for collection saved editor routes', () => {
    renderAt('/my-project/edit/palette-1');

    expect(
      screen.getByLabelText('Palette menu. Currently editing: Cyan'),
    ).toBeInTheDocument();
  });

  it('does not show the palette menu in the header for collection detail routes', () => {
    renderAt('/my-project');

    expect(
      screen.queryByLabelText('Palette menu. Currently editing: Cyan'),
    ).not.toBeInTheDocument();
    expect(document.querySelector('[data-layout-shell="viewport"]')).toBeInTheDocument();
  });

  it('uses a 192px max-height collection switcher viewport', () => {
    paletteContextValue = makePaletteContextValue(6);

    renderAt('/my-project/edit');

    fireEvent.click(screen.getByLabelText('Project: My Project. Click to switch.'));

    const viewport = document.body.querySelector('div[class*="max-h-[192px]"][class*="overflow-y-auto"]');
    expect(viewport).not.toBeNull();
    expect(viewport).toBeInTheDocument();
  });

  it('hides the global header on mobile draft editor routes', () => {
    breakpoint = 'mobile';

    renderAt('/my-project/edit');

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('hides the global header on mobile saved editor routes', () => {
    breakpoint = 'mobile';

    renderAt('/my-project/edit/palette-1');

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});

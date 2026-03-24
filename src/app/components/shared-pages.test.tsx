import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedPalettePage } from './shared-palette-page';
import { SharedCollectionPage } from './shared-collection-page';

let loaderData: any;
const navigate = vi.fn();
const handleImportPalette = vi.fn();
const handleImportPaletteToCollection = vi.fn();
const handleImportCollection = vi.fn();
const handleCreateCollection = vi.fn();
let paletteContextValue: any;

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useParams: () => ({ shareId: 'share-1' }),
    useNavigate: () => navigate,
    useLoaderData: () => loaderData,
    Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
  };
});

vi.mock('../lib/palette-context', () => ({
  usePaletteContext: () => paletteContextValue,
}));

const mockUseDocumentTitle = vi.fn();
vi.mock('../lib/use-document-title', () => ({
  useDocumentTitle: (...args: unknown[]) => mockUseDocumentTitle(...args),
}));

vi.mock('../lib/clipboard', () => ({
  copyToClipboard: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
}));

vi.mock('./ui/alert-dialog', () => ({
  AlertDialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, ...props }: any) => <button type="button" {...props}>{children}</button>,
}));

vi.mock('./contrast-indicator', () => ({
  ContrastRow: () => <div>Contrast row</div>,
  ContrastPairSelector: () => <div>Contrast pair selector</div>,
}));

vi.mock('./copyable-token-swatch', () => ({
  CopyableTokenSwatch: ({ token }: any) => <div>{token.step}</div>,
}));

vi.mock('./palette-view-mode-toggle', () => ({
  ViewModeToggle: () => <div>View mode toggle</div>,
}));

vi.mock('./palette-color-ramp', () => ({
  PaletteColorRamp: () => <div>Palette ramp</div>,
}));

function SharedPaletteHarness({
  initialCollections = [],
  createCollection,
}: {
  initialCollections?: Array<{
    id: string;
    name: string;
    slug: string;
    palettes: unknown[];
    conflictedPalettes: unknown[];
  }>;
  createCollection?: (appendCollection: (collection: {
    id: string;
    name: string;
    slug: string;
    palettes: unknown[];
    conflictedPalettes: unknown[];
  }) => void) => void;
}) {
  const [collections, setCollections] = React.useState(initialCollections);

  paletteContextValue = {
    collections,
    handleImportPalette,
    handleImportPaletteToCollection,
    handleImportCollection,
    handleCreateCollection: (name?: string, options?: { activate?: boolean }) => {
      const result = handleCreateCollection(name, options);
      createCollection?.((collection) => {
        setCollections((currentCollections) => [...currentCollections, collection]);
      });
      return result;
    },
    activeCollection: null,
  };

  return <SharedPalettePage />;
}

describe('Shared pages', () => {
  beforeEach(() => {
    loaderData = null;
    navigate.mockReset();
    handleImportPalette.mockReset();
    handleImportPaletteToCollection.mockReset();
    handleImportCollection.mockReset();
    handleCreateCollection.mockReset();
    mockUseDocumentTitle.mockReset();
    paletteContextValue = {
      collections: [],
      handleImportPalette,
      handleImportPaletteToCollection,
      handleImportCollection,
      handleCreateCollection,
      activeCollection: null,
    };
  });

  it('shared palette page removes the Type label', () => {
    loaderData = {
      palette: {
        name: 'Ocean',
        hue: 210,
        chroma: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
      },
      createdAt: '2026-03-18T00:00:00.000Z',
    };

    render(
      <SharedPaletteHarness
        initialCollections={[
          { id: 'collection-1', name: 'Marketing', slug: 'marketing', palettes: [{ id: 'p1' }], conflictedPalettes: [] },
        ]}
      />,
    );

    expect(screen.getByText('Hue')).toBeInTheDocument();
    expect(screen.queryByText('Type')).not.toBeInTheDocument();
    expect(screen.queryByText('Chromatic')).not.toBeInTheDocument();
    expect(screen.queryByText('Neutral')).not.toBeInTheDocument();
  });

  it('shared collection page removes type labels and shows hue metadata', () => {
    loaderData = {
      type: 'collection',
      name: 'Shared Collection',
      palettes: [
        {
          name: 'Slate',
          hue: 210,
          chroma: 0.01,
          lightness50: 0.985,
          lightness950: 0.025,
        },
      ],
      createdAt: '2026-03-18T00:00:00.000Z',
    };

    render(<SharedCollectionPage />);

    expect(screen.getAllByText('210°').length).toBeGreaterThan(0);
    expect(screen.queryByText('Type')).not.toBeInTheDocument();
    expect(screen.queryByText('Chromatic')).not.toBeInTheDocument();
    expect(screen.queryByText('Neutral')).not.toBeInTheDocument();
  });

  it('shared palette page asks for a collection before importing into the editor', async () => {
    loaderData = {
      palette: {
        name: 'Ocean',
        hue: 210,
        chroma: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
      },
      createdAt: '2026-03-18T00:00:00.000Z',
    };
    paletteContextValue = {
      ...paletteContextValue,
      collections: [
        { id: 'collection-1', name: 'Marketing', slug: 'marketing', palettes: [{ id: 'p1' }], conflictedPalettes: [] },
      ],
    };
    handleImportPaletteToCollection.mockReturnValue({
      ok: true,
      paletteId: 'imported-1',
      collectionId: 'collection-1',
      collectionSlug: 'marketing',
      name: 'Ocean',
    });

    render(
      <SharedPaletteHarness
        initialCollections={[
          { id: 'collection-1', name: 'Marketing', slug: 'marketing', palettes: [], conflictedPalettes: [] },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /open in editor/i }));

    expect(screen.getByText('Choose which collection to add this palette to before opening it in the editor.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /marketing/i }));

    expect(handleImportPaletteToCollection).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ocean', hue: 210 }),
      'collection-1',
    );
    expect(navigate).toHaveBeenCalledWith('/marketing/edit/imported-1');
    expect(handleImportPalette).not.toHaveBeenCalled();
  });

  it('shared palette page leaves the user on the page when collection selection is cancelled', () => {
    loaderData = {
      palette: {
        name: 'Ocean',
        hue: 210,
        chroma: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
      },
      createdAt: '2026-03-18T00:00:00.000Z',
    };
    paletteContextValue = {
      ...paletteContextValue,
      collections: [
        { id: 'collection-1', name: 'Marketing', slug: 'marketing', palettes: [], conflictedPalettes: [] },
      ],
    };

    render(<SharedPalettePage />);

    fireEvent.click(screen.getByRole('button', { name: /open in editor/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(navigate).not.toHaveBeenCalled();
    expect(handleImportPaletteToCollection).not.toHaveBeenCalled();
  });

  it('shared palette page supports creating a collection inside the chooser', async () => {
    loaderData = {
      palette: {
        name: 'Ocean',
        hue: 210,
        chroma: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
      },
      createdAt: '2026-03-18T00:00:00.000Z',
    };
    handleCreateCollection.mockReturnValue({ id: 'collection-2', slug: 'imported-into' });
    handleImportPaletteToCollection.mockReturnValue({
      ok: true,
      paletteId: 'imported-2',
      collectionId: 'collection-2',
      collectionSlug: 'imported-into',
      name: 'Ocean',
    });

    render(
      <SharedPaletteHarness
        createCollection={(appendCollection) => {
          appendCollection({
            id: 'collection-2',
            name: 'Imported Into',
            slug: 'imported-into',
            palettes: [],
            conflictedPalettes: [],
          });
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /open in editor/i }));
    fireEvent.click(screen.getByRole('button', { name: /create collection/i }));

    const createdButton = await screen.findByRole('button', { name: /imported into/i });
    fireEvent.click(createdButton);

    expect(handleCreateCollection).toHaveBeenCalledWith(undefined, { activate: false });
    expect(handleImportPaletteToCollection).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ocean' }),
      'collection-2',
    );
    expect(navigate).toHaveBeenCalledWith('/imported-into/edit/imported-2');
  });

  it('shared palette page calls useDocumentTitle with palette name and description', () => {
    loaderData = {
      palette: {
        name: 'Ocean',
        hue: 210,
        chroma: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
      },
      createdAt: '2026-03-18T00:00:00.000Z',
    };

    render(<SharedPaletteHarness />);

    expect(mockUseDocumentTitle).toHaveBeenCalledWith(
      'Ocean — OKLCH color palette via Colorbound',
      expect.stringContaining('Ocean'),
    );
  });

  it('shared collection page calls useDocumentTitle with collection name and description', () => {
    loaderData = {
      type: 'collection',
      name: 'Brand Palette',
      palettes: [
        {
          name: 'Slate',
          hue: 210,
          chroma: 0.01,
          lightness50: 0.985,
          lightness950: 0.025,
        },
      ],
      createdAt: '2026-03-18T00:00:00.000Z',
    };

    render(<SharedCollectionPage />);

    expect(mockUseDocumentTitle).toHaveBeenCalledWith(
      'Brand Palette — OKLCH color collection via Colorbound',
      expect.stringContaining('Brand Palette'),
    );
  });
});

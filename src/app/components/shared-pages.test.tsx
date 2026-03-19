import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedPalettePage } from './shared-palette-page';
import { SharedCollectionPage } from './shared-collection-page';

let loaderData: any;
const navigate = vi.fn();
const handleImportPalette = vi.fn();
const handleImportCollection = vi.fn();

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
  usePaletteContext: () => ({
    handleImportPalette,
    handleImportCollection,
    activeCollection: null,
  }),
}));

vi.mock('../lib/use-document-title', () => ({
  useDocumentTitle: vi.fn(),
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

describe('Shared pages', () => {
  beforeEach(() => {
    loaderData = null;
    navigate.mockReset();
    handleImportPalette.mockReset();
    handleImportCollection.mockReset();
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

    render(<SharedPalettePage />);

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
});

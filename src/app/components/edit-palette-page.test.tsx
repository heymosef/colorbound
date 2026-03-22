import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditPalettePage } from './edit-palette-page';

const { toastInfo } = vi.hoisted(() => ({
  toastInfo: vi.fn(),
}));

const startDraftPalette = vi.fn();
const handleAddToCollection = vi.fn();
const handleUpdateInCollection = vi.fn();
const selectPaletteInCollection = vi.fn();
const handleDuplicatePalette = vi.fn();
const handleRemove = vi.fn();
let breakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop';

let paletteContextValue: any;

function makeToken() {
  return {
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
}

function makePalette(id: string, name = 'Cyan') {
  return {
    id,
    name,
    tokens: [makeToken()],
    hue: 210,
    chroma: 0.12,
    lightness50: 0.985,
    lightness950: 0.025,
  };
}

function buildContext(overrides: Record<string, unknown> = {}) {
  const savedPalette = makePalette('saved-1');

  return {
    config: {
      name: 'Draft Cyan',
      hue: 210,
      chroma: 0.12,
      lightness50: 0.985,
      lightness950: 0.025,
    },
    collection: [],
    collections: [
      {
        id: 'collection-1',
        name: 'My Collection',
        slug: 'my-collection',
        palettes: [savedPalette],
      },
    ],
    activeCollectionId: 'collection-1',
    activePaletteId: null,
    savedBaselinePalette: null,
    hasPersistedBaseline: false,
    isFirstRunSession: false,
    isDirty: true,
    currentPalette: makePalette('draft-1', 'Draft Cyan'),
    darkPalette: makePalette('dark-1', 'Draft Cyan'),
    contrastAlgorithm: 'wcag',
    setContrastAlgorithm: vi.fn(),
    handleConfigChange: vi.fn(),
    handleNameChange: vi.fn(),
    handleRandomize: vi.fn(),
    startDraftPalette,
    handleAddToCollection,
    handleUpdateInCollection,
    handleSelectFromCollection: vi.fn(),
    selectPaletteInCollection,
    handleRevertChanges: vi.fn(),
    handleRemove,
    handleRename: vi.fn(),
    handleReorder: vi.fn(),
    handleImportPalette: vi.fn(),
    handleImportCollection: vi.fn(),
    handleDuplicatePalette,
    handleApplyHex: vi.fn(),
    activeCollection: {
      id: 'collection-1',
      name: 'My Collection',
      slug: 'my-collection',
      palettes: [savedPalette],
    },
    handleCreateCollection: vi.fn(),
    handleRenameCollection: vi.fn(),
    handleDeleteCollection: vi.fn(),
    handleSelectCollection: vi.fn(),
    handleMovePalette: vi.fn(),
    handleCopyPalette: vi.fn(),
    collectionSortBy: 'lastModified',
    setCollectionSortBy: vi.fn(),
    ...overrides,
  };
}

vi.mock('../lib/palette-context', () => ({
  usePaletteContext: () => paletteContextValue,
}));

vi.mock('../lib/use-breakpoint', () => ({
  useBreakpoint: () => breakpoint,
}));

vi.mock('../lib/use-document-title', () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock('./root-layout', () => ({
  ThemeSwitcher: () => null,
  CollectionSwitcher: () => null,
  useThemeContext: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

vi.mock('./palette-controls', () => ({
  PaletteControls: ({ onAddToCollection, onSave, activePaletteId }: any) => (
    <button onClick={activePaletteId ? onSave : onAddToCollection}>Save palette</button>
  ),
}));

vi.mock('./palette-workspace', () => ({
  PaletteWorkspace: ({ onDuplicate, onDelete }: any) => (
    <div>
      <div>Workspace</div>
      {onDuplicate ? <button onClick={() => onDuplicate('Cyan Copy')}>Duplicate palette</button> : null}
      {onDelete ? <button onClick={onDelete}>Delete palette</button> : null}
    </div>
  ),
  MobileMoreMenu: ({ onDuplicate, onDelete }: any) => (
    <div>
      {onDuplicate ? <button onClick={() => onDuplicate('Cyan Copy')}>Mobile duplicate palette</button> : null}
      {onDelete ? <button onClick={onDelete}>Mobile delete palette</button> : null}
    </div>
  ),
}));

vi.mock('./palette-switcher', () => ({
  PaletteSwitcher: ({ onNewPalette }: any) => (
    <button onClick={onNewPalette}>New palette</button>
  ),
}));

vi.mock('./collection-panel', () => ({
  CollectionPanel: () => <div>Collection panel</div>,
}));

vi.mock('./contrast-indicator', () => ({
  AlgorithmToggle: () => null,
}));

vi.mock('./palette-view-mode-toggle', () => ({
  ViewModeToggle: () => null,
}));

vi.mock('sonner', () => ({
  toast: {
    info: toastInfo,
  },
}));

function renderAt(pathname: string) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <div>Collections page</div> },
      { path: '/:collectionSlug', element: <div>Collection page</div> },
      { path: '/:collectionSlug/edit', element: <EditPalettePage /> },
      { path: '/:collectionSlug/edit/:paletteId', element: <EditPalettePage /> },
    ],
    { initialEntries: [pathname] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('EditPalettePage draft save flow', () => {
  beforeEach(() => {
    breakpoint = 'desktop';
    startDraftPalette.mockReset();
    handleAddToCollection.mockReset();
    handleUpdateInCollection.mockReset();
    selectPaletteInCollection.mockReset();
    handleDuplicatePalette.mockReset();
    handleRemove.mockReset();
    toastInfo.mockReset();
    paletteContextValue = buildContext();
  });

  it('replaces the draft route with the saved palette route after saving a new palette', async () => {
    handleAddToCollection.mockImplementation(() => {
      const savedPalette = makePalette('saved-1', 'Draft Cyan');
      paletteContextValue = buildContext({
        collection: [savedPalette],
        collections: [
          {
            id: 'collection-1',
            name: 'My Collection',
            slug: 'my-collection',
            palettes: [savedPalette],
          },
        ],
        activePaletteId: 'saved-1',
        savedBaselinePalette: savedPalette,
        hasPersistedBaseline: true,
        isDirty: false,
        currentPalette: savedPalette,
      });
      return { ok: true, paletteId: 'saved-1', collectionId: 'collection-1' };
    });

    const router = renderAt('/my-collection/edit');

    fireEvent.click(screen.getByText('Save palette'));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/my-collection/edit/saved-1');
    });

    expect(handleAddToCollection).toHaveBeenCalledTimes(1);
    expect(startDraftPalette).not.toHaveBeenCalled();
  });

  it('canonicalizes a saved baseline on the draft route back to the saved palette route', async () => {
    const savedPalette = makePalette('saved-1');
    paletteContextValue = buildContext({
      collection: [savedPalette],
      collections: [
        {
          id: 'collection-1',
          name: 'My Collection',
          slug: 'my-collection',
          palettes: [savedPalette],
        },
      ],
      activePaletteId: 'saved-1',
      savedBaselinePalette: savedPalette,
      hasPersistedBaseline: true,
      isDirty: false,
      currentPalette: savedPalette,
    });

    const router = renderAt('/my-collection/edit');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/my-collection/edit/saved-1');
    });

    expect(startDraftPalette).not.toHaveBeenCalled();
  });

  it('stays on the draft route when creating a new palette from a saved editor session', async () => {
    breakpoint = 'mobile';
    const savedPalette = makePalette('saved-1');
    paletteContextValue = buildContext({
      collection: [savedPalette],
      collections: [
        {
          id: 'collection-1',
          name: 'My Collection',
          slug: 'my-collection',
          palettes: [savedPalette],
        },
      ],
      activePaletteId: 'saved-1',
      savedBaselinePalette: savedPalette,
      hasPersistedBaseline: true,
      isDirty: false,
      currentPalette: savedPalette,
      config: {
        name: 'Cyan',
        hue: 210,
        chroma: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
      },
    });

    const router = renderAt('/my-collection/edit/saved-1');

    fireEvent.click(screen.getByText('New palette'));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/my-collection/edit');
    });

    expect(startDraftPalette).toHaveBeenCalledWith('collection-1');
  });

  it('navigates to the duplicated palette route instead of staying on the source palette', async () => {
    const savedPalette = makePalette('saved-1', 'Cyan');
    const duplicatedPalette = makePalette('saved-2', 'Cyan Copy');

    paletteContextValue = buildContext({
      collection: [savedPalette],
      collections: [
        {
          id: 'collection-1',
          name: 'My Collection',
          slug: 'my-collection',
          palettes: [savedPalette],
        },
      ],
      activePaletteId: 'saved-1',
      savedBaselinePalette: savedPalette,
      hasPersistedBaseline: true,
      isDirty: false,
      currentPalette: savedPalette,
      config: {
        name: 'Cyan',
        hue: 210,
        chroma: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
      },
    });

    handleDuplicatePalette.mockImplementation(() => {
      paletteContextValue = buildContext({
        collection: [savedPalette, duplicatedPalette],
        collections: [
          {
            id: 'collection-1',
            name: 'My Collection',
            slug: 'my-collection',
            palettes: [savedPalette, duplicatedPalette],
          },
        ],
        activePaletteId: 'saved-2',
        savedBaselinePalette: duplicatedPalette,
        hasPersistedBaseline: true,
        isDirty: false,
        currentPalette: duplicatedPalette,
        config: {
          name: 'Cyan Copy',
          hue: 210,
          chroma: 0.12,
          lightness50: 0.985,
          lightness950: 0.025,
        },
      });

      return { ok: true, paletteId: 'saved-2', collectionId: 'collection-1', name: 'Cyan Copy' };
    });

    const router = renderAt('/my-collection/edit/saved-1');

    fireEvent.click(screen.getByText('Duplicate palette'));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/my-collection/edit/saved-2');
    });

    expect(router.state.historyAction).toBe('PUSH');
    expect(handleDuplicatePalette).toHaveBeenCalledWith('Cyan Copy');
    expect(selectPaletteInCollection).not.toHaveBeenCalledWith('collection-1', 'saved-1');
  });

  it('uses the same duplicate navigation on mobile', async () => {
    breakpoint = 'mobile';
    const savedPalette = makePalette('saved-1', 'Cyan');
    const duplicatedPalette = makePalette('saved-2', 'Cyan Copy');

    paletteContextValue = buildContext({
      collection: [savedPalette],
      collections: [
        {
          id: 'collection-1',
          name: 'My Collection',
          slug: 'my-collection',
          palettes: [savedPalette],
        },
      ],
      activePaletteId: 'saved-1',
      savedBaselinePalette: savedPalette,
      hasPersistedBaseline: true,
      isDirty: false,
      currentPalette: savedPalette,
      config: {
        name: 'Cyan',
        hue: 210,
        chroma: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
      },
    });

    handleDuplicatePalette.mockImplementation(() => {
      paletteContextValue = buildContext({
        collection: [savedPalette, duplicatedPalette],
        collections: [
          {
            id: 'collection-1',
            name: 'My Collection',
            slug: 'my-collection',
            palettes: [savedPalette, duplicatedPalette],
          },
        ],
        activePaletteId: 'saved-2',
        savedBaselinePalette: duplicatedPalette,
        hasPersistedBaseline: true,
        isDirty: false,
        currentPalette: duplicatedPalette,
        config: {
          name: 'Cyan Copy',
          hue: 210,
          chroma: 0.12,
          lightness50: 0.985,
          lightness950: 0.025,
        },
      });

      return { ok: true, paletteId: 'saved-2', collectionId: 'collection-1', name: 'Cyan Copy' };
    });

    const router = renderAt('/my-collection/edit/saved-1');

    fireEvent.click(screen.getByText('Mobile duplicate palette'));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/my-collection/edit/saved-2');
    });

    expect(router.state.historyAction).toBe('PUSH');
  });

  it('suppresses the extra not-found toast after deleting the current palette', async () => {
    const savedPalette = makePalette('saved-1', 'Cyan');

    paletteContextValue = buildContext({
      collection: [savedPalette],
      collections: [
        {
          id: 'collection-1',
          name: 'My Collection',
          slug: 'my-collection',
          palettes: [savedPalette],
        },
      ],
      activePaletteId: 'saved-1',
      savedBaselinePalette: savedPalette,
      hasPersistedBaseline: true,
      isDirty: false,
      currentPalette: savedPalette,
      config: {
        name: 'Cyan',
        hue: 210,
        chroma: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
      },
    });

    handleRemove.mockImplementation(() => {
      paletteContextValue = buildContext({
        collection: [],
        collections: [
          {
            id: 'collection-1',
            name: 'My Collection',
            slug: 'my-collection',
            palettes: [],
          },
        ],
        activePaletteId: null,
        savedBaselinePalette: null,
        hasPersistedBaseline: false,
        isDirty: false,
        currentPalette: makePalette('draft-1', 'Draft Cyan'),
      });
    });

    const router = renderAt('/my-collection/edit/saved-1');

    fireEvent.click(screen.getByText('Delete palette'));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/my-collection');
    });

    expect(handleRemove).toHaveBeenCalledWith('saved-1');
    expect(toastInfo).not.toHaveBeenCalled();
  });

  it('still shows not-found feedback for a real invalid palette URL', async () => {
    const router = renderAt('/my-collection/edit/missing');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/my-collection');
    });

    expect(toastInfo).toHaveBeenCalledWith('Palette not found');
  });
});

describe('EditPalettePage deferred collection panel loading', () => {
  beforeEach(() => {
    breakpoint = 'desktop';
    paletteContextValue = buildContext();
  });

  it('keeps the collection panel out of the mobile preview tab until a side panel tab is selected', async () => {
    breakpoint = 'mobile';

    renderAt('/my-collection/edit');

    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.queryByText('Collection panel')).not.toBeInTheDocument();

    const exportTab = screen.getByRole('tab', { name: /export/i });
    exportTab.focus();
    fireEvent.keyDown(exportTab, { key: 'Enter' });

    expect(await screen.findByText('Collection panel')).toBeInTheDocument();
  });

  it('renders the collection panel in the desktop side rail', async () => {
    renderAt('/my-collection/edit');

    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(await screen.findByText('Collection panel')).toBeInTheDocument();
  });
});

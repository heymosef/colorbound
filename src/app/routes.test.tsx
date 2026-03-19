import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSharedPalette = vi.fn();
const getSharedCollection = vi.fn();

vi.mock('./components/root-layout', () => ({
  RootLayout: () => null,
}));

vi.mock('./components/home-entry-page', () => ({
  HomeEntryPage: () => null,
}));

vi.mock('./components/collection-detail-page', () => ({
  CollectionDetailPage: () => null,
}));

vi.mock('./components/edit-palette-page', () => ({
  EditPalettePage: () => null,
}));

vi.mock('./components/shared-palette-page', () => ({
  SharedPalettePage: () => null,
}));

vi.mock('./components/shared-collection-page', () => ({
  SharedCollectionPage: () => null,
}));

vi.mock('./components/share-error-boundary', () => ({
  ShareErrorBoundary: () => null,
}));

vi.mock('./lib/share-api', () => ({
  getSharedPalette: (...args: unknown[]) => getSharedPalette(...args),
  getSharedCollection: (...args: unknown[]) => getSharedCollection(...args),
}));

describe('shared route loaders', () => {
  beforeEach(() => {
    getSharedPalette.mockReset();
    getSharedCollection.mockReset();
  });

  it('rethrows shared palette fetch failures with the backend message', async () => {
    getSharedPalette.mockRejectedValue(new Error('Shared palette not found'));
    const { sharedPaletteLoader } = await import('./routes');

    await expect(sharedPaletteLoader({
      params: { shareId: 'missing' },
    })).rejects.toThrow('Shared palette not found');
  });

  it('rethrows shared collection fetch failures with the backend message', async () => {
    getSharedCollection.mockRejectedValue(new Error('Shared collection not found'));
    const { sharedCollectionLoader } = await import('./routes');

    await expect(sharedCollectionLoader({
      params: { shareId: 'missing' },
    })).rejects.toThrow('Shared collection not found');
  });
});

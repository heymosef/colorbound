import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSharedPalette = vi.fn();
const getSharedCollection = vi.fn();

vi.mock('./components/root-layout', () => ({
  RootLayout: () => null,
}));

vi.mock('./components/home-entry-page', () => ({
  HomeEntryPage: () => null,
}));

vi.mock('./lib/share-api', () => ({
  getSharedPalette: (...args: unknown[]) => getSharedPalette(...args),
  getSharedCollection: (...args: unknown[]) => getSharedCollection(...args),
}));

describe('router lazy route boundaries', () => {
  it('keeps the home route eager while loading heavy routes lazily', async () => {
    const { router } = await import('./routes');
    const rootChildren = ((router as unknown as { routes: Array<{ children?: Array<Record<string, unknown>> }> }).routes[0].children ?? []);

    const findRoute = (path: string) => rootChildren.find((route) => route.path === path);
    const homeRoute = rootChildren.find((route) => 'index' in route && route.index);

    expect(homeRoute).toBeDefined();
    expect(homeRoute).not.toHaveProperty('lazy');
    expect(findRoute('edit/:paletteId?')).toMatchObject({ lazy: expect.any(Function) });
    expect(findRoute(':collectionSlug/edit')).toMatchObject({ lazy: expect.any(Function) });
    expect(findRoute(':collectionSlug/edit/:paletteId')).toMatchObject({ lazy: expect.any(Function) });
    expect(findRoute(':collectionSlug')).toMatchObject({ lazy: expect.any(Function) });
    expect(findRoute('p/:shareId')).toMatchObject({ lazy: expect.any(Function) });
    expect(findRoute('c/:shareId')).toMatchObject({ lazy: expect.any(Function) });
  });
});

describe('shared route loaders', () => {
  beforeEach(() => {
    getSharedPalette.mockReset();
    getSharedCollection.mockReset();
  });

  it('rethrows shared palette fetch failures with the backend message', async () => {
    getSharedPalette.mockRejectedValue(new Error('Shared palette not found'));
    const { loader } = await import('./route-modules/shared-palette.route');

    await expect(loader({
      params: { shareId: 'missing' },
    })).rejects.toThrow('Shared palette not found');
  });

  it('rethrows shared collection fetch failures with the backend message', async () => {
    getSharedCollection.mockRejectedValue(new Error('Shared collection not found'));
    const { loader } = await import('./route-modules/shared-collection.route');

    await expect(loader({
      params: { shareId: 'missing' },
    })).rejects.toThrow('Shared collection not found');
  });
});

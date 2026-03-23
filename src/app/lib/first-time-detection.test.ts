import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isFirstTimeUser } from './first-time-detection';

vi.mock('./local-storage', () => ({
  loadState: vi.fn(),
}));

import { loadState } from './local-storage';
const mockLoadState = vi.mocked(loadState);

const BASE_STATE = {
  collections: [],
  activeCollectionId: null,
  activePaletteId: null,
  lastViewedSavedPaletteId: null,
  config: {} as never,
  nameManuallyEdited: false,
  contrastAlgorithm: 'wcag' as const,
  isDirty: false,
  hasCompletedFirstRun: false,
};

describe('isFirstTimeUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when loadState returns null (no localStorage data)', () => {
    mockLoadState.mockReturnValue(null);
    expect(isFirstTimeUser()).toBe(true);
  });

  it('returns true when state exists with empty collections and hasCompletedFirstRun false', () => {
    mockLoadState.mockReturnValue({
      ...BASE_STATE,
      collections: [{ id: 'c1', name: 'My Collection', slug: 'my-collection', createdAt: '', lastModifiedAt: '', palettes: [], conflictedPalettes: [] }],
      hasCompletedFirstRun: false,
    });
    expect(isFirstTimeUser()).toBe(true);
  });

  it('returns false when a collection has at least one palette', () => {
    mockLoadState.mockReturnValue({
      ...BASE_STATE,
      collections: [{
        id: 'c1', name: 'My Collection', slug: 'my-collection', createdAt: '', lastModifiedAt: '',
        palettes: [{ id: 'p1' } as never],
        conflictedPalettes: [],
      }],
      hasCompletedFirstRun: false,
    });
    expect(isFirstTimeUser()).toBe(false);
  });

  it('returns false when hasCompletedFirstRun is true (one-way latch), even with no palettes', () => {
    mockLoadState.mockReturnValue({
      ...BASE_STATE,
      collections: [{ id: 'c1', name: 'My Collection', slug: 'my-collection', createdAt: '', lastModifiedAt: '', palettes: [], conflictedPalettes: [] }],
      hasCompletedFirstRun: true,
    });
    expect(isFirstTimeUser()).toBe(false);
  });

  it('returns false when loadState throws (graceful fallback)', () => {
    mockLoadState.mockImplementation(() => { throw new Error('localStorage unavailable'); });
    expect(isFirstTimeUser()).toBe(false);
  });

  it('returns false when multiple collections all have palettes', () => {
    mockLoadState.mockReturnValue({
      ...BASE_STATE,
      collections: [
        { id: 'c1', name: 'A', slug: 'a', createdAt: '', lastModifiedAt: '', palettes: [{ id: 'p1' } as never], conflictedPalettes: [] },
        { id: 'c2', name: 'B', slug: 'b', createdAt: '', lastModifiedAt: '', palettes: [{ id: 'p2' } as never], conflictedPalettes: [] },
      ],
      hasCompletedFirstRun: false,
    });
    expect(isFirstTimeUser()).toBe(false);
  });
});

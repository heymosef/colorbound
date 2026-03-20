import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadState, saveState, createDefaultCollection } from './local-storage';

// ─── Helpers ───

// V1 state uses legacy blackRange/whiteRange fields
function makeV1State(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    collection: [
      {
        id: 'pal-1',
        name: 'Blue',
        group: 'Custom',
        hue: 220,
        chroma: 0.18,
        curve: 0.5,
        blackRange: 0.85,
        whiteRange: 0.9,
        isNeutral: false,
      },
      {
        id: 'pal-2',
        name: 'Slate',
        group: 'Neutral',
        hue: 210,
        chroma: 0.01,
        curve: 0.5,
        blackRange: 0.85,
        whiteRange: 0.9,
        isNeutral: true,
      },
    ],
    config: {
      name: 'Blue',
      hue: 220,
      chroma: 0.18,
      curve: 0.5,
      blackRange: 0.85,
      whiteRange: 0.9,
      isNeutral: false,
    },
    activeCollectionId: 'pal-1',
    nameManuallyEdited: true,
    contrastAlgorithm: 'apca',
    isDirty: false,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ─── Tests ───

describe('loadState / saveState round-trip (v3)', () => {
  it('returns null for empty localStorage', () => {
    expect(loadState()).toBeNull();
  });

  it('round-trips a v3 state correctly', () => {
    const defaultCol = createDefaultCollection();
    const state = {
      collections: [defaultCol],
      activeCollectionId: defaultCol.id,
      activePaletteId: null,
      config: {
        name: 'Test',
        hue: 100,
        chroma: 0.15,
        lightness50: 0.985,
        lightness950: 0.025,
      },
      nameManuallyEdited: false,
      contrastAlgorithm: 'apca' as const,
      isDirty: false,
      hasCompletedFirstRun: true,
    };
    saveState(state);
    const loaded = loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.collections).toHaveLength(1);
    expect(loaded!.collections[0].name).toBe('My Collection');
    expect(loaded!.activeCollectionId).toBe(defaultCol.id);
    expect(loaded!.activePaletteId).toBeNull();
    expect(loaded!.config.name).toBe('Test');
    expect(loaded!.config.lightness50).toBe(0.985);
    expect(loaded!.config.lightness950).toBe(0.025);
    expect(loaded!.hasCompletedFirstRun).toBe(true);
  });

  it('does not persist removed group or isNeutral fields in v3 state', () => {
    const defaultCol = createDefaultCollection([
      {
        id: 'pal-1',
        name: 'Blue',
        tokens: [],
        hue: 220,
        chroma: 0.18,
        lightness50: 0.985,
        lightness950: 0.025,
      },
    ]);
    saveState({
      collections: [defaultCol],
      activeCollectionId: defaultCol.id,
      activePaletteId: null,
      config: {
        name: 'Test',
        hue: 100,
        chroma: 0.15,
        lightness50: 0.985,
        lightness950: 0.025,
      },
      nameManuallyEdited: false,
      contrastAlgorithm: 'apca',
      isDirty: false,
      hasCompletedFirstRun: true,
    });

    const raw = JSON.parse(localStorage.getItem('color-token-generator')!);
    expect(raw.config).not.toHaveProperty('isNeutral');
    expect(raw.collections[0].palettes[0]).not.toHaveProperty('group');
    expect(raw.collections[0].palettes[0]).not.toHaveProperty('isNeutral');
  });
});

describe('v1 → v3 migration', () => {
  it('migrates v1 state through v2 to v3 with a default collection', () => {
    localStorage.setItem('color-token-generator', JSON.stringify(makeV1State()));
    const loaded = loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.collections).toHaveLength(1);
    expect(loaded!.collections[0].name).toBe('My Collection');
    expect(loaded!.collections[0].slug).toBe('my-collection');
    expect(loaded!.collections[0].palettes).toHaveLength(2);
    expect(loaded!.collections[0].palettes[0].name).toBe('Blue');
    expect(loaded!.collections[0].palettes[1].name).toBe('Slate');
  });

  it('maps v1 activeCollectionId to v3 activePaletteId', () => {
    localStorage.setItem('color-token-generator', JSON.stringify(makeV1State()));
    const loaded = loadState();
    expect(loaded!.activePaletteId).toBe('pal-1');
  });

  it('converts legacy blackRange/whiteRange to lightness50/lightness950', () => {
    localStorage.setItem('color-token-generator', JSON.stringify(makeV1State()));
    const loaded = loadState();
    // blackRange=0.85 → lightness950 = (1-0.85)*0.15 = 0.0225
    // whiteRange=0.9 → lightness50 = 1-(1-0.9)*0.15 = 0.985
    expect(loaded!.config.lightness50).toBeCloseTo(0.985, 3);
    expect(loaded!.config.lightness950).toBeCloseTo(0.0225, 3);
    // Palette entries should also be migrated
    const pal = loaded!.collections[0].palettes[0];
    expect(pal.lightness50).toBeCloseTo(0.985, 3);
    expect(pal.lightness950).toBeCloseTo(0.0225, 3);
  });

  it('is idempotent — running twice does not duplicate', () => {
    localStorage.setItem('color-token-generator', JSON.stringify(makeV1State()));
    const first = loadState();
    const second = loadState();
    expect(second!.collections).toHaveLength(1);
    expect(second!.collections[0].palettes).toHaveLength(2);
  });

  it('handles v1 state with empty collection', () => {
    localStorage.setItem(
      'color-token-generator',
      JSON.stringify(makeV1State({ collection: [] }))
    );
    const loaded = loadState();
    expect(loaded!.collections).toHaveLength(1);
    expect(loaded!.collections[0].palettes).toHaveLength(0);
  });

  it('preserves config through migration', () => {
    localStorage.setItem('color-token-generator', JSON.stringify(makeV1State()));
    const loaded = loadState();
    expect(loaded!.config.name).toBe('Blue');
    expect(loaded!.config.hue).toBe(220);
    expect(loaded!.hasCompletedFirstRun).toBe(true);
  });
});

describe('first-run completion flag', () => {
  it('defaults the flag to true for existing persisted v3 state without the field', () => {
    const defaultCol = createDefaultCollection();
    localStorage.setItem('color-token-generator', JSON.stringify({
      version: 3,
      collections: [
        {
          ...defaultCol,
          palettes: [],
        },
      ],
      activeCollectionId: defaultCol.id,
      activePaletteId: null,
      config: {
        name: 'Test',
        hue: 100,
        chroma: 0.15,
        lightness50: 0.985,
        lightness950: 0.025,
      },
      nameManuallyEdited: false,
      contrastAlgorithm: 'wcag',
      isDirty: false,
    }));

    expect(loadState()!.hasCompletedFirstRun).toBe(true);
  });

  it('loads an invalid activePaletteId as a draft session without a persisted baseline', () => {
    const defaultCol = createDefaultCollection();
    localStorage.setItem('color-token-generator', JSON.stringify({
      version: 3,
      collections: [
        {
          ...defaultCol,
          palettes: [],
        },
      ],
      activeCollectionId: defaultCol.id,
      activePaletteId: 'missing-palette',
      config: {
        name: 'Draft',
        hue: 32,
        chroma: 0.15,
        lightness50: 0.985,
        lightness950: 0.025,
      },
      nameManuallyEdited: true,
      contrastAlgorithm: 'wcag',
      isDirty: true,
      hasCompletedFirstRun: true,
    }));

    const loaded = loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.activePaletteId).toBeNull();
    expect(loaded!.config.name).toBe('Draft');
  });
});

describe('duplicate palette migration', () => {
  it('moves duplicate palette names into conflictedPalettes when loading v4 state', () => {
    const defaultCol = createDefaultCollection();

    localStorage.setItem('color-token-generator', JSON.stringify({
      version: 4,
      collections: [
        {
          ...defaultCol,
          palettes: [
            {
              id: 'pal-1',
              name: 'Ocean',
              hue: 210,
              chroma: 0.12,
              lightness50: 0.985,
              lightness950: 0.025,
              targetColorSpace: 'srgb',
              generationVersion: 1,
            },
            {
              id: 'pal-2',
              name: ' ocean ',
              hue: 220,
              chroma: 0.16,
              lightness50: 0.98,
              lightness950: 0.03,
              targetColorSpace: 'srgb',
              generationVersion: 1,
            },
          ],
        },
      ],
      activeCollectionId: defaultCol.id,
      activePaletteId: 'pal-1',
      config: {
        name: 'Ocean',
        hue: 210,
        chroma: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
        targetColorSpace: 'srgb',
        generationVersion: 1,
      },
      nameManuallyEdited: true,
      contrastAlgorithm: 'wcag',
      isDirty: false,
      hasCompletedFirstRun: true,
    }));

    const loaded = loadState();

    expect(loaded?.collections[0].palettes.map((palette) => palette.name)).toEqual(['Ocean']);
    expect(loaded?.collections[0].conflictedPalettes.map((palette) => palette.name)).toEqual([' ocean ']);

    const raw = JSON.parse(localStorage.getItem('color-token-generator')!);
    expect(raw.version).toBe(5);
    expect(raw.collections[0].palettes).toHaveLength(1);
    expect(raw.collections[0].conflictedPalettes).toHaveLength(1);
  });
});

describe('createDefaultCollection', () => {
  it('creates a collection with expected defaults', () => {
    const col = createDefaultCollection();
    expect(col.name).toBe('My Collection');
    expect(col.slug).toBe('my-collection');
    expect(col.palettes).toHaveLength(0);
    expect(col.conflictedPalettes).toEqual([]);
    expect(col.id).toBeTruthy();
    expect(col.createdAt).toBeTruthy();
    expect(col.lastModifiedAt).toBeTruthy();
  });
});

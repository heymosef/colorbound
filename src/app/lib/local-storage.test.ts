import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadState, saveState, createDefaultCollection } from './local-storage';
import { DEFAULT_DARK_CURVE, DEFAULT_LIGHT_CURVE, GENERATION_VERSION } from './color-utils';
import { DEFAULT_PALETTE_DENSITY } from './palette-density';

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

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test',
    hue: 100,
    chroma50: 0.15,
    chroma: 0.15,
    chroma950: 0.15,
    lightCurve: DEFAULT_LIGHT_CURVE,
    darkCurve: DEFAULT_DARK_CURVE,
    lightness50: 0.985,
    lightness950: 0.025,
    density: DEFAULT_PALETTE_DENSITY,
    targetColorSpace: 'srgb',
    generationVersion: GENERATION_VERSION,
    ...overrides,
  };
}

function makeStoredPaletteEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pal-1',
    name: 'Blue',
    hue: 220,
    chroma50: 0.18,
    chroma: 0.18,
    chroma950: 0.18,
    lightCurve: DEFAULT_LIGHT_CURVE,
    darkCurve: DEFAULT_DARK_CURVE,
    lightness50: 0.985,
    lightness950: 0.025,
    density: DEFAULT_PALETTE_DENSITY,
    targetColorSpace: 'srgb',
    generationVersion: GENERATION_VERSION,
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

describe('loadState / saveState round-trip', () => {
  it('returns null for empty localStorage', () => {
    expect(loadState()).toBeNull();
  });

  it('round-trips a v3 state correctly', () => {
    const defaultCol = createDefaultCollection();
    const state = {
      collections: [defaultCol],
      activeCollectionId: defaultCol.id,
      activePaletteId: null,
      lastViewedSavedPaletteId: null,
      config: makeConfig(),
      nameManuallyEdited: false,
      contrastAlgorithm: 'apca' as const,
      isDirty: false,
      hasCompletedFirstRun: true,
    };
    saveState(state);
    const raw = JSON.parse(localStorage.getItem('color-token-generator')!);
    const loaded = loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.collections).toHaveLength(1);
    expect(loaded!.collections[0].name).toBe('My Project');
    expect(loaded!.activeCollectionId).toBe(defaultCol.id);
    expect(loaded!.activePaletteId).toBeNull();
    expect(raw.version).toBe(12);
    expect(loaded!.config.name).toBe('Test');
    expect(loaded!.config.lightness50).toBe(0.985);
    expect(loaded!.config.lightness950).toBe(0.025);
    expect(loaded!.config.lightCurve).toBe(DEFAULT_LIGHT_CURVE);
    expect(loaded!.config.darkCurve).toBe(DEFAULT_DARK_CURVE);
    expect(loaded!.config.generationVersion).toBe(GENERATION_VERSION);
    expect(loaded!.hasCompletedFirstRun).toBe(true);
  });

  it('does not persist removed group or isNeutral fields in v3 state', () => {
    const defaultCol = createDefaultCollection([
        {
          id: 'pal-1',
          name: 'Blue',
          tokens: [],
          hue: 220,
          chroma50: 0.18,
          chroma: 0.18,
          chroma950: 0.18,
          lightCurve: DEFAULT_LIGHT_CURVE,
          darkCurve: DEFAULT_DARK_CURVE,
          lightness50: 0.985,
          lightness950: 0.025,
          targetColorSpace: 'srgb',
          generationVersion: GENERATION_VERSION,
        },
    ]);
    saveState({
      collections: [defaultCol],
      activeCollectionId: defaultCol.id,
      activePaletteId: null,
      lastViewedSavedPaletteId: 'pal-1',
      config: makeConfig(),
      nameManuallyEdited: false,
      contrastAlgorithm: 'apca',
      isDirty: false,
      hasCompletedFirstRun: true,
    });

    const raw = JSON.parse(localStorage.getItem('color-token-generator')!);
    expect(raw.config).not.toHaveProperty('isNeutral');
    expect(raw.collections[0].palettes[0]).not.toHaveProperty('group');
    expect(raw.collections[0].palettes[0]).not.toHaveProperty('isNeutral');
    expect(raw.collections[0].palettes[0].lightCurve).toBe(DEFAULT_LIGHT_CURVE);
    expect(raw.collections[0].palettes[0].darkCurve).toBe(DEFAULT_DARK_CURVE);
    expect(raw.collections[0].palettes[0]).not.toHaveProperty('lightBias');
    expect(raw.collections[0].palettes[0]).not.toHaveProperty('darkBias');
    expect(raw.lastViewedSavedPaletteId).toBe('pal-1');
  });

  it('round-trips the remembered saved palette id', () => {
    const palette = {
      ...makeStoredPaletteEntry({ id: 'pal-p3', targetColorSpace: 'p3', chroma: 0.24 }),
      tokens: [],
    };
    const defaultCol = createDefaultCollection([palette]);

    saveState({
      collections: [defaultCol],
      activeCollectionId: defaultCol.id,
      activePaletteId: null,
      lastViewedSavedPaletteId: 'pal-p3',
      config: makeConfig({ targetColorSpace: 'p3', chroma: 0.24 }),
      nameManuallyEdited: false,
      contrastAlgorithm: 'wcag',
      isDirty: false,
      hasCompletedFirstRun: true,
    });

    const loaded = loadState();
    expect(loaded?.lastViewedSavedPaletteId).toBe('pal-p3');
    expect(loaded?.collections[0].palettes[0].targetColorSpace).toBe('p3');
  });
});

describe('legacy migrations', () => {
  it('migrates v1 state through current storage with a default collection', () => {
    localStorage.setItem('color-token-generator', JSON.stringify(makeV1State()));
    const loaded = loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.collections).toHaveLength(1);
    expect(loaded!.collections[0].name).toBe('My Project');
    expect(loaded!.collections[0].slug).toBe('my-project');
    expect(loaded!.collections[0].palettes).toHaveLength(2);
    expect(loaded!.collections[0].palettes[0].name).toBe('Blue');
    expect(loaded!.collections[0].palettes[1].name).toBe('Slate');
  });

  it('maps v1 activeCollectionId to current activePaletteId', () => {
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
    expect(loaded!.config.lightCurve).toBe(DEFAULT_LIGHT_CURVE);
    expect(loaded!.config.darkCurve).toBe(DEFAULT_DARK_CURVE);
    // Palette entries should also be migrated
    const pal = loaded!.collections[0].palettes[0];
    expect(pal.lightness50).toBeCloseTo(0.985, 3);
    expect(pal.lightness950).toBeCloseTo(0.0225, 3);
    expect(pal.lightCurve).toBe(DEFAULT_LIGHT_CURVE);
    expect(pal.darkCurve).toBe(DEFAULT_DARK_CURVE);
  });

  it('normalizes legacy v9 auto-seeded bias defaults to neutral curves', () => {
    localStorage.setItem('color-token-generator', JSON.stringify({
      version: 9,
      collections: [
        {
          id: 'col-1',
          name: 'My Project',
          slug: 'my-project',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastModifiedAt: '2024-01-01T00:00:00.000Z',
          palettes: [
            {
              id: 'pal-1',
              name: 'Legacy',
              hue: 210,
              chroma50: 0.18,
              chroma: 0.18,
              chroma950: 0.18,
              lightBias: 0.2,
              darkBias: 0.35,
              lightness50: 0.985,
              lightness950: 0.025,
              density: DEFAULT_PALETTE_DENSITY,
              targetColorSpace: 'srgb',
              generationVersion: GENERATION_VERSION,
            },
          ],
          conflictedPalettes: [],
        },
      ],
      activeCollectionId: 'col-1',
      activePaletteId: 'pal-1',
      lastViewedSavedPaletteId: 'pal-1',
      config: {
        name: 'Legacy',
        hue: 210,
        chroma50: 0.18,
        chroma: 0.18,
        chroma950: 0.18,
        lightBias: 0.2,
        darkBias: 0.35,
        lightness50: 0.985,
        lightness950: 0.025,
        density: DEFAULT_PALETTE_DENSITY,
        targetColorSpace: 'srgb',
        generationVersion: GENERATION_VERSION,
      },
      nameManuallyEdited: false,
      contrastAlgorithm: 'wcag',
      isDirty: false,
      hasCompletedFirstRun: true,
    }));

    const loaded = loadState();
    expect(loaded?.config.lightCurve).toBe(DEFAULT_LIGHT_CURVE);
    expect(loaded?.config.darkCurve).toBe(DEFAULT_DARK_CURVE);
    expect(loaded?.collections[0].palettes[0].lightCurve).toBe(DEFAULT_LIGHT_CURVE);
    expect(loaded?.collections[0].palettes[0].darkCurve).toBe(DEFAULT_DARK_CURVE);
  });

  it('inverts v11 stored curve values when the midpoint is the more saturated anchor', () => {
    localStorage.setItem('color-token-generator', JSON.stringify({
      version: 11,
      collections: [
        {
          id: 'col-1',
          name: 'My Project',
          slug: 'my-project',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastModifiedAt: '2024-01-01T00:00:00.000Z',
          palettes: [
            {
              id: 'pal-1',
              name: 'Legacy Curves',
              hue: 210,
              chroma50: 0.04,
              chroma: 0.14,
              chroma950: 0.04,
              lightCurve: 0.75,
              darkCurve: -0.5,
              lightness50: 0.985,
              lightness950: 0.025,
              density: DEFAULT_PALETTE_DENSITY,
              targetColorSpace: 'srgb',
              generationVersion: 5,
            },
          ],
          conflictedPalettes: [],
        },
      ],
      activeCollectionId: 'col-1',
      activePaletteId: 'pal-1',
      lastViewedSavedPaletteId: 'pal-1',
      config: {
        name: 'Legacy Curves',
        hue: 210,
        chroma50: 0.04,
        chroma: 0.14,
        chroma950: 0.04,
        lightCurve: 0.75,
        darkCurve: -0.5,
        lightness50: 0.985,
        lightness950: 0.025,
        density: DEFAULT_PALETTE_DENSITY,
        targetColorSpace: 'srgb',
        generationVersion: 5,
      },
      nameManuallyEdited: false,
      contrastAlgorithm: 'wcag',
      isDirty: false,
      hasCompletedFirstRun: true,
    }));

    const loaded = loadState();

    expect(loaded?.config.lightCurve).toBe(-0.75);
    expect(loaded?.config.darkCurve).toBe(0.5);
    expect(loaded?.collections[0].palettes[0].lightCurve).toBe(-0.75);
    expect(loaded?.collections[0].palettes[0].darkCurve).toBe(0.5);
    expect(loaded?.config.generationVersion).toBe(GENERATION_VERSION);
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

  it('migrates v5 state to v6 and seeds the remembered saved palette from a valid active palette id', () => {
    const defaultCol = createDefaultCollection();
    const storedPalette = makeStoredPaletteEntry({ id: 'pal-p3', targetColorSpace: 'p3', chroma: 0.24 });

    localStorage.setItem('color-token-generator', JSON.stringify({
      version: 5,
      collections: [
        {
          ...defaultCol,
          palettes: [storedPalette],
          conflictedPalettes: [],
        },
      ],
      activeCollectionId: defaultCol.id,
      activePaletteId: 'pal-p3',
      config: makeConfig({ targetColorSpace: 'p3', chroma: 0.24 }),
      nameManuallyEdited: true,
      contrastAlgorithm: 'wcag',
      isDirty: false,
      hasCompletedFirstRun: true,
    }));

    const loaded = loadState();
    const raw = JSON.parse(localStorage.getItem('color-token-generator')!);

    expect(loaded?.lastViewedSavedPaletteId).toBe('pal-p3');
    expect(raw.version).toBe(12);
    expect(raw.lastViewedSavedPaletteId).toBe('pal-p3');
  });

  it('migrates v5 state to v6 with a null remembered palette when the active palette is not persisted', () => {
    const defaultCol = createDefaultCollection();

    localStorage.setItem('color-token-generator', JSON.stringify({
      version: 5,
      collections: [
        {
          ...defaultCol,
          palettes: [],
          conflictedPalettes: [],
        },
      ],
      activeCollectionId: defaultCol.id,
      activePaletteId: 'missing-palette',
      config: makeConfig(),
      nameManuallyEdited: false,
      contrastAlgorithm: 'wcag',
      isDirty: true,
      hasCompletedFirstRun: true,
    }));

    const loaded = loadState();
    expect(loaded?.lastViewedSavedPaletteId).toBeNull();
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
      config: makeConfig(),
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
      config: makeConfig({ name: 'Draft', hue: 32 }),
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

  it('clears a dangling remembered saved palette id when hydrating', () => {
    const defaultCol = createDefaultCollection();
    localStorage.setItem('color-token-generator', JSON.stringify({
      version: 6,
      collections: [
        {
          ...defaultCol,
          palettes: [],
          conflictedPalettes: [],
        },
      ],
      activeCollectionId: defaultCol.id,
      activePaletteId: null,
      lastViewedSavedPaletteId: 'missing-palette',
      config: makeConfig(),
      nameManuallyEdited: false,
      contrastAlgorithm: 'wcag',
      isDirty: false,
      hasCompletedFirstRun: true,
    }));

    const loaded = loadState();
    const raw = JSON.parse(localStorage.getItem('color-token-generator')!);

    expect(loaded?.lastViewedSavedPaletteId).toBeNull();
    expect(raw.lastViewedSavedPaletteId).toBeNull();
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
      config: makeConfig({ name: 'Ocean', hue: 210, chroma: 0.12 }),
      nameManuallyEdited: true,
      contrastAlgorithm: 'wcag',
      isDirty: false,
      hasCompletedFirstRun: true,
    }));

    const loaded = loadState();

    expect(loaded?.collections[0].palettes.map((palette) => palette.name)).toEqual(['Ocean']);
    expect(loaded?.collections[0].conflictedPalettes.map((palette) => palette.name)).toEqual([' ocean ']);

    const raw = JSON.parse(localStorage.getItem('color-token-generator')!);
    expect(raw.version).toBe(12);
    expect(raw.collections[0].palettes).toHaveLength(1);
    expect(raw.collections[0].conflictedPalettes).toHaveLength(1);
  });
});

describe('createDefaultCollection', () => {
  it('creates a collection with expected defaults', () => {
    const col = createDefaultCollection();
    expect(col.name).toBe('My Project');
    expect(col.slug).toBe('my-project');
    expect(col.palettes).toHaveLength(0);
    expect(col.conflictedPalettes).toEqual([]);
    expect(col.id).toBeTruthy();
    expect(col.createdAt).toBeTruthy();
    expect(col.lastModifiedAt).toBeTruthy();
  });
});

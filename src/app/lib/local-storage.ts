// ─── localStorage Persistence Layer ───
// Versioned schema for forward-compatible storage.
// v1: flat palette array ("collection") with single active palette
// v2: multi-collection model — array of Collection containers
// v3: lightness50/lightness950 replace blackRange/whiteRange
// v4: targetColorSpace/generationVersion persisted per palette
// v5: duplicate palette names migrated into conflictedPalettes
// v6: remembered last-viewed saved palette id for draft seeding
// v7: density persisted per palette/config
// v8: chroma50/chroma950 persisted per palette/config
// v9: lightBias/darkBias persisted per palette/config
// v10: lightCurve/darkCurve become canonical; legacy bias fields remain read-compatible
// v11: curve sign semantics invert so +1 holds side chroma longer; persisted curves are remapped on read
// v12: +1 now favors the more saturated anchor on each side; persisted curves are remapped on read

import {
  DEFAULT_DARK_CURVE,
  DEFAULT_LIGHT_CURVE,
  GENERATION_VERSION,
  generatePalette,
  generateId,
  resolvePersistedCurveValues,
  type Palette,
} from './color-utils';
import { findPaletteLocation } from './collection-operations';
import {
  legacyRangeToLightness,
  type StoredCollectionV2,
  type StoredPaletteEntryV2,
  type StoredStateV1,
  type StoredStateV2,
} from './legacy-palette-compat';
import type { PaletteConfig, ContrastAlgorithm } from './palette-context-types';
import type { Collection } from './collection-types';
import { DEFAULT_PALETTE_DENSITY, isPaletteDensity } from './palette-density';
import {
  hasDuplicatePaletteNames,
  partitionPalettesByUniqueName,
} from './palette-name-validation';

const STORAGE_KEY = 'color-token-generator';
const CURRENT_VERSION = 12;

// ─── Stored types (lightweight, no derived tokens) ───

interface StoredPaletteEntry {
  id: string;
  name: string;
  hue: number;
  chroma50: number;
  chroma: number;
  chroma950: number;
  lightCurve?: number;
  darkCurve?: number;
  lightBias?: number;
  darkBias?: number;
  lightness50: number;
  lightness950: number;
  density: 5 | 7 | 9 | 11;
  targetColorSpace: 'srgb' | 'p3';
  generationVersion: number;
}

interface StoredCollection {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  lastModifiedAt: string;
  palettes: StoredPaletteEntry[];
  conflictedPalettes?: StoredPaletteEntry[];
}

interface StoredStateV3 {
  version: 3;
  collections: StoredCollection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
  config: PaletteConfig;
  nameManuallyEdited: boolean;
  contrastAlgorithm: ContrastAlgorithm;
  isDirty: boolean;
  hasCompletedFirstRun?: boolean;
}

interface StoredStateV4 {
  version: 4;
  collections: StoredCollection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
  config: PaletteConfig;
  nameManuallyEdited: boolean;
  contrastAlgorithm: ContrastAlgorithm;
  isDirty: boolean;
  hasCompletedFirstRun?: boolean;
}

interface StoredStateV5 {
  version: 5;
  collections: StoredCollection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
  config: PaletteConfig;
  nameManuallyEdited: boolean;
  contrastAlgorithm: ContrastAlgorithm;
  isDirty: boolean;
  hasCompletedFirstRun?: boolean;
}

interface StoredStateV6 {
  version: 6;
  collections: StoredCollection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
  lastViewedSavedPaletteId: string | null;
  config: PaletteConfig;
  nameManuallyEdited: boolean;
  contrastAlgorithm: ContrastAlgorithm;
  isDirty: boolean;
  hasCompletedFirstRun?: boolean;
}

interface StoredStateV7 {
  version: 7;
  collections: StoredCollection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
  lastViewedSavedPaletteId: string | null;
  config: PaletteConfig;
  nameManuallyEdited: boolean;
  contrastAlgorithm: ContrastAlgorithm;
  isDirty: boolean;
  hasCompletedFirstRun?: boolean;
}

interface StoredStateV8 {
  version: 8;
  collections: StoredCollection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
  lastViewedSavedPaletteId: string | null;
  config: PaletteConfig;
  nameManuallyEdited: boolean;
  contrastAlgorithm: ContrastAlgorithm;
  isDirty: boolean;
  hasCompletedFirstRun?: boolean;
}

interface StoredStateV9 {
  version: 9;
  collections: StoredCollection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
  lastViewedSavedPaletteId: string | null;
  config: PaletteConfig;
  nameManuallyEdited: boolean;
  contrastAlgorithm: ContrastAlgorithm;
  isDirty: boolean;
  hasCompletedFirstRun?: boolean;
}

interface StoredStateV10 {
  version: 10;
  collections: StoredCollection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
  lastViewedSavedPaletteId: string | null;
  config: PaletteConfig;
  nameManuallyEdited: boolean;
  contrastAlgorithm: ContrastAlgorithm;
  isDirty: boolean;
  hasCompletedFirstRun?: boolean;
}

interface StoredStateV11 {
  version: 11;
  collections: StoredCollection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
  lastViewedSavedPaletteId: string | null;
  config: PaletteConfig;
  nameManuallyEdited: boolean;
  contrastAlgorithm: ContrastAlgorithm;
  isDirty: boolean;
  hasCompletedFirstRun?: boolean;
}

interface StoredStateV12 {
  version: 12;
  collections: StoredCollection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
  lastViewedSavedPaletteId: string | null;
  config: PaletteConfig;
  nameManuallyEdited: boolean;
  contrastAlgorithm: ContrastAlgorithm;
  isDirty: boolean;
  hasCompletedFirstRun?: boolean;
}

// ─── Migration helpers ───

function withStoredChromaEndpoints<T extends {
  chroma?: unknown;
  chroma50?: unknown;
  chroma950?: unknown;
}>(value: T) {
  const fallback = typeof value.chroma === 'number' && Number.isFinite(value.chroma)
    ? Math.min(0.4, Math.max(0, value.chroma))
    : 0.18;

  return {
    chroma50: typeof value.chroma50 === 'number' && Number.isFinite(value.chroma50)
      ? Math.min(0.4, Math.max(0, value.chroma50))
      : fallback,
    chroma950: typeof value.chroma950 === 'number' && Number.isFinite(value.chroma950)
      ? Math.min(0.4, Math.max(0, value.chroma950))
      : fallback,
  };
}

function withStoredChromaCurves<T extends {
  lightCurve?: unknown;
  darkCurve?: unknown;
  lightBias?: unknown;
  darkBias?: unknown;
  generationVersion?: unknown;
}>(value: T) {
  const { lightCurve, darkCurve } = resolvePersistedCurveValues(value);
  return { lightCurve, darkCurve };
}

function hasValidStoredEntryCoreFields(entry: unknown): entry is {
  id: string;
  name: string;
  hue: number;
  chroma: number;
  lightness50: number;
  lightness950: number;
} {
  if (!entry || typeof entry !== 'object') return false;
  const obj = entry as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    obj.id.length > 0 &&
    typeof obj.name === 'string' &&
    isValidNumber(obj.hue, 0, 360) &&
    isValidNumber(obj.chroma, 0, 0.5) &&
    isValidNumber(obj.lightness50, 0, 1) &&
    isValidNumber(obj.lightness950, 0, 1)
  );
}

function migrateEntryV2ToV3(entry: StoredPaletteEntryV2): StoredPaletteEntry {
  const { lightness50, lightness950 } = legacyRangeToLightness(entry.blackRange, entry.whiteRange);
  return {
    id: entry.id,
    name: entry.name,
    hue: entry.hue,
    chroma50: entry.chroma,
    chroma: entry.chroma,
    chroma950: entry.chroma,
    ...withStoredChromaCurves(entry),
    lightness50,
    lightness950,
    density: DEFAULT_PALETTE_DENSITY,
    targetColorSpace: 'srgb',
    generationVersion: GENERATION_VERSION,
  };
}

function migrateConfigV2ToV3(config: Record<string, unknown>): PaletteConfig {
  const blackRange = typeof config.blackRange === 'number' ? config.blackRange : 0.85;
  const whiteRange = typeof config.whiteRange === 'number' ? config.whiteRange : 0.9;
  const { lightness50, lightness950 } = legacyRangeToLightness(blackRange, whiteRange);
  return {
    name: (config.name as string) || 'Untitled',
    hue: (config.hue as number) ?? 240,
    chroma50: (config.chroma as number) ?? 0.18,
    chroma: (config.chroma as number) ?? 0.18,
    chroma950: (config.chroma as number) ?? 0.18,
    ...withStoredChromaCurves(config),
    lightness50,
    lightness950,
    density: DEFAULT_PALETTE_DENSITY,
    targetColorSpace: 'srgb',
    generationVersion: GENERATION_VERSION,
  };
}

function migrateEntryV3ToV4(entry: Record<string, unknown>): StoredPaletteEntry | null {
  if (!hasValidStoredEntryCoreFields(entry)) return null;
  return {
    id: entry.id,
    name: entry.name,
    hue: entry.hue,
    ...withStoredChromaEndpoints(entry),
    ...withStoredChromaCurves(entry),
    chroma: entry.chroma,
    lightness50: entry.lightness50,
    lightness950: entry.lightness950,
    density: DEFAULT_PALETTE_DENSITY,
    targetColorSpace: entry.targetColorSpace === 'p3' ? 'p3' : 'srgb',
    generationVersion: GENERATION_VERSION,
  };
}

function migrateConfigV3ToV4(config: PaletteConfig): PaletteConfig {
  return {
    ...config,
    density: isPaletteDensity((config as Record<string, unknown>).density)
      ? config.density
      : DEFAULT_PALETTE_DENSITY,
    targetColorSpace: config.targetColorSpace === 'p3' ? 'p3' : 'srgb',
    generationVersion: GENERATION_VERSION,
  };
}

// ─── Conversion helpers ───

function paletteToStored(p: Palette): StoredPaletteEntry {
  return {
    id: p.id,
    name: p.name,
    hue: p.hue,
    chroma50: p.chroma50,
    chroma: p.chroma,
    chroma950: p.chroma950,
    ...withStoredChromaCurves(p),
    lightness50: p.lightness50,
    lightness950: p.lightness950,
    density: p.density,
    targetColorSpace: p.targetColorSpace === 'p3' ? 'p3' : 'srgb',
    generationVersion: GENERATION_VERSION,
  };
}

function storedToPalette(entry: StoredPaletteEntry): Palette {
  const tokens = generatePalette(
    entry.hue,
    entry.chroma50,
    entry.chroma,
    entry.chroma950,
    {
      lightness50: entry.lightness50,
      lightness950: entry.lightness950,
      lightCurve: entry.lightCurve,
      darkCurve: entry.darkCurve,
      targetColorSpace: entry.targetColorSpace,
    },
  );
  return {
    id: entry.id,
    name: entry.name,
    tokens,
    hue: entry.hue,
    chroma50: entry.chroma50,
    chroma: entry.chroma,
    chroma950: entry.chroma950,
    lightCurve: entry.lightCurve ?? DEFAULT_LIGHT_CURVE,
    darkCurve: entry.darkCurve ?? DEFAULT_DARK_CURVE,
    lightness50: entry.lightness50,
    lightness950: entry.lightness950,
    density: entry.density,
    targetColorSpace: entry.targetColorSpace,
    generationVersion: GENERATION_VERSION,
  };
}

function collectionToStored(c: Collection): StoredCollection {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    createdAt: c.createdAt,
    lastModifiedAt: c.lastModifiedAt,
    palettes: c.palettes.map(paletteToStored),
    conflictedPalettes: c.conflictedPalettes.map(paletteToStored),
  };
}

function normalizeConfig(config: PaletteConfig): PaletteConfig {
  return {
    ...config,
    ...withStoredChromaEndpoints(config),
    ...withStoredChromaCurves(config),
    density: isPaletteDensity(config.density) ? config.density : DEFAULT_PALETTE_DENSITY,
    targetColorSpace: config.targetColorSpace === 'p3' ? 'p3' : 'srgb',
    generationVersion: GENERATION_VERSION,
  };
}

function storedToCollection(s: StoredCollection): Collection {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    createdAt: s.createdAt,
    lastModifiedAt: s.lastModifiedAt,
    palettes: (s.palettes || []).filter(isValidStoredEntry).map(storedToPalette),
    conflictedPalettes: (s.conflictedPalettes || []).filter(isValidStoredEntry).map(storedToPalette),
  };
}

function sanitizeStoredCollection(
  collection: StoredCollection,
): { collection: StoredCollection; changed: boolean } {
  const validPalettes = Array.isArray(collection.palettes)
    ? collection.palettes.filter(isValidStoredEntry)
    : [];
  const validConflictedPalettes = Array.isArray(collection.conflictedPalettes)
    ? collection.conflictedPalettes.filter(isValidStoredEntry)
    : [];
  const partitioned = partitionPalettesByUniqueName(validPalettes);
  const conflictedPalettes = [
    ...validConflictedPalettes,
    ...partitioned.conflictedPalettes,
  ];

  const changed =
    !Array.isArray(collection.conflictedPalettes) ||
    partitioned.conflictedPalettes.length > 0 ||
    validPalettes.length !== collection.palettes.length ||
    validConflictedPalettes.length !== (collection.conflictedPalettes?.length ?? 0);

  return {
    collection: {
      ...collection,
      palettes: partitioned.activePalettes,
      conflictedPalettes,
    },
    changed,
  };
}

// ─── Validation ───

function isValidNumber(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && !Number.isNaN(v) && v >= min && v <= max;
}

function isValidTargetColorSpace(v: unknown): v is 'srgb' | 'p3' {
  return v === 'srgb' || v === 'p3';
}

function isValidConfig(c: unknown): c is PaletteConfig {
  if (!c || typeof c !== 'object') return false;
  const obj = c as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    obj.name.length > 0 &&
    isValidNumber(obj.hue, 0, 360) &&
    isValidNumber(obj.chroma50, 0, 0.5) &&
    isValidNumber(obj.chroma, 0, 0.5) &&
    isValidNumber(obj.chroma950, 0, 0.5) &&
    (obj.lightCurve === undefined || isValidNumber(obj.lightCurve, -1, 1)) &&
    (obj.darkCurve === undefined || isValidNumber(obj.darkCurve, -1, 1)) &&
    isValidNumber(obj.lightness50, 0, 1) &&
    isValidNumber(obj.lightness950, 0, 1) &&
    isPaletteDensity(obj.density) &&
    isValidTargetColorSpace(obj.targetColorSpace) &&
    typeof obj.generationVersion === 'number' &&
    Number.isFinite(obj.generationVersion) &&
    obj.generationVersion > 0
  );
}

function isValidStoredEntryBase(e: unknown): e is Omit<StoredPaletteEntry, 'density' | 'targetColorSpace' | 'generationVersion'> {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    obj.id.length > 0 &&
    typeof obj.name === 'string' &&
    isValidNumber(obj.hue, 0, 360) &&
    isValidNumber(obj.chroma50, 0, 0.5) &&
    isValidNumber(obj.chroma, 0, 0.5) &&
    isValidNumber(obj.chroma950, 0, 0.5) &&
    (obj.lightCurve === undefined || isValidNumber(obj.lightCurve, -1, 1)) &&
    (obj.darkCurve === undefined || isValidNumber(obj.darkCurve, -1, 1)) &&
    (obj.lightBias === undefined || isValidNumber(obj.lightBias, -1, 1)) &&
    (obj.darkBias === undefined || isValidNumber(obj.darkBias, -1, 1)) &&
    isValidNumber(obj.lightness50, 0, 1) &&
    isValidNumber(obj.lightness950, 0, 1)
  );
}

function isValidStoredEntry(e: unknown): e is StoredPaletteEntry {
  if (!isValidStoredEntryBase(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    isValidTargetColorSpace(obj.targetColorSpace) &&
    typeof obj.generationVersion === 'number' &&
    Number.isFinite(obj.generationVersion) &&
    obj.generationVersion > 0
  );
}

function isValidStoredCollection(c: unknown): c is StoredCollection {
  if (!c || typeof c !== 'object') return false;
  const obj = c as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    obj.id.length > 0 &&
    typeof obj.name === 'string' &&
    typeof obj.slug === 'string' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.lastModifiedAt === 'string' &&
    Array.isArray(obj.palettes) &&
    (!('conflictedPalettes' in obj) || Array.isArray(obj.conflictedPalettes))
  );
}

// ─── Migration: v1 → v2 → v3 ───

function migrateV1toV2(v1: StoredStateV1): StoredStateV2 {
  const now = new Date().toISOString();
  const defaultCollection: StoredCollectionV2 = {
    id: generateId(),
    name: 'My Collection',
    slug: 'my-collection',
    createdAt: now,
    lastModifiedAt: now,
    palettes: Array.isArray(v1.collection)
      ? v1.collection
      : [],
  };

  return {
    version: 2,
    collections: [defaultCollection],
    activeCollectionId: defaultCollection.id,
    activePaletteId: v1.activeCollectionId,
    config: v1.config,
    nameManuallyEdited: v1.nameManuallyEdited,
    contrastAlgorithm: v1.contrastAlgorithm,
    isDirty: v1.isDirty,
  };
}

function migrateV2toV3(v2: StoredStateV2): StoredStateV3 {
  return {
    version: 3,
    collections: v2.collections.map((c) => ({
      ...c,
      palettes: c.palettes.map(migrateEntryV2ToV3),
    })),
    activeCollectionId: v2.activeCollectionId,
    activePaletteId: v2.activePaletteId,
    config: migrateConfigV2ToV3(v2.config),
    nameManuallyEdited: v2.nameManuallyEdited,
    contrastAlgorithm: v2.contrastAlgorithm,
    isDirty: v2.isDirty,
  };
}

function migrateV3toV4(v3: StoredStateV3): StoredStateV4 {
  return {
    version: 4,
    collections: v3.collections.map((collection) => ({
      ...collection,
      palettes: collection.palettes
        .map((palette) => migrateEntryV3ToV4(palette as unknown as Record<string, unknown>))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
    })),
    activeCollectionId: v3.activeCollectionId,
    activePaletteId: v3.activePaletteId,
    config: migrateConfigV3ToV4(v3.config),
    nameManuallyEdited: v3.nameManuallyEdited,
    contrastAlgorithm: v3.contrastAlgorithm,
    isDirty: v3.isDirty,
    hasCompletedFirstRun: v3.hasCompletedFirstRun,
  };
}

function migrateV4toV5(v4: StoredStateV4): StoredStateV5 {
  const sanitizedCollections = v4.collections.map((collection) => {
    const normalizedCollection: StoredCollection = {
      ...collection,
      palettes: collection.palettes
        .map((palette) => migrateEntryV6ToV7(palette as unknown as Record<string, unknown>))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
      conflictedPalettes: Array.isArray(collection.conflictedPalettes)
        ? collection.conflictedPalettes
            .map((palette) => migrateEntryV6ToV7(palette as unknown as Record<string, unknown>))
            .filter((palette): palette is StoredPaletteEntry => palette !== null)
        : [],
    };

    return sanitizeStoredCollection(normalizedCollection).collection;
  });

  return {
    version: 5,
    collections: sanitizedCollections,
    activeCollectionId: v4.activeCollectionId,
    activePaletteId: v4.activePaletteId,
    config: normalizeConfig(v4.config),
    nameManuallyEdited: v4.nameManuallyEdited,
    contrastAlgorithm: v4.contrastAlgorithm,
    isDirty: v4.isDirty,
    hasCompletedFirstRun: v4.hasCompletedFirstRun,
  };
}

function migrateV5toV6(v5: StoredStateV5): StoredStateV6 {
  const activeCollection =
    typeof v5.activeCollectionId === 'string'
      ? v5.collections.find((collection) => collection.id === v5.activeCollectionId)
      : null;
  const lastViewedSavedPaletteId =
    typeof v5.activePaletteId === 'string' &&
    activeCollection?.palettes.some((palette) => palette.id === v5.activePaletteId)
      ? v5.activePaletteId
      : null;

  return {
    version: 6,
    collections: v5.collections,
    activeCollectionId: v5.activeCollectionId,
    activePaletteId: v5.activePaletteId,
    lastViewedSavedPaletteId,
    config: normalizeConfig(v5.config),
    nameManuallyEdited: v5.nameManuallyEdited,
    contrastAlgorithm: v5.contrastAlgorithm,
    isDirty: v5.isDirty,
    hasCompletedFirstRun: v5.hasCompletedFirstRun,
  };
}

function migrateEntryV6ToV7(entry: StoredPaletteEntry | Record<string, unknown>): StoredPaletteEntry | null {
  if (!hasValidStoredEntryCoreFields(entry)) return null;

  return {
    id: entry.id,
    name: entry.name,
    hue: entry.hue,
    ...withStoredChromaEndpoints(entry),
    ...withStoredChromaCurves(entry),
    chroma: entry.chroma,
    lightness50: entry.lightness50,
    lightness950: entry.lightness950,
    density: isPaletteDensity((entry as Record<string, unknown>).density)
      ? ((entry as Record<string, unknown>).density as StoredPaletteEntry['density'])
      : DEFAULT_PALETTE_DENSITY,
    targetColorSpace: (entry as Record<string, unknown>).targetColorSpace === 'p3' ? 'p3' : 'srgb',
    generationVersion: GENERATION_VERSION,
  };
}

function migrateV7toV8(v7: StoredStateV7): StoredStateV8 {
  return {
    version: 8,
    collections: v7.collections.map((collection) => ({
      ...collection,
      palettes: collection.palettes
        .map((palette) => migrateEntryV6ToV7(palette as unknown as Record<string, unknown>))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
      conflictedPalettes: (collection.conflictedPalettes ?? [])
        .map((palette) => migrateEntryV6ToV7(palette as unknown as Record<string, unknown>))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
    })),
    activeCollectionId: v7.activeCollectionId,
    activePaletteId: v7.activePaletteId,
    lastViewedSavedPaletteId: v7.lastViewedSavedPaletteId,
    config: normalizeConfig(v7.config),
    nameManuallyEdited: v7.nameManuallyEdited,
    contrastAlgorithm: v7.contrastAlgorithm,
    isDirty: v7.isDirty,
    hasCompletedFirstRun: v7.hasCompletedFirstRun,
  };
}

function migrateV8toV9(v8: StoredStateV8): StoredStateV9 {
  return {
    version: 9,
    collections: v8.collections.map((collection) => ({
      ...collection,
      palettes: collection.palettes
        .map((palette) => ({
          ...palette,
          ...withStoredChromaCurves(palette),
          generationVersion: GENERATION_VERSION,
        }))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
      conflictedPalettes: (collection.conflictedPalettes ?? [])
        .map((palette) => ({
          ...palette,
          ...withStoredChromaCurves(palette),
          generationVersion: GENERATION_VERSION,
        }))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
    })),
    activeCollectionId: v8.activeCollectionId,
    activePaletteId: v8.activePaletteId,
    lastViewedSavedPaletteId: v8.lastViewedSavedPaletteId,
    config: normalizeConfig(v8.config),
    nameManuallyEdited: v8.nameManuallyEdited,
    contrastAlgorithm: v8.contrastAlgorithm,
    isDirty: v8.isDirty,
    hasCompletedFirstRun: v8.hasCompletedFirstRun,
  };
}

function migrateV9toV10(v9: StoredStateV9): StoredStateV10 {
  return {
    version: 10,
    collections: v9.collections.map((collection) => ({
      ...collection,
      palettes: collection.palettes
        .map((palette) => ({
          ...palette,
          ...withStoredChromaCurves(palette),
          generationVersion: GENERATION_VERSION,
        }))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
      conflictedPalettes: (collection.conflictedPalettes ?? [])
        .map((palette) => ({
          ...palette,
          ...withStoredChromaCurves(palette),
          generationVersion: GENERATION_VERSION,
        }))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
    })),
    activeCollectionId: v9.activeCollectionId,
    activePaletteId: v9.activePaletteId,
    lastViewedSavedPaletteId: v9.lastViewedSavedPaletteId,
    config: normalizeConfig(v9.config),
    nameManuallyEdited: v9.nameManuallyEdited,
    contrastAlgorithm: v9.contrastAlgorithm,
    isDirty: v9.isDirty,
    hasCompletedFirstRun: v9.hasCompletedFirstRun,
  };
}

function migrateV10toV11(v10: StoredStateV10): StoredStateV11 {
  return {
    version: 11,
    collections: v10.collections.map((collection) => ({
      ...collection,
      palettes: collection.palettes
        .map((palette) => ({
          ...palette,
          ...withStoredChromaCurves(palette),
          generationVersion: GENERATION_VERSION,
        }))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
      conflictedPalettes: (collection.conflictedPalettes ?? [])
        .map((palette) => ({
          ...palette,
          ...withStoredChromaCurves(palette),
          generationVersion: GENERATION_VERSION,
        }))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
    })),
    activeCollectionId: v10.activeCollectionId,
    activePaletteId: v10.activePaletteId,
    lastViewedSavedPaletteId: v10.lastViewedSavedPaletteId,
    config: normalizeConfig(v10.config),
    nameManuallyEdited: v10.nameManuallyEdited,
    contrastAlgorithm: v10.contrastAlgorithm,
    isDirty: v10.isDirty,
    hasCompletedFirstRun: v10.hasCompletedFirstRun,
  };
}

function migrateV11toV12(v11: StoredStateV11): StoredStateV12 {
  return {
    version: 12,
    collections: v11.collections.map((collection) => ({
      ...collection,
      palettes: collection.palettes
        .map((palette) => ({
          ...palette,
          ...withStoredChromaCurves(palette),
          generationVersion: GENERATION_VERSION,
        }))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
      conflictedPalettes: (collection.conflictedPalettes ?? [])
        .map((palette) => ({
          ...palette,
          ...withStoredChromaCurves(palette),
          generationVersion: GENERATION_VERSION,
        }))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
    })),
    activeCollectionId: v11.activeCollectionId,
    activePaletteId: v11.activePaletteId,
    lastViewedSavedPaletteId: v11.lastViewedSavedPaletteId,
    config: normalizeConfig(v11.config),
    nameManuallyEdited: v11.nameManuallyEdited,
    contrastAlgorithm: v11.contrastAlgorithm,
    isDirty: v11.isDirty,
    hasCompletedFirstRun: v11.hasCompletedFirstRun,
  };
}

function migrateV6toV7(v6: StoredStateV6): StoredStateV7 {
  return {
    version: 7,
    collections: v6.collections.map((collection) => ({
      ...collection,
      palettes: collection.palettes
        .map((palette) => migrateEntryV6ToV7(palette as unknown as Record<string, unknown>))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
      conflictedPalettes: (collection.conflictedPalettes ?? [])
        .map((palette) => migrateEntryV6ToV7(palette as unknown as Record<string, unknown>))
        .filter((palette): palette is StoredPaletteEntry => palette !== null),
    })),
    activeCollectionId: v6.activeCollectionId,
    activePaletteId: v6.activePaletteId,
    lastViewedSavedPaletteId: v6.lastViewedSavedPaletteId,
    config: normalizeConfig({
      ...v6.config,
      density: isPaletteDensity((v6.config as Record<string, unknown>).density)
        ? v6.config.density
        : DEFAULT_PALETTE_DENSITY,
    }),
    nameManuallyEdited: v6.nameManuallyEdited,
    contrastAlgorithm: v6.contrastAlgorithm,
    isDirty: v6.isDirty,
    hasCompletedFirstRun: v6.hasCompletedFirstRun,
  };
}

// ─── Public API ───

export interface HydratedState {
  collections: Collection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
  lastViewedSavedPaletteId: string | null;
  config: PaletteConfig;
  nameManuallyEdited: boolean;
  contrastAlgorithm: ContrastAlgorithm;
  isDirty: boolean;
  hasCompletedFirstRun: boolean;
}

export function loadState(): HydratedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    let parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // ─── Migrate v1 → v2 ───
    if (parsed.version === 1) {
      parsed = migrateV1toV2(parsed as StoredStateV1);
    }

    // ─── Migrate v2 → v3 ───
    if (parsed.version === 2) {
      parsed = migrateV2toV3(parsed as StoredStateV2);
      // Persist the migration immediately
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    if (parsed.version === 3) {
      parsed = migrateV3toV4(parsed as StoredStateV3);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    if (parsed.version === 4) {
      parsed = migrateV4toV5(parsed as StoredStateV4);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    if (parsed.version === 5) {
      parsed = migrateV5toV6(parsed as StoredStateV5);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    if (parsed.version === 6) {
      parsed = migrateV6toV7(parsed as StoredStateV6);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    if (parsed.version === 7) {
      parsed = migrateV7toV8(parsed as StoredStateV7);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    if (parsed.version === 8) {
      parsed = migrateV8toV9(parsed as StoredStateV8);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    if (parsed.version === 9) {
      parsed = migrateV9toV10(parsed as StoredStateV9);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    if (parsed.version === 10) {
      parsed = migrateV10toV11(parsed as StoredStateV10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    if (parsed.version === 11) {
      parsed = migrateV11toV12(parsed as StoredStateV11);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    if (parsed.version !== CURRENT_VERSION) return null;

    const v12 = parsed as StoredStateV12;

    // Validate config
    if (!isValidConfig(v12.config)) return null;

    // Validate & rebuild collections
    const validStoredCollections = Array.isArray(v12.collections)
      ? v12.collections.filter(isValidStoredCollection)
      : [];

    let didSanitizeCollections = false;
    const collections = validStoredCollections.map((collection) => {
      const sanitized = sanitizeStoredCollection(collection);
      if (sanitized.changed) {
        didSanitizeCollections = true;
      }
      return storedToCollection(sanitized.collection);
    });

    // Validate activeCollectionId still exists
    const activeCollectionId =
      typeof v12.activeCollectionId === 'string' &&
      collections.some((c) => c.id === v12.activeCollectionId)
        ? v12.activeCollectionId
        : collections.length > 0 ? collections[0].id : null;

    // Validate activePaletteId still exists within the active collection
    const activeCollection = collections.find((c) => c.id === activeCollectionId);
    const activePaletteId =
      typeof v12.activePaletteId === 'string' &&
      activeCollection?.palettes.some((p) => p.id === v12.activePaletteId)
        ? v12.activePaletteId
        : null;

    const lastViewedSavedPaletteId =
      typeof v12.lastViewedSavedPaletteId === 'string' &&
      findPaletteLocation(collections, v12.lastViewedSavedPaletteId)
        ? v12.lastViewedSavedPaletteId
        : null;

    const shouldPersistNormalizedState =
      didSanitizeCollections ||
      activeCollectionId !== v12.activeCollectionId ||
      activePaletteId !== v12.activePaletteId ||
      lastViewedSavedPaletteId !== v12.lastViewedSavedPaletteId;

    if (shouldPersistNormalizedState) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: CURRENT_VERSION,
          collections: collections.map(collectionToStored),
          activeCollectionId,
          activePaletteId,
          lastViewedSavedPaletteId,
          config: normalizeConfig(v12.config),
          nameManuallyEdited: typeof v12.nameManuallyEdited === 'boolean' ? v12.nameManuallyEdited : false,
          contrastAlgorithm: v12.contrastAlgorithm === 'apca' ? 'apca' : 'wcag',
          isDirty: typeof v12.isDirty === 'boolean' ? v12.isDirty : false,
          hasCompletedFirstRun: typeof v12.hasCompletedFirstRun === 'boolean' ? v12.hasCompletedFirstRun : true,
        }),
      );
    }

    return {
      collections,
      activeCollectionId,
      activePaletteId,
      lastViewedSavedPaletteId,
      config: normalizeConfig(v12.config),
      nameManuallyEdited: typeof v12.nameManuallyEdited === 'boolean' ? v12.nameManuallyEdited : false,
      contrastAlgorithm: v12.contrastAlgorithm === 'apca' ? 'apca' : 'wcag',
      isDirty: typeof v12.isDirty === 'boolean' ? v12.isDirty : false,
      hasCompletedFirstRun: typeof v12.hasCompletedFirstRun === 'boolean' ? v12.hasCompletedFirstRun : true,
    };
  } catch {
    return null;
  }
}

export function saveState(state: {
  collections: Collection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
  lastViewedSavedPaletteId: string | null;
  config: PaletteConfig;
  nameManuallyEdited: boolean;
  contrastAlgorithm: ContrastAlgorithm;
  isDirty: boolean;
  hasCompletedFirstRun: boolean;
}): boolean {
  try {
    if (state.collections.some((collection) => hasDuplicatePaletteNames(collection.palettes))) {
      throw new Error('Duplicate active palette names cannot be persisted');
    }

    const stored: StoredStateV12 = {
      version: CURRENT_VERSION,
      collections: state.collections.map(collectionToStored),
      activeCollectionId: state.activeCollectionId,
      activePaletteId: state.activePaletteId,
      lastViewedSavedPaletteId: state.lastViewedSavedPaletteId,
      config: normalizeConfig(state.config),
      nameManuallyEdited: state.nameManuallyEdited,
      contrastAlgorithm: state.contrastAlgorithm,
      isDirty: state.isDirty,
      hasCompletedFirstRun: state.hasCompletedFirstRun,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    return true;
  } catch (err) {
    // Surface quota or availability errors so the caller can notify the user
    console.error('Failed to save state to localStorage:', err);
    return false;
  }
}

export function createDefaultCollection(palettes: Palette[] = []): Collection {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: 'My Collection',
    slug: 'my-collection',
    createdAt: now,
    lastModifiedAt: now,
    palettes,
    conflictedPalettes: [],
  };
}

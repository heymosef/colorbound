// ─── localStorage Persistence Layer ───
// Versioned schema for forward-compatible storage.
// v1: flat palette array ("collection") with single active palette
// v2: multi-collection model — array of Collection containers
// v3: lightness50/lightness950 replace blackRange/whiteRange
// v4: targetColorSpace/generationVersion persisted per palette

import { GENERATION_VERSION, generatePalette, generateId, type Palette } from './color-utils';
import {
  legacyRangeToLightness,
  type StoredCollectionV2,
  type StoredPaletteEntryV2,
  type StoredStateV1,
  type StoredStateV2,
} from './legacy-palette-compat';
import type { PaletteConfig, ContrastAlgorithm } from './palette-context-types';
import type { Collection } from './collection-types';
import {
  hasDuplicatePaletteNames,
  partitionPalettesByUniqueName,
} from './palette-name-validation';

const STORAGE_KEY = 'color-token-generator';
const CURRENT_VERSION = 5;

// ─── Stored types (lightweight, no derived tokens) ───

interface StoredPaletteEntry {
  id: string;
  name: string;
  hue: number;
  chroma: number;
  lightness50: number;
  lightness950: number;
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

// ─── Migration helpers ───

function migrateEntryV2ToV3(entry: StoredPaletteEntryV2): StoredPaletteEntry {
  const { lightness50, lightness950 } = legacyRangeToLightness(entry.blackRange, entry.whiteRange);
  return {
    id: entry.id,
    name: entry.name,
    hue: entry.hue,
    chroma: entry.chroma,
    lightness50,
    lightness950,
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
    chroma: (config.chroma as number) ?? 0.18,
    lightness50,
    lightness950,
    targetColorSpace: 'srgb',
    generationVersion: GENERATION_VERSION,
  };
}

function migrateEntryV3ToV4(entry: Record<string, unknown>): StoredPaletteEntry | null {
  if (!isValidStoredEntryBase(entry)) return null;
  return {
    id: entry.id,
    name: entry.name,
    hue: entry.hue,
    chroma: entry.chroma,
    lightness50: entry.lightness50,
    lightness950: entry.lightness950,
    targetColorSpace: entry.targetColorSpace === 'p3' ? 'p3' : 'srgb',
    generationVersion: GENERATION_VERSION,
  };
}

function migrateConfigV3ToV4(config: PaletteConfig): PaletteConfig {
  return {
    ...config,
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
    chroma: p.chroma,
    lightness50: p.lightness50,
    lightness950: p.lightness950,
    targetColorSpace: p.targetColorSpace === 'p3' ? 'p3' : 'srgb',
    generationVersion: p.generationVersion ?? GENERATION_VERSION,
  };
}

function storedToPalette(entry: StoredPaletteEntry): Palette {
  const tokens = generatePalette(
    entry.hue,
    entry.chroma,
    entry.lightness50,
    entry.lightness950,
    entry.targetColorSpace,
  );
  return {
    id: entry.id,
    name: entry.name,
    tokens,
    hue: entry.hue,
    chroma: entry.chroma,
    lightness50: entry.lightness50,
    lightness950: entry.lightness950,
    targetColorSpace: entry.targetColorSpace,
    generationVersion: entry.generationVersion,
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
    targetColorSpace: config.targetColorSpace === 'p3' ? 'p3' : 'srgb',
    generationVersion: config.generationVersion ?? GENERATION_VERSION,
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
    isValidNumber(obj.chroma, 0, 0.5) &&
    isValidNumber(obj.lightness50, 0, 1) &&
    isValidNumber(obj.lightness950, 0, 1) &&
    isValidTargetColorSpace(obj.targetColorSpace) &&
    obj.generationVersion === GENERATION_VERSION
  );
}

function isValidStoredEntryBase(e: unknown): e is Omit<StoredPaletteEntry, 'targetColorSpace' | 'generationVersion'> {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
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

function isValidStoredEntry(e: unknown): e is StoredPaletteEntry {
  if (!isValidStoredEntryBase(e)) return false;
  const obj = e as Record<string, unknown>;
  return isValidTargetColorSpace(obj.targetColorSpace) && obj.generationVersion === GENERATION_VERSION;
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
  const sanitizedCollections = v4.collections.map((collection) => sanitizeStoredCollection(collection).collection);

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

// ─── Public API ───

export interface HydratedState {
  collections: Collection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
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
      console.warn('[legacy-compat] local-storage-v1-migration');
      parsed = migrateV1toV2(parsed as StoredStateV1);
    }

    // ─── Migrate v2 → v3 ───
    if (parsed.version === 2) {
      console.warn('[legacy-compat] local-storage-v2-migration');
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

    if (parsed.version !== CURRENT_VERSION) return null;

    const v5 = parsed as StoredStateV5;

    // Validate config
    if (!isValidConfig(v5.config)) return null;

    // Validate & rebuild collections
    const validStoredCollections = Array.isArray(v5.collections)
      ? v5.collections.filter(isValidStoredCollection)
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
      typeof v5.activeCollectionId === 'string' &&
      collections.some((c) => c.id === v5.activeCollectionId)
        ? v5.activeCollectionId
        : collections.length > 0 ? collections[0].id : null;

    // Validate activePaletteId still exists within the active collection
    const activeCollection = collections.find((c) => c.id === activeCollectionId);
    const activePaletteId =
      typeof v5.activePaletteId === 'string' &&
      activeCollection?.palettes.some((p) => p.id === v5.activePaletteId)
        ? v5.activePaletteId
        : null;

    if (didSanitizeCollections) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: CURRENT_VERSION,
          collections: collections.map(collectionToStored),
          activeCollectionId,
          activePaletteId,
          config: normalizeConfig(v5.config),
          nameManuallyEdited: typeof v5.nameManuallyEdited === 'boolean' ? v5.nameManuallyEdited : false,
          contrastAlgorithm: v5.contrastAlgorithm === 'apca' ? 'apca' : 'wcag',
          isDirty: typeof v5.isDirty === 'boolean' ? v5.isDirty : false,
          hasCompletedFirstRun: typeof v5.hasCompletedFirstRun === 'boolean' ? v5.hasCompletedFirstRun : true,
        }),
      );
    }

    return {
      collections,
      activeCollectionId,
      activePaletteId,
      config: normalizeConfig(v5.config),
      nameManuallyEdited: typeof v5.nameManuallyEdited === 'boolean' ? v5.nameManuallyEdited : false,
      contrastAlgorithm: v5.contrastAlgorithm === 'apca' ? 'apca' : 'wcag',
      isDirty: typeof v5.isDirty === 'boolean' ? v5.isDirty : false,
      hasCompletedFirstRun: typeof v5.hasCompletedFirstRun === 'boolean' ? v5.hasCompletedFirstRun : true,
    };
  } catch {
    return null;
  }
}

export function saveState(state: {
  collections: Collection[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
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

    const stored: StoredStateV5 = {
      version: CURRENT_VERSION,
      collections: state.collections.map(collectionToStored),
      activeCollectionId: state.activeCollectionId,
      activePaletteId: state.activePaletteId,
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

// ─── Helper: create a default collection ───

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

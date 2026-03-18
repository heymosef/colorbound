// Temporary compatibility helpers for pre-v3 persisted data and shared payloads.
// This module intentionally isolates all legacy blackRange/whiteRange handling
// so the rest of the app can operate on the canonical lightness fields only.
// Removal criteria are tracked in guidelines/Batch5-Legacy-Removal.md.

export interface StoredPaletteEntryV2 {
  id: string;
  name: string;
  group: string;
  hue: number;
  chroma: number;
  curve: number;
  blackRange: number;
  whiteRange: number;
  isNeutral: boolean;
}

export interface StoredCollectionV2 {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  lastModifiedAt: string;
  palettes: StoredPaletteEntryV2[];
}

export interface StoredStateV2 {
  version: 2;
  collections: StoredCollectionV2[];
  activeCollectionId: string | null;
  activePaletteId: string | null;
  config: Record<string, unknown>;
  nameManuallyEdited: boolean;
  contrastAlgorithm: 'apca' | 'wcag';
  isDirty: boolean;
}

export interface StoredStateV1 {
  version: 1;
  collection: StoredPaletteEntryV2[];
  config: Record<string, unknown>;
  activeCollectionId: string | null;
  nameManuallyEdited: boolean;
  contrastAlgorithm: 'apca' | 'wcag';
  isDirty: boolean;
}

type NumberValidator = (value: unknown, min: number, max: number) => boolean;
type NumberClamper = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) => number;

const LEGACY_BLACK_RANGE_FALLBACK = 0.85;
const LEGACY_WHITE_RANGE_FALLBACK = 0.9;

export function legacyRangeToLightness(
  blackRange: number,
  whiteRange: number,
): { lightness50: number; lightness950: number } {
  const lightness950 = (1 - blackRange) * 0.15;
  const lightness50 = 1 - (1 - whiteRange) * 0.15;
  return { lightness50, lightness950 };
}

export function hasLegacyLightnessFields(
  obj: Record<string, unknown>,
  isValidNumber: NumberValidator,
): boolean {
  return (
    isValidNumber(obj.blackRange, 0, 1) &&
    isValidNumber(obj.whiteRange, 0, 1)
  );
}

export function normalizeLegacyLightnessFields(
  obj: Record<string, unknown>,
  clamp: NumberClamper,
): { lightness50: number; lightness950: number } {
  const blackRange = clamp(
    obj.blackRange,
    0,
    1,
    LEGACY_BLACK_RANGE_FALLBACK,
  );
  const whiteRange = clamp(
    obj.whiteRange,
    0,
    1,
    LEGACY_WHITE_RANGE_FALLBACK,
  );
  return legacyRangeToLightness(blackRange, whiteRange);
}

import {
  hasLegacyLightnessFields,
  normalizeLegacyLightnessFields,
} from "../../../src/app/lib/legacy-palette-compat.ts";

export const SHARE_SCHEMA_VERSION = 2;
export const CANONICAL_SHARE_FIELDS = [
  "name",
  "hue",
  "chroma",
  "lightness50",
  "lightness950",
] as const;
export const LEGACY_LIGHTNESS_FIELDS = [
  "blackRange",
  "whiteRange",
] as const;

export interface PaletteEntry {
  name: string;
  hue: number;
  chroma: number;
  lightness50: number;
  lightness950: number;
}

export function isValidNumber(v: unknown, min: number, max: number): boolean {
  return typeof v === "number" && !Number.isNaN(v) && v >= min && v <= max;
}

export function clampNumber(
  v: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function hasModernLightnessFields(obj: Record<string, unknown>): boolean {
  return (
    isValidNumber(obj.lightness50, 0, 1) &&
    isValidNumber(obj.lightness950, 0, 1)
  );
}

export function usesLegacyLightnessFields(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  return hasLegacyLightnessFields(e as Record<string, unknown>, isValidNumber);
}

export function normalizePaletteEntry(e: unknown): PaletteEntry | null {
  if (!e || typeof e !== "object") return null;
  const obj = e as Record<string, unknown>;

  let lightness50: number;
  let lightness950: number;
  if (hasModernLightnessFields(obj)) {
    lightness50 = obj.lightness50;
    lightness950 = obj.lightness950;
  } else if (hasLegacyLightnessFields(obj, isValidNumber)) {
    const normalized = normalizeLegacyLightnessFields(obj, clampNumber);
    lightness50 = normalized.lightness50;
    lightness950 = normalized.lightness950;
  } else {
    return null;
  }

  if (
    typeof obj.name === "string" &&
    obj.name.length > 0 &&
    obj.name.length <= 100 &&
    isValidNumber(obj.hue, 0, 360) &&
    isValidNumber(obj.chroma, 0, 0.4)
  ) {
    return {
      name: obj.name,
      hue: obj.hue,
      chroma: obj.chroma,
      lightness50,
      lightness950,
    };
  }

  return null;
}

export function sanitizePaletteEntry(e: PaletteEntry): PaletteEntry {
  return {
    name: e.name.slice(0, 100),
    hue: e.hue,
    chroma: e.chroma,
    lightness50: e.lightness50,
    lightness950: e.lightness950,
  };
}

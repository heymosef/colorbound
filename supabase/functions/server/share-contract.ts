import {
  hasLegacyLightnessFields,
  normalizeLegacyLightnessFields,
} from "../../../src/app/lib/legacy-palette-compat.ts";

export const SHARE_SCHEMA_VERSION = 5;
export const CANONICAL_SHARE_FIELDS = [
  "name",
  "hue",
  "chroma50",
  "chroma",
  "chroma950",
  "lightness50",
  "lightness950",
  "density",
  "targetColorSpace",
  "generationVersion",
] as const;
export const LEGACY_LIGHTNESS_FIELDS = [
  "blackRange",
  "whiteRange",
] as const;
export const DUPLICATE_PALETTE_NAME_MESSAGE =
  "A palette with this name already exists in this collection.";

export interface PaletteEntry {
  name: string;
  hue: number;
  chroma50: number;
  chroma: number;
  chroma950: number;
  lightness50: number;
  lightness950: number;
  density: 5 | 7 | 9 | 11;
  targetColorSpace: "srgb" | "p3";
  generationVersion: number;
}

function isValidDensity(v: unknown): v is PaletteEntry["density"] {
  return v === 5 || v === 7 || v === 9 || v === 11;
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
    const chroma = obj.chroma;
    return {
      name: obj.name,
      hue: obj.hue,
      chroma50: clampNumber(obj.chroma50, 0, 0.4, chroma),
      chroma,
      chroma950: clampNumber(obj.chroma950, 0, 0.4, chroma),
      lightness50,
      lightness950,
      density: isValidDensity(obj.density) ? obj.density : 11,
      targetColorSpace: obj.targetColorSpace === "p3" ? "p3" : "srgb",
      generationVersion: 2,
    };
  }

  return null;
}

export function sanitizePaletteEntry(e: PaletteEntry): PaletteEntry {
  return {
    name: e.name.slice(0, 100),
    hue: e.hue,
    chroma50: clampNumber(e.chroma50, 0, 0.4, e.chroma),
    chroma: e.chroma,
    chroma950: clampNumber(e.chroma950, 0, 0.4, e.chroma),
    lightness50: e.lightness50,
    lightness950: e.lightness950,
    density: isValidDensity(e.density) ? e.density : 11,
    targetColorSpace: e.targetColorSpace,
    generationVersion: 2,
  };
}

function normalizePaletteName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function getPaletteNameKey(name: string): string {
  return normalizePaletteName(name).toLocaleLowerCase();
}

export function hasDuplicatePaletteNames(
  palettes: Array<Pick<PaletteEntry, "name">>,
): boolean {
  const seen = new Set<string>();

  for (const palette of palettes) {
    const key = getPaletteNameKey(palette.name);
    if (!key || seen.has(key)) {
      return true;
    }
    seen.add(key);
  }

  return false;
}

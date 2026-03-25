import {
  hasLegacyLightnessFields,
  normalizeLegacyLightnessFields,
} from "../../../src/app/lib/legacy-palette-compat.ts";

export const SHARE_SCHEMA_VERSION = 9;
const DEFAULT_LIGHT_CURVE = 0;
const DEFAULT_DARK_CURVE = 0;
const LEGACY_AUTO_LIGHT_BIAS = 0.2;
const LEGACY_AUTO_DARK_BIAS = 0.35;
const CURRENT_GENERATION_VERSION = 6;
export const CANONICAL_SHARE_FIELDS = [
  "name",
  "hue",
  "chroma50",
  "chroma",
  "chroma950",
  "lightCurve",
  "darkCurve",
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
  lightCurve: number;
  darkCurve: number;
  lightBias?: number;
  darkBias?: number;
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

function normalizeSignedZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function hasModernLightnessFields(obj: Record<string, unknown>): boolean {
  return (
    isValidNumber(obj.lightness50, 0, 1) &&
    isValidNumber(obj.lightness950, 0, 1)
  );
}

function hasExplicitCurveValues(obj: Record<string, unknown>): boolean {
  return (
    (typeof obj.lightCurve === "number" && Number.isFinite(obj.lightCurve)) ||
    (typeof obj.darkCurve === "number" && Number.isFinite(obj.darkCurve)) ||
    (typeof obj.lightBias === "number" && Number.isFinite(obj.lightBias)) ||
    (typeof obj.darkBias === "number" && Number.isFinite(obj.darkBias))
  );
}

function resolveIncomingCurveValues(
  obj: Record<string, unknown>,
): { lightCurve: number; darkCurve: number } {
  const usesLegacyAutoDefaults =
    obj.lightCurve === undefined &&
    obj.darkCurve === undefined &&
    obj.lightBias === LEGACY_AUTO_LIGHT_BIAS &&
    obj.darkBias === LEGACY_AUTO_DARK_BIAS;

  const lightCurve = usesLegacyAutoDefaults
    ? DEFAULT_LIGHT_CURVE
    : clampNumber(
        obj.lightCurve,
        -1,
        1,
        clampNumber(obj.lightBias, -1, 1, DEFAULT_LIGHT_CURVE),
      );
  const darkCurve = usesLegacyAutoDefaults
    ? DEFAULT_DARK_CURVE
    : clampNumber(
        obj.darkCurve,
        -1,
        1,
        clampNumber(obj.darkBias, -1, 1, DEFAULT_DARK_CURVE),
      );
  const generationVersion =
    typeof obj.generationVersion === "number" && Number.isFinite(obj.generationVersion)
      ? obj.generationVersion
      : null;
  if (!hasExplicitCurveValues(obj) || generationVersion === CURRENT_GENERATION_VERSION) {
    return { lightCurve, darkCurve };
  }

  const chroma = typeof obj.chroma === "number" && Number.isFinite(obj.chroma)
    ? clampNumber(obj.chroma, 0, 0.4, 0)
    : 0;
  const lightEndpointChroma =
    typeof obj.chroma50 === "number" && Number.isFinite(obj.chroma50)
      ? clampNumber(obj.chroma50, 0, 0.4, chroma)
      : chroma;
  const darkEndpointChroma =
    typeof obj.chroma950 === "number" && Number.isFinite(obj.chroma950)
      ? clampNumber(obj.chroma950, 0, 0.4, chroma)
      : chroma;

  if (generationVersion !== null && generationVersion >= 5) {
    return {
      lightCurve: normalizeSignedZero(
        lightEndpointChroma < chroma
          ? clampNumber(-lightCurve, -1, 1, DEFAULT_LIGHT_CURVE)
          : lightCurve,
      ),
      darkCurve: normalizeSignedZero(
        darkEndpointChroma < chroma
          ? clampNumber(-darkCurve, -1, 1, DEFAULT_DARK_CURVE)
          : darkCurve,
      ),
    };
  }

  return {
    lightCurve: normalizeSignedZero(
      lightEndpointChroma > chroma
        ? clampNumber(-lightCurve, -1, 1, DEFAULT_LIGHT_CURVE)
        : lightCurve,
    ),
    darkCurve: normalizeSignedZero(
      darkEndpointChroma > chroma
        ? clampNumber(-darkCurve, -1, 1, DEFAULT_DARK_CURVE)
        : darkCurve,
    ),
  };
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

  const hasCanonicalCurves =
    (obj.lightCurve === undefined || isValidNumber(obj.lightCurve, -1, 1)) &&
    (obj.darkCurve === undefined || isValidNumber(obj.darkCurve, -1, 1));
  const hasLegacyCurves =
    (obj.lightBias === undefined || isValidNumber(obj.lightBias, -1, 1)) &&
    (obj.darkBias === undefined || isValidNumber(obj.darkBias, -1, 1));

  if (
    typeof obj.name === "string" &&
    obj.name.length > 0 &&
    obj.name.length <= 100 &&
    isValidNumber(obj.hue, 0, 360) &&
    isValidNumber(obj.chroma, 0, 0.4) &&
    hasCanonicalCurves &&
    hasLegacyCurves
  ) {
    const chroma = obj.chroma;
    const { lightCurve, darkCurve } = resolveIncomingCurveValues(obj);
    return {
      name: obj.name,
      hue: obj.hue,
      chroma50: clampNumber(obj.chroma50, 0, 0.4, chroma),
      chroma,
      chroma950: clampNumber(obj.chroma950, 0, 0.4, chroma),
      lightCurve,
      darkCurve,
      lightness50,
      lightness950,
      density: isValidDensity(obj.density) ? obj.density : 11,
      targetColorSpace: obj.targetColorSpace === "p3" ? "p3" : "srgb",
      generationVersion: CURRENT_GENERATION_VERSION,
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
    lightCurve: clampNumber(e.lightCurve, -1, 1, clampNumber(e.lightBias, -1, 1, DEFAULT_LIGHT_CURVE)),
    darkCurve: clampNumber(e.darkCurve, -1, 1, clampNumber(e.darkBias, -1, 1, DEFAULT_DARK_CURVE)),
    lightness50: e.lightness50,
    lightness950: e.lightness950,
    density: isValidDensity(e.density) ? e.density : 11,
    targetColorSpace: e.targetColorSpace,
    generationVersion: CURRENT_GENERATION_VERSION,
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

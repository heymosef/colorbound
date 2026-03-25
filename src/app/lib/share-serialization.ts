// ─── Share Serialization & Validation ───
// Centralized trust boundary for shared palette data.
// All untrusted payloads (API responses, URL params, user-generated input)
// MUST pass through the deserialize* functions before use.

import type { PaletteConfig } from './palette-context-types';
import {
  DEFAULT_DARK_CURVE,
  DEFAULT_LIGHT_CURVE,
  GENERATION_VERSION,
  generatePalette,
  generateDarkPalette,
  resolveLegacyCurveValues,
  resolvePersistedCurveValues,
  type Palette,
} from './color-utils';
import { DEFAULT_PALETTE_DENSITY, isPaletteDensity } from './palette-density';
import {
  hasLegacyLightnessFields,
  normalizeLegacyLightnessFields,
} from './legacy-palette-compat';
import type { SharedPaletteEntry } from './share-api';

// ─── Defaults ───

const DEFAULTS: Readonly<PaletteConfig> = {
  name: 'Untitled',
  hue: 240,
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
};

// ─── Low-level helpers ───

function clamp(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function isValidNumber(v: unknown, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function hasModernLightnessFields(obj: Record<string, unknown>): boolean {
  return 'lightness50' in obj || 'lightness950' in obj;
}

function safeString(v: unknown, maxLen: number, fallback: string): string {
  if (typeof v !== 'string' || v.length === 0) return fallback;
  return v.slice(0, maxLen);
}

// ─── Serialization (outgoing — config → shareable payload) ───

/** Serialize a PaletteConfig for sharing. Strips runtime fields, clamps values. */
export function serializePaletteConfig(config: PaletteConfig): SharedPaletteEntry {
  const { lightCurve, darkCurve } = resolveLegacyCurveValues(config);
  return {
    name: safeString(config.name, 100, DEFAULTS.name),
    hue: clamp(config.hue, 0, 360, DEFAULTS.hue),
    chroma50: clamp(config.chroma50, 0, 0.4, config.chroma),
    chroma: clamp(config.chroma, 0, 0.4, DEFAULTS.chroma),
    chroma950: clamp(config.chroma950, 0, 0.4, config.chroma),
    lightCurve,
    darkCurve,
    lightness50: clamp(config.lightness50, 0, 1, DEFAULTS.lightness50),
    lightness950: clamp(config.lightness950, 0, 1, DEFAULTS.lightness950),
    density: isPaletteDensity(config.density) ? config.density : DEFAULTS.density,
    targetColorSpace: config.targetColorSpace === 'p3' ? 'p3' : 'srgb',
    generationVersion: GENERATION_VERSION,
  };
}

/** Serialize a collection of palettes for sharing. */
export function serializeCollection(
  palettes: PaletteConfig[],
  name?: string,
): { palettes: SharedPaletteEntry[]; name: string } {
  return {
    name: safeString(name, 100, 'My Collection'),
    palettes: palettes.map((config) => serializePaletteConfig(config)),
  };
}

// ─── Deserialization (incoming — untrusted payload → validated config) ───

/**
 * Deserialize an untrusted payload into a PaletteConfig.
 * Falls back to safe defaults for missing/corrupt values.
 * Supports legacy blackRange/whiteRange fields during the compatibility window.
 * Returns null only if the payload is entirely empty or not an object.
 */
export function deserializePaletteConfig(payload: unknown): PaletteConfig | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;

  // Require at least one recognizable field to proceed
  const hasAnyField = ['hue', 'chroma50', 'chroma', 'chroma950', 'name', 'lightness50', 'lightness950', 'lightCurve', 'darkCurve', 'lightBias', 'darkBias', 'blackRange', 'whiteRange'].some(
    (k) => k in obj,
  );
  if (!hasAnyField) return null;

  // Handle legacy blackRange/whiteRange → lightness50/lightness950
  let l50 = DEFAULTS.lightness50;
  let l950 = DEFAULTS.lightness950;

  if (hasModernLightnessFields(obj)) {
    l50 = clamp(obj.lightness50, 0, 1, DEFAULTS.lightness50);
    l950 = clamp(obj.lightness950, 0, 1, DEFAULTS.lightness950);
  } else if (hasLegacyLightnessFields(obj, isValidNumber)) {
    const converted = normalizeLegacyLightnessFields(obj, clamp);
    l50 = converted.lightness50;
    l950 = converted.lightness950;
  }

  const { lightCurve, darkCurve } = resolvePersistedCurveValues(obj);

  return {
    name: safeString(obj.name, 100, DEFAULTS.name),
    hue: clamp(obj.hue, 0, 360, DEFAULTS.hue),
    chroma: clamp(obj.chroma, 0, 0.4, DEFAULTS.chroma),
    chroma50: clamp(obj.chroma50, 0, 0.4, clamp(obj.chroma, 0, 0.4, DEFAULTS.chroma)),
    chroma950: clamp(obj.chroma950, 0, 0.4, clamp(obj.chroma, 0, 0.4, DEFAULTS.chroma)),
    lightCurve,
    darkCurve,
    lightness50: l50,
    lightness950: l950,
    density: isPaletteDensity(obj.density) ? obj.density : DEFAULTS.density,
    targetColorSpace: obj.targetColorSpace === 'p3' ? 'p3' : DEFAULTS.targetColorSpace,
    generationVersion: GENERATION_VERSION,
  };
}

/** Deserialize an untrusted shared palette entry into a validated config. */
export function deserializePaletteEntry(payload: unknown): PaletteConfig | null {
  return deserializePaletteConfig(payload);
}

/**
 * Deserialize an untrusted collection payload.
 * Returns null if there are no recoverable palettes.
 */
export function deserializeCollection(
  payload: unknown,
): { name: string; entries: PaletteConfig[] } | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;

  if (!Array.isArray(obj.palettes) || obj.palettes.length === 0) return null;

  const entries = obj.palettes
    .map(deserializePaletteEntry)
    .filter((e): e is NonNullable<typeof e> => e !== null);

  if (entries.length === 0) return null;

  return {
    name: safeString(obj.name, 100, 'Shared Collection'),
    entries,
  };
}

// ─── Palette builders (from deserialized config) ───

/** Build a full Palette (with generated tokens) from a validated config. */
export function configToPalette(
  config: PaletteConfig,
  id: string,
): Palette {
  const density = isPaletteDensity(config.density) ? config.density : DEFAULTS.density;
  const chroma50 = config.chroma50 ?? config.chroma;
  const chroma950 = config.chroma950 ?? config.chroma;
  const { lightCurve, darkCurve } = resolveLegacyCurveValues(config);
  const tokens = generatePalette(
    config.hue,
    chroma50,
    config.chroma,
    chroma950,
    {
      lightness50: config.lightness50,
      lightness950: config.lightness950,
      lightCurve,
      darkCurve,
      targetColorSpace: config.targetColorSpace,
    },
  );
  return {
    id,
    name: config.name,
    tokens,
    hue: config.hue,
    chroma50,
    chroma: config.chroma,
    chroma950,
    lightCurve,
    darkCurve,
    lightness50: config.lightness50,
    lightness950: config.lightness950,
    density,
    targetColorSpace: config.targetColorSpace,
    generationVersion: GENERATION_VERSION,
  };
}

/** Build a dark-mode Palette from a validated config. */
export function configToDarkPalette(
  config: PaletteConfig,
  id: string,
): Palette {
  const density = isPaletteDensity(config.density) ? config.density : DEFAULTS.density;
  const chroma50 = config.chroma50 ?? config.chroma;
  const chroma950 = config.chroma950 ?? config.chroma;
  const { lightCurve, darkCurve } = resolveLegacyCurveValues(config);
  const tokens = generateDarkPalette(
    config.hue,
    chroma50,
    config.chroma,
    chroma950,
    {
      lightness50: config.lightness50,
      lightness950: config.lightness950,
      lightCurve,
      darkCurve,
      targetColorSpace: config.targetColorSpace,
    },
  );
  return {
    id,
    name: config.name,
    tokens,
    hue: config.hue,
    chroma50,
    chroma: config.chroma,
    chroma950,
    lightCurve,
    darkCurve,
    lightness50: config.lightness50,
    lightness950: config.lightness950,
    density,
    targetColorSpace: config.targetColorSpace,
    generationVersion: GENERATION_VERSION,
  };
}

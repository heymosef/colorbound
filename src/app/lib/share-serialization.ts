// ─── Share Serialization & Validation ───
// Centralized trust boundary for shared palette data.
// All untrusted payloads (API responses, URL params, user-generated input)
// MUST pass through the deserialize* functions before use.

import type { PaletteConfig } from './palette-context-types';
import { GENERATION_VERSION, generatePalette, generateDarkPalette, type Palette } from './color-utils';
import {
  hasLegacyLightnessFields,
  normalizeLegacyLightnessFields,
} from './legacy-palette-compat';
import type { SharedPaletteEntry } from './share-api';

// ─── Defaults ───

const DEFAULTS: Readonly<PaletteConfig> = {
  name: 'Untitled',
  hue: 240,
  chroma: 0.18,
  lightness50: 0.985,
  lightness950: 0.025,
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
  return {
    name: safeString(config.name, 100, DEFAULTS.name),
    hue: clamp(config.hue, 0, 360, DEFAULTS.hue),
    chroma: clamp(config.chroma, 0, 0.4, DEFAULTS.chroma),
    lightness50: clamp(config.lightness50, 0, 1, DEFAULTS.lightness50),
    lightness950: clamp(config.lightness950, 0, 1, DEFAULTS.lightness950),
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
  const hasAnyField = ['hue', 'chroma', 'name', 'lightness50', 'lightness950', 'blackRange', 'whiteRange'].some(
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
    console.warn('[legacy-compat] client-deserialized-legacy-share-payload');
    const converted = normalizeLegacyLightnessFields(obj, clamp);
    l50 = converted.lightness50;
    l950 = converted.lightness950;
  }

  return {
    name: safeString(obj.name, 100, DEFAULTS.name),
    hue: clamp(obj.hue, 0, 360, DEFAULTS.hue),
    chroma: clamp(obj.chroma, 0, 0.4, DEFAULTS.chroma),
    lightness50: l50,
    lightness950: l950,
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
  const tokens = generatePalette(
    config.hue,
    config.chroma,
    config.lightness50,
    config.lightness950,
    config.targetColorSpace,
  );
  return {
    id,
    name: config.name,
    tokens,
    hue: config.hue,
    chroma: config.chroma,
    lightness50: config.lightness50,
    lightness950: config.lightness950,
    targetColorSpace: config.targetColorSpace,
    generationVersion: config.generationVersion,
  };
}

/** Build a dark-mode Palette from a validated config. */
export function configToDarkPalette(
  config: PaletteConfig,
  id: string,
): Palette {
  const tokens = generateDarkPalette(
    config.hue,
    config.chroma,
    config.lightness50,
    config.lightness950,
    config.targetColorSpace,
  );
  return {
    id,
    name: config.name,
    tokens,
    hue: config.hue,
    chroma: config.chroma,
    lightness50: config.lightness50,
    lightness950: config.lightness950,
    targetColorSpace: config.targetColorSpace,
    generationVersion: config.generationVersion,
  };
}

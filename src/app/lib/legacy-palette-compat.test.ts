import { describe, expect, it } from 'vitest';
import {
  hasLegacyLightnessFields,
  legacyRangeToLightness,
  normalizeLegacyLightnessFields,
} from './legacy-palette-compat';

function isValidNumber(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

describe('legacyRangeToLightness', () => {
  it('converts default blackRange/whiteRange to expected lightness values', () => {
    const { lightness50, lightness950 } = legacyRangeToLightness(0.85, 0.9);
    expect(lightness50).toBeCloseTo(0.985, 4);
    expect(lightness950).toBeCloseTo(0.0225, 4);
  });

  it('converts extreme ranges correctly', () => {
    const { lightness50, lightness950 } = legacyRangeToLightness(1, 1);
    expect(lightness50).toBe(1);
    expect(lightness950).toBe(0);
  });
});

describe('legacy compatibility helpers', () => {
  it('detects a legacy lightness payload', () => {
    expect(
      hasLegacyLightnessFields(
        { blackRange: 0.85, whiteRange: 0.9 },
        isValidNumber,
      ),
    ).toBe(true);
  });

  it('normalizes legacy lightness payloads into canonical fields', () => {
    const normalized = normalizeLegacyLightnessFields(
      { blackRange: 0.85, whiteRange: 0.9 },
      clamp,
    );
    expect(normalized.lightness50).toBeCloseTo(0.985, 4);
    expect(normalized.lightness950).toBeCloseTo(0.0225, 4);
  });
});

import { describe, it, expect } from 'vitest';
import {
  oklchToRgb,
  rgbToHex,
  formatOklch,
  formatRgb,
  relativeLuminance,
  wcag2Contrast,
  getWcag2Rating,
  apcaContrast,
  getApcaRating,
  generatePalette,
  generateDarkPalette,
  deriveDarkPalette,
  generateId,
  suggestPaletteName,
  get500Oklch,
  SCALE_STEPS,
  exportAsCSS,
  exportAsFigmaTokens,
  exportAsFigmaVariables,
  exportAsJSON,
  formatHsl,
  isInSrgbGamut,
  isInP3Gamut,
  classifyGamut,
  gamutMapToSrgb,
  gamutMapToP3,
  formatP3,
  oklchToP3,
} from './color-utils';

// ─── OKLCH → RGB Conversion ───

describe('oklchToRgb', () => {
  it('converts pure black (L=0) to [0, 0, 0]', () => {
    const [r, g, b] = oklchToRgb(0, 0, 0);
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('converts pure white (L=1) to [255, 255, 255]', () => {
    const [r, g, b] = oklchToRgb(1, 0, 0);
    expect(r).toBe(255);
    expect(g).toBe(255);
    expect(b).toBe(255);
  });

  it('returns RGB values clamped to 0–255', () => {
    const [r, g, b] = oklchToRgb(0.5, 0.2, 270);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(255);
    expect(g).toBeGreaterThanOrEqual(0);
    expect(g).toBeLessThanOrEqual(255);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(255);
  });

  it('returns integers (rounded)', () => {
    const [r, g, b] = oklchToRgb(0.65, 0.15, 120);
    expect(Number.isInteger(r)).toBe(true);
    expect(Number.isInteger(g)).toBe(true);
    expect(Number.isInteger(b)).toBe(true);
  });

  it('produces a red-ish color for hue ~30', () => {
    const [r, g, b] = oklchToRgb(0.65, 0.2, 30);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it('produces a blue-ish color for hue ~260', () => {
    const [r, g, b] = oklchToRgb(0.5, 0.2, 260);
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });
});

// ─── rgbToHex ───

describe('rgbToHex', () => {
  it('converts black', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });

  it('converts white', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
  });

  it('converts red', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
  });

  it('pads single-digit hex values', () => {
    expect(rgbToHex(1, 2, 3)).toBe('#010203');
  });
});

// ─── Format Helpers ───

describe('formatOklch', () => {
  it('formats with correct precision', () => {
    const result = formatOklch({ l: 0.65, c: 0.15, h: 120.5 });
    expect(result).toBe('oklch(0.650 0.150 120.5)');
  });
});

describe('formatRgb', () => {
  it('formats correctly', () => {
    expect(formatRgb(128, 64, 32)).toBe('rgb(128, 64, 32)');
  });
});

describe('formatHsl', () => {
  it('returns a valid hsl() string', () => {
    const result = formatHsl(0.65, 0.15, 120);
    expect(result).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });
});

describe('formatP3', () => {
  it('returns a valid color(display-p3) string', () => {
    const result = formatP3(0.5, 0.6, 0.7);
    expect(result).toMatch(/^color\(display-p3 /);
  });
});

// ─── Relative Luminance ───

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0, 5);
  });

  it('returns 1 for white', () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 5);
  });

  it('returns value between 0 and 1', () => {
    const lum = relativeLuminance(128, 128, 128);
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });
});

// ─── WCAG 2 Contrast ───

describe('wcag2Contrast', () => {
  it('returns 21:1 for black on white', () => {
    const ratio = wcag2Contrast(0, 1);
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for same luminance', () => {
    const ratio = wcag2Contrast(0.5, 0.5);
    expect(ratio).toBeCloseTo(1, 5);
  });

  it('is symmetric (order of args does not matter)', () => {
    const a = wcag2Contrast(0.2, 0.8);
    const b = wcag2Contrast(0.8, 0.2);
    expect(a).toBeCloseTo(b, 5);
  });
});

describe('getWcag2Rating', () => {
  it('passes AAA for ratio >= 7', () => {
    const r = getWcag2Rating(7.5);
    expect(r.aaa).toBe(true);
    expect(r.aa).toBe(true);
    expect(r.aaLarge).toBe(true);
  });

  it('passes AA but not AAA for 4.5 <= ratio < 7', () => {
    const r = getWcag2Rating(5.0);
    expect(r.aaa).toBe(false);
    expect(r.aa).toBe(true);
    expect(r.aaLarge).toBe(true);
  });

  it('passes only large text for 3 <= ratio < 4.5', () => {
    const r = getWcag2Rating(3.5);
    expect(r.aaa).toBe(false);
    expect(r.aa).toBe(false);
    expect(r.aaLarge).toBe(true);
  });

  it('fails all for ratio < 3', () => {
    const r = getWcag2Rating(2.0);
    expect(r.aaa).toBe(false);
    expect(r.aa).toBe(false);
    expect(r.aaLarge).toBe(false);
  });
});

// ─── APCA Contrast ───

describe('apcaContrast', () => {
  it('returns a large positive value for black text on white bg', () => {
    const lc = apcaContrast(0, 0, 0, 255, 255, 255);
    expect(lc).toBeGreaterThan(90);
  });

  it('returns a value near 0 for same color text and bg', () => {
    const lc = apcaContrast(128, 128, 128, 128, 128, 128);
    expect(Math.abs(lc)).toBeLessThan(1);
  });
});

describe('getApcaRating', () => {
  it('passes all thresholds for Lc >= 75', () => {
    const r = getApcaRating(80);
    expect(r.bodyText).toBe(true);
    expect(r.largeText).toBe(true);
    expect(r.nonText).toBe(true);
  });

  it('fails body text for 60 <= Lc < 75', () => {
    const r = getApcaRating(65);
    expect(r.bodyText).toBe(false);
    expect(r.largeText).toBe(true);
    expect(r.nonText).toBe(true);
  });

  it('only passes non-text for 45 <= Lc < 60', () => {
    const r = getApcaRating(50);
    expect(r.bodyText).toBe(false);
    expect(r.largeText).toBe(false);
    expect(r.nonText).toBe(true);
  });

  it('uses absolute value (works with negative Lc)', () => {
    const r = getApcaRating(-80);
    expect(r.bodyText).toBe(true);
  });
});

// ─── Gamut Detection ───

describe('isInSrgbGamut', () => {
  it('returns true for black', () => {
    expect(isInSrgbGamut(0, 0, 0)).toBe(true);
  });

  it('returns true for white', () => {
    expect(isInSrgbGamut(1, 0, 0)).toBe(true);
  });

  it('returns true for a low-chroma mid-lightness blue', () => {
    expect(isInSrgbGamut(0.5, 0.1, 260)).toBe(true);
  });

  it('returns false for very high chroma', () => {
    expect(isInSrgbGamut(0.7, 0.35, 150)).toBe(false);
  });
});

describe('isInP3Gamut', () => {
  it('a color outside sRGB can be inside P3', () => {
    // A high-chroma green that exceeds sRGB but fits P3
    const l = 0.7, c = 0.25, h = 145;
    expect(isInSrgbGamut(l, c, h)).toBe(false);
    expect(isInP3Gamut(l, c, h)).toBe(true);
  });
});

describe('classifyGamut', () => {
  it('returns "srgb" for in-gamut colors', () => {
    expect(classifyGamut(0.5, 0.05, 200)).toBe('srgb');
  });

  it('returns "p3" for colors outside sRGB but inside P3', () => {
    expect(classifyGamut(0.7, 0.25, 145)).toBe('p3');
  });
});

// ─── Gamut Mapping ───

describe('gamutMapToSrgb', () => {
  it('preserves in-gamut colors', () => {
    const mapped = gamutMapToSrgb(0.5, 0.05, 200);
    expect(mapped.l).toBe(0.5);
    expect(mapped.c).toBeCloseTo(0.05, 3);
    expect(mapped.h).toBe(200);
  });

  it('reduces chroma for out-of-gamut colors', () => {
    const mapped = gamutMapToSrgb(0.7, 0.35, 150);
    expect(mapped.l).toBe(0.7);
    expect(mapped.h).toBe(150);
    expect(mapped.c).toBeLessThan(0.35);
    expect(mapped.c).toBeGreaterThan(0);
    // Result should be in gamut
    expect(isInSrgbGamut(mapped.l, mapped.c, mapped.h)).toBe(true);
  });

  it('preserves lightness and hue exactly', () => {
    const mapped = gamutMapToSrgb(0.6, 0.3, 270);
    expect(mapped.l).toBe(0.6);
    expect(mapped.h).toBe(270);
  });
});

describe('gamutMapToP3', () => {
  it('reduces chroma less than sRGB mapping for P3-only colors', () => {
    const l = 0.7, c = 0.25, h = 145;
    const srgbMapped = gamutMapToSrgb(l, c, h);
    const p3Mapped = gamutMapToP3(l, c, h);
    // P3 has a wider gamut, so less chroma reduction
    expect(p3Mapped.c).toBeGreaterThanOrEqual(srgbMapped.c);
  });
});

// ─── P3 conversion ───

describe('oklchToP3', () => {
  it('returns values in 0–1 range', () => {
    const [r, g, b] = oklchToP3(0.65, 0.15, 120);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(1);
    expect(g).toBeGreaterThanOrEqual(0);
    expect(g).toBeLessThanOrEqual(1);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThanOrEqual(1);
  });
});

// ─── Palette Generation ───

describe('generatePalette', () => {
  const tokens = generatePalette(210, 0.18, 0.985, 0.025);

  it('generates exactly 11 tokens', () => {
    expect(tokens).toHaveLength(11);
  });

  it('uses the correct scale steps', () => {
    const steps = tokens.map(t => t.step);
    expect(steps).toEqual(SCALE_STEPS);
  });

  it('produces tokens with decreasing lightness (50 → 950)', () => {
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i].oklch.l).toBeLessThanOrEqual(tokens[i - 1].oklch.l);
    }
  });

  it('all tokens have valid hex values', () => {
    for (const t of tokens) {
      expect(t.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('all tokens have valid CSS OKLCH strings', () => {
    for (const t of tokens) {
      expect(t.css).toMatch(/^oklch\(/);
    }
  });

  it('all tokens have P3 CSS strings', () => {
    for (const t of tokens) {
      expect(t.p3Css).toMatch(/^color\(display-p3 /);
    }
  });

  it('all tokens have gamut classification', () => {
    for (const t of tokens) {
      expect(['srgb', 'p3', 'out']).toContain(t.gamut);
    }
  });

  it('all tokens have gamut-mapped OKLCH', () => {
    for (const t of tokens) {
      expect(t.oklchMapped).toBeDefined();
      expect(t.oklchMapped.l).toBe(t.oklch.l);
      expect(t.oklchMapped.h).toBe(t.oklch.h);
      expect(t.oklchMapped.c).toBeLessThanOrEqual(t.oklch.c + 0.001);
    }
  });

  it('step 50 lightness matches lightness50 parameter', () => {
    const t50 = tokens.find(t => t.step === 50)!;
    expect(t50.oklch.l).toBeCloseTo(0.985, 2);
  });

  it('step 950 lightness matches lightness950 parameter', () => {
    const t950 = tokens.find(t => t.step === 950)!;
    expect(t950.oklch.l).toBeCloseTo(0.025, 2);
  });
});

describe('generateDarkPalette', () => {
  it('generates same number of tokens as light palette', () => {
    const light = generatePalette(210, 0.18, 0.985, 0.025);
    const dark = generateDarkPalette(210, 0.18, 0.985, 0.025);
    expect(dark).toHaveLength(light.length);
  });

  it('has the same steps as light palette', () => {
    const dark = generateDarkPalette(210, 0.18, 0.985, 0.025);
    expect(dark.map(t => t.step)).toEqual(SCALE_STEPS);
  });
});

describe('deriveDarkPalette', () => {
  it('preserves palette metadata while regenerating dark tokens', () => {
    const palette = {
      id: 'blue',
      name: 'Blue',
      tokens: generatePalette(210, 0.18, 0.985, 0.025),
      hue: 210,
      chroma: 0.18,
      lightness50: 0.985,
      lightness950: 0.025,
    };

    const darkPalette = deriveDarkPalette(palette);

    expect(darkPalette).toMatchObject({
      id: palette.id,
      name: palette.name,
      hue: palette.hue,
      chroma: palette.chroma,
      lightness50: palette.lightness50,
      lightness950: palette.lightness950,
    });
    expect(darkPalette.tokens).toHaveLength(palette.tokens.length);
    expect(darkPalette.tokens).not.toEqual(palette.tokens);
  });
});

// ─── ID Generation ───

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThan(0);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

// ─── Palette Name Suggestions ───

describe('get500Oklch', () => {
  it('returns an object with l, c, h properties', () => {
    const swatch = get500Oklch(210, 0.18);
    expect(swatch).toHaveProperty('l');
    expect(swatch).toHaveProperty('c');
    expect(swatch).toHaveProperty('h');
    expect(swatch.h).toBe(210);
  });

  it('matches the 500 token from generatePalette', () => {
    const tokens = generatePalette(210, 0.18, 0.985, 0.025);
    const token500 = tokens.find((t) => t.step === 500)!;
    const swatch = get500Oklch(210, 0.18, 0.985, 0.025);
    expect(swatch.l).toBeCloseTo(token500.oklch.l, 5);
    expect(swatch.c).toBeCloseTo(token500.oklch.c, 5);
    expect(swatch.h).toBe(token500.oklch.h);
  });

  it('drops to zero chroma when the 500-step lightness collapses to zero', () => {
    const swatch = get500Oklch(210, 0.18, 0, 0);
    expect(swatch.c).toBe(0);
  });
});

describe('suggestPaletteName', () => {
  it('returns a non-empty string for any hue at default chroma', () => {
    for (let h = 0; h < 360; h += 15) {
      const name = suggestPaletteName(h, 0.18);
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('returns different names for the same hue at different chromas', () => {
    const achromatic = suggestPaletteName(250, 0.01);
    const vivid = suggestPaletteName(250, 0.25);
    expect(achromatic).not.toBe(vivid);
  });

  it('returns achromatic-band names when the actual 500-step chroma is below threshold', () => {
    const name = suggestPaletteName(250, 0.01);
    expect(name).toBe('Slate');
  });

  it('uses the actual 500-step chroma, including lightness inputs', () => {
    const name = suggestPaletteName(250, 0.18, 0, 0);
    expect(name).toBe('Slate');
  });

  it('returns vivid-band names for high chroma', () => {
    const name = suggestPaletteName(250, 0.25);
    expect(name).toBe('Sapphire');
  });

  it('covers every hue region × chroma band uniquely', () => {
    const chromas = [0.01, 0.035, 0.06, 0.1, 0.25];
    const hues = [5, 25, 45, 65, 90, 120, 150, 175, 195, 225, 250, 270, 290, 310, 330, 350];
    const names = new Set<string>();

    for (const hue of hues) {
      for (const chroma of chromas) {
        const name = suggestPaletteName(hue, chroma);
        names.add(name);
      }
    }

    expect(names.size).toBe(80);
  });

  it('handles hue wrap-around (360° maps to red region)', () => {
    const at0 = suggestPaletteName(0, 0.18);
    const at360 = suggestPaletteName(360, 0.18);
    expect(at0).toBe(at360);
  });

  it('handles negative hue values', () => {
    const name = suggestPaletteName(-10, 0.18);
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });
});

// ─── Export Functions ───

describe('exportAsCSS', () => {
  const tokens = generatePalette(210, 0.18, 0.985, 0.025);
  const palette = {
    id: 'test',
    name: 'Blue',
    tokens,
    hue: 210,
    chroma: 0.18,
    lightness50: 0.985,
    lightness950: 0.025,
  };

  it('outputs a :root block with CSS custom properties', () => {
    const css = exportAsCSS([palette]);
    expect(css).toContain(':root');
    expect(css).toContain('--blue-50:');
  });

  it('includes all 11 steps', () => {
    const css = exportAsCSS([palette]);
    for (const step of SCALE_STEPS) {
      expect(css).toContain(`-${step}:`);
    }
  });

  it('respects prefix option', () => {
    const css = exportAsCSS([palette], { prefix: 'brand' });
    expect(css).toContain('--brand-blue-');
  });

  it('respects hex color format', () => {
    const css = exportAsCSS([palette], { colorFormat: 'hex' });
    expect(css).toMatch(/#[0-9a-f]{6}/);
  });

  it('supports P3 color format with fallback', () => {
    const css = exportAsCSS([palette], { colorFormat: 'p3' });
    expect(css).toContain('color(display-p3');
    expect(css).toContain('@supports');
  });
});

describe('exportAsJSON', () => {
  const tokens = generatePalette(210, 0.18, 0.985, 0.025);
  const palette = {
    id: 'test',
    name: 'Blue',
    tokens,
    hue: 210,
    chroma: 0.18,
    lightness50: 0.985,
    lightness950: 0.025,
  };

  it('produces valid JSON', () => {
    const json = exportAsJSON([palette]);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('contains all steps in output', () => {
    const json = exportAsJSON([palette]);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty('blue');
    for (const step of SCALE_STEPS) {
      expect(parsed).toHaveProperty(`blue.${step}`);
    }
  });
});

describe('exportAsFigmaVariables', () => {
  it('includes dark mode values for each palette in a collection export', () => {
    const collection = [
      {
        id: 'blue',
        name: 'Blue',
        tokens: generatePalette(210, 0.18, 0.985, 0.025),
        hue: 210,
        chroma: 0.18,
        lightness50: 0.985,
        lightness950: 0.025,
      },
      {
        id: 'rose',
        name: 'Rose',
        tokens: generatePalette(350, 0.16, 0.985, 0.025),
        hue: 350,
        chroma: 0.16,
        lightness50: 0.985,
        lightness950: 0.025,
      },
    ];

    const json = exportAsFigmaVariables(collection, {
      darkPalettes: collection.map(deriveDarkPalette),
    });
    const parsed = JSON.parse(json);
    const variables = parsed.collections[0].variables;

    expect(parsed.collections[0].modes).toEqual(['light', 'dark']);
    expect(variables).toHaveLength(collection.length * SCALE_STEPS.length);
    expect(variables.every((variable: { modeValues: Record<string, unknown> }) => 'dark' in variable.modeValues)).toBe(true);
    expect(variables.some((variable: { name: string }) => variable.name === 'blue/500')).toBe(true);
    expect(variables.some((variable: { name: string }) => variable.name === 'rose/500')).toBe(true);
  });
});

describe('exportAsFigmaTokens', () => {
  it('produces palette-keyed token files that match the Figma import contract', () => {
    const palette = {
      id: 'primary',
      name: 'Primary',
      tokens: generatePalette(110, 0.18, 0.985, 0.025),
      hue: 110,
      chroma: 0.18,
      lightness50: 0.985,
      lightness950: 0.025,
    };

    const json = exportAsFigmaTokens([palette]);
    const parsed = JSON.parse(json);

    expect(parsed.primary[500].$type).toBe('color');
    expect(parsed.primary[500].$value.colorSpace).toBe('srgb');
    expect(parsed.primary[500].$value.components).toHaveLength(3);
    expect(parsed.primary[500].$value.components.every((component: number) => component >= 0 && component <= 1)).toBe(true);
    expect(parsed.primary[500].$value.alpha).toBe(1);
    expect(parsed.primary[500].$value.hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(parsed.primary[500].$description).toBe('Primary 500');
    expect(parsed).not.toHaveProperty('$schema');
    expect(parsed).not.toHaveProperty('collections');
  });

  it('can export a dark-mode token file separately', () => {
    const palette = {
      id: 'primary',
      name: 'Primary',
      tokens: generatePalette(110, 0.18, 0.985, 0.025),
      hue: 110,
      chroma: 0.18,
      lightness50: 0.985,
      lightness950: 0.025,
    };

    const json = exportAsFigmaTokens([deriveDarkPalette(palette)]);
    const parsed = JSON.parse(json);

    expect(parsed.primary[500].$type).toBe('color');
    expect(parsed.primary[500].$value.colorSpace).toBe('srgb');
    expect(parsed.primary[500].$description).toBe('Primary 500');
  });
});

// OKLCH Color Utilities for Design System Token Generation
// Includes CSS Color Level 4 gamut mapping and Display P3 wide-gamut support.

export interface OklchColor {
  l: number; // Lightness 0-1
  c: number; // Chroma 0-0.4
  h: number; // Hue 0-360
}

/** Which gamut the *original* (pre-mapping) OKLCH color falls in. */
export type GamutFlag = 'srgb' | 'p3' | 'out';

export interface ColorToken {
  step: number;
  /** Original OKLCH value (may be outside sRGB). */
  oklch: OklchColor;
  /** Gamut-mapped OKLCH that fits sRGB (chroma reduced, L & H preserved). */
  oklchMapped: OklchColor;
  css: string;
  rgb: string;
  hex: string;
  /** CSS `color(display-p3 r g b)` string for wide-gamut displays. */
  p3Css: string;
  /** Whether the original OKLCH value is in sRGB, in P3 only, or outside both. */
  gamut: GamutFlag;
  /** CSS oklch() string for display: uses sRGB-mapped values so swatches match hex. */
  displayCss: string;
}

export interface Palette {
  id: string;
  name: string;
  tokens: ColorToken[];
  hue: number;
  chroma: number;
  /** Target OKLCH lightness for step 50 (lightest). 0–1, default 0.985. */
  lightness50: number;
  /** Target OKLCH lightness for step 950 (darkest). 0–1, default 0.025. */
  lightness950: number;
}

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// ─── Low-level Oklab / OKLCH conversions ───

function oklchToOklab(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  return [l, c * Math.cos(hRad), c * Math.sin(hRad)];
}

// ─── sRGB conversions ───

function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [r, g, bl];
}

function linearToSrgb(x: number): number {
  if (x <= 0.0031308) return 12.92 * x;
  return 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

function srgbToLinear(x: number): number {
  if (x <= 0.04045) return x / 12.92;
  return Math.pow((x + 0.055) / 1.055, 2.4);
}

function linearSrgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

// ─── Display P3 conversions ───
// Path: Oklab → cube-root LMS → linear LMS → XYZ (D65) → linear Display P3

/** Convert Oklab to linear Display P3 via XYZ intermediate. */
function oklabToLinearP3(L: number, a: number, b: number): [number, number, number] {
  // Oklab → cube-root LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  // Cube-root LMS → linear LMS
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // Linear LMS → XYZ (D65) — inverse of Oklab M1
  const x =  1.2270138511 * l - 0.5577999807 * m + 0.2812561490 * s;
  const y = -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s;
  const z = -0.0763812845 * l - 0.4214819784 * m + 1.5861632204 * s;

  // XYZ → linear Display P3
  const r =  2.4934969119 * x - 0.9313836179 * y - 0.4027107845 * z;
  const g = -0.8294889696 * x + 1.7626640603 * y + 0.0236246858 * z;
  const bl =  0.0358458302 * x - 0.0761723893 * y + 0.9568845240 * z;

  return [r, g, bl];
}

// ─── Gamut checking ───

const GAMUT_EPSILON = 0.0005;

/** Check whether an OKLCH color is within the sRGB gamut. */
export function isInSrgbGamut(l: number, c: number, h: number): boolean {
  if (l <= 0 || l >= 1) return c < GAMUT_EPSILON; // black/white edge cases
  const [L, a, b] = oklchToOklab(l, c, h);
  const [lr, lg, lb] = oklabToLinearSrgb(L, a, b);
  return lr >= -GAMUT_EPSILON && lr <= 1 + GAMUT_EPSILON &&
         lg >= -GAMUT_EPSILON && lg <= 1 + GAMUT_EPSILON &&
         lb >= -GAMUT_EPSILON && lb <= 1 + GAMUT_EPSILON;
}

/** Check whether an OKLCH color is within the Display P3 gamut. */
export function isInP3Gamut(l: number, c: number, h: number): boolean {
  if (l <= 0 || l >= 1) return c < GAMUT_EPSILON;
  const [L, a, b] = oklchToOklab(l, c, h);
  const [lr, lg, lb] = oklabToLinearP3(L, a, b);
  return lr >= -GAMUT_EPSILON && lr <= 1 + GAMUT_EPSILON &&
         lg >= -GAMUT_EPSILON && lg <= 1 + GAMUT_EPSILON &&
         lb >= -GAMUT_EPSILON && lb <= 1 + GAMUT_EPSILON;
}

/** Classify which gamut an OKLCH color occupies. */
export function classifyGamut(l: number, c: number, h: number): GamutFlag {
  if (isInSrgbGamut(l, c, h)) return 'srgb';
  if (isInP3Gamut(l, c, h)) return 'p3';
  return 'out';
}

// ─── CSS Color Level 4 Gamut Mapping ───
// Binary-search that reduces chroma while preserving lightness and hue
// until the colour fits within the target gamut.

function gamutMapBinarySearch(
  l: number,
  c: number,
  h: number,
  inGamut: (l: number, c: number, h: number) => boolean,
): OklchColor {
  if (c <= 0 || inGamut(l, c, h)) return { l, c, h };

  let lo = 0;
  let hi = c;
  const epsilon = 0.0001;
  // Max 30 iterations — converges in ~14 for typical values
  for (let i = 0; i < 30 && hi - lo > epsilon; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(l, mid, h)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return { l, c: lo, h };
}

/**
 * CSS Color Level 4 gamut mapping to sRGB.
 * Reduces chroma while preserving lightness and hue.
 */
export function gamutMapToSrgb(l: number, c: number, h: number): OklchColor {
  return gamutMapBinarySearch(l, c, h, isInSrgbGamut);
}

/**
 * CSS Color Level 4 gamut mapping to Display P3.
 * Reduces chroma while preserving lightness and hue.
 */
export function gamutMapToP3(l: number, c: number, h: number): OklchColor {
  return gamutMapBinarySearch(l, c, h, isInP3Gamut);
}

/**
 * Compute the maximum sRGB-in-gamut chroma for a given hue.
 * Finds the max chroma at the anchor lightness (step 500 midpoint).
 */
export function maxSrgbChromaForHue(
  hue: number,
  lightness50 = 0.985,
  lightness950 = 0.025,
  _curve = 0.5,
): number {
  return maxGamutChromaForHue(hue, lightness50, lightness950, isInSrgbGamut);
}

/**
 * Compute the maximum Display P3 in-gamut chroma for a given hue.
 * Same algorithm as sRGB variant but using the wider P3 boundary.
 */
export function maxP3ChromaForHue(
  hue: number,
  lightness50 = 0.985,
  lightness950 = 0.025,
  _curve = 0.5,
): number {
  return maxGamutChromaForHue(hue, lightness50, lightness950, isInP3Gamut);
}

/**
 * Generic max-chroma computation for any gamut check function.
 * Finds the maximum chroma at the anchor lightness (step 500) that stays in gamut.
 * Other steps use proportional C/L scaling and are individually gamut-mapped,
 * so the slider cap only needs to reflect the anchor point.
 */
function maxGamutChromaForHue(
  hue: number,
  lightness50: number,
  lightness950: number,
  inGamut: (l: number, c: number, h: number) => boolean,
): number {
  // Compute anchor lightness at step 500 (linear interpolation)
  const t = (500 - 50) / 900;
  const anchorL = lightness50 - t * (lightness50 - lightness950);

  // Binary search: find max chroma at anchor lightness
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 20 && hi - lo > 0.0005; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(anchorL, mid, hue)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // Clamp to a reasonable range and round to slider step
  return Math.round(Math.min(lo, 0.4) * 200) / 200; // snap to 0.005 step
}

// ─── Public conversion functions ───

/** Convert a hex color string to OKLCH { l, c, h }. */
export function hexToOklch(hex: string): OklchColor {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    : h;
  const r = srgbToLinear(parseInt(full.substring(0, 2), 16) / 255);
  const g = srgbToLinear(parseInt(full.substring(2, 4), 16) / 255);
  const b = srgbToLinear(parseInt(full.substring(4, 6), 16) / 255);

  const [L, a, bVal] = linearSrgbToOklab(r, g, b);
  const c = Math.sqrt(a * a + bVal * bVal);
  let hue = (Math.atan2(bVal, a) * 180) / Math.PI;
  if (hue < 0) hue += 360;

  return { l: L, c, h: hue };
}

/**
 * Convert OKLCH to sRGB [0–255] using CSS Color Level 4 gamut mapping.
 * Reduces chroma to fit sRGB while preserving lightness and hue.
 */
export function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  // Gamut-map: reduce chroma until it fits sRGB
  const mapped = gamutMapToSrgb(l, c, h);
  return oklchMappedToRgb(mapped.l, mapped.c, mapped.h);
}

/**
 * Convert already-gamut-mapped OKLCH to sRGB [0–255].
 * Skips the binary-search gamut mapping step — caller must ensure values are in-gamut.
 */
export function oklchMappedToRgb(l: number, c: number, h: number): [number, number, number] {
  const [L, a, b] = oklchToOklab(l, c, h);
  const [lr, lg, lb] = oklabToLinearSrgb(L, a, b);
  return [
    Math.round(Math.max(0, Math.min(1, linearToSrgb(lr))) * 255),
    Math.round(Math.max(0, Math.min(1, linearToSrgb(lg))) * 255),
    Math.round(Math.max(0, Math.min(1, linearToSrgb(lb))) * 255),
  ];
}

/**
 * Convert OKLCH to linear Display P3 [0–1] using gamut mapping.
 * Returns clamped [0–1] float values suitable for `color(display-p3 r g b)`.
 */
export function oklchToP3(l: number, c: number, h: number): [number, number, number] {
  const mapped = gamutMapToP3(l, c, h);
  const [L, a, b] = oklchToOklab(mapped.l, mapped.c, mapped.h);
  const [lr, lg, lb] = oklabToLinearP3(L, a, b);
  // P3 uses the same 2.4 gamma as sRGB
  return [
    Math.max(0, Math.min(1, linearToSrgb(lr))),
    Math.max(0, Math.min(1, linearToSrgb(lg))),
    Math.max(0, Math.min(1, linearToSrgb(lb))),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function formatOklch(color: OklchColor): string {
  return `oklch(${color.l.toFixed(3)} ${color.c.toFixed(3)} ${color.h.toFixed(1)})`;
}

export function formatRgb(r: number, g: number, b: number): string {
  return `rgb(${r}, ${g}, ${b})`;
}

/** Format as CSS `color(display-p3 r g b)` string. */
export function formatP3(r: number, g: number, b: number): string {
  return `color(display-p3 ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)})`;
}

// ─── Palette Generation ───

/**
 * Generate a perceptually smooth palette.
 *
 * @param lightness50  Target OKLCH lightness for step 50 (lightest token). Default ~0.985.
 * @param lightness950 Target OKLCH lightness for step 950 (darkest token). Default ~0.025.
 */
export function generatePalette(
  hue: number,
  maxChroma: number,
  lightness50: number,
  lightness950: number,
): ColorToken[] {
  const tokens: ColorToken[] = [];

  const maxL = lightness50;
  const minL = lightness950;

  // Pre-compute anchor lightness (step 500) and C/L ratio for proportional chroma scaling.
  // The slider chroma value represents the chroma at the anchor lightness.
  // All other steps scale proportionally: c = (chroma / anchorL) × l.
  const anchorT = (500 - 50) / 900;
  const anchorL = maxL - anchorT * (maxL - minL);
  const chromaLightnessRatio = anchorL > 0.001 ? maxChroma / anchorL : 0;

  for (const step of SCALE_STEPS) {
    // Map step to 0-1 range (50=bright, 950=dark)
    const t = (step - 50) / 900;

    // Lightness: linear interpolation from maxL (light) to minL (dark).
    // OKLCH lightness is perceptually uniform, so linear = even visual spacing.
    const l = maxL - t * (maxL - minL);

    // Chroma: proportional C/L scaling (like oklch.fyi).
    // Lighter steps get more chroma, darker steps less — matching the
    // natural gamut shape. Per-step gamut mapping handles any
    // out-of-gamut values at the extremes.
    const c = Math.max(0, Math.min(0.4, chromaLightnessRatio * l));
    const effectiveHue = hue;

    // Original OKLCH (may be outside sRGB)
    const originalColor: OklchColor = { l, c, h: effectiveHue };

    // Classify gamut
    const gamut = classifyGamut(l, c, effectiveHue);

    // Gamut-mapped sRGB values
    const mappedColor = gamutMapToSrgb(l, c, effectiveHue);
    const [r, g, b] = oklchMappedToRgb(mappedColor.l, mappedColor.c, mappedColor.h);
    const hex = rgbToHex(r, g, b);

    // Display P3 values
    const [p3r, p3g, p3b] = oklchToP3(l, c, effectiveHue);

    tokens.push({
      step,
      oklch: originalColor,
      oklchMapped: mappedColor,
      css: formatOklch(originalColor),
      rgb: formatRgb(r, g, b),
      hex,
      p3Css: formatP3(p3r, p3g, p3b),
      gamut,
      displayCss: formatOklch(mappedColor),
    });
  }

  return tokens;
}

// Generate dark mode optimized palette
export function generateDarkPalette(
  hue: number,
  maxChroma: number,
  lightness50: number,
  lightness950: number,
): ColorToken[] {
  return generatePalette(
    hue,
    maxChroma * 0.85,
    lightness50 * 0.995,
    lightness950 * 1.2,
  );
}

export function deriveDarkPalette(palette: Palette): Palette {
  return {
    ...palette,
    tokens: generateDarkPalette(
      palette.hue,
      palette.chroma,
      palette.lightness50,
      palette.lightness950,
    ),
  };
}

// ─── Contrast Utilities ───

// WCAG 2 Relative Luminance
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(v =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// WCAG 2 Contrast Ratio
export function wcag2Contrast(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// APCA Contrast (simplified Lc value)
export function apcaContrast(textR: number, textG: number, textB: number, bgR: number, bgG: number, bgB: number): number {
  const txtY = 0.2126729 * Math.pow(textR / 255, 2.4) +
               0.7151522 * Math.pow(textG / 255, 2.4) +
               0.0721750 * Math.pow(textB / 255, 2.4);
  const bgY = 0.2126729 * Math.pow(bgR / 255, 2.4) +
              0.7151522 * Math.pow(bgG / 255, 2.4) +
              0.0721750 * Math.pow(bgB / 255, 2.4);

  const txtClamp = txtY > 0.022 ? txtY : txtY + Math.pow(0.022 - txtY, 1.414);
  const bgClamp = bgY > 0.022 ? bgY : bgY + Math.pow(0.022 - bgY, 1.414);

  let contrast: number;
  if (bgClamp > txtClamp) {
    contrast = (Math.pow(bgClamp, 0.56) - Math.pow(txtClamp, 0.57)) * 1.14;
  } else {
    contrast = (Math.pow(bgClamp, 0.65) - Math.pow(txtClamp, 0.62)) * 1.14;
  }

  if (Math.abs(contrast) < 0.1) return 0;
  return contrast > 0 ? contrast * 100 : contrast * 100;
}

// Get contrast rating
export function getWcag2Rating(ratio: number): { aa: boolean; aaa: boolean; aaLarge: boolean } {
  return {
    aa: ratio >= 4.5,
    aaa: ratio >= 7,
    aaLarge: ratio >= 3,
  };
}

export function getApcaRating(lc: number): { bodyText: boolean; largeText: boolean; nonText: boolean } {
  const absLc = Math.abs(lc);
  return {
    bodyText: absLc >= 75,
    largeText: absLc >= 60,
    nonText: absLc >= 45,
  };
}

// ─── Name & Format Helpers ───

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function oklchToHsl(l: number, c: number, h: number): [number, number, number] {
  const [r, g, b] = oklchToRgb(l, c, h);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const light = (max + min) / 2;
  let sat = 0, hue = 0;
  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) hue = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) hue = ((bn - rn) / d + 2) / 6;
    else hue = ((rn - gn) / d + 4) / 6;
  }
  return [Math.round(hue * 360), Math.round(sat * 100), Math.round(light * 100)];
}

export function formatHsl(l: number, c: number, h: number): string {
  const [hh, ss, ll] = oklchToHsl(l, c, h);
  return `hsl(${hh}, ${ss}%, ${ll}%)`;
}

// ─── Export Functions ───

type ExportColorFormat = 'oklch' | 'hex' | 'rgb' | 'hsl' | 'p3';

function formatTokenValue(token: ColorToken, format: ExportColorFormat): string {
  const [r, g, b] = oklchToRgb(token.oklch.l, token.oklch.c, token.oklch.h);
  switch (format) {
    case 'hex': return token.hex;
    case 'rgb': return formatRgb(r, g, b);
    case 'hsl': return formatHsl(token.oklch.l, token.oklch.c, token.oklch.h);
    case 'p3': return token.p3Css;
    case 'oklch':
    default: return token.css;
  }
}

// Export palette as CSS Variables
export function exportAsCSS(palettes: Palette[], options?: { prefix?: string; colorFormat?: ExportColorFormat; darkPalettes?: Palette[] }): string {
  const prefix = options?.prefix ?? '';
  const format = (options?.colorFormat || 'oklch') as ExportColorFormat;
  const varPrefix = prefix ? `${prefix}-` : '';

  function formatValue(token: ColorToken): string {
    return formatTokenValue(token, format);
  }

  let css = '/* Light Mode Palette */\n:root {\n';
  for (const palette of palettes) {
    const name = sanitizeName(palette.name);
    for (const token of palette.tokens) {
      css += `  --${varPrefix}${name}-${token.step}: ${formatValue(token)};\n`;
    }
    css += '\n';
  }
  css += '}\n';

  // If OKLCH with sRGB fallback
  if (format === 'oklch') {
    css = '/* Light Mode Palette — sRGB Fallback */\n:root {\n';
    for (const palette of palettes) {
      const name = sanitizeName(palette.name);
      for (const token of palette.tokens) {
        const [r, g, b] = oklchToRgb(token.oklch.l, token.oklch.c, token.oklch.h);
        css += `  --${varPrefix}${name}-${token.step}: ${formatRgb(r, g, b)};\n`;
      }
      css += '\n';
    }
    css += '}\n\n';
    css += '/* Light Mode Palette — OKLCH (modern browsers) */\n@supports (color: oklch(0 0 0)) {\n  :root {\n';
    for (const palette of palettes) {
      const name = sanitizeName(palette.name);
      for (const token of palette.tokens) {
        css += `    --${varPrefix}${name}-${token.step}: ${token.css};\n`;
      }
      css += '\n';
    }
    css += '  }\n}\n';
  }

  // P3 with sRGB fallback
  if (format === 'p3') {
    css = '/* Light Mode Palette — sRGB Fallback */\n:root {\n';
    for (const palette of palettes) {
      const name = sanitizeName(palette.name);
      for (const token of palette.tokens) {
        const [r, g, b] = oklchToRgb(token.oklch.l, token.oklch.c, token.oklch.h);
        css += `  --${varPrefix}${name}-${token.step}: ${formatRgb(r, g, b)};\n`;
      }
      css += '\n';
    }
    css += '}\n\n';
    css += '/* Light Mode Palette — Display P3 (wide-gamut displays) */\n@supports (color: color(display-p3 0 0 0)) {\n  :root {\n';
    for (const palette of palettes) {
      const name = sanitizeName(palette.name);
      for (const token of palette.tokens) {
        css += `    --${varPrefix}${name}-${token.step}: ${token.p3Css};\n`;
      }
      css += '\n';
    }
    css += '  }\n}\n';
  }

  // Dark mode palettes
  const darkPals = options?.darkPalettes;
  if (darkPals && darkPals.length > 0) {
    css += '\n/* Dark Mode Palette */\n.dark,\n[data-theme="dark"] {\n';
    for (const palette of darkPals) {
      const name = sanitizeName(palette.name);
      for (const token of palette.tokens) {
        css += `  --${varPrefix}${name}-${token.step}: ${formatValue(token)};\n`;
      }
      css += '\n';
    }
    css += '}\n';

    if (format === 'oklch') {
      css += '\n@supports (color: oklch(0 0 0)) {\n  .dark,\n  [data-theme="dark"] {\n';
      for (const palette of darkPals) {
        const name = sanitizeName(palette.name);
        for (const token of palette.tokens) {
          css += `    --${varPrefix}${name}-${token.step}: ${token.css};\n`;
        }
        css += '\n';
      }
      css += '  }\n}\n';
    }

    if (format === 'p3') {
      css += '\n@supports (color: color(display-p3 0 0 0)) {\n  .dark,\n  [data-theme="dark"] {\n';
      for (const palette of darkPals) {
        const name = sanitizeName(palette.name);
        for (const token of palette.tokens) {
          css += `    --${varPrefix}${name}-${token.step}: ${token.p3Css};\n`;
        }
        css += '\n';
      }
      css += '  }\n}\n';
    }
  }

  return css;
}

// Export as Tailwind v4 @theme block
export function exportAsTailwind(palettes: Palette[], options?: { prefix?: string; colorFormat?: ExportColorFormat; darkPalettes?: Palette[] }): string {
  const prefix = options?.prefix ?? '';
  const format = (options?.colorFormat || 'oklch') as ExportColorFormat;
  const varPrefix = prefix ? `${prefix}-` : '';

  function formatValue(token: ColorToken): string {
    return formatTokenValue(token, format);
  }

  let output = '/* Tailwind v4 — paste into your CSS file */\n\n';

  // CSS custom properties first
  output += ':root {\n';
  for (const palette of palettes) {
    const name = sanitizeName(palette.name);
    for (const token of palette.tokens) {
      output += `  --${varPrefix}${name}-${token.step}: ${formatValue(token)};\n`;
    }
    output += '\n';
  }
  output += '}\n\n';

  // Dark mode
  const darkPals = options?.darkPalettes;
  if (darkPals && darkPals.length > 0) {
    output += '.dark {\n';
    for (const palette of darkPals) {
      const name = sanitizeName(palette.name);
      for (const token of palette.tokens) {
        output += `  --${varPrefix}${name}-${token.step}: ${formatValue(token)};\n`;
      }
      output += '\n';
    }
    output += '}\n\n';
  }

  // @theme block
  output += '@theme inline {\n';
  for (const palette of palettes) {
    const name = sanitizeName(palette.name);
    for (const token of palette.tokens) {
      output += `  --color-${name}-${token.step}: var(--${varPrefix}${name}-${token.step});\n`;
    }
    output += '\n';
  }
  output += '}\n';

  return output;
}

// Export as SCSS variables and map
export function exportAsSCSS(palettes: Palette[], options?: { colorFormat?: ExportColorFormat; darkPalettes?: Palette[] }): string {
  const format = (options?.colorFormat || 'hex') as ExportColorFormat;

  function formatValue(token: ColorToken): string {
    return formatTokenValue(token, format);
  }

  let output = '// Auto-generated color tokens\n// Format: ' + format.toUpperCase() + '\n\n';

  // Individual variables
  output += '// ─── Light Mode Variables ───\n\n';
  for (const palette of palettes) {
    const name = sanitizeName(palette.name);
    for (const token of palette.tokens) {
      output += `$${name}-${token.step}: ${formatValue(token)};\n`;
    }
    output += '\n';
  }

  // SCSS map
  output += '// ─── Light Mode Map ───\n\n';
  for (const palette of palettes) {
    const name = sanitizeName(palette.name);
    output += `$${name}: (\n`;
    for (let i = 0; i < palette.tokens.length; i++) {
      const token = palette.tokens[i];
      const comma = i < palette.tokens.length - 1 ? ',' : '';
      output += `  "${token.step}": ${formatValue(token)}${comma}\n`;
    }
    output += ');\n\n';
  }

  // Dark mode
  const darkPals = options?.darkPalettes;
  if (darkPals && darkPals.length > 0) {
    output += '// ─── Dark Mode Variables ───\n\n';
    for (const palette of darkPals) {
      const name = sanitizeName(palette.name);
      for (const token of palette.tokens) {
        output += `$${name}-dark-${token.step}: ${formatValue(token)};\n`;
      }
      output += '\n';
    }

    output += '// ─── Dark Mode Map ───\n\n';
    for (const palette of darkPals) {
      const name = sanitizeName(palette.name);
      output += `$${name}-dark: (\n`;
      for (let i = 0; i < palette.tokens.length; i++) {
        const token = palette.tokens[i];
        const comma = i < palette.tokens.length - 1 ? ',' : '';
        output += `  "${token.step}": ${formatValue(token)}${comma}\n`;
      }
      output += ');\n\n';
    }
  }

  return output;
}

// Export as JSON Design Tokens (simple)
export function exportAsJSON(palettes: Palette[], options?: { colorFormat?: ExportColorFormat; darkPalettes?: Palette[] }): string {
  const format = (options?.colorFormat || 'oklch') as ExportColorFormat;

  function formatValue(token: ColorToken): string {
    return formatTokenValue(token, format);
  }

  const obj: Record<string, Record<string, Record<string, string>>> = { light: {}, };
  for (const palette of palettes) {
    const key = sanitizeName(palette.name);
    obj.light[key] = {};
    for (const token of palette.tokens) {
      obj.light[key][String(token.step)] = formatValue(token);
    }
  }

  const darkPals = options?.darkPalettes;
  if (darkPals && darkPals.length > 0) {
    obj.dark = {};
    for (const palette of darkPals) {
      const key = sanitizeName(palette.name);
      obj.dark[key] = {};
      for (const token of palette.tokens) {
        obj.dark[key][String(token.step)] = formatValue(token);
      }
    }
  }

  // If no dark, flatten
  if (!darkPals || darkPals.length === 0) {
    return JSON.stringify(obj.light, null, 2);
  }
  return JSON.stringify(obj, null, 2);
}

// Export as W3C Design Tokens (DTCG format)
export function exportAsW3C(palettes: Palette[], options?: { darkPalettes?: Palette[] }): string {
  const obj: Record<string, Record<string, Record<string, object>>> = {};

  function buildGroup(pals: Palette[], suffix?: string): Record<string, Record<string, object>> {
    const group: Record<string, Record<string, object>> = {};
    for (const palette of pals) {
      const key = sanitizeName(palette.name) + (suffix || '');
      group[key] = {};
      for (const token of palette.tokens) {
        const [r, g, b] = oklchToRgb(token.oklch.l, token.oklch.c, token.oklch.h);
        group[key][String(token.step)] = {
          $value: token.css,
          $type: 'color',
          $description: `${palette.name} ${token.step}`,
          $extensions: {
            'com.figma': {
              hiddenFromPublishing: false,
              scopes: ['ALL_SCOPES'],
            },
            'org.w3c.design-tokens': {
              rgb: formatRgb(r, g, b),
              hex: token.hex,
              p3: token.p3Css,
              gamut: token.gamut,
              oklch: {
                l: +token.oklch.l.toFixed(4),
                c: +token.oklch.c.toFixed(4),
                h: +token.oklch.h.toFixed(1),
              },
            },
          },
        };
      }
    }
    return group;
  }

  obj.light = buildGroup(palettes);

  const darkPals = options?.darkPalettes;
  if (darkPals && darkPals.length > 0) {
    obj.dark = buildGroup(darkPals);
  }

  // Flatten if no dark
  if (!darkPals || darkPals.length === 0) {
    return JSON.stringify(obj.light, null, 2);
  }
  return JSON.stringify(obj, null, 2);
}

// Export as DTCG color tokens compatible with Figma Variables import.
export function exportAsFigmaTokens(palettes: Palette[]): string {
  const obj: Record<string, Record<string, object>> = {};

  for (const palette of palettes) {
    const key = sanitizeName(palette.name);
    obj[key] = {};

    for (const token of palette.tokens) {
      const [r, g, b] = oklchToRgb(token.oklch.l, token.oklch.c, token.oklch.h);
      obj[key][String(token.step)] = {
        $type: 'color',
        $value: {
          colorSpace: 'srgb',
          components: [
            +(r / 255).toFixed(6),
            +(g / 255).toFixed(6),
            +(b / 255).toFixed(6),
          ],
          alpha: 1,
          hex: token.hex.toUpperCase(),
        },
        $description: `${palette.name} ${token.step}`,
      };
    }
  }

  return JSON.stringify(obj, null, 2);
}

// Export as Figma Variables compatible JSON
export function exportAsFigmaVariables(palettes: Palette[], options?: { darkPalettes?: Palette[] }): string {
  const variables: Array<{
    name: string;
    type: string;
    resolvedValue: { r: number; g: number; b: number; a: number };
    modeValues: Record<string, { r: number; g: number; b: number; a: number }>;
  }> = [];

  for (const palette of palettes) {
    const name = sanitizeName(palette.name);
    for (const token of palette.tokens) {
      const [r, g, b] = oklchToRgb(token.oklch.l, token.oklch.c, token.oklch.h);
      const lightValue = { r: +(r / 255).toFixed(4), g: +(g / 255).toFixed(4), b: +(b / 255).toFixed(4), a: 1 };
      const modeValues: Record<string, { r: number; g: number; b: number; a: number }> = { light: lightValue };

      // Find matching dark palette token
      const darkPals = options?.darkPalettes;
      if (darkPals) {
        const darkPal = darkPals.find(p => sanitizeName(p.name) === name);
        if (darkPal) {
          const darkToken = darkPal.tokens.find(t => t.step === token.step);
          if (darkToken) {
            const [dr, dg, db] = oklchToRgb(darkToken.oklch.l, darkToken.oklch.c, darkToken.oklch.h);
            modeValues.dark = { r: +(dr / 255).toFixed(4), g: +(dg / 255).toFixed(4), b: +(db / 255).toFixed(4), a: 1 };
          }
        }
      }

      variables.push({
        name: `${name}/${token.step}`,
        type: 'COLOR',
        resolvedValue: lightValue,
        modeValues,
      });
    }
  }

  const output = {
    $schema: 'https://www.figma.com/plugin-api/variables',
    collections: [
      {
        name: 'Color Tokens',
        modes: options?.darkPalettes?.length ? ['light', 'dark'] : ['light'],
        variables,
      },
    ],
  };

  return JSON.stringify(output, null, 2);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// ─── Palette Name Suggestion ───

export function get500Oklch(
  hue: number,
  maxChroma: number,
  lightness50 = 0.985,
  lightness950 = 0.025,
): { l: number; c: number; h: number } {
  // Linear interpolation at step 500
  const t = (500 - 50) / 900;
  const l = lightness50 - t * (lightness50 - lightness950);
  const chromaLightnessRatio = l > 0.001 ? maxChroma / l : 0;
  const c = Math.max(0, Math.min(0.4, chromaLightnessRatio * l));

  return { l, c, h: hue };
}

// Chroma band thresholds
type ChromaBand = 'achromatic' | 'whisper' | 'muted' | 'clear' | 'vivid';

function getChromaBand(c: number): ChromaBand {
  if (c < 0.015) return 'achromatic';
  if (c < 0.04) return 'whisper';
  if (c < 0.08) return 'muted';
  if (c < 0.13) return 'clear';
  return 'vivid';
}

const COLOR_NAME_MATRIX: [number, string, string, string, string, string][] = [
  [15,      'Ash',       'Blush',      'Rosewood',   'Crimson',   'Scarlet'],
  [35,      'Stone',     'Bisque',     'Sienna',     'Rust',      'Tangerine'],
  [55,      'Sand',      'Champagne',  'Caramel',    'Amber',     'Marigold'],
  [75,      'Ivory',     'Buttercream', 'Honey',     'Saffron',   'Canary'],
  [105,     'Birch',     'Pistachio',  'Sage',       'Chartreuse','Lime'],
  [140,     'Fog',       'Celadon',    'Fern',       'Jade',      'Emerald'],
  [165,     'Mist',      'Mint',       'Eucalyptus', 'Malachite', 'Shamrock'],
  [185,     'Smoke',     'Seafoam',    'Verdigris',  'Teal',      'Lagoon'],
  [210,     'Silver',    'Ice',        'Glacier',    'Cyan',      'Arctic'],
  [240,     'Pewter',    'Powder',     'Cornflower', 'Azure',     'Cerulean'],
  [260,     'Slate',     'Steel',      'Wedgwood',   'Cobalt',    'Sapphire'],
  [280,     'Graphite',  'Lavender',   'Wisteria',   'Indigo',    'Ultramarine'],
  [300,     'Cinder',    'Thistle',    'Amethyst',   'Violet',    'Royal'],
  [320,     'Charcoal',  'Lilac',      'Plum',       'Orchid',    'Magenta'],
  [340,     'Flint',     'Petal',      'Peony',      'Fuchsia',   'Hot Pink'],
  [360,     'Dusk',      'Shell',      'Dusty Rose', 'Coral',     'Carmine'],
];

const BAND_INDEX: Record<ChromaBand, number> = {
  achromatic: 1,
  whisper: 2,
  muted: 3,
  clear: 4,
  vivid: 5,
};

export function suggestPaletteName(
  hue: number,
  maxChroma: number,
  lightness50 = 0.985,
  lightness950 = 0.025,
): string {
  const swatch = get500Oklch(hue, maxChroma, lightness50, lightness950);
  const band = getChromaBand(swatch.c);
  const h = ((swatch.h % 360) + 360) % 360;

  for (const row of COLOR_NAME_MATRIX) {
    if (h < row[0]) {
      return row[BAND_INDEX[band]] as string;
    }
  }
  return COLOR_NAME_MATRIX[0][BAND_INDEX[band]] as string;
}

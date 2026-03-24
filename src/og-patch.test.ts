import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it } from 'vitest';

// Importing the script executes it and registers patchOgTags on globalThis.__ogPatch
import '../public/og-patch.js';
const { patchOgTags } = (globalThis as unknown as { __ogPatch: { patchOgTags: (pathname: string) => void } }).__ogPatch;

const PALETTE_TITLE = 'Shared OKLCH palette \u2014 Colorbound';
const PALETTE_DESC =
  'Preview a perceptually uniform OKLCH color palette. Explore token ramps, check contrast, and import it into your workspace with Colorbound.';
const COLLECTION_TITLE = 'Shared OKLCH collection \u2014 Colorbound';
const COLLECTION_DESC =
  'Browse a shared set of OKLCH color palettes. Preview ramps, compare swatches, and import them into your workspace with Colorbound.';
const DEFAULT_TITLE = 'Colorbound \u2014 Generate OKLCH color palettes';
const DEFAULT_DESC =
  'Create perceptually uniform OKLCH color palettes for design systems, preview ramps, check accessibility, and export tokens to CSS, Tailwind, JSON, DTCG, and Figma.';

function setupHead() {
  document.head.innerHTML = `
    <meta property="og:title" content="${DEFAULT_TITLE}" />
    <meta property="og:description" content="${DEFAULT_DESC}" />
    <meta property="og:url" content="https://colorbound.dev/" />
    <meta name="twitter:title" content="${DEFAULT_TITLE}" />
    <meta name="twitter:description" content="${DEFAULT_DESC}" />
  `;
}

function getMeta(selector: string) {
  return document.querySelector(selector)?.getAttribute('content') ?? null;
}

describe('patchOgTags', () => {
  beforeEach(() => {
    setupHead();
  });

  it('sets palette-specific tags for /p/ paths', () => {
    patchOgTags('/p/abc123');

    expect(getMeta('meta[property="og:title"]')).toBe(PALETTE_TITLE);
    expect(getMeta('meta[property="og:description"]')).toBe(PALETTE_DESC);
    expect(getMeta('meta[property="og:url"]')).toBe('https://colorbound.dev/p/abc123');
    expect(getMeta('meta[name="twitter:title"]')).toBe(PALETTE_TITLE);
    expect(getMeta('meta[name="twitter:description"]')).toBe(PALETTE_DESC);
  });

  it('sets collection-specific tags for /c/ paths', () => {
    patchOgTags('/c/xyz789');

    expect(getMeta('meta[property="og:title"]')).toBe(COLLECTION_TITLE);
    expect(getMeta('meta[property="og:description"]')).toBe(COLLECTION_DESC);
    expect(getMeta('meta[property="og:url"]')).toBe('https://colorbound.dev/c/xyz789');
    expect(getMeta('meta[name="twitter:title"]')).toBe(COLLECTION_TITLE);
    expect(getMeta('meta[name="twitter:description"]')).toBe(COLLECTION_DESC);
  });

  it('leaves generic defaults unchanged for unrecognised paths', () => {
    patchOgTags('/about');

    expect(getMeta('meta[property="og:title"]')).toBe(DEFAULT_TITLE);
    expect(getMeta('meta[property="og:description"]')).toBe(DEFAULT_DESC);
    expect(getMeta('meta[property="og:url"]')).toBe('https://colorbound.dev/');
    expect(getMeta('meta[name="twitter:title"]')).toBe(DEFAULT_TITLE);
    expect(getMeta('meta[name="twitter:description"]')).toBe(DEFAULT_DESC);
  });

  it('leaves generic defaults unchanged for the root path', () => {
    patchOgTags('/');

    expect(getMeta('meta[property="og:title"]')).toBe(DEFAULT_TITLE);
    expect(getMeta('meta[property="og:url"]')).toBe('https://colorbound.dev/');
  });
});

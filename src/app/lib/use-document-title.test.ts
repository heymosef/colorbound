import '@testing-library/jest-dom/vitest';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDocumentTitle } from './use-document-title';

const DEFAULT_TITLE = 'Colorbound \u2014 Generate OKLCH color palettes';
const DEFAULT_DESC =
  'Create perceptually uniform OKLCH color palettes for design systems, preview ramps, check accessibility, and export tokens to CSS, Tailwind, JSON, DTCG, and Figma.';

function getMeta(selector: string) {
  return document.querySelector(selector)?.getAttribute('content') ?? null;
}

function setupHead() {
  document.head.innerHTML = `
    <meta name="description" content="${DEFAULT_DESC}" />
    <meta property="og:title" content="${DEFAULT_TITLE}" />
    <meta property="og:description" content="${DEFAULT_DESC}" />
    <meta property="og:url" content="https://colorbound.dev/" />
    <meta name="twitter:title" content="${DEFAULT_TITLE}" />
    <meta name="twitter:description" content="${DEFAULT_DESC}" />
  `;
}

describe('useDocumentTitle', () => {
  beforeEach(() => {
    setupHead();
    document.title = DEFAULT_TITLE;
  });

  it('updates all meta tags with the provided title and description', () => {
    renderHook(() =>
      useDocumentTitle('Ocean — OKLCH palette', 'A beautiful palette.'),
    );

    expect(document.title).toBe('Ocean — OKLCH palette');
    expect(getMeta('meta[name="description"]')).toBe('A beautiful palette.');
    expect(getMeta('meta[property="og:title"]')).toBe('Ocean — OKLCH palette');
    expect(getMeta('meta[property="og:description"]')).toBe('A beautiful palette.');
    expect(getMeta('meta[name="twitter:title"]')).toBe('Ocean — OKLCH palette');
    expect(getMeta('meta[name="twitter:description"]')).toBe('A beautiful palette.');
  });

  it('updates og:url to the current location href', () => {
    renderHook(() => useDocumentTitle('Test', 'Desc'));

    // jsdom default href is 'about:blank'; the tag should be set to window.location.href
    expect(getMeta('meta[property="og:url"]')).toBe(window.location.href);
  });

  it('falls back to default title when null is passed', () => {
    renderHook(() => useDocumentTitle(null));

    expect(document.title).toBe(DEFAULT_TITLE);
    expect(getMeta('meta[property="og:title"]')).toBe(DEFAULT_TITLE);
  });

  it('restores all defaults on unmount', () => {
    const { unmount } = renderHook(() =>
      useDocumentTitle('Temporary Title', 'Temporary description.'),
    );

    unmount();

    expect(document.title).toBe(DEFAULT_TITLE);
    expect(getMeta('meta[name="description"]')).toBe(DEFAULT_DESC);
    expect(getMeta('meta[property="og:title"]')).toBe(DEFAULT_TITLE);
    expect(getMeta('meta[property="og:description"]')).toBe(DEFAULT_DESC);
    expect(getMeta('meta[property="og:url"]')).toBe('https://colorbound.dev/');
    expect(getMeta('meta[name="twitter:title"]')).toBe(DEFAULT_TITLE);
    expect(getMeta('meta[name="twitter:description"]')).toBe(DEFAULT_DESC);
  });
});

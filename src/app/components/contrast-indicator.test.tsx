import React from 'react';
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ContrastPairSelector } from './contrast-indicator';
import { SCALE_STEPS, type ColorToken, type Palette } from '../lib/color-utils';

let paletteContextValue: any;

vi.mock('../lib/palette-context', () => ({
  usePaletteContext: () => paletteContextValue,
}));

vi.mock('../lib/use-supports-p3', () => ({
  useSupportsP3: () => false,
  getTokenDisplayColor: (_token: unknown, _supportsP3: unknown) => '#000000',
}));

vi.mock('../lib/analytics', () => ({
  track: vi.fn(),
}));

vi.mock('./ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children, ...props }: any) => <button type="button" {...props}>{children}</button>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('./ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('./ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('./ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('./ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <>{children}</>,
}));

function makeToken(step: number): ColorToken {
  return {
    step,
    targetColorSpace: 'srgb',
    authoredOklch: { l: 0.5, c: 0.1, h: 200 },
    srgbOklch: { l: 0.5, c: 0.1, h: 200 },
    p3Oklch: { l: 0.5, c: 0.1, h: 200 },
    targetOklch: { l: 0.5, c: 0.1, h: 200 },
    authoredCss: 'oklch(0.5 0.1 200)',
    srgbCss: 'oklch(0.5 0.1 200)',
    targetCss: 'oklch(0.5 0.1 200)',
    rgb: 'rgb(0, 0, 0)',
    hex: '#000000',
    p3Css: 'color(display-p3 0 0 0)',
    authoredGamut: 'srgb',
    fallbackDiffers: false,
  };
}

function makePalette(density: 5 | 7 | 9 | 11): Palette {
  return {
    id: 'palette-1',
    name: 'Ocean',
    tokens: SCALE_STEPS.map((step) => makeToken(step)),
    hue: 210,
    chroma50: 0.12,
    chroma: 0.12,
    chroma950: 0.12,
    lightness50: 0.985,
    lightness950: 0.025,
    density,
    targetColorSpace: 'srgb',
    generationVersion: 6,
  };
}

beforeEach(() => {
  paletteContextValue = {
    contrastAlgorithm: 'wcag2',
    setContrastAlgorithm: vi.fn(),
  };
});

describe('ContrastPairSelector density-filtered dropdowns', () => {
  it('shows only 5 steps (50, 300, 500, 700, 950) when density is 5', () => {
    render(<ContrastPairSelector palette={makePalette(5)} inlineMode />);

    // The dropdown trigger shows the current fg/bg value; popover content lists options
    // Step buttons should only contain the 5 visible steps
    const stepButtons = screen.getAllByRole('button');
    const stepLabels = stepButtons.map((b) => b.textContent?.trim()).filter(Boolean);

    expect(stepLabels).toContain('50');
    expect(stepLabels).toContain('300');
    expect(stepLabels).toContain('500');
    expect(stepLabels).toContain('700');
    expect(stepLabels).toContain('950');

    // Non-visible steps must not appear as options
    expect(stepLabels).not.toContain('100');
    expect(stepLabels).not.toContain('200');
    expect(stepLabels).not.toContain('400');
    expect(stepLabels).not.toContain('600');
    expect(stepLabels).not.toContain('800');
    expect(stepLabels).not.toContain('900');
  });

  it('shows all 11 steps when density is 11', () => {
    render(<ContrastPairSelector palette={makePalette(11)} inlineMode />);

    const stepButtons = screen.getAllByRole('button');
    const stepLabels = stepButtons.map((b) => b.textContent?.trim()).filter(Boolean);

    for (const step of SCALE_STEPS) {
      expect(stepLabels).toContain(String(step));
    }
  });

  it('shows 7 steps (50, 200, 300, 500, 700, 800, 950) when density is 7', () => {
    render(<ContrastPairSelector palette={makePalette(7)} inlineMode />);

    const stepButtons = screen.getAllByRole('button');
    const stepLabels = stepButtons.map((b) => b.textContent?.trim()).filter(Boolean);

    for (const step of [50, 200, 300, 500, 700, 800, 950]) {
      expect(stepLabels).toContain(String(step));
    }
    expect(stepLabels).not.toContain('100');
    expect(stepLabels).not.toContain('400');
    expect(stepLabels).not.toContain('600');
    expect(stepLabels).not.toContain('900');
  });

  it('snaps fg to last visible step and bg to first when density change removes selected steps', () => {
    const { rerender } = render(<ContrastPairSelector palette={makePalette(11)} inlineMode />);

    // At density 11, fg defaults to '700' and bg to '50' — both valid.
    // Now switch to density 5: visible steps are [50, 300, 500, 700, 950].
    // 700 is still valid for fg; 50 still valid for bg — no snap needed here.
    // Use density 9 first: steps [50,100,200,400,500,600,800,900,950].
    // fg=700 is NOT in density 9; should snap to last (950). bg=50 is in density 9.
    rerender(<ContrastPairSelector palette={makePalette(9)} inlineMode />);

    // After snap, fg trigger should show '950'
    // The PopoverTrigger renders the current value as text
    const triggers = screen.getAllByRole('button', { name: /select foreground step|select background step/i });
    const fgTrigger = triggers.find((b) => b.getAttribute('aria-label') === 'Select foreground step');
    expect(fgTrigger?.textContent).toContain('950');
  });
});

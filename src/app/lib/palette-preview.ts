import type { Collection } from './collection-types';
import type { ColorToken } from './color-utils';

export const RAMP_SAMPLE_STEPS = [50, 200, 500, 800, 950] as const;

const COLOR_FALLBACK = '#888888';

function getTokenColor(
  tokens: ColorToken[],
  step: number,
  key: 'hex' | 'displayCss',
): string {
  const token = tokens.find((candidate) => candidate.step === step);
  return token?.[key] ?? token?.hex ?? COLOR_FALLBACK;
}

export function getRampColors(tokens: ColorToken[]): string[] {
  return RAMP_SAMPLE_STEPS.map((step) => getTokenColor(tokens, step, 'hex'));
}

export function getRampDisplayColors(tokens: ColorToken[]): string[] {
  return RAMP_SAMPLE_STEPS.map((step) => getTokenColor(tokens, step, 'displayCss'));
}

export function getCollectionPreviewColors(
  collection: Collection,
  {
    step = 500,
    limit = 10,
  }: {
    step?: number;
    limit?: number;
  } = {},
): string[] {
  const colors: string[] = [];

  for (const palette of collection.palettes) {
    const token = palette.tokens.find((candidate) => candidate.step === step);
    if (token) {
      colors.push(token.displayCss ?? token.hex);
    }
    if (colors.length >= limit) {
      break;
    }
  }

  return colors;
}

// ─── Collection Types ───
// A Collection is a named container of palettes with ordering and metadata.

import type { Palette } from './color-utils';

export interface Collection {
  id: string;
  name: string;
  slug: string;
  createdAt: string;       // ISO 8601
  lastModifiedAt: string;  // ISO 8601
  palettes: Palette[];     // ordered
  conflictedPalettes: Palette[];
}

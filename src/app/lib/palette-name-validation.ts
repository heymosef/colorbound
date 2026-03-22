import type { Palette } from './color-utils';

export type PaletteNameValidationError = 'empty' | 'duplicate';

export interface PaletteNameValidationResult {
  valid: boolean;
  normalizedName: string;
  uniquenessKey: string;
  error?: PaletteNameValidationError;
  message?: string;
}

export interface PartitionedPalettes<T> {
  activePalettes: T[];
  conflictedPalettes: T[];
}

export const DUPLICATE_PALETTE_NAME_MESSAGE =
  'A palette with this name already exists in this collection.';

export function normalizePaletteName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function getPaletteNameKey(name: string): string {
  return normalizePaletteName(name).toLocaleLowerCase();
}

export function buildPaletteNameIndex(
  palettes: Pick<Palette, 'id' | 'name'>[],
): Map<string, string[]> {
  const index = new Map<string, string[]>();

  for (const palette of palettes) {
    const key = getPaletteNameKey(palette.name);
    const ids = index.get(key) ?? [];
    ids.push(palette.id);
    index.set(key, ids);
  }

  return index;
}

export function validatePaletteName(
  name: string,
  palettes: Pick<Palette, 'id' | 'name'>[],
  options?: { excludePaletteId?: string; index?: Map<string, string[]> },
): PaletteNameValidationResult {
  const normalizedName = normalizePaletteName(name);
  const uniquenessKey = getPaletteNameKey(name);

  if (!normalizedName) {
    return {
      valid: false,
      normalizedName,
      uniquenessKey,
      error: 'empty',
      message: 'Palette name is required',
    };
  }

  const index = options?.index ?? buildPaletteNameIndex(palettes);
  const duplicateIds = (index.get(uniquenessKey) ?? []).filter(
    (paletteId) => paletteId !== options?.excludePaletteId,
  );

  if (duplicateIds.length > 0) {
    return {
      valid: false,
      normalizedName,
      uniquenessKey,
      error: 'duplicate',
      message: DUPLICATE_PALETTE_NAME_MESSAGE,
    };
  }

  return {
    valid: true,
    normalizedName,
    uniquenessKey,
  };
}

export function partitionPalettesByUniqueName<T extends Pick<Palette, 'id' | 'name'>>(
  palettes: T[],
): PartitionedPalettes<T> {
  const seen = new Set<string>();
  const activePalettes: T[] = [];
  const conflictedPalettes: T[] = [];

  for (const palette of palettes) {
    const key = getPaletteNameKey(palette.name);

    if (!key || seen.has(key)) {
      conflictedPalettes.push(palette);
      continue;
    }

    seen.add(key);
    activePalettes.push(palette);
  }

  return { activePalettes, conflictedPalettes };
}

export function hasDuplicatePaletteNames(
  palettes: Pick<Palette, 'id' | 'name'>[],
): boolean {
  const { conflictedPalettes } = partitionPalettesByUniqueName(palettes);
  return conflictedPalettes.length > 0;
}

export function resolveImportedPaletteName(
  baseName: string,
  palettes: Pick<Palette, 'name'>[],
): string {
  const normalizedBase = normalizePaletteName(baseName) || 'Untitled';
  const existingKeys = new Set(palettes.map((palette) => getPaletteNameKey(palette.name)));

  if (!existingKeys.has(getPaletteNameKey(normalizedBase))) {
    return normalizedBase;
  }

  const importedBase = `${normalizedBase} (Imported)`;
  if (!existingKeys.has(getPaletteNameKey(importedBase))) {
    return importedBase;
  }

  let suffix = 2;
  while (existingKeys.has(getPaletteNameKey(`${importedBase} (${suffix})`))) {
    suffix += 1;
  }

  return `${importedBase} (${suffix})`;
}

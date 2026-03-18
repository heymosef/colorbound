import type { Palette } from './color-utils';
import type { Collection } from './collection-types';

export interface PaletteLocation {
  collection: Collection;
  collectionId: string;
  collectionSlug: string;
  palette: Palette;
}

export type MovePaletteFailureReason =
  | 'source_collection_not_found'
  | 'target_collection_not_found'
  | 'palette_not_found'
  | 'same_collection';

export type CopyPaletteFailureReason =
  | 'source_collection_not_found'
  | 'target_collection_not_found'
  | 'palette_not_found'
  | 'same_collection';

export interface MovePaletteSuccess {
  ok: true;
  collections: Collection[];
  sourceCollectionId: string;
  targetCollectionId: string;
  targetCollectionSlug: string;
  paletteId: string;
  palette: Palette;
}

export interface MovePaletteFailure {
  ok: false;
  reason: MovePaletteFailureReason;
}

export type MovePaletteOperationResult = MovePaletteSuccess | MovePaletteFailure;

export interface CopyPaletteSuccess {
  ok: true;
  collections: Collection[];
  sourceCollectionId: string;
  targetCollectionId: string;
  targetCollectionSlug: string;
  sourcePaletteId: string;
  newPaletteId: string;
  palette: Palette;
}

export interface CopyPaletteFailure {
  ok: false;
  reason: CopyPaletteFailureReason;
}

export type CopyPaletteOperationResult = CopyPaletteSuccess | CopyPaletteFailure;

export function findPaletteLocation(
  collections: Collection[],
  paletteId: string,
): PaletteLocation | null {
  for (const collection of collections) {
    const palette = collection.palettes.find((candidate) => candidate.id === paletteId);
    if (palette) {
      return {
        collection,
        collectionId: collection.id,
        collectionSlug: collection.slug,
        palette,
      };
    }
  }
  return null;
}

export function movePaletteBetweenCollections(
  collections: Collection[],
  sourceCollectionId: string,
  paletteId: string,
  targetCollectionId: string,
  now = new Date().toISOString(),
): MovePaletteOperationResult {
  if (sourceCollectionId === targetCollectionId) {
    return { ok: false, reason: 'same_collection' };
  }

  const sourceCollection = collections.find((collection) => collection.id === sourceCollectionId);
  if (!sourceCollection) {
    return { ok: false, reason: 'source_collection_not_found' };
  }

  const targetCollection = collections.find((collection) => collection.id === targetCollectionId);
  if (!targetCollection) {
    return { ok: false, reason: 'target_collection_not_found' };
  }

  const palette = sourceCollection.palettes.find((candidate) => candidate.id === paletteId);
  if (!palette) {
    return { ok: false, reason: 'palette_not_found' };
  }

  const updatedCollections = collections.map((collection) => {
    if (collection.id === sourceCollectionId) {
      return {
        ...collection,
        palettes: collection.palettes.filter((candidate) => candidate.id !== paletteId),
        lastModifiedAt: now,
      };
    }

    if (collection.id === targetCollectionId) {
      return {
        ...collection,
        palettes: [...collection.palettes, palette],
        lastModifiedAt: now,
      };
    }

    return collection;
  });

  return {
    ok: true,
    collections: updatedCollections,
    sourceCollectionId,
    targetCollectionId,
    targetCollectionSlug: targetCollection.slug,
    paletteId,
    palette,
  };
}

export function copyPaletteToCollection(
  collections: Collection[],
  sourceCollectionId: string,
  paletteId: string,
  targetCollectionId: string,
  createPaletteId: () => string,
  now = new Date().toISOString(),
): CopyPaletteOperationResult {
  if (sourceCollectionId === targetCollectionId) {
    return { ok: false, reason: 'same_collection' };
  }

  const sourceCollection = collections.find((collection) => collection.id === sourceCollectionId);
  if (!sourceCollection) {
    return { ok: false, reason: 'source_collection_not_found' };
  }

  const targetCollection = collections.find((collection) => collection.id === targetCollectionId);
  if (!targetCollection) {
    return { ok: false, reason: 'target_collection_not_found' };
  }

  const sourcePalette = sourceCollection.palettes.find((candidate) => candidate.id === paletteId);
  if (!sourcePalette) {
    return { ok: false, reason: 'palette_not_found' };
  }

  const newPaletteId = createPaletteId();
  const copiedPalette: Palette = {
    ...sourcePalette,
    id: newPaletteId,
    tokens: [...sourcePalette.tokens],
  };

  const updatedCollections = collections.map((collection) =>
    collection.id === targetCollectionId
      ? {
          ...collection,
          palettes: [...collection.palettes, copiedPalette],
          lastModifiedAt: now,
        }
      : collection
  );

  return {
    ok: true,
    collections: updatedCollections,
    sourceCollectionId,
    targetCollectionId,
    targetCollectionSlug: targetCollection.slug,
    sourcePaletteId: paletteId,
    newPaletteId,
    palette: copiedPalette,
  };
}

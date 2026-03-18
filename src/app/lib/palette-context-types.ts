import type { Palette } from './color-utils';
import type { Collection } from './collection-types';
import type {
  CopyPaletteOperationResult,
  MovePaletteOperationResult,
} from './collection-operations';

export interface PaletteConfig {
  name: string;
  hue: number;
  chroma: number;
  /** Target OKLCH lightness for step 50 (lightest). 0–1, default 0.985. */
  lightness50: number;
  /** Target OKLCH lightness for step 950 (darkest). 0–1, default 0.025. */
  lightness950: number;
  isNeutral: boolean;
}

export type ContrastAlgorithm = 'apca' | 'wcag';
export type CollectionSortBy = 'lastModified' | 'name' | 'created';

export type CollectionRenameResult =
  | { ok: true; collectionId: string; slug: string; name: string }
  | { ok: false; error: 'empty' | 'duplicate'; message: string };

export interface PaletteContextValue {
  config: PaletteConfig;
  /** Palettes in the active collection (backward-compat alias) */
  collection: Palette[];
  /** All collections */
  collections: Collection[];
  /** Currently active collection container */
  activeCollectionId: string | null;
  /** Currently active palette within the active collection */
  activePaletteId: string | null;
  savedBaselinePalette: Palette | null;
  hasPersistedBaseline: boolean;
  isFirstRunSession: boolean;
  isDirty: boolean;
  currentPalette: Palette;
  darkPalette: Palette;
  contrastAlgorithm: ContrastAlgorithm;
  setContrastAlgorithm: (algorithm: ContrastAlgorithm) => void;
  handleConfigChange: (partial: Partial<PaletteConfig>) => void;
  handleNameChange: (name: string) => void;
  handleRandomize: () => void;
  startDraftPalette: (collectionId?: string) => void;
  handleAddToCollection: () => void;
  handleUpdateInCollection: () => void;
  handleSelectFromCollection: (id: string) => void;
  selectPaletteInCollection: (collectionId: string, paletteId: string) => boolean;
  handleRevertChanges: (options?: { silent?: boolean }) => void;
  handleRemove: (id: string) => void;
  handleRename: (id: string, name: string) => void;
  handleReorder: (fromIndex: number, toIndex: number) => void;
  handleImportPalette: (config: PaletteConfig, group?: string) => string;
  handleImportCollection: (entries: Array<{ config: PaletteConfig; group?: string }>, collectionName?: string) => { count: number; collectionSlug: string };
  handleDuplicatePalette: (name: string) => string;
  handleApplyHex: (hue: number, chroma: number) => void;
  activeCollection: Collection | null;
  handleCreateCollection: (name?: string) => { id: string; slug: string };
  handleRenameCollection: (collectionId: string, name: string) => CollectionRenameResult;
  handleDeleteCollection: (collectionId: string) => boolean;
  handleSelectCollection: (collectionId: string) => void;
  handleMovePalette: (sourceCollectionId: string, paletteId: string, targetCollectionId: string) => MovePaletteOperationResult;
  handleCopyPalette: (sourceCollectionId: string, paletteId: string, targetCollectionId: string) => CopyPaletteOperationResult;
  collectionSortBy: CollectionSortBy;
  setCollectionSortBy: (sort: CollectionSortBy) => void;
}

export interface CollectionsContextValue {
  collections: Collection[];
  activeCollectionId: string | null;
  activeCollection: Collection | null;
  collectionSortBy: CollectionSortBy;
  setCollectionSortBy: (sort: CollectionSortBy) => void;
  handleCreateCollection: (name?: string) => { id: string; slug: string };
  handleRenameCollection: (collectionId: string, name: string) => CollectionRenameResult;
  handleDeleteCollection: (collectionId: string) => boolean;
  handleSelectCollection: (collectionId: string) => void;
}

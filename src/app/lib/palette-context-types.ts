import type { TargetColorSpace } from './color-utils';
import type { Palette } from './color-utils';
import type { Collection } from './collection-types';
import type { PaletteDensity } from './palette-density';
import type {
  CopyPaletteOperationResult,
  MovePaletteOperationResult,
} from './collection-operations';
import type { PaletteNameValidationError } from './palette-name-validation';

export interface PaletteConfig {
  name: string;
  hue: number;
  chroma50: number;
  chroma: number;
  chroma950: number;
  lightCurve: number;
  darkCurve: number;
  /** Target OKLCH lightness for step 50 (lightest). 0–1, default 0.985. */
  lightness50: number;
  /** Target OKLCH lightness for step 950 (darkest). 0–1, default 0.025. */
  lightness950: number;
  density: PaletteDensity;
  targetColorSpace: TargetColorSpace;
  generationVersion: number;
}

export type ContrastAlgorithm = 'apca' | 'wcag';
export type CollectionSortBy = 'lastModified' | 'name' | 'created';

export type CollectionRenameResult =
  | { ok: true; collectionId: string; slug: string; name: string }
  | { ok: false; error: 'empty' | 'duplicate'; message: string };

export type PaletteMutationFailure =
  | { ok: false; error: PaletteNameValidationError; message: string };

export type AddPaletteToCollectionResult =
  | { ok: true; paletteId: string; collectionId: string }
  | PaletteMutationFailure;

export type UpdatePaletteInCollectionResult =
  | { ok: true; paletteId: string; collectionId: string; name: string }
  | PaletteMutationFailure;

export type DuplicatePaletteResult =
  | { ok: true; paletteId: string; collectionId: string; name: string }
  | PaletteMutationFailure;

export type ImportPaletteToCollectionResult =
  | { ok: true; paletteId: string; collectionId: string; collectionSlug: string; name: string }
  | { ok: false; error: 'collection_not_found'; message: string };

export type PaletteRenameResult =
  | { ok: true; paletteId: string; collectionId: string; name: string }
  | PaletteMutationFailure;

export type ResolveConflictedPaletteResult =
  | { ok: true; paletteId: string; collectionId: string; name: string }
  | PaletteMutationFailure
  | { ok: false; error: 'palette_not_found'; message: string };

export interface CreateCollectionOptions {
  activate?: boolean;
}

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
  paletteNameError: string | null;
  startDraftPalette: (collectionId?: string) => void;
  handleAddToCollection: () => AddPaletteToCollectionResult;
  handleUpdateInCollection: () => UpdatePaletteInCollectionResult;
  handleSelectFromCollection: (id: string) => void;
  selectPaletteInCollection: (collectionId: string, paletteId: string) => boolean;
  handleRevertChanges: (options?: { silent?: boolean }) => void;
  handleDiscardDraftChanges: (options?: { silent?: boolean }) => void;
  handleRemove: (id: string) => void;
  handleRename: (id: string, name: string) => PaletteRenameResult;
  handleReorder: (fromIndex: number, toIndex: number) => void;
  handleImportPalette: (config: PaletteConfig) => string;
  handleImportPaletteToCollection: (config: PaletteConfig, collectionId: string) => ImportPaletteToCollectionResult;
  handleImportCollection: (entries: PaletteConfig[], collectionName?: string) => { count: number; collectionSlug: string; conflictCount: number };
  handleDuplicatePalette: (name: string) => DuplicatePaletteResult;
  handleResolveConflictedPalette: (collectionId: string, paletteId: string, name: string) => ResolveConflictedPaletteResult;
  handleDeleteConflictedPalette: (collectionId: string, paletteId: string) => boolean;
  handleApplyHex: (hue: number, chroma: number) => void;
  activeCollection: Collection | null;
  handleCreateCollection: (name?: string, options?: CreateCollectionOptions) => { id: string; slug: string };
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
  handleCreateCollection: (name?: string, options?: CreateCollectionOptions) => { id: string; slug: string };
  handleRenameCollection: (collectionId: string, name: string) => CollectionRenameResult;
  handleDeleteCollection: (collectionId: string) => boolean;
  handleSelectCollection: (collectionId: string) => void;
}

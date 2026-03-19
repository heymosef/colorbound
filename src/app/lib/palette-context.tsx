import React, { useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react';
import {
  generatePalette,
  generateDarkPalette,
  generateId,
  suggestPaletteName,
  type Palette,
} from './color-utils';
import { toast } from 'sonner';
import { PaletteContext, CollectionsContext } from './palette-context-value';
import { loadState, saveState, createDefaultCollection } from './local-storage';
import type { Collection } from './collection-types';
import type {
  AddPaletteToCollectionResult,
  CollectionRenameResult,
  CollectionSortBy,
  CollectionsContextValue,
  ContrastAlgorithm,
  CreateCollectionOptions,
  PaletteConfig,
  PaletteContextValue,
} from './palette-context-types';
import { toSlug, deduplicateSlug, deduplicateName } from './slug-utils';
import { announce, announcePolite } from '../components/aria-live-announcer';
import {
  copyPaletteToCollection,
  findPaletteLocation,
  movePaletteBetweenCollections,
  type CopyPaletteOperationResult,
  type MovePaletteOperationResult,
} from './collection-operations';
import { validateCollectionName } from './collection-name-validation';
export type {
  CollectionRenameResult,
  CollectionSortBy,
  CollectionsContextValue,
  ContrastAlgorithm,
  PaletteConfig,
  PaletteContextValue,
} from './palette-context-types';

function createDefaultConfig(hue?: number): PaletteConfig {
  const h = hue ?? Math.floor(Math.random() * 360);
  const defaultChroma = 0.18;
  return {
    name: suggestPaletteName(h, defaultChroma),
    hue: h,
    chroma: defaultChroma,
    lightness50: 0.985,
    lightness950: 0.025,
  };
}

function buildPalette(config: PaletteConfig, id?: string): Palette {
  const tokens = generatePalette(
    config.hue,
    config.chroma,
    config.lightness50,
    config.lightness950,
  );
  return {
    id: id ?? generateId(),
    name: config.name,
    tokens,
    hue: config.hue,
    chroma: config.chroma,
    lightness50: config.lightness50,
    lightness950: config.lightness950,
  };
}

function buildDarkPalette(config: PaletteConfig): Palette {
  const tokens = generateDarkPalette(
    config.hue,
    config.chroma,
    config.lightness50,
    config.lightness950,
  );
  return {
    id: generateId(),
    name: config.name,
    tokens,
    hue: config.hue,
    chroma: config.chroma,
    lightness50: config.lightness50,
    lightness950: config.lightness950,
  };
}

export { PaletteContext, CollectionsContext };

export function usePaletteContext() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('usePaletteContext must be used within PaletteProvider');
  return ctx;
}

export function useCollectionsContext() {
  const ctx = useContext(CollectionsContext);
  if (!ctx) throw new Error('useCollectionsContext must be used within PaletteProvider');
  return ctx;
}

// ─── Helper: touch collection lastModifiedAt ───
function touchCollection(collections: Collection[], collectionId: string): Collection[] {
  const now = new Date().toISOString();
  return collections.map((c) =>
    c.id === collectionId ? { ...c, lastModifiedAt: now } : c
  );
}

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [hydrated] = useState(() => loadState());

  const [config, setConfig] = useState<PaletteConfig>(() => hydrated?.config ?? createDefaultConfig());
  const [nameManuallyEdited, setNameManuallyEdited] = useState(() => hydrated?.nameManuallyEdited ?? false);
  const [isDirty, setIsDirty] = useState(() => hydrated?.isDirty ?? false);
  const [hasCompletedFirstRun, setHasCompletedFirstRun] = useState(() => hydrated?.hasCompletedFirstRun ?? false);
  const [contrastAlgorithm, setContrastAlgorithm] = useState<ContrastAlgorithm>(() => hydrated?.contrastAlgorithm ?? 'wcag');
  const [collectionSortBy, setCollectionSortBy] = useState<CollectionSortBy>('lastModified');

  // ─── Collections state ───
  const [collections, setCollections] = useState<Collection[]>(() => {
    if (hydrated?.collections && hydrated.collections.length > 0) {
      return hydrated.collections;
    }
    // First-time user: create default collection
    return [createDefaultCollection()];
  });

  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(() => {
    if (hydrated?.activeCollectionId) return hydrated.activeCollectionId;
    // Default to first collection
    return collections[0]?.id ?? null;
  });

  const [activePaletteId, setActivePaletteId] = useState<string | null>(() => hydrated?.activePaletteId ?? null);

  // ─── Derived: active collection & its palettes ───
  const activeCollection = useMemo(
    () => collections.find((c) => c.id === activeCollectionId) ?? null,
    [collections, activeCollectionId]
  );

  // Backward compat: `collection` = palettes in the active collection
  const collection = useMemo(
    () => activeCollection?.palettes ?? [],
    [activeCollection]
  );

  const savedBaselinePalette = useMemo(
    () => activeCollection?.palettes.find((palette) => palette.id === activePaletteId) ?? null,
    [activeCollection, activePaletteId]
  );

  const hasPersistedBaseline = !!savedBaselinePalette;

  const currentPalette = useMemo(
    () => buildPalette(config, savedBaselinePalette?.id),
    [config, savedBaselinePalette?.id]
  );
  const darkPalette = useMemo(() => buildDarkPalette(config), [config]);

  // ─── Helper to update palettes within the active collection ───
  const updateActiveCollectionPalettes = useCallback(
    (updater: (palettes: Palette[]) => Palette[]) => {
      setCollections((prev) => {
        const now = new Date().toISOString();
        return prev.map((c) =>
          c.id === activeCollectionId
            ? { ...c, palettes: updater(c.palettes), lastModifiedAt: now }
            : c
        );
      });
    },
    [activeCollectionId]
  );

  const setEditorFromPalette = useCallback((palette: Palette, collectionId: string) => {
    setActiveCollectionId(collectionId);
    setConfig({
      name: palette.name,
      hue: palette.hue,
      chroma: palette.chroma,
      lightness50: palette.lightness50,
      lightness950: palette.lightness950,
    });
    setNameManuallyEdited(true);
    setActivePaletteId(palette.id);
    setIsDirty(false);
    setHasCompletedFirstRun(true);
  }, []);

  const startDraftPalette = useCallback((collectionId?: string) => {
    const randomHue = Math.floor(Math.random() * 360);
    const draftConfig = createDefaultConfig(randomHue);
    const nextCollectionId = collectionId ?? activeCollectionId ?? collections[0]?.id ?? null;

    if (nextCollectionId && nextCollectionId !== activeCollectionId) {
      setActiveCollectionId(nextCollectionId);
    }

    setConfig(draftConfig);
    setNameManuallyEdited(false);
    setActivePaletteId(null);
    setIsDirty(false);
    setHasCompletedFirstRun(true);
  }, [activeCollectionId, collections]);

  const handleConfigChange = useCallback(
    (partial: Partial<PaletteConfig>) => {
      setConfig((prev) => {
        const next = { ...prev, ...partial };
        if (('hue' in partial || 'chroma' in partial || 'lightness50' in partial || 'lightness950' in partial) && !nameManuallyEdited) {
          next.name = suggestPaletteName(next.hue, next.chroma, next.lightness50, next.lightness950);
        }
        return next;
      });
      setIsDirty(true);
    },
    [nameManuallyEdited]
  );

  const handleNameChange = useCallback((name: string) => {
    setConfig((prev) => ({ ...prev, name }));
    setNameManuallyEdited(true);
    setIsDirty(true);
  }, []);

  const handleRandomize = useCallback(() => {
    const randomHue = Math.floor(Math.random() * 360);
    setConfig((prev) => {
      const autoName = suggestPaletteName(randomHue, prev.chroma, prev.lightness50, prev.lightness950);
      return { ...prev, hue: randomHue, name: autoName };
    });
    setNameManuallyEdited(false);
    setActivePaletteId(null);
    setIsDirty(false);
    setHasCompletedFirstRun(true);
    setTimeout(() => {
      toast.success('Randomized palette', {
        description: `New hue: ${randomHue}°`,
        duration: 2000,
      });
    }, 0);
  }, []);

  const handleAddToCollection = useCallback((): AddPaletteToCollectionResult => {
    if (!activeCollectionId) {
      return { ok: false };
    }

    const snapshot: Palette = {
      ...currentPalette,
      id: generateId(),
      tokens: [...currentPalette.tokens],
    };
    updateActiveCollectionPalettes((prev) => [...prev, snapshot]);
    setActivePaletteId(snapshot.id);
    setIsDirty(false);
    setHasCompletedFirstRun(true);
    toast.success(`Added "${config.name}" to collection`, { duration: 2000 });
    announcePolite(`Added ${config.name} to collection`);
    return { ok: true, paletteId: snapshot.id, collectionId: activeCollectionId };
  }, [activeCollectionId, currentPalette, config.name, updateActiveCollectionPalettes]);

  const handleUpdateInCollection = useCallback(() => {
    if (!savedBaselinePalette) return;
    const updated = buildPalette(config, savedBaselinePalette.id);
    updateActiveCollectionPalettes((prev) =>
      prev.map((p) => (p.id === savedBaselinePalette.id ? updated : p))
    );
    setIsDirty(false);
    setHasCompletedFirstRun(true);
    toast.success(`Updated "${config.name}" in collection`, { duration: 2000 });
    announcePolite(`Saved ${config.name}`);
  }, [savedBaselinePalette, config, updateActiveCollectionPalettes]);

  const selectPaletteInCollection = useCallback((collectionId: string, paletteId: string): boolean => {
    const sourceCollection = collections.find((candidate) => candidate.id === collectionId);
    const palette = sourceCollection?.palettes.find((candidate) => candidate.id === paletteId);
    if (!sourceCollection || !palette) return false;
    setEditorFromPalette(palette, sourceCollection.id);
    return true;
  }, [collections, setEditorFromPalette]);

  const handleSelectFromCollection = useCallback(
    (id: string) => {
      if (!activeCollectionId) return;
      selectPaletteInCollection(activeCollectionId, id);
    },
    [activeCollectionId, selectPaletteInCollection]
  );

  const handleRevertChanges = useCallback((options?: { silent?: boolean }) => {
    if (!savedBaselinePalette || !activeCollectionId) return;
    setEditorFromPalette(savedBaselinePalette, activeCollectionId);
    if (!options?.silent) {
      toast.success('Reverted to saved version', {
        description: `"${savedBaselinePalette.name}" restored`,
        duration: 2000,
      });
      announcePolite(`Reverted ${savedBaselinePalette.name} to saved version`);
    }
  }, [activeCollectionId, savedBaselinePalette, setEditorFromPalette]);

  const handleRemove = useCallback(
    (id: string) => {
      const removedName = collection.find((p) => p.id === id)?.name ?? 'palette';
      updateActiveCollectionPalettes((prev) => prev.filter((p) => p.id !== id));
      if (activePaletteId === id) {
        setActivePaletteId(null);
        setIsDirty(false);
      }
      toast('Palette removed from collection', { duration: 2000 });
      announce(`Removed ${removedName} from collection`);
    },
    [activePaletteId, updateActiveCollectionPalettes, collection]
  );

  const handleRename = useCallback((id: string, name: string) => {
    updateActiveCollectionPalettes((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }, [updateActiveCollectionPalettes]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    updateActiveCollectionPalettes((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, [updateActiveCollectionPalettes]);

  const handleImportPalette = useCallback((importedConfig: PaletteConfig) => {
    setConfig(importedConfig);
    setNameManuallyEdited(true);
    setActivePaletteId(null);
    setIsDirty(false);
    setHasCompletedFirstRun(true);
    toast.success(`Opened "${importedConfig.name}" in editor`, {
      description: 'Use "Add to Collection" to save it',
      duration: 3000,
    });
    return '';
  }, []);

  const handleImportCollection = useCallback((entries: PaletteConfig[], collectionName?: string): { count: number; collectionSlug: string } => {
    if (entries.length === 0) {
      toast.info('No palettes to import', { duration: 2000 });
      return { count: 0, collectionSlug: '' };
    }

    // Build palettes from entries
    const newPalettes = entries.map((config) => {
      const newId = generateId();
      return buildPalette(config, newId);
    });

    // Deduplicate collection name with "(2)" suffix
    const baseName = collectionName || 'Imported Collection';
    const existingNames = new Set(collections.map((c) => c.name));
    const finalName = deduplicateName(baseName, existingNames);

    const baseSlug = toSlug(finalName);
    const existingSlugs = new Set(collections.map((c) => c.slug));
    const finalSlug = deduplicateSlug(baseSlug, existingSlugs);

    const now = new Date().toISOString();
    const newCollection: Collection = {
      id: generateId(),
      name: finalName,
      slug: finalSlug,
      createdAt: now,
      lastModifiedAt: now,
      palettes: newPalettes,
    };

    setCollections((prev) => [...prev, newCollection]);
    setActiveCollectionId(newCollection.id);
    setActivePaletteId(null);
    setIsDirty(false);
    setHasCompletedFirstRun(true);

    toast.success(`Imported ${newPalettes.length} palette${newPalettes.length !== 1 ? 's' : ''} into "${finalName}"`, {
      duration: 3000,
    });
    announcePolite(`Imported ${newPalettes.length} palette${newPalettes.length !== 1 ? 's' : ''} into ${finalName}`);

    return { count: newPalettes.length, collectionSlug: finalSlug };
  }, [collections]);

  const handleDuplicatePalette = useCallback((name: string) => {
    const newId = generateId();
    const dupConfig = { ...config, name };
    const newPalette = buildPalette(dupConfig, newId);
    updateActiveCollectionPalettes((prev) => [...prev, newPalette]);
    setConfig(dupConfig);
    setNameManuallyEdited(true);
    setActivePaletteId(newId);
    setIsDirty(false);
    setHasCompletedFirstRun(true);
    toast.success(`Duplicated as "${name}"`, {
      duration: 2000,
    });
    announcePolite(`Duplicated as ${name}`);
    return newId;
  }, [config, updateActiveCollectionPalettes]);

  const handleApplyHex = useCallback((hue: number, chroma: number) => {
    setConfig((prev) => {
      const next = { ...prev, hue, chroma };
      next.name = suggestPaletteName(next.hue, next.chroma, next.lightness50, next.lightness950);
      return next;
    });
    setNameManuallyEdited(false);
    setIsDirty(true);
  }, []);

  // ─── Collection Management ───

  const handleCreateCollection = useCallback((name?: string, options?: CreateCollectionOptions): { id: string; slug: string } => {
    const activate = options?.activate ?? true;
    const baseName = name || 'Untitled Collection';
    const existingNames = new Set(collections.map((c) => c.name));
    const finalName = deduplicateName(baseName, existingNames);

    const baseSlug = toSlug(finalName);
    const existingSlugs = new Set(collections.map((c) => c.slug));
    const finalSlug = deduplicateSlug(baseSlug, existingSlugs);

    const now = new Date().toISOString();
    const newCollection: Collection = {
      id: generateId(),
      name: finalName,
      slug: finalSlug,
      createdAt: now,
      lastModifiedAt: now,
      palettes: [],
    };

    setCollections((prev) => [...prev, newCollection]);
    if (activate) {
      setActiveCollectionId(newCollection.id);
      setActivePaletteId(null);
      setIsDirty(false);
    }
    setHasCompletedFirstRun(true);
    toast.success(`Created "${finalName}"`, { duration: 2000 });
    announcePolite(`Created collection ${finalName}`);
    return { id: newCollection.id, slug: finalSlug };
  }, [collections]);

  const handleRenameCollection = useCallback((collectionId: string, name: string): CollectionRenameResult => {
    const validation = validateCollectionName(name, collections, { excludeCollectionId: collectionId });
    if (!validation.valid) {
      return {
        ok: false,
        error: validation.error ?? 'empty',
        message: validation.message ?? 'Collection name is required',
      };
    }

    const normalizedName = validation.normalizedName;
    const existingSlugs = new Set(collections.filter((c) => c.id !== collectionId).map((c) => c.slug));
    const baseSlug = toSlug(normalizedName);
    const slug = deduplicateSlug(baseSlug, existingSlugs);
    const now = new Date().toISOString();
    setCollections((prev) =>
      prev.map((collection) =>
        collection.id === collectionId
          ? { ...collection, name: normalizedName, slug, lastModifiedAt: now }
          : collection
      )
    );
    announcePolite(`Renamed collection to ${normalizedName}`);
    return {
      ok: true,
      collectionId,
      slug,
      name: normalizedName,
    };
  }, [collections]);

  // ─── Fix #1: handleDeleteCollection stale closure ───
  // Move "pick next active" logic inside setCollections updater
  // so it reads from the latest state, not a stale closure.

  const handleDeleteCollection = useCallback((collectionId: string): boolean => {
    if (collections.length <= 1) {
      toast.error('Cannot delete the last collection', { duration: 2000 });
      return false;
    }

    setCollections((prev) => {
      const remaining = prev.filter((c) => c.id !== collectionId);
      // Side-effect: update active collection if the deleted one was active.
      // We read activeCollectionId from the ref to avoid closure staleness.
      // React batches these state updates together with setCollections.
      if (activeCollectionId === collectionId) {
        const next = remaining[0];
        setActiveCollectionId(next?.id ?? null);
        setActivePaletteId(null);
        setIsDirty(false);
      }
      return remaining;
    });

    toast.success('Collection deleted', { duration: 2000 });
    announce('Collection deleted');
    return true;
  }, [collections.length, activeCollectionId]);

  const handleSelectCollection = useCallback((collectionId: string) => {
    setActiveCollectionId(collectionId);
    setActivePaletteId(null);
    setIsDirty(false);
    setHasCompletedFirstRun(true);
  }, []);

  const handleMovePalette = useCallback((sourceCollectionId: string, paletteId: string, targetCollectionId: string): MovePaletteOperationResult => {
    const operation = movePaletteBetweenCollections(collections, sourceCollectionId, paletteId, targetCollectionId);

    if (!operation.ok) {
      toast.error('Unable to move palette', { duration: 2000 });
      return operation;
    }

    setCollections(operation.collections);

    if (activePaletteId === paletteId) {
      setEditorFromPalette(operation.palette, operation.targetCollectionId);
    }

    const targetName = operation.collections.find((collection) => collection.id === targetCollectionId)?.name ?? 'collection';
    toast.success(`Moved to "${targetName}"`, { duration: 2000 });
    announce(`Moved palette to ${targetName}`);
    return operation;
  }, [activePaletteId, collections, setEditorFromPalette]);

  const handleCopyPalette = useCallback((sourceCollectionId: string, paletteId: string, targetCollectionId: string): CopyPaletteOperationResult => {
    const operation = copyPaletteToCollection(collections, sourceCollectionId, paletteId, targetCollectionId, generateId);

    if (!operation.ok) {
      toast.error('Unable to duplicate palette', { duration: 2000 });
      return operation;
    }

    setCollections(operation.collections);

    if (activePaletteId === paletteId) {
      setEditorFromPalette(operation.palette, operation.targetCollectionId);
    }

    const targetName = operation.collections.find((collection) => collection.id === targetCollectionId)?.name ?? 'collection';
    toast.success(`Copied to "${targetName}"`, { duration: 2000 });
    announcePolite(`Duplicated palette to ${targetName}`);
    return operation;
  }, [activePaletteId, collections, setEditorFromPalette]);

  // ─── Fix #2: Debounce localStorage persistence ───
  // Use a ref + setTimeout so rapid slider drags don't cause
  // synchronous JSON.stringify + localStorage.setItem on every frame.

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFailedRef = useRef(false);

  useEffect(() => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce: wait 300ms after the last state change before persisting
    saveTimeoutRef.current = setTimeout(() => {
      const ok = saveState({
        collections,
        activeCollectionId,
        activePaletteId,
        config,
        nameManuallyEdited,
        contrastAlgorithm,
        isDirty,
        hasCompletedFirstRun,
      });
      // Show a toast on first failure; suppress repeated toasts until a save succeeds
      if (!ok && !saveFailedRef.current) {
        saveFailedRef.current = true;
        toast.error('Unable to save — storage may be full', {
          description: 'Your changes are in memory but could not be persisted to disk.',
          duration: 6000,
        });
      } else if (ok && saveFailedRef.current) {
        saveFailedRef.current = false;
      }
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [collections, activeCollectionId, activePaletteId, config, nameManuallyEdited, isDirty, contrastAlgorithm, hasCompletedFirstRun]);

  // ─── Fix #2b: Flush pending save on page unload ───
  // Ensures the debounced save isn't lost if the user closes the tab.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveState({
          collections,
          activeCollectionId,
          activePaletteId,
          config,
          nameManuallyEdited,
          contrastAlgorithm,
          isDirty,
          hasCompletedFirstRun,
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  // ─── Fix #3: Warn before losing unsaved changes on tab/window close ───
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const value = useMemo(
    () => ({
      config,
      collection,
      collections,
      activeCollectionId,
      activePaletteId,
      savedBaselinePalette,
      hasPersistedBaseline,
      isFirstRunSession: !hasCompletedFirstRun,
      isDirty,
      currentPalette,
      darkPalette,
      contrastAlgorithm,
      setContrastAlgorithm,
      handleConfigChange,
      handleNameChange,
      handleRandomize,
      startDraftPalette,
      handleAddToCollection,
      handleUpdateInCollection,
      handleSelectFromCollection,
      selectPaletteInCollection,
      handleRevertChanges,
      handleRemove,
      handleRename,
      handleReorder,
      handleImportPalette,
      handleImportCollection,
      handleDuplicatePalette,
      handleApplyHex,
      activeCollection,
      handleCreateCollection,
      handleRenameCollection,
      handleDeleteCollection,
      handleSelectCollection,
      handleMovePalette,
      handleCopyPalette,
      collectionSortBy,
      setCollectionSortBy,
    }),
    [
      config,
      collection,
      collections,
      activeCollectionId,
      activePaletteId,
      savedBaselinePalette,
      hasPersistedBaseline,
      hasCompletedFirstRun,
      isDirty,
      currentPalette,
      darkPalette,
      contrastAlgorithm,
      setContrastAlgorithm,
      handleConfigChange,
      handleNameChange,
      handleRandomize,
      startDraftPalette,
      handleAddToCollection,
      handleUpdateInCollection,
      handleSelectFromCollection,
      selectPaletteInCollection,
      handleRevertChanges,
      handleRemove,
      handleRename,
      handleReorder,
      handleImportPalette,
      handleImportCollection,
      handleDuplicatePalette,
      handleApplyHex,
      activeCollection,
      handleCreateCollection,
      handleRenameCollection,
      handleDeleteCollection,
      handleSelectCollection,
      handleMovePalette,
      handleCopyPalette,
      collectionSortBy,
      setCollectionSortBy,
    ]
  );

  const collectionsValue = useMemo(
    () => ({
      collections,
      activeCollectionId,
      activeCollection,
      collectionSortBy,
      setCollectionSortBy,
      handleCreateCollection,
      handleRenameCollection,
      handleDeleteCollection,
      handleSelectCollection,
    }),
    [
      collections,
      activeCollectionId,
      activeCollection,
      collectionSortBy,
      setCollectionSortBy,
      handleCreateCollection,
      handleRenameCollection,
      handleDeleteCollection,
      handleSelectCollection,
    ]
  );

  return (
    <PaletteContext.Provider value={value}>
      <CollectionsContext.Provider value={collectionsValue}>
        {children}
      </CollectionsContext.Provider>
    </PaletteContext.Provider>
  );
}

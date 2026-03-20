/**
 * EditPalettePage — responsive layout for the palette editor.
 *
 * LAYOUT UX — Do not override without explicit user instructions:
 *
 * Mobile:
 *   - Top bar: PaletteSwitcher (compact) | Theme switcher + ⋮ More + Edit button
 *   - Tabs: Preview | A11y | Export
 *   - ViewModeToggle: Light | Dark | Both (Preview tab only)
 *   - Controls Drawer: bottom sheet with PaletteControls + save/undo when dirty
 *
 * Tablet:
 *   - Left sidebar: PaletteControls (with save/undo when dirty)
 *   - Right: Tabs (Preview | Accessibility | Export) with workspace content
 *
 * Desktop:
 *   - Left sidebar: PaletteControls (with save/undo when dirty)
 *   - Center: PaletteWorkspace (toolbar: name + ⋮ more + view toggle)
 *   - Right sidebar: CollectionPanel (a11y + export tabs)
 */

import React, { Suspense, lazy, useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useBlocker, useLocation } from 'react-router';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from './ui/drawer';
import { Sliders, Eye, Contrast, Download } from 'lucide-react';
import { PaletteControls } from './palette-controls';
import { PaletteWorkspace, MobileMoreMenu } from './palette-workspace';
import { ViewModeToggle, type ViewMode } from './palette-view-mode-toggle';
import { AlgorithmToggle } from './contrast-indicator';
import { usePaletteContext } from '../lib/palette-context';
import { useBreakpoint } from '../lib/use-breakpoint';
import { PaletteSwitcher } from './palette-switcher';
import { ThemeSwitcher, useThemeContext } from './root-layout';
import { CollectionSwitcher } from './root-layout';
import { useDocumentTitle } from '../lib/use-document-title';
import { toast } from 'sonner';
import type { Palette } from '../lib/color-utils';
import { findPaletteLocation } from '../lib/collection-operations';
import {
  buildCollectionDraftEditorPath,
  buildCollectionPath,
  buildCollectionSavedEditorPath,
} from '../lib/editor-routes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { MoveToCollectionDialog } from './move-to-collection-dialog';

interface PendingCollectionAction {
  mode: 'move' | 'copy';
  sourceCollectionId: string;
  paletteId: string;
  paletteName: string;
}

const LazyCollectionPanel = lazy(async () => {
  const module = await import('./collection-panel');
  return { default: module.CollectionPanel };
});

function CollectionPanelFallback({ inlineMode = false }: { inlineMode?: boolean }) {
  if (inlineMode) {
    return (
      <div
        className="rounded-xl border border-border/60 bg-card/60 p-4"
        role="status"
        aria-label="Loading panel"
      >
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="mt-4 space-y-3">
          <div className="h-16 rounded-lg bg-muted/70" />
          <div className="h-24 rounded-lg bg-muted/50" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full border-l border-border bg-card px-4 pt-4"
      role="status"
      aria-label="Loading panel"
    >
      <div className="h-9 rounded-xl bg-muted/80" />
      <div className="mt-4 space-y-3">
        <div className="h-24 rounded-xl bg-muted/60" />
        <div className="h-36 rounded-xl bg-muted/40" />
      </div>
    </div>
  );
}

// ─── Desktop Layout ───
function DesktopLayout({
  controlsNode,
  currentPalette,
  darkPalette,
  hasPersistedBaseline,
  isDirty,
  onRevert,
  onSave,
  onAddToCollection,
  onDuplicate,
  onDelete,
  onCollectionAction,
  collection,
}: {
  controlsNode: (onClose?: () => void) => React.ReactNode;
  currentPalette: any;
  darkPalette: any;
  hasPersistedBaseline: boolean;
  isDirty: boolean;
  onRevert: () => void;
  onSave: () => unknown;
  onAddToCollection: () => unknown;
  onDuplicate: (name: string) => { ok: boolean; message?: string };
  onDelete: () => void;
  onCollectionAction: (mode: 'move' | 'copy', palette: Palette) => void;
  collection: any[];
}) {
  return (
    <div className="flex-1 flex overflow-hidden">
      <aside
        className="w-[280px] shrink-0 overflow-y-auto"
        role="complementary"
        aria-label="Palette controls"
      >
        {controlsNode()}
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col" role="main" aria-label="Palette workspace">
        <div className="flex-1 overflow-hidden">
          <PaletteWorkspace
            palette={currentPalette}
            darkPalette={darkPalette}
            isEditingCollection={hasPersistedBaseline}
            isDirty={isDirty}
            onRevert={onRevert}
            onSave={onSave}
            onAddToCollection={onAddToCollection}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCollectionAction={onCollectionAction}
          />
        </div>
      </main>

      <aside
        className="w-[320px] shrink-0 overflow-hidden"
        role="complementary"
        aria-label="Accessibility and export"
      >
        <Suspense fallback={<CollectionPanelFallback />}>
          <LazyCollectionPanel collection={collection} currentPalette={currentPalette} />
        </Suspense>
      </aside>
    </div>
  );
}

// ─── Tablet Layout ───
function TabletLayout({
  controlsNode,
  currentPalette,
  darkPalette,
  hasPersistedBaseline,
  isDirty,
  onRevert,
  onSave,
  onAddToCollection,
  onDuplicate,
  onDelete,
  onCollectionAction,
  collection,
}: {
  controlsNode: (onClose?: () => void) => React.ReactNode;
  currentPalette: any;
  darkPalette: any;
  hasPersistedBaseline: boolean;
  isDirty: boolean;
  onRevert: () => void;
  onSave: () => unknown;
  onAddToCollection: () => unknown;
  onDuplicate: (name: string) => { ok: boolean; message?: string };
  onDelete: () => void;
  onCollectionAction: (mode: 'move' | 'copy', palette: Palette) => void;
  collection: any[];
}) {
  return (
    <div className="flex-1 flex overflow-hidden">
      <aside
        className="w-[260px] shrink-0 overflow-y-auto"
        role="complementary"
        aria-label="Palette controls"
      >
        {controlsNode()}
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col" role="main" aria-label="Palette workspace">
        <Tabs defaultValue="preview" className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 pt-2 shrink-0">
            <TabsList className="h-8 w-full">
              <TabsTrigger value="preview" className="text-[11px] flex-1 h-6">
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="accessibility" className="text-[11px] flex-1 h-6">
                <Contrast className="w-3 h-3 mr-1" />
                Accessibility
              </TabsTrigger>
              <TabsTrigger value="export" className="text-[11px] flex-1 h-6">
                <Download className="w-3 h-3 mr-1" />
                Export
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="preview" className="flex-1 overflow-hidden mt-0">
            <PaletteWorkspace
              palette={currentPalette}
              darkPalette={darkPalette}
              isEditingCollection={hasPersistedBaseline}
              isDirty={isDirty}
              onRevert={onRevert}
              onSave={onSave}
              onAddToCollection={onAddToCollection}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onCollectionAction={onCollectionAction}
            />
          </TabsContent>
          <TabsContent value="accessibility" className="flex-1 overflow-auto mt-0 px-3 pt-3 pb-6">
            <Suspense fallback={<CollectionPanelFallback inlineMode />}>
              <LazyCollectionPanel
                collection={collection}
                currentPalette={currentPalette}
                inlineMode
                defaultTab="a11y"
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="export" className="flex-1 overflow-auto mt-0 px-3 pt-3 pb-6">
            <Suspense fallback={<CollectionPanelFallback inlineMode />}>
              <LazyCollectionPanel
                collection={collection}
                currentPalette={currentPalette}
                inlineMode
                defaultTab="export"
              />
            </Suspense>
          </TabsContent>
        </Tabs>

        {/* Sticky bottom bar removed — save/revert now in top bar */}
      </main>
    </div>
  );
}

// ─── Mobile Layout ───
function MobileLayout({
  controlsNode,
  config,
  currentPalette,
  darkPalette,
  activePaletteId,
  hasPersistedBaseline,
  isDirty,
  onRevert,
  onSave,
  onAddToCollection,
  onDuplicate,
  onDelete,
  onCollectionAction,
  collection,
  onSelectPalette,
  onSaveAndSwitch,
  onSaveNewAndSwitch,
  onNewPalette,
  onNavigateToCollection,
  controlsOpenSignal,
}: {
  controlsNode: (onClose?: () => void) => React.ReactNode;
  config: { name: string };
  currentPalette: any;
  darkPalette: any;
  activePaletteId: string | null;
  hasPersistedBaseline: boolean;
  isDirty: boolean;
  onRevert: () => void;
  onSave: () => unknown;
  onAddToCollection: () => unknown;
  onDuplicate: (name: string) => { ok: boolean; message?: string };
  onDelete: () => void;
  onCollectionAction: (mode: 'move' | 'copy', palette: Palette) => void;
  collection: any[];
  onSelectPalette: (id: string) => void;
  onSaveAndSwitch: (targetId: string) => boolean;
  onSaveNewAndSwitch: (targetId: string) => boolean;
  onNewPalette: () => void;
  onNavigateToCollection: () => void;
  controlsOpenSignal: number;
}) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<ViewMode>('light');
  const [mobileTab, setMobileTab] = useState('preview');

  const { theme, setTheme } = useThemeContext();
  const { contrastAlgorithm, setContrastAlgorithm, collections, activeCollection, handleSelectCollection, handleCreateCollection } = usePaletteContext();

  const navigate = useNavigate();
  const collectionName = activeCollection?.name ?? 'Collection';

  useEffect(() => {
    if (controlsOpenSignal > 0) {
      setControlsOpen(true);
    }
  }, [controlsOpenSignal]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ─── Mobile Top Bar: PaletteSwitcher(compact lg) | ⋮ Edit ─── */}
      <div className="px-3 py-2.5 border-b border-border bg-card flex items-center justify-between gap-2 shrink-0">
        {/* Left: CollectionSwitcher (icon-only) + PaletteSwitcher */}
        <div className="min-w-0 flex-1 flex items-center gap-1 text-muted-foreground">
          <CollectionSwitcher
            collections={collections}
            activeCollectionId={activeCollection?.id ?? null}
            collectionName={collectionName}
            onSelect={(slug, id) => {
              handleSelectCollection(id);
              navigate(`/${slug}`);
            }}
            onCreateNew={() => {
              const { slug } = handleCreateCollection();
              navigate(`/${slug}`);
            }}
            onViewAll={() => navigate('/')}
          />
          <span className="text-muted-foreground/30 select-none text-[13px]" aria-hidden="true">/</span>
          <PaletteSwitcher
            variant="compact"
            compactSize="lg"
            collection={collection}
            currentPalette={currentPalette}
            activePaletteId={activePaletteId}
            isDirty={isDirty}
            currentName={config.name}
            onSelectPalette={onSelectPalette}
            onSaveAndSwitch={onSaveAndSwitch}
            onSaveNewAndSwitch={onSaveNewAndSwitch}
            onNewPalette={onNewPalette}
            onNavigateToCollection={onNavigateToCollection}
          />
        </div>

        {/* Right: contextual actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ThemeSwitcher theme={theme} setTheme={setTheme} />
          <MobileMoreMenu
            isDirty={isDirty}
            isEditingCollection={hasPersistedBaseline}
            onRevert={onRevert}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCollectionAction={onCollectionAction}
            palette={currentPalette}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px] gap-1.5 rounded-md"
            onClick={() => setControlsOpen(true)}
          >
            <Sliders className="w-3.5 h-3.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* Controls Drawer (bottom sheet) */}
      <Drawer open={controlsOpen} onOpenChange={setControlsOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Palette Controls</DrawerTitle>
            <DrawerDescription>Adjust palette hue, chroma, and lightness settings</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1">
            {controlsNode(() => setControlsOpen(false))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* ─── Tabbed content ─── */}
      <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex-1 overflow-hidden flex flex-col">
        <div className="px-3 pt-2 shrink-0">
          <TabsList className="h-8 w-full">
            <TabsTrigger value="preview" className="text-[11px] flex-1 h-6">
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="text-[11px] flex-1 h-6">
              <Contrast className="w-3 h-3 mr-1" />
              A11y
            </TabsTrigger>
            <TabsTrigger value="export" className="text-[11px] flex-1 h-6">
              <Download className="w-3 h-3 mr-1" />
              Export
            </TabsTrigger>
          </TabsList>
        </div>

        {/* View mode toggle — only shown on Preview tab */}
        {mobileTab === 'preview' && (
          <div className="px-3 pt-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <ViewModeToggle value={mobileViewMode} onChange={setMobileViewMode} />
              <AlgorithmToggle value={contrastAlgorithm} onChange={setContrastAlgorithm} />
            </div>
          </div>
        )}

        <TabsContent value="preview" className="flex-1 overflow-hidden mt-0">
          <PaletteWorkspace
            palette={currentPalette}
            darkPalette={darkPalette}
            isEditingCollection={hasPersistedBaseline}
            isDirty={isDirty}
            onRevert={onRevert}
            onSave={onSave}
            onAddToCollection={onAddToCollection}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onCollectionAction={onCollectionAction}
            hideToolbar
            viewMode={mobileViewMode}
            onViewModeChange={setMobileViewMode}
          />
        </TabsContent>
        <TabsContent value="accessibility" className="flex-1 overflow-auto mt-0 px-3 pt-3 pb-6">
          <Suspense fallback={<CollectionPanelFallback inlineMode />}>
            <LazyCollectionPanel
              collection={collection}
              currentPalette={currentPalette}
              inlineMode
              defaultTab="a11y"
            />
          </Suspense>
        </TabsContent>
        <TabsContent value="export" className="flex-1 overflow-auto mt-0 px-3 pt-3 pb-6">
          <Suspense fallback={<CollectionPanelFallback inlineMode />}>
            <LazyCollectionPanel
              collection={collection}
              currentPalette={currentPalette}
              inlineMode
              defaultTab="export"
            />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Sticky bottom bar removed — save/revert now in top bar */}
    </div>
  );
}

export function EditPalettePage() {
  const breakpoint = useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();
  const { collectionSlug, paletteId } = useParams<{ collectionSlug?: string; paletteId?: string }>();
  const {
    config,
    collection,
    activePaletteId,
    activeCollectionId,
    hasPersistedBaseline,
    isDirty,
    paletteNameError,
    currentPalette,
    darkPalette,
    activeCollection,
    collections,
    handleConfigChange,
    handleNameChange,
    handleAddToCollection,
    handleUpdateInCollection,
    handleRevertChanges,
    handleDuplicatePalette,
    handleRemove,
    handleApplyHex,
    startDraftPalette,
    selectPaletteInCollection,
    handleCreateCollection,
  } = usePaletteContext();
  const [pendingCollectionAction, setPendingCollectionAction] = useState<PendingCollectionAction | null>(null);
  const [mobileControlsOpenSignal, setMobileControlsOpenSignal] = useState(0);

  const openMobileControls = useCallback(() => {
    setMobileControlsOpenSignal((value) => value + 1);
  }, []);

  // Set document title: "PaletteName — CollectionName — Colorbound"
  const titleParts = [config.name];
  if (activeCollection) titleParts.push(activeCollection.name);
  useDocumentTitle(titleParts.join(' — '));

  const matchedCollection = collectionSlug
    ? collections.find((candidate) => candidate.slug === collectionSlug) ?? null
    : null;
  const matchedPaletteLocation = paletteId ? findPaletteLocation(collections, paletteId) : null;
  const draftRouteIntent = !!(location.state && typeof location.state === 'object' && 'createDraft' in location.state && location.state.createDraft === true);

  useEffect(() => {
    if (!collectionSlug) {
      if (paletteId) {
        if (matchedPaletteLocation) {
          navigate(
            buildCollectionSavedEditorPath(matchedPaletteLocation.collectionSlug, matchedPaletteLocation.palette.id),
            { replace: true },
          );
          return;
        }

        toast.info('Palette not found');
        navigate(activeCollection ? buildCollectionPath(activeCollection.slug) : '/', { replace: true });
        return;
      }

      if (activeCollection) {
        navigate(buildCollectionDraftEditorPath(activeCollection.slug), { replace: true });
      }
      return;
    }

    if (!matchedCollection) {
      if (activeCollection && activeCollection.slug !== collectionSlug && (!paletteId || activePaletteId === paletteId)) {
        const canonicalPath = paletteId && activePaletteId
          ? buildCollectionSavedEditorPath(activeCollection.slug, activePaletteId)
          : buildCollectionPath(activeCollection.slug);
        navigate(canonicalPath, { replace: true });
        return;
      }
      return;
    }

    if (!paletteId) {
      if (draftRouteIntent) {
        if (activeCollectionId !== matchedCollection.id || activePaletteId !== null) {
          startDraftPalette(matchedCollection.id);
        }
        return;
      }

      if (hasPersistedBaseline && activeCollectionId === matchedCollection.id && activePaletteId) {
        navigate(
          buildCollectionSavedEditorPath(matchedCollection.slug, activePaletteId),
          { replace: true },
        );
        return;
      }

      if (activeCollectionId !== matchedCollection.id || activePaletteId !== null) {
        startDraftPalette(matchedCollection.id);
      }
      return;
    }

    if (!matchedPaletteLocation) {
      toast.info('Palette not found');
      navigate(buildCollectionPath(matchedCollection.slug), { replace: true });
      return;
    }

    if (matchedPaletteLocation.collectionId !== matchedCollection.id) {
      navigate(
        buildCollectionSavedEditorPath(matchedPaletteLocation.collectionSlug, matchedPaletteLocation.palette.id),
        { replace: true },
      );
      return;
    }

    if (activeCollectionId !== matchedCollection.id || activePaletteId !== paletteId) {
      selectPaletteInCollection(matchedCollection.id, paletteId);
    }
  }, [
    activeCollection,
    activeCollectionId,
    activePaletteId,
    collectionSlug,
    collections,
    hasPersistedBaseline,
    matchedCollection,
    matchedPaletteLocation,
    navigate,
    draftRouteIntent,
    paletteId,
    selectPaletteInCollection,
    startDraftPalette,
  ]);

  // ─── Fix #3: Block in-app navigation when palette has unsaved changes ───
  const blocker = useBlocker(isDirty && hasPersistedBaseline);

  const basePath = activeCollection ? buildCollectionPath(activeCollection.slug) : '/';

  const handleDeletePalette = useCallback(() => {
    if (!activePaletteId) return;
    handleRemove(activePaletteId);
    navigate(basePath);
  }, [activePaletteId, handleRemove, navigate, basePath]);

  // ─── PaletteSwitcher callbacks for mobile ───
  const handleSelectPalette = useCallback(
    (id: string) => {
      if (!activeCollection) return;
      navigate(buildCollectionSavedEditorPath(activeCollection.slug, id));
    },
    [activeCollection, navigate]
  );

  const handleSaveAndSwitch = useCallback(
    (targetId: string): boolean => {
      if (!activeCollection) return false;
      const result = handleUpdateInCollection();
      if (!result.ok) {
        openMobileControls();
        return false;
      }
      navigate(buildCollectionSavedEditorPath(activeCollection.slug, targetId));
      return true;
    },
    [activeCollection, handleUpdateInCollection, navigate, openMobileControls]
  );

  const handleSaveNewAndSwitch = useCallback(
    (targetId: string): boolean => {
      if (!activeCollection) return false;
      const result = handleAddToCollection();
      if (!result.ok) {
        openMobileControls();
        return false;
      }
      navigate(buildCollectionSavedEditorPath(activeCollection.slug, targetId));
      return true;
    },
    [activeCollection, handleAddToCollection, navigate, openMobileControls]
  );

  const handleSaveDraftPalette = useCallback(() => {
    if (!activeCollection) return;
    const result = handleAddToCollection();
    if (!result.ok) {
      openMobileControls();
      return;
    }
    navigate(buildCollectionSavedEditorPath(activeCollection.slug, result.paletteId), { replace: true });
  }, [activeCollection, handleAddToCollection, navigate, openMobileControls]);

  const handleCreateNewPalette = useCallback(() => {
    if (!activeCollection) return;
    startDraftPalette(activeCollection.id);
    navigate(buildCollectionDraftEditorPath(activeCollection.slug), {
      state: { createDraft: true },
    });
  }, [activeCollection, navigate, startDraftPalette]);

  const handleNavigateToCollection = useCallback(() => {
    navigate(basePath);
  }, [navigate, basePath]);

  const handleCollectionAction = useCallback((mode: 'move' | 'copy', palette: Palette) => {
    if (!activeCollectionId) return;

    setPendingCollectionAction({
      mode,
      sourceCollectionId: activeCollectionId,
      paletteId: activePaletteId ?? palette.id,
      paletteName: palette.name,
    });
  }, [activeCollectionId, activePaletteId]);

  const controlsNode = (onClose?: () => void) => (
    <PaletteControls
      config={config}
      onConfigChange={handleConfigChange}
      onNameChange={handleNameChange}
      onApplyHex={handleApplyHex}
      paletteNameError={paletteNameError}
      isDirty={isDirty}
      activePaletteId={activePaletteId}
      hasPersistedBaseline={hasPersistedBaseline}
      onSave={handleUpdateInCollection}
      onAddToCollection={handleSaveDraftPalette}
      onRevert={handleRevertChanges}
      onClose={onClose}
    />
  );

  // Shared props for layout components
  const layoutProps = {
    controlsNode,
    currentPalette,
    darkPalette,
    activePaletteId,
    hasPersistedBaseline,
    isDirty,
    onRevert: handleRevertChanges,
    onSave: handleUpdateInCollection,
    onAddToCollection: handleSaveDraftPalette,
    onDuplicate: handleDuplicatePalette,
    onDelete: handleDeletePalette,
    onCollectionAction: handleCollectionAction,
    collection,
  };

  // No early returns — use conditional rendering to keep hook count stable

  const unsavedChangesDialog = (
    <AlertDialog open={blocker.state === 'blocked'} onOpenChange={(open) => { if (!open) blocker.reset?.(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes to "{config.name}". Do you want to save before leaving, or discard your changes?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={() => blocker.reset?.()}>
            Keep editing
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => {
              handleRevertChanges({ silent: true });
              blocker.proceed?.();
            }}
          >
            Discard changes
          </Button>
          <Button
            onClick={() => {
              const result = handleUpdateInCollection();
              if (!result.ok) {
                openMobileControls();
                return;
              }
              blocker.proceed?.();
            }}
          >
            Save and leave
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const collectionActionDialog = pendingCollectionAction ? (
    <MoveToCollectionDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          setPendingCollectionAction(null);
        }
      }}
      sourceCollectionId={pendingCollectionAction.sourceCollectionId}
      paletteId={pendingCollectionAction.paletteId}
      paletteName={pendingCollectionAction.paletteName}
      mode={pendingCollectionAction.mode}
      onCreateCollection={handleCreateCollection}
    />
  ) : null;

  if (breakpoint === 'desktop') {
    return <>{unsavedChangesDialog}{collectionActionDialog}<DesktopLayout {...layoutProps} /></>;
  }

  if (breakpoint === 'tablet') {
    return <>{unsavedChangesDialog}{collectionActionDialog}<TabletLayout {...layoutProps} /></>;
  }

  return (
    <>
      {unsavedChangesDialog}
      {collectionActionDialog}
      <MobileLayout
        {...layoutProps}
        config={config}
        onSelectPalette={handleSelectPalette}
        onSaveAndSwitch={handleSaveAndSwitch}
        onSaveNewAndSwitch={handleSaveNewAndSwitch}
        onNewPalette={handleCreateNewPalette}
        onNavigateToCollection={handleNavigateToCollection}
        controlsOpenSignal={mobileControlsOpenSignal}
      />
    </>
  );
}

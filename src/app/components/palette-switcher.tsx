/**
 * PaletteSwitcher — a Popover-based quick-switcher that replaces
 * the old "← Collection" back button in the sidebar.
 *
 * Shows a compact trigger with a mini color ramp + palette name,
 * and opens a popover listing all saved palettes for instant switching.
 *
 * Uses Popover instead of heavier menu/select primitives so the switcher stays
 * inline with the current layout and avoids cross-tree portal behavior.
 */
import React, { Suspense, lazy, useState, useMemo, useCallback, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import {
  ChevronDown,
  Check,
  Plus,
  Rows3,
  Search,
  CopyPlus,
  Share2,
  FolderOutput,
  FolderGit2,
  Trash2,
} from 'lucide-react';
import type { Palette } from '../lib/color-utils';
import { getRampDisplayColors } from '../lib/palette-preview';
import { getPaletteSwitcherViewportClass } from './switcher-viewport';
import { PopoverMenuItem } from './popover-menu-item';
export {
  getRampColors,
  getRampDisplayColors,
  RAMP_SAMPLE_STEPS,
} from '../lib/palette-preview';

const LazyPaletteActionDialogs = lazy(async () => {
  const module = await import('./palette-action-dialogs');
  return { default: module.PaletteActionDialogs };
});

// ─── Sub-components ───

/** Five-swatch horizontal mini ramp */
function MiniRamp({
  colors,
  size = 'md',
}: {
  colors: string[];
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  return (
    <div className="flex gap-0.5 shrink-0" aria-hidden="true">
      {colors.map((color, i) => (
        <div
          key={i}
          className={`${dim} rounded-[2px] border border-border/40`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

/** A single row in the palette list */
function PaletteRow({
  palette,
  isActive,
  onClick,
}: {
  palette: Palette;
  isActive: boolean;
  onClick: () => void;
}) {
  const rampColors = useMemo(() => getRampDisplayColors(palette.tokens), [palette.tokens]);

  return (
    <button
      type="button"
      role="option"
      aria-selected={isActive}
      aria-label={`${palette.name}, density ${palette.density ?? 11}${isActive ? ', currently active' : ''}`}
      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors outline-none select-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50 hover:text-accent-foreground cursor-pointer'
      }`}
      onClick={onClick}
    >
      <MiniRamp colors={rampColors} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] truncate">{palette.name}</span>
          {isActive && <Check className="w-3 h-3 shrink-0 opacity-60" />}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            Density {palette.density ?? 11}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Main component ───

export interface PaletteSwitcherProps {
  collection: Palette[];
  currentPalette: Palette;
  activePaletteId: string | null;
  isDirty: boolean;
  currentName: string;
  onSelectPalette: (id: string) => void;
  onNewPalette: () => void;
  onNavigateToCollection: () => void;
  /** 'default' = sidebar trigger (mini ramp + details), 'compact' = breadcrumb trigger (dot + name) */
  variant?: 'default' | 'compact';
  /** Compact trigger sizing: 'sm' = header breadcrumb, 'lg' = mobile top bar */
  compactSize?: 'sm' | 'lg';
  showPaletteActions?: boolean;
  isEditingCollection?: boolean;
  onDuplicate?: (name: string) => { ok: boolean; message?: string };
  onDelete?: () => void;
  onCollectionAction?: (mode: 'move' | 'copy', palette: Palette) => void;
}

export function PaletteSwitcher({
  collection = [],
  currentPalette,
  activePaletteId,
  isDirty,
  currentName,
  onSelectPalette,
  onNewPalette,
  onNavigateToCollection,
  variant = 'default',
  compactSize = 'sm',
  showPaletteActions = false,
  isEditingCollection = false,
  onDuplicate,
  onDelete,
  onCollectionAction,
}: PaletteSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [dupOpen, setDupOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const filterInputId = 'palette-switcher-filter';

  // Reset state when popover closes
  useEffect(() => {
    if (!open) {
      setFilter('');
    }
  }, [open]);

  // Focus filter on open (if shown)
  useEffect(() => {
    if (open && collection.length > 5) {
      // Small delay to let popover animate
      const t = setTimeout(() => {
        const el = document.getElementById(filterInputId) as HTMLInputElement | null;
        el?.focus();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [open, collection.length]);

  const filteredCollection = useMemo(() => {
    if (!filter.trim()) return collection;
    const q = filter.toLowerCase().trim();
    return collection.filter((p) => p.name.toLowerCase().includes(q));
  }, [collection, filter]);

  const handleRowClick = useCallback(
    (id: string) => {
      // Already viewing this palette
      if (id === activePaletteId) {
        setOpen(false);
        return;
      }

      setOpen(false);
      onSelectPalette(id);
    },
    [activePaletteId, onSelectPalette],
  );

  const handleNewPalette = useCallback(() => {
    setOpen(false);
    onNewPalette();
  }, [onNewPalette]);

  const handleViewAll = useCallback(() => {
    setOpen(false);
    onNavigateToCollection();
  }, [onNavigateToCollection]);

  const hasCollection = collection.length > 0;
  const showFilter = collection.length > 5;
  const showCollectionActions = showPaletteActions && isEditingCollection;

  /** Representative color for the compact variant (step 500 token) */
  const representativeColor = useMemo(() => {
    const t = currentPalette?.tokens?.find((tok) => tok.step === 500);
    return t?.hex ?? '#888888';
  }, [currentPalette?.tokens]);
  const triggerAriaLabel = `${showPaletteActions ? 'Palette menu' : 'Switch palette'}. Currently editing: ${currentName}`;

  const handlePaletteAction = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  const triggerClassName =
    compactSize === 'lg'
      ? 'inline-flex items-center gap-2 rounded-md h-8 px-2 text-left transition-colors hover:bg-accent cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]'
      : 'inline-flex items-center gap-2 rounded-md h-8 px-2 text-left transition-colors hover:bg-accent cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]';

  /**
   * Compact trigger — used in header breadcrumb and mobile top bar.
   * Shows: colored dot + palette name + chevron
   */
  const compactTrigger = (
    <PopoverTrigger
      className={triggerClassName}
      aria-label={triggerAriaLabel}
    >
      <div
        className="w-3.5 h-3.5 rounded-[3px] shrink-0"
        style={{ backgroundColor: representativeColor }}
        aria-hidden="true"
      />
      <span className="text-[13px] font-medium truncate max-w-[160px]">
        {currentName || 'Untitled'}
      </span>
      {isDirty && activePaletteId && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" role="status" aria-label="Unsaved changes" />
      )}
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </PopoverTrigger>
  );

  const defaultTrigger = (
    <PopoverTrigger
      className="inline-flex items-center gap-2 rounded-md h-8 px-2 text-left transition-colors hover:bg-accent cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      aria-label={triggerAriaLabel}
    >
      <div
        className="w-3.5 h-3.5 rounded-[3px] shrink-0"
        style={{ backgroundColor: representativeColor }}
        aria-hidden="true"
      />
      <span className="text-[13px] font-medium truncate max-w-[160px]">
        {currentName || 'Untitled'}
      </span>
      {isDirty && activePaletteId && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" role="status" aria-label="Unsaved changes" />
      )}
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </PopoverTrigger>
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        {variant === 'compact' ? compactTrigger : defaultTrigger}

        <PopoverContent
          align="start"
          side="bottom"
          collisionPadding={8}
          className="w-[var(--radix-popover-trigger-width)] min-w-[220px] max-h-[var(--radix-popover-content-available-height)] p-0 flex flex-col overflow-hidden"
        >
          {/* Filter */}
          {showFilter && (
            <div className="p-2 pb-0 shrink-0">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                <Input
                  id={filterInputId}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter palettes…"
                  className="h-7 text-[13px] pl-7 pr-2"
                  aria-label="Filter palettes"
                />
              </div>
            </div>
          )}

          {/* Palette list */}
          <div className={`p-1 ${getPaletteSwitcherViewportClass()} overflow-y-auto`}>
            {hasCollection ? (
              <div role="listbox" aria-label="Saved palettes">
                {filteredCollection.length > 0 ? (
                  filteredCollection.map((palette) => (
                    <PaletteRow
                      key={palette.id}
                      palette={palette}
                      isActive={palette.id === activePaletteId}
                      onClick={() => handleRowClick(palette.id)}
                    />
                  ))
                ) : (
                  <p className="text-[11px] text-muted-foreground text-center py-4 px-2">
                    No palettes match "{filter}"
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4 px-2">
                <p className="text-[11px] text-muted-foreground">
                  No saved palettes yet
                </p>
              </div>
            )}
          </div>

          <Separator className="shrink-0" />

          {/* Footer actions */}
          <div className="p-1 space-y-0.5 shrink-0">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[12px] transition-colors outline-none select-none hover:bg-accent hover:text-accent-foreground cursor-pointer focus-visible:bg-accent"
              onClick={handleNewPalette}
            >
              <Plus className="w-3.5 h-3.5" />
              New palette
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[12px] text-muted-foreground transition-colors outline-none select-none hover:bg-accent hover:text-accent-foreground cursor-pointer focus-visible:bg-accent"
              onClick={handleViewAll}
            >
              <Rows3 className="w-3.5 h-3.5" />
              View all palettes
            </button>
          </div>

          {showPaletteActions && (
            <>
              <Separator className="shrink-0" />
              <div className="p-1 space-y-0.5 shrink-0">
                <PopoverMenuItem onClick={() => handlePaletteAction(() => setDupOpen(true))}>
                  <CopyPlus className="w-3.5 h-3.5" />
                  Duplicate palette
                </PopoverMenuItem>
                <PopoverMenuItem
                  onClick={() => handlePaletteAction(() => setShareOpen(true))}
                  disabled={isDirty}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="flex flex-col items-start">
                    <span>Share palette</span>
                    {isDirty && <span className="text-[10px] text-muted-foreground font-normal">Save changes first</span>}
                  </span>
                </PopoverMenuItem>
                {showCollectionActions && (
                  <>
                    <PopoverMenuItem
                      onClick={() => handlePaletteAction(() => onCollectionAction?.('move', currentPalette))}
                    >
                      <FolderOutput className="w-3.5 h-3.5" />
                      Move to project
                    </PopoverMenuItem>
                    <PopoverMenuItem
                      onClick={() => handlePaletteAction(() => onCollectionAction?.('copy', currentPalette))}
                    >
                      <FolderGit2 className="w-3.5 h-3.5" />
                      Duplicate to project
                    </PopoverMenuItem>
                  </>
                )}
                {showCollectionActions && onDelete && (
                  <PopoverMenuItem
                    onClick={() => handlePaletteAction(() => setDeleteOpen(true))}
                    variant="destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete palette
                  </PopoverMenuItem>
                )}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      {(dupOpen || shareOpen || deleteOpen) && (
        <Suspense fallback={null}>
          <LazyPaletteActionDialogs
            palette={currentPalette}
            dupOpen={dupOpen}
            shareOpen={shareOpen}
            deleteOpen={deleteOpen}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onDupOpenChange={setDupOpen}
            onShareOpenChange={setShareOpen}
            onDeleteOpenChange={setDeleteOpen}
          />
        </Suspense>
      )}
    </>
  );
}

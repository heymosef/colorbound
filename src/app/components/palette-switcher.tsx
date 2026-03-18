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
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import {
  ChevronDown,
  Check,
  Plus,
  Layers,
  Search,
  AlertTriangle,
} from 'lucide-react';
import type { Palette } from '../lib/color-utils';
import { getRampDisplayColors } from '../lib/palette-preview';
export {
  getRampColors,
  getRampDisplayColors,
  RAMP_SAMPLE_STEPS,
} from '../lib/palette-preview';

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
      aria-label={`${palette.name}, ${palette.tokens.length} tokens${isActive ? ', currently active' : ''}`}
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
            {palette.tokens.length} tokens
          </span>
        </div>
      </div>
    </button>
  );
}

/** Inline dirty-state confirmation strip */
function DirtyConfirmation({
  currentName,
  isUnsaved,
  onSaveAndSwitch,
  onDiscard,
  onCancel,
}: {
  currentName: string;
  isUnsaved: boolean;
  onSaveAndSwitch: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="px-2 py-2 space-y-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md mx-1 mb-1">
      <div className="flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-800 dark:text-amber-300">
          {isUnsaved
            ? `"${currentName}" is unsaved`
            : `Unsaved changes to "${currentName}"`}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          className="h-6 text-[10px] px-2 whitespace-nowrap"
          onClick={onSaveAndSwitch}
        >
          {isUnsaved ? 'Save & Switch' : 'Update & Switch'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] px-2 whitespace-nowrap"
          onClick={onDiscard}
        >
          Discard
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[10px] px-2 whitespace-nowrap"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
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
  onSaveAndSwitch: (targetId: string) => void;
  onSaveNewAndSwitch: (targetId: string) => void;
  onNewPalette: () => void;
  onNavigateToCollection: () => void;
  /** Called after a switch completes — e.g. close mobile Sheet */
  onAfterSwitch?: () => void;
  /** 'default' = sidebar trigger (mini ramp + details), 'compact' = breadcrumb trigger (dot + name) */
  variant?: 'default' | 'compact';
  /** Compact trigger sizing: 'sm' = header breadcrumb, 'lg' = mobile top bar */
  compactSize?: 'sm' | 'lg';
}

export function PaletteSwitcher({
  collection = [],
  currentPalette,
  activePaletteId,
  isDirty,
  currentName,
  onSelectPalette,
  onSaveAndSwitch,
  onSaveNewAndSwitch,
  onNewPalette,
  onNavigateToCollection,
  onAfterSwitch,
  variant = 'default',
  compactSize = 'sm',
}: PaletteSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [pendingSwitchId, setPendingSwitchId] = useState<string | null>(null);
  const filterInputId = 'palette-switcher-filter';

  // Reset state when popover closes
  useEffect(() => {
    if (!open) {
      setFilter('');
      setPendingSwitchId(null);
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
    return collection.filter(
      (p) => p.name.toLowerCase().includes(q)
    );
  }, [collection, filter]);

  const rampColors = useMemo(
    () => getRampDisplayColors(currentPalette?.tokens ?? []),
    [currentPalette?.tokens]
  );

  const isUnsaved = !activePaletteId;

  const handleRowClick = useCallback(
    (id: string) => {
      // Already viewing this palette
      if (id === activePaletteId) {
        setOpen(false);
        return;
      }
      // If dirty, show confirmation
      if (isDirty || isUnsaved) {
        setPendingSwitchId(id);
        return;
      }
      // Clean switch
      onSelectPalette(id);
      setOpen(false);
      onAfterSwitch?.();
    },
    [activePaletteId, isDirty, isUnsaved, onSelectPalette, onAfterSwitch]
  );

  const handleSaveAndSwitch = useCallback(() => {
    if (!pendingSwitchId) return;
    if (isUnsaved) {
      onSaveNewAndSwitch(pendingSwitchId);
    } else {
      onSaveAndSwitch(pendingSwitchId);
    }
    setPendingSwitchId(null);
    setOpen(false);
    onAfterSwitch?.();
  }, [pendingSwitchId, isUnsaved, onSaveAndSwitch, onSaveNewAndSwitch, onAfterSwitch]);

  const handleDiscard = useCallback(() => {
    if (!pendingSwitchId) return;
    onSelectPalette(pendingSwitchId);
    setPendingSwitchId(null);
    setOpen(false);
    onAfterSwitch?.();
  }, [pendingSwitchId, onSelectPalette, onAfterSwitch]);

  const handleCancel = useCallback(() => {
    setPendingSwitchId(null);
  }, []);

  const handleNewPalette = useCallback(() => {
    onNewPalette();
    setOpen(false);
    onAfterSwitch?.();
  }, [onNewPalette, onAfterSwitch]);

  const handleViewAll = useCallback(() => {
    onNavigateToCollection();
    setOpen(false);
    onAfterSwitch?.();
  }, [onNavigateToCollection, onAfterSwitch]);

  const hasCollection = collection.length > 0;
  const showFilter = collection.length > 5;

  /** Representative color for the compact variant (step 500 token) */
  const representativeColor = useMemo(() => {
    const t = currentPalette?.tokens?.find((tok) => tok.step === 500);
    return t?.displayCss ?? '#888888';
  }, [currentPalette?.tokens]);

  /**
   * Compact trigger — used in header breadcrumb and mobile top bar.
   * Shows: colored dot + palette name + chevron
   */
  const compactTrigger = (
    <PopoverTrigger
      className="inline-flex items-center gap-2 rounded-md h-8 px-2 text-left transition-colors hover:bg-accent cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      aria-label={`Switch palette. Currently editing: ${currentName}`}
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
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved changes" />
      )}
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </PopoverTrigger>
  );

  const defaultTrigger = (
    <PopoverTrigger
      className="inline-flex items-center gap-2 rounded-md h-8 px-2 text-left transition-colors hover:bg-accent cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      aria-label={`Switch palette. Currently editing: ${currentName}`}
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
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved changes" />
      )}
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    </PopoverTrigger>
  );

  return (
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
        <div className="p-1 max-h-[240px] overflow-y-auto">
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

        {/* Dirty confirmation */}
        {pendingSwitchId && (
          <div className="shrink-0">
            <DirtyConfirmation
              currentName={currentName}
              isUnsaved={isUnsaved}
              onSaveAndSwitch={handleSaveAndSwitch}
              onDiscard={handleDiscard}
              onCancel={handleCancel}
            />
          </div>
        )}

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
            <Layers className="w-3.5 h-3.5" />
            View all palettes
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

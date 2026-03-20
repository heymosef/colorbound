/**
 * Palette Workspace — main content area showing palette swatches,
 * token table, and UI preview.
 *
 * The toolbar shows the palette name, a More menu (⋮) with contextual
 * actions (duplicate, share, move/copy, delete), and a
 * ViewModeToggle (Light | Dark | Both). The toolbar layout is the same
 * regardless of dirty/clean state.
 *
 * On mobile, the toolbar is hidden (hideToolbar) and actions are handled
 * by EditPalettePage's top bar and More menu.
 */

import React, { Suspense, lazy, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import {
  Moon, Sun, MoreVertical,
  CopyPlus, Trash2, Share2, FolderInput, FolderOutput,
} from 'lucide-react';
import type { Palette } from '../lib/color-utils';
import { UIPreview } from './ui-preview';
import { ContrastRow, AlgorithmToggle } from './contrast-indicator';
import { useSupportsP3, getTokenDisplayColor } from '../lib/use-supports-p3';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from './ui/table';
import { usePaletteContext } from '../lib/palette-context';
import { PopoverMenuItem } from './popover-menu-item';
import { ViewModeToggle, type ViewMode } from './palette-view-mode-toggle';
import { CopyableTokenSwatch } from './copyable-token-swatch';

interface PaletteWorkspaceProps {
  palette: Palette | null;
  darkPalette: Palette | null;
  /** Whether the palette is linked to a saved collection entry */
  isEditingCollection?: boolean;
  isDirty?: boolean;
  onRevert?: () => void;
  onSave?: () => void;
  onAddToCollection?: () => void;
  onDuplicate?: (name: string) => void;
  onDelete?: () => void;
  onCollectionAction?: (mode: 'move' | 'copy', palette: Palette) => void;
  /** Mobile: hide the built-in toolbar (handled externally by EditPalettePage) */
  hideToolbar?: boolean;
  /** Controlled view mode (for mobile, where toggle lives outside the workspace) */
  viewMode?: ViewMode;
  onViewModeChange?: (v: ViewMode) => void;
}

const LazyPaletteActionDialogs = lazy(async () => {
  const module = await import('./palette-action-dialogs');
  return { default: module.PaletteActionDialogs };
});

function PaletteRow({
  palette,
  label,
}: {
  palette: Palette;
  label?: string;
}) {
  const isDarkMode = label === 'Dark Palette';
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center gap-2">
          {label === 'Light Palette' ? (
            <Sun className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <p className="text-[12px] text-muted-foreground">{label}</p>
        </div>
      )}
      {/* Desktop/tablet: flex row. Mobile: horizontal scroll */}
      <div
        className="overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory"
      >
        <div className="space-y-1.5 min-w-max">
          <div
            className="flex gap-1.5"
            role="list"
            aria-label={`${label ?? 'Palette'} token swatches`}
          >
            {palette.tokens.map((token) => (
              <div key={token.step} className="flex-1 min-w-[72px] snap-start" role="listitem">
                <CopyableTokenSwatch
                  token={token}
                  paletteName={palette.name}
                  variant="workspace"
                  preferBestAvailableColor
                />
              </div>
            ))}
          </div>
          {/* WCAG contrast indicators */}
          <ContrastRow tokens={palette.tokens} isDarkMode={isDarkMode} />
        </div>
      </div>
    </div>
  );
}

// ─── Shared overflow menu for desktop + mobile ───

function PaletteMoreMenu({
  isDirty,
  isEditingCollection,
  onDuplicate,
  onDelete,
  onCollectionAction,
  palette,
  triggerClassName = 'inline-flex items-center justify-center rounded-md h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
}: {
  isDirty?: boolean;
  isEditingCollection?: boolean;
  onDuplicate?: (name: string) => void;
  onDelete?: () => void;
  onCollectionAction?: (mode: 'move' | 'copy', palette: Palette) => void;
  palette: Palette;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={triggerClassName}
          aria-label="More actions"
        >
          <MoreVertical className="w-4 h-4" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[210px] p-1">
          {/* Duplicate */}
          <PopoverMenuItem onClick={() => handleAction(() => setDupOpen(true))}>
            <CopyPlus className="w-3.5 h-3.5" />
            Duplicate palette
          </PopoverMenuItem>
          {/* Share — opens share dialog, disabled when dirty */}
          <PopoverMenuItem
            onClick={() => handleAction(() => setShareOpen(true))}
            disabled={isDirty}
          >
            <Share2 className="w-3.5 h-3.5" />
            Share palette
          </PopoverMenuItem>

          {/* Move / Copy to collection */}
          {isEditingCollection && (
            <>
              <Separator className="my-1" />
              <PopoverMenuItem
                onClick={() => handleAction(() => onCollectionAction?.('move', palette))}
              >
                <FolderOutput className="w-3.5 h-3.5" />
                Move to collection…
              </PopoverMenuItem>
              <PopoverMenuItem
                onClick={() => handleAction(() => onCollectionAction?.('copy', palette))}
              >
                <FolderInput className="w-3.5 h-3.5" />
                Duplicate to collection…
              </PopoverMenuItem>
            </>
          )}

          {/* Delete */}
          {isEditingCollection && onDelete && (
            <>
              <Separator className="my-1" />
              <PopoverMenuItem
                onClick={() => handleAction(() => setDeleteOpen(true))}
                variant="destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete palette
              </PopoverMenuItem>
            </>
          )}
        </PopoverContent>
      </Popover>

      {(dupOpen || shareOpen || deleteOpen) && (
        <Suspense fallback={null}>
          <LazyPaletteActionDialogs
            palette={palette}
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

// Mobile top bar wrapper used by EditPalettePage.

export function MobileMoreMenu({
  isDirty,
  isEditingCollection,
  onRevert: _onRevert,
  onDuplicate,
  onDelete,
  onCollectionAction,
  palette,
}: {
  isDirty?: boolean;
  isEditingCollection?: boolean;
  onRevert?: () => void;
  onDuplicate?: (name: string) => void;
  onDelete?: () => void;
  onCollectionAction?: (mode: 'move' | 'copy', palette: Palette) => void;
  palette: Palette;
}) {
  return (
    <PaletteMoreMenu
      isDirty={isDirty}
      isEditingCollection={isEditingCollection}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onCollectionAction={onCollectionAction}
      palette={palette}
    />
  );
}

export function PaletteWorkspace({
  palette,
  darkPalette,
  isEditingCollection,
  isDirty,
  onRevert,
  onSave,
  onAddToCollection,
  onDuplicate,
  onDelete,
  onCollectionAction,
  hideToolbar = false,
  viewMode: controlledViewMode,
  onViewModeChange,
}: PaletteWorkspaceProps) {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('light');

  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;
  const { contrastAlgorithm, setContrastAlgorithm } = usePaletteContext();
  const supportsP3 = useSupportsP3();

  if (!palette) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Sun className="w-5 h-5" />
          </div>
          <p className="text-[14px]">Generate a palette to get started</p>
          <p className="text-[12px]">Use the controls on the left to configure your color ramp</p>
        </div>
      </div>
    );
  }

  const activePalette = viewMode === 'dark' && darkPalette ? darkPalette : palette;
  const previewLimited = palette.targetColorSpace === 'p3' && !supportsP3;

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* ─── Desktop/Tablet Toolbar ─── */}
      {!hideToolbar && (
        <div className="px-3 sm:px-5 py-3 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <h2 className="text-[14px] sm:text-[15px] font-medium truncate min-w-0">{palette.name}</h2>
              <PaletteMoreMenu
                isDirty={isDirty}
                isEditingCollection={isEditingCollection}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onCollectionAction={onCollectionAction}
                palette={palette}
              />
            </div>
            <div className="flex items-center gap-2">
              <AlgorithmToggle value={contrastAlgorithm} onChange={setContrastAlgorithm} />
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </div>
      )}

      <div className="p-3 sm:p-5 space-y-6 flex-1">
        {previewLimited && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            Preview limited: this display shows the sRGB fallback for P3-target colors.
          </div>
        )}

        {/* Palette swatches */}
        {viewMode === 'both' ? (
          <div className="space-y-5">
            <PaletteRow palette={palette} label="Light Palette" />
            {darkPalette && <PaletteRow palette={darkPalette} label="Dark Palette" />}
          </div>
        ) : viewMode === 'dark' ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Moon className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[12px] text-muted-foreground">Dark-mode optimized palette</p>
            </div>
            {darkPalette && (
              <div className="overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
                <div className="space-y-1.5 min-w-max">
                  <div className="flex gap-1.5" role="list" aria-label="Dark palette token swatches">
                    {darkPalette.tokens.map((token) => (
                      <div key={token.step} className="flex-1 min-w-[72px] snap-start" role="listitem">
                        <CopyableTokenSwatch
                          token={token}
                          paletteName={darkPalette.name}
                          variant="workspace"
                          preferBestAvailableColor
                        />
                      </div>
                    ))}
                  </div>
                  <ContrastRow tokens={darkPalette.tokens} isDarkMode />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[12px] text-muted-foreground">Light-mode optimized palette</p>
            </div>
            <div className="overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
              <div className="space-y-1.5 min-w-max">
                <div className="flex gap-1.5" role="list" aria-label="Color token swatches">
                  {palette.tokens.map((token) => (
                    <div key={token.step} className="flex-1 min-w-[72px] snap-start" role="listitem">
                      <CopyableTokenSwatch
                        token={token}
                        paletteName={palette.name}
                        variant="workspace"
                        preferBestAvailableColor
                      />
                    </div>
                  ))}
                </div>
                <ContrastRow tokens={palette.tokens} isDarkMode={false} />
              </div>
            </div>
          </div>
        )}

        {/* Token Table */}
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="h-8">
            <TabsTrigger value="preview" className="text-[12px] h-6">
              UI Preview
            </TabsTrigger>
            <TabsTrigger value="values" className="text-[12px] h-6">
              Token Values
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <UIPreview palette={activePalette} />
          </TabsContent>

          <TabsContent value="values" className="mt-4">
            <div className="space-y-2">
              <div className="rounded-md border border-border overflow-hidden overflow-x-auto">
                <Table className="text-[12px]" aria-label="Token values table">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="px-3 py-2 h-auto font-mono text-[12px]" scope="col">Step</TableHead>
                      <TableHead className="px-3 py-2 h-auto font-mono text-[12px]" scope="col">OKLCH</TableHead>
                      <TableHead className="px-3 py-2 h-auto font-mono text-[12px]" scope="col">Hex</TableHead>
                      <TableHead className="px-3 py-2 h-auto font-mono text-[12px] hidden sm:table-cell" scope="col">RGB</TableHead>
                      <TableHead className="px-3 py-2 h-auto text-center text-[12px]" scope="col">Swatch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activePalette.tokens.map((token) => {
                      return (
                        <TableRow key={token.step}>
                          <TableCell className="px-3 py-1.5 font-mono">{token.step}</TableCell>
                          <TableCell className="px-3 py-1.5 font-mono text-muted-foreground">{token.targetCss}</TableCell>
                          <TableCell className="px-3 py-1.5 font-mono text-muted-foreground">{token.hex}</TableCell>
                          <TableCell className="px-3 py-1.5 font-mono text-muted-foreground hidden sm:table-cell">{token.rgb}</TableCell>
                          <TableCell className="px-3 py-1.5 text-center">
                            <div
                              className="w-6 h-4 rounded-sm mx-auto border border-border"
                              style={{ backgroundColor: getTokenDisplayColor(token, supportsP3) }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {activePalette.targetColorSpace === 'p3'
                  ? 'OKLCH is the main color value for this palette and is designed for Display P3. Use it when you want the richer P3 version; Hex and RGB show the more widely compatible sRGB version.'
                  : 'OKLCH is the main color value for this palette. Hex and RGB show the same color in the more widely compatible sRGB formats used by many apps and tools.'}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

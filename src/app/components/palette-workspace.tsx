/**
 * Palette Workspace — main content area showing palette swatches,
 * token table, and UI preview.
 *
 * The toolbar shows view/accessibility controls only.
 *
 * On mobile, the toolbar is hidden (hideToolbar) and actions are handled
 * by EditPalettePage's top bar and the global header palette menu.
 */

import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Moon, Sun } from 'lucide-react';
import type { Palette } from '../lib/color-utils';
import { getVisiblePaletteTokens } from '../lib/palette-density';
import { UIPreview } from './ui-preview';
import { ContrastRow } from './contrast-indicator';
import { useSupportsP3, getTokenDisplayColor } from '../lib/use-supports-p3';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from './ui/table';
import { track } from '../lib/analytics';
import { ViewModeToggle, type ViewMode } from './palette-view-mode-toggle';
import { CopyableTokenSwatch } from './copyable-token-swatch';

interface PaletteWorkspaceProps {
  palette: Palette | null;
  darkPalette: Palette | null;
  /** Whether the palette is linked to a saved collection entry */
  isEditingCollection?: boolean;
  isDirty?: boolean;
  onRevert?: () => void;
  onSave?: () => unknown;
  onAddToCollection?: () => unknown;
  onDuplicate?: (name: string) => { ok: boolean; message?: string };
  onDelete?: () => void;
  onCollectionAction?: (mode: 'move' | 'copy', palette: Palette) => void;
  /** Controlled view mode (for mobile, where toggle lives outside the workspace) */
  viewMode?: ViewMode;
  onViewModeChange?: (v: ViewMode) => void;
  /** When true, fills the available region and manages its own scrolling. */
  fillHeight?: boolean;
  /** Mobile: render palette controls as an additional inner tab */
  controlsNode?: React.ReactNode;
}

function PaletteRow({
  palette,
  label,
}: {
  palette: Palette;
  label?: string;
}) {
  const isDarkMode = label === 'Dark-mode optimized palette';
  const visibleTokens = getVisiblePaletteTokens(palette);
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center gap-2">
          {isDarkMode ? (
            <Moon className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <p className="text-[12px] text-muted-foreground">{label}</p>
        </div>
      )}
      {/* Desktop/tablet: flex row. Mobile: horizontal scroll */}
      <div
        className="overflow-x-auto pt-2 pb-2 -mx-1 px-1 snap-x snap-mandatory"
      >
        <div className="space-y-1.5 min-w-max">
          <div
            className="flex gap-1.5"
            role="list"
            aria-label={`${label ?? 'Palette'} token swatches`}
          >
            {visibleTokens.map((token) => (
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
          <ContrastRow tokens={visibleTokens} isDarkMode={isDarkMode} />
        </div>
      </div>
    </div>
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
  viewMode: controlledViewMode,
  onViewModeChange,
  fillHeight = true,
  controlsNode,
}: PaletteWorkspaceProps) {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('light');

  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;
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
  const visiblePaletteTokens = getVisiblePaletteTokens(palette);
  const visibleDarkPaletteTokens = darkPalette ? getVisiblePaletteTokens(darkPalette) : [];
  const visibleActivePaletteTokens = getVisiblePaletteTokens(activePalette);
  const previewLimited = palette.targetColorSpace === 'p3' && !supportsP3;

  return (
    <div className={`flex flex-col ${fillHeight ? 'h-full overflow-auto' : ''}`}>
      <div className={`p-3 sm:p-5 space-y-6 ${fillHeight ? 'flex-1' : ''}`}>
        {previewLimited && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            Preview limited: this display shows the sRGB fallback for P3-target colors.
          </div>
        )}

        {/* Palette swatches */}
        {viewMode === 'both' ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] text-muted-foreground">Light and dark palettes</p>
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
            <PaletteRow palette={palette} label="Light-mode optimized palette" />
            {darkPalette && <PaletteRow palette={darkPalette} label="Dark-mode optimized palette" />}
          </div>
        ) : viewMode === 'dark' ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[12px] text-muted-foreground">Dark-mode optimized palette</p>
              </div>
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
            {darkPalette && (
              <div className="overflow-x-auto pt-2 pb-2 -mx-1 px-1 snap-x snap-mandatory">
                <div className="space-y-1.5 min-w-max">
                  <div className="flex gap-1.5" role="list" aria-label="Dark palette token swatches">
                    {visibleDarkPaletteTokens.map((token) => (
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
                  <ContrastRow tokens={visibleDarkPaletteTokens} isDarkMode />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[12px] text-muted-foreground">Light-mode optimized palette</p>
              </div>
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
            <div className="overflow-x-auto pt-2 pb-2 -mx-1 px-1 snap-x snap-mandatory">
              <div className="space-y-1.5 min-w-max">
                <div className="flex gap-1.5" role="list" aria-label="Color token swatches">
                  {visiblePaletteTokens.map((token) => (
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
                <ContrastRow tokens={visiblePaletteTokens} isDarkMode={false} />
              </div>
            </div>
          </div>
        )}

        {/* Token Table */}
        <Tabs defaultValue={controlsNode ? "controls" : "preview"} className="w-full" onValueChange={(v) => {
          if (v === 'values') track('token_values_tab_viewed');
          if (v === 'preview') track('ui_preview_viewed');
          if (v === 'controls') track('mobile_controls_tab_viewed');
        }}>
          <TabsList className="h-8">
            {controlsNode && (
              <TabsTrigger value="controls" className="text-[12px] h-6">
                Palette controls
              </TabsTrigger>
            )}
            <TabsTrigger value="preview" className="text-[12px] h-6">
              UI preview
            </TabsTrigger>
            <TabsTrigger value="values" className="text-[12px] h-6">
              Token values
            </TabsTrigger>
          </TabsList>

          {controlsNode && (
            <TabsContent value="controls" className="mt-0 overflow-y-auto">
              {controlsNode}
            </TabsContent>
          )}

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
                    {visibleActivePaletteTokens.map((token) => {
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
                              aria-hidden="true"
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

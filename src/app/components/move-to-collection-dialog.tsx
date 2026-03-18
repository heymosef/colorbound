/**
 * MoveToCollectionDialog — lets users move or copy a palette to another collection.
 *
 * Shows a list of all collections except the current one.
 * Each row is a button that triggers the move/copy action.
 */
import React from 'react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { FolderOpen } from 'lucide-react';
import { usePaletteContext } from '../lib/palette-context';
import { cn } from './ui/utils';
import { toast } from 'sonner';
import {
  buildCollectionSavedEditorPath,
  getEditorNavigationMode,
} from '../lib/editor-routes';

interface MoveToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceCollectionId: string;
  paletteId: string;
  paletteName: string;
  /** 'move' removes from source, 'copy' duplicates */
  mode: 'move' | 'copy';
}

export function MoveToCollectionDialog({
  open,
  onOpenChange,
  sourceCollectionId,
  paletteId,
  paletteName,
  mode,
}: MoveToCollectionDialogProps) {
  const navigate = useNavigate();
  const {
    collections,
    activeCollectionId,
    handleMovePalette,
    handleCopyPalette,
  } = usePaletteContext();

  const otherCollections = useMemo(
    () => collections.filter((c) => c.id !== sourceCollectionId),
    [collections, sourceCollectionId],
  );

  const handleSelect = (targetCollectionId: string) => {
    if (mode === 'move') {
      const result = handleMovePalette(sourceCollectionId, paletteId, targetCollectionId);
      if (!result.ok) {
        toast.error('Unable to move palette');
        return;
      }

      onOpenChange(false);
      navigate(buildCollectionSavedEditorPath(result.targetCollectionSlug, result.paletteId), {
        replace: getEditorNavigationMode('move') === 'replace',
      });
    } else {
      const result = handleCopyPalette(sourceCollectionId, paletteId, targetCollectionId);
      if (!result.ok) {
        toast.error('Unable to duplicate palette');
        return;
      }

      onOpenChange(false);
      navigate(buildCollectionSavedEditorPath(result.targetCollectionSlug, result.newPaletteId), {
        replace: getEditorNavigationMode('copy') === 'replace',
      });
    }
  };

  const title = mode === 'move'
    ? `Move "${paletteName}"`
    : `Duplicate "${paletteName}"`;

  const description = mode === 'move'
    ? 'Choose a collection to move this palette to. It will be removed from the current collection.'
    : 'Choose a collection to copy this palette to. The original stays in the current collection.';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[15px]">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1 max-h-[240px] overflow-y-auto py-1">
          {otherCollections.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">
              No other collections available. Create another collection first.
            </p>
          ) : (
            otherCollections.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => handleSelect(col.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors cursor-pointer outline-none',
                  'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                )}
              >
                <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{col.name}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {col.palettes.length} palette{col.palettes.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

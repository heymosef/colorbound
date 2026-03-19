/**
 * MoveToCollectionDialog — lets users move or copy a palette to another collection.
 *
 * Shows a list of all collections except the current one.
 * Each row is a button that triggers the move/copy action.
 */
import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { FolderOpen, Plus } from 'lucide-react';
import { usePaletteContext } from '../lib/palette-context';
import { cn } from './ui/utils';
import { toast } from 'sonner';
import { Button } from './ui/button';
import {
  buildCollectionSavedEditorPath,
  getEditorNavigationMode,
} from '../lib/editor-routes';
import type { CreateCollectionOptions } from '../lib/palette-context-types';

interface MoveToCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceCollectionId: string;
  paletteId: string;
  paletteName: string;
  /** 'move' removes from source, 'copy' duplicates */
  mode: 'move' | 'copy';
  onCreateCollection: (name?: string, options?: CreateCollectionOptions) => { id: string; slug: string };
}

export function MoveToCollectionDialog({
  open,
  onOpenChange,
  sourceCollectionId,
  paletteId,
  paletteName,
  mode,
  onCreateCollection,
}: MoveToCollectionDialogProps) {
  const navigate = useNavigate();
  const {
    collections,
    handleMovePalette,
    handleCopyPalette,
  } = usePaletteContext();
  const [createdCollectionId, setCreatedCollectionId] = useState<string | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const destinationRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const eligibleDestinations = useMemo(
    () => collections.filter((c) => c.id !== sourceCollectionId),
    [collections, sourceCollectionId],
  );

  useEffect(() => {
    if (!open) {
      setCreatedCollectionId(null);
      setIsCreatingCollection(false);
    }
  }, [open]);

  useEffect(() => {
    if (!createdCollectionId) return;
    if (!eligibleDestinations.some((collection) => collection.id === createdCollectionId)) return;

    destinationRefs.current[createdCollectionId]?.focus();
  }, [createdCollectionId, eligibleDestinations]);

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

  const handleCreateDestination = () => {
    setIsCreatingCollection(true);
    try {
      const { id } = onCreateCollection(undefined, { activate: false });
      setCreatedCollectionId(id);
    } finally {
      setIsCreatingCollection(false);
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
          {eligibleDestinations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-[13px] font-medium">No destination collections yet</p>
                <p className="text-[12px] text-muted-foreground">
                  Create a collection to continue this {mode === 'move' ? 'move' : 'duplicate'} flow.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleCreateDestination}
                disabled={isCreatingCollection}
              >
                <Plus className="w-3.5 h-3.5" />
                {isCreatingCollection ? 'Creating…' : 'Create collection'}
              </Button>
            </div>
          ) : (
            eligibleDestinations.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => handleSelect(col.id)}
                ref={(node) => {
                  destinationRefs.current[col.id] = node;
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors cursor-pointer outline-none',
                  'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                  createdCollectionId === col.id && 'bg-accent/50 text-accent-foreground ring-1 ring-ring/20',
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

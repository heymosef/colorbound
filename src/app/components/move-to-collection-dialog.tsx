import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { usePaletteContext } from '../lib/palette-context';
import {
  buildCollectionSavedEditorPath,
  getEditorNavigationMode,
} from '../lib/editor-routes';
import type { CreateCollectionOptions } from '../lib/palette-context-types';
import { CollectionTargetDialog } from './collection-target-dialog';

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

  const eligibleDestinations = useMemo(
    () => collections.filter((c) => c.id !== sourceCollectionId),
    [collections, sourceCollectionId],
  );

  const handleSelect = (targetCollectionId: string) => {
    if (mode === 'move') {
      const result = handleMovePalette(sourceCollectionId, paletteId, targetCollectionId);
      if (!result.ok) {
        return { ok: false, message: result.message ?? 'Unable to move palette' };
      }

      navigate(buildCollectionSavedEditorPath(result.targetCollectionSlug, result.paletteId), {
        replace: getEditorNavigationMode('move') === 'replace',
      });
      return { ok: true };
    } else {
      const result = handleCopyPalette(sourceCollectionId, paletteId, targetCollectionId);
      if (!result.ok) {
        return { ok: false, message: result.message ?? 'Unable to duplicate palette' };
      }

      navigate(buildCollectionSavedEditorPath(result.targetCollectionSlug, result.newPaletteId), {
        replace: getEditorNavigationMode('copy') === 'replace',
      });
      return { ok: true };
    }
  };

  const title = mode === 'move'
    ? `Move "${paletteName}"`
    : `Duplicate "${paletteName}"`;

  const description = mode === 'move'
    ? 'Choose a project to move this palette to. It will be removed from the current project.'
    : 'Choose a project to copy this palette to. The original stays in the current project.';

  return (
    <CollectionTargetDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      collections={eligibleDestinations.map((collection) => ({
        id: collection.id,
        name: collection.name,
        paletteCount: collection.palettes.length,
      }))}
      emptyTitle="No destination projects yet"
      emptyDescription={`Create a project to continue this ${mode === 'move' ? 'move' : 'duplicate'} flow.`}
      onSelect={handleSelect}
      onCreateCollection={onCreateCollection}
    />
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import type { CreateCollectionOptions } from '../lib/palette-context-types';
import { CollectionIcon } from './collection-icon';

export interface CollectionTargetOption {
  id: string;
  name: string;
  paletteCount: number;
}

interface CollectionTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  collections: CollectionTargetOption[];
  emptyTitle: string;
  emptyDescription: string;
  createLabel?: string;
  errorMessage?: string | null;
  onSelect: (collectionId: string) => { ok: boolean; message?: string };
  onCreateCollection: (name?: string, options?: CreateCollectionOptions) => { id: string; slug: string };
}

export function CollectionTargetDialog({
  open,
  onOpenChange,
  title,
  description,
  collections,
  emptyTitle,
  emptyDescription,
  createLabel = 'Create project',
  errorMessage,
  onSelect,
  onCreateCollection,
}: CollectionTargetDialogProps) {
  const [createdCollectionId, setCreatedCollectionId] = useState<string | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const destinationRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const hasDestinations = collections.length > 0;
  const destinationList = useMemo(() => collections, [collections]);

  useEffect(() => {
    if (!open) {
      setCreatedCollectionId(null);
      setIsCreatingCollection(false);
      setDialogError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!createdCollectionId) return;
    if (!destinationList.some((collection) => collection.id === createdCollectionId)) return;

    destinationRefs.current[createdCollectionId]?.focus();
  }, [createdCollectionId, destinationList]);

  useEffect(() => {
    setDialogError(errorMessage ?? null);
  }, [errorMessage]);

  const handleSelect = (collectionId: string) => {
    const result = onSelect(collectionId);
    if (!result.ok) {
      setDialogError(result.message ?? 'Unable to continue');
      return;
    }

    onOpenChange(false);
  };

  const handleCreateDestination = () => {
    setDialogError(null);
    setIsCreatingCollection(true);
    try {
      const { id } = onCreateCollection(undefined, { activate: false });
      setCreatedCollectionId(id);
    } finally {
      setIsCreatingCollection(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[15px]">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {dialogError && (
          <p className="text-[12px] text-destructive">
            {dialogError}
          </p>
        )}

        <div className="space-y-1 max-h-[240px] overflow-y-auto py-1">
          {!hasDestinations ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                <CollectionIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-[13px] font-medium">{emptyTitle}</p>
                <p className="text-[12px] text-muted-foreground">
                  {emptyDescription}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleCreateDestination}
                disabled={isCreatingCollection}
              >
                <Plus className="w-3.5 h-3.5" />
                {isCreatingCollection ? 'Creating…' : createLabel}
              </Button>
            </div>
          ) : (
            destinationList.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => handleSelect(collection.id)}
                ref={(node) => {
                  destinationRefs.current[collection.id] = node;
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors cursor-pointer outline-none',
                  'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                  createdCollectionId === collection.id && 'bg-accent/50 text-accent-foreground ring-1 ring-ring/20',
                )}
              >
                <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <CollectionIcon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{collection.name}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {collection.paletteCount} palette{collection.paletteCount !== 1 ? 's' : ''}
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

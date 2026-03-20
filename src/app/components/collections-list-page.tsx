/**
 * CollectionsListPage — top-level page listing all collections.
 *
 * Each collection card shows: name, color swatches from its palettes,
 * palette count, and last-edited date.
 * Supports sorting by last modified (default), name, or date created.
 */
import React from 'react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import {
  Plus,
  FolderOpen,
  MoreVertical,
  Pencil,
  Trash2,
  Check,
  ArrowUpDown,
  Layers,
} from 'lucide-react';
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
import { useCollectionsContext, type CollectionSortBy } from '../lib/palette-context';
import type { Collection } from '../lib/collection-types';
import { formatRelativeTime } from '../lib/format-relative-time';
import { useDocumentTitle } from '../lib/use-document-title';
import { getCollectionPreviewColors } from '../lib/palette-preview';
import { PopoverMenuItem } from './popover-menu-item';
import { validateCollectionName } from '../lib/collection-name-validation';
import { buildCollectionPath } from '../lib/editor-routes';

// ─── Color swatches from a collection's palettes ───

function CollectionSwatches({ collection }: { collection: Collection }) {
  const swatches = useMemo(
    () => getCollectionPreviewColors(collection, { step: 500, limit: 10 }),
    [collection],
  );

  if (swatches.length === 0) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-muted-foreground italic">No palettes</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {swatches.map((color, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-[3px] shrink-0"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

// ─── Collection options menu ───

function CollectionOptionsMenu({
  collection,
  onRename,
  onDelete,
  canDelete,
}: {
  collection: Collection;
  onRename: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const conflictedPalettes = collection.conflictedPalettes ?? [];
  const totalPaletteCount = collection.palettes.length + conflictedPalettes.length;

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger
          className="inline-flex items-center justify-center rounded-md h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          aria-label={`Options for ${collection.name}`}
        >
          <MoreVertical className="w-4 h-4" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1">
          <PopoverMenuItem onClick={() => { setMenuOpen(false); onRename(); }}>
            <Pencil className="w-3.5 h-3.5" />
            Rename
          </PopoverMenuItem>
          <Separator className="my-1" />
          <PopoverMenuItem
            onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}
            variant="destructive"
            disabled={!canDelete}
            className={canDelete ? '' : 'opacity-40'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </PopoverMenuItem>
        </PopoverContent>
      </Popover>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{collection.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently destroy this collection and{' '}
              <strong>all {totalPaletteCount} palette{totalPaletteCount !== 1 ? 's' : ''}</strong>{' '}
              inside it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete collection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Sort selector ───

function SortSelector({
  value,
  onChange,
}: {
  value: CollectionSortBy;
  onChange: (v: CollectionSortBy) => void;
}) {
  const [open, setOpen] = useState(false);
  const labels: Record<CollectionSortBy, string> = {
    lastModified: 'Last modified',
    name: 'Name',
    created: 'Date created',
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex items-center gap-1.5 rounded-md h-9 px-3 text-[13px] border border-border hover:bg-accent transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]">
        <ArrowUpDown className="w-3.5 h-3.5" />
        {labels[value]}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1">
        {(Object.keys(labels) as CollectionSortBy[]).map((key) => (
          <PopoverMenuItem
            key={key}
            onClick={() => { onChange(key); setOpen(false); }}
          >
            {value === key && <Check className="w-3.5 h-3.5" />}
            <span className={value !== key ? 'ml-5.5' : ''}>{labels[key]}</span>
          </PopoverMenuItem>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Collection card ───

function CollectionCard({
  collection,
  collections,
  onOpen,
  onRename,
  onDelete,
  canDelete,
}: {
  collection: Collection;
  collections: Collection[];
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(collection.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const conflictedPalettes = collection.conflictedPalettes ?? [];

  const handleSave = () => {
    const validation = validateCollectionName(editName, collections, { excludeCollectionId: collection.id });
    if (!validation.valid) {
      setNameError(validation.message ?? 'Collection name is required');
      return;
    }

    onRename(validation.normalizedName);
    setNameError(null);
    setEditing(false);
  };

  const relativeDate = useMemo(() => {
    try {
      return formatRelativeTime(new Date(collection.lastModifiedAt));
    } catch {
      return '';
    }
  }, [collection.lastModifiedAt]);

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-ring/20 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] gap-0 overflow-hidden"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-menu-trigger]') || editing) return;
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if ((e.target as HTMLElement).closest('[data-menu-trigger]') || editing) return;
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open ${collection.name} collection`}
    >
      <CardContent className="p-4" style={{ padding: '1rem' }}>
        <div className="space-y-3">
          {/* Header: name + menu */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
              </div>
              {editing ? (
                <div className="flex gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setNameError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                      if (e.key === 'Escape') {
                        setNameError(null);
                        setEditing(false);
                      }
                    }}
                    className="h-7 text-[13px] px-2"
                    autoFocus
                    aria-label="Edit collection name"
                    aria-invalid={!!nameError}
                  />
                  <Button size="sm" variant="ghost" onClick={handleSave} className="h-7 px-2">
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-[15px] font-medium truncate">{collection.name}</span>
                  {conflictedPalettes.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                      {conflictedPalettes.length} conflict{conflictedPalettes.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div
              className="flex items-center gap-0.5 shrink-0"
              data-menu-trigger
              onClick={(e) => e.stopPropagation()}
            >
              <CollectionOptionsMenu
                collection={collection}
                onRename={() => { setEditName(collection.name); setEditing(true); }}
                onDelete={onDelete}
                canDelete={canDelete}
              />
            </div>
          </div>
          {editing && nameError && (
            <p className="text-[12px] text-destructive">{nameError}</p>
          )}

          {/* Color swatches */}
          <CollectionSwatches collection={collection} />

          {/* Metadata */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="tabular-nums">
              {collection.palettes.length} palette{collection.palettes.length !== 1 ? 's' : ''}
            </span>
            {conflictedPalettes.length > 0 && (
              <>
                <span>·</span>
                <span className="tabular-nums text-amber-700">
                  {conflictedPalettes.length} conflict{conflictedPalettes.length !== 1 ? 's' : ''}
                </span>
              </>
            )}
            {relativeDate && (
              <>
                <span>·</span>
                <span>{relativeDate}</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ───

export function CollectionsListPage() {
  useDocumentTitle('Collections');
  const navigate = useNavigate();
  const {
    collections,
    collectionSortBy,
    setCollectionSortBy,
    handleCreateCollection,
    handleRenameCollection,
    handleDeleteCollection,
    handleSelectCollection,
  } = useCollectionsContext();

  const sortedCollections = useMemo(() => {
    const sorted = [...collections];
    switch (collectionSortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'created':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'lastModified':
      default:
        sorted.sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime());
        break;
    }
    return sorted;
  }, [collections, collectionSortBy]);

  const handleNew = () => {
    const { slug } = handleCreateCollection();
    navigate(`/${slug}`);
  };

  const handleOpenCollection = (collection: Collection) => {
    handleSelectCollection(collection.id);
    navigate(buildCollectionPath(collection.slug));
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[18px]">Collections</h2>
              <p className="text-[13px] text-muted-foreground">
                <span className="tabular-nums">{collections.length}</span>
                {` collection${collections.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SortSelector value={collectionSortBy} onChange={setCollectionSortBy} />
            <Button onClick={handleNew}>
              <Plus />
              New collection
            </Button>
          </div>
        </div>

        {/* Collections grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedCollections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              collections={collections}
              onOpen={() => handleOpenCollection(col)}
              onRename={(name) => handleRenameCollection(col.id, name)}
              onDelete={() => handleDeleteCollection(col.id)}
              canDelete={collections.length > 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

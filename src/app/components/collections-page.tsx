import React from 'react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
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
  MoreVertical,
  Trash2,
  Pencil,
  Check,
  Palette as PaletteIcon,
  ArrowLeft,
} from 'lucide-react';
import { usePaletteContext } from '../lib/palette-context';
import type { Palette } from '../lib/color-utils';
import { CollectionIcon } from './collection-icon';
import { ShareCollectionButton, SharePaletteButton } from './share/share-actions';
import { PopoverMenuItem } from './popover-menu-item';
import { useDocumentTitle } from '../lib/use-document-title';
import { PaletteColorRamp } from './palette-color-ramp';
import { DUPLICATE_PALETTE_NAME_MESSAGE } from '../lib/palette-name-validation';
import { validateCollectionName } from '../lib/collection-name-validation';
import { serializePaletteConfig } from '../lib/share-serialization';
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

// ─── Popover-based options menu (replaces DropdownMenu) ───

function PaletteOptionsMenu({
  palette,
  onRename,
  onRemove,
  triggerClassName,
}: {
  palette: Palette;
  onRename: () => void;
  onRemove: () => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  const handleAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`inline-flex items-center justify-center rounded-md h-7 w-7 p-0 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${triggerClassName ?? ''}`}
        aria-label={`Options for ${palette.name}`}
      >
        <MoreVertical className="w-4 h-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <PopoverMenuItem onClick={() => handleAction(onRename)}>
          <Pencil className="w-3.5 h-3.5" />
          Rename
        </PopoverMenuItem>
        <Separator className="my-1" />
        <PopoverMenuItem
          onClick={() => handleAction(onRemove)}
          variant="destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </PopoverMenuItem>
      </PopoverContent>
    </Popover>
  );
}

function PaletteCard({
  palette,
  onSelect,
  onRemove,
  onRename,
}: {
  palette: Palette;
  onSelect: () => void;
  onRemove: () => void;
  onRename: (name: string) => { ok: boolean; message?: string };
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(palette.name);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSave = () => {
    if (!editName.trim()) {
      setNameError('Palette name is required');
      return;
    }

    const result = onRename(editName.trim());
    if (!result.ok) {
      setNameError(result.message ?? DUPLICATE_PALETTE_NAME_MESSAGE);
      return;
    }
    setNameError(null);
    setEditing(false);
  };

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-ring/20 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] gap-0 overflow-hidden"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-dropdown-trigger]') || editing) return;
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if ((e.target as HTMLElement).closest('[data-dropdown-trigger]') || editing) return;
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open ${palette.name} palette for editing`}
    >
      <CardContent className="p-0 last:pb-0" style={{ padding: 0 }}>
        {/* Mobile: stacked layout */}
        <div className="md:hidden">
          {/* Color ramp on top */}
          <div className="h-14 overflow-hidden">
            <PaletteColorRamp palette={palette} useBestAvailableColor />
          </div>
          {/* Metadata below */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
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
                        if (e.key === 'Escape') setEditing(false);
                      }}
                      className="h-7 text-[13px] px-2"
                      autoFocus
                      aria-label="Edit palette name"
                      aria-invalid={!!nameError}
                    />
                    <Button size="sm" variant="ghost" onClick={handleSave} className="h-7 px-2">
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-[14px] truncate">{palette.name}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-0.5" data-dropdown-trigger onClick={(e) => e.stopPropagation()}>
                <SharePaletteButton
                  palette={palette}
                  compact
                  className="h-7 w-7 p-0 justify-center hover:bg-accent"
                />
                <PaletteOptionsMenu
                  palette={palette}
                  onRename={() => { setEditName(palette.name); setEditing(true); }}
                  onRemove={onRemove}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono">{palette.hue}°</span>
              <span>·</span>
              <span className="tabular-nums">Density {palette.density ?? 11}</span>
            </div>
            {editing && nameError && (
              <p className="text-[12px] text-destructive">{nameError}</p>
            )}
          </div>
        </div>

        {/* Tablet/Desktop: horizontal row layout */}
        <div className="hidden md:flex items-stretch">
          {/* Left: metadata */}
          <div className="shrink-0 w-52 lg:w-56 p-4 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
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
                        if (e.key === 'Escape') setEditing(false);
                      }}
                      className="h-7 text-[13px] px-2"
                      autoFocus
                      aria-label="Edit palette name"
                      aria-invalid={!!nameError}
                    />
                    <Button size="sm" variant="ghost" onClick={handleSave} className="h-7 px-2">
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-[14px] truncate">{palette.name}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-0.5" data-dropdown-trigger onClick={(e) => e.stopPropagation()}>
                <SharePaletteButton
                  palette={palette}
                  compact
                  className="h-7 w-7 p-0 justify-center hover:bg-accent opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                />
                <PaletteOptionsMenu
                  palette={palette}
                  onRename={() => { setEditName(palette.name); setEditing(true); }}
                  onRemove={onRemove}
                  triggerClassName="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono">{palette.hue}°</span>
              <span>·</span>
              <span className="tabular-nums">Density {palette.density ?? 11}</span>
            </div>
            {editing && nameError && (
              <p className="text-[12px] text-destructive">{nameError}</p>
            )}
          </div>

          {/* Right: color ramp */}
          <div className="flex-1 min-h-[5rem] overflow-hidden">
            <PaletteColorRamp palette={palette} useBestAvailableColor />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConflictedPaletteCard({
  palette,
  collectionId,
  onResolve,
  onDelete,
}: {
  palette: Palette;
  collectionId: string;
  onResolve: (collectionId: string, paletteId: string, name: string) => { ok: boolean; message?: string };
  onDelete: (collectionId: string, paletteId: string) => boolean;
}) {
  const [name, setName] = useState(palette.name);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = () => {
    const result = onResolve(collectionId, palette.id, name);
    if (!result.ok) {
      setError(result.message ?? DUPLICATE_PALETTE_NAME_MESSAGE);
      return;
    }
    setError(null);
  };

  return (
    <Card className="border-dashed border-amber-300/70 bg-amber-50/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[14px] font-medium">{palette.name}</p>
            <p className="text-[12px] text-muted-foreground">
              This palette is quarantined until its name is unique.
            </p>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {palette.hue}°
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`conflict-name-${palette.id}`} className="text-[13px]">New palette name</Label>
          <Input
            id={`conflict-name-${palette.id}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="Enter a unique palette name"
            aria-invalid={!!error}
          />
          {error && (
            <p className="text-[12px] text-destructive">{error}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleResolve} disabled={!name.trim()}>
            Rename and restore
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(collectionId, palette.id)}
          >
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CollectionsPage() {
  const navigate = useNavigate();
  const {
    collection,
    activeCollection,
    collections,
    startDraftPalette,
    handleRemove,
    handleRename,
    handleResolveConflictedPalette,
    handleDeleteConflictedPalette,
    handleRenameCollection,
    handleDeleteCollection,
  } = usePaletteContext();

  useDocumentTitle(activeCollection?.name ?? 'Collection');

  const collectionSlug = activeCollection?.slug ?? '';

  const [editingCollectionName, setEditingCollectionName] = useState(false);
  const [editCollectionName, setEditCollectionName] = useState('');
  const [collectionNameError, setCollectionNameError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);

  const canDeleteCollection = collections.length > 1;
  const conflictedPalettes = activeCollection?.conflictedPalettes ?? [];
  const totalPaletteCount = collection.length + conflictedPalettes.length;

  const handleSaveCollectionName = () => {
    if (activeCollection) {
      const validation = validateCollectionName(editCollectionName, collections, { excludeCollectionId: activeCollection.id });
      if (!validation.valid) {
        setCollectionNameError(validation.message ?? 'Collection name is required');
        return;
      }

      const result = handleRenameCollection(activeCollection.id, validation.normalizedName);
      if (!result.ok) {
        setCollectionNameError(result.message);
        return;
      }

      setCollectionNameError(null);
      navigate(buildCollectionPath(result.slug), { replace: true });
    }
    setEditingCollectionName(false);
  };

  const handleDeleteCurrentCollection = () => {
    if (activeCollection && handleDeleteCollection(activeCollection.id)) {
      navigate('/');
    }
  };

  const handleNew = () => {
    if (!activeCollection) return;
    startDraftPalette(activeCollection.id);
    navigate(buildCollectionDraftEditorPath(activeCollection.slug), {
      state: { createDraft: true },
    });
  };

  const handleOpenPalette = (id: string) => {
    if (!activeCollection) return;
    navigate(buildCollectionSavedEditorPath(activeCollection.slug, id));
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All collections
        </Link>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <CollectionIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              {editingCollectionName ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editCollectionName}
                    onChange={(e) => {
                      setEditCollectionName(e.target.value);
                      setCollectionNameError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCollectionName();
                      if (e.key === 'Escape') {
                        setCollectionNameError(null);
                        setEditingCollectionName(false);
                      }
                    }}
                    className="h-8 text-[16px] px-2 font-semibold"
                    autoFocus
                    aria-label="Edit collection name"
                    aria-invalid={!!collectionNameError}
                  />
                  <Button size="sm" variant="ghost" onClick={handleSaveCollectionName} className="h-8 px-2">
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-[18px]">{activeCollection?.name ?? 'My Collection'}</h2>
                  <p className="text-[13px] text-muted-foreground">
                    {collection.length === 0
                      ? 'No palettes yet — create your first one'
                      : <><span className="tabular-nums">{collection.length}</span>{` palette${collection.length !== 1 ? 's' : ''}`}</>}
                  </p>
                </>
              )}
              {editingCollectionName && collectionNameError && (
                <p className="mt-1 text-[12px] text-destructive">{collectionNameError}</p>
              )}
            </div>
            {!editingCollectionName && (
              <Popover open={collectionMenuOpen} onOpenChange={setCollectionMenuOpen}>
                <PopoverTrigger
                  className="inline-flex items-center justify-center rounded-md h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] shrink-0"
                  aria-label={`Options for ${activeCollection?.name ?? 'collection'}`}
                >
                  <MoreVertical className="w-4 h-4" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-44 p-1">
                  <PopoverMenuItem onClick={() => {
                    setCollectionMenuOpen(false);
                    setEditCollectionName(activeCollection?.name ?? '');
                    setCollectionNameError(null);
                    setEditingCollectionName(true);
                  }}>
                    <Pencil className="w-3.5 h-3.5" />
                    Rename
                  </PopoverMenuItem>
                  <Separator className="my-1" />
                  <PopoverMenuItem
                    onClick={() => {
                      setCollectionMenuOpen(false);
                      setDeleteDialogOpen(true);
                    }}
                    variant="destructive"
                    className={canDeleteCollection ? '' : 'opacity-40 pointer-events-none'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete collection
                  </PopoverMenuItem>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {collection.length > 0 && (
              <ShareCollectionButton
                palettes={collection.map((palette) => serializePaletteConfig(palette))}
                name={activeCollection?.name ?? 'My Collection'}
              />
            )}
            <Button onClick={handleNew}>
              <Plus />
              New palette
            </Button>
          </div>
        </div>

        {/* Palette grid */}
        {activeCollection && conflictedPalettes.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-[15px] font-medium">Conflicted palettes</h3>
              <p className="text-[13px] text-muted-foreground">
                {conflictedPalettes.length} palette{conflictedPalettes.length !== 1 ? 's' : ''} need unique names before they can be used.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {conflictedPalettes.map((palette) => (
                <ConflictedPaletteCard
                  key={palette.id}
                  palette={palette}
                  collectionId={activeCollection.id}
                  onResolve={handleResolveConflictedPalette}
                  onDelete={handleDeleteConflictedPalette}
                />
              ))}
            </div>
          </div>
        )}

        {collection.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <PaletteIcon className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-[15px] text-foreground mb-1">No palettes in your collection</p>
              <p className="text-[13px] text-muted-foreground mb-6 max-w-sm">
                Create your first palette to start building perceptually balanced color tokens for
                your design system.
              </p>
              <Button onClick={handleNew} className="h-9 text-[13px]">
                <Plus className="w-4 h-4 mr-1.5" />
                Create first palette
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {collection.map((palette) => (
              <PaletteCard
                key={palette.id}
                palette={palette}
                onSelect={() => handleOpenPalette(palette.id)}
                onRemove={() => handleRemove(palette.id)}
                onRename={(name) => handleRename(palette.id, name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete collection confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{activeCollection?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently destroy this collection and{' '}
              <strong>all {totalPaletteCount} palette{totalPaletteCount !== 1 ? 's' : ''}</strong>{' '}
              inside it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCurrentCollection}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete collection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2, Share2 } from 'lucide-react';
import type { SharedPaletteEntry } from '../../lib/share-api';

const LazyPaletteShareRuntime = lazy(async () => {
  const module = await import('./share-runtime');
  return { default: module.PaletteShareRuntime };
});

const LazyCollectionShareRuntime = lazy(async () => {
  const module = await import('./share-runtime');
  return { default: module.CollectionShareRuntime };
});

function ShareRuntimeFallback() {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 py-3 justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Preparing share tools...</span>
      </div>
    </div>
  );
}

interface PaletteShareActionProps {
  palette: SharedPaletteEntry;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
  compact?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function PaletteShareAction({
  palette,
  disabled,
  disabledReason,
  className = '',
  compact,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger,
}: PaletteShareActionProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [hasRequestedRuntime, setHasRequestedRuntime] = useState(() => Boolean(controlledOpen));
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      setHasRequestedRuntime(true);
    }
    setOpen(nextOpen);
  }, [setOpen]);

  useEffect(() => {
    if (controlledOpen) {
      setHasRequestedRuntime(true);
    }
  }, [controlledOpen]);

  if (hideTrigger) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[400px] p-0" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Share palette</DialogTitle>
          {hasRequestedRuntime && open ? (
            <Suspense fallback={<ShareRuntimeFallback />}>
              <LazyPaletteShareRuntime palette={palette} />
            </Suspense>
          ) : null}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={`inline-flex items-center gap-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${className}`}
        disabled={disabled}
        aria-label={disabled ? disabledReason : 'Share palette'}
        title={disabled ? disabledReason : undefined}
      >
        <Share2 className="w-3.5 h-3.5" />
        {!compact && <span>Share</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {hasRequestedRuntime && open ? (
          <Suspense fallback={<ShareRuntimeFallback />}>
            <LazyPaletteShareRuntime palette={palette} />
          </Suspense>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

interface CollectionShareActionProps {
  palettes: SharedPaletteEntry[];
  name?: string;
  className?: string;
}

export function CollectionShareAction({
  palettes,
  name,
  className = '',
}: CollectionShareActionProps) {
  const [open, setOpen] = useState(false);
  const [hasRequestedRuntime, setHasRequestedRuntime] = useState(false);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      setHasRequestedRuntime(true);
    }
    setOpen(nextOpen);
  }, []);

  if (palettes.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={className}
          aria-label="Share collection"
        >
          <Share2 />
          Share collection
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {hasRequestedRuntime && open ? (
          <Suspense fallback={<ShareRuntimeFallback />}>
            <LazyCollectionShareRuntime palettes={palettes} name={name} />
          </Suspense>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export {
  CollectionShareAction as ShareCollectionButton,
  PaletteShareAction as SharePaletteButton,
};

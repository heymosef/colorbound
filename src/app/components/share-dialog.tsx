import { useState, useCallback, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import {
  Share2,
  Link2,
  Check,
  Copy,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createSharedPalette,
  createSharedCollection,
  buildShareUrl,
  type SharedPaletteEntry,
} from '../lib/share-api';
import { copyToClipboard } from '../lib/clipboard';
import {
  serializePaletteConfig,
} from '../lib/share-serialization';

// ─── Share Palette Button ───

interface SharePaletteButtonProps {
  palette: SharedPaletteEntry;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
  compact?: boolean;
  /** External open state — used by overflow menu */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** If true, don't render a trigger button (external trigger handles it) */
  hideTrigger?: boolean;
}

export function SharePaletteButton({
  palette,
  disabled,
  disabledReason,
  className = '',
  compact,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger,
}: SharePaletteButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Serialize through the trust boundary before sending
      const sanitized = serializePaletteConfig(palette, palette.group);
      const result = await createSharedPalette(sanitized);
      const url = buildShareUrl('palette', result.id);
      setShareUrl(url);
    } catch (err) {
      console.error('Failed to create share link:', err);
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  }, [palette]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    await copyToClipboard(shareUrl);
    setCopied(true);
    toast.success('Share link copied to clipboard', { duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && !shareUrl && !loading) {
      handleShare();
    }
    if (!nextOpen) {
      // Reset state when closing
      setTimeout(() => {
        setShareUrl(null);
        setError(null);
        setCopied(false);
      }, 200);
    }
  }, [shareUrl, loading, handleShare, setOpen]);

  // When controlled open transitions to true, trigger share generation
  useEffect(() => {
    if (isControlled && controlledOpen && !shareUrl && !loading && !error) {
      handleShare();
    }
  }, [isControlled, controlledOpen, shareUrl, loading, error, handleShare]);

  // Shared inner content for both Popover and Dialog modes
  const shareContent = (
    <div className="p-4 space-y-3">
      <div className="space-y-1">
        <h4 className="text-[13px] font-medium">Share palette</h4>
        <p className="text-[11px] text-muted-foreground">
          Anyone with this link can view and import this palette.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-3 justify-center text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[12px]">Generating link...</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 py-2 text-destructive dark:text-destructive-foreground">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[12px]">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-6 text-[11px]"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {shareUrl && (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            <Input
              value={shareUrl}
              readOnly
              className="h-8 text-[13px] font-mono flex-1"
              onFocus={(e) => e.target.select()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-2 shrink-0"
              aria-label="Copy link"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
          <Separator />
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>This link expires in 30 days</span>
          </div>
        </div>
      )}
    </div>
  );

  // When hideTrigger is true, render as a Dialog (no anchor needed)
  if (hideTrigger) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[400px] p-0" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Share palette</DialogTitle>
          {shareContent}
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
        {shareContent}
      </PopoverContent>
    </Popover>
  );
}

// ─── Share Collection Button ───

interface ShareCollectionButtonProps {
  palettes: SharedPaletteEntry[];
  name?: string;
  className?: string;
}

export function ShareCollectionButton({
  palettes,
  name,
  className = '',
}: ShareCollectionButtonProps) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Serialize each palette through the trust boundary before sending
      const sanitizedPalettes = palettes.map((p) => serializePaletteConfig(p, p.group));
      const result = await createSharedCollection(sanitizedPalettes, name);
      const url = buildShareUrl('collection', result.id);
      setShareUrl(url);
    } catch (err) {
      console.error('Failed to create share link:', err);
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  }, [palettes, name]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    await copyToClipboard(shareUrl);
    setCopied(true);
    toast.success('Share link copied to clipboard', { duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && !shareUrl && !loading) {
      handleShare();
    }
    if (!nextOpen) {
      setTimeout(() => {
        setShareUrl(null);
        setError(null);
        setCopied(false);
      }, 200);
    }
  }, [shareUrl, loading, handleShare]);

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
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <h4 className="text-[13px] font-medium">Share collection</h4>
            <p className="text-[11px] text-muted-foreground">
              Share all {palettes.length} palette{palettes.length !== 1 ? 's' : ''} in your collection.
              Anyone with this link can view and import them.
            </p>
          </div>

          {loading && (
            <div className="flex items-center gap-2 py-3 justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[12px]">Generating link...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 py-2 text-destructive dark:text-destructive-foreground">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[12px]">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="h-6 text-[11px]"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {shareUrl && (
            <div className="space-y-3">
              <div className="flex gap-1.5">
                <Input
                  value={shareUrl}
                  readOnly
                  className="h-8 text-[13px] font-mono flex-1"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 px-2 shrink-0"
                  aria-label="Copy link"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
              <Separator />
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>This link expires in 30 days</span>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  buildShareUrl,
  createSharedCollection,
  createSharedPalette,
  type SharedPaletteEntry,
} from '../../lib/share-api';
import { copyToClipboard } from '../../lib/clipboard';
import { serializePaletteConfig } from '../../lib/share-serialization';
import { track } from '../../lib/analytics';

function ShareContent({
  title,
  description,
  loading,
  error,
  shareUrl,
  copied,
  onRetry,
  onCopy,
}: {
  title: string;
  description: string;
  loading: boolean;
  error: string | null;
  shareUrl: string | null;
  copied: boolean;
  onRetry: () => void;
  onCopy: () => Promise<void>;
}) {
  return (
    <div className="p-4 space-y-3">
      <div className="space-y-1">
        <h4 className="text-[13px] font-medium">{title}</h4>
        <p className="text-[11px] text-muted-foreground">{description}</p>
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
              onClick={onRetry}
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
              onClick={() => void onCopy()}
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
}

function useShareLink(generateLink: () => Promise<string>) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const resetTimeout = useRef<number | null>(null);

  const clearCopyTimeout = useCallback(() => {
    if (resetTimeout.current !== null) {
      window.clearTimeout(resetTimeout.current);
      resetTimeout.current = null;
    }
  }, []);

  const requestShareLink = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = await generateLink();
      setShareUrl(url);
    } catch (err) {
      console.error('Failed to create share link:', err);
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  }, [generateLink]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;

    await copyToClipboard(shareUrl);
    setCopied(true);
    toast.success('Share link copied to clipboard', { duration: 2000 });
    clearCopyTimeout();
    resetTimeout.current = window.setTimeout(() => {
      setCopied(false);
      resetTimeout.current = null;
    }, 2000);
  }, [clearCopyTimeout, shareUrl]);

  useEffect(() => {
    void requestShareLink();

    return () => {
      clearCopyTimeout();
    };
  }, [clearCopyTimeout, requestShareLink]);

  return {
    shareUrl,
    loading,
    error,
    copied,
    requestShareLink,
    handleCopy,
  };
}

export function PaletteShareRuntime({
  palette,
}: {
  palette: SharedPaletteEntry;
}) {
  const generatePaletteShareLink = useCallback(async () => {
    const sanitized = serializePaletteConfig(palette);
    const result = await createSharedPalette(sanitized);
    track('palette_shared');
    return buildShareUrl('palette', result.id);
  }, [palette]);

  const {
    shareUrl,
    loading,
    error,
    copied,
    requestShareLink,
    handleCopy,
  } = useShareLink(generatePaletteShareLink);

  return (
    <ShareContent
      title="Share palette"
      description="Anyone with this link can view and import this palette."
      loading={loading}
      error={error}
      shareUrl={shareUrl}
      copied={copied}
      onRetry={() => void requestShareLink()}
      onCopy={handleCopy}
    />
  );
}

export function CollectionShareRuntime({
  palettes,
  name,
}: {
  palettes: SharedPaletteEntry[];
  name?: string;
}) {
  const generateCollectionShareLink = useCallback(async () => {
    const sanitizedPalettes = palettes.map((palette) => serializePaletteConfig(palette));
    const result = await createSharedCollection(sanitizedPalettes, name);
    track('collection_shared', { palette_count: palettes.length });
    return buildShareUrl('collection', result.id);
  }, [name, palettes]);

  const {
    shareUrl,
    loading,
    error,
    copied,
    requestShareLink,
    handleCopy,
  } = useShareLink(generateCollectionShareLink);

  return (
    <ShareContent
      title="Share collection"
      description={`Share all ${palettes.length} palette${palettes.length !== 1 ? 's' : ''} in your collection. Anyone with this link can view and import them.`}
      loading={loading}
      error={error}
      shareUrl={shareUrl}
      copied={copied}
      onRetry={() => void requestShareLink()}
      onCopy={handleCopy}
    />
  );
}

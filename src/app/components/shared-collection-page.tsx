import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLoaderData, Link } from 'react-router';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import {
  Check,
  Download as DownloadIcon,
  Link2,
  ArrowLeft,
  Clock,
  Layers,
  Palette as PaletteIcon,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePaletteContext, type PaletteConfig } from '../lib/palette-context';
import {
  buildShareUrl,
  daysUntilExpiry,
  type SharedCollectionResponse,
} from '../lib/share-api';
import {
  type Palette,
} from '../lib/color-utils';
import { copyToClipboard } from '../lib/clipboard';
import {
  deserializeCollection,
  configToPalette,
} from '../lib/share-serialization';
import { ContrastRow } from './contrast-indicator';
import { useDocumentTitle } from '../lib/use-document-title';
import { PaletteColorRamp } from './palette-color-ramp';
import { CopyableTokenSwatch } from './copyable-token-swatch';

// ─── Config spec (inline) ───

function InlineConfigSpec({ config }: { config: PaletteConfig }) {
  const specs = [
    { label: 'Hue', value: `${config.hue.toFixed(1)}°` },
    { label: 'Chroma', value: config.chroma.toFixed(3) },
    { label: 'L 950', value: config.lightness950.toFixed(3) },
    { label: 'L 50', value: config.lightness50.toFixed(3) },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {specs.map((s) => (
        <div key={s.label} className="space-y-0.5">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          <p className="text-[12px] font-mono tabular-nums">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Palette card ───

interface DeserializedEntry {
  config: PaletteConfig;
  palette: Palette;
}

function SharedPaletteCard({
  entry,
  selected,
  onToggle,
  expanded,
  onToggleExpand,
}: {
  entry: DeserializedEntry;
  selected: boolean;
  onToggle: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <Card
      className={`group transition-all overflow-hidden gap-0 ${
        selected ? 'ring-2 ring-ring ring-offset-2' : 'hover:shadow-md hover:ring-1 hover:ring-ring/20'
      }`}
    >
      <CardContent className="p-0 last:pb-0" style={{ padding: 0 }}>
        {/* Mobile */}
        <div className="md:hidden">
          <div className="h-14 overflow-hidden">
            <PaletteColorRamp palette={entry.palette} />
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Checkbox
                  checked={selected}
                  onCheckedChange={onToggle}
                  aria-label={`Select ${entry.config.name}`}
                />
                <span className="text-[14px] truncate">{entry.config.name}</span>
              </div>
              <button
                onClick={onToggleExpand}
                className="inline-flex items-center justify-center rounded-md h-7 w-7 p-0 hover:bg-accent transition-colors cursor-pointer shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                aria-label={expanded ? 'Collapse details' : 'Expand details'}
                aria-expanded={expanded}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono">{entry.config.hue.toFixed(0)}°</span>
              <span>·</span>
              <span className="tabular-nums">11 tokens</span>
            </div>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:block">
          <div className="flex items-stretch">
            <div className="shrink-0 w-52 lg:w-56 p-4 flex flex-col justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Checkbox
                  checked={selected}
                  onCheckedChange={onToggle}
                  aria-label={`Select ${entry.config.name}`}
                />
                <span className="text-[14px] truncate">{entry.config.name}</span>
              </div>
              <div className="flex items-center justify-between pl-6">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono">{entry.config.hue.toFixed(0)}°</span>
                  <span>·</span>
                  <span className="tabular-nums">11 tokens</span>
                </div>
                <button
                  onClick={onToggleExpand}
                  className="inline-flex items-center gap-1 rounded-md h-6 px-2 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  aria-label={expanded ? 'Collapse details' : 'Expand details'}
                  aria-expanded={expanded}
                >
                  {expanded ? 'Less' : 'More'}
                  <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-[5rem] overflow-hidden">
              <PaletteColorRamp palette={entry.palette} />
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-border p-3 sm:p-4 space-y-3">
            {/* Full swatch strip with click-to-copy */}
            <div
              className="flex gap-1 max-md:overflow-x-auto max-md:pb-2 max-md:-mx-1 max-md:px-1 max-md:snap-x max-md:snap-mandatory"
              role="list"
              aria-label={`${entry.config.name} token swatches`}
            >
              {entry.palette.tokens.map((token) => (
                <div key={token.step} className="flex-1 min-w-0 max-md:flex-none max-md:w-[60px] max-md:snap-start" role="listitem">
                  <CopyableTokenSwatch
                    token={token}
                    paletteName={entry.config.name}
                    variant="sharedCompact"
                    stopPropagation
                  />
                </div>
              ))}
            </div>
            {/* Contrast indicators */}
            <ContrastRow tokens={entry.palette.tokens} isDarkMode={false} />
            {/* Config spec */}
            <InlineConfigSpec config={entry.config} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page (data loaded by route loader, errors caught by ErrorBoundary) ───

export function SharedCollectionPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const { handleImportPalette, handleImportCollection } = usePaletteContext();
  const data = useLoaderData() as SharedCollectionResponse;

  // Deserialize through trust boundary
  const deserialized = useMemo(() => deserializeCollection(data), [data]);
  const collectionName = deserialized?.name ?? 'Shared Collection';

  useDocumentTitle(`Shared: ${collectionName}`);

  // Build full palette objects from deserialized entries
  const entries: DeserializedEntry[] = useMemo(() => {
    if (!deserialized) return [];
    return deserialized.entries.map((config, i) => ({
      config,
      palette: configToPalette(config, `shared-${i}`),
    }));
  }, [deserialized]);

  const [selected, setSelected] = useState<Set<number>>(() => new Set(entries.map((_, i) => i)));
  const [linkCopied, setLinkCopied] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleSelection = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const toggleExpand = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(entries.map((_, i) => i)));
  }, [entries]);

  const selectNone = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleCopyLink = async () => {
    if (!shareId) return;
    await copyToClipboard(buildShareUrl('collection', shareId));
    setLinkCopied(true);
    toast.success('Link copied to clipboard', { duration: 2000 });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleImportSelected = () => {
    if (selected.size === 0) {
      toast.error('No palettes selected', { duration: 2000 });
      return;
    }
    if (selected.size === 1) {
      const idx = Array.from(selected)[0];
      const entry = entries[idx];
      handleImportPalette(entry.config);
      navigate('/edit');
    } else {
      const importEntries = Array.from(selected)
        .sort((a, b) => a - b)
        .map((idx) => entries[idx].config);
      const { collectionSlug } = handleImportCollection(importEntries, collectionName);
      navigate(collectionSlug ? `/${collectionSlug}` : '/');
    }
  };

  // No valid entries after deserialization
  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <h2 className="text-[16px] mb-1">Invalid collection data</h2>
          <p className="text-[13px] text-muted-foreground">
            This collection contains no valid palette entries.
          </p>
          <Button onClick={() => navigate('/')} className="h-9 text-[13px]">
            <PaletteIcon className="w-4 h-4 mr-1.5" />
            Go home
          </Button>
        </div>
      </div>
    );
  }

  const daysLeft = daysUntilExpiry(data.createdAt);
  const allSelected = selected.size === entries.length;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to workspace
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Shared Collection</p>
              </div>
              <h1 className="text-[20px] sm:text-[24px] font-semibold">{collectionName}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] text-muted-foreground tabular-nums">
                  {entries.length} palette{entries.length !== 1 ? 's' : ''}
                </span>
                {daysLeft !== null && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {daysLeft === 0 ? 'Expires today' : `${daysLeft}d remaining`}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                className="inline-flex items-center gap-1.5 rounded-md h-8 px-3 text-[12px] border border-border hover:bg-accent transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                onClick={handleCopyLink}
              >
                {linkCopied ? <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /> : <Link2 className="w-3.5 h-3.5" />}
                {linkCopied ? 'Copied!' : 'Copy link'}
              </TooltipTrigger>
              <TooltipContent>Copy shareable link</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Selection bar */}
        <div className="flex items-center justify-between gap-3 bg-muted/50 rounded-lg px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              className="text-[12px] text-primary hover:underline cursor-pointer outline-none rounded-sm focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              onClick={allSelected ? selectNone : selectAll}
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-[12px] text-muted-foreground tabular-nums">
              {selected.size} of {entries.length} selected
            </span>
          </div>
          <Button
            onClick={handleImportSelected}
            disabled={selected.size === 0}
            className="h-8 text-[12px]"
          >
            <DownloadIcon className="w-3.5 h-3.5 mr-1.5" />
            Import {selected.size === entries.length ? 'all' : `selected (${selected.size})`}
          </Button>
        </div>

        {/* Palette list */}
        <div className="grid grid-cols-1 gap-3">
          {entries.map((entry, index) => (
            <SharedPaletteCard
              key={index}
              entry={entry}
              selected={selected.has(index)}
              onToggle={() => toggleSelection(index)}
              expanded={expanded.has(index)}
              onToggleExpand={() => toggleExpand(index)}
            />
          ))}
        </div>

        <Separator />

        {/* Footer */}
        <div className="text-center py-4 space-y-2">
          <p className="text-[12px] text-muted-foreground">
            Created with <strong>Colorbound</strong> using the OKLCH perceptual color model
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline"
          >
            <PaletteIcon className="w-3.5 h-3.5" />
            Create your own palette
          </Link>
        </div>
      </div>
    </div>
  );
}

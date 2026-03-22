import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLoaderData, Link } from 'react-router';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import {
  Check,
  Download as DownloadIcon,
  Link2,
  ArrowLeft,
  Clock,
  Sun,
  Moon,
  Palette as PaletteIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePaletteContext } from '../lib/palette-context';
import {
  buildShareUrl,
  daysUntilExpiry,
  type SharedPaletteResponse,
  type SharedPaletteEntry,
} from '../lib/share-api';
import {
  relativeLuminance,
  type Palette,
} from '../lib/color-utils';
import { copyToClipboard } from '../lib/clipboard';
import { ContrastRow, ContrastPairSelector } from './contrast-indicator';
import {
  deserializePaletteEntry,
  configToPalette,
  configToDarkPalette,
} from '../lib/share-serialization';
import { useDocumentTitle } from '../lib/use-document-title';
import { PaletteColorRamp } from './palette-color-ramp';
import { CopyableTokenSwatch } from './copyable-token-swatch';
import { ViewModeToggle, type ViewMode } from './palette-view-mode-toggle';
import { getTokenDisplayColor, useSupportsP3 } from '../lib/use-supports-p3';
import { getVisiblePaletteTokens } from '../lib/palette-density';

// ─── Palette strip ───

function PaletteStrip({ palette, label }: { palette: Palette; label?: string }) {
  const isDark = label === 'Dark';
  const visibleTokens = getVisiblePaletteTokens(palette);
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center gap-2">
          {label === 'Dark' ? (
            <Moon className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <p className="text-[12px] text-muted-foreground">{label} palette</p>
        </div>
      )}
      <div
        className="flex gap-1.5 max-md:overflow-x-auto max-md:pb-2 max-md:-mx-1 max-md:px-1 max-md:snap-x max-md:snap-mandatory"
        role="list"
        aria-label={`${label ?? 'Palette'} token swatches`}
      >
        {visibleTokens.map((token) => (
          <div
            key={token.step}
            className="flex-1 min-w-0 max-md:flex-none max-md:w-[72px] max-md:snap-start"
            role="listitem"
          >
            <CopyableTokenSwatch
              token={token}
              paletteName={palette.name}
              variant="shared"
            />
          </div>
        ))}
      </div>
      <ContrastRow tokens={visibleTokens} isDarkMode={isDark} />
    </div>
  );
}

// ─── Config spec card ───

function ConfigSpec({ entry }: { entry: SharedPaletteEntry }) {
  const specs = [
    { label: 'Target', value: entry.targetColorSpace === 'p3' ? 'Display P3' : 'sRGB' },
    { label: 'Hue', value: `${entry.hue.toFixed(1)}°` },
    { label: 'Chroma', value: entry.chroma.toFixed(3) },
    { label: 'Lightness 50', value: entry.lightness50.toFixed(3) },
    { label: 'Lightness 950', value: entry.lightness950.toFixed(3) },
    { label: 'Density', value: String(entry.density ?? 11) },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {specs.map((s) => (
        <div key={s.label} className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          <p className="text-[13px] font-mono tabular-nums">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main page (data loaded by route loader, errors caught by ErrorBoundary) ───

export function SharedPalettePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const { handleImportPalette, activeCollection } = usePaletteContext();
  const data = useLoaderData() as SharedPaletteResponse;

  const entry = data.palette;
  const createdAt = data.createdAt;

  useDocumentTitle(`Shared: ${entry.name}`);

  const [viewMode, setViewMode] = useState<ViewMode>('light');
  const [linkCopied, setLinkCopied] = useState(false);
  const supportsP3 = useSupportsP3();

  // Deserialize through the trust boundary, then build light + dark palettes
  const deserialized = useMemo(() => {
    const config = deserializePaletteEntry(entry);
    if (!config) return null;
    return {
      config,
      palette: configToPalette(config, 'shared'),
      darkPalette: configToDarkPalette(config, 'shared-dark'),
    };
  }, [entry]);

  const palette = deserialized?.palette ?? null;
  const darkPalette = deserialized?.darkPalette ?? null;

  // Dynamic theme-color meta
  useEffect(() => {
    if (!palette) return;
    const swatch500 = palette.tokens.find((t) => t.step === 500);
    if (!swatch500) return;
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = swatch500.hex;
    return () => {
      if (meta) meta.content = '';
    };
  }, [palette]);

  const handleCopyLink = async () => {
    if (!shareId) return;
    await copyToClipboard(buildShareUrl('palette', shareId));
    setLinkCopied(true);
    toast.success('Link copied to clipboard', { duration: 2000 });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleImport = () => {
    if (!deserialized) return;
    handleImportPalette(deserialized.config);
    const basePath = activeCollection?.slug ? `/${activeCollection.slug}` : '';
    navigate(`${basePath}/edit`);
  };

  // Deserialization failed for the fetched entry
  if (!palette || !darkPalette) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <h2 className="text-[16px] mb-1">Invalid palette data</h2>
          <p className="text-[13px] text-muted-foreground">
            This palette data could not be parsed.
          </p>
          <Button onClick={() => navigate('/')} className="h-9 text-[13px]">
            <PaletteIcon className="w-4 h-4 mr-1.5" />
            Go home
          </Button>
        </div>
      </div>
    );
  }

  const daysLeft = daysUntilExpiry(createdAt);

  // Get 500 swatch color for hero
  const swatch500 = palette.tokens.find((t) => t.step === 500);
  const heroHex = swatch500?.hex ?? '#808080';
  const [r500, g500, b500] = heroHex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((value) => parseInt(value, 16)) as [number, number, number];
  const heroDisplayCss = swatch500 ? getTokenDisplayColor(swatch500, supportsP3) : heroHex;
  const heroLum = relativeLuminance(r500, g500, b500);
  const heroTextClass = heroLum > 0.4 ? 'text-black/80' : 'text-white/90';
  const previewLimited = palette.targetColorSpace === 'p3' && !supportsP3;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to workspace
        </Link>

        {/* Hero card with 500-swatch background */}
        <Card className="overflow-hidden gap-0">
          <div
            className="px-6 py-8 sm:py-10"
            style={{ backgroundColor: heroDisplayCss }}
          >
            <div className={heroTextClass}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[11px] uppercase tracking-wider opacity-70 mb-1">Shared Palette</p>
                  <h1 className="text-[24px] sm:text-[28px] font-semibold">{entry.name}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    {daysLeft !== null && (
                      <span className="inline-flex items-center gap-1 text-[10px] opacity-70">
                        <Clock className="w-3 h-3" />
                        {daysLeft === 0 ? 'Expires today' : `${daysLeft}d remaining`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <CardContent className="p-0" style={{ padding: 0 }}>
            <PaletteColorRamp palette={palette} className="h-3 min-h-3" />
          </CardContent>
        </Card>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
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
            <Button onClick={handleImport} className="h-8 text-[12px]">
              <DownloadIcon className="w-3.5 h-3.5 mr-1.5" />
              Open in editor
            </Button>
          </div>
        </div>

        {previewLimited && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            Preview limited: this display shows the sRGB fallback for P3-target colors.
          </div>
        )}

        {/* Palette swatches */}
        {viewMode === 'both' ? (
          <div className="space-y-5">
            <PaletteStrip palette={palette} label="Light" />
            <PaletteStrip palette={darkPalette} label="Dark" />
          </div>
        ) : viewMode === 'dark' ? (
          <PaletteStrip palette={darkPalette} label="Dark" />
        ) : (
          <PaletteStrip palette={palette} label="Light" />
        )}

        <Separator />

        {/* Config spec */}
        <div className="space-y-3">
          <h3 className="text-[13px] text-muted-foreground">Configuration</h3>
          <ConfigSpec entry={entry} />
        </div>

        <Separator />

        {/* Contrast pair checker */}
        <ContrastPairSelector palette={palette} />

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

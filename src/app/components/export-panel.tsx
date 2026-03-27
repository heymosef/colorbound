import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { PopoverSelect } from './popover-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import {
  Copy,
  Check,
  Download,
  FileCode2,
  Braces,
  Paintbrush,
  Figma,
  FileJson,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Palette } from '../lib/color-utils';
import {
  deriveDarkPalette,
  exportAsCSS,
  exportAsFigmaTokens,
  exportAsTailwind,
  exportAsSCSS,
  exportAsJSON,
  exportAsW3C,
} from '../lib/color-utils';
import { copyToClipboard } from '../lib/clipboard';
import { useCopyFeedback } from '../lib/use-copy-feedback';
import { track } from '../lib/analytics';
import { getPaletteWithVisibleTokens } from '../lib/palette-density';
import { usePaletteContext } from '../lib/palette-context';

type ExportFormat = 'css' | 'tailwind' | 'scss' | 'json' | 'dtcg' | 'figma';
type ColorFormat = 'oklch' | 'hex' | 'rgb' | 'p3';
type ExportScope = 'palette' | 'collection';

interface ExportPanelProps {
  /** When true, renders in a compact inline layout (for tab content) */
  inlineMode?: boolean;
}

interface ExportArtifact {
  id: string;
  label: string;
  code: string;
  language: string;
  filename: string;
}

const FORMAT_INFO: Record<ExportFormat, { label: string; icon: React.ReactNode; ext: string; desc: string }> = {
  css: {
    label: 'CSS',
    icon: <FileCode2 className="w-3.5 h-3.5" />,
    ext: '.css',
    desc: 'CSS custom properties that keep the selected target representation aligned with its sRGB fallback',
  },
  tailwind: {
    label: 'Tailwind',
    icon: <Paintbrush className="w-3.5 h-3.5" />,
    ext: '.css',
    desc: 'Tailwind v4 @theme block with CSS custom properties',
  },
  scss: {
    label: 'SCSS',
    icon: <FileCode2 className="w-3.5 h-3.5" />,
    ext: '.scss',
    desc: 'SCSS variables and map for Sass-based projects',
  },
  json: {
    label: 'JSON',
    icon: <Braces className="w-3.5 h-3.5" />,
    ext: '.json',
    desc: 'Simple flat JSON token map',
  },
  dtcg: {
    label: 'DTCG',
    icon: <FileJson className="w-3.5 h-3.5" />,
    ext: '.tokens.json',
    desc: 'W3C Design Tokens Community Group format',
  },
  figma: {
    label: 'Figma (sRGB)',
    icon: <Figma className="w-3.5 h-3.5" />,
    ext: '.tokens.json',
    desc: 'Figma-compatible token files that always export the sRGB fallback representation',
  },
};

const COLOR_FORMAT_OPTIONS = [
  { value: 'oklch', label: 'OKLCH' },
  { value: 'hex', label: 'Hex' },
  { value: 'rgb', label: 'RGB' },
  { value: 'p3', label: 'Display P3' },
];

const ALL_COLOR_FORMATS = COLOR_FORMAT_OPTIONS.map((item) => item.value as ColorFormat);

const EXPORT_TARGET_CONFIG: Record<ExportFormat, {
  showColorFormat: boolean;
  showPrefix: boolean;
  allowedColorFormats: ColorFormat[];
}> = {
  css: {
    showColorFormat: true,
    showPrefix: true,
    allowedColorFormats: ALL_COLOR_FORMATS,
  },
  tailwind: {
    showColorFormat: true,
    showPrefix: true,
    allowedColorFormats: ALL_COLOR_FORMATS,
  },
  scss: {
    showColorFormat: true,
    showPrefix: false,
    allowedColorFormats: ALL_COLOR_FORMATS,
  },
  json: {
    showColorFormat: true,
    showPrefix: false,
    allowedColorFormats: ALL_COLOR_FORMATS,
  },
  dtcg: {
    showColorFormat: false,
    showPrefix: false,
    allowedColorFormats: ALL_COLOR_FORMATS,
  },
  figma: {
    showColorFormat: false,
    showPrefix: false,
    allowedColorFormats: ['hex'],
  },
};

function CodeBlock({
  code,
  language,
  filename,
  onTrackCopy,
  onTrackDownload,
}: {
  code: string;
  language: string;
  filename: string;
  onTrackCopy?: () => void;
  onTrackDownload?: () => void;
}) {
  const [copied, triggerCopied] = useCopyFeedback();

  const handleCopy = useCallback(async () => {
    await copyToClipboard(code);
    triggerCopied();
    onTrackCopy?.();
    toast.success('Copied to clipboard', { duration: 2000 });
  }, [code, triggerCopied, onTrackCopy]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onTrackDownload?.();
    toast.success(`Downloaded ${filename}`, { duration: 2000 });
  }, [code, filename, onTrackDownload]);

  const lineCount = code.split('\n').length;

  return (
    <div className="rounded-md border border-border overflow-hidden bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <span className="text-[10px] font-mono text-muted-foreground truncate">{filename}</span>
          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 shrink-0">
            {language}
          </Badge>
          <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger
              className="inline-flex items-center justify-center rounded-md h-6 w-6 p-0 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              onClick={handleCopy}
              aria-label={`Copy ${filename}`}
            >
              {copied ? <Check className="w-3 h-3 text-green-600 dark:text-green-400" /> : <Copy className="w-3 h-3" />}
            </TooltipTrigger>
            <TooltipContent>Copy to clipboard</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              className="inline-flex items-center justify-center rounded-md h-6 w-6 p-0 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              onClick={handleDownload}
              aria-label={`Download ${filename}`}
            >
              <Download className="w-3 h-3" />
            </TooltipTrigger>
            <TooltipContent>Download file</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Code */}
      <div className="relative">
        <pre
          className="p-3 text-[10px] font-mono text-foreground/80 overflow-auto max-h-[320px] whitespace-pre leading-relaxed"
          role="region"
          aria-label={`${language} export code for ${filename}`}
          tabIndex={0}
        >
          {code}
        </pre>
      </div>
    </div>
  );
}

function ExportSettings({
  scope,
  onScopeChange,
  colorFormat,
  onColorFormatChange,
  prefix,
  onPrefixChange,
  includeDark,
  onIncludeDarkChange,
  collectionCount,
  activeFormat,
  onActiveFormatChange,
  formatItems,
}: {
  scope: ExportScope;
  onScopeChange: (v: ExportScope) => void;
  colorFormat: ColorFormat;
  onColorFormatChange: (v: ColorFormat) => void;
  prefix: string;
  onPrefixChange: (v: string) => void;
  includeDark: boolean;
  onIncludeDarkChange: (v: boolean) => void;
  collectionCount: number;
  activeFormat: ExportFormat;
  onActiveFormatChange: (v: ExportFormat) => void;
  formatItems: Array<{ value: ExportFormat; label: string; icon: React.ReactNode }>;
}) {
  const exportConfig = EXPORT_TARGET_CONFIG[activeFormat];
  const colorFormatItems = COLOR_FORMAT_OPTIONS.filter((item) =>
    exportConfig.allowedColorFormats.includes(item.value as ColorFormat),
  );

  const scopeItems = [
    { value: 'palette', label: 'Current Palette' },
    { value: 'collection', label: `Project (${collectionCount})`, disabled: collectionCount === 0 },
  ];

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-3">
      <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Output</Label>
      <PopoverSelect
        value={activeFormat}
        onValueChange={(v) => onActiveFormatChange(v as ExportFormat)}
        items={formatItems}
        ariaLabel="Output"
        triggerClassName="h-8 text-[13px]"
      />

      {exportConfig.showColorFormat && (
        <>
          <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Format</Label>
          <PopoverSelect
            value={colorFormat}
            onValueChange={(v) => onColorFormatChange(v as ColorFormat)}
            items={colorFormatItems}
            ariaLabel="Color format"
            triggerClassName="h-8 text-[13px]"
          />
        </>
      )}

      <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Scope</Label>
      <PopoverSelect
        value={scope}
        onValueChange={(v) => onScopeChange(v as ExportScope)}
        items={scopeItems}
        ariaLabel="Export scope"
        triggerClassName="h-8 text-[13px]"
      />

      {exportConfig.showPrefix && (
        <>
          <Label htmlFor="prefix" className="text-[11px] text-muted-foreground whitespace-nowrap">Prefix</Label>
          <Input
            id="prefix"
            value={prefix}
            onChange={(e) => onPrefixChange(e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase())}
            placeholder="color"
            className="h-8 text-[13px] font-mono w-full"
            aria-label="Variable prefix"
          />
        </>
      )}

      <Label htmlFor="include-dark" className="text-[11px] text-muted-foreground whitespace-nowrap">
        Include dark mode
      </Label>
      <div className="flex justify-end">
        <Switch
          id="include-dark"
          checked={includeDark}
          onCheckedChange={onIncludeDarkChange}
          className="origin-left"
          aria-label="Include dark mode"
        />
      </div>
    </div>
  );
}

export function ExportPanel({ inlineMode }: ExportPanelProps) {
  const { currentPalette, darkPalette, collection } = usePaletteContext();

  const [activeFormat, setActiveFormat] = useState<ExportFormat>('css');
  const [scope, setScope] = useState<ExportScope>('palette');
  const [colorFormat, setColorFormat] = useState<ColorFormat>('oklch');
  const [prefix, setPrefix] = useState('');
  const [includeDark, setIncludeDark] = useState(true);
  const [activePreviewId, setActivePreviewId] = useState('default');

  const palettes: Palette[] = useMemo(() => {
    if (scope === 'collection' && collection.length > 0) return collection;
    return currentPalette ? [currentPalette] : [];
  }, [scope, collection, currentPalette]);

  const darkPalettes: Palette[] | undefined = useMemo(() => {
    if (!includeDark) return undefined;
    if (scope === 'palette' && darkPalette) return [darkPalette];
    if (scope === 'collection' && collection.length > 0) return collection.map(deriveDarkPalette);
    return undefined;
  }, [includeDark, scope, darkPalette, collection]);

  const selectedPalettes = useMemo(
    () => palettes.map(getPaletteWithVisibleTokens),
    [palettes],
  );

  const selectedDarkPalettes = useMemo(
    () => darkPalettes?.map(getPaletteWithVisibleTokens),
    [darkPalettes],
  );

  useEffect(() => {
    const allowedFormats = EXPORT_TARGET_CONFIG[activeFormat].allowedColorFormats;
    if (EXPORT_TARGET_CONFIG[activeFormat].showColorFormat && !allowedFormats.includes(colorFormat)) {
      setColorFormat(allowedFormats[0]);
    }
  }, [activeFormat, colorFormat]);

  const exportOptions = useMemo(() => ({
    prefix,
    colorFormat,
    darkPalettes: selectedDarkPalettes,
  }), [prefix, colorFormat, selectedDarkPalettes]);

  const paletteName = useMemo(() => {
    if (scope === 'collection') return 'collection';
    return currentPalette?.name.toLowerCase().replace(/\s+/g, '-') || 'palette';
  }, [scope, currentPalette]);

  const primaryTarget = palettes[0]?.targetColorSpace ?? currentPalette?.targetColorSpace ?? 'srgb';
  const exportDescription = useMemo(() => {
    if (activeFormat === 'css') {
      return primaryTarget === 'p3'
        ? 'Primary target: Display P3. Base variables use the sRGB fallback, with target overrides included for capable browsers.'
        : 'Primary target: sRGB. Exported values match the selected sRGB target directly.';
    }

    if (activeFormat === 'figma') {
      const base = primaryTarget === 'p3'
        ? 'Represents the sRGB fallback for Figma parity. Use OKLCH or CSS exports for the Display P3 target.'
        : 'Represents the palette target directly in Figma-compatible sRGB values.';
      return base;
    }

    return FORMAT_INFO[activeFormat].desc;
  }, [activeFormat, primaryTarget]);

  const exportArtifacts = useMemo<ExportArtifact[]>(() => {
    if (selectedPalettes.length === 0) return [];

    switch (activeFormat) {
      case 'css':
        return [{
          id: 'default',
          label: FORMAT_INFO.css.label,
          code: exportAsCSS(selectedPalettes, exportOptions),
          language: 'CSS',
          filename: `${paletteName}-tokens${FORMAT_INFO.css.ext}`,
        }];
      case 'tailwind':
        return [{
          id: 'default',
          label: FORMAT_INFO.tailwind.label,
          code: exportAsTailwind(selectedPalettes, exportOptions),
          language: 'CSS',
          filename: `${paletteName}-tokens${FORMAT_INFO.tailwind.ext}`,
        }];
      case 'scss':
        return [{
          id: 'default',
          label: FORMAT_INFO.scss.label,
          code: exportAsSCSS(selectedPalettes, { colorFormat, darkPalettes: selectedDarkPalettes }),
          language: 'SCSS',
          filename: `${paletteName}-tokens${FORMAT_INFO.scss.ext}`,
        }];
      case 'json':
        return [{
          id: 'default',
          label: FORMAT_INFO.json.label,
          code: exportAsJSON(selectedPalettes, { colorFormat, darkPalettes: selectedDarkPalettes }),
          language: 'JSON',
          filename: `${paletteName}-tokens${FORMAT_INFO.json.ext}`,
        }];
      case 'dtcg':
        return [{
          id: 'default',
          label: FORMAT_INFO.dtcg.label,
          code: exportAsW3C(selectedPalettes, { darkPalettes: selectedDarkPalettes }),
          language: 'JSON',
          filename: `${paletteName}-tokens${FORMAT_INFO.dtcg.ext}`,
        }];
      case 'figma': {
        const artifacts: ExportArtifact[] = [{
          id: 'light',
          label: 'Light',
          code: exportAsFigmaTokens(selectedPalettes),
          language: 'JSON',
          filename: `${paletteName}-light${FORMAT_INFO.figma.ext}`,
        }];

        if (includeDark && selectedDarkPalettes && selectedDarkPalettes.length > 0) {
          artifacts.push({
            id: 'dark',
            label: 'Dark',
            code: exportAsFigmaTokens(selectedDarkPalettes),
            language: 'JSON',
            filename: `${paletteName}-dark${FORMAT_INFO.figma.ext}`,
          });
        }

        return artifacts;
      }
      default:
        return [];
    }
  }, [activeFormat, selectedPalettes, exportOptions, colorFormat, selectedDarkPalettes, includeDark, paletteName]);

  useEffect(() => {
    if (exportArtifacts.length === 0) {
      setActivePreviewId('default');
      return;
    }

    if (!exportArtifacts.some((artifact) => artifact.id === activePreviewId)) {
      setActivePreviewId(exportArtifacts[0].id);
    }
  }, [exportArtifacts, activePreviewId]);

  const formatItems = (Object.keys(FORMAT_INFO) as ExportFormat[])
    .map((key) => ({
      value: key,
      label: FORMAT_INFO[key].label,
      icon: FORMAT_INFO[key].icon,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (!currentPalette && collection.length === 0) {
    return (
      <div className="text-center text-[12px] text-muted-foreground py-8">
        <FileCode2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>Generate a palette to export tokens</p>
      </div>
    );
  }

  const exportProps = { output: activeFormat, format: colorFormat, scope, has_prefix: prefix.length > 0, include_dark_mode: includeDark };
  const handleTrackCopy = useCallback(() => track('export_copied', exportProps), [activeFormat, colorFormat, scope, prefix, includeDark]);
  const handleTrackDownload = useCallback(() => track('export_downloaded', exportProps), [activeFormat, colorFormat, scope, prefix, includeDark]);

  const content = (
    <div className="space-y-4 min-w-0">
        {/* Settings */}
        <ExportSettings
          scope={scope}
          onScopeChange={setScope}
          colorFormat={colorFormat}
          onColorFormatChange={setColorFormat}
          prefix={prefix}
          onPrefixChange={setPrefix}
          includeDark={includeDark}
          onIncludeDarkChange={setIncludeDark}
          collectionCount={collection.length}
          activeFormat={activeFormat}
          onActiveFormatChange={setActiveFormat}
          formatItems={formatItems}
        />

        {/* Code output */}
        <div className="min-w-0">
          {exportArtifacts.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">
              No palette available for export
            </p>
          ) : exportArtifacts.length === 1 ? (
            <CodeBlock
              code={exportArtifacts[0].code}
              language={exportArtifacts[0].language}
              filename={exportArtifacts[0].filename}
              onTrackCopy={handleTrackCopy}
              onTrackDownload={handleTrackDownload}
            />
          ) : (
            <Tabs value={activePreviewId} onValueChange={setActivePreviewId} className="gap-3">
              <TabsList className="w-full">
                {exportArtifacts.map((artifact) => (
                  <TabsTrigger key={artifact.id} value={artifact.id} className="text-[12px]">
                    {artifact.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {exportArtifacts.map((artifact) => (
                <TabsContent key={artifact.id} value={artifact.id} className="mt-0">
                  <CodeBlock
                    code={artifact.code}
                    language={artifact.language}
                    filename={artifact.filename}
                    onTrackCopy={handleTrackCopy}
                    onTrackDownload={handleTrackDownload}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        <div className="flex items-start gap-1.5">
          <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {exportDescription}
          </p>
        </div>
    </div>
  );

  if (inlineMode) return content;

  return <div className="p-4">{content}</div>;
}

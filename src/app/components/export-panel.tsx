import { useState, useMemo, useCallback } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { PopoverSelect } from './popover-select';
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
  exportAsTailwind,
  exportAsSCSS,
  exportAsJSON,
  exportAsW3C,
  exportAsFigmaVariables,
} from '../lib/color-utils';
import { copyToClipboard } from '../lib/clipboard';
import { usePaletteContext } from '../lib/palette-context';

type ExportFormat = 'css' | 'tailwind' | 'scss' | 'json' | 'dtcg' | 'figma';
type ColorFormat = 'oklch' | 'hex' | 'rgb' | 'hsl' | 'p3';
type ExportScope = 'palette' | 'collection';
type FigmaMode = 'light' | 'dark';

interface ExportPanelProps {
  /** When true, renders in a compact inline layout (for tab content) */
  inlineMode?: boolean;
}

const FORMAT_INFO: Record<ExportFormat, { label: string; icon: React.ReactNode; ext: string; desc: string }> = {
  css: {
    label: 'CSS',
    icon: <FileCode2 className="w-3.5 h-3.5" />,
    ext: '.css',
    desc: 'CSS custom properties with @supports fallback for OKLCH',
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
    label: 'Figma',
    icon: <Figma className="w-3.5 h-3.5" />,
<<<<<<< ours
<<<<<<< ours
    ext: '.tokens.json',
<<<<<<< ours
    desc: 'Figma Variables import JSON. Turn on dark mode to download light and dark files together.',
=======
    ext: '.figma.json',
    desc: 'Figma Variables API-compatible JSON',
>>>>>>> theirs
=======
    ext: '.figma.json',
    desc: 'Figma Variables API-compatible JSON',
>>>>>>> theirs
=======
    desc: 'Figma Variables import JSON (DTCG, one mode per file)',
>>>>>>> theirs
  },
};

const COLOR_FORMAT_OPTIONS = [
  { value: 'oklch', label: 'OKLCH' },
  { value: 'hex', label: 'Hex' },
  { value: 'rgb', label: 'RGB' },
  { value: 'hsl', label: 'HSL' },
  { value: 'p3', label: 'Display P3' },
];

function CodeBlock({
  code,
  language,
  filename,
}: {
  code: string;
  language: string;
  filename: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await copyToClipboard(code);
    setCopied(true);
    toast.success('Copied to clipboard', { duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

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
    toast.success(`Downloaded ${filename}`, { duration: 2000 });
  }, [code, filename]);

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
              aria-label="Copy code"
            >
              {copied ? <Check className="w-3 h-3 text-green-600 dark:text-green-400" /> : <Copy className="w-3 h-3" />}
            </TooltipTrigger>
            <TooltipContent>Copy to clipboard</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              className="inline-flex items-center justify-center rounded-md h-6 w-6 p-0 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              onClick={handleDownload}
              aria-label="Download file"
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
          aria-label={`${language} export code`}
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
  figmaMode,
  onFigmaModeChange,
  collectionCount,
  activeFormat,
}: {
  scope: ExportScope;
  onScopeChange: (v: ExportScope) => void;
  colorFormat: ColorFormat;
  onColorFormatChange: (v: ColorFormat) => void;
  prefix: string;
  onPrefixChange: (v: string) => void;
  includeDark: boolean;
  onIncludeDarkChange: (v: boolean) => void;
  figmaMode: FigmaMode;
  onFigmaModeChange: (v: FigmaMode) => void;
  collectionCount: number;
  activeFormat: ExportFormat;
}) {
  const showColorFormat = activeFormat !== 'dtcg' && activeFormat !== 'figma';
  const showPrefix = activeFormat === 'css' || activeFormat === 'tailwind';
  const showIncludeDark = activeFormat !== 'figma';
  const showFigmaMode = activeFormat === 'figma';

  const scopeItems = [
    { value: 'palette', label: 'Current Palette' },
    { value: 'collection', label: `Collection (${collectionCount})`, disabled: collectionCount === 0 },
  ];

  return (
    <div className="space-y-3">
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
=======
      {/* Include dark mode */}
>>>>>>> theirs
=======
      {/* Include dark mode */}
>>>>>>> theirs
      <div className="flex items-center justify-between">
        <Label htmlFor="include-dark" className="text-[11px] text-muted-foreground whitespace-nowrap">
          Include dark mode
        </Label>
        <Switch
          id="include-dark"
          checked={includeDark}
          onCheckedChange={onIncludeDarkChange}
          className="origin-left"
          aria-label="Include dark mode"
        />
      </div>
=======
      {showIncludeDark && (
        <div className="flex items-center justify-between">
          <Label htmlFor="include-dark" className="text-[11px] text-muted-foreground whitespace-nowrap">
            Include dark mode
          </Label>
          <Switch
            id="include-dark"
            checked={includeDark}
            onCheckedChange={onIncludeDarkChange}
            className="origin-left"
            aria-label="Include dark mode"
          />
        </div>
      )}
>>>>>>> theirs
      
      {/* Scope, Format, Prefix — grid for consistent widths */}
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-3">
        <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Scope</Label>
        <PopoverSelect
          value={scope}
          onValueChange={(v) => onScopeChange(v as ExportScope)}
          items={scopeItems}
          ariaLabel="Export scope"
          triggerClassName="h-8 text-[13px]"
        />

        {showColorFormat && (
          <>
            <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Format</Label>
            <PopoverSelect
              value={colorFormat}
              onValueChange={(v) => onColorFormatChange(v as ColorFormat)}
              items={COLOR_FORMAT_OPTIONS}
              ariaLabel="Color format"
              triggerClassName="h-8 text-[13px]"
            />
          </>
        )}

        {showPrefix && (
          <>
            <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Prefix</Label>
            <Input
              value={prefix}
              onChange={(e) => onPrefixChange(e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase())}
              placeholder="color"
              className="h-8 text-[13px] font-mono w-full"
              aria-label="Variable prefix"
            />
          </>
        )}

        {showFigmaMode && (
          <>
            <Label className="text-[11px] text-muted-foreground whitespace-nowrap">Mode</Label>
            <PopoverSelect
              value={figmaMode}
              onValueChange={(v) => onFigmaModeChange(v as FigmaMode)}
              items={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              ariaLabel="Figma mode"
              triggerClassName="h-8 text-[13px]"
            />
          </>
        )}
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
  const [figmaMode, setFigmaMode] = useState<FigmaMode>('light');

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

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
  const figmaLightCode = useMemo(() => exportAsFigmaTokens(palettes), [palettes]);
  const figmaDarkCode = useMemo(() => {
    if (!darkPalettes || darkPalettes.length === 0) return '';
    return exportAsFigmaTokens(darkPalettes);
  }, [darkPalettes]);
=======
  const figmaPalettes: Palette[] = useMemo(() => {
    if (figmaMode === 'light') return palettes;
    if (scope === 'palette') return darkPalette ? [darkPalette] : [];
    return collection.map(deriveDarkPalette);
  }, [figmaMode, palettes, scope, darkPalette, collection]);
>>>>>>> theirs

=======
>>>>>>> theirs
=======
>>>>>>> theirs
  const exportOptions = useMemo(() => ({
    prefix,
    colorFormat,
    darkPalettes,
  }), [prefix, colorFormat, darkPalettes]);

  const generatedCode = useMemo(() => {
    if (palettes.length === 0) return '';

    switch (activeFormat) {
      case 'css':
        return exportAsCSS(palettes, exportOptions);
      case 'tailwind':
        return exportAsTailwind(palettes, exportOptions);
      case 'scss':
        return exportAsSCSS(palettes, { colorFormat, darkPalettes });
      case 'json':
        return exportAsJSON(palettes, { colorFormat, darkPalettes });
      case 'dtcg':
        return exportAsW3C(palettes, { darkPalettes });
      case 'figma':
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
        return figmaLightCode;
      default:
        return '';
    }
  }, [activeFormat, palettes, exportOptions, colorFormat, darkPalettes, figmaLightCode]);
=======
        return exportAsFigmaVariables(palettes, { darkPalettes });
      default:
        return '';
    }
  }, [activeFormat, palettes, exportOptions, colorFormat, darkPalettes]);
>>>>>>> theirs
=======
        return exportAsFigmaVariables(palettes, { darkPalettes });
      default:
        return '';
    }
  }, [activeFormat, palettes, exportOptions, colorFormat, darkPalettes]);
>>>>>>> theirs
=======
        return exportAsFigmaTokens(figmaPalettes);
      default:
        return '';
    }
  }, [activeFormat, palettes, exportOptions, colorFormat, darkPalettes, figmaPalettes]);
>>>>>>> theirs

  const paletteName = useMemo(() => {
    if (scope === 'collection') return 'collection';
    return currentPalette?.name.toLowerCase().replace(/\s+/g, '-') || 'palette';
  }, [scope, currentPalette]);

<<<<<<< ours
  const filename = `${paletteName}-tokens${FORMAT_INFO[activeFormat].ext}`;
<<<<<<< ours
<<<<<<< ours
  const figmaDownloadFiles = useMemo(() => {
    if (activeFormat !== 'figma') return undefined;

    const files = [
      {
        filename: `${paletteName}-light${FORMAT_INFO.figma.ext}`,
        code: figmaLightCode,
      },
    ];

    if (includeDark && figmaDarkCode) {
      files.push({
        filename: `${paletteName}-dark${FORMAT_INFO.figma.ext}`,
        code: figmaDarkCode,
      });
    }

    return files;
  }, [activeFormat, paletteName, figmaLightCode, includeDark, figmaDarkCode]);
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
  const filename = activeFormat === 'figma'
    ? `${paletteName}-${figmaMode}${FORMAT_INFO[activeFormat].ext}`
    : `${paletteName}-tokens${FORMAT_INFO[activeFormat].ext}`;
>>>>>>> theirs
  const languageMap: Record<ExportFormat, string> = {
    css: 'CSS',
    tailwind: 'CSS',
    scss: 'SCSS',
    json: 'JSON',
    dtcg: 'JSON',
    figma: 'JSON',
  };

  const formatItems = (Object.keys(FORMAT_INFO) as ExportFormat[]).map((key) => ({
    value: key,
    label: FORMAT_INFO[key].label,
    icon: FORMAT_INFO[key].icon,
  }));

  if (!currentPalette && collection.length === 0) {
    return (
      <div className="text-center text-[12px] text-muted-foreground py-8">
        <FileCode2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>Generate a palette to export tokens</p>
      </div>
    );
  }

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
          figmaMode={figmaMode}
          onFigmaModeChange={setFigmaMode}
          collectionCount={collection.length}
          activeFormat={activeFormat}
        />

        <Separator />

      <div className="space-y-2 min-w-0">
        {/* Format selector dropdown */}
      <PopoverSelect
        value={activeFormat}
        onValueChange={(v) => setActiveFormat(v as ExportFormat)}
        items={formatItems}
        ariaLabel="Export format"
        triggerClassName="h-8 text-[13px]"
      />

        {/* Format description */}
        <div className="flex items-start gap-1.5">
          <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {FORMAT_INFO[activeFormat].desc}
          </p>
        </div>
      </div>

        {/* Code output */}
        <div className="min-w-0">
          {palettes.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">
              No palette available for export
            </p>
          ) : (
            <CodeBlock
              code={generatedCode}
              language={languageMap[activeFormat]}
              filename={filename}
            />
          )}
        </div>
    </div>
  );

  if (inlineMode) return content;

  return <div className="p-4">{content}</div>;
}

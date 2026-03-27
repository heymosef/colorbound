import { useEffect, useMemo, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { Check, X, AlertTriangle, Shield, ChevronDown, CircleCheck, CircleX } from 'lucide-react';
import type { ColorToken, Palette } from '../lib/color-utils';
import { getVisiblePaletteTokens } from '../lib/palette-density';
import { relativeLuminance, wcag2Contrast, getWcag2Rating, apcaContrast, getApcaRating } from '../lib/color-utils';
import { useBreakpoint } from '../lib/use-breakpoint';
import { useSupportsP3, getTokenDisplayColor } from '../lib/use-supports-p3';
import { usePaletteContext, type ContrastAlgorithm } from '../lib/palette-context';
import { track } from '../lib/analytics';

// ─── Types ───

type ContrastLevel = 'aaa' | 'aa' | 'aa-large' | 'fail';

interface ContrastResult {
  algorithm: ContrastAlgorithm;
  level: ContrastLevel;
  // WCAG fields
  ratio: number;
  aa: boolean;
  aaa: boolean;
  aaLarge: boolean;
  // APCA fields
  lc: number;
  bodyText: boolean;
  largeText: boolean;
  nonText: boolean;
}

// ─── Helpers ───

function getContrastResult(fgHex: string, bgHex: string, algorithm: ContrastAlgorithm): ContrastResult {
  const fgRgb = hexToRgb(fgHex);
  const bgRgb = hexToRgb(bgHex);

  // Always compute WCAG
  const fgLum = relativeLuminance(fgRgb[0], fgRgb[1], fgRgb[2]);
  const bgLum = relativeLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);
  const ratio = wcag2Contrast(fgLum, bgLum);
  const wcagRating = getWcag2Rating(ratio);

  // Always compute APCA
  const lc = apcaContrast(fgRgb[0], fgRgb[1], fgRgb[2], bgRgb[0], bgRgb[1], bgRgb[2]);
  const apcaRating = getApcaRating(lc);

  // Determine level based on selected algorithm
  let level: ContrastLevel = 'fail';
  if (algorithm === 'wcag') {
    if (wcagRating.aaa) level = 'aaa';
    else if (wcagRating.aa) level = 'aa';
    else if (wcagRating.aaLarge) level = 'aa-large';
  } else {
    // APCA
    const absLc = Math.abs(lc);
    if (absLc >= 75) level = 'aaa';        // body text
    else if (absLc >= 60) level = 'aa';     // large text
    else if (absLc >= 45) level = 'aa-large'; // non-text only
  }

  return {
    algorithm,
    level,
    ratio,
    ...wcagRating,
    lc,
    ...apcaRating,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function getTokenHex(token: ColorToken): string {
  return token.hex;
}

/** Return the best display CSS string: P3 when supported, sRGB-mapped fallback otherwise. */
function getTokenDisplayCss(token: ColorToken, supportsP3: boolean): string {
  return getTokenDisplayColor(token, supportsP3);
}

// ─── Status Icon Component ───

function StatusIcon({ level, size = 18 }: { level: ContrastLevel; size?: number }) {
  const isPass = level === 'aaa' || level === 'aa';
  const isPartial = level === 'aa-large';

  const icon = isPass ? (
    <Check className="w-2.5 h-2.5" strokeWidth={3} />
  ) : isPartial ? (
    <AlertTriangle className="w-2.5 h-2.5" strokeWidth={2.5} />
  ) : (
    <X className="w-2.5 h-2.5" strokeWidth={3} />
  );

  return (
    <div
      className="inline-flex items-center justify-center rounded-full bg-foreground/70 text-background dark:bg-foreground/60 dark:text-background"
      style={{ width: size, height: size }}
    >
      {icon}
    </div>
  );
}

// ─── Algorithm Toggle ───

export function AlgorithmToggle({ value, onChange }: { value: ContrastAlgorithm; onChange: (v: ContrastAlgorithm) => void }) {
  const handleChange = (v: ContrastAlgorithm) => {
    onChange(v);
    track('contrast_algorithm_changed', { algorithm: v });
  };
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-muted p-0.5 gap-0.5" role="radiogroup" aria-label="Contrast algorithm">
      <button
        role="radio"
        aria-checked={value === 'wcag'}
        onClick={() => handleChange('wcag')}
        className={`inline-flex items-center px-2 py-1 rounded-sm text-[11px] transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
          value === 'wcag' ? 'bg-background dark:bg-muted-foreground/15 shadow-sm dark:shadow-none text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        WCAG 2
      </button>
      <button
        role="radio"
        aria-checked={value === 'apca'}
        onClick={() => handleChange('apca')}
        className={`inline-flex items-center px-2 py-1 rounded-sm text-[11px] transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
          value === 'apca' ? 'bg-background dark:bg-muted-foreground/15 shadow-sm dark:shadow-none text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        APCA
      </button>
    </div>
  );
}

// ─── Tooltip Content for Contrast ───

function ContrastTooltipContent({
  result,
  bgHex,
  bgLabel,
}: {
  result: ContrastResult;
  bgHex: string;
  bgLabel: string;
}) {
  const isApca = result.algorithm === 'apca';

  const levelLabel = isApca
    ? result.level === 'aaa'
      ? 'Body Text'
      : result.level === 'aa'
        ? 'Large Text'
        : result.level === 'aa-large'
          ? 'Non-Text Only'
          : 'Fail'
    : result.level === 'aaa'
      ? 'AAA Contrast'
      : result.level === 'aa'
        ? 'AA Contrast'
        : result.level === 'aa-large'
          ? 'Large Text Only'
          : 'Fail Contrast';

  return (
    <div className="space-y-1.5 min-w-[140px]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px]">{levelLabel}</p>
        <span className="text-[9px] opacity-60 uppercase tracking-wide">{isApca ? 'APCA' : 'WCAG 2'}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] opacity-80">
        <span>vs</span>
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm border border-white/20"
          style={{ backgroundColor: bgHex }}
        />
        <span className="font-mono">{bgLabel}</span>
        <span className="ml-auto font-mono tabular-nums border border-current/20 rounded px-1 py-0.5 text-[9px]">
          {isApca ? `Lc ${Math.abs(result.lc).toFixed(1)}` : `${result.ratio.toFixed(2)}:1`}
        </span>
      </div>
      <div className="border-t border-current/15 pt-1.5 space-y-0.5">
        {isApca ? (
          <>
            <div className="flex items-center justify-between text-[10px]">
              <span>Body text</span>
              <span className={result.bodyText ? 'opacity-100' : 'opacity-50'}>
                {result.bodyText ? 'Pass' : 'Fail'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span>Large text</span>
              <span className={result.largeText ? 'opacity-100' : 'opacity-50'}>
                {result.largeText ? 'Pass' : 'Fail'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span>Non-text</span>
              <span className={result.nonText ? 'opacity-100' : 'opacity-50'}>
                {result.nonText ? 'Pass' : 'Fail'}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-[10px]">
              <span>Normal text</span>
              <span className={result.aa ? 'opacity-100' : 'opacity-50'}>
                {result.aa ? 'Pass' : 'Fail'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span>Large text</span>
              <span className={result.aaLarge ? 'opacity-100' : 'opacity-50'}>
                {result.aaLarge ? 'Pass' : 'Fail'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Single Swatch Contrast Indicator ───

export function SwatchContrastIndicator({
  token,
  isDarkMode,
}: {
  token: ColorToken;
  isDarkMode: boolean;
}) {
  const { contrastAlgorithm } = usePaletteContext();
  const fgHex = getTokenHex(token);
  const bgHex = isDarkMode ? '#000000' : '#ffffff';
  const bgLabel = isDarkMode ? '#000000' : '#ffffff';

  const result = useMemo(
    () => getContrastResult(fgHex, bgHex, contrastAlgorithm),
    [fgHex, bgHex, contrastAlgorithm]
  );
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === 'desktop';

  const isApca = contrastAlgorithm === 'apca';
  const triggerClassName = "flex items-center justify-center cursor-default p-0.5 rounded-full outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]";
  const ariaLabel = isApca
    ? `APCA Lc ${Math.abs(result.lc).toFixed(1)} vs ${bgLabel}. ${
        result.bodyText ? 'Passes body text' : result.largeText ? 'Passes large text only' : 'Fails'
      }`
    : `Contrast ${result.ratio.toFixed(2)}:1 vs ${bgLabel}. ${
        result.aa ? 'Passes AA' : result.aaLarge ? 'Passes large text only' : 'Fails'
      }`;
  const content = <ContrastTooltipContent result={result} bgHex={bgHex} bgLabel={bgLabel} />;

  if (isDesktop) {
    return (
      <Tooltip>
        <TooltipTrigger
          className={triggerClassName}
          aria-label={ariaLabel}
        >
          <StatusIcon level={result.level} />
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="bg-popover text-popover-foreground border border-border shadow-lg rounded-lg px-3 py-2.5"
          arrowClassName="fill-popover"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        className={triggerClassName}
        aria-label={ariaLabel}
      >
        <StatusIcon level={result.level} />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        className="w-auto min-w-[180px] max-w-[220px] px-3 py-2.5"
        sideOffset={4}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}

// ─── Contrast Row (renders indicators beneath all swatches) ───

export function ContrastRow({
  tokens,
  isDarkMode,
}: {
  tokens: ColorToken[];
  isDarkMode: boolean;
}) {
  const { contrastAlgorithm } = usePaletteContext();
  const algorithmLabel = contrastAlgorithm === 'apca' ? 'APCA' : 'WCAG 2';

  return (
    <TooltipProvider delayDuration={500} skipDelayDuration={300}>
      <div
        className="flex gap-1.5"
        role="list"
        aria-label={`${algorithmLabel} contrast indicators (vs ${isDarkMode ? 'black' : 'white'})`}
      >
        {tokens.map((token) => (
          <div key={token.step} className="flex-1 min-w-0 flex justify-center" role="listitem">
            <SwatchContrastIndicator token={token} isDarkMode={isDarkMode} />
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

// ─── Popover-based Step Selector (replaces Radix Select to avoid portal crash) ───

const EXTRA_STOPS: { value: string; hex: string; displayCss: string }[] = [
  { value: 'White', hex: '#ffffff', displayCss: '#ffffff' },
  { value: 'Black', hex: '#000000', displayCss: '#000000' },
];

function resolveStepHex(tokens: ColorToken[], step: string): string | null {
  const extra = EXTRA_STOPS.find((e) => e.value === step);
  if (extra) return extra.hex;
  const token = tokens.find((t) => String(t.step) === step);
  return token ? getTokenHex(token) : null;
}

/** Resolve a step to its native oklch() CSS string for wide-gamut display. */
function resolveStepDisplayCss(tokens: ColorToken[], step: string, supportsP3: boolean): string | null {
  const extra = EXTRA_STOPS.find((e) => e.value === step);
  if (extra) return extra.displayCss;
  const token = tokens.find((t) => String(t.step) === step);
  return token ? getTokenDisplayCss(token, supportsP3) : null;
}

function StepSelector({
  value,
  onChange,
  tokens,
  label,
}: {
  value: string;
  onChange: (step: string) => void;
  tokens: ColorToken[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const supportsP3 = useSupportsP3();
  const selectedHex = resolveStepHex(tokens, value);
  const selectedDisplayCss = resolveStepDisplayCss(tokens, value, supportsP3);

  // Compute token hexes once to filter duplicate extras
  const tokenHexes = useMemo(
    () => new Set(tokens.map((t) => getTokenHex(t).toLowerCase())),
    [tokens]
  );
  const filteredExtras = EXTRA_STOPS.filter(
    (e) => !tokenHexes.has(e.hex.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] h-7 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
        aria-label={label}
      >
        <span className="flex items-center gap-2 min-w-0 line-clamp-1">
          {selectedHex && (
            <span
              className="w-3 h-3 rounded-[2px] border border-border shrink-0"
              style={{ backgroundColor: selectedDisplayCss ?? selectedHex }}
            />
          )}
          <span className="truncate">{value}</span>
        </span>
        <ChevronDown className="size-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[8rem] p-1 max-h-[240px] overflow-y-auto">
        {tokens.map((token) => {
          const displayCss = getTokenDisplayCss(token, supportsP3);
          const step = String(token.step);
          const isSelected = step === value;
          return (
            <button
              key={step}
              type="button"
              className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none focus-visible:bg-accent ${
                isSelected
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => {
                onChange(step);
                setOpen(false);
              }}
            >
              <span
                className="w-3 h-3 rounded-[2px] border border-border shrink-0"
                style={{ backgroundColor: displayCss }}
              />
              <span>{step}</span>
              {isSelected && (
                <Check className="w-3 h-3 ml-auto opacity-60" />
              )}
            </button>
          );
        })}
        {filteredExtras.length > 0 && (
          <>
            <Separator className="my-1" />
            {filteredExtras.map((extra) => {
              const isSelected = extra.value === value;
              return (
                <button
                  key={extra.value}
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none focus-visible:bg-accent ${
                    isSelected
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                  onClick={() => {
                    onChange(extra.value);
                    setOpen(false);
                  }}
                >
                  <span
                    className="w-3 h-3 rounded-[2px] border border-border shrink-0"
                    style={{ backgroundColor: extra.hex }}
                  />
                  <span>{extra.value}</span>
                  {isSelected && (
                    <Check className="w-3 h-3 ml-auto opacity-60" />
                  )}
                </button>
              );
            })}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Contrast Pair Selector ───

export function ContrastPairSelector({ palette, inlineMode }: { palette: Palette | null; inlineMode?: boolean }) {
  const { contrastAlgorithm, setContrastAlgorithm } = usePaletteContext();
  const [fgStep, setFgStep] = useState('700');
  const [bgStep, setBgStep] = useState('50');
  const supportsP3 = useSupportsP3();

  const visibleTokens = palette ? getVisiblePaletteTokens(palette) : [];

  useEffect(() => {
    const visibleSteps = visibleTokens.map((t) => String(t.step));
    if (visibleSteps.length === 0) return;
    if (!visibleSteps.includes(fgStep)) {
      setFgStep(visibleSteps[visibleSteps.length - 1]);
    }
    if (!visibleSteps.includes(bgStep)) {
      setBgStep(visibleSteps[0]);
    }
  }, [visibleTokens]); // eslint-disable-line react-hooks/exhaustive-deps

  const fgHex = useMemo(() => resolveStepHex(visibleTokens, fgStep), [visibleTokens, fgStep]);
  const bgHex = useMemo(() => resolveStepHex(visibleTokens, bgStep), [visibleTokens, bgStep]);
  const fgDisplayCss = useMemo(() => resolveStepDisplayCss(visibleTokens, fgStep, supportsP3), [visibleTokens, fgStep, supportsP3]);
  const bgDisplayCss = useMemo(() => resolveStepDisplayCss(visibleTokens, bgStep, supportsP3), [visibleTokens, bgStep, supportsP3]);

  const result = useMemo(() => {
    if (!fgHex || !bgHex) return null;
    return { ...getContrastResult(fgHex, bgHex, contrastAlgorithm), fgHex, bgHex };
  }, [fgHex, bgHex, contrastAlgorithm]);

  // APCA result (always computed for the pair checker)
  const apcaResult = useMemo(() => {
    if (!fgHex || !bgHex) return null;
    const fgRgb = hexToRgb(fgHex);
    const bgRgb = hexToRgb(bgHex);
    const lc = apcaContrast(fgRgb[0], fgRgb[1], fgRgb[2], bgRgb[0], bgRgb[1], bgRgb[2]);
    return { lc, ...getApcaRating(lc) };
  }, [fgHex, bgHex]);

  // WCAG result (always computed for the pair checker)
  const wcagResult = useMemo(() => {
    if (!fgHex || !bgHex) return null;
    const fgRgb = hexToRgb(fgHex);
    const bgRgb = hexToRgb(bgHex);
    const fgLum = relativeLuminance(fgRgb[0], fgRgb[1], fgRgb[2]);
    const bgLum = relativeLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);
    const ratio = wcag2Contrast(fgLum, bgLum);
    const rating = getWcag2Rating(ratio);
    let level: ContrastLevel = 'fail';
    if (rating.aaa) level = 'aaa';
    else if (rating.aa) level = 'aa';
    else if (rating.aaLarge) level = 'aa-large';
    return { ratio, level, ...rating };
  }, [fgHex, bgHex]);

  if (!palette) {
    return (
      <div className="text-center text-[12px] text-muted-foreground py-4">
        Generate a palette to test accessibility
      </div>
    );
  }

  if (!result || !fgHex || !bgHex) return null;

  const content = (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Foreground</Label>
          <StepSelector
            value={fgStep}
            onChange={setFgStep}
            tokens={visibleTokens}
            label="Select foreground step"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Background</Label>
          <StepSelector
            value={bgStep}
            onChange={setBgStep}
            tokens={visibleTokens}
            label="Select background step"
          />
        </div>
      </div>

      {/* Color preview */}
      <div
        className="rounded-md p-4 text-center"
        style={{ backgroundColor: bgDisplayCss ?? bgHex }}
      >
        <p className="text-[16px]" style={{ color: fgDisplayCss ?? fgHex }}>
          Sample Text Aa
        </p>
        <p className="text-[12px] mt-1" style={{ color: fgDisplayCss ?? fgHex }}>
          The quick brown fox jumps over the lazy dog
        </p>
      </div>

      {/* Contrast Summary Cards */}
      {apcaResult && wcagResult && result && (
        <>
          <WcagSummaryCard
            ratio={wcagResult.ratio}
            aaa={wcagResult.aaa}
            aa={wcagResult.aa}
            aaLarge={wcagResult.aaLarge}
            fgHex={result.fgHex}
            bgHex={result.bgHex}
          />
          <ApcaSummaryCard
            lc={apcaResult.lc}
            bodyText={apcaResult.bodyText}
            largeText={apcaResult.largeText}
            nonText={apcaResult.nonText}
            fgHex={result.fgHex}
            bgHex={result.bgHex}
          />
        </>
      )}
    </div>
  );

  if (inlineMode) {
    return content;
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <p className="text-[12px] text-muted-foreground">Contrast Pair Checker</p>
      </div>
      <div className="p-4">
        {content}
      </div>
    </div>
  );
}

// ─── APCA Summary Card ───

function PassFailBadge({ pass }: { pass: boolean }) {
  return pass ? (
    <CircleCheck className="w-4 h-4 text-success-600 dark:text-success-400" />
  ) : (
    <CircleX className="w-4 h-4 text-error-600 dark:text-error-400" />
  );
}

function ApcaSummaryCard({
  lc,
  bodyText,
  largeText,
  nonText,
  fgHex,
  bgHex,
}: {
  lc: number;
  bodyText: boolean;
  largeText: boolean;
  nonText: boolean;
  fgHex: string;
  bgHex: string;
}) {
  const absLc = Math.abs(lc);

  const apcaRows = [
    { label: 'Body text', threshold: 'Lc 75+', pass: bodyText },
    { label: 'Large text', threshold: 'Lc 60+', pass: largeText },
    { label: 'Non-text', threshold: 'Lc 45+', pass: nonText },
  ];

  return (
    <Card className="gap-0 overflow-hidden">
      {/* APCA Section */}
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-4 py-2 bg-muted/50">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">APCA</span>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-12 text-center">
          Lc {absLc.toFixed(1)}
        </span>
      </div>
      <Separator />
      {apcaRows.map((row, i) => (
        <div key={row.label}>
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-4 py-2.5">
            <div>
              <p className="text-[13px] font-medium leading-tight">{row.label}</p>
              <p className="text-[11px] text-muted-foreground font-mono tabular-nums">{row.threshold}</p>
            </div>
            <div className="w-12 flex justify-center">
              <PassFailBadge pass={row.pass} />
            </div>
          </div>
          {i < apcaRows.length - 1 && <Separator />}
        </div>
      ))}
    </Card>
  );
}

// ─── WCAG Summary Card ───

function WcagSummaryCard({
  ratio,
  aaa,
  aa,
  aaLarge,
  fgHex,
  bgHex,
}: {
  ratio: number;
  aaa: boolean;
  aa: boolean;
  aaLarge: boolean;
  fgHex: string;
  bgHex: string;
}) {
  const wcagRows = [
    { label: 'AAA Normal', threshold: '≥ 7:1', pass: aaa },
    { label: 'AA Normal', threshold: '≥ 4.5:1', pass: aa },
    { label: 'AA Large', threshold: '≥ 3:1', pass: aaLarge },
  ];

  return (
    <Card className="gap-0 overflow-hidden">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-4 py-2 bg-muted/50">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">WCAG 2</span>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-12 text-center">
          {ratio.toFixed(2)}:1
        </span>
      </div>
      <Separator />
      {wcagRows.map((row, i) => (
        <div key={row.label}>
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-4 py-2.5">
            <div>
              <p className="text-[13px] font-medium leading-tight">{row.label}</p>
              <p className="text-[11px] text-muted-foreground font-mono tabular-nums">{row.threshold}</p>
            </div>
            <div className="w-12 flex justify-center">
              <PassFailBadge pass={row.pass} />
            </div>
          </div>
          {i < wcagRows.length - 1 && <Separator />}
        </div>
      ))}
    </Card>
  );
}

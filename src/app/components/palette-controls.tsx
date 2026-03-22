/**
 * Palette Controls — configuration panel with integrated save/undo actions.
 *
 * Save and undo buttons appear at the bottom of the controls when the palette
 * is dirty or unsaved, providing a consistent save experience across all
 * breakpoints (mobile drawer, tablet sidebar, desktop sidebar).
 */
import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Separator } from "./ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import { Info, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import type { OklchColor, GamutFlag } from "../lib/color-utils";
import { oklchToRgb, rgbToHex, hexToOklch, classifyGamut, maxSrgbChromaForHue, maxP3ChromaForHue, gamutMapToSrgb, formatOklch } from "../lib/color-utils";
import { suggestPaletteName } from "../lib/color-utils";
import type { PaletteConfig } from "../lib/palette-context";
import { DEFAULT_PALETTE_DENSITY, PALETTE_DENSITY_OPTIONS } from "../lib/palette-density";

interface PaletteControlsProps {
  config: PaletteConfig;
  onConfigChange: (partial: Partial<PaletteConfig>) => void;
  onNameChange: (name: string) => void;
  onApplyHex?: (hue: number, chroma: number) => void;
  paletteNameError?: string | null;
  isDirty?: boolean;
  activePaletteId?: string | null;
  hasPersistedBaseline?: boolean;
  onSave?: () => unknown;
  onAddToCollection?: () => unknown;
  onRevert?: (options?: { silent?: boolean }) => void;
  onClose?: () => void;
}

function isFailedMutationResult(value: unknown): value is { ok: false } {
  return typeof value === 'object' && value !== null && 'ok' in value && (value as { ok?: boolean }).ok === false;
}

function HuePreview({
  hue,
  chroma,
}: {
  hue: number;
  chroma: number;
}) {
  const previewChroma = Math.min(chroma, 0.2);
  const mapped = gamutMapToSrgb(0.65, previewChroma, hue);
  return (
    <div
      className="w-full h-10 rounded-lg border border-border"
      style={{ backgroundColor: formatOklch(mapped) }}
      aria-label={`Preview color: hue ${hue}, chroma ${chroma.toFixed(2)}`}
    />
  );
}

function SliderField({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  tooltip,
  displayValue,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  tooltip?: string;
  displayValue?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={id} className="text-[13px]">
            {label}
          </Label>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger
                className="inline-flex rounded-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                aria-label={`Info about ${label}`}
              >
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="max-w-[200px]"
              >
                <p className="text-[12px]">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-[12px] text-muted-foreground tabular-nums font-mono">
          {displayValue ?? value.toFixed(2)}
        </span>
      </div>
      <Slider
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
      />
    </div>
  );
}

/** Tiny inline badge showing whether the 500 swatch needs P3 or is sRGB-safe. */
function GamutBadge({ gamut }: { gamut: GamutFlag }) {
  if (gamut === 'srgb') return null;
  return (
    <span
      className={`inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-[9px] font-medium tracking-wide ${
        gamut === 'p3'
          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
      }`}
      title={gamut === 'p3' ? 'This color uses the wider Display P3 gamut' : 'This color exceeds Display P3 gamut — chroma will be reduced'}
    >
      {gamut === 'p3' ? 'P3' : 'Out of gamut'}
    </span>
  );
}

export function PaletteControls({
  config,
  onConfigChange,
  onNameChange,
  onApplyHex,
  paletteNameError,
  isDirty,
  activePaletteId,
  hasPersistedBaseline,
  onSave,
  onAddToCollection,
  onRevert,
  onClose,
}: PaletteControlsProps) {
  const [hexInput, setHexInput] = useState('');
  const [hexError, setHexError] = useState(false);
  const targetColorSpace = config.targetColorSpace ?? 'srgb';
  const currentDensity = config.density ?? DEFAULT_PALETTE_DENSITY;
  const hasPaletteNameError = !!paletteNameError;

  // Compute gamut status for the identity swatch (500 step equivalent)
  const midpointGamut = useMemo((): GamutFlag => {
    const t = (500 - 50) / 900;
    const l = config.lightness50 - t * (config.lightness50 - config.lightness950);
    return classifyGamut(l, Math.min(0.4, config.chroma), config.hue);
  }, [config.hue, config.chroma, config.lightness50, config.lightness950]);

  // Dynamic chroma cap: max slider value that keeps the anchor step (500) within target gamut.
  // Other steps use proportional C/L scaling and are individually gamut-mapped.
  const chromaCap = useMemo(
    () => targetColorSpace === 'p3'
      ? maxP3ChromaForHue(config.hue, config.lightness50, config.lightness950, 0)
      : maxSrgbChromaForHue(config.hue, config.lightness50, config.lightness950, 0),
    [config.hue, config.lightness50, config.lightness950, targetColorSpace],
  );

  // Auto-clamp chroma when the cap shrinks below current value
  useEffect(() => {
    if (config.chroma > chromaCap) {
      onConfigChange({ chroma: chromaCap });
    }
  }, [chromaCap]); // eslint-disable-line react-hooks/exhaustive-deps

  const isValidHex = (v: string): boolean => {
    const stripped = v.replace('#', '');
    return /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(stripped);
  };

  const applyHex = (raw: string) => {
    const v = raw.startsWith('#') ? raw : `#${raw}`;
    if (!isValidHex(v)) {
      setHexError(true);
      return;
    }
    setHexError(false);
    const oklch = hexToOklch(v);
    const hue = Math.round(oklch.h);
    const chroma = Math.round(oklch.c * 1000) / 1000;
    if (onApplyHex) {
      onApplyHex(hue, chroma);
    } else {
      onConfigChange({ hue, chroma });
    }
    const name = hasPersistedBaseline
      ? config.name
      : suggestPaletteName(hue, chroma, config.lightness50, config.lightness950);
    toast.success(`Applied hex #${raw.replace('#', '').toUpperCase()}`, {
      description: `Hue ${hue}°, Chroma ${chroma.toFixed(3)} — "${name}"`,
      duration: 2500,
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim().replace('#', '');
    if (isValidHex(pasted)) {
      e.preventDefault();
      setHexInput(pasted);
      // Use setTimeout so state update + apply happen cleanly
      setTimeout(() => applyHex(pasted), 0);
    }
  };

  return (
    <Card className="h-full border-0 border-r border-border rounded-none shadow-none bg-card">
      <CardContent className="px-4 pt-4 pb-4 space-y-5">
        {/* Panel title */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground tracking-wide uppercase">
            Palette Controls
          </p>
          <GamutBadge gamut={midpointGamut} />
        </div>

        {/* Hex value */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="from-hex" className="text-[13px]">
              Hex value
            </Label>
            <Tooltip>
              <TooltipTrigger
                className="inline-flex rounded-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                aria-label="Info about Hex value"
              >
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="max-w-[200px]"
              >
                <p className="text-[12px]">Paste a hex color to extract its hue and chroma</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            <div className={`relative flex-1 min-w-0 flex items-center rounded-lg border border-input shadow-xs has-[input:focus-visible]:ring-ring/50 has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:border-ring ${hexError ? 'border-destructive dark:border-destructive-foreground has-[input:focus-visible]:ring-destructive/30' : ''}`}>
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground font-mono pointer-events-none">
                #
              </span>
              <Input
                id="from-hex"
                value={hexInput}
                onChange={(e) => {
                  const v = e.target.value.replace('#', '');
                  setHexInput(v);
                  setHexError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    applyHex(hexInput);
                  }
                }}
                onPaste={handlePaste}
                placeholder="e.g. 3B82F6"
                className="h-8 text-[13px] font-mono pl-6 flex-1 min-w-0 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                maxLength={6}
                aria-invalid={hexError}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 mr-1 rounded-md"
                onClick={() => applyHex(hexInput)}
                disabled={!hexInput}
                aria-label="Generate palette from hex"
              >
                <WandSparkles className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          {hexError && (
            <p className="text-[11px] text-destructive dark:text-destructive-foreground">
              Enter a valid 3- or 6-digit hex code
            </p>
          )}
        </div>

        {/* Color space / gamut target */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-[13px]">Palette Target</Label>
            <Tooltip>
              <TooltipTrigger
                className="inline-flex rounded-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                aria-label="Info about Color Space"
              >
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px]">
                <p className="text-[12px]">
                  Chooses the palette's canonical target gamut. Preview, values, copy, and OKLCH export all follow this target.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center rounded-md border border-border bg-muted p-0.5 gap-0.5" role="radiogroup" aria-label="Gamut target">
            <button
              role="radio"
              aria-checked={targetColorSpace === 'srgb'}
              onClick={() => onConfigChange({ targetColorSpace: 'srgb' })}
              className={`flex-1 px-2 py-0.5 rounded-sm text-[11px]! font-medium! leading-tight transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
                targetColorSpace === 'srgb' ? 'bg-background dark:bg-muted-foreground/15 shadow-sm dark:shadow-none text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              sRGB
            </button>
            <button
              role="radio"
              aria-checked={targetColorSpace === 'p3'}
              onClick={() => onConfigChange({ targetColorSpace: 'p3' })}
              className={`flex-1 px-2 py-0.5 rounded-sm text-[11px]! font-medium! leading-tight transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
                targetColorSpace === 'p3' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 shadow-sm dark:shadow-none' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Display P3
            </button>
          </div>
        </div>

        {/* Hue */}
        <div className="space-y-2">
          <div className="md:hidden">
            <HuePreview
              hue={config.hue}
              chroma={config.chroma}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="hue" className="text-[13px]">
                Hue
              </Label>
              <Tooltip>
                <TooltipTrigger
                  className="inline-flex rounded-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  aria-label="Info about Hue"
                >
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="max-w-[200px]"
                >
                  <p className="text-[12px]">The base hue angle on the color wheel</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-[12px] text-muted-foreground tabular-nums font-mono">
              {config.hue}°
            </span>
          </div>
          <Slider
            id="hue"
            value={[config.hue]}
            min={0}
            max={360}
            step={1}
            onValueChange={([v]) => onConfigChange({ hue: v })}
            aria-label="Hue"
            trackStyle={{
              background:
                "linear-gradient(to right, oklch(0.65 0.2 0), oklch(0.65 0.2 60), oklch(0.65 0.2 120), oklch(0.65 0.2 180), oklch(0.65 0.2 240), oklch(0.65 0.2 300), oklch(0.65 0.2 360))",
            }}
            rangeClassName="bg-transparent"
          />
        </div>

        {/* ── Chroma Slider ── DO NOT REMOVE without explicit user request ── */}
        <SliderField
          id="chroma"
          label="Chroma"
          value={config.chroma}
          min={0}
          max={chromaCap}
          step={0.005}
          onChange={(v) => onConfigChange({ chroma: v })}
          tooltip={`Controls color intensity at the anchor step (500). Max ${targetColorSpace.toUpperCase()}-safe: ${chromaCap.toFixed(3)}`}
          displayValue={config.chroma.toFixed(3)}
        />

        <Separator />

        {/* Lightness Range */}
        <div className="space-y-1">
          <p className="text-[12px] text-muted-foreground">
            Lightness Range
          </p>
        </div>

        <SliderField
          id="lightness-50"
          label="Step 50 (lightest)"
          value={config.lightness50}
          min={0.5}
          max={1}
          step={0.005}
          onChange={(v) => onConfigChange({ lightness50: v })}
          tooltip="Target OKLCH lightness for the lightest token (step 50). Higher = closer to white."
          displayValue={`L ${config.lightness50.toFixed(3)}`}
        />

        <SliderField
          id="lightness-950"
          label="Step 950 (darkest)"
          value={config.lightness950}
          min={0}
          max={0.5}
          step={0.005}
          onChange={(v) => onConfigChange({ lightness950: v })}
          tooltip="Target OKLCH lightness for the darkest token (step 950). Lower = closer to black."
          displayValue={`L ${config.lightness950.toFixed(3)}`}
        />

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-[13px]">Density</Label>
            <Tooltip>
              <TooltipTrigger
                className="inline-flex rounded-sm outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                aria-label="Info about Density"
              >
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px]">
                <p className="text-[12px]">
                  Controls how many canonical steps are shown. The palette still generates on the full 50-950 scale.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center rounded-md border border-border bg-muted p-0.5 gap-0.5" role="radiogroup" aria-label="Density">
            {PALETTE_DENSITY_OPTIONS.map((density) => (
              <button
                key={density}
                role="radio"
                aria-checked={density === currentDensity}
                onClick={() => onConfigChange({ density })}
                className={`flex-1 px-2 py-0.5 rounded-sm text-[11px]! font-medium! leading-tight transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
                  density === currentDensity
                    ? 'bg-background dark:bg-muted-foreground/15 shadow-sm dark:shadow-none text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {density}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Palette Name */}
        <div className="space-y-2">
          <Label htmlFor="palette-name" className="text-[13px]">
            Palette Name
          </Label>
          <Input
            id="palette-name"
            value={config.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Blue, Primary, Slate"
            className="h-8 text-[13px]"
            aria-invalid={hasPaletteNameError}
          />
          {hasPaletteNameError && (
            <p className="text-[11px] text-destructive dark:text-destructive-foreground">
              {paletteNameError}
            </p>
          )}
        </div>

        {/* Save / Undo actions */}
        {onClose ? (
          /* Mobile: always show Save + Cancel, no icons */
          <>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <Button
                size="sm"
                className="w-full h-8 text-[12px]"
                onClick={() => {
                  const result = (activePaletteId ? onSave : onAddToCollection)?.();
                  if (isFailedMutationResult(result)) {
                    return;
                  }
                  onClose();
                }}
                disabled={activePaletteId ? !isDirty || hasPaletteNameError : hasPaletteNameError}
              >
                Save palette
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-[12px] text-muted-foreground"
                onClick={() => {
                  if (hasPersistedBaseline) {
                    onRevert?.({ silent: true });
                  }
                  onClose();
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (onSave || onAddToCollection) ? (
          /* Tablet/Desktop: always show save/undo actions */
          <>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <Button
                size="sm"
                className="w-full h-8 text-[12px] gap-1.5"
                onClick={activePaletteId ? onSave : onAddToCollection}
                disabled={activePaletteId ? !isDirty || hasPaletteNameError : hasPaletteNameError}
              >
                Save palette
              </Button>
              {onRevert && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 text-[12px] text-muted-foreground"
                  onClick={onRevert}
                  disabled={!hasPersistedBaseline || !isDirty}
                >
                  Cancel changes
                </Button>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

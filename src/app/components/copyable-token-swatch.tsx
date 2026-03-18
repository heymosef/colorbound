import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { oklchToRgb, rgbToHex, relativeLuminance, type ColorToken } from '../lib/color-utils';
import { copyToClipboard } from '../lib/clipboard';
import { getTokenDisplayColor, useSupportsP3 } from '../lib/use-supports-p3';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

type SwatchVariant =
  | 'workspace'
  | 'workspaceCompact'
  | 'shared'
  | 'sharedCompact';

function getAriaLabelSuffix(variant: SwatchVariant): string {
  return variant === 'workspace'
    ? 'Click to copy OKLCH value.'
    : 'Click to copy.';
}

export function CopyableTokenSwatch({
  token,
  paletteName,
  variant,
  preferBestAvailableColor = false,
  stopPropagation = false,
}: {
  token: ColorToken;
  paletteName: string;
  variant: SwatchVariant;
  preferBestAvailableColor?: boolean;
  stopPropagation?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const resetTimeoutRef = useRef<number | null>(null);
  const supportsP3 = useSupportsP3();
  const [r, g, b] = oklchToRgb(token.oklch.l, token.oklch.c, token.oklch.h);
  const hex = rgbToHex(r, g, b);
  const lum = relativeLuminance(r, g, b);
  const textColor = lum > 0.4 ? '#000000' : '#ffffff';
  const textOpacity = lum > 0.4 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';
  const displayBg = preferBestAvailableColor
    ? getTokenDisplayColor(token, supportsP3)
    : token.displayCss;
  const ariaLabel = `${paletteName} ${token.step}: ${token.css}. ${getAriaLabelSuffix(variant)}`;

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async (event?: React.MouseEvent) => {
    if (stopPropagation) {
      event?.stopPropagation();
    }

    await copyToClipboard(token.css);
    setCopied(true);
    toast.success(`Copied ${paletteName}-${token.step}`, {
      description: token.css,
      duration: 2000,
    });

    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = window.setTimeout(() => {
      setCopied(false);
      resetTimeoutRef.current = null;
    }, 2000);
  };

  if (variant === 'workspaceCompact') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="h-10 w-full rounded-sm transition-transform hover:scale-105 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer"
            style={{ backgroundColor: displayBg }}
            onClick={handleCopy}
            aria-label={ariaLabel}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-[12px] font-mono">{token.step}: {token.css}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'workspace') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className="group relative flex flex-col justify-between rounded-lg overflow-hidden transition-all hover:ring-2 hover:ring-ring hover:ring-offset-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer w-full"
        style={{ backgroundColor: displayBg, minHeight: '120px' }}
        aria-label={ariaLabel}
      >
        <div className="p-2.5 flex justify-between items-start">
          <span className="text-[13px] font-mono" style={{ color: textColor }}>
            {token.step}
          </span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
            {copied ? (
              <Check className="w-3.5 h-3.5 lucide-check" style={{ color: textColor }} />
            ) : (
              <Copy className="w-3.5 h-3.5" style={{ color: textColor }} />
            )}
          </span>
        </div>
        <div className="p-2.5 space-y-0.5">
          <div className="flex justify-between text-[10px] font-mono tabular-nums" style={{ color: textOpacity }}>
            <span>L</span>
            <span>{token.oklch.l.toFixed(3)}</span>
          </div>
          <div className="flex justify-between text-[10px] font-mono tabular-nums" style={{ color: textOpacity }}>
            <span>C</span>
            <span>{token.oklch.c.toFixed(3)}</span>
          </div>
          <div className="flex justify-between text-[10px] font-mono tabular-nums" style={{ color: textOpacity }}>
            <span>H</span>
            <span>{token.oklch.h.toFixed(1)}</span>
          </div>
          <p className="text-[10px] font-mono tabular-nums text-right pt-1" style={{ color: textOpacity }}>
            {hex}
          </p>
        </div>
      </button>
    );
  }

  if (variant === 'sharedCompact') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className="group/swatch relative flex flex-col justify-between rounded-lg overflow-hidden transition-all hover:ring-2 hover:ring-ring hover:ring-offset-1 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer w-full"
        style={{ backgroundColor: displayBg, minHeight: '80px' }}
        aria-label={ariaLabel}
      >
        <div className="p-2 flex justify-between items-start">
          <span className="text-[11px] font-mono" style={{ color: textColor }}>
            {token.step}
          </span>
          <span className="opacity-0 group-hover/swatch:opacity-100 transition-opacity" aria-hidden="true">
            {copied ? (
              <Check className="w-3 h-3 lucide-check" style={{ color: textColor }} />
            ) : (
              <Copy className="w-3 h-3" style={{ color: textColor }} />
            )}
          </span>
        </div>
        <div className="p-2 space-y-0.5">
          <p className="text-[9px] font-mono truncate" style={{ color: textOpacity }}>{token.css}</p>
          <p className="text-[9px] font-mono" style={{ color: textOpacity }}>{hex}</p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group relative flex flex-col justify-between rounded-lg overflow-hidden transition-all hover:ring-2 hover:ring-ring hover:ring-offset-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer w-full"
      style={{ backgroundColor: displayBg, minHeight: '120px' }}
      aria-label={ariaLabel}
    >
      <div className="p-2.5 flex justify-between items-start">
        <span className="text-[13px] font-mono" style={{ color: textColor }}>
          {token.step}
        </span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
          {copied ? (
            <Check className="w-3.5 h-3.5 lucide-check" style={{ color: textColor }} />
          ) : (
            <Copy className="w-3.5 h-3.5" style={{ color: textColor }} />
          )}
        </span>
      </div>
      <div className="p-2.5 space-y-0.5">
        <p className="text-[10px] font-mono truncate" style={{ color: textOpacity }}>
          {token.css}
        </p>
        <p className="text-[10px] font-mono" style={{ color: textOpacity }}>
          {hex}
        </p>
      </div>
    </button>
  );
}

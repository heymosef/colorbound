import type { Palette } from '../lib/color-utils';
import { getTokenDisplayColor, useSupportsP3 } from '../lib/use-supports-p3';
import { cn } from './ui/utils';

export function PaletteColorRamp({
  palette,
  useBestAvailableColor = false,
  className,
}: {
  palette: Palette;
  useBestAvailableColor?: boolean;
  className?: string;
}) {
  const supportsP3 = useSupportsP3();

  return (
    <div
      className={cn('flex h-full min-h-10 overflow-hidden', className)}
      aria-label={`${palette.name} color ramp`}
    >
      {palette.tokens.map((token) => (
        <div
          key={token.step}
          className="flex-1"
          style={{
            backgroundColor: useBestAvailableColor
              ? getTokenDisplayColor(token, supportsP3)
              : token.displayCss,
          }}
        />
      ))}
    </div>
  );
}

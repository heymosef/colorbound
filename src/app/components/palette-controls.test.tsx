import React, { createContext, useContext } from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaletteControls } from './palette-controls';
import type { PaletteConfig } from '../lib/palette-context';
import { DEFAULT_DARK_CURVE, DEFAULT_LIGHT_CURVE } from '../lib/color-utils';

const { toastSuccess } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
}));
let breakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop';

const PopoverContext = createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
} | null>(null);

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccess,
  },
}));

vi.mock('../lib/use-breakpoint', () => ({
  useBreakpoint: () => breakpoint,
}));

vi.mock('./ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children, asChild, ...props }: any) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, props);
    }
    return <button type="button" {...props}>{children}</button>;
  },
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('./ui/popover', () => ({
  Popover: ({ open, onOpenChange, children }: any) => {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const resolvedOpen = open ?? internalOpen;
    const handleOpenChange = onOpenChange ?? setInternalOpen;

    return (
      <PopoverContext.Provider value={{ open: resolvedOpen, onOpenChange: handleOpenChange }}>
        <div data-testid="popover">{children}</div>
      </PopoverContext.Provider>
    );
  },
  PopoverTrigger: ({ children, asChild, ...props }: any) => {
    const ctx = useContext(PopoverContext);
    const handleClick = () => ctx?.onOpenChange(!ctx.open);
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        onClick: handleClick,
      });
    }
    return <button type="button" {...props} onClick={handleClick}>{children}</button>;
  },
  PopoverContent: ({ children }: any) => {
    const ctx = useContext(PopoverContext);
    return ctx?.open ? <div>{children}</div> : null;
  },
}));

vi.mock('./ui/slider', () => ({
  Slider: ({ id, 'aria-label': ariaLabel, value, onValueChange, min, max }: any) => (
    <input
      id={id}
      aria-label={ariaLabel}
      type="range"
      min={min}
      max={max}
      value={Array.isArray(value) ? value[0] : value ?? ''}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
    />
  ),
}));

type CurveAwarePaletteConfig = PaletteConfig & {
  lightCurve?: number;
  darkCurve?: number;
  lightBias?: number;
  darkBias?: number;
};

const baseConfig: CurveAwarePaletteConfig = {
  name: 'Ocean',
  hue: 210,
  chroma50: 0.12,
  chroma: 0.12,
  chroma950: 0.12,
  lightCurve: DEFAULT_LIGHT_CURVE,
  darkCurve: DEFAULT_DARK_CURVE,
  lightness50: 0.985,
  lightness950: 0.025,
  density: 11,
  targetColorSpace: 'srgb',
  generationVersion: 6,
};

describe('PaletteControls', () => {
  beforeEach(() => {
    breakpoint = 'desktop';
    toastSuccess.mockReset();
  });

  it('renders explicit endpoint and curve controls in the chroma section', () => {
    render(
      <PaletteControls
        config={baseConfig}
        onConfigChange={vi.fn()}
        onNameChange={vi.fn()}
      />,
    );

    expect(screen.queryByText('Neutral Palette')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Toggle neutral palette mode')).not.toBeInTheDocument();
    expect(screen.queryByText('Chroma Curve')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Chroma curve preview from step 50 to step 950')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Chroma')).toBeInTheDocument();
    expect(screen.getByLabelText('Light End')).toBeInTheDocument();
    expect(screen.getByLabelText('Dark End')).toBeInTheDocument();
    expect(screen.getByLabelText('Light Curve')).toBeInTheDocument();
    expect(screen.getByLabelText('Dark Curve')).toBeInTheDocument();
  });

  it('keeps the chroma controls available across desktop, tablet, and mobile layouts', () => {
    for (const nextBreakpoint of ['desktop', 'tablet', 'mobile'] as const) {
      breakpoint = nextBreakpoint;
      const { unmount } = render(
        <PaletteControls
          config={baseConfig}
          onConfigChange={vi.fn()}
          onNameChange={vi.fn()}
        />,
      );

      expect(screen.getByLabelText('Chroma')).toBeInTheDocument();
      expect(screen.getByLabelText('Light End')).toBeInTheDocument();
      expect(screen.getByLabelText('Dark End')).toBeInTheDocument();
      expect(screen.getByLabelText('Light Curve')).toBeInTheDocument();
      expect(screen.getByLabelText('Dark Curve')).toBeInTheDocument();

      unmount();
    }
  });

  it('updates endpoint and curve controls independently', () => {
    const onConfigChange = vi.fn();

    render(
      <PaletteControls
        config={baseConfig}
        onConfigChange={onConfigChange}
        onNameChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Light End'), { target: { value: '0.01' } });
    fireEvent.change(screen.getByLabelText('Dark End'), { target: { value: '0.04' } });
    fireEvent.change(screen.getByLabelText('Light Curve'), { target: { value: '-0.4' } });
    fireEvent.change(screen.getByLabelText('Dark Curve'), { target: { value: '0.75' } });

    expect(onConfigChange).toHaveBeenCalledWith({ chroma50: 0.01 });
    expect(onConfigChange).toHaveBeenCalledWith({ chroma950: 0.04 });
    expect(onConfigChange).toHaveBeenCalledWith({ lightCurve: -0.4 });
    expect(onConfigChange).toHaveBeenCalledWith({ darkCurve: 0.75 });
  });

  it('falls back to legacy curve fields when canonical curve fields are absent', () => {
    const legacyCurveConfig: CurveAwarePaletteConfig = {
      ...baseConfig,
      lightCurve: undefined,
      darkCurve: undefined,
      lightBias: -0.25,
      darkBias: 0.5,
    };

    render(
      <PaletteControls
        config={legacyCurveConfig}
        onConfigChange={vi.fn()}
        onNameChange={vi.fn()}
      />,
    );

    expect((screen.getByLabelText('Light Curve') as HTMLInputElement).value).toBe('-0.25');
    expect((screen.getByLabelText('Dark Curve') as HTMLInputElement).value).toBe('0.5');
  });

  it('keeps the saved palette name in the paste flow toast', () => {
    vi.useFakeTimers();
    const onApplyHex = vi.fn();

    render(
      <PaletteControls
        config={baseConfig}
        onConfigChange={vi.fn()}
        onNameChange={vi.fn()}
        onApplyHex={onApplyHex}
        hasPersistedBaseline
      />,
    );

    fireEvent.paste(screen.getByLabelText('Hex value'), {
      clipboardData: {
        getData: () => '#3B82F6',
      },
    });

    vi.runAllTimers();
    vi.useRealTimers();

    expect(onApplyHex).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Applied hex'),
      expect.objectContaining({
        description: expect.stringContaining('"Ocean"'),
      }),
    );
  });

  it('keeps the saved palette name in the manual enter flow toast', () => {
    const onApplyHex = vi.fn();

    render(
      <PaletteControls
        config={baseConfig}
        onConfigChange={vi.fn()}
        onNameChange={vi.fn()}
        onApplyHex={onApplyHex}
        hasPersistedBaseline
      />,
    );

    const input = screen.getByLabelText('Hex value');
    fireEvent.change(input, { target: { value: '3B82F6' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onApplyHex).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Applied hex'),
      expect.objectContaining({
        description: expect.stringContaining('"Ocean"'),
      }),
    );
  });

  it('opens info text from a tap on mobile', () => {
    breakpoint = 'mobile';

    render(
      <PaletteControls
        config={baseConfig}
        onConfigChange={vi.fn()}
        onNameChange={vi.fn()}
      />,
    );

    expect(screen.queryByText('Paste a hex color to extract its hue and chroma')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Info about Hex value'));

    expect(screen.getByText('Paste a hex color to extract its hue and chroma')).toBeInTheDocument();
  });
});

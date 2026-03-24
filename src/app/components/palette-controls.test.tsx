import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaletteControls } from './palette-controls';

const { toastSuccess } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccess,
  },
}));

vi.mock('./ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
}));

vi.mock('./ui/slider', () => ({
  Slider: ({ id, 'aria-label': ariaLabel }: any) => (
    <input id={id} aria-label={ariaLabel} type="range" />
  ),
}));

describe('PaletteControls', () => {
  beforeEach(() => {
    toastSuccess.mockReset();
  });

  it('does not render the removed neutral palette toggle', () => {
    render(
      <PaletteControls
        config={{
          name: 'Ocean',
          hue: 210,
          chroma: 0.12,
          lightness50: 0.985,
          lightness950: 0.025,
        }}
        onConfigChange={vi.fn()}
        onNameChange={vi.fn()}
      />,
    );

    expect(screen.queryByText('Neutral Palette')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Toggle neutral palette mode')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Chroma')).toBeInTheDocument();
  });

  it('keeps the saved palette name in the paste flow toast', () => {
    vi.useFakeTimers();
    const onApplyHex = vi.fn();

    render(
      <PaletteControls
        config={{
          name: 'Ocean',
          hue: 210,
          chroma: 0.12,
          lightness50: 0.985,
          lightness950: 0.025,
        }}
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
        config={{
          name: 'Ocean',
          hue: 210,
          chroma: 0.12,
          lightness50: 0.985,
          lightness950: 0.025,
        }}
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
});

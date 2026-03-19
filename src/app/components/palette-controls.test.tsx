import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaletteControls } from './palette-controls';

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
});

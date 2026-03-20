import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ColorToken } from '../lib/color-utils';
import { CopyableTokenSwatch } from './copyable-token-swatch';
import { TooltipProvider } from './ui/tooltip';

const { copyToClipboard, toastSuccess } = vi.hoisted(() => ({
  copyToClipboard: vi.fn(() => Promise.resolve()),
  toastSuccess: vi.fn(),
}));

vi.mock('../lib/clipboard', () => ({
  copyToClipboard,
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccess,
  },
}));

vi.mock('../lib/use-supports-p3', () => ({
  useSupportsP3: () => false,
  getTokenDisplayColor: (token: ColorToken) => token.displayCss,
}));

function makeToken(overrides: Partial<ColorToken> = {}): ColorToken {
  return {
    step: overrides.step ?? 500,
    oklch: { l: 0.5, c: 0.1, h: 200 },
    oklchMapped: { l: 0.5, c: 0.1, h: 200 },
    css: overrides.css ?? 'oklch(0.500 0.100 200.0)',
    rgb: 'rgb(100,150,200)',
    hex: overrides.hex ?? '#6496c8',
    p3Css: overrides.p3Css ?? 'color(display-p3 0.3922 0.5882 0.7843)',
    gamut: overrides.gamut ?? 'srgb',
    displayCss: overrides.displayCss ?? 'oklch(0.500 0.100 200.0)',
  };
}

function renderWithProviders(node: React.ReactElement) {
  return render(
    <TooltipProvider>
      {node}
    </TooltipProvider>,
  );
}

describe('CopyableTokenSwatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('copies the token css value and shows the shared toast message', async () => {
    renderWithProviders(
      <CopyableTokenSwatch
        token={makeToken()}
        paletteName="Blue"
        variant="shared"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Blue 500/ }));

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith('oklch(0.500 0.100 200.0)');
    });

    expect(toastSuccess).toHaveBeenCalledWith(
      'Copied Blue-500',
      expect.objectContaining({
        description: 'oklch(0.500 0.100 200.0)',
        duration: 2000,
      }),
    );
  });

  it('renders workspace details differently from shared details', () => {
    const { rerender } = renderWithProviders(
      <CopyableTokenSwatch
        token={makeToken()}
        paletteName="Blue"
        variant="workspace"
      />,
    );

    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.queryByText('OKLCH')).not.toBeInTheDocument();
    expect(screen.queryByText('sRGB')).not.toBeInTheDocument();
    expect(screen.queryByText('HEX')).not.toBeInTheDocument();

    rerender(
      <TooltipProvider>
        <CopyableTokenSwatch
          token={makeToken()}
          paletteName="Blue"
          variant="shared"
        />
      </TooltipProvider>,
    );

    expect(screen.queryByText('L')).not.toBeInTheDocument();
    expect(screen.queryByText('C')).not.toBeInTheDocument();
    expect(screen.queryByText('H')).not.toBeInTheDocument();
    expect(screen.getByText('oklch(0.500 0.100 200.0)')).toBeInTheDocument();
  });

  it('renders the compact variants with their condensed sizing', () => {
    const { rerender } = renderWithProviders(
      <CopyableTokenSwatch
        token={makeToken()}
        paletteName="Blue"
        variant="workspaceCompact"
      />,
    );

    expect(screen.getByRole('button', { name: /Blue 500/ }).className).toContain('h-10');

    rerender(
      <TooltipProvider>
        <CopyableTokenSwatch
          token={makeToken()}
          paletteName="Blue"
          variant="sharedCompact"
        />
      </TooltipProvider>,
    );

    expect(screen.getByRole('button', { name: /Blue 500/ })).toHaveStyle({ minHeight: '80px' });
  });

  it('toggles the copied icon state and resets it after the timeout', async () => {
    vi.useFakeTimers();

    const { container } = renderWithProviders(
      <CopyableTokenSwatch
        token={makeToken()}
        paletteName="Blue"
        variant="shared"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Blue 500/ }));

    await Promise.resolve();
    await Promise.resolve();

    expect(copyToClipboard).toHaveBeenCalled();
    expect(container.querySelector('.lucide-check')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(container.querySelector('.lucide-check')).not.toBeInTheDocument();
  });

  it('stops propagation for the shared compact variant when requested', () => {
    const onParentClick = vi.fn();

    renderWithProviders(
      <div onClick={onParentClick}>
        <CopyableTokenSwatch
          token={makeToken()}
          paletteName="Blue"
          variant="sharedCompact"
          stopPropagation
        />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Blue 500/ }));

    expect(onParentClick).not.toHaveBeenCalled();
  });
});

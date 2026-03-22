import React from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportPanel } from './export-panel';
import { deriveDarkPalette, generatePalette, type Palette } from '../lib/color-utils';

const { copyToClipboard, toastSuccess } = vi.hoisted(() => ({
  copyToClipboard: vi.fn(() => Promise.resolve()),
  toastSuccess: vi.fn(),
}));

const palette: Palette = {
  id: 'primary',
  name: 'Primary',
  tokens: generatePalette(110, 0.18, 0.985, 0.025),
  hue: 110,
  chroma: 0.18,
  lightness50: 0.985,
  lightness950: 0.025,
};

let paletteContextValue = {
  currentPalette: palette,
  darkPalette: deriveDarkPalette(palette),
  collection: [palette],
};

vi.mock('../lib/clipboard', () => ({
  copyToClipboard,
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccess,
  },
}));

vi.mock('../lib/palette-context', () => ({
  usePaletteContext: () => paletteContextValue,
}));

vi.mock('./popover-select', () => ({
  PopoverSelect: ({ value, onValueChange, items, ariaLabel }: any) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {items.map((item: any) => (
        <option key={item.value} value={item.value} disabled={item.disabled}>
          {item.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('./ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  TooltipContent: ({ children }: any) => <>{children}</>,
}));

describe('ExportPanel', () => {
  beforeEach(() => {
    paletteContextValue = {
      currentPalette: palette,
      darkPalette: deriveDarkPalette(palette),
      collection: [palette],
    };
    copyToClipboard.mockClear();
    toastSuccess.mockClear();
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:export-preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('shows Output first and hides format and prefix controls for Figma', async () => {
    const { container } = render(<ExportPanel inlineMode />);

    fireEvent.change(screen.getByLabelText('Output'), { target: { value: 'figma' } });

    expect(screen.queryByLabelText('Variable prefix')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Color format')).not.toBeInTheDocument();

    const labels = Array.from(container.querySelectorAll('[data-slot="label"]')).map((label) =>
      label.textContent?.trim(),
    );

    expect(labels.slice(0, 4)).toEqual(['Output', 'Scope', 'Scale', 'Include dark mode']);
    expect(container.querySelector('[data-slot="separator-root"]')).not.toBeInTheDocument();
  });

  it('shows separate Light and Dark Figma previews with independent copy actions when dark mode is enabled', async () => {
    render(<ExportPanel inlineMode />);

    fireEvent.change(screen.getByLabelText('Output'), { target: { value: 'figma' } });

    await screen.findByRole('tablist');

    expect(screen.getByRole('tab', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /primary-light\.tokens\.json/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /copy primary-light\.tokens\.json/i }));

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledTimes(1);
    });

    const lightPayload = copyToClipboard.mock.calls[0][0];
    expect(lightPayload).toContain('"primary"');
    expect(lightPayload).toContain('"$type": "color"');

    const darkTab = screen.getByRole('tab', { name: 'Dark' });
    fireEvent.click(darkTab);
    fireEvent.keyDown(darkTab, { key: 'Enter' });

    await waitFor(() => {
      expect(darkTab).toHaveAttribute('data-state', 'active');
    });

    expect(screen.getByRole('region', { name: /primary-dark\.tokens\.json/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /copy primary-dark\.tokens\.json/i }));

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledTimes(2);
    });

    const darkPayload = copyToClipboard.mock.calls[1][0];
    expect(darkPayload).toContain('"primary"');
    expect(darkPayload).toContain('"$type": "color"');
    expect(darkPayload).not.toEqual(lightPayload);
  });

  it('shows only the light Figma file and downloads only that file when dark mode is off', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const downloadedFiles: string[] = [];

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName);

      if (tagName === 'a') {
        const anchor = element as HTMLAnchorElement;
        anchor.click = vi.fn(() => {
          downloadedFiles.push(anchor.download);
        }) as unknown as typeof anchor.click;
      }

      return element;
    }) as typeof document.createElement);

    render(<ExportPanel inlineMode />);

    fireEvent.change(screen.getByLabelText('Output'), { target: { value: 'figma' } });
    fireEvent.click(screen.getByRole('switch', { name: /include dark mode/i }));

    await waitFor(() => {
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('region', { name: /primary-light\.tokens\.json/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download primary-dark\.tokens\.json/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /download primary-light\.tokens\.json/i }));

    expect(downloadedFiles).toEqual(['primary-light.tokens.json']);
  });

  it('keeps non-Figma exports on a single preview artifact and renders the description below it', () => {
    const { container } = render(<ExportPanel inlineMode />);

    const codeRegion = screen.getByRole('region', { name: /primary-tokens\.css/i });
    const description = screen.getByText('Primary target: sRGB. Exported values match the selected sRGB target directly.');

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(codeRegion).toBeInTheDocument();
    expect(codeRegion.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('[data-slot="separator-root"]')).not.toBeInTheDocument();
  });
});

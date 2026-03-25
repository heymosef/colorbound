import React, { createContext, useContext } from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ShareCollectionButton,
  SharePaletteButton,
} from './share-dialog';

const createSharedPalette = vi.fn();
const createSharedCollection = vi.fn();
const copyToClipboard = vi.fn();

const PopoverContext = createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
} | null>(null);

vi.mock('../lib/share-api', () => ({
  createSharedPalette: (...args: unknown[]) => createSharedPalette(...args),
  createSharedCollection: (...args: unknown[]) => createSharedCollection(...args),
  buildShareUrl: (type: 'palette' | 'collection', id: string) => `https://colorbound.test/${type}/${id}`,
}));

vi.mock('../lib/clipboard', () => ({
  copyToClipboard: (...args: unknown[]) => copyToClipboard(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock('./ui/popover', () => ({
  Popover: ({ open = false, onOpenChange, children }: any) => (
    <PopoverContext.Provider value={{ open, onOpenChange: onOpenChange ?? (() => {}) }}>
      {children}
    </PopoverContext.Provider>
  ),
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

vi.mock('./ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('./ui/button', () => ({
  Button: ({ children, ...props }: any) => <button type="button" {...props}>{children}</button>,
}));

vi.mock('./ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('./ui/separator', () => ({
  Separator: () => <hr />,
}));

describe('Share dialog flows', () => {
  beforeEach(() => {
    createSharedPalette.mockReset();
    createSharedCollection.mockReset();
    copyToClipboard.mockReset();
  });

  it('shows the backend palette error and retries the request', async () => {
    createSharedPalette
      .mockRejectedValueOnce(new Error('Invalid palette data: all config fields (name, hue, chroma, lightness50/lightness950 or blackRange/whiteRange, isNeutral) are required and must be valid'))
      .mockResolvedValueOnce({ id: 'palette-2', type: 'palette' });

    render(
      <SharePaletteButton
        hideTrigger
        open
        onOpenChange={vi.fn()}
        palette={{
          name: 'Ocean',
          hue: 210,
          chroma50: 0.12,
          chroma: 0.12,
          chroma950: 0.12,
          lightness50: 0.985,
          lightness950: 0.025,
          density: 11,
        }}
      />,
    );

    expect(await screen.findByText(/all config fields/i)).toBeInTheDocument();
    expect(createSharedPalette).toHaveBeenCalledWith({
      name: 'Ocean',
      hue: 210,
      chroma50: 0.12,
      chroma: 0.12,
      chroma950: 0.12,
      lightness50: 0.985,
      lightness950: 0.025,
      density: 11,
      targetColorSpace: 'srgb',
      generationVersion: 2,
    });

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(createSharedPalette).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByDisplayValue('https://colorbound.test/palette/palette-2')).toBeInTheDocument();
  });

  it('shares a collection using canonical fields only', async () => {
    createSharedCollection.mockResolvedValue({ id: 'collection-1', type: 'collection', count: 1 });

    render(
      <ShareCollectionButton
        name="Brand Colors"
        palettes={[{
          name: 'Ocean',
          hue: 210,
          chroma50: 0.12,
          chroma: 0.12,
          chroma950: 0.12,
          lightness50: 0.985,
          lightness950: 0.025,
          density: 11,
        }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /share/i }));

    await waitFor(() => {
      expect(createSharedCollection).toHaveBeenCalledWith([{
        name: 'Ocean',
        hue: 210,
        chroma50: 0.12,
        chroma: 0.12,
        chroma950: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
        density: 11,
        targetColorSpace: 'srgb',
        generationVersion: 2,
      }], 'Brand Colors');
    });
    expect(await screen.findByDisplayValue('https://colorbound.test/collection/collection-1')).toBeInTheDocument();
  });
});

import React, { createContext, useContext } from 'react';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ShareCollectionButton,
  SharePaletteButton,
} from './share-actions';

const PopoverContext = createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
} | null>(null);

vi.mock('./share-runtime', () => ({
  PaletteShareRuntime: () => <div>Palette share runtime</div>,
  CollectionShareRuntime: () => <div>Collection share runtime</div>,
}));

vi.mock('../ui/popover', () => ({
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

vi.mock('../ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button type="button" {...props}>{children}</button>,
}));

describe('share action lazy boundaries', () => {
  it('defers the palette share runtime until the trigger is clicked', async () => {
    render(
      <SharePaletteButton
        palette={{
          name: 'Ocean',
          hue: 210,
          chroma: 0.12,
          lightness50: 0.985,
          lightness950: 0.025,
        }}
      />,
    );

    expect(screen.queryByText('Palette share runtime')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Share palette'));

    expect(await screen.findByText('Palette share runtime')).toBeInTheDocument();
  });

  it('loads the controlled palette share runtime on first open without a second click', async () => {
    render(
      <SharePaletteButton
        hideTrigger
        open
        onOpenChange={vi.fn()}
        palette={{
          name: 'Ocean',
          hue: 210,
          chroma: 0.12,
          lightness50: 0.985,
          lightness950: 0.025,
        }}
      />,
    );

    expect(await screen.findByText('Palette share runtime')).toBeInTheDocument();
  });

  it('defers the collection share runtime until the trigger is clicked', async () => {
    render(
      <ShareCollectionButton
        name="Brand Colors"
        palettes={[{
          name: 'Ocean',
          hue: 210,
          chroma: 0.12,
          lightness50: 0.985,
          lightness950: 0.025,
        }]}
      />,
    );

    expect(screen.queryByText('Collection share runtime')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /share project/i }));

    expect(await screen.findByText('Collection share runtime')).toBeInTheDocument();
  });
});

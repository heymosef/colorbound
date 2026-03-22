import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PaletteSwitcher } from './palette-switcher';
import type { Palette, ColorToken } from '../lib/color-utils';
import { SCALE_STEPS } from '../lib/color-utils';

// ─── Helper: build a minimal Palette for testing ───

function makeToken(step: number, hex = '#aabbcc'): ColorToken {
  return {
    step,
    oklch: { l: 0.5, c: 0.1, h: 200 },
    oklchMapped: { l: 0.5, c: 0.1, h: 200 },
    css: 'oklch(0.500 0.100 200.0)',
    rgb: 'rgb(100,150,200)',
    hex,
    p3Css: 'color(display-p3 0.3922 0.5882 0.7843)',
    gamut: 'srgb' as const,
  };
}

function makePalette(overrides: Partial<Palette> = {}): Palette {
  return {
    id: overrides.id ?? 'pal-1',
    name: overrides.name ?? 'Blue',
    tokens: overrides.tokens ?? SCALE_STEPS.map((s) => makeToken(s)),
    hue: 220,
    chroma: 0.18,
    lightness50: 0.985,
    lightness950: 0.025,
    ...overrides,
  };
}

// ─── Component tests ───

function defaultProps(overrides: Record<string, unknown> = {}) {
  return {
    collection: [] as Palette[],
    currentPalette: makePalette(),
    activePaletteId: null as string | null,
    isDirty: false,
    currentName: 'Blue',
    onSelectPalette: vi.fn(),
    onSaveAndSwitch: vi.fn(),
    onSaveNewAndSwitch: vi.fn(),
    onNewPalette: vi.fn(),
    onNavigateToCollection: vi.fn(),
    onAfterSwitch: vi.fn(),
    ...overrides,
  };
}

describe('PaletteSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the trigger with current palette name', () => {
    render(<PaletteSwitcher {...defaultProps({ currentName: 'Crimson' })} />);
    expect(screen.getByText('Crimson')).toBeInTheDocument();
  });

  it('shows "Untitled" when currentName is empty', () => {
    render(<PaletteSwitcher {...defaultProps({ currentName: '' })} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('has correct aria-label on trigger', () => {
    render(<PaletteSwitcher {...defaultProps({ currentName: 'Teal' })} />);
    expect(
      screen.getByLabelText('Switch palette. Currently editing: Teal')
    ).toBeInTheDocument();
  });

  it('opens popover on trigger click and shows footer actions', () => {
    render(<PaletteSwitcher {...defaultProps()} />);
    const trigger = screen.getByLabelText(/Switch palette/);
    fireEvent.click(trigger);
    expect(screen.getByText('New palette')).toBeInTheDocument();
    expect(screen.getByText('View all palettes')).toBeInTheDocument();
  });

  it('shows "No saved palettes yet" when collection is empty', () => {
    render(<PaletteSwitcher {...defaultProps({ collection: [] })} />);
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    expect(screen.getByText('No saved palettes yet')).toBeInTheDocument();
  });

  it('lists saved palettes with names', () => {
    const collection = [
      makePalette({ id: 'a', name: 'Red' }),
      makePalette({ id: 'b', name: 'Green' }),
    ];
    render(<PaletteSwitcher {...defaultProps({ collection })} />);
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
  });

  it('marks the active palette with aria-selected', () => {
    const collection = [
      makePalette({ id: 'a', name: 'Red' }),
      makePalette({ id: 'b', name: 'Green' }),
    ];
    render(
      <PaletteSwitcher
        {...defaultProps({ collection, activePaletteId: 'a' })}
      />
    );
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    const activeRow = screen.getByRole('option', { name: /Red/ });
    expect(activeRow).toHaveAttribute('aria-selected', 'true');
    const inactiveRow = screen.getByRole('option', { name: /Green/ });
    expect(inactiveRow).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onSelectPalette for a clean switch', () => {
    const onSelectPalette = vi.fn();
    const collection = [
      makePalette({ id: 'a', name: 'Red' }),
      makePalette({ id: 'b', name: 'Green' }),
    ];
    render(
      <PaletteSwitcher
        {...defaultProps({
          collection,
          activePaletteId: 'a',
          isDirty: false,
          onSelectPalette,
        })}
      />
    );
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    fireEvent.click(screen.getByRole('option', { name: /Green/ }));
    expect(onSelectPalette).toHaveBeenCalledWith('b');
  });

  it('shows dirty confirmation instead of switching immediately when isDirty', () => {
    const onSelectPalette = vi.fn();
    const collection = [
      makePalette({ id: 'a', name: 'Red' }),
      makePalette({ id: 'b', name: 'Green' }),
    ];
    render(
      <PaletteSwitcher
        {...defaultProps({
          collection,
          activePaletteId: 'a',
          isDirty: true,
          currentName: 'Red',
          onSelectPalette,
        })}
      />
    );
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    fireEvent.click(screen.getByRole('option', { name: /Green/ }));
    // Should NOT have switched yet
    expect(onSelectPalette).not.toHaveBeenCalled();
    // Should show confirmation
    expect(screen.getByText(/Unsaved changes to "Red"/)).toBeInTheDocument();
    expect(screen.getByText('Update & Switch')).toBeInTheDocument();
    expect(screen.getByText('Discard')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('dirty confirmation: Save & Switch calls onSaveAndSwitch', () => {
    const onSaveAndSwitch = vi.fn(() => true);
    const collection = [
      makePalette({ id: 'a', name: 'Red' }),
      makePalette({ id: 'b', name: 'Green' }),
    ];
    render(
      <PaletteSwitcher
        {...defaultProps({
          collection,
          activePaletteId: 'a',
          isDirty: true,
          currentName: 'Red',
          onSaveAndSwitch,
        })}
      />
    );
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    fireEvent.click(screen.getByRole('option', { name: /Green/ }));
    fireEvent.click(screen.getByText('Update & Switch'));
    expect(onSaveAndSwitch).toHaveBeenCalledWith('b');
  });

  it('keeps the confirmation open when Save & Switch fails', () => {
    const onSaveAndSwitch = vi.fn(() => false);
    const collection = [
      makePalette({ id: 'a', name: 'Red' }),
      makePalette({ id: 'b', name: 'Green' }),
    ];
    render(
      <PaletteSwitcher
        {...defaultProps({
          collection,
          activePaletteId: 'a',
          isDirty: true,
          currentName: 'Red',
          onSaveAndSwitch,
        })}
      />,
    );

    fireEvent.click(screen.getByLabelText(/Switch palette/));
    fireEvent.click(screen.getByRole('option', { name: /Green/ }));
    fireEvent.click(screen.getByText('Update & Switch'));

    expect(onSaveAndSwitch).toHaveBeenCalledWith('b');
    expect(screen.getByText(/Unsaved changes to "Red"/)).toBeInTheDocument();
  });

  it('dirty confirmation: Discard calls onSelectPalette directly', () => {
    const onSelectPalette = vi.fn();
    const collection = [
      makePalette({ id: 'a', name: 'Red' }),
      makePalette({ id: 'b', name: 'Green' }),
    ];
    render(
      <PaletteSwitcher
        {...defaultProps({
          collection,
          activePaletteId: 'a',
          isDirty: true,
          currentName: 'Red',
          onSelectPalette,
        })}
      />
    );
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    fireEvent.click(screen.getByRole('option', { name: /Green/ }));
    fireEvent.click(screen.getByText('Discard'));
    expect(onSelectPalette).toHaveBeenCalledWith('b');
  });

  it('dirty confirmation: Cancel hides the confirmation', () => {
    const collection = [
      makePalette({ id: 'a', name: 'Red' }),
      makePalette({ id: 'b', name: 'Green' }),
    ];
    render(
      <PaletteSwitcher
        {...defaultProps({
          collection,
          activePaletteId: 'a',
          isDirty: true,
          currentName: 'Red',
        })}
      />
    );
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    fireEvent.click(screen.getByRole('option', { name: /Green/ }));
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText(/Unsaved changes/)).not.toBeInTheDocument();
  });

  it('unsaved palette uses "Save & Switch" label and calls onSaveNewAndSwitch', () => {
    const onSaveNewAndSwitch = vi.fn();
    const collection = [
      makePalette({ id: 'b', name: 'Green' }),
    ];
    render(
      <PaletteSwitcher
        {...defaultProps({
          collection,
          activePaletteId: null, // unsaved
          isDirty: false,
          currentName: 'Untitled',
          onSaveNewAndSwitch,
        })}
      />
    );
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    fireEvent.click(screen.getByRole('option', { name: /Green/ }));
    // Unsaved triggers confirmation
    expect(screen.getByText(/\"Untitled\" is unsaved/)).toBeInTheDocument();
    expect(screen.getByText('Save & Switch')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Save & Switch'));
    expect(onSaveNewAndSwitch).toHaveBeenCalledWith('b');
  });

  it('calls onNewPalette when "New Palette" is clicked', () => {
    const onNewPalette = vi.fn();
    render(<PaletteSwitcher {...defaultProps({ onNewPalette })} />);
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    fireEvent.click(screen.getByText('New palette'));
    expect(onNewPalette).toHaveBeenCalledTimes(1);
  });

  it('calls onNavigateToCollection when "View Collection" is clicked', () => {
    const onNavigateToCollection = vi.fn();
    render(
      <PaletteSwitcher {...defaultProps({ onNavigateToCollection })} />
    );
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    fireEvent.click(screen.getByText('View all palettes'));
    expect(onNavigateToCollection).toHaveBeenCalledTimes(1);
  });

  it('calls onAfterSwitch after a clean switch', () => {
    const onAfterSwitch = vi.fn();
    const collection = [
      makePalette({ id: 'a', name: 'Red' }),
      makePalette({ id: 'b', name: 'Green' }),
    ];
    render(
      <PaletteSwitcher
        {...defaultProps({
          collection,
          activePaletteId: 'a',
          isDirty: false,
          onAfterSwitch,
        })}
      />
    );
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    fireEvent.click(screen.getByRole('option', { name: /Green/ }));
    expect(onAfterSwitch).toHaveBeenCalledTimes(1);
  });

  it('does not show filter input when collection has 5 or fewer palettes', () => {
    const collection = Array.from({ length: 5 }, (_, i) =>
      makePalette({ id: `p${i}`, name: `Palette ${i}` })
    );
    render(<PaletteSwitcher {...defaultProps({ collection })} />);
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    expect(screen.queryByLabelText('Filter palettes')).not.toBeInTheDocument();
  });

  it('shows filter input when collection has more than 5 palettes', () => {
    const collection = Array.from({ length: 6 }, (_, i) =>
      makePalette({ id: `p${i}`, name: `Palette ${i}` })
    );
    render(<PaletteSwitcher {...defaultProps({ collection })} />);
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    expect(screen.getByLabelText('Filter palettes')).toBeInTheDocument();
  });

  it('filters palettes by name', () => {
    const collection = [
      makePalette({ id: 'a', name: 'Ocean Blue' }),
      makePalette({ id: 'b', name: 'Forest Green' }),
      makePalette({ id: 'c', name: 'Crimson Red' }),
      makePalette({ id: 'd', name: 'Sky Blue' }),
      makePalette({ id: 'e', name: 'Mint Green' }),
      makePalette({ id: 'f', name: 'Amber' }),
    ];
    render(<PaletteSwitcher {...defaultProps({ collection })} />);
    fireEvent.click(screen.getByLabelText(/Switch palette/));

    const filterInput = screen.getByLabelText('Filter palettes');
    fireEvent.change(filterInput, { target: { value: 'Blue' } });

    // Should show Ocean Blue and Sky Blue
    expect(screen.getByText('Ocean Blue')).toBeInTheDocument();
    expect(screen.getByText('Sky Blue')).toBeInTheDocument();
    // Should NOT show other palettes
    expect(screen.queryByText('Forest Green')).not.toBeInTheDocument();
    expect(screen.queryByText('Crimson Red')).not.toBeInTheDocument();
  });

  it('shows empty filter state when no palettes match', () => {
    const collection = Array.from({ length: 6 }, (_, i) =>
      makePalette({ id: `p${i}`, name: `Palette ${i}` })
    );
    render(<PaletteSwitcher {...defaultProps({ collection })} />);
    fireEvent.click(screen.getByLabelText(/Switch palette/));

    const filterInput = screen.getByLabelText('Filter palettes');
    fireEvent.change(filterInput, { target: { value: 'zzzzz' } });

    expect(screen.getByText(/No palettes match/)).toBeInTheDocument();
  });

  it('shows dirty dot indicator when isDirty and activePaletteId is set', () => {
    render(
      <PaletteSwitcher
        {...defaultProps({
          activePaletteId: 'pal-1',
          isDirty: true,
        })}
      />
    );
    const dot = document.querySelector('[title="Unsaved changes"]');
    expect(dot).toBeInTheDocument();
  });

  it('does not show dirty dot when not dirty', () => {
    render(
      <PaletteSwitcher
        {...defaultProps({
          activePaletteId: 'pal-1',
          isDirty: false,
        })}
      />
    );
    const dot = document.querySelector('[title="Unsaved changes"]');
    expect(dot).not.toBeInTheDocument();
  });

  it('displays density with tabular-nums', () => {
    render(
      <PaletteSwitcher
        {...defaultProps({
          collection: [makePalette()],
          activePaletteId: 'pal-1',
        })}
      />
    );
    fireEvent.click(screen.getByLabelText(/Switch palette/));
    const densityLabel = screen.getByText('Density 11');
    expect(densityLabel.className).toContain('tabular-nums');
  });
});

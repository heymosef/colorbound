import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DuplicateDialog } from './duplicate-dialog';

vi.mock('../lib/palette-context', () => ({
  usePaletteContext: () => ({
    activeCollection: {
      id: 'collection-1',
      name: 'My Collection',
      palettes: [
        { id: 'palette-1', name: 'Ocean' },
      ],
    },
  }),
}));

describe('DuplicateDialog', () => {
  it('shows an inline error for duplicate palette names and keeps the dialog open', () => {
    const onDuplicate = vi.fn(() => ({ ok: true }));

    render(
      <DuplicateDialog
        currentName="Ocean"
        onDuplicate={onDuplicate}
        open
        onOpenChange={vi.fn()}
        hideTrigger
      />,
    );

    const input = screen.getByLabelText('Palette Name');
    fireEvent.change(input, { target: { value: '  ocean  ' } });

    expect(screen.getByText('A palette with this name already exists in this collection.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    expect(onDuplicate).not.toHaveBeenCalled();
  });
});

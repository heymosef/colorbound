/**
 * PopoverMenuItem — shared button component for Popover-based menus.
 *
 * Used in both palette options menus (collections-page) and
 * overflow/more menus (palette-workspace) to keep styling consistent.
 */
import type React from 'react';
import React from 'react';
import { cn } from './ui/utils';

export function PopoverMenuItem({
  children,
  onClick,
  className,
  disabled,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[12px] transition-colors outline-none disabled:opacity-50 disabled:pointer-events-none',
        variant === 'destructive'
          ? 'text-destructive dark:text-destructive-foreground cursor-pointer hover:bg-destructive/10 dark:hover:bg-destructive-foreground/10 focus-visible:bg-destructive/10 dark:focus-visible:bg-destructive-foreground/10'
          : !disabled && 'cursor-pointer hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/**
 * PopoverSelect — a Popover-based drop-in replacement for Radix Select.
 *
 * Radix Select relies on portals, which can be awkward in embedded surfaces
 * where popover content needs to stay within the current DOM subtree.
 * This component provides the same API surface (value, onValueChange, items)
 * without portals or internal content-cloning.
 */

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Check, ChevronDown } from 'lucide-react';

export interface PopoverSelectItem {
  value: string;
  label: string;
  /** Optional leading icon / swatch */
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface PopoverSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: PopoverSelectItem[];
  /** Passed to the trigger's aria-label */
  ariaLabel?: string;
  /** Extra classes on the trigger button */
  triggerClassName?: string;
  /** Width of the popover content — defaults to trigger width */
  contentClassName?: string;
  placeholder?: string;
}

export function PopoverSelect({
  value,
  onValueChange,
  items,
  ariaLabel,
  triggerClassName = '',
  contentClassName = '',
  placeholder = 'Select…',
}: PopoverSelectProps) {
  const [open, setOpen] = useState(false);

  const selected = items.find((i) => i.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer ${triggerClassName}`}
        aria-label={ariaLabel}
      >
        <span className="flex items-center gap-2 min-w-0 line-clamp-1">
          {selected?.icon}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <ChevronDown className="size-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={`w-[var(--radix-popover-trigger-width)] min-w-[8rem] p-1 max-h-[240px] overflow-y-auto ${contentClassName}`}
      >
        {items.map((item) => {
          const isSelected = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              disabled={item.disabled}
              className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none focus-visible:bg-accent disabled:opacity-50 disabled:pointer-events-none ${
                isSelected
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground cursor-pointer'
              }`}
              onClick={() => {
                if (!item.disabled) {
                  onValueChange(item.value);
                  setOpen(false);
                }
              }}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
              {isSelected && <Check className="size-4 ml-auto opacity-60 shrink-0" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

import { Moon, Rows2, Sun } from 'lucide-react';
import { track } from '../lib/analytics';

export type ViewMode = 'light' | 'dark' | 'both';

export function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  const handleChange = (v: ViewMode) => {
    onChange(v);
    track('palette_view_mode_changed', { mode: v });
  };
  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-muted p-0.5 gap-0.5"
      role="radiogroup"
      aria-label="Palette view mode"
    >
      <button
        role="radio"
        aria-checked={value === 'light'}
        onClick={() => handleChange('light')}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
          value === 'light'
            ? 'bg-background dark:bg-muted-foreground/15 shadow-sm dark:shadow-none text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Sun className="w-3 h-3 hidden sm:inline" />
        Light
      </button>
      <button
        role="radio"
        aria-checked={value === 'dark'}
        onClick={() => handleChange('dark')}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
          value === 'dark'
            ? 'bg-background dark:bg-muted-foreground/15 shadow-sm dark:shadow-none text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Moon className="w-3 h-3 hidden sm:inline" />
        Dark
      </button>
      <button
        role="radio"
        aria-checked={value === 'both'}
        onClick={() => handleChange('both')}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
          value === 'both'
            ? 'bg-background dark:bg-muted-foreground/15 shadow-sm dark:shadow-none text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Rows2 className="w-3 h-3 hidden sm:inline" />
        Both
      </button>
    </div>
  );
}

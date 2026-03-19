import React from 'react';
import { useRouteError, Link } from 'react-router';
import { Button } from './ui/button';
import { AlertCircle, Palette as PaletteIcon } from 'lucide-react';

export function ShareErrorBoundary() {
  const error = useRouteError() as Error | { message?: string; status?: number } | null;

  const message =
    error && typeof error === 'object' && 'message' in error
      ? error.message
      : 'This link may have expired or is invalid. Shared links expire after 30 days.';

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm px-4">
        <div className="w-14 h-14 rounded-full bg-destructive/10 dark:bg-destructive-foreground/10 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7 text-destructive dark:text-destructive-foreground" />
        </div>
        <div>
          <h2 className="text-[16px] mb-1">Not found</h2>
          <p className="text-[13px] text-muted-foreground">{message}</p>
        </div>
        <Link to="/">
          <Button className="h-9 text-[13px]">
            <PaletteIcon className="w-4 h-4 mr-1.5" />
            Create Your Own
          </Button>
        </Link>
      </div>
    </div>
  );
}

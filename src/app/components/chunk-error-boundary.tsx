import { useRouteError } from 'react-router';

const RELOAD_KEY = 'chunk-error-reloaded';

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('failed to fetch')
  );
}

export function ChunkErrorBoundary() {
  const error = useRouteError();

  if (isChunkLoadError(error)) {
    const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
    if (!alreadyReloaded) {
      sessionStorage.setItem(RELOAD_KEY, '1');
      window.location.reload();
      return null;
    }
  }

  throw error;
}

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('failed to fetch')
  );
}

export function lazyImport<T>(importFn: () => Promise<T>): () => Promise<T> {
  return () =>
    importFn().catch((error) => {
      if (isChunkLoadError(error)) {
        return new Promise<T>((resolve) => setTimeout(resolve, 1000)).then(importFn);
      }
      throw error;
    });
}

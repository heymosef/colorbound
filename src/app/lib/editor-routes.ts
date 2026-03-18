export type EditorNavigationReason = 'move' | 'copy' | 'rename' | 'firstRun';
export type EditorNavigationMode = 'push' | 'replace';

export function buildCollectionPath(collectionSlug: string): string {
  return `/${collectionSlug}`;
}

export function buildCollectionDraftEditorPath(collectionSlug: string): string {
  return `/${collectionSlug}/edit`;
}

export function buildCollectionSavedEditorPath(collectionSlug: string, paletteId: string): string {
  return `/${collectionSlug}/edit/${paletteId}`;
}

export function buildLegacyEditorPath(paletteId?: string | null): string {
  return paletteId ? `/edit/${paletteId}` : '/edit';
}

export function getEditorNavigationMode(reason: EditorNavigationReason): EditorNavigationMode {
  switch (reason) {
    case 'copy':
      return 'push';
    case 'move':
    case 'rename':
    case 'firstRun':
    default:
      return 'replace';
  }
}

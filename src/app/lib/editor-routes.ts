import { matchPath } from 'react-router';

export type EditorNavigationReason = 'move' | 'copy' | 'rename' | 'firstRun';
export type EditorNavigationMode = 'push' | 'replace';

const EDITOR_ROUTE_PATTERNS = [
  '/edit',
  '/edit/:paletteId',
  '/:collectionSlug/edit',
  '/:collectionSlug/edit/:paletteId',
] as const;

export function buildCollectionPath(collectionSlug: string): string {
  return `/${collectionSlug}`;
}

export function buildCollectionDraftEditorPath(collectionSlug: string): string {
  return `/${collectionSlug}/edit`;
}

export function buildCollectionSavedEditorPath(collectionSlug: string, paletteId: string): string {
  return `/${collectionSlug}/edit/${paletteId}`;
}

export function isEditorRoute(pathname: string): boolean {
  return EDITOR_ROUTE_PATTERNS.some((pattern) =>
    matchPath({ path: pattern, end: true }, pathname),
  );
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

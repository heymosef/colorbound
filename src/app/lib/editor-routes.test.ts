import { describe, expect, it } from 'vitest';
import {
  buildCollectionDraftEditorPath,
  buildCollectionPath,
  buildCollectionSavedEditorPath,
  buildLegacyEditorPath,
  getEditorNavigationMode,
} from './editor-routes';

describe('editor-routes', () => {
  it('builds collection and editor paths', () => {
    expect(buildCollectionPath('marketing')).toBe('/marketing');
    expect(buildCollectionDraftEditorPath('marketing')).toBe('/marketing/edit');
    expect(buildCollectionSavedEditorPath('marketing', 'palette-1')).toBe('/marketing/edit/palette-1');
    expect(buildLegacyEditorPath('palette-1')).toBe('/edit/palette-1');
    expect(buildLegacyEditorPath()).toBe('/edit');
  });

  it('returns replace navigation for rename, first-run, and move', () => {
    expect(getEditorNavigationMode('rename')).toBe('replace');
    expect(getEditorNavigationMode('firstRun')).toBe('replace');
    expect(getEditorNavigationMode('move')).toBe('replace');
  });

  it('returns push navigation for copy', () => {
    expect(getEditorNavigationMode('copy')).toBe('push');
  });
});

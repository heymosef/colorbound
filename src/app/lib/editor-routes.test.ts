import { describe, expect, it } from 'vitest';
import {
  buildCollectionDraftEditorPath,
  buildCollectionPath,
  buildCollectionSavedEditorPath,
  buildLegacyEditorPath,
  getEditorNavigationMode,
  isEditorRoute,
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

  it('recognizes all editor route variants', () => {
    expect(isEditorRoute('/edit')).toBe(true);
    expect(isEditorRoute('/edit/abc')).toBe(true);
    expect(isEditorRoute('/marketing/edit')).toBe(true);
    expect(isEditorRoute('/marketing/edit/abc')).toBe(true);
  });

  it('does not match non-editor routes', () => {
    expect(isEditorRoute('/')).toBe(false);
    expect(isEditorRoute('/marketing')).toBe(false);
    expect(isEditorRoute('/p/foo')).toBe(false);
    expect(isEditorRoute('/c/foo')).toBe(false);
  });
});

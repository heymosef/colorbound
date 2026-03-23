import { loadState } from './local-storage';

/**
 * Determines whether the current visitor is a first-time user.
 *
 * A user is considered first-time when:
 * - No persisted state exists in localStorage, OR
 * - State exists but hasCompletedFirstRun is false AND no collection has any saved palettes
 *
 * The hasCompletedFirstRun flag acts as a one-way latch: once a user has created their
 * first draft palette, they are never re-routed through the first-time flow — even if
 * they later delete all their palettes.
 *
 * On any error reading state, falls back to false (treat as returning user) so the app
 * is never blocked.
 */
export function isFirstTimeUser(): boolean {
  try {
    const state = loadState();
    if (state === null) return true;
    if (state.hasCompletedFirstRun) return false;
    const totalPalettes = state.collections.reduce((sum, c) => sum + c.palettes.length, 0);
    return totalPalettes === 0;
  } catch {
    return false;
  }
}

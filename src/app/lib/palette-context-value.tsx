// Isolated context creation — this file has zero app-level dependencies so it
// is never re-evaluated by HMR, keeping the React context reference stable.
import { createContext } from 'react';
import type { CollectionsContextValue, PaletteContextValue } from './palette-context-types';

export const PaletteContext = createContext<PaletteContextValue | null>(null);

// Separate context for collection-level state.
// Components that only need collection data (e.g. collections list, switcher)
// subscribe here and avoid re-rendering on palette editor changes (slider drags).
export const CollectionsContext = createContext<CollectionsContextValue | null>(null);

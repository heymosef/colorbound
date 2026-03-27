import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import type { Collection } from '../lib/collection-types';
import { Outlet, useLocation, useNavigate, Link } from 'react-router';
import { initPostHog, track, trackPageview } from '../lib/analytics';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from './ui/breadcrumb';
import { Sun, Moon, Monitor, ChevronDown, Plus, Check, LayoutGrid, CopyPlus } from 'lucide-react';
import { usePaletteContext } from '../lib/palette-context';
import { PaletteSwitcher } from './palette-switcher';
import { useBreakpoint } from '../lib/use-breakpoint';
import { Separator } from './ui/separator';
import { CollectionIcon } from './collection-icon';
import { getCollectionSwitcherViewportClass } from './switcher-viewport';
import {
  buildCollectionDraftEditorPath,
  buildCollectionPath,
  buildCollectionSavedEditorPath,
  getEditorNavigationMode,
  isEditorRoute,
} from '../lib/editor-routes';
import type { Palette } from '../lib/color-utils';
import { MoveToCollectionDialog } from './move-to-collection-dialog';

type AppTheme = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{ theme: AppTheme; setTheme: (t: AppTheme) => void }>({
  theme: 'system',
  setTheme: () => {},
});

export function useThemeContext() {
  return useContext(ThemeContext);
}

function applyTheme(theme: AppTheme) {
  try {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  } catch {
    // matchMedia or classList not available
  }
}

function useTheme() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('app-theme') as AppTheme | null;
      return saved ?? 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('app-theme', theme);
    } catch {
      // localStorage not available
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return { theme, setTheme };
}

const THEME_LABELS: Record<AppTheme, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System theme',
};

export function ThemeSwitcher({
  theme,
  setTheme,
}: {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
}) {
  const [open, setOpen] = useState(false);

  const icon =
    theme === 'dark' ? (
      <Moon className="w-4 h-4" />
    ) : theme === 'light' ? (
      <Sun className="w-4 h-4" />
    ) : (
      <Monitor className="w-4 h-4" />
    );

  const options: { value: AppTheme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
    { value: 'system', label: 'System', icon: <Monitor className="w-3.5 h-3.5" /> },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex items-center gap-1 rounded-md h-7 px-2 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] max-[359px]:hidden"
        aria-label={`Theme: ${THEME_LABELS[theme]}. Click to change.`}
      >
        {icon}
        <ChevronDown className="w-3 h-3 opacity-50 max-sm:hidden" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36 p-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[12px] transition-colors cursor-pointer outline-none focus-visible:bg-accent ${
              theme === opt.value
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
            onClick={() => {
              setTheme(opt.value);
              setOpen(false);
            }}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * CollectionSwitcher — Popover-based switcher for quick collection navigation.
 * Mirrors the PaletteSwitcher pattern: trigger shows current collection name + chevron,
 * popover lists all collections with a "New collection" action at the bottom.
 */
export function CollectionSwitcher({
  collections,
  activeCollectionId,
  collectionName,
  onSelect,
  onCreateNew,
  onViewAll,
  onDuplicate,
  showNameOnMobile = false,
}: {
  collections: Collection[];
  activeCollectionId: string | null;
  collectionName: string;
  onSelect: (slug: string, id: string) => void;
  onCreateNew: () => void;
  onViewAll?: () => void;
  onDuplicate?: (id: string) => void;
  showNameOnMobile?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex items-center gap-2 rounded-md h-8 px-2 text-left transition-colors hover:bg-accent cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        aria-label={`Project: ${collectionName}. Click to switch.`}
      >
        <CollectionIcon className="w-3.5 h-3.5 shrink-0" />
        <span className={`${showNameOnMobile ? 'inline' : 'hidden sm:inline'} text-[13px] font-medium truncate max-w-[160px] sm:max-w-[200px]`}>{collectionName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 ${showNameOnMobile ? 'block' : 'hidden sm:block'}`} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0 flex flex-col overflow-hidden">
        <div className={`p-1 ${getCollectionSwitcherViewportClass()} overflow-y-auto`}>
          {collections.map((col) => {
            const isActive = col.id === activeCollectionId;
            return (
              <button
                key={col.id}
                type="button"
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors outline-none select-none focus-visible:ring-ring/50 focus-visible:ring-[3px] ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50 hover:text-accent-foreground cursor-pointer'
                }`}
                onClick={() => {
                  onSelect(col.slug, col.id);
                  setOpen(false);
                }}
              >
                <CollectionIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] truncate">{col.name}</span>
                    {isActive && <Check className="w-3 h-3 shrink-0 opacity-60" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {col.palettes.length} {col.palettes.length === 1 ? 'palette' : 'palettes'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <Separator className="shrink-0" />
        <div className="p-1 shrink-0">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[12px] transition-colors cursor-pointer outline-none select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent"
            onClick={() => {
              onCreateNew();
              setOpen(false);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            New project
          </button>
          {onViewAll && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[12px] text-muted-foreground transition-colors outline-none select-none hover:bg-accent hover:text-accent-foreground cursor-pointer focus-visible:bg-accent"
              onClick={() => {
                onViewAll();
                setOpen(false);
              }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              View all projects
            </button>
          )}
        </div>
        {onDuplicate && activeCollectionId && (
          <>
            <Separator className="shrink-0" />
            <div className="p-1 shrink-0">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[12px] transition-colors cursor-pointer outline-none select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent"
                onClick={() => {
                  onDuplicate(activeCollectionId);
                  setOpen(false);
                }}
              >
                <CopyPlus className="w-3.5 h-3.5" />
                Duplicate project
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * HeaderBreadcrumb — Navigation-only breadcrumb, collection-aware.
 *
 * Collections list (`/`):     Collections
 * Collection detail:          Collections  /  {CollectionName} (N)
 * Edit page:                  Collections  /  {CollectionName} ▾  /  ● PaletteName ▾
 * Shared pages:               (no breadcrumb — those pages have their own back link)
 *
 * The palette segment hosts the shared palette menu on desktop/tablet
 * edit pages so the switcher and actions live in the top nav.
 */
function HeaderBreadcrumb() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    collections,
    collection,
    config,
    currentPalette,
    activePaletteId,
    activeCollection,
    activeCollectionId,
    isDirty,
    handleDuplicatePalette,
    handleRemove,
    handleCreateCollection,
    handleSelectCollection,
    handleDuplicateCollection,
  } = usePaletteContext();
  const [pendingCollectionAction, setPendingCollectionAction] = useState<{
    mode: 'move' | 'copy';
    sourceCollectionId: string;
    paletteId: string;
    paletteName: string;
  } | null>(null);

  const pathname = location.pathname;
  const isEdit = isEditorRoute(pathname);
  const isShared = pathname.startsWith('/p/') || pathname.startsWith('/c/');
  const isCollectionsList = pathname === '/';
  const collectionSlug = activeCollection?.slug ?? '';
  const collectionName = activeCollection?.name ?? 'Project';

  // Determine if we're on a collection detail page (not edit, not shared, not root)
  const isCollectionDetail = !isEdit && !isShared && !isCollectionsList;

  const handleSelectPalette = useCallback(
    (id: string) => {
      if (!collectionSlug) return;
      navigate(buildCollectionSavedEditorPath(collectionSlug, id));
    },
    [collectionSlug, navigate],
  );

  const handleCreateNewPalette = useCallback(() => {
    if (!activeCollection) return;
    navigate(buildCollectionDraftEditorPath(activeCollection.slug), {
      state: { createDraft: true },
    });
  }, [activeCollection, navigate]);

  const handleNavigateToCollection = useCallback(() => {
    navigate(collectionSlug ? buildCollectionPath(collectionSlug) : '/');
  }, [collectionSlug, navigate]);

  const handleDuplicateAndNavigate = useCallback((name: string) => {
    const result = handleDuplicatePalette(name);
    if (result.ok && activeCollection) {
      navigate(buildCollectionSavedEditorPath(activeCollection.slug, result.paletteId), {
        replace: getEditorNavigationMode('copy') === 'replace',
      });
    }
    return result;
  }, [activeCollection, handleDuplicatePalette, navigate]);

  const handleDeletePalette = useCallback(() => {
    if (!activePaletteId || !activeCollection) return;
    handleRemove(activePaletteId);
    navigate(buildCollectionPath(activeCollection.slug));
  }, [activeCollection, activePaletteId, handleRemove, navigate]);

  const handleCollectionAction = useCallback((mode: 'move' | 'copy', palette: Palette) => {
    if (!activeCollectionId) return;

    setPendingCollectionAction({
      mode,
      sourceCollectionId: activeCollectionId,
      paletteId: activePaletteId ?? palette.id,
      paletteName: palette.name,
    });
  }, [activeCollectionId, activePaletteId]);

  const handleDuplicateAndNavigateCollection = useCallback((collectionId: string) => {
    const result = handleDuplicateCollection(collectionId);
    if (result.ok) {
      navigate(buildCollectionPath(result.slug));
    }
  }, [handleDuplicateCollection, navigate]);

  // Shared pages: no header breadcrumb
  if (isShared) return null;

  // Collections list (home) page: no breadcrumb needed
  if (isCollectionsList) return null;

  // Collection detail page
  if (isCollectionDetail) {
    return (
      <>
        <div className="text-muted-foreground/30 select-none text-[13px]" aria-hidden="true">/</div>
        <Breadcrumb>
          <BreadcrumbList className="text-[13px] gap-1 sm:gap-1.5 flex-nowrap">
            <BreadcrumbItem>
              <CollectionSwitcher
                collections={collections}
                activeCollectionId={activeCollection?.id ?? null}
                collectionName={collectionName}
                onSelect={(slug, id) => {
                  handleSelectCollection(id);
                  navigate(buildCollectionPath(slug));
                }}
                onCreateNew={() => {
                  const { slug } = handleCreateCollection();
                  navigate(buildCollectionPath(slug));
                }}
                onViewAll={() => navigate('/')}
                onDuplicate={handleDuplicateAndNavigateCollection}
                showNameOnMobile
              />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </>
    );
  }

  // ─── Edit page breadcrumb ───
  // Desktop/tablet: Collections  /  {CollectionName} ▾  /  ● PaletteName ▾
  // Mobile: hidden (mobile top bar in EditPalettePage handles this)
  return (
    <>
      <div className="text-muted-foreground/30 select-none text-[13px]" aria-hidden="true">/</div>
      <Breadcrumb>
        <BreadcrumbList className="text-[13px] gap-1 sm:gap-1.5 flex-nowrap">
          {/* Collection switcher — icon-only on mobile, full on desktop */}
          <BreadcrumbItem className="inline-flex">
            <CollectionSwitcher
              collections={collections}
              activeCollectionId={activeCollection?.id ?? null}
              collectionName={collectionName}
              onSelect={(slug) => {
                navigate(buildCollectionPath(slug));
              }}
              onCreateNew={() => {
                const { slug } = handleCreateCollection();
                navigate(buildCollectionPath(slug));
              }}
              onViewAll={() => navigate('/')}
              onDuplicate={handleDuplicateAndNavigateCollection}
            />
          </BreadcrumbItem>

          <li className="block text-muted-foreground/30 select-none text-[13px]" role="presentation" aria-hidden="true">/</li>

          {/* Palette menu lives in the top nav on editor routes */}
          <BreadcrumbItem>
            <PaletteSwitcher
              variant="compact"
              compactSize="sm"
              collection={collection}
              currentPalette={currentPalette}
              activePaletteId={activePaletteId}
              isDirty={isDirty}
              currentName={config.name}
              onSelectPalette={handleSelectPalette}
              onNewPalette={handleCreateNewPalette}
              onNavigateToCollection={handleNavigateToCollection}
              showPaletteActions
              isEditingCollection={!!activePaletteId}
              onDuplicate={handleDuplicateAndNavigate}
              onDelete={handleDeletePalette}
              onCollectionAction={handleCollectionAction}
            />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {pendingCollectionAction && (
        <MoveToCollectionDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setPendingCollectionAction(null);
            }
          }}
          sourceCollectionId={pendingCollectionAction.sourceCollectionId}
          paletteId={pendingCollectionAction.paletteId}
          paletteName={pendingCollectionAction.paletteName}
          mode={pendingCollectionAction.mode}
          onCreateCollection={handleCreateCollection}
        />
      )}
    </>
  );
}

function PaletteContentWrapper() {
  return <Outlet />;
}

export function RootLayout() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const breakpoint = useBreakpoint();

  // PostHog init + pageview tracking
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    initPostHog();
  }, []);
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      trackPageview();
    }
  }, [location.pathname]);

  const handleSetTheme = useCallback((t: AppTheme) => {
    setTheme(t);
    track('theme_changed', { theme: t });
  }, [setTheme]);

  // On mobile, hide the global header when on the edit page —
  // MobileLayout in EditPalettePage provides its own top bar
  // (Collection switcher + Palette menu + Edit).
  const isEditPage = isEditorRoute(location.pathname);
  const isHomePage = location.pathname === '/';
  const hideHeader = breakpoint === 'mobile' && isEditPage;
  const usesDocumentScrollLayout = isEditPage && breakpoint !== 'mobile';

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme }}>
      <div
        data-layout-shell={usesDocumentScrollLayout ? 'document' : 'viewport'}
        className={`flex flex-col bg-background text-foreground ${
          usesDocumentScrollLayout
            ? 'min-h-screen supports-[min-height:100dvh]:min-h-[100dvh]'
            : 'h-screen supports-[height:100dvh]:h-[100dvh] overflow-hidden'
        }`}
      >
        {/* App Header — hidden on mobile edit page (MobileLayout has its own top bar) */}
        {!hideHeader && (
          <header className="h-12 border-b border-border bg-card flex items-center justify-between px-3 sm:px-5 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Link
                to="/"
                className="flex items-center gap-2 shrink-0 rounded-md h-8 px-2 hover:bg-accent transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                aria-label="Colorbound — go home"
              >
                <div
                  className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center"
                  aria-hidden="true"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" className="text-background" />
                    <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" className="text-background" opacity="0.7" />
                    <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" className="text-background" opacity="0.5" />
                    <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" className="text-background" opacity="0.3" />
                  </svg>
                </div>
                <span className={`text-[13px] font-medium ${isHomePage ? 'block' : 'hidden sm:block'}`}>Colorbound</span>
              </Link>
              <HeaderBreadcrumb />
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitcher theme={theme} setTheme={setTheme} />
            </div>
          </header>
        )}

        {/* Page content */}
        <div className={`flex-1 flex ${usesDocumentScrollLayout ? 'min-h-0' : 'overflow-hidden'}`}>
          <PaletteContentWrapper />
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

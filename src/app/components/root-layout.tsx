import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { Collection } from '../lib/collection-types';
import { Outlet, useLocation, useNavigate, Link } from 'react-router';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from './ui/breadcrumb';
import { Sun, Moon, Monitor, ChevronDown, SwatchBook, Plus, Check, LayoutGrid } from 'lucide-react';
import { usePaletteContext } from '../lib/palette-context';
import { PaletteSwitcher } from './palette-switcher';
import { useBreakpoint } from '../lib/use-breakpoint';
import { Separator } from './ui/separator';
import {
  buildCollectionDraftEditorPath,
  buildCollectionPath,
  buildCollectionSavedEditorPath,
  isEditorRoute,
} from '../lib/editor-routes';

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
  showNameOnMobile = false,
}: {
  collections: Collection[];
  activeCollectionId: string | null;
  collectionName: string;
  onSelect: (slug: string, id: string) => void;
  onCreateNew: () => void;
  onViewAll?: () => void;
  showNameOnMobile?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex items-center gap-2 rounded-md h-8 px-2 text-left transition-colors hover:bg-accent cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        aria-label={`Collection: ${collectionName}. Click to switch.`}
      >
        <SwatchBook className="w-3.5 h-3.5 shrink-0" />
        <span className={`${showNameOnMobile ? 'inline' : 'hidden sm:inline'} text-[13px] font-medium truncate max-w-[160px] sm:max-w-[200px]`}>{collectionName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 ${showNameOnMobile ? 'block' : 'hidden sm:block'}`} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0 flex flex-col overflow-hidden">
        <div className="p-1 max-h-[240px] overflow-y-auto">
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
                <SwatchBook className="w-3.5 h-3.5 shrink-0 opacity-60" />
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
            New collection
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
              View all collections
            </button>
          )}
        </div>
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
 * The palette segment uses PaletteSwitcher (compact) for quick switching.
 * NO action buttons (Save/Duplicate/Share/More) live in the header.
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
    isDirty,
    handleSelectFromCollection,
    handleUpdateInCollection,
    handleAddToCollection,
    startDraftPalette,
    handleCreateCollection,
    handleSelectCollection,
  } = usePaletteContext();

  const pathname = location.pathname;
  const isEdit = isEditorRoute(pathname);
  const isShared = pathname.startsWith('/p/') || pathname.startsWith('/c/');
  const isCollectionsList = pathname === '/';
  const collectionCount = collection.length;
  const collectionSlug = activeCollection?.slug ?? '';
  const collectionName = activeCollection?.name ?? 'Collection';
  const basePath = collectionSlug ? buildCollectionPath(collectionSlug) : '';

  // Determine if we're on a collection detail page (not edit, not shared, not root)
  const isCollectionDetail = !isEdit && !isShared && !isCollectionsList;

  const handleSelectPalette = useCallback(
    (id: string) => {
      if (!collectionSlug) return;
      navigate(buildCollectionSavedEditorPath(collectionSlug, id));
    },
    [collectionSlug, navigate]
  );

  const handleSaveAndSwitch = useCallback(
    (targetId: string) => {
      handleUpdateInCollection();
      if (!collectionSlug) return;
      navigate(buildCollectionSavedEditorPath(collectionSlug, targetId));
    },
    [collectionSlug, handleUpdateInCollection, navigate]
  );

  const handleSaveNewAndSwitch = useCallback(
    (targetId: string) => {
      handleAddToCollection();
      if (!collectionSlug) return;
      navigate(buildCollectionSavedEditorPath(collectionSlug, targetId));
    },
    [collectionSlug, handleAddToCollection, navigate]
  );

  const handleCreateNewPalette = useCallback(() => {
    if (!activeCollection) return;
    startDraftPalette(activeCollection.id);
    navigate(buildCollectionDraftEditorPath(activeCollection.slug));
  }, [activeCollection, navigate, startDraftPalette]);

  const handleNavigateToCollection = useCallback(() => {
    navigate(basePath || '/');
  }, [navigate, basePath]);

  // Shared pages: no header breadcrumb
  if (isShared) return null;

  // Collections list (home) page: no breadcrumb needed
  if (isCollectionsList) return null;

  const hasMultipleCollections = collections.length > 1;

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
              onSelect={(slug, id) => {
                handleSelectCollection(id);
                navigate(buildCollectionPath(slug));
              }}
              onCreateNew={() => {
                const { slug } = handleCreateCollection();
                navigate(buildCollectionPath(slug));
              }}
              onViewAll={() => navigate('/')}
            />
          </BreadcrumbItem>

          <li className="block text-muted-foreground/30 select-none text-[13px]" role="presentation" aria-hidden="true">/</li>

          {/* Palette name with colored dot — opens PaletteSwitcher popover */}
          <BreadcrumbItem>
            <PaletteSwitcher
              variant="compact"
              collection={collection}
              currentPalette={currentPalette}
              activePaletteId={activePaletteId}
              isDirty={isDirty}
              currentName={config.name}
              onSelectPalette={handleSelectPalette}
              onSaveAndSwitch={handleSaveAndSwitch}
              onSaveNewAndSwitch={handleSaveNewAndSwitch}
              onNewPalette={handleCreateNewPalette}
              onNavigateToCollection={handleNavigateToCollection}
            />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
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

  // On mobile, hide the global header when on the edit page —
  // MobileLayout in EditPalettePage provides its own top bar
  // (PaletteSwitcher + More + Edit).
  const isEditPage = isEditorRoute(location.pathname);
  const isHomePage = location.pathname === '/';
  const hideHeader = breakpoint === 'mobile' && isEditPage;

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
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
        <div className="flex-1 flex overflow-hidden">
          <PaletteContentWrapper />
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

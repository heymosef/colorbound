import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const MOBILE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1279px)';

function getBreakpoint(mobile: boolean, tablet: boolean): Breakpoint {
  if (mobile) return 'mobile';
  if (tablet) return 'tablet';
  return 'desktop';
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return getBreakpoint(
      window.matchMedia(MOBILE_QUERY).matches,
      window.matchMedia(TABLET_QUERY).matches,
    );
  });

  useEffect(() => {
    const mobileMql = window.matchMedia(MOBILE_QUERY);
    const tabletMql = window.matchMedia(TABLET_QUERY);

    const update = () => setBreakpoint(getBreakpoint(mobileMql.matches, tabletMql.matches));

    mobileMql.addEventListener('change', update);
    tabletMql.addEventListener('change', update);
    return () => {
      mobileMql.removeEventListener('change', update);
      tabletMql.removeEventListener('change', update);
    };
  }, []);

  return breakpoint;
}

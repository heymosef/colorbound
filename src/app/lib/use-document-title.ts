import { useEffect } from 'react';

const DEFAULT_TITLE = 'Colorbound — Generate OKLCH color palettes';
const DEFAULT_DESCRIPTION =
  'Create perceptually uniform OKLCH color palettes for design systems, preview ramps, check accessibility, and export tokens to CSS, Tailwind, JSON, DTCG, and Figma.';

function setMetaContent(selector: string, content: string) {
  const el = document.querySelector(selector) as HTMLMetaElement | null;
  if (el) el.content = content;
}

/**
 * Sets `document.title`, meta description, and OG tags.
 * Restores defaults on unmount.
 */
export function useDocumentTitle(
  title: string | null | undefined,
  description?: string,
) {
  useEffect(() => {
    const resolvedTitle = title || DEFAULT_TITLE;
    const resolvedDescription = description || DEFAULT_DESCRIPTION;

    document.title = resolvedTitle;
    setMetaContent('meta[name="description"]', resolvedDescription);
    setMetaContent('meta[property="og:title"]', resolvedTitle);
    setMetaContent('meta[property="og:description"]', resolvedDescription);
    setMetaContent('meta[property="og:url"]', window.location.href);
    setMetaContent('meta[name="twitter:title"]', resolvedTitle);
    setMetaContent('meta[name="twitter:description"]', resolvedDescription);

    return () => {
      document.title = DEFAULT_TITLE;
      setMetaContent('meta[name="description"]', DEFAULT_DESCRIPTION);
      setMetaContent('meta[property="og:title"]', DEFAULT_TITLE);
      setMetaContent('meta[property="og:description"]', DEFAULT_DESCRIPTION);
      setMetaContent('meta[property="og:url"]', 'https://colorbound.dev/');
      setMetaContent('meta[name="twitter:title"]', DEFAULT_TITLE);
      setMetaContent('meta[name="twitter:description"]', DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}

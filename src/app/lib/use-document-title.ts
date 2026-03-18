import { useEffect } from 'react';

const APP_NAME = 'Colorbound';

/**
 * Sets `document.title` and restores the default on unmount.
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (title) {
      document.title = `${title} — ${APP_NAME}`;
    } else {
      document.title = APP_NAME;
    }
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
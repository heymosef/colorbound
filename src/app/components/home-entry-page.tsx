import { useEffect } from 'react';
import { useNavigate, useLoaderData } from 'react-router';
import { usePaletteContext } from '../lib/palette-context';
import { buildCollectionDraftEditorPath, getEditorNavigationMode } from '../lib/editor-routes';
import { CollectionsListPage } from './collections-list-page';

export function HomeEntryPage() {
  const { isFirstTime } = useLoaderData() as { isFirstTime: boolean };
  const navigate = useNavigate();
  const { activeCollection, startDraftPalette } = usePaletteContext();

  useEffect(() => {
    if (!isFirstTime || !activeCollection) return;

    startDraftPalette(activeCollection.id);
    navigate(buildCollectionDraftEditorPath(activeCollection.slug), {
      replace: getEditorNavigationMode('firstRun') === 'replace',
      state: { createDraft: true },
    });
  }, [isFirstTime, activeCollection, navigate, startDraftPalette]);

  if (isFirstTime) {
    return null;
  }

  return <CollectionsListPage />;
}

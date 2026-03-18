import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { usePaletteContext } from '../lib/palette-context';
import { buildCollectionDraftEditorPath, getEditorNavigationMode } from '../lib/editor-routes';
import { CollectionsListPage } from './collections-list-page';

export function HomeEntryPage() {
  const navigate = useNavigate();
  const { isFirstRunSession, activeCollection, startDraftPalette } = usePaletteContext();

  useEffect(() => {
    if (!isFirstRunSession || !activeCollection) return;

    startDraftPalette(activeCollection.id);
    navigate(buildCollectionDraftEditorPath(activeCollection.slug), {
      replace: getEditorNavigationMode('firstRun') === 'replace',
    });
  }, [isFirstRunSession, activeCollection, navigate, startDraftPalette]);

  if (isFirstRunSession) {
    return null;
  }

  return <CollectionsListPage />;
}

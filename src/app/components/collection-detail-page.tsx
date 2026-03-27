/**
 * CollectionDetailPage — shows palettes within a single collection,
 * resolved by the `:collectionSlug` URL param.
 *
 * If the slug doesn't match any collection, shows a not-found state.
 * Uses the existing CollectionsPage component for rendering the palette list,
 * after ensuring the correct collection is active in context.
 */
import { useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useCollectionsContext } from '../lib/palette-context';
import { CollectionsPage } from './collections-page';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { buildCollectionPath } from '../lib/editor-routes';

export function CollectionDetailPage() {
  const { collectionSlug } = useParams<{ collectionSlug: string }>();
  const navigate = useNavigate();
  const {
    collections,
    activeCollectionId,
    activeCollection,
    handleSelectCollection,
  } = useCollectionsContext();

  const collection = useMemo(
    () => collections.find((c) => c.slug === collectionSlug),
    [collections, collectionSlug]
  );

  // Sync context to this collection when slug matches
  useEffect(() => {
    if (collection && collection.id !== activeCollectionId) {
      handleSelectCollection(collection.id);
    }
  }, [collection, activeCollectionId, handleSelectCollection]);

  useEffect(() => {
    if (!collection && activeCollection && activeCollection.slug !== collectionSlug) {
      navigate(buildCollectionPath(activeCollection.slug), { replace: true });
    }
  }, [activeCollection, collection, collectionSlug, navigate]);

  if (!collection) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <h2 className="text-[16px] mb-1">Project not found</h2>
          <p className="text-[13px] text-muted-foreground">
            No project matches the URL "{collectionSlug}".
          </p>
          <Button onClick={() => navigate('/')} className="h-9 text-[13px]">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to projects
          </Button>
        </div>
      </div>
    );
  }

  return <CollectionsPage />;
}

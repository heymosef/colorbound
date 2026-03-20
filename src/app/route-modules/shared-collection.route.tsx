import { SharedCollectionPage } from '../components/shared-collection-page';
import { ShareErrorBoundary } from '../components/share-error-boundary';
import { getSharedCollection } from '../lib/share-api';

export async function loader({ params }: { params: Record<string, string | undefined> }) {
  const shareId = params.shareId;
  if (!shareId) throw new Error('Invalid share link');

  try {
    return await getSharedCollection(shareId);
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : 'Failed to load shared collection',
    );
  }
}

export const Component = SharedCollectionPage;
export const ErrorBoundary = ShareErrorBoundary;

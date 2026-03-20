import { SharedPalettePage } from '../components/shared-palette-page';
import { ShareErrorBoundary } from '../components/share-error-boundary';
import { getSharedPalette } from '../lib/share-api';

export async function loader({ params }: { params: Record<string, string | undefined> }) {
  const shareId = params.shareId;
  if (!shareId) throw new Error('Invalid share link');

  try {
    return await getSharedPalette(shareId);
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : 'Failed to load shared palette',
    );
  }
}

export const Component = SharedPalettePage;
export const ErrorBoundary = ShareErrorBoundary;

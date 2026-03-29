import { Folder } from 'lucide-react';

export function CollectionIcon({
  className = '',
}: {
  className?: string;
}) {
  return <Folder data-slot="collection-icon" className={`shrink-0 ${className}`.trim()} aria-hidden="true" />;
}

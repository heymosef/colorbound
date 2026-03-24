import { Palette as PaletteIcon } from 'lucide-react';

export function CollectionIcon({
  className = '',
}: {
  className?: string;
}) {
  return <PaletteIcon data-slot="collection-icon" className={`shrink-0 ${className}`.trim()} aria-hidden="true" />;
}

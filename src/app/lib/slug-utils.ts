// ─── Slug Utilities ───
// URL-safe slug generation with deduplication for collections and palettes.

/**
 * Convert a string to a URL-safe slug.
 * - Lowercased
 * - Non-alphanumeric chars replaced with hyphens
 * - Consecutive hyphens collapsed
 * - Leading/trailing hyphens removed
 */
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

/**
 * Generate a unique slug given a set of existing slugs.
 * If `base` already exists, appends `-2`, `-3`, etc.
 */
export function deduplicateSlug(base: string, existingSlugs: Set<string>): string {
  if (!existingSlugs.has(base)) return base;
  let i = 2;
  while (existingSlugs.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

/**
 * Generate a unique name given a set of existing names.
 * If `base` already exists, appends " (2)", " (3)", etc.
 */
export function deduplicateName(base: string, existingNames: Set<string>): string {
  if (!existingNames.has(base)) return base;
  let i = 2;
  while (existingNames.has(`${base} (${i})`)) i++;
  return `${base} (${i})`;
}

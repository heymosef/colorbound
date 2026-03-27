import type { Collection } from './collection-types';

export type CollectionNameValidationError = 'empty' | 'duplicate';

export interface CollectionNameValidationResult {
  valid: boolean;
  normalizedName: string;
  uniquenessKey: string;
  error?: CollectionNameValidationError;
  message?: string;
}

function normalizeCollectionName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function normalizeCollectionNameForUniqueness(name: string): string {
  return normalizeCollectionName(name).toLocaleLowerCase();
}

export function validateCollectionName(
  name: string,
  collections: Pick<Collection, 'id' | 'name'>[],
  options?: { excludeCollectionId?: string },
): CollectionNameValidationResult {
  const normalizedName = normalizeCollectionName(name);
  const uniquenessKey = normalizeCollectionNameForUniqueness(name);

  if (!normalizedName) {
    return {
      valid: false,
      normalizedName,
      uniquenessKey,
      error: 'empty',
      message: 'Project name is required',
    };
  }

  const hasDuplicate = collections.some((collection) => {
    if (options?.excludeCollectionId && collection.id === options.excludeCollectionId) {
      return false;
    }

    return normalizeCollectionNameForUniqueness(collection.name) === uniquenessKey;
  });

  if (hasDuplicate) {
    return {
      valid: false,
      normalizedName,
      uniquenessKey,
      error: 'duplicate',
      message: 'Project name must be unique',
    };
  }

  return {
    valid: true,
    normalizedName,
    uniquenessKey,
  };
}

import { describe, expect, it } from 'vitest';
import { validateCollectionName } from './collection-name-validation';

const collections = [
  { id: 'a', name: 'Marketing' },
  { id: 'b', name: 'Product Team' },
];

describe('normalizeCollectionName behavior', () => {
  it('trims and collapses whitespace through validation output', () => {
    expect(validateCollectionName('  Product   Team  ', collections, { excludeCollectionId: 'b' })).toMatchObject({
      valid: true,
      normalizedName: 'Product Team',
      uniquenessKey: 'product team',
    });
  });
});

describe('validateCollectionName', () => {
  it('rejects empty names', () => {
    expect(validateCollectionName('   ', collections)).toMatchObject({
      valid: false,
      error: 'empty',
    });
  });

  it('rejects case-insensitive duplicates', () => {
    expect(validateCollectionName('marketing', collections)).toMatchObject({
      valid: false,
      error: 'duplicate',
    });
  });

  it('rejects names that only differ by internal spacing', () => {
    expect(validateCollectionName('Product    Team', collections)).toMatchObject({
      valid: false,
      error: 'duplicate',
    });
  });

  it('allows a rename to the current collection name', () => {
    expect(validateCollectionName(' marketing ', collections, { excludeCollectionId: 'a' })).toMatchObject({
      valid: true,
      normalizedName: 'marketing',
    });
  });

  it('accepts a unique name and returns the normalized display value', () => {
    expect(validateCollectionName('  Brand Colors  ', collections)).toMatchObject({
      valid: true,
      normalizedName: 'Brand Colors',
    });
  });
});

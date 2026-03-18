import { describe, it, expect } from 'vitest';
import { toSlug, deduplicateSlug, deduplicateName } from './slug-utils';

describe('toSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(toSlug('My Brand Colors')).toBe('my-brand-colors');
  });

  it('collapses multiple non-alpha chars', () => {
    expect(toSlug('hello---world')).toBe('hello-world');
    expect(toSlug('a  &  b')).toBe('a-b');
  });

  it('strips leading and trailing hyphens', () => {
    expect(toSlug('--hello--')).toBe('hello');
  });

  it('handles empty/whitespace input', () => {
    expect(toSlug('')).toBe('untitled');
    expect(toSlug('   ')).toBe('untitled');
  });

  it('handles unicode/special chars', () => {
    expect(toSlug('Résumé & Portfolio!')).toBe('r-sum-portfolio');
  });

  it('handles numbers', () => {
    expect(toSlug('Project 2026')).toBe('project-2026');
  });
});

describe('deduplicateSlug', () => {
  it('returns base when no conflict', () => {
    expect(deduplicateSlug('my-brand', new Set(['other']))).toBe('my-brand');
  });

  it('appends -2 on first conflict', () => {
    expect(deduplicateSlug('my-brand', new Set(['my-brand']))).toBe('my-brand-2');
  });

  it('increments past existing suffixes', () => {
    expect(deduplicateSlug('my-brand', new Set(['my-brand', 'my-brand-2', 'my-brand-3']))).toBe('my-brand-4');
  });

  it('handles empty existing set', () => {
    expect(deduplicateSlug('foo', new Set())).toBe('foo');
  });
});

describe('deduplicateName', () => {
  it('returns base when no conflict', () => {
    expect(deduplicateName('My Collection', new Set(['Other']))).toBe('My Collection');
  });

  it('appends (2) on first conflict', () => {
    expect(deduplicateName('My Collection', new Set(['My Collection']))).toBe('My Collection (2)');
  });

  it('increments past existing suffixes', () => {
    expect(deduplicateName('My Collection', new Set(['My Collection', 'My Collection (2)']))).toBe('My Collection (3)');
  });
});

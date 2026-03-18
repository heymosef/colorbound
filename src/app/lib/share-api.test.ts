import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildShareUrl,
  daysUntilExpiry,
  ShareError,
} from './share-api';

// ─── buildShareUrl ───

describe('buildShareUrl', () => {
  it('builds a palette share URL', () => {
    const url = buildShareUrl('palette', 'abc123');
    expect(url).toMatch(/\/p\/abc123$/);
  });

  it('builds a collection share URL', () => {
    const url = buildShareUrl('collection', 'xyz789');
    expect(url).toMatch(/\/c\/xyz789$/);
  });

  it('uses the current origin', () => {
    const url = buildShareUrl('palette', 'test');
    expect(url).toContain(window.location.origin);
  });
});

// ─── daysUntilExpiry ───

describe('daysUntilExpiry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 30 for a link created just now', () => {
    const now = new Date('2026-03-12T12:00:00Z');
    vi.setSystemTime(now);
    const result = daysUntilExpiry('2026-03-12T12:00:00Z');
    expect(result).toBe(30);
  });

  it('returns 1 for a link created 29 days ago', () => {
    const now = new Date('2026-04-10T12:00:00Z');
    vi.setSystemTime(now);
    const result = daysUntilExpiry('2026-03-12T12:00:00Z');
    expect(result).toBe(1);
  });

  it('returns 0 for a link created 30+ days ago', () => {
    const now = new Date('2026-04-12T12:00:00Z');
    vi.setSystemTime(now);
    const result = daysUntilExpiry('2026-03-12T12:00:00Z');
    expect(result).toBe(0);
  });

  it('returns 0 for a link created 60 days ago (never negative)', () => {
    const now = new Date('2026-05-11T12:00:00Z');
    vi.setSystemTime(now);
    const result = daysUntilExpiry('2026-03-12T12:00:00Z');
    expect(result).toBe(0);
  });
});

// ─── ShareError ───

describe('ShareError', () => {
  it('has the correct name and status', () => {
    const err = new ShareError('Not found', 404);
    expect(err.name).toBe('ShareError');
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err instanceof Error).toBe(true);
  });
});

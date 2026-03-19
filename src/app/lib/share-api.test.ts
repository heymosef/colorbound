import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildShareUrl,
  createSharedCollection,
  createSharedPalette,
  daysUntilExpiry,
  ShareError,
} from './share-api';

const fetchMock = vi.fn();

vi.mock('/utils/supabase/info', () => ({
  projectId: 'test-project',
  publicAnonKey: 'test-anon-key',
}));

// ─── buildShareUrl ───

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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

// ─── createSharedPalette / createSharedCollection ───

describe('createSharedPalette', () => {
  it('posts the canonical palette payload shape', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'share-1', type: 'palette' }),
    });

    await createSharedPalette({
      name: 'Ocean',
      hue: 210,
      chroma: 0.12,
      lightness50: 0.985,
      lightness950: 0.025,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://test-project.supabase.co/functions/v1/make-server-15a4cf79/share/palette',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-anon-key',
        }),
        body: JSON.stringify({
          palette: {
            name: 'Ocean',
            hue: 210,
            chroma: 0.12,
            lightness50: 0.985,
            lightness950: 0.025,
          },
        }),
      }),
    );
  });

  it('preserves the backend message and status on failure', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Invalid palette data: all config fields (name, hue, chroma, lightness50/lightness950 or blackRange/whiteRange, isNeutral) are required and must be valid',
      }),
    });

    await expect(
      createSharedPalette({
        name: 'Ocean',
        hue: 210,
        chroma: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
      }),
    ).rejects.toMatchObject({
      name: 'ShareError',
      status: 400,
      message: 'Invalid palette data: all config fields (name, hue, chroma, lightness50/lightness950 or blackRange/whiteRange, isNeutral) are required and must be valid',
    });
  });
});

describe('createSharedCollection', () => {
  it('posts canonical collection entries without removed fields', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'share-2', type: 'collection', count: 1 }),
    });

    await createSharedCollection([
      {
        name: 'Ocean',
        hue: 210,
        chroma: 0.12,
        lightness50: 0.985,
        lightness950: 0.025,
      },
    ], 'Brand Colors');

    const request = fetchMock.mock.calls[0]?.[1];
    expect(fetchMock).toHaveBeenCalledWith(
      'https://test-project.supabase.co/functions/v1/make-server-15a4cf79/share/collection',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(request?.body).toBe(JSON.stringify({
      palettes: [
        {
          name: 'Ocean',
          hue: 210,
          chroma: 0.12,
          lightness50: 0.985,
          lightness950: 0.025,
        },
      ],
      name: 'Brand Colors',
    }));
    expect(request?.body).not.toContain('group');
    expect(request?.body).not.toContain('isNeutral');
  });

  it('preserves the backend collection failure message', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'No valid palette entries found in collection',
      }),
    });

    await expect(
      createSharedCollection([
        {
          name: 'Ocean',
          hue: 210,
          chroma: 0.12,
          lightness50: 0.985,
          lightness950: 0.025,
        },
      ], 'Brand Colors'),
    ).rejects.toMatchObject({
      name: 'ShareError',
      status: 400,
      message: 'No valid palette entries found in collection',
    });
  });
});

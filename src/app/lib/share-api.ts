// ─── Share API Service ───
// Frontend client for creating and fetching shared palettes/collections.

import { projectId, publicAnonKey } from '/utils/supabase/info';

// This deployed function identifier is intentionally retained so existing share
// links and deployed clients keep working. Change only with a migration plan.
const SHARE_FUNCTION_ID = 'make-server-15a4cf79';
const BASE_URL = `https://${projectId}.supabase.co/functions/v1/${SHARE_FUNCTION_ID}`;

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
};

// ─── Types ───

export interface SharedPaletteEntry {
  name: string;
  hue: number;
  chroma: number;
  lightness50: number;
  lightness950: number;
  targetColorSpace: 'srgb' | 'p3';
  generationVersion: number;
}

export interface SharedPaletteResponse {
  type: 'palette';
  palette: SharedPaletteEntry;
  createdAt: string;
}

export interface SharedCollectionResponse {
  type: 'collection';
  name: string;
  palettes: SharedPaletteEntry[];
  createdAt: string;
}

export interface ShareResult {
  id: string;
  type: 'palette' | 'collection';
  count?: number;
}

export class ShareError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ShareError';
  }
}

// ─── API calls ───

export async function createSharedPalette(palette: SharedPaletteEntry): Promise<ShareResult> {
  const res = await fetch(`${BASE_URL}/share/palette`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ palette }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Failed to create shared palette:', data);
    throw new ShareError(data.error || 'Failed to create shared palette', res.status);
  }

  return data;
}

export async function createSharedCollection(
  palettes: SharedPaletteEntry[],
  name?: string,
): Promise<ShareResult> {
  const res = await fetch(`${BASE_URL}/share/collection`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ palettes, name }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Failed to create shared collection:', data);
    throw new ShareError(data.error || 'Failed to create shared collection', res.status);
  }

  return data;
}

export async function getSharedPalette(id: string): Promise<SharedPaletteResponse> {
  const res = await fetch(`${BASE_URL}/share/palette/${encodeURIComponent(id)}`, {
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`Failed to fetch shared palette ${id}:`, data);
    throw new ShareError(data.error || 'Failed to fetch shared palette', res.status);
  }

  return data;
}

export async function getSharedCollection(id: string): Promise<SharedCollectionResponse> {
  const res = await fetch(`${BASE_URL}/share/collection/${encodeURIComponent(id)}`, {
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`Failed to fetch shared collection ${id}:`, data);
    throw new ShareError(data.error || 'Failed to fetch shared collection', res.status);
  }

  return data;
}

// ─── Helpers ───

/** Build the full shareable URL for a palette or collection */
export function buildShareUrl(type: 'palette' | 'collection', id: string): string {
  const prefix = type === 'palette' ? '/p/' : '/c/';
  return `${window.location.origin}${prefix}${id}`;
}

/** How many days until a share link expires */
export function daysUntilExpiry(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const expiresAt = created + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

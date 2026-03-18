import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import {
  hasLegacyLightnessFields,
  normalizeLegacyLightnessFields,
} from "../../../src/app/lib/legacy-palette-compat.ts";

const app = new Hono();
// This deployed identifier is intentionally retained so existing share links
// and clients keep resolving to the live function. Change only with a
// migration plan and dual-routing window.
const SHARE_FUNCTION_ID = "make-server-15a4cf79";
const SHARE_ROUTE_PREFIX = `/${SHARE_FUNCTION_ID}`;

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get(`${SHARE_ROUTE_PREFIX}/health`, (c) => {
  return c.json({ status: "ok" });
});

// ─── Share ID Generation ───

function generateShareId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// ─── TTL Enforcement (30 days) ───

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isExpired(createdAt: string | number): boolean {
  const created = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt;
  return Date.now() - created > TTL_MS;
}

// ─── Validation helpers ───

function isValidNumber(v: unknown, min: number, max: number): boolean {
  return typeof v === 'number' && !Number.isNaN(v) && v >= min && v <= max;
}

function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

interface PaletteEntry {
  name: string;
  group: string;
  hue: number;
  chroma: number;
  lightness50: number;
  lightness950: number;
  isNeutral: boolean;
}

function hasModernLightnessFields(obj: Record<string, unknown>): boolean {
  return (
    isValidNumber(obj.lightness50, 0, 1) &&
    isValidNumber(obj.lightness950, 0, 1)
  );
}

function normalizePaletteEntry(e: unknown): PaletteEntry | null {
  if (!e || typeof e !== 'object') return null;
  const obj = e as Record<string, unknown>;

  let lightness50: number;
  let lightness950: number;
  if (hasModernLightnessFields(obj)) {
    lightness50 = obj.lightness50;
    lightness950 = obj.lightness950;
  } else if (hasLegacyLightnessFields(obj, isValidNumber)) {
    console.log('[legacy-compat] server-accepted-legacy-palette');
    const normalized = normalizeLegacyLightnessFields(obj, clampNumber);
    lightness50 = normalized.lightness50;
    lightness950 = normalized.lightness950;
  } else {
    return null;
  }

  if (
    typeof obj.name === 'string' &&
    obj.name.length > 0 &&
    obj.name.length <= 100 &&
    typeof obj.group === 'string' &&
    obj.group.length <= 50 &&
    isValidNumber(obj.hue, 0, 360) &&
    isValidNumber(obj.chroma, 0, 0.4) &&
    typeof obj.isNeutral === 'boolean'
  ) {
    return {
      name: obj.name,
      group: obj.group,
      hue: obj.hue,
      chroma: obj.chroma,
      lightness50,
      lightness950,
      isNeutral: obj.isNeutral,
    };
  }

  return null;
}

function sanitizePaletteEntry(e: PaletteEntry): PaletteEntry {
  return {
    name: e.name.slice(0, 100),
    group: e.group.slice(0, 50),
    hue: e.hue,
    chroma: e.chroma,
    lightness50: e.lightness50,
    lightness950: e.lightness950,
    isNeutral: e.isNeutral,
  };
}

// ─── Share a single palette ───

app.post(`${SHARE_ROUTE_PREFIX}/share/palette`, async (c) => {
  try {
    const body = await c.req.json();
    const palette = normalizePaletteEntry(body.palette);

    if (!palette) {
      return c.json({ error: "Invalid palette data: all config fields (name, hue, chroma, lightness50/lightness950 or blackRange/whiteRange, isNeutral) are required and must be valid" }, 400);
    }

    const id = generateShareId();
    const key = `share:p:${id}`;

    const payload = {
      type: 'palette' as const,
      palette: sanitizePaletteEntry(palette),
      createdAt: new Date().toISOString(),
    };

    await kv.set(key, payload);
    console.log(`Created shared palette: ${id}`);

    return c.json({ id, type: 'palette' });
  } catch (err) {
    console.log(`Error creating shared palette: ${err}`);
    return c.json({ error: `Failed to create shared palette: ${err}` }, 500);
  }
});

// ─── Share a full collection ───

app.post(`${SHARE_ROUTE_PREFIX}/share/collection`, async (c) => {
  try {
    const body = await c.req.json();
    const { palettes, name } = body;

    if (!Array.isArray(palettes) || palettes.length === 0) {
      return c.json({ error: "Invalid collection: palettes must be a non-empty array" }, 400);
    }

    if (palettes.length > 50) {
      return c.json({ error: "Collection too large: maximum 50 palettes per shared collection" }, 400);
    }

    const validPalettes = palettes
      .map(normalizePaletteEntry)
      .filter((palette): palette is PaletteEntry => palette !== null);
    if (validPalettes.length === 0) {
      return c.json({ error: "No valid palette entries found in collection" }, 400);
    }

    const id = generateShareId();
    const key = `share:c:${id}`;

    const payload = {
      type: 'collection' as const,
      name: typeof name === 'string' ? name.slice(0, 100) : 'Shared Collection',
      palettes: validPalettes.map(sanitizePaletteEntry),
      createdAt: new Date().toISOString(),
    };

    await kv.set(key, payload);
    console.log(`Created shared collection: ${id} (${validPalettes.length} palettes)`);

    return c.json({ id, type: 'collection', count: validPalettes.length });
  } catch (err) {
    console.log(`Error creating shared collection: ${err}`);
    return c.json({ error: `Failed to create shared collection: ${err}` }, 500);
  }
});

// ─── Get a shared palette ───

app.get(`${SHARE_ROUTE_PREFIX}/share/palette/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const key = `share:p:${id}`;
    const data = await kv.get(key);

    if (!data) {
      return c.json({ error: "Shared palette not found — it may have expired or the link is invalid" }, 404);
    }

    // Lazy TTL expiration
    if (data.createdAt && isExpired(data.createdAt)) {
      await kv.del(key).catch(() => {});
      return c.json({ error: "This shared palette has expired (links expire after 30 days)" }, 410);
    }

    return c.json(data);
  } catch (err) {
    console.log(`Error fetching shared palette ${c.req.param("id")}: ${err}`);
    return c.json({ error: `Failed to fetch shared palette: ${err}` }, 500);
  }
});

// ─── Get a shared collection ───

app.get(`${SHARE_ROUTE_PREFIX}/share/collection/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const key = `share:c:${id}`;
    const data = await kv.get(key);

    if (!data) {
      return c.json({ error: "Shared collection not found — it may have expired or the link is invalid" }, 404);
    }

    // Lazy TTL expiration
    if (data.createdAt && isExpired(data.createdAt)) {
      await kv.del(key).catch(() => {});
      return c.json({ error: "This shared collection has expired (links expire after 30 days)" }, 410);
    }

    return c.json(data);
  } catch (err) {
    console.log(`Error fetching shared collection ${c.req.param("id")}: ${err}`);
    return c.json({ error: `Failed to fetch shared collection: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);

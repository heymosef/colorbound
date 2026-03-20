import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import {
  CANONICAL_SHARE_FIELDS,
  DUPLICATE_PALETTE_NAME_MESSAGE,
  hasDuplicatePaletteNames,
  LEGACY_LIGHTNESS_FIELDS,
  normalizePaletteEntry,
  type PaletteEntry,
  sanitizePaletteEntry,
  SHARE_SCHEMA_VERSION,
  usesLegacyLightnessFields,
} from "./share-contract.ts";

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
  return c.json({
    status: "ok",
    functionId: SHARE_FUNCTION_ID,
    schemaVersion: SHARE_SCHEMA_VERSION,
    canonicalShareFields: CANONICAL_SHARE_FIELDS,
    legacyLightnessFields: LEGACY_LIGHTNESS_FIELDS,
    requiresLegacyMetadata: false,
  });
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

// ─── Share a single palette ───

app.post(`${SHARE_ROUTE_PREFIX}/share/palette`, async (c) => {
  try {
    const body = await c.req.json();
    if (usesLegacyLightnessFields(body.palette)) {
      console.log("[legacy-compat] server-accepted-legacy-palette");
    }
    const palette = normalizePaletteEntry(body.palette);

    if (!palette) {
      return c.json({ error: "Invalid palette data: name, hue, chroma, and lightness50/lightness950 (or blackRange/whiteRange) are required and must be valid" }, 400);
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
      .map((entry) => {
        if (usesLegacyLightnessFields(entry)) {
          console.log("[legacy-compat] server-accepted-legacy-palette");
        }
        return normalizePaletteEntry(entry);
      })
      .filter((palette): palette is PaletteEntry => palette !== null);
    if (validPalettes.length === 0) {
      return c.json({ error: "No valid palette entries found in collection" }, 400);
    }

    if (hasDuplicatePaletteNames(validPalettes)) {
      return c.json({ error: DUPLICATE_PALETTE_NAME_MESSAGE }, 400);
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

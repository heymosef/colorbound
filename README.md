# Colorbound
Colorbound is a React + Vite app for generating perceptually uniform OKLCH color palettes for design systems. Preview ramps, check accessibility, and export tokens to CSS, Tailwind, JSON, DTCG, and Figma.

The current production app is published at [colorbound.dev](https://colorbound.dev/).

## What It Does
- Generate editable OKLCH palettes with configurable hue, chroma, lightness bounds, density, and target color space.
- Maintain multiple collections of saved palettes with draft-first editing, duplication, rename, move, copy, and delete flows.
- Preview palettes as token ramps, inspect contrast, and compare light, dark, or combined views.
- Export a single palette or an entire collection as CSS, Tailwind v4 theme tokens, SCSS, JSON, DTCG tokens, or Figma-compatible tokens.
- Share a palette or a collection through Supabase-backed links that expire after 30 days.
- Persist local workspace state in `localStorage`, including migrations for older saved data.

## Stack
- React 18
- React Router 7
- Vite
- Tailwind CSS 4
- Radix UI primitives
- Vitest + Testing Library
- PostHog for product analytics
- Supabase Edge Functions for sharing

## Getting Started
### Requirements
- Node.js `>=22.12.0`
- npm

### Install
```bash
npm install
```

### Start the app
```bash
npm run dev
```

The Vite dev server starts locally and serves the browser app.

### Run tests
```bash
npm test
```

### Build for production
```bash
npm run build
```

## Environment Variables
Create a `.env.local` file for local development when you want analytics or sharing enabled:
```bash
VITE_PUBLIC_POSTHOG_KEY=
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_ANON_KEY=
```

Notes:
- PostHog is optional. If `VITE_PUBLIC_POSTHOG_KEY` is empty, analytics will not initialize.
- Palette editing, collections, previews, and exports work without Supabase.
- Sharing requires `VITE_SUPABASE_PROJECT_ID` and `VITE_SUPABASE_ANON_KEY`, plus the matching deployed Supabase Edge Function.

## Sharing Architecture
Colorbound uses a Supabase Edge Function for share creation and retrieval.
- Frontend client: `src/app/lib/share-api.ts`
- Edge Function: `supabase/functions/server/index.tsx`

Behavior:
- Shared palette links resolve under `/p/:shareId`
- Shared collection links resolve under `/c/:shareId`
- Shared records expire after 30 days
- Shared collections are capped at 50 palettes
- Existing clients and links depend on the retained function id `make-server-15a4cf79`

## App Structure
```text
src/
  app/
    components/        UI, pages, dialogs, export and share flows
    lib/               palette generation, persistence, routing, analytics, sharing
    route-modules/     lazy route entry points
  styles/              theme, fonts, Tailwind entry styles
supabase/
  functions/server/    share API edge function
public/
  404.html             GitHub Pages SPA redirect shim
  spa-redirect.js      restores client-side routes after redirect
```

## Core Flows
### Collections and editing
- `/` shows the collections index
- `/:collectionSlug` opens a collection detail view
- `/:collectionSlug/edit/:paletteId` opens a saved palette in the editor
- `/edit/:paletteId?` exists as a legacy editor route

On a first run, the app creates a default collection and seeds a draft palette automatically.

### Export formats
The export panel supports:
- CSS custom properties
- Tailwind v4 `@theme`
- SCSS variables and maps
- flat JSON tokens
- DTCG / W3C token JSON
- Figma-compatible token JSON

### Color spaces and previews
- Palettes can target `srgb` or `p3`
- When a display does not support P3, the app falls back to sRGB preview output
- Contrast indicators and light/dark palette previews are available in the editor and shared views

## Persistence
Workspace state is stored in `localStorage` using a versioned schema with migrations for older saved data. Collections, palette configs, active selection, density, and first-run state are restored on reload.

Persistence logic lives in `src/app/lib/local-storage.ts`.

## Deployment
The repository includes GitHub Pages deployment via GitHub Actions:
- Workflow: `.github/workflows/deploy.yml`
- Builds with Node 22
- Runs `npm ci`, `npm run build`, and `npm test`
- Publishes the `dist/` output to GitHub Pages

Because the app uses client-side routing, it also includes:
- `public/404.html`
- `public/spa-redirect.js`

These files preserve deep links on GitHub Pages.

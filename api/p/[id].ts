import { buildOgHtml, isCrawler, SHARE_BASE_URL, SUPABASE_HEADERS } from '../_og';

export const config = { runtime: 'edge' };

const FALLBACK_TITLE = 'Shared OKLCH palette \u2014 Colorbound';
const FALLBACK_DESC =
  'Preview a perceptually uniform OKLCH color palette. Explore token ramps, check contrast, and import it into your workspace with Colorbound.';

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop() ?? '';
  const canonicalUrl = `https://www.colorbound.dev/p/${encodeURIComponent(id)}`;

  // Non-crawlers get the SPA
  if (!isCrawler(req.headers.get('user-agent') ?? '')) {
    return fetch(`${url.protocol}//${url.host}/index.html`);
  }

  // Crawlers get a purpose-built OG page
  try {
    const res = await fetch(
      `${SHARE_BASE_URL}/share/palette/${encodeURIComponent(id)}`,
      { headers: SUPABASE_HEADERS },
    );
    if (res.ok) {
      const data = await res.json();
      const name = data?.palette?.name ?? 'Palette';
      return new Response(
        buildOgHtml(
          `${name} \u2014 OKLCH color palette via Colorbound`,
          `Explore ${name}, a perceptually uniform OKLCH color palette generated with Colorbound. Preview the scale, copy tokens, check contrast, and import it into your workspace.`,
          canonicalUrl,
        ),
        { headers: { 'content-type': 'text/html; charset=utf-8' } },
      );
    }
  } catch {
    // fall through to generic tags
  }

  return new Response(buildOgHtml(FALLBACK_TITLE, FALLBACK_DESC, canonicalUrl), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

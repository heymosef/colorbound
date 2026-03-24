import { buildOgHtml, isCrawler, SHARE_BASE_URL, SUPABASE_HEADERS } from '../_og';

export const config = { runtime: 'edge' };

const FALLBACK_TITLE = 'Shared OKLCH collection \u2014 Colorbound';
const FALLBACK_DESC =
  'Browse a shared set of OKLCH color palettes. Preview ramps, compare swatches, and import them into your workspace with Colorbound.';

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop() ?? '';
  const canonicalUrl = `https://www.colorbound.dev/c/${encodeURIComponent(id)}`;

  // Non-crawlers get the SPA
  if (!isCrawler(req.headers.get('user-agent') ?? '')) {
    return fetch(`${url.protocol}//${url.host}/index.html`);
  }

  // Crawlers get a purpose-built OG page
  try {
    const res = await fetch(
      `${SHARE_BASE_URL}/share/collection/${encodeURIComponent(id)}`,
      { headers: SUPABASE_HEADERS },
    );
    if (res.ok) {
      const data = await res.json();
      const name = data?.name ?? 'Collection';
      const count = Array.isArray(data?.palettes) ? data.palettes.length : 0;
      return new Response(
        buildOgHtml(
          `${name} \u2014 OKLCH color collection via Colorbound`,
          `Browse ${count} perceptually uniform OKLCH palette${count !== 1 ? 's' : ''} in ${name}. Preview ramps, compare palettes, copy tokens, and import the collection into Colorbound.`,
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

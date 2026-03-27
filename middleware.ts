// Vercel Routing Middleware — serves OG HTML to crawlers for /p/:id and /c/:id

const CRAWLER_UA_RE =
  /slackbot|twitterbot|facebookexternalhit|linkedinbot|whatsapp|googlebot|discordbot|telegrambot|applebot|ia_archiver|opengraph|iframely|vkshare|w3c_validator|baiduspider/i;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildOgHtml(
  title: string,
  description: string,
  canonicalUrl: string,
): string {
  const t = esc(title);
  const d = esc(description);
  const u = esc(canonicalUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${t}</title>
  <meta name="description" content="${d}" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${u}" />
  <meta property="og:image" content="https://www.colorbound.dev/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="https://www.colorbound.dev/og-image.png" />
</head>
<body></body>
</html>`;
}

const PALETTE_FALLBACK_TITLE = 'Shared OKLCH palette \u2014 Colorbound';
const PALETTE_FALLBACK_DESC =
  'Preview a perceptually uniform OKLCH color palette. Explore token ramps, check contrast, and import it into your workspace with Colorbound.';
const COLLECTION_FALLBACK_TITLE = 'Shared OKLCH project \u2014 Colorbound';
const COLLECTION_FALLBACK_DESC =
  'Browse a shared set of OKLCH color palettes. Preview ramps, compare swatches, and import them into your workspace with Colorbound.';

export default async function middleware(request: Request) {
  const ua = request.headers.get('user-agent') ?? '';
  if (!CRAWLER_UA_RE.test(ua)) {
    return; // non-crawler — pass through to the SPA
  }

  const url = new URL(request.url);
  const path = url.pathname;
  const segments = path.split('/');
  // segments: ['', 'p' or 'c', id]
  const kind = segments[1]; // 'p' or 'c'
  const id = segments[2] ?? '';
  const canonicalUrl = `https://www.colorbound.dev${path}`;

  const shareBaseUrl = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-15a4cf79`;
  const supabaseHeaders = {
    Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
  };

  if (kind === 'p') {
    // Palette share
    try {
      const res = await fetch(
        `${shareBaseUrl}/share/palette/${encodeURIComponent(id)}`,
        { headers: supabaseHeaders },
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
      // fall through to fallback
    }
    return new Response(
      buildOgHtml(PALETTE_FALLBACK_TITLE, PALETTE_FALLBACK_DESC, canonicalUrl),
      { headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }

  if (kind === 'c') {
    // Collection share
    try {
      const res = await fetch(
        `${shareBaseUrl}/share/collection/${encodeURIComponent(id)}`,
        { headers: supabaseHeaders },
      );
      if (res.ok) {
        const data = await res.json();
        const name = data?.name ?? 'Project';
        const count = Array.isArray(data?.palettes)
          ? data.palettes.length
          : 0;
        return new Response(
          buildOgHtml(
            `${name} \u2014 OKLCH color project via Colorbound`,
            `Browse ${count} perceptually uniform OKLCH palette${count !== 1 ? 's' : ''} in ${name}. Preview ramps, compare palettes, copy tokens, and import the project into Colorbound.`,
            canonicalUrl,
          ),
          { headers: { 'content-type': 'text/html; charset=utf-8' } },
        );
      }
    } catch {
      // fall through to fallback
    }
    return new Response(
      buildOgHtml(
        COLLECTION_FALLBACK_TITLE,
        COLLECTION_FALLBACK_DESC,
        canonicalUrl,
      ),
      { headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }
}

export const config = {
  matcher: ['/p/:path*', '/c/:path*'],
};

// Shared utilities for OG tag edge functions

export const CRAWLER_UA_RE =
  /slackbot|twitterbot|facebookexternalhit|linkedinbot|whatsapp|googlebot|discordbot|telegrambot|applebot|ia_archiver|opengraph|iframely|vkshare|w3c_validator|baiduspider/i;

export function isCrawler(userAgent: string): boolean {
  return CRAWLER_UA_RE.test(userAgent);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildOgHtml(title: string, description: string, canonicalUrl: string): string {
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

export const SHARE_BASE_URL = `https://${process.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-15a4cf79`;
export const SUPABASE_HEADERS = {
  Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
};

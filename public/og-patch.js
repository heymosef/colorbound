/**
 * Path-aware OG tag patching for GitHub Pages 404 redirects.
 * Called synchronously before the SPA redirect fires, so crawlers
 * that don't follow redirects see correct meta tags for shared pages.
 *
 * Also exported as `patchOgTags(pathname)` for unit testing.
 */

var PALETTE_TITLE = 'Shared OKLCH palette \u2014 Colorbound';
var PALETTE_DESC =
  'Preview a perceptually uniform OKLCH color palette. Explore token ramps, check contrast, and import it into your workspace with Colorbound.';
var COLLECTION_TITLE = 'Shared OKLCH collection \u2014 Colorbound';
var COLLECTION_DESC =
  'Browse a shared set of OKLCH color palettes. Preview ramps, compare swatches, and import them into your workspace with Colorbound.';

function patchOgTags(pathname) {
  var title, desc;

  if (pathname.indexOf('/p/') === 0) {
    title = PALETTE_TITLE;
    desc = PALETTE_DESC;
  } else if (pathname.indexOf('/c/') === 0) {
    title = COLLECTION_TITLE;
    desc = COLLECTION_DESC;
  } else {
    return;
  }

  var url = 'https://colorbound.dev' + pathname;

  function set(sel, val) {
    var el = document.querySelector(sel);
    if (el) el.setAttribute('content', val);
  }

  set('meta[property="og:title"]', title);
  set('meta[property="og:description"]', desc);
  set('meta[property="og:url"]', url);
  set('meta[name="twitter:title"]', title);
  set('meta[name="twitter:description"]', desc);
}

// Auto-run when loaded in browser
if (typeof window !== 'undefined') {
  patchOgTags(window.location.pathname);
}

// Expose on globalThis for unit testing (harmless no-op in browsers)
globalThis.__ogPatch = { patchOgTags: patchOgTags };

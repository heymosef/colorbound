// SPA redirect restore for GitHub Pages (matches public/404.html)
// Restores the original URL that 404.html encoded into a query string,
// then decodes the current query string if it carries a redirect path.
(function () {
  var redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  if (redirect && redirect !== location.href) {
    try {
      var url = new URL(redirect, location.href);
      if (url.origin === location.origin) {
        history.replaceState(null, null, url.href);
      }
    } catch (e) {}
  }
})();
(function () {
  var l = window.location;
  if (l.search[1] === '/') {
    var decoded = l.search.slice(1).split('&').map(function (s) {
      return s.replace(/~and~/g, '&');
    }).join('?');
    sessionStorage.redirect = l.protocol + '//' + l.host + decoded + l.hash;
    window.history.replaceState(null, null,
      l.pathname.slice(0, -1) + decoded + l.hash
    );
  }
})();

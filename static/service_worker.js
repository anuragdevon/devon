/* Service worker: lets the site open offline and keeps repeat visits fast.
   - Pages and un-fingerprinted files: network first, cache as the offline fallback,
     so a deploy is visible on the next visit (no stale pages).
   - Fingerprinted assets (content hash in the file name, e.g. bundle.<hash>.js): cache first,
     since a new build gives them a new name.
   - Non-GET and cross-origin requests (Google Fonts, form posts) are left to the browser.
   Must stay at /service_worker.js (root scope); static/_headers serves it with no-cache.
   Bump CACHE when these rules change; old caches are deleted on activate. */

var CACHE = 'devon-v3';
var HASHED = /\.[0-9a-f]{32,}\.[a-z0-9]+$|_hu_?[0-9a-f]+/;
var SHELL = ['/', '/about/', '/projects/', '/blogs/'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).catch(function () {}));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function store(req, res) {
  if (res && res.ok && res.type === 'basic') {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
  }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (HASHED.test(url.pathname)) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { return store(req, res); });
    }));
    return;
  }

  e.respondWith(fetch(req).then(function (res) { return store(req, res); }).catch(function () {
    return caches.match(req).then(function (hit) {
      return hit || (req.mode === 'navigate' ? caches.match('/') : Response.error());
    });
  }));
});

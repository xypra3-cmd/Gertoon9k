// Digital Card service worker — installable app + offline app shell.
// Privacy: only same-origin static files are cached. API calls (Supabase: contacts, cards, auth)
// always go to the network and are never stored on the device by this worker.
const VERSION = 'v1';
const SHELL = `dc-shell-${VERSION}`;
const ASSETS = `dc-assets-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(['/index.html', '/manifest.webmanifest', '/favicon.svg', '/theme-init.js']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dc-') && k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, Turnstile, QPay images: untouched

  // Pages: network first (always the newest deploy), cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // /c/* pages carry per-card OG tags; keep the plain shell from other routes.
          if (res.ok && !url.pathname.startsWith('/c/')) {
            const copy = res.clone();
            void caches.open(SHELL).then((c) => c.put('/index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r ?? Response.error())),
    );
    return;
  }

  // Hashed build files never change: cache first.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              void caches.open(ASSETS).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

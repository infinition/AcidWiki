const CACHE_NAME = 'acidwiki-v3';
const STATIC_ASSETS = [
    './',
    './index.html',
    './wiki/config.js',
    './wiki/manifest.pwa.json',
    './wiki/assets/logo.png'
];

// Install Event - Cache Static Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] Caching static assets');
            // Cache assets one by one to avoid failing install on a single missing resource.
            await Promise.all(STATIC_ASSETS.map(async (url) => {
                try {
                    const req = new Request(url, { cache: 'no-cache' });
                    const res = await fetch(req);
                    if (res && res.ok) await cache.put(req, res.clone());
                } catch (_) {
                    // Ignore optional/missing asset during install.
                }
            }));
        })
    );
    self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Strategy: Stale-While-Revalidate for most assets
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((response) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // Cache the new response
                    if (networkResponse.ok) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // If network fails, we already returned the cached response if it exists
                });

                return response || fetchPromise;
            });
        })
    );
});


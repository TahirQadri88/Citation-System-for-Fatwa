// Masaadir Service Worker
// Caches the app shell for offline access and fast loading

const CACHE_NAME = 'masaadir-v1';
const APP_SHELL = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icons/icon.svg'
];

// Install: cache the app shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch: serve from cache for app shell, network-first for Firebase
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Let Firebase, Google APIs, CDN calls go straight to network
    if (
        url.hostname.includes('firebase') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('gstatic') ||
        url.hostname.includes('google') ||
        url.hostname.includes('tailwindcss') ||
        url.hostname.includes('cloudflare') ||
        url.hostname.includes('fonts.googleapis') ||
        url.hostname.includes('fonts.gstatic') ||
        url.hostname.includes('cdnjs')
    ) {
        return; // Default browser fetch — no SW interference
    }

    // For app shell files: serve from cache, update in background (stale-while-revalidate)
    event.respondWith(
        caches.match(event.request).then(cached => {
            const networkFetch = fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => cached); // If network fails, fall back to cache

            return cached || networkFetch;
        })
    );
});

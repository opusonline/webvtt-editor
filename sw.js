var _cacheName = 'v2';
var _filesToCache = [
    '/webvtt-editor/',
    '/webvtt-editor/index.html',
    '/webvtt-editor/manifest.json',
    '/webvtt-editor/images/icons/favicon.ico',
    '/webvtt-editor/images/icons/favicon-32x32.png',
    '/webvtt-editor/images/icons/favicon-16x16.png',
    '/webvtt-editor/images/icons/android-icon-192x192.png',
    '/webvtt-editor/images/icons/android-icon-512x512.png',
    '/webvtt-editor/styles.css',
    '/webvtt-editor/app.js'
];

/* Start the service worker and cache all of the app's content */
self.addEventListener('install', function(event) {
    self.skipWaiting();
    event.waitUntil(
        caches.open(_cacheName)
            .then(function(cache) {
                return cache.addAll(_filesToCache);
            })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.map(key => {
                    if (key !== _cacheName) {
                        return caches.delete(key);
                    }
                })
            ))
    );
    self.clients.claim();
});

/* Serve cached content when offline */
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
        .then(function(response) {
            if (response) {
                return response;
            }
            return fetch(event.request)
                .catch(function() {
                    return new Response('<h1>Service Unavailable</h1>', {
                        'status': 503,
                        'statusText': 'Service Unavailable',
                        'headers': {'Content-Type': 'text/html'}
                    });
                });
        })
    );
});
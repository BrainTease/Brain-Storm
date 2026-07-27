// Service Worker for Brain-Storm PWA
// Enables offline access to cached content and updates handling

const CACHE_NAME = 'brain-storm-v1';
const RUNTIME_CACHE = 'brain-storm-runtime-v1';
const FONT_CACHE = 'brain-storm-fonts-v1';
const IMAGE_CACHE = 'brain-storm-images-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
];

// Cache strategy for static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== RUNTIME_CACHE &&
            cacheName !== FONT_CACHE &&
            cacheName !== IMAGE_CACHE
          ) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network first strategy for API calls with fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API calls (network first, cache fallback)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then(c => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Handle fonts (cache first)
  if (url.pathname.match(/\.(woff2?|ttf|otf)$/)) {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache => {
        return cache.match(request).then(response => {
          return response || fetch(request).then(fetchResponse => {
            cache.put(request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // Handle images (cache first)
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(request).then(response => {
          return response || fetch(request).then(fetchResponse => {
            cache.put(request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // Default: Cache first for static assets, network first for others
  if (request.destination === 'document' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(fetchResponse => {
          const cache = caches.open(CACHE_NAME);
          cache.then(c => c.put(request, fetchResponse.clone()));
          return fetchResponse;
        });
      })
    );
  }
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── IndexedDB sync queue ──────────────────────────────────────────────────────

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('brain-storm-sync', 1);
    req.onupgradeneeded = e => {
      const store = e.target.result.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
      store.createIndex('timestamp', 'timestamp', { unique: false });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function enqueueRequest(method, url, body) {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync-queue', 'readwrite');
    tx.objectStore('sync-queue').add({ method, url, body, timestamp: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}

async function flushQueue() {
  const db = await openSyncDB();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction('sync-queue', 'readonly');
    const req = tx.objectStore('sync-queue').getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });

  for (const item of items) {
    try {
      await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body,
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('sync-queue', 'readwrite');
        tx.objectStore('sync-queue').delete(item.id);
        tx.oncomplete = resolve;
        tx.onerror = e => reject(e.target.error);
      });
    } catch {
      // leave in queue for next sync attempt
    }
  }
}

// ── Background sync ───────────────────────────────────────────────────────────

self.addEventListener('sync', event => {
  if (event.tag === 'progress-sync') {
    event.waitUntil(flushQueue());
  }
});

// ── Intercept offline non-GET API calls ───────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' && url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        const body = await request.text().catch(() => null);
        await enqueueRequest(request.method, request.url, body);
        return Response.json({ queued: true }, { status: 202 });
      })
    );
  }
});

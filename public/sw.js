const CACHE_NAME = 'mealdeal-v2'
const IMAGE_CACHE = 'mealdeal-images-v1'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/logo-icon.png',
]

// Max Bilder im Cache (verhindert unkontrolliertes Wachstum)
const MAX_IMAGE_CACHE_SIZE = 200

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== IMAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

/**
 * Prüfe ob URL ein Bild ist das gecacht werden soll
 */
function isCacheableImage(url) {
  const hostname = url.hostname
  const pathname = url.pathname

  // Supabase Storage Bilder (recipe-images Bucket)
  if (hostname.includes('supabase.co') && (pathname.includes('/recipe-images/') || pathname.includes('/render/image/'))) {
    return true
  }

  // Unsplash Bilder
  if (hostname.includes('unsplash.com') || hostname.includes('images.unsplash.com')) {
    return true
  }

  // Marktguru Produktbilder
  if (hostname.includes('marktguru') || hostname.includes('mgcdn')) {
    return true
  }

  return false
}

/**
 * Cache-Größe begrenzen (FIFO)
 */
async function trimCache(cacheName, maxSize) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > maxSize) {
    // Älteste Einträge löschen
    const toDelete = keys.slice(0, keys.length - maxSize)
    await Promise.all(toDelete.map((key) => cache.delete(key)))
  }
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip Supabase API calls (auth, REST, realtime) — aber NICHT Storage/Render
  if (url.hostname.includes('supabase') && !url.pathname.includes('/storage/') && !url.pathname.includes('/render/')) {
    return
  }

  // Bilder: Cache-first mit Netzwerk-Fallback
  if (isCacheableImage(url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached

          return fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone()
              cache.put(request, clone).then(() => trimCache(IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE))
            }
            return response
          }).catch(() => {
            // Offline: kein Bild verfügbar
            return new Response('', { status: 404 })
          })
        })
      )
    )
    return
  }

  // Navigation requests: network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    )
    return
  }

  // Static assets (JS, CSS, fonts): cache-first
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }
})

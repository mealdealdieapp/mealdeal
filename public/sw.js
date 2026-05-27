const CACHE_NAME = 'mealdeal-v3'
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

  // Navigation requests: network-first (NUR erfolgreiche Responses cachen)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    )
    return
  }

  // Static assets (JS, CSS, fonts, woff2): cache-first
  // Fonts werden lokal aus /assets/ ausgeliefert (kein Google Fonts CDN mehr).
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff')
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

// ============================================================================
// Web Push Handler
// ============================================================================
// Payload-Format (vom Push-Dispatcher gesendet):
//   { title: string, body: string, url?: string, tag?: string }
// `tag` deduped Notifications gleicher Art (z.B. "weekly_plan_reminder").
// ============================================================================

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'MealDeal', body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'MealDeal'
  const options = {
    body: payload.body || '',
    icon: '/logo-icon.png',
    badge: '/logo-icon.png',
    tag: payload.tag || 'mealdeal-default',
    renotify: false,
    data: {
      url: payload.url || '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Wenn bereits ein App-Tab offen ist, dorthin focussen und navigieren.
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) {
            try {
              client.navigate(targetUrl)
            } catch {
              // navigate kann scheitern (cross-origin), dann egal - tab ist offen
            }
          }
          return
        }
      }
      // Sonst neuen Tab oeffnen.
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// Endpoint-Wechsel (z.B. wenn der Browser die Subscription rotiert).
// Wir schicken die neue Subscription nicht direkt an Supabase - der naechste
// usePushSubscription-Aufruf upserted sie sowieso.
self.addEventListener('pushsubscriptionchange', () => {
  // Optional: hier koennte ein Re-Subscribe + Persist passieren, sobald wir
  // ohne Authentifizierung schreiben duerfen. Aktuell laeuft Persist nur
  // durch eingeloggte App (via Supabase-Session in der Page).
})

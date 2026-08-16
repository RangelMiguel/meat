/* meat PWA — offline shell + static cache */
const CACHE_STATIC = 'meat-static-v1'
const CACHE_PAGES = 'meat-pages-v1'

const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  const keep = new Set([CACHE_STATIC, CACHE_PAGES])
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isApi(url) {
  return url.pathname.startsWith('/api/')
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.webmanifest') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2')
  )
}

function pageCacheKey(url) {
  return new Request(url.origin + url.pathname, { credentials: 'same-origin' })
}

async function putCache(cacheName, request, response) {
  if (!response || !response.ok) return
  try {
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
  } catch (_) {
    /* quota */
  }
}

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req)
  if (cached) {
    fetch(req)
      .then((res) => {
        if (res && res.ok) putCache(cacheName, req, res)
      })
      .catch(() => undefined)
    return cached
  }
  const res = await fetch(req)
  if (res && res.ok) await putCache(cacheName, req, res)
  return res
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (!isSameOrigin(url) || isApi(url)) return

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req, CACHE_STATIC))
    return
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req)
          if (res && res.ok) await putCache(CACHE_PAGES, pageCacheKey(url), res)
          return res
        } catch (_) {
          const pages = await caches.open(CACHE_PAGES)
          return (
            (await pages.match(pageCacheKey(url))) ||
            (await caches.match('/')) ||
            new Response(
              '<!doctype html><html><body style="font-family:system-ui;background:#f3f0e8;color:#1f2a24;padding:2rem"><h1>Offline</h1><p>Open meat once while online to use it offline.</p></body></html>',
              { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
            )
          )
        }
      })(),
    )
  }
})

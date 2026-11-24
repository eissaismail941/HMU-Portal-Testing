/* HMU test portal: public shell only. Never cache credentials, API data or PDFs. */
'use strict';
const PREFIX = 'hmu-test-public-shell-';
const CACHE = PREFIX + 'v2';
const SHELL = new URL('./hmu-unified-test-v3-fast-refresh.html', self.location.href).href;
const LOGO = new URL('/MedHub/reader/assets/hmu-logo.png', self.location.origin).href;
const ICON = new URL('/MedHub/icon-192.png.png', self.location.origin).href;
const ASSETS = new Set([LOGO, ICON]);
const MARKER = 'HMU public app shell: cache-safe static HTML';
let refresh = null;
function cacheable(response, type) {
  const cc = response.headers.get('Cache-Control') || '';
  return response.ok && response.status === 200 && !response.redirected &&
    response.type !== 'opaque' && !/\b(?:private|no-store)\b/i.test(cc) &&
    (response.headers.get('Content-Type') || '').toLowerCase().includes(type);
}
async function updateShell() {
  if (refresh) return refresh;
  refresh = (async () => {
    const response = await fetch(SHELL, {cache:'no-store', credentials:'omit', redirect:'error'});
    if (cacheable(response, 'text/html') && (await response.clone().text()).includes(MARKER)) {
      try { await (await caches.open(CACHE)).put(SHELL, response.clone()); } catch (_) {}
    } else if (response.ok) {
      // A deployment that is no longer marked as a public shell must not remain cached.
      try { await (await caches.open(CACHE)).delete(SHELL); } catch (_) {}
    }
    return response;
  })();
  try { return await refresh; } finally { refresh = null; }
}
async function updateAsset(url) {
  const response = await fetch(url, {cache:'no-cache', credentials:'omit', redirect:'error'});
  if (cacheable(response, 'image/')) {
    try { await (await caches.open(CACHE)).put(url, response.clone()); } catch (_) {}
  }
  return response;
}
async function cached(url) { try { return await (await caches.open(CACHE)).match(url); } catch (_) { return undefined; } }
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // First installation must never prevent the site from operating normally.
    await Promise.allSettled([updateShell(), ...[...ASSETS].map(updateAsset)]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try { for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key); } catch (_) {}
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('authorization') || request.headers.has('apikey') || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const shellURL = new URL(SHELL);
  const isShell = request.mode === 'navigate' && url.pathname === shellURL.pathname &&
    [...url.searchParams.keys()].every(key => key === 'utm_source' || key === 'utm_medium' || key === 'utm_campaign');
  const isAsset = request.destination === 'image' && ASSETS.has(url.href);
  if (!isShell && !isAsset) return;
  const key = isShell ? SHELL : url.href;
  // Serve the local public layout immediately; check for newer files in parallel.
  // Cache only explicit static URLs. All authentication and lecture requests bypass this worker.
  const local = cached(key);
  const network = (isShell ? updateShell() : updateAsset(key)).catch(() => null);
  event.waitUntil(network.then(() => undefined));
  event.respondWith((async () => {
    const hit = await local;
    if (hit) return hit;
    const response = await network;
    if (response) return response.clone();
    return fetch(request);
  })());
});

/*
 * Service Timer service worker: keeps the app opening with no internet
 * (Product Plan, section 6.1). The timer's own data is stored by the app;
 * this only keeps the pages and their files.
 *
 * - Pages: the network first, but if it hasn't answered in 3 seconds (or is
 *   down), the saved copy. A fresh copy is saved whenever the network answers.
 * - Build files (/_next/static, hashed names) and images: saved once, then
 *   served from the cache.
 * - The API and live sync are on another origin and are never touched.
 * - After each load the app asks us to "warm" the main pages: we fetch them
 *   and every file they use, so even a display window that was never opened
 *   works offline.
 */
const VERSION = "v1";
const PAGES = `st-pages-${VERSION}`;
const ASSETS = `st-assets-${VERSION}`;
const CORE_PAGES = ["/control", "/display", "/login"];
const NAV_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(warm(CORE_PAGES).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("st-") && key !== PAGES && key !== ASSETS) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "warm" && Array.isArray(event.data.urls)) {
    event.waitUntil(
      warm(event.data.urls)
        .then(() => event.source && event.source.postMessage({ type: "warmed" }))
        .catch(() => undefined),
    );
  }
});

const isAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/_next/image") ||
  url.pathname.startsWith("/assets/") ||
  /\.(png|ico|svg|webp|jpg|woff2?)$/.test(url.pathname);

/** Pages are saved by path, so /login?expired=1 uses the /login copy. */
const pageKey = (url) => new Request(url.origin + url.pathname);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;

  if (req.mode === "navigate") {
    event.respondWith(page(req, url));
  } else if (isAsset(url)) {
    event.respondWith(asset(req));
  } else {
    // Data for client-side navigation: network, then whatever was saved.
    event.respondWith(fetch(req).catch(() => caches.match(req).then((r) => r || Response.error())));
  }
});

async function page(req, url) {
  const cache = await caches.open(PAGES);
  const network = fetch(req).then((res) => {
    if (res.ok) cache.put(pageKey(url), res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch {
    // Offline: fall through to the saved copy.
  }
  const saved = await cache.match(pageKey(url));
  if (saved) return saved;
  // Slow but not down: wait for the network after all.
  try {
    return await network;
  } catch {
    return offlinePage();
  }
}

async function asset(req) {
  const cache = await caches.open(ASSETS);
  const saved = await cache.match(req);
  if (saved) return saved;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

/** Saves the pages and every build file they reference (CSS fonts included). */
async function warm(paths) {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  const seen = new Set();

  const saveAsset = async (path) => {
    if (seen.has(path)) return;
    seen.add(path);
    const req = new Request(new URL(path, self.location.origin));
    if (await assets.match(req)) return;
    const res = await fetch(req);
    if (!res.ok) return;
    if (path.endsWith(".css")) {
      // Fonts are referenced from the CSS, not the page.
      const css = await res.clone().text();
      await Promise.all(refs(css).map((p) => saveAsset(p).catch(() => undefined)));
    }
    await assets.put(req, res);
  };

  for (const path of [...new Set(paths)]) {
    const url = new URL(path, self.location.origin);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) continue;
    const html = await res.clone().text();
    await pages.put(pageKey(url), res);
    await Promise.all(refs(html).map((p) => saveAsset(p).catch(() => undefined)));
  }
}

/** /_next/static and /_next/image paths in HTML, RSC payloads or CSS. */
function refs(text) {
  const out = new Set();
  const re = /\/_next\/(?:static\/[^"'\s)\\]+|image\?[^"'\s)\\]+)/g;
  let m;
  while ((m = re.exec(text))) out.add(m[0].replace(/&amp;/g, "&"));
  out.add("/assets/logo/cw-mark.png");
  return [...out];
}

function offlinePage() {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline</title>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f9fafb;color:#0a0a0a">
<div style="max-width:28rem;padding:1.5rem;text-align:center">
<p style="font-weight:600;font-size:1.125rem">You're offline</p>
<p style="color:#737373">This page hasn't been opened on this device before, so it can't load without the internet.
<a href="/control" style="color:#0c5fb3">Open the timer</a></p></div></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
  );
}

/* PAHAD+ service worker: shows push notifications and opens the right page when one is tapped. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/*
 * Offline E-Passes: the app saves the holder's ready passes in PASS_CACHE (see OfflinePasses). Pass pages are
 * fetched from the network first (so a revoked pass updates), and fall back to the saved copy with no signal.
 * The app's built files (/_next/static, never change) are kept so the saved page still looks right offline.
 */
const PASS_CACHE = "pahad-plus-passes-v1";
const STATIC_CACHE = "pahad-plus-static-v1";
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.open(STATIC_CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (req.mode === "navigate" && url.pathname.startsWith("/plus/pass/")) {
    const key = url.origin + url.pathname;
    event.respondWith(fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        event.waitUntil(caches.open(PASS_CACHE).then(async (c) => { if (await c.match(key)) await c.put(key, copy); }).catch(() => null));
      }
      return res;
    }).catch(async () => (await caches.match(key, { cacheName: PASS_CACHE })) || Response.error()));
  }
});

self.addEventListener("push", (event) => {
  let msg = { title: "PAHAD+", body: "", url: "/plus" };
  try {
    msg = { ...msg, ...event.data.json() };
  } catch {
    if (event.data) msg.body = event.data.text();
  }
  const url = typeof msg.url === "string" && msg.url.startsWith("/plus") ? msg.url : "/plus";
  event.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: "/icons/plus-192.png",
      badge: "/icons/plus-192.png",
      tag: msg.tag,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/plus";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) if (new URL(w.url).pathname.startsWith("/plus") && "focus" in w) return w.navigate(url).then((c) => (c || w).focus());
      return self.clients.openWindow(url);
    }),
  );
});

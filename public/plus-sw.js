/* PAHAD+ service worker: shows push notifications and opens the right page when one is tapped. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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

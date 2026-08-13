/* 海钓时刻助手 · Service Worker（离线缓存）
   策略：页面网络优先（潮汐更新后线上自动刷新，断网回退缓存）；
        图标等静态资源缓存优先；天气等外部 API 一律直连网络。 */
const VER = "haidiao-v1.0.0";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "og-cover.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VER).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // Open-Meteo 等外部请求直连

  const isPage = e.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  if (isPage) {
    // 页面：网络优先，断网回缓存
    e.respondWith(
      fetch(e.request).then(r => {
        const cp = r.clone();
        caches.open(VER).then(c => c.put(e.request, cp));
        return r;
      }).catch(() => caches.match(e.request).then(m => m || caches.match("./")))
    );
    return;
  }
  // 静态资源：缓存优先，首次网络回填
  e.respondWith(
    caches.match(e.request).then(m => m || fetch(e.request).then(r => {
      const cp = r.clone();
      caches.open(VER).then(c => c.put(e.request, cp));
      return r;
    }))
  );
});

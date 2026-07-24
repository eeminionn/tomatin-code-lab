const CACHE_NAME = "tomatin-code-lab-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./404.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./assets/favicon.svg",
  "./assets/tomatin-hero.png",
  "./js/admin.js",
  "./js/app.js",
  "./js/auth.js",
  "./js/github.js",
  "./js/missions.js",
  "./js/runner.js",
  "./js/store.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

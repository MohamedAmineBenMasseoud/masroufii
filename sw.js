// sw.js: keeps the app working offline. Bump CACHE_NAME whenever files change so phones get the new version.
const CACHE_NAME = "masrofi-v0.1-step4-lottie-step5-reminders-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/amountInput.js",
  "./js/calc.js",
  "./js/daily.js",
  "./js/reminders.js",
  "./js/expenses.js",
  "./js/i18n.js",
  "./js/icons.js",
  "./js/lang/en.js",
  "./js/lang/fr.js",
  "./js/lang/ar.js",
  "./js/modal.js",
  "./js/months.js",
  "./js/store.js",
  "./js/slide.js",
  "./js/theme.js",
  "./js/utils.js",
  "./js/weeks.js",
  "./js/views/dashboard.js",
  "./js/views/addExpense.js",
  "./js/views/history.js",
  "./js/views/monthPlan.js",
  "./js/views/onboarding.js",
  "./js/views/parts.js",
  "./js/views/savings.js",
  "./js/views/profile.js",
  "./js/lottie.js",
  "./js/vendor/lottie_light.min.js",
  "./assets/lottie/empty.json",
  "./assets/lottie/loading.json",
  "./assets/lottie/refresh.json",
  "./assets/lottie/success.json",
  "./manifest.webmanifest",
  "./assets/SavingGoal.jpg",
  "./assets/logo/FullLogo_Transparent.png",
  "./assets/logo/IconOnly_Transparent.png",
  "./assets/logo/icon-192.png",
  "./assets/logo/icon-512.png",
  "./assets/icons/bullseye.png",
  "./assets/icons/calendar.png",
  "./assets/icons/coffee.png",
  "./assets/icons/dashboard.png",
  "./assets/icons/edit-outline.png",
  "./assets/icons/edit.png",
  "./assets/icons/entertainment.png",
  "./assets/icons/file-send.png",
  "./assets/icons/food.png",
  "./assets/icons/history.png",
  "./assets/icons/phone.png",
  "./assets/icons/sack-dollar.png",
  "./assets/icons/savings.png",
  "./assets/icons/shopping.png",
  "./assets/icons/snacks.png",
  "./assets/icons/study.png",
  "./assets/icons/uninstall.png",
  "./assets/icons/water.png",
];

self.addEventListener("install", (event) => {
  // add files one by one: a single missing file must not stop the whole install
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          if (event.request.url.startsWith(self.location.origin)) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("./");
      }
    })
  );
});

const CACHE_NAME = 'translator-v4-20260913';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest'
];

// 安裝
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 啟用：清除舊版快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// 請求處理
self.addEventListener('fetch', event => {
  const request = event.request;

  // 只處理 GET
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 外部 API 不攔截，直接走網路
  if (url.origin !== self.location.origin) {
    return;
  }

  // GitHub Pages 網站內容：優先網路，失敗再使用快取
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html')
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy));

            return response;
          }

          return caches.match(request);
        })
        .catch(() => caches.match(request))
    );

    return;
  }

  // 其他同網域靜態資源：快取優先
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then(response => {
            if (!response || !response.ok) {
              return response;
            }

            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy));

            return response;
          });
      })
  );
});

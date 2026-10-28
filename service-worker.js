const CACHE_NAME = 'kotaro-kampo-cache-v32';

// インストール時にすぐに有効化する
self.addEventListener('install', event => {
  self.skipWaiting();
});

// 古いキャッシュのクリーンアップ
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('kotaro-kampo-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network First, falling back to cache
self.addEventListener('fetch', event => {
  // GETリクエストのみ対象とする
  if (event.request.method !== 'GET') return;

  // URLスキームがhttp/https以外のもの（chrome-extension等）はキャッシュしない
  if (!event.request.url.startsWith('http')) return;

  // HTMLやJSONファイル、またはナビゲーションリクエストの場合はブラウザのキャッシュを無視してサーバーから取得
  let fetchOptions = {};
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.json')) {
    fetchOptions.cache = 'no-cache';
  }

  event.respondWith(
    fetch(event.request, fetchOptions)
      .then(networkResponse => {
        // ネットワークから正常に取得できた場合はキャッシュを上書き更新
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      })
      .catch(async () => {
        // ネットワークエラー時（オフライン時）はキャッシュから返す
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // キャッシュにもない場合はそのままエラーにする
        throw new Error('Network request failed and no cache available');
      })
  );
});

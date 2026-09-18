// PWA Service Worker (V2.5.15)
const CACHE_NAME = 'arith-study-v2.6.6-g2-units';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/config.js',
  '/js/registries.js',
  '/js/schema.js',
  '/js/migration.js',
  '/js/storage.js',
  '/js/validator.js',
  '/js/templates_math.js',
  '/js/templates_units_p1.js',
  '/js/templates_units_p2.js',
  '/js/templates_g2_extra.js',
  '/js/templates_figures_g1.js',
  '/js/templates_figures_g2.js',
  '/js/question_source.js',
  '/js/learning_engine.js',
  '/js/learning_score_engine.js',
  '/js/level_engine.js',
  '/js/review_engine.js',
  '/js/unit_selector.js',
  '/js/gamification_engine.js',
  '/js/test_engine.js',
  '/js/session_coordinator.js',
  '/js/parent_dashboard.js',
  '/js/ui.js',
  '/js/audio.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// インストール時：キャッシュプリフェッチ
self.addEventListener('install', e =>
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('[SW] キャッシュ失敗:', err))
  )
);

// フェッチ時：キャッシュから返す or ネットワーク
self.addEventListener('fetch', e =>
  e.respondWith(
    caches.match(e.request)
      .then(response => response || fetch(e.request))
      .catch(err => console.error('[SW] フェッチ失敗:', e.request.url, err))
  )
);

// 古いキャッシュ削除
self.addEventListener('activate', e =>
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  )
);
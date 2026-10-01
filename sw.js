// PWA Service Worker (V2.9.1)
const CACHE_NAME = 'arith-study-v2.9.1-hissan';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/config.js',
  '/js/registries.js',
  '/js/diversity_selector.js',
  '/js/schema.js',
  '/js/migration.js',
  '/js/storage.js',
  '/js/figure_svg.js',
  '/js/validator.js',
  '/js/templates_math.js',
  '/js/templates_units_p1.js',
  '/js/templates_units_p2.js',
  '/js/templates_g2_extra.js',
  '/js/templates_figures_g1.js',
  '/js/templates_figures_g2.js',
  '/js/templates_figures_g3.js',
  '/js/clock_svg.js',
  '/js/templates_clock.js',
  '/js/hissan_svg.js',
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

// メッセージ受信：クライアントからの SKIP_WAITING 要求に応答
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// インストール時：キャッシュプリフェッチ & 直ちに有効化待機へ
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('[SW] キャッシュ失敗:', err))
  );
});

// フェッチ時：キャッシュから返す or ネットワーク
self.addEventListener('fetch', e =>
  e.respondWith(
    caches.match(e.request)
      .then(response => response || fetch(e.request))
      .catch(err => console.error('[SW] フェッチ失敗:', e.request.url, err))
  )
);

// 古いキャッシュ削除 & 即座にクライアントを制御下に置く
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});
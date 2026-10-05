// 오프라인 지원(서비스 워커). 야구장은 인터넷이 약한 곳이 많아, 한 번 연 앱은 인터넷 없이도 열리게 한다.
// - 화면(index.html): 인터넷이 되면 새 버전을 받고, 안 되면 저장해 둔 것을 연다. (새 버전이 바로 반영되게)
// - 그림·코드 파일: 저장해 둔 것을 먼저 쓴다. 빌드할 때 파일 이름이 바뀌므로 오래된 파일이 남지 않는다.
// 기록 데이터는 여기서 다루지 않는다. (브라우저 로컬 저장소에 따로 있다)

const CACHE = 'yagumam-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

/** index.html이 쓰는 빌드 파일(assets/...)도 처음 설치할 때 함께 저장한다. */
async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);
  const html = await (await fetch('./index.html', { cache: 'no-store' })).text();
  const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll(assets);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('./index.html', response.clone());
    return response;
  } catch {
    return (await cache.match('./index.html')) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? networkFirst(request) : cacheFirst(request));
});

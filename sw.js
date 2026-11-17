/* Planique 서비스 워커
   - 화면(index.html): 항상 네트워크 먼저 → 새 버전이 바로 반영됨. 인터넷이 끊겼을 때만 저장해 둔 화면 사용
   - 아이콘·manifest: 저장해 둔 것을 먼저 쓰고 뒤에서 새로 받아 둠
   - 다른 사이트 요청(Firebase·googleapis·gstatic·글꼴 CDN)은 전혀 건드리지 않음 → 잠금·동기화는 지금과 똑같이 동작
   아이콘을 바꿨다면 아래 CACHE 이름의 숫자를 올려 주세요. (index.html만 바꿀 때는 그대로 둬도 됩니다) */
const CACHE = "planique-v1";
const CORE = [
  "./",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("planique-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Firebase 등 외부 요청은 그대로 통과

  const isPage = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  if (isPage) {
    // 네트워크 우선 (브라우저 캐시도 건너뛰어 GitHub Pages의 최신 파일을 받음)
    e.respondWith(
      fetch(req.url, { cache: "no-store", credentials: "same-origin" })
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./", copy)); }
          return res;
        })
        .catch(() => caches.match("./"))
    );
    return;
  }

  // 아이콘 등: 저장본 먼저, 뒤에서 새로 받아 갱신
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

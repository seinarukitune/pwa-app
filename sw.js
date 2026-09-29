/* 介護のことば / Kaigo Words — オフラインで動かすための仕組み。
   ビルドのたびに CACHE の名前が変わるので、古い控えは自動で消える。
   Service worker: app shell cache. The cache name is stamped at build time,
   so a new build replaces the old copy automatically. */
var CACHE = "kaigo-words-20260930-002650";
var SHELL = "./index.html";
var ASSETS = ["./", SHELL, "./manifest.webmanifest",
              "./icon-192.png", "./icon-512.png",
              "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ASSETS); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        return k === CACHE ? Promise.resolve() : caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  /* 画面を開くときは、まず新しいものを取りに行き、つながらなければ控えを使う。
     こうすると、圏内で開いたときに最新版へ、圏外でも今までどおり動く。 */
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(SHELL, copy); });
        return res;
      }).catch(function(){
        return caches.match(SHELL).then(function(r){ return r || caches.match("./"); });
      })
    );
    return;
  }
  e.respondWith(caches.match(req).then(function(r){ return r || fetch(req); }));
});

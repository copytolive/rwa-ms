const CACHE="rwa-ms-real-market-v3";
const CORE=[
  "./","./index.html","./styles.css","./app.js","./launch-profile.json","./manifest.webmanifest","./icon.svg",
  "./vendor/lightweight-charts.standalone.production.js","./vendor/LIGHTWEIGHT_CHARTS_LICENSE.txt",
  "./data/hyperliquid-meta.json","./data/btc-candles-1h.json","./data/btc-book.json","./data/btc-funding.json","./data/snapshot-meta.json"
];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin==="https://api.hyperliquid.xyz"||url.protocol==="wss:")return;
  event.respondWith(fetch(event.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return res}).catch(()=>caches.match(event.request)));
});

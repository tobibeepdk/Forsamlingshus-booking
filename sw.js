const VERSION='2.6.2';
const SCOPE=self.registration.scope;
const PREFIX='hjortemosen-'+SCOPE+'-';
const CACHE=PREFIX+VERSION;
const clientVersions=new Map();
const legacy=name=>/^hjortemosen-pwa-v1\./.test(name);
const ASSETS=['./','./index.html','./styles.css?v=2.6.2','./data.js?v=2.6.2','./app.js?v=2.6.2','./backup.js?v=2.6.2','./native-bridge.js?v=2.6.2','./contract-libs.js?v=2.6.2','./contracts.js?v=2.6.2','./signature-pad.js?v=2.6.2','./contract-ui.js?v=2.6.2','./manifest.webmanifest','./faelleshus.jpg?v=2.6.2','./favicon.svg?v=2.6.2','./icon-192.png?v=2.6.2','./icon-512.png?v=2.6.2','./apple-touch-icon.png?v=2.6.2','./kontrakt-1000.pdf?v=2.6.2','./kontrakt-1000.docx?v=2.6.2','./kontrakt-1500.pdf?v=2.6.2'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);await cache.addAll(ASSETS);
 // v1 has no update button. Activate its first upgrade without reloading a form.
 const keys=await caches.keys();
 if(!keys.some(k=>k.startsWith(PREFIX)&&k!==CACHE)) {
  for(const key of keys.filter(legacy)) {
   const old=await caches.open(key),requests=await old.keys();
   if(requests.some(r=>r.url.startsWith(SCOPE))){await self.skipWaiting();break;}
  }
 }
})()));
async function cleanUnusedCaches(){
 const clients=(await self.clients.matchAll({type:'window'})).filter(c=>c.url.startsWith(SCOPE));
 for(const client of clients)if(!clientVersions.has(client.id))client.postMessage({type:'REPORT_VERSION'});
 // An old open page may still need its old scripts or documents while offline.
 if(clients.some(c=>clientVersions.get(c.id)!==VERSION))return;
 for(const key of await caches.keys()) {
  if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  else if(legacy(key)) {
   const cache=await caches.open(key);
   for(const req of await cache.keys())if(req.url.startsWith(SCOPE))await cache.delete(req);
   if(!(await cache.keys()).length)await caches.delete(key);
  }
 }
}
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
 if(event.data?.type==='CLIENT_VERSION'&&event.source?.id){clientVersions.set(event.source.id,event.data.version);event.waitUntil(cleanUnusedCaches());}
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();await cleanUnusedCaches();})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin||!url.href.startsWith(SCOPE))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),cached=await cache.match(event.request);
  if(cached)return cached;
  for(const key of await caches.keys()) {
   if(key===CACHE||!(key.startsWith(PREFIX)||legacy(key)))continue;
   const previous=await (await caches.open(key)).match(event.request);
   if(previous)return previous;
  }
  try{return await fetch(event.request);}
  catch{
   if(event.request.mode==='navigate')return await cache.match(new URL('./index.html',SCOPE).href);
   return new Response('Filen er ikke tilgængelig offline.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }
 })());
});

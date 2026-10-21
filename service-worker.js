const VERSION='v1.0.9';
const CACHE='duolingo-voca-'+VERSION;
const BASE=new URL('./',self.location.href);
const INDEX=new URL('index.html',BASE).href;
const CORE=[INDEX,new URL('vendor/xlsx.mini.min.js',BASE).href];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const responses=await Promise.all(CORE.map(url=>fetch(new Request(url,{cache:'reload'}))));
    if(responses.some(response=>!response.ok))throw new Error('Offline assets unavailable');
    const html=await responses[0].clone().text();
    if(!html.includes("const APP_VERSION='"+VERSION+"';"))throw new Error('App version mismatch');
    await Promise.all(responses.map((response,i)=>cache.put(CORE[i],response)));
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('duolingo-voca-')&&name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==BASE.origin||!url.href.startsWith(BASE.href))return;
  const navigation=event.request.mode==='navigate';
  const asset=CORE.find(core=>new URL(core).pathname===url.pathname);
  if(!navigation&&!asset)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),key=navigation?INDEX:asset;
    const cached=await cache.match(key);if(cached)return cached;
    const response=await fetch(event.request);return response;
  })());
});
self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING'){self.skipWaiting();return;}
  if(event.data&&event.data.type==='OFFLINE_STATE'&&event.ports[0]){
    event.waitUntil((async()=>{
      const cache=await caches.open(CACHE);
      const found=await Promise.all(CORE.map(url=>cache.match(url)));
      event.ports[0].postMessage({version:VERSION,ready:found.every(Boolean)});
    })());
  }
});

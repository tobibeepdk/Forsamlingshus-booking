const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const scope='https://example.test/Forsamlingshus-booking/';
function worker(seed={},clients=[]) {
 const bins=new Map(),handlers=new Map();let offline=false,skipped=false;
 const urlOf=request=>typeof request==='string'?new URL(request,scope).href:request.url;
 function bin(name){if(!bins.has(name))bins.set(name,new Map());const map=bins.get(name);return {async addAll(urls){const items=urls.map(u=>{const url=urlOf(u),p=new URL(url).pathname.slice(new URL(scope).pathname.length)||'index.html';return [url,new Response(fs.readFileSync(path.join(__dirname,'..',p)))];});for(const [u,r] of items)map.set(u,r);},async match(req){return map.get(urlOf(req))?.clone()},async keys(){return [...map.keys()].map(url=>({url}))},async delete(req){return map.delete(urlOf(req))},async put(req,res){map.set(urlOf(req),res)}};}
 for(const [name,urls]of Object.entries(seed))for(const [url,body]of Object.entries(urls)){bin(name);bins.get(name).set(url,new Response(body));}
 const ctx=vm.createContext({self:{registration:{scope},location:{origin:'https://example.test'},clients:{claim:async()=>{},matchAll:async()=>clients},skipWaiting:async()=>{skipped=true},addEventListener:(type,fn)=>handlers.set(type,fn)},caches:{open:async name=>bin(name),keys:async()=>[...bins.keys()],delete:async name=>bins.delete(name)},fetch:async()=>{if(offline)throw new Error('offline');return new Response('network')},Response,URL,Map,Promise,console});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8'),ctx);
 async function event(type,props={}){let wait=Promise.resolve();handlers.get(type)({...props,waitUntil:p=>{wait=p}});await wait;}
 async function request(asset,mode='cors'){let reply;handlers.get('fetch')({request:{url:new URL(asset,scope).href,method:'GET',mode},respondWith:p=>reply=p});return await reply;}
 return {bins,event,request,offline:()=>offline=true,skipped:()=>skipped};
}
test('all installed app files and PDF contracts are served offline under a repository path',async()=>{
 const w=worker();await w.event('install');w.offline();for(const asset of ['./','./index.html','./styles.css?v=2.4.0','./data.js?v=2.4.0','./app.js?v=2.4.0','./contract-libs.js?v=2.4.0','./contracts.js?v=2.4.0','./contract-ui.js?v=2.4.0','./signature-pad.js?v=2.4.0','./faelleshus.jpg?v=2.4.0','./icon-192.png?v=2.4.0','./icon-512.png?v=2.4.0','./apple-touch-icon.png?v=2.4.0','./favicon.svg?v=2.4.0','./kontrakt-1000.pdf?v=2.4.0','./kontrakt-1500.pdf?v=2.4.0','./kontrakt-1000.docx?v=2.4.0']){const r=await w.request(asset);assert.equal(r.status,200);assert.ok((await r.arrayBuffer()).byteLength>0);}const fallback=await w.request('./unavailable','navigate');assert.equal(fallback.status,200);assert.equal((await w.request('./missing.png')).status,503);
});
test('activation preserves legacy caches belonging to another repository',async()=>{
 const w=worker({'hjortemosen-pwa-v1.4':{'https://example.test/other/index.html':'other'},'different-app-v3':{'https://example.test/third/':'third'}});await w.event('install');await w.event('activate');assert.ok(w.bins.has('hjortemosen-pwa-v1.4'));assert.ok(w.bins.has('different-app-v3'));
});
test('older open clients can still open their versioned PDF offline after update',async()=>{
 const client={id:'old',url:scope,postMessage(){}};const w=worker({['hjortemosen-'+scope+'-1.9.0']:{[scope+'kontrakt-1000.pdf?v=1.9.0']:'older-pdf'}},[client]);await w.event('install');await w.event('activate');w.offline();const r=await w.request('./kontrakt-1000.pdf?v=1.9.0');assert.equal(r.status,200);assert.equal(await r.text(),'older-pdf');
});
test('obsolete scoped cache remains until every open page reports the new version',async()=>{
 const oldCache='hjortemosen-'+scope+'-1.9.0';
 const clients=[{id:'first',url:scope,postMessage(){}},{id:'second',url:scope,postMessage(){}}];
 const w=worker({[oldCache]:{[scope+'app.js?v=1.9.0']:'old-script'}},clients);
 await w.event('install');await w.event('activate');
 await w.event('message',{source:clients[0],data:{type:'CLIENT_VERSION',version:'2.4.0'}});
 assert.ok(w.bins.has(oldCache));
 await w.event('message',{source:clients[1],data:{type:'CLIENT_VERSION',version:'1.9.0'}});
 assert.ok(w.bins.has(oldCache));
 await w.event('message',{source:clients[1],data:{type:'CLIENT_VERSION',version:'2.4.0'}});
 assert.equal(w.bins.has(oldCache),false);
});
test('legacy shared cache loses only requests belonging to this app',async()=>{
 const key='hjortemosen-pwa-v1.4',other='https://example.test/other/index.html';
 const w=worker({[key]:{[scope+'index.html']:'old-app',[other]:'other-app'}});
 await w.event('install');assert.equal(w.skipped(),true);await w.event('activate');
 assert.equal(w.bins.get(key).has(scope+'index.html'),false);
 assert.ok(w.bins.get(key).has(other));
});

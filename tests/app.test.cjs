const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const KEY = 'hjortemosen_data_v1';
function boot(seed, draft, options={}) {
  const nodes = new Map();
  const events = new Map();
  const prints = [];
  const radioTypes = ['member','friend','board'];
  const viewNames=['dashboard','calendar','booking','documents','settings','renters','blacklist'];
  const node = s => {
    if(s==='[name=renterType]:checked')return radioTypes.map(t=>node(`[name=renterType][value="${t}"]`)).find(r=>r.checked)||null;
    if (!nodes.has(s)) { const classes=new Set(); nodes.set(s, {id:s.startsWith('#')?s.slice(1):'',value:'',checked:false,innerHTML:'',textContent:'',dataset:{},events:{},classList:{add(c){classes.add(c)},remove(c){classes.delete(c)},toggle(c,on){const enabled=on===undefined?!classes.has(c):on;enabled?classes.add(c):classes.delete(c);return enabled;},contains(c){return classes.has(c)}},addEventListener(type,fn){this.events[type]=fn;},reset(){},showModal(){},close(){},focus(){},setAttribute(){},getAttribute(){return null;},querySelector(){return null;}}); }
    return nodes.get(s);
  };
  for(const type of radioTypes){const radio=node(`[name=renterType][value="${type}"]`);radio.value=type;let checked=type==='member';Object.defineProperty(radio,'checked',{get:()=>checked,set:value=>{checked=Boolean(value);if(checked)for(const other of radioTypes)if(other!==type)node(`[name=renterType][value="${other}"]`).checked=false;}});}
  for(const id of viewNames){node('nav-'+id).dataset.view=id;}node('#dashboard').classList.add('active');
  const body=node('body');body.appendChild=()=>{};
  node('#saveRenter').checked = true;
  const store = new Map();
  if (seed !== undefined) store.set(KEY, typeof seed === 'string' ? seed : JSON.stringify(seed));
  if (draft) store.set('hjortemosen_booking_draft_v1', JSON.stringify(draft));
  for(const [key,value] of Object.entries(options.extraStorage||{}))store.set(key,value);
  // Keep VM Array/Object constructors with their literals; PDFLib validates both by instanceof.
  const ctx = vm.createContext({document:{querySelector:node,querySelectorAll:s=>s==='[name=renterType]'?radioTypes.map(t=>node(`[name=renterType][value="${t}"]`)):s==='.view'?viewNames.map(id=>node('#'+id)):s==='[data-view]'?viewNames.map(id=>node('nav-'+id)):s==='[data-back]'?[node('back-button')]:[],addEventListener(){},visibilityState:'visible',createElement:()=>node('link'),body,title:''},localStorage:{getItem:k=>{if(options.unavailable)throw new Error("Storage unavailable");return store.get(k)||null},setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},window:{addEventListener:(type,handler)=>events.set(type,handler),scrollTo(){},print:()=>prints.push({html:node('#calendarPrint').innerHTML,title:ctx.document.title,printing:body.classList.contains('printing-calendar')}),matchMedia:()=>({matches:false})},navigator:{onLine:true,...(options.sw?{serviceWorker:options.sw}:{})},crypto:require('node:crypto').webcrypto,structuredClone,Intl,Date,Number,String,Boolean,JSON,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,Set,Map,URL,Blob,File,console,setTimeout:()=>1,clearTimeout(){},confirm:()=>true,alert(){},fetch:async()=>({ok:true}),location:{hash:'',href:'http://localhost/app/',reload(){}}});
  ctx.document.documentElement=node('html');
  if(options.nativeHandler)ctx.webkit={messageHandlers:{hjortemosen:options.nativeHandler}};
  for(const file of ['data.js','backup.js','native-bridge.js','contract-libs.js','calendar-pdf.js','app.js']) if(fs.existsSync(path.join(__dirname,'..',file))) {vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);if(file==='native-bridge.js')ctx.window.HjortNative=ctx.HjortNative;}
  return {ctx,node,store,events,prints,run:s=>vm.runInContext(s,ctx)};
}
const booking={id:'b1',date:'2026-12-12',name:'Anna',houseNo:'7',phone:'12345678',email:'a@example.dk',type:'member',price:1000,deposit:500,paid:true,depositPaid:false,notes:''};
const seed=()=>({bookings:[{...booking}],renters:[],blacklist:[],settings:{memberPrice:1000,otherPrice:1500,deposit:500}});
test('empty native workspace restores its file before any automatic default backup',async()=>{
 const source={...seed(),backup:{format:'hjortemosen-backup',version:1,dataPresent:true,savedAt:'2026-10-03T20:00:00Z',drafts:{booking:{name:'Native kladde',type:'member',price:'1000',deposit:'500'},contract:null,settings:null,blacklist:null}}};
 const requests=[];let release;const app=boot(undefined,undefined,{nativeHandler:{postMessage:request=>{requests.push(request);return request.action==='readLatest'?new Promise(r=>release=r):Promise.resolve({ok:true,savedAt:'2026-10-03T20:00:01Z',file:'Hjortemosen/seneste-backup.json'});}}});
 await new Promise(r=>setImmediate(r));assert.deepEqual(requests.map(r=>r.action),['readLatest']);assert.equal(app.store.has(KEY),false);await app.ctx.window.saveOpenForms();assert.equal(app.store.size,0);release({ok:true,snapshot:JSON.stringify(source)});await app.ctx.window.HjortAppReady;assert.equal(JSON.parse(app.store.get(KEY)).bookings[0].name,'Anna');assert.equal(app.node('#name').value,'Native kladde');await new Promise(r=>setImmediate(r));assert.equal(JSON.parse(requests.find(r=>r.action==='backup').snapshot).bookings[0].name,'Anna');
});
test('failed native file recovery preserves the file and blocks a default backup',async()=>{
 const requests=[];const app=boot(undefined,undefined,{nativeHandler:{postMessage:request=>{requests.push(request.action);return Promise.resolve({ok:false,error:'Backupfilen kunne ikke læses'});}}});await app.ctx.window.HjortAppReady;assert.equal(app.store.has(KEY),false);assert.deepEqual(requests,['readLatest']);assert.match(app.node('#storageError').textContent,/Backupfilen/);await app.ctx.window.saveOpenForms();assert.equal(app.store.size,0);
});

test('unpaid deposit appears in outstanding total even when rent is paid',()=>{
 const app=boot(seed());app.run('renderStats()');assert.match(app.node('#stats').innerHTML,/500 kr\./);
});
test('garden blacklist also blocks when name is not entered yet',()=>{
 const d=seed();d.blacklist=[{id:'x',name:'Anna',house:'7',reason:'Skader'}];const app=boot(d);app.node('#houseNo').value='7';assert.equal(app.run('checkWarning()'),false);
});
test('friend has a separate configured price',()=>{
 const d=seed();d.settings.friendPrice=1200;const app=boot(d);app.node('[name=renterType]:checked').value='friend';app.run('applyPrice()');assert.equal(Number(app.node('#price').value),1200);
});
test('address survives draft saving',()=>{
 const app=boot(seed());app.node('#name').value='Anna';app.node('#address').value='Skovvej 2';app.run('saveDraft(true)');assert.equal(JSON.parse(app.store.get('hjortemosen_booking_draft_v1')).address,'Skovvej 2');
});
test('zero deposit survives restored draft',()=>{
 const app=boot(seed(),{name:'Anna',date:'2026-12-20',houseNo:'7',phone:'',email:'',notes:'',deposit:0,price:1000});assert.equal(Number(app.node('#deposit').value),0);
});
test('incompatible backup cannot overwrite bookings',async()=>{
 const app=boot(seed());const before=app.store.get(KEY);await app.node('#importData').onchange({target:{files:[{text:async()=>JSON.stringify({bookings:'broken'})}],value:'backup.json'}});assert.equal(app.store.get(KEY),before);
});
test('corrupted local data is preserved and further writes are blocked',()=>{
 const app=boot('{invalid');try{app.run('save()')}catch{}assert.equal(app.store.get(KEY),'{invalid');
});

test('blacklist reasons are preserved when backups are merged',()=>{
 const app=boot(seed());app.run("data.blacklist=[{id:'x',name:'Anna',house:'7',reason:'Skader'}]");
 const input={...seed(),bookings:[],blacklist:[{id:'x',name:'Anna',house:'7',reason:'Manglende betaling'}]};app.ctx.incoming=input;
 const result=app.run('HjortData.merge(data,incoming)');assert.equal(result.blacklist[0].reason,'Skader\nManglende betaling');
});
test('successful save removes both draft and draft indicator',()=>{
 const app=boot(seed());app.run("editBooking('b1')");app.node('#bookingId').value='b1';app.node('#bookingDate').value='2026-12-12';app.node('#name').value='Anna';app.node('#address').value='Testvej 2';app.node('#price').value='1000';app.node('#deposit').value='500';app.run('saveDraft()');
 app.node('#bookingForm').onsubmit({preventDefault(){}});
 assert.equal(app.store.has('hjortemosen_booking_draft_v1'),false);
 assert.equal(app.node('#draftBanner').classList.contains('hidden'),true);
});
test('merging different bookings on the same date is rejected',()=>{
 const app=boot(seed());const incoming=seed();incoming.bookings[0].id='b2';app.ctx.incoming=incoming;assert.throws(()=>app.run('HjortData.merge(data,incoming)'),/allerede booket/);
});
test('merging a changed booking never silently replaces the current one',()=>{
 const app=boot(seed());const incoming=seed();incoming.bookings[0].paid=false;app.ctx.incoming=incoming;assert.throws(()=>app.run('HjortData.merge(data,incoming)'),/andre oplysninger/);
});
test('validation keeps legacy fields and fills missing friend price',()=>{
 const app=boot(seed());assert.equal(app.run('data.settings.friendPrice'),1500);assert.equal(app.run('data.bookings[0].houseNo'),'7');
});
test('duplicate identifiers and impossible dates are rejected',()=>{
 const app=boot(seed());const bad=seed();bad.bookings.push({...booking});app.ctx.bad=bad;assert.throws(()=>app.run('HjortData.validate(bad,true)'),/samme ID/);bad.bookings.pop();bad.bookings[0].date='2026-02-30';assert.throws(()=>app.run('HjortData.validate(bad,true)'),/ugyldig dato/);
});
test('replacement backup rejects different booking IDs on one date',()=>{
 const app=boot(seed()),bad=seed();bad.bookings.push({...booking,id:'b2'});app.ctx.bad=bad;assert.throws(()=>app.run('HjortData.validate(bad,true)'),/samme dato/);
});
test('app remains usable when browser storage is unavailable',()=>{
 assert.doesNotThrow(()=>boot(undefined,undefined,{unavailable:true}));
});
test('reopening same booking preserves autosaved edits',()=>{
 const app=boot(seed());app.run("editBooking('b1')");app.node('#notes').value='Ny aftale';app.run('saveDraft()');app.run("editBooking('b1')");assert.equal(app.node('#notes').value,'Ny aftale');
});
test('merge rejects changed blacklist identity under the same ID',()=>{
 const d=seed();d.blacklist=[{id:'x',name:'Anna',house:'7',reason:'Skader'}];const app=boot(d),incoming=seed();incoming.blacklist=[{id:'x',name:'Bo',house:'8',reason:'Skader'}];app.ctx.incoming=incoming;assert.throws(()=>app.run('HjortData.merge(data,incoming)'),/samme ID/);
});
test('a draft containing only a changed price is still saved',()=>{
 const app=boot(seed());app.node('#price').value='1234';app.node('#deposit').value='500';app.run('saveDraft()');assert.equal(JSON.parse(app.store.get('hjortemosen_booking_draft_v1')).price,'1234');
});
test('backup round trip preserves bookings, renters, blacklist and settings',()=>{
 const d=seed();d.renters=[{id:'r1',name:'Anna',houseNo:'7',address:'Skovvej 2'}];d.blacklist=[{id:'x',name:'Bo',house:'8',reason:'Skader'}];d.settings.friendPrice=1200;
 const app=boot(d);app.ctx.backup=JSON.parse(app.run('backupContents()'));
 const restored=app.run('HjortData.validate(backup,true)');assert.equal(restored.bookings[0].depositPaid,false);assert.equal(restored.renters[0].address,'Skovvej 2');assert.equal(restored.blacklist[0].reason,'Skader');assert.equal(restored.settings.friendPrice,1200);
});
test('import preview does not change data until confirmation',async()=>{
 const app=boot(seed()),before=app.store.get(KEY),incoming=seed();incoming.bookings=[];
 await app.node('#importData').onchange({target:{files:[{text:async()=>JSON.stringify(incoming)}],value:'backup.json'}});
 assert.equal(app.store.get(KEY),before);app.node('#cancelImport').onclick();assert.equal(app.run('pendingImport'),null);
});
test('replacement import keeps a recovery copy of the previous data',async()=>{
 const app=boot(seed()),before=app.store.get(KEY),incoming=seed();incoming.bookings=[];incoming.settings.friendPrice=1200;
 await app.node('#importData').onchange({target:{files:[{text:async()=>JSON.stringify(incoming)}],value:'backup.json'}});
 app.node('[name=importMode]:checked').value='replace';await app.node('#confirmImport').onclick();
 assert.equal(app.store.get('hjortemosen_before_import_v1'),before);assert.equal(JSON.parse(app.store.get(KEY)).bookings.length,0);assert.equal(JSON.parse(app.store.get(KEY)).settings.friendPrice,1200);
});
test('declining replacement leaves existing data untouched',async()=>{
 const app=boot(seed()),before=app.store.get(KEY),incoming=seed();incoming.bookings=[];
 await app.node('#importData').onchange({target:{files:[{text:async()=>JSON.stringify(incoming)}],value:'backup.json'}});
 app.node('[name=importMode]:checked').value='replace';app.ctx.confirm=()=>false;await app.node('#confirmImport').onclick();assert.equal(app.store.get(KEY),before);
});
test('confirmed booking deletion preserves saved renter details',()=>{
 const d=seed();d.renters=[{id:'r1',name:'Anna',houseNo:'7',address:'Skovvej 2'}];const app=boot(d);app.run("editBooking('b1')");app.node('#deleteBooking').onclick();const saved=JSON.parse(app.store.get(KEY));assert.equal(saved.bookings.length,0);assert.equal(saved.renters[0].address,'Skovvej 2');assert.equal(app.store.has('hjortemosen_booking_draft_v1'),false);
});
test('payments on an existing agreement can be updated after the renter is blacklisted',()=>{
 const d=seed();d.blacklist=[{id:'x',name:'Anna',house:'7',reason:'Skader'}];const app=boot(d);app.run("editBooking('b1')");app.node('#depositPaid').checked=true;
 assert.equal(app.run('checkWarning()'),true);assert.match(app.node('#bookingWarning').textContent,/blacklist/);app.node('#bookingForm').onsubmit({preventDefault(){}});assert.equal(JSON.parse(app.store.get(KEY)).bookings[0].depositPaid,true);
});
test('an existing blacklisted agreement cannot be moved to a new date',()=>{
 const d=seed();d.blacklist=[{id:'x',name:'Anna',house:'7',reason:'Skader'}];const app=boot(d);app.run("editBooking('b1')");app.node('#bookingDate').value='2026-12-19';assert.equal(app.run('checkWarning()'),false);
});
test('closing an empty window preserves a draft saved in another window',()=>{
 const app=boot(seed()),raw=JSON.stringify({...booking,notes:'Ny kladde fra andet vindue'});app.store.set('hjortemosen_booking_draft_v1',raw);app.events.get('pagehide')();assert.equal(app.store.get('hjortemosen_booking_draft_v1'),raw);
});
test('closing a stale window preserves a newer draft from another window',()=>{
 const app=boot(seed(),{...booking}),raw=JSON.stringify({...booking,notes:'Ny aftale fra andet vindue'});app.store.set('hjortemosen_booking_draft_v1',raw);app.events.get('pagehide')();assert.equal(app.store.get('hjortemosen_booking_draft_v1'),raw);
});
test('saving a booking does not erase a different draft from another window',()=>{
 const app=boot(seed(),{...booking}),raw=JSON.stringify({...booking,id:'b2',date:'2026-12-19',name:'Bo'});app.store.set('hjortemosen_booking_draft_v1',raw);app.node('#bookingForm').onsubmit({preventDefault(){}});assert.equal(app.store.get('hjortemosen_booking_draft_v1'),raw);
});
test('a declined manual draft replacement preserves the other window draft',()=>{
 const app=boot(seed()),raw=JSON.stringify({...booking,notes:'Kladde fra andet vindue'});app.store.set('hjortemosen_booking_draft_v1',raw);app.node('#name').value='Bo';app.ctx.confirm=()=>false;app.run('saveDraft(true)');assert.equal(app.store.get('hjortemosen_booking_draft_v1'),raw);
});
test('an already installing service worker still offers the update when installed',async()=>{
 const workerEvents=new Map(),worker={addEventListener:(name,fn)=>workerEvents.set(name,fn),postMessage(){}},reg={installing:worker,waiting:null,addEventListener(){},update:async()=>{}};
 const sw={controller:{postMessage(){}},addEventListener(){},ready:Promise.resolve(),register:async()=>reg};const app=boot(seed(),undefined,{sw});app.node('#updateBanner').classList.add('hidden');await app.events.get('load')();
 assert.equal(typeof workerEvents.get('statechange'),'function');reg.installing=null;reg.waiting=worker;workerEvents.get('statechange')();assert.equal(app.node('#updateBanner').classList.contains('hidden'),false);
});

// Breaks caught: charged board bookings, lost legacy agreements, stale printed months.
test('selecting a board member sets free rent and a fixed 500 deposit even with custom defaults',()=>{
 const d=seed();d.settings.memberPrice=1800;d.settings.deposit=800;const app=boot(d);
 app.node('[name=renterType][value="board"]').checked=true;app.run('applyPrice()');
 assert.equal(Number(app.node('#price').value),0);
 assert.equal(Number(app.node('#deposit').value),500);
 assert.equal(app.node('#price').readOnly,true);
 assert.equal(app.node('#deposit').readOnly,true);
 assert.equal(app.node('#paid').disabled,true);
 assert.equal(app.node('#depositPaid').disabled,false);
 assert.equal(app.node('.payment-checks').classList.contains('hidden'),false);
});
test('switching from board member to friend restores the normal deposit',()=>{
 const app=boot(seed());app.node('[name=renterType][value="board"]').checked=true;app.run('applyPrice()');
 app.node('[name=renterType][value="friend"]').checked=true;app.run('applyPrice()');
 assert.equal(Number(app.node('#price').value),1500);
 assert.equal(Number(app.node('#deposit').value),500);
 assert.equal(app.node('#price').readOnly,false);
});
test('a board booking saves only the 500 deposit as payable and cannot override its amounts',()=>{
 const app=boot(seed());app.node('[name=renterType][value="board"]').checked=true;app.run('applyPrice()');
 app.node('#bookingDate').value='2026-12-20';app.node('#name').value='Bestyrelsesmøde';
 app.node('#price').value='999';app.node('#deposit').value='999';
 app.node('#bookingForm').onsubmit({preventDefault(){}});
 const saved=JSON.parse(app.store.get(KEY));const b=saved.bookings.find(b=>b.date==='2026-12-20');
 assert.equal(b.type,'board');assert.equal(b.price,0);assert.equal(b.deposit,500);
 const restored=boot(saved);assert.equal(restored.run('data.bookings.length'),2);
 assert.equal(restored.run("HjortData.outstanding(data.bookings.find(b=>b.type==='board'))"),500);
});
test('a free board booking survives backup export and import and is labelled free',()=>{
 const d=seed();d.bookings[0]={...booking,type:'board',price:0,deposit:0,paid:false,depositPaid:false};
 const app=boot(d);app.ctx.backup=JSON.parse(app.run('backupContents()'));
 const restored=app.run('HjortData.validate(backup,true)');assert.equal(restored.bookings[0].type,'board');
 assert.match(app.run('bookingRow(data.bookings[0])'),/Gratis/);
 assert.doesNotMatch(app.run('bookingRow(data.bookings[0])'),/ikke betalt/);
});
test('restoring an old board draft retains its type and applies the 500 deposit',()=>{
 const app=boot(seed(),{...booking,id:'',date:'2026-12-20',type:'board',price:0,deposit:0});
 assert.equal(app.run('collectDraft().type'),'board');
 assert.equal(Number(app.node('#price').value),0);assert.equal(Number(app.node('#deposit').value),500);
});
test('board deposit payment can be recorded and survives reopening and a backup round trip',()=>{
 const d=seed();d.bookings=[{...booking,type:'board',price:0,deposit:500,paid:false,depositPaid:false}];
 const app=boot(d);assert.equal(app.run('storageBlocked'),false);assert.equal(app.run('HjortData.outstanding(data.bookings[0])'),500);
 app.run("editBooking('b1')");assert.equal(app.node('#depositPaid').disabled,false);app.node('#depositPaid').checked=true;
 app.node('#bookingForm').onsubmit({preventDefault(){}});
 const saved=JSON.parse(app.store.get(KEY));assert.equal(saved.bookings[0].depositPaid,true);assert.equal(saved.bookings[0].deposit,500);
 const restored=boot(saved);assert.equal(restored.run('HjortData.outstanding(data.bookings[0])'),0);
 restored.ctx.backup=JSON.parse(restored.run('backupContents()'));
 assert.equal(restored.run('HjortData.validate(backup,true).bookings[0].depositPaid'),true);
 assert.doesNotMatch(restored.run('bookingRow(data.bookings[0])'),/Mangler betaling|Leje: ikke betalt/);
});
test('unpaid board deposits appear in the list, overview and printed calendar',()=>{
 const d=seed();d.bookings=[{...booking,type:'board',price:0,deposit:500,paid:false,depositPaid:false}];
 const app=boot(d);assert.equal(app.run('data.bookings.length'),1);
 assert.match(app.run('bookingRow(data.bookings[0])'),/Leje: gratis/);assert.match(app.run('bookingRow(data.bookings[0])'),/Mangler betaling/);
 app.run('renderStats()');assert.match(app.node('#stats').innerHTML,/500 kr\./);
 assert.match(app.run('bookingOverview()'),/Depositum 500 kr\. \(ikke betalt\)/);
 assert.match(app.run('bookingOverview()'),/Leje 0 kr\. \(gratis\)/);
 app.run('monthCursor=new Date(2026,11,1)');assert.match(app.run('calendarPrintMarkup()'),/Mangler betaling/);
});
test('old saved board bookings remain readable and receive the deposit when edited and saved',()=>{
 const d=seed();d.bookings=[{...booking,type:'board',price:0,deposit:0,paid:false,depositPaid:false}];
 const app=boot(d),original=app.store.get(KEY);app.run("editBooking('b1')");
 assert.equal(app.node('#deposit').value,500);assert.equal(app.store.get(KEY),original);
 app.node('#bookingForm').onsubmit({preventDefault(){}});
 assert.equal(JSON.parse(app.store.get(KEY)).bookings[0].deposit,500);
});
test('switching away from board restores custom deposit and leaves rent unpaid',()=>{
 const d=seed();d.settings.deposit=800;const app=boot(d);
 app.node('[name=renterType][value="board"]').checked=true;app.run('applyPrice()');
 app.node('[name=renterType][value="friend"]').checked=true;app.run('applyPrice()');
 assert.equal(Number(app.node('#deposit').value),800);assert.equal(app.node('#paid').disabled,false);assert.equal(app.run('collectDraft().paid'),false);
});
test('a legacy zero-deposit payment flag cannot mark the new 500 deposit as received',()=>{
 const d=seed();d.bookings=[{...booking,type:'board',price:0,deposit:0,depositPaid:true}];
 const app=boot(d);app.run("editBooking('b1')");assert.equal(app.node('#depositPaid').checked,false);
 app.node('#notes').value='Bemærkning';app.node('#bookingForm').onsubmit({preventDefault(){}});
 const b=JSON.parse(app.store.get(KEY)).bookings[0];assert.equal(b.deposit,500);assert.equal(b.depositPaid,false);
 assert.equal(app.run('HjortData.outstanding(data.bookings[0])'),500);
});
test('restored legacy board drafts clear zero-deposit payment flags but retain received 500 deposits',()=>{
 const old=boot(seed(),{...booking,id:'',type:'board',price:0,deposit:0,depositPaid:true});
 assert.equal(old.node('#depositPaid').checked,false);assert.equal(Number(old.node('#deposit').value),500);
 const current=boot(seed(),{...booking,id:'',type:'board',price:0,deposit:500,depositPaid:true});
 assert.equal(current.node('#depositPaid').checked,true);assert.equal(Number(current.node('#deposit').value),500);
});
test('editing a legacy other agreement preserves its type and negotiated amounts',()=>{
 const d=seed();d.bookings[0]={...booking,type:'other',price:1700,deposit:300};const app=boot(d);
 app.run("editBooking('b1')");app.node('#notes').value='Aftalen opdateret';
 app.node('#bookingForm').onsubmit({preventDefault(){}});
 const b=JSON.parse(app.store.get(KEY)).bookings[0];
 assert.equal(b.type,'other');assert.equal(b.price,1700);assert.equal(b.deposit,300);
});
test('reusing a legacy other renter chooses friend pricing for a new agreement',()=>{
 const app=boot(seed());app.ctx.oldRenter={name:'Bo',houseNo:'8',type:'other'};
 app.run('fillRenter(oldRenter)');assert.equal(app.run('collectDraft().type'),'friend');
 assert.equal(Number(app.node('#price').value),1500);
});
test('calendar printing uses the selected month and a complete Monday-first six-week grid',()=>{
 const d=seed();d.bookings=[{...booking,date:'2026-03-31',name:'Åse & <Gæst>'},{...booking,id:'outside',date:'2026-04-01',name:'Udenfor måneden'}];
 const app=boot(d);app.run('monthCursor=new Date(2026,2,1)');
 assert.equal(typeof app.node('#printCalendarDirect').onclick,'function');app.node('#printCalendarDirect').onclick();
 const output=app.prints[0];assert.match(output.html,/marts 2026/);
 assert.match(output.html,/Åse &amp; &lt;Gæst&gt;/);assert.doesNotMatch(output.html,/Udenfor måneden/);
 assert.equal((output.html.match(/<td[ >]/g)||[]).length,42);
 assert.equal(output.printing,true);assert.equal(output.title,'Hjortemosen-kalender-2026-03');
 assert.match(output.html,/<th[^>]*>Mandag<\/th>.*<th[^>]*>Søndag<\/th>/s);
 assert.match(output.html,/<td class="print-day empty"><\/td>/);
});
test('calendar print reflects edits and leaves booking data unchanged',()=>{
 const app=boot(seed());app.run('monthCursor=new Date(2026,11,1)');
 assert.equal(typeof app.node('#printCalendarDirect').onclick,'function');
 app.node('#printCalendarDirect').onclick();app.run("data.bookings[0].name='Nyt navn'");
 const before=app.run('JSON.stringify(data)');app.node('#printCalendarDirect').onclick();
 assert.match(app.prints[1].html,/Nyt navn/);assert.doesNotMatch(app.prints[1].html,/Anna/);
 assert.equal(app.run('JSON.stringify(data)'),before);
 app.events.get('afterprint')();assert.equal(app.node('body').classList.contains('printing-calendar'),false);
 assert.equal(app.ctx.document.title,'');
});

test('a backup cannot introduce a charge for a board member',()=>{
 const app=boot(seed()),bad=seed();bad.bookings[0]={...booking,type:'board',price:999,deposit:0};app.ctx.bad=bad;
 assert.throws(()=>app.run('HjortData.validate(bad,true)'),/Bestyrelsesmedlemmer.*gratis/);
});
test('calendar printing includes leap day and omits adjacent-month bookings',()=>{
 const d=seed();d.bookings=[{...booking,date:'2024-02-29',name:'Skuddag'},{...booking,id:'march',date:'2024-03-01',name:'Martsbooking'}];const app=boot(d);
 app.run('monthCursor=new Date(2024,1,1)');assert.equal(typeof app.node('#printCalendarDirect').onclick,'function');app.node('#printCalendarDirect').onclick();
 assert.match(app.prints[0].html,/februar 2024/);assert.match(app.prints[0].html,/Skuddag/);
 assert.doesNotMatch(app.prints[0].html,/Martsbooking/);assert.equal((app.prints[0].html.match(/<td[ >]/g)||[]).length,35);
});
test('calendar printing preserves every legacy booking sharing a date',()=>{
 const d=seed();d.bookings.push({...booking,id:'b2',name:'Bo',type:'board',price:0,deposit:0,houseNo:'8'});
 const app=boot(d),before=app.store.get(KEY);app.run('monthCursor=new Date(2026,11,1)');app.node('#printCalendarDirect').onclick();
 const html=app.prints[0].html;
 assert.match(html,/2 bookinger/);assert.match(html,/Anna/);assert.match(html,/Bo/);
 assert.match(html,/Have nr\. 7/);assert.match(html,/Have nr\. 8/);
 assert.match(html,/Mangler betaling/);assert.match(html,/Gratis/);
 assert.equal((html.match(/<td class="print-day is-booked">/g)||[]).length,1);
 assert.equal(app.store.get(KEY),before);
});

// Missing input handlers would lose these values on reload or on another render.
test('settings inputs persist unfinished values and survive a data render',()=>{const app=boot(seed());app.node('#memberPrice').value='';assert.ok(app.node('#settingsForm').events.input,'settings autosave connected');app.node('#settingsForm').events.input();app.run('renderAll()');assert.equal(app.node('#memberPrice').value,'');const raw=app.store.get('hjortemosen_settings_draft_v1'),reopened=boot(seed(),null,{extraStorage:{hjortemosen_settings_draft_v1:raw}});assert.equal(reopened.node('#memberPrice').value,'');assert.equal(reopened.run('data.settings.memberPrice'),1000);});
test('valid standard prices save automatically when leaving the field',()=>{const app=boot(seed());app.node('#friendPrice').value='1300';assert.ok(app.node('#settingsForm').events.input);app.node('#settingsForm').events.input();app.node('#settingsForm').events.change();assert.equal(JSON.parse(app.store.get(KEY)).settings.friendPrice,1300);});
test('blacklist draft returns after reload without blacklisting an unfinished person',()=>{const app=boot(seed());app.node('#blName').value='QA kladde';assert.ok(app.node('#blacklistForm').events.input,'blacklist autosave connected');app.node('#blacklistForm').events.input();const raw=app.store.get('hjortemosen_blacklist_draft_v1'),reopened=boot(seed(),null,{extraStorage:{hjortemosen_blacklist_draft_v1:raw}});assert.equal(reopened.node('#blName').value,'QA kladde');assert.equal(reopened.run('data.blacklist.length'),0);});
test('full export includes the saved booking draft and stays compatible with data-only readers',()=>{const app=boot(seed());app.node('#name').value='QA kladde';app.run('saveDraft()');const parsed=JSON.parse(app.run('backupContents()'));assert.equal(parsed.backup?.drafts.booking.name,'QA kladde');app.ctx.copy=parsed;assert.equal(app.run('HjortData.validate(copy,true).bookings.length'),1);});
test('stale settings draft cannot silently replace prices updated in another window',()=>{const app=boot(seed());app.node('#friendPrice').value='1100';assert.ok(app.node('#settingsForm').events.input);app.node('#settingsForm').events.input();app.run('data.settings.friendPrice=1400');app.node('#settingsForm').events.change();assert.equal(app.run('data.settings.friendPrice'),1400);assert.equal(app.node('#friendPrice').value,'1100');});
test('a booking form cannot undo a payment update received from another window',()=>{const app=boot(seed());app.run("editBooking('b1')");app.node('#notes').value='Min kladde';app.run('saveDraft()');const newer=seed();newer.bookings[0].depositPaid=true;app.store.set(KEY,JSON.stringify(newer));app.events.get('storage')({key:KEY});app.node('#bookingForm').onsubmit({preventDefault(){}});assert.equal(JSON.parse(app.store.get(KEY)).bookings[0].depositPaid,true);assert.equal(JSON.parse(app.store.get('hjortemosen_booking_draft_v1')).notes,'Min kladde');});
test('submitting a stale blacklist form preserves a newer draft from another window',()=>{const app=boot(seed());app.node('#blName').value='A';app.node('#blHouse').value='7';app.node('#blReason').value='A reason';app.node('#blacklistForm').events.input();const newer=JSON.stringify({name:'B',house:'8',reason:'B reason'});app.store.set('hjortemosen_blacklist_draft_v1',newer);app.node('#blacklistForm').onsubmit({preventDefault(){}});assert.equal(app.store.get('hjortemosen_blacklist_draft_v1'),newer);});
test('installed iPad prints an escaped complete calendar document through the native bridge',async()=>{
 const requests=[];const source=seed();source.bookings[0].name='<script>alert(1)</script>';
 const app=boot(source,undefined,{nativeHandler:{postMessage:request=>{requests.push(request);return Promise.resolve(request.action==='backup'?{ok:true,savedAt:'2026-10-03T20:00:01Z',file:'Hjortemosen/seneste-backup.json'}:{ok:true});}}});await app.ctx.window.HjortAppReady;app.run('monthCursor=new Date(2026,11,1)');await app.node('#printCalendar').onclick();const sent=requests.find(r=>r.action==='printCalendar');assert.match(sent.html,/<!doctype html>/);assert.match(sent.html,/<style>/);assert.match(sent.html,/&lt;script&gt;/);assert.doesNotMatch(sent.html,/<script>/);assert.equal(app.prints.length,0);assert.equal(app.node('body').classList.contains('printing-calendar'),false);
});
test('installed iPad does not register a service worker for its bundled app origin',async()=>{
 let registrations=0;const sw={register:async()=>{registrations++;},addEventListener(){}};const app=boot(seed(),undefined,{sw,nativeHandler:{postMessage:()=>Promise.resolve({ok:true,savedAt:'2026-10-03T20:00:01Z',file:'Hjortemosen/seneste-backup.json'})}});await app.ctx.window.HjortAppReady;assert.equal(app.events.has('load'),false);assert.equal(registrations,0);assert.equal(app.node('#connectionStatus').textContent,'Klar til offlinebrug');
});

test('back returns to the previous app view and preserves the current booking draft',()=>{
 const app=boot(seed());const before=app.store.get(KEY);app.run("go('calendar');newBooking('2026-12-15')");app.node('#name').value='Bevaret ved tilbage';assert.equal(app.node('#booking').classList.contains('active'),true);assert.equal(typeof app.node('back-button').onclick,'function');app.node('back-button').onclick();assert.equal(app.node('#calendar').classList.contains('active'),true);assert.equal(app.node('#name').value,'Bevaret ved tilbage');assert.equal(JSON.parse(app.store.get('hjortemosen_booking_draft_v1')).name,'Bevaret ved tilbage');assert.equal(app.store.get(KEY),before);app.node('back-button').onclick();assert.equal(app.node('#dashboard').classList.contains('active'),true);
});
test('reselecting a view does not trap the back button on the same screen',()=>{
 const app=boot(seed());app.run("go('documents');go('documents')");assert.equal(typeof app.node('back-button').onclick,'function');app.node('back-button').onclick();assert.equal(app.node('#dashboard').classList.contains('active'),true);app.node('back-button').onclick();assert.equal(app.node('#dashboard').classList.contains('active'),true);
});

test('calendar PDF button creates an actual ready PDF even when browser printing does nothing',async()=>{
 const app=boot(seed());app.run('monthCursor=new Date(2026,11,1)');const before=app.store.get(KEY);app.ctx.window.print=()=>{};
 await app.node('#printCalendar').onclick();assert.equal(app.node('#saveCalendarPdf').download,'Hjortemosen-kalender-2026-12.pdf');assert.equal(app.node('#calendarPdfReady').classList.contains('hidden'),false);assert.match(app.node('#calendarPdfStatus').textContent,/PDF.*klar/i);
 const response=await fetch(app.node('#openCalendarPdf').href),bytes=new Uint8Array(await response.arrayBuffer());const doc=await app.ctx.PDFLib.PDFDocument.load(bytes);assert.ok(doc.getPageCount()>=1);assert.ok(Math.abs(doc.getPage(0).getWidth()-841.89)<0.1);assert.equal(app.store.get(KEY),before);assert.equal(app.node('body').classList.contains('printing-calendar'),false);
});
test('changing month invalidates the old calendar PDF and stops sharing stale bookings',async()=>{
 const app=boot(seed());app.run('monthCursor=new Date(2026,11,1)');await app.node('#printCalendar').onclick();const old=app.node('#openCalendarPdf').href;assert.match(old,/^blob:/);let shares=0;app.ctx.navigator.canShare=()=>true;app.ctx.navigator.share=async()=>{shares++;};
 app.node('#nextMonth').onclick();await app.node('#shareCalendarPdf').onclick();assert.equal(shares,0);assert.equal(app.node('#calendarPdfReady').classList.contains('hidden'),true);assert.equal(app.node('#openCalendarPdf').href,'#');await assert.rejects(fetch(old));
});
test('calendar share passes the ready PDF and cancellation keeps it available',async()=>{
 const app=boot(seed());await app.node('#printCalendar').onclick();let shared;app.ctx.navigator.canShare=()=>true;app.ctx.navigator.share=async args=>{shared=args.files[0];throw Object.assign(new Error('cancel'),{name:'AbortError'});};await app.node('#shareCalendarPdf').onclick();
 assert.equal(shared.type,'application/pdf');assert.match(shared.name,/Hjortemosen-kalender-\d{4}-\d{2}\.pdf/);assert.ok((await app.ctx.PDFLib.PDFDocument.load(new Uint8Array(await shared.arrayBuffer()))).getPageCount());assert.equal(app.node('#calendarPdfReady').classList.contains('hidden'),false);assert.match(app.node('#calendarPdfStatus').textContent,/afbrudt/);assert.equal(app.node('#calendarPdfError').classList.contains('hidden'),true);
});
test('an edited booking invalidates PDF payment status and async generation cannot publish a stale month',async()=>{
 const app=boot(seed());app.run('monthCursor=new Date(2026,11,1)');await app.node('#printCalendar').onclick();assert.match(app.node('#openCalendarPdf').href,/^blob:/);app.run('data.bookings[0].depositPaid=true;renderCalendar()');assert.equal(app.node('#calendarPdfReady').classList.contains('hidden'),true);
 let release;app.ctx.HjortCalendarPDF.build=()=>new Promise(r=>release=r);const pending=app.node('#printCalendar').onclick();app.node('#nextMonth').onclick();release(new Uint8Array([1,2,3]));await pending;assert.equal(app.node('#calendarPdfReady').classList.contains('hidden'),true);assert.equal(app.node('#printCalendar').disabled,false);
});
test('calendar PDF failure is visible and preserves bookings and the active draft',async()=>{
 const app=boot(seed());const before=app.store.get(KEY);app.node('#name').value='Bevar kladde';app.run('saveDraft()');const draft=app.store.get('hjortemosen_booking_draft_v1');app.ctx.HjortCalendarPDF={build:async()=>{throw new Error('PDF kunne ikke laves');}};
 await app.node('#printCalendar').onclick();assert.equal(app.node('#calendarPdfReady').classList.contains('hidden'),true);assert.equal(app.node('#calendarPdfError').classList.contains('hidden'),false);assert.match(app.node('#calendarPdfError').textContent,/PDF kunne ikke laves/);assert.equal(app.node('#printCalendar').disabled,false);assert.equal(app.store.get(KEY),before);assert.equal(app.store.get('hjortemosen_booking_draft_v1'),draft);
});
test('a failed PDF build after changing month clears the busy message and permits retry',async()=>{
 const app=boot(seed());let reject;app.ctx.HjortCalendarPDF={build:()=>new Promise((resolve,r)=>reject=r)};const pending=app.node('#printCalendar').onclick();app.node('#nextMonth').onclick();reject(new Error('old month failed'));await pending;
 assert.equal(app.node('#printCalendar').disabled,false);assert.match(app.node('#calendarPdfStatus').textContent,/ændret/);assert.doesNotMatch(app.node('#calendarPdfStatus').textContent,/Laver/);assert.equal(app.node('#calendarPdfError').classList.contains('hidden'),true);
});

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
  const node = s => {
    if(s==='[name=renterType]:checked')return radioTypes.map(t=>node(`[name=renterType][value="${t}"]`)).find(r=>r.checked)||null;
    if (!nodes.has(s)) { const classes=new Set(); nodes.set(s, {value:'',checked:false,innerHTML:'',textContent:'',dataset:{},classList:{add(c){classes.add(c)},remove(c){classes.delete(c)},toggle(c,on){const enabled=on===undefined?!classes.has(c):on;enabled?classes.add(c):classes.delete(c);return enabled;},contains(c){return classes.has(c)}},addEventListener(){},reset(){},showModal(){},close(){},focus(){},setAttribute(){},getAttribute(){return null;},querySelector(){return null;}}); }
    return nodes.get(s);
  };
  for(const type of radioTypes){const radio=node(`[name=renterType][value="${type}"]`);radio.value=type;let checked=type==='member';Object.defineProperty(radio,'checked',{get:()=>checked,set:value=>{checked=Boolean(value);if(checked)for(const other of radioTypes)if(other!==type)node(`[name=renterType][value="${other}"]`).checked=false;}});}
  const body=node('body');body.appendChild=()=>{};
  node('#saveRenter').checked = true;
  const store = new Map();
  if (seed !== undefined) store.set(KEY, typeof seed === 'string' ? seed : JSON.stringify(seed));
  if (draft) store.set('hjortemosen_booking_draft_v1', JSON.stringify(draft));
  const ctx = vm.createContext({document:{querySelector:node,querySelectorAll:s=>s==='[name=renterType]'?radioTypes.map(t=>node(`[name=renterType][value="${t}"]`)):[],addEventListener(){},visibilityState:'visible',createElement:()=>node('link'),body,title:''},localStorage:{getItem:k=>{if(options.unavailable)throw new Error("Storage unavailable");return store.get(k)||null},setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},window:{addEventListener:(type,handler)=>events.set(type,handler),scrollTo(){},print:()=>prints.push({html:node('#calendarPrint').innerHTML,title:ctx.document.title,printing:body.classList.contains('printing-calendar')}),matchMedia:()=>({matches:false})},navigator:{onLine:true,...(options.sw?{serviceWorker:options.sw}:{})},crypto:require('node:crypto').webcrypto,structuredClone,Intl,Date,Number,String,Boolean,JSON,Array,Object,Set,Map,URL,Blob,File,console,setTimeout:()=>1,clearTimeout(){},confirm:()=>true,alert(){},fetch:async()=>({ok:true}),location:{hash:'',href:'http://localhost/app/',reload(){}}});
  for(const file of ['data.js','app.js']) if(fs.existsSync(path.join(__dirname,'..',file))) vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
  return {ctx,node,store,events,prints,run:s=>vm.runInContext(s,ctx)};
}
const booking={id:'b1',date:'2026-12-12',name:'Anna',houseNo:'7',phone:'12345678',email:'a@example.dk',type:'member',price:1000,deposit:500,paid:true,depositPaid:false,notes:''};
const seed=()=>({bookings:[{...booking}],renters:[],blacklist:[],settings:{memberPrice:1000,otherPrice:1500,deposit:500}});

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
 const app=boot(seed());app.node('#bookingId').value='b1';app.node('#bookingDate').value='2026-12-12';app.node('#name').value='Anna';app.node('#address').value='Testvej 2';app.node('#price').value='1000';app.node('#deposit').value='500';app.run('saveDraft()');
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
 app.node('[name=importMode]:checked').value='replace';app.node('#confirmImport').onclick();
 assert.equal(app.store.get('hjortemosen_before_import_v1'),before);assert.equal(JSON.parse(app.store.get(KEY)).bookings.length,0);assert.equal(JSON.parse(app.store.get(KEY)).settings.friendPrice,1200);
});
test('declining replacement leaves existing data untouched',async()=>{
 const app=boot(seed()),before=app.store.get(KEY),incoming=seed();incoming.bookings=[];
 await app.node('#importData').onchange({target:{files:[{text:async()=>JSON.stringify(incoming)}],value:'backup.json'}});
 app.node('[name=importMode]:checked').value='replace';app.ctx.confirm=()=>false;app.node('#confirmImport').onclick();assert.equal(app.store.get(KEY),before);
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
test('selecting a board member clears rent and deposit even with custom defaults',()=>{
 const d=seed();d.settings.memberPrice=1800;d.settings.deposit=800;const app=boot(d);
 app.node('[name=renterType][value="board"]').checked=true;app.run('applyPrice()');
 assert.equal(Number(app.node('#price').value),0);
 assert.equal(Number(app.node('#deposit').value),0);
 assert.equal(app.node('#price').readOnly,true);
 assert.equal(app.node('#deposit').readOnly,true);
});
test('switching from board member to friend restores the normal deposit',()=>{
 const app=boot(seed());app.node('[name=renterType][value="board"]').checked=true;app.run('applyPrice()');
 app.node('[name=renterType][value="friend"]').checked=true;app.run('applyPrice()');
 assert.equal(Number(app.node('#price').value),1500);
 assert.equal(Number(app.node('#deposit').value),500);
 assert.equal(app.node('#price').readOnly,false);
});
test('a board booking is saved and restored without any payable amounts',()=>{
 const app=boot(seed());app.node('[name=renterType][value="board"]').checked=true;app.run('applyPrice()');
 app.node('#bookingDate').value='2026-12-20';app.node('#name').value='Bestyrelsesmøde';
 app.node('#price').value='999';app.node('#deposit').value='500';
 app.node('#bookingForm').onsubmit({preventDefault(){}});
 const saved=JSON.parse(app.store.get(KEY));const b=saved.bookings.find(b=>b.date==='2026-12-20');
 assert.equal(b.type,'board');assert.equal(b.price,0);assert.equal(b.deposit,0);
 const restored=boot(saved);assert.equal(restored.run('data.bookings.length'),2);
 assert.equal(restored.run("HjortData.outstanding(data.bookings.find(b=>b.type==='board'))"),0);
});
test('a free board booking survives backup export and import and is labelled free',()=>{
 const d=seed();d.bookings[0]={...booking,type:'board',price:0,deposit:0,paid:false,depositPaid:false};
 const app=boot(d);app.ctx.backup=JSON.parse(app.run('backupContents()'));
 const restored=app.run('HjortData.validate(backup,true)');assert.equal(restored.bookings[0].type,'board');
 assert.match(app.run('bookingRow(data.bookings[0])'),/Gratis/);
 assert.doesNotMatch(app.run('bookingRow(data.bookings[0])'),/ikke betalt/);
});
test('restoring a board draft retains its type and zero amounts',()=>{
 const app=boot(seed(),{...booking,id:'',date:'2026-12-20',type:'board',price:0,deposit:0});
 assert.equal(app.run('collectDraft().type'),'board');
 assert.equal(Number(app.node('#price').value),0);assert.equal(Number(app.node('#deposit').value),0);
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
 assert.equal(typeof app.node('#printCalendar').onclick,'function');app.node('#printCalendar').onclick();
 const output=app.prints[0];assert.match(output.html,/marts 2026/);
 assert.match(output.html,/Åse &amp; &lt;Gæst&gt;/);assert.doesNotMatch(output.html,/Udenfor måneden/);
 assert.equal((output.html.match(/<td[ >]/g)||[]).length,42);
 assert.equal(output.printing,true);assert.equal(output.title,'Hjortemosen-kalender-2026-03');
 assert.match(output.html,/<th[^>]*>Mandag<\/th>.*<th[^>]*>Søndag<\/th>/s);
 assert.match(output.html,/<td class="print-day empty"><\/td>/);
});
test('calendar print reflects edits and leaves booking data unchanged',()=>{
 const app=boot(seed());app.run('monthCursor=new Date(2026,11,1)');
 assert.equal(typeof app.node('#printCalendar').onclick,'function');
 app.node('#printCalendar').onclick();app.run("data.bookings[0].name='Nyt navn'");
 const before=app.run('JSON.stringify(data)');app.node('#printCalendar').onclick();
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
 app.run('monthCursor=new Date(2024,1,1)');assert.equal(typeof app.node('#printCalendar').onclick,'function');app.node('#printCalendar').onclick();
 assert.match(app.prints[0].html,/februar 2024/);assert.match(app.prints[0].html,/Skuddag/);
 assert.doesNotMatch(app.prints[0].html,/Martsbooking/);assert.equal((app.prints[0].html.match(/<td[ >]/g)||[]).length,35);
});
test('calendar printing preserves every legacy booking sharing a date',()=>{
 const d=seed();d.bookings.push({...booking,id:'b2',name:'Bo',type:'board',price:0,deposit:0,houseNo:'8'});
 const app=boot(d),before=app.store.get(KEY);app.run('monthCursor=new Date(2026,11,1)');app.node('#printCalendar').onclick();
 const html=app.prints[0].html;
 assert.match(html,/2 bookinger/);assert.match(html,/Anna/);assert.match(html,/Bo/);
 assert.match(html,/Have nr\. 7/);assert.match(html,/Have nr\. 8/);
 assert.match(html,/Mangler betaling/);assert.match(html,/Gratis/);
 assert.equal((html.match(/<td class="print-day is-booked">/g)||[]).length,1);
 assert.equal(app.store.get(KEY),before);
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function boot(seed={}){
 const store=new Map(Object.entries(seed));let failKey=null;
 const storage={getItem:k=>store.get(k)??null,setItem(k,v){if(k===failKey)throw new Error('quota');store.set(k,String(v));},removeItem:k=>store.delete(k)};
 const ctx=vm.createContext({console,localStorage:storage,Date,JSON,Object,Array,Number,String,Boolean,Map,Set,Promise,setTimeout,clearTimeout,navigator:{},location:{pathname:'/test/'}});
 vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),ctx);
 if(fs.existsSync(path.join(root,'backup.js')))vm.runInContext(fs.readFileSync(path.join(root,'backup.js'),'utf8'),ctx);
 return {store,ctx,api:ctx.HjortBackup,fail:k=>failKey=k,run:s=>vm.runInContext(s,ctx)};
}
const key='hjortemosen_data_v1',contractKey='hjortemosen_contract_draft_v1';
const data={bookings:[],renters:[],blacklist:[],settings:{memberPrice:1000,friendPrice:1500,deposit:500}};
const contract={template:'member-pdf',bookingId:'',bookingSnapshot:'',values:{name:'Åse',phone:'12345678',email:'ase@example.dk',address:'Æblevej',account:'1234 56789',agreementDate:'2026-10-03',rentalDate:'2026-12-12',meterStart:'',meterEnd:'',signature:'Åse'},strokes:[[[10,20],[100,80]]],savedAt:'2026-10-03T12:00:00.000Z'};
test('a backup exports and restores contract fields and handwriting together with booking data',()=>{
 const app=boot({[key]:JSON.stringify(data),[contractKey]:JSON.stringify(contract),'hjortemosen_booking_draft_v1':JSON.stringify({name:'Kladde',date:'',price:'',deposit:'500',type:'member'})});
 assert.ok(app.api,'full backup support is present');const copy=app.api.capture('2.5.0');const parsed=app.api.parse(copy);assert.equal(parsed.data.settings.memberPrice,1000);assert.equal(parsed.drafts.contract.values.account,'1234 56789');assert.deepEqual(JSON.parse(JSON.stringify(parsed.drafts.contract.strokes)),[[[10,20],[100,80]]]);assert.equal(parsed.drafts.booking.price,'');
 const target=boot({[key]:JSON.stringify({...data,renters:[{id:'r1',name:'Before'}]})});target.api.apply(copy);assert.equal(JSON.parse(target.store.get(contractKey)).values.email,'ase@example.dk');assert.equal(JSON.parse(target.store.get(key)).renters.length,0);
});
test('old data-only backups stay importable and do not invent contract drafts',()=>{const app=boot();assert.ok(app.api);const parsed=app.api.parse(data);assert.equal(parsed.data.settings.friendPrice,1500);assert.equal(parsed.hasDrafts,false);});
test('invalid signatures and unsupported backup versions are rejected before any write',()=>{
 const app=boot({[key]:JSON.stringify(data)});assert.ok(app.api);const copy=app.api.capture('2.5.0');copy.backup.drafts.contract={...contract,strokes:[[[Infinity,20]]]};const before=app.store.get(key);assert.throws(()=>app.api.apply(copy),/underskrift|tegning/i);assert.equal(app.store.get(key),before);copy.backup.version=99;assert.throws(()=>app.api.apply(copy),/version/i);
});
test('interrupted restoration rolls back all changed keys and preserves the source backup',()=>{
 const app=boot({[key]:JSON.stringify({...data,renters:[{id:'r1',name:'Before'}]})});assert.ok(app.api);const before=app.store.get(key),copy=app.api.capture('2.5.0');copy.renters=[];copy.backup.drafts.contract=contract;app.fail(contractKey);assert.throws(()=>app.api.apply(copy),/quota/);assert.equal(app.store.get(key),before);assert.equal(app.store.has(contractKey),false);
});
test('corrupted primary data cannot turn into an empty automatic backup',()=>{const app=boot({[key]:'{broken'});assert.ok(app.api);assert.throws(()=>app.api.capture('2.5.0'));assert.equal(app.store.get(key),'{broken');});
test('unfinished settings and blacklist drafts are included without applying them',()=>{
 const app=boot({[key]:JSON.stringify(data),'hjortemosen_settings_draft_v1':JSON.stringify({memberPrice:'',friendPrice:'1500',deposit:'500',baseSettings:JSON.stringify(data.settings)}),'hjortemosen_blacklist_draft_v1':JSON.stringify({name:'Bo',house:'7',reason:''})});assert.ok(app.api);const parsed=app.api.parse(app.api.capture('2.5.0'));assert.equal(parsed.data.settings.memberPrice,1000);assert.equal(parsed.drafts.settings.memberPrice,'');assert.equal(parsed.drafts.blacklist.name,'Bo');assert.equal(parsed.data.blacklist.length,0);
});
test('malformed booking context in a signed contract is rejected before restore',()=>{const app=boot({[key]:JSON.stringify(data)}),copy=app.api.capture('2.5.0');copy.backup.drafts.contract={...contract,bookingSnapshot:'not JSON'};assert.throws(()=>app.api.apply(copy),/booking|kontrakt/i);assert.equal(app.store.has(contractKey),false);});
test('capture never turns an unfinished restore into a valid automatic snapshot',()=>{const app=boot({[key]:JSON.stringify(data),'hjortemosen_restore_journal_v1':'{}'});assert.throws(()=>app.api.capture('2.5.0'),/gendannelse/i);});
test('a restore checks its preview baseline again when it actually commits',()=>{const app=boot({[key]:JSON.stringify(data)}),copy=app.api.capture('2.5.0'),expected=JSON.stringify(Object.values(app.api.keys).map(k=>app.store.get(k)??null));app.store.set(key,JSON.stringify({...data,renters:[{id:'r1',name:'Newer'}]}));assert.throws(()=>app.api.apply(copy,app.ctx.localStorage,expected),/ændret/i);assert.equal(JSON.parse(app.store.get(key)).renters[0].name,'Newer');});
test('native Files mirror still receives the complete workspace when IndexedDB is unavailable',async()=>{
 const app=boot({[key]:JSON.stringify(data),[contractKey]:JSON.stringify(contract)}),copies=[],states=[];
 const manager=app.api.create({indexedDB:null,onStatus:s=>states.push(s),onSnapshot:copy=>copies.push(copy)});
 assert.equal(await manager.flush(),false);assert.equal(states.at(-1).state,'error');assert.equal(copies.length,1);assert.equal(copies[0].backup.drafts.contract.values.name,'Åse');assert.deepEqual(JSON.parse(JSON.stringify(copies[0].backup.drafts.contract.strokes)),[[[10,20],[100,80]]]);
});
test('native fallback cannot turn corrupt source data into an empty file backup',async()=>{
 const app=boot({[key]:'{broken'}),copies=[];const manager=app.api.create({indexedDB:null,onSnapshot:copy=>copies.push(copy)});assert.equal(await manager.flush(),false);assert.equal(copies.length,0);assert.equal(app.store.get(key),'{broken');
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function boot(handler,timeout=1000){
 const states=[],ctx=vm.createContext({console,Date,JSON,Object,Array,Number,String,Boolean,Map,Set,Promise,setTimeout,clearTimeout,Uint8Array,btoa:s=>Buffer.from(s,'binary').toString('base64'),navigator:{},location:{pathname:'/'}});
 vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(root,'backup.js'),'utf8'),ctx);
 if(fs.existsSync(path.join(root,'native-bridge.js')))vm.runInContext(fs.readFileSync(path.join(root,'native-bridge.js'),'utf8'),ctx);
 assert.ok(ctx.HjortNative,'native bridge is available');return {ctx,api:ctx.HjortNative.create(handler,{timeoutMs:timeout,onStatus:s=>states.push(s)}),states};
}
function snapshot(){return {bookings:[],renters:[],blacklist:[],settings:{memberPrice:1000,friendPrice:1500,deposit:500},backup:{format:'hjortemosen-backup',version:1,appVersion:'2.6.0',dataPresent:true,savedAt:'2026-10-03T20:00:00Z',drafts:{booking:null,contract:null,settings:null,blacklist:null}}};}
const receipt={ok:true,savedAt:'2026-10-03T20:00:01Z',file:'Hjortemosen/seneste-backup.json'};
test('Safari does not pretend a native file backup exists',async()=>{const {api}=boot(null);assert.equal(api.available,false);await assert.rejects(api.saveBackup(snapshot()),/installerede|tilgængelig/i);});
test('native backup is reported saved only after a valid file receipt',async()=>{
 let release;const {api,states}=boot({postMessage:()=>new Promise(resolve=>release=resolve)});const job=api.saveBackup(snapshot());await new Promise(r=>setImmediate(r));assert.equal(states.at(-1).state,'saving');assert.equal(states.some(s=>s.state==='saved'),false);release(receipt);await job;assert.equal(states.at(-1).state,'saved');
});
test('pending snapshots are immutable and reach the file writer in order',async()=>{
 const names=[],pending=[];const {api}=boot({postMessage:request=>{names.push(JSON.parse(request.snapshot).settings.memberPrice);return new Promise(r=>pending.push(r));}});const first=snapshot(),second=snapshot();second.settings.memberPrice=1250;const a=api.saveBackup(first),b=api.saveBackup(second);first.settings.memberPrice=9999;await new Promise(r=>setImmediate(r));assert.deepEqual(names,[1000]);pending[0](receipt);await a;await new Promise(r=>setImmediate(r));assert.deepEqual(names,[1000,1250]);pending[1](receipt);await b;
});
test('write failure does not report success and does not block the next backup',async()=>{
 let count=0;const {api,states}=boot({postMessage:()=>++count===1?Promise.resolve({ok:false,error:'Lagerplads mangler'}):Promise.resolve(receipt)});await assert.rejects(api.saveBackup(snapshot()),/Lagerplads/);assert.equal(states.at(-1).state,'error');await api.saveBackup(snapshot());assert.equal(states.at(-1).state,'saved');
});
test('invalid backups and invalid success receipts never count as saved',async()=>{
 const {api,states}=boot({postMessage:()=>Promise.resolve({ok:true})});const bad=snapshot();bad.backup.version=99;await assert.rejects(api.saveBackup(bad),/version/i);await assert.rejects(api.saveBackup(snapshot()),/kvittering/i);assert.equal(states.some(s=>s.state==='saved'),false);
});
test('an unresponsive native file writer times out visibly',async()=>{const {api,states}=boot({postMessage:()=>new Promise(()=>{})},15);await assert.rejects(api.saveBackup(snapshot()),/svarer|tid/i);assert.equal(states.at(-1).state,'error');});
test('startup reads and validates a complete native snapshot without changing it',async()=>{const original=JSON.stringify(snapshot());const {api}=boot({postMessage:()=>Promise.resolve({ok:true,snapshot:original})});assert.equal(await api.readLatest(),original);});
test('native share preserves actual PDF bytes and handles cancellation',async()=>{
 let sent;const {api}=boot({postMessage:request=>{sent=request;return Promise.resolve({ok:true,cancelled:true});}});const file={name:'kontrakt.pdf',type:'application/pdf',size:4,arrayBuffer:async()=>Uint8Array.from([0,255,10,42]).buffer};const result=await api.shareFile(file);assert.equal(sent.action,'share');assert.equal(sent.base64,'AP8KKg==');assert.equal(sent.name,'kontrakt.pdf');assert.equal(result.cancelled,true);
});

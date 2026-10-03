const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function boot(options={}){
 const nodes=new Map(),shares=[],downloads=[],revoked=[],data={bookings:options.bookings||[]};let serial=0;
 function node(id){if(!nodes.has(id)){const classes=new Set(['hidden']),events={};nodes.set(id,{value:'',textContent:'',innerHTML:'',disabled:false,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle(c,on){on?classes.add(c):classes.delete(c)},contains:c=>classes.has(c)},addEventListener:(name,fn)=>events[name]=fn,events,setAttribute(){},reportValidity:()=>true,reset(){for(const [id,n]of nodes)if(id.startsWith('#contract-'))n.value='';},focus(){},select(){},scrollIntoView(){}});}return nodes.get(id);}
 node('#contractTemplate').value='member-pdf';
 const ctx=vm.createContext({console,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,setTimeout,clearTimeout,Blob,File,URL:{createObjectURL:()=>`blob:test-${++serial}`,revokeObjectURL:url=>revoked.push(url)},$:node,$$:()=>[],data,APP_VERSION:'2.3.0',window:{},isoLocal:()=> '2026-10-03',money:n=>`${n} kr.`,esc:s=>String(s),download:(file,name)=>downloads.push({file,name}),toast(){},navigator:{...(options.native?{canShare:()=>true,share:arg=>{shares.push(arg);return options.share?options.share(arg):Promise.resolve();}}:{})},fetch:options.fetch|| (async url=>({ok:true,arrayBuffer:async()=>fs.readFileSync(path.join(root,url.slice(2).split('?')[0]))}))});
 for(const file of ['contract-libs.js','contracts.js','contract-ui.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
 function values(){for(const [k,v]of Object.entries({name:'Åse Østergaard',phone:'+45 12345678',email:'ase@example.dk',address:'Æblevej 12',rentalDate:'2026-12-12'}))node('#contract-'+k).value=v;}
 const generate=()=>node('#contractForm').onsubmit({preventDefault(){}});
 return {ctx,node,data,shares,downloads,revoked,values,generate,input:()=>node('#contractForm').events.input()};
}
test('sharing uses the already generated filled PDF with its name and MIME type',async()=>{
 const app=boot({native:true});app.values();await app.generate();await app.node('#shareFilledContract').onclick();
 assert.equal(app.shares.length,1);const file=app.shares[0].files[0];assert.equal(file.type,'application/pdf');assert.equal(file.name,'Lejekontrakt-Hjortemosen-1000-2026-12-12.pdf');
 const doc=await app.ctx.PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()));assert.equal(doc.getForm().getTextField('name').getText(),'Åse Østergaard');assert.equal(doc.getForm().getTextField('email').getText(),'ase@example.dk');
});
test('editing any field invalidates the old file and prevents sharing it',async()=>{
 const app=boot({native:true});app.values();await app.generate();app.node('#contract-name').value='Ny lejer';app.input();await app.node('#shareFilledContract').onclick();
 assert.equal(app.shares.length,0);assert.equal(app.node('#contractReady').classList.contains('hidden'),true);assert.equal(app.revoked.length,1);
});
test('Mail/Beskeder fallback downloads the actual filled Word file and explains attachment',async()=>{
 const app=boot();app.values();app.node('#contractTemplate').value='member-word';await app.generate();await app.node('#shareFilledContract').onclick();
 assert.equal(app.downloads.length,1);const file=app.downloads[0].file;assert.match(file.name,/\.docx$/);assert.match(file.type,/wordprocessingml/);
 const xml=app.ctx.fflate.strFromU8(app.ctx.fflate.unzipSync(new Uint8Array(await file.arrayBuffer()))['word/document.xml']);assert.match(xml,/Åse Østergaard/);assert.match(app.node('#contractStatus').textContent,/vedhæft/);
});
test('cancelled native sharing keeps the ready file and shows no error',async()=>{
 const app=boot({native:true,share:()=>Promise.reject(Object.assign(new Error('cancel'),{name:'AbortError'}))});app.values();await app.generate();await app.node('#shareFilledContract').onclick();
 assert.equal(app.node('#contractReady').classList.contains('hidden'),false);assert.equal(app.node('#contractError').classList.contains('hidden'),true);
});
test('a missing source cannot leave a previously generated file available',async()=>{
 let missing=false;const app=boot({native:true,fetch:async()=>({ok:!missing,arrayBuffer:async()=>fs.readFileSync(path.join(root,'kontrakt-1000.pdf'))})});app.values();await app.generate();missing=true;await app.generate();await app.node('#shareFilledContract').onclick();
 assert.equal(app.shares.length,0);assert.equal(app.node('#contractReady').classList.contains('hidden'),true);assert.match(app.node('#contractError').textContent,/kunne ikke åbnes/);
});
test('an edit during generation prevents stale asynchronous output from becoming ready',async()=>{
 let release;const app=boot({native:true,fetch:()=>new Promise(resolve=>release=resolve)});app.values();const promise=app.generate();app.input();release({ok:true,arrayBuffer:async()=>fs.readFileSync(path.join(root,'kontrakt-1000.pdf'))});await promise;
 assert.equal(app.node('#contractReady').classList.contains('hidden'),true);await app.node('#shareFilledContract').onclick();assert.equal(app.shares.length,0);
});
test('prefill selects the matching contract and leaves saved booking data untouched',()=>{
 const b={id:'b1',name:'Anna',address:'Skovvej',email:'a@example.dk',phone:'12345678',date:'2026-12-12',price:1500,deposit:500,type:'friend'},app=boot({bookings:[b]}),before=JSON.stringify(app.data);
 app.node('#contractBooking').value='b1';app.node('#contractBooking').onchange();assert.equal(app.node('#contractTemplate').value,'friend-pdf');assert.equal(app.node('#contract-name').value,'Anna');assert.equal(app.node('#contract-signature').value,'');assert.equal(JSON.stringify(app.data),before);
});
test('a selected free board booking blocks generation',async()=>{
 const app=boot({native:true,bookings:[{id:'b1',name:'Anna',date:'2026-12-12',price:0,deposit:0,type:'board'}]});app.node('#contractBooking').value='b1';app.node('#contractBooking').onchange();await app.generate();
 assert.equal(app.node('#makeContract').disabled,true);assert.match(app.node('#contractWarning').textContent,/gratis/);assert.equal(app.node('#contractReady').classList.contains('hidden'),true);
});
test('booking refresh retains refund account, meters, agreement date and manual contact edits',()=>{
 const b={id:'b1',name:'Anna',address:'Skovvej',email:'a@example.dk',phone:'12345678',date:'2026-12-12',price:1000,deposit:500,type:'member'},app=boot({bookings:[b]});app.node('#contractBooking').value='b1';app.node('#contractBooking').onchange();
 app.node('#contract-account').value='1234 567890';app.node('#contract-meterStart').value='5678';app.node('#contract-agreementDate').value='2026-09-30';app.node('#contract-name').value='Anna Hansen';
 b.depositPaid=true;app.ctx.window.HjortContractUI.refresh();assert.equal(app.node('#contract-account').value,'1234 567890');assert.equal(app.node('#contract-meterStart').value,'5678');
 b.address='Ny adresse';app.ctx.window.HjortContractUI.refresh();assert.equal(app.node('#contract-address').value,'Ny adresse');assert.equal(app.node('#contract-name').value,'Anna Hansen');assert.equal(app.node('#contract-account').value,'1234 567890');assert.equal(app.node('#contract-meterStart').value,'5678');assert.equal(app.node('#contract-agreementDate').value,'2026-09-30');
});

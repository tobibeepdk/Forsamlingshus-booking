const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function boot(options={}){
 const store=options.store||new Map(),events={};
 const nodes=new Map(),shares=[],downloads=[],revoked=[],data={bookings:options.bookings||[]};let serial=0;
  function node(id){if(!nodes.has(id)){const classes=new Set(['hidden']),events={};nodes.set(id,{value:'',textContent:'',innerHTML:'',disabled:false,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle(c,on){on?classes.add(c):classes.delete(c)},contains:c=>classes.has(c)},addEventListener:(name,fn)=>events[name]=fn,events,setAttribute(){},reportValidity:()=>true,reset(){for(const [id,n]of nodes)if(id.startsWith('#contract-'))n.value='';},focus(){this.focused=true;},select(){},scrollIntoView(){}});}return nodes.get(id);}
 node('#contractTemplate').value='member-pdf';
 node('#contract-email').checkValidity=()=>options.emailValid!==false;
 const select=node('#contractBooking');select.innerHTML='<option value="">Udfyld uden en booking</option>';let selection='';Object.defineProperty(select,'value',{get:()=>selection,set:value=>{selection=[...select.innerHTML.matchAll(/value="([^"]*)"/g)].some(match=>match[1]===String(value))?String(value):'';}});
 const drawing={clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}};
 const canvas=node('#signatureCanvas');Object.assign(canvas,{width:1200,height:400,getContext:()=>drawing,getBoundingClientRect:()=>({left:0,top:0,width:600,height:200}),setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){}});
 const document={addEventListener:(type,fn)=>events[type]=fn,createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/png;base64,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'})};
 const ctx=vm.createContext({console,document,atob,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,setTimeout,clearTimeout,Blob,File,URL:{createObjectURL:()=>`blob:test-${++serial}`,revokeObjectURL:url=>revoked.push(url)},$:node,$$:()=>[],data,APP_VERSION:'2.6.5',nativeApp:options.bridge||null,nativeReady:true,window:{addEventListener:(type,fn)=>events[type]=fn},isoLocal:()=> '2026-10-03',money:n=>`${n} kr.`,esc:s=>String(s),download:(file,name)=>downloads.push({file,name}),toast(){},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},navigator:{...(options.native?{canShare:()=>true,share:arg=>{shares.push(arg);return options.share?options.share(arg):Promise.resolve();}}:{})},fetch:options.fetch|| (async url=>({ok:true,arrayBuffer:async()=>fs.readFileSync(path.join(root,url.slice(2).split('?')[0]))}))});
 for(const file of ['data.js','backup.js','contract-libs.js','contracts.js','signature-pad.js','contract-ui.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
 function values(){for(const [k,v]of Object.entries({name:'Åse Østergaard',phone:'+45 12345678',email:'ase@example.dk',address:'Æblevej 12',rentalDate:'2026-12-12'}))node('#contract-'+k).value=v;}
 const generate=()=>node('#contractForm').onsubmit({preventDefault(){}});
 const draw=()=>{assert.ok(canvas.events.pointerdown,'handwriting is connected to the form');const e={pointerId:1,isPrimary:true,button:0,clientX:50,clientY:40,preventDefault(){}};canvas.events.pointerdown(e);canvas.events.pointerup({...e,clientX:150,clientY:90});};
 return {store,events,draw,ctx,node,data,shares,downloads,revoked,values,generate,input:()=>node('#contractForm').events.input()};
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

test('drawn signature travels in the actual shared PDF; clearing ink removes it from the next file',async()=>{
 const app=boot({native:true});app.values();app.draw();await app.generate();await app.node('#shareFilledContract').onclick();
 async function hasInk(file){const doc=await app.ctx.PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer())),P=app.ctx.PDFLib,images=doc.context.lookup(doc.getPage(0).node.Resources().get(P.PDFName.of('XObject')));return images.entries().some(([,r])=>doc.context.lookup(r).dict.get(P.PDFName.of('Width'))?.asNumber()===480);}
 assert.equal(await hasInk(app.shares[0].files[0]),true);app.node('#clearSignature').onclick();await app.node('#shareFilledContract').onclick();assert.equal(app.shares.length,1);await app.generate();await app.node('#shareFilledContract').onclick();assert.equal(await hasInk(app.shares[1].files[0]),false);
});
test('editing contract details removes previous handwriting while payment-only refresh preserves it',async()=>{
 const b={id:'b1',name:'Anna',date:'2026-12-12',price:1000,deposit:500,type:'member'},app=boot({native:true,bookings:[b]});app.node('#contractBooking').value='b1';app.node('#contractBooking').onchange();app.draw();
 b.depositPaid=true;app.ctx.window.HjortContractUI.refresh();assert.match(app.node('#signatureStatus').textContent,/tilføjet/);
 app.input();assert.match(app.node('#signatureStatus').textContent,/ingen|tomt/i);app.draw();b.date='2026-12-13';app.ctx.window.HjortContractUI.refresh();assert.match(app.node('#signatureStatus').textContent,/ingen|tomt/i);
});

test('contract fields and user handwriting return together after app reopen',()=>{const app=boot();app.values();app.node('#contract-account').value='1234 56789';app.input();app.draw();assert.ok(app.store.has('hjortemosen_contract_draft_v1'),'contract is saved without submit');const reopened=boot({store:app.store});assert.equal(reopened.node('#contract-name').value,'Åse Østergaard');assert.equal(reopened.node('#contract-account').value,'1234 56789');assert.match(reopened.node('#signatureStatus').textContent,/tilføjet|gendannet/);reopened.node('#clearContract').onclick();assert.equal(reopened.store.has('hjortemosen_contract_draft_v1'),false);});
test('restoring a signed draft clears handwriting if its booking has changed while the app was closed',()=>{const before={id:'b1',name:'Anna',date:'2026-12-12',price:1000,deposit:500,type:'member'},app=boot({bookings:[before]});app.node('#contractBooking').value='b1';app.node('#contractBooking').onchange();app.draw();assert.ok(app.store.has('hjortemosen_contract_draft_v1'));const reopened=boot({store:app.store,bookings:[{...before,date:'2026-12-13'}]});assert.match(reopened.node('#signatureStatus').textContent,/ingen|tomt/i);assert.equal(reopened.node('#contract-rentalDate').value,'2026-12-13');});
test('a stale contract window cannot overwrite newer contract fields or handwriting',()=>{const first=boot();first.values();first.input();const stale=boot({store:first.store});first.node('#contract-name').value='Ny kontrakt';first.input();const raw=first.store.get('hjortemosen_contract_draft_v1');stale.node('#contract-name').value='Gammelt vindue';stale.input();assert.equal(first.store.get('hjortemosen_contract_draft_v1'),raw);assert.match(stale.node('#contractAutoSaveStatus').textContent,/andet vindue/);});

test('signed draft restores its native select only after matching booking options exist',()=>{const b={id:'b1',name:'Anna',date:'2026-12-12',price:1000,deposit:500,type:'member'},app=boot({bookings:[b]});app.node('#contractBooking').value='b1';app.node('#contractBooking').onchange();app.draw();const reopened=boot({bookings:[b],store:app.store});assert.equal(reopened.node('#contractBooking').value,'b1');assert.match(reopened.node('#signatureStatus').textContent,/tilføjet|gendannet/);assert.ok(JSON.parse(app.store.get('hjortemosen_contract_draft_v1')).strokes.length);});

test('installed iPad shares and previews the generated signed PDF through the native bridge',async()=>{
 const shared=[],previewed=[];const app=boot({bridge:{shareFile:async file=>{shared.push(file);return {ok:true,cancelled:true};},previewFile:async file=>{previewed.push(file);return {ok:true};}}});app.values();app.draw();await app.generate();let prevented=false;await app.node('#openFilledContract').onclick({preventDefault(){prevented=true;}});await app.node('#shareFilledContract').onclick();assert.equal(prevented,true);assert.equal(previewed[0],shared[0]);assert.match(app.node('#contractStatus').textContent,/afbrudt/);const doc=await app.ctx.PDFLib.PDFDocument.load(new Uint8Array(await shared[0].arrayBuffer()));assert.equal(doc.getForm().getTextField('name').getText(),'Åse Østergaard');assert.ok(doc.getPages()[0].node.Resources().get(app.ctx.PDFLib.PDFName.of('XObject')));
});

test('Gmail guidance accompanies the actual filled signed PDF and preserves the saved contract',async()=>{
 const app=boot({native:true});app.values();app.draw();await app.generate();const saved=app.store.get('hjortemosen_contract_draft_v1');await app.node('#sendContractEmail').onclick();
 assert.equal(app.shares.length,1);const file=app.shares[0].files[0],doc=await app.ctx.PDFLib.PDFDocument.load(new Uint8Array(await file.arrayBuffer()));
 assert.equal(file.name,'Lejekontrakt-Hjortemosen-1000-2026-12-12.pdf');assert.equal(doc.getForm().getTextField('name').getText(),'Åse Østergaard');assert.equal(doc.getForm().getTextField('email').getText(),'ase@example.dk');
 const P=app.ctx.PDFLib,images=doc.context.lookup(doc.getPage(0).node.Resources().get(P.PDFName.of('XObject')));assert.ok(images.entries().some(([,r])=>doc.context.lookup(r).dict.get(P.PDFName.of('Width'))?.asNumber()===480));
 assert.equal(app.store.get('hjortemosen_contract_draft_v1'),saved);assert.match(app.node('#contractStatus').textContent,/tryk.*Send/i);assert.match(app.node('#contractStatus').textContent,/Gmail/);assert.match(app.node('#contractStatus').textContent,/Googlekonto.*Fra/i);assert.match(app.node('#contractStatus').textContent,/Sendt post.*samme konto/i);assert.doesNotMatch(app.node('#contractStatus').textContent,/Hotmail|\b(?:er|blev) sendt\b|sendt korrekt/i);
});
test('unsupported email sharing downloads the filled Word file and prepares a manual attachment draft',async()=>{
 const app=boot();app.values();app.node('#contract-email').value='ase+hus@example.dk';app.node('#contractTemplate').value='member-word';await app.generate();await app.node('#sendContractEmail').onclick();
 assert.equal(app.downloads.length,1);const file=app.downloads[0].file;assert.equal(file.name,'Lejekontrakt-Hjortemosen-1000-2026-12-12.docx');
 const xml=app.ctx.fflate.strFromU8(app.ctx.fflate.unzipSync(new Uint8Array(await file.arrayBuffer()))['word/document.xml']);assert.match(xml,/Åse Østergaard/);
 const draft=new URL(app.node('#contractEmailDraft').href);assert.equal(draft.protocol,'mailto:');assert.equal(decodeURIComponent(draft.pathname),'ase+hus@example.dk');assert.match(draft.searchParams.get('subject'),/Hjortemosen.*2026-12-12/);assert.match(draft.searchParams.get('body'),/Vedhæft.*Lejekontrakt-Hjortemosen-1000-2026-12-12.docx/);
 assert.equal(app.node('#contractEmailFallback').classList.contains('hidden'),false);assert.match(app.node('#contractStatus').textContent,/vedhæft/i);assert.match(app.node('#contractStatus').textContent,/standardmailapp.*uden vedhæftning/i);assert.match(app.node('#contractStatus').textContent,/åbn Gmail selv/i);assert.doesNotMatch(app.node('#contractStatus').textContent,/Hotmail|\b(?:er|blev) sendt\b/i);
});
test('email requires a recipient and obeys the email input validity before sharing',async()=>{
 for(const options of [{native:true},{native:true,emailValid:false}]){
  const app=boot(options);app.values();if(options.emailValid!==false)app.node('#contract-email').value='';else app.node('#contract-email').value='bad\r\nbcc:other@example.dk';await app.generate();await app.node('#sendContractEmail').onclick();
  assert.equal(app.shares.length,0);assert.equal(app.downloads.length,0);assert.equal(app.node('#contractError').classList.contains('hidden'),false);assert.match(app.node('#contractError').textContent,/e-mailadresse/);
 }
});
test('cancelling Gmail sharing preserves the signed draft without claiming a message was sent',async()=>{
 const app=boot({native:true,share:()=>Promise.reject(Object.assign(new Error('cancel'),{name:'AbortError'}))});app.values();app.draw();await app.generate();const saved=app.store.get('hjortemosen_contract_draft_v1');await app.node('#sendContractEmail').onclick();
 assert.equal(app.node('#contractReady').classList.contains('hidden'),false);assert.equal(app.node('#contractError').classList.contains('hidden'),true);assert.match(app.node('#contractStatus').textContent,/afbrudt/);assert.equal(app.downloads.length,0);assert.equal(app.store.get('hjortemosen_contract_draft_v1'),saved);assert.doesNotMatch(app.node('#contractStatus').textContent,/\b(?:er|blev) sendt\b/i);
});
test('installed iPad email uses the real contract file and respects native cancellation',async()=>{
 const files=[];const app=boot({bridge:{shareFile:async file=>{files.push(file);return {ok:true,cancelled:true};}}});app.values();await app.generate();await app.node('#sendContractEmail').onclick();
 assert.equal(files.length,1);const doc=await app.ctx.PDFLib.PDFDocument.load(new Uint8Array(await files[0].arrayBuffer()));assert.equal(doc.getForm().getTextField('name').getText(),'Åse Østergaard');assert.match(app.node('#contractStatus').textContent,/afbrudt/);assert.equal(app.downloads.length,0);
});
test('editing the contract removes the old email draft and prevents emailing a stale file',async()=>{
 const app=boot();app.values();await app.generate();await app.node('#sendContractEmail').onclick();app.node('#contract-name').value='Ny lejer';app.input();await app.node('#sendContractEmail').onclick();
 assert.equal(app.downloads.length,1);assert.equal(app.node('#contractEmailFallback').classList.contains('hidden'),true);assert.equal(app.node('#contractEmailDraft').href,'#');
});
test('a pending email share cannot duplicate its file or overwrite status after a contract edit',async()=>{
 let release;const app=boot({native:true,share:()=>new Promise(resolve=>release=resolve)});app.values();await app.generate();const pending=app.node('#sendContractEmail').onclick();await app.node('#sendContractEmail').onclick();assert.equal(app.shares.length,1);
 app.node('#contract-name').value='Ny lejer';app.input();const status=app.node('#contractStatus').textContent;release();await pending;assert.equal(app.node('#contractStatus').textContent,status);assert.equal(app.node('#sendContractEmail').disabled,false);
});
test('failed email sharing keeps the file and offers a draft requiring manual attachment',async()=>{
 const app=boot({native:true,share:()=>Promise.reject(new Error('unavailable'))});app.values();await app.generate();await app.node('#sendContractEmail').onclick();
 assert.equal(app.node('#contractReady').classList.contains('hidden'),false);assert.equal(app.node('#sendContractEmail').disabled,false);assert.equal(app.node('#contractEmailFallback').classList.contains('hidden'),false);assert.match(app.node('#contractError').textContent,/Gem fil/);assert.equal(app.downloads.length,0);
 const draft=new URL(app.node('#contractEmailDraft').href);assert.equal(decodeURIComponent(draft.pathname),'ase@example.dk');assert.match(draft.searchParams.get('body'),/Vedhæft.*\.pdf/);assert.match(app.node('#contractError').textContent,/manuelt i Gmail/i);assert.match(app.node('#contractStatus').textContent,/standardmailapp.*uden vedhæftning/i);assert.doesNotMatch(app.node('#contractStatus').textContent,/Hotmail|\b(?:er|blev) sendt\b/i);
});
test('Gmail sharing keeps the filled Word contract and its embedded handwritten signature',async()=>{
 const app=boot({native:true});app.values();app.node('#contractTemplate').value='member-word';app.draw();await app.generate();const saved=app.store.get('hjortemosen_contract_draft_v1');await app.node('#sendContractEmail').onclick();
 assert.equal(app.shares.length,1);const file=app.shares[0].files[0];assert.equal(file.name,'Lejekontrakt-Hjortemosen-1000-2026-12-12.docx');assert.equal(file.type,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 const zip=app.ctx.fflate.unzipSync(new Uint8Array(await file.arrayBuffer())),xml=app.ctx.fflate.strFromU8(zip['word/document.xml']);assert.match(xml,/Åse Østergaard/);assert.match(xml,/ase@example.dk/);assert.match(xml,/r:embed="rIdHjortSignature"/);
 const png=zip['word/media/hjortemosen-signature.png'];assert.deepEqual(Array.from(png.subarray(0,8)),[137,80,78,71,13,10,26,10]);assert.equal(new DataView(png.buffer,png.byteOffset,png.byteLength).getUint32(16),480);
 assert.equal(app.store.get('hjortemosen_contract_draft_v1'),saved);assert.match(app.node('#contractStatus').textContent,/Gmail/);assert.match(app.node('#contractStatus').textContent,/tryk.*Send/i);assert.doesNotMatch(app.node('#contractStatus').textContent,/\b(?:er|blev) sendt\b/i);
});
test('a failed pending Gmail share after editing cannot restore the stale attachment draft',async()=>{
 let reject;const app=boot({native:true,share:()=>new Promise((resolve,no)=>reject=no)});app.values();app.draw();await app.generate();const pending=app.node('#sendContractEmail').onclick();
 app.node('#contract-email').value='ny@example.dk';app.input();const status=app.node('#contractStatus').textContent,saved=app.store.get('hjortemosen_contract_draft_v1');reject(new Error('share unavailable'));await pending;
 assert.equal(app.node('#contractStatus').textContent,status);assert.equal(app.node('#contractEmailDraft').href,'#');assert.equal(app.node('#contractEmailFallback').classList.contains('hidden'),true);assert.equal(app.node('#contractError').classList.contains('hidden'),true);assert.equal(app.node('#sendContractEmail').disabled,false);assert.equal(app.downloads.length,0);assert.equal(app.store.get('hjortemosen_contract_draft_v1'),saved);
});
function clickSms(app,id){
 const link=app.node(id);assert.equal(typeof link.onclick,'function','SMS link validates on the direct click');let prevented=false;
 const result=link.onclick({preventDefault(){prevented=true;}});assert.equal(result,undefined,'SMS click stays synchronous and allows the anchor default');return prevented;
}
test('SMS links normalize one number without country guessing, body or query and work without a PDF',()=>{
 const app=boot();for(const [typed,want]of [[' (+45) 12-34.56 78 ','sms:+4512345678'],['12 34 56 78','sms:12345678'],['+1 (202) 555-0179','sms:+12025550179'],['123','sms:123'],['123456789012345','sms:123456789012345']]){
  app.node('#contract-phone').value=typed;app.input();for(const id of ['#openContractSms','#openFilledContractSms']){assert.equal(app.node(id).href,want);assert.equal(clickSms(app,id),false);assert.equal(app.node(id).href,want);}
  assert.equal(app.node('#contract-phone').value,typed,'normalization does not rewrite contract data');assert.equal(app.node('#contractReady').classList.contains('hidden'),true);
 }
 assert.equal(app.shares.length,0);assert.equal(app.downloads.length,0);
});
test('invalid or multiple SMS recipients remove any old target and block default navigation',()=>{
 const app=boot();app.node('#contract-phone').value='12345678';app.input();
 for(const typed of ['', '12','1234567890123456','++45123456','12+345','123,456','123;456','123?body=hej','123&body=hej','１２３','12/34','123 ext 45','123–456']){
  app.node('#contract-phone').value=typed;app.input();for(const id of ['#openContractSms','#openFilledContractSms']){assert.equal(app.node(id).href,'#');assert.equal(clickSms(app,id),true);assert.equal(app.node(id).href,'#');}
  assert.equal(app.node('#contractError').classList.contains('hidden'),false);assert.match(app.node('#contractError').textContent,/telefonnummer/i);assert.equal(app.node('#contractSmsError').classList.contains('hidden'),false);assert.match(app.node('#contractSmsError').textContent,/telefonnummer/i);assert.equal(app.node('#contract-phone').focused,true);
 }
 assert.equal(app.shares.length,0);assert.equal(app.downloads.length,0);
});
test('SMS feedback near the phone clears on edits, phone change and a valid direct retry',()=>{
 const app=boot();app.node('#contract-phone').value='ugyldigt';app.input();clickSms(app,'#openContractSms');assert.equal(app.node('#contractSmsError').classList.contains('hidden'),false);
 app.node('#contract-phone').value='12345678';app.input();assert.equal(app.node('#contractSmsError').classList.contains('hidden'),true);
 app.node('#contract-phone').value='forkert';clickSms(app,'#openContractSms');assert.equal(app.node('#contractSmsError').classList.contains('hidden'),false);app.node('#contract-phone').value='87654321';app.node('#contract-phone').events.change();assert.equal(app.node('#contractSmsError').classList.contains('hidden'),true);
 app.node('#contract-phone').value='forkert';clickSms(app,'#openContractSms');app.node('#contract-phone').value='+45 12345678';assert.equal(clickSms(app,'#openContractSms'),false);assert.equal(app.node('#contractSmsError').classList.contains('hidden'),true);assert.equal(app.node('#contractError').classList.contains('hidden'),true);
});
test('SMS direct click revalidates the current field even when no input event ran',()=>{
 const app=boot();app.node('#contract-phone').value='12345678';app.input();app.node('#contract-phone').value='+45 87 65 43 21';
 assert.equal(clickSms(app,'#openContractSms'),false);assert.equal(app.node('#openContractSms').href,'sms:+4587654321');assert.equal(app.node('#openFilledContractSms').href,'sms:+4587654321');
 app.node('#contract-phone').value='123?body=wrong';assert.equal(clickSms(app,'#openFilledContractSms'),true);assert.equal(app.node('#openContractSms').href,'#');assert.equal(app.node('#openFilledContractSms').href,'#');
});
test('phone change, booking prefill, restore and booking refresh keep both SMS targets current',()=>{
 const b={id:'b1',name:'Anna',phone:'(+45) 12-34-56-78',date:'2026-12-12',price:1000,deposit:500,type:'member'},app=boot({bookings:[b]});
 app.node('#contractBooking').value='b1';app.node('#contractBooking').onchange();for(const id of ['#openContractSms','#openFilledContractSms'])assert.equal(app.node(id).href,'sms:+4512345678');
 const restored=boot({bookings:[b],store:app.store});for(const id of ['#openContractSms','#openFilledContractSms'])assert.equal(restored.node(id).href,'sms:+4512345678');
 b.phone='87 65 43 21';restored.ctx.window.HjortContractUI.refresh();for(const id of ['#openContractSms','#openFilledContractSms'])assert.equal(restored.node(id).href,'sms:87654321');
 restored.node('#contract-phone').value='+49 123456789';assert.equal(typeof restored.node('#contract-phone').events.change,'function');restored.node('#contract-phone').events.change();for(const id of ['#openContractSms','#openFilledContractSms'])assert.equal(restored.node(id).href,'sms:+49123456789');
 restored.node('#clearContract').onclick();for(const id of ['#openContractSms','#openFilledContractSms'])assert.equal(restored.node(id).href,'#');
});
test('invalid SMS click preserves the ready signed PDF, saved draft and handwritten signature',async()=>{
 const app=boot({native:true});app.values();app.node('#contract-phone').value='ugyldigt nummer';app.draw();await app.generate();const saved=app.store.get('hjortemosen_contract_draft_v1'),url=app.node('#openFilledContract').href,ink=app.node('#signatureStatus').textContent,revoked=app.revoked.length;
 for(const id of ['#openContractSms','#openFilledContractSms'])assert.equal(clickSms(app,id),true);
 assert.equal(app.node('#contractReady').classList.contains('hidden'),false);assert.equal(app.node('#openFilledContract').href,url);assert.equal(app.node('#signatureStatus').textContent,ink);assert.equal(app.store.get('hjortemosen_contract_draft_v1'),saved);assert.equal(app.revoked.length,revoked);assert.equal(app.shares.length,0);assert.equal(app.downloads.length,0);
 await app.node('#shareFilledContract').onclick();const P=app.ctx.PDFLib,doc=await P.PDFDocument.load(new Uint8Array(await app.shares[0].files[0].arrayBuffer()));assert.equal(doc.getForm().getTextField('phone').getText(),'ugyldigt nummer');assert.equal(doc.getForm().getTextField('name').getText(),'Åse Østergaard');const images=doc.context.lookup(doc.getPage(0).node.Resources().get(P.PDFName.of('XObject')));assert.ok(images.entries().some(([,r])=>doc.context.lookup(r).dict.get(P.PDFName.of('Width'))?.asNumber()===480));
});
test('valid SMS click preserves a signed contract and explains writing and sending without attachment',async()=>{
 const app=boot({native:true});app.values();app.draw();await app.generate();const saved=app.store.get('hjortemosen_contract_draft_v1'),url=app.node('#openFilledContract').href,ink=app.node('#signatureStatus').textContent;
 assert.equal(clickSms(app,'#openFilledContractSms'),false);assert.equal(app.node('#openFilledContractSms').href,'sms:+4512345678');assert.equal(app.node('#contractReady').classList.contains('hidden'),false);assert.equal(app.node('#openFilledContract').href,url);assert.equal(app.node('#signatureStatus').textContent,ink);assert.equal(app.store.get('hjortemosen_contract_draft_v1'),saved);
 assert.equal(app.shares.length,0);assert.equal(app.downloads.length,0);assert.match(app.node('#contractStatus').textContent,/skriv.*besked/i);assert.match(app.node('#contractStatus').textContent,/selv.*Send/i);assert.match(app.node('#contractStatus').textContent,/vedhæfter ikke kontrakt/i);assert.match(app.node('#contractStatus').textContent,/kan ikke kontrollere/i);assert.doesNotMatch(app.node('#contractStatus').textContent,/\b(?:er|blev) sendt\b/i);
});

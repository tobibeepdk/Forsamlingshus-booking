const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function boot(){
 const ctx=vm.createContext({TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,setTimeout,clearTimeout,console});
 for(const name of ['contract-libs.js','data.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx);
 if(fs.existsSync(path.join(root,'calendar-pdf.js')))vm.runInContext(fs.readFileSync(path.join(root,'calendar-pdf.js'),'utf8'),ctx);
 assert.equal(typeof ctx.HjortCalendarPDF?.build,'function','a standalone calendar PDF builder is available');
 return ctx;
}
async function inspect(ctx,request){
 const bytes=await ctx.HjortCalendarPDF.build(request);assert.ok(ArrayBuffer.isView(bytes));assert.equal(Buffer.from(bytes).subarray(0,5).toString(),'%PDF-');
 const doc=await ctx.PDFLib.PDFDocument.load(bytes),pages=[];
 for(const page of doc.getPages()){
  const contents=page.node.Contents(),refs=contents instanceof ctx.PDFLib.PDFArray?contents.asArray():[contents];let operators='';
  for(const ref of refs){const stream=doc.context.lookup(ref);operators+=new TextDecoder().decode(ctx.PDFLib.decodePDFRawStream(stream).decode());}
  const spans=[];
  for(const match of operators.matchAll(/BT([\s\S]*?)ET/g)){
   const position=match[1].match(/1 0 0 1 ([\d.\-]+) ([\d.\-]+) Tm/),text=match[1].match(/<([0-9A-Fa-f]+)> Tj/);
   const face=match[1].match(/\/(\S+) ([\d.]+) Tf/);
   if(position&&text&&face)spans.push({x:Number(position[1]),y:Number(position[2]),size:Number(face[2]),bold:face[1].startsWith('HelveticaBold'),text:new TextDecoder('windows-1252').decode(Buffer.from(text[1],'hex'))});
  }
  pages.push({size:page.getSize(),spans,text:spans.map(x=>x.text).join('\n')});
 }
 return {bytes,doc,pages,text:pages.map(x=>x.text).join('\n')};
}
const booking=(name,date,extra={})=>({id:name,name,date,type:'member',price:1000,deposit:500,paid:true,depositPaid:true,houseNo:'12',...extra});
const compact=text=>text.replace(/\s/g,'');
function listColumns(pdf){
 let nameText='',gardenText='';for(const page of pdf.pages.slice(1)){
  const name=page.spans.find(x=>x.text==='Lejer'),garden=page.spans.find(x=>x.text==='Have nr.'),payment=page.spans.find(x=>x.text==='Betaling');
  nameText+=page.spans.filter(x=>x.y<name.y-10&&x.x>=name.x&&x.x<garden.x).map(x=>x.text).join('');
  gardenText+=page.spans.filter(x=>x.y<garden.y-10&&x.x>=garden.x&&x.x<payment.x).map(x=>x.text).join('');
 }
 return {nameText:compact(nameText),gardenText:compact(gardenText)};
}

test('six-week month is a complete Monday-Sunday A4 landscape grid',async()=>{
 const ctx=boot(),pdf=await inspect(ctx,{year:2026,month:8,bookings:[]}),page=pdf.pages[0];
 assert.ok(Math.abs(page.size.width-841.89)<1);assert.ok(Math.abs(page.size.height-595.28)<1);
 assert.match(page.text,/august 2026/i);for(const label of ['Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag','Søndag'])assert.ok(page.spans.some(x=>x.text===label));
 const days=page.spans.filter(x=>/^\d{1,2}$/.test(x.text));assert.deepEqual(days.map(x=>Number(x.text)),Array.from({length:31},(_,i)=>i+1));
 const first=days[0],last=days.at(-1),saturday=page.spans.find(x=>x.text==='Lørdag'),monday=page.spans.find(x=>x.text==='Mandag');
 assert.ok(Math.abs(first.x-saturday.x)<5,'August 1 2026 is in the Saturday column');assert.ok(Math.abs(last.x-monday.x)<5,'August 31 2026 is in the sixth-row Monday column');assert.ok(first.y-last.y>300,'six separate week rows are retained');
 assert.equal(pdf.pages.length,1,'an empty month needs no appendix');
});
test('leap day is included while bookings outside the selected month are excluded',async()=>{
 const ctx=boot(),pdf=await inspect(ctx,{year:2024,month:2,bookings:[booking('Åse Ærlig Østergaard','2024-02-29'),booking('Marts udenfor','2024-03-01'),booking('Januar udenfor','2024-01-31')]});
 assert.match(pdf.text,/februar 2024/i);assert.ok(pdf.pages[0].spans.some(x=>x.text==='29'));assert.ok(!pdf.pages[0].spans.some(x=>x.text==='30'));assert.ok(compact(pdf.text).includes(compact('Åse Ærlig Østergaard')));assert.doesNotMatch(pdf.text,/udenfor/);
 const leap=pdf.pages[0].spans.find(x=>x.text==='29'),thursday=pdf.pages[0].spans.find(x=>x.text==='Torsdag');assert.ok(Math.abs(leap.x-thursday.x)<5);
});
test('legacy duplicate dates retain every booking and all garden numbers in a complete list',async()=>{
 const entries=[booking('Anna første','2026-10-07',{houseNo:'14 A'}),booking('Bo anden','2026-10-07',{houseNo:'27 B'}),booking('Clara tredje','2026-10-07',{houseNo:'39 C'})];
 const ctx=boot(),pdf=await inspect(ctx,{year:2026,month:10,bookings:entries});assert.ok(pdf.pages.length>=2);
 for(const entry of entries){assert.ok(compact(pdf.pages.slice(1).map(x=>x.text).join('')).includes(compact(entry.name)));assert.ok(pdf.text.includes(entry.houseNo));}
 assert.match(pdf.pages[0].text,/bookingliste|liste/i);
});
test('payment labels preserve outstanding deposit and legacy free-board semantics',async()=>{
 const entries=[booking('Betalt medlem','2026-10-01'),booking('Rest leje','2026-10-02',{paid:false}),booking('Rest depositum','2026-10-03',{depositPaid:false}),booking('Bestyrelse depositum','2026-10-04',{type:'board',price:0,paid:false,depositPaid:false}),booking('Bestyrelse betalt','2026-10-05',{type:'board',price:0,paid:false,depositPaid:true}),booking('Tidligere gratis','2026-10-06',{type:'board',price:0,deposit:0,paid:false,depositPaid:false})];
 const ctx=boot(),pdf=await inspect(ctx,{year:2026,month:10,bookings:entries}),list=pdf.pages.slice(1).flatMap(p=>p.spans).map(x=>x.text);
 for(const [name,label]of [['Betalt medlem','Betalt'],['Rest leje','Mangler betaling'],['Rest depositum','Mangler betaling'],['Bestyrelse depositum','Mangler betaling'],['Bestyrelse betalt','Betalt'],['Tidligere gratis','Gratis']]){
  const index=list.indexOf(name);assert.ok(index>=0,`complete list contains ${name}`);assert.ok(list.slice(index+1,index+5).includes(label),`${name} has ${label}`);
 }
});
test('many bookings and long unbroken names paginate without losing entries or overflowing text',async()=>{
 const names=Array.from({length:76},(_,i)=>`Lejer ${String(i).padStart(3,'0')} ${'Langtnavn'.repeat(12)}`),entries=names.map((name,i)=>booking(name,'2026-10-07',{houseNo:`Have ${i} ${'X'.repeat(70)}`}));
 const before=JSON.stringify(entries),ctx=boot(),pdf=await inspect(ctx,{year:2026,month:10,bookings:entries});assert.ok(pdf.pages.length>3,'appendix spans multiple pages');
 // Names and garden fields occupy separate table columns; reading the draw
 // operators in sequence interleaves their wrapped lines.
 const {nameText,gardenText}=listColumns(pdf);
 for(const entry of entries){assert.ok(nameText.includes(compact(entry.name)),`full name ${entry.id}`);assert.ok(gardenText.includes(compact(entry.houseNo)),`full garden ${entry.houseNo}`);}
 assert.equal(JSON.stringify(entries),before,'rendering is read-only');for(const p of pdf.pages)for(const span of p.spans)assert.ok(span.x>=20&&span.x<p.size.width-20&&span.y>=20&&span.y<p.size.height-20,'all text starts within page bounds');
});
test('six-week duplicate indicator has a clear gap below the payment status',async()=>{
 const ctx=boot(),pdf=await inspect(ctx,{year:2026,month:8,bookings:[booking('Anna','2026-08-01'),booking('Bo','2026-08-01'),booking('Clara','2026-08-01')]}),spans=pdf.pages[0].spans;
 const payment=spans.find(x=>x.text==='Betalt'),duplicate=spans.find(x=>x.text.startsWith('+2'));
 assert.ok(duplicate.y+duplicate.size<=payment.y-2,'duplicate count must not overlap the payment line in a six-week cell');
});
test('one exceptionally long booking continues across pages without dropping its name',async()=>{
 const entry=booking('Åse '+('Ekstraordinærtlangtnavn'.repeat(140)),'2026-10-07',{houseNo:'Ø Have '+('A'.repeat(1800))});Object.freeze(entry);const entries=Object.freeze([entry]);
 const ctx=boot(),pdf=await inspect(ctx,{year:2026,month:10,bookings:entries}),text=listColumns(pdf);assert.ok(pdf.pages.length>2);assert.ok(text.nameText.includes(compact(entry.name)));assert.ok(text.gardenText.includes(compact(entry.houseNo)));
 const normal=await pdf.doc.embedFont(ctx.PDFLib.StandardFonts.Helvetica),bold=await pdf.doc.embedFont(ctx.PDFLib.StandardFonts.HelveticaBold);
 for(const page of pdf.pages)for(const span of page.spans){const face=span.bold?bold:normal;assert.ok(span.x+face.widthOfTextAtSize(span.text,span.size)<=page.size.width-20,'text ends within the page bounds');}
});
test('month validation and unsupported names fail clearly rather than silently changing text',async()=>{
 const ctx=boot();for(const request of [{year:2026,month:0,bookings:[]},{year:2026,month:13,bookings:[]},{year:2026.5,month:10,bookings:[]}])await assert.rejects(()=>ctx.HjortCalendarPDF.build(request),/måned|år|dato/i);
 await assert.rejects(()=>ctx.HjortCalendarPDF.build({year:2026,month:10,bookings:[booking('李 lejer','2026-10-07')]}),/tegn|skrifttype/i);
});

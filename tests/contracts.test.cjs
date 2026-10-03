const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const ctx=vm.createContext({console,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,setTimeout,clearTimeout,Blob,File});
vm.runInContext(fs.readFileSync(path.join(root,'contract-libs.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'contracts.js'),'utf8'),ctx);
const C=ctx.HjortContracts;
const values={name:'Åse Østergaard',phone:'+45 12 34 56 78',address:'Æblevej 12, 4000 Roskilde',email:'ase@example.dk',account:'2520 1234567890',agreementDate:'2026-10-03',rentalDate:'2026-12-12',meterStart:'12345,6',meterEnd:'12400,7',signature:''};
const source=id=>new Uint8Array(fs.readFileSync(path.join(root,C.templates[id].path)));
for(const id of ['member-pdf','friend-pdf'])test(id+' preserves the source page and stores all ten editable fields with appearances',async()=>{
 const bytes=await C.build(id,source(id),values),doc=await ctx.PDFLib.PDFDocument.load(bytes),original=await ctx.PDFLib.PDFDocument.load(source(id));
 assert.equal(doc.getPageCount(),1);assert.deepEqual(doc.getPage(0).getSize(),original.getPage(0).getSize());
 const form=doc.getForm();assert.equal(form.getFields().length,10);
 for(const key of Object.keys(values)){const field=form.getTextField(key);assert.equal(field.getText()||'',C.displayValue(key,values[key]));assert.ok(field.acroField.getWidgets()[0].dict.get(ctx.PDFLib.PDFName.of('AP')));}
 const output=doc.getPage(0).node.Contents(),originalBytes=Buffer.from(original.getPage(0).node.Contents().getContents());
 assert.ok(output.asArray().some(ref=>Buffer.from(doc.context.lookup(ref).getContents()).equals(originalBytes)),'original page content stream preserved');
});
test('long unbroken contact information is kept legible in an appendix with its full canonical value',async()=>{
 const long={...values,email:'verylong'.repeat(45)+'@example.dk'};const bytes=await C.build('member-pdf',source('member-pdf'),long),doc=await ctx.PDFLib.PDFDocument.load(bytes);
 assert.ok(doc.getPageCount()>1);assert.equal(doc.getForm().getTextField('email').getText(),long.email);
 const widget=doc.getForm().getTextField('email').acroField.getWidgets()[0];assert.notEqual(widget.P().toString(),doc.getPage(0).ref.toString());
});
test('wrapped PDF fields keep Danish accents and descenders visible on the appendix',async()=>{
 const name='Åse Østergaard Hansen gjpqy '.repeat(4).trim(),bytes=await C.build('member-pdf',source('member-pdf'),{...values,name}),doc=await ctx.PDFLib.PDFDocument.load(bytes);
 assert.equal(doc.getPageCount(),2);assert.equal(doc.getForm().getTextField('name').getText(),name);
 const widget=doc.getForm().getTextField('name').acroField.getWidgets()[0],ap=doc.context.lookup(widget.dict.get(ctx.PDFLib.PDFName.of('AP'))),stream=doc.context.lookup(ap.get(ctx.PDFLib.PDFName.of('N')));
 const operators=Buffer.from(ctx.PDFLib.decodePDFRawStream(stream).decode()).toString();const baselines=[...operators.matchAll(/1 0 0 1 2 ([\d.]+) Tm/g)].map(m=>Number(m[1]));
 assert.equal(baselines.length,2);const ascent=9.31,descent=2.25; // Full Helvetica glyph bbox at 10pt, including Å, not just ascender metrics.
 for(const y of baselines){assert.ok(y-descent>=1,'descenders stay above the lower clipping edge');assert.ok(y+ascent<=widget.getRectangle().height-1,'ascenders stay below the upper clipping edge');}
});
test('Word output fills all fields, escapes XML, and preserves every other ZIP part and legal paragraph',async()=>{
 const input=source('member-word'),before=ctx.fflate.unzipSync(input),bytes=await C.build('member-word',input,{...values,name:'Åse & Øster <Hansen>',signature:'Test & <navn>'}),after=ctx.fflate.unzipSync(bytes);
 assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort());
 for(const key of Object.keys(before))if(key!=='word/document.xml')assert.deepEqual(after[key],before[key],key);
 const xml=ctx.fflate.strFromU8(after['word/document.xml']);assert.match(xml,/Åse &amp; Øster &lt;Hansen&gt;/);assert.match(xml,/Test &amp; &lt;navn&gt;/);
 for(const [key,value] of Object.entries(values))if(value&&key!=='name')assert.ok(xml.includes(C.displayValue(key,value)),key);
 const paragraphs=x=>x.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g);
 const a=paragraphs(ctx.fflate.strFromU8(before['word/document.xml'])),b=paragraphs(xml);
 assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)if(![3,4,5,6,7,30].includes(i))assert.equal(a[i],b[i],'paragraph '+i);
 for(const i of [3,4,6,7]){const properties=b[i].match(/<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>/)[0];assert.ok(properties.indexOf('<w:tabs>')<properties.indexOf('<w:rPr>'),'tabs must precede run properties');if(properties.includes('<w:sectPr'))assert.ok(properties.indexOf('<w:tabs>')<properties.indexOf('<w:sectPr'),'tabs must precede section properties');}
 assert.equal((xml.match(/<w:sectPr\b/g)||[]).length,(ctx.fflate.strFromU8(before['word/document.xml']).match(/<w:sectPr\b/g)||[]).length);
});
test('booking prefill copies contact details without signing or changing the booking',()=>{
 const b={name:'Anna',date:'2026-12-12',email:'a@example.dk',phone:'123',address:'Skovvej 2',price:1000,deposit:500};const before=JSON.stringify(b);const filled=C.fromBooking(b,'2026-10-03');
 assert.equal(filled.rentalDate,b.date);assert.equal(filled.name,b.name);assert.equal(filled.signature,'');assert.equal(filled.account,'');assert.equal(filled.agreementDate,'2026-10-03');assert.equal(JSON.stringify(b),before);
});
test('fixed contract terms block a free board booking or different agreed price/deposit',()=>{
 assert.match(C.bookingWarning('member-pdf',{type:'board',price:0,deposit:0}),/gratis/);
 assert.ok(C.bookingWarning('member-pdf',{price:1200,deposit:500}));assert.ok(C.bookingWarning('friend-pdf',{price:1500,deposit:0}));
 assert.equal(C.bookingWarning('friend-pdf',{price:1500,deposit:500}),'');assert.equal(C.bookingWarning('member-word',null),'');
});
test('invalid dates and unsupported templates fail explicitly',async()=>{
 assert.throws(()=>C.displayValue('rentalDate','2026-02-30'),/dato/);await assert.rejects(C.build('missing',new Uint8Array(),values),/kontrakt/);
});

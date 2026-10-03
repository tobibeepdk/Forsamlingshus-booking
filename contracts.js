/* Fill copies of the original contracts locally. No booking or template is changed. */
(function(root){
 'use strict';
 const templates={
  'member-pdf':{path:'kontrakt-1000.pdf',price:1000,extension:'pdf',mime:'application/pdf'},
  'friend-pdf':{path:'kontrakt-1500.pdf',price:1500,extension:'pdf',mime:'application/pdf'},
  'member-word':{path:'kontrakt-1000.docx',price:1000,extension:'docx',mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
 };
 const labels={name:'Navn',phone:'Telefon',address:'Adresse',email:'E-mail',account:'Konto til tilbagebetaling af depositum',agreementDate:'Dato for aftalen',rentalDate:'Dato for lejemålet',meterStart:'Elmåler ved start',meterEnd:'Elmåler ved slut',signature:'Underskrift'};
 function displayValue(key,value){
  const text=String(value??'').trim();
  if(text.length>2000)throw new Error('Et kontraktfelt må højst indeholde 2.000 tegn.');
  if(!text||!['agreementDate','rentalDate'].includes(key))return text;
  const date=new Date(text+'T12:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==text)throw new Error('Kontrollér datoen i kontrakten.');
  return text.slice(8,10)+'.'+text.slice(5,7)+'.'+text.slice(0,4);
 }
 function fromBooking(b,today){return {name:b.name||'',phone:b.phone||'',address:b.address||'',email:b.email||'',account:'',agreementDate:today,rentalDate:b.date||'',meterStart:'',meterEnd:'',signature:''};}
 function bookingWarning(id,b){
  if(!b)return '';
  if(b.type==='board'&&!Number(b.price))return 'Denne booking er gratis. De eksisterende kontrakter har en fast leje og kan ikke bruges til en gratis booking.';
  if(Number(b.price)!==templates[id]?.price||Number(b.deposit)!==500)return 'Bookingens leje eller depositum stemmer ikke med denne kontrakt. Vælg en kontrakt med de aftalte beløb. Kontrakterne har 500 kr. i depositum.';
  return '';
 }
 // Character wrapping also handles long e-mail addresses and account numbers.
 function wrap(text,font,size,width){
  const lines=[];
  for(const paragraph of text.split(/\r?\n/)){
   let line='';
   for(const char of paragraph){if(line&&font.widthOfTextAtSize(line+char,size)>width){lines.push(line);line=char;}else line+=char;}
   lines.push(line);
  }
  return lines;
 }
 function appearance(field,widget,font,size){
  const {width,height}=widget.getRectangle(),lines=wrap(field.getText()||'',font,size,width-4);
  const baseline=lines.length===1?(height-size)/2+1:height-size-1;
  return root.PDFLib.drawTextField({x:0,y:0,width,height,borderWidth:0,color:field.getText()?root.PDFLib.rgb(1,1,1):undefined,borderColor:undefined,textColor:root.PDFLib.rgb(0.05,0.1,0.14),font:font.name,fontSize:size,padding:1,textLines:lines.map((text,i)=>({encoded:font.encodeText(text),x:2,y:baseline-i*(size+1)}))});
 }
 async function fillPDF(id,source,values){
  const P=root.PDFLib,doc=await P.PDFDocument.load(source),page=doc.getPage(0),font=await doc.embedFont(P.StandardFonts.Helvetica),form=doc.getForm();
  const friend=id==='friend-pdf',offset=friend?1:0;
  const boxes={name:[113,115+offset,180],phone:[322,115+offset,198],address:[121,135.5+offset,172],email:[326,135.5+offset,194],account:[friend?292:288,156+offset,friend?228:232],agreementDate:[143,176.5+offset,135],rentalDate:[friend?350:348,176.5+offset,friend?170:172],meterStart:[170,197+offset,108],meterEnd:[friend?368:366,197+offset,friend?152:154],signature:[144,friend?704:679,376]};
  let appendix=null,cursor=0;
  for(const [key,[x,top,width]] of Object.entries(boxes)){
   const value=displayValue(key,values[key]),lines=wrap(value,font,8,width-4);
   let target=page,rect={x,y:page.getHeight()-top-19,width,height:19},size=8;
   if(lines.length>1){
    const fullLines=wrap(value,font,10,500),height=Math.max(30,fullLines.length*11+6);
    if(!appendix||cursor-height<45){appendix=doc.addPage([612,792]);appendix.drawText('Lejekontrakt – supplerende oplysninger',{x:54,y:746,size:14,font});appendix.drawText('H/F Hjortemosen · felter fra kontraktens første side',{x:54,y:724,size:9,font});cursor=692;}
    page.drawRectangle({...rect,color:P.rgb(1,1,1)});page.drawText('Se side '+doc.getPageCount(),{x:x+2,y:rect.y+6,size:8,font});
    appendix.drawText(labels[key],{x:54,y:cursor,size:10,font});cursor-=height+5;
    target=appendix;rect={x:54,y:cursor,width:504,height};size=10;cursor-=24;
   }
   const field=form.createTextField(key);field.setText(value);field.enableMultiline();
   field.addToPage(target,{...rect,font,textColor:P.rgb(0.05,0.1,0.14),backgroundColor:P.rgb(1,1,1),borderWidth:0});
   field.setFontSize(size);field.updateAppearances(font,(field,widget,font)=>appearance(field,widget,font,size));
  }
  return doc.save({updateFieldAppearances:false});
 }
 const xmlEscape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 function fillWord(source,values){
  const F=root.fflate,zip=F.unzipSync(source),original=F.strFromU8(zip['word/document.xml']);
  let index=0;
  const slots={3:['name','phone'],4:['address','email'],5:['account'],6:['agreementDate','rentalDate'],7:['meterStart','meterEnd'],30:['signature']};
  const xml=original.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g,p=>{
   const keys=slots[index++];if(!keys)return p;
   const texts=[...p.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map(m=>m[1]).join('');
   const parts=texts.split(/_+/);if(parts.length!==keys.length+1)throw new Error('Word-kontraktens felter kunne ikke genkendes.');
   const start=p.match(/^<w:p\b[^>]*>/)[0],style=p.match(/<w:rPr\b[^>]*>[\s\S]*?<\/w:rPr>/)?.[0]||'';
   let properties=p.match(/<w:pPr\b[^>]*>[\s\S]*?<\/w:pPr>/)?.[0]||'<w:pPr></w:pPr>';
   if(keys.length===2){
    // These source paragraphs contain only rPr and optionally sectPr. Tabs
    // precede both in the WordprocessingML paragraph-property sequence.
    properties=properties.replace(/<w:tabs\b[^>]*>[\s\S]*?<\/w:tabs>/,'');
    properties=properties.replace(/(<w:pPr\b[^>]*>)/,`$1<w:tabs><w:tab w:val="left" w:pos="${index===4||index===5?4400:3950}"/></w:tabs>`);
   }
   const run=text=>`<w:r>${style}<w:t xml:space="preserve">${text}</w:t></w:r>`;
   let content=index===31?`<w:r>${style}<w:br/></w:r>`:'';
   keys.forEach((key,i)=>{
    const label=parts[i].replace(/^ +/,'');
    if(i)content+=`<w:r>${style}<w:tab/></w:r>`;
    const value=displayValue(key,values[key]);
    content+=run(label+' '+(value?xmlEscape(value):'_'.repeat(texts.match(/_+/g)[i].length)));
   });
   return start+properties+content+'</w:p>';
  });
  if(index!==31)throw new Error('Word-kontraktens struktur kunne ikke genkendes.');
  zip['word/document.xml']=F.strToU8(xml);return F.zipSync(zip,{level:6});
 }
 async function build(id,source,values){
  if(!templates[id])throw new Error('Vælg en gyldig kontrakt.');
  try{return id==='member-word'?fillWord(source,values):await fillPDF(id,source,values);}
  catch(error){if(/WinAnsi/.test(error.message))throw new Error('Et tegn kan ikke vises i PDF-kontrakten. Vælg Word-versionen, eller ret tegnet.');throw error;}
 }
 root.HjortContracts={templates,labels,build,displayValue,fromBooking,bookingWarning};
})(typeof globalThis!=='undefined'?globalThis:this);

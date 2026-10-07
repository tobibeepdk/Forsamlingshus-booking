/* Offline, read-only month PDF. Requires the bundled PDFLib and HjortData. */
(function(root){
 'use strict';
 const months=['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
 const weekdays=['Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag','Søndag'];
 const width=841.89,height=595.28,margin=32;
 async function build({year,month,bookings}={}){
  if(!Number.isInteger(year)||year<1900||year>9999||!Number.isInteger(month)||month<1||month>12)throw new Error('Vælg et gyldigt år og en måned fra 1 til 12.');
  if(!Array.isArray(bookings))throw new Error('Bookinglisten kan ikke læses.');
  if(!root.PDFLib||typeof HjortData==='undefined')throw new Error('PDF-værktøjerne er ikke indlæst. Åbn appen igen.');
  const {PDFDocument,StandardFonts,rgb}=root.PDFLib,doc=await PDFDocument.create();
  const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const ink=rgb(.12,.20,.15),green=rgb(.17,.31,.23),line=rgb(.76,.81,.74),pale=rgb(.94,.97,.93),amber=rgb(1,.96,.89),muted=rgb(.39,.45,.40);
  const monthLabel=months[month-1]+' '+year,prefix=String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-';
  const selected=[];
  for(const item of bookings){
   if(!item||typeof item.date!=='string')throw new Error('En booking har en dato, der ikke kan læses.');
   if(!item.date.startsWith(prefix))continue;
   if(!HjortData.validDate(item.date))throw new Error('En booking har en ugyldig dato.');
   if(typeof item.name!=='string'||!item.name.trim())throw new Error('En booking mangler navn.');
   const garden=item.houseNo||item.house||'';
   if(typeof garden!=='string')throw new Error('Et have nummer kan ikke læses.');
   for(const amount of [item.price||0,item.deposit||0])if(!Number.isFinite(Number(amount))||Number(amount)<0)throw new Error('En booking har et ugyldigt beløb.');
   for(const [label,value] of [['navn',item.name],['have nummer',garden]])try{font.encodeText(value);bold.encodeText(value);}catch{throw new Error('PDF kan ikke laves: '+label+' på bookingen '+item.date+' indeholder et tegn, som PDF-skrifttypen ikke understøtter.');}
   const outstanding=HjortData.outstanding(item),free=item.type==='board'&&!Number(item.price)&&!Number(item.deposit);
   selected.push({date:item.date,name:item.name,garden,status:free?'Gratis':outstanding?'Mangler betaling':'Betalt',unpaid:Boolean(outstanding)});
  }
  selected.sort((a,b)=>a.date.localeCompare(b.date));
  function text(page,value,x,y,size=10,face=font,color=ink){page.drawText(value,{x,y,size,font:face,color});}
  function shortened(value,max,size=9,face=font){
   if(face.widthOfTextAtSize(value,size)<=max)return value;
   const chars=Array.from(value);while(chars.length&&face.widthOfTextAtSize(chars.join('')+'...',size)>max)chars.pop();return chars.join('')+'...';
  }
  function wrapped(value,max,size=10){
   const lines=[];let current='';
   for(let word of value.split(/\s+/)){
    if(!word)continue;
    if(current&&font.widthOfTextAtSize(current+' '+word,size)<=max){current+=' '+word;continue;}
    if(current){lines.push(current);current='';}
    while(font.widthOfTextAtSize(word,size)>max){
     let segment='';for(const char of word){if(font.widthOfTextAtSize(segment+char,size)>max)break;segment+=char;}
     if(!segment)throw new Error('Et tegn kan ikke få plads i PDF-kalenderen.');lines.push(segment);word=word.slice(segment.length);
    }
    current=word;
   }
   if(current)lines.push(current);return lines.length?lines:[''];
  }
  function heading(page,title,subtitle){text(page,'HJORTEMOSEN',margin,554,10,bold,green);text(page,title,margin,523,24,bold);text(page,subtitle,margin,504,10,font,muted);}
  const calendar=doc.addPage([width,height]);heading(calendar,'Bookingkalender - '+monthLabel,selected.length+' bookinger · Leje og depositum indgår i betalingsstatus.');
  const first=new Date(Date.UTC(year,month-1,1)),days=new Date(Date.UTC(year,month,0)).getUTCDate(),offset=(first.getUTCDay()+6)%7,weeks=Math.ceil((offset+days)/7);
  const cellWidth=(width-margin*2)/7,gridTop=471,cellHeight=420/weeks;
  for(let col=0;col<7;col++){calendar.drawRectangle({x:margin+col*cellWidth,y:gridTop,width:cellWidth,height:25,color:pale,borderColor:line,borderWidth:.6});text(calendar,weekdays[col],margin+col*cellWidth+8,gridTop+8,10,bold,green);}
  const byDate=new Map();for(const entry of selected){if(!byDate.has(entry.date))byDate.set(entry.date,[]);byDate.get(entry.date).push(entry);}
  for(let slot=0;slot<weeks*7;slot++){
   const day=slot-offset+1,col=slot%7,row=Math.floor(slot/7),x=margin+col*cellWidth,y=gridTop-(row+1)*cellHeight;
   const date=prefix+String(day).padStart(2,'0'),entries=day>=1&&day<=days?byDate.get(date)||[]:[],inside=day>=1&&day<=days;
   calendar.drawRectangle({x,y,width:cellWidth,height:cellHeight,color:!inside?rgb(.98,.98,.97):entries.some(e=>e.unpaid)?amber:entries.length?pale:rgb(1,1,1),borderColor:line,borderWidth:.6});
   if(!inside)continue;
   text(calendar,String(day),x+8,y+cellHeight-17,12,bold);
   if(!entries.length){text(calendar,'Ledig',x+8,y+cellHeight-36,9,font,muted);continue;}
   const entry=entries[0],top=y+cellHeight-34;
   text(calendar,shortened(entry.name,cellWidth-16,9,bold),x+8,top,9,bold);
   text(calendar,shortened(entry.garden?'Have nr. '+entry.garden:'Have nr. ikke oplyst',cellWidth-16,8),x+8,top-12,8,font,muted);
   text(calendar,entry.status,x+8,top-22,8,font,entry.unpaid?rgb(.54,.34,.11):green);
   if(entries.length>1)text(calendar,'+'+(entries.length-1)+' · se bookingliste',x+8,y+4,7,bold,green);
  }
  text(calendar,selected.length?'Alle navne, have numre og betalingsstatus står i bookinglisten på de følgende sider.':'Ingen bookinger i denne måned.',margin,35,9,font,muted);
  if(selected.length){
   const columns=[margin+8,margin+84,margin+422,margin+642],nameWidth=322,gardenWidth=204,bottom=54,lineHeight=13;
   let page,y;
   function newListPage(){
    page=doc.addPage([width,height]);heading(page,'Bookingliste - '+monthLabel,'Komplet liste · Flere bookinger på samme dato vises hver for sig.');
    page.drawRectangle({x:margin,y:469,width:width-margin*2,height:25,color:pale,borderColor:line,borderWidth:.6});
    for(const [index,label]of ['Dato','Lejer','Have nr.','Betaling'].entries())text(page,label,columns[index],477,10,bold,green);y=469;
   }
   newListPage();
   for(const entry of selected){
    const names=wrapped(entry.name,nameWidth),gardens=wrapped(entry.garden||'Ikke oplyst',gardenWidth),count=Math.max(names.length,gardens.length);let start=0;
    if(count*lineHeight+16<=415&&y-(count*lineHeight+16)<bottom)newListPage();
    while(start<count){
     if(y-bottom<lineHeight+16)newListPage();
     const take=Math.min(count-start,Math.floor((y-bottom-16)/lineHeight)),rowHeight=take*lineHeight+16;
     page.drawRectangle({x:margin,y:y-rowHeight,width:width-margin*2,height:rowHeight,color:entry.unpaid?amber:rgb(1,1,1),borderColor:line,borderWidth:.5});
     text(page,start?'Fortsat':entry.date.slice(8)+'.'+entry.date.slice(5,7)+'.'+entry.date.slice(0,4),columns[0],y-15,10);
     for(let i=0;i<take;i++){if(names[start+i]!==undefined)text(page,names[start+i],columns[1],y-15-i*lineHeight,10);if(gardens[start+i]!==undefined)text(page,gardens[start+i],columns[2],y-15-i*lineHeight,10);}
     text(page,start?'Fortsat':entry.status,columns[3],y-15,10,bold,entry.unpaid?rgb(.54,.34,.11):green);
     start+=take;y-=rowHeight;
    }
   }
  }
  const pages=doc.getPages();for(let i=0;i<pages.length;i++)text(pages[i],'Side '+(i+1)+' af '+pages.length,width-margin-68,22,8,font,muted);
  doc.setTitle('Hjortemosen bookingkalender - '+monthLabel);doc.setAuthor('Hjortemosen');doc.setSubject('Kalender og komplet bookingliste');return doc.save();
 }
 root.HjortCalendarPDF={build};
})(typeof globalThis!=='undefined'?globalThis:this);

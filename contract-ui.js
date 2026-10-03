(function(){
 'use strict';
 const form=$('#contractForm'),template=$('#contractTemplate'),booking=$('#contractBooking'),status=$('#contractStatus'),error=$('#contractError');
 const fields=Object.keys(HjortContracts.labels),input=key=>$('#contract-'+key);
 let ready=null,revision=0,busy=false,bookingSnapshot='';
 function snapshot(b){return b?JSON.stringify(Object.fromEntries(['name','phone','address','email','date','price','deposit','type'].map(key=>[key,b[key]]))):'';}
 function invalidate(){revision++;if(ready)URL.revokeObjectURL(ready.url);ready=null;$('#contractReady').classList.add('hidden');error.classList.add('hidden');status.textContent='Ret oplysningerne, og tryk på Lav udfyldt kontrakt.';}
 function selectedBooking(){return data.bookings.find(b=>b.id===booking.value)||null;}
 function warning(){
  const text=HjortContracts.bookingWarning(template.value,selectedBooking());
  $('#contractTerms').textContent=`Leje: ${money(HjortContracts.templates[template.value].price)} · Depositum: 500 kr. · Vilkår fra den oprindelige kontrakt.`;
  $('#contractWarning').textContent=text;$('#contractWarning').classList.toggle('hidden',!text);$('#makeContract').disabled=busy||Boolean(text);return text;
 }
 function prefill(){
  invalidate();const b=selectedBooking();bookingSnapshot=snapshot(b);
  if(b){if(Number(b.price)===1500)template.value='friend-pdf';else if(Number(b.price)===1000&&template.value==='friend-pdf')template.value='member-pdf';const values=HjortContracts.fromBooking(b,isoLocal(new Date()));for(const key of fields)input(key).value=values[key];}
  warning();
 }
 function refresh(){
  const selected=booking.value;
  booking.innerHTML='<option value="">Udfyld uden en booking</option>'+[...data.bookings].sort((a,b)=>b.date.localeCompare(a.date)).map(b=>`<option value="${esc(b.id)}">${esc(b.date)} · ${esc(b.name)} · ${money(b.price)}</option>`).join('');
  booking.value=data.bookings.some(b=>b.id===selected)?selected:'';
  const b=selectedBooking(),next=snapshot(b);
  if(next!==bookingSnapshot){
   const previous=bookingSnapshot?JSON.parse(bookingSnapshot):null;invalidate();
   if(b&&previous){const before=HjortContracts.fromBooking(previous,''),after=HjortContracts.fromBooking(b,'');for(const key of ['name','phone','address','email','rentalDate'])if(input(key).value===before[key])input(key).value=after[key];}
   bookingSnapshot=next;status.textContent=b?'Bookingoplysningerne er ændret. Dine egne kontraktfelter er bevaret. Kontrollér oplysningerne, og lav kontrakten igen.':'Bookingen findes ikke længere. Kontrollér felterne, før du laver en kontrakt uden booking.';
  }
  warning();
 }
 form.addEventListener('input',()=>{invalidate();warning();});
 template.onchange=()=>{invalidate();warning();};booking.onchange=prefill;
 $$('[data-fill-contract]').forEach(button=>button.onclick=()=>{template.value=button.dataset.fillContract;invalidate();warning();form.scrollIntoView({behavior:'smooth',block:'start'});template.focus({preventScroll:true});});
 form.onsubmit=async event=>{
  event.preventDefault();if(busy||!form.reportValidity()||warning())return;
  invalidate();const current=revision,id=template.value,values=Object.fromEntries(fields.map(key=>[key,input(key).value]));
  busy=true;$('#makeContract').disabled=true;form.setAttribute('aria-busy','true');status.textContent='Udfylder kontrakten…';
  try{
   const config=HjortContracts.templates[id],response=await fetch('./'+config.path+'?v='+APP_VERSION);
   if(!response.ok)throw new Error('Kontrakten kunne ikke åbnes. Åbn appen med internet, og prøv igen.');
   const bytes=await HjortContracts.build(id,new Uint8Array(await response.arrayBuffer()),values);
   if(current!==revision)return;
   const date=values.rentalDate||isoLocal(new Date()),name=`Lejekontrakt-Hjortemosen-${config.price}-${date}.${config.extension}`;
   const file=new File([bytes],name,{type:config.mime}),url=URL.createObjectURL(file);ready={file,url};
   $('#openFilledContract').href=url;$('#openFilledContract').textContent=config.extension==='pdf'?'Se udfyldt PDF ↗':'Åbn udfyldt Word ↗';
   $('#filledContractName').textContent=name;$('#contractReady').classList.remove('hidden');status.textContent='Kontrakten er klar. Se den igennem, før du deler den.';
  }catch(err){if(current===revision){error.textContent=err.message||'Kontrakten kunne ikke udfyldes. Prøv igen.';error.classList.remove('hidden');status.textContent='Oplysningerne er bevaret. Ret eventuelle fejl, og prøv igen.';}}
  finally{busy=false;form.setAttribute('aria-busy','false');warning();}
 };
 $('#saveFilledContract').onclick=()=>{if(ready){download(ready.file,ready.file.name);toast('Kontrakten er gemt som fil');}};
 $('#shareFilledContract').onclick=async()=>{
  if(!ready)return;const file=ready.file;
  try{
   if(!navigator.share||!navigator.canShare?.({files:[file]})){download(file,file.name);status.textContent='Filen er hentet. Åbn Mail eller Beskeder, vælg modtageren, og vedhæft filen fra Filer.';return;}
   // The file is already generated: native sharing starts on this user gesture.
   await navigator.share({title:'Udfyldt lejekontrakt · Hjortemosen',files:[file]});
   status.textContent='Delingsmenuen er afsluttet. Du kan gemme eller dele kontrakten igen.';
  }catch(err){if(err.name!=='AbortError'){error.textContent='Deling kunne ikke åbnes. Gem filen, og vedhæft den i Mail eller Beskeder.';error.classList.remove('hidden');}}
 };
 $$('[data-copy-recipient]').forEach(button=>button.onclick=async()=>{
  const field=input(button.dataset.copyRecipient),value=field.value.trim();if(!value){field.focus();toast('Udfyld først modtagerens '+(button.dataset.copyRecipient==='email'?'e-mailadresse':'telefonnummer'));return;}
  try{await navigator.clipboard.writeText(value);toast('Modtageren er kopieret');}catch{field.focus();field.select();toast('Markér og kopiér modtageren fra feltet');}
 });
 $('#clearContract').onclick=()=>{form.reset();booking.value='';template.value='member-pdf';bookingSnapshot='';input('agreementDate').value=isoLocal(new Date());invalidate();warning();};
 input('agreementDate').value=isoLocal(new Date());refresh();
 window.HjortContractUI={refresh};
})();

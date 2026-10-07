(async function(){
 if(window.HjortAppReady)await window.HjortAppReady;
 'use strict';
 const form=$('#contractForm'),template=$('#contractTemplate'),booking=$('#contractBooking'),status=$('#contractStatus'),error=$('#contractError');
 const fields=Object.keys(HjortContracts.labels),input=key=>$('#contract-'+key);
 let ready=null,revision=0,busy=false,emailBusy=false,bookingSnapshot='',restoring=false,draftBlocked=false,baseRaw=null,lastInkSave=0;
 const draftKey=HjortBackup.keys.contract;
 function autoStatus(text){$('#contractAutoSaveStatus').textContent=text;}
 function saveContract(){
  if(!nativeReady||restoring||draftBlocked)return false;
  try{
   HjortBackup.ensureWritable();if(localStorage.getItem(draftKey)!==baseRaw){autoStatus('Kontraktkladden er ændret i et andet vindue. Genindlæs for at fortsætte med den gemte version.');return false;}
   const d={template:template.value,bookingId:booking.value,bookingSnapshot,values:Object.fromEntries(fields.map(key=>[key,input(key).value])),strokes:signaturePad.getStrokes(),savedAt:new Date().toISOString()};
   const hasContent=d.bookingId||d.template!=='member-pdf'||d.strokes.length||fields.some(key=>key!=='agreementDate'&&d.values[key].trim());
   if(hasContent){HjortBackup.validateDraft('contract',d);const raw=JSON.stringify(d);if(!baseRaw||JSON.stringify({...JSON.parse(baseRaw),savedAt:''})!==JSON.stringify({...d,savedAt:''})){localStorage.setItem(draftKey,raw);baseRaw=raw;}autoStatus('Kontraktkladde og underskrift gemt automatisk på denne iPad.');}
   else{localStorage.removeItem(draftKey);baseRaw=null;autoStatus('Kontraktkladden gemmes automatisk på denne enhed.');}
   window.HjortAutoBackup?.queue();return true;
  }catch{autoStatus('Kontraktkladden kunne ikke gemmes. Lad formularen være åben og frigør lagerplads.');return false;}
 }
 function snapshot(b){return b?JSON.stringify(Object.fromEntries(['name','phone','address','email','date','price','deposit','type'].map(key=>[key,b[key]]))):'';}
 function invalidate(){revision++;if(ready)URL.revokeObjectURL(ready.url);ready=null;$('#contractReady').classList.add('hidden');$('#contractEmailFallback').classList.add('hidden');$('#contractEmailDraft').href='#';error.classList.add('hidden');status.textContent='Ret oplysningerne, og tryk på Lav udfyldt kontrakt.';}
 const signaturePad=HjortSignature.create($('#signatureCanvas'),(hasInk,detail)=>{invalidate();$('#signatureStatus').textContent=hasInk?'Underskrift tilføjet.':'Ingen håndskrevet underskrift.';$('#clearSignature').disabled=!hasInk;if(!restoring&&(!detail?.drawing||Date.now()-lastInkSave>100)){lastInkSave=Date.now();saveContract();}});
 $('#signatureStatus').textContent='Ingen håndskrevet underskrift.';$('#clearSignature').disabled=true;
 $('#clearSignature').onclick=()=>{signaturePad.clear();};
 function selectedBooking(){return data.bookings.find(b=>b.id===booking.value)||null;}
 function warning(){
  const text=HjortContracts.bookingWarning(template.value,selectedBooking());
  $('#contractTerms').textContent=`Leje: ${money(HjortContracts.templates[template.value].price)} · Depositum: 500 kr. · Vilkår fra den oprindelige kontrakt.`;
  $('#contractWarning').textContent=text;$('#contractWarning').classList.toggle('hidden',!text);$('#makeContract').disabled=busy||Boolean(text);return text;
 }
 function prefill(){
  invalidate();signaturePad.clear();const b=selectedBooking();bookingSnapshot=snapshot(b);
  if(b){if(Number(b.price)===1500)template.value='friend-pdf';else if(Number(b.price)===1000&&template.value==='friend-pdf')template.value='member-pdf';const values=HjortContracts.fromBooking(b,isoLocal(new Date()));for(const key of fields)input(key).value=values[key];}
  warning();saveContract();
 }
 function refreshOptions(selected=booking.value){
  booking.innerHTML='<option value="">Udfyld uden en booking</option>'+[...data.bookings].sort((a,b)=>b.date.localeCompare(a.date)).map(b=>`<option value="${esc(b.id)}">${esc(b.date)} · ${esc(b.name)} · ${money(b.price)}</option>`).join('');
  booking.value=data.bookings.some(b=>b.id===selected)?selected:'';
 }
 function refresh(){
  refreshOptions();const b=selectedBooking(),next=snapshot(b);
  if(next!==bookingSnapshot){
   const previous=bookingSnapshot?JSON.parse(bookingSnapshot):null;invalidate();signaturePad.clear();
   if(b&&previous){const before=HjortContracts.fromBooking(previous,''),after=HjortContracts.fromBooking(b,'');for(const key of ['name','phone','address','email','rentalDate'])if(input(key).value===before[key])input(key).value=after[key];}
   bookingSnapshot=next;saveContract();status.textContent=b?'Bookingoplysningerne er ændret. Dine egne kontraktfelter er bevaret. Kontrollér oplysningerne, og lav kontrakten igen.':'Bookingen findes ikke længere. Kontrollér felterne, før du laver en kontrakt uden booking.';
  }
  warning();
 }
 form.addEventListener('input',()=>{invalidate();signaturePad.clear();warning();saveContract();});
 template.onchange=()=>{invalidate();signaturePad.clear();warning();saveContract();};booking.onchange=prefill;
 $$('[data-fill-contract]').forEach(button=>button.onclick=()=>{template.value=button.dataset.fillContract;invalidate();signaturePad.clear();warning();saveContract();form.scrollIntoView({behavior:'smooth',block:'start'});template.focus({preventScroll:true});});
 form.onsubmit=async event=>{
  event.preventDefault();if(busy||!form.reportValidity()||warning())return;
  if(signaturePad.isDrawing()){status.textContent='Løft fingeren eller pennen, før du laver kontrakten.';return;}
  saveContract();invalidate();const current=revision,id=template.value,values=Object.fromEntries(fields.map(key=>[key,input(key).value]));
  busy=true;$('#makeContract').disabled=true;form.setAttribute('aria-busy','true');status.textContent='Udfylder kontrakten…';
  try{
   const ink=signaturePad.getImage(),config=HjortContracts.templates[id],response=await fetch('./'+config.path+'?v='+APP_VERSION);
   if(!response.ok)throw new Error('Kontrakten kunne ikke åbnes. Åbn appen med internet, og prøv igen.');
   const bytes=await HjortContracts.build(id,new Uint8Array(await response.arrayBuffer()),values,ink);
   if(current!==revision)return;
   const date=values.rentalDate||isoLocal(new Date()),name=`Lejekontrakt-Hjortemosen-${config.price}-${date}.${config.extension}`;
   const file=new File([bytes],name,{type:config.mime}),url=URL.createObjectURL(file);ready={file,url};
   $('#openFilledContract').href=url;$('#openFilledContract').textContent=config.extension==='pdf'?'Se udfyldt PDF ↗':'Åbn udfyldt Word ↗';
   $('#filledContractName').textContent=name;$('#contractReady').classList.remove('hidden');status.textContent='Kontrakten er klar. Se den igennem, før du deler den.';
  }catch(err){if(current===revision){error.textContent=err.message||'Kontrakten kunne ikke udfyldes. Prøv igen.';error.classList.remove('hidden');status.textContent='Oplysningerne er bevaret. Ret eventuelle fejl, og prøv igen.';}}
  finally{busy=false;form.setAttribute('aria-busy','false');warning();}
 };
 $('#openFilledContract').onclick=async event=>{if(nativeApp&&ready){event.preventDefault();try{await nativeApp.previewFile(ready.file);}catch(err){error.textContent=err.message;error.classList.remove('hidden');}}};
 $('#saveFilledContract').onclick=async()=>{if(!ready)return;if(nativeApp){try{const reply=await nativeApp.shareFile(ready.file);status.textContent=reply.cancelled?'Gemning blev afbrudt. Kontrakten er stadig klar.':'Vælg Gem i Filer i delingsmenuen. Kontrollér, at kontrakten blev gemt.';}catch(err){error.textContent=err.message;error.classList.remove('hidden');}}else{download(ready.file,ready.file.name);toast('Kontrakten er gemt som fil');}};
 $('#sendContractEmail').onclick=async()=>{
  if(!ready||emailBusy)return;
  const recipient=input('email'),address=recipient.value.trim();
  if(!address||!recipient.checkValidity()){error.textContent='Udfyld en gyldig e-mailadresse til modtageren.';error.classList.remove('hidden');recipient.focus();return;}
  const current=ready,file=current.file,subject='Lejekontrakt · Hjortemosen · '+input('rentalDate').value;
  const body='Vedlagt er din udfyldte lejekontrakt for Hjortemosen.\n\nVenlig hilsen\nHjortemosen';
  const draft=$('#contractEmailDraft'),fallback=$('#contractEmailFallback');
  function manual(){draft.href='mailto:'+encodeURIComponent(address)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body+'\n\nVedhæft filen '+file.name+' fra Filer, før du sender.');fallback.classList.remove('hidden');}
  emailBusy=true;$('#sendContractEmail').disabled=true;error.classList.add('hidden');fallback.classList.add('hidden');draft.href='#';
  try{
   let cancelled=false;
   if(nativeApp){const reply=await nativeApp.shareFile(file);cancelled=Boolean(reply.cancelled);}
   else if(navigator.share&&navigator.canShare?.({files:[file]})){
    // Start file sharing on the click gesture; clipboard awaits lose Safari activation.
    await navigator.share({title:subject,text:body,files:[file]});
   }else{
    download(file,file.name);manual();status.textContent='Kontraktfilen er hentet. Kladden åbner din standardmailapp uden vedhæftning. Brug Gmail som standardmailapp, eller åbn Gmail selv. Vedhæft filen fra Filer, vælg den rigtige konto, og tryk selv på Send.';return;
   }
   if(ready!==current)return;
   status.textContent=cancelled?'E-maildeling blev afbrudt. Kontrakten er stadig klar.':'Vælg Gmail i delingen, indsæt modtageren, vælg den rigtige Googlekonto i Fra, og tryk selv på Send. Kontrollér derefter Sendt post i den samme konto. Appen kan ikke kontrollere afsendelsen.';
  }catch(err){
   if(ready!==current)return;
   if(err.name==='AbortError')status.textContent='E-maildeling blev afbrudt. Kontrakten er stadig klar.';
   else{manual();error.textContent='E-maildeling kunne ikke åbnes. Brug Gem fil, og vedhæft kontrakten manuelt i Gmail.';error.classList.remove('hidden');status.textContent='Kontrakten er stadig klar. E-mailkladden bruger din standardmailapp uden vedhæftning. Åbn Gmail selv, hvis den ikke er standard, vedhæft filen, og send fra den rigtige konto.';}
  }finally{emailBusy=false;$('#sendContractEmail').disabled=false;}
 };
 $('#shareFilledContract').onclick=async()=>{
  if(!ready)return;const file=ready.file;
  try{
   if(nativeApp){const reply=await nativeApp.shareFile(file);status.textContent=reply.cancelled?'Deling blev afbrudt. Kontrakten er stadig klar.':'Delingsmenuen er afsluttet. Du kan gemme eller dele kontrakten igen.';return;}
   if(!navigator.share||!navigator.canShare?.({files:[file]})){download(file,file.name);status.textContent='Filen er hentet. Åbn din mailapp eller Beskeder, vælg modtageren, og vedhæft filen fra Filer.';return;}
   // The file is already generated: native sharing starts on this user gesture.
   await navigator.share({title:'Udfyldt lejekontrakt · Hjortemosen',files:[file]});
   status.textContent='Delingsmenuen er afsluttet. Du kan gemme eller dele kontrakten igen.';
  }catch(err){if(err.name!=='AbortError'){error.textContent='Deling kunne ikke åbnes. Gem filen, og vedhæft den i din mailapp eller Beskeder.';error.classList.remove('hidden');}}
 };
 $$('[data-copy-recipient]').forEach(button=>button.onclick=async()=>{
  const field=input(button.dataset.copyRecipient),value=field.value.trim();if(!value){field.focus();toast('Udfyld først modtagerens '+(button.dataset.copyRecipient==='email'?'e-mailadresse':'telefonnummer'));return;}
  try{await navigator.clipboard.writeText(value);toast('Modtageren er kopieret');}catch{field.focus();field.select();toast('Markér og kopiér modtageren fra feltet');}
 });
 function restoreDraft(){
  restoring=true;draftBlocked=false;invalidate();form.reset();signaturePad.clear();booking.value='';template.value='member-pdf';bookingSnapshot='';input('agreementDate').value=isoLocal(new Date());
  refreshOptions('');
  try{baseRaw=localStorage.getItem(draftKey);if(baseRaw){const d=HjortBackup.validateDraft('contract',JSON.parse(baseRaw));template.value=d.template;booking.value=d.bookingId;bookingSnapshot=d.bookingSnapshot;for(const key of fields)input(key).value=d.values[key];signaturePad.restore(d.strokes);autoStatus('Din kontraktkladde og underskrift er gendannet.');}else autoStatus('Kontraktkladden gemmes automatisk på denne enhed.');}
  catch{draftBlocked=true;autoStatus('Den gemte kontraktkladde kunne ikke læses. Den er bevaret. Brug Ryd felter for at starte forfra.');}
  refresh();restoring=false;
  if(baseRaw&&!draftBlocked)saveContract();
 }
 $('#clearContract').onclick=()=>{if(!nativeReady)return;
  try{HjortBackup.ensureWritable();if(!draftBlocked&&localStorage.getItem(draftKey)!==baseRaw){autoStatus('Kontraktkladden er ændret i et andet vindue. Genindlæs først.');return;}if(draftBlocked&&!confirm('Kassér den kontraktkladde, der ikke kunne læses?'))return;localStorage.removeItem(draftKey);baseRaw=null;restoreDraft();window.HjortAutoBackup?.queue();}catch{autoStatus('Kontraktkladden kunne ikke ryddes.');}
 };
 window.addEventListener('pagehide',saveContract);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveContract();});
 restoreDraft();window.HjortContractUI={refresh,restore:restoreDraft,save:saveContract};
})();

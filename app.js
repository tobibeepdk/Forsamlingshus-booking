'use strict';
const APP_VERSION='2.3.0';
const KEY='hjortemosen_data_v1';
const DRAFT_KEY='hjortemosen_booking_draft_v1';
const RECOVERY_KEY='hjortemosen_before_import_v1';
const defaults=HjortData.defaults;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let storageBlocked=false, data=load(), monthCursor=new Date(), deferredPrompt=null, formHydrating=false, draftBlocked=false, draftBaseRaw=null, pendingImport=null, legacyBookingType=null, printTitle=null, toastTimer;
function load(){try { const raw=localStorage.getItem(KEY);return raw?HjortData.validate(JSON.parse(raw)):HjortData.clone(defaults); }catch{storageBlocked=true;return HjortData.clone(defaults);}}
function stored(key){try{return localStorage.getItem(key);}catch{return null;}}
function storageError(text){$('#storageError').textContent=text;$('#storageError').classList.remove('hidden');}
function save(next=data){
  if(storageBlocked){storageError('De gemte data kunne ikke læses. De er bevaret. Eksportér de oprindelige data under Mere, eller importér en gyldig sikkerhedskopi.');return false;}
  try{localStorage.setItem(KEY,JSON.stringify(next));data=next;renderAll();return true;}
  catch{storageError('Kunne ikke gemme på denne enhed. Dine tidligere data er bevaret. Eksportér en sikkerhedskopi og frigør lagerplads.');return false;}
}
function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);}
function isoLocal(d){const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10);}
function fmtDate(s){return new Intl.DateTimeFormat('da-DK',{dateStyle:'long'}).format(new Date(s+'T12:00:00'));}
function money(n){return new Intl.NumberFormat('da-DK').format(Number(n||0))+' kr.';}
function timeNow(){return new Intl.DateTimeFormat('da-DK',{hour:'2-digit',minute:'2-digit'}).format(new Date());}
function esc(v=''){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500);}
function go(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===id);b.setAttribute('aria-current',b.dataset.view===id?'page':'false');});if(id==='calendar'){renderCalendar();bindBookingButtons();}if(id==='documents')window.HjortContractUI?.refresh();window.scrollTo({top:0,behavior:'instant'});}
$$('[data-view]').forEach(b=>b.onclick=()=>go(b.dataset.view));
$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
function typeLabel(t){return t==='member'?'Haveforeningsmedlem':t==='friend'?'Ven':t==='board'?'Bestyrelsesmedlem':'Tidligere lejertype';}
function isFreeBoard(b){return b.type==='board'&&!Number(b.price)&&!Number(b.deposit);}
function isBlacklisted(name,gardenNo=''){return Boolean(HjortData.blocked(data.blacklist,name,gardenNo));}
function paymentBadge(b){return `<span class="badge ${HjortData.outstanding(b)?'unpaid':'paid'}">${isFreeBoard(b)?'Gratis':HjortData.outstanding(b)?'Mangler betaling':'Alt betalt'}</span>`;}
function renderStats(){
 const future=data.bookings.filter(b=>b.date>=isoLocal(new Date()));
 const unpaid=data.bookings.filter(b=>HjortData.outstanding(b)>0);
 $('#stats').innerHTML=`<div class="stat"><span>Kommende bookinger</span><strong>${future.length}</strong><small>Fra i dag og frem</small></div><div class="stat"><span>Mangler betaling</span><strong>${unpaid.length}</strong><small>Leje eller depositum</small></div><div class="stat amount"><span>Samlet udestående</span><strong>${money(unpaid.reduce((s,b)=>s+HjortData.outstanding(b),0))}</strong><small>Leje + depositum · alle bookinger</small></div>`;
 $('#renterCount').textContent=data.renters.length+' gemte lejere';
 const next=[...future].sort((a,b)=>a.date.localeCompare(b.date))[0];
 $('#nextBooking').classList.toggle('is-empty',!next);
 $('#nextBooking').innerHTML=next?`<span class="eyebrow">NÆSTE BOOKING</span><h3>${esc(next.name)}</h3><p>${fmtDate(next.date)}</p><div class="next-bottom">${paymentBadge(next)}<button class="text-button" data-edit="${esc(next.id)}">Se booking <span aria-hidden="true">↗</span></button></div>`:'<span class="eyebrow">PLADS TIL FÆLLESSKAB</span><h3>Den næste gode stund</h3><p>Opret en booking, når fælleshuset skal danne rammen.</p><button class="secondary" data-new>Opret den første booking <span aria-hidden="true">↗</span></button>';
}
function bookingRow(b){const day=new Date(b.date+'T12:00:00');return `<button class="booking-row" data-edit="${esc(b.id)}"><span class="date-tile"><small>${new Intl.DateTimeFormat('da-DK',{month:'short'}).format(day).replace('.','')}</small><strong>${day.getDate()}</strong></span><span class="row-person"><strong>${esc(b.name)}</strong><small>${b.houseNo?'Have nummer '+esc(b.houseNo)+' · ':''}${typeLabel(b.type)}</small><span class="payment-detail">${isFreeBoard(b)?'Gratis · uden depositum':`Leje: ${b.paid?'betalt':'ikke betalt'} · Depositum: ${b.depositPaid||!Number(b.deposit)?'betalt':'ikke betalt'}`}</span></span><span class="row-end">${paymentBadge(b)}<strong>${money(b.price)}</strong></span><span class="row-arrow" aria-hidden="true">›</span></button>`;}
function renderUpcoming(){
 const q=$('#bookingSearch').value.trim().toLocaleLowerCase('da'),filter=$('#bookingFilter').value||'upcoming';
 const arr=[...data.bookings].filter(b=>(filter==='all'||(filter==='unpaid'?HjortData.outstanding(b)>0:b.date>=isoLocal(new Date())))&&(!q||`${b.name} ${b.houseNo} ${b.date}`.toLocaleLowerCase('da').includes(q))).sort((a,b)=>a.date.localeCompare(b.date));
 $('#upcomingList').innerHTML=arr.length?arr.map(bookingRow).join(''):`<div class="empty-state"><span class="empty-icon" aria-hidden="true">◇</span><h3>${q?'Ingen resultater':filter==='unpaid'?'Alle betalinger er på plads':filter==='all'?'Her starter overblikket':'Kalenderen er klar'}</h3><p>${q?'Prøv et andet navn, have nummer eller dato.':filter==='unpaid'?'Der er ingen udestående beløb.':'Dine bookinger vises her, når du har oprettet dem.'}</p>${q||filter==='unpaid'?'':'<button class="primary" data-new>+ Ny booking</button>'}</div>`;
 $('#bookingListCount').textContent=arr.length+' '+(arr.length===1?'booking':'bookinger');
}
function bindBookingButtons(){$$('[data-edit]').forEach(x=>x.onclick=()=>editBooking(x.dataset.edit));$$('[data-new]').forEach(x=>x.onclick=()=>newBooking());}
$('#bookingSearch').oninput=()=>{renderUpcoming();bindBookingButtons();};$('#bookingFilter').onchange=()=>{renderUpcoming();bindBookingButtons();};
function renderCalendar(){
 const y=monthCursor.getFullYear(),m=monthCursor.getMonth();$('#monthLabel').textContent=new Intl.DateTimeFormat('da-DK',{month:'long',year:'numeric'}).format(monthCursor);
 const first=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();let html='';
 for(let i=0;i<first;i++)html+='<div class="day empty"></div>';
 for(let d=1;d<=days;d++){const date=isoLocal(new Date(y,m,d)),b=data.bookings.find(x=>x.date===date),today=date===isoLocal(new Date());html+=`<button class="day ${b?(HjortData.outstanding(b)?'unpaid':'booked'):''} ${today?'today':''}" data-date="${date}" aria-label="${fmtDate(date)} · ${b?'Booket af '+esc(b.name)+(isFreeBoard(b)?' · gratis':HjortData.outstanding(b)?' · mangler betaling':' · betalt'):'Ledig'}"><span class="date">${d}</span>${b?`<span class="who">${esc(b.name)}</span><i class="calendar-mark" aria-hidden="true"></i>`:''}</button>`;}
 $('#calendarGrid').innerHTML=html;
 $$('.day[data-date]').forEach(el=>el.onclick=()=>{const b=data.bookings.find(x=>x.date===el.dataset.date);b?editBooking(b.id):newBooking(el.dataset.date);});
 const arr=data.bookings.filter(b=>b.date.slice(0,7)===isoLocal(new Date(y,m,1)).slice(0,7)).sort((a,b)=>a.date.localeCompare(b.date));
 $('#monthBookings').innerHTML=arr.length?arr.map(bookingRow).join(''):'<p class="muted">Ingen bookinger denne måned. Tryk på en dato for at booke.</p>';
}
$('#prevMonth').onclick=()=>{monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth()-1,1);renderCalendar();bindBookingButtons();};
$('#nextMonth').onclick=()=>{monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth()+1,1);renderCalendar();bindBookingButtons();};
$('#todayMonth').onclick=()=>{monthCursor=new Date();renderCalendar();bindBookingButtons();};
function calendarPrintMarkup(){
 const y=monthCursor.getFullYear(),m=monthCursor.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();
 const label=new Intl.DateTimeFormat('da-DK',{month:'long',year:'numeric'}).format(monthCursor);
 const monthBookings=data.bookings.filter(b=>b.date.slice(0,7)===isoLocal(new Date(y,m,1)).slice(0,7)),bookings=new Map();
 for(const booking of monthBookings){if(!bookings.has(booking.date))bookings.set(booking.date,[]);bookings.get(booking.date).push(booking);}
 const cells=[];
 for(let i=0;i<Math.ceil((first+days)/7)*7;i++){
  const day=i-first+1;
  if(day<1||day>days){cells.push('<td class="print-day empty"></td>');continue;}
  const entries=bookings.get(isoLocal(new Date(y,m,day)))||[];
  const content=entries.map(booking=>`<div class="print-booking"><strong class="print-name">${esc(booking.name)}</strong>${booking.houseNo?`<span class="print-garden">Have nr. ${esc(booking.houseNo)}</span>`:''}<span class="print-status">${isFreeBoard(booking)?'Gratis':HjortData.outstanding(booking)?'Mangler betaling':'Betalt'}</span></div>`).join('');
  cells.push(`<td class="print-day ${entries.length?'is-booked':''}"><span class="print-date">${day}</span>${content||'<span class="print-status">Ledig</span>'}</td>`);
 }
 const rows=[];for(let i=0;i<cells.length;i+=7)rows.push('<tr>'+cells.slice(i,i+7).join('')+'</tr>');
 return `<header class="print-heading"><div><p>H/F HJORTEMOSEN</p><h1>Bookingkalender</h1></div><div><h2>${esc(label)}</h2><p>${monthBookings.length} ${monthBookings.length===1?'booking':'bookinger'}</p></div></header><table class="print-calendar"><thead><tr>${['Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag','Søndag'].map(d=>'<th scope="col">'+d+'</th>').join('')}</tr></thead><tbody>${rows.join('')}</tbody></table><footer class="print-footer">Hjortemosens fælleshus · ${esc(label)} · Bookinger og betalingsstatus på udskrivningstidspunktet</footer>`;
}
function prepareCalendarPrint(){
 $('#calendarPrint').innerHTML=calendarPrintMarkup();
 if(printTitle===null)printTitle=document.title;
 document.title='Hjortemosen-kalender-'+isoLocal(new Date(monthCursor.getFullYear(),monthCursor.getMonth(),1)).slice(0,7);
 document.body.classList.add('printing-calendar');
}
function finishCalendarPrint(){document.body.classList.remove('printing-calendar');if(printTitle!==null){document.title=printTitle;printTitle=null;}}
$('#printCalendar').onclick=()=>{prepareCalendarPrint();try{window.print();}catch{finishCalendarPrint();toast('Udskriftsmenuen kunne ikke åbnes. Prøv igen i Safari.');}};
window.addEventListener('beforeprint',()=>{if($('#calendar').classList.contains('active')||document.body.classList.contains('printing-calendar'))prepareCalendarPrint();});
window.addEventListener('afterprint',finishCalendarPrint);
function renterBookings(r){return data.bookings.filter(b=>HjortData.normalize(b.name)===HjortData.normalize(r.name)&&HjortData.normalize(b.houseNo)===HjortData.normalize(r.houseNo)).sort((a,b)=>b.date.localeCompare(a.date));}
function renderRenters(){
 const q=$('#renterSearch').value.trim().toLocaleLowerCase('da');const arr=[...data.renters].filter(r=>!q||`${r.name} ${r.houseNo||''} ${r.phone||''} ${r.email||''}`.toLocaleLowerCase('da').includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'da'));
 $('#renterList').innerHTML=arr.length?arr.map(r=>{const history=renterBookings(r);return `<article class="renter-card"><div class="renter-head"><span class="avatar">${esc(r.name.trim().slice(0,1).toUpperCase())}</span><div><h3>${esc(r.name)}</h3><p class="muted">${r.houseNo?'Have nummer '+esc(r.houseNo):'Have nummer ikke oplyst'}</p></div>${isBlacklisted(r.name,r.houseNo)?'<span class="badge black">Blacklist</span>':''}</div><div class="contact-grid">${r.phone?`<span>Telefon <strong>${esc(r.phone)}</strong></span>`:''}${r.email?`<span>E-mail <strong>${esc(r.email)}</strong></span>`:''}${r.address?`<span>Adresse <strong>${esc(r.address)}</strong></span>`:''}</div><details><summary>${history.length} ${history.length===1?'booking':'bookinger'} · se historik</summary>${history.length?history.map(b=>`<button class="history-row" data-edit="${esc(b.id)}"><span>${fmtDate(b.date)}</span>${paymentBadge(b)}</button>`).join(''):'<p class="muted">Ingen bookinger endnu.</p>'}</details><div class="renter-actions"><button class="secondary" data-use-renter="${esc(r.id)}">Ny booking</button><button class="text-button danger-text" data-del-renter="${esc(r.id)}">Slet lejer</button></div></article>`;}).join(''):'<div class="empty-state"><h3>Et navn, du kender</h3><p>Gem lejeren, når du opretter en booking. Næste gang er oplysningerne klar.</p></div>';
 $$('[data-use-renter]').forEach(b=>b.onclick=()=>{if(newBooking()){fillRenter(data.renters.find(r=>r.id===b.dataset.useRenter));}});
 $$('[data-del-renter]').forEach(b=>b.onclick=()=>{if(confirm('Slet lejeren fra listen? Tidligere bookinger bevares.')){const next=HjortData.clone(data);next.renters=next.renters.filter(r=>r.id!==b.dataset.delRenter);if(save(next))toast('Lejer slettet');}});
}
$('#renterSearch').oninput=()=>{renderRenters();bindBookingButtons();};
function renderSavedRenter(){const sel=$('#savedRenter'),selected=sel.value;sel.innerHTML='<option value="">Vælg en lejer eller skriv oplysningerne nedenfor</option>'+[...data.renters].sort((a,b)=>a.name.localeCompare(b.name,'da')).map(r=>`<option value="${esc(r.id)}">${esc(r.name)}${r.houseNo?' · Have nummer '+esc(r.houseNo):''}</option>`).join('');sel.value=selected;}
$('#savedRenter').onchange=e=>{const r=data.renters.find(x=>x.id===e.target.value);if(r)fillRenter(r);};
function currentRenterType(){return $('[name=renterType]:checked')?.value||legacyBookingType||'member';}
function selectRenterType(type,keepLegacy=false){
 legacyBookingType=keepLegacy&&type==='other'?'other':null;
 const selected=['member','friend','board'].includes(type)?type:type==='other'?'friend':'member';
 $$('[name=renterType]').forEach(r=>r.checked=!legacyBookingType&&r.value===selected);
 $('#legacyTypeNote').classList.toggle('hidden',!legacyBookingType);
}
function syncPaymentMode(){
 const board=currentRenterType()==='board';
 for(const field of ['price','deposit']){$('#'+field).readOnly=board;if(board)$('#'+field).value=0;}
 $('#boardPriceNote').classList.toggle('hidden',!board);
 $('.payment-checks').classList.toggle('hidden',board);
 $('#paid').disabled=board;$('#depositPaid').disabled=board;
}
function fillRenter(r){if(!r)return;formHydrating=true;for(const k of ['name','houseNo','phone','email','address'])$('#'+k).value=r[k]||'';selectRenterType(r.type);applyPrice();checkWarning();formHydrating=false;scheduleDraftSave();}
function applyPrice(){
 const wasBoard=$('#price').readOnly,type=$('[name=renterType]:checked')?.value||'member';
 legacyBookingType=null;$('#legacyTypeNote').classList.add('hidden');
 $('#price').value=type==='board'?0:data.settings[type==='friend'?'friendPrice':'memberPrice'];
 if(type==='board')$('#deposit').value=0;else if(wasBoard)$('#deposit').value=data.settings.deposit;
 syncPaymentMode();if(!formHydrating)scheduleDraftSave();
}
$$('[name=renterType]').forEach(r=>r.onchange=applyPrice);
function checkWarning(){
 const name=$('#name').value,gardenNo=$('#houseNo').value,date=$('#bookingDate').value,id=$('#bookingId').value,msgs=[];let blockedSave=false;
 const blocked=HjortData.blocked(data.blacklist,name,gardenNo);
 if(blocked){
  const existing=data.bookings.find(b=>b.id===id),sameAgreement=existing&&existing.date===date&&HjortData.normalize(existing.name)===HjortData.normalize(name)&&HjortData.normalize(existing.houseNo)===HjortData.normalize(gardenNo);
  blockedSave=!sameAgreement;
  msgs.push((sameAgreement?'Lejeren er på blacklist. Du kan opdatere denne eksisterende aftale. ':'Booking blokeret: '+blocked.name+' eller dette have nummer er på blacklist. ')+blocked.reason);
 }
 if(date&&data.bookings.some(b=>b.date===date&&b.id!==id)){msgs.push('Datoen er allerede booket. Vælg en anden dato, eller rediger den eksisterende booking.');blockedSave=true;}
 const w=$('#bookingWarning');w.textContent=msgs.join(' ');w.classList.toggle('hidden',!msgs.length);$('#submitBooking').disabled=blockedSave||storageBlocked;return !blockedSave;
}
['#name','#houseNo','#bookingDate'].forEach(s=>$(s).addEventListener('input',checkWarning));
function collectDraft(){const type=currentRenterType(),board=type==='board';return {id:$('#bookingId').value,date:$('#bookingDate').value,name:$('#name').value,houseNo:$('#houseNo').value,phone:$('#phone').value,email:$('#email').value,address:$('#address').value,type,price:board?'0':$('#price').value,deposit:board?'0':$('#deposit').value,paid:$('#paid').checked,depositPaid:$('#depositPaid').checked,saveRenter:$('#saveRenter').checked,notes:$('#notes').value,savedAt:new Date().toISOString()};}
function hasDraftContent(d){return Boolean(d.id||d.date||['name','houseNo','phone','email','address','notes'].some(k=>String(d[k]||'').trim())||(d.type&&d.type!=='member')||(d.price!==undefined&&Number(d.price)!==data.settings.memberPrice)||(d.deposit!==undefined&&Number(d.deposit)!==data.settings.deposit)||d.paid||d.depositPaid||d.saveRenter===false);}
function setAutoSaveStatus(text,isSaved=true){const el=$('#autoSaveStatus');el.textContent=text;el.classList.toggle('pending',!isSaved);$('#draftBanner').classList.toggle('hidden',!hasDraftContent(collectDraft()));}
function saveDraft(manual=false){
 if(formHydrating||draftBlocked)return false;const draft=collectDraft();
 try{
  if(localStorage.getItem(DRAFT_KEY)!==draftBaseRaw&&(!manual||!confirm('Kladden er ændret i et andet vindue. Vil du erstatte den med denne formular?'))){setAutoSaveStatus('Kladden er ændret i et andet vindue. Genindlæs eller brug Gem kladde for at vælge denne formular.',false);return false;}
  if(hasDraftContent(draft)){const raw=JSON.stringify(draft);localStorage.setItem(DRAFT_KEY,raw);draftBaseRaw=raw;setAutoSaveStatus('Kladde gemt'+(manual?' manuelt':' automatisk')+' kl. '+timeNow());if(manual)toast('Kladde gemt');}
  else{localStorage.removeItem(DRAFT_KEY);draftBaseRaw=null;setAutoSaveStatus('Kladde gemmes automatisk på denne enhed');}return true;
 }
 catch{setAutoSaveStatus('Kladde kunne ikke gemmes. Lad formularen være åben og frigør lagerplads.',false);return false;}
}
function scheduleDraftSave(){if(!formHydrating)saveDraft(false);}
function hydrate(d){formHydrating=true;for(const k of ['name','houseNo','phone','email','address','notes'])$('#'+k).value=d[k]||'';$('#bookingId').value=d.id||'';$('#bookingDate').value=d.date||'';$('#bookingFormTitle').textContent=d.id?'Rediger booking':'Ny booking';selectRenterType(d.type,true);$('#price').value=d.price??data.settings.memberPrice;$('#deposit').value=d.deposit??data.settings.deposit;$('#paid').checked=!!d.paid;$('#depositPaid').checked=!!d.depositPaid;$('#saveRenter').checked=d.saveRenter!==false;$('#deleteBooking').classList.toggle('hidden',!d.id);syncPaymentMode();formHydrating=false;checkWarning();}
function restoreDraft(){try{const raw=localStorage.getItem(DRAFT_KEY);draftBaseRaw=raw;if(!raw)return;const d=JSON.parse(raw);if(!d||typeof d!=='object'||!hasDraftContent(d))return;hydrate(d);setAutoSaveStatus('Din kladde er gendannet. Fortsæt, hvor du slap.');}catch{draftBlocked=true;setAutoSaveStatus('Den gemte kladde kunne ikke læses. Den oprindelige kladde er bevaret.',false);}}
function clearDraft(force=false){try{if(!force&&localStorage.getItem(DRAFT_KEY)!==draftBaseRaw)return false;localStorage.removeItem(DRAFT_KEY);draftBaseRaw=null;draftBlocked=false;setAutoSaveStatus('Kladde gemmes automatisk på denne enhed');return true;}catch{toast('Kunne ikke slette kladden.');return false;}}
function canReplaceDraft(){const changed=stored(DRAFT_KEY)!==draftBaseRaw;if(!hasDraftContent(collectDraft())&&!draftBlocked&&!changed)return true;const accepted=confirm(changed?'Kladden er ændret i et andet vindue. Vil du kassere den og åbne en anden booking?':'Du har en kladde. Vil du kassere den og åbne en anden booking?');if(accepted&&changed)draftBaseRaw=stored(DRAFT_KEY);return accepted;}
function resetForm(removeDraft=true){formHydrating=true;$('#bookingForm').reset();$('#savedRenter').value='';hydrate({});if(removeDraft)clearDraft(true);else setAutoSaveStatus('Kladde gemmes automatisk på denne enhed');}
function newBooking(date=''){if(!canReplaceDraft())return false;resetForm(true);$('#bookingDate').value=date;saveDraft(false);go('booking');return true;}
$('#resetBooking').onclick=()=>{if(canReplaceDraft())resetForm(true);};$('#saveDraft').onclick=()=>saveDraft(true);
$('#bookingForm').addEventListener('input',scheduleDraftSave);$('#bookingForm').addEventListener('change',scheduleDraftSave);
window.addEventListener('pagehide',()=>saveDraft(false));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveDraft(false);});
$('#bookingForm').onsubmit=e=>{
 e.preventDefault();if(!checkWarning())return;const d=collectDraft();
 if(!d.name.trim()||!HjortData.validDate(d.date)||!Number.isFinite(Number(d.price))||Number(d.price)<0||Number(d.deposit)<0)return;
 const existing=data.bookings.find(b=>b.id===d.id);
 if(d.id&&!existing){toast('Denne booking findes ikke længere. Ryd formularen og opret en ny booking.');return;}
 const b={...existing,id:d.id||uid(),date:d.date,name:d.name.trim(),houseNo:d.houseNo.trim(),phone:d.phone.trim(),email:d.email.trim(),address:d.address.trim(),type:d.type,price:Number(d.price),deposit:Number(d.deposit)||0,paid:d.paid,depositPaid:d.depositPaid,notes:d.notes.trim(),updatedAt:new Date().toISOString()};
 const next=HjortData.clone(data),i=next.bookings.findIndex(x=>x.id===b.id);i>=0?next.bookings[i]=b:next.bookings.push(b);
 if(d.saveRenter){const r=next.renters.find(r=>HjortData.normalize(r.name)===HjortData.normalize(b.name)&&HjortData.normalize(r.houseNo)===HjortData.normalize(b.houseNo));const renter={...r,id:r?.id||uid(),name:b.name,houseNo:b.houseNo,phone:b.phone,email:b.email,address:b.address,type:b.type};r?Object.assign(r,renter):next.renters.push(renter);}
 if(save(next)){clearDraft();resetForm(false);go('dashboard');toast('Booking gemt');}
};
function editBooking(id){const b=data.bookings.find(x=>x.id===id);if(!b)return;if($('#bookingId').value===id){go('booking');return;}if(!canReplaceDraft())return;hydrate(b);saveDraft(false);go('booking');}
$('#deleteBooking').onclick=()=>{const id=$('#bookingId').value;if(id&&confirm('Slet bookingen for '+$('#name').value+' permanent?')){const next=HjortData.clone(data);next.bookings=next.bookings.filter(b=>b.id!==id);if(save(next)){clearDraft();resetForm(false);go('dashboard');toast('Booking slettet');}}};
function renderBlacklist(){
 $('#blacklistList').innerHTML=data.blacklist.length?data.blacklist.map(x=>`<article class="blacklist-row"><span class="blacklist-icon" aria-hidden="true">!</span><div><h3>${esc(x.name)}</h3><small class="muted">${x.house?'Have nummer '+esc(x.house):'Have nummer ikke oplyst'}</small><p>${esc(x.reason)}</p></div><button class="text-button danger-text" data-del-bl="${esc(x.id)}">Fjern</button></article>`).join(''):'<div class="empty-state"><h3>Ingen på blacklist</h3><p>Personer på denne liste kan ikke få oprettet en booking.</p></div>';
 $$('[data-del-bl]').forEach(b=>b.onclick=()=>{if(confirm('Fjern personen fra blacklist?')){const next=HjortData.clone(data);next.blacklist=next.blacklist.filter(x=>x.id!==b.dataset.delBl);if(save(next))toast('Fjernet fra blacklist');}});
 $('#blacklistCount').textContent=data.blacklist.length+' '+(data.blacklist.length===1?'person':'personer');
}
$('#addBlacklist').onclick=()=>$('#blacklistDialog').showModal();$('#cancelBlacklist').onclick=()=>$('#blacklistDialog').close();
$('#blacklistForm').onsubmit=e=>{e.preventDefault();const name=$('#blName').value.trim(),house=$('#blHouse').value.trim(),reason=$('#blReason').value.trim();if(!name||!reason)return;const next=HjortData.clone(data);next.blacklist.push({id:uid(),name,house,reason});if(save(next)){$('#blacklistDialog').close();$('#blacklistForm').reset();checkWarning();toast('Tilføjet til blacklist');}};
function renderSettings(){for(const field of ['memberPrice','friendPrice'])$('#'+field).value=data.settings[field];$('#defaultDeposit').value=data.settings.deposit;}
$('#settingsForm').onsubmit=e=>{e.preventDefault();const next=HjortData.clone(data);next.settings={...data.settings,memberPrice:Number($('#memberPrice').value),friendPrice:Number($('#friendPrice').value),deposit:Number($('#defaultDeposit').value)};try{HjortData.validate(next);if(save(next))toast('Standardpriser gemt');}catch(err){toast(err.message);}};
function backupName(){return `hjortemosen-backup-${isoLocal(new Date())}.json`;}
function backupContents(){return storageBlocked?localStorage.getItem(KEY)||'{}':JSON.stringify(data,null,2);}
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function downloadBackup(){download(new Blob([backupContents()],{type:'application/json'}),backupName());toast('Sikkerhedskopi eksporteret');}
$('#exportData').onclick=downloadBackup;
$('#shareData').onclick=async()=>{const file=new File([backupContents()],backupName(),{type:'application/json'});try{if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:'Hjortemosen Booking – sikkerhedskopi',files:[file]});toast('Sikkerhedskopi delt');}else downloadBackup();}catch(err){if(err.name!=='AbortError')downloadBackup();}};
function bookingOverview(){const arr=[...data.bookings].filter(b=>b.date>=isoLocal(new Date())).sort((a,b)=>a.date.localeCompare(b.date));const lines=['HJORTEMOSEN – KOMMENDE BOOKINGER',''];if(!arr.length)lines.push('Ingen kommende bookinger.');for(const b of arr){lines.push(`${fmtDate(b.date)} · ${b.name}${b.houseNo?' · Have nummer '+b.houseNo:''}`,`${isFreeBoard(b)?'Bestyrelsesmedlem · Gratis · uden depositum':`${typeLabel(b.type)} · Leje ${money(b.price)} (${b.paid?'betalt':'ikke betalt'}) · Depositum ${money(b.deposit)} (${b.depositPaid?'betalt':'ikke betalt'})`}`);if(b.notes)lines.push('Bemærkning: '+b.notes);lines.push('');}return lines.join('\n');}
$('#shareOverview').onclick=async()=>{const text=bookingOverview();try{if(navigator.share)await navigator.share({title:'Hjortemosen – bookingoversigt',text});else{download(new Blob([text],{type:'text/plain;charset=utf-8'}),'hjortemosen-bookingoversigt.txt');toast('Bookingoversigt eksporteret');}}catch(err){if(err.name!=='AbortError')download(new Blob([text],{type:'text/plain;charset=utf-8'}),'hjortemosen-bookingoversigt.txt');}};
$('#importData').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10000000)throw new Error('Filen er for stor. Vælg en sikkerhedskopi under 10 MB.');pendingImport=HjortData.validate(JSON.parse(await file.text()),true);$('#importSummary').textContent=`${pendingImport.bookings.length} bookinger, ${pendingImport.renters.length} lejere og ${pendingImport.blacklist.length} personer på blacklist.`;$('#importError').classList.add('hidden');$('#importDialog').showModal();}catch(err){pendingImport=null;toast('Import afvist: '+err.message);}finally{e.target.value='';}};
$('#cancelImport').onclick=()=>{pendingImport=null;$('#importDialog').close();};
$('#confirmImport').onclick=()=>{
 if(!pendingImport)return;
 const mode=$('[name=importMode]:checked').value;
 try{
  if(hasDraftContent(collectDraft())&&!confirm('Import vil rydde din aktuelle bookingkladde. Fortsæt?'))return;
  const next=mode==='merge'?HjortData.merge(data,pendingImport):pendingImport;
  if(mode==='replace'&&!confirm('Erstat alle nuværende bookinger, lejere, blacklist og indstillinger med sikkerhedskopien?'))return;
  const old=localStorage.getItem(KEY);if(old)localStorage.setItem(RECOVERY_KEY,old);
  localStorage.setItem(KEY,JSON.stringify(next));data=next;storageBlocked=false;$('#storageError').classList.add('hidden');clearDraft();resetForm(false);renderAll();pendingImport=null;$('#importDialog').close();toast('Sikkerhedskopi importeret');
 }catch(err){$('#importError').textContent=err.message;$('#importError').classList.remove('hidden');}
};
$('#downloadRecovery').onclick=()=>{const raw=stored(RECOVERY_KEY);if(raw)download(new Blob([raw],{type:'application/json'}),'hjortemosen-foer-seneste-import.json');else toast('Der er ingen tidligere import at gendanne.');};
$$('[data-share-doc]').forEach(b=>b.onclick=async()=>{try{const response=await fetch(b.dataset.shareDoc);if(!response.ok)throw new Error('Dokumentet kunne ikke åbnes.');const file=new File([await response.blob()],b.dataset.shareDoc.split('/').pop().split('?')[0],{type:'application/pdf'});if(navigator.share&&navigator.canShare?.({files:[file]}))await navigator.share({title:'Hjortemosen lejekontrakt',files:[file]});else{download(file,file.name);toast('Dokument downloadet');}}catch(err){if(err.name!=='AbortError')toast(err.message);}});
$$('[data-print]').forEach(b=>b.onclick=()=>{const w=window.open(b.dataset.print,'_blank');if(!w){toast('Tillad pop op-vinduer for at printe.');return;}toast('Åbn PDF-menuen eller Del → Udskriv for at printe.');});
function renderAll(){window.HjortContractUI?.refresh();renderStats();renderUpcoming();renderCalendar();renderRenters();renderSavedRenter();renderBlacklist();renderSettings();bindBookingButtons();$('#downloadRecovery').classList.toggle('hidden',!stored(RECOVERY_KEY));}
function connectionStatus(){const ready=Boolean(navigator.serviceWorker?.controller),online=navigator.onLine;$('#connectionStatus').textContent=!online?(ready?'Offline · klar til brug':'Offline · ikke indlæst helt'):ready?'Klar til offlinebrug':'Forbereder offlinebrug';$('#connectionStatus').classList.toggle('is-offline',!online);}
window.addEventListener('online',connectionStatus);window.addEventListener('offline',connectionStatus);
window.addEventListener('storage',e=>{if(e.key===KEY){data=load();if(storageBlocked)storageError('Data blev ændret i et andet vindue og kunne ikke læses. Den oprindelige fil er bevaret.');else{renderAll();checkWarning();toast('Overblikket er opdateret fra et andet vindue.');}}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden');});
$('#installBtn').onclick=async()=>{if(deferredPrompt){await deferredPrompt.prompt();deferredPrompt=null;$('#installBtn').classList.add('hidden');}};
if('serviceWorker' in navigator){
 let refreshing=false;
 const reportVersion=()=>navigator.serviceWorker.controller?.postMessage({type:'CLIENT_VERSION',version:APP_VERSION});
 navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='REPORT_VERSION')event.source?.postMessage({type:'CLIENT_VERSION',version:APP_VERSION});});
 window.addEventListener('focus',reportVersion);
 navigator.serviceWorker.addEventListener('controllerchange',()=>{connectionStatus();reportVersion();if(refreshing){saveDraft(false);location.reload();}});
 window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await navigator.serviceWorker.ready;connectionStatus();reportVersion();
 const offer=()=>{if(reg.waiting&&navigator.serviceWorker.controller){$('#updateBanner').classList.remove('hidden');$('#updateApp').onclick=()=>{if(!saveDraft(false))return;refreshing=true;reg.waiting.postMessage({type:'SKIP_WAITING'});};}};
 const watchInstalling=()=>{const worker=reg.installing;if(worker)worker.addEventListener('statechange',offer);offer();};
 reg.addEventListener('updatefound',watchInstalling);watchInstalling();reg.update().catch(()=>{});
 }catch{ $('#connectionStatus').textContent='Offlinefunktion ikke klar';toast('Offlinefunktion kunne ikke indlæses. Prøv igen med internet.');}});
}
resetForm(false);restoreDraft();renderAll();connectionStatus();
$('#currentDate').textContent=new Intl.DateTimeFormat('da-DK',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
if(storageBlocked){storageError('De gemte data kunne ikke læses. De er bevaret, og nye bookinger er blokeret. Eksportér de oprindelige data under Mere.');checkWarning();}

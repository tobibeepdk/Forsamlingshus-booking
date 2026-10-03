/* Complete offline snapshots. Browser copies and Files exports share one format. */
(function(root){
 'use strict';
 const keys={data:'hjortemosen_data_v1',booking:'hjortemosen_booking_draft_v1',contract:'hjortemosen_contract_draft_v1',settings:'hjortemosen_settings_draft_v1',blacklist:'hjortemosen_blacklist_draft_v1'};
 const journal='hjortemosen_restore_journal_v1';
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 function text(v,max=20000){if(typeof v!=='string'||v.length>max)throw new Error('Et kladdefelt har et ugyldigt format.');return v;}
 function validateStrokes(value){
  if(!Array.isArray(value)||value.length>1000)throw new Error('Ugyldig håndskrevet underskrift.');let count=0;
  for(const stroke of value){if(!Array.isArray(stroke)||!stroke.length)throw new Error('Ugyldig tegning i underskriften.');count+=stroke.length;if(count>30000)throw new Error('Underskriften er for stor.');for(const p of stroke)if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>1200||p[1]<0||p[1]>400)throw new Error('Ugyldig tegning i underskriften.');}
  return HjortData.clone(value);
 }
 function validateDraft(kind,d){
  if(d===null||d===undefined)return null;if(!object(d))throw new Error('Ugyldig '+kind+'-kladde.');
  if(kind==='contract'){
   if(!['member-pdf','friend-pdf','member-word'].includes(d.template)||!object(d.values))throw new Error('Ugyldig kontraktkladde.');
   text(d.bookingId,200);text(d.bookingSnapshot,20000);if(d.bookingSnapshot){try{const b=JSON.parse(d.bookingSnapshot);if(!object(b)||!HjortData.validDate(b.date)||!['member','friend','board','other'].includes(b.type)||!Number.isFinite(Number(b.price))||Number(b.price)<0)throw new Error();for(const k of ['name','phone','address','email'])if(b[k]!==undefined)text(b[k]);}catch{throw new Error('Ugyldig booking i kontraktkladden.');}}const limits={name:200,phone:60,email:254,address:300,account:100,agreementDate:10,rentalDate:10,meterStart:40,meterEnd:40,signature:200};
   for(const [field,max]of Object.entries(limits))text(d.values[field],max);
   for(const field of ['agreementDate','rentalDate'])if(d.values[field]&&!HjortData.validDate(d.values[field]))throw new Error('Ugyldig dato i kontraktkladden.');
   validateStrokes(d.strokes);
  }else{
   const fields=kind==='booking'?['id','date','name','houseNo','phone','email','address','notes']:kind==='settings'?['memberPrice','friendPrice','deposit','baseSettings']:['name','house','reason'];
   for(const field of fields)if(d[field]!==undefined)text(d[field]);
   if(kind==='booking'){
    if(d.baseBooking!==undefined&&d.baseBooking!==null)text(d.baseBooking);
    for(const field of ['price','deposit'])if(d[field]!==undefined&&typeof d[field]!=='string'&&typeof d[field]!=='number')throw new Error('Ugyldigt beløb i kladden.');
    if(d.type!==undefined&&!['member','friend','board','other'].includes(d.type))throw new Error('Ugyldig lejertype i kladden.');
    if(d.date&&!HjortData.validDate(d.date))throw new Error('Ugyldig dato i bookingkladden.');
    for(const field of ['paid','depositPaid','saveRenter'])if(d[field]!==undefined&&typeof d[field]!=='boolean')throw new Error('Ugyldig betalingsstatus i kladden.');
   }
  }
  return HjortData.clone(d);
 }
 function parse(raw){
  if(typeof raw==='string')raw=JSON.parse(raw);if(!object(raw))throw new Error('Ugyldig sikkerhedskopi.');
  const copy={...raw};delete copy.backup;const data=HjortData.validate(copy,true),drafts={booking:null,contract:null,settings:null,blacklist:null};
  if(raw.backup!==undefined){const b=raw.backup;if(!object(b)||b.format!=='hjortemosen-backup'||b.version!==1)throw new Error('Sikkerhedskopiens version understøttes ikke.');if(!object(b.drafts))throw new Error('Sikkerhedskopien mangler kladder.');for(const kind of Object.keys(drafts))drafts[kind]=validateDraft(kind,b.drafts[kind]);}
  return {data,drafts,hasDrafts:raw.backup!==undefined};
 }
 function capture(appVersion='',storage=root.localStorage){
  ensureWritable(storage);const raw=storage.getItem(keys.data),data=raw!==null?HjortData.validate(JSON.parse(raw)):HjortData.clone(HjortData.defaults);delete data.backup;
  const drafts={};for(const kind of ['booking','contract','settings','blacklist']){const raw=storage.getItem(keys[kind]);drafts[kind]=validateDraft(kind,raw?JSON.parse(raw):null);}
  return {...data,backup:{format:'hjortemosen-backup',version:1,appVersion,dataPresent:raw!==null,savedAt:new Date().toISOString(),drafts}};
 }
 function put(storage,key,value){value===null?storage.removeItem(key):storage.setItem(key,value);}
 function ensureWritable(storage=root.localStorage){if(storage.getItem(journal)!==null)throw new Error('En gendannelse er i gang. Vent, og genåbn appen, før du ændrer oplysninger.');}
 function locked(task){return root.navigator?.locks?.request?root.navigator.locks.request('hjortemosen_workspace_restore_v1',task):task();}
 function rollback(previous,storage){for(const key of Object.values(keys))put(storage,key,previous[key]);storage.removeItem(journal);}
 function recover(storage=root.localStorage){
  return locked(()=>{
   const raw=storage.getItem(journal);if(!raw)return;
   const entry=JSON.parse(raw),previous=entry.previous||entry;
   if(!root.navigator?.locks?.request&&entry.createdAt&&Date.now()-entry.createdAt<30000)throw new Error('En gendannelse kan stadig være aktiv i et andet vindue. Vent 30 sekunder, og genåbn appen.');
   if(!object(previous)||!Object.values(keys).every(k=>Object.hasOwn(previous,k)&&(previous[k]===null||typeof previous[k]==='string')))throw new Error('En afbrudt gendannelse kunne ikke afsluttes. De oprindelige data er bevaret.');
   rollback(previous,storage);
  });
 }
 function apply(raw,storage=root.localStorage,expected=null){
  const parsed=parse(raw);
  return locked(()=>{
   ensureWritable(storage);if(expected!==null&&JSON.stringify(Object.values(keys).map(key=>storage.getItem(key)))!==expected)throw new Error('Data er ændret siden forhåndsvisningen. Åbn gendannelsen igen.');const previous={};for(const key of Object.values(keys))previous[key]=storage.getItem(key);
   // The origin-wide Web Lock keeps recovery from mistaking a live restore for a crash.
   storage.setItem(journal,JSON.stringify({createdAt:Date.now(),previous}));
   try{storage.setItem(keys.data,JSON.stringify(parsed.data));for(const kind of ['booking','contract','settings','blacklist'])put(storage,keys[kind],parsed.drafts[kind]?JSON.stringify(parsed.drafts[kind]):null);storage.removeItem(journal);}
   catch(error){try{rollback(previous,storage);}catch{/* Keep the journal for the next launch. */}throw error;}
   return parsed;
  });
 }
 function create(options={}){
  const storage=options.storage||root.localStorage,idb=Object.hasOwn(options,'indexedDB')?options.indexedDB:root.indexedDB,dbName=options.dbName||'hjortemosen_local_backups_v1';
  let opening=null,chain=Promise.resolve(),timer=null,archivePending=false;
  const status=value=>options.onStatus?.(value);
  function db(){
   if(!opening)opening=new Promise((resolve,reject)=>{
    if(!idb){reject(new Error('Automatisk backup er ikke tilgængelig i denne browser. Gem en kopi i Filer.'));return;}
    const request=idb.open(dbName,1);request.onupgradeneeded=()=>{const d=request.result;d.createObjectStore('latest');d.createObjectStore('history',{autoIncrement:true});};
    request.onsuccess=()=>{const d=request.result;d.onversionchange=()=>{d.close();opening=null;};resolve(d);};request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Luk andre appvinduer og prøv backup igen.'));
   }).catch(error=>{opening=null;throw error;});return opening;
  }
  const payload=copy=>JSON.stringify({...copy,backup:{...copy.backup,savedAt:''}});
  async function write(copy,archive,missing){
   const d=await db();return new Promise((resolve,reject)=>{
    const tx=d.transaction(['latest','history'],'readwrite'),latest=tx.objectStore('latest'),history=tx.objectStore('history');let saved=copy,abortReason=null;
    tx.oncomplete=()=>resolve(saved);tx.onerror=tx.onabort=()=>reject(abortReason||tx.error||new Error('Den lokale backup kunne ikke gemmes.'));const prune=()=>{const all=history.getAllKeys();all.onsuccess=()=>{for(const key of all.result.slice(0,Math.max(0,all.result.length-10)))history.delete(key);};};const get=latest.get('latest');
    get.onsuccess=()=>{
     const previous=get.result,original=copy;
     // Re-read the shared workspace inside the transaction: another tab may have saved
     // after this manager captured and queued its snapshot.
     try{copy=capture(options.appVersion||'',storage);missing=storage.getItem(keys.data)===null;}catch(error){abortReason=error;tx.abort();return;}
     if(missing&&previous&&previous.backup.dataPresent!==false){abortReason=new Error('De gemte data mangler. Din sidste backup er bevaret. Vælg Gendan valgt backup.');tx.abort();return;}
     if(payload(original)!==payload(copy)&&(!previous||payload(original)!==payload(previous)))history.add(original);
     if(previous&&payload(previous)===payload(copy)){saved=previous;prune();return;}
     if(previous&&(archive||previous.backup.savedAt.slice(0,10)!==copy.backup.savedAt.slice(0,10)))history.add(previous);
     saved=copy;
     latest.put(copy,'latest');prune();
    };
   });
  }
  function flush(archive=false){
   clearTimeout(timer);timer=null;archive=archive||archivePending;archivePending=false;
   let copy,missing;try{copy=capture(options.appVersion||'',storage);missing=storage.getItem(keys.data)===null;}catch(error){status({state:'error',message:'Backup kunne ikke laves: '+error.message});return Promise.resolve(false);}
   status({state:'saving'});const task=chain.then(()=>write(copy,archive,missing)).then(saved=>{status({state:'saved',savedAt:saved.backup.savedAt});return true;}).catch(error=>{status({state:'error',message:error.message||'Backup kunne ikke gemmes. Frigør lagerplads og prøv igen.'});return false;});chain=task;return task;
  }
  function queue(archive=false){archivePending=archivePending||archive;clearTimeout(timer);timer=setTimeout(()=>flush(),archive?0:600);}
  async function list(){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(['latest','history'],'readonly'),latest=tx.objectStore('latest').get('latest'),copies=tx.objectStore('history').getAll(),ids=tx.objectStore('history').getAllKeys();tx.oncomplete=()=>resolve([...(latest.result?[{id:'latest',savedAt:latest.result.backup.savedAt}]:[]),...copies.result.map((copy,i)=>({id:ids.result[i],savedAt:copy.backup.savedAt})).reverse()]);tx.onerror=()=>reject(tx.error);});}
  async function read(id){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(id==='latest'?'latest':'history','readonly'),request=tx.objectStore(id==='latest'?'latest':'history').get(id);tx.oncomplete=()=>request.result?resolve(request.result):reject(new Error('Sikkerhedskopien findes ikke længere.'));tx.onerror=()=>reject(tx.error);});}
  return {queue,flush,list,read};
 }
 root.HjortBackup={keys,validateDraft,validateStrokes,parse,capture,recover,apply,ensureWritable,create};
})(typeof globalThis!=='undefined'?globalThis:this);

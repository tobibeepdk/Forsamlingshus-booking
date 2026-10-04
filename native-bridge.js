/* Native Files, sharing and print. Safari keeps its existing browser behavior. */
(function(root){
 'use strict';
 function create(handler,options={}){
  const available=typeof handler?.postMessage==='function',listeners=new Set(options.onStatus?[options.onStatus]:[]);let chain=Promise.resolve();
  const status=state=>{for(const listener of listeners)listener(state);};
  async function request(action,data={},timeout=options.timeoutMs||15000){
   if(!available)throw new Error('Filbackup er kun tilgængelig i den installerede iPad-app.');
   let timer;try{const result=await Promise.race([Promise.resolve().then(()=>handler.postMessage({version:1,action,...data})),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('iPad-appen svarer ikke. Prøv igen.')),timeout);})]);
    if(!result||typeof result!=='object'||result.ok!==true)throw new Error(result?.error||'iPad-appen gav ikke en gyldig kvittering.');return result;
   }finally{clearTimeout(timer);}
  }
  function saveBackup(copy){
   let snapshot;try{root.HjortBackup.parse(copy);if(copy.backup?.format!=='hjortemosen-backup'||typeof copy.backup.dataPresent!=='boolean')throw new Error('Sikkerhedskopien mangler fuldstændige oplysninger.');snapshot=JSON.stringify(copy);if(snapshot.length>10*1024*1024)throw new Error('Sikkerhedskopien er for stor.');}catch(error){status({state:'error',message:error.message});return Promise.reject(error);}
   const job=chain.then(async()=>{status({state:'saving'});try{const result=await request('backup',{snapshot});if(typeof result.savedAt!=='string'||!Number.isFinite(Date.parse(result.savedAt))||result.file!=='Hjortemosen/seneste-backup.json')throw new Error('Filbackup mangler en gyldig kvittering.');status({state:'saved',savedAt:result.savedAt,file:result.file});return result;}catch(error){status({state:'error',message:error.message});throw error;}});chain=job.catch(()=>{});return job;
  }
  async function readLatest(){const result=await request('readLatest');if(result.snapshot===null)return null;if(typeof result.snapshot!=='string'||result.snapshot.length>10*1024*1024)throw new Error('Den gemte filbackup er ugyldig.');root.HjortBackup.parse(result.snapshot);return result.snapshot;}
  async function deliverFile(file,action){
   if(!file||typeof file.name!=='string'||/[\\/\x00]/.test(file.name)||file.name.length>200||file.size>20*1024*1024)throw new Error('Filen kan ikke deles.');
   const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length>20*1024*1024)throw new Error('Filen er for stor.');let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
   return request(action,{name:file.name,mimeType:file.type||'application/octet-stream',base64:root.btoa(binary)},120000);
  }
  return {available,saveBackup,readLatest,shareFile:file=>deliverFile(file,'share'),previewFile:file=>deliverFile(file,'preview'),flush:()=>chain,openBackups:()=>request('openBackups',{},120000),printCalendar:html=>request('printCalendar',{html},120000),subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);}};
 }
 root.HjortNative=create(root.webkit?.messageHandlers?.hjortemosen);root.HjortNative.create=create;
})(typeof globalThis!=='undefined'?globalThis:this);

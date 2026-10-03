/* Pointer-based handwriting, kept only in the current form. */
(function(root){
 'use strict';
 function create(canvas,onChange){
  const ctx=canvas.getContext('2d');
  let active=null,last=null,bounds=null;
  const changed=()=>onChange?.(Boolean(bounds));
  function point(event){
   const rect=canvas.getBoundingClientRect();
   return {x:Math.max(0,Math.min(canvas.width,(event.clientX-rect.left)*canvas.width/rect.width)),y:Math.max(0,Math.min(canvas.height,(event.clientY-rect.top)*canvas.height/rect.height))};
  }
  function add(event){
   const p=point(event);
   ctx.strokeStyle=ctx.fillStyle='#122b30';ctx.lineWidth=4;ctx.lineCap=ctx.lineJoin='round';
   ctx.beginPath();
   if(last){ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();}
   else{ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();}
   if(!bounds)bounds={left:p.x,right:p.x,top:p.y,bottom:p.y};
   else{bounds.left=Math.min(bounds.left,p.x);bounds.right=Math.max(bounds.right,p.x);bounds.top=Math.min(bounds.top,p.y);bounds.bottom=Math.max(bounds.bottom,p.y);}
   last=p;changed();
  }
  function release(id){try{if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}catch{/* The browser may already have released this pointer. */}}
  canvas.addEventListener('pointerdown',event=>{
   if(active!==null||event.isPrimary===false||event.button!==0)return;
   event.preventDefault();active=event.pointerId;last=null;
   try{canvas.setPointerCapture(active);}catch{/* Drawing inside the pad still works. */}
   add(event);
  });
  canvas.addEventListener('pointermove',event=>{
   if(event.pointerId!==active)return;event.preventDefault();
   const samples=event.getCoalescedEvents?.();for(const sample of samples?.length?samples:[event])add(sample);
  });
  function end(event){if(event.pointerId!==active)return;const id=active;active=null;last=null;release(id);}
  canvas.addEventListener('pointerup',event=>{if(event.pointerId===active)add(event);end(event);});
  canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);
  function clear(){const id=active;active=null;last=null;const hadInk=Boolean(bounds);bounds=null;ctx.clearRect(0,0,canvas.width,canvas.height);if(id!==null)release(id);if(hadInk)changed();}
  function getImage(){
   if(!bounds)return null;
   const left=Math.max(0,Math.floor(bounds.left)-6),top=Math.max(0,Math.floor(bounds.top)-6),right=Math.min(canvas.width,Math.ceil(bounds.right)+6),bottom=Math.min(canvas.height,Math.ceil(bounds.bottom)+6);
   const image=root.document.createElement('canvas');image.width=Math.max(1,right-left);image.height=Math.max(1,bottom-top);
   image.getContext('2d').drawImage(canvas,left,top,image.width,image.height,0,0,image.width,image.height);
   const base64=image.toDataURL('image/png').split(',')[1],binary=root.atob(base64),png=new Uint8Array(binary.length);
   for(let i=0;i<binary.length;i++)png[i]=binary.charCodeAt(i);
   return {png};
  }
  return {clear,getImage,isDrawing:()=>active!==null};
 }
 root.HjortSignature={create};
})(typeof globalThis!=='undefined'?globalThis:this);

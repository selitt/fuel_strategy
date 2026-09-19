"""Test-only blob capture and managed-browser HTTP relay. No product mocks."""
CAPTURE = r'''
(()=>{
window.__downloads=[]; const __blobs=new Map();
const __create=URL.createObjectURL.bind(URL); const __revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=b=>{const u=__create(b);__blobs.set(u,b);return u;};
URL.revokeObjectURL=u=>{__blobs.delete(u);__revoke(u);};
const __click=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){
 if(this.download&&__blobs.has(this.href)){
  const name=this.download; __blobs.get(this.href).arrayBuffer().then(buffer=>{
   const bytes=new Uint8Array(buffer);let s='';for(const b of bytes)s+=String.fromCharCode(b);
   window.__downloads.push({name,base64:btoa(s)});
  });return;
 }return __click.call(this);
};
})();
'''
RELAY = r'''
history.replaceState=(_s,_t,url)=>{window.__requestedURL=String(url);};
window.fetch=async(url,init={})=>{
 const payload={url:String(url),method:init.method||'GET',headers:Object.fromEntries(new Headers(init.headers)),body:init.body};
 if(init.body instanceof FormData){
  payload.body=null;payload.files=[];
  for(const [key,file] of init.body.entries()){
   if(!(file instanceof Blob))throw new Error('Unexpected non-file form field');
   const bytes=new Uint8Array(await file.arrayBuffer());let s='';for(const b of bytes)s+=String.fromCharCode(b);
   payload.files.push({key,name:file.name,type:file.type,base64:btoa(s)});
  }
 }
 const r=await window.__testTransport(payload);
 const bytes=Uint8Array.from(atob(r.body),c=>c.charCodeAt(0));
 return new Response(r.status===204?null:bytes,{status:r.status,headers:r.headers});
};
'''

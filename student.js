(()=>{'use strict';
const SUPABASE='https://lxmxsymxmpulkkngjfjo.supabase.co';
const PUBLIC_KEY='sb_publishable_-7LnL-kzS1omjDFD5va_0A_Tjdh3m8h';
const PILOT='https://hmu-student-pilot-test.eissaismail941.workers.dev';
const SESSION_KEY='hmu-phase8-student-pilot-session';
const $=id=>document.getElementById(id);
let auth=null,student=null,currentTab='overview',loadingSession=true,restoring=false;
function status(id,msg,kind='error'){const node=$(id);node.replaceChildren();if(!msg)return;const div=document.createElement('div');div.className=kind;div.textContent=msg;node.append(div);}
function stageText(n){return 'Stage '+n;}
async function req(url,{method='GET',body,bearer}={}){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),18000);
 try{const res=await fetch(url,{method,headers:{apikey:PUBLIC_KEY,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(bearer?{Authorization:'Bearer '+bearer}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:ctrl.signal});const data=await res.json().catch(()=>({}));if(!res.ok){const er=new Error(data.error||data.msg||data.message||'Request failed (HTTP '+res.status+').');er.code=res.status;throw er;}return data;}catch(e){if(e.name==='AbortError')throw Error('The request timed out. Check your connection.');throw e;}finally{clearTimeout(timer);}
}
function store(){try{if(auth)sessionStorage.setItem(SESSION_KEY,JSON.stringify(auth));else sessionStorage.removeItem(SESSION_KEY);}catch{}}
function getStored(){try{const obj=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');if(obj?.access_token&&obj?.refresh_token&&obj?.user?.id&&Number.isFinite(obj.expiresAt))return obj;}catch{}return null;}
async function token(){if(!auth)throw Error('Sign in first.');if(Date.now()>auth.expiresAt-65000){const old=auth;const data=await req(SUPABASE+'/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:old.refresh_token}});if(!data.access_token||!data.user||data.user.id!==old.user.id){logout(false);throw Error('Your session expired. Sign in again.');}auth={access_token:data.access_token,refresh_token:data.refresh_token,expiresAt:Date.now()+(data.expires_in||3600)*1000,user:{id:data.user.id,email:data.user.email}};store();}return auth.access_token;}
async function pilot(path,{method='GET',body}={}){const bearer=await token();const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),22000);try{const r=await fetch(PILOT+path,{method,headers:{Authorization:'Bearer '+bearer,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:ctrl.signal});const data=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(data.error||'Pilot request rejected (HTTP '+r.status+').');e.code=r.status;throw e;}return data;}catch(e){if(e.name==='AbortError')throw Error('The pilot Worker did not respond.');throw e;}finally{clearTimeout(timer);}}
function show(what){for(const id of ['loading','login','activate','disabled','dashboard'])$(id).hidden=id!==what;$('who').textContent=auth?.user?.email||'Not signed in';}
async function loadProfile(){const data=await pilot('/api/v1/student/me');student=data.student;renderProfile();}
function renderProfile(){if(!student){show('login');return;}if(student.status==='pending_activation'){show('activate');status('activate-status','Your account is pending one-time verification.','info');return;}if(student.status!=='active'){show('disabled');return;}show('dashboard');$('stat-stage').textContent=stageText(student.stage);$('stat-group').textContent='Group '+student.group;$('account-email').textContent=student.email+' · Medicine · '+stageText(student.stage)+' · Group '+student.group;$('scope-note').textContent='Access authorised for Medicine '+stageText(student.stage)+', Group '+student.group+'. Other stages are not accessible through this pilot.';$('academic-title').textContent=stageText(student.stage)+' · Medicine';$('academic-description').textContent='Your academic stage is verified by the backend. Open Private PDF library to see test materials.';const el=$('academic-blocks');el.replaceChildren();const blocks=student.stage===2?[['IBS','Integrated Basic Sciences'],['MSD','Musculoskeletal System & Dermatology']]:[['Stage '+student.stage+' subjects','Academic content will be connected after the pilot']];for(const [a,b] of blocks){const card=document.createElement('div');card.className='academic-card';const box=document.createElement('div');const strong=document.createElement('strong');strong.textContent=a;const sm=document.createElement('small');sm.textContent=b+' · preview only';box.append(strong,sm);const state=document.createElement('span');state.className='badge';state.textContent='Preview';card.append(box,state);el.append(card);}tab(currentTab);}
function tab(which){currentTab=which;if(which==='library'&&student?.status==='active'&&!p9Blocks)loadP9Catalog();for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===which);for(const sec of document.querySelectorAll('[data-page]'))sec.hidden=sec.dataset.page!==which;}
function logout(revoke=true){cleanupBlobs();p9Blocks=null;p9Items=[];const previous=auth;auth=null;student=null;store();loadingSession=false;show('login');$('password').value='';$('activation-code').value='';status('login-status','');if(revoke&&previous?.access_token)req(SUPABASE+'/auth/v1/logout',{method:'POST',bearer:previous.access_token}).catch(()=>{});}
$('login-form').addEventListener('submit',async event=>{event.preventDefault();const b=$('login-button');b.disabled=true;b.textContent='Signing in…';status('login-status','');try{const result=await req(SUPABASE+'/auth/v1/token?grant_type=password',{method:'POST',body:{email:$('email').value.trim().toLowerCase(),password:$('password').value}});if(!result.access_token||!result.user?.id)throw Error('Unexpected Supabase sign-in response.');auth={access_token:result.access_token,refresh_token:result.refresh_token,expiresAt:Date.now()+(result.expires_in||3600)*1000,user:{id:result.user.id,email:result.user.email}};store();$('password').value='';await loadProfile();}catch(e){auth=null;student=null;store();status('login-status',e.message);show('login');}finally{b.disabled=false;b.textContent='Sign in to student pilot →';}});
$('activate-form').addEventListener('submit',async e=>{e.preventDefault();const b=$('activate-button');b.disabled=true;b.textContent='Activating…';status('activate-status','');try{const code=$('activation-code').value;const data=await pilot('/api/v1/student/activate',{method:'POST',body:{code}});student=data.student;$('activation-code').value='';renderProfile();status('main-status','Your test student account is now active.','success');}catch(err){status('activate-status',err.message);}finally{b.disabled=false;b.textContent='Activate my test account →';}});
$('change-form').addEventListener('submit',async e=>{e.preventDefault();const b=$('change-button'),current=$('current-password').value,next=$('new-password').value,confirm=$('confirm-password').value;if(next!==confirm)return status('change-status','New passwords do not match.');if(next.length<12)return status('change-status','Use at least 12 characters for your new password.');b.disabled=true;b.textContent='Updating…';try{await req(SUPABASE+'/auth/v1/token?grant_type=password',{method:'POST',body:{email:auth.user.email,password:current}});await req(SUPABASE+'/auth/v1/user',{method:'PUT',bearer:await token(),body:{password:next}});$('change-form').reset();status('change-status','Password changed in Supabase. Use your new password on future sign-ins.','success');}catch(err){status('change-status',err.message);}finally{b.disabled=false;b.textContent='Change my password';}});
$('check-other').addEventListener('click',async()=>{if(!student||student.status!=='active')return;const other=student.stage===1?2:1;try{await pilot('/api/v1/student/academic?stage='+other);status('check-status','Security check failed: other-stage request was allowed. Stop the rollout.');}catch(e){status('check-status',e.code===403?'Confirmed: the server returned HTTP 403 and blocked Stage '+other+'.':'Could not complete security check: '+e.message,e.code===403?'success':'error');}});
$('go-academic').addEventListener('click',()=>tab('library'));
for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',()=>tab(b.dataset.tab));
for(const id of ['top-signout','activation-signout','disabled-signout'])$(id).addEventListener('click',()=>logout());
$('show-password').addEventListener('click',()=>{const inp=$('password');inp.type=inp.type==='password'?'text':'password';$('show-password').textContent=inp.type==='password'?'Show':'Hide';});

const P9='https://hmu-student-library-test.eissaismail941.workers.dev';
let p9Blocks=null,p9Items=[],p9Next=null,p9LoadedBlock='',p9Busy=false,p9Blobs=[];
function cleanupBlobs(){for(const u of p9Blobs){try{URL.revokeObjectURL(u);}catch{}}p9Blobs=[];$('p9-ready').hidden=true;$('p9-ready').replaceChildren();}
async function p9Call(path,{pdf=false}={}){
 const bearer=await token(),ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),45000);
 try{const r=await fetch(P9+path,{headers:{Authorization:'Bearer '+bearer,Accept:pdf?'application/pdf':'application/json'},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:ctrl.signal});
 if(!r.ok){const d=await r.json().catch(()=>({}));const e=new Error(d.error||'Private library request failed (HTTP '+r.status+').');e.code=r.status;throw e;}return pdf?await r.blob():await r.json();}
 catch(e){if(e.name==='AbortError')throw Error('The private library timed out. Try again.');throw e;}
 finally{clearTimeout(timer);}
}
async function loadP9Catalog(){
 status('p9-status','');$('p9-files').textContent='Checking student permissions and test academic blocks…';
 try{const data=await p9Call('/p9/catalog');if(student?.status!=='active'||data.stage!==student.stage)throw Error('Your student stage changed. Refresh and sign in again.');
 p9Blocks=data.catalog||[];const select=$('p9-block');select.replaceChildren();
 for(const b of p9Blocks){const opt=document.createElement('option');opt.value=b.id;opt.textContent=b.name+(b.provisional?' · Test':'');select.append(opt)}
 select.disabled=!p9Blocks.length;$('p9-heading').textContent='Medicine · Stage '+student.stage+' · Group '+student.group;
 if(p9Blocks.length)await loadP9Files(false);else $('p9-files').textContent='No private test academic blocks have been configured for your stage.';
 }catch(e){p9Blocks=null;$('p9-files').replaceChildren();status('p9-status',e.message);}
}
async function loadP9Files(more=false){
 if(p9Busy||!student||student.status!=='active')return;
 const b=$('p9-block').value;if(!b)return;
 p9Busy=true;$('p9-refresh').disabled=true;$('p9-more').disabled=true;status('p9-status','');
 if(!more){p9Items=[];p9Next=null;p9LoadedBlock=b;$('p9-files').textContent='Loading PDF titles from your private test bucket…';}
 try{const params=new URLSearchParams({block:b});if(more&&p9Next)params.set('cursor',p9Next);
 const data=await p9Call('/p9/files?'+params);
 if(p9LoadedBlock!==b)return;
 p9Items.push(...data.files);p9Next=data.nextCursor||null;renderP9Files();
 }catch(e){status('p9-status',e.message);if(!more)$('p9-files').replaceChildren();}
 finally{p9Busy=false;$('p9-refresh').disabled=false;$('p9-more').disabled=false;}
}
function renderP9Files(){
 const q=$('p9-search').value.trim().toLowerCase(),files=p9Items.filter(x=>!q||(x.title+' '+x.subject+' '+x.kind).toLowerCase().includes(q));
 const root=$('p9-files');root.replaceChildren();$('p9-count').textContent=files.length+' test PDF'+(files.length===1?'':'s');
 $('p9-more').hidden=!p9Next;
 if(!files.length){const e=document.createElement('div');e.className='p9-empty';e.textContent=q?'No matching test PDFs.':'No test PDFs in this block yet. Upload one through your existing Phase 6/8 Admin Academic Library.';root.append(e);return;}
 for(const f of files){
 const card=document.createElement('article');card.className='p9-file';
 const info=document.createElement('div');const h=document.createElement('div');h.className='p9-file-title';h.textContent=f.title;const meta=document.createElement('div');meta.className='p9-file-meta';meta.textContent=f.subject+' · '+f.kind+' · '+(f.size/1024/1024).toFixed(2)+' MB';info.append(h,meta);
 const actions=document.createElement('div');actions.className='p9-file-actions';
 const open=document.createElement('button');open.type='button';open.className='button primary';open.textContent='Open PDF';open.addEventListener('click',()=>openP9Pdf(f,false));
 const down=document.createElement('button');down.type='button';down.className='button';down.textContent='Download';down.addEventListener('click',()=>openP9Pdf(f,true));
 actions.append(open,down);card.append(info,actions);root.append(card);
 }
}
async function openP9Pdf(f,download){
 // Open a pending tab synchronously when possible; mobile popup blockers may prevent it.
 let pending=null;
 if(!download){try{pending=window.open('about:blank','_blank');if(pending){pending.opener=null;pending.document.body.textContent='Opening your authorized test PDF…';}}catch{}}
 status('p9-status','Opening '+f.title+'…','info');
 try{const blob=await p9Call('/p9/file?key='+encodeURIComponent(f.key),{pdf:true});
 if(blob.type!=='application/pdf')throw Error('Unexpected PDF response.');
 const u=URL.createObjectURL(blob);p9Blobs.push(u);
 if(download){const a=document.createElement('a');a.href=u;a.download=(f.filename||f.title+'.pdf').replace(/[^a-z0-9._ -]/gi,'_').slice(0,110);document.body.append(a);a.click();a.remove();status('p9-status','Download started for '+f.title+'.','success');}
 else {if(pending&&!pending.closed){pending.location.replace(u);status('p9-status','PDF opened in a new tab.','success');}
 else {const ready=$('p9-ready');ready.replaceChildren();const label=document.createElement('span');label.textContent='Your PDF is ready. ';const a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Tap here to open it';ready.append(label,a);ready.hidden=false;status('p9-status','Tap the link below to open the PDF.','info');}}
 }catch(e){if(pending&&!pending.closed)pending.close();status('p9-status',e.message);}
}
$('p9-block').addEventListener('change',()=>loadP9Files(false));
$('p9-search').addEventListener('input',()=>renderP9Files());
$('p9-refresh').addEventListener('click',()=>loadP9Files(false));
$('p9-more').addEventListener('click',()=>{if(p9Next)loadP9Files(true)});

async function restore(){if(restoring)return;restoring=true;show('loading');try{const saved=getStored();if(!saved){loadingSession=false;show('login');return;}auth=saved;await token();const user=await req(SUPABASE+'/auth/v1/user',{bearer:await token()});if(user.id!==auth.user.id)throw Error('Student session identity changed.');await loadProfile();}catch(e){logout(false);status('login-status','Please sign in again. The previous pilot session could not be verified.','info');}finally{restoring=false;loadingSession=false;}}
restore();
})();

/* HMU Phase 11 — Exact original visual layout, verified pilot student access.
 * Presentation: directly sourced from the user's HMU-Student-Portal-Keyboard-Fixed.html.
 * All PDF data: ONLY from the protected Phase 9 test Worker.
 * No live MedHub JS, public lectures, privileged secret, stage-change or backend writes.
 */
(()=>{'use strict';
const SUPABASE='https://lxmxsymxmpulkkngjfjo.supabase.co';
const PUBLIC_KEY='sb_publishable_-7LnL-kzS1omjDFD5va_0A_Tjdh3m8h'; // Public browser key (not secret)
const PILOT='https://hmu-student-pilot-test.eissaismail941.workers.dev';
const LIBRARY='https://hmu-student-library-test.eissaismail941.workers.dev';
const SESSION_KEY='hmu-phase11-exact-style-test-session';
const PAGE={login:'hmu-welcome-page',activate:'hmu-activation-page',disabled:'hmu-disabled-page',college:'mh-college-chooser-page',stage:'mh-stage-chooser-page',blocks:'stage2-page',subjects:'s2block-page',resources:'resources-page'};
const $=id=>document.getElementById(id);
let auth=null,student=null,view='login',catalog=null,selectedBlock=null,selectedSubject=null,files=[],nextCursor=null,filesBusy=false,blobUrls=[];
const icons={Anatomy:'🫀',Physiology:'🫁',Microbiology:'🧫',Genetics:'🧬',Radiology:'🩻',Pathology:'🔬',Pharmacology:'💊',Biochemistry:'⚗️',Histology:'🔬',Embryology:'🧬',Dermatology:'🧴','Medical Education':'📘',Terminology:'📖',Computer:'💻','Communication Skill':'🗣️'};
function notify(msg,kind='neutral'){
 const el=$('exact-status-bar');el.textContent=msg||'';el.hidden=!msg;
 if(msg){el.style.borderColor=kind==='error'?'#e7bbbb':kind==='success'?'#c8e7d8':'#dce7f1';}
}
function status(id,msg){const e=$(id);if(e)e.textContent=msg||'';}
function dateStr(s){if(!s)return '';const d=new Date(s);return isNaN(d.getTime())?'':d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
function reveal(next,{push=true}={}){
 if(!PAGE[next])return;
 for(const [name,id] of Object.entries(PAGE))$(id)?.classList.toggle('exact-visible',name===next);
 view=next;document.body.dataset.exactView=next;
 document.body.dataset.mhView=({login:'welcome',activate:'welcome',disabled:'welcome',college:'colleges',stage:'stage-select',blocks:'stage2',subjects:'s2block',resources:'res'})[next];
 document.querySelectorAll('.mh3-menu-panel,.hmu7-menu-panel').forEach(n=>n.hidden=true);
 document.querySelectorAll('.mh3-menu-trigger,#hmu-menu-toggle').forEach(n=>n.setAttribute('aria-expanded','false'));
 window.scrollTo({top:0,behavior:'instant'});
 if(push && next!=='login')history.pushState({hmuExact:next},'',location.pathname+location.search+'#'+next);
}
function stored(){try{const a=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');return a?.access_token&&a?.refresh_token&&a?.user?.id&&Number.isFinite(a.expiresAt)?a:null;}catch{return null;}}
function save(){try{auth?sessionStorage.setItem(SESSION_KEY,JSON.stringify(auth)):sessionStorage.removeItem(SESSION_KEY);}catch{}}
async function request(url,{method='GET',body,bearer,responseType='json',timeoutMs=24000}={}){
 const abort=new AbortController(),clock=setTimeout(()=>abort.abort(),timeoutMs);
 try{
   const r=await fetch(url,{method,headers:{apikey:PUBLIC_KEY,Accept:responseType==='pdf'?'application/pdf':'application/json',...(body!==undefined?{'Content-Type':'application/json'}:{}),...(bearer?{Authorization:'Bearer '+bearer}:{})},body:body!==undefined?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:abort.signal});
   if(!r.ok){const d=await r.json().catch(()=>({}));const e=new Error(d.error||d.message||'Request rejected (HTTP '+r.status+').');e.status=r.status;throw e;}
   return responseType==='pdf'?r.blob():r.json();
 }catch(e){if(e.name==='AbortError')throw new Error('The server did not respond. Please retry.');throw e;}finally{clearTimeout(clock);}
}
async function token(){
 if(!auth)throw new Error('Please sign in first.');
 if(Date.now()>auth.expiresAt-65000){
  const old=auth;
  const r=await request(SUPABASE+'/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:old.refresh_token}});
  if(!r.access_token||!r.user?.id||r.user.id!==old.user.id){clearAuth();throw new Error('Your session has expired. Please sign in again.');}
  auth={access_token:r.access_token,refresh_token:r.refresh_token,expiresAt:Date.now()+(r.expires_in||3600)*1000,user:{id:r.user.id,email:r.user.email}};save();
 }
 return auth.access_token;
}
async function secure(path,{pdf=false}={}){
 // A fresh authenticated bearer token is required for EVERY protected request.
 const t=await token();return request(LIBRARY+path,{bearer:t,responseType:pdf?'pdf':'json',timeoutMs:45000});
}
async function pilot(path,opts={}){const t=await token();return request(PILOT+path,{...opts,bearer:t});}
function clearUrls(){for(const u of blobUrls)try{URL.revokeObjectURL(u)}catch{}blobUrls=[];}
function clearAuth(){clearUrls();auth=null;student=null;catalog=null;selectedBlock=null;selectedSubject=null;files=[];nextCursor=null;save();}
function logout(){const bearer=auth?.access_token;clearAuth();status('hmu-signin-status','');reveal('login',{push:false});history.replaceState({hmuExact:'login'},'',location.pathname+location.search);if(bearer)request(SUPABASE+'/auth/v1/logout',{method:'POST',bearer}).catch(()=>{});}
async function loadProfile(){
 const {student:s}=await pilot('/api/v1/student/me');
 if(!s||!Number.isInteger(s.stage)||s.college!=='medicine')throw new Error('This account has no authorized Medicine pilot assignment.');
 student=s;catalog=null;
 if(s.status==='pending_activation'){reveal('activate',{push:false});return;}
 if(s.status!=='active'){reveal('disabled',{push:false});return;}
 renderCollege();reveal('college',{push:false});
}
function renderCollege(){
 const choices=document.querySelectorAll('#mh-college-chooser-page .mh-col-choice');
 for(const c of choices){const allow=c.dataset.college==='medicine';c.classList.toggle('exact-unassigned',!allow);c.setAttribute('aria-pressed',String(allow));c.setAttribute('aria-disabled',String(!allow));c.disabled=!allow;}
 $('exact-college-note').textContent='College of Medicine · Stage '+student.stage+' · Group '+student.group+'. The other colleges are not assigned to this account.';
 $('mh-col-continue').disabled=false;
}
function renderStages(){
 $('mh-stage-college').textContent='College of Medicine';
 const grid=$('mh-stage-grid');grid.replaceChildren();
 for(let n=1;n<=6;n++){
  const el=document.createElement('button');el.type='button';el.className='mh-stage-choice'+(student.stage!==n?' exact-unassigned':'');el.dataset.stage=String(n);el.setAttribute('aria-pressed',String(n===student.stage));el.setAttribute('aria-disabled',String(n!==student.stage));el.disabled=n!==student.stage;
  const label=document.createElement('span');label.textContent='Stage '+n;
  const check=document.createElement('span');check.className='mh-stage-check';check.setAttribute('aria-hidden','true');check.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>';
  el.append(label,check);grid.append(el);
 }
 $('mh-stage-continue').disabled=false;
}
async function renderBlocks(){
 notify('');
 const target=$('s2-grid');target.replaceChildren();
 blocksTitle();
 $('exact-block-note').textContent='Loading your assigned stage’s academic blocks…';
 try{
  const data=await secure('/p9/catalog');
  if(!student||data.stage!==student.stage||data.college!=='medicine')throw new Error('Your stage assignment has changed. Sign in again.');
  catalog=data.catalog||[];
  $('exact-block-note').textContent='College of Medicine · Stage '+student.stage+' · Group '+student.group+'. Your files are checked by the server every time they open.';
  if(!catalog.length){target.append(makeEmpty('No test blocks are available for this stage.'));return;}
  for(const [i,bl] of catalog.entries()){
   const card=document.createElement('button');card.type='button';card.className='block-card'+(i%2?' purple':'');
   const kicker=document.createElement('div');kicker.className='block-kicker';kicker.textContent='Block '+String(i+1).padStart(2,'0');
   const title=document.createElement('h3');title.textContent=bl.name;
   const desc=document.createElement('p');desc.textContent=bl.provisional?'Test grouping · No production lectures': 'Lectures and academic materials organized by subject.';
   const meta=document.createElement('div');meta.className='block-meta';
   const pill=document.createElement('span');pill.className='block-pill';pill.textContent=bl.subjects.length+' Subjects';meta.append(pill);
   card.append(kicker,title,desc,meta);card.addEventListener('click',()=>{selectedBlock=bl;renderSubjects();reveal('subjects');});target.append(card);
  }
 }catch(e){$('exact-block-note').textContent='Unable to load private academic blocks.';notify(e.message,'error');}
}
function blocksTitle(){const h=$('stage2-page').querySelector('.block-title h2');if(h)h.textContent='Stage '+student.stage+' · Academic blocks';}
function makeEmpty(msg){const e=document.createElement('div');e.className='exact-resource-empty';e.textContent=msg;return e;}
function renderSubjects(){
 if(!selectedBlock)return;
 $('s2block-title').textContent='Stage '+student.stage+' · '+selectedBlock.name;
 $('s2block-sub').textContent='Choose a subject';
 const body=$('s2block-body');body.replaceChildren();
 const wrap=document.createElement('div');wrap.className='group-section';const grid=document.createElement('div');grid.className='subject-grid';
 for(const [i,name] of selectedBlock.subjects.entries()){
  const card=document.createElement('button');card.type='button';card.className='subject-card bbb-card';card.style.animationDelay=(.05+i*.03).toFixed(2)+'s';
  const icon=document.createElement('div');icon.className='card-icon';icon.textContent=icons[name]||'📚';
  const label=document.createElement('div');label.className='card-name';label.textContent=name;
  const chip=document.createElement('div');chip.className='card-chip bbb';chip.textContent='PDF Files';
  card.append(icon,label,chip);card.addEventListener('click',()=>{selectedSubject=name;files=[];nextCursor=null;reveal('resources');loadFiles(false);});grid.append(card);
 }
 wrap.append(grid);body.append(wrap);
}
function renderFileCards(){
 const grid=$('resource-grid');grid.replaceChildren();
 const filtered=files.filter(f=>f.subject===selectedSubject).sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true}));
 $('resources-count').textContent=filtered.length+' '+(filtered.length===1?'file':'files');
 if(!filtered.length)grid.append(makeEmpty('No test PDF has been uploaded for this subject yet.'));
 filtered.forEach((f,i)=>{
  const card=document.createElement('article');card.className='resource-card';
  const icon=document.createElement('div');icon.className='resource-icon';icon.textContent='📄';
  const num=document.createElement('div');num.className='resource-index';num.textContent='PDF '+String(i+1).padStart(2,'0');
  const title=document.createElement('h3');title.textContent=f.title;
  const detail=document.createElement('p');detail.textContent=f.subject+' · '+f.kind+' · '+(f.size/1024/1024).toFixed(2)+' MB';
  const metadata=document.createElement('div');metadata.className='mh-lecture-meta';metadata.textContent=dateStr(f.uploaded)||'Test lecture';
  const actions=document.createElement('div');actions.className='resource-actions';
  const open=document.createElement('button');open.type='button';open.className='btn-link btn-open';open.textContent='Open PDF';open.addEventListener('click',()=>openPdf(f,false));
  const down=document.createElement('button');down.type='button';down.className='btn-link btn-download';down.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 17v3h14v-3"/></svg><span>Download</span>';
  down.addEventListener('click',()=>openPdf(f,true));actions.append(open,down);card.append(icon,num,title,detail,metadata,actions);grid.append(card);
 });
 const more=$('exact-resource-more');more.replaceChildren();
 if(nextCursor){const b=document.createElement('button');b.textContent='Load more test PDFs';b.addEventListener('click',()=>loadFiles(true));more.append(b);}
}
async function loadFiles(more){
 if(filesBusy||!student||!selectedBlock)return;
 filesBusy=true;
 const el=$('exact-resource-status');el.hidden=false;el.textContent='Loading protected test PDFs…';
 if(!more){files=[];nextCursor=null;}
 try{
  const u=new URLSearchParams({block:selectedBlock.id});if(more&&nextCursor)u.set('cursor',nextCursor);
  const data=await secure('/p9/files?'+u.toString());
  if(data.stage!==student.stage||data.block!==selectedBlock.id)throw new Error('The server returned an unexpected academic stage.');
  files.push(...(data.files||[]));nextCursor=data.nextCursor||null;
  $('resources-title').textContent=selectedSubject;
  renderFileCards();
  el.hidden=true;el.textContent='';
 }catch(e){el.textContent=e.message;notify(e.message,'error');if(!more)renderFileCards();}
 finally{filesBusy=false;}
}
async function openPdf(f,download){
 // No public / presigned file URL is supplied: each call fetches authenticated PDF bytes.
 let pending=null;
 if(!download){try{pending=window.open('about:blank','_blank');if(pending){pending.opener=null;pending.document.body.textContent='Opening private PDF…';}}catch{}}
 notify('Checking your private PDF permissions…');
 try{
  const blob=await secure('/p9/file?key='+encodeURIComponent(f.key),{pdf:true});
  if(blob.type!=='application/pdf')throw new Error('Unexpected PDF response.');
  const u=URL.createObjectURL(blob);blobUrls.push(u);
  if(download){
   const a=document.createElement('a');a.href=u;a.download=(f.filename||f.title+'.pdf').replace(/[^\w. -]/g,'_').slice(0,100);document.body.append(a);a.click();a.remove();notify('Download started.','success');
  }else if(pending&&!pending.closed){pending.location.replace(u);notify('PDF opened in a new tab.','success');}
  else{const a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Tap here to open the PDF';$('exact-resource-status').replaceChildren(a);$('exact-resource-status').hidden=false;notify('PDF ready. Use the Open link below.','success');}
 }catch(e){if(pending&&!pending.closed)pending.close();notify(e.message,'error');}
}
// Original HMU header / footer / card events are rebound to secured Phase 11 state.
$('hmu-signin-form').addEventListener('submit',async e=>{
 e.preventDefault();const btn=$('hmu-signin-submit');btn.disabled=true;status('hmu-signin-status','');
 try{
  const email=$('hmu-signin-email').value.trim().toLowerCase(),password=$('hmu-signin-password').value;
  const r=await request(SUPABASE+'/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
  if(!r.access_token||!r.user?.id)throw new Error('Unexpected sign-in response.');
  auth={access_token:r.access_token,refresh_token:r.refresh_token,expiresAt:Date.now()+(r.expires_in||3600)*1000,user:{id:r.user.id,email:r.user.email}};
  save();$('hmu-signin-password').value='';await loadProfile();
 }catch(err){clearAuth();status('hmu-signin-status',err.message);reveal('login',{push:false});}finally{btn.disabled=false;}
});
$('exact-activate-form').addEventListener('submit',async e=>{
 e.preventDefault();const btn=$('exact-activate-submit');btn.disabled=true;status('exact-activation-status','');
 try{const r=await pilot('/api/v1/student/activate',{method:'POST',body:{code:$('exact-activation-code').value}});student=r.student;
 $('exact-activation-code').value='';if(student?.status!=='active')throw new Error('Activation did not complete.');renderCollege();reveal('college');notify('Your student account was activated.','success');
 }catch(err){status('exact-activation-status',err.message);}finally{btn.disabled=false;}
});
$('hmu-toggle-password').addEventListener('click',()=>{const x=$('hmu-signin-password');x.type=x.type==='password'?'text':'password';$('hmu-toggle-password').textContent=x.type==='password'?'Show':'Hide';});
$('hmu-forgot-password').addEventListener('click',()=>status('hmu-signin-status','For this two-account pilot, contact the Super Admin to reset your test password.'));
$('mh-col-continue').addEventListener('click',()=>{if(!student)return;renderStages();reveal('stage');});
$('mh-stage-continue').addEventListener('click',()=>{if(!student)return;reveal('blocks');renderBlocks();});
for(const id of ['exact-activate-signout','exact-disabled-signout'])$(id).addEventListener('click',logout);
document.querySelectorAll('.mh-compact-back').forEach(b=>b.addEventListener('click',()=>{const prev={blocks:'stage',subjects:'blocks',resources:'subjects'}[view];if(prev)reveal(prev);}));
for(const btn of document.querySelectorAll('.mh-stage-back'))btn.addEventListener('click',()=>reveal('college'));
document.querySelectorAll('.mh3-menu-trigger').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();const panel=document.getElementById(btn.getAttribute('aria-controls'));const next=panel.hidden;document.querySelectorAll('.mh3-menu-panel').forEach(n=>n.hidden=true);panel.hidden=!next;btn.setAttribute('aria-expanded',String(next));}));
$('hmu-menu-toggle')?.addEventListener('click',e=>{e.stopPropagation();const panel=$('hmu-menu-panel');panel.hidden=!panel.hidden;$('hmu-menu-toggle').setAttribute('aria-expanded',String(!panel.hidden));});
document.addEventListener('click',e=>{if(!e.target.closest('.mh3-menu-wrap,.hmu7-menu-wrap')){document.querySelectorAll('.mh3-menu-panel,.hmu7-menu-panel').forEach(n=>n.hidden=true);document.querySelectorAll('.mh3-menu-trigger,#hmu-menu-toggle').forEach(n=>n.setAttribute('aria-expanded','false'));}});
document.querySelectorAll('[data-mh3-action]').forEach(b=>b.addEventListener('click',()=>{const action=b.dataset.mh3Action;if(action==='signout')logout();else if(action==='dashboard'){if(student)reveal('college');}else if(action==='about'){notify('This is the Phase 11 exact-style test. Account data and PDFs come only from the protected pilot.');}}));
$('hmu-menu-focus')?.addEventListener('click',()=>{$('hmu-signin-email').focus();$('hmu-menu-panel').hidden=true;});
$('hmu-menu-help')?.addEventListener('click',()=>notify('For access or support, contact the HMU test administrator.'));
// Keep Android/Samsung browser navigation predictable within the test page.
window.addEventListener('popstate',e=>{const next=e.state?.hmuExact;if(next&&PAGE[next]&&((next==='login')||student?.status==='active'))reveal(next,{push:false});else if(student?.status==='active')reveal('college',{push:false});else reveal('login',{push:false});});
window.addEventListener('pagehide',clearUrls);
async function start(){
 reveal('login',{push:false});
 try{
  const saved=stored();if(!saved)return;
  auth=saved;
  const t=await token();const u=await request(SUPABASE+'/auth/v1/user',{bearer:t});
  if(u.id!==auth.user.id)throw new Error('Session identity mismatch.');
  await loadProfile();
 }catch(e){clearAuth();reveal('login',{push:false});status('hmu-signin-status','Please sign in again to your test student account.');}
 finally{document.body.dataset.exactReady='true';$('exact-startup').hidden=true;}
}
start();
})();

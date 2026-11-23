/* HMU Academic Portal · Phase 12 isolated test
   EXACT visual assets from the user's uploaded HTML and MedHub-style cards.
   Supabase Auth + verified admin assignments / Phase 8 student profiles.
   Admin library: authenticated Phase 6 sandbox Worker; Student library: Phase 9 protected Worker.
   No production MedHub modifications, no secret keys, no direct public PDF links. */
(()=>{'use strict';
const URL_SUPA='https://lxmxsymxmpulkkngjfjo.supabase.co';
const PUBLIC_KEY='sb_publishable_-7LnL-kzS1omjDFD5va_0A_Tjdh3m8h';
const PILOT='https://hmu-student-pilot-test.eissaismail941.workers.dev';
const P9='https://hmu-student-library-test.eissaismail941.workers.dev';
const ADMIN_R2='https://medhub-admin-r2-test.eissaismail941.workers.dev';
const ADMIN_SESSION='hmu-r2-phase5-session-v1'; // Working Phase 10 admin session format
const STUDENT_SESSION='hmu-phase8-student-pilot-session'; // Working Phase 10 student session format
const PAGE={login:'hmu-welcome-page',activate:'hmu-activate-page',disabled:'hmu-disabled-page',blocks:'stage2-page',subjects:'s2block-page',resources:'resources-page'};
const $=id=>document.getElementById(id);
const ICON={Anatomy:'🫀',Physiology:'🧠',Microbiology:'🦠',Genetics:'🧬',Radiology:'🩻',Pathology:'🔬',Pharmacology:'💊',Biochemistry:'🧪',Histology:'🔭',Embryology:'👶',Dermatology:'🧴','Medical Education':'🎓',Terminology:'📖',Computer:'💻','Communication Skill':'🗣️','Micro-Immunity':'🛡️','Clinical Placement':'🏥','Clinical Scenario':'📋'};
let auth=null,profile=null,mode=null,view='login',catalog=[],block=null,subject='',files=[],cursor=null,busy=false,sessionBusy=false,objectUrls=[],version=0;
function notice(msg){let n=$('hmu-notice');n.textContent=msg||'';n.hidden=!msg;}
function fieldStatus(id,msg,info=false){const n=$(id);if(!n)return;n.textContent=msg||'';n.classList.toggle('is-visible',!!msg);n.classList.toggle('hmu-info',info);}
function show(next,{push=false}={}){
 if(!PAGE[next])return;
 if(!['login','activate','disabled'].includes(next)&&!profile)return;
 view=next;
 for(const [name,id] of Object.entries(PAGE))$(id)?.classList.toggle('current',name===next);
 document.querySelectorAll('.hmu7-menu-panel,.mh3-menu-panel').forEach(n=>n.hidden=true);
 document.querySelectorAll('#hmu-menu-toggle,.mh3-menu-trigger').forEach(n=>n.setAttribute('aria-expanded','false'));
 if(push){try{history.pushState({hmuPhase12:next},'',location.pathname+location.search+'#'+next);}catch{/* Local HTML previews may disallow history state. */}}
 window.scrollTo({top:0,behavior:'instant'});
}
function save(role){
 try{
  const obj={access_token:auth.access_token,refresh_token:auth.refresh_token,expiresAt:auth.expiresAt,user:auth.user};
  const target=role==='admin'?ADMIN_SESSION:STUDENT_SESSION;
  sessionStorage.setItem(target,JSON.stringify(obj));
  sessionStorage.removeItem(role==='admin'?STUDENT_SESSION:ADMIN_SESSION);
 }catch(e){throw Error('Your browser blocked session storage. Enable it for this test site.');}
}
function stored(){
 for(const type of ['admin','student']){
  const key=type==='admin'?ADMIN_SESSION:STUDENT_SESSION;
  try{
   const obj=JSON.parse(sessionStorage.getItem(key)||'null');
   if(obj?.access_token&&obj?.refresh_token&&obj?.user?.id&&Number.isFinite(obj.expiresAt))return {obj,type};
  }catch{}
 }
 return null;
}
function clearSession(){try{sessionStorage.removeItem(ADMIN_SESSION);sessionStorage.removeItem(STUDENT_SESSION);}catch{}}
function clearBlobs(){for(const u of objectUrls)try{URL.revokeObjectURL(u)}catch{}objectUrls=[];}
function clearState(){clearBlobs();auth=null;profile=null;mode=null;catalog=[];block=null;subject='';files=[];cursor=null;clearSession();}
async function api(url,{method='GET',body,token:bearer,pdf=false,timeout=23000}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 const supa=url.startsWith(URL_SUPA+'/');
 const headers={Accept:pdf?'application/pdf':'application/json',...(supa?{apikey:PUBLIC_KEY}:{}),...(bearer?{Authorization:'Bearer '+bearer}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})};
 try{
  const r=await fetch(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
  if(!r.ok){const d=await r.json().catch(()=>({}));const e=new Error(d.error_description||d.msg||d.error||d.message||'Request rejected (HTTP '+r.status+').');e.status=r.status;throw e;}
  return pdf?await r.blob():await r.json();
 }catch(e){if(e.name==='AbortError')throw Error('The server did not respond in time. Try again.');throw e;}finally{clearTimeout(timer);}
}
async function token(){
 if(!auth)throw Error('Please sign in first.');
 if(Date.now()>auth.expiresAt-65000){
  const r=await api(URL_SUPA+'/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:auth.refresh_token}});
  if(!r.access_token||!r.refresh_token||r.user?.id!==auth.user.id){clearState();throw Error('Session expired. Please sign in again.');}
  auth={access_token:r.access_token,refresh_token:r.refresh_token,expiresAt:Date.now()+(r.expires_in||3600)*1000,user:{id:r.user.id,email:r.user.email}};
  save(mode==='stage_admin'?'admin':'student');
 }
 return auth.access_token;
}
async function getGrants(){
 const id=auth.user.id;
 const rows=await api(URL_SUPA+'/rest/v1/admin_assignments?select=role,college,stage,is_active&user_id=eq.'+encodeURIComponent(id),{token:await token()});
 if(!Array.isArray(rows))throw Error('Administrator permission check returned invalid data.');
 return rows.filter(g=>g&&g.is_active===true);
}
function isSuper(g){return g.role==='super_admin'&&g.college==null&&g.stage==null;}
function isStageAdmin(g){return g.college==='medicine'&&['stage_admin','content_admin'].includes(g.role)&&Number.isInteger(Number(g.stage))&&Number(g.stage)>=1&&Number(g.stage)<=6;}
function isCollegeAdmin(g){return g.college==='medicine'&&g.role==='college_admin';}
function getValidStage(s){const n=Number(s);return Number.isInteger(n)&&n>=1&&n<=6?n:null;}
async function identify({restore=false}={}){
 let grants=[],grantsFailure=null;
 try{grants=await getGrants();}catch(e){grantsFailure=e;}
 if(grants.some(isSuper)||grants.some(isCollegeAdmin)){
  mode='stage_admin';save('admin');
  location.replace('admin.html');return;
 }
 const stageGrant=grants.find(isStageAdmin);
 if(stageGrant){
  mode='stage_admin';profile={stage:Number(stageGrant.stage),college:'medicine',role:stageGrant.role,email:auth.user.email,group:null};
  save('admin');
  await enterAcademic();return;
 }
 // A failing admin permissions check does not let anyone claim an admin role.
 // Verify student role exclusively with the protected Phase 8 Worker.
 let studentResponse=null,studentFailure=null;
 try{studentResponse=await api(PILOT+'/api/v1/student/me',{token:await token()});}catch(e){studentFailure=e;}
 const s=studentResponse?.student;
 if(s&&getValidStage(s.stage)&&String(s.college||'medicine').toLowerCase()==='medicine'){
  mode='student';profile={...s,stage:Number(s.stage),college:'medicine'};
  save('student');
  if(s.status==='pending_activation'){show('activate');return;}
  if(s.status!=='active'){show('disabled');return;}
  await enterAcademic();return;
 }
 clearState();
 const reason=grantsFailure&&!studentResponse?'Account signed in, but permission verification failed. Check your connection or use the original Phase 10 login.':studentFailure&&!grants.length?'Your account has no accessible student or admin stage assignment.': 'This account has no active Stage or Super Admin permission.';
 show('login');fieldStatus('hmu-signin-status',reason);
}
async function enterAcademic(){
 if(!profile)return;
 const stage=profile.stage;
 $('stage2-page').querySelector('.block-title h2').textContent='Stage '+stage;
 const role=mode==='student'?'Student · Group '+profile.group:(profile.role==='stage_admin'?'Stage Administrator':'Content Administrator');
 $('hmu-profile-scope').textContent='College of Medicine  /  Stage '+stage+'  /  '+role;
 for(const shortcut of document.querySelectorAll('.hmu-admin-shortcut'))shortcut.hidden=mode!=='stage_admin';
 show('blocks');await loadCatalog();
}
async function privateCall(path,{pdf=false}={}){
 const url=(mode==='student'?P9:ADMIN_R2)+path;
 return api(url,{token:await token(),pdf,timeout:45000});
}
async function loadCatalog(){
 const root=$('s2-grid');root.replaceChildren();catalog=[];block=null;subject='';files=[];cursor=null;
 $('hmu-stage-caption').textContent='Loading your academic blocks…';
 try{
  let entries;
  if(mode==='student'){
   const result=await privateCall('/p9/catalog');
   if(Number(result.stage)!==profile.stage||String(result.college||'medicine').toLowerCase()!=='medicine')throw Error('The verified student stage does not match the library.');
   entries=result.catalog||[];
  }else{
   const result=await privateCall('/v6/catalog');
   if(!result.ok||!result.catalog)throw Error('Administrator catalog is unavailable.');
   entries=result.catalog[String(profile.stage)]||[];
  }
  if(!Array.isArray(entries))throw Error('The academic catalog is not valid.');
  catalog=entries.filter(e=>e&&typeof e.id==='string'&&Array.isArray(e.subjects));
  $('hmu-stage-caption').textContent=mode==='student'? 'Your Stage '+profile.stage+' blocks. Protected PDF access is verified by the server.':'Your Stage '+profile.stage+' blocks. Academic management is also available in Administration.';
  if(!catalog.length){root.append(empty('No test academic blocks have been configured for this stage.'));return;}
  for(const [i,b] of catalog.entries()){
   const card=document.createElement('button');card.type='button';card.className='block-card '+(i%3===1?'purple':'acc');
   const k=document.createElement('div');k.className='block-kicker';k.textContent='Block '+String(i+1).padStart(2,'0');
   const h=document.createElement('h3');h.textContent=b.code||b.name;
   const p=document.createElement('p');p.textContent=b.name===h.textContent?(b.provisional?'Test grouping · Pilot environment':'Academic resources organized by subject'):b.name;
   const meta=document.createElement('div');meta.className='block-meta';const pill=document.createElement('span');pill.className='block-pill';pill.textContent=b.subjects.length+' Subjects';meta.append(pill);
   if(b.provisional){const flag=document.createElement('span');flag.className='block-pill';flag.textContent='Pilot';meta.append(flag);}
   card.append(k,h,p,meta);card.addEventListener('click',()=>{block=b;renderSubjects();show('subjects',{push:true});});root.append(card);
  }
 }catch(e){$('hmu-stage-caption').textContent='Could not load your private test academic blocks.';root.append(empty(e.message));}
}
function empty(msg){const d=document.createElement('div');d.className='hmu-empty';d.textContent=msg;return d;}
function renderSubjects(){
 if(!block)return;
 $('s2block-title').textContent='Stage '+profile.stage+' · '+(block.code||block.name);
 $('s2block-sub').textContent=block.name===block.code?'Choose a subject':block.name;
 const body=$('s2block-body');body.replaceChildren();
 if(!block.subjects?.length){body.append(empty('No subjects have been configured for this test block.'));return;}
 const group=document.createElement('div');group.className='group-section';const grid=document.createElement('div');grid.className='subject-grid';
 for(const [i,name] of block.subjects.entries()){
  const card=document.createElement('button');card.type='button';card.className='subject-card '+(i%3===0?'hdsf-card':'bbb-card');card.style.animationDelay=(0.03+i*.035).toFixed(2)+'s';
  const ico=document.createElement('div');ico.className='card-icon';ico.textContent=ICON[name]||'📚';
  const title=document.createElement('div');title.className='card-name';title.textContent=name;
  const tag=document.createElement('div');tag.className='card-chip '+(i%3===0?'hdsf':'bbb');tag.textContent='PDF Files';
  card.append(ico,title,tag);card.addEventListener('click',()=>{subject=name;files=[];cursor=null;$('resources-title').textContent=name;show('resources',{push:true});loadFiles(false);});grid.append(card);
 }
 group.append(grid);body.append(group);
}
async function loadFiles(more){
 if(busy||!profile||!block||!subject)return;
 busy=true;const sequence=++version;
 const note=$('hmu-file-status');note.textContent='Loading protected test lectures…';note.hidden=false;
 if(!more){files=[];cursor=null;$('resource-grid').replaceChildren();}
 try{
  let path;
  if(mode==='student'){
   path='/p9/files?'+new URLSearchParams({block:block.id,...(more&&cursor?{cursor}:{})});
  }else{
   path='/v6/files?'+new URLSearchParams({stage:String(profile.stage),block:block.id,...(more&&cursor?{cursor}:{})});
  }
  const res=await privateCall(path);
  if(sequence!==version||!profile||!block)return;
  if(mode==='student'&&(Number(res.stage)!==profile.stage||res.block!==block.id))throw Error('Private library scope did not match your student profile.');
  files.push(...(res.files||[]));cursor=res.nextCursor||null;renderFiles();note.hidden=true;
 }catch(e){note.textContent=e.message;renderFiles();}
 finally{busy=false;}
}
function renderFiles(){
 const grid=$('resource-grid');grid.replaceChildren();
 const shown=files.filter(f=>f.subject===subject).sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),undefined,{numeric:true}));
 $('resources-count').textContent=shown.length+' '+(shown.length===1?'file':'files');
 if(!shown.length)grid.append(empty('No private test PDFs in this subject yet. Live MedHub lectures have not been imported.'));
 for(const [i,f] of shown.entries()){
  const card=document.createElement('article');card.className='resource-card';
  const symbol=document.createElement('div');symbol.className='resource-icon';symbol.textContent='📄';
  const number=document.createElement('div');number.className='resource-index';number.textContent='PDF '+String(i+1).padStart(2,'0');
  const title=document.createElement('h3');title.textContent=f.title||f.filename||'Untitled PDF';
  const desc=document.createElement('p');desc.textContent=(f.kind||'Lecture')+' · '+(Number(f.size||0)/1048576).toFixed(2)+' MB';
  const actions=document.createElement('div');actions.className='resource-actions';
  const open=document.createElement('button');open.type='button';open.className='btn-link btn-open';open.textContent='Open PDF';open.addEventListener('click',()=>pdf(f,false));
  const download=document.createElement('button');download.type='button';download.className='btn-link btn-download';download.textContent='Download';download.addEventListener('click',()=>pdf(f,true));
  actions.append(open,download);card.append(symbol,number,title,desc,actions);grid.append(card);
 }
 const more=$('hmu-more-files');more.replaceChildren();
 if(cursor){const b=document.createElement('button');b.type='button';b.textContent='Load more PDFs';b.addEventListener('click',()=>loadFiles(true));more.append(b);}
}
async function pdf(file,download){
 let pending=null;
 if(!download){try{pending=window.open('about:blank','_blank');if(pending){pending.opener=null;pending.document.body.textContent='Checking private PDF permissions…';}}catch{}}
 const note=$('hmu-file-status');note.hidden=false;note.textContent='Opening '+(file.title||'PDF')+'…';
 try{
  const path=(mode==='student'?'/p9/file?key=':'/v6/file?key=')+encodeURIComponent(file.key);
  const blob=await privateCall(path,{pdf:true});
  if(!blob.type.includes('pdf')||blob.size<10)throw Error('The protected endpoint did not return a PDF.');
  const u=URL.createObjectURL(blob);objectUrls.push(u);
  if(download){const a=document.createElement('a');a.href=u;a.download=(file.filename||file.title+'.pdf').replace(/[^\w. -]/g,'_').slice(0,112);document.body.append(a);a.click();a.remove();note.textContent='Download started.';}
  else if(pending&&!pending.closed){pending.location.replace(u);note.textContent='PDF opened in a separate tab.';}
  else{note.replaceChildren();const a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Tap here to open your PDF';note.append(a);}
 }catch(e){if(pending&&!pending.closed)pending.close();note.textContent=e.message;}
}
function signOut(){
 const bearer=auth?.access_token;clearState();show('login');fieldStatus('hmu-signin-status','');try{history.replaceState({hmuPhase12:'login'},'',location.pathname+location.search);}catch{}
 if(bearer)api(URL_SUPA+'/auth/v1/logout',{method:'POST',token:bearer}).catch(()=>{});
}
$('hmu-signin-form').addEventListener('submit',async e=>{
 e.preventDefault();if(sessionBusy)return;
 const email=$('hmu-signin-email').value.trim().toLowerCase();const password=$('hmu-signin-password').value;
 if(!email||!password){fieldStatus('hmu-signin-status','Enter your email and password.');return;}
 sessionBusy=true;const b=$('hmu-signin-submit');b.disabled=true;b.querySelector('span').textContent='Verifying account…';fieldStatus('hmu-signin-status','');
 try{
  const res=await api(URL_SUPA+'/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
  if(!res.access_token||!res.refresh_token||!res.user?.id)throw Error('The authentication service did not return a complete session.');
  auth={access_token:res.access_token,refresh_token:res.refresh_token,expiresAt:Date.now()+(res.expires_in||3600)*1000,user:{id:res.user.id,email:res.user.email||email}};
  $('hmu-signin-password').value='';await identify();
 }catch(e){clearState();show('login');fieldStatus('hmu-signin-status',e.message||'Sign in failed.');}
 finally{sessionBusy=false;b.disabled=false;b.querySelector('span').textContent='Sign in to portal';}
});
$('hmu-activate-form').addEventListener('submit',async e=>{
 e.preventDefault();const btn=$('hmu-activate-submit');btn.disabled=true;fieldStatus('hmu-activate-status','');
 try{
  const data=await api(PILOT+'/api/v1/student/activate',{method:'POST',body:{code:$('hmu-activation-code').value},token:await token()});
  if(!data.student||data.student.status!=='active')throw Error('Activation was not completed.');
  profile={...data.student,stage:Number(data.student.stage),college:'medicine'};mode='student';save('student');$('hmu-activation-code').value='';await enterAcademic();
 }catch(e){fieldStatus('hmu-activate-status',e.message);}finally{btn.disabled=false;}
});
$('hmu-toggle-password').addEventListener('click',()=>{const i=$('hmu-signin-password');i.type=i.type==='password'?'text':'password';$('hmu-toggle-password').textContent=i.type==='password'?'Show':'Hide';});
$('hmu-forgot-password').addEventListener('click',()=>fieldStatus('hmu-signin-status','For the pilot, contact your administrator to reset your password.',true));
$('hmu-menu-toggle')?.addEventListener('click',e=>{e.stopPropagation();const p=$('hmu-menu-panel');p.hidden=!p.hidden;$('hmu-menu-toggle').setAttribute('aria-expanded',String(!p.hidden));});
$('hmu-menu-focus')?.addEventListener('click',()=>{$('hmu-menu-panel').hidden=true;$('hmu-signin-email').focus();});
$('hmu-menu-help')?.addEventListener('click',()=>notice('Students and administrators use the same sign-in. Access is verified automatically.'));
document.querySelectorAll('.mh3-menu-trigger').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();const p=$(btn.getAttribute('aria-controls'));document.querySelectorAll('.mh3-menu-panel').forEach(n=>n.hidden=true);p.hidden=false;btn.setAttribute('aria-expanded','true');}));
document.addEventListener('click',e=>{if(!e.target.closest('.mh3-menu-wrap,.hmu7-menu-wrap'))document.querySelectorAll('.mh3-menu-panel,.hmu7-menu-panel').forEach(n=>n.hidden=true);});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.mh3-menu-panel,.hmu7-menu-panel').forEach(n=>n.hidden=true);});
document.querySelectorAll('[data-hmu-action]').forEach(btn=>btn.addEventListener('click',()=>{const a=btn.dataset.hmuAction;if(a==='signout')signOut();else if(a==='home'){if(profile)show('blocks',{push:true});}else if(a==='about')notice('HMU Academic Portal design test. Real roles and private PDFs; no production MedHub data is modified.');}));
for(const btn of document.querySelectorAll('.mh-compact-back'))btn.addEventListener('click',()=>{
 if(view==='resources')show('subjects',{push:true});else if(view==='subjects')show('blocks',{push:true});
});
window.addEventListener('popstate',e=>{const v=e.state?.hmuPhase12;if(profile&&['blocks','subjects','resources'].includes(v))show(v);else if(profile)show('blocks');else if(view==='activate'||view==='disabled')show(view);else show('login');});
window.addEventListener('pagehide',clearBlobs);
async function startup(){
 try{
  const saved=stored();if(!saved){show('login');return;}
  auth=saved.obj;mode=saved.type==='admin'?'stage_admin':'student';
  const bearer=await token();const user=await api(URL_SUPA+'/auth/v1/user',{token:bearer});
  if(user.id!==auth.user.id)throw Error('Stored session identity mismatch.');
  await identify({restore:true});
 }catch(e){clearState();show('login');fieldStatus('hmu-signin-status','Session expired. Sign in again.');}
 finally{document.body.dataset.hmuReady='yes';$('hmu-boot').hidden=true;}
}
startup();
})();

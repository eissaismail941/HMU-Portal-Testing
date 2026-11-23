(()=>{'use strict';
  // Public Supabase project URL and publishable key: never place a secret/service key in HTML.
  const URL='https://lxmxsymxmpulkkngjfjo.supabase.co';
  const PUB='sb_publishable_-7LnL-kzS1omjDFD5va_0A_Tjdh3m8h';
  const R2_API='https://medhub-admin-r2-test.eissaismail941.workers.dev';
  const MAX_BYTES=20*1024*1024;
  const NAMES={super_admin:'Super Admin',college_admin:'College Admin',stage_admin:'Stage Admin',content_admin:'Content Admin'};
  const $=id=>document.getElementById(id);
  let auth=null,grants=[],checkedAt=null,objectURLs=[];
  let activeView='overview',loading=false,initialAuthCheck=true;
  let academicCatalog=null,listing=[],nextCursor=null,editTarget=null,replaceTarget=null,requestRevision=0;
  const ADMIN_API='https://medhub-admin-api-test.eissaismail941.workers.dev';
  let adminAssignments=[],adminDirectoryLoading=false;
  // Test-only: persist the Supabase session for reloads in this browser tab.
  // Never use the original MedHub admin session key or store passwords.
  const SANDBOX_SESSION_KEY='hmu-r2-phase5-session-v1';
  function saveSandboxSession(){
    try{
      if(auth?.access_token&&auth?.refresh_token&&auth?.user?.id){
        sessionStorage.setItem(SANDBOX_SESSION_KEY,JSON.stringify({
          access_token:auth.access_token,refresh_token:auth.refresh_token,
          expiresAt:auth.expiresAt,user:{id:auth.user.id,email:auth.user.email}
        }));
      } else sessionStorage.removeItem(SANDBOX_SESSION_KEY);
    }catch{}
  }
  function readSandboxSession(){
    try{
      const item=JSON.parse(sessionStorage.getItem(SANDBOX_SESSION_KEY)||'null');
      if(item&&typeof item.access_token==='string'&&typeof item.refresh_token==='string'&&
         typeof item.user?.id==='string'&&Number.isFinite(item.expiresAt))return item;
    }catch{}
    return null;
  }
  function forgetSandboxSession(){try{sessionStorage.removeItem(SANDBOX_SESSION_KEY);}catch{}}

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function notice(id,text,type='error'){const e=$(id);e.replaceChildren();if(!text)return;const el=document.createElement('div');el.className='notice'+(type?' '+type:'');el.textContent=text;e.append(el);}
  const isMedicine=g=>g.role==='super_admin'||g.college==='medicine';
  function canManage(){return permittedStages().length>0;}
  function isSuperAdmin(){return grants.some(g=>g.is_active===true&&g.role==='super_admin'&&g.college==null&&g.stage==null);}
  function permittedStages(){if(grants.some(g=>g.is_active&&(g.role==='super_admin'&&g.college==null&&g.stage==null)))return [1,2,3,4,5,6];return [...new Set(grants.filter(g=>g.is_active&&g.college==='medicine'&&['stage_admin','content_admin'].includes(g.role)).map(g=>Number(g.stage)).filter(x=>Number.isInteger(x)&&x>=1&&x<=6))].sort((a,b)=>a-b);}
  function labelRole(){const active=grants.filter(g=>g.is_active&&isMedicine(g));if(!active.length)return 'No active role';return NAMES[active[0].role]||'Unknown role';}
  async function api(path,{method='GET',body,token,headers={}}={}){
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),17000);
    try{const r=await fetch(URL+path,{method,headers:{apikey:PUB,Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});const raw=await r.text();let data;try{data=raw?JSON.parse(raw):{};}catch{data={message:raw.slice(0,180)};}if(!r.ok){const msg=data.msg||data.message||data.error_description||data.error||`Request failed (HTTP ${r.status})`;const error=new Error(msg);error.status=r.status;throw error;}return data;}
    catch(e){if(e.name==='AbortError')throw Error('The server timed out. Check your network.');throw e;}finally{clearTimeout(timeout);}
  }
  async function token(){if(!auth)throw Error('Sign in first.');if(Date.now()>auth.expiresAt-70000){const a=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:auth.refresh_token}});if(!a?.access_token||a.user?.id!==auth.user.id){signOut(false);throw Error('Your session expired. Sign in again.');}auth={...a,expiresAt:Date.now()+(a.expires_in||3600)*1000};saveSandboxSession();}return auth.access_token;}
  async function refreshGrants(){if(!auth)throw Error('Sign in first.');const id=auth.user.id;const result=await api('/rest/v1/admin_assignments?select=role,college,stage,is_active&user_id=eq.'+encodeURIComponent(id),{token:await token()});if(!Array.isArray(result))throw Error('Permission response was not a list.');grants=result;checkedAt=new Date();renderPermissions();return result;}
  async function verified(){await refreshGrants();if(!canManage())throw Error('This account has no active Medicine administrator assignment. Ask the Super Admin to activate it.');const selected=Number($('stage').value);if(!permittedStages().includes(selected))throw Error('Your role does not permit this stage.');return selected;}
  function renderPermissions(){const superAdmin=isSuperAdmin();for(const b of document.querySelectorAll('[data-go="administrators"],[data-go="students"]'))b.hidden=!superAdmin;if(!superAdmin&&['administrators','students'].includes(activeView))view('overview');const active=grants.filter(g=>g.is_active&&isMedicine(g));$('stat-role').textContent=labelRole();$('stat-college').textContent=canManage()?'Medicine':'Not assigned';$('stat-status').textContent=canManage()?'Active':'No access';$('last-checked').textContent=checkedAt?'Last checked: '+checkedAt.toLocaleString():'';
    const box=$('scope-contents');box.replaceChildren();if(!grants.length){box.innerHTML='<div class="notice warn" style="grid-column:1/-1">No assignments returned. The account may not be assigned, or an RLS SELECT policy may be blocking access. We will not guess or grant permissions.</div>';}else{for(const g of grants){const el=document.createElement('div');el.className='scope';const status=g.is_active?'Active':'Inactive';const role=NAMES[g.role]||g.role;el.innerHTML='<h3>'+esc(role)+' · '+esc(status)+'</h3><p>'+esc(g.college||'All colleges')+' · '+esc(g.stage==null?'All stages':'Stage '+g.stage)+'</p>';box.append(el);}}
    $('workspace-warning').replaceChildren();const stages=permittedStages(),prev=$('stage').value;$('stage').replaceChildren();for(const n of stages){const opt=document.createElement('option');opt.value=n;opt.textContent='Stage '+n;$('stage').append(opt);}if(stages.includes(Number(prev)))$('stage').value=prev; if(academicCatalog)rebuildBlocks();
    const allowed=canManage()&&stages.length>0;$('stage').disabled=!allowed;$('subject').disabled=!allowed;$('file').disabled=!allowed;$('save-pdf').disabled=!allowed;
    if(!allowed)notice('workspace-warning','Your account cannot access the Medicine test workspace. Activate an appropriate administrator assignment first.','warn');
    notice('global-status',allowed?'Authenticated administrator · Stage access checked · No live lecture writes':'Signed in, but this account is not authorised for the Medicine sandbox.',allowed?'success':'warn');
  }
  function view(which){if(['administrators','students'].includes(which)&&!isSuperAdmin())which='overview';activeView=which;for(const sec of document.querySelectorAll('.view'))sec.hidden=sec.dataset.view!==which;for(const b of document.querySelectorAll('[data-go]'))b.classList.toggle('current',b.dataset.go===which);const meta={overview:['Administrator overview','Your real Supabase administrator assignment, with production lecture storage untouched.'],workspace:['Academic library','Organise test PDFs by Medicine stage, block and subject with server-enforced permissions.'],administrators:['Administrator management','Create or manage accounts through your existing Super Admin backend.'],students:['Student management pilot','Create and test two real student accounts with Medicine stage, group and one-time activation.'],account:['Account & security','View your account and update your password safely.']};$('view-heading').textContent=meta[which][0];$('view-description').textContent=meta[which][1];if(which==='workspace')renderFiles();if(which==='administrators')loadAdminDirectory();if(which==='students')loadPilotStudents();}
  function signOut(revoke=true){const old=auth;auth=null;forgetSandboxSession();grants=[];checkedAt=null;for(const url of objectURLs)URLrevoke(url);objectURLs=[];$('dashboard').hidden=true;$('login-view').hidden=initialAuthCheck;$('password').value='';$('who').textContent='Not signed in';$('av').textContent='H';notice('login-status','');if(revoke&&old?.access_token)api('/auth/v1/logout',{method:'POST',token:old.access_token}).catch(()=>{});}
  function URLrevoke(url){try{URL_OBJ.revokeObjectURL(url);}catch{}}
  const URL_OBJ=window.URL;
  // Only use the separate Worker and private sandbox bucket. No production upload URLs.
  async function r2Api(path,{method='GET',body,blob=false,headers={}}={}){
    const abort=new AbortController();const clock=setTimeout(()=>abort.abort(),30000);
    try{
      const res=await fetch(R2_API+path,{method,headers:{Authorization:'Bearer '+await token(),...headers},body,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:abort.signal});
      if(!res.ok){const detail=await res.json().catch(()=>({}));const error=new Error(detail.error||'R2 test request failed (HTTP '+res.status+').');error.status=res.status;throw error;}
      return blob?await res.blob():await res.json();
    }catch(e){if(e.name==='AbortError')throw Error('Private test Worker timed out; retry on a stable network.');throw e;}
    finally{clearTimeout(clock);}
  }

  async function loadCatalog(){
    if(academicCatalog)return academicCatalog;
    const data=await r2Api('/v6/catalog');
    if(!data?.ok||!data.catalog)throw Error('Academic catalog could not be loaded. Deploy the Phase 6 Worker code first.');
    academicCatalog=data.catalog;
    rebuildBlocks();
    return academicCatalog;
  }
  function rebuildBlocks(){
    const stage=Number($('stage').value),items=academicCatalog?.[String(stage)]||[];
    const previous=$('block').value;
    $('block').replaceChildren();
    for(const item of items){const opt=document.createElement('option');opt.value=item.id;opt.textContent=item.name;$('block').append(opt);}
    if(items.some(x=>x.id===previous))$('block').value=previous;
    rebuildSubjects();
  }
  function rebuildSubjects(){
    const stage=String($('stage').value),entry=academicCatalog?.[stage]?.find(x=>x.id===$('block').value);
    const previous=$('subject').value;
    $('subject').replaceChildren();
    if(!entry){$('catalog-caption').textContent='No academic test grouping available for this stage.';return;}
    for(const subject of entry.subjects){const opt=document.createElement('option');opt.value=subject;opt.textContent=subject;$('subject').append(opt);}
    if(entry.subjects.includes(previous))$('subject').value=previous;
    $('catalog-caption').textContent=entry.provisional
      ?'This selection is a TEST grouping. It does not claim to represent an officially confirmed HMU block/subject.'
      :'Based on the current MedHub Medicine academic structure. Test uploads are separate from live lectures.';
    $('upload-scope').textContent='Destination: Medicine · Stage '+stage+' · '+entry.name;
    $('listing-label').textContent='Medicine · Stage '+stage+' · '+entry.name;
  }
  function iconButton(text,classes,action){
    const b=document.createElement('button');b.type='button';b.className='button small '+(classes||'');b.textContent=text;b.addEventListener('click',action);return b;
  }
  function showFiles(){
    const body=$('file-rows');body.replaceChildren();
    const subject=$('subject').value,filtered=listing.filter(f=>f.subject===subject).sort((a,b)=>(b.uploaded||'').localeCompare(a.uploaded||''));
    $('file-count').textContent=filtered.length+' PDF'+(filtered.length===1?'':'s');
    if(!filtered.length){body.innerHTML='<tr><td colspan="4" class="empty">No test PDFs in this subject yet.</td></tr>';return;}
    for(const f of filtered){
      const tr=document.createElement('tr'),name=document.createElement('td'),title=document.createElement('div'),description=document.createElement('div');
      title.className='file-name';title.textContent=f.title||f.filename||'Untitled PDF';
      description.className='file-subtitle';description.textContent=(f.kind||'Lecture')+' · '+(f.filename||'test.pdf')+' · '+(Number(f.size||0)/1048576).toFixed(2)+' MB';
      name.append(title,description);
      const sub=document.createElement('td');sub.textContent=f.subject;
      const added=document.createElement('td');added.textContent=f.uploaded?new Date(f.uploaded).toLocaleDateString():'—';
      const actionTd=document.createElement('td'),controls=document.createElement('div');controls.className='file-actions';
      const open=iconButton('Open PDF','',async()=>{
        const tab=window.open('about:blank','_blank');open.disabled=true;
        try{const blob=await r2Api('/v6/file?key='+encodeURIComponent(f.key),{blob:true});const url=URL_OBJ.createObjectURL(blob);objectURLs.push(url);
          if(tab&&!tab.closed)tab.location.href=url;else notice('workspace-warning','Your browser blocked the PDF tab. Allow popups for this test page.','warn');
        }catch(err){if(tab&&!tab.closed)tab.close();notice('workspace-warning',err.message);}
        finally{open.disabled=false;}
      });controls.append(open);
      if(f.canManage){
        controls.append(iconButton('Edit','',()=>{editTarget=f;$('edit-title').value=f.title;$('edit-kind').value=f.kind||'Lecture';notice('edit-status','');$('edit-dialog').showModal();}));
        controls.append(iconButton('Replace','',()=>{replaceTarget=f;$('replace-file').value='';notice('replace-status','');$('replace-dialog').showModal();}));
        controls.append(iconButton('Delete','danger',async()=>{
          if(!window.confirm('Delete this PDF from the PRIVATE Phase 6 test library?'))return;
          try{await r2Api('/v6/file?key='+encodeURIComponent(f.key),{method:'DELETE'});notice('workspace-warning','Test PDF deleted from private R2.','success');await renderFiles();}
          catch(err){notice('workspace-warning',err.message);}
        }));
      }
      actionTd.append(controls);tr.append(name,sub,added,actionTd);body.append(tr);
    }
  }
  async function renderFiles(cursor=null){
    if(!auth||activeView!=='workspace')return;
    const version=++requestRevision;
    if(!canManage())return;
    try{
      await loadCatalog();
      const stage=Number($('stage').value),block=$('block').value;
      if(!permittedStages().includes(stage)||!block){$('file-rows').innerHTML='<tr><td colspan="4" class="empty">No permission for this stage.</td></tr>';return;}
      if(!cursor){listing=[];nextCursor=null;$('file-count').textContent='Loading…';}
      const query='/v6/files?stage='+encodeURIComponent(stage)+'&block='+encodeURIComponent(block)+(cursor?'&cursor='+encodeURIComponent(cursor):'');
      const data=await r2Api(query);
      if(version!==requestRevision)return;
      listing.push(...(data.files||[]));nextCursor=data.nextCursor||null;
      $('load-more-area').hidden=!nextCursor;
      showFiles();
    }catch(err){if(version!==requestRevision)return;$('file-count').textContent='Unavailable';$('file-rows').innerHTML='<tr><td colspan="4" class="empty">Could not load test files.</td></tr>';notice('workspace-warning',err.message);}
  }
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{if(auth)view(b.dataset.go);}));
  document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{const e=$(b.dataset.toggle);const visible=e.type==='password';e.type=visible?'text':'password';b.textContent=visible?'Hide':'Show';}));
  $('login-form').addEventListener('submit',async(e)=>{e.preventDefault();if(loading)return;loading=true;const btn=$('sign-in'),pwd=$('password').value;btn.disabled=true;btn.textContent='Verifying account…';notice('login-status','');try{const data=await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email:$('email').value.trim(),password:pwd}});if(!data.access_token||!data.user?.id)throw Error('Supabase did not return a valid account session.');auth={...data,expiresAt:Date.now()+(data.expires_in||3600)*1000};saveSandboxSession();$('password').value='';$('who').textContent=auth.user.email||'Administrator';$('av').textContent=String(auth.user.email||'H')[0].toUpperCase();$('account-email').textContent=auth.user.email||'—';$('account-id').textContent=auth.user.id;try{await refreshGrants();}catch(x){grants=[];renderPermissions();notice('global-status','Permission check failed: '+x.message+'. This account has NOT been granted workspace access.','error');}
        $('login-view').hidden=true;$('dashboard').hidden=false;view('overview');}catch(x){auth=null;forgetSandboxSession();notice('login-status',x.message||'Could not sign in.');}finally{loading=false;btn.disabled=false;btn.innerHTML='Sign in to test workspace <span>→</span>';}});
  $('refresh-roles').addEventListener('click',async()=>{const btn=$('refresh-roles');btn.disabled=true;try{await refreshGrants();notice('global-status','Assignments rechecked successfully. The page has not changed live permissions.','success');}catch(e){grants=[];renderPermissions();notice('global-status','Could not verify permission: '+e.message,'error');}finally{btn.disabled=false;}});

  $('stage').addEventListener('change',()=>{rebuildBlocks();renderFiles();});
  $('block').addEventListener('change',()=>{rebuildSubjects();renderFiles();});
  $('subject').addEventListener('change',showFiles);
  $('reload-files').addEventListener('click',()=>renderFiles());
  $('load-more').addEventListener('click',()=>{if(nextCursor)renderFiles(nextCursor);});
  $('upload-form').addEventListener('submit',async e=>{
    e.preventDefault();const btn=$('save-pdf'),file=$('file').files?.[0];
    if(!file||file.size<5||file.size>MAX_BYTES)return notice('workspace-warning','Select a PDF no larger than 20 MB.');
    btn.disabled=true;btn.textContent='Uploading to test R2…';
    try{
      const stage=await verified();await loadCatalog();
      const block=$('block').value,subject=$('subject').value;
      if(!academicCatalog[String(stage)]?.find(x=>x.id===block&&x.subjects.includes(subject)))throw Error('Choose a valid block and subject.');
      const form=new FormData();form.append('stage',String(stage));form.append('block',block);form.append('subject',subject);
      form.append('kind',$('kind').value);form.append('title',$('title').value.trim());form.append('file',file,file.name);
      const out=await r2Api('/v6/upload',{method:'POST',body:form});
      $('file').value='';$('title').value='';notice('workspace-warning','Saved “'+out.title+'” to the private Phase 6 R2 test library. No live lectures changed.','success');
      await renderFiles();
    }catch(err){notice('workspace-warning',err.message);}finally{btn.disabled=false;btn.innerHTML='Upload to private R2 <span aria-hidden="true">↗</span>';}
  });
  $('test-denied-stage').addEventListener('click',async()=>{
    const other=[2,1,3,4,5,6].find(n=>!permittedStages().includes(n));
    if(!other)return notice('security-status','This account has all stages. Sign in as a Stage 1-only Content Admin to test denial.','warn');
    try{await r2Api('/v6/files?stage='+other+'&block='+(other===2?'msd':'stage1'));
      notice('security-status','Unexpected: the server allowed an unassigned stage. Stop testing and inspect the Worker.','error');
    }catch(err){notice('security-status',err.status===403?'Verified: HTTP 403. The server blocked unassigned Medicine Stage '+other+'.':'The check failed, but not with a 403: '+err.message,err.status===403?'success':'warn');}
  });
  function closeEdit(){if($('edit-dialog').open)$('edit-dialog').close();}
  function closeReplace(){if($('replace-dialog').open)$('replace-dialog').close();}
  $('edit-close').addEventListener('click',closeEdit);$('edit-cancel').addEventListener('click',closeEdit);
  $('replace-close').addEventListener('click',closeReplace);$('replace-cancel').addEventListener('click',closeReplace);
  $('edit-form').addEventListener('submit',async e=>{
    e.preventDefault();if(!editTarget)return;
    const btn=$('edit-save');btn.disabled=true;
    try{
      await r2Api('/v6/file?key='+encodeURIComponent(editTarget.key),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:$('edit-title').value.trim(),kind:$('edit-kind').value})});
      closeEdit();notice('workspace-warning','Lecture details updated in private R2.','success');await renderFiles();
    }catch(err){notice('edit-status',err.message);}finally{btn.disabled=false;}
  });
  $('replace-form').addEventListener('submit',async e=>{
    e.preventDefault();if(!replaceTarget)return;
    const btn=$('replace-save'),file=$('replace-file').files?.[0];
    if(!file||file.size<5||file.size>MAX_BYTES)return notice('replace-status','Choose a PDF up to 20 MB.');
    btn.disabled=true;
    try{const body=new FormData();body.append('file',file,file.name);await r2Api('/v6/replace?key='+encodeURIComponent(replaceTarget.key),{method:'POST',body});
      closeReplace();notice('workspace-warning','Test PDF replaced successfully.','success');await renderFiles();
    }catch(err){notice('replace-status',err.message);}finally{btn.disabled=false;}
  });
  $('change-password').addEventListener('submit',async e=>{e.preventDefault();if(!auth)return;const old=$('current-pw').value,next=$('new-pw').value,confirmation=$('confirm-pw').value;notice('pw-status','');if(next.length<12)return notice('pw-status','Use a password of at least 12 characters.');if(next!==confirmation)return notice('pw-status','New passwords do not match.');if(old===next)return notice('pw-status','Choose a different password.');const btn=$('change-btn');btn.disabled=true;btn.textContent='Updating…';try{const verify=await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email:auth.user.email,password:old}});if(verify.user?.id!==auth.user.id)throw Error('Current password verification did not match your account.');await api('/auth/v1/user',{method:'PUT',body:{password:next},token:await token()});$('current-pw').value='';$('new-pw').value='';$('confirm-pw').value='';notice('pw-status','Password updated in Supabase. Use the new password the next time you sign in.','success');}catch(err){notice('pw-status',err.message||'Could not update password.');}finally{btn.disabled=false;btn.textContent='Update password';}});
  $('sign-out').addEventListener('click',()=>signOut());
  async function restoreSandboxSession(){
    const saved=readSandboxSession();
    if(!saved){
      initialAuthCheck=false;
      $('who').textContent='Not signed in';
      $('login-view').hidden=false;
      $('session-startup').hidden=true;
      return;
    }
    auth=saved;
    notice('login-status','Restoring your administrator session…','warn');
    try{
      // Always validate the token and read current assignments before showing the dashboard.
      const who=await api('/auth/v1/user',{token:await token()});
      if(!who?.id||who.id!==saved.user.id)throw Error('Saved session is no longer valid.');
      auth.user={...auth.user,id:who.id,email:who.email||saved.user.email};
      await refreshGrants();
      if(!canManage())throw Error('Administrator access is no longer active. Sign in again after approval.');
      saveSandboxSession();
      $('who').textContent=auth.user.email||'Administrator';
      $('av').textContent=String(auth.user.email||'H')[0].toUpperCase();
      $('account-email').textContent=auth.user.email||'—';
      $('account-id').textContent=auth.user.id;
      $('login-view').hidden=true;$('dashboard').hidden=false;
      view('overview');
      notice('login-status','');
    }catch(err){
      auth=null;grants=[];forgetSandboxSession();
      $('dashboard').hidden=true;$('login-view').hidden=false;
      notice('login-status','Please sign in again. '+(err.message||'Could not verify the saved session.'),'warn');
    }finally{
      initialAuthCheck=false;
      // Reveal exactly one validated destination; never briefly display the login form on a valid refresh.
      $('session-startup').hidden=true;
    }
  }

  // Phase 7: Real administrator management. Every action is guarded by an active
  // Super Admin assignment AND by the existing Supabase RPC/Cloudflare backend.
  // Never use a Supabase secret key in this public HTML.
  async function loadAdminDirectory(){
    if(!auth||!isSuperAdmin()||adminDirectoryLoading)return;
    adminDirectoryLoading=true;
    const btn=$('p7-reload-admins');btn.disabled=true;
    notice('p7-directory-status','Loading real administrator assignments…','warn');
    try{
      await refreshGrants();if(!isSuperAdmin())throw Error('Super Admin access is no longer active.');
      const rows=await api('/rest/v1/rpc/medhub_admin_directory',{method:'POST',body:{},token:await token()});
      if(!Array.isArray(rows))throw Error('The administrator directory did not return a list.');
      adminAssignments=rows;notice('p7-directory-status','Verified directory loaded from Supabase.','success');
      renderAdminDirectory();
    }catch(e){notice('p7-directory-status','Could not load the directory: '+e.message,'error');}
    finally{adminDirectoryLoading=false;btn.disabled=false;}
  }
  function renderAdminDirectory(){
    if(!isSuperAdmin())return;
    const q=$('p7-admin-search').value.trim().toLowerCase(),f=$('p7-admin-status').value;
    const seen=new Set(adminAssignments.filter(a=>a.is_active).map(a=>a.user_id));
    $('p7-total').textContent=String(adminAssignments.length);
    $('p7-active').textContent=String(seen.size);
    $('p7-coverage').textContent=new Set(adminAssignments.filter(a=>a.is_active&&a.college==='medicine'&&a.stage!=null).map(a=>a.stage)).size+'/6';
    const matches=adminAssignments.filter(a=>(!q||[a.email,a.role,a.college,a.stage].some(x=>String(x??'').toLowerCase().includes(q)))&&(f==='all'||(f==='active'?a.is_active:!a.is_active)));
    const tbody=$('p7-admin-rows');tbody.replaceChildren();
    if(!matches.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.className='p7-zero';td.textContent='No matching administrators.';tr.append(td);tbody.append(tr);return;}
    const userCounts=new Map();for(const a of adminAssignments)if(a.role==='content_admin')userCounts.set(a.user_id,(userCounts.get(a.user_id)||0)+1);
    const cell=(tr,text)=>{const td=document.createElement('td');td.textContent=String(text);tr.append(td);return td;};
    for(const a of matches){
      const tr=document.createElement('tr'),who=document.createElement('td'),name=document.createElement('strong'),small=document.createElement('small');
      name.textContent=a.email||'No email';small.textContent='User ID: '+String(a.user_id||'').slice(0,8)+'…';who.append(name,small);tr.append(who);
      cell(tr,NAMES[a.role]||a.role||'—');cell(tr,(a.college||'All colleges')+' · '+(a.stage==null?'All stages':'Stage '+a.stage));
      const status=document.createElement('td'),tag=document.createElement('span');tag.className='p7-chip '+(a.is_active?'active':'inactive');tag.textContent=a.is_active?'Active':'Inactive';status.append(tag);tr.append(status);
      const action=document.createElement('td');
      if(a.role==='content_admin'&&a.user_id&&userCounts.get(a.user_id)===1){
        const b=document.createElement('button');b.type='button';b.className='button small'+(a.is_active?' danger':'');b.textContent=a.is_active?'Deactivate':'Activate';
        b.addEventListener('click',()=>updateAdminStatus(a,b));action.append(b);
      }else{const t=document.createElement('small');t.textContent=a.role==='super_admin'?'Protected':'Not available';action.append(t);}
      tr.append(action);tbody.append(tr);
    }
  }
  async function updateAdminStatus(a,button){
    if(!auth||!isSuperAdmin()||a.role!=='content_admin'||!a.user_id)return;
    const willActivate=!a.is_active;
    if(!window.confirm((willActivate?'ACTIVATE':'DEACTIVATE')+' '+a.email+' — '+a.college+', Stage '+a.stage+'?\n\nThis changes REAL Supabase administrator permissions.'))return;
    button.disabled=true;
    try{
      await refreshGrants();if(!isSuperAdmin())throw Error('Super Admin access is no longer active.');
      await api('/rest/v1/rpc/medhub_set_content_admin_status',{method:'POST',body:{p_user_id:a.user_id,p_active:willActivate},token:await token()});
      notice('p7-directory-status','The Content Admin assignment was '+(willActivate?'activated':'deactivated')+' in Supabase.','success');
      await loadAdminDirectory();
    }catch(e){notice('p7-directory-status','Unable to change status: '+e.message,'error');}
    finally{button.disabled=false;}
  }
  $('p7-reload-admins').addEventListener('click',loadAdminDirectory);
  $('p7-admin-search').addEventListener('input',renderAdminDirectory);
  $('p7-admin-status').addEventListener('change',renderAdminDirectory);
  $('p7-pw-show').addEventListener('click',()=>{const input=$('p7-initial-password'),button=$('p7-pw-show'),show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'Hide':'Show';});
  $('p7-add-admin').addEventListener('submit',async e=>{
    e.preventDefault();if(!auth||!isSuperAdmin())return notice('p7-create-status','Super Admin access required.');
    const email=$('p7-email').value.trim().toLowerCase(),password=$('p7-initial-password').value,stage=Number($('p7-stage').value);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return notice('p7-create-status','Enter a valid email address.');
    if(password.length<12||password.length>128||!/[A-Za-z]/.test(password)||!/\d/.test(password))return notice('p7-create-status','Use 12–128 characters, containing letters and a number.');
    if(!Number.isInteger(stage)||stage<1||stage>6)return notice('p7-create-status','Invalid academic stage.');
    if(!$('p7-confirm').checked)return notice('p7-create-status','Confirm that you verified the administrator.');
    if(!confirm('Create a REAL Supabase account for '+email+' as an INACTIVE Medicine Stage '+stage+' Content Admin?\n\nNo invitation email will be sent.'))return;
    const b=$('p7-create-button');b.disabled=true;b.textContent='Creating account…';
    try{
      await refreshGrants();if(!isSuperAdmin())throw Error('Super Admin access is no longer active.');
      const res=await fetch(ADMIN_API+'/create-admin',{method:'POST',headers:{Authorization:'Bearer '+await token(),'Content-Type':'application/json'},body:JSON.stringify({email,password,college:'medicine',stage,role:'content_admin',confirm:'create-inactive'}),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
      const data=await res.json().catch(()=>({}));if(!res.ok)throw Error((data.error||'Account creation failed')+' (HTTP '+res.status+')');
      $('p7-email').value='';$('p7-confirm').checked=false;
      notice('p7-create-status','Created an INACTIVE Medicine Stage '+stage+' Content Admin account for '+email+'. Share the password privately; activate the role separately.','success');
      await loadAdminDirectory();
    }catch(err){notice('p7-create-status','Could not complete: '+err.message+'. Check Supabase before retrying to avoid duplicates.','error');}
    finally{$('p7-initial-password').value='';$('p7-initial-password').type='password';$('p7-pw-show').textContent='Show';b.disabled=false;b.textContent='Create inactive administrator';}
  });
  // Phase 8: real student test directory. Calls only the isolated new test Worker.
  const STUDENT_PILOT_API='https://hmu-student-pilot-test.eissaismail941.workers.dev';
  let pilotStudents=[],pilotBusy=false,pilotActivationCode='';
  async function pilotCall(path,{method='GET',body}={}){
    const jwt=await token();
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
    try{
      const r=await fetch(STUDENT_PILOT_API+path,{method,headers:{Authorization:'Bearer '+jwt,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error((data.error||'Student pilot request failed')+' (HTTP '+r.status+')');
      return data;
    }catch(e){if(e.name==='AbortError')throw Error('Pilot Worker request timed out.');throw e;}finally{clearTimeout(timer);}
  }
  async function loadPilotStudents(){
    if(pilotBusy||!auth||!isSuperAdmin())return;
    pilotBusy=true;$('p8-refresh-students').disabled=true;notice('p8-student-directory-status','Loading real pilot student profiles…','warn');
    try{await refreshGrants();if(!isSuperAdmin())throw Error('Super Admin access is no longer active.');
      const data=await pilotCall('/api/v1/admin/students');
      pilotStudents=data.students||[];renderPilotStudents();
      notice('p8-student-directory-status','Pilot directory connected. Only the separate student profile table is used.','success');
    }catch(e){notice('p8-student-directory-status',e.message,'error');}
    finally{pilotBusy=false;$('p8-refresh-students').disabled=false;}
  }
  function renderPilotStudents(){
    const filtered=pilotStudents.filter(s=>s.email.toLowerCase().includes($('p8-search-students').value.toLowerCase().trim()));
    $('p8-student-count').textContent=String(pilotStudents.length)+'/2';
    $('p8-student-active').textContent=String(pilotStudents.filter(s=>s.status==='active').length);
    const tb=$('p8-student-rows');tb.replaceChildren();
    if(!filtered.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.className='p7-zero';td.textContent=pilotStudents.length?'No matching test students.':'No pilot student accounts yet.';tr.append(td);tb.append(tr);return;}
    for(const s of filtered){
      const tr=document.createElement('tr');
      const c1=document.createElement('td'),name=document.createElement('strong'),desc=document.createElement('small');name.textContent=s.email;desc.textContent='Controlled test account';c1.append(name,desc);tr.append(c1);
      const c2=document.createElement('td');c2.textContent='Medicine · Stage '+s.stage+' · Group '+s.group;tr.append(c2);
      const c3=document.createElement('td'),chip=document.createElement('span');chip.className='p7-chip '+(s.status==='active'?'active':'inactive');chip.textContent=s.status.replace('_',' ');c3.append(chip);tr.append(c3);
      const actions=document.createElement('td'),row=document.createElement('div');row.className='p7-tools';
      if(s.status==='pending_activation'){
        const reset=document.createElement('button');reset.className='button small';reset.textContent='New activation code';reset.type='button';
        reset.addEventListener('click',()=>resetStudentCode(s,reset));row.append(reset);
      }else{
        const toggle=document.createElement('button');toggle.className='button small'+(s.status==='active'?' danger':'');toggle.type='button';toggle.textContent=s.status==='active'?'Disable':'Reactivate';
        toggle.addEventListener('click',()=>toggleStudentAccess(s,toggle));row.append(toggle);
      }
      actions.append(row);tr.append(actions);tb.append(tr);
    }
  }
  function showPilotCode(code){
    pilotActivationCode=code;$('p8-activation-code').textContent=code;$('p8-code-panel').hidden=false;
  }
  $('p8-copy-code').addEventListener('click',async()=>{if(!pilotActivationCode)return;try{await navigator.clipboard.writeText(pilotActivationCode);notice('p8-student-create-status','Activation code copied. Share privately and do not publish it.','success');}catch{notice('p8-student-create-status','Select the code above and copy it manually.','warn');}});
  $('p8-show-id').addEventListener('click',()=>{const i=$('p8-student-id'),b=$('p8-show-id');i.type=i.type==='password'?'text':'password';b.textContent=i.type==='password'?'Show':'Hide';});
  $('p8-refresh-students').addEventListener('click',loadPilotStudents);
  $('p8-search-students').addEventListener('input',renderPilotStudents);
  $('p8-add-student').addEventListener('submit',async e=>{
    e.preventDefault();if(!isSuperAdmin())return notice('p8-student-create-status','Super Admin required.');
    const email=$('p8-student-email').value.trim().toLowerCase(),studentId=$('p8-student-id').value.trim(),stage=Number($('p8-student-stage').value),group=Number($('p8-student-group').value);
    if(!$('p8-student-confirm').checked)return notice('p8-student-create-status','Confirm these are controlled test credentials.');
    if(!confirm('Create a REAL test Supabase Auth user for '+email+'?\n\nInitial password will equal the test student ID. A separate activation code is required. NO emails will be sent.'))return;
    const b=$('p8-create-student');b.disabled=true;b.textContent='Creating test account…';$('p8-code-panel').hidden=true;pilotActivationCode='';
    try{
      await refreshGrants();if(!isSuperAdmin())throw Error('Super Admin assignment is no longer active.');
      const result=await pilotCall('/api/v1/admin/students',{method:'POST',body:{email,studentId,stage,group,confirm:'two-controlled-test-accounts'}});
      $('p8-student-email').value='';$('p8-student-id').value='';$('p8-student-confirm').checked=false;
      showPilotCode(result.activationCode);
      notice('p8-student-create-status','Real pilot account created. Copy the activation code below NOW; it is only returned once.','success');
      await loadPilotStudents();
    }catch(err){notice('p8-student-create-status','Could not create student: '+err.message+' Check Supabase before retrying.','error');}
    finally{b.disabled=false;b.textContent='Create pending test student';}
  });
  async function resetStudentCode(s,btn){
    if(!confirm('Generate a new private activation code for '+s.email+'? The previous code will stop working.'))return;
    btn.disabled=true;
    try{await refreshGrants();if(!isSuperAdmin())throw Error('Super Admin access required.');
      const result=await pilotCall('/api/v1/admin/students/'+encodeURIComponent(s.id)+'/reset-code',{method:'POST'});
      showPilotCode(result.activationCode);notice('p8-student-create-status','New code generated for '+s.email+'. Copy and share it privately.','success');
    }catch(e){notice('p8-student-directory-status',e.message,'error');}finally{btn.disabled=false;}
  }
  async function toggleStudentAccess(s,btn){
    const next=s.status==='active'?'disabled':'active';
    if(!confirm((next==='disabled'?'DISABLE':'REACTIVATE')+' '+s.email+'? This changes their REAL pilot access, not the live MedHub website.'))return;
    btn.disabled=true;
    try{await refreshGrants();if(!isSuperAdmin())throw Error('Super Admin access required.');
      await pilotCall('/api/v1/admin/students/'+encodeURIComponent(s.id)+'/status',{method:'PATCH',body:{status:next}});
      await loadPilotStudents();
    }catch(e){notice('p8-student-directory-status',e.message,'error');}finally{btn.disabled=false;}
  }

  restoreSandboxSession();
  window.addEventListener('pagehide',()=>{for(const u of objectURLs)URLrevoke(u);});
})();

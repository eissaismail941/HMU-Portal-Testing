// Phase 11 only: accessibility and navigation polish, without touching the tested auth/PDF code.
(() => {
  'use strict';
  const menuButton = document.getElementById('hmu-menu-toggle');
  const menu = document.getElementById('hmu-menu');
  if (menuButton && menu) {
    const close = () => {menu.hidden=true;menuButton.setAttribute('aria-expanded','false');};
    menuButton.addEventListener('click', () => {menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));});
    document.addEventListener('click', e => {if(!menuButton.contains(e.target)&&!menu.contains(e.target))close();});
    document.addEventListener('keydown', e => {if(e.key==='Escape')close();});
    menu.querySelectorAll('a,button').forEach(x=>x.addEventListener('click',close));
  }
  const selectTab = name => document.querySelector(`[data-tab="${name}"]`)?.click();
  document.getElementById('menu-resources')?.addEventListener('click', () => selectTab('library'));
  document.getElementById('menu-account')?.addEventListener('click', () => selectTab('security'));
  document.getElementById('academic-to-library')?.addEventListener('click', () => selectTab('library'));
  // In the Phase 10 JS, stat-stage is updated after the account has been authenticated.
  // Mirror it into the read-only profile card; do not infer or grant permissions on the client.
  const stage=document.getElementById('stat-stage');
  const stageOverview=document.getElementById('overview-stage');
  if(stage&&stageOverview){
    const mirror=()=>{stageOverview.textContent=stage.textContent;};
    new MutationObserver(mirror).observe(stage,{childList:true,characterData:true,subtree:true});
    mirror();
  }
})();

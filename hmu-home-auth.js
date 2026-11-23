(() => {
  'use strict';
  // Phase 11 homepage only. Both destinations remain the proven Phase 10 pages.
  // Only the PUBLIC Supabase publishable key is included. Never embed service_role or secret keys.
  const SUPABASE = 'https://lxmxsymxmpulkkngjfjo.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_-7LnL-kzS1omjDFD5va_0A_Tjdh3m8h';
  const STUDENT_PILOT = 'https://hmu-student-pilot-test.eissaismail941.workers.dev';
  const ADMIN_SESSION = 'hmu-r2-phase5-session-v1';
  const STUDENT_SESSION = 'hmu-phase8-student-pilot-session';
  const $ = id => document.getElementById(id);
  const form = $('hmu-signin-form');
  const submit = $('hmu-signin-submit');
  const status = $('hmu-signin-status');
  const menuButton = $('hmu-menu-toggle');
  const menuPanel = $('hmu-menu-panel');
  let busy = false;

  function notice(message, info=false) {
    status.textContent = message || '';
    status.classList.toggle('is-visible', Boolean(message));
    status.classList.toggle('info', info);
  }
  function setBusy(on) {
    busy = on;
    submit.disabled = on;
    submit.querySelector('span').textContent = on ? 'Checking your account…' : 'Sign in to portal';
  }
  async function request(url, headers, options={}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body,
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(data.error_description || data.msg || data.message || data.error || ('Request failed (HTTP ' + response.status + ').'));
        err.status = response.status;
        throw err;
      }
      return data;
    } catch(e) {
      if (e.name === 'AbortError') throw Error('The connection timed out. Try again.');
      throw e;
    } finally { clearTimeout(timer); }
  }
  function sessionFrom(data, email) {
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      user: { id: data.user.id, email: data.user.email || email }
    };
  }
  function hasAdminRole(grants) {
    return Array.isArray(grants) && grants.some(g => g.is_active === true && (
      (g.role === 'super_admin' && g.college == null && g.stage == null) ||
      (g.college === 'medicine' && ['stage_admin','content_admin','college_admin'].includes(g.role))
    ));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const email = $('hmu-signin-email').value.trim().toLowerCase();
    const password = $('hmu-signin-password').value;
    if (!email || !password) { notice('Enter your email and password.'); return; }
    notice('');
    setBusy(true);
    try {
      // Authenticate ONCE. Determine role on the server, never from email or selected stage.
      const login = await request(SUPABASE + '/auth/v1/token?grant_type=password', {
        apikey: PUBLISHABLE_KEY, Accept:'application/json', 'Content-Type':'application/json'
      }, {method:'POST', body:JSON.stringify({email, password})});
      if (!login.access_token || !login.refresh_token || !login.user?.id) {
        throw Error('Supabase did not return a valid session.');
      }
      const stored = sessionFrom(login, email);
      $('hmu-signin-password').value = '';
      let grants = null;
      let grantsError = null;
      try {
        grants = await request(SUPABASE + '/rest/v1/admin_assignments?select=role,college,stage,is_active&user_id=eq.' + encodeURIComponent(login.user.id), {
          apikey: PUBLISHABLE_KEY, Accept:'application/json', Authorization:'Bearer ' + login.access_token
        });
      } catch (e) { grantsError = e; }
      if (hasAdminRole(grants)) {
        sessionStorage.setItem(ADMIN_SESSION, JSON.stringify(stored));
        sessionStorage.removeItem(STUDENT_SESSION);
        location.assign('admin.html');
        return;
      }
      // No admin grant: verify the STUDENT profile using the existing protected Worker.
      // Do NOT send an `apikey` header to this Worker (CORS permits Authorization).
      let studentError = null;
      try {
        const result = await request(STUDENT_PILOT + '/api/v1/student/me', {
          Authorization:'Bearer ' + login.access_token, Accept:'application/json'
        });
        if (result?.student && result.student.stage != null) {
          sessionStorage.setItem(STUDENT_SESSION, JSON.stringify(stored));
          sessionStorage.removeItem(ADMIN_SESSION);
          location.assign('student.html');
          return;
        }
      } catch (e) { studentError = e; }
      if (grantsError && ![401,403,404].includes(grantsError.status)) {
        throw Error('Your login succeeded, but administrator permissions could not be verified. Please use the existing admin sign-in.');
      }
      if (studentError && ![401,403,404].includes(studentError.status)) {
        throw Error('Your login succeeded, but the student profile could not be checked. Please use the existing student sign-in.');
      }
      throw Error('This account has no active pilot student or administrator assignment. Ask your test administrator for access.');
    } catch(e) {
      $('hmu-signin-password').value = '';
      notice(e.message || 'Sign in could not be completed.');
    } finally { setBusy(false); }
  });

  $('hmu-toggle-password').addEventListener('click', () => {
    const input = $('hmu-signin-password');
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    $('hmu-toggle-password').textContent = showing ? 'Hide' : 'Show';
    $('hmu-toggle-password').setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
  });
  $('hmu-forgot-password').addEventListener('click', () => {
    notice('Ask your test administrator for a password reset. This design test does not change passwords.', true);
  });
  function closeMenu() { menuButton.setAttribute('aria-expanded','false'); menuPanel.hidden = true; }
  menuButton.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!expanded));
    menuPanel.hidden = expanded;
  });
  $('hmu-menu-focus').addEventListener('click', () => {closeMenu(); $('hmu-signin-email').focus();});
  $('hmu-menu-help').addEventListener('click', () => {closeMenu();notice('Student and administrator accounts use the same sign-in. Your role is checked automatically.',true);});
  document.querySelectorAll('[data-action="about"]').forEach(el => el.addEventListener('click', () => {closeMenu();notice('Independent HMU Academic Portal test. Uses the existing Phase 10 student and administrator systems. Not an official university service.',true);}));
  document.addEventListener('click', e => { if (!e.target.closest('.hmu7-menu-wrap')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
})();

(function () {
  if (window.top !== window.self) { window.top.location = window.self.location; }   // anti-clickjacking

  const API = ((window.AUTH_CONFIG || {}).API_BASE || '').replace(/\/$/, '');
  const KEY = 'auth_session';

  const Session = {
    get() {
      try {
        const s = JSON.parse(localStorage.getItem(KEY));
        if (s && s.token && new Date(s.expires_at) > new Date()) return s;
      } catch (e) {}
      localStorage.removeItem(KEY);
      return null;
    },
    set(token, expires_at) { localStorage.setItem(KEY, JSON.stringify({ token, expires_at })); },
    clear() { localStorage.removeItem(KEY); }
  };

  // Returns {ok, status, ...json}. `query` is appended verbatim (used to forward the OAuth request).
  async function api(path, { method = 'GET', body, query = '', auth = true } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const s = auth && Session.get();
    if (s) headers['Authorization'] = 'Bearer ' + s.token;
    try {
      const r = await fetch(API + path + query, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
      const d = await r.json().catch(() => ({}));
      return { ...d, ok: r.ok && d.success !== false, status: r.status };
    } catch (e) {
      return { ok: false, status: 0, message: 'Cannot reach the server. It may be waking up — please try again in a few seconds.' };
    }
  }

  // Only same-folder pages are allowed as post-login targets (blocks open redirects).
  function safeNext(n) {
    return typeof n === 'string' && /^[a-z0-9_-]+\.html(\?[^#\s<>"']*)?$/i.test(n) ? n : null;
  }
  function show(text, ok) {
    const m = document.getElementById('msg');
    m.textContent = text || '';
    m.className = 'text-sm text-center mt-4 ' + (ok ? 'text-green-600' : 'text-red-600');
  }
  function busy(btn, on, label) { btn.disabled = on; btn.textContent = on ? 'Please wait…' : label; }
  function goLogin(next) { location.replace('login.html' + (next ? '?next=' + encodeURIComponent(next) : '')); }
  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    Session.clear();
    location.href = 'login.html';
  }
  // free Render instances sleep: ping early so the server is awake by the time the user submits
  function wake() { try { fetch(API + '/healthz', { mode: 'no-cors' }); } catch (e) {} }
  function safeHref(url) { return typeof url === 'string' && /^https:\/\//i.test(url) ? url : null; }

  wake();
  window.Auth = { API, Session, api, safeNext, show, busy, goLogin, logout, safeHref };
})();

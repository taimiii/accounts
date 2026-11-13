// Shared helpers: session (cleared when the tab closes) and API calls

const Store = {
  get token() { return sessionStorage.getItem('token'); },
  get user() { try { return JSON.parse(sessionStorage.getItem('user')); } catch (e) { return null; } },
  save(token, user) { sessionStorage.setItem('token', token); sessionStorage.setItem('user', JSON.stringify(user)); },
  // The store the user is working in (chosen on the dashboard)
  get storeId() { return sessionStorage.getItem('storeId') || ''; },
  get storeName() { return sessionStorage.getItem('storeName') || ''; },
  setStore(id, name) { sessionStorage.setItem('storeId', id || ''); sessionStorage.setItem('storeName', name || ''); },
  clear() { sessionStorage.clear(); }
};

// can(perm): true if the logged-in user has this permission
function can(perm) {
  const u = Store.user;
  return !!u && (u.perms.indexOf('all') > -1 || u.perms.indexOf(perm) > -1);
}

// api('action', {data}) -> returns data, or throws Error(message)
async function api(action, data) {
  const body = Object.assign({ action: action, token: Store.token }, data || {});
  let res;
  try {
    // No custom headers on purpose: keeps this a simple request that Apps Script accepts
    const r = await fetch(API_URL, { method: 'POST', body: JSON.stringify(body) });
    res = await r.json();
  } catch (e) {
    throw new Error('Cannot reach the server. Check your internet and try again.');
  }
  if (!res.ok) {
    if (res.error === 'SESSION_EXPIRED') { Store.clear(); location.replace('index.html'); }
    throw new Error(res.error === 'SESSION_EXPIRED' ? 'Session expired. Please sign in again.' : res.error);
  }
  return res.data;
}


// ---------- Brand: logo, favicon and header logo (shared by every page) ----------
const Brand = (function () {
  let n = 0;
  function svg(size) {   // invoice sheet with a green "paid" tick
    const id = 'bg' + (++n);
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 64 64" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs>' +
      '<rect width="64" height="64" rx="16" fill="url(#' + id + ')"/>' +
      '<path d="M19 11h20l9 9v31a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3V14a3 3 0 0 1 3-3z" fill="#fff"/>' +
      '<path d="M39 11v9h9z" fill="#c7d2fe"/>' +
      '<rect x="22" y="26" width="18" height="3" rx="1.5" fill="#2563eb"/>' +
      '<rect x="22" y="33" width="13" height="3" rx="1.5" fill="#93c5fd"/>' +
      '<circle cx="44" cy="44" r="11" fill="#10b981" stroke="#fff" stroke-width="2.5"/>' +
      '<path d="M39 44.5l3.6 3.6 6.4-7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function init() {
    if (!document.querySelector('link[rel="icon"]')) {
      const l = document.createElement('link'); l.rel = 'icon'; l.type = 'image/svg+xml';
      l.href = 'data:image/svg+xml,' + encodeURIComponent(svg(64)); document.head.appendChild(l);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      const m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#2563eb'; document.head.appendChild(m);
    }
    const h = document.querySelector('header');   // every screen header gets the logo (it links to the dashboard)
    if (h && h.querySelector('.who') && !h.querySelector('.logo')) {
      const a = document.createElement('a'); a.className = 'logo'; a.href = 'app.html'; a.title = 'Dashboard'; a.innerHTML = svg(34);
      h.insertBefore(a, h.firstChild);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return { svg: svg };
})();

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

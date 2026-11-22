/* =====================================================================
   EISEN OS PRIME 11.0 · Núcleo PRIME (arranque; se carga después de settings10.js)
   No sustituye nada de 8.0/9.0/10.0: amplía el núcleo EISENKU (K) por sus puntos de extensión.
   - Capacidades reales del dispositivo (descargas, ventanas, compartir, cámara, TV, nivel de rendimiento).
   - Persistencia duradera: espejo de TODOS los datos en IndexedDB, reparación y recuperación.
   - Diario de cambios de ajustes con «deshacer».
   - Sincronización en vivo entre pestañas, sesiones abiertas y protección de perfil.
   - Instalación integrada: escritorio + Inicio automáticos y registro real de apps.
   - Instalación virtual de apps web (método según el dispositivo) y política de apertura.
   - Descargas virtuales: todo lo descargado queda dentro de EISEN y se abre aquí.
   - Seguridad: enlaces externos, JSON seguro, pegado seguro, archivos peligrosos, errores aislados.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU; if (!E || !K || !K.ready) return;
  const S = E.storage, esc = E.esc, tr = K.tr, $ = K.$, $$ = K.$$, html = document.documentElement;
  const now = () => Date.now();
  const P = K.prime = K.prime || {};
  P.version = '11.0.0'; P.t0 = now();
  const UA = navigator.userAgent || '';
  const mm = q => { try { return matchMedia(q).matches; } catch { return false; } };
  const appOf = id => E.REG[id] || E.apps().find(a => a.id === id) || null;
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
  Object.assign(K.PREF_DEF, { p11AutoDesk: true, p11AutoStart: true, p11Haptics: true, p11Hints: true, p11Gestures: true, p11IdleClose: 'auto', p11Prefetch: true, p11SysNotif: false, p11Group: true, p11BigTargets: false, p11Ruler: false, p11Underline: false, p11Spacing: false, p11FocusMask: false, p11Keys: false, p11Glow: true, p11Labels: 'shadow', p11Sound: 'off', p11DynWall: false, p11StartFull: false, p11TypeSearch: true, p11DeskLock: false, p11Quiet: '', p11Sticky: false, p11Tablet: 'auto', p11WakeLock: true, p11Freeze: true, p11Summary: true });

  /* ================= 1. Capacidades del dispositivo ================= */
  const caps = P.caps = (() => {
    const xbox = /Xbox/i.test(UA), tvua = /SmartTV|SMART-TV|Tizen|Web0S|webOS|NetCast|AFT[A-Z]{1,4}\b|BRAVIA|HbbTV|PlayStation|Nintendo|CrKey|Roku/i.test(UA);
    const inapp = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|; wv\)|TikTok|Snapchat|GSA\//i.test(UA);
    const ios = /iP(hone|od|ad)/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)') || navigator.standalone === true;
    const touch = mm('(pointer:coarse)') || (navigator.maxTouchPoints || 0) > 0;
    const anchorDl = 'download' in HTMLAnchorElement.prototype;
    let shareFiles = false; try { shareFiles = !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] })); } catch { shareFiles = false; }
    const c = { xbox, tv: xbox || tvua, inapp, ios, android: /Android/i.test(UA), standalone, touch, finePointer: mm('(pointer:fine)'), download: anchorDl && !xbox && !tvua && !inapp && !(ios && standalone), popup: !inapp && !tvua, share: !!navigator.share, shareFiles, camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), cores: navigator.hardwareConcurrency || 2, mem: navigator.deviceMemory || 0, bc: 'BroadcastChannel' in window, idb: 'indexedDB' in window, wakeLock: 'wakeLock' in navigator, vibrate: 'vibrate' in navigator, badge: 'setAppBadge' in navigator, notif: 'Notification' in window, pwa: false };
    let s = (c.cores >= 8 ? 2 : c.cores >= 4 ? 1 : 0) + (c.mem >= 8 ? 2 : c.mem >= 4 ? 1 : c.mem ? 0 : 1);
    if (c.tv) s -= 1; if (/Android [4-8]\b|CPU OS 1[0-2]_/.test(UA)) s -= 1;
    c.tier = s >= 3 ? 'high' : s >= 1 ? 'mid' : 'low';
    // ajustes forzados por el usuario (Configuración › Tienda: «Este dispositivo puede descargar archivos»…)
    Object.assign(c, S.get('prime_caps_force', {}) || {});
    return c;
  })();
  html.classList.toggle('p11-tv', caps.tv); html.classList.toggle('p11-xbox', caps.xbox); html.dataset.tier = caps.tier;
  // instalación de EISEN como app (PWA) cuando el navegador lo ofrece
  let bip = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); bip = e; caps.pwa = true; K.emit('prime:pwa'); });
  P.installPWA = async () => { if (!bip) return false; bip.prompt(); const r = await bip.userChoice.catch(() => null); bip = null; caps.pwa = false; return !!(r && r.outcome === 'accepted'); };

  /* ================= 2. JSON seguro (anti contaminación de prototipos) ================= */
  P.safeParse = (txt, def = null) => { try { return JSON.parse(String(txt), (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v); } catch { return def; } };
  const jsonOk = v => { try { JSON.parse(v); return true; } catch { return false; } };

  /* ================= 3. Persistencia duradera: espejo en IndexedDB ================= */
  const PID = String(K.profileId || 'default').replace(/[^\w-]/g, '');
  const MIRROR_RE = /^eisen(ku_sys)?_/;
  // registros que se regeneran solos: no se copian al espejo (menos escrituras en equipos modestos)
  const MIRROR_SKIP = /^eisen_(os10_eventlog|os9_activity|notif_log|os10_connlog|prime_session|prime_bootloop|prime_journal|os10_svc_stats)$/;
  let mdbP = null;
  const mdb = () => mdbP || (mdbP = new Promise((res, rej) => { try { const r = indexedDB.open('eisenprime_' + PID, 1); r.onupgradeneeded = () => { const d = r.result; ['kv', 'meta'].forEach(n => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: n === 'kv' ? 'k' : 'id' }); }); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('IndexedDB bloqueada')); } catch (e) { rej(e); } }));
  const idbAll = store => mdb().then(db => new Promise((res, rej) => { const q = db.transaction(store, 'readonly').objectStore(store).getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); }));
  const idbPut = (store, obj) => mdb().then(db => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(obj); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); }));
  const idbClear = store => mdb().then(db => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).clear(); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); }));
  const dirty = new Map(); let ft = 0, flushing = false, mirrorOn = !!caps.idb, mirrorErr = '';
  P.mirror = { last: 0, keys: 0, writes: 0 };
  P.syncState = mirrorOn ? 'saved' : 'off';
  const setState = st => { if (P.syncState !== st) { P.syncState = st; K.emit('prime:state', st); } };
  const schedule = () => { if (!mirrorOn) return; setState('saving'); if (!ft) ft = setTimeout(flush, 900); };
  async function flush() {
    clearTimeout(ft); ft = 0;
    if (!dirty.size) { setState(mirrorErr ? 'error' : 'saved'); return true; }
    if (flushing) { schedule(); return false; }
    flushing = true; const batch = [...dirty]; dirty.clear();
    try {
      const db = await mdb();
      await new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'), st = t.objectStore('kv'); batch.forEach(([k, v]) => v === null ? st.delete(k) : st.put({ k, v, t: now() })); t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
      P.mirror.last = now(); P.mirror.writes += batch.length; mirrorErr = ''; setState(dirty.size ? 'saving' : 'saved');
    } catch (e) { mirrorErr = String((e && e.message) || e); batch.forEach(([k, v]) => { if (!dirty.has(k)) dirty.set(k, v); }); setState('error'); }
    flushing = false; if (dirty.size) schedule(); return !mirrorErr;
  }
  P.flush = flush;
  // diario de cambios de ajustes (para «Deshacer»)
  const JR_KEEP = /^eisen_(theme|accent|wp|customWallpaper|env|lang|os9_prefs|icon_size|pinned|start_pins|desk_items|installed|os9_widgets|os10_iconpack|os10_theme_vars|os10_panels|save_mode|snap|dbl_open|user_name|user_avatar|os9_region|os9_hour|os9_desk_names|os10_dispcustom|os10_disp_active|user_apps)$/;
  let journal = (S.get('prime_journal', []) || []).filter(x => x && x.k), jt = 0;
  const jsave = () => { clearTimeout(jt); jt = setTimeout(() => { try { rawSet.call(localStorage, 'eisen_prime_journal', JSON.stringify(journal.slice(0, 40))); } catch { /* sin espacio */ } }, 700); };
  function jrec(k, before) { const t = now(), last = journal[0]; if (last && last.k === k && t - last.t < 4000) { last.t = t; return; } journal.unshift({ k, b: before, t }); if (journal.length > 40) journal.length = 40; jsave(); K.emit('prime:journal'); }
  P.journal = {
    list: () => journal.slice(),
    undo(i) { const j = journal[i]; if (!j) return false; try { if (j.b == null) rawRemove.call(localStorage, j.k); else rawSet.call(localStorage, j.k, j.b); dirty.set(j.k, j.b); schedule(); } catch { return false; } journal.splice(i, 1); jsave(); K.seclog && K.seclog('settings', 'Deshecho el cambio de ' + j.k.slice(6)); return true; },
    clear() { journal = []; jsave(); K.emit('prime:journal'); }
  };
  // liberar espacio automáticamente si localStorage se llena (recorta registros, nunca datos del usuario)
  const isQuota = e => !!e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');
  const TRIM = [['os10_eventlog', 300], ['os9_activity', 120], ['os9_seclog', 100], ['notif_log', 30], ['browser_history', 200], ['os10_clip', 15], ['dom_chat', 20], ['os10_connlog', 100]];
  function freeSpace() {
    let freed = 0;
    TRIM.forEach(([k, keep]) => { try { const v = localStorage.getItem('eisen_' + k); if (!v) return; const a = P.safeParse(v, null); if (!Array.isArray(a) || a.length <= keep) return; const nv = JSON.stringify(a.slice(0, keep)); rawSet.call(localStorage, 'eisen_' + k, nv); freed += v.length - nv.length; } catch { /* seguir */ } });
    if (freed) setTimeout(() => { K.log && K.log('warn', 'storage', 'Almacenamiento lleno: se liberaron ' + K.fmt.bytes(freed * 2) + ' recortando registros'); }, 0);
    return freed > 0;
  }
  P.freeSpace = freeSpace;
  // interceptor de escritura: espejo + diario + bloqueo de pestaña obsoleta + reintento por cuota
  const SP = Storage.prototype, rawSet = SP.setItem, rawRemove = SP.removeItem, rawGet = SP.getItem;
  P.writeLock = false;
  const remoteLock = new Set();
  const isLS = st => { try { return st === window.localStorage; } catch { return false; } };
  SP.setItem = function (k, v) {
    if (typeof k === 'string' && MIRROR_RE.test(k) && isLS(this)) {
      if (P.writeLock && k.startsWith('eisen_')) return undefined;
      if (remoteLock.has(k)) return undefined;
      const before = JR_KEEP.test(k) ? rawGet.call(this, k) : undefined;
      v = String(v);
      try { rawSet.call(this, k, v); }
      catch (e) { if (isQuota(e) && freeSpace()) rawSet.call(this, k, v); else { if (mirrorOn) { dirty.set(k, v); schedule(); } throw e; } }
      if (mirrorOn && !MIRROR_SKIP.test(k)) { dirty.set(k, v); schedule(); }
      if (before !== undefined && before !== v && (before == null || before.length < 20000)) jrec(k, before);
      return undefined;
    }
    return rawSet.call(this, k, v);
  };
  SP.removeItem = function (k) {
    if (typeof k === 'string' && MIRROR_RE.test(k) && isLS(this)) {
      if (P.writeLock && k.startsWith('eisen_')) return undefined;
      rawRemove.call(this, k); if (mirrorOn && !MIRROR_SKIP.test(k)) { dirty.set(k, null); schedule(); } return undefined;
    }
    return rawRemove.call(this, k);
  };
  const lsKeys = () => { const o = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && MIRROR_RE.test(k)) o.push(k); } } catch { /* sin acceso */ } return o; };
  async function fullPass() { if (!mirrorOn) return; lsKeys().filter(k => !MIRROR_SKIP.test(k)).forEach(k => { const v = rawGet.call(localStorage, k); if (v != null) dirty.set(k, v); }); P.mirror.keys = dirty.size; await flush(); await idbPut('meta', { id: 'full', at: now(), keys: P.mirror.keys }).catch(() => {}); }
  P.mirror.export = async () => { await flush(); const all = await idbAll('kv'); const d = {}; all.forEach(x => { if (/^eisen_/.test(x.k)) d[x.k] = x.v; }); return d; };
  P.mirror.restoreAll = async () => { const all = await idbAll('kv'); let n = 0; all.forEach(x => { try { rawSet.call(localStorage, x.k, x.v); n++; } catch { /* sin espacio */ } }); return n; };
  P.mirror.clear = () => idbClear('kv');
  async function bootCheck() {
    if (!mirrorOn) return;
    let all = []; try { all = await idbAll('kv'); } catch (e) { mirrorOn = false; setState('off'); mirrorErr = String(e && e.message || e); return; }
    if (!all.length) return fullPass();
    const m = new Map(all.map(x => [x.k, x]));
    // (c4) datos dañados: JSON inválido en localStorage pero válido en el espejo
    let fixed = 0;
    lsKeys().forEach(k => { const v = rawGet.call(localStorage, k), x = m.get(k); if (v == null || !x || x.v === v || jsonOk(v) || !jsonOk(x.v)) return; try { rawSet.call(localStorage, k, x.v); fixed++; } catch { /* sin espacio */ } });
    if (fixed) { K.log && K.log('ok', 'storage', 'Reparadas ' + fixed + ' claves dañadas desde el espejo PRIME'); P.notify(tr('Datos reparados'), fixed + ' ' + tr('ajustes dañados se recuperaron automáticamente desde la copia PRIME.'), { icon: '🛟' }); }
    // (c5) borrado de localStorage: arranque «nuevo» pero el espejo conserva un entorno completo
    const userKeys = all.filter(x => /^eisen_/.test(x.k) && !/^eisen_(os9_last_version|os9_schema|os9_migrations|prime_bootloop|prime_session)$/.test(x.k));
    if (K.firstRun9 && m.has('eisen_os9_last_version') && userKeys.length > 6 && !sessionStorage.getItem('eisen_prime_norecover')) return offerRecovery(all);
    return fullPass();
  }
  function offerRecovery(all) {
    const at = Math.max(...all.map(x => x.t || 0));
    E.form({ title: '🛟 ' + tr('Se encontró tu entorno guardado'), html: `<p class="eis-muted">${esc(tr('Este navegador borró los datos de EISEN, pero PRIME conserva una copia de tu entorno'))} (${esc(K.fmt.dt(at))}, ${all.length} ${esc(tr('elementos'))}). ${esc(tr('Incluye apps instaladas, escritorio, ajustes y personalización. Tus archivos siguen en su propia base de datos.'))}</p>`, ok: tr('Recuperar mi entorno'), cancel: tr('Empezar de cero') }).then(async r => {
      if (r) { const n = await P.mirror.restoreAll(); K.seclog && K.seclog('backup', 'Entorno recuperado desde el espejo PRIME (' + n + ' claves)'); location.reload(); }
      else { try { sessionStorage.setItem('eisen_prime_norecover', '1'); } catch { /* ignorar */ } await P.mirror.clear().catch(() => {}); fullPass(); }
    });
  }
  // (c10) almacenamiento persistente: se pide una vez sin molestar (Chromium decide sin preguntar)
  async function persistOnce() {
    try {
      if (!navigator.storage || !navigator.storage.persist) return;
      P.persisted = await navigator.storage.persisted();
      if (!P.persisted && !S.get('prime_persist_asked', false) && !/Firefox/i.test(UA)) { S.set('prime_persist_asked', true); P.persisted = await navigator.storage.persist(); if (P.persisted) K.log && K.log('ok', 'storage', 'Almacenamiento persistente concedido'); }
    } catch { /* sin API */ }
  }
  addEventListener('pagehide', () => { if (dirty.size) flush(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && dirty.size) flush(); });

  /* ================= 4. Notificaciones con acciones y progreso (n1, n2) y anuncios accesibles (y5) ================= */
  const live = K.ui.el('div', { id: 'p11-live', role: 'status', 'aria-live': 'polite', class: 'p11-sr' }); document.body.appendChild(live);
  P.announce = msg => { live.textContent = ''; setTimeout(() => { live.textContent = String(msg || ''); }, 30); };
  P.notify = (title, body = '', o = {}) => {
    const wrap0 = document.getElementById('eis-notes'), before = wrap0 && wrap0.firstElementChild;
    E.notify(title, body, o.icon || '🔔', o.ms || (o.progress != null ? 600000 : (o.actions ? 14000 : 6000)));
    const wrap = document.getElementById('eis-notes'), n = wrap && wrap.firstElementChild;
    const api = { el: null, update() { }, close() { }, done() { } };
    if (o.announce !== false) P.announce(title + '. ' + body);
    if (!n || n === before) return api;
    api.el = n; n.classList.add('p11-note');
    const box = n.querySelector('div'); if (!box) return api;
    if (o.progress != null) { box.insertAdjacentHTML('beforeend', '<div class="p11-nprog" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div>'); }
    if (o.actions && o.actions.length) {
      const row = document.createElement('div'); row.className = 'p11-nact';
      o.actions.forEach(a => { const b = document.createElement('button'); b.type = 'button'; b.className = a.primary ? 'k9-btn pri' : 'k9-btn'; b.textContent = tr(a.label); b.onclick = ev => { ev.stopPropagation(); try { a.run && a.run(); } catch (er) { console.error(er); } if (a.keep !== true) api.close(); }; row.appendChild(b); });
      box.appendChild(row);
    }
    api.update = (pct, text) => { const bar = n.querySelector('.p11-nprog'); if (bar) { bar.firstChild.style.width = Math.max(0, Math.min(100, +pct || 0)) + '%'; bar.setAttribute('aria-valuenow', String(Math.round(+pct || 0))); } if (text != null) { const p = n.querySelector('p'); if (p) p.textContent = text; } };
    api.close = () => { n.classList.add('out'); setTimeout(() => n.remove(), 400); };
    api.done = (text, actions) => { const bar = n.querySelector('.p11-nprog'); if (bar) bar.remove(); if (text) { const p = n.querySelector('p'); if (p) p.textContent = text; } if (actions) { const r = n.querySelector('.p11-nact'); if (r) r.remove(); const row = document.createElement('div'); row.className = 'p11-nact'; actions.forEach(a => { const b = document.createElement('button'); b.type = 'button'; b.className = a.primary ? 'k9-btn pri' : 'k9-btn'; b.textContent = tr(a.label); b.onclick = ev => { ev.stopPropagation(); try { a.run && a.run(); } catch (er) { console.error(er); } api.close(); }; row.appendChild(b); }); box.appendChild(row); } setTimeout(() => api.close(), 12000); };
    if (o.progress != null) api.update(o.progress);
    return api;
  };

  /* ================= 5. Sincronización entre pestañas, sesiones y protección de perfil ================= */
  const TAB = Math.random().toString(36).slice(2, 9);
  const bc = caps.bc ? new BroadcastChannel('eisenprime') : null;
  const peers = P.peers = new Map();
  const meta = () => ({ since: P.t0, title: document.title, ua: (caps.xbox ? 'Xbox · ' : caps.android ? 'Android · ' : caps.ios ? 'iOS · ' : '') + (/Edg\//.test(UA) ? 'Edge' : /Firefox/.test(UA) ? 'Firefox' : /Chrome/.test(UA) ? 'Chrome' : /Safari/.test(UA) ? 'Safari' : 'Navegador') });
  const post = m => { try { if (bc) bc.postMessage(Object.assign({ from: TAB, pid: K.profileId }, m)); } catch { /* cerrado */ } };
  P.tabId = TAB; P.post = post;
  let staleShown = false;
  function lockStale(reason) {
    if (staleShown) return; staleShown = true; P.writeLock = true; setState('off');
    K.seclog && K.seclog('account', 'Pestaña bloqueada para proteger tus datos (' + reason + ')', 'warn');
    const ov = K.ui.el('div', { class: 'eis-modal p11-stale', role: 'alertdialog', 'aria-modal': 'true' });
    ov.innerHTML = `<div class="eis-modal-card"><h3>🔒 ${esc(tr(reason === 'closed' ? 'Sesión cerrada desde otra pestaña' : 'Se cambió de perfil en otra pestaña'))}</h3><p class="eis-muted">${esc(tr('Para no mezclar ni perder datos, esta pestaña ya no guarda cambios. Recárgala para continuar con el perfil activo.'))}</p><div class="eis-modal-btns"><button class="btn-primary" data-r>${esc(tr('Recargar'))}</button></div></div>`;
    ov.querySelector('[data-r]').onclick = () => location.reload(); document.body.appendChild(ov);
  }
  P.lockStale = lockStale;
  if (bc) bc.onmessage = e => {
    const d = e.data || {}; if (!d.from || d.from === TAB) return;
    if (d.t === 'hello' || d.t === 'beat') { peers.set(d.from, Object.assign({ at: now(), pid: d.pid }, d)); if (d.t === 'hello') post(Object.assign({ t: 'beat' }, meta())); K.emit('prime:peers'); }
    else if (d.t === 'bye') { peers.delete(d.from); K.emit('prime:peers'); }
    else if (d.t === 'profile' && d.pid === K.profileId) lockStale('profile');
    else if (d.t === 'closeothers' && d.keep !== TAB) { lockStale('closed'); try { window.close(); } catch { /* no se puede */ } }
    else if (d.t === 'ping-sync') post({ t: 'pong-sync', state: P.syncState });
    else if (d.t && P.onMessage && P.onMessage[d.t]) { try { P.onMessage[d.t](d); } catch (er) { console.error(er); } }
  };
  P.onMessage = {};
  P.closeOtherSessions = () => post({ t: 'closeothers', keep: TAB });
  post(Object.assign({ t: 'hello' }, meta()));
  setInterval(() => { if (!document.hidden) post(Object.assign({ t: 'beat' }, meta())); const lim = now() - 70000; peers.forEach((v, k) => { if (v.at < lim) { peers.delete(k); K.emit('prime:peers'); } }); }, 25000);
  addEventListener('pagehide', () => post({ t: 'bye' }));
  // (c3) cambio de perfil en esta pestaña: avisar a las demás antes de vaciar localStorage
  if (K.profiles && K.profiles.switchTo) { const sw0 = K.profiles.switchTo; K.profiles.switchTo = async id => { if (id === K.profileId) return sw0(id); await flush(); mirrorOn = false; post({ t: 'profile', id }); return sw0(id); }; }
  // (c2) cambios hechos en otra pestaña del mismo perfil: se aplican en vivo
  const deb = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };
  const rerender = deb(() => { try { E.desktopRender && E.desktopRender(); } catch (e) { console.error(e); } try { E.renderBarForce && E.renderBarForce(); } catch (e) { console.error(e); } K.emit('prime:synced'); }, 150);
  function syncUserApps() { const list = E.apps(), users = S.get('user_apps', []) || []; for (let i = list.length - 1; i >= 0; i--) if (list[i].user) list.splice(i, 1); users.forEach(u => list.push(Object.assign({ user: true, web: true }, u))); }
  P.syncUserApps = syncUserApps;
  let reloadPill = null;
  function askReload(what) {
    if (reloadPill || P.writeLock) return;
    reloadPill = P.notify(tr('Cambios en otra pestaña'), tr('Se cambió') + ' ' + tr(what) + ' ' + tr('en otra pestaña de EISEN.'), { icon: '🔄', actions: [{ label: 'Aplicar ahora', primary: true, run: () => location.reload() }, { label: 'Más tarde' }] });
    setTimeout(() => { reloadPill = null; }, 15000);
  }
  const APPLY = {
    desk_items(v) { if (v == null) return; const n = P.safeParse(v, null); const it = E.desktopItems && E.desktopItems(); if (!Array.isArray(n) || !it) return; remoteLock.add('eisen_desk_items'); try { it.splice(0, it.length, ...n); E.desktopRender && E.desktopRender(); } finally { remoteLock.delete('eisen_desk_items'); } K.emit('prime:synced'); },
    installed: () => rerender(), pinned: () => rerender(), start_pins: () => rerender(),
    user_apps: () => { syncUserApps(); rerender(); },
    os9_prefs: () => { try { K.applyPrefs && K.applyPrefs(); } catch (e) { console.error(e); } },
    os9_widgets: () => { try { K.widgets.render(); } catch { /* ignorar */ } },
    wp: v => { const w = P.safeParse(v, ''); if (w && w !== 'custom' && E.WALLPAPERS && E.WALLPAPERS[w]) { remoteLock.add('eisen_wp'); remoteLock.add('eisen_customWallpaper'); try { E.setWp(w); } finally { remoteLock.delete('eisen_wp'); remoteLock.delete('eisen_customWallpaper'); } } },
    customWallpaper: v => { const u = P.safeParse(v, ''); if (u && /^(https:|data:image)/.test(u)) { remoteLock.add('eisen_wp'); remoteLock.add('eisen_customWallpaper'); try { E.setWallpaperUrl(u, false); } finally { remoteLock.delete('eisen_wp'); remoteLock.delete('eisen_customWallpaper'); } } },
    theme: () => askReload('el tema'), accent: () => askReload('el color de acento'), env: () => askReload('el entorno Windows/Linux'), lang: () => askReload('el idioma'), os9_packages: () => askReload('una app de terceros')
  };
  addEventListener('storage', e => {
    try {
      if (e.storageArea !== localStorage || !e.key) return;
      if (e.key === 'eisenku_sys_active' && e.newValue && P.safeParse(e.newValue, '') !== K.profileId) return lockStale('profile');
      if (!e.key.startsWith('eisen_') || P.writeLock) return;
      if (e.newValue == null && /^eisen_(desk_items|installed|pinned|start_pins|user_apps)$/.test(e.key)) return;   // vaciados masivos (cambio de perfil, restablecer): no se aplican aquí
      const f = APPLY[e.key.slice(6)]; if (f) f(e.newValue);
    } catch (er) { console.error('[PRIME] sync', er); }
  });

  /* ================= 6. Registro real de apps e integración con escritorio e Inicio ================= */
  const REGK = 'prime_registry', DEF_START = ['explorer', 'browser', 'appcenter', 'assistant', 'word', 'excel', 'notes', 'tasks', 'calendar', 'calc', 'paint', 'weather', 'music', 'arcade', 'wiki', 'settings', 'terminal', 'camera'];
  const kindOf = a => !a ? 'app' : a.pkg ? 'android' : (E.REG[a.id] || {}).thirdParty ? 'package' : a.game ? 'game' : (a.web || a.user || a.ext) ? 'web' : 'app';
  const reg = P.reg = {
    all: () => S.get(REGK, {}) || {},
    get: id => reg.all()[id] || null,
    patch(id, p) { const m = reg.all(); m[id] = Object.assign(m[id] || {}, p); S.set(REGK, m); return m[id]; },
    // apps instaladas con su ficha completa (nombre, tipo, método, fecha, usos…)
    installed() { const m = reg.all(); return E.installedApps().filter(a => a.id !== 'deskfolder').map(a => Object.assign({ id: a.id, name: a.name, icon: a.icon, img: a.img, cat: a.cat, kind: kindOf(a), method: P.methodOf(a.id), ver: (K.appVerOf ? K.appVerOf(a.id) : '') || '' }, m[a.id] || {}, { name: a.name })); },
    usage: id => (reg.all()[id] || {}).n || 0,
    topUsed(n = 8) { const m = reg.all(); return Object.keys(m).filter(id => m[id].n && E.isInstalled(id) && appOf(id)).sort((a, b) => (m[b].n || 0) - (m[a].n || 0)).slice(0, n); },
    recent(n = 6) { const m = reg.all(); return Object.keys(m).filter(id => m[id].on && m[id].at && E.isInstalled(id) && appOf(id) && now() - m[id].at < 30 * 86400000).sort((a, b) => m[b].at - m[a].at).slice(0, n); },
    exportList() { return { eisenapps: 1, at: new Date().toISOString(), apps: reg.installed().map(a => ({ id: a.id, name: a.name, kind: a.kind, method: a.method, ext: (appOf(a.id) || {}).ext || undefined })) }; },
    // (t8) importar lista: instala las que existan en el catálogo y añade las apps web que falten
    importList(o) { if (!o || o.eisenapps !== 1 || !Array.isArray(o.apps)) throw new Error(tr('No es una lista de apps de EISEN')); const ids = []; o.apps.slice(0, 400).forEach(x => { if (!x || typeof x.id !== 'string' || !/^[\w.-]{1,60}$/.test(x.id)) return; if (appOf(x.id)) ids.push(x.id); else if (x.kind === 'web' && typeof x.ext === 'string' && /^https:\/\//i.test(x.ext) && x.ext.length < 2000) { const users = (S.get('user_apps', []) || []).filter(u => u.id !== x.id); users.push({ id: x.id, name: String(x.name || hostOf(x.ext)).replace(/[<>]/g, '').slice(0, 40), ext: x.ext, cat: 'Internet', desc: tr('App importada'), icon: '🌐', img: '' }); S.set('user_apps', users); syncUserApps(); ids.push(x.id); } }); return P.bulkInstall(ids, tr('Apps importadas')); }
  };
  P.markNew = id => { const m = S.get('prime_new', {}) || {}; m[id] = now(); S.set('prime_new', m); };
  P.isNew = id => { const m = S.get('prime_new', {}) || {}; return !!m[id] && now() - m[id] < 7 * 86400000; };
  let bulk = null;
  P.addToDesktop = (id, folderId) => {
    const it = E.desktopItems && E.desktopItems(); const a = appOf(id); if (!it || !a) return false;
    if (it.some(x => x.t === 'app' && x.ref === id)) return false;
    it.push({ id: 'd-' + E.uid(), t: 'app', ref: id, name: a.name, p: folderId || null }); E.desktopRender && E.desktopRender(); return true;
  };
  P.addToStart = id => { let sp = S.get('start_pins', null); if (!Array.isArray(sp)) sp = DEF_START.slice(); if (!sp.includes(id)) { sp.push(id); S.set('start_pins', sp); } };
  // (t6, t7) instalación múltiple: los accesos directos se agrupan en una carpeta del escritorio
  P.bulkInstall = (ids, label) => {
    ids = [...new Set(ids)].filter(id => appOf(id)); if (!ids.length) return 0;
    const it = E.desktopItems && E.desktopItems(); let fid = null;
    if (it && ids.length > 2 && K.pref('p11AutoDesk') !== false) { const name = String(label || tr('Apps')).slice(0, 40); const ex = it.find(x => x.t === 'folder' && x.name === name); fid = ex ? ex.id : 'f-' + E.uid(); if (!ex) it.push({ id: fid, t: 'folder', name, icon: '📦' }); }
    bulk = { fid }; let n = 0;
    try { ids.forEach(id => { if (!E.isInstalled(id)) { E.setInstalled(id, true); n++; } else if (fid) P.addToDesktop(id, fid); }); } finally { bulk = null; }
    E.desktopRender && E.desktopRender(); E.renderBarForce && E.renderBarForce();
    return n;
  };
  P.bulkUninstall = ids => { let n = 0; ids.forEach(id => { if (!E.CORE_APPS.includes(id) && E.isInstalled(id)) { E.setInstalled(id, false); const w = document.getElementById('win-' + id); if (w && w.classList.contains('open')) { const x = w.querySelector('[data-act="close"]'); x && x.click(); } n++; } }); return n; };
  let booted = false;
  document.addEventListener('eisen:installed', e => {
    const d = e.detail || {}; if (!d.id || typeof d.id !== 'string') return;
    const a = appOf(d.id);
    if (d.on) {
      reg.patch(d.id, { on: true, at: now(), name: a ? a.name : d.id, kind: kindOf(a), method: P.methodOf(d.id), ver: (K.appVerOf && K.appVerOf(d.id)) || '', removed: null });
      if (!booted || !a) return;
      if (K.pref('p11AutoDesk') !== false) P.addToDesktop(d.id, bulk && bulk.fid);
      if (K.pref('p11AutoStart') !== false) P.addToStart(d.id);
      P.markNew(d.id); P.announce(tr('Instalada') + ': ' + a.name);
      K.emit('prime:installed', d.id);
    } else { reg.patch(d.id, { on: false, removed: now() }); K.emit('prime:installed', d.id); }
  });
  document.addEventListener('eisen:open', e => { const id = e.detail; if (!id || typeof id !== 'string' || id.startsWith('wapp-') || id === 'deskfolder' || !appOf(id)) return; const r = reg.get(id) || {}; reg.patch(id, { n: (r.n || 0) + 1, last: now() }); const nw = S.get('prime_new', {}) || {}; if (nw[id]) { delete nw[id]; S.set('prime_new', nw); } });

  /* ================= 7. Instalación virtual y política de apertura de apps web (t4, t5, w5) ================= */
  // Sitios que no permiten mostrarse dentro de otra página ni a través de un proxy (mensajería, cuentas, streaming con DRM)
  const EXTERNAL = /(^|\.)(whatsapp\.com|web\.telegram\.org|telegram\.org|discord\.com|mail\.google\.com|outlook\.live\.com|outlook\.office\.com|meet\.google\.com|teams\.microsoft\.com|netflix\.com|instagram\.com|tiktok\.com|facebook\.com|messenger\.com|x\.com|twitter\.com|docs\.google\.com|drive\.google\.com|classroom\.google\.com|office\.com|notion\.so|figma\.com|canva\.com|disneyplus\.com|primevideo\.com|max\.com|xbox\.com|xbox\.gg|music\.youtube\.com|chatgpt\.com|claude\.ai|gemini\.google\.com|duolingo\.com|zoom\.us|slack\.com|linkedin\.com)$/i;
  P.METHODS = { internal: 'App integrada', eisen: 'Navegador EISEN', appwin: 'Ventana de app EISEN', external: 'Ventana externa (PWA)', sandbox: 'Espacio aislado' };
  P.methodOf = id => {
    const a = appOf(id); if (!a) return 'internal';
    if ((E.REG[id] || {}).thirdParty) return 'sandbox';
    if (!(a.ext || a.url)) return 'internal';
    const chosen = ((S.get('prime_methods', {}) || {})[id]);
    if (chosen && P.METHODS[chosen]) return chosen;
    return P.autoMethod(a.ext || a.url);
  };
  P.autoMethod = url => { const h = hostOf(url); if (EXTERNAL.test(h)) return caps.popup ? 'external' : 'eisen'; return caps.tv || innerWidth < 760 ? 'appwin' : 'eisen'; };
  P.setMethod = (id, m) => { const all = S.get('prime_methods', {}) || {}; if (m && P.METHODS[m]) all[id] = m; else delete all[id]; S.set('prime_methods', all); reg.patch(id, { method: P.methodOf(id) }); };
  P.openExternal = (url, name) => {
    if (!/^https:\/\//i.test(String(url))) { E.toast(tr('Solo se abren enlaces seguros (https)')); return false; }
    let w = null;
    try { w = caps.popup && caps.finePointer && innerWidth > 900 && !caps.tv ? window.open(url, 'eisenapp_' + hostOf(url).replace(/\W/g, '_'), 'popup=yes,width=1180,height=780') : window.open(url, '_blank'); } catch { w = null; }
    if (w) { try { w.opener = null; } catch { /* otro origen */ } K.activity && K.activity('app', 'external', name || hostOf(url)); return true; }
    // el navegador bloqueó la ventana: enlace real que el usuario pulsa (gesto directo)
    E.form({ title: '↗ ' + (name || hostOf(url)), html: `<p class="eis-muted">${esc(tr('Este servicio no se puede mostrar dentro de una página: se abre en una ventana o pestaña real de tu navegador.'))}</p><p><a class="btn-primary p11-extlink" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(tr('Abrir'))} ${esc(name || hostOf(url))} ↗</a></p>`, ok: tr('Cerrar'), cancel: tr('Cancelar') });
    return false;
  };
  P.openAppWindow = async (a) => {
    const id = 'wapp-' + String(a.id).replace(/[^\w-]/g, ''), url = a.ext || a.url;
    if (!E.REG[id]) E.REG[id] = { id, name: a.name, icon: a.icon || '🌐', img: a.img || '', cat: a.cat || 'Internet', noStore: true, launch: () => P.openAppWindow(a) };
    const w = E.createAppWindow({ id, name: a.name, title: a.name, icon: a.icon || '🌐', img: a.img || '', cat: a.cat || 'Internet', w: 1040, h: 700, pad: false });
    w.classList.add('p11-appwin');
    if (!w.__p11) {
      w.__p11 = true; const body = w.querySelector('.app-body');
      body.innerHTML = `<div class="p11-awbar"><span class="p11-awhost">🔒 ${esc(hostOf(url))}</span><button class="k9-btn" data-aw="reload" title="${esc(tr('Recargar'))}">↻</button><button class="k9-btn" data-aw="browser">${esc(tr('Abrir en el navegador EISEN'))}</button><button class="k9-btn" data-aw="ext">↗ ${esc(tr('Ventana real'))}</button></div><iframe class="p11-awframe" title="${esc(a.name)}" referrerpolicy="no-referrer-when-downgrade" allow="clipboard-write; fullscreen; autoplay; encrypted-media"></iframe><div class="p11-awnote" hidden></div>`;
      const f = body.querySelector('iframe'), note = body.querySelector('.p11-awnote');
      const load = async () => {
        let mode = 'direct';
        try { if (E.ebHaveProxy && E.ebHaveProxy()) mode = (await E.ebProbe(url)) ? 'direct' : 'server'; } catch { mode = 'direct'; }
        if (mode === 'server' && E.ebSameOriginProxy && E.ebSameOriginProxy()) f.setAttribute('sandbox', E.EB_SANDBOX); else f.removeAttribute('sandbox');
        f.src = mode === 'server' ? E.ebPrefix() + encodeURIComponent(url) : url;
        note.hidden = mode !== 'direct' || (E.ebHaveProxy && E.ebHaveProxy());
        note.innerHTML = `${esc(tr('Si la página aparece en blanco, este sitio no permite mostrarse dentro de otra web.'))} <button class="k9-btn pri" data-aw="ext">↗ ${esc(tr('Abrir en ventana real'))}</button>`;
      };
      body.addEventListener('click', e => { const b = e.target.closest('[data-aw]'); if (!b) return; if (b.dataset.aw === 'reload') load(); if (b.dataset.aw === 'browser') E.ebOpenUrl(url, true); if (b.dataset.aw === 'ext') P.openExternal(url, a.name); });
      load();
    }
    E.openWindow(id);
    document.dispatchEvent(new CustomEvent('eisen:open', { detail: a.id }));
    return true;
  };
  // envoltorio de E.launch: método de apertura + aislamiento de errores (una app que falla no rompe el escritorio)
  const L0 = E.launch;
  E.launch = (id, arg) => {
    try {
      const a = E.apps().find(x => x.id === id), r = E.REG[id];
      if (a && (a.ext || a.url) && !(r && r.launch) && arg == null && E.isInstalled(id)) {
        const m = P.methodOf(id);
        if (m === 'external') { const ok = P.openExternal(a.ext || a.url, a.name); if (ok) document.dispatchEvent(new CustomEvent('eisen:open', { detail: id })); return ok; }
        if (m === 'appwin') return P.openAppWindow(a);
      }
      return L0(id, arg);
    } catch (e) { console.error('[PRIME] launch ' + id, e); K.log && K.log('error', 'app', 'Fallo al abrir ' + id + ': ' + ((e && e.message) || e)); E.toast(tr('No se pudo abrir la app') + ': ' + ((appOf(id) || {}).name || id)); return false; }
  };

  /* ================= 8. Descargas virtuales (sin descargar al dispositivo) ================= */
  const DANGER = /\.(exe|msi|bat|cmd|com|scr|pif|vbs|vbe|js|jse|wsf|wsh|ps1|psm1|apk|xapk|aab|dmg|pkg|app|deb|rpm|sh|run|jar|reg|lnk|hta|cpl|msc|iso|img|vhd)$/i;
  P.isDangerous = name => DANGER.test(String(name || ''));
  // (auto) dispositivos sin descargas (Xbox, TV, navegadores dentro de apps): todo se guarda en EISEN › Descargas
  if (S.get('save_mode', null) == null && !caps.download) { S.set('save_mode', 'vault'); S.set('prime_savemode_auto', true); const sm = $('#cfg-save-mode'); if (sm) sm.value = 'vault'; }
  P.saveMode = () => S.get('save_mode', 'both');
  const DLK = 'prime_downloads';
  const dl = P.downloads = {
    list: () => (S.get(DLK, []) || []).filter(x => x && x.id),
    add(rec) { const l = dl.list().filter(x => x.id !== rec.id); l.unshift(Object.assign({ at: now() }, rec)); S.set(DLK, l.slice(0, 300)); K.emit('prime:downloads'); },
    patch(id, p) { const l = dl.list(), x = l.find(y => y.id === id); if (!x) return; Object.assign(x, p); S.set(DLK, l); K.emit('prime:downloads'); },
    remove(id) { S.set(DLK, dl.list().filter(x => x.id !== id)); K.emit('prime:downloads'); },
    // destino por tipo (f4): organización automática si está activada
    folderFor(name, type) { if (!S.get('prime_dl_sort', false)) return 'downloads'; const k = K.files.kindOf({ name, type }); return { image: 'images', audio: 'music', video: 'videos' }[k] || 'downloads'; }
  };
  // registro de las descargas capturadas por el sistema 8.0/9.0 (enlaces de descarga, exportaciones de apps)
  document.addEventListener('eisen:download', e => { const d = e.detail || {}; if (!d.id) return; dl.add({ id: d.id, name: d.name, size: d.size, type: d.type, src: 'app:' + K.activeApp(), danger: P.isDangerous(d.name) || undefined }); notifyDownload(d.id, d.name, d.size); });
  function notifyDownload(id, name, size) {
    if (P.isDangerous(name)) { P.notify(tr('Archivo potencialmente peligroso'), name + ' · ' + tr('se guardó dentro de EISEN, pero no se abrirá automáticamente. Los programas (.exe, .apk…) no pueden ejecutarse aquí.'), { icon: '⚠️', actions: [{ label: 'Ver en Descargas', run: () => E.launch('downloads') }] }); return; }
    P.notify(tr('Descargado dentro de EISEN'), name + (size ? ' · ' + K.fmt.bytes(size) : ''), { icon: '⬇️', actions: [{ label: 'Abrir', primary: true, run: () => K.files.open(id) }, { label: 'Descargas', run: () => E.launch('downloads') }] });
  }
  P.notifyDownload = notifyDownload;
  // (f2, f3) descargar desde una URL dentro de EISEN: progreso, cancelar, cola y reintento
  const queue = []; let active = 0;
  const MAXDL = 512 * 1024 * 1024;
  P.fetchToVault = (url, o = {}) => new Promise((resolve, reject) => { queue.push({ url, o, resolve, reject }); pump(); });
  P.dlQueue = () => queue.map(x => x.url);
  function nameFrom(url, type, cd) {
    let n = ''; const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd || ''); if (m) { try { n = decodeURIComponent(m[1]); } catch { n = m[1]; } }
    if (!n) { try { n = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || ''); } catch { n = ''; } }
    n = K.files.cleanName(n || 'descarga'); if (!/\.\w{1,8}$/.test(n)) { const ext = { 'text/html': 'html', 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'video/mp4': 'mp4', 'video/webm': 'webm', 'application/json': 'json', 'text/plain': 'txt', 'application/zip': 'zip', 'text/csv': 'csv' }[String(type).split(';')[0]]; if (ext) n += '.' + ext; }
    return n.slice(0, 120);
  }
  async function pump() {
    if (active >= 2 || !queue.length) return;
    const job = queue.shift(); active++;
    const { url, o } = job; const ctrl = new AbortController(); let note = null;
    try {
      if (!/^https?:\/\//i.test(url)) throw new Error(tr('La dirección no es válida'));
      const tries = [url]; try { const a = new URL(url); if (E.ebHaveProxy && E.ebHaveProxy()) tries.push(E.ebPrefix().replace(/\/proxy\?url=$/, '') + '/p/' + a.protocol.slice(0, -1) + '/' + a.host + a.pathname + a.search); } catch { /* ignorar */ }
      let res = null, lastErr = null;
      for (const u of tries) { try { const r = await fetch(u, { signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' }); if (r.ok) { res = r; break; } lastErr = new Error('HTTP ' + r.status); } catch (e) { if (e && e.name === 'AbortError') throw e; lastErr = e; } }
      if (!res) throw lastErr || new Error(tr('No se pudo descargar'));
      const total = +res.headers.get('content-length') || 0; if (total > MAXDL) throw new Error(tr('El archivo supera el límite de 512 MB'));
      const type = (res.headers.get('content-type') || '').split(';')[0].trim();
      const name = o.name ? K.files.cleanName(o.name) : nameFrom(url, type, res.headers.get('content-disposition'));
      note = o.quiet ? null : P.notify(tr('Descargando dentro de EISEN'), name, { icon: '⬇️', progress: 0, actions: [{ label: 'Cancelar', run: () => ctrl.abort() }] });
      let blob;
      if (res.body && res.body.getReader) {
        const rd = res.body.getReader(), parts = []; let got = 0, lastUi = 0;
        for (; ;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; if (got > MAXDL) { ctrl.abort(); throw new Error(tr('El archivo supera el límite de 512 MB')); } if (note && now() - lastUi > 250) { lastUi = now(); note.update(total ? got / total * 100 : 50, name + ' · ' + K.fmt.bytes(got) + (total ? ' / ' + K.fmt.bytes(total) : '')); } o.onProgress && o.onProgress(got, total); }
        blob = new Blob(parts, { type });
      } else blob = await res.blob();
      const folder = o.folder || dl.folderFor(name, type);
      const fname = await K.files.uniqueName(folder, name);
      const id = await K.files.save(fname, blob, folder, { src: url.slice(0, 500) });
      const sha = blob.size <= 64 * 1024 * 1024 ? await K.sha256(await blob.arrayBuffer()) : '';
      dl.add({ id, name: fname, size: blob.size, type: blob.type, src: url.slice(0, 500), folder, sha, danger: P.isDangerous(fname) || undefined });
      K.seclog && K.seclog('files', 'Descargado dentro de EISEN: ' + fname + ' (' + hostOf(url) + ')');
      if (note) note.done(fname + ' · ' + K.fmt.bytes(blob.size), P.isDangerous(fname) ? [{ label: 'Ver en Descargas', run: () => E.launch('downloads') }] : [{ label: 'Abrir', primary: true, run: () => K.files.open(id) }, { label: 'Descargas', run: () => E.launch('downloads') }]);
      P.announce(tr('Descarga completada') + ': ' + fname);
      K.emit('prime:downloaded', { id, name: fname, type: blob.type, folder });
      job.resolve({ id, name: fname, size: blob.size, type: blob.type, folder });
    } catch (e) {
      const msg = e && e.name === 'AbortError' ? tr('Descarga cancelada') : ((e && e.message) || String(e));
      if (note) note.done(msg, e && e.name === 'AbortError' ? null : [{ label: 'Reintentar', primary: true, run: () => P.fetchToVault(url, o) }]);
      else if (!o.quiet) E.toast(msg);
      job.reject(e);
    } finally { active--; pump(); }
  }
  // (w6) enlaces http(s) con atributo download → se guardan dentro de EISEN cuando el modo es «solo en EISEN»
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[download][href]'); if (!a || a.__eisen) return;
    const href = a.href; if (!/^https?:/i.test(href) || P.saveMode() !== 'vault') return;
    e.preventDefault(); a.__eisen = true; P.fetchToVault(href, { name: a.getAttribute('download') || '' }).catch(() => { });
  }, true);
  // window.open de blob:/data: (visores de PDF, exportaciones) → se guardan y se abren dentro de EISEN si no hay descargas
  const wopen0 = window.open;
  window.open = function (url, target, features) {
    const u = String(url == null ? '' : url).trim();
    if (/^javascript:/i.test(u) || /^data:text\/html/i.test(u)) { K.seclog && K.seclog('security', 'Bloqueada ventana con dirección insegura (' + u.slice(0, 30) + '…)', 'warn'); return null; }
    if (/^(blob:|data:)/i.test(u) && (P.saveMode() === 'vault' || !caps.popup)) {
      fetch(u).then(r => r.blob()).then(async b => { const ext = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'text/plain': 'txt', 'text/csv': 'csv', 'image/svg+xml': 'svg' }[b.type] || 'bin'; const n = await K.files.uniqueName('downloads', 'documento.' + ext); const id = await K.files.save(n, b, 'downloads'); dl.add({ id, name: n, size: b.size, type: b.type, src: 'app:' + K.activeApp() }); K.files.open(id); }).catch(() => E.toast(tr('No se pudo abrir el documento')));
      return null;
    }
    return wopen0.apply(window, arguments);
  };

  /* ================= 9. Seguridad: enlaces externos, pegado seguro, errores aislados ================= */
  // (x1) todo enlace que abre otra pestaña se aísla (sin acceso a EISEN) y sin enviar la dirección de EISEN
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    const href = a.getAttribute('href') || '';
    if (/^\s*javascript:/i.test(href)) { e.preventDefault(); K.seclog && K.seclog('security', 'Bloqueado enlace javascript:', 'warn'); return; }
    if (a.target === '_blank' || /^https?:/i.test(href) && a.origin !== location.origin) { const rel = (a.getAttribute('rel') || '').split(/\s+/); ['noopener', 'noreferrer'].forEach(x => { if (!rel.includes(x)) rel.push(x); }); a.setAttribute('rel', rel.join(' ').trim()); }
  }, true);
  // (x4) pegar en editores enriquecidos: el HTML del portapapeles pasa por el saneador (sin scripts ni estilos peligrosos)
  document.addEventListener('paste', e => {
    const t = e.target && e.target.closest && e.target.closest('[contenteditable="true"],[contenteditable=""]'); if (!t || !e.clipboardData) return;
    const h = e.clipboardData.getData('text/html'); if (!h) return;
    if (!/<(script|iframe|object|embed|style|link|meta|form|svg|math)\b|\son\w+\s*=|javascript:/i.test(h)) return;   // HTML limpio: comportamiento normal del editor
    e.preventDefault(); const clean = K.sanitize(h, { style: true });
    if (!document.execCommand('insertHTML', false, clean)) { const r = getSelection().getRangeAt(0); r.deleteContents(); const tpl = document.createElement('template'); tpl.innerHTML = clean; r.insertNode(tpl.content); }
    K.seclog && K.seclog('security', 'Contenido pegado saneado (se quitaron scripts o atributos peligrosos)');
  }, true);

  /* ================= 10. Sesión: cierre inesperado (q3) y bucles de arranque (q2) ================= */
  const prevSess = S.get('prime_session', null);
  const sess = { open: true, at: now(), beat: now(), wins: [] };
  const capture = () => { try { sess.wins = K.layout ? K.layout.capture().slice(0, 12) : []; } catch { sess.wins = []; } };
  const saveSess = () => { if (P.writeLock) return; sess.beat = now(); capture(); try { rawSet.call(localStorage, 'eisen_prime_session', JSON.stringify(sess)); } catch { /* sin espacio */ } };
  setInterval(() => { if (!document.hidden) saveSess(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveSess(); });
  addEventListener('pagehide', () => { sess.open = false; saveSess(); });
  P.unclean = !!(prevSess && prevSess.open && now() - (prevSess.beat || 0) < 7 * 86400000 && Array.isArray(prevSess.wins) && prevSess.wins.length);
  P.prevWins = prevSess && Array.isArray(prevSess.wins) ? prevSess.wins : [];

  /* ================= 10b. Fusión de entornos sin duplicados (c16): la usan Transferir y «Copiar a otro perfil» ================= */
  const LOOKK = /^eisen_(theme|accent|wp|customWallpaper|env|lang|os9_prefs|icon_size|os10_iconpack|os10_theme_vars|os9_widgets|os10_panels|os9_desks|os9_desk_names)$/;
  const keyOf = x => x && typeof x === 'object' ? (x.id != null ? 'id:' + x.id : JSON.stringify(x)) : JSON.stringify(x);
  const union = (a, b, key = keyOf) => { const seen = new Set(a.map(key)), out = a.slice(); b.forEach(x => { const k = key(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }); return out; };
  function mergeDesk(a, b) {
    const out = a.slice(), fmap = {};
    b.filter(x => x && x.t === 'folder').forEach(f => { const ex = out.find(y => y.t === 'folder' && y.name === f.name); if (ex) fmap[f.id] = ex.id; else { const id = out.some(y => y.id === f.id) ? 'f-' + E.uid() : f.id; fmap[f.id] = id; out.push(Object.assign({}, f, { id, x: null, y: null })); } });
    b.filter(x => x && x.t !== 'folder').forEach(it => { const p = it.p ? (fmap[it.p] || null) : null; if (out.some(y => y.t === it.t && (y.ref || y.name) === (it.ref || it.name) && (y.p || null) === p)) return; const id = out.some(y => y.id === it.id) ? 'd-' + E.uid() : it.id; out.push(Object.assign({}, it, { id, p, x: null, y: null })); });
    return out;
  }
  P.mergeEnv = (cur, inc, o = {}) => {
    const out = Object.assign({}, cur), J = v => P.safeParse(v, undefined), W = v => JSON.stringify(v);
    Object.entries(inc || {}).forEach(([k, v]) => {
      if (!/^eisen_[\w.-]{1,80}$/.test(k) || typeof v !== 'string') return;
      if (!(k in out)) { out[k] = v; return; } if (out[k] === v) return;
      if (o.look && LOOKK.test(k)) { out[k] = v; return; }
      const a = J(out[k]), b = J(v), name = k.slice(6);
      if (a === undefined || b === undefined) return;
      if (name === 'installed' && a && b && typeof a === 'object') { Object.keys(b).forEach(id => { if (b[id] === true) a[id] = true; }); out[k] = W(a); return; }
      if (name === 'desk_items' && Array.isArray(a) && Array.isArray(b)) { out[k] = W(mergeDesk(a, b)); return; }
      if ((name === 'pinned' || name === 'start_pins') && Array.isArray(a) && Array.isArray(b)) { out[k] = W([...new Set(a.concat(b))]); return; }
      if (name === 'user_apps' && Array.isArray(a) && Array.isArray(b)) { out[k] = W(union(a, b, x => x && (x.ext || x.id))); return; }
      if (name === 'prime_wa_contacts' && Array.isArray(a) && Array.isArray(b)) { out[k] = W(union(a, b, x => x && x.phone)); return; }
      if (name === 'a9_academic' && a && b && typeof a === 'object') { ['subjects', 'schedule', 'grades', 'tasks'].forEach(f => { a[f] = union(Array.isArray(a[f]) ? a[f] : [], Array.isArray(b[f]) ? b[f] : []); }); out[k] = W(a); return; }
      if (name === 'prime_registry' && a && b && typeof a === 'object') { Object.keys(b).forEach(id => { a[id] = Object.assign({}, b[id], a[id]); }); out[k] = W(a); return; }
      if (Array.isArray(a) && Array.isArray(b)) { out[k] = W(union(a, b)); return; }
      if (a && b && typeof a === 'object' && typeof b === 'object') { out[k] = W(Object.assign({}, b, a)); return; }
      // valores simples: en una fusión se conserva el de este dispositivo
    });
    return out;
  };

  /* ================= 11. Enlaces profundos (t10): ?app=ID · #app=ID · #install=ID · #import=… ================= */
  function deepLinks() {
    const qp = new URLSearchParams(location.search), hp = new URLSearchParams(location.hash.replace(/^#/, ''));
    const app = qp.get('app') || hp.get('app'), inst = qp.get('install') || hp.get('install'), imp = hp.get('import'), relay = hp.get('relay');
    const clean = () => { try { history.replaceState(null, '', location.pathname + (qp.get('safe') ? '?safe=1' : '')); } catch { /* ignorar */ } };
    if (inst && /^[\w.-]{1,60}$/.test(inst)) { const a = appOf(inst); clean(); if (a) { if (!E.isInstalled(inst)) { E.confirm(tr('Instalar app'), a.name + ': ' + tr('¿Instalarla en este dispositivo? Aparecerá en el escritorio y en Inicio.'), tr('Instalar')).then(ok => { if (ok) { E.setInstalled(inst, true); E.launch(inst); } }); } else E.launch(inst); } }
    else if (app && /^[\w.-]{1,60}$/.test(app)) { clean(); if (appOf(app)) E.launch(app); }
    if (imp) { clean(); P.pendingImport = imp.slice(0, 200000); E.launch('transfer', 'import'); }
    if (relay && /^[A-Z0-9]{6}-[A-Z0-9]{6}$/.test(relay)) { clean(); P.pendingRelay = relay; E.launch('transfer', 'import'); }
  }

  /* ================= 11b. Recibir lo que se comparte desde otras apps del teléfono (Web Share Target) ================= */
  async function sharedInbox() {
    if (!/[?&]shared=1/.test(location.search)) return;
    try { history.replaceState(null, '', location.pathname); } catch { /* ignorar */ }
    let db; try { db = await new Promise((res, rej) => { const o = indexedDB.open('eisenprime_share', 1); o.onupgradeneeded = () => o.result.createObjectStore('inbox', { keyPath: 'id', autoIncrement: true }); o.onsuccess = () => res(o.result); o.onerror = () => rej(o.error); }); } catch { return; }
    const all = await new Promise(res => { try { const qy = db.transaction('inbox').objectStore('inbox').getAll(); qy.onsuccess = () => res(qy.result || []); qy.onerror = () => res([]); } catch { res([]); } });
    let n = 0;
    for (const rec of all) {
      for (const it of rec.items || []) { if (!it || !it.blob) continue; try { const name = await K.files.uniqueName('downloads', K.files.cleanName(it.name)); const id = await K.files.save(name, it.blob, 'downloads'); dl.add({ id, name, size: it.blob.size, type: it.type, src: tr('compartido desde otra app'), danger: P.isDangerous(name) || undefined }); n++; } catch { /* siguiente */ } }
      const m = rec.meta || {}, url = /^https?:\/\//i.test(m.url || '') ? m.url : ((String(m.text || '').match(/https?:\/\/[^\s<>"]+/) || [])[0]);
      if (url) P.notify(tr('Enlace recibido'), url, { icon: '🔗', actions: [{ label: 'Abrir', primary: true, run: () => E.ebOpenUrl(url, true) }, { label: 'Descargar en EISEN', run: () => P.fetchToVault(url) }] });
      else if (m.text) { if (E.addNote) E.addNote(String(m.title || tr('Texto compartido')).slice(0, 120), String(m.text)); P.notify(tr('Texto recibido'), tr('Se guardó en Notas'), { icon: '🗒️' }); }
    }
    await new Promise(res => { try { const t = db.transaction('inbox', 'readwrite'); t.objectStore('inbox').clear(); t.oncomplete = res; t.onerror = res; } catch { res(); } }); db.close();
    if (n) P.notify(tr('Archivos recibidos'), n + ' ' + tr('archivos guardados en Descargas'), { icon: '📥', actions: [{ label: 'Ver Descargas', primary: true, run: () => E.launch('downloads') }] });
  }

  /* ================= 12. Apps PRIME (carga diferida) ================= */
  const M = 'js/os11/apps/', CSS = 'css/apps11.css';
  const A = (id, name, icon, cat, desc, src, feats, o = {}) => K.app(Object.assign({ id, name, icon, cat, desc, src: M + src + '.js', css: CSS, ver: '11.0.0', v11: true, grad: o.grad || ['#1f8160', '#c93a73'], w: 960, h: 640, features: feats, notes: o.notes || 'Nueva en EISEN OS PRIME 11.0.' }, o));
  A('primecenter', 'Centro PRIME', '✦', 'Sistema', 'Todo lo nuevo de PRIME en un lugar: estado de guardado, sesiones, apps instaladas con su registro, salud del sistema, reparaciones, deshacer cambios y las 200 funciones nuevas.', 'hub11', ['Registro real de apps instaladas', 'Salud y reparación en un clic', 'Deshacer cambios de ajustes', 'Sesiones abiertas en otras pestañas'], { kw: 'prime centro estado salud reparar registro funciones sesiones deshacer', grad: ['#0f3d2e', '#c93a73'], w: 1040, h: 680 });
  A('downloads', 'Descargas', '⬇️', 'Sistema', 'Descarga cualquier cosa DENTRO de EISEN y úsala aquí, aunque tu dispositivo (Xbox, TV, tableta) no permita descargas: visores integrados, reproductor, editor de imágenes, instalación de paquetes y compartir.', 'hub11', ['Descargar desde una URL con progreso y cola', 'Abrir todo con visores internos', 'Huella SHA-256 y aviso de archivos peligrosos', 'Compartir, mover y exportar cuando se pueda'], { kw: 'descargas downloads bajar archivos url xbox gestor', grad: ['#13513c', '#34a582'], w: 1000, h: 660 });
  A('transfer', 'Transferir y sincronizar', '🔁', 'Sistema', 'Lleva tu entorno completo a otra pestaña, navegador, perfil, teléfono, tableta o Xbox: con código, archivo, QR (varias partes) o por la red local, sin duplicados y con cifrado opcional.', 'sync11', ['Código de transferencia con suma de control', 'QR animado en varias partes y lector con cámara', 'Archivo .eisenenv cifrado (AES-GCM)', 'Fusión sin duplicados'], { kw: 'transferir sincronizar migrar exportar importar qr codigo cuenta perfil xbox movil', grad: ['#4b3f7a', '#c93a73'], w: 1000, h: 680 });
  A('whatsapp', 'WhatsApp Hub', '💬', 'Internet', 'WhatsApp integrado en EISEN: abre WhatsApp Web en una ventana real, escribe a cualquier número sin guardarlo, contactos y plantillas rápidas, y comparte tus archivos de EISEN.', 'hub11', ['Mensaje rápido a cualquier número', 'Contactos y plantillas locales', 'Compartir archivos de EISEN', 'Abre la app nativa en el móvil'], { kw: 'whatsapp mensajes chat wa.me contactos compartir', grad: ['#0b5d3b', '#25d366'], optional: true });
  { const wa = E.apps().find(a => a.id === 'whatsapp'); if (wa) { delete wa.web; wa.ext = undefined; } }   // la ficha web 8.0 pasa a ser el Hub (conserva su icono y si ya estaba instalada)
  A('plugins', 'Plugins', '🧩', 'Sistema', 'Amplía EISEN con plugins seguros: temas, fondos, enlaces rápidos, comandos y widgets aislados. Todo se valida antes de instalar.', 'tools11', ['Formato .eisenplugin validado', 'Widgets aislados con CSP', 'Activar, desactivar y permisos', 'Desactivados en modo seguro'], { kw: 'plugins extensiones complementos addons widgets temas' });
  A('studio', 'Estudio PRIME', '🎓', 'Educación', 'Herramientas de estudio sin conexión: resumen automático, palabras clave, esquema, preguntas de repaso, legibilidad, lectura en voz alta, plan de repaso y temporizador de examen.', 'tools11', ['Resumen y esquema automáticos', 'Preguntas de repaso con huecos', 'Exportar a Tarjetas de estudio', 'Temporizador de examen a pantalla completa'], { kw: 'estudio escuela resumen esquema examen repaso tarjetas legibilidad leer', grad: ['#4b3f7a', '#8a74c4'], w: 1000, h: 660 });
  A('automate', 'Automatización', '⚡', 'Sistema', 'Reglas «Si… entonces…» que reaccionan a lo que pasa (instalar, descargar, conectar el mando, quedarse sin conexión, batería baja) y recordatorios en lenguaje natural.', 'tools11', ['Reglas por eventos con acciones reales', 'Recordatorios escritos como hablas', 'Organizar descargas automáticamente', 'Historial de ejecuciones'], { kw: 'automatizacion reglas si entonces recordatorios ifttt eventos', grad: ['#8f531a', '#c93a73'] });
  A('tvlauncher', 'Lanzador TV', '📺', 'Sistema', 'Tus apps en tarjetas grandes a pantalla completa, pensado para Xbox, televisores y el mando.', 'hub11', ['Tarjetas grandes navegables con el mando', 'Recientes y más usadas', 'Pantalla completa'], { kw: 'tv xbox lanzador mando pantalla completa apps', grad: ['#107c10', '#1f8160'], w: 1200, h: 720 });
  K.VERS10 = Object.assign(K.VERS10 || {}, { appcenter: ['11.0.0', 'PRIME: al instalar, la app aparece en el escritorio y en Inicio; registro real de instaladas; paquetes de apps; instalación múltiple; método de apertura por app (ventana EISEN, navegador o ventana real) según el dispositivo.'], explorer: ['11.0.0', 'PRIME: carpeta Descargas integrada con el nuevo gestor, huellas SHA-256 y aviso de archivos peligrosos.'], settings: ['11.0.0', 'PRIME: nuevas opciones de instalación, descargas, sincronización, gestos, mando, accesibilidad y personalización.'] });

  /* ================= 13. Arranque de PRIME ================= */
  P.proxyPing = () => fetch('proxy?ping=1', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(j => { if (j && j.ok && E.eb && E.eb.state) { E.eb.state.proxyDetected = true; if (j.alt) E.eb.state.alt = j.alt; } return !!(j && j.ok); }).catch(() => false);
  const ready = () => {
    booted = true;
    P.proxyPing();
    bootCheck().catch(e => console.warn('[PRIME] espejo', e));
    setTimeout(persistOnce, 4000);
    setTimeout(() => { try { rawSet.call(localStorage, 'eisen_prime_bootloop', JSON.stringify({ n: 0, t: 0 })); } catch { /* ignorar */ } }, 10000);
    sharedInbox().catch(e => console.warn('[PRIME] compartidos', e)).then(deepLinks);
    // (c6) punto de restauración automático diario
    setTimeout(async () => { const last = S.get('prime_autosnap', 0) || 0; if (now() - last > 20 * 3600000 && !K.safeMode) { if (await K.backup.snapshot('Copia automática diaria (PRIME)')) S.set('prime_autosnap', now()); } }, 15000);
    if (K.bootLoopSafe || /reason=bootloop/.test(location.search)) P.notify(tr('Modo seguro automático'), tr('EISEN no pudo arrancar varias veces seguidas y se abrió en modo seguro. Revisa el Centro PRIME › Salud.'), { icon: '🛟', actions: [{ label: 'Abrir Centro PRIME', primary: true, run: () => E.launch('primecenter', 'health') }] });
    else if (P.unclean && !K.safeMode && !K.pref('restoreLayout')) P.notify(tr('La sesión anterior se cerró de forma inesperada'), tr('¿Quieres volver a abrir las ventanas que tenías?'), { icon: '🪟', actions: [{ label: 'Restaurar ventanas', primary: true, run: () => K.layout && K.layout.restore(P.prevWins) }, { label: 'No' }] });
    saveSess();
    K.log && K.log('ok', 'system', 'EISEN OS PRIME ' + P.version + ' listo · nivel ' + caps.tier + (caps.tv ? ' · TV' : '') + (caps.download ? '' : ' · descargas internas'));
    K.emit('prime:ready');
  };
  K.services.define('prime', { name: 'Núcleo PRIME', desc: 'Espejo duradero de datos, sincronización entre pestañas, registro de apps y descargas virtuales.', group: 'Sistema', core: true, start() { }, stop() { flush(); }, info: () => tr('Estado') + ': ' + P.syncState + ' · ' + peers.size + ' ' + tr('pestañas más') });
  if (document.readyState === 'complete') setTimeout(ready, 300); else addEventListener('load', () => setTimeout(ready, 300));
})();

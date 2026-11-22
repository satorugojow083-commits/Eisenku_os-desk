/* =====================================================================
   EISENKU OS 10.0 NEXT GENERATION · Núcleo del sistema (kernel, base 9.0)
   Se carga justo después de core.js. API pública: window.EISENKU (alias EISEN.K).
   - Bus de eventos, preferencias y almacenamiento con control de cuota.
   - IndexedDB del sistema (perfiles, puntos de restauración).
   - Registro de seguridad, saneador HTML, arquitectura de permisos por app.
   - Apps 9.0 de carga diferida (manifiesto + módulo que se descarga al abrirlas).
   - Copias de seguridad completas (datos + archivos), puntos de restauración, integridad y actualizaciones.
   - Componentes de interfaz reutilizables (estados de carga/error/vacío, menús, diálogos) e iconos SVG.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  E.K = K; K.E = E; K.$ = $; K.$$ = $$; K.esc = esc;
  const tr = s => (window.EISEN_I18N ? window.EISEN_I18N.tr(s) : s);
  K.tr = tr;

  /* ---------- Bus de eventos ---------- */
  K.on = (ev, fn) => { const h = e => fn(e.detail); document.addEventListener('eisen9:' + ev, h); return () => document.removeEventListener('eisen9:' + ev, h); };
  K.emit = (ev, detail) => document.dispatchEvent(new CustomEvent('eisen9:' + ev, { detail }));

  /* ---------- Almacenamiento: aviso de cuota llena ---------- */
  const rawSet = S.set; let quotaWarned = 0;
  S.set = (k, v) => {
    const ok = rawSet(k, v);
    if (!ok && Date.now() - quotaWarned > 60000) { quotaWarned = Date.now(); setTimeout(() => { E.notify && E.notify(tr('Almacenamiento lleno'), tr('No se pudo guardar. Libera espacio en Configuración › Almacenamiento.'), '💾', 8000); K.seclog('storage', 'Cuota de almacenamiento local agotada al guardar ' + k); }, 0); }
    return ok;
  };
  S.del = k => { try { localStorage.removeItem('eisen_' + k); } catch { /* ignorar */ } };

  /* ---------- Preferencias 9.0 ---------- */
  const PREF_DEF = { density: 'comfortable', radius: 'standard', glass: 'auto', contrast: false, reduceMotion: null, uiScale: 1, fontScale: 1, focusRing: false, dyslexia: false, nightLight: 0, sounds: true, activity: true, taskbarAlign: 'center', dockPos: 'bottom', dockAutohide: false, dockSize: 46, panelClock: 'center', showWidgets: true, autoLock: 0, loginScreen: 'auto', notifPos: 'top-right', notifMs: 6000, searchEngine: 'eisen', homepage: 'about:newtab', forceDark: false, popups: 'ask', unloadOnClose: false, wallSlideshow: 0, cursor: 'normal' };
  K.PREF_DEF = PREF_DEF;
  K.prefs = () => Object.assign({}, PREF_DEF, S.get('os9_prefs', {}) || {});
  K.pref = (k, v) => {
    const p = K.prefs();
    if (v === undefined) return p[k];
    p[k] = v; S.set('os9_prefs', p); K.emit('pref', { k, v }); return v;
  };

  /* ---------- IndexedDB del sistema (nivel dispositivo) ---------- */
  const idbOpen = (name, ver, up) => new Promise((res, rej) => {
    try { const r = indexedDB.open(name, ver); r.onupgradeneeded = () => up(r.result); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('IndexedDB bloqueada')); }
    catch (e) { rej(e); }
  });
  let sysP = null;
  K.sysdb = () => sysP || (sysP = idbOpen('eisenku9_sys', 1, db => { ['kv', 'profiles', 'snapshots'].forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); }); }));
  const tx = (store, mode, fn) => K.sysdb().then(db => new Promise((res, rej) => { const t = db.transaction(store, mode); const q = fn(t.objectStore(store)); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }));
  K.sys = {
    get: (store, id) => tx(store, 'readonly', s => s.get(id)),
    put: (store, obj) => tx(store, 'readwrite', s => s.put(obj)),
    del: (store, id) => tx(store, 'readwrite', s => s.delete(id)),
    all: (store) => tx(store, 'readonly', s => s.getAll())
  };

  /* ---------- Registro de eventos de seguridad ---------- */
  K.seclog = (type, msg, level = 'info') => {
    const l = S.get('os9_seclog', []) || [];
    l.unshift({ t: Date.now(), type, msg: String(msg).slice(0, 400), level });
    rawSet('os9_seclog', l.slice(0, 300));
    K.emit('seclog');
  };
  K.seclogList = () => S.get('os9_seclog', []) || [];
  document.addEventListener('securitypolicyviolation', e => K.seclog('csp', `CSP (${e.violatedDirective}) bloqueó ${String(e.blockedURI || 'en línea').slice(0, 160)}`, 'warn'));

  /* ---------- Historial de actividad ---------- */
  K.activity = (type, id, label) => {
    if (K.pref('activity') === false) return;
    const l = S.get('os9_activity', []) || [];
    l.unshift({ t: Date.now(), type, id: String(id || '').slice(0, 60), label: String(label || '').slice(0, 160) });
    rawSet('os9_activity', l.slice(0, 500));
  };
  document.addEventListener('eisen:open', e => { const id = e.detail; const a = E.REG[id] || (E.apps().find(x => x.id === id)) || {}; K.activity('app', id, a.name || id); });

  /* ---------- Saneador HTML (lista blanca) ---------- */
  const TAGS = { a: ['href', 'title'], abbr: ['title'], b: [], strong: [], i: [], em: [], u: [], s: [], del: [], ins: [], mark: [], small: [], sub: [], sup: [], p: [], br: [], hr: [], div: ['data-biblio', 'data-toc'], span: ['data-cite', 'data-eq'], blockquote: [], pre: [], code: [], kbd: [], ul: [], ol: ['start'], li: ['data-toc-n'], dl: [], dt: [], dd: [], h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], table: [], thead: [], tbody: [], tfoot: [], tr: [], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'], caption: [], img: ['src', 'alt', 'title', 'width', 'height'], figure: [], figcaption: [], section: [], article: [], header: [], footer: [], aside: [], nav: [], main: [], details: [], summary: [], font: ['color', 'face', 'size'], center: [], strike: [], big: [], tt: [], cite: [], q: [], dfn: [], var: [], samp: [], bdi: [], bdo: ['dir'], wbr: [], time: ['datetime'] };
  const DROP = /^(script|style|iframe|frame|frameset|object|embed|applet|link|meta|base|template|noscript|form|input|button|textarea|select|option|svg|math|canvas|audio|video|source|track|portal|dialog)$/i;
  const SAFE_STYLE = /^(color|background-color|font-weight|font-style|text-decoration|text-align|font-size|font-family|margin-left|padding-left|border-collapse|width|height|vertical-align|list-style-type)$/i;
  K.sanitize = (html, o = {}) => {
    const doc = new DOMParser().parseFromString('<!doctype html><body>' + String(html || ''), 'text/html');
    const walk = el => {
      [...el.children].forEach(c => {
        const tag = c.tagName.toLowerCase();
        if (DROP.test(tag)) { c.remove(); return; }
        if (!TAGS[tag]) { walk(c); c.replaceWith(...c.childNodes); return; }
        [...c.attributes].forEach(a => {
          const n = a.name.toLowerCase(), v = a.value.trim();
          if (n === 'style' && o.style) { c.setAttribute('style', v.split(';').map(x => x.trim()).filter(x => { const [p, ...rest] = x.split(':'); const val = rest.join(':'); return p && SAFE_STYLE.test(p.trim()) && !/url\(|expression|javascript:|@import|behavior/i.test(val); }).join(';')); return; }
          if (!TAGS[tag].includes(n)) { c.removeAttribute(a.name); return; }
          if (n === 'href') { if (/^(https?:|mailto:)/i.test(v)) { if (o.links === 'internal' && /^https?:/i.test(v)) { c.setAttribute('data-external-url', v); c.setAttribute('href', '#'); } else { c.setAttribute('rel', 'noopener noreferrer'); c.setAttribute('target', '_blank'); } } else if (v.startsWith('#')) { /* ancla */ } else c.removeAttribute('href'); }
          if (n === 'src') { if (!(o.images !== false && /^(https:|data:image\/(png|jpe?g|gif|webp);|blob:)/i.test(v))) c.removeAttribute('src'); else { c.setAttribute('loading', 'lazy'); c.setAttribute('referrerpolicy', 'no-referrer'); } }
        });
        walk(c);
      });
    };
    walk(doc.body);
    return doc.body.innerHTML;
  };
  E.sanitize = K.sanitize;

  /* ---------- Arquitectura de permisos ---------- */
  K.PERMS = {
    camera: { n: 'Cámara', i: '📷', risk: 3 }, microphone: { n: 'Micrófono', i: '🎙️', risk: 3 }, geolocation: { n: 'Ubicación', i: '📍', risk: 3 },
    notifications: { n: 'Notificaciones', i: '🔔', risk: 1 }, clipboard: { n: 'Portapapeles', i: '📋', risk: 2 }, files: { n: 'Archivos de EISENKU', i: '📁', risk: 2 },
    storage: { n: 'Almacenamiento propio', i: '💾', risk: 1 }, network: { n: 'Acceso a Internet', i: '🌐', risk: 2 }, devicefs: { n: 'Carpetas del dispositivo', i: '🗂️', risk: 3 },
    screen: { n: 'Captura de pantalla', i: '🖥️', risk: 3 }, system: { n: 'Control del sistema', i: '⚙️', risk: 3 }
  };
  // Permisos declarados por apps integradas (las de terceros los declaran en su paquete y se conceden al instalar)
  const DECL = { camera: ['camera', 'microphone', 'files'], recorder: ['microphone', 'files'], weather: ['geolocation', 'network'], maps: ['geolocation', 'network'], assistant: ['system', 'network', 'microphone', 'notifications'], clock: ['notifications'], calendar: ['notifications'], browser: ['network', 'files'], music: ['network', 'files'], explorer: ['files', 'devicefs'], terminal: ['system', 'files', 'network'], settings: ['system'], appcenter: ['system', 'network'], qr: ['camera'], scanner: ['camera', 'files'], meet: ['camera', 'microphone', 'network'], chat: ['network'], audioedit: ['files', 'microphone'], projexplorer: ['devicefs', 'files'], passwords: ['clipboard', 'storage'], netcheck: ['network'], devices: ['camera', 'microphone'] };
  K.perms = {
    declared: id => (E.REG[id] && E.REG[id].perms) || DECL[id] || [],
    decisions: () => S.get('os9_perms', {}) || {},
    has(id, p) {
      if (id === 'system' || id === 'desktop') return true;
      const d = (K.perms.decisions()[id] || {})[p];
      if (d !== undefined) return !!d;
      const a = E.REG[id] || {};
      if (a.thirdParty) return false;                      // terceros: solo con concesión explícita
      return true;                                         // apps integradas: permitido salvo que el usuario lo revoque
    },
    set(id, p, on) { const m = K.perms.decisions(); (m[id] = m[id] || {})[p] = !!on; S.set('os9_perms', m); K.seclog('perm', `${on ? 'Concedido' : 'Revocado'} «${(K.PERMS[p] || {}).n || p}» a ${(E.REG[id] || {}).name || id}`); K.emit('perms', { id, p, on }); },
    reset(id) { const m = K.perms.decisions(); delete m[id]; S.set('os9_perms', m); K.emit('perms', { id }); }
  };
  K.activeApp = () => { const w = $('.window.active.open:not(.minimized)'); return w ? w.id.slice(4) : 'desktop'; };
  const denied = (p) => { const id = K.activeApp(), a = E.REG[id] || {}; K.seclog('perm', `Bloqueado: ${a.name || id} intentó usar «${K.PERMS[p].n}» (revocado)`, 'warn'); E.notify && E.notify(tr('Permiso denegado'), `${a.name || id}: ${tr(K.PERMS[p].n)}. ${tr('Cámbialo en Administrador de permisos.')}`, '🛡️', 6000); };
  // Guardas globales: se atribuyen a la app de la ventana activa (aproximación documentada en el Handbook)
  try {
    const md = navigator.mediaDevices;
    if (md && md.getUserMedia) {
      const gum = md.getUserMedia.bind(md);
      md.getUserMedia = c => { const id = K.activeApp(); for (const p of [c && c.video ? 'camera' : null, c && c.audio ? 'microphone' : null].filter(Boolean)) if (!K.perms.has(id, p)) { denied(p); return Promise.reject(new DOMException('Permiso revocado en EISENKU OS', 'NotAllowedError')); } K.activity('perm', id, 'Usó ' + [c && c.video ? 'cámara' : '', c && c.audio ? 'micrófono' : ''].filter(Boolean).join(' y ')); return gum(c); };
      if (md.getDisplayMedia) { const gdm = md.getDisplayMedia.bind(md); md.getDisplayMedia = c => K.perms.has(K.activeApp(), 'screen') ? gdm(c) : (denied('screen'), Promise.reject(new DOMException('Permiso revocado', 'NotAllowedError'))); }
    }
    const geo = navigator.geolocation;
    if (geo) ['getCurrentPosition', 'watchPosition'].forEach(m => { const o = geo[m].bind(geo); geo[m] = (ok, err, opt) => { if (!K.perms.has(K.activeApp(), 'geolocation')) { denied('geolocation'); if (err) setTimeout(() => err({ code: 1, message: 'Permiso revocado en EISENKU OS' }), 0); return 0; } return o(ok, err, opt); }; });
    const cb = navigator.clipboard;
    if (cb && cb.readText) { const rt = cb.readText.bind(cb); cb.readText = () => K.perms.has(K.activeApp(), 'clipboard') ? rt() : (denied('clipboard'), Promise.reject(new DOMException('Permiso revocado', 'NotAllowedError'))); }
  } catch { /* navegador sin estas APIs */ }

  /* ---------- Formatos ---------- */
  K.fmt = {
    bytes: n => { n = +n || 0; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return (i ? n.toFixed(n < 10 ? 1 : 0) : n) + ' ' + u[i]; },
    date: (d, o) => new Date(d).toLocaleDateString(K.locale, o || { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d => new Date(d).toLocaleTimeString(K.locale, { hour: '2-digit', minute: '2-digit' }),
    dt: d => new Date(d).toLocaleString(K.locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    num: (n, o) => (+n).toLocaleString(K.locale, o),
    rel: d => { const s = (new Date(d) - Date.now()) / 1000, a = Math.abs(s); try { const f = new Intl.RelativeTimeFormat(K.locale, { numeric: 'auto' }); return a < 60 ? f.format(Math.round(s), 'second') : a < 3600 ? f.format(Math.round(s / 60), 'minute') : a < 86400 ? f.format(Math.round(s / 3600), 'hour') : f.format(Math.round(s / 86400), 'day'); } catch { return new Date(d).toLocaleString(); } }
  };

  /* ---------- Iconos SVG del sistema (trazo 1.75, 24×24, propios de EISENKU) ---------- */
  const IC = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>', home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>', wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><path d="M12 19h.01"/>',
    volume: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>', battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2M5 10v4"/>',
    power: '<path d="M12 2v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', grid: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>', min: '<path d="M5 12h14"/>', max: '<rect x="5" y="5" width="14" height="14" rx="2"/>', plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12l5 5L20 7"/>',
    right: '<path d="M9 6l6 6-6 6"/>', left: '<path d="M15 6l-6 6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', up: '<path d="M6 15l6-6 6 6"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>', star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
    heart: '<path d="M12 20s-7-4.4-9.3-8.7A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 9.3 5.3C19 15.6 12 20 12 20z"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>', upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7v.5M12 17h.01"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    widgets: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    code: '<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>', chart: '<path d="M4 20V11M10 20V5M16 20v-7M21 20H3"/>', cpu: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
    disk: '<rect x="3" y="12" width="18" height="8" rx="2"/><path d="M5 12l2-7h10l2 7M7 16h.01"/>', update: '<path d="M21 12a9 9 0 0 1-15.5 6.3M3 12a9 9 0 0 1 15.5-6.3"/><path d="M21 4v5h-5M3 20v-5h5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>', music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>', camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>', print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6"/>', filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>', list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>', tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>', history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>', puzzle: '<path d="M10 4a2 2 0 0 1 4 0v2h4v4h-2a2 2 0 0 0 0 4h2v4h-4v-2a2 2 0 0 0-4 0v2H6v-4h2a2 2 0 0 0 0-4H6V6h4z"/>',
    store: '<path d="M4 8h16l-1 12H5z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>', back: '<path d="M10 6l-6 6 6 6M4 12h16"/>', forward: '<path d="M14 6l6 6-6 6M20 12H4"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>', zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19l7-7"/>',
    accessibility: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8l7 1.5L19 8M12 9.5V14l-3 7M12 14l3 7"/>', contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>', network: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>', graduation: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>', fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', scan: '<path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M7 12h10"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="14.5" cy="7" r="1.2"/>', trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', box: '<path d="M21 8l-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>', atom: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>', calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01"/>'
  };
  K.ICONS = IC;
  K.icon = (n, s = 18, cls = '') => `<svg class="i9 ${cls}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || IC.puzzle}</svg>`;

  /* ---------- Componentes de interfaz ---------- */
  const ui = K.ui = {
    loading: (el, text = 'Cargando…') => { el.innerHTML = `<div class="k9-state"><span class="k9-spin" role="progressbar" aria-label="${esc(tr(text))}"></span><p>${esc(tr(text))}</p></div>`; },
    empty: (el, text, icon = 'info', action) => { el.innerHTML = `<div class="k9-state">${K.icon(icon, 36)}<p>${esc(tr(text))}</p>${action ? `<button class="btn-primary" data-k9act>${esc(tr(action.label))}</button>` : ''}</div>`; if (action) el.querySelector('[data-k9act]').onclick = action.run; },
    error: (el, text, retry) => { el.innerHTML = `<div class="k9-state k9-err">${K.icon('shield', 36)}<p><b>${esc(tr('Algo salió mal'))}</b></p><p class="eis-muted">${esc(tr(text))}</p>${retry ? `<button class="btn-primary" data-k9retry>${esc(tr('Reintentar'))}</button>` : ''}</div>`; if (retry) el.querySelector('[data-k9retry]').onclick = retry; },
    prompt: (title, label, value = '', o = {}) => E.form({ title, fields: [{ k: 'v', label, value, type: o.type, ph: o.ph, req: o.req }], ok: o.ok || 'Aceptar' }).then(r => r ? r.v : null),
    confirm: (title, text, ok) => E.confirm(title, text, ok),
    alert: (title, text) => E.form({ title, html: `<p class="eis-muted" style="white-space:pre-wrap">${esc(text)}</p>`, ok: 'Aceptar', cancel: 'Cerrar' }),
    // menú contextual reutilizable: items [{label, icon, act, danger, sep, disabled, checked}]
    menu(x, y, items) {
      const cm = $('#context-menu'); E.closeFlyouts && E.closeFlyouts();
      cm.innerHTML = items.map((it, i) => it.sep ? '<div class="ctx-sep"></div>' : `<button class="ctx-item${it.danger ? ' danger' : ''}" data-mi="${i}"${it.disabled ? ' disabled' : ''}><span>${it.icon && IC[it.icon] ? K.icon(it.icon, 15) : esc(it.icon || '')}</span> ${esc(tr(it.label))}${it.checked ? ' <em class="k9-chk">✓</em>' : ''}${it.kbd ? `<kbd>${esc(it.kbd)}</kbd>` : ''}</button>`).join('');
      cm.style.display = 'block';
      const W = cm.offsetWidth, H = cm.offsetHeight;
      cm.style.left = Math.max(4, Math.min(innerWidth - W - 4, x)) + 'px'; cm.style.top = Math.max(4, Math.min(innerHeight - H - 4, y)) + 'px';
      cm.onclick = ev => { const b = ev.target.closest('[data-mi]'); if (!b) return; cm.style.display = 'none'; cm.onclick = null; const it = items[+b.dataset.mi]; if (it && it.act) it.act(); };
    },
    // mini-utilidad para crear elementos con eventos sin HTML en línea
    el(tag, attrs = {}, html = '') { const e = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => { if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v != null) e.setAttribute(k, v); }); if (html) e.innerHTML = html; return e; },
    download: (name, data, type = 'application/octet-stream') => E.download(name, data instanceof Blob ? data : new Blob([data], { type })),
    copy: async (text) => { try { await navigator.clipboard.writeText(text); E.toast(tr('Copiado al portapapeles')); return true; } catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; } t.remove(); E.toast(ok ? tr('Copiado al portapapeles') : tr('No se pudo copiar')); return ok; } },
    pickFile: (accept = '', multiple = false) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = multiple; i.onchange = () => res([...i.files]); i.addEventListener('cancel', () => res([])); i.click(); })
  };
  K.toast = (m, x) => E.toast(m, x);
  K.notify = (...a) => E.notify(...a);

  /* ---------- Carga de scripts y apps 9.0 de carga diferida ---------- */
  const scripts = new Map();
  K.loadScript = src => scripts.get(src) || (scripts.set(src, new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src + (src.includes('?') ? '' : '?v=' + K.version); s.async = true;
    s.onload = () => res(); s.onerror = () => { scripts.delete(src); rej(new Error(tr('No se pudo cargar el módulo') + ' ' + src)); };
    document.head.appendChild(s);
  })), scripts.get(src));
  const IMPL = K.IMPL = {}, MAN = K.MANIFESTS = {};
  K.ext = K.ext || {};   // 10.0: puntos de extensión entre módulos (Archivos, Monitor de almacenamiento, Diagnóstico…)
  K.define = (id, impl) => { IMPL[id] = impl; };
  K.app = (m) => {
    if (m.pad === undefined) m.pad = false;   // las apps 9.0 usan su propio diseño a sangre (barras y paneles hasta el borde)
    MAN[m.id] = m;
    E.registerApp(Object.assign({}, m, { noWindow: true, v9: true, launch: arg => K.openApp(m.id, arg) }));
    if (m.perms) E.REG[m.id].perms = m.perms;
    return m;
  };
  K.openApp = async (id, arg) => {
    const m = MAN[id]; if (!m) return false;
    if (!E.isInstalled(id)) { E.storeShow ? E.storeShow(id) : E.toast(tr('Instala la app desde el App Center')); return false; }
    if (K.focus && K.focus.blocks && K.focus.blocks(id)) return false;
    const w = E.createAppWindow(m), body = w.querySelector('.app-body');
    w.classList.add('k9-win'); w.dataset.app = id;
    E.openWindow(id);
    if (!w.__k9) {
      w.__k9 = 'loading'; ui.loading(body, 'Abriendo ' + m.name + '…');
      try {
        K.loadCss('css/apps9.css'); if (m.css) K.loadCss(m.css);   // 10.0: cada app puede declarar su hoja de estilos diferida
        if (!IMPL[id] && m.src) await K.loadScript(m.src);
        const impl = IMPL[id]; if (!impl) throw new Error(tr('El módulo de la app no está disponible'));
        body.innerHTML = '';
        await impl.init(body, w, arg);
        w.__k9 = 'ready';
      } catch (e) {
        w.__k9 = null; console.error('[EISENKU] app ' + id, e); K.seclog('app', `Error al iniciar ${m.name}: ${e.message}`, 'warn');
        ui.error(body, e.message || String(e), () => { K.openApp(id, arg); });
      }
    } else if (w.__k9 === 'ready') { const impl = IMPL[id]; try { if (impl.onOpen) impl.onOpen(body, w, arg); else if (arg != null && impl.onArg) impl.onArg(arg, body, w); } catch (e) { console.error(e); } }
    return true;
  };
  // liberar memoria al cerrar (apps que lo indiquen, o todas en modo de bajo consumo)
  document.addEventListener('eisen:close', e => {
    const id = e.detail, impl = IMPL[id], m = MAN[id], w = document.getElementById('win-' + id);
    if (!impl || !w) return;
    try { impl.onClose && impl.onClose(w.querySelector('.app-body'), w); } catch (er) { console.error(er); }
    if ((m && m.unload) || K.pref('unloadOnClose') || document.documentElement.classList.contains('low-power')) { try { impl.destroy && impl.destroy(); } catch { /* ignorar */ } const body = w.querySelector('.app-body'), fresh = body.cloneNode(false); body.replaceWith(fresh); w.__k9 = null; } // el clon descarta también los oyentes de eventos
  });

  /* ---------- Copias de seguridad, puntos de restauración e integridad ---------- */
  const lsKeys = (pre = 'eisen_') => { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(pre)) out.push(k); } } catch { /* sin acceso */ } return out; };
  const lsData = () => { const d = {}; lsKeys().forEach(k => { d[k] = localStorage.getItem(k); }); return d; };
  const b64 = async blob => { const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s, type) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: type || '' }); };
  const sha256 = async text => { try { const h = await crypto.subtle.digest('SHA-256', typeof text === 'string' ? new TextEncoder().encode(text) : text); return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch { return ''; } };
  K.sha256 = sha256;
  K.backup = {
    async create(o = {}) {
      const data = lsData(); let files = [];
      if (o.files !== false) { try { const all = K.files ? await K.files.allRaw() : await E.vaultAll(); for (const f of all) { if (!f || !f.blob) continue; if (o.exclude && ((f.folder || '') === o.exclude || (f.folder || '').startsWith(o.exclude + '/'))) continue; files.push({ id: f.id, name: f.name, type: f.type, size: f.size, folder: f.folder, date: f.date, trash: f.trash || null, fav: f.fav || false, b64: await b64(f.blob) }); } } catch { files = []; } }
      const body = { app: 'EISENKU OS', format: 2, version: K.version, edition: K.edition, created: new Date().toISOString(), profile: K.profileId, data, files };
      body.checksum = await sha256(JSON.stringify(data) + '|' + files.map(f => f.id + f.size).join(','));
      const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
      S.set('os9_last_backup', Date.now()); K.activity('backup', 'settings', 'Copia de seguridad creada');
      return { blob, name: `EISENKU_OS_9_respaldo_${new Date().toISOString().slice(0, 10)}.json`, stats: { keys: Object.keys(data).length, files: files.length, size: blob.size } };
    },
    // Valida un respaldo (8.0 o 9.0) antes de restaurarlo: estructura, claves, tamaños y suma de control
    async inspect(file) {
      const errors = [], warn = [];
      if (file.size > 600 * 1024 * 1024) return { ok: false, errors: ['El archivo supera 600 MB'] };
      let obj; try { obj = JSON.parse(await file.text()); } catch { return { ok: false, errors: ['No es un JSON válido'] }; }
      if (!obj || obj.app !== 'EISENKU OS' || typeof obj.data !== 'object' || !obj.data) return { ok: false, errors: ['No parece un respaldo de EISENKU OS'] };
      const keys = Object.keys(obj.data); let total = 0;
      keys.forEach(k => {
        const v = obj.data[k];
        if (!/^eisen_[\w.-]{1,80}$/.test(k)) { errors.push('Clave no permitida: ' + k.slice(0, 40)); return; }
        if (typeof v !== 'string') { errors.push('Valor inválido en ' + k); return; }
        total += v.length; try { JSON.parse(v); } catch { warn.push('Valor no JSON en ' + k + ' (se conservará tal cual)'); }
      });
      if (total > 40 * 1024 * 1024) errors.push('Los datos superan 40 MB');
      const files = Array.isArray(obj.files) ? obj.files : [];
      files.forEach((f, i) => { if (!f || typeof f.name !== 'string' || typeof f.b64 !== 'string' || f.name.length > 255) errors.push('Archivo ' + (i + 1) + ' inválido'); });
      if (obj.format === 2 && obj.checksum) { const c = await sha256(JSON.stringify(obj.data) + '|' + files.map(f => f.id + f.size).join(',')); if (c !== obj.checksum) warn.push('La suma de control no coincide: el respaldo pudo modificarse'); }
      return { ok: !errors.length, errors: errors.slice(0, 20), warn: warn.slice(0, 20), obj, summary: { version: obj.version || '8.0', created: obj.created, keys: keys.length, files: files.length, sizeMB: (file.size / 1048576).toFixed(1) } };
    },
    async restore(obj, o = {}) {
      await K.backup.snapshot('Antes de restaurar un respaldo');
      if (o.mode !== 'merge') lsKeys().forEach(k => { if (!/^eisen_os9_(migrations|schema|last_version)$/.test(k)) localStorage.removeItem(k); });
      Object.entries(obj.data).forEach(([k, v]) => { if (/^eisen_[\w.-]{1,80}$/.test(k) && typeof v === 'string') { try { localStorage.setItem(k, v); } catch { /* sin espacio */ } } });
      let nf = 0;
      if (o.files !== false && Array.isArray(obj.files)) for (const f of obj.files) { try { await E.vault.put({ id: String(f.id || E.uid()).slice(0, 40), name: String(f.name).slice(0, 255), type: String(f.type || '').slice(0, 100), size: +f.size || 0, folder: String(f.folder || 'documents').slice(0, 300), date: +f.date || Date.now(), trash: f.trash || null, fav: !!f.fav, blob: unb64(f.b64, f.type) }); nf++; } catch { /* omitir */ } }
      K.seclog('backup', `Respaldo restaurado (${Object.keys(obj.data).length} ajustes, ${nf} archivos)`);
      return nf;
    },
    // Puntos de restauración locales (solo ajustes y datos de apps, sin archivos) — se guardan los 6 últimos
    async snapshot(reason = 'Manual') {
      try { await K.sys.put('snapshots', { id: Date.now() + '-' + K.profileId, profile: K.profileId, reason, at: Date.now(), version: K.version, data: lsData() }); const all = (await K.sys.all('snapshots')).filter(s => s.profile === K.profileId).sort((a, b) => b.at - a.at); for (const s of all.slice(6)) await K.sys.del('snapshots', s.id); return true; } catch { return false; }
    },
    async snapshots() { try { return (await K.sys.all('snapshots')).filter(s => s.profile === K.profileId).sort((a, b) => b.at - a.at).map(s => ({ id: s.id, reason: s.reason, at: s.at, version: s.version, keys: Object.keys(s.data || {}).length })); } catch { return []; } },
    async restoreSnapshot(id) { const s = await K.sys.get('snapshots', id); if (!s) return false; await K.backup.snapshot('Antes de volver a un punto de restauración'); lsKeys().forEach(k => localStorage.removeItem(k)); Object.entries(s.data || {}).forEach(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* sin espacio */ } }); K.seclog('backup', 'Punto de restauración aplicado: ' + s.reason); return true; }
  };
  K.integrity = {
    // Compara los archivos del sistema con integrity.json (SHA-256 generado al empaquetar)
    async files(onProgress) {
      let man; try { const r = await fetch('integrity.json', { cache: 'no-store' }); if (!r.ok) throw 0; man = await r.json(); } catch { return { ok: null, reason: tr('No disponible: abre EISENKU con su servidor (INICIAR.bat) o desde Netlify/Cloudflare.') }; }
      const out = { ok: true, total: 0, modified: [], missing: [] }, list = Object.entries(man.files || {});
      for (const [f, h] of list) {
        out.total++; onProgress && onProgress(out.total, list.length, f);
        try { const r = await fetch(f, { cache: 'no-store' }); if (!r.ok) { out.missing.push(f); continue; } const got = await sha256(await r.arrayBuffer()); if (got !== h) out.modified.push(f); } catch { out.missing.push(f); }
      }
      out.ok = !out.modified.length && !out.missing.length; out.version = man.version;
      K.seclog('integrity', `Comprobación de integridad: ${out.total} archivos, ${out.modified.length} modificados, ${out.missing.length} ausentes`, out.ok ? 'info' : 'warn');
      return out;
    },
    // Comprueba que los datos locales se pueden leer (JSON válido) y su tamaño
    storage() {
      const bad = [], sizes = []; lsKeys().forEach(k => { const v = localStorage.getItem(k) || ''; sizes.push([k, v.length * 2]); try { JSON.parse(v); } catch { bad.push(k); } });
      return { bad, sizes: sizes.sort((a, b) => b[1] - a[1]), total: sizes.reduce((a, b) => a + b[1], 0) };
    },
    repair(keys) { keys.forEach(k => { try { localStorage.removeItem(k); } catch { /* ignorar */ } }); K.seclog('integrity', 'Reparación: eliminadas ' + keys.length + ' claves dañadas'); }
  };
  K.updates = {
    // Solo informa: nunca descarga ni ejecuta código por su cuenta (sin actualizaciones automáticas inseguras)
    async check() {
      try { const r = await fetch('version.json', { cache: 'no-store' }); if (!r.ok) throw 0; const j = await r.json(); S.set('os9_upd_check', Date.now()); return { ok: true, remote: j.version, local: K.version, newer: cmpVer(j.version, K.version) > 0 }; }
      catch { return { ok: false, local: K.version }; }
    }
  };
  const cmpVer = (a, b) => { const x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
  K.cmpVer = cmpVer;

  /* ---------- Perfiles locales ---------- */
  const pbkdf2 = async (pin, salt) => { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']); const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 150000, hash: 'SHA-256' }, k, 256); return [...new Uint8Array(bits)].map(x => x.toString(16).padStart(2, '0')).join(''); };
  K.pbkdf2 = pbkdf2;
  K.profiles = {
    list: () => K._get('eisenku_sys_profiles', []) || [],
    save: l => K._set('eisenku_sys_profiles', l),
    current: () => K.profiles.list().find(p => p.id === K.profileId) || { id: K.profileId, name: 'Eisen' },
    update(id, patch) { const l = K.profiles.list(), p = l.find(x => x.id === id); if (!p) return; Object.assign(p, patch); K.profiles.save(l); K.emit('profiles'); },
    async create(name, avatar, color) { const l = K.profiles.list(); const id = 'p' + Date.now().toString(36); l.push({ id, name: String(name).slice(0, 32) || 'Usuario', avatar: String(avatar || '').slice(0, 4), color: color || '#c93a73', created: Date.now() }); K.profiles.save(l); K.seclog('account', 'Perfil local creado: ' + name); K.emit('profiles'); return id; },
    async setPin(id, pin) { const l = K.profiles.list(), p = l.find(x => x.id === id); if (!p) return false; if (!pin) { delete p.pin; delete p.salt; } else { p.salt = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join(''); p.pin = await pbkdf2(String(pin), p.salt); } K.profiles.save(l); K.seclog('account', (pin ? 'PIN establecido' : 'PIN eliminado') + ' para ' + p.name); return true; },
    async verify(id, pin) {
      const p = K.profiles.list().find(x => x.id === id); if (!p) return false; if (!p.pin) return true;
      const lk = K._get('eisenku_sys_lockout', {}) || {}, st = lk[id] || { n: 0, until: 0 };
      if (Date.now() < st.until) return 'locked';
      const ok = (await pbkdf2(String(pin), p.salt)) === p.pin;
      if (ok) { st.n = 0; st.until = 0; } else { st.n++; if (st.n >= 5) { st.until = Date.now() + Math.min(300000, 30000 * (st.n - 4)); } K.seclog('account', 'PIN incorrecto para ' + p.name + ' (' + st.n + ')', 'warn'); }
      lk[id] = st; K._set('eisenku_sys_lockout', lk); return ok;
    },
    // Cambiar de perfil: guarda los datos del actual, carga los del otro y reinicia la interfaz
    async switchTo(id) {
      if (id === K.profileId) return;
      const snap = lsData(); await K.sys.put('profiles', { id: K.profileId, data: snap, at: Date.now() });
      const next = await K.sys.get('profiles', id);
      lsKeys().forEach(k => localStorage.removeItem(k));
      Object.entries((next && next.data) || {}).forEach(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* sin espacio */ } });
      K._set('eisenku_sys_active', id); K._set('eisenku_sys_justswitched', Date.now());
      location.reload();
    },
    async remove(id) {
      if (id === 'default' || id === K.profileId) return false;
      K.profiles.save(K.profiles.list().filter(p => p.id !== id)); try { await K.sys.del('profiles', id); indexedDB.deleteDatabase('eisen_vault_' + id); } catch { /* ignorar */ }
      K.seclog('account', 'Perfil eliminado: ' + id); K.emit('profiles'); return true;
    }
  };

  /* ---------- Instalación de apps: versiones registradas (Centro de actualizaciones) ---------- */
  K.appVersions = () => S.get('os9_app_versions', {}) || {};
  K.markAppVersion = (id, v) => { const m = K.appVersions(); m[id] = v; S.set('os9_app_versions', m); };

  /* ---------- Markdown completo y seguro (GFM básico): se escapa TODO y luego se aplica el formato ---------- */
  // identificador de ancla compartido (encabezados de K.md, Handbook, documentación generada)
  const slug = K.slug = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
  K.md = (src, o = {}) => {
    const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n'); let out = '', i = 0; const toc = [];
    const inline = t => esc(t)
      .replace(/`([^`]+)`/g, (m, c) => '<code>' + c + '</code>')
      .replace(/!\[([^\]]*)\]\(((?:https:|data:image\/(?:png|jpe?g|gif|webp);)[^)\s]*)\)/g, '<img src="$2" alt="$1" loading="lazy" referrerpolicy="no-referrer">')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+|#[\w-]+)\)/g, (m, l, u) => u.startsWith('#') ? `<a href="${u}">${l}</a>` : `<a href="#" data-external-url="${u}">${l}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>').replace(/(^|\W)_([^_\s][^_]*)_(?=\W|$)/g, '$1<i>$2</i>')
      .replace(/~~([^~]+)~~/g, '<s>$1</s>').replace(/==([^=]+)==/g, '<mark>$1</mark>');
    while (i < lines.length) {
      const l = lines[i]; let m;
      if ((m = l.match(/^```\s*([\w+-]*)/))) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out += `<pre class="md-code"${m[1] ? ` data-lang="${esc(m[1])}"` : ''}><code>${esc(buf.join('\n'))}</code></pre>`; continue; }
      if ((m = l.match(/^(#{1,6})\s+(.*)$/))) { const id = slug(m[2]); toc.push([m[1].length, m[2], id]); out += `<h${m[1].length} id="${id}">${inline(m[2])}</h${m[1].length}>`; i++; continue; }
      if (/^\s*(\*\s*\*\s*\*|-\s*-\s*-|_\s*_\s*_)[\s*_-]*$/.test(l)) { out += '<hr>'; i++; continue; }
      if (/^\s*>/.test(l)) { const buf = []; while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, '')); out += '<blockquote>' + K.md(buf.join('\n')).html + '</blockquote>'; continue; }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
        const row = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const head = row(l), al = row(lines[i + 1]).map(c => /^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : ''); i += 2; const body = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) body.push(row(lines[i++]));
        out += `<table class="md-table"><thead><tr>${head.map((c, k) => `<th${al[k] ? ` style="text-align:${al[k]}"` : ''}>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map((c, k) => `<td${al[k] ? ` style="text-align:${al[k]}"` : ''}>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`; continue;
      }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) {
        const ordered = /^\s*\d/.test(l), tag = ordered ? 'ol' : 'ul'; let items = '';
        while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
          let t = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, ''); const ind = /^\s{2,}/.test(lines[i]); i++;
          const cb = t.match(/^\[( |x|X)\]\s+(.*)/); t = cb ? `<input type="checkbox" disabled${cb[1].trim() ? ' checked' : ''}> ${inline(cb[2])}` : inline(t);
          items += `<li${ind ? ' class="md-sub"' : ''}${cb ? ' class="md-task"' : ''}>${t}</li>`;
        }
        out += `<${tag}>${items}</${tag}>`; continue;
      }
      if (!l.trim()) { i++; continue; }
      const buf = [l]; i++; while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*>|\s*([-*+]|\d+[.)])\s|\s*\|)/.test(lines[i])) buf.push(lines[i++]);
      out += '<p>' + buf.map(inline).join(o.breaks === false ? ' ' : '<br>') + '</p>';
    }
    return { html: out, toc };
  };
  /* ---------- Hojas de estilo de las apps 9.0 (carga diferida) ---------- */
  const css = new Set();
  K.loadCss = href => { if (css.has(href)) return; css.add(href); const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href + '?v=' + K.version; document.head.appendChild(l); };

  /* ---------- Botones que abren selectores ocultos (sustituyen a onclick en línea; compatible con CSP) ---------- */
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-click-target]'); if (b) { const t = document.querySelector(b.dataset.clickTarget); if (t) t.click(); } });

  K.ready = true;
  K.emit('kernel');
})();

/* =====================================================================
   EISENKU OS 10.0 NEXT GENERATION · Núcleo 10.0
   Se carga al inicio, después del shell 9.0. Es pequeño a propósito: todo lo visual
   de 10.0 se crea la primera vez que se usa y las apps nuevas son de carga diferida.
   - K.log: registro de eventos del sistema (Visor de eventos), escrito por lotes.
   - K.services: servicios internos con estado, tipo de inicio, reinicio y errores.
   - K.sched: programador de tareas con acciones reales (mientras EISENKU está abierto).
   - Historial del portapapeles (nunca guarda contraseñas ni lo que copia el Gestor de contraseñas).
   - Historial de conexiones a servicios (solo origen y ruta: nunca parámetros ni contenido).
   - Bloqueo de apps con el PIN del perfil, pantalla de privacidad, vigilancia de la red.
   - K.cfg (ajustes por app), K.store10 (IndexedDB por perfil), K.u10 (utilidades de interfaz).
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU; if (!E || !K || !K.ready) return;
  const S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, $ = K.$, $$ = K.$$;
  const html = document.documentElement;
  const now = () => Date.now();

  /* ================= Ajustes por app y almacén IndexedDB por perfil ================= */
  // Las claves quedan como eisen_<app>_cfg: el App Center las encuentra para "Restablecer datos".
  K.cfg = (id, def = {}) => {
    const key = id + '_cfg';
    const all = () => Object.assign({}, def, S.get(key, {}) || {});
    return { all, get: (k, d) => { const v = all()[k]; return v === undefined ? d : v; }, set(k, v) { const o = S.get(key, {}) || {}; o[k] = v; S.set(key, o); return v; }, patch(p) { S.set(key, Object.assign(S.get(key, {}) || {}, p)); } };
  };
  let dbP = null;
  const db10 = () => dbP || (dbP = new Promise((res, rej) => {
    try {
      const r = indexedDB.open('eisenku10_' + String(K.profileId || 'default').replace(/[^\w-]/g, ''), 1);
      r.onupgradeneeded = () => { ['kv', 'blobs', 'thumbs'].forEach(s => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('IndexedDB bloqueada'));
    } catch (e) { rej(e); }
  }));
  const tx10 = (store, mode, fn) => db10().then(db => new Promise((res, rej) => { const t = db.transaction(store, mode); const q = fn(t.objectStore(store)); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }));
  K.store10 = {
    get: (s, id) => tx10(s, 'readonly', o => o.get(id)), put: (s, obj) => tx10(s, 'readwrite', o => o.put(obj)),
    del: (s, id) => tx10(s, 'readwrite', o => o.delete(id)), all: (s) => tx10(s, 'readonly', o => o.getAll()),
    clear: (s) => tx10(s, 'readwrite', o => o.clear()), keys: (s) => tx10(s, 'readonly', o => o.getAllKeys())
  };

  /* ================= Fuentes instaladas en EISENKU (Administrador de fuentes) ================= */
  K.fonts10 = {
    list: () => (S.get('os10_fonts', []) || []).filter(f => f && f.id && f.family),
    async load(f) { if (f.sys) return false; const r = await K.store10.get('blobs', 'font_' + f.id); if (!r || !r.blob) return false; const ff = new FontFace(f.family, await r.blob.arrayBuffer(), { weight: String(f.weight || 400), style: f.style === 'italic' ? 'italic' : 'normal' }); await ff.load(); document.fonts.add(ff); return true; },
    async loadAll() { let n = 0; for (const f of K.fonts10.list()) { try { if (await K.fonts10.load(f)) n++; } catch (e) { console.warn('Fuente no cargada', f.family, e); } } if (n) K.emit('fonts'); return n; }
  };
  setTimeout(() => { if (K.fonts10.list().length && 'FontFace' in window) K.fonts10.loadAll(); }, 1800);

  /* ================= Registro de eventos del sistema ================= */
  const LOGK = 'os10_eventlog', LOGMAX = 1500;
  let logBuf = null, logT = 0;
  const logList = () => logBuf || (logBuf = (S.get(LOGK, []) || []).filter(x => x && x.t));
  const flush = () => { clearTimeout(logT); logT = 0; if (logBuf) { if (logBuf.length > LOGMAX) logBuf.length = LOGMAX; S.set(LOGK, logBuf); } };
  K.log = (level, source, msg, data) => {
    if (K.services && K.services.isStopped && K.services.isStopped('eventlog')) return;
    const l = logList();
    l.unshift({ t: now(), l: ['info', 'warn', 'error', 'ok'].includes(level) ? level : 'info', s: String(source || 'system').slice(0, 24), m: String(msg || '').slice(0, 300), d: data === undefined ? undefined : String(typeof data === 'string' ? data : JSON.stringify(data)).slice(0, 400) });
    if (!logT) logT = setTimeout(flush, 1500);
    K.emit('log');
  };
  K.logList = () => logList().slice();
  K.logClear = () => { logBuf = []; flush(); K.emit('log'); };
  window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  // fuentes: seguridad, errores de JavaScript, apps, ajustes, sesión
  const sec0 = K.seclog; K.seclog = (type, msg, level = 'info') => { sec0(type, msg, level); K.log(level === 'warn' ? 'warn' : 'info', 'security', '[' + type + '] ' + msg); };
  window.addEventListener('error', e => { if (e && e.target && e.target !== window && e.target.tagName) return; K.log('error', 'javascript', String((e && e.message) || e), String((e && e.filename) || '').split('/').pop() + ':' + ((e && e.lineno) || 0)); });
  window.addEventListener('unhandledrejection', e => { const r = e && e.reason; K.log('error', 'javascript', 'Promesa rechazada: ' + String((r && r.message) || r)); });
  const appName = id => ((E.REG[id] || E.apps().find(a => a.id === id) || {}).name || id);
  document.addEventListener('eisen:open', e => K.log('info', 'app', 'Abierta: ' + appName(e.detail), e.detail));
  document.addEventListener('eisen:close', e => K.log('info', 'app', 'Cerrada: ' + appName(e.detail), e.detail));
  document.addEventListener('eisen:installed', e => { const d = e.detail || {}; K.log('ok', 'apps', (d.on ? 'Instalada: ' : 'Desinstalada: ') + appName(d.id), d.id); });
  K.on('pref', p => { if (p && p.k) K.log('info', 'settings', 'Preferencia «' + p.k + '» = ' + String(p.v).slice(0, 40)); });
  // contador del bus de eventos (Núcleo del sistema)
  const busCount = K.busCount = {};
  const emit0 = K.emit; K.emit = (ev, d) => { busCount[ev] = (busCount[ev] || 0) + 1; return emit0(ev, d); };

  /* ================= Servicios internos ================= */
  const SVCK = 'os10_svc';
  const svcCfg = () => S.get(SVCK, {}) || {};
  const REG = {}, ST = {};
  const svc = K.services = {
    define(id, def) { REG[id] = Object.assign({ id, name: id, desc: '', group: 'Sistema', startType: 'auto', core: false }, def); ST[id] = ST[id] || { state: 'stopped', since: 0, starts: 0, errors: 0, lastError: '' }; if (svc.booted && svc.startType(id) === 'auto') svc.start(id, true); return REG[id]; },
    list: () => Object.values(REG).map(d => Object.assign({ id: d.id, name: d.name, desc: d.desc, group: d.group, core: d.core, startType: svc.startType(d.id), info: d.info ? safe(d.info) : '' }, ST[d.id])),
    get: id => REG[id] ? Object.assign({}, REG[id], ST[id], { startType: svc.startType(id) }) : null,
    startType: id => (svcCfg()[id] || {}).type || (REG[id] || {}).startType || 'manual',
    setStartType(id, type) { if (!REG[id] || !['auto', 'manual', 'disabled'].includes(type)) return; if (REG[id].core && type === 'disabled') return; const c = svcCfg(); c[id] = Object.assign(c[id] || {}, { type }); S.set(SVCK, c); K.log('info', 'service', `Tipo de inicio de «${REG[id].name}»: ${type}`); if (type === 'disabled') svc.stop(id); K.emit('services'); },
    running: id => !!ST[id] && ST[id].state === 'running',
    isStopped: id => !!ST[id] && ST[id].state !== 'running' && svc.booted,
    start(id, quiet) {
      const d = REG[id]; if (!d || ST[id].state === 'running') return false;
      if (svc.startType(id) === 'disabled' && !quiet) { E.toast(tr('El servicio está deshabilitado. Cambia su tipo de inicio.')); return false; }
      try { const r = d.start && d.start(); ST[id] = Object.assign(ST[id], { state: 'running', since: now(), starts: ST[id].starts + 1 }); if (r && r.catch) r.catch(err => fail(id, err)); }
      catch (err) { fail(id, err); return false; }
      if (!quiet) K.log('ok', 'service', 'Servicio iniciado: ' + d.name); K.emit('services'); return true;
    },
    stop(id, quiet) {
      const d = REG[id]; if (!d || ST[id].state !== 'running') return false;
      try { const r = d.stop && d.stop(); if (r && r.catch) r.catch(err => fail(id, err)); } catch (err) { fail(id, err); }
      ST[id].state = 'stopped'; ST[id].since = now(); if (!quiet) K.log('info', 'service', 'Servicio detenido: ' + d.name); K.emit('services'); return true;
    },
    restart(id) { svc.stop(id, true); const ok = svc.start(id, true); K.log('info', 'service', 'Servicio reiniciado: ' + (REG[id] || {}).name); K.emit('services'); return ok; },
    boot() { if (svc.booted) return; svc.booted = true; Object.keys(REG).forEach(id => { if (svc.startType(id) === 'auto') svc.start(id, true); }); K.log('ok', 'system', `${K.label || 'EISENKU OS'} iniciado · ${Object.keys(REG).filter(svc.running).length} servicios en ejecución`); }
  };
  const safe = f => { try { return String(f()); } catch { return ''; } };
  function fail(id, err) { ST[id].state = 'error'; ST[id].errors++; ST[id].lastError = String((err && err.message) || err).slice(0, 200); K.log('error', 'service', `Error en el servicio «${(REG[id] || {}).name || id}»: ${ST[id].lastError}`); K.emit('services'); }

  // Servicio: registro de eventos (detenerlo pausa el registro)
  svc.define('eventlog', { name: 'Registro de eventos', desc: 'Guarda los eventos del sistema, las apps, la seguridad y los servicios para el Visor de eventos.', core: true, start() { }, stop() { flush(); }, info: () => logList().length + ' ' + tr('eventos') });

  /* ================= Programador de tareas ================= */
  const TK = 'os10_tasks';
  const tasks = () => (S.get(TK, []) || []).filter(x => x && x.id);
  const saveTasks = l => { S.set(TK, l); K.emit('sched'); };
  const pad = n => String(n).padStart(2, '0');
  const at = (d, hm) => { const [h, m] = String(hm || '09:00').split(':').map(Number); const x = new Date(d); x.setHours(h || 0, m || 0, 0, 0); return x; };
  function nextRun(t, from = now()) {
    const w = t.when || {}, f = new Date(from);
    if (w.type === 'once') { const d = w.date ? at(new Date(w.date + 'T00:00'), w.at) : null; return d && +d > (t.lastRun || 0) && !t.lastRun ? +d : 0; }
    if (w.type === 'interval') { const ev = Math.max(1, +w.every || 60) * 60000; return (t.lastRun || t.created || from) + ev; }
    if (w.type === 'daily' || w.type === 'weekly') {
      for (let i = 0; i < 8; i++) { const d = at(new Date(f.getFullYear(), f.getMonth(), f.getDate() + i), w.at); if (+d <= Math.max(from, t.lastRun || 0)) continue; if (w.type === 'weekly') { const wd = ((d.getDay() + 6) % 7) + 1; if (!(w.days || []).includes(wd)) continue; } return +d; }
    }
    return 0;
  }
  const ACTIONS = K.SCHED_ACTIONS = {
    notify: { n: 'Mostrar un aviso', arg: 'Texto del aviso', run: (a, t) => { E.notify(t.name, a || tr('Tarea programada'), '⏰', 10000); return 'Aviso mostrado'; } },
    speak: { n: 'Leer un mensaje en voz alta', arg: 'Mensaje', run: a => { if (!window.speechSynthesis) throw new Error(tr('Este navegador no tiene síntesis de voz')); const u = new SpeechSynthesisUtterance(a || 'EISENKU'); u.lang = K.locale || 'es'; speechSynthesis.speak(u); return 'Mensaje leído'; } },
    openApp: { n: 'Abrir una aplicación', arg: 'app', run: a => { if (!E.launch(a)) throw new Error(tr('No se pudo abrir') + ' ' + a); return 'Abierta ' + appName(a); } },
    url: { n: 'Abrir una página en el navegador EISEN', arg: 'https://…', run: a => { if (!/^https?:\/\//i.test(a || '')) throw new Error(tr('Dirección no válida')); E.ebOpenUrl(a, true); return 'Página abierta'; } },
    backup: { n: 'Crear una copia de seguridad completa en Archivos', run: async () => { const r = await K.backup.create({ files: true, exclude: 'documents/Copias de seguridad' }); await K.files.mkdir('documents/Copias de seguridad'); await K.files.save(r.name, r.blob, 'documents/Copias de seguridad'); return `Copia guardada (${K.fmt.bytes(r.stats.size)})`; } },
    snapshot: { n: 'Crear un punto de restauración', run: async () => { await K.backup.snapshot(tr('Programado')); return 'Punto de restauración creado'; } },
    emptyTrash: { n: 'Vaciar la papelera', run: async () => (await K.files.emptyTrash()) + ' archivos eliminados' },
    theme: { n: 'Cambiar el tema claro / oscuro', arg: 'dark|light', run: a => { const s = $('#cfg-theme'); if (!s) throw new Error('Configuración no disponible'); s.value = a === 'light' ? 'light' : 'dark'; s.dispatchEvent(new Event('change')); return 'Tema: ' + s.value; } },
    themeSet: { n: 'Aplicar un tema del Administrador de temas', arg: 'Nombre del tema (p. ej. Bosque profundo)', run: async a => { if (!K.themes) await K.loadScript('js/os10/apps/look10.js'); const t = K.themes.get(a); if (!t || !K.themes.apply(t)) throw new Error(tr('Tema no encontrado') + ': ' + a); return 'Tema: ' + t.name; } },
    lowpower: { n: 'Activar o desactivar bajo consumo', arg: 'on|off', run: a => { K.setLowPower(a !== 'off'); return 'Bajo consumo: ' + (a !== 'off' ? 'sí' : 'no'); } },
    focus: { n: 'Empezar una sesión de concentración', arg: 'minutos', run: a => { K.focus.start(Math.max(1, Math.min(240, +a || 25))); return 'Concentración ' + (+a || 25) + ' min'; } },
    integrity: { n: 'Comprobar la integridad del sistema', run: async () => { const r = await K.integrity.files(); if (r.ok === null) return r.reason; if (!r.ok) E.notify(tr('Integridad'), `${r.modified.length} ${tr('modificados')}, ${r.missing.length} ${tr('ausentes')}`, '🛡️'); return `${r.total} archivos · ${r.modified.length} modificados · ${r.missing.length} ausentes`; } },
    wallpaper: { n: 'Cambiar al siguiente fondo de pantalla', run: () => { if (E.nextWallpaper) E.nextWallpaper(); else throw new Error('No disponible'); return 'Fondo cambiado'; } },
    clearCache: { n: 'Borrar las cachés del navegador EISEN', run: () => { E.ebClearCache && E.ebClearCache(); return 'Cachés borradas'; } },
    servers: { n: 'Comprobar mis servidores favoritos', run: async () => { await K.loadScript('js/os10/apps/network10.js'); return K.ext.servers.checkAll(true); } },
    browserClean: { n: 'Borrar el historial del navegador EISEN', arg: 'horas (vacío = todo)', run: a => { if (!K.ebPrivacy) throw new Error('Navegador no disponible'); const h = +a || 0, r = K.ebPrivacy.clear(h ? Date.now() - h * 3600000 : 0, { history: true, closed: true, downloads: false, site: !h, cache: true }); return (r.history || 0) + ' entradas del historial borradas'; } }
  };
  async function runTask(id, manual) {
    const l = tasks(), t = l.find(x => x.id === id); if (!t) return;
    const A = ACTIONS[(t.action || {}).type]; let res = '', ok = true;
    try { if (!A) throw new Error('Acción desconocida'); res = String(await A.run((t.action || {}).arg, t) || 'OK'); } catch (e) { ok = false; res = String(e.message || e); }
    const l2 = tasks(), t2 = l2.find(x => x.id === id); if (!t2) return;
    t2.lastRun = now(); t2.runs = (t2.runs || 0) + 1; t2.lastResult = (ok ? '✓ ' : '✗ ') + res.slice(0, 160); t2.lastOk = ok;
    if (t2.when && t2.when.type === 'once' && !manual) t2.enabled = false;
    t2.next = t2.enabled ? nextRun(t2) : 0; saveTasks(l2);
    K.log(ok ? 'ok' : 'error', 'scheduler', `${manual ? 'Ejecutada manualmente' : 'Ejecutada'}: ${t.name} → ${res}`);
    return { ok, res };
  }
  K.sched = {
    list: tasks, actions: ACTIONS, nextRun, run: id => runTask(id, true),
    save(t) { const l = tasks(), i = l.findIndex(x => x.id === t.id); t.created = t.created || now(); t.next = t.enabled ? nextRun(t) : 0; if (i >= 0) l[i] = t; else l.push(t); saveTasks(l); K.log('info', 'scheduler', (i >= 0 ? 'Tarea modificada: ' : 'Tarea creada: ') + t.name); return t; },
    remove(id) { const t = tasks().find(x => x.id === id); saveTasks(tasks().filter(x => x.id !== id)); if (t) K.log('info', 'scheduler', 'Tarea eliminada: ' + t.name); }
  };
  let schedT = 0;
  const tick = () => { const n = now(); tasks().filter(t => t.enabled).forEach(t => { const due = t.next || nextRun(t); if (due && due <= n) { const missed = n - due > 5 * 60000; if (missed && !t.catchUp) { const l = tasks(), x = l.find(y => y.id === t.id); x.lastRun = n; x.lastResult = '⏭ ' + tr('Omitida: EISENKU estaba cerrado a esa hora'); x.next = nextRun(x); if (x.when.type === 'once') x.enabled = false; saveTasks(l); K.log('warn', 'scheduler', 'Omitida (estaba cerrado): ' + t.name); } else runTask(t.id); } }); };
  svc.define('scheduler', { name: 'Programador de tareas', desc: 'Ejecuta las tareas programadas (avisos, copias, limpieza, temas…) mientras EISENKU está abierto.', start() { clearInterval(schedT); schedT = setInterval(tick, 20000); setTimeout(tick, 3000); }, stop() { clearInterval(schedT); }, info: () => tasks().filter(t => t.enabled).length + ' ' + tr('tareas activas') });

  /* ================= Historial del portapapeles ================= */
  const CK = 'os10_clip', clipCfg = K.cfg('clipboard', { max: 40, keepOnLock: true });
  const clipList = () => (S.get(CK, []) || []).filter(x => x && typeof x.text === 'string');
  const SECRET_APPS = /^(passwords|passgen)$/;
  const clipAdd = (text, src) => {
    text = String(text || ''); if (!text.trim() || text.length > 20000) return;
    if (!svc.running('clipboard') || SECRET_APPS.test(K.activeApp())) return;
    const l = clipList().filter(x => x.text !== text || x.pin), max = Math.max(5, Math.min(200, +clipCfg.get('max', 40) || 40));
    if (!l.some(x => x.text === text)) l.unshift({ id: E.uid(), text, t: now(), app: K.activeApp(), src: src || 'copy' });
    const pins = l.filter(x => x.pin), rest = l.filter(x => !x.pin).slice(0, max);
    S.set(CK, pins.concat(rest).sort((a, b) => b.t - a.t)); K.emit('clip');
  };
  const onCopy = e => {
    const t = e.target, el = t && t.nodeType === 1 ? t : (t && t.parentElement);
    if (el && el.closest && el.closest('input[type="password"],[data-noclip],[autocomplete="current-password"],[autocomplete="new-password"]')) return;
    let txt = '';
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.selectionStart != null) txt = el.value.slice(el.selectionStart, el.selectionEnd);
    else txt = String(window.getSelection ? window.getSelection() : '');
    setTimeout(() => clipAdd(txt, e.type), 0);
  };
  let wt0 = null;
  K.clip = {
    list: clipList, add: clipAdd, cfg: clipCfg,
    remove: id => { S.set(CK, clipList().filter(x => x.id !== id)); K.emit('clip'); },
    pin: id => { const l = clipList(); const x = l.find(y => y.id === id); if (x) x.pin = !x.pin; S.set(CK, l); K.emit('clip'); },
    clear: (all) => { S.set(CK, all ? [] : clipList().filter(x => x.pin)); K.emit('clip'); K.log('info', 'privacy', 'Historial del portapapeles borrado'); },
    lastEditable: null
  };
  document.addEventListener('focusin', e => { const t = e.target; if (t && (t.matches('textarea,input:not([type]),input[type="text"],input[type="search"],input[type="url"],input[type="email"],input[type="number"]') || t.isContentEditable) && !t.closest('#s10-clip')) K.clip.lastEditable = t; }, true);
  svc.define('clipboard', {
    name: 'Historial del portapapeles', desc: 'Recuerda lo que copias dentro de EISENKU (Ctrl+Alt+V). Nunca guarda campos de contraseña ni lo que copian el Gestor y el Generador de contraseñas.', group: 'Privacidad',
    start() { document.addEventListener('copy', onCopy, true); document.addEventListener('cut', onCopy, true); const cb = navigator.clipboard; if (cb && cb.writeText && !wt0) { wt0 = cb.writeText.bind(cb); cb.writeText = t => { try { clipAdd(t, 'app'); } catch { /* ignorar */ } return wt0(t); }; } },
    stop() { document.removeEventListener('copy', onCopy, true); document.removeEventListener('cut', onCopy, true); },
    info: () => clipList().length + ' ' + tr('elementos')
  });

  /* ================= Historial de conexiones a servicios ================= */
  const NK = 'os10_connlog', NAGG = 'os10_connagg';
  let connBuf = null, connT = 0, po = null, f0 = null;
  const connList = () => connBuf || (connBuf = S.get(NK, []) || []);
  const connFlush = () => { clearTimeout(connT); connT = 0; if (connBuf) S.set(NK, connBuf.slice(0, 300)); };
  window.addEventListener('pagehide', connFlush);
  const cleanUrl = u => { try { const x = new URL(u, location.href); return { host: x.origin === location.origin ? 'EISENKU (' + x.host + ')' : x.host, path: x.pathname.slice(0, 80), local: x.origin === location.origin, proto: x.protocol.replace(':', '') }; } catch { return null; } };
  const connAdd = (o) => {
    const c = cleanUrl(o.url); if (!c || !/^(https?)$/.test(c.proto)) return;
    if (c.local && !/^\/(proxy|p\/|ai)/.test(c.path)) return;   // los archivos propios de EISENKU no son "servicios"
    const l = connList(); l.unshift({ t: now(), host: c.host, path: c.path, kind: o.kind || 'fetch', ms: Math.round(o.ms || 0), size: o.size || 0, status: o.status || 0, ok: o.ok !== false, err: o.err || '' });
    if (l.length > 300) l.length = 300;
    const agg = S.get(NAGG, {}) || {}, a = agg[c.host] || (agg[c.host] = { n: 0, bytes: 0, ms: 0, fail: 0, first: now(), last: 0 });
    a.n++; a.bytes += o.size || 0; a.ms += o.ms || 0; if (o.ok === false) a.fail++; a.last = now();
    const keys = Object.keys(agg); if (keys.length > 120) keys.sort((x, y) => agg[x].last - agg[y].last).slice(0, keys.length - 120).forEach(k => delete agg[k]);
    S.set(NAGG, agg);
    if (!connT) connT = setTimeout(connFlush, 3000); K.emit('connlog');
  };
  K.connlog = { list: () => connList().slice(), agg: () => S.get(NAGG, {}) || {}, clear() { connBuf = []; connFlush(); S.set(NAGG, {}); K.emit('connlog'); K.log('info', 'privacy', 'Historial de conexiones borrado'); } };
  svc.define('connlog', {
    name: 'Historial de conexiones', desc: 'Registra a qué servicios de Internet se conecta EISENKU (solo el servidor y la ruta, nunca parámetros ni contenido).', group: 'Red',
    start() {
      if (window.PerformanceObserver) { try { po = new PerformanceObserver(l => l.getEntries().forEach(en => { if (en.initiatorType === 'fetch') return; if (!/^(xmlhttprequest|iframe|beacon|script|img|link|css|other|audio|video)$/.test(en.initiatorType || '')) return; const c = cleanUrl(en.name); if (!c || c.local) return; connAdd({ url: en.name, kind: en.initiatorType, ms: en.duration, size: en.transferSize || en.encodedBodySize || 0 }); })); po.observe({ type: 'resource', buffered: false }); } catch { po = null; } }
      if (!f0) { f0 = window.fetch; window.fetch = function (input, init) { const t0 = performance.now(), url = typeof input === 'string' ? input : (input && input.url) || String(input); const p = f0.apply(this, arguments); if (svc.running('connlog')) p.then(r => { connAdd({ url, kind: 'fetch', ms: performance.now() - t0, status: r.status || (r.type === 'opaque' ? 0 : r.status), ok: r.ok || r.type === 'opaque', size: +(r.headers && r.headers.get && r.headers.get('content-length')) || 0 }); }, err => { connAdd({ url, kind: 'fetch', ms: performance.now() - t0, ok: false, err: String((err && err.name) || err).slice(0, 60) }); }); return p; }; }
    },
    stop() { if (po) { po.disconnect(); po = null; } connFlush(); },
    info: () => Object.keys(S.get(NAGG, {}) || {}).length + ' ' + tr('servicios')
  });

  /* ================= Vigilancia de la red ================= */
  const netEv = e => { const on = e.type === 'online'; const l = S.get('os10_netevents', []) || []; l.unshift({ t: now(), on }); S.set('os10_netevents', l.slice(0, 60)); K.log(on ? 'ok' : 'warn', 'network', on ? 'Conexión a Internet recuperada' : 'Sin conexión a Internet'); if (K.cfg('network').get('notify', true)) E.toast(on ? '📶 ' + tr('Conexión recuperada') : '⚠️ ' + tr('Sin conexión a Internet')); K.emit('net', on); };
  svc.define('netwatch', { name: 'Supervisión de la red', desc: 'Detecta cuándo se pierde o vuelve la conexión, avisa y lo registra.', group: 'Red', start() { addEventListener('online', netEv); addEventListener('offline', netEv); }, stop() { removeEventListener('online', netEv); removeEventListener('offline', netEv); }, info: () => navigator.onLine ? tr('En línea') : tr('Sin conexión') });

  /* ================= Bloqueo de apps con PIN ================= */
  const LK = K.cfg('applock', { apps: [] });
  const unlocked = new Set();
  K.applock = {
    apps: () => (LK.get('apps', []) || []).filter(id => E.REG[id] || E.apps().some(a => a.id === id)),
    set(id, on) { const l = new Set(K.applock.apps()); if (on) l.add(id); else l.delete(id); LK.set('apps', [...l]); K.seclog('applock', (on ? 'Bloqueo con PIN activado para ' : 'Bloqueo con PIN quitado de ') + appName(id)); if (on) unlocked.delete(id); },
    locked: id => K.applock.apps().includes(id) && !unlocked.has(id) && svc.running('applock') && !!K.profiles.current().pin,
    relock() { unlocked.clear(); $$('.window.open').forEach(w => guard(w.id.slice(4))); }
  };
  function guard(id) {
    const w = document.getElementById('win-' + id); if (!w || !K.applock.locked(id) || w.querySelector('.s10-lockov')) return;
    const ov = document.createElement('form'); ov.className = 's10-lockov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', tr('App bloqueada'));
    ov.innerHTML = `<div>${I('lock', 34)}<b>${esc(appName(id))}</b><p>${esc(tr('Esta app está protegida con el PIN del perfil.'))}</p><input type="password" inputmode="numeric" autocomplete="off" maxlength="32" placeholder="PIN" aria-label="PIN" data-noclip><button class="btn-primary">${esc(tr('Desbloquear'))}</button><small data-m></small></div>`;
    w.appendChild(ov); setTimeout(() => { const i = ov.querySelector('input'); if (i && w.classList.contains('active')) i.focus(); }, 60);
    ov.addEventListener('submit', async e => { e.preventDefault(); const r = await K.profiles.verify(K.profileId, ov.querySelector('input').value); if (r === true) { unlocked.add(id); ov.remove(); K.seclog('applock', 'Desbloqueada ' + appName(id)); } else { ov.querySelector('[data-m]').textContent = r === 'locked' ? tr('Demasiados intentos. Espera unos minutos.') : tr('PIN incorrecto'); ov.querySelector('input').value = ''; K.seclog('applock', 'PIN incorrecto al abrir ' + appName(id), 'warn'); } });
  }
  document.addEventListener('eisen:open', e => requestAnimationFrame(() => guard(e.detail)));
  document.addEventListener('eisen:close', e => { if (LK.get('relockOnClose', true)) unlocked.delete(e.detail); });
  svc.define('applock', { name: 'Bloqueo de apps', desc: 'Pide el PIN del perfil para abrir las apps que elijas.', group: 'Seguridad', start() { }, stop() { $$('.s10-lockov').forEach(x => x.remove()); }, info: () => K.applock.apps().length + ' ' + tr('apps protegidas') });
  const lock0 = E.lock9; if (lock0) { E.lock9 = E.lock = () => { lock0(); K.applock.relock(); if (!K.clip.cfg.get('keepOnLock', true)) K.clip.clear(false); }; }

  /* ================= Pantalla de privacidad y bloqueo al ocultar ================= */
  const PV = K.cfg('privacyscreen', { blur: false, lockAfter: 0 });
  let hiddenAt = 0;
  const vis = () => {
    if (document.hidden) { hiddenAt = now(); if (PV.get('blur')) html.classList.add('s10-privacy'); }
    else { const m = +PV.get('lockAfter', 0) || 0; if (m > 0 && hiddenAt && now() - hiddenAt > m * 60000 && !(K.login && K.login.visible())) { E.lock9(); K.log('info', 'security', 'Bloqueo al volver tras ' + m + ' min oculto'); } hiddenAt = 0; setTimeout(() => html.classList.remove('s10-privacy'), 60); }
  };
  svc.define('privacyscreen', { name: 'Pantalla de privacidad', desc: 'Difumina EISENKU cuando cambias de pestaña o de app y puede bloquearlo si estuvo oculto mucho tiempo.', group: 'Seguridad', start() { document.addEventListener('visibilitychange', vis); }, stop() { document.removeEventListener('visibilitychange', vis); html.classList.remove('s10-privacy'); } });

  /* ================= Papelera: vaciado automático por antigüedad ================= */
  const TR = K.cfg('trash', { days: 0 });
  let trT = 0;
  const trashSweep = async () => { const d = +TR.get('days', 0) || 0; if (!d || !K.files) return 0; const lim = now() - d * 864e5; const l = (await K.files.allRaw()).filter(f => f.trash && f.trash.at < lim); for (const f of l) await K.files.destroy(f.id); if (l.length) K.log('info', 'file', `Papelera: ${l.length} archivos con más de ${d} días eliminados`); return l.length; };
  K.trashSweep = trashSweep;
  svc.define('trashclean', { name: 'Limpieza de la papelera', desc: 'Elimina los archivos que llevan en la papelera más días de los indicados (desactivado si los días son 0).', group: 'Archivos', start() { clearInterval(trT); trT = setInterval(trashSweep, 3600000); setTimeout(trashSweep, 15000); }, stop() { clearInterval(trT); }, info: () => (+TR.get('days', 0) ? TR.get('days') + ' ' + tr('días') : tr('sin límite')) });

  /* ================= Modo sin conexión (Service Worker) ================= */
  svc.define('offline', {
    name: 'Modo sin conexión', desc: 'Service Worker que guarda una copia de EISENKU para abrirlo sin Internet (solo con http/https).', group: 'Red',
    start() { if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) { K.pref('offline', true); return navigator.serviceWorker.register('sw.js'); } },
    async stop() { K.pref('offline', false); if (navigator.serviceWorker) { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.unregister(); } },
    info: () => ('serviceWorker' in navigator) ? (navigator.serviceWorker.controller ? tr('controlando la página') : tr('registrado al recargar')) : tr('no disponible')
  });
  if (K.pref('offline') === false) S.set(SVCK, Object.assign(svcCfg(), { offline: Object.assign(svcCfg().offline || {}, { type: (svcCfg().offline || {}).type || 'manual' }) }));

  /* ================= Enlaces compartidos recibidos (PWA share_target) ================= */
  try {
    const qs = new URLSearchParams(location.search);
    if (qs.has('share_url') || qs.has('share_text') || qs.has('share_title')) {
      const txt = qs.get('share_text') || '';
      const item = { id: E.uid(), title: (qs.get('share_title') || '').slice(0, 200), text: txt.slice(0, 2000), url: (qs.get('share_url') || (txt.match(/https?:\/\/\S+/) || [''])[0]).slice(0, 2000), t: now(), src: 'shared', tags: [] };
      if (item.url && !/^https?:\/\//i.test(item.url)) item.url = '';
      const l = S.get('sharelinks_list', []) || []; l.unshift(item); S.set('sharelinks_list', l.slice(0, 500));
      history.replaceState(null, '', location.pathname);
      setTimeout(() => { E.launch('sharelinks'); E.notify(tr('Enlace recibido'), item.title || item.url || item.text.slice(0, 80), '🔗'); }, 1800);
      K.log('info', 'network', 'Contenido compartido recibido desde otra app');
    }
  } catch { /* sin URLSearchParams */ }

  /* ================= Modos de compatibilidad por app (Administrador de compatibilidad) ================= */
  const compatMap = () => S.get('os10_compat', {}) || {};
  document.addEventListener('eisen:open', e => { const c = compatMap()[e.detail], w = document.getElementById('win-' + e.detail); if (!w) return; w.classList.toggle('s10-noanim', !!(c && c.noanim)); if (!c) return; if (c.max && innerWidth >= 700 && !w.classList.contains('maximized')) { w.classList.add('maximized'); E.updateTaskbarButtons(); } if (c.unload && K.MANIFESTS[e.detail]) K.MANIFESTS[e.detail].unload = true; });
  K.compat = { all: compatMap, get: id => compatMap()[id] || {}, set(id, patch) { const m = compatMap(); m[id] = Object.assign(m[id] || {}, patch); if (!Object.values(m[id]).some(Boolean)) delete m[id]; S.set('os10_compat', m); if (K.MANIFESTS[id] && patch.unload === false) K.MANIFESTS[id].unload = false; K.log('info', 'apps', 'Modo de compatibilidad de ' + appName(id) + ': ' + JSON.stringify(m[id] || {})); } };

  /* ================= Utilidades de interfaz para las apps 10.0 ================= */
  K.u10 = {
    tabs: (list, cur, attr = 'tab') => `<div class="k9-tabs" role="tablist">${list.map(([k, l, ic]) => `<button role="tab" aria-selected="${k === cur}" class="${k === cur ? 'on' : ''}" data-${attr}="${esc(k)}">${ic ? I(ic, 14) + ' ' : ''}${esc(tr(l))}</button>`).join('')}</div>`,
    kv: rows => `<dl class="s10-kv">${rows.filter(Boolean).map(([k, v, raw]) => `<dt>${esc(tr(k))}</dt><dd>${raw ? v : esc(v == null || v === '' ? '—' : String(v))}</dd>`).join('')}</dl>`,
    kpi: (v, l, cls = '') => `<div class="k9-card k9-kpi ${cls}"><b>${esc(String(v))}</b><span>${esc(tr(l))}</span></div>`,
    meter: (pct, cls = '') => `<div class="k9-meter ${cls || (pct > 85 ? 'bad' : pct > 65 ? 'warn' : '')}"><i style="width:${Math.max(0, Math.min(100, +pct || 0)).toFixed(1)}%"></i></div>`,
    note: (text, kind = 'info') => `<div class="s10-note ${kind}">${I(kind === 'warn' ? 'shield' : 'info', 15)}<span>${esc(tr(text))}</span></div>`,
    // gráfico de líneas sencillo en un canvas (series: [{v:[...], c:'#hex'}])
    chart(cv, series, o = {}) {
      const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth || cv.width, H = cv.clientHeight || cv.height; if (!W || !H) return;
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      const all = series.flatMap(s => s.v).filter(Number.isFinite); const max = o.max != null ? o.max : Math.max(1e-9, ...all) * 1.12, min = o.min != null ? o.min : 0;
      c.strokeStyle = 'rgba(127,127,127,.18)'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { const y = Math.round(H * i / 4) + .5; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      series.forEach(s => { const n = s.v.length; if (n < 2) return; c.beginPath(); s.v.forEach((v, i) => { const x = i / (Math.max(n, o.n || n) - 1) * W, y = H - (Math.max(min, Math.min(max, v)) - min) / (max - min) * (H - 4) - 2; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.strokeStyle = s.c || '#34a582'; c.lineWidth = 1.8; c.stroke(); if (s.fill) { c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fillStyle = s.fill; c.fill(); } });
      if (o.label) { c.fillStyle = 'rgba(160,160,170,.9)'; c.font = '11px system-ui'; c.fillText(o.label, 6, 13); }
    },
    async pickBlob(o = {}) { const f = await K.files.pick({ title: o.title, accept: o.accept, deviceAccept: o.deviceAccept, folder: o.folder || 'downloads' }); return f ? { name: f.name, blob: f.blob, id: f.id, folder: f.folder } : null; },
    async saveBlob(name, blob, folder = 'documents') { const n = await K.files.uniqueName(folder, K.files.cleanName(name)); const id = await K.files.save(n, blob, folder); E.toast(tr('Guardado en Archivos') + ': ' + K.files.pretty(folder) + ' › ' + n); return id; },
    dur: ms => { const s = Math.max(0, Math.round(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h} h ${pad(m)} min` : m ? `${m} min ${pad(x)} s` : `${x} s`; },
    hms: sec => { sec = Math.max(0, +sec || 0); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = Math.floor(sec % 60); return (h ? h + ':' + pad(m) : m) + ':' + pad(s); },
    debounce: (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },
    hex: (u8, max = 64) => [...u8.slice(0, max)].map(b => b.toString(16).padStart(2, '0')).join(' ')
  };

  /* ================= Versiones de apps: las apps nuevas no son "actualizaciones" =================
     (corrige 9.0: en una instalación nueva el App Center mostraba como actualizaciones pendientes las apps
     que simplemente no tenían versión registrada). Las apps que ya existían con una versión anterior sí aparecen. */
  const recordNewApps = () => { if (!K.appVerOf) return; const m = K.appVersions(); let ch = 0; Object.keys(E.REG).forEach(id => { if (!m[id]) { const v = K.appVerOf(id); if (v && v !== '—') { m[id] = v; ch++; } } }); if (ch) { S.set('os9_app_versions', m); K.log('info', 'apps', ch + ' apps nuevas registradas con su versión'); } };

  /* ================= Arranque de servicios ================= */
  const bootSvc = () => setTimeout(() => { recordNewApps(); svc.boot(); }, 0);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootSvc); else bootSvc();
  /* ================= Terminal: comandos 10.0 (services, sched, events, hash, sysinfo10, theme) ================= */
  const TC = E.termCmds;
  if (TC) {
    const ALG = { md5: 'MD5', sha1: 'SHA-1', 'sha-1': 'SHA-1', sha256: 'SHA-256', 'sha-256': 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512', 'sha-512': 'SHA-512', crc32: 'CRC32' };
    Object.assign(TC, {
      services: ['Servicios del sistema (services [start|stop|restart <id>])', a => {
        const [op, id] = a;
        if (op) { if (!id || !['start', 'stop', 'restart'].includes(op)) return 'Uso: services [start|stop|restart <id>]'; const d = svc.get(id); if (!d) return 'Servicio desconocido: ' + id; if (op === 'stop' && d.core) return 'El servicio «' + d.name + '» es esencial y no se puede detener.'; const ok = op === 'start' ? svc.start(id) : op === 'stop' ? svc.stop(id) : svc.restart(id); return (ok ? '✓ ' : '✗ ') + op + ' ' + id + ' → ' + svc.get(id).state; }
        return '  ID             ESTADO   INICIO     NOMBRE\n' + svc.list().map(x => `  ${x.id.padEnd(14)} ${x.state.padEnd(8)} ${x.startType.padEnd(10)} ${x.name}`).join('\n');
      }],
      sched: ['Tareas programadas (sched · sched run <id>)', async a => {
        if (a[0] === 'run') { if (!a[1]) return 'Uso: sched run <id>'; const r = await K.sched.run(a[1]); return r ? (r.ok ? '✓ ' : '✗ ') + r.res : 'No existe la tarea ' + a[1]; }
        const l = K.sched.list(); return l.length ? '  ID          ESTADO   PRÓXIMA               NOMBRE\n' + l.map(t => `  ${String(t.id).slice(0, 10).padEnd(11)} ${(t.enabled ? 'activa' : 'pausada').padEnd(8)} ${(t.enabled && t.next ? K.fmt.dt(t.next) : '—').padEnd(21)} ${t.name}`).join('\n') : 'No hay tareas. Créalas en el Programador de tareas.';
      }],
      events: ['Últimos eventos del sistema (events [n] [error|warn|info|ok])', a => {
        const n = Math.max(1, Math.min(200, parseInt(a.find(x => /^\d+$/.test(x)), 10) || 15)), lv = a.find(x => /^(error|warn|info|ok)$/.test(x));
        return K.logList().filter(e => !lv || e.l === lv).slice(0, n).map(e => `${new Date(e.t).toLocaleTimeString(K.locale)} ${e.l.toUpperCase().padEnd(5)} [${e.s}] ${e.m}`).join('\n') || 'Sin eventos';
      }],
      hash: ['Huella de un archivo o texto (hash <archivo> [md5|sha1|sha256|sha512|crc32] · hash -t "texto")', async a => {
        if (!a.length) return 'Uso: hash <archivo> [algoritmo] · hash -t "texto" [algoritmo]';
        if (!K.hash) await K.loadScript('js/os10/lib/hash10.js');
        const al = ALG[(a.find((x, i) => i > 0 && ALG[x.toLowerCase()]) || '').toLowerCase()] || 'SHA-256';
        if (a[0] === '-t') { const t = a.slice(1).filter(x => !ALG[x.toLowerCase()]).join(' '); const r = await K.hash.compute(t, [al]); return `${al} ("${t}") = ${r[al]}`; }
        const n = a[0].replace(/^\/+/, ''), all = await K.files.all(), f = all.find(x => (x.folder + '/' + x.name) === n) || all.find(x => x.name === n);
        if (!f) return 'No existe: ' + a[0] + ' (escribe el nombre o carpeta/nombre)';
        const r = await K.hash.compute((await K.files.get(f.id)).blob, [al]); return `${r[al]}  ${f.name}   (${al}, ${K.fmt.bytes(f.size)})`;
      }],
      sysinfo10: ['Resumen técnico de EISENKU OS 10.0', async () => {
        const nav = navigator, ua = nav.userAgentData, br = ua && ua.brands ? ua.brands.filter(x => !/not.?a.?brand/i.test(x.brand)).map(x => x.brand + ' ' + x.version).join(', ') : nav.userAgent.slice(0, 80);
        let st = ''; try { const e = await nav.storage.estimate(); st = K.fmt.bytes(e.usage || 0) + ' / ' + K.fmt.bytes(e.quota || 0); } catch { st = 'no disponible'; }
        const ids = Object.keys(E.REG || {}), inst = ids.filter(id => E.isInstalled && E.isInstalled(id)).length, v10 = ids.filter(id => K.MANIFESTS && K.MANIFESTS[id] && K.MANIFESTS[id].v10).length, sl = svc.list(), up = Math.floor((Date.now() - (K.t0 || Date.now())) / 1000), c = nav.connection;
        return [`${K.label || 'EISENKU OS'} · ${K.version} (${K.codename || ''}) · compilación ${K.build}`, `Entorno: ${document.documentElement.dataset.env === 'linux' ? 'EISENKU LINUX MODE' : 'EISENKU WINDOWS MODE'} · tema ${document.documentElement.dataset.theme || 'dark'} · idioma ${K.locale || 'es'}${document.documentElement.classList.contains('low-power') ? ' · bajo consumo' : ''}`, `Apps: ${ids.length} registradas (${v10} nuevas en 10.0) · ${inst} instaladas`, `Servicios: ${sl.filter(x => x.state === 'running').length} en marcha de ${sl.length}${sl.some(x => x.state === 'error') ? ' · con errores: ' + sl.filter(x => x.state === 'error').map(x => x.id).join(', ') : ''}`, `Navegador: ${br} · ${(ua && ua.platform) || nav.platform || '?'}${ua && ua.mobile ? ' (móvil)' : ''}`, `Núcleos lógicos: ${nav.hardwareConcurrency || '?'} · memoria aproximada: ${nav.deviceMemory ? nav.deviceMemory + ' GB (dato redondeado por el navegador)' : 'no la indica el navegador'}`, `Pantalla: ${screen.width}×${screen.height} · escala ${devicePixelRatio} · táctil: ${nav.maxTouchPoints > 0 ? 'sí' : 'no'}`, `Almacenamiento de EISENKU: ${st}`, `Red: ${nav.onLine ? 'conectado' : 'sin conexión'}${c && c.effectiveType ? ' · ' + c.effectiveType + (c.downlink ? ' ~' + c.downlink + ' Mb/s (estimación del navegador)' : '') : ''}`, `Tiempo de actividad: ${Math.floor(up / 3600)} h ${Math.floor(up % 3600 / 60)} min ${up % 60} s`, 'Nota: los navegadores no permiten leer la temperatura, el uso real de CPU/GPU ni los procesos del sistema operativo.'].join('\n');
      }],
      theme: ['Temas (theme · theme <nombre>)', async a => {
        if (!K.themes) await K.loadScript('js/os10/apps/look10.js');
        if (!a.length) return 'Temas disponibles:\n' + K.themes.list().map(t => '  ' + t.name + (K.themes.current() === t.id ? '  ← actual' : '')).join('\n');
        const t = K.themes.get(a.join(' ')); if (!t) return 'No existe el tema «' + a.join(' ') + '». Escribe theme para ver la lista.'; K.themes.apply(t); return 'Tema aplicado: ' + t.name;
      }]
    });
    E.termCount = Object.keys(TC).length;
  }

  K.v10 = true;
})();

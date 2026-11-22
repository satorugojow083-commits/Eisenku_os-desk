/* =====================================================================
   EISEN OS PRIME 11.0 · Interfaz PRIME (arranque; después de prime11.js)
   Ventanas adaptables, táctil y tabletas, mando y Xbox, Inicio, rendimiento, accesibilidad,
   personalización, notificaciones, widgets, plugins, reglas, recordatorios y paleta de comandos.
   Todo se engancha a lo existente (K.keys, K.widgets, K.gamepadNav, K.ui.menu, E.notify, E.deskMenuExtra…).
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, P = K && K.prime; if (!E || !K || !P) return;
  const S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, $ = K.$, $$ = K.$$, html = document.documentElement, caps = P.caps;
  const now = () => Date.now(), pref = k => K.pref(k);
  const appOf = id => E.REG[id] || E.apps().find(a => a.id === id) || null;
  const activeWin = () => $('.window.active.open:not(.minimized)');
  const isOpen = w => w && w.classList.contains('open') && !w.classList.contains('minimized');
  const typing = t => !!(t && t.closest && t.closest('input,textarea,select,[contenteditable="true"],[contenteditable=""]'));
  const buzz = (ms = 12) => { if (caps.vibrate && pref('p11Haptics') !== false) { try { navigator.vibrate(ms); } catch { /* sin vibración */ } } };
  const el = (t, a, h) => K.ui.el(t, a || {}, h || '');
  Object.assign(K.PREF_DEF, { p11Font: 'system', p11Taskbar: 'glass', p11Icons: 'vivid' });
  const feat = P.feat = new Set(); const F = id => feat.add(id);   // marca de funciones disponibles (Centro PRIME › Funciones)

  /* ================= 1. Ventanas adaptables por su propio ancho (d1) ================= */
  const ro = 'ResizeObserver' in window ? new ResizeObserver(es => es.forEach(en => { const w = en.target, cw = en.contentRect.width; w.classList.toggle('w-sm', cw < 720); w.classList.toggle('w-xs', cw < 480); })) : null;
  const watchWin = w => { if (ro && w && !w.__p11ro) { w.__p11ro = 1; ro.observe(w); } };
  $$('.window').forEach(watchWin); document.addEventListener('eisen:window-created', e => watchWin(document.getElementById('win-' + e.detail)));
  if (ro) F('d1');

  /* ================= 2. Herramientas de ventana: rescatar, transparencia, enrollar, agitar, mover con teclado (d2-d6) ================= */
  const area = () => (K.workArea ? K.workArea() : { x: 0, y: 0, w: innerWidth, h: innerHeight - 48 });
  P.rescueWindows = (quiet) => {
    const A = area(); let n = 0;
    $$('.window.open').forEach(w => {
      if (w.classList.contains('maximized')) return;
      const r = w.getBoundingClientRect(); let W = r.width, H = r.height, ch = false;
      if (W > A.w) { W = A.w; w.style.width = W + 'px'; ch = true; } if (H > A.h) { H = A.h; w.style.height = H + 'px'; ch = true; }
      const L = Math.max(A.x, Math.min(A.x + A.w - W, r.left)), T = Math.max(A.y, Math.min(A.y + A.h - Math.min(H, 60), r.top));
      if (Math.abs(L - r.left) > 1 || Math.abs(T - r.top) > 1 || r.top > A.y + A.h - 40) { w.style.left = L + 'px'; w.style.top = Math.min(T, A.y + A.h - H) < A.y ? A.y + 'px' : Math.min(T, A.y + A.h - H) + 'px'; ch = true; }
      if (ch) n++;
    });
    if (!quiet) E.toast(n ? n + ' ' + tr('ventanas devueltas a la pantalla') : tr('Todas las ventanas ya estaban visibles'));
    return n;
  };
  K.keys.register('p11rescue', 'Rescatar ventanas fuera de la pantalla', 'Ctrl+Alt+Home', () => P.rescueWindows(), 'Ventanas'); F('d2');
  const shade = w => { w.classList.toggle('p11-shade'); if (w.classList.contains('p11-shade')) w.classList.remove('maximized'); };
  const OPS = [1, .9, .8, .7];
  const cycleOp = w => { const i = (OPS.indexOf(+(w.dataset.p11op || 1)) + 1) % OPS.length; w.dataset.p11op = OPS[i]; w.style.opacity = OPS[i] === 1 ? '' : String(OPS[i]); };
  let menuWin = null; document.addEventListener('contextmenu', e => { menuWin = e.target.closest ? e.target.closest('.window') : null; }, true);
  const menu0 = K.ui.menu;
  K.ui.menu = (x, y, items) => {
    try {
      if (menuWin && Array.isArray(items) && items.some(it => it && it.label === 'Ayuda de esta app (Handbook)')) {
        const w = menuWin, op = +(w.dataset.p11op || 1);
        const extra = [{ sep: true }, { label: w.classList.contains('p11-shade') ? 'Desenrollar ventana' : 'Enrollar ventana (solo la barra)', icon: 'up', act: () => shade(w) }, { label: tr('Transparencia') + ' ' + Math.round(op * 100) + '% → ' + Math.round(OPS[(OPS.indexOf(op) + 1) % OPS.length] * 100) + '%', icon: 'eye', act: () => cycleOp(w) }, { label: 'Pantalla dividida con otra app…', icon: 'grid', act: () => P.split(w) }, { label: 'Mover o redimensionar con el teclado', icon: 'target', act: () => kbMove(w), kbd: 'Alt+Shift+M' }, { label: 'Rescatar ventanas fuera de la pantalla', icon: 'refresh', act: () => P.rescueWindows(), kbd: 'Ctrl+Alt+Home' }];
        items = items.slice(); items.splice(Math.max(0, items.length - 2), 0, ...extra);
      }
    } catch (e) { console.error(e); }
    return menu0(x, y, items);
  };
  F('d3'); F('d4');
  // (d5) agitar una ventana por su barra de título minimiza las demás del escritorio actual
  let shake = null;
  document.addEventListener('pointerdown', e => { const h = e.target.closest && e.target.closest('.window-header'); if (!h || e.target.closest('button')) return; shake = { w: h.closest('.window'), x: e.clientX, dir: 0, flips: [], last: e.clientX }; }, true);
  document.addEventListener('pointermove', e => {
    if (!shake || !e.buttons) return; const dx = e.clientX - shake.last; if (Math.abs(dx) < 14) return;
    const d = Math.sign(dx); if (shake.dir && d !== shake.dir) { shake.flips.push(now()); shake.flips = shake.flips.filter(t => now() - t < 700); if (shake.flips.length >= 4) { const keep = shake.w; $$('.window.open:not(.minimized)').forEach(w => { if (w !== keep && !w.classList.contains('s9-otherdesk')) w.classList.add('minimized'); }); E.updateTaskbarButtons && E.updateTaskbarButtons(); E.toast('🫨 ' + tr('Se minimizaron las demás ventanas')); buzz(20); shake = null; return; } }
    shake.dir = d; shake.last = e.clientX;
  });
  document.addEventListener('pointerup', () => { shake = null; }); F('d5');
  // (d6) mover/redimensionar con flechas (también funciona con la cruceta del mando)
  let kbm = null;
  function kbMove(w) {
    w = w || activeWin(); if (!w) return; if (w.classList.contains('maximized')) w.classList.remove('maximized');
    kbm = w; w.classList.add('p11-kbmove'); E.toast(tr('Flechas: mover · Mayús+flechas: tamaño · Enter o Esc: terminar'));
  }
  document.addEventListener('keydown', e => {
    if (!kbm) return; const w = kbm, st = e.shiftKey ? 'size' : 'move', step = e.ctrlKey ? 2 : 24;
    const k = e.key; if (k === 'Enter' || k === 'Escape') { e.preventDefault(); e.stopPropagation(); w.classList.remove('p11-kbmove'); kbm = null; P.rescueWindows(true); return; }
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k]; if (!d) return;
    e.preventDefault(); e.stopPropagation(); const r = w.getBoundingClientRect();
    if (st === 'move') { w.style.left = Math.max(0, Math.min(innerWidth - 80, r.left + d[0] * step)) + 'px'; w.style.top = Math.max(0, Math.min(innerHeight - 60, r.top + d[1] * step)) + 'px'; }
    else { w.style.width = Math.max(280, r.width + d[0] * step) + 'px'; w.style.height = Math.max(180, r.height + d[1] * step) + 'px'; }
  }, true);
  K.keys.register('p11move', 'Mover o redimensionar la ventana con el teclado', 'Alt+Shift+M', () => kbMove(), 'Ventanas'); F('d6');

  /* ================= 3. Escritorio: insignia «Nuevo», ordenar por uso, bloquear iconos (d7-d9) ================= */
  const deskHost = $('#desktop-icons');
  const decorate = () => { const it = E.desktopItems ? E.desktopItems() : []; $$('.dk-ico[data-did]', deskHost).forEach(b => { const x = it.find(i => i.id === b.dataset.did); b.classList.toggle('p11-newapp', !!(x && x.t === 'app' && P.isNew(x.ref))); }); };
  if (deskHost) new MutationObserver(() => { if (!deskHost.__p11d) { deskHost.__p11d = 1; requestAnimationFrame(() => { deskHost.__p11d = 0; decorate(); }); } }).observe(deskHost, { childList: true });
  decorate(); F('d7');
  P.sortDeskByUse = () => { const it = E.desktopItems && E.desktopItems(); if (!it) return; const use = x => x.t === 'app' ? P.reg.usage(x.ref) : x.t === 'folder' ? 1e6 : -1; const top = it.filter(x => !x.p).sort((a, b) => use(b) - use(a) || a.name.localeCompare(b.name)), rest = it.filter(x => x.p); top.forEach(x => { x.x = null; x.y = null; }); it.splice(0, it.length, ...top, ...rest); E.desktopRender(); E.toast(tr('Iconos ordenados por uso')); };
  F('d8');
  let dkPress = false;
  document.addEventListener('pointerdown', e => { dkPress = !!(pref('p11DeskLock') && e.target.closest && e.target.closest('#desktop-icons .dk-ico')); }, true);
  window.addEventListener('pointermove', e => { if (dkPress && e.buttons) e.stopPropagation(); }, true);
  window.addEventListener('pointerup', () => { dkPress = false; }, true); F('d9');
  const dme0 = E.deskMenuExtra;
  E.deskMenuExtra = () => [...(dme0 ? dme0() : []), { k: 'p11', i: '✦', l: 'PRIME', sub: [
    { i: '📊', l: tr('Ordenar iconos por uso'), f: P.sortDeskByUse },
    { i: pref('p11DeskLock') ? '🔓' : '🔒', l: pref('p11DeskLock') ? tr('Desbloquear iconos') : tr('Bloquear iconos (evita arrastres)'), f: () => K.pref('p11DeskLock', !pref('p11DeskLock')) },
    { i: '🪟', l: tr('Rescatar ventanas'), f: () => P.rescueWindows() },
    { i: '🖼️', l: tr('Fondos PRIME'), f: () => { const k = Object.keys(PWP); E.setWp(k[(k.indexOf(S.get('wp', '')) + 1) % k.length]); } },
    { i: '🎨', l: tr('Acento desde el fondo'), f: () => P.accentFromWallpaper() },
    { i: '🧸', l: html.classList.contains('p11-easy') ? tr('Salir del modo fácil') : tr('Modo fácil'), f: () => P.easyMode(!html.classList.contains('p11-easy')) },
    { i: '✦', l: tr('Centro PRIME'), f: () => E.launch('primecenter') }] }];

  /* ================= 4. Menú Inicio PRIME (s1-s10) ================= */
  const sm = $('#start-menu-panel'), sBody = sm && sm.querySelector('.start-body'), sIn = $('#start-search-input');
  if (sm && sBody) {
    const box = el('div', { class: 'p11-sm' }); const rec = $('#start-recents-list'); (rec ? rec.parentElement : sBody).insertBefore(box, rec ? rec.nextSibling : null);
    const tile = a => `<button class="start-app-item${P.isNew(a.id) ? ' p11-newapp' : ''}" data-sa="${esc(a.id)}" title="${esc(a.desc || a.name)}">${E.tile(a, 40)}<span class="start-name">${esc(a.name)}</span></button>`;
    const QA = [['downloads', '⬇️', 'Descargas'], ['transfer', '🔁', 'Transferir'], ['primecenter', '✦', 'Centro PRIME'], ['assistant', '✦', 'Domingo']];
    const renderBox = () => {
      const recent = P.reg.recent(6).map(appOf).filter(Boolean), used = P.reg.topUsed(6).map(appOf).filter(Boolean), links = P.plugins ? P.plugins.links() : [];
      box.innerHTML = `<div class="p11-qa">${QA.filter(q => appOf(q[0]) && E.isInstalled(q[0])).map(q => `<button class="p11-qab" data-sa="${q[0]}"><span>${q[1]}</span>${esc(tr(q[2]))}</button>`).join('')}</div>`
        + (recent.length ? `<div class="start-section-title"><span>${esc(tr('Recién instaladas'))}</span></div><div class="start-grid-apps">${recent.map(tile).join('')}</div>` : '')
        + (used.length ? `<div class="start-section-title"><span>${esc(tr('Más usadas'))}</span></div><div class="start-grid-apps">${used.map(tile).join('')}</div>` : '')
        + (links.length ? `<div class="start-section-title"><span>${esc(tr('Enlaces de plugins'))}</span></div><div class="ui-stack">${links.map(l => `<button class="sm-row" data-p11url="${esc(l.url)}"><span class="sm-fic">${esc(l.icon || '🔗')}</span><span>${esc(l.name)}</span><small>${esc(l.plugin)}</small></button>`).join('')}</div>` : '');
    };
    new MutationObserver(() => { if (sm.classList.contains('open')) { renderBox(); html.classList.toggle('p11-startfull-on', !!pref('p11StartFull')); } }).observe(sm, { attributes: true, attributeFilter: ['class'] });
    ['s1', 's2', 's6', 's7'].forEach(F);
    // búsqueda: calculadora, tolerancia a errores e instalar desde aquí (s3, s4, s9)
    const res = sBody.querySelector('.sm-results');
    const lev = (a, b) => { if (a === b) return 0; const m = a.length, n = b.length; if (!m || !n) return m || n; let p = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; };
    const fuzzy = (q, list) => { q = K.norm(q); if (q.length < 3) return []; return list.map(a => { const words = K.norm(a.name).split(/\s+/).concat([K.norm(a.name)]); const d = Math.min(...words.map(w => lev(q, w.slice(0, Math.max(q.length, Math.min(w.length, q.length + 2)))))); return [a, d]; }).filter(([, d]) => d <= (q.length > 6 ? 2 : 1)).sort((x, y) => x[1] - y[1]).slice(0, 5).map(x => x[0]); };
    P.fuzzyApps = fuzzy;
    if (res) new MutationObserver(() => {
      if (res.querySelector('[data-p11s]') || res.hidden) return; const q = (sIn && sIn.value || '').trim(); if (!q) return;
      let add = '';
      const ex = q.replace(/^=/, '').replace(/,/g, '.'); if (/[\d)]\s*[-+*/^%]\s*[\d(.]|^=|sqrt|sin|cos|log/i.test(q) && /^[=\d\s+\-*/^().,%πe a-z]+$/i.test(q)) { try { const v = E.math.eval(ex); if (Number.isFinite(v)) add += `<h4 data-p11s>${esc(tr('Calculadora'))}</h4><button class="sm-row" data-p11copy="${esc(String(+v.toPrecision(12)))}"><span class="sm-fic">🧮</span><span>= <b>${esc(String(+v.toPrecision(12)))}</b></span><small>${esc(tr('Copiar'))}</small></button>`; } catch { /* no es una operación */ } }
      if (!res.querySelector('[data-sa]')) { const f = fuzzy(q, E.installedApps().filter(a => a.id !== 'deskfolder')); if (f.length) add += `<h4 data-p11s>${esc(tr('¿Quisiste decir…?'))}</h4>${f.map(a => `<button class="sm-row" data-sa="${esc(a.id)}">${E.tile(a, 26)}<span>${esc(a.name)}</span><small>${esc(a.desc || '')}</small></button>`).join('')}`; }
      const nq = K.norm(q); const avail = E.apps().filter(a => !E.isInstalled(a.id) && !a.pkg && a.id !== 'deskfolder' && K.norm(a.name + ' ' + (a.kw || '')).includes(nq)).slice(0, 4);
      if (avail.length) add += `<h4 data-p11s>${esc(tr('Disponibles para instalar'))}</h4>${avail.map(a => `<button class="sm-row" data-p11inst="${esc(a.id)}">${E.tile(a, 26)}<span>${esc(a.name)}</span><small>＋ ${esc(tr('Instalar y abrir'))}</small></button>`).join('')}`;
      if (add) res.insertAdjacentHTML('afterbegin', add.replace('<h4 data-p11s>', '<h4 data-p11s="1">'));
    }).observe(res, { childList: true });
    sm.addEventListener('click', e => {
      const c = e.target.closest('[data-p11copy]'); if (c) { K.ui.copy(c.dataset.p11copy); return; }
      const i = e.target.closest('[data-p11inst]'); if (i) { const id = i.dataset.p11inst; E.setInstalled(id, true); E.closeFlyouts(); setTimeout(() => E.launch(id), 120); return; }
      const u = e.target.closest('[data-p11url]'); if (u) { E.closeFlyouts(); E.ebOpenUrl(u.dataset.p11url, true); }
    });
    ['s3', 's4', 's9'].forEach(F);
    // (s5) «Todas las apps» por orden alfabético con índice A–Z
    const all = sBody.querySelector('.sm-all');
    if (all) new MutationObserver(() => {
      if (all.hidden || all.querySelector('[data-p11az]')) return;
      all.insertAdjacentHTML('afterbegin', `<div class="p11-azbar" data-p11az><button class="btn-secondary sm-btn" data-p11mode="az">A–Z</button><button class="btn-secondary sm-btn" data-p11mode="cat">${esc(tr('Por categoría'))}</button></div>`);
    }).observe(all, { attributes: true, childList: true });
    if (all) all.addEventListener('click', e => {
      const m = e.target.closest('[data-p11mode]'); if (m && m.dataset.p11mode === 'az') { const apps = E.installedApps().filter(a => a.id !== 'deskfolder').sort((a, b) => a.name.localeCompare(b.name)), groups = {}; apps.forEach(a => { const L = (K.norm(a.name)[0] || '#').toUpperCase(); (groups[/[A-Z]/.test(L) ? L : '#'] = groups[/[A-Z]/.test(L) ? L : '#'] || []).push(a); }); const keys = Object.keys(groups).sort(); all.innerHTML = `<button class="btn-secondary sm-btn" data-back>‹ ${esc(tr('Atrás'))}</button><div class="p11-azidx" data-p11az>${keys.map(k => `<button data-p11jump="${k}">${k}</button>`).join('')}</div>` + keys.map(k => `<h4 id="p11az-${k === '#' ? 'num' : k}">${k}</h4><div class="sm-list">${groups[k].map(a => `<button class="sm-row" data-sa="${esc(a.id)}">${E.tile(a, 26)}<span>${esc(a.name)}</span></button>`).join('')}</div>`).join(''); return; }
      if (m && m.dataset.p11mode === 'cat') { const b = sm.querySelector('[data-all]'); if (b) b.click(); return; }
      const j = e.target.closest('[data-p11jump]'); if (j) { const h = all.querySelector('#p11az-' + (j.dataset.p11jump === '#' ? 'num' : j.dataset.p11jump)); if (h) h.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    });
    F('s5');
    // (s10) flechas dentro de la cuadrícula de Inicio
    sm.addEventListener('keydown', e => {
      const a = document.activeElement; if (!/^Arrow/.test(e.key)) return;
      if (a === sIn && e.key === 'ArrowDown') { const f = sm.querySelector('.sm-results:not([hidden]) button, .start-grid-apps .start-app-item'); if (f) { e.preventDefault(); f.focus(); } return; }
      if (!a || !a.matches('.start-app-item,.sm-row,.p11-qab,.sm-rec')) return;
      const items = [...sm.querySelectorAll('.start-app-item,.sm-row,.p11-qab,.sm-rec')].filter(b => b.offsetParent); const r0 = a.getBoundingClientRect();
      const cand = items.filter(b => b !== a).map(b => { const r = b.getBoundingClientRect(); const dx = r.left - r0.left, dy = r.top - r0.top; const ok = { ArrowRight: dx > 4 && Math.abs(dy) < r0.height / 2, ArrowLeft: dx < -4 && Math.abs(dy) < r0.height / 2, ArrowDown: dy > 4, ArrowUp: dy < -4 }[e.key]; return ok ? [b, Math.abs(dx) + Math.abs(dy) * 2] : null; }).filter(Boolean).sort((x, y) => x[1] - y[1]);
      if (cand[0]) { e.preventDefault(); cand[0][0].focus(); } else if (e.key === 'ArrowUp' && sIn) { e.preventDefault(); sIn.focus(); }
    });
    F('s10');
  }
  // (s8) escribir con el escritorio enfocado abre la búsqueda
  document.addEventListener('keydown', e => {
    if (pref('p11TypeSearch') === false || e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1 || !/[\p{L}\p{N}]/u.test(e.key) || typing(e.target) || activeWin() || $('.eis-modal') || (sm && sm.classList.contains('open'))) return;
    if (html.dataset.env === 'linux' || !$('#tb-start-trigger')) { if (K.search && K.search.toggle) { K.search.toggle(); setTimeout(() => { const i = $('#s9-search input, .s9-search input'); if (i) { i.value = e.key; i.dispatchEvent(new Event('input', { bubbles: true })); } }, 60); } return; }
    e.preventDefault(); $('#tb-start-trigger').click(); setTimeout(() => { if (sIn) { sIn.value = e.key; sIn.dispatchEvent(new Event('input', { bubbles: true })); sIn.focus(); } }, 80);
  });
  F('s8');

  /* ================= 5. Táctil y teléfonos (h1-h10) ================= */
  ['h1', 'h2', 'h3', 'h9', 'h10'].forEach(F);   // reglas CSS en eisenku11.css
  const vv = window.visualViewport;
  if (vv) {
    const onVV = () => { const kb = caps.touch && innerHeight - vv.height > 140; html.classList.toggle('p11-kb', kb); html.style.setProperty('--p11-vvh', Math.round(vv.height) + 'px'); if (kb) { const a = document.activeElement; if (typing(a)) setTimeout(() => { try { a.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { /* ignorar */ } }, 80); } };
    vv.addEventListener('resize', onVV); onVV(); F('h4');
  }
  // gestos de borde (h5), deslizar para minimizar (h6), pulsación larga = menú (h7), doble toque en el título (b8), dos dedos = escritorios (b2)
  const LP_SEL = '.window-header,.tb-app,.tb-btn,.ac9-card,.k9-li,.sm-row,.start-app-item,.s9-w > h6,.p11-dlrow,.fm9-item';
  let g = null, lpT = 0, lpFired = 0, lastTap = { t: 0, x: 0, y: 0, h: null };
  const touches = new Map();
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch' || pref('p11Gestures') === false) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    const ex = e.clientX, ey = e.clientY, edge = ex < 16 ? 'left' : ex > innerWidth - 16 ? 'right' : ey > innerHeight - 14 ? 'bottom' : null;
    const hdr = e.target.closest && e.target.closest('.window.maximized .window-header');
    g = { x: ex, y: ey, t: now(), edge, hdr, id: e.pointerId };
    const lp = e.target.closest && e.target.closest(LP_SEL);
    clearTimeout(lpT);
    if (lp && !e.target.closest('input,textarea,[contenteditable]')) lpT = setTimeout(() => { if (!g || g.moved) return; lpFired = now(); buzz(18); lp.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: ex, clientY: ey, button: 2 })); }, 560);
  }, true);
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'touch') return; const t = touches.get(e.pointerId); if (t) { t.x = e.clientX; t.y = e.clientY; }
    if (g && e.pointerId === g.id && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 10) { g.moved = true; clearTimeout(lpT); }
    if (touches.size === 2 && g && !g.two) { const [a, b] = [...touches.values()]; const dxa = a.x - a.x0, dxb = b.x - b.x0; if (Math.abs(dxa) > 90 && Math.abs(dxb) > 90 && Math.sign(dxa) === Math.sign(dxb) && !$('.window.open.maximized:not(.minimized):not(.s9-otherdesk)') && K.desks) { g.two = true; const D = K.desks, n = D.cur + (dxa < 0 ? 1 : -1); if (n >= 1 && n <= D.count) { D.go(n); buzz(15); } } }
  }, true);
  document.addEventListener('pointerup', e => {
    if (e.pointerType !== 'touch') return; touches.delete(e.pointerId); clearTimeout(lpT);
    if (!g || e.pointerId !== g.id) return; const dx = e.clientX - g.x, dy = e.clientY - g.y, dt = now() - g.t, gg = g; g = null;
    if (dt < 700 && !gg.two) {
      if (gg.edge === 'bottom' && dy < -60) { buzz(); P.recents.open(); return; }
      if (gg.edge === 'left' && dx > 70 && Math.abs(dy) < 80) { buzz(); K.widgets && K.widgets.panelToggle(); return; }
      if (gg.edge === 'right' && dx < -70 && Math.abs(dy) < 80) { buzz(); K.nc && K.nc.open(); return; }
      if (gg.hdr && dy > 90 && Math.abs(dx) < 60) { const w = gg.hdr.closest('.window'); w.classList.add('minimized'); E.updateTaskbarButtons && E.updateTaskbarButtons(); buzz(); return; }
    }
    // doble toque en una barra de título: maximizar o restaurar
    const h = e.target.closest && e.target.closest('.window-header');
    if (h && !gg.moved && !e.target.closest('button')) { if (now() - lastTap.t < 320 && lastTap.h === h && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) { const m = h.closest('.window').querySelector('[data-act="max"]'); if (m) m.click(); lastTap = { t: 0 }; return; } lastTap = { t: now(), x: e.clientX, y: e.clientY, h }; }
  }, true);
  document.addEventListener('pointercancel', e => { touches.delete(e.pointerId); clearTimeout(lpT); if (g && e.pointerId === g.id) g = null; }, true);
  // si el navegador también lanza su menú por pulsación larga, no se duplica
  document.addEventListener('contextmenu', e => { if (lpFired && now() - lpFired < 900 && e.isTrusted) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  ['h5', 'h6', 'h7', 'h8', 'b2', 'b8'].forEach(F);

  /* ================= 6. Tabletas (b1, b3-b7, b9, b10) ================= */
  const tabletAuto = () => { const t = pref('p11Tablet'); const auto = caps.touch && !caps.tv && Math.min(screen.width, screen.height) >= 600; html.classList.toggle('p11-tablet', t === 'on' || (t !== 'off' && auto)); html.classList.toggle('p11-phone', caps.touch && Math.min(screen.width, screen.height) < 600); };
  tabletAuto(); F('b3');
  // (b6) en tableta vertical las apps se abren maximizadas
  document.addEventListener('eisen:open', e => { if (html.classList.contains('p11-tablet') && innerHeight > innerWidth && pref('p11Tablet') !== 'off') { const w = document.getElementById('win-' + e.detail); if (w && !w.classList.contains('p11-split')) w.classList.add('maximized'); } }); F('b6');
  // (b5) teclado físico detectado en un dispositivo táctil
  let hwkb = false; document.addEventListener('keydown', e => { if (hwkb || !caps.touch || !e.isTrusted || typing(e.target) || e.key.length > 1 && !/^(Tab|Arrow|Escape)/.test(e.key)) return; hwkb = true; html.classList.add('p11-hwkb'); E.toast('⌨️ ' + tr('Teclado físico detectado: atajos activos (Ctrl+K busca, Ctrl+Mayús+Espacio abre la paleta de comandos)')); }); F('b5');
  // (b1, b4) pantalla dividida con divisor arrastrable
  let split = null;
  P.split = async (w) => {
    w = w || activeWin(); if (!w) return E.toast(tr('Abre una app primero'));
    const others = $$('.window.open').filter(x => x !== w && !x.classList.contains('s9-otherdesk'));
    if (!others.length) return E.toast(tr('Abre otra app para dividir la pantalla'));
    const r = await E.form({ title: tr('Pantalla dividida'), fields: [{ k: 'o', label: tr('App del otro lado'), type: 'select', options: others.map(x => [x.id, (appOf(x.id.slice(4)) || {}).name || x.id.slice(4)]) }], ok: tr('Dividir') });
    if (!r) return; const o = document.getElementById(r.o); if (!o) return;
    split && split.end(); split = makeSplit(w, o); buzz();
  };
  function makeSplit(a, b) {
    const div = el('div', { class: 'p11-divider', role: 'separator', 'aria-orientation': 'vertical', tabindex: '0', 'aria-label': tr('Divisor de pantalla') }); document.body.appendChild(div);
    let ratio = .5; const lay = () => { const A = area(); [a, b].forEach(w => { w.classList.remove('maximized', 'minimized', 'p11-shade'); w.classList.add('p11-split', 'open'); }); const wa = Math.round(A.w * ratio) - 4; Object.assign(a.style, { left: A.x + 'px', top: A.y + 'px', width: wa + 'px', height: A.h + 'px' }); Object.assign(b.style, { left: A.x + wa + 8 + 'px', top: A.y + 'px', width: A.w - wa - 8 + 'px', height: A.h + 'px' }); Object.assign(div.style, { left: A.x + wa + 'px', top: A.y + 'px', height: A.h + 'px' }); };
    let drag = false;
    div.addEventListener('pointerdown', e => { drag = true; div.setPointerCapture(e.pointerId); div.classList.add('on'); });
    div.addEventListener('pointermove', e => { if (!drag) return; const A = area(); ratio = Math.max(.2, Math.min(.8, (e.clientX - A.x) / A.w)); lay(); });
    div.addEventListener('pointerup', () => { drag = false; div.classList.remove('on'); });
    div.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { ratio = Math.max(.2, ratio - .05); lay(); } if (e.key === 'ArrowRight') { ratio = Math.min(.8, ratio + .05); lay(); } if (e.key === 'Escape') api.end(); });
    div.addEventListener('dblclick', () => { ratio = .5; lay(); });
    const chk = setInterval(() => { if (!isOpen(a) || !isOpen(b) || a.classList.contains('maximized') || b.classList.contains('maximized')) api.end(); }, 700);
    const onR = () => lay(); addEventListener('resize', onR);
    const api = { end() { clearInterval(chk); removeEventListener('resize', onR); div.remove(); [a, b].forEach(w => w.classList.remove('p11-split')); if (split === api) split = null; } };
    lay(); return api;
  }
  ['b1', 'b4'].forEach(F);
  // (b7) recientes táctiles: tarjetas, tocar para ir, deslizar hacia arriba para cerrar
  P.recents = (() => {
    let ov = null;
    const close = () => { if (ov) { ov.remove(); ov = null; } };
    const open = () => {
      close(); const wins = $$('.window.open').filter(w => !w.classList.contains('s9-otherdesk'));
      ov = el('div', { class: 'p11-recents', role: 'dialog', 'aria-label': tr('Apps abiertas') });
      ov.innerHTML = `<div class="p11-rc-h"><b>${esc(tr('Apps abiertas'))}</b><span class="eis-muted">${wins.length}</span><button class="k9-btn" data-rcall ${wins.length ? '' : 'disabled'}>${esc(tr('Cerrar todo'))}</button><button class="k9-btn" data-rcx>✕</button></div><div class="p11-rc-list">${wins.map(w => { const id = w.id.slice(4), a = appOf(id) || { name: id, icon: '🗔' }; return `<button class="p11-rc" data-rc="${esc(w.id)}">${E.tile(a, 48)}<b>${esc(a.name)}</b><small>${esc(tr('Toca para abrir · desliza hacia arriba para cerrar'))}</small></button>`; }).join('') || `<p class="eis-muted">${esc(tr('No hay apps abiertas.'))}</p>`}</div>`;
      document.body.appendChild(ov);
      let sw = null;
      ov.addEventListener('pointerdown', e => { const c = e.target.closest('.p11-rc'); if (c) sw = { c, y: e.clientY, x: e.clientX }; });
      ov.addEventListener('pointermove', e => { if (!sw) return; const dy = e.clientY - sw.y; if (dy < 0) sw.c.style.transform = `translateY(${dy}px)`; sw.c.style.opacity = String(Math.max(.2, 1 + dy / 300)); });
      ov.addEventListener('pointerup', e => { if (!sw) return; const dy = e.clientY - sw.y, c = sw.c; sw = null; if (dy < -110) { const w = document.getElementById(c.dataset.rc), x = w && w.querySelector('[data-act="close"]'); if (x) x.click(); c.remove(); buzz(); return; } c.style.transform = ''; c.style.opacity = ''; });
      ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-rcx]')) return close(); if (e.target.closest('[data-rcall]')) { $$('.window.open').forEach(w => { const x = w.querySelector('[data-act="close"]'); x && x.click(); }); return close(); } const c = e.target.closest('.p11-rc'); if (c && !c.style.transform) { E.openWindow(c.dataset.rc.slice(4)); close(); } });
      ov.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
      const f = ov.querySelector('.p11-rc, [data-rcx]'); if (f) f.focus();
    };
    return { open, close };
  })();
  K.keys.register('p11recents', 'Apps abiertas (tarjetas)', 'Alt+Shift+A', () => P.recents.open(), 'Ventanas'); F('b7');
  // (b9) pantalla siempre encendida mientras ves vídeo, lees o haces un examen
  let wl = null; const WL_APPS = /^(video|mediacenter|subplayer|studio|tvlauncher|downloads|pdf|reader|presenter|slides|handbook)$/;
  const wlCheck = async () => { if (!caps.wakeLock || pref('p11WakeLock') === false) return; const w = activeWin(), id = w ? w.id.slice(4) : ''; const want = !document.hidden && (WL_APPS.test(id) || html.classList.contains('p11-kiosk')) && !!(w && (w.querySelector('video:not([paused])') || /studio|tvlauncher|presenter|slides/.test(id) || html.classList.contains('p11-kiosk'))); try { if (want && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } else if (!want && wl) { await wl.release(); wl = null; } } catch { wl = null; } };
  setInterval(wlCheck, 5000); document.addEventListener('visibilitychange', wlCheck); if (caps.wakeLock) F('b9');
  // (b10) modo kiosco: una app a pantalla completa; para salir, mantén pulsado el botón 3 s (y PIN si el perfil lo tiene)
  P.kiosk = async (id) => {
    if (!id) { const r = await E.form({ title: tr('Modo kiosco'), html: `<p class="eis-muted">${esc(tr('Una sola app a pantalla completa, sin barra de tareas. Para salir, mantén pulsado el botón ✕ de la esquina 3 segundos.'))}</p>`, fields: [{ k: 'a', label: tr('App'), type: 'select', options: E.installedApps().filter(a => !a.web && !a.user && a.id !== 'deskfolder').sort((a, b) => a.name.localeCompare(b.name)).map(a => [a.id, a.name]) }], ok: tr('Iniciar') }); if (!r) return; id = r.a; }
    E.launch(id); setTimeout(() => { const w = document.getElementById('win-' + id); if (w) { w.classList.add('maximized', 'p11-kioskwin'); } }, 300);
    html.classList.add('p11-kiosk'); try { await html.requestFullscreen(); } catch { /* sin pantalla completa */ }
    const x = el('button', { class: 'p11-kx', 'aria-label': tr('Mantén pulsado para salir del modo kiosco') }, '✕'); document.body.appendChild(x);
    let t = 0; x.addEventListener('pointerdown', () => { x.classList.add('hold'); t = setTimeout(async () => { const p = K.profiles.current(); if (p.pin) { const pin = await K.ui.prompt(tr('Salir del modo kiosco'), tr('PIN del perfil'), '', { type: 'password' }); if (pin == null || (await K.profiles.verify(p.id, pin)) !== true) { x.classList.remove('hold'); return E.toast(tr('PIN incorrecto')); } } html.classList.remove('p11-kiosk'); $$('.p11-kioskwin').forEach(w => w.classList.remove('p11-kioskwin')); x.remove(); try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* ignorar */ } E.toast(tr('Modo kiosco desactivado')); }, 3000); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => x.addEventListener(ev, () => { clearTimeout(t); x.classList.remove('hold'); }));
    K.seclog && K.seclog('system', 'Modo kiosco iniciado con ' + id);
  };
  F('b10');

  /* ================= 7. Mando y Xbox (g1-g10) ================= */
  const GN = K.gamepadNav;
  const pad = () => [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean) || null;
  const rumble = (s = .15, w = .35, d = 22) => { if (pref('p11Haptics') === false) return; const gp = pad(); try { gp && gp.vibrationActuator && gp.vibrationActuator.playEffect && gp.vibrationActuator.playEffect('dual-rumble', { duration: d, strongMagnitude: s, weakMagnitude: w }).catch(() => { }); } catch { /* sin vibración */ } };
  P.rumble = rumble;
  if (GN && GN.actions) {
    const A = GN.actions;
    ['activate', 'back'].forEach(k => { if (A[k]) { const f0 = A[k][1]; A[k][1] = () => { f0(); rumble(k === 'back' ? .1 : .15, k === 'back' ? .2 : .35); }; } }); F('g2');
    const winAct = fn => () => { const w = activeWin(); if (w) fn(w); };
    Object.assign(A, {
      vcursor: ['Cursor virtual (ratón con el mando)', () => P.vcursor.toggle()], downloads: ['Abrir Descargas', () => E.launch('downloads')], transfer: ['Transferir y sincronizar', () => E.launch('transfer')], tvlauncher: ['Lanzador TV', () => E.launch('tvlauncher')], prime: ['Centro PRIME', () => E.launch('primecenter')], palette: ['Paleta de comandos', () => P.palette.open()], recents: ['Apps abiertas (tarjetas)', () => P.recents.open()],
      closewin: ['Cerrar la ventana activa', winAct(w => { const x = w.querySelector('[data-act="close"]'); x && x.click(); })], maxwin: ['Maximizar o restaurar la ventana', winAct(w => { const x = w.querySelector('[data-act="max"]'); x && x.click(); })], minwin: ['Minimizar la ventana', winAct(w => { w.classList.add('minimized'); E.updateTaskbarButtons && E.updateTaskbarButtons(); })],
      zoomin: ['Agrandar la interfaz', () => { const v = Math.min(1.6, (+pref('uiScale') || 1) + .1); K.pref('uiScale', +v.toFixed(2)); K.applyPrefs && K.applyPrefs(); E.toast('🔍 ' + Math.round(v * 100) + '%'); }], zoomout: ['Reducir la interfaz', () => { const v = Math.max(.8, (+pref('uiScale') || 1) - .1); K.pref('uiScale', +v.toFixed(2)); K.applyPrefs && K.applyPrefs(); E.toast('🔍 ' + Math.round(v * 100) + '%'); }]
    });
    ['g6', 'g9', 'g10'].forEach(F);
  }
  // (g5) Xbox (Edge heredado): el mando llega a la página en vez de mover un ratón emulado
  try { if ('gamepadInputEmulation' in navigator) { navigator.gamepadInputEmulation = 'gamepad'; F('g5'); } } catch { /* sin API */ }
  // (g1) cursor virtual
  P.vcursor = (() => {
    let on = false, x = innerWidth / 2, y = innerHeight / 2, raf = 0, prevA = false, prevB = false, prevV = false, down = null, cur = null, sus0 = null;
    const at = () => { cur.hidden = true; const t = document.elementFromPoint(x, y); cur.hidden = false; return t; };
    const fire = (t, type, extra = {}) => { if (!t) return; const o = Object.assign({ bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: type.endsWith('up') || type === 'click' ? 0 : 1, view: window }, extra); try { if (type.startsWith('pointer')) t.dispatchEvent(new PointerEvent(type, Object.assign({ pointerId: 7, pointerType: 'mouse', isPrimary: true }, o))); else t.dispatchEvent(new MouseEvent(type, o)); } catch { /* evento no admitido */ } };
    const loop = () => {
      raf = requestAnimationFrame(loop); const gp = pad(); if (!gp || document.hidden) return;
      const ax = gp.axes || [], dz = .18, sp = (v) => Math.abs(v) < dz ? 0 : Math.sign(v) * Math.pow((Math.abs(v) - dz) / (1 - dz), 2) * 18;
      const vx = sp(ax[0] || 0) + ((gp.buttons[15] || {}).pressed ? 4 : 0) - ((gp.buttons[14] || {}).pressed ? 4 : 0), vy = sp(ax[1] || 0) + ((gp.buttons[13] || {}).pressed ? 4 : 0) - ((gp.buttons[12] || {}).pressed ? 4 : 0);
      if (vx || vy) { x = Math.max(0, Math.min(innerWidth - 2, x + vx)); y = Math.max(0, Math.min(innerHeight - 2, y + vy)); cur.style.transform = `translate(${x}px,${y}px)`; const t = at(); fire(t, 'pointermove'); fire(t, 'mousemove'); }
      const sx = ax[2] || 0, sy = ax[3] || 0; if (Math.abs(sx) > .25 || Math.abs(sy) > .25) { let t = at(); while (t && t !== document.body && !(t.scrollHeight > t.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(t).overflowY))) t = t.parentElement; (t || document.scrollingElement).scrollBy(sx * 16, sy * 22); }
      const A = !!(gp.buttons[0] && gp.buttons[0].pressed), B = !!(gp.buttons[1] && gp.buttons[1].pressed), V = !!(gp.buttons[8] && gp.buttons[8].pressed);
      if (A && !prevA) { const t = at(); down = t; cur.classList.add('dn'); fire(t, 'pointerdown'); fire(t, 'mousedown'); if (t && t.focus && t.matches && t.matches('input,textarea,select,button,a,[tabindex]')) try { t.focus(); } catch { /* ignorar */ } rumble(.1, .2, 15); }
      if (!A && prevA) { const t = at(); cur.classList.remove('dn'); fire(t, 'pointerup'); fire(t, 'mouseup'); if (t && down && (t === down || down.contains(t) || t.contains(down))) fire(t, 'click'); down = null; }
      if ((B && !prevB) || (V && !prevV)) { prevA = A; prevB = B; prevV = V; toggle(false); return; }
      prevA = A; prevB = B; prevV = V;
    };
    function toggle(v) {
      on = v == null ? !on : !!v;
      if (on) { if (!cur) { cur = el('div', { class: 'p11-vcur', 'aria-hidden': 'true' }); document.body.appendChild(cur); } cur.hidden = false; cur.style.transform = `translate(${x}px,${y}px)`; sus0 = GN ? GN.suspend : null; if (GN) GN.suspend = () => true; prevA = true; prevB = true; prevV = true; raf = requestAnimationFrame(loop); E.toast('🖱️ ' + tr('Cursor virtual: palanca izquierda mueve, A pulsa (mantén para arrastrar), palanca derecha desplaza, B sale')); }
      else { cancelAnimationFrame(raf); raf = 0; if (cur) cur.hidden = true; if (GN) GN.suspend = sus0; E.toast(tr('Cursor virtual desactivado')); }
      html.classList.toggle('p11-vcur-on', on);
    }
    return { toggle, active: () => on };
  })();
  K.keys.register('p11vcursor', 'Cursor virtual con el mando', 'Ctrl+Alt+G', () => P.vcursor.toggle(), 'Accesibilidad'); F('g1');
  // (g3) barra de ayuda de botones cuando se navega con el mando
  const hints = el('div', { id: 'p11-padhints', 'aria-hidden': 'true' }); hints.hidden = true; document.body.appendChild(hints);
  const drawHints = () => { if (!GN || pref('p11Hints') === false) { hints.hidden = true; return; } const m = GN.map ? GN.map() : {}, A = GN.actions || {}; const show = [[0, 'A'], [1, 'B'], [2, 'X'], [3, 'Y'], [9, '☰'], [8, '⧉']]; hints.innerHTML = show.filter(([i]) => m[i] && A[m[i]] && m[i] !== 'none').map(([i, b]) => `<span><i class="p11-b p11-b${b === 'A' ? 'a' : b === 'B' ? 'b' : b === 'X' ? 'x' : b === 'Y' ? 'y' : 'm'}">${b}</i>${esc(tr(A[m[i]][0]))}</span>`).join(''); hints.hidden = !html.classList.contains('s10-padnav') || P.vcursor.active(); };
  new MutationObserver(drawHints).observe(html, { attributes: true, attributeFilter: ['class'] }); F('g3');
  // (g7) indicador de mando en la bandeja
  const tray = $('#taskbar-right');
  const padPill = el('button', { class: 'systray-pill p11-padpill', title: tr('Mando conectado · abrir Centro de mandos'), 'aria-label': tr('Mando conectado') }, '🎮'); padPill.hidden = true; if (tray) tray.insertBefore(padPill, tray.firstChild);
  padPill.onclick = () => E.launch('gamepads');
  const padUpd = () => { padPill.hidden = !pad(); };
  addEventListener('gamepadconnected', () => { padUpd(); rumble(.3, .5, 60); P.rules && P.rules.fire('pad'); }); addEventListener('gamepaddisconnected', padUpd); F('g7');
  // (g4) primera vez en Xbox o TV: perfil de pantalla TV, mando y descargas internas
  if (caps.tv && !S.get('prime_tv_setup', 0)) {
    S.set('prime_tv_setup', now());
    setTimeout(() => { try { if (K.display && K.display.profiles().some(d => d.id === 'tv')) K.display.apply('tv'); } catch (e) { console.error(e); } try { K.services.start('gamepad', true); } catch { /* ignorar */ } P.notify(tr('Configurado para ') + (caps.xbox ? 'Xbox' : 'TV'), tr('Perfil de pantalla TV, navegación con mando y descargas guardadas dentro de EISEN. Puedes cambiarlo en Configuración.'), { icon: '📺', actions: [{ label: 'Lanzador TV', primary: true, run: () => E.launch('tvlauncher') }, { label: 'Entendido' }] }); }, 2500);
  }
  F('g4'); F('g8');

  /* ================= 8. Rendimiento (r1-r7, r9) ================= */
  // (r1) prueba de fluidez real: si el equipo no llega a ~33 fps en reposo, baja un nivel
  setTimeout(() => { if (document.hidden) return; let n = 0, t0 = 0; const f = t => { if (!t0) t0 = t; n++; if (n < 40) requestAnimationFrame(f); else { const ms = (t - t0) / (n - 1); P.frameMs = +ms.toFixed(1); if (ms > 30 && caps.tier !== 'low') { caps.tier = caps.tier === 'high' ? 'mid' : 'low'; html.dataset.tier = caps.tier; applyTier(); } } }; requestAnimationFrame(f); }, 6000); F('r1');
  // (r2) efectos según el nivel (sin pisar lo que el usuario eligió)
  const applyTier = () => { const p = S.get('os9_prefs', {}) || {}; if (caps.tier === 'low') { if (p.glass == null || p.glass === 'auto') html.classList.add('no-glass'); if (p.reduceMotion == null) html.classList.add('reduce-motion'); } };
  applyTier(); F('r2');
  // (r3) cierre de apps inactivas: minimizadas más de 15 min (sin cambios sin guardar ni audio sonando)
  const SAFE_KEEP = /^(music|word|excel|notes|notepad|codeeditor|markdown|slides|terminal|browser|assistant|recorder|camera|meet|chat|whiteboard|paint|photo|videoedit|audioedit|downloads|transfer|studio|devcomm)$/;
  setInterval(() => {
    const mode = pref('p11IdleClose'); if (mode === 'off' || (mode === 'auto' && caps.tier !== 'low')) return;
    $$('.window.open.minimized').forEach(w => {
      const id = w.id.slice(4); if (!w.__p11min) { w.__p11min = now(); return; }
      if (now() - w.__p11min < 15 * 60000 || SAFE_KEEP.test(id) || !K.MANIFESTS[id] || w.classList.contains('s9-pinned')) return;
      if (w.querySelector('textarea, [contenteditable="true"]') || [...w.querySelectorAll('audio,video')].some(m => !m.paused)) return;
      const x = w.querySelector('[data-act="close"]'); if (x) { x.click(); K.log && K.log('info', 'perf', 'App inactiva cerrada para liberar memoria: ' + id); }
    });
    $$('.window.open:not(.minimized)').forEach(w => { w.__p11min = 0; });
  }, 60000); F('r3');
  // (r4) precarga del módulo de una app al pasar el puntero o enfocar su icono
  const pre = new Set();
  const prefetchApp = id => { const m = K.MANIFESTS[id]; if (!m || pre.has(id) || K.IMPL[id] || pref('p11Prefetch') === false) return; pre.add(id); [m.src, m.css].filter(Boolean).forEach(h => { const l = document.createElement('link'); l.rel = 'prefetch'; l.href = h + '?v=' + K.version; document.head.appendChild(l); }); };
  const idFrom = t => { const b = t.closest && t.closest('[data-sa],[data-launch],[data-open],[data-tb],[data-did],[data-detail]'); if (!b) return null; if (b.dataset.did) { const it = (E.desktopItems ? E.desktopItems() : []).find(x => x.id === b.dataset.did); return it && it.t === 'app' ? it.ref : null; } return b.dataset.sa || b.dataset.launch || b.dataset.open || b.dataset.tb || b.dataset.detail; };
  document.addEventListener('pointerover', e => { const id = idFrom(e.target); if (id) prefetchApp(id); }, { passive: true });
  document.addEventListener('focusin', e => { const id = idFrom(e.target); if (id) prefetchApp(id); }); F('r4');
  // (r5) vigilante de bloqueos: si una app congela la interfaz, ofrece cerrarla
  try { const warned = {}; new PerformanceObserver(l => { if (pref('p11Freeze') === false) return; l.getEntries().forEach(en => { if (en.duration < 1800) return; const w = activeWin(), id = w ? w.id.slice(4) : ''; if (!id || (warned[id] && now() - warned[id] < 300000)) return; warned[id] = now(); const a = appOf(id) || { name: id }; K.log && K.log('warn', 'perf', a.name + ' bloqueó la interfaz ' + (en.duration / 1000).toFixed(1) + ' s'); P.notify(tr('Una app está tardando'), a.name + ' ' + tr('bloqueó la interfaz') + ' ' + (en.duration / 1000).toFixed(1) + ' s.', { icon: '🐢', actions: [{ label: 'Cerrar la app', primary: true, run: () => { const x = w.querySelector('[data-act="close"]'); x && x.click(); } }, { label: 'Ignorar' }] }); }); }).observe({ entryTypes: ['longtask'] }); F('r5'); } catch { /* sin PerformanceObserver de tareas largas */ }
  ['r6', 'r7'].forEach(F);   // CSS: animaciones en pausa en ventanas ocultas y content-visibility en listas largas
  // (r9) iconos de apps web guardados en el dispositivo (funcionan sin conexión)
  const ICK = 'prime_icons';
  const applyIcons = () => { const m = S.get(ICK, {}) || {}; E.apps().forEach(a => { if (m[a.id] && (a.web || a.user)) a.img = m[a.id]; }); };
  applyIcons();
  const cacheIcons = async () => { if (!(E.ebHaveProxy && E.ebHaveProxy())) return; const m = S.get(ICK, {}) || {}; const todo = E.installedApps().filter(a => (a.web || a.user) && a.img && /^https:/.test(a.img) && !m[a.id]).slice(0, 12); let ch = 0; for (const a of todo) { try { const u = new URL(a.img); const r = await fetch(E.ebPrefix().replace(/\/proxy\?url=$/, '') + '/p/' + u.protocol.slice(0, -1) + '/' + u.host + u.pathname + u.search, { credentials: 'omit' }); if (!r.ok) continue; const b = await r.blob(); if (b.size > 24000 || !/^image\//.test(b.type)) continue; m[a.id] = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }); ch++; } catch { /* sin CORS: se queda el enlace */ } } if (ch) { S.set(ICK, m); applyIcons(); } };
  K.on('prime:ready', () => setTimeout(() => { if (navigator.onLine) cacheIcons(); }, 20000)); F('r9');

  /* ================= 9. Accesibilidad (y1-y4, y6-y10) ================= */
  const CLS = { p11BigTargets: 'p11-big', p11Underline: 'p11-ul', p11Spacing: 'p11-spacing', p11FocusMask: 'p11-mask', p11Glow: 'p11-glow' };
  const ruler = el('div', { id: 'p11-ruler', 'aria-hidden': 'true' }); ruler.hidden = true; document.body.appendChild(ruler);
  const moveRuler = e => { ruler.style.transform = `translateY(${e.clientY - 22}px)`; };
  const keysBox = el('div', { id: 'p11-keys', 'aria-hidden': 'true' }); keysBox.hidden = true; document.body.appendChild(keysBox);
  let kt = 0; const showKey = e => { if (!pref('p11Keys') || typing(e.target) && e.key.length === 1) return; const parts = [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && e.key.length > 1 && 'Mayús', e.metaKey && 'Meta', e.key === ' ' ? 'Espacio' : e.key.length === 1 ? e.key.toUpperCase() : e.key].filter(Boolean); if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return; keysBox.textContent = [...new Set(parts)].join(' + '); keysBox.hidden = false; clearTimeout(kt); kt = setTimeout(() => { keysBox.hidden = true; }, 1600); };
  document.addEventListener('keydown', showKey, true);
  document.addEventListener('pointerdown', e => { if (pref('p11Keys') && e.isTrusted && e.pointerType === 'mouse') { keysBox.textContent = ['🖱️ ' + tr('Clic'), '🖱️ ' + tr('Clic central'), '🖱️ ' + tr('Clic derecho')][e.button] || '🖱️'; keysBox.hidden = false; clearTimeout(kt); kt = setTimeout(() => { keysBox.hidden = true; }, 900); } }, true);
  // (y7) nombres accesibles para botones de solo icono (desde title o aria-describedby)
  const nameButtons = root => { $$('button:not([aria-label])', root).forEach(b => { if (b.textContent.trim().length > 1 && !/^[\p{Extended_Pictographic}\s✕✓☰⋮↻⇦⇨＋⌄›‹▶⏮⏭🗕🗖]+$/u.test(b.textContent.trim())) return; const t = b.getAttribute('title'); if (t) b.setAttribute('aria-label', t); }); };
  let nbT = 0; const nbQ = new Set(); new MutationObserver(ms => { ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) nbQ.add(n); })); clearTimeout(nbT); nbT = setTimeout(() => { nbQ.forEach(n => { if (n.isConnected) { if (n.matches('button:not([aria-label])')) nameButtons(n.parentElement || n); else nameButtons(n); } }); nbQ.clear(); }, 500); }).observe(document.body, { childList: true, subtree: true });
  nameButtons(document.body);
  ['y1', 'y2', 'y3', 'y4', 'y7', 'y8', 'y9', 'y10'].forEach(F);
  // (y6) modo fácil: iconos grandes, abrir con un toque, sin widgets, texto más grande y menos botones
  P.easyMode = on => {
    if (on) { if (!S.get('prime_easy_prev', null)) S.set('prime_easy_prev', { icon_size: S.get('icon_size', 'm'), dbl_open: S.get('dbl_open', false), fontScale: pref('fontScale'), showWidgets: pref('showWidgets') }); S.set('icon_size', 'l'); S.set('dbl_open', false); K.pref('fontScale', 1.15); K.pref('showWidgets', false); S.set('prime_easy', true); }
    else { const p = S.get('prime_easy_prev', null) || {}; S.set('icon_size', p.icon_size || 'm'); S.set('dbl_open', !!p.dbl_open); K.pref('fontScale', p.fontScale || 1); K.pref('showWidgets', p.showWidgets !== false); S.set('prime_easy', false); S.del('prime_easy_prev'); }
    html.classList.toggle('p11-easy', !!on); K.applyPrefs && K.applyPrefs(); try { K.widgets.render(); } catch { /* ignorar */ } E.desktopRender && E.desktopRender(); E.toast(on ? '🧸 ' + tr('Modo fácil activado') : tr('Modo fácil desactivado'));
  };
  html.classList.toggle('p11-easy', !!S.get('prime_easy', false)); F('y6');

  /* ================= 10. Personalización (l1-l10) ================= */
  // (l7) fondos PRIME en la identidad negro · verde · rosa (CSS puro)
  const PWP = {
    'p11-prime': 'radial-gradient(1200px 700px at 85% 8%, rgba(201,58,115,.30), transparent 60%), radial-gradient(1000px 800px at 6% 96%, rgba(31,129,96,.34), transparent 62%), conic-gradient(from 200deg at 50% 50%, #07080a, #0d1210, #0b0a0d, #07080a)',
    'p11-circuit': 'repeating-linear-gradient(90deg, rgba(52,165,130,.07) 0 1px, transparent 1px 60px), repeating-linear-gradient(0deg, rgba(52,165,130,.07) 0 1px, transparent 1px 60px), radial-gradient(900px 600px at 70% 30%, rgba(201,58,115,.18), transparent 60%), linear-gradient(160deg, #06110d, #0b0c0f)',
    'p11-aurora2': 'linear-gradient(105deg, transparent 18%, rgba(52,165,130,.28) 38%, rgba(232,112,159,.22) 56%, transparent 74%), radial-gradient(1400px 700px at 50% 115%, rgba(31,129,96,.25), transparent 60%), linear-gradient(180deg, #07090b, #0c0e12)',
    'p11-carbon': 'repeating-linear-gradient(45deg, rgba(255,255,255,.018) 0 2px, transparent 2px 6px), radial-gradient(800px 500px at 20% 20%, rgba(52,165,130,.15), transparent 60%), radial-gradient(800px 500px at 85% 85%, rgba(201,58,115,.16), transparent 60%), linear-gradient(135deg, #0a0a0c, #121216)',
    'p11-dawn': 'radial-gradient(1000px 600px at 80% 0%, rgba(232,112,159,.35), transparent 60%), radial-gradient(1100px 700px at 0% 100%, rgba(52,165,130,.35), transparent 60%), linear-gradient(160deg, #1a2a26, #2a1c24 60%, #14161a)',
    'p11-matrix': 'repeating-linear-gradient(180deg, rgba(52,165,130,.08) 0 2px, transparent 2px 14px), radial-gradient(900px 600px at 50% 40%, rgba(52,165,130,.20), transparent 65%), linear-gradient(180deg, #020604, #06110c)'
  };
  if (E.WALLPAPERS) { Object.assign(E.WALLPAPERS, PWP); const sel = $('#cfg-wallpaper'); if (sel) Object.keys(PWP).forEach(k => { if (!sel.querySelector(`option[value="${k}"]`)) sel.insertAdjacentHTML('beforeend', `<option value="${k}">PRIME · ${esc({ 'p11-prime': 'Prime', 'p11-circuit': 'Circuito', 'p11-aurora2': 'Aurora Prime', 'p11-carbon': 'Carbono', 'p11-dawn': 'Amanecer Prime', 'p11-matrix': 'Código' }[k])}</option>`); }); const cur = S.get('wp', ''); if (PWP[cur]) { const vp = $('#desktop-viewport'); if (vp) vp.style.backgroundImage = PWP[cur]; if (sel) sel.value = cur; } }
  F('l7');
  // (l1) color de acento sacado del fondo de pantalla
  P.accentFromWallpaper = async () => {
    const pick = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    let color = null; const wp = S.get('wp', ''), custom = S.get('customWallpaper', '');
    if (wp === 'custom' && custom) { color = await new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 32, 32); const d = x.getImageData(0, 0, 32, 32).data; let best = null, bs = -1; for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx - mn, l = (mx + mn) / 2; const sc = s * (l > 40 && l < 215 ? 1 : .3); if (sc > bs) { bs = sc; best = [r, g, b]; } } res(best ? pick(...best) : null); } catch { res(null); } }; im.onerror = () => res(null); im.src = custom; }); }
    if (!color) { const css = String((E.WALLPAPERS || {})[wp] || $('#desktop-viewport').style.backgroundImage || ''); const cs = [...css.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)].map(m => [+m[1], +m[2], +m[3]]).concat([...css.matchAll(/#([0-9a-f]{6})\b/gi)].map(m => [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)])); const sat = c => Math.max(...c) - Math.min(...c); cs.sort((a, b) => sat(b) - sat(a)); if (cs[0] && sat(cs[0]) > 30) color = pick(...cs[0]); }
    if (!color) return E.toast(tr('Este fondo no tiene un color dominante'));
    const a = $('#cfg-accent'); if (a) { a.value = color; a.dispatchEvent(new Event('input')); a.dispatchEvent(new Event('change')); } E.toast('🎨 ' + tr('Acento') + ': ' + color); return color;
  };
  F('l1');
  // (l2) fondo dinámico: claro de día, oscuro de noche
  const dynWall = () => { if (!pref('p11DynWall')) return; const h = new Date().getHours(), want = h >= 7 && h < 19 ? 'p11-dawn' : 'p11-prime'; if (S.get('wp', '') !== want && E.setWp) E.setWp(want); };
  setInterval(dynWall, 600000); F('l2');
  // (l5) fuente de la interfaz · (l8) estilo de la barra de tareas · (l4) etiquetas · (l9) iconos · (l3) brillo de acento
  const FONTS = { system: '', rounded: '"Nunito", "Varela Round", "Quicksand", ui-rounded, "SF Pro Rounded", system-ui, sans-serif', serif: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif', mono: 'ui-monospace, "Cascadia Code", "JetBrains Mono", Consolas, monospace', readable: 'Verdana, Tahoma, "Segoe UI", sans-serif' };
  const applyLook = () => {
    const f = FONTS[pref('p11Font')] || ''; if (f) html.style.setProperty('--e9-font', f); else html.style.removeProperty('--e9-font');
    html.dataset.p11tb = pref('p11Taskbar') || 'glass'; html.dataset.p11labels = pref('p11Labels') || 'shadow'; html.dataset.p11icons = pref('p11Icons') || 'vivid';
    Object.entries(CLS).forEach(([k, c]) => html.classList.toggle(c, !!pref(k)));
    ruler.hidden = !pref('p11Ruler'); if (pref('p11Ruler')) addEventListener('pointermove', moveRuler, { passive: true }); else removeEventListener('pointermove', moveRuler);
  };
  applyLook(); K.on('pref', p => { if (p && /^p11/.test(p.k)) { applyLook(); if (p.k === 'p11Tablet') tabletAuto(); if (p.k === 'p11DynWall') dynWall(); } });
  ['l3', 'l4', 'l5', 'l8', 'l9'].forEach(F);
  // (l6) mensaje propio en la pantalla de arranque
  const bm = S.get('prime_bootmsg', ''); const boot = $('#eis-boot'); if (boot) boot.insertAdjacentHTML('beforeend', `<div class="p11-bootmsg">EISEN OS PRIME${bm ? ' · ' + esc(String(bm).slice(0, 60)) : ''}</div>`); F('l6');
  // (l10) tema de sonido PRIME (sintetizado, sin archivos)
  let actx = null; const tone = (seq) => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const t0 = actx.currentTime; seq.forEach(([f, d, at, v = .05, type = 'sine']) => { const o = actx.createOscillator(), gn = actx.createGain(); o.type = type; o.frequency.value = f; gn.gain.setValueAtTime(0, t0 + at); gn.gain.linearRampToValueAtTime(v, t0 + at + .01); gn.gain.exponentialRampToValueAtTime(.0001, t0 + at + d); o.connect(gn); gn.connect(actx.destination); o.start(t0 + at); o.stop(t0 + at + d + .02); }); } catch { /* sin audio */ } };
  const THEMES = { soft: { note: [[660, .18, 0], [880, .22, .09]], ok: [[523, .14, 0], [659, .14, .08], [784, .2, .16]], err: [[300, .25, 0, .06, 'triangle']], dl: [[784, .12, 0], [1047, .18, .07]] }, tech: { note: [[1200, .05, 0, .04, 'square'], [1600, .06, .06, .03, 'square']], ok: [[880, .06, 0, .04, 'square'], [1320, .08, .07, .04, 'square']], err: [[180, .2, 0, .05, 'sawtooth']], dl: [[1400, .05, 0, .04, 'square'], [1800, .05, .05, .04, 'square']] } };
  P.sound = k => { const th = THEMES[pref('p11Sound')]; if (!th || S.get('dnd', false)) return false; tone(th[k] || th.note); return true; };
  if (K.sound) { const snd0 = K.sound; K.sound = k => (P.sound(k === 'note' ? 'note' : k) || snd0(k)); }
  K.on('prime:installed', () => P.sound('ok')); K.on('prime:downloaded', () => P.sound('dl')); F('l10');

  /* ================= 11. Notificaciones (n3-n10) ================= */
  let unread = +S.get('prime_unread', 0) || 0, away = { since: 0, n: 0, dl: 0, inst: 0 };
  const clock = $('#systray-clock'); const badge = el('em', { class: 'p11-nbadge', 'aria-hidden': 'true' }); if (clock) clock.appendChild(badge);
  const updBadge = () => { badge.textContent = unread > 99 ? '99+' : String(unread || ''); badge.hidden = !unread; try { if (caps.badge) unread ? navigator.setAppBadge(unread) : navigator.clearAppBadge(); } catch { /* sin API */ } S.set('prime_unread', unread); };
  updBadge(); F('n4');
  const nc = $('#s9-nc'); if (nc) new MutationObserver(() => { if (nc.classList.contains('open') && unread) { unread = 0; updBadge(); } }).observe(nc, { attributes: true, attributeFilter: ['class'] });
  const N0 = E.notify;
  E.notify = (title, body = '', icon = '🔔', ms) => {
    try {
      if (pref('p11Group') !== false) { const w = $('#eis-notes'); const key = title + '|' + body; const dup = w && [...w.children].find(n => !n.classList.contains('out') && n.__p11k === key); if (dup) { dup.__p11c = (dup.__p11c || 1) + 1; let b = dup.querySelector('.p11-cnt'); if (!b) { b = document.createElement('em'); b.className = 'p11-cnt'; (dup.querySelector('b') || dup).appendChild(b); } b.textContent = '×' + dup.__p11c; return; } }
      if (pref('p11Sticky')) ms = 86400000;
    } catch { /* seguir */ }
    const w0 = $('#eis-notes'), before = w0 && w0.firstElementChild;
    N0(title, body, icon, ms);
    const w1 = $('#eis-notes'), n = w1 && w1.firstElementChild; if (n && n !== before) n.__p11k = title + '|' + body;
    unread++; updBadge(); if (document.hidden) away.n++;
    if (document.hidden && pref('p11SysNotif') && caps.notif && Notification.permission === 'granted' && !S.get('dnd', false)) { try { const sn = new Notification(String(title).slice(0, 80), { body: String(body).slice(0, 200), icon: 'icon.svg', tag: 'eisen-' + String(title).slice(0, 20) }); sn.onclick = () => { window.focus(); sn.close(); }; } catch { /* sin permiso */ } }
  };
  ['n3', 'n7', 'n9'].forEach(F);
  // (n8) prioridad: los avisos críticos atraviesan «No molestar»
  P.critical = (title, body, icon = '⚠️') => { const d = S.get('dnd', false); if (d) S.set('dnd', false); try { P.notify(title, body, { icon, ms: 15000 }); } finally { if (d) S.set('dnd', true); } };
  F('n8');
  // (n5) horario de silencio automático «22:00-07:00»
  const quiet = () => { const q = String(pref('p11Quiet') || '').match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/); if (!q) { if (S.get('prime_quiet_on', false)) { S.set('dnd', false); S.set('prime_quiet_on', false); html.classList.remove('dnd'); } return; } const m = new Date().getHours() * 60 + new Date().getMinutes(), a = +q[1] * 60 + +q[2], b = +q[3] * 60 + +q[4]; const inside = a <= b ? m >= a && m < b : m >= a || m < b; if (inside && !S.get('dnd', false)) { S.set('dnd', true); S.set('prime_quiet_on', true); html.classList.add('dnd'); } else if (!inside && S.get('prime_quiet_on', false)) { S.set('dnd', false); S.set('prime_quiet_on', false); html.classList.remove('dnd'); } };
  setInterval(quiet, 60000); setTimeout(quiet, 3000); F('n5');
  // (n10) resumen al volver
  document.addEventListener('visibilitychange', () => { if (document.hidden) { away = { since: now(), n: 0, dl: 0, inst: 0 }; return; } if (pref('p11Summary') === false || !away.since || now() - away.since < 120000) return; const parts = []; if (away.dl) parts.push(away.dl + ' ' + tr('descargas')); if (away.inst) parts.push(away.inst + ' ' + tr('instalaciones')); if (away.n) parts.push(away.n + ' ' + tr('notificaciones')); away.since = 0; if (parts.length) setTimeout(() => P.notify(tr('Mientras no estabas'), parts.join(' · '), { icon: '📬', actions: [{ label: 'Ver notificaciones', run: () => K.nc && K.nc.open() }] }), 400); });
  K.on('prime:downloaded', () => { if (document.hidden) away.dl++; }); K.on('prime:installed', () => { if (document.hidden) away.inst++; }); F('n10');
  // (n6) recordatorios con posponer (también los crea Domingo y Automatización)
  const RMK = 'prime_reminders';
  P.reminders = {
    list: () => (S.get(RMK, []) || []).filter(r => r && r.id),
    add(what, at) { const r = { id: E.uid(), what: String(what).slice(0, 200), at: +at, done: false }; S.set(RMK, P.reminders.list().concat(r).slice(-200)); K.emit('prime:reminders'); return r; },
    remove(id) { S.set(RMK, P.reminders.list().filter(r => r.id !== id)); K.emit('prime:reminders'); },
    snooze(id, min) { const l = P.reminders.list(), r = l.find(x => x.id === id); if (!r) return; r.at = now() + min * 60000; r.done = false; S.set(RMK, l); K.emit('prime:reminders'); },
    tick() { const l = P.reminders.list(); let ch = false; l.forEach(r => { if (!r.done && r.at <= now()) { r.done = true; ch = true; P.sound('note'); P.critical && S.get('dnd', false) ? P.critical('⏰ ' + tr('Recordatorio'), r.what) : P.notify('⏰ ' + tr('Recordatorio'), r.what, { icon: '⏰', ms: 600000, actions: [{ label: 'Hecho', primary: true }, { label: 'Posponer 10 min', run: () => P.reminders.snooze(r.id, 10) }, { label: '1 hora', run: () => P.reminders.snooze(r.id, 60) }] }); } }); if (ch) S.set(RMK, l.filter(r => !r.done || now() - r.at < 7 * 86400000)); }
  };
  setInterval(() => P.reminders.tick(), 15000); F('n6');
  // (a7) lenguaje natural en español: «mañana a las 5 de la tarde estudiar», «en 20 minutos sacar la ropa», «el lunes a las 8 examen»
  P.parseWhen = (text, base = new Date()) => {
    // se trabaja sobre una copia sin tildes y en minúsculas; cada fragmento reconocido se borra también del original (conserva tildes y mayúsculas)
    const src = ' ' + String(text || '').normalize('NFC') + ' ';
    let s = src.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), o = src, d = new Date(base), hasDate = false, hasTime = false;
    if (s.length !== o.length) o = s;
    const blank = (i, n) => { s = s.slice(0, i) + ' '.repeat(n) + s.slice(i + n); o = o.slice(0, i) + ' '.repeat(n) + o.slice(i + n); };
    const cut = re => { const x = new RegExp(re.source, re.flags.replace('g', '')).exec(s); if (x) blank(x.index, x[0].length); };
    let m;
    if ((m = s.match(/\ben\s+(\d+|un|una|media)\s*(segundos?|seg|minutos?|min|horas?|h|dias?)\b/))) { const n = m[1] === 'media' ? .5 : /^un/.test(m[1]) ? 1 : +m[1]; const u = m[2][0]; d = new Date(+base + n * (u === 's' ? 1000 : u === 'm' ? 60000 : u === 'h' ? 3600000 : 86400000)); blank(m.index, m[0].length); hasDate = hasTime = true; }
    if (!hasDate) {
      if ((m = s.match(/\bpasado\s+manana\b/))) { d.setDate(d.getDate() + 2); blank(m.index, m[0].length); hasDate = true; }
      else if ((m = s.match(/\bmanana\b(?!\s+de\s+la\s+manana)/)) && !/\bde\s+la\s+manana\b/.test(m[0])) { if (!/\b(a\s+las|al)\b[^]*\bde\s+la$/.test(s.slice(0, m.index))) { d.setDate(d.getDate() + 1); cut(/\bmanana\b/); hasDate = true; } }
      else if ((m = s.match(/\bhoy\b/))) { blank(m.index, m[0].length); hasDate = true; }
      const DAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      if (!hasDate && (m = s.match(/\b(?:el\s+|este\s+|proximo\s+)?(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/))) { const t = DAYS.indexOf(m[1]); let add = (t - d.getDay() + 7) % 7; if (add === 0) add = 7; d.setDate(d.getDate() + add); blank(m.index, m[0].length); hasDate = true; }
      const MON = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      if (!hasDate && (m = s.match(/\b(?:el\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/))) { const mo = MON.indexOf(m[2] === 'setiembre' ? 'septiembre' : m[2]); d = new Date(base.getFullYear(), mo, +m[1], 9, 0, 0); if (d < base) d.setFullYear(d.getFullYear() + 1); blank(m.index, m[0].length); hasDate = true; }
      if (!hasDate && (m = s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) { const y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : base.getFullYear(); d = new Date(y, +m[2] - 1, +m[1], 9, 0, 0); if (!m[3] && d < base) d.setFullYear(d.getFullYear() + 1); blank(m.index, m[0].length); hasDate = true; }
    }
    if (!hasTime) {
      if ((m = s.match(/\b(?:a\s+las?|a\s+la|sobre\s+las)\s+(\d{1,2})(?::(\d{2})|\s+y\s+(media|cuarto))?\s*(am|pm|a\.m\.|p\.m\.|de\s+la\s+(manana|tarde|noche)|del\s+mediodia)?/))) {
        let h = +m[1], mi = m[2] ? +m[2] : m[3] === 'media' ? 30 : m[3] === 'cuarto' ? 15 : 0; const suf = m[4] || '';
        if (/pm|p\.m\.|tarde|noche/.test(suf) && h < 12) h += 12; if (/am|a\.m\.|manana/.test(suf) && h === 12) h = 0;
        if (!suf && h >= 1 && h <= 7 && !hasDate) h += 12;   // «a las 5» sin más: lo habitual es por la tarde
        d.setHours(h, mi, 0, 0); blank(m.index, m[0].length); hasTime = true;
      } else if ((m = s.match(/\bal\s+mediodia\b/))) { d.setHours(12, 0, 0, 0); blank(m.index, m[0].length); hasTime = true; }
      else if ((m = s.match(/\ba\s+medianoche\b/))) { d.setHours(23, 59, 0, 0); blank(m.index, m[0].length); hasTime = true; }
      else if ((m = s.match(/\b(\d{1,2}):(\d{2})\b/))) { d.setHours(+m[1], +m[2], 0, 0); blank(m.index, m[0].length); hasTime = true; }
    }
    if (!hasDate && !hasTime) return null;
    if (hasDate && !hasTime) d.setHours(9, 0, 0, 0);
    if (!hasDate && hasTime && d <= base) d.setDate(d.getDate() + 1);
    const FILL = /\b(recuerdame|recordarme|recuerdeme|recuerdame que|recuerda|avisame|que tengo que|que)\b/g; let fx;
    while ((fx = FILL.exec(s))) blank(fx.index, fx[0].length);
    const what = o.replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '').replace(/\s+/g, ' ').trim();
    return { at: d, what: what ? what[0].toUpperCase() + what.slice(1) : tr('Recordatorio') };
  };
  F('a7');

  /* ================= 12. Reglas «Si… entonces…» (a1-a6) y sugerencias (a9) ================= */
  const RK = 'prime_rules';
  const R = P.rules = {
    TRIG: { boot: 'Al iniciar EISEN', install: 'Al instalar una app', download: 'Al terminar una descarga', open: 'Al abrir una app', pad: 'Al conectar un mando', offline: 'Al quedarse sin conexión', online: 'Al recuperar la conexión', battery: 'Con batería baja (menos del 20 %)', hour: 'A una hora (cada día)' },
    ACT: {
      notify: ['Mostrar un aviso', a => P.notify('⚡ ' + tr('Automatización'), String(a || ''), { icon: '⚡' })],
      open: ['Abrir una app', a => { if (appOf(a)) E.launch(a); }],
      lowpower: ['Activar bajo consumo', () => K.setLowPower && K.setLowPower(true)],
      tv: ['Perfil de pantalla TV', () => { try { K.display.apply('tv'); } catch { /* sin perfil */ } }],
      easy: ['Activar el modo fácil', () => P.easyMode(true)],
      dnd: ['Activar No molestar', () => { S.set('dnd', true); html.classList.add('dnd'); }],
      snapshot: ['Crear un punto de restauración', () => K.backup.snapshot('Regla de automatización')],
      wallpaper: ['Siguiente fondo de pantalla', () => E.nextWallpaper && E.nextWallpaper()],
      theme: ['Cambiar tema (claro/oscuro)', () => { const b = $('#qt-dark'); if (b) b.click(); }],
      sortdl: ['Mover la descarga a su carpeta por tipo', async (a, data) => { if (!data || !data.id) return; const f = await K.files.get(data.id); if (!f) return; const k = K.files.kindOf(f), to = { image: 'images', audio: 'music', video: 'videos', document: 'documents' }[k]; if (to && f.folder !== to) { await K.files.move(f.id, to); const l = P.downloads.list(), x = l.find(y => y.id === f.id); if (x) P.downloads.patch(f.id, { folder: to }); } }],
      vcursor: ['Activar el cursor virtual', () => P.vcursor.toggle(true)]
    },
    list: () => (S.get(RK, []) || []).filter(r => r && r.id && R.TRIG[r.on] && R.ACT[r.act]),
    save: l => { S.set(RK, l.slice(0, 60)); K.emit('prime:rules'); },
    add(r) { const l = R.list(); const x = { id: E.uid(), on: r.on, act: r.act, arg: String(r.arg || '').slice(0, 200), cond: String(r.cond || '').slice(0, 60), enabled: true, runs: 0, last: 0 }; l.push(x); R.save(l); return x; },
    remove(id) { R.save(R.list().filter(r => r.id !== id)); },
    toggle(id) { const l = R.list(), r = l.find(x => x.id === id); if (r) { r.enabled = !r.enabled; R.save(l); } },
    log: () => S.get('prime_rules_log', []) || [],
    async fire(on, data) {
      if (K.safeMode) return 0; const l = R.list(); let n = 0;
      for (const r of l) {
        if (!r.enabled || r.on !== on) continue;
        if (r.cond) { const c = K.norm(r.cond); if (on === 'install' || on === 'open') { const a = appOf(data) || {}; if (!K.norm((a.name || '') + ' ' + (data || '')).includes(c)) continue; } if (on === 'download' && data && !K.norm(K.files.kindOf(data) + ' ' + (data.name || '')).includes(c)) continue; if (on === 'hour' && r.cond !== data) continue; }
        try { await R.ACT[r.act][1](r.arg, data); r.runs++; r.last = now(); n++; const lg = R.log(); lg.unshift({ t: now(), id: r.id, on, act: r.act }); S.set('prime_rules_log', lg.slice(0, 80)); K.log && K.log('ok', 'automation', 'Regla ejecutada: ' + R.TRIG[on] + ' → ' + R.ACT[r.act][0]); } catch (e) { K.log && K.log('error', 'automation', 'Regla fallida: ' + ((e && e.message) || e)); }
      }
      if (n) R.save(l); return n;
    }
  };
  K.on('prime:ready', () => R.fire('boot'));
  K.on('prime:installed', id => { if (E.isInstalled(id)) R.fire('install', id); });
  K.on('prime:downloaded', d => R.fire('download', d));
  document.addEventListener('eisen:download', e => { const d = e.detail || {}; if (d.id) R.fire('download', { id: d.id, name: d.name, type: d.type }); });
  document.addEventListener('eisen:open', e => { if (typeof e.detail === 'string' && !e.detail.startsWith('wapp-')) R.fire('open', e.detail); });
  addEventListener('offline', () => R.fire('offline')); addEventListener('online', () => R.fire('online'));
  let lastHour = ''; setInterval(() => { const d = new Date(), hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); if (hm !== lastHour) { lastHour = hm; R.fire('hour', hm); } }, 20000);
  if (navigator.getBattery) navigator.getBattery().then(b => { let fired = false; const chk = () => { if (b.level < .2 && !b.charging) { if (!fired) { fired = true; R.fire('battery'); } } else fired = false; }; b.addEventListener('levelchange', chk); b.addEventListener('chargingchange', chk); chk(); }).catch(() => { });
  ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'].forEach(F);
  // (a9) sugerencias del sistema según el dispositivo y el estado real
  P.suggest = async () => {
    const out = [];
    if (caps.tv && !html.classList.contains('s10-padnav') && pad()) out.push(['🎮', 'Usa el Lanzador TV con el mando', () => E.launch('tvlauncher')]);
    if (!caps.download && P.saveMode() !== 'vault') out.push(['⬇️', 'Tu dispositivo no descarga archivos: guarda las descargas dentro de EISEN', () => { S.set('save_mode', 'vault'); E.toast(tr('Descargas guardadas dentro de EISEN')); }]);
    try { const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; if (est && est.quota && est.usage / est.quota > .8) out.push(['💾', 'El almacenamiento está casi lleno: revisa las descargas grandes', () => E.launch('downloads')]); } catch { /* sin API */ }
    if ($$('.window.open:not(.minimized)').length > 4) out.push(['🪟', 'Tienes muchas ventanas: organízalas en mosaico', () => K.arrange && K.arrange.tile()]);
    if (!S.get('os9_last_backup', 0) || now() - S.get('os9_last_backup', 0) > 14 * 86400000) out.push(['🛟', 'Hace tiempo que no exportas tu entorno', () => E.launch('transfer', 'export')]);
    if (caps.touch && !html.classList.contains('p11-big') && innerWidth < 700) out.push(['👆', 'Activa los objetivos táctiles grandes', () => K.pref('p11BigTargets', true)]);
    if (P.peers.size) out.push(['🗂️', 'EISEN está abierto en ' + P.peers.size + ' pestaña(s) más', () => E.launch('primecenter', 'sessions')]);
    if (!out.length) out.push(['✨', 'Todo en orden. Pulsa Ctrl+Mayús+Espacio para la paleta de comandos', () => P.palette.open()]);
    return out;
  };
  F('a9');

  /* ================= 13. Plugins (u1-u10): solo contenido declarativo validado; el código va aislado ================= */
  const PLK = 'prime_plugins';
  const HEX = /^#[0-9a-f]{6}$/i, GRAD = /^(?:(?:linear|radial|conic|repeating-linear|repeating-radial)-gradient\((?:[#\w\s,.%-]|rgba?\([\d\s,.%]+\))+\)\s*,?\s*)+$/i;
  const PL = P.plugins = {
    list: () => (S.get(PLK, []) || []).filter(p => p && p.id),
    validate(o, rawLen = 0) {
      const errors = [], warnings = []; const txt = (v, n) => typeof v === 'string' && v.length <= n && !/[<>]/.test(v);
      if (!o || o.eisenplugin !== 1) { errors.push(tr('No es un plugin de EISEN (falta "eisenplugin": 1)')); return { ok: false, errors, warnings }; }
      if (rawLen > 262144) errors.push(tr('El plugin supera 256 KB'));
      if (!/^[a-z][a-z0-9-]{2,39}$/.test(o.id || '')) errors.push(tr('Identificador inválido'));
      if (!txt(o.name, 40) || !o.name.trim()) errors.push(tr('Nombre ausente o no válido'));
      if (!/^\d+\.\d+\.\d+$/.test(o.version || '')) errors.push(tr('Versión inválida (formato 1.0.0)'));
      const c = o.contributes || {}, out = { themes: [], wallpapers: [], links: [], commands: [], widgets: [] };
      (Array.isArray(c.themes) ? c.themes : []).slice(0, 10).forEach(t => { const vars = {}; Object.entries((t && t.vars) || {}).forEach(([k, v]) => { if (/^--e9-[\w-]{1,30}$/.test(k) && (HEX.test(v) || /^rgba?\([\d\s,.]+\)$/.test(v))) vars[k] = v; else warnings.push(tr('Variable de tema ignorada') + ': ' + String(k).slice(0, 30)); }); if (txt(t && t.name, 40) && Object.keys(vars).length) out.themes.push({ name: t.name, vars, accent: HEX.test(t.accent) ? t.accent : undefined }); });
      (Array.isArray(c.wallpapers) ? c.wallpapers : []).slice(0, 12).forEach(w => { if (w && txt(w.name, 40) && typeof w.css === 'string' && w.css.length < 2000 && GRAD.test(w.css.trim()) && !/url|expression|javascript|image-set|var\(/i.test(w.css)) out.wallpapers.push({ name: w.name, css: w.css.trim() }); else warnings.push(tr('Fondo ignorado (solo degradados CSS)')); });
      (Array.isArray(c.links) ? c.links : []).slice(0, 30).forEach(l => { if (l && txt(l.name, 40) && typeof l.url === 'string' && /^https:\/\/[^\s"'<>]{3,1990}$/i.test(l.url)) out.links.push({ name: l.name, url: l.url, icon: [...String(l.icon || '🔗')].slice(0, 2).join('') }); else warnings.push(tr('Enlace ignorado (solo https)')); });
      const ACTS = ['open', 'url', 'notify', 'wallpaper', 'theme', 'say'];
      (Array.isArray(c.commands) ? c.commands : []).slice(0, 30).forEach(k => { const a = k && k.action; if (k && txt(k.phrase, 60) && a && ACTS.includes(a.type) && (a.type !== 'url' || /^https:\/\//i.test(a.url || '')) && (a.type !== 'open' || /^[\w.-]{1,60}$/.test(a.app || ''))) out.commands.push({ phrase: K.norm(k.phrase), say: txt(k.say, 300) ? k.say : '', action: { type: a.type, app: a.app, url: a.url, text: txt(a.text, 200) ? a.text : '', name: txt(a.name, 40) ? a.name : '' } }); else warnings.push(tr('Comando ignorado')); });
      (Array.isArray(c.widgets) ? c.widgets : []).slice(0, 5).forEach(w => { if (w && /^[a-z][a-z0-9-]{1,20}$/.test(w.id || '') && txt(w.name, 40) && typeof w.html === 'string' && w.html.length < 65536) out.widgets.push({ id: w.id, name: w.name, icon: [...String(w.icon || '🧩')].slice(0, 2).join(''), html: w.html, height: Math.max(60, Math.min(400, +w.height || 140)) }); else warnings.push(tr('Widget ignorado')); });
      const perms = Object.keys(out).filter(k => out[k].length);
      if (!perms.length) errors.push(tr('El plugin no aporta nada válido'));
      return { ok: !errors.length, errors, warnings: [...new Set(warnings)].slice(0, 12), clean: { id: o.id, name: String(o.name).trim(), version: o.version, author: txt(o.author, 60) ? o.author : '', description: txt(o.description, 200) ? o.description : '', contributes: out, perms } };
    },
    install(obj, rawLen) { const v = PL.validate(obj, rawLen); if (!v.ok) throw new Error(v.errors.join('\n')); const l = PL.list().filter(p => p.id !== v.clean.id); l.push(Object.assign(v.clean, { enabled: true, at: now() })); S.set(PLK, l); K.seclog && K.seclog('apps', 'Plugin instalado: ' + v.clean.name + ' ' + v.clean.version + ' (' + v.clean.perms.join(', ') + ')'); PL.apply(); return v; },
    setEnabled(id, on) { const l = PL.list(), p = l.find(x => x.id === id); if (!p) return; p.enabled = !!on; S.set(PLK, l); K.seclog && K.seclog('apps', 'Plugin ' + (on ? 'activado' : 'desactivado') + ': ' + p.name); PL.apply(); },
    remove(id) { S.set(PLK, PL.list().filter(p => p.id !== id)); PL.apply(); },
    active: () => K.safeMode ? [] : PL.list().filter(p => p.enabled),
    links: () => PL.active().flatMap(p => p.contributes.links.map(l => Object.assign({ plugin: p.name }, l))),
    commands: () => PL.active().flatMap(p => p.contributes.commands.map(c => Object.assign({ plugin: p.name }, c))),
    applyTheme(pid, i) { const p = PL.list().find(x => x.id === pid), t = p && p.contributes.themes[i]; if (!t) return; K.themeVars && K.themeVars.set(t.vars); if (t.accent) { const a = $('#cfg-accent'); if (a) { a.value = t.accent; a.dispatchEvent(new Event('input')); } } E.toast('🎨 ' + t.name); },
    runCommand(c) { const a = c.action; if (a.type === 'open' && appOf(a.app)) E.launch(a.app); if (a.type === 'url') E.ebOpenUrl(a.url, true); if (a.type === 'notify') P.notify(c.plugin, a.text || c.say); if (a.type === 'wallpaper') { const k = 'plg-' + K.slug(a.name || ''); if (E.WALLPAPERS[k]) E.setWp(k); } return c.say || '✓ ' + c.plugin; },
    apply() {
      $$('[data-plgwp]').forEach(o => o.remove()); Object.keys(E.WALLPAPERS || {}).filter(k => k.startsWith('plg-')).forEach(k => { delete E.WALLPAPERS[k]; });
      Object.keys(K.widgets ? K.widgets.all() : {}).filter(k => k.startsWith('plg-')).forEach(k => { delete K.widgets.all()[k]; });
      PL.active().forEach(p => {
        p.contributes.wallpapers.forEach(w => { const k = 'plg-' + K.slug(w.name); E.WALLPAPERS[k] = w.css; const sel = $('#cfg-wallpaper'); if (sel) sel.insertAdjacentHTML('beforeend', `<option value="${esc(k)}" data-plgwp>🧩 ${esc(w.name)}</option>`); });
        p.contributes.widgets.forEach(w => { if (K.widgets) K.widgets.register('plg-' + p.id + '-' + w.id, { name: w.name + ' (' + p.name + ')', icon: w.icon, render(b) { if (b.querySelector('iframe')) return; const cs = getComputedStyle(html); const doc = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:"><style>:root{--accent:${cs.getPropertyValue('--accent').trim() || '#2a9d76'};--text:${cs.getPropertyValue('--e9-text').trim() || '#eee'}}body{margin:0;font:13px system-ui,sans-serif;color:var(--text);background:transparent}</style>${w.html}`; const f = document.createElement('iframe'); f.setAttribute('sandbox', 'allow-scripts'); f.setAttribute('referrerpolicy', 'no-referrer'); f.title = w.name; f.style.cssText = `width:100%;height:${w.height}px;border:0;background:transparent`; f.srcdoc = doc; b.appendChild(f); } }); });
      });
      try { K.widgets && K.widgets.render(); } catch { /* ignorar */ }
      K.emit('prime:plugins');
    }
  };
  setTimeout(() => PL.apply(), 0);
  ['u1', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9'].forEach(F);

  /* ================= 14. Domingo PRIME (a8): comandos en lenguaje natural ================= */
  const norm = s => K.norm(s);
  (E.domingoHooks = E.domingoHooks || []).push(async (text, t) => {
    let m;
    const plc = PL.commands().find(c => t === c.phrase || t.startsWith(c.phrase)); if (plc) return PL.runCommand(plc);
    if ((m = String(text).match(/^(?:descarga|descargar|baja|bajar)\s+(https?:\/\/\S+)/i))) { P.fetchToVault(m[1]).catch(() => { }); return '⬇️ Descargando **dentro de EISEN**: lo encontrarás en **Descargas** (también si tu dispositivo no permite descargar).'; }
    if (/^(?:recuerdame|recordarme|avisame)\b/.test(t)) { const w = P.parseWhen(text); if (!w) return 'Dime cuándo, por ejemplo: “recuérdame **mañana a las 5 de la tarde** estudiar física” o “recuérdame **en 20 minutos** sacar la ropa”.'; const r = P.reminders.add(w.what, w.at); return `⏰ Te lo recordaré **${K.fmt.dt(r.at)}**: ${esc(r.what)}.`; }
    if (/^(?:transfiere|transferir|exporta|exportar|migra|migrar|lleva|pasa)\b.*\b(entorno|escritorio|datos|todo|configuracion|apps)/.test(t)) { E.launch('transfer', 'export'); return '🔁 Abrí **Transferir y sincronizar**: elige código, QR o archivo para llevar tu entorno a otro dispositivo, navegador o perfil.'; }
    if (/^(?:importa|importar|recibe|recibir)\b.*\b(entorno|escritorio|datos|codigo|qr)/.test(t)) { E.launch('transfer', 'import'); return '📥 Abrí **Transferir › Recibir**.'; }
    if (/\bmodo facil\b/.test(t)) { const off = /\b(quita|desactiva|salir|sal)\b/.test(t); P.easyMode(!off); return off ? 'Modo fácil desactivado.' : '🧸 **Modo fácil** activado: iconos grandes, un toque para abrir y menos distracciones.'; }
    if (/\b(modo tv|modo television|lanzador tv)\b/.test(t)) { E.launch('tvlauncher'); return '📺 Abrí el **Lanzador TV**.'; }
    if (/\b(rescata|recupera|trae)\b.*\bventanas?\b/.test(t)) { const n = P.rescueWindows(true); return n ? `🪟 Devolví **${n}** ventanas a la pantalla.` : 'Todas las ventanas ya estaban visibles.'; }
    if (/\b(estado|salud)\b.*\b(sistema|eisen|prime)\b/.test(t)) { return `✦ **EISEN OS PRIME ${P.version}** · guardado: **${({ saved: 'al día', saving: 'guardando', error: 'con error', off: 'desactivado' })[P.syncState] || P.syncState}** · nivel del equipo: **${caps.tier}** · descargas: **${P.saveMode() === 'vault' ? 'dentro de EISEN' : 'al dispositivo y copia en EISEN'}** · pestañas abiertas: **${P.peers.size + 1}**.`; }
    if ((m = t.match(/^(?:instala|instalar)\s+(?:el\s+)?(?:paquete|pack)\s+(.+)/))) { const B = P.BUNDLES.find(b => norm(b.name).includes(m[1].trim()) || b.id === m[1].trim()); if (!B) return 'Paquetes disponibles: ' + P.BUNDLES.map(b => '**' + b.name + '**').join(', ') + '.'; const n = P.bulkInstall(B.apps, B.name); return `📦 Paquete **${B.name}**: ${n} apps nuevas instaladas (en una carpeta del escritorio).`; }
    if (/^(?:abre|abrir)\s+(?:las\s+)?descargas\b/.test(t)) { E.launch('downloads'); return '⬇️ Abrí **Descargas**.'; }
    if (/\bcursor virtual\b/.test(t)) { P.vcursor.toggle(); return '🖱️ Cursor virtual ' + (P.vcursor.active() ? 'activado: mueve con la palanca izquierda y pulsa con A.' : 'desactivado.'); }
    if (/\b(paleta de comandos|comandos rapidos)\b/.test(t)) { P.palette.open(); return '⌘ Abrí la **paleta de comandos**.'; }
    return null;
  });
  F('a8');

  /* ================= 15. Paquetes de apps (t6) ================= */
  P.BUNDLES = [
    { id: 'escuela', name: 'Escuela', icon: '🎓', apps: ['academic', 'studio', 'flashcards', 'periodic', 'grapher', 'wiki', 'translator', 'references', 'bibliography', 'calc', 'word', 'excel', 'notes', 'tasks', 'calendar'] },
    { id: 'gaming', name: 'Gaming', icon: '🎮', apps: ['arcade', 'tvlauncher', 'gamepads', 'mediacenter'] },
    { id: 'creador', name: 'Creador', icon: '🎨', apps: ['paint', 'photo', 'pixel', 'colors', 'videoedit', 'audioedit', 'whiteboard', 'diagrams', 'fconvert'] },
    { id: 'oficina', name: 'Oficina', icon: '💼', apps: ['word', 'excel', 'slides', 'pdf', 'pdftools', 'notes', 'tasks', 'calendar', 'markdown', 'passwords'] },
    { id: 'xbox', name: 'Xbox y TV', icon: '📺', apps: ['tvlauncher', 'gamepads', 'mediacenter', 'downloads', 'transfer', 'whatsapp'] },
    { id: 'comunicacion', name: 'Comunicación', icon: '💬', apps: ['whatsapp', 'chat', 'meet', 'devcomm', 'qr'] }
  ].map(b => Object.assign(b, { apps: b.apps.filter(id => appOf(id)) }));
  F('t6');

  /* ================= 16. Paleta de comandos (a10) ================= */
  P.palette = (() => {
    let ov = null;
    const toggle = (k, label) => () => { const v = !pref(k); K.pref(k, v); E.toast((v ? '✓ ' : '✕ ') + tr(label)); };
    const CMDS = () => [
      ['⬇️', 'Abrir Descargas', 'descargas downloads bajar', () => E.launch('downloads')], ['🔁', 'Transferir mi entorno', 'transferir exportar migrar qr codigo', () => E.launch('transfer', 'export')], ['📥', 'Recibir un entorno', 'importar recibir codigo qr', () => E.launch('transfer', 'import')],
      ['✦', 'Centro PRIME', 'prime estado registro', () => E.launch('primecenter')], ['🩺', 'Comprobar la salud del sistema', 'salud reparar diagnostico', () => E.launch('primecenter', 'health')], ['↩️', 'Deshacer el último cambio de ajustes', 'deshacer undo', () => E.launch('primecenter', 'journal')],
      ['🧩', 'Plugins', 'plugins extensiones', () => E.launch('plugins')], ['🎓', 'Estudio PRIME', 'estudio resumen examen', () => E.launch('studio')], ['⚡', 'Automatización y recordatorios', 'reglas recordatorios automatizar', () => E.launch('automate')], ['📺', 'Lanzador TV', 'tv xbox lanzador', () => E.launch('tvlauncher')], ['💬', 'WhatsApp Hub', 'whatsapp mensajes', () => E.launch('whatsapp')],
      ['🪟', 'Rescatar ventanas fuera de la pantalla', 'rescatar ventanas perdidas', () => P.rescueWindows()], ['🃏', 'Apps abiertas (tarjetas)', 'recientes tarjetas ventanas', () => P.recents.open()], ['◧', 'Pantalla dividida', 'dividir split', () => P.split()], ['🔒', 'Modo kiosco', 'kiosco una app', () => P.kiosk()],
      ['🖱️', 'Cursor virtual con el mando', 'cursor mando raton', () => P.vcursor.toggle()], ['🧸', 'Modo fácil (activar/desactivar)', 'facil sencillo mayores niños', () => P.easyMode(!html.classList.contains('p11-easy'))], ['👆', 'Objetivos táctiles grandes', 'grande tactil botones', toggle('p11BigTargets', 'Objetivos táctiles grandes')],
      ['📏', 'Regla de lectura', 'regla lectura dislexia', toggle('p11Ruler', 'Regla de lectura')], ['🔦', 'Atenuar todo salvo la ventana activa', 'mascara enfoque', toggle('p11FocusMask', 'Atenuar el resto')], ['⌨️', 'Mostrar teclas pulsadas', 'teclas presentacion', toggle('p11Keys', 'Mostrar teclas')],
      ['🎨', 'Acento desde el fondo de pantalla', 'acento color fondo', () => P.accentFromWallpaper()], ['🖼️', 'Siguiente fondo de pantalla', 'fondo wallpaper', () => E.nextWallpaper && E.nextWallpaper()], ['🌓', 'Tema claro / oscuro', 'tema oscuro claro', () => { const b = $('#qt-dark'); b && b.click(); }], ['🍃', 'Bajo consumo', 'bajo consumo bateria', () => K.setLowPower && K.setLowPower(!html.classList.contains('low-power'))],
      ['⛶', 'Pantalla completa', 'pantalla completa fullscreen', () => { try { document.fullscreenElement ? document.exitFullscreen() : html.requestFullscreen(); } catch { /* ignorar */ } }], ['📊', 'Ordenar iconos por uso', 'ordenar iconos escritorio', P.sortDeskByUse], ['💾', 'Guardar todo ahora', 'guardar sincronizar espejo', async () => { await P.flush(); E.toast('✓ ' + tr('Todo guardado')); }],
      ['🛟', 'Crear punto de restauración', 'punto restauracion copia', async () => { await K.backup.snapshot('Manual (paleta)'); E.toast('✓ ' + tr('Punto de restauración creado')); }], ['🚪', 'Cerrar EISEN en las demás pestañas', 'sesiones pestañas cerrar', () => { P.closeOtherSessions(); E.toast(tr('Se cerraron las demás sesiones')); }],
      ...P.BUNDLES.map(b => [b.icon, tr('Instalar paquete') + ' ' + b.name, 'paquete pack instalar ' + b.id, () => { const n = P.bulkInstall(b.apps, b.name); E.toast('📦 ' + b.name + ': ' + n + ' ' + tr('apps nuevas')); }]),
      ...PL.commands().map(c => ['🧩', c.phrase, 'plugin ' + c.plugin, () => { const r = PL.runCommand(c); if (r) E.toast(r); }])
    ];
    const close = () => { if (ov) { ov.remove(); ov = null; } };
    const open = () => {
      close(); const list = CMDS();
      ov = el('div', { class: 'eis-modal p11-pal', role: 'dialog', 'aria-label': tr('Paleta de comandos') });
      ov.innerHTML = `<div class="eis-modal-card"><input class="input-text" data-pq placeholder="${esc(tr('Escribe un comando… («>» para preguntar a Domingo)'))}" aria-label="${esc(tr('Comando'))}"><div class="p11-pl" role="listbox" data-pl></div></div>`;
      document.body.appendChild(ov);
      const inp = ov.querySelector('[data-pq]'), box = ov.querySelector('[data-pl]'); let sel = 0, shown = [];
      const draw = () => { const q = norm(inp.value.trim()); if (q.startsWith('>')) { shown = [['✦', tr('Preguntar a Domingo') + ': ' + inp.value.trim().slice(1), '', () => E.domingo(inp.value.trim().slice(1).trim())]]; } else { shown = list.filter(c => !q || norm(c[1] + ' ' + c[2]).includes(q)); if (!shown.length && q.length > 2) { shown = list.map(c => [c, Math.min(...norm(c[1]).split(' ').map(w => w.startsWith(q.slice(0, 3)) ? 0 : 9))]).filter(x => x[1] === 0).map(x => x[0]); } } sel = Math.min(sel, Math.max(0, shown.length - 1)); box.innerHTML = shown.slice(0, 40).map((c, i) => `<button role="option" class="p11-pi${i === sel ? ' on' : ''}" data-pi="${i}"><span>${esc(c[0])}</span>${esc(c[1])}</button>`).join('') || `<p class="eis-muted">${esc(tr('Sin resultados. Escribe «>» para preguntar a Domingo.'))}</p>`; };
      const run = i => { const c = shown[i]; if (!c) return; close(); try { c[3](); } catch (e) { console.error(e); } };
      inp.addEventListener('input', () => { sel = 0; draw(); });
      inp.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); draw(); box.querySelector('.on') && box.querySelector('.on').scrollIntoView({ block: 'nearest' }); } if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); } if (e.key === 'Enter') { e.preventDefault(); run(sel); } if (e.key === 'Escape') close(); });
      box.addEventListener('click', e => { const b = e.target.closest('[data-pi]'); if (b) run(+b.dataset.pi); });
      ov.addEventListener('pointerdown', e => { if (e.target === ov) close(); });
      draw(); setTimeout(() => inp.focus(), 30);
    };
    return { open, close, commands: CMDS };
  })();
  K.keys.register('p11palette', 'Paleta de comandos PRIME', 'Ctrl+Shift+Space', () => P.palette.open(), 'Sistema');
  F('a10');

  /* ================= 17. Widgets PRIME (i1-i10) ================= */
  const W = K.widgets;
  if (W) {
    const acad = () => Object.assign({ subjects: [], schedule: [], tasks: [] }, S.get('a9_academic', {}) || {});
    const subj = (D, id) => (D.subjects.find(s => s.id === id) || {}).name || '';
    W.register('p11dl', { name: 'Descargas recientes', icon: '⬇️', every: 30000, render(b) { const l = P.downloads.list().slice(0, 4); b.innerHTML = l.length ? l.map(d => `<button class="p11-wrow" data-wfile="${esc(d.id)}">${d.danger ? '⚠️' : '📄'} <span>${esc(d.name)}</span><small>${esc(K.fmt.bytes(d.size || 0))}</small></button>`).join('') + `<button class="k9-btn" data-wl="downloads">${esc(tr('Ver todas'))}</button>` : `<p class="eis-muted k9-small">${esc(tr('Sin descargas todavía.'))}</p><button class="k9-btn" data-wl="downloads">${esc(tr('Descargar desde una URL'))}</button>`; } });
    W.register('p11sync', { name: 'Guardado y sesiones', icon: '💾', every: 5000, render(b) { const st = { saved: ['✓', 'Todo guardado'], saving: ['…', 'Guardando'], error: ['⚠️', 'Error al guardar el espejo'], off: ['—', 'Espejo desactivado'] }[P.syncState] || ['?', P.syncState]; b.innerHTML = `<b class="s10-w-big">${st[0]}</b><p class="k9-small">${esc(tr(st[1]))}${P.mirror.last ? ' · ' + esc(K.fmt.time(P.mirror.last)) : ''}</p><p class="k9-small eis-muted">${P.peers.size ? esc(tr('Abierto también en')) + ' ' + P.peers.size + ' ' + esc(tr('pestaña(s)')) : esc(tr('Solo esta pestaña'))}</p>`; } });
    W.register('p11new', { name: 'Recién instaladas', icon: '🆕', every: 60000, render(b) { const l = P.reg.recent(6).map(appOf).filter(Boolean); b.innerHTML = l.length ? `<div class="p11-wgrid">${l.map(a => `<button data-wl="${esc(a.id)}" title="${esc(a.name)}">${E.tile(a, 34)}</button>`).join('')}</div>` : `<p class="eis-muted k9-small">${esc(tr('Instala apps desde el App Center: aparecerán aquí.'))}</p>`; } });
    W.register('p11class', { name: 'Clase actual', icon: '🏫', every: 60000, render(b) { const D = acad(), d = new Date(), day = (d.getDay() + 6) % 7, hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); const today = D.schedule.filter(c => +c.day === day).sort((x, y) => String(x.start).localeCompare(y.start)); const cur = today.find(c => c.start <= hm && hm < c.end), next = today.find(c => c.start > hm); b.innerHTML = !D.schedule.length ? `<p class="eis-muted k9-small">${esc(tr('Añade tu horario en el Organizador académico.'))}</p><button class="k9-btn" data-wl="academic">${esc(tr('Abrir'))}</button>` : `${cur ? `<b>${esc(subj(D, cur.sid))}</b><p class="k9-small">${esc(tr('Ahora'))} · ${esc(cur.start)}–${esc(cur.end)}${cur.room ? ' · ' + esc(cur.room) : ''}</p>` : `<p class="k9-small">${esc(tr('Sin clase ahora'))}</p>`}${next ? `<p class="k9-small eis-muted">${esc(tr('Siguiente'))}: ${esc(subj(D, next.sid))} · ${esc(next.start)}</p>` : ''}`; } });
    W.register('p11exam', { name: 'Próximo examen', icon: '📝', every: 60000, render(b) { const D = acad(), t = new Date().toISOString().slice(0, 10); const ex = D.tasks.filter(x => x.type === 'examen' && !x.done && x.due >= t).sort((a, c) => a.due.localeCompare(c.due))[0]; if (!ex) { b.innerHTML = `<p class="eis-muted k9-small">${esc(tr('No hay exámenes próximos.'))}</p>`; return; } const days = Math.round((new Date(ex.due + 'T00:00') - new Date(t + 'T00:00')) / 86400000); b.innerHTML = `<b class="s10-w-big">${days === 0 ? esc(tr('Hoy')) : days + ' ' + esc(tr(days === 1 ? 'día' : 'días'))}</b><p class="k9-small">${esc(ex.title)}${subj(D, ex.sid) ? ' · ' + esc(subj(D, ex.sid)) : ''}</p><button class="k9-btn" data-wl="studio">${esc(tr('Estudiar'))}</button>`; } });
    W.register('p11pad', { name: 'Mando', icon: '🎮', every: 3000, render(b) { const gp = pad(); b.innerHTML = gp ? `<b>${esc(gp.id.replace(/\(.*?\)/g, '').slice(0, 40))}</b><p class="k9-small">${esc(tr('Conectado'))} · ${gp.buttons.length} ${esc(tr('botones'))}${gp.vibrationActuator ? ' · ' + esc(tr('vibración')) : ''}</p><button class="k9-btn" data-wact="vcursor">🖱️ ${esc(tr('Cursor virtual'))}</button>` : `<p class="k9-small eis-muted">${esc(tr('Pulsa un botón del mando para conectarlo.'))}</p>`; } });
    W.register('p11store', { name: 'Almacenamiento', icon: '💽', every: 60000, render(b) { b.textContent = '…'; (navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve(null)).then(e => { if (!e || !e.quota) { b.innerHTML = `<p class="k9-small eis-muted">${esc(tr('Este navegador no informa del espacio.'))}</p>`; return; } const pct = e.usage / e.quota * 100; b.innerHTML = `<b>${esc(K.fmt.bytes(e.usage))}</b> <span class="k9-small eis-muted">/ ${esc(K.fmt.bytes(e.quota))}</span>${K.u10 ? K.u10.meter(pct) : ''}<p class="k9-small eis-muted">${P.persisted ? '🛡️ ' + esc(tr('Protegido ante limpiezas')) : esc(tr('Sin protección persistente'))}</p>`; }); } });
    W.register('p11actions', { name: 'Acciones rápidas PRIME', icon: '✦', render(b) { b.innerHTML = `<div class="p11-wgrid">${[['downloads', '⬇️', 'Descargas'], ['transfer', '🔁', 'Transferir'], ['primecenter', '✦', 'PRIME'], ['studio', '🎓', 'Estudio']].filter(x => appOf(x[0])).map(x => `<button data-wl="${x[0]}" title="${esc(tr(x[2]))}"><span style="font-size:22px">${x[1]}</span><small>${esc(tr(x[2]))}</small></button>`).join('')}<button data-wact="palette" title="${esc(tr('Comandos'))}"><span style="font-size:22px">⌘</span><small>${esc(tr('Comandos'))}</small></button><button data-wact="recents" title="${esc(tr('Ventanas'))}"><span style="font-size:22px">🃏</span><small>${esc(tr('Ventanas'))}</small></button></div>`; } });
    W.register('p11wa', { name: 'WhatsApp rápido', icon: '💬', render(b) { const c = (S.get('prime_wa_contacts', []) || []).slice(0, 4); b.innerHTML = (c.length ? c.map(x => `<button class="p11-wrow" data-wa="${esc(x.phone)}">💬 <span>${esc(x.name)}</span></button>`).join('') : `<p class="eis-muted k9-small">${esc(tr('Añade contactos en WhatsApp Hub.'))}</p>`) + `<button class="k9-btn" data-wl="whatsapp">${esc(tr('Abrir WhatsApp Hub'))}</button>`; } });
    W.register('p11tip', { name: 'Sugerencias', icon: '💡', every: 120000, render(b) { P.suggest().then(l => { b.innerHTML = l.slice(0, 3).map((s, i) => `<button class="p11-wrow" data-wsug="${i}">${esc(s[0])} <span>${esc(tr(s[1]))}</span></button>`).join(''); b.__sug = l; }); } });
    document.addEventListener('click', e => {
      const t = e.target; if (!t.closest || !t.closest('.s9-w')) return;
      const l = t.closest('[data-wl]'); if (l) { if (!E.isInstalled(l.dataset.wl) && appOf(l.dataset.wl)) E.storeShow(l.dataset.wl); else E.launch(l.dataset.wl); return; }
      const f = t.closest('[data-wfile]'); if (f) { K.files.open(f.dataset.wfile); return; }
      const a = t.closest('[data-wact]'); if (a) { ({ vcursor: () => P.vcursor.toggle(), palette: () => P.palette.open(), recents: () => P.recents.open() })[a.dataset.wact](); return; }
      const w = t.closest('[data-wa]'); if (w) { P.openExternal('https://wa.me/' + w.dataset.wa.replace(/\D/g, ''), 'WhatsApp'); return; }
      const s = t.closest('[data-wsug]'); if (s) { const box = s.closest('[data-wb]'); const sug = box && box.__sug && box.__sug[+s.dataset.wsug]; if (sug) sug[2](); }
    });
    ['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i8', 'i9', 'i10'].forEach(F);
  }

  /* ================= 18. Configuración: tarjetas PRIME en los apartados existentes ================= */
  const U = K.cfgUI;
  if (U) {
    const { add, card, row, sw, sel, btn } = U;
    const capTxt = () => [caps.xbox ? 'Xbox' : caps.tv ? 'TV' : caps.ios ? 'iOS' : caps.android ? 'Android' : caps.touch ? 'Táctil' : 'Escritorio', caps.download ? tr('descarga archivos') : tr('sin descargas: se guardan en EISEN'), caps.popup ? tr('ventanas externas') : tr('sin ventanas externas'), caps.shareFiles ? tr('comparte archivos') : '', tr('nivel') + ' ' + caps.tier].filter(Boolean).join(' · ');
    add('store', card('Instalación PRIME', 'download', row('Crear acceso directo en el escritorio al instalar', sw('p11AutoDesk')) + row('Añadir al menú Inicio al instalar', sw('p11AutoStart')) + row('Este dispositivo puede descargar archivos', `<select class="input-text" data-p11cap="download"><option value="">${esc(tr('Detectar automáticamente'))}</option><option value="1">${esc(tr('Sí'))}</option><option value="0">${esc(tr('No: guardar todo dentro de EISEN'))}</option></select>`) + `<p class="k9-small eis-muted" data-p11caps></p><div class="ui-row">${btn('p11-downloads', 'Descargas', 'download')}${btn('p11-bundles', 'Paquetes de apps', 'box')}${btn('p11-apps', 'Registro de apps instaladas', 'list')}</div>`, 'Las apps web se abren con el método que mejor funciona en tu dispositivo (ventana de app EISEN, navegador EISEN o ventana real); puedes cambiarlo en la ficha de cada app del Centro PRIME.'));
    add('storage', card('Descargas PRIME', 'download', row('Organizar las descargas por tipo (imágenes, música, vídeos)', sw('prime_dl_sort', true)) + `<div class="ui-row">${btn('p11-downloads', 'Abrir Descargas', 'download', 'btn-primary')}</div>`, 'Todo lo que descargas queda dentro de EISEN y se abre con sus visores, aunque el dispositivo no permita descargar.'));
    add('accounts', card('Sincronización y transferencia', 'update', `<p class="k9-small" data-p11sync></p><div class="ui-row">${btn('p11-transfer', 'Transferir mi entorno', 'share', 'btn-primary')}${btn('p11-sessions', 'Sesiones abiertas', 'layers')}${btn('p11-closeothers', 'Cerrar las demás sesiones', 'close')}</div>`, 'Las pestañas de EISEN se sincronizan en vivo. Para otros navegadores, perfiles o dispositivos usa código, QR o archivo.'));
    add('backup', card('Espejo PRIME y deshacer', 'shield', `<p class="k9-small" data-p11mirror></p><div class="ui-row">${btn('p11-flush', 'Guardar todo ahora', 'save')}${btn('p11-journal', 'Deshacer cambios de ajustes', 'history')}${btn('p11-health', 'Salud y reparación', 'pulse')}</div>`, 'Una copia de todos tus ajustes vive también en IndexedDB: repara datos dañados y recupera tu entorno si el navegador vacía el almacenamiento.'));
    add('desktop', card('Escritorio PRIME', 'monitor', row('Bloquear iconos (evita arrastres accidentales)', sw('p11DeskLock')) + row('Estilo de las etiquetas', sel('p11Labels', [['shadow', 'Con sombra'], ['pill', 'Con fondo'], ['plain', 'Sin efectos']])) + row('Color de los iconos', sel('p11Icons', [['vivid', 'Vivos'], ['muted', 'Sobrios'], ['mono', 'Monocromo']])) + row('Menú Inicio a pantalla completa', sw('p11StartFull')) + row('Escribir en el escritorio abre la búsqueda', sw('p11TypeSearch')) + `<div class="ui-row">${btn('p11-sortuse', 'Ordenar iconos por uso', 'sort')}${btn('p11-rescue', 'Rescatar ventanas', 'target')}</div>`));
    add('personal', card('Personalización PRIME', 'palette', row('Fuente de la interfaz', sel('p11Font', [['system', 'Del sistema'], ['rounded', 'Redondeada'], ['serif', 'Con serifa'], ['mono', 'Monoespaciada'], ['readable', 'Muy legible']])) + row('Barra de tareas', sel('p11Taskbar', [['glass', 'Cristal'], ['solid', 'Sólida'], ['accent', 'Con acento'], ['clear', 'Transparente']])) + row('Brillo de acento en la ventana activa', sw('p11Glow')) + row('Fondo dinámico (claro de día, oscuro de noche)', sw('p11DynWall')) + row('Sonidos PRIME', sel('p11Sound', [['off', 'Los de siempre'], ['soft', 'Suaves'], ['tech', 'Tecnológicos']])) + row('Mensaje en la pantalla de arranque', `<input class="input-text" data-skey="prime_bootmsg" maxlength="60" placeholder="${esc(tr('Ej.: Hola, Eisen'))}" style="width:220px">`) + `<div class="ui-row">${btn('p11-accent', 'Acento desde el fondo', 'sparkle')}</div>`));
    add('a11y', card('Accesibilidad PRIME', 'accessibility', row('Objetivos táctiles grandes (44 px)', sw('p11BigTargets')) + row('Regla de lectura', sw('p11Ruler')) + row('Subrayar los enlaces', sw('p11Underline')) + row('Espaciado de texto amplio', sw('p11Spacing')) + row('Atenuar todo salvo la ventana activa', sw('p11FocusMask')) + row('Las notificaciones no se cierran solas', sw('p11Sticky')) + row('Mostrar las teclas pulsadas', sw('p11Keys')) + `<div class="ui-row">${btn('p11-easy', 'Modo fácil (activar/desactivar)', 'accessibility', 'btn-primary')}</div>`));
    add('controller', card('Mando PRIME', 'target', row('Vibración al aceptar y volver', sw('p11Haptics')) + row('Barra de ayuda de botones', sw('p11Hints')) + `<div class="ui-row">${btn('p11-vcursor', 'Cursor virtual', 'target')}${btn('p11-tv', 'Lanzador TV', 'monitor')}</div>`, 'Nuevas acciones asignables en el Centro de mandos: cursor virtual, Descargas, Transferir, Lanzador TV, paleta de comandos, cerrar/maximizar/minimizar ventana y zoom de la interfaz.'));
    add('perf', card('Rendimiento PRIME', 'zap', `<p class="k9-small" data-p11perf></p>` + row('Cerrar apps minimizadas inactivas (15 min)', sel('p11IdleClose', [['auto', 'Solo en equipos modestos'], ['on', 'Siempre'], ['off', 'Nunca']])) + row('Precargar apps al pasar por su icono', sw('p11Prefetch')) + row('Avisar si una app bloquea la interfaz', sw('p11Freeze'))));
    add('notif', card('Notificaciones PRIME', 'bell', row('Agrupar avisos repetidos', sw('p11Group')) + row('Avisos del sistema cuando EISEN está en segundo plano', sw('p11SysNotif')) + row('Horario de silencio', `<input class="input-text" data-pref="p11Quiet" placeholder="22:00-07:00" style="width:140px">`, 'Activa «No molestar» automáticamente en ese horario.') + row('Resumen al volver', sw('p11Summary')) + `<div class="ui-row">${btn('p11-notifperm', 'Permitir avisos del sistema', 'bell')}${btn('p11-automate', 'Recordatorios', 'clock')}</div>`));
    add('devices', card('Táctil y tableta', 'cpu', row('Gestos táctiles (bordes, deslizar, pulsación larga)', sw('p11Gestures')) + row('Modo tableta', sel('p11Tablet', [['auto', 'Automático'], ['on', 'Siempre'], ['off', 'Nunca']])) + row('Mantener la pantalla encendida en vídeo, lectura y exámenes', sw('p11WakeLock')) + `<div class="ui-row">${btn('p11-split', 'Pantalla dividida', 'grid')}${btn('p11-kiosk', 'Modo kiosco', 'lock')}${btn('p11-recents', 'Apps abiertas', 'layers')}</div>`, 'Desliza desde abajo para ver las apps abiertas, desde la izquierda para los widgets y desde la derecha para las notificaciones. Dos dedos a los lados cambian de escritorio.'));
    Object.assign(U.acts, {
      'p11-downloads': () => E.launch('downloads'), 'p11-bundles': () => E.launch('primecenter', 'apps'), 'p11-apps': () => E.launch('primecenter', 'apps'), 'p11-transfer': () => E.launch('transfer'), 'p11-sessions': () => E.launch('primecenter', 'sessions'), 'p11-closeothers': () => { P.closeOtherSessions(); E.toast(tr('Se cerraron las demás sesiones')); },
      'p11-flush': async () => { await P.flush(); E.toast('✓ ' + tr('Todo guardado')); }, 'p11-journal': () => E.launch('primecenter', 'journal'), 'p11-health': () => E.launch('primecenter', 'health'), 'p11-sortuse': () => P.sortDeskByUse(), 'p11-rescue': () => P.rescueWindows(), 'p11-accent': () => P.accentFromWallpaper(),
      'p11-easy': () => P.easyMode(!html.classList.contains('p11-easy')), 'p11-vcursor': () => P.vcursor.toggle(), 'p11-tv': () => E.launch('tvlauncher'), 'p11-automate': () => E.launch('automate'), 'p11-split': () => P.split(), 'p11-kiosk': () => P.kiosk(), 'p11-recents': () => P.recents.open(),
      'p11-notifperm': async () => { if (!caps.notif) return E.toast(tr('Este navegador no admite avisos del sistema')); const r = await Notification.requestPermission(); if (r === 'granted') { K.pref('p11SysNotif', true); E.toast('✓ ' + tr('Avisos del sistema permitidos')); } else E.toast(tr('El navegador no dio permiso')); }
    });
    const rend = (k, fn) => { const r0 = U.renderers[k]; U.renderers[k] = s => { if (r0) r0(s); try { fn(s); } catch (e) { console.error(e); } }; };
    rend('store', s => { const t = s.querySelector('[data-p11caps]'); if (t) t.textContent = tr('Detectado') + ': ' + capTxt(); const c = s.querySelector('[data-p11cap]'); if (c) { const f = (S.get('prime_caps_force', {}) || {}).download; c.value = f === true ? '1' : f === false ? '0' : ''; c.onchange = () => { const m = S.get('prime_caps_force', {}) || {}; if (c.value === '') delete m.download; else m.download = c.value === '1'; S.set('prime_caps_force', m); if (c.value === '0') S.set('save_mode', 'vault'); E.toast(tr('Se aplicará al recargar')); }; } });
    rend('accounts', s => { const t = s.querySelector('[data-p11sync]'); if (t) t.textContent = tr('Pestañas de EISEN abiertas') + ': ' + (P.peers.size + 1) + ' · ' + tr('Perfil') + ': ' + (K.profiles.current().name || ''); });
    rend('backup', s => { const t = s.querySelector('[data-p11mirror]'); if (t) t.textContent = tr('Estado del espejo') + ': ' + ({ saved: tr('al día'), saving: tr('guardando'), error: tr('con error'), off: tr('desactivado') }[P.syncState] || P.syncState) + (P.mirror.last ? ' · ' + K.fmt.dt(P.mirror.last) : '') + ' · ' + tr('cambios que se pueden deshacer') + ': ' + P.journal.list().length; });
    rend('perf', s => { const t = s.querySelector('[data-p11perf]'); if (t) t.textContent = tr('Nivel del equipo') + ': ' + caps.tier + (P.frameMs ? ' · ' + Math.round(1000 / P.frameMs) + ' fps' : '') + ' · ' + caps.cores + ' ' + tr('núcleos') + (caps.mem ? ' · ~' + caps.mem + ' GB' : ''); });
    try { U.bind(); U.index && U.index(); } catch { /* se enlaza al abrir */ }
  }
  /* ================= 18b. App Center: método de instalación virtual en las fichas (t4, t5) ================= */
  const acView = $('#win-appcenter [data-view]');
  if (acView) new MutationObserver(() => {
    const det = acView.querySelector('.ac9-detail'); if (!det || acView.querySelector('[data-p11m]')) return;
    const btn = det.querySelector('[data-inst],[data-open]'); const id = btn && (btn.dataset.inst || btn.dataset.open); const a = id && appOf(id); if (!a) return;
    const facts = acView.querySelector('.ac9-facts'); if (!facts) return;
    const r = P.reg.get(id) || {};
    if (a.ext || a.url) facts.insertAdjacentHTML('beforeend', `<div data-p11m><span>${esc(tr('Se abre en'))}</span><b><select class="input-text p11-msel" data-p11method="${esc(id)}">${['eisen', 'appwin', 'external'].map(m => `<option value="${m}"${P.methodOf(id) === m ? ' selected' : ''}>${esc(tr(P.METHODS[m]))}</option>`).join('')}</select></b></div>`);
    else facts.insertAdjacentHTML('beforeend', `<div data-p11m><span>${esc(tr('Instalación'))}</span><b>${esc(tr((E.REG[id] || {}).thirdParty ? 'Espacio aislado' : 'Virtual · sin descargas'))}</b></div>`);
    if (r.at || r.n) facts.insertAdjacentHTML('beforeend', `<div><span>${esc(tr('Uso'))}</span><b>${r.n || 0} ${esc(tr('veces'))}${r.at ? ' · ' + esc(tr('desde')) + ' ' + esc(K.fmt.date(r.at)) : ''}</b></div>`);
  }).observe(acView, { childList: true });
  document.addEventListener('change', e => { const m = e.target.closest && e.target.closest('[data-p11method]'); if (m) { P.setMethod(m.dataset.p11method, m.value); E.toast(tr('Se abrirá en') + ': ' + tr(P.METHODS[m.value])); } });
  if (U) { U.add('about', U.card('EISEN OS PRIME 11.0', 'sparkle', `<p class="k9-small">${esc(tr('eisen_osprime · 205 funciones nuevas sobre EISENKU OS 10.0: descargas dentro de EISEN, instalación virtual, espejo de datos, transferencia entre dispositivos, plugins, mando y táctil.'))}</p><div class="ui-row">${U.btn('p11-center', 'Centro PRIME', 'sparkle', 'btn-primary')}${U.btn('p11-feats', 'Ver las 205 funciones', 'list')}${U.btn('p11-recovery', 'Página de recuperación', 'shield')}</div>`)); Object.assign(U.acts, { 'p11-center': () => E.launch('primecenter'), 'p11-feats': () => E.launch('primecenter', 'features'), 'p11-recovery': () => window.open('recovery.html', '_blank') }); }

  /* ================= 19. Navegador EISEN: herramientas PRIME (w1-w4, w7, w8) ================= */
  const ebMenu = $('#eb-menu');
  if (ebMenu && E.eb) {
    const TRACK = /^(utm_\w+|fbclid|gclid|dclid|msclkid|mc_eid|mc_cid|igshid|si|ref_src|ref_url|_hsenc|_hsmi|yclid|twclid|wbraid|gbraid|spm|vero_id|oly_\w+)$/i;
    P.cleanUrl = u => { try { const x = new URL(u); [...x.searchParams.keys()].forEach(k => { if (TRACK.test(k)) x.searchParams.delete(k); }); return x.toString(); } catch { return u; } };
    ebMenu.insertAdjacentHTML('beforeend', `<div class="ctx-sep"></div><button data-p11w="install">📲 ${esc(tr('Instalar esta página como app'))}</button><button data-p11w="appwin">🪟 ${esc(tr('Abrir en una ventana de app'))}</button><button data-p11w="desk">📌 ${esc(tr('Anclar al escritorio'))}</button><button data-p11w="qr">🔳 ${esc(tr('QR de esta página'))}</button><button data-p11w="send">📡 ${esc(tr('Enviar a otro dispositivo'))}</button><button data-p11w="clean">🧽 ${esc(tr('Copiar enlace sin rastreadores'))}</button>`);
    const curTab = () => { try { const t = E.eb.cur(); return t && /^https?:/i.test(t.url) ? t : null; } catch { return null; } };
    const fav = h => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=64`;
    const showQr = async (url, note) => { if (!K.qr) await K.loadScript('js/os9/qrcode.js'); E.form({ title: tr('Abrir en otro dispositivo'), html: `<div class="p11-qr" style="background:#fff;padding:12px;border-radius:14px;width:fit-content;margin:auto">${K.qr.svg(K.qr.encode(url, 'M'), { margin: 2 })}</div><p class="k9-small eis-muted" style="word-break:break-all;text-align:center">${esc(url)}</p>${note ? `<p class="k9-small">${note}</p>` : ''}`, ok: tr('Copiar enlace'), cancel: tr('Cerrar') }).then(r => { if (r) K.ui.copy(url); }); };
    ebMenu.addEventListener('click', async e => {
      const b = e.target.closest('[data-p11w]'); if (!b) return; e.stopPropagation(); ebMenu.hidden = true;
      const t = curTab(); if (!t) return E.toast(tr('Abre primero una página web'));
      const url = P.cleanUrl(t.url), host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } })(), name = String(t.title || host).replace(/[<>]/g, '').slice(0, 40) || host;
      const k = b.dataset.p11w;
      if (k === 'install') { if (!/^https:/i.test(url)) return E.toast(tr('Solo se instalan páginas seguras (https)')); const users = (S.get('user_apps', []) || []); let a = users.find(x => x.ext === url); if (!a) { a = { id: 'user-' + E.uid(), name, ext: url, cat: 'Internet', desc: host, icon: '🌐', img: fav(host) }; users.push(a); S.set('user_apps', users); P.syncUserApps(); } E.setInstalled(a.id, true); K.seclog && K.seclog('apps', 'Página instalada como app: ' + host); E.notify(tr('App instalada'), name + ' · ' + tr('ya está en el escritorio y en Inicio'), '📲'); }
      if (k === 'appwin') P.openAppWindow({ id: 'url-' + host.replace(/\W/g, '_'), name, ext: url, icon: '🌐', img: fav(host), cat: 'Internet' });
      if (k === 'desk') { const it = E.desktopItems && E.desktopItems(); if (it && !it.some(x => x.t === 'url' && x.ref === url)) { it.push({ id: 'd-' + E.uid(), t: 'url', ref: url, name, icon: '🌐', img: fav(host) }); E.desktopRender(); } E.toast('📌 ' + tr('Anclada al escritorio')); }
      if (k === 'qr') showQr(url);
      if (k === 'clean') { K.ui.copy(url); if (url !== t.url) E.toast('🧽 ' + tr('Se quitaron los parámetros de rastreo')); }
      if (k === 'send') { try { if (!P.transfer) await K.loadScript('js/os11/apps/sync11.js'); if (await P.transfer.relayAvail()) { const code = await P.transfer.sendLink(url); showQr(location.origin + location.pathname + '#relay=' + code, esc(tr('Código de red local')) + ': <b style="font-size:18px;letter-spacing:.12em">' + esc(code) + '</b> · ' + esc(tr('caduca en 10 min'))); } else showQr(url, esc(tr('Escanéalo con el otro dispositivo para abrir la página.'))); } catch (er) { showQr(url); } }
    });
    P.webTools = true; ['w1', 'w2', 'w3', 'w4', 'w7', 'w8'].forEach(F);
  }

  F('c7');   // indicador de guardado (bandeja)
  const savePill = el('button', { class: 'systray-pill p11-savepill', title: tr('Estado de guardado PRIME'), 'aria-label': tr('Estado de guardado') });
  if (tray) tray.insertBefore(savePill, tray.firstChild);
  const drawSave = () => { const st = P.syncState; savePill.dataset.st = st; savePill.textContent = st === 'saving' ? '⟳' : st === 'error' ? '⚠' : st === 'off' ? '' : '✓'; savePill.hidden = st === 'off' && !P.writeLock; savePill.title = tr({ saved: 'Todo guardado (espejo PRIME al día)', saving: 'Guardando…', error: 'No se pudo actualizar el espejo PRIME', off: 'Espejo desactivado' }[st] || st); };
  K.on('prime:state', drawSave); drawSave(); savePill.onclick = () => E.launch('primecenter');
  K.emit('prime:shell');
})();

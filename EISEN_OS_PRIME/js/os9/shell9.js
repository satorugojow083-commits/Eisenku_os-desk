/* =====================================================================
   EISENKU OS 9.0 ENTERPRISE · Shell
   Amplía el shell 8.0 (shell.js) sin sustituirlo:
   escritorios virtuales y vista general, menú de ventana, centro de notificaciones,
   accesos rápidos, búsqueda global, widgets, modo concentración, inicio de sesión
   y bloqueo con perfiles, atajos personalizables y opciones de Linux/Windows.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, $ = K.$, $$ = K.$$, tr = K.tr, I = K.icon;
  const html = document.documentElement;
  const appOf = id => E.REG[id] || E.apps().find(a => a.id === id) || null;
  const winOf = id => document.getElementById('win-' + id);
  const isOpen = w => w && w.classList.contains('open');
  let lastDown = null;
  window.addEventListener('pointerdown', e => { lastDown = e.target; }, true);

  /* ================= 1. Preferencias aplicadas ================= */
  const night = document.createElement('div'); night.id = 's9-night'; document.body.appendChild(night);
  function applyPrefs() {
    const p = K.prefs();
    html.dataset.tbalign = p.taskbarAlign; html.dataset.dock = p.dockPos; html.dataset.dockAutohide = p.dockAutohide ? '1' : '0';
    html.style.setProperty('--dock-size', (+p.dockSize || 46) + 'px');
    html.dataset.notifpos = p.notifPos; html.dataset.radius = p.radius;
    html.classList.toggle('dense', p.density === 'compact');
    html.classList.toggle('hc', !!p.contrast);
    html.classList.toggle('reduce-motion', p.reduceMotion === true || (p.reduceMotion !== false && matchMedia('(prefers-reduced-motion: reduce)').matches));
    html.classList.toggle('focus-strong', !!p.focusRing);
    html.classList.toggle('font-readable', !!p.dyslexia);
    html.style.setProperty('--font-scale', String(+p.fontScale || 1));
    night.style.opacity = String(Math.max(0, Math.min(.6, +p.nightLight || 0)));
    const low = !!S.get('os9_lowpower', false);
    html.classList.toggle('low-power', low);
    if (low || p.glass === 'off') html.classList.add('no-glass'); else if (p.glass === 'on') html.classList.remove('no-glass'); else html.classList.toggle('no-glass', !S.get('glass', !(K.caps.xbox || K.caps.lowMemory)));
    html.classList.toggle('s9-big-cursor', p.cursor === 'large');
  }
  K.applyPrefs = applyPrefs;
  K.on('pref', applyPrefs);
  applyPrefs();
  K.setLowPower = on => { S.set('os9_lowpower', !!on); applyPrefs(); K.emit('lowpower', !!on); E.toast(on ? tr('Modo de bajo consumo activado') : tr('Modo de bajo consumo desactivado')); };

  /* ================= 2. Notificaciones: atribución por app, silencio por app y duración ================= */
  const n0 = E.notify;
  E.notify = (title, body = '', icon = '🔔', ms) => {
    const app = K.activeApp(), mute = S.get('os9_mute', []) || [];
    if (mute.includes(app)) { const l = S.get('notif_log', []); l.unshift({ title, body, icon, d: Date.now(), app }); S.set('notif_log', l.slice(0, 80)); document.dispatchEvent(new CustomEvent('eisen:notify')); return; }
    n0(title, body, icon, ms || +K.pref('notifMs') || 6000);
    const l = S.get('notif_log', []); if (l[0] && !l[0].app) { l[0].app = app; S.set('notif_log', l); }
    if (K.pref('sounds') && !S.get('notif_sound', false) && !S.get('dnd', false)) K.sound('note');
  };
  // sonidos del sistema discretos (WebAudio, sin archivos)
  let ac = null;
  K.sound = (kind = 'note') => {
    if (!K.pref('sounds') || S.get('os9_lowpower', false)) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const seq = { note: [[880, .07], [1175, .09]], ok: [[660, .06], [990, .1]], warn: [[440, .12], [330, .14]], end: [[523, .1], [659, .1], [784, .16]] }[kind] || [[880, .08]];
      let t = ac.currentTime; const vol = Math.min(.08, (+S.get('volume', .8) || .8) * .08);
      seq.forEach(([f, d]) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + .02); t += d * .9; });
    } catch { /* sin audio */ }
  };

  /* ================= 3. Escritorios virtuales ================= */
  const D = K.desks = {
    count: Math.max(1, Math.min(6, +S.get('os9_desks', 2) || 2)), cur: 1,
    names: () => S.get('os9_desk_names', {}) || {},
    name: n => D.names()[n] || tr('Escritorio') + ' ' + n,
    winsOn: n => $$('.window.open').filter(w => (+w.dataset.desk || n) === n),
    apply() {
      $$('.window').forEach(w => { const d = +w.dataset.desk || 0; w.classList.toggle('s9-otherdesk', !!d && d !== D.cur); });
      renderWs(); document.dispatchEvent(new CustomEvent('eisen:windows'));
    },
    go(n, quiet) {
      n = Math.max(1, Math.min(D.count, n)); if (n === D.cur) return;
      D.cur = n; D.apply(); K.emit('desk', n);
      if (!quiet) E.toast('🗂️ ' + D.name(n));
      const top = D.winsOn(n).filter(w => !w.classList.contains('minimized')).sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0]; if (top) E.focusWindow(top);
    },
    add() { if (D.count >= 6) { E.toast(tr('Máximo 6 escritorios')); return; } D.count++; S.set('os9_desks', D.count); D.go(D.count); },
    remove(n) { if (D.count <= 1) return; $$('.window').forEach(w => { const d = +w.dataset.desk; if (d === n) w.dataset.desk = Math.max(1, n - 1); else if (d > n) w.dataset.desk = d - 1; }); D.count--; S.set('os9_desks', D.count); D.cur = Math.min(D.cur, D.count); D.apply(); },
    move(w, n) { if (!w) return; w.dataset.desk = Math.max(1, Math.min(D.count, n)); D.apply(); E.toast(tr('Ventana movida a') + ' ' + D.name(+w.dataset.desk)); }
  };
  document.addEventListener('eisen:open', e => {
    const w = winOf(e.detail); if (!w) return;
    const d = +w.dataset.desk || 0;
    if (w.__s9open && d && d !== D.cur) { D.go(d, true); }
    else if (!w.__s9open || !d) w.dataset.desk = D.cur;
    w.__s9open = true; D.apply();
  });
  document.addEventListener('eisen:close', e => { const w = winOf(e.detail); if (w) { delete w.dataset.desk; w.__s9open = false; w.classList.remove('s9-otherdesk', 's9-pinned'); } });

  /* ================= 4. Menú de ventana, siempre visible y atajos de ventana ================= */
  const activeWin = () => $('.window.active.open:not(.minimized):not(.s9-otherdesk)');
  const maxToggle = w => { w.classList.toggle('maximized'); w.classList.remove('minimized'); E.updateTaskbarButtons(); };
  const restoreSnap = w => { if (w.classList.contains('snapped') && w.dataset.prev) { try { const p = JSON.parse(w.dataset.prev); w.style.left = p.l; w.style.top = p.t; w.style.width = p.w; w.style.height = p.h; } catch { /* ignorar */ } delete w.dataset.prev; w.classList.remove('snapped'); } };
  const pinRaise = () => $$('.window.s9-pinned.open').forEach(w => { w.style.zIndex = 8000; });
  window.addEventListener('pointerdown', () => setTimeout(pinRaise, 0));
  function windowMenu(w, x, y) {
    const id = w.id.slice(4), a = appOf(id) || {};
    const items = [
      { label: w.classList.contains('maximized') ? 'Restaurar' : 'Maximizar', icon: 'max', act: () => maxToggle(w), kbd: 'Alt+Shift+↑' },
      { label: 'Minimizar', icon: 'min', act: () => { w.classList.add('minimized'); E.updateTaskbarButtons(); }, kbd: 'Alt+Shift+↓' },
      { label: 'Ajustar a la izquierda', icon: 'left', act: () => { w.classList.remove('maximized'); E.snapWindow(w, 'left'); }, kbd: 'Alt+Shift+←' },
      { label: 'Ajustar a la derecha', icon: 'right', act: () => { w.classList.remove('maximized'); E.snapWindow(w, 'right'); }, kbd: 'Alt+Shift+→' },
      { label: 'Centrar', icon: 'target', act: () => { restoreSnap(w); w.classList.remove('maximized'); w.style.left = Math.max(0, (innerWidth - w.offsetWidth) / 2) + 'px'; w.style.top = Math.max(+getComputedStyle(html).getPropertyValue('--top-h').replace('px', '') || 0, (innerHeight - w.offsetHeight) / 2 - 20) + 'px'; } },
      { label: 'Siempre visible', icon: 'pin', checked: w.classList.contains('s9-pinned'), act: () => { w.classList.toggle('s9-pinned'); if (!w.classList.contains('s9-pinned')) w.style.zIndex = 200; pinRaise(); } },
      { sep: true },
      ...Array.from({ length: D.count }, (_, i) => i + 1).filter(n => n !== (+w.dataset.desk || D.cur)).map(n => ({ label: tr('Mover a') + ' ' + D.name(n), icon: 'layers', act: () => D.move(w, n) })),
      ...(D.count < 6 ? [{ label: 'Mover a un escritorio nuevo', icon: 'plus', act: () => { D.count++; S.set('os9_desks', D.count); D.move(w, D.count); renderWs(); } }] : []),
      { sep: true },
      { label: 'Ayuda de esta app (Handbook)', icon: 'help', act: () => K.help && K.help(id) },
      { label: 'Cerrar', icon: 'close', danger: true, act: () => w.querySelector('[data-act="close"]').click(), kbd: 'Alt+Shift+Q' }
    ];
    if (a.thirdParty || K.MANIFESTS[id]) items.splice(items.length - 1, 0, { label: 'Permisos de la app', icon: 'shield', act: () => E.launch('permissions', id) });
    K.ui.menu(x, y, items);
  }
  document.addEventListener('contextmenu', e => {
    const h = e.target.closest && e.target.closest('.window-header'); if (!h || e.target.closest('button,input,select')) return;
    e.preventDefault(); e.stopPropagation(); windowMenu(h.closest('.window'), e.clientX, e.clientY);
  }, true);

  /* ================= 5. Atajos de teclado personalizables ================= */
  const KEYS = K.keys = {
    defs: [],
    register(id, label, combo, run, group = 'Sistema') { KEYS.defs.push({ id, label, combo, run, group }); },
    map() { const o = S.get('os9_keys', {}) || {}; const m = {}; KEYS.defs.forEach(d => { m[d.id] = o[d.id] !== undefined ? o[d.id] : d.combo; }); return m; },
    set(id, combo) { const o = S.get('os9_keys', {}) || {}; o[id] = combo; S.set('os9_keys', o); },
    reset() { S.set('os9_keys', {}); },
    combo(e) { const k = e.key.length === 1 ? e.key.toUpperCase() : e.key; if (['Control', 'Alt', 'Shift', 'Meta'].includes(k)) return ''; return [e.ctrlKey || e.metaKey ? 'Ctrl' : '', e.altKey ? 'Alt' : '', e.shiftKey ? 'Shift' : '', k === ' ' ? 'Space' : k].filter(Boolean).join('+'); }
  };
  const kw = w => w && !w.classList.contains('minimized');
  KEYS.register('search', 'Búsqueda global', 'Ctrl+K', () => K.search.toggle());
  KEYS.register('overview', 'Vista general (ventanas y escritorios)', 'Ctrl+Alt+ArrowUp', () => K.overview.toggle());
  KEYS.register('showdesk', 'Mostrar el escritorio', 'Ctrl+Alt+ArrowDown', () => { const open = D.winsOn(D.cur).filter(kw); open.forEach(w => w.classList.add('minimized')); E.updateTaskbarButtons(); });
  KEYS.register('deskprev', 'Escritorio anterior', 'Ctrl+Alt+ArrowLeft', () => D.go(D.cur - 1), 'Escritorios');
  KEYS.register('desknext', 'Escritorio siguiente', 'Ctrl+Alt+ArrowRight', () => D.go(D.cur + 1), 'Escritorios');
  KEYS.register('movel', 'Mover ventana al escritorio anterior', 'Ctrl+Alt+Shift+ArrowLeft', () => { const w = activeWin(); if (w && D.cur > 1) { D.move(w, D.cur - 1); D.go(D.cur - 1, true); } }, 'Escritorios');
  KEYS.register('mover', 'Mover ventana al escritorio siguiente', 'Ctrl+Alt+Shift+ArrowRight', () => { const w = activeWin(); if (w) { if (D.cur === D.count) D.add(); else { D.move(w, D.cur + 1); D.go(D.cur + 1, true); } } }, 'Escritorios');
  KEYS.register('snapl', 'Ajustar ventana a la izquierda', 'Alt+Shift+ArrowLeft', () => { const w = activeWin(); if (w) { w.classList.remove('maximized'); E.snapWindow(w, 'left'); } }, 'Ventanas');
  KEYS.register('snapr', 'Ajustar ventana a la derecha', 'Alt+Shift+ArrowRight', () => { const w = activeWin(); if (w) { w.classList.remove('maximized'); E.snapWindow(w, 'right'); } }, 'Ventanas');
  KEYS.register('max', 'Maximizar / restaurar ventana', 'Alt+Shift+ArrowUp', () => { const w = activeWin(); if (w) maxToggle(w); }, 'Ventanas');
  KEYS.register('min', 'Minimizar ventana', 'Alt+Shift+ArrowDown', () => { const w = activeWin(); if (w) { w.classList.add('minimized'); E.updateTaskbarButtons(); } }, 'Ventanas');
  KEYS.register('close', 'Cerrar ventana', 'Alt+Shift+Q', () => { const w = activeWin(); if (w) w.querySelector('[data-act="close"]').click(); }, 'Ventanas');
  KEYS.register('notif', 'Centro de notificaciones', 'Ctrl+Alt+N', () => NC.toggle());
  KEYS.register('quick', 'Accesos rápidos', 'Ctrl+Alt+A', () => { E.closeFlyouts(); $('#action-center').classList.toggle('open'); });
  KEYS.register('settings', 'Configuración', 'Ctrl+Alt+S', () => E.launch('settings'));
  KEYS.register('files', 'Archivos', 'Ctrl+Alt+E', () => E.launch('explorer'));
  KEYS.register('term', 'Terminal', 'Ctrl+Alt+T', () => E.launch('terminal'));
  KEYS.register('focus', 'Modo concentración', 'Ctrl+Alt+F', () => K.focus.active() ? K.focus.stop() : K.focus.start(25));
  KEYS.register('help', 'Ayuda (EISENKU OS Handbook)', 'F1', () => K.help && K.help(K.activeApp()));
  KEYS.register('lowpower', 'Modo de bajo consumo', 'Ctrl+Alt+B', () => K.setLowPower(!S.get('os9_lowpower', false)));
  window.addEventListener('keydown', e => {
    if (e.defaultPrevented || $('#s9-login') || (e.target.closest && e.target.closest('[data-keytest]'))) return;   // 10.0: el probador de teclado recibe todas las teclas
    const c = KEYS.combo(e); if (!c) return;
    const typing = e.target.matches && e.target.matches('input,textarea,select,[contenteditable],[contenteditable] *');
    if (typing && !/^(Ctrl|Alt)/.test(c) && c !== 'F1') return;
    const m = KEYS.map(), d = KEYS.defs.find(x => m[x.id] && m[x.id] === c);
    if (!d) return;
    e.preventDefault(); e.stopImmediatePropagation(); try { d.run(); } catch (er) { console.error(er); }
  }, true);

  /* ================= 6. Barra de tareas (Windows) y panel (Linux) ================= */
  const center = $('#taskbar-center'), srch = center && center.querySelector('.tb-search');
  const tv = K.ui.el('button', { class: 'tb-btn', id: 's9-taskview', title: tr('Vista de tareas y escritorios') + ' (Ctrl+Alt+↑)', 'aria-label': tr('Vista de tareas') }, I('layers', 20));
  const wb = K.ui.el('button', { class: 'tb-btn', id: 's9-widgets-btn', title: tr('Widgets'), 'aria-label': tr('Widgets') }, I('widgets', 20));
  tv.style.fontSize = wb.style.fontSize = '';
  if (srch) srch.after(tv, wb); else if (center) center.prepend(tv, wb);
  tv.onclick = e => { e.stopPropagation(); K.overview.toggle(); };
  wb.onclick = e => { e.stopPropagation(); W.panelToggle(); };
  const focusPill = K.ui.el('button', { id: 's9-focus-pill', title: tr('Modo concentración: pulsa para terminar') }, '');
  $('#taskbar-right').prepend(focusPill);
  focusPill.onclick = () => K.focus.stop();
  const clock = $('#systray-clock'); if (clock) { clock.title = tr('Notificaciones y calendario') + ' (Ctrl+Alt+N)'; clock.addEventListener('click', e => { e.stopPropagation(); NC.toggle(); }); }
  // Panel Linux: indicador de escritorios, búsqueda, menú de aplicaciones por categorías
  const panel = $('#lx-panel');
  const ws = K.ui.el('span', { id: 's9-ws', title: tr('Escritorios virtuales') });
  if (panel) {
    panel.querySelector('.lx-left').appendChild(ws);
    const sb = K.ui.el('button', { class: 'lx-btn', title: tr('Buscar') + ' (Ctrl+K)', 'aria-label': tr('Buscar') }, I('search', 15));
    sb.onclick = e => { e.stopPropagation(); K.search.open(); };
    panel.querySelector('.lx-right').prepend(sb);
    panel.addEventListener('click', e => {
      const b = e.target.closest('[data-lx]'); if (!b) return; const k = b.dataset.lx;
      if (k === 'act') { e.stopImmediatePropagation(); K.overview.toggle(); }
      else if (k === 'apps') { e.stopImmediatePropagation(); AM.toggle(); }
      else if (k === 'cal') { e.stopImmediatePropagation(); NC.toggle(); }
    }, true);
  }
  function renderWs() { ws.innerHTML = Array.from({ length: D.count }, (_, i) => `<i class="${i + 1 === D.cur ? 'on' : ''}" data-ws="${i + 1}" title="${esc(D.name(i + 1))}"></i>`).join(''); }
  ws.addEventListener('click', e => { const i = e.target.closest('[data-ws]'); if (i) { e.stopPropagation(); D.go(+i.dataset.ws); } });
  renderWs();
  // borde inferior para mostrar el dock oculto automáticamente
  const edge = K.ui.el('div', { id: 's9-dock-edge' }); document.body.appendChild(edge);
  edge.addEventListener('pointerenter', () => { html.classList.add('s9-dock-peek'); clearTimeout(edge._t); edge._t = setTimeout(() => html.classList.remove('s9-dock-peek'), 2500); });

  /* ================= 7. Menú de aplicaciones por categorías (Linux) ================= */
  const AM = (() => {
    const el = K.ui.el('div', { id: 's9-appmenu', role: 'menu' }); el.hidden = true; document.body.appendChild(el);
    let cat = 'fav';
    const catOf = a => a.game ? 'Juegos' : (a.cat === 'Ciencia' ? 'Educación' : a.cat || 'Sistema');
    function render() {
      const all = E.installedApps().filter(a => a.id !== 'deskfolder');
      const cats = [...new Set(all.map(catOf))].sort();
      const favs = (S.get('pinned', []) || []).map(appOf).filter(Boolean);
      const list = cat === 'fav' ? favs : cat === 'recent' ? (S.get('recent_apps', []) || []).map(appOf).filter(Boolean) : all.filter(a => catOf(a) === cat).sort((a, b) => a.name.localeCompare(b.name));
      el.innerHTML = `<nav><button data-c="fav" class="${cat === 'fav' ? 'on' : ''}">${I('star', 15)} ${esc(tr('Favoritos'))}</button><button data-c="recent" class="${cat === 'recent' ? 'on' : ''}">${I('history', 15)} ${esc(tr('Recientes'))}</button>${cats.map(c => `<button data-c="${esc(c)}" class="${cat === c ? 'on' : ''}">${esc(tr((E.CATS[c] || {}).label || c))}</button>`).join('')}<button data-all>${I('grid', 15)} ${esc(tr('Todas las apps'))}</button></nav><div class="s9-am-list">${list.map(a => `<button data-a="${esc(a.id)}">${E.tile(a, 30)}<span><b>${esc(a.name)}</b><small>${esc(a.desc || '')}</small></span></button>`).join('') || `<p class="eis-muted" style="padding:12px">${esc(tr('Sin aplicaciones'))}</p>`}</div>`;
    }
    el.addEventListener('click', e => {
      const c = e.target.closest('[data-c]'); if (c) { cat = c.dataset.c; render(); return; }
      if (e.target.closest('[data-all]')) { close(); E.openLauncher && E.openLauncher(); return; }
      const a = e.target.closest('[data-a]'); if (a) { close(); E.launch(a.dataset.a); }
    });
    el.addEventListener('pointerenter', e => { const c = e.target.closest && e.target.closest('[data-c]'); if (c && c.dataset.c !== cat) { cat = c.dataset.c; render(); } }, true);
    const close = () => { el.hidden = true; };
    window.addEventListener('pointerdown', e => { if (!el.hidden && !e.target.closest('#s9-appmenu,[data-lx="apps"]')) close(); }, true);
    return { toggle() { if (el.hidden) { E.closeFlyouts(); render(); el.hidden = false; } else close(); }, close };
  })();

  /* ================= 8. Vista general (Actividades / Vista de tareas) ================= */
  K.overview = (() => {
    const el = K.ui.el('div', { id: 's9-overview', role: 'dialog', 'aria-label': tr('Vista general') }); el.hidden = true; document.body.appendChild(el);
    let drag = null;
    function render() {
      const wins = $$('.window.open');
      el.innerHTML = `<div style="display:flex;justify-content:center"><input class="input-text" data-q placeholder="${esc(tr('Escribe para buscar aplicaciones, archivos y ajustes…'))}" style="width:min(520px,90vw);padding:11px 16px;border-radius:99px;font-size:15px;background:rgba(255,255,255,.08);color:#fff;border-color:rgba(255,255,255,.18)"></div>
        <div class="s9-ov-desks">${Array.from({ length: D.count }, (_, i) => i + 1).map(n => `<button class="s9-ov-desk${n === D.cur ? ' on' : ''}" data-desk="${n}"><b>${esc(D.name(n))}</b><small>${D.winsOn(n).length} ${esc(tr('ventanas'))}</small>${D.count > 1 ? `<span data-deldesk="${n}" title="${esc(tr('Eliminar escritorio'))}" style="float:right;opacity:.6">✕</span>` : ''}</button>`).join('')}<button class="s9-ov-desk" data-adddesk style="text-align:center">${I('plus', 18)}<small>${esc(tr('Nuevo escritorio'))}</small></button></div>
        <h4 style="text-align:center;font-weight:600;opacity:.8">${esc(D.name(D.cur))}</h4>
        <div class="s9-ov-wins">${wins.filter(w => (+w.dataset.desk || D.cur) === D.cur).map(w => { const id = w.id.slice(4), a = appOf(id) || { name: id }; return `<div class="s9-ov-win" draggable="true" data-win="${esc(id)}" tabindex="0">${E.tile(a, 34)}<div style="min-width:0"><b>${esc(a.name)}</b><small>${w.classList.contains('minimized') ? esc(tr('Minimizada')) : esc(tr('Abierta'))}</small></div><button data-closewin="${esc(id)}" title="${esc(tr('Cerrar'))}" style="margin-left:auto;color:#fff;opacity:.6">✕</button></div>`; }).join('') || `<p style="text-align:center;opacity:.6;grid-column:1/-1">${esc(tr('No hay ventanas abiertas en este escritorio. Arrastra ventanas aquí o abre una app.'))}</p>`}</div>`;
      const q = el.querySelector('[data-q]');
      q.oninput = () => { if (q.value.trim()) { close(); K.search.open(q.value); } };
      setTimeout(() => q.focus(), 40);
    }
    el.addEventListener('click', e => {
      const t = e.target;
      const dd = t.closest('[data-deldesk]'); if (dd) { e.stopPropagation(); D.remove(+dd.dataset.deldesk); render(); return; }
      if (t.closest('[data-adddesk]')) { D.add(); render(); return; }
      const dk = t.closest('[data-desk]'); if (dk) { D.go(+dk.dataset.desk, true); render(); return; }
      const cw = t.closest('[data-closewin]'); if (cw) { e.stopPropagation(); const w = winOf(cw.dataset.closewin); if (w) w.querySelector('[data-act="close"]').click(); render(); return; }
      const w = t.closest('[data-win]'); if (w) { close(); E.openWindow(w.dataset.win); return; }
      if (t === el || t.classList.contains('s9-ov-wins')) close();
    });
    el.addEventListener('dragstart', e => { const w = e.target.closest('[data-win]'); if (w) { drag = w.dataset.win; e.dataTransfer.setData('text/plain', drag); } });
    el.addEventListener('dragover', e => { const d = e.target.closest('[data-desk]'); if (d && drag) { e.preventDefault(); d.classList.add('drop'); } });
    el.addEventListener('dragleave', e => { const d = e.target.closest('[data-desk]'); if (d) d.classList.remove('drop'); });
    el.addEventListener('drop', e => { const d = e.target.closest('[data-desk]'); if (d && drag) { e.preventDefault(); D.move(winOf(drag), +d.dataset.desk); drag = null; render(); } });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') close(); if (e.key === 'Enter' && e.target.matches('[data-win]')) { close(); E.openWindow(e.target.dataset.win); } });
    const close = () => { el.hidden = true; };
    return { open() { E.closeFlyouts(); render(); el.hidden = false; }, close, toggle() { el.hidden ? this.open() : close(); } };
  })();

  /* ================= 9. Centro de notificaciones (y calendario) ================= */
  const NC = K.nc = (() => {
    const el = K.ui.el('div', { id: 's9-nc', role: 'dialog', 'aria-label': tr('Centro de notificaciones') }); document.body.appendChild(el);
    let month = new Date();
    function render() {
      const log = S.get('notif_log', []) || [], groups = {};
      log.forEach((n, i) => { const k = n.app || 'system'; (groups[k] = groups[k] || []).push(Object.assign({ i }, n)); });
      const dnd = !!S.get('dnd', false);
      const y = month.getFullYear(), m = month.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), today = new Date();
      const evs = S.get('events', []) || [], key = d => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const tk = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todayEv = evs.filter(e => e.d === tk).sort((a, b) => (a.h || '').localeCompare(b.h || ''));
      const wd = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(K.locale, { weekday: 'narrow' }));
      el.innerHTML = `<div class="s9-panel"><div class="s9-nc-h">${I('bell', 16)}<b>${esc(tr('Notificaciones'))}</b><label class="k9-row k9-small k9-muted" title="${esc(tr('No molestar'))}">${esc(tr('No molestar'))} <input type="checkbox" class="k9-switch" data-dnd ${dnd ? 'checked' : ''}></label><button class="k9-btn" data-clear>${esc(tr('Borrar todo'))}</button></div>
        ${Object.keys(groups).length ? Object.entries(groups).map(([k, l]) => { const a = appOf(k) || { name: k === 'system' || k === 'desktop' ? 'EISENKU OS' : k, icon: '◆' }; return `<div class="s9-ng"><h5>${E.tile(a, 16, 'mini')} ${esc(a.name)} <button class="k9-btn k9-small" data-mute="${esc(k)}" style="margin-left:auto;padding:2px 6px" title="${esc(tr('Silenciar esta app'))}">${(S.get('os9_mute', []) || []).includes(k) ? '🔕' : '🔔'}</button></h5>${l.slice(0, 6).map(n => `<div class="s9-n"><span style="font-size:18px">${esc(n.icon || '🔔')}</span><div style="min-width:0"><b>${esc(n.title)}</b><p>${esc(n.body || '')}</p><small>${esc(K.fmt.rel(n.d))}</small></div><button class="x" data-del="${n.i}" aria-label="${esc(tr('Descartar'))}">✕</button></div>`).join('')}</div>`; }).join('') : `<div class="k9-state" style="min-height:120px">${I('bell', 28)}<p>${esc(tr('No hay notificaciones nuevas'))}</p></div>`}</div>
        <div class="s9-panel" style="flex:0 0 auto"><div class="s9-nc-h"><button class="k9-btn" data-mprev aria-label="${esc(tr('Mes anterior'))}">${I('left', 14)}</button><b style="text-align:center">${esc(month.toLocaleDateString(K.locale, { month: 'long', year: 'numeric' }))}</b><button class="k9-btn" data-mnext aria-label="${esc(tr('Mes siguiente'))}">${I('right', 14)}</button></div>
        <div class="s9-cal">${wd.map(x => `<i>${esc(x)}</i>`).join('')}${'<span></span>'.repeat(first)}${Array.from({ length: days }, (_, i) => `<span class="${y === today.getFullYear() && m === today.getMonth() && i + 1 === today.getDate() ? 'on' : ''}${evs.some(e => e.d === key(i + 1)) ? ' ev' : ''}">${i + 1}</span>`).join('')}</div>
        <div style="margin-top:10px;font-size:12px"><b>${esc(tr('Hoy'))}</b>${todayEv.map(e => `<p style="margin-top:4px">• ${esc(e.h || '')} ${esc(e.t)}</p>`).join('') || `<p class="eis-muted" style="margin-top:4px">${esc(tr('Sin eventos'))}</p>`}<div class="k9-row" style="margin-top:8px"><button class="k9-btn" data-cal>${I('calendar', 14)} ${esc(tr('Abrir Calendario'))}</button><button class="k9-btn" data-focus>${I('target', 14)} ${esc(tr('Concentración'))}</button></div></div></div>`;
    }
    el.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('[data-clear]')) { S.set('notif_log', []); render(); document.dispatchEvent(new CustomEvent('eisen:notify')); return; }
      const d = t.closest('[data-del]'); if (d) { const l = S.get('notif_log', []); l.splice(+d.dataset.del, 1); S.set('notif_log', l); render(); return; }
      const mu = t.closest('[data-mute]'); if (mu) { const l = S.get('os9_mute', []) || [], k = mu.dataset.mute, i = l.indexOf(k); if (i >= 0) l.splice(i, 1); else l.push(k); S.set('os9_mute', l); render(); return; }
      if (t.closest('[data-mprev]')) { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); render(); return; }
      if (t.closest('[data-mnext]')) { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); render(); return; }
      if (t.closest('[data-cal]')) { close(); E.launch('calendar'); return; }
      if (t.closest('[data-focus]')) { close(); K.focus.dialog(); }
    });
    el.addEventListener('change', e => { if (e.target.matches('[data-dnd]')) { S.set('dnd', e.target.checked); html.classList.toggle('dnd', e.target.checked); const qb = $('#qt-bt'); if (qb) qb.classList.toggle('active', e.target.checked); } });
    const close = () => el.classList.remove('open');
    window.addEventListener('pointerdown', e => { if (el.classList.contains('open') && !e.target.closest('#s9-nc,#systray-clock,[data-lx="cal"],#context-menu,.eis-modal')) close(); }, true);
    document.addEventListener('eisen:notify', () => { if (el.classList.contains('open')) render(); });
    return { open() { E.closeFlyouts(); month = new Date(); render(); el.classList.add('open'); }, close, toggle() { el.classList.contains('open') ? close() : this.open(); }, render };
  })();
  const closeFly0 = E.closeFlyouts;
  E.closeFlyouts = () => { closeFly0(); const keep = lastDown && lastDown.closest && lastDown.closest('#s9-nc,#systray-clock,#s9-wpanel,#s9-widgets-btn'); if (!keep) { NC.close(); W.panelClose(); } AM.close(); };

  /* ================= 10. Accesos rápidos adicionales ================= */
  const tiles = $('#action-center .quick-tiles-grid');
  if (tiles) {
    tiles.insertAdjacentHTML('beforeend', `<button class="quick-tile" id="qt-focus"><span class="qt-icon">${I('target', 18)}</span><span>${esc(tr('Concentración'))}</span></button><button class="quick-tile" id="qt-night"><span class="qt-icon">${I('moon', 18)}</span><span>${esc(tr('Luz nocturna'))}</span></button><button class="quick-tile" id="qt-eco"><span class="qt-icon">${I('leaf', 18)}</span><span>${esc(tr('Bajo consumo'))}</span></button><button class="quick-tile" id="qt-a11y"><span class="qt-icon">${I('contrast', 18)}</span><span>${esc(tr('Alto contraste'))}</span></button><button class="quick-tile" id="qt-lock"><span class="qt-icon">${I('lock', 18)}</span><span>${esc(tr('Bloquear'))}</span></button><button class="quick-tile" id="qt-ov"><span class="qt-icon">${I('layers', 18)}</span><span>${esc(tr('Escritorios'))}</span></button>`);
    const sync = () => { $('#qt-focus').classList.toggle('active', K.focus.active()); $('#qt-night').classList.toggle('active', +K.pref('nightLight') > 0); $('#qt-eco').classList.toggle('active', !!S.get('os9_lowpower', false)); $('#qt-a11y').classList.toggle('active', !!K.pref('contrast')); };
    $('#qt-focus').onclick = () => { E.closeFlyouts(); K.focus.active() ? K.focus.stop() : K.focus.dialog(); };
    $('#qt-night').onclick = () => { K.pref('nightLight', +K.pref('nightLight') > 0 ? 0 : .28); sync(); };
    $('#qt-eco').onclick = () => { K.setLowPower(!S.get('os9_lowpower', false)); sync(); };
    $('#qt-a11y').onclick = () => { K.pref('contrast', !K.pref('contrast')); sync(); };
    $('#qt-lock').onclick = () => { E.closeFlyouts(); E.lock9(); };
    $('#qt-ov').onclick = () => { E.closeFlyouts(); K.overview.open(); };
    $('#systray-quick-btn').addEventListener('click', sync); K.on('focus', sync); K.on('pref', sync);
  }

  /* ================= 11. Búsqueda global ================= */
  K.search = (() => {
    const providers = [];
    const el = K.ui.el('div', { id: 's9-search', role: 'dialog', 'aria-label': tr('Búsqueda global') }); el.hidden = true; document.body.appendChild(el);
    el.innerHTML = `<div class="s9-panel s9-sbox"><header>${I('search', 20)}<input data-q autocomplete="off" spellcheck="false" placeholder="${esc(tr('Busca apps, ajustes, archivos, ayuda o la web…'))}" aria-label="${esc(tr('Buscar'))}"><kbd>Esc</kbd></header><div class="s9-sres" data-r role="listbox"></div><footer><span><kbd>↑</kbd><kbd>↓</kbd> ${esc(tr('navegar'))}</span><span><kbd>Enter</kbd> ${esc(tr('abrir'))}</span><span><kbd>Ctrl</kbd>+<kbd>K</kbd> ${esc(tr('abrir/cerrar'))}</span></footer></div>`;
    const q = el.querySelector('[data-q]'), R = el.querySelector('[data-r]');
    let items = [], sel = 0, tok = 0;
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    K.norm = norm;
    async function run() {
      const text = q.value.trim(), n = norm(text), my = ++tok;
      if (!n) { items = []; R.innerHTML = `<h6>${esc(tr('Sugerencias'))}</h6>` + ['explorer', 'browser', 'settings', 'appcenter', 'handbook', 'terminal'].map(appOf).filter(Boolean).map((a, i) => `<button data-i="s${i}">${E.tile(a, 26)}<span>${esc(a.name)}</span><small>${esc(a.desc || '')}</small></button>`).join(''); items = ['explorer', 'browser', 'settings', 'appcenter', 'handbook', 'terminal'].filter(appOf).map(id => ({ run: () => E.launch(id) })); R.querySelectorAll('[data-i]').forEach((b, i) => b.dataset.i = i); sel = 0; mark(); return; }
      const groups = [];
      for (const p of providers) { try { const r = await p.fn(n, text); if (my !== tok) return; if (r && r.length) groups.push([p.name, r.slice(0, p.max || 6)]); } catch (e) { console.error(e); } }
      groups.push([tr('Más'), [{ icon: I('globe', 18), title: tr('Buscar en la web') + ': ' + text, run: () => E.ebOpenUrl(text, true) }, { icon: '✦', title: tr('Preguntar a Domingo') + ': ' + text, run: () => E.domingo(text) }, { icon: I('help', 18), title: tr('Buscar en el Handbook') + ': ' + text, run: () => K.help && K.help(null, text) }]]);
      items = []; R.innerHTML = groups.map(([g, l]) => `<h6>${esc(g)}</h6>` + l.map(it => { items.push(it); return `<button data-i="${items.length - 1}" role="option">${typeof it.icon === 'string' && it.icon.startsWith('<') ? it.icon : `<span style="width:26px;text-align:center;font-size:18px">${esc(it.icon || '•')}</span>`}<span>${esc(it.title)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</button>`; }).join('')).join('');
      sel = 0; mark();
    }
    const mark = () => { R.querySelectorAll('[data-i]').forEach(b => b.classList.toggle('sel', +b.dataset.i === sel)); const b = R.querySelector('.sel'); if (b) b.scrollIntoView({ block: 'nearest' }); };
    const go = i => { const it = items[i]; if (!it) return; close(); setTimeout(() => it.run(), 10); K.activity('search', 'search', q.value); };
    let deb; q.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(run, 90); });
    q.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); go(sel); }
      else if (e.key === 'Escape') close();
    });
    R.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) go(+b.dataset.i); });
    el.addEventListener('pointerdown', e => { if (e.target === el) close(); });
    const close = () => { el.hidden = true; };
    const api = {
      register(name, fn, max) { providers.push({ name, fn, max }); },
      open(text = '') { E.closeFlyouts(); el.hidden = false; q.value = text; run(); setTimeout(() => { q.focus(); q.select(); }, 30); },
      close, toggle() { el.hidden ? api.open() : close(); }
    };
    return api;
  })();
  // proveedores básicos: apps, comandos, archivos, navegador
  K.search.register(tr('Aplicaciones'), n => E.apps().filter(a => a.id !== 'deskfolder' && K.norm(a.name + ' ' + (a.desc || '') + ' ' + (a.kw || (E.REG[a.id] || {}).kw || '')).includes(n))
    .sort((a, b) => (K.norm(b.name).startsWith(n) ? 1 : 0) - (K.norm(a.name).startsWith(n) ? 1 : 0) || (E.isInstalled(b.id) ? 1 : 0) - (E.isInstalled(a.id) ? 1 : 0))
    .map(a => ({ icon: E.tile(a, 26), title: a.name, sub: E.isInstalled(a.id) ? (a.desc || '') : tr('No instalada · abrir en el App Center'), run: () => E.isInstalled(a.id) ? E.launch(a.id) : (E.storeShow ? E.storeShow(a.id) : E.launch('appcenter')) })), 7);
  const CMDS = [
    ['Cambiar a modo Linux', '🐧', () => E.setEnv('linux')], ['Cambiar a modo Windows', '🪟', () => E.setEnv('windows')], ['Bloquear pantalla', '🔒', () => E.lock9()],
    ['Modo concentración (25 min)', '🎯', () => K.focus.start(25)], ['Activar/desactivar bajo consumo', '🍃', () => K.setLowPower(!S.get('os9_lowpower', false))],
    ['Tema claro / oscuro', '🌓', () => $('#qt-dark').click()], ['Vista general de escritorios', '🗂️', () => K.overview.open()], ['Nuevo escritorio virtual', '➕', () => D.add()],
    ['Centro de notificaciones', '🔔', () => NC.open()], ['Mostrar el escritorio', '🖥️', () => KEYS.defs.find(d => d.id === 'showdesk').run()], ['Crear copia de seguridad', '💾', () => E.launch('settings', 'backup')],
    ['Comprobar actualizaciones', '⬆️', () => E.launch('updates')], ['Cambiar de usuario', '👤', () => K.login.show('switch')], ['Reiniciar la interfaz', '↻', () => location.reload()]
  ];
  K.search.register(tr('Acciones'), n => CMDS.filter(c => K.norm(tr(c[0])).includes(n) || K.norm(c[0]).includes(n)).map(c => ({ icon: c[1], title: tr(c[0]), run: c[2] })), 5);
  K.search.register(tr('Archivos'), async n => { let all = []; try { all = await E.vaultAll(); } catch { all = []; } return all.filter(f => !f.trash && K.norm(f.name).includes(n)).slice(0, 6).map(f => ({ icon: /^image/.test(f.type) ? '🖼️' : /^audio/.test(f.type) ? '🎵' : /^video/.test(f.type) ? '🎬' : '📄', title: f.name, sub: (f.folder || '') + ' · ' + K.fmt.bytes(f.size), run: () => (K.files ? K.files.open(f.id) : E.vaultOpen(f.id)) })); });
  K.search.register(tr('Navegador'), n => { const m = (S.get('browser_bookmarks', []) || []).filter(x => K.norm(x.t + ' ' + x.u).includes(n)).slice(0, 3).map(x => ({ icon: '⭐', title: x.t, sub: x.u, run: () => E.ebOpenUrl(x.u, true) })); const h = (S.get('browser_history', []) || []).filter(x => K.norm(x.t + ' ' + x.u).includes(n)).slice(0, 3).map(x => ({ icon: '🕘', title: x.t, sub: x.u, run: () => E.ebOpenUrl(x.u, true) })); return m.concat(h); });

  /* ================= 12. Widgets ================= */
  const W = K.widgets = (() => {
    const REG = {};
    const layer = K.ui.el('div', { id: 's9-widgets', 'aria-label': tr('Widgets del escritorio') });
    $('#desktop-viewport').appendChild(layer);
    const panelEl = K.ui.el('div', { id: 's9-wpanel', role: 'dialog', 'aria-label': tr('Widgets') }); document.body.appendChild(panelEl);
    const chosen = () => { const v = S.get('os9_widgets', null); return Array.isArray(v) ? v : ['clock', 'agenda']; };
    const timers = new Set();
    function card(id, where) {
      const w = REG[id]; if (!w) return null;
      const c = K.ui.el('div', { class: 's9-w s9-w-' + id, 'data-w': id });
      c.innerHTML = `<h6>${w.icon} ${esc(tr(w.name))}</h6>${where === 'desk' ? `<button class="x" data-wx="${id}" title="${esc(tr('Quitar widget'))}">✕</button>` : ''}<div data-wb></div>`;
      const body = c.querySelector('[data-wb]'); const draw = () => { try { w.render(body); } catch (e) { body.textContent = '—'; } }; draw();
      if (w.every) { const t = setInterval(() => { if (!document.body.contains(c)) { clearInterval(t); timers.delete(t); return; } if (!document.hidden && !html.classList.contains('low-power')) draw(); }, w.every); timers.add(t); }
      return c;
    }
    function renderDesk() {
      timers.forEach(t => clearInterval(t)); timers.clear();
      layer.innerHTML = ''; layer.hidden = !K.pref('showWidgets');
      if (layer.hidden) return;
      chosen().forEach(id => { const c = card(id, 'desk'); if (c) layer.appendChild(c); });
    }
    function renderPanel() {
      panelEl.innerHTML = `<div class="s9-panel" style="padding:12px 14px"><div class="s9-nc-h">${I('widgets', 16)}<b>${esc(tr('Widgets'))}</b><button class="k9-btn" data-wcfg>${esc(tr('Personalizar'))}</button></div></div>`;
      Object.keys(REG).forEach(id => { const c = card(id, 'panel'); if (c) panelEl.appendChild(c); });
    }
    layer.addEventListener('click', e => { const x = e.target.closest('[data-wx]'); if (x) { S.set('os9_widgets', chosen().filter(i => i !== x.dataset.wx)); renderDesk(); } });
    panelEl.addEventListener('click', e => { if (e.target.closest('[data-wcfg]')) { api.panelClose(); api.customize(); } });
    window.addEventListener('pointerdown', e => { if (panelEl.classList.contains('open') && !e.target.closest('#s9-wpanel,#s9-widgets-btn,#taskbar-left,.eis-modal')) api.panelClose(); }, true);
    const api = {
      register(id, def) { REG[id] = def; },
      all: () => REG, render: renderDesk,
      panelToggle() { if (panelEl.classList.contains('open')) api.panelClose(); else { E.closeFlyouts(); renderPanel(); panelEl.classList.add('open'); } },
      panelClose() { panelEl.classList.remove('open'); },
      customize: null
    };
    // personalización con lectura directa del formulario (E.form solo devuelve campos de texto declarados)
    api.customize = () => new Promise(res => {
      const cur = chosen(), ov = document.createElement('div'); ov.className = 'eis-modal';
      ov.innerHTML = `<form class="eis-modal-card"><h3>${esc(tr('Widgets del escritorio'))}</h3><p class="eis-muted" style="font-size:12px">${esc(tr('Elige qué widgets se muestran sobre el fondo de pantalla.'))}</p>${Object.entries(REG).map(([id, w]) => `<label class="ap-check-l" style="display:flex;gap:8px;padding:4px 0"><input type="checkbox" name="${id}" ${cur.includes(id) ? 'checked' : ''}> ${w.icon} ${esc(tr(w.name))}</label>`).join('')}<label class="ap-check-l" style="display:flex;gap:8px;padding-top:8px;border-top:1px solid var(--e9-line)"><input type="checkbox" name="__show" ${K.pref('showWidgets') ? 'checked' : ''}> ${esc(tr('Mostrar widgets en el escritorio'))}</label><div class="eis-modal-btns"><button type="button" class="btn-secondary" data-x>${esc(tr('Cancelar'))}</button><button class="btn-primary">${esc(tr('Guardar'))}</button></div></form>`;
      document.body.appendChild(ov);
      const f = ov.querySelector('form'), done = v => { ov.remove(); res(v); };
      f.onsubmit = e => { e.preventDefault(); S.set('os9_widgets', Object.keys(REG).filter(id => f.elements[id] && f.elements[id].checked)); K.pref('showWidgets', f.elements.__show.checked); renderDesk(); done(true); };
      ov.querySelector('[data-x]').onclick = () => done(false);
      ov.addEventListener('pointerdown', e => { if (e.target === ov) done(false); });
    });
    return api;
  })();
  const pad = n => String(n).padStart(2, '0');
  const todayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  W.register('clock', { name: 'Reloj', icon: '🕒', every: 1000, render(b) { const d = new Date(); b.innerHTML = `<div class="s9-w-clock"><b>${esc(d.toLocaleTimeString(K.locale, { hour: '2-digit', minute: '2-digit' }))}</b><span>${esc(d.toLocaleDateString(K.locale, { weekday: 'long', day: 'numeric', month: 'long' }))}</span></div>`; } });
  W.register('agenda', { name: 'Agenda de hoy', icon: '📅', every: 60000, render(b) { const evs = (S.get('events', []) || []).filter(e => e.d === todayKey()).sort((a, c) => (a.h || '').localeCompare(c.h || '')); const tasks = (S.get('tasks', []) || []).filter(t => t && !t.done).slice(0, 4); b.innerHTML = `<ul>${evs.map(e => `<li><small>${esc(e.h || tr('Todo el día'))}</small> ${esc(e.t)}</li>`).join('') || `<li class="eis-muted">${esc(tr('Sin eventos hoy'))}</li>`}</ul>${tasks.length ? `<h6 style="margin-top:8px">✅ ${esc(tr('Tareas pendientes'))}</h6><ul>${tasks.map(t => `<li>• ${esc(t.t || t.text || t.title || '')}</li>`).join('')}</ul>` : ''}`; } });
  W.register('weather', { name: 'Clima', icon: '⛅', every: 1800000, render(b) { const loc = S.get('weather_loc', null); if (!loc || !E.weatherNow) { b.innerHTML = `<p class="eis-muted" style="font-size:12px">${esc(tr('Elige tu ciudad en la app Clima.'))}</p>`; return; } b.textContent = '…'; E.weatherNow(loc).then(j => { const w = E.wmo(j.current.weather_code); b.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><span style="font-size:30px">${esc(w[0])}</span><div><b style="font-size:22px">${Math.round(j.current.temperature_2m)}°C</b><div class="eis-muted" style="font-size:12px">${esc(loc.name.split(',')[0])} · ${esc(tr(w[1]))}</div></div></div>`; }).catch(() => { b.innerHTML = `<p class="eis-muted" style="font-size:12px">${esc(tr('Sin conexión con el servicio del clima.'))}</p>`; }); } });
  W.register('system', { name: 'Sistema', icon: '📟', every: 5000, render(b) { const open = $$('.window.open').length; const mem = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + ' MB' : '—'; b.innerHTML = `<ul><li><small>${esc(tr('Ventanas'))}</small> ${open}</li><li><small>${esc(tr('Memoria JS'))}</small> ${mem}</li><li><small>${esc(tr('Red'))}</small> ${navigator.onLine ? esc(tr('En línea')) : esc(tr('Sin conexión'))}</li><li><small>${esc(tr('Escritorio'))}</small> ${esc(D.name(D.cur))}</li></ul><div data-st class="k9-meter" style="margin-top:8px" title="${esc(tr('Almacenamiento'))}"><i style="width:0"></i></div>`; if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => { const m = b.querySelector('[data-st] i'); if (m && e.quota) m.style.width = Math.min(100, e.usage / e.quota * 100).toFixed(1) + '%'; }); } });
  W.register('notes', { name: 'Última nota', icon: '🗒️', every: 30000, render(b) { const n = (S.get('notes', []) || [])[0]; b.innerHTML = n ? `<b style="font-size:13px">${esc(n.title || n.t || tr('Nota'))}</b><p class="eis-muted" style="font-size:12px;margin-top:4px;max-height:60px;overflow:hidden">${esc(String(n.body || n.text || n.b || '').slice(0, 160))}</p>` : `<p class="eis-muted" style="font-size:12px">${esc(tr('Aún no tienes notas.'))}</p>`; b.onclick = () => E.launch('notes'); b.style.cursor = 'pointer'; } });
  W.register('focus', { name: 'Concentración', icon: '🎯', every: 1000, render(b) { const f = K.focus.state(); b.innerHTML = f ? `<b style="font-size:24px">${esc(K.focus.left())}</b><div class="k9-row" style="margin-top:6px"><button class="k9-btn" data-fstop>${esc(tr('Terminar'))}</button></div>` : `<div class="k9-row"><button class="k9-btn pri" data-f25>25 min</button><button class="k9-btn" data-f50>50 min</button></div><p class="eis-muted k9-small" style="margin-top:6px">${esc(tr('Hoy'))}: ${(S.get('os9_focus_stats', {}) || {})[todayKey()] || 0} ${esc(tr('sesiones'))}</p>`; b.onclick = e => { if (e.target.closest('[data-f25]')) K.focus.start(25); if (e.target.closest('[data-f50]')) K.focus.start(50); if (e.target.closest('[data-fstop]')) K.focus.stop(); }; } });
  W.register('quick', { name: 'Accesos favoritos', icon: '⭐', render(b) { const l = (S.get('pinned', []) || []).map(appOf).filter(Boolean).slice(0, 8); b.innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${l.map(a => `<button data-qa="${esc(a.id)}" title="${esc(a.name)}" style="display:grid;place-items:center">${E.tile(a, 36)}</button>`).join('')}</div>`; b.onclick = e => { const q = e.target.closest('[data-qa]'); if (q) E.launch(q.dataset.qa); }; } });

  /* ================= 13. Modo concentración ================= */
  K.focus = (() => {
    const DISTRACT = /^(youtube|twitch|tiktok|instagram|discord|whatsapp|telegram|netflix|slither|krunker|geoguessr|chesscom|lichess|spotify|soundcloud)$/;
    let t = null;
    const state = () => { const f = S.get('os9_focus', null); return f && f.end > Date.now() ? f : null; };
    const left = () => { const f = state(); if (!f) return ''; const s = Math.max(0, Math.round((f.end - Date.now()) / 1000)); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
    function tick() {
      const f = state(); html.classList.toggle('s9-focus', !!f); html.classList.toggle('s9-focus-min', !!(f && f.minimal));
      focusPill.innerHTML = f ? `${I('target', 14)} ${esc(left())}` : '';
      if (!f) { clearInterval(t); t = null; const old = S.get('os9_focus', null); if (old) { S.set('os9_focus', null); S.set('dnd', !!old.prevDnd); html.classList.toggle('dnd', !!old.prevDnd); if (old.end <= Date.now() + 1000) { const st = S.get('os9_focus_stats', {}) || {}; st[todayKey()] = (st[todayKey()] || 0) + 1; S.set('os9_focus_stats', st); E.notify(tr('Sesión de concentración completada'), tr('¡Buen trabajo! Tómate un descanso.'), '🎯'); K.sound('end'); } K.emit('focus', false); } }
    }
    const api = {
      state, left, active: () => !!state(),
      start(min = 25, o = {}) {
        const prev = !!S.get('dnd', false);
        S.set('os9_focus', { end: Date.now() + min * 60000, min, minimal: o.minimal !== false, block: o.block !== false, prevDnd: prev, start: Date.now() });
        if (o.dnd !== false) { S.set('dnd', true); html.classList.add('dnd'); }
        clearInterval(t); t = setInterval(tick, 1000); tick(); K.emit('focus', true); K.activity('focus', 'system', 'Concentración ' + min + ' min');
        E.toast('🎯 ' + tr('Modo concentración') + ': ' + min + ' min');
      },
      stop() { const f = S.get('os9_focus', null); if (!f) return; f.end = Date.now() - 2000; f.aborted = true; S.set('os9_focus', f); S.set('os9_focus', null); S.set('dnd', !!f.prevDnd); html.classList.toggle('dnd', !!f.prevDnd); tick(); K.emit('focus', false); E.toast(tr('Modo concentración terminado')); },
      blocks(id) {
        const f = state(); if (!f || !f.block) return false;
        const a = appOf(id) || {};
        if (a.game || a.cat === 'Juegos' || DISTRACT.test(id)) { E.toast('🎯 ' + tr('Bloqueada durante el modo concentración') + ' (' + left() + ')'); return true; }
        return false;
      },
      async dialog() {
        const r = await E.form({ title: tr('Modo concentración'), html: `<p class="eis-muted" style="font-size:12px">${esc(tr('Activa No molestar, oculta los iconos del escritorio y bloquea juegos y redes sociales hasta que termine el temporizador.'))}</p>`, fields: [{ k: 'min', label: tr('Duración (minutos)'), type: 'number', value: 25 }, { k: 'block', label: tr('Bloquear distracciones'), type: 'select', options: [['1', tr('Sí')], ['0', tr('No')]], value: '1' }], ok: tr('Empezar') });
        if (r) api.start(Math.max(1, Math.min(240, +r.min || 25)), { block: r.block === '1' });
      }
    };
    const L0 = E.launch; E.launch = (id, arg) => api.blocks(id) ? false : L0(id, arg);
    if (E.playGame) { const P0 = E.playGame; E.playGame = g => (state() && state().block) ? (E.toast('🎯 ' + tr('Bloqueada durante el modo concentración') + ' (' + left() + ')'), false) : P0(g); }
    if (state()) { t = setInterval(tick, 1000); tick(); }
    return api;
  })();

  /* ================= 14. Inicio de sesión y bloqueo con perfiles ================= */
  K.login = (() => {
    let el = null, timer = null;
    const av = p => `<div class="s9-lg-av" style="background:${esc(p.color || '#1f8160')}">${esc(p.avatar || (p.name || '?')[0].toUpperCase())}</div>`;
    function show(mode = 'boot') {
      if (el) return;
      const list = K.profiles.list(), me = K.profiles.current();
      el = K.ui.el('div', { id: 's9-login', role: 'dialog', 'aria-modal': 'true', 'aria-label': mode === 'lock' ? tr('Pantalla bloqueada') : tr('Inicio de sesión') });
      el.style.backgroundImage = getComputedStyle($('#desktop-viewport')).backgroundImage;
      let pick = mode === 'switch' ? null : me.id;
      const notes = (S.get('notif_log', []) || []).filter(n => n.d > (S.get('os9_lock_at', 0) || 0)).length;
      function draw() {
        const p = pick && list.find(x => x.id === pick);
        el.innerHTML = `<div class="s9-lg-time"><b data-t></b><span data-d></span></div>
          ${mode !== 'lock' && list.length > 1 ? `<div class="s9-lg-users">${list.map(x => `<button class="s9-lg-user${x.id === pick ? ' on' : ''}" data-u="${esc(x.id)}">${av(x)}<b>${esc(x.name)}</b>${x.pin ? '<small>🔒 PIN</small>' : ''}</button>`).join('')}</div>` : (p ? `<div class="s9-lg-users"><div class="s9-lg-user on">${av(p)}<b>${esc(p.name)}</b></div></div>` : '')}
          ${p ? (p.pin ? `<form class="s9-lg-form" data-f><input type="password" inputmode="numeric" autocomplete="current-password" data-pin placeholder="PIN" aria-label="PIN" maxlength="32"><button class="btn-primary">${I('right', 16)}</button></form>` : `<button class="btn-primary" data-go style="padding:10px 26px;border-radius:99px">${esc(mode === 'lock' ? tr('Desbloquear') : tr('Entrar'))}</button>`) : `<p>${esc(tr('Elige un usuario'))}</p>`}
          <div class="s9-lg-msg" data-m>${mode === 'lock' && notes ? esc(notes + ' ' + tr('notificaciones nuevas')) : ''}</div>
          <div class="s9-lg-brand"><span class="s9-logo"><img src="icon.svg" width="20" height="20" alt=""></span>EISENKU OS · ${esc(K.version.split('.')[0] + '.0 ' + K.edition)}</div>`;
        const d = new Date(); el.querySelector('[data-t]').textContent = d.toLocaleTimeString(K.locale, { hour: '2-digit', minute: '2-digit' }); el.querySelector('[data-d]').textContent = d.toLocaleDateString(K.locale, { weekday: 'long', day: 'numeric', month: 'long' });
        const pin = el.querySelector('[data-pin]'); if (pin) setTimeout(() => pin.focus(), 50);
        const go = el.querySelector('[data-go]'); if (go) setTimeout(() => go.focus(), 50);
      }
      async function enter() {
        const p = list.find(x => x.id === pick); if (!p) return;
        if (p.pin) { const v = el.querySelector('[data-pin]').value; const ok = await K.profiles.verify(p.id, v); if (ok === 'locked') { el.querySelector('[data-m]').textContent = tr('Demasiados intentos. Espera unos minutos.'); return; } if (!ok) { el.querySelector('[data-m]').textContent = tr('PIN incorrecto'); el.querySelector('[data-pin]').value = ''; K.sound('warn'); return; } }
        if (p.id !== K.profileId) { el.querySelector('[data-m]').textContent = tr('Cambiando de usuario…'); await K.profiles.switchTo(p.id); return; }
        hide(); K.activity('session', 'system', mode === 'lock' ? 'Desbloqueo' : 'Inicio de sesión');
      }
      el.addEventListener('click', e => { const u = e.target.closest('[data-u]'); if (u) { pick = u.dataset.u; draw(); return; } if (e.target.closest('[data-go]')) enter(); });
      el.addEventListener('submit', e => { e.preventDefault(); enter(); });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.target.matches('input')) { const b = el.querySelector('[data-go]'); if (b) { e.preventDefault(); enter(); } } });
      document.body.appendChild(el); draw();
      timer = setInterval(() => { const t = el && el.querySelector('[data-t]'); if (t) t.textContent = new Date().toLocaleTimeString(K.locale, { hour: '2-digit', minute: '2-digit' }); }, 5000);
      E.closeFlyouts();
    }
    function hide() { if (!el) return; clearInterval(timer); el.classList.add('out'); const x = el; el = null; setTimeout(() => x.remove(), 320); }
    return { show, hide, visible: () => !!el };
  })();
  E.lock9 = () => { S.set('os9_lock_at', Date.now()); K.login.show('lock'); K.seclog('session', 'Pantalla bloqueada'); };
  E.lock = E.lock9;
  // bloqueo automático por inactividad
  let idleAt = Date.now();
  ['pointerdown', 'keydown', 'pointermove', 'wheel'].forEach(ev => window.addEventListener(ev, () => { idleAt = Date.now(); }, { passive: true, capture: true }));
  setInterval(() => { const m = +K.pref('autoLock') || 0; if (m > 0 && !K.login.visible() && Date.now() - idleAt > m * 60000) E.lock9(); }, 15000);

  /* ================= 15. Menú del escritorio ampliado ================= */
  E.deskMenuExtra = () => [
    { k: 's9w', i: '🧩', l: tr('Widgets…'), f: () => W.customize() },
    { k: 's9o', i: '🗂️', l: tr('Vista general y escritorios'), f: () => K.overview.open() },
    { k: 's9p', i: '🎨', l: tr('Personalizar…'), f: () => E.launch('settings', 'appearance') },
    { k: 's9s', i: '🔎', l: tr('Buscar…'), f: () => K.search.open() }
  ];

  /* ================= 15b. Ventanas siempre dentro de la pantalla (tabletas, giros, monitores pequeños) ================= */
  const fitWin = w => {
    if (!w || !w.classList.contains('open') || w.classList.contains('maximized') || w.classList.contains('snapped') || innerWidth < 700) return;
    const cs = getComputedStyle(document.documentElement), top = parseInt(cs.getPropertyValue('--top-h')) || 0, bottom = parseInt(cs.getPropertyValue('--taskbar-h')) || 48;
    // medidas de diseño (offset*), no getBoundingClientRect: la animación de apertura escala la ventana
    const Wd = innerWidth, Hd = innerHeight - top - bottom, pr = (w.offsetParent || document.body).getBoundingClientRect();
    if (w.offsetWidth > Wd - 8) w.style.width = Math.max(300, Wd - 8) + 'px';
    if (w.offsetHeight > Hd - 4) w.style.height = Math.max(200, Hd - 4) + 'px';
    const L = pr.left + w.offsetLeft, T = pr.top + w.offsetTop, Wi = w.offsetWidth, Hi = w.offsetHeight;
    if (L + Wi > Wd) w.style.left = (Math.max(0, Wd - Wi - 4) - pr.left) + 'px'; else if (L < 0) w.style.left = -pr.left + 'px';
    if (T + Hi > top + Hd) w.style.top = (Math.max(top, top + Hd - Hi - 2) - pr.top) + 'px'; else if (T < top) w.style.top = (top - pr.top) + 'px';
  };
  K.fitWindow = fitWin;
  document.addEventListener('eisen:open', e => requestAnimationFrame(() => fitWin(document.getElementById('win-' + e.detail))));
  let tFit = 0; window.addEventListener('resize', () => { clearTimeout(tFit); tFit = setTimeout(() => document.querySelectorAll('.window.open').forEach(fitWin), 150); });

  /* ================= 16. Arranque ================= */
  W.render();
  K.on('pref', e => { if (e && e.k === 'showWidgets') W.render(); });
  document.addEventListener('eisen:env', () => { renderWs(); W.render(); });
  K.shellReady = true;
})();

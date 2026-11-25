/* =====================================================================
   EISENKU OS 10.0 NEXT GENERATION · Accesibilidad y entrada
   - Navegación con mando Xbox (y cualquier mando estándar) por toda la interfaz, con anillo de foco.
   - Navegación completa con teclado: regiones con F6, menús con flechas, iconos con flechas, Shift+F10.
   - Lector de interfaz (voz), lupa de pantalla, filtros de color, variantes de alto contraste,
     tamaño de texto por app, teclas especiales (sticky), teclado en pantalla, localizar el puntero,
     velocidad de desplazamiento y perfiles de accesibilidad.
   Nada de esto finge acceso al sistema: todo actúa dentro de EISENKU.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU; if (!E || !K || !K.v10) return;
  const S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, $ = K.$, $$ = K.$$, html = document.documentElement;
  Object.assign(K.PREF_DEF, { hcTheme: 'auto', cfilter: 'none', stickyKeys: false, locatePointer: false, scrollMul: 1, magLevel: 2, readerRate: 1, readerPitch: 1, readerVoice: '', readerNotif: true, readerHover: false, oskAuto: false });
  const P = (k, v) => K.pref(k, v);
  const el = (t, a, h) => K.ui.el(t, a || {}, h || '');

  /* ================= Utilidades: elementos navegables y navegación espacial ================= */
  const FOCUSABLE = 'button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"],summary';
  const visible = n => { if (!n || n.closest('[hidden],[aria-hidden="true"],.minimized,.s9-otherdesk')) return false; const r = n.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false; const cs = getComputedStyle(n); if (cs.visibility === 'hidden' || +cs.opacity === 0) return false; const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)); const hit = document.elementFromPoint(cx, cy); return !hit || hit === n || n.contains(hit) || hit.contains(n) || !!(hit.closest && hit.closest('#s10-gpring')); };
  function scope() {
    const top = [...document.querySelectorAll('#s10-osk:not([hidden]),.eis-modal,#s10-switch,#s10-snapfly,.s10-assist,#s10-clip,#s10-capture,#context-menu,#s9-search:not([hidden]),#s9-overview:not([hidden]),#s10-expose')].filter(x => x.offsetParent !== null || getComputedStyle(x).position === 'fixed').filter(x => getComputedStyle(x).display !== 'none' && !x.hidden).pop();
    if (top) return top;
    const fly = $('#start-menu-panel.open,#action-center.open,#s9-nc.open,#s9-wpanel.open,#s9-appmenu:not([hidden]),#lx-launcher:not([hidden])'); if (fly) return fly;
    return document.body;
  }
  const cands = root => [...root.querySelectorAll(FOCUSABLE + ',.dk-ico,.fm9-it,.start-app-item')].filter(visible);
  function spatial(dir, from, root = scope()) {
    const list = cands(root); if (!list.length) return null;
    if (!from || !root.contains(from) || !visible(from)) return list[0];
    const a = from.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2; let best = null, bs = Infinity;
    for (const c of list) {
      if (c === from || c.contains(from) || from.contains(c)) continue; const b = c.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2;
      const dx = bx - ax, dy = by - ay; let main, cross;
      if (dir === 'right') { if (b.left < a.right - 4 && dx <= 4) continue; main = Math.max(0, b.left - a.right); cross = Math.abs(dy); }
      else if (dir === 'left') { if (b.right > a.left + 4 && dx >= -4) continue; main = Math.max(0, a.left - b.right); cross = Math.abs(dy); }
      else if (dir === 'down') { if (b.top < a.bottom - 4 && dy <= 4) continue; main = Math.max(0, b.top - a.bottom); cross = Math.abs(dx); }
      else { if (b.bottom > a.top + 4 && dy >= -4) continue; main = Math.max(0, a.top - b.bottom); cross = Math.abs(dx); }
      const overlap = dir === 'left' || dir === 'right' ? Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) : Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const score = main + cross * (overlap > 0 ? .4 : 2.2);
      if (score < bs) { bs = score; best = c; }
    }
    return best;
  }
  K.spatial = spatial;
  // anillo de foco que se ve siempre (el foco por mando no activa :focus-visible)
  const ring = el('div', { id: 's10-gpring', 'aria-hidden': 'true' }); ring.hidden = true; document.body.appendChild(ring);
  let ringOn = false;
  const ringTo = n => { if (!ringOn || !n || n === document.body) { ring.hidden = true; return; } const r = n.getBoundingClientRect(); ring.hidden = false; Object.assign(ring.style, { left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.width + 8 + 'px', height: r.height + 8 + 'px' }); };
  document.addEventListener('focusin', e => { if (ringOn) ringTo(e.target); });
  addEventListener('scroll', () => { if (ringOn) ringTo(document.activeElement); }, true); addEventListener('resize', () => { if (ringOn) ringTo(document.activeElement); });
  const setRing = on => { ringOn = on; html.classList.toggle('s10-padnav', on); if (!on) ring.hidden = true; else ringTo(document.activeElement); };
  addEventListener('pointerdown', () => { if (ringOn) setRing(false); }, true);
  function focusEl(n) { if (!n) return; if (!n.matches(FOCUSABLE) && !n.hasAttribute('tabindex')) n.setAttribute('tabindex', '-1'); try { n.focus({ preventScroll: false }); } catch { n.focus(); } n.scrollIntoView && n.scrollIntoView({ block: 'nearest', inline: 'nearest' }); setRing(true); ringTo(n); }
  const key = (k, o = {}) => { const t = document.activeElement || document.body; const ev = new KeyboardEvent('keydown', Object.assign({ key: k, code: k, bubbles: true, cancelable: true }, o)); t.dispatchEvent(ev); t.dispatchEvent(new KeyboardEvent('keyup', Object.assign({ key: k, code: k, bubbles: true }, o))); return ev.defaultPrevented; };
  const scrollable = n => { for (let x = n; x && x !== document.body; x = x.parentElement) { const cs = getComputedStyle(x); if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (x.scrollHeight > x.clientHeight + 2 || x.scrollWidth > x.clientWidth + 2)) return x; } const w = $('.window.active.open:not(.minimized)'); return w ? w.querySelector('.window-body,.app-body,.k9-body,.k9-main') : null; };

  /* ================= 1. Navegación con mando (Xbox y mandos estándar) ================= */
  const GP = K.cfg('gamepad', { dead: .35, delay: 380, rate: 110, map: null });
  const ACTIONS = {
    activate: ['Pulsar / aceptar', () => { const a = document.activeElement; if (!a || a === document.body) { focusEl(spatial('down')); return; } if (a.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,[contenteditable="true"]')) { if (P('oskAuto') || K.caps.xbox || html.classList.contains('s10-touch')) K.osk.open(a); else a.focus(); return; } if (a.matches('select')) { const s = a; s.selectedIndex = (s.selectedIndex + 1) % s.options.length; s.dispatchEvent(new Event('change', { bubbles: true })); return; } a.click(); }],
    back: ['Atrás / cancelar', () => { if (K.osk.isOpen()) return K.osk.close(); const handled = key('Escape'); if (!handled) { if ($('#start-menu-panel.open,#action-center.open,#s9-nc.open,#s9-wpanel.open,#s9-appmenu:not([hidden])')) E.closeFlyouts(); else if ($('#context-menu') && $('#context-menu').style.display === 'block') $('#context-menu').style.display = 'none'; } }],
    menu: ['Menú contextual', () => { const a = document.activeElement; if (!a || a === document.body) return; const r = a.getBoundingClientRect(); a.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); setTimeout(() => { const m = $('#context-menu'); if (m && m.style.display === 'block') focusEl(m.querySelector('.ctx-item:not([disabled])')); }, 30); }],
    search: ['Buscar', () => K.search.toggle()],
    prevwin: ['Ventana anterior', () => cycleWin(-1)], nextwin: ['Ventana siguiente', () => cycleWin(1)],
    pageup: ['Desplazar arriba', () => { const s = scrollable(document.activeElement); if (s) s.scrollBy({ top: -s.clientHeight * .8, behavior: 'smooth' }); }],
    pagedown: ['Desplazar abajo', () => { const s = scrollable(document.activeElement); if (s) s.scrollBy({ top: s.clientHeight * .8, behavior: 'smooth' }); }],
    overview: ['Vista general', () => K.overview.toggle()],
    start: ['Inicio / aplicaciones', () => { if (html.dataset.env === 'linux') { const b = $('[data-lx="apps"]'); if (b) b.click(); } else { const b = $('#tb-start-trigger'); if (b) b.click(); } setTimeout(() => focusEl(spatial('down', null, scope())), 120); }],
    osk: ['Teclado en pantalla', () => K.osk.toggle(document.activeElement)],
    expose: ['Ver todas las ventanas', () => K.expose && K.expose.open()],
    up: ['Mover arriba', () => nav('up')], down: ['Mover abajo', () => nav('down')], left: ['Mover a la izquierda', () => nav('left')], right: ['Mover a la derecha', () => nav('right')],
    none: ['Sin acción', () => { }]
  };
  const DEFMAP = { 0: 'activate', 1: 'back', 2: 'menu', 3: 'search', 4: 'prevwin', 5: 'nextwin', 6: 'pageup', 7: 'pagedown', 8: 'overview', 9: 'start', 10: 'osk', 11: 'expose', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
  const BTN = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', '↑', '↓', '←', '→'];
  const pmap = () => Object.assign({}, DEFMAP, GP.get('map') || {});
  // sin nada enfocado (lo habitual al encender el mando), el primer movimiento entra en la ventana activa
  function nav(dir) {
    const a = document.activeElement, root = scope();
    if (!a || a === document.body || a === html) { const w = root === document.body && $('.window.active.open:not(.minimized)'), first = (w && cands(w).find(x => !x.closest('.window-header'))) || (w && cands(w)[0]) || spatial(dir, null, root); if (first) focusEl(first); return; }
    const n = spatial(dir, a, root); if (n) focusEl(n); else setRing(true);
  }
  function cycleWin(d) { const ids = (K.switcher ? K.switcher.mru() : []).filter(id => { const w = document.getElementById('win-' + id); return w && w.classList.contains('open'); }); if (ids.length < 2) { if (ids[0]) E.openWindow(ids[0]); return; } const order = d > 0 ? ids.slice(1).concat(ids[0]) : [ids[ids.length - 1]].concat(ids.slice(0, -1)); E.openWindow(order[0]); setTimeout(() => { const w = document.getElementById('win-' + order[0]); if (w) focusEl(spatial('down', null, w) || w); }, 60); }
  const gameActive = () => { const w = $('.window.active.open:not(.minimized)'); return !!(w && w.querySelector('.gm canvas,#shooter-canvas,#snake-canvas') && [...w.querySelectorAll('canvas')].some(c => c.offsetParent)); };
  let raf = 0, prev = {}, held = {}, lastAxis = {}, scan = 0, pads = 0;
  function poll(t) {
    raf = requestAnimationFrame(poll);
    const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean)[0]; if (!gp) return;
    if (document.hidden || (K.login && K.login.visible() && !$('#s9-login input'))) return;
    const map = pmap(), game = gameActive(), dead = +GP.get('dead', .35) || .35, dl = +GP.get('delay', 380), rt = +GP.get('rate', 110);
    const st = {}; gp.buttons.forEach((b, i) => { if (b && (b.pressed || b.value > .5)) st[i] = true; });
    const ax = gp.axes || []; if (ax[0] < -dead) st.L = true; if (ax[0] > dead) st.R = true; if (ax[1] < -dead) st.U = true; if (ax[1] > dead) st.D = true;
    // el Centro de mandos puede pausar la navegación mientras se prueban los botones (se sale con B + Menú)
    if (K.gamepadNav.suspend && K.gamepadNav.suspend(st)) { prev = st; return; }
    const fire = (k, act) => { if (game && !/^(start|overview|search)$/.test(act)) return; const A = ACTIONS[act]; if (A) { try { A[1](); } catch (e) { console.error(e); } } };
    const keys = Object.keys(st).concat(Object.keys(prev));
    new Set(keys).forEach(k => {
      const act = /^\d+$/.test(k) ? map[k] : { L: 'left', R: 'right', U: 'up', D: 'down' }[k];
      if (st[k] && !prev[k]) { held[k] = t + dl; fire(k, act); }
      else if (st[k] && prev[k] && /^(up|down|left|right|pageup|pagedown)$/.test(act) && t >= held[k]) { held[k] = t + rt; fire(k, act); }
      else if (!st[k]) delete held[k];
    });
    // palanca derecha: desplazamiento continuo
    if (!game && (Math.abs(ax[3] || 0) > dead || Math.abs(ax[2] || 0) > dead)) { const s = scrollable(document.activeElement); if (s) s.scrollBy((ax[2] || 0) * 14, (ax[3] || 0) * 18); }
    prev = st; void lastAxis;
  }
  const start = () => { if (!raf) raf = requestAnimationFrame(poll); };
  const stopPoll = () => { cancelAnimationFrame(raf); raf = 0; };
  const onConn = e => { pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean).length; if (e && e.type === 'gamepadconnected') { E.toast('🎮 ' + tr('Mando conectado: puedes navegar por EISENKU con él')); K.log && K.log('info', 'device', 'Mando conectado: ' + (e.gamepad && e.gamepad.id || '')); start(); } if (e && e.type === 'gamepaddisconnected') { K.log && K.log('info', 'device', 'Mando desconectado'); if (!pads) { stopPoll(); setRing(false); } } };
  K.services.define('gamepad', {
    name: 'Navegación con mando', desc: 'Permite usar EISENKU con un mando Xbox o compatible: cruceta o palanca para moverse, A para aceptar, B para volver, Menú para Inicio.', group: 'Accesibilidad',
    start() { addEventListener('gamepadconnected', onConn); addEventListener('gamepaddisconnected', onConn); clearInterval(scan); scan = setInterval(() => { const n = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean).length; if (n && !raf) start(); }, 1500); },
    stop() { removeEventListener('gamepadconnected', onConn); removeEventListener('gamepaddisconnected', onConn); clearInterval(scan); stopPoll(); setRing(false); },
    info: () => { const l = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean); return l.length ? l.map(g => g.id.slice(0, 40)).join(', ') : tr('ningún mando conectado'); }
  });
  K.gamepadNav = { suspend: null, actions: ACTIONS, buttons: BTN, defaults: DEFMAP, map: pmap, setMap(i, act) { const m = GP.get('map') || {}; m[i] = act; GP.set('map', m); }, resetMap() { GP.set('map', null); }, cfg: GP, mapText: () => Object.entries(pmap()).filter(([, a]) => a !== 'none').map(([i, a]) => [BTN[i] || ('#' + i), (ACTIONS[a] || [a])[0]]), focus: focusEl, ring: setRing };

  /* ================= 2. Navegación completa con teclado ================= */
  const REGIONS = [['taskbar', () => $(html.dataset.env === 'linux' ? '#taskbar' : '#taskbar')], ['lxpanel', () => html.dataset.env === 'linux' ? $('#lx-panel') : null], ['window', () => $('.window.active.open:not(.minimized):not(.s9-otherdesk)')], ['desktop', () => $('#desktop-icons') || $('#desktop-viewport')], ['widgets', () => $('#s9-widgets:not([hidden])')], ['panels', () => $('.s10-panel.open')]];
  let regI = 0;
  function region(d) {
    for (let k = 0; k < REGIONS.length; k++) { regI = (regI + d + REGIONS.length) % REGIONS.length; const r = REGIONS[regI][1](); if (!r) continue; const c = cands(r)[0]; if (c) { focusEl(c); setRing(false); c.focus(); E.toast(tr({ taskbar: 'Barra de tareas', lxpanel: 'Panel superior', window: 'Ventana activa', desktop: 'Escritorio', widgets: 'Widgets', panels: 'Panel lateral' }[REGIONS[regI][0]])); return; } }
  }
  addEventListener('keydown', e => {
    if (e.defaultPrevented) return;
    const a = document.activeElement, typing = a && a.matches && a.matches('input,textarea,select,[contenteditable],[contenteditable] *');
    if (e.key === 'F6' && !e.ctrlKey && !e.altKey) { e.preventDefault(); region(e.shiftKey ? -1 : 1); return; }
    // menús contextuales con teclado
    const cm = $('#context-menu');
    if (cm && cm.style.display === 'block' && (cm.contains(a) || /^(ArrowDown|ArrowUp)$/.test(e.key))) {
      const items = [...cm.querySelectorAll('.ctx-item:not([disabled])')].filter(x => x.offsetParent !== null), i = items.indexOf(a);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); const n = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length] || items[0]; if (n) n.focus(); return; }
      if (e.key === 'ArrowRight' && a && a.parentElement && a.parentElement.classList.contains('ctx-sub')) { e.preventDefault(); a.parentElement.classList.add('kopen'); const f = a.parentElement.querySelector('.ctx-subm .ctx-item'); if (f) f.focus(); return; }
      if (e.key === 'ArrowLeft' && a && a.closest('.ctx-subm')) { e.preventDefault(); const sub = a.closest('.ctx-sub'); sub.classList.remove('kopen'); sub.querySelector(':scope > .ctx-item').focus(); return; }
      if (e.key === 'Escape') { e.preventDefault(); cm.style.display = 'none'; if (cm.__ret) cm.__ret.focus(); return; }
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); (e.key === 'Home' ? items[0] : items[items.length - 1]).focus(); return; }
    }
    // Shift+F10 o tecla de menú: abre el menú contextual del elemento enfocado
    if ((e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) && a && a !== document.body) { e.preventDefault(); const r = a.getBoundingClientRect(); if (cm) cm.__ret = a; a.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + Math.min(20, r.width / 2), clientY: r.top + r.height / 2 })); setTimeout(() => { if (cm && cm.style.display === 'block') { const f = cm.querySelector('.ctx-item:not([disabled])'); if (f) f.focus(); } else { const m = $('#s10-snapfly [data-lz]'); if (m) m.focus(); } }, 30); return; }
    // iconos del escritorio y barra de tareas con flechas
    if (!typing && /^Arrow/.test(e.key) && !e.ctrlKey && !e.altKey && a && a.closest && (a.closest('#desktop-viewport') && a.matches('.dk-ico') || a.closest('#taskbar') || a.closest('#lx-panel'))) {
      const root = a.closest('#desktop-viewport') || a.closest('#taskbar') || a.closest('#lx-panel'); const n = spatial(e.key.slice(5).toLowerCase(), a, root); if (n) { e.preventDefault(); n.focus(); }
    }
  }, true);
  // enlace para saltar al contenido (lectores de pantalla y teclado)
  const skip = el('a', { href: '#', class: 's10-skip' }, esc(tr('Saltar a la ventana activa')));
  skip.addEventListener('click', e => { e.preventDefault(); const w = $('.window.active.open:not(.minimized)'); if (w) { const c = cands(w)[0]; if (c) c.focus(); } else region(1); });
  document.body.prepend(skip);

  /* ================= 3. Lector de interfaz (voz) ================= */
  const ROLE = { button: 'botón', link: 'enlace', checkbox: 'casilla', radio: 'opción', textbox: 'campo de texto', searchbox: 'búsqueda', combobox: 'lista desplegable', slider: 'control deslizante', tab: 'pestaña', menuitem: 'opción de menú', option: 'opción', dialog: 'diálogo', heading: 'título', listbox: 'lista', switch: 'interruptor', img: 'imagen' };
  const roleOf = n => { const r = n.getAttribute('role'); if (r) return r; const t = n.tagName.toLowerCase(), ty = (n.getAttribute('type') || '').toLowerCase(); if (t === 'button' || (t === 'input' && /^(button|submit|reset)$/.test(ty))) return 'button'; if (t === 'a') return 'link'; if (t === 'input' && ty === 'checkbox') return n.classList.contains('k9-switch') ? 'switch' : 'checkbox'; if (t === 'input' && ty === 'radio') return 'radio'; if (t === 'input' && ty === 'range') return 'slider'; if (t === 'input' && ty === 'search') return 'searchbox'; if (t === 'input' || t === 'textarea' || n.isContentEditable) return 'textbox'; if (t === 'select') return 'combobox'; if (/^h[1-6]$/.test(t)) return 'heading'; if (t === 'img') return 'img'; return ''; };
  const nameOf = n => { const al = n.getAttribute('aria-label'); if (al) return al; const lb = n.getAttribute('aria-labelledby'); if (lb) { const t = lb.split(/\s+/).map(id => (document.getElementById(id) || {}).textContent || '').join(' ').trim(); if (t) return t; } if (n.id) { const l = document.querySelector(`label[for="${CSS.escape(n.id)}"]`); if (l) return l.textContent.trim(); } const pl = n.closest('label'); if (pl && pl !== n) { const t = pl.textContent.trim(); if (t) return t; } const row = n.closest('.s9-set'); if (row) { const t = (row.querySelector('.s9-lbl span') || {}).textContent; if (t) return t; } if (n.title) return n.title; if (n.alt) return n.alt; const t = (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim(); if (t) return t.slice(0, 140); return n.getAttribute('placeholder') || n.getAttribute('name') || ''; };
  function describe(n) {
    if (!n || n === document.body) return '';
    const role = roleOf(n), name = nameOf(n); const bits = [name, tr(ROLE[role] || '')];
    if (n.type === 'password') bits.push(tr('contraseña protegida'));
    else if (role === 'checkbox' || role === 'switch') bits.push(n.checked ? tr('activado') : tr('desactivado'));
    else if (role === 'slider') bits.push(tr('valor') + ' ' + n.value);
    else if (role === 'combobox') bits.push((n.options[n.selectedIndex] || {}).text || '');
    else if (role === 'textbox' && n.value !== undefined) bits.push(n.value ? (n.value.length > 80 ? n.value.slice(0, 80) + '…' : n.value) : tr('vacío'));
    if (n.getAttribute('aria-expanded')) bits.push(n.getAttribute('aria-expanded') === 'true' ? tr('expandido') : tr('contraído'));
    if (n.getAttribute('aria-pressed') === 'true' || n.getAttribute('aria-selected') === 'true' || n.classList.contains('on')) bits.push(tr('seleccionado'));
    if (n.disabled) bits.push(tr('no disponible'));
    const w = n.closest('.window'); if (w && w !== reader.lastWin) { reader.lastWin = w; const a = E.REG[w.id.slice(4)] || {}; if (a.name) bits.unshift(tr('Ventana') + ' ' + a.name + '.'); }
    return bits.filter(Boolean).join(', ');
  }
  const reader = {
    lastWin: null, voices: () => (window.speechSynthesis ? speechSynthesis.getVoices() : []),
    say(text, interrupt = true) { if (!window.speechSynthesis || !text) return false; if (interrupt) speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(text).slice(0, 600)); const v = reader.voices().find(x => x.name === P('readerVoice')) || reader.voices().find(x => (x.lang || '').toLowerCase().startsWith(String(K.locale || 'es').slice(0, 2))); if (v) u.voice = v; u.lang = (v && v.lang) || K.locale || 'es-ES'; u.rate = +P('readerRate') || 1; u.pitch = +P('readerPitch') || 1; speechSynthesis.speak(u); reader.last = text; return true; },
    stop() { if (window.speechSynthesis) speechSynthesis.cancel(); }, describe
  };
  K.reader = reader;
  let hovT = 0;
  const onFocus = e => { const d = describe(e.target); if (d) reader.say(d); };
  const onHover = e => { if (!P('readerHover')) return; clearTimeout(hovT); const n = e.target.closest && e.target.closest(FOCUSABLE + ',h1,h2,h3,h4,p,li,label,.k9-li'); if (!n) return; hovT = setTimeout(() => reader.say(describe(n) || n.textContent.trim().slice(0, 200)), 650); };
  const onKey = e => { if (e.key === 'Control' && !e.repeat) reader.stop(); if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'r') { e.preventDefault(); const sel = String(getSelection()); const w = $('.window.active.open:not(.minimized)'); reader.say(sel || (w ? describe(w.querySelector('.window-title-area')) + '. ' + (w.querySelector('.window-body,.app-body') || w).innerText.slice(0, 500) : tr('Escritorio de EISENKU'))); } };
  const n0 = E.notify; E.notify = (t, b, i, ms) => { const r = n0(t, b, i, ms); if (K.services.running('reader') && P('readerNotif') && !S.get('dnd', false)) reader.say(tr('Notificación') + ': ' + t + '. ' + (b || ''), false); return r; };
  K.services.define('reader', {
    name: 'Lector de interfaz', desc: 'Lee en voz alta el elemento enfocado, las notificaciones y, con Ctrl+Alt+R, la selección o la ventana activa. Ctrl detiene la voz.', group: 'Accesibilidad', startType: 'manual',
    start() { if (!window.speechSynthesis) throw new Error(tr('Este navegador no tiene síntesis de voz')); document.addEventListener('focusin', onFocus); document.addEventListener('pointerover', onHover); addEventListener('keydown', onKey, true); html.classList.add('s10-reader'); reader.say(tr('Lector de interfaz activado')); },
    stop() { document.removeEventListener('focusin', onFocus); document.removeEventListener('pointerover', onHover); removeEventListener('keydown', onKey, true); html.classList.remove('s10-reader'); reader.say(tr('Lector de interfaz desactivado')); },
    info: () => window.speechSynthesis ? reader.voices().length + ' ' + tr('voces') : tr('no disponible')
  });

  /* ================= 4. Lupa de pantalla ================= */
  let magRaf = 0, mx = innerWidth / 2, my = innerHeight / 2;
  const magApply = () => { magRaf = 0; html.style.setProperty('--s10-mx', mx + 'px'); html.style.setProperty('--s10-my', my + 'px'); };
  const magMove = e => { mx = e.clientX; my = e.clientY; if (!magRaf) magRaf = requestAnimationFrame(magApply); };
  const magFocus = e => { if (!e.target || !e.target.getBoundingClientRect) return; const r = e.target.getBoundingClientRect(); mx = r.left + r.width / 2; my = r.top + r.height / 2; if (!magRaf) magRaf = requestAnimationFrame(magApply); };
  const magLevel = v => { v = Math.max(1.25, Math.min(5, +v || 2)); P('magLevel', v); html.style.setProperty('--s10-mag', String(v)); return v; };
  K.services.define('magnifier', {
    name: 'Lupa', desc: 'Amplía la pantalla de EISENKU siguiendo el puntero y el foco del teclado o del mando. Ctrl+Alt+Z cambia el aumento.', group: 'Accesibilidad', startType: 'manual',
    start() { magLevel(P('magLevel')); html.classList.add('s10-mag'); addEventListener('pointermove', magMove, { passive: true }); document.addEventListener('focusin', magFocus); magApply(); },
    stop() { html.classList.remove('s10-mag'); removeEventListener('pointermove', magMove); document.removeEventListener('focusin', magFocus); },
    info: () => (+P('magLevel') || 2) + '×'
  });
  K.magnifier = { level: magLevel, toggle: () => K.services.running('magnifier') ? K.services.stop('magnifier') : K.services.start('magnifier', true) };
  const LEVELS = [1.5, 2, 3, 4];
  K.keys.register('magnify', 'Lupa: activar y aumentar (1,5× → 2× → 3× → 4× → apagada)', 'Ctrl+Alt+Z', () => { if (!K.services.running('magnifier')) { magLevel(LEVELS[0]); K.services.start('magnifier', true); E.toast('🔍 1.5×'); return; } const i = LEVELS.indexOf(+P('magLevel')); if (i >= LEVELS.length - 1 || i < 0) { K.services.stop('magnifier'); E.toast('🔍 ' + tr('Lupa apagada')); } else { magLevel(LEVELS[i + 1]); E.toast('🔍 ' + LEVELS[i + 1] + '×'); } }, 'Accesibilidad');
  K.keys.register('reader', 'Lector de interfaz (activar/desactivar)', 'Ctrl+Alt+Enter', () => K.services.running('reader') ? K.services.stop('reader') : K.services.start('reader', true), 'Accesibilidad');

  /* ================= 5. Filtros de color y variantes de alto contraste ================= */
  const SIM = { protanopia: [[.152286, 1.052583, -.204868], [.114503, .786281, .099216], [-.003882, -.048116, 1.051998]], deuteranopia: [[.367322, .860646, -.227968], [.280085, .672501, .047413], [-.01182, .04294, .968881]], tritanopia: [[1.255528, -.076749, -.178779], [-.078411, .930809, .147602], [.004733, .691367, .3039]] };
  const SHIFT = [[0, 0, 0], [.7, 1, 0], [.7, 0, 1]];
  const mul = (A, B) => A.map((r, i) => B[0].map((_, j) => r.reduce((s, _x, k) => s + A[i][k] * B[k][j], 0)));
  const dalton = m => { const Id = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], err = Id.map((r, i) => r.map((v, j) => v - m[i][j])), D = mul(SHIFT, err).map((r, i) => r.map((v, j) => v + Id[i][j])); return D; };
  const fm = M => M.map(r => r.map(v => +v.toFixed(5)).join(' ') + ' 0 0').join(' ') + ' 0 0 0 1 0';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
  svg.innerHTML = `<defs>${Object.keys(SIM).map(k => `<filter id="s10-f-${k}" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${fm(dalton(SIM[k]))}"/></filter><filter id="s10-f-sim-${k}" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${fm(SIM[k])}"/></filter>`).join('')}</defs>`;
  document.body.appendChild(svg);
  K.DALTON = { sim: SIM, matrix: k => dalton(SIM[k]) };
  const applyFilters = () => { const f = P('cfilter') || 'none'; html.dataset.cfilter = f; html.dataset.hct = P('hcTheme') || 'auto'; };
  applyFilters(); K.on('pref', p => { if (p && /^(cfilter|hcTheme)$/.test(p.k)) applyFilters(); });

  /* ================= 6. Tamaño de texto por app y opciones del menú de ventana ================= */
  const ZK = 'os10_appzoom', zooms = () => S.get(ZK, {}) || {};
  const applyZoom = id => { const w = document.getElementById('win-' + id); if (!w) return; const z = +zooms()[id] || 1; $$(':scope > .window-body, :scope > .app-body, :scope > .fm9', w).forEach(b => { b.style.zoom = z === 1 ? '' : String(z); }); };
  K.appZoom = { get: id => +zooms()[id] || 1, set(id, z) { const m = zooms(); z = Math.max(.7, Math.min(2, +z || 1)); if (z === 1) delete m[id]; else m[id] = +z.toFixed(2); S.set(ZK, m); applyZoom(id); }, apply: applyZoom, all: zooms };
  document.addEventListener('eisen:open', e => setTimeout(() => applyZoom(e.detail), 30));
  let menuWin = null;
  addEventListener('contextmenu', e => { const h = e.target.closest && e.target.closest('.window-header'); menuWin = h && !e.target.closest('button,input,select') ? h.closest('.window') : null; }, true);
  const menu0 = K.ui.menu;
  K.ui.menu = (x, y, items) => {
    if (menuWin && items.some(it => it.icon === 'pin')) {
      const w = menuWin, id = w.id.slice(4), z = K.appZoom.get(id); menuWin = null;
      const extra = [{ sep: true }, { label: 'Diseños de ajuste…', icon: 'grid', act: () => K.snap && K.snap.fly(w, w.querySelector('[data-act="max"]')), kbd: 'Alt+Shift+Z' }, { label: 'Texto más grande en esta app', icon: 'plus', act: () => K.appZoom.set(id, z + .1) }, { label: 'Texto más pequeño en esta app', icon: 'min', act: () => K.appZoom.set(id, z - .1) }];
      if (z !== 1) extra.push({ label: 'Texto normal en esta app', icon: 'refresh', act: () => K.appZoom.set(id, 1) });
      extra.push({ label: 'Opacidad de la ventana', icon: 'eye', act: async () => { const v = await K.ui.prompt(tr('Opacidad'), tr('Porcentaje (40-100)'), String(Math.round((+w.style.opacity || 1) * 100))); if (v != null) w.style.opacity = String(Math.max(.4, Math.min(1, (+v || 100) / 100))); } });
      const ci = items.findIndex(it => it.danger); items.splice(ci < 0 ? items.length : ci, 0, ...extra);
    }
    menuWin = null; return menu0(x, y, items);
  };

  /* ================= 7. Teclas especiales (sticky keys) para los atajos de EISENKU ================= */
  const latch = new Set(); const chip = el('div', { id: 's10-sticky', 'aria-live': 'polite' }); chip.hidden = true; document.body.appendChild(chip);
  const drawChip = () => { chip.hidden = !latch.size; chip.textContent = [...latch].join(' + ') + ' +'; };
  let pend = null;   // una tecla modificadora se "fija" solo si se pulsa y suelta sola (como en los sistemas de escritorio)
  addEventListener('keyup', e => { if (!P('stickyKeys')) return; if (['Control', 'Alt', 'Shift'].includes(e.key) && pend === e.key) { const k = e.key === 'Control' ? 'Ctrl' : e.key; latch.has(k) ? latch.delete(k) : latch.add(k); drawChip(); } pend = null; }, true);
  addEventListener('keydown', e => {
    if (!P('stickyKeys')) return;
    if (['Control', 'Alt', 'Shift'].includes(e.key)) { if (!e.repeat) pend = e.key; return; }
    pend = null;
    if (e.ctrlKey || e.altKey || e.metaKey) { if (latch.size) { latch.clear(); drawChip(); } return; }
    if (!latch.size) return;
    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key; const combo = ['Ctrl', 'Alt', 'Shift'].filter(x => latch.has(x)).concat(k === ' ' ? 'Space' : k).join('+');
    const m = K.keys.map(), d = K.keys.defs.find(x => m[x.id] === combo); latch.clear(); drawChip();
    if (d) { e.preventDefault(); e.stopImmediatePropagation(); try { d.run(); } catch (er) { console.error(er); } }
  }, true);

  /* ================= 8. Teclado en pantalla ================= */
  const OSK_ROWS = { abc: ['1234567890', 'qwertyuiop', 'asdfghjklñ', 'zxcvbnm,.-'], sym: ['!"#$%&/()=', '@€¿?¡+*[]{}', '<>|\\_;:\'^~', 'áéíóúü´`ç'] };
  let osk = null, oskT = null, shift = false, mode = 'abc';
  function oskDraw() {
    const rows = OSK_ROWS[mode].map(r => [...r].map(c => `<button data-ok="${esc(c)}">${esc(shift ? c.toUpperCase() : c)}</button>`).join(''));
    osk.innerHTML = `<div class="s10-osk-rows">${rows.map(r => `<div>${r}</div>`).join('')}<div><button data-ok="__shift" class="w15${shift ? ' on' : ''}">⇧</button><button data-ok="__mode" class="w15">${mode === 'abc' ? '#+=' : 'abc'}</button><button data-ok=" " class="w4">${esc(tr('Espacio'))}</button><button data-ok="__left">←</button><button data-ok="__right">→</button><button data-ok="__bs" class="w15">⌫</button><button data-ok="__enter" class="w15">↵</button><button data-ok="__close" class="w15">✕</button></div></div>`;
  }
  const ins = (t, s) => { if (!t) return; t.focus(); let ok = false; try { ok = document.execCommand('insertText', false, s); } catch { ok = false; } if (!ok && 'value' in t) { const a = t.selectionStart ?? t.value.length, b = t.selectionEnd ?? a; t.value = t.value.slice(0, a) + s + t.value.slice(b); t.selectionStart = t.selectionEnd = a + s.length; t.dispatchEvent(new Event('input', { bubbles: true })); } };
  K.osk = {
    isOpen: () => !!osk,
    open(target) {
      oskT = target && target.matches && target.matches('input,textarea,[contenteditable="true"]') ? target : (K.clip.lastEditable || null);
      if (!osk) { osk = el('div', { id: 's10-osk', role: 'group', 'aria-label': tr('Teclado en pantalla') }); document.body.appendChild(osk); osk.addEventListener('pointerdown', e => e.preventDefault()); osk.addEventListener('click', e => { const b = e.target.closest('[data-ok]'); if (!b) return; const k = b.dataset.ok; const t = oskT; if (k === '__close') return K.osk.close(); if (k === '__shift') { shift = !shift; oskDraw(); return; } if (k === '__mode') { mode = mode === 'abc' ? 'sym' : 'abc'; oskDraw(); return; } if (!t) return E.toast(tr('Elige primero un campo de texto')); if (k === '__bs') { t.focus(); if (!document.execCommand('delete') && 'value' in t) { const a = t.selectionStart; if (a > 0) { t.value = t.value.slice(0, a - 1) + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = a - 1; t.dispatchEvent(new Event('input', { bubbles: true })); } } return; } if (k === '__left' || k === '__right') { t.focus(); if ('selectionStart' in t && t.selectionStart != null) { const p = Math.max(0, (t.selectionStart || 0) + (k === '__left' ? -1 : 1)); t.selectionStart = t.selectionEnd = p; } return; } if (k === '__enter') { if (t.tagName === 'TEXTAREA' || t.isContentEditable) ins(t, '\n'); else { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); const f = t.form; if (f) (f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true }))); } return; } ins(t, shift ? k.toUpperCase() : k); if (shift) { shift = false; oskDraw(); } }); }
      osk.hidden = false; oskDraw(); html.classList.add('s10-oskon'); if (oskT) oskT.focus(); setTimeout(() => { if (html.classList.contains('s10-padnav')) focusEl(osk.querySelector('[data-ok]')); }, 50);
    },
    close() { if (osk) { osk.hidden = true; html.classList.remove('s10-oskon'); if (oskT && oskT.isConnected) { oskT.focus(); } } },
    toggle(t) { osk && !osk.hidden ? K.osk.close() : K.osk.open(t); }
  };
  K.keys.register('osk', 'Teclado en pantalla', 'Ctrl+Alt+Y', () => K.osk.toggle(document.activeElement), 'Accesibilidad');

  /* ================= 9. Puntero: localizar con Ctrl y velocidad de la rueda ================= */
  let lx = innerWidth / 2, ly = innerHeight / 2, ctrlOnly = false;
  addEventListener('pointermove', e => { lx = e.clientX; ly = e.clientY; }, { passive: true });
  addEventListener('keydown', e => { ctrlOnly = e.key === 'Control' && !e.repeat; }, true);
  addEventListener('keyup', e => { if (e.key === 'Control' && ctrlOnly && P('locatePointer')) { const r = el('div', { class: 's10-locate' }); r.style.left = lx + 'px'; r.style.top = ly + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 900); } ctrlOnly = false; }, true);
  addEventListener('wheel', e => {
    const m = +P('scrollMul') || 1; if (m === 1 || e.ctrlKey || e.defaultPrevented) return;
    const t = e.target.closest && e.target.closest('.window,#start-menu-panel,#s9-nc,.s10-panel'); if (!t || e.target.closest('canvas,input[type=range],select')) return;
    const s = scrollable(e.target); if (!s) return; e.preventDefault(); s.scrollBy({ left: e.deltaX * m, top: e.deltaY * m, behavior: 'auto' });
  }, { passive: false, capture: true });

  /* ================= 10. Perfiles de accesibilidad ================= */
  const A11Y = K.A11Y_PROFILES = [
    { id: 'none', n: 'Estándar', d: 'Sin ayudas especiales.', p: { contrast: false, fontScale: 1, dyslexia: false, focusRing: false, cursor: 'normal', cfilter: 'none', stickyKeys: false, reduceMotion: null }, svc: { reader: false, magnifier: false } },
    { id: 'lowvision', n: 'Baja visión', d: 'Texto grande, alto contraste, foco reforzado, puntero grande y lupa preparada (Ctrl+Alt+Z).', p: { contrast: true, fontScale: 1.3, focusRing: true, cursor: 'large', hcTheme: 'yellow' }, svc: { magnifier: false } },
    { id: 'blind', n: 'Lector de pantalla', d: 'El lector de interfaz lee el foco y las notificaciones; sin animaciones.', p: { reduceMotion: true, focusRing: true, readerNotif: true }, svc: { reader: true } },
    { id: 'motor', n: 'Movilidad reducida', d: 'Teclas especiales para atajos, botones más grandes y repetición lenta del mando.', p: { stickyKeys: true, density: 'comfortable', fontScale: 1.1 }, touch: true, pad: { delay: 600, rate: 220 } },
    { id: 'dyslexia', n: 'Dislexia', d: 'Fuente de lectura fácil con más espacio entre letras y texto algo mayor.', p: { dyslexia: true, fontScale: 1.1 } },
    { id: 'rg', n: 'Daltonismo rojo-verde', d: 'Filtro de color que separa mejor rojos y verdes (deuteranopía).', p: { cfilter: 'deuteranopia' } },
    { id: 'by', n: 'Daltonismo azul-amarillo', d: 'Filtro de color para tritanopía.', p: { cfilter: 'tritanopia' } },
    { id: 'sofa', n: 'Sofá con mando', d: 'Navegación con mando, texto grande y teclado en pantalla al escribir.', p: { fontScale: 1.25, cursor: 'large', oskAuto: true, focusRing: true }, svc: { gamepad: true }, touch: true }
  ];
  K.a11yProfiles = {
    list: () => A11Y.concat(S.get('os10_a11ycustom', []) || []),
    active: () => S.get('os10_a11y_active', 'none'),
    apply(id) { const pr = K.a11yProfiles.list().find(x => x.id === id); if (!pr) return; Object.entries(pr.p || {}).forEach(([k, v]) => K.pref(k, v)); Object.entries(pr.svc || {}).forEach(([k, on]) => { if (!K.services.get(k)) return; if (on) { K.services.setStartType(k, 'auto'); K.services.start(k, true); } else { if (K.services.startType(k) === 'auto' && k !== 'gamepad') K.services.setStartType(k, 'manual'); K.services.stop(k, true); } }); if (pr.touch !== undefined) { html.classList.toggle('s10-touch', !!pr.touch); S.set('os10_touch', !!pr.touch); } if (pr.pad) GP.patch(pr.pad); S.set('os10_a11y_active', id); E.toast('♿ ' + tr('Perfil de accesibilidad') + ': ' + tr(pr.n)); K.log && K.log('info', 'accessibility', 'Perfil de accesibilidad: ' + pr.n); },
    saveCustom(name) { const p = K.prefs(), keys = ['contrast', 'hcTheme', 'fontScale', 'dyslexia', 'focusRing', 'cursor', 'cfilter', 'stickyKeys', 'reduceMotion', 'oskAuto', 'locatePointer', 'scrollMul']; const d = { id: 'a' + Date.now().toString(36), n: String(name).slice(0, 40), d: tr('Perfil personalizado'), p: Object.fromEntries(keys.map(k => [k, p[k]])), svc: { reader: K.services.running('reader'), magnifier: K.services.running('magnifier'), gamepad: K.services.running('gamepad') }, custom: true }; const l = S.get('os10_a11ycustom', []) || []; l.push(d); S.set('os10_a11ycustom', l.slice(-8)); return d; },
    removeCustom(id) { S.set('os10_a11ycustom', (S.get('os10_a11ycustom', []) || []).filter(x => x.id !== id)); }
  };

  /* ================= 11. Accesos rápidos de accesibilidad ================= */
  const tiles = $('#action-center .quick-tiles-grid');
  if (tiles) {
    tiles.insertAdjacentHTML('beforeend', `<button class="quick-tile" id="qt-s10reader"><span class="qt-icon">${I('volume', 18)}</span><span>${esc(tr('Lector'))}</span></button><button class="quick-tile" id="qt-s10mag"><span class="qt-icon">${I('search', 18)}</span><span>${esc(tr('Lupa'))}</span></button><button class="quick-tile" id="qt-s10pad"><span class="qt-icon">${I('target', 18)}</span><span>${esc(tr('Mando'))}</span></button><button class="quick-tile" id="qt-s10osk"><span class="qt-icon">${I('key', 18)}</span><span>${esc(tr('Teclado'))}</span></button>`);
    const sync = () => { $('#qt-s10reader').classList.toggle('active', K.services.running('reader')); $('#qt-s10mag').classList.toggle('active', K.services.running('magnifier')); $('#qt-s10pad').classList.toggle('active', K.services.running('gamepad')); $('#qt-s10osk').classList.toggle('active', K.osk.isOpen()); };
    const tg = id => () => { K.services.running(id) ? K.services.stop(id) : K.services.start(id, true); sync(); };
    $('#qt-s10reader').onclick = tg('reader'); $('#qt-s10mag').onclick = tg('magnifier'); $('#qt-s10pad').onclick = tg('gamepad'); $('#qt-s10osk').onclick = () => { E.closeFlyouts(); K.osk.toggle(K.clip.lastEditable); sync(); };
    K.on('services', sync); $('#systray-quick-btn') && $('#systray-quick-btn').addEventListener('click', sync);
  }
  K.a11y10 = true;
})();

/* =====================================================================
   EISENKU OS 10.0 NEXT GENERATION · Escritorio avanzado
   Amplía el shell 8.0/9.0 sin sustituirlo:
   - Diseños de ajuste (Snap layouts), ajuste a esquinas con vista previa y asistente de ajuste.
   - Conmutador de ventanas (Alt+Shift+W), vista de todas las ventanas reales (exposé), animaciones
     configurables, recuerdo del tamaño y la posición de cada app.
   - Barra de tareas personalizable (tamaño, arriba/abajo, ocultación, etiquetas, botones, segundos).
   - Paneles laterales configurables y 13 widgets interactivos nuevos (colocación libre).
   - Historial del portapapeles (Ctrl+Alt+V), captura rápida de ideas (Ctrl+Alt+I), hoja de atajos.
   - Perfiles de escritorio y de pantalla, fondo por escritorio virtual y menús contextuales ampliados.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU; if (!E || !K || !K.v10) return;
  const S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, $ = K.$, $$ = K.$$, html = document.documentElement;
  const appOf = id => E.REG[id] || E.apps().find(a => a.id === id) || null;
  const winOf = id => document.getElementById('win-' + id);
  const px = v => parseInt(v, 10) || 0;
  const isOpen = w => w && w.classList.contains('open') && !w.classList.contains('minimized');
  const onDesk = w => !w.classList.contains('s9-otherdesk');
  Object.assign(K.PREF_DEF, { tbSize: 'md', tbPos: 'bottom', tbAutohide: false, tbLabels: false, tbHide: [], clockSec: false, winAnim: 'zoom', animSpeed: 1, rememberGeom: true, snapAssist: true, snapCorners: true, snapFly: true, widgetFree: false, deskWall: true, safeArea: 0 });
  const el = (tag, attrs, inner) => K.ui.el(tag, attrs || {}, inner || '');

  /* ================= 1. Área de trabajo y colocación de ventanas ================= */
  function area() {
    const cs = getComputedStyle(html); let top = px(cs.getPropertyValue('--top-h')), bottom = px(cs.getPropertyValue('--taskbar-h')), left = px(cs.getPropertyValue('--s10-pl')), right = px(cs.getPropertyValue('--s10-pr'));
    if (html.dataset.env === 'linux') { const pos = html.dataset.dock || 'bottom', ds = (px(cs.getPropertyValue('--dock-size')) || 46) + 30; bottom = 0; if (html.dataset.dockAutohide !== '1') { if (pos === 'bottom') bottom = ds; else if (pos === 'left') left += ds; else if (pos === 'right') right += ds; } }
    return { x: left, y: top, w: Math.max(200, innerWidth - left - right), h: Math.max(160, innerHeight - top - bottom) };
  }
  K.workArea = area;
  const zoneRect = (z, a = area()) => ({ x: Math.round(a.x + z[0] * a.w), y: Math.round(a.y + z[1] * a.h), w: Math.round(z[2] * a.w), h: Math.round(z[3] * a.h) });
  function place(w, r) {
    if (!w) return; const pr = (w.offsetParent || document.body).getBoundingClientRect();
    if (!w.dataset.prev) w.dataset.prev = JSON.stringify({ l: w.style.left, t: w.style.top, w: w.style.width, h: w.style.height });
    w.classList.remove('maximized', 'minimized'); w.classList.add('snapped');
    Object.assign(w.style, { left: (r.x - pr.left) + 'px', top: (r.y - pr.top) + 'px', width: r.w + 'px', height: r.h + 'px' });
    E.focusWindow(w); E.updateTaskbarButtons();
  }
  K.placeWindow = place;
  const LAYOUTS = K.SNAP_LAYOUTS = [
    { id: 'halves', n: 'Mitades', z: [[0, 0, .5, 1], [.5, 0, .5, 1]] },
    { id: 'l13', n: 'Un tercio y dos tercios', z: [[0, 0, 1 / 3, 1], [1 / 3, 0, 2 / 3, 1]] },
    { id: 'r13', n: 'Dos tercios y un tercio', z: [[0, 0, 2 / 3, 1], [2 / 3, 0, 1 / 3, 1]] },
    { id: 'thirds', n: 'Tercios', z: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]] },
    { id: 'quarters', n: 'Cuartos', z: [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]] },
    { id: 'main2', n: 'Principal y dos apiladas', z: [[0, 0, .5, 1], [.5, 0, .5, .5], [.5, .5, .5, .5]] },
    { id: 'rows', n: 'Arriba y abajo', z: [[0, 0, 1, .5], [0, .5, 1, .5]] },
    { id: 'center', n: 'Centrada', z: [[.12, .06, .76, .88]] }
  ];
  const activeWin = () => $('.window.active.open:not(.minimized):not(.s9-otherdesk)');

  /* ---------- 1a. Menú de diseños de ajuste (sobre el botón maximizar o Alt+Shift+Z) ---------- */
  let fly = null, flyFor = null, hoverT = 0;
  function snapFly(w, anchor) {
    closeFly(); if (!w) return; flyFor = w;
    fly = el('div', { id: 's10-snapfly', role: 'menu', 'aria-label': tr('Diseños de ajuste') });
    fly.innerHTML = `<b>${esc(tr('Diseños de ajuste'))}</b><div class="s10-lays">${LAYOUTS.map((L, li) => `<div class="s10-lay" title="${esc(tr(L.n))}">${L.z.map((z, zi) => `<button role="menuitem" data-lz="${li}:${zi}" aria-label="${esc(tr(L.n) + ' · ' + (zi + 1))}" style="left:${z[0] * 100}%;top:${z[1] * 100}%;width:${z[2] * 100}%;height:${z[3] * 100}%"></button>`).join('')}</div>`).join('')}</div><small>${esc(tr('Elige dónde poner la ventana. Luego puedes rellenar el resto de huecos.'))}</small>`;
    document.body.appendChild(fly);
    const r = anchor ? anchor.getBoundingClientRect() : { left: innerWidth / 2 - 150, bottom: innerHeight / 3, right: innerWidth / 2 + 150 };
    fly.style.left = Math.max(6, Math.min(innerWidth - fly.offsetWidth - 6, r.right - fly.offsetWidth)) + 'px'; fly.style.top = Math.max(6, Math.min(innerHeight - fly.offsetHeight - 6, r.bottom + 6)) + 'px';
    fly.querySelector('[data-lz]').focus();
    fly.addEventListener('click', e => { const b = e.target.closest('[data-lz]'); if (!b) return; const [li, zi] = b.dataset.lz.split(':').map(Number); const tgt = flyFor; closeFly(); applyLayout(tgt, LAYOUTS[li], zi); });
    fly.addEventListener('keydown', e => { const bs = $$('[data-lz]', fly), i = bs.indexOf(document.activeElement); if (e.key === 'Escape') { closeFly(); flyFor && flyFor.focus && flyFor.focus(); } else if (/^Arrow/.test(e.key)) { e.preventDefault(); bs[(i + (/Right|Down/.test(e.key) ? 1 : -1) + bs.length) % bs.length].focus(); } });
    fly.addEventListener('pointerleave', () => { clearTimeout(hoverT); hoverT = setTimeout(() => { if (fly && !fly.matches(':hover') && !fly.contains(document.activeElement)) closeFly(); }, 700); });
  }
  const closeFly = () => { if (fly) { fly.remove(); fly = null; } };
  window.addEventListener('pointerdown', e => { if (fly && !e.target.closest('#s10-snapfly')) closeFly(); }, true);
  document.addEventListener('pointerover', e => { const b = e.target.closest && e.target.closest('.window .win-ctrl-btn[data-act="max"]'); if (!b || !K.pref('snapFly') || e.pointerType === 'touch') return; clearTimeout(hoverT); hoverT = setTimeout(() => { if (b.matches(':hover')) snapFly(b.closest('.window'), b); }, 600); });
  document.addEventListener('contextmenu', e => { const b = e.target.closest && e.target.closest('.window .win-ctrl-btn[data-act="max"]'); if (!b) return; e.preventDefault(); e.stopPropagation(); snapFly(b.closest('.window'), b); }, true);
  function applyLayout(w, L, zi) {
    place(w, zoneRect(L.z[zi])); K.log && K.log('info', 'window', `Ajuste «${tr(L.n)}» aplicado a ${(appOf(w.id.slice(4)) || {}).name || w.id}`);
    const rest = L.z.map((z, i) => i).filter(i => i !== zi), others = $$('.window.open').filter(x => x !== w && onDesk(x));
    if (K.pref('snapAssist') && rest.length && others.length) assist(L, rest, [w]);
  }
  // asistente de ajuste: propone las otras ventanas para cada hueco libre
  function assist(L, zones, used) {
    $$('.s10-assist').forEach(x => x.remove()); if (!zones.length) return;
    const zi = zones[0], r = zoneRect(L.z[zi]), cands = $$('.window.open').filter(x => !used.includes(x) && onDesk(x));
    if (!cands.length) return;
    const box = el('div', { class: 's10-assist', role: 'dialog', 'aria-label': tr('Asistente de ajuste') });
    Object.assign(box.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    box.innerHTML = `<div><b>${esc(tr('¿Qué ventana va aquí?'))}</b><div class="s10-assist-l">${cands.map(x => { const a = appOf(x.id.slice(4)) || { name: x.id }; return `<button data-aw="${esc(x.id)}">${E.tile(a, 30)}<span>${esc(a.name)}</span></button>`; }).join('')}</div><button class="k9-btn" data-skip>${esc(tr('Omitir'))} (Esc)</button></div>`;
    document.body.appendChild(box); const f = box.querySelector('[data-aw]'); if (f) f.focus();
    box.addEventListener('click', e => { const b = e.target.closest('[data-aw]'); if (b) { const w = document.getElementById(b.dataset.aw); box.remove(); if (w) { w.classList.remove('minimized'); place(w, r); } assist(L, zones.slice(1), used.concat(w)); return; } if (e.target.closest('[data-skip]') || e.target === box) { box.remove(); assist(L, zones.slice(1), used); } });
    box.addEventListener('keydown', e => { if (e.key === 'Escape') { box.remove(); } const bs = $$('[data-aw]', box), i = bs.indexOf(document.activeElement); if (/^Arrow/.test(e.key) && bs.length) { e.preventDefault(); bs[(i + (/Right|Down/.test(e.key) ? 1 : -1) + bs.length) % bs.length].focus(); } });
  }
  K.snap = { layouts: LAYOUTS, apply: (w, layoutId, zone = 0) => { const L = LAYOUTS.find(x => x.id === layoutId); if (L && w) applyLayout(w, L, zone); }, fly: snapFly, place };

  /* ---------- 1b. Arrastrar a bordes y esquinas con vista previa ---------- */
  let dragW = null, dragZone = null, prevEl = null, dragStart = null;
  const showPrev = r => { if (!prevEl) { prevEl = el('div', { id: 's10-snapprev' }); document.body.appendChild(prevEl); } if (!r) { prevEl.hidden = true; return; } prevEl.hidden = false; Object.assign(prevEl.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); };
  document.addEventListener('pointerdown', e => { const h = e.target.closest && e.target.closest('.window-header'); if (!h || e.target.closest('button') || e.button > 0) return; const w = h.closest('.window'); if (w.classList.contains('maximized')) return; dragW = w; dragStart = [e.clientX, e.clientY]; dragZone = null; }, true);
  document.addEventListener('pointermove', e => {
    if (!dragW || !S.get('snap', true)) return; if (Math.hypot(e.clientX - dragStart[0], e.clientY - dragStart[1]) < 8) return;
    const a = area(), x = e.clientX, y = e.clientY, c = K.pref('snapCorners') ? 70 : -1; let z = null;
    if (x <= a.x + 8) z = y < a.y + c ? [0, 0, .5, .5] : y > a.y + a.h - c ? [0, .5, .5, .5] : [0, 0, .5, 1];
    else if (x >= a.x + a.w - 8) z = y < a.y + c ? [.5, 0, .5, .5] : y > a.y + a.h - c ? [.5, .5, .5, .5] : [.5, 0, .5, 1];
    else if (y <= a.y + 4) z = 'max';
    dragZone = z; showPrev(z === 'max' ? a : z ? zoneRect(z, a) : null);
  }, { passive: true });
  document.addEventListener('pointerup', () => { const w = dragW, z = dragZone; dragW = null; dragZone = null; showPrev(null); if (w && z && z !== 'max') setTimeout(() => place(w, zoneRect(z)), 0); }, true);
  // atajos de teclado para cuartos
  [['snapq1', 'Ajustar arriba a la izquierda', 'Alt+Shift+Home', [0, 0, .5, .5]], ['snapq2', 'Ajustar arriba a la derecha', 'Alt+Shift+PageUp', [.5, 0, .5, .5]], ['snapq3', 'Ajustar abajo a la izquierda', 'Alt+Shift+End', [0, .5, .5, .5]], ['snapq4', 'Ajustar abajo a la derecha', 'Alt+Shift+PageDown', [.5, .5, .5, .5]]]
    .forEach(([id, l, c, z]) => K.keys.register(id, l, c, () => { const w = activeWin(); if (w) place(w, zoneRect(z)); }, 'Ventanas'));
  K.keys.register('snaplayout', 'Diseños de ajuste de la ventana activa', 'Alt+Shift+Z', () => { const w = activeWin(); if (w) snapFly(w, w.querySelector('[data-act="max"]')); }, 'Ventanas');

  /* ================= 2. Conmutador de ventanas y orden de uso ================= */
  const mru = [];
  const touch = id => { const i = mru.indexOf(id); if (i >= 0) mru.splice(i, 1); mru.unshift(id); };
  document.addEventListener('eisen:open', e => touch(e.detail));
  document.addEventListener('eisen:close', e => { const i = mru.indexOf(e.detail); if (i >= 0) mru.splice(i, 1); });
  document.addEventListener('pointerdown', e => { const w = e.target.closest && e.target.closest('.window.open'); if (w) touch(w.id.slice(4)); }, true);
  let sw = null;
  const swList = () => mru.filter(id => { const w = winOf(id); return w && w.classList.contains('open'); }).concat($$('.window.open').map(w => w.id.slice(4)).filter(id => !mru.includes(id)));
  function switcher(dir = 1) {
    if (sw) { sw.i = (sw.i + dir + sw.ids.length) % sw.ids.length; drawSw(); return; }
    const ids = swList(); if (!ids.length) { E.toast(tr('No hay ventanas abiertas')); return; }
    sw = { ids, i: ids.length > 1 ? 1 : 0, el: el('div', { id: 's10-switch', role: 'listbox', 'aria-label': tr('Cambiar de ventana') }) };
    document.body.appendChild(sw.el); drawSw();
    sw.el.addEventListener('click', e => { const b = e.target.closest('[data-sw]'); if (b) { sw.i = +b.dataset.sw; swGo(); } });
  }
  function drawSw() {
    sw.el.innerHTML = `<div class="s10-sw-list">${sw.ids.map((id, i) => { const a = appOf(id) || { name: id }, w = winOf(id); const d = +(w && w.dataset.desk) || 0; return `<button role="option" aria-selected="${i === sw.i}" class="${i === sw.i ? 'on' : ''}" data-sw="${i}">${E.tile(a, 44)}<b>${esc(a.name)}</b><small>${w && w.classList.contains('minimized') ? esc(tr('Minimizada')) : ''}${d && K.desks && K.desks.count > 1 ? ' · ' + esc(K.desks.name(d)) : ''}</small></button>`; }).join('')}</div><p>${esc(tr('Suelta Alt para cambiar · Tab o flechas para elegir · Esc para cancelar'))}</p>`;
    const on = sw.el.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function swGo() { if (!sw) return; const id = sw.ids[sw.i]; sw.el.remove(); sw = null; if (id) { E.openWindow(id); touch(id); } }
  const swClose = () => { if (sw) { sw.el.remove(); sw = null; } };
  window.addEventListener('keydown', e => { if (!sw) return; if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); swClose(); } else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); swGo(); } else if (e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'ArrowDown' || (e.key.toLowerCase() === 'w' && e.altKey)) { e.preventDefault(); e.stopImmediatePropagation(); switcher(e.shiftKey && e.key === 'Tab' ? -1 : 1); } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); switcher(-1); } }, true);
  window.addEventListener('keyup', e => { if (sw && e.key === 'Alt') swGo(); }, true);
  window.addEventListener('blur', swClose);
  K.switcher = { open: switcher, go: swGo, close: swClose, mru: () => mru.slice() };
  K.keys.register('switcher', 'Cambiar de ventana (mantén Alt y repite)', 'Alt+Shift+W', () => switcher(1), 'Ventanas');

  /* ================= 3. Exposé: todas las ventanas reales del escritorio ================= */
  let exp = null;
  function expose() {
    if (exp) return exposeEnd();
    const wins = $$('.window.open:not(.minimized)').filter(onDesk); const mins = $$('.window.open.minimized').filter(onDesk);
    if (!wins.length && !mins.length) { E.toast(tr('No hay ventanas abiertas en este escritorio')); return; }
    E.closeFlyouts && E.closeFlyouts();
    const a = area(), pad = 26, n = Math.max(1, wins.length), cols = Math.ceil(Math.sqrt(n * a.w / a.h * .75)), rows = Math.ceil(n / cols);
    const cw = (a.w - pad * (cols + 1)) / cols, ch = (a.h - 70 - pad * (rows + 1)) / rows;
    const back = el('div', { id: 's10-expose', role: 'dialog', 'aria-label': tr('Todas las ventanas') });
    back.innerHTML = `<p>${esc(tr('Elige una ventana · Esc para volver'))}</p>${mins.length ? `<div class="s10-exp-min">${mins.map(w => { const ap = appOf(w.id.slice(4)) || { name: w.id }; return `<button data-ew="${esc(w.id)}">${E.tile(ap, 22)} ${esc(ap.name)}</button>`; }).join('')}</div>` : ''}`;
    document.body.appendChild(back); html.classList.add('s10-exp');
    exp = { back, wins: wins.map((w, i) => { const r = w.getBoundingClientRect(), c = i % cols, rI = Math.floor(i / cols); const cx = a.x + pad + c * (cw + pad) + cw / 2, cy = a.y + 50 + pad + rI * (ch + pad) + ch / 2; const s = Math.min(1, cw / r.width, ch / r.height) * .96; const o = { w, z: w.style.zIndex, tf: w.style.transform, tr: w.style.transition }; w.style.transition = 'transform .28s var(--e9-ease)'; w.style.zIndex = 9601 + i; w.style.transform = `translate(${cx - (r.left + r.width / 2)}px, ${cy - (r.top + r.height / 2)}px) scale(${s})`; w.dataset.expLabel = (appOf(w.id.slice(4)) || {}).name || ''; return o; }) };
    exp.click = e => { const w = e.target.closest('.window'); if (w && exp && exp.wins.some(o => o.w === w)) { e.preventDefault(); e.stopPropagation(); exposeEnd(w); } };
    exp.pd = e => { if (e.target.closest && e.target.closest('.window')) e.stopPropagation(); };   // que la ventana no cambie de capa antes del clic
    document.addEventListener('click', exp.click, true); window.addEventListener('pointerdown', exp.pd, true);
    back.addEventListener('click', e => { const b = e.target.closest('[data-ew]'); if (b) { exposeEnd(); E.openWindow(b.dataset.ew.slice(4)); return; } exposeEnd(); });
  }
  function exposeEnd(pick) {
    if (!exp) return; const x = exp; exp = null; document.removeEventListener('click', x.click, true); window.removeEventListener('pointerdown', x.pd, true); html.classList.remove('s10-exp');
    x.wins.forEach(o => { o.w.style.transform = o.tf || ''; setTimeout(() => { o.w.style.transition = o.tr || ''; o.w.style.zIndex = o.z; delete o.w.dataset.expLabel; if (pick === o.w) E.focusWindow(o.w); }, 290); });
    x.back.remove(); if (pick) { E.focusWindow(pick); touch(pick.id.slice(4)); }
  }
  window.addEventListener('keydown', e => { if (exp && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); exposeEnd(); } }, true);
  K.expose = { open: expose, close: exposeEnd, active: () => !!exp };
  K.keys.register('expose', 'Ver todas las ventanas (exposé)', 'Ctrl+Alt+W', () => expose(), 'Ventanas');
  // botón en la vista general de 9.0
  const ov = $('#s9-overview'); if (ov) new MutationObserver(() => { if (!ov.hidden && !ov.querySelector('[data-s10exp]')) { const b = el('button', { class: 'k9-btn s10-ovbtn', 'data-s10exp': '1' }, `${I('grid', 15)} ${esc(tr('Ver las ventanas a tamaño real'))}`); b.onclick = e => { e.stopPropagation(); ov.hidden = true; expose(); }; const d = ov.querySelector('.s9-ov-desks'); if (d) d.after(b); } }).observe(ov, { childList: true, attributes: true, attributeFilter: ['hidden'] });

  /* ================= 4. Animaciones, recuerdo de tamaño y posición ================= */
  const applyAnim = () => { html.dataset.winanim = K.pref('winAnim') || 'zoom'; html.style.setProperty('--s10-anim', String(Math.max(.25, Math.min(3, +K.pref('animSpeed') || 1)))); };
  applyAnim(); K.on('pref', p => { if (p && /^(winAnim|animSpeed)$/.test(p.k)) applyAnim(); });
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('.window .win-ctrl-btn[data-act="min"],.window .win-ctrl-btn[data-act="close"]'); if (!b || b.__s10skip) return;
    if (html.classList.contains('reduce-motion') || html.classList.contains('low-power') || K.pref('winAnim') === 'none') return;
    const w = b.closest('.window'); if (!w || !w.classList.contains('open') || w.classList.contains('maximized') && b.dataset.act === 'min' && innerWidth < 700) return;
    e.stopPropagation(); e.preventDefault(); w.classList.add(b.dataset.act === 'min' ? 's10-out-min' : 's10-out');
    setTimeout(() => { w.classList.remove('s10-out', 's10-out-min'); b.__s10skip = true; b.click(); b.__s10skip = false; }, Math.round(150 / (+K.pref('animSpeed') || 1)));
  }, true);
  const GK = 'os10_geom', geo = () => S.get(GK, {}) || {};
  const saveGeo = w => { if (!w || !K.pref('rememberGeom') || innerWidth < 700) return; const id = w.id.slice(4); const g = geo(); if (w.classList.contains('maximized')) g[id] = Object.assign(g[id] || {}, { max: true }); else if (!w.classList.contains('snapped') && w.style.width) g[id] = { l: w.style.left, t: w.style.top, w: w.style.width, h: w.style.height, max: false }; S.set(GK, g); };
  document.addEventListener('eisen:close', e => saveGeo(winOf(e.detail)));
  window.addEventListener('pagehide', () => $$('.window.open').forEach(saveGeo));
  let geoT = 0; document.addEventListener('pointerup', e => { const w = e.target.closest && e.target.closest('.window'); if (w) { clearTimeout(geoT); geoT = setTimeout(() => saveGeo(w), 400); } }, true);
  document.addEventListener('eisen:open', e => { const w = winOf(e.detail); if (!w || w.__s10geo) return; w.__s10geo = true; if (!K.pref('rememberGeom') || innerWidth < 700) return; const g = geo()[e.detail]; if (!g) return; if (g.max) { w.classList.add('maximized'); E.updateTaskbarButtons(); } else if (g.w) { Object.assign(w.style, { left: g.l, top: g.t, width: g.w, height: g.h }); requestAnimationFrame(() => K.fitWindow && K.fitWindow(w)); } });
  K.forgetGeometry = () => S.set(GK, {});

  /* ================= 5. Barra de tareas personalizable ================= */
  const TBH = { sm: [40, 36], md: [48, 42], lg: [58, 52] };
  function applyTb() {
    const p = K.prefs(), win = html.dataset.env !== 'linux', dense = html.classList.contains('dense');
    const h = (TBH[p.tbSize] || TBH.md)[dense ? 1 : 0], top = win && p.tbPos === 'top', hide = win && !!p.tbAutohide;
    html.dataset.tbsize = p.tbSize || 'md'; html.dataset.tbpos = top ? 'top' : 'bottom'; html.dataset.tbautohide = hide ? '1' : '0'; html.dataset.tblabels = p.tbLabels ? '1' : '0'; html.dataset.tbhide = (Array.isArray(p.tbHide) ? p.tbHide : []).join(' ');
    html.style.setProperty('--s10-tb-h', h + 'px');
    if (win) { html.style.setProperty('--top-h', top && !hide ? h + 'px' : '0px'); html.style.setProperty('--taskbar-h', top || hide ? '0px' : h + 'px'); }
    else html.style.removeProperty('--taskbar-h');
    tbEdge.hidden = !hide; tbEdge.dataset.pos = top ? 'top' : 'bottom';
  }
  const tbEdge = el('div', { id: 's10-tb-edge' }); document.body.appendChild(tbEdge);
  tbEdge.addEventListener('pointerenter', () => html.classList.add('s10-tbpeek'));
  const tbar = $('#taskbar'); if (tbar) tbar.addEventListener('pointerleave', () => setTimeout(() => { if (!tbar.matches(':hover') && !$('#start-menu-panel.open,#action-center.open,#s9-nc.open,#s9-wpanel.open')) html.classList.remove('s10-tbpeek'); }, 500));
  window.addEventListener('pointerdown', e => { if (html.classList.contains('s10-tbpeek') && !e.target.closest('#taskbar,#start-menu-panel,#action-center,#s9-nc,#s9-wpanel,#s10-tb-edge')) html.classList.remove('s10-tbpeek'); }, true);
  applyTb(); K.on('pref', p => { if (p && /^(tb|density)/.test(p.k)) applyTb(); }); document.addEventListener('eisen:env', () => setTimeout(applyTb, 0));
  K.applyTaskbar = applyTb;
  // reloj con segundos (opcional)
  setInterval(() => { if (!K.pref('clockSec') || document.hidden) return; const t = $('#clock-time'); if (t) t.textContent = new Date().toLocaleTimeString(K.locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }, 1000);

  /* ================= 6. Fondo por escritorio virtual ================= */
  const DWK = 'os10_deskwp';
  const wallCss = v => !v ? '' : /^(https:|data:image\/|blob:)/i.test(v) ? `url("${v.replace(/"/g, '%22')}")` : (E.WALLPAPERS || {})[v] || '';
  const baseWall = () => { const wp = S.get('wp', 'e9-noir'); return wp === 'custom' ? wallCss(S.get('customWallpaper', '')) : wallCss(wp); };
  function deskWall(n) { const vp = $('#desktop-viewport'); if (!vp || !K.pref('deskWall')) return; const m = S.get(DWK, {}) || {}; const css = wallCss(m[n]) || baseWall(); if (css) { vp.style.backgroundImage = css; vp.style.backgroundSize = 'cover'; } }
  K.on('desk', n => deskWall(n));
  K.deskWall = { set(n, v) { const m = S.get(DWK, {}) || {}; if (v) m[n] = v; else delete m[n]; S.set(DWK, m); deskWall(n); }, get: n => (S.get(DWK, {}) || {})[n] || '', apply: deskWall };

  /* ================= 7. Widgets interactivos nuevos y colocación libre ================= */
  const W = K.widgets, pad2 = n => String(n).padStart(2, '0');
  const tasksL = () => (S.get('tasks', []) || []).filter(Boolean);
  W.register('calc', { name: 'Calculadora rápida', icon: '🧮', render(b) { if (b.__s10) return; b.__s10 = 1; b.innerHTML = `<input class="input-text" data-cx placeholder="2*(3+4)^2 · sqrt(2) · sin(pi/2)" aria-label="${esc(tr('Expresión'))}"><b class="s10-w-big" data-cr>0</b>`; const i = b.querySelector('[data-cx]'), r = b.querySelector('[data-cr]'); i.addEventListener('input', () => { try { const v = E.math.eval(i.value || '0'); r.textContent = Number.isFinite(v) ? +v.toPrecision(12) + '' : '—'; } catch { r.textContent = '…'; } }); i.addEventListener('keydown', e => { if (e.key === 'Enter' && r.textContent !== '…') { i.value = r.textContent; } }); } });
  W.register('todo', { name: 'Tareas', icon: '✅', every: 30000, render(b) { const l = tasksL().filter(t => !t.done).slice(0, 6); b.innerHTML = `<ul class="s10-w-todo">${l.map(t => `<li><label><input type="checkbox" data-td="${esc(t.id)}"> ${esc(t.t || t.text || '')}</label></li>`).join('') || `<li class="eis-muted">${esc(tr('Sin tareas pendientes'))}</li>`}</ul><form data-tf><input class="input-text" placeholder="${esc(tr('Nueva tarea…'))}" aria-label="${esc(tr('Nueva tarea'))}"></form>`; b.onchange = e => { const c = e.target.closest('[data-td]'); if (!c) return; const all = tasksL(), t = all.find(x => x.id === c.dataset.td); if (t) { t.done = true; S.set('tasks', all); if (E.tasksRefresh) E.tasksRefresh(); } setTimeout(() => this.render(b), 250); }; b.querySelector('[data-tf]').onsubmit = e => { e.preventDefault(); const v = e.target.querySelector('input').value.trim(); if (v) { E.addTask(v); this.render(b); } }; } });
  W.register('sticky', { name: 'Nota adhesiva', icon: '🟨', render(b) { if (b.__s10) return; b.__s10 = 1; b.innerHTML = `<textarea class="s10-w-sticky" placeholder="${esc(tr('Escribe aquí…'))}" aria-label="${esc(tr('Nota adhesiva'))}"></textarea>`; const t = b.querySelector('textarea'); t.value = S.get('os10_w_sticky', ''); t.addEventListener('input', K.u10.debounce(() => S.set('os10_w_sticky', t.value.slice(0, 5000)), 300)); } });
  W.register('timer', { name: 'Temporizador', icon: '⏱️', every: 250, render(b) { const st = S.get('os10_w_timer', null); const left = st && st.end ? Math.max(0, st.end - Date.now()) : 0, sw0 = st && st.sw ? Date.now() - st.sw : 0; if (st && st.end && !left && !st.fired) { st.fired = true; S.set('os10_w_timer', st); E.notify(tr('Temporizador'), tr('¡Tiempo!'), '⏱️'); K.sound && K.sound('end'); } const show = st && st.end ? K.u10.hms(Math.ceil(left / 1000)) : st && st.sw ? K.u10.hms(sw0 / 1000) + '.' + Math.floor(sw0 % 1000 / 100) : '0:00'; if (!b.querySelector('[data-tt]')) { b.innerHTML = `<b class="s10-w-big" data-tt></b><div class="k9-row"><button class="k9-btn" data-tm="1">1 min</button><button class="k9-btn" data-tm="5">5</button><button class="k9-btn" data-tm="15">15</button><button class="k9-btn" data-tsw>${esc(tr('Cronómetro'))}</button><button class="k9-btn" data-tx>✕</button></div>`; b.onclick = e => { const m = e.target.closest('[data-tm]'); if (m) S.set('os10_w_timer', { end: Date.now() + +m.dataset.tm * 60000 }); if (e.target.closest('[data-tsw]')) S.set('os10_w_timer', { sw: Date.now() }); if (e.target.closest('[data-tx]')) S.set('os10_w_timer', null); }; } b.querySelector('[data-tt]').textContent = show; } });
  W.register('worldclock', { name: 'Relojes del mundo', icon: '🌍', every: 30000, render(b) { const z = S.get('os10_w_zones', ['America/Mexico_City', 'Europe/Madrid', 'Asia/Tokyo']) || []; b.innerHTML = `<ul>${z.map(tz => { let t = '—'; try { t = new Date().toLocaleTimeString(K.locale, { hour: '2-digit', minute: '2-digit', timeZone: tz }); } catch { /* zona no válida */ } return `<li><small>${esc(tz.split('/').pop().replace(/_/g, ' '))}</small> <b>${esc(t)}</b></li>`; }).join('')}</ul><button class="k9-btn k9-small" data-wz>${esc(tr('Cambiar ciudades'))}</button>`; b.querySelector('[data-wz]').onclick = async () => { const v = await K.ui.prompt(tr('Zonas horarias'), tr('Separadas por comas (p. ej. America/Bogota, Europe/London)'), z.join(', ')); if (v != null) { S.set('os10_w_zones', v.split(',').map(x => x.trim()).filter(x => { try { new Intl.DateTimeFormat('en', { timeZone: x }); return true; } catch { return false; } }).slice(0, 6)); this.render(b); } }; } });
  const perfHist = [];
  W.register('perf', { name: 'Rendimiento en vivo', icon: '📊', every: 1000, render(b) { if (!b.querySelector('canvas')) b.innerHTML = `<canvas class="s10-w-cv" height="60"></canvas><small class="eis-muted" data-pf></small>`; const f = K.perf10 ? K.perf10.fps() : 0; perfHist.push(f); if (perfHist.length > 60) perfHist.shift(); K.u10.chart(b.querySelector('canvas'), [{ v: perfHist, c: '#34a582', fill: 'rgba(52,165,130,.12)' }], { max: 70, min: 0, label: 'FPS' }); b.querySelector('[data-pf]').textContent = `${f} FPS · ${performance.memory ? K.fmt.bytes(performance.memory.usedJSHeapSize) : '—'} · ${$$('.window.open').length} ${tr('ventanas')}`; } });
  W.register('clipboard', { name: 'Portapapeles', icon: '📋', every: 5000, render(b) { const l = K.clip.list().slice(0, 5); b.innerHTML = l.length ? `<ul class="s10-w-clip">${l.map(x => `<li><button data-cc="${esc(x.id)}" title="${esc(tr('Copiar'))}">${esc(x.text.slice(0, 70))}</button></li>`).join('')}</ul>` : `<p class="eis-muted k9-small">${esc(tr('Copia algo y aparecerá aquí.'))}</p>`; b.onclick = e => { const c = e.target.closest('[data-cc]'); if (c) { const x = K.clip.list().find(y => y.id === c.dataset.cc); if (x) K.ui.copy(x.text); } }; } });
  W.register('photo', { name: 'Marco de fotos', icon: '🖼️', every: 60000, render(b) { K.files.all().then(l => { const imgs = l.filter(f => K.files.kindOf(f) === 'image' && f.size < 15e6); if (!imgs.length) { b.innerHTML = `<p class="eis-muted k9-small">${esc(tr('Guarda imágenes en Archivos para verlas aquí.'))}</p>`; return; } const f = imgs[Math.floor(Math.random() * imgs.length)]; if (b.__u) URL.revokeObjectURL(b.__u); b.__u = URL.createObjectURL(f.blob); b.innerHTML = `<img class="s10-w-photo" src="${b.__u}" alt="${esc(f.name)}" title="${esc(f.name)}">`; b.onclick = () => this.render(b); }).catch(() => { b.textContent = '—'; }); } });
  W.register('countdown', { name: 'Cuenta atrás', icon: '📆', every: 60000, render(b) { const c = S.get('os10_w_count', null); const days = c ? Math.ceil((new Date(c.d + 'T00:00') - new Date(new Date().toDateString())) / 864e5) : null; b.innerHTML = c ? `<b class="s10-w-big">${days}</b><span>${esc(tr(days === 1 ? 'día para' : 'días para'))} ${esc(c.t)}</span>` : `<p class="eis-muted k9-small">${esc(tr('Cuenta los días que faltan para algo importante.'))}</p>`; b.insertAdjacentHTML('beforeend', `<button class="k9-btn k9-small" data-cd>${esc(tr('Elegir fecha'))}</button>`); b.querySelector('[data-cd]').onclick = async () => { const r = await E.form({ title: tr('Cuenta atrás'), fields: [{ k: 't', label: tr('Evento'), value: c ? c.t : '' }, { k: 'd', label: tr('Fecha'), type: 'date', value: c ? c.d : '' }], ok: tr('Guardar') }); if (r && r.d) { S.set('os10_w_count', { t: r.t || tr('el evento'), d: r.d }); this.render(b); } }; } });
  W.register('battery', { name: 'Batería y red', icon: '🔋', every: 20000, render(b) { const c = navigator.connection || {}; const net = `${navigator.onLine ? '📶 ' + esc(tr('En línea')) : '⚠️ ' + esc(tr('Sin conexión'))}${c.effectiveType ? ' · ' + esc(c.effectiveType) : ''}${c.downlink ? ' · ~' + c.downlink + ' Mb/s' : ''}`; if (!navigator.getBattery) { b.innerHTML = `<p class="k9-small">${net}</p><p class="eis-muted k9-small">${esc(tr('Este navegador no informa de la batería.'))}</p>`; return; } navigator.getBattery().then(x => { b.innerHTML = `<b class="s10-w-big">${Math.round(x.level * 100)}%</b><span>${x.charging ? '⚡ ' + esc(tr('Cargando')) : esc(tr('Con batería'))}</span><p class="k9-small" style="margin-top:6px">${net}</p>`; }).catch(() => { b.innerHTML = `<p class="k9-small">${net}</p>`; }); } });
  W.register('ideas', { name: 'Ideas', icon: '💡', every: 30000, render(b) { const l = (S.get('ideas_list', []) || []).filter(x => !x.done).slice(0, 4); b.innerHTML = `<ul>${l.map(x => `<li>• ${esc(x.text.slice(0, 80))}</li>`).join('') || `<li class="eis-muted">${esc(tr('Aún no hay ideas'))}</li>`}</ul><button class="k9-btn k9-small" data-ic>${I('plus', 13)} ${esc(tr('Capturar idea'))} <kbd>Ctrl+Alt+I</kbd></button>`; b.querySelector('[data-ic]').onclick = () => K.capture.open(); } });
  W.register('launcher', { name: 'Lanzador', icon: '🚀', render(b) { const l = (S.get('pinned', []) || []).map(appOf).filter(Boolean).slice(0, 10); b.innerHTML = `<div class="s10-w-launch">${l.map(a => `<button data-la="${esc(a.id)}">${E.tile(a, 24)}<span>${esc(a.name)}</span></button>`).join('')}</div>`; b.onclick = e => { const x = e.target.closest('[data-la]'); if (x) E.launch(x.dataset.la); }; } });
  W.register('desktops', { name: 'Escritorios', icon: '🗂️', render(b) { const D = K.desks; b.innerHTML = `<div class="k9-row">${Array.from({ length: D.count }, (_, i) => `<button class="k9-btn${i + 1 === D.cur ? ' on' : ''}" data-dk="${i + 1}" title="${esc(D.name(i + 1))}">${i + 1}</button>`).join('')}<button class="k9-btn" data-dka title="${esc(tr('Nuevo escritorio'))}">＋</button></div>`; b.onclick = e => { const x = e.target.closest('[data-dk]'); if (x) D.go(+x.dataset.dk); if (e.target.closest('[data-dka]')) D.add(); setTimeout(() => this.render(b), 50); }; } });
  K.on('desk', () => $$('.s9-w-desktops [data-wb],.s10-pw-desktops [data-wb]').forEach(b => W.all().desktops.render(b)));
  // colocación libre de los widgets en el escritorio (arrastrar por el título)
  const WPK = 'os10_wpos', layer = $('#s9-widgets');
  const r0 = W.render; W.render = () => { r0(); freeLayout(); };
  if (layer) { let ft = 0; new MutationObserver(() => { clearTimeout(ft); ft = setTimeout(freeLayout, 30); }).observe(layer, { childList: true }); }
  function freeLayout() {
    if (!layer) return; const free = !!K.pref('widgetFree'); layer.classList.toggle('s10-free', free); if (!free) return;
    const pos = S.get(WPK, {}) || {}; let y = 14;
    $$('.s9-w', layer).forEach(c => { const id = c.dataset.w, p = pos[id]; c.style.left = (p ? p.x : innerWidth - 290) + 'px'; c.style.top = (p ? p.y : y) + 'px'; if (!p) y += (c.offsetHeight || 120) + 10; });
  }
  if (layer) layer.addEventListener('pointerdown', e => {
    const h = e.target.closest('.s10-free .s9-w > h6'); if (!h) return; e.preventDefault(); const c = h.parentElement, r = c.getBoundingClientRect(), lr = layer.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    const mv = ev => { c.style.left = Math.max(0, Math.min(lr.width - 60, ev.clientX - lr.left - dx)) + 'px'; c.style.top = Math.max(0, Math.min(lr.height - 30, ev.clientY - lr.top - dy)) + 'px'; };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); const p = S.get(WPK, {}) || {}; p[c.dataset.w] = { x: px(c.style.left), y: px(c.style.top) }; S.set(WPK, p); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  });
  K.on('pref', p => { if (p && p.k === 'widgetFree') W.render(); });
  W.render();

  /* ================= 8. Paneles laterales configurables ================= */
  const PK = 'os10_panels';
  const pcfg = () => Object.assign({ left: { on: false, items: ['launcher', 'desktops', 'clipboard'] }, right: { on: false, items: ['clock', 'agenda', 'todo', 'perf'] }, pin: false, w: 300, edge: false }, S.get(PK, {}) || {});
  const panels = {};
  const pTimers = new Set();
  function drawPanel(side) {
    const c = pcfg(), conf = c[side], p = panels[side] || (panels[side] = el('aside', { class: 's10-panel s10-panel-' + side, 'aria-label': tr(side === 'left' ? 'Panel lateral izquierdo' : 'Panel lateral derecho') }));
    if (!p.isConnected) document.body.appendChild(p);
    p.style.setProperty('--s10-pw', (+c.w || 300) + 'px');
    p.innerHTML = `<header><b>${esc(tr(side === 'left' ? 'Panel izquierdo' : 'Panel derecho'))}</b><button class="k9-btn" data-pcfg title="${esc(tr('Personalizar panel'))}">${I('settings', 14)}</button><button class="k9-btn" data-ppin title="${esc(tr('Fijar: las ventanas maximizadas dejan su espacio'))}" aria-pressed="${!!c.pin}">${I('pin', 14)}</button><button class="k9-btn" data-px aria-label="${esc(tr('Cerrar'))}">${I('close', 14)}</button></header><div class="s10-panel-body"></div>`;
    const body = p.querySelector('.s10-panel-body'), all = W.all();
    (conf.items || []).forEach(id => { const d = all[id]; if (!d) return; const card = el('section', { class: 's10-pw s10-pw-' + id }); card.innerHTML = `<h6>${d.icon} ${esc(tr(d.name))}</h6><div data-wb></div>`; body.appendChild(card); const b = card.querySelector('[data-wb]'); const draw = () => { try { d.render.call(d, b); } catch { b.textContent = '—'; } }; draw(); if (d.every) { const t = setInterval(() => { if (!card.isConnected) { clearInterval(t); pTimers.delete(t); return; } if (!document.hidden && p.classList.contains('open') && !html.classList.contains('low-power')) draw(); }, Math.max(1000, d.every)); pTimers.add(t); } });
    if (!body.children.length) body.innerHTML = `<p class="eis-muted k9-small" style="padding:10px">${esc(tr('Panel vacío: pulsa el engranaje para elegir qué mostrar.'))}</p>`;
  }
  function setPanel(side, on) {
    const c = pcfg(); c[side].on = on; S.set(PK, c);
    if (on) drawPanel(side); const p = panels[side]; if (p) p.classList.toggle('open', on);
    reserve(); K.emit('panels');
  }
  function reserve() { const c = pcfg(), w = (+c.w || 300) + 8; html.style.setProperty('--s10-pl', c.pin && c.left.on ? w + 'px' : '0px'); html.style.setProperty('--s10-pr', c.pin && c.right.on ? w + 'px' : '0px'); html.classList.toggle('s10-pin', !!c.pin); }
  async function panelCustomize(side) {
    const c = pcfg(), all = W.all();
    const ov = el('div', { class: 'eis-modal' });
    ov.innerHTML = `<form class="eis-modal-card"><h3>${esc(tr(side === 'left' ? 'Panel izquierdo' : 'Panel derecho'))}</h3><p class="eis-muted k9-small">${esc(tr('Elige y ordena lo que muestra el panel (el orden de marcado es el orden de aparición).'))}</p><div class="s10-pick">${Object.entries(all).map(([id, d]) => `<label><input type="checkbox" name="${id}" ${c[side].items.includes(id) ? 'checked' : ''}> ${d.icon} ${esc(tr(d.name))}</label>`).join('')}</div><label class="eis-field"><span>${esc(tr('Ancho'))}</span><input type="range" name="__w" min="240" max="440" step="10" value="${+c.w || 300}"></label><label class="ap-check-l" style="display:flex;gap:8px"><input type="checkbox" name="__edge" ${c.edge ? 'checked' : ''}> ${esc(tr('Abrir al llevar el puntero al borde de la pantalla'))}</label><div class="eis-modal-btns"><button type="button" class="btn-secondary" data-x>${esc(tr('Cancelar'))}</button><button class="btn-primary">${esc(tr('Guardar'))}</button></div></form>`;
    document.body.appendChild(ov);
    const order = c[side].items.slice(); ov.addEventListener('change', e => { if (e.target.type === 'checkbox' && !e.target.name.startsWith('__')) { const i = order.indexOf(e.target.name); if (e.target.checked && i < 0) order.push(e.target.name); if (!e.target.checked && i >= 0) order.splice(i, 1); } });
    const f = ov.querySelector('form'); f.onsubmit = e => { e.preventDefault(); const c2 = pcfg(); c2[side].items = order.filter(id => all[id]); c2.w = +f.elements.__w.value; c2.edge = f.elements.__edge.checked; S.set(PK, c2); ov.remove(); edges(); if (c2[side].on) drawPanel(side); reserve(); };
    ov.querySelector('[data-x]').onclick = () => ov.remove();
  }
  document.addEventListener('click', e => { const p = e.target.closest && e.target.closest('.s10-panel'); if (!p) return; const side = p.classList.contains('s10-panel-left') ? 'left' : 'right'; if (e.target.closest('[data-px]')) setPanel(side, false); if (e.target.closest('[data-pcfg]')) panelCustomize(side); if (e.target.closest('[data-ppin]')) { const c = pcfg(); c.pin = !c.pin; S.set(PK, c); reserve(); $$('[data-ppin]').forEach(b => b.setAttribute('aria-pressed', String(c.pin))); } });
  const edgeEls = {};
  function edges() { const c = pcfg(); ['left', 'right'].forEach(side => { if (c.edge && !edgeEls[side]) { const d = el('div', { class: 's10-pedge s10-pedge-' + side }); d.addEventListener('pointerenter', () => { if (!pcfg()[side].on) setPanel(side, true); }); document.body.appendChild(d); edgeEls[side] = d; } else if (!c.edge && edgeEls[side]) { edgeEls[side].remove(); delete edgeEls[side]; } }); }
  K.panels = { toggle: side => setPanel(side, !pcfg()[side].on), set: setPanel, customize: panelCustomize, cfg: pcfg, save: c => { S.set(PK, c); edges(); reserve(); ['left', 'right'].forEach(s => { if (c[s].on) drawPanel(s); }); } };
  { const c = pcfg(); ['left', 'right'].forEach(s => { if (c[s].on) setPanel(s, true); }); edges(); reserve(); }
  K.keys.register('panelr', 'Panel lateral derecho', 'Ctrl+Alt+P', () => K.panels.toggle('right'), 'Escritorio');
  K.keys.register('panell', 'Panel lateral izquierdo', 'Ctrl+Alt+O', () => K.panels.toggle('left'), 'Escritorio');

  /* ================= 9. Historial del portapapeles (Ctrl+Alt+V) ================= */
  let clipEl = null;
  function clipOpen() {
    if (clipEl) return clipClose(); E.closeFlyouts && E.closeFlyouts();
    clipEl = el('div', { id: 's10-clip', role: 'dialog', 'aria-label': tr('Historial del portapapeles') });
    clipEl.innerHTML = `<header>${I('copy', 16)}<b>${esc(tr('Portapapeles'))}</b><span class="sp"></span><button class="k9-btn" data-csys title="${esc(tr('Añadir lo que hay ahora en el portapapeles del sistema'))}">${I('download', 14)}</button><button class="k9-btn" data-cclr>${esc(tr('Borrar'))}</button></header><input class="input-text" data-cq placeholder="${esc(tr('Buscar en el historial…'))}" aria-label="${esc(tr('Buscar'))}"><div class="s10-clip-l" data-cl role="listbox"></div><footer data-cf></footer>`;
    document.body.appendChild(clipEl); clipDraw(); setTimeout(() => clipEl && clipEl.querySelector('[data-cq]').focus(), 30);
  }
  function clipDraw() {
    if (!clipEl) return; const q = K.norm(clipEl.querySelector('[data-cq]').value || ''), l = K.clip.list().filter(x => !q || K.norm(x.text).includes(q)), on = K.services.running('clipboard');
    clipEl.querySelector('[data-cl]').innerHTML = l.map((x, i) => `<div class="s10-clip-it${x.pin ? ' pin' : ''}" role="option" tabindex="0" data-ci="${esc(x.id)}"><p>${esc(x.text.slice(0, 400))}</p><small>${esc(K.fmt.rel(x.t))}${x.app && appOf(x.app) ? ' · ' + esc(appOf(x.app).name) : ''}</small><div class="s10-clip-a"><button data-cpin="${esc(x.id)}" title="${esc(x.pin ? tr('Desfijar') : tr('Fijar'))}">${I('pin', 13)}</button><button data-cdel="${esc(x.id)}" title="${esc(tr('Eliminar'))}">${I('trash', 13)}</button></div></div>`).join('') || `<div class="k9-state" style="min-height:120px">${I('copy', 28)}<p>${esc(on ? tr('Copia texto en cualquier app y aparecerá aquí.') : tr('El historial está en pausa.'))}</p></div>`;
    clipEl.querySelector('[data-cf]').innerHTML = `<span>${esc(tr('Enter pega en el último campo · Ctrl+C copia'))}</span><button class="k9-btn" data-cpause>${esc(on ? tr('Pausar') : tr('Reanudar'))}</button>`;
  }
  async function clipPaste(id) {
    const x = K.clip.list().find(y => y.id === id); if (!x) return; const target = K.clip.lastEditable; clipClose();
    try { await navigator.clipboard.writeText(x.text); } catch { /* sin permiso: se pega igualmente en EISENKU */ }
    if (target && target.isConnected) { target.focus(); let ok = false; try { ok = document.execCommand('insertText', false, x.text); } catch { ok = false; } if (!ok && 'value' in target) { const s = target.selectionStart || 0, e = target.selectionEnd || 0; target.value = target.value.slice(0, s) + x.text + target.value.slice(e); target.dispatchEvent(new Event('input', { bubbles: true })); } E.toast(tr('Pegado')); }
    else E.toast(tr('Copiado: pégalo con Ctrl+V'));
  }
  const clipClose = () => { if (clipEl) { clipEl.remove(); clipEl = null; } };
  document.addEventListener('click', async e => {
    if (!clipEl || !clipEl.contains(e.target)) { if (clipEl && !e.target.closest('#s10-clip,.eis-modal,#qt-s10clip')) clipClose(); return; }
    const p = e.target.closest('[data-cpin]'); if (p) { K.clip.pin(p.dataset.cpin); clipDraw(); return; }
    const d = e.target.closest('[data-cdel]'); if (d) { K.clip.remove(d.dataset.cdel); clipDraw(); return; }
    if (e.target.closest('[data-cclr]')) { K.clip.clear(false); clipDraw(); return; }
    if (e.target.closest('[data-cpause]')) { K.services.running('clipboard') ? K.services.stop('clipboard') : K.services.start('clipboard'); clipDraw(); return; }
    if (e.target.closest('[data-csys]')) { try { const t = await navigator.clipboard.readText(); if (t) { K.clip.add(t, 'system'); clipDraw(); } else E.toast(tr('El portapapeles está vacío')); } catch { E.toast(tr('El navegador no permitió leer el portapapeles')); } return; }
    const it = e.target.closest('[data-ci]'); if (it) clipPaste(it.dataset.ci);
  });
  document.addEventListener('input', e => { if (clipEl && e.target.matches('[data-cq]')) clipDraw(); });
  document.addEventListener('keydown', e => {
    if (!clipEl || !clipEl.contains(e.target)) return; const its = $$('[data-ci]', clipEl), i = its.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); clipClose(); } else if (e.key === 'ArrowDown') { e.preventDefault(); (its[i + 1] || its[0]) && (its[i + 1] || its[0]).focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) its[i - 1].focus(); else clipEl.querySelector('[data-cq]').focus(); }
    else if (e.key === 'Enter') { e.preventDefault(); const t = i >= 0 ? its[i] : its[0]; if (t) clipPaste(t.dataset.ci); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && i >= 0) { const x = K.clip.list().find(y => y.id === its[i].dataset.ci); if (x) K.ui.copy(x.text); }
  });
  K.on('clip', () => clipDraw());
  K.clipPanel = { open: clipOpen, close: clipClose };
  K.keys.register('clip', 'Historial del portapapeles', 'Ctrl+Alt+V', () => clipOpen(), 'Sistema');

  /* ================= 10. Captura rápida de ideas (Ctrl+Alt+I) ================= */
  let capEl = null;
  K.capture = {
    open(text = '') {
      if (capEl) { capEl.querySelector('textarea').focus(); return; }
      const src = K.activeApp();
      capEl = el('form', { id: 's10-capture', role: 'dialog', 'aria-label': tr('Capturar idea') });
      capEl.innerHTML = `<header>${I('sparkle', 16)}<b>${esc(tr('Nueva idea'))}</b><small>${esc(tr('Enter guarda · Shift+Enter nueva línea · #etiquetas'))}</small></header><textarea rows="3" placeholder="${esc(tr('¿Qué se te ha ocurrido?'))}" aria-label="${esc(tr('Idea'))}"></textarea><div class="k9-row"><button type="button" class="k9-btn" data-cvoice>${I('mic', 14)} ${esc(tr('Dictar'))}</button><span class="sp" style="flex:1"></span><button type="button" class="k9-btn" data-cx>${esc(tr('Cancelar'))}</button><button class="k9-btn pri">${esc(tr('Guardar'))}</button></div>`;
      document.body.appendChild(capEl); const ta = capEl.querySelector('textarea'); ta.value = text; setTimeout(() => ta.focus(), 20);
      const done = () => { capEl.remove(); capEl = null; };
      capEl.onsubmit = e => { e.preventDefault(); const v = ta.value.trim(); if (v) { K.capture.save(v, src); E.toast('💡 ' + tr('Idea guardada')); } done(); };
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (capEl.requestSubmit) capEl.requestSubmit(); else capEl.dispatchEvent(new Event('submit', { cancelable: true })); } if (e.key === 'Escape') done(); });
      capEl.querySelector('[data-cx]').onclick = done;
      capEl.querySelector('[data-cvoice]').onclick = () => { const R = window.SpeechRecognition || window.webkitSpeechRecognition; if (!R) return E.toast(tr('Este navegador no tiene dictado por voz')); const r = new R(); r.lang = K.locale || 'es-ES'; r.interimResults = false; r.onresult = ev => { ta.value = (ta.value + ' ' + ev.results[0][0].transcript).trim(); ta.focus(); }; r.onerror = ev => E.toast(tr('Dictado') + ': ' + ev.error); try { r.start(); E.toast('🎙️ ' + tr('Habla ahora…')); } catch (er) { E.toast(er.message); } };
    },
    save(text, src) { const tags = [...new Set((text.match(/#[\p{L}\d_-]{2,30}/gu) || []).map(t => t.slice(1).toLowerCase()))]; const l = S.get('ideas_list', []) || []; const it = { id: E.uid(), text: text.slice(0, 4000), tags, t: Date.now(), app: src || 'desktop', done: false, color: '' }; l.unshift(it); S.set('ideas_list', l.slice(0, 2000)); K.emit('ideas'); K.activity && K.activity('idea', 'ideas', text.slice(0, 80)); return it; }
  };
  K.keys.register('capture', 'Capturar una idea', 'Ctrl+Alt+I', () => K.capture.open(), 'Sistema');

  /* ================= 11. Hoja de atajos (Ctrl+Alt+H) ================= */
  function cheats() {
    const old = $('#s10-cheats'); if (old) { old.remove(); return; }
    const m = K.keys.map(), g = {}; K.keys.defs.forEach(d => (g[d.group] = g[d.group] || []).push(d));
    const pad = (K.gamepadNav && K.gamepadNav.mapText) ? K.gamepadNav.mapText() : [];
    const box = el('div', { id: 's10-cheats', class: 'eis-modal', role: 'dialog', 'aria-label': tr('Atajos') });
    box.innerHTML = `<div class="eis-modal-card s10-cheats-card"><h3>${I('key', 18)} ${esc(tr('Atajos de teclado y del mando'))}</h3><div class="s10-cheats-g">${Object.entries(g).map(([gr, l]) => `<section><h5>${esc(tr(gr))}</h5>${l.map(d => `<div><span>${esc(tr(d.label))}</span>${m[d.id] ? m[d.id].split('+').map(k => `<kbd>${esc(k.replace('Arrow', ''))}</kbd>`).join('+') : `<em class="eis-muted">${esc(tr('sin atajo'))}</em>`}</div>`).join('')}</section>`).join('')}${pad.length ? `<section><h5>🎮 ${esc(tr('Mando'))}</h5>${pad.map(([b, l]) => `<div><span>${esc(tr(l))}</span><kbd>${esc(b)}</kbd></div>`).join('')}</section>` : ''}</div><div class="eis-modal-btns"><button class="btn-secondary" data-ck>${esc(tr('Personalizar atajos'))}</button><button class="btn-primary" data-cx>${esc(tr('Cerrar'))}</button></div></div>`;
    document.body.appendChild(box); box.querySelector('[data-cx]').focus();
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('[data-cx]')) box.remove(); if (e.target.closest('[data-ck]')) { box.remove(); E.launch('settings', 'keyboard'); } });
    box.addEventListener('keydown', e => { if (e.key === 'Escape') box.remove(); });
  }
  K.cheats = cheats;
  K.keys.register('cheats', 'Lista de atajos de teclado y del mando', 'Ctrl+Alt+H', cheats, 'Ayuda');
  K.keys.register('resmon', 'Monitor de recursos', 'Ctrl+Alt+M', () => E.launch('resmon'), 'Sistema');

  /* ================= 12. Perfiles de escritorio ================= */
  const DPK = 'os10_deskprofiles';
  const DKEYS = ['env', 'theme', 'accent', 'wp', 'customWallpaper', 'icon_size', 'desk_items', 'pinned', 'start_pins', 'os9_widgets', 'os9_prefs', 'os10_panels', 'os9_desks', 'os9_desk_names', 'os10_deskwp', 'os10_wpos', 'glass', 'snap'];
  K.deskProfiles = {
    list: () => S.get(DPK, []) || [],
    capture(name) { const data = {}; DKEYS.forEach(k => { const v = localStorage.getItem('eisen_' + k); if (v != null) data[k] = v; }); const l = K.deskProfiles.list().filter(p => p.name !== name); const p = { id: E.uid(), name: String(name).slice(0, 40), at: Date.now(), env: html.dataset.env, data }; l.push(p); S.set(DPK, l.slice(-12)); K.log && K.log('ok', 'desktop', 'Perfil de escritorio guardado: ' + name); return p; },
    remove(id) { S.set(DPK, K.deskProfiles.list().filter(p => p.id !== id)); },
    async apply(id) {
      const p = K.deskProfiles.list().find(x => x.id === id); if (!p) return false;
      if (!await E.confirm(tr('Aplicar perfil de escritorio'), tr('Se cambiarán el entorno, el tema, el fondo, los iconos, los paneles y los widgets. La interfaz se reiniciará y tus ventanas abiertas se volverán a abrir.'))) return false;
      try { S.set('os9_layout_last', K.layout.capture()); } catch { /* sin disposición */ }
      Object.entries(p.data || {}).forEach(([k, v]) => { if (DKEYS.includes(k)) try { localStorage.setItem('eisen_' + k, v); } catch { /* sin espacio */ } });
      S.set('os10_restore_once', true); S.set('os10_deskprofile_active', p.id); K.log && K.log('ok', 'desktop', 'Perfil de escritorio aplicado: ' + p.name); location.reload(); return true;
    },
    active: () => S.get('os10_deskprofile_active', '')
  };
  if (S.get('os10_restore_once', false)) { S.set('os10_restore_once', false); setTimeout(() => { const l = S.get('os9_layout_last', []) || []; if (l.length && K.layout) K.layout.restore(l); }, 1200); }

  /* ================= 13. Perfiles de pantalla (escala, márgenes de TV, objetivos táctiles) ================= */
  const DISP = K.DISPLAY_PROFILES = [
    { id: 'desktop', n: 'Escritorio', d: 'Monitor de PC o portátil con ratón.', p: { fontScale: 1, density: 'comfortable', cursor: 'normal', safeArea: 0 }, touch: false },
    { id: 'compact', n: 'Pantalla pequeña', d: 'Portátiles y monitores de poca resolución: más contenido en pantalla.', p: { fontScale: .95, density: 'compact', cursor: 'normal', safeArea: 0 }, touch: false },
    { id: 'tablet', n: 'Tableta', d: 'Pantalla táctil: botones y textos más grandes.', p: { fontScale: 1.12, density: 'comfortable', cursor: 'normal', safeArea: 0 }, touch: true },
    { id: 'phone', n: 'Teléfono', d: 'Pantalla pequeña táctil: ventanas a pantalla completa y texto legible.', p: { fontScale: 1.08, density: 'compact', cursor: 'normal', safeArea: 0 }, touch: true },
    { id: 'tv', n: 'Televisor y Xbox', d: 'Vista a 3 metros: texto grande, puntero grande, margen para televisores que recortan el borde y navegación con mando.', p: { fontScale: 1.3, density: 'comfortable', cursor: 'large', safeArea: 4, glass: 'off' }, touch: true, pad: true }
  ];
  function applySafe() { const v = Math.max(0, Math.min(10, +K.pref('safeArea') || 0)); html.classList.toggle('s10-safe', v > 0); html.style.setProperty('--s10-safe-scale', String(1 - v / 50)); }
  applySafe(); K.on('pref', p => { if (p && p.k === 'safeArea') applySafe(); });
  K.display = {
    profiles: () => DISP.concat(S.get('os10_dispcustom', []) || []),
    active: () => S.get('os10_disp_active', ''),
    apply(id) { const d = K.display.profiles().find(x => x.id === id); if (!d) return; Object.entries(d.p || {}).forEach(([k, v]) => K.pref(k, v)); html.classList.toggle('s10-touch', !!d.touch); S.set('os10_touch', !!d.touch); if (d.pad && K.services.get('gamepad')) { K.services.setStartType('gamepad', 'auto'); K.services.start('gamepad', true); } S.set('os10_disp_active', id); applyTb(); E.toast('🖥️ ' + tr('Perfil de pantalla') + ': ' + tr(d.n)); K.log && K.log('info', 'display', 'Perfil de pantalla: ' + d.n); },
    saveCustom(name) { const p = K.prefs(); const d = { id: 'c' + Date.now().toString(36), n: String(name).slice(0, 40), d: tr('Perfil personalizado'), p: { fontScale: p.fontScale, density: p.density, cursor: p.cursor, safeArea: p.safeArea, glass: p.glass }, touch: html.classList.contains('s10-touch'), custom: true }; const l = S.get('os10_dispcustom', []) || []; l.push(d); S.set('os10_dispcustom', l.slice(-8)); return d; },
    removeCustom(id) { S.set('os10_dispcustom', (S.get('os10_dispcustom', []) || []).filter(x => x.id !== id)); },
    suggest() { if (K.caps.xbox || (screen.width >= 1900 && matchMedia('(pointer:coarse)').matches)) return 'tv'; if (innerWidth < 700) return 'phone'; if (matchMedia('(pointer:coarse)').matches) return 'tablet'; if (innerWidth < 1280) return 'compact'; return 'desktop'; },
    async measureHz() { return new Promise(res => { let n = 0; const t0 = performance.now(); const f = t => { n++; if (t - t0 < 1000) requestAnimationFrame(f); else res(Math.round(n * 1000 / (t - t0))); }; requestAnimationFrame(f); }); }
  };
  html.classList.toggle('s10-touch', !!S.get('os10_touch', false));

  /* ================= 14. Menú del escritorio ampliado y accesos rápidos ================= */
  const extra0 = E.deskMenuExtra;
  E.deskMenuExtra = () => {
    const D = K.desks, base = extra0 ? extra0() : [];
    const sub = (k, i, l, s) => ({ k, i, l: tr(l), sub: s.map(x => ({ i: x[0], l: tr(x[1]), f: x[2] })), f: () => {} });
    return base.concat([
      sub('s10d', '🗂️', 'Escritorios virtuales', Array.from({ length: D.count }, (_, i) => [i + 1 === D.cur ? '●' : '', D.name(i + 1), () => D.go(i + 1)]).concat([['＋', 'Nuevo escritorio', () => D.add()], ['✏️', 'Renombrar este escritorio…', async () => { const v = await K.ui.prompt(tr('Renombrar escritorio'), tr('Nombre'), D.name(D.cur)); if (v != null) { const m = D.names(); m[D.cur] = v.trim().slice(0, 30); S.set('os9_desk_names', m); D.apply(); } }], ['🖼️', 'Fondo solo para este escritorio…', () => pickDeskWall()]])),
      sub('s10w', '🪟', 'Ventanas', [['▦', 'Ver todas las ventanas', () => expose()], ['⇆', 'Cambiar de ventana', () => switcher(1)], ['🗕', 'Minimizar todas', () => { D.winsOn(D.cur).forEach(w => w.classList.add('minimized')); E.updateTaskbarButtons(); }], ['▥', 'Mosaico automático', () => tileAll()], ['⧉', 'Cascada', () => cascade()]]),
      sub('s10p', '📐', 'Paneles y widgets', [[pcfg().left.on ? '●' : '', 'Panel izquierdo', () => K.panels.toggle('left')], [pcfg().right.on ? '●' : '', 'Panel derecho', () => K.panels.toggle('right')], [K.pref('widgetFree') ? '●' : '', 'Mover widgets libremente', () => K.pref('widgetFree', !K.pref('widgetFree'))], [K.pref('showWidgets') ? '●' : '', 'Mostrar widgets', () => K.pref('showWidgets', !K.pref('showWidgets'))]]),
      sub('s10f', '💾', 'Perfiles de escritorio', K.deskProfiles.list().map(p => [K.deskProfiles.active() === p.id ? '●' : '', p.name, () => K.deskProfiles.apply(p.id)]).concat([['＋', 'Guardar el escritorio actual…', async () => { const v = await K.ui.prompt(tr('Perfil de escritorio'), tr('Nombre (p. ej. Trabajo, Juegos, Escuela)'), ''); if (v && v.trim()) { K.deskProfiles.capture(v.trim()); E.toast(tr('Perfil guardado')); } }]])),
      sub('s10s', '🖥️', 'Perfil de pantalla', K.display.profiles().map(d => [K.display.active() === d.id ? '●' : '', d.n, () => K.display.apply(d.id)])),
      { k: 's10t', i: '⌨️', l: tr('Abrir Terminal'), f: () => E.launch('terminal') },
      { k: 's10i', i: '💡', l: tr('Capturar una idea'), f: () => K.capture.open() },
      { k: 's10c', i: '📋', l: tr('Historial del portapapeles'), f: () => clipOpen() },
      { k: 's10k', i: '⌨️', l: tr('Lista de atajos'), f: () => cheats() },
      { k: 's10y', i: 'ℹ️', l: tr('Propiedades del sistema'), f: () => E.launch('sysinfo') }
    ]);
  };
  async function pickDeskWall() {
    const n = K.desks.cur, cur = K.deskWall.get(n);
    const WP = Object.keys(E.WALLPAPERS || {});
    const r = await E.form({ title: tr('Fondo de') + ' ' + K.desks.name(n), fields: [{ k: 'v', label: tr('Fondo'), type: 'select', options: [['', tr('El mismo que los demás')]].concat(WP.map(k => [k, k])).concat([['__img', tr('Imagen de Archivos…')]]), value: cur && WP.includes(cur) ? cur : '' }], ok: tr('Aplicar') });
    if (!r) return; if (r.v === '__img') { const f = await K.files.pick({ title: tr('Elige una imagen'), accept: x => K.files.kindOf(x) === 'image' }); if (!f) return; if (f.blob.size > 3e6) return E.toast(tr('Usa una imagen de menos de 3 MB')); const rd = new FileReader(); rd.onload = () => K.deskWall.set(n, rd.result); rd.readAsDataURL(f.blob); } else K.deskWall.set(n, r.v);
  }
  function tileAll() { const ws = $$('.window.open:not(.minimized)').filter(onDesk); const n = ws.length; if (!n) return; const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols); ws.forEach((w, i) => place(w, zoneRect([(i % cols) / cols, Math.floor(i / cols) / rows, 1 / cols, 1 / rows]))); }
  function cascade() { const a = area(); $$('.window.open:not(.minimized)').filter(onDesk).forEach((w, i) => { w.classList.remove('maximized', 'snapped'); delete w.dataset.prev; const pr = (w.offsetParent || document.body).getBoundingClientRect(); Object.assign(w.style, { left: (a.x + 30 + i * 32 - pr.left) + 'px', top: (a.y + 20 + i * 30 - pr.top) + 'px', width: Math.min(900, a.w * .62) + 'px', height: Math.min(640, a.h * .7) + 'px' }); E.focusWindow(w); }); }
  K.arrange = { tile: tileAll, cascade };
  // accesos rápidos nuevos
  const tiles = $('#action-center .quick-tiles-grid');
  if (tiles) {
    tiles.insertAdjacentHTML('beforeend', `<button class="quick-tile" id="qt-s10clip"><span class="qt-icon">${I('copy', 18)}</span><span>${esc(tr('Portapapeles'))}</span></button><button class="quick-tile" id="qt-s10idea"><span class="qt-icon">${I('sparkle', 18)}</span><span>${esc(tr('Idea rápida'))}</span></button><button class="quick-tile" id="qt-s10panel"><span class="qt-icon">${I('widgets', 18)}</span><span>${esc(tr('Panel lateral'))}</span></button><button class="quick-tile" id="qt-s10exp"><span class="qt-icon">${I('grid', 18)}</span><span>${esc(tr('Ventanas'))}</span></button>`);
    $('#qt-s10clip').onclick = () => { E.closeFlyouts(); setTimeout(clipOpen, 30); };
    $('#qt-s10idea').onclick = () => { E.closeFlyouts(); setTimeout(() => K.capture.open(), 30); };
    $('#qt-s10panel').onclick = () => { E.closeFlyouts(); K.panels.toggle('right'); };
    $('#qt-s10exp').onclick = () => { E.closeFlyouts(); setTimeout(expose, 30); };
  }
  // búsqueda global: comandos 10.0
  K.search.register(tr('Escritorio 10.0'), n => [
    ['Ver todas las ventanas', '▦', () => expose()], ['Historial del portapapeles', '📋', () => clipOpen()], ['Capturar una idea', '💡', () => K.capture.open()], ['Panel lateral derecho', '📐', () => K.panels.toggle('right')], ['Panel lateral izquierdo', '📐', () => K.panels.toggle('left')],
    ['Mosaico de ventanas', '▥', () => tileAll()], ['Ventanas en cascada', '⧉', () => cascade()], ['Lista de atajos', '⌨️', () => cheats()], ['Guardar perfil de escritorio', '💾', async () => { const v = await K.ui.prompt(tr('Perfil de escritorio'), tr('Nombre'), ''); if (v) K.deskProfiles.capture(v); }]
  ].concat(K.display.profiles().map(d => ['Perfil de pantalla: ' + d.n, '🖥️', () => K.display.apply(d.id)])).filter(c => K.norm(tr(c[0])).includes(n) || K.norm(c[0]).includes(n)).map(c => ({ icon: c[1], title: tr(c[0]), run: c[2] })), 5);

  /* ================= 15. Medidor de fluidez compartido (widgets, Monitor de recursos) ================= */
  K.perf10 = (() => {
    let frames = 0, fps = 0, last = performance.now(), raf = 0, users = 0, lag = 0, lagT = 0, longs = 0, longMs = 0;
    const loop = t => { frames++; if (t - last >= 1000) { fps = Math.round(frames * 1000 / (t - last)); frames = 0; last = t; } raf = requestAnimationFrame(loop); };
    let expect = performance.now() + 500; const lagTick = () => { const n = performance.now(); lag = Math.max(0, Math.round(n - expect)); expect = n + 500; lagT = setTimeout(lagTick, 500); };
    try { new PerformanceObserver(l => l.getEntries().forEach(en => { longs++; longMs += en.duration; })).observe({ type: 'longtask', buffered: true }); } catch { /* sin longtask */ }
    return {
      use() { users++; if (!raf) { last = performance.now(); frames = 0; raf = requestAnimationFrame(loop); expect = performance.now() + 500; lagT = setTimeout(lagTick, 500); } return () => { users = Math.max(0, users - 1); if (!users) { cancelAnimationFrame(raf); raf = 0; clearTimeout(lagT); } }; },
      fps: () => fps, lag: () => lag, longTasks: () => ({ n: longs, ms: Math.round(longMs) })
    };
  })();
  // el widget de rendimiento solo mide mientras está visible
  { let stop = null; setInterval(() => { const vis = !!$('.s9-w-perf,.s10-pw-perf'); if (vis && !stop) stop = K.perf10.use(); if (!vis && stop) { stop(); stop = null; } }, 2000); }

  K.shell10 = true;
})();

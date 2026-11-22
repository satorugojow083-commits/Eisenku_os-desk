/* EISENKU OS 8 · Escritorio: iconos en cuadrícula, arrastrar y soltar, carpetas, accesos directos, renombrar, fondos */
(() => {
  'use strict';
  const E = window.EISEN, storage = E.storage, esc = E.esc, toast = E.toast, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const host = $('#desktop-icons'), vp = $('#desktop-viewport');
  const SIZES = { s: 74, m: 90, l: 110 };
  const cell = () => SIZES[storage.get('icon_size', 'm')] || 90;

  /* ---------- Modelo ---------- */
  // item: { id, t:'app'|'folder'|'url'|'action', ref, name, icon, img, x, y, p }
  let items = storage.get('desk_items', null);
  if (!items) {
    items = [];
    $$('#desktop-icons .desktop-icon-btn').forEach((b, i) => {
      const name = b.querySelector('.ico-label').textContent.trim();
      if (b.id === 'btn-guide') items.push({ id: 'd-guide', t: 'action', ref: 'guide', name: 'Guía', icon: '❓' });
      else items.push({ id: 'd-' + b.dataset.launch, t: 'app', ref: b.dataset.launch, name });
    });
    items.push({ id: 'd-assistant', t: 'app', ref: 'assistant', name: 'Maestro Domingo' });
    const fid = 'f-' + E.uid();
    items.push({ id: fid, t: 'folder', name: 'Productividad', icon: '📂' });
    ['notes', 'tasks', 'calendar', 'calc', 'clock'].forEach(r => items.push({ id: 'd-' + r, t: 'app', ref: r, name: (E.REG[r] || {}).name || r, p: fid }));
    const f2 = 'f-' + E.uid();
    items.push({ id: f2, t: 'folder', name: 'Estudio', icon: '🎓' });
    ['wiki', 'periodic', 'grapher', 'flashcards', 'translator'].forEach(r => items.push({ id: 'd-' + r, t: 'app', ref: r, name: (E.REG[r] || {}).name || r, p: f2 }));
  }
  const save = () => storage.set('desk_items', items);
  host.innerHTML = '';
  host.classList.add('dk');

  const appOf = it => it.t === 'app' ? E.apps().find(a => a.id === it.ref) || E.REG[it.ref] : null;
  function look(it) {
    if (it.t === 'folder') { const kids = items.filter(x => x.p === it.id).slice(0, 4).map(k => look(k)); return `<span class="ico-tile dk-folder" style="--s:${cell() * .52}px"><b class="dk-fbase">${esc(it.icon && it.icon !== '📂' ? it.icon : '')}</b><span class="dk-fkids">${kids.map(k => `<i>${k.mini}</i>`).join('')}</span></span>`; }
    if (it.t === 'app') { const a = appOf(it); if (!a) return null; const o = Object.assign({}, a, it.icon ? { icon: it.icon, img: it.img || '' } : {}); return { tile: E.tile(o, cell() * .52), mini: o.img ? `<img src="${esc(o.img)}">` : esc(o.icon || '◆') }; }
    if (it.t === 'url') { const o = { icon: it.icon || '🌐', img: it.img || '', cat: 'Internet' }; return { tile: E.tile(o, cell() * .52), mini: o.img ? `<img src="${esc(o.img)}">` : esc(o.icon) }; }
    if (it.t === 'action') return { tile: E.tile({ icon: it.icon || '❓', grad: ['#0284c7', '#a5b4fc'] }, cell() * .52), mini: esc(it.icon || '❓') };
    return null;
  }
  const tileHtml = it => { const l = look(it); return typeof l === 'string' ? l : l ? l.tile : ''; };
  const visible = it => { if (it.t === 'app') { const a = appOf(it); return !!a && E.isInstalled(a.id); } return true; };

  /* ---------- Colocación ---------- */
  function dims() { const c = cell(), r = vp.getBoundingClientRect(); const top = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) || 0; return { c, cols: Math.max(1, Math.floor((r.width - 24) / c)), rows: Math.max(1, Math.floor((r.height - top - 24) / (c + 4))) }; }
  function place() {
    const { cols, rows } = dims(), used = new Set(), top = items.filter(it => !it.p && visible(it));
    top.forEach(it => { if (it.x != null && it.x < cols && it.y < rows && !used.has(it.x + ',' + it.y)) used.add(it.x + ',' + it.y); else { it.x = null; } });
    top.forEach(it => { if (it.x != null) return; for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) if (!used.has(x + ',' + y) && it.x == null) { it.x = x; it.y = y; used.add(x + ',' + y); } if (it.x == null) { it.x = 0; it.y = 0; } });
  }
  function render() {
    place(); save();
    const c = cell();
    host.style.setProperty('--cell', c + 'px');
    host.innerHTML = items.filter(it => !it.p && visible(it)).map(it => `<button class="dk-ico${sel === it.id ? ' sel' : ''}${it.t === 'folder' ? ' is-folder' : ''}" data-did="${it.id}" style="left:${12 + it.x * c}px;top:${12 + it.y * (c + 4)}px;width:${c - 6}px" title="${esc(it.name)}">${tileHtml(it)}<span class="ico-label">${esc(it.name)}</span></button>`).join('');
    if (fwin && fwin.classList.contains('open')) renderFolder();
  }
  let sel = null;

  /* ---------- Abrir ---------- */
  function openItem(it) {
    if (it.t === 'folder') return openFolder(it.id);
    if (it.t === 'app') return E.launch(it.ref);
    if (it.t === 'url') return E.ebOpenUrl(it.ref, true);
    if (it.t === 'action' && it.ref === 'guide') { const g = $('#cfg-btn-guide'); if (g) g.click(); }
  }

  /* ---------- Ventana de carpeta ---------- */
  let fwin = null, curFolder = null;
  E.registerApp({ id: 'deskfolder', name: 'Carpeta', icon: '📂', cat: 'Sistema', w: 560, h: 400, pad: false, noStore: true, desc: 'Carpeta del escritorio' });
  fwin = $('#win-deskfolder');
  const fbody = fwin.querySelector('.app-body');
  E.apps().splice(E.apps().findIndex(a => a.id === 'deskfolder'), 1);
  function openFolder(id) { curFolder = id; E.openWindow('deskfolder'); renderFolder(); }
  function renderFolder() {
    const f = items.find(x => x.id === curFolder); if (!f) { const x = fwin.querySelector('[data-act=close]'); x && x.click(); return; }
    fwin.querySelector('.window-title-area span:last-child').textContent = (f.icon && f.icon !== '📂' ? f.icon + ' ' : '📂 ') + f.name;
    const kids = items.filter(x => x.p === f.id && visible(x));
    fbody.innerHTML = `<div class="ap-toolbar"><button class="btn-secondary" data-fa="add">＋ Añadir apps</button><button class="btn-secondary" data-fa="ren">✏️ Renombrar</button><button class="btn-secondary" data-fa="sort">A→Z</button><span class="eis-muted" style="margin-left:auto">${kids.length} elementos · arrastra fuera para sacarlos</span></div><div class="dk-fgrid" data-fgrid>${kids.map(it => `<button class="dk-ico rel" data-did="${it.id}" title="${esc(it.name)}">${tileHtml(it)}<span class="ico-label">${esc(it.name)}</span></button>`).join('') || '<p class="ap-empty">Carpeta vacía. Arrastra iconos aquí o pulsa “＋ Añadir apps”.</p>'}</div>`;
  }
  fbody.addEventListener('click', async e => {
    const a = e.target.closest('[data-fa]'); if (!a) return; const f = items.find(x => x.id === curFolder);
    if (a.dataset.fa === 'ren') rename(f);
    if (a.dataset.fa === 'sort') { const kids = items.filter(x => x.p === f.id).sort((x, y) => x.name.localeCompare(y.name)); items = items.filter(x => x.p !== f.id).concat(kids); render(); }
    if (a.dataset.fa === 'add') pickApps(f.id);
  });

  /* ---------- Selector de apps (accesos directos) ---------- */
  async function pickApps(parent) {
    const all = E.installedApps().filter(a => a.id !== 'deskfolder');
    const ov = document.createElement('div'); ov.className = 'eis-modal';
    ov.innerHTML = `<div class="eis-modal-card dk-pick"><h3>${parent ? 'Añadir a la carpeta' : 'Nuevo acceso directo'}</h3><input class="input-text" data-q placeholder="Buscar apps…"><div class="dk-plist" data-l></div><details><summary>🔗 Acceso directo a una página web</summary><form class="ap-col" data-u><input class="input-text" name="n" placeholder="Nombre" required><input class="input-text" name="u" type="url" placeholder="https://…" required><button class="btn-primary">Crear acceso web</button></form></details><div class="eis-modal-btns"><button class="btn-primary" data-x>Listo</button></div></div>`;
    document.body.appendChild(ov);
    const draw = () => { const q = ov.querySelector('[data-q]').value.toLowerCase(); ov.querySelector('[data-l]').innerHTML = all.filter(a => !q || a.name.toLowerCase().includes(q)).map(a => { const has = items.some(x => x.t === 'app' && x.ref === a.id && (x.p || null) === (parent || null)); return `<button class="dk-prow${has ? ' on' : ''}" data-a="${a.id}">${E.tile(a, 28)}<span>${esc(a.name)}</span><b>${has ? '✓' : '＋'}</b></button>`; }).join(''); };
    ov.querySelector('[data-q]').oninput = draw;
    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.closest('[data-x]')) { ov.remove(); render(); return; }
      const r = e.target.closest('[data-a]'); if (!r) return; const a = all.find(x => x.id === r.dataset.a);
      const i = items.findIndex(x => x.t === 'app' && x.ref === a.id && (x.p || null) === (parent || null));
      if (i >= 0) items.splice(i, 1); else items.push({ id: 'd-' + E.uid(), t: 'app', ref: a.id, name: a.name, p: parent || null });
      save(); draw(); render();
    });
    ov.querySelector('[data-u]').onsubmit = e => { e.preventDefault(); const f = e.target; let u = f.u.value.trim(); let h = ''; try { h = new URL(u).hostname; } catch { /* ignorar */ } items.push({ id: 'd-' + E.uid(), t: 'url', ref: u, name: f.n.value.trim(), icon: '🌐', img: h ? `https://www.google.com/s2/favicons?domain=${h}&sz=64` : '', p: parent || null }); save(); render(); ov.remove(); toast('Acceso directo creado'); };
    draw(); ov.querySelector('[data-q]').focus();
  }

  /* ---------- Acciones de icono ---------- */
  async function rename(it) { const r = await E.form({ title: it.t === 'folder' ? 'Renombrar carpeta' : 'Renombrar', fields: [{ k: 'n', label: 'Nombre', value: it.name, req: true }] }); if (r && r.n.trim()) { it.name = r.n.trim().slice(0, 40); render(); } }
  async function changeIcon(it) { const r = await E.form({ title: 'Cambiar icono', html: '<p class="eis-muted">Escribe un emoji (📚 🎨 🧪 ⭐ 🗂️ 💼) o pega la URL de una imagen.</p>', fields: [{ k: 'i', label: 'Icono', value: it.img || it.icon || '' }] }); if (!r) return; const v = r.i.trim(); if (/^(https?:|data:image)/.test(v)) { it.img = v; it.icon = '🌐'; } else { it.icon = v || null; it.img = ''; } render(); }
  async function remove(it) {
    if (it.t === 'folder') { const kids = items.filter(x => x.p === it.id); if (!await E.confirm('Eliminar carpeta', kids.length ? `Los ${kids.length} elementos volverán al escritorio.` : '¿Eliminar esta carpeta vacía?', 'Eliminar')) return; kids.forEach(k => { k.p = null; k.x = null; }); }
    items = items.filter(x => x !== it); if (sel === it.id) sel = null; render();
  }
  function moveTo(it, folderId) { if (it.id === folderId) return; it.p = folderId; it.x = null; render(); }

  /* ---------- Menús contextuales ---------- */
  const cm = $('#context-menu');
  function menu(x, y, entries) {
    E.closeFlyouts(); cm.innerHTML = entries.map(e => e === '-' ? '<div class="ctx-sep"></div>' : e.sub ? `<div class="ctx-sub"><button class="ctx-item"><span>${e.i}</span> ${esc(e.l)} <small>›</small></button><div class="ctx-subm">${e.sub.map((s, k) => `<button class="ctx-item" data-m="${e.k}:${k}"><span>${s.i || ''}</span> ${esc(s.l)}</button>`).join('')}</div></div>` : `<button class="ctx-item" data-m="${e.k}"><span>${e.i}</span> ${esc(e.l)}</button>`).join('');
    cm.style.display = 'block'; const w = cm.offsetWidth, h = cm.offsetHeight;
    cm.style.left = Math.min(innerWidth - w - 6, x) + 'px'; cm.style.top = Math.min(innerHeight - h - 6, y) + 'px'; cm.classList.toggle('flip', x > innerWidth - w * 2);
    cm.__entries = entries;
  }
  cm.addEventListener('click', e => {
    const b = e.target.closest('[data-m]'); if (!b) return; const [k, i] = b.dataset.m.split(':'); const en = (cm.__entries || []).find(x => x.k === k); cm.style.display = 'none';
    if (en) en.sub ? en.sub[+i].f() : en.f();
  });
  const WP_LIST = [['e9-noir', 'EISENKU Noir'], ['e9-jade', 'Jade Grafito'], ['e9-rose', 'Rosé Noir'], ['e9-aurora', 'Aurora Enterprise'], ['e9-grid', 'Blueprint'], ['e9-porcelain', 'Porcelana (claro)'], ['flow', 'Glass Azul'], ['dark-flow', 'Grafito'], ['nature', 'Aurora'], ['cyber', 'Cyberpunk'], ['eisen-dawn', 'Amanecer EISEN'], ['kumo', 'Kumo (Linux)'], ['matrix', 'Terminal verde'], ['ocean', 'Océano profundo'], ['sakura', 'Sakura'], ['nebula', 'Nebulosa'], ['sunset', 'Atardecer'], ['mono', 'Minimal claro']];
  function deskMenu(x, y) {
    menu(x, y, [
      { k: 'nf', i: '📁', l: 'Nueva carpeta', f: () => E.desktopNewFolder() },
      { k: 'ns', i: '🔗', l: 'Nuevo acceso directo…', f: () => pickApps(null) },
      { k: 'nd', i: '📄', l: 'Nuevo documento (Writer)', f: () => { E.openWindow('word'); if (E.writer && E.writer.newDoc) E.writer.newDoc(); } },
      { k: 'nh', i: '📊', l: 'Nueva hoja de cálculo', f: () => E.openWindow('excel') },
      { k: 'nn', i: '🗒️', l: 'Nueva nota', f: () => { E.addNote('Nota rápida', ''); E.openWindow('notes'); } },
      '-',
      { k: 'so', i: '🔤', l: 'Ordenar', sub: [{ i: '🔤', l: 'Por nombre', f: () => arrange('name') }, { i: '🗂️', l: 'Por tipo (carpetas primero)', f: () => arrange('type') }, { i: '🧲', l: 'Alinear a la cuadrícula', f: () => arrange('compact') }] },
      { k: 'sz', i: '🔍', l: 'Tamaño de iconos', sub: [['s', 'Pequeños'], ['m', 'Medianos'], ['l', 'Grandes']].map(([v, l]) => ({ i: storage.get('icon_size', 'm') === v ? '●' : '', l, f: () => { storage.set('icon_size', v); render(); } })) },
      { k: 'wp', i: '🖼️', l: 'Fondo de pantalla', sub: WP_LIST.map(([v, l]) => ({ i: storage.get('wp', 'e9-noir') === v ? '●' : '', l, f: () => setWp(v) })).concat([{ i: '📤', l: 'Subir imagen…', f: () => $('#cfg-btn-custom-bg').click() }]) },
      ...(E.deskMenuExtra ? ['-', ...E.deskMenuExtra()] : []), // 9.0: widgets, escritorios virtuales, personalizar…
      '-',
      { k: 'env', i: document.documentElement.dataset.env === 'linux' ? '🪟' : '🐧', l: document.documentElement.dataset.env === 'linux' ? 'Cambiar a entorno Windows' : 'Cambiar a entorno Linux', f: () => E.setEnv && E.setEnv(document.documentElement.dataset.env === 'linux' ? 'windows' : 'linux') },
      { k: 'set', i: '⚙️', l: 'Personalizar…', f: () => { E.openWindow('settings'); E.settingsGo && E.settingsGo('look'); } },
      { k: 'dom', i: '✦', l: 'Preguntar a Domingo', f: () => E.domingo() }
    ]);
  }
  function iconMenu(it, x, y) {
    const folders = items.filter(f => f.t === 'folder' && f.id !== it.id && f.id !== it.p);
    menu(x, y, [
      { k: 'o', i: '▶', l: it.t === 'folder' ? 'Abrir carpeta' : 'Abrir', f: () => openItem(it) },
      { k: 'r', i: '✏️', l: 'Renombrar', f: () => rename(it) },
      { k: 'i', i: '🎨', l: 'Cambiar icono', f: () => changeIcon(it) },
      ...(it.t !== 'folder' && folders.length ? [{ k: 'mv', i: '📁', l: 'Mover a carpeta', sub: folders.map(f => ({ i: f.icon && f.icon !== '📂' ? f.icon : '📁', l: f.name, f: () => moveTo(it, f.id) })) }] : []),
      ...(it.p ? [{ k: 'out', i: '⤴', l: 'Sacar al escritorio', f: () => moveTo(it, null) }] : []),
      ...(it.t === 'folder' ? [{ k: 'add', i: '＋', l: 'Añadir apps…', f: () => pickApps(it.id) }] : []),
      ...(it.t === 'app' && E.REG[it.ref] ? [{ k: 'st', i: '🛍️', l: 'Ver en la Tienda', f: () => E.storeShow(it.ref) }] : []),
      '-',
      { k: 'd', i: '🗑', l: it.t === 'folder' ? 'Eliminar carpeta' : 'Quitar acceso directo', f: () => remove(it) }
    ]);
  }
  function arrange(mode) {
    const top = items.filter(it => !it.p);
    if (mode === 'name') top.sort((a, b) => a.name.localeCompare(b.name));
    if (mode === 'type') top.sort((a, b) => (b.t === 'folder') - (a.t === 'folder') || a.name.localeCompare(b.name));
    if (mode === 'compact') top.sort((a, b) => (a.x - b.x) || (a.y - b.y));
    top.forEach(it => it.x = null); items = top.concat(items.filter(it => it.p)); render();
  }

  /* ---------- Puntero: abrir, arrastrar, menú y pulsación larga ---------- */
  let drag = null, lp = null;
  function onDown(e) {
    const b = e.target.closest('.dk-ico'); if (!b || e.button > 0) return;
    const it = items.find(x => x.id === b.dataset.did); if (!it) return;
    sel = it.id; $$('.dk-ico.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
    drag = { it, b, x: e.clientX, y: e.clientY, moved: false, from: b.closest('.dk-fgrid') ? 'folder' : 'desk' };
    lp = setTimeout(() => { if (drag && !drag.moved) { const d = drag; drag = null; iconMenu(d.it, d.x, d.y); } }, 550);
  }
  function onMove(e) {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7) return;
    clearTimeout(lp);
    if (!drag.moved) { drag.moved = true; drag.ghost = drag.b.cloneNode(true); drag.ghost.className = 'dk-ico dk-ghost'; drag.ghost.style.width = drag.b.offsetWidth + 'px'; document.body.appendChild(drag.ghost); drag.b.classList.add('dk-dragging'); }
    drag.ghost.style.left = e.clientX - drag.b.offsetWidth / 2 + 'px'; drag.ghost.style.top = e.clientY - 30 + 'px';
    drag.ghost.hidden = true; const under = document.elementFromPoint(e.clientX, e.clientY); drag.ghost.hidden = false;
    $$('.dk-drop').forEach(x => x.classList.remove('dk-drop'));
    const tgt = under && under.closest('.dk-ico.is-folder'); if (tgt && tgt.dataset.did !== drag.it.id && drag.it.t !== 'folder') tgt.classList.add('dk-drop');
    const fg = under && under.closest('.dk-fgrid'); if (fg && drag.from === 'desk' && drag.it.t !== 'folder') fg.classList.add('dk-drop');
  }
  function onUp(e) {
    clearTimeout(lp); if (!drag) return; const d = drag; drag = null;
    $$('.dk-drop').forEach(x => x.classList.remove('dk-drop'));
    if (!d.moved) { if (e.pointerType === 'mouse' && storage.get('dbl_open', false)) return; openItem(d.it); return; }
    d.ghost.remove(); d.b.classList.remove('dk-dragging');
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const tgt = under && under.closest('.dk-ico.is-folder');
    if (tgt && tgt.dataset.did !== d.it.id && d.it.t !== 'folder') { moveTo(d.it, tgt.dataset.did); toast('Movido a la carpeta'); return; }
    if (under && under.closest('.dk-fgrid')) { if (d.from === 'desk' && d.it.t !== 'folder') moveTo(d.it, curFolder); return; }
    if (under && under.closest('.window, #taskbar, #lx-panel, #start-menu-panel')) return;
    // soltar en el escritorio: ajustar a la celda
    const c = cell(), r = vp.getBoundingClientRect(), { cols, rows } = dims();
    const gx = Math.max(0, Math.min(cols - 1, Math.round((e.clientX - r.left - 12 - c / 2) / c))), gy = Math.max(0, Math.min(rows - 1, Math.round((e.clientY - r.top - 12 - c / 2) / (c + 4))));
    const other = items.find(x => !x.p && x !== d.it && x.x === gx && x.y === gy && visible(x));
    if (other) { other.x = d.it.p ? null : d.it.x; other.y = d.it.p ? null : d.it.y; }
    d.it.p = null; d.it.x = gx; d.it.y = gy; render();
  }
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('dblclick', e => { const b = e.target.closest('.dk-ico'); if (b && storage.get('dbl_open', false)) { const it = items.find(x => x.id === b.dataset.did); if (it) openItem(it); } });
  document.addEventListener('contextmenu', e => {
    const b = e.target.closest('.dk-ico'); if (b) { e.preventDefault(); e.stopPropagation(); const it = items.find(x => x.id === b.dataset.did); if (it) iconMenu(it, e.clientX, e.clientY); return; }
  }, true);
  // menú del escritorio (sustituye al anterior conservando sus opciones)
  vp.addEventListener('contextmenu', e => { if (e.target.closest('.window,.dk-ico')) return; e.preventDefault(); e.stopImmediatePropagation(); deskMenu(e.clientX, e.clientY); }, true);
  vp.addEventListener('pointerdown', e => { if (!e.target.closest('.dk-ico')) { sel = null; $$('.dk-ico.sel').forEach(x => x.classList.remove('sel')); } });
  // pulsación larga en el escritorio vacío (tabletas)
  let lpd = null; vp.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || e.target.closest('.dk-ico,.window')) return; const x = e.clientX, y = e.clientY; lpd = setTimeout(() => deskMenu(x, y), 650); });
  ['pointerup', 'pointermove', 'pointercancel'].forEach(ev => vp.addEventListener(ev, e => { if (ev !== 'pointermove' || e.movementX * e.movementX + e.movementY * e.movementY > 9) clearTimeout(lpd); }));
  document.addEventListener('keydown', e => {
    if (!sel || e.target.matches('input,textarea,select,[contenteditable]') || document.querySelector('.window.active.open:not(.minimized)')) return;
    const it = items.find(x => x.id === sel); if (!it) return;
    if (e.key === 'Delete') remove(it); if (e.key === 'F2') { e.preventDefault(); rename(it); } if (e.key === 'Enter') openItem(it);
  });

  /* ---------- Fondos ---------- */
  const WP = {
    // 9.0 ENTERPRISE: fondos de la identidad negro · verde sobrio · rosa profesional (CSS puro, sin descargas)
    'e9-noir': 'radial-gradient(1100px 700px at 86% 12%, rgba(201,58,115,.20), transparent 62%), radial-gradient(1000px 800px at 8% 92%, rgba(31,129,96,.24), transparent 62%), linear-gradient(160deg, #0b0c0f 0%, #0f1115 55%, #08090b 100%)',
    'e9-jade': 'radial-gradient(900px 640px at 18% 18%, rgba(52,165,130,.28), transparent 62%), radial-gradient(800px 600px at 92% 85%, rgba(52,165,130,.10), transparent 60%), linear-gradient(135deg, #0b1210 0%, #0c0f0e 60%, #070908 100%)',
    'e9-rose': 'radial-gradient(900px 640px at 80% 20%, rgba(232,112,159,.26), transparent 62%), radial-gradient(700px 500px at 10% 85%, rgba(201,58,115,.14), transparent 60%), linear-gradient(150deg, #120b0f 0%, #0d0b0d 55%, #08070a 100%)',
    'e9-aurora': 'linear-gradient(118deg, transparent 22%, rgba(52,165,130,.20) 40%, rgba(201,58,115,.18) 58%, transparent 76%), radial-gradient(1200px 600px at 50% 120%, rgba(52,165,130,.18), transparent 60%), linear-gradient(180deg, #0a0b0e, #0d0f13)',
    'e9-grid': 'repeating-linear-gradient(0deg, rgba(255,255,255,.028) 0 1px, transparent 1px 44px), repeating-linear-gradient(90deg, rgba(255,255,255,.028) 0 1px, transparent 1px 44px), radial-gradient(900px 600px at 75% 25%, rgba(52,165,130,.16), transparent 60%), radial-gradient(700px 500px at 20% 80%, rgba(201,58,115,.12), transparent 60%), linear-gradient(160deg, #0b0c0f, #0e1014)',
    'e9-porcelain': 'radial-gradient(900px 600px at 82% 10%, rgba(201,58,115,.10), transparent 60%), radial-gradient(900px 700px at 8% 92%, rgba(31,129,96,.12), transparent 60%), linear-gradient(160deg, #f6f7f9, #eaecf0)',
    flow: 'radial-gradient(ellipse at 80% 20%, #1e4287 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, #0078d4 0%, transparent 45%), linear-gradient(135deg, #09101d, #0b1528)',
    'dark-flow': 'linear-gradient(135deg, #090b10 0%, #171b26 50%, #090b10 100%)',
    nature: 'linear-gradient(135deg, #0d324d 0%, #7f5a83 100%)',
    cyber: 'radial-gradient(circle, #ff007f 0%, #000000 80%)',
    'eisen-dawn': 'radial-gradient(ellipse at 70% 110%, #f59e0b55 0%, transparent 55%), radial-gradient(ellipse at 20% 0%, #6366f188 0%, transparent 60%), linear-gradient(160deg, #0f172a 0%, #312e81 55%, #7c2d12 100%)',
    kumo: 'radial-gradient(circle at 75% 30%, #e95420aa 0%, transparent 40%), radial-gradient(circle at 15% 85%, #77216f 0%, transparent 50%), linear-gradient(135deg, #2c001e 0%, #4a1438 60%, #1a0012 100%)',
    matrix: 'repeating-linear-gradient(90deg, #00ff6610 0 2px, transparent 2px 22px), linear-gradient(180deg, #000 0%, #032b12 100%)',
    ocean: 'radial-gradient(ellipse at 50% 0%, #22d3ee55 0%, transparent 60%), linear-gradient(180deg, #0c4a6e 0%, #082f49 50%, #020617 100%)',
    sakura: 'radial-gradient(circle at 20% 20%, #fbcfe8 0%, transparent 35%), radial-gradient(circle at 85% 70%, #f9a8d4 0%, transparent 40%), linear-gradient(135deg, #fdf2f8, #e9d5ff)',
    nebula: 'radial-gradient(ellipse at 30% 40%, #a855f766 0%, transparent 45%), radial-gradient(ellipse at 70% 60%, #06b6d455 0%, transparent 45%), radial-gradient(circle at 50% 50%, #0f0a1f 0%, #000 100%)',
    sunset: 'linear-gradient(180deg, #1e1b4b 0%, #9d174d 45%, #f97316 75%, #fde68a 100%)',
    mono: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
  };
  E.WALLPAPERS = WP;
  const wsel = $('#cfg-wallpaper');
  wsel.innerHTML = WP_LIST.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  function setWp(v) { if (!WP[v]) return; vp.style.backgroundImage = WP[v]; vp.style.backgroundSize = 'cover'; storage.set('wp', v); storage.set('customWallpaper', ''); wsel.value = v; document.dispatchEvent(new CustomEvent('eisen:wallpaper')); }
  E.setWp = setWp;
  wsel.onchange = e => setWp(e.target.value);
  const cur = storage.get('wp', 'e9-noir'); if (cur !== 'custom' && WP[cur]) { wsel.value = cur; vp.style.backgroundImage = WP[cur]; }
  E.nextWallpaper = v => { if (v && WP[v]) return setWp(v); const k = Object.keys(WP), i = k.indexOf(storage.get('wp', 'e9-noir')); setWp(k[(i + 1) % k.length]); };

  /* ---------- API pública ---------- */
  E.desktopNewFolder = async (name) => {
    if (!name) { const r = await E.form({ title: 'Nueva carpeta', html: '<p class="eis-muted">Consejo: empieza el nombre con un emoji para usarlo como icono (🎓 Escuela).</p>', fields: [{ k: 'n', label: 'Nombre', value: 'Nueva carpeta', req: true }] }); if (!r) return; name = r.n; }
    const m = String(name).trim().match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u);
    const f = { id: 'f-' + E.uid(), t: 'folder', name: (m ? m[2] : name).trim().slice(0, 40) || 'Carpeta', icon: m ? m[1] : '📂' };
    items.push(f); render(); toast('Carpeta creada: arrastra iconos encima para guardarlos'); return f.id;
  };
  E.addDesktopShortcut = id => { const a = E.apps().find(x => x.id === id); if (!a) return; if (!items.some(x => x.t === 'app' && x.ref === id && !x.p)) items.push({ id: 'd-' + E.uid(), t: 'app', ref: id, name: a.name }); render(); };
  E.desktopItems = () => items;
  E.desktopRender = render;
  document.addEventListener('eisen:installed', render);
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(render, 200); });
  document.addEventListener('eisen:env', () => setTimeout(render, 60));
  render();
})();

/* EISENKU OS · Ventanas redimensionables y carpetas personalizadas en el menú Inicio */
(() => {
  'use strict';
  const E = window.EISEN, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], storage = E.storage, esc = E.esc;

  /* ---------- 1. Redimensionar ventanas (bordes y esquinas) ---------- */
  const MIN_W = 220, MIN_H = 140;
  const sizes = storage.get('win_sizes', {});
  $$('.window').forEach(w => {
    w.dataset.ow = w.style.width; w.dataset.oh = w.style.height;
    const sz = sizes[w.id];
    if (sz && sz.w >= MIN_W && sz.h >= MIN_H) { w.style.width = sz.w + 'px'; w.style.height = sz.h + 'px'; }
    ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach(d => { const h = document.createElement('div'); h.className = 'rz rz-' + d; h.dataset.dir = d; w.appendChild(h); });
  });
  document.addEventListener('pointerdown', e => {
    const h = e.target.closest && e.target.closest('.rz'); if (!h) return;
    const w = h.parentElement; if (w.classList.contains('maximized')) return;
    e.preventDefault(); e.stopPropagation();
    const dir = h.dataset.dir, x0 = e.clientX, y0 = e.clientY, L0 = w.offsetLeft, T0 = w.offsetTop, W0 = w.offsetWidth, H0 = w.offsetHeight;
    const vp = w.offsetParent || document.body;
    try { h.setPointerCapture(e.pointerId); } catch { /* ignorar */ }
    document.body.classList.add('rz-active');
    const move = ev => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0; let L = L0, T = T0, W = W0, H = H0;
      if (dir.includes('e')) W = Math.max(MIN_W, Math.min(W0 + dx, vp.clientWidth - L0));
      if (dir.includes('s')) H = Math.max(MIN_H, Math.min(H0 + dy, vp.clientHeight - T0));
      if (dir.includes('w')) { W = Math.max(MIN_W, W0 - dx); L = L0 + (W0 - W); if (L < 0) { W += L; L = 0; } }
      if (dir.includes('n')) { H = Math.max(MIN_H, H0 - dy); T = T0 + (H0 - H); if (T < 0) { H += T; T = 0; } }
      w.style.left = L + 'px'; w.style.top = T + 'px'; w.style.width = W + 'px'; w.style.height = H + 'px';
    };
    const up = () => {
      h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
      document.body.classList.remove('rz-active');
      const s = storage.get('win_sizes', {}); s[w.id] = { w: w.offsetWidth, h: w.offsetHeight }; storage.set('win_sizes', s);
    };
    h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    w.dispatchEvent(new PointerEvent('pointerdown', { bubbles: false })); w.click();
  }, true);
  $('#cfg-btn-reset-win').onclick = () => {
    storage.set('win_sizes', {});
    $$('.window').forEach(w => { w.style.width = w.dataset.ow; w.style.height = w.dataset.oh; });
    E.toast('Tamaño de ventanas restablecido');
  };

  /* ---------- 2. Carpetas personalizadas en el menú Inicio ---------- */
  const KEY = 'start_folders';
  const folders = () => storage.get(KEY, []), save = v => storage.set(KEY, v);
  const ICON_RE = /^(\p{Extended_Pictographic}️?)\s*(.*)$/u;
  const EXPL = [['documents', '📄', 'Documentos'], ['images', '🖼️', 'Imágenes'], ['music', '🎵', 'Música'], ['downloads', '⬇️', 'Descargas'], ['root', '🏠', 'Este Equipo']];
  const tr = s => (window.EISEN_I18N ? window.EISEN_I18N.tr(s) : s);
  function winItems() {
    return $$('.window').map(w => {
      const id = w.id.replace('win-', ''), d = $('.desktop-icon-btn[data-launch="' + id + '"]');
      if (d) return { k: 'win', id, icon: d.querySelector('.ico-box').textContent.trim(), name: d.querySelector('.ico-label').textContent.trim() };
      const t = (w.querySelector('.window-title-area').textContent || '').trim(), m = t.match(/^(\p{Extended_Pictographic}️?|[^\p{L}\p{N}\s]{1,3})\s*(.*)$/u);
      return { k: 'win', id, icon: m ? m[1] : '🗔', name: (m ? m[2] : t) || id };
    });
  }
  function resolve(it) {
    if (it.k === 'win') { const w = winItems().find(x => x.id === it.id); return w ? { icon: w.icon, name: w.name, attr: `data-launch="${esc(it.id)}"` } : null; }
    if (it.k === 'app') { const a = E.apps().find(x => x.id === it.id); return a ? { icon: a.icon, name: a.name, attr: a.ext ? `data-external-url="${esc(a.ext)}"` : `data-launch="${esc(a.id)}"` } : null; }
    if (it.k === 'fs') { const f = EXPL.find(x => x[0] === it.id); return f ? { icon: f[1], name: tr(f[2]), attr: `data-fs="${f[0]}"` } : null; }
    return null;
  }
  // estructura en el menú
  const grid = $('#start-pinned-grid');
  const wrap = document.createElement('div');
  wrap.id = 'start-folders-wrap';
  wrap.innerHTML = `<div class="start-section-title"><span>Mis carpetas</span><button class="btn-secondary" id="sf-new" style="padding:2px 8px;font-size:10px;">＋ Carpeta</button></div>
    <div class="start-grid-apps" id="start-folders"></div>
    <div id="sf-view" hidden><div class="sf-bar"><b id="sf-name"></b><span class="sf-btns"><button class="btn-secondary" id="sf-add">＋ Añadir</button><button class="btn-secondary" id="sf-edit">✏️</button><button class="btn-secondary" id="sf-ren">Renombrar</button><button class="btn-secondary" id="sf-del">Eliminar</button><button class="btn-secondary" id="sf-close">✕</button></span></div><div class="start-grid-apps" id="sf-items"></div></div>`;
  grid.parentNode.insertBefore(wrap, grid.nextSibling);
  let cur = null, edit = false;
  function render() {
    const fs = folders();
    $('#start-folders').innerHTML = fs.map(f => `<button class="start-app-item" data-sf="${f.id}"><span class="start-ico">${esc(f.icon)}</span><span class="start-name">${esc(f.name)}</span><span class="start-mini-desc">${f.items.length}</span></button>`).join('') || '<div class="sf-empty">Crea tu primera carpeta con ＋ Carpeta</div>';
    const f = fs.find(x => x.id === cur);
    $('#sf-view').hidden = !f;
    if (!f) { cur = null; return; }
    $('#sf-name').textContent = f.icon + ' ' + f.name;
    $('#sf-items').innerHTML = f.items.map((it, i) => { const r = resolve(it); return r ? `<button class="start-app-item" ${r.attr} title="${esc(r.name)}"><span class="start-ico">${esc(r.icon)}</span><span class="start-name">${esc(r.name)}</span>${edit ? `<span class="sf-x" data-rm="${i}">✕</span>` : ''}</button>` : ''; }).join('') || '<div class="sf-empty">Esta carpeta está vacía. Pulsa ＋ Añadir.</div>';
    $('#sf-edit').classList.toggle('on', edit);
  }
  $('#sf-new').onclick = e => {
    e.stopPropagation();
    const n = prompt('Nombre de la carpeta:', '📁 Mi carpeta'); if (!n || !n.trim()) return;
    const m = n.trim().match(ICON_RE), fs = folders(), f = { id: 'f' + Date.now().toString(36), icon: m ? m[1] : '📁', name: m ? (m[2] || 'Carpeta') : n.trim(), items: [] };
    fs.push(f); save(fs); cur = f.id; edit = false; render();
  };
  wrap.addEventListener('click', e => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { e.preventDefault(); e.stopPropagation(); const fs = folders(), f = fs.find(x => x.id === cur); f.items.splice(+rm.dataset.rm, 1); save(fs); render(); return; }
    const t = e.target.closest('[data-sf]');
    if (t) { cur = cur === t.dataset.sf ? null : t.dataset.sf; edit = false; render(); return; }
    const fsb = e.target.closest('[data-fs]');
    if (fsb) { if (E.filesOpenFolder) { E.filesOpenFolder(fsb.dataset.fs); $('#start-menu-panel').classList.remove('open'); return; } E.openWindow('explorer'); const b = $('.explorer-sidebar button[data-folder="' + fsb.dataset.fs + '"]'); if (b) b.click(); $('#start-menu-panel').classList.remove('open'); }
  });
  $('#sf-close').onclick = () => { cur = null; render(); };
  $('#sf-edit').onclick = () => { edit = !edit; render(); };
  $('#sf-ren').onclick = () => {
    const fs = folders(), f = fs.find(x => x.id === cur); if (!f) return;
    const n = prompt('Nombre de la carpeta:', f.icon + ' ' + f.name); if (!n || !n.trim()) return;
    const m = n.trim().match(ICON_RE); if (m) { f.icon = m[1]; f.name = m[2] || f.name; } else f.name = n.trim();
    save(fs); render();
  };
  $('#sf-del').onclick = () => { if (!confirm('¿Eliminar esta carpeta del Inicio?')) return; save(folders().filter(x => x.id !== cur)); cur = null; render(); };

  /* selector de apps */
  const picker = document.createElement('div'); picker.className = 'sf-picker'; picker.hidden = true;
  picker.innerHTML = '<div class="sf-pcard"><div class="sf-bar"><b>＋ Añadir</b><button class="btn-primary" id="sfp-done">Listo</button></div><input id="sfp-q" class="input-text" placeholder="Buscar apps…"><div id="sfp-list" class="sf-plist"></div></div>';
  document.body.appendChild(picker);
  function pickerList() {
    const f = folders().find(x => x.id === cur); if (!f) return;
    const q = $('#sfp-q').value.trim().toLowerCase(), has = (k, id) => f.items.some(i => i.k === k && i.id === id);
    const all = [...EXPL.map(x => ({ k: 'fs', id: x[0], icon: x[1], name: '📂 ' + tr(x[2]) })), ...winItems(), ...E.apps().filter(a => a.ext || $('#win-' + a.id)).map(a => ({ k: 'app', id: a.id, icon: a.icon, name: a.name }))];
    const seen = new Set(), list = all.filter(x => { const key = x.k === 'app' && $('#win-' + x.id) ? 'win:' + x.id : x.k + ':' + x.id; if (seen.has(key)) return false; seen.add(key); return !q || x.name.toLowerCase().includes(q); }).slice(0, 120);
    $('#sfp-list').innerHTML = list.map(x => `<div class="sf-prow${has(x.k, x.id) ? ' on' : ''}" data-k="${x.k}" data-id="${esc(x.id)}"><span>${esc(x.icon)}</span><span style="flex:1">${esc(x.name)}</span><span>${has(x.k, x.id) ? '✓' : '＋'}</span></div>`).join('');
  }
  $('#sf-add').onclick = () => { picker.hidden = false; $('#sfp-q').value = ''; pickerList(); $('#sfp-q').focus(); };
  $('#sfp-q').oninput = pickerList;
  $('#sfp-done').onclick = () => { picker.hidden = true; render(); };
  picker.addEventListener('click', e => {
    if (e.target === picker) { picker.hidden = true; render(); return; }
    const r = e.target.closest('.sf-prow'); if (!r) return;
    const fs = folders(), f = fs.find(x => x.id === cur), i = f.items.findIndex(x => x.k === r.dataset.k && x.id === r.dataset.id);
    if (i >= 0) f.items.splice(i, 1); else f.items.push({ k: r.dataset.k, id: r.dataset.id });
    save(fs); pickerList();
  });
  $('#cfg-btn-start-folders').onclick = () => { $('#start-menu-panel').classList.add('open'); wrap.scrollIntoView({ block: 'center' }); };
  render();
})();

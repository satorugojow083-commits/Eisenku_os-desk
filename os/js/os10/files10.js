/* =====================================================================
   EISENKU OS 10.0 NEXT GENERATION · Archivos 10.0 (se carga al abrir Archivos)
   Doble panel, vista rápida (Espacio), etiquetas y colores, búsqueda avanzada (también en el
   contenido), filtros guardados, acceso rápido y carpetas frecuentes, comparación de archivos,
   metadatos con huellas, comprimir en ZIP y aviso de vaciado automático de la papelera.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, F = K && K.files, FM = F && F.fm; if (!FM || K.files10) return;
  K.files10 = true;
  const S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, $$ = K.$$;
  K.loadCss('css/apps10.css');
  const libs = () => Promise.all([K.hash ? 0 : K.loadScript('js/os10/lib/hash10.js'), K.exif ? 0 : K.loadScript('js/os10/lib/exif10.js')]);
  const root = FM.root, M = FM.main, st = FM.st, q = s => root.querySelector(s);
  const base = p => p.slice(p.lastIndexOf('/') + 1), join = (a, b) => a ? a + '/' + b : b;
  const TAGC = [['rojo', '#e5484d'], ['naranja', '#f08c38'], ['amarillo', '#e8c547'], ['verde', '#34a582'], ['azul', '#4f8fd6'], ['morado', '#8a74c4'], ['rosa', '#e8709f'], ['gris', '#8b919c']];
  const tagColor = t => (TAGC.find(x => x[0] === t) || [])[1] || '#6a7180';
  const dirColors = () => S.get('os10_dircolors', {}) || {};
  let tagCache = {}, lastQ = null;
  const refreshTags = async () => { const m = {}; (await F.all()).forEach(f => (f.tags || []).forEach(t => { m[t] = (m[t] || 0) + 1; })); tagCache = m; };

  /* ---------- vistas especiales: etiquetas, filtros guardados y búsqueda avanzada ---------- */
  async function runQuery(qq) {
    let l = qq.trash ? await F.allRaw() : await F.all(); const n = K.norm(qq.name || ''), content = (qq.content || '').toLowerCase();
    const minB = (+qq.min || 0) * (qq.unit === 'KB' ? 1024 : 1048576), maxB = (+qq.max || 0) * (qq.unit === 'KB' ? 1024 : 1048576);
    const from = qq.from ? new Date(qq.from + 'T00:00').getTime() : 0, to = qq.to ? new Date(qq.to + 'T23:59:59').getTime() : 0, exts = String(qq.ext || '').toLowerCase().split(/[\s,;]+/).map(x => x.replace(/^\./, '')).filter(Boolean);
    l = l.filter(f => (!n || K.norm(f.name).includes(n)) && (!qq.kind || F.kindOf(f) === qq.kind) && (!minB || f.size >= minB) && (!maxB || f.size <= maxB) && (!from || (f.mod || f.date) >= from) && (!to || (f.mod || f.date) <= to) && (!qq.tag || (f.tags || []).includes(qq.tag)) && (!qq.scope || f.folder === qq.scope || (f.folder || '').startsWith(qq.scope + '/')) && (!exts.length || exts.includes(F.extOf(f.name))));
    if (content) { const out = []; for (const f of l.slice(0, 600)) { if (F.kindOf(f) !== 'text' || f.size > 3e6) continue; try { if ((await f.blob.text()).toLowerCase().includes(content)) out.push(f); } catch { /* ilegible */ } } l = out; }
    return l.sort((a, b) => (b.mod || b.date) - (a.mod || a.date)).slice(0, 1000);
  }
  K.ext.files = {
    async special(sp) {
      if (sp.startsWith('tag:')) { const t = sp.slice(4); return { files: (await F.all()).filter(f => (f.tags || []).includes(t)) }; }
      if (sp.startsWith('filter:')) { const fl = (S.get('os10_fm_filters', []) || []).find(x => x.id === sp.slice(7)); return { files: fl ? await runQuery(fl.q) : [] }; }
      if (sp === 'search' && lastQ) return { files: await runQuery(lastQ) };
      return { files: [] };
    },
    label(sp) { if (sp.startsWith('tag:')) return tr('Etiqueta') + ': ' + sp.slice(4); if (sp.startsWith('filter:')) { const fl = (S.get('os10_fm_filters', []) || []).find(x => x.id === sp.slice(7)); return '🔎 ' + (fl ? fl.name : tr('Filtro')); } if (sp === 'search') return '🔎 ' + tr('Búsqueda avanzada'); return sp; },
    side(stt) {
      const pins = S.get('os10_fm_pins', []) || [], freq = Object.entries(S.get('os10_fm_freq', {}) || {}).filter(([p]) => !pins.includes(p)).sort((a, b) => b[1] - a[1]).slice(0, 4), fl = S.get('os10_fm_filters', []) || [], tags = Object.entries(tagCache).sort((a, b) => b[1] - a[1]);
      const dc = dirColors();
      return `<h6>${esc(tr('Acceso rápido'))}</h6>${pins.map(p => `<button class="k9-item${!stt.special && stt.path === p ? ' on' : ''}" data-go="${esc(p)}" data-drop="${esc(p)}">${I('pin', 16)} <span style="${dc[p] ? 'color:' + esc(dc[p]) : ''}">${esc(base(p) || p)}</span></button>`).join('') || `<small class="k9-muted" style="padding:2px 9px">${esc(tr('Ancla carpetas con clic derecho'))}</small>`}
        ${freq.length ? `<h6>${esc(tr('Frecuentes'))}</h6>` + freq.map(([p]) => `<button class="k9-item" data-go="${esc(p)}" data-drop="${esc(p)}">${I('folder', 16)} ${esc(base(p) || p)}</button>`).join('') : ''}
        ${tags.length ? `<h6>${esc(tr('Etiquetas'))}</h6>` + tags.map(([t, c]) => `<button class="k9-item${stt.special === 'tag:' + t ? ' on' : ''}" data-go="#tag:${esc(t)}"><i class="s10-tagdot" style="background:${esc(tagColor(t))}"></i> ${esc(t)} <small style="margin-left:auto" class="k9-muted">${c}</small></button>`).join('') : ''}
        <h6>${esc(tr('Filtros guardados'))}</h6>${fl.map(f => `<button class="k9-item${stt.special === 'filter:' + f.id ? ' on' : ''}" data-go="#filter:${esc(f.id)}">${I('filter', 16)} ${esc(f.name)}</button>`).join('')}<button class="k9-item" data-s10fm="search">${I('search', 16)} ${esc(tr('Búsqueda avanzada…'))}</button>`;
    },
    after(main, cur, stt) {
      const dc = dirColors();
      $$('.fm9-it[data-id]', main).forEach(it => { const f = cur.files.find(x => x.id === it.dataset.id); if (f && f.tags && f.tags.length && !it.querySelector('.s10-tags')) it.insertAdjacentHTML('beforeend', `<span class="s10-tags">${f.tags.slice(0, 4).map(t => `<i class="s10-tagdot" style="background:${esc(tagColor(t))}" title="${esc(t)}"></i>`).join('')}</span>`); });
      $$('.fm9-it[data-dir]', main).forEach(it => { const c = dc[it.dataset.dir]; const ic = it.querySelector('.fm9-ic') || it.querySelector('td'); if (c && ic) { ic.style.filter = `drop-shadow(0 0 0 ${c})`; it.style.setProperty('--s10-dc', c); it.classList.add('s10-dcol'); } });
      if (!stt.special && stt.path && stt.path !== after.last) { after.last = stt.path; const fq = S.get('os10_fm_freq', {}) || {}; fq[stt.path] = (fq[stt.path] || 0) + 1; const keys = Object.keys(fq); if (keys.length > 60) keys.sort((a, b) => fq[a] - fq[b]).slice(0, keys.length - 60).forEach(k => delete fq[k]); S.set('os10_fm_freq', fq); }
      if (stt.special === 'trash') { const d = +K.cfg('trash').get('days', 0) || 0; const b = main.querySelector('.fm9-banner'); if (b && !b.querySelector('.s10-tdays')) b.insertAdjacentHTML('beforeend', `<small class="s10-tdays k9-muted"> · ${esc(d ? tr('Se vacía sola tras') + ' ' + d + ' ' + tr('días') : tr('Vaciado automático desactivado (Configuración › Archivos y almacenamiento)'))}</small>`); }
      if (stt.special === 'search' || (stt.special || '').startsWith('filter:')) { if (!main.querySelector('.s10-qbar')) main.insertAdjacentHTML('afterbegin', `<div class="fm9-banner s10-qbar">${I('filter', 15)} ${cur.files.length} ${esc(tr('resultados'))} <button class="k9-btn" data-s10fm="search">${esc(tr('Cambiar criterios'))}</button>${stt.special === 'search' ? `<button class="k9-btn" data-s10fm="savefilter">${esc(tr('Guardar como filtro'))}</button>` : `<button class="k9-btn dng" data-s10fm="delfilter">${esc(tr('Eliminar filtro'))}</button>`}</div>`); }
      if (P2.open) p2Render();
    },
    menu(items, c) {
      const ext = [], sel = c.sel || [], dirs = c.dirs || [];
      if (c.trash) return;
      if (sel.length || dirs.length) {
        if (c.one) ext.push({ label: 'Vista rápida', icon: 'eye', act: () => quickLook(c.one.id), kbd: 'Espacio' });
        if (sel.length) ext.push({ label: 'Etiquetas y color…', icon: 'tag', act: () => tagDialog(sel) });
        if (c.one) ext.push({ label: 'Metadatos y huellas', icon: 'info', act: () => metaDialog(c.one) });
        if (sel.length === 2) ext.push({ label: 'Comparar los 2 archivos', icon: 'layers', act: () => compare(sel[0], sel[1]) });
        ext.push({ label: 'Comprimir en ZIP', icon: 'box', act: () => compress(sel, dirs) });
        if (P2.open) ext.push({ label: 'Copiar al otro panel', icon: 'copy', act: () => transfer(sel, dirs, P2.path, 'copy'), kbd: 'F5' }, { label: 'Mover al otro panel', icon: 'right', act: () => transfer(sel, dirs, P2.path, 'move'), kbd: 'F6' });
        if (dirs.length === 1) { const pins = S.get('os10_fm_pins', []) || []; ext.push({ label: pins.includes(dirs[0]) ? 'Quitar de Acceso rápido' : 'Anclar en Acceso rápido', icon: 'pin', act: () => togglePin(dirs[0]) }, { label: 'Color de la carpeta…', icon: 'palette', act: () => dirColor(dirs[0]) }); }
      } else if (!c.special && st.path) {
        const pins = S.get('os10_fm_pins', []) || []; ext.push({ label: pins.includes(st.path) ? 'Quitar esta carpeta de Acceso rápido' : 'Anclar esta carpeta en Acceso rápido', icon: 'pin', act: () => togglePin(st.path) }, { label: 'Búsqueda avanzada…', icon: 'search', act: () => searchDialog() });
      }
      if (!ext.length) return;
      const at = items.findIndex(it => it.label === 'Propiedades'); items.splice(at < 0 ? items.length : at, 0, { sep: true }, ...ext);
    }
  };
  const after = K.ext.files.after;
  K.on('files', () => { refreshTags().then(() => FM.side()); if (P2.open) p2Render(); });

  /* ---------- barra de herramientas ---------- */
  const tools = q('.fm9-tools');
  if (tools && !tools.querySelector('[data-s10fm]')) {
    const sp = tools.querySelector('.sp');
    sp.insertAdjacentHTML('beforebegin', `<button class="k9-btn" data-s10fm="dual" title="${esc(tr('Doble panel'))} (F9)">${I('layers', 15)} ${esc(tr('Doble panel'))}</button><button class="k9-btn" data-s10fm="preview" title="${esc(tr('Vista rápida'))} (${esc(tr('Espacio'))})">${I('eye', 15)}</button><button class="k9-btn" data-s10fm="search" title="${esc(tr('Búsqueda avanzada'))} (Ctrl+F)">${I('filter', 15)}</button><button class="k9-btn" data-s10fm="compare" title="${esc(tr('Comparar 2 archivos'))}">${I('layers', 15)} ≠</button>`);
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-s10fm]'); if (!b) return; e.stopPropagation(); const a = b.dataset.s10fm, sel = FM.selected();
    if (a === 'dual') p2Toggle(); if (a === 'preview') { if (sel[0]) quickLook(sel[0].id); else E.toast(tr('Selecciona un archivo')); } if (a === 'search') searchDialog();
    if (a === 'compare') { if (sel.length === 2) compare(sel[0], sel[1]); else E.toast(tr('Selecciona exactamente 2 archivos (Ctrl+clic)')); }
    if (a === 'savefilter') saveFilter(); if (a === 'delfilter') { const id = (st.special || '').slice(7); S.set('os10_fm_filters', (S.get('os10_fm_filters', []) || []).filter(x => x.id !== id)); FM.nav('#home'); }
  }, true);
  M.addEventListener('keydown', e => {
    if (e.target.matches('input,textarea')) return; const sel = FM.selected();
    if (e.key === ' ' && sel[0]) { e.preventDefault(); quickLook(sel[0].id); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); searchDialog(); }
    else if (e.key === 'F9') { e.preventDefault(); p2Toggle(); }
    else if ((e.key === 'F5' || e.key === 'F6') && P2.open) { e.preventDefault(); transfer(sel, FM.selDirs(), P2.path, e.key === 'F5' ? 'copy' : 'move'); }
  });

  /* ---------- etiquetas, color de carpeta y acceso rápido ---------- */
  async function tagDialog(files) {
    const cur = new Set(files.flatMap(f => f.tags || [])), ov = document.createElement('div'); ov.className = 'eis-modal';
    ov.innerHTML = `<form class="eis-modal-card"><h3>${esc(tr('Etiquetas'))} · ${files.length} ${esc(tr('archivos'))}</h3><div class="s10-chips">${TAGC.map(([t, c]) => `<label class="s10-chip"><input type="checkbox" name="t_${t}" ${cur.has(t) ? 'checked' : ''}><i class="s10-tagdot" style="background:${c}"></i>${esc(tr(t))}</label>`).join('')}</div><label class="eis-field"><span>${esc(tr('Otras etiquetas (separadas por comas)'))}</span><input class="input-text" name="custom" value="${esc([...cur].filter(t => !TAGC.some(x => x[0] === t)).join(', '))}"></label><div class="eis-modal-btns"><button type="button" class="btn-secondary" data-x>${esc(tr('Cancelar'))}</button><button class="btn-primary">${esc(tr('Guardar'))}</button></div></form>`;
    document.body.appendChild(ov); const f = ov.querySelector('form');
    ov.querySelector('[data-x]').onclick = () => ov.remove();
    f.onsubmit = async e => { e.preventDefault(); const tags = TAGC.map(x => x[0]).filter(t => f.elements['t_' + t].checked).concat(f.elements.custom.value.split(',').map(x => x.trim().toLowerCase().slice(0, 24)).filter(Boolean)); for (const x of files) await F.update(x.id, { tags: [...new Set(tags)].slice(0, 12) }); ov.remove(); E.toast(tr('Etiquetas guardadas')); FM.render(); };
  }
  async function dirColor(p) { const r = await E.form({ title: tr('Color de la carpeta'), fields: [{ k: 'c', label: base(p), type: 'select', options: [['', tr('Predeterminado')]].concat(TAGC.map(([t, c]) => [c, tr(t)])) }], ok: tr('Aplicar') }); if (!r) return; const m = dirColors(); if (r.c) m[p] = r.c; else delete m[p]; S.set('os10_dircolors', m); FM.render(); }
  function togglePin(p) { const l = S.get('os10_fm_pins', []) || [], i = l.indexOf(p); if (i >= 0) l.splice(i, 1); else l.push(p); S.set('os10_fm_pins', l.slice(0, 20)); FM.side(); E.toast(i >= 0 ? tr('Quitada de Acceso rápido') : tr('Anclada en Acceso rápido')); }

  /* ---------- búsqueda avanzada y filtros guardados ---------- */
  async function searchDialog() {
    const p = lastQ || {}, kinds = [['', 'Cualquiera'], ['image', 'Imágenes'], ['audio', 'Audio'], ['video', 'Vídeo'], ['pdf', 'PDF'], ['text', 'Texto y código'], ['office', 'Documentos de oficina'], ['archive', 'Comprimidos'], ['other', 'Otros']];
    const r = await E.form({ title: tr('Búsqueda avanzada'), fields: [{ k: 'name', label: tr('El nombre contiene'), value: p.name || st.q || '' }, { k: 'content', label: tr('El contenido contiene (archivos de texto)'), value: p.content || '' }, { k: 'kind', label: tr('Tipo'), type: 'select', options: kinds.map(([v, l]) => [v, tr(l)]), value: p.kind || '' }, { k: 'ext', label: tr('Extensiones (p. ej. pdf, docx)'), value: p.ext || '' }, { k: 'min', label: tr('Tamaño mínimo'), type: 'number', value: p.min || '' }, { k: 'max', label: tr('Tamaño máximo'), type: 'number', value: p.max || '' }, { k: 'unit', label: tr('Unidad del tamaño'), type: 'select', options: [['MB', 'MB'], ['KB', 'KB']], value: p.unit || 'MB' }, { k: 'from', label: tr('Modificado desde'), type: 'date', value: p.from || '' }, { k: 'to', label: tr('Modificado hasta'), type: 'date', value: p.to || '' }, { k: 'tag', label: tr('Con la etiqueta'), type: 'select', options: [['', tr('Cualquiera')]].concat(Object.keys(tagCache).map(t => [t, t])), value: p.tag || '' }, { k: 'scope', label: tr('Dónde'), type: 'select', options: [['', tr('En todos los archivos')]].concat(st.path && !st.special ? [[st.path, tr('En') + ' ' + F.pretty(st.path)]] : []), value: p.scope || '' }], ok: tr('Buscar') });
    if (!r) return; lastQ = r; FM.nav('#search'); K.activity && K.activity('search', 'explorer', tr('Búsqueda avanzada') + ': ' + (r.name || r.content || r.kind || ''));
  }
  async function saveFilter() { if (!lastQ) return; const n = await K.ui.prompt(tr('Guardar filtro'), tr('Nombre'), lastQ.name || lastQ.kind || tr('Mi filtro')); if (!n) return; const l = S.get('os10_fm_filters', []) || []; const id = E.uid(); l.push({ id, name: n.slice(0, 40), q: lastQ }); S.set('os10_fm_filters', l.slice(-20)); FM.nav('#filter:' + id); E.toast(tr('Filtro guardado en la barra lateral')); }

  /* ---------- vista rápida ---------- */
  let ql = null;
  async function quickLook(id) {
    const list = FM.current().files, i = list.findIndex(f => f.id === id), f = list[i] || await F.get(id); if (!f) return;
    if (!ql) { ql = document.createElement('div'); ql.className = 's10-ql'; ql.setAttribute('role', 'dialog'); ql.tabIndex = -1; root.appendChild(ql); ql.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); qlClose(); } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); qlMove(1); } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); qlMove(-1); } else if (e.key === 'Enter') { e.preventDefault(); const x = ql.__f; qlClose(); F.open(x.id); } }); ql.addEventListener('click', e => { const b = e.target.closest('[data-ql]'); if (!b) return; const a = b.dataset.ql; if (a === 'x') qlClose(); if (a === 'p') qlMove(-1); if (a === 'n') qlMove(1); if (a === 'o') { const x = ql.__f; qlClose(); F.open(x.id); } if (a === 'm') metaDialog(ql.__f); }); }
    if (ql.__u) URL.revokeObjectURL(ql.__u); ql.__u = null; ql.__f = f; ql.hidden = false;
    const k = F.kindOf(f), e = F.extOf(f.name);
    ql.innerHTML = `<header><b>${esc(f.name)}</b><small class="k9-muted">${esc(K.fmt.bytes(f.size))} · ${esc(F.typeOf(f))}${list.length > 1 && i >= 0 ? ` · ${i + 1}/${list.length}` : ''}</small><span class="sp"></span><button class="k9-btn" data-ql="p" aria-label="${esc(tr('Anterior'))}">${I('left', 15)}</button><button class="k9-btn" data-ql="n" aria-label="${esc(tr('Siguiente'))}">${I('right', 15)}</button><button class="k9-btn" data-ql="m">${I('info', 15)} ${esc(tr('Metadatos'))}</button><button class="k9-btn pri" data-ql="o">${I('external', 15)} ${esc(tr('Abrir'))}</button><button class="k9-btn" data-ql="x" aria-label="${esc(tr('Cerrar'))}">${I('close', 15)}</button></header><div class="s10-ql-b" data-qb><div class="k9-spin"></div></div>`;
    ql.focus(); const B = ql.querySelector('[data-qb]');
    try {
      const url = () => (ql.__u = URL.createObjectURL(f.blob));
      if (k === 'image') B.innerHTML = `<img src="${url()}" alt="${esc(f.name)}">`;
      else if (k === 'video') B.innerHTML = `<video src="${url()}" controls autoplay playsinline></video>`;
      else if (k === 'audio') B.innerHTML = `<div class="s10-ql-aud">${I('music', 64)}<audio src="${url()}" controls autoplay></audio></div>`;
      else if (k === 'pdf') { const u = URL.createObjectURL(new Blob([f.blob], { type: 'application/pdf' })); ql.__u = u; B.innerHTML = `<iframe src="${u}" title="PDF"></iframe>`; }
      else if (e === 'md' || e === 'markdown') B.innerHTML = `<div class="md-view s10-ql-doc">${K.md(await f.blob.slice(0, 400000).text()).html}</div>`;
      else if (e === 'csv' || e === 'tsv') { const t = await f.blob.slice(0, 300000).text(), sepc = e === 'tsv' ? '\t' : (t.split('\n')[0].split(';').length > t.split('\n')[0].split(',').length ? ';' : ','); const rows = t.split(/\r?\n/).filter(Boolean).slice(0, 200).map(r => r.split(sepc)); B.innerHTML = `<div class="s10-ql-doc"><table class="k9-table">${rows.map((r, j) => `<tr>${r.map(c => j ? `<td>${esc(c.replace(/^"|"$/g, ''))}</td>` : `<th>${esc(c.replace(/^"|"$/g, ''))}</th>`).join('')}</tr>`).join('')}</table></div>`; }
      else if (e === 'json') { const t = await f.blob.slice(0, 600000).text(); let p = t; try { p = JSON.stringify(JSON.parse(t), null, 2); } catch { /* JSON no válido: se muestra tal cual */ } B.innerHTML = `<pre class="s10-ql-pre">${esc(p.slice(0, 300000))}</pre>`; }
      else if (e === 'docx' && E.REG.word) { if (!K.docx) await K.loadScript('js/os9/docx.js'); const h = await K.docx.toHtml(f.blob); B.innerHTML = `<div class="s10-ql-doc s10-ql-paper">${K.sanitize(typeof h === 'string' ? h : (h && h.html) || '', { style: true })}</div>`; }
      else if (k === 'text') B.innerHTML = `<pre class="s10-ql-pre">${esc((await f.blob.slice(0, 300000).text()))}</pre>`;
      else if (k === 'archive' && e === 'zip') { const items = await K.unzip(f.blob); B.innerHTML = `<div class="s10-ql-doc"><p><b>${items.length}</b> ${esc(tr('archivos dentro'))} · ${esc(K.fmt.bytes(items.reduce((a, x) => a + x.data.length, 0)))} ${esc(tr('sin comprimir'))}</p><ul class="s10-ql-list">${items.slice(0, 300).map(x => `<li>${esc(x.name)} <small class="k9-muted">${esc(K.fmt.bytes(x.data.length))}</small></li>`).join('')}</ul></div>`; }
      else if (/^(ttf|otf|woff2?)$/.test(e)) { const fam = 'qlf' + Date.now(); const ff = new FontFace(fam, await f.blob.arrayBuffer()); await ff.load(); document.fonts.add(ff); B.innerHTML = `<div class="s10-ql-doc" style="font-family:'${fam}'"><p style="font-size:42px">Aa Bb Cc Ññ 0123</p><p style="font-size:22px">El veloz murciélago hindú comía feliz cardillo y kiwi.</p><p style="font-size:15px">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz ¿¡áéíóú€$&@!?</p></div>`; }
      else B.innerHTML = `<div class="k9-state">${I('file', 48)}<p>${esc(tr('No hay vista previa para este tipo de archivo.'))}</p><button class="k9-btn" data-ql="m">${esc(tr('Ver metadatos'))}</button></div>`;
    } catch (er) { B.innerHTML = `<div class="k9-state k9-err">${I('shield', 36)}<p>${esc(tr('No se pudo mostrar la vista previa'))}: ${esc(er.message || String(er))}</p></div>`; }
  }
  function qlMove(d) { const list = FM.current().files; if (!ql || !list.length) return; const i = list.findIndex(f => f.id === ql.__f.id); const n = list[(i + d + list.length) % list.length]; if (n) { st.sel.clear(); st.sel.add(n.id); $$('.fm9-it', M).forEach(x => x.classList.toggle('sel', x.dataset.id === n.id)); quickLook(n.id); } }
  function qlClose() { if (!ql) return; ql.hidden = true; ql.innerHTML = ''; if (ql.__u) URL.revokeObjectURL(ql.__u); ql.__u = null; M.focus(); }
  K.ext.files.quickLook = quickLook;

  /* ---------- metadatos y huellas ---------- */
  async function metaDialog(f) {
    await libs(); const k = F.kindOf(f), e = F.extOf(f.name);
    const ov = document.createElement('div'); ov.className = 'eis-modal';
    ov.innerHTML = `<div class="eis-modal-card s10-wide"><h3>${I('info', 18)} ${esc(f.name)}</h3><div data-mg></div><h4 style="margin:10px 0 6px">${esc(tr('Huellas'))}</h4><div data-mh class="k9-small">${esc(tr('Calculando…'))}</div><h4 style="margin:10px 0 6px" data-mkh></h4><div data-mk class="k9-small"></div><div class="eis-modal-btns"><button class="btn-secondary" data-copy>${esc(tr('Copiar todo'))}</button><button class="btn-primary" data-x>${esc(tr('Cerrar'))}</button></div></div>`;
    document.body.appendChild(ov); ov.addEventListener('click', ev => { if (ev.target === ov || ev.target.closest('[data-x]')) ov.remove(); if (ev.target.closest('[data-copy]')) K.ui.copy(ov.querySelector('.eis-modal-card').innerText); });
    const gen = [['Nombre', f.name], ['Tipo', F.typeOf(f)], ['Tamaño', K.fmt.bytes(f.size) + ' (' + f.size.toLocaleString() + ' B)'], ['Ubicación', f.trash ? tr('Papelera') : F.pretty(f.folder || 'documents')], ['Creado', K.fmt.dt(f.date)], ['Modificado', K.fmt.dt(f.mod || f.date)], ['Etiquetas', (f.tags || []).join(', ') || '—'], ['Favorito', f.fav ? tr('Sí') : tr('No')]];
    ov.querySelector('[data-mg]').innerHTML = K.u10.kv(gen);
    K.hash.compute(f.blob, ['MD5', 'SHA-1', 'SHA-256', 'CRC32'], p => { const h = ov.querySelector('[data-mh]'); if (h && p < 1) h.textContent = tr('Calculando…') + ' ' + Math.round(p * 100) + ' %'; }).then(h => { const el = ov.querySelector('[data-mh]'); if (el) el.innerHTML = K.u10.kv(Object.entries(h).map(([a, v]) => [a, `<code class="k9-mono" style="word-break:break-all">${v}</code>`, true])); }).catch(er => { const el = ov.querySelector('[data-mh]'); if (el) el.textContent = er.message; });
    const kind = [], set = (t, rows) => { ov.querySelector('[data-mkh]').textContent = tr(t); ov.querySelector('[data-mk]').innerHTML = K.u10.kv(rows); };
    try {
      if (k === 'image') { const u = URL.createObjectURL(f.blob); const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = u; }).catch(() => { }); kind.push(['Dimensiones', img.naturalWidth ? img.naturalWidth + ' × ' + img.naturalHeight + ' px' : '—'], ['Megapíxeles', img.naturalWidth ? (img.naturalWidth * img.naturalHeight / 1e6).toFixed(2) : '—']); URL.revokeObjectURL(u); if (/^jpe?g$/.test(e)) { const x = K.exif.fromJpeg(new Uint8Array(await f.blob.slice(0, 262144).arrayBuffer())); if (x) kind.push(...K.exif.describe(x.tags)); else kind.push(['EXIF', tr('Sin datos EXIF')]); } set('Imagen', kind); }
      else if (k === 'audio' || k === 'video') { const u = URL.createObjectURL(f.blob); const m = document.createElement(k); m.preload = 'metadata'; await new Promise(res => { m.onloadedmetadata = res; m.onerror = res; m.src = u; setTimeout(res, 4000); }); kind.push(['Duración', isFinite(m.duration) ? K.u10.hms(m.duration) : '—']); if (k === 'video') kind.push(['Resolución', m.videoWidth ? m.videoWidth + ' × ' + m.videoHeight : '—']); if (m.duration && isFinite(m.duration)) kind.push(['Tasa media', Math.round(f.size * 8 / m.duration / 1000) + ' kb/s']); URL.revokeObjectURL(u); set(k === 'audio' ? 'Audio' : 'Vídeo', kind); }
      else if (k === 'text' && f.size < 8e6) { const t = await f.blob.text(); set('Texto', [['Líneas', t.split(/\r\n|\r|\n/).length], ['Palabras', (t.match(/\S+/g) || []).length], ['Caracteres', t.length], ['Saltos de línea', /\r\n/.test(t) ? 'Windows (CRLF)' : /\r/.test(t) ? 'Mac antiguo (CR)' : 'Unix (LF)'], ['Codificación', /�/.test(t) ? tr('No es UTF-8 válido') : 'UTF-8'], ['BOM', t.charCodeAt(0) === 0xFEFF ? tr('Sí') : tr('No')]]); }
      else if (k === 'pdf') { const t = new TextDecoder('latin1').decode(new Uint8Array(await f.blob.slice(0, Math.min(f.size, 30e6)).arrayBuffer())); set('PDF', [['Versión', (t.match(/%PDF-(\d\.\d)/) || [])[1] || '—'], ['Páginas (aprox.)', (t.match(/\/Type\s*\/Page[^s]/g) || []).length || '—'], ['Cifrado', /\/Encrypt/.test(t) ? tr('Sí') : tr('No')], ['Título', ((t.match(/\/Title\s*\(([^)]{0,120})\)/) || [])[1]) || '—'], ['Creado con', ((t.match(/\/Producer\s*\(([^)]{0,120})\)/) || [])[1]) || '—']]); }
      else if (e === 'zip' || e === 'epub' || e === 'docx' || e === 'xlsx' || e === 'pptx') { const items = await K.unzip(f.blob); set('Archivo comprimido', [['Entradas', items.length], ['Tamaño sin comprimir', K.fmt.bytes(items.reduce((a, x) => a + x.data.length, 0))], ['Relación de compresión', items.length ? Math.round(f.size / Math.max(1, items.reduce((a, x) => a + x.data.length, 0)) * 100) + ' %' : '—']]); }
    } catch (er) { set('Detalles', [['Error', er.message || String(er)]]); }
  }
  K.ext.files.meta = metaDialog;

  /* ---------- comparación de archivos ---------- */
  function diffLines(a, b) {
    const n = a.length, m = b.length; if (n * m > 6e6) return null;
    const W = m + 1, dp = new Uint32Array((n + 1) * W);
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i * W + j] = a[i] === b[j] ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
    const ops = []; let i = 0, j = 0;
    while (i < n && j < m) { if (a[i] === b[j]) { ops.push(['=', a[i], b[j]]); i++; j++; } else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) { ops.push(['-', a[i], null]); i++; } else { ops.push(['+', null, b[j]]); j++; } }
    while (i < n) ops.push(['-', a[i++], null]); while (j < m) ops.push(['+', null, b[j++]]);
    // emparejar eliminaciones y adiciones contiguas como líneas cambiadas
    const out = []; for (let k = 0; k < ops.length;) { if (ops[k][0] === '=') { out.push(ops[k++]); continue; } const del = [], add = []; while (k < ops.length && ops[k][0] !== '=') { if (ops[k][0] === '-') del.push(ops[k][1]); else add.push(ops[k][2]); k++; } const L = Math.max(del.length, add.length); for (let x = 0; x < L; x++) out.push([x < del.length && x < add.length ? '~' : x < del.length ? '-' : '+', x < del.length ? del[x] : null, x < add.length ? add[x] : null]); }
    return out;
  }
  K.diffLines = diffLines;
  async function compare(a, b) {
    await libs(); const ov = document.createElement('div'); ov.className = 'eis-modal';
    ov.innerHTML = `<div class="eis-modal-card s10-wide s10-cmp"><h3>${I('layers', 18)} ${esc(tr('Comparar archivos'))}</h3><div data-cs class="k9-small"><div class="k9-spin"></div></div><div data-cd></div><div class="eis-modal-btns"><button class="btn-primary" data-x>${esc(tr('Cerrar'))}</button></div></div>`;
    document.body.appendChild(ov); ov.addEventListener('click', ev => { if (ev.target === ov || ev.target.closest('[data-x]')) ov.remove(); });
    const [ha, hb] = await Promise.all([K.hash.compute(a.blob, ['SHA-256']), K.hash.compute(b.blob, ['SHA-256'])]); const same = ha['SHA-256'] === hb['SHA-256'];
    const head = K.u10.kv([[a.name, K.fmt.bytes(a.size) + ' · SHA-256 ' + ha['SHA-256'].slice(0, 16) + '…'], [b.name, K.fmt.bytes(b.size) + ' · SHA-256 ' + hb['SHA-256'].slice(0, 16) + '…'], ['Resultado', same ? '✓ ' + tr('Son idénticos byte a byte') : '✗ ' + tr('Son distintos')]]);
    const S2 = ov.querySelector('[data-cs]'), D = ov.querySelector('[data-cd]'); S2.innerHTML = head;
    if (same) return;
    const textual = [a, b].every(f => F.kindOf(f) === 'text' && f.size < 3e6);
    if (textual) {
      const la = (await a.blob.text()).split(/\r?\n/), lb = (await b.blob.text()).split(/\r?\n/), ops = diffLines(la, lb);
      if (!ops) { D.innerHTML = K.u10.note('Los archivos son demasiado largos para la comparación línea a línea; se muestran solo las huellas.', 'warn'); return; }
      const cnt = { '+': 0, '-': 0, '~': 0 }; ops.forEach(o => { if (o[0] !== '=') cnt[o[0]]++; });
      let la1 = 0, lb1 = 0; const rows = ops.map(o => { const ln1 = o[1] != null ? ++la1 : '', ln2 = o[2] != null ? ++lb1 : ''; return `<tr class="d${o[0] === '=' ? 'e' : o[0] === '+' ? 'a' : o[0] === '-' ? 'r' : 'c'}"><td class="n">${ln1}</td><td>${o[1] != null ? esc(o[1]) : ''}</td><td class="n">${ln2}</td><td>${o[2] != null ? esc(o[2]) : ''}</td></tr>`; });
      D.innerHTML = `<p class="k9-small" style="margin:8px 0"><span class="k9-badge g">+${cnt['+']} ${esc(tr('añadidas'))}</span> <span class="k9-badge d">−${cnt['-']} ${esc(tr('eliminadas'))}</span> <span class="k9-badge w">~${cnt['~']} ${esc(tr('cambiadas'))}</span></p><div class="s10-diff"><table><thead><tr><th></th><th>${esc(a.name)}</th><th></th><th>${esc(b.name)}</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    } else {
      const ua = new Uint8Array(await a.blob.slice(0, 64e6).arrayBuffer()), ub = new Uint8Array(await b.blob.slice(0, 64e6).arrayBuffer()); let first = -1, diff = 0; const L = Math.min(ua.length, ub.length);
      for (let i = 0; i < L; i++) if (ua[i] !== ub[i]) { if (first < 0) first = i; diff++; }
      D.innerHTML = K.u10.kv([['Comparación', tr('binaria (byte a byte)')], ['Primer byte distinto', first >= 0 ? '0x' + first.toString(16).toUpperCase() + ' (' + first.toLocaleString() + ')' : tr('en la parte final (tamaños distintos)')], ['Bytes distintos en la zona común', diff.toLocaleString() + ' (' + (L ? (diff / L * 100).toFixed(2) : 0) + ' %)'], ['Diferencia de tamaño', (b.size - a.size).toLocaleString() + ' B']]) + (first >= 0 ? `<p class="k9-small" style="margin-top:8px">${esc(tr('Bytes en esa posición'))}:</p><pre class="s10-ql-pre" style="max-height:120px">${esc(K.u10.hex(ua.subarray(first, first + 24), 24))}\n${esc(K.u10.hex(ub.subarray(first, first + 24), 24))}</pre>` : '');
    }
  }
  K.ext.files.compare = compare;

  /* ---------- comprimir selección en ZIP ---------- */
  async function compress(files, dirs) {
    const entries = files.map(f => ({ name: f.name, data: f.blob, date: f.mod || f.date }));
    for (const d of dirs) { const all = (await F.all()).filter(f => f.folder === d || (f.folder || '').startsWith(d + '/')); all.forEach(f => entries.push({ name: base(d) + '/' + (f.folder.slice(d.length + 1) ? f.folder.slice(d.length + 1) + '/' : '') + f.name, data: f.blob, date: f.mod || f.date })); }
    if (!entries.length) return E.toast(tr('No hay nada que comprimir'));
    E.toast(tr('Comprimiendo…')); const zip = await K.zip(entries); const dest = st.special || !st.path ? 'downloads' : st.path;
    const name = await F.uniqueName(dest, (files.length === 1 && !dirs.length ? files[0].name.replace(/\.[^.]+$/, '') : dirs.length === 1 && !files.length ? base(dirs[0]) : tr('Archivos')) + '.zip');
    await F.save(name, zip, dest); const z = zip.zipStats || {};
    E.toast(`${entries.length} ${tr('archivos')} → ${name} · ${K.fmt.bytes(zip.size)}${z.deflate ? ' (' + Math.round(z.ratio * 100) + ' % ' + tr('del original') + ')' : ' (' + tr('sin compresión') + ')'}`); FM.render();
  }
  K.ext.files.compress = compress;

  /* ---------- doble panel ---------- */
  const P2 = { open: false, path: S.get('os10_fm_p2', 'downloads') || 'downloads', sel: new Set(), el: null };
  async function copyDir(path, dest) { const nd = join(dest, base(path)); await F.mkdir(nd); const l = (await F.all()).filter(f => f.folder === path || (f.folder || '').startsWith(path + '/')); for (const f of l) { const sub = f.folder.slice(path.length + 1); const target = sub ? join(nd, sub) : nd; if (sub) await F.mkdir(target); await F.save(await F.uniqueName(target, f.name), f.blob, target); } }
  async function transfer(files, dirs, dest, mode) {
    if (dest == null) return; let n = 0;
    for (const f of files) { if (f.folder === dest && mode === 'move') continue; mode === 'copy' ? await F.copy(f.id, dest) : await F.move(f.id, dest); n++; }
    for (const d of dirs) { try { mode === 'copy' ? await copyDir(d, dest) : await F.moveDir(d, dest); n++; } catch (er) { E.toast(er.message); } }
    E.toast(`${n} ${tr('elementos')} ${mode === 'copy' ? tr('copiados') : tr('movidos')} → ${F.pretty(dest)}`); FM.render(); if (P2.open) p2Render();
  }
  K.ext.files.transfer = transfer;
  function p2Toggle(on = !P2.open) {
    P2.open = on; S.set('os10_fm_dual', on); const wrap = q('.fm9-wrap');
    if (on && !P2.el) { P2.el = document.createElement('section'); P2.el.className = 's10-p2'; P2.el.setAttribute('aria-label', tr('Segundo panel')); wrap.insertBefore(P2.el, q('[data-info]')); P2.el.addEventListener('click', p2Click); P2.el.addEventListener('dblclick', p2Dbl); P2.el.addEventListener('dragstart', e => { const r = e.target.closest('[data-p2id],[data-p2dir]'); if (!r) return; const k = r.dataset.p2id || 'd:' + r.dataset.p2dir; if (!P2.sel.has(k)) { P2.sel.clear(); P2.sel.add(k); } e.dataTransfer.setData('text/x-s10-p2', JSON.stringify([...P2.sel])); }); P2.el.addEventListener('dragover', e => { e.preventDefault(); P2.el.classList.add('drop-on'); }); P2.el.addEventListener('dragleave', e => { if (e.target === P2.el) P2.el.classList.remove('drop-on'); }); P2.el.addEventListener('drop', async e => { e.preventDefault(); P2.el.classList.remove('drop-on'); const raw = e.dataTransfer.getData('text/x-eisen-files'); if (!raw) return; const ids = JSON.parse(raw); const files = (await Promise.all(ids.filter(x => !x.startsWith('d:')).map(id => F.get(id)))).filter(Boolean); transfer(files, ids.filter(x => x.startsWith('d:')).map(x => x.slice(2)), P2.path, e.ctrlKey ? 'copy' : 'move'); }); }
    root.classList.toggle('s10-dual', on); if (P2.el) P2.el.hidden = !on; $$('[data-s10fm="dual"]', root).forEach(b => b.classList.toggle('on', on));
    if (on) p2Render();
  }
  // soltar en el panel principal lo arrastrado desde el segundo panel
  M.addEventListener('drop', async e => { const raw = e.dataTransfer && e.dataTransfer.getData('text/x-s10-p2'); if (!raw) return; e.preventDefault(); e.stopPropagation(); const keys = JSON.parse(raw); const files = (await Promise.all(keys.filter(k => !k.startsWith('d:')).map(id => F.get(id)))).filter(Boolean); const tgt = e.target.closest('[data-drop]'); transfer(files, keys.filter(k => k.startsWith('d:')).map(k => k.slice(2)), tgt && !tgt.dataset.drop.startsWith('#') ? tgt.dataset.drop : st.path, e.ctrlKey ? 'copy' : 'move'); }, true);
  async function p2Render() {
    if (!P2.el) return; const r = await F.list(P2.path).catch(() => ({ files: [], folders: [] })), parts = P2.path.split('/').filter(Boolean);
    P2.el.innerHTML = `<div class="k9-bar"><button class="k9-btn" data-p2="up" ${P2.path ? '' : 'disabled'} aria-label="${esc(tr('Subir'))}">${I('up', 14)}</button><div class="s10-p2-crumbs"><button data-p2go="">${I('monitor', 13)}</button>${parts.map((p, i) => `<span>›</span><button data-p2go="${esc(parts.slice(0, i + 1).join('/'))}">${esc(i === 0 ? F.pretty(p) : p)}</button>`).join('')}</div><span class="sp"></span><button class="k9-btn" data-p2="here" title="${esc(tr('Copiar aquí lo seleccionado en el panel principal'))}">${I('copy', 14)}</button><button class="k9-btn" data-p2="toleft" title="${esc(tr('Copiar lo seleccionado aquí al panel principal'))}">${I('left', 14)}</button><button class="k9-btn" data-p2="close" aria-label="${esc(tr('Cerrar panel'))}">${I('close', 14)}</button></div>
      <div class="s10-p2-list"><table class="k9-table"><tbody>${r.folders.map(d => `<tr class="fm9-it${P2.sel.has('d:' + d) ? ' sel' : ''}" data-p2dir="${esc(d)}" draggable="true"><td>📁 ${esc(P2.path ? base(d) : F.pretty(d))}</td><td></td></tr>`).join('')}${r.files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(f => `<tr class="fm9-it${P2.sel.has(f.id) ? ' sel' : ''}" data-p2id="${esc(f.id)}" draggable="true"><td>${esc(f.name)}</td><td class="k9-muted">${esc(K.fmt.bytes(f.size))}</td></tr>`).join('')}</tbody></table>${!r.folders.length && !r.files.length ? `<p class="k9-muted k9-small" style="padding:12px">${esc(tr('Carpeta vacía. Arrastra aquí archivos del panel principal.'))}</p>` : ''}</div><div class="k9-status"><span>${r.folders.length + r.files.length} ${esc(tr('elementos'))}</span><span>F5 ${esc(tr('copiar'))} · F6 ${esc(tr('mover'))} →</span></div>`;
  }
  async function p2Click(e) {
    const go = e.target.closest('[data-p2go]'); if (go) { P2.path = go.dataset.p2go; P2.sel.clear(); S.set('os10_fm_p2', P2.path); return p2Render(); }
    const b = e.target.closest('[data-p2]'); if (b) { const a = b.dataset.p2; if (a === 'up') { P2.path = P2.path.includes('/') ? P2.path.slice(0, P2.path.lastIndexOf('/')) : ''; P2.sel.clear(); p2Render(); } if (a === 'close') p2Toggle(false); if (a === 'here') { if (!P2.path) return E.toast(tr('Entra en una carpeta')); transfer(FM.selected(), FM.selDirs(), P2.path, 'copy'); } if (a === 'toleft') { if (st.special || !st.path) return E.toast(tr('Abre una carpeta en el panel principal')); const keys = [...P2.sel]; const files = (await Promise.all(keys.filter(k => !k.startsWith('d:')).map(id => F.get(id)))).filter(Boolean); transfer(files, keys.filter(k => k.startsWith('d:')).map(k => k.slice(2)), st.path, 'copy'); } return; }
    const r = e.target.closest('[data-p2id],[data-p2dir]'); if (!r) return; const k = r.dataset.p2id || 'd:' + r.dataset.p2dir;
    if (e.ctrlKey || e.metaKey) P2.sel.has(k) ? P2.sel.delete(k) : P2.sel.add(k); else { P2.sel.clear(); P2.sel.add(k); }
    $$('[data-p2id],[data-p2dir]', P2.el).forEach(x => x.classList.toggle('sel', P2.sel.has(x.dataset.p2id || 'd:' + x.dataset.p2dir)));
  }
  function p2Dbl(e) { const d = e.target.closest('[data-p2dir]'); if (d) { P2.path = d.dataset.p2dir; P2.sel.clear(); S.set('os10_fm_p2', P2.path); p2Render(); return; } const f = e.target.closest('[data-p2id]'); if (f) F.open(f.dataset.p2id); }
  K.ext.files.dual = { toggle: p2Toggle, state: P2, render: p2Render };

  refreshTags().then(() => { FM.side(); FM.render(); });
  if (S.get('os10_fm_dual', false)) p2Toggle(true);
})();

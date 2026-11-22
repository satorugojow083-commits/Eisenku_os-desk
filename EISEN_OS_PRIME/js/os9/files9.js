/* =====================================================================
   EISENKU OS 9.0 ENTERPRISE · Archivos (sistema de archivos sobre IndexedDB)
   Conserva la base de datos de 8.0 (eisen_vault › files) y su formato:
     { id, name, type, size, folder, date, blob }  + 9.0: trash, fav, mod
   - folder admite rutas con subcarpetas: "documents/Proyectos/2026".
   - Carpetas vacías en eisen_fs9_dirs. Papelera con restauración.
   - Explorador nuevo en la misma ventana "explorer" (las rutas y lanzadores de 8.0 siguen funcionando).
   - ZIP propio (exportar carpetas e importar .zip/.epub), terminal con comandos reales (ls, cd, mkdir, mv, cp…).
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, $ = K.$, $$ = K.$$, tr = K.tr, I = K.icon;
  const vault = E.vault;
  const ROOTS = [['documents', 'Documentos', 'file'], ['images', 'Imágenes', 'image'], ['music', 'Música', 'music'], ['videos', 'Vídeos', 'video'], ['downloads', 'Descargas', 'download']];
  const MAX_FILE = 512 * 1024 * 1024; // límite por archivo importado (el navegador decide la cuota total)
  const MIME = { txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', json: 'application/json', html: 'text/html', htm: 'text/html', xml: 'text/xml', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', py: 'text/x-python', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', ico: 'image/x-icon', pdf: 'application/pdf', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', zip: 'application/zip', epub: 'application/epub+zip', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ts: 'text/plain', sh: 'text/x-sh', yml: 'text/yaml', yaml: 'text/yaml', ini: 'text/plain', log: 'text/plain', c: 'text/x-c', cpp: 'text/x-c', java: 'text/x-java', sql: 'text/x-sql' };
  // 10.0: hasta 10 caracteres (antes 6), para reconocer .eistheme, .eisboard, .eisdiag…
  const extOf = n => { const m = /\.([a-z0-9]{1,10})$/i.exec(String(n)); return m ? m[1].toLowerCase() : ''; };
  const typeOf = f => (f.type && f.type !== 'application/octet-stream' ? f.type : '') || MIME[extOf(f.name)] || 'application/octet-stream';
  const kindOf = f => { const t = typeOf(f); return /^image\//.test(t) ? 'image' : /^audio\//.test(t) ? 'audio' : /^video\//.test(t) ? 'video' : t === 'application/pdf' ? 'pdf' : /officedocument|msword|ms-excel|ms-powerpoint|opendocument/.test(t) ? 'office' : /zip|epub/.test(t) ? 'archive' : /^text\/|json|javascript|xml|yaml/.test(t) ? 'text' : /word|sheet|presentation/.test(t) ? 'office' : 'other'; };
  const ICON = { image: '🖼️', audio: '🎵', video: '🎬', pdf: '📕', archive: '🗜️', text: '📄', office: '📘', other: '📦', dir: '📁' };
  const cleanName = n => String(n || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '').trim().slice(0, 120) || tr('sin nombre');
  const join = (a, b) => a ? a + '/' + b : b;
  const parent = p => p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
  const base = p => p.slice(p.lastIndexOf('/') + 1);
  const rootName = p => { const r = ROOTS.find(x => x[0] === p.split('/')[0]); return r ? tr(r[1]) : p.split('/')[0]; };
  const pretty = p => !p ? tr('Este equipo') : [rootName(p)].concat(p.split('/').slice(1)).join(' › ');

  /* ---------- API de archivos ---------- */
  const dirs = () => { const l = S.get('fs9_dirs', []) || []; return Array.isArray(l) ? l : []; };
  const setDirs = l => S.set('fs9_dirs', [...new Set(l)].sort());
  const allRaw = () => vault.all().then(l => (l || []).filter(Boolean));
  // E.vaultAll (usada por apps de 8.0: recientes, terminal, galería…) ya no devuelve la papelera
  E.vaultAll = () => allRaw().then(l => l.filter(f => !f.trash));
  const F = K.files = {
    ROOTS, typeOf, kindOf, extOf, cleanName, pretty,
    allRaw, all: () => E.vaultAll(),
    get: id => vault.get(id),
    async list(folder) {
      const files = (await allRaw()).filter(f => !f.trash && (f.folder || 'documents') === folder);
      const sub = new Set();
      const pre = folder ? folder + '/' : '';
      dirs().concat((await allRaw()).filter(f => !f.trash).map(f => f.folder || '')).forEach(d => { if (d.startsWith(pre) && d !== folder) { const rest = d.slice(pre.length).split('/')[0]; if (rest) sub.add(pre + rest); } });
      if (!folder) ROOTS.forEach(r => sub.add(r[0]));
      return { files, folders: [...sub].sort((a, b) => base(a).localeCompare(base(b))) };
    },
    async save(name, blob, folder = 'documents', extra = {}) {
      if (blob.size > MAX_FILE) throw new Error(tr('El archivo supera el límite de 512 MB'));
      const id = E.uid();
      await vault.put(Object.assign({ id, name: cleanName(name), type: blob.type || MIME[extOf(name)] || '', size: blob.size, folder, date: Date.now(), mod: Date.now(), blob }, extra));
      if (!dirs().includes(folder) && !ROOTS.some(r => r[0] === folder)) setDirs(dirs().concat(folder));
      K.emit('files'); K.activity('file', 'explorer', tr('Guardado') + ': ' + name);
      return id;
    },
    async update(id, patch) { const f = await vault.get(id); if (!f) return null; Object.assign(f, patch, { mod: Date.now() }); if (patch.blob) { f.size = patch.blob.size; f.type = patch.blob.type || f.type; } await vault.put(f); K.emit('files'); return f; },
    async writeText(id, text, type) { return F.update(id, { blob: new Blob([text], { type: type || 'text/plain' }) }); },
    async readText(id) { const f = await vault.get(id); return f ? await f.blob.text() : ''; },
    async rename(id, name) { return F.update(id, { name: cleanName(name) }); },
    async uniqueName(folder, name) { const l = (await allRaw()).filter(f => !f.trash && f.folder === folder).map(f => f.name); if (!l.includes(name)) return name; const e = extOf(name), b = e ? name.slice(0, -(e.length + 1)) : name; for (let i = 2; i < 999; i++) { const n = `${b} (${i})${e ? '.' + e : ''}`; if (!l.includes(n)) return n; } return name; },
    async copy(id, folder) { const f = await vault.get(id); if (!f) return null; return F.save(await F.uniqueName(folder, f.name), f.blob, folder); },
    async move(id, folder) { const f = await vault.get(id); if (!f) return null; f.name = await F.uniqueName(folder, f.name); return F.update(id, { folder, name: f.name }); },
    async trash(id) { const f = await vault.get(id); if (!f || f.trash) return; f.trash = { from: f.folder, at: Date.now() }; f.folder = '.trash'; await vault.put(f); K.emit('files'); },
    async restore(id) { const f = await vault.get(id); if (!f || !f.trash) return; f.folder = f.trash.from || 'documents'; delete f.trash; f.name = await F.uniqueName(f.folder, f.name); await vault.put(f); K.emit('files'); },
    async destroy(id) { await vault.del(id); K.emit('files'); },
    async emptyTrash() { const l = (await allRaw()).filter(f => f.trash); for (const f of l) await vault.del(f.id); K.emit('files'); return l.length; },
    async mkdir(path) { path = path.split('/').map(cleanName).join('/'); setDirs(dirs().concat(path)); K.emit('files'); return path; },
    async rmdir(path, toTrash = true) { const l = (await allRaw()).filter(f => !f.trash && (f.folder === path || (f.folder || '').startsWith(path + '/'))); for (const f of l) toTrash ? await F.trash(f.id) : await vault.del(f.id); setDirs(dirs().filter(d => d !== path && !d.startsWith(path + '/'))); K.emit('files'); return l.length; },
    async renameDir(path, name) { const np = join(parent(path), cleanName(name)); const l = (await allRaw()).filter(f => f.folder === path || (f.folder || '').startsWith(path + '/')); for (const f of l) { f.folder = np + f.folder.slice(path.length); await vault.put(f); } setDirs(dirs().map(d => d === path || d.startsWith(path + '/') ? np + d.slice(path.length) : d)); K.emit('files'); return np; },
    async moveDir(path, dest) { const np = join(dest, base(path)); if (np === path || np.startsWith(path + '/')) throw new Error(tr('No se puede mover una carpeta dentro de sí misma')); const l = (await allRaw()).filter(f => f.folder === path || (f.folder || '').startsWith(path + '/')); for (const f of l) { f.folder = np + f.folder.slice(path.length); await vault.put(f); } setDirs(dirs().map(d => d === path || d.startsWith(path + '/') ? np + d.slice(path.length) : d).concat(np)); K.emit('files'); return np; },
    async fav(id, on) { return F.update(id, { fav: !!on }); },
    favDirs: () => S.get('fs9_favdirs', []) || [],
    toggleFavDir(p) { const l = F.favDirs(), i = l.indexOf(p); if (i >= 0) l.splice(i, 1); else l.push(p); S.set('fs9_favdirs', l); K.emit('files'); },
    async search(q, folder) { const n = K.norm(q); return (await allRaw()).filter(f => !f.trash && (!folder || f.folder === folder || (f.folder || '').startsWith(folder + '/')) && K.norm(f.name).includes(n)); },
    async usage() { const l = await allRaw(); const by = {}; l.forEach(f => { const k = f.trash ? 'trash' : kindOf(f); by[k] = (by[k] || 0) + (f.size || 0); }); return { total: l.reduce((a, f) => a + (f.size || 0), 0), count: l.length, by }; },
    async importFiles(list, folder) {
      let n = 0, skipped = [];
      for (const f of list) {
        if (f.size > MAX_FILE) { skipped.push(f.name); continue; }
        const rel = (f.webkitRelativePath || '').split('/').slice(0, -1).map(cleanName).join('/');
        const dest = rel ? join(folder, rel) : folder; if (rel) setDirs(dirs().concat(dest));
        await F.save(await F.uniqueName(dest, cleanName(f.name)), f, dest); n++;
      }
      if (skipped.length) E.toast(tr('Omitidos por tamaño') + ': ' + skipped.slice(0, 3).join(', '));
      K.seclog('files', `Importados ${n} archivos en ${folder}`); return n;
    },
    open: id => openFile(id),
    pick: (o) => picker(o)
  };
  E.filesOpenFolder = p => { E.launch('explorer'); setTimeout(() => FM.go(p === 'root' ? '' : p), 30); };

  /* ---------- Abrir archivos con la app adecuada ("Abrir con") ---------- */
  const HANDLERS = [
    ['imageviewer', 'Visor de imágenes', f => kindOf(f) === 'image'], ['photo', 'Editor de fotos', f => kindOf(f) === 'image' && !/svg/.test(typeOf(f))],
    ['markdown', 'Editor Markdown', f => /^(md|markdown)$/.test(extOf(f.name))], ['codeeditor', 'Editor de código', f => kindOf(f) === 'text'],
    ['jsoneditor', 'Editor JSON', f => extOf(f.name) === 'json'], ['library', 'Biblioteca digital', f => /^(epub|txt|md|pdf)$/.test(extOf(f.name))],
    ['audioedit', 'Editor de audio', f => kindOf(f) === 'audio'], ['medialib', 'Administrador multimedia', f => /^(audio|video)$/.test(kindOf(f))],
    ['browser', 'Navegador (vista previa)', f => /^(pdf|image|audio|video|text)$/.test(kindOf(f))]
  ];
  F.handlers = f => HANDLERS.filter(h => h[2](f) && E.REG[h[0]] && E.isInstalled(h[0]));
  F.addHandler = h => { if (Array.isArray(h) && typeof h[2] === 'function' && !HANDLERS.some(x => x[0] === h[0])) HANDLERS.splice(HANDLERS.length - 1, 0, h); };   // otras apps añaden su "Abrir con" (antes del navegador)
  F.openWith = (app, f) => { if (app === 'browser') return E.vaultOpen(f.id); E.launch(app, { fileId: f.id }); K.activity('file', app, tr('Abrió') + ' ' + f.name); };
  async function openFile(id) {
    const f = await vault.get(id); if (!f) return;
    const k = kindOf(f), e = extOf(f.name);
    const pref = (S.get('fs9_openwith', {}) || {})[e];
    if (pref && E.REG[pref] && E.isInstalled(pref)) return F.openWith(pref, f);
    if (k === 'image' && E.REG.imageviewer && E.isInstalled('imageviewer')) return F.openWith('imageviewer', f);
    if (/^(md|markdown)$/.test(e) && E.REG.markdown && E.isInstalled('markdown')) return F.openWith('markdown', f);
    if (e === 'epub' && E.REG.library) return F.openWith('library', f);
    if (e === 'docx' && E.REG.word) return F.openWith('word', f);
    if (k === 'text' && e !== 'html' && e !== 'htm' && E.REG.codeeditor && E.isInstalled('codeeditor')) return F.openWith('codeeditor', f);
    if (k === 'archive' && e === 'zip') return extractZip(f);
    return E.vaultOpen(id);
  }
  // las apps de 8.0 (recientes, búsqueda, galería) abren archivos a través de este gancho
  E.openFileHook = async f => { const k = kindOf(f), e = extOf(f.name); if ((k === 'image' && E.REG.imageviewer && E.isInstalled('imageviewer')) || (/^(md|markdown)$/.test(e) && E.REG.markdown) || (k === 'text' && !/^html?$/.test(e) && E.REG.codeeditor && E.isInstalled('codeeditor')) || e === 'epub' || e === 'zip' || (e === 'docx' && E.REG.word)) { await openFile(f.id); return true; } return false; };

  /* ---------- ZIP (sin dependencias): exportar e importar ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  // 10.0: compresión DEFLATE real (CompressionStream 'deflate-raw') cuando el navegador la admite y reduce el tamaño;
  // si no, cada entrada se guarda sin comprimir (método 0), como en 9.0. o.deflate=false fuerza el modo sin compresión.
  const canDeflate = (() => { try { new CompressionStream('deflate-raw'); return true; } catch { return false; } })();
  K.zipCanDeflate = canDeflate;
  const deflateRaw = async u8 => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  K.zip = async (entries, o = {}) => {
    const enc = new TextEncoder(), parts = [], central = []; let off = 0;
    const want = o.deflate !== undefined ? !!o.deflate : S.get('os10_zip_deflate', true) !== false;
    let raw = 0, packed = 0;
    for (const en of entries) {
      const data = en.data instanceof Uint8Array ? en.data : new Uint8Array(await en.data.arrayBuffer());
      const name = enc.encode(en.name), d = new Date(en.date || Date.now());
      const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      const crc = crc32(data); let body = data, method = 0;
      if (want && canDeflate && data.length > 64) { try { const z = await deflateRaw(data); if (z.length < data.length) { body = z; method = 8; } } catch { /* se guarda sin comprimir */ } }
      raw += data.length; packed += body.length;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, method, true); h.setUint16(10, time, true); h.setUint16(12, date, true);
      h.setUint32(14, crc, true); h.setUint32(18, body.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, body);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, method, true); c.setUint16(12, time, true); c.setUint16(14, date, true);
      c.setUint32(16, crc, true); c.setUint32(20, body.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + body.length;
    }
    const csize = central.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    const blob = new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
    blob.zipStats = { raw, packed, deflate: want && canDeflate, ratio: raw ? packed / raw : 1 };
    return blob;
  };
  K.unzip = async (blob, maxTotal = 300 * 1024 * 1024) => {
    const buf = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(buf.buffer); let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error(tr('No es un ZIP válido'));
    const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true); const out = []; let total = 0; const dec = new TextDecoder();
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), usz = dv.getUint32(p + 24, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = dec.decode(buf.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
      if (name.endsWith('/')) continue;
      total += usz; if (total > maxTotal) throw new Error(tr('El ZIP es demasiado grande para descomprimirlo aquí'));
      const lnl = dv.getUint16(lo + 26, true), lxl = dv.getUint16(lo + 28, true), start = lo + 30 + lnl + lxl, raw = buf.subarray(start, start + csz);
      let data;
      if (method === 0) data = raw;
      else if (method === 8) { if (!('DecompressionStream' in window)) throw new Error(tr('Tu navegador no puede descomprimir ZIP (falta DecompressionStream)')); data = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); }
      else continue;
      out.push({ name, data });
    }
    return out;
  };
  async function extractZip(f) {
    if (!await E.confirm(tr('Extraer ZIP'), tr('Se extraerá el contenido en una carpeta nueva junto al archivo.'))) return;
    try {
      const items = await K.unzip(f.blob), dest = join(f.folder, cleanName(f.name.replace(/\.zip$/i, '')));
      await F.mkdir(dest);
      for (const it of items) { const parts = it.name.split('/').filter(x => x && x !== '..' && x !== '.').map(cleanName); const fn = parts.pop(); if (!fn) continue; const d = parts.length ? join(dest, parts.join('/')) : dest; if (parts.length) await F.mkdir(d); await F.save(fn, new Blob([it.data], { type: MIME[extOf(fn)] || '' }), d); }
      E.toast(items.length + ' ' + tr('archivos extraídos')); FM.go(dest);
    } catch (e) { K.ui.alert(tr('No se pudo extraer'), e.message); }
  }
  async function exportZip(folder) {
    const l = (await allRaw()).filter(x => !x.trash && (x.folder === folder || (x.folder || '').startsWith(folder + '/')));
    if (!l.length) return E.toast(tr('La carpeta está vacía'));
    const blob = await K.zip(l.map(x => ({ name: x.folder.slice(folder.length).replace(/^\//, '') ? x.folder.slice(folder.length + 1) + '/' + x.name : x.name, data: x.blob, date: x.mod || x.date })));
    E.download(cleanName(base(folder) || 'EISENKU') + '.zip', blob); E.toast(l.length + ' ' + tr('archivos exportados en ZIP'));
  }

  /* ---------- Selector de archivos para otras apps (con permiso "files") ---------- */
  function picker(o = {}) {
    return new Promise(res => {
      const ov = document.createElement('div'); ov.className = 'eis-modal';
      ov.innerHTML = `<div class="eis-modal-card" style="width:min(640px,94vw);max-width:none"><h3>${esc(o.title || tr('Elegir un archivo de EISENKU'))}</h3><input class="input-text" data-pq placeholder="${esc(tr('Buscar…'))}"><div data-pl style="max-height:50vh;overflow:auto;margin:8px 0"></div><div class="eis-modal-btns"><button class="btn-secondary" data-dev>${esc(tr('Desde el dispositivo…'))}</button><button class="btn-secondary" data-x>${esc(tr('Cancelar'))}</button></div></div>`;
      document.body.appendChild(ov);
      const draw = async () => { const q = K.norm(ov.querySelector('[data-pq]').value); const l = (await F.all()).filter(f => (!o.accept || o.accept(f)) && (!q || K.norm(f.name).includes(q))).sort((a, b) => (b.mod || b.date) - (a.mod || a.date)).slice(0, 200); ov.querySelector('[data-pl]').innerHTML = l.map(f => `<button class="k9-li" style="width:100%;text-align:left" data-pid="${esc(f.id)}"><span style="font-size:20px">${ICON[kindOf(f)]}</span><span class="t"><b>${esc(f.name)}</b><small>${esc(pretty(f.folder))} · ${esc(K.fmt.bytes(f.size))}</small></span></button>`).join('') || `<p class="eis-muted" style="padding:12px">${esc(tr('No hay archivos compatibles.'))}</p>`; };
      const done = v => { ov.remove(); res(v); };
      ov.addEventListener('click', async e => { const b = e.target.closest('[data-pid]'); if (b) return done(await vault.get(b.dataset.pid)); if (e.target.closest('[data-x]') || e.target === ov) return done(null); if (e.target.closest('[data-dev]')) { const [f] = await K.ui.pickFile(o.deviceAccept || ''); if (f) { const id = await F.save(f.name, f, o.folder || 'downloads'); done(await vault.get(id)); } } });
      ov.querySelector('[data-pq]').oninput = draw; draw();
    });
  }

  /* ---------- 10.0: miniaturas reducidas con caché (antes se cargaba la imagen completa) ---------- */
  const thumbOK = () => S.get('os10_thumbs', true) !== false && !!window.createImageBitmap && !!K.store10;
  K.thumbUrl = async (f, size = 256) => {
    const key = f.id + ':' + (f.mod || f.date || 0) + ':' + f.size + ':' + size;
    let rec = null; try { rec = await K.store10.get('thumbs', key); } catch { rec = null; }
    if (!rec) {
      const bmp = await createImageBitmap(f.blob); const s = Math.min(1, size / Math.max(bmp.width, bmp.height)); const w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bmp, 0, 0, w, h); const dims = [bmp.width, bmp.height]; bmp.close && bmp.close();
      const blob = await new Promise(r => c.toBlob(r, 'image/webp', .82)) || await new Promise(r => c.toBlob(r, 'image/jpeg', .85));
      rec = { id: key, fid: f.id, blob, w: dims[0], h: dims[1], t: Date.now() };
      try { await K.store10.put('thumbs', rec); if (Math.random() < .05) { const all = await K.store10.all('thumbs'); if (all.length > 800) for (const x of all.sort((a, b) => a.t - b.t).slice(0, all.length - 700)) await K.store10.del('thumbs', x.id); } } catch { /* sin espacio: no se guarda en caché */ }
    }
    return URL.createObjectURL(rec.blob);
  };

  /* ---------- Explorador 9.0 (en la ventana "explorer") ---------- */
  const win = $('#win-explorer'), oldBody = win && win.querySelector('.window-body');
  const FM = { go: () => {} };
  if (win && oldBody) {
    oldBody.hidden = true; oldBody.style.display = 'none';
    win.querySelector('.window-title-area').innerHTML = `${E.tile(E.REG.explorer || { icon: '📁', cat: 'Sistema' }, 18, 'mini')}<span>${esc(tr('Archivos'))}</span>`;
    const root = document.createElement('div'); root.className = 'window-body fm9 k9'; root.style.padding = '0';
    win.insertBefore(root, oldBody);
    const st = { path: S.get('fs9_last', 'documents') || 'documents', view: S.get('fs9_view', 'grid'), sort: S.get('fs9_sort', 'name'), dir: 1, sel: new Set(), back: [], fwd: [], q: '', special: '', clip: null, info: false };
    if (st.path === '.trash') st.path = 'documents';
    root.innerHTML = `<div class="k9-bar fm9-bar">
        <button class="k9-btn" data-a="back" title="${esc(tr('Atrás'))}" aria-label="${esc(tr('Atrás'))}">${I('back', 16)}</button><button class="k9-btn" data-a="fwd" title="${esc(tr('Adelante'))}" aria-label="${esc(tr('Adelante'))}">${I('forward', 16)}</button><button class="k9-btn" data-a="up" title="${esc(tr('Subir un nivel'))}" aria-label="${esc(tr('Subir'))}">${I('up', 16)}</button>
        <div class="fm9-crumbs" data-crumbs></div>
        <div class="fm9-search">${I('search', 14)}<input class="input-text" data-q placeholder="${esc(tr('Buscar en esta carpeta'))}"></div>
      </div>
      <div class="k9-bar fm9-tools">
        <button class="k9-btn" data-a="newdir">${I('folder', 15)} ${esc(tr('Nueva carpeta'))}</button><button class="k9-btn" data-a="newfile">${I('file', 15)} ${esc(tr('Nuevo archivo'))}</button>
        <button class="k9-btn" data-a="import">${I('upload', 15)} ${esc(tr('Importar'))}</button><button class="k9-btn" data-a="importdir">${I('folder', 15)} ${esc(tr('Importar carpeta'))}</button><button class="k9-btn" data-a="url">${I('link', 15)} URL</button>
        <span class="sp"></span>
        <button class="k9-btn" data-a="paste" disabled>${I('copy', 15)} ${esc(tr('Pegar'))}</button><button class="k9-btn" data-a="zip">${I('download', 15)} ZIP</button>
        <select class="input-text" data-sort aria-label="${esc(tr('Ordenar'))}"><option value="name">${esc(tr('Nombre'))}</option><option value="date">${esc(tr('Fecha'))}</option><option value="size">${esc(tr('Tamaño'))}</option><option value="type">${esc(tr('Tipo'))}</option></select>
        <div class="k9-seg"><button data-view="grid" title="${esc(tr('Cuadrícula'))}">${I('grid', 14)}</button><button data-view="list" title="${esc(tr('Lista'))}">${I('list', 14)}</button></div>
        <button class="k9-btn" data-a="info" title="${esc(tr('Detalles'))}">${I('info', 15)}</button>
      </div>
      <div class="fm9-wrap"><aside class="k9-side" data-side></aside><main class="fm9-main" data-main tabindex="0" aria-label="${esc(tr('Contenido de la carpeta'))}"></main><aside class="fm9-info" data-info hidden></aside></div>
      <div class="k9-status" data-status></div>
      <input type="file" multiple hidden data-pick><input type="file" multiple webkitdirectory hidden data-pickdir>`;
    const q = s => root.querySelector(s), M = q('[data-main]');
    let thumbs = [];
    async function loadThumbs() { const imgs = $$('img[data-thumb]', M); for (const im of imgs) { const f = current.files.find(x => x.id === im.dataset.thumb); if (!f) continue; let u = null; try { u = await K.thumbUrl(f); } catch { u = null; } if (!im.isConnected) { if (u) URL.revokeObjectURL(u); return; } if (u) { thumbs.push(u); im.src = u; } else im.replaceWith(Object.assign(document.createElement('span'), { className: 'fm9-ic', textContent: ICON.image })); } }
    const revoke = () => { thumbs.forEach(u => URL.revokeObjectURL(u)); thumbs = []; };
    async function sideRender() {
      const u = await F.usage().catch(() => ({ total: 0, count: 0 }));
      const fav = F.favDirs();
      q('[data-side]').innerHTML = `<h6>${esc(tr('Lugares'))}</h6>
        <button class="k9-item${st.special === 'home' ? ' on' : ''}" data-go="#home">${I('home', 16)} ${esc(tr('Inicio'))}</button>
        ${ROOTS.map(r => `<button class="k9-item${!st.special && (st.path === r[0] || st.path.startsWith(r[0] + '/')) ? ' on' : ''}" data-go="${r[0]}" data-drop="${r[0]}">${I(r[2], 16)} ${esc(tr(r[1]))}</button>`).join('')}
        <button class="k9-item${st.special === 'recent' ? ' on' : ''}" data-go="#recent">${I('clock', 16)} ${esc(tr('Recientes'))}</button>
        <button class="k9-item${st.special === 'fav' ? ' on' : ''}" data-go="#fav">${I('star', 16)} ${esc(tr('Favoritos'))}</button>
        <button class="k9-item${st.special === 'trash' ? ' on' : ''}" data-go="#trash" data-drop="#trash">${I('trash', 16)} ${esc(tr('Papelera'))}</button>
        ${fav.length ? `<h6>${esc(tr('Carpetas favoritas'))}</h6>` + fav.map(p => `<button class="k9-item" data-go="${esc(p)}" data-drop="${esc(p)}">${I('folder', 16)} ${esc(base(p))}</button>`).join('') : ''}
        ${K.ext.files && K.ext.files.side ? K.ext.files.side(st) : ''}<h6>${esc(tr('Dispositivo'))}</h6><button class="k9-item" data-a="projexplorer">${I('monitor', 16)} ${esc(tr('Abrir carpeta del dispositivo…'))}</button>
        <div class="fm9-usage"><div class="k9-meter"><i style="width:${Math.min(100, u.total / (1024 * 1024 * 1024) * 100).toFixed(1)}%"></i></div><small>${esc(K.fmt.bytes(u.total))} · ${u.count} ${esc(tr('archivos'))}</small></div>`;
    }
    const sorters = { name: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }), date: (a, b) => (a.mod || a.date) - (b.mod || b.date), size: (a, b) => a.size - b.size, type: (a, b) => typeOf(a).localeCompare(typeOf(b)) || a.name.localeCompare(b.name) };
    let current = { files: [], folders: [] };
    async function render() {
      revoke(); st.sel.clear();
      let files = [], folders = [];
      if (st.special === 'home') { const all = await F.all(); files = all.sort((a, b) => (b.mod || b.date) - (a.mod || a.date)).slice(0, 12); folders = ROOTS.map(r => r[0]).concat(F.favDirs()); }
      else if (st.special === 'recent') files = (await F.all()).sort((a, b) => (b.mod || b.date) - (a.mod || a.date)).slice(0, 60);
      else if (st.special === 'fav') { files = (await F.all()).filter(f => f.fav); folders = F.favDirs(); }
      else if (st.special === 'trash') files = (await allRaw()).filter(f => f.trash).sort((a, b) => b.trash.at - a.trash.at);
      else if (st.special && K.ext.files && K.ext.files.special) { const r = await K.ext.files.special(st.special); files = r.files || []; folders = r.folders || []; }   // 10.0: etiquetas y filtros guardados
      else if (st.q) files = await F.search(st.q, st.path);
      else { const r = await F.list(st.path); files = r.files; folders = r.folders; }
      files.sort((a, b) => sorters[st.sort](a, b) * st.dir);
      current = { files, folders };
      const crumbs = st.special ? `<b>${esc({ home: tr('Inicio'), recent: tr('Recientes'), fav: tr('Favoritos'), trash: tr('Papelera') }[st.special] || (K.ext.files && K.ext.files.label ? K.ext.files.label(st.special) : st.special))}</b>` : [`<button data-go="">${I('monitor', 14)}</button>`].concat(st.path.split('/').map((seg, i, a) => `<span>›</span><button data-go="${esc(a.slice(0, i + 1).join('/'))}" data-drop="${esc(a.slice(0, i + 1).join('/'))}">${esc(i === 0 ? rootName(seg) : seg)}</button>`)).join('');
      q('[data-crumbs]').innerHTML = crumbs;
      q('[data-a="back"]').disabled = !st.back.length; q('[data-a="fwd"]').disabled = !st.fwd.length; q('[data-a="up"]').disabled = !!st.special || !st.path;
      ['newdir', 'newfile', 'import', 'importdir', 'url', 'zip'].forEach(a => { q(`[data-a="${a}"]`).disabled = !!st.special || !st.path; });
      q('[data-a="paste"]').disabled = !st.clip || !!st.special || !st.path;
      $$('[data-view]', root).forEach(b => b.classList.toggle('on', b.dataset.view === st.view)); q('[data-sort]').value = st.sort;
      const trash = st.special === 'trash';
      if (!files.length && !folders.length) {
        M.className = 'fm9-main';
        M.innerHTML = `<div class="k9-state">${I(trash ? 'trash' : 'folder', 40)}<p>${esc(trash ? tr('La papelera está vacía.') : st.q ? tr('Sin resultados.') : tr('Esta carpeta está vacía. Arrastra archivos aquí o usa Importar.'))}</p></div>`;
      } else if (st.view === 'list') {
        M.className = 'fm9-main fm9-list';
        M.innerHTML = `<table class="k9-table"><thead><tr><th>${esc(tr('Nombre'))}</th><th>${esc(trash ? tr('Ubicación original') : tr('Tipo'))}</th><th>${esc(tr('Tamaño'))}</th><th>${esc(trash ? tr('Eliminado') : tr('Modificado'))}</th></tr></thead><tbody>${folders.map(p => `<tr class="fm9-it" data-dir="${esc(p)}" data-drop="${esc(p)}" draggable="true" tabindex="-1"><td>${ICON.dir} ${esc(st.special ? pretty(p) : (ROOTS.find(r => r[0] === p) ? rootName(p) : base(p)))}</td><td>${esc(tr('Carpeta'))}</td><td>—</td><td>—</td></tr>`).join('')}${files.map(f => `<tr class="fm9-it" data-id="${esc(f.id)}" draggable="${trash ? 'false' : 'true'}" tabindex="-1"><td>${ICON[kindOf(f)]} ${esc(f.name)} ${f.fav ? '⭐' : ''}</td><td>${esc(trash ? pretty(f.trash.from || '') : (extOf(f.name) || '—').toUpperCase())}</td><td>${esc(K.fmt.bytes(f.size))}</td><td>${esc(K.fmt.dt(trash ? f.trash.at : (f.mod || f.date)))}</td></tr>`).join('')}</tbody></table>`;
      } else {
        M.className = 'fm9-main fm9-grid';
        M.innerHTML = folders.map(p => `<button class="fm9-it" data-dir="${esc(p)}" data-drop="${esc(p)}" draggable="true" title="${esc(pretty(p))}"><span class="fm9-ic">${ICON.dir}</span><span class="fm9-nm">${esc(st.special ? pretty(p) : (ROOTS.find(r => r[0] === p) ? rootName(p) : base(p)))}</span></button>`).join('') + files.map(f => { const k = kindOf(f); let th = `<span class="fm9-ic">${ICON[k]}</span>`; if (k === 'image' && !/svg/.test(typeOf(f))) { if (thumbOK()) th = `<img class="fm9-th" data-thumb="${esc(f.id)}" alt="" loading="lazy">`; else if (f.size < 8e6) { const u = URL.createObjectURL(f.blob); thumbs.push(u); th = `<img class="fm9-th" src="${u}" alt="" loading="lazy">`; } } return `<button class="fm9-it" data-id="${esc(f.id)}" draggable="${trash ? 'false' : 'true'}" title="${esc(f.name)} · ${esc(K.fmt.bytes(f.size))}">${th}<span class="fm9-nm">${esc(f.name)}</span>${f.fav ? '<span class="fm9-fav">⭐</span>' : ''}</button>`; }).join('');
      }
      if (trash && files.length) M.insertAdjacentHTML('afterbegin', `<div class="fm9-banner">${I('info', 15)} ${esc(tr('Los archivos de la papelera se pueden restaurar.'))} <button class="k9-btn" data-a="emptytrash">${esc(tr('Vaciar papelera'))}</button></div>`);
      status(); sideRender(); if (st.info) info();
      loadThumbs(); if (K.ext.files && K.ext.files.after) { try { K.ext.files.after(M, current, st); } catch (er) { console.error(er); } }   // 10.0
    }
    function status() { const s = [...st.sel], sz = current.files.filter(f => st.sel.has(f.id)).reduce((a, f) => a + f.size, 0); q('[data-status]').innerHTML = `<span>${current.folders.length + current.files.length} ${esc(tr('elementos'))}</span>${s.length ? `<span>${s.length} ${esc(tr('seleccionados'))}${sz ? ' · ' + esc(K.fmt.bytes(sz)) : ''}</span>` : ''}<span style="margin-left:auto">${esc(st.special ? '' : pretty(st.path))}</span>`; $$('.fm9-it', M).forEach(el => el.classList.toggle('sel', st.sel.has(el.dataset.id || 'd:' + el.dataset.dir))); }
    async function info() {
      const box = q('[data-info]'); box.hidden = !st.info; if (!st.info) return;
      const id = [...st.sel].find(x => !x.startsWith('d:'));
      if (!id) { box.innerHTML = `<div class="k9-state">${I('info', 30)}<p>${esc(tr('Selecciona un archivo para ver sus detalles.'))}</p></div>`; return; }
      const f = await vault.get(id); if (!f) return;
      const k = kindOf(f); let prev = `<div class="fm9-prev">${ICON[k]}</div>`;
      if (k === 'image' && !/svg/.test(typeOf(f))) { const u = URL.createObjectURL(f.blob); thumbs.push(u); prev = `<img class="fm9-previmg" src="${u}" alt="">`; }
      else if (k === 'audio') { const u = URL.createObjectURL(f.blob); thumbs.push(u); prev = `<audio controls src="${u}" style="width:100%"></audio>`; }
      else if (k === 'text' && f.size < 200000) { const t = (await f.blob.text()).slice(0, 600); prev = `<pre class="fm9-prevtxt">${esc(t)}</pre>`; }
      box.innerHTML = `${prev}<h4 style="word-break:break-word;margin:8px 0">${esc(f.name)}</h4><dl class="fm9-dl"><dt>${esc(tr('Tipo'))}</dt><dd>${esc(typeOf(f))}</dd><dt>${esc(tr('Tamaño'))}</dt><dd>${esc(K.fmt.bytes(f.size))} (${f.size.toLocaleString()} B)</dd><dt>${esc(tr('Ubicación'))}</dt><dd>${esc(f.trash ? tr('Papelera') + ' (' + pretty(f.trash.from) + ')' : pretty(f.folder))}</dd><dt>${esc(tr('Creado'))}</dt><dd>${esc(K.fmt.dt(f.date))}</dd><dt>${esc(tr('Modificado'))}</dt><dd>${esc(K.fmt.dt(f.mod || f.date))}</dd><dt>ID</dt><dd class="k9-mono k9-small">${esc(f.id)}</dd></dl><div class="k9-row"><button class="k9-btn pri" data-a="open">${esc(tr('Abrir'))}</button><button class="k9-btn" data-a="download">${I('download', 14)}</button><button class="k9-btn" data-a="favtoggle">${I('star', 14)}</button></div>`;
    }
    const nav = (p, push = true) => { if (push && (p !== st.path || st.special)) { st.back.push(st.special ? '#' + st.special : st.path); st.fwd = []; } if (String(p).startsWith('#')) { st.special = p.slice(1); } else { st.special = ''; st.path = p; S.set('fs9_last', p); } st.q = ''; q('[data-q]').value = ''; render(); };
    FM.go = p => nav(p);
    // 10.0: API del explorador para Archivos 10.0 (doble panel, vista rápida, etiquetas, búsqueda avanzada…)
    F.fm = { root, st, render: () => render(), nav: (p, push) => nav(p, push), act: (a, arg) => act(a, arg), selected: () => selected(), selDirs: () => selDirs(), current: () => current, main: M, q, status: () => status(), side: () => sideRender() };
    const load10 = () => K.loadScript('js/os10/files10.js').catch(er => console.error(er));
    F.load10 = load10; document.addEventListener('eisen:open', e => { if (e.detail === 'explorer') load10(); });
    if (win.classList.contains('open')) load10();
    const selected = () => current.files.filter(f => st.sel.has(f.id));
    const selDirs = () => [...st.sel].filter(x => x.startsWith('d:')).map(x => x.slice(2));
    async function act(a, arg) {
      const sel = selected(), dsel = selDirs();
      const one = sel[0];
      switch (a) {
        case 'back': if (st.back.length) { st.fwd.push(st.special ? '#' + st.special : st.path); nav(st.back.pop(), false); } break;
        case 'fwd': if (st.fwd.length) { st.back.push(st.special ? '#' + st.special : st.path); nav(st.fwd.pop(), false); } break;
        case 'up': if (st.path) nav(parent(st.path)); break;
        case 'newdir': { const n = await K.ui.prompt(tr('Nueva carpeta'), tr('Nombre'), tr('Nueva carpeta')); if (n) { await F.mkdir(join(st.path, cleanName(n))); render(); } break; }
        case 'newfile': { const r = await E.form({ title: tr('Nuevo archivo'), fields: [{ k: 'n', label: tr('Nombre'), value: tr('documento') }, { k: 't', label: tr('Tipo'), type: 'select', options: [['txt', tr('Texto (.txt)')], ['md', 'Markdown (.md)'], ['html', 'HTML (.html)'], ['csv', 'CSV (.csv)'], ['json', 'JSON (.json)'], ['js', 'JavaScript (.js)']], value: 'txt' }], ok: tr('Crear') }); if (!r) break; const name = await F.uniqueName(st.path, cleanName(r.n.replace(/\.\w+$/, '') + '.' + r.t)); const tpl = { html: '<!doctype html>\n<html lang="es">\n<head><meta charset="utf-8"><title>Documento</title></head>\n<body>\n  <h1>Hola</h1>\n</body>\n</html>\n', json: '{\n  "nombre": "EISENKU"\n}\n', csv: 'columna1,columna2\n', md: '# Título\n\nEscribe aquí.\n' }[r.t] || ''; const id = await F.save(name, new Blob([tpl], { type: MIME[r.t] }), st.path); render(); openFile(id); break; }
        case 'import': q('[data-pick]').click(); break;
        case 'importdir': q('[data-pickdir]').click(); break;
        case 'url': { const u = await K.ui.prompt(tr('Descargar desde una URL'), tr('Dirección del archivo (https://…)'), 'https://'); if (u && /^https?:\/\//i.test(u)) { E.toast(tr('Descargando a EISEN…')); try { const blob = await E.ebFetchBlob(u); let n = 'archivo'; try { n = decodeURIComponent(new URL(u).pathname.split('/').filter(Boolean).pop() || 'archivo'); } catch { /* */ } await F.save(await F.uniqueName(st.path, cleanName(n)), blob, st.path); K.emit('download', { name: n, url: u, size: blob.size }); render(); } catch { E.toast(tr('No se pudo descargar ese enlace')); } } break; }
        case 'open': if (one) openFile(one.id); else if (dsel[0]) nav(dsel[0]); break;
        case 'download': for (const f of sel) { const a2 = document.createElement('a'); a2.__eisen = true; a2.href = URL.createObjectURL(f.blob); a2.download = f.name; document.body.appendChild(a2); HTMLAnchorElement.prototype.click.call(a2); a2.remove(); } break;
        case 'rename': if (one) { const n = await K.ui.prompt(tr('Renombrar'), tr('Nuevo nombre'), one.name); if (n && n !== one.name) { await F.rename(one.id, await F.uniqueName(one.folder, cleanName(n))); render(); } } else if (dsel[0] && !ROOTS.some(r => r[0] === dsel[0])) { const n = await K.ui.prompt(tr('Renombrar carpeta'), tr('Nuevo nombre'), base(dsel[0])); if (n) { await F.renameDir(dsel[0], n); render(); } } break;
        case 'copy': case 'cut': st.clip = { mode: a, ids: sel.map(f => f.id), dirs: dsel.filter(d => !ROOTS.some(r => r[0] === d)) }; E.toast((a === 'copy' ? tr('Copiado') : tr('Cortado')) + ': ' + (st.clip.ids.length + st.clip.dirs.length) + ' ' + tr('elementos')); render(); break;
        case 'paste': if (!st.clip || st.special) break; for (const id of st.clip.ids) st.clip.mode === 'copy' ? await F.copy(id, st.path) : await F.move(id, st.path); for (const d of st.clip.dirs) { if (st.clip.mode === 'cut') { try { await F.moveDir(d, st.path); } catch (e) { E.toast(e.message); } } else { const l = (await allRaw()).filter(f => !f.trash && (f.folder === d || f.folder.startsWith(d + '/'))); const nd = join(st.path, base(d) + (parent(d) === st.path ? ' (copia)' : '')); await F.mkdir(nd); for (const f of l) { const dest = nd + f.folder.slice(d.length); await F.mkdir(dest); await F.copy(f.id, dest); } } } if (st.clip.mode === 'cut') st.clip = null; render(); break;
        case 'duplicate': for (const f of sel) await F.copy(f.id, f.folder); render(); break;
        case 'moveto': { const dest = await choose(); if (dest == null) break; for (const f of sel) await F.move(f.id, dest); for (const d of dsel) { try { await F.moveDir(d, dest); } catch (e) { E.toast(e.message); } } render(); break; }
        case 'favtoggle': for (const f of sel) await F.fav(f.id, !f.fav); dsel.forEach(d => F.toggleFavDir(d)); render(); break;
        case 'delete': if (st.special === 'trash') { if (sel.length && await E.confirm(tr('Eliminar definitivamente'), sel.length + ' ' + tr('archivos se eliminarán para siempre.'))) { for (const f of sel) await F.destroy(f.id); render(); } } else { for (const f of sel) await F.trash(f.id); for (const d of dsel) { if (ROOTS.some(r => r[0] === d)) continue; const n = await F.rmdir(d, true); void n; } if (sel.length || dsel.length) E.toast(tr('Movido a la papelera')); render(); } break;
        case 'restore': for (const f of sel) await F.restore(f.id); render(); break;
        case 'emptytrash': if (await E.confirm(tr('Vaciar papelera'), tr('Los archivos de la papelera se eliminarán definitivamente.'))) { await F.emptyTrash(); render(); } break;
        case 'zip': exportZip(dsel[0] || st.path); break;
        case 'info': st.info = !st.info; q('[data-a="info"]').classList.toggle('on', st.info); info(); break;
        case 'selectall': current.files.forEach(f => st.sel.add(f.id)); current.folders.forEach(d => st.sel.add('d:' + d)); status(); break;
        case 'projexplorer': E.launch('projexplorer'); break;
        case 'wallpaper': if (one && kindOf(one) === 'image') { if (one.size > 4e6) { E.setWallpaperUrl(URL.createObjectURL(one.blob), false); E.toast(tr('Imagen grande: se usará solo en esta sesión')); } else { const r = new FileReader(); r.onload = () => E.setWallpaperUrl(r.result); r.readAsDataURL(one.blob); } } break;
        case 'openwith': if (one && arg) { if (arg.remember) { const m = S.get('fs9_openwith', {}) || {}; m[extOf(one.name)] = arg.app; S.set('fs9_openwith', m); } F.openWith(arg.app, one); } break;
      }
    }
    async function choose() {
      const all = [...new Set(ROOTS.map(r => r[0]).concat(dirs()))].sort();
      const r = await E.form({ title: tr('Mover a…'), fields: [{ k: 'd', label: tr('Carpeta de destino'), type: 'select', options: all.map(p => [p, pretty(p)]), value: st.path }], ok: tr('Mover') });
      return r ? r.d : null;
    }
    // eventos
    root.addEventListener('click', e => {
      const g = e.target.closest('[data-go]'); if (g) { nav(g.dataset.go); return; }
      const b = e.target.closest('[data-a]'); if (b && !b.disabled) { act(b.dataset.a); return; }
      const v = e.target.closest('[data-view]'); if (v) { st.view = v.dataset.view; S.set('fs9_view', st.view); render(); return; }
      const it = e.target.closest('.fm9-it');
      if (it && M.contains(it)) {
        const key = it.dataset.id || 'd:' + it.dataset.dir;
        if (e.ctrlKey || e.metaKey) { st.sel.has(key) ? st.sel.delete(key) : st.sel.add(key); }
        else if (e.shiftKey && st.last) { const els = $$('.fm9-it', M), a2 = els.findIndex(x => (x.dataset.id || 'd:' + x.dataset.dir) === st.last), b2 = els.indexOf(it); els.slice(Math.min(a2, b2), Math.max(a2, b2) + 1).forEach(x => st.sel.add(x.dataset.id || 'd:' + x.dataset.dir)); }
        else { st.sel.clear(); st.sel.add(key); }
        st.last = key; status(); if (st.info) info();
        if (K.caps.touch && !e.ctrlKey && !e.shiftKey && !S.get('dbl_open', false)) { /* en táctil se abre con doble toque o desde el menú */ }
      } else if (e.target === M) { st.sel.clear(); status(); if (st.info) info(); }
    });
    M.addEventListener('dblclick', e => { const it = e.target.closest('.fm9-it'); if (!it) return; if (it.dataset.dir) nav(it.dataset.dir); else if (st.special === 'trash') act('restore'); else openFile(it.dataset.id); });
    M.addEventListener('keydown', e => {
      if (e.target.matches('input')) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === 'Enter') { e.preventDefault(); act('open'); } else if (e.key === 'Delete') { e.preventDefault(); act('delete'); } else if (e.key === 'F2') { e.preventDefault(); act('rename'); }
      else if (e.key === 'Backspace') { e.preventDefault(); act('up'); } else if (ctrl && e.key.toLowerCase() === 'a') { e.preventDefault(); act('selectall'); } else if (ctrl && e.key.toLowerCase() === 'c') { e.preventDefault(); act('copy'); } else if (ctrl && e.key.toLowerCase() === 'x') { e.preventDefault(); act('cut'); } else if (ctrl && e.key.toLowerCase() === 'v') { e.preventDefault(); act('paste'); }
      else if (/^Arrow/.test(e.key)) { e.preventDefault(); const els = $$('.fm9-it', M); if (!els.length) return; let i = els.findIndex(x => st.sel.has(x.dataset.id || 'd:' + x.dataset.dir)); const cols = st.view === 'grid' ? Math.max(1, Math.floor(M.clientWidth / 112)) : 1; i = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'ArrowDown' ? i + cols : i - cols; i = Math.max(0, Math.min(els.length - 1, i < 0 && e.key === 'ArrowRight' ? 0 : i)); st.sel.clear(); const el = els[i]; st.sel.add(el.dataset.id || 'd:' + el.dataset.dir); el.scrollIntoView({ block: 'nearest' }); status(); if (st.info) info(); }
    });
    M.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      const it = e.target.closest('.fm9-it');
      if (it) { const key = it.dataset.id || 'd:' + it.dataset.dir; if (!st.sel.has(key)) { st.sel.clear(); st.sel.add(key); status(); } }
      const sel = selected(), one = sel[0], d = selDirs(), trash = st.special === 'trash';
      const items = [];
      if (trash && sel.length) items.push({ label: 'Restaurar', icon: 'refresh', act: () => act('restore') }, { label: 'Eliminar definitivamente', icon: 'trash', danger: true, act: () => act('delete') });
      else if (one || d.length) {
        items.push({ label: 'Abrir', icon: 'external', act: () => act('open'), kbd: 'Enter' });
        if (one) F.handlers(one).forEach(h => items.push({ label: tr('Abrir con') + ' ' + tr(h[1]), icon: 'right', act: () => act('openwith', { app: h[0] }) }));
        if (one && F.handlers(one).length > 1) items.push({ label: 'Abrir siempre con…', icon: 'settings', act: async () => { const hs = F.handlers(one); const r = await E.form({ title: tr('Abrir siempre con'), fields: [{ k: 'a', label: '.' + extOf(one.name), type: 'select', options: hs.map(h => [h[0], tr(h[1])]) }], ok: tr('Guardar') }); if (r) act('openwith', { app: r.a, remember: true }); } });
        items.push({ sep: true }, { label: 'Copiar', icon: 'copy', act: () => act('copy'), kbd: 'Ctrl+C' }, { label: 'Cortar', icon: 'edit', act: () => act('cut'), kbd: 'Ctrl+X' }, { label: 'Duplicar', icon: 'copy', act: () => act('duplicate'), disabled: !sel.length }, { label: 'Mover a…', icon: 'folder', act: () => act('moveto') }, { label: 'Renombrar', icon: 'edit', act: () => act('rename'), kbd: 'F2' }, { label: (one && one.fav) ? 'Quitar de favoritos' : 'Añadir a favoritos', icon: 'star', act: () => act('favtoggle') });
        if (one) items.push({ label: 'Descargar / exportar', icon: 'download', act: () => act('download') });
        if (one && kindOf(one) === 'image') items.push({ label: 'Usar como fondo de pantalla', icon: 'image', act: () => act('wallpaper') });
        if (d.length) items.push({ label: 'Exportar carpeta en ZIP', icon: 'download', act: () => act('zip') });
        items.push({ label: 'Propiedades', icon: 'info', act: () => { st.info = true; q('[data-a="info"]').classList.add('on'); info(); } }, { sep: true }, { label: 'Mover a la papelera', icon: 'trash', danger: true, act: () => act('delete'), kbd: 'Supr' });
      } else if (!st.special) items.push({ label: 'Nueva carpeta', icon: 'folder', act: () => act('newdir') }, { label: 'Nuevo archivo', icon: 'file', act: () => act('newfile') }, { label: 'Importar archivos', icon: 'upload', act: () => act('import') }, { label: 'Pegar', icon: 'copy', act: () => act('paste'), disabled: !st.clip, kbd: 'Ctrl+V' }, { sep: true }, { label: F.favDirs().includes(st.path) ? 'Quitar carpeta de favoritas' : 'Añadir carpeta a favoritas', icon: 'star', act: () => { F.toggleFavDir(st.path); render(); } }, { label: 'Seleccionar todo', icon: 'check', act: () => act('selectall'), kbd: 'Ctrl+A' });
      if (K.ext.files && K.ext.files.menu) { try { K.ext.files.menu(items, { sel, one, dirs: d, trash, special: st.special }); } catch (er) { console.error(er); } }   // 10.0
      if (items.length) K.ui.menu(e.clientX, e.clientY, items);
    });
    q('[data-q]').addEventListener('input', e => { st.q = e.target.value.trim(); clearTimeout(q('[data-q]')._t); q('[data-q]')._t = setTimeout(render, 150); });
    q('[data-sort]').addEventListener('change', e => { if (st.sort === e.target.value) st.dir *= -1; else { st.sort = e.target.value; st.dir = st.sort === 'date' || st.sort === 'size' ? -1 : 1; } S.set('fs9_sort', st.sort); render(); });
    const doImport = async (list) => { if (!list.length || st.special || !st.path) return; E.toast(tr('Importando…')); const n = await F.importFiles(list, st.path); E.toast(n + ' ' + tr('archivos importados')); render(); };
    q('[data-pick]').onchange = e => { doImport([...e.target.files]); e.target.value = ''; };
    q('[data-pickdir]').onchange = e => { doImport([...e.target.files]); e.target.value = ''; };
    // arrastrar y soltar: desde el dispositivo (importar) y entre carpetas (mover)
    let dragIds = null;
    root.addEventListener('dragstart', e => { const it = e.target.closest('.fm9-it'); if (!it) return; const key = it.dataset.id || 'd:' + it.dataset.dir; if (!st.sel.has(key)) { st.sel.clear(); st.sel.add(key); status(); } dragIds = [...st.sel]; e.dataTransfer.setData('text/x-eisen-files', JSON.stringify(dragIds)); e.dataTransfer.effectAllowed = 'move'; });
    root.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); const t = e.target.closest('[data-drop]'); $$('.drop-on', root).forEach(x => x !== t && x.classList.remove('drop-on')); if (t) t.classList.add('drop-on'); else if (!dragIds) M.classList.add('drop-on'); }, true);
    root.addEventListener('dragleave', e => { if (e.target === M) M.classList.remove('drop-on'); });
    root.addEventListener('drop', async e => {
      e.preventDefault(); e.stopPropagation(); $$('.drop-on', root).forEach(x => x.classList.remove('drop-on')); M.classList.remove('drop-on');
      const t = e.target.closest('[data-drop]');
      if (dragIds) { const ids = dragIds; dragIds = null; if (!t) return; const dest = t.dataset.drop; for (const k of ids) { if (k.startsWith('d:')) { try { await F.moveDir(k.slice(2), dest === '#trash' ? '.trash' : dest); } catch (er) { E.toast(er.message); } } else if (dest === '#trash') await F.trash(k); else await F.move(k, dest); } render(); return; }
      const files = [...(e.dataTransfer.files || [])];
      if (files.length) { const dest = t && !t.dataset.drop.startsWith('#') ? t.dataset.drop : st.path; if (st.special && !t) return; E.toast(tr('Importando…')); const n = await F.importFiles(files, dest || 'documents'); E.toast(n + ' ' + tr('archivos importados')); render(); return; }
      const url = ((e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '').split(/\r?\n/).find(l => /^https?:\/\//i.test(l.trim())) || '').trim();
      if (url && !st.special) { try { const blob = await E.ebFetchBlob(url); await F.save(await F.uniqueName(st.path, cleanName(decodeURIComponent(new URL(url).pathname.split('/').pop() || 'archivo'))), blob, st.path); render(); } catch { E.toast(tr('No se pudo descargar ese enlace')); } }
    }, true);
    root.addEventListener('dragend', () => { dragIds = null; $$('.drop-on', root).forEach(x => x.classList.remove('drop-on')); });
    K.on('files', () => { if (win.classList.contains('open')) { clearTimeout(FM._t); FM._t = setTimeout(render, 120); } });
    document.addEventListener('eisen:open', e => { if (e.detail === 'explorer') render(); });
    document.addEventListener('eisen:close', e => { if (e.detail === 'explorer') revoke(); });
    if (E.REG.explorer) E.REG.explorer.onArg = a => { if (typeof a === 'string') nav(a); };
    win.style.width = Math.min(980, innerWidth - 20) + 'px'; win.style.height = Math.min(600, innerHeight - 70) + 'px';
    render();
  }

  /* ---------- Terminal: comandos de archivos REALES (sustituyen a los simulados de 8.0) ---------- */
  const C = E.termCmds;
  if (C) {
    let cwd = 'documents';
    const res = p => { if (!p || p === '.') return cwd; if (p === '~' || p === '/') return ''; const first = p.replace(/^\/+/, '').split('/')[0], isRoot = ROOTS.some(x => x[0] === first || K.norm(tr(x[1])) === K.norm(first)); const rel = cwd ? cwd + '/' + p : p; let parts = (p.startsWith('/') || (isRoot && !dirs().includes(rel)) ? [] : cwd.split('/').filter(Boolean)); p.replace(/^\/+/, '').split('/').forEach(s => { if (!s || s === '.') return; if (s === '..') parts.pop(); else parts.push(s); }); const r = parts.join('/'); const rt = ROOTS.find(x => K.norm(tr(x[1])) === K.norm(parts[0] || '')); return rt ? [rt[0]].concat(parts.slice(1)).join('/') : r; };
    const findFile = async (p) => { const full = res(p), d = parent(full), n = base(full); return (await F.all()).find(f => f.folder === d && f.name === n) || (await F.all()).find(f => f.folder === cwd && f.name === p); };
    Object.assign(C, {
      pwd: ['Carpeta actual', () => '/' + cwd],
      cd: ['Cambia de carpeta (cd Proyectos, cd .., cd /images)', async a => { const t = res(a[0] || '/'); if (t && !ROOTS.some(r => r[0] === t.split('/')[0])) return 'No existe: ' + a[0]; const l = await F.list(parent(t)); if (t && parent(t) && !l.folders.includes(t) && !dirs().includes(t)) return 'No existe la carpeta: ' + a[0]; cwd = t; return ''; }],
      ls: ['Lista la carpeta actual (ls -l para detalles)', async a => { const long = a.includes('-l'), p = res(a.filter(x => x !== '-l')[0]); const { files, folders } = await F.list(p); const out = folders.map(d => (long ? 'd  ' + '—'.padStart(9) + '  ' : '') + base(d) + '/').concat(files.map(f => (long ? '-  ' + K.fmt.bytes(f.size).padStart(9) + '  ' + K.fmt.dt(f.mod || f.date) + '  ' : '') + f.name)); return out.join(long ? '\n' : '   ') || '(vacía)'; }],
      dir: ['Igual que ls', a => C.ls[1](a)],
      tree: ['Árbol de carpetas', async () => { const all = await F.all(), ds = [...new Set(ROOTS.map(r => r[0]).concat(dirs(), all.map(f => f.folder)))].filter(d => !cwd || d === cwd || d.startsWith(cwd + '/')).sort(); return ds.map(d => '  '.repeat(d.split('/').length - (cwd ? cwd.split('/').length : 0)) + '📁 ' + base(d) + '  (' + all.filter(f => f.folder === d).length + ')').join('\n'); }],
      mkdir: ['Crea una carpeta (mkdir nombre)', async a => { if (!a[0]) return 'Uso: mkdir <nombre>'; if (!cwd) return 'Crea carpetas dentro de documents, images…'; const p = await F.mkdir(res(a[0])); return 'Carpeta creada: /' + p; }],
      touch: ['Crea un archivo de texto vacío', async a => { if (!a[0]) return 'Uso: touch <nombre>'; if (!cwd) return 'Entra primero en una carpeta (cd documents)'; await F.save(await F.uniqueName(cwd, cleanName(a[0])), new Blob([''], { type: MIME[extOf(a[0])] || 'text/plain' }), cwd); return 'Creado ' + a[0]; }],
      cat: ['Muestra un archivo de texto', async a => { if (!a[0]) return 'Uso: cat <archivo>'; const f = await findFile(a[0]); if (!f) return 'No existe: ' + a[0]; if (kindOf(f) !== 'text') return 'No es un archivo de texto (' + typeOf(f) + ')'; return (await f.blob.text()).slice(0, 20000); }],
      write: ['Escribe texto en un archivo (write nota.txt "texto")', async (a) => { if (a.length < 2) return 'Uso: write <archivo> "texto"'; const f = await findFile(a[0]); const txt = a.slice(1).join(' '); if (f) { await F.writeText(f.id, txt, typeOf(f)); return 'Sobrescrito ' + f.name; } if (!cwd) return 'Entra en una carpeta'; await F.save(cleanName(a[0]), new Blob([txt], { type: MIME[extOf(a[0])] || 'text/plain' }), cwd); return 'Creado ' + a[0]; }],
      rm: ['Mueve a la papelera (rm archivo, rm -r carpeta)', async a => { const r = a.includes('-r'), n = a.filter(x => x !== '-r')[0]; if (!n) return 'Uso: rm <archivo> | rm -r <carpeta>'; if (r) { const p = res(n); if (ROOTS.some(x => x[0] === p)) return 'No se pueden borrar las carpetas del sistema'; const c = await F.rmdir(p, true); return 'Carpeta enviada a la papelera (' + c + ' archivos)'; } const f = await findFile(n); if (!f) return 'No existe: ' + n; await F.trash(f.id); return 'Enviado a la papelera: ' + f.name; }],
      mv: ['Mueve o renombra (mv origen destino)', async a => { if (a.length < 2) return 'Uso: mv <origen> <destino>'; const f = await findFile(a[0]); if (!f) return 'No existe: ' + a[0]; const t = res(a[1]); const isDir = ROOTS.some(r => r[0] === t) || dirs().includes(t); if (isDir) { await F.move(f.id, t); return 'Movido a /' + t; } await F.rename(f.id, base(t)); if (parent(t) !== f.folder && parent(t)) await F.move(f.id, parent(t)); return 'Renombrado a ' + base(t); }],
      cp: ['Copia un archivo (cp origen carpeta)', async a => { if (a.length < 2) return 'Uso: cp <origen> <carpeta>'; const f = await findFile(a[0]); if (!f) return 'No existe: ' + a[0]; await F.copy(f.id, res(a[1])); return 'Copiado a /' + res(a[1]); }],
      find: ['Busca archivos por nombre', async a => { if (!a[0]) return 'Uso: find <texto>'; const l = await F.search(a.join(' ')); return l.map(f => '/' + f.folder + '/' + f.name).join('\n') || 'Sin resultados'; }],
      du: ['Espacio usado por carpeta', async () => { const all = await F.all(), m = {}; all.forEach(f => { const r = (f.folder || '').split('/')[0]; m[r] = (m[r] || 0) + f.size; }); return Object.entries(m).map(([k, v]) => K.fmt.bytes(v).padStart(10) + '  /' + k).join('\n') || '0 B'; }],
      xdg: ['Abre un archivo con su app (xdg archivo)', async a => { const f = await findFile(a[0] || ''); if (!f) return 'Uso: xdg <archivo>'; openFile(f.id); return 'Abriendo ' + f.name; }],
      trash: ['Lista la papelera (trash empty para vaciarla)', async a => { if (a[0] === 'empty') return 'Eliminados ' + await F.emptyTrash() + ' archivos'; const l = (await allRaw()).filter(f => f.trash); return l.map(f => f.name + '  ← /' + (f.trash.from || '')).join('\n') || 'La papelera está vacía'; }],
      ping: ['Mide el tiempo de respuesta HTTP real de un sitio (ping dominio)', async a => { const h = (a[0] || '').replace(/^https?:\/\//, '').split('/')[0]; if (!h) return 'Uso: ping <dominio>'; const out = []; for (let i = 1; i <= 4; i++) { const t0 = performance.now(); try { await fetch('https://' + h + '/favicon.ico?_=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }); out.push(`Respuesta de ${h}: tiempo=${Math.round(performance.now() - t0)} ms (HTTP)`); } catch { out.push(`${h}: sin respuesta`); } } return out.join('\n') + '\n(Mide HTTPS; el navegador no permite ICMP)'; }]
    });
  }
  // los botones del menú Inicio (layout.js) abren carpetas reales
  K.emit('files-ready');
})();

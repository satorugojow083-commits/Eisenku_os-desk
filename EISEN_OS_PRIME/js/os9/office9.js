/* =====================================================================
   EISENKU OS 9.0 ENTERPRISE · Oficina
   1. EISEN Writer 9.0: varios documentos en Archivos (HTML, Word .docx, texto),
      estilos, fuentes, colores, resaltado, enlaces seguros, imágenes, tablas,
      buscar y reemplazar, recuento de palabras, guardado automático y pegado saneado.
   2. EISEN Sheets 9.0: motor de fórmulas propio (sin eval) con rangos A1:C5,
      operadores, comparaciones y más de 40 funciones (con nombres en español),
      importación/guardado CSV, pegar bloques desde otras hojas y teclado.
   3. Música 8.0: teclas multimedia del sistema y atajos configurables.
   Se apoya en las ventanas de 8.0 (#win-word, #win-excel): no cambia sus ids.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU; if (!E || !K || !K.files) return;
  const $ = (s, r = document) => r.querySelector(s);
  const S = E.storage, esc = E.esc, tr = s => K.tr(s), F = K.files;
  const lang = () => (window.EISEN_I18N && window.EISEN_I18N.lang) || 'es';
  const baseName = n => String(n || '').replace(/\.[^.]+$/, '');
  const mk = (html, attrs = {}, cls = 'btn-secondary') => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = html; Object.entries(attrs).forEach(([k, v]) => b.setAttribute(k, v)); return b; };
  const folderOpts = () => F.ROOTS.map(r => [r[0], tr(r[1])]);
  const setWinTitle = (win, text) => {
    const t = win && win.querySelector('.window-title-area'); if (!t) return;
    let sp = t.querySelector('[data-wt]');
    if (!sp) { [...t.childNodes].filter(n => n.nodeType === 3 && n.data.trim()).forEach(n => n.remove()); sp = document.createElement('span'); sp.dataset.wt = ''; t.appendChild(sp); }
    sp.textContent = text;
  };
  const PRINT_CSS = 'body{font-family:Calibri,"Segoe UI",Arial,sans-serif;font-size:11pt;line-height:1.55;color:#111;max-width:800px;margin:40px auto;padding:0 24px}h1{font-size:20pt;margin:.6em 0 .3em}h2{font-size:16pt;margin:.6em 0 .3em}h3{font-size:13pt}blockquote{border-left:4px solid #d6336c;margin:.6em 0;padding:4px 14px;color:#4b5563;font-style:italic}pre{background:#f3f4f6;padding:10px 12px;border-radius:6px;white-space:pre-wrap;font-family:Consolas,monospace;font-size:10pt}table{border-collapse:collapse;width:100%;margin:.6em 0}td,th{border:1px solid #9ca3af;padding:6px 8px;vertical-align:top}th{background:#f3f4f6}img{max-width:100%;height:auto}a{color:#0563c1}hr{border:0;border-top:1px solid #9ca3af}@media print{body{margin:0;max-width:none}}span[data-eq=frac]{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;margin:0 .15em;font-size:.92em}span[data-eq=frac]>span{display:block;padding:0 .2em}span[data-eq=frac]>span:first-child{border-bottom:1px solid currentColor}span[data-eq=sqrt]{white-space:nowrap}span[data-eq=arg]{border-top:1px solid currentColor;padding:0 .1em}span[data-eq^="m:"]{font-family:"Cambria Math","STIX Two Math","Times New Roman",serif}div[data-toc] ol{list-style:none;padding-left:0}div[data-biblio] p{padding-left:2em;text-indent:-2em}';

  /* =====================================================================
     1. EISEN Writer 9.0
     ===================================================================== */
  const WIN = $('#win-word'), body = $('#word-doc-body'), ribbon = WIN && WIN.querySelector('.office-ribbon'), cont = WIN && WIN.querySelector('.editor-sheet-container');
  const WR = E.writer = { cur: S.get('os9_word_cur', null), dirty: false };
  if (WIN && body && ribbon && cont) {
    const AUTO = 'os9_word_autosave', EXT_OK = ['html', 'htm', 'docx', 'txt'];
    const saved = S.get('word_doc', null);
    if (typeof saved === 'string' && saved.trim()) body.innerHTML = K.sanitize(saved, { style: true });
    body.setAttribute('spellcheck', S.get('os9_word_spell', false) ? 'true' : 'false');
    body.setAttribute('role', 'textbox'); body.setAttribute('aria-multiline', 'true'); body.setAttribute('aria-label', tr('Documento'));
    const autoOn = () => S.get(AUTO, true) !== false;
    const docName = () => (WR.cur && WR.cur.name) || tr('Documento sin título');

    /* ---------- cinta de opciones (los botones de 8.0 se conservan y se agrupan) ---------- */
    const old = c => ribbon.querySelector(`[data-fmt="${c}"]`);
    const bTable = $('#word-btn-table'), bSave = $('#word-btn-save'), bPdf = $('#word-btn-pdf');
    [['bold', 'Negrita (Ctrl+B)'], ['italic', 'Cursiva (Ctrl+I)'], ['underline', 'Subrayado (Ctrl+U)'], ['justifyLeft', 'Alinear a la izquierda'], ['justifyCenter', 'Centrar'], ['justifyRight', 'Alinear a la derecha'], ['insertUnorderedList', 'Lista con viñetas']].forEach(([c, t]) => { const b = old(c); if (b) { b.title = tr(t); b.setAttribute('aria-label', tr(t)); } });
    const sel = (opts, attrs) => { const s = document.createElement('select'); s.className = 'input-text wr9-sel'; Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v)); s.innerHTML = opts.map(([v, l]) => `<option value="${esc(v)}">${esc(tr(l))}</option>`).join(''); return s; };
    const grp = (...els) => { const g = document.createElement('div'); g.className = 'wr9-grp'; els.filter(Boolean).forEach(e => g.appendChild(e)); return g; };
    const swatch = (w, t, def, glyph) => {
      const b = mk(`<span class="wr9-glyph">${glyph}</span><i class="wr9-sw"></i>`, { 'data-w': w, title: tr(t), 'aria-label': tr(t) });
      const p = document.createElement('input'); p.type = 'color'; p.className = 'wr9-pick'; p.value = S.get('os9_word_' + w, def); p.title = tr(t); p.setAttribute('aria-label', tr(t));
      const upd = () => { b.querySelector('.wr9-sw').style.background = p.value; }; upd();
      p.addEventListener('input', upd); p.addEventListener('change', () => { S.set('os9_word_' + w, p.value); upd(); apply(w, p.value); });
      b.addEventListener('click', () => apply(w, p.value));
      return [b, p];
    };
    const bFile = mk(`📄 ${esc(tr('Archivo'))} ▾`, { title: tr('Nuevo, abrir, guardar y exportar'), 'aria-haspopup': 'menu' });
    const bUndo = mk('↶', { title: tr('Deshacer') + ' (Ctrl+Z)', 'aria-label': tr('Deshacer') }), bRedo = mk('↷', { title: tr('Rehacer') + ' (Ctrl+Y)', 'aria-label': tr('Rehacer') });
    const sStyle = sel([['p', 'Normal'], ['h1', 'Título 1'], ['h2', 'Título 2'], ['h3', 'Título 3'], ['blockquote', 'Cita'], ['pre', 'Código']], { title: tr('Estilo de párrafo'), 'aria-label': tr('Estilo de párrafo') });
    const sFont = sel([['', 'Fuente'], ['Calibri, Segoe UI, Arial, sans-serif', 'Sans'], ['Georgia, Times New Roman, serif', 'Serif'], ['Consolas, Courier New, monospace', 'Monoespaciada'], ['Verdana, Tahoma, sans-serif', 'Lectura fácil']], { title: tr('Fuente'), 'aria-label': tr('Fuente') });
    const sSize = sel([['', 'Tamaño'], ['1', 'Muy pequeño'], ['2', 'Pequeño'], ['3', 'Normal'], ['4', 'Grande'], ['5', 'Muy grande'], ['6', 'Enorme']], { title: tr('Tamaño del texto'), 'aria-label': tr('Tamaño del texto') });
    const [bFore, pFore] = swatch('fore', 'Color del texto', '#d6336c', 'A'), [bHi, pHi] = swatch('hilite', 'Resaltar', '#fde68a', '🖍');
    const B = (h, c, t) => { const b = mk(h, { 'data-w': c, title: tr(t), 'aria-label': tr(t) }); return b; };
    const bStrike = B('<s>S</s>', 'strikeThrough', 'Tachado'), bSup = B('x²', 'superscript', 'Superíndice'), bSub = B('x₂', 'subscript', 'Subíndice'), bClear = B('⌫', 'removeFormat', 'Quitar formato');
    const bJust = B('☰', 'justifyFull', 'Justificar'), bOl = B('1. ' + esc(tr('Lista')), 'insertOrderedList', 'Lista numerada'), bOut = B('⇠', 'outdent', 'Reducir sangría'), bInd = B('⇢', 'indent', 'Aumentar sangría');
    const bLink = mk('🔗', { title: tr('Insertar enlace') + ' · ' + tr('Ctrl + clic en un enlace para abrirlo'), 'aria-label': tr('Insertar enlace') }), bImg = mk('🖼', { title: tr('Insertar imagen'), 'aria-label': tr('Insertar imagen') }), bHr = B('―', 'insertHorizontalRule', 'Línea horizontal');
    const bFind = mk('🔍', { title: tr('Buscar y reemplazar') + ' (Ctrl+F)', 'aria-label': tr('Buscar y reemplazar') });
    const bSpell = mk('abc✓', { title: tr('Revisión ortográfica del navegador'), 'aria-pressed': String(body.spellcheck) });
    if (bSave) bSave.title = tr('Guardar en Archivos') + ' (Ctrl+S)';
    if (bPdf) bPdf.title = tr('Imprimir o guardar como PDF') + ' (Ctrl+P)';
    ribbon.classList.add('wr9-ribbon');
    ribbon.replaceChildren(
      grp(bFile, bSave), grp(bUndo, bRedo), grp(sStyle, sFont, sSize),
      grp(old('bold'), old('italic'), old('underline'), bStrike, bSup, bSub, bFore, pFore, bHi, pHi, bClear),
      grp(old('justifyLeft'), old('justifyCenter'), old('justifyRight'), bJust),
      grp(old('insertUnorderedList'), bOl, bOut, bInd), grp(bLink, bImg, bTable, bHr), grp(bFind, bSpell, bPdf)
    );
    // los botones no roban el foco: la selección del documento se mantiene
    ribbon.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });

    /* ---------- barra de búsqueda y barra de estado ---------- */
    const fb = document.createElement('div'); fb.className = 'wr9-find'; fb.hidden = true; fb.setAttribute('role', 'search');
    fb.innerHTML = `<input class="input-text" data-fq placeholder="${esc(tr('Buscar'))}" aria-label="${esc(tr('Buscar'))}"><input class="input-text" data-fr placeholder="${esc(tr('Reemplazar por'))}" aria-label="${esc(tr('Reemplazar por'))}"><label class="wr9-chk" title="${esc(tr('Distinguir mayúsculas y minúsculas'))}"><input type="checkbox" data-fc> Aa</label><span class="wr9-fcount" data-fn>0/0</span><button type="button" class="btn-secondary" data-fa="prev" title="${esc(tr('Anterior'))}" aria-label="${esc(tr('Anterior'))}">↑</button><button type="button" class="btn-secondary" data-fa="next" title="${esc(tr('Siguiente'))}" aria-label="${esc(tr('Siguiente'))}">↓</button><button type="button" class="btn-secondary" data-fa="one">${esc(tr('Reemplazar'))}</button><button type="button" class="btn-secondary" data-fa="all">${esc(tr('Reemplazar todo'))}</button><button type="button" class="btn-secondary" data-fa="close" aria-label="${esc(tr('Cerrar'))}">✕</button>`;
    ribbon.after(fb);
    const sb = document.createElement('div'); sb.className = 'wr9-status';
    sb.innerHTML = '<span data-sn></span><span data-ss></span><span class="wr9-sp"></span><span data-sc aria-live="polite"></span>';
    cont.after(sb);

    /* ---------- estado, recuento y guardado automático ---------- */
    let tCount = 0, tAuto = 0, lastRange = null;
    const words = t => (String(t).match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
    const count = () => {
      const s = getSelection(), part = s.rangeCount && !s.isCollapsed && body.contains(s.anchorNode) ? s.toString() : '';
      const t = body.innerText || '', w = words(t), c = t.replace(/\n/g, '').length;
      $('[data-sc]', sb).textContent = (part ? words(part) + ' / ' : '') + w + ' ' + tr('palabras') + ' · ' + c + ' ' + tr('caracteres') + ' · ' + Math.max(1, Math.ceil(w / 200)) + ' ' + tr('min de lectura');
    };
    const status = () => {
      setWinTitle(WIN, 'EISEN Writer · ' + docName() + (WR.dirty ? ' •' : ''));
      $('[data-sn]', sb).textContent = docName();
      $('[data-ss]', sb).textContent = WR.dirty ? tr('Cambios sin guardar') : WR.cur ? (autoOn() && EXT_OK.includes(WR.cur.ext) ? tr('Guardado automáticamente en Archivos') : tr('Guardado en Archivos')) : tr('Sin guardar en Archivos');
      $('[data-ss]', sb).className = WR.dirty ? 'wr9-dirty' : '';
      clearTimeout(tCount); tCount = setTimeout(count, 250);
    };
    const clean = () => K.sanitize(body.innerHTML, { style: true });
    const docHtml = () => `<!doctype html>\n<html lang="${lang()}"${lang() === 'ar' ? ' dir="rtl"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="generator" content="EISEN Writer 9.0"><title>${esc(baseName(docName()))}</title><style>${PRINT_CSS}</style></head><body>\n${clean()}\n</body></html>`;
    async function toBlob(ext) {
      if (ext === 'docx') { await K.loadScript('js/os9/docx.js'); return K.docx.fromHtml(clean(), { title: baseName(docName()), lang: lang() }); }
      if (ext === 'txt') return new Blob([(body.innerText || '').replace(/\n{3,}/g, '\n\n')], { type: 'text/plain;charset=utf-8' });
      return new Blob([docHtml()], { type: 'text/html;charset=utf-8' });
    }
    const keepCopy = () => { if (!S.set('word_doc', body.innerHTML) && !WR.warned) { WR.warned = true; E.toast(tr('El documento es demasiado grande para la copia de recuperación: guárdalo en Archivos.')); } };
    async function autosave() {
      clearTimeout(tAuto); tAuto = 0; keepCopy();
      if (WR.cur && WR.cur.id && autoOn() && EXT_OK.includes(WR.cur.ext)) {
        try { const f = await F.get(WR.cur.id); if (f && !f.trash) { await F.update(WR.cur.id, { blob: await toBlob(WR.cur.ext) }); WR.dirty = false; } } catch (e) { console.warn('Writer: guardado automático', e); }
      }
      status();
    }
    const changed = () => { WR.dirty = true; status(); clearTimeout(tAuto); tAuto = setTimeout(autosave, 1500); };
    body.addEventListener('input', changed);
    const syncStyle = () => { let v = ''; try { v = String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, ''); } catch { /* sin soporte */ } sStyle.value = ['h1', 'h2', 'h3', 'blockquote', 'pre'].includes(v) ? v : 'p'; };
    document.addEventListener('selectionchange', () => {
      const s = getSelection(); if (!s.rangeCount || !body.contains(s.anchorNode)) return;
      lastRange = s.getRangeAt(0).cloneRange(); clearTimeout(tCount); tCount = setTimeout(count, 250); syncStyle();
    });
    const restore = () => { body.focus({ preventScroll: true }); if (lastRange && body.contains(lastRange.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(lastRange); } };
    const cmd = (c, v = null, css = false) => { restore(); try { document.execCommand('styleWithCSS', false, css); document.execCommand(c, false, v); } finally { document.execCommand('styleWithCSS', false, false); } changed(); };
    function apply(w, v) { if (w === 'fore') cmd('foreColor', v, true); else if (w === 'hilite') cmd('hiliteColor', v, true); }
    ribbon.addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b && !['fore', 'hilite'].includes(b.dataset.w)) cmd(b.dataset.w); });
    sStyle.onchange = () => cmd('formatBlock', sStyle.value);
    sFont.onchange = () => { if (sFont.value) cmd('fontName', sFont.value, true); sFont.value = ''; };
    sSize.onchange = () => { if (sSize.value) cmd('fontSize', sSize.value, true); sSize.value = ''; };
    bUndo.onclick = () => cmd('undo'); bRedo.onclick = () => cmd('redo');
    bSpell.onclick = () => { body.spellcheck = !body.spellcheck; body.lang = lang(); S.set('os9_word_spell', body.spellcheck); bSpell.setAttribute('aria-pressed', String(body.spellcheck)); bSpell.classList.toggle('on', body.spellcheck); E.toast(body.spellcheck ? tr('Revisión ortográfica activada') : tr('Revisión ortográfica desactivada')); };
    bSpell.classList.toggle('on', body.spellcheck);

    /* ---------- abrir, nuevo, guardar ---------- */
    const recentList = () => (S.get('os9_word_recent', []) || []).filter(x => x && x.id);
    const remember = c => S.set('os9_word_recent', [{ id: c.id, name: c.name }].concat(recentList().filter(x => x.id !== c.id)).slice(0, 8));
    const txt2html = t => String(t).replace(/\r\n?/g, '\n').split(/\n{2,}/).map(p => '<p>' + (esc(p).replace(/\n/g, '<br>') || '<br>') + '</p>').join('');
    function setDoc(html, cur) {
      body.innerHTML = html && html.trim() ? html : '<p><br></p>';
      WR.cur = cur || null; S.set('os9_word_cur', WR.cur); WR.dirty = false; keepCopy();
      if (WR.cur) remember(WR.cur);
      closeFind(); status(); cont.scrollTop = 0;
    }
    async function guard() {
      if (!WR.dirty) return true;
      if (WR.cur && autoOn() && EXT_OK.includes(WR.cur.ext)) { await autosave(); return true; }
      return E.confirm(tr('Cambios sin guardar'), tr('El documento actual tiene cambios que no están guardados en Archivos. Si continúas, se perderán.'), tr('Continuar sin guardar'));
    }
    async function openFile(f) {
      const ext = F.extOf(f.name);
      try {
        let html;
        if (ext === 'docx') { await K.loadScript('js/os9/docx.js'); html = await K.docx.toHtml(f.blob); }
        else if (/^(doc|odt|rtf|pages)$/.test(ext)) throw new Error(tr('Este formato no se puede abrir aquí. Guárdalo como .docx, .html o .txt desde su programa original.'));
        else {
          const text = await f.blob.text();
          if (/^html?$/.test(ext)) html = new DOMParser().parseFromString(text, 'text/html').body.innerHTML;
          else if (/^(md|markdown)$/.test(ext)) html = K.md(text);
          else html = txt2html(text);
        }
        setDoc(K.sanitize(html.replace(/<!--[\s\S]*?-->/g, ''), { style: true }), { id: f.id, name: f.name, ext });
        E.openWindow('word'); E.toast(tr('Documento abierto') + ': ', f.name);
        K.activity && K.activity('file', 'word', tr('Abrió') + ' ' + f.name);
      } catch (e) { K.ui.alert(tr('No se pudo abrir el documento'), e.message || String(e)); }
    }
    WR.open = async () => {
      if (!await guard()) return;
      const f = await F.pick({ title: tr('Abrir documento'), accept: x => /\.(docx|html?|txt|md|markdown)$/i.test(x.name), deviceAccept: '.docx,.html,.htm,.txt,.md', folder: 'documents' });
      if (f) openFile(f);
    };
    WR.openId = async id => {
      const f = await F.get(id);
      if (!f || f.trash) { S.set('os9_word_recent', recentList().filter(x => x.id !== id)); E.toast(tr('El archivo ya no existe')); return; }
      if (!await guard()) return; openFile(f);
    };
    WR.newDoc = async () => { if (!await guard()) return; setDoc('<p><br></p>', null); E.openWindow('word'); setTimeout(() => body.focus(), 50); };
    const firstLine = () => ((body.innerText || '').split('\n').map(x => x.trim()).find(Boolean) || '').slice(0, 48).replace(/[\\/:*?"<>|]+/g, ' ').trim();
    WR.save = async (as = false) => {
      clearTimeout(tAuto); tAuto = 0;
      const cur = WR.cur; let target = null;
      if (!as && cur && cur.id && EXT_OK.includes(cur.ext)) { const f = await F.get(cur.id); if (f && !f.trash) target = f; }
      try {
        if (target) await F.update(target.id, { blob: await toBlob(cur.ext) });
        else {
          const prevFolder = cur && cur.id ? ((await F.get(cur.id)) || {}).folder : null;
          const r = await E.form({ title: tr('Guardar documento'), fields: [
            { k: 'n', label: tr('Nombre'), value: cur ? baseName(cur.name) : (firstLine() || tr('Documento')), req: true },
            { k: 'f', label: tr('Formato'), type: 'select', value: cur && EXT_OK.includes(cur.ext) ? (cur.ext === 'htm' ? 'html' : cur.ext) : 'docx', options: [['docx', tr('Word (.docx)')], ['html', tr('Documento web (.html)')], ['txt', tr('Texto sin formato (.txt)')]] },
            { k: 'd', label: tr('Carpeta'), type: 'select', value: prevFolder && F.ROOTS.some(x => x[0] === prevFolder) ? prevFolder : 'documents', options: folderOpts() }
          ], ok: tr('Guardar'), cancel: tr('Cancelar') });
          if (!r) return false;
          const folder = r.d || 'documents', name = await F.uniqueName(folder, F.cleanName((r.n || '').trim() || tr('Documento')) + '.' + r.f);
          const id = await F.save(name, await toBlob(r.f), folder);
          WR.cur = { id, name, ext: r.f }; S.set('os9_word_cur', WR.cur); remember(WR.cur);
        }
        WR.dirty = false; keepCopy(); status();
        E.toast(tr('Guardado en Archivos') + ': ', WR.cur.name);
        return true;
      } catch (e) { K.ui.alert(tr('No se pudo guardar'), e.message || String(e)); return false; }
    };
    async function exportAs(ext) {
      try { E.download(F.cleanName(baseName(docName())) + '.' + ext, await toBlob(ext)); }
      catch (e) { K.ui.alert(tr('No se pudo exportar'), e.message || String(e)); }
    }
    function printDoc() {
      const html = docHtml();
      if (S.get('save_mode', 'both') !== 'device') F.save(F.cleanName(baseName(docName())) + '.html', new Blob([html], { type: 'text/html' }), 'downloads').catch(() => {});   // como en 8.0: copia en Descargas
      const f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-modals allow-same-origin'); f.setAttribute('title', tr('Vista de impresión del documento')); f.setAttribute('aria-hidden', 'true');
      f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      f.srcdoc = html; document.body.appendChild(f);
      f.onload = () => {
        const done = () => setTimeout(() => f.remove(), 500);
        try { f.contentWindow.addEventListener('afterprint', done); f.contentWindow.focus(); f.contentWindow.print(); } catch { E.toast(tr('El navegador no permite imprimir desde aquí')); done(); }
        setTimeout(() => f.isConnected && f.remove(), 120000);
      };
    }
    if (bSave) bSave.onclick = () => WR.save();
    if (bPdf) bPdf.onclick = printDoc;
    bFile.onclick = () => {
      const r = bFile.getBoundingClientRect(), rec = recentList().slice(0, 5);
      K.ui.menu(r.left, r.bottom + 4, [
        { label: 'Nuevo documento', icon: '📄', act: () => WR.newDoc() },
        { label: 'Abrir…', icon: '📂', kbd: 'Ctrl+O', act: () => WR.open() },
        ...(rec.length ? [{ sep: 1 }].concat(rec.map(x => ({ label: x.name, icon: '🕘', act: () => WR.openId(x.id) }))) : []),
        { sep: 1 },
        { label: 'Guardar', icon: '💾', kbd: 'Ctrl+S', act: () => WR.save() },
        { label: 'Guardar como…', icon: '🗂', kbd: 'Ctrl+Shift+S', act: () => WR.save(true) },
        { label: 'Guardado automático en Archivos', icon: '⟳', checked: autoOn(), act: () => { S.set(AUTO, !autoOn()); status(); E.toast(autoOn() ? tr('Guardado automático activado') : tr('Guardado automático desactivado')); } },
        { sep: 1 },
        { label: 'Descargar como Word (.docx)', icon: '⬇', act: () => exportAs('docx') },
        { label: 'Descargar como página web (.html)', icon: '⬇', act: () => exportAs('html') },
        { label: 'Descargar como texto (.txt)', icon: '⬇', act: () => exportAs('txt') },
        { label: 'Imprimir o guardar como PDF', icon: '🖨', kbd: 'Ctrl+P', act: printDoc },
        { sep: 1 },
        { label: 'Mostrar en Archivos', icon: '📁', disabled: !WR.cur, act: async () => { const f = WR.cur && await F.get(WR.cur.id); E.filesOpenFolder(f ? f.folder : 'documents'); } }
      ]);
    };

    /* ---------- enlaces, imágenes, tablas ---------- */
    bLink.onclick = async () => {
      const text = lastRange && body.contains(lastRange.startContainer) ? lastRange.toString() : '';
      const r = await E.form({ title: tr('Insertar enlace'), fields: [{ k: 'u', label: tr('Dirección'), ph: 'https://…', req: true }].concat(text ? [] : [{ k: 't', label: tr('Texto que se muestra'), ph: tr('Opcional') }]), ok: tr('Insertar') });
      if (!r) return;
      let u = String(r.u || '').trim(); if (!u) return;
      if (!/^[a-z][\w+.-]*:/i.test(u)) u = (/^[^\s/]+@[^\s/]+\.[a-z]{2,}$/i.test(u) ? 'mailto:' : 'https://') + u;
      if (!/^(https?:\/\/[^\s]+|mailto:[^\s]+)$/i.test(u)) { E.toast(tr('Solo se permiten enlaces https://, http:// o mailto:')); return; }
      if (text) cmd('createLink', u); else cmd('insertHTML', `<a href="${esc(u)}">${esc(r.t || u)}</a>&nbsp;`);
      body.querySelectorAll('a[href]').forEach(a => { a.rel = 'noopener noreferrer'; a.target = '_blank'; });
    };
    body.addEventListener('click', e => {
      const a = e.target.closest('a[href]'); if (!a) return; e.preventDefault();
      if (!(e.ctrlKey || e.metaKey)) return;
      const h = a.getAttribute('href') || '';
      if (/^https?:/i.test(h)) E.ebOpenUrl(h, true); else if (/^mailto:/i.test(h)) window.open(h, '_blank', 'noopener');
    });
    const loadImg = blob => new Promise((res, rej) => { const u = URL.createObjectURL(blob), im = new Image(); im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(u), 1000); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error(tr('La imagen no se puede leer'))); }; im.src = u; });
    async function imgData(blob) {
      const max = 1600, im = await loadImg(blob); let w = im.naturalWidth, h = im.naturalHeight;
      if (/^image\/(png|jpeg|gif|webp)$/.test(blob.type) && blob.size < 1.5e6 && w <= max && h <= max) return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
      const k = Math.min(1, max / Math.max(w, h)); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
      return c.toDataURL(blob.type === 'image/png' || blob.type === 'image/svg+xml' ? 'image/png' : 'image/jpeg', 0.86);
    }
    async function insertImage(blob, name) {
      try { const url = await imgData(blob); cmd('insertHTML', `<img src="${url}" alt="${esc(baseName(name || tr('imagen')))}">`); }
      catch (e) { E.toast(e.message || tr('La imagen no se puede leer')); }
    }
    bImg.onclick = async () => { const f = await F.pick({ title: tr('Insertar imagen'), accept: x => F.kindOf(x) === 'image', deviceAccept: 'image/*', folder: 'images' }); if (f) insertImage(f.blob, f.name); };
    if (bTable) bTable.onclick = async () => {
      const r = await E.form({ title: tr('Insertar tabla'), fields: [{ k: 'r', label: tr('Filas'), type: 'number', value: 3 }, { k: 'c', label: tr('Columnas'), type: 'number', value: 3 }, { k: 'h', label: tr('Primera fila como encabezado'), type: 'select', value: '1', options: [['1', tr('Sí')], ['0', tr('No')]] }], ok: tr('Insertar') });
      if (!r) return;
      const R = Math.max(1, Math.min(60, +r.r || 3)), C = Math.max(1, Math.min(12, +r.c || 3));
      let h = '<table style="width:100%;border-collapse:collapse">';
      for (let i = 0; i < R; i++) { h += '<tr>'; for (let j = 0; j < C; j++) h += i === 0 && r.h === '1' ? '<th><br></th>' : '<td><br></td>'; h += '</tr>'; }
      cmd('insertHTML', h + '</table><p><br></p>');
    };
    // pegado y arrastre: el HTML externo se sanea (sin scripts, estilos peligrosos ni eventos)
    body.addEventListener('paste', async e => {
      const cd = e.clipboardData; if (!cd) return;
      const imgs = [...(cd.files || [])].filter(f => /^image\//.test(f.type));
      if (imgs.length) { e.preventDefault(); for (const f of imgs) await insertImage(f, f.name); return; }
      const html = cd.getData('text/html');
      if (html) { e.preventDefault(); cmd('insertHTML', K.sanitize(html.replace(/<!--[\s\S]*?-->/g, ''), { style: true })); }
    });
    const caretAt = e => { const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null; if (r && body.contains(r.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(r); lastRange = r.cloneRange(); } };
    body.addEventListener('drop', async e => {
      const dt = e.dataTransfer; if (!dt) return;
      const files = [...(dt.files || [])];
      if (files.length) {
        e.preventDefault(); caretAt(e);
        const doc = files.find(f => /\.(docx|html?|txt|md)$/i.test(f.name));
        if (doc && !files.some(f => /^image\//.test(f.type))) { if (!await guard()) return; const id = await F.save(await F.uniqueName('documents', F.cleanName(doc.name)), doc, 'documents'); openFile(await F.get(id)); return; }
        for (const f of files) if (/^image\//.test(f.type)) await insertImage(f, f.name);
        return;
      }
      const html = dt.getData('text/html'); if (html) { e.preventDefault(); caretAt(e); cmd('insertHTML', K.sanitize(html, { style: true })); }
    });
    // Tab dentro de listas: subir o bajar de nivel (fuera de listas, Tab mueve el foco como siempre)
    body.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || e.ctrlKey || e.altKey) return;
      const s = getSelection(), n = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement);
      if (n && n.closest('li') && body.contains(n)) { e.preventDefault(); cmd(e.shiftKey ? 'outdent' : 'indent'); }
    });

    /* ---------- buscar y reemplazar ---------- */
    const fq = $('[data-fq]', fb), fr = $('[data-fr]', fb), fc = $('[data-fc]', fb), fnum = $('[data-fn]', fb);
    const FD = { list: [], i: -1 };
    const HL = window.Highlight && window.CSS && CSS.highlights;
    const paint = () => { if (!HL) return; CSS.highlights.set('wr9-find', new Highlight(...FD.list)); if (FD.list[FD.i]) CSS.highlights.set('wr9-cur', new Highlight(FD.list[FD.i])); else CSS.highlights.delete('wr9-cur'); };
    function search(keep) {
      const q = fq.value, at = FD.i; FD.list = []; FD.i = -1;
      if (q) {
        const w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT), map = []; let full = '', n;
        while ((n = w.nextNode())) { map.push([full.length, n]); full += n.data; }
        const hay = fc.checked ? full : full.toLowerCase(), nee = fc.checked ? q : q.toLowerCase();
        const loc = p => { let lo = 0, hi = map.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (map[m][0] <= p) lo = m; else hi = m - 1; } return [map[lo][1], p - map[lo][0]]; };
        for (let p = hay.indexOf(nee); p !== -1 && FD.list.length < 5000; p = hay.indexOf(nee, p + nee.length)) {
          const r = document.createRange(), [a, ao] = loc(p), [b, bo] = loc(p + nee.length);
          try { r.setStart(a, ao); r.setEnd(b, Math.min(bo, b.data.length)); FD.list.push(r); } catch { /* rango no válido */ }
        }
        if (FD.list.length) FD.i = keep && at >= 0 ? Math.min(at, FD.list.length - 1) : 0;
      }
      fnum.textContent = (FD.list.length ? FD.i + 1 : 0) + '/' + FD.list.length;
      paint(); show();
    }
    function show() {
      const r = FD.list[FD.i]; if (!r) return;
      if (!HL) { const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      const rc = r.getBoundingClientRect(), cr = cont.getBoundingClientRect();
      if (rc.top < cr.top + 20 || rc.bottom > cr.bottom - 20) cont.scrollTop += rc.top - cr.top - cont.clientHeight / 3;
      fnum.textContent = (FD.i + 1) + '/' + FD.list.length; paint();
    }
    const step = d => { if (!FD.list.length) return; FD.i = (FD.i + d + FD.list.length) % FD.list.length; show(); };
    function replaceOne() {
      const r = FD.list[FD.i]; if (!r) return;
      r.deleteContents(); if (fr.value) r.insertNode(document.createTextNode(fr.value)); body.normalize(); changed(); search(true);
    }
    function replaceAll() {
      if (!FD.list.length) return; const n = FD.list.length;
      for (let i = FD.list.length - 1; i >= 0; i--) { const r = FD.list[i]; r.deleteContents(); if (fr.value) r.insertNode(document.createTextNode(fr.value)); }
      body.normalize(); changed(); search(); E.toast(n + ' ' + tr('reemplazos'));
    }
    function openFind(rep) {
      fb.hidden = false; const s = getSelection();
      if (s.rangeCount && !s.isCollapsed && body.contains(s.anchorNode)) { const t = s.toString(); if (t.length < 80 && !/\n/.test(t)) fq.value = t; }
      (rep && fq.value ? fr : fq).focus(); fq.select(); search();
    }
    function closeFind() { fb.hidden = true; FD.list = []; FD.i = -1; if (HL) { CSS.highlights.delete('wr9-find'); CSS.highlights.delete('wr9-cur'); } }
    WR.find = openFind;

    /* ---------- 10.0: referencias, índice de contenidos, ecuaciones y fuentes instaladas ---------- */
    // la lógica vive en js/os10/apps/office10.js (se carga al usar el menú)
    const bRefs = mk(`📚 ${esc(tr('Referencias'))} ▾`, { title: tr('Citas, bibliografía, índice de contenidos y ecuaciones'), 'aria-haspopup': 'menu' });
    ribbon.appendChild(grp(bRefs));
    const w10 = async () => { if (!K.ext || !K.ext.writer10) await K.loadScript('js/os10/apps/office10.js'); return K.ext.writer10; };
    bRefs.onclick = () => { const r = bRefs.getBoundingClientRect(); K.ui.menu(r.left, r.bottom + 4, [
      { label: tr('Insertar cita…'), icon: '❝', act: async () => (await w10()).cite(WR) },
      { label: tr('Insertar o actualizar la bibliografía'), icon: '📚', act: async () => (await w10()).biblio(WR) },
      { label: tr('Actualizar citas y bibliografía'), icon: '↻', act: async () => (await w10()).refresh(WR, true) },
      { label: tr('Estilo de citas…'), icon: '✒', act: async () => (await w10()).style(WR) },
      { sep: 1 },
      { label: tr('Insertar o actualizar el índice de contenidos'), icon: '☰', act: async () => (await w10()).toc(WR) },
      { label: tr('Insertar ecuación…'), icon: '∑', act: async () => (await w10()).equation(WR) },
      { sep: 1 },
      { label: tr('Gestor de referencias'), icon: '📇', act: () => E.launch('refs') },
      { label: tr('Generador de bibliografía'), icon: '🖋', act: () => E.launch('bibgen') }
    ]); };
    WR.body = body; WR.restore = restore; WR.changed = changed;
    WR.insertHTML = h => cmd('insertHTML', K.sanitize(h, { style: true }));
    // inserción con la API de rangos: execCommand('insertHTML') de Chromium convierte los <span> con atributos en estilos en línea
    WR.insertFrag = html => {
      restore(); const s = getSelection(); let r = s.rangeCount ? s.getRangeAt(0) : null;
      if (!r || !body.contains(r.startContainer)) { r = document.createRange(); r.selectNodeContents(body); r.collapse(false); }
      r.deleteContents(); const tpl = document.createElement('template'); tpl.innerHTML = K.sanitize(html, { style: true }); const frag = tpl.content, last = frag.lastChild;
      if ([...frag.childNodes].some(n => n.nodeType === 1 && /^(DIV|H[1-6]|P|UL|OL|TABLE|BLOCKQUOTE|PRE)$/.test(n.nodeName))) { let blk = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentNode; while (blk && blk !== body && blk.parentNode !== body) blk = blk.parentNode; if (blk && blk !== body) blk.after(frag); else r.insertNode(frag); }
      else r.insertNode(frag);
      if (last && last.parentNode) { const r2 = document.createRange(); r2.setStartAfter(last); r2.collapse(true); s.removeAllRanges(); s.addRange(r2); lastRange = r2.cloneRange(); }
      changed();
    };
    body.addEventListener('dblclick', e => { const sp = e.target.closest('span[data-eq^="m:"]'); if (sp && body.contains(sp)) { e.preventDefault(); w10().then(x => x.equation(WR, sp)); } });
    body.addEventListener('click', e => { const li = e.target.closest('[data-toc-n]'); if (!li || !body.contains(li)) return; const hs = [...body.querySelectorAll('h1,h2,h3')].filter(h => !h.closest('[data-toc]')); const h = hs[+li.dataset.tocN]; if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const addFonts = () => { ((K.fonts10 && K.fonts10.list()) || []).forEach(f => { const v = `"${f.family}"`; if (![...sFont.options].some(o => o.value === v)) sFont.add(new Option(f.family, v)); }); };
    if (K.on) K.on('fonts', addFonts); addFonts();
    let tFind = 0;
    fq.addEventListener('input', () => { clearTimeout(tFind); tFind = setTimeout(() => search(), 120); });
    fc.addEventListener('change', () => search());
    fb.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (e.target === fr) replaceOne(); else step(e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') { e.preventDefault(); closeFind(); restore(); } });
    fb.addEventListener('click', e => { const b = e.target.closest('[data-fa]'); if (!b) return; const a = b.dataset.fa; if (a === 'prev') step(-1); else if (a === 'next') step(1); else if (a === 'one') replaceOne(); else if (a === 'all') replaceAll(); else { closeFind(); restore(); } });
    bFind.onclick = () => (fb.hidden ? openFind(false) : closeFind());

    /* ---------- atajos de la ventana ---------- */
    WIN.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); WR.save(e.shiftKey); }
      else if (k === 'f') { e.preventDefault(); openFind(false); }
      else if (k === 'h') { e.preventDefault(); openFind(true); }
      else if (k === 'p') { e.preventDefault(); printDoc(); }
      else if (k === 'o') { e.preventDefault(); WR.open(); }
      else if (k === 'y' && !e.shiftKey) { e.preventDefault(); cmd('redo'); }
    });

    /* ---------- integración con Archivos y el escritorio ---------- */
    if (E.REG.word) { E.REG.word.onArg = arg => { if (arg && arg.fileId) WR.openId(arg.fileId); else if (arg && arg.new) WR.newDoc(); }; E.REG.word.ver = '9.0.0'; }
    if (F.addHandler) F.addHandler(['word', 'EISEN Writer', f => /^(docx|html?|txt|md)$/.test(F.extOf(f.name))]);
    const nd = $('#ctx-new-doc'); if (nd) { const o = nd.onclick; nd.onclick = ev => { if (o) o.call(nd, ev); WR.newDoc(); }; }
    window.addEventListener('pagehide', () => { if (tAuto) keepCopy(); });
    status();
    // si el archivo del documento actual se borró desde Archivos, se olvida (sigue la copia de trabajo)
    if (WR.cur && WR.cur.id) F.get(WR.cur.id).then(f => { if (!f || f.trash) { WR.cur = null; S.set('os9_word_cur', null); status(); } }).catch(() => {});
  }

  /* =====================================================================
     2. EISEN Sheets 9.0 · motor de fórmulas (sin eval)
     ===================================================================== */
  const SH = K.sheet = (() => {
    const ERR = c => ({ err: c }), isErr = v => !!v && typeof v === 'object' && 'err' in v;
    const colNum = s => [...String(s).toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
    const colName = n => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; };
    const ref = id => { const m = /^\$?([A-Z]{1,3})\$?(\d{1,6})$/.exec(String(id).toUpperCase()); return m ? { c: colNum(m[1]), r: +m[2] } : null; };
    function lex(s) {
      const t = []; let i = 0;
      while (i < s.length) {
        const ch = s[i], rest = s.slice(i); let m;
        if (/\s/.test(ch)) { i++; continue; }
        if (ch === '"') { let j = i + 1, v = ''; for (;;) { if (j >= s.length) throw ERR('#ERROR!'); if (s[j] === '"') { if (s[j + 1] === '"') { v += '"'; j += 2; continue; } break; } v += s[j++]; } t.push({ t: 'str', v }); i = j + 1; continue; }
        if ((m = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?/i.exec(rest))) { t.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
        if ((m = /^\$?([A-Za-z]{1,3})\$?(\d{1,6})(?![\w(.])/.exec(rest))) { t.push({ t: 'ref', v: m[1].toUpperCase() + m[2] }); i += m[0].length; continue; }
        if ((m = /^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_.]*/.exec(rest))) {
          const name = m[0].toUpperCase(); i += m[0].length;
          if (s[i] === '(') t.push({ t: 'fn', v: name }); else if (/^(TRUE|VERDADERO)$/.test(name)) t.push({ t: 'bool', v: true }); else if (/^(FALSE|FALSO)$/.test(name)) t.push({ t: 'bool', v: false }); else t.push({ t: 'name', v: name });
          continue;
        }
        const two = s.substr(i, 2);
        if (two === '<=' || two === '>=' || two === '<>') { t.push({ t: 'op', v: two }); i += 2; continue; }
        if ('+-*/^&=<>(),;:%'.includes(ch)) { t.push({ t: 'op', v: ch }); i++; continue; }
        throw ERR('#ERROR!');
      }
      return t;
    }
    function parse(tokens) {
      let p = 0;
      const peek = () => tokens[p], op = v => peek() && peek().t === 'op' && peek().v === v, next = () => tokens[p++];
      const bin = (sub, ops) => () => { let l = sub(); while (peek() && peek().t === 'op' && ops.includes(peek().v)) { const o = next().v; l = { k: 'bin', o, l, r: sub() }; } return l; };
      const prim = () => {
        const t = next(); if (!t) throw ERR('#ERROR!');
        if (t.t === 'num') return { k: 'v', v: t.v };
        if (t.t === 'str') return { k: 'v', v: t.v };
        if (t.t === 'bool') return { k: 'v', v: t.v };
        if (t.t === 'ref') { if (op(':')) { next(); const t2 = next(); if (!t2 || t2.t !== 'ref') throw ERR('#REF!'); return { k: 'range', a: t.v, b: t2.v }; } return { k: 'ref', v: t.v }; }
        if (t.t === 'fn') {
          next(); const args = [];
          if (!op(')')) for (;;) { args.push(cmp()); if (op(',') || op(';')) { next(); continue; } break; }
          if (!op(')')) throw ERR('#ERROR!'); next();
          return { k: 'fn', n: t.v, args };
        }
        if (t.t === 'op' && t.v === '(') { const e = cmp(); if (!op(')')) throw ERR('#ERROR!'); next(); return e; }
        if (t.t === 'name') { if (t.v === 'PI') return { k: 'v', v: Math.PI }; throw ERR('#NAME?'); }
        throw ERR('#ERROR!');
      };
      const pct = () => { let e = prim(); while (op('%')) { next(); e = { k: 'pct', e }; } return e; };
      const una = () => { if (op('-')) { next(); return { k: 'neg', e: una() }; } if (op('+')) { next(); return una(); } return pct(); };
      const pw = bin(una, ['^']), mul = bin(pw, ['*', '/']), add = bin(mul, ['+', '-']), cat = bin(add, ['&']);
      const cmp = bin(cat, ['=', '<>', '<', '>', '<=', '>=']);
      const ast = cmp(); if (p !== tokens.length) throw ERR('#ERROR!'); return ast;
    }
    // literales de celda: números (punto o coma decimal, miles con punto), porcentajes, texto
    function literal(s) {
      const t = String(s).trim(); if (t === '') return null;
      if (t[0] === "'") return t.slice(1);
      if (/^[+-]?(\d+([.,]\d+)?|[.,]\d+)(e[+-]?\d+)?$/i.test(t)) return parseFloat(t.replace(',', '.'));
      if (/^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return parseFloat(t.replace(/\./g, '').replace(',', '.'));
      if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return parseFloat(t.replace(/,/g, ''));
      if (/^[+-]?(\d+([.,]\d+)?)\s*%$/.test(t)) return parseFloat(t.replace(',', '.')) / 100;
      return t;
    }
    const num = v => {
      if (isErr(v)) throw v; if (v == null || v === '') return 0; if (typeof v === 'number') return v; if (typeof v === 'boolean') return v ? 1 : 0;
      const l = literal(v); if (typeof l === 'number') return l; throw ERR('#VALUE!');
    };
    const fmtNum = n => String(parseFloat((+n).toPrecision(12)));
    const str = v => { if (isErr(v)) throw v; if (v == null) return ''; if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'; if (typeof v === 'number') return fmtNum(v); return String(v); };
    const truthy = v => { if (isErr(v)) throw v; if (typeof v === 'string') { if (/^(true|verdadero)$/i.test(v)) return true; if (/^(false|falso)$/i.test(v)) return false; throw ERR('#VALUE!'); } return !!num(v); };
    const flat = vals => { const o = []; vals.forEach(v => { if (v && v.range) v.vals.forEach(r => r.forEach(x => o.push(x))); else o.push(v); }); return o; };
    const nums = (vals, strict) => { const o = []; vals.forEach(v => { if (v && v.range) v.vals.forEach(r => r.forEach(x => { if (isErr(x)) throw x; if (typeof x === 'number') o.push(x); })); else o.push(strict ? num(v) : num(v)); }); return o; };
    function cmpVals(a, b) {
      if (isErr(a)) throw a; if (isErr(b)) throw b;
      const na = a == null ? (typeof b === 'string' ? '' : 0) : a, nb = b == null ? (typeof a === 'string' ? '' : 0) : b;
      if (typeof na === 'number' && typeof nb === 'number') return na - nb;
      if (typeof na === 'boolean' && typeof nb === 'boolean') return (na ? 1 : 0) - (nb ? 1 : 0);
      if (typeof na === 'number') return -1; if (typeof nb === 'number') return 1;
      return String(na).localeCompare(String(nb), undefined, { sensitivity: 'base' });
    }
    function matcher(c) {
      if (isErr(c)) throw c;
      if (typeof c === 'number' || typeof c === 'boolean') return v => v === c || (typeof v === 'string' && literal(v) === c);
      const m = /^(<=|>=|<>|<|>|=)?(.*)$/s.exec(String(c ?? '')), o = m[1] || '=', raw = m[2], n = literal(raw);
      if (typeof n === 'number') return v => { if (typeof v !== 'number') return o === '<>'; const d = v - n; return o === '=' ? d === 0 : o === '<>' ? d !== 0 : o === '<' ? d < 0 : o === '>' ? d > 0 : o === '<=' ? d <= 0 : d >= 0; };
      const rx = new RegExp('^' + String(raw).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
      if (o === '=' ) return v => rx.test(v == null ? '' : str(v));
      if (o === '<>') return v => !rx.test(v == null ? '' : str(v));
      return v => { if (typeof v !== 'string') return false; const d = v.localeCompare(raw, undefined, { sensitivity: 'base' }); return o === '<' ? d < 0 : o === '>' ? d > 0 : o === '<=' ? d <= 0 : d >= 0; };
    }
    const round = (x, d, mode) => { const f = 10 ** d, a = Math.abs(x) * f, r = mode === 'up' ? Math.ceil(+a.toPrecision(15)) : mode === 'down' ? Math.floor(+a.toPrecision(15)) : Math.round(+a.toPrecision(15)); return Math.sign(x) * r / f; };
    const A = { SUMA: 'SUM', PROMEDIO: 'AVERAGE', AVG: 'AVERAGE', CONTAR: 'COUNT', CONTARA: 'COUNTA', REDONDEAR: 'ROUND', 'REDONDEAR.MAS': 'ROUNDUP', 'REDONDEAR.MENOS': 'ROUNDDOWN', ENTERO: 'INT', RAIZ: 'SQRT', 'RAÍZ': 'SQRT', POTENCIA: 'POWER', POW: 'POWER', RESIDUO: 'MOD', SI: 'IF', 'SI.ERROR': 'IFERROR', Y: 'AND', O: 'OR', NO: 'NOT', CONCATENAR: 'CONCAT', CONCATENATE: 'CONCAT', LARGO: 'LEN', MAYUSC: 'UPPER', 'MAYÚSC': 'UPPER', MINUSC: 'LOWER', 'MINÚSC': 'LOWER', ESPACIOS: 'TRIM', IZQUIERDA: 'LEFT', DERECHA: 'RIGHT', EXTRAE: 'MID', HOY: 'TODAY', AHORA: 'NOW', 'SUMAR.SI': 'SUMIF', 'CONTAR.SI': 'COUNTIF', 'PROMEDIO.SI': 'AVERAGEIF', PRODUCTO: 'PRODUCT', MEDIANA: 'MEDIAN', BUSCARV: 'VLOOKUP', 'CONTAR.BLANCO': 'COUNTBLANK', ALEATORIO: 'RAND', 'ALEATORIO.ENTRE': 'RANDBETWEEN', SIGNO: 'SIGN', TEXTO: 'TEXT' };
    const LAZY = { IF: 1, IFERROR: 1 };
    const FN = {
      SUM: a => nums(a).reduce((x, y) => x + y, 0),
      AVERAGE: a => { const n = nums(a); if (!n.length) throw ERR('#DIV/0!'); return n.reduce((x, y) => x + y, 0) / n.length; },
      MIN: a => { const n = nums(a); return n.length ? Math.min(...n) : 0; }, MAX: a => { const n = nums(a); return n.length ? Math.max(...n) : 0; },
      COUNT: a => flat(a).filter(v => typeof v === 'number').length,
      COUNTA: a => flat(a).filter(v => v != null && v !== '').length,
      COUNTBLANK: a => flat(a).filter(v => v == null || v === '').length,
      PRODUCT: a => nums(a).reduce((x, y) => x * y, 1),
      MEDIAN: a => { const n = nums(a).sort((x, y) => x - y); if (!n.length) throw ERR('#NUM!'); const h = n.length >> 1; return n.length % 2 ? n[h] : (n[h - 1] + n[h]) / 2; },
      ROUND: ([x, d]) => round(num(x), Math.trunc(num(d ?? 0))), ROUNDUP: ([x, d]) => round(num(x), Math.trunc(num(d ?? 0)), 'up'), ROUNDDOWN: ([x, d]) => round(num(x), Math.trunc(num(d ?? 0)), 'down'),
      INT: ([x]) => Math.floor(num(x)), ABS: ([x]) => Math.abs(num(x)), SIGN: ([x]) => Math.sign(num(x)),
      SQRT: ([x]) => { const n = num(x); if (n < 0) throw ERR('#NUM!'); return Math.sqrt(n); },
      POWER: ([x, y]) => { const r = num(x) ** num(y); if (!Number.isFinite(r)) throw ERR('#NUM!'); return r; },
      MOD: ([n, d]) => { const a = num(n), b = num(d); if (b === 0) throw ERR('#DIV/0!'); return a - b * Math.floor(a / b); },
      PI: () => Math.PI, EXP: ([x]) => Math.exp(num(x)),
      LN: ([x]) => { const n = num(x); if (n <= 0) throw ERR('#NUM!'); return Math.log(n); },
      LOG10: ([x]) => { const n = num(x); if (n <= 0) throw ERR('#NUM!'); return Math.log10(n); },
      LOG: ([x, b]) => { const n = num(x), bb = b == null ? 10 : num(b); if (n <= 0 || bb <= 0 || bb === 1) throw ERR('#NUM!'); return Math.log(n) / Math.log(bb); },
      RAND: () => Math.random(), RANDBETWEEN: ([a, b]) => { const lo = Math.ceil(num(a)), hi = Math.floor(num(b)); if (hi < lo) throw ERR('#NUM!'); return lo + Math.floor(Math.random() * (hi - lo + 1)); },
      AND: a => { const v = flat(a).filter(x => x != null && x !== ''); if (!v.length) throw ERR('#VALUE!'); return v.every(truthy); },
      OR: a => { const v = flat(a).filter(x => x != null && x !== ''); if (!v.length) throw ERR('#VALUE!'); return v.some(truthy); },
      NOT: ([x]) => !truthy(x),
      CONCAT: a => flat(a).map(str).join(''),
      LEN: ([x]) => str(x).length, UPPER: ([x]) => str(x).toLocaleUpperCase(), LOWER: ([x]) => str(x).toLocaleLowerCase(), TRIM: ([x]) => str(x).trim().replace(/\s+/g, ' '),
      LEFT: ([x, n]) => str(x).slice(0, Math.max(0, num(n ?? 1))), RIGHT: ([x, n]) => { const s = str(x), k = Math.max(0, num(n ?? 1)); return k ? s.slice(-k) : ''; },
      MID: ([x, a, n]) => { const s = str(x), st = Math.max(1, num(a)); return s.substr(st - 1, Math.max(0, num(n))); },
      TEXT: ([x, d]) => { const n = num(x), k = Math.max(0, Math.min(10, Math.trunc(num(d ?? 2)))); return n.toLocaleString(K.locale || undefined, { minimumFractionDigits: k, maximumFractionDigits: k }); },
      TODAY: () => new Date().toLocaleDateString(K.locale || undefined), NOW: () => new Date().toLocaleString(K.locale || undefined),
      SUMIF: ([r, c, s]) => { const m = matcher(c), rv = r && r.range ? r.vals.flat() : [r], sv = s && s.range ? s.vals.flat() : rv; let t = 0; rv.forEach((v, i) => { if (m(v)) { const x = sv[i]; if (typeof x === 'number') t += x; } }); return t; },
      COUNTIF: ([r, c]) => { const m = matcher(c); return (r && r.range ? r.vals.flat() : [r]).filter(v => m(v)).length; },
      AVERAGEIF: ([r, c, s]) => { const m = matcher(c), rv = r && r.range ? r.vals.flat() : [r], sv = s && s.range ? s.vals.flat() : rv, l = []; rv.forEach((v, i) => { if (m(v) && typeof sv[i] === 'number') l.push(sv[i]); }); if (!l.length) throw ERR('#DIV/0!'); return l.reduce((x, y) => x + y, 0) / l.length; },
      VLOOKUP: ([v, r, c, approx]) => {
        if (!r || !r.range) throw ERR('#VALUE!'); const col = Math.trunc(num(c)); if (col < 1 || col > r.vals[0].length) throw ERR('#REF!');
        const exact = approx != null && !truthy(approx); let hit = -1;
        if (exact) hit = r.vals.findIndex(row => cmpVals(row[0], v) === 0 && row[0] != null);
        else r.vals.forEach((row, i) => { if (row[0] != null && cmpVals(row[0], v) <= 0) hit = i; });
        if (hit < 0) throw ERR('#N/A'); return r.vals[hit][col - 1];
      }
    };
    function evalAst(n, ctx) {
      switch (n.k) {
        case 'v': return n.v;
        case 'ref': return cell(n.v, ctx);
        case 'range': {
          const a = ref(n.a), b = ref(n.b); if (!a || !b) throw ERR('#REF!');
          const r0 = Math.min(a.r, b.r), r1 = Math.max(a.r, b.r), c0 = Math.min(a.c, b.c), c1 = Math.max(a.c, b.c);
          if ((r1 - r0 + 1) * (c1 - c0 + 1) > 100000) throw ERR('#REF!');
          const vals = []; for (let r = r0; r <= r1; r++) { const row = []; for (let c = c0; c <= c1; c++) row.push(cell(colName(c) + r, ctx)); vals.push(row); }
          return { range: true, vals };
        }
        case 'neg': return -num(evalAst(n.e, ctx));
        case 'pct': return num(evalAst(n.e, ctx)) / 100;
        case 'bin': {
          const l = evalAst(n.l, ctx), r = evalAst(n.r, ctx);
          if ((l && l.range) || (r && r.range)) throw ERR('#VALUE!');
          switch (n.o) {
            case '+': return num(l) + num(r); case '-': return num(l) - num(r); case '*': return num(l) * num(r);
            case '/': { const d = num(r); if (d === 0) throw ERR('#DIV/0!'); return num(l) / d; }
            case '^': { const x = num(l) ** num(r); if (!Number.isFinite(x)) throw ERR('#NUM!'); return x; }
            case '&': return str(l) + str(r);
            case '=': return cmpVals(l, r) === 0; case '<>': return cmpVals(l, r) !== 0; case '<': return cmpVals(l, r) < 0;
            case '>': return cmpVals(l, r) > 0; case '<=': return cmpVals(l, r) <= 0; case '>=': return cmpVals(l, r) >= 0;
          }
          throw ERR('#ERROR!');
        }
        case 'fn': {
          const name = A[n.n] || n.n;
          if (name === 'IF') { if (n.args.length < 2) throw ERR('#ERROR!'); return truthy(evalAst(n.args[0], ctx)) ? evalAst(n.args[1], ctx) : n.args[2] ? evalAst(n.args[2], ctx) : false; }
          if (name === 'IFERROR') { if (n.args.length < 2) throw ERR('#ERROR!'); try { const v = evalAst(n.args[0], ctx); if (isErr(v)) throw v; return v; } catch (e) { if (isErr(e)) return evalAst(n.args[1], ctx); throw e; } }
          const f = FN[name]; if (!f || LAZY[name]) throw ERR('#NAME?');
          return f(n.args.map(a => evalAst(a, ctx)));
        }
      }
      throw ERR('#ERROR!');
    }
    function cell(id, ctx) {
      if (ctx.cache.has(id)) return ctx.cache.get(id);
      if (ctx.stack.has(id)) throw ERR('#CIRC!');
      const raw = ctx.data[id]; let v;
      if (raw == null || raw === '') v = null;
      else if (String(raw).trim().startsWith('=')) {
        ctx.stack.add(id);
        try { v = evalAst(parse(lex(String(raw).trim().slice(1))), ctx); if (v && v.range) v = ERR('#VALUE!'); }
        catch (e) { v = isErr(e) ? e : ERR('#ERROR!'); }
        finally { ctx.stack.delete(id); }
      } else v = literal(raw);
      ctx.cache.set(id, v); return v;
    }
    const out = v => { if (isErr(v)) return v.err; if (v == null) return ''; if (v && v.range) return '#VALUE!'; if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'; if (typeof v === 'number') return Number.isFinite(v) ? parseFloat(v.toPrecision(12)) : '#NUM!'; return v; };
    function evaluate(expr, data = {}) {
      const raw = String(expr ?? '').trim(); if (!raw.startsWith('=')) return expr == null ? '' : expr;
      const ctx = { data, cache: new Map(), stack: new Set() };
      try { const v = evalAst(parse(lex(raw.slice(1))), ctx); return out(v && v.range ? ERR('#VALUE!') : v); }
      catch (e) { return isErr(e) ? e.err : '#ERROR!'; }
    }
    function parseCsv(text, delim) {
      text = String(text || '').replace(/^﻿/, '');
      if (!delim) { const first = text.split(/\r?\n/, 1)[0] || ''; delim = ['\t', ';', ','].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0]; }
      const rows = []; let row = [], f = '', q = false, quoted = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
        if (c === '"' && f === '' && !quoted) { q = true; quoted = true; continue; }
        if (c === delim) { row.push(f); f = ''; quoted = false; continue; }
        if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; quoted = false; continue; }
        f += c;
      }
      if (f !== '' || row.length) { row.push(f); rows.push(row); }
      return rows;
    }
    const guard = v => (/^[=+\-@\t\r]/.test(v) && !/^-?\d/.test(v) ? "'" + v : v);   // evita la inyección de fórmulas al abrir el CSV en otros programas
    function toCsv(data, rows, cols, delim = ',') {
      let mr = 0, mc = 0; Object.keys(data).forEach(k => { const m = /^([A-Z]+)(\d+)$/.exec(k); if (m && data[k] !== '' && data[k] != null) { mr = Math.max(mr, +m[2]); mc = Math.max(mc, colNum(m[1])); } });
      mr = Math.min(mr, rows || mr); mc = Math.min(mc, cols || mc);
      const lines = [];
      for (let r = 1; r <= mr; r++) { const l = []; for (let c = 1; c <= mc; c++) { const v = guard(String(data[colName(c) + r] ?? '')); l.push(/[",;\n\r\t]/.test(v) || v !== v.trim() ? '"' + v.replace(/"/g, '""') + '"' : v); } lines.push(l.join(delim)); }
      return lines.join('\r\n') + (lines.length ? '\r\n' : '');
    }
    const FUNCS = [
      ['SUM', 'SUMA', '=SUMA(A1:A10)', 'Suma números o rangos'], ['AVERAGE', 'PROMEDIO', '=PROMEDIO(B2:B8)', 'Media aritmética'], ['MIN / MAX', 'MIN / MAX', '=MAX(A1:C5)', 'Mínimo y máximo'],
      ['COUNT', 'CONTAR', '=CONTAR(A1:A20)', 'Cuenta celdas con números'], ['COUNTA', 'CONTARA', '=CONTARA(A1:A20)', 'Cuenta celdas no vacías'], ['COUNTBLANK', 'CONTAR.BLANCO', '=CONTAR.BLANCO(A1:A20)', 'Cuenta celdas vacías'],
      ['PRODUCT', 'PRODUCTO', '=PRODUCTO(A1:A3)', 'Multiplica valores'], ['MEDIAN', 'MEDIANA', '=MEDIANA(A1:A9)', 'Valor central'],
      ['ROUND', 'REDONDEAR', '=REDONDEAR(A1;2)', 'Redondea a n decimales'], ['ROUNDUP / ROUNDDOWN', 'REDONDEAR.MAS / .MENOS', '=REDONDEAR.MAS(A1;0)', 'Redondeo hacia arriba o abajo'],
      ['INT · ABS · SIGN', 'ENTERO · ABS · SIGNO', '=ABS(A1)', 'Entero, valor absoluto, signo'], ['SQRT · POWER', 'RAIZ · POTENCIA', '=POTENCIA(2;10)', 'Raíz cuadrada y potencia'], ['MOD', 'RESIDUO', '=RESIDUO(A1;2)', 'Resto de la división'],
      ['EXP · LN · LOG · LOG10 · PI', 'EXP · LN · LOG · LOG10 · PI', '=LOG(8;2)', 'Exponenciales y logaritmos'], ['RAND · RANDBETWEEN', 'ALEATORIO · ALEATORIO.ENTRE', '=ALEATORIO.ENTRE(1;6)', 'Números aleatorios'],
      ['IF', 'SI', '=SI(A1>=5;"Aprobado";"Suspenso")', 'Condición'], ['IFERROR', 'SI.ERROR', '=SI.ERROR(A1/B1;0)', 'Valor alternativo si hay error'], ['AND · OR · NOT', 'Y · O · NO', '=Y(A1>0;B1>0)', 'Lógica'],
      ['SUMIF · COUNTIF · AVERAGEIF', 'SUMAR.SI · CONTAR.SI · PROMEDIO.SI', '=SUMAR.SI(A1:A9;">10")', 'Con criterio (>, <, =, <>, * y ?)'], ['VLOOKUP', 'BUSCARV', '=BUSCARV("Ana";A2:C9;3;FALSO)', 'Busca en la primera columna'],
      ['CONCAT · &', 'CONCATENAR · &', '=A1&" "&B1', 'Une textos'], ['LEN · UPPER · LOWER · TRIM', 'LARGO · MAYUSC · MINUSC · ESPACIOS', '=MAYUSC(A1)', 'Texto'], ['LEFT · RIGHT · MID', 'IZQUIERDA · DERECHA · EXTRAE', '=IZQUIERDA(A1;3)', 'Partes de un texto'],
      ['TEXT', 'TEXTO', '=TEXTO(A1;2)', 'Número con n decimales y separadores locales'], ['TODAY · NOW', 'HOY · AHORA', '=HOY()', 'Fecha y hora actuales']
    ];
    return { evaluate, colName, colNum, parseCsv, toCsv, literal, FUNCS };
  })();

  /* ---------- EISEN Sheets: interfaz 9.0 ---------- */
  const XW = $('#win-excel'), X = E.excel;
  if (XW && X) {
    const st = X.state, grid = XW.querySelector('.excel-grid-container'), rib = XW.querySelector('.office-ribbon'), fx = $('#excel-formula-input');
    const MAXR = 2000, MAXC = 26;
    const dims = S.get('os9_sheet_dims', null) || {};
    const fit = () => { let mr = 0, mc = 0; Object.keys(st.data).forEach(k => { const m = /^([A-Z]+)(\d+)$/.exec(k); if (m && st.data[k] !== '' && st.data[k] != null) { mr = Math.max(mr, +m[2]); mc = Math.max(mc, SH.colNum(m[1])); } }); st.rows = Math.min(MAXR, Math.max(18, st.rows, mr, dims.rows || 0)); st.cols = Math.min(MAXC, Math.max(8, st.cols, mc, dims.cols || 0)); };
    fit();
    const saveDims = () => S.set('os9_sheet_dims', { rows: st.rows, cols: st.cols });
    const persist = () => { S.set('excel_data', st.data); saveDims(); };
    let cur = S.get('os9_sheet_cur', null);
    const title = () => setWinTitle(XW, 'EISEN Sheets · ' + (cur ? cur.name : tr('Hoja sin título')));
    if (fx) fx.placeholder = tr('Valor o fórmula: =SUMA(A1:B5) · =SI(A1>10;"alto";"bajo")');
    const bOpen = mk('📂 ' + esc(tr('Abrir…')), { title: tr('Abrir un CSV de Archivos o del dispositivo') }), bSv = mk('💾 ' + esc(tr('Guardar')), { title: tr('Guardar la hoja en Archivos (CSV)') });
    const bCol = mk('＋ ' + esc(tr('Columna')), { title: tr('Añadir una columna (máximo 26)') }), bFx = mk('ƒx ' + esc(tr('Funciones')), { title: tr('Funciones disponibles') }), bClr = mk('🧹 ' + esc(tr('Vaciar')), { title: tr('Vaciar la hoja') });
    if (rib) { rib.prepend(bOpen, bSv); rib.append(bCol, bFx, bClr); }
    const addRow = $('#sheet-btn-addrow'); if (addRow) addRow.addEventListener('click', () => { st.rows = Math.min(MAXR, st.rows); saveDims(); });
    bCol.onclick = () => { if (st.cols >= MAXC) return E.toast(tr('Máximo 26 columnas (A-Z)')); st.cols++; saveDims(); X.render(); };
    bClr.onclick = async () => { if (!await E.confirm(tr('Vaciar la hoja'), tr('Se borrarán todas las celdas de la hoja actual.'), tr('Vaciar'))) return; Object.keys(st.data).forEach(k => delete st.data[k]); st.rows = 18; st.cols = 8; cur = null; S.set('os9_sheet_cur', null); persist(); X.render(); title(); };
    bFx.onclick = () => E.form({ title: tr('Funciones de EISEN Sheets'), html: `<p class="eis-muted" style="font-size:12.5px">${esc(tr('Escribe = y la función. Los argumentos se separan con ; o con , y los rangos con : (A1:C5). Puedes usar los nombres en inglés o en español.'))}</p><div style="max-height:52vh;overflow:auto"><table class="k9-table" style="width:100%;font-size:12.5px"><thead><tr><th>${esc(tr('Función'))}</th><th>${esc(tr('Ejemplo'))}</th><th>${esc(tr('Qué hace'))}</th></tr></thead><tbody>${SH.FUNCS.map(f => `<tr><td><b>${esc(f[1])}</b><br><small class="eis-muted">${esc(f[0])}</small></td><td><code>${esc(f[2])}</code></td><td>${esc(tr(f[3]))}</td></tr>`).join('')}</tbody></table><p class="eis-muted" style="font-size:12px;margin-top:8px">${esc(tr('Operadores: + − * / ^ % & = <> < > <= >=. Errores: #DIV/0!, #VALUE!, #NAME?, #REF!, #N/A, #NUM!, #CIRC! (referencia circular).'))}</p></div>`, ok: tr('Cerrar'), cancel: tr('Cerrar') });
    function load(rows, c) {
      Object.keys(st.data).forEach(k => delete st.data[k]);
      const R = Math.min(MAXR, rows.length), C = Math.min(MAXC, Math.max(0, ...rows.map(r => r.length)));
      for (let r = 0; r < R; r++) for (let k = 0; k < C; k++) { let v = rows[r][k]; if (v == null || v === '') continue; if (/^'[=+\-@]/.test(v)) v = v.slice(1); st.data[SH.colName(k + 1) + (r + 1)] = v; }
      st.rows = Math.max(18, R); st.cols = Math.max(8, C); cur = c; S.set('os9_sheet_cur', cur); persist(); X.render(); title();
      if (rows.length > MAXR || rows.some(r => r.length > MAXC)) E.toast(tr('La hoja se ha recortado a 2.000 filas y 26 columnas'));
    }
    async function openCsv(f) {
      if (!f) return;
      if (/\.(xlsx|xls|ods)$/i.test(f.name)) return K.ui.alert(tr('Formato no compatible'), tr('EISEN Sheets abre archivos CSV. Exporta la hoja como CSV desde su programa original.'));
      if (Object.values(st.data).some(v => v !== '' && v != null) && !await E.confirm(tr('Abrir hoja'), tr('El contenido actual de la hoja se sustituirá. Guárdalo antes si lo necesitas.'), tr('Abrir'))) return;
      const text = await f.blob.text(); load(SH.parseCsv(text, /\.tsv$/i.test(f.name) ? '\t' : null), { id: f.id, name: f.name });
      E.openWindow('excel'); E.toast(tr('Hoja abierta') + ': ', f.name);
    }
    bOpen.onclick = async () => { const f = await F.pick({ title: tr('Abrir hoja (CSV)'), accept: x => /\.(csv|tsv|txt)$/i.test(x.name), deviceAccept: '.csv,.tsv,.txt', folder: 'documents' }); if (f) openCsv(f); };
    bSv.onclick = async () => {
      const csv = '﻿' + SH.toCsv(st.data, st.rows, st.cols), blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      try {
        const f = cur && await F.get(cur.id);
        if (f && !f.trash && /\.csv$/i.test(f.name)) await F.update(f.id, { blob });
        else {
          const r = await E.form({ title: tr('Guardar hoja'), fields: [{ k: 'n', label: tr('Nombre'), value: cur ? baseName(cur.name) : tr('Hoja'), req: true }, { k: 'd', label: tr('Carpeta'), type: 'select', value: 'documents', options: folderOpts() }], ok: tr('Guardar') });
          if (!r) return;
          const name = await F.uniqueName(r.d || 'documents', F.cleanName(r.n.trim() || tr('Hoja')) + '.csv'), id = await F.save(name, blob, r.d || 'documents');
          cur = { id, name }; S.set('os9_sheet_cur', cur);
        }
        title(); E.toast(tr('Guardado en Archivos') + ': ', cur.name);
      } catch (e) { K.ui.alert(tr('No se pudo guardar'), e.message || String(e)); }
    };
    // edición: la celda muestra su fórmula al editarla; Enter/flechas mueven la selección
    const focusCell = id => { const el = XW.querySelector(`[data-cell="${id}"]`); if (el) { el.focus(); try { el.select(); } catch { /* sin selección */ } } };
    grid.addEventListener('focusin', e => { const inp = e.target.closest('.excel-cell-input'); if (!inp) return; const raw = st.data[inp.dataset.cell]; if (raw != null && String(raw).startsWith('=')) inp.value = raw; inp.dataset.orig = inp.value; });
    grid.addEventListener('keydown', e => {
      const inp = e.target.closest('.excel-cell-input'); if (!inp) return;
      const m = /^([A-Z]+)(\d+)$/.exec(inp.dataset.cell); if (!m) return;
      let c = SH.colNum(m[1]), r = +m[2]; const k = e.key;
      const atStart = inp.selectionStart === 0 && inp.selectionEnd === 0, atEnd = inp.selectionStart === inp.value.length && inp.selectionEnd === inp.value.length;
      if (k === 'Escape') { e.preventDefault(); inp.value = inp.dataset.orig ?? inp.value; inp.blur(); return; }
      if (k === 'Enter') r += e.shiftKey ? -1 : 1;
      else if (k === 'ArrowDown') r++; else if (k === 'ArrowUp') r--;
      else if (k === 'ArrowLeft' && atStart) c--; else if (k === 'ArrowRight' && atEnd) c++;
      else return;
      e.preventDefault(); e.stopPropagation();
      if (inp.value !== inp.dataset.orig) { st.data[inp.dataset.cell] = inp.value; inp.dataset.orig = inp.value; S.set('excel_data', st.data); }
      if (r > st.rows && st.rows < MAXR) { st.rows = r; saveDims(); X.render(); }
      r = Math.max(1, Math.min(st.rows, r)); c = Math.max(1, Math.min(st.cols, c));
      focusCell(SH.colName(c) + r); X.refresh();
    }, true);
    grid.addEventListener('focusout', e => { if (e.target.closest('.excel-cell-input')) setTimeout(() => X.refresh(), 0); });
    // pegar un bloque copiado de otra hoja de cálculo (columnas separadas por tabuladores)
    grid.addEventListener('paste', e => {
      const inp = e.target.closest('.excel-cell-input'); if (!inp) return;
      const t = (e.clipboardData && e.clipboardData.getData('text/plain')) || '', body2 = t.replace(/\r?\n$/, '');
      if (!/[\t\n]/.test(body2)) return;
      e.preventDefault();
      const rows = SH.parseCsv(body2, '\t'), m = /^([A-Z]+)(\d+)$/.exec(inp.dataset.cell), c0 = SH.colNum(m[1]), r0 = +m[2]; let cut = false;
      rows.forEach((row, i) => row.forEach((v, j) => { const r = r0 + i, c = c0 + j; if (r > MAXR || c > MAXC) { cut = true; return; } st.data[SH.colName(c) + r] = v; st.rows = Math.max(st.rows, r); st.cols = Math.max(st.cols, c); }));
      persist(); X.render(); focusCell(inp.dataset.cell); if (cut) E.toast(tr('Parte del bloque quedó fuera de la hoja (máximo 2.000 filas y 26 columnas)'));
    }, true);
    if (E.REG.excel) { E.REG.excel.onArg = async arg => { if (arg && arg.fileId) openCsv(await F.get(arg.fileId)); }; E.REG.excel.ver = '9.0.0'; }
    if (F.addHandler) F.addHandler(['excel', 'EISEN Sheets', f => /^(csv|tsv)$/.test(F.extOf(f.name))]);
    title();
    if (cur && cur.id) F.get(cur.id).then(f => { if (!f || f.trash) { cur = null; S.set('os9_sheet_cur', null); title(); } }).catch(() => {});
  }

  /* =====================================================================
     3. Música 8.0: teclas multimedia (Media Session) y atajos del sistema
     ===================================================================== */
  const play = $('#p-play-main');
  if (play) {
    const click = id => () => { const b = document.getElementById(id); if (b) b.click(); };
    if (K.keys) {
      K.keys.register('mplay', 'Música: reproducir o pausar', 'Ctrl+Alt+K', click('p-play-main'), 'Multimedia');
      K.keys.register('mnext', 'Música: canción siguiente', 'Ctrl+Alt+L', click('p-next'), 'Multimedia');
      K.keys.register('mprev', 'Música: canción anterior', 'Ctrl+Alt+J', click('p-prev'), 'Multimedia');
    }
    const ms = navigator.mediaSession;
    if (ms) new MutationObserver(() => {
      const on = play.textContent.includes('⏸');
      try {
        if (on) {
          const t = ($('#player-track-name') || {}).textContent || 'EISEN Music';
          if (window.MediaMetadata) ms.metadata = new MediaMetadata({ title: t, artist: 'EISENKU OS', album: 'EISEN Music' });
          [['play', 'p-play-main'], ['pause', 'p-play-main'], ['nexttrack', 'p-next'], ['previoustrack', 'p-prev']].forEach(([a, id]) => ms.setActionHandler(a, click(id)));
        }
        ms.playbackState = on ? 'playing' : 'paused';
      } catch { /* acción no admitida por el navegador */ }
    }).observe(play, { childList: true, characterData: true, subtree: true });
  }
})();

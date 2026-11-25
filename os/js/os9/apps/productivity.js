/* EISENKU OS 9.0 · Apps de productividad: Markdown, PDF Creator, Proyectos, Apuntes, Contraseñas y Escáner */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)];
  const get = (k, d) => S.get('a9_' + k, d), put = (k, v) => S.set('a9_' + k, v);
  const uid = () => E.uid();
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ===================== Escritor de PDF propio (sin dependencias) ===================== */
  K.pdf = (() => {
    const A = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
    const HW = {}; A.forEach((w, i) => { HW[32 + i] = w; });
    const sp = { 0x80: 556, 0x85: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0x96: 556, 0x97: 1000, 0xA0: 278, 0xA1: 333, 0xAB: 556, 0xB0: 400, 0xBB: 556, 0xBF: 611, 0xC6: 1000, 0xC7: 722, 0xD1: 722, 0xDD: 667, 0xDF: 611, 0xE6: 889, 0xE7: 500, 0xF1: 556, 0xFD: 500, 0xFF: 500 };
    for (let c = 0xC0; c <= 0xC5; c++) HW[c] = 667; for (let c = 0xC8; c <= 0xCB; c++) HW[c] = 667; for (let c = 0xCC; c <= 0xCF; c++) HW[c] = 278; for (let c = 0xD2; c <= 0xD6; c++) HW[c] = 778; for (let c = 0xD9; c <= 0xDC; c++) HW[c] = 722;
    for (let c = 0xE0; c <= 0xE5; c++) HW[c] = 556; for (let c = 0xE8; c <= 0xEB; c++) HW[c] = 556; for (let c = 0xEC; c <= 0xEF; c++) HW[c] = 278; for (let c = 0xF2; c <= 0xF6; c++) HW[c] = 556; for (let c = 0xF9; c <= 0xFC; c++) HW[c] = 556;
    Object.assign(HW, sp);
    const WIN = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };
    const code = ch => { const c = ch.codePointAt(0); if (c === 9) return 32; if ((c >= 32 && c < 127) || (c >= 160 && c <= 255)) return c; return WIN[c] || 63; };
    const latinOnly = s => [...s].every(ch => { const c = ch.codePointAt(0); return c === 10 || c === 9 || (c >= 32 && c < 127) || (c >= 160 && c <= 255) || WIN[c]; });
    const width = (s, size, bold) => [...s].reduce((a, ch) => a + (HW[code(ch)] || 556), 0) * size / 1000 * (bold ? 1.06 : 1);
    function wrap(text, size, maxW, bold) {
      const out = [];
      String(text).split('\n').forEach(par => {
        if (!par.trim()) { out.push(''); return; }
        let line = '';
        par.split(/(\s+)/).forEach(w => {
          if (!w) return; const t = line + w;
          if (width(t.trimEnd(), size, bold) <= maxW) { line = t; return; }
          if (line.trim()) out.push(line.trimEnd());
          line = w.trimStart();
          while (width(line, size, bold) > maxW) { let k = line.length; while (k > 1 && width(line.slice(0, k), size, bold) > maxW) k--; out.push(line.slice(0, k)); line = line.slice(k); }
        });
        if (line.trim()) out.push(line.trimEnd());
      });
      return out;
    }
    const pdfStr = s => '(' + [...s].map(ch => { const c = code(ch); return c === 40 ? '\\(' : c === 41 ? '\\)' : c === 92 ? '\\\\' : c < 128 ? String.fromCharCode(c) : '\\' + c.toString(8).padStart(3, '0'); }).join('') + ')';
    const SIZES = { a4: [595.28, 841.89], letter: [612, 792], a5: [419.53, 595.28] };
    class Doc {
      constructor(o = {}) { this.size = SIZES[o.size] || SIZES.a4; if (o.landscape) this.size = [this.size[1], this.size[0]]; this.margin = o.margin == null ? 56 : o.margin; this.pages = []; this.wm = o.watermark || ''; this.title = o.title || 'EISENKU'; }
      // páginas de texto: bloques [{text, size, bold, gap}]
      addText(blocks) {
        const [W, H] = this.size, m = this.margin, maxW = W - m * 2; let y = H - m, ops = [];
        const flush = () => { this.pages.push({ ops }); ops = []; y = H - m; };
        blocks.forEach(b => {
          const size = b.size || 11, lead = size * 1.4, lines = wrap(b.text, size, maxW, b.bold);
          if (b.gap) y -= b.gap;
          lines.forEach(ln => { if (y - lead < m) flush(); y -= lead; if (ln) ops.push(`BT /${b.bold ? 'F2' : 'F1'} ${size} Tf ${m.toFixed(2)} ${y.toFixed(2)} Td ${pdfStr(ln)} Tj ET`); });
        });
        if (ops.length) flush();
      }
      addImage(jpeg, w, h, fit = 'page') {
        let [W, H] = this.size; const m = fit === 'image' ? 0 : this.margin;
        if (fit === 'image') { W = w * .75; H = h * .75; }
        const s = Math.min((W - m * 2) / w, (H - m * 2) / h), dw = w * s, dh = h * s;
        this.pages.push({ img: { jpeg, w, h }, size: fit === 'image' ? [W, H] : null, ops: [`q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${((W - dw) / 2).toFixed(2)} ${((H - dh) / 2).toFixed(2)} cm /Im0 Do Q`] });
      }
      build() {
        const enc = new TextEncoder(), chunks = [], offs = []; let len = 0;
        const add = c => { const u = typeof c === 'string' ? latin(c) : c; chunks.push(u); len += u.length; };
        const latin = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
        const obj = (n, body) => { offs[n] = len; add(`${n} 0 obj\n`); (Array.isArray(body) ? body : [body]).forEach(add); add('\nendobj\n'); };
        add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
        const n0 = 5, kids = [];
        let next = n0;
        const plan = this.pages.map(p => { const o = { page: next++, content: next++ }; if (p.img) o.img = next++; kids.push(o.page + ' 0 R'); return o; });
        obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
        obj(2, `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`);
        obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
        obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
        this.pages.forEach((p, i) => {
          const o = plan[i], [W, H] = p.size || this.size;
          let ops = p.ops.join('\n');
          if (this.wm) ops += `\nq 0.85 g BT /F2 54 Tf ${Math.cos(Math.PI / 4).toFixed(4)} ${Math.sin(Math.PI / 4).toFixed(4)} ${(-Math.sin(Math.PI / 4)).toFixed(4)} ${Math.cos(Math.PI / 4).toFixed(4)} ${(W * .18).toFixed(1)} ${(H * .25).toFixed(1)} Tm ${pdfStr(this.wm.slice(0, 40))} Tj ET Q`;
          const res = `/Resources << /Font << /F1 3 0 R /F2 4 0 R >>${p.img ? ` /XObject << /Im0 ${o.img} 0 R >>` : ''} >>`;
          obj(o.page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] ${res} /Contents ${o.content} 0 R >>`);
          const stream = latin(ops);
          obj(o.content, [`<< /Length ${stream.length} >>\nstream\n`, stream, '\nendstream']);
          if (p.img) obj(o.img, [`<< /Type /XObject /Subtype /Image /Width ${p.img.w} /Height ${p.img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.img.jpeg.length} >>\nstream\n`, p.img.jpeg, '\nendstream']);
        });
        const infoN = next; obj(infoN, `<< /Producer (EISENKU OS ${K.version}) /Title ${pdfStr(this.title)} /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}) >>`);
        const xref = len, total = infoN + 1;
        add(`xref\n0 ${total}\n0000000000 65535 f \n`);
        for (let n = 1; n < total; n++) add(String(offs[n] || 0).padStart(10, '0') + ' 00000 n \n');
        add(`trailer\n<< /Size ${total} /Root 1 0 R /Info ${infoN} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
        void enc;
        return new Blob(chunks, { type: 'application/pdf' });
      }
    }
    const jpegOf = (canvas, q = .9) => new Promise(r => canvas.toBlob(async b => r(new Uint8Array(await b.arrayBuffer())), 'image/jpeg', q));
    // texto con cualquier alfabeto: se dibuja en un lienzo y se incrusta como imagen
    async function textAsImages(doc, text, o = {}) {
      const [W, H] = doc.size, sc = 2, m = doc.margin, c = document.createElement('canvas'); c.width = W * sc; c.height = H * sc; const g = c.getContext('2d');
      const size = (o.size || 11) * sc, lead = size * 1.45, maxW = (W - m * 2) * sc; g.font = `${size}px system-ui, sans-serif`;
      const lines = []; String(text).split('\n').forEach(par => { let ln = ''; [...par].forEach(ch => { if (g.measureText(ln + ch).width > maxW) { lines.push(ln); ln = ch.trimStart(); } else ln += ch; }); lines.push(ln); });
      let y = m * sc; const pages = [];
      const page = () => { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#111'; g.font = `${size}px system-ui, sans-serif`; g.textBaseline = 'top'; y = m * sc; };
      page();
      for (const ln of lines) { if (y + lead > (H - m) * sc) { pages.push(await jpegOf(c)); page(); } g.fillText(ln, m * sc, y); y += lead; }
      pages.push(await jpegOf(c));
      pages.forEach(j => doc.pages.push({ img: { jpeg: j, w: c.width, h: c.height }, ops: [`q ${W.toFixed(2)} 0 0 ${H.toFixed(2)} 0 0 cm /Im0 Do Q`] }));
    }
    return { Doc, wrap, latinOnly, jpegOf, textAsImages, SIZES };
  })();
  const imgToJpeg = (src, maxSide = 2200, filter) => new Promise((res, rej) => {
    const im = new Image(); im.onload = async () => { let w = im.naturalWidth, h = im.naturalHeight; const s = Math.min(1, maxSide / Math.max(w, h)); w = Math.round(w * s); h = Math.round(h * s); const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h); if (filter) filter(g, w, h); res({ jpeg: await K.pdf.jpegOf(c), w, h, canvas: c }); };
    im.onerror = () => rej(new Error(tr('No se pudo leer la imagen'))); im.src = src;
  });

  /* ===================== Editor Markdown ===================== */
  K.define('markdown', {
    init(b, w, arg) {
      const st = { id: null, name: tr('documento.md'), dirty: false };
      b.innerHTML = `<div class="k9 a9-md"><div class="k9-bar">
        <button class="k9-btn" data-a="new">${I('file', 15)} ${esc(tr('Nuevo'))}</button><button class="k9-btn" data-a="open">${I('folder', 15)} ${esc(tr('Abrir'))}</button><button class="k9-btn pri" data-a="save">${I('save', 15)} ${esc(tr('Guardar'))}</button><span class="k9-muted k9-small" data-name></span><span class="sp"></span>
        ${[['**', 'B', 'Negrita'], ['*', 'I', 'Cursiva'], ['# ', 'H1', 'Título'], ['## ', 'H2', 'Subtítulo'], ['- ', '•', 'Lista'], ['1. ', '1.', 'Lista numerada'], ['- [ ] ', '☐', 'Tarea'], ['`', '</>', 'Código'], ['> ', '❝', 'Cita'], ['[]()', '🔗', 'Enlace'], ['|tbl', '▦', 'Tabla']].map(([t, l, ti]) => `<button class="k9-btn" data-ins="${esc(t)}" title="${esc(tr(ti))}">${esc(l)}</button>`).join('')}
        <div class="k9-seg"><button data-mode="split" class="on">${esc(tr('Dividido'))}</button><button data-mode="edit">${esc(tr('Editor'))}</button><button data-mode="view">${esc(tr('Vista'))}</button></div><button class="k9-btn" data-a="html" title="${esc(tr('Exportar HTML'))}">${I('download', 15)} HTML</button></div>
        <div class="a9-md-body" data-body><textarea class="k9-editor" data-src spellcheck="true" aria-label="Markdown"></textarea><article class="a9-md-view md-view" data-view></article></div>
        <div class="k9-status"><span data-words></span><span data-toc-n></span><span style="margin-left:auto">${esc(tr('Vista previa segura: el HTML del texto se muestra como texto'))}</span></div></div>`;
      const src = q(b, '[data-src]'), view = q(b, '[data-view]');
      const draw = () => { const r = K.md(src.value); view.innerHTML = r.html || `<p class="k9-muted">${esc(tr('La vista previa aparecerá aquí.'))}</p>`; const words = (src.value.match(/\S+/g) || []).length; q(b, '[data-words]').textContent = `${words} ${tr('palabras')} · ${src.value.length} ${tr('caracteres')}`; q(b, '[data-toc-n]').textContent = `${r.toc.length} ${tr('títulos')}`; q(b, '[data-name]').textContent = st.name + (st.dirty ? ' •' : ''); };
      const autosave = debounce(() => put('md_draft', { v: src.value, id: st.id, name: st.name }), 600);
      src.addEventListener('input', () => { st.dirty = true; draw(); autosave(); });
      src.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); src.setRangeText('  ', src.selectionStart, src.selectionEnd, 'end'); } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } });
      const wrapSel = (pre, post = pre) => { const s = src.selectionStart, e2 = src.selectionEnd, t = src.value.slice(s, e2) || tr('texto'); src.setRangeText(pre + t + post, s, e2, 'select'); src.focus(); src.dispatchEvent(new Event('input')); };
      const linePre = p => { const s = src.value.lastIndexOf('\n', src.selectionStart - 1) + 1; src.setRangeText(p, s, s, 'end'); src.focus(); src.dispatchEvent(new Event('input')); };
      async function save() {
        if (!st.id) { const n = await K.ui.prompt(tr('Guardar documento'), tr('Nombre'), st.name); if (!n) return; st.name = /\.(md|markdown)$/i.test(n) ? n : n + '.md'; st.id = await K.files.save(await K.files.uniqueName('documents', st.name), new Blob([src.value], { type: 'text/markdown' }), 'documents'); }
        else await K.files.writeText(st.id, src.value, 'text/markdown');
        st.dirty = false; draw(); E.toast(tr('Guardado en Archivos') + ': ' + st.name);
      }
      async function load(fileId) { const f = await K.files.get(fileId); if (!f) return; src.value = await f.blob.text(); st.id = f.id; st.name = f.name; st.dirty = false; draw(); }
      b.addEventListener('click', async e => {
        const ins = e.target.closest('[data-ins]'); if (ins) { const t = ins.dataset.ins; if (t === '**' || t === '*' || t === '`') wrapSel(t); else if (t === '[]()') wrapSel('[', '](https://)'); else if (t === '|tbl') { src.setRangeText('\n| Columna 1 | Columna 2 |\n| --- | --- |\n| Dato | Dato |\n', src.selectionStart, src.selectionEnd, 'end'); src.dispatchEvent(new Event('input')); } else linePre(t); return; }
        const m = e.target.closest('[data-mode]'); if (m) { qa(b, '[data-mode]').forEach(x => x.classList.toggle('on', x === m)); q(b, '[data-body]').dataset.mode = m.dataset.mode; return; }
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'new') { if (st.dirty && !await E.confirm(tr('Nuevo documento'), tr('Hay cambios sin guardar. ¿Continuar?'))) return; src.value = '# ' + tr('Nuevo documento') + '\n\n'; st.id = null; st.name = tr('documento.md'); st.dirty = false; draw(); }
        if (a.dataset.a === 'open') { const f = await K.files.pick({ accept: f => /\.(md|markdown|txt)$/i.test(f.name), deviceAccept: '.md,.markdown,.txt' }); if (f) load(f.id); }
        if (a.dataset.a === 'save') save();
        if (a.dataset.a === 'html') { const r = K.md(src.value), doc = `<!doctype html><html lang="${(window.EISEN_I18N || {}).lang || 'es'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(st.name)}</title><style>body{font:16px/1.65 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1b1d22}pre{background:#f4f5f7;padding:12px;border-radius:8px;overflow:auto}code{background:#f4f5f7;padding:1px 4px;border-radius:4px}table{border-collapse:collapse}td,th{border:1px solid #ccd;padding:6px 10px}blockquote{border-left:4px solid #34a582;margin:0;padding-left:14px;color:#555}</style></head><body>${r.html.replace(/data-external-url="([^"]+)"/g, 'target="_blank" rel="noopener" data-u="$1"').replace(/href="#" target="_blank" rel="noopener" data-u="([^"]+)"/g, 'href="$1" target="_blank" rel="noopener"')}</body></html>`; const name = st.name.replace(/\.(md|markdown)$/i, '') + '.html'; await K.files.save(await K.files.uniqueName('documents', name), new Blob([doc], { type: 'text/html' }), 'documents'); E.download(name, new Blob([doc], { type: 'text/html' })); }
      });
      view.addEventListener('click', e => { const a = e.target.closest('a[href^="#"]'); if (a && a.getAttribute('href').length > 1) { e.preventDefault(); const t = view.querySelector(a.getAttribute('href')); if (t) t.scrollIntoView({ behavior: 'smooth' }); } });
      const d = get('md_draft', null);
      src.value = d && d.v ? d.v : `# ${tr('Bienvenido al Editor Markdown')}\n\n${tr('Escribe a la izquierda y mira el resultado a la derecha.')}\n\n## ${tr('Ejemplos')}\n\n- **${tr('Negrita')}**, *${tr('cursiva')}*, ~~${tr('tachado')}~~ y ==${tr('resaltado')}==\n- [ ] ${tr('Tarea pendiente')}\n- [x] ${tr('Tarea hecha')}\n\n| ${tr('Materia')} | ${tr('Nota')} |\n| --- | ---: |\n| ${tr('Física')} | 9.5 |\n\n\`\`\`js\nconsole.log('EISENKU OS 9');\n\`\`\`\n\n> ${tr('Las citas se ven así.')}\n`;
      if (d) { st.id = d.id || null; st.name = d.name || st.name; }
      draw();
      this.onArg = a2 => { if (a2 && a2.fileId) load(a2.fileId); };
      if (arg && arg.fileId) load(arg.fileId);
    }
  });

  /* ===================== PDF Creator ===================== */
  K.define('pdftools', {
    init(b, w, arg) {
      const pages = []; // {kind:'text', text} | {kind:'img', name, url, jpeg, w, h}
      b.innerHTML = `<div class="k9"><div class="k9-bar"><button class="k9-btn" data-a="text">${I('file', 15)} ${esc(tr('Añadir texto'))}</button><button class="k9-btn" data-a="img">${I('image', 15)} ${esc(tr('Añadir imágenes'))}</button><button class="k9-btn" data-a="fromfiles">${I('folder', 15)} ${esc(tr('Desde Archivos'))}</button><span class="sp"></span>
        <label class="k9-row k9-small">${esc(tr('Página'))} <select class="input-text" data-size><option value="a4">A4</option><option value="letter">Carta</option><option value="a5">A5</option></select></label><label class="k9-row k9-small"><input type="checkbox" data-land> ${esc(tr('Horizontal'))}</label>
        <label class="k9-row k9-small">${esc(tr('Margen'))} <select class="input-text" data-margin><option value="56">${esc(tr('Normal'))}</option><option value="28">${esc(tr('Estrecho'))}</option><option value="0">${esc(tr('Sin margen'))}</option></select></label></div>
        <div class="k9-body"><div class="k9-row" style="margin-bottom:10px"><input class="input-text" data-title placeholder="${esc(tr('Título del documento'))}" style="flex:1"><input class="input-text" data-wm placeholder="${esc(tr('Marca de agua (opcional)'))}" style="width:220px"></div><div data-list class="a9-pdf-list"></div></div>
        <div class="k9-bar" style="border-top:1px solid var(--e9-line);border-bottom:0"><span class="k9-muted k9-small" data-info></span><span class="sp"></span><button class="k9-btn" data-a="preview">${I('eye', 15)} ${esc(tr('Vista previa'))}</button><button class="k9-btn pri" data-a="build">${I('download', 15)} ${esc(tr('Crear PDF'))}</button></div></div>`;
      const L = q(b, '[data-list]');
      const draw = () => { L.innerHTML = pages.map((p, i) => `<div class="a9-pdf-item"><span class="a9-pdf-n">${i + 1}</span>${p.kind === 'img' ? `<img src="${p.url}" alt="">` : `<textarea class="input-text" data-t="${i}" rows="5" placeholder="${esc(tr('Escribe el texto de esta sección…'))}">${esc(p.text)}</textarea>`}<div class="k9-col"><button class="k9-btn" data-up="${i}" ${i ? '' : 'disabled'}>${I('up', 14)}</button><button class="k9-btn" data-down="${i}" ${i < pages.length - 1 ? '' : 'disabled'}>${I('down', 14)}</button><button class="k9-btn dng" data-del="${i}">${I('trash', 14)}</button></div></div>`).join('') || `<div class="k9-state" style="min-height:220px">${I('file', 36)}<p>${esc(tr('Añade texto o imágenes. Cada imagen ocupa una página; el texto fluye en las páginas necesarias.'))}</p></div>`; q(b, '[data-info]').textContent = `${pages.length} ${tr('elementos')}`; };
      const addImgs = async files => { for (const f of files) { if (!/^image\//.test(f.type)) continue; const url = URL.createObjectURL(f); try { const j = await imgToJpeg(url); pages.push({ kind: 'img', name: f.name, url, jpeg: j.jpeg, w: j.w, h: j.h }); } catch (e) { E.toast(e.message); } } draw(); };
      async function build() {
        if (!pages.length) return E.toast(tr('Añade contenido primero'));
        const doc = new K.pdf.Doc({ size: q(b, '[data-size]').value, landscape: q(b, '[data-land]').checked, margin: +q(b, '[data-margin]').value, watermark: q(b, '[data-wm]').value.trim(), title: q(b, '[data-title]').value.trim() || 'EISENKU' });
        const title = q(b, '[data-title]').value.trim();
        let first = true;
        for (const p of pages) {
          if (p.kind === 'img') { doc.addImage(p.jpeg, p.w, p.h); continue; }
          const blocks = []; if (first && title) blocks.push({ text: title, size: 20, bold: true });
          p.text.split('\n').forEach(l => { const m = l.match(/^(#{1,3})\s+(.*)/); blocks.push(m ? { text: m[2], size: [0, 18, 15, 13][m[1].length], bold: true, gap: 6 } : { text: l, size: 11 }); });
          if (K.pdf.latinOnly(p.text + title)) doc.addText(blocks); else await K.pdf.textAsImages(doc, (first && title ? title + '\n\n' : '') + p.text);
          first = false;
        }
        return doc.build();
      }
      b.addEventListener('input', e => { const t = e.target.closest('[data-t]'); if (t) pages[+t.dataset.t].text = t.value; });
      b.addEventListener('click', async e => {
        const t = e.target;
        const up = t.closest('[data-up]'), dn = t.closest('[data-down]'), dl = t.closest('[data-del]');
        if (up) { const i = +up.dataset.up; [pages[i - 1], pages[i]] = [pages[i], pages[i - 1]]; draw(); return; }
        if (dn) { const i = +dn.dataset.down; [pages[i + 1], pages[i]] = [pages[i], pages[i + 1]]; draw(); return; }
        if (dl) { const p = pages.splice(+dl.dataset.del, 1)[0]; if (p && p.url) URL.revokeObjectURL(p.url); draw(); return; }
        const a = t.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'text') { pages.push({ kind: 'text', text: '' }); draw(); const ta = L.querySelector(`[data-t="${pages.length - 1}"]`); if (ta) ta.focus(); }
        if (a.dataset.a === 'img') addImgs(await K.ui.pickFile('image/*', true));
        if (a.dataset.a === 'fromfiles') { const f = await K.files.pick({ accept: f => /^image\/|text\/|markdown/.test(K.files.typeOf(f)) }); if (f) { if (/^image\//.test(K.files.typeOf(f))) addImgs([new File([f.blob], f.name, { type: K.files.typeOf(f) })]); else { pages.push({ kind: 'text', text: await f.blob.text() }); draw(); } } }
        if (a.dataset.a === 'preview' || a.dataset.a === 'build') {
          a.disabled = true; try { const pdf = await build(); if (!pdf) return; const name = (q(b, '[data-title]').value.trim() || 'Documento') + '.pdf';
            if (a.dataset.a === 'preview') { const u = URL.createObjectURL(pdf); (E.trustedBlobs = E.trustedBlobs || new Set()).add(u); E.ebOpenUrl(u, true); }
            else { const id = await K.files.save(await K.files.uniqueName('documents', K.files.cleanName(name)), pdf, 'documents'); void id; E.download(name, pdf); E.toast(tr('PDF creado y guardado en Documentos') + ' (' + K.fmt.bytes(pdf.size) + ')'); }
          } catch (er) { K.ui.alert(tr('No se pudo crear el PDF'), er.message); } finally { a.disabled = false; }
        }
      });
      draw();
      this.onArg = a2 => { if (a2 && a2.images) addImgs(a2.images); };
    },
    onClose() { }
  });

  /* ===================== Gestor de proyectos (Kanban) ===================== */
  K.define('projects', {
    init(b) {
      let data = get('projects', null);
      if (!data || !Array.isArray(data.list)) { const id = uid(); data = { cur: id, list: [{ id, name: tr('Mi primer proyecto'), color: '#34a582', cols: [{ id: 'c1', name: tr('Por hacer') }, { id: 'c2', name: tr('En curso') }, { id: 'c3', name: tr('Hecho') }], cards: [{ id: uid(), col: 'c1', title: tr('Arrastra esta tarjeta a otra columna'), desc: '', prio: 'media', due: '', labels: [tr('ejemplo')] }] }] }; put('projects', data); }
      const save = () => put('projects', data), cur = () => data.list.find(p => p.id === data.cur) || data.list[0];
      const PR = { alta: ['p', tr('Alta')], media: ['w', tr('Media')], baja: ['g', tr('Baja')] };
      b.innerHTML = `<div class="k9"><div class="k9-split" style="grid-template-columns:200px 1fr"><aside class="k9-side" data-side></aside><main class="k9-main"><div class="k9-bar"><b data-pname style="font-size:15px"></b><span class="k9-badge" data-prog></span><span class="sp"></span><input class="input-text" data-f placeholder="${esc(tr('Filtrar tarjetas…'))}" style="width:180px"><button class="k9-btn pri" data-a="card">${I('plus', 15)} ${esc(tr('Tarjeta'))}</button><button class="k9-btn" data-a="col">${I('plus', 15)} ${esc(tr('Columna'))}</button><button class="k9-btn" data-a="menu">${I('more', 15)}</button></div><div class="a9-board" data-board></div></main></div></div>`;
      const board = q(b, '[data-board]');
      function draw() {
        const p = cur(), f = K.norm(q(b, '[data-f]').value || '');
        q(b, '[data-side]').innerHTML = `<h6>${esc(tr('Proyectos'))}</h6>` + data.list.map(x => `<button class="k9-item${x.id === p.id ? ' on' : ''}" data-p="${x.id}"><span class="k9-dot" style="background:${esc(x.color)}"></span>${esc(x.name)}<small style="margin-left:auto" class="k9-muted">${x.cards.length}</small></button>`).join('') + `<button class="k9-item" data-a="newp">${I('plus', 15)} ${esc(tr('Nuevo proyecto'))}</button>`;
        q(b, '[data-pname]').textContent = p.name;
        const last = p.cols[p.cols.length - 1], done = last ? p.cards.filter(c => c.col === last.id).length : 0;
        q(b, '[data-prog]').textContent = p.cards.length ? Math.round(done / p.cards.length * 100) + '% ' + tr('completado') : tr('Sin tarjetas');
        const today = new Date().toISOString().slice(0, 10);
        board.innerHTML = p.cols.map(c => { const cards = p.cards.filter(x => x.col === c.id && (!f || K.norm(x.title + ' ' + x.desc + ' ' + (x.labels || []).join(' ')).includes(f))); return `<section class="a9-col" data-col="${c.id}"><header><b data-rencol="${c.id}" title="${esc(tr('Renombrar'))}">${esc(c.name)}</b><span class="k9-badge">${cards.length}</span><button class="k9-btn" data-delcol="${c.id}" title="${esc(tr('Eliminar columna'))}">✕</button></header><div class="a9-cards" data-drop="${c.id}">${cards.map(x => `<article class="a9-kcard" draggable="true" data-card="${x.id}" tabindex="0"><b>${esc(x.title)}</b>${x.desc ? `<p>${esc(x.desc.slice(0, 120))}</p>` : ''}<div class="k9-row">${x.prio ? `<span class="k9-badge ${PR[x.prio] ? PR[x.prio][0] : ''}">${esc(PR[x.prio] ? PR[x.prio][1] : x.prio)}</span>` : ''}${(x.labels || []).map(l => `<span class="k9-badge">${esc(l)}</span>`).join('')}${x.due ? `<span class="k9-badge ${x.due < today && c.id !== last.id ? 'd' : ''}">📅 ${esc(K.fmt.date(x.due + 'T12:00'))}</span>` : ''}</div><div class="a9-kmove"><button data-mv="-1" data-mc="${x.id}" aria-label="${esc(tr('Mover a la izquierda'))}">‹</button><button data-mv="1" data-mc="${x.id}" aria-label="${esc(tr('Mover a la derecha'))}">›</button></div></article>`).join('')}</div><button class="k9-btn a9-addc" data-addin="${c.id}">${I('plus', 14)} ${esc(tr('Añadir'))}</button></section>`; }).join('');
      }
      async function editCard(card, colId) {
        const p = cur(), isNew = !card;
        const r = await E.form({ title: isNew ? tr('Nueva tarjeta') : tr('Editar tarjeta'), fields: [{ k: 'title', label: tr('Título'), value: card ? card.title : '', req: true }, { k: 'desc', label: tr('Descripción'), type: 'textarea', value: card ? card.desc : '', rows: 4 }, { k: 'prio', label: tr('Prioridad'), type: 'select', options: [['alta', tr('Alta')], ['media', tr('Media')], ['baja', tr('Baja')]], value: card ? card.prio : 'media' }, { k: 'due', label: tr('Fecha límite'), type: 'date', value: card ? card.due : '' }, { k: 'labels', label: tr('Etiquetas (separadas por comas)'), value: card ? (card.labels || []).join(', ') : '' }, { k: 'col', label: tr('Columna'), type: 'select', options: p.cols.map(c => [c.id, c.name]), value: card ? card.col : colId || p.cols[0].id }], ok: isNew ? tr('Crear') : tr('Guardar'), html: isNew ? '' : `<p class="k9-small"><a href="#" data-delcard="${card.id}" style="color:var(--e9-danger)">${esc(tr('Eliminar tarjeta'))}</a></p>` });
        if (!r) return;
        const o = { title: r.title.trim().slice(0, 140), desc: r.desc.slice(0, 4000), prio: r.prio, due: r.due, labels: r.labels.split(',').map(x => x.trim()).filter(Boolean).slice(0, 6), col: r.col };
        if (isNew) p.cards.push(Object.assign({ id: uid(), created: Date.now() }, o)); else Object.assign(card, o);
        save(); draw();
      }
      if (this._del) document.removeEventListener('click', this._del);
      document.addEventListener('click', this._del = async e => { const d = e.target.closest('[data-delcard]'); if (!d) return; e.preventDefault(); const p = cur(); p.cards = p.cards.filter(c => c.id !== d.dataset.delcard); save(); const ov = d.closest('.eis-modal'); if (ov) ov.remove(); draw(); });
      b.addEventListener('click', async e => {
        const t = e.target, p = cur();
        const pp = t.closest('[data-p]'); if (pp) { data.cur = pp.dataset.p; save(); draw(); return; }
        const mv = t.closest('[data-mv]'); if (mv) { e.stopPropagation(); const c = p.cards.find(x => x.id === mv.dataset.mc), i = p.cols.findIndex(x => x.id === c.col), j = Math.max(0, Math.min(p.cols.length - 1, i + +mv.dataset.mv)); c.col = p.cols[j].id; save(); draw(); return; }
        const cd = t.closest('[data-card]'); if (cd) { editCard(p.cards.find(x => x.id === cd.dataset.card)); return; }
        const ai = t.closest('[data-addin]'); if (ai) { editCard(null, ai.dataset.addin); return; }
        const rc = t.closest('[data-rencol]'); if (rc) { const c = p.cols.find(x => x.id === rc.dataset.rencol); const n = await K.ui.prompt(tr('Renombrar columna'), tr('Nombre'), c.name); if (n) { c.name = n.slice(0, 40); save(); draw(); } return; }
        const dc = t.closest('[data-delcol]'); if (dc) { if (p.cols.length <= 1) return; const n = p.cards.filter(x => x.col === dc.dataset.delcol).length; if (n && !await E.confirm(tr('Eliminar columna'), n + ' ' + tr('tarjetas se moverán a la primera columna.'))) return; p.cols = p.cols.filter(x => x.id !== dc.dataset.delcol); p.cards.forEach(x => { if (x.col === dc.dataset.delcol) x.col = p.cols[0].id; }); save(); draw(); return; }
        const a = t.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'card') editCard(null);
        if (a.dataset.a === 'col') { const n = await K.ui.prompt(tr('Nueva columna'), tr('Nombre'), tr('Revisión')); if (n) { p.cols.push({ id: uid(), name: n.slice(0, 40) }); save(); draw(); } }
        if (a.dataset.a === 'newp') { const r = await E.form({ title: tr('Nuevo proyecto'), fields: [{ k: 'n', label: tr('Nombre'), req: true }, { k: 'c', label: tr('Color'), type: 'color', value: '#c93a73' }], ok: tr('Crear') }); if (r && r.n.trim()) { const id = uid(); data.list.push({ id, name: r.n.trim().slice(0, 50), color: r.c, cols: [{ id: 'c1', name: tr('Por hacer') }, { id: 'c2', name: tr('En curso') }, { id: 'c3', name: tr('Hecho') }], cards: [] }); data.cur = id; save(); draw(); } }
        if (a.dataset.a === 'menu') { const r2 = a.getBoundingClientRect(); K.ui.menu(r2.left, r2.bottom + 4, [{ label: 'Renombrar proyecto', icon: 'edit', act: async () => { const n = await K.ui.prompt(tr('Renombrar proyecto'), tr('Nombre'), p.name); if (n) { p.name = n.slice(0, 50); save(); draw(); } } }, { label: 'Exportar JSON', icon: 'download', act: () => E.download(K.files.cleanName(p.name) + '.json', new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })) }, { label: 'Importar JSON', icon: 'upload', act: async () => { const [f] = await K.ui.pickFile('.json'); if (!f) return; try { const o = JSON.parse(await f.text()); if (!o || !Array.isArray(o.cols) || !Array.isArray(o.cards)) throw new Error(); o.id = uid(); o.name = String(o.name || tr('Importado')).slice(0, 50); o.cols = o.cols.slice(0, 20).map(c => ({ id: String(c.id).slice(0, 40), name: String(c.name).slice(0, 40) })); o.cards = o.cards.slice(0, 2000).map(c => ({ id: uid(), col: String(c.col), title: String(c.title || '').slice(0, 140), desc: String(c.desc || '').slice(0, 4000), prio: ['alta', 'media', 'baja'].includes(c.prio) ? c.prio : 'media', due: /^\d{4}-\d\d-\d\d$/.test(c.due || '') ? c.due : '', labels: (c.labels || []).slice(0, 6).map(String) })); data.list.push(o); data.cur = o.id; save(); draw(); } catch { E.toast(tr('El archivo no es un proyecto válido')); } } }, { sep: true }, { label: 'Eliminar proyecto', icon: 'trash', danger: true, act: async () => { if (data.list.length <= 1) return E.toast(tr('Debe quedar al menos un proyecto')); if (await E.confirm(tr('Eliminar proyecto'), p.name + ': ' + tr('se borrarán sus tarjetas.'))) { data.list = data.list.filter(x => x.id !== p.id); data.cur = data.list[0].id; save(); draw(); } } }]); }
      });
      b.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-card]')) editCard(cur().cards.find(x => x.id === e.target.dataset.card)); });
      let drag = null;
      board.addEventListener('dragstart', e => { const c = e.target.closest('[data-card]'); if (c) { drag = c.dataset.card; e.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging'); } });
      board.addEventListener('dragend', e => { const c = e.target.closest('[data-card]'); if (c) c.classList.remove('dragging'); qa(board, '.over').forEach(x => x.classList.remove('over')); });
      board.addEventListener('dragover', e => { const z = e.target.closest('[data-drop]'); if (z && drag) { e.preventDefault(); qa(board, '.over').forEach(x => x !== z && x.classList.remove('over')); z.classList.add('over'); } });
      board.addEventListener('drop', e => { const z = e.target.closest('[data-drop]'); if (!z || !drag) return; e.preventDefault(); const p = cur(), c = p.cards.find(x => x.id === drag); const before = e.target.closest('[data-card]'); c.col = z.dataset.drop; if (before && before.dataset.card !== drag) { p.cards.splice(p.cards.indexOf(c), 1); p.cards.splice(p.cards.findIndex(x => x.id === before.dataset.card), 0, c); } drag = null; save(); draw(); });
      q(b, '[data-f]').addEventListener('input', debounce(draw, 150));
      draw();
    }
  });

  /* ===================== Organizador de apuntes ===================== */
  K.define('notebook', {
    init(b) {
      let data = get('notebook', null);
      if (!data || !Array.isArray(data.books)) { data = { books: [{ id: uid(), name: tr('Matemáticas'), color: '#34a582', sections: [{ id: uid(), name: tr('Unidad 1'), pages: [{ id: uid(), title: tr('Mi primera página'), html: `<h2>${esc(tr('Apuntes'))}</h2><p>${esc(tr('Escribe aquí. Usa la barra para dar formato.'))}</p>`, tags: [], mod: Date.now() }] }] }] }; put('notebook', data); }
      let cb = data.books[0].id, cs = data.books[0].sections[0] && data.books[0].sections[0].id, cp = null;
      const save = debounce(() => put('notebook', data), 500);
      const book = () => data.books.find(x => x.id === cb) || data.books[0], sec = () => (book().sections.find(x => x.id === cs) || book().sections[0]), page = () => sec() && sec().pages.find(x => x.id === cp);
      b.innerHTML = `<div class="k9"><div class="a9-nb"><aside class="k9-side" data-tree></aside><aside class="a9-nb-pages" data-pages></aside><main class="a9-nb-main"><div class="k9-bar" data-tools>${[['bold', 'B'], ['italic', 'I'], ['underline', 'U'], ['strikeThrough', 'S'], ['h2', 'H2'], ['h3', 'H3'], ['insertUnorderedList', '•'], ['insertOrderedList', '1.'], ['hilite', '🖍'], ['link', '🔗'], ['removeFormat', '⌫']].map(([c, l]) => `<button class="k9-btn" data-cmd="${c}">${esc(l)}</button>`).join('')}<span class="sp"></span><input class="input-text" data-search placeholder="${esc(tr('Buscar en apuntes…'))}" style="width:180px"><button class="k9-btn" data-a="export" title="${esc(tr('Exportar HTML'))}">${I('download', 15)}</button></div><input class="a9-nb-title" data-title placeholder="${esc(tr('Título'))}"><input class="input-text a9-nb-tags" data-tags placeholder="${esc(tr('Etiquetas, separadas por comas'))}"><div class="a9-nb-ed md-view" data-ed contenteditable="true" spellcheck="true"></div><div class="k9-status" data-st></div></main></div></div>`;
      const ed = q(b, '[data-ed]');
      function tree() {
        q(b, '[data-tree]').innerHTML = `<h6>${esc(tr('Cuadernos'))}</h6>` + data.books.map(x => `<button class="k9-item${x.id === cb ? ' on' : ''}" data-book="${x.id}"><span class="k9-dot" style="background:${esc(x.color)}"></span>${esc(x.name)}</button>${x.id === cb ? x.sections.map(s => `<button class="k9-item a9-sub${s.id === cs ? ' on' : ''}" data-sec="${s.id}">${I('right', 12)} ${esc(s.name)}</button>`).join('') + `<button class="k9-item a9-sub" data-a="newsec">${I('plus', 12)} ${esc(tr('Sección'))}</button>` : ''}`).join('') + `<button class="k9-item" data-a="newbook">${I('plus', 14)} ${esc(tr('Cuaderno'))}</button>`;
      }
      function pagesList(filter) {
        const list = filter ? data.books.flatMap(bk => bk.sections.flatMap(s => s.pages.filter(p => K.norm(p.title + ' ' + p.html.replace(/<[^>]+>/g, ' ') + ' ' + p.tags.join(' ')).includes(filter)).map(p => ({ p, bk, s })))) : (sec() ? sec().pages.map(p => ({ p, bk: book(), s: sec() })) : []);
        q(b, '[data-pages]').innerHTML = `<div class="k9-row between" style="padding:8px"><b class="k9-small">${esc(filter ? tr('Resultados') : (sec() ? sec().name : ''))}</b>${filter ? '' : `<button class="k9-btn" data-a="newpage" title="${esc(tr('Nueva página'))}">${I('plus', 14)}</button>`}</div>` + list.map(({ p, bk, s }) => `<button class="a9-nb-p${p.id === cp ? ' on' : ''}" data-page="${p.id}" data-pb="${bk.id}" data-ps="${s.id}"><b>${esc(p.title || tr('Sin título'))}</b><small>${esc(filter ? bk.name + ' › ' + s.name : K.fmt.dt(p.mod))}</small></button>`).join('') || `<p class="k9-muted k9-small" style="padding:10px">${esc(tr('Sin páginas'))}</p>`;
      }
      function open(pid) { cp = pid; const p = page(); if (!p) { ed.innerHTML = ''; q(b, '[data-title]').value = ''; q(b, '[data-tags]').value = ''; ed.contentEditable = 'false'; return; } ed.contentEditable = 'true'; ed.innerHTML = K.sanitize(p.html, { style: true, links: 'internal' }); q(b, '[data-title]').value = p.title; q(b, '[data-tags]').value = p.tags.join(', '); status(); pagesList(K.norm(q(b, '[data-search]').value.trim())); }
      const status = () => { const t = ed.innerText || ''; q(b, '[data-st]').textContent = `${(t.match(/\S+/g) || []).length} ${tr('palabras')} · ${tr('Guardado automático')}`; };
      ed.addEventListener('input', () => { const p = page(); if (!p) return; p.html = K.sanitize(ed.innerHTML, { style: true, links: 'internal' }); p.mod = Date.now(); save(); status(); });
      ed.addEventListener('paste', e => { e.preventDefault(); const h = e.clipboardData.getData('text/html'), t = e.clipboardData.getData('text/plain'); document.execCommand('insertHTML', false, h ? K.sanitize(h, { links: 'internal' }) : esc(t).replace(/\n/g, '<br>')); });
      q(b, '[data-title]').addEventListener('input', e => { const p = page(); if (!p) return; p.title = e.target.value.slice(0, 120); p.mod = Date.now(); save(); pagesList(); });
      q(b, '[data-tags]').addEventListener('change', e => { const p = page(); if (!p) return; p.tags = e.target.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 10); save(); });
      q(b, '[data-search]').addEventListener('input', debounce(e => pagesList(K.norm(e.target.value.trim())), 150));
      b.addEventListener('click', async e => {
        const t = e.target;
        const c = t.closest('[data-cmd]'); if (c) { const k = c.dataset.cmd; ed.focus(); if (k === 'h2' || k === 'h3') document.execCommand('formatBlock', false, k); else if (k === 'hilite') document.execCommand('hiliteColor', false, '#fff3a3'); else if (k === 'link') { const u = await K.ui.prompt(tr('Enlace'), 'https://', 'https://'); if (u && /^https?:\/\//i.test(u)) { ed.focus(); document.execCommand('createLink', false, u); } } else document.execCommand(k, false, null); ed.dispatchEvent(new Event('input')); return; }
        const bk = t.closest('[data-book]'); if (bk) { cb = bk.dataset.book; cs = (book().sections[0] || {}).id; open((sec() && sec().pages[0] || {}).id); tree(); pagesList(); return; }
        const sc = t.closest('[data-sec]'); if (sc) { cs = sc.dataset.sec; open((sec().pages[0] || {}).id); tree(); pagesList(); return; }
        const pg = t.closest('[data-page]'); if (pg) { cb = pg.dataset.pb; cs = pg.dataset.ps; tree(); open(pg.dataset.page); return; }
        const a = t.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'newbook') { const r = await E.form({ title: tr('Nuevo cuaderno'), fields: [{ k: 'n', label: tr('Materia o tema'), req: true }, { k: 'c', label: tr('Color'), type: 'color', value: '#c93a73' }], ok: tr('Crear') }); if (r && r.n.trim()) { const s = { id: uid(), name: tr('General'), pages: [] }; data.books.push({ id: uid(), name: r.n.trim().slice(0, 40), color: r.c, sections: [s] }); cb = data.books[data.books.length - 1].id; cs = s.id; save(); tree(); pagesList(); open(null); } }
        if (a.dataset.a === 'newsec') { const n = await K.ui.prompt(tr('Nueva sección'), tr('Nombre'), tr('Unidad') + ' ' + (book().sections.length + 1)); if (n) { const s = { id: uid(), name: n.slice(0, 40), pages: [] }; book().sections.push(s); cs = s.id; save(); tree(); pagesList(); open(null); } }
        if (a.dataset.a === 'newpage') { if (!sec()) return; const p = { id: uid(), title: tr('Nueva página'), html: '', tags: [], mod: Date.now() }; sec().pages.unshift(p); save(); pagesList(); open(p.id); q(b, '[data-title]').select(); }
        if (a.dataset.a === 'export') { const p = page(); if (!p) return; const doc = `<!doctype html><meta charset="utf-8"><title>${esc(p.title)}</title><body style="font:16px/1.6 system-ui;max-width:760px;margin:40px auto;padding:0 20px"><h1>${esc(p.title)}</h1>${K.sanitize(p.html, { style: true })}</body>`; await K.files.save(await K.files.uniqueName('documents', K.files.cleanName(p.title) + '.html'), new Blob([doc], { type: 'text/html' }), 'documents'); E.toast(tr('Exportado a Documentos')); }
      });
      b.addEventListener('contextmenu', e => { const pg = e.target.closest('[data-page]'); if (!pg) return; e.preventDefault(); K.ui.menu(e.clientX, e.clientY, [{ label: 'Eliminar página', icon: 'trash', danger: true, act: async () => { if (!await E.confirm(tr('Eliminar página'), tr('Esta acción no se puede deshacer.'))) return; data.books.forEach(bk => bk.sections.forEach(s => { s.pages = s.pages.filter(p => p.id !== pg.dataset.page); })); save(); open(null); pagesList(); } }]); });
      tree(); pagesList(); open(sec() && sec().pages[0] && sec().pages[0].id);
    }
  });

  /* ===================== Gestor de contraseñas (AES-GCM + PBKDF2) ===================== */
  K.define('passwords', (() => {
    let key = null, items = [], lockT = null, root = null, vault = null;
    const ITER = 310000;
    const b64e = u => btoa(String.fromCharCode(...new Uint8Array(u))), b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const derive = async (pw, salt, iter) => crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const seal = async () => { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(items))); vault.iv = b64e(iv); vault.data = b64e(ct); vault.mod = Date.now(); put('vault', vault); };
    const lock = () => { key = null; items = []; clearTimeout(lockT); if (root) render(); };
    const touch = () => { clearTimeout(lockT); lockT = setTimeout(() => { lock(); E.toast('🔐 ' + tr('Bóveda bloqueada por inactividad')); }, 5 * 60000); };
    const strength = p => { let pool = 0; if (/[a-z]/.test(p)) pool += 26; if (/[A-Z]/.test(p)) pool += 26; if (/\d/.test(p)) pool += 10; if (/[^\w]/.test(p)) pool += 33; const bits = Math.round(p.length * Math.log2(pool || 1)); return { bits, lvl: bits < 40 ? 0 : bits < 60 ? 1 : bits < 80 ? 2 : 3 }; };
    const gen = (n = 20, sym = true) => { const ch = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789' + (sym ? '!@#$%&*?-_=+' : ''); const out = []; const r = new Uint32Array(n * 2); crypto.getRandomValues(r); for (let i = 0; out.length < n; i++) { const v = r[i % r.length]; if (v < Math.floor(4294967296 / ch.length) * ch.length) out.push(ch[v % ch.length]); else crypto.getRandomValues(r); } return out.join(''); };
    const meter = p => { const s = strength(p); return `<div class="k9-meter ${['bad', 'warn', '', ''][s.lvl]}" style="width:160px"><i style="width:${Math.min(100, s.bits)}%"></i></div><small class="k9-muted">${s.bits} bits · ${esc([tr('Débil'), tr('Aceptable'), tr('Fuerte'), tr('Muy fuerte')][s.lvl])}</small>`; };
    let sel = null, filter = '';
    function render() {
      vault = get('vault', null);
      if (!vault) { root.innerHTML = `<div class="k9-state a9-pw-lock">${I('key', 44)}<h3>${esc(tr('Crea tu bóveda de contraseñas'))}</h3><p>${esc(tr('Elige una contraseña maestra. Se usa para cifrar la bóveda en este dispositivo (AES-256-GCM, PBKDF2 con 310 000 iteraciones). Si la olvidas, no se puede recuperar.'))}</p><form data-setup class="k9-col" style="width:min(360px,90%)"><input class="input-text" type="password" name="p1" placeholder="${esc(tr('Contraseña maestra'))}" required minlength="8" autocomplete="new-password"><div data-m></div><input class="input-text" type="password" name="p2" placeholder="${esc(tr('Repítela'))}" required autocomplete="new-password"><button class="k9-btn pri">${esc(tr('Crear bóveda'))}</button></form></div>`; return; }
      if (!key) { root.innerHTML = `<div class="k9-state a9-pw-lock">${I('lock', 44)}<h3>${esc(tr('Bóveda bloqueada'))}</h3><form data-unlock class="k9-row"><input class="input-text" type="password" name="p" placeholder="${esc(tr('Contraseña maestra'))}" required autocomplete="current-password" style="width:240px"><button class="k9-btn pri">${esc(tr('Desbloquear'))}</button></form><p class="k9-small" data-msg></p></div>`; setTimeout(() => { const i = root.querySelector('[name="p"]'); if (i) i.focus(); }, 50); return; }
      const list = items.filter(x => !filter || K.norm(x.site + ' ' + x.user + ' ' + (x.notes || '')).includes(filter)).sort((a, c) => a.site.localeCompare(c.site));
      const it = items.find(x => x.id === sel);
      root.innerHTML = `<div class="k9"><div class="k9-bar"><input class="input-text" data-q placeholder="${esc(tr('Buscar…'))}" value="${esc(filter)}" style="width:200px"><button class="k9-btn pri" data-a="add">${I('plus', 15)} ${esc(tr('Nueva entrada'))}</button><button class="k9-btn" data-a="gen">${I('key', 15)} ${esc(tr('Generador'))}</button><span class="sp"></span><span class="k9-badge g">${I('lock', 11)} AES-256-GCM</span><button class="k9-btn" data-a="more">${I('more', 15)}</button><button class="k9-btn" data-a="lock">${I('lock', 15)} ${esc(tr('Bloquear'))}</button></div>
        <div class="k9-split"><aside class="k9-side">${list.map(x => `<button class="k9-item${x.id === sel ? ' on' : ''}" data-it="${x.id}"><span class="a9-pw-av">${esc((x.site || '?')[0].toUpperCase())}</span><span style="min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis">${esc(x.site)}</b><small class="k9-muted">${esc(x.user)}</small></span></button>`).join('') || `<p class="k9-muted k9-small" style="padding:10px">${esc(tr('Sin entradas'))}</p>`}</aside>
        <main class="k9-main k9-body">${it ? `<div class="k9-card"><h4>${esc(it.site)}</h4>${[['Usuario', it.user, 'user'], ['Contraseña', it.pass, 'pass'], ['Sitio web', it.url || '', 'url']].map(([l, v, f]) => `<div class="s9-set"><div class="s9-lbl"><span>${esc(tr(l))}</span><small class="k9-mono" data-val="${f}">${f === 'pass' ? '••••••••••' : esc(v)}</small></div><div class="s9-ctl">${f === 'pass' ? `<button class="k9-btn" data-show>${I('eye', 14)}</button>` : ''}${v ? `<button class="k9-btn" data-copy="${f}">${I('copy', 14)} ${esc(tr('Copiar'))}</button>` : ''}</div></div>`).join('')}${it.pass ? `<div class="k9-row">${meter(it.pass)}</div>` : ''}${it.notes ? `<p class="k9-small" style="margin-top:8px;white-space:pre-wrap">${esc(it.notes)}</p>` : ''}<p class="k9-small k9-muted" style="margin-top:8px">${esc(tr('Modificada'))}: ${esc(K.fmt.dt(it.mod))}</p><div class="k9-row" style="margin-top:10px"><button class="k9-btn" data-a="edit">${I('edit', 14)} ${esc(tr('Editar'))}</button>${it.url ? `<button class="k9-btn" data-a="openurl">${I('external', 14)} ${esc(tr('Abrir sitio'))}</button>` : ''}<button class="k9-btn dng" data-a="del">${I('trash', 14)} ${esc(tr('Eliminar'))}</button></div></div>` : `<div class="k9-state">${I('shield', 36)}<p>${items.length} ${esc(tr('entradas cifradas. Selecciona una para verla.'))}</p><p class="k9-small">${esc(tr('Contraseñas débiles'))}: ${items.filter(x => strength(x.pass || '').lvl < 1).length} · ${esc(tr('Repetidas'))}: ${items.length - new Set(items.map(x => x.pass)).size}</p></div>`}</main></div></div>`;
    }
    async function editItem(it) {
      const r = await E.form({ title: it ? tr('Editar entrada') : tr('Nueva entrada'), fields: [{ k: 'site', label: tr('Nombre o sitio'), value: it ? it.site : '', req: true }, { k: 'url', label: 'URL', value: it ? it.url : 'https://' }, { k: 'user', label: tr('Usuario o correo'), value: it ? it.user : '' }, { k: 'pass', label: tr('Contraseña (vacío = generar una segura)'), type: 'password', value: it ? it.pass : '' }, { k: 'notes', label: tr('Notas'), type: 'textarea', value: it ? it.notes : '' }], ok: tr('Guardar') });
      if (!r) return;
      const o = { site: r.site.trim().slice(0, 100), url: /^https?:\/\/.+/.test(r.url.trim()) ? r.url.trim().slice(0, 500) : '', user: r.user.slice(0, 200), pass: r.pass || gen(), notes: r.notes.slice(0, 2000), mod: Date.now() };
      if (it) Object.assign(it, o); else { const n = Object.assign({ id: uid() }, o); items.push(n); sel = n.id; }
      await seal(); render();
    }
    return {
      init(b) {
        root = b; render();
        b.addEventListener('input', e => { if (e.target.name === 'p1') { const m = b.querySelector('[data-m]'); if (m) m.innerHTML = meter(e.target.value); } if (e.target.matches('[data-q]')) { filter = K.norm(e.target.value); const pos = e.target.selectionStart; render(); const i = b.querySelector('[data-q]'); i.focus(); i.setSelectionRange(pos, pos); } });
        b.addEventListener('submit', async e => {
          e.preventDefault(); const f = e.target;
          if (f.matches('[data-setup]')) { if (f.p1.value !== f.p2.value) return E.toast(tr('Las contraseñas no coinciden')); if (strength(f.p1.value).bits < 45) return E.toast(tr('Usa una contraseña maestra más larga o variada')); const salt = crypto.getRandomValues(new Uint8Array(16)); vault = { v: 1, iter: ITER, salt: b64e(salt) }; key = await derive(f.p1.value, salt, ITER); items = []; await seal(); K.seclog('vault', 'Bóveda de contraseñas creada'); touch(); render(); }
          if (f.matches('[data-unlock]')) { const msg = b.querySelector('[data-msg]'); msg.textContent = tr('Descifrando…'); try { const k = await derive(f.p.value, b64d(vault.salt), vault.iter || ITER); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(vault.iv) }, k, b64d(vault.data)); key = k; items = JSON.parse(new TextDecoder().decode(pt)); touch(); render(); K.activity('vault', 'passwords', 'Bóveda desbloqueada'); } catch { msg.textContent = tr('Contraseña incorrecta'); K.seclog('vault', 'Intento fallido de desbloquear la bóveda', 'warn'); } }
        });
        b.addEventListener('click', async e => {
          if (key) touch();
          const t = e.target, it = items.find(x => x.id === sel);
          const li = t.closest('[data-it]'); if (li) { sel = li.dataset.it; render(); return; }
          if (t.closest('[data-show]')) { const v = b.querySelector('[data-val="pass"]'); v.textContent = v.textContent.startsWith('•') ? it.pass : '••••••••••'; return; }
          const cp = t.closest('[data-copy]'); if (cp && it) { const v = it[cp.dataset.copy]; await K.ui.copy(v); if (cp.dataset.copy === 'pass') setTimeout(() => { try { navigator.clipboard.writeText(''); } catch { /* sin permiso */ } }, 30000); return; }
          const a = t.closest('[data-a]'); if (!a) return;
          if (a.dataset.a === 'lock') lock();
          if (a.dataset.a === 'add') editItem(null);
          if (a.dataset.a === 'edit' && it) editItem(it);
          if (a.dataset.a === 'openurl' && it) E.ebOpenUrl(it.url, true);
          if (a.dataset.a === 'del' && it && await E.confirm(tr('Eliminar entrada'), it.site)) { items = items.filter(x => x !== it); sel = null; await seal(); render(); }
          if (a.dataset.a === 'gen') { const r = await E.form({ title: tr('Generador de contraseñas'), html: `<p class="k9-mono" style="font-size:16px;word-break:break-all;padding:10px;background:var(--e9-bg-2);border-radius:8px" data-g>${esc(gen(20))}</p>`, fields: [], ok: tr('Copiar'), cancel: tr('Cerrar') }); if (r) { const g = document.querySelector('[data-g]'); K.ui.copy(g ? g.textContent : gen(20)); } }
          if (a.dataset.a === 'more') { const r2 = a.getBoundingClientRect(); K.ui.menu(r2.left - 160, r2.bottom + 4, [{ label: 'Exportar bóveda cifrada', icon: 'download', act: () => E.download('EISENKU_boveda_cifrada.json', new Blob([JSON.stringify(vault)], { type: 'application/json' })) }, { label: 'Importar bóveda cifrada', icon: 'upload', act: async () => { const [f] = await K.ui.pickFile('.json'); if (!f) return; try { const o = JSON.parse(await f.text()); if (!o.salt || !o.iv || !o.data) throw 0; if (!await E.confirm(tr('Importar bóveda'), tr('Reemplazará la bóveda actual. Necesitarás la contraseña maestra de la bóveda importada.'))) return; put('vault', o); lock(); } catch { E.toast(tr('Archivo no válido')); } } }, { label: 'Cambiar contraseña maestra', icon: 'key', act: async () => { const r = await E.form({ title: tr('Cambiar contraseña maestra'), fields: [{ k: 'p', label: tr('Nueva contraseña maestra'), type: 'password' }, { k: 'p2', label: tr('Repítela'), type: 'password' }], ok: tr('Cambiar') }); if (!r || r.p !== r.p2 || strength(r.p).bits < 45) return E.toast(tr('No se cambió: las contraseñas no coinciden o son débiles')); const salt = crypto.getRandomValues(new Uint8Array(16)); vault.salt = b64e(salt); vault.iter = ITER; key = await derive(r.p, salt, ITER); await seal(); K.seclog('vault', 'Contraseña maestra cambiada'); E.toast(tr('Contraseña maestra cambiada')); } }, { sep: true }, { label: 'Borrar bóveda', icon: 'trash', danger: true, act: async () => { if (await E.confirm(tr('Borrar bóveda'), tr('Se eliminarán todas las contraseñas guardadas. No se puede deshacer.'))) { S.del('a9_vault'); lock(); K.seclog('vault', 'Bóveda borrada', 'warn'); } } }]); }
        });
      },
      onClose() { lock(); },
      onOpen() { if (root) render(); }
    };
  })());

  /* ===================== Escáner de documentos ===================== */
  K.define('scanner', (() => {
    let stream = null;
    const stop = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };
    return {
      init(b) {
        const pages = [];
        b.innerHTML = `<div class="k9"><div class="k9-bar"><button class="k9-btn pri" data-a="cam">${I('camera', 15)} ${esc(tr('Usar cámara'))}</button><button class="k9-btn" data-a="file">${I('image', 15)} ${esc(tr('Desde imagen'))}</button><span class="sp"></span><label class="k9-row k9-small">${esc(tr('Filtro'))} <select class="input-text" data-filter><option value="doc">${esc(tr('Documento (alto contraste)'))}</option><option value="gray">${esc(tr('Escala de grises'))}</option><option value="bw">${esc(tr('Blanco y negro'))}</option><option value="none">${esc(tr('Original'))}</option></select></label></div>
          <div class="a9-scan"><div class="a9-scan-cam"><video data-v playsinline muted></video><div class="k9-state" data-ph>${I('scan', 40)}<p>${esc(tr('Pulsa “Usar cámara” o carga una foto del documento.'))}</p></div><button class="a9-shutter" data-a="snap" hidden aria-label="${esc(tr('Capturar'))}"></button></div><aside class="a9-scan-pages" data-pages></aside></div>
          <div class="k9-bar" style="border-top:1px solid var(--e9-line);border-bottom:0"><span class="k9-muted k9-small" data-n></span><span class="sp"></span><button class="k9-btn" data-a="png">${I('image', 15)} ${esc(tr('Guardar imágenes'))}</button><button class="k9-btn pri" data-a="pdf">${I('download', 15)} ${esc(tr('Guardar PDF'))}</button></div></div>`;
        const v = q(b, '[data-v]');
        const filt = (g, w, h) => { const f = q(b, '[data-filter]').value; if (f === 'none') return; const d = g.getImageData(0, 0, w, h), p = d.data; let mn = 255, mx = 0; for (let i = 0; i < p.length; i += 16) { const l = .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2]; mn = Math.min(mn, l); mx = Math.max(mx, l); } const span = Math.max(30, mx - mn); for (let i = 0; i < p.length; i += 4) { let l = .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2]; if (f === 'doc') { l = (l - mn) / span * 255; l = l > 200 ? 255 : l < 40 ? 0 : (l - 40) * 255 / 160; } if (f === 'bw') l = l > (mn + mx) / 2 ? 255 : 0; p[i] = p[i + 1] = p[i + 2] = Math.max(0, Math.min(255, l)); } g.putImageData(d, 0, 0); };
        const draw = () => { q(b, '[data-pages]').innerHTML = pages.map((p, i) => `<div class="a9-scan-th"><img src="${p.url}" alt=""><span>${i + 1}</span><button class="k9-btn dng" data-del="${i}">✕</button></div>`).join('') || `<p class="k9-muted k9-small" style="padding:10px">${esc(tr('Las páginas escaneadas aparecerán aquí.'))}</p>`; q(b, '[data-n]').textContent = pages.length + ' ' + tr('páginas'); };
        const addFromSrc = async src => { const j = await imgToJpeg(src, 2000, filt); pages.push({ jpeg: j.jpeg, w: j.w, h: j.h, url: j.canvas.toDataURL('image/jpeg', .7) }); draw(); };
        b.addEventListener('click', async e => {
          const d = e.target.closest('[data-del]'); if (d) { pages.splice(+d.dataset.del, 1); draw(); return; }
          const a = e.target.closest('[data-a]'); if (!a) return;
          if (a.dataset.a === 'cam') { try { stop(); stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } }); v.srcObject = stream; await v.play(); q(b, '[data-ph]').hidden = true; q(b, '[data-a="snap"]').hidden = false; } catch (er) { K.ui.alert(tr('Cámara no disponible'), (er && er.name === 'NotAllowedError' ? tr('Permiso denegado. Revisa el permiso de cámara del navegador o de EISENKU.') : tr('Este dispositivo o navegador no permite usar la cámara aquí.')) + '\n' + tr('Puedes cargar una foto con “Desde imagen”.')); } }
          if (a.dataset.a === 'snap' && stream) { const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0); await addFromSrc(c.toDataURL('image/jpeg', .95)); K.sound('ok'); }
          if (a.dataset.a === 'file') { const fs = await K.ui.pickFile('image/*', true); for (const f of fs) { const u = URL.createObjectURL(f); await addFromSrc(u); URL.revokeObjectURL(u); } }
          if (a.dataset.a === 'pdf') { if (!pages.length) return E.toast(tr('Escanea al menos una página')); const doc = new K.pdf.Doc({ size: 'a4', margin: 0, title: tr('Documento escaneado') }); pages.forEach(p => doc.addImage(p.jpeg, p.w, p.h)); const pdf = doc.build(), name = 'Escaneo_' + new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-') + '.pdf'; await K.files.save(name, pdf, 'documents'); E.toast(tr('PDF guardado en Documentos') + ': ' + name); }
          if (a.dataset.a === 'png') { if (!pages.length) return; await K.files.mkdir('images/Escaneos'); for (let i = 0; i < pages.length; i++) await K.files.save('Escaneo_' + Date.now() + '_' + (i + 1) + '.jpg', new Blob([pages[i].jpeg], { type: 'image/jpeg' }), 'images/Escaneos'); E.toast(tr('Imágenes guardadas en Imágenes › Escaneos')); }
        });
        draw();
      },
      onClose: stop, destroy: stop
    };
  })());
})();

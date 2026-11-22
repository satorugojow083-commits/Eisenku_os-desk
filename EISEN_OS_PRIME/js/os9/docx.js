/* =====================================================================
   EISENKU OS 9.0 ENTERPRISE · Conversión Word (.docx) ⇄ HTML para EISEN Writer
   - fromHtml(html, {title, lang}) → Blob .docx (Office Open XML): párrafos, títulos,
     cita, código, negrita/cursiva/subrayado/tachado, sub/superíndice, colores,
     resaltado, tamaño y fuente, alineación, listas con viñetas y numeradas (anidadas),
     tablas, enlaces e imágenes PNG/JPEG/GIF incrustadas.
   - toHtml(blob) → HTML básico (párrafos, títulos, listas, tablas, formato, enlaces,
     imágenes). Lo que no se reconoce (cuadros de texto, comentarios, notas al pie,
     control de cambios) se omite o se muestra como texto plano.
   Se carga bajo demanda. Sin dependencias: usa K.zip / K.unzip.
   ===================================================================== */
(() => {
  'use strict';
  const K = window.EISENKU; if (!K) return;
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const xe = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const enc = new TextEncoder();
  const BLOCK = /^(p|div|section|article|header|footer|main|aside|nav|figure|figcaption|center|address|h[1-6]|blockquote|pre|ul|ol|li|table|hr|dl|dt|dd|details|summary)$/;

  /* ---------- colores y tamaños CSS → OOXML ---------- */
  const cctx = (() => { try { return document.createElement('canvas').getContext('2d'); } catch { return null; } })();
  function hex(c0) {
    let c = String(c0 || '').trim(); if (!c || /^(transparent|inherit|initial|currentcolor)$/i.test(c)) return null;
    if (cctx) { cctx.fillStyle = '#010203'; cctx.fillStyle = c; const n = cctx.fillStyle; if (n === '#010203' && !/^#?010203$/i.test(c)) return null; c = n; }
    let m = /^#([0-9a-f]{6})$/i.exec(c); if (m) return m[1].toUpperCase();
    m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c); if (m) return (m[1] + m[1] + m[2] + m[2] + m[3] + m[3]).toUpperCase();
    m = /^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?/i.exec(c); if (m) { if (m[4] !== undefined && +m[4] === 0) return null; return [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('').toUpperCase(); }
    return null;
  }
  const KW = { 'xx-small': 7, 'x-small': 7.5, small: 10, medium: 12, large: 13.5, 'x-large': 18, 'xx-large': 24, 'xxx-large': 36 };
  const FONT_SIZE = [0, 8, 10, 12, 14, 18, 24, 36];
  function halfPts(v) {
    v = String(v || '').trim().toLowerCase(); if (KW[v]) return Math.round(KW[v] * 2);
    const m = /^([\d.]+)(px|pt|em|rem|%)?$/.exec(v); if (!m) return null; let n = +m[1];
    if (m[2] === 'px' || !m[2]) n *= 0.75; else if (m[2] === 'em' || m[2] === 'rem') n *= 11; else if (m[2] === '%') n = n / 100 * 11;
    return n > 1 && n < 400 ? Math.round(n * 2) : null;
  }
  const styleOf = el => { const o = {}; String(el.getAttribute && el.getAttribute('style') || '').split(';').forEach(x => { const i = x.indexOf(':'); if (i > 0) o[x.slice(0, i).trim().toLowerCase()] = x.slice(i + 1).trim(); }); return o; };
  const alignOf = el => { const a = (styleOf(el)['text-align'] || el.getAttribute('align') || '').toLowerCase(); return { left: 'left', start: 'left', center: 'center', right: 'right', end: 'right', justify: 'both' }[a] || (el.tagName === 'CENTER' ? 'center' : null); };

  /* ---------- imágenes: data: → bytes (las https externas no se descargan) ---------- */
  async function prepImages(root, st) {
    for (const img of root.querySelectorAll('img')) {
      const src = img.getAttribute('src') || ''; const m = /^data:image\/(png|jpe?g|gif|webp|bmp);base64,(.+)$/i.exec(src);
      if (!m) continue;
      try {
        let type = m[1].toLowerCase().replace('jpg', 'jpeg'), bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
        const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/' + type }));
        let w = img.getAttribute('width') ? +img.getAttribute('width') : bmp.width, h = img.getAttribute('height') ? +img.getAttribute('height') : bmp.height;
        if (!(w > 0 && h > 0)) { w = bmp.width; h = bmp.height; }
        if (type === 'webp' || type === 'bmp') { const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0); bytes = new Uint8Array(await (await new Promise(r => c.toBlob(r, 'image/png'))).arrayBuffer()); type = 'png'; }
        bmp.close && bmp.close();
        const max = 600; if (w > max) { h = Math.round(h * max / w); w = max; }
        const n = st.media.length + 1, rid = 'rIdImg' + n, name = `image${n}.${type}`;
        st.media.push({ name, bytes }); st.rels.push(`<Relationship Id="${rid}" Type="${R}/image" Target="media/${name}"/>`);
        img.__docx = { rid, w, h, n, name };
      } catch { /* imagen no válida: se omite */ }
    }
  }
  const drawing = (d, alt) => { const cx = Math.round(d.w * 9525), cy = Math.round(d.h * 9525); return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${d.n}" name="${xe(d.name)}" descr="${xe(alt || '')}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${d.n}" name="${xe(d.name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${d.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`; };

  /* ---------- HTML → WordprocessingML ---------- */
  function run(text, f) {
    if (!text) return '';
    let pr = '';
    if (f.link) pr += '<w:rStyle w:val="Hyperlink"/>';
    const font = f.code ? 'Consolas' : f.font; if (font) pr += `<w:rFonts w:ascii="${xe(font)}" w:hAnsi="${xe(font)}" w:cs="${xe(font)}"/>`;
    if (f.b) pr += '<w:b/>'; if (f.i) pr += '<w:i/>'; if (f.s) pr += '<w:strike/>';
    if (f.color) pr += `<w:color w:val="${f.color}"/>`;
    if (f.sz) pr += `<w:sz w:val="${f.sz}"/><w:szCs w:val="${f.sz}"/>`;
    if (f.u) pr += '<w:u w:val="single"/>';
    if (f.shd) pr += `<w:shd w:val="clear" w:color="auto" w:fill="${f.shd}"/>`;
    if (f.sup) pr += '<w:vertAlign w:val="superscript"/>'; else if (f.sub) pr += '<w:vertAlign w:val="subscript"/>';
    return `<w:r>${pr ? '<w:rPr>' + pr + '</w:rPr>' : ''}<w:t xml:space="preserve">${xe(text)}</w:t></w:r>`;
  }
  function fmt(el, f) {
    const g = Object.assign({}, f), t = el.tagName.toLowerCase(), s = styleOf(el);
    if (/^(b|strong|th)$/.test(t)) g.b = 1; if (/^(i|em|cite|dfn|var)$/.test(t)) g.i = 1; if (/^(u|ins)$/.test(t)) g.u = 1; if (/^(s|strike|del)$/.test(t)) g.s = 1;
    if (t === 'sup') g.sup = 1; if (t === 'sub') g.sub = 1; if (/^(code|kbd|samp|tt)$/.test(t)) g.code = 1; if (t === 'mark') g.shd = 'FFF59D';
    if (t === 'font') { const c = hex(el.getAttribute('color')); if (c) g.color = c; const z = +el.getAttribute('size'); if (z >= 1 && z <= 7) g.sz = FONT_SIZE[z] * 2; if (el.getAttribute('face')) g.font = el.getAttribute('face').split(',')[0].replace(/["']/g, '').trim(); }
    if (s.color) { const c = hex(s.color); if (c) g.color = c; }
    const bg = s['background-color'] || s.background; if (bg) { const c = hex(bg); if (c && c !== 'FFFFFF') g.shd = c; }
    if (s['font-weight'] && (/bold/.test(s['font-weight']) || +s['font-weight'] >= 600)) g.b = 1; else if (s['font-weight'] && (/normal/.test(s['font-weight']) || +s['font-weight'] < 600)) g.b = 0;
    if (/italic|oblique/.test(s['font-style'] || '')) g.i = 1;
    const td = (s['text-decoration'] || '') + ' ' + (s['text-decoration-line'] || ''); if (/underline/.test(td)) g.u = 1; if (/line-through/.test(td)) g.s = 1;
    if (s['font-size']) { const z = halfPts(s['font-size']); if (z) g.sz = z; }
    if (s['font-family']) g.font = s['font-family'].split(',')[0].replace(/["']/g, '').trim();
    if (s['vertical-align'] === 'super') g.sup = 1; else if (s['vertical-align'] === 'sub') g.sub = 1;
    return g;
  }
  function inline(node, f, st, pre) {
    let x = '';
    for (const c of node.childNodes) {
      if (c.nodeType === 3) {
        if (pre) { c.data.split('\n').forEach((ln, i) => { if (i) x += '<w:r><w:br/></w:r>'; x += run(ln, f); }); }
        else x += run(c.data.replace(/[\s ]+/g, m => / /.test(m) ? m.replace(/[^ ]/g, '') || ' ' : ' '), f);
        continue;
      }
      if (c.nodeType !== 1) continue;
      const t = c.tagName.toLowerCase();
      if (/^(script|style|template|noscript)$/.test(t)) continue;
      if (t === 'br') { x += '<w:r><w:br/></w:r>'; continue; }
      if (t === 'img') { x += c.__docx ? drawing(c.__docx, c.getAttribute('alt')) : run(c.getAttribute('alt') ? '[' + c.getAttribute('alt') + ']' : '', f); continue; }
      const g = fmt(c, f);
      if (t === 'a') {
        const href = (c.getAttribute('href') || '').trim();
        if (/^(https?:|mailto:)/i.test(href) && !f.link) { const rid = 'rIdL' + (st.links++); st.rels.push(`<Relationship Id="${rid}" Type="${R}/hyperlink" Target="${xe(href)}" TargetMode="External"/>`); x += `<w:hyperlink r:id="${rid}" w:history="1">${inline(c, Object.assign(g, { link: 1 }), st, pre)}</w:hyperlink>`; continue; }
      }
      if (BLOCK.test(t) && t !== 'li') { const inner = inline(c, g, st, pre || t === 'pre'); if (inner) x += (x ? '<w:r><w:br/></w:r>' : '') + inner; continue; }
      x += inline(c, g, st, pre || t === 'pre');
    }
    return x;
  }
  function para(runs, o = {}) {
    if (!o.pre) runs = runs.replace(/^((?:(?!<w:t[ >]).)*?<w:t xml:space="preserve">) +/s, '$1').replace(/ +(<\/w:t><\/w:r>)(?!.*<w:t[ >])/s, '$1');   // recorta los espacios del principio y del final del párrafo
    let pPr = '';
    if (o.style) pPr += `<w:pStyle w:val="${o.style}"/>`;
    if (o.num) pPr += `<w:numPr><w:ilvl w:val="${o.num.lvl}"/><w:numId w:val="${o.num.id}"/></w:numPr>`;
    if (o.hr) pPr += '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="9CA3AF"/></w:pBdr>';
    if (o.rtl) pPr += '<w:bidi/>';
    if (o.ind) pPr += `<w:ind w:left="${o.ind}"/>`;
    if (o.jc) pPr += `<w:jc w:val="${o.jc}"/>`;
    return `<w:p>${pPr ? '<w:pPr>' + pPr + '</w:pPr>' : ''}${runs}</w:p>`;
  }
  const hasBlock = el => [...el.children].some(c => BLOCK.test(c.tagName.toLowerCase()));
  function blocks(el, ctx, st) {
    let out = '', buf = '';
    const flush = () => { if (buf.replace(/<[^>]+>/g, '').trim() || /<w:drawing>/.test(buf)) out += para(buf, ctx); buf = ''; };
    for (const c of el.childNodes) {
      if (c.nodeType === 3) { buf += inline({ childNodes: [c] }, ctx.f || {}, st, ctx.pre); continue; }
      if (c.nodeType !== 1) continue;
      const t = c.tagName.toLowerCase();
      if (/^(script|style|template|noscript)$/.test(t)) continue;
      if (!BLOCK.test(t)) { if (t === 'br' && !buf) { out += para('', ctx); continue; } buf += inline({ childNodes: [c] }, ctx.f || {}, st, ctx.pre); continue; }
      flush();
      const jc = alignOf(c) || ctx.jc, rtl = (c.getAttribute('dir') || '').toLowerCase() === 'rtl' || ctx.rtl;
      const base = Object.assign({}, ctx, { jc, rtl, f: fmt(c, ctx.f || {}) });
      if (/^h[1-6]$/.test(t)) out += para(inline(c, base.f, st), Object.assign({}, base, { style: 'Heading' + t[1], num: null }));
      else if (t === 'blockquote') out += blocks(c, Object.assign(base, { style: 'Quote' }), st);
      else if (t === 'pre') out += para(inline(c, base.f, st, true), Object.assign({}, base, { style: 'Code', pre: 1 }));
      else if (t === 'hr') out += para('', { hr: 1 });
      else if (t === 'ul' || t === 'ol') {
        const lvl = ctx.lvl == null ? 0 : Math.min(8, ctx.lvl + 1);
        let id = 1; if (t === 'ol') { id = st.nums.length + 2; st.nums.push({ s: +c.getAttribute('start') || 1, l: lvl }); }
        for (const li of c.children) {
          if (li.tagName.toLowerCase() !== 'li') { out += blocks({ childNodes: [li] }, base, st); continue; }
          const nested = [...li.children].filter(x => /^(ul|ol)$/i.test(x.tagName));
          const clone = li.cloneNode(true); clone.querySelectorAll(':scope > ul, :scope > ol').forEach(x => x.remove());
          // conserva las referencias de imagen del original en el clon
          const oi = [...li.querySelectorAll('img')], ci = [...clone.querySelectorAll('img')]; ci.forEach(im => { const o = oi.find(x => x.getAttribute('src') === im.getAttribute('src')); if (o) im.__docx = o.__docx; });
          out += para(inline(clone, fmt(li, base.f), st), Object.assign({}, base, { style: null, num: { id, lvl } }));
          nested.forEach(n => { out += blocks({ childNodes: [n] }, Object.assign({}, base, { lvl }), st); });
        }
      } else if (t === 'table') out += table(c, base, st);
      else if (t === 'li') out += para(inline(c, base.f, st), Object.assign({}, base, { num: { id: 1, lvl: ctx.lvl || 0 } }));
      else if (hasBlock(c)) out += blocks(c, base, st);
      else { const r = inline(c, base.f, st, false); out += para(r, base); }
    }
    flush();
    return out;
  }
  function table(tb, ctx, st) {
    const rows = [...tb.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr')];
    if (!rows.length) return '';
    const cols = Math.max(1, ...rows.map(r => [...r.children].reduce((n, c) => n + (+c.getAttribute('colspan') || 1), 0)));
    const gw = Math.floor(9026 / cols);
    let x = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>${('<w:gridCol w:w="' + gw + '"/>').repeat(cols)}</w:tblGrid>`;
    rows.forEach(r => {
      const head = r.parentElement && r.parentElement.tagName === 'THEAD';
      x += `<w:tr>${head ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}`;
      let used = 0;
      [...r.children].forEach(c => {
        const span = Math.min(cols - used, Math.max(1, +c.getAttribute('colspan') || 1)); if (span <= 0) return; used += span;
        const bg = hex(styleOf(c)['background-color'] || '') || (c.tagName === 'TH' ? 'F3F4F6' : null);
        const inner = blocks(c, { f: c.tagName === 'TH' ? { b: 1 } : {}, jc: alignOf(c) }, st) || '<w:p/>';
        x += `<w:tc><w:tcPr><w:tcW w:w="${gw * span}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${bg ? `<w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>` : ''}</w:tcPr>${inner}</w:tc>`;
      });
      for (; used < cols; used++) x += `<w:tc><w:tcPr><w:tcW w:w="${gw}" w:type="dxa"/></w:tcPr><w:p/></w:tc>`;
      x += '</w:tr>';
    });
    return x + '</w:tbl>';
  }

  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="%LANG%"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
${[[1, 36], [2, 30], [3, 26], [4, 24], [5, 22], [6, 22]].map(([n, sz]) => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="${n < 3 ? 360 : 240}" w:after="120"/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:color w:val="${n === 1 ? '111827' : '1F2937'}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:style>`).join('')}
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="29"/><w:qFormat/><w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="D6336C"/></w:pBdr><w:ind w:left="567"/></w:pPr><w:rPr><w:i/><w:color w:val="4B5563"/></w:rPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:uiPriority w:val="39"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="9CA3AF"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;
  const lvls = (fmts) => fmts.map((f, i) => `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${f[0]}"/><w:lvlText w:val="${f[1]}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (i + 1)}" w:hanging="360"/></w:pPr></w:lvl>`).join('');
  const BUL = ['•', '◦', '▪'], ORD = [['decimal', '%1.'], ['lowerLetter', '%2.'], ['lowerRoman', '%3.']];
  const numbering = st => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="${W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${lvls([...Array(9)].map((_, i) => ['bullet', BUL[i % 3]]))}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${lvls([...Array(9)].map((_, i) => [ORD[i % 3][0], '%' + (i + 1) + '.']))}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>${st.nums.map((n, i) => `<w:num w:numId="${i + 2}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="${n.l}"><w:startOverride w:val="${n.s}"/></w:lvlOverride></w:num>`).join('')}</w:numbering>`;

  async function fromHtml(html, o = {}) {
    const doc = new DOMParser().parseFromString('<!doctype html><body>' + String(html || ''), 'text/html');
    const st = { rels: [], media: [], nums: [], links: 1 };
    await prepImages(doc.body, st);
    let body = blocks(doc.body, { f: {}, rtl: o.lang === 'ar' }, st);
    body += '<w:p/>';
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z'), lang = { es: 'es-ES', en: 'en-US', pt: 'pt-PT', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', ca: 'ca-ES', nl: 'nl-NL', pl: 'pl-PL', sv: 'sv-SE', tr: 'tr-TR', ru: 'ru-RU', uk: 'uk-UA', ar: 'ar-SA', hi: 'hi-IN', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', 'zh-TW': 'zh-TW', id: 'id-ID' }[o.lang] || 'es-ES';
    const files = [
      ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`],
      ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${R}/extended-properties" Target="docProps/app.xml"/></Relationships>`],
      ['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xe(o.title || 'Documento')}</dc:title><dc:creator>EISENKU OS</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`],
      ['docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>EISEN Writer 9.0</Application></Properties>`],
      ['word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${R}/numbering" Target="numbering.xml"/>${st.rels.join('')}</Relationships>`],
      ['word/styles.xml', STYLES.replace('%LANG%', lang)],
      ['word/numbering.xml', numbering(st)],
      ['word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="${A}" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`]
    ];
    const entries = files.map(([name, text]) => ({ name, data: enc.encode(text) })).concat(st.media.map(m => ({ name: 'word/media/' + m.name, data: m.bytes })));
    const zip = await K.zip(entries);
    return new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  /* ---------- .docx → HTML ---------- */
  const isW = (el, n) => el && el.namespaceURI === W && el.localName === n;
  const kids = (el, n) => el ? [...el.children].filter(c => isW(c, n)) : [];
  const kid = (el, n) => kids(el, n)[0] || null;
  const val = (el, def = null) => el ? (el.getAttribute('w:val') ?? def) : def;
  const on = el => !!el && !/^(0|false|off|none)$/i.test(val(el, 'true'));
  const he = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HL = { yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff', blue: '#0000ff', red: '#ff0000', darkBlue: '#000080', darkCyan: '#008080', darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000', darkYellow: '#808000', darkGray: '#808080', lightGray: '#c0c0c0', black: '#000000' };

  async function toHtml(blob) {
    const files = await K.unzip(blob, 150 * 1024 * 1024), dec = new TextDecoder();
    const get = n => files.find(f => f.name.replace(/^\/+/, '').toLowerCase() === n.toLowerCase());
    const xml = n => { const f = get(n); return f ? new DOMParser().parseFromString(dec.decode(f.data), 'application/xml') : null; };
    const doc = xml('word/document.xml'); if (!doc || !doc.documentElement || doc.getElementsByTagName('parsererror').length) throw new Error('No es un documento de Word (.docx) válido');
    const rels = {}; const rx = xml('word/_rels/document.xml.rels');
    if (rx) [...rx.getElementsByTagName('Relationship')].forEach(r => { rels[r.getAttribute('Id')] = { target: r.getAttribute('Target') || '', ext: r.getAttribute('TargetMode') === 'External', type: r.getAttribute('Type') || '' }; });
    const styles = {}; const sx = xml('word/styles.xml');
    if (sx) [...sx.getElementsByTagNameNS(W, 'style')].forEach(s => { const n = kid(s, 'name'); styles[s.getAttribute('w:styleId')] = (val(n, '') || '').toLowerCase(); });
    const numFmt = {}; const nx = xml('word/numbering.xml');
    if (nx) {
      const abs = {}; [...nx.getElementsByTagNameNS(W, 'abstractNum')].forEach(a => { abs[a.getAttribute('w:abstractNumId')] = Object.fromEntries(kids(a, 'lvl').map(l => [l.getAttribute('w:ilvl'), val(kid(l, 'numFmt'), 'decimal')])); });
      [...nx.getElementsByTagNameNS(W, 'num')].forEach(n => { numFmt[n.getAttribute('w:numId')] = abs[val(kid(n, 'abstractNumId'))] || {}; });
    }
    const imgCache = {};
    const imgSrc = rid => {
      if (imgCache[rid] !== undefined) return imgCache[rid];
      const r = rels[rid]; let src = null;
      if (r && !r.ext) { const p = ('word/' + r.target).replace(/\/[^/]+\/\.\.\//g, '/').replace(/^word\/\//, 'word/'); const f = get(p) || get(r.target.replace(/^\//, '')); const e = (p.split('.').pop() || '').toLowerCase().replace('jpg', 'jpeg'); if (f && /^(png|jpeg|gif|webp)$/.test(e) && f.data.length < 8 * 1024 * 1024) { let s = ''; for (let i = 0; i < f.data.length; i += 0x8000) s += String.fromCharCode.apply(null, f.data.subarray(i, i + 0x8000)); src = `data:image/${e};base64,${btoa(s)}`; } }
      return (imgCache[rid] = src);
    };
    const runHtml = r => {
      const pr = kid(r, 'rPr'); let open = '', close = '', css = [];
      if (pr) {
        if (on(kid(pr, 'b'))) { open += '<b>'; close = '</b>' + close; }
        if (on(kid(pr, 'i'))) { open += '<i>'; close = '</i>' + close; }
        const u = kid(pr, 'u'); if (u && val(u, 'single') !== 'none') { open += '<u>'; close = '</u>' + close; }
        if (on(kid(pr, 'strike')) || on(kid(pr, 'dstrike'))) { open += '<s>'; close = '</s>' + close; }
        const va = val(kid(pr, 'vertAlign')); if (va === 'superscript') { open += '<sup>'; close = '</sup>' + close; } else if (va === 'subscript') { open += '<sub>'; close = '</sub>' + close; }
        const c = val(kid(pr, 'color')); if (c && /^[0-9a-f]{6}$/i.test(c)) css.push('color:#' + c);
        const h = val(kid(pr, 'highlight')); const sh = kid(pr, 'shd'); const fill = sh && sh.getAttribute('w:fill');
        if (h && HL[h]) css.push('background-color:' + HL[h]); else if (fill && /^[0-9a-f]{6}$/i.test(fill)) css.push('background-color:#' + fill);
        const sz = +val(kid(pr, 'sz'), 0); if (sz && sz !== 22) css.push('font-size:' + (sz / 2) + 'pt');
        const rf = kid(pr, 'rFonts'); const fn = rf && (rf.getAttribute('w:ascii') || rf.getAttribute('w:hAnsi')); if (fn && !/^(calibri|aptos)/i.test(fn)) css.push(`font-family:${fn.replace(/[^\w\s-]/g, '')}`);
      }
      let body = '';
      for (const c of r.children) {
        if (isW(c, 't')) body += he(c.textContent);
        else if (isW(c, 'tab')) body += '&emsp;';
        else if (isW(c, 'br')) body += c.getAttribute('w:type') === 'page' ? '<br>' : '<br>';
        else if (isW(c, 'noBreakHyphen')) body += '-';
        else if (isW(c, 'drawing')) {
          const blip = c.getElementsByTagNameNS(A, 'blip')[0], ext = c.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'extent')[0];
          const src = blip && imgSrc(blip.getAttribute('r:embed'));
          if (src) { const w = ext ? Math.round(+ext.getAttribute('cx') / 9525) : 0, hh = ext ? Math.round(+ext.getAttribute('cy') / 9525) : 0; body += `<img src="${src}" alt=""${w ? ` width="${w}" height="${hh}"` : ''}>`; }
        }
      }
      if (!body) return '';
      return (css.length ? `<span style="${css.join(';')}">` : '') + open + body + close + (css.length ? '</span>' : '');
    };
    const inlineOf = p => {
      let x = '';
      for (const c of p.children) {
        if (isW(c, 'r')) x += runHtml(c);
        else if (isW(c, 'hyperlink')) { const r = rels[c.getAttribute('r:id')]; const href = r && r.ext ? r.target : (c.getAttribute('w:anchor') ? '#' + c.getAttribute('w:anchor') : ''); const inner = inlineOf(c); x += /^(https?:|mailto:)/i.test(href) ? `<a href="${he(href)}">${inner}</a>` : inner; }
        else if (isW(c, 'ins') || isW(c, 'smartTag') || isW(c, 'fldSimple') || isW(c, 'customXml')) x += inlineOf(c);
        else if (isW(c, 'sdt')) x += inlineOf(kid(c, 'sdtContent') || c);
      }
      return x;
    };
    let html = ''; const lists = [];
    const closeLists = (n = 0) => { while (lists.length > n) html += '</li></' + lists.pop().tag + '>'; };
    const paragraph = p => {
      const pr = kid(p, 'pPr'), sid = val(kid(pr, 'pStyle'), ''), sname = styles[sid] || sid.toLowerCase();
      const content = inlineOf(p);
      const jc = val(kid(pr, 'jc')); const align = { center: 'center', right: 'right', end: 'right', both: 'justify', distribute: 'justify' }[jc];
      const st = align ? ` style="text-align:${align}"` : '';
      const np = kid(pr, 'numPr'), numId = np && val(kid(np, 'numId')), lvl = np ? +val(kid(np, 'ilvl'), 0) : 0;
      if (numId && numId !== '0') {
        const tag = ((numFmt[numId] || {})[String(lvl)] || 'bullet') === 'bullet' ? 'ul' : 'ol';
        if (lists.length > lvl + 1) closeLists(lvl + 1);
        if (lists.length === lvl + 1 && (lists[lvl].tag !== tag || lists[lvl].id !== numId) && lvl === 0) closeLists(0);
        if (lists.length === lvl + 1) html += '</li>';
        while (lists.length < lvl + 1) { html += `<${tag}>`; lists.push({ tag, id: numId }); }
        html += `<li${st}>${content || '<br>'}`;
        return;
      }
      closeLists(0);
      let m, tag = 'p';
      if ((m = /^heading\s*(\d)/.exec(sname))) tag = 'h' + Math.min(6, +m[1]); else if (sname === 'title') tag = 'h1'; else if (sname === 'subtitle') tag = 'h2'; else if (/quote|cita/.test(sname)) tag = 'blockquote'; else if (/^(code|html preformatted|código)/.test(sname)) tag = 'pre';
      html += `<${tag}${st}>${content || (tag === 'p' ? '<br>' : '')}</${tag}>`;
    };
    const tableHtml = tb => {
      let x = '<table>';
      kids(tb, 'tr').forEach(tr => {
        x += '<tr>';
        kids(tr, 'tc').forEach(tc => {
          const pr = kid(tc, 'tcPr'), span = +val(kid(pr, 'gridSpan'), 1), vm = kid(pr, 'vMerge'), sh = kid(pr, 'shd'), fill = sh && sh.getAttribute('w:fill');
          if (vm && val(vm, 'continue') === 'continue') { x += '<td></td>'; return; }
          const saved = html; html = ''; walk(tc); closeLists(0); const inner = html; html = saved;
          x += `<td${span > 1 ? ` colspan="${span}"` : ''}${fill && /^[0-9a-f]{6}$/i.test(fill) && !/^(auto|FFFFFF)$/i.test(fill) ? ` style="background-color:#${fill}"` : ''}>${inner}</td>`;
        });
        x += '</tr>';
      });
      return x + '</table>';
    };
    const walk = el => {
      for (const c of el.children) {
        if (isW(c, 'p')) paragraph(c);
        else if (isW(c, 'tbl')) { closeLists(0); html += tableHtml(c); }
        else if (isW(c, 'sdt')) walk(kid(c, 'sdtContent') || c);
        else if (isW(c, 'customXml')) walk(c);
      }
    };
    walk(kid(doc.documentElement, 'body') || doc.documentElement);
    closeLists(0);
    return html;
  }

  K.docx = { fromHtml, toHtml };
})();

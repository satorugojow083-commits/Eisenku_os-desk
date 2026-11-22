/* =====================================================================
   EISENKU OS 10.0 · Oficina y estudio (carga diferida)
   Motor de citas (APA 7, MLA 9, Chicago autor-fecha, IEEE, Harvard, Vancouver; español e inglés),
   integración con EISEN Writer (citas, bibliografía, índice, ecuaciones), Organizador de documentos
   académicos, Gestor de referencias (BibTeX, RIS, CSL-JSON, DOI, ISBN, duplicados), Generador de
   bibliografía, Pizarra interactiva e Ideas rápidas.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, U = K.u10, F = K.files;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)];
  const badge = (txt, cls = '') => `<span class="k9-badge ${cls}">${esc(tr(txt))}</span>`;
  const shell = (tabs, cur) => `<div class="k9">${U.tabs(tabs, cur)}<div class="k9-body" data-v></div></div>`;
  const tabber = (b, draw) => b.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (!t || !b.contains(t)) return; qa(b, '[data-tab]').forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t); }); draw(t.dataset.tab); });
  const card = (icon, title, body) => `<div class="k9-card"><h4>${I(icon, 16)} ${esc(tr(title))}</h4>${body}</div>`;
  const csvCell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const strip = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent; };

  /* ===================== Motor de citas ===================== */
  const REF_TYPES = [['article', 'Artículo de revista'], ['book', 'Libro'], ['chapter', 'Capítulo de libro'], ['web', 'Página web'], ['thesis', 'Tesis'], ['report', 'Informe'], ['conference', 'Ponencia o actas'], ['video', 'Vídeo'], ['other', 'Otro']];
  const STYLES = [['apa', 'APA 7'], ['mla', 'MLA 9'], ['chicago', 'Chicago (autor-fecha)'], ['ieee', 'IEEE'], ['harvard', 'Harvard'], ['vancouver', 'Vancouver']];
  const NUMERIC = { ieee: 1, vancouver: 1 };
  const MES = { es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };
  const L = {
    es: { and: 'y', amp: 'y', nd: 's.f.', In: 'En', Ed: 'Ed.', Eds: 'Eds.', ed: n => n + '.ª ed.', edH: n => n + '.ª ed.', video: 'Vídeo', thesis: 'Tesis', report: 'Informe n.º', pp: 'pp.', vol: 'vol.', no: 'núm.', acc: 'Consultado el', accH: 'Consultado', avail: 'Disponible en', cited: 'citado', edBy: 'editado por', online: 'En línea', internet: 'Internet', refs: 'Referencias', mlaRefs: 'Obras citadas' },
    en: { and: 'and', amp: '&', nd: 'n.d.', In: 'In', Ed: 'Ed.', Eds: 'Eds.', ed: n => n + (n == 1 ? 'st' : n == 2 ? 'nd' : n == 3 ? 'rd' : 'th') + ' ed.', edH: n => n + (n == 1 ? 'st' : n == 2 ? 'nd' : n == 3 ? 'rd' : 'th') + ' edn.', video: 'Video', thesis: 'Thesis', report: 'Report No.', pp: 'pp.', vol: 'vol.', no: 'no.', acc: 'Accessed', accH: 'Accessed', avail: 'Available at', cited: 'cited', edBy: 'edited by', online: 'Online', internet: 'Internet', refs: 'References', mlaRefs: 'Works Cited' }
  };
  const ini = (g, dot = true) => String(g || '').split(/\s+/).filter(Boolean).map(w => w.split('-').map(p => (p[0] || '').toUpperCase() + (dot ? '.' : '')).join('-')).join(dot ? ' ' : '');
  const N = {
    famIni: a => a.literal || (a.family + (a.given ? ', ' + ini(a.given) : '')),
    famGiven: a => a.literal || (a.family + (a.given ? ', ' + a.given : '')),
    givenFam: a => a.literal || ((a.given ? a.given + ' ' : '') + a.family),
    iniFam: a => a.literal || ((a.given ? ini(a.given) + ' ' : '') + a.family),
    vanc: a => a.literal || (a.family + (a.given ? ' ' + ini(a.given, false) : ''))
  };
  const fam = a => a.literal || a.family || '';
  const joinList = (arr, sep, last) => arr.length < 2 ? (arr[0] || '') : arr.slice(0, -1).join(sep) + last + arr[arr.length - 1];
  // persona por línea: «Apellido, Nombre»; organizaciones entre llaves {OMS} o con 4+ palabras
  const parseNames = txt => String(txt || '').split(/\n|;| and (?=[A-ZÁÉÍÓÚÑ])/).map(s => s.trim()).filter(Boolean).map(s => { if (/^\{.*\}$/.test(s)) return { literal: s.slice(1, -1).trim() }; if (s.includes(',')) { const [f, ...g] = s.split(','); return { family: f.trim(), given: g.join(',').trim() }; } const w = s.split(/\s+/); if (w.length === 1 || w.length >= 4) return w.length === 1 ? { family: s, given: '' } : { literal: s }; return { family: w[w.length - 1], given: w.slice(0, -1).join(' ') }; });
  const namesText = l => (l || []).map(a => a.literal ? '{' + a.literal + '}' : a.family + (a.given ? ', ' + a.given : '')).join('\n');
  const tidy = s => s.replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').replace(/([?!])\./g, '$1').replace(/\.\s*\./g, '.').replace(/,\s*\./g, '.').replace(/\(\s*\)/g, '').trim();
  const link = r => r.doi ? 'https://doi.org/' + r.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') : (r.url || '');
  const T = (r, it) => { const t = esc(String(r.title || '').replace(/[.]\s*$/, '')); return it ? `<i>${t}</i>` : t; };
  const dmy = (r, lg, order) => { const m = r.month ? MES[lg][+r.month - 1] : ''; if (!m) return ''; return order === 'apa' ? (lg === 'es' ? (r.day ? r.day + ' de ' : '') + m : m + (r.day ? ' ' + r.day : '')) : (r.day ? r.day + ' ' : '') + m; };
  const longDate = (d, m, y, lg) => lg === 'es' ? (d ? d + ' de ' : '') + MES.es[m - 1] + ' de ' + y : (d ? d + ' ' : '') + (MES.en[m - 1].length > 4 ? MES.en[m - 1].slice(0, 3) + '.' : MES.en[m - 1]) + ' ' + y;
  const fmtAcc = (iso, lg, style) => { if (!iso) return ''; const d = new Date(iso + 'T12:00'); if (isNaN(d)) return ''; const m = MES[lg][d.getMonth()]; if (style === 'vancouver') return d.getFullYear() + ' ' + m.slice(0, 3) + ' ' + d.getDate(); if (style === 'ieee') return lg === 'es' ? d.getDate() + ' ' + m.slice(0, 3) + '. ' + d.getFullYear() : m.slice(0, 3) + '. ' + d.getDate() + ', ' + d.getFullYear(); return longDate(d.getDate(), d.getMonth() + 1, d.getFullYear(), lg); };
  const serial = lg => lg === 'es' ? ' y ' : ', and ';
  const STY = {
    apa(r, lg) {
      const l = L[lg], A = r.authors || [], n = A.length, au = n === 0 ? '' : n === 1 ? N.famIni(A[0]) : n <= 20 ? joinList(A.map(N.famIni), ', ', lg === 'es' ? ' y ' : ', & ') : A.slice(0, 19).map(N.famIni).join(', ') + ', … ' + N.famIni(A[n - 1]);
      const full = (r.type === 'web' || r.type === 'video') && r.month, date = '(' + (r.year || l.nd) + (full ? ', ' + dmy(r, lg, 'apa') : '') + ').';
      const it = !['article', 'chapter', 'conference'].includes(r.type);
      const extra = r.type === 'book' && r.edition && r.edition != 1 ? ` (${l.ed(r.edition)})` : r.type === 'report' && r.number ? ` (${l.report} ${esc(r.number)})` : r.type === 'thesis' ? ` [${esc(r.genre || l.thesis)}${r.publisher ? ', ' + esc(r.publisher) : ''}]` : r.type === 'video' ? ` [${l.video}]` : '';
      const eds = (r.editors || []).length ? (lg === 'es' ? joinList(r.editors.map(N.iniFam), ', ', ' y ') : joinList(r.editors.map(N.iniFam), ', ', ', & ')) + ` (${r.editors.length > 1 ? l.Eds : l.Ed}), ` : '';
      let src = '';
      if (r.type === 'article') src = (r.container ? `<i>${esc(r.container)}</i>` : '') + (r.volume ? `, <i>${esc(r.volume)}</i>` : '') + (r.issue ? `(${esc(r.issue)})` : '') + (r.pages ? `, ${esc(r.pages)}` : '') + '.';
      else if (r.type === 'chapter' || r.type === 'conference') src = `${l.In} ${eds}<i>${esc(r.container || '')}</i>${r.pages ? ` (${l.pp} ${esc(r.pages)})` : ''}.` + (r.publisher ? ' ' + esc(r.publisher) + '.' : '');
      else if (r.type === 'web' || r.type === 'video') src = r.container && r.container !== au ? esc(r.container) + '.' : '';
      else if (r.type !== 'thesis') src = r.publisher && r.publisher !== au ? esc(r.publisher) + '.' : '';
      const lk = link(r) ? ' ' + esc(link(r)) : '';
      return tidy(au ? `${esc(au)}${/\.$/.test(au) ? '' : '.'} ${date} ${T(r, it)}${extra}. ${src}${lk}` : `${T(r, it)}${extra}. ${date} ${src}${lk}`);
    },
    mla(r, lg) {
      const l = L[lg], A = r.authors || [], n = A.length, au = n === 0 ? '' : n === 1 ? N.famGiven(A[0]) : n === 2 ? N.famGiven(A[0]) + ', ' + l.and + ' ' + N.givenFam(A[1]) : N.famGiven(A[0]) + ', et al';
      const it = ['book', 'report', 'thesis', 'other'].includes(r.type), tt = it ? T(r, true) + '.' : `“${T(r, false)}.”`;
      const parts = [];
      if (r.container && !it) parts.push(`<i>${esc(r.container)}</i>`);
      if (r.type === 'chapter' && (r.editors || []).length) parts.push(l.edBy + ' ' + joinList(r.editors.map(N.givenFam), ', ', ' ' + l.and + ' '));
      if (r.edition && r.edition != 1) parts.push(l.ed(r.edition));
      if (r.volume) parts.push(l.vol + ' ' + esc(r.volume)); if (r.issue) parts.push(l.no + ' ' + esc(r.issue));
      if (r.publisher && r.type !== 'article') parts.push(esc(r.publisher));
      parts.push(r.month && r.year && (r.type === 'web' || r.type === 'video') ? longDate(r.day, +r.month, r.year, lg) : (r.year || l.nd));
      if (r.pages) parts.push(l.pp + ' ' + esc(r.pages)); if (link(r)) parts.push(esc(link(r).replace(/^https?:\/\//, r.doi ? 'https://' : '')));
      return tidy(`${au ? esc(au) + '. ' : ''}${tt} ${parts.join(', ')}.${r.accessed && r.type === 'web' ? ' ' + l.acc + ' ' + fmtAcc(r.accessed, lg) + '.' : ''}`);
    },
    chicago(r, lg) {
      const l = L[lg], A = r.authors || [], n = A.length, list = A.length > 10 ? A.slice(0, 7) : A, au = n === 0 ? '' : joinList(list.map((a, i) => i ? N.givenFam(a) : N.famGiven(a)), ', ', list.length > 2 ? serial(lg) : ' ' + l.and + ' ') + (n > 10 ? ', et al.' : '');
      const it = ['book', 'report', 'thesis', 'other'].includes(r.type), tt = it ? T(r, true) + '.' : `“${T(r, false)}.”`;
      let src = '';
      if (r.type === 'article') src = `<i>${esc(r.container || '')}</i> ${esc(r.volume || '')}${r.issue ? ` (${esc(r.issue)})` : ''}${r.pages ? ': ' + esc(r.pages) : ''}.`;
      else if (r.type === 'chapter' || r.type === 'conference') src = `${l.In} <i>${esc(r.container || '')}</i>${(r.editors || []).length ? ', ' + l.edBy + ' ' + joinList(r.editors.map(N.givenFam), ', ', ' ' + l.and + ' ') : ''}${r.pages ? ', ' + esc(r.pages) : ''}. ${r.place ? esc(r.place) + ': ' : ''}${esc(r.publisher || '')}.`;
      else if (r.type === 'web' || r.type === 'video') src = `${esc(r.container || '')}${r.month ? '. ' + (lg === 'es' ? (r.day ? r.day + ' de ' : '') + MES[lg][+r.month - 1] + ' de ' + r.year : MES[lg][+r.month - 1] + (r.day ? ' ' + r.day : '') + ', ' + r.year) : ''}.`;
      else if (r.type === 'thesis') src = `${esc(r.genre || l.thesis)}, ${esc(r.publisher || '')}.`;
      else src = `${r.edition && r.edition != 1 ? l.ed(r.edition) + ' ' : ''}${r.place ? esc(r.place) + ': ' : ''}${esc(r.publisher || '')}.`;
      return tidy(`${au ? esc(au) + '. ' : ''}${r.year || l.nd}. ${tt} ${src} ${esc(link(r))}`);
    },
    ieee(r, lg, num) {
      const l = L[lg], A = r.authors || [], n = A.length, au = n === 0 ? '' : n > 6 ? N.iniFam(A[0]) + ' et al.' : n === 2 ? N.iniFam(A[0]) + ' ' + l.and + ' ' + N.iniFam(A[1]) : joinList(A.map(N.iniFam), ', ', serial(lg));
      const mon = r.month ? MES[lg][+r.month - 1].slice(0, 3) + '. ' : '';
      let s;
      if (r.type === 'article') s = `${esc(au)}, “${T(r)},” <i>${esc(r.container || '')}</i>${r.volume ? ', ' + l.vol + ' ' + esc(r.volume) : ''}${r.issue ? ', ' + l.no + ' ' + esc(r.issue) : ''}${r.pages ? ', ' + l.pp + ' ' + esc(r.pages) : ''}, ${mon}${r.year || l.nd}${r.doi ? ', doi: ' + esc(r.doi) : ''}.`;
      else if (r.type === 'book' || r.type === 'report' || r.type === 'other') s = `${esc(au)}, <i>${T(r)}</i>${r.edition && r.edition != 1 ? ', ' + l.ed(r.edition) : ''}${r.type === 'report' && r.number ? ', ' + l.report + ' ' + esc(r.number) : ''}. ${r.place ? esc(r.place) + ': ' : ''}${esc(r.publisher || '')}, ${r.year || l.nd}.`;
      else if (r.type === 'chapter' || r.type === 'conference') s = `${esc(au)}, “${T(r)},” ${lg === 'es' ? 'en' : 'in'} <i>${esc(r.container || '')}</i>${(r.editors || []).length ? ', ' + r.editors.map(N.iniFam).join(', ') + ', ' + (r.editors.length > 1 ? l.Eds : l.Ed) : ''} ${r.place ? esc(r.place) + ': ' : ''}${esc(r.publisher || '')}, ${r.year || l.nd}${r.pages ? ', ' + l.pp + ' ' + esc(r.pages) : ''}.`;
      else if (r.type === 'thesis') s = `${esc(au)}, “${T(r)},” ${esc(r.genre || l.thesis)}, ${esc(r.publisher || '')}${r.place ? ', ' + esc(r.place) : ''}, ${r.year || l.nd}.`;
      else s = `${esc(au)}, “${T(r)},” ${esc(r.container || '')}. ${r.accessed ? l.accH + ': ' + fmtAcc(r.accessed, lg, 'ieee') + '. ' : ''}[${l.online}]. ${l.avail}: ${esc(link(r))}`;
      return tidy(`[${num}] ` + s.replace(/^, /, ''));
    },
    harvard(r, lg) {
      const l = L[lg], A = r.authors || [], n = A.length, au = n === 0 ? '' : n >= 4 ? N.famIni(A[0]) + ' et al.' : joinList(A.map(a => N.famIni(a).replace(/\. /g, '.')), ', ', ' ' + l.and + ' ');
      const it = !['article', 'chapter', 'conference'].includes(r.type), tt = it ? T(r, true) : `‘${T(r)}’`;
      let src = '';
      if (r.type === 'article') src = `, <i>${esc(r.container || '')}</i>${r.volume ? ', ' + esc(r.volume) : ''}${r.issue ? '(' + esc(r.issue) + ')' : ''}${r.pages ? ', ' + l.pp + ' ' + esc(r.pages) : ''}.`;
      else if (r.type === 'chapter' || r.type === 'conference') src = `, ${lg === 'es' ? 'en' : 'in'} ${(r.editors || []).length ? r.editors.map(N.famIni).join(', ') + ' (' + (r.editors.length > 1 ? 'eds.' : 'ed.') + ') ' : ''}<i>${esc(r.container || '')}</i>. ${r.place ? esc(r.place) + ': ' : ''}${esc(r.publisher || '')}${r.pages ? ', ' + l.pp + ' ' + esc(r.pages) : ''}.`;
      else if (r.type === 'web' || r.type === 'video') src = '.';
      else src = `.${r.edition && r.edition != 1 ? ' ' + l.edH(r.edition) + '.' : ''} ${r.place ? esc(r.place) + ': ' : ''}${esc(r.publisher || '')}.`;
      const av = link(r) ? (r.doi ? ` doi: ${esc(r.doi)}.` : ` ${l.avail}: ${esc(link(r))}${r.accessed ? ` (${l.accH}: ${fmtAcc(r.accessed, lg)})` : ''}.`) : '';
      return tidy(`${au ? esc(au) + ' ' : ''}(${r.year || l.nd}) ${tt}${src}${av}`);
    },
    vancouver(r, lg, num) {
      const l = L[lg], A = r.authors || [], au = A.length > 6 ? A.slice(0, 6).map(N.vanc).join(', ') + ', et al' : A.map(N.vanc).join(', ');
      let s;
      if (r.type === 'article') s = `${esc(au)}. ${T(r)}. ${esc(r.container || '')}. ${r.year || ''}${r.volume ? ';' + esc(r.volume) : ''}${r.issue ? '(' + esc(r.issue) + ')' : ''}${r.pages ? ':' + esc(r.pages) : ''}.${r.doi ? ' doi:' + esc(r.doi) : ''}`;
      else if (r.type === 'web') s = `${esc(au)}. ${T(r)} [${l.internet}]. ${esc(r.container || '')}; ${r.year || ''} [${l.cited} ${fmtAcc(r.accessed || new Date().toISOString().slice(0, 10), lg, 'vancouver')}]. ${l.avail}: ${esc(link(r))}`;
      else if (r.type === 'chapter' || r.type === 'conference') s = `${esc(au)}. ${T(r)}. ${lg === 'es' ? 'En' : 'In'}: ${(r.editors || []).map(N.vanc).join(', ')}${(r.editors || []).length ? ', editor' + (r.editors.length > 1 ? 'es' : '') + '. ' : ''}${esc(r.container || '')}. ${r.place ? esc(r.place) + ': ' : ''}${esc(r.publisher || '')}; ${r.year || ''}${r.pages ? '. p. ' + esc(r.pages) : ''}.`;
      else s = `${esc(au)}. ${T(r)}${r.type === 'thesis' ? ' [' + esc(r.genre || l.thesis) + ']' : ''}. ${r.edition && r.edition != 1 ? l.ed(r.edition) + ' ' : ''}${r.place ? esc(r.place) + ': ' : ''}${esc(r.publisher || '')}; ${r.year || ''}.`;
      return tidy(`${num}. ` + s.replace(/^\.\s*/, ''));
    }
  };
  // texto de la cita dentro del documento
  function citeText(refs, style, lg, nums, page) {
    const l = L[lg];
    if (NUMERIC[style]) { const ns = refs.map(r => nums[r.id]).filter(Boolean).sort((a, b) => a - b); const runs = []; ns.forEach(n => { const last = runs[runs.length - 1]; if (last && n === last[1] + 1) last[1] = n; else runs.push([n, n]); }); const t = runs.map(([a, b]) => a === b ? String(a) : b === a + 1 ? a + ',' + b : a + '–' + b); return style === 'ieee' ? runs.map(([a, b]) => a === b ? `[${a}]` : b === a + 1 ? `[${a}], [${b}]` : `[${a}]–[${b}]`).join(', ') : '(' + t.join(',') + ')'; }
    const short = r => { const A = r.authors || [], two = { apa: lg === 'es' ? ' y ' : ' & ', mla: ' ' + l.and + ' ', chicago: ' ' + l.and + ' ', harvard: ' ' + l.and + ' ' }[style]; const maxAll = style === 'chicago' || style === 'harvard' ? 3 : 2; if (!A.length) return '“' + String(r.title || '').split(/\s+/).slice(0, 4).join(' ') + '”'; return A.length <= maxAll ? joinList(A.map(fam), ', ', A.length > 2 ? (lg === 'es' ? ' y ' : ', ' + l.and + ' ') : two) : fam(A[0]) + ' et al.'; };
    const one = r => style === 'mla' ? short(r) + (page ? ' ' + page.replace(/^p+\.\s*/i, '') : '') : style === 'chicago' ? short(r) + ' ' + (r.year || l.nd) + (page ? ', ' + page.replace(/^p+\.\s*/i, '') : '') : short(r) + ', ' + (r.year || l.nd) + (page ? ', ' + page : '');
    return '(' + refs.map(one).join('; ') + ')';
  }
  const sortKey = r => K.norm((r.authors && r.authors[0] ? fam(r.authors[0]) : r.title || '') + ' ' + (r.year || '') + ' ' + (r.title || ''));
  function bibliography(refs, style, lg, order) {
    const list = NUMERIC[style] ? (order ? order.map(id => refs.find(r => r.id === id)).filter(Boolean) : refs) : refs.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    return list.map((r, i) => (STY[style] || STY.apa)(r, lg, i + 1));
  }
  K.cite = { REF_TYPES, STYLES, format: (r, s = 'apa', lg = 'es', n = 1) => (STY[s] || STY.apa)(r, lg, n), citeText, bibliography, parseNames, namesText };

  /* ===================== Biblioteca de referencias (datos) ===================== */
  const RK = 'os10_refs';
  const lib = () => { const d = S.get(RK, null) || {}; return { items: Array.isArray(d.items) ? d.items : [], colls: Array.isArray(d.colls) ? d.colls : [] }; };
  const libSave = d => { S.set(RK, d); K.emit('refs'); };
  const clean = r => { const o = { id: r.id || E.uid(), type: REF_TYPES.some(t => t[0] === r.type) ? r.type : 'other', title: String(r.title || '').slice(0, 500), authors: (r.authors || []).slice(0, 60), editors: (r.editors || []).slice(0, 20), tags: [...new Set((r.tags || []).map(t => String(t).trim().slice(0, 30)).filter(Boolean))].slice(0, 20), colls: (r.colls || []).slice(0, 20), added: r.added || Date.now(), mod: Date.now() }; ['year', 'month', 'day', 'container', 'publisher', 'place', 'volume', 'issue', 'pages', 'edition', 'doi', 'isbn', 'url', 'accessed', 'genre', 'number', 'notes', 'fileId', 'abstract'].forEach(k => { if (r[k] != null && r[k] !== '') o[k] = String(r[k]).slice(0, k === 'notes' || k === 'abstract' ? 4000 : 400); }); if (o.month && !(+o.month >= 1 && +o.month <= 12)) delete o.month; if (o.doi) o.doi = o.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim(); return o; };
  const dupKey = r => r.doi ? 'doi:' + r.doi.toLowerCase() : r.isbn ? 'isbn:' + r.isbn.replace(/[^0-9X]/gi, '') : 't:' + K.norm(r.title || '').replace(/[^a-z0-9ñ]/g, '') + ':' + (r.year || '');
  /* --- BibTeX --- */
  const TEXACC = { "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' }, '`': { a: 'à', e: 'è', o: 'ò', A: 'À', E: 'È' }, '"': { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', U: 'Ü', O: 'Ö', A: 'Ä' }, '~': { n: 'ñ', N: 'Ñ', a: 'ã', o: 'õ' }, '^': { a: 'â', e: 'ê', o: 'ô' }, c: { c: 'ç', C: 'Ç' } };
  const deTex = s => String(s).replace(/\{\\([`'"~^c])\s*\{?\\?([a-zA-Z])\}?\}/g, (m, a, c) => (TEXACC[a] || {})[c] || c).replace(/\\([`'"~^])\{?\\?([a-zA-Z])\}?/g, (m, a, c) => (TEXACC[a] || {})[c] || c).replace(/\\&/g, '&').replace(/\\%/g, '%').replace(/\\_/g, '_').replace(/--/g, '–').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  const BIBT = { article: 'article', book: 'book', inbook: 'chapter', incollection: 'chapter', inproceedings: 'conference', conference: 'conference', phdthesis: 'thesis', mastersthesis: 'thesis', techreport: 'report', online: 'web', misc: 'other', electronic: 'web', www: 'web' };
  function parseBibtex(src) {
    const out = []; let i = 0; const s = String(src);
    while ((i = s.indexOf('@', i)) >= 0) {
      const m = s.slice(i).match(/^@(\w+)\s*([{(])/); if (!m) { i++; continue; } const type = m[1].toLowerCase(); if (type === 'comment' || type === 'string' || type === 'preamble') { i += m[0].length; continue; }
      let j = i + m[0].length, depth = 1; const start = j; while (j < s.length && depth) { const c = s[j]; if (c === '{' || c === '(') depth++; else if (c === '}' || c === ')') depth--; j++; } const body = s.slice(start, j - 1); i = j;
      const f = {}; let k = body.indexOf(','); if (k < 0) continue; let p = k + 1;
      while (p < body.length) { const mm = body.slice(p).match(/^\s*([\w-]+)\s*=\s*/); if (!mm) break; const name = mm[1].toLowerCase(); p += mm[0].length; let val = ''; if (body[p] === '{') { let d = 1, q2 = p + 1; while (q2 < body.length && d) { if (body[q2] === '{') d++; else if (body[q2] === '}') d--; q2++; } val = body.slice(p + 1, q2 - 1); p = q2; } else if (body[p] === '"') { let q2 = p + 1; while (q2 < body.length && body[q2] !== '"') q2++; val = body.slice(p + 1, q2); p = q2 + 1; } else { const mv = body.slice(p).match(/^[^,]*/); val = mv[0]; p += mv[0].length; } f[name] = val.trim(); const mc = body.slice(p).match(/^\s*,?/); p += mc[0].length; }
      const wrapped = x => { if (x[0] !== '{') return false; let d = 0; for (let k2 = 0; k2 < x.length; k2++) { if (x[k2] === '{') d++; else if (x[k2] === '}') { d--; if (d === 0 && k2 < x.length - 1) return false; } } return true; };
      const names = v => v ? v.split(/\s+and\s+/i).map(x => x.trim()).filter(Boolean).map(x => { if (wrapped(x)) return { literal: deTex(x) }; const t = deTex(x); if (t.includes(',')) { const [a, ...g] = t.split(','); return { family: a.trim(), given: g.join(',').trim() }; } const w = t.split(' '); return w.length === 1 ? { family: t, given: '' } : { family: w[w.length - 1], given: w.slice(0, -1).join(' ') }; }) : [];
      const pages = f.pages ? deTex(f.pages) : '', mon = f.month ? (/^\d+$/.test(f.month) ? +f.month : ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(f.month.toLowerCase().slice(0, 3)) + 1 || '') : '';
      out.push(clean({ type: BIBT[type] || 'other', title: deTex(f.title || ''), authors: names(f.author), editors: names(f.editor), year: (f.year || f.date || '').match(/\d{4}/) ? f.year ? f.year.match(/\d{4}/)[0] : f.date.match(/\d{4}/)[0] : '', month: mon, container: deTex(f.journal || f.journaltitle || f.booktitle || f.howpublished || ''), publisher: deTex(f.publisher || f.school || f.institution || f.organization || ''), place: deTex(f.address || f.location || ''), volume: deTex(f.volume || ''), issue: deTex(f.number && type !== 'techreport' ? f.number : f.issue || ''), number: type === 'techreport' ? deTex(f.number || '') : '', pages, edition: deTex(f.edition || '').replace(/\D/g, ''), doi: f.doi || '', isbn: f.isbn || '', url: f.url || '', notes: deTex(f.note || ''), genre: type === 'phdthesis' ? 'Tesis doctoral' : type === 'mastersthesis' ? 'Tesis de maestría' : '', accessed: (f.urldate || '').slice(0, 10), abstract: deTex(f.abstract || '') }));
    }
    return out;
  }
  const RBIB = { article: 'article', book: 'book', chapter: 'incollection', conference: 'inproceedings', thesis: 'phdthesis', report: 'techreport', web: 'online', video: 'misc', other: 'misc' };
  function toBibtex(items) {
    const keys = new Set();
    return items.map(r => { let key = ((r.authors[0] ? fam(r.authors[0]) : 'ref').normalize('NFD').replace(/[^\w]/g, '') + (r.year || '')).toLowerCase() || 'ref'; let k2 = key, n = 0; while (keys.has(k2)) k2 = key + String.fromCharCode(97 + n++); keys.add(k2); const nm = l => l.map(a => a.literal ? '{' + a.literal + '}' : a.family + (a.given ? ', ' + a.given : '')).join(' and '); const f = [['title', r.title], ['author', nm(r.authors)], ['editor', nm(r.editors)], ['year', r.year], ['month', r.month], [r.type === 'article' ? 'journal' : 'booktitle', ['article', 'chapter', 'conference'].includes(r.type) ? r.container : ''], ['howpublished', r.type === 'web' || r.type === 'video' ? r.container : ''], [r.type === 'thesis' ? 'school' : r.type === 'report' ? 'institution' : 'publisher', r.publisher], ['address', r.place], ['volume', r.volume], ['number', r.type === 'report' ? r.number : r.issue], ['pages', (r.pages || '').replace(/–/g, '--')], ['edition', r.edition], ['doi', r.doi], ['isbn', r.isbn], ['url', r.url], ['urldate', r.accessed], ['note', r.notes]].filter(([, v]) => v); return `@${RBIB[r.type] || 'misc'}{${k2},\n` + f.map(([k, v]) => `  ${k} = {${k === 'author' || k === 'editor' ? String(v) : String(v).replace(/[{}]/g, '')}}`).join(',\n') + '\n}'; }).join('\n\n');
  }
  /* --- RIS --- */
  const RIST = { JOUR: 'article', BOOK: 'book', CHAP: 'chapter', ELEC: 'web', WEB: 'web', THES: 'thesis', RPRT: 'report', CONF: 'conference', CPAPER: 'conference', VIDEO: 'video', GEN: 'other' };
  function parseRis(src) {
    const out = []; let cur = null;
    String(src).split(/\r?\n/).forEach(line => { const m = line.match(/^([A-Z][A-Z0-9])\s{2}-\s?(.*)$/); if (!m) return; const [, tag, v] = m; if (tag === 'TY') { cur = { type: RIST[v.trim()] || 'other', authors: [], editors: [], tags: [] }; return; } if (!cur) return; if (tag === 'ER') { out.push(clean(cur)); cur = null; return; } const val = v.trim(); const nm = x => { if (x.includes(',')) { const [a, ...g] = x.split(','); return { family: a.trim(), given: g.join(',').trim() }; } return { literal: x }; };
      switch (tag) { case 'AU': case 'A1': cur.authors.push(nm(val)); break; case 'A2': case 'ED': cur.editors.push(nm(val)); break; case 'TI': case 'T1': cur.title = val; break; case 'T2': case 'JO': case 'JF': case 'BT': if (!cur.container) cur.container = val; break; case 'PY': case 'Y1': case 'DA': { const d = val.match(/(\d{4})(?:\/(\d{1,2}))?(?:\/(\d{1,2}))?/); if (d) { cur.year = cur.year || d[1]; if (d[2]) cur.month = cur.month || +d[2]; if (d[3]) cur.day = cur.day || +d[3]; } break; } case 'VL': cur.volume = val; break; case 'IS': cur.issue = val; break; case 'SP': cur.pages = val + (cur.pages && cur.pages.startsWith('–') ? cur.pages : ''); break; case 'EP': cur.pages = (cur.pages || '') + '–' + val; break; case 'PB': cur.publisher = val; break; case 'CY': cur.place = val; break; case 'DO': cur.doi = val; break; case 'SN': if (/^[\dX-]{10,17}$/i.test(val)) cur.isbn = val; break; case 'UR': cur.url = cur.url || val; break; case 'ET': cur.edition = val.replace(/\D/g, ''); break; case 'KW': cur.tags.push(val); break; case 'N1': case 'AB': cur.notes = (cur.notes ? cur.notes + '\n' : '') + val; break; case 'Y2': cur.accessed = val.replace(/\//g, '-').slice(0, 10); break; case 'M3': cur.genre = val; break; default: break; } });
    return out;
  }
  const RRIS = { article: 'JOUR', book: 'BOOK', chapter: 'CHAP', web: 'ELEC', thesis: 'THES', report: 'RPRT', conference: 'CONF', video: 'VIDEO', other: 'GEN' };
  const toRis = items => items.map(r => { const l = [['TY', RRIS[r.type] || 'GEN']]; r.authors.forEach(a => l.push(['AU', a.literal || a.family + (a.given ? ', ' + a.given : '')])); (r.editors || []).forEach(a => l.push(['ED', a.literal || a.family + (a.given ? ', ' + a.given : '')])); [['TI', r.title], ['T2', r.container], ['PY', r.year ? r.year + (r.month ? '/' + String(r.month).padStart(2, '0') : '') : ''], ['VL', r.volume], ['IS', r.issue], ['SP', (r.pages || '').split(/[–-]/)[0]], ['EP', (r.pages || '').split(/[–-]/)[1]], ['PB', r.publisher], ['CY', r.place], ['ET', r.edition], ['DO', r.doi], ['SN', r.isbn], ['UR', r.url], ['Y2', r.accessed], ['M3', r.genre], ['N1', r.notes]].forEach(([k, v]) => { if (v) l.push([k, v]); }); (r.tags || []).forEach(t => l.push(['KW', t])); l.push(['ER', '']); return l.map(([k, v]) => `${k}  - ${String(v).replace(/\n/g, ' ')}`).join('\n'); }).join('\n\n');
  /* --- CSL-JSON --- */
  const CSLT = { article: 'article-journal', book: 'book', chapter: 'chapter', web: 'webpage', thesis: 'thesis', report: 'report', conference: 'paper-conference', video: 'motion_picture', other: 'document' }, RCSL = Object.fromEntries(Object.entries(CSLT).map(([a, b]) => [b, a]));
  const toCsl = items => items.map(r => { const o = { id: r.id, type: CSLT[r.type] || 'document', title: r.title }; const nm = l => l.map(a => a.literal ? { literal: a.literal } : { family: a.family, given: a.given }); if (r.authors.length) o.author = nm(r.authors); if ((r.editors || []).length) o.editor = nm(r.editors); if (r.year) o.issued = { 'date-parts': [[+r.year].concat(r.month ? [+r.month] : [], r.month && r.day ? [+r.day] : [])] }; [['container-title', r.container], ['publisher', r.publisher], ['publisher-place', r.place], ['volume', r.volume], ['issue', r.issue], ['page', r.pages], ['edition', r.edition], ['DOI', r.doi], ['ISBN', r.isbn], ['URL', r.url], ['genre', r.genre], ['number', r.number], ['note', r.notes]].forEach(([k, v]) => { if (v) o[k] = v; }); if (r.accessed) { const d = r.accessed.split('-').map(Number); o.accessed = { 'date-parts': [d] }; } return o; });
  const fromCsl = arr => (Array.isArray(arr) ? arr : arr && arr.items || []).filter(x => x && typeof x === 'object').map(o => { const dp = o.issued && o.issued['date-parts'] && o.issued['date-parts'][0] || [], acc = o.accessed && o.accessed['date-parts'] && o.accessed['date-parts'][0]; const nm = l => (l || []).map(a => a.literal ? { literal: a.literal } : { family: a.family || '', given: a.given || '' }); return clean({ type: RCSL[o.type] || (o.type === 'article' || o.type === 'article-magazine' || o.type === 'article-newspaper' ? 'article' : 'other'), title: o.title, authors: nm(o.author), editors: nm(o.editor), year: dp[0], month: dp[1], day: dp[2], container: o['container-title'], publisher: o.publisher, place: o['publisher-place'], volume: o.volume, issue: o.issue, pages: o.page, edition: o.edition, doi: o.DOI, isbn: o.ISBN, url: o.URL, genre: o.genre, number: o.number, notes: o.note, accessed: acc ? acc.map(n => String(n).padStart(2, '0')).join('-') : '' }); });
  /* --- búsqueda por DOI e ISBN (servicios públicos con CORS) --- */
  async function byDoi(doi) {
    doi = String(doi).trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, ''); if (!/^10\.\d{4,9}\/\S+$/.test(doi)) throw new Error(tr('El DOI no tiene un formato válido (10.xxxx/…)'));
    const r = await fetch('https://api.crossref.org/works/' + encodeURIComponent(doi)); if (!r.ok) throw new Error(r.status === 404 ? tr('Crossref no conoce ese DOI') : 'Crossref HTTP ' + r.status); const m = (await r.json()).message || {};
    const dp = (m.issued || m['published-print'] || m['published-online'] || {})['date-parts'] || [[]];
    const TY = { 'journal-article': 'article', 'book': 'book', 'monograph': 'book', 'edited-book': 'book', 'book-chapter': 'chapter', 'proceedings-article': 'conference', 'report': 'report', 'dissertation': 'thesis', 'posted-content': 'other' };
    return clean({ type: TY[m.type] || 'other', title: (m.title || [''])[0], authors: (m.author || []).map(a => a.family ? { family: a.family, given: a.given || '' } : { literal: a.name || '' }), editors: (m.editor || []).map(a => ({ family: a.family || '', given: a.given || '' })), year: dp[0] && dp[0][0], month: dp[0] && dp[0][1], container: (m['container-title'] || [''])[0], publisher: m.publisher, place: m['publisher-location'], volume: m.volume, issue: m.issue, pages: (m.page || '').replace('-', '–'), doi: m.DOI, isbn: (m.ISBN || [])[0], url: m.URL, abstract: (m.abstract || '').replace(/<[^>]+>/g, '') });
  }
  async function byIsbn(isbn) {
    const n = String(isbn).replace(/[^0-9X]/gi, ''); if (!/^(\d{9}[\dX]|\d{13})$/i.test(n)) throw new Error(tr('El ISBN debe tener 10 o 13 cifras'));
    const r = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${n}&format=json&jscmd=data`); if (!r.ok) throw new Error('Open Library HTTP ' + r.status); const j = (await r.json())['ISBN:' + n]; if (!j) throw new Error(tr('Open Library no conoce ese ISBN'));
    const ed = (j.edition_name || '').match(/\d+/);
    return clean({ type: 'book', title: j.title + (j.subtitle ? ': ' + j.subtitle : ''), authors: (j.authors || []).map(a => { const w = a.name.split(' '); return w.length === 1 ? { family: a.name, given: '' } : { family: w[w.length - 1], given: w.slice(0, -1).join(' ') }; }), year: (String(j.publish_date || '').match(/\d{4}/) || [''])[0], publisher: (j.publishers || [])[0] && j.publishers[0].name, place: (j.publish_places || [])[0] && j.publish_places[0].name, isbn: n, url: j.url, edition: ed ? ed[0] : '' });
  }
  K.refsLib = { all: () => lib().items, get: id => lib().items.find(r => r.id === id), add(items) { const d = lib(), keys = new Set(d.items.map(dupKey)); let n = 0; items.forEach(r => { const c = clean(r); if (!keys.has(dupKey(c))) { d.items.unshift(c); keys.add(dupKey(c)); n++; } }); libSave(d); return n; }, parseBibtex, parseRis, fromCsl, toBibtex, toRis, toCsl, byDoi, byIsbn, dupKey };

  /* ===================== Diálogo para elegir referencias ===================== */
  function pickRefs(o = {}) {
    return new Promise(res => {
      const items = lib().items, ov = document.createElement('div'); ov.className = 'eis-modal';
      ov.innerHTML = `<div class="eis-modal-card" style="width:min(680px,95vw);max-width:none"><h3>${esc(o.title || tr('Elegir referencias'))}</h3>${items.length ? `<input class="input-text" data-q placeholder="${esc(tr('Buscar por autor, título o año…'))}" style="width:100%"><div data-l class="s10-pick-l"></div>${o.page ? `<label class="k9-field" style="margin-top:6px">${esc(tr('Página o localizador (opcional)'))}<input class="input-text" data-pg placeholder="p. 23"></label>` : ''}` : `<p class="k9-small">${esc(tr('Tu Gestor de referencias está vacío. Añade referencias (a mano, por DOI o ISBN, o importando BibTeX/RIS) y vuelve aquí.'))}</p>`}<div class="eis-modal-btns">${items.length ? '' : `<button class="btn-secondary" data-open>${esc(tr('Abrir el Gestor de referencias'))}</button>`}<button class="btn-secondary" data-x>${esc(tr('Cancelar'))}</button>${items.length ? `<button class="btn-primary" data-ok>${esc(tr(o.ok || 'Insertar'))}</button>` : ''}</div></div>`;
      document.body.appendChild(ov); const sel = new Set();
      const draw = () => { const nq = K.norm((q(ov, '[data-q]') || {}).value || ''); q(ov, '[data-l]').innerHTML = items.filter(r => !nq || K.norm([r.title, r.year, (r.authors || []).map(fam).join(' '), r.container].join(' ')).includes(nq)).slice(0, 300).map(r => `<label class="k9-li" style="cursor:pointer"><input type="checkbox" data-id="${esc(r.id)}" ${sel.has(r.id) ? 'checked' : ''}><div class="t"><b style="white-space:normal">${esc(r.title || tr('Sin título'))}</b><small>${esc((r.authors || []).slice(0, 3).map(fam).join(', ') + ((r.authors || []).length > 3 ? ' et al.' : ''))} · ${esc(r.year || 's.f.')} · ${esc(tr((REF_TYPES.find(t => t[0] === r.type) || [, ''])[1]))}</small></div></label>`).join(''); };
      const done = v => { ov.remove(); res(v); };
      if (items.length) { draw(); q(ov, '[data-q]').oninput = draw; q(ov, '[data-l]').addEventListener('change', e => { const c = e.target.closest('[data-id]'); if (c) c.checked ? sel.add(c.dataset.id) : sel.delete(c.dataset.id); }); setTimeout(() => q(ov, '[data-q]').focus(), 30); }
      ov.addEventListener('click', e => { if (e.target.closest('[data-x]') || e.target === ov) done(null); if (e.target.closest('[data-open]')) { done(null); E.launch('refs'); } if (e.target.closest('[data-ok]')) { if (!sel.size) return E.toast(tr('Marca al menos una referencia')); done({ ids: [...sel], page: ((q(ov, '[data-pg]') || {}).value || '').trim() }); } });
    });
  }

  /* ===================== Integración con EISEN Writer ===================== */
  const WRK = 'os10_wr_cite', wrCfg = () => Object.assign({ style: 'apa', lang: 'es' }, S.get(WRK, {}) || {});
  // ecuaciones: subconjunto de LaTeX → HTML (sup, sub, fracciones y raíces con atributos data-eq que el saneador conserva)
  const SYM = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω', times: '×', div: '÷', pm: '±', mp: '∓', cdot: '·', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈', equiv: '≡', sim: '∼', propto: '∝', infty: '∞', sum: '∑', prod: '∏', int: '∫', iint: '∬', oint: '∮', partial: '∂', nabla: '∇', rightarrow: '→', to: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', leftrightarrow: '↔', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃', cup: '∪', cap: '∩', forall: '∀', exists: '∃', emptyset: '∅', neg: '¬', land: '∧', lor: '∨', angle: '∠', perp: '⊥', parallel: '∥', degree: '°', circ: '∘', ldots: '…', cdots: '⋯', prime: '′', hbar: 'ℏ', ell: 'ℓ', aleph: 'ℵ', quad: '\u2003', qquad: '\u2003\u2003', ',': '\u2009', ';': '\u2005', ' ': ' ', '{': '{', '}': '}', '%': '%', '#': '#', '&': '&', '_': '_' };
  const REL = new Set(['±', '∓', '×', '÷', '·', '≤', '≥', '≠', '≈', '≡', '∼', '∝', '→', '←', '⇒', '⇐', '⇔', '↔', '∈', '∉', '⊂', '⊆', '⊃', '∪', '∩', '∧', '∨']);
  const FUN = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'log', 'ln', 'exp', 'lim', 'max', 'min', 'det', 'gcd', 'mod'];
  function tex(src) {
    const s = String(src); let i = 0;
    const group = () => { if (s[i] === '{') { i++; const h = seq('}'); i++; return h; } return atom(); };
    const seq = end => { let h = ''; while (i < s.length && s[i] !== end) h += term(); return h; };
    const term = () => { let base = atom(); while (s[i] === '^' || s[i] === '_') { const t = s[i++]; const g = group(); base += t === '^' ? `<sup>${g}</sup>` : `<sub>${g}</sub>`; } return base; };
    const atom = () => {
      const c = s[i]; if (c === undefined) return '';
      if (c === '\\') { const m = s.slice(i + 1).match(/^([a-zA-Z]+|.)/); const cmd = m ? m[1] : ''; i += 1 + cmd.length;
        if (cmd === 'frac') { const a = group(), b = group(); return `<span data-eq="frac"><span>${a}</span><span>${b}</span></span>`; }
        if (cmd === 'sqrt') { let n = ''; if (s[i] === '[') { const k = s.indexOf(']', i); n = esc(s.slice(i + 1, k)); i = k + 1; } return `<span data-eq="sqrt">${n ? `<sup>${n}</sup>` : ''}√<span data-eq="arg">${group()}</span></span>`; }
        if (cmd === 'text' || cmd === 'mathrm') { if (s[i] === '{') { const k = s.indexOf('}', i); const t = esc(s.slice(i + 1, k)); i = k + 1; return t; } return ''; }
        if (cmd === 'left' || cmd === 'right') return atom();
        if (FUN.includes(cmd)) return cmd + '\u2009';
        if (SYM[cmd] != null) return REL.has(SYM[cmd]) ? '\u2009' + SYM[cmd] + '\u2009' : SYM[cmd]; return esc('\\' + cmd);
      }
      if (c === '{') { i++; const h = seq('}'); i++; return h; }
      i++; if (c === ' ' || c === '\n' || c === '\t') return ''; if (/[a-zA-ZÀ-ÿ]/.test(c)) return `<i>${esc(c)}</i>`; if (c === '-') return '\u2009−\u2009'; if (c === '*') return '∗'; if (c === "'") return '′';
      if (/[=<>+]/.test(c)) return '\u2009' + esc(c) + '\u2009'; return esc(c);
    };
    let h = ''; while (i < s.length) { if (s[i] === '}') { i++; continue; } h += term(); }
    return h.replace(/^\u2009−\u2009/, '−').replace(/(\(|\[|<(?!\/)[^>]*>)\u2009−\u2009/g, '$1−');
  }
  K.tex = tex;
  function refreshDoc(WR, notify) {
    const body = WR.body, cfg = wrCfg(), items = lib().items, cites = qa(body, 'span[data-cite]'), order = [], missing = new Set();
    const ids = sp => sp.dataset.cite.split('|')[0].split(',').filter(Boolean);
    cites.forEach(sp => ids(sp).forEach(id => { if (!order.includes(id)) order.push(id); }));
    const nums = {}; order.forEach((id, k) => { nums[id] = k + 1; });
    cites.forEach(sp => { const refs = ids(sp).map(id => items.find(r => r.id === id)).filter(Boolean); ids(sp).forEach(id => { if (!items.some(r => r.id === id)) missing.add(id); }); if (refs.length) sp.textContent = citeText(refs, cfg.style, cfg.lang, nums, sp.dataset.cite.split('|')[1] || ''); });
    const refs = order.map(id => items.find(r => r.id === id)).filter(Boolean);
    qa(body, 'div[data-biblio]').forEach(div => { div.dataset.biblio = cfg.style; const ttl = cfg.style === 'mla' ? L[cfg.lang].mlaRefs : L[cfg.lang].refs; div.innerHTML = `<h2>${esc(ttl)}</h2>` + (refs.length ? bibliography(refs, cfg.style, cfg.lang, order).map(h => `<p>${h}</p>`).join('') : `<p>${esc(tr('Todavía no hay citas en el documento.'))}</p>`); });
    if (WR.changed) WR.changed();
    if (notify) E.toast(missing.size ? `${cites.length} ${tr('citas actualizadas')} · ⚠ ${missing.size} ${tr('sin datos en tu Gestor de referencias')}` : `${cites.length} ${tr('citas actualizadas')} · ${STYLES.find(s => s[0] === cfg.style)[1]}`);
    return { cites: cites.length, refs: refs.length, missing: missing.size };
  }
  function buildToc(body) { const hs = qa(body, 'h1,h2,h3').filter(h => !h.closest('[data-toc]')); return `<p><b>${esc(tr('Índice'))}</b></p><ol>` + hs.map((h, n) => !h.textContent.trim() ? '' : `<li data-toc-n="${n}" style="padding-left:${(+h.tagName[1] - 1) * 18}px">${esc(h.textContent.trim())}</li>`).join('') + '</ol>'; }
  function eqDialog(init = '') {
    return new Promise(res => {
      const ov = document.createElement('div'); ov.className = 'eis-modal';
      const PAL = ['\\frac{a}{b}', 'x^{2}', 'x_{i}', '\\sqrt{x}', '\\sqrt[3]{x}', '\\sum_{i=1}^{n}', '\\int_{a}^{b}', '\\lim_{x \\to 0}', '\\pi', '\\alpha', '\\beta', '\\theta', '\\Delta', '\\infty', '\\pm', '\\times', '\\div', '\\leq', '\\geq', '\\neq', '\\approx', '\\rightarrow', '\\in', '\\cdot'];
      ov.innerHTML = `<div class="eis-modal-card" style="width:min(640px,95vw);max-width:none"><h3>${esc(tr('Ecuación'))}</h3><textarea class="input-text k9-mono" data-src rows="3" style="width:100%" placeholder="x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}">${esc(init)}</textarea><div class="s10-eq-pal">${PAL.map(p => `<button type="button" class="k9-btn" data-ins="${esc(p)}">${tex(p)}</button>`).join('')}</div><div class="s10-eq-prev" data-prev></div><p class="k9-small k9-muted">${esc(tr('Sintaxis tipo LaTeX: ^ superíndice, _ subíndice, \\frac{a}{b}, \\sqrt{x}, letras griegas (\\alpha) y símbolos (\\leq, \\infty…).'))}</p><div class="eis-modal-btns"><button class="btn-secondary" data-x>${esc(tr('Cancelar'))}</button><button class="btn-primary" data-ok>${esc(tr(init ? 'Actualizar' : 'Insertar'))}</button></div></div>`;
      document.body.appendChild(ov); const ta = q(ov, '[data-src]'), pv = () => { q(ov, '[data-prev]').innerHTML = `<span data-eq="m:">${tex(ta.value)}</span>`; }; pv(); ta.oninput = pv; setTimeout(() => ta.focus(), 30);
      const done = v => { ov.remove(); res(v); };
      ov.addEventListener('click', e => { const b = e.target.closest('[data-ins]'); if (b) { const p = ta.selectionStart; ta.value = ta.value.slice(0, p) + b.dataset.ins + ta.value.slice(ta.selectionEnd); ta.focus(); ta.selectionStart = ta.selectionEnd = p + b.dataset.ins.length; pv(); } if (e.target.closest('[data-x]') || e.target === ov) done(null); if (e.target.closest('[data-ok]')) done(ta.value.trim() || null); });
    });
  }
  const eqHtml = src => `<span data-eq="m:${encodeURIComponent(src)}">${tex(src)}</span>`;
  K.ext.writer10 = {
    async cite(WR) { const r = await pickRefs({ title: tr('Insertar cita'), page: true }); if (!r) return; const cfg = wrCfg(), refs = r.ids.map(id => lib().items.find(x => x.id === id)).filter(Boolean); (WR.insertFrag || WR.insertHTML)(`<span data-cite="${esc(r.ids.join(',') + (r.page ? '|' + r.page.replace(/\|/g, '/').slice(0, 30) : ''))}">${esc(citeText(refs, cfg.style, cfg.lang, {}, r.page))}</span>&nbsp;`); refreshDoc(WR, false); },
    async biblio(WR) { const body = WR.body; if (!q(body, 'div[data-biblio]')) (WR.insertFrag || WR.insertHTML)(`<div data-biblio="${wrCfg().style}"><h2>…</h2></div><p><br></p>`); refreshDoc(WR, true); },
    refresh: (WR, notify) => refreshDoc(WR, notify),
    async style(WR) { const c = wrCfg(); const r = await E.form({ title: tr('Estilo de citas del documento'), ok: tr('Aplicar'), fields: [{ k: 'style', label: tr('Estilo'), type: 'select', value: c.style, options: STYLES }, { k: 'lang', label: tr('Idioma de la bibliografía'), type: 'select', value: c.lang, options: [['es', 'Español'], ['en', 'English']] }] }); if (!r) return; S.set(WRK, { style: r.style, lang: r.lang }); refreshDoc(WR, true); },
    toc(WR) { const body = WR.body, ex = qa(body, 'div[data-toc]'); if (ex.length) ex.forEach(d => { d.innerHTML = buildToc(body); }); else (WR.insertFrag || WR.insertHTML)(`<div data-toc="1">${buildToc(body)}</div>`); if (WR.changed) WR.changed(); const n = qa(body, 'div[data-toc] li').length; E.toast(n ? n + ' ' + tr('títulos en el índice') : tr('Usa los estilos «Título 1, 2 y 3» para que aparezcan en el índice')); },
    async equation(WR, span) { const src = span ? decodeURIComponent((span.dataset.eq || '').slice(2)) : ''; const v = await eqDialog(src); if (!v) return; if (span) { span.dataset.eq = 'm:' + encodeURIComponent(v); span.innerHTML = K.sanitize(tex(v), { style: true }); if (WR.changed) WR.changed(); } else (WR.insertFrag || WR.insertHTML)(eqHtml(v) + '&nbsp;'); },
    tex, eqHtml
  };

  /* ===================== Gestor de referencias ===================== */
  const FIELDS = { // campos visibles por tipo
    article: ['container', 'volume', 'issue', 'pages', 'doi', 'url'], book: ['publisher', 'place', 'edition', 'isbn', 'doi', 'url'], chapter: ['container', 'editors', 'pages', 'publisher', 'place', 'edition', 'isbn', 'doi'], web: ['container', 'month', 'day', 'url', 'accessed'], thesis: ['genre', 'publisher', 'place', 'url'], report: ['number', 'publisher', 'place', 'url', 'doi'], conference: ['container', 'editors', 'pages', 'publisher', 'place', 'doi'], video: ['container', 'month', 'day', 'url', 'accessed'], other: ['container', 'publisher', 'url']
  };
  const FL = { container: 'Revista, libro, sitio o plataforma', volume: 'Volumen', issue: 'Número', pages: 'Páginas (12–34)', doi: 'DOI', url: 'Dirección web', publisher: 'Editorial o institución', place: 'Ciudad', edition: 'Edición (número)', isbn: 'ISBN', editors: 'Editores (uno por línea: Apellido, Nombre)', month: 'Mes (1-12)', day: 'Día', accessed: 'Fecha de consulta', genre: 'Tipo de tesis (doctoral, maestría…)', number: 'Número de informe' };
  async function editRef(r0, preset) {
    const r = Object.assign({ type: 'article', authors: [], editors: [], tags: [] }, r0 || {}, preset || {}), type = r.type;
    const fields = [{ k: 'type', label: tr('Tipo'), type: 'select', value: type, options: REF_TYPES.map(([v, l]) => [v, tr(l)]) }, { k: 'title', label: tr('Título'), value: r.title || '', req: true }, { k: 'authors', label: tr('Autores (uno por línea: Apellido, Nombre · organizaciones entre llaves {OMS})'), type: 'textarea', value: namesText(r.authors) }, { k: 'year', label: tr('Año'), value: r.year || '' }]
      .concat((FIELDS[type] || []).map(k => ({ k, label: tr(FL[k]), type: k === 'editors' ? 'textarea' : k === 'accessed' ? 'date' : 'text', value: k === 'editors' ? namesText(r.editors) : r[k] || '' })))
      .concat([{ k: 'tags', label: tr('Etiquetas (separadas por comas)'), value: (r.tags || []).join(', ') }, { k: 'notes', label: tr('Notas'), type: 'textarea', value: r.notes || '' }]);
    const v = await E.form({ title: tr(r0 ? 'Editar referencia' : 'Nueva referencia'), ok: tr('Guardar'), fields }); if (!v) return null;
    if (v.type !== type) return editRef(r0, Object.assign({}, r, v, { authors: parseNames(v.authors), editors: v.editors != null ? parseNames(v.editors) : r.editors, tags: v.tags.split(',') }));
    const o = clean(Object.assign({}, r, v, { authors: parseNames(v.authors), editors: v.editors != null ? parseNames(v.editors) : r.editors || [], tags: v.tags.split(',') }));
    const d = lib(), i = d.items.findIndex(x => x.id === o.id); if (i >= 0) d.items[i] = o; else d.items.unshift(o); libSave(d); return o;
  }
  K.define('refs', {
    init(b) {
      b.innerHTML = `<div class="k9 s10-refs"><div class="k9-bar"><button class="k9-btn pri" data-a="new">${I('plus', 14)} ${esc(tr('Nueva'))}</button><button class="k9-btn" data-a="doi">${I('search', 14)} DOI / ISBN</button><button class="k9-btn" data-a="import">${I('upload', 14)} ${esc(tr('Importar'))}</button><button class="k9-btn" data-a="export">${I('download', 14)} ${esc(tr('Exportar'))}</button><span class="sp"></span><button class="k9-btn" data-a="dups">${I('layers', 14)} ${esc(tr('Duplicados'))}</button><button class="k9-btn" data-a="bib">${I('edit', 14)} ${esc(tr('Bibliografía'))}</button></div><div class="s10-refs-main"><aside class="s10-refs-side" data-side></aside><section class="s10-refs-list"><input class="input-text" data-q placeholder="${esc(tr('Buscar en la biblioteca…'))}"><div data-list></div></section><section class="s10-refs-det" data-det></section></div></div>`;
      let filt = { coll: '', tag: '', type: '' }, cur = null;
      const side = q(b, '[data-side]'), list = q(b, '[data-list]'), det = q(b, '[data-det]');
      function draw() {
        const d = lib(), tags = [...new Set(d.items.flatMap(r => r.tags || []))].sort(), nq = K.norm(q(b, '[data-q]').value.trim());
        side.innerHTML = `<button class="${!filt.coll && !filt.tag && !filt.type ? 'on' : ''}" data-f="all">${I('book', 14)} ${esc(tr('Toda la biblioteca'))} <small>${d.items.length}</small></button><b class="k9-small k9-muted">${esc(tr('Colecciones'))}</b>${d.colls.map(c => `<button class="${filt.coll === c.id ? 'on' : ''}" data-f="coll:${esc(c.id)}">${I('folder', 14)} ${esc(c.name)} <small>${d.items.filter(r => (r.colls || []).includes(c.id)).length}</small></button>`).join('')}<button data-a="newcoll" class="k9-small">＋ ${esc(tr('Nueva colección'))}</button><b class="k9-small k9-muted">${esc(tr('Tipos'))}</b>${REF_TYPES.filter(([t]) => d.items.some(r => r.type === t)).map(([t, l]) => `<button class="${filt.type === t ? 'on' : ''}" data-f="type:${t}">${esc(tr(l))} <small>${d.items.filter(r => r.type === t).length}</small></button>`).join('')}${tags.length ? `<b class="k9-small k9-muted">${esc(tr('Etiquetas'))}</b><div class="s10-tagcloud">${tags.map(t => `<button class="k9-badge ${filt.tag === t ? 'g' : ''}" data-f="tag:${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}`;
        const items = d.items.filter(r => (!filt.coll || (r.colls || []).includes(filt.coll)) && (!filt.tag || (r.tags || []).includes(filt.tag)) && (!filt.type || r.type === filt.type) && (!nq || K.norm([r.title, r.year, r.container, r.doi, r.isbn, (r.authors || []).map(a => fam(a) + ' ' + (a.given || '')).join(' '), (r.tags || []).join(' ')].join(' ')).includes(nq)));
        list.innerHTML = items.length ? items.map(r => `<button class="s10-ref ${cur === r.id ? 'on' : ''}" data-id="${esc(r.id)}"><b>${esc(r.title || tr('Sin título'))}</b><small>${esc((r.authors || []).slice(0, 3).map(fam).join(', ') + ((r.authors || []).length > 3 ? ' et al.' : ''))} · ${esc(r.year || 's.f.')}${r.fileId ? ' · 📎' : ''}</small></button>`).join('') : `<div class="k9-state">${I('book', 36)}<p>${esc(tr(d.items.length ? 'Nada coincide con el filtro.' : 'Tu biblioteca está vacía. Añade una referencia, búscala por DOI o ISBN, o importa un archivo BibTeX, RIS o CSL-JSON.'))}</p></div>`;
        drawDet();
      }
      function drawDet() {
        const r = cur && lib().items.find(x => x.id === cur); if (!r) { det.innerHTML = `<div class="k9-state">${I('info', 30)}<p class="k9-small">${esc(tr('Elige una referencia para ver sus datos y su cita.'))}</p></div>`; return; }
        const c = wrCfg(), colls = lib().colls;
        det.innerHTML = `<h3>${esc(r.title || '')}</h3><p class="k9-small k9-muted">${esc(tr((REF_TYPES.find(t => t[0] === r.type) || [, ''])[1]))}</p>${U.kv([['Autores', (r.authors || []).map(a => a.literal || a.family + (a.given ? ', ' + a.given : '')).join('; ')], ['Año', r.year], ['Fuente', r.container], ['Editorial', r.publisher], ['Volumen y número', [r.volume, r.issue && '(' + r.issue + ')'].filter(Boolean).join(' ')], ['Páginas', r.pages], ['DOI', r.doi], ['ISBN', r.isbn], ['Dirección', r.url]].filter(x => x[1]))}<div class="k9-card" style="margin-top:10px"><small class="k9-muted">${esc(STYLES.find(s => s[0] === c.style)[1])}</small><p class="s10-refprev">${K.cite.format(r, c.style, c.lang, 1)}</p><small class="k9-muted">${esc(tr('En el texto'))}: ${esc(citeText([r], c.style, c.lang, { [r.id]: 1 }))}</small></div>${r.notes ? `<p class="k9-small" style="white-space:pre-wrap;margin-top:8px">${esc(r.notes)}</p>` : ''}<div class="k9-row" style="margin-top:8px;flex-wrap:wrap">${(r.tags || []).map(t => `<span class="k9-badge">${esc(t)}</span>`).join('')}</div><div class="k9-row" style="margin-top:10px;flex-wrap:wrap"><button class="k9-btn pri" data-a="edit">${I('edit', 13)} ${esc(tr('Editar'))}</button><button class="k9-btn" data-a="copycite">${I('copy', 13)} ${esc(tr('Copiar referencia'))}</button>${link(r) ? `<button class="k9-btn" data-a="openurl">${I('globe', 13)} ${esc(tr('Abrir'))}</button>` : ''}${r.fileId ? `<button class="k9-btn" data-a="openfile">📎 ${esc(tr('Abrir PDF'))}</button>` : ''}<button class="k9-btn" data-a="linkfile">${I('file', 13)} ${esc(tr(r.fileId ? 'Cambiar archivo' : 'Enlazar archivo'))}</button>${colls.length ? `<select class="input-text" data-addcoll><option value="">${esc(tr('Añadir a colección…'))}</option>${colls.map(cc => `<option value="${esc(cc.id)}">${(r.colls || []).includes(cc.id) ? '✓ ' : ''}${esc(cc.name)}</option>`).join('')}</select>` : ''}<button class="k9-btn dng" data-a="del">${I('trash', 13)}</button></div>`;
      }
      async function importText(txt, name) { let items = []; const t = txt.trim(); try { if (/^[[{]/.test(t)) items = fromCsl(JSON.parse(t)); else if (/^\s*TY\s{2}-/m.test(t)) items = parseRis(t); else if (/@\w+\s*[{(]/.test(t)) items = parseBibtex(t); } catch (e) { E.toast(tr('No se pudo leer') + ': ' + e.message); return; } if (!items.length) return E.toast(tr('No se encontraron referencias en') + ' ' + (name || tr('el texto'))); const n = K.refsLib.add(items); E.toast(`${n} ${tr('referencias importadas')}${items.length - n ? ' · ' + (items.length - n) + ' ' + tr('duplicadas omitidas') : ''}`); K.log('info', 'refs', `Importadas ${n} referencias (${name || 'texto'})`); draw(); }
      b.addEventListener('input', U.debounce(e => { if (e.target.matches('[data-q]')) draw(); }, 160));
      b.addEventListener('change', e => { const s = e.target.closest('[data-addcoll]'); if (s && s.value && cur) { const d = lib(), r = d.items.find(x => x.id === cur); r.colls = (r.colls || []).includes(s.value) ? r.colls.filter(x => x !== s.value) : (r.colls || []).concat(s.value); libSave(d); draw(); } });
      b.addEventListener('click', async e => {
        const f = e.target.closest('[data-f]'); if (f) { const [k, v] = f.dataset.f.split(/:(.*)/); filt = { coll: '', tag: '', type: '' }; if (k !== 'all') filt[k] = v; draw(); return; }
        const it = e.target.closest('[data-id]'); if (it && list.contains(it)) { cur = it.dataset.id; qa(list, '.s10-ref').forEach(x => x.classList.toggle('on', x === it)); drawDet(); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a, d = lib(), r = cur && d.items.find(x => x.id === cur);
        if (k === 'new') { const o = await editRef(null); if (o) { cur = o.id; draw(); } }
        if (k === 'edit' && r) { await editRef(r); draw(); }
        if (k === 'del' && r && await E.confirm(tr('Eliminar referencia'), r.title)) { d.items = d.items.filter(x => x.id !== r.id); libSave(d); cur = null; draw(); }
        if (k === 'copycite' && r) { const c = wrCfg(); K.ui.copy(strip(K.cite.format(r, c.style, c.lang, 1))); }
        if (k === 'openurl' && r) { if (E.ebOpenUrl) { E.ebOpenUrl(link(r), true); E.launch('browser'); } }
        if (k === 'openfile' && r) F.open(r.fileId);
        if (k === 'linkfile' && r) { const fl = await U.pickBlob({ title: tr('Archivo de la referencia (PDF u otro)') }); if (fl) { r.fileId = fl.id; libSave(d); draw(); } }
        if (k === 'newcoll') { const v = await E.form({ title: tr('Nueva colección'), fields: [{ k: 'n', label: tr('Nombre'), req: true }] }); if (v) { d.colls.push({ id: E.uid(), name: v.n.trim().slice(0, 40) }); libSave(d); draw(); } }
        if (k === 'doi') { const v = await E.form({ title: tr('Buscar por DOI o ISBN'), ok: tr('Buscar'), fields: [{ k: 'id', label: tr('DOI (10.xxxx/…) o ISBN'), req: true }] }); if (!v) return; try { E.toast(tr('Buscando…')); const id = v.id.trim(), o = /^(10\.|https?:\/\/(dx\.)?doi)/i.test(id) ? await byDoi(id) : await byIsbn(id); const saved = await editRef(null, o); if (saved) { cur = saved.id; draw(); K.log('ok', 'refs', 'Referencia obtenida por ' + (/^10|doi/i.test(id) ? 'DOI' : 'ISBN')); } } catch (er) { E.toast(er.message === 'Failed to fetch' ? tr('Sin conexión con el servicio de búsqueda') : er.message); } }
        if (k === 'import') { const r2 = await E.form({ title: tr('Importar referencias'), ok: tr('Importar'), fields: [{ k: 't', label: tr('Pega BibTeX, RIS o CSL-JSON (o déjalo vacío para elegir un archivo)'), type: 'textarea' }] }); if (!r2) return; if (r2.t.trim()) return importText(r2.t); const fl = await U.pickBlob({ title: tr('Archivo .bib, .ris o .json'), accept: x => /\.(bib|ris|json|txt)$/i.test(x.name), deviceAccept: '.bib,.ris,.json,.txt' }); if (fl) importText(await fl.blob.text(), fl.name); }
        if (k === 'export') { const items = d.items.filter(x => (!filt.coll || (x.colls || []).includes(filt.coll)) && (!filt.tag || (x.tags || []).includes(filt.tag)) && (!filt.type || x.type === filt.type)); if (!items.length) return E.toast(tr('No hay referencias que exportar')); const rr = a.getBoundingClientRect(); K.ui.menu(rr.left, rr.bottom + 4, [['BibTeX (.bib)', 'bib', () => toBibtex(items), 'application/x-bibtex'], ['RIS (.ris)', 'ris', () => toRis(items), 'application/x-research-info-systems'], ['CSL-JSON (.json)', 'json', () => JSON.stringify(toCsl(items), null, 2), 'application/json']].map(([lb, ext, fn, mime]) => ({ label: lb + ' · ' + items.length, icon: '⬇', act: async () => { const blob = new Blob([fn()], { type: mime }); await U.saveBlob('Referencias.' + ext, blob, 'documents'); } }))); }
        if (k === 'dups') { const groups = {}; d.items.forEach(x => { (groups[dupKey(x)] = groups[dupKey(x)] || []).push(x); }); const g = Object.values(groups).filter(l => l.length > 1); if (!g.length) return E.toast(tr('No hay referencias duplicadas')); if (await E.confirm(tr('Fusionar duplicados'), g.length + ' ' + tr('grupos de duplicados (mismo DOI, ISBN o título y año). Se conservará la versión con más datos y se unirán etiquetas y colecciones.'))) { const keep = []; g.forEach(l => { const best = l.slice().sort((x, y) => Object.keys(y).length - Object.keys(x).length)[0]; best.tags = [...new Set(l.flatMap(x => x.tags || []))]; best.colls = [...new Set(l.flatMap(x => x.colls || []))]; keep.push(best.id); }); const drop = new Set(g.flat().map(x => x.id).filter(id => !keep.includes(id))); d.items = d.items.filter(x => !drop.has(x.id)); libSave(d); E.toast(drop.size + ' ' + tr('duplicados fusionados')); draw(); } }
        if (k === 'bib') E.launch('bibgen');
      });
      const off = K.on('refs', () => { if (b.offsetParent) draw(); }); draw(); this.onOpen = draw; this.destroy = off;
    }
  });

  /* ===================== Generador de bibliografía ===================== */
  K.define('bibgen', {
    init(b) {
      const cfg = K.cfg('bibgen', { style: 'apa', lang: 'es', sel: [] });
      b.innerHTML = `<div class="k9"><div class="k9-bar"><select class="input-text" data-style>${STYLES.map(([v, l]) => `<option value="${v}"${v === cfg.get('style') ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select><select class="input-text" data-lang><option value="es"${cfg.get('lang') === 'es' ? ' selected' : ''}>Español</option><option value="en"${cfg.get('lang') === 'en' ? ' selected' : ''}>English</option></select><button class="k9-btn" data-a="pick">${I('book', 14)} ${esc(tr('Elegir de la biblioteca'))}</button><button class="k9-btn" data-a="quick">${I('plus', 14)} ${esc(tr('Referencia rápida'))}</button><span class="sp"></span><button class="k9-btn pri" data-a="writer">${I('edit', 14)} ${esc(tr('Insertar en Writer'))}</button><button class="k9-btn" data-a="copy">${I('copy', 14)} ${esc(tr('Copiar'))}</button><button class="k9-btn" data-a="save">${I('save', 14)} ${esc(tr('Guardar'))}</button></div><div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]');
      const refs = () => cfg.get('sel').map(id => lib().items.find(r => r.id === id)).filter(Boolean);
      function draw() {
        const st = cfg.get('style'), lg = cfg.get('lang'), R = refs(), order = R.map(r => r.id), nums = Object.fromEntries(order.map((id, i) => [id, i + 1])), bib = bibliography(R, st, lg, order);
        V.innerHTML = R.length ? `<div class="k9-card"><h4>${I('book', 16)} ${esc(st === 'mla' ? L[lg].mlaRefs : L[lg].refs)} · ${esc(STYLES.find(s => s[0] === st)[1])}</h4><div class="s10-biblist">${bib.map(h => `<p>${h}</p>`).join('')}</div></div><div class="k9-card"><h4>${I('edit', 16)} ${esc(tr('Citas en el texto'))}</h4><table class="k9-table"><tbody>${R.map(r => `<tr><td class="k9-small" style="max-width:340px">${esc(r.title || '')}</td><td><code>${esc(citeText([r], st, lg, nums))}</code></td><td><button class="k9-btn" data-rm="${esc(r.id)}" aria-label="${esc(tr('Quitar'))}">✕</button></td></tr>`).join('')}</tbody></table>${R.length > 1 ? `<p class="k9-small" style="margin-top:8px">${esc(tr('Todas juntas'))}: <code>${esc(citeText(R, st, lg, nums))}</code></p>` : ''}</div>` : `<div class="k9-state">${I('edit', 40)}<p>${esc(tr('Elige referencias de tu biblioteca o crea una referencia rápida para obtener la bibliografía en el estilo que necesites.'))}</p></div>`;
      }
      b.addEventListener('change', e => { if (e.target.matches('[data-style]')) { cfg.set('style', e.target.value); draw(); } if (e.target.matches('[data-lang]')) { cfg.set('lang', e.target.value); draw(); } });
      b.addEventListener('click', async e => {
        const rm = e.target.closest('[data-rm]'); if (rm) { cfg.set('sel', cfg.get('sel').filter(x => x !== rm.dataset.rm)); draw(); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a, st = cfg.get('style'), lg = cfg.get('lang'), R = refs(), order = R.map(r => r.id), bib = bibliography(R, st, lg, order), ttl = st === 'mla' ? L[lg].mlaRefs : L[lg].refs;
        if (k === 'pick') { const r = await pickRefs({ title: tr('Referencias para la bibliografía'), ok: 'Añadir' }); if (r) { cfg.set('sel', [...new Set(cfg.get('sel').concat(r.ids))]); draw(); } }
        if (k === 'quick') { const o = await editRef(null); if (o) { cfg.set('sel', cfg.get('sel').concat(o.id)); draw(); E.toast(tr('Guardada también en tu Gestor de referencias')); } }
        if (!R.length && ['writer', 'copy', 'save'].includes(k)) return E.toast(tr('Añade al menos una referencia'));
        if (k === 'copy') { const html = `<h2>${esc(ttl)}</h2>` + bib.map(h => `<p>${h}</p>`).join(''); try { await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([ttl + '\n\n' + bib.map(strip).join('\n\n')], { type: 'text/plain' }) })]); E.toast(tr('Copiada con formato (cursivas incluidas)')); } catch { K.ui.copy(ttl + '\n\n' + bib.map(strip).join('\n\n')); } }
        if (k === 'save') { const html = `<!doctype html><meta charset="utf-8"><title>${esc(ttl)}</title><style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;line-height:1.6}p{padding-left:2em;text-indent:-2em}</style><h2>${esc(ttl)}</h2>` + bib.map(h => `<p>${h}</p>`).join(''); await U.saveBlob(ttl + ' (' + STYLES.find(s => s[0] === st)[1] + ').html', new Blob([html], { type: 'text/html' }), 'documents'); }
        if (k === 'writer') { const WR = E.writer; if (!WR || !WR.insertHTML) return E.toast(tr('Writer no está disponible')); E.openWindow('word'); await new Promise(r => setTimeout(r, 120)); (WR.insertFrag || WR.insertHTML)(`<h2>${esc(ttl)}</h2>` + bib.map(h => `<p style="padding-left:2em">${h}</p>`).join('') + '<p><br></p>'); E.toast(tr('Bibliografía insertada en Writer')); }
      });
      draw(); this.onOpen = draw;
    }
  });

  /* ===================== Organizador de documentos académicos ===================== */
  const DK = 'os10_docorg', DTYPES = ['Trabajo', 'Apuntes', 'Lectura', 'Examen', 'Proyecto', 'Presentación', 'Práctica', 'Otro'], DST = [['pend', 'Pendiente', ''], ['draft', 'Borrador', 'w'], ['done', 'Entregado', 'p'], ['graded', 'Calificado', 'g']];
  const dorg = () => { const d = S.get(DK, null) || {}; return { items: Array.isArray(d.items) ? d.items : [] }; }, dsave = d => S.set(DK, d);
  K.define('docorg', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-bar"><button class="k9-btn pri" data-a="new">${I('plus', 14)} ${esc(tr('Nuevo'))}</button><input class="input-text" data-q placeholder="${esc(tr('Buscar…'))}" style="flex:1;min-width:120px"><select class="input-text" data-fs></select><select class="input-text" data-fp></select><select class="input-text" data-fst><option value="">${esc(tr('Todos los estados'))}</option>${DST.map(([v, l]) => `<option value="${v}">${esc(tr(l))}</option>`).join('')}</select><button class="k9-btn" data-a="csv">${I('download', 14)} CSV</button></div>${U.tabs([['list', 'Por materia', 'list'], ['next', 'Próximas entregas', 'calendar'], ['stats', 'Resumen', 'chart']], 'list')}<div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]'); let tab = 'list';
      const opts = (sel, vals, all) => { const cur = sel.value; sel.innerHTML = `<option value="">${esc(tr(all))}</option>` + vals.map(v => `<option${v === cur ? ' selected' : ''}>${esc(v)}</option>`).join(''); };
      const dueTxt = x => { if (!x.due) return ''; const t0 = new Date(); t0.setHours(0, 0, 0, 0); const d = Math.round((new Date(x.due + 'T00:00') - t0) / 864e5); return x.status === 'done' || x.status === 'graded' ? '' : d < 0 ? badge('Vencido hace ' + (-d) + ' d', 'd') : d === 0 ? badge('Hoy', 'w') : d <= 3 ? badge('En ' + d + ' d', 'w') : badge('En ' + d + ' d'); };
      function filtered() { const d = dorg(), nq = K.norm(q(b, '[data-q]').value.trim()), s = q(b, '[data-fs]').value, p = q(b, '[data-fp]').value, st = q(b, '[data-fst]').value; return d.items.filter(x => (!s || x.subject === s) && (!p || x.period === p) && (!st || x.status === st) && (!nq || K.norm([x.title, x.subject, x.type, x.notes].join(' ')).includes(nq))); }
      function draw(tb = tab) {
        tab = tb; const d = dorg(); opts(q(b, '[data-fs]'), [...new Set(d.items.map(x => x.subject).filter(Boolean))].sort(), 'Todas las materias'); opts(q(b, '[data-fp]'), [...new Set(d.items.map(x => x.period).filter(Boolean))].sort(), 'Todos los periodos');
        const l = filtered(), row = x => { const st = DST.find(s => s[0] === x.status) || DST[0]; return `<div class="k9-li s10-doc"><div class="t"><b>${esc(x.title)}</b><small>${esc(tr(x.type || 'Otro'))}${x.period ? ' · ' + esc(x.period) : ''}${x.due ? ' · ' + esc(tr('entrega')) + ' ' + esc(new Date(x.due + 'T12:00').toLocaleDateString(K.locale)) : ''}${x.grade ? ' · ' + esc(tr('nota')) + ' ' + esc(x.grade) : ''}${(x.files || []).length ? ' · 📎' + x.files.length : ''}</small></div>${dueTxt(x)} ${badge(st[1], st[2])}<button class="k9-btn" data-edit="${esc(x.id)}">${I('edit', 13)}</button></div>`; };
        if (tab === 'list') { const by = {}; l.forEach(x => { (by[x.subject || tr('Sin materia')] = by[x.subject || tr('Sin materia')] || []).push(x); }); V.innerHTML = Object.keys(by).length ? Object.entries(by).sort().map(([s, xs]) => `<div class="k9-card"><h4>${I('book', 16)} ${esc(s)} <span class="k9-badge">${xs.length}</span></h4>${xs.sort((a, c) => (a.due || '9') .localeCompare(c.due || '9')).map(row).join('')}</div>`).join('') : `<div class="k9-state">${I('book', 40)}<p>${esc(tr(d.items.length ? 'Nada coincide con el filtro.' : 'Organiza tus trabajos, apuntes y lecturas por materia. Enlaza los archivos de EISENKU y lleva el estado de cada entrega.'))}</p></div>`; }
        else if (tab === 'next') { const nx = l.filter(x => x.due && x.status !== 'done' && x.status !== 'graded').sort((a, c) => a.due.localeCompare(c.due)); V.innerHTML = nx.length ? card('calendar', 'Próximas entregas', nx.map(row).join('')) : `<div class="k9-state">${I('check', 36)}<p>${esc(tr('No tienes entregas pendientes con fecha.'))}</p></div>`; }
        else { const subj = [...new Set(l.map(x => x.subject || tr('Sin materia')))].sort(); V.innerHTML = `<div class="k9-grid" style="--min:140px">${U.kpi(l.length, 'Documentos')}${U.kpi(l.filter(x => x.status === 'pend' || x.status === 'draft').length, 'Por entregar')}${U.kpi(l.filter(x => x.due && x.status !== 'done' && x.status !== 'graded' && new Date(x.due + 'T23:59') < Date.now()).length, 'Vencidos')}${U.kpi(l.filter(x => x.status === 'graded').length, 'Calificados')}</div>` + card('chart', 'Por materia', `<table class="k9-table"><thead><tr><th>${esc(tr('Materia'))}</th><th>${esc(tr('Documentos'))}</th><th>${esc(tr('Entregados'))}</th><th>${esc(tr('Nota media'))}</th></tr></thead><tbody>${subj.map(s => { const xs = l.filter(x => (x.subject || tr('Sin materia')) === s), g = xs.map(x => parseFloat(String(x.grade || '').replace(',', '.'))).filter(n => !isNaN(n)); return `<tr><td>${esc(s)}</td><td>${xs.length}</td><td>${xs.filter(x => x.status === 'done' || x.status === 'graded').length}</td><td>${g.length ? (g.reduce((a, c) => a + c, 0) / g.length).toFixed(2) : '—'}</td></tr>`; }).join('')}</tbody></table>`); }
      }
      async function edit(x0) {
        const d = dorg(), subs = [...new Set(d.items.map(x => x.subject).filter(Boolean))];
        const r = await E.form({ title: tr(x0 ? 'Editar documento' : 'Nuevo documento'), ok: tr('Guardar'), fields: [{ k: 'title', label: tr('Título'), value: x0 ? x0.title : '', req: true }, { k: 'subject', label: tr('Materia') + (subs.length ? ' (' + subs.slice(0, 5).join(', ') + ')' : ''), value: x0 ? x0.subject : '' }, { k: 'period', label: tr('Curso o periodo (ej. 2026-1)'), value: x0 ? x0.period || '' : '' }, { k: 'type', label: tr('Tipo'), type: 'select', value: x0 ? x0.type : 'Trabajo', options: DTYPES.map(t => [t, tr(t)]) }, { k: 'status', label: tr('Estado'), type: 'select', value: x0 ? x0.status : 'pend', options: DST.map(([v, l]) => [v, tr(l)]) }, { k: 'due', label: tr('Fecha de entrega'), type: 'date', value: x0 ? x0.due || '' : '' }, { k: 'grade', label: tr('Calificación'), value: x0 ? x0.grade || '' : '' }, { k: 'notes', label: tr('Notas'), type: 'textarea', value: x0 ? x0.notes || '' : '' }] });
        if (!r) return; const l = d.items, x = x0 ? l.find(z => z.id === x0.id) : { id: E.uid(), files: [], created: Date.now() }; Object.assign(x, { title: r.title.trim().slice(0, 160), subject: r.subject.trim().slice(0, 60), period: r.period.trim().slice(0, 30), type: r.type, status: r.status, due: /^\d{4}-\d\d-\d\d$/.test(r.due) ? r.due : '', grade: r.grade.trim().slice(0, 10), notes: r.notes.slice(0, 4000), mod: Date.now() }); if (!x0) l.unshift(x); dsave(d); draw(); return x;
      }
      function detail(x) {
        const ov = document.createElement('div'); ov.className = 'eis-modal';
        const paint = async () => { const files = []; for (const id of x.files || []) { const f = await F.get(id); if (f && !f.trash) files.push(f); } ov.innerHTML = `<div class="eis-modal-card" style="width:min(620px,95vw);max-width:none"><h3>${esc(x.title)}</h3><p class="k9-small k9-muted">${esc(x.subject || '')} · ${esc(tr(x.type || ''))}</p>${x.notes ? `<p class="k9-small" style="white-space:pre-wrap">${esc(x.notes)}</p>` : ''}<h4 style="margin-top:10px">${esc(tr('Archivos enlazados'))}</h4>${files.map(f => `<div class="k9-li"><div class="t"><b>${esc(f.name)}</b><small>${esc(F.pretty(f.folder))}</small></div><button class="k9-btn" data-of="${esc(f.id)}">${esc(tr('Abrir'))}</button><button class="k9-btn dng" data-uf="${esc(f.id)}">✕</button></div>`).join('') || `<p class="k9-small k9-muted">${esc(tr('Ninguno todavía.'))}</p>`}<div class="eis-modal-btns" style="flex-wrap:wrap"><button class="btn-secondary" data-lf>${esc(tr('Enlazar archivo…'))}</button><button class="btn-secondary" data-cal>${esc(tr('Añadir al Calendario'))}</button><button class="btn-secondary" data-task>${esc(tr('Crear tarea'))}</button><button class="btn-secondary" data-ed>${esc(tr('Editar'))}</button><button class="btn-secondary" data-del>${esc(tr('Eliminar'))}</button><button class="btn-primary" data-x>${esc(tr('Cerrar'))}</button></div></div>`; };
        document.body.appendChild(ov); paint();
        ov.addEventListener('click', async e => { const d = dorg(), cur = d.items.find(z => z.id === x.id) || x; if (e.target.closest('[data-x]') || e.target === ov) { ov.remove(); return; } const of = e.target.closest('[data-of]'); if (of) F.open(of.dataset.of); const uf = e.target.closest('[data-uf]'); if (uf) { cur.files = cur.files.filter(id => id !== uf.dataset.uf); dsave(d); x = cur; paint(); draw(); }
          if (e.target.closest('[data-lf]')) { const f = await U.pickBlob({ title: tr('Archivo para') + ' «' + cur.title + '»' }); if (f && !(cur.files || []).includes(f.id)) { cur.files = (cur.files || []).concat(f.id); dsave(d); x = cur; paint(); draw(); } }
          if (e.target.closest('[data-cal]')) { if (!cur.due) return E.toast(tr('Pon primero una fecha de entrega')); E.addEvent('📚 ' + cur.title + (cur.subject ? ' (' + cur.subject + ')' : ''), cur.due); E.toast(tr('Añadido al Calendario')); }
          if (e.target.closest('[data-task]')) { E.addTask(cur.title + (cur.subject ? ' · ' + cur.subject : ''), cur.due || ''); E.toast(tr('Tarea creada')); }
          if (e.target.closest('[data-ed]')) { ov.remove(); const nx = await edit(cur); if (nx) detail(nx); }
          if (e.target.closest('[data-del]') && await E.confirm(tr('Eliminar documento'), cur.title + ' · ' + tr('los archivos enlazados no se borran'))) { d.items = d.items.filter(z => z.id !== cur.id); dsave(d); ov.remove(); draw(); } });
      }
      tabber(b, draw);
      b.addEventListener('input', U.debounce(e => { if (e.target.matches('[data-q]')) draw(); }, 160));
      b.addEventListener('change', e => { if (e.target.matches('[data-fs],[data-fp],[data-fst]')) draw(); });
      b.addEventListener('click', async e => { const ed = e.target.closest('[data-edit]'); if (ed) { const x = dorg().items.find(z => z.id === ed.dataset.edit); if (x) detail(x); return; } const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'new') { const x = await edit(null); if (x) detail(x); } if (a.dataset.a === 'csv') K.ui.download('EISENKU_documentos.csv', '\ufefftitulo;materia;periodo;tipo;estado;entrega;nota;archivos;notas\n' + filtered().map(x => [x.title, x.subject, x.period, x.type, (DST.find(s => s[0] === x.status) || DST[0])[1], x.due, x.grade, (x.files || []).length, x.notes].map(csvCell).join(';')).join('\n'), 'text/csv'); });
      draw(); this.onOpen = () => draw();
    }
  });

  /* ===================== Ideas rápidas ===================== */
  const IK = 'ideas_list', COLORS = ['', '#34a582', '#e8709f', '#6a9fd8', '#d9a03a', '#8a74c4'];
  const ideas = () => (S.get(IK, []) || []).filter(x => x && x.id), isave = l => { S.set(IK, l.slice(0, 2000)); K.emit('ideas'); };
  K.define('ideas', {
    init(b) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      b.innerHTML = `<div class="k9"><div class="s10-idea-in"><textarea class="input-text" data-new rows="2" placeholder="${esc(tr('Escribe una idea… (Ctrl+Intro para guardar; #etiqueta para etiquetar)'))}"></textarea><div class="k9-row"><button class="k9-btn pri" data-a="add">${I('plus', 14)} ${esc(tr('Guardar idea'))}</button>${SR ? `<button class="k9-btn" data-a="voice">${I('mic', 14)} ${esc(tr('Dictar'))}</button>` : ''}<span class="sp"></span><input class="input-text" data-q placeholder="${esc(tr('Buscar…'))}" style="width:160px"><select class="input-text" data-f><option value="open">${esc(tr('Pendientes'))}</option><option value="done">${esc(tr('Hechas'))}</option><option value="all">${esc(tr('Todas'))}</option></select><button class="k9-btn" data-a="md">${I('download', 14)} Markdown</button></div><div class="k9-small k9-muted">${esc(tr('Captura desde cualquier lugar con Ctrl+Alt+I.'))}</div></div><div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]'); let rec = null, tagF = '';
      const tagsOf = t => [...new Set((t.match(/#[\p{L}\p{N}_-]+/gu) || []).map(x => x.slice(1).toLowerCase()))];
      function draw() {
        const f = q(b, '[data-f]').value, nq = K.norm(q(b, '[data-q]').value.trim()), all = ideas(), tags = [...new Set(all.flatMap(x => x.tags || []))].sort();
        const l = all.filter(x => (f === 'all' || (f === 'done' ? x.done : !x.done)) && (!tagF || (x.tags || []).includes(tagF)) && (!nq || K.norm(x.text).includes(nq))).sort((a, c) => c.t - a.t);
        V.innerHTML = (tags.length ? `<div class="s10-tagcloud" style="margin-bottom:8px">${tags.map(t => `<button class="k9-badge ${tagF === t ? 'g' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : '') + (l.length ? `<div class="s10-ideas">${l.map(x => `<div class="k9-card s10-idea ${x.done ? 'done' : ''}" style="${x.color ? '--ic:' + esc(x.color) : ''}"><p>${esc(x.text).replace(/#([\p{L}\p{N}_-]+)/gu, '<b>#$1</b>')}</p><small class="k9-muted">${esc(K.fmt.rel(x.t))}${x.app && E.REG[x.app] ? ' · ' + esc(E.REG[x.app].name) : ''}${x.conv ? ' · → ' + esc(tr(x.conv)) : ''}</small><div class="k9-row s10-idea-act"><button class="k9-btn" data-done="${esc(x.id)}" title="${esc(tr(x.done ? 'Marcar pendiente' : 'Marcar hecha'))}">${x.done ? '↺' : '✓'}</button><button class="k9-btn" data-conv="${esc(x.id)}">${esc(tr('Convertir'))} ▾</button><button class="k9-btn" data-col="${esc(x.id)}" title="${esc(tr('Color'))}">●</button><button class="k9-btn" data-ed="${esc(x.id)}">${I('edit', 13)}</button><button class="k9-btn dng" data-del="${esc(x.id)}">${I('trash', 13)}</button></div></div>`).join('')}</div>` : `<div class="k9-state">${I('sparkle', 40)}<p>${esc(tr(all.length ? 'Nada coincide.' : 'Sin ideas todavía. Escríbelas aquí o pulsa Ctrl+Alt+I desde cualquier app.'))}</p></div>`);
      }
      const add = t => { t = t.trim(); if (!t) return; const l = ideas(); l.unshift({ id: E.uid(), text: t.slice(0, 2000), tags: tagsOf(t), t: Date.now(), app: null, done: false, color: '' }); isave(l); q(b, '[data-new]').value = ''; draw(); };
      const upd = (id, fn) => { const l = ideas(), x = l.find(z => z.id === id); if (x) { fn(x); isave(l); draw(); } return x; };
      b.addEventListener('keydown', e => { if (e.target.matches('[data-new]') && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); add(e.target.value); } });
      b.addEventListener('input', U.debounce(e => { if (e.target.matches('[data-q]')) draw(); }, 160));
      b.addEventListener('change', e => { if (e.target.matches('[data-f]')) draw(); });
      b.addEventListener('click', async e => {
        const tg = e.target.closest('[data-tag]'); if (tg) { tagF = tagF === tg.dataset.tag ? '' : tg.dataset.tag; draw(); return; }
        const dn = e.target.closest('[data-done]'); if (dn) { upd(dn.dataset.done, x => { x.done = !x.done; }); return; }
        const dl = e.target.closest('[data-del]'); if (dl) { isave(ideas().filter(x => x.id !== dl.dataset.del)); draw(); return; }
        const cl = e.target.closest('[data-col]'); if (cl) { upd(cl.dataset.col, x => { x.color = COLORS[(COLORS.indexOf(x.color || '') + 1) % COLORS.length]; }); return; }
        const ed = e.target.closest('[data-ed]'); if (ed) { const x = ideas().find(z => z.id === ed.dataset.ed); const r = x && await E.form({ title: tr('Editar idea'), fields: [{ k: 't', label: tr('Idea'), type: 'textarea', value: x.text, req: true }] }); if (r) upd(x.id, z => { z.text = r.t.trim().slice(0, 2000); z.tags = tagsOf(z.text); }); return; }
        const cv = e.target.closest('[data-conv]'); if (cv) { const x = ideas().find(z => z.id === cv.dataset.conv); const r = cv.getBoundingClientRect(); const title = x.text.split('\n')[0].slice(0, 80); K.ui.menu(r.left, r.bottom + 4, [{ label: tr('Tarea'), icon: '✅', act: () => { E.addTask(title); upd(x.id, z => { z.done = true; z.conv = 'Tarea'; }); E.toast(tr('Tarea creada')); } }, { label: tr('Nota'), icon: '🗒️', act: () => { E.addNote(title.slice(0, 60), x.text); upd(x.id, z => { z.done = true; z.conv = 'Nota'; }); E.toast(tr('Nota creada')); } }, { label: tr('Evento del calendario…'), icon: '📅', act: async () => { const v = await E.form({ title: tr('Fecha del evento'), fields: [{ k: 'd', label: tr('Fecha'), type: 'date', value: new Date().toISOString().slice(0, 10), req: true }, { k: 'h', label: tr('Hora (opcional)'), type: 'time' }] }); if (!v) return; E.addEvent(title, v.d, v.h || ''); upd(x.id, z => { z.done = true; z.conv = 'Evento'; }); E.toast(tr('Evento añadido al Calendario')); } }, { label: tr('Documento de Writer'), icon: '📝', act: () => { const WR = E.writer; if (WR && WR.newDoc) { WR.newDoc().then(() => { setTimeout(() => { (WR.insertFrag || WR.insertHTML)(`<h1>${esc(title)}</h1><p>${esc(x.text).replace(/\n/g, '<br>')}</p>`); }, 200); }); upd(x.id, z => { z.conv = 'Writer'; }); } } }]); return; }
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'add') add(q(b, '[data-new]').value);
        if (a.dataset.a === 'md') { const l = ideas(); K.ui.download('Ideas.md', '# ' + tr('Ideas') + '\n\n' + l.map(x => `- [${x.done ? 'x' : ' '}] ${x.text.replace(/\n/g, ' ')} _(${new Date(x.t).toLocaleDateString(K.locale)})_`).join('\n'), 'text/markdown'); }
        if (a.dataset.a === 'voice' && SR) { if (rec) { rec.stop(); return; } rec = new SR(); rec.lang = K.locale || 'es-ES'; rec.interimResults = true; rec.continuous = false; const ta = q(b, '[data-new]'), base = ta.value; a.classList.add('on'); rec.onresult = ev => { ta.value = (base ? base + ' ' : '') + [...ev.results].map(r => r[0].transcript).join(''); }; rec.onerror = ev => { E.toast(tr('Dictado no disponible') + ': ' + ev.error); }; rec.onend = () => { a.classList.remove('on'); rec = null; }; try { rec.start(); } catch { rec = null; a.classList.remove('on'); } }
      });
      const off = K.on('ideas', () => { if (b.offsetParent) draw(); }); draw(); this.onOpen = () => { draw(); setTimeout(() => q(b, '[data-new]').focus(), 60); }; this.destroy = () => { off(); if (rec) rec.abort(); };
    }
  });

  /* ===================== Pizarra interactiva ===================== */
  const WBK = 'os10_boards';
  const boards = () => S.get(WBK, []) || [], bsave = l => S.set(WBK, l);
  const WTOOLS = [['select', 'Seleccionar (V)', '↖', 'v'], ['pen', 'Lápiz (P)', '✎', 'p'], ['hl', 'Resaltador (H)', '🖍', 'h'], ['eraser', 'Borrador (E)', '⌫', 'e'], ['line', 'Línea (L)', '／', 'l'], ['arrow', 'Flecha (A)', '➚', 'a'], ['rect', 'Rectángulo (R)', '▭', 'r'], ['ell', 'Elipse (O)', '◯', 'o'], ['text', 'Texto (T)', 'T', 't'], ['note', 'Nota adhesiva (N)', '🗒', 'n']];
  const WCOL = ['#e9ebef', '#111317', '#34a582', '#e8709f', '#6a9fd8', '#d9a03a', '#c93a73', '#8a74c4'];
  K.define('whiteboard', {
    init(b, w, arg) {
      b.innerHTML = `<div class="s10-wb"><div class="s10-wb-bar">${WTOOLS.map(([k, n, g]) => `<button class="k9-btn" data-tool="${k}" title="${esc(tr(n))}" aria-label="${esc(tr(n))}">${g}</button>`).join('')}<span class="s10-wb-sep"></span>${WCOL.map(c => `<button class="s10-wb-c" data-col="${c}" style="background:${c}" aria-label="${esc(tr('Color'))} ${c}"></button>`).join('')}<input type="color" data-colp value="#34a582" aria-label="${esc(tr('Color personalizado'))}"><input type="range" min="1" max="24" value="3" data-w aria-label="${esc(tr('Grosor'))}"><span class="s10-wb-sep"></span><button class="k9-btn" data-a="undo" title="${esc(tr('Deshacer'))} (Ctrl+Z)">↶</button><button class="k9-btn" data-a="redo" title="${esc(tr('Rehacer'))} (Ctrl+Y)">↷</button><button class="k9-btn" data-a="zout">−</button><button class="k9-btn" data-a="fit" data-z>100 %</button><button class="k9-btn" data-a="zin">+</button><span class="sp"></span><select class="input-text" data-board aria-label="${esc(tr('Pizarra'))}"></select><button class="k9-btn" data-a="menu">${I('more', 14)}</button></div><canvas class="s10-wb-cv" tabindex="0"></canvas></div>`;
      const cv = q(b, 'canvas'), ctx = cv.getContext('2d'), st = { tool: 'pen', color: '#34a582', w: 3, cam: { x: 0, y: 0, z: 1 }, objs: [], undo: [], redo: [], sel: null, id: null, name: '' };
      let drag = null, saveT = 0, raf = 0, spaceDown = false;
      const dpr = () => Math.min(2, devicePixelRatio || 1);
      const toW = (sx, sy) => [(sx - st.cam.x) / st.cam.z, (sy - st.cam.y) / st.cam.z];
      const size = () => { const r = cv.getBoundingClientRect(); cv.width = Math.max(1, Math.round(r.width * dpr())); cv.height = Math.max(1, Math.round(r.height * dpr())); paint(); };
      const ro = new ResizeObserver(size); ro.observe(cv);
      const bbox = o => { if (o.pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; o.pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); return [x0, y0, x1, y1]; } if (o.t === 'text') { ctx.save(); ctx.font = `${o.size}px ${o.font || 'system-ui'}`; const lines = o.text.split('\n'), w = Math.max(...lines.map(l => ctx.measureText(l).width)); ctx.restore(); return [o.x, o.y, o.x + w, o.y + lines.length * o.size * 1.25]; } return [Math.min(o.x, o.x + o.w), Math.min(o.y, o.y + o.h), Math.max(o.x, o.x + o.w), Math.max(o.y, o.y + o.h)]; };
      const distSeg = (p, a, c) => { const dx = c[0] - a[0], dy = c[1] - a[1], l2 = dx * dx + dy * dy; let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)); };
      const hit = (o, p, tol) => { if (o.pts) { for (let i = 1; i < o.pts.length; i++) if (distSeg(p, o.pts[i - 1], o.pts[i]) <= tol + o.w / 2) return true; return o.pts.length === 1 && Math.hypot(p[0] - o.pts[0][0], p[1] - o.pts[0][1]) <= tol + o.w; } if (o.t === 'line' || o.t === 'arrow') return distSeg(p, [o.x, o.y], [o.x + o.w, o.y + o.h]) <= tol + o.lw; const [x0, y0, x1, y1] = bbox(o); return p[0] >= x0 - tol && p[0] <= x1 + tol && p[1] >= y0 - tol && p[1] <= y1 + tol; };
      function drawObj(c, o) {
        c.save(); c.strokeStyle = o.color; c.fillStyle = o.color; c.lineCap = 'round'; c.lineJoin = 'round';
        if (o.pts) { c.globalAlpha = o.t === 'hl' ? .35 : 1; if (o.t === 'hl') { c.lineWidth = o.w; c.beginPath(); o.pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); if (o.pts.length === 1) c.lineTo(o.pts[0][0] + .1, o.pts[0][1]); c.stroke(); } else { for (let i = 1; i < o.pts.length; i++) { const a = o.pts[i - 1], p = o.pts[i]; c.lineWidth = o.w * (.4 + .9 * ((a[2] || .5) + (p[2] || .5)) / 2); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(p[0], p[1]); c.stroke(); } if (o.pts.length === 1) { c.beginPath(); c.arc(o.pts[0][0], o.pts[0][1], o.w / 2, 0, 6.29); c.fill(); } } }
        else if (o.t === 'line' || o.t === 'arrow') { c.lineWidth = o.lw; c.beginPath(); c.moveTo(o.x, o.y); c.lineTo(o.x + o.w, o.y + o.h); c.stroke(); if (o.t === 'arrow') { const a = Math.atan2(o.h, o.w), L2 = 8 + o.lw * 2.5, ex = o.x + o.w, ey = o.y + o.h; c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex - L2 * Math.cos(a - .45), ey - L2 * Math.sin(a - .45)); c.lineTo(ex - L2 * Math.cos(a + .45), ey - L2 * Math.sin(a + .45)); c.closePath(); c.fill(); } }
        else if (o.t === 'rect') { c.lineWidth = o.lw; if (o.fill) { c.globalAlpha = .18; c.fillRect(o.x, o.y, o.w, o.h); c.globalAlpha = 1; } c.strokeRect(o.x, o.y, o.w, o.h); }
        else if (o.t === 'ell') { c.lineWidth = o.lw; c.beginPath(); c.ellipse(o.x + o.w / 2, o.y + o.h / 2, Math.abs(o.w / 2), Math.abs(o.h / 2), 0, 0, 6.29); if (o.fill) { c.globalAlpha = .18; c.fill(); c.globalAlpha = 1; } c.stroke(); }
        else if (o.t === 'text') { c.font = `${o.size}px ${o.font || 'system-ui, sans-serif'}`; c.textBaseline = 'top'; o.text.split('\n').forEach((l, i) => c.fillText(l, o.x, o.y + i * o.size * 1.25)); }
        else if (o.t === 'note') { c.fillStyle = o.color; c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 10; c.shadowOffsetY = 3; c.fillRect(o.x, o.y, o.w, o.h); c.shadowColor = 'transparent'; c.fillStyle = '#1b1d22'; c.font = '15px system-ui, sans-serif'; c.textBaseline = 'top'; const words = o.text.split(/(\s+)/); let line = '', yy = o.y + 10; words.forEach(wd => { const t2 = line + wd; if (c.measureText(t2).width > o.w - 20 && line) { c.fillText(line, o.x + 10, yy); yy += 19; line = wd.trimStart(); } else line = t2; if (wd.includes('\n')) { c.fillText(line, o.x + 10, yy); yy += 19; line = ''; } }); if (line) c.fillText(line, o.x + 10, yy); }
        c.restore();
      }
      function paint() {
        cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
          const d = dpr(), W = cv.width, H = cv.height, dark = document.documentElement.dataset.theme !== 'light'; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = dark ? '#15171c' : '#fbfbf9'; ctx.fillRect(0, 0, W, H);
          ctx.setTransform(d * st.cam.z, 0, 0, d * st.cam.z, d * st.cam.x, d * st.cam.y);
          const gs = 40, [wx0, wy0] = toW(0, 0), [wx1, wy1] = toW(W / d, H / d); ctx.fillStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'; if (st.cam.z > .3) for (let x = Math.floor(wx0 / gs) * gs; x < wx1; x += gs) for (let y = Math.floor(wy0 / gs) * gs; y < wy1; y += gs) ctx.fillRect(x - .9 / st.cam.z, y - .9 / st.cam.z, 1.8 / st.cam.z, 1.8 / st.cam.z);
          st.objs.forEach(o => drawObj(ctx, o)); if (drag && drag.temp) drawObj(ctx, drag.temp);
          if (st.sel) { const o = st.objs.find(x => x.id === st.sel); if (o) { const [x0, y0, x1, y1] = bbox(o); ctx.save(); ctx.strokeStyle = '#e8709f'; ctx.setLineDash([6 / st.cam.z, 4 / st.cam.z]); ctx.lineWidth = 1.5 / st.cam.z; ctx.strokeRect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 12); ctx.restore(); } }
          q(b, '[data-z]').textContent = Math.round(st.cam.z * 100) + ' %';
        });
      }
      const snap = () => { st.undo.push(JSON.stringify(st.objs)); if (st.undo.length > 60) st.undo.shift(); st.redo = []; };
      const persist = () => { clearTimeout(saveT); saveT = setTimeout(async () => { if (!st.id) return; await K.store10.put('kv', { id: 'wb_' + st.id, objs: st.objs, cam: st.cam }); const l = boards(), m = l.find(x => x.id === st.id); if (m) { m.mod = Date.now(); m.n = st.objs.length; bsave(l); } }, 700); };
      const change = () => { paint(); persist(); };
      async function load(id) { const l = boards(); let m = l.find(x => x.id === id); if (!m) { m = { id: E.uid(), name: tr('Pizarra') + ' ' + (l.length + 1), mod: Date.now(), n: 0 }; l.unshift(m); bsave(l); } const r = await K.store10.get('kv', 'wb_' + m.id); st.id = m.id; st.name = m.name; st.objs = (r && r.objs) || []; st.cam = (r && r.cam) || { x: 0, y: 0, z: 1 }; st.undo = []; st.redo = []; st.sel = null; K.cfg('whiteboard').set('last', m.id); boardSel(); paint(); }
      const boardSel = () => { q(b, '[data-board]').innerHTML = boards().map(m => `<option value="${esc(m.id)}"${m.id === st.id ? ' selected' : ''}>${esc(m.name)}</option>`).join('') + `<option value="__new">＋ ${esc(tr('Nueva pizarra'))}</option>`; };
      const setTool = t => { st.tool = t; qa(b, '[data-tool]').forEach(x => x.classList.toggle('on', x.dataset.tool === t)); cv.style.cursor = t === 'select' ? 'default' : t === 'text' ? 'text' : t === 'eraser' ? 'cell' : 'crosshair'; if (t !== 'select') { st.sel = null; paint(); } };
      function textEditor(o, isNew) {
        const ta = document.createElement('textarea'); ta.className = 's10-wb-ta'; const r = cv.getBoundingClientRect(), br = b.getBoundingClientRect(); ta.value = o.text || ''; Object.assign(ta.style, { left: (r.left - br.left + o.x * st.cam.z + st.cam.x) + 'px', top: (r.top - br.top + o.y * st.cam.z + st.cam.y) + 'px', fontSize: (o.t === 'note' ? 15 : o.size) * st.cam.z + 'px', width: (o.t === 'note' ? o.w * st.cam.z : 260) + 'px', height: (o.t === 'note' ? o.h * st.cam.z : (o.size * 1.6) * st.cam.z * 2) + 'px', color: o.t === 'note' ? '#1b1d22' : o.color, background: o.t === 'note' ? o.color : 'transparent' });
        b.appendChild(ta); let closed = false; const done = () => { if (closed) return; closed = true; const v = ta.value.replace(/\s+$/, ''); ta.remove(); if (!v && isNew && o.t === 'text') return; if (isNew) { snap(); if (!v && o.t === 'text') return; o.text = v; st.objs.push(o); } else { snap(); o.text = v; } change(); };
        ta._done = done; ta.focus(); requestAnimationFrame(() => { ta.focus(); ta.addEventListener('blur', done); }); ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); done(); } });
      }
      cv.addEventListener('pointerdown', e => {
        const open = q(b, '.s10-wb-ta'); if (open && open._done) { e.preventDefault(); open._done(); return; }
        cv.focus(); const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, p = toW(sx, sy); cv.setPointerCapture(e.pointerId);
        if (e.button === 1 || spaceDown || (e.pointerType === 'touch' && st.tool === 'select' && !st.objs.some(o => hit(o, p, 8 / st.cam.z)))) { drag = { pan: true, sx, sy, cx: st.cam.x, cy: st.cam.y }; return; }
        const t = st.tool, pr = e.pressure && e.pointerType === 'pen' ? e.pressure : .5; if (t === 'text' || t === 'note') e.preventDefault();
        if (t === 'pen' || t === 'hl') drag = { temp: { id: E.uid(), t, color: st.color, w: t === 'hl' ? st.w * 5 : st.w, pts: [[p[0], p[1], pr]] } };
        else if (t === 'eraser') { snap(); drag = { erase: true }; const before = st.objs.length; st.objs = st.objs.filter(o => !hit(o, p, 6 / st.cam.z)); if (st.objs.length !== before) change(); }
        else if (['line', 'arrow', 'rect', 'ell'].includes(t)) drag = { temp: { id: E.uid(), t, color: st.color, lw: st.w, x: p[0], y: p[1], w: 0, h: 0, fill: e.shiftKey } };
        else if (t === 'text') textEditor({ id: E.uid(), t: 'text', x: p[0], y: p[1], size: 14 + st.w * 2, color: st.color, text: '', font: K.cfg('whiteboard').get('font', '') || undefined }, true);
        else if (t === 'note') textEditor({ id: E.uid(), t: 'note', x: p[0], y: p[1], w: 190, h: 140, color: ['#fde68a', '#bbf7d0', '#fbcfe8', '#bfdbfe'][Math.floor(Math.random() * 4)], text: '' }, true);
        else { const o = [...st.objs].reverse().find(x => hit(x, p, 6 / st.cam.z)); st.sel = o ? o.id : null; if (o) { snap(); drag = { move: o, lx: p[0], ly: p[1], moved: false }; } else drag = { pan: true, sx, sy, cx: st.cam.x, cy: st.cam.y }; paint(); }
      });
      cv.addEventListener('pointermove', e => {
        if (!drag) return; const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, p = toW(sx, sy);
        if (drag.pan) { st.cam.x = drag.cx + sx - drag.sx; st.cam.y = drag.cy + sy - drag.sy; paint(); return; }
        if (drag.temp && drag.temp.pts) { for (const ev of (e.getCoalescedEvents ? e.getCoalescedEvents() : [e])) { const q2 = toW(ev.clientX - r.left, ev.clientY - r.top), last = drag.temp.pts[drag.temp.pts.length - 1]; if (Math.hypot(q2[0] - last[0], q2[1] - last[1]) > .8 / st.cam.z) drag.temp.pts.push([q2[0], q2[1], ev.pointerType === 'pen' && ev.pressure ? ev.pressure : .5]); } paint(); return; }
        if (drag.temp) { drag.temp.w = p[0] - drag.temp.x; drag.temp.h = p[1] - drag.temp.y; if (e.shiftKey && (drag.temp.t === 'rect' || drag.temp.t === 'ell')) { const m = Math.max(Math.abs(drag.temp.w), Math.abs(drag.temp.h)); drag.temp.w = Math.sign(drag.temp.w || 1) * m; drag.temp.h = Math.sign(drag.temp.h || 1) * m; } paint(); return; }
        if (drag.erase) { const before = st.objs.length; st.objs = st.objs.filter(o => !hit(o, p, 6 / st.cam.z)); if (st.objs.length !== before) change(); return; }
        if (drag.move) { const dx = p[0] - drag.lx, dy = p[1] - drag.ly; drag.lx = p[0]; drag.ly = p[1]; const o = drag.move; if (o.pts) o.pts.forEach(pt => { pt[0] += dx; pt[1] += dy; }); else { o.x += dx; o.y += dy; } drag.moved = true; paint(); }
      });
      const up = () => { if (!drag) return; if (drag.temp) { const o = drag.temp; if (o.pts || Math.hypot(o.w, o.h) > 3) { snap(); st.objs.push(o); change(); } } if (drag.move) { if (drag.moved) change(); else st.undo.pop(); } drag = null; paint(); };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('dblclick', e => { const r = cv.getBoundingClientRect(), p = toW(e.clientX - r.left, e.clientY - r.top), o = [...st.objs].reverse().find(x => (x.t === 'text' || x.t === 'note') && hit(x, p, 4)); if (o) textEditor(o, false); });
      cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top; if (e.ctrlKey || e.metaKey) { const z = Math.min(6, Math.max(.15, st.cam.z * Math.exp(-e.deltaY * .0025))), [wx, wy] = toW(sx, sy); st.cam.z = z; st.cam.x = sx - wx * z; st.cam.y = sy - wy * z; } else { st.cam.x -= e.deltaX; st.cam.y -= e.deltaY; } paint(); persist(); }, { passive: false });
      const zoomBy = f => { const r = cv.getBoundingClientRect(), sx = r.width / 2, sy = r.height / 2, [wx, wy] = toW(sx, sy); st.cam.z = Math.min(6, Math.max(.15, st.cam.z * f)); st.cam.x = sx - wx * st.cam.z; st.cam.y = sy - wy * st.cam.z; paint(); persist(); };
      const fit = () => { if (!st.objs.length) { st.cam = { x: 0, y: 0, z: 1 }; paint(); return; } let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; st.objs.forEach(o => { const bb = bbox(o); x0 = Math.min(x0, bb[0]); y0 = Math.min(y0, bb[1]); x1 = Math.max(x1, bb[2]); y1 = Math.max(y1, bb[3]); }); const r = cv.getBoundingClientRect(), z = Math.min(3, Math.max(.15, Math.min((r.width - 80) / Math.max(1, x1 - x0), (r.height - 80) / Math.max(1, y1 - y0)))); st.cam = { z, x: (r.width - (x1 - x0) * z) / 2 - x0 * z, y: (r.height - (y1 - y0) * z) / 2 - y0 * z }; paint(); persist(); };
      const bounds = () => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; st.objs.forEach(o => { const bb = bbox(o), m = (o.w && o.pts ? o.w : o.lw || 0) + 4; x0 = Math.min(x0, bb[0] - m); y0 = Math.min(y0, bb[1] - m); x1 = Math.max(x1, bb[2] + m); y1 = Math.max(y1, bb[3] + m); }); return [x0 - 20, y0 - 20, x1 + 20, y1 + 20]; };
      async function png(scale = 2) { const [x0, y0, x1, y1] = bounds(), c = document.createElement('canvas'); c.width = Math.min(8000, Math.ceil((x1 - x0) * scale)); c.height = Math.min(8000, Math.ceil((y1 - y0) * scale)); const g = c.getContext('2d'), dark = document.documentElement.dataset.theme !== 'light'; g.fillStyle = dark ? '#15171c' : '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale); st.objs.forEach(o => drawObj(g, o)); return new Promise(r => c.toBlob(r, 'image/png')); }
      function svg() { const [x0, y0, x1, y1] = bounds(), X = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), dark = document.documentElement.dataset.theme !== 'light'; const el = st.objs.map(o => { if (o.pts) return `<polyline fill="none" stroke="${X(o.color)}" stroke-width="${o.w}" stroke-linecap="round" stroke-linejoin="round"${o.t === 'hl' ? ' stroke-opacity=".35"' : ''} points="${o.pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}"/>`; if (o.t === 'line' || o.t === 'arrow') { const a = Math.atan2(o.h, o.w), L2 = 8 + o.lw * 2.5, ex = o.x + o.w, ey = o.y + o.h; return `<line x1="${o.x}" y1="${o.y}" x2="${ex}" y2="${ey}" stroke="${X(o.color)}" stroke-width="${o.lw}" stroke-linecap="round"/>` + (o.t === 'arrow' ? `<polygon fill="${X(o.color)}" points="${ex},${ey} ${ex - L2 * Math.cos(a - .45)},${ey - L2 * Math.sin(a - .45)} ${ex - L2 * Math.cos(a + .45)},${ey - L2 * Math.sin(a + .45)}"/>` : ''); } if (o.t === 'rect') return `<rect x="${Math.min(o.x, o.x + o.w)}" y="${Math.min(o.y, o.y + o.h)}" width="${Math.abs(o.w)}" height="${Math.abs(o.h)}" fill="${o.fill ? X(o.color) : 'none'}" fill-opacity=".18" stroke="${X(o.color)}" stroke-width="${o.lw}"/>`; if (o.t === 'ell') return `<ellipse cx="${o.x + o.w / 2}" cy="${o.y + o.h / 2}" rx="${Math.abs(o.w / 2)}" ry="${Math.abs(o.h / 2)}" fill="${o.fill ? X(o.color) : 'none'}" fill-opacity=".18" stroke="${X(o.color)}" stroke-width="${o.lw}"/>`; if (o.t === 'text') return `<text x="${o.x}" y="${o.y}" fill="${X(o.color)}" font-size="${o.size}" font-family="${X(o.font || 'system-ui, sans-serif')}" dominant-baseline="hanging">${o.text.split('\n').map((l, i) => `<tspan x="${o.x}" dy="${i ? o.size * 1.25 : 0}">${X(l)}</tspan>`).join('')}</text>`; if (o.t === 'note') return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="${X(o.color)}"/><foreignObject x="${o.x + 8}" y="${o.y + 8}" width="${o.w - 16}" height="${o.h - 16}"><div xmlns="http://www.w3.org/1999/xhtml" style="font:15px system-ui,sans-serif;color:#1b1d22;white-space:pre-wrap">${X(o.text)}</div></foreignObject>`; return ''; }).join(''); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" width="${Math.round(x1 - x0)}" height="${Math.round(y1 - y0)}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${dark ? '#15171c' : '#ffffff'}"/>${el}</svg>`; }
      b.addEventListener('keydown', e => { if (e.target.closest('textarea,input,select')) return; const k = e.key.toLowerCase(); if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); q(b, '[data-a="undo"]').click(); return; } if ((e.ctrlKey || e.metaKey) && (k === 'y' || (e.shiftKey && k === 'z'))) { e.preventDefault(); q(b, '[data-a="redo"]').click(); return; } if ((e.key === 'Delete' || e.key === 'Backspace') && st.sel) { snap(); st.objs = st.objs.filter(o => o.id !== st.sel); st.sel = null; change(); return; } if (e.key === ' ') { spaceDown = true; cv.style.cursor = 'grab'; e.preventDefault(); return; } if (!e.ctrlKey && !e.metaKey && !e.altKey) { const t = WTOOLS.find(x => x[3] === k); if (t) setTool(t[0]); } });
      b.addEventListener('keyup', e => { if (e.key === ' ') { spaceDown = false; setTool(st.tool); } });
      b.addEventListener('input', e => { if (e.target.matches('[data-w]')) st.w = +e.target.value; if (e.target.matches('[data-colp]')) { st.color = e.target.value; qa(b, '[data-col]').forEach(x => x.classList.remove('on')); } });
      b.addEventListener('change', async e => { if (e.target.matches('[data-board]')) { if (e.target.value === '__new') load('__none'); else load(e.target.value); } });
      b.addEventListener('click', async e => {
        const tl = e.target.closest('[data-tool]'); if (tl) { setTool(tl.dataset.tool); return; }
        const cl = e.target.closest('[data-col]'); if (cl) { st.color = cl.dataset.col; qa(b, '[data-col]').forEach(x => x.classList.toggle('on', x === cl)); const o = st.sel && st.objs.find(x => x.id === st.sel); if (o && o.t !== 'note') { snap(); o.color = st.color; change(); } return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'undo' && st.undo.length) { st.redo.push(JSON.stringify(st.objs)); st.objs = JSON.parse(st.undo.pop()); st.sel = null; change(); }
        if (k === 'redo' && st.redo.length) { st.undo.push(JSON.stringify(st.objs)); st.objs = JSON.parse(st.redo.pop()); change(); }
        if (k === 'zin') zoomBy(1.25); if (k === 'zout') zoomBy(.8); if (k === 'fit') fit();
        if (k === 'menu') { const r = a.getBoundingClientRect(); K.ui.menu(r.left - 160, r.bottom + 4, [
          { label: tr('Exportar PNG a Archivos'), icon: '🖼', disabled: !st.objs.length, act: async () => U.saveBlob(st.name + '.png', await png(), 'images') },
          { label: tr('Exportar SVG a Archivos'), icon: '📐', disabled: !st.objs.length, act: () => U.saveBlob(st.name + '.svg', new Blob([svg()], { type: 'image/svg+xml' }), 'images') },
          { label: tr('Guardar como .eisboard'), icon: '💾', act: () => U.saveBlob(st.name + '.eisboard', new Blob([JSON.stringify({ app: 'EISENKU whiteboard', v: 1, name: st.name, objs: st.objs })], { type: 'application/json' }), 'documents') },
          { label: tr('Abrir .eisboard…'), icon: '📂', act: async () => { const f = await U.pickBlob({ title: tr('Pizarra (.eisboard)'), accept: x => /\.eisboard$/i.test(x.name), deviceAccept: '.eisboard,application/json' }); if (f) importBoard(f); } },
          { sep: 1 },
          { label: tr('Cambiar nombre'), icon: '✎', act: async () => { const v = await E.form({ title: tr('Nombre de la pizarra'), fields: [{ k: 'n', label: tr('Nombre'), value: st.name, req: true }] }); if (!v) return; st.name = v.n.trim().slice(0, 60); const l = boards(); l.find(x => x.id === st.id).name = st.name; bsave(l); boardSel(); } },
          { label: tr('Borrar todo el contenido'), icon: '🧹', act: () => { snap(); st.objs = []; change(); } },
          { label: tr('Eliminar esta pizarra'), icon: '🗑', danger: true, act: async () => { if (!await E.confirm(tr('Eliminar pizarra'), st.name)) return; await K.store10.del('kv', 'wb_' + st.id); const l = boards().filter(x => x.id !== st.id); bsave(l); load(l[0] ? l[0].id : '__none'); } }
        ]); }
      });
      async function importBoard(f) { try { const j = JSON.parse(await f.blob.text()); if (!Array.isArray(j.objs)) throw 0; await load('__none'); st.name = String(j.name || f.name).slice(0, 60); st.objs = j.objs.filter(o => o && typeof o === 'object' && o.t).slice(0, 20000); const l = boards(); l.find(x => x.id === st.id).name = st.name; bsave(l); boardSel(); fit(); change(); } catch { E.toast(tr('Archivo de pizarra no válido')); } }
      setTool('pen'); qa(b, '[data-col]')[2].classList.add('on'); load(K.cfg('whiteboard').get('last', '') || (boards()[0] || {}).id || '__none');
      const argFile = a => { if (a && a.fileId) F.get(a.fileId).then(f => f && /\.eisboard$/i.test(f.name) && importBoard(f)); };
      argFile(arg);
      this.onOpen = (bb, ww, a) => { size(); argFile(a); }; this.destroy = () => { ro.disconnect(); cancelAnimationFrame(raf); clearTimeout(saveT); };
      K.ext.whiteboard = { state: st, png, svg, fit };
    }
  });
})();

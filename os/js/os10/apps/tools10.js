/* =====================================================================
   EISENKU OS 10.0 · Herramientas avanzadas (carga diferida)
   Verificador de huellas, Editor hexadecimal, Conversor universal de formatos, Administrador de fuentes,
   Calculadora de programación y Generador de diagramas técnicos.
   Todo se procesa en el propio dispositivo: no se sube ningún archivo a ningún servidor.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, U = K.u10, F = K.files;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)];
  const B = n => K.fmt.bytes(n), fid = a => a && (a.fileId || a.id);
  const hashLib = () => K.hash ? Promise.resolve() : K.loadScript('js/os10/lib/hash10.js');
  const copy = t => K.ui.copy(t);
  const baseName = n => String(n || 'archivo').replace(/\.[^./]+$/, '');
  const extOf = n => (/\.([^.]+)$/.exec(String(n || '')) || [, ''])[1].toLowerCase();
  // elegir varios archivos: de Archivos (uno) o del dispositivo (varios)
  async function pickMany(o = {}) {
    const v = await E.form({ title: o.title || tr('Añadir archivos'), ok: tr('Continuar'), fields: [{ k: 'src', label: tr('Origen'), type: 'select', options: [['eis', tr('Archivos de EISENKU')], ['dev', tr('Este dispositivo (varios a la vez)')]], value: 'eis' }] });
    if (!v) return [];
    if (v.src === 'dev') return (await K.ui.pickFile(o.deviceAccept || '', true)).map(f => ({ name: f.name, blob: f, id: null }));
    const f = await U.pickBlob({ title: o.title, accept: o.accept, deviceAccept: o.deviceAccept }); return f ? [f] : [];
  }
  const dropZone = (el, onFiles) => {
    el.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); el.classList.add('drop-on'); } });
    el.addEventListener('dragleave', () => el.classList.remove('drop-on'));
    el.addEventListener('drop', e => { el.classList.remove('drop-on'); const fl = [...((e.dataTransfer || {}).files || [])]; if (fl.length) { e.preventDefault(); onFiles(fl.map(f => ({ name: f.name, blob: f, id: null }))); } });
  };

  /* ===================================================================
     Verificador de huellas (MD5, SHA-1, SHA-256, SHA-384, SHA-512, CRC32)
     =================================================================== */
  const SUMEXT = { MD5: 'md5', 'SHA-1': 'sha1', 'SHA-256': 'sha256', 'SHA-384': 'sha384', 'SHA-512': 'sha512', CRC32: 'sfv' };
  const normHex = h => String(h || '').toLowerCase().replace(/[\s:-]/g, '');
  // lee archivos de sumas: GNU («hash  nombre», «hash *nombre»), BSD («SHA256 (nombre) = hash») y SFV («nombre crc32»)
  function parseSums(text, fileName) {
    const out = [], ex = extOf(fileName);
    String(text).replace(/^﻿/, '').split(/\r?\n/).forEach(line => {
      const l = line.trim(); if (!l || l.startsWith(';') || l.startsWith('#')) return;
      let m = /^(MD5|SHA1|SHA-1|SHA224|SHA256|SHA-256|SHA384|SHA-384|SHA512|SHA-512|CRC32)\s*\((.+)\)\s*=\s*([0-9a-fA-F]+)$/.exec(l);
      if (m) { const a = m[1].toUpperCase().replace(/^SHA-?/, 'SHA-').replace('MD5', 'MD5'); out.push({ name: m[2], hash: m[3].toLowerCase(), algo: a === 'SHA-1' || a === 'SHA-256' || a === 'SHA-384' || a === 'SHA-512' ? a : a === 'CRC32' ? 'CRC32' : K.hash.guess(m[3]) }); return; }
      m = /^([0-9a-fA-F]{8,128})\s+[ *]?(.+)$/.exec(l);
      if (m && K.hash.guess(m[1]) && ex !== 'sfv') { out.push({ name: m[2].trim(), hash: m[1].toLowerCase(), algo: K.hash.guess(m[1]) }); return; }
      m = /^(.+?)\s+([0-9a-fA-F]{8})$/.exec(l);
      if (m) out.push({ name: m[1].trim(), hash: m[2].toLowerCase(), algo: 'CRC32' });
    });
    return out;
  }
  const hexToU8 = h => { const u = new Uint8Array(h.length / 2); for (let i = 0; i < u.length; i++) u[i] = parseInt(h.substr(i * 2, 2), 16); return u; };
  // HMAC: SHA con WebCrypto; MD5 calculado aquí (RFC 2104)
  async function hmac(algo, keyText, msgText) {
    const enc = new TextEncoder(), key = enc.encode(keyText), msg = enc.encode(msgText);
    if (/^SHA-/.test(algo)) { const k = await crypto.subtle.importKey('raw', key.length ? key : new Uint8Array(1), { name: 'HMAC', hash: algo }, false, ['sign']); return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, msg))].map(x => x.toString(16).padStart(2, '0')).join(''); }
    if (algo !== 'MD5') return null;
    let k = key.length > 64 ? hexToU8(K.hash.md5(key)) : key; const kp = new Uint8Array(64); kp.set(k);
    const ip = kp.map(x => x ^ 0x36), op = kp.map(x => x ^ 0x5c), inner = new Uint8Array(64 + msg.length); inner.set(ip); inner.set(msg, 64);
    const ih = hexToU8(K.hash.md5(inner)), outer = new Uint8Array(64 + 16); outer.set(op); outer.set(ih, 64); return K.hash.md5(outer);
  }
  K.define('hashcheck', {
    async init(b, w, arg) {
      await hashLib();
      const C = K.cfg('hashcheck', { algos: ['SHA-256', 'MD5'] });
      let tab = 'files', items = [], busy = false, expect = '', vlist = null, vres = [];
      const algos = () => (C.get('algos', ['SHA-256']) || []).filter(a => K.hash.ALGOS.includes(a));
      b.innerHTML = `<div class="k9 s10-hc"><div class="s10-hc-top">${U.tabs([['files', 'Archivos', 'file'], ['text', 'Texto', 'edit'], ['verify', 'Verificar una lista de sumas', 'check']], 'files')}</div><div class="s10-hc-b" data-v></div></div>`;
      const V = q(b, '[data-v]');
      const algoBar = () => `<div class="s10-chips s10-hc-al">${K.hash.ALGOS.map(a => `<label class="s10-chip"><input type="checkbox" data-al="${a}" ${algos().includes(a) ? 'checked' : ''}> ${a}</label>`).join('')}</div>`;
      const expRes = () => {
        const e = normHex(expect); if (!e) return ''; const al = K.hash.guess(e); if (!al) return `<p class="s10-hc-bad">${esc(tr('La huella no tiene una longitud conocida (8, 32, 40, 64, 96 o 128 caracteres hexadecimales).'))}</p>`;
        const hit = items.find(it => it.res[al] === e); if (hit) return `<p class="s10-hc-ok">✓ ${esc(tr('Coincide con'))} <b>${esc(hit.name)}</b> (${al})</p>`;
        const pend = items.some(it => !it.res[al]); return `<p class="${pend ? 'k9-muted' : 's10-hc-bad'}">${pend ? '…' + esc(tr('calculando')) + ' ' + al : '✗ ' + esc(tr('Ninguno de los archivos tiene esa huella')) + ' (' + al + ')'}</p>`;
      };
      function itemHtml(it, i) {
        const e = normHex(expect);
        return `<div class="k9-card s10-hc-it" data-i="${i}"><div class="k9-row"><b class="s10-hc-n">${esc(it.name)}</b><small class="k9-muted">${B(it.size)}</small><span style="flex:1"></span><button class="k9-btn" data-rm="${i}" title="${esc(tr('Quitar'))}">${I('close', 12)}</button></div>${it.err ? `<p class="s10-hc-bad">${esc(it.err)}</p>` : ''}<div class="s10-hc-pg" ${it.prog >= 1 ? 'hidden' : ''}><i style="width:${Math.round((it.prog || 0) * 100)}%"></i></div><table class="s10-hc-t">${Object.entries(it.res).map(([a, h]) => `<tr class="${e && h === e ? 'match' : ''}"><th>${a}</th><td><code>${h}</code></td><td><button class="k9-btn" data-cp="${h}" title="${esc(tr('Copiar'))}">${I('copy', 12)}</button></td></tr>`).join('')}</table></div>`;
      }
      function drawFiles() {
        V.innerHTML = `${algoBar()}<div class="s10-hc-drop" data-drop>${I('upload', 26)}<span>${esc(tr('Arrastra aquí archivos o elígelos'))}</span><div class="k9-row" style="flex-wrap:wrap;justify-content:center"><button class="k9-btn pri" data-a="add">${I('plus', 14)} ${esc(tr('Añadir archivos…'))}</button><button class="k9-btn" data-a="clear" ${items.length ? '' : 'disabled'}>${I('trash', 14)} ${esc(tr('Vaciar'))}</button><button class="k9-btn" data-a="sums" ${items.length ? '' : 'disabled'}>${I('save', 14)} ${esc(tr('Guardar archivo de sumas'))}</button><button class="k9-btn" data-a="copyall" ${items.length ? '' : 'disabled'}>${I('copy', 14)} ${esc(tr('Copiar todo'))}</button></div></div>
          <label class="k9-field">${esc(tr('Huella esperada (opcional): pégala para compararla'))}<input class="input-text" data-expect value="${esc(expect)}" placeholder="${esc(tr('p. ej. la suma SHA-256 publicada en la página de descarga'))}" spellcheck="false"></label><div data-expres>${expRes()}</div>
          <div data-list>${items.map(itemHtml).join('') || `<p class="k9-muted k9-small">${esc(tr('Aún no has añadido archivos. SHA se calcula con WebCrypto; MD5 y CRC32 con código propio por bloques.'))}</p>`}</div>`;
        dropZone(q(V, '[data-drop]'), add);
      }
      const upd = i => { const el = q(V, `.s10-hc-it[data-i="${i}"]`); if (el) el.outerHTML = itemHtml(items[i], i); const er = q(V, '[data-expres]'); if (er) er.innerHTML = expRes(); };
      async function run() {
        if (busy) return; busy = true;
        try {
          for (let i = 0; i < items.length; i++) {
            const it = items[i]; const want = algos().concat(normHex(expect) && K.hash.guess(normHex(expect)) ? [K.hash.guess(normHex(expect))] : []).filter((a, j, l) => l.indexOf(a) === j && !it.res[a]);
            if (!want.length) continue;
            if (it.size > 1.5e9 && want.some(a => /^SHA/.test(a))) { it.err = tr('Archivo muy grande para SHA en el navegador (WebCrypto necesita cargarlo entero en memoria). MD5 y CRC32 sí se calculan por bloques.'); }
            const use = it.size > 1.5e9 ? want.filter(a => !/^SHA/.test(a)) : want; if (!use.length) { it.prog = 1; upd(i); continue; }
            it.prog = 0.01; upd(i); let last = 0;
            try { const r = await K.hash.compute(it.blob, use, p => { it.prog = p; const n = performance.now(); if (n - last > 120) { last = n; const pg = q(V, `.s10-hc-it[data-i="${i}"] .s10-hc-pg i`); if (pg) pg.style.width = Math.round(p * 100) + '%'; } }); Object.assign(it.res, r); } catch (e) { it.err = String(e.message || e); }
            it.prog = 1; upd(i);
          }
        } finally { busy = false; }
        if (items.some(it => algos().some(a => !it.res[a]) && !it.err)) run();
      }
      function add(list) { list.forEach(f => items.push({ name: f.name, size: f.blob.size, blob: f.blob, res: {}, prog: 0 })); if (tab === 'files') drawFiles(); run(); }
      // ---- Texto
      function drawText() {
        V.innerHTML = `<label class="k9-field">${esc(tr('Texto (se codifica en UTF-8)'))}<textarea class="input-text s10-hc-txt" data-txt rows="6" spellcheck="false" placeholder="${esc(tr('Escribe o pega un texto…'))}"></textarea></label><label class="k9-field">${esc(tr('Clave HMAC (opcional)'))}<input class="input-text" data-key spellcheck="false" placeholder="${esc(tr('Vacío = huella normal; con clave = HMAC'))}"></label><div data-out></div>`;
        const go = U.debounce(async () => { const t = q(V, '[data-txt]').value, k = q(V, '[data-key]').value; const r = k ? {} : await K.hash.compute(t, K.hash.ALGOS); if (k) for (const a of K.hash.ALGOS) r[a] = await hmac(a, k, t); const o = q(V, '[data-out]'); if (o) o.innerHTML = `<table class="s10-hc-t">${K.hash.ALGOS.map(a => `<tr><th>${k && r[a] ? 'HMAC-' : ''}${a}</th><td><code>${r[a] || '— ' + esc(tr('no aplicable'))}</code></td><td>${r[a] ? `<button class="k9-btn" data-cp="${r[a]}">${I('copy', 12)}</button>` : ''}</td></tr>`).join('')}</table><p class="k9-small k9-muted">${esc(tr('Caracteres'))}: ${[...t].length} · ${esc(tr('bytes UTF-8'))}: ${new TextEncoder().encode(t).length}</p>`; }, 150);
        V.oninput = e => { if (e.target.closest('[data-txt],[data-key]')) go(); }; go();
      }
      // ---- Verificar una lista
      function drawVerify() {
        V.innerHTML = `<p class="k9-small">${esc(tr('Abre un archivo de sumas (.sha256, .md5, .sha1, .sha512, .sfv o .txt). EISENKU busca los archivos por nombre en Archivos o puedes elegirlos de tu dispositivo.'))}</p><div class="k9-row" style="flex-wrap:wrap"><button class="k9-btn pri" data-a="vlist">${I('file', 14)} ${esc(tr('Abrir archivo de sumas…'))}</button><button class="k9-btn" data-a="vfind" ${vlist ? '' : 'disabled'}>${I('search', 14)} ${esc(tr('Buscar en Archivos'))}</button><button class="k9-btn" data-a="vdev" ${vlist ? '' : 'disabled'}>${I('upload', 14)} ${esc(tr('Elegir del dispositivo…'))}</button></div><div data-vres>${vtable()}</div>`;
      }
      function vtable() {
        if (!vlist) return ''; if (!vlist.items.length) return `<p class="s10-hc-bad">${esc(tr('No se encontró ninguna suma reconocible en el archivo.'))}</p>`;
        const ok = vres.filter(r => r && r.st === 'ok').length, bad = vres.filter(r => r && r.st === 'bad').length;
        return `<p class="k9-small"><b>${esc(vlist.name)}</b> · ${vlist.items.length} ${esc(tr('entradas'))}${vres.length ? ` · <span class="s10-hc-ok">✓ ${ok}</span> · <span class="s10-hc-bad">✗ ${bad}</span> · — ${vlist.items.length - ok - bad}` : ''}</p><table class="k9-table"><thead><tr><th>${esc(tr('Archivo'))}</th><th>${esc(tr('Algoritmo'))}</th><th>${esc(tr('Resultado'))}</th></tr></thead><tbody>${vlist.items.map((x, i) => { const r = vres[i]; return `<tr><td>${esc(x.name)}</td><td>${esc(x.algo || '?')}</td><td>${!r ? '<span class="k9-muted">—</span>' : r.st === 'ok' ? `<span class="s10-hc-ok">✓ ${esc(tr('Correcto'))}</span>` : r.st === 'bad' ? `<span class="s10-hc-bad">✗ ${esc(tr('No coincide'))}</span><br><small class="k9-muted">${esc(r.got)}</small>` : r.st === 'run' ? '…' : `<span class="k9-muted">${esc(tr('No encontrado'))}</span>`}</td></tr>`; }).join('')}</tbody></table>`;
      }
      async function verifyWith(getBlob) {
        vres = vlist.items.map(() => null); q(V, '[data-vres]').innerHTML = vtable();
        for (let i = 0; i < vlist.items.length; i++) {
          const x = vlist.items[i]; const bl = await getBlob(x.name); if (!bl) { vres[i] = { st: 'none' }; continue; }
          vres[i] = { st: 'run' }; q(V, '[data-vres]').innerHTML = vtable();
          try { const r = await K.hash.compute(bl, [x.algo]); const got = r[x.algo]; vres[i] = { st: got === x.hash ? 'ok' : 'bad', got }; } catch (e) { vres[i] = { st: 'bad', got: e.message }; }
          q(V, '[data-vres]').innerHTML = vtable();
        }
        q(V, '[data-vres]').innerHTML = vtable();
        K.log('info', 'security', `Verificación de sumas «${vlist.name}»: ${vres.filter(r => r.st === 'ok').length}/${vlist.items.length} correctas`);
      }
      const draw = () => { qa(b, '[data-tab]').forEach(t => { t.classList.toggle('on', t.dataset.tab === tab); t.setAttribute('aria-selected', t.dataset.tab === tab); }); V.oninput = null; if (tab === 'files') drawFiles(); else if (tab === 'text') drawText(); else drawVerify(); };
      b.addEventListener('click', async e => {
        const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; draw(); return; }
        const cp = e.target.closest('[data-cp]'); if (cp) { copy(cp.dataset.cp); return; }
        const rm = e.target.closest('[data-rm]'); if (rm) { items.splice(+rm.dataset.rm, 1); drawFiles(); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'add') add(await pickMany({ title: tr('Archivos para calcular su huella') }));
        if (k === 'clear') { items = []; drawFiles(); }
        if (k === 'copyall') copy(items.map(it => it.name + '\n' + Object.entries(it.res).map(([al, h]) => `  ${al}: ${h}`).join('\n')).join('\n\n'));
        if (k === 'sums') {
          const have = K.hash.ALGOS.filter(al => items.some(it => it.res[al])); if (!have.length) return E.toast(tr('Espera a que terminen los cálculos'));
          const v = await E.form({ title: tr('Archivo de sumas'), fields: [{ k: 'al', label: tr('Algoritmo'), type: 'select', options: have.map(x => [x, x]), value: have.includes('SHA-256') ? 'SHA-256' : have[0] }] }); if (!v) return;
          const al = v.al, rows = items.filter(it => it.res[al]); const txt = al === 'CRC32' ? '; ' + tr('Generado por EISENKU OS') + '\n' + rows.map(it => `${it.name} ${it.res[al].toUpperCase()}`).join('\n') + '\n' : rows.map(it => `${it.res[al]}  ${it.name}`).join('\n') + '\n';
          await U.saveBlob((rows.length === 1 ? rows[0].name : 'sumas') + '.' + SUMEXT[al], new Blob([txt], { type: 'text/plain' }), 'documents');
        }
        if (k === 'vlist') { const f = await U.pickBlob({ title: tr('Archivo de sumas'), deviceAccept: '.sha256,.sha1,.md5,.sha512,.sha384,.sfv,.txt,.sum,text/plain' }); if (!f) return; vlist = { name: f.name, folder: f.folder, items: parseSums(await f.blob.text(), f.name) }; vres = []; drawVerify(); }
        if (k === 'vfind' && vlist) { const all = await F.all(); await verifyWith(async n => { const c = all.filter(x => x.name === n.split(/[\\/]/).pop()); const pick = c.find(x => x.folder === vlist.folder) || c[0]; return pick ? (await F.get(pick.id)).blob : null; }); }
        if (k === 'vdev' && vlist) { const fl = await K.ui.pickFile('', true); if (!fl.length) return; await verifyWith(async n => fl.find(x => x.name === n.split(/[\\/]/).pop()) || null); }
      });
      b.addEventListener('change', e => { const c = e.target.closest('[data-al]'); if (c) { const l = new Set(algos()); if (c.checked) l.add(c.dataset.al); else l.delete(c.dataset.al); C.set('algos', K.hash.ALGOS.filter(x => l.has(x))); run(); } });
      b.addEventListener('input', e => { if (e.target.closest('[data-expect]')) { expect = e.target.value; const er = q(V, '[data-expres]'); if (er) er.innerHTML = expRes(); qa(V, '.s10-hc-it').forEach(el => upd(+el.dataset.i)); run(); } });
      const argFile = async a => { const f = fid(a) && await F.get(fid(a)); if (f) { tab = 'files'; draw(); add([{ name: f.name, blob: f.blob }]); } };
      draw(); argFile(arg);
      this.onOpen = (bb, ww, a) => argFile(a);
      K.ext.hashcheck = { add: list => add(list), items: () => items, parseSums, hmac, run };
    }
  });

  /* ===================================================================
     Editor hexadecimal (desplazamiento virtual, sobrescribir/insertar, deshacer, búsqueda, inspector)
     =================================================================== */
  const H2 = [...Array(256)].map((_, i) => i.toString(16).padStart(2, '0').toUpperCase());
  const ASC = [...Array(256)].map((_, i) => i >= 32 && i < 127 ? String.fromCharCode(i) : i >= 161 && i !== 173 ? String.fromCharCode(i) : '·');
  K.define('hexedit', {
    init(b, w, arg) {
      const ROW = 16, RH = 20, MAXV = 8e6, LIMIT = ((navigator.deviceMemory || 4) >= 8 ? 256 : 96) * 1048576;
      let buf = new Uint8Array(1024), len = 0, orig = new Uint8Array(0), name = tr('sin título') + '.bin', fileId = null, dirty = false;
      let cur = 0, anc = -1, nib = 0, pane = 'hex', ins = false, le = true, undo = [], redo = [], found = [], fIdx = -1, drag = false;
      b.innerHTML = `<div class="k9 s10-hx"><div class="s10-hx-bar">
        <button class="k9-btn" data-a="open" title="Ctrl+O">${I('folder', 14)} ${esc(tr('Abrir'))}</button><button class="k9-btn" data-a="save" title="Ctrl+S">${I('save', 14)} ${esc(tr('Guardar'))}</button><button class="k9-btn" data-a="saveas">${esc(tr('Guardar como…'))}</button><button class="k9-btn" data-a="new">${I('plus', 14)}</button><span class="s10-wb-sep"></span>
        <button class="k9-btn" data-a="undo" title="Ctrl+Z">↶</button><button class="k9-btn" data-a="redo" title="Ctrl+Y">↷</button><button class="k9-btn" data-a="mode" title="Insert">${esc(tr('Sobrescribir'))}</button><span class="s10-wb-sep"></span>
        <select class="input-text" data-fm><option value="text">${esc(tr('Texto'))}</option><option value="hex">${esc(tr('Bytes hex'))}</option></select><input class="input-text s10-hx-find" data-find placeholder="${esc(tr('Buscar… (Ctrl+F)'))}" spellcheck="false"><label class="k9-small"><input type="checkbox" data-fcase> Aa</label><button class="k9-btn" data-a="prev" title="Mayús+F3">▲</button><button class="k9-btn" data-a="next" title="F3">▼</button><span class="s10-wb-sep"></span>
        <input class="input-text s10-hx-go" data-goto placeholder="${esc(tr('Ir a… (Ctrl+G)'))}" spellcheck="false"><button class="k9-btn" data-a="more">${I('more', 14)}</button></div>
        <div class="s10-hx-main"><div class="s10-hx-view" tabindex="0" data-view aria-label="${esc(tr('Contenido hexadecimal'))}"><div class="s10-hx-rows" data-rows></div><div data-sp></div></div><aside class="s10-hx-side" data-side></aside></div>
        <div class="s10-hx-st" data-st></div></div>`;
      const view = q(b, '[data-view]'), rowsEl = q(b, '[data-rows]'), sp = q(b, '[data-sp]'), side = q(b, '[data-side]'), st = q(b, '[data-st]');
      const nrows = () => Math.floor(len / ROW) + 1, vis = () => Math.max(1, Math.ceil((view.clientHeight || 400) / RH));
      const sel = () => { if (anc < 0 || anc === cur) return null; const s = Math.min(anc, cur), e2 = Math.max(anc, cur); return [s, Math.min(len, e2 + 1)]; };
      // ---- desplazamiento (escala si el archivo es enorme)
      const totalPx = () => nrows() * RH, virt = () => Math.min(totalPx(), MAXV);
      const firstRow = () => { const vh = view.clientHeight, max = virt() - vh, rmax = Math.max(0, nrows() - vis() + 1); if (max <= 0) return 0; return totalPx() <= MAXV ? Math.floor(view.scrollTop / RH) : Math.round(view.scrollTop / max * rmax); };
      const scrollToRow = r => { const vh = view.clientHeight, max = virt() - vh, rmax = Math.max(0, nrows() - vis() + 1); view.scrollTop = totalPx() <= MAXV ? r * RH : rmax ? r / rmax * max : 0; };
      const ensureVisible = () => { const r = Math.floor(cur / ROW), f = firstRow(), v = vis() - 1; if (r < f) scrollToRow(r); else if (r >= f + v) scrollToRow(r - v + 1); };
      function render() {
        rowsEl.style.height = view.clientHeight + 'px'; sp.style.height = Math.max(0, virt() - view.clientHeight) + 'px';
        const f = firstRow(), n = Math.min(vis() + 1, nrows() - f), s = sel(); let h = '';
        let fi = found.length ? lowerBound(found, f * ROW) : 0; const flen = found.flen || 1;
        for (let r = f; r < f + n; r++) {
          const o = r * ROW; let hx = '', as = '';
          for (let i = 0; i < ROW; i++) {
            const p = o + i; if (p > len) { hx += '<i class="x">  </i>'; as += '<i class="x"> </i>'; continue; }
            while (fi < found.length && found[fi] + flen <= p) fi++;
            let c = p === len ? 'e' : ''; const v = buf[p];
            if (p < len) { if (v === 0) c += ' z'; if (p >= orig.length || orig[p] !== v) c += ' m'; if (fi < found.length && found[fi] <= p && p < found[fi] + flen) c += ' f'; }
            if (s && p >= s[0] && p < s[1]) c += ' s'; if (p === cur) c += pane === 'hex' ? ' c' : ' c2';
            hx += `<i data-o="${p}" class="${c}">${p < len ? H2[v] : '  '}</i>`;
            as += `<i data-o="${p}" data-p="a" class="${p === cur ? (pane === 'asc' ? c.replace(' c2', ' c') : c.replace(' c', ' c2')) : c}">${p < len ? esc(ASC[v]) : ' '}</i>`;
          }
          h += `<div class="r"><span class="o">${o.toString(16).toUpperCase().padStart(8, '0')}</span><span class="h">${hx}</span><span class="a">${as}</span></div>`;
        }
        rowsEl.innerHTML = h; inspector(); status();
      }
      function lowerBound(a, x) { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } return Math.max(0, lo - 1); }
      function status() {
        const s = sel(); st.innerHTML = `<b>${esc(name)}</b>${dirty ? ' •' : ''} · ${B(len)} (${len.toLocaleString()} ${esc(tr('bytes'))}) · ${esc(tr('Posición'))} 0x${cur.toString(16).toUpperCase()} (${cur.toLocaleString()})${s ? ` · ${esc(tr('Selección'))}: ${(s[1] - s[0]).toLocaleString()} ${esc(tr('bytes'))}` : ''} · ${esc(tr(ins ? 'Insertar' : 'Sobrescribir'))}${found.length ? ` · ${found.length >= 10000 ? '10000+' : found.length} ${esc(tr('coincidencias'))}` : ''}`;
        q(b, '[data-a="mode"]').textContent = tr(ins ? 'Insertar' : 'Sobrescribir');
      }
      // ---- inspector de datos
      const TYPES = [['int8', 1], ['uint8', 1], ['int16', 2], ['uint16', 2], ['int32', 4], ['uint32', 4], ['int64', 8], ['uint64', 8], ['float32', 4], ['float64', 8]];
      function readT(t, o) { const [, n] = TYPES.find(x => x[0] === t); if (o + n > len) return null; const dv = new DataView(buf.buffer, buf.byteOffset + o, n); switch (t) { case 'int8': return dv.getInt8(0); case 'uint8': return dv.getUint8(0); case 'int16': return dv.getInt16(0, le); case 'uint16': return dv.getUint16(0, le); case 'int32': return dv.getInt32(0, le); case 'uint32': return dv.getUint32(0, le); case 'int64': return dv.getBigInt64(0, le); case 'uint64': return dv.getBigUint64(0, le); case 'float32': return dv.getFloat32(0, le); default: return dv.getFloat64(0, le); } }
      function writeT(t, o, val) {
        const [, n] = TYPES.find(x => x[0] === t); const tmp = new DataView(new ArrayBuffer(n));
        try { switch (t) { case 'int8': tmp.setInt8(0, Number(val)); break; case 'uint8': tmp.setUint8(0, Number(val)); break; case 'int16': tmp.setInt16(0, Number(val), le); break; case 'uint16': tmp.setUint16(0, Number(val), le); break; case 'int32': tmp.setInt32(0, Number(val), le); break; case 'uint32': tmp.setUint32(0, Number(val), le); break; case 'int64': tmp.setBigInt64(0, BigInt(val), le); break; case 'uint64': tmp.setBigUint64(0, BigInt.asUintN(64, BigInt(val)), le); break; case 'float32': tmp.setFloat32(0, Number(val), le); break; default: tmp.setFloat64(0, Number(val), le); } } catch { return E.toast(tr('Valor no válido')); }
        if (o + n > len) return E.toast(tr('No hay bytes suficientes desde esta posición'));
        op({ k: 'set', o, nw: new Uint8Array(tmp.buffer) });
      }
      function utf8At(o) { const b0 = buf[o]; const n = b0 < 0x80 ? 1 : b0 >= 0xf0 ? 4 : b0 >= 0xe0 ? 3 : b0 >= 0xc0 ? 2 : 0; if (!n || o + n > len) return null; try { const s = new TextDecoder('utf-8', { fatal: true }).decode(buf.subarray(o, o + n)); return s; } catch { return null; } }
      function inspector() {
        if (side.contains(document.activeElement) && document.activeElement.matches('input')) return;
        const o = cur, v = o < len ? buf[o] : null, s = sel(), u = v != null ? utf8At(o) : null, t32 = readT('uint32', o);
        side.innerHTML = `<b class="k9-small">${esc(tr('Inspector de datos'))}</b><div class="k9-row k9-small" style="margin:4px 0 8px"><label><input type="radio" name="le" data-le="1" ${le ? 'checked' : ''}> Little-endian</label><label><input type="radio" name="le" data-le="0" ${le ? '' : 'checked'}> Big-endian</label></div>
          ${v == null ? `<p class="k9-small k9-muted">${esc(tr('Fin del archivo: escribe para añadir bytes.'))}</p>` : `<table class="s10-hx-it"><tr><th>${esc(tr('Binario'))}</th><td><code>${v.toString(2).padStart(8, '0')}</code></td></tr><tr><th>Octal</th><td><code>${v.toString(8).padStart(3, '0')}</code></td></tr>${TYPES.map(([t]) => { const x = readT(t, o); return `<tr><th>${t}</th><td>${x == null ? '<span class="k9-muted">—</span>' : `<input class="input-text" data-wt="${t}" value="${esc(String(x))}" spellcheck="false">`}</td></tr>`; }).join('')}<tr><th>UTF-8</th><td>${u ? `«${esc(u)}» U+${u.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}` : '<span class="k9-muted">—</span>'}</td></tr><tr><th>${esc(tr('Fecha Unix'))}</th><td class="k9-small">${t32 != null ? esc(new Date(t32 * 1000).toISOString().replace('T', ' ').slice(0, 19)) + ' UTC' : '—'}</td></tr></table>`}
          ${s ? `<p class="k9-small" style="margin-top:8px"><b>${esc(tr('Selección'))}</b>: 0x${s[0].toString(16).toUpperCase()}–0x${(s[1] - 1).toString(16).toUpperCase()} · ${(s[1] - s[0]).toLocaleString()} ${esc(tr('bytes'))}</p>` : ''}
          <p class="k9-small k9-muted" style="margin-top:10px">${esc(tr('Tab cambia entre la columna hexadecimal y la de texto. Insert alterna insertar/sobrescribir. Supr y Retroceso borran bytes.'))}</p>`;
      }
      // ---- edición con deshacer
      const ensure = n => { if (buf.length >= n) return; const nb = new Uint8Array(Math.max(n, Math.floor(buf.length * 1.5) + 4096)); nb.set(buf.subarray(0, len)); buf = nb; };
      function applyOp(x, rev) {
        if (x.k === 'set') { const data = rev ? x.old : x.nw; if (!rev && !x.old) { const end = Math.min(len, x.o + x.nw.length); x.old = buf.slice(x.o, end); } ensure(x.o + data.length); buf.set(data, x.o); if (rev) len = x.len0; else { x.len0 = x.len0 == null ? len : x.len0; len = Math.max(len, x.o + data.length); } return; }
        const del = rev ? x.ins.length : x.dl, insd = rev ? x.del : x.ins; if (!rev && !x.del) x.del = buf.slice(x.o, x.o + x.dl);
        const nl = len - del + insd.length; ensure(nl); buf.copyWithin(x.o + insd.length, x.o + del, len); buf.set(insd, x.o); len = nl;
      }
      function op(x) { applyOp(x, false); undo.push(x); if (undo.length > 500) undo.shift(); redo = []; dirty = true; found = []; render(); }
      const typeByte = v => { if (ins || cur >= len) op({ k: 'sp', o: cur, dl: 0, ins: new Uint8Array([v]) }); else op({ k: 'set', o: cur, nw: new Uint8Array([v]) }); };
      function delRange(s, e2) { if (e2 <= s) return; op({ k: 'sp', o: s, dl: e2 - s, ins: new Uint8Array(0) }); cur = Math.min(s, len); anc = -1; render(); }
      // ---- abrir y guardar
      async function load(f) {
        if (dirty && !await E.confirm(tr('Cambios sin guardar'), tr('¿Abrir otro archivo y descartar los cambios?'))) return;
        if (f.blob.size > LIMIT) return E.toast(tr('Archivo demasiado grande para editarlo en este dispositivo') + ' (' + B(LIMIT) + ' máx.)');
        const ab = new Uint8Array(await f.blob.arrayBuffer()); buf = new Uint8Array(ab.length + 4096); buf.set(ab); len = ab.length; orig = ab;
        name = f.name; fileId = f.id || null; dirty = false; cur = 0; anc = -1; undo = []; redo = []; found = []; view.scrollTop = 0; render(); view.focus();
        K.cfg('hexedit').set('last', fileId);
      }
      async function save(as) {
        const blob = new Blob([buf.slice(0, len)], { type: 'application/octet-stream' });
        if (fileId && !as) { await F.update(fileId, { blob }); E.toast(tr('Guardado') + ': ' + name); }
        else { const v = await E.form({ title: tr('Guardar como'), fields: [{ k: 'n', label: tr('Nombre'), value: name, req: true }] }); if (!v) return; name = v.n.trim(); fileId = await U.saveBlob(name, blob, 'documents'); const f = await F.get(fileId); if (f) name = f.name; }
        orig = buf.slice(0, len); dirty = false; render();
      }
      // ---- búsqueda
      function pattern() {
        const v = q(b, '[data-find]').value, mode = q(b, '[data-fm]').value; if (!v) return null;
        if (mode === 'hex') { const t = v.replace(/0x/gi, '').replace(/[^0-9a-f?]/gi, ''); if (t.length % 2) return null; const p = [], m = []; for (let i = 0; i < t.length; i += 2) { const pr = t.substr(i, 2); if (pr === '??') { p.push(0); m.push(0); } else { p.push(parseInt(pr, 16)); m.push(1); } } return { p: Uint8Array.from(p), m, ci: false }; }
        const ci = q(b, '[data-fcase]').checked === false; const p = new TextEncoder().encode(ci ? v.toLowerCase() : v); return { p, m: null, ci };
      }
      const lc = x => x >= 65 && x <= 90 ? x + 32 : x;
      function matchAt(P, o) { const p = P.p; if (o + p.length > len) return false; for (let i = 0; i < p.length; i++) { if (P.m && !P.m[i]) continue; const v = P.ci ? lc(buf[o + i]) : buf[o + i]; if (v !== p[i]) return false; } return true; }
      function findAll() { const P = pattern(); found = []; if (!P || !P.p.length) { render(); return null; } for (let o = 0; o + P.p.length <= len && found.length < 10000; o++) if (matchAt(P, o)) found.push(o); found.flen = P.p.length; return P; }
      function findGo(dir) {
        const P = findAll(); if (!P) return; if (!found.length) { E.toast(tr('No se encontró')); render(); return; }
        let i = dir > 0 ? found.findIndex(o => o > cur) : (() => { let k = -1; found.forEach((o, j) => { if (o < cur) k = j; }); return k; })();
        if (i < 0) i = dir > 0 ? 0 : found.length - 1; fIdx = i; cur = found[i]; anc = found[i] + P.p.length - 1; if (anc === cur) anc = -1; ensureVisible(); render();
      }
      function gotoStr(v) {
        v = String(v).trim(); if (!v) return; const rel = /^[+-]/.test(v) ? v[0] : ''; let s = v.replace(/^[+-]/, '').trim(), n;
        if (/^0x[0-9a-f]+$/i.test(s) || /^[0-9a-f]+h$/i.test(s)) n = parseInt(s.replace(/^0x|h$/gi, ''), 16); else if (/^\d+$/.test(s)) n = parseInt(s, 10); else if (/^[0-9a-f]+$/i.test(s)) n = parseInt(s, 16); else return E.toast(tr('Posición no válida'));
        cur = Math.max(0, Math.min(len, rel === '+' ? cur + n : rel === '-' ? cur - n : n)); anc = -1; ensureVisible(); render(); view.focus();
      }
      // ---- teclado y ratón
      const move = (to, ext) => { if (ext) { if (anc < 0) anc = cur; } else anc = -1; cur = Math.max(0, Math.min(len, to)); nib = 0; ensureVisible(); render(); };
      view.addEventListener('keydown', e => {
        const ctl = e.ctrlKey || e.metaKey, k = e.key;
        if (ctl && (k === 'z' || k === 'Z') && !e.shiftKey) { e.preventDefault(); doUndo(); return; }
        if (ctl && (k === 'y' || ((k === 'z' || k === 'Z') && e.shiftKey))) { e.preventDefault(); doRedo(); return; }
        if (ctl && k === 's') { e.preventDefault(); save(false); return; } if (ctl && k === 'o') { e.preventDefault(); act('open'); return; }
        if (ctl && k === 'f') { e.preventDefault(); q(b, '[data-find]').focus(); return; } if (ctl && k === 'g') { e.preventDefault(); q(b, '[data-goto]').focus(); return; }
        if (ctl && k === 'a') { e.preventDefault(); anc = 0; cur = Math.max(0, len - 1); render(); return; }
        if (ctl && k === 'c') { const s = sel() || (cur < len ? [cur, cur + 1] : null); if (s) { e.preventDefault(); const d = buf.subarray(s[0], s[1]); copy(pane === 'hex' ? [...d].map(x => H2[x]).join(' ') : new TextDecoder().decode(d)); } return; }
        if (k === 'F3') { e.preventDefault(); findGo(e.shiftKey ? -1 : 1); return; }
        if (k === 'Tab') { e.preventDefault(); pane = pane === 'hex' ? 'asc' : 'hex'; nib = 0; render(); return; }
        if (k === 'Insert') { e.preventDefault(); ins = !ins; status(); return; }
        const nav = { ArrowLeft: cur - 1, ArrowRight: cur + 1, ArrowUp: cur - ROW, ArrowDown: cur + ROW, PageUp: cur - ROW * (vis() - 1), PageDown: cur + ROW * (vis() - 1), Home: ctl ? 0 : cur - cur % ROW, End: ctl ? len : Math.min(len, cur - cur % ROW + ROW - 1) };
        if (k in nav) { e.preventDefault(); move(nav[k], e.shiftKey); return; }
        if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); const s = sel(); if (s) delRange(s[0], s[1]); else if (k === 'Delete' && cur < len) delRange(cur, cur + 1); else if (k === 'Backspace' && cur > 0) { cur--; delRange(cur, cur + 1); } return; }
        if (ctl || e.altKey || k.length !== 1) return;
        if (pane === 'hex') {
          if (!/^[0-9a-f]$/i.test(k)) return; e.preventDefault(); const d = parseInt(k, 16); const s = sel(); if (s) { delRange(s[0], s[1]); nib = 0; }
          if (nib === 0) { if (ins || s || cur >= len) op({ k: 'sp', o: cur, dl: 0, ins: new Uint8Array([d << 4]) }); else op({ k: 'set', o: cur, nw: new Uint8Array([(d << 4) | (buf[cur] & 15)]) }); nib = 1; render(); }
          else { op({ k: 'set', o: cur, nw: new Uint8Array([(buf[cur] & 0xf0) | d]) }); nib = 0; cur = Math.min(len, cur + 1); ensureVisible(); render(); }
        } else {
          e.preventDefault(); const s = sel(); if (s) delRange(s[0], s[1]); const bytes = new TextEncoder().encode(k);
          if (ins || s || cur >= len) op({ k: 'sp', o: cur, dl: 0, ins: bytes }); else op({ k: 'set', o: cur, nw: bytes.slice(0, Math.max(1, len - cur)) }); cur = Math.min(len, cur + bytes.length); ensureVisible(); render();
        }
      });
      b.addEventListener('paste', e => {
        if (document.activeElement !== view) return; const t = (e.clipboardData || {}).getData ? e.clipboardData.getData('text') : ''; if (!t) return; e.preventDefault();
        let bytes; if (pane === 'hex') { const h = t.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, ''); if (!h.length || h.length % 2) return E.toast(tr('El portapapeles no contiene bytes hexadecimales')); bytes = hexToU8(h); } else bytes = new TextEncoder().encode(t);
        const s = sel(); if (s) delRange(s[0], s[1]);
        if (ins || cur >= len) op({ k: 'sp', o: cur, dl: 0, ins: bytes }); else op({ k: 'set', o: cur, nw: bytes.slice(0, Math.max(0, len - cur)) }); cur = Math.min(len, cur + bytes.length); ensureVisible(); render();
      });
      view.addEventListener('scroll', () => requestAnimationFrame(render));
      const hit = e => e.target.closest('[data-o]');
      view.addEventListener('mousedown', e => { const h = hit(e); if (!h) return; e.preventDefault(); view.focus(); pane = h.dataset.p === 'a' ? 'asc' : 'hex'; const o = +h.dataset.o; if (e.shiftKey) { if (anc < 0) anc = cur; } else anc = o; cur = o; nib = 0; drag = true; render(); });
      view.addEventListener('mousemove', e => { if (!drag) return; const h = hit(e); if (h && +h.dataset.o !== cur) { cur = +h.dataset.o; render(); } });
      const mu = () => { if (drag) { drag = false; if (anc === cur) anc = -1; render(); } }; document.addEventListener('mouseup', mu);
      // táctil: tocar para situar el cursor
      view.addEventListener('click', e => { const h = hit(e); if (h && e.pointerType === 'touch') { cur = +h.dataset.o; anc = -1; render(); } });
      const doUndo = () => { const x = undo.pop(); if (!x) return; applyOp(x, true); redo.push(x); dirty = true; found = []; cur = Math.min(cur, len); render(); };
      const doRedo = () => { const x = redo.pop(); if (!x) return; applyOp(x, false); undo.push(x); dirty = true; found = []; render(); };
      async function act(k) {
        if (k === 'open') { const f = await U.pickBlob({ title: tr('Archivo para el editor hexadecimal') }); if (f) load(f); }
        if (k === 'save') save(false); if (k === 'saveas') save(true);
        if (k === 'new') { if (dirty && !await E.confirm(tr('Cambios sin guardar'), tr('¿Descartar los cambios?'))) return; buf = new Uint8Array(4096); len = 0; orig = new Uint8Array(0); name = tr('sin título') + '.bin'; fileId = null; dirty = false; cur = 0; anc = -1; undo = []; redo = []; render(); view.focus(); }
        if (k === 'undo') doUndo(); if (k === 'redo') doRedo(); if (k === 'mode') { ins = !ins; status(); view.focus(); }
        if (k === 'next') findGo(1); if (k === 'prev') findGo(-1);
      }
      b.addEventListener('click', async e => {
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k !== 'more') return act(k);
        const r = a.getBoundingClientRect(), s = sel();
        K.ui.menu(r.left, r.bottom + 4, [
          { label: tr('Insertar bytes…'), icon: '➕', act: async () => { const v = await E.form({ title: tr('Insertar bytes en la posición actual'), fields: [{ k: 'n', label: tr('Cantidad'), type: 'number', value: 16, req: true }, { k: 'v', label: tr('Valor (hex)'), value: '00' }] }); if (!v) return; const n = Math.max(1, Math.min(16777216, +v.n || 1)); const bv = parseInt(v.v, 16) & 255 || 0; op({ k: 'sp', o: cur, dl: 0, ins: new Uint8Array(n).fill(bv) }); } },
          { label: tr('Rellenar la selección…'), icon: '🪣', disabled: !s, act: async () => { const v = await E.form({ title: tr('Rellenar la selección'), fields: [{ k: 'v', label: tr('Valor (hex)'), value: '00', req: true }] }); if (!v || !s) return; op({ k: 'set', o: s[0], nw: new Uint8Array(s[1] - s[0]).fill(parseInt(v.v, 16) & 255 || 0) }); } },
          { label: tr('Eliminar la selección'), icon: '✂', disabled: !s, act: () => s && delRange(s[0], s[1]) },
          { label: tr('Seleccionar intervalo…'), icon: '↔', act: async () => { const v = await E.form({ title: tr('Seleccionar intervalo'), fields: [{ k: 's', label: tr('Desde (0x… o decimal)'), value: '0x' + cur.toString(16) }, { k: 'n', label: tr('Longitud en bytes'), type: 'number', value: 16 }] }); if (!v) return; const st0 = /^0x/i.test(v.s) ? parseInt(v.s, 16) : parseInt(v.s, 10); if (!(st0 >= 0)) return; anc = Math.min(len, st0); cur = Math.min(len, st0 + Math.max(1, +v.n || 1) - 1); ensureVisible(); render(); } },
          { sep: true },
          { label: tr('Copiar la selección como hexadecimal'), icon: '📋', disabled: !s, act: () => copy([...buf.subarray(s[0], s[1])].map(x => H2[x]).join(' ')) },
          { label: tr('Copiar como matriz C'), icon: '{}', disabled: !s, act: () => copy('{ ' + [...buf.subarray(s[0], s[1])].map(x => '0x' + H2[x]).join(', ') + ' }') },
          { label: tr('Guardar la selección como archivo…'), icon: '💾', disabled: !s, act: () => U.saveBlob(baseName(name) + '_' + s[0].toString(16) + '.bin', new Blob([buf.slice(s[0], s[1])]), 'documents') },
          { label: tr('Calcular huellas de la selección'), icon: '#', disabled: !s, act: async () => { await hashLib(); const r = await K.hash.compute(buf.slice(s[0], s[1]), ['CRC32', 'MD5', 'SHA-256']); E.form({ title: tr('Huellas de la selección'), ok: tr('Cerrar'), fields: Object.entries(r).map(([a2, h]) => ({ k: a2, label: a2, value: h })) }); } }
        ]);
      });
      b.addEventListener('keydown', e => {
        if (e.target.matches('[data-find]') && e.key === 'Enter') { e.preventDefault(); findGo(e.shiftKey ? -1 : 1); }
        if (e.target.matches('[data-goto]') && e.key === 'Enter') { e.preventDefault(); gotoStr(e.target.value); }
        if (e.target.matches('[data-wt]') && e.key === 'Enter') { e.preventDefault(); writeT(e.target.dataset.wt, cur, e.target.value.trim()); e.target.blur(); render(); }
        if (e.key === 'Escape' && e.target.matches('input')) { e.target.blur(); view.focus(); }
      });
      b.addEventListener('change', e => { const r = e.target.closest('[data-le]'); if (r) { le = r.dataset.le === '1'; inspector(); } });
      const ro = new ResizeObserver(() => render()); ro.observe(view);
      const argFile = async a => { const f = fid(a) && await F.get(fid(a)); if (f) load(f); };
      render(); argFile(arg);
      this.onOpen = (bb, ww, a) => argFile(a); this.destroy = () => { ro.disconnect(); document.removeEventListener('mouseup', mu); };
      K.ext.hexedit = { state: () => ({ len, cur, anc, name, dirty, ins, found: found.length, undo: undo.length, fileId }), bytes: () => buf.slice(0, len), load, save, gotoStr, findGo, typeByte, op, setPane: p => { pane = p; }, sel };
    }
  });

  /* ===================================================================
     Conversor universal de formatos: imágenes, datos, textos y codificaciones, documentos y audio
     =================================================================== */
  // ---- CSV
  const CSV = {
    sniff(t) { const line = String(t).replace(/^\uFEFF/, '').split(/\r?\n/).find(l => l.trim()) || ''; let best = ',', bn = -1; [',', ';', '\t', '|'].forEach(d => { let n = 0, inq = false; for (const ch of line) { if (ch === '"') inq = !inq; else if (ch === d && !inq) n++; } if (n > bn) { bn = n; best = d; } }); return best; },
    parse(t, d) {
      t = String(t).replace(/^\uFEFF/, ''); d = d || CSV.sniff(t); const rows = []; let row = [], f = '', i = 0, inq = false, quoted = false;
      while (i < t.length) {
        const c = t[i];
        if (inq) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i += 2; continue; } inq = false; i++; continue; } f += c; i++; continue; }
        if (c === '"' && f === '' && !quoted) { inq = true; quoted = true; i++; continue; }
        if (c === d) { row.push(f); f = ''; quoted = false; i++; continue; }
        if (c === '\r') { i++; continue; }
        if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; quoted = false; i++; continue; }
        f += c; i++;
      }
      if (f !== '' || row.length || quoted) { row.push(f); rows.push(row); }
      return rows.filter(r => r.length > 1 || r[0] !== '');
    },
    cell: (v, d) => { v = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /["\r\n]/.test(v) || v.includes(d) || /^\s|\s$/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; },
    stringify: (rows, d = ',') => rows.map(r => r.map(v => CSV.cell(v, d)).join(d)).join('\r\n') + '\r\n'
  };
  // ---- YAML (subconjunto práctico: mapas, listas, escalares, comillas, colecciones en línea y bloques | y >)
  const YAML = (() => {
    const dq = s => { try { return JSON.parse(s.replace(/\\x([0-9a-fA-F]{2})/g, '\\u00$1').replace(/\\0/g, '\\u0000').replace(/\\e/g, '\\u001b').replace(/\t/g, '\\t')); } catch { return s.slice(1, -1); } };
    const scalar = s => {
      s = s.trim(); if (s === '' || s === '~' || /^(null|Null|NULL)$/.test(s)) return null;
      if (/^(true|True|TRUE)$/.test(s)) return true; if (/^(false|False|FALSE)$/.test(s)) return false;
      if (/^[-+]?(0|[1-9][0-9_]*)$/.test(s)) { const n = Number(s.replace(/_/g, '')); return Number.isSafeInteger(n) ? n : s; }
      if (/^[-+]?(\d[\d_]*)?\.\d+([eE][-+]?\d+)?$/.test(s) || /^[-+]?\d+(\.\d*)?[eE][-+]?\d+$/.test(s)) return Number(s.replace(/_/g, ''));
      if (/^0x[0-9a-fA-F]+$/.test(s)) return parseInt(s, 16); if (/^0o[0-7]+$/.test(s)) return parseInt(s.slice(2), 8);
      if (s[0] === '"' && s.endsWith('"') && s.length > 1) return dq(s); if (s[0] === "'" && s.endsWith("'") && s.length > 1) return s.slice(1, -1).replace(/''/g, "'");
      if (s[0] === '[' || s[0] === '{') return flow(s);
      return s;
    };
    function flow(s) {
      let i = 0; const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
      const plainEnd = c => /[,\]}]/.test(c);
      const val = () => {
        ws(); const c = s[i];
        if (c === '[') { i++; const a = []; ws(); if (s[i] === ']') { i++; return a; } for (;;) { a.push(val()); ws(); if (s[i] === ',') { i++; ws(); if (s[i] === ']') { i++; return a; } continue; } if (s[i] === ']') { i++; return a; } throw new Error(tr('Lista entre corchetes sin cerrar')); } }
        if (c === '{') { i++; const o = {}; ws(); if (s[i] === '}') { i++; return o; } for (;;) { const k = key(); ws(); let v = null; if (s[i] === ':') { i++; v = val(); } o[k] = v; ws(); if (s[i] === ',') { i++; ws(); if (s[i] === '}') { i++; return o; } continue; } if (s[i] === '}') { i++; return o; } throw new Error(tr('Mapa entre llaves sin cerrar')); } }
        if (c === '"' || c === "'") { const st = i; i++; while (i < s.length) { if (s[i] === '\\' && c === '"') { i += 2; continue; } if (s[i] === c) { if (c === "'" && s[i + 1] === "'") { i += 2; continue; } break; } i++; } i++; return scalar(s.slice(st, i)); }
        const st = i; while (i < s.length && !plainEnd(s[i]) && !(s[i] === ':' && /[\s,\]}]/.test(s[i + 1] || ' '))) i++; return scalar(s.slice(st, i));
      };
      const key = () => { ws(); const c = s[i]; if (c === '"' || c === "'") return String(val()); const st = i; while (i < s.length && !(s[i] === ':' && /[\s,\]}]/.test(s[i + 1] || ' ')) && !/[,}]/.test(s[i])) i++; return s.slice(st, i).trim(); };
      const r = val(); ws(); if (i < s.length) throw new Error(tr('Texto sobrante tras la colección') + ': ' + s.slice(i, i + 20)); return r;
    }
    const stripComment = t => { let q2 = ''; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q2) { if (c === q2) { if (q2 === "'" && t[i + 1] === "'") { i++; continue; } q2 = ''; } else if (c === '\\' && q2 === '"') i++; continue; } if ((c === '"' || c === "'") && (i === 0 || /[\s[{,:-]/.test(t[i - 1]))) { q2 = c; continue; } if (c === '#' && (i === 0 || /\s/.test(t[i - 1]))) return t.slice(0, i).trimEnd(); } return t.trimEnd(); };
    const splitKey = t => {
      let k, rest;
      if (t[0] === '"' || t[0] === "'") { const c = t[0]; let i = 1; while (i < t.length) { if (t[i] === '\\' && c === '"') { i += 2; continue; } if (t[i] === c) { if (c === "'" && t[i + 1] === "'") { i += 2; continue; } break; } i++; } const after = t.slice(i + 1); const m = /^\s*:(\s|$)/.exec(after); if (!m) return null; k = String(scalar(t.slice(0, i + 1))); rest = after.slice(m[0].length); }
      else { const m = /^([^#[\]{},][^:]*?|[^:#]+?)\s*:(\s+|$)/.exec(t); if (!m || /^[-?]\s/.test(t)) return null; k = m[1].trim(); rest = t.slice(m[0].length); }
      return [k, rest.trim()];
    };
    function parse(text) {
      const lines = [];
      String(text).replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, i) => {
        if (/^(---|\.\.\.)(\s|$)/.test(raw)) { const r2 = raw.replace(/^---\s*/, ''); if (!r2.trim() || /^\.\.\./.test(raw)) return; raw = r2; }
        const ind = raw.match(/^ */)[0].length; if (raw[ind] === '\t') throw new Error(tr('Línea') + ' ' + (i + 1) + ': ' + tr('YAML no admite tabuladores como sangría'));
        const tx = stripComment(raw.slice(ind)); if (!tx.trim()) { lines.push({ blank: true, raw, n: i + 1 }); return; }
        lines.push({ ind, text: tx, raw, n: i + 1 });
      });
      let p = 0;
      const next = () => { while (p < lines.length && lines[p].blank) p++; return lines[p]; };
      const isSeq = t => t === '-' || t.startsWith('- ');
      function block(minInd) { const l = next(); if (!l || l.ind < minInd) return null; return isSeq(l.text) ? seq(l.ind) : map(l.ind); }
      function blockScalar(head, ind) {
        const fold = head[0] === '>', chomp = head.includes('-') ? 'strip' : head.includes('+') ? 'keep' : 'clip'; const buf = []; let bi = -1;
        while (p < lines.length) { const r = lines[p].raw; if (!r.trim()) { buf.push(''); p++; continue; } const ri = r.match(/^ */)[0].length; if (ri <= ind) break; if (bi < 0) bi = ri; if (ri < bi) break; buf.push(r.slice(bi)); p++; }
        let trail = 0; while (buf.length && buf[buf.length - 1] === '') { buf.pop(); trail++; }
        let s; if (fold) { s = ''; buf.forEach(ln => { if (ln === '') s += '\n'; else if (s && !s.endsWith('\n') && !/^\s/.test(ln)) s += ' ' + ln; else s += (s && !s.endsWith('\n') ? '\n' : '') + ln; }); } else s = buf.join('\n');
        return chomp === 'strip' ? s : chomp === 'keep' ? s + '\n'.repeat(trail + 1) : s + (buf.length ? '\n' : '');
      }
      const valueOf = (v, ind) => /^[|>][-+]?\d?$/.test(v.trim()) ? blockScalar(v.trim(), ind) : scalar(v);
      function seq(ind) {
        const out = [];
        for (;;) {
          const l = next(); if (!l || l.ind !== ind || !isSeq(l.text)) break;
          const rest = l.text === '-' ? '' : l.text.slice(2), lead = rest.length - rest.trimStart().length, r2 = rest.trimStart();
          if (!r2) { p++; out.push(block(ind + 1)); continue; }
          if (isSeq(r2)) { lines[p] = { ind: ind + 2 + lead, text: r2, raw: l.raw, n: l.n }; out.push(seq(ind + 2 + lead)); continue; }
          if (splitKey(r2) && !/^[[{]/.test(r2)) { lines[p] = { ind: ind + 2 + lead, text: r2, raw: l.raw, n: l.n }; out.push(map(ind + 2 + lead)); continue; }
          p++; out.push(valueOf(r2, ind));
        }
        return out;
      }
      function map(ind) {
        const out = {};
        for (;;) {
          const l = next(); if (!l || l.ind !== ind || isSeq(l.text)) break;
          const m = splitKey(l.text); if (!m) throw new Error(tr('Línea') + ' ' + l.n + ': ' + tr('se esperaba «clave: valor»'));
          p++; const [k, v] = m;
          if (v === '') { const n2 = next(); if (n2 && n2.ind > ind) out[k] = block(n2.ind); else if (n2 && n2.ind === ind && isSeq(n2.text)) out[k] = seq(ind); else out[k] = null; }
          else out[k] = valueOf(v, ind);
        }
        return out;
      }
      const f = next(); if (!f) return null;
      if (lines.filter(l => !l.blank).length === 1 && !isSeq(f.text) && !splitKey(f.text)) return scalar(f.text);
      const r = block(0); const rest = next(); if (rest) throw new Error(tr('Línea') + ' ' + rest.n + ': ' + tr('sangría inesperada'));
      return r;
    }
    const needQ = s => s === '' || /^\s|\s$/.test(s) || /:\s|\s#|:$/.test(s) || /^[-?:,[\]{}#&*!|>'"%@`]/.test(s) || /^(true|false|yes|no|on|off|null|~|y|n)$/i.test(s) || (/^[-+.]?\d/.test(s) && !isNaN(Number(s))) || /^0[xo]/i.test(s) || /[\u0000-\u001f\u007f]/.test(s);
    const qs = s => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/[\u0000-\u001f\u007f]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) + '"';
    function dump(v) {
      const L = [], isSc = x => x === null || x === undefined || typeof x !== 'object' || (Array.isArray(x) ? !x.length : !Object.keys(x).length);
      const inl = (x, ind) => { if (x === null || x === undefined) return 'null'; if (Array.isArray(x)) return '[]'; if (typeof x === 'object') return '{}'; if (typeof x === 'string') { if (x.includes('\n') && !/[\u0000-\u0009\u000b-\u001f]/.test(x) && !/^\s/.test(x)) return (x.endsWith('\n') ? '|' : '|-') + '\n' + x.replace(/\n$/, '').split('\n').map(l => (l ? '  '.repeat(ind + 1) + l : '')).join('\n'); return needQ(x) ? qs(x) : x; } return typeof x === 'number' && !Number.isFinite(x) ? 'null' : String(x); };
      const node = (x, ind) => {
        const pad = '  '.repeat(ind);
        if (Array.isArray(x)) x.forEach(it => { if (isSc(it)) L.push(pad + '- ' + inl(it, ind)); else if (Array.isArray(it)) { L.push(pad + '-'); node(it, ind + 1); } else { const st = L.length; node(it, ind + 1); L[st] = pad + '- ' + L[st].slice((ind + 1) * 2); } });
        else Object.entries(x).forEach(([k, val]) => { const kk = needQ(k) ? qs(k) : k; if (isSc(val)) L.push(pad + kk + ': ' + inl(val, ind)); else { L.push(pad + kk + ':'); node(val, ind + 1); } });
      };
      if (isSc(v)) return inl(v, 0) + '\n'; node(v, 0); return L.join('\n') + '\n';
    }
    return { parse, dump, scalar };
  })();
  // ---- XML
  function xmlToJs(text) {
    const d = new DOMParser().parseFromString(String(text).replace(/^\uFEFF/, ''), 'application/xml'), err = d.querySelector('parsererror');
    if (err) throw new Error(tr('XML no válido') + ': ' + (err.textContent || '').split('\n').filter(Boolean)[0].slice(0, 160));
    const conv = el => {
      const kids = [...el.children], attrs = [...el.attributes], text = [...el.childNodes].filter(n => n.nodeType === 3 || n.nodeType === 4).map(n => n.nodeValue).join('').trim();
      if (!kids.length && !attrs.length) return text;
      const o = {}; attrs.forEach(a => { o['@' + a.name] = a.value; });
      kids.forEach(k => { const v = conv(k), n = k.tagName; if (n in o) { if (!Array.isArray(o[n])) o[n] = [o[n]]; o[n].push(v); } else o[n] = v; });
      if (text) o['#text'] = text; return o;
    };
    return { [d.documentElement.tagName]: conv(d.documentElement) };
  }
  const xname = n => { let s = String(n).replace(/[^\p{L}\p{N}_.-]/gu, '_'); if (!/^[\p{L}_]/u.test(s)) s = '_' + s; return /^xml/i.test(s) ? '_' + s : s; };
  const xesc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function jsToXml(v) {
    let root = 'datos'; if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && !Object.keys(v)[0].startsWith('@') && !Array.isArray(Object.values(v)[0])) { root = Object.keys(v)[0]; v = v[root]; }
    const out = ['<?xml version="1.0" encoding="UTF-8"?>'];
    const el = (name, val, ind) => {
      const pad = '  '.repeat(ind), n = xname(name);
      if (Array.isArray(val)) { val.forEach(x => el(name, x, ind)); return; }
      if (val === null || val === undefined || val === '') { out.push(`${pad}<${n}/>`); return; }
      if (typeof val !== 'object') { out.push(`${pad}<${n}>${xesc(val)}</${n}>`); return; }
      const at = Object.entries(val).filter(([k]) => k.startsWith('@')).map(([k, x]) => ` ${xname(k.slice(1))}="${xesc(x)}"`).join(''), kids = Object.entries(val).filter(([k]) => !k.startsWith('@') && k !== '#text'), txt = val['#text'];
      if (!kids.length) { out.push(txt != null ? `${pad}<${n}${at}>${xesc(txt)}</${n}>` : `${pad}<${n}${at}/>`); return; }
      out.push(`${pad}<${n}${at}>`); if (txt != null) out.push(`${pad}  ${xesc(txt)}`); kids.forEach(([k, x]) => el(k, x, ind + 1)); out.push(`${pad}</${n}>`);
    };
    if (Array.isArray(v)) { out.push(`<${xname(root)}>`); v.forEach(x => el('item', x, 1)); out.push(`</${xname(root)}>`); } else el(root, v, 0);
    return out.join('\n') + '\n';
  }
  // ---- tablas
  const flatten = (o, pre = '', out = {}) => { Object.entries(o).forEach(([k, val]) => { const key = pre ? pre + '.' + k : k; if (val && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length) flatten(val, key, out); else out[key] = Array.isArray(val) ? (val.every(x => x == null || typeof x !== 'object') ? val.join('; ') : JSON.stringify(val)) : val; }); return out; };
  function toTable(v) {
    for (let k = 0; k < 3 && v && typeof v === 'object' && !Array.isArray(v); k++) { const ks = Object.keys(v); const arrs = ks.filter(x => Array.isArray(v[x])); if (arrs.length === 1) { v = v[arrs[0]]; break; } if (ks.length === 1 && v[ks[0]] && typeof v[ks[0]] === 'object') { v = v[ks[0]]; continue; } v = [v]; break; }
    if (v && typeof v === 'object' && !Array.isArray(v)) v = [v];
    if (!Array.isArray(v) || !v.length) return null;
    if (v.every(Array.isArray)) { const w = Math.max(...v.map(r => r.length)); return { cols: null, rows: v.map(r => Array.from({ length: w }, (_, i) => r[i] ?? '')) }; }
    const flat = v.map(x => x && typeof x === 'object' && !Array.isArray(x) ? flatten(x) : { [tr('valor')]: x }); const cols = [];
    flat.forEach(o => Object.keys(o).forEach(k => { if (!cols.includes(k)) cols.push(k); }));
    return { cols, rows: flat.map(o => cols.map(c => o[c] ?? '')) };
  }
  const coerce = s => typeof s !== 'string' ? s : /^-?(0|[1-9]\d*)(\.\d+)?([eE][-+]?\d+)?$/.test(s.trim()) && s.trim().length < 16 ? Number(s) : /^(true|false)$/i.test(s.trim()) ? s.trim().toLowerCase() === 'true' : s;
  function rowsToObjects(rows, header, types) { if (!rows.length) return []; if (!header) return rows.map(r => r.map(x => types ? coerce(x) : x)); const h = rows[0].map((x, i) => String(x).trim() || tr('columna') + ' ' + (i + 1)); const seen = {}; const keys = h.map(k => { seen[k] = (seen[k] || 0) + 1; return seen[k] > 1 ? k + '_' + seen[k] : k; }); return rows.slice(1).map(r => Object.fromEntries(keys.map((k, i) => [k, types ? coerce(r[i] ?? '') : r[i] ?? '']))); }
  function mdTable(t) { return String(t).split(/\r?\n/).map(l => l.trim()).filter(l => l.includes('|')).filter(l => !(/^[\s|:-]+$/.test(l) && l.includes('-'))).map(l => l.replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|').replace(/<br\s*\/?>/gi, '\n'))); }
  const tblRows = (t, withHead = true) => t.cols ? (withHead ? [t.cols] : []).concat(t.rows) : t.rows;
  const mdCell = v => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
  const sqlV = v => v === null || v === undefined || v === '' ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : "'" + String(v).replace(/'/g, "''") + "'";
  function toSql(t, name) {
    const cols = t.cols || t.rows[0].map((_, i) => 'c' + (i + 1)), id = s => '"' + String(s).replace(/"/g, '""') + '"';
    const isInt = x => typeof x === 'number' ? Number.isInteger(x) : /^-?\d+$/.test(String(x)), isNum = x => typeof x === 'number' ? Number.isFinite(x) : /^-?\d+(\.\d+)?$/.test(String(x));
    const typ = cols.map((_, i) => { const vs = t.rows.map(r => r[i]).filter(x => x !== '' && x != null); return vs.length && vs.every(isInt) ? 'INTEGER' : vs.length && vs.every(isNum) ? 'REAL' : 'TEXT'; });
    return `CREATE TABLE ${id(name)} (\n${cols.map((c, i) => `  ${id(c)} ${typ[i]}`).join(',\n')}\n);\n` + t.rows.map(r => `INSERT INTO ${id(name)} (${cols.map(id).join(', ')}) VALUES (${r.map((v, i) => typ[i] !== 'TEXT' && v !== '' && v != null ? String(Number(v)) : sqlV(v)).join(', ')});`).join('\n') + '\n';
  }
  const DFMT = [['auto', 'Detectar automáticamente'], ['csv', 'CSV'], ['tsv', 'TSV'], ['json', 'JSON'], ['xml', 'XML'], ['yaml', 'YAML'], ['md', 'Tabla Markdown']];
  const OFMT = [['json', 'JSON'], ['csv', 'CSV'], ['tsv', 'TSV'], ['xml', 'XML'], ['yaml', 'YAML'], ['md', 'Tabla Markdown'], ['html', 'Tabla HTML'], ['sql', 'SQL (CREATE + INSERT)']];
  const OEXT = { json: 'json', csv: 'csv', tsv: 'tsv', xml: 'xml', yaml: 'yaml', md: 'md', html: 'html', sql: 'sql' };
  function detectFmt(t) { const s = String(t).replace(/^\uFEFF/, '').trim(); if (!s) return 'json'; if (/^[[{]/.test(s)) { try { JSON.parse(s); return 'json'; } catch { /* sigue */ } } if (/^<(\?xml|[\p{L}_])/u.test(s)) return 'xml'; const ls = s.split(/\r?\n/); if (ls.length > 1 && /^\|?.*\|.*\|?$/.test(ls[0]) && /^[\s|:-]+$/.test(ls[1]) && ls[1].includes('-')) return 'md'; if (ls[0].includes('\t')) return 'tsv'; if (/^(---|- |[\w"' -]+:(\s|$))/.test(s) && !/^[^:\n]*,/.test(ls[0])) return 'yaml'; return 'csv'; }
  function parseData(t, fmt, o) {
    if (fmt === 'auto') fmt = detectFmt(t);
    if (fmt === 'json') return { fmt, v: JSON.parse(String(t).replace(/^\uFEFF/, '')) };
    if (fmt === 'xml') return { fmt, v: xmlToJs(t) };
    if (fmt === 'yaml') return { fmt, v: YAML.parse(t) };
    const rows = fmt === 'md' ? mdTable(t) : CSV.parse(t, fmt === 'tsv' ? '\t' : o.delim === 'auto' ? null : o.delim);
    return { fmt, v: rowsToObjects(rows, o.header, o.types) };
  }
  function emitData(v, fmt, o) {
    if (fmt === 'json') return JSON.stringify(v, null, o.indent === 'min' ? 0 : +o.indent || 2) + (o.indent === 'min' ? '' : '\n');
    if (fmt === 'yaml') return YAML.dump(v);
    if (fmt === 'xml') return jsToXml(v);
    const t = toTable(v); if (!t) throw new Error(tr('Estos datos no tienen forma de tabla (se necesita una lista de registros).'));
    if (fmt === 'csv') return CSV.stringify(tblRows(t), o.odelim === 'tab' ? '\t' : o.odelim || ',');
    if (fmt === 'tsv') return CSV.stringify(tblRows(t), '\t');
    if (fmt === 'md') { const r = tblRows(t), w = Math.max(...r.map(x => x.length)), h = t.cols || r[0].map((_, i) => tr('columna') + ' ' + (i + 1)), body = t.cols ? t.rows : r; return '| ' + h.map(mdCell).join(' | ') + ' |\n|' + ' --- |'.repeat(w) + '\n' + body.map(x => '| ' + x.map(mdCell).join(' | ') + ' |').join('\n') + '\n'; }
    if (fmt === 'html') { const body = t.rows; return `<table>\n${t.cols ? `  <thead><tr>${t.cols.map(c => `<th>${esc(String(c))}</th>`).join('')}</tr></thead>\n` : ''}  <tbody>\n${body.map(r => `    <tr>${r.map(c => `<td>${esc(String(c ?? ''))}</td>`).join('')}</tr>`).join('\n')}\n  </tbody>\n</table>\n`; }
    if (fmt === 'sql') return toSql(t, o.table || 'datos');
    throw new Error('?');
  }
  // ---- imágenes
  const IMGF = [['png', 'PNG', 'image/png'], ['jpg', 'JPEG', 'image/jpeg'], ['webp', 'WebP', 'image/webp'], ['avif', 'AVIF', 'image/avif'], ['bmp', 'BMP', 'image/bmp'], ['ico', 'ICO (favicon)', 'image/x-icon']];
  const encOK = {};
  async function canEncode(type) { if (type === 'image/bmp' || type === 'image/x-icon' || type === 'image/png') return true; if (type in encOK) return encOK[type]; const c = document.createElement('canvas'); c.width = c.height = 2; const bl = await new Promise(r => c.toBlob(r, type, .8)); return (encOK[type] = !!bl && bl.type === type); }
  async function decodeImg(blob) {
    try { return await createImageBitmap(blob); } catch { /* p. ej. SVG: se dibuja con <img> */ }
    const u = URL.createObjectURL(blob); try { const im = new Image(); im.src = u; await im.decode(); const c = document.createElement('canvas'); c.width = im.naturalWidth || 512; c.height = im.naturalHeight || 512; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return await createImageBitmap(c); } catch { throw new Error(tr('El navegador no puede leer esta imagen')); } finally { URL.revokeObjectURL(u); }
  }
  function drawImg(bmp, o) {
    let w = bmp.width, h = bmp.height;
    if (o.size === 'pct') { w = Math.max(1, Math.round(w * o.pct / 100)); h = Math.max(1, Math.round(h * o.pct / 100)); }
    if (o.size === 'max') { const s = Math.min(1, (o.mw || w) / w, (o.mh || h) / h); w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s)); }
    if (o.size === 'exact') { w = Math.max(1, +o.ew || w); h = Math.max(1, +o.eh || h); }
    w = Math.min(w, 16384); h = Math.min(h, 16384);
    const rot = ((+o.rot || 0) % 360 + 360) % 360, cw = rot % 180 ? h : w, ch = rot % 180 ? w : h, c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d'); if (o.fill) { g.fillStyle = o.bg || '#ffffff'; g.fillRect(0, 0, cw, ch); }
    g.imageSmoothingQuality = 'high'; g.translate(cw / 2, ch / 2); g.rotate(rot * Math.PI / 180); if (o.flip) g.scale(-1, 1); g.drawImage(bmp, -w / 2, -h / 2, w, h); return c;
  }
  function bmpEncode(c) {
    const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data, rs = (w * 3 + 3) & ~3, size = 54 + rs * h, u = new Uint8Array(size), v = new DataView(u.buffer);
    u[0] = 0x42; u[1] = 0x4d; v.setUint32(2, size, true); v.setUint32(10, 54, true); v.setUint32(14, 40, true); v.setInt32(18, w, true); v.setInt32(22, h, true); v.setUint16(26, 1, true); v.setUint16(28, 24, true); v.setUint32(34, rs * h, true); v.setInt32(38, 2835, true); v.setInt32(42, 2835, true);
    for (let y = 0; y < h; y++) { const row = 54 + (h - 1 - y) * rs; for (let x = 0; x < w; x++) { const s = (y * w + x) * 4, t = row + x * 3; u[t] = d[s + 2]; u[t + 1] = d[s + 1]; u[t + 2] = d[s]; } }
    return new Blob([u], { type: 'image/bmp' });
  }
  async function icoEncode(bmp, sizes) {
    const pngs = [];
    for (const s of sizes) { const c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'), k = Math.min(s / bmp.width, s / bmp.height), w = bmp.width * k, h = bmp.height * k; g.imageSmoothingQuality = 'high'; g.drawImage(bmp, (s - w) / 2, (s - h) / 2, w, h); pngs.push([s, new Uint8Array(await (await new Promise(r => c.toBlob(r, 'image/png'))).arrayBuffer())]); }
    const head = new Uint8Array(6 + 16 * pngs.length), v = new DataView(head.buffer); v.setUint16(2, 1, true); v.setUint16(4, pngs.length, true); let off = head.length;
    pngs.forEach(([s, p], i) => { const e = 6 + i * 16; head[e] = s >= 256 ? 0 : s; head[e + 1] = s >= 256 ? 0 : s; v.setUint16(e + 4, 1, true); v.setUint16(e + 6, 32, true); v.setUint32(e + 8, p.length, true); v.setUint32(e + 12, off, true); off += p.length; });
    return new Blob([head, ...pngs.map(x => x[1])], { type: 'image/x-icon' });
  }
  // ---- audio
  function wavEncode(ab, float) {
    const ch = ab.numberOfChannels, n = ab.length, bps = float ? 4 : 2, size = 44 + n * ch * bps, u = new ArrayBuffer(size), v = new DataView(u), w4 = (o, s) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w4(0, 'RIFF'); v.setUint32(4, size - 8, true); w4(8, 'WAVE'); w4(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, float ? 3 : 1, true); v.setUint16(22, ch, true); v.setUint32(24, ab.sampleRate, true); v.setUint32(28, ab.sampleRate * ch * bps, true); v.setUint16(32, ch * bps, true); v.setUint16(34, bps * 8, true); w4(36, 'data'); v.setUint32(40, n * ch * bps, true);
    const data = [...Array(ch)].map((_, i) => ab.getChannelData(i)); let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const x = Math.max(-1, Math.min(1, data[c][i])); if (float) { v.setFloat32(o, x, true); o += 4; } else { v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2; } }
    return new Blob([u], { type: 'audio/wav' });
  }
  async function renderAudio(buf, o) {
    const s0 = Math.max(0, Math.min(buf.duration, +o.start || 0)), e0 = Math.max(s0 + .01, Math.min(buf.duration, +o.end || buf.duration)), dur = e0 - s0;
    const rate = +o.rate || buf.sampleRate, ch = +o.ch || buf.numberOfChannels, oc = new OfflineAudioContext(ch, Math.max(1, Math.ceil(dur * rate)), rate), src = oc.createBufferSource(), g = oc.createGain(); src.buffer = buf; src.connect(g).connect(oc.destination);
    let gain = 1; if (o.norm) { let pk = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c), a = Math.floor(s0 * buf.sampleRate), b2 = Math.min(d.length, Math.ceil(e0 * buf.sampleRate)); for (let i = a; i < b2; i++) { const x = d[i] < 0 ? -d[i] : d[i]; if (x > pk) pk = x; } } if (pk > 0) gain = 0.891 / pk; }
    g.gain.setValueAtTime(o.fadeIn ? 0 : gain, 0); if (o.fadeIn) g.gain.linearRampToValueAtTime(gain, Math.min(dur, +o.fadeIn)); if (o.fadeOut) { g.gain.setValueAtTime(gain, Math.max(0, dur - o.fadeOut)); g.gain.linearRampToValueAtTime(0, dur); }
    src.start(0, s0, dur); return oc.startRendering();
  }
  async function opusEncode(ab, onProg) {
    const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)); if (!type) throw new Error(tr('Este navegador no puede grabar audio comprimido'));
    const ac = new AudioContext(), dst = ac.createMediaStreamDestination(), src = ac.createBufferSource(); src.buffer = ab; src.connect(dst); await ac.resume();
    const rec = new MediaRecorder(dst.stream, { mimeType: type, audioBitsPerSecond: 128000 }), parts = []; rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    const stopped = new Promise(r => { rec.onstop = r; }), ended = new Promise(r => { src.onended = r; }); rec.start(500); const t0 = ac.currentTime; src.start();
    const iv = setInterval(() => onProg && onProg(Math.min(1, (ac.currentTime - t0) / ab.duration)), 250);
    await ended; await new Promise(r => setTimeout(r, 250)); rec.stop(); await stopped; clearInterval(iv); ac.close();
    return new Blob(parts, { type: type.split(';')[0] });
  }
  // ---- textos y codificaciones
  const u8b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const b64u8 = s => { s = String(s).trim().replace(/^data:[^,]*,/, '').replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  const TE = new TextEncoder(), TD = new TextDecoder();
  const TXOPS = [
    ['b64e', 'Texto → Base64', s => u8b64(TE.encode(s))], ['b64u', 'Texto → Base64 para URL', s => u8b64(TE.encode(s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')], ['b64d', 'Base64 → texto', s => TD.decode(b64u8(s))],
    ['hexe', 'Texto → hexadecimal', s => [...TE.encode(s)].map(x => x.toString(16).padStart(2, '0')).join(' ')], ['hexd', 'Hexadecimal → texto', s => { const h = s.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, ''); if (h.length % 2) throw new Error(tr('Número impar de dígitos hexadecimales')); return TD.decode(hexToU8(h)); }],
    ['urle', 'Codificar URL (percent-encoding)', s => encodeURIComponent(s)], ['urld', 'Decodificar URL', s => decodeURIComponent(s.replace(/\+/g, ' '))],
    ['htmle', 'Codificar entidades HTML', s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/[\u00a0-\uffff]/g, c => '&#' + c.codePointAt(0) + ';')], ['htmld', 'Decodificar entidades HTML', s => new DOMParser().parseFromString('<!doctype html><body><textarea>' + s.replace(/<\/textarea/gi, '&lt;/textarea') + '</textarea>', 'text/html').querySelector('textarea').value],
    ['bine', 'Texto → binario (8 bits)', s => [...TE.encode(s)].map(x => x.toString(2).padStart(8, '0')).join(' ')], ['bind', 'Binario → texto', s => { const bits = s.replace(/[^01]/g, ''); if (bits.length % 8) throw new Error(tr('El número de bits no es múltiplo de 8')); return TD.decode(Uint8Array.from(bits.match(/.{8}/g) || [], x => parseInt(x, 2))); }],
    ['unie', 'Texto → escapes \\uXXXX', s => [...s].map(c => { const p = c.codePointAt(0); return p < 128 ? c : p > 0xffff ? c.split('').map(u => '\\u' + u.charCodeAt(0).toString(16).padStart(4, '0')).join('') : '\\u' + p.toString(16).padStart(4, '0'); }).join('')], ['unid', 'Escapes \\uXXXX → texto', s => s.replace(/\\u\{([0-9a-f]+)\}/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))],
    ['upper', 'MAYÚSCULAS', s => s.toLocaleUpperCase()], ['lower', 'minúsculas', s => s.toLocaleLowerCase()], ['title', 'Tipo Título', s => s.toLocaleLowerCase().replace(/(^|[\s(¿¡"'«-])(\p{L})/gu, (m, a, c) => a + c.toLocaleUpperCase())],
    ['noacc', 'Quitar tildes y diacríticos', s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')], ['slug', 'Convertir en slug (para URL)', s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')], ['rot13', 'ROT13', s => s.replace(/[a-z]/gi, c => String.fromCharCode((c <= 'Z' ? 65 : 97) + (c.toLowerCase().charCodeAt(0) - 97 + 13) % 26))],
    ['crlf', 'Fin de línea Windows (CRLF)', s => s.replace(/\r?\n/g, '\r\n')], ['lf', 'Fin de línea Unix (LF)', s => s.replace(/\r\n?/g, '\n')], ['trim', 'Quitar espacios sobrantes', s => s.split(/\r?\n/).map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n')]
  ];
  const ENCS = ['utf-8', 'windows-1252', 'iso-8859-1', 'iso-8859-15', 'utf-16le', 'utf-16be', 'macintosh', 'ibm866', 'koi8-r', 'windows-1251', 'shift_jis', 'euc-jp', 'gbk', 'big5', 'euc-kr'];
  const sniffEnc = u => { if (u[0] === 0xef && u[1] === 0xbb && u[2] === 0xbf) return 'utf-8'; if (u[0] === 0xff && u[1] === 0xfe) return 'utf-16le'; if (u[0] === 0xfe && u[1] === 0xff) return 'utf-16be'; try { new TextDecoder('utf-8', { fatal: true }).decode(u.subarray(0, 4 * 1048576)); return 'utf-8'; } catch { return 'windows-1252'; } };
  // ---- documentos
  async function docToHtml(name, blob) {
    const e = extOf(name);
    if (e === 'docx') { if (!K.docx) await K.loadScript('js/os9/docx.js'); return K.sanitize(await K.docx.toHtml(blob)); }
    const t = await blob.text();
    if (e === 'md' || e === 'markdown') { const r = K.md(t); return K.sanitize(String(typeof r === 'string' ? r : r.html).replace(/<a href="#" data-external-url="([^"]+)"/g, '<a href="$1"')); }
    if (e === 'html' || e === 'htm') { const d = new DOMParser().parseFromString(t, 'text/html'); return K.sanitize(d.body ? d.body.innerHTML : t); }
    return t.replace(/\r\n/g, '\n').split(/\n{2,}/).map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('');
  }
  function htmlToMd(html) {
    const d = new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html'), out = [];
    const inl = n => [...n.childNodes].map(x => { if (x.nodeType === 3) return x.nodeValue.replace(/\s+/g, ' ').replace(/([*_`\\[\]])/g, '\\$1'); if (x.nodeType !== 1) return ''; const t = x.tagName.toLowerCase(), c = inl(x); switch (t) { case 'strong': case 'b': return c.trim() ? `**${c.trim()}**` : c; case 'em': case 'i': return c.trim() ? `*${c.trim()}*` : c; case 'code': return '`' + x.textContent + '`'; case 'a': return `[${c}](${x.getAttribute('data-external-url') || x.getAttribute('href') || ''})`; case 'img': return `![${x.getAttribute('alt') || ''}](${x.getAttribute('src') || ''})`; case 'br': return '  \n'; case 's': case 'del': case 'strike': return `~~${c}~~`; case 'sup': return '^' + c; case 'sub': return '~' + c; default: return c; } }).join('');
    const list = (el, depth) => { let i = 1; [...el.children].forEach(li => { if (li.tagName !== 'LI') return; const sub = [...li.children].filter(c => /^(UL|OL)$/.test(c.tagName)), cl = li.cloneNode(true); cl.querySelectorAll('ul,ol').forEach(c => c.remove()); out.push('  '.repeat(depth) + (el.tagName === 'OL' ? (i++) + '. ' : '- ') + inl(cl).trim()); sub.forEach(s => list(s, depth + 1)); }); };
    const blk = n => [...n.childNodes].forEach(x => {
      if (x.nodeType === 3) { const t = x.nodeValue.trim(); if (t) out.push(t, ''); return; } if (x.nodeType !== 1) return; const t = x.tagName.toLowerCase();
      if (/^h[1-6]$/.test(t)) out.push('#'.repeat(+t[1]) + ' ' + inl(x).trim(), '');
      else if (t === 'p') { const s = inl(x).trim(); if (s) out.push(s, ''); }
      else if (t === 'ul' || t === 'ol') { list(x, 0); out.push(''); }
      else if (t === 'blockquote') out.push(...htmlToMd(x.innerHTML).trim().split('\n').map(l => '> ' + l), '');
      else if (t === 'pre') out.push('```', x.textContent.replace(/\n$/, ''), '```', '');
      else if (t === 'hr') out.push('---', '');
      else if (t === 'table') { const rows = [...x.querySelectorAll('tr')].map(r => [...r.children].map(c => inl(c).trim().replace(/\|/g, '\\|'))); if (rows.length) { const w = Math.max(...rows.map(r => r.length)), fix = r => Array.from({ length: w }, (_, i) => r[i] || ''); out.push('| ' + fix(rows[0]).join(' | ') + ' |', '|' + ' --- |'.repeat(w), ...rows.slice(1).map(r => '| ' + fix(r).join(' | ') + ' |'), ''); } }
      else if (/^(div|section|article|main|header|footer|body|figure)$/.test(t)) blk(x);
      else { const s = inl(x).trim(); if (s) out.push(s, ''); }
    });
    blk(d.body); return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }
  function htmlToText(html) { const el = document.createElement('div'); el.style.cssText = 'position:fixed;left:-99999px;top:0;width:800px;white-space:normal'; el.innerHTML = K.sanitize(html); document.body.appendChild(el); const t = el.innerText; el.remove(); return t.replace(/\n{3,}/g, '\n\n').trim() + '\n'; }
  async function htmlToPdf(html, title) {
    if (!K.pdf) await K.loadScript('js/os9/apps/productivity.js');
    const d = new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html'), blocks = [];
    const walk = n => [...n.children].forEach(x => { const t = x.tagName.toLowerCase(), txt = (x.innerText || x.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^h[1-6]$/.test(t)) { if (txt) blocks.push({ text: txt, size: [0, 20, 16, 14, 12.5, 12, 11][+t[1]], bold: true, gap: 10 }); }
      else if (t === 'p' || t === 'blockquote') { if (txt) blocks.push({ text: txt, size: 11, gap: 5 }); }
      else if (t === 'pre') blocks.push({ text: x.textContent, size: 10, gap: 5 });
      else if (t === 'ul' || t === 'ol') [...x.querySelectorAll('li')].forEach((li, i) => blocks.push({ text: (t === 'ol' ? (i + 1) + '. ' : '• ') + li.textContent.replace(/\s+/g, ' ').trim(), size: 11, gap: 2 }));
      else if (t === 'table') [...x.querySelectorAll('tr')].forEach((r, i) => blocks.push({ text: [...r.children].map(c => c.textContent.trim()).join('  |  '), size: 10, bold: i === 0, gap: 2 }));
      else if (t === 'hr') blocks.push({ text: '', size: 6, gap: 6 });
      else if (x.children.length) walk(x); else if (txt) blocks.push({ text: txt, size: 11, gap: 5 }); });
    walk(d.body);
    const doc = new K.pdf.Doc({ size: 'a4', title }), all = blocks.map(b2 => b2.text).join('\n');
    if (K.pdf.latinOnly(all)) doc.addText(blocks.length ? blocks : [{ text: ' ', size: 11 }]); else await K.pdf.textAsImages(doc, blocks.map(b2 => b2.text).join('\n\n'), { size: 11 });
    return doc.build();
  }

  K.define('fconvert', {
    init(b, w, arg) {
      const C = K.cfg('fconvert', { tab: 'img', ifmt: 'png', q: 85, size: 'orig', pct: 50, mw: 1920, mh: 1080, bg: '#ffffff', icoSizes: '16,32,48,256', dfmt: 'auto', ofmt: 'json', indent: '2', header: true, types: true, delim: 'auto', odelim: ',', txop: 'b64e', docOut: 'md', aRate: 0, aCh: 0, aFmt: 'wav16', aNorm: false });
      let tab = C.get('tab', 'img'), imgs = [], doc = null, aud = null, encFile = null, din = C.get('din', ''), tin = C.get('tin', ''), dout = '', tout = '';
      b.innerHTML = `<div class="k9 s10-fc">${U.tabs([['img', 'Imágenes', 'image'], ['data', 'Datos', 'list'], ['text', 'Texto y codificación', 'code'], ['doc', 'Documentos', 'file'], ['audio', 'Audio', 'music']], tab)}<div class="s10-fc-b" data-v></div></div>`;
      const V = q(b, '[data-v]'), opt = (k, list, cur) => list.map(([v, l]) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(tr(l))}</option>`).join('');
      const res = (h) => { const r = q(V, '[data-res]'); if (r) r.innerHTML = h; };
      /* ---------- Imágenes ---------- */
      async function drawImg2() {
        const f = C.get('ifmt', 'png'), sz = C.get('size', 'orig');
        const sup = {}; for (const [k, , t] of IMGF) sup[k] = await canEncode(t);
        if (tab !== 'img') return;
        V.innerHTML = `<div class="s10-fc-grid"><div><div class="s10-hc-drop" data-drop>${I('image', 26)}<span>${esc(tr('Arrastra imágenes aquí o elígelas'))}</span><div class="k9-row" style="justify-content:center;flex-wrap:wrap"><button class="k9-btn pri" data-a="iadd">${I('plus', 14)} ${esc(tr('Añadir imágenes…'))}</button><button class="k9-btn" data-a="iclear" ${imgs.length ? '' : 'disabled'}>${I('trash', 14)}</button></div></div><div class="s10-fc-imgs">${imgs.map((im, i) => `<div class="s10-fc-im"><img src="${im.url}" alt=""><div><b>${esc(im.name)}</b><small>${im.bmp.width}×${im.bmp.height} · ${B(im.blob.size)}</small>${im.out ? `<small class="s10-hc-ok">→ ${esc(im.out.name)} · ${B(im.out.size)} (${im.out.size < im.blob.size ? '−' : '+'}${Math.abs(Math.round((1 - im.out.size / im.blob.size) * 100))} %)</small>` : ''}</div><button class="k9-btn" data-irm="${i}">${I('close', 12)}</button></div>`).join('')}</div></div>
          <div class="k9-card s10-fc-opt"><label class="k9-field">${esc(tr('Formato de salida'))}<select class="input-text" data-c="ifmt">${IMGF.map(([k, l]) => `<option value="${k}"${f === k ? ' selected' : ''}${sup[k] ? '' : ' disabled'}>${esc(l)}${sup[k] ? '' : ' — ' + esc(tr('no disponible en este navegador'))}</option>`).join('')}</select></label>
          ${/jpg|webp|avif/.test(f) ? `<label class="k9-field">${esc(tr('Calidad'))}: <b>${C.get('q', 85)}</b><input type="range" min="10" max="100" data-c="q" value="${C.get('q', 85)}"></label>` : ''}
          ${f === 'ico' ? `<label class="k9-field">${esc(tr('Tamaños del icono (píxeles)'))}<input class="input-text" data-c="icoSizes" value="${esc(C.get('icoSizes', '16,32,48,256'))}"></label>` : `<label class="k9-field">${esc(tr('Tamaño'))}<select class="input-text" data-c="size">${opt('size', [['orig', 'Original'], ['max', 'Máximo ancho × alto'], ['pct', 'Porcentaje'], ['exact', 'Exacto (puede deformar)']], sz)}</select></label>${sz === 'pct' ? `<label class="k9-field">%<input class="input-text" type="number" min="1" max="1000" data-c="pct" value="${C.get('pct', 50)}"></label>` : ''}${sz === 'max' || sz === 'exact' ? `<div class="k9-row"><label class="k9-field">${esc(tr('Ancho'))}<input class="input-text" type="number" min="1" max="16384" data-c="${sz === 'max' ? 'mw' : 'ew'}" value="${C.get(sz === 'max' ? 'mw' : 'ew', 1920)}"></label><label class="k9-field">${esc(tr('Alto'))}<input class="input-text" type="number" min="1" max="16384" data-c="${sz === 'max' ? 'mh' : 'eh'}" value="${C.get(sz === 'max' ? 'mh' : 'eh', 1080)}"></label></div>` : ''}
          <div class="k9-row"><label class="k9-field">${esc(tr('Girar'))}<select class="input-text" data-c="rot">${opt('rot', [[0, '0°'], [90, '90°'], [180, '180°'], [270, '270°']], C.get('rot', 0))}</select></label><label class="k9-small" style="align-self:end"><input type="checkbox" data-c="flip" ${C.get('flip', false) ? 'checked' : ''}> ${esc(tr('Voltear'))}</label></div>`}
          <label class="k9-field">${esc(tr('Fondo para la transparencia'))}<span class="k9-row"><input type="color" data-c="bg" value="${esc(C.get('bg', '#ffffff'))}"><small class="k9-muted">${esc(tr(/jpg|bmp/.test(f) ? 'JPEG y BMP no admiten transparencia: se rellena con este color.' : 'Solo se usa en JPEG y BMP.'))}</small></span></label>
          <button class="k9-btn pri big" data-a="iconv" ${imgs.length ? '' : 'disabled'}>${I('refresh', 15)} ${esc(tr('Convertir y guardar'))}</button><p class="k9-small k9-muted">${esc(tr('Se guardan en Archivos › Imágenes. Volver a codificar la imagen elimina sus metadatos (EXIF, ubicación).'))}</p><div data-res></div></div></div>`;
        dropZone(q(V, '[data-drop]'), addImgs);
      }
      async function addImgs(list) { for (const f of list) { try { const bmp = await decodeImg(f.blob); imgs.push({ name: f.name, blob: f.blob, bmp, url: URL.createObjectURL(f.blob) }); } catch (e) { E.toast(f.name + ': ' + e.message); } } if (tab === 'img') drawImg2(); }
      async function convImgs() {
        const f = C.get('ifmt', 'png'), [, , type] = IMGF.find(x => x[0] === f), o = { size: C.get('size', 'orig'), pct: +C.get('pct', 50), mw: +C.get('mw', 1920), mh: +C.get('mh', 1080), ew: +C.get('ew', 1920), eh: +C.get('eh', 1080), rot: +C.get('rot', 0), flip: !!C.get('flip', false), bg: C.get('bg', '#ffffff'), fill: f === 'jpg' || f === 'bmp' };
        let n = 0; res(`<p class="k9-muted">${esc(tr('Convirtiendo…'))}</p>`);
        for (const im of imgs) {
          try {
            let blob;
            if (f === 'ico') { const sizes = String(C.get('icoSizes', '16,32,48,256')).split(/[\s,;]+/).map(Number).filter(x => x >= 8 && x <= 256).slice(0, 8); blob = await icoEncode(im.bmp, sizes.length ? sizes : [16, 32, 48, 256]); }
            else { const c = drawImg(im.bmp, o); blob = f === 'bmp' ? bmpEncode(c) : await new Promise(r => c.toBlob(r, type, +C.get('q', 85) / 100)); if (!blob || blob.type !== type) throw new Error(tr('El navegador no pudo codificar') + ' ' + type); }
            const id = await F.save(await F.uniqueName('images', baseName(im.name) + '.' + f), blob, 'images'); const sv = await F.get(id); im.out = { name: sv.name, size: blob.size, id }; n++;
          } catch (e) { E.toast(im.name + ': ' + (e.message || e)); }
        }
        K.log('info', 'files', `Conversor: ${n} imágenes convertidas a ${f.toUpperCase()}`); await drawImg2(); res(`<p class="s10-hc-ok">✓ ${n} ${esc(tr('imágenes guardadas en Archivos › Imágenes'))}</p>`);
      }
      /* ---------- Datos ---------- */
      function drawData() {
        const of = C.get('ofmt', 'json');
        V.innerHTML = `<div class="s10-fc-io"><div class="s10-fc-col"><div class="k9-row" style="flex-wrap:wrap"><b>${esc(tr('Entrada'))}</b><select class="input-text" data-c="dfmt">${opt('', DFMT, C.get('dfmt', 'auto'))}</select><button class="k9-btn" data-a="dopen">${I('folder', 13)} ${esc(tr('Abrir…'))}</button><span data-det class="k9-small k9-muted"></span></div><textarea class="input-text s10-fc-ta" data-din spellcheck="false" placeholder="${esc(tr('Pega aquí CSV, JSON, XML, YAML o una tabla Markdown…'))}">${esc(din)}</textarea>
          <div class="k9-row k9-small" style="flex-wrap:wrap"><label><input type="checkbox" data-c="header" ${C.get('header', true) ? 'checked' : ''}> ${esc(tr('La primera fila es el encabezado'))}</label><label><input type="checkbox" data-c="types" ${C.get('types', true) ? 'checked' : ''}> ${esc(tr('Detectar números y verdadero/falso'))}</label><label>${esc(tr('Separador CSV'))} <select class="input-text" data-c="delim">${opt('', [['auto', 'Automático'], [',', 'Coma'], [';', 'Punto y coma'], ['\t', 'Tabulador'], ['|', 'Barra |']], C.get('delim', 'auto'))}</select></label></div></div>
          <div class="s10-fc-col"><div class="k9-row" style="flex-wrap:wrap"><b>${esc(tr('Salida'))}</b><select class="input-text" data-c="ofmt">${opt('', OFMT, of)}</select>${of === 'json' ? `<select class="input-text" data-c="indent">${opt('', [['2', '2 espacios'], ['4', '4 espacios'], ['min', 'Compacto']], C.get('indent', '2'))}</select>` : ''}${of === 'csv' ? `<select class="input-text" data-c="odelim">${opt('', [[',', 'Coma'], [';', 'Punto y coma'], ['tab', 'Tabulador']], C.get('odelim', ','))}</select>` : ''}${of === 'sql' ? `<input class="input-text" data-c="table" value="${esc(C.get('table', 'datos'))}" style="width:120px" title="${esc(tr('Nombre de la tabla'))}">` : ''}<span style="flex:1"></span><button class="k9-btn" data-a="dcopy">${I('copy', 13)}</button><button class="k9-btn pri" data-a="dsave">${I('save', 13)} ${esc(tr('Guardar'))}</button></div><textarea class="input-text s10-fc-ta" data-dout readonly spellcheck="false"></textarea><div data-derr></div></div></div>`;
        convData();
      }
      function convData() {
        const inp = q(V, '[data-din]'); if (!inp) return; const t = din = inp.value; C.set('din', t.length < 200000 ? t : ''); const out = q(V, '[data-dout]'), er = q(V, '[data-derr]'), det = q(V, '[data-det]');
        if (!t.trim()) { out.value = dout = ''; er.innerHTML = ''; det.textContent = ''; return; }
        try { const o = { header: C.get('header', true), types: C.get('types', true), delim: C.get('delim', 'auto'), indent: C.get('indent', '2'), odelim: C.get('odelim', ','), table: C.get('table', 'datos') }; const p = parseData(t, C.get('dfmt', 'auto'), o); det.textContent = tr('Detectado') + ': ' + (DFMT.find(x => x[0] === p.fmt) || [, p.fmt])[1]; out.value = dout = emitData(p.v, C.get('ofmt', 'json'), o); er.innerHTML = ''; }
        catch (e) { out.value = dout = ''; er.innerHTML = `<p class="s10-hc-bad">✗ ${esc(e.message || String(e))}</p>`; }
      }
      /* ---------- Texto y codificación ---------- */
      function drawText() {
        V.innerHTML = `<div class="s10-fc-io"><div class="s10-fc-col"><div class="k9-row"><b>${esc(tr('Texto'))}</b><select class="input-text" data-c="txop">${TXOPS.map(([k, l]) => `<option value="${k}"${C.get('txop', 'b64e') === k ? ' selected' : ''}>${esc(tr(l))}</option>`).join('')}</select></div><textarea class="input-text s10-fc-ta" data-tin spellcheck="false">${esc(tin)}</textarea></div><div class="s10-fc-col"><div class="k9-row"><b>${esc(tr('Resultado'))}</b><span style="flex:1"></span><button class="k9-btn" data-a="tswap" title="${esc(tr('Usar el resultado como entrada'))}">⇅</button><button class="k9-btn" data-a="tcopy">${I('copy', 13)}</button></div><textarea class="input-text s10-fc-ta" data-tout readonly spellcheck="false"></textarea><div data-terr></div></div></div>
          <div class="k9-card" style="margin-top:10px"><b>${esc(tr('Archivos y Base64'))}</b><div class="k9-row" style="flex-wrap:wrap;margin-top:6px"><button class="k9-btn" data-a="f2b64">${I('upload', 13)} ${esc(tr('Archivo → data URL Base64'))}</button><button class="k9-btn" data-a="b642f">${I('download', 13)} ${esc(tr('Base64 del cuadro de texto → archivo'))}</button></div></div>
          <div class="k9-card" style="margin-top:10px"><b>${esc(tr('Cambiar la codificación de un archivo de texto'))}</b><div class="k9-row" style="flex-wrap:wrap;margin-top:6px"><button class="k9-btn" data-a="encopen">${I('folder', 13)} ${esc(tr('Elegir archivo…'))}</button>${encFile ? `<span class="k9-small"><b>${esc(encFile.name)}</b> · ${B(encFile.u8.length)}</span><label class="k9-small">${esc(tr('Origen'))} <select class="input-text" data-encsrc><option value="auto">${esc(tr('Detectar'))} (${esc(sniffEnc(encFile.u8))})</option>${ENCS.map(x => `<option value="${x}"${encFile.src === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label><label class="k9-small">${esc(tr('Destino'))} <select class="input-text" data-encdst><option value="utf8">UTF-8</option><option value="utf8bom">UTF-8 ${esc(tr('con BOM'))}</option><option value="utf16">UTF-16 LE ${esc(tr('con BOM'))}</option></select></label><label class="k9-small">${esc(tr('Fin de línea'))} <select class="input-text" data-encnl><option value="keep">${esc(tr('Mantener'))}</option><option value="lf">LF</option><option value="crlf">CRLF</option></select></label><button class="k9-btn pri" data-a="encsave">${I('save', 13)} ${esc(tr('Guardar convertido'))}</button>` : ''}</div>${encFile ? `<pre class="s10-fc-pre" data-encprev></pre>` : ''}</div>`;
        convText(); if (encFile) encPrev();
      }
      function convText() { const i = q(V, '[data-tin]'); if (!i) return; tin = i.value; C.set('tin', i.value.length < 100000 ? i.value : ''); const o = q(V, '[data-tout]'), er = q(V, '[data-terr]'); try { o.value = tout = i.value ? (TXOPS.find(x => x[0] === C.get('txop', 'b64e')) || TXOPS[0])[2](i.value) : ''; er.innerHTML = ''; } catch (e) { o.value = tout = ''; er.innerHTML = `<p class="s10-hc-bad">✗ ${esc(tr('No se puede convertir'))}: ${esc(e.message || String(e))}</p>`; } }
      const encText = () => { const src = encFile.src === 'auto' || !encFile.src ? sniffEnc(encFile.u8) : encFile.src; try { return new TextDecoder(src).decode(encFile.u8); } catch { return new TextDecoder('utf-8').decode(encFile.u8); } };
      const encPrev = () => { const p = q(V, '[data-encprev]'); if (p) p.textContent = encText().slice(0, 3000); };
      /* ---------- Documentos ---------- */
      function drawDoc() {
        const out = C.get('docOut', 'md');
        V.innerHTML = `<div class="k9-row" style="flex-wrap:wrap"><button class="k9-btn pri" data-a="dopen2">${I('folder', 14)} ${esc(tr('Abrir documento…'))}</button><span class="k9-small k9-muted">${esc(tr('Entrada: Word (.docx), Markdown, HTML o texto'))}</span></div>
          ${doc ? `<div class="k9-row" style="flex-wrap:wrap;margin-top:10px"><b>${esc(doc.name)}</b><span class="k9-small k9-muted">${B(doc.size)}</span><span style="flex:1"></span><label class="k9-small">${esc(tr('Convertir a'))} <select class="input-text" data-c="docOut">${opt('', [['md', 'Markdown (.md)'], ['html', 'Página web (.html)'], ['txt', 'Texto (.txt)'], ['docx', 'Word (.docx)'], ['pdf', 'PDF (.pdf)']], out)}</select></label><button class="k9-btn pri" data-a="docsave">${I('save', 14)} ${esc(tr('Convertir y guardar'))}</button></div><div class="s10-fc-doc" data-docprev>${doc.html}</div>` : `<div class="k9-state">${I('file', 40)}<p>${esc(tr('Abre un documento para verlo y convertirlo. La conversión conserva títulos, párrafos, listas, tablas, negritas, cursivas y enlaces; los diseños complejos se simplifican.'))}</p></div>`}<div data-res></div>`;
      }
      async function loadDoc(f) { try { doc = { name: f.name, size: f.blob.size, html: await docToHtml(f.name, f.blob) }; tab = 'doc'; draw(); } catch (e) { E.toast(tr('No se pudo leer el documento') + ': ' + (e.message || e)); } }
      async function saveDoc() {
        const o = C.get('docOut', 'md'), n = baseName(doc.name); let blob, ext = o;
        if (o === 'md') blob = new Blob([htmlToMd(doc.html)], { type: 'text/markdown' });
        if (o === 'html') blob = new Blob([`<!doctype html>\n<html lang="${esc(K.locale || 'es')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(n)}</title><style>body{font-family:system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;line-height:1.6}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}</style></head><body>\n${doc.html}\n</body></html>\n`], { type: 'text/html' });
        if (o === 'txt') blob = new Blob([htmlToText(doc.html)], { type: 'text/plain' });
        if (o === 'docx') { if (!K.docx) await K.loadScript('js/os9/docx.js'); blob = await K.docx.fromHtml(doc.html, { title: n, lang: K.locale || 'es' }); }
        if (o === 'pdf') blob = await htmlToPdf(doc.html, n);
        const id = await U.saveBlob(n + '.' + ext, blob, 'documents'); res(`<p class="s10-hc-ok">✓ ${esc(tr('Guardado'))} · ${B(blob.size)} <button class="k9-btn" data-openf="${esc(id)}">${esc(tr('Abrir'))}</button></p>`);
      }
      /* ---------- Audio ---------- */
      function drawAudio() {
        const fmt = C.get('aFmt', 'wav16');
        V.innerHTML = `<div class="k9-row" style="flex-wrap:wrap"><button class="k9-btn pri" data-a="aopen">${I('folder', 14)} ${esc(tr('Abrir audio o vídeo…'))}</button><span class="k9-small k9-muted">${esc(tr('MP3, OGG, WAV, FLAC, M4A, WebM, MP4… según lo que el navegador sepa decodificar. De un vídeo se extrae el audio.'))}</span></div>
          ${aud ? `<div class="k9-card" style="margin-top:10px"><b>${esc(aud.name)}</b><p class="k9-small">${U.hms(aud.buf.duration)} · ${aud.buf.sampleRate} Hz · ${aud.buf.numberOfChannels === 1 ? esc(tr('mono')) : aud.buf.numberOfChannels === 2 ? esc(tr('estéreo')) : aud.buf.numberOfChannels + ' ' + esc(tr('canales'))} · ${B(aud.size)}</p><canvas class="s10-fc-wave" data-wave height="80"></canvas>
            <div class="s10-tm-grid"><label class="k9-field">${esc(tr('Formato'))}<select class="input-text" data-c="aFmt">${opt('', [['wav16', 'WAV PCM 16 bits'], ['wav32', 'WAV 32 bits coma flotante'], ['opus', 'Opus / WebM (comprimido, en tiempo real)']], fmt)}</select></label><label class="k9-field">${esc(tr('Frecuencia de muestreo'))}<select class="input-text" data-c="aRate">${opt('', [[0, 'Original'], [48000, '48 000 Hz'], [44100, '44 100 Hz'], [32000, '32 000 Hz'], [22050, '22 050 Hz'], [16000, '16 000 Hz'], [8000, '8 000 Hz']], C.get('aRate', 0))}</select></label><label class="k9-field">${esc(tr('Canales'))}<select class="input-text" data-c="aCh">${opt('', [[0, 'Original'], [1, 'Mono'], [2, 'Estéreo']], C.get('aCh', 0))}</select></label><label class="k9-field">${esc(tr('Desde (s)'))}<input class="input-text" type="number" min="0" step="0.1" data-ast value="0"></label><label class="k9-field">${esc(tr('Hasta (s)'))}<input class="input-text" type="number" min="0" step="0.1" data-aen value="${aud.buf.duration.toFixed(1)}"></label><label class="k9-field">${esc(tr('Fundidos (s)'))}<input class="input-text" type="number" min="0" step="0.5" data-afade value="0"></label></div>
            <label class="k9-small"><input type="checkbox" data-c="aNorm" ${C.get('aNorm', false) ? 'checked' : ''}> ${esc(tr('Normalizar el volumen (pico a −1 dB)'))}</label>
            <div class="k9-row" style="margin-top:8px"><button class="k9-btn pri" data-a="aconv">${I('save', 14)} ${esc(tr('Convertir y guardar'))}</button><div class="s10-hc-pg" data-apg hidden style="flex:1"><i></i></div></div>${fmt === 'opus' ? U.note('Los navegadores no traen un codificador MP3. Opus se graba en tiempo real: tarda lo mismo que dura el audio.') : ''}</div>` : ''}<div data-res></div>`;
        if (aud) wave();
      }
      function wave() { const c = q(V, '[data-wave]'); if (!c) return; const W = c.width = c.clientWidth * 2 || 800, H = c.height = 160, g = c.getContext('2d'), d = aud.buf.getChannelData(0), step = Math.max(1, Math.floor(d.length / W)); g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--e9-green').trim() || '#34a582'; for (let x = 0; x < W; x++) { let mn = 1, mx = -1; for (let i = x * step, e2 = Math.min(d.length, i + step); i < e2; i += Math.max(1, step >> 4)) { const v = d[i]; if (v < mn) mn = v; if (v > mx) mx = v; } g.fillRect(x, (1 - mx) * H / 2, 1, Math.max(1, (mx - mn) * H / 2)); } }
      async function loadAudio(f) { try { const ac = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 44100); const buf = await ac.decodeAudioData(await f.blob.arrayBuffer()); aud = { name: f.name, size: f.blob.size, buf }; tab = 'audio'; draw(); } catch { E.toast(tr('El navegador no puede decodificar el audio de este archivo')); } }
      async function convAudio() {
        const st0 = +q(V, '[data-ast]').value || 0, en = +q(V, '[data-aen]').value || aud.buf.duration, fd = +q(V, '[data-afade]').value || 0, fmt = C.get('aFmt', 'wav16'), pg = q(V, '[data-apg]');
        pg.hidden = false; pg.firstElementChild.style.width = '5%'; res('');
        try {
          const r = await renderAudio(aud.buf, { start: st0, end: en, rate: +C.get('aRate', 0) || 0, ch: +C.get('aCh', 0) || 0, norm: C.get('aNorm', false), fadeIn: fd, fadeOut: fd });
          let blob, ext; if (fmt === 'opus') { blob = await opusEncode(r, p => { pg.firstElementChild.style.width = Math.round(p * 100) + '%'; }); ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm'; } else { blob = wavEncode(r, fmt === 'wav32'); ext = 'wav'; }
          pg.firstElementChild.style.width = '100%'; const id = await U.saveBlob(baseName(aud.name) + '.' + ext, blob, 'music'); res(`<p class="s10-hc-ok">✓ ${esc(tr('Guardado en Archivos › Música'))} · ${U.hms(r.duration)} · ${r.sampleRate} Hz · ${B(blob.size)} <button class="k9-btn" data-openf="${esc(id)}">${esc(tr('Abrir'))}</button></p>`);
        } catch (e) { res(`<p class="s10-hc-bad">✗ ${esc(e.message || String(e))}</p>`); } finally { setTimeout(() => { if (pg.isConnected) pg.hidden = true; }, 600); }
      }
      const draw = () => { C.set('tab', tab); qa(b, '[data-tab]').forEach(t => { t.classList.toggle('on', t.dataset.tab === tab); t.setAttribute('aria-selected', t.dataset.tab === tab); }); ({ img: drawImg2, data: drawData, text: drawText, doc: drawDoc, audio: drawAudio })[tab](); };
      b.addEventListener('click', async e => {
        const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; draw(); return; }
        const rm = e.target.closest('[data-irm]'); if (rm) { const [im] = imgs.splice(+rm.dataset.irm, 1); if (im) { URL.revokeObjectURL(im.url); im.bmp.close && im.bmp.close(); } drawImg2(); return; }
        const of = e.target.closest('[data-openf]'); if (of) { F.open(of.dataset.openf); return; }
        const ln = e.target.closest('[data-docprev] a'); if (ln) { e.preventDefault(); const h = ln.getAttribute('data-external-url') || ln.getAttribute('href') || ''; if (/^https?:/i.test(h)) { if (E.ebOpenUrl) E.ebOpenUrl(h, true); else window.open(h, '_blank', 'noopener'); } return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'iadd') addImgs(await pickMany({ title: tr('Imágenes para convertir'), accept: x => F.kindOf(x) === 'image', deviceAccept: 'image/*' }));
        if (k === 'iclear') { imgs.forEach(im => URL.revokeObjectURL(im.url)); imgs = []; drawImg2(); }
        if (k === 'iconv') convImgs();
        if (k === 'dopen') { const f = await U.pickBlob({ title: tr('Datos (CSV, JSON, XML, YAML, Markdown)'), accept: x => /\.(csv|tsv|json|xml|ya?ml|md|txt)$/i.test(x.name), deviceAccept: '.csv,.tsv,.json,.xml,.yaml,.yml,.md,.txt' }); if (!f) return; q(V, '[data-din]').value = await f.blob.text(); const e2 = extOf(f.name); if (/^(csv|tsv|json|xml|yaml|yml|md)$/.test(e2)) { C.set('dfmt', e2 === 'yml' ? 'yaml' : e2); q(V, '[data-c="dfmt"]').value = C.get('dfmt'); } convData(); }
        if (k === 'dcopy') copy(dout);
        if (k === 'dsave') { const v = dout; if (!v) return E.toast(tr('No hay nada que guardar')); const of2 = C.get('ofmt', 'json'); await U.saveBlob('datos.' + OEXT[of2], new Blob([v], { type: of2 === 'json' ? 'application/json' : 'text/plain' }), 'documents'); }
        if (k === 'tcopy') copy(tout);
        if (k === 'tswap') { q(V, '[data-tin]').value = tout; convText(); }
        if (k === 'f2b64') { const f = await U.pickBlob({ title: tr('Archivo para convertir a Base64') }); if (!f) return; if (f.blob.size > 15 * 1048576) return E.toast(tr('Máximo 15 MB para convertir a texto Base64')); const s = 'data:' + (f.blob.type || 'application/octet-stream') + ';base64,' + u8b64(new Uint8Array(await f.blob.arrayBuffer())); q(V, '[data-tout]').value = tout = s; E.toast(tr('Data URL lista en el resultado') + ' · ' + B(s.length)); }
        if (k === 'b642f') { const s = q(V, '[data-tin]').value.trim(); if (!s) return E.toast(tr('Pega el Base64 en el cuadro de texto')); let u; try { u = b64u8(s); } catch { return E.toast(tr('No es Base64 válido')); } const mt = /^data:([^;,]+)/.exec(s), mime = mt ? mt[1] : 'application/octet-stream'; const ext = (mime.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin'; const v = await E.form({ title: tr('Guardar como archivo'), fields: [{ k: 'n', label: tr('Nombre'), value: 'archivo.' + (ext === 'octetstream' ? 'bin' : ext), req: true }] }); if (v) await U.saveBlob(v.n, new Blob([u], { type: mime }), 'documents'); }
        if (k === 'encopen') { const f = await U.pickBlob({ title: tr('Archivo de texto'), deviceAccept: '.txt,.csv,.srt,.md,.html,.xml,.json,text/*' }); if (!f) return; encFile = { name: f.name, u8: new Uint8Array(await f.blob.arrayBuffer()), src: 'auto' }; drawText(); }
        if (k === 'encsave' && encFile) { let t = encText(); const nl = q(V, '[data-encnl]').value, dst = q(V, '[data-encdst]').value; if (nl === 'lf') t = t.replace(/\r\n?/g, '\n'); if (nl === 'crlf') t = t.replace(/\r?\n/g, '\r\n'); t = t.replace(/^\uFEFF/, ''); let blob; if (dst === 'utf16') { const u = new Uint8Array(2 + t.length * 2); u[0] = 0xff; u[1] = 0xfe; for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); u[2 + i * 2] = c & 255; u[3 + i * 2] = c >> 8; } blob = new Blob([u], { type: 'text/plain;charset=utf-16le' }); } else blob = new Blob([dst === 'utf8bom' ? '\uFEFF' : '', t], { type: 'text/plain;charset=utf-8' }); await U.saveBlob(baseName(encFile.name) + '_' + dst + '.' + (extOf(encFile.name) || 'txt'), blob, 'documents'); }
        if (k === 'dopen2') { const f = await U.pickBlob({ title: tr('Documento'), accept: x => /\.(docx|md|markdown|html?|txt)$/i.test(x.name), deviceAccept: '.docx,.md,.markdown,.html,.htm,.txt' }); if (f) loadDoc(f); }
        if (k === 'docsave' && doc) { a.disabled = true; try { await saveDoc(); } catch (er) { E.toast(tr('No se pudo convertir') + ': ' + (er.message || er)); } finally { a.disabled = false; } }
        if (k === 'aopen') { const f = await U.pickBlob({ title: tr('Audio o vídeo'), accept: x => /^(audio|video)$/.test(F.kindOf(x)), deviceAccept: 'audio/*,video/*' }); if (f) loadAudio(f); }
        if (k === 'aconv' && aud) { a.disabled = true; try { await convAudio(); } finally { a.disabled = false; } }
      });
      b.addEventListener('change', e => {
        const c = e.target.closest('[data-c]'); if (c) { const k = c.dataset.c; C.set(k, c.type === 'checkbox' ? c.checked : c.type === 'number' || c.type === 'range' ? +c.value : c.value); if (tab === 'img') drawImg2(); else if (tab === 'data') { if (k === 'ofmt') drawData(); else convData(); } else if (tab === 'text') convText(); else if (tab === 'audio' && k === 'aFmt') drawAudio(); return; }
        if (e.target.closest('[data-encsrc]') && encFile) { encFile.src = e.target.value; encPrev(); }
      });
      b.addEventListener('input', e => { if (e.target.closest('[data-din]')) { din = e.target.value; convDataD(); } if (e.target.closest('[data-tin]')) convText(); if (e.target.closest('[data-c="q"]')) { const lb = e.target.parentElement.querySelector('b'); if (lb) lb.textContent = e.target.value; } });
      const convDataD = U.debounce(convData, 200);
      const argFile = async a => {
        const f = fid(a) && await F.get(fid(a)); if (!f) return; const k = F.kindOf(f), e2 = extOf(f.name);
        if (k === 'image') { tab = 'img'; draw(); addImgs([f]); }
        else if (k === 'audio' || k === 'video') loadAudio(f);
        else if (/^(csv|tsv|json|xml|ya?ml)$/.test(e2)) { C.set('dfmt', e2 === 'yml' ? 'yaml' : e2); tab = 'data'; draw(); q(V, '[data-din]').value = await f.blob.text(); convData(); }
        else if (/^(docx|md|markdown|html?|txt)$/.test(e2)) loadDoc(f);
      };
      draw(); argFile(arg);
      this.onOpen = (bb, ww, a) => argFile(a); this.destroy = () => imgs.forEach(im => URL.revokeObjectURL(im.url));
      K.ext.fconvert = { CSV, YAML, xmlToJs, jsToXml, toTable, parseData, emitData, detectFmt, htmlToMd, htmlToText, htmlToPdf, docToHtml, wavEncode, bmpEncode, icoEncode, TXOPS, sniffEnc, state: () => ({ tab, dout, tout, imgs: imgs.length, doc: doc && doc.name, aud: aud && { d: aud.buf.duration, r: aud.buf.sampleRate, c: aud.buf.numberOfChannels } }), addImgs, loadDoc, loadAudio };
    }
  });

  /* ===================================================================
     Administrador de fuentes: instalar .ttf/.otf/.woff/.woff2 en EISENKU, fuentes del equipo, comparar y mapa de caracteres
     =================================================================== */
  // lectura de tablas OpenType (TTF/OTF/TTC y WOFF con zlib; WOFF2 usa Brotli y no se puede leer aquí)
  async function fontTables(u8) {
    const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), sig = v.getUint32(0), tag = o => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
    const inflate = async d => new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
    if (sig === 0x774F4646) {   // wOFF
      const n = v.getUint16(12), out = { format: 'WOFF' };
      for (let i = 0; i < n; i++) { const r = 44 + i * 20, t = tag(r), off = v.getUint32(r + 4), cl = v.getUint32(r + 8), ol = v.getUint32(r + 12); if (/^(name|OS\/2|cmap)$/.test(t)) { const d = u8.subarray(off, off + cl); try { out[t] = cl < ol ? await inflate(d) : d; } catch { /* tabla no legible */ } } }
      return out;
    }
    if (sig === 0x774F4632) return { format: 'WOFF2' };
    let base = 0, format = sig === 0x4F54544F ? 'OTF (CFF)' : 'TTF';
    if (sig === 0x74746366) { base = v.getUint32(12); format = 'TTC'; }   // colección: primera fuente
    else if (sig !== 0x00010000 && sig !== 0x4F54544F && sig !== 0x74727565) return null;
    const n = v.getUint16(base + 4), out = { format };
    for (let i = 0; i < n; i++) { const r = base + 12 + i * 16, t = tag(r); if (/^(name|OS\/2|cmap)$/.test(t)) { const off = v.getUint32(r + 8), l = v.getUint32(r + 12); out[t] = u8.subarray(off, off + l); } }
    return out;
  }
  function nameTable(u8) {
    if (!u8 || u8.length < 6) return {}; const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), n = v.getUint16(2), so = v.getUint16(4), best = {};
    for (let i = 0; i < n; i++) {
      const r = 6 + i * 12; if (r + 12 > u8.length) break; const pl = v.getUint16(r), en = v.getUint16(r + 2), lang = v.getUint16(r + 4), id = v.getUint16(r + 6), len = v.getUint16(r + 8), off = v.getUint16(r + 10);
      if (![0, 1, 2, 4, 5, 6, 13, 16, 17].includes(id)) continue; const d = u8.subarray(so + off, so + off + len); let s;
      if (pl === 3 || pl === 0) { s = ''; for (let k = 0; k + 1 < d.length; k += 2) s += String.fromCharCode((d[k] << 8) | d[k + 1]); } else if (pl === 1 && en === 0) s = [...d].map(c => String.fromCharCode(c)).join(''); else continue;
      const score = (pl === 3 ? 4 : pl === 0 ? 3 : 1) + (lang === 0x409 || lang === 0 ? 2 : 0); if (!best[id] || best[id].sc < score) best[id] = { s: s.replace(/\0/g, '').trim(), sc: score };
    }
    const g = id => best[id] && best[id].s; return { family: g(16) || g(1), sub: g(17) || g(2), full: g(4), version: g(5), ps: g(6), copyright: g(0), license: g(13) };
  }
  function cmapSet(u8, max = 70000) {
    if (!u8 || u8.length < 4) return null; const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), n = v.getUint16(2); let pick = -1, pf = 0;
    for (let i = 0; i < n; i++) { const r = 4 + i * 8, pl = v.getUint16(r), en = v.getUint16(r + 2), off = v.getUint32(r + 4), f = v.getUint16(off); const sc = f === 12 ? 3 : f === 4 && (pl === 3 || pl === 0) && en !== 0 ? 2 : f === 4 ? 1 : 0; if (sc > pf) { pf = sc; pick = off; } }
    if (pick < 0) return null; const f = v.getUint16(pick), set = new Set();
    if (f === 4) { const sc = v.getUint16(pick + 6) / 2, ends = pick + 14, starts = ends + sc * 2 + 2; for (let i = 0; i < sc; i++) { const e2 = v.getUint16(ends + i * 2), s0 = v.getUint16(starts + i * 2); if (s0 === 0xffff) continue; for (let c = s0; c <= e2 && set.size < max; c++) set.add(c); } }
    if (f === 12) { const ng = v.getUint32(pick + 12); for (let i = 0; i < ng; i++) { const r = pick + 16 + i * 12, s0 = v.getUint32(r), e2 = v.getUint32(r + 4); for (let c = s0; c <= e2 && set.size < max; c++) set.add(c); } }
    return set;
  }
  async function fontInfo(blob, fileName) {
    const u8 = new Uint8Array(await blob.arrayBuffer()); let t = null; try { t = await fontTables(u8); } catch { t = null; }
    if (!t) throw new Error(tr('No es un archivo de fuente reconocible (TTF, OTF, WOFF o WOFF2)'));
    const nm = nameTable(t.name); let weight = 400, italic = /italic|oblique|cursiva/i.test(nm.sub || fileName);
    if (t['OS/2'] && t['OS/2'].length > 64) { const v = new DataView(t['OS/2'].buffer, t['OS/2'].byteOffset, t['OS/2'].byteLength); weight = v.getUint16(4) || 400; if (v.getUint16(62) & 1) italic = true; }
    let cmap = null; try { cmap = cmapSet(t.cmap); } catch { cmap = null; }
    return { family: (nm.family || baseName(fileName).replace(/[-_](regular|bold|italic|light|medium|black|thin|semibold|extrabold)$/i, '').replace(/[-_]+/g, ' ')).slice(0, 60), sub: nm.sub || '', full: nm.full || '', version: nm.version || '', copyright: (nm.copyright || '').slice(0, 300), license: (nm.license || '').slice(0, 300), format: t.format, weight: Math.max(1, Math.min(1000, weight)), style: italic ? 'italic' : 'normal', glyphs: cmap ? cmap.size : null, cmap };
  }
  const GENERIC = ['system-ui', 'sans-serif', 'serif', 'monospace', 'cursive', 'Georgia', 'Times New Roman', 'Arial', 'Verdana', 'Courier New', 'Trebuchet MS', 'Segoe UI', 'Ubuntu', 'Roboto', 'Noto Sans'];
  const BLOCKS = [['0020', '007E', 'Latín básico'], ['00A0', '00FF', 'Latín-1 (tildes, ñ, signos)'], ['0100', '017F', 'Latín extendido A'], ['0370', '03FF', 'Griego'], ['0400', '04FF', 'Cirílico'], ['2000', '206F', 'Puntuación general'], ['20A0', '20CF', 'Monedas'], ['2100', '214F', 'Letras con forma de símbolo'], ['2150', '218F', 'Números y fracciones'], ['2190', '21FF', 'Flechas'], ['2200', '22FF', 'Operadores matemáticos'], ['2300', '23FF', 'Técnicos'], ['2500', '257F', 'Dibujo de cajas'], ['25A0', '25FF', 'Formas geométricas'], ['2600', '26FF', 'Símbolos varios'], ['2700', '27BF', 'Dingbats'], ['3040', '309F', 'Hiragana'], ['0590', '05FF', 'Hebreo'], ['0600', '06FF', 'Árabe']];
  const famCss = f => /^(system-ui|sans-serif|serif|monospace|cursive)$/.test(f) ? f : '"' + String(f).replace(/["\\]/g, '') + '"';
  K.define('fonts', {
    init(b, w, arg) {
      const C = K.cfg('fonts', { sample: 'El veloz murciélago hindú comía feliz cardillo y kiwi. 0123456789', size: 32, block: '0020', cmp: ['system-ui', 'serif', 'monospace'] });
      const FK = 'os10_fonts', list = () => K.fonts10.list(), save = l => { S.set(FK, l); K.emit('fonts'); };
      let tab = 'mine', sysFonts = null, sysErr = '', mapFont = null, cmaps = {};
      b.innerHTML = `<div class="k9 s10-fn"><div class="s10-fn-top">${U.tabs([['mine', 'Mis fuentes', 'book'], ['sys', 'Fuentes del equipo', 'monitor'], ['cmp', 'Comparar', 'layers'], ['map', 'Mapa de caracteres', 'grid']], tab)}<div class="k9-row s10-fn-ctl"><input class="input-text" data-sample value="${esc(C.get('sample'))}" aria-label="${esc(tr('Texto de muestra'))}"><input type="range" min="10" max="96" data-size value="${C.get('size', 32)}" aria-label="${esc(tr('Tamaño'))}"><b data-szl>${C.get('size', 32)} px</b></div></div><div class="s10-fn-b" data-v></div></div>`;
      const V = q(b, '[data-v]'), sample = () => C.get('sample') || 'Aa', size = () => +C.get('size', 32);
      const families = () => [...new Set(list().map(f => f.family).concat(GENERIC))];
      function drawMine() {
        const l = list();
        V.innerHTML = `<div class="k9-row" style="flex-wrap:wrap"><button class="k9-btn pri" data-a="install">${I('plus', 14)} ${esc(tr('Instalar fuentes…'))}</button><span class="k9-small k9-muted">${esc(tr('TTF, OTF, WOFF o WOFF2. Quedan disponibles en Writer, la Pizarra y el resto de EISENKU (no en otras apps del equipo).'))}</span></div><div class="s10-fn-list">${l.length ? l.map(f => `<div class="k9-card s10-fn-it"><div class="k9-row"><b>${esc(f.family)}</b><small class="k9-muted">${esc([f.sub, f.format, f.weight && f.weight !== 400 ? f.weight : '', f.style === 'italic' ? tr('cursiva') : '', f.sys ? tr('del equipo') : B(f.size || 0), f.glyphs ? f.glyphs + ' ' + tr('caracteres') : ''].filter(Boolean).join(' · '))}</small><span style="flex:1"></span><button class="k9-btn" data-cmpadd="${esc(f.family)}" title="${esc(tr('Comparar'))}">${I('layers', 13)}</button><button class="k9-btn" data-mapf="${esc(f.id)}" title="${esc(tr('Mapa de caracteres'))}">${I('grid', 13)}</button>${f.sys ? '' : `<button class="k9-btn" data-exp="${esc(f.id)}" title="${esc(tr('Exportar el archivo'))}">${I('download', 13)}</button>`}<button class="k9-btn dng" data-del="${esc(f.id)}" title="${esc(tr('Desinstalar'))}">${I('trash', 13)}</button></div><p class="s10-fn-prev" style="font-family:${esc(famCss(f.family))};font-size:${size()}px;font-weight:${f.weight || 400};font-style:${f.style || 'normal'}">${esc(sample())}</p>${f.copyright ? `<small class="k9-muted s10-fn-cr">${esc(f.copyright)}</small>` : ''}</div>`).join('') : `<div class="k9-state">${I('book', 40)}<p>${esc(tr('Aún no has instalado fuentes. Puedes descargar fuentes libres (por ejemplo, con licencia OFL) e instalarlas aquí.'))}</p></div>`}</div>`;
      }
      function drawSys() {
        const has = 'queryLocalFonts' in window, fq = (C.get('sysq', '') || '').toLowerCase();
        const fams = sysFonts ? [...new Map(sysFonts.map(f => [f.family, f])).keys()].filter(f => !fq || f.toLowerCase().includes(fq)) : [];
        V.innerHTML = has ? `<div class="k9-row" style="flex-wrap:wrap"><button class="k9-btn pri" data-a="sysload">${I('search', 14)} ${esc(tr(sysFonts ? 'Volver a leer' : 'Ver las fuentes de este equipo'))}</button>${sysFonts ? `<input class="input-text" data-sysq placeholder="${esc(tr('Filtrar…'))}" value="${esc(C.get('sysq', ''))}"><span class="k9-small k9-muted">${fams.length} ${esc(tr('familias'))}</span>` : ''}</div>${sysErr ? `<p class="s10-hc-bad">${esc(sysErr)}</p>` : ''}${sysFonts ? `<div class="s10-fn-sys">${fams.slice(0, 400).map(fm => `<div class="s10-fn-srow"><span class="s10-fn-sname">${esc(fm)}</span><span class="s10-fn-sprev" style="font-family:${esc(famCss(fm))}">${esc(sample())}</span><button class="k9-btn" data-sysadd="${esc(fm)}" ${list().some(f => f.family === fm) ? 'disabled' : ''}>${esc(tr(list().some(f => f.family === fm) ? 'Añadida' : 'Usar en EISENKU'))}</button></div>`).join('')}</div>` : U.note('El navegador pedirá permiso para leer la lista de fuentes instaladas en el equipo. Se usan por su nombre: no se copian archivos.')}` : U.note('Este navegador no permite leer la lista de fuentes del equipo (función disponible en Chrome y Edge de escritorio). Puedes instalar fuentes desde un archivo en «Mis fuentes» o escribir el nombre de una fuente del sistema en «Comparar».', 'warn');
      }
      function drawCmp() {
        const sel = (C.get('cmp', ['system-ui', 'serif', 'monospace']) || []).slice(0, 4), fams = families();
        V.innerHTML = `<div class="k9-row" style="flex-wrap:wrap">${[0, 1, 2, 3].map(i => `<input class="input-text" list="s10-fn-dl" data-cmp="${i}" value="${esc(sel[i] || '')}" placeholder="${esc(tr('Fuente') + ' ' + (i + 1))}" style="width:170px">`).join('')}<datalist id="s10-fn-dl">${fams.map(f => `<option value="${esc(f)}">`).join('')}</datalist></div><div class="s10-fn-cmp">${sel.filter(Boolean).map(f => `<div class="k9-card"><b class="k9-small">${esc(f)}</b>${[[400, 'normal'], [700, 'normal'], [400, 'italic']].map(([wt, st]) => `<p style="font-family:${esc(famCss(f))};font-size:${size()}px;font-weight:${wt};font-style:${st};margin:6px 0">${esc(sample())}</p>`).join('')}<p class="k9-small k9-muted" style="font-family:${esc(famCss(f))};font-size:14px">ABCDEFGHIJKLMNÑOPQRSTUVWXYZ abcdefghijklmnñopqrstuvwxyz áéíóú ¿?¡! @#&%€$</p></div>`).join('')}</div><p class="k9-small k9-muted">${esc(tr('Si una fuente no está disponible, el navegador usa otra parecida: compara siempre con la vista previa.'))}</p>`;
      }
      async function drawMap() {
        const l = list(), fam = mapFont ? (l.find(f => f.id === mapFont) || {}).family : C.get('mapfam', 'system-ui'), bl = C.get('block', '0020'), [s0, e0, nm] = BLOCKS.find(x => x[0] === bl) || BLOCKS[0], f = l.find(x => x.family === fam && !x.sys);
        let set = null; if (f) { if (!cmaps[f.id]) { const r = await K.store10.get('blobs', 'font_' + f.id).catch(() => null); if (r && r.blob) { try { cmaps[f.id] = (await fontInfo(r.blob, f.file || f.family)).cmap; } catch { cmaps[f.id] = null; } } } set = cmaps[f.id]; }
        if (tab !== 'map') return;
        const cps = []; for (let c = parseInt(s0, 16); c <= parseInt(e0, 16); c++) if (!(c >= 0x7f && c < 0xa0)) cps.push(c);
        V.innerHTML = `<div class="k9-row" style="flex-wrap:wrap"><input class="input-text" list="s10-fn-dl2" data-mapfam value="${esc(fam)}" style="width:200px"><datalist id="s10-fn-dl2">${families().map(x => `<option value="${esc(x)}">`).join('')}</datalist><select class="input-text" data-block>${BLOCKS.map(([a2, , n]) => `<option value="${a2}"${a2 === bl ? ' selected' : ''}>${esc(tr(n))}</option>`).join('')}</select>${set ? `<span class="k9-small k9-muted">${set.size} ${esc(tr('caracteres en la fuente'))} · ${cps.filter(c => set.has(c)).length}/${cps.length} ${esc(tr('en este bloque'))}</span>` : `<span class="k9-small k9-muted">${esc(tr(nm))}: U+${s0}–U+${e0}</span>`}</div><div class="s10-fn-map" style="font-family:${esc(famCss(fam))}">${cps.map(c => `<button data-cp="${c}" class="${set && !set.has(c) ? 'miss' : ''}" title="U+${c.toString(16).toUpperCase().padStart(4, '0')}">${esc(String.fromCodePoint(c))}</button>`).join('')}</div><div data-cpi class="k9-small"></div>`;
      }
      async function install(files) {
        const l = list(); let n = 0;
        for (const f of files) {
          try {
            if (f.blob.size > 30 * 1048576) throw new Error(tr('archivo demasiado grande'));
            const inf = await fontInfo(f.blob, f.name), id = E.uid(), meta = { id, family: inf.family, sub: inf.sub, file: f.name, size: f.blob.size, format: inf.format, weight: inf.weight, style: inf.style, glyphs: inf.glyphs, copyright: inf.copyright, added: Date.now() };
            const face = new FontFace(meta.family, await f.blob.arrayBuffer(), { weight: String(meta.weight), style: meta.style }); await face.load(); document.fonts.add(face);
            await K.store10.put('blobs', { id: 'font_' + id, blob: f.blob }); l.push(meta); n++; K.log('info', 'apps', 'Fuente instalada: ' + meta.family + (meta.sub ? ' ' + meta.sub : ''));
          } catch (e) { E.toast(f.name + ': ' + (e.message || tr('no se pudo cargar la fuente'))); }
        }
        if (n) { save(l); E.toast(n + ' ' + tr(n === 1 ? 'fuente instalada' : 'fuentes instaladas')); } draw();
      }
      const draw = () => { qa(b, '[data-tab]').forEach(t => { t.classList.toggle('on', t.dataset.tab === tab); t.setAttribute('aria-selected', t.dataset.tab === tab); }); ({ mine: drawMine, sys: drawSys, cmp: drawCmp, map: drawMap })[tab](); };
      b.addEventListener('click', async e => {
        const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; draw(); return; }
        const d = e.target.closest('[data-del]'); if (d) { const f = list().find(x => x.id === d.dataset.del); if (!f || !await E.confirm(tr('Desinstalar fuente'), f.family + (f.sub ? ' ' + f.sub : ''))) return; save(list().filter(x => x.id !== f.id)); if (!f.sys) { await K.store10.del('blobs', 'font_' + f.id).catch(() => {}); if (!list().some(x => x.family === f.family)) [...document.fonts].filter(ff => ff.family.replace(/^["']|["']$/g, '') === f.family).forEach(ff => document.fonts.delete(ff)); } K.log('info', 'apps', 'Fuente desinstalada: ' + f.family); draw(); return; }
        const ex = e.target.closest('[data-exp]'); if (ex) { const f = list().find(x => x.id === ex.dataset.exp), r = f && await K.store10.get('blobs', 'font_' + f.id); if (r && r.blob) await U.saveBlob(f.file || f.family + '.ttf', r.blob, 'documents'); return; }
        const ca = e.target.closest('[data-cmpadd]'); if (ca) { const l = (C.get('cmp', []) || []).filter(x => x !== ca.dataset.cmpadd); l.unshift(ca.dataset.cmpadd); C.set('cmp', l.slice(0, 4)); tab = 'cmp'; draw(); return; }
        const mf = e.target.closest('[data-mapf]'); if (mf) { mapFont = mf.dataset.mapf; const f = list().find(x => x.id === mapFont); if (f) C.set('mapfam', f.family); tab = 'map'; draw(); return; }
        const sa = e.target.closest('[data-sysadd]'); if (sa) { const fm = sa.dataset.sysadd, l = list(); if (!l.some(x => x.family === fm)) { l.push({ id: E.uid(), family: fm, sys: true, added: Date.now() }); save(l); } drawSys(); return; }
        const cp = e.target.closest('[data-cp]'); if (cp) { const c = +cp.dataset.cp, ch = String.fromCodePoint(c), u = [...TE.encode(ch)].map(x => x.toString(16).toUpperCase().padStart(2, '0')).join(' '); copy(ch); q(V, '[data-cpi]').innerHTML = `<b style="font-size:28px">${esc(ch)}</b> · U+${c.toString(16).toUpperCase().padStart(4, '0')} · ${esc(tr('decimal'))} ${c} · HTML <code>&amp;#x${c.toString(16).toUpperCase()};</code> · UTF-8 <code>${u}</code>`; return; }
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'install') install(await pickMany({ title: tr('Archivos de fuente'), accept: x => /\.(ttf|otf|woff2?|ttc)$/i.test(x.name), deviceAccept: '.ttf,.otf,.woff,.woff2,.ttc,font/*' }));
        if (a.dataset.a === 'sysload') { sysErr = ''; try { sysFonts = await window.queryLocalFonts(); if (!sysFonts.length) sysErr = tr('El navegador no devolvió ninguna fuente (permiso denegado o no disponible).'); } catch (er) { sysFonts = null; sysErr = tr('No se pudo leer la lista') + ': ' + (er.name === 'SecurityError' || er.name === 'NotAllowedError' ? tr('permiso denegado') : er.message); } drawSys(); }
      });
      b.addEventListener('input', e => {
        if (e.target.matches('[data-sample]')) { C.set('sample', e.target.value); qa(V, '.s10-fn-prev,.s10-fn-sprev,.s10-fn-cmp p:not(.k9-small)').forEach(p => { p.textContent = e.target.value || 'Aa'; }); }
        if (e.target.matches('[data-size]')) { C.set('size', +e.target.value); q(b, '[data-szl]').textContent = e.target.value + ' px'; qa(V, '.s10-fn-prev,.s10-fn-cmp p:not(.k9-small)').forEach(p => { p.style.fontSize = e.target.value + 'px'; }); }
        if (e.target.matches('[data-sysq]')) { C.set('sysq', e.target.value); const v = e.target.value.toLowerCase(); qa(V, '.s10-fn-srow').forEach(r => { r.hidden = !!v && !r.querySelector('.s10-fn-sname').textContent.toLowerCase().includes(v); }); }
      });
      b.addEventListener('change', e => {
        const c = e.target.closest('[data-cmp]'); if (c) { const l = (C.get('cmp', []) || []).slice(0, 4); l[+c.dataset.cmp] = c.value.trim(); C.set('cmp', l); drawCmp(); }
        if (e.target.matches('[data-mapfam]')) { C.set('mapfam', e.target.value.trim() || 'system-ui'); mapFont = null; drawMap(); }
        if (e.target.matches('[data-block]')) { C.set('block', e.target.value); drawMap(); }
      });
      const offFonts = K.on('fonts', () => { if (tab === 'mine') drawMine(); });
      const argFile = async a => { const f = fid(a) && await F.get(fid(a)); if (f && /\.(ttf|otf|woff2?|ttc)$/i.test(f.name)) { tab = 'mine'; await install([f]); } };
      draw(); argFile(arg);
      this.onOpen = (bb, ww, a) => argFile(a); this.destroy = () => { if (typeof offFonts === 'function') offFonts(); };
      K.ext.fonts = { fontInfo, install, list, nameTable, cmapSet };
    }
  });

  /* ===================================================================
     Calculadora de programación (BigInt de 8 a 64 bits, con o sin signo, IEEE 754)
     =================================================================== */
  K.define('progcalc', {
    init(b) {
      const C = K.cfg('progcalc', { w: 32, signed: true, base: 10, hist: [] });
      let W = +C.get('w', 32), SG = !!C.get('signed', true), BASE = +C.get('base', 10), val = 0n, ans = 0n, flt = 32;
      const norm = x => BigInt.asUintN(W, x), sv = x => SG ? BigInt.asIntN(W, x) : BigInt.asUintN(W, x);
      const grp = (s, n) => s.replace(new RegExp(`\\B(?=(.{${n}})+$)`, 'g'), ' ');
      const fmt = (x, base, plain) => { const u = norm(x); if (base === 10) return sv(u).toString(10); let s = u.toString(base).toUpperCase(); if (base === 2 && !plain) s = s.padStart(W, '0'); return plain ? s : grp(s, base === 8 ? 3 : 4); };
      const DIG = '0123456789ABCDEF';
      const parseBase = (raw, base) => { let v = 0n; const B2 = BigInt(base); for (const ch of raw.toUpperCase()) { const d = DIG.indexOf(ch); if (d < 0 || d >= base) throw new Error(tr('Dígito no válido en base') + ' ' + base + ': ' + ch); v = v * B2 + BigInt(d); } return v; };
      const WORDS = { and: '&', or: '|', xor: '^', not: '~', mod: '%', shl: '<<', shr: '>>', nand: 'nand', nor: 'nor', rol: 'rol', ror: 'ror', ans: 'ans' };
      function tokens(s) {
        const t = []; let i = 0; s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        const pre = BASE === 16 ? /^0x[0-9a-f_]+/i : /^(0x[0-9a-f_]+|0b[01_]+|0o[0-7_]+)/i;
        while (i < s.length) {
          const c = s[i]; if (/\s/.test(c)) { i++; continue; } const rest = s.slice(i);
          const o = ['>>>', '<<', '>>', '+', '-', '*', '/', '%', '&', '|', '^', '~', '(', ')'].find(x => rest.startsWith(x)); if (o) { t.push({ op: o }); i += o.length; continue; }
          const wm = /^(and|or|xor|not|nand|nor|mod|rol|ror|shl|shr|ans)\b/i.exec(rest); if (wm) { const m = WORDS[wm[1].toLowerCase()]; if (m === 'ans') t.push({ n: ans }); else t.push({ op: m }); i += wm[1].length; continue; }
          const pm = pre.exec(rest); if (pm) { t.push({ n: BigInt(pm[0].replace(/_/g, '').replace(/^0o/i, '0o')) }); i += pm[0].length; continue; }
          const nm = /^[0-9a-f_]+/i.exec(rest); if (nm) { t.push({ n: parseBase(nm[0].replace(/_/g, ''), BASE) }); i += nm[0].length; continue; }
          throw new Error(tr('Símbolo no reconocido') + ': ' + c);
        }
        return t;
      }
      const PREC = { '|': 1, nor: 1, '^': 2, '&': 3, nand: 3, '<<': 4, '>>': 4, '>>>': 4, rol: 4, ror: 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 };
      const cap = u => u > BigInt(W) ? BigInt(W) : u;
      function apply(op, a, c) {
        const ua = norm(a), uc = norm(c), sa = BigInt.asIntN(W, a), sc = BigInt.asIntN(W, c);
        switch (op) {
          case '+': return norm(a + c); case '-': return norm(a - c); case '*': return norm(ua * uc);
          case '/': if (!uc) throw new Error(tr('División entre cero')); return norm(SG ? sa / sc : ua / uc);
          case '%': if (!uc) throw new Error(tr('División entre cero')); return norm(SG ? sa % sc : ua % uc);
          case '&': return ua & uc; case '|': return ua | uc; case '^': return ua ^ uc; case 'nand': return norm(~(ua & uc)); case 'nor': return norm(~(ua | uc));
          case '<<': return norm(ua << cap(uc)); case '>>': return norm(SG ? sa >> cap(uc) : ua >> cap(uc)); case '>>>': return ua >> cap(uc);
          case 'rol': { const k = BigInt(Number(uc % BigInt(W))); return k ? norm((ua << k) | (ua >> (BigInt(W) - k))) : ua; }
          case 'ror': { const k = BigInt(Number(uc % BigInt(W))); return k ? norm((ua >> k) | (ua << (BigInt(W) - k))) : ua; }
        }
        throw new Error('?');
      }
      function evaluate(s) {
        const t = tokens(s); let p = 0; if (!t.length) return null;
        const un = () => { const k = t[p]; if (!k) throw new Error(tr('Expresión incompleta')); if (k.op === '-') { p++; return norm(-un()); } if (k.op === '+') { p++; return un(); } if (k.op === '~') { p++; return norm(~un()); } if (k.op === '(') { p++; const v = bin(1); if (!t[p] || t[p].op !== ')') throw new Error(tr('Falta el paréntesis de cierre')); p++; return v; } if (k.n != null) { p++; return norm(k.n); } throw new Error(tr('Se esperaba un número')); };
        const bin = mp => { let l = un(); for (;;) { const k = t[p]; if (!k || k.op == null || !(k.op in PREC) || PREC[k.op] < mp) break; p++; l = apply(k.op, l, bin(PREC[k.op] + 1)); } return l; };
        const v = bin(1); if (p < t.length) throw new Error(tr('Sobra') + ': ' + (t[p].op || fmt(t[p].n, BASE, true))); return v;
      }
      const KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'AND', 'OR', 'XOR', 'NOT', 'NAND', 'NOR', '<<', '>>', '>>>', 'ROL', 'ROR', 'MOD', '7', '8', '9', '(', ')', '÷', '4', '5', '6', '⌫', 'CE', '×', '1', '2', '3', '±', 'Ans', '−', '0', '00', '=', '+'];
      b.innerHTML = `<div class="k9 s10-pc"><div class="s10-pc-disp"><input class="input-text s10-pc-ex" data-ex spellcheck="false" autocomplete="off" placeholder="${esc(tr('p. ej. 0xFF AND 0b1010 << 2'))}" aria-label="${esc(tr('Expresión'))}"><div class="s10-pc-err" data-err></div><div class="s10-pc-res" data-res></div></div>
        <div class="k9-row s10-pc-mode"><div class="s10-chips">${[8, 16, 32, 64].map(n => `<button class="s10-chip" data-w="${n}">${n} ${esc(tr('bits'))}</button>`).join('')}</div><label class="k9-small"><input type="checkbox" data-sg> ${esc(tr('Con signo (complemento a dos)'))}</label></div>
        <div class="s10-pc-bits" data-bits></div><div class="s10-pc-main"><div class="s10-pc-keys">${KEYS.map(k => `<button class="s10-pc-k ${/^[0-9A-F]$|^00$/.test(k) ? 'd' : k === '=' ? 'eq' : /^(CE|⌫)$/.test(k) ? 'cl' : 'o'}" data-k="${esc(k)}">${esc(k)}</button>`).join('')}</div>
        <div class="s10-pc-side"><details class="k9-card" data-fl open><summary><b>IEEE 754</b></summary><div class="k9-row"><input class="input-text" data-flin placeholder="${esc(tr('Decimal, p. ej. 0.1 o -3.75'))}" style="flex:1"><select class="input-text" data-flw><option value="32">float32</option><option value="64">float64</option></select></div><button class="k9-btn" data-a="flbits" style="margin-top:6px">${esc(tr('Interpretar los bits del valor actual'))}</button><div data-flout class="s10-pc-fl"></div></details><div class="k9-card"><b class="k9-small">${esc(tr('Historial'))}</b><div data-hist class="s10-pc-hist"></div></div></div></div></div>`;
      const ex = q(b, '[data-ex]'), errEl = q(b, '[data-err]');
      function show(v, live) {
        const x = v == null ? val : v;
        q(b, '[data-res]').innerHTML = [[16, 'HEX'], [10, 'DEC'], [8, 'OCT'], [2, 'BIN']].map(([bs, l]) => `<button class="s10-pc-row ${bs === BASE ? 'on' : ''}" data-base="${bs}"><span>${l}</span><code>${esc(fmt(x, bs))}</code></button>`).join('') + (SG && BigInt.asIntN(W, x) < 0 ? `<small class="k9-muted">${esc(tr('Sin signo'))}: ${norm(x).toString(10)}</small>` : '');
        const bits = q(b, '[data-bits]'); let h = ''; const u = norm(x);
        for (let n = W / 4 - 1; n >= 0; n--) { h += '<span class="s10-pc-nib">'; for (let i = n * 4 + 3; i >= n * 4; i--) { const on = (u >> BigInt(i)) & 1n; h += `<button class="s10-pc-bit ${on ? 'on' : ''}" data-bit="${i}" title="${esc(tr('bit'))} ${i}">${on ? 1 : 0}</button>`; } h += `<small>${n * 4}</small></span>`; }
        bits.innerHTML = h; bits.classList.toggle('live', !!live);
        qa(b, '[data-w]').forEach(c => c.classList.toggle('on', +c.dataset.w === W)); q(b, '[data-sg]').checked = SG;
        qa(b, '.s10-pc-k.d').forEach(k => { const d = k.dataset.k === '00' ? 0 : DIG.indexOf(k.dataset.k); k.disabled = d >= BASE; });
      }
      function live() { const s = ex.value; if (!s.trim()) { errEl.textContent = ''; show(val); return null; } try { const v = evaluate(s); errEl.textContent = ''; show(v, true); return v; } catch (e) { errEl.textContent = e.message; return undefined; } }
      function commit() { const s = ex.value.trim(); if (!s) return; let v; try { v = evaluate(s); } catch (e) { errEl.textContent = e.message; return; } if (v == null) return; val = ans = v; const h = (C.get('hist', []) || []).filter(x => x.e !== s); h.unshift({ e: s, r: fmt(v, BASE, true), b: BASE, w: W }); C.set('hist', h.slice(0, 20)); ex.value = fmt(v, BASE, true); errEl.textContent = ''; show(val); hist(); }
      function hist() { const h = C.get('hist', []) || []; q(b, '[data-hist]').innerHTML = h.map((x, i) => `<button data-h="${i}"><small>${esc(x.e)}</small><b>= ${esc(x.r)}</b><i>${x.b === 16 ? 'HEX' : x.b === 2 ? 'BIN' : x.b === 8 ? 'OCT' : 'DEC'} · ${x.w}</i></button>`).join('') || `<p class="k9-small k9-muted">${esc(tr('Vacío'))}</p>`; }
      const ins = s => { const st = ex.selectionStart ?? ex.value.length, en = ex.selectionEnd ?? ex.value.length; ex.value = ex.value.slice(0, st) + s + ex.value.slice(en); const p = st + s.length; ex.setSelectionRange(p, p); ex.focus(); live(); };
      function setBase(nb) { const v = live(); const cur = v === undefined ? val : v == null ? val : v; BASE = nb; C.set('base', nb); if (ex.value.trim()) ex.value = fmt(cur, nb, true); val = cur; show(val); }
      function fl(x, bits) {
        const n = Number(x); if (!Number.isFinite(n) && !/^[-+]?(inf|infinity|nan)$/i.test(String(x).trim())) return `<p class="s10-hc-bad">${esc(tr('Número no válido'))}</p>`;
        const v = /nan/i.test(x) ? NaN : /inf/i.test(x) ? (String(x).trim()[0] === '-' ? -Infinity : Infinity) : n, dv = new DataView(new ArrayBuffer(8)); let hex, bstr, eb, mb, bias;
        if (bits === 32) { dv.setFloat32(0, v); const u = dv.getUint32(0); hex = u.toString(16).toUpperCase().padStart(8, '0'); bstr = u.toString(2).padStart(32, '0'); eb = 8; mb = 23; bias = 127; } else { dv.setFloat64(0, v); const u = dv.getBigUint64(0); hex = u.toString(16).toUpperCase().padStart(16, '0'); bstr = u.toString(2).padStart(64, '0'); eb = 11; mb = 52; bias = 1023; }
        const sgn = bstr[0], ex2 = bstr.slice(1, 1 + eb), man = bstr.slice(1 + eb), e = parseInt(ex2, 2), stored = bits === 32 ? dv.getFloat32(0) : dv.getFloat64(0);
        const kind = e === 0 ? (/1/.test(man) ? tr('subnormal') : tr('cero')) : e === (1 << eb) - 1 ? (/1/.test(man) ? 'NaN' : tr('infinito')) : tr('normal');
        return `<p><code>0x${hex}</code> · ${esc(kind)}</p><p class="s10-pc-flb"><span class="s">${sgn}</span><span class="e">${ex2}</span><span class="m">${man}</span></p><p class="k9-small">${esc(tr('Signo'))} ${sgn} · ${esc(tr('exponente'))} ${e}${e && e < (1 << eb) - 1 ? ` (${e - bias} ${esc(tr('sin sesgo'))})` : ''} · ${esc(tr('mantisa'))} ${mb} ${esc(tr('bits'))}</p><p class="k9-small">${esc(tr('Valor guardado'))}: <b>${esc(Number.isNaN(stored) ? 'NaN' : String(bits === 32 ? Number(stored.toPrecision(9)) : stored))}</b>${Number.isFinite(v) && Number.isFinite(stored) && stored !== v ? ` · ${esc(tr('error de redondeo'))} ${esc((stored - v).toExponential(3))}` : ''}</p>`;
      }
      b.addEventListener('click', e => {
        const k = e.target.closest('[data-k]'); if (k) {
          const c = k.dataset.k;
          if (c === '=') return commit(); if (c === 'CE') { ex.value = ''; val = 0n; live(); show(0n); ex.focus(); return; }
          if (c === '⌫') { const st = ex.selectionStart ?? ex.value.length; if (st > 0) { ex.value = ex.value.slice(0, st - 1) + ex.value.slice(st); ex.setSelectionRange(st - 1, st - 1); } live(); ex.focus(); return; }
          if (c === '±') { ex.value = ex.value.trim() ? '-(' + ex.value + ')' : '-'; live(); ex.focus(); return; }
          if (c === 'Ans') return ins(fmt(ans, BASE, true));
          return ins(/^[0-9A-F]$|^00$/.test(c) ? c : c === 'NOT' ? ' NOT ' : /^[A-Z]+$/.test(c) ? ' ' + c + ' ' : c === '÷' || c === '×' || c === '−' || c === '+' || /^[<>]/.test(c) ? ' ' + c + ' ' : c);
        }
        const bt = e.target.closest('[data-bit]'); if (bt) { const v = live(); const cur = v === undefined || v == null ? val : v; val = norm(cur ^ (1n << BigInt(+bt.dataset.bit))); ex.value = fmt(val, BASE, true); show(val); return; }
        const bs = e.target.closest('[data-base]'); if (bs) { setBase(+bs.dataset.base); return; }
        const wd = e.target.closest('[data-w]'); if (wd) { const v = live(); W = +wd.dataset.w; C.set('w', W); val = norm(v === undefined || v == null ? val : v); if (ex.value.trim()) ex.value = fmt(val, BASE, true); show(val); return; }
        const h = e.target.closest('[data-h]'); if (h) { const x = (C.get('hist', []) || [])[+h.dataset.h]; if (x) { BASE = x.b; W = x.w; C.set('base', BASE); C.set('w', W); ex.value = x.e; live(); } return; }
        const a = e.target.closest('[data-a="flbits"]'); if (a) { const fw = +q(b, '[data-flw]').value, u = norm(val), dv = new DataView(new ArrayBuffer(8)); let f; if (fw === 32) { dv.setUint32(0, Number(BigInt.asUintN(32, u))); f = dv.getFloat32(0); } else { dv.setBigUint64(0, BigInt.asUintN(64, u)); f = dv.getFloat64(0); } q(b, '[data-flin]').value = String(f); q(b, '[data-flout]').innerHTML = fl(String(f), fw); }
      });
      b.addEventListener('change', e => { if (e.target.matches('[data-sg]')) { SG = e.target.checked; C.set('signed', SG); live(); } if (e.target.matches('[data-flw]')) { flt = +e.target.value; const i = q(b, '[data-flin]'); if (i.value) q(b, '[data-flout]').innerHTML = fl(i.value, flt); } });
      b.addEventListener('input', e => { if (e.target === ex) live(); if (e.target.matches('[data-flin]')) q(b, '[data-flout]').innerHTML = e.target.value.trim() ? fl(e.target.value, +q(b, '[data-flw]').value) : ''; });
      ex.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') { ex.value = ''; live(); } });
      show(val); hist();
      K.ext.progcalc = { evaluate: s => { const v = evaluate(s); return v == null ? null : { u: norm(v).toString(), s: BigInt.asIntN(W, v).toString(), hex: fmt(v, 16, true), bin: fmt(v, 2, true) }; }, set: o => { if (o.w) W = o.w; if (o.signed != null) SG = o.signed; if (o.base) BASE = o.base; show(val); }, fl, state: () => ({ W, SG, BASE, val: val.toString() }) };
    }
  });

  /* ===================================================================
     Generador de diagramas técnicos: texto → SVG con disposición automática por capas
     =================================================================== */
  const DG = (() => {
    const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, sans-serif';
    let mc; const tw = (t, size = 14, bold) => { mc = mc || document.createElement('canvas').getContext('2d'); mc.font = `${bold ? 600 : 400} ${size}px ${FONT}`; return mc.measureText(String(t)).width; };
    const X = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const R = n => Math.round(n * 10) / 10;
    const PAL = {
      light: { bg: '#ffffff', node: '#f1f6f4', stroke: '#1f8160', text: '#15171c', muted: '#5b6270', edge: '#4f5662', dec: '#fbe8f0', decS: '#c93a73', note: '#fff6dc', noteS: '#c48a1c', lbl: '#ffffff', frame: '#8f96a3', head: '#e3f2ec' },
      dark: { bg: '#121419', node: '#18221e', stroke: '#34a582', text: '#e9ebef', muted: '#a3aab6', edge: '#9aa3b0', dec: '#2a1b22', decS: '#e8709f', note: '#2b2516', noteS: '#d9a03a', lbl: '#121419', frame: '#6b7280', head: '#1d3a30' }
    };
    const NAMED = { verde: ['#e3f2ec', '#1f8160'], rosa: ['#fbe8f0', '#c93a73'], gris: ['#eceef1', '#4f5662'], azul: ['#e6eef8', '#3a6fb0'], amarillo: ['#fff4d6', '#b07d12'], rojo: ['#fde7e8', '#c4363b'], green: ['#e3f2ec', '#1f8160'], pink: ['#fbe8f0', '#c93a73'], gray: ['#eceef1', '#4f5662'], blue: ['#e6eef8', '#3a6fb0'], yellow: ['#fff4d6', '#b07d12'], red: ['#fde7e8', '#c4363b'] };
    const lines = t => String(t).split(/\\n|<br\s*\/?>/i);
    const textSvg = (t, x, y, P, o = {}) => { const ls = lines(t), sz = o.size || 14, lh = sz + 4, y0 = y - (ls.length - 1) * lh / 2; return `<text x="${R(x)}" y="${R(y0)}" font-family="${FONT}" font-size="${sz}"${o.bold ? ' font-weight="600"' : ''} fill="${o.fill || P.text}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="central">${ls.map((l, i) => `<tspan x="${R(x)}" dy="${i ? lh : 0}">${X(l)}</tspan>`).join('')}</text>`; };
    const textW = (t, sz = 14, bold) => Math.max(...lines(t).map(l => tw(l, sz, bold))), textH = (t, sz = 14) => lines(t).length * (sz + 4);

    /* ---------- disposición por capas (Sugiyama simplificado) ---------- */
    function layered(nodes, edges, o = {}) {
      const dir = o.dir || 'TD', horiz = dir === 'LR' || dir === 'RL', N = new Map(nodes.map(n => [n.id, n]));
      const MW = n => horiz ? n.h : n.w, MH = n => horiz ? n.w : n.h;
      const out = new Map(nodes.map(n => [n.id, []])); edges.forEach((e, i) => { if (e.s !== e.t && N.has(e.s) && N.has(e.t)) out.get(e.s).push(i); });
      const st = new Map(), rev = new Set();
      const dfs = id => { st.set(id, 1); for (const i of out.get(id)) { const t = edges[i].t; if (st.get(t) === 1) rev.add(i); else if (!st.get(t)) dfs(t); } st.set(id, 2); };
      nodes.forEach(n => { if (!st.get(n.id)) dfs(n.id); });
      const E2 = []; edges.forEach((e, i) => { if (e.s === e.t || !N.has(e.s) || !N.has(e.t)) return; E2.push(rev.has(i) ? { s: e.t, t: e.s, i, rev: true } : { s: e.s, t: e.t, i }); });
      const indeg = new Map(nodes.map(n => [n.id, 0])), adj = new Map(nodes.map(n => [n.id, []])); E2.forEach(e => { indeg.set(e.t, indeg.get(e.t) + 1); adj.get(e.s).push(e.t); });
      const rank = new Map(), q2 = nodes.filter(n => !indeg.get(n.id)).map(n => n.id), deg0 = new Set(q2), dg = new Map(indeg); q2.forEach(id => rank.set(id, 0));
      while (q2.length) { const id = q2.shift(); for (const t of adj.get(id)) { rank.set(t, Math.max(rank.get(t) || 0, rank.get(id) + 1)); dg.set(t, dg.get(t) - 1); if (!dg.get(t)) q2.push(t); } }
      nodes.forEach(n => { if (!rank.has(n.id)) rank.set(n.id, 0); });
      deg0.forEach(id => { const ss = adj.get(id); if (ss.length) rank.set(id, Math.max(0, Math.min(...ss.map(t => rank.get(t))) - 1)); });
      const V = new Map(); nodes.forEach(n => V.set(n.id, { id: n.id, r: rank.get(n.id), w: MW(n), h: MH(n), real: true }));
      const segs = []; let dc = 0;
      E2.forEach(e => { let a = e.s; const chain = [e.s]; for (let r = rank.get(e.s) + 1; r < rank.get(e.t); r++) { const id = '\u0000d' + (dc++); V.set(id, { id, r, w: 8, h: 8, real: false }); segs.push([a, id]); chain.push(id); a = id; } segs.push([a, e.t]); chain.push(e.t); e.chain = chain; });
      const layers = []; V.forEach(v => { (layers[v.r] = layers[v.r] || []).push(v); }); for (let i = 0; i < layers.length; i++) layers[i] = layers[i] || [];
      const up = new Map(), down = new Map(); V.forEach(v => { up.set(v.id, []); down.set(v.id, []); }); segs.forEach(([a, c]) => { down.get(a).push(c); up.get(c).push(a); });
      const pos = new Map(), setPos = () => layers.forEach(l => l.forEach((v, i) => pos.set(v.id, i))); setPos();
      const crossings = () => { let c = 0; for (let li = 0; li + 1 < layers.length; li++) { const es = []; layers[li].forEach(v => down.get(v.id).forEach(t => es.push([pos.get(v.id), pos.get(t)]))); for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) if ((es[i][0] - es[j][0]) * (es[i][1] - es[j][1]) < 0) c++; } return c; };
      let best = layers.map(l => l.slice()), bestC = crossings();
      for (let it = 0; it < 12; it++) {
        const goDown = it % 2 === 0, order = goDown ? [...layers.keys()] : [...layers.keys()].reverse(), nb = goDown ? up : down;
        order.forEach(li => { const l = layers[li], bc = v => { const ns = nb.get(v.id); return ns.length ? ns.reduce((s, x) => s + pos.get(x), 0) / ns.length : pos.get(v.id); }; layers[li] = l.map(v => [bc(v), pos.get(v.id), v]).sort((a, c) => a[0] - c[0] || a[1] - c[1]).map(x => x[2]); layers[li].forEach((v, i) => pos.set(v.id, i)); });
        const c = crossings(); if (c < bestC) { bestC = c; best = layers.map(l => l.slice()); }
      }
      best.forEach((l, i) => { layers[i] = l; }); setPos();
      const gx = o.gx || 36, gy = o.gy || 56, lh = layers.map(l => Math.max(8, ...l.map(v => v.h))); let yy = 0; const ly = lh.map(h => { const c = yy + h / 2; yy += h + gy; return c; });
      layers.forEach(l => { let x = 0; l.forEach(v => { v.x = x + v.w / 2; x += v.w + gx; }); });
      for (let it = 0; it < 10; it++) {
        layers.forEach(l => {
          const nb = it % 2 ? down : up, nb2 = it % 2 ? up : down;
          const want = l.map(v => { let ns = nb.get(v.id); if (!ns.length) ns = nb2.get(v.id); return ns.length ? ns.reduce((s, id) => s + V.get(id).x, 0) / ns.length : v.x; });
          l.forEach((v, i) => { v.x = want[i]; });
          for (let i = 1; i < l.length; i++) { const mn = l[i - 1].x + (l[i - 1].w + l[i].w) / 2 + gx; if (l[i].x < mn) l[i].x = mn; }
          for (let i = l.length - 2; i >= 0; i--) { const mx = l[i + 1].x - (l[i + 1].w + l[i].w) / 2 - gx; if (l[i].x > mx) l[i].x = mx; }
          for (let i = 1; i < l.length; i++) { const mn = l[i - 1].x + (l[i - 1].w + l[i].w) / 2 + gx; if (l[i].x < mn) l[i].x = mn; }
        });
      }
      let minX = Infinity; V.forEach(v => { minX = Math.min(minX, v.x - v.w / 2); });
      const H = yy - gy, place = v => { const a = v.x - minX, c = ly[v.r]; let px = horiz ? c : a, py = horiz ? a : c; if (dir === 'BT') py = H - py; if (dir === 'RL') px = H - px; return { x: px, y: py }; };
      V.forEach(v => Object.assign(v, place(v)));
      nodes.forEach(n => { const v = V.get(n.id); n.x = v.x; n.y = v.y; });
      return { edges: E2.map(e => ({ i: e.i, rev: !!e.rev, pts: e.chain.map(id => ({ x: V.get(id).x, y: V.get(id).y, id })) })), dir };
    }
    // puntos de anclaje repartidos y curvas suaves
    function routes(nodes, lay, P) {
      const N = new Map(nodes.map(n => [n.id, n])), horiz = lay.dir === 'LR' || lay.dir === 'RL', sgn = lay.dir === 'BT' || lay.dir === 'RL' ? -1 : 1;
      const outs = new Map(), ins = new Map(); lay.edges.forEach(e => { const p = e.rev ? e.pts.slice().reverse() : e.pts; e.dp = p; const s = p[0].id, t = p[p.length - 1].id; (outs.get(s) || outs.set(s, []).get(s)).push(e); (ins.get(t) || ins.set(t, []).get(t)).push(e); });
      const spread = (m, end) => m.forEach((es, id) => { const n = N.get(id); const k = (e) => end ? e.dp[e.dp.length - 2] : e.dp[1]; es.sort((a, c) => horiz ? k(a).y - k(c).y : k(a).x - k(c).x); const span = Math.min(horiz ? n.h : n.w, es.length * 16) * .6; es.forEach((e, i) => { const off = es.length > 1 ? (i / (es.length - 1) - .5) * span : 0; e[end ? 'eo' : 'so'] = off; }); });
      spread(outs, false); spread(ins, true);
      return lay.edges.map(e => {
        const p = e.dp.map(x => ({ x: x.x, y: x.y })), s = N.get(e.dp[0].id), t = N.get(e.dp[e.dp.length - 1].id), nx = p[1], pv = p[p.length - 2];
        const dirS = horiz ? Math.sign(nx.x - s.x) || sgn : Math.sign(nx.y - s.y) || sgn, dirT = horiz ? Math.sign(t.x - pv.x) || sgn : Math.sign(t.y - pv.y) || sgn;
        if (horiz) { p[0] = { x: s.x + dirS * s.w / 2, y: s.y + (e.so || 0) }; p[p.length - 1] = { x: t.x - dirT * t.w / 2, y: t.y + (e.eo || 0) }; } else { p[0] = { x: s.x + (e.so || 0), y: s.y + dirS * s.h / 2 }; p[p.length - 1] = { x: t.x + (e.eo || 0), y: t.y - dirT * t.h / 2 }; }
        if (s.shape === 'diamond' || s.shape === 'circle') { if (horiz) p[0].y = s.y; else p[0].x = s.x; }
        if (t.shape === 'diamond' || t.shape === 'circle') { if (horiz) p[p.length - 1].y = t.y; else p[p.length - 1].x = t.x; }
        let d = `M${R(p[0].x)},${R(p[0].y)}`, mids = [];
        for (let i = 0; i + 1 < p.length; i++) { const a = p[i], c = p[i + 1]; const c1 = horiz ? { x: (a.x + c.x) / 2, y: a.y } : { x: a.x, y: (a.y + c.y) / 2 }, c2 = horiz ? { x: (a.x + c.x) / 2, y: c.y } : { x: c.x, y: (a.y + c.y) / 2 }; d += ` C${R(c1.x)},${R(c1.y)} ${R(c2.x)},${R(c2.y)} ${R(c.x)},${R(c.y)}`; mids.push({ x: (a.x + 3 * c1.x + 3 * c2.x + c.x) / 8, y: (a.y + 3 * c1.y + 3 * c2.y + c.y) / 8 }); }
        return { i: e.i, d, mid: mids[Math.floor((mids.length - 1) / 2)], p0: p[0], p1: p[1], pn: p[p.length - 1], pm: p[p.length - 2] };
      });
    }
    const defs = (P, id) => `<defs><marker id="${id}a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${P.edge}"/></marker><marker id="${id}o" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M1,1 L9,5 L1,9" fill="none" stroke="${P.edge}" stroke-width="1.5"/></marker><marker id="${id}c" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto"><circle cx="5" cy="5" r="4" fill="${P.bg}" stroke="${P.edge}" stroke-width="1.5"/></marker><marker id="${id}x" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M1,1 L9,9 M9,1 L1,9" stroke="${P.edge}" stroke-width="1.8"/></marker><marker id="${id}t" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="13" markerHeight="13" orient="auto-start-reverse"><path d="M1,1 L11,6 L1,11 z" fill="${P.bg}" stroke="${P.edge}" stroke-width="1.3"/></marker><marker id="${id}d" viewBox="0 0 16 10" refX="15" refY="5" markerWidth="16" markerHeight="10" orient="auto-start-reverse"><path d="M1,5 L8,1 L15,5 L8,9 z" fill="${P.edge}"/></marker><marker id="${id}h" viewBox="0 0 16 10" refX="15" refY="5" markerWidth="16" markerHeight="10" orient="auto-start-reverse"><path d="M1,5 L8,1 L15,5 L8,9 z" fill="${P.bg}" stroke="${P.edge}" stroke-width="1.3"/></marker></defs>`;
    const wrapSvg = (w, h, P, body, id) => `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(w)}" height="${Math.ceil(h)}" viewBox="0 0 ${Math.ceil(w)} ${Math.ceil(h)}"><rect width="100%" height="100%" fill="${P.bg}"/>${defs(P, id)}${body}</svg>`;
    const labelBox = (t, x, y, P, sz = 12) => { const w = textW(t, sz) + 10, h = textH(t, sz) + 4; return `<rect x="${R(x - w / 2)}" y="${R(y - h / 2)}" width="${R(w)}" height="${R(h)}" rx="4" fill="${P.lbl}" opacity=".92"/>` + textSvg(t, x, y, P, { size: sz, fill: P.muted }); };
    function bbox(items) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; items.forEach(([x, y, w = 0, h = 0]) => { x0 = Math.min(x0, x - w / 2); y0 = Math.min(y0, y - h / 2); x1 = Math.max(x1, x + w / 2); y1 = Math.max(y1, y + h / 2); }); return { x0, y0, x1, y1 }; }
    const colorOf = (spec, P) => { spec = String(spec || '').trim(); const nm = NAMED[spec.toLowerCase()]; if (nm) return P === PAL.dark ? [nm[1] + '33', nm[1]] : nm; const f = /fill\s*:\s*(#[0-9a-f]{3,8})/i.exec(spec), s = /stroke\s*:\s*(#[0-9a-f]{3,8})/i.exec(spec); if (f || s) return [f && f[1], s && s[1]]; const h = spec.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi); return h ? [h[0], h[1] || null] : null; };

    /* ---------- diagrama de flujo ---------- */
    const SHAPES = [['[(', ')]', 'db'], ['((', '))', 'circle'], ['([', '])', 'stadium'], ['[/', '/]', 'io'], ['[\\', '\\]', 'io2'], ['{{', '}}', 'hex'], ['[', ']', 'rect'], ['(', ')', 'round'], ['{', '}', 'diamond'], ['>', ']', 'flag']];
    function nodeTok(s) {
      const m = /^([\p{L}\p{N}_][\p{L}\p{N}_.-]*)/u.exec(s); if (!m) return null; let rest = s.slice(m[0].length), label = null, shape = null;
      for (const [o, c, sh] of SHAPES) { if (!rest.startsWith(o)) continue; let i = o.length; if (rest[i] === '"') { const qe = rest.indexOf('"', i + 1); if (qe > 0) { label = rest.slice(i + 1, qe); i = qe + 1; if (!rest.startsWith(c, i)) return { err: tr('Falta') + ' «' + c + '»' }; rest = rest.slice(i + c.length); shape = sh; break; } } const end = rest.indexOf(c, i); if (end < 0) return { err: tr('Falta') + ' «' + c + '»' }; label = rest.slice(i, end); shape = sh; rest = rest.slice(end + c.length); break; }
      return { id: m[1], label, shape, rest };
    }
    const EDGE = /^\s*(<?)(-->|==>|-\.->|---|===|-\.-|--o|--x|->)\s*(?:\|([^|]*)\|)?\s*/, EDGE_T = /^\s*(<?)(--|==|-\.)\s+(.+?)\s+(-->|==>|\.->|---|===|\.-)\s*/;
    function parseFlow(L, head) {
      const nodes = [], NM = new Map(), edges = [], warn = []; let dir = (/\b(TD|TB|LR|RL|BT)\b/i.exec(head) || [, 'TD'])[1].toUpperCase().replace('TB', 'TD');
      const reg = t => { let n = NM.get(t.id); if (!n) { n = { id: t.id, label: t.label != null ? t.label : t.id, shape: t.shape || 'rect' }; NM.set(t.id, n); nodes.push(n); } else if (t.label != null) { n.label = t.label; n.shape = t.shape || n.shape; } return n; };
      L.forEach(({ t, n }) => {
        let m;
        if ((m = /^(direcci[oó]n|direction)\s+(TD|TB|LR|RL|BT)$/i.exec(t))) { dir = m[2].toUpperCase().replace('TB', 'TD'); return; }
        if ((m = /^(estilo|style)\s+([\p{L}\p{N}_.-]+)\s+(.+)$/iu.exec(t))) { (reg({ id: m[2] }).style = m[3]); return; }
        let a = nodeTok(t); if (!a || a.err) { warn.push({ n, msg: a && a.err ? a.err : tr('Se esperaba un nodo (p. ej. A[Texto])') }); return; }
        reg(a); let rest = a.rest;
        while (rest.trim()) {
          let e = EDGE.exec(rest), kind, label = '', back;
          if (e) { back = !!e[1]; kind = e[2]; label = e[3] || ''; } else if ((e = EDGE_T.exec(rest))) { back = !!e[1]; kind = e[2] === '==' ? '==>' : e[2] === '-.' ? '-.->' : '-->'; if (/^(---|===|\.-)$/.test(e[4])) kind = e[2] === '==' ? '===' : e[2] === '-.' ? '-.-' : '---'; label = e[3]; }
          else { warn.push({ n, msg: tr('No entiendo') + ': «' + rest.trim().slice(0, 30) + '»' }); break; }
          rest = rest.slice(e[0].length); const b2 = nodeTok(rest); if (!b2 || b2.err) { warn.push({ n, msg: b2 && b2.err ? b2.err : tr('Falta el nodo de destino') }); break; }
          reg(b2); edges.push({ s: a.id, t: b2.id, kind, label: label.trim(), back }); a = b2; rest = b2.rest;
        }
      });
      return { type: 'flow', nodes, edges, dir, warn };
    }
    function renderFlow(d, P, id) {
      d.nodes.forEach(n => { const w0 = textW(n.label), h0 = textH(n.label); let w = w0 + 32, h = Math.max(40, h0 + 20); if (n.shape === 'diamond') { w = w0 * 1.45 + 44; h = Math.max(60, h0 * 1.6 + 30); } if (n.shape === 'circle') { w = h = Math.max(w0 + 26, h0 + 26, 54); } if (n.shape === 'db') h += 14; if (/^io|hex|flag/.test(n.shape)) w += 24; if (n.shape === 'stadium') w += 12; n.w = w; n.h = h; });
      const lay = layered(d.nodes, d.edges, { dir: d.dir, gx: 34, gy: 54 }), rts = routes(d.nodes, lay, P);
      let body = '';
      rts.forEach(r => { const e = d.edges[r.i], dash = /^-\./.test(e.kind) ? ' stroke-dasharray="5 4"' : '', wd = /^=/.test(e.kind) ? 3 : 1.6, end = /--o$/.test(e.kind) ? 'c' : /--x$/.test(e.kind) ? 'x' : /(-->|==>|\.->|->)$/.test(e.kind) ? 'a' : ''; body += `<path d="${r.d}" fill="none" stroke="${P.edge}" stroke-width="${wd}"${dash}${end ? ` marker-end="url(#${id}${end})"` : ''}${e.back ? ` marker-start="url(#${id}a)"` : ''}/>`; });
      d.edges.forEach((e, i) => { if (e.s !== e.t) return; const n = d.nodes.find(x => x.id === e.s), x = n.x + n.w / 2, y = n.y; body += `<path d="M${R(x)},${R(y - 8)} C${R(x + 46)},${R(y - 34)} ${R(x + 46)},${R(y + 34)} ${R(x)},${R(y + 8)}" fill="none" stroke="${P.edge}" stroke-width="1.6" marker-end="url(#${id}a)"/>`; if (e.label) body += labelBox(e.label, x + 40, y, P); void i; });
      d.nodes.forEach(n => {
        const { x, y, w, h } = n, cs = n.style ? colorOf(n.style, P) : null, fill = (cs && cs[0]) || (n.shape === 'diamond' ? P.dec : P.node), st = (cs && cs[1]) || (n.shape === 'diamond' ? P.decS : P.stroke), a = `fill="${X(fill)}" stroke="${X(st)}" stroke-width="1.6"`, l = x - w / 2, t = y - h / 2, pts = arr => `<polygon points="${arr.map(p => R(p[0]) + ',' + R(p[1])).join(' ')}" ${a}/>`;
        body += n.shape === 'round' ? `<rect x="${R(l)}" y="${R(t)}" width="${R(w)}" height="${R(h)}" rx="12" ${a}/>` : n.shape === 'stadium' ? `<rect x="${R(l)}" y="${R(t)}" width="${R(w)}" height="${R(h)}" rx="${R(h / 2)}" ${a}/>` : n.shape === 'circle' ? `<circle cx="${R(x)}" cy="${R(y)}" r="${R(w / 2)}" ${a}/>` : n.shape === 'diamond' ? pts([[x, t], [x + w / 2, y], [x, t + h], [l, y]]) : n.shape === 'io' ? pts([[l + 14, t], [l + w, t], [l + w - 14, t + h], [l, t + h]]) : n.shape === 'io2' ? pts([[l, t], [l + w - 14, t], [l + w, t + h], [l + 14, t + h]]) : n.shape === 'hex' ? pts([[l + 14, t], [l + w - 14, t], [l + w, y], [l + w - 14, t + h], [l + 14, t + h], [l, y]]) : n.shape === 'flag' ? pts([[l, t], [l + w, t], [l + w, t + h], [l, t + h], [l + 14, y]]) : n.shape === 'db' ? `<path d="M${R(l)},${R(t + 8)} a${R(w / 2)},8 0 0 1 ${R(w)},0 v${R(h - 16)} a${R(w / 2)},8 0 0 1 ${R(-w)},0 z" ${a}/><path d="M${R(l)},${R(t + 8)} a${R(w / 2)},8 0 0 0 ${R(w)},0" fill="none" stroke="${X(st)}" stroke-width="1.6"/>` : `<rect x="${R(l)}" y="${R(t)}" width="${R(w)}" height="${R(h)}" rx="4" ${a}/>`;
        body += textSvg(n.label, x, n.shape === 'db' ? y + 4 : y, P);
      });
      rts.forEach(r => { const e = d.edges[r.i]; if (e.label) body += labelBox(e.label, r.mid.x, r.mid.y, P); });
      return { body, items: d.nodes.map(n => [n.x, n.y, n.w + (d.edges.some(e => e.s === n.id && e.s === e.t) ? 110 : 0), n.h]).concat(rts.map(r => [r.mid.x, r.mid.y, 10, 10])) };
    }

    /* ---------- diagrama de secuencia ---------- */
    const MSG = /^([\p{L}\p{N}_]+)\s*(-->>|->>|-->|->|--x|-x|--\)|-\))\s*([\p{L}\p{N}_]+)\s*(?::\s*(.*))?$/u;
    function parseSeq(L) {
      const parts = [], PM = new Map(), items = [], warn = [], stack = []; let auto = false;
      const part = (idn, label, actor) => { let p = PM.get(idn); if (!p) { p = { id: idn, label: label || idn, actor: !!actor }; PM.set(idn, p); parts.push(p); } else if (label) p.label = label; if (actor) p.actor = true; return p; };
      L.forEach(({ t, n }) => {
        let m;
        if ((m = /^(participante|participant|actor)\s+([\p{L}\p{N}_]+)(?:\s+(?:como|as)\s+(.+))?$/iu.exec(t))) { part(m[2], m[3], /^actor$/i.test(m[1])); return; }
        if (/^(autonumero|autonúmero|autonumber)$/i.test(t)) { auto = true; return; }
        if ((m = /^(nota|note)\s+(sobre|over|a la derecha de|right of|a la izquierda de|left of)\s+([\p{L}\p{N}_]+)(?:\s*,\s*([\p{L}\p{N}_]+))?\s*:\s*(.*)$/iu.exec(t))) { part(m[3]); if (m[4]) part(m[4]); items.push({ k: 'note', pos: /sobre|over/i.test(m[2]) ? 'over' : /derecha|right/i.test(m[2]) ? 'right' : 'left', a: m[3], b: m[4] || m[3], text: m[5] }); return; }
        if ((m = /^(bucle|loop|alt|opt|opcional|par|critical|cr[ií]tico)\b\s*(.*)$/iu.exec(t))) { const kind = /^(bucle|loop)$/i.test(m[1]) ? 'loop' : /^(opt|opcional)$/i.test(m[1]) ? 'opt' : /^par$/i.test(m[1]) ? 'par' : /^cr/i.test(m[1]) ? 'critical' : 'alt'; stack.push(kind); items.push({ k: 'start', kind, text: m[2] }); return; }
        if ((m = /^(sino|else|y|and)\b\s*(.*)$/iu.exec(t))) { if (!stack.length) { warn.push({ n, msg: tr('«sino» fuera de un bloque') }); return; } items.push({ k: 'else', text: m[2] }); return; }
        if (/^(fin|end)$/i.test(t)) { if (!stack.length) { warn.push({ n, msg: tr('«fin» sin bloque abierto') }); return; } stack.pop(); items.push({ k: 'end' }); return; }
        if ((m = MSG.exec(t))) { part(m[1]); part(m[3]); items.push({ k: 'msg', a: m[1], b: m[3], kind: m[2], text: (m[4] || '').trim() }); return; }
        warn.push({ n, msg: tr('No entiendo esta línea') });
      });
      while (stack.length) { stack.pop(); items.push({ k: 'end' }); warn.push({ n: 0, msg: tr('Falta «fin» para cerrar un bloque') }); }
      return { type: 'seq', parts, items, auto, warn };
    }
    function renderSeq(d, P, id) {
      if (!d.parts.length) return { body: '', items: [[0, 0, 10, 10]] };
      const ix = new Map(d.parts.map((p, i) => [p.id, i])), pw = d.parts.map(p => Math.max(90, textW(p.label, 14, true) + 28)), xs = []; let x = 20 + pw[0] / 2;
      d.parts.forEach((p, i) => { if (i) x += Math.max(150, (pw[i - 1] + pw[i]) / 2 + 40); xs.push(x); });
      let num = 0; d.items.forEach(it => { if (it.k !== 'msg') return; if (d.auto) it.text = (++num) + '. ' + it.text; const a = ix.get(it.a), c = ix.get(it.b); if (a === c) { const need = textW(it.text, 13) + 60; if (a + 1 < xs.length && xs[a + 1] - xs[a] < need) { const dd = need - (xs[a + 1] - xs[a]); for (let k = a + 1; k < xs.length; k++) xs[k] += dd; } return; } const lo = Math.min(a, c), hi = Math.max(a, c), need = textW(it.text, 13) + 40; if (xs[hi] - xs[lo] < need) { const dd = need - (xs[hi] - xs[lo]); for (let k = hi; k < xs.length; k++) xs[k] += dd; } });
      const HB = 38; let y = 20 + HB + 24, body = '', open = [], frames = [], acts = [];
      d.items.forEach(it => {
        if (it.k === 'msg') {
          const a = ix.get(it.a), c = ix.get(it.b); open.forEach(f => { f.lo = Math.min(f.lo, a, c); f.hi = Math.max(f.hi, a, c); });
          const dash = it.kind.startsWith('--') ? ' stroke-dasharray="6 4"' : '', mk = /x$/.test(it.kind) ? 'x' : /\)$/.test(it.kind) ? 'o' : />>$/.test(it.kind) ? 'a' : 'o';
          if (a === c) { const x0 = xs[a]; body += `<path d="M${R(x0)},${R(y)} h40 v22 h-36" fill="none" stroke="${P.edge}" stroke-width="1.5"${dash} marker-end="url(#${id}${mk})"/>` + textSvg(it.text, x0 + 46, y + 4, P, { size: 13, anchor: 'start' }); y += 52; }
          else { body += textSvg(it.text, (xs[a] + xs[c]) / 2, y - 10, P, { size: 13 }) + `<line x1="${R(xs[a])}" y1="${R(y)}" x2="${R(xs[c] + (c > a ? -2 : 2))}" y2="${R(y)}" stroke="${P.edge}" stroke-width="1.5"${dash} marker-end="url(#${id}${mk})"/>`; y += 40; }
          acts.push(y);
        } else if (it.k === 'note') {
          const a = ix.get(it.a), c = ix.get(it.b), tw2 = Math.max(80, textW(it.text, 13) + 20), th = textH(it.text, 13) + 12; let nx, nw = tw2;
          if (it.pos === 'over') { const lo = Math.min(a, c), hi = Math.max(a, c); nw = Math.max(tw2, xs[hi] - xs[lo] + 60); nx = (xs[lo] + xs[hi]) / 2 - nw / 2; } else nx = it.pos === 'right' ? xs[a] + 14 : xs[a] - 14 - nw;
          open.forEach(f => { f.lo = Math.min(f.lo, a, c); f.hi = Math.max(f.hi, a, c); });
          body += `<path d="M${R(nx)},${R(y - 6)} h${R(nw - 10)} l10,10 v${R(th - 10)} h${R(-nw)} z" fill="${P.note}" stroke="${P.noteS}" stroke-width="1.2"/>` + textSvg(it.text, nx + nw / 2, y - 6 + th / 2, P, { size: 13 }); y += th + 16; d.minX = Math.min(d.minX ?? Infinity, nx); d.maxX = Math.max(d.maxX ?? -Infinity, nx + nw);
        } else if (it.k === 'start') { const f = { kind: it.kind, text: it.text, y0: y - 14, lo: Infinity, hi: -Infinity, depth: open.length, secs: [] }; open.push(f); frames.push(f); y += 22; }
        else if (it.k === 'else') { const f = open[open.length - 1]; if (f) { f.secs.push({ y: y - 10, text: it.text }); y += 22; } }
        else if (it.k === 'end') { const f = open.pop(); if (f) { f.y1 = y - 6; y += 12; } }
      });
      const yEnd = y + 6;
      frames.forEach(f => { if (!Number.isFinite(f.lo)) { f.lo = 0; f.hi = d.parts.length - 1; } const pad = 16 - f.depth * 4, x0 = xs[f.lo] - pw[f.lo] / 2 - pad + f.depth * 6, x1 = xs[f.hi] + Math.max(pw[f.hi] / 2, 60) + pad - f.depth * 6, lab = { loop: tr('bucle'), alt: 'alt', opt: 'opt', par: 'par', critical: tr('crítico') }[f.kind] || f.kind, lw = textW(lab, 12, true) + 16;
        body = `<rect x="${R(x0)}" y="${R(f.y0)}" width="${R(x1 - x0)}" height="${R(f.y1 - f.y0)}" fill="none" stroke="${P.frame}" stroke-width="1.2"/><path d="M${R(x0)},${R(f.y0)} h${R(lw)} v12 l-6,6 h${R(-lw + 6)} z" fill="${P.head}" stroke="${P.frame}" stroke-width="1"/>` + textSvg(lab, x0 + lw / 2 - 2, f.y0 + 9, P, { size: 12, bold: true }) + (f.text ? textSvg('[' + f.text + ']', x0 + lw + 8, f.y0 + 9, P, { size: 12, anchor: 'start', fill: P.muted }) : '') + f.secs.map(s => `<line x1="${R(x0)}" y1="${R(s.y)}" x2="${R(x1)}" y2="${R(s.y)}" stroke="${P.frame}" stroke-dasharray="5 4"/>` + (s.text ? textSvg('[' + s.text + ']', x0 + 8, s.y + 10, P, { size: 12, anchor: 'start', fill: P.muted }) : '')).join('') + body; d.minX = Math.min(d.minX ?? Infinity, x0); d.maxX = Math.max(d.maxX ?? -Infinity, x1); });
      let heads = '', life = '';
      d.parts.forEach((p, i) => { const x0 = xs[i], w = pw[i]; life += `<line x1="${R(x0)}" y1="${20 + HB}" x2="${R(x0)}" y2="${R(yEnd)}" stroke="${P.frame}" stroke-width="1.2" stroke-dasharray="4 4"/>`; [20, yEnd].forEach(yy => { heads += p.actor ? `<g fill="none" stroke="${P.stroke}" stroke-width="1.8"><circle cx="${R(x0)}" cy="${yy + 6}" r="5"/><path d="M${R(x0)},${yy + 11} v10 M${R(x0 - 8)},${yy + 14} h16 M${R(x0)},${yy + 21} l-6,8 M${R(x0)},${yy + 21} l6,8"/></g>` + textSvg(p.label, x0, yy + HB - 2, P, { size: 12, bold: true }) : `<rect x="${R(x0 - w / 2)}" y="${yy}" width="${R(w)}" height="${HB}" rx="6" fill="${P.node}" stroke="${P.stroke}" stroke-width="1.6"/>` + textSvg(p.label, x0, yy + HB / 2, P, { bold: true }); }); });
      void acts;
      const xMin = Math.min(xs[0] - pw[0] / 2, d.minX ?? Infinity), xMax = Math.max(xs[xs.length - 1] + Math.max(pw[pw.length - 1] / 2, 70), d.maxX ?? -Infinity);
      return { body: life + body + heads, items: [[xMin, 20, 0, 0], [xMax, yEnd + HB + 6, 0, 0], [xMax, 10, 0, 0]] };
    }

    /* ---------- diagrama de clases ---------- */
    const REL = /^([\p{L}\p{N}_]+)\s*(?:"([^"]*)")?\s*(<\|--|--\|>|<\|\.\.|\.\.\|>|\*--|--\*|o--|--o|<--|-->|<\.\.|\.\.>|--|\.\.)\s*(?:"([^"]*)")?\s*([\p{L}\p{N}_]+)\s*(?::\s*(.*))?$/u;
    function parseClass(L) {
      const cls = [], CM = new Map(), rels = [], warn = []; let cur = null;
      const C2 = (nm, stereo) => { let c = CM.get(nm); if (!c) { c = { id: nm, label: nm, attrs: [], meths: [], stereo: '' }; CM.set(nm, c); cls.push(c); } if (stereo) c.stereo = stereo; return c; };
      const member = (c, m) => { m = m.trim().replace(/;$/, ''); if (!m) return; if (/^<<.*>>$/.test(m)) { c.stereo = m; return; } (/\(.*\)/.test(m) ? c.meths : c.attrs).push(m); };
      L.forEach(({ t, n }) => {
        let m;
        if (cur) { if (t === '}' || t === '};') { cur = null; return; } if (t.endsWith('}')) { member(cur, t.slice(0, -1)); cur = null; return; } member(cur, t); return; }
        if ((m = /^(clase|class|interfaz|interface|abstracta|abstract|enum)\s+([\p{L}\p{N}_]+)\s*(?:<<([^>]+)>>)?\s*(\{)?\s*(.*?)\s*(\})?$/iu.exec(t))) { const st = /^(interfaz|interface)$/i.test(m[1]) ? '<<interfaz>>' : /^(abstracta|abstract)$/i.test(m[1]) ? '<<abstracta>>' : /^enum$/i.test(m[1]) ? '<<enum>>' : m[3] ? '<<' + m[3] + '>>' : ''; const c = C2(m[2], st); if (m[4] && !m[6]) { cur = c; if (m[5]) member(c, m[5]); } else if (m[5]) m[5].split(/;\s*/).forEach(x => member(c, x)); return; }
        if ((m = /^([\p{L}\p{N}_]+)\s*:\s*(.+)$/u.exec(t)) && !REL.test(t)) { member(C2(m[1]), m[2]); return; }
        if ((m = REL.exec(t))) { C2(m[1]); C2(m[5]); rels.push({ a: m[1], b: m[5], op: m[3], ca: m[2] || '', cb: m[4] || '', label: (m[6] || '').trim() }); return; }
        warn.push({ n, msg: tr('No entiendo esta línea') });
      });
      if (cur) warn.push({ n: 0, msg: tr('Falta «}» para cerrar una clase') });
      return { type: 'class', cls, rels, warn };
    }
    function renderClass(d, P, id) {
      const LH = 18;
      d.cls.forEach(c => { const ws = [textW(c.label, 14, true), c.stereo ? textW(c.stereo, 12) : 0, ...c.attrs.map(a => textW(a, 13)), ...c.meths.map(a => textW(a, 13))]; c.w = Math.max(110, ...ws) + 24; c.hh = c.stereo ? 44 : 30; c.h = c.hh + (c.attrs.length * LH + 10) + (c.meths.length * LH + 10); });
      // aristas de disposición: padre/todo arriba
      const E3 = d.rels.map(r => { const op = r.op; const sw = /^--\|>|\.\.\|>|--\*|--o|<--|<\.\.$/.test(op); return { s: sw ? r.b : r.a, t: sw ? r.a : r.b, r }; });
      const lay = layered(d.cls, E3, { dir: 'TD', gx: 46, gy: 70 }), rts = routes(d.cls, lay, P); let body = '';
      rts.forEach(rt => { const { r } = E3[rt.i], op = r.op, dash = /\.\./.test(op) ? ' stroke-dasharray="6 4"' : ''; const startMk = /<\||\|>/.test(op) ? 't' : /\*/.test(op) ? 'd' : /(^o--|--o$)/.test(op) ? 'h' : ''; const endMk = /(-->|<--|\.\.>|<\.\.)/.test(op) ? 'o' : ''; body += `<path d="${rt.d}" fill="none" stroke="${P.edge}" stroke-width="1.5"${dash}${startMk ? ` marker-start="url(#${id}${startMk})"` : ''}${endMk ? ` marker-end="url(#${id}a)"` : ''}/>`;
        const sw = E3[rt.i].s !== r.a, near = (p, q3, txt) => { if (!txt) return ''; const dx = q3.x - p.x, dy = q3.y - p.y, l = Math.hypot(dx, dy) || 1; return textSvg(txt, p.x + dx / l * 20 + (-dy / l) * 12 + 6, p.y + dy / l * 20 + (dx / l) * 12, P, { size: 12, fill: P.muted }); };
        body += near(rt.p0, rt.p1, sw ? r.cb : r.ca) + near(rt.pn, rt.pm, sw ? r.ca : r.cb); if (r.label) body += labelBox(r.label, rt.mid.x, rt.mid.y, P); });
      d.cls.forEach(c => { const l = c.x - c.w / 2, t = c.y - c.h / 2; let y = t + c.hh; body += `<rect x="${R(l)}" y="${R(t)}" width="${R(c.w)}" height="${R(c.h)}" rx="4" fill="${P.node}" stroke="${P.stroke}" stroke-width="1.6"/><rect x="${R(l)}" y="${R(t)}" width="${R(c.w)}" height="${R(c.hh)}" rx="4" fill="${P.head}" stroke="${P.stroke}" stroke-width="1.6"/>` + (c.stereo ? textSvg(c.stereo, c.x, t + 14, P, { size: 12, fill: P.muted }) : '') + textSvg(c.label, c.x, t + (c.stereo ? 31 : 15), P, { bold: true });
        y += 6; c.attrs.forEach(a => { body += textSvg(a, l + 10, y + 8, P, { size: 13, anchor: 'start' }); y += LH; }); y += 4; body += `<line x1="${R(l)}" y1="${R(y)}" x2="${R(l + c.w)}" y2="${R(y)}" stroke="${P.stroke}" stroke-width="1.2"/>`; y += 6; c.meths.forEach(a => { body += textSvg(a, l + 10, y + 8, P, { size: 13, anchor: 'start' }); y += LH; }); });
      return { body, items: d.cls.map(c => [c.x, c.y, c.w + 40, c.h]).concat(rts.map(r => [r.mid.x, r.mid.y, 40, 20])) };
    }

    /* ---------- diagrama de red ---------- */
    const DEV = { pc: 'pc', equipo: 'pc', ordenador: 'pc', computadora: 'pc', portatil: 'laptop', 'portátil': 'laptop', laptop: 'laptop', servidor: 'server', server: 'server', router: 'router', enrutador: 'router', switch: 'switch', conmutador: 'switch', nube: 'cloud', cloud: 'cloud', internet: 'cloud', cortafuegos: 'firewall', firewall: 'firewall', impresora: 'printer', printer: 'printer', telefono: 'phone', 'teléfono': 'phone', phone: 'phone', movil: 'phone', 'móvil': 'phone', tablet: 'tablet', ap: 'ap', wifi: 'ap', bd: 'db', db: 'db', database: 'db', consola: 'console', console: 'console', camara: 'camera', 'cámara': 'camera', camera: 'camera' };
    const DEVRE = new RegExp('^(' + Object.keys(DEV).join('|') + ')\\s+([\\p{L}\\p{N}_.-]+)(?:\\s+"([^"]*)")?(?:\\s+([0-9a-fA-F.:/]+))?$', 'iu');
    function parseNet(L) {
      const nodes = [], NM = new Map(), links = [], warn = [];
      const dev = (idn, type, label, ip) => { let n = NM.get(idn); if (!n) { n = { id: idn, type: type || 'pc', label: label || idn, ip: ip || '' }; NM.set(idn, n); nodes.push(n); } else { if (type) n.type = type; if (label) n.label = label; if (ip) n.ip = ip; } return n; };
      L.forEach(({ t, n }) => {
        let m;
        if ((m = DEVRE.exec(t))) { dev(m[2], DEV[m[1].toLowerCase()], m[3], m[4]); return; }
        if ((m = /^([\p{L}\p{N}_.-]+)\s*(--|==|~~|-\.-)\s*([\p{L}\p{N}_.-]+)(?:\s*:\s*(.*))?$/u.exec(t))) { dev(m[1]); dev(m[3]); links.push({ s: m[1], t: m[3], kind: m[2], label: (m[4] || '').trim() }); return; }
        warn.push({ n, msg: tr('No entiendo esta línea') });
      });
      return { type: 'net', nodes, links, warn };
    }
    function icon(t, x, y, P) {
      const s = `fill="${P.node}" stroke="${P.stroke}" stroke-width="1.8" stroke-linejoin="round"`, k = `fill="none" stroke="${P.stroke}" stroke-width="1.8" stroke-linecap="round"`, p2 = `fill="${P.dec}" stroke="${P.decS}" stroke-width="1.8"`;
      const at = (dx, dy) => `${R(x + dx)},${R(y + dy)}`;
      switch (t) {
        case 'laptop': return `<rect x="${R(x - 16)}" y="${R(y - 14)}" width="32" height="21" rx="2" ${s}/><path d="M${at(-21, 9)} L${at(21, 9)} L${at(17, 13)} L${at(-17, 13)} z" ${s}/>`;
        case 'server': return `<rect x="${R(x - 13)}" y="${R(y - 18)}" width="26" height="34" rx="3" ${s}/><path d="M${at(-8, -9)} h16 M${at(-8, -2)} h16 M${at(-8, 5)} h16" ${k}/><circle cx="${R(x + 6)}" cy="${R(y + 11)}" r="1.6" fill="${P.stroke}"/>`;
        case 'router': return `<ellipse cx="${R(x)}" cy="${R(y + 4)}" rx="20" ry="9" ${s}/><path d="M${at(-20, 4)} v-7 a20,9 0 0 1 40,0 v7" ${s}/><path d="M${at(-9, -6)} l-5,0 M${at(9, -6)} l5,0 M${at(-3, -9)} l-5,-3 M${at(3, -9)} l5,-3" ${k}/>`;
        case 'switch': return `<rect x="${R(x - 22)}" y="${R(y - 9)}" width="44" height="18" rx="3" ${s}/><path d="M${at(-14, -3)} h18 l-3,-3 M${at(14, 3)} h-18 l3,3" ${k}/>`;
        case 'cloud': return `<path d="M${at(-16, 10)} h32 a9,9 0 0 0 1,-18 a12,12 0 0 0 -22,-3 a8,8 0 0 0 -11,21 z" ${p2}/>`;
        case 'firewall': return `<rect x="${R(x - 18)}" y="${R(y - 14)}" width="36" height="28" rx="2" ${p2}/><path d="M${at(-18, -5)} h36 M${at(-18, 5)} h36 M${at(-6, -14)} v9 M${at(8, -5)} v10 M${at(-4, 5)} v9" fill="none" stroke="${P.decS}" stroke-width="1.5"/>`;
        case 'printer': return `<rect x="${R(x - 18)}" y="${R(y - 6)}" width="36" height="16" rx="3" ${s}/><rect x="${R(x - 11)}" y="${R(y - 16)}" width="22" height="10" ${s}/><rect x="${R(x - 11)}" y="${R(y + 6)}" width="22" height="9" fill="${P.bg}" stroke="${P.stroke}" stroke-width="1.5"/>`;
        case 'phone': return `<rect x="${R(x - 9)}" y="${R(y - 17)}" width="18" height="32" rx="4" ${s}/><path d="M${at(-3, 11)} h6" ${k}/>`;
        case 'tablet': return `<rect x="${R(x - 14)}" y="${R(y - 17)}" width="28" height="32" rx="4" ${s}/><circle cx="${R(x)}" cy="${R(y + 11)}" r="1.6" fill="${P.stroke}"/>`;
        case 'ap': return `<rect x="${R(x - 16)}" y="${R(y + 2)}" width="32" height="10" rx="3" ${s}/><path d="M${at(-12, -6)} a16,16 0 0 1 24,0 M${at(-7, -1)} a9,9 0 0 1 14,0" ${k}/>`;
        case 'db': return `<path d="M${at(-15, -12)} a15,5 0 0 1 30,0 v24 a15,5 0 0 1 -30,0 z" ${s}/><path d="M${at(-15, -12)} a15,5 0 0 0 30,0" ${k}/>`;
        case 'console': return `<rect x="${R(x - 20)}" y="${R(y - 9)}" width="40" height="20" rx="9" ${s}/><path d="M${at(-12, 1)} h7 M${at(-8.5, -2.5)} v7" ${k}/><circle cx="${R(x + 9)}" cy="${R(y - 1)}" r="1.8" fill="${P.stroke}"/><circle cx="${R(x + 13)}" cy="${R(y + 3)}" r="1.8" fill="${P.stroke}"/>`;
        case 'camera': return `<rect x="${R(x - 16)}" y="${R(y - 9)}" width="24" height="16" rx="3" ${s}/><path d="M${at(8, -3)} l9,-5 v14 l-9,-5 z" ${s}/>`;
        default: return `<rect x="${R(x - 17)}" y="${R(y - 15)}" width="34" height="23" rx="2" ${s}/><path d="M${at(-6, 13)} h12 M${at(0, 8)} v5" ${k}/>`;
      }
    }
    function renderNet(d, P, id) {
      d.nodes.forEach(n => { n.w = Math.max(76, textW(n.label, 13, true) + 14, n.ip ? textW(n.ip, 12) + 14 : 0); n.h = 52 + (n.ip ? 34 : 18); });
      const deg = new Map(d.nodes.map(n => [n.id, 0])); d.links.forEach(l => { deg.set(l.s, deg.get(l.s) + 1); deg.set(l.t, deg.get(l.t) + 1); });
      const root = (d.nodes.find(n => n.type === 'cloud') || d.nodes.slice().sort((a, c) => deg.get(c.id) - deg.get(a.id))[0] || {}).id, depth = new Map(); const adj = new Map(d.nodes.map(n => [n.id, []])); d.links.forEach(l => { adj.get(l.s).push(l.t); adj.get(l.t).push(l.s); });
      const bfs = st => { depth.set(st, 0); const q3 = [st]; while (q3.length) { const c = q3.shift(); adj.get(c).forEach(x => { if (!depth.has(x)) { depth.set(x, depth.get(c) + 1); q3.push(x); } }); } };
      if (root) bfs(root); d.nodes.forEach(n => { if (!depth.has(n.id)) bfs(n.id); });
      const order = new Map(d.nodes.map((n, i) => [n.id, i])), E3 = d.links.map(l => (depth.get(l.s) < depth.get(l.t) || (depth.get(l.s) === depth.get(l.t) && order.get(l.s) < order.get(l.t))) ? { s: l.s, t: l.t } : { s: l.t, t: l.s });
      const lay = layered(d.nodes, E3, { dir: 'TD', gx: 30, gy: 50 }); let body = '';
      lay.edges.forEach(e => { const l = d.links[e.i], p = e.pts, wd = l.kind === '==' ? 4 : 2, dash = l.kind === '~~' ? ' stroke-dasharray="7 5"' : l.kind === '-.-' ? ' stroke-dasharray="2 4"' : ''; const s = d.nodes.find(n => n.id === p[0].id), t = d.nodes.find(n => n.id === p[p.length - 1].id); const pts = [{ x: s.x, y: s.y - 6 }].concat(p.slice(1, -1)).concat([{ x: t.x, y: t.y - 6 }]); body += `<polyline points="${pts.map(x => R(x.x) + ',' + R(x.y)).join(' ')}" fill="none" stroke="${l.kind === '==' ? P.stroke : P.edge}" stroke-width="${wd}"${dash} stroke-linejoin="round"/>`; if (l.label) { const a = pts[Math.floor((pts.length - 1) / 2)], c = pts[Math.floor((pts.length - 1) / 2) + 1]; body += labelBox(l.label, (a.x + c.x) / 2, (a.y + c.y) / 2, P, 11); } });
      d.nodes.forEach(n => { const iy = n.y - n.h / 2 + 22; body += `<rect x="${R(n.x - 26)}" y="${R(iy - 22)}" width="52" height="44" rx="10" fill="${P.bg}"/>` + icon(n.type, n.x, iy, P) + textSvg(n.label, n.x, iy + 34, P, { size: 13, bold: true }) + (n.ip ? textSvg(n.ip, n.x, iy + 51, P, { size: 12, fill: P.muted }) : ''); });
      return { body, items: d.nodes.map(n => [n.x, n.y, n.w, n.h]) };
    }

    /* ---------- entrada principal ---------- */
    let uid = 0;
    function parse(src) {
      const raw = String(src || '').replace(/\r/g, '').split('\n'), L = []; let head = null;
      raw.forEach((l, i) => { const t = l.trim(); if (!t || t.startsWith('%%') || t.startsWith('//')) return; if (head === null) { head = { t, n: i + 1 }; return; } L.push({ t, n: i + 1 }); });
      if (!head) return { type: 'empty', warn: [] };
      const h = head.t.toLowerCase();
      if (/^(flujo|flow|flowchart|graph|grafo|diagrama de flujo)\b/.test(h)) return parseFlow(L, head.t);
      if (/^(secuencia|sequence|sequencediagram)\b/.test(h)) return parseSeq(L);
      if (/^(clases|class|classdiagram|uml)\b/.test(h)) return parseClass(L);
      if (/^(red|network|topolog[ií]a)\b/.test(h)) return parseNet(L);
      const d = parseFlow([head].concat(L), 'TD'); d.warn.unshift({ n: head.n, msg: tr('La primera línea debería indicar el tipo: flujo, secuencia, clases o red (se asume flujo).') }); return d;
    }
    function render(src, theme = 'light') {
      const P = PAL[theme] || PAL.light, d = parse(src), id = 'dg' + (++uid) + '_';
      if (d.type === 'empty') return { svg: wrapSvg(320, 80, P, textSvg(tr('Escribe un diagrama a la izquierda'), 160, 40, P, { fill: P.muted }), id), w: 320, h: 80, warn: [], type: 'empty' };
      const r = d.type === 'flow' ? renderFlow(d, P, id) : d.type === 'seq' ? renderSeq(d, P, id) : d.type === 'class' ? renderClass(d, P, id) : renderNet(d, P, id);
      if (!r.items.length) r.items = [[0, 0, 10, 10]];
      const bb = bbox(r.items), m = 24, w = Math.max(60, bb.x1 - bb.x0 + m * 2), h = Math.max(40, bb.y1 - bb.y0 + m * 2);
      const svg = wrapSvg(w, h, P, `<g transform="translate(${R(m - bb.x0)},${R(m - bb.y0)})">${r.body}</g>`, id);
      return { svg, w, h, warn: d.warn, type: d.type, count: (d.nodes || d.parts || d.cls || []).length };
    }
    return { parse, render, layered, PAL, tw };
  })();
  K.diagram = { render: (src, theme) => DG.render(src, theme), parse: src => DG.parse(src) };
  const DG_EX = {
    flow: `flujo TD\n%% Proceso de inicio de sesión\nA([Inicio]) --> B[/Usuario y contraseña/]\nB --> C{¿Datos correctos?}\nC -->|sí| D[Abrir el escritorio]\nC -->|no| E[Mostrar error]\nE --> F{¿3 intentos?}\nF -->|no| B\nF -->|sí| G[Bloquear 5 minutos]\nD --> H([Fin])\nG --> H\nestilo D verde\nestilo G rosa`,
    seq: `secuencia\nautonumero\nactor U como Usuario\nparticipante N como Navegador\nparticipante S como Servidor\nparticipante BD como Base de datos\nU ->> N: Escribe usuario y contraseña\nN ->> S: POST /login\nS ->> BD: Buscar usuario\nBD -->> S: Datos del usuario\nalt contraseña correcta\n  S -->> N: 200 OK + sesión\n  N -->> U: Muestra el escritorio\nsino contraseña incorrecta\n  S -->> N: 401 No autorizado\n  nota sobre N: Se cuenta el intento fallido\nfin`,
    class: `clases\nclase Animal {\n  +nombre: string\n  +edad: int\n  +comer(): void\n  +dormir(): void\n}\nclase Perro {\n  +raza: string\n  +ladrar(): void\n}\nclase Gato {\n  +maullar(): void\n}\ninterfaz Mascota {\n  +jugar(): void\n}\nclase Dueño {\n  +nombre: string\n}\nAnimal <|-- Perro\nAnimal <|-- Gato\nMascota <|.. Perro : implementa\nDueño "1" o-- "*" Perro : cuida`,
    net: `red\nnube INTERNET "Internet"\ncortafuegos FW "Cortafuegos"\nrouter R1 "Router" 192.168.1.1\nswitch SW1 "Switch"\nap WIFI "Punto de acceso"\npc PC1 "Escritorio" 192.168.1.10\nservidor NAS "Servidor NAS" 192.168.1.5\nimpresora IMP "Impresora" 192.168.1.20\nportatil L1 "Portátil" 192.168.1.30\nmovil M1 "Móvil"\nconsola XB "Xbox" 192.168.1.40\nINTERNET == FW : fibra\nFW -- R1\nR1 -- SW1 : 1 Gbps\nR1 -- WIFI\nSW1 -- PC1\nSW1 -- NAS\nSW1 -- IMP\nWIFI ~~ L1\nWIFI ~~ M1\nSW1 -- XB`
  };
  const DG_HELP = [['Flujo', 'flujo TD (o LR) · A[Rectángulo] · B(Redondeado) · C{Decisión} · D((Círculo)) · E[(Base de datos)] · F[/Entrada/] · G([Inicio/fin]) · A --> B · A -->|texto| B · A -- texto --> B · A -.-> B (punteada) · A ==> B (gruesa) · A --- B (sin flecha) · estilo A verde|rosa|gris|azul|#e3f2ec'], ['Secuencia', 'secuencia · participante A como Nombre · actor U · A ->> B: mensaje · B -->> A: respuesta · A -> B (asíncrono) · nota sobre A: texto · bucle cond … fin · alt cond … sino … fin · opt … fin · autonumero'], ['Clases', 'clases · clase Nombre { +atributo: tipo  +método(): tipo } · interfaz / abstracta / enum · A <|-- B (herencia) · A <|.. B (implementa) · A *-- B (composición) · A o-- B (agregación) · A --> B (asociación) · A ..> B (dependencia) · A "1" --> "*" B : etiqueta'], ['Red', 'red · tipo ID "Nombre" IP · tipos: pc, portatil, servidor, router, switch, nube, cortafuegos, impresora, movil, tablet, ap, bd, consola, camara · A -- B (cable) · A == B (fibra) · A ~~ B (inalámbrica) · A -- B : 1 Gbps']];
  K.define('diagrams', {
    init(b, w, arg) {
      const C = K.cfg('diagrams', { src: DG_EX.flow, theme: 'auto', name: 'Diagrama' });
      let z = 1, last = null, fit = true;
      b.innerHTML = `<div class="k9 s10-dg"><div class="s10-dg-bar"><select class="input-text" data-ex><option value="">${esc(tr('Ejemplos…'))}</option><option value="flow">${esc(tr('Flujo'))}</option><option value="seq">${esc(tr('Secuencia'))}</option><option value="class">${esc(tr('Clases'))}</option><option value="net">${esc(tr('Red'))}</option></select><button class="k9-btn" data-a="new">${I('plus', 14)}</button><button class="k9-btn" data-a="open">${I('folder', 14)} .eisdiag</button><button class="k9-btn" data-a="save">${I('save', 14)}</button><span class="s10-wb-sep"></span><select class="input-text" data-th>${[['auto', 'Tema del sistema'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, l]) => `<option value="${v}"${C.get('theme', 'auto') === v ? ' selected' : ''}>${esc(tr(l))}</option>`).join('')}</select><span class="s10-wb-sep"></span><button class="k9-btn" data-a="fit">${esc(tr('Ajustar'))}</button><button class="k9-btn" data-a="zo">−</button><b class="k9-small" data-zl>100 %</b><button class="k9-btn" data-a="zi">+</button><span class="s10-wb-sep"></span><button class="k9-btn" data-a="svg">${I('download', 14)} SVG</button><button class="k9-btn" data-a="png">${I('image', 14)} PNG</button><button class="k9-btn" data-a="copy" title="${esc(tr('Copiar SVG'))}">${I('copy', 14)}</button><button class="k9-btn" data-a="help">${I('help', 14)}</button></div>
        <div class="s10-dg-main"><div class="s10-dg-ed"><textarea class="input-text" data-src spellcheck="false" aria-label="${esc(tr('Código del diagrama'))}"></textarea><div class="s10-dg-warn" data-warn></div><div class="s10-dg-help k9-small" data-help hidden>${DG_HELP.map(([t, h]) => `<p><b>${esc(tr(t))}</b>: ${esc(h)}</p>`).join('')}</div></div><div class="s10-dg-pv" data-pv></div></div></div>`;
      const ta = q(b, '[data-src]'), pv = q(b, '[data-pv]'), wn = q(b, '[data-warn]');
      ta.value = C.get('src', DG_EX.flow);
      const theme = () => { const t = C.get('theme', 'auto'); return t === 'auto' ? (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark') : t; };
      function draw() {
        try { last = DG.render(ta.value, theme()); } catch (e) { wn.innerHTML = `<p class="s10-hc-bad">✗ ${esc(e.message || String(e))}</p>`; return; }
        if (fit) { const W = pv.clientWidth - 24, H = pv.clientHeight - 24; z = W > 0 && H > 0 ? Math.max(.2, Math.min(2, W / last.w, H / last.h)) : 1; }
        pv.innerHTML = last.svg; const s = pv.querySelector('svg'); if (s) { s.setAttribute('width', Math.round(last.w * z)); s.setAttribute('height', Math.round(last.h * z)); }
        q(b, '[data-zl]').textContent = Math.round(z * 100) + ' %';
        wn.innerHTML = last.warn.length ? last.warn.slice(0, 12).map(x => `<button class="s10-dg-w" data-line="${x.n}">⚠ ${x.n ? esc(tr('Línea')) + ' ' + x.n + ': ' : ''}${esc(x.msg)}</button>`).join('') : `<span class="k9-small k9-muted">✓ ${esc(tr({ flow: 'Diagrama de flujo', seq: 'Diagrama de secuencia', class: 'Diagrama de clases', net: 'Diagrama de red', empty: 'Vacío' }[last.type] || ''))}${last.count ? ' · ' + last.count + ' ' + esc(tr('elementos')) : ''}</span>`;
      }
      const drawD = U.debounce(() => { C.set('src', ta.value.length < 100000 ? ta.value : C.get('src')); draw(); }, 250);
      ta.addEventListener('input', drawD);
      ta.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd); ta.setSelectionRange(s + 2, s + 2); drawD(); } });
      const toPng = async () => { const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(last.svg); await im.decode(); const sc = Math.min(3, 4000 / Math.max(last.w, last.h)) || 2, c = document.createElement('canvas'); c.width = Math.round(last.w * Math.max(1, sc)); c.height = Math.round(last.h * Math.max(1, sc)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return new Promise(r => c.toBlob(r, 'image/png')); };
      const nameFor = () => C.get('name', 'Diagrama') || 'Diagrama';
      b.addEventListener('click', async e => {
        const ln = e.target.closest('[data-line]'); if (ln && +ln.dataset.line) { const n = +ln.dataset.line, ls = ta.value.split('\n'); const st = ls.slice(0, n - 1).join('\n').length + (n > 1 ? 1 : 0); ta.focus(); ta.setSelectionRange(st, st + (ls[n - 1] || '').length); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'fit') { fit = true; draw(); } if (k === 'zi' || k === 'zo') { fit = false; z = Math.max(.2, Math.min(4, z * (k === 'zi' ? 1.25 : .8))); draw(); }
        if (k === 'help') { const h = q(b, '[data-help]'); h.hidden = !h.hidden; }
        if (k === 'new') { if (ta.value.trim() && !await E.confirm(tr('Nuevo diagrama'), tr('¿Empezar uno nuevo? El actual se pierde si no lo has guardado.'))) return; ta.value = 'flujo TD\nA[Inicio] --> B[Fin]\n'; C.set('name', 'Diagrama'); drawD(); }
        if (k === 'save') { const v = await E.form({ title: tr('Guardar diagrama'), fields: [{ k: 'n', label: tr('Nombre'), value: nameFor(), req: true }] }); if (!v) return; C.set('name', v.n.trim()); await U.saveBlob(v.n.trim() + '.eisdiag', new Blob([ta.value], { type: 'text/plain' }), 'documents'); }
        if (k === 'open') { const f = await U.pickBlob({ title: tr('Diagrama (.eisdiag)'), accept: x => /\.(eisdiag|txt|mmd)$/i.test(x.name), deviceAccept: '.eisdiag,.txt,.mmd' }); if (f) openText(f); }
        if (!last) return;
        if (k === 'svg') await U.saveBlob(nameFor() + '.svg', new Blob([last.svg], { type: 'image/svg+xml' }), 'images');
        if (k === 'png') { const bl = await toPng(); if (bl) await U.saveBlob(nameFor() + '.png', bl, 'images'); }
        if (k === 'copy') copy(last.svg);
      });
      b.addEventListener('change', e => { if (e.target.matches('[data-ex]') && e.target.value) { ta.value = DG_EX[e.target.value]; C.set('name', tr({ flow: 'Diagrama de flujo', seq: 'Diagrama de secuencia', class: 'Diagrama de clases', net: 'Diagrama de red' }[e.target.value])); e.target.value = ''; fit = true; drawD(); } if (e.target.matches('[data-th]')) { C.set('theme', e.target.value); draw(); } });
      async function openText(f) { ta.value = (await f.blob.text()).slice(0, 200000); C.set('name', baseName(f.name)); fit = true; drawD(); }
      const ro = new ResizeObserver(U.debounce(() => { if (fit) draw(); }, 120)); ro.observe(pv);
      const offTheme = K.on('theme', () => { if (C.get('theme', 'auto') === 'auto') draw(); });
      const argFile = async a => { const f = fid(a) && await F.get(fid(a)); if (f) openText(f); };
      draw(); argFile(arg);
      this.onOpen = (bb, ww, a) => argFile(a); this.destroy = () => { ro.disconnect(); if (typeof offTheme === 'function') offTheme(); };
      K.ext.diagrams = { render: (s, t) => DG.render(s, t), set: s => { ta.value = s; draw(); }, last: () => last, png: toPng, EX: DG_EX };
    }
  });
})();

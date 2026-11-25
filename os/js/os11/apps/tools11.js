/* =====================================================================
   EISEN OS PRIME 11.0 · Apps (carga diferida): Plugins, Estudio PRIME y Automatización
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, P = K.prime, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, U = K.u10;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)], now = () => Date.now();
  const appOf = id => E.REG[id] || E.apps().find(a => a.id === id) || null;

  /* ============================== Plugins ============================== */
  K.define('plugins', {
    init(b) {
      b.innerHTML = `<div class="p11-app"><header class="p11-apph"><div class="p11-brand"><span class="p11-logo">🧩</span><div><b>${esc(tr('Plugins'))}</b><small>${esc(tr('Temas, fondos, enlaces, comandos y widgets aislados'))}</small></div></div><div class="k9-row p11-wrap"><button class="k9-btn pri" data-p="file">${I('upload', 14)} ${esc(tr('Instalar desde archivo'))}</button><button class="k9-btn" data-p="paste">${I('code', 14)} ${esc(tr('Pegar JSON'))}</button><button class="k9-btn" data-p="url">${I('link', 14)} ${esc(tr('Desde una URL'))}</button><button class="k9-btn" data-p="sample">${I('box', 14)} ${esc(tr('Plugin de ejemplo'))}</button><button class="k9-btn" data-p="template">${I('book', 14)} ${esc(tr('Crear el mío'))}</button></div></header><main class="p11-main" data-v></main></div>`;
      const V = q(b, '[data-v]');
      const PERM = { themes: '🎨 ' + tr('Temas'), wallpapers: '🖼️ ' + tr('Fondos'), links: '🔗 ' + tr('Enlaces'), commands: '⌘ ' + tr('Comandos'), widgets: '🧩 ' + tr('Widgets aislados') };
      const render = () => {
        const l = P.plugins.list();
        V.innerHTML = (K.safeMode ? U.note('Modo seguro: los plugins están desactivados en esta sesión.', 'warn') : '') + U.note('Los plugins solo pueden aportar contenido declarativo validado. Si traen código (widgets), se ejecuta aislado en un marco sin acceso a EISEN, a tus datos ni a Internet.', 'info') +
          (l.length ? l.map(p => `<article class="k9-card p11-plug"><div class="k9-row"><b>${esc(p.name)}</b><span class="k9-badge">v${esc(p.version)}</span>${p.author ? `<span class="k9-small k9-muted">${esc(p.author)}</span>` : ''}<label class="k9-row" style="margin-left:auto"><input type="checkbox" class="k9-switch" data-en="${esc(p.id)}" ${p.enabled ? 'checked' : ''} aria-label="${esc(tr('Activado'))}"> ${esc(tr('Activado'))}</label></div>${p.description ? `<p class="k9-small">${esc(p.description)}</p>` : ''}<div class="ac9-chips">${p.perms.map(x => `<span class="k9-badge">${esc(PERM[x] || x)}</span>`).join('')}</div>
            ${p.contributes.themes.length ? `<div class="k9-row p11-wrap">${p.contributes.themes.map((t, i) => `<button class="k9-btn" data-theme="${esc(p.id)}:${i}"><i class="p11-dot" style="background:${esc(t.accent || Object.values(t.vars)[0] || '#2a9d76')}"></i>${esc(t.name)}</button>`).join('')}</div>` : ''}
            ${p.contributes.wallpapers.length ? `<div class="k9-row p11-wrap">${p.contributes.wallpapers.map(w => `<button class="k9-btn p11-wpbtn" data-wp="${esc('plg-' + K.slug(w.name))}" style="background-image:${esc(w.css)}">${esc(w.name)}</button>`).join('')}</div>` : ''}
            ${p.contributes.commands.length ? `<p class="k9-small k9-muted">${esc(tr('Comandos para Domingo y la paleta'))}: ${p.contributes.commands.map(c => '«' + esc(c.phrase) + '»').join(', ')}</p>` : ''}
            <div class="k9-row"><button class="k9-btn" data-exp="${esc(p.id)}">${I('download', 14)} ${esc(tr('Exportar'))}</button><button class="k9-btn dng" data-del="${esc(p.id)}">${esc(tr('Eliminar'))}</button></div></article>`).join('') : `<div class="k9-state" style="min-height:220px">${I('puzzle', 36)}<p>${esc(tr('No hay plugins instalados. Prueba el plugin de ejemplo.'))}</p></div>`);
      };
      async function install(text, source) {
        if (text.length > 262144) return K.ui.alert(tr('Plugin rechazado'), tr('El plugin supera 256 KB'));
        const o = P.safeParse(text); const v = P.plugins.validate(o, text.length);
        if (!v.ok) { K.seclog('apps', 'Plugin rechazado: ' + v.errors.join('; '), 'warn'); return K.ui.alert(tr('Plugin rechazado'), v.errors.join('\n')); }
        const c = v.clean, ok = await E.form({ title: tr('Instalar plugin'), html: `<p><b>${esc(c.name)}</b> <span class="k9-badge">v${esc(c.version)}</span> <span class="k9-small k9-muted">${esc(c.author || tr('Autor desconocido'))} · ${esc(source || '')}</span></p><p class="k9-small">${esc(c.description || '')}</p><h4 style="margin:10px 0 4px;font-size:12.5px">${esc(tr('Aporta'))}</h4>${c.perms.map(x => `<div class="k9-small">${esc(PERM[x] || x)} · ${c.contributes[x].length}</div>`).join('')}${v.warnings.length ? `<p class="k9-small" style="color:var(--e9-warn);margin-top:8px">⚠️ ${v.warnings.map(esc).join('<br>⚠️ ')}</p>` : ''}`, ok: tr('Instalar'), cancel: tr('Cancelar') });
        if (!ok) return; try { P.plugins.install(o, text.length); E.notify(tr('Plugin instalado'), c.name, '🧩'); render(); } catch (e) { K.ui.alert(tr('Plugin rechazado'), e.message); }
      }
      const TEMPLATE = { eisenplugin: 1, id: 'mi-plugin', name: 'Mi plugin', version: '1.0.0', author: 'Yo', description: 'Describe lo que hace tu plugin.', contributes: { themes: [{ name: 'Mi tema', accent: '#2a9d76', vars: { '--e9-green': '#2a9d76', '--e9-pink': '#e8709f' } }], wallpapers: [{ name: 'Mi fondo', css: 'radial-gradient(900px 600px at 80% 10%, rgba(201,58,115,.3), transparent 60%), linear-gradient(160deg, #0b0c0f, #12161b)' }], links: [{ name: 'Wikipedia', url: 'https://es.wikipedia.org', icon: '📚' }], commands: [{ phrase: 'hola plugin', say: '¡Hola desde mi plugin!', action: { type: 'notify', text: 'El plugin funciona' } }], widgets: [{ id: 'saludo', name: 'Saludo', icon: '👋', height: 90, html: '<p id="t">Hola</p><script>document.getElementById("t").textContent = new Date().getHours() < 12 ? "¡Buenos días!" : "¡Buenas tardes!"<\/script>' }] } };
      b.addEventListener('change', e => { const en = e.target.closest('[data-en]'); if (en) { P.plugins.setEnabled(en.dataset.en, en.checked); render(); } });
      b.addEventListener('click', async e => {
        const t = e.target;
        const th = t.closest('[data-theme]'); if (th) { const [pid, i] = th.dataset.theme.split(':'); P.plugins.applyTheme(pid, +i); return; }
        const wp = t.closest('[data-wp]'); if (wp) { if (E.WALLPAPERS[wp.dataset.wp]) { E.setWp(wp.dataset.wp); E.toast('🖼️ ' + tr('Fondo aplicado')); } else E.toast(tr('Activa el plugin para usar su fondo')); return; }
        const del = t.closest('[data-del]'); if (del) { if (await E.confirm(tr('Eliminar plugin'), tr('Se quitará el plugin y lo que aporta.'), tr('Eliminar'))) { P.plugins.remove(del.dataset.del); K.seclog('apps', 'Plugin eliminado: ' + del.dataset.del); render(); } return; }
        const ex = t.closest('[data-exp]'); if (ex) { const p = P.plugins.list().find(x => x.id === ex.dataset.exp); if (!p) return; const o = { eisenplugin: 1, id: p.id, name: p.name, version: p.version, author: p.author, description: p.description, contributes: p.contributes }; await U.saveBlob(p.id + '.eisenplugin', new Blob([JSON.stringify(o, null, 1)], { type: 'application/json' }), 'documents'); return; }
        const a = t.closest('[data-p]'); if (!a) return; const k = a.dataset.p;
        if (k === 'file') { const f = await U.pickBlob({ title: tr('Plugin (.eisenplugin)'), accept: x => /\.(eisenplugin|json)$/i.test(x.name), deviceAccept: '.eisenplugin,.json' }); if (f) install(await f.blob.text(), f.name); }
        if (k === 'paste') { const r = await E.form({ title: tr('Pegar plugin'), fields: [{ k: 'j', label: 'JSON', type: 'textarea', rows: 10, ph: '{ "eisenplugin": 1, … }' }], ok: tr('Comprobar') }); if (r && r.j.trim()) install(r.j, tr('pegado')); }
        if (k === 'url') { const u = await K.ui.prompt(tr('Instalar desde una URL'), 'https://…/plugin.eisenplugin', '', { type: 'url' }); if (!u) return; if (!/^https:\/\//i.test(u)) return E.toast(tr('Solo se admiten direcciones https')); try { install(await E.ebFetchHtml(u), new URL(u).hostname); } catch { E.toast(tr('No se pudo descargar el plugin')); } }
        if (k === 'sample') { try { const r = await fetch('apps/prime-sample.eisenplugin', { cache: 'no-store' }); install(await r.text(), 'prime-sample.eisenplugin'); } catch { install(JSON.stringify(TEMPLATE), tr('plantilla')); } }
        if (k === 'template') { await U.saveBlob('mi-plugin.eisenplugin', new Blob([JSON.stringify(TEMPLATE, null, 2)], { type: 'application/json' }), 'documents'); K.ui.alert(tr('Plantilla creada'), tr('Edita «mi-plugin.eisenplugin» en Archivos › Documentos (Bloc de notas o Code Studio) y luego instálalo con «Instalar desde archivo». Campos: themes (variables --e9-* con colores #rrggbb), wallpapers (degradados CSS), links (https), commands (acciones open/url/notify/wallpaper/say) y widgets (HTML aislado sin red).')); }
      });
      render();
    }
  });

  /* ============================== Estudio PRIME ============================== */
  const STOP = new Set(('a al algo algunas algunos ante antes como con contra cual cuales cuando de del desde donde dos el ella ellas ellos en entre era eran es esa esas ese eso esos esta estaba estado estan estar este esto estos fue fueron ha han hasta hay la las le les lo los mas me mi muy nada ni no nos o otra otras otro otros para pero poco por porque que quien se ser si sido sin sobre son su sus tambien tanto te tiene tienen todo todos tu un una uno unos ya yo puede pueden cada mismo misma asi aunque mientras segun tras durante the of and to in is are was were be been for on with as by at an or from that this these those it its not but which have has had can will would should into than then there their they he she we you your our also more most such').split(' '));
  const words = t => (K.norm(String(t)).match(/[a-z0-9ñ]{2,}/g) || []);
  const sentences = t => (String(t).replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]+["»”')]*|[^.!?…]+$/g) || []).map(s => s.trim()).filter(s => s.length > 3);
  const freqOf = t => { const m = new Map(); words(t).forEach(w => { if (!STOP.has(w) && w.length > 2 && !/^\d+$/.test(w)) m.set(w, (m.get(w) || 0) + 1); }); return m; };
  const display = t => { const m = new Map(); (String(t).match(/[\p{L}\p{N}]{2,}/gu) || []).forEach(w => { const n = K.norm(w); if (!m.has(n)) m.set(n, w.toLowerCase()); }); return n => m.get(n) || n; };
  function summarize(text, ratio = .3) { const ss = sentences(text); if (ss.length < 3) return ss; const f = freqOf(text), mx = Math.max(1, ...f.values()); const sc = ss.map((s, i) => { const ws = words(s).filter(w => !STOP.has(w)); return [i, ws.reduce((a, w) => a + (f.get(w) || 0) / mx, 0) / Math.pow(Math.max(ws.length, 1), .55) + (i === 0 ? .35 : i < 3 ? .1 : 0)]; }); const n = Math.max(1, Math.round(ss.length * ratio)); const pick = new Set(sc.sort((a, c) => c[1] - a[1]).slice(0, n).map(x => x[0])); return ss.filter((_, i) => pick.has(i)); }
  function keywords(text, n = 15) { const f = freqOf(text), D = display(text); const top = [...f.entries()].filter(([w]) => w.length >= 4).sort((a, c) => c[1] - a[1]).slice(0, n).map(([w, c]) => [D(w), c]); const ws = words(text), bi = new Map(); for (let i = 0; i < ws.length - 1; i++) { if (STOP.has(ws[i]) || STOP.has(ws[i + 1]) || ws[i].length < 3 || ws[i + 1].length < 3) continue; const k = ws[i] + ' ' + ws[i + 1]; bi.set(k, (bi.get(k) || 0) + 1); } return { top, bigrams: [...bi.entries()].filter(([, c]) => c > 1).sort((a, c) => c[1] - a[1]).slice(0, 10).map(([k, c]) => [k.split(' ').map(D).join(' '), c]) }; }
  const syl = w => { w = String(w).toLowerCase().replace(/[^a-záéíóúüñ]/g, ''); if (!w) return 0; const STR = 'aeoáéíóú', V = 'aeiouáéíóúü'; let n = 0, prev = ''; for (const ch of w) { if (V.includes(ch)) { if (!prev) n++; else if (STR.includes(ch) && STR.includes(prev)) n++; prev = ch; } else prev = ''; } if (/[^aeiou]y$/.test(w)) n++; return Math.max(1, n); };
  function readability(text) { const ss = sentences(text), ws = (String(text).match(/[\p{L}]+/gu) || []); const W = ws.length || 1, F = ss.length || 1, Sy = ws.reduce((a, w) => a + syl(w), 0); const p = 206.835 - 62.3 * (Sy / W) - W / F; const lvl = p < 40 ? 'Muy difícil' : p < 55 ? 'Algo difícil' : p < 65 ? 'Normal' : p < 80 ? 'Bastante fácil' : 'Muy fácil'; return { inflesz: +p.toFixed(1), lvl, words: ws.length, sentences: ss.length, unique: new Set(ws.map(w => K.norm(w))).size, avg: +(W / F).toFixed(1), minutes: Math.max(1, Math.round(ws.length / 200)), syll: +(Sy / W).toFixed(2) }; }
  function outline(text) {
    const lines = String(text).split(/\n+/).map(l => l.trim()).filter(Boolean); const out = []; let cur = null;
    const isHead = (l, i) => /^#{1,6}\s+/.test(l) || (l.length < 70 && !/[.!?:;,]$/.test(l) && /^[\p{Lu}0-9]/u.test(l) && i < lines.length - 1 && lines[i + 1].length > l.length);
    lines.forEach((l, i) => { if (isHead(l, i)) { cur = { h: l.replace(/^#+\s*/, ''), t: '' }; out.push(cur); } else { if (!cur) { cur = { h: '', t: '' }; out.push(cur); } cur.t += ' ' + l; } });
    if (out.length <= 1) { const paras = String(text).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean); return paras.map((p, i) => ({ h: (tr('Idea') + ' ' + (i + 1)), pts: summarize(p, .2).slice(0, 2) })); }
    return out.map(o => ({ h: o.h || tr('Introducción'), pts: summarize(o.t, .25).slice(0, 3) }));
  }
  function cloze(text, max = 10) {
    const ss = sentences(text).filter(s => s.length > 25 && s.length < 260), f = freqOf(text), D = display(text);
    const rank = new Map([...f.entries()].filter(([w]) => w.length >= 4).sort((a, c) => c[1] - a[1]).map(([w], i) => [w, i]));
    const qs = [];
    for (const s of ss) {
      const cand = (s.match(/[\p{L}\p{N}]{4,}/gu) || []).map(w => [w, rank.has(K.norm(w)) ? rank.get(K.norm(w)) : 1e9]).filter(x => x[1] < 60).sort((a, c) => a[1] - c[1]);
      if (!cand.length) continue; const w = cand[0][0]; if (qs.some(x => K.norm(x.a) === K.norm(w))) continue;
      qs.push({ q: s.replace(w, '_____'), a: w, full: s }); if (qs.length >= max) break;
    }
    void D; return qs;
  }
  K.define('studio', {
    init(b) {
      const TABS = [['sum', 'Resumen', 'sparkle'], ['kw', 'Palabras clave', 'tag'], ['out', 'Esquema', 'list'], ['quiz', 'Preguntas', 'help'], ['read', 'Legibilidad', 'eye'], ['voice', 'Leer en voz alta', 'volume'], ['plan', 'Plan de repaso', 'calendar'], ['exam', 'Examen', 'clock']];
      let tab = 'sum', ratio = .3, quiz = [], speaking = false;
      b.innerHTML = `<div class="p11-app p11-studio"><header class="p11-apph"><div class="p11-brand"><span class="p11-logo" style="background:#4b3f7a">🎓</span><div><b>${esc(tr('Estudio PRIME'))}</b><small>${esc(tr('Todo funciona sin conexión'))}</small></div></div><div class="k9-row p11-wrap"><button class="k9-btn" data-s="load">${I('folder', 14)} ${esc(tr('Abrir de Archivos'))}</button><button class="k9-btn" data-s="paste">${I('copy', 14)} ${esc(tr('Pegar'))}</button><button class="k9-btn" data-s="clear">${esc(tr('Vaciar'))}</button></div></header><div class="p11-studiogrid"><textarea class="input-text p11-src" data-src placeholder="${esc(tr('Pega aquí tus apuntes, un capítulo o un artículo…'))}"></textarea><section class="p11-studout"><div data-tabs></div><div class="p11-studv" data-v></div></section></div></div>`;
      const SRC = q(b, '[data-src]'), V = q(b, '[data-v]');
      SRC.value = S.get('prime_studio_text', '') || '';
      const txt = () => SRC.value.trim();
      const empty = () => `<div class="k9-state" style="min-height:200px">${I('book', 32)}<p>${esc(tr('Escribe o pega un texto a la izquierda (o ábrelo desde Archivos).'))}</p></div>`;
      function render() {
        q(b, '[data-tabs]').innerHTML = U.tabs(TABS, tab, 'tab');
        const t = txt();
        if (tab === 'exam') return renderExam();
        if (tab === 'plan') return renderPlan();
        if (!t) { V.innerHTML = empty(); return; }
        if (tab === 'sum') { const s = summarize(t, ratio); V.innerHTML = `<div class="k9-row"><label class="k9-small">${esc(tr('Longitud'))} <input type="range" min=".1" max=".6" step=".05" value="${ratio}" data-ratio></label><span class="k9-small k9-muted">${s.length} / ${sentences(t).length} ${esc(tr('frases'))}</span><button class="k9-btn" data-s="copysum">${esc(tr('Copiar'))}</button><button class="k9-btn" data-s="savesum">${esc(tr('Guardar como nota'))}</button></div><div class="p11-studtext">${s.map(x => `<p>${esc(x)}</p>`).join('')}</div>`; V.__sum = s.join(' '); }
        if (tab === 'kw') { const k = keywords(t), mx = Math.max(1, ...k.top.map(x => x[1])); V.innerHTML = `<h4>${esc(tr('Palabras clave'))}</h4><div class="ac9-chips">${k.top.map(([w, c]) => `<span class="k9-badge">${esc(w)} · ${c}</span>`).join('')}</div>${k.bigrams.length ? `<h4>${esc(tr('Frases frecuentes'))}</h4><div class="ac9-chips">${k.bigrams.map(([w, c]) => `<span class="k9-badge g">${esc(w)} · ${c}</span>`).join('')}</div>` : ''}<h4>${esc(tr('Estadísticas de palabras'))}</h4><div class="p11-bars">${[...freqOf(t).entries()].sort((a, c) => c[1] - a[1]).slice(0, 25).map(([w, c]) => `<div><span>${esc(display(t)(w))}</span><i style="width:${(c / mx * 100).toFixed(0)}%"></i><b>${c}</b></div>`).join('')}</div>`; }
        if (tab === 'out') { const o = outline(t); V.innerHTML = `<div class="p11-studtext">${o.map(x => `<h4>${esc(x.h)}</h4><ul>${x.pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`).join('')}</div><button class="k9-btn" data-s="saveout">${esc(tr('Guardar esquema en Archivos'))}</button>`; V.__out = o; }
        if (tab === 'quiz') { if (!quiz.length) quiz = cloze(t); V.innerHTML = quiz.length ? `<div class="k9-row p11-wrap"><button class="k9-btn" data-s="newquiz">${esc(tr('Nuevo cuestionario'))}</button><button class="k9-btn pri" data-s="check">${esc(tr('Comprobar'))}</button><button class="k9-btn" data-s="flash">${esc(tr('Exportar a Tarjetas de estudio'))}</button></div><ol class="p11-quiz">${quiz.map((x, i) => `<li><p>${esc(x.q)}</p><input class="input-text" data-qa="${i}" autocomplete="off" aria-label="${esc(tr('Respuesta'))} ${i + 1}"><small data-qr="${i}"></small></li>`).join('')}</ol><p data-score class="k9-small"></p>` : `<p class="k9-muted">${esc(tr('El texto es demasiado corto para crear preguntas.'))}</p>`; }
        if (tab === 'read') { const r = readability(t); V.innerHTML = `<div class="k9-grid" style="--min:130px">${U.kpi(r.inflesz, 'INFLESZ')}${U.kpi(tr(r.lvl), 'Dificultad')}${U.kpi(r.minutes + ' min', 'Tiempo de lectura')}${U.kpi(r.words, 'Palabras')}${U.kpi(r.sentences, 'Frases')}${U.kpi(r.unique, 'Palabras distintas')}${U.kpi(r.avg, 'Palabras por frase')}${U.kpi(r.syll, 'Sílabas por palabra')}</div>${U.note('INFLESZ (Szigriszt-Pazos): menos de 40 muy difícil · 40-55 algo difícil · 55-65 normal · 65-80 bastante fácil · más de 80 muy fácil. Frases de más de 25 palabras dificultan la lectura.', 'info')}`; }
        if (tab === 'voice') { const vs = (window.speechSynthesis ? speechSynthesis.getVoices() : []).filter(v => /^(es|en)/i.test(v.lang)); V.innerHTML = window.speechSynthesis ? `<div class="k9-row p11-wrap"><select class="input-text" data-voice>${vs.map((v, i) => `<option value="${i}">${esc(v.name)} (${esc(v.lang)})</option>`).join('') || `<option>${esc(tr('Voz del sistema'))}</option>`}</select><label class="k9-small">${esc(tr('Velocidad'))} <input type="range" min=".6" max="1.6" step=".1" value="1" data-vrate></label><button class="k9-btn pri" data-s="speak">▶ ${esc(tr('Leer'))}</button><button class="k9-btn" data-s="stop">■ ${esc(tr('Parar'))}</button></div><div class="p11-studtext p11-reading">${sentences(t).map((s, i) => `<span data-sn="${i}">${esc(s)} </span>`).join('')}</div>` : U.note('Este navegador no tiene síntesis de voz.', 'warn'); V.__voices = vs; }
      }
      function renderPlan() {
        const D = Object.assign({ subjects: [], tasks: [] }, S.get('a9_academic', {}) || {}), today = new Date().toISOString().slice(0, 10);
        const exams = D.tasks.filter(x => x.type === 'examen' && !x.done && x.due >= today);
        V.innerHTML = `<form class="p11-col" data-planf><label class="k9-field">${esc(tr('Examen'))}<select class="input-text" name="ex"><option value="">${esc(tr('Elegir fecha a mano'))}</option>${exams.map(x => `<option value="${esc(x.due)}">${esc(x.title)} · ${esc(x.due)}</option>`).join('')}</select></label><label class="k9-field">${esc(tr('Fecha del examen'))}<input class="input-text" type="date" name="date" min="${today}"></label><label class="k9-field">${esc(tr('Temas (uno por línea)'))}<textarea class="input-text" name="topics" rows="5" placeholder="${esc(tr('Tema 1: …'))}"></textarea></label><label class="k9-field">${esc(tr('Hora de estudio'))}<input class="input-text" type="time" name="at" value="17:00"></label><div class="k9-row"><button class="k9-btn pri">${esc(tr('Calcular plan'))}</button></div></form><div data-plan></div>`;
      }
      function makePlan(examDate, topics, at) {
        const ex = new Date(examDate + 'T00:00'), t0 = new Date(); t0.setHours(0, 0, 0, 0); const days = Math.round((ex - t0) / 86400000);
        if (days < 1) return null; const [h, m] = String(at || '17:00').split(':').map(Number), plan = [];
        const day = n => { const d = new Date(t0); d.setDate(d.getDate() + n); d.setHours(h || 17, m || 0, 0, 0); return d; };
        const learnSpan = Math.max(1, Math.floor(days / 2));
        topics.forEach((tp, i) => { const first = Math.min(days - 1, Math.floor(i * learnSpan / topics.length)); plan.push([day(first), tr('Aprender') + ': ' + tp]); [2, 5].forEach(off => { if (first + off < days - 1) plan.push([day(first + off), tr('Repasar') + ': ' + tp]); }); });
        if (days >= 2) plan.push([day(days - 1), tr('Repaso general antes del examen')]);
        return plan.sort((a, c) => a[0] - c[0]).filter(x => x[0] > new Date());
      }
      function renderExam() {
        V.innerHTML = `<div class="p11-col"><label class="k9-field">${esc(tr('Duración (minutos)'))}<input class="input-text" type="number" min="1" max="600" value="${S.get('prime_exam_min', 60)}" data-emin style="width:120px"></label><label class="k9-row"><input type="checkbox" data-ewarn checked> ${esc(tr('Avisar cuando falten 10 y 5 minutos'))}</label><button class="k9-btn pri" data-s="examgo">${esc(tr('Empezar a pantalla completa'))}</button>${U.note('La pantalla se mantiene encendida durante el examen (si el navegador lo permite).', 'info')}</div>`;
      }
      function examRun(min, warn) {
        S.set('prime_exam_min', min); const end0 = now() + min * 60000; let end = end0, paused = 0, warned = {};
        const ov = document.createElement('div'); ov.className = 'p11-exam'; ov.innerHTML = `<div class="p11-examt" data-t></div><div class="k9-row"><button class="k9-btn" data-x="pause">⏯ ${esc(tr('Pausa'))}</button><button class="k9-btn dng" data-x="end">${esc(tr('Terminar'))}</button></div>`;
        document.body.appendChild(ov); try { ov.requestFullscreen && ov.requestFullscreen(); } catch { /* ignorar */ }
        let wl = null; if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(x => { wl = x; }).catch(() => { });
        const tick = () => { const left = paused ? end - paused : end - now(); q(ov, '[data-t]').textContent = U.hms(Math.max(0, left / 1000)); ov.classList.toggle('warn', left < 5 * 60000); if (warn) [10, 5].forEach(mn => { if (!warned[mn] && left <= mn * 60000 && left > (mn - 1) * 60000 && min > mn) { warned[mn] = true; P.notify('⏳ ' + tr('Examen'), tr('Quedan') + ' ' + mn + ' min', { icon: '⏳' }); P.sound && P.sound('note'); } }); if (left <= 0) { done(); P.notify('⏰ ' + tr('Tiempo terminado'), tr('El examen ha finalizado.'), { icon: '⏰' }); P.sound && P.sound('ok'); } };
        const iv = setInterval(tick, 250); tick();
        const done = () => { clearInterval(iv); try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* ignorar */ } if (wl) wl.release().catch(() => { }); ov.remove(); };
        ov.addEventListener('click', e => { const x = e.target.closest('[data-x]'); if (!x) return; if (x.dataset.x === 'end') done(); if (x.dataset.x === 'pause') { if (paused) { end += now() - paused; paused = 0; } else paused = now(); } });
      }
      function speak(from = 0) {
        if (!window.speechSynthesis) return; const ss = sentences(txt()), vs = V.__voices || [], vi = +(q(V, '[data-voice]') || {}).value || 0, rate = +(q(V, '[data-vrate]') || {}).value || 1;
        speechSynthesis.cancel(); speaking = true;
        const say = i => { if (!speaking || i >= ss.length) { speaking = false; qa(V, '[data-sn]').forEach(x => x.classList.remove('on')); return; } qa(V, '[data-sn]').forEach(x => x.classList.toggle('on', +x.dataset.sn === i)); const el = q(V, `[data-sn="${i}"]`); if (el) el.scrollIntoView({ block: 'nearest' }); const u = new SpeechSynthesisUtterance(ss[i]); if (vs[vi]) { u.voice = vs[vi]; u.lang = vs[vi].lang; } else u.lang = 'es-ES'; u.rate = rate; u.onend = () => say(i + 1); u.onerror = () => { speaking = false; }; speechSynthesis.speak(u); };
        say(from);
      }
      SRC.addEventListener('input', U.debounce(() => { S.set('prime_studio_text', SRC.value.slice(0, 200000)); quiz = []; if (tab !== 'exam' && tab !== 'plan') render(); }, 500));
      b.addEventListener('input', e => { if (e.target.matches('[data-ratio]')) { ratio = +e.target.value; render(); } });
      b.addEventListener('submit', e => {
        if (!e.target.matches('[data-planf]')) return; e.preventDefault(); const f = e.target; const date = f.date.value || f.ex.value; const topics = f.topics.value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 40);
        if (!date || !topics.length) return E.toast(tr('Indica la fecha y al menos un tema'));
        const plan = makePlan(date, topics, f.at.value); if (!plan) return E.toast(tr('El examen debe ser al menos mañana'));
        q(V, '[data-plan]').innerHTML = `<div class="k9-card p11-table">${plan.map(([d, w]) => `<div class="k9-li"><span>📅</span><div class="t"><b>${esc(w)}</b><small>${esc(K.fmt.dt(d))}</small></div></div>`).join('')}</div><button class="k9-btn pri" data-s="planrem">${esc(tr('Crear'))} ${plan.length} ${esc(tr('recordatorios'))}</button>`; V.__plan = plan;
      });
      b.addEventListener('change', e => { if (e.target.matches('[name="ex"]')) { const f = e.target.form; if (e.target.value) f.date.value = e.target.value; } });
      b.addEventListener('click', async e => {
        const t = e.target;
        const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; if (window.speechSynthesis && tab !== 'voice') { speaking = false; speechSynthesis.cancel(); } render(); return; }
        const sn = t.closest('[data-sn]'); if (sn && tab === 'voice') { speak(+sn.dataset.sn); return; }
        const s = t.closest('[data-s]'); if (!s) return; const k = s.dataset.s;
        if (k === 'load') { const f = await U.pickBlob({ title: tr('Texto para estudiar'), accept: x => /^(text\/|application\/json)/.test(x.type || '') || /\.(txt|md|html?|csv|json)$/i.test(x.name), deviceAccept: '.txt,.md,.html,.htm,.csv' }); if (!f) return; let v = await f.blob.text(); if (/\.html?$/i.test(f.name) || /<\/(p|div|h\d)>/i.test(v)) { const d = new DOMParser().parseFromString(v, 'text/html'); d.querySelectorAll('script,style').forEach(x => x.remove()); d.querySelectorAll('h1,h2,h3,h4,p,li,br,div').forEach(x => x.insertAdjacentText('afterend', '\n')); v = d.body.textContent; } SRC.value = v.replace(/\n{3,}/g, '\n\n').trim().slice(0, 200000); SRC.dispatchEvent(new Event('input')); render(); }
        if (k === 'paste') { try { SRC.value = await navigator.clipboard.readText(); SRC.dispatchEvent(new Event('input')); render(); } catch { E.toast(tr('Pega con Ctrl+V en el cuadro de texto')); SRC.focus(); } }
        if (k === 'clear') { SRC.value = ''; SRC.dispatchEvent(new Event('input')); render(); }
        if (k === 'copysum') K.ui.copy(V.__sum || '');
        if (k === 'savesum') { if (E.addNote) { E.addNote(tr('Resumen') + ' · ' + K.fmt.date(now()), V.__sum || ''); E.toast(tr('Guardado en Notas')); } else await U.saveBlob('resumen.txt', new Blob([V.__sum || '']), 'documents'); }
        if (k === 'saveout') { const md = (V.__out || []).map(o => '## ' + o.h + '\n' + o.pts.map(p => '- ' + p).join('\n')).join('\n\n'); await U.saveBlob('esquema-' + new Date().toISOString().slice(0, 10) + '.md', new Blob([md], { type: 'text/markdown' }), 'documents'); }
        if (k === 'newquiz') { const all = cloze(txt(), 40); quiz = all.sort(() => Math.random() - .5).slice(0, 10); render(); }
        if (k === 'check') { let ok = 0; quiz.forEach((x, i) => { const inp = q(V, `[data-qa="${i}"]`), r = q(V, `[data-qr="${i}"]`); const good = K.norm(inp.value.trim()) === K.norm(x.a); if (good) ok++; inp.classList.toggle('p11-good', good); inp.classList.toggle('p11-bad', !good); r.textContent = good ? '✓' : '→ ' + x.a; }); q(V, '[data-score]').textContent = tr('Aciertos') + ': ' + ok + ' / ' + quiz.length; P.sound && P.sound(ok === quiz.length ? 'ok' : 'note'); }
        if (k === 'flash') { const decks = S.get('flash', null) || []; decks.push({ id: E.uid(), name: tr('Estudio') + ' · ' + K.fmt.date(now()), cards: quiz.map(x => ({ q: x.q, a: x.a, box: 0 })) }); S.set('flash', decks); E.notify(tr('Tarjetas creadas'), quiz.length + ' ' + tr('tarjetas en Tarjetas de estudio'), '🗂️'); if (appOf('flashcards')) E.launch('flashcards'); }
        if (k === 'speak') speak(0);
        if (k === 'stop') { speaking = false; if (window.speechSynthesis) speechSynthesis.cancel(); qa(V, '[data-sn]').forEach(x => x.classList.remove('on')); }
        if (k === 'planrem') { (V.__plan || []).forEach(([d, w]) => P.reminders.add(w, +d)); E.notify(tr('Plan de repaso creado'), (V.__plan || []).length + ' ' + tr('recordatorios'), '📅'); }
        if (k === 'examgo') { const min = Math.max(1, Math.min(600, +q(V, '[data-emin]').value || 60)); examRun(min, q(V, '[data-ewarn]').checked); }
      });
      if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { if (tab === 'voice') render(); };
      render();
    },
    onClose() { if (window.speechSynthesis) speechSynthesis.cancel(); }
  });
  P.study = { summarize, keywords, readability, outline, cloze, sentences };

  /* ============================== Automatización ============================== */
  K.define('automate', {
    init(b) {
      const R = P.rules;
      const TPL = [['download', 'sortdl', '', '', 'Al descargar → organizar por tipo'], ['pad', 'open', 'tvlauncher', '', 'Al conectar un mando → Lanzador TV'], ['offline', 'notify', 'Sin conexión: las apps sin Internet siguen funcionando', '', 'Sin conexión → avisar'], ['battery', 'lowpower', '', '', 'Batería baja → bajo consumo'], ['hour', 'dnd', '', '22:00', 'A las 22:00 → No molestar'], ['boot', 'snapshot', '', '', 'Al iniciar → punto de restauración']];
      b.innerHTML = `<div class="p11-app"><header class="p11-apph"><div class="p11-brand"><span class="p11-logo" style="background:#8f531a">⚡</span><div><b>${esc(tr('Automatización'))}</b><small>${esc(tr('Reglas que reaccionan a lo que pasa y recordatorios'))}</small></div></div></header><main class="p11-main p11-grid2"><section class="k9-card"><h3 class="p11-h3">${esc(tr('Nueva regla'))}</h3><form class="p11-col" data-rf><label class="k9-field">${esc(tr('Si…'))}<select class="input-text" name="on">${Object.entries(R.TRIG).map(([k, l]) => `<option value="${k}">${esc(tr(l))}</option>`).join('')}</select></label><label class="k9-field" data-condl>${esc(tr('Condición (opcional)'))}<input class="input-text" name="cond" maxlength="60" placeholder="${esc(tr('nombre de app, tipo de archivo u hora HH:MM'))}"></label><label class="k9-field">${esc(tr('Entonces…'))}<select class="input-text" name="act">${Object.entries(R.ACT).map(([k, a]) => `<option value="${k}">${esc(tr(a[0]))}</option>`).join('')}</select></label><label class="k9-field" data-argl>${esc(tr('Dato'))}<input class="input-text" name="arg" maxlength="200" list="p11-applist" placeholder="${esc(tr('texto del aviso o id de la app'))}"><datalist id="p11-applist">${E.installedApps().slice(0, 300).map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</datalist></label><button class="k9-btn pri">${esc(tr('Crear regla'))}</button></form><h3 class="p11-h3">${esc(tr('Plantillas'))}</h3><div class="ac9-chips">${TPL.map((t, i) => `<button data-tpl="${i}">${esc(tr(t[4]))}</button>`).join('')}</div></section>
        <section class="k9-card"><h3 class="p11-h3">${esc(tr('Mis reglas'))}</h3><div data-rules></div><h3 class="p11-h3">${esc(tr('Últimas ejecuciones'))}</h3><div data-log class="k9-small"></div></section>
        <section class="k9-card"><h3 class="p11-h3">⏰ ${esc(tr('Recordatorios'))}</h3><form class="p11-col" data-remf><input class="input-text" name="t" maxlength="200" placeholder="${esc(tr('Ej.: mañana a las 5 de la tarde estudiar física · en 20 minutos sacar la ropa'))}" required><small class="k9-muted" data-prev></small><button class="k9-btn pri">${esc(tr('Crear recordatorio'))}</button></form><div data-rems></div></section></main></div>`;
      const draw = () => {
        const l = R.list(); q(b, '[data-rules]').innerHTML = l.length ? l.map(r => `<div class="k9-li"><input type="checkbox" class="k9-switch" data-rt="${esc(r.id)}" ${r.enabled ? 'checked' : ''} aria-label="${esc(tr('Activa'))}"><div class="t"><b>${esc(tr(R.TRIG[r.on]))}${r.cond ? ' (' + esc(r.cond) + ')' : ''} → ${esc(tr(R.ACT[r.act][0]))}${r.arg ? ': ' + esc(r.arg) : ''}</b><small>${r.runs} ${esc(tr('ejecuciones'))}${r.last ? ' · ' + esc(K.fmt.rel(r.last)) : ''}</small></div><button class="k9-btn" data-rrun="${esc(r.id)}">▶</button><button class="k9-btn" data-rdel="${esc(r.id)}" aria-label="${esc(tr('Eliminar'))}">✕</button></div>`).join('') : `<p class="k9-small k9-muted">${esc(tr('Aún no hay reglas. Usa una plantilla para empezar.'))}</p>`;
        q(b, '[data-log]').innerHTML = R.log().slice(0, 12).map(x => `<div>${esc(K.fmt.dt(x.t))} · ${esc(tr(R.TRIG[x.on] || x.on))} → ${esc(tr((R.ACT[x.act] || [x.act])[0]))}</div>`).join('') || esc(tr('Sin ejecuciones todavía.'));
        const rm = P.reminders.list().sort((a, c) => a.at - c.at); q(b, '[data-rems]').innerHTML = rm.length ? rm.map(r => `<div class="k9-li"><span>${r.done ? '✅' : '⏰'}</span><div class="t"><b>${esc(r.what)}</b><small>${esc(K.fmt.dt(r.at))} · ${esc(K.fmt.rel(r.at))}</small></div><button class="k9-btn" data-remdel="${esc(r.id)}" aria-label="${esc(tr('Eliminar'))}">✕</button></div>`).join('') : `<p class="k9-small k9-muted">${esc(tr('Escribe como hablas: «el lunes a las 8 examen de mate».'))}</p>`;
      };
      const offs = [K.on('prime:rules', draw), K.on('prime:reminders', draw)];
      b.addEventListener('input', e => { if (e.target.matches('[data-remf] [name="t"]')) { const w = P.parseWhen(e.target.value); q(b, '[data-prev]').textContent = w ? '→ ' + K.fmt.dt(w.at) + ' · ' + w.what : tr('Añade cuándo: «mañana a las 9», «en 2 horas», «el viernes»…'); } });
      b.addEventListener('submit', e => {
        e.preventDefault(); const f = e.target;
        if (f.matches('[data-rf]')) { if (f.act.value === 'open' && !appOf(f.arg.value)) return E.toast(tr('Escribe el id de una app (aparece en la lista)')); if (f.on.value === 'hour' && !/^\d{2}:\d{2}$/.test(f.cond.value.trim())) return E.toast(tr('Para «a una hora», escribe la hora como HH:MM en la condición')); R.add({ on: f.on.value, act: f.act.value, arg: f.arg.value, cond: f.cond.value.trim() }); f.reset(); E.toast('⚡ ' + tr('Regla creada')); draw(); }
        if (f.matches('[data-remf]')) { const w = P.parseWhen(f.t.value); if (!w) return E.toast(tr('No entendí la fecha. Ej.: «mañana a las 5»')); P.reminders.add(w.what, +w.at); f.reset(); q(b, '[data-prev]').textContent = ''; E.toast('⏰ ' + K.fmt.dt(w.at)); draw(); }
      });
      b.addEventListener('change', e => { const t = e.target.closest('[data-rt]'); if (t) { R.toggle(t.dataset.rt); draw(); } });
      b.addEventListener('click', async e => {
        const t = e.target;
        const tp = t.closest('[data-tpl]'); if (tp) { const x = TPL[+tp.dataset.tpl]; R.add({ on: x[0], act: x[1], arg: x[2], cond: x[3] }); E.toast('⚡ ' + tr(x[4])); draw(); return; }
        const rr = t.closest('[data-rrun]'); if (rr) { const r = R.list().find(x => x.id === rr.dataset.rrun); if (r) { try { await R.ACT[r.act][1](r.arg, null); E.toast('▶ ' + tr(R.ACT[r.act][0])); } catch (er) { E.toast(er.message); } } return; }
        const rd = t.closest('[data-rdel]'); if (rd) { R.remove(rd.dataset.rdel); draw(); return; }
        const md = t.closest('[data-remdel]'); if (md) { P.reminders.remove(md.dataset.remdel); draw(); }
      });
      b.__p11off = () => offs.forEach(f => f());
      draw();
    }
  });
})();

/* EISENKU OS 9.0 · Apps de Internet: Descargas, Marcadores, Historial, Pestañas, Privacidad, Correo, Chat y Videollamadas */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)];
  const get = (k, d) => S.get('a9_' + k, d), put = (k, v) => S.set('a9_' + k, v);
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  const fav = u => document.documentElement.classList.contains('data-saver') ? '<span class="a9-fav" aria-hidden="true">🌐</span>' : `<img class="a9-fav" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(u))}&sz=32" alt="" loading="lazy" referrerpolicy="no-referrer">`;
  const B = () => E.eb;
  const openExt = u => { const a = document.createElement('a'); a.href = u; if (/^https?:/i.test(u)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } document.body.appendChild(a); a.click(); a.remove(); };

  /* ===================== Descargas ===================== */
  K.define('downloads', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-bar"><input class="input-text" data-q placeholder="${esc(tr('Buscar descargas…'))}" style="width:240px"><span class="sp"></span><button class="k9-btn" data-a="folder">${I('folder', 15)} ${esc(tr('Abrir carpeta Descargas'))}</button><button class="k9-btn" data-a="url">${I('link', 15)} ${esc(tr('Descargar URL'))}</button><button class="k9-btn dng" data-a="clear">${I('trash', 15)} ${esc(tr('Limpiar lista'))}</button></div><div class="k9-body" data-l></div></div>`;
      const draw = async () => {
        const f = K.norm(q(b, '[data-q]').value), log = S.get('os9_downloads', []) || [];
        let files = []; try { files = await K.files.all(); } catch { files = []; }
        const byId = new Map(files.map(x => [x.id, x]));
        const known = new Set(log.map(x => x.id));
        const legacy = files.filter(x => (x.folder || '').startsWith('downloads') && !known.has(x.id)).map(x => ({ id: x.id, name: x.name, size: x.size, at: x.date, src: '', legacy: true }));
        const all = log.concat(legacy).filter(x => !f || K.norm(x.name + ' ' + (x.src || '')).includes(f)).sort((a, c) => c.at - a.at);
        q(b, '[data-l]').innerHTML = all.length ? `<div class="k9-card" style="padding:4px 8px">${all.map((x, i) => { const ex = x.id && byId.has(x.id); return `<div class="k9-li"><span style="font-size:22px">${/\.pdf$/i.test(x.name) ? '📕' : /\.(png|jpe?g|gif|webp|svg)$/i.test(x.name) ? '🖼️' : /\.(mp3|wav|ogg|m4a)$/i.test(x.name) ? '🎵' : /\.(mp4|webm)$/i.test(x.name) ? '🎬' : '📄'}</span><div class="t"><b>${esc(x.name)}</b><small>${esc(K.fmt.bytes(x.size || 0))} · ${esc(K.fmt.dt(x.at))}${x.src ? ' · ' + esc(host(x.src)) : x.app ? ' · ' + esc((E.REG[x.app] || {}).name || x.app) : ''}${ex ? '' : ' · ' + esc(tr('eliminado de Archivos'))}</small></div>${ex ? `<button class="k9-btn" data-open="${esc(x.id)}">${esc(tr('Abrir'))}</button><button class="k9-btn" data-dev="${esc(x.id)}" title="${esc(tr('Guardar en el dispositivo'))}">${I('download', 14)}</button>` : ''}${x.src ? `<button class="k9-btn" data-again="${i}" title="${esc(tr('Descargar de nuevo'))}">${I('refresh', 14)}</button>` : ''}<button class="k9-btn" data-rm="${i}" title="${esc(tr('Quitar de la lista'))}">✕</button></div>`; }).join('')}</div>` : `<div class="k9-state">${I('download', 40)}<p>${esc(tr('Aún no hay descargas. Lo que descargues desde el navegador o las apps aparecerá aquí.'))}</p></div>`;
        b._all = all;
      };
      b.addEventListener('click', async e => {
        const t = e.target, all = b._all || [];
        const o = t.closest('[data-open]'); if (o) { K.files.open(o.dataset.open); return; }
        const d = t.closest('[data-dev]'); if (d) { const f = await K.files.get(d.dataset.dev); if (f) { const a = document.createElement('a'); a.__eisen = true; a.href = URL.createObjectURL(f.blob); a.download = f.name; document.body.appendChild(a); HTMLAnchorElement.prototype.click.call(a); a.remove(); } return; }
        const ag = t.closest('[data-again]'); if (ag) { E.importFromUrl(all[+ag.dataset.again].src, 'downloads'); return; }
        const rm = t.closest('[data-rm]'); if (rm) { const x = all[+rm.dataset.rm]; S.set('os9_downloads', (S.get('os9_downloads', []) || []).filter(y => !(y.at === x.at && y.name === x.name))); draw(); return; }
        const a = t.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'folder') E.filesOpenFolder('downloads');
        if (a.dataset.a === 'url') { const u = await K.ui.prompt(tr('Descargar desde una URL'), 'URL', 'https://'); if (u && /^https?:\/\//i.test(u)) E.importFromUrl(u, 'downloads'); }
        if (a.dataset.a === 'clear' && await E.confirm(tr('Limpiar lista'), tr('Solo se borra el registro; los archivos siguen en Archivos.'))) { S.set('os9_downloads', []); draw(); }
      });
      q(b, '[data-q]').addEventListener('input', draw);
      (this._off || []).forEach(f => f()); this._off = [K.on('downloads', draw), K.on('files', draw)];
      draw(); this.onOpen = draw;
    },
    destroy() { (this._off || []).forEach(f => f()); this._off = []; }
  });

  /* ===================== Marcadores ===================== */
  K.define('bookmarks', {
    init(b) {
      let folder = '*';
      const marks = () => (S.get('browser_bookmarks', []) || []).filter(x => x && x.u), save = l => S.set('browser_bookmarks', l.slice(0, 2000));
      b.innerHTML = `<div class="k9"><div class="k9-bar"><input class="input-text" data-q placeholder="${esc(tr('Buscar marcadores…'))}" style="width:220px"><span class="sp"></span><button class="k9-btn pri" data-a="add">${I('plus', 15)} ${esc(tr('Añadir'))}</button><button class="k9-btn" data-a="newf">${I('folder', 15)} ${esc(tr('Carpeta'))}</button><button class="k9-btn" data-a="openall">${I('external', 15)} ${esc(tr('Abrir todos'))}</button><button class="k9-btn" data-a="import">${I('upload', 15)} ${esc(tr('Importar HTML'))}</button><button class="k9-btn" data-a="export">${I('download', 15)} ${esc(tr('Exportar HTML'))}</button></div><div class="k9-split"><aside class="k9-side" data-f></aside><main class="k9-main k9-body" data-l></main></div></div>`;
      const folders = () => [...new Set(marks().map(x => x.f || '').filter(Boolean).concat(S.get('a9_bmfolders', []) || []))].sort();
      const visible = () => { const f = K.norm(q(b, '[data-q]').value); return marks().map((x, i) => Object.assign({ i }, x)).filter(x => (folder === '*' || (x.f || '') === folder) && (!f || K.norm(x.t + ' ' + x.u).includes(f))); };
      function draw() {
        q(b, '[data-f]').innerHTML = `<h6>${esc(tr('Carpetas'))}</h6><button class="k9-item${folder === '*' ? ' on' : ''}" data-fd="*">${I('bookmark', 15)} ${esc(tr('Todos'))} <small class="k9-muted" style="margin-left:auto">${marks().length}</small></button><button class="k9-item${folder === '' ? ' on' : ''}" data-fd="">${I('list', 15)} ${esc(tr('Sin carpeta'))}</button>` + folders().map(f => `<button class="k9-item${folder === f ? ' on' : ''}" data-fd="${esc(f)}">${I('folder', 15)} ${esc(f)}</button>`).join('');
        const l = visible();
        q(b, '[data-l]').innerHTML = l.length ? `<div class="k9-card" style="padding:4px 8px">${l.map(x => `<div class="k9-li">${fav(x.u)}<div class="t"><b>${esc(x.t || host(x.u))}</b><small>${esc(x.u)}</small></div>${x.f ? `<span class="k9-badge">${esc(x.f)}</span>` : ''}<button class="k9-btn" data-go="${x.i}">${esc(tr('Abrir'))}</button><button class="k9-btn" data-ed="${x.i}">${I('edit', 14)}</button><button class="k9-btn dng" data-del="${x.i}">${I('trash', 14)}</button></div>`).join('')}</div>` : `<div class="k9-state">${I('bookmark', 40)}<p>${esc(tr('Sin marcadores aquí. En el navegador pulsa ☆ o Ctrl+D para guardar una página.'))}</p></div>`;
      }
      async function edit(i) {
        const l = marks(), x = i == null ? { u: 'https://', t: '', f: folder !== '*' ? folder : '' } : l[i];
        const r = await E.form({ title: i == null ? tr('Nuevo marcador') : tr('Editar marcador'), fields: [{ k: 't', label: tr('Nombre'), value: x.t }, { k: 'u', label: 'URL', value: x.u, req: true }, { k: 'f', label: tr('Carpeta'), type: 'select', options: [['', tr('Sin carpeta')]].concat(folders().map(f => [f, f])), value: x.f || '' }], ok: tr('Guardar') });
        if (!r) return; if (!/^https?:\/\/[^\s]+$/i.test(r.u.trim())) return E.toast(tr('La URL debe empezar por https://'));
        const o = { u: r.u.trim().slice(0, 2000), t: (r.t.trim() || host(r.u)).slice(0, 200), f: r.f };
        if (i == null) l.unshift(o); else l[i] = o; save(l); draw();
      }
      b.addEventListener('click', async e => {
        const t = e.target;
        const fd = t.closest('[data-fd]'); if (fd) { folder = fd.dataset.fd; draw(); return; }
        const go = t.closest('[data-go]'); if (go) { E.ebOpenUrl(marks()[+go.dataset.go].u, true); return; }
        const ed = t.closest('[data-ed]'); if (ed) { edit(+ed.dataset.ed); return; }
        const del = t.closest('[data-del]'); if (del) { const l = marks(); l.splice(+del.dataset.del, 1); save(l); draw(); return; }
        const a = t.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'add') edit(null);
        if (a.dataset.a === 'newf') { const n = await K.ui.prompt(tr('Nueva carpeta'), tr('Nombre'), ''); if (n && n.trim()) { const fs = S.get('a9_bmfolders', []) || []; fs.push(n.trim().slice(0, 40)); S.set('a9_bmfolders', [...new Set(fs)]); folder = n.trim().slice(0, 40); draw(); } }
        if (a.dataset.a === 'openall') { const l = visible().slice(0, 12); if (l.length > 5 && !await E.confirm(tr('Abrir todos'), l.length + ' ' + tr('pestañas'))) return; l.forEach(x => E.ebOpenUrl(x.u, true)); }
        if (a.dataset.a === 'export') { const l = marks(), byF = {}; l.forEach(x => (byF[x.f || ''] = byF[x.f || ''] || []).push(x)); const item = x => `<DT><A HREF="${esc(x.u)}">${esc(x.t)}</A>`; const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>EISENKU OS</H1>\n<DL><p>\n${(byF[''] || []).map(item).join('\n')}\n${Object.entries(byF).filter(([k]) => k).map(([k, v]) => `<DT><H3>${esc(k)}</H3>\n<DL><p>\n${v.map(item).join('\n')}\n</DL><p>`).join('\n')}\n</DL><p>\n`; E.download('marcadores_eisenku.html', new Blob([html], { type: 'text/html' })); }
        if (a.dataset.a === 'import') { const [f] = await K.ui.pickFile('.html,.htm'); if (!f) return; const d = new DOMParser().parseFromString(await f.text(), 'text/html'); const l = marks(); let n = 0; d.querySelectorAll('a[href]').forEach(x => { const u = x.getAttribute('href'); if (!/^https?:\/\//i.test(u) || l.some(y => y.u === u)) return; let fo = ''; const dl = x.closest('dl'); const h3 = dl && dl.previousElementSibling && dl.previousElementSibling.tagName === 'DT' ? dl.previousElementSibling.querySelector('h3') : (dl && dl.parentElement && dl.parentElement.querySelector(':scope > h3')); if (h3) fo = h3.textContent.trim().slice(0, 40); l.push({ u: u.slice(0, 2000), t: (x.textContent.trim() || host(u)).slice(0, 200), f: fo }); n++; }); save(l); draw(); E.toast(n + ' ' + tr('marcadores importados')); }
      });
      q(b, '[data-q]').addEventListener('input', draw);
      draw(); this.onOpen = draw;
    }
  });

  /* ===================== Historial ===================== */
  K.define('history', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-bar"><input class="input-text" data-q placeholder="${esc(tr('Buscar en el historial…'))}" style="width:240px"><span class="sp"></span><select class="input-text" data-range><option value="3600000">${esc(tr('Última hora'))}</option><option value="86400000">${esc(tr('Últimas 24 horas'))}</option><option value="604800000">${esc(tr('Últimos 7 días'))}</option><option value="all">${esc(tr('Todo'))}</option></select><button class="k9-btn dng" data-a="clear">${I('trash', 15)} ${esc(tr('Borrar intervalo'))}</button></div><div class="k9-split" style="grid-template-columns:1fr 260px"><main class="k9-main k9-body" data-l></main><aside class="k9-side" style="border-right:0;border-left:1px solid var(--e9-line)" data-top></aside></div></div>`;
      const H = () => S.get('browser_history', []) || [];
      function draw() {
        const f = K.norm(q(b, '[data-q]').value), h = H(), days = {};
        h.forEach((x, i) => { if (f && !K.norm(x.t + ' ' + x.u).includes(f)) return; const k = new Date(x.d).toDateString(); (days[k] = days[k] || []).push(Object.assign({ i }, x)); });
        q(b, '[data-l]').innerHTML = Object.keys(days).length ? Object.entries(days).map(([d, l]) => `<h4 class="a9-day">${esc(new Date(d).toLocaleDateString(K.locale, { weekday: 'long', day: 'numeric', month: 'long' }))}</h4><div class="k9-card" style="padding:2px 8px">${l.map(x => `<div class="k9-li"><small class="k9-muted" style="width:46px">${esc(K.fmt.time(x.d))}</small>${fav(x.u)}<div class="t"><b>${esc(x.t)}</b><small>${esc(x.u)}</small></div><button class="k9-btn" data-go="${x.i}">${esc(tr('Abrir'))}</button><button class="k9-btn" data-del="${x.i}">✕</button></div>`).join('')}</div>`).join('') : `<div class="k9-state">${I('history', 40)}<p>${esc(tr('El historial está vacío. La navegación privada no se guarda.'))}</p></div>`;
        const cnt = {}; h.forEach(x => { const k = host(x.u); cnt[k] = (cnt[k] || 0) + 1; });
        q(b, '[data-top]').innerHTML = `<h6>${esc(tr('Sitios más visitados'))}</h6>` + Object.entries(cnt).sort((a, c) => c[1] - a[1]).slice(0, 12).map(([k, n]) => `<button class="k9-item" data-site="${esc(k)}">${fav('https://' + k)} <span style="flex:1;overflow:hidden;text-overflow:ellipsis">${esc(k)}</span><small class="k9-muted">${n}</small></button>`).join('');
      }
      b.addEventListener('click', async e => {
        const t = e.target;
        const go = t.closest('[data-go]'); if (go) { E.ebOpenUrl(H()[+go.dataset.go].u, true); return; }
        const del = t.closest('[data-del]'); if (del) { const h = H(); h.splice(+del.dataset.del, 1); S.set('browser_history', h); draw(); return; }
        const st = t.closest('[data-site]'); if (st) { q(b, '[data-q]').value = st.dataset.site; draw(); return; }
        if (t.closest('[data-a="clear"]')) { const r = q(b, '[data-range]').value; if (!await E.confirm(tr('Borrar historial'), tr('Se borrarán las entradas del intervalo elegido.'))) return; S.set('browser_history', r === 'all' ? [] : H().filter(x => Date.now() - x.d > +r)); K.seclog('privacy', 'Historial del navegador borrado (' + (r === 'all' ? 'todo' : Math.round(+r / 3600000) + ' h') + ')'); draw(); }
      });
      q(b, '[data-q]').addEventListener('input', draw);
      draw(); this.onOpen = draw;
    }
  });

  /* ===================== Administrador de pestañas ===================== */
  K.define('tabsmgr', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-bar"><button class="k9-btn pri" data-a="save">${I('save', 15)} ${esc(tr('Guardar sesión actual'))}</button><button class="k9-btn" data-a="reopen">${I('refresh', 15)} ${esc(tr('Reabrir pestaña cerrada'))}</button><span class="sp"></span><button class="k9-btn" data-a="open">${I('globe', 15)} ${esc(tr('Abrir navegador'))}</button></div><div class="k9-body" data-l></div></div>`;
      const sessions = () => S.get('os9_tabsessions', []) || [];
      function draw() {
        const eb = B(); if (eb && !eb.state.ready) eb.init();
        const st = eb ? eb.state : { sessions: {} };
        const open = Object.entries(st.sessions).map(([sid, s]) => `<div class="k9-card"><h4>${esc(eb.browsers[sid].icon)} ${esc(eb.browsers[sid].name)} <span class="k9-badge">${s.tabs.length}</span>${sid === st.cur ? `<span class="k9-badge g">${esc(tr('activo'))}</span>` : ''}</h4>${s.tabs.map(t => `<div class="k9-li">${/^https?:/.test(t.url) ? fav(t.url) : '<span>🏠</span>'}<div class="t"><b>${esc(eb.title(t))}</b><small>${esc(t.url)}</small></div>${t.id === s.active ? `<span class="k9-badge">${esc(tr('visible'))}</span>` : ''}<button class="k9-btn" data-act="${sid}|${t.id}">${esc(tr('Ir'))}</button><button class="k9-btn" data-cls="${sid}|${t.id}">✕</button></div>`).join('')}</div>`).join('');
        const saved = sessions(), closed = S.get('os9_closedtabs', []) || [];
        q(b, '[data-l]').innerHTML = `<h3 class="a9-h">${esc(tr('Pestañas abiertas'))}</h3>${open}<h3 class="a9-h">${esc(tr('Sesiones guardadas'))}</h3>${saved.length ? `<div class="k9-card" style="padding:4px 8px">${saved.map((x, i) => `<div class="k9-li"><div class="t"><b>${esc(x.name)}</b><small>${x.tabs.length} ${esc(tr('pestañas'))} · ${esc(K.fmt.dt(x.at))}</small></div><button class="k9-btn pri" data-restore="${i}">${esc(tr('Restaurar'))}</button><button class="k9-btn dng" data-delsess="${i}">✕</button></div>`).join('')}</div>` : `<p class="k9-muted k9-small">${esc(tr('Guarda la sesión actual para recuperarla después con todas sus pestañas.'))}</p>`}<h3 class="a9-h">${esc(tr('Cerradas recientemente'))}</h3>${closed.length ? `<div class="k9-card" style="padding:4px 8px">${closed.map((x, i) => `<div class="k9-li">${fav(x.u)}<div class="t"><b>${esc(x.t)}</b><small>${esc(x.u)} · ${esc(K.fmt.rel(x.d))}</small></div><button class="k9-btn" data-reo="${i}">${esc(tr('Reabrir'))}</button></div>`).join('')}</div>` : `<p class="k9-muted k9-small">${esc(tr('Nada por aquí.'))}</p>`}`;
      }
      b.addEventListener('click', async e => {
        const t = e.target, eb = B();
        const ac = t.closest('[data-act]'); if (ac) { const [sid, id] = ac.dataset.act.split('|'); E.launch('browser'); if (sid !== eb.state.cur) eb.switchTo(sid); const tab = eb.state.sessions[sid].tabs.find(x => x.id === id); if (tab) eb.activate(tab); return; }
        const cl = t.closest('[data-cls]'); if (cl) { const [sid, id] = cl.dataset.cls.split('|'); const prev = eb.state.cur; if (sid !== prev) eb.state.cur = sid; eb.close(id); if (sid !== prev) { eb.state.cur = prev; eb.render(); } draw(); return; }
        const rs = t.closest('[data-restore]'); if (rs) { const x = sessions()[+rs.dataset.restore]; x.tabs.forEach(tb => E.ebOpenUrl(tb.u, true)); return; }
        const ds = t.closest('[data-delsess]'); if (ds) { const l = sessions(); l.splice(+ds.dataset.delsess, 1); S.set('os9_tabsessions', l); draw(); return; }
        const ro = t.closest('[data-reo]'); if (ro) { const l = S.get('os9_closedtabs', []) || []; const x = l.splice(+ro.dataset.reo, 1)[0]; S.set('os9_closedtabs', l); if (x) E.ebOpenUrl(x.u, true); draw(); return; }
        const a = t.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'open') E.launch('browser');
        if (a.dataset.a === 'reopen') { K.ebReopen && K.ebReopen(); setTimeout(draw, 200); }
        if (a.dataset.a === 'save') { const tabs = []; Object.entries(eb.state.sessions).forEach(([sid, s]) => { if (sid === 'priv') return; s.tabs.forEach(tb => { if (/^https?:/.test(tb.url)) tabs.push({ u: tb.url, t: eb.title(tb), s: sid }); }); }); if (!tabs.length) return E.toast(tr('No hay páginas abiertas para guardar')); const n = await K.ui.prompt(tr('Guardar sesión'), tr('Nombre'), tr('Sesión') + ' ' + K.fmt.dt(Date.now())); if (!n) return; const l = sessions(); l.unshift({ name: n.slice(0, 60), at: Date.now(), tabs }); S.set('os9_tabsessions', l.slice(0, 20)); draw(); }
      });
      draw(); this.onOpen = draw;
    }
  });

  /* ===================== Centro de privacidad ===================== */
  K.define('privacy', {
    init(b) {
      const CATS = [['browser_history', 'Historial del navegador', 'history'], ['eb_store', 'Datos guardados por sitios', 'globe'], ['site_mode', 'Reglas de carga por sitio', 'settings'], ['os9_siteperms', 'Permisos de sitios', 'shield'], ['os9_downloads', 'Registro de descargas', 'download'], ['os9_activity', 'Historial de actividad', 'pulse'], ['notif_log', 'Notificaciones', 'bell'], ['recent_apps', 'Apps recientes', 'clock'], ['dom_chat', 'Conversaciones con Domingo', 'sparkle'], ['tr_hist', 'Historial del traductor', 'globe'], ['calc_hist', 'Historial de la calculadora', 'calc'], ['os9_closedtabs', 'Pestañas cerradas', 'layers'], ['a9_chat', 'Mensajes del chat', 'chat']];
      b.innerHTML = `<div class="k9"><div class="k9-tabs"><button class="on" data-tab="data">${esc(tr('Mis datos'))}</button><button data-tab="act">${esc(tr('Historial de actividad'))}</button><button data-tab="perm">${esc(tr('Permisos'))}</button><button data-tab="info">${esc(tr('Cómo protege EISENKU tu privacidad'))}</button></div><div class="k9-body" data-v></div></div>`;
      let tab = 'data';
      const size = k => (localStorage.getItem('eisen_' + k) || '').length * 2;
      const count = k => { const v = S.get(k, null); return Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0; };
      function draw() {
        qa(b, '[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
        const V = q(b, '[data-v]');
        if (tab === 'data') V.innerHTML = `<div class="k9-card"><h4>${I('shield', 16)} ${esc(tr('Datos de privacidad guardados en este dispositivo'))}</h4>${CATS.map(([k, l, i]) => `<div class="k9-li">${I(i, 16)}<div class="t"><b>${esc(tr(l))}</b><small>${count(k)} ${esc(tr('elementos'))} · ${esc(K.fmt.bytes(size(k)))}</small></div><button class="k9-btn" data-clr="${k}" ${count(k) ? '' : 'disabled'}>${esc(tr('Borrar'))}</button></div>`).join('')}<div class="k9-row" style="margin-top:10px"><button class="k9-btn dng" data-a="all">${I('trash', 14)} ${esc(tr('Borrar todo lo anterior'))}</button><button class="k9-btn" data-a="export">${I('download', 14)} ${esc(tr('Exportar todos mis datos'))}</button></div></div>`;
        if (tab === 'act') { const l = S.get('os9_activity', []) || []; const types = [...new Set(l.map(x => x.type))]; V.innerHTML = `<div class="k9-row" style="margin-bottom:8px"><label class="k9-row k9-small"><input type="checkbox" class="k9-switch" data-actlog ${K.pref('activity') !== false ? 'checked' : ''}> ${esc(tr('Registrar actividad'))}</label><select class="input-text" data-type><option value="">${esc(tr('Todos los tipos'))}</option>${types.map(t => `<option>${esc(t)}</option>`).join('')}</select></div><div class="k9-card" style="padding:4px 8px" data-actl></div>`; drawAct(); }
        if (tab === 'perm') { const d = K.perms.decisions(); const apps = Object.keys(E.REG).filter(id => K.perms.declared(id).length); V.innerHTML = `<div class="k9-card"><h4>${I('key', 16)} ${esc(tr('Apps con permisos sensibles'))}</h4>${apps.map(id => { const ps = K.perms.declared(id).filter(p => (K.PERMS[p] || {}).risk >= 3); if (!ps.length) return ''; return `<div class="k9-li">${E.tile(E.REG[id], 26)}<div class="t"><b>${esc(E.REG[id].name)}</b><small>${ps.map(p => `${K.perms.has(id, p) ? '✓' : '✕'} ${esc(tr(K.PERMS[p].n))}`).join(' · ')}</small></div></div>`; }).join('')}<button class="k9-btn" data-a="permmgr" style="margin-top:8px">${I('settings', 14)} ${esc(tr('Abrir Administrador de permisos'))}</button></div><div class="k9-card"><h4>${I('globe', 16)} ${esc(tr('Sitios con permisos'))}</h4>${Object.entries(S.get('os9_siteperms', {}) || {}).map(([h, l]) => `<div class="k9-li"><div class="t"><b>${esc(h)}</b><small>${esc(l.join(', '))}</small></div></div>`).join('') || `<p class="k9-small k9-muted">${esc(tr('Ninguno'))}</p>`}</div>`; void d; }
        if (tab === 'info') V.innerHTML = `<div class="k9-card md-view">${K.md(tr('privacy_doc') !== 'privacy_doc' ? tr('privacy_doc') : `## Lo que EISENKU guarda\n\nTodo se guarda **solo en este navegador** (localStorage e IndexedDB): ajustes, archivos, notas, historial del navegador, bóveda de contraseñas cifrada, etc. EISENKU OS no tiene cuentas en la nube, no envía estadísticas y no incluye rastreadores.\n\n## Cuándo se conecta a Internet\n\n- Cuando navegas o usas apps que lo necesitan: Clima, Mapas, Traductor, Enciclopedia, Noticias, Atlas, Videollamadas.\n- El **proxy** del navegador (si lo usas) hace las peticiones desde tu servidor (INICIAR.bat, Netlify o Cloudflare): ese servidor ve las direcciones visitadas.\n- La **IA de Domingo** envía tus preguntas al proveedor configurado por el administrador del servidor, o a Puter.js si lo eliges.\n\n## Aislamiento\n\nLas páginas cargadas por el proxy y las apps de terceros se ejecutan aisladas (sandbox): no pueden leer tus datos de EISENKU.\n\n## Tus derechos\n\nPuedes **exportar** todos tus datos (Configuración › Copias de seguridad) y **borrarlos** cuando quieras (aquí o en Configuración › Sistema › Restablecer).`).html}</div>`;
      }
      function drawAct() { const ty = (q(b, '[data-type]') || {}).value || ''; const l = (S.get('os9_activity', []) || []).filter(x => !ty || x.type === ty).slice(0, 300); const el = q(b, '[data-actl]'); if (el) el.innerHTML = l.map(x => `<div class="k9-li"><small class="k9-muted" style="width:120px">${esc(K.fmt.dt(x.t))}</small><span class="k9-badge">${esc(x.type)}</span><div class="t"><b style="font-weight:500">${esc(x.label)}</b></div></div>`).join('') || `<p class="k9-muted k9-small" style="padding:8px">${esc(tr('Sin actividad registrada.'))}</p>`; }
      b.addEventListener('click', async e => {
        const t = e.target;
        const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; draw(); return; }
        const c = t.closest('[data-clr]'); if (c) { const v = S.get(c.dataset.clr, null); S.set(c.dataset.clr, Array.isArray(v) ? [] : {}); K.seclog('privacy', 'Borrado: ' + c.dataset.clr); draw(); return; }
        const a = t.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'all' && await E.confirm(tr('Borrar datos de privacidad'), tr('Se borrarán historiales, registros y datos de sitios. Tus archivos, notas y ajustes no se tocan.'))) { CATS.forEach(([k]) => { const v = S.get(k, null); if (v != null) S.set(k, Array.isArray(v) ? [] : {}); }); K.seclog('privacy', 'Borrado completo de datos de privacidad'); draw(); }
        if (a.dataset.a === 'export') { const r = await K.backup.create({ files: true }); E.download(r.name, r.blob); }
        if (a.dataset.a === 'permmgr') E.launch('permissions');
      });
      b.addEventListener('change', e => { if (e.target.matches('[data-type]')) drawAct(); if (e.target.matches('[data-actlog]')) K.pref('activity', e.target.checked); });
      draw(); this.onOpen = draw;
    }
  });

  /* ===================== Correo ===================== */
  K.define('mail', {
    init(b) {
      const data = Object.assign({ drafts: [], sent: [], tpl: [{ n: tr('Entrega de tarea'), s: tr('Entrega: '), t: tr('Hola,\n\nAdjunto mi trabajo.\n\nSaludos.') }] }, get('mail', {}));
      const contacts = () => get('contacts', []) || [];
      const save = () => put('mail', data);
      let view = 'compose', cur = null;
      b.innerHTML = `<div class="k9"><div class="k9-split" style="grid-template-columns:190px 1fr"><aside class="k9-side" data-nav></aside><main class="k9-main" data-m></main></div></div>`;
      function nav() { q(b, '[data-nav]').innerHTML = [['compose', 'Redactar', 'edit'], ['drafts', 'Borradores', 'file'], ['sent', 'Enviados', 'right'], ['contacts', 'Contactos', 'user'], ['webmail', 'Bandeja (webmail)', 'mail']].map(([k, l, i]) => `<button class="k9-item${view === k ? ' on' : ''}" data-v="${k}">${I(i, 15)} ${esc(tr(l))}${k === 'drafts' && data.drafts.length ? `<small style="margin-left:auto">${data.drafts.length}</small>` : ''}</button>`).join('') + `<p class="k9-small k9-muted" style="padding:10px 8px">${esc(tr('EISENKU no accede a tu buzón: envía con tu app de correo o tu webmail. Una bandeja integrada necesitaría una integración autorizada (OAuth/IMAP) en un servidor.'))}</p>`; }
      function draw() {
        nav(); const M = q(b, '[data-m]');
        if (view === 'compose') { const d = cur || { to: '', cc: '', s: '', t: '' }; M.innerHTML = `<form class="k9-body k9-col" data-f><datalist id="a9-contacts">${contacts().map(c => `<option value="${esc(c.email)}">${esc(c.name)}</option>`).join('')}</datalist><label class="k9-field">${esc(tr('Para'))}<input class="input-text" name="to" list="a9-contacts" value="${esc(d.to)}" placeholder="persona@ejemplo.com" required></label><label class="k9-field">CC<input class="input-text" name="cc" value="${esc(d.cc)}"></label><label class="k9-field">${esc(tr('Asunto'))}<input class="input-text" name="s" value="${esc(d.s)}"></label><label class="k9-field" style="flex:1">${esc(tr('Mensaje'))}<textarea class="input-text" name="t" rows="12" style="resize:vertical">${esc(d.t)}</textarea></label><div class="k9-row"><button class="k9-btn pri" data-send="mailto">${I('mail', 14)} ${esc(tr('Enviar con mi app de correo'))}</button><button class="k9-btn" data-send="gmail">Gmail ↗</button><button class="k9-btn" data-send="outlook">Outlook ↗</button><span class="sp"></span><select class="input-text" data-tpl><option value="">${esc(tr('Plantillas…'))}</option>${data.tpl.map((x, i) => `<option value="${i}">${esc(x.n)}</option>`).join('')}</select><button type="button" class="k9-btn" data-a="draft">${I('save', 14)} ${esc(tr('Guardar borrador'))}</button><button type="button" class="k9-btn" data-a="savetpl">${esc(tr('Guardar como plantilla'))}</button></div><p class="k9-small k9-muted">${esc(tr('Los adjuntos se añaden en tu app de correo. Los mensajes largos pueden recortarse en algunos clientes (límite de mailto).'))}</p></form>`; }
        if (view === 'drafts' || view === 'sent') { const l = data[view]; M.innerHTML = `<div class="k9-body">${l.length ? `<div class="k9-card" style="padding:4px 8px">${l.map((x, i) => `<div class="k9-li"><div class="t"><b>${esc(x.s || tr('(sin asunto)'))}</b><small>${esc(tr('Para'))}: ${esc(x.to)} · ${esc(K.fmt.dt(x.at))}${x.via ? ' · ' + esc(x.via) : ''}</small></div><button class="k9-btn" data-load="${view}|${i}">${esc(view === 'drafts' ? tr('Editar') : tr('Reenviar'))}</button><button class="k9-btn" data-del="${view}|${i}">✕</button></div>`).join('')}</div>` : `<div class="k9-state">${I('mail', 36)}<p>${esc(tr('Vacío'))}</p></div>`}</div>`; }
        if (view === 'contacts') { M.innerHTML = `<div class="k9-body"><form class="k9-row" data-cf style="margin-bottom:10px"><input class="input-text" name="n" placeholder="${esc(tr('Nombre'))}" required><input class="input-text" name="e" type="email" placeholder="correo@ejemplo.com" required><button class="k9-btn pri">${I('plus', 14)} ${esc(tr('Añadir'))}</button></form><div class="k9-card" style="padding:4px 8px">${contacts().map((c, i) => `<div class="k9-li"><span class="a9-pw-av">${esc((c.name || '?')[0].toUpperCase())}</span><div class="t"><b>${esc(c.name)}</b><small>${esc(c.email)}</small></div><button class="k9-btn" data-write="${i}">${I('mail', 14)}</button><button class="k9-btn" data-cdel="${i}">✕</button></div>`).join('') || `<p class="k9-muted k9-small" style="padding:8px">${esc(tr('Sin contactos'))}</p>`}</div></div>`; }
        if (view === 'webmail') { M.innerHTML = `<div class="k9-body"><div class="k9-grid" style="--min:220px">${[['Gmail', 'https://mail.google.com', 'mail.google.com'], ['Outlook', 'https://outlook.live.com/mail/', 'outlook.live.com'], ['Proton Mail', 'https://mail.proton.me', 'mail.proton.me'], ['Yahoo Mail', 'https://mail.yahoo.com', 'mail.yahoo.com']].map(([n, u]) => `<button class="k9-card a9-wm" data-ext="${esc(u)}">${fav(u)}<b>${esc(n)}</b><small class="k9-muted">${esc(tr('Se abre en una pestaña real (los inicios de sesión no funcionan dentro de otra página)'))}</small></button>`).join('')}</div></div>`; }
      }
      const read = () => { const f = q(b, '[data-f]'); return f ? { to: f.to.value.trim(), cc: f.cc.value.trim(), s: f.s.value.trim(), t: f.t.value } : null; };
      const valid = to => to.split(/[,;]\s*/).every(x => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(x));
      b.addEventListener('click', async e => {
        const t = e.target;
        const v = t.closest('[data-v]'); if (v) { if (view === 'compose') cur = read(); view = v.dataset.v; draw(); return; }
        const sd = t.closest('[data-send]'); if (sd) { e.preventDefault(); const d = read(); if (!d.to || !valid(d.to)) return E.toast(tr('Revisa las direcciones de correo')); const enc = encodeURIComponent; const via = sd.dataset.send; const url = via === 'gmail' ? `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(d.to)}&cc=${enc(d.cc)}&su=${enc(d.s)}&body=${enc(d.t)}` : via === 'outlook' ? `https://outlook.live.com/mail/0/deeplink/compose?to=${enc(d.to)}&cc=${enc(d.cc)}&subject=${enc(d.s)}&body=${enc(d.t)}` : `mailto:${d.to.split(/[,;]\s*/).map(enc).join(',')}?${d.cc ? 'cc=' + enc(d.cc) + '&' : ''}subject=${enc(d.s)}&body=${enc(d.t)}`; openExt(url); data.sent.unshift(Object.assign({ at: Date.now(), via }, d)); data.sent = data.sent.slice(0, 200); save(); cur = null; E.toast(tr('Mensaje enviado a') + ' ' + ({ mailto: tr('tu app de correo'), gmail: 'Gmail', outlook: 'Outlook' })[via]); K.activity('mail', 'mail', d.s); view = 'sent'; draw(); return; }
        const a = t.closest('[data-a]'); if (a) { const d = read(); if (a.dataset.a === 'draft') { data.drafts.unshift(Object.assign({ at: Date.now() }, d)); save(); E.toast(tr('Borrador guardado')); } if (a.dataset.a === 'savetpl') { const n = await K.ui.prompt(tr('Nombre de la plantilla'), tr('Nombre'), d.s || tr('Plantilla')); if (n) { data.tpl.push({ n: n.slice(0, 40), s: d.s, t: d.t }); save(); draw(); } } return; }
        const ld = t.closest('[data-load]'); if (ld) { const [k, i] = ld.dataset.load.split('|'); cur = Object.assign({}, data[k][+i]); if (k === 'drafts') data.drafts.splice(+i, 1); save(); view = 'compose'; draw(); return; }
        const dl = t.closest('[data-del]'); if (dl) { const [k, i] = dl.dataset.del.split('|'); data[k].splice(+i, 1); save(); draw(); return; }
        const w = t.closest('[data-write]'); if (w) { cur = { to: contacts()[+w.dataset.write].email, cc: '', s: '', t: '' }; view = 'compose'; draw(); return; }
        const cd = t.closest('[data-cdel]'); if (cd) { const l = contacts(); l.splice(+cd.dataset.cdel, 1); put('contacts', l); draw(); return; }
        const x = t.closest('[data-ext]'); if (x) { openExt(x.dataset.ext); }
      });
      b.addEventListener('change', e => { if (e.target.matches('[data-tpl]') && e.target.value !== '') { const tp = data.tpl[+e.target.value], f = q(b, '[data-f]'); f.s.value = tp.s; f.t.value = tp.t; } });
      b.addEventListener('submit', e => { e.preventDefault(); if (e.target.matches('[data-cf]')) { const f = e.target; const l = contacts(); l.push({ name: f.n.value.trim().slice(0, 60), email: f.e.value.trim().slice(0, 120) }); put('contacts', l.sort((a, c) => a.name.localeCompare(c.name))); draw(); } });
      draw();
    }
  });

  /* ===================== Chat (local y P2P WebRTC) ===================== */
  K.define('chat', (() => {
    let bc = null, pc = null, dc = null, root = null;
    const me = () => (K.profiles.current().name || 'Eisen');
    const hist = () => get('chat', []) || [];
    const add = (m) => { const l = hist(); l.push(m); put('chat', l.slice(-300)); render(); };
    const zip = async s => { if (!K.caps.compression) return 'P' + btoa(unescape(encodeURIComponent(s))); const z = await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer(); return 'Z' + btoa(String.fromCharCode(...new Uint8Array(z))); };
    const unzip = async c => { c = c.trim(); if (c[0] === 'P') return decodeURIComponent(escape(atob(c.slice(1)))); const u = Uint8Array.from(atob(c.slice(1)), x => x.charCodeAt(0)); return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text(); };
    const gather = p => new Promise(res => { if (p.iceGatheringState === 'complete') return res(); const t = setTimeout(res, 4000); p.addEventListener('icegatheringstatechange', () => { if (p.iceGatheringState === 'complete') { clearTimeout(t); res(); } }); });
    const newPc = () => { const p = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }); p.onconnectionstatechange = () => setStatus(p.connectionState); return p; };
    const wire = ch => { dc = ch; ch.onopen = () => { setStatus('connected'); add({ sys: 1, t: tr('Conexión directa establecida (cifrada con DTLS).'), d: Date.now() }); }; ch.onmessage = e => { try { const m = JSON.parse(e.data); add({ who: String(m.who).slice(0, 40), t: String(m.t).slice(0, 4000), d: Date.now(), via: 'p2p' }); E.notify(String(m.who).slice(0, 40), String(m.t).slice(0, 120), '💬'); } catch { /* ignorar */ } }; ch.onclose = () => setStatus('closed'); };
    let status = 'local';
    function setStatus(s) { status = s; const el = root && root.querySelector('[data-st]'); if (el) el.innerHTML = s === 'connected' ? `<span class="k9-dot g"></span> ${esc(tr('Conectado directamente'))}` : s === 'local' ? `<span class="k9-dot g"></span> ${esc(tr('Sala local (pestañas de este dispositivo)'))}` : `<span class="k9-dot w"></span> ${esc(tr('Estado'))}: ${esc(s)}`; }
    function render() { if (!root) return; const L = root.querySelector('[data-log]'); L.innerHTML = hist().map(m => m.sys ? `<div class="a9-chat-sys">${esc(m.t)}</div>` : `<div class="a9-msg${m.who === me() && m.mine ? ' me' : ''}"><b>${esc(m.who)}</b><p>${esc(m.t)}</p><small>${esc(K.fmt.time(m.d))}${m.via === 'p2p' ? ' · P2P' : ''}</small></div>`).join('') || `<div class="k9-state">${I('chat', 36)}<p>${esc(tr('Escribe un mensaje. En la sala local lo verán otras pestañas de EISENKU en este dispositivo; para hablar con otro dispositivo crea una invitación P2P.'))}</p></div>`; L.scrollTop = L.scrollHeight; }
    function send(text) { const m = { who: me(), t: text, d: Date.now(), mine: true }; add(m); if (bc) bc.postMessage({ who: m.who, t: text }); if (dc && dc.readyState === 'open') dc.send(JSON.stringify({ who: m.who, t: text })); }
    return {
      init(b) {
        root = b;
        b.innerHTML = `<div class="k9"><div class="k9-bar"><span data-st class="k9-small"></span><span class="sp"></span><button class="k9-btn" data-a="invite">${I('link', 15)} ${esc(tr('Crear invitación P2P'))}</button><button class="k9-btn" data-a="join">${I('plus', 15)} ${esc(tr('Unirme con un código'))}</button><button class="k9-btn" data-a="clear">${I('trash', 15)}</button></div><div class="a9-chat-log" data-log></div><form class="k9-bar a9-chat-in" data-f style="border-top:1px solid var(--e9-line);border-bottom:0"><input class="input-text" name="m" placeholder="${esc(tr('Escribe un mensaje…'))}" autocomplete="off" style="flex:1"><button class="k9-btn pri">${I('right', 15)}</button></form></div>`;
        if ('BroadcastChannel' in window) { bc = new BroadcastChannel('eisenku-chat'); bc.onmessage = e => { const m = e.data || {}; add({ who: String(m.who).slice(0, 40), t: String(m.t).slice(0, 4000), d: Date.now(), via: 'local' }); }; }
        setStatus('local'); render();
        b.addEventListener('submit', e => { e.preventDefault(); const i = e.target.m; const v = i.value.trim(); if (v) { send(v); i.value = ''; } });
        b.addEventListener('click', async e => {
          const a = e.target.closest('[data-a]'); if (!a) return;
          if (!('RTCPeerConnection' in window) && a.dataset.a !== 'clear') return K.ui.alert(tr('No disponible'), tr('Este navegador no admite WebRTC.'));
          if (a.dataset.a === 'clear') { put('chat', []); render(); }
          if (a.dataset.a === 'invite') {
            try { pc && pc.close(); pc = newPc(); wire(pc.createDataChannel('chat')); await pc.setLocalDescription(await pc.createOffer()); await gather(pc); const code = await zip(JSON.stringify(pc.localDescription));
              const r = await E.form({ title: tr('Invitación P2P'), html: `<p class="k9-small">${esc(tr('1. Envía este código a la otra persona (por mensaje o correo). 2. Ella pulsa “Unirme con un código” y te devuelve su código de respuesta. 3. Pégalo abajo.'))}</p><textarea class="input-text k9-mono" rows="4" readonly style="width:100%;font-size:11px">${esc(code)}</textarea>`, fields: [{ k: 'ans', label: tr('Código de respuesta'), type: 'textarea', rows: 3 }], ok: tr('Conectar') });
              K.ui.copy(code);
              if (r && r.ans.trim()) { await pc.setRemoteDescription(JSON.parse(await unzip(r.ans))); setStatus('connecting'); }
            } catch (er) { K.ui.alert(tr('No se pudo crear la conexión'), er.message); }
          }
          if (a.dataset.a === 'join') {
            const r = await E.form({ title: tr('Unirme a un chat P2P'), fields: [{ k: 'off', label: tr('Código de invitación'), type: 'textarea', rows: 4 }], ok: tr('Generar respuesta') }); if (!r || !r.off.trim()) return;
            try { pc && pc.close(); pc = newPc(); pc.ondatachannel = ev => wire(ev.channel); await pc.setRemoteDescription(JSON.parse(await unzip(r.off))); await pc.setLocalDescription(await pc.createAnswer()); await gather(pc); const code = await zip(JSON.stringify(pc.localDescription)); K.ui.copy(code); await K.ui.alert(tr('Envía este código de respuesta'), code + '\n\n' + tr('(ya está copiado al portapapeles)')); setStatus('connecting'); }
            catch (er) { K.ui.alert(tr('Código no válido'), er.message); }
          }
        });
      },
      onClose() { }, destroy() { if (bc) bc.close(); if (pc) pc.close(); bc = pc = dc = null; }
    };
  })());

  /* ===================== Videollamadas (Jitsi Meet) ===================== */
  K.define('meet', (() => {
    let test = null;
    const stopTest = () => { if (test) { test.getTracks().forEach(t => t.stop()); test = null; } };
    const WORDS = ['jade', 'rosa', 'noir', 'aurora', 'kumo', 'eisen', 'orbita', 'cometa', 'faro', 'nube', 'delta', 'prisma', 'sol', 'luna', 'atlas', 'nexo'];
    const roomName = () => { const r = new Uint32Array(4); crypto.getRandomValues(r); return 'EISENKU-' + WORDS[r[0] % WORDS.length] + '-' + WORDS[r[1] % WORDS.length] + '-' + (r[2] % 9000 + 1000); };
    return {
      init(b) {
        const st = Object.assign({ server: 'https://meet.jit.si', recent: [] }, get('meet', {}));
        b.innerHTML = `<div class="k9"><div class="k9-body" data-home><div class="k9-card"><h4>${I('video', 16)} ${esc(tr('Nueva videollamada'))}</h4><div class="k9-row"><input class="input-text" data-room style="flex:1" value="${esc(roomName())}" aria-label="${esc(tr('Nombre de la sala'))}"><button class="k9-btn" data-a="regen" title="${esc(tr('Generar otro nombre'))}">${I('refresh', 14)}</button></div><div class="k9-row" style="margin-top:8px"><input class="input-text" data-name value="${esc(K.profiles.current().name || '')}" placeholder="${esc(tr('Tu nombre'))}" style="width:220px"><button class="k9-btn pri" data-a="here">${I('video', 14)} ${esc(tr('Unirme aquí'))}</button><button class="k9-btn" data-a="tab">${I('external', 14)} ${esc(tr('Abrir en pestaña real'))}</button><button class="k9-btn" data-a="copy">${I('copy', 14)} ${esc(tr('Copiar invitación'))}</button></div><p class="k9-small k9-muted" style="margin-top:8px">${esc(tr('Servicio externo: Jitsi Meet (código abierto, sin cuenta para invitados). meet.jit.si puede pedir al anfitrión iniciar sesión para abrir la sala. Puedes usar otro servidor Jitsi.'))}</p><div class="k9-row"><label class="k9-small k9-row">${esc(tr('Servidor Jitsi'))} <input class="input-text" data-server value="${esc(st.server)}" style="width:240px"></label></div></div>
          <div class="k9-card"><h4>${I('camera', 16)} ${esc(tr('Prueba de cámara y micrófono'))}</h4><div class="k9-row"><video data-prev playsinline muted style="width:220px;height:124px;background:#000;border-radius:8px;object-fit:cover"></video><div class="k9-col" style="flex:1"><div class="k9-meter" style="width:100%"><i data-lvl style="width:0"></i></div><div class="k9-row"><button class="k9-btn" data-a="test">${esc(tr('Probar'))}</button><button class="k9-btn" data-a="stoptest">${esc(tr('Detener'))}</button></div></div></div></div>
          <div class="k9-card"><h4>${I('history', 16)} ${esc(tr('Salas recientes'))}</h4><div data-recent></div></div></div><div data-call hidden style="flex:1;display:flex;flex-direction:column"><div class="k9-bar"><b data-callname></b><span class="sp"></span><button class="k9-btn dng" data-a="leave">${esc(tr('Salir de la llamada'))}</button></div><iframe data-frame allow="camera; microphone; display-capture; fullscreen; autoplay; clipboard-write" style="flex:1;border:0;background:#000" title="Jitsi Meet"></iframe></div></div>`;
        const save = () => put('meet', st);
        const room = () => q(b, '[data-room]').value.trim().replace(/[^\w-]/g, '-').slice(0, 80) || roomName();
        const server = () => { const s = q(b, '[data-server]').value.trim().replace(/\/$/, ''); return /^https:\/\/[\w.-]+$/.test(s) ? s : 'https://meet.jit.si'; };
        const url = () => `${server()}/${encodeURIComponent(room())}#userInfo.displayName=${encodeURIComponent(JSON.stringify(q(b, '[data-name]').value.trim().slice(0, 40)))}&config.prejoinConfig.enabled=true`;
        const recent = () => { q(b, '[data-recent]').innerHTML = st.recent.map(r => `<div class="k9-li"><div class="t"><b>${esc(r.r)}</b><small>${esc(K.fmt.dt(r.d))} · ${esc(host(r.s))}</small></div><button class="k9-btn" data-join="${esc(r.r)}">${esc(tr('Unirme'))}</button></div>`).join('') || `<p class="k9-small k9-muted">${esc(tr('Sin salas recientes'))}</p>`; };
        const remember = () => { st.server = server(); st.recent = [{ r: room(), s: st.server, d: Date.now() }].concat(st.recent.filter(x => x.r !== room())).slice(0, 10); save(); recent(); };
        b.addEventListener('click', async e => {
          const j = e.target.closest('[data-join]'); if (j) { q(b, '[data-room]').value = j.dataset.join; return; }
          const a = e.target.closest('[data-a]'); if (!a) return;
          if (a.dataset.a === 'regen') q(b, '[data-room]').value = roomName();
          if (a.dataset.a === 'copy') K.ui.copy(`${tr('Únete a mi videollamada')}: ${server()}/${encodeURIComponent(room())}`);
          if (a.dataset.a === 'tab') { remember(); openExt(url()); }
          if (a.dataset.a === 'here') { if (!K.perms.has('meet', 'camera') || !K.perms.has('meet', 'microphone')) return K.ui.alert(tr('Permiso revocado'), tr('Concede cámara y micrófono a Videollamadas en el Administrador de permisos.')); stopTest(); remember(); q(b, '[data-home]').hidden = true; const c = q(b, '[data-call]'); c.hidden = false; q(b, '[data-callname]').textContent = room(); q(b, '[data-frame]').src = url(); K.activity('meet', 'meet', room()); }
          if (a.dataset.a === 'leave') { q(b, '[data-frame]').src = 'about:blank'; q(b, '[data-call]').hidden = true; q(b, '[data-home]').hidden = false; }
          if (a.dataset.a === 'test') { try { stopTest(); test = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); const v = q(b, '[data-prev]'); v.srcObject = test; v.play(); const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser(); ac.createMediaStreamSource(test).connect(an); const arr = new Uint8Array(an.fftSize); const loop = () => { if (!test) { ac.close(); return; } an.getByteTimeDomainData(arr); let m = 0; for (const x of arr) m = Math.max(m, Math.abs(x - 128)); q(b, '[data-lvl]').style.width = Math.min(100, m / 128 * 180) + '%'; requestAnimationFrame(loop); }; loop(); } catch (er) { K.ui.alert(tr('Sin acceso'), (er && er.message) || tr('No se pudo usar la cámara o el micrófono.')); } }
          if (a.dataset.a === 'stoptest') stopTest();
        });
        recent();
      },
      onClose: stopTest, destroy: stopTest
    };
  })());
})();

/* =====================================================================
   EISENKU OS 10.0 · Apps del sistema (carga diferida)
   Núcleo del sistema, Monitor de recursos, Visor de eventos, Servicios, Administrador de inicio,
   Programador de tareas, Administrador de compatibilidad, Centro de actividad, Centro de
   recuperación, Comprobador de integridad; pruebas del sistema (Diagnóstico) y análisis de
   almacenamiento (Monitor de almacenamiento).
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, U = K.u10, F = K.files;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)];
  const appName = id => ((E.REG[id] || E.apps().find(a => a.id === id) || {}).name || id);
  const badge = (txt, cls = '') => `<span class="k9-badge ${cls}">${esc(tr(txt))}</span>`;
  const LV = { info: ['Información', ''], ok: ['Correcto', 'g'], warn: ['Aviso', 'w'], error: ['Error', 'd'] };
  const shell = (tabs, cur) => `<div class="k9">${U.tabs(tabs, cur)}<div class="k9-body" data-v></div></div>`;
  const tabber = (b, draw) => b.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (!t) return; qa(b, '[data-tab]').forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t); }); draw(t.dataset.tab); });
  const libs = () => Promise.all([K.hash ? 0 : K.loadScript('js/os10/lib/hash10.js')]);

  /* ===================== Núcleo del sistema ===================== */
  K.define('syscore', {
    init(b) {
      b.innerHTML = shell([['sum', 'Resumen', 'cpu'], ['mods', 'Módulos', 'layers'], ['bus', 'Bus de eventos', 'pulse'], ['apps', 'Aplicaciones', 'grid']], 'sum');
      const V = q(b, '[data-v]'); let tab = 'sum', t = 0;
      const scripts = () => [...document.scripts].filter(s => s.src).map(s => new URL(s.src).pathname.replace(/^\//, '')).concat([...document.querySelectorAll('link[rel=stylesheet]')].map(l => new URL(l.href).pathname.replace(/^\//, '')));
      function draw(tb = tab) {
        tab = tb; clearInterval(t);
        if (tab === 'sum') {
          const up = Date.now() - (K.t0 || Date.now()), svc = K.services.list(), mem = performance.memory;
          V.innerHTML = `<div class="k9-grid" style="--min:150px">${U.kpi(U.dur(up), 'Tiempo en marcha')}${U.kpi(K.bootMs ? K.bootMs + ' ms' : '—', 'Arranque')}${U.kpi(svc.filter(s => s.state === 'running').length + ' / ' + svc.length, 'Servicios en ejecución')}${U.kpi(Object.keys(K.IMPL).length + ' / ' + Object.keys(K.MANIFESTS).length, 'Apps diferidas cargadas')}${U.kpi(document.querySelectorAll('.window.open').length, 'Ventanas abiertas')}${U.kpi(mem ? K.fmt.bytes(mem.usedJSHeapSize) : '—', 'Memoria JS')}</div>
            <div class="k9-card" style="margin-top:12px"><h4>${I('info', 16)} ${esc(tr('Identidad del sistema'))}</h4>${U.kv([['Sistema', K.label], ['Versión', K.version], ['Edición', K.edition], ['Nombre clave', K.codename], ['Compilación', K.build], ['Esquema de datos', S.get('os9_schema', 0)], ['Perfil', K.profiles.current().name + ' (' + K.profileId + ')'], ['Entorno', document.documentElement.dataset.env], ['Configuración regional', K.locale], ['Modo seguro', K.safeMode ? tr('Sí') : tr('No')], ['Almacenamiento local', K.storageOK ? tr('disponible') : tr('no disponible')], ['Contexto seguro', isSecureContext ? tr('Sí') : tr('No')]])}</div>
            <div class="k9-card"><h4>${I('settings', 16)} ${esc(tr('Acciones'))}</h4><div class="k9-row"><button class="k9-btn" data-a="free">${I('leaf', 14)} ${esc(tr('Liberar memoria de las apps cerradas'))}</button><button class="k9-btn" data-a="restart">${I('refresh', 14)} ${esc(tr('Reiniciar la interfaz'))}</button><button class="k9-btn" data-a="safe">${I('shield', 14)} ${esc(tr('Modo seguro'))}</button><button class="k9-btn" data-a="report">${I('download', 14)} ${esc(tr('Exportar informe'))}</button><button class="k9-btn" data-a="services">${I('puzzle', 14)} ${esc(tr('Servicios'))}</button></div><p class="k9-muted k9-small" style="margin-top:8px">${esc(tr('EISENKU es un sistema de escritorio que se ejecuta dentro del navegador: este núcleo administra sus propios módulos, servicios y eventos, no los del sistema operativo del equipo.'))}</p></div>`;
          t = setInterval(() => { if (!b.isConnected || !b.offsetParent) return; const k = V.querySelector('.k9-kpi b'); if (k) k.textContent = U.dur(Date.now() - K.t0); }, 1000);
        } else if (tab === 'mods') {
          const l = scripts(), lazy = Object.entries(K.MANIFESTS);
          const layer = p => /js\/os10|eisenku10|apps10/.test(p) ? '10.0' : /js\/os9|eisenku9|apps9/.test(p) ? '9.0' : '8.0';
          V.innerHTML = `<div class="k9-card"><h4>${I('layers', 16)} ${esc(tr('Módulos cargados en esta sesión'))} <span class="k9-badge">${l.length}</span></h4><table class="k9-table"><thead><tr><th>${esc(tr('Archivo'))}</th><th>${esc(tr('Capa'))}</th><th>${esc(tr('Tipo'))}</th></tr></thead><tbody>${l.map(p => `<tr><td class="k9-mono">${esc(p)}</td><td>${badge(layer(p), layer(p) === '10.0' ? 'p' : layer(p) === '9.0' ? 'g' : '')}</td><td>${esc(/\.css$/.test(p) ? 'CSS' : 'JavaScript')}</td></tr>`).join('')}</tbody></table></div>
            <div class="k9-card"><h4>${I('box', 16)} ${esc(tr('Apps de carga diferida'))}</h4><table class="k9-table"><thead><tr><th>${esc(tr('App'))}</th><th>${esc(tr('Módulo'))}</th><th>${esc(tr('Estado'))}</th></tr></thead><tbody>${lazy.sort((a, c) => (!!K.IMPL[c[0]] - !!K.IMPL[a[0]]) || a[1].name.localeCompare(c[1].name)).map(([id, m]) => `<tr><td>${esc(m.name)}</td><td class="k9-mono k9-small">${esc(m.src || '')}</td><td>${K.IMPL[id] ? badge('Cargada', 'g') : badge('Sin cargar')}</td></tr>`).join('')}</tbody></table></div>`;
        } else if (tab === 'bus') {
          const render = () => { const e = Object.entries(K.busCount || {}).sort((a, c) => c[1] - a[1]); V.innerHTML = `<div class="k9-card"><h4>${I('pulse', 16)} ${esc(tr('Eventos emitidos por el bus del sistema'))}</h4><p class="k9-small k9-muted" style="margin-bottom:8px">${esc(tr('Cada módulo avisa a los demás mediante eventos (K.emit). Se actualiza cada segundo.'))}</p><table class="k9-table"><thead><tr><th>${esc(tr('Evento'))}</th><th>${esc(tr('Veces'))}</th><th></th></tr></thead><tbody>${e.map(([k, n]) => `<tr><td class="k9-mono">eisen9:${esc(k)}</td><td>${n}</td><td style="width:40%">${U.meter(n / Math.max(1, e[0][1]) * 100, ' ')}</td></tr>`).join('') || `<tr><td colspan="3" class="k9-muted">—</td></tr>`}</tbody></table></div>`; };
          render(); t = setInterval(() => { if (b.offsetParent) render(); }, 1000);
        } else {
          const all = Object.keys(E.REG).filter(id => id !== 'deskfolder'), by = {}; all.forEach(id => { const a = E.REG[id]; const lay = a.v10 ? '10.0' : a.v9 ? '9.0' : '8.0'; const c = a.cat || 'Sistema'; (by[c] = by[c] || { '8.0': 0, '9.0': 0, '10.0': 0 })[lay]++; });
          V.innerHTML = `<div class="k9-grid" style="--min:140px">${U.kpi(all.length, 'Apps integradas')}${U.kpi(all.filter(id => E.isInstalled(id)).length, 'Instaladas')}${U.kpi(all.filter(id => E.REG[id].v10).length, 'Nuevas en 10.0')}${U.kpi((E.GAMES || []).length, 'Juegos')}</div><div class="k9-card" style="margin-top:12px"><table class="k9-table"><thead><tr><th>${esc(tr('Categoría'))}</th><th>8.0</th><th>9.0</th><th>10.0</th></tr></thead><tbody>${Object.entries(by).sort().map(([c, v]) => `<tr><td>${esc(tr(c))}</td><td>${v['8.0']}</td><td>${v['9.0']}</td><td>${v['10.0']}</td></tr>`).join('')}</tbody></table></div>`;
        }
      }
      tabber(b, draw);
      b.addEventListener('click', async e => {
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'restart') location.reload(); if (k === 'safe') location.href = location.pathname + '?safe=1'; if (k === 'services') E.launch('services');
        if (k === 'free') { let n = 0; Object.keys(K.IMPL).forEach(id => { const w = document.getElementById('win-' + id); if (!w || w.classList.contains('open') || !w.__k9) return; try { K.IMPL[id].destroy && K.IMPL[id].destroy(); } catch { /* ignorar */ } const body = w.querySelector('.app-body'); body.replaceWith(body.cloneNode(false)); w.__k9 = null; n++; }); E.toast(n + ' ' + tr('apps liberadas de la memoria')); K.log('info', 'system', 'Memoria liberada: ' + n + ' apps cerradas'); draw(); }
        if (k === 'report') { const rep = { generated: new Date().toISOString(), system: { label: K.label, version: K.version, build: K.build, env: document.documentElement.dataset.env, locale: K.locale, ua: navigator.userAgent }, uptimeMs: Date.now() - K.t0, bootMs: K.bootMs, services: K.services.list().map(s => ({ id: s.id, state: s.state, startType: s.startType, errors: s.errors })), modules: scripts(), lazyLoaded: Object.keys(K.IMPL), bus: K.busCount, errors: (K.errors || []).slice(-30) }; K.ui.download('EISENKU_nucleo_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(rep, null, 2), 'application/json'); }
      });
      draw(); this.onClose = () => clearInterval(t); this.onOpen = () => draw();
    }
  });

  /* ===================== Monitor de recursos ===================== */
  K.define('resmon', (() => {
    let t = 0, stop = null, po = null;
    return {
      init(b) {
        b.innerHTML = `<div class="k9"><div class="k9-bar"><b class="k9-small">${esc(tr('Recursos de EISENKU en este navegador'))}</b><span class="sp"></span><span class="k9-small k9-muted" data-live></span><button class="k9-btn" data-a="pause">${I('target', 14)} ${esc(tr('Pausar'))}</button></div><div class="k9-body"><div class="k9-grid s10-rm-grid" style="--min:230px">${[['fps', 'Fluidez (FPS)', '#34a582'], ['lag', 'Retardo del hilo principal (ms)', '#e8709f'], ['heap', 'Memoria JS (MB)', '#6a9fd8'], ['net', 'Red: datos recibidos (KB/s)', '#d9a03a']].map(([k, l, c]) => `<div class="k9-card"><h4 style="justify-content:space-between">${esc(tr(l))}<b data-n="${k}" style="color:${c}">—</b></h4><canvas data-c="${k}" style="width:100%;height:80px;display:block"></canvas></div>`).join('')}</div>
          <div class="k9-grid" style="--min:140px;margin-top:10px" data-kpis></div>
          <div class="k9-card" style="margin-top:10px"><h4>${I('grid', 16)} ${esc(tr('Recursos por ventana'))}</h4><div data-wins></div></div>
          <div class="k9-card"><h4>${I('zap', 16)} ${esc(tr('Tareas largas recientes (bloquean la interfaz más de 50 ms)'))}</h4><div data-longs class="k9-small"></div></div>
          ${U.note('Mide EISENKU y sus apps dentro del navegador. El uso real de CPU, la memoria física y los procesos del sistema operativo no son accesibles desde una página web.')}</div></div>`;
        const H = { fps: [], lag: [], heap: [], net: [] }, longs = []; let paused = false, lastRes = performance.getEntriesByType('resource').length, lastT = performance.now();
        try { po = new PerformanceObserver(l => l.getEntries().forEach(en => { longs.unshift({ t: Date.now(), d: Math.round(en.duration), n: (en.attribution && en.attribution[0] && (en.attribution[0].containerName || en.attribution[0].name)) || en.name }); if (longs.length > 12) longs.length = 12; })); po.observe({ type: 'longtask', buffered: false }); } catch { po = null; }
        const sample = () => {
          if (paused || !b.isConnected) return; const now = performance.now(), res = performance.getEntriesByType('resource'); let bytes = 0; for (let i = lastRes; i < res.length; i++) bytes += res[i].transferSize || 0; lastRes = res.length;
          const kbps = bytes / 1024 / ((now - lastT) / 1000); lastT = now;
          const v = { fps: K.perf10.fps(), lag: K.perf10.lag(), heap: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : NaN, net: kbps };
          Object.keys(H).forEach(k => { H[k].push(v[k]); if (H[k].length > 120) H[k].shift(); const n = q(b, `[data-n="${k}"]`); n.textContent = Number.isFinite(v[k]) ? (k === 'heap' || k === 'net' ? v[k].toFixed(1) : Math.round(v[k])) : '—'; const col = { fps: '#34a582', lag: '#e8709f', heap: '#6a9fd8', net: '#d9a03a' }[k]; U.chart(q(b, `[data-c="${k}"]`), [{ v: H[k].map(x => Number.isFinite(x) ? x : 0), c: col, fill: col + '22' }], { n: 120, min: 0, max: k === 'fps' ? 70 : undefined }); });
          if (!performance.memory) q(b, '[data-n="heap"]').title = tr('Solo Chromium informa de la memoria JS');
          const lt = K.perf10.longTasks();
          q(b, '[data-kpis]').innerHTML = [[document.getElementsByTagName('*').length, 'Elementos en la página'], [document.querySelectorAll('.window.open').length, 'Ventanas abiertas'], [Object.keys(K.IMPL).length, 'Módulos de apps cargados'], [lt.n, 'Tareas largas (sesión)'], [K.services.list().filter(s => s.state === 'running').length, 'Servicios activos'], [navigator.hardwareConcurrency || '—', 'Núcleos lógicos']].map(([x, l]) => U.kpi(x, l)).join('');
          q(b, '[data-wins]').innerHTML = `<table class="k9-table"><thead><tr><th>${esc(tr('App'))}</th><th>${esc(tr('Estado'))}</th><th>${esc(tr('Elementos'))}</th><th>${esc(tr('Lienzos/vídeos'))}</th><th></th></tr></thead><tbody>${[...document.querySelectorAll('.window.open')].map(w => { const id = w.id.slice(4); const n = w.getElementsByTagName('*').length, media = w.querySelectorAll('canvas,video,audio,iframe').length; return `<tr><td>${E.tile(E.REG[id] || { icon: '◆' }, 20, 'mini')} ${esc(appName(id))}</td><td>${w.classList.contains('minimized') ? badge('Minimizada') : w.classList.contains('active') ? badge('Activa', 'g') : badge('Abierta')}</td><td>${n.toLocaleString()}</td><td>${media}</td><td style="white-space:nowrap"><button class="k9-btn" data-show="${esc(id)}">${esc(tr('Mostrar'))}</button><button class="k9-btn dng" data-end="${esc(id)}">${esc(tr('Finalizar tarea'))}</button></td></tr>`; }).join('')}</tbody></table>`;
          q(b, '[data-longs]').innerHTML = longs.length ? longs.map(x => `<div class="k9-li"><small class="k9-muted" style="width:80px">${esc(K.fmt.time(x.t))}</small><div class="t"><b>${x.d} ms</b><small>${esc(x.n || 'self')}</small></div></div>`).join('') : esc(tr('Ninguna desde que abriste el monitor: la interfaz responde con fluidez.'));
          q(b, '[data-live]').textContent = tr('Actualizado') + ' ' + K.fmt.time(Date.now());
        };
        b.addEventListener('click', e => { const s = e.target.closest('[data-show]'); if (s) E.openWindow(s.dataset.show); const en = e.target.closest('[data-end]'); if (en) { const w = document.getElementById('win-' + en.dataset.end); if (w) { w.querySelector('[data-act="close"]').click(); K.log('warn', 'app', 'Tarea finalizada desde el Monitor de recursos: ' + appName(en.dataset.end)); } } if (e.target.closest('[data-a="pause"]')) { paused = !paused; e.target.closest('[data-a]').classList.toggle('on', paused); } });
        const start = () => { stop = stop || K.perf10.use(); clearInterval(t); t = setInterval(sample, 1000); setTimeout(sample, 300); };
        start(); this.onOpen = start; this.onClose = () => { clearInterval(t); if (stop) { stop(); stop = null; } };
      },
      destroy() { clearInterval(t); if (stop) stop(); stop = null; if (po) po.disconnect(); }
    };
  })());

  /* ===================== Visor de eventos ===================== */
  K.define('eventviewer', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-bar"><select class="input-text" data-f="lvl" aria-label="${esc(tr('Nivel'))}"><option value="">${esc(tr('Todos los niveles'))}</option>${Object.entries(LV).map(([k, v]) => `<option value="${k}">${esc(tr(v[0]))}</option>`).join('')}</select><select class="input-text" data-f="src" aria-label="${esc(tr('Origen'))}"></select><select class="input-text" data-f="when"><option value="0">${esc(tr('Siempre'))}</option><option value="1">${esc(tr('Última hora'))}</option><option value="24">${esc(tr('Últimas 24 horas'))}</option><option value="168">${esc(tr('Últimos 7 días'))}</option></select><input class="input-text" data-f="q" placeholder="${esc(tr('Buscar…'))}" style="flex:1;min-width:120px"><label class="k9-small k9-row"><input type="checkbox" data-f="old"> ${esc(tr('Incluir registros de 9.0'))}</label><span class="sp"></span><button class="k9-btn" data-a="csv">${I('download', 14)} CSV</button><button class="k9-btn" data-a="json">${I('download', 14)} JSON</button><button class="k9-btn dng" data-a="clear">${I('trash', 14)}</button></div><div class="k9-body" style="padding:0" data-v></div><div class="k9-status" data-st></div></div>`;
      const V = q(b, '[data-v]'), f = k => q(b, `[data-f="${k}"]`);
      const all = () => { let l = K.logList(); if (f('old').checked) { l = l.concat(K.seclogList().map(x => ({ t: x.t, l: x.level === 'warn' ? 'warn' : 'info', s: 'security', m: '[' + x.type + '] ' + x.msg })), (K.errors || []).map(x => ({ t: x.t, l: 'error', s: 'javascript', m: x.m, d: x.s })), (S.get('notif_log', []) || []).map(n => ({ t: n.d, l: 'info', s: 'notification', m: n.title + (n.body ? ' — ' + n.body : '') }))); const seen = new Set(); l = l.filter(x => { const k = x.t + x.m; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, c) => c.t - a.t); } return l; };
      let rows = [], sel = -1;
      function draw() {
        const srcs = [...new Set(all().map(x => x.s))].sort(), cs = f('src').value;
        f('src').innerHTML = `<option value="">${esc(tr('Todos los orígenes'))}</option>` + srcs.map(s => `<option${s === cs ? ' selected' : ''}>${esc(s)}</option>`).join('');
        const lv = f('lvl').value, src = f('src').value, h = +f('when').value, nq = K.norm(f('q').value.trim()), lim = h ? Date.now() - h * 3600000 : 0;
        rows = all().filter(x => (!lv || x.l === lv) && (!src || x.s === src) && x.t >= lim && (!nq || K.norm(x.m + ' ' + (x.d || '')).includes(nq)));
        V.innerHTML = rows.length ? `<table class="k9-table s10-ev"><thead><tr><th>${esc(tr('Fecha y hora'))}</th><th>${esc(tr('Nivel'))}</th><th>${esc(tr('Origen'))}</th><th>${esc(tr('Mensaje'))}</th></tr></thead><tbody>${rows.slice(0, 800).map((x, i) => `<tr data-r="${i}" class="${i === sel ? 'sel' : ''}"><td class="k9-small" style="white-space:nowrap">${esc(new Date(x.t).toLocaleString(K.locale))}</td><td>${badge((LV[x.l] || LV.info)[0], (LV[x.l] || LV.info)[1])}</td><td class="k9-mono k9-small">${esc(x.s)}</td><td>${esc(x.m)}${i === sel && x.d ? `<div class="k9-mono k9-small k9-muted" style="margin-top:4px;white-space:pre-wrap">${esc(x.d)}</div>` : ''}</td></tr>`).join('')}</tbody></table>` : `<div class="k9-state">${I('list', 36)}<p>${esc(tr('No hay eventos con estos filtros.'))}</p></div>`;
        const cnt = l => rows.filter(x => x.l === l).length;
        q(b, '[data-st]').innerHTML = `<span>${rows.length} ${esc(tr('eventos'))}</span><span class="k9-ok">${cnt('ok')} ${esc(tr('correctos'))}</span><span style="color:var(--e9-warn)">${cnt('warn')} ${esc(tr('avisos'))}</span><span style="color:var(--e9-danger)">${cnt('error')} ${esc(tr('errores'))}</span>`;
      }
      const deb = U.debounce(draw, 150);
      b.addEventListener('input', e => { if (e.target.matches('[data-f]')) deb(); }); b.addEventListener('change', e => { if (e.target.matches('[data-f]')) draw(); });
      b.addEventListener('click', async e => {
        const r = e.target.closest('[data-r]'); if (r) { sel = +r.dataset.r === sel ? -1 : +r.dataset.r; draw(); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a, stamp = new Date().toISOString().slice(0, 10);
        if (k === 'csv') K.ui.download(`EISENKU_eventos_${stamp}.csv`, '﻿fecha;nivel;origen;mensaje;datos\n' + rows.map(x => [new Date(x.t).toISOString(), x.l, x.s, x.m, x.d || ''].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\n'), 'text/csv');
        if (k === 'json') K.ui.download(`EISENKU_eventos_${stamp}.json`, JSON.stringify(rows, null, 1), 'application/json');
        if (k === 'clear' && await E.confirm(tr('Borrar el registro de eventos'), tr('Se eliminarán todos los eventos guardados del sistema.'))) { K.logClear(); K.log('warn', 'system', 'Registro de eventos borrado por el usuario'); draw(); }
      });
      const off = K.on('log', () => { if (b.offsetParent) deb(); }); draw(); this.onOpen = draw; this.destroy = off;
    }
  });

  /* ===================== Servicios ===================== */
  K.define('services', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-bar"><b class="k9-small">${esc(tr('Servicios internos de EISENKU'))}</b><span class="sp"></span><input class="input-text" data-q placeholder="${esc(tr('Filtrar…'))}" style="width:180px"><button class="k9-btn" data-a="refresh">${I('refresh', 14)}</button></div><div class="k9-body" style="padding:0" data-v></div><div class="k9-status" data-st></div></div>`;
      const V = q(b, '[data-v]'); let open = null;
      const ST = { running: ['En ejecución', 'g'], stopped: ['Detenido', ''], error: ['Error', 'd'] };
      function draw() {
        const nq = K.norm(q(b, '[data-q]').value || ''), l = K.services.list().filter(s => !nq || K.norm(s.name + ' ' + s.desc + ' ' + s.group).includes(nq)).sort((a, c) => a.group.localeCompare(c.group) || a.name.localeCompare(c.name));
        V.innerHTML = `<table class="k9-table"><thead><tr><th>${esc(tr('Servicio'))}</th><th>${esc(tr('Grupo'))}</th><th>${esc(tr('Estado'))}</th><th>${esc(tr('Tipo de inicio'))}</th><th>${esc(tr('Información'))}</th><th></th></tr></thead><tbody>${l.map(s => `<tr data-row="${esc(s.id)}"><td><b>${esc(tr(s.name))}</b>${open === s.id ? `<div class="k9-small k9-muted" style="margin-top:4px;max-width:420px;white-space:normal">${esc(tr(s.desc))}<br>${esc(tr('Iniciado'))}: ${s.starts}× · ${esc(tr('Errores'))}: ${s.errors}${s.since ? ' · ' + esc(tr('desde')) + ' ' + esc(K.fmt.dt(s.since)) : ''}${s.lastError ? '<br><span style="color:var(--e9-danger)">' + esc(s.lastError) + '</span>' : ''}</div>` : ''}</td><td class="k9-small">${esc(tr(s.group))}</td><td>${badge((ST[s.state] || ST.stopped)[0], (ST[s.state] || ST.stopped)[1])}</td><td><select class="input-text" data-type="${esc(s.id)}"><option value="auto"${s.startType === 'auto' ? ' selected' : ''}>${esc(tr('Automático'))}</option><option value="manual"${s.startType === 'manual' ? ' selected' : ''}>${esc(tr('Manual'))}</option>${s.core ? '' : `<option value="disabled"${s.startType === 'disabled' ? ' selected' : ''}>${esc(tr('Deshabilitado'))}</option>`}</select></td><td class="k9-small k9-muted">${esc(s.info || '')}</td><td style="white-space:nowrap">${s.state === 'running' ? `<button class="k9-btn" data-act="stop:${esc(s.id)}">${I('min', 13)} ${esc(tr('Detener'))}</button><button class="k9-btn" data-act="restart:${esc(s.id)}">${I('refresh', 13)}</button>` : `<button class="k9-btn pri" data-act="start:${esc(s.id)}">${I('right', 13)} ${esc(tr('Iniciar'))}</button>`}</td></tr>`).join('')}</tbody></table>`;
        const all = K.services.list(); q(b, '[data-st]').innerHTML = `<span>${all.length} ${esc(tr('servicios'))}</span><span class="k9-ok">${all.filter(s => s.state === 'running').length} ${esc(tr('en ejecución'))}</span><span>${all.filter(s => s.state === 'error').length} ${esc(tr('con error'))}</span>`;
      }
      b.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (a) { const [k, id] = a.dataset.act.split(':'); K.services[k](id); setTimeout(draw, 60); return; } if (e.target.closest('[data-a="refresh"]')) draw(); const r = e.target.closest('[data-row]'); if (r && !e.target.closest('select,button')) { open = open === r.dataset.row ? null : r.dataset.row; draw(); } });
      b.addEventListener('change', e => { const s = e.target.closest('[data-type]'); if (s) { K.services.setStartType(s.dataset.type, s.value); if (s.value === 'auto') K.services.start(s.dataset.type, true); draw(); } });
      b.addEventListener('input', e => { if (e.target.matches('[data-q]')) draw(); });
      const off = K.on('services', () => { if (b.offsetParent) draw(); }); draw(); this.onOpen = draw; this.destroy = off;
    }
  });

  /* ===================== Administrador de inicio ===================== */
  K.define('startup', {
    init(b) {
      b.innerHTML = shell([['apps', 'Apps de inicio', 'zap'], ['svc', 'Servicios', 'puzzle'], ['boot', 'Tiempos de arranque', 'pulse']], 'apps');
      const V = q(b, '[data-v]'); let tab = 'apps';
      const list = () => (S.get('os9_startup', []) || []).filter(id => E.REG[id]);
      function draw(tb = tab) {
        tab = tb;
        if (tab === 'apps') {
          const l = list(), dly = +S.get('os10_startup_delay', 0) || 0, cands = E.installedApps().filter(a => E.REG[a.id] && !l.includes(a.id) && a.id !== 'deskfolder').sort((a, c) => a.name.localeCompare(c.name));
          V.innerHTML = `<div class="k9-card"><h4>${I('zap', 16)} ${esc(tr('Se abren al iniciar sesión, en este orden'))}</h4>${l.map((id, i) => `<div class="k9-li">${E.tile(E.REG[id], 26)}<div class="t"><b>${esc(appName(id))}</b><small>${esc(tr('Se abre a los'))} ${((600 + dly * 1000 + i * 300) / 1000).toFixed(1)} s</small></div><button class="k9-btn" data-up="${i}" ${i ? '' : 'disabled'} aria-label="${esc(tr('Subir'))}">${I('up', 13)}</button><button class="k9-btn" data-down="${i}" ${i < l.length - 1 ? '' : 'disabled'} aria-label="${esc(tr('Bajar'))}">${I('down', 13)}</button><button class="k9-btn dng" data-rm="${esc(id)}">${esc(tr('Quitar'))}</button></div>`).join('') || `<p class="k9-muted k9-small">${esc(tr('Ninguna app se abre al iniciar.'))}</p>`}<div class="k9-row" style="margin-top:10px"><select class="input-text" data-add style="flex:1"><option value="">${esc(tr('Añadir una app…'))}</option>${cands.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select></div></div>
            <div class="k9-card"><h4>${I('clock', 16)} ${esc(tr('Comportamiento al iniciar'))}</h4><div class="k9-row"><label class="k9-field" style="flex:1">${esc(tr('Retardo antes de abrir las apps'))}<select class="input-text" data-delay>${[0, 2, 5, 10, 20, 30].map(s => `<option value="${s}"${s === dly ? ' selected' : ''}>${s} s</option>`).join('')}</select></label><label class="k9-row k9-small" style="flex:1"><input type="checkbox" class="k9-switch" data-restore ${K.pref('restoreLayout') ? 'checked' : ''}> ${esc(tr('Reabrir las ventanas de la última sesión'))}</label></div><p class="k9-muted k9-small" style="margin-top:6px">${esc(tr('El retardo ayuda en equipos lentos: primero aparece el escritorio y después se abren las apps.'))}</p></div>`;
        } else if (tab === 'svc') {
          const l = K.services.list();
          V.innerHTML = `<div class="k9-card"><h4>${I('puzzle', 16)} ${esc(tr('Servicios que arrancan con EISENKU'))}</h4>${l.map(s => `<label class="k9-li" style="cursor:pointer"><div class="t"><b>${esc(tr(s.name))}</b><small>${esc(tr(s.group))} · ${esc(s.state === 'running' ? tr('en ejecución') : tr('detenido'))}</small></div><input type="checkbox" class="k9-switch" data-svcauto="${esc(s.id)}" ${s.startType === 'auto' ? 'checked' : ''} ${s.core ? 'disabled' : ''}></label>`).join('')}<div class="k9-row" style="margin-top:8px"><button class="k9-btn" data-a="services">${I('settings', 14)} ${esc(tr('Abrir Servicios'))}</button></div></div>`;
        } else {
          const nav = performance.getEntriesByType('navigation')[0] || {}, res = performance.getEntriesByType('resource').filter(r => { try { return new URL(r.name).origin === location.origin && /\.(js|css)(\?|$)/.test(r.name); } catch { return false; } }).sort((a, c) => c.duration - a.duration);
          const tot = res.reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0);
          V.innerHTML = `<div class="k9-grid" style="--min:150px">${U.kpi(K.bootMs ? K.bootMs + ' ms' : '—', 'Escritorio listo')}${U.kpi(nav.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd) + ' ms' : '—', 'DOM listo')}${U.kpi(nav.loadEventEnd ? Math.round(nav.loadEventEnd) + ' ms' : '—', 'Carga completa')}${U.kpi(res.length, 'Módulos descargados')}${U.kpi(K.fmt.bytes(tot), 'Transferido (módulos)')}</div><div class="k9-card" style="margin-top:12px"><h4>${I('layers', 16)} ${esc(tr('Módulos por tiempo de descarga'))}</h4><table class="k9-table"><thead><tr><th>${esc(tr('Archivo'))}</th><th>${esc(tr('Tiempo'))}</th><th>${esc(tr('Tamaño'))}</th><th>${esc(tr('Caché'))}</th></tr></thead><tbody>${res.slice(0, 60).map(r => `<tr><td class="k9-mono k9-small">${esc(new URL(r.name).pathname.slice(1))}</td><td>${Math.round(r.duration)} ms</td><td>${esc(K.fmt.bytes(r.encodedBodySize || 0))}</td><td>${r.transferSize === 0 && r.encodedBodySize ? badge('caché', 'g') : badge('red')}</td></tr>`).join('')}</tbody></table><div class="k9-row" style="margin-top:8px"><button class="k9-btn" data-a="reload">${I('refresh', 14)} ${esc(tr('Reiniciar y volver a medir'))}</button></div></div>`;
        }
      }
      tabber(b, draw);
      b.addEventListener('click', e => {
        const l = list(); const up = e.target.closest('[data-up]'), dn = e.target.closest('[data-down]'), rm = e.target.closest('[data-rm]');
        if (up || dn) { const i = +(up || dn).dataset[up ? 'up' : 'down'], j = up ? i - 1 : i + 1; [l[i], l[j]] = [l[j], l[i]]; S.set('os9_startup', l); draw(); }
        if (rm) { S.set('os9_startup', l.filter(x => x !== rm.dataset.rm)); K.log('info', 'startup', 'Quitada del inicio: ' + appName(rm.dataset.rm)); draw(); }
        const a = e.target.closest('[data-a]'); if (a) { if (a.dataset.a === 'services') E.launch('services'); if (a.dataset.a === 'reload') location.reload(); }
      });
      b.addEventListener('change', e => {
        const t = e.target; if (t.matches('[data-add]') && t.value) { S.set('os9_startup', list().concat(t.value)); K.log('info', 'startup', 'Añadida al inicio: ' + appName(t.value)); draw(); }
        if (t.matches('[data-delay]')) { S.set('os10_startup_delay', +t.value); draw(); } if (t.matches('[data-restore]')) K.pref('restoreLayout', t.checked);
        if (t.matches('[data-svcauto]')) { K.services.setStartType(t.dataset.svcauto, t.checked ? 'auto' : 'manual'); }
      });
      draw(); this.onOpen = () => draw();
    }
  });

  /* ===================== Programador de tareas ===================== */
  const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const whenTxt = w => { if (!w) return '—'; if (w.type === 'once') return tr('Una vez') + ': ' + (w.date || '') + ' ' + (w.at || ''); if (w.type === 'daily') return tr('Cada día a las') + ' ' + w.at; if (w.type === 'weekly') return tr('Cada semana') + ' (' + (w.days || []).map(d => DAYS[d - 1]).join(' ') + ') ' + w.at; if (w.type === 'interval') return tr('Cada') + ' ' + w.every + ' min'; return '—'; };
  K.define('scheduler', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-bar"><button class="k9-btn pri" data-a="new">${I('plus', 14)} ${esc(tr('Nueva tarea'))}</button><span class="sp"></span><label class="k9-row k9-small"><input type="checkbox" class="k9-switch" data-svc ${K.services.running('scheduler') ? 'checked' : ''}> ${esc(tr('Programador activo'))}</label></div><div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]');
      function draw() {
        const l = K.sched.list().sort((a, c) => (c.enabled - a.enabled) || (a.next || 9e15) - (c.next || 9e15));
        V.innerHTML = (l.length ? `<table class="k9-table"><thead><tr><th></th><th>${esc(tr('Tarea'))}</th><th>${esc(tr('Cuándo'))}</th><th>${esc(tr('Próxima'))}</th><th>${esc(tr('Último resultado'))}</th><th></th></tr></thead><tbody>${l.map(t => `<tr><td><input type="checkbox" class="k9-switch" data-en="${esc(t.id)}" ${t.enabled ? 'checked' : ''} aria-label="${esc(tr('Activa'))}"></td><td><b>${esc(t.name)}</b><div class="k9-small k9-muted">${esc(tr((K.sched.actions[t.action.type] || {}).n || t.action.type))}${t.action.arg ? ' · ' + esc(String(t.action.arg).slice(0, 40)) : ''}</div></td><td class="k9-small">${esc(whenTxt(t.when))}${t.catchUp ? '<br><small class="k9-muted">' + esc(tr('recupera si estaba cerrado')) + '</small>' : ''}</td><td class="k9-small">${t.enabled && t.next ? esc(K.fmt.dt(t.next)) + '<br><small class="k9-muted">' + esc(K.fmt.rel(t.next)) + '</small>' : '—'}</td><td class="k9-small">${t.lastRun ? `<span style="color:${t.lastOk === false ? 'var(--e9-danger)' : 'inherit'}">${esc(t.lastResult || '')}</span><br><small class="k9-muted">${esc(K.fmt.dt(t.lastRun))} · ${t.runs || 0}×</small>` : '—'}</td><td style="white-space:nowrap"><button class="k9-btn" data-run="${esc(t.id)}" title="${esc(tr('Ejecutar ahora'))}">${I('right', 13)}</button><button class="k9-btn" data-edit="${esc(t.id)}">${I('edit', 13)}</button><button class="k9-btn dng" data-del="${esc(t.id)}">${I('trash', 13)}</button></td></tr>`).join('')}</tbody></table>` : `<div class="k9-state">${I('clock', 40)}<p>${esc(tr('Aún no hay tareas. Crea una para automatizar copias, avisos, limpieza o cambios de tema.'))}</p></div>`) + U.note('Las tareas se ejecutan mientras EISENKU está abierto (puede estar en segundo plano). Si estaba cerrado a la hora prevista, la tarea se omite o se recupera al volver, según elijas.');
      }
      async function edit(t0) {
        const t = t0 ? JSON.parse(JSON.stringify(t0)) : { id: E.uid(), name: '', action: { type: 'notify', arg: '' }, when: { type: 'daily', at: '09:00', days: [1, 2, 3, 4, 5], every: 60, date: new Date().toISOString().slice(0, 10) }, enabled: true, catchUp: false };
        const ov = document.createElement('div'); ov.className = 'eis-modal';
        const apps = E.installedApps().filter(a => E.REG[a.id]).sort((a, c) => a.name.localeCompare(c.name));
        ov.innerHTML = `<form class="eis-modal-card"><h3>${esc(tr(t0 ? 'Editar tarea' : 'Nueva tarea'))}</h3><label class="eis-field"><span>${esc(tr('Nombre'))}</span><input class="input-text" name="name" required value="${esc(t.name)}"></label><label class="eis-field"><span>${esc(tr('Acción'))}</span><select class="input-text" name="type">${Object.entries(K.sched.actions).map(([k, a]) => `<option value="${k}"${k === t.action.type ? ' selected' : ''}>${esc(tr(a.n))}</option>`).join('')}</select></label><label class="eis-field" data-argf><span data-argl></span><input class="input-text" name="arg" value="${esc(t.action.arg || '')}"><select class="input-text" name="app" hidden>${apps.map(a => `<option value="${esc(a.id)}"${a.id === t.action.arg ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label><label class="eis-field"><span>${esc(tr('Repetición'))}</span><select class="input-text" name="wtype"><option value="once">${esc(tr('Una vez'))}</option><option value="daily">${esc(tr('Cada día'))}</option><option value="weekly">${esc(tr('Días de la semana'))}</option><option value="interval">${esc(tr('Cada cierto tiempo'))}</option></select></label><div class="k9-row" data-wd>${DAYS.map((d, i) => `<label class="s10-chip"><input type="checkbox" name="d${i + 1}" ${(t.when.days || []).includes(i + 1) ? 'checked' : ''}> ${d}</label>`).join('')}</div><div class="k9-row"><label class="eis-field" data-wdate style="flex:1"><span>${esc(tr('Fecha'))}</span><input class="input-text" type="date" name="date" value="${esc(t.when.date || '')}"></label><label class="eis-field" data-wat style="flex:1"><span>${esc(tr('Hora'))}</span><input class="input-text" type="time" name="at" value="${esc(t.when.at || '09:00')}"></label><label class="eis-field" data-wev style="flex:1"><span>${esc(tr('Cada (minutos)'))}</span><input class="input-text" type="number" min="1" max="10080" name="every" value="${esc(String(t.when.every || 60))}"></label></div><label class="k9-row k9-small"><input type="checkbox" name="catch" ${t.catchUp ? 'checked' : ''}> ${esc(tr('Si EISENKU estaba cerrado a esa hora, ejecutarla al volver a abrirlo'))}</label><div class="eis-modal-btns"><button type="button" class="btn-secondary" data-x>${esc(tr('Cancelar'))}</button><button class="btn-primary">${esc(tr('Guardar'))}</button></div></form>`;
        document.body.appendChild(ov); const f = ov.querySelector('form'); f.elements.wtype.value = t.when.type;
        const sync = () => { const ty = f.elements.wtype.value, ac = K.sched.actions[f.elements.type.value]; ov.querySelector('[data-wd]').hidden = ty !== 'weekly'; ov.querySelector('[data-wdate]').hidden = ty !== 'once'; ov.querySelector('[data-wat]').hidden = ty === 'interval'; ov.querySelector('[data-wev]').hidden = ty !== 'interval'; const isApp = f.elements.type.value === 'openApp'; ov.querySelector('[data-argf]').hidden = !ac.arg; f.elements.arg.hidden = isApp; f.elements.app.hidden = !isApp; ov.querySelector('[data-argl]').textContent = tr(ac.arg === 'app' ? 'Aplicación' : ac.arg || ''); f.elements.arg.placeholder = ac.arg && ac.arg !== 'app' ? ac.arg : ''; if (!f.elements.name.value) f.elements.name.placeholder = tr(ac.n); };
        f.addEventListener('change', sync); sync(); ov.querySelector('[data-x]').onclick = () => ov.remove();
        f.onsubmit = e => { e.preventDefault(); const ty = f.elements.wtype.value; t.name = f.elements.name.value.trim() || tr(K.sched.actions[f.elements.type.value].n); t.action = { type: f.elements.type.value, arg: f.elements.type.value === 'openApp' ? f.elements.app.value : f.elements.arg.value.trim() }; t.when = { type: ty, at: f.elements.at.value || '09:00', date: f.elements.date.value, every: Math.max(1, +f.elements.every.value || 60), days: DAYS.map((_, i) => i + 1).filter(d => f.elements['d' + d].checked) }; if (ty === 'weekly' && !t.when.days.length) return E.toast(tr('Elige al menos un día')); if (ty === 'once' && !t.when.date) return E.toast(tr('Elige una fecha')); t.catchUp = f.elements.catch.checked; t.enabled = true; if (t0) { t.lastRun = t0.lastRun; t.runs = t0.runs; t.lastResult = t0.lastResult; t.created = t0.created; } else delete t.lastRun; K.sched.save(t); ov.remove(); draw(); };
      }
      b.addEventListener('click', async e => {
        if (e.target.closest('[data-a="new"]')) return edit(null);
        const r = e.target.closest('[data-run]'); if (r) { const x = await K.sched.run(r.dataset.run); E.toast((x && x.ok ? '✓ ' : '✗ ') + (x ? x.res : '')); draw(); return; }
        const ed = e.target.closest('[data-edit]'); if (ed) return edit(K.sched.list().find(t => t.id === ed.dataset.edit));
        const d = e.target.closest('[data-del]'); if (d && await E.confirm(tr('Eliminar tarea'), (K.sched.list().find(t => t.id === d.dataset.del) || {}).name || '')) { K.sched.remove(d.dataset.del); draw(); }
      });
      b.addEventListener('change', e => { const en = e.target.closest('[data-en]'); if (en) { const t = K.sched.list().find(x => x.id === en.dataset.en); if (t) { t.enabled = en.checked; K.sched.save(t); draw(); } } if (e.target.matches('[data-svc]')) { e.target.checked ? K.services.start('scheduler') : K.services.stop('scheduler'); } });
      const off = K.on('sched', () => { if (b.offsetParent) draw(); }); draw(); this.onOpen = draw; this.destroy = off;
    }
  });

  /* ===================== Administrador de compatibilidad ===================== */
  const CAP = {
    camera: ['Cámara', () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)], microphone: ['Micrófono', () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)], screen: ['Captura de pantalla', () => !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)],
    devicefs: ['Carpetas del dispositivo', () => 'showDirectoryPicker' in window], geolocation: ['Ubicación', () => 'geolocation' in navigator], notifications: ['Notificaciones', () => 'Notification' in window], clipboard: ['Portapapeles', () => !!(navigator.clipboard && navigator.clipboard.writeText)],
    files: ['Archivos de EISENKU', () => 'indexedDB' in window], network: ['Internet', () => navigator.onLine], webrtc: ['WebRTC (conexión directa)', () => 'RTCPeerConnection' in window], recorder: ['Grabación de medios', () => 'MediaRecorder' in window],
    capture: ['Captura de lienzo', () => !!HTMLCanvasElement.prototype.captureStream], speech: ['Síntesis de voz', () => 'speechSynthesis' in window], fonts: ['Fuentes locales', () => 'queryLocalFonts' in window], usb: ['WebUSB / HID / Serie', () => !!(navigator.usb || navigator.hid || navigator.serial)],
    barcode: ['Lector de códigos del navegador', () => 'BarcodeDetector' in window], compression: ['Compresión ZIP', () => 'CompressionStream' in window], proxy: ['Servidor de EISENKU (proxy)', () => /^https?:$/.test(location.protocol)], gamepad: ['Mandos', () => 'getGamepads' in navigator], sinkid: ['Elegir salida de audio', () => 'setSinkId' in HTMLMediaElement.prototype], webgl: ['Gráficos WebGL', () => K.caps.webgl]
  };
  const NEED = { camera: ['camera'], recorder: ['microphone', 'recorder'], meet: ['camera', 'microphone', 'network'], chat: ['webrtc'], devcomm: ['webrtc', 'files'], screenrec: ['screen', 'recorder'], videoeditor: ['recorder', 'capture'], scanner: ['camera'], qr: ['camera', '+barcode'], projexplorer: ['+devicefs'], fonts: ['+fonts'], peripherals: ['+usb'], podcasts: ['network', 'proxy'], browser: ['network', '+proxy'], weather: ['network', '+geolocation'], maps: ['network', '+geolocation'], audiodev: ['+sinkid', 'microphone'], gamepads: ['gamepad'], mediacenter: ['files'], hwinspect: ['+webgl'], explorer: ['files', '+compression'], assistant: ['+speech'], ideas: ['+speech'] };
  K.define('compat', {
    init(b) {
      b.innerHTML = shell([['apps', 'Por aplicación', 'grid'], ['device', 'Este dispositivo', 'monitor']], 'apps');
      const V = q(b, '[data-v]'); let tab = 'apps', fq = '';
      const reqOf = id => (NEED[id] || []).concat(K.perms.declared(id).filter(p => CAP[p] && !(NEED[id] || []).some(x => x.replace('+', '') === p)));
      const status = id => { const r = reqOf(id); const must = r.filter(x => !x.startsWith('+')), opt = r.filter(x => x.startsWith('+')).map(x => x.slice(1)); const miss = must.filter(x => CAP[x] && !CAP[x][1]()), mopt = opt.filter(x => CAP[x] && !CAP[x][1]()); return { r, miss, mopt, level: miss.length ? 'd' : mopt.length ? 'w' : 'g' }; };
      function draw(tb = tab) {
        tab = tb;
        if (tab === 'apps') {
          const apps = Object.keys(E.REG).filter(id => id !== 'deskfolder' && (!fq || K.norm(appName(id)).includes(fq))).sort((a, c) => ({ d: 0, w: 1, g: 2 }[status(a).level] - { d: 0, w: 1, g: 2 }[status(c).level]) || appName(a).localeCompare(appName(c)));
          V.innerHTML = `<div class="k9-row" style="margin-bottom:8px"><input class="input-text" data-q placeholder="${esc(tr('Buscar app…'))}" value="${esc(fq)}" style="flex:1"><span class="k9-small k9-muted">${esc(tr('Verde: todo disponible · Ámbar: funciones opcionales no disponibles · Rojo: falta algo necesario'))}</span></div><table class="k9-table"><thead><tr><th>${esc(tr('App'))}</th><th>${esc(tr('Necesita'))}</th><th>${esc(tr('Estado'))}</th><th>${esc(tr('Modos de compatibilidad'))}</th></tr></thead><tbody>${apps.map(id => { const s = status(id), c = K.compat.get(id), z = K.appZoom ? K.appZoom.get(id) : 1; return `<tr><td>${E.tile(E.REG[id], 20, 'mini')} ${esc(appName(id))}</td><td class="k9-small">${s.r.map(x => { const k = x.replace('+', ''); const ok = CAP[k] ? CAP[k][1]() : true; return `<span class="k9-badge ${ok ? 'g' : x.startsWith('+') ? 'w' : 'd'}" title="${esc(x.startsWith('+') ? tr('opcional') : tr('necesario'))}">${esc(tr(CAP[k] ? CAP[k][0] : k))}</span>`; }).join(' ') || '<span class="k9-muted">—</span>'}</td><td><span class="k9-dot ${s.level}"></span></td><td class="k9-small" style="white-space:nowrap"><label title="${esc(tr('Abrir maximizada'))}"><input type="checkbox" data-cm="max:${esc(id)}" ${c.max ? 'checked' : ''}> ${esc(tr('Maximizada'))}</label> <label><input type="checkbox" data-cm="noanim:${esc(id)}" ${c.noanim ? 'checked' : ''}> ${esc(tr('Sin animaciones'))}</label> <label><input type="checkbox" data-cm="zoom:${esc(id)}" ${z > 1 ? 'checked' : ''}> ${esc(tr('Texto grande'))}</label>${K.MANIFESTS[id] ? ` <label><input type="checkbox" data-cm="unload:${esc(id)}" ${c.unload ? 'checked' : ''}> ${esc(tr('Liberar al cerrar'))}</label>` : ''}</td></tr>`; }).join('')}</tbody></table>`;
        } else {
          const caps = Object.entries(CAP), sug = [];
          if (K.caps.xbox) sug.push(['Xbox detectada', 'Usa el perfil de pantalla «Televisor y Xbox», el modo de bajo consumo y la navegación con mando. Elige «Solo guardar dentro de EISEN» para los archivos.', () => { K.display.apply('tv'); }]);
          if (K.caps.touch) sug.push(['Pantalla táctil', 'Activa los objetivos táctiles grandes (perfil Tableta).', () => K.display.apply('tablet')]);
          if (K.caps.lowMemory || (navigator.deviceMemory && navigator.deviceMemory <= 4)) sug.push(['Poca memoria', 'Activa el modo de bajo consumo para que las apps se liberen al cerrarlas.', () => K.setLowPower(true)]);
          if (!isSecureContext) sug.push(['Conexión sin HTTPS', 'Cámara, micrófono, portapapeles y modo sin conexión necesitan HTTPS o 127.0.0.1.', null]);
          if (innerWidth < 700) sug.push(['Pantalla estrecha', 'Las ventanas se abren a pantalla completa; el perfil Teléfono ajusta el texto.', () => K.display.apply('phone')]);
          V.innerHTML = `<div class="k9-card"><h4>${I('sparkle', 16)} ${esc(tr('Recomendaciones para este dispositivo'))}</h4>${sug.map((s, i) => `<div class="k9-li"><div class="t"><b>${esc(tr(s[0]))}</b><small style="white-space:normal">${esc(tr(s[1]))}</small></div>${s[2] ? `<button class="k9-btn pri" data-sug="${i}">${esc(tr('Aplicar'))}</button>` : ''}</div>`).join('') || `<p class="k9-small">${esc(tr('Este dispositivo no necesita ajustes especiales.'))}</p>`}</div><div class="k9-card"><h4>${I('check', 16)} ${esc(tr('Capacidades del navegador'))}</h4><div class="k9-grid" style="--min:230px">${caps.map(([k, c]) => `<div class="k9-row k9-small"><span class="k9-dot ${c[1]() ? 'g' : 'd'}"></span>${esc(tr(c[0]))}</div>`).join('')}</div></div>`;
          V.__sug = sug;
        }
      }
      tabber(b, draw);
      b.addEventListener('input', U.debounce(e => { if (e.target.matches('[data-q]')) { fq = K.norm(e.target.value); draw(); const i = q(b, '[data-q]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 200));
      b.addEventListener('change', e => { const c = e.target.closest('[data-cm]'); if (!c) return; const [k, id] = c.dataset.cm.split(':'); if (k === 'zoom') K.appZoom.set(id, c.checked ? 1.25 : 1); else K.compat.set(id, { [k]: c.checked }); E.toast(tr('Se aplicará la próxima vez que abras') + ' ' + appName(id)); });
      b.addEventListener('click', e => { const s = e.target.closest('[data-sug]'); if (s && V.__sug) { V.__sug[+s.dataset.sug][2](); E.toast(tr('Aplicado')); } });
      draw(); this.onOpen = () => draw();
    }
  });

  /* ===================== Centro de actividad ===================== */
  const TYPE = { app: ['grid', 'Abriste'], file: ['file', 'Archivo'], search: ['search', 'Buscaste'], setting: ['settings', 'Ajuste'], focus: ['target', 'Concentración'], backup: ['save', 'Copia'], perm: ['shield', 'Permiso'], session: ['user', 'Sesión'], idea: ['sparkle', 'Idea'], system: ['info', 'Sistema'] };
  K.define('activity', {
    init(b) {
      b.innerHTML = shell([['continue', 'Continuar', 'right'], ['timeline', 'Línea de tiempo', 'history'], ['usage', 'Uso por app', 'chart']], 'continue');
      const V = q(b, '[data-v]'); let tab = 'continue';
      const acts = () => (S.get('os9_activity', []) || []).filter(x => x && x.t);
      async function draw(tb = tab) {
        tab = tb; const off = K.pref('activity') === false;
        const head = off ? U.note('El historial de actividad está desactivado. Actívalo en Configuración › Privacidad.', 'warn') : '';
        if (tab === 'continue') {
          const files = (await F.all()).sort((a, c) => (c.mod || c.date) - (a.mod || a.date)).slice(0, 8), apps = (S.get('recent_apps', []) || []).filter(id => E.REG[id]).slice(0, 10), ideas = (S.get('ideas_list', []) || []).filter(x => !x.done).slice(0, 4);
          V.innerHTML = head + `<div class="k9-card"><h4>${I('file', 16)} ${esc(tr('Archivos recientes'))}</h4>${files.map(f => `<div class="k9-li" data-file="${esc(f.id)}" style="cursor:pointer"><span style="font-size:20px">${{ image: '🖼️', audio: '🎵', video: '🎬', pdf: '📕', text: '📄', archive: '🗜️', office: '📘' }[F.kindOf(f)] || '📦'}</span><div class="t"><b>${esc(f.name)}</b><small>${esc(F.pretty(f.folder))} · ${esc(K.fmt.rel(f.mod || f.date))}</small></div>${I('right', 14)}</div>`).join('') || `<p class="k9-muted k9-small">${esc(tr('Sin archivos todavía.'))}</p>`}</div><div class="k9-card"><h4>${I('grid', 16)} ${esc(tr('Apps recientes'))}</h4><div class="k9-row">${apps.map(id => `<button class="k9-btn" data-launch="${esc(id)}">${E.tile(E.REG[id], 22, 'mini')} ${esc(appName(id))}</button>`).join('') || '—'}</div></div>${ideas.length ? `<div class="k9-card"><h4>${I('sparkle', 16)} ${esc(tr('Ideas pendientes'))}</h4>${ideas.map(x => `<div class="k9-li"><div class="t"><b style="white-space:normal">${esc(x.text.slice(0, 140))}</b><small>${esc(K.fmt.rel(x.t))}</small></div></div>`).join('')}<button class="k9-btn" data-launch="ideas">${esc(tr('Abrir Ideas'))}</button></div>` : ''}`;
        } else if (tab === 'timeline') {
          const l = acts().slice(0, 400), days = {}; l.forEach(x => { const d = new Date(x.t).toDateString(); (days[d] = days[d] || []).push(x); });
          V.innerHTML = head + (Object.keys(days).length ? Object.entries(days).map(([d, items]) => `<div class="k9-card"><h4>${I('calendar', 16)} ${esc(new Date(d).toLocaleDateString(K.locale, { weekday: 'long', day: 'numeric', month: 'long' }))} <span class="k9-badge">${items.length}</span></h4><div class="s10-tl">${items.map(x => { const ty = TYPE[x.type] || TYPE.system; const can = x.type === 'app' && E.REG[x.id]; return `<div class="s10-tl-it">${I(ty[0], 14)}<small class="k9-muted">${esc(K.fmt.time(x.t))}</small><span>${esc(tr(ty[1]))}: ${esc(x.label || x.id)}</span>${can ? `<button class="k9-btn" data-launch="${esc(x.id)}">${esc(tr('Abrir'))}</button>` : ''}</div>`; }).join('')}</div></div>`).join('') : `<div class="k9-state">${I('history', 36)}<p>${esc(tr('Todavía no hay actividad registrada.'))}</p></div>`) + `<div class="k9-row"><button class="k9-btn dng" data-a="clear">${I('trash', 14)} ${esc(tr('Borrar historial de actividad'))}</button></div>`;
        } else {
          const opens = {}; acts().filter(x => x.type === 'app').forEach(x => { opens[x.id] = (opens[x.id] || 0) + 1; });
          const ev = K.logList().filter(x => x.s === 'app').reverse(), start = {}, time = {}; ev.forEach(x => { if (/^Abierta/.test(x.m)) start[x.d] = x.t; else if (/^Cerrada/.test(x.m) && start[x.d]) { time[x.d] = (time[x.d] || 0) + (x.t - start[x.d]); delete start[x.d]; } }); Object.entries(start).forEach(([id, t]) => { if (document.getElementById('win-' + id) && document.getElementById('win-' + id).classList.contains('open')) time[id] = (time[id] || 0) + (Date.now() - t); });
          const ids = [...new Set(Object.keys(opens).concat(Object.keys(time)))].filter(id => E.REG[id]).sort((a, c) => (time[c] || 0) - (time[a] || 0) || (opens[c] || 0) - (opens[a] || 0)).slice(0, 25), mx = Math.max(1, ...ids.map(id => time[id] || 0));
          V.innerHTML = head + `<div class="k9-card"><h4>${I('chart', 16)} ${esc(tr('Apps más usadas'))}</h4><table class="k9-table"><thead><tr><th>${esc(tr('App'))}</th><th>${esc(tr('Veces abierta'))}</th><th>${esc(tr('Tiempo con la ventana abierta'))}</th><th></th></tr></thead><tbody>${ids.map(id => `<tr><td>${E.tile(E.REG[id], 20, 'mini')} ${esc(appName(id))}</td><td>${opens[id] || 0}</td><td>${time[id] ? esc(U.dur(time[id])) : '—'}</td><td style="width:30%">${U.meter((time[id] || 0) / mx * 100, ' ')}</td></tr>`).join('') || `<tr><td colspan="4" class="k9-muted">—</td></tr>`}</tbody></table><p class="k9-muted k9-small" style="margin-top:8px">${esc(tr('El tiempo se calcula con el Visor de eventos (desde EISENKU 10.0) y solo en este dispositivo.'))}</p></div>`;
        }
      }
      tabber(b, draw);
      b.addEventListener('click', async e => { const a = e.target.closest('[data-launch]'); if (a) E.launch(a.dataset.launch); const f = e.target.closest('[data-file]'); if (f) F.open(f.dataset.file); if (e.target.closest('[data-a="clear"]') && await E.confirm(tr('Borrar historial de actividad'), tr('Se eliminará el registro de actividad de este perfil.'))) { S.set('os9_activity', []); draw(); } });
      draw(); this.onOpen = () => draw();
    }
  });

  /* ===================== Centro de recuperación ===================== */
  K.define('recovery', {
    init(b) {
      b.innerHTML = shell([['snaps', 'Puntos de restauración', 'history'], ['reset', 'Restablecer', 'refresh'], ['config', 'Configuración', 'download'], ['emerg', 'Emergencia', 'shield']], 'snaps');
      const V = q(b, '[data-v]'); let tab = 'snaps';
      const lsAll = () => { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('eisen_')) o[k] = localStorage.getItem(k); } } catch { /* sin acceso */ } return o; };
      async function draw(tb = tab) {
        tab = tb;
        if (tab === 'snaps') { const l = await K.backup.snapshots(); V.innerHTML = `<div class="k9-row" style="margin-bottom:10px"><button class="k9-btn pri" data-a="snap">${I('plus', 14)} ${esc(tr('Crear punto de restauración'))}</button></div>${l.map(s => `<div class="k9-card"><div class="k9-row between"><div><b>${esc(s.reason)}</b><div class="k9-small k9-muted">${esc(K.fmt.dt(s.at))} · ${s.keys} ${esc(tr('ajustes'))} · ${esc(s.version)}</div></div><div class="k9-row"><button class="k9-btn" data-cmp="${esc(s.id)}">${I('layers', 14)} ${esc(tr('Comparar con ahora'))}</button><button class="k9-btn pri" data-rs="${esc(s.id)}">${I('history', 14)} ${esc(tr('Volver a este punto'))}</button></div></div><div data-diff="${esc(s.id)}"></div></div>`).join('') || `<div class="k9-state">${I('history', 36)}<p>${esc(tr('Sin puntos de restauración todavía.'))}</p></div>`}`; }
        else if (tab === 'reset') V.innerHTML = `<div class="k9-card"><h4>${I('refresh', 16)} ${esc(tr('Restablecer una parte del sistema'))}</h4><p class="k9-small k9-muted" style="margin-bottom:8px">${esc(tr('Antes de cada restablecimiento se crea un punto de restauración, así que puedes deshacerlo.'))}</p>${(K.RESETS || []).map(r => `<div class="k9-li"><div class="t"><b>${esc(tr(r[1]))}</b><small>${esc(r[2].length)} ${esc(tr('claves'))}</small></div><button class="k9-btn" data-reset="${esc(r[0])}">${esc(tr('Restablecer'))}</button></div>`).join('')}</div>`;
        else if (tab === 'config') V.innerHTML = `<div class="k9-card"><h4>${I('download', 16)} ${esc(tr('Solo la configuración'))}</h4><p class="k9-small">${esc(tr('Exporta tus ajustes y datos de apps sin los archivos (ideal para llevar tu configuración a otro navegador).'))}</p><div class="k9-row" style="margin-top:8px"><button class="k9-btn pri" data-a="export">${I('download', 14)} ${esc(tr('Exportar'))}</button><button class="k9-btn" data-a="import">${I('upload', 14)} ${esc(tr('Importar y combinar…'))}</button><button class="k9-btn" data-a="full">${I('save', 14)} ${esc(tr('Copia completa (con archivos)'))}</button></div></div>`;
        else V.innerHTML = `<div class="k9-card"><h4>${I('shield', 16)} ${esc(tr('Arranque de emergencia'))}</h4><div class="k9-row"><button class="k9-btn" data-a="safe">${esc(tr('Reiniciar en modo seguro'))}</button><button class="k9-btn" data-a="reload">${esc(tr('Reiniciar la interfaz'))}</button><button class="k9-btn" data-a="maint">${esc(tr('Herramientas de mantenimiento'))}</button></div></div><div class="k9-card" style="border-color:var(--e9-danger)"><h4 style="color:var(--e9-danger)">${I('trash', 16)} ${esc(tr('Restablecer EISENKU a los valores de fábrica'))}</h4><p class="k9-small">${esc(tr('Borra todos los ajustes y datos de apps de este perfil. Puedes conservar o borrar también tus archivos. Los puntos de restauración se conservan.'))}</p><label class="k9-row k9-small" style="margin:8px 0"><input type="checkbox" data-wipefiles> ${esc(tr('Borrar también todos mis archivos'))}</label><div class="k9-row"><input class="input-text" data-confirm placeholder="${esc(tr('Escribe BORRAR para confirmar'))}" style="width:240px"><button class="k9-btn dng" data-a="factory">${esc(tr('Restablecer'))}</button></div></div>`;
      }
      tabber(b, draw);
      b.addEventListener('click', async e => {
        const t = e.target;
        const cmp = t.closest('[data-cmp]'); if (cmp) { const s = await K.sys.get('snapshots', cmp.dataset.cmp), cur = lsAll(), old = (s && s.data) || {}; const keys = [...new Set(Object.keys(cur).concat(Object.keys(old)))].sort(); const added = keys.filter(k => !(k in old)), removed = keys.filter(k => !(k in cur)), changed = keys.filter(k => k in old && k in cur && old[k] !== cur[k]); const box = q(b, `[data-diff="${CSS.escape(cmp.dataset.cmp)}"]`); box.innerHTML = `<div class="k9-small" style="margin-top:10px"><p><span class="k9-badge g">+${added.length} ${esc(tr('nuevas desde entonces'))}</span> <span class="k9-badge d">−${removed.length} ${esc(tr('ya no existen'))}</span> <span class="k9-badge w">~${changed.length} ${esc(tr('cambiadas'))}</span></p><table class="k9-table" style="margin-top:6px"><tbody>${changed.slice(0, 40).map(k => `<tr><td class="k9-mono">${esc(k.slice(6))}</td><td class="k9-mono k9-muted" style="max-width:260px;overflow:hidden;text-overflow:ellipsis">${esc(String(old[k]).slice(0, 80))}</td><td>→</td><td class="k9-mono" style="max-width:260px;overflow:hidden;text-overflow:ellipsis">${esc(String(cur[k]).slice(0, 80))}</td></tr>`).join('')}${added.slice(0, 20).map(k => `<tr><td class="k9-mono">${esc(k.slice(6))}</td><td colspan="3"><span class="k9-badge g">${esc(tr('nueva'))}</span></td></tr>`).join('')}${removed.slice(0, 20).map(k => `<tr><td class="k9-mono">${esc(k.slice(6))}</td><td colspan="3"><span class="k9-badge d">${esc(tr('eliminada'))}</span></td></tr>`).join('')}</tbody></table></div>`; return; }
        const rs = t.closest('[data-rs]'); if (rs) { if (await E.confirm(tr('Volver a un punto de restauración'), tr('Tus ajustes y datos de apps volverán a ese momento (los archivos no cambian). La interfaz se reiniciará.'))) { await K.backup.restoreSnapshot(rs.dataset.rs); location.reload(); } return; }
        const rc = t.closest('[data-reset]'); if (rc) { const r = (K.RESETS || []).find(x => x[0] === rc.dataset.reset); if (r && await E.confirm(tr('Restablecer') + ': ' + tr(r[1]), tr('Se crea antes un punto de restauración. La interfaz se reiniciará.'))) { await K.backup.snapshot(tr('Antes de restablecer') + ' ' + tr(r[1])); r[2].forEach(k => S.del(k)); K.log('warn', 'settings', 'Categoría restablecida: ' + r[1]); location.reload(); } return; }
        const a = t.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'snap') { await K.backup.snapshot(tr('Manual')); E.toast(tr('Punto de restauración creado')); draw(); }
        if (k === 'export' && K.cfgUI) K.cfgUI.acts['cfg-export'](); if (k === 'import' && K.cfgUI) K.cfgUI.acts['cfg-import']();
        if (k === 'full') { E.toast(tr('Preparando copia de seguridad…')); const r = await K.backup.create({ files: true }); E.download(r.name, r.blob); }
        if (k === 'safe') location.href = location.pathname + '?safe=1'; if (k === 'reload') location.reload(); if (k === 'maint') E.launch('maintenance');
        if (k === 'factory') { if ((q(b, '[data-confirm]').value || '').trim().toUpperCase() !== 'BORRAR') return E.toast(tr('Escribe BORRAR para confirmar')); await K.backup.snapshot(tr('Antes de restablecer de fábrica')); const wipe = q(b, '[data-wipefiles]').checked; Object.keys(lsAll()).forEach(k2 => { if (!/^eisen_os9_(migrations|schema|last_version)$/.test(k2)) localStorage.removeItem(k2); }); if (wipe) { for (const f of await F.allRaw()) await F.destroy(f.id); } K.seclog('system', 'Restablecimiento de fábrica' + (wipe ? ' (con archivos)' : ''), 'warn'); location.reload(); }
      });
      draw(); this.onOpen = () => draw();
    }
  });

  /* ===================== Comprobador de integridad ===================== */
  K.define('modcheck', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-bar"><button class="k9-btn pri" data-a="run">${I('shield', 14)} ${esc(tr('Comprobar ahora'))}</button><select class="input-text" data-flt><option value="">${esc(tr('Todos'))}</option><option value="bad">${esc(tr('Con problemas'))}</option><option value="loaded">${esc(tr('Cargados en esta sesión'))}</option></select><span class="sp"></span><button class="k9-btn" data-a="sched">${I('clock', 14)} ${esc(tr('Comprobar cada semana'))}</button></div><div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]'); let res = null;
      const loaded = () => new Set([...document.scripts].filter(s => s.src).map(s => new URL(s.src).pathname.slice(1)).concat([...document.querySelectorAll('link[rel=stylesheet]')].map(l => new URL(l.href).pathname.slice(1))));
      function draw() {
        if (!res) { V.innerHTML = `<div class="k9-state">${I('shield', 40)}<p>${esc(tr('Compara la huella SHA-256 de cada módulo con la que se generó al empaquetar EISENKU (integrity.json).'))}</p></div>`; return; }
        if (res.error) { V.innerHTML = U.note(res.error, 'warn'); return; }
        const lo = loaded(), fl = q(b, '[data-flt]').value, rows = res.rows.filter(r => !fl || (fl === 'bad' ? r.st !== 'ok' : lo.has(r.f)));
        const bad = res.rows.filter(r => r.st !== 'ok');
        V.innerHTML = `<div class="k9-grid" style="--min:150px">${U.kpi(res.rows.length, 'Archivos comprobados')}${U.kpi(res.rows.filter(r => r.st === 'ok').length, 'Correctos')}${U.kpi(res.rows.filter(r => r.st === 'mod').length, 'Modificados')}${U.kpi(res.rows.filter(r => r.st === 'miss').length, 'Ausentes')}${U.kpi(res.rows.filter(r => lo.has(r.f)).length, 'Cargados ahora')}</div>${bad.length ? U.note('Hay archivos distintos de los originales: puede ser una copia incompleta, una edición tuya o una modificación no deseada. Reinstala EISENKU desde su ZIP si no los cambiaste tú.', 'warn') : U.note('Todos los módulos coinciden con los de esta versión.', 'ok')}<table class="k9-table" style="margin-top:10px"><thead><tr><th>${esc(tr('Archivo'))}</th><th>${esc(tr('Estado'))}</th><th>${esc(tr('Cargado'))}</th><th>SHA-256</th></tr></thead><tbody>${rows.map(r => `<tr><td class="k9-mono k9-small">${esc(r.f)}</td><td>${r.st === 'ok' ? badge('Correcto', 'g') : r.st === 'mod' ? badge('Modificado', 'd') : badge('Ausente', 'w')}</td><td>${lo.has(r.f) ? badge('Sí', 'p') : ''}</td><td class="k9-mono k9-small k9-muted">${esc((r.got || '').slice(0, 16))}${r.got ? '…' : ''}</td></tr>`).join('')}</tbody></table>`;
      }
      async function run() {
        let man; try { const r = await fetch('integrity.json', { cache: 'no-store' }); if (!r.ok) throw 0; man = await r.json(); } catch { res = { error: tr('No disponible: abre EISENKU con su servidor (INICIAR.bat/INICIAR.sh) o desde Netlify/Cloudflare; abierto como archivo no se puede comprobar.') }; draw(); return; }
        const list = Object.entries(man.files || {}), rows = []; let i = 0;
        for (const [f, h] of list) { i++; if (i % 5 === 0) V.innerHTML = `<div class="k9-state"><span class="k9-spin"></span><p>${i} / ${list.length} · ${esc(f)}</p></div>`; try { const r = await fetch(f, { cache: 'no-store' }); if (!r.ok) { rows.push({ f, st: 'miss' }); continue; } const got = await K.sha256(await r.arrayBuffer()); rows.push({ f, st: got === h ? 'ok' : 'mod', got }); } catch { rows.push({ f, st: 'miss' }); } }
        res = { rows, version: man.version, at: Date.now() }; K.seclog('integrity', `Comprobador de integridad: ${rows.length} archivos, ${rows.filter(r => r.st === 'mod').length} modificados, ${rows.filter(r => r.st === 'miss').length} ausentes`, rows.every(r => r.st === 'ok') ? 'info' : 'warn'); draw();
      }
      b.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'run') run(); if (a.dataset.a === 'sched') { if (K.sched.list().some(t => t.action.type === 'integrity')) return E.toast(tr('Ya hay una comprobación programada')); K.sched.save({ id: E.uid(), name: tr('Comprobar la integridad del sistema'), action: { type: 'integrity', arg: '' }, when: { type: 'weekly', at: '12:00', days: [1] }, enabled: true, catchUp: true }); E.toast(tr('Programado cada lunes a las 12:00 (Programador de tareas)')); } });
      b.addEventListener('change', e => { if (e.target.matches('[data-flt]')) draw(); });
      draw();
    }
  });

  /* ===================== Pruebas del sistema (para el Panel de diagnóstico) ===================== */
  const TESTS = [
    ['Almacenamiento local', async () => { const k = 'eisen_os10_selftest'; localStorage.setItem(k, '{"ok":1}'); const v = localStorage.getItem(k); localStorage.removeItem(k); if (v !== '{"ok":1}') throw new Error('lectura distinta'); return 'escritura, lectura y borrado correctos'; }],
    ['Base de datos IndexedDB', async () => { await K.store10.put('kv', { id: '__test', v: 42 }); const r = await K.store10.get('kv', '__test'); await K.store10.del('kv', '__test'); if (!r || r.v !== 42) throw new Error('valor distinto'); return 'transacción correcta'; }],
    ['Sistema de archivos', async () => { const id = await F.save('__prueba_sistema.txt', new Blob(['EISENKU 10']), 'documents'); const t = await F.readText(id); await F.destroy(id); if (t !== 'EISENKU 10') throw new Error('contenido distinto'); return 'guardar, leer y eliminar correctos'; }],
    ['Cifrado (SHA-256)', async () => { const h = await K.sha256('abc'); if (h !== 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') throw new Error('huella incorrecta'); return 'vector de prueba correcto'; }],
    ['Cifrado (AES-GCM)', async () => { const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']), iv = crypto.getRandomValues(new Uint8Array(12)); const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('secreto')); const p = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, c)); if (p !== 'secreto') throw new Error('descifrado distinto'); return 'cifrar y descifrar correctos'; }],
    ['Compresión y ZIP', async () => { const z = await K.zip([{ name: 'a.txt', data: new Blob(['hola '.repeat(400)]) }]); const u = await K.unzip(z); if (new TextDecoder().decode(u[0].data) !== 'hola '.repeat(400)) throw new Error('ZIP distinto'); return (z.zipStats && z.zipStats.deflate ? 'DEFLATE ' + Math.round(z.zipStats.ratio * 100) + ' %' : 'sin compresión (navegador sin CompressionStream)'); }],
    ['Audio', async () => { const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!Ctx) throw new Error('sin Web Audio'); const ac = new Ctx(1, 4410, 44100), o = ac.createOscillator(); o.connect(ac.destination); o.start(); const buf = await ac.startRendering(); const d = buf.getChannelData(0); let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); if (m < .5) throw new Error('sin señal'); return 'síntesis de audio correcta (pico ' + m.toFixed(2) + ')'; }],
    ['Gráficos 2D', async () => { const c = document.createElement('canvas'); c.width = c.height = 4; const x = c.getContext('2d'); x.fillStyle = '#34a582'; x.fillRect(0, 0, 4, 4); const p = x.getImageData(1, 1, 1, 1).data; if (p[1] < 150) throw new Error('píxel incorrecto'); return 'dibujo y lectura de píxeles correctos'; }],
    ['Gráficos 3D (WebGL)', async () => { const c = document.createElement('canvas'), g = c.getContext('webgl2') || c.getContext('webgl'); if (!g) return '⚠ ' + tr('WebGL no disponible (no afecta a la mayoría de las apps)'); const ext = g.getExtension('WEBGL_debug_renderer_info'); return (g instanceof (window.WebGL2RenderingContext || Object) ? 'WebGL 2' : 'WebGL 1') + ' · ' + (ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)); }],
    ['Fluidez de la interfaz', async () => { const stop = K.perf10.use(); await new Promise(r => setTimeout(r, 2100)); const f = K.perf10.fps(); stop(); if (f && f < 20) return '⚠ ' + f + ' FPS: ' + tr('activa el bajo consumo'); return f + ' FPS'; }],
    ['Conexión a Internet', async () => { if (!navigator.onLine) return '⚠ ' + tr('el navegador indica que no hay conexión'); return tr('el navegador indica que hay conexión'); }],
    ['Servidor de EISENKU', async () => { if (!/^https?:$/.test(location.protocol)) return '⚠ ' + tr('abierto como archivo: sin servidor'); const t0 = performance.now(); const r = await fetch('version.json', { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); return `v${j.version} · ${Math.round(performance.now() - t0)} ms`; }],
    ['Proxy del navegador', async () => { const r = await fetch('/proxy?ping=1', { cache: 'no-store' }).catch(() => null); const j = r && r.ok ? await r.json().catch(() => null) : null; return j && j.ok ? tr('disponible') + (j.sandbox ? ' · sandbox ✓' : '') : '⚠ ' + tr('no disponible (el navegador usará el modo compatibilidad)'); }],
    ['IA de Domingo', async () => { const r = await fetch('/ai', { cache: 'no-store' }).catch(() => null); const j = r && r.ok ? await r.json().catch(() => null) : null; return j && j.ok ? (j.model || tr('activa')) : '⚠ ' + tr('no configurada (Domingo funciona en modo local)'); }],
    ['Modo sin conexión', async () => { if (!('serviceWorker' in navigator)) return '⚠ ' + tr('no disponible en este navegador'); const r = await navigator.serviceWorker.getRegistration(); return r ? (r.active ? tr('activo') : tr('instalándose')) : '⚠ ' + tr('no registrado (normal al abrir como archivo)'); }],
    ['Servicios internos', async () => { const l = K.services.list(), bad = l.filter(s => s.state === 'error'), off = l.filter(s => s.startType === 'auto' && s.state !== 'running'); if (bad.length) throw new Error(bad.map(s => s.name).join(', ')); return `${l.filter(s => s.state === 'running').length}/${l.length} ${tr('en ejecución')}${off.length ? ' · ⚠ ' + off.map(s => s.name).join(', ') + ' ' + tr('detenidos') : ''}`; }],
    ['Cuota de almacenamiento', async () => { if (!navigator.storage || !navigator.storage.estimate) return '⚠ ' + tr('el navegador no informa'); const e = await navigator.storage.estimate(), p = e.quota ? e.usage / e.quota * 100 : 0; if (p > 90) throw new Error(p.toFixed(0) + ' % ' + tr('usado')); return `${K.fmt.bytes(e.usage)} / ${K.fmt.bytes(e.quota)} (${p.toFixed(1)} %)`; }]
  ];
  K.ext.diag10 = {
    tests: TESTS,
    async run(V) {
      const rows = TESTS.map(([n]) => ({ n, st: 'wait', msg: '' }));
      const draw = () => { V.innerHTML = `<div class="k9-card"><h4>${I('check', 16)} ${esc(tr('Pruebas del sistema'))}</h4><table class="k9-table"><tbody>${rows.map(r => `<tr><td style="width:24px">${r.st === 'wait' ? '<span class="k9-spin" style="width:14px;height:14px"></span>' : r.st === 'ok' ? '✅' : r.st === 'warn' ? '⚠️' : '❌'}</td><td><b>${esc(tr(r.n))}</b></td><td class="k9-small">${esc(r.msg)}</td><td class="k9-small k9-muted">${r.ms != null ? r.ms + ' ms' : ''}</td></tr>`).join('')}</tbody></table><div class="k9-row" style="margin-top:10px" data-sum></div></div>`; };
      draw();
      for (let i = 0; i < TESTS.length; i++) { const t0 = performance.now(); try { const m = String(await TESTS[i][1]()); rows[i].st = m.startsWith('⚠') ? 'warn' : 'ok'; rows[i].msg = m.replace(/^⚠\s*/, ''); } catch (e) { rows[i].st = 'fail'; rows[i].msg = e.message || String(e); } rows[i].ms = Math.round(performance.now() - t0); draw(); }
      const c = s => rows.filter(r => r.st === s).length;
      V.querySelector('[data-sum]').innerHTML = `<span class="k9-badge g">${c('ok')} ${esc(tr('correctas'))}</span><span class="k9-badge w">${c('warn')} ${esc(tr('avisos'))}</span><span class="k9-badge d">${c('fail')} ${esc(tr('fallidas'))}</span><button class="k9-btn" data-exp10>${I('download', 14)} ${esc(tr('Exportar resultado'))}</button>`;
      V.querySelector('[data-exp10]').onclick = () => K.ui.download('EISENKU_pruebas_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ at: new Date().toISOString(), version: K.version, ua: navigator.userAgent, rows }, null, 2), 'application/json');
      K.log(c('fail') ? 'error' : c('warn') ? 'warn' : 'ok', 'diagnostics', `Pruebas del sistema: ${c('ok')} correctas, ${c('warn')} avisos, ${c('fail')} fallidas`);
      return rows;
    }
  };

  /* ===================== Análisis de almacenamiento (para el Monitor de almacenamiento) ===================== */
  function squarify(items, x, y, w, h) {
    const out = [], total = items.reduce((a, i) => a + i.v, 0) || 1; let rest = items.slice().sort((a, c) => c.v - a.v);
    const scale = w * h / total; rest = rest.map(i => Object.assign({}, i, { a: i.v * scale }));
    const worst = (row, side) => { const s = row.reduce((a, r) => a + r.a, 0), mx = Math.max(...row.map(r => r.a)), mn = Math.min(...row.map(r => r.a)); return Math.max(side * side * mx / (s * s), s * s / (side * side * mn)); };
    while (rest.length) {
      const side = Math.min(w, h); let row = [rest[0]], i = 1;
      while (i < rest.length && worst(row.concat(rest[i]), side) <= worst(row, side)) { row.push(rest[i]); i++; }
      rest = rest.slice(i); const s = row.reduce((a, r) => a + r.a, 0);
      if (w >= h) { const cw = s / h; let cy = y; row.forEach(r => { const ch = r.a / cw; out.push(Object.assign(r, { x, y: cy, w: cw, h: ch })); cy += ch; }); x += cw; w -= cw; }
      else { const ch = s / w; let cx = x; row.forEach(r => { const cw = r.a / ch; out.push(Object.assign(r, { x: cx, y, w: cw, h: ch })); cx += cw; }); y += ch; h -= ch; }
    }
    return out;
  }
  K.squarify = squarify;
  K.ext.storage10 = {
    async map(V) {
      const files = await F.all(), by = {}; files.forEach(f => { const parts = (f.folder || 'documents').split('/'); const key = parts.slice(0, 2).join('/'); by[key] = (by[key] || 0) + (f.size || 0); });
      const items = Object.entries(by).filter(([, v]) => v > 0).map(([k, v]) => ({ k, v })); if (!items.length) { K.ui.empty(V, 'No hay archivos todavía.', 'disk'); return; }
      const W = 1000, H = 520, rects = squarify(items, 0, 0, W, H), tot = items.reduce((a, i) => a + i.v, 0), PAL = ['#1f8160', '#c93a73', '#4f5662', '#34a582', '#8a74c4', '#d9a03a', '#3a9cc0', '#e8709f'];
      V.innerHTML = `<div class="k9-card"><h4>${I('grid', 16)} ${esc(tr('Mapa de carpetas por tamaño'))} <span class="k9-badge">${esc(K.fmt.bytes(tot))}</span></h4><div class="s10-tm" style="aspect-ratio:${W}/${H}">${rects.map((r, i) => `<button class="s10-tm-r" data-go="${esc(r.k)}" style="left:${r.x / W * 100}%;top:${r.y / H * 100}%;width:${r.w / W * 100}%;height:${r.h / H * 100}%;background:${PAL[i % PAL.length]}" title="${esc(F.pretty(r.k))} · ${esc(K.fmt.bytes(r.v))}"><b>${esc(F.pretty(r.k))}</b><small>${esc(K.fmt.bytes(r.v))} · ${(r.v / tot * 100).toFixed(1)} %</small></button>`).join('')}</div><p class="k9-small k9-muted" style="margin-top:6px">${esc(tr('Pulsa un rectángulo para abrir la carpeta en Archivos.'))}</p></div>`;
      V.onclick = e => { const g = e.target.closest('[data-go]'); if (g) E.filesOpenFolder(g.dataset.go); };
    },
    async dup(V) {
      await libs(); const files = (await F.all()).filter(f => f.size > 0), bySize = {}; files.forEach(f => { (bySize[f.size] = bySize[f.size] || []).push(f); });
      const cands = Object.values(bySize).filter(l => l.length > 1).flat(); V.innerHTML = `<div class="k9-state"><span class="k9-spin"></span><p>${esc(tr('Comparando huellas de'))} ${cands.length} ${esc(tr('archivos del mismo tamaño…'))}</p></div>`;
      const byHash = {}; for (const f of cands) { const h = (await K.hash.compute(f.blob, ['SHA-256']))['SHA-256']; (byHash[h] = byHash[h] || []).push(f); }
      const groups = Object.entries(byHash).filter(([, l]) => l.length > 1).sort((a, c) => c[1][0].size * (c[1].length - 1) - a[1][0].size * (a[1].length - 1)), waste = groups.reduce((a, [, l]) => a + l[0].size * (l.length - 1), 0);
      V.innerHTML = `<div class="k9-grid" style="--min:160px">${U.kpi(groups.length, 'Grupos de duplicados')}${U.kpi(groups.reduce((a, [, l]) => a + l.length - 1, 0), 'Copias sobrantes')}${U.kpi(K.fmt.bytes(waste), 'Espacio recuperable')}</div>${groups.length ? `<div class="k9-row" style="margin:10px 0"><button class="k9-btn pri" data-dupall>${I('trash', 14)} ${esc(tr('Mover a la papelera todas las copias (se conserva la más antigua)'))}</button></div>` : U.note('No hay archivos duplicados: cada archivo tiene contenido distinto.', 'ok')}${groups.map(([h, l]) => `<div class="k9-card"><h4 style="justify-content:space-between">${esc(K.fmt.bytes(l[0].size))} × ${l.length}<small class="k9-mono k9-muted">${esc(h.slice(0, 12))}…</small></h4>${l.sort((a, c) => a.date - c.date).map((f, i) => `<div class="k9-li"><div class="t"><b>${esc(f.name)}</b><small>${esc(F.pretty(f.folder))} · ${esc(K.fmt.dt(f.date))}${i === 0 ? ' · ' + esc(tr('original (más antiguo)')) : ''}</small></div><button class="k9-btn" data-open="${esc(f.id)}">${esc(tr('Abrir'))}</button>${i ? `<button class="k9-btn dng" data-trash="${esc(f.id)}">${esc(tr('A la papelera'))}</button>` : ''}</div>`).join('')}</div>`).join('')}`;
      V.onclick = async e => { const o = e.target.closest('[data-open]'); if (o) F.open(o.dataset.open); const t = e.target.closest('[data-trash]'); if (t) { await F.trash(t.dataset.trash); t.closest('.k9-li').remove(); } if (e.target.closest('[data-dupall]') && await E.confirm(tr('Mover copias a la papelera'), tr('Se conserva la copia más antigua de cada grupo. Podrás restaurarlas desde la papelera.'))) { let n = 0; for (const [, l] of groups) for (const f of l.sort((a, c) => a.date - c.date).slice(1)) { await F.trash(f.id); n++; } E.toast(n + ' ' + tr('copias movidas a la papelera')); K.ext.storage10.dup(V); } };
    },
    async old(V) {
      const st = { mb: 5, days: 90 };
      const draw = async () => {
        const lim = Date.now() - st.days * 864e5, l = (await F.all()).filter(f => f.size >= st.mb * 1048576 && (f.mod || f.date) <= lim).sort((a, c) => c.size - a.size);
        V.innerHTML = `<div class="k9-row" style="margin-bottom:10px"><label class="k9-field">${esc(tr('Mayores de'))}<select class="input-text" data-mb>${[1, 5, 10, 50, 100].map(v => `<option value="${v}"${v === st.mb ? ' selected' : ''}>${v} MB</option>`).join('')}</select></label><label class="k9-field">${esc(tr('Sin cambios desde hace'))}<select class="input-text" data-days>${[0, 30, 90, 180, 365].map(v => `<option value="${v}"${v === st.days ? ' selected' : ''}>${v ? v + ' ' + esc(tr('días')) : esc(tr('cualquier fecha'))}</option>`).join('')}</select></label><span class="k9-small k9-muted">${l.length} ${esc(tr('archivos'))} · ${esc(K.fmt.bytes(l.reduce((a, f) => a + f.size, 0)))}</span></div>${l.map(f => `<div class="k9-li"><label class="k9-row"><input type="checkbox" data-pick="${esc(f.id)}"></label><div class="t"><b>${esc(f.name)}</b><small>${esc(K.fmt.bytes(f.size))} · ${esc(F.pretty(f.folder))} · ${esc(tr('modificado'))} ${esc(K.fmt.rel(f.mod || f.date))}</small></div><button class="k9-btn" data-open="${esc(f.id)}">${esc(tr('Abrir'))}</button></div>`).join('') || `<div class="k9-state">${I('check', 36)}<p>${esc(tr('Ningún archivo cumple estos criterios.'))}</p></div>`}${l.length ? `<div class="k9-row" style="margin-top:10px"><button class="k9-btn dng" data-trashsel>${I('trash', 14)} ${esc(tr('Mover los marcados a la papelera'))}</button></div>` : ''}`;
      };
      V.onchange = e => { if (e.target.matches('[data-mb]')) { st.mb = +e.target.value; draw(); } if (e.target.matches('[data-days]')) { st.days = +e.target.value; draw(); } };
      V.onclick = async e => { const o = e.target.closest('[data-open]'); if (o) F.open(o.dataset.open); if (e.target.closest('[data-trashsel]')) { const ids = qa(V, '[data-pick]:checked').map(c => c.dataset.pick); if (!ids.length) return E.toast(tr('Marca algún archivo')); for (const id of ids) await F.trash(id); E.toast(ids.length + ' ' + tr('archivos movidos a la papelera')); draw(); } };
      draw();
    }
  };
})();

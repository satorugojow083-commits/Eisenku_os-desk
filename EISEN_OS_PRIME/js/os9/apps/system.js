/* EISENKU OS 9.0 (ampliado en 10.0: análisis de almacenamiento y pruebas del sistema) · Apps del sistema: almacenamiento, aplicaciones, actualizaciones, permisos, red, dispositivos,
   información, sesiones, seguridad, mantenimiento, diagnóstico y bienvenida. */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, F = K.files;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)];
  const get = (k, d) => S.get('a9_' + k, d), put = (k, v) => S.set('a9_' + k, v);
  const lsKeys = () => { const o = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('eisen_')) o.push(k); } } catch { /* sin acceso */ } return o; };
  const lsSize = k => { try { return ((localStorage.getItem(k) || '').length + k.length) * 2; } catch { return 0; } };
  const devDownload = (name, blob) => { const a = document.createElement('a'); a.__eisen = true; a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); HTMLAnchorElement.prototype.click.call(a); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const meter = (pct, label) => `<div class="k9-meter ${pct > 85 ? 'bad' : pct > 65 ? 'warn' : ''}" role="meter" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"${label ? ` aria-label="${esc(label)}"` : ''}><i style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%"></i></div>`;
  const kpi = (v, l) => `<div class="k9-card k9-kpi"><b>${v}</b><span>${esc(tr(l))}</span></div>`;
  const tabsUi = (tabs, cur) => `<div class="k9-tabs">${tabs.map(([k, l]) => `<button class="${k === cur ? 'on' : ''}" data-tab="${k}">${esc(tr(l))}</button>`).join('')}</div>`;
  const ping = async (url, o = {}) => { const t0 = performance.now(); try { const c = new AbortController(), to = setTimeout(() => c.abort(), o.timeout || 6000); const r = await fetch(url, Object.assign({ cache: 'no-store', signal: c.signal }, o.init || {})); clearTimeout(to); let j = null; if (o.json) { try { j = await r.json(); } catch { j = null; } } return { ok: r.ok || r.type === 'opaque', status: r.status, ms: Math.round(performance.now() - t0), json: j }; } catch (e) { return { ok: false, ms: Math.round(performance.now() - t0), err: e.name === 'AbortError' ? tr('Tiempo agotado') : e.message }; } };

  // claves de datos por app (sin el prefijo eisen_)
  const APPDATA = {
    markdown: ['a9_md_draft'], projects: ['a9_projects'], notebook: ['a9_notebook'], passwords: ['a9_vault'], downloads: ['os9_downloads'], bookmarks: ['browser_bookmarks', 'a9_bmfolders'], history: ['browser_history'], tabsmgr: ['os9_tabsessions', 'os9_closedtabs'], mail: ['a9_mail', 'a9_contacts'], chat: ['a9_chat'], meet: ['a9_meet'],
    imageviewer: ['a9_iv_secs'], medialib: ['a9_playlists', 'a9_ml_vol', 'a9_ml_shuffle', 'a9_ml_repeat'], codeeditor: ['a9_code_session', 'a9_ce_wrap', 'a9_ce_fs'], jsoneditor: ['a9_json_draft'], devconsole: ['a9_devcon_hist'], htmlvalidator: ['a9_hv_draft'], formatter: ['a9_fmt_prefs'], snippets: ['a9_snippets'], testlab: ['a9_testlab'],
    academic: ['a9_academic'], library: ['a9_library'], simulators: ['a9_sim'], algebra: ['a9_algebra'], equations: ['a9_eq'], formulas: ['a9_formulas'], sciconv: ['a9_sciconv'], sessions: ['os9_layouts'],
    word: ['word_doc'], excel: ['excel_data'], notes: ['notes'], tasks: ['tasks'], calendar: ['events', 'fired'], clock: ['alarms'], calc: ['calc_hist'], slides: ['slides_deck'], flashcards: ['flash'], grapher: ['graph_fx'], typing: ['typing_best'], code: ['code_proj'], news: ['feeds'], maps: ['map_view'], colors: ['palettes'], piano: ['piano_song'], pixel: ['pixel_art'], translator: ['tr_hist'], weather: ['weather_loc'], assistant: ['dom_cfg', 'dom_chat'],
    browser: ['browser_tabs', 'browser_default', 'eb_store', 'site_mode', 'search_native', 'browser_proxy_mode', 'browser_proxy_url', 'os9_siteperms', 'os9_popups_ok'], explorer: ['vfs', 'fs9_dirs', 'fs9_favdirs', 'fs9_view', 'fs9_sort', 'fs9_last', 'fs9_openwith'], arcade: ['game_best', 'racer_lap', 'adv_state', 'lights_lvl', 'ttt_sc', 'recent_games']
  };
  const keysOf = id => { const base = (APPDATA[id] || []).map(k => 'eisen_' + k); const own = lsKeys().filter(k => k === 'eisen_' + id || k.startsWith('eisen_' + id + '_') || k.startsWith('eisen_a9_' + id)); return [...new Set(base.concat(own))].filter(k => { try { return localStorage.getItem(k) != null; } catch { return false; } }); };
  K.appDataKeys = keysOf;

  /* ===================== Monitor de almacenamiento ===================== */
  K.define('storagemon', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-bar"><div class="k9-seg" data-s10tabs><button class="on" data-s10t="sum">${esc(tr('Resumen'))}</button><button data-s10t="map">${esc(tr('Mapa'))}</button><button data-s10t="dup">${esc(tr('Duplicados'))}</button><button data-s10t="old">${esc(tr('Grandes y antiguos'))}</button></div><span class="sp"></span><button class="k9-btn" data-a="persist">${I('shield', 14)} ${esc(tr('Proteger contra borrado automático'))}</button><button class="k9-btn" data-a="refresh">${I('refresh', 14)} ${esc(tr('Actualizar'))}</button></div><div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]');
      async function draw() {
        K.ui.loading(V, tr('Analizando almacenamiento…'));
        const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate().catch(() => null) : null;
        const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted().catch(() => false) : false;
        const raw = await F.allRaw(), files = raw.filter(f => !f.trash), trash = raw.filter(f => f.trash);
        const by = {}, byFolder = {}; files.forEach(f => { const k = F.kindOf(f); by[k] = (by[k] || 0) + (f.size || 0); const r = (f.folder || 'documents').split('/')[0]; byFolder[r] = (byFolder[r] || 0) + (f.size || 0); });
        const tot = files.reduce((a, f) => a + (f.size || 0), 0), trashSz = trash.reduce((a, f) => a + (f.size || 0), 0);
        const keys = lsKeys(), lsTot = keys.reduce((a, k) => a + lsSize(k), 0);
        const perApp = Object.keys(E.REG).map(id => ({ id, size: keysOf(id).reduce((a, k) => a + lsSize(k), 0) })).filter(x => x.size > 0).sort((a, c) => c.size - a.size).slice(0, 12);
        const big = files.slice().sort((a, c) => c.size - a.size).slice(0, 12);
        const KN = { image: 'Imágenes', audio: 'Audio', video: 'Vídeo', pdf: 'PDF', text: 'Texto y código', archive: 'Comprimidos', office: 'Ofimática', other: 'Otros' };
        const maxBy = Math.max(1, ...Object.values(by)), maxF = Math.max(1, ...Object.values(byFolder)), maxA = Math.max(1, ...perApp.map(x => x.size));
        V.innerHTML = `<div class="k9-card"><h4>${I('disk', 16)} ${esc(tr('Espacio del navegador para EISENKU'))}</h4>${est && est.quota ? `${meter(est.usage / est.quota * 100, tr('Uso'))}<p class="k9-small" style="margin-top:6px">${esc(K.fmt.bytes(est.usage))} ${esc(tr('usados de'))} ${esc(K.fmt.bytes(est.quota))} ${esc(tr('disponibles (cuota estimada por el navegador)'))}</p>` : `<p class="k9-small k9-muted">${esc(tr('Este navegador no informa de la cuota.'))}</p>`}
          <p class="k9-small" style="margin-top:6px">${persisted ? `<span class="k9-ok">✓ ${esc(tr('Almacenamiento persistente: el navegador no lo borrará automáticamente.'))}</span>` : `<span style="color:var(--e9-warn)">⚠ ${esc(tr('Almacenamiento no persistente: si el dispositivo se queda sin espacio, el navegador podría borrarlo. Haz copias de seguridad.'))}</span>`}</p></div>
          <div class="k9-grid" style="--min:150px;margin-top:10px">${kpi(esc(K.fmt.bytes(tot)), 'Archivos')}${kpi(files.length, 'Número de archivos')}${kpi(esc(K.fmt.bytes(lsTot)), 'Ajustes y datos de apps')}${kpi(esc(K.fmt.bytes(trashSz)), 'Papelera')}</div>
          <div class="k9-grid" style="--min:300px;margin-top:10px"><div class="k9-card"><h4>${esc(tr('Por tipo de archivo'))}</h4>${Object.entries(by).sort((a, c) => c[1] - a[1]).map(([k, v]) => `<div class="a9-bar-row"><span>${esc(tr(KN[k] || k))}</span>${meter(v / maxBy * 100)}<small>${esc(K.fmt.bytes(v))}</small></div>`).join('') || `<p class="k9-muted k9-small">${esc(tr('Sin archivos'))}</p>`}</div>
          <div class="k9-card"><h4>${esc(tr('Por carpeta'))}</h4>${Object.entries(byFolder).sort((a, c) => c[1] - a[1]).map(([k, v]) => `<div class="a9-bar-row"><span>${esc(F.pretty(k))}</span>${meter(v / maxF * 100)}<small>${esc(K.fmt.bytes(v))}</small></div>`).join('') || `<p class="k9-muted k9-small">—</p>`}</div>
          <div class="k9-card"><h4>${esc(tr('Datos por aplicación'))}</h4>${perApp.map(x => `<div class="a9-bar-row"><span>${esc((E.REG[x.id] || {}).name || x.id)}</span>${meter(x.size / maxA * 100)}<small>${esc(K.fmt.bytes(x.size))}</small></div>`).join('') || `<p class="k9-muted k9-small">—</p>`}<button class="k9-btn" data-a="apps" style="margin-top:6px">${I('grid', 14)} ${esc(tr('Administrar datos de apps'))}</button></div></div>
          <div class="k9-card" style="margin-top:10px"><h4>${esc(tr('Archivos más grandes'))}</h4>${big.map(f => `<div class="k9-li"><div class="t"><b>${esc(f.name)}</b><small>${esc(F.pretty(f.folder || 'documents'))} · ${esc(K.fmt.dt(f.mod || f.date))}</small></div><span class="k9-small">${esc(K.fmt.bytes(f.size))}</span><button class="k9-btn" data-open="${esc(f.id)}">${esc(tr('Abrir'))}</button><button class="k9-btn dng" data-trash="${esc(f.id)}" aria-label="${esc(tr('Mover a la papelera'))}">${I('trash', 14)}</button></div>`).join('') || `<p class="k9-muted k9-small">—</p>`}</div>
          <div class="k9-card" style="margin-top:10px"><h4>${esc(tr('Liberar espacio'))}</h4><div class="k9-row"><button class="k9-btn" data-a="emptytrash" ${trash.length ? '' : 'disabled'}>${I('trash', 14)} ${esc(tr('Vaciar papelera'))} (${esc(K.fmt.bytes(trashSz))})</button><button class="k9-btn" data-a="maint">${I('settings', 14)} ${esc(tr('Herramientas de mantenimiento'))}</button><button class="k9-btn" data-a="privacy">${I('shield', 14)} ${esc(tr('Borrar historiales'))}</button></div></div>`;
      }
      b.addEventListener('click', async e => {
        const tb = e.target.closest('[data-s10t]'); if (tb) { qa(b, '[data-s10t]').forEach(x => x.classList.toggle('on', x === tb)); if (tb.dataset.s10t === 'sum') draw(); else { K.ui.loading(V); await K.loadScript('js/os10/apps/system10.js'); K.ext.storage10[tb.dataset.s10t](V); } return; }   // 10.0: análisis de almacenamiento
        const o = e.target.closest('[data-open]'); if (o) { F.open(o.dataset.open); return; }
        const t = e.target.closest('[data-trash]'); if (t) { await F.trash(t.dataset.trash); draw(); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'refresh') draw();
        if (k === 'apps') E.launch('appmanager');
        if (k === 'maint') E.launch('maintenance');
        if (k === 'privacy') E.launch('privacy');
        if (k === 'emptytrash' && await E.confirm(tr('Vaciar papelera'), tr('Los archivos se borrarán definitivamente.'))) { const n = await F.emptyTrash(); E.toast(n + ' ' + tr('archivos eliminados')); draw(); }
        if (k === 'persist') { if (!navigator.storage || !navigator.storage.persist) return K.ui.alert(tr('No disponible'), tr('Este navegador no permite solicitar almacenamiento persistente.')); const ok = await navigator.storage.persist(); E.toast(ok ? tr('Almacenamiento protegido') : tr('El navegador no lo ha concedido (suele hacerlo si instalas EISENKU como app o lo usas a menudo)')); K.seclog('storage', 'Solicitud de almacenamiento persistente: ' + (ok ? 'concedida' : 'denegada')); draw(); }
      });
      draw(); this.onOpen = draw;
    }
  });

  /* ===================== Administrador de aplicaciones ===================== */
  K.define('appmanager', {
    init(b) {
      let tab = 'apps', fq = '';
      b.innerHTML = `<div class="k9">${tabsUi([['apps', 'Aplicaciones instaladas'], ['defaults', 'Apps predeterminadas'], ['startup', 'Inicio automático']], tab)}<div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]');
      const CORE = ['settings', 'explorer', 'appcenter', 'browser', 'terminal'];
      function draw() {
        qa(b, '[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
        if (tab === 'apps') {
          const n = K.norm(fq);
          const apps = Object.values(E.REG).filter(a => a.id !== 'deskfolder' && E.isInstalled(a.id) && (!n || K.norm(a.name + ' ' + (a.cat || '')).includes(n))).map(a => ({ a, keys: keysOf(a.id) })).map(x => Object.assign(x, { size: x.keys.reduce((s, k) => s + lsSize(k), 0) })).sort((x, y) => y.size - x.size || x.a.name.localeCompare(y.a.name));
          V.innerHTML = `<div class="k9-row" style="margin-bottom:10px"><input class="input-text" data-q placeholder="${esc(tr('Buscar aplicaciones…'))}" value="${esc(fq)}" style="width:260px"><span class="k9-small k9-muted">${apps.length} ${esc(tr('apps instaladas'))}</span><span class="sp" style="flex:1"></span><button class="k9-btn" data-a="store">${I('store', 14)} App Center</button></div><div class="k9-card" style="padding:2px 8px">${apps.map(({ a, keys, size }) => `<div class="k9-li">${E.tile(a, 30)}<div class="t"><b>${esc(a.name)}</b><small>${esc(tr(a.cat || 'Sistema'))} · v${esc(a.ver || (a.v9 ? '1.0.0' : '8.0'))}${a.thirdParty ? ' · ' + esc(tr('de terceros')) : ''} · ${size ? esc(K.fmt.bytes(size)) + ' ' + esc(tr('de datos')) : esc(tr('sin datos guardados'))}</small></div><button class="k9-btn" data-open="${esc(a.id)}">${esc(tr('Abrir'))}</button><button class="k9-btn" data-perm="${esc(a.id)}" title="${esc(tr('Permisos'))}" aria-label="${esc(tr('Permisos'))}">${I('key', 14)}</button><button class="k9-btn" data-reset="${esc(a.id)}" ${keys.length ? '' : 'disabled'} title="${esc(tr('Restablecer datos'))}">${I('refresh', 14)}</button><button class="k9-btn dng" data-un="${esc(a.id)}" ${CORE.includes(a.id) ? 'disabled' : ''} title="${esc(tr('Desinstalar'))}" aria-label="${esc(tr('Desinstalar'))}">${I('trash', 14)}</button></div>`).join('')}</div>`;
          const qi = q(V, '[data-q]'); qi.oninput = () => { fq = qi.value; const p = qi.selectionStart; draw(); const n2 = q(V, '[data-q]'); n2.focus(); n2.setSelectionRange(p, p); };
        }
        if (tab === 'defaults') {
          const pref = S.get('fs9_openwith', {}) || {};
          const TYPES = [['png', 'Imagen PNG', 'image/png'], ['jpg', 'Imagen JPEG', 'image/jpeg'], ['svg', 'Imagen SVG', 'image/svg+xml'], ['mp3', 'Audio MP3', 'audio/mpeg'], ['wav', 'Audio WAV', 'audio/wav'], ['mp4', 'Vídeo MP4', 'video/mp4'], ['webm', 'Vídeo WebM', 'video/webm'], ['txt', 'Texto', 'text/plain'], ['md', 'Markdown', 'text/markdown'], ['json', 'JSON', 'application/json'], ['js', 'JavaScript', 'text/javascript'], ['html', 'HTML', 'text/html'], ['css', 'CSS', 'text/css'], ['csv', 'CSV', 'text/csv'], ['pdf', 'PDF', 'application/pdf'], ['epub', 'Libro EPUB', 'application/epub+zip']];
          V.innerHTML = `<p class="k9-small k9-muted" style="margin-bottom:10px">${esc(tr('Elige con qué app se abre cada tipo de archivo al hacer doble clic en Archivos.'))}</p><div class="k9-card" style="padding:2px 8px">${TYPES.map(([ext, l, type]) => { const hs = F.handlers({ name: 'x.' + ext, type }); return `<div class="k9-li"><div class="t"><b>.${esc(ext)}</b><small>${esc(tr(l))}</small></div><select class="input-text" data-def="${ext}"><option value="">${esc(tr('Automático'))}</option>${hs.map(h => `<option value="${h[0]}"${pref[ext] === h[0] ? ' selected' : ''}>${esc(tr(h[1]))}</option>`).join('')}</select></div>`; }).join('')}</div>`;
        }
        if (tab === 'startup') {
          const l = S.get('os9_startup', []) || [];
          const apps = Object.values(E.REG).filter(a => E.isInstalled(a.id) && a.id !== 'deskfolder').sort((x, y) => x.name.localeCompare(y.name));
          V.innerHTML = `<p class="k9-small k9-muted" style="margin-bottom:10px">${esc(tr('Estas apps se abren al iniciar EISENKU (no en modo seguro).'))}</p><div class="k9-card" style="padding:2px 8px">${apps.map(a => `<label class="k9-li">${E.tile(a, 26)}<div class="t"><b>${esc(a.name)}</b></div><input type="checkbox" class="k9-switch" data-st="${esc(a.id)}" ${l.includes(a.id) ? 'checked' : ''}></label>`).join('')}</div>`;
        }
      }
      b.addEventListener('click', async e => {
        const t = e.target;
        const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; draw(); return; }
        const o = t.closest('[data-open]'); if (o) { E.launch(o.dataset.open); return; }
        const p = t.closest('[data-perm]'); if (p) { E.launch('permissions', { app: p.dataset.perm }); return; }
        const r = t.closest('[data-reset]'); if (r) { const id = r.dataset.reset, ks = keysOf(id), a = E.REG[id]; if (!await E.confirm(tr('Restablecer datos'), `${a.name}: ${ks.length} ${tr('elementos guardados se borrarán. Se crea antes un punto de restauración.')}`)) return; await K.backup.snapshot(tr('Antes de restablecer') + ' ' + a.name); ks.forEach(k => { try { localStorage.removeItem(k); } catch { /* ignorar */ } }); K.seclog('apps', 'Datos restablecidos: ' + a.name); E.toast(tr('Datos restablecidos')); const w = document.getElementById('win-' + id); if (w && w.classList.contains('open')) E.toast(tr('Cierra y vuelve a abrir la app')); draw(); return; }
        const u = t.closest('[data-un]'); if (u) { const id = u.dataset.un, a = E.REG[id]; if (!await E.confirm(tr('Desinstalar'), `${a.name}. ${tr('Sus datos se conservan por si la reinstalas desde el App Center.')}`)) return; const w = document.getElementById('win-' + id); if (w && w.classList.contains('open')) { const c = w.querySelector('[data-act="close"]'); if (c) c.click(); } E.setInstalled(id, false); K.seclog('apps', 'Desinstalada: ' + a.name); draw(); return; }
        const a = t.closest('[data-a="store"]'); if (a) E.launch('appcenter');
      });
      b.addEventListener('change', e => {
        const d = e.target.closest('[data-def]'); if (d) { const m = S.get('fs9_openwith', {}) || {}; if (d.value) m[d.dataset.def] = d.value; else delete m[d.dataset.def]; S.set('fs9_openwith', m); E.toast(tr('Guardado')); }
        const s = e.target.closest('[data-st]'); if (s) { const l = S.get('os9_startup', []) || []; S.set('os9_startup', s.checked ? [...new Set(l.concat(s.dataset.st))] : l.filter(x => x !== s.dataset.st)); }
      });
      draw(); this.onOpen = draw;
    }
  });

  /* ===================== Centro de actualizaciones ===================== */
  const NOVEDADES = `## EISENKU OS 10.0 NEXT GENERATION

- **47 apps nuevas** que se descargan solo al abrirlas, todas desinstalables y reinstalables desde el App Center: sistema, hardware, redes, oficina, multimedia, personalización, herramientas y educación.
- **Núcleo y diagnóstico:** Núcleo del sistema, Monitor de recursos (fluidez, retardo y memoria JavaScript reales), Visor de eventos, Servicios, Administrador de inicio, Programador de tareas, Compatibilidad, Historial de actividad, Centro de recuperación y Comprobador de integridad.
- **Centro del equipo:** 17 componentes explicados (CPU, GPU, RAM, placa base, SSD, fuente…) junto a los datos reales que el navegador permite conocer, y avisos claros de lo que no puede medir.
- **Hardware y periféricos:** inspector del dispositivo con pruebas de pantalla y rendimiento, probador de teclado, ratón, táctil y lápiz, centro de mandos con calibración y vibración, audio con prueba de altavoces y micrófono, y registro de periféricos.
- **Redes:** centro de conexión, diagnóstico paso a paso, servidores favoritos, enlaces compartidos con QR, comunicación entre dispositivos (WebRTC), información de seguridad y privacidad del navegador.
- **Oficina y estudio:** gestor de referencias (DOI, ISBN, BibTeX, RIS), bibliografías en 6 estilos, citas, índice y ecuaciones en Writer, organizador académico, ideas rápidas y pizarra infinita.
- **Multimedia:** editor de vídeo, grabador de pantalla, visor RAW, colecciones, reproductor con subtítulos, podcasts y centro multimedia para TV y mando.
- **Herramientas:** verificador de huellas, editor hexadecimal, conversor universal (imágenes, datos, documentos, codificaciones y audio), administrador de fuentes, calculadora de programación y generador de diagramas.
- **Ciencia y educación:** simulador de circuitos con análisis nodal, laboratorio de física y matemáticas, simulador de redes (rutas y subredes) y centro de aprendizaje de informática con 8 lecciones.
- **Personalización:** administrador de temas con archivos .eistheme, paquetes de iconos, paneles laterales, widgets y escritorios virtuales.
- **Configuración en 25 categorías** con búsqueda global, y **Archivos 10.0** con doble panel, vista rápida, etiquetas y búsqueda dentro del contenido.
- **Rendimiento:** carga diferida, liberación de memoria de las apps cerradas y modo de bajo consumo para Xbox, tabletas y móviles.

## EISENKU OS 9.0 ENTERPRISE

- **Dos escritorios completos:** modo Linux (panel superior, dock y lanzador) y modo Windows (barra de tareas e inicio). Cambia en Configuración › Entorno sin perder datos.
- **Diseño Enterprise:** negro elegante, verde sobrio y rosa profesional, con un sistema de componentes unificado.
- **Más de 45 apps nuevas**, que se descargan solo al abrirlas: productividad, Internet, multimedia, desarrollo, sistema, educación y ciencia.
- **EISENKU App Center:** catálogo, instalación, actualizaciones, favoritos, permisos y paquetes de terceros aislados.
- **Navegador mejorado:** permisos por sitio, buscador configurable, descargas, reapertura de pestañas, ventanas emergentes controladas y explicación honesta del modo privado.
- **Archivos 9.0:** carpetas y subcarpetas, papelera, favoritos, búsqueda, ZIP, «Abrir con» e importación de carpetas.
- **Oficina:** Writer guarda en Word (.docx), HTML o texto, con estilos, buscar y reemplazar y guardado automático; Sheets calcula más de 40 funciones (en español o inglés) y abre y guarda CSV; los códigos QR se generan sin conexión.
- **20 idiomas** con detección de textos sin traducir, formatos regionales y escritura de derecha a izquierda.
- **Seguridad:** páginas del proxy aisladas, protección SSRF, límites de uso, código de acceso para la IA, bóveda cifrada, PIN con bloqueo y registro de eventos.
- **Copias de seguridad completas** (ajustes y archivos), puntos de restauración, migraciones reversibles y comprobación de integridad.
- **EISENKU OS Handbook:** 25 capítulos con buscador y tutoriales interactivos.`;
  K.NOVEDADES = NOVEDADES;
  K.define('updates', {
    init(b, w, arg) {
      const tabOf = a => typeof a === 'string' ? a : a && a.tab;
      let tab = ['status', 'news', 'migr', 'integ', 'points'].includes(tabOf(arg)) ? tabOf(arg) : 'status';
      b.innerHTML = `<div class="k9">${tabsUi([['status', 'Estado'], ['news', 'Novedades'], ['migr', 'Migraciones'], ['integ', 'Integridad'], ['points', 'Puntos de restauración']], tab)}<div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]');
      async function draw() {
        qa(b, '[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
        if (tab === 'status') {
          const last = S.get('os9_upd_check', 0);
          V.innerHTML = `<div class="k9-card"><div class="k9-row"><img src="icon.svg" width="54" height="54" alt=""><div style="flex:1"><b style="font-size:18px">EISENKU OS ${esc(K.version)} ${esc(K.edition)}</b><div class="k9-small k9-muted">Build ${esc(K.build)} · ${esc(tr('Esquema de datos'))} ${esc(String(S.get('os9_schema', 1)))}${K.updatedFrom ? ' · ' + esc(tr('actualizado desde')) + ' ' + esc(K.updatedFrom) : ''}</div></div><button class="k9-btn pri" data-a="check">${I('update', 14)} ${esc(tr('Buscar actualizaciones'))}</button></div><div data-res class="k9-small" style="margin-top:10px">${last ? esc(tr('Última comprobación')) + ': ' + esc(K.fmt.dt(last)) : ''}</div></div>
            <div class="k9-card"><h4>${I('shield', 16)} ${esc(tr('Cómo se actualiza EISENKU'))}</h4><p class="k9-small">${esc(tr('EISENKU OS nunca se actualiza solo ni descarga código de fuentes desconocidas. La versión la decide quien publica tu copia (tu carpeta local, Netlify o Cloudflare). Cuando el servidor tenga una versión nueva, aquí lo verás y bastará con recargar. Antes de aplicar migraciones de datos se crea un punto de restauración y cada migración puede revertirse.'))}</p></div>`;
        }
        if (tab === 'news') V.innerHTML = `<div class="k9-card md-view">${K.md(NOVEDADES).html}</div>`;
        if (tab === 'migr') { const h = S.get('os9_migrations', []) || []; V.innerHTML = `<div class="k9-card" style="padding:4px 10px">${h.map(x => `<div class="k9-li"><div class="t"><b>#${x.id} ${esc(x.name)}</b><small>${esc(K.fmt.dt(x.at))} · ${x.ok ? (x.reverted ? esc(tr('Revertida')) : esc(tr('Aplicada'))) : esc(tr('Error'))}</small></div>${x.ok && !x.reverted ? `<button class="k9-btn" data-rev="${x.id}">${esc(tr('Revertir'))}</button>` : x.reverted ? `<button class="k9-btn" data-reapply="${x.id}">${esc(tr('Volver a aplicar'))}</button>` : ''}</div>`).join('') || `<p class="k9-muted k9-small" style="padding:8px">${esc(tr('No se ha aplicado ninguna migración.'))}</p>`}</div><p class="k9-small k9-muted" style="margin-top:8px">${esc(tr('Las migraciones adaptan tus datos de versiones anteriores. Revertir restaura los valores exactos que había antes.'))}</p>`; }
        if (tab === 'integ') { const stg = K.integrity.storage(); V.innerHTML = `<div class="k9-card"><h4>${I('check', 16)} ${esc(tr('Archivos del sistema (SHA-256)'))}</h4><p class="k9-small k9-muted">${esc(tr('Compara cada archivo de EISENKU con la huella publicada en integrity.json.'))}</p><button class="k9-btn pri" data-a="files">${esc(tr('Comprobar ahora'))}</button><div data-fres style="margin-top:8px"></div></div><div class="k9-card"><h4>${I('disk', 16)} ${esc(tr('Datos guardados'))}</h4>${stg.bad.length ? `<p class="k9-bad">${stg.bad.length} ${esc(tr('elementos dañados'))}: ${esc(stg.bad.slice(0, 8).join(', '))}</p><button class="k9-btn dng" data-a="repair">${esc(tr('Reparar (eliminar los dañados)'))}</button>` : `<p class="k9-ok">✓ ${esc(tr('Todos los datos se leen correctamente'))} (${lsKeys().length})</p>`}</div>`; }
        if (tab === 'points') { const l = await K.backup.snapshots(); V.innerHTML = `<div class="k9-row" style="margin-bottom:10px"><button class="k9-btn pri" data-a="snap">${I('save', 14)} ${esc(tr('Crear punto de restauración'))}</button><span class="k9-small k9-muted">${esc(tr('Guardan tus ajustes y datos de apps (no los archivos). Para todo, usa una copia de seguridad completa.'))}</span></div><div class="k9-card" style="padding:4px 10px">${l.map(s => `<div class="k9-li"><div class="t"><b>${esc(s.reason)}</b><small>${esc(K.fmt.dt(s.at))} · ${s.keys} ${esc(tr('elementos'))} · v${esc(s.version)}</small></div><button class="k9-btn" data-restore="${esc(s.id)}">${esc(tr('Restaurar'))}</button></div>`).join('') || `<p class="k9-muted k9-small" style="padding:8px">${esc(tr('Aún no hay puntos de restauración.'))}</p>`}</div>`; }
      }
      b.addEventListener('click', async e => {
        const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; draw(); return; }
        const rv = e.target.closest('[data-rev]'); if (rv) { if (!await E.confirm(tr('Revertir migración'), tr('Se restaurarán los valores anteriores y la migración no se volverá a aplicar.'))) return; await K.backup.snapshot(tr('Antes de revertir una migración')); K.revertMigration(+rv.dataset.rev); E.toast(tr('Migración revertida')); draw(); return; }
        const ra = e.target.closest('[data-reapply]'); if (ra) { K.reapplyMigration(+ra.dataset.reapply); E.toast(tr('Se aplicará al recargar')); draw(); return; }
        const rs = e.target.closest('[data-restore]'); if (rs) { if (!await E.confirm(tr('Restaurar'), tr('Tus ajustes volverán a ese momento y EISENKU se recargará. Se guarda antes un punto con el estado actual.'))) return; if (await K.backup.restoreSnapshot(rs.dataset.restore)) location.reload(); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'check') { const r = q(V, '[data-res]'); r.textContent = tr('Comprobando…'); const x = await K.updates.check(); r.innerHTML = !x.ok ? `<span style="color:var(--e9-warn)">${esc(tr('No se pudo consultar el servidor (¿sin conexión o abierto como archivo local?).'))}</span>` : x.newer ? `<span class="k9-ok">${esc(tr('Hay una versión nueva en tu servidor'))}: <b>${esc(x.remote)}</b></span> <button class="k9-btn pri" data-a="reload">${esc(tr('Crear punto y recargar'))}</button>` : `<span class="k9-ok">✓ ${esc(tr('Tienes la versión más reciente publicada'))} (${esc(x.remote)})</span>`; }
        if (k === 'reload') { await K.backup.snapshot(tr('Antes de actualizar')); location.reload(); }
        if (k === 'files') { const r = q(V, '[data-fres]'); r.innerHTML = `<div class="k9-meter"><i data-pg style="width:0"></i></div>`; const res = await K.integrity.files((i, n) => { const pg = q(r, '[data-pg]'); if (pg) pg.style.width = (i / n * 100) + '%'; }); if (res.ok === null) { r.innerHTML = `<p class="k9-small" style="color:var(--e9-warn)">${esc(res.reason)}</p>`; return; } const bad = (res.modified || []).concat((res.missing || []).map(x => x + ' (' + tr('ausente') + ')')); r.innerHTML = res.ok ? `<p class="k9-ok">✓ ${res.total} ${esc(tr('archivos verificados: coinciden con la versión publicada'))}</p>` : `<p class="k9-bad">✕ ${esc(tr('Archivos que no coinciden'))} (${bad.length}): ${esc(bad.slice(0, 12).join(', '))}</p><p class="k9-small k9-muted">${esc(tr('Puede deberse a una edición manual o a una copia incompleta. Vuelve a descargar EISENKU desde tu fuente oficial.'))}</p>`; }
        if (k === 'repair') { const bad = K.integrity.storage().bad; if (await E.confirm(tr('Reparar'), bad.length + ' ' + tr('elementos dañados se eliminarán.'))) { K.integrity.repair(bad); draw(); } }
        if (k === 'snap') { await K.backup.snapshot(tr('Manual')); E.toast(tr('Punto de restauración creado')); draw(); }
      });
      draw(); this.onArg = a2 => { if (tabOf(a2)) { tab = tabOf(a2); draw(); } };
    }
  });

  /* ===================== Administrador de permisos ===================== */
  K.define('permissions', {
    init(b, w, arg) {
      let tab = arg && arg.tab ? arg.tab : 'apps', only = arg && arg.app ? arg.app : '';
      b.innerHTML = `<div class="k9">${tabsUi([['apps', 'Apps'], ['sites', 'Sitios web'], ['browser', 'Navegador'], ['log', 'Registro']], tab)}<div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]');
      const RISK = r => r >= 3 ? `<span class="k9-badge d">${esc(tr('alto'))}</span>` : r === 2 ? `<span class="k9-badge w">${esc(tr('medio'))}</span>` : `<span class="k9-badge">${esc(tr('bajo'))}</span>`;
      async function draw() {
        qa(b, '[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
        if (tab === 'apps') {
          const apps = Object.values(E.REG).filter(a => K.perms.declared(a.id).length && (!only || a.id === only)).sort((x, y) => (y.thirdParty ? 1 : 0) - (x.thirdParty ? 1 : 0) || x.name.localeCompare(y.name));
          V.innerHTML = (only ? `<div class="k9-row" style="margin-bottom:8px"><button class="k9-btn" data-a="all">← ${esc(tr('Todas las apps'))}</button></div>` : `<p class="k9-small k9-muted" style="margin-bottom:10px">${esc(tr('Las apps integradas tienen sus permisos concedidos salvo que los revoques. Las apps de terceros solo tienen los que aceptaste al instalarlas. Cámara, micrófono y ubicación se atribuyen a la ventana activa.'))}</p>`) +
            apps.map(a => `<div class="k9-card"><h4>${E.tile(a, 24)} ${esc(a.name)}${a.thirdParty ? ` <span class="k9-badge p">${esc(tr('de terceros'))}</span>` : ''}<span style="flex:1"></span><button class="k9-btn" data-resetp="${esc(a.id)}">${esc(tr('Restablecer'))}</button></h4>${K.perms.declared(a.id).map(p => { const P = K.PERMS[p] || { n: p, i: '•', risk: 1 }; return `<label class="k9-li"><span style="font-size:18px">${P.i}</span><div class="t"><b>${esc(tr(P.n))}</b></div>${RISK(P.risk)}<input type="checkbox" class="k9-switch" data-p="${esc(a.id)}|${p}" ${K.perms.has(a.id, p) ? 'checked' : ''}></label>`; }).join('')}</div>`).join('');
        }
        if (tab === 'sites') {
          const sp = S.get('os9_siteperms', {}) || {}, pop = S.get('os9_popups_ok', []) || [];
          V.innerHTML = `<div class="k9-card"><h4>${I('globe', 16)} ${esc(tr('Permisos concedidos a sitios'))}</h4>${Object.entries(sp).map(([h, l]) => `<div class="k9-li"><div class="t"><b>${esc(h)}</b><small>${esc(l.join(', '))}</small></div><button class="k9-btn dng" data-rmsite="${esc(h)}">${esc(tr('Revocar todo'))}</button></div>`).join('') || `<p class="k9-small k9-muted">${esc(tr('Ningún sitio tiene permisos especiales. Se conceden desde el escudo de la barra de direcciones del navegador.'))}</p>`}</div>
            <div class="k9-card"><h4>${esc(tr('Ventanas emergentes permitidas'))}</h4>${pop.map(h => `<div class="k9-li"><div class="t"><b>${esc(h)}</b></div><button class="k9-btn" data-rmpop="${esc(h)}">${esc(tr('Quitar'))}</button></div>`).join('') || `<p class="k9-small k9-muted">—</p>`}<label class="k9-row k9-small" style="margin-top:8px"><input type="checkbox" class="k9-switch" data-popblock ${K.pref('popups') === 'block' ? 'checked' : ''}> ${esc(tr('Bloquear ventanas emergentes de las páginas'))}</label></div>`;
        }
        if (tab === 'browser') {
          const names = [['camera', 'Cámara'], ['microphone', 'Micrófono'], ['geolocation', 'Ubicación'], ['notifications', 'Notificaciones'], ['clipboard-read', 'Leer el portapapeles'], ['persistent-storage', 'Almacenamiento persistente']];
          const st = await Promise.all(names.map(async ([n]) => { try { return (await navigator.permissions.query({ name: n })).state; } catch { return 'n/d'; } }));
          V.innerHTML = `<p class="k9-small k9-muted" style="margin-bottom:10px">${esc(tr('Estos son los permisos que TU navegador ha dado a EISENKU OS. Solo puedes cambiarlos desde la configuración del navegador (icono del candado junto a la dirección).'))}</p><div class="k9-card" style="padding:4px 10px">${names.map(([n, l], i) => `<div class="k9-li"><div class="t"><b>${esc(tr(l))}</b></div><span class="k9-badge ${st[i] === 'granted' ? 'g' : st[i] === 'denied' ? 'd' : ''}">${esc({ granted: tr('concedido'), denied: tr('denegado'), prompt: tr('preguntar') }[st[i]] || tr('no disponible'))}</span>${n === 'notifications' && st[i] === 'prompt' ? `<button class="k9-btn" data-a="asknotif">${esc(tr('Pedir'))}</button>` : ''}</div>`).join('')}</div>`;
        }
        if (tab === 'log') { const l = K.seclogList().filter(x => x.type === 'perm').slice(0, 200); V.innerHTML = `<div class="k9-card" style="padding:4px 10px">${l.map(x => `<div class="k9-li"><small class="k9-muted" style="width:120px">${esc(K.fmt.dt(x.t))}</small><div class="t"><b style="font-weight:500">${esc(x.msg)}</b></div>${x.level === 'warn' ? '<span class="k9-badge w">!</span>' : ''}</div>`).join('') || `<p class="k9-small k9-muted" style="padding:8px">${esc(tr('Sin eventos de permisos.'))}</p>`}</div>`; }
      }
      b.addEventListener('click', async e => {
        const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; draw(); return; }
        const r = e.target.closest('[data-resetp]'); if (r) { K.perms.reset(r.dataset.resetp); draw(); return; }
        const rs = e.target.closest('[data-rmsite]'); if (rs) { const m = S.get('os9_siteperms', {}) || {}; delete m[rs.dataset.rmsite]; S.set('os9_siteperms', m); K.seclog('perm', 'Revocados todos los permisos del sitio ' + rs.dataset.rmsite); draw(); return; }
        const rp = e.target.closest('[data-rmpop]'); if (rp) { S.set('os9_popups_ok', (S.get('os9_popups_ok', []) || []).filter(h => h !== rp.dataset.rmpop)); draw(); return; }
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'all') { only = ''; draw(); }
        if (a.dataset.a === 'asknotif' && 'Notification' in window) { await Notification.requestPermission(); draw(); }
      });
      b.addEventListener('change', e => {
        const p = e.target.closest('[data-p]'); if (p) { const [id, perm] = p.dataset.p.split('|'); K.perms.set(id, perm, p.checked); }
        if (e.target.matches('[data-popblock]')) K.pref('popups', e.target.checked ? 'block' : 'allow');
      });
      draw();
      this.onArg = a2 => { only = a2 && a2.app ? a2.app : ''; tab = a2 && a2.tab ? a2.tab : 'apps'; draw(); };
    }
  });

  /* ===================== Configuración de red ===================== */
  K.define('netconfig', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]');
      function draw() {
        const c = navigator.connection || {};
        V.innerHTML = `<div class="k9-card"><h4>${I('wifi', 16)} ${esc(tr('Conexión'))}</h4><div class="k9-row"><span class="k9-dot ${navigator.onLine ? 'g' : 'd'}"></span><b>${esc(navigator.onLine ? tr('En línea') : tr('Sin conexión'))}</b></div><p class="k9-small k9-muted" style="margin-top:6px">${esc(tr('Tipo estimado'))}: ${esc(c.effectiveType || '—')} · ${esc(tr('Velocidad estimada'))}: ${c.downlink ? esc(c.downlink + ' Mb/s') : '—'} · ${esc(tr('Latencia'))}: ${c.rtt != null ? esc(c.rtt + ' ms') : '—'}${c.saveData ? ' · ' + esc(tr('el navegador pide ahorrar datos')) : ''}</p></div>
          <div class="k9-card"><h4>${I('network', 16)} ${esc(tr('Servicios de EISENKU'))}</h4><div data-svc><p class="k9-small k9-muted">${esc(tr('Pulsa «Probar» para comprobar el proxy del navegador, la IA y el servidor.'))}</p></div><div class="k9-row" style="margin-top:8px"><button class="k9-btn pri" data-a="test">${I('pulse', 14)} ${esc(tr('Probar servicios'))}</button><button class="k9-btn" data-a="speed">${I('zap', 14)} ${esc(tr('Medir velocidad con tu servidor'))}</button><button class="k9-btn" data-a="netcheck">${esc(tr('Prueba de red completa'))}</button></div><div data-speed class="k9-small" style="margin-top:6px"></div></div>
          <div class="k9-card"><h4>${I('globe', 16)} ${esc(tr('Proxy del navegador'))}</h4><div class="k9-col"><label class="k9-field">${esc(tr('Modo'))}<select class="input-text" data-mode><option value="auto">${esc(tr('Automático (recomendado)'))}</option><option value="on">${esc(tr('Solo el proxy propio'))}</option><option value="off">${esc(tr('Directo (sin proxy)'))}</option></select></label><label class="k9-field">${esc(tr('Proxy personalizado (opcional)'))}<input class="input-text" data-purl placeholder="https://mi-eisenku.netlify.app/proxy?url=" value="${esc(S.get('browser_proxy_url', '') || '')}"></label><div class="k9-row"><button class="k9-btn" data-a="savep">${esc(tr('Guardar'))}</button><button class="k9-btn" data-a="testp">${esc(tr('Probar el personalizado'))}</button><span class="k9-small" data-pres></span></div><p class="k9-small k9-muted">${esc(tr('El proxy permite abrir dentro de EISENKU páginas que no se dejan incrustar. Las páginas que pasan por él se aíslan y no pueden leer tus datos. Quien gestiona el proxy puede ver qué direcciones visitas: usa solo el tuyo o uno de confianza.'))}</p></div></div>
          <div class="k9-card"><h4>${I('leaf', 16)} ${esc(tr('Ahorro de datos'))}</h4><label class="k9-row"><input type="checkbox" class="k9-switch" data-saver ${K.pref('dataSaver') ? 'checked' : ''}> ${esc(tr('Activar ahorro de datos'))}</label><p class="k9-small k9-muted" style="margin-top:6px">${esc(tr('Con el ahorro activado, EISENKU no descarga iconos de sitios web, no actualiza el tiempo y las noticias en segundo plano y no comprueba actualizaciones automáticamente.'))}</p></div>`;
        q(V, '[data-mode]').value = S.get('browser_proxy_mode', 'auto') || 'auto';
      }
      const row = (n, r, extra = '') => `<div class="k9-li"><span class="k9-dot ${r.ok ? 'g' : 'd'}"></span><div class="t"><b>${esc(n)}</b><small>${r.ok ? esc(tr('Responde')) + ' · ' + r.ms + ' ms' : esc(r.err || (tr('No disponible') + (r.status ? ' (HTTP ' + r.status + ')' : '')))}${extra}</small></div></div>`;
      b.addEventListener('click', async e => {
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'test') {
          const el = q(V, '[data-svc]'); K.ui.loading(el, tr('Probando…'));
          const [srv, px, ai, net] = await Promise.all([ping('version.json', { json: true }), ping('/proxy?ping=1', { json: true }), ping('/ai', { json: true }), ping('https://www.gstatic.com/generate_204', { init: { mode: 'no-cors' } })]);
          el.innerHTML = `<div class="k9-card" style="padding:2px 8px;background:transparent">${row(tr('Servidor de EISENKU'), srv, srv.json ? ' · v' + esc(srv.json.version) : '')}${row(tr('Proxy del navegador'), Object.assign(px, { ok: px.ok && px.json && px.json.ok }), px.json && px.json.server ? ' · ' + esc(px.json.server) : '')}${row(tr('Asistente IA (servidor)'), Object.assign(ai, { ok: ai.ok && !!ai.json }), ai.json ? ' · ' + esc(ai.json.provider || ai.json.mode || (ai.json.ok ? 'ok' : '')) : '')}${row(tr('Acceso a Internet'), net)}</div>${!px.ok || !(px.json && px.json.ok) ? `<p class="k9-small k9-muted" style="margin-top:6px">${esc(tr('Sin proxy propio: el navegador usará el modo directo o el de compatibilidad. Para tenerlo, abre EISENKU con INICIAR.bat/INICIAR.sh o publícalo en Netlify/Cloudflare.'))}</p>` : ''}`;
        }
        if (k === 'speed') { const el = q(V, '[data-speed]'); el.textContent = tr('Midiendo…'); const t0 = performance.now(); try { let bytes = 0; for (const f of ['js/app.js', 'js/os9/apps/dev.js', 'css/eisenku9.css']) { const r = await fetch(f + '?nocache=' + Date.now(), { cache: 'no-store' }); bytes += (await r.arrayBuffer()).byteLength; } const s = (performance.now() - t0) / 1000; el.textContent = `${tr('Descarga desde tu servidor de EISENKU')}: ${(bytes * 8 / s / 1e6).toFixed(1)} Mb/s (${K.fmt.bytes(bytes)} ${tr('en')} ${s.toFixed(2)} s). ${tr('No mide tu conexión a Internet en general.')}`; } catch (er) { el.textContent = tr('No se pudo medir') + ': ' + er.message; } }
        if (k === 'netcheck') E.launch('netcheck');
        if (k === 'savep' || k === 'testp') {
          const u = q(V, '[data-purl]').value.trim(), out = q(V, '[data-pres]');
          if (u && !/^https:\/\/[^\s]+$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/[^\s]*$/i.test(u)) { out.innerHTML = `<span class="k9-bad">${esc(tr('Usa una dirección https:// (o http://localhost)'))}</span>`; return; }
          if (k === 'savep') { S.set('browser_proxy_url', u); S.set('browser_proxy_mode', q(V, '[data-mode]').value); K.seclog('network', 'Proxy del navegador: ' + (u ? 'personalizado ' + new URL(u).host : 'propio') + ', modo ' + q(V, '[data-mode]').value); if (E.eb && E.eb.state.ready) E.eb.renderBar(); out.innerHTML = `<span class="k9-ok">✓ ${esc(tr('Guardado'))}</span>`; }
          else { if (!u) { out.textContent = tr('Escribe primero una dirección'); return; } const base = u.replace(/\/proxy\?url=.*$/, '').replace(/\/$/, ''); out.textContent = tr('Probando…'); const r = await ping(base + '/proxy?ping=1', { json: true }); out.innerHTML = r.ok && r.json && r.json.ok ? `<span class="k9-ok">✓ ${esc(tr('Proxy de EISENKU compatible'))} (${r.ms} ms)</span>` : `<span class="k9-bad">✕ ${esc(tr('No responde como un proxy de EISENKU'))}</span>`; }
        }
      });
      b.addEventListener('change', e => { if (e.target.matches('[data-saver]')) { K.pref('dataSaver', e.target.checked); document.documentElement.classList.toggle('data-saver', e.target.checked); } if (e.target.matches('[data-mode]')) S.set('browser_proxy_mode', e.target.value); });
      const on = () => draw(); window.addEventListener('online', on); window.addEventListener('offline', on); this._off = () => { window.removeEventListener('online', on); window.removeEventListener('offline', on); };
      draw();
    },
    destroy() { if (this._off) this._off(); }
  });

  /* ===================== Administrador de dispositivos ===================== */
  K.define('devices', (() => {
    let raf = 0, stream = null, ac = null;
    const stop = () => { cancelAnimationFrame(raf); raf = 0; if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } if (ac) { ac.close().catch(() => {}); ac = null; } };
    return {
      init(b) {
        let tab = 'media';
        b.innerHTML = `<div class="k9">${tabsUi([['media', 'Cámaras y audio'], ['pads', 'Mandos'], ['screen', 'Pantalla y entrada'], ['power', 'Batería y sensores']], tab)}<div class="k9-body" data-v></div></div>`;
        const V = q(b, '[data-v]');
        async function draw() {
          stop(); qa(b, '[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
          if (tab === 'media') {
            let l = []; try { l = await navigator.mediaDevices.enumerateDevices(); } catch { l = []; }
            const named = l.some(d => d.label), g = k => l.filter(d => d.kind === k);
            const list = (k, n, ic) => `<div class="k9-card"><h4>${I(ic, 16)} ${esc(tr(n))} <span class="k9-badge">${g(k).length}</span></h4>${g(k).map((d, i) => `<div class="k9-li"><div class="t"><b>${esc(d.label || tr(n) + ' ' + (i + 1))}</b><small>${d.deviceId === 'default' ? esc(tr('Predeterminado del sistema')) : ''}</small></div></div>`).join('') || `<p class="k9-small k9-muted">${esc(tr('Ninguno detectado'))}</p>`}</div>`;
            V.innerHTML = `${named ? '' : `<div class="k9-card"><p class="k9-small">${esc(tr('Por privacidad, el navegador oculta los nombres de los dispositivos hasta que das permiso.'))}</p><button class="k9-btn pri" data-a="names" style="margin-top:6px">${esc(tr('Mostrar nombres (pide permiso)'))}</button></div>`}${list('videoinput', 'Cámaras', 'camera')}${list('audioinput', 'Micrófonos', 'mic')}${list('audiooutput', 'Altavoces y auriculares', 'volume')}
              <div class="k9-card"><h4>${esc(tr('Prueba'))}</h4><div class="k9-row"><video data-prev playsinline muted style="width:220px;height:124px;background:#000;border-radius:8px;object-fit:cover"></video><div class="k9-col" style="flex:1"><div class="k9-meter"><i data-lvl style="width:0"></i></div><div class="k9-row"><button class="k9-btn" data-a="test">${esc(tr('Probar cámara y micrófono'))}</button><button class="k9-btn" data-a="beep">${esc(tr('Probar sonido'))}</button><button class="k9-btn" data-a="stop">${esc(tr('Detener'))}</button></div></div></div></div>`;
          }
          if (tab === 'pads') {
            V.innerHTML = `<p class="k9-small k9-muted" style="margin-bottom:10px">${esc(tr('Conecta un mando (Xbox, PlayStation o genérico) y pulsa cualquier botón para que el navegador lo detecte. EISENKU admite navegar con el mando en Xbox.'))}</p><div data-pads></div>`;
            const loop = () => {
              const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean), el = q(V, '[data-pads]'); if (!el) return;
              el.innerHTML = pads.length ? pads.map(p => `<div class="k9-card"><h4>🎮 ${esc(p.id.slice(0, 80))}</h4><div class="k9-small k9-muted">${esc(tr('Índice'))} ${p.index} · ${esc(p.mapping || tr('sin mapeo estándar'))} · ${p.buttons.length} ${esc(tr('botones'))} · ${p.axes.length} ${esc(tr('ejes'))}</div><div class="a9-pad-btns">${p.buttons.map((bt, i) => `<span class="${bt.pressed ? 'on' : ''}" style="--v:${bt.value}">${i}</span>`).join('')}</div><div class="a9-pad-axes">${p.axes.map((x, i) => `<div><small>${esc(tr('Eje'))} ${i}</small><div class="k9-meter"><i style="width:${((x + 1) / 2 * 100).toFixed(0)}%"></i></div></div>`).join('')}</div>${p.vibrationActuator ? `<button class="k9-btn" data-vib="${p.index}">${esc(tr('Probar vibración'))}</button>` : ''}</div>`).join('') : `<div class="k9-state">🎮<p>${esc(tr('No se detecta ningún mando.'))}</p></div>`;
              raf = requestAnimationFrame(loop);
            };
            loop();
          }
          if (tab === 'screen') {
            const o = screen.orientation || {}, mm = q => matchMedia(q).matches;
            V.innerHTML = `<div class="k9-card"><h4>${I('monitor', 16)} ${esc(tr('Pantalla'))}</h4><dl class="a9-dl"><dt>${esc(tr('Resolución'))}</dt><dd>${screen.width} × ${screen.height} (${esc(tr('física aprox.'))} ${Math.round(screen.width * devicePixelRatio)} × ${Math.round(screen.height * devicePixelRatio)})</dd><dt>${esc(tr('Densidad'))}</dt><dd>${devicePixelRatio.toFixed(2)}×</dd><dt>${esc(tr('Ventana'))}</dt><dd>${innerWidth} × ${innerHeight}</dd><dt>${esc(tr('Color'))}</dt><dd>${screen.colorDepth} bits${mm('(dynamic-range: high)') ? ' · HDR' : ''}${mm('(color-gamut: p3)') ? ' · P3' : ''}</dd><dt>${esc(tr('Orientación'))}</dt><dd>${esc(o.type || '—')}</dd><dt>${esc(tr('Tema del sistema'))}</dt><dd>${mm('(prefers-color-scheme: dark)') ? esc(tr('oscuro')) : esc(tr('claro'))}${mm('(prefers-reduced-motion: reduce)') ? ' · ' + esc(tr('movimiento reducido')) : ''}${mm('(prefers-contrast: more)') ? ' · ' + esc(tr('alto contraste')) : ''}</dd></dl><button class="k9-btn" data-a="fs" style="margin-top:8px">${I('fullscreen', 14)} ${esc(tr('Pantalla completa'))}</button></div>
              <div class="k9-card"><h4>${esc(tr('Entrada'))}</h4><dl class="a9-dl"><dt>${esc(tr('Puntero'))}</dt><dd>${mm('(pointer: fine)') ? esc(tr('ratón o lápiz preciso')) : mm('(pointer: coarse)') ? esc(tr('táctil o mando')) : '—'}${mm('(hover: hover)') ? ' · hover' : ''}</dd><dt>${esc(tr('Táctil'))}</dt><dd>${navigator.maxTouchPoints ? navigator.maxTouchPoints + ' ' + esc(tr('puntos')) : esc(tr('no'))}</dd><dt>${esc(tr('Teclado'))}</dt><dd data-kb>—</dd><dt>${esc(tr('Idioma del sistema'))}</dt><dd>${esc((navigator.languages || [navigator.language]).join(', '))}</dd></dl><p class="k9-small k9-muted" style="margin-top:6px">${esc(tr('Pulsa una tecla para ver su código.'))} <b data-key></b></p></div>`;
            if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { const el = q(V, '[data-kb]'); if (el) el.textContent = ['KeyQ', 'KeyW', 'KeyY', 'KeyA', 'KeyZ'].map(k => m.get(k) || '?').join('').toUpperCase() + ' (' + tr('distribución detectada') + ')'; }).catch(() => {});
          }
          if (tab === 'power') {
            V.innerHTML = `<div class="k9-card"><h4>${I('battery', 16)} ${esc(tr('Batería'))}</h4><div data-bat class="k9-small k9-muted">${esc(tr('Este navegador no informa de la batería.'))}</div></div><div class="k9-card"><h4>${esc(tr('Sensores y otras capacidades'))}</h4><div class="k9-row"><button class="k9-btn" data-a="orient">${esc(tr('Probar sensor de orientación'))}</button><button class="k9-btn" data-a="vibrate" ${navigator.vibrate ? '' : 'disabled'}>${esc(tr('Probar vibración'))}</button><button class="k9-btn" data-a="geo">${esc(tr('Probar ubicación'))}</button><button class="k9-btn" data-a="wake" ${'wakeLock' in navigator ? '' : 'disabled'}>${esc(tr('Mantener la pantalla encendida'))}</button></div><p class="k9-small" data-sens style="margin-top:8px"></p></div>`;
            if (navigator.getBattery) navigator.getBattery().then(bt => { const el = q(V, '[data-bat]'); if (el) el.innerHTML = `${meter(bt.level * 100)}<p style="margin-top:6px">${Math.round(bt.level * 100)}% · ${esc(bt.charging ? tr('cargando') : tr('con batería'))}${bt.dischargingTime && isFinite(bt.dischargingTime) ? ' · ' + esc(tr('quedan')) + ' ' + Math.round(bt.dischargingTime / 60) + ' min' : ''}</p>`; }).catch(() => {});
          }
        }
        b.addEventListener('keydown', e => { const k = q(V, '[data-key]'); if (k) k.textContent = `${e.key} · ${e.code}`; });
        b.addEventListener('click', async e => {
          const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; draw(); return; }
          const vb = e.target.closest('[data-vib]'); if (vb) { const p = navigator.getGamepads()[+vb.dataset.vib]; if (p && p.vibrationActuator) p.vibrationActuator.playEffect('dual-rumble', { duration: 400, strongMagnitude: 0.7, weakMagnitude: 0.4 }).catch(() => {}); return; }
          const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a, out = q(V, '[data-sens]');
          if (k === 'names') { try { const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }); s.getTracks().forEach(t => t.stop()); } catch { try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); } catch { /* sin permiso */ } } draw(); }
          if (k === 'test') { try { stop(); stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); const v = q(V, '[data-prev]'); v.srcObject = stream; v.play(); ac = new (window.AudioContext || window.webkitAudioContext)(); const an = ac.createAnalyser(); ac.createMediaStreamSource(stream).connect(an); const arr = new Uint8Array(an.fftSize); const loop = () => { if (!stream) return; an.getByteTimeDomainData(arr); let m = 0; for (const x of arr) m = Math.max(m, Math.abs(x - 128)); const l = q(V, '[data-lvl]'); if (l) l.style.width = Math.min(100, m / 128 * 180) + '%'; raf = requestAnimationFrame(loop); }; loop(); } catch (er) { K.ui.alert(tr('Sin acceso'), er.message || ''); } }
          if (k === 'beep') { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.frequency.value = 660; g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.6); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.65); setTimeout(() => c.close(), 900); }
          if (k === 'stop') stop();
          if (k === 'fs') { try { document.documentElement.requestFullscreen(); } catch { /* ignorar */ } }
          if (k === 'vibrate') navigator.vibrate([120, 60, 120]);
          if (k === 'orient') { try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) await DeviceOrientationEvent.requestPermission(); } catch { /* iOS */ } let got = false; const h = ev => { got = true; out.textContent = `α ${Math.round(ev.alpha || 0)}° · β ${Math.round(ev.beta || 0)}° · γ ${Math.round(ev.gamma || 0)}°`; }; window.addEventListener('deviceorientation', h); out.textContent = tr('Mueve el dispositivo…'); setTimeout(() => { window.removeEventListener('deviceorientation', h); if (!got) out.textContent = tr('Este dispositivo no tiene sensor de orientación o no envía datos.'); }, 4000); }
          if (k === 'geo') { out.textContent = tr('Buscando…'); navigator.geolocation.getCurrentPosition(p => { out.textContent = `${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)} (± ${Math.round(p.coords.accuracy)} m)`; }, er => { out.textContent = tr('No disponible') + ': ' + er.message; }, { timeout: 10000 }); }
          if (k === 'wake') { try { const l = await navigator.wakeLock.request('screen'); out.textContent = tr('La pantalla se mantendrá encendida mientras esta ventana esté visible.'); l.addEventListener('release', () => { out.textContent = tr('Bloqueo de pantalla liberado.'); }); } catch (er) { out.textContent = er.message; } }
        });
        draw(); this._draw = draw;
      },
      onClose: stop, destroy: stop
    };
  })());

  /* ===================== Información del sistema ===================== */
  const FEATURES = () => {
    const c = document.createElement('canvas'); let gl = null, gl2 = null; try { gl2 = !!c.getContext('webgl2'); gl = gl2 || !!c.getContext('webgl'); } catch { /* sin WebGL */ }
    const css = s => { try { return CSS.supports(s); } catch { return false; } };
    return [
      ['IndexedDB', 'indexedDB' in window, 'Archivos, bóveda y perfiles'], ['Web Crypto', !!(window.crypto && crypto.subtle), 'Bóveda cifrada, PIN e integridad'], ['Service Worker', 'serviceWorker' in navigator, 'Funcionar sin conexión'], ['Contexto seguro (HTTPS)', !!window.isSecureContext, 'Cámara, micrófono, portapapeles y otras API'],
      ['Compresión (Streams)', 'CompressionStream' in window && 'DecompressionStream' in window, 'ZIP, EPUB y chat P2P'], ['Acceso a carpetas del dispositivo', 'showDirectoryPicker' in window, 'Explorador de proyectos'], ['WebRTC', 'RTCPeerConnection' in window, 'Chat P2P'], ['Grabación (MediaRecorder)', 'MediaRecorder' in window, 'Grabadora y Editor de audio'],
      ['Cámara y micrófono', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), 'Cámara, Escáner, Videollamadas'], ['Mandos (Gamepad)', 'getGamepads' in navigator, 'Juegos y navegación con mando'], ['Web Audio', 'AudioContext' in window || 'webkitAudioContext' in window, 'Piano, Editor de audio y sonidos'], ['Síntesis de voz', 'speechSynthesis' in window, 'Lectura en voz alta del asistente'],
      ['Reconocimiento de voz', 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window, 'Dictado al asistente'], ['Notificaciones del sistema', 'Notification' in window, 'Alarmas y recordatorios'], ['Portapapeles', !!(navigator.clipboard && navigator.clipboard.writeText), 'Copiar y pegar'], ['Compartir (Web Share)', 'share' in navigator, 'Compartir archivos'],
      ['Web Workers', 'Worker' in window, 'Consola y pruebas aisladas'], ['BroadcastChannel', 'BroadcastChannel' in window, 'Chat entre pestañas'], ['WebGL / WebGL2', gl ? (gl2 ? 'WebGL2' : 'WebGL') : false, 'Gráficos 3D de juegos'], ['WebGPU', 'gpu' in navigator, 'Reservado para futuras apps'],
      ['Pantalla completa', !!document.documentElement.requestFullscreen, 'Presentaciones y juegos'], ['Mantener pantalla encendida', 'wakeLock' in navigator, 'Presentaciones y lectura'], ['Almacenamiento persistente', !!(navigator.storage && navigator.storage.persist), 'Proteger datos'], ['CSS color-mix()', css('color: color-mix(in srgb, red 50%, blue)'), 'Colores del tema'],
      ['CSS backdrop-filter', css('backdrop-filter: blur(4px)') || css('-webkit-backdrop-filter: blur(4px)'), 'Efecto cristal'], ['CSS :has()', css('selector(:has(a))'), 'Estilos avanzados'], ['Intl (formatos regionales)', typeof Intl !== 'undefined' && !!Intl.RelativeTimeFormat, 'Fechas y números en 20 idiomas'], ['structuredClone', 'structuredClone' in window, 'Copias de datos']
    ];
  };
  K.features = FEATURES;
  function sysReport() {
    const ua = navigator.userAgentData, brands = ua && ua.brands ? ua.brands.filter(x => !/Not.?A.?Brand/i.test(x.brand)).map(x => x.brand + ' ' + x.version).join(', ') : '';
    return { eisenku: { version: K.version, edition: K.edition, build: K.build, schema: S.get('os9_schema', 1), env: S.get('env', 'windows'), lang: (window.EISEN_I18N || {}).lang || 'es', profiles: K.profiles.list().length }, browser: { ua: navigator.userAgent, brands, platform: (ua && ua.platform) || navigator.platform, mobile: ua ? ua.mobile : /Mobi/i.test(navigator.userAgent), lang: navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, online: navigator.onLine, secure: !!window.isSecureContext, standalone: matchMedia('(display-mode: standalone)').matches }, hardware: { cores: navigator.hardwareConcurrency || null, memoryGB: navigator.deviceMemory || null, screen: `${screen.width}x${screen.height}@${devicePixelRatio}`, touch: navigator.maxTouchPoints || 0 }, features: FEATURES().map(([n, ok]) => [n, !!ok]) };
  }
  K.sysReport = sysReport;
  K.define('sysinfo', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-bar"><b class="k9-small">${esc(tr('Información del sistema'))}</b><span class="sp"></span><button class="k9-btn" data-a="copy">${I('copy', 14)} ${esc(tr('Copiar informe'))}</button><button class="k9-btn" data-a="json">${I('download', 14)} JSON</button></div><div class="k9-body" data-v></div></div>`;
      const r = sysReport(), F2 = FEATURES(), okN = F2.filter(x => x[1]).length;
      q(b, '[data-v]').innerHTML = `<div class="k9-grid" style="--min:260px"><div class="k9-card"><h4><img src="icon.svg" width="20" height="20" alt=""> EISENKU OS</h4><dl class="a9-dl"><dt>${esc(tr('Versión'))}</dt><dd>${esc(r.eisenku.version)} ${esc(r.eisenku.edition)}</dd><dt>Build</dt><dd>${esc(r.eisenku.build)}</dd><dt>${esc(tr('Esquema de datos'))}</dt><dd>${esc(String(r.eisenku.schema))}</dd><dt>${esc(tr('Entorno'))}</dt><dd>${esc(r.eisenku.env === 'linux' ? 'Linux Mode' : 'Windows Mode')}</dd><dt>${esc(tr('Idioma'))}</dt><dd>${esc(r.eisenku.lang)}</dd><dt>${esc(tr('Perfiles'))}</dt><dd>${r.eisenku.profiles || 1}</dd></dl></div>
        <div class="k9-card"><h4>${I('globe', 16)} ${esc(tr('Navegador'))}</h4><dl class="a9-dl"><dt>${esc(tr('Navegador'))}</dt><dd>${esc(r.browser.brands || r.browser.ua.slice(0, 90))}</dd><dt>${esc(tr('Plataforma'))}</dt><dd>${esc(r.browser.platform || '—')}${r.browser.mobile ? ' · ' + esc(tr('móvil')) : ''}</dd><dt>${esc(tr('Zona horaria'))}</dt><dd>${esc(r.browser.tz)}</dd><dt>${esc(tr('Contexto seguro'))}</dt><dd>${r.browser.secure ? '✓' : '✕ (' + esc(tr('abre EISENKU por https o localhost')) + ')'}</dd><dt>${esc(tr('Instalado como app'))}</dt><dd>${r.browser.standalone ? '✓' : '—'}</dd></dl></div>
        <div class="k9-card"><h4>${I('cpu', 16)} ${esc(tr('Hardware disponible'))}</h4><dl class="a9-dl"><dt>${esc(tr('Núcleos lógicos'))}</dt><dd>${r.hardware.cores || '—'}</dd><dt>${esc(tr('Memoria (aprox.)'))}</dt><dd>${r.hardware.memoryGB ? '≥ ' + r.hardware.memoryGB + ' GB' : '—'}</dd><dt>${esc(tr('Pantalla'))}</dt><dd>${esc(r.hardware.screen)}</dd><dt>${esc(tr('Táctil'))}</dt><dd>${r.hardware.touch ? '✓' : '—'}</dd></dl><p class="k9-small k9-muted" style="margin-top:6px">${esc(tr('Los navegadores redondean estos datos a propósito para proteger tu privacidad.'))}</p></div></div>
        <div class="k9-card" style="margin-top:10px"><h4>${I('check', 16)} ${esc(tr('Compatibilidad de funciones'))} <span class="k9-badge ${okN === F2.length ? 'g' : ''}">${okN}/${F2.length}</span></h4><table class="k9-table"><thead><tr><th>${esc(tr('Función del navegador'))}</th><th>${esc(tr('Estado'))}</th><th>${esc(tr('Se usa en'))}</th></tr></thead><tbody>${F2.map(([n, ok, use]) => `<tr><td>${esc(tr(n))}</td><td>${ok ? `<span class="k9-ok">✓ ${typeof ok === 'string' ? esc(ok) : ''}</span>` : '<span class="k9-bad">✕</span>'}</td><td class="k9-muted">${esc(tr(use))}</td></tr>`).join('')}</tbody></table></div>`;
      b.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (!a) return; const rep = sysReport(); if (a.dataset.a === 'copy') K.ui.copy(`EISENKU OS ${rep.eisenku.version} ${rep.eisenku.edition} (build ${rep.eisenku.build})\n${rep.browser.brands || rep.browser.ua}\n${rep.browser.platform} · ${rep.hardware.cores || '?'} núcleos · ${rep.hardware.memoryGB || '?'} GB · ${rep.hardware.screen}\n` + rep.features.map(([n, ok]) => (ok ? '✓ ' : '✕ ') + n).join('\n')); else devDownload('eisenku_sistema.json', new Blob([JSON.stringify(rep, null, 2)], { type: 'application/json' })); });
    }
  });

  /* ===================== Administrador de sesiones ===================== */
  K.layout = K.layout || {
    capture() { return [...document.querySelectorAll('.window.open:not(.s9-closing)')].map(w => ({ id: w.id.slice(4), l: w.style.left, t: w.style.top, w: w.style.width, h: w.style.height, max: w.classList.contains('maximized'), min: w.classList.contains('minimized'), desk: +w.dataset.desk || 0 })).filter(x => x.id && x.id !== 'sessions'); },
    async restore(wins) {
      for (const x of wins || []) {
        if (!E.REG[x.id] && !document.getElementById('win-' + x.id)) continue;
        try { E.launch(x.id); } catch { continue; }
        await new Promise(r => setTimeout(r, 60));
        const w = document.getElementById('win-' + x.id); if (!w) continue;
        if (!x.max) Object.assign(w.style, { left: x.l, top: x.t, width: x.w, height: x.h });
        if (x.max && !w.classList.contains('maximized')) { const m = w.querySelector('[data-act="max"]'); if (m) m.click(); }
        if (x.desk) { w.dataset.desk = x.desk; } if (x.min) { const m = w.querySelector('[data-act="min"]'); if (m) m.click(); }
      }
      if (K.desks) K.desks.apply();
    }
  };
  K.define('sessions', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]'); let tick = null;
      const layouts = () => S.get('os9_layouts', []) || [];
      function draw() {
        const me = K.profiles.current(), list = K.profiles.list(), up = Date.now() - (performance.timeOrigin || Date.now());
        V.innerHTML = `<div class="k9-card"><h4>${I('user', 16)} ${esc(tr('Sesión actual'))}</h4><div class="k9-row"><div class="s9-lg-av" style="width:44px;height:44px;font-size:18px;background:${esc(me.color || '#1f8160')}">${esc(me.avatar || (me.name || '?')[0].toUpperCase())}</div><div style="flex:1"><b>${esc(me.name || 'Eisen')}</b><div class="k9-small k9-muted">${esc(tr('Iniciada'))} ${esc(K.fmt.dt(Date.now() - up))} · ${esc(tr('Duración'))}: <span data-up></span> · ${document.querySelectorAll('.window.open').length} ${esc(tr('ventanas abiertas'))}</div></div><button class="k9-btn" data-a="lock">${I('lock', 14)} ${esc(tr('Bloquear'))}</button><button class="k9-btn" data-a="switch">${I('user', 14)} ${esc(tr('Cambiar de usuario'))}</button></div></div>
          <div class="k9-card"><h4>${I('users', 16)} ${esc(tr('Perfiles en este dispositivo'))}</h4>${list.map(p => `<div class="k9-li"><div class="s9-lg-av" style="width:30px;height:30px;font-size:13px;background:${esc(p.color || '#1f8160')}">${esc(p.avatar || (p.name || '?')[0].toUpperCase())}</div><div class="t"><b>${esc(p.name)}${p.id === me.id ? ' · ' + esc(tr('actual')) : ''}</b><small>${p.pin ? '🔒 ' + esc(tr('con PIN')) : esc(tr('sin PIN'))}</small></div>${p.id !== me.id ? `<button class="k9-btn" data-to="${esc(p.id)}">${esc(tr('Entrar'))}</button>` : ''}</div>`).join('') || `<p class="k9-small k9-muted">${esc(tr('Solo hay un perfil.'))}</p>`}<button class="k9-btn" data-a="accounts" style="margin-top:6px">${I('settings', 14)} ${esc(tr('Gestionar perfiles y PIN'))}</button></div>
          <div class="k9-card"><h4>${I('layers', 16)} ${esc(tr('Disposiciones de ventanas'))}</h4><div class="k9-row" style="margin-bottom:8px"><button class="k9-btn pri" data-a="save">${I('save', 14)} ${esc(tr('Guardar disposición actual'))}</button><button class="k9-btn" data-a="closeall">${esc(tr('Cerrar todas las ventanas'))}</button><label class="k9-row k9-small"><input type="checkbox" class="k9-switch" data-rl ${K.pref('restoreLayout') ? 'checked' : ''}> ${esc(tr('Restaurar mis ventanas al iniciar'))}</label></div>${layouts().map((l, i) => `<div class="k9-li"><div class="t"><b>${esc(l.name)}</b><small>${l.wins.length} ${esc(tr('ventanas'))} · ${esc(K.fmt.dt(l.at))} · ${esc(l.wins.map(x => (E.REG[x.id] || {}).name || x.id).slice(0, 5).join(', '))}</small></div><button class="k9-btn" data-rest="${i}">${esc(tr('Restaurar'))}</button><button class="k9-btn dng" data-del="${i}" aria-label="${esc(tr('Eliminar'))}">✕</button></div>`).join('') || `<p class="k9-small k9-muted">${esc(tr('Guarda tus ventanas abiertas (posición, tamaño y escritorio) para recuperarlas después.'))}</p>`}</div>`;
        const upd = () => { const el = q(V, '[data-up]'); if (!el) return; const s = Math.floor((performance.now()) / 1000); el.textContent = `${Math.floor(s / 3600)} h ${Math.floor(s / 60) % 60} min`; }; upd(); clearInterval(tick); tick = setInterval(upd, 30000);
      }
      b.addEventListener('click', async e => {
        const t = e.target;
        const to = t.closest('[data-to]'); if (to) { K.login.show('switch'); return; }
        const r = t.closest('[data-rest]'); if (r) { K.layout.restore(layouts()[+r.dataset.rest].wins); return; }
        const d = t.closest('[data-del]'); if (d) { const l = layouts(); l.splice(+d.dataset.del, 1); S.set('os9_layouts', l); draw(); return; }
        const a = t.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'lock') E.lock9(); if (k === 'switch') K.login.show('switch'); if (k === 'accounts') E.launch('settings', 'accounts');
        if (k === 'save') { const wins = K.layout.capture(); if (!wins.length) return E.toast(tr('No hay ventanas abiertas')); const n = await K.ui.prompt(tr('Guardar disposición'), tr('Nombre'), tr('Mi espacio de trabajo')); if (!n) return; const l = layouts(); l.unshift({ name: n.slice(0, 60), at: Date.now(), wins }); S.set('os9_layouts', l.slice(0, 12)); draw(); }
        if (k === 'closeall') { document.querySelectorAll('.window.open').forEach(w => { if (w.id !== 'win-sessions') { const c = w.querySelector('[data-act="close"]'); if (c) c.click(); } }); setTimeout(draw, 300); }
      });
      b.addEventListener('change', e => { if (e.target.matches('[data-rl]')) K.pref('restoreLayout', e.target.checked); });
      draw(); this.onOpen = draw; this._t = () => clearInterval(tick);
    },
    destroy() { if (this._t) this._t(); }
  });

  /* ===================== Centro de seguridad ===================== */
  async function securityChecks() {
    const me = K.profiles.current(), list = K.profiles.list(), lastBk = S.get('os9_last_backup', 0), vault = get('vault', null);
    const third = Object.values(E.REG).filter(a => a.thirdParty && E.isInstalled(a.id)), risky = third.filter(a => K.perms.declared(a.id).some(p => (K.PERMS[p] || {}).risk >= 3 && K.perms.has(a.id, p)));
    const sites = Object.entries(S.get('os9_siteperms', {}) || {}).filter(([, l]) => l.some(p => /camera|microphone|geolocation|display/.test(p)));
    const csp = K.seclogList().filter(x => x.type === 'csp' && Date.now() - x.t < 7 * 864e5).length, bad = K.integrity.storage().bad.length;
    const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted().catch(() => false) : null;
    const pu = S.get('browser_proxy_url', '') || '';
    const files = await F.all().catch(() => []); const exe = files.filter(f => /\.(exe|msi|bat|cmd|ps1|vbs|scr|jar|apk|com|sh)$/i.test(f.name)), dbl = files.filter(f => /\.(jpe?g|png|pdf|docx?|txt|mp[34])\.(exe|bat|cmd|scr|js|vbs|html?)$/i.test(f.name));
    return [
      { id: 'secure', ok: !!window.isSecureContext, t: 'Conexión segura', d: window.isSecureContext ? 'EISENKU se sirve por HTTPS o localhost.' : 'Abre EISENKU por https:// o con INICIAR.bat (localhost): algunas protecciones del navegador no se activan por http://.', w: 3 },
      { id: 'pin', ok: !!me.pin, t: 'PIN del perfil', d: me.pin ? 'Tu perfil está protegido con PIN (con bloqueo tras varios intentos).' : 'Cualquiera con acceso a este dispositivo puede entrar en tu escritorio.', act: ['Poner PIN', () => E.launch('settings', 'accounts')], w: 2 },
      { id: 'autolock', ok: +K.pref('autoLock') > 0, t: 'Bloqueo automático', d: +K.pref('autoLock') > 0 ? `Se bloquea tras ${K.pref('autoLock')} min de inactividad.` : 'La sesión no se bloquea sola.', act: ['Configurar', () => E.launch('settings', 'security')], w: 1 },
      { id: 'backup', ok: lastBk && Date.now() - lastBk < 30 * 864e5, t: 'Copia de seguridad reciente', d: lastBk ? 'Última copia: ' + K.fmt.dt(lastBk) : 'Aún no has hecho ninguna copia completa. Si el navegador borra sus datos, lo perderías todo.', act: ['Crear copia', () => E.launch('settings', 'backup')], w: 2 },
      { id: 'persist', ok: persisted !== false, t: 'Almacenamiento persistente', d: persisted ? 'El navegador no borrará tus datos automáticamente.' : persisted === null ? 'No disponible en este navegador.' : 'El navegador podría borrar los datos si falta espacio.', act: ['Proteger', () => E.launch('storagemon')], w: 1 },
      { id: 'third', ok: !risky.length, t: 'Apps de terceros', d: third.length ? `${third.length} instaladas${risky.length ? ', ' + risky.length + ' con permisos sensibles: ' + risky.map(a => a.name).join(', ') : ', todas aisladas y sin permisos sensibles'}.` : 'No hay apps de terceros. Las que instales se ejecutan aisladas.', act: risky.length ? ['Revisar permisos', () => E.launch('permissions')] : null, w: 2 },
      { id: 'sites', ok: !sites.length, t: 'Sitios con cámara, micrófono o ubicación', d: sites.length ? sites.map(s => s[0]).join(', ') : 'Ningún sitio tiene permisos sensibles.', act: sites.length ? ['Revisar', () => E.launch('permissions', { tab: 'sites' })] : null, w: 1 },
      { id: 'proxy', ok: !pu || /^https:/i.test(pu) || /^http:\/\/(localhost|127\.)/i.test(pu), t: 'Proxy del navegador', d: pu ? 'Personalizado: ' + pu.slice(0, 60) : 'Se usa el proxy propio de tu servidor (o ninguno).', act: ['Configurar red', () => E.launch('netconfig')], w: 2 },
      { id: 'vault', ok: true, t: 'Contraseñas', d: vault ? 'Bóveda cifrada creada (AES-256-GCM).' : 'Guarda tus contraseñas en el Gestor de contraseñas cifrado en lugar de en notas.', act: vault ? null : ['Abrir gestor', () => E.launch('passwords')], w: 0 },
      { id: 'files', ok: !dbl.length, t: 'Archivos sospechosos', d: dbl.length ? `${dbl.length} archivos con doble extensión (p. ej. ${dbl[0].name}). Suele ser un truco de malware.` : exe.length ? `${exe.length} ejecutables guardados (EISENKU no los ejecuta; ten cuidado si los abres fuera).` : 'No se han encontrado archivos con extensiones engañosas.', w: 2 },
      { id: 'data', ok: !bad, t: 'Integridad de los datos', d: bad ? `${bad} elementos guardados están dañados.` : 'Todos los datos guardados se leen correctamente.', act: bad ? ['Reparar', () => E.launch('maintenance')] : null, w: 1 },
      { id: 'csp', ok: csp < 20, t: 'Bloqueos de la política de seguridad', d: csp ? `${csp} recursos bloqueados por CSP en los últimos 7 días (normalmente anuncios o rastreadores de páginas).` : 'Sin bloqueos recientes.', w: 0 },
      { id: 'multi', ok: list.length < 2 || list.every(p => p.pin), t: 'Perfiles sin PIN', d: list.length > 1 ? list.filter(p => !p.pin).map(p => p.name).join(', ') || 'Todos los perfiles tienen PIN.' : 'Un único perfil.', w: 1 }
    ];
  }
  K.securityChecks = securityChecks;
  K.define('security', {
    init(b) {
      let tab = 'status', lvl = '', typ = '';
      b.innerHTML = `<div class="k9">${tabsUi([['status', 'Estado'], ['log', 'Registro de eventos'], ['tips', 'Recomendaciones']], tab)}<div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]'); let acts = [];
      async function draw() {
        qa(b, '[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
        if (tab === 'status') {
          K.ui.loading(V, tr('Analizando…')); const c = await securityChecks(); acts = c;
          const tot = c.reduce((a, x) => a + x.w, 0), got = c.reduce((a, x) => a + (x.ok ? x.w : 0), 0), sc = Math.round(got / Math.max(1, tot) * 100);
          V.innerHTML = `<div class="k9-card a9-sec-hero ${sc >= 85 ? 'ok' : sc >= 60 ? 'mid' : 'bad'}"><div class="a9-sec-score"><b>${sc}</b><small>/100</small></div><div><h3>${esc(sc >= 85 ? tr('Buena protección') : sc >= 60 ? tr('Protección mejorable') : tr('Necesita atención'))}</h3><p class="k9-small">${c.filter(x => !x.ok).length} ${esc(tr('aspectos por revisar'))} · ${esc(tr('Analizado'))} ${esc(K.fmt.time(Date.now()))}</p></div><span style="flex:1"></span><button class="k9-btn" data-a="rescan">${I('refresh', 14)} ${esc(tr('Analizar de nuevo'))}</button></div>${c.map((x, i) => `<div class="k9-li a9-sec-it"><span class="k9-dot ${x.ok ? 'g' : x.w >= 2 ? 'd' : 'w'}"></span><div class="t"><b>${esc(tr(x.t))}</b><small style="white-space:normal">${esc(tr(x.d))}</small></div>${!x.ok && x.act ? `<button class="k9-btn pri" data-act="${i}">${esc(tr(x.act[0]))}</button>` : x.act && x.ok ? '' : ''}</div>`).join('')}`;
          K.seclog('security', `Análisis de seguridad: ${sc}/100`);
        }
        if (tab === 'log') {
          const all = K.seclogList(), types = [...new Set(all.map(x => x.type))].sort(), l = all.filter(x => (!lvl || x.level === lvl) && (!typ || x.type === typ));
          V.innerHTML = `<div class="k9-row" style="margin-bottom:8px"><select class="input-text" data-typ><option value="">${esc(tr('Todos los tipos'))}</option>${types.map(t => `<option${t === typ ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select><select class="input-text" data-lvl><option value="">${esc(tr('Todos los niveles'))}</option><option value="warn"${lvl === 'warn' ? ' selected' : ''}>${esc(tr('Avisos'))}</option><option value="info"${lvl === 'info' ? ' selected' : ''}>${esc(tr('Información'))}</option></select><span style="flex:1"></span><button class="k9-btn" data-a="export">${I('download', 14)} ${esc(tr('Exportar'))}</button><button class="k9-btn dng" data-a="clear">${I('trash', 14)} ${esc(tr('Vaciar'))}</button></div><div class="k9-card" style="padding:2px 8px">${l.slice(0, 300).map(x => `<div class="k9-li"><small class="k9-muted" style="width:120px;flex-shrink:0">${esc(K.fmt.dt(x.t))}</small><span class="k9-badge${x.level === 'warn' ? ' w' : ''}">${esc(x.type)}</span><div class="t"><b style="font-weight:500;white-space:normal">${esc(x.msg)}</b></div></div>`).join('') || `<p class="k9-small k9-muted" style="padding:8px">${esc(tr('Sin eventos.'))}</p>`}</div>`;
        }
        if (tab === 'tips') V.innerHTML = `<div class="k9-card md-view">${K.md(tr('security_tips') !== 'security_tips' ? tr('security_tips') : `### ${'Buenas prácticas'}\n\n- Pon un **PIN** a tu perfil y activa el **bloqueo automático** si compartes el dispositivo.\n- Haz una **copia de seguridad completa** cada semana (Configuración › Copias de seguridad) y guárdala fuera del navegador.\n- Instala apps de terceros solo de fuentes de confianza. EISENKU las aísla, pero revisa los permisos que piden.\n- Concede cámara, micrófono o ubicación solo a los sitios que lo necesiten, y retíralos cuando acabes.\n- Si publicas EISENKU en Internet, define **AI_ACCESS_CODE** para que nadie gaste tu cuota de IA, y no compartas la clave de la API.\n- No abras fuera de EISENKU archivos con doble extensión (\`foto.jpg.exe\`).\n- La navegación privada no te hace anónimo: solo evita que EISENKU guarde historial y datos.`).html}</div>`;
      }
      b.addEventListener('click', e => {
        const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; draw(); return; }
        const ac = e.target.closest('[data-act]'); if (ac) { const x = acts[+ac.dataset.act]; if (x && x.act) x.act[1](); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'rescan') draw();
        if (k === 'export') devDownload('eisenku_registro_seguridad.json', new Blob([JSON.stringify(K.seclogList(), null, 2)], { type: 'application/json' }));
        if (k === 'clear') E.confirm(tr('Vaciar registro'), tr('Se borrarán todos los eventos de seguridad.')).then(ok => { if (ok) { S.set('os9_seclog', []); K.seclog('security', 'Registro vaciado por el usuario'); draw(); } });
      });
      b.addEventListener('change', e => { if (e.target.matches('[data-typ]')) { typ = e.target.value; draw(); } if (e.target.matches('[data-lvl]')) { lvl = e.target.value; draw(); } });
      draw();
    }
  });

  /* ===================== Herramientas de mantenimiento ===================== */
  K.define('maintenance', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]');
      const tool = (id, ic, t, d, btn, danger) => `<div class="k9-li a9-tool"><span class="a9-tool-ic">${I(ic, 20)}</span><div class="t"><b>${esc(tr(t))}</b><small style="white-space:normal">${esc(tr(d))}</small></div><button class="k9-btn${danger ? ' dng' : ''}" data-t="${id}">${esc(tr(btn))}</button></div>`;
      function draw() {
        const bad = K.integrity.storage().bad.length;
        V.innerHTML = `<div class="k9-card" style="padding:4px 10px">${tool('repair', 'shield', 'Reparar datos dañados', bad ? `${bad} elementos guardados no se pueden leer. Se eliminarán para que las apps vuelvan a funcionar.` : 'Comprueba que todos los datos guardados se pueden leer.', bad ? 'Reparar' : 'Comprobar')}
          ${tool('cache', 'refresh', 'Limpiar cachés', 'Borra la caché de páginas del navegador de EISENKU y la caché sin conexión. No borra tus datos.', 'Limpiar')}
          ${tool('trash', 'trash', 'Vaciar la papelera', 'Elimina definitivamente los archivos de la papelera.', 'Vaciar', true)}
          ${tool('logs', 'list', 'Recortar registros', 'Reduce el historial de actividad, notificaciones y eventos a lo más reciente.', 'Recortar')}
          ${tool('windows', 'layers', 'Restablecer ventanas', 'Devuelve todas las ventanas a posiciones y tamaños visibles y olvida los tamaños guardados.', 'Restablecer')}
          ${tool('desktop', 'grid', 'Reorganizar iconos del escritorio', 'Coloca de nuevo los iconos del escritorio en la cuadrícula.', 'Reorganizar')}
          ${tool('safe', 'zap', 'Reiniciar en modo seguro', 'Arranca sin apps de inicio ni restaurar ventanas, para resolver problemas. Se desactiva al recargar.', 'Modo seguro')}
          ${tool('reload', 'power', 'Reiniciar la interfaz', 'Recarga EISENKU OS. Tus datos se conservan.', 'Reiniciar')}</div><p class="k9-small k9-muted" style="margin-top:8px">${esc(tr('Para restablecer EISENKU por completo ve a Configuración › Sistema. Antes de cualquier operación delicada se crea un punto de restauración.'))}</p>`;
      }
      b.addEventListener('click', async e => {
        const t = e.target.closest('[data-t]'); if (!t) return; const k = t.dataset.t;
        if (k === 'repair') { const bad = K.integrity.storage().bad; if (!bad.length) return E.toast(tr('Todo correcto: no hay datos dañados')); await K.backup.snapshot(tr('Antes de reparar datos')); K.integrity.repair(bad); E.toast(bad.length + ' ' + tr('elementos reparados')); draw(); }
        if (k === 'cache') { E.ebClearCache && E.ebClearCache(); let n = 0; try { if (window.caches) for (const c of await caches.keys()) if (/^eisenku/.test(c)) { await caches.delete(c); n++; } } catch { /* sin caché */ } K.seclog('maintenance', 'Cachés limpiadas'); E.toast(tr('Cachés limpiadas') + (n ? ` (${n})` : '')); }
        if (k === 'trash') { if (!await E.confirm(tr('Vaciar papelera'), tr('Los archivos se borrarán definitivamente.'))) return; const n = await F.emptyTrash(); E.toast(n + ' ' + tr('archivos eliminados')); }
        if (k === 'logs') { [['os9_activity', 100], ['notif_log', 30], ['os9_seclog', 120], ['browser_history', 1000], ['os9_downloads', 100]].forEach(([key, n]) => { const l = S.get(key, null); if (Array.isArray(l) && l.length > n) S.set(key, l.slice(0, n)); }); E.toast(tr('Registros recortados')); }
        if (k === 'windows') { S.del('win_sizes'); let i = 0; document.querySelectorAll('.window').forEach(w => { w.classList.remove('maximized'); const W = Math.min(900, innerWidth - 40), H = Math.min(600, innerHeight - 110); Object.assign(w.style, { width: W + 'px', height: H + 'px', left: Math.min(innerWidth - W, 60 + (i % 6) * 28) + 'px', top: Math.min(innerHeight - H - 60, 40 + (i % 6) * 26) + 'px' }); i++; }); E.toast(tr('Ventanas restablecidas')); }
        if (k === 'desktop') { const it = S.get('desk_items', null); if (Array.isArray(it)) { it.forEach(x => { delete x.x; delete x.y; delete x.pos; }); S.set('desk_items', it); } E.renderDesktop ? E.renderDesktop() : E.toast(tr('Se aplicará al reiniciar')); E.toast(tr('Iconos reorganizados')); }
        if (k === 'safe') { if (!await E.confirm(tr('Modo seguro'), tr('EISENKU se recargará sin apps de inicio ni ventanas restauradas.'))) return; try { sessionStorage.setItem('eisenku_safe', '1'); } catch { /* ignorar */ } location.reload(); }
        if (k === 'reload') location.reload();
      });
      draw();
    }
  });

  /* ===================== Panel de diagnóstico ===================== */
  K.define('diagnostics', {
    init(b) {
      b.innerHTML = `<div class="k9"><div class="k9-bar"><b class="k9-small">${esc(tr('Diagnóstico'))}</b><span class="sp"></span><button class="k9-btn pri" data-a="tests10">${I('check', 14)} ${esc(tr('Pruebas del sistema'))}</button><button class="k9-btn" data-a="fps">${I('pulse', 14)} ${esc(tr('Medir fluidez'))}</button><button class="k9-btn" data-a="refresh">${I('refresh', 14)}</button><button class="k9-btn pri" data-a="export">${I('download', 14)} ${esc(tr('Exportar informe'))}</button></div><div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]');
      const perf = () => { const nav = performance.getEntriesByType('navigation')[0] || {}; return { boot: K.bootMs || Math.round(nav.loadEventEnd || 0), dcl: Math.round(nav.domContentLoadedEventEnd || 0), heap: performance.memory ? performance.memory.usedJSHeapSize : null, heapLimit: performance.memory ? performance.memory.jsHeapSizeLimit : null, nodes: document.getElementsByTagName('*').length, windows: document.querySelectorAll('.window.open').length, modules: Object.keys(K.IMPL || {}).length, scripts: performance.getEntriesByType('resource').filter(r => r.initiatorType === 'script').length, ls: lsKeys().reduce((a, k) => a + lsSize(k), 0) }; };
      async function draw() {
        const p = perf(), errs = (K.errors || []).slice().reverse(), appErr = K.seclogList().filter(x => x.type === 'app').slice(0, 20);
        const sw = navigator.serviceWorker ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
        V.innerHTML = `<div class="k9-grid" style="--min:140px">${kpi(p.boot ? p.boot + ' ms' : '—', 'Arranque')}${kpi(p.heap ? esc(K.fmt.bytes(p.heap)) : '—', 'Memoria JS')}${kpi(p.nodes, 'Elementos en pantalla')}${kpi(p.windows, 'Ventanas abiertas')}${kpi(p.modules, 'Módulos 9.0 cargados')}${kpi(esc(K.fmt.bytes(p.ls)), 'Datos locales')}</div><div data-fps class="k9-small" style="margin:8px 2px"></div>
          <div class="k9-card"><h4>${I('shield', 16)} ${esc(tr('Errores de JavaScript capturados'))} <span class="k9-badge ${errs.length ? 'd' : 'g'}">${errs.length}</span></h4>${errs.slice(0, 40).map(x => `<div class="k9-li"><small class="k9-muted" style="width:70px;flex-shrink:0">${esc(K.fmt.time(x.t))}</small><div class="t"><b style="font-weight:500;white-space:normal">${esc(x.m)}</b><small>${esc(x.s || '')}</small></div></div>`).join('') || `<p class="k9-small k9-ok">✓ ${esc(tr('Ningún error desde que se inició EISENKU.'))}</p>`}</div>
          <div class="k9-card"><h4>${esc(tr('Errores al abrir apps'))}</h4>${appErr.map(x => `<div class="k9-li"><small class="k9-muted" style="width:120px">${esc(K.fmt.dt(x.t))}</small><div class="t"><b style="font-weight:500;white-space:normal">${esc(x.msg)}</b></div></div>`).join('') || `<p class="k9-small k9-ok">✓ ${esc(tr('Ninguno'))}</p>`}</div>
          <div class="k9-card"><h4>${esc(tr('Servicios'))}</h4><dl class="a9-dl"><dt>${esc(tr('Modo sin conexión'))}</dt><dd>${sw ? esc(tr('activo')) + ' (' + esc(sw.active ? sw.active.state : '…') + ')' : esc(tr('no registrado (normal al abrir como archivo local)'))}</dd><dt>${esc(tr('Contexto seguro'))}</dt><dd>${window.isSecureContext ? '✓' : '✕'}</dd><dt>${esc(tr('Modo de bajo consumo'))}</dt><dd>${document.documentElement.classList.contains('low-power') ? '✓' : '—'}</dd><dt>${esc(tr('Modo seguro'))}</dt><dd>${K.safeMode ? '✓' : '—'}</dd></dl></div>`;
      }
      b.addEventListener('click', async e => {
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'tests10') { K.ui.loading(V, tr('Preparando pruebas…')); await K.loadScript('js/os10/apps/system10.js'); K.ext.diag10.run(V); return; }
        if (k === 'refresh') draw();
        if (k === 'fps') { const el = q(V, '[data-fps]'); el.textContent = tr('Midiendo durante 2 segundos…'); let n = 0, worst = 0, last = performance.now(); const t0 = last; await new Promise(res => { const f = t => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < 2000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); const fps = Math.round(n / 2); el.innerHTML = `${esc(tr('Fluidez'))}: <b>${fps} fps</b> · ${esc(tr('peor fotograma'))} ${Math.round(worst)} ms · ${fps >= 50 ? '<span class="k9-ok">' + esc(tr('excelente')) + '</span>' : fps >= 30 ? esc(tr('aceptable')) : '<span class="k9-bad">' + esc(tr('lento: prueba el modo de bajo consumo')) + '</span>'}`; }
        if (k === 'export') { const rep = { generated: new Date().toISOString(), system: sysReport(), performance: perf(), errors: (K.errors || []).slice(-60), appErrors: K.seclogList().filter(x => x.type === 'app').slice(0, 30), security: K.seclogList().filter(x => x.level === 'warn').slice(0, 30).map(x => ({ t: x.t, type: x.type, msg: x.msg })), integrity: { badKeys: K.integrity.storage().bad.length }, note: 'Informe sin contenido personal: no incluye archivos, notas ni historial.' }; devDownload('eisenku_diagnostico.json', new Blob([JSON.stringify(rep, null, 2)], { type: 'application/json' })); }
      });
      draw(); this.onOpen = draw;
    }
  });

  /* ===================== Centro de bienvenida ===================== */
  K.define('welcome', {
    init(b) {
      let tab = 'start';
      b.innerHTML = `<div class="k9"><div class="a9-wel-hero"><img src="icon.svg" width="56" height="56" alt=""><div><h2>${esc(tr('Te damos la bienvenida a') + ' EISENKU OS ' + K.version.split('.')[0] + '.0')}</h2><p>${esc(K.edition + ' · ' + tr('Un sistema de escritorio completo que funciona en tu navegador: PC, tablet, móvil y Xbox.'))}</p></div></div>${tabsUi([['start', 'Primeros pasos'], ['tours', 'Tutoriales interactivos'], ['news', 'Novedades']], tab)}<div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]');
      const STEPS = [['env', 'monitor', 'Elige tu escritorio', 'Linux Mode o Windows Mode: cambia la organización completa de la interfaz.', () => E.launch('settings', 'env')], ['lang', 'globe', 'Idioma y región', '20 idiomas, formatos de fecha y hora de tu región.', () => E.launch('settings', 'lang')], ['look', 'palette', 'Personaliza el aspecto', 'Tema, color de acento, fondos, densidad y efectos.', () => E.launch('settings', 'appearance')], ['pin', 'lock', 'Protege tu perfil', 'Pon un PIN y activa el bloqueo automático.', () => E.launch('settings', 'accounts')], ['files', 'folder', 'Trae tus archivos', 'Importa archivos o carpetas completas a Archivos.', () => E.launch('explorer')], ['apps', 'store', 'Descubre apps', 'Instala más apps desde el EISENKU App Center.', () => E.launch('appcenter')], ['backup', 'save', 'Haz una copia de seguridad', 'Exporta tus datos y archivos en un solo archivo.', () => E.launch('settings', 'backup')], ['help', 'book', 'Lee el Handbook', 'La guía oficial: 25 capítulos con buscador.', () => E.launch('handbook')]];
      function draw() {
        qa(b, '[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
        const done = get('welcome_done', []) || [];
        if (tab === 'start') V.innerHTML = `<div class="k9-row" style="margin-bottom:10px"><b class="k9-small">${done.length}/${STEPS.length} ${esc(tr('completados'))}</b>${meter(done.length / STEPS.length * 100)}<button class="k9-btn" data-a="wizard">${I('sparkle', 14)} ${esc(tr('Asistente de configuración inicial'))}</button></div><div class="k9-grid" style="--min:230px">${STEPS.map(([id, ic, t, d]) => `<button class="k9-card a9-wel-step${done.includes(id) ? ' done' : ''}" data-step="${id}">${I(done.includes(id) ? 'check' : ic, 22)}<b>${esc(tr(t))}</b><small>${esc(tr(d))}</small></button>`).join('')}</div>`;
        if (tab === 'tours') V.innerHTML = `<p class="k9-small k9-muted" style="margin-bottom:10px">${esc(tr('Cada tutorial te guía paso a paso sobre la interfaz real: resalta dónde tienes que pulsar y espera a que lo hagas.'))}</p><div class="k9-grid" style="--min:240px">${(K.TUTORIALS || []).map((t, i) => `<button class="k9-card a9-wel-step" data-tour="${i}">${I(t.icon || 'sparkle', 22)}<b>${esc(tr(t.title))}</b><small>${esc(tr(t.desc))} · ${t.steps.length} ${esc(tr('pasos'))}</small></button>`).join('') || `<p class="k9-muted">${esc(tr('No disponible'))}</p>`}</div>`;
        if (tab === 'news') V.innerHTML = `<div class="k9-card md-view">${K.md(NOVEDADES).html}</div>`;
      }
      b.addEventListener('click', e => {
        const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; draw(); return; }
        const st = e.target.closest('[data-step]'); if (st) { const s = STEPS.find(x => x[0] === st.dataset.step); const done = get('welcome_done', []) || []; if (!done.includes(s[0])) put('welcome_done', done.concat(s[0])); s[4](); setTimeout(draw, 200); return; }
        const to = e.target.closest('[data-tour]'); if (to) { const t = K.TUTORIALS[+to.dataset.tour]; if (t && K.tour) K.tour(t); return; }
        const a = e.target.closest('[data-a="wizard"]'); if (a) { if (K.welcomeWizard) K.welcomeWizard(true); else E.launch('settings', 'env'); }
      });
      draw(); this.onArg = a2 => { if (a2 && a2.tab) { tab = a2.tab; draw(); } };
    }
  });
})();

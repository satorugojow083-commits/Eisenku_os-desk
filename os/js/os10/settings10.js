/* =====================================================================
   EISENKU OS 10.0 NEXT GENERATION · Configuración profesional (25 categorías)
   Rellena los apartados nuevos y amplía los existentes a través de K.cfgUI (settings9.js).
   Cada opción cambia algo real; el buscador de Configuración y la búsqueda global (Ctrl+K)
   indexan automáticamente todas las tarjetas.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, U = K && K.cfgUI; if (!E || !K || !U || !K.v10) return;
  const S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, $ = K.$, $$ = K.$$, html = document.documentElement;
  const { add, card, row, sw, sel, range, btn } = U;
  const sv = id => `<input type="checkbox" class="k9-switch" data-svc="${id}" aria-label="${esc(id)}">`;   // interruptor de servicio
  const cfgIn = (app, k, type = 'checkbox', extra = '') => type === 'checkbox' ? `<input type="checkbox" class="k9-switch" data-cfg="${app}.${k}" aria-label="${esc(k)}">` : `<select class="input-text" data-cfg="${app}.${k}" ${extra}></select>`;
  const appName = id => ((E.REG[id] || E.apps().find(a => a.id === id) || {}).name || id);
  const L = id => E.launch(id);
  Object.assign(K.PREF_DEF, { autoLow: true, devFps: false, devOutline: false, devIds: false, storeNotify: true });

  /* ===================== Personalización ===================== */
  const PACKS = [['eisenku', 'EISENKU (degradado)'], ['circle', 'Círculos'], ['flat', 'Plano'], ['outline', 'Contorno'], ['mono', 'Monocromo']];
  add('personal',
    card('Paquetes de iconos', 'grid', `<div class="s10-chips" data-packs>${PACKS.map(([v, l]) => `<button class="s10-chip" data-pack="${v}">${esc(tr(l))}</button>`).join('')}</div>`, 'Cambia el aspecto de los iconos de todas las apps en el escritorio, Inicio, la barra de tareas y el App Center.'),
    card('Temas personalizados', 'palette', `<div data-mythemes class="s10-chips"></div><div class="ui-row">${btn('thememgr', 'Abrir el Administrador de temas', 'palette')}</div>`, 'Crea, importa y exporta tus propios temas completos.'));
  const applyPack = () => { html.dataset.iconpack = S.get('os10_iconpack', 'eisenku') || 'eisenku'; };
  applyPack();
  // variables de color de un tema personalizado (Administrador de temas); solo --e9-* con valores de color o medida
  K.themeVars = {
    cur: [],
    apply(vars) { K.themeVars.cur.forEach(k => html.style.removeProperty(k)); K.themeVars.cur = []; Object.entries(vars || {}).forEach(([k, v]) => { if (/^--e9-[\w-]{1,30}$/.test(k) && /^[#\w(),.%\s+-]{1,60}$/.test(String(v)) && !/url|expression|javascript/i.test(String(v))) { html.style.setProperty(k, String(v)); K.themeVars.cur.push(k); } }); },
    set(vars) { S.set('os10_theme_vars', vars || null); K.themeVars.apply(vars); }
  };
  K.themeVars.apply(S.get('os10_theme_vars', null));
  U.renderers.personal = sec => {
    const cur = S.get('os10_iconpack', 'eisenku'); $$('[data-pack]', sec).forEach(b => b.classList.toggle('on', b.dataset.pack === cur));
    const l = S.get('os10_themes', []) || []; const el = sec.querySelector('[data-mythemes]'); if (el) el.innerHTML = l.map(t => `<button class="s10-chip" data-applytheme="${esc(t.id)}"><i style="width:12px;height:12px;border-radius:50%;background:${esc(t.accent || '#2a9d76')}"></i>${esc(t.name)}</button>`).join('') || `<span class="k9-muted k9-small">${esc(tr('Aún no has creado temas.'))}</span>`;
  };

  /* ===================== Escritorio ===================== */
  add('desktop',
    card('Barra de tareas (modo Windows) · 10.0', 'monitor', row('Tamaño', sel('tbSize', [['sm', 'Pequeña'], ['md', 'Normal'], ['lg', 'Grande']])) + row('Posición', sel('tbPos', [['bottom', 'Abajo'], ['top', 'Arriba']])) + row('Ocultar automáticamente', sw('tbAutohide'), 'Aparece al llevar el puntero al borde.') + row('Mostrar el nombre de las apps abiertas', sw('tbLabels')) + row('Segundos en el reloj', sw('clockSec')) + `<div class="s9-set"><div class="s9-lbl"><span>${esc(tr('Botones visibles'))}</span></div><div class="s9-ctl s10-chips" data-tbbtns>${[['search', 'Buscar'], ['taskview', 'Vista de tareas'], ['widgets', 'Widgets'], ['grid', 'Todas las apps'], ['weather', 'Clima']].map(([v, l]) => `<label class="s10-chip"><input type="checkbox" data-tbbtn="${v}"> ${esc(tr(l))}</label>`).join('')}</div></div>`),
    card('Paneles laterales', 'widgets', `<div class="ui-row">${btn('panel-left', 'Panel izquierdo', 'left')}${btn('panel-right', 'Panel derecho', 'right')}${btn('panel-cfg-left', 'Personalizar izquierdo', 'settings')}${btn('panel-cfg-right', 'Personalizar derecho', 'settings')}</div>` + row('Fijar paneles (las ventanas maximizadas les dejan sitio)', `<input type="checkbox" class="k9-switch" data-panelpin>`) + row('Abrir al llevar el puntero al borde', `<input type="checkbox" class="k9-switch" data-paneledge>`), 'Ctrl+Alt+P abre el panel derecho y Ctrl+Alt+O el izquierdo. Pueden mostrar cualquier widget.'),
    card('Widgets interactivos', 'widgets', row('Colocación libre (arrastra cada widget por su título)', sw('widgetFree')) + `<div class="ui-row">${btn('widgets', 'Elegir widgets…', 'widgets')}${btn('widgets-reset', 'Recolocar widgets', 'refresh')}</div>`, '20 widgets: calculadora, tareas, nota adhesiva, temporizador, relojes del mundo, rendimiento, portapapeles, fotos, cuenta atrás, batería, ideas, lanzador y escritorios, además de los de 9.0.'),
    card('Escritorios virtuales', 'layers', `<div data-desks></div>` + row('Fondo distinto por escritorio', sw('deskWall'), 'Elige el fondo de cada escritorio desde su menú contextual (Escritorios virtuales › Fondo solo para este escritorio).') + `<div class="ui-row">${btn('desk-add', 'Nuevo escritorio', 'plus')}${btn('overview', 'Vista general', 'layers')}</div>`),
    card('Perfiles de escritorio', 'save', `<div data-dprof></div><div class="ui-row">${btn('dprof-save', 'Guardar el escritorio actual…', 'plus', 'btn-primary')}</div>`, 'Un perfil guarda el entorno, el tema, el fondo, los iconos, los paneles, los widgets y la barra de tareas. Úsalo para cambiar entre «Escuela», «Trabajo» o «Juegos».'));
  U.renderers.desktop = sec => {
    const hid = K.pref('tbHide') || []; $$('[data-tbbtn]', sec).forEach(c => { c.checked = !hid.includes(c.dataset.tbbtn); });
    const pc = K.panels.cfg(); const pp = sec.querySelector('[data-panelpin]'); if (pp) pp.checked = !!pc.pin; const pe = sec.querySelector('[data-paneledge]'); if (pe) pe.checked = !!pc.edge;
    const D = K.desks, dk = sec.querySelector('[data-desks]'); if (dk) dk.innerHTML = Array.from({ length: D.count }, (_, i) => `<div class="s9-set"><div class="s9-lbl"><span>${esc(tr('Escritorio'))} ${i + 1}${i + 1 === D.cur ? ' · ' + esc(tr('actual')) : ''}</span></div><div class="s9-ctl"><input class="input-text" data-deskname="${i + 1}" value="${esc(D.names()[i + 1] || '')}" placeholder="${esc(D.name(i + 1))}" style="width:200px"></div></div>`).join('');
    const dp = sec.querySelector('[data-dprof]'); if (dp) { const l = K.deskProfiles.list(); dp.innerHTML = l.map(p => `<div class="k9-li"><div class="t"><b>${esc(p.name)} ${K.deskProfiles.active() === p.id ? `<span class="k9-badge g">${esc(tr('Activo'))}</span>` : ''}</b><small>${esc(K.fmt.dt(p.at))} · ${esc(p.env === 'linux' ? 'Linux Mode' : 'Windows Mode')}</small></div><button class="k9-btn" data-dpapply="${esc(p.id)}">${esc(tr('Aplicar'))}</button><button class="k9-btn dng" data-dpdel="${esc(p.id)}">${esc(tr('Eliminar'))}</button></div>`).join('') || `<p class="k9-muted k9-small">${esc(tr('Todavía no hay perfiles guardados.'))}</p>`; }
  };

  /* ===================== Ventanas y multitarea ===================== */
  add('windows',
    card('Ajuste de ventanas 10.0', 'grid', row('Mostrar los diseños al pasar sobre el botón maximizar', sw('snapFly'), 'También con clic derecho en ese botón o Alt+Shift+Z.') + row('Asistente para rellenar los huecos libres', sw('snapAssist')) + row('Ajustar a cuartos al arrastrar a las esquinas', sw('snapCorners')) + `<div class="ui-row">${btn('try-snap', 'Probar con la ventana activa', 'grid')}${btn('tile', 'Mosaico automático', 'grid')}${btn('cascade', 'Cascada', 'layers')}</div>`),
    card('Animaciones de ventanas', 'pulse', row('Estilo al abrir', sel('winAnim', [['zoom', 'Zoom (predeterminado)'], ['fade', 'Fundido'], ['slide', 'Deslizar'], ['none', 'Sin animación']])) + row('Velocidad', range('animSpeed', .5, 2, .25), 'Más a la derecha = más rápidas.')),
    card('Restauración de ventanas', 'history', row('Recordar el tamaño y la posición de cada app', sw('rememberGeom')) + row('Volver a abrir las ventanas de la última sesión al iniciar', sw('restoreLayout')) + `<div class="ui-row">${btn('forget-geom', 'Olvidar tamaños guardados', 'trash')}</div>`),
    card('Cambiar entre aplicaciones', 'layers', `<p class="k9-small">${esc(tr('Alt+Shift+W abre el conmutador (mantén Alt y repite W para avanzar); Ctrl+Alt+W muestra todas las ventanas a la vez; con el mando, LB y RB cambian de ventana.'))}</p><div class="ui-row">${btn('try-switch', 'Probar el conmutador', 'layers')}${btn('try-expose', 'Ver todas las ventanas', 'grid')}</div>`));

  /* ===================== Aplicaciones ===================== */
  add('apps',
    card('Aplicaciones predeterminadas', 'external', `<div data-openwith class="k9-small"></div>`, 'Las que eliges con «Abrir siempre con…» en Archivos.'),
    card('Inicio y compatibilidad', 'zap', `<div class="ui-row">${btn('startup', 'Administrador de inicio', 'zap')}${btn('compat', 'Administrador de compatibilidad', 'settings')}${btn('services', 'Servicios', 'puzzle')}</div>`));
  U.renderers.apps = sec => { const m = S.get('fs9_openwith', {}) || {}, el = sec.querySelector('[data-openwith]'); if (el) el.innerHTML = Object.keys(m).length ? Object.entries(m).map(([ext, app]) => `<div class="k9-li"><div class="t"><b>.${esc(ext)}</b><small>${esc(appName(app))}</small></div><button class="k9-btn" data-unopen="${esc(ext)}">${esc(tr('Quitar'))}</button></div>`).join('') : esc(tr('Ninguna: cada archivo se abre con la app recomendada.')); };

  /* ===================== Tienda de aplicaciones ===================== */
  const pending = () => Object.keys(E.REG).filter(id => E.isInstalled(id) && K.appVerOf && K.appVerOf(id) !== '—' && K.cmpVer(K.appVerOf(id), K.appVersions()[id] || '0') > 0);
  add('store',
    card('Estado del catálogo', 'store', `<div data-store10 class="k9-grid" style="--min:130px"></div><div class="ui-row" style="margin-top:8px">${btn('ac-updates', 'Ver actualizaciones', 'update', 'btn-primary')}${btn('appcenter', 'Abrir el App Center', 'store')}</div>`),
    card('Actualizaciones de apps', 'update', row('Avisar al iniciar si hay apps con novedades', sw('storeNotify')) + `<p class="k9-muted k9-small">${esc(tr('Las apps integradas se actualizan junto con EISENKU OS: nunca se descarga ni ejecuta código por su cuenta. Tú revisas las notas y confirmas.'))}</p>`),
    card('Fuentes de aplicaciones', 'shield', row('Permitir paquetes de terceros (.eisenapp)', sw('os10_allow_pkg', true), 'Se ejecutan aislados y solo con los permisos que apruebes.') + `<p class="k9-muted k9-small">${esc(tr('Las apps web añadidas por URL siempre se abren en el navegador EISEN o en una pestaña real.'))}</p>`),
    card('Reinstalar y restaurar', 'refresh', `<div class="ui-row">${btn('reinstall-all', 'Reinstalar las apps integradas desinstaladas', 'download')}${btn('install-optional', 'Instalar todas las apps opcionales', 'plus')}</div>`, 'Las apps integradas no se descargan de Internet: forman parte de EISENKU y solo se vuelven a mostrar.'));
  if (S.get('os10_allow_pkg', null) === null) S.set('os10_allow_pkg', true);
  U.renderers.store = sec => { const all = Object.keys(E.REG).filter(id => id !== 'deskfolder'); const inst = all.filter(id => E.isInstalled(id)), opt = all.filter(id => E.REG[id].optional && !E.isInstalled(id)), pk = (S.get('os9_packages', []) || []).length; const el = sec.querySelector('[data-store10]'); if (el) el.innerHTML = [[inst.length, 'instaladas'], [all.length - inst.length, 'disponibles para instalar'], [opt.length, 'opcionales sin instalar'], [pending().length, 'con novedades'], [pk, 'de terceros'], [Object.keys(K.MANIFESTS).filter(id => K.MANIFESTS[id].v10).length, 'nuevas en 10.0']].map(([v, l]) => `<div class="k9-kpi"><b>${v}</b><span>${esc(tr(l))}</span></div>`).join(''); };
  setTimeout(() => { if (!K.pref('storeNotify')) return; const n = pending().length; if (n && S.get('os10_store_notified', '') !== K.version + ':' + n) { S.set('os10_store_notified', K.version + ':' + n); E.notify(tr('Novedades en tus apps'), n + ' ' + tr('apps integradas tienen mejoras en esta versión. Revísalas en App Center › Actualizaciones.'), '⬆️', 9000); } }, 9000);

  /* ===================== Archivos y almacenamiento ===================== */
  add('storage',
    card('Explorador de archivos', 'folder', row('Vista predeterminada', sel('fs9_view', [['grid', 'Cuadrícula'], ['list', 'Lista']], true)) + row('Miniaturas de imágenes optimizadas', sw('os10_thumbs', true), 'Guarda miniaturas pequeñas en caché en lugar de cargar la imagen completa.') + row('Abrir con doble panel', sw('os10_fm_dual', true)) + row('Comprimir al crear archivos ZIP', sw('os10_zip_deflate', true), 'Compresión DEFLATE real cuando el navegador la admite (si no, se guarda sin comprimir).')),
    card('Papelera', 'trash', row('Vaciar automáticamente lo que lleve más de', `<select class="input-text" data-trashdays><option value="0">${esc(tr('Nunca'))}</option><option value="7">7 ${esc(tr('días'))}</option><option value="14">14 ${esc(tr('días'))}</option><option value="30">30 ${esc(tr('días'))}</option><option value="60">60 ${esc(tr('días'))}</option></select>`) + `<div class="ui-row">${btn('trash-sweep', 'Aplicar ahora', 'refresh')}</div>`),
    card('Caché de miniaturas', 'image', `<div data-thumbinfo class="k9-small"></div><div class="ui-row">${btn('thumb-clear', 'Vaciar caché de miniaturas', 'trash')}</div>`));
  if (S.get('os10_thumbs', null) === null) S.set('os10_thumbs', true); if (S.get('os10_zip_deflate', null) === null) S.set('os10_zip_deflate', true);
  U.renderers.storage = sec => { const d = sec.querySelector('[data-trashdays]'); if (d) d.value = String(K.cfg('trash').get('days', 0)); const ti = sec.querySelector('[data-thumbinfo]'); if (ti) K.store10.all('thumbs').then(l => { ti.textContent = `${l.length} ${tr('miniaturas')} · ${K.fmt.bytes(l.reduce((a, x) => a + ((x.blob && x.blob.size) || 0), 0))}`; }).catch(() => { ti.textContent = '—'; }); };

  /* ===================== Red ===================== */
  add('network',
    card('Avisos y registro', 'bell', row('Avisar cuando se pierde o vuelve la conexión', cfgIn('network', 'notify')) + row('Historial de conexiones a servicios', sv('connlog'), 'Solo el servidor y la ruta, nunca parámetros ni contenido.') + `<div class="ui-row">${btn('conncenter', 'Centro de conexiones', 'wifi')}${btn('netdiag', 'Diagnóstico de conectividad', 'pulse')}${btn('servers', 'Servidores favoritos', 'disk')}${btn('connlog', 'Historial de conexiones', 'history')}${btn('secinfo', 'Conexión segura', 'lock')}</div>`));

  /* ===================== Dispositivos ===================== */
  add('devices',
    card('Resumen de dispositivos', 'cpu', `<div data-devsum class="k9-small"></div><div class="ui-row">${btn('hwinspect', 'Inspector de hardware', 'cpu')}${btn('inputcenter', 'Dispositivos de entrada', 'key')}${btn('gamepads', 'Mandos', 'target')}${btn('audiodev', 'Audio', 'volume')}${btn('peripherals', 'Periféricos', 'puzzle')}</div>`),
    card('Ratón y puntero', 'target', row('Tamaño del puntero', sel('cursor', [['normal', 'Normal'], ['large', 'Grande']])) + row('Localizar el puntero al pulsar Ctrl', sw('locatePointer'), 'Muestra un círculo alrededor del puntero.') + row('Velocidad de la rueda', range('scrollMul', .5, 3, .25), 'Se aplica dentro de las ventanas de EISENKU.') + row('Abrir los iconos del escritorio con doble clic', sw('dbl_open', true), 'Si lo desactivas, se abren con un solo clic.') + `<div class="s9-set"><div class="s9-lbl"><span>${esc(tr('Prueba de doble clic'))}</span><small>${esc(tr('Haz doble clic en el cuadro.'))}</small></div><div class="s9-ctl"><button class="k9-btn" data-dbltest>${esc(tr('Doble clic aquí'))}</button><small data-dblres class="k9-muted"></small></div></div>`),
    card('Pantalla táctil', 'grid', row('Objetivos táctiles grandes', `<input type="checkbox" class="k9-switch" data-touch10>`, 'Botones, interruptores y controles de ventana más grandes.')));
  U.renderers.devices = async sec => {
    const el = sec.querySelector('[data-devsum]'); if (!el) return; const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
    let bat = '—'; try { if (navigator.getBattery) { const b = await navigator.getBattery(); bat = Math.round(b.level * 100) + '%' + (b.charging ? ' ⚡' : ''); } } catch { /* sin batería */ }
    el.innerHTML = K.u10.kv([['Puntero principal', matchMedia('(pointer:fine)').matches ? tr('Ratón o panel táctil (preciso)') : matchMedia('(pointer:coarse)').matches ? tr('Táctil (dedo)') : tr('Sin puntero')], ['Puntos táctiles', navigator.maxTouchPoints || 0], ['Mandos conectados', pads.length ? pads.map(p => p.id.slice(0, 40)).join(', ') : tr('ninguno (pulsa un botón del mando)')], ['Batería', bat], ['Pantalla', `${screen.width}×${screen.height} · ${devicePixelRatio}x`], ['Distribución de teclado', navigator.keyboard && navigator.keyboard.getLayoutMap ? tr('disponible') : tr('el navegador no la informa')]]);
    const t = sec.querySelector('[data-touch10]'); if (t) t.checked = !!S.get('os10_touch', false);
  };
  if (S.get('dbl_open', null) === null) S.set('dbl_open', false);

  /* ===================== Pantalla ===================== */
  add('display',
    card('Perfiles de pantalla', 'monitor', `<div class="s10-profiles" data-dispprof></div><p class="k9-small k9-muted" data-dispsug></p><div class="ui-row">${btn('disp-save', 'Guardar la configuración actual como perfil…', 'plus')}</div>`, 'Ajustan la escala, la densidad, el puntero y los márgenes de una vez (por ejemplo, para TV o Xbox).'),
    card('Escala y márgenes', 'fullscreen', row('Tamaño del texto e interfaz', range('fontScale', .85, 1.5, .05)) + row('Densidad', sel('density', [['comfortable', 'Cómoda'], ['compact', 'Compacta']])) + row('Margen de seguridad para TV', range('safeArea', 0, 10, 1), 'Encoge un poco la imagen si tu televisor recorta los bordes (0 = sin margen).')),
    card('Frecuencia de actualización', 'pulse', `<div class="ui-row">${btn('hz', 'Medir', 'pulse')}<b data-hz class="k9-small"></b></div><p class="k9-muted k9-small">${esc(tr('Se mide contando fotogramas durante un segundo: es la frecuencia real que entrega el navegador.'))}</p>`));
  U.renderers.display = sec => { const cur = K.display.active(); const el = sec.querySelector('[data-dispprof]'); if (el) el.innerHTML = K.display.profiles().map(d => `<button class="s10-prof${cur === d.id ? ' on' : ''}" data-dispapply="${esc(d.id)}"><b>${esc(tr(d.n))}</b><small>${esc(tr(d.d))}</small>${d.custom ? `<small data-dispdel="${esc(d.id)}" style="color:var(--e9-danger)">${esc(tr('Eliminar'))}</small>` : ''}</button>`).join(''); const sg = sec.querySelector('[data-dispsug]'); if (sg) { const s = K.display.profiles().find(x => x.id === K.display.suggest()); sg.textContent = tr('Recomendado para esta pantalla') + ': ' + tr(s ? s.n : ''); } };

  /* ===================== Audio ===================== */
  add('audio',
    card('Salida de audio de EISENKU', 'volume', `<div data-sinks></div><p class="k9-muted k9-small" data-sinknote></p>`),
    card('Prueba de canales', 'volume', `<div class="ui-row">${btn('ch-left', 'Izquierdo', 'left')}${btn('ch-right', 'Derecho', 'right')}${btn('ch-both', 'Ambos', 'volume')}</div>`),
    card('Más opciones', 'settings', `<div class="ui-row">${btn('audiodev', 'Centro de dispositivos de audio', 'volume')}</div>`));
  const sinkOk = 'setSinkId' in HTMLMediaElement.prototype;
  const applySink = m => { const id = S.get('os10_sink', ''); if (!sinkOk || !id || !m.setSinkId) return; m.setSinkId(id).catch(() => { }); };
  if (sinkOk) new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; if (/^(AUDIO|VIDEO)$/.test(n.tagName)) applySink(n); n.querySelectorAll && n.querySelectorAll('audio,video').forEach(applySink); }))).observe(document.body, { childList: true, subtree: true });
  K.audioOut = { supported: sinkOk, set(id) { S.set('os10_sink', id || ''); $$('audio,video').forEach(applySink); }, get: () => S.get('os10_sink', '') };
  U.renderers.audio = async sec => {
    const el = sec.querySelector('[data-sinks]'), note = sec.querySelector('[data-sinknote]'); if (!el) return;
    if (!sinkOk || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) { el.innerHTML = ''; note.textContent = tr('Este navegador no permite elegir la salida de audio: EISENKU usa la salida predeterminada del sistema.'); return; }
    const devs = (await navigator.mediaDevices.enumerateDevices().catch(() => [])).filter(d => d.kind === 'audiooutput'); const cur = S.get('os10_sink', '');
    el.innerHTML = row('Dispositivo', `<select class="input-text" data-sinksel><option value="">${esc(tr('Predeterminado del sistema'))}</option>${devs.filter(d => d.deviceId && d.deviceId !== 'default').map((d, i) => `<option value="${esc(d.deviceId)}"${d.deviceId === cur ? ' selected' : ''}>${esc(d.label || tr('Salida') + ' ' + (i + 1))}</option>`).join('')}</select>`);
    note.textContent = devs.some(d => d.label) ? tr('Se aplica a la música, los vídeos y los sonidos de EISENKU.') : tr('Los nombres aparecen tras conceder el permiso de micrófono una vez (por ejemplo en el Centro de dispositivos de audio).');
  };
  const tone = pan => { try { const ac = new (window.AudioContext || window.webkitAudioContext)(); if (K.audioOut.get() && ac.setSinkId) ac.setSinkId(K.audioOut.get()).catch(() => { }); const o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner ? ac.createStereoPanner() : null; o.frequency.value = pan < 0 ? 440 : pan > 0 ? 660 : 550; g.gain.value = .08 * (+S.get('volume', .8) || .8); o.connect(g); if (p) { p.pan.value = pan; g.connect(p); p.connect(ac.destination); } else g.connect(ac.destination); o.start(); o.stop(ac.currentTime + .6); setTimeout(() => ac.close(), 900); } catch { E.toast(tr('Sin audio')); } };

  /* ===================== Teclado ===================== */
  add('keyboard',
    card('Escritura y accesibilidad del teclado', 'key', row('Teclas especiales (Ctrl, Alt y Mayús se quedan fijas al pulsarlas solas)', sw('stickyKeys'), 'Permite usar los atajos de EISENKU pulsando las teclas de una en una.') + row('Teclado en pantalla al escribir con el mando o en táctil', sw('oskAuto')) + `<div class="ui-row">${btn('osk', 'Abrir el teclado en pantalla', 'key')}${btn('cheats', 'Lista de atajos', 'list')}</div>`),
    card('Navegación con teclado', 'accessibility', `<p class="k9-small">${esc(tr('Tab y Mayús+Tab recorren los controles · F6 salta entre barra de tareas, ventana activa, escritorio, widgets y paneles · Shift+F10 o la tecla de menú abren el menú contextual · flechas dentro de menús, iconos del escritorio y barra de tareas · Esc cierra.'))}</p>`),
    card('Distribución del teclado', 'globe', `<div data-kbl class="k9-small"></div>`));
  U.renderers.keyboard = async sec => { const el = sec.querySelector('[data-kbl]'); if (!el) return; if (!(navigator.keyboard && navigator.keyboard.getLayoutMap)) { el.textContent = tr('Este navegador no informa de la distribución del teclado (solo Chromium de escritorio). Los atajos usan la tecla que escribes.'); return; } try { const m = await navigator.keyboard.getLayoutMap(); const keys = ['KeyQ', 'KeyW', 'KeyY', 'KeyZ', 'Semicolon', 'Quote', 'BracketLeft', 'Minus', 'Equal']; el.innerHTML = `<p>${esc(tr('Tecla física → carácter'))}:</p><div class="s10-chips">${keys.map(k => `<span class="s10-chip"><b>${esc(k.replace('Key', ''))}</b> → ${esc(m.get(k) || '—')}</span>`).join('')}</div><p class="k9-muted" style="margin-top:6px">${esc(m.get('Semicolon') === 'ñ' ? tr('Distribución española detectada.') : m.get('KeyZ') === 'y' ? tr('Distribución alemana (QWERTZ) detectada.') : m.get('KeyQ') === 'a' ? tr('Distribución francesa (AZERTY) detectada.') : tr('Distribución detectada por el navegador.'))}</p>`; } catch (er) { el.textContent = tr('No disponible') + ': ' + er.message; } };

  /* ===================== Mando ===================== */
  add('controller',
    card('Navegación con mando', 'target', row('Usar el mando para moverse por EISENKU', sv('gamepad')) + `<div data-padstat class="k9-small"></div>` + row('Zona muerta de las palancas', `<input type="range" min="0.15" max="0.7" step="0.05" data-padcfg="dead" style="width:180px">`) + row('Retardo antes de repetir (ms)', `<input type="range" min="200" max="900" step="20" data-padcfg="delay" style="width:180px">`) + row('Velocidad de repetición (ms)', `<input type="range" min="60" max="400" step="10" data-padcfg="rate" style="width:180px">`), 'Cruceta o palanca izquierda: moverse · A: aceptar · B: volver · X: menú contextual · Y: buscar · LB/RB: cambiar de ventana · Menú: Inicio · Vista: vista general.'),
    card('Asignación de botones', 'settings', `<div data-padmap></div><div class="ui-row">${btn('pad-reset', 'Restablecer asignación', 'refresh')}${btn('gamepads', 'Probar el mando', 'target')}</div>`));
  U.renderers.controller = sec => {
    const G = K.gamepadNav; if (!G) return; const pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean);
    const st = sec.querySelector('[data-padstat]'); if (st) st.innerHTML = `<span class="k9-dot ${pads.length ? 'g' : 'w'}"></span> ${esc(pads.length ? pads.map(p => p.id).join(', ') : tr('Ningún mando detectado: conéctalo y pulsa un botón.'))}`;
    $$('[data-padcfg]', sec).forEach(r => { r.value = G.cfg.get(r.dataset.padcfg); });
    const m = G.map(), el = sec.querySelector('[data-padmap]'); if (el) el.innerHTML = G.buttons.map((b, i) => `<div class="s9-set"><div class="s9-lbl"><span><kbd>${esc(b)}</kbd></span></div><div class="s9-ctl"><select class="input-text" data-padbtn="${i}">${Object.entries(G.actions).map(([k, a]) => `<option value="${k}"${m[i] === k ? ' selected' : ''}>${esc(tr(a[0]))}</option>`).join('')}</select></div></div>`).join('');
  };

  /* ===================== Accesibilidad ===================== */
  add('a11y',
    card('Perfiles de accesibilidad', 'accessibility', `<div class="s10-profiles" data-a11yprof></div><div class="ui-row">${btn('a11y-save', 'Guardar mi configuración como perfil…', 'plus')}</div>`, 'Un perfil aplica varias ayudas a la vez. Puedes seguir ajustando cada opción por separado.'),
    card('Lector de interfaz', 'volume', row('Leer en voz alta el foco y las notificaciones', sv('reader'), 'Ctrl+Alt+Enter lo activa o desactiva · Ctrl+Alt+R lee la selección o la ventana · Ctrl calla.') + `<div data-voices></div>` + row('Velocidad', range('readerRate', .5, 2, .1)) + row('Tono', range('readerPitch', .5, 1.5, .1)) + row('Leer las notificaciones', sw('readerNotif')) + row('Leer al pasar el puntero', sw('readerHover')) + `<div class="ui-row">${btn('reader-test', 'Probar la voz', 'volume')}</div>`),
    card('Lupa', 'search', row('Lupa de pantalla', sv('magnifier'), 'Ctrl+Alt+Z la activa y cambia el aumento. Sigue al puntero y al foco.') + row('Aumento', sel('magLevel', [['1.5', '1,5×'], ['2', '2×'], ['3', '3×'], ['4', '4×']]))),
    card('Color y contraste', 'contrast', row('Filtro de color', sel('cfilter', [['none', 'Ninguno'], ['deuteranopia', 'Rojo-verde (deuteranopía)'], ['protanopia', 'Rojo-verde (protanopía)'], ['tritanopia', 'Azul-amarillo (tritanopía)'], ['grayscale', 'Escala de grises'], ['invert', 'Colores invertidos']]), 'Los filtros de daltonismo redistribuyen los colores difíciles de distinguir.') + row('Variante de alto contraste', sel('hcTheme', [['auto', 'Según el tema'], ['dark', 'Blanco sobre negro'], ['light', 'Negro sobre blanco'], ['yellow', 'Amarillo sobre negro'], ['aquatic', 'Acuático']]), 'Se usa cuando el alto contraste está activado.')),
    card('Movimiento y animaciones', 'pulse', row('Animación de las ventanas', sel('winAnim', [['zoom', 'Zoom'], ['fade', 'Fundido'], ['slide', 'Deslizar'], ['none', 'Sin animación']])) + row('Velocidad de las animaciones', range('animSpeed', .5, 2, .25))),
    card('Tamaño del texto por app', 'plus', `<div data-appzoom class="k9-small"></div>`, 'Clic derecho en la barra de título de una ventana › Texto más grande o más pequeño en esta app.'));
  U.renderers.a11y = sec => {
    const cur = K.a11yProfiles.active(), el = sec.querySelector('[data-a11yprof]'); if (el) el.innerHTML = K.a11yProfiles.list().map(p => `<button class="s10-prof${cur === p.id ? ' on' : ''}" data-a11yapply="${esc(p.id)}"><b>${esc(tr(p.n))}</b><small>${esc(tr(p.d))}</small>${p.custom ? `<small data-a11ydel="${esc(p.id)}" style="color:var(--e9-danger)">${esc(tr('Eliminar'))}</small>` : ''}</button>`).join('');
    const vs = sec.querySelector('[data-voices]'); if (vs) { const v = K.reader.voices(); vs.innerHTML = v.length ? row('Voz', `<select class="input-text" data-voice><option value="">${esc(tr('Automática según el idioma'))}</option>${v.map(x => `<option value="${esc(x.name)}"${x.name === K.pref('readerVoice') ? ' selected' : ''}>${esc(x.name)} (${esc(x.lang)})</option>`).join('')}</select>`) : `<p class="k9-muted k9-small">${esc(window.speechSynthesis ? tr('El navegador aún no ha cargado sus voces.') : tr('Este navegador no tiene síntesis de voz.'))}</p>`; }
    const z = K.appZoom.all(), ze = sec.querySelector('[data-appzoom]'); if (ze) ze.innerHTML = Object.keys(z).length ? Object.entries(z).map(([id, v]) => `<div class="k9-li"><div class="t"><b>${esc(appName(id))}</b><small>${Math.round(v * 100)} %</small></div><button class="k9-btn" data-zoomreset="${esc(id)}">${esc(tr('Normal'))}</button></div>`).join('') : esc(tr('Todas las apps usan el tamaño general.'));
  };
  if (window.speechSynthesis) speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', () => { if (!$('.cfg-sec[data-s="a11y"]').hidden) U.render('a11y'); });

  /* ===================== Fecha y hora ===================== */
  const REG = ['es-ES', 'es-MX', 'es-AR', 'es-CO', 'es-CL', 'es-PE', 'en-US', 'en-GB', 'pt-BR', 'pt-PT', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW', 'ru-RU', 'ar-SA', 'hi-IN', 'nl-NL', 'tr-TR', 'pl-PL', 'uk-UA', 'id-ID', 'sv-SE', 'ca-ES'];
  add('datetime',
    card('Formato de fecha y hora', 'calendar', row('Región', `<select class="input-text" data-region><option value="">${esc(tr('Según el idioma'))}</option>${REG.map(r => `<option value="${r}">${r}</option>`).join('')}</select>`) + row('Formato de hora', `<select class="input-text" data-hour><option value="">${esc(tr('Según la región'))}</option><option value="h23">24 h</option><option value="h12">12 h (a. m./p. m.)</option></select>`) + row('Segundos en el reloj de la barra de tareas', sw('clockSec')) + `<div data-dtprev class="k9-small"></div>`),
    card('Zona horaria y exactitud', 'clock', `<div data-tz class="k9-small"></div><div class="ui-row">${btn('time-sync', 'Comprobar la hora con el servidor', 'refresh')}</div><p class="k9-muted k9-small">${esc(tr('Una página web no puede cambiar la hora ni la zona del sistema: EISENKU usa las del dispositivo y te avisa si el reloj está desajustado.'))}</p>`),
    card('Relojes del mundo', 'globe', row('Zonas horarias del widget', `<input class="input-text" data-zones style="width:320px" placeholder="America/Mexico_City, Europe/Madrid">`), 'Separadas por comas (identificadores IANA). Se muestran en el widget «Relojes del mundo».'));
  U.renderers.datetime = sec => {
    const r = sec.querySelector('[data-region]'); if (r) r.value = S.get('os9_region', '') || ''; const h = sec.querySelector('[data-hour]'); if (h) h.value = S.get('os9_hour', '') || '';
    const d = new Date(), pv = sec.querySelector('[data-dtprev]'); if (pv) pv.innerHTML = K.u10.kv([['Fecha larga', d.toLocaleDateString(K.locale, { dateStyle: 'full' })], ['Fecha corta', d.toLocaleDateString(K.locale)], ['Hora', d.toLocaleTimeString(K.locale)], ['Número', (1234567.89).toLocaleString(K.locale)], ['Configuración regional', K.locale]]);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone, off = -d.getTimezoneOffset(); const t = sec.querySelector('[data-tz]'); if (t) t.innerHTML = K.u10.kv([['Zona horaria del dispositivo', tz || '—'], ['Diferencia con UTC', (off >= 0 ? '+' : '−') + String(Math.floor(Math.abs(off) / 60)).padStart(2, '0') + ':' + String(Math.abs(off) % 60).padStart(2, '0')], ['Horario de verano', new Date(d.getFullYear(), 0, 1).getTimezoneOffset() !== new Date(d.getFullYear(), 6, 1).getTimezoneOffset() ? tr('esta zona lo usa') : tr('esta zona no lo usa')]]);
    const z = sec.querySelector('[data-zones]'); if (z) z.value = (S.get('os10_w_zones', ['America/Mexico_City', 'Europe/Madrid', 'Asia/Tokyo']) || []).join(', ');
  };

  /* ===================== Privacidad ===================== */
  add('privacy',
    card('Historial del portapapeles', 'copy', row('Guardar lo que copias dentro de EISENKU', sv('clipboard'), 'Nunca guarda campos de contraseña ni lo que copian el Gestor y el Generador de contraseñas.') + row('Elementos que se guardan', `<select class="input-text" data-clipmax><option>10</option><option>25</option><option>40</option><option>100</option></select>`) + row('Conservar el historial al bloquear la pantalla', cfgIn('clipboard', 'keepOnLock')) + `<div class="ui-row">${btn('clip-open', 'Abrir el historial (Ctrl+Alt+V)', 'copy')}${btn('clip-clear', 'Borrar todo el historial', 'trash')}</div>`),
    card('Pantalla de privacidad', 'eye', row('Difuminar EISENKU al cambiar de pestaña o de app', cfgIn('privacyscreen', 'blur'), 'Evita que se vea tu contenido en el selector de tareas o al compartir pantalla.')),
    card('Actividad y conexiones', 'history', `<div class="ui-row">${btn('activity10', 'Centro de actividad', 'history')}${btn('connlog', 'Historial de conexiones', 'globe')}${btn('browserprivacy', 'Privacidad del navegador', 'eye')}</div>`));
  U.renderers.privacy = sec => { const m = sec.querySelector('[data-clipmax]'); if (m) m.value = String(K.clip.cfg.get('max', 40)); };

  /* ===================== Seguridad ===================== */
  add('security',
    card('Bloqueo de apps con PIN', 'lock', `<div data-applockinfo class="k9-small"></div><input class="input-text" data-alq placeholder="${esc(tr('Filtrar apps…'))}" style="margin:6px 0"><div data-applock style="max-height:260px;overflow:auto"></div>` + row('Volver a bloquear al cerrar la app', cfgIn('applock', 'relockOnClose'))),
    card('Al ocultar EISENKU', 'eye', row('Bloquear si estuvo oculto más de', `<select class="input-text" data-lockafter><option value="0">${esc(tr('Nunca'))}</option><option value="1">1 min</option><option value="5">5 min</option><option value="15">15 min</option><option value="60">60 min</option></select>`, 'Al volver a la pestaña o a la app se pide el PIN.')),
    card('Integridad', 'shield', `<div class="ui-row">${btn('modcheck', 'Comprobador de integridad', 'shield')}${btn('hashcheck', 'Verificador de huellas', 'key')}${btn('recovery10', 'Centro de recuperación', 'history')}</div>`));
  if (K.cfg('applock').get('relockOnClose') === undefined) K.cfg('applock').set('relockOnClose', true);
  U.renderers.security = sec => {
    const hasPin = !!K.profiles.current().pin, info = sec.querySelector('[data-applockinfo]'); if (info) info.innerHTML = hasPin ? `<span class="k9-dot g"></span> ${esc(tr('Las apps marcadas pedirán el PIN de tu perfil.'))}` : `<span class="k9-dot w"></span> ${esc(tr('Primero establece un PIN del perfil (tarjeta Bloqueo, arriba).'))}`;
    const f = K.norm((sec.querySelector('[data-alq]') || {}).value || ''), cur = K.applock.apps(), el = sec.querySelector('[data-applock]');
    if (el) el.innerHTML = E.installedApps().filter(a => E.REG[a.id] && a.id !== 'deskfolder' && !E.CORE_APPS.includes(a.id) || ['explorer', 'settings', 'browser', 'terminal'].includes(a.id)).filter(a => !f || K.norm(a.name).includes(f)).sort((a, b) => (cur.includes(b.id) - cur.includes(a.id)) || a.name.localeCompare(b.name)).slice(0, 160).map(a => `<label class="k9-li" style="cursor:pointer">${E.tile(a, 24)}<div class="t"><b>${esc(a.name)}</b></div><input type="checkbox" class="k9-switch" data-lockapp="${esc(a.id)}"${cur.includes(a.id) ? ' checked' : ''}${hasPin ? '' : ' disabled'}></label>`).join('');
    const la = sec.querySelector('[data-lockafter]'); if (la) la.value = String(K.cfg('privacyscreen').get('lockAfter', 0));
  };

  /* ===================== Rendimiento ===================== */
  add('perf',
    card('Modo de bajos recursos automático', 'leaf', row('Detectar equipos lentos y proponer el bajo consumo', sw('autoLow'), 'Mide la fluidez durante el arranque y las tareas largas; si va justo, te lo propone (nunca lo activa sin avisar).') + `<div data-perfauto class="k9-small"></div>`),
    card('Carga diferida de módulos', 'layers', `<div data-lazy class="k9-small"></div>`),
    card('Cachés', 'disk', `<div data-caches class="k9-small"></div><div class="ui-row">${btn('caches-clear', 'Vaciar la caché sin conexión', 'trash')}${btn('thumb-clear', 'Vaciar miniaturas', 'image')}${btn('resmon', 'Monitor de recursos', 'chart')}</div>`));
  U.renderers.perf = async sec => {
    const lz = sec.querySelector('[data-lazy]'); if (lz) { const man = Object.keys(K.MANIFESTS), loaded = man.filter(id => K.IMPL[id]); const scripts = [...new Set(man.map(id => K.MANIFESTS[id].src))]; const ls = scripts.filter(s => [...document.scripts].some(x => (x.src || '').includes(s))); lz.innerHTML = K.u10.kv([['Apps de carga diferida', man.length], ['Apps cargadas en esta sesión', loaded.length], ['Módulos descargados', ls.length + ' / ' + scripts.length], ['Arranque', K.bootMs ? K.bootMs + ' ms' : '—']]); }
    const pa = sec.querySelector('[data-perfauto]'); if (pa) { const r = S.get('os10_autolow_last', null); pa.textContent = r ? `${tr('Última medición')}: ${r.fps} FPS · ${r.longs} ${tr('tareas largas')} (${K.fmt.dt(r.t)})${r.slow ? ' · ' + tr('equipo lento') : ''}` : tr('Aún no se ha medido en este dispositivo.'); }
    const ce = sec.querySelector('[data-caches]'); if (ce) { if (!('caches' in window)) { ce.textContent = tr('Este navegador no tiene Cache Storage.'); return; } try { const ks = await caches.keys(); let n = 0; for (const k of ks) n += (await (await caches.open(k)).keys()).length; const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; ce.innerHTML = K.u10.kv([['Cachés sin conexión', ks.join(', ') || tr('ninguna')], ['Archivos en caché', n], ['Uso total del sitio', est ? K.fmt.bytes(est.usage) : '—']]); } catch { ce.textContent = '—'; } }
  };
  // servicio: detección de equipo lento al arrancar
  K.services.define('autolow', {
    name: 'Detección de bajos recursos', desc: 'Mide la fluidez tras el arranque y propone el modo de bajo consumo si el equipo va justo.', group: 'Rendimiento',
    start() { if (!K.pref('autoLow') || S.get('os9_lowpower', false)) return; setTimeout(() => { const stop = K.perf10.use(), l0 = K.perf10.longTasks(); let s = 0, n = 0; const t = setInterval(() => { const f = K.perf10.fps(); if (f) { s += f; n++; } }, 1000); setTimeout(() => { clearInterval(t); stop(); const fps = n ? Math.round(s / n) : 0, lt = K.perf10.longTasks(), longs = lt.n - l0.n; const slow = (fps && fps < 30) || longs > 12 || (navigator.deviceMemory && navigator.deviceMemory <= 2); S.set('os10_autolow_last', { t: Date.now(), fps, longs, slow }); K.log('info', 'performance', `Medición de arranque: ${fps} FPS, ${longs} tareas largas${slow ? ' (equipo lento)' : ''}`); if (slow && !S.get('os10_autolow_asked', false)) { S.set('os10_autolow_asked', true); E.notify(tr('EISENKU va algo lento en este equipo'), tr('Activa el modo de bajo consumo en Configuración › Rendimiento o con Ctrl+Alt+B.'), '🍃', 12000); } }, 10000); }, 6000); },
    stop() { }
  });

  /* ===================== Copias y Recuperación ===================== */
  const RESETS = [['look', 'Apariencia y tema', ['theme', 'accent', 'wp', 'customWallpaper', 'os10_iconpack', 'glass']], ['desk', 'Escritorio, iconos, paneles y widgets', ['desk_items', 'icon_size', 'os9_widgets', 'os10_panels', 'os10_wpos', 'os10_deskwp', 'os9_desk_names', 'os9_desks', 'pinned', 'start_pins']], ['keys', 'Atajos de teclado y mando', ['os9_keys', 'gamepad_cfg']], ['win', 'Tamaños y posiciones de ventanas', ['os10_geom', 'os9_layout_last', 'os10_appzoom']], ['net', 'Navegador y red', ['site_mode', 'os9_siteperms', 'eb_store', 'network_cfg', 'os10_connagg', 'os10_connlog']], ['a11y', 'Accesibilidad', ['os10_a11y_active']], ['svc', 'Servicios (tipo de inicio)', ['os10_svc']]];
  K.RESETS = RESETS;   // también los usa el Centro de recuperación
  add('recovery',
    card('Puntos de restauración', 'history', `<div data-snaps10 class="k9-small"></div><div class="ui-row">${btn('snap-create', 'Crear punto de restauración', 'plus')}${btn('recovery10', 'Centro de recuperación (comparar y más)', 'history')}</div>`),
    card('Restablecer por categoría', 'refresh', `<p class="k9-small k9-muted">${esc(tr('Vuelve a los valores de fábrica solo en una parte del sistema. Antes se crea un punto de restauración automático.'))}</p><div class="s10-chips">${RESETS.map(r => `<button class="s10-chip" data-resetcat="${r[0]}">${esc(tr(r[1]))}</button>`).join('')}</div>`),
    card('Arranque de emergencia', 'shield', `<div class="ui-row">${btn('safe-mode', 'Reiniciar en modo seguro', 'shield')}${btn('restart', 'Reiniciar la interfaz', 'refresh')}</div><p class="k9-muted k9-small">${esc(tr('El modo seguro arranca sin apps de inicio ni ventanas restauradas.'))}</p>`));
  U.renderers.recovery = sec => { const el = sec.querySelector('[data-snaps10]'); if (el) K.backup.snapshots().then(l => { el.innerHTML = l.map(s => `<div class="k9-li"><div class="t"><b>${esc(s.reason)}</b><small>${esc(K.fmt.dt(s.at))} · ${s.keys} ${esc(tr('ajustes'))} · ${esc(s.version)}</small></div><button class="k9-btn" data-snaprestore="${esc(s.id)}">${esc(tr('Volver a este punto'))}</button></div>`).join('') || esc(tr('Sin puntos de restauración todavía.')); }); };

  /* ===================== Opciones de desarrollador ===================== */
  add('dev',
    card('Modo desarrollador', 'code', row('Activar herramientas de desarrollo', sw('os10_devmode', true), 'Instala las apps opcionales de Desarrollo y muestra el identificador de cada ventana.') + row('Superposición de FPS y memoria', sw('devFps')) + row('Contornos de diseño', sw('devOutline'), 'Dibuja el borde de cada elemento para depurar la maquetación.') + row('Registrar todo el bus de eventos en el Visor de eventos', sw('os10_buslog', true))),
    card('Herramientas', 'terminal', `<div class="ui-row">${btn('devconsole', 'Consola de desarrollo', 'terminal')}${btn('codeeditor', 'Editor de código', 'code')}${btn('eventviewer', 'Visor de eventos', 'list')}${btn('syscore', 'Núcleo del sistema', 'cpu')}${btn('services', 'Servicios', 'puzzle')}</div><div class="ui-row">${btn('dev-notify', 'Enviar notificación de prueba', 'bell')}${btn('dev-error', 'Provocar un error de prueba', 'shield')}${btn('dev-reload', 'Recargar sin caché', 'refresh')}</div>`),
    card('Service Worker', 'layers', `<div data-sw class="k9-small"></div><div class="ui-row">${btn('sw-update', 'Buscar nueva versión', 'refresh')}${btn('sw-unreg', 'Desregistrar', 'trash')}</div>`));
  const applyDev = () => { html.classList.toggle('s10-devids', !!S.get('os10_devmode', false)); html.classList.toggle('s10-outline', !!K.pref('devOutline')); fpsOverlay(!!K.pref('devFps')); };
  let fpsEl = null, fpsT = 0, fpsStop = null;
  function fpsOverlay(on) { if (on && !fpsEl) { fpsEl = K.ui.el('div', { id: 's10-fps', 'aria-hidden': 'true' }); document.body.appendChild(fpsEl); fpsStop = K.perf10.use(); fpsT = setInterval(() => { fpsEl.textContent = `${K.perf10.fps()} FPS · ${K.perf10.lag()} ms${performance.memory ? ' · ' + K.fmt.bytes(performance.memory.usedJSHeapSize) : ''}`; }, 500); } else if (!on && fpsEl) { clearInterval(fpsT); fpsStop && fpsStop(); fpsEl.remove(); fpsEl = null; } }
  applyDev(); K.on('pref', p => { if (p && /^dev/.test(p.k)) applyDev(); }); K.on('skey', p => { if (p && p.k === 'os10_devmode') { applyDev(); if (p.v) ['devconsole', 'projexplorer', 'htmlvalidator', 'formatter', 'docgen', 'testlab', 'hexedit'].forEach(id => { if (E.REG[id] && !E.isInstalled(id)) E.setInstalled(id, true); }); } });
  const tagId = w => { const h = w && w.querySelector('.window-header'); if (h) h.dataset.appid = w.id.slice(4); };
  document.addEventListener('eisen:window-created', e => tagId(document.getElementById('win-' + e.detail)));
  $$('.window').forEach(tagId);
  const emit0 = K.emit; K.emit = (ev, d) => { if (S.get('os10_buslog', false) && ev !== 'log') K.log('info', 'bus', ev); return emit0(ev, d); };
  U.renderers.dev = async sec => { const el = sec.querySelector('[data-sw]'); if (!el) return; if (!('serviceWorker' in navigator)) { el.textContent = tr('No disponible en este navegador.'); return; } const r = await navigator.serviceWorker.getRegistration().catch(() => null); el.innerHTML = K.u10.kv([['Estado', r ? (r.active ? r.active.state : '…') : tr('no registrado')], ['Controla esta página', navigator.serviceWorker.controller ? tr('sí') : tr('no')], ['Ámbito', r ? r.scope : '—']]); };

  /* ===================== Configuración avanzada ===================== */
  add('advanced',
    card('Preferencias del sistema', 'settings', `<div data-prefs style="max-height:300px;overflow:auto"></div>`, 'Todas las preferencias 9.0/10.0 con su valor actual. «Predeterminado» devuelve una al valor de fábrica.'),
    card('Editor de configuración', 'code', `<div class="s10-note warn">${I('shield', 15)}<span>${esc(tr('Uso avanzado: un valor incorrecto puede afectar a una app. Antes de guardar se crea un punto de restauración automático.'))}</span></div><div class="k9-row" style="margin:8px 0"><select class="input-text" data-cfgkey style="flex:1"></select><button class="k9-btn" data-s9="cfg-load">${esc(tr('Ver'))}</button></div><textarea class="input-text k9-mono" data-cfgval rows="8" spellcheck="false" style="width:100%;font-size:12px"></textarea><div class="ui-row">${btn('cfg-save', 'Validar y guardar', 'check')}${btn('cfg-del', 'Eliminar la clave', 'trash')}</div><p class="k9-small" data-cfgmsg></p>`),
    card('Exportar e importar solo la configuración', 'download', `<div class="ui-row">${btn('cfg-export', 'Exportar configuración (sin archivos)', 'download')}${btn('cfg-import', 'Importar configuración…', 'upload')}</div><p class="k9-muted k9-small">${esc(tr('La importación se valida igual que una copia de seguridad y combina los ajustes con los actuales.'))}</p>`));
  U.renderers.advanced = sec => {
    const p = K.prefs(), D = K.PREF_DEF, el = sec.querySelector('[data-prefs]'); if (el) el.innerHTML = `<table class="k9-table"><thead><tr><th>${esc(tr('Preferencia'))}</th><th>${esc(tr('Valor'))}</th><th>${esc(tr('Predeterminado'))}</th><th></th></tr></thead><tbody>${Object.keys(D).sort().map(k => `<tr><td class="k9-mono">${esc(k)}</td><td class="k9-mono">${esc(JSON.stringify(p[k]))}</td><td class="k9-mono k9-muted">${esc(JSON.stringify(D[k]))}</td><td>${JSON.stringify(p[k]) !== JSON.stringify(D[k]) ? `<button class="k9-btn" data-prefreset="${esc(k)}">${esc(tr('Predeterminado'))}</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
    const ks = sec.querySelector('[data-cfgkey]'); if (ks) { const keys = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('eisen_')) keys.push(k); } } catch { /* sin acceso */ } const cur = ks.value; ks.innerHTML = keys.sort().map(k => `<option value="${esc(k)}">${esc(k.slice(6))} · ${esc(K.fmt.bytes((localStorage.getItem(k) || '').length * 2))}</option>`).join(''); if (cur) ks.value = cur; }
  };

  /* ===================== Acerca de ===================== */
  add('about', card('EISENKU OS 10.0 NEXT GENERATION', 'info', `<div data-about10 class="k9-small"></div><div class="ui-row">${btn('news10', 'Novedades de 10.0', 'sparkle', 'btn-primary')}${btn('computercenter', 'Centro del equipo', 'cpu')}${btn('sysinfo', 'Información del sistema', 'info')}</div>`));
  U.renderers.about = sec => { const el = sec.querySelector('[data-about10]'); if (!el) return; const apps = Object.keys(E.REG).filter(id => id !== 'deskfolder'); el.innerHTML = K.u10.kv([['Versión', K.version + ' ' + K.edition], ['Nombre clave', K.codename || '—'], ['Compilación', K.build], ['Aplicaciones integradas', apps.length + ' (' + Object.keys(K.MANIFESTS).filter(id => K.MANIFESTS[id].v10).length + ' ' + tr('nuevas en 10.0') + ')'], ['Juegos', (E.GAMES || []).length], ['Servicios internos', K.services.list().length], ['Categorías de Configuración', U.SECTIONS.filter(s => s[0] !== 'g').length], ['Idiomas', Object.keys((window.EISEN_I18N || {}).langs || {}).length || 20], ['Entorno', html.dataset.env === 'linux' ? 'Linux Mode' : 'Windows Mode']]); };

  /* ===================== Interruptores de servicio y controles personalizados ===================== */
  const main = U.main;
  const syncSvc = () => $$('[data-svc]', main).forEach(c => { c.checked = K.services.running(c.dataset.svc); });
  const syncCfg = () => $$('[data-cfg]', main).forEach(c => { const [app, k] = c.dataset.cfg.split('.'); const v = K.cfg(app).get(k); if (c.type === 'checkbox') c.checked = v === undefined ? (app === 'network' && k === 'notify') || (app === 'clipboard' && k === 'keepOnLock') : !!v; });
  K.on('services', syncSvc);
  main.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-svc]')) { const id = t.dataset.svc; if (t.checked) { K.services.setStartType(id, 'auto'); K.services.start(id); } else { K.services.setStartType(id, 'manual'); K.services.stop(id); } setTimeout(syncSvc, 50); }
    if (t.matches('[data-cfg]')) { const [app, k] = t.dataset.cfg.split('.'); K.cfg(app).set(k, t.type === 'checkbox' ? t.checked : t.value); }
    if (t.matches('[data-tbbtn]')) { const hid = new Set(K.pref('tbHide') || []); t.checked ? hid.delete(t.dataset.tbbtn) : hid.add(t.dataset.tbbtn); K.pref('tbHide', [...hid]); }
    if (t.matches('[data-panelpin]')) { const c = K.panels.cfg(); c.pin = t.checked; K.panels.save(c); }
    if (t.matches('[data-paneledge]')) { const c = K.panels.cfg(); c.edge = t.checked; K.panels.save(c); }
    if (t.matches('[data-deskname]')) { const m = K.desks.names(); m[+t.dataset.deskname] = t.value.trim().slice(0, 30); S.set('os9_desk_names', m); K.desks.apply(); }
    if (t.matches('[data-touch10]')) { html.classList.toggle('s10-touch', t.checked); S.set('os10_touch', t.checked); }
    if (t.matches('[data-sinksel]')) { K.audioOut.set(t.value); E.toast(tr('Salida de audio cambiada')); }
    if (t.matches('[data-padbtn]')) K.gamepadNav.setMap(+t.dataset.padbtn, t.value);
    if (t.matches('[data-voice]')) K.pref('readerVoice', t.value);
    if (t.matches('[data-zones]')) { S.set('os10_w_zones', t.value.split(',').map(x => x.trim()).filter(x => { try { new Intl.DateTimeFormat('en', { timeZone: x }); return true; } catch { return false; } }).slice(0, 6)); K.widgets.render(); U.render('datetime'); }
    if (t.matches('[data-clipmax]')) K.clip.cfg.set('max', +t.value);
    if (t.matches('[data-lockapp]')) K.applock.set(t.dataset.lockapp, t.checked);
    if (t.matches('[data-lockafter]')) K.cfg('privacyscreen').set('lockAfter', +t.value);
    if (t.matches('[data-trashdays]')) { K.cfg('trash').set('days', +t.value); E.toast(+t.value ? tr('La papelera se vaciará sola') : tr('Vaciado automático desactivado')); }
    if (t.matches('[data-region],[data-hour]')) setTimeout(() => U.render('datetime'), 30);
  });
  main.addEventListener('input', e => { const t = e.target; if (t.matches('[data-padcfg]')) K.gamepadNav.cfg.set(t.dataset.padcfg, +t.value); if (t.matches('[data-alq]')) U.render('security'); });
  let dblT = 0; main.addEventListener('click', e => { const d = e.target.closest('[data-dbltest]'); if (!d) return; const n = performance.now(); const r = main.querySelector('[data-dblres]'); if (n - dblT < 600) { r.textContent = tr('Doble clic detectado') + ' (' + Math.round(n - dblT) + ' ms)'; dblT = 0; } else { dblT = n; r.textContent = tr('Un clic… haz otro rápido'); } });
  main.addEventListener('click', async e => {
    const t = e.target;
    const pk = t.closest('[data-pack]'); if (pk) { S.set('os10_iconpack', pk.dataset.pack); applyPack(); U.render('personal'); K.log('info', 'settings', 'Paquete de iconos: ' + pk.dataset.pack); return; }
    const at = t.closest('[data-applytheme]'); if (at) { if (K.themes) K.themes.apply(at.dataset.applytheme); else { await K.loadScript('js/os10/apps/look10.js'); K.themes && K.themes.apply(at.dataset.applytheme); } return; }
    const dpa = t.closest('[data-dpapply]'); if (dpa) { K.deskProfiles.apply(dpa.dataset.dpapply); return; }
    const dpd = t.closest('[data-dpdel]'); if (dpd) { K.deskProfiles.remove(dpd.dataset.dpdel); U.render('desktop'); return; }
    const dd = t.closest('[data-dispdel]'); if (dd) { e.stopPropagation(); K.display.removeCustom(dd.dataset.dispdel); U.render('display'); return; }
    const da = t.closest('[data-dispapply]'); if (da) { K.display.apply(da.dataset.dispapply); U.render('display'); return; }
    const ad = t.closest('[data-a11ydel]'); if (ad) { e.stopPropagation(); K.a11yProfiles.removeCustom(ad.dataset.a11ydel); U.render('a11y'); return; }
    const aa = t.closest('[data-a11yapply]'); if (aa) { K.a11yProfiles.apply(aa.dataset.a11yapply); setTimeout(() => U.render('a11y'), 60); return; }
    const uo = t.closest('[data-unopen]'); if (uo) { const m = S.get('fs9_openwith', {}) || {}; delete m[uo.dataset.unopen]; S.set('fs9_openwith', m); U.render('apps'); return; }
    const zr = t.closest('[data-zoomreset]'); if (zr) { K.appZoom.set(zr.dataset.zoomreset, 1); U.render('a11y'); return; }
    const rc = t.closest('[data-resetcat]'); if (rc) { const r = RESETS.find(x => x[0] === rc.dataset.resetcat); if (r && await E.confirm(tr('Restablecer') + ': ' + tr(r[1]), tr('Se volverá a los valores de fábrica en esta categoría (se crea antes un punto de restauración). La interfaz se reiniciará.'))) { await K.backup.snapshot(tr('Antes de restablecer') + ' ' + tr(r[1])); r[2].forEach(k => S.del(k)); if (r[0] === 'a11y') { ['contrast', 'fontScale', 'dyslexia', 'focusRing', 'cursor', 'cfilter', 'hcTheme', 'stickyKeys', 'reduceMotion'].forEach(k => K.pref(k, K.PREF_DEF[k])); } if (r[0] === 'look') { ['density', 'radius', 'glass'].forEach(k => K.pref(k, K.PREF_DEF[k])); } K.log('warn', 'settings', 'Categoría restablecida: ' + r[1]); location.reload(); } return; }
    const pr = t.closest('[data-prefreset]'); if (pr) { K.pref(pr.dataset.prefreset, K.PREF_DEF[pr.dataset.prefreset]); U.render('advanced'); return; }
    const sr = t.closest('[data-snaprestore]'); if (sr && t.closest('.cfg-sec[data-s="recovery"]')) { if (await E.confirm(tr('Volver a un punto de restauración'), tr('Tus ajustes y datos de apps volverán a ese momento (los archivos no cambian). La interfaz se reiniciará.'))) { await K.backup.restoreSnapshot(sr.dataset.snaprestore); location.reload(); } }
  });
  // acciones de los botones data-s9 (se suman a las de settings9)
  Object.assign(U.acts, {
    thememgr: () => L('thememgr'), 'widgets-reset': () => { S.set('os10_wpos', {}); K.widgets.render(); E.toast(tr('Widgets recolocados')); },
    'panel-left': () => K.panels.toggle('left'), 'panel-right': () => K.panels.toggle('right'), 'panel-cfg-left': () => K.panels.customize('left'), 'panel-cfg-right': () => K.panels.customize('right'),
    'desk-add': () => { K.desks.add(); U.render('desktop'); }, overview: () => K.overview.open(),
    'dprof-save': async () => { const v = await K.ui.prompt(tr('Perfil de escritorio'), tr('Nombre (p. ej. Escuela, Trabajo, Juegos)'), ''); if (v && v.trim()) { K.deskProfiles.capture(v.trim()); E.toast(tr('Perfil guardado')); U.render('desktop'); } },
    'try-snap': () => { const w = $('.window.active.open:not(.minimized)'); if (w && w.id !== 'win-settings') K.snap.fly(w, w.querySelector('[data-act="max"]')); else { const ws = $$('.window.open:not(.minimized)').filter(x => x.id !== 'win-settings'); if (ws[0]) K.snap.fly(ws[0], ws[0].querySelector('[data-act="max"]')); else K.snap.fly($('#win-settings'), $('#win-settings [data-act="max"]')); } },
    tile: () => K.arrange.tile(), cascade: () => K.arrange.cascade(), 'forget-geom': () => { K.forgetGeometry(); E.toast(tr('Tamaños olvidados')); },
    'try-switch': () => K.switcher.open(1), 'try-expose': () => K.expose.open(),
    startup: () => L('startup'), compat: () => L('compat'), services: () => L('services'),
    'ac-updates': () => E.launch('appcenter', 'updates'),
    'reinstall-all': () => { let n = 0; Object.keys(E.REG).forEach(id => { if (!E.REG[id].optional && !E.isInstalled(id)) { E.setInstalled(id, true); n++; } }); E.toast(n + ' ' + tr('apps reinstaladas')); U.render('store'); },
    'install-optional': () => { let n = 0; Object.keys(E.REG).forEach(id => { if (E.REG[id].optional && !E.isInstalled(id)) { E.setInstalled(id, true); n++; } }); E.toast(n + ' ' + tr('apps instaladas')); U.render('store'); },
    'trash-sweep': async () => { const n = await K.trashSweep(); E.toast(n + ' ' + tr('archivos eliminados de la papelera')); },
    'thumb-clear': async () => { await K.store10.clear('thumbs'); E.toast(tr('Miniaturas borradas')); U.render('storage'); },
    conncenter: () => L('conncenter'), netdiag: () => L('netdiag'), servers: () => L('servers'), connlog: () => L('connlog'), secinfo: () => L('secinfo'),
    hwinspect: () => L('hwinspect'), inputcenter: () => L('inputcenter'), gamepads: () => L('gamepads'), audiodev: () => L('audiodev'), peripherals: () => L('peripherals'),
    'disp-save': async () => { const v = await K.ui.prompt(tr('Perfil de pantalla'), tr('Nombre'), ''); if (v && v.trim()) { K.display.saveCustom(v.trim()); U.render('display'); } },
    hz: async () => { const el = main.querySelector('[data-hz]'); el.textContent = '…'; const hz = await K.display.measureHz(); el.textContent = hz + ' Hz'; },
    'ch-left': () => tone(-1), 'ch-right': () => tone(1), 'ch-both': () => tone(0),
    osk: () => K.osk.open(K.clip.lastEditable), 'pad-reset': () => { K.gamepadNav.resetMap(); U.render('controller'); },
    'a11y-save': async () => { const v = await K.ui.prompt(tr('Perfil de accesibilidad'), tr('Nombre'), ''); if (v && v.trim()) { K.a11yProfiles.saveCustom(v.trim()); U.render('a11y'); } },
    'reader-test': () => { if (!K.reader.say(tr('Hola. Este es el lector de interfaz de EISENKU OS.'))) E.toast(tr('Este navegador no tiene síntesis de voz')); },
    'time-sync': async () => { try { const t0 = Date.now(); const r = await fetch('version.json', { method: 'HEAD', cache: 'no-store' }); const t1 = Date.now(); const d = r.headers.get('date'); if (!d) throw new Error(tr('El servidor no envió su hora')); const srv = new Date(d).getTime() + (t1 - t0) / 2; const diff = Math.round((t1 - srv) / 1000); K.ui.alert(tr('Hora del dispositivo'), Math.abs(diff) <= 2 ? tr('El reloj está en hora (diferencia menor de 2 segundos).') : tr('Tu reloj va') + ' ' + Math.abs(diff) + ' s ' + (diff > 0 ? tr('adelantado') : tr('atrasado')) + '. ' + tr('Ajusta la hora automática de tu dispositivo.')); } catch (er) { K.ui.alert(tr('No se pudo comprobar'), er.message || String(er)); } },
    'clip-open': () => K.clipPanel.open(), 'clip-clear': async () => { if (await E.confirm(tr('Borrar el historial del portapapeles'), tr('Se borrarán también los elementos fijados.'))) K.clip.clear(true); },
    activity10: () => L('activity'), browserprivacy: () => L('browserprivacy'),
    modcheck: () => L('modcheck'), hashcheck: () => L('hashcheck'), recovery10: () => L('recovery'),
    'caches-clear': async () => { if (!('caches' in window)) return; for (const k of await caches.keys()) await caches.delete(k); E.toast(tr('Caché sin conexión vaciada: se volverá a crear al recargar')); U.render('perf'); },
    resmon: () => L('resmon'), 'safe-mode': () => { location.href = location.pathname + '?safe=1'; },
    devconsole: () => { if (!E.isInstalled('devconsole')) E.setInstalled('devconsole', true); L('devconsole'); }, codeeditor: () => L('codeeditor'), eventviewer: () => L('eventviewer'), syscore: () => L('syscore'),
    'dev-notify': () => E.notify(tr('Notificación de prueba'), tr('Enviada desde Opciones de desarrollador'), '🧪'), 'dev-error': () => { setTimeout(() => { throw new Error('Error de prueba de EISENKU (Opciones de desarrollador)'); }, 0); E.toast(tr('Error lanzado: míralo en el Visor de eventos')); }, 'dev-reload': () => location.reload(),
    'sw-update': async () => { const r = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (r) { await r.update(); E.toast(tr('Comprobado')); } else E.toast(tr('No hay Service Worker registrado')); U.render('dev'); },
    'sw-unreg': async () => { const r = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (r) { await r.unregister(); K.services.setStartType('offline', 'manual'); E.toast(tr('Service Worker desregistrado')); } U.render('dev'); },
    'cfg-load': () => { const k = main.querySelector('[data-cfgkey]').value; const v = localStorage.getItem(k); let txt = v; try { txt = JSON.stringify(JSON.parse(v), null, 2); } catch { /* texto plano */ } main.querySelector('[data-cfgval]').value = txt || ''; main.querySelector('[data-cfgmsg]').textContent = ''; },
    'cfg-save': async () => { const k = main.querySelector('[data-cfgkey]').value, v = main.querySelector('[data-cfgval]').value, m = main.querySelector('[data-cfgmsg]'); if (!/^eisen_[\w.-]{1,80}$/.test(k)) { m.textContent = tr('Clave no permitida'); return; } let parsed; try { parsed = JSON.parse(v); } catch (er) { m.textContent = '✗ ' + tr('JSON no válido') + ': ' + er.message; return; } await K.backup.snapshot(tr('Antes de editar') + ' ' + k.slice(6)); try { localStorage.setItem(k, JSON.stringify(parsed)); m.textContent = '✓ ' + tr('Guardado. Algunas apps lo aplican al volver a abrirse.'); K.log('warn', 'settings', 'Clave editada a mano: ' + k); } catch (er) { m.textContent = '✗ ' + er.message; } },
    'cfg-del': async () => { const k = main.querySelector('[data-cfgkey]').value; if (!k || !await E.confirm(tr('Eliminar la clave'), k)) return; await K.backup.snapshot(tr('Antes de eliminar') + ' ' + k.slice(6)); localStorage.removeItem(k); K.log('warn', 'settings', 'Clave eliminada a mano: ' + k); U.render('advanced'); },
    'cfg-export': async () => { const r = await K.backup.create({ files: false }); E.download(r.name.replace('respaldo', 'configuracion'), r.blob); E.toast(r.stats.keys + ' ' + tr('ajustes exportados')); },
    'cfg-import': async () => { const [f] = await K.ui.pickFile('.json,application/json'); if (!f) return; const r = await K.backup.inspect(f); if (!r.ok) return K.ui.alert(tr('Archivo no válido'), r.errors.join('\n')); if (!await E.confirm(tr('Importar configuración'), r.summary.keys + ' ' + tr('ajustes se combinarán con los actuales (los archivos no cambian). La interfaz se reiniciará.'))) return; await K.backup.restore(r.obj, { mode: 'merge', files: false }); location.reload(); },
    news10: () => E.launch('welcome', { tab: 'news' }), computercenter: () => L('computercenter'), sysinfo: () => L('sysinfo')
  });
  // sincronización al mostrar cualquier apartado
  const r0 = U.renderers; const wrapAll = k => { const f = r0[k]; r0[k] = sec => { syncSvc(); syncCfg(); if (f) return f(sec); }; };
  U.SECTIONS.filter(s => s[0] !== 'g').forEach(s => wrapAll(s[0]));
  U.bind(main); syncSvc(); syncCfg();
  // abrir de nuevo el apartado actual para que muestre el contenido 10.0
  setTimeout(() => { const cur = $$('.cfg-sec', main).find(s => !s.hidden); if (cur) U.render(cur.dataset.s); }, 0);
  K.settings10 = true;
})();

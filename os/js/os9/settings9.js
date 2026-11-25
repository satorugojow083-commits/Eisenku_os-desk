/* =====================================================================
   EISENKU OS 10.0 NEXT GENERATION · Centro de configuración (base 9.0)
   10.0: 25 categorías profesionales con buscador global (más Navegador, Asistente, Actualizaciones y Sistema).
   Los apartados nuevos se rellenan en js/os10/settings10.js mediante K.cfgUI.
   Las tarjetas de 8.0 (tema, acento, fondo, navegador, apps vinculadas, usuario…)
   se MUEVEN a su nuevo apartado conservando sus controles y manejadores originales.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, $ = K.$, $$ = K.$$, tr = K.tr, I = K.icon;
  const html = document.documentElement;
  const win = $('#win-settings'), sb = win && win.querySelector('.window-body.cfg');
  if (!sb) return;
  const nav = sb.querySelector('.cfg-nav'), main = sb.querySelector('.cfg-main');

  /* ---------- helpers de construcción ---------- */
  const card = (title, icon, inner, desc, id) => `<div class="ui-card ui-stack s9-card"${id ? ` id="${id}"` : ''}><b class="s9-ch">${I(icon, 16)} ${esc(tr(title))}</b>${desc ? `<p class="eis-muted s9-desc">${esc(tr(desc))}</p>` : ''}${inner}</div>`;
  const row = (label, ctrl, help) => `<div class="s9-set"><div class="s9-lbl"><span>${esc(tr(label))}</span>${help ? `<small>${esc(tr(help))}</small>` : ''}</div><div class="s9-ctl">${ctrl}</div></div>`;
  const sw = (k, raw) => `<input type="checkbox" class="k9-switch" ${raw ? 'data-skey' : 'data-pref'}="${k}" aria-label="${esc(k)}">`;
  const sel = (k, opts, raw) => `<select class="input-text" ${raw ? 'data-skey' : 'data-pref'}="${k}">${opts.map(([v, l]) => `<option value="${esc(v)}">${esc(tr(l))}</option>`).join('')}</select>`;
  const range = (k, min, max, step, raw) => `<input type="range" ${raw ? 'data-skey' : 'data-pref'}="${k}" min="${min}" max="${max}" step="${step}" style="width:180px">`;
  const btn = (act, label, icon, cls = 'btn-secondary') => `<button class="${cls}" data-s9="${act}">${icon ? I(icon, 14) + ' ' : ''}${esc(tr(label))}</button>`;
  const getv = (el) => el.hasAttribute('data-pref') ? K.pref(el.dataset.pref) : S.get(el.dataset.skey, el.type === 'checkbox' ? false : '');
  function bind(root) {
    root.querySelectorAll('[data-pref],[data-skey]').forEach(el => {
      if (el.__b) return; el.__b = true;
      const v = getv(el);
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v == null ? '' : String(v);
      el.addEventListener(el.type === 'range' ? 'input' : 'change', () => {
        let val = el.type === 'checkbox' ? el.checked : el.value;
        if (el.type === 'range' || el.type === 'number' || /^\d+(\.\d+)?$/.test(val) && el.dataset.num !== undefined) val = +val;
        if (val === 'true') val = true; if (val === 'false') val = false;
        if (el.hasAttribute('data-pref')) K.pref(el.dataset.pref, val); else { S.set(el.dataset.skey, val); K.emit('skey', { k: el.dataset.skey, v: val }); }
        K.activity('setting', 'settings', (el.dataset.pref || el.dataset.skey) + ' = ' + String(val).slice(0, 30));
      });
    });
  }

  /* ---------- tarjetas heredadas (se mueven, no se recrean) ---------- */
  const cardOf = s => { const el = sb.querySelector(s); return el ? el.closest('.ui-card') : null; };
  const L = {
    theme: cardOf('#cfg-theme'), wall: cardOf('#cfg-wallpaper'), effects: cardOf('[data-o="anim"]'), env: cardOf('[data-envpick]'),
    desk: cardOf('[data-sel="icon_size"]'), snap: cardOf('[data-o="snap"]'), winstart: cardOf('#cfg-btn-reset-win'),
    browser: cardOf('#cfg-browser'), search: cardOf('[data-o="search_native"]'), ai: cardOf('[data-do="dom"]'), linked: cardOf('#cfg-yt-key'),
    langfiles: cardOf('#cfg-lang'), storage: cardOf('#cfg-btn-backup'), user: cardOf('[data-txt="user_name"]'), about: cardOf('.about') || sb.querySelector('.about')
  };

  /* ---------- apartados ---------- */
  const SECTIONS = [
    ['g', 'Personalización'], ['personal', 'Personalización', 'palette'], ['desktop', 'Escritorio', 'monitor'], ['windows', 'Ventanas y multitarea', 'layers'], ['notif', 'Notificaciones', 'bell'],
    ['g', 'Aplicaciones'], ['apps', 'Aplicaciones', 'grid'], ['store', 'Tienda de aplicaciones', 'store'], ['browser', 'Navegador', 'globe'], ['assistant', 'Asistente', 'sparkle'],
    ['g', 'Archivos y red'], ['storage', 'Archivos y almacenamiento', 'disk'], ['network', 'Red', 'wifi'],
    ['g', 'Dispositivos'], ['devices', 'Dispositivos', 'cpu'], ['display', 'Pantalla', 'sun'], ['audio', 'Audio', 'volume'], ['keyboard', 'Teclado', 'key'], ['controller', 'Mando', 'target'],
    ['g', 'Accesibilidad e idioma'], ['a11y', 'Accesibilidad', 'accessibility'], ['lang', 'Idioma', 'globe'], ['datetime', 'Fecha y hora', 'clock'],
    ['g', 'Privacidad y seguridad'], ['privacy', 'Privacidad', 'eye'], ['security', 'Seguridad', 'shield'], ['accounts', 'Cuentas', 'user'],
    ['g', 'Sistema'], ['perf', 'Rendimiento', 'zap'], ['backup', 'Copias de seguridad', 'save'], ['recovery', 'Recuperación', 'history'], ['updates', 'Actualizaciones', 'update'], ['dev', 'Opciones de desarrollador', 'code'], ['advanced', 'Configuración avanzada', 'settings'], ['system', 'Sistema', 'pulse'], ['about', 'Acerca de EISENKU OS', 'info']
  ];
  // nombres antiguos (8.0 y 9.0) → apartados 10.0: E.launch('settings', 'appearance') y similares siguen funcionando
  const OLD = { look: 'personal', appearance: 'personal', themes: 'personal', desk: 'desktop', env: 'desktop', sound: 'audio', web: 'browser', ai: 'assistant', apps: 'apps', lang: 'lang', sys: 'system', about: 'about', shortcuts: 'keyboard', keys: 'keyboard', a11y: 'a11y' };
  // reconstruir navegación y secciones
  const keep = new Map(); $$('.cfg-sec', main).forEach(s => keep.set(s.dataset.s, s));
  nav.innerHTML = `<div class="s9-cfg-search">${I('search', 14)}<input class="input-text" data-cfgq placeholder="${esc(tr('Buscar una opción…'))}" aria-label="${esc(tr('Buscar en Configuración'))}"></div>` + SECTIONS.map(s => s[0] === 'g' ? `<h6>${esc(tr(s[1]))}</h6>` : `<button data-sec="${s[0]}">${I(s[2], 16)}<span>${esc(tr(s[1]))}</span></button>`).join('');
  const SEC = {};
  const newSec = (k, title, icon) => { const d = document.createElement('section'); d.className = 'cfg-sec'; d.dataset.s = k; d.innerHTML = `<h2>${I(icon, 22)} ${esc(tr(title))}</h2>`; return d; };
  main.innerHTML = '';
  SECTIONS.filter(s => s[0] !== 'g').forEach(([k, t, i]) => { SEC[k] = newSec(k, t, i); main.appendChild(SEC[k]); });
  SEC.appearance = SEC.themes = SEC.personal; SEC.env = SEC.desktop; SEC.sound = SEC.audio;   // alias de 9.0
  const results = newSec('results', 'Resultados de la búsqueda', 'search'); main.appendChild(results);
  const add = (k, ...nodes) => nodes.forEach(n => { if (!n) return; if (typeof n === 'string') SEC[k].insertAdjacentHTML('beforeend', n); else SEC[k].appendChild(n); });   // SEC tiene alias: appearance/themes → personal, env → desktop, sound → audio

  /* ===== Apariencia ===== */
  add('appearance', L.theme,
    card('Diseño de la interfaz', 'palette', row('Densidad', sel('density', [['comfortable', 'Cómoda'], ['compact', 'Compacta']]), 'La versión compacta muestra más contenido en pantallas pequeñas.') + row('Esquinas', sel('radius', [['standard', 'Estándar'], ['compact', 'Rectas'], ['round', 'Redondeadas']])) + row('Efecto cristal', sel('glass', [['auto', 'Automático'], ['on', 'Siempre'], ['off', 'Desactivado (más rápido)']])) + row('Tamaño del texto', range('fontScale', .85, 1.4, .05), 'Afecta a todo el sistema.')),
    card('Colores de acento', 'sparkle', `<div class="s9-swatches">${[['#2a9d76', 'Jade'], ['#1f8160', 'Esmeralda'], ['#c93a73', 'Rosa'], ['#e8709f', 'Rosa claro'], ['#6a9fd8', 'Acero'], ['#8a74c4', 'Lavanda'], ['#d9a03a', 'Ámbar'], ['#0078d4', 'Azul 8.0']].map(([c, n]) => `<button data-accent="${c}" title="${esc(tr(n))}" style="background:${c}"></button>`).join('')}</div>`, 'También puedes elegir cualquier color en la tarjeta de tema.'),
    L.effects);
  /* ===== Temas ===== */
  const THEMES = [['noir', 'EISENKU Noir', 'dark', '#2a9d76', 'e9-noir'], ['rose', 'Rosé Graphite', 'dark', '#c93a73', 'e9-rose'], ['aurora', 'Aurora Enterprise', 'dark', '#34a582', 'e9-aurora'], ['blueprint', 'Blueprint', 'midnight', '#6a9fd8', 'e9-grid'], ['jade', 'Jade', 'dark', '#1f8160', 'e9-jade'], ['porcelain', 'Porcelana (claro)', 'light', '#1f8160', 'e9-porcelain'], ['classic', 'Clásico 8.0', 'dark', '#0078d4', 'flow']];
  add('themes', card('Temas del sistema', 'sparkle', `<div class="s9-themes">${THEMES.map(t => `<button class="s9-theme" data-theme9="${t[0]}"><span class="s9-tprev" style="background-image:${esc((E.WALLPAPERS || {})[t[4]] || '')}"><i style="background:${t[3]}"></i></span><b>${esc(tr(t[1]))}</b></button>`).join('')}</div>`, 'Un tema cambia a la vez el modo claro/oscuro, el color de acento y el fondo de pantalla.'),
    card('Alto contraste', 'contrast', row('Modo de alto contraste', sw('contrast'), 'Colores puros y bordes visibles para mejorar la lectura.')));
  /* ===== Personalización ===== */
  add('personal', L.wall,
    card('Presentación de fondos', 'image', row('Cambiar el fondo automáticamente', sel('wallSlideshow', [['0', 'Nunca'], ['5', 'Cada 5 minutos'], ['15', 'Cada 15 minutos'], ['60', 'Cada hora']])), 'Recorre los fondos de EISENKU sin descargar nada.'));
  add('desktop',
    card('Widgets', 'widgets', row('Mostrar widgets en el escritorio', sw('showWidgets')) + `<div class="ui-row">${btn('widgets', 'Elegir widgets…', 'widgets')}</div>`),
    card('Barra de tareas (modo Windows)', 'monitor', row('Alineación de los iconos', sel('taskbarAlign', [['center', 'Centrados'], ['left', 'A la izquierda']]))),
    card('Panel y dock (modo Linux)', 'terminal', row('Posición del dock', sel('dockPos', [['bottom', 'Abajo'], ['left', 'Izquierda'], ['right', 'Derecha']])) + row('Ocultar el dock automáticamente', sw('dockAutohide'), 'Aparece al llevar el puntero al borde inferior.') + row('Tamaño de los iconos del dock', range('dockSize', 36, 64, 2))),
    L.desk);
  /* ===== Entorno ===== */
  add('env', L.env, card('Diferencias entre modos', 'info', `<div class="s9-cmp"><div><b>🪟 ${esc(tr('Modo Windows'))}</b><ul><li>${esc(tr('Barra de tareas inferior con menú Inicio y búsqueda'))}</li><li>${esc(tr('Vista de tareas y panel de widgets'))}</li><li>${esc(tr('Centro de notificaciones al pulsar el reloj'))}</li></ul></div><div><b>🐧 ${esc(tr('Modo Linux'))}</b><ul><li>${esc(tr('Panel superior con Actividades y menú de aplicaciones'))}</li><li>${esc(tr('Dock configurable y lanzador a pantalla completa'))}</li><li>${esc(tr('Indicador de escritorios virtuales en el panel'))}</li></ul></div></div>`, 'Son interfaces simuladas dentro de una plataforma web: no instalan Linux ni Windows.'));
  /* ===== Idiomas ===== */
  const langSel = $('#cfg-lang'), saveSel = $('#cfg-save-mode');
  add('lang', card('Idioma de la interfaz', 'globe', `<div data-langslot></div>` + row('Formato regional', `<select class="input-text" data-region><option value="">${esc(tr('Según el idioma'))}</option>${['es-ES', 'es-MX', 'es-AR', 'es-CO', 'en-US', 'en-GB', 'pt-BR', 'pt-PT', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW', 'ru-RU', 'ar-SA', 'hi-IN', 'nl-NL', 'tr-TR', 'pl-PL', 'uk-UA', 'id-ID', 'sv-SE', 'ca-ES'].map(r => `<option value="${r}">${r}</option>`).join('')}</select>`, 'Fechas, horas y números.') + row('Formato de hora', `<select class="input-text" data-hour><option value="">${esc(tr('Según la región'))}</option><option value="h23">24 h</option><option value="h12">12 h (a. m./p. m.)</option></select>`) + `<p class="eis-muted k9-small" data-fmtprev></p>`, 'El cambio de idioma se aplica al instante a todo el sistema.'),
    card('Calidad de la traducción', 'check', `<div data-i18nrep class="k9-small"></div><div class="ui-row">${btn('i18n-missing', 'Ver textos sin traducir', 'list')}${btn('i18n-export', 'Exportar para traductores', 'download')}</div>`, 'EISENKU detecta los textos que aún no tienen traducción en el idioma elegido.'));
  if (langSel) SEC.lang.querySelector('[data-langslot]').appendChild(row2('Idioma', langSel));
  function row2(label, el) { const d = document.createElement('div'); d.className = 's9-set'; d.innerHTML = `<div class="s9-lbl"><span>${esc(tr(label))}</span></div><div class="s9-ctl"></div>`; d.querySelector('.s9-ctl').appendChild(el); return d; }
  /* ===== Pantalla ===== */
  add('display', card('Brillo y color', 'sun', row('Brillo', `<input type="range" min="0" max="0.8" step="0.05" data-bright style="width:180px;direction:rtl">`, 'Atenúa la pantalla dentro de EISENKU.') + row('Luz nocturna', range('nightLight', 0, .6, .02), 'Tono cálido para descansar la vista.')),
    card('Pantalla', 'monitor', row('Pantalla completa', btn('fullscreen', 'Activar / salir', 'fullscreen'), 'Oculta la interfaz del navegador (F11).') + `<p class="eis-muted k9-small" data-screen></p>`));
  /* ===== Sonido ===== */
  add('sound', card('Volumen', 'volume', row('Volumen general', `<input type="range" min="0" max="1" step="0.05" data-vol style="width:180px">`) + row('Sonidos del sistema', sw('sounds'), 'Avisos breves al recibir notificaciones o terminar una sesión de concentración.') + row('Pitido de notificación (8.0)', sw('notif_sound', true)) + `<div class="ui-row">${btn('test-sound', 'Probar sonido', 'volume')}</div>`));
  /* ===== Notificaciones ===== */
  add('notif', card('Notificaciones', 'bell', row('No molestar', sw('dnd', true), 'Las notificaciones se guardan en el centro de notificaciones sin aparecer en pantalla.') + row('Duración en pantalla', sel('notifMs', [['4000', '4 segundos'], ['6000', '6 segundos'], ['10000', '10 segundos'], ['20000', '20 segundos']])) + row('Posición', sel('notifPos', [['top-right', 'Arriba a la derecha'], ['bottom-right', 'Abajo a la derecha'], ['top-center', 'Arriba al centro']])) + row('Notificaciones del navegador', btn('browser-notif', 'Permitir', 'bell'), 'Para que las alarmas avisen aunque la pestaña esté en segundo plano.')),
    card('Apps silenciadas', 'bell', `<div data-muted class="k9-small"></div>`, 'Silencia una app desde el centro de notificaciones (icono 🔔).'));
  /* ===== Accesibilidad ===== */
  add('a11y', card('Visión', 'eye', row('Alto contraste', sw('contrast')) + row('Tamaño del texto', range('fontScale', .85, 1.4, .05)) + row('Fuente de lectura fácil', sw('dyslexia'), 'Tipografía más espaciada y legible.') + row('Indicador de foco reforzado', sw('focusRing'), 'Contorno amarillo grueso al navegar con teclado o mando.')),
    card('Movimiento', 'pulse', row('Reducir animaciones', `<select class="input-text" data-rm><option value="auto">${esc(tr('Según el sistema'))}</option><option value="on">${esc(tr('Sí'))}</option><option value="off">${esc(tr('No'))}</option></select>`)),
    card('Teclado, mando y lector de pantalla', 'accessibility', `<p class="k9-small">${esc(tr('Todos los menús y apps 9.0 se pueden usar con Tab, flechas, Enter y Esc. En Xbox el mando mueve el foco. Las ventanas y controles tienen etiquetas para lectores de pantalla.'))}</p><div class="ui-row">${btn('keys', 'Ver y personalizar atajos', 'key')}${btn('handbook-a11y', 'Guía de accesibilidad', 'help')}</div>`));
  /* ===== Rendimiento ===== */
  add('perf', card('Modo de bajo consumo', 'leaf', row('Bajo consumo', `<input type="checkbox" class="k9-switch" data-lowpower>`, 'Sin cristal ni animaciones, widgets en pausa y apps descargadas al cerrarlas. Ideal para Xbox, tabletas y equipos modestos.') + row('Liberar la memoria de las apps al cerrarlas', sw('unloadOnClose'))),
    card('Estado actual', 'pulse', `<div data-perf class="k9-grid" style="--min:140px"></div>`));
  /* ===== Privacidad ===== */
  add('privacy', card('Historial de actividad', 'history', row('Guardar historial de actividad', sw('activity'), 'Registra apps abiertas, búsquedas y cambios de ajustes solo en este dispositivo.') + `<div class="ui-row">${btn('activity', 'Ver historial', 'history')}${btn('activity-clear', 'Borrar historial', 'trash')}</div>`),
    card('Datos de navegación', 'globe', `<div class="ui-row">${btn('clear-history', 'Borrar historial del navegador', 'trash')}${btn('clear-sites', 'Borrar datos de sitios', 'trash')}${btn('clear-recent', 'Borrar recientes', 'trash')}</div>`, 'La navegación privada (Eisen Privado) no guarda historial ni datos de sitios.'),
    card('Lo que EISENKU guarda', 'shield', `<p class="k9-small">${esc(tr('Todo se guarda en este navegador (localStorage e IndexedDB). EISENKU no tiene cuentas en la nube ni envía estadísticas. Solo se conecta a Internet cuando una app lo necesita (clima, mapas, navegador, traductor…).'))}</p><div class="ui-row">${btn('privacy-center', 'Abrir el Centro de privacidad', 'shield')}${btn('export-data', 'Exportar mis datos', 'download')}</div>`));
  /* ===== Seguridad ===== */
  add('security', card('Bloqueo', 'lock', row('PIN del perfil actual', btn('pin', 'Establecer o cambiar PIN', 'key'), 'Se guarda cifrado con PBKDF2 (nunca en texto plano).') + row('Bloqueo automático', sel('autoLock', [['0', 'Nunca'], ['5', 'Tras 5 minutos'], ['15', 'Tras 15 minutos'], ['30', 'Tras 30 minutos']])) + `<p class="eis-muted k9-small">${esc(tr('La pantalla de bloqueo protege la privacidad frente a miradas, pero no es una barrera contra alguien con acceso a las herramientas del navegador.'))}</p>`),
    card('Estado de seguridad', 'shield', `<div data-secstatus></div><div class="ui-row">${btn('security-center', 'Abrir Centro de seguridad', 'shield')}${btn('permissions', 'Administrador de permisos', 'key')}</div>`),
    card('Registro de eventos de seguridad', 'list', `<div data-seclog class="k9-small" style="max-height:220px;overflow:auto"></div>`));
  /* ===== Cuentas ===== */
  add('accounts', card('Perfiles locales', 'user', `<div data-profiles></div><div class="ui-row">${btn('profile-new', 'Añadir perfil', 'plus')}${btn('switch-user', 'Cambiar de usuario', 'user')}</div>`, 'Cada perfil tiene sus propios archivos, apps, ajustes y fondo en este dispositivo.'),
    card('Inicio de sesión', 'lock', row('Mostrar pantalla de inicio de sesión', sel('loginScreen', [['auto', 'Si hay varios perfiles o PIN'], ['always', 'Siempre'], ['never', 'Nunca']]))), L.user);
  /* ===== Aplicaciones ===== */
  add('apps', card('Aplicaciones instaladas', 'grid', `<input class="input-text" data-appq placeholder="${esc(tr('Filtrar apps…'))}" style="margin-bottom:6px"><div data-applist style="max-height:340px;overflow:auto"></div><div class="ui-row">${btn('appcenter', 'Abrir el App Center', 'store')}${btn('appmanager', 'Administrador de aplicaciones', 'settings')}</div>`),
    card('Apps al iniciar', 'zap', `<div data-startup class="k9-small"></div>`, 'Se abren automáticamente al iniciar sesión.'), L.linked);
  /* ===== Almacenamiento ===== */
  add('storage', card('Uso del almacenamiento', 'disk', `<div data-store></div><div class="ui-row">${btn('persist', 'Proteger los datos ante limpiezas del navegador', 'shield')}${btn('storagemon', 'Monitor de almacenamiento', 'chart')}</div>`),
    card('Guardado de archivos', 'save', `<div data-saveslot></div><p class="eis-muted k9-small">${esc(tr('Si tu dispositivo no permite descargar (por ejemplo Xbox), elige “Solo guardar dentro de EISEN”.'))}</p>`),
    card('Limpieza', 'trash', `<div class="ui-row">${btn('empty-trash', 'Vaciar papelera', 'trash')}${btn('clear-cache', 'Borrar cachés del navegador EISEN', 'refresh')}${btn('maintenance', 'Herramientas de mantenimiento', 'settings')}</div>`));
  if (saveSel) SEC.storage.querySelector('[data-saveslot]').appendChild(row2('Al guardar o descargar', saveSel));
  /* ===== Red ===== */
  add('network', card('Estado de la conexión', 'wifi', `<div data-net class="k9-small"></div><div class="ui-row">${btn('netcheck', 'Prueba de red', 'pulse')}${btn('netconfig', 'Configuración de red', 'network')}</div>`),
    card('Servicios de EISENKU', 'network', `<div data-svc class="k9-small"></div>`, 'El proxy del navegador y la IA solo existen al abrir EISENKU con INICIAR.bat/INICIAR.sh o desde Netlify/Cloudflare.'));
  /* ===== Navegador ===== */
  add('browser', L.browser, L.search,
    card('Preferencias del navegador 9.0', 'globe', row('Página de inicio', `<input class="input-text" data-pref="homepage" placeholder="about:newtab" style="width:220px">`) + row('Ventanas emergentes', sel('popups', [['ask', 'Abrir como pestaña nueva (recomendado)'], ['block', 'Bloquear y avisar']])) + row('Modo oscuro forzado en páginas', sw('forceDark'), 'Invierte los colores de las páginas claras. Puede alterar imágenes.') + `<div class="ui-row">${btn('bookmarks', 'Marcadores', 'bookmark')}${btn('history', 'Historial', 'history')}${btn('downloads', 'Descargas', 'download')}${btn('tabsmgr', 'Pestañas', 'layers')}</div>`),
    card('Permisos de sitios', 'shield', `<div data-siteperms class="k9-small"></div>`, 'Cámara, micrófono y ubicación solo se delegan a los sitios que autorices desde la barra del navegador (🛡️).'));
  /* ===== Asistente ===== */
  add('assistant', L.ai);
  /* ===== Copias de seguridad ===== */
  add('backup', card('Copia de seguridad completa', 'save', `<p class="k9-small">${esc(tr('Incluye ajustes, datos de todas las apps y los archivos guardados en EISENKU. Se valida al restaurarla.'))}</p><div class="ui-row">${btn('backup-create', 'Crear copia de seguridad', 'download', 'btn-primary')}${btn('backup-restore', 'Restaurar…', 'upload')}</div><p class="eis-muted k9-small" data-lastbk></p>`),
    card('Puntos de restauración', 'history', `<div data-snaps class="k9-small"></div><div class="ui-row">${btn('snap-create', 'Crear punto de restauración', 'plus')}</div>`, 'Copias rápidas de tus ajustes que se crean antes de restaurar respaldos o cambiar de versión.'),
    L.storage);
  /* ===== Actualizaciones ===== */
  add('updates', card('EISENKU OS', 'update', `<div data-ver></div><div class="ui-row">${btn('upd-check', 'Buscar actualizaciones', 'refresh', 'btn-primary')}${btn('updates', 'Centro de actualizaciones', 'update')}</div><p class="eis-muted k9-small">${esc(tr('EISENKU nunca instala código por su cuenta: solo te avisa si el servidor tiene una versión más nueva.'))}</p>`),
    card('Migraciones de datos', 'layers', `<div data-migr class="k9-small"></div>`, 'Cambios aplicados a tus datos al actualizar. Se pueden revertir.'));
  /* ===== Sistema ===== */
  add('windows', L.snap, L.winstart);
  add('keyboard', card('Atajos de teclado', 'key', `<div data-keys></div><div class="ui-row">${btn('keys-reset', 'Restablecer atajos', 'refresh')}${btn('cheats', 'Ver la lista de atajos', 'list')}</div>`, 'Pulsa un atajo y escribe la nueva combinación. Ejemplos: Ctrl+Alt+T, Alt+Shift+ArrowLeft, F2.'));
  add('system',
    card('Diagnóstico y mantenimiento', 'pulse', `<div class="ui-row">${btn('diagnostics', 'Panel de diagnóstico', 'pulse')}${btn('sysinfo', 'Información del sistema', 'info')}${btn('maintenance', 'Mantenimiento', 'settings')}${btn('restart', 'Reiniciar la interfaz', 'refresh')}</div>`));
  /* ===== Información ===== */
  add('about', L.about, card('Ayuda', 'help', `<div class="ui-row">${btn('handbook', 'EISENKU OS Handbook', 'book', 'btn-primary')}${btn('welcome', 'Centro de bienvenida', 'sparkle')}${btn('guide8', 'Guía rápida', 'help')}</div>`));
  // las tarjetas heredadas que no tengan sitio se conservan en Sistema
  [...(L.langfiles ? [L.langfiles] : [])].forEach(c => { if (c && c.parentElement && !c.closest('.cfg-sec')) SEC.system.appendChild(c); });
  if (L.langfiles) { L.langfiles.hidden = true; } // su idioma y su modo de guardado se movieron; el botón de guía está en Información
  keep.forEach(s => { if (!s.isConnected) return; });

  // actualizar la tarjeta "Acerca de"
  if (L.about) {
    const b = L.about.querySelector('b'); if (b) b.textContent = K.label || ('EISENKU OS ' + K.version);
    const ps = L.about.querySelectorAll('p'); if (ps[0]) ps[0].textContent = tr('Plataforma de escritorio web con modo Linux y modo Windows, EISENKU App Center, navegador, archivos, apps de productividad, ciencia, desarrollo y sistema, juegos y el asistente Maestro Domingo.');
    L.about.insertAdjacentHTML('beforeend', `<p class="eis-muted k9-small" data-aboutinfo></p>`);
  }
  // 10.0: API para que settings10.js añada apartados, tarjetas, acciones y contenido dinámico
  K.cfgUI = { SEC, SECTIONS, add, card, row, sw, sel, range, btn, bind: r => bind(r || main), renderers: {}, acts: {}, main, nav, go: k => go(k), render: k => render(k), index: () => index() };
  bind(main);

  /* ---------- acciones ---------- */
  const go = k => {
    k = OLD[k] || k; if (!SEC[k] && k !== 'results') k = 'personal';
    $$('[data-sec]', nav).forEach(b => b.classList.toggle('on', b.dataset.sec === k));
    $$('.cfg-sec', main).forEach(x => { x.hidden = x.dataset.s !== k; });
    main.scrollTop = 0; if (k !== 'results') S.set('cfg_sec', k); render(k);
  };
  E.settingsGo = go;
  if (E.REG.settings) E.REG.settings.onArg = k => go(k);
  nav.addEventListener('click', e => { const b = e.target.closest('[data-sec]'); if (b) { e.stopImmediatePropagation(); nav.querySelector('[data-cfgq]').value = ''; go(b.dataset.sec); } }, true);
  const theme = (t) => { const s = $('#cfg-theme'); s.value = t[2]; s.dispatchEvent(new Event('change')); const a = $('#cfg-accent'); a.value = t[3]; a.dispatchEvent(new Event('input')); if (E.setWp) E.setWp(t[4]); K.pref('contrast', false); E.toast(tr('Tema aplicado') + ': ' + tr(t[1])); };
  main.addEventListener('click', async e => {
    const t = e.target;
    const acc = t.closest('[data-accent]'); if (acc) { const a = $('#cfg-accent'); a.value = acc.dataset.accent; a.dispatchEvent(new Event('input')); return; }
    const th = t.closest('[data-theme9]'); if (th) { theme(THEMES.find(x => x[0] === th.dataset.theme9)); return; }
    const b = t.closest('[data-s9]'); if (!b) return;
    const a = b.dataset.s9;
    const L2 = id => E.launch(id);
    const acts = {
      widgets: () => K.widgets.customize(), fullscreen: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => E.toast(tr('Este navegador no permite la pantalla completa aquí'))); },
      'test-sound': () => { const o = K.pref('sounds'); K.pref('sounds', true); K.sound('ok'); K.pref('sounds', o); },
      'browser-notif': async () => { if (!('Notification' in window)) return E.toast(tr('Este navegador no tiene notificaciones')); const r = await Notification.requestPermission(); E.toast(r === 'granted' ? tr('Notificaciones del navegador permitidas') : tr('El navegador no concedió el permiso')); K.seclog('perm', 'Notificaciones del navegador: ' + r); },
      keys: () => go('keyboard'), cheats: () => K.cheats && K.cheats(), 'handbook-a11y': () => K.help && K.help(null, 'accesibilidad'),
      activity: () => L2('privacy'), 'activity-clear': async () => { if (await E.confirm(tr('Borrar historial de actividad'), tr('Se eliminará el registro de actividad de este perfil.'))) { S.set('os9_activity', []); E.toast(tr('Historial de actividad borrado')); } },
      'clear-history': async () => { if (await E.confirm(tr('Borrar historial'), tr('Se borrará el historial del navegador.'))) { S.set('browser_history', []); E.toast(tr('Historial borrado')); K.seclog('privacy', 'Historial del navegador borrado'); } },
      'clear-sites': async () => { if (await E.confirm(tr('Borrar datos de sitios'), tr('Se borrarán los datos que las páginas guardaron dentro del navegador EISEN y sus reglas de carga.'))) { S.set('eb_store', {}); S.set('site_mode', {}); S.set('os9_siteperms', {}); E.toast(tr('Datos de sitios borrados')); K.seclog('privacy', 'Datos de sitios borrados'); } },
      'clear-recent': () => { S.set('recent_apps', []); S.set('recent_games', []); E.toast(tr('Recientes borrados')); },
      'privacy-center': () => L2('privacy'), 'export-data': () => acts['backup-create'](),
      pin: async () => { const r = await E.form({ title: tr('PIN del perfil'), html: `<p class="eis-muted k9-small">${esc(tr('Deja el campo vacío para quitar el PIN. Usa al menos 4 caracteres.'))}</p>`, fields: [{ k: 'p1', label: tr('Nuevo PIN'), type: 'password' }, { k: 'p2', label: tr('Repite el PIN'), type: 'password' }], ok: tr('Guardar') }); if (!r) return; if (r.p1 !== r.p2) return E.toast(tr('Los PIN no coinciden')); if (r.p1 && r.p1.length < 4) return E.toast(tr('El PIN debe tener al menos 4 caracteres')); await K.profiles.setPin(K.profileId, r.p1); E.toast(r.p1 ? tr('PIN guardado') : tr('PIN eliminado')); render('security'); },
      'security-center': () => L2('security'), permissions: () => L2('permissions'),
      'profile-new': async () => { const r = await E.form({ title: tr('Nuevo perfil local'), fields: [{ k: 'n', label: tr('Nombre'), req: true }, { k: 'a', label: tr('Avatar (emoji o letra)'), ph: '🙂' }, { k: 'c', label: tr('Color'), type: 'color', value: '#c93a73' }], ok: tr('Crear') }); if (!r || !r.n.trim()) return; await K.profiles.create(r.n.trim(), r.a.trim(), r.c); render('accounts'); E.toast(tr('Perfil creado. Puedes entrar con él desde “Cambiar de usuario”.')); },
      'switch-user': () => K.login.show('switch'),
      appcenter: () => L2('appcenter'), appmanager: () => L2('appmanager'), storagemon: () => L2('storagemon'), maintenance: () => L2('maintenance'), netcheck: () => L2('netcheck'), netconfig: () => L2('netconfig'),
      persist: async () => { if (!navigator.storage || !navigator.storage.persist) return E.toast(tr('Este navegador no lo admite')); const ok = await navigator.storage.persist(); E.toast(ok ? tr('Datos protegidos: el navegador no los borrará automáticamente') : tr('El navegador no concedió la protección (puede pedir más uso)')); render('storage'); },
      'empty-trash': async () => { if (K.files && await E.confirm(tr('Vaciar papelera'), tr('Los archivos de la papelera se eliminarán definitivamente.'))) { const n = await K.files.emptyTrash(); E.toast(n + ' ' + tr('archivos eliminados')); render('storage'); } },
      'clear-cache': () => { try { E.ebClearCache && E.ebClearCache(); } catch { /* ignorar */ } E.toast(tr('Cachés borradas')); },
      bookmarks: () => L2('bookmarks'), history: () => L2('history'), downloads: () => L2('downloads'), tabsmgr: () => L2('tabsmgr'),
      'backup-create': async () => { E.toast(tr('Preparando copia de seguridad…')); const r = await K.backup.create({ files: true }); E.download(r.name, r.blob); E.toast(`${tr('Copia creada')}: ${r.stats.keys} ${tr('ajustes')}, ${r.stats.files} ${tr('archivos')} (${K.fmt.bytes(r.stats.size)})`); render('backup'); },
      'backup-restore': () => restoreFlow(),
      'snap-create': async () => { await K.backup.snapshot(tr('Manual')); E.toast(tr('Punto de restauración creado')); render('backup'); },
      'upd-check': async () => { const r = await K.updates.check(); if (!r.ok) return E.toast(tr('No se pudo comprobar (sin conexión o abierto como archivo)')); if (r.newer) { E.notify(tr('Actualización disponible'), `EISENKU OS ${r.remote}. ${tr('Recarga para usarla.')}`, '⬆️'); } else E.toast(tr('Ya tienes la última versión') + ' (' + r.local + ')'); render('updates'); },
      updates: () => L2('updates'), 'keys-reset': () => { K.keys.reset(); render('keyboard'); E.toast(tr('Atajos restablecidos')); },
      diagnostics: () => L2('diagnostics'), sysinfo: () => L2('sysinfo'), restart: () => location.reload(),
      handbook: () => L2('handbook'), welcome: () => L2('welcome'), guide8: () => E.guide && E.guide(),
      'i18n-missing': () => window.EISEN_I18N9 && EISEN_I18N9.showMissing(), 'i18n-export': () => window.EISEN_I18N9 && EISEN_I18N9.exportMissing()
    };
    if (acts[a]) acts[a](); else if (K.cfgUI && K.cfgUI.acts[a]) K.cfgUI.acts[a](b);
  });
  main.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-region]')) { S.set('os9_region', t.value); K.computeLocale(); K.emit('locale'); render('lang'); }
    if (t.matches('[data-hour]')) { S.set('os9_hour', t.value); K.computeLocale(); K.emit('locale'); render('lang'); }
    if (t.matches('[data-rm]')) { K.pref('reduceMotion', t.value === 'auto' ? null : t.value === 'on'); }
    if (t.matches('[data-lowpower]')) K.setLowPower(t.checked);
    if (t.matches('[data-startup-id]')) { const l = S.get('os9_startup', []) || [], id = t.dataset.startupId; S.set('os9_startup', t.checked ? [...new Set(l.concat(id))] : l.filter(x => x !== id)); }
  });
  main.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('[data-bright]')) { const ov = $('#screen-brightness-overlay'); ov.style.opacity = t.value; const q = $('#qc-brightness'); if (q) q.value = t.value; S.set('os9_bright', +t.value); }
    if (t.matches('[data-vol]')) { const q = $('#qc-volume'); if (q) { q.value = t.value; q.dispatchEvent(new Event('input')); } }
    if (t.matches('[data-appq]')) render('apps');
  });
  // brillo persistente (8.0 no lo guardaba)
  const qb = $('#qc-brightness'); if (qb) { const v = +S.get('os9_bright', 0) || 0; qb.value = v; $('#screen-brightness-overlay').style.opacity = v; qb.addEventListener('input', () => S.set('os9_bright', +qb.value)); }
  // ajustes que deben aplicarse en vivo
  K.on('skey', ({ k, v }) => { if (k === 'dnd') { html.classList.toggle('dnd', !!v); const q = $('#qt-bt'); if (q) q.classList.toggle('active', !!v); } });

  // restauración de un respaldo con validación previa
  async function restoreFlow() {
    const [f] = await K.ui.pickFile('.json,application/json'); if (!f) return;
    const r = await K.backup.inspect(f);
    if (!r.ok) { K.seclog('backup', 'Respaldo rechazado: ' + r.errors.join('; '), 'warn'); return K.ui.alert(tr('Respaldo no válido'), r.errors.join('\n')); }
    const s = r.summary;
    const ok = await E.form({ title: tr('Restaurar copia de seguridad'), html: `<p class="k9-small">${esc(tr('Versión'))}: <b>${esc(s.version)}</b> · ${esc(tr('Creada'))}: ${esc(s.created ? K.fmt.dt(s.created) : '—')}<br>${s.keys} ${esc(tr('ajustes'))} · ${s.files} ${esc(tr('archivos'))} · ${esc(s.sizeMB)} MB</p>${r.warn.length ? `<p class="k9-small" style="color:var(--e9-warn)">⚠️ ${r.warn.map(esc).join('<br>')}</p>` : ''}<p class="eis-muted k9-small">${esc(tr('Antes de restaurar se crea un punto de restauración automático.'))}</p>`, fields: [{ k: 'mode', label: tr('Modo'), type: 'select', options: [['replace', tr('Reemplazar mis datos actuales')], ['merge', tr('Combinar con mis datos actuales')]], value: 'replace' }], ok: tr('Restaurar') });
    if (!ok) return;
    const n = await K.backup.restore(r.obj, { mode: ok.mode });
    await K.ui.alert(tr('Respaldo restaurado'), `${s.keys} ${tr('ajustes')} · ${n} ${tr('archivos')}. ${tr('La interfaz se reiniciará.')}`);
    location.reload();
  }
  // los botones heredados de respaldo usan ahora el sistema 9.0 (incluye archivos y validación)
  const lb = $('#cfg-btn-backup'), lr = $('#cfg-btn-restore');
  if (lb) { lb.textContent = tr('Exportar copia completa'); lb.onclick = () => main.querySelector('[data-s9="backup-create"]').click(); }
  if (lr) { lr.textContent = tr('Restaurar copia'); lr.onclick = () => restoreFlow(); }

  /* ---------- contenido dinámico de cada apartado ---------- */
  function render(k) {
    const q = s => SEC[k] && SEC[k].querySelector(s);
    if (k === 'appearance' || k === 'personal') { const p = K.prefs(); $$('[data-accent]', SEC.appearance).forEach(b => b.classList.toggle('on', ($('#cfg-accent').value || '').toLowerCase() === b.dataset.accent)); void p; }
    if (k === 'lang') {
      const r = q('[data-region]'); if (r) r.value = S.get('os9_region', '') || ''; const h = q('[data-hour]'); if (h) h.value = S.get('os9_hour', '') || '';
      const pv = q('[data-fmtprev]'); if (pv) pv.textContent = tr('Vista previa') + ': ' + new Date().toLocaleString(K.locale, { dateStyle: 'full', timeStyle: 'short' }) + ' · ' + (1234567.89).toLocaleString(K.locale);
      const rep = q('[data-i18nrep]'); if (rep && window.EISEN_I18N9) rep.innerHTML = EISEN_I18N9.reportHtml();
    }
    if (k === 'display') { const s = q('[data-screen]'); if (s) s.textContent = `${tr('Pantalla')}: ${screen.width}×${screen.height} · ${tr('Ventana')}: ${innerWidth}×${innerHeight} · ${tr('Densidad')}: ${devicePixelRatio}x · ${tr('Orientación')}: ${(screen.orientation && screen.orientation.type) || '—'}`; const b = q('[data-bright]'); if (b) b.value = +S.get('os9_bright', 0) || 0; }
    if (k === 'sound' || k === 'audio') { const v = q('[data-vol]'); if (v) v.value = S.get('volume', .8); }
    if (k === 'notif') { const m = S.get('os9_mute', []) || [], el = q('[data-muted]'); if (el) el.innerHTML = m.length ? m.map(id => `<span class="k9-badge">${esc((E.REG[id] || {}).name || id)} <button data-unmute="${esc(id)}" aria-label="${esc(tr('Quitar'))}">✕</button></span>`).join(' ') : esc(tr('Ninguna app silenciada.')); }
    if (k === 'a11y') { const s = q('[data-rm]'); if (s) { const v = K.pref('reduceMotion'); s.value = v === true ? 'on' : v === false ? 'off' : 'auto'; } }
    if (k === 'perf') { const lp = q('[data-lowpower]'); if (lp) lp.checked = !!S.get('os9_lowpower', false); const el = q('[data-perf]'); if (el) { const mem = performance.memory ? K.fmt.bytes(performance.memory.usedJSHeapSize) : '—'; el.innerHTML = [[tr('Ventanas abiertas'), $$('.window.open').length], [tr('Elementos en la página'), document.getElementsByTagName('*').length], [tr('Memoria JS'), mem], [tr('Núcleos de CPU'), navigator.hardwareConcurrency || '—'], [tr('Memoria del dispositivo'), navigator.deviceMemory ? '~' + navigator.deviceMemory + ' GB' : '—'], [tr('Arranque'), K.bootMs ? K.bootMs + ' ms' : '—']].map(([l, v]) => `<div class="k9-kpi"><b>${esc(String(v))}</b><span>${esc(l)}</span></div>`).join(''); } }
    if (k === 'security') {
      const st = q('[data-secstatus]'), me = K.profiles.current();
      if (st) st.innerHTML = [[location.protocol === 'https:' || /^(localhost|127\.)/.test(location.hostname), tr('Conexión segura (HTTPS o equipo local)')], [!!me.pin, tr('PIN del perfil establecido')], [+K.pref('autoLock') > 0, tr('Bloqueo automático activado')], [Date.now() - (S.get('os9_last_backup', 0) || 0) < 7 * 864e5, tr('Copia de seguridad en los últimos 7 días')], [true, tr('Páginas del proxy aisladas en sandbox (servidor 9.0)')], [true, tr('Apps de terceros sin acceso al sistema')]].map(([ok, l]) => `<div class="k9-row k9-small" style="padding:3px 0"><span class="k9-dot ${ok ? 'g' : 'w'}"></span>${esc(l)}</div>`).join('');
      const lg = q('[data-seclog]'); if (lg) lg.innerHTML = K.seclogList().slice(0, 40).map(x => `<div style="padding:3px 0;border-bottom:1px solid var(--e9-line)"><span class="k9-dot ${x.level === 'warn' ? 'w' : 'g'}"></span> <small class="eis-muted">${esc(K.fmt.dt(x.t))} · ${esc(x.type)}</small><br>${esc(x.msg)}</div>`).join('') || esc(tr('Sin eventos registrados.'));
    }
    if (k === 'accounts') { const el = q('[data-profiles]'); if (el) el.innerHTML = K.profiles.list().map(p => `<div class="k9-li"><span class="user-avatar" style="background:${esc(p.color || '#1f8160')};width:34px;height:34px;display:grid;place-items:center;border-radius:50%;color:#fff">${esc(p.avatar || (p.name || '?')[0])}</span><div class="t"><b>${esc(p.name)} ${p.id === K.profileId ? `<span class="k9-badge g">${esc(tr('Actual'))}</span>` : ''}</b><small>${p.pin ? '🔒 ' + esc(tr('Con PIN')) : esc(tr('Sin PIN'))} · ${esc(tr('Creado'))} ${esc(K.fmt.date(p.created || Date.now()))}</small></div>${p.id !== K.profileId && p.id !== 'default' ? `<button class="k9-btn dng" data-delprof="${esc(p.id)}">${esc(tr('Eliminar'))}</button>` : ''}</div>`).join(''); }
    if (k === 'apps') {
      const f = K.norm((q('[data-appq]') || {}).value || ''), el = q('[data-applist]');
      const all = E.apps().filter(a => (E.REG[a.id] || a.user || a.game) && a.id !== 'deskfolder' && (!f || K.norm(a.name).includes(f)));
      if (el) el.innerHTML = all.slice(0, 200).map(a => `<div class="k9-li">${E.tile(a, 28)}<div class="t"><b>${esc(a.name)}</b><small>${esc(a.game ? tr('Juego') : tr((E.CATS[a.cat] || {}).label || a.cat || ''))}${K.MANIFESTS[a.id] ? ' · 9.0' : ''}</small></div>${E.isInstalled(a.id) ? (E.CORE_APPS.includes(a.id) ? `<span class="k9-badge">${esc(tr('Sistema'))}</span>` : `<button class="k9-btn" data-uninst="${esc(a.id)}">${esc(tr('Desinstalar'))}</button>`) : `<button class="k9-btn pri" data-inst="${esc(a.id)}">${esc(tr('Instalar'))}</button>`}</div>`).join('');
      const su = q('[data-startup]'), sl = S.get('os9_startup', []) || [];
      if (su) su.innerHTML = ['notes', 'tasks', 'calendar', 'browser', 'music', 'assistant', 'explorer', 'terminal', 'academic', 'projects'].filter(id => E.REG[id]).map(id => `<label class="k9-row" style="padding:3px 0"><input type="checkbox" data-startup-id="${id}" ${sl.includes(id) ? 'checked' : ''}> ${esc((E.REG[id] || {}).name || id)}</label>`).join('');
    }
    if (k === 'storage') {
      const el = q('[data-store]'); if (!el) return;
      el.innerHTML = '<div class="k9-spin"></div>';
      Promise.all([navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve(null), E.vaultAll().catch(() => []), navigator.storage && navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false)]).then(([est, files, pers]) => {
        const ls = K.integrity.storage(), fsz = files.reduce((a, f) => a + (f.size || 0), 0), pct = est && est.quota ? est.usage / est.quota * 100 : 0;
        el.innerHTML = `<div class="k9-meter ${pct > 85 ? 'bad' : pct > 60 ? 'warn' : ''}"><i style="width:${Math.min(100, pct).toFixed(1)}%"></i></div><p class="k9-small" style="margin-top:6px">${est ? `${esc(K.fmt.bytes(est.usage))} ${esc(tr('de'))} ${esc(K.fmt.bytes(est.quota))} ${esc(tr('disponibles para EISENKU'))}` : esc(tr('El navegador no informa de la cuota.'))}</p><div class="k9-grid" style="--min:150px;margin-top:8px"><div class="k9-kpi"><b>${esc(K.fmt.bytes(fsz))}</b><span>${files.length} ${esc(tr('archivos'))}</span></div><div class="k9-kpi"><b>${esc(K.fmt.bytes(ls.total))}</b><span>${esc(tr('ajustes y datos de apps'))}</span></div><div class="k9-kpi"><b>${pers ? '✓' : '—'}</b><span>${esc(pers ? tr('Datos protegidos') : tr('Sin protección persistente'))}</span></div></div>`;
      });
    }
    if (k === 'network') {
      const el = q('[data-net]'), c = navigator.connection || {};
      if (el) el.innerHTML = `<div class="k9-row"><span class="k9-dot ${navigator.onLine ? 'g' : 'd'}"></span>${esc(navigator.onLine ? tr('En línea') : tr('Sin conexión'))}</div><p>${esc(tr('Tipo'))}: ${esc(c.effectiveType || '—')} · ${esc(tr('Velocidad estimada'))}: ${c.downlink ? esc(c.downlink + ' Mb/s') : '—'} · RTT: ${c.rtt != null ? esc(c.rtt + ' ms') : '—'} · ${esc(tr('Ahorro de datos'))}: ${c.saveData ? esc(tr('Sí')) : esc(tr('No'))}</p>`;
      const sv = q('[data-svc]'); if (sv) { sv.textContent = '…'; Promise.all([fetch('/proxy?ping=1', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null), fetch('/ai', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null)]).then(([p, a]) => { sv.innerHTML = `<div class="k9-row"><span class="k9-dot ${p && p.ok ? 'g' : 'w'}"></span>${esc(tr('Proxy del navegador'))}: ${p && p.ok ? esc(tr('disponible')) + (p.sandbox ? ' · sandbox ✓' : ' · ' + esc(tr('versión antigua sin sandbox'))) : esc(tr('no disponible (modo compatibilidad)'))}</div><div class="k9-row"><span class="k9-dot ${a && a.ok ? 'g' : 'w'}"></span>${esc(tr('IA del servidor'))}: ${a && a.ok ? esc(a.model || tr('activa')) : esc(tr('no configurada'))}</div>`; }); }
    }
    if (k === 'browser') { const el = q('[data-siteperms]'), m = S.get('os9_siteperms', {}) || {}; if (el) el.innerHTML = Object.keys(m).length ? Object.entries(m).map(([h, l]) => `<div class="k9-li"><div class="t"><b>${esc(h)}</b><small>${esc(l.map(p => tr((K.PERMS[p] || {}).n || p)).join(', '))}</small></div><button class="k9-btn dng" data-revokesite="${esc(h)}">${esc(tr('Revocar'))}</button></div>`).join('') : esc(tr('Ningún sitio tiene permisos especiales.')); }
    if (k === 'backup') {
      const lb2 = q('[data-lastbk]'); if (lb2) { const t = S.get('os9_last_backup', 0); lb2.textContent = t ? tr('Última copia') + ': ' + K.fmt.dt(t) : tr('Aún no has creado ninguna copia completa.'); }
      const el = q('[data-snaps]'); if (el) K.backup.snapshots().then(l => { el.innerHTML = l.map(s => `<div class="k9-li"><div class="t"><b>${esc(s.reason)}</b><small>${esc(K.fmt.dt(s.at))} · ${s.keys} ${esc(tr('ajustes'))} · ${esc(s.version)}</small></div><button class="k9-btn" data-snaprestore="${esc(s.id)}">${esc(tr('Volver a este punto'))}</button></div>`).join('') || esc(tr('Sin puntos de restauración todavía.')); });
    }
    if (k === 'updates') {
      const v = q('[data-ver]'); if (v) v.innerHTML = `<div class="k9-row"><img src="icon.svg" width="40" height="40" alt=""><div><b style="font-size:16px">EISENKU OS ${esc(K.version)} ${esc(K.edition)}</b><div class="eis-muted k9-small">Build ${esc(K.build)} · ${esc(tr('Esquema de datos'))} ${esc(String(S.get('os9_schema', 0)))} · ${esc(tr('Última comprobación'))}: ${S.get('os9_upd_check', 0) ? esc(K.fmt.dt(S.get('os9_upd_check', 0))) : '—'}</div></div></div>`;
      const m = q('[data-migr]'); if (m) { const h = S.get('os9_migrations', []) || []; m.innerHTML = h.map(x => `<div class="k9-li"><div class="t"><b>#${x.id} ${esc(x.name)}</b><small>${esc(K.fmt.dt(x.at))} · ${x.ok ? (x.reverted ? esc(tr('Revertida')) : esc(tr('Aplicada'))) : esc(tr('Error')) + ': ' + esc(x.error || '')} · ${Object.keys(x.before || {}).length} ${esc(tr('claves'))}</small></div>${x.ok && !x.reverted ? `<button class="k9-btn" data-revert="${x.id}">${esc(tr('Revertir'))}</button>` : x.reverted ? `<button class="k9-btn" data-reapply="${x.id}">${esc(tr('Volver a aplicar'))}</button>` : ''}</div>`).join('') || esc(tr('Sin migraciones.')); }
    }
    if (k === 'keyboard') {
      const el = q('[data-keys]'), m = K.keys.map(); if (!el) return;
      const groups = {}; K.keys.defs.forEach(d => (groups[d.group] = groups[d.group] || []).push(d));
      el.innerHTML = Object.entries(groups).map(([g, l]) => `<h5 class="s9-kh">${esc(tr(g))}</h5>` + l.map(d => `<div class="s9-set"><div class="s9-lbl"><span>${esc(tr(d.label))}</span></div><div class="s9-ctl"><input class="input-text k9-mono" data-key="${d.id}" value="${esc(m[d.id] || '')}" style="width:210px" aria-label="${esc(tr(d.label))}"></div></div>`).join('')).join('');
    }
    if (K.cfgUI && K.cfgUI.renderers[k]) { try { K.cfgUI.renderers[k](SEC[k]); } catch (er) { console.error('[Configuración] ' + k, er); } }
    if (k === 'about') { const a = L.about && L.about.querySelector('[data-aboutinfo]'); if (a) a.textContent = `Build ${K.build} · ${E.apps().filter(x => E.REG[x.id]).length} ${tr('apps integradas')} · ${(E.GAMES || []).length} ${tr('juegos')} · ${tr('Perfil')}: ${K.profiles.current().name} · ${tr('Idioma')}: ${(window.EISEN_I18N || {}).lang || 'es'}`; }
  }
  main.addEventListener('click', async e => {
    const t = e.target;
    const un = t.closest('[data-unmute]'); if (un) { S.set('os9_mute', (S.get('os9_mute', []) || []).filter(x => x !== un.dataset.unmute)); render('notif'); return; }
    const dp = t.closest('[data-delprof]'); if (dp) { if (await E.confirm(tr('Eliminar perfil'), tr('Se borrarán los datos y archivos de ese perfil en este dispositivo.'))) { await K.profiles.remove(dp.dataset.delprof); render('accounts'); } return; }
    const ui = t.closest('[data-uninst]'); if (ui) { E.setInstalled(ui.dataset.uninst, false); render('apps'); return; }
    const ii = t.closest('[data-inst]'); if (ii) { E.setInstalled(ii.dataset.inst, true); render('apps'); return; }
    const rs = t.closest('[data-revokesite]'); if (rs) { const m = S.get('os9_siteperms', {}) || {}; delete m[rs.dataset.revokesite]; S.set('os9_siteperms', m); K.seclog('perm', 'Permisos revocados al sitio ' + rs.dataset.revokesite); render('browser'); return; }
    const sr = t.closest('[data-snaprestore]'); if (sr) { if (await E.confirm(tr('Volver a un punto de restauración'), tr('Tus ajustes y datos de apps volverán a ese momento (los archivos no cambian). La interfaz se reiniciará.'))) { await K.backup.restoreSnapshot(sr.dataset.snaprestore); location.reload(); } return; }
    const rv = t.closest('[data-revert]'); if (rv) { if (await E.confirm(tr('Revertir migración'), tr('Se restaurarán los valores anteriores de las claves que cambió. La interfaz se reiniciará.'))) { K.backup.snapshot('Antes de revertir una migración'); if (K.revertMigration(+rv.dataset.revert)) location.reload(); } return; }
    const ra = t.closest('[data-reapply]'); if (ra) { K.reapplyMigration(+ra.dataset.reapply); location.reload(); }
  });
  main.addEventListener('change', e => { const k = e.target.closest('[data-key]'); if (k) { const v = k.value.trim(); K.keys.set(k.dataset.key, v); E.toast(tr('Atajo guardado') + (v ? ': ' + v : '')); } });
  main.addEventListener('keydown', e => { const k = e.target.closest('[data-key]'); if (!k || e.key === 'Tab') return; e.preventDefault(); e.stopPropagation(); if (e.key === 'Backspace' || e.key === 'Delete') { k.value = ''; } else { const c = K.keys.combo(e); if (c) k.value = c; } k.dispatchEvent(new Event('change', { bubbles: true })); }, true);

  /* ---------- buscador de Configuración ---------- */
  const index = () => $$('.cfg-sec', main).filter(s => s.dataset.s !== 'results').flatMap(s => $$('.ui-card', s).filter(c => !c.hidden).map(c => ({ s: s.dataset.s, title: (c.querySelector('b') || {}).textContent || '', text: c.textContent, el: c })));
  const sq = nav.querySelector('[data-cfgq]');
  sq.addEventListener('input', () => {
    const n = K.norm(sq.value.trim()); if (!n) { go(S.get('cfg_sec', 'personal')); return; }
    const hits = index().filter(x => K.norm(x.text).includes(n)).slice(0, 30);
    results.innerHTML = `<h2>${I('search', 22)} ${esc(tr('Resultados de la búsqueda'))}</h2>` + (hits.map(h => `<button class="s9-hit" data-hitsec="${h.s}" data-hittitle="${esc(h.title)}"><b>${esc(h.title.trim())}</b><small>${esc(tr((SECTIONS.find(x => x[0] === h.s) || [])[1] || ''))}</small></button>`).join('') || `<p class="eis-muted">${esc(tr('Sin resultados'))}</p>`);
    go('results');
  });
  results.addEventListener('click', e => { const h = e.target.closest('[data-hitsec]'); if (!h) return; sq.value = ''; go(h.dataset.hitsec); const c = index().find(x => x.s === h.dataset.hitsec && x.title === h.dataset.hittitle); if (c) { c.el.scrollIntoView({ block: 'center' }); c.el.classList.add('s9-flash'); setTimeout(() => c.el.classList.remove('s9-flash'), 1600); } });
  // proveedor para la búsqueda global
  K.search.register(tr('Configuración'), n => index().filter(x => K.norm(x.text).includes(n)).slice(0, 5).map(x => ({ icon: I('settings', 18), title: x.title.trim(), sub: tr((SECTIONS.find(s => s[0] === x.s) || [])[1] || ''), run: () => { E.launch('settings'); go(x.s); setTimeout(() => { x.el.scrollIntoView({ block: 'center' }); x.el.classList.add('s9-flash'); setTimeout(() => x.el.classList.remove('s9-flash'), 1600); }, 120); } })), 5);

  /* ---------- presentación de fondos ---------- */
  let wsT = null;
  const slideshow = () => { clearInterval(wsT); const m = +K.pref('wallSlideshow') || 0; if (m > 0) wsT = setInterval(() => { if (document.hidden || S.get('wp', '') === 'custom') return; const l = ['e9-noir', 'e9-jade', 'e9-rose', 'e9-aurora', 'e9-grid']; const i = l.indexOf(S.get('wp', 'e9-noir')); E.setWp(l[(i + 1) % l.length]); }, m * 60000); };
  K.on('pref', e => { if (e && e.k === 'wallSlideshow') slideshow(); });
  slideshow();

  // abrir en el último apartado
  win.style.width = Math.min(980, innerWidth - 20) + 'px'; win.style.height = Math.min(660, innerHeight - 70) + 'px';
  go(OLD[S.get('cfg_sec', 'personal')] || S.get('cfg_sec', 'personal'));
  document.addEventListener('eisen:open', e => { if (e.detail === 'settings') render(OLD[S.get('cfg_sec', 'personal')] || S.get('cfg_sec', 'personal')); });
})();

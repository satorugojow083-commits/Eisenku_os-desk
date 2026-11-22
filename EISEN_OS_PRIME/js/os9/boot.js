/* =====================================================================
   EISENKU OS 10.0 NEXT GENERATION (base 9.0) · Arranque temprano
   Se ejecuta ANTES que el resto de scripts (todos usan defer, este no):
   - Identidad de versión y build.
   - Perfil local activo y base de datos de archivos del perfil.
   - Migraciones síncronas de localStorage con copia previa (reversibles).
   - Preferencias visuales tempranas (evita parpadeos): bajo consumo, contraste, RTL.
   - Formatos regionales: fechas y números siguen el idioma/región de EISENKU.
   - Captura de errores para el Panel de diagnóstico.
   ===================================================================== */
(function () {
  'use strict';
  var K = window.EISENKU = window.EISENKU || {};
  K.name = 'EISENKU OS';
  K.version = '11.0.0';
  K.edition = 'PRIME';
  K.build = '2026.11.22';
  K.codename = 'Prime';
  K.label = 'EISEN OS PRIME 11.0';
  K.product = 'eisen_osprime';
  K.schema = 1;
  // 10.0: versión y novedades de las apps integradas que cambian en esta versión (App Center › Actualizaciones)
  K.VERS10 = {
    explorer: ['10.0.0', 'Doble panel, vista rápida con Espacio, etiquetas de colores, búsqueda avanzada (también dentro del contenido), filtros guardados, acceso rápido, comparar archivos, metadatos con huellas, ZIP con compresión real y vaciado automático de la papelera.'],
    settings: ['10.0.0', 'Configuración profesional en 25 categorías con búsqueda global: Escritorio, Ventanas y multitarea, Dispositivos, Teclado, Mando, Fecha y hora, Recuperación, Opciones de desarrollador, Configuración avanzada y más.'],
    storagemon: ['10.0.0', 'Análisis de almacenamiento: mapa por carpetas, archivos duplicados (por huella SHA-256) y archivos grandes y antiguos.'],
    diagnostics: ['10.0.0', 'Pruebas del sistema: almacenamiento, IndexedDB, cifrado, compresión, audio, gráficos, red, servicios y Service Worker con informe.'],
    qr: ['10.0.0', 'Lector de QR propio cuando el navegador no tiene lector integrado (Windows, Xbox, Linux, Firefox): funciona con imágenes y con la cámara.'],
    word: ['10.0.0', 'Insertar citas y bibliografía desde el Gestor de referencias, índice de contenidos automático y ecuaciones.'],
    terminal: ['10.0.0', 'Nuevos comandos: services, sched, events, hash y sysinfo10.']
  };                       // versión del esquema de datos del perfil
  K.t0 = Date.now();
  var html = document.documentElement;

  /* ---------- acceso seguro a localStorage ---------- */
  var LS = null;
  try { LS = window.localStorage; LS.getItem('x'); } catch (e) { LS = null; }
  K.storageOK = !!LS;
  function getRaw(k) { try { return LS ? LS.getItem(k) : null; } catch (e) { return null; } }
  function get(k, d) { var v = getRaw(k); if (v == null) return d; try { var p = JSON.parse(v); return p == null ? d : p; } catch (e) { return d; } }
  function set(k, v) { try { if (!LS) return false; LS.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  K._get = get; K._set = set; K._raw = getRaw;
  // ¿había datos de una versión anterior (8.0) antes de este arranque? Cualquier clave eisen_ que no sea de 9.0
  var hadOld = false;
  try { if (LS) for (var i = 0; i < LS.length; i++) { var kk = LS.key(i); if (/^eisen_/.test(kk) && !/^eisen_os9_/.test(kk) && kk !== 'eisen_guide_seen') { hadOld = true; break; } } } catch (e) { /* sin acceso */ }

  /* ---------- errores (Panel de diagnóstico) ---------- */
  K.errors = [];
  function pushErr(o) { K.errors.push(o); if (K.errors.length > 60) K.errors.shift(); }
  window.addEventListener('error', function (e) {
    if (e && e.target && e.target !== window && e.target.tagName) return; // recursos (img, script) se ignoran aquí
    pushErr({ t: Date.now(), m: String((e && e.message) || e), s: String((e && e.filename) || '').split('/').pop() + ':' + ((e && e.lineno) || 0) });
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason; pushErr({ t: Date.now(), m: 'Promesa rechazada: ' + String((r && r.message) || r), s: '' });
  });

  /* ---------- PRIME 11: protección contra bucles de arranque ----------
     Si EISEN se recarga 4 veces seguidas sin llegar a funcionar 10 s (lo marca prime11.js), se abre en modo seguro. */
  (function () {
    var bl = get('eisen_prime_bootloop', null); if (!bl || typeof bl !== 'object' || Date.now() - (+bl.t || 0) > 180000) bl = { n: 0, t: 0 };
    bl.n = (+bl.n || 0) + 1; bl.t = Date.now(); set('eisen_prime_bootloop', bl); K.bootLoop = bl.n;
    if (bl.n >= 4 && !/[?&]safe=1/.test(location.search)) { set('eisen_prime_bootloop', { n: 0, t: 0 }); K.bootLoopSafe = true; try { location.replace(location.pathname + '?safe=1&reason=bootloop'); } catch (e) { /* sin navegación */ } }
  })();

  /* ---------- perfiles locales (claves de dispositivo eisenku_sys_*) ---------- */
  var profiles = get('eisenku_sys_profiles', null);
  if (!Array.isArray(profiles) || !profiles.length) {
    profiles = [{ id: 'default', name: get('eisen_user_name', 'Eisen') || 'Eisen', avatar: get('eisen_user_avatar', '') || '', color: '#2a9d76', created: Date.now() }];
    set('eisenku_sys_profiles', profiles);
  }
  var active = get('eisenku_sys_active', 'default');
  if (!profiles.some(function (p) { return p.id === active; })) { active = profiles[0].id; set('eisenku_sys_active', active); }
  K.profileId = active;
  // cada perfil tiene su propia base de datos de archivos (el perfil principal conserva la de 8.0)
  window.EISEN_VAULT_DB = active === 'default' ? 'eisen_vault' : 'eisen_vault_' + active.replace(/[^\w-]/g, '');

  /* ---------- migraciones síncronas (8.x -> 9.0) con copia previa ---------- */
  // Cada migración guarda el valor original de las claves que toca para poder revertirla.
  var MIGRATIONS = [
    {
      id: 1, name: 'Identidad visual Enterprise y ajustes 9.0',
      up: function (ch) {
        // el acento por defecto de 8.0 (#0078d4) pasa al verde Enterprise; los acentos personalizados se respetan
        var acc = get('eisen_accent', null);
        if (acc == null || String(acc).toLowerCase() === '#0078d4') ch('eisen_accent', '#2a9d76');
        if (get('eisen_os9_prefs', null) == null) ch('eisen_os9_prefs', { density: 'comfortable', radius: 'standard', glass: 'auto' });
      }
    }
  ];
  K.MIGRATIONS = MIGRATIONS;
  var cur = +get('eisen_os9_schema', 0) || 0;
  var skip = +get('eisen_os9_skip_migr', 0) || 0;   // migraciones revertidas por el usuario
  var hist = get('eisen_os9_migrations', []); if (!Array.isArray(hist)) hist = [];
  MIGRATIONS.forEach(function (m) {
    if (m.id <= cur) return;
    if (m.id === skip) { cur = m.id; return; }
    var before = {};
    var change = function (k, v) { if (!(k in before)) before[k] = getRaw(k); set(k, v); };
    try { m.up(change); hist.push({ id: m.id, name: m.name, at: Date.now(), from: K.versionFrom || '8.x', before: before, ok: true }); cur = m.id; }
    catch (e) { hist.push({ id: m.id, name: m.name, at: Date.now(), ok: false, error: String(e && e.message || e), before: before }); }
  });
  set('eisen_os9_schema', cur);
  set('eisen_os9_migrations', hist.slice(-30));
  // revertir una migración: restaura exactamente los valores previos
  K.revertMigration = function (id) {
    var h = get('eisen_os9_migrations', []), i = -1;
    for (var j = h.length - 1; j >= 0; j--) if (h[j].id === id && h[j].ok && !h[j].reverted) { i = j; break; }
    if (i < 0) return false;
    var b = h[i].before || {};
    Object.keys(b).forEach(function (k) { try { if (b[k] == null) LS.removeItem(k); else LS.setItem(k, b[k]); } catch (e) { /* sin espacio */ } });
    h[i].reverted = Date.now(); set('eisen_os9_migrations', h);
    set('eisen_os9_skip_migr', id); // no volver a aplicarla automáticamente
    return true;
  };
  // volver a aplicar una migración revertida
  K.reapplyMigration = function (id) { set('eisen_os9_skip_migr', 0); set('eisen_os9_schema', id - 1); return true; };

  /* ---------- versión instalada (para "novedades" y Centro de actualizaciones) ---------- */
  var lastVer = get('eisen_os9_last_version', null);
  K.firstRun9 = lastVer == null;
  K.updatedFrom = lastVer && lastVer !== K.version ? lastVer : (lastVer == null && hadOld ? '8.0' : null);
  set('eisen_os9_last_version', K.version);

  /* ---------- preferencias visuales tempranas ---------- */
  var pr = get('eisen_os9_prefs', {}) || {};
  html.classList.add('os9');
  html.dataset.edition = 'enterprise';
  if (get('eisen_os9_lowpower', false)) html.classList.add('low-power', 'no-glass');
  if (pr.contrast) html.classList.add('hc');
  if (pr.reduceMotion || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && pr.reduceMotion !== false)) html.classList.add('reduce-motion');
  if (pr.density === 'compact') html.classList.add('dense');
  if (pr.radius) html.dataset.radius = pr.radius;
  if (pr.uiScale && pr.uiScale !== 1) html.style.setProperty('--ui-scale', String(pr.uiScale));
  if (pr.fontScale) html.style.setProperty('--font-scale', String(pr.fontScale));
  if (pr.focusRing) html.classList.add('focus-strong');
  if (pr.dyslexia) html.classList.add('font-readable');
  var env = get('eisen_env', 'windows'); html.dataset.env = env === 'linux' ? 'linux' : 'windows';
  var theme = get('eisen_theme', 'dark'); html.dataset.theme = theme;

  /* ---------- idioma, dirección y formatos regionales ---------- */
  var RTL = { ar: 1, he: 1, fa: 1, ur: 1 };
  var LOCALES = { es: 'es', en: 'en', pt: 'pt-BR', fr: 'fr', de: 'de', it: 'it', ja: 'ja', ko: 'ko', zh: 'zh-CN', 'zh-TW': 'zh-TW', ru: 'ru', ar: 'ar', hi: 'hi', nl: 'nl', tr: 'tr', pl: 'pl', uk: 'uk', id: 'id', sv: 'sv', ca: 'ca' };
  K.LOCALES = LOCALES;
  K.computeLocale = function () {
    var l = get('eisen_lang', 'es');
    var region = get('eisen_os9_region', '');      // p. ej. 'es-MX', 'en-US' (vacío = según idioma)
    var hc = get('eisen_os9_hour', '');            // '', 'h12' o 'h23'
    var base = region || LOCALES[l] || l || 'es';
    try { base = Intl.getCanonicalLocales(base)[0]; } catch (e) { base = 'es'; }
    K.locale = hc ? base + '-u-hc-' + hc : base;
    try { new Intl.DateTimeFormat(K.locale); } catch (e) { K.locale = base; }
    return K.locale;
  };
  K.applyDir = function (l) { html.lang = l || 'es'; html.dir = RTL[String(l || '').split('-')[0]] ? 'rtl' : 'ltr'; };
  K.applyDir(get('eisen_lang', 'es'));
  // paquetes de idioma 9.0: se cargan ANTES que el resto para que la interfaz aparezca ya traducida
  (function () {
    var l = String(get('eisen_lang', 'es') || 'es'), ok = /^(en|pt|fr|de|it|ja|ko|zh|zh-TW|ru|ar|hi|nl|tr|pl|uk|id|sv|ca)$/.test(l);
    if (!ok || document.readyState !== 'loading') return;
    var v = encodeURIComponent(K.version || '9');
    if (l !== 'en') document.write('<script src="js/os9/i18n/en.js?v=' + v + '"><\/script>');
    document.write('<script src="js/os9/i18n/' + l + '.js?v=' + v + '"><\/script>');
  })();
  K.computeLocale();
  // Las apps llaman a toLocale*String([]) o sin argumentos: se usa el idioma/región de EISENKU, no el del navegador.
  var wrap = function (proto, m) {
    var o = proto[m]; if (!o) return;
    proto[m] = function (l, opt) { if (l === undefined || (Array.isArray(l) && !l.length)) l = K.locale; try { return o.call(this, l, opt); } catch (e) { return o.call(this, undefined, opt); } };
  };
  wrap(Date.prototype, 'toLocaleDateString'); wrap(Date.prototype, 'toLocaleTimeString'); wrap(Date.prototype, 'toLocaleString');
  wrap(Number.prototype, 'toLocaleString');

  /* ---------- capacidades del navegador (se muestran en Información del sistema) ---------- */
  K.caps = {
    indexedDB: 'indexedDB' in window,
    serviceWorker: 'serviceWorker' in navigator,
    webgl: (function () { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; } })(),
    webrtc: 'RTCPeerConnection' in window,
    mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    fsAccess: 'showDirectoryPicker' in window,
    notifications: 'Notification' in window,
    clipboard: !!(navigator.clipboard && navigator.clipboard.writeText),
    share: 'share' in navigator,
    gamepad: 'getGamepads' in navigator,
    compression: 'CompressionStream' in window && 'DecompressionStream' in window,
    crypto: !!(window.crypto && crypto.subtle),
    broadcast: 'BroadcastChannel' in window,
    mathml: (function () { try { var m = document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math'); return 'MathMLElement' in window || !!m.namespaceURI; } catch (e) { return false; } })(),
    persist: !!(navigator.storage && navigator.storage.persist),
    xbox: /Xbox/i.test(navigator.userAgent),
    touch: !!(window.matchMedia && matchMedia('(pointer:coarse)').matches),
    lowMemory: (navigator.deviceMemory || 8) <= 2
  };
  // dispositivos modestos: arranca con efectos ligeros salvo que el usuario diga lo contrario
  if ((K.caps.lowMemory || K.caps.xbox) && get('eisen_os9_lowpower', null) == null) html.classList.add('no-glass');
})();

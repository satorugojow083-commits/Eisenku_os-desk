/* =====================================================================
   EISEN OS PRIME 11.0 · Apps (carga diferida): Centro PRIME, Descargas, WhatsApp Hub y Lanzador TV
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, P = K.prime, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, U = K.u10;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)];
  const now = () => Date.now(), caps = P.caps;
  const appOf = id => E.REG[id] || E.apps().find(a => a.id === id) || null;
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
  const tabs = (list, cur) => U.tabs(list, cur, 'tab');
  const saveOut = async (name, blob, folder = 'documents') => { if (caps.download && P.saveMode() !== 'vault') { E.download(name, blob); return 'device'; } await U.saveBlob(name, blob, folder); return 'vault'; };

  /* ============================== Centro PRIME ============================== */
  // Las 204 funciones nuevas de PRIME: id|área|nombre|dónde (app:ID = app PRIME diferida)
  const FEATS = `d1|desk|Ventanas que adaptan su diseño a su propio ancho|Todas las ventanas
d2|desk|Rescatar ventanas fuera de la pantalla|Ctrl+Alt+Inicio · menú de ventana
d3|desk|Transparencia por ventana|Menú de la barra de título
d4|desk|Enrollar ventana (solo la barra)|Menú de la barra de título
d5|desk|Agitar una ventana para minimizar las demás|Arrastrar la barra de título de lado a lado
d6|desk|Mover y redimensionar ventanas con teclado o mando|Alt+Mayús+M
d7|desk|Insignia «Nuevo» en apps recién instaladas|Escritorio e Inicio
d8|desk|Ordenar iconos por uso real|Clic derecho en el escritorio › PRIME
d9|desk|Bloquear iconos del escritorio|Clic derecho › PRIME · Configuración › Escritorio
d10|desk|Carpeta automática al instalar varias apps|Paquetes e instalación múltiple
s1|start|Sección «Recién instaladas»|Menú Inicio
s2|start|Sección «Más usadas» con contador real|Menú Inicio
s3|start|Búsqueda tolerante a errores («¿Quisiste decir…?»)|Búsqueda de Inicio
s4|start|Calculadora en la búsqueda|Escribe 2+2 o =raíz(16) en Inicio
s5|start|Todas las apps de la A a la Z con índice|Inicio › Todas las apps › A–Z
s6|start|Acciones rápidas PRIME|Menú Inicio
s7|start|Inicio a pantalla completa|Configuración › Escritorio
s8|start|Escribir en el escritorio abre la búsqueda|Escritorio
s9|start|Instalar y abrir desde la búsqueda|Búsqueda de Inicio
s10|start|Navegación con flechas en la cuadrícula de Inicio|Menú Inicio
t1|store|Acceso directo en el escritorio al instalar|App Center
t2|store|Entrada en el menú Inicio al instalar|App Center
t3|store|Registro real de apps instaladas (fecha, método, usos)|app:primecenter
t4|store|Instalación virtual: método elegido según el dispositivo|App Center · apps web
t5|store|Método de apertura por app y ventana de app EISEN|app:primecenter
t6|store|Paquetes de apps con un clic|app:primecenter
t7|store|Instalación y desinstalación múltiple|app:primecenter
t8|store|Exportar e importar la lista de apps|app:primecenter
t9|store|WhatsApp Hub integrado|app:whatsapp
t10|store|Enlaces para abrir o instalar apps (?app= · #install=)|Dirección de EISEN
c1|sync|Espejo duradero de todos los datos en IndexedDB|Automático
c2|sync|Sincronización en vivo entre pestañas|Automático
c3|sync|Protección de perfil entre pestañas|Automático
c4|sync|Reparación automática de datos dañados|Automático
c5|sync|Recuperación del entorno tras un borrado del navegador|Automático
c6|sync|Punto de restauración automático diario|Automático
c7|sync|Indicador de guardado en la bandeja|Barra de tareas
c8|sync|Sesiones abiertas y «cerrar las demás»|app:primecenter
c9|sync|Copiar el entorno a otro perfil local|app:primecenter
c10|sync|Almacenamiento persistente automático|Automático
c11|sync|Paquete de entorno ligero o completo (.eisenenv)|app:transfer
c12|sync|Código de transferencia con suma de control|app:transfer
c13|sync|QR animado en varias partes|app:transfer
c14|sync|Lector QR que reúne las partes (cámara o imágenes)|app:transfer
c15|sync|Red local con código de un solo uso|app:transfer
c16|sync|Fusión sin duplicados|app:transfer
c17|sync|Instalar EISEN como app (PWA)|app:transfer
c18|sync|Enlace o QR para instalar una app en otro dispositivo|app:transfer
x1|sec|Enlaces externos aislados (noopener/noreferrer)|Automático
x2|sec|Bloqueo de ventanas con direcciones inseguras|Automático
x3|sec|JSON seguro contra contaminación de prototipos|Importaciones
x4|sec|Pegado seguro en editores|Writer y editores
x5|sec|Exclusión de secretos al exportar|app:transfer
x6|sec|Cifrado AES-GCM con contraseña|app:transfer
x7|sec|Aviso y bloqueo de archivos peligrosos|app:downloads
x8|sec|Validación estricta de paquetes de entorno|app:transfer
x9|sec|Revisión de seguridad PRIME con arreglos|app:primecenter
x10|sec|HTML descargado sin scripts por defecto|app:downloads
w1|web|Instalar la página actual como app|Navegador › ⋮
w2|web|QR de la página actual|Navegador › ⋮
w3|web|Enviar la pestaña a otro dispositivo|Navegador › ⋮
w4|web|Anclar la página al escritorio|Navegador › ⋮
w5|web|Política de apertura para sitios que bloquean marcos|Automático
w6|web|Descargas web guardadas dentro de EISEN|Automático
w7|web|Copiar enlace sin rastreadores (utm, fbclid…)|Navegador › ⋮
w8|web|Abrir la página en una ventana de app|Navegador › ⋮
m1|media|Reproductor de descargas con velocidad|app:downloads
m2|media|Bucle A–B|app:downloads
m3|media|Imagen en imagen|app:downloads
m4|media|Capturar fotograma de un vídeo|app:downloads
m5|media|Temporizador de apagado|app:downloads
m6|media|Controles en la pantalla de bloqueo (Media Session)|app:downloads
m7|media|Reproducir una carpeta completa|app:downloads
m8|media|Editor rápido de imágenes (girar, voltear, tamaño, formato)|app:downloads
p1|study|Resumen automático de textos|app:studio
p2|study|Palabras clave y frases frecuentes|app:studio
p3|study|Preguntas de repaso con huecos|app:studio
p4|study|Legibilidad (INFLESZ) y tiempo de lectura|app:studio
p5|study|Esquema automático|app:studio
p6|study|Exportar preguntas a Tarjetas de estudio|app:studio
p7|study|Temporizador de examen a pantalla completa|app:studio
p8|study|Lectura en voz alta con resaltado|app:studio
p9|study|Plan de repaso espaciado con recordatorios|app:studio
p10|study|Estadísticas de palabras|app:studio
a1|auto|Reglas «Si… entonces…»|app:automate
a2|auto|Disparadores al instalar o abrir una app|app:automate
a3|auto|Disparador al descargar (organizar por tipo)|app:automate
a4|auto|Disparador al conectar un mando|app:automate
a5|auto|Disparadores sin conexión y al reconectar|app:automate
a6|auto|Disparadores de batería baja y a una hora|app:automate
a7|auto|Recordatorios en lenguaje natural|Domingo · app:automate
a8|auto|Comandos PRIME para Domingo|Maestro Domingo
a9|auto|Sugerencias inteligentes del sistema|Widget · Centro PRIME
a10|auto|Paleta de comandos|Ctrl+Mayús+Espacio
f1|files|Centro de descargas|app:downloads
f2|files|Descargar desde una URL dentro de EISEN|app:downloads
f3|files|Cola de descargas con cancelar y reintentar|app:downloads
f4|files|Organizar descargas por tipo|Configuración › Archivos
f5|files|Visores internos para todo lo descargado|app:downloads
f6|files|Compartir archivos (WhatsApp, correo…)|app:downloads
f7|files|Exportar al dispositivo cuando se pueda|app:downloads
f8|files|Liberar espacio: descargas grandes y antiguas|app:downloads
f9|files|Huella SHA-256 y verificación|app:downloads
f10|files|Instalar paquetes desde Descargas|app:downloads
f11|files|Recibir archivos compartidos desde otras apps del móvil|EISEN instalado como app
g1|pad|Cursor virtual con el mando|Ctrl+Alt+G · Centro de mandos
g2|pad|Vibración al aceptar y volver|Mando
g3|pad|Barra de ayuda de botones|Mando
g4|pad|Configuración automática para Xbox y TV|Primer arranque
g5|pad|Sin ratón emulado en Xbox (Edge heredado)|Xbox
g6|pad|Nuevas acciones asignables al mando|Centro de mandos
g7|pad|Indicador de mando en la bandeja|Barra de tareas
g8|pad|Lanzador TV|app:tvlauncher
g9|pad|Zoom de la interfaz desde el mando|Centro de mandos
g10|pad|Cerrar, maximizar y minimizar con el mando|Centro de mandos
h1|touch|Arrastre de ventanas táctil fiable|Automático
h2|touch|Sin «tirar para recargar»|Automático
h3|touch|Sin zoom por doble toque en botones|Automático
h4|touch|Teclado virtual sin tapar el campo|Automático
h5|touch|Gestos de borde (abajo, izquierda, derecha)|Pantalla táctil
h6|touch|Deslizar hacia abajo para minimizar|Barra de título maximizada
h7|touch|Pulsación larga = clic derecho|Barras, listas y tarjetas
h8|touch|Respuesta háptica|Gestos
h9|touch|Márgenes seguros para pantallas con muesca|Automático
h10|touch|Botones de ventana de 44 px en táctil|Automático
b1|tablet|Pantalla dividida con divisor arrastrable|Menú de ventana
b2|tablet|Dos dedos a los lados cambian de escritorio|Escritorio
b3|tablet|Modo tableta automático|Configuración › Dispositivos
b4|tablet|La pantalla dividida se recoloca al girar|Automático
b5|tablet|Detección de teclado físico|Automático
b6|tablet|Apps maximizadas en vertical|Tableta
b7|tablet|Apps abiertas en tarjetas (deslizar para cerrar)|Alt+Mayús+A · gesto desde abajo
b8|tablet|Doble toque en el título para maximizar|Barra de título
b9|tablet|Pantalla siempre encendida al ver o leer|Automático
b10|tablet|Modo kiosco con PIN|Configuración › Dispositivos
r1|perf|Prueba real de fluidez del equipo|Automático
r2|perf|Efectos según el nivel del equipo|Automático
r3|perf|Cierre de apps inactivas en segundo plano|Configuración › Rendimiento
r4|perf|Precarga de apps al pasar por su icono|Automático
r5|perf|Vigilante de bloqueos con «Cerrar app»|Automático
r6|perf|Animaciones en pausa en ventanas ocultas|Automático
r7|perf|Listas largas más rápidas (content-visibility)|Automático
r8|perf|Liberación automática de espacio al llenarse|Automático
r9|perf|Iconos de apps web guardados en el dispositivo|Automático
r10|perf|Módulos PRIME disponibles sin conexión|Service Worker
y1|a11y|Objetivos táctiles grandes|Configuración › Accesibilidad
y2|a11y|Regla de lectura|Configuración › Accesibilidad
y3|a11y|Subrayar enlaces|Configuración › Accesibilidad
y4|a11y|Espaciado de texto amplio|Configuración › Accesibilidad
y5|a11y|Anuncios para lectores de pantalla|Automático
y6|a11y|Modo fácil|Escritorio › PRIME · Domingo
y7|a11y|Nombres accesibles para botones de icono|Automático
y8|a11y|Atenuar todo salvo la ventana activa|Configuración › Accesibilidad
y9|a11y|Notificaciones que no se cierran solas|Configuración › Accesibilidad
y10|a11y|Mostrar teclas y clics pulsados|Configuración › Accesibilidad
l1|look|Acento a partir del fondo de pantalla|Configuración › Personalización
l2|look|Fondo dinámico de día y de noche|Configuración › Personalización
l3|look|Brillo de acento en la ventana activa|Configuración › Personalización
l4|look|Estilo de las etiquetas del escritorio|Configuración › Escritorio
l5|look|Fuente de la interfaz|Configuración › Personalización
l6|look|Mensaje propio en el arranque|Configuración › Personalización
l7|look|6 fondos PRIME|Configuración › Personalización
l8|look|Estilos de la barra de tareas|Configuración › Personalización
l9|look|Color de los iconos (vivo, sobrio, monocromo)|Configuración › Escritorio
l10|look|Sonidos PRIME|Configuración › Personalización
q1|diag|Salud del sistema con reparaciones|app:primecenter
q2|diag|Modo seguro automático ante bucles de arranque|Automático
q3|diag|Restaurar ventanas tras un cierre inesperado|Automático
q4|diag|Página de recuperación independiente|recovery.html
q5|diag|Deshacer cambios de ajustes|app:primecenter
q6|diag|Informe de errores anónimo|app:primecenter
q7|diag|Reparar escritorio|app:primecenter
q8|diag|Reparar el registro de apps|app:primecenter
q9|diag|Restablecer Inicio y barra de tareas|app:primecenter
q10|diag|Volver a registrar el Service Worker|app:primecenter
u1|plug|Formato .eisenplugin validado|app:plugins
u2|plug|Gestor de plugins|app:plugins
u3|plug|Plugins de temas|app:plugins
u4|plug|Plugins de enlaces rápidos|Inicio
u5|plug|Plugins de comandos|Domingo y paleta
u6|plug|Widgets de plugins aislados (CSP)|Widgets
u7|plug|Plugins de fondos|Configuración
u8|plug|Permisos y registro de seguridad de plugins|app:plugins
u9|plug|Plugins desactivados en modo seguro|Automático
u10|plug|Plugin de ejemplo y exportación|app:plugins
i1|wid|Widget Descargas recientes|Widgets
i2|wid|Widget Guardado y sesiones|Widgets
i3|wid|Widget Recién instaladas|Widgets
i4|wid|Widget Clase actual|Widgets
i5|wid|Widget Próximo examen|Widgets
i6|wid|Widget Mando|Widgets
i7|wid|Widget Almacenamiento|Widgets
i8|wid|Widget Acciones rápidas PRIME|Widgets
i9|wid|Widget WhatsApp rápido|Widgets
i10|wid|Widget Sugerencias|Widgets
n1|notif|Notificaciones con botones de acción|Automático
n2|notif|Notificaciones de progreso|Descargas y transferencias
n3|notif|Avisos del sistema en segundo plano|Configuración › Notificaciones
n4|notif|Insignia de no leídas (reloj e icono de la app)|Barra de tareas
n5|notif|Horario de silencio automático|Configuración › Notificaciones
n6|notif|Recordatorios con posponer|Automatización
n7|notif|Agrupar avisos repetidos|Automático
n8|notif|Avisos críticos que atraviesan «No molestar»|Automático
n9|notif|Notificaciones repetidas con contador ×N|Automático
n10|notif|Resumen al volver|Automático`.split('\n').map(l => { const [id, area, name, where] = l.split('|'); return { id, area, name, where }; });
  const AREAS = { desk: 'Escritorio y ventanas', start: 'Menú Inicio', store: 'Tienda y aplicaciones', sync: 'Cuentas, sincronización y transferencia', sec: 'Seguridad y privacidad', web: 'Navegador', media: 'Multimedia', study: 'Productividad y escuela', auto: 'IA y automatización', files: 'Archivos y descargas', pad: 'Xbox y mando', touch: 'Teléfonos y táctil', tablet: 'Tabletas', perf: 'Rendimiento', a11y: 'Accesibilidad', look: 'Personalización', diag: 'Diagnóstico y recuperación', plug: 'Plugins', wid: 'Widgets', notif: 'Notificaciones' };
  const CORE = { c1: () => P.syncState !== 'off', c2: () => caps.bc || true, c3: () => true, c4: () => P.syncState !== 'off', c5: () => P.syncState !== 'off', c6: () => true, c8: () => true, c9: () => true, c10: () => !!(navigator.storage && navigator.storage.persist), t1: () => true, t2: () => true, t4: () => true, t10: () => true, x1: () => true, x2: () => true, x3: () => true, x4: () => true, w5: () => true, w6: () => true, r8: () => true, r10: () => 'serviceWorker' in navigator, y5: () => true, q2: () => true, q3: () => true, q4: () => true, n1: () => true, n2: () => true, d10: () => true, g5: () => 'gamepadInputEmulation' in navigator, f11: () => 'serviceWorker' in navigator, b9: () => caps.wakeLock, n4: () => true, w1: () => !!P.webTools, w2: () => !!P.webTools, w3: () => !!P.webTools, w4: () => !!P.webTools, w7: () => !!P.webTools, w8: () => !!P.webTools };
  P.FEATURES = FEATS; P.AREAS = AREAS;
  const featOk = f => f.where.startsWith('app:') ? !!E.REG[f.where.slice(4)] : P.feat.has(f.id) || (CORE[f.id] ? !!CORE[f.id]() : false);
  const KEYNAMES = { theme: 'Tema', accent: 'Color de acento', wp: 'Fondo de pantalla', customWallpaper: 'Fondo personalizado', env: 'Entorno Windows/Linux', lang: 'Idioma', os9_prefs: 'Preferencias de la interfaz', icon_size: 'Tamaño de iconos', pinned: 'Barra de tareas', start_pins: 'Anclados de Inicio', desk_items: 'Escritorio', installed: 'Apps instaladas', os9_widgets: 'Widgets', os10_iconpack: 'Paquete de iconos', os10_theme_vars: 'Colores del tema', os10_panels: 'Paneles', save_mode: 'Modo de descargas', snap: 'Ajuste de ventanas', dbl_open: 'Abrir con doble clic', user_name: 'Nombre de usuario', user_avatar: 'Avatar', os9_region: 'Región', os9_hour: 'Formato de hora', os9_desk_names: 'Nombres de escritorios', os10_dispcustom: 'Perfiles de pantalla', os10_disp_active: 'Perfil de pantalla', user_apps: 'Apps web añadidas' };
  // reparaciones reales (q7-q10)
  const repair = P.repair = {
    desktop() { const it = E.desktopItems ? E.desktopItems() : []; const seen = new Set(); let n = 0; for (let i = it.length - 1; i >= 0; i--) { const x = it[i]; if (x.t === 'app' && !appOf(x.ref)) { it.splice(i, 1); n++; continue; } if (x.t === 'app' && !x.p) { if (seen.has(x.ref)) { it.splice(i, 1); n++; continue; } seen.add(x.ref); } if (x.p && !it.some(f => f.id === x.p && f.t === 'folder')) { x.p = null; x.x = null; n++; } } it.forEach(x => { if (!x.p && (!Number.isFinite(x.x) || x.x < 0 || !Number.isFinite(x.y) || x.y < 0)) { x.x = null; x.y = null; } }); E.desktopRender && E.desktopRender(); return n; },
    registry() { const m = S.get('installed', {}) || {}; let n = 0; Object.keys(m).forEach(id => { if (!appOf(id)) { delete m[id]; n++; } }); S.set('installed', m); const r = P.reg.all(); Object.keys(r).forEach(id => { if (!appOf(id)) { delete r[id]; n++; } }); S.set('prime_registry', r); return n; },
    start() { let n = 0; ['pinned', 'start_pins'].forEach(k => { const l = S.get(k, null); if (!Array.isArray(l)) return; const ok = [...new Set(l)].filter(id => appOf(id)); n += l.length - ok.length; S.set(k, ok); }); E.renderBarForce && E.renderBarForce(); return n; },
    async sw() { if (!('serviceWorker' in navigator)) return 0; const regs = await navigator.serviceWorker.getRegistrations(); for (const r of regs) await r.unregister(); let n = 0; if (window.caches) { const ks = await caches.keys(); for (const k of ks) if (k.startsWith('eisenku-')) { await caches.delete(k); n++; } } try { await navigator.serviceWorker.register('sw.js'); } catch { /* sin SW */ } return n; },
    async storage() { const st = K.integrity.storage(); if (!st.bad.length) return 0; let n = 0; const mir = await P.mirror.export().catch(() => ({})); st.bad.forEach(k => { const v = mir[k]; try { if (v != null && (() => { try { JSON.parse(v); return true; } catch { return false; } })()) localStorage.setItem(k, v); else localStorage.removeItem(k); n++; } catch { /* ignorar */ } }); return n; }
  };
  // revisión de seguridad (x9)
  async function secReview() {
    const out = [], p = K.profiles.current();
    out.push([!!p.pin, 'PIN en tu perfil', 'Protege tu perfil con un PIN (se guarda con PBKDF2).', () => E.launch('settings', 'security')]);
    out.push([+K.pref('autoLock') > 0, 'Bloqueo automático', 'Bloquea EISEN tras unos minutos sin uso.', () => E.launch('settings', 'security')]);
    let pers = false; try { pers = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false; } catch { pers = false; }
    out.push([pers, 'Datos protegidos ante limpiezas', 'Pide almacenamiento persistente para que el navegador no borre EISEN.', async () => { try { if (await navigator.storage.persist()) E.toast('🛡️ ' + tr('Protegido')); else E.toast(tr('El navegador no lo concedió')); } catch { E.toast(tr('No disponible')); } }]);
    out.push([location.protocol === 'https:' || /^(localhost|127\.)/.test(location.hostname), 'Conexión cifrada o local', 'Abre EISEN por HTTPS (Netlify/Cloudflare) o en este equipo; en la red local sin HTTPS cualquiera de la red podría ver el tráfico.', null]);
    const secrets = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^eisen_(yt_key|sp_client|dom_cfg)$/.test(k)) { const v = localStorage.getItem(k) || ''; if (v.length > 6 && !/^""$|^\{\}$/.test(v)) secrets.push(k.slice(6)); } } } catch { /* ignorar */ }
    out.push([!secrets.length, 'Claves de servicios', secrets.length ? 'Hay claves guardadas (' + secrets.join(', ') + '): no se incluyen al exportar salvo que lo pidas.' : 'No hay claves de servicios guardadas.', null]);
    const pk = (S.get('os9_packages', []) || []).filter(x => (x.permissions || []).includes('network')); out.push([!pk.length, 'Apps de terceros con Internet', pk.length ? pk.length + ' apps de terceros pueden conectarse a Internet.' : 'Ninguna app de terceros tiene acceso a Internet.', () => E.launch('appcenter', 'packages')]);
    out.push([P.syncState !== 'off', 'Espejo de seguridad PRIME', 'Copia en IndexedDB para reparar y recuperar tus ajustes.', () => P.flush()]);
    const lastB = S.get('os9_last_backup', 0); out.push([!!lastB && now() - lastB < 30 * 86400000, 'Copia o transferencia reciente', lastB ? tr('Última') + ': ' + K.fmt.dt(lastB) : 'Nunca exportaste tu entorno.', () => E.launch('transfer', 'export')]);
    return out;
  }
  function errorReport() {
    return { app: 'EISEN OS PRIME', version: K.version, build: K.build, at: new Date().toISOString(), ua: navigator.userAgent.replace(/\([^)]*\)/, '(…)'), caps: { tier: caps.tier, tv: caps.tv, touch: caps.touch, download: caps.download }, safeMode: !!K.safeMode, sync: P.syncState, services: (K.services ? K.services.list() : []).filter(s => s.state !== 'running' || s.errors).map(s => ({ id: s.id, state: s.state, errors: s.errors, last: s.lastError })), errors: (K.errors || []).slice(-20).map(e => ({ t: new Date(e.t).toISOString(), m: String(e.m).replace(/https?:\/\/\S+/g, '<url>').slice(0, 200), s: e.s })), openApps: [...document.querySelectorAll('.window.open')].map(w => w.id.slice(4)).slice(0, 20), memMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
  }

  K.define('primecenter', {
    init(b, w, arg) {
      const TABS = [['home', 'Resumen', 'home'], ['apps', 'Apps instaladas', 'grid'], ['features', 'Funciones PRIME', 'sparkle'], ['health', 'Salud y reparación', 'pulse'], ['journal', 'Deshacer cambios', 'history'], ['sessions', 'Sesiones y perfiles', 'users']];
      let tab = TABS.some(t => t[0] === arg) ? arg : 'home', aq = '', asort = 'name', sel = new Set(), fq = '';
      b.innerHTML = `<div class="p11-app"><header class="p11-apph"><div class="p11-brand"><span class="p11-logo">✦</span><div><b>EISEN OS PRIME</b><small>${esc(K.version)} · ${esc(K.build)}</small></div></div><div data-tabs></div></header><main class="p11-main" data-v></main></div>`;
      const V = q(b, '[data-v]');
      const go = t => { tab = t; render(); }; w.__p11go = go;
      async function render() {
        q(b, '[data-tabs]').innerHTML = tabs(TABS, tab);
        if (tab === 'home') {
          const peers = P.peers.size, dl = P.downloads.list(), reg = P.reg.installed();
          const okF = FEATS.filter(featOk).length;
          V.innerHTML = `<div class="k9-grid p11-kpis" style="--min:150px">${U.kpi({ saved: '✓', saving: '…', error: '⚠', off: '—' }[P.syncState] || '?', 'Guardado')}${U.kpi(reg.length, 'Apps instaladas')}${U.kpi(dl.length, 'Descargas en EISEN')}${U.kpi(peers + 1, 'Pestañas abiertas')}${U.kpi(caps.tier, 'Nivel del equipo')}${U.kpi(okF + '/' + FEATS.length, 'Funciones PRIME activas')}</div>
            ${U.note(caps.download ? (P.saveMode() === 'vault' ? 'Las descargas se guardan solo dentro de EISEN.' : 'Este dispositivo descarga archivos y EISEN guarda una copia en Descargas.') : 'Este dispositivo no permite descargas: todo lo que descargas queda dentro de EISEN y se abre aquí.', 'info')}
            <h3 class="p11-h3">${esc(tr('Sugerencias'))}</h3><div class="k9-card" data-sug>…</div>
            <h3 class="p11-h3">${esc(tr('Accesos rápidos'))}</h3><div class="p11-actions">${[['downloads', '⬇️', 'Descargas'], ['transfer', '🔁', 'Transferir'], ['plugins', '🧩', 'Plugins'], ['studio', '🎓', 'Estudio'], ['automate', '⚡', 'Automatización'], ['tvlauncher', '📺', 'Lanzador TV'], ['whatsapp', '💬', 'WhatsApp']].map(x => `<button class="p11-act" data-open="${x[0]}"><span>${x[1]}</span>${esc(tr(x[2]))}</button>`).join('')}<button class="p11-act" data-do="palette"><span>⌘</span>${esc(tr('Comandos'))}</button></div>
            <p class="k9-small k9-muted" style="margin-top:12px">${esc(tr('Dispositivo'))}: ${esc([caps.xbox ? 'Xbox' : caps.tv ? 'TV' : caps.android ? 'Android' : caps.ios ? 'iOS' : caps.touch ? 'táctil' : 'escritorio', caps.download ? tr('descargas permitidas') : tr('sin descargas'), caps.popup ? tr('ventanas externas') : tr('sin ventanas externas'), caps.shareFiles ? tr('compartir archivos') : ''].filter(Boolean).join(' · '))}</p>`;
          P.suggest().then(l => { const box = q(V, '[data-sug]'); if (!box) return; box.innerHTML = l.map((s, i) => `<div class="k9-li"><span style="font-size:20px">${esc(s[0])}</span><div class="t"><b>${esc(tr(s[1]))}</b></div><button class="k9-btn" data-sug="${i}">${esc(tr('Hacer'))}</button></div>`).join(''); box.__l = l; });
        }
        if (tab === 'apps') {
          let l = P.reg.installed().filter(a => !aq || K.norm(a.name + ' ' + a.kind + ' ' + a.id).includes(K.norm(aq)));
          l.sort((x, y) => asort === 'date' ? (y.at || 0) - (x.at || 0) : asort === 'use' ? (y.n || 0) - (x.n || 0) : asort === 'last' ? (y.last || 0) - (x.last || 0) : x.name.localeCompare(y.name));
          const KIND = { app: 'App', web: 'Web', game: 'Juego', package: 'Paquete', android: 'Android' };
          V.innerHTML = `<div class="k9-row p11-tools"><input class="input-text" data-aq placeholder="${esc(tr('Buscar en las apps instaladas…'))}" value="${esc(aq)}" style="flex:1;min-width:160px"><select class="input-text" data-asort>${[['name', 'Nombre'], ['date', 'Fecha de instalación'], ['use', 'Más usadas'], ['last', 'Uso reciente']].map(([v, t]) => `<option value="${v}"${v === asort ? ' selected' : ''}>${esc(tr(t))}</option>`).join('')}</select><button class="k9-btn" data-do="export-list">${I('download', 14)} ${esc(tr('Exportar lista'))}</button><button class="k9-btn" data-do="import-list">${I('upload', 14)} ${esc(tr('Importar lista'))}</button></div>
            <div class="k9-row p11-tools" data-selbar ${sel.size ? '' : 'hidden'}><b>${sel.size} ${esc(tr('seleccionadas'))}</b><button class="k9-btn" data-do="sel-desk">${esc(tr('Al escritorio'))}</button><button class="k9-btn dng" data-do="sel-uninst">${esc(tr('Desinstalar'))}</button><button class="k9-btn" data-do="sel-clear">${esc(tr('Quitar selección'))}</button></div>
            <h3 class="p11-h3">${esc(tr('Paquetes de apps'))}</h3><div class="p11-bundles">${P.BUNDLES.map(x => { const miss = x.apps.filter(id => !E.isInstalled(id)).length; return `<div class="k9-card p11-bundle"><span>${x.icon}</span><b>${esc(tr(x.name))}</b><small>${x.apps.length} apps${miss ? ' · ' + miss + ' ' + esc(tr('por instalar')) : ' · ' + esc(tr('instalado'))}</small><button class="k9-btn ${miss ? 'pri' : ''}" data-bundle="${x.id}" ${miss ? '' : 'disabled'}>${esc(miss ? tr('Instalar') : tr('Listo'))}</button></div>`; }).join('')}</div>
            <h3 class="p11-h3">${l.length} ${esc(tr('apps instaladas'))}</h3><div class="k9-card p11-table">${l.map(a => { const web = a.kind === 'web'; return `<div class="k9-li"><input type="checkbox" data-sel="${esc(a.id)}" ${sel.has(a.id) ? 'checked' : ''} ${E.CORE_APPS.includes(a.id) ? 'disabled' : ''} aria-label="${esc(tr('Seleccionar'))} ${esc(a.name)}">${E.tile(appOf(a.id) || a, 30)}<div class="t"><b>${esc(a.name)} <span class="k9-badge">${esc(tr(KIND[a.kind] || a.kind))}</span></b><small>${a.at ? esc(tr('Instalada')) + ' ' + esc(K.fmt.dt(a.at)) + ' · ' : ''}${a.n ? a.n + ' ' + esc(tr('usos')) : esc(tr('sin usar'))}${a.last ? ' · ' + esc(tr('último')) + ' ' + esc(K.fmt.rel(a.last)) : ''}</small></div>${web ? `<select class="input-text p11-msel" data-method="${esc(a.id)}" title="${esc(tr('Cómo se abre'))}">${['eisen', 'appwin', 'external'].map(m => `<option value="${m}"${P.methodOf(a.id) === m ? ' selected' : ''}>${esc(tr(P.METHODS[m]))}</option>`).join('')}</select>` : `<span class="k9-badge">${esc(tr(P.METHODS[a.method] || 'App integrada'))}</span>`}<button class="k9-btn pri" data-open="${esc(a.id)}">${esc(tr('Abrir'))}</button></div>`; }).join('')}</div>`;
        }
        if (tab === 'features') {
          const ok = FEATS.filter(featOk).length, f2 = FEATS.filter(f => !fq || K.norm(f.name + ' ' + f.where + ' ' + AREAS[f.area]).includes(K.norm(fq)));
          const groups = {}; f2.forEach(f => (groups[f.area] = groups[f.area] || []).push(f));
          V.innerHTML = `<div class="k9-row p11-tools"><input class="input-text" data-fq placeholder="${esc(tr('Buscar entre las funciones nuevas…'))}" value="${esc(fq)}" style="flex:1"><span class="k9-badge g">${ok} / ${FEATS.length} ${esc(tr('activas en este dispositivo'))}</span></div>${Object.keys(AREAS).filter(k => groups[k]).map(k => `<details class="k9-card p11-farea" ${fq ? 'open' : ''}><summary><b>${esc(tr(AREAS[k]))}</b><span class="k9-badge">${groups[k].length}</span></summary>${groups[k].map(f => { const on = featOk(f); return `<div class="p11-feat ${on ? 'on' : 'off'}"><span>${on ? '✓' : '—'}</span><b>${esc(tr(f.name))}</b><small>${esc(f.where.startsWith('app:') ? (appOf(f.where.slice(4)) || {}).name || f.where : tr(f.where))}${on ? '' : ' · ' + esc(tr('no disponible en este dispositivo'))}</small>${f.where.startsWith('app:') ? `<button class="k9-btn" data-open="${esc(f.where.slice(4))}">${esc(tr('Abrir'))}</button>` : ''}</div>`; }).join('')}</details>`).join('')}`;
        }
        if (tab === 'health') {
          V.innerHTML = `<div class="k9-row p11-tools"><button class="k9-btn pri" data-do="health-run">${I('pulse', 14)} ${esc(tr('Comprobar ahora'))}</button><button class="k9-btn" data-do="report">${I('copy', 14)} ${esc(tr('Informe de errores'))}</button><a class="k9-btn" href="recovery.html" target="_blank" rel="noopener">${I('shield', 14)} ${esc(tr('Página de recuperación'))}</a></div><div data-checks class="k9-card">${esc(tr('Pulsa «Comprobar ahora».'))}</div><h3 class="p11-h3">${esc(tr('Revisión de seguridad'))}</h3><div data-sec class="k9-card">…</div>`;
          runHealth(); secReview().then(l => { const box = q(V, '[data-sec]'); if (!box) return; const sc = Math.round(l.filter(x => x[0]).length / l.length * 100); box.innerHTML = `<div class="k9-row"><b class="p11-score">${sc}</b><span class="k9-muted">/ 100</span>${U.meter(100 - sc)}</div>` + l.map((x, i) => `<div class="k9-li"><span>${x[0] ? '✅' : '⚠️'}</span><div class="t"><b>${esc(tr(x[1]))}</b><small>${esc(tr(x[2]))}</small></div>${!x[0] && x[3] ? `<button class="k9-btn" data-secfix="${i}">${esc(tr('Arreglar'))}</button>` : ''}</div>`).join(''); box.__l = l; });
        }
        if (tab === 'journal') {
          const l = P.journal.list();
          V.innerHTML = `${U.note('Cada cambio de apariencia, escritorio, anclajes o apps instaladas se puede deshacer. Tras deshacer, recarga para ver el resultado.', 'info')}<div class="k9-row p11-tools"><button class="k9-btn" data-do="reload">${I('refresh', 14)} ${esc(tr('Recargar ahora'))}</button><button class="k9-btn" data-do="journal-clear" ${l.length ? '' : 'disabled'}>${esc(tr('Vaciar el historial'))}</button></div><div class="k9-card p11-table">${l.map((j, i) => `<div class="k9-li"><span>↩️</span><div class="t"><b>${esc(tr(KEYNAMES[j.k.slice(6)] || j.k.slice(6)))}</b><small>${esc(K.fmt.dt(j.t))} · ${esc(K.fmt.rel(j.t))}</small></div><button class="k9-btn" data-undo="${i}">${esc(tr('Deshacer'))}</button></div>`).join('') || `<p class="k9-muted">${esc(tr('No hay cambios recientes.'))}</p>`}</div>`;
        }
        if (tab === 'sessions') {
          const me = P.tabId, peers = [...P.peers.entries()], prof = K.profiles.list();
          V.innerHTML = `<h3 class="p11-h3">${esc(tr('Pestañas de EISEN abiertas'))}</h3><div class="k9-card p11-table"><div class="k9-li"><span>🟢</span><div class="t"><b>${esc(tr('Esta pestaña'))}</b><small>${esc(K.fmt.dt(P.t0))}</small></div><span class="k9-badge g">${esc(tr('actual'))}</span></div>${peers.map(([id, x]) => `<div class="k9-li"><span>🗂️</span><div class="t"><b>${esc(x.ua || tr('Pestaña'))}</b><small>${esc(tr('Abierta'))} ${esc(K.fmt.rel(x.since || x.at))} · ${esc(tr('visto'))} ${esc(K.fmt.rel(x.at))}${x.pid !== K.profileId ? ' · ' + esc(tr('otro perfil')) : ''}</small></div></div>`).join('')}</div><div class="k9-row p11-tools"><button class="k9-btn dng" data-do="closeothers" ${peers.length ? '' : 'disabled'}>${esc(tr('Cerrar EISEN en las demás pestañas'))}</button></div>${U.note('Los cambios de apps, escritorio, anclajes, widgets y fondo se aplican en vivo en todas las pestañas del mismo perfil. Si otra pestaña cambia de perfil, esta deja de guardar para no mezclar datos.', 'info')}
            <h3 class="p11-h3">${esc(tr('Perfiles (cuentas locales)'))}</h3><div class="k9-card p11-table">${prof.map(p => `<div class="k9-li"><span class="user-avatar" style="background:${esc(p.color || '#2a9d76')}">${esc(p.avatar || (p.name || '?')[0])}</span><div class="t"><b>${esc(p.name)}${p.id === K.profileId ? ' · ' + esc(tr('actual')) : ''}</b><small>${p.pin ? '🔒 PIN' : esc(tr('sin PIN'))}</small></div>${p.id !== K.profileId ? `<button class="k9-btn" data-copyto="${esc(p.id)}">${esc(tr('Copiar mi entorno aquí'))}</button>` : ''}</div>`).join('')}</div><div class="k9-row p11-tools"><button class="k9-btn" data-do="profiles">${esc(tr('Administrar perfiles'))}</button><button class="k9-btn" data-open="transfer">${esc(tr('Transferir a otro dispositivo'))}</button></div>`;
        }
      }
      async function runHealth() {
        const box = q(V, '[data-checks]'); if (!box) return; box.innerHTML = `<p class="k9-muted">${esc(tr('Comprobando…'))}</p>`;
        const rows = [];
        const st = K.integrity.storage(); rows.push([!st.bad.length, 'Datos locales legibles', st.bad.length ? st.bad.length + ' ' + tr('claves dañadas') : K.fmt.bytes(st.total) + ' ' + tr('en uso'), st.bad.length ? ['storage', 'Reparar'] : null]);
        rows.push([P.syncState === 'saved' || P.syncState === 'saving', 'Espejo PRIME en IndexedDB', P.syncState === 'off' ? tr('No disponible en este navegador') : (P.mirror.last ? tr('Actualizado') + ' ' + K.fmt.rel(P.mirror.last) : tr('Pendiente')), ['flush', 'Guardar ahora']]);
        let est = null; try { est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; } catch { est = null; }
        if (est && est.quota) rows.push([est.usage / est.quota < .85, 'Espacio disponible', K.fmt.bytes(est.usage) + ' / ' + K.fmt.bytes(est.quota), est.usage / est.quota >= .85 ? ['downloads', 'Liberar espacio'] : null]);
        let swOk = false; try { swOk = 'serviceWorker' in navigator && !!(await navigator.serviceWorker.getRegistration()); } catch { swOk = false; }
        rows.push([swOk || !('serviceWorker' in navigator), 'Modo sin conexión (Service Worker)', swOk ? tr('Activo') : tr('No registrado'), ['sw', 'Volver a registrar']]);
        const it = E.desktopItems ? E.desktopItems() : []; const badDesk = it.filter(x => x.t === 'app' && !appOf(x.ref)).length + (it.filter(x => x.t === 'app' && !x.p).length - new Set(it.filter(x => x.t === 'app' && !x.p).map(x => x.ref)).size);
        rows.push([!badDesk, 'Escritorio', badDesk ? badDesk + ' ' + tr('accesos rotos o duplicados') : it.length + ' ' + tr('elementos correctos'), badDesk ? ['desktop', 'Reparar escritorio'] : null]);
        const inst = S.get('installed', {}) || {}; const badReg = Object.keys(inst).filter(id => !appOf(id)).length;
        rows.push([!badReg, 'Registro de apps', badReg ? badReg + ' ' + tr('entradas de apps que ya no existen') : P.reg.installed().length + ' ' + tr('apps instaladas'), badReg ? ['registry', 'Reparar registro'] : null]);
        const badPins = ['pinned', 'start_pins'].reduce((n, k) => { const l = S.get(k, null); return n + (Array.isArray(l) ? l.filter(id => !appOf(id)).length + (l.length - new Set(l).size) : 0); }, 0);
        rows.push([!badPins, 'Inicio y barra de tareas', badPins ? badPins + ' ' + tr('anclajes no válidos') : tr('Correctos'), badPins ? ['start', 'Restablecer'] : null]);
        const errs = (K.errors || []).length; rows.push([!errs, 'Errores en esta sesión', errs ? errs + ' ' + tr('errores registrados') : tr('Ninguno'), errs ? ['report', 'Ver informe'] : null]);
        rows.push([!K.safeMode, 'Modo de arranque', K.safeMode ? tr('Modo seguro') : tr('Normal'), K.safeMode ? ['reload-normal', 'Volver al modo normal'] : null]);
        box.innerHTML = rows.map(r => `<div class="k9-li"><span>${r[0] ? '✅' : '⚠️'}</span><div class="t"><b>${esc(tr(r[1]))}</b><small>${esc(String(r[2]))}</small></div>${r[3] ? `<button class="k9-btn${r[0] ? '' : ' pri'}" data-fix="${r[3][0]}">${esc(tr(r[3][1]))}</button>` : ''}</div>`).join('');
      }
      b.addEventListener('input', e => { if (e.target.matches('[data-aq]')) { aq = e.target.value; clearTimeout(b.__t); b.__t = setTimeout(() => { render().then(() => { const i = q(V, '[data-aq]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 200); } if (e.target.matches('[data-fq]')) { fq = e.target.value; clearTimeout(b.__t); b.__t = setTimeout(() => { render().then(() => { const i = q(V, '[data-fq]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 200); } });
      b.addEventListener('change', e => {
        if (e.target.matches('[data-asort]')) { asort = e.target.value; render(); }
        if (e.target.matches('[data-method]')) { P.setMethod(e.target.dataset.method, e.target.value); E.toast(tr('Se abrirá con') + ': ' + tr(P.METHODS[e.target.value])); }
        if (e.target.matches('[data-sel]')) { e.target.checked ? sel.add(e.target.dataset.sel) : sel.delete(e.target.dataset.sel); const bar = q(V, '[data-selbar]'); if (bar) { bar.hidden = !sel.size; bar.querySelector('b').textContent = sel.size + ' ' + tr('seleccionadas'); } }
      });
      b.addEventListener('click', async e => {
        const t = e.target;
        const tb = t.closest('[data-tab]'); if (tb) return go(tb.dataset.tab);
        const o = t.closest('[data-open]'); if (o) { const id = o.dataset.open; if (!E.isInstalled(id) && appOf(id)) E.setInstalled(id, true); E.launch(id); return; }
        const sg = t.closest('[data-sug]'); if (sg) { const box = t.closest('[data-sug]').closest('.k9-card'); const l = box && box.__l; if (l && l[+sg.dataset.sug]) l[+sg.dataset.sug][2](); return; }
        const bu = t.closest('[data-bundle]'); if (bu) { const B = P.BUNDLES.find(x => x.id === bu.dataset.bundle); const n = P.bulkInstall(B.apps, B.name); E.notify(tr('Paquete instalado'), B.name + ': ' + n + ' ' + tr('apps nuevas en una carpeta del escritorio'), B.icon); render(); return; }
        const un = t.closest('[data-undo]'); if (un) { if (P.journal.undo(+un.dataset.undo)) { P.notify(tr('Cambio deshecho'), tr('Recarga para ver el resultado.'), { icon: '↩️', actions: [{ label: 'Recargar', primary: true, run: () => location.reload() }] }); } render(); return; }
        const cp = t.closest('[data-copyto]'); if (cp) return copyToProfile(cp.dataset.copyto);
        const fx = t.closest('[data-fix]'); if (fx) { const k = fx.dataset.fix; let msg = ''; if (k === 'flush') { await P.flush(); msg = tr('Espejo actualizado'); } else if (k === 'downloads') E.launch('downloads', 'big'); else if (k === 'report') return showReport(); else if (k === 'reload-normal') { location.href = location.pathname; return; } else { const n = await repair[k](); msg = n + ' ' + tr('elementos reparados'); } if (msg) E.toast('🩺 ' + msg); runHealth(); return; }
        const sf = t.closest('[data-secfix]'); if (sf) { const box = sf.closest('[data-sec]'); const l = box && box.__l; if (l && l[+sf.dataset.secfix] && l[+sf.dataset.secfix][3]) await l[+sf.dataset.secfix][3](); return; }
        const d = t.closest('[data-do]'); if (!d) return;
        const a = d.dataset.do;
        if (a === 'palette') P.palette.open();
        if (a === 'health-run') runHealth();
        if (a === 'report') showReport();
        if (a === 'reload') location.reload();
        if (a === 'journal-clear') { P.journal.clear(); render(); }
        if (a === 'closeothers') { P.closeOtherSessions(); E.toast(tr('Se cerraron las demás sesiones')); setTimeout(render, 600); }
        if (a === 'profiles') E.launch('settings', 'accounts');
        if (a === 'sel-clear') { sel.clear(); render(); }
        if (a === 'sel-desk') { let n = 0; sel.forEach(id => { if (P.addToDesktop(id)) n++; }); E.toast(n + ' ' + tr('accesos directos creados')); }
        if (a === 'sel-uninst') { const ids = [...sel].filter(id => !E.CORE_APPS.includes(id)); if (!ids.length || !await E.confirm(tr('Desinstalar'), ids.length + ' ' + tr('apps se quitarán. Sus datos se conservan y puedes reinstalarlas.'), tr('Desinstalar'))) return; const n = P.bulkUninstall(ids); sel.clear(); E.toast(n + ' ' + tr('apps desinstaladas')); render(); }
        if (a === 'export-list') { const blob = new Blob([JSON.stringify(P.reg.exportList(), null, 1)], { type: 'application/json' }); const where = await saveOut('apps-eisen-' + new Date().toISOString().slice(0, 10) + '.json', blob); if (where === 'device') E.toast(tr('Lista exportada')); }
        if (a === 'import-list') { const f = await U.pickBlob({ title: tr('Lista de apps (.json)'), accept: x => /json/.test(x.type || '') || /\.json$/i.test(x.name), deviceAccept: '.json,application/json' }); if (!f) return; try { if (f.blob.size > 2 * 1024 * 1024) throw new Error(tr('Archivo demasiado grande')); const n = P.reg.importList(P.safeParse(await f.blob.text())); E.toast('📦 ' + n + ' ' + tr('apps instaladas')); render(); } catch (er) { K.ui.alert(tr('No se pudo importar'), er.message); } }
      });
      async function showReport() {
        const r = errorReport(), txt = JSON.stringify(r, null, 1);
        const ok = await E.form({ title: tr('Informe de errores (sin datos personales)'), html: `<p class="k9-small k9-muted">${esc(tr('Incluye la versión, el tipo de dispositivo, los últimos errores y el estado de los servicios. No incluye tus archivos, nombres ni direcciones.'))}</p><pre class="p11-pre">${esc(txt)}</pre>`, ok: tr('Copiar'), cancel: tr('Cerrar') });
        if (ok) K.ui.copy(txt);
      }
      async function copyToProfile(pid) {
        const p = K.profiles.list().find(x => x.id === pid); if (!p) return;
        const r = await E.form({ title: tr('Copiar mi entorno a') + ' ' + p.name, html: `<p class="k9-small k9-muted">${esc(tr('Se copian tus apps instaladas, escritorio, anclajes, apariencia y datos de apps al otro perfil (sin duplicar lo que ya tenga). Sus datos actuales se conservan.'))}</p>`, fields: [{ k: 'files', label: tr('Incluir mis archivos'), type: 'select', options: [['no', tr('No')], ['yes', tr('Sí')]], value: 'no' }], ok: tr('Copiar') });
        if (!r) return;
        const mine = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && /^eisen_/.test(k) && !/^eisen_(prime_session|prime_bootloop|prime_journal|os10_eventlog|os9_activity|os9_seclog|notif_log)$/.test(k)) mine[k] = localStorage.getItem(k); }
        const rec = (await K.sys.get('profiles', pid)) || { id: pid, data: {}, at: now() };
        const merged = P.mergeEnv ? P.mergeEnv(rec.data || {}, mine, { look: true }) : Object.assign({}, mine, rec.data || {});
        await K.sys.put('profiles', { id: pid, data: merged, at: now() });
        let nf = 0;
        if (r.files === 'yes') { const dbName = pid === 'default' ? 'eisen_vault' : 'eisen_vault_' + pid.replace(/[^\w-]/g, ''); const all = await K.files.allRaw(); const db = await new Promise((res, rej) => { const o = indexedDB.open(dbName, 1); o.onupgradeneeded = () => { if (!o.result.objectStoreNames.contains('files')) o.result.createObjectStore('files', { keyPath: 'id' }); }; o.onsuccess = () => res(o.result); o.onerror = () => rej(o.error); }); const have = await new Promise(res => { const qy = db.transaction('files').objectStore('files').getAll(); qy.onsuccess = () => res(qy.result || []); qy.onerror = () => res([]); }); const sig = new Set(have.map(f => (f.folder || '') + '/' + f.name + ':' + f.size)); for (const f of all) { if (f.trash || sig.has((f.folder || '') + '/' + f.name + ':' + f.size)) continue; await new Promise(res => { const t = db.transaction('files', 'readwrite'); t.objectStore('files').put(Object.assign({}, f, { id: E.uid() })); t.oncomplete = res; t.onerror = res; }); nf++; } db.close(); }
        K.seclog('account', 'Entorno copiado al perfil ' + p.name + (nf ? ' con ' + nf + ' archivos' : ''));
        P.notify(tr('Entorno copiado'), p.name + ': ' + Object.keys(mine).length + ' ' + tr('ajustes') + (nf ? ' · ' + nf + ' ' + tr('archivos') : '') + '. ' + tr('Se verá al cambiar a ese perfil.'), { icon: '👥' });
      }
      render();
    },
    onOpen(b, w, arg) { if (arg && w.__p11go) w.__p11go(arg); }
  });

  /* ============================== Descargas ============================== */
  K.define('downloads', {
    init(b, w, arg) {
      let filter = arg === 'big' ? 'big' : 'all', dq = '', viewing = null;
      const FIL = [['all', 'Todo'], ['image', 'Imágenes'], ['audio', 'Audio'], ['video', 'Vídeo'], ['doc', 'Documentos'], ['pkg', 'Paquetes'], ['danger', 'Peligrosos'], ['big', 'Grandes y antiguos']];
      const isPkg = n => /\.(eisenapp|eistheme|eisenplugin|eisenenv)$/i.test(n);
      b.innerHTML = `<div class="p11-app p11-dl"><header class="p11-apph"><div class="p11-brand"><span class="p11-logo">⬇️</span><div><b>${esc(tr('Descargas'))}</b><small>${esc(caps.download ? (P.saveMode() === 'vault' ? tr('Solo dentro de EISEN') : tr('Dispositivo + copia en EISEN')) : tr('Tu dispositivo no descarga: todo queda aquí'))}</small></div></div><form class="p11-dlform" data-url><input class="input-text" name="u" type="url" inputmode="url" placeholder="https://… (${esc(tr('enlace a un archivo, imagen, PDF, canción…'))})" required><button class="k9-btn pri">${I('download', 14)} ${esc(tr('Descargar en EISEN'))}</button></form></header><div class="p11-dlbar"><div class="ac9-chips" data-fil></div><input class="input-text" data-dq placeholder="${esc(tr('Buscar…'))}"><select class="input-text" data-mode title="${esc(tr('Al descargar'))}"><option value="both">${esc(tr('Dispositivo + copia en EISEN'))}</option><option value="vault">${esc(tr('Solo dentro de EISEN'))}</option><option value="device">${esc(tr('Solo al dispositivo'))}</option></select></div><div class="p11-dlsplit"><div class="p11-dllist" data-list></div><section class="p11-viewer" data-viewer hidden></section></div></div>`;
      const L = q(b, '[data-list]'), VW = q(b, '[data-viewer]');
      q(b, '[data-mode]').value = P.saveMode();
      const kindIco = k => ({ image: '🖼️', audio: '🎵', video: '🎬', pdf: '📕', text: '📄', archive: '🗜️', office: '📝' })[k] || '📦';
      async function items() {
        const reg = P.downloads.list(), map = new Map(reg.map(d => [d.id, d]));
        let files = []; try { files = (await K.files.allRaw()).filter(f => !f.trash && (f.folder === 'downloads' || (f.folder || '').startsWith('downloads/') || map.has(f.id))); } catch { files = []; }
        return files.map(f => Object.assign({ id: f.id, name: f.name, size: f.size, type: f.type, at: f.date, folder: f.folder }, map.get(f.id) || {}, { name: f.name, folder: f.folder, size: f.size, file: f })).sort((a, c) => (c.at || 0) - (a.at || 0));
      }
      async function render() {
        q(b, '[data-fil]').innerHTML = FIL.map(([k, l]) => `<button data-f="${k}" class="${k === filter ? 'on' : ''}">${esc(tr(l))}</button>`).join('');
        let l = await items(); const old = now() - 30 * 86400000;
        l = l.filter(d => { const k = K.files.kindOf(d); return (filter === 'all' || (filter === 'doc' && /pdf|text|office/.test(k)) || (filter === 'pkg' && isPkg(d.name)) || (filter === 'danger' && P.isDangerous(d.name)) || (filter === 'big' && (d.size > 20 * 1048576 || (d.at || 0) < old)) || filter === k) && (!dq || K.norm(d.name + ' ' + (d.src || '')).includes(K.norm(dq))); });
        if (filter === 'big') l.sort((a, c) => (c.size || 0) - (a.size || 0));
        const total = l.reduce((n, d) => n + (d.size || 0), 0);
        L.innerHTML = (l.length ? `<p class="k9-small k9-muted p11-dlsum">${l.length} ${esc(tr('archivos'))} · ${esc(K.fmt.bytes(total))}</p>` : '') + (l.map(d => { const k = K.files.kindOf(d), dg = P.isDangerous(d.name); return `<div class="p11-dlrow${viewing === d.id ? ' on' : ''}${dg ? ' dg' : ''}" data-id="${esc(d.id)}" tabindex="0"><span class="p11-dlic">${dg ? '⚠️' : kindIco(k)}</span><div class="t"><b>${esc(d.name)}</b><small>${esc(K.fmt.bytes(d.size || 0))} · ${esc(K.fmt.dt(d.at || now()))}${d.src ? ' · ' + esc(/^https?:/.test(d.src) ? hostOf(d.src) : d.src.replace(/^app:/, tr('app') + ' ')) : ''}${d.folder && d.folder !== 'downloads' ? ' · ' + esc(K.files.pretty(d.folder)) : ''}</small></div><div class="p11-dlact">${dg ? '' : `<button class="k9-btn pri" data-a="view">${esc(tr('Abrir'))}</button>`}${isPkg(d.name) ? `<button class="k9-btn" data-a="install">${esc(tr('Instalar'))}</button>` : ''}<button class="k9-btn" data-a="more" aria-label="${esc(tr('Más acciones'))}" title="${esc(tr('Más acciones'))}">⋯</button></div></div>`; }).join('') || `<div class="k9-state" style="min-height:220px">${I('download', 36)}<p>${esc(tr(filter === 'all' ? 'Aún no hay descargas. Pega un enlace arriba: se descarga dentro de EISEN y lo abres aquí.' : 'No hay archivos en este filtro.'))}</p></div>`);
      }
      w.__p11dl = { render };
      const off = K.on('prime:downloads', () => render()); const off2 = K.on('files', () => render()); w.__p11off = () => { off(); off2(); };
      // ---------- visor interno ----------
      let media = null, abLoop = null, sleepT = 0, queue = [];
      function closeViewer() { if (media) { try { media.pause(); } catch { /* ignorar */ } } media = null; clearInterval(abLoop); abLoop = null; clearTimeout(sleepT); VW.hidden = true; VW.innerHTML = ''; viewing = null; qa(L, '.p11-dlrow.on').forEach(r => r.classList.remove('on')); q(b, '.p11-dlsplit').classList.remove('viewing'); try { if ('mediaSession' in navigator) navigator.mediaSession.metadata = null; } catch { /* ignorar */ } }
      async function view(id) {
        const f = await K.files.get(id); if (!f) return E.toast(tr('El archivo ya no existe'));
        if (P.isDangerous(f.name)) return K.ui.alert(tr('Archivo potencialmente peligroso'), tr('Los programas (.exe, .apk, .bat…) no se pueden ejecutar en EISEN ni se abren automáticamente. Si confías en él, expórtalo a tu dispositivo.'));
        closeViewer(); viewing = id; const k = K.files.kindOf(f), type = K.files.typeOf(f);
        q(b, '.p11-dlsplit').classList.add('viewing'); VW.hidden = false; qa(L, '.p11-dlrow').forEach(r => r.classList.toggle('on', r.dataset.id === id));
        const head = `<div class="p11-vh"><b>${esc(f.name)}</b><span class="k9-muted k9-small">${esc(K.fmt.bytes(f.size))}</span><button class="k9-btn" data-v="openwith">${esc(tr('Abrir con…'))}</button><button class="k9-btn" data-v="close" aria-label="${esc(tr('Cerrar visor'))}">✕</button></div>`;
        const url = URL.createObjectURL(new Blob([f.blob], { type })); VW.__url && URL.revokeObjectURL(VW.__url); VW.__url = url;
        if (k === 'image') {
          VW.innerHTML = head + `<div class="p11-imgstage"><img src="${url}" alt="${esc(f.name)}" data-img></div><div class="p11-vtools"><button class="k9-btn" data-v="rot">⟳ 90°</button><button class="k9-btn" data-v="flip">⇋ ${esc(tr('Voltear'))}</button><label class="k9-small">${esc(tr('Ancho'))} <input class="input-text" type="number" min="16" max="8000" data-w style="width:90px"></label><select class="input-text" data-fmt><option value="image/png">PNG</option><option value="image/jpeg">JPG</option><option value="image/webp">WEBP</option></select><button class="k9-btn pri" data-v="saveimg">${esc(tr('Guardar copia'))}</button><button class="k9-btn" data-v="wall">${esc(tr('Usar como fondo'))}</button></div>`;
          const im = q(VW, '[data-img]'); let rot = 0, flip = false, zoom = 1; im.onload = () => { q(VW, '[data-w]').value = im.naturalWidth; };
          const apply = () => { im.style.transform = `rotate(${rot}deg) scaleX(${flip ? -1 : 1}) scale(${zoom})`; };
          VW.__img = { rot: () => { rot = (rot + 90) % 360; apply(); }, flip: () => { flip = !flip; apply(); }, get: () => ({ rot, flip, im }) };
          q(VW, '.p11-imgstage').addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(.2, Math.min(6, zoom * (e.deltaY < 0 ? 1.12 : .89))); apply(); }, { passive: false });
          let pinch = null; const pts = new Map(); const st = q(VW, '.p11-imgstage');
          st.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, c] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - c[0], a[1] - c[1]), z: zoom }; } });
          st.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]); if (pinch && pts.size === 2) { const [a, c] = [...pts.values()]; zoom = Math.max(.2, Math.min(6, pinch.z * Math.hypot(a[0] - c[0], a[1] - c[1]) / pinch.d)); apply(); } });
          ['pointerup', 'pointercancel'].forEach(ev => st.addEventListener(ev, e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; }));
        } else if (k === 'audio' || k === 'video') {
          const tag = k === 'audio' ? 'audio' : 'video';
          VW.innerHTML = head + `<div class="p11-mstage"><${tag} src="${url}" controls autoplay playsinline data-m></${tag}></div><div class="p11-vtools"><label class="k9-small">${esc(tr('Velocidad'))} <select class="input-text" data-rate>${[.5, .75, 1, 1.25, 1.5, 1.75, 2].map(r => `<option value="${r}"${r === 1 ? ' selected' : ''}>${r}×</option>`).join('')}</select></label><button class="k9-btn" data-v="a">A</button><button class="k9-btn" data-v="b">B</button><button class="k9-btn" data-v="abx">${esc(tr('Quitar bucle'))}</button>${tag === 'video' ? `<button class="k9-btn" data-v="pip">⧉ PiP</button><button class="k9-btn" data-v="frame">📸 ${esc(tr('Fotograma'))}</button>` : ''}<select class="input-text" data-sleep><option value="0">${esc(tr('Apagado: no'))}</option><option value="15">15 min</option><option value="30">30 min</option><option value="60">60 min</option></select><button class="k9-btn" data-v="folder">▶ ${esc(tr('Reproducir carpeta'))}</button></div><p class="k9-small k9-muted" data-ab></p>`;
          media = q(VW, '[data-m]'); media.__ab = [null, null];
          try { if ('mediaSession' in navigator) { navigator.mediaSession.metadata = new MediaMetadata({ title: f.name.replace(/\.\w+$/, ''), artist: 'EISEN OS PRIME', album: tr('Descargas') }); navigator.mediaSession.setActionHandler('play', () => media && media.play()); navigator.mediaSession.setActionHandler('pause', () => media && media.pause()); navigator.mediaSession.setActionHandler('seekbackward', () => { if (media) media.currentTime -= 10; }); navigator.mediaSession.setActionHandler('seekforward', () => { if (media) media.currentTime += 10; }); navigator.mediaSession.setActionHandler('nexttrack', () => nextInQueue()); } } catch { /* sin Media Session */ }
          media.addEventListener('ended', () => nextInQueue());
        } else if (k === 'pdf') {
          VW.innerHTML = head + `<iframe class="p11-vframe" src="${url}" title="${esc(f.name)}"></iframe>`;
        } else if (/^text\/html/.test(type) || /\.html?$/i.test(f.name)) {
          const src = await f.blob.text();
          VW.innerHTML = head + `<div class="p11-vtools"><label class="k9-row k9-small"><input type="checkbox" data-scripts> ${esc(tr('Permitir scripts (aislados, sin acceso a EISEN)'))}</label></div><iframe class="p11-vframe light" sandbox="" referrerpolicy="no-referrer" title="${esc(f.name)}"></iframe>`;
          const fr = q(VW, 'iframe'); fr.srcdoc = src;
          q(VW, '[data-scripts]').onchange = e => { fr.setAttribute('sandbox', e.target.checked ? 'allow-scripts' : ''); fr.srcdoc = src; };
        } else if (k === 'text' || /\.(md|csv|json|xml|ya?ml|txt|log|js|css|py)$/i.test(f.name)) {
          const txt = f.size > 3 * 1048576 ? (await f.blob.slice(0, 3 * 1048576).text()) + '\n…' : await f.blob.text();
          VW.innerHTML = head + (/\.md$/i.test(f.name) ? `<div class="p11-vtext md">${K.md(txt).html}</div>` : `<pre class="p11-vtext">${esc(txt)}</pre>`);
        } else if (k === 'archive' && /\.zip$/i.test(f.name) && K.unzip) {
          let list = []; try { list = await K.unzip(f.blob); } catch (er) { VW.innerHTML = head + `<p class="k9-muted">${esc(er.message)}</p>`; return; }
          VW.innerHTML = head + `<div class="p11-vtools"><button class="k9-btn pri" data-v="unzip">${esc(tr('Extraer todo en Descargas'))}</button></div><div class="k9-card p11-table">${list.slice(0, 400).map(x => `<div class="k9-li"><span>📄</span><div class="t"><b>${esc(x.name || '')}</b><small>${esc(K.fmt.bytes((x.data && (x.data.length || x.data.byteLength)) || 0))}</small></div></div>`).join('')}</div>`;
          VW.__zip = list;
        } else { closeViewer(); K.files.open(id); return; }
      }
      async function nextInQueue() {
        if (!queue.length) return; const id = queue.shift(); await view(id); const left = queue.length; if (left) E.toast('▶ ' + tr('Quedan') + ' ' + left);
      }
      async function more(id, x, y) {
        const f = await K.files.get(id); if (!f) return;
        const items = [
          { label: 'Abrir con…', icon: 'external', act: () => K.files.open(id) },
          ...(caps.shareFiles ? [{ label: 'Compartir (WhatsApp, correo…)', icon: 'share', act: () => share(f) }] : []),
          ...(caps.download ? [{ label: 'Guardar en el dispositivo', icon: 'download', act: () => { const a = document.createElement('a'); a.__eisen = true; a.href = URL.createObjectURL(f.blob); a.download = f.name; document.body.appendChild(a); HTMLAnchorElement.prototype.click.call(a); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); } }] : []),
          { label: 'Enviar a otro dispositivo', icon: 'scan', act: () => E.launch('transfer', 'devices') },
          { label: 'Verificar huella SHA-256', icon: 'shield', act: () => verify(f) },
          { label: 'Mover a…', icon: 'folder', act: () => moveTo(f) },
          { label: 'Copiar enlace de origen', icon: 'link', disabled: !(P.downloads.list().find(d => d.id === id) || {}).src, act: () => { const d = P.downloads.list().find(z => z.id === id); if (d && d.src) K.ui.copy(d.src); } },
          { sep: true }, { label: 'Quitar de la lista (conservar archivo)', icon: 'close', act: () => { P.downloads.remove(id); if (f.folder === 'downloads') E.toast(tr('Sigue en Archivos › Descargas')); render(); } },
          { label: 'Mover a la papelera', icon: 'trash', danger: true, act: async () => { await K.files.trash(id); P.downloads.remove(id); if (viewing === id) closeViewer(); render(); } }
        ];
        K.ui.menu(x, y, items);
      }
      async function share(f) { try { await navigator.share({ files: [new File([f.blob], f.name, { type: K.files.typeOf(f) })], title: f.name }); } catch (e) { if (e && e.name !== 'AbortError') E.toast(tr('No se pudo compartir este archivo')); } }
      async function verify(f) { const t0 = now(); const h = await K.sha256(await f.blob.arrayBuffer()); const d = P.downloads.list().find(x => x.id === f.id); const same = d && d.sha ? d.sha === h : null; if (d && !d.sha) P.downloads.patch(f.id, { sha: h }); const r = await E.form({ title: 'SHA-256', html: `<p class="k9-small k9-muted">${esc(f.name)} · ${now() - t0} ms</p><pre class="p11-pre">${esc(h)}</pre>${same === null ? '' : `<p>${same ? '✅ ' + esc(tr('Coincide con la huella de la descarga')) : '⚠️ ' + esc(tr('No coincide con la huella guardada al descargar: el archivo cambió'))}</p>`}`, fields: [{ k: 'cmp', label: tr('Comparar con una huella publicada (opcional)'), ph: 'e3b0c442…' }], ok: tr('Comparar'), cancel: tr('Cerrar') }); if (r && r.cmp.trim()) E.toast(r.cmp.trim().toLowerCase() === h ? '✅ ' + tr('Las huellas coinciden') : '❌ ' + tr('Las huellas NO coinciden')); }
      async function moveTo(f) { const r = await E.form({ title: tr('Mover a'), fields: [{ k: 'to', label: tr('Carpeta'), type: 'select', options: K.files.ROOTS.map(x => [x[0], tr(x[1])]), value: f.folder }], ok: tr('Mover') }); if (!r) return; await K.files.move(f.id, r.to); P.downloads.patch(f.id, { folder: r.to }); E.toast(tr('Movido a') + ' ' + K.files.pretty(r.to)); render(); }
      async function installPkg(id) {
        const f = await K.files.get(id); if (!f) return; const n = f.name.toLowerCase(), text = await f.blob.text();
        if (n.endsWith('.eisenapp')) return K.installPackage(text, f.name);
        if (n.endsWith('.eisenplugin')) { try { const v = P.plugins.install(P.safeParse(text), text.length); E.notify(tr('Plugin instalado'), v.clean.name, '🧩'); } catch (er) { K.ui.alert(tr('Plugin rechazado'), er.message); } return; }
        if (n.endsWith('.eisenenv')) { P.pendingFile = f.blob; E.launch('transfer', 'import'); return; }
        if (n.endsWith('.eistheme')) { E.launch('thememgr'); setTimeout(() => K.files.open(id), 400); }
      }
      b.addEventListener('submit', async e => { if (!e.target.matches('[data-url]')) return; e.preventDefault(); const u = e.target.u.value.trim(); e.target.reset(); P.fetchToVault(u).then(() => render()).catch(() => { }); });
      b.addEventListener('input', e => { if (e.target.matches('[data-dq]')) { dq = e.target.value; clearTimeout(b.__t); b.__t = setTimeout(render, 160); } });
      b.addEventListener('change', e => {
        if (e.target.matches('[data-mode]')) { S.set('save_mode', e.target.value); const s = document.getElementById('cfg-save-mode'); if (s) s.value = e.target.value; E.toast(tr('Guardado') + ': ' + e.target.selectedOptions[0].textContent); }
        if (e.target.matches('[data-rate]') && media) media.playbackRate = +e.target.value;
        if (e.target.matches('[data-sleep]')) { clearTimeout(sleepT); const m = +e.target.value; if (m) { sleepT = setTimeout(() => { if (media) media.pause(); E.toast('😴 ' + tr('Reproducción detenida por el temporizador')); }, m * 60000); E.toast('⏲️ ' + m + ' min'); } }
      });
      b.addEventListener('click', async e => {
        const t = e.target;
        const fb = t.closest('[data-f]'); if (fb) { filter = fb.dataset.f; render(); return; }
        const row = t.closest('.p11-dlrow'); const act = t.closest('[data-a]');
        if (row && act) { const id = row.dataset.id; if (act.dataset.a === 'view') view(id); if (act.dataset.a === 'install') installPkg(id); if (act.dataset.a === 'more') { const r = act.getBoundingClientRect(); more(id, r.left, r.bottom); } return; }
        if (row && !act) { if (!P.isDangerous(row.querySelector('b').textContent)) view(row.dataset.id); return; }
        const v = t.closest('[data-v]'); if (!v) return; const k = v.dataset.v;
        if (k === 'close') return closeViewer();
        if (k === 'openwith' && viewing) return K.files.open(viewing);
        if (k === 'rot') VW.__img.rot(); if (k === 'flip') VW.__img.flip();
        if (k === 'saveimg' || k === 'wall') {
          const { rot, flip, im } = VW.__img.get(); const w0 = Math.max(16, Math.min(8000, +q(VW, '[data-w]').value || im.naturalWidth)), h0 = Math.round(im.naturalHeight * w0 / im.naturalWidth);
          const sw = rot % 180 ? h0 : w0, sh = rot % 180 ? w0 : h0, c = document.createElement('canvas'); c.width = sw; c.height = sh; const x = c.getContext('2d'); x.translate(sw / 2, sh / 2); x.rotate(rot * Math.PI / 180); x.scale(flip ? -1 : 1, 1); x.drawImage(im, -w0 / 2, -h0 / 2, w0, h0);
          const fmt = q(VW, '[data-fmt]').value, blob = await new Promise(res => c.toBlob(res, fmt, .9));
          if (k === 'wall') { const r = new FileReader(); r.onload = () => { if (blob.size < 4 * 1048576) E.setWallpaperUrl(r.result); else E.setWallpaperUrl(URL.createObjectURL(blob), false); E.toast('🖼️ ' + tr('Fondo aplicado')); }; r.readAsDataURL(blob); return; }
          const base = (await K.files.get(viewing)).name.replace(/\.\w+$/, ''), ext = fmt.split('/')[1].replace('jpeg', 'jpg'); await U.saveBlob(base + '-editada.' + ext, blob, 'images'); return;
        }
        if (media) {
          if (k === 'a' || k === 'b') { media.__ab[k === 'a' ? 0 : 1] = media.currentTime; const [A, B] = media.__ab; q(VW, '[data-ab]').textContent = `A ${A != null ? U.hms(A) : '—'} · B ${B != null ? U.hms(B) : '—'}`; if (A != null && B != null && B > A) { clearInterval(abLoop); abLoop = setInterval(() => { if (media && media.currentTime >= B) media.currentTime = A; }, 120); } }
          if (k === 'abx') { clearInterval(abLoop); abLoop = null; media.__ab = [null, null]; q(VW, '[data-ab]').textContent = ''; }
          if (k === 'pip') { try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await media.requestPictureInPicture(); } catch { E.toast(tr('Imagen en imagen no disponible')); } }
          if (k === 'frame') { const c = document.createElement('canvas'); c.width = media.videoWidth; c.height = media.videoHeight; c.getContext('2d').drawImage(media, 0, 0); const blob = await new Promise(res => c.toBlob(res, 'image/png')); if (blob) await U.saveBlob('fotograma-' + U.hms(media.currentTime).replace(/:/g, '-') + '.png', blob, 'images'); }
          if (k === 'folder') { const f = await K.files.get(viewing); const all = (await K.files.allRaw()).filter(x => !x.trash && x.folder === f.folder && ['audio', 'video'].includes(K.files.kindOf(x))).sort((a, c) => a.name.localeCompare(c.name)); const i = all.findIndex(x => x.id === f.id); queue = all.slice(i + 1).map(x => x.id); E.toast('▶ ' + (queue.length + 1) + ' ' + tr('en la cola')); }
        }
        if (k === 'unzip' && VW.__zip) { let n = 0; for (const x of VW.__zip) { if (!x.data || /\/$/.test(x.name || '')) continue; x.blob = new Blob([x.data]); const nm = K.files.cleanName((x.name || 'archivo').split('/').pop()); await K.files.save(await K.files.uniqueName('downloads', nm), x.blob, 'downloads'); n++; } E.toast('🗜️ ' + n + ' ' + tr('archivos extraídos')); render(); }
      });
      b.addEventListener('keydown', e => { const row = e.target.closest && e.target.closest('.p11-dlrow'); if (row && e.key === 'Enter') view(row.dataset.id); if (e.key === 'Escape' && !VW.hidden) closeViewer(); });
      b.addEventListener('contextmenu', e => { const row = e.target.closest('.p11-dlrow'); if (!row) return; e.preventDefault(); more(row.dataset.id, e.clientX, e.clientY); });
      render();
    },
    onOpen(b, w, arg) { if (w.__p11dl) w.__p11dl.render(); },
    onClose(b, w) { const m = b.querySelector('[data-m]'); if (m) try { m.pause(); } catch { /* ignorar */ } }
  });

  /* ============================== WhatsApp Hub ============================== */
  K.define('whatsapp', {
    init(b) {
      const CK = 'prime_wa_contacts', TK = 'prime_wa_templates';
      const contacts = () => S.get(CK, []) || [], templates = () => S.get(TK, null) || ['Hola, ¿cómo estás?', 'Ya voy en camino 🚗', 'Te envío la tarea de hoy 📚', '¿Podemos hablar más tarde?', 'Gracias 🙌'];
      const CC = [['52', '🇲🇽 +52'], ['34', '🇪🇸 +34'], ['1', '🇺🇸 +1'], ['54', '🇦🇷 +54'], ['57', '🇨🇴 +57'], ['51', '🇵🇪 +51'], ['56', '🇨🇱 +56'], ['58', '🇻🇪 +58'], ['593', '🇪🇨 +593'], ['502', '🇬🇹 +502'], ['503', '🇸🇻 +503'], ['504', '🇭🇳 +504'], ['505', '🇳🇮 +505'], ['506', '🇨🇷 +506'], ['507', '🇵🇦 +507'], ['591', '🇧🇴 +591'], ['595', '🇵🇾 +595'], ['598', '🇺🇾 +598'], ['53', '🇨🇺 +53'], ['1809', '🇩🇴 +1 809'], ['55', '🇧🇷 +55'], ['44', '🇬🇧 +44'], ['33', '🇫🇷 +33'], ['49', '🇩🇪 +49'], ['39', '🇮🇹 +39'], ['351', '🇵🇹 +351'], ['', '🌐 ' + tr('Otro (escribe el prefijo)')]];
      const last = S.get('prime_wa_cc', '52');
      b.innerHTML = `<div class="p11-app p11-wa"><header class="p11-apph"><div class="p11-brand"><span class="p11-logo" style="background:#0b5d3b">💬</span><div><b>WhatsApp Hub</b><small>${esc(tr('Tus mensajes no pasan por EISEN'))}</small></div></div><div class="k9-row"><button class="k9-btn pri" data-w="web">${esc(tr('Abrir WhatsApp Web'))} ↗</button>${caps.android || caps.ios ? `<button class="k9-btn" data-w="app">${esc(tr('Abrir la app'))}</button>` : ''}</div></header>
        <main class="p11-main p11-wagrid"><section class="k9-card"><h3 class="p11-h3">${esc(tr('Mensaje rápido'))}</h3><p class="k9-small k9-muted">${esc(tr('Escribe a cualquier número sin guardarlo en tus contactos.'))}</p><form data-send class="p11-col"><div class="k9-row"><select class="input-text" name="cc" style="max-width:150px">${CC.map(([v, l]) => `<option value="${v}"${v === last ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select><input class="input-text" name="ph" type="tel" inputmode="tel" autocomplete="tel" placeholder="${esc(tr('Número'))}" required style="flex:1"></div><textarea class="input-text" name="msg" rows="4" placeholder="${esc(tr('Mensaje (opcional)'))}"></textarea><div class="ac9-chips" data-tpl></div><div class="k9-row"><button class="k9-btn pri">${esc(tr('Enviar por WhatsApp'))} ↗</button><button type="button" class="k9-btn" data-w="copy">${I('link', 14)} ${esc(tr('Copiar enlace'))}</button><button type="button" class="k9-btn" data-w="qr">${I('scan', 14)} QR</button><button type="button" class="k9-btn" data-w="save">${I('plus', 14)} ${esc(tr('Guardar contacto'))}</button></div><div data-qrout></div></form></section>
        <section class="k9-card"><h3 class="p11-h3">${esc(tr('Contactos rápidos'))}</h3><div data-contacts></div><h3 class="p11-h3">${esc(tr('Compartir un archivo de EISEN'))}</h3><p class="k9-small k9-muted">${esc(caps.shareFiles ? tr('Elige un archivo y luego WhatsApp en la hoja de compartir.') : tr('Este navegador no comparte archivos con otras apps. Puedes enviar el texto o el enlace, o exportar el archivo.'))}</p><button class="k9-btn" data-w="file">${I('share', 14)} ${esc(tr('Elegir archivo'))}</button><h3 class="p11-h3">${esc(tr('Plantillas'))}</h3><div data-tpls></div><form data-addtpl class="k9-row"><input class="input-text" name="t" maxlength="300" placeholder="${esc(tr('Nueva plantilla'))}" style="flex:1"><button class="k9-btn">${esc(tr('Añadir'))}</button></form></section>
        <section class="k9-card p11-wainfo">${U.note('WhatsApp no permite mostrarse dentro de otras páginas: por seguridad se abre en una ventana real de tu navegador (en el móvil, en la app). Iniciar sesión se hace con el QR de WhatsApp desde tu teléfono.', 'info')}</section></main></div>`;
      const F = q(b, '[data-send]');
      const digits = () => { const cc = F.cc.value, ph = F.ph.value.replace(/\D/g, ''); return (cc && !ph.startsWith(cc) ? cc : '') + ph.replace(/^0+/, ''); };
      const link = () => 'https://wa.me/' + digits() + (F.msg.value.trim() ? '?text=' + encodeURIComponent(F.msg.value.trim()) : '');
      const draw = () => {
        q(b, '[data-tpl]').innerHTML = templates().slice(0, 8).map((t, i) => `<button type="button" data-tp="${i}">${esc(t.length > 26 ? t.slice(0, 26) + '…' : t)}</button>`).join('');
        q(b, '[data-tpls]').innerHTML = templates().map((t, i) => `<div class="k9-li"><div class="t"><small style="white-space:normal">${esc(t)}</small></div><button class="k9-btn" data-tdel="${i}" aria-label="${esc(tr('Eliminar'))}">✕</button></div>`).join('');
        const c = contacts(); q(b, '[data-contacts]').innerHTML = c.length ? c.map((x, i) => `<div class="k9-li"><span class="user-avatar" style="background:#0b5d3b">${esc((x.name || '?')[0])}</span><div class="t"><b>${esc(x.name)}</b><small>+${esc(x.phone)}</small></div><button class="k9-btn pri" data-cgo="${i}">💬</button><button class="k9-btn" data-cuse="${i}">${esc(tr('Usar'))}</button><button class="k9-btn" data-cdel="${i}" aria-label="${esc(tr('Eliminar'))}">✕</button></div>`).join('') : `<p class="k9-small k9-muted">${esc(tr('Guarda contactos frecuentes para escribirles con un toque (solo se guardan en este dispositivo y viajan con tu entorno).'))}</p>`;
      };
      F.onsubmit = e => { e.preventDefault(); if (digits().length < 7) return E.toast(tr('Número no válido')); S.set('prime_wa_cc', F.cc.value); P.openExternal(link(), 'WhatsApp'); };
      b.addEventListener('submit', e => { if (!e.target.matches('[data-addtpl]')) return; e.preventDefault(); const v = e.target.t.value.trim(); if (!v) return; S.set(TK, templates().concat(v).slice(-30)); e.target.reset(); draw(); });
      b.addEventListener('click', async e => {
        const t = e.target;
        const tp = t.closest('[data-tp]'); if (tp) { F.msg.value = templates()[+tp.dataset.tp] || ''; return; }
        const td = t.closest('[data-tdel]'); if (td) { const l = templates(); l.splice(+td.dataset.tdel, 1); S.set(TK, l); draw(); return; }
        const cg = t.closest('[data-cgo]'); if (cg) { const c = contacts()[+cg.dataset.cgo]; if (c) P.openExternal('https://wa.me/' + c.phone + (F.msg.value.trim() ? '?text=' + encodeURIComponent(F.msg.value.trim()) : ''), 'WhatsApp'); return; }
        const cu = t.closest('[data-cuse]'); if (cu) { const c = contacts()[+cu.dataset.cuse]; if (c) { F.cc.value = ''; F.ph.value = c.phone; F.msg.focus(); } return; }
        const cd = t.closest('[data-cdel]'); if (cd) { const l = contacts(); l.splice(+cd.dataset.cdel, 1); S.set(CK, l); draw(); return; }
        const w = t.closest('[data-w]'); if (!w) return; const k = w.dataset.w;
        if (k === 'web') P.openExternal('https://web.whatsapp.com/', 'WhatsApp Web');
        if (k === 'app') P.openExternal('https://wa.me/', 'WhatsApp');
        if (k === 'copy') { if (digits().length < 7) return E.toast(tr('Número no válido')); K.ui.copy(link()); }
        if (k === 'qr') { if (digits().length < 7) return E.toast(tr('Número no válido')); if (!K.qr) await K.loadScript('js/os9/qrcode.js'); q(b, '[data-qrout]').innerHTML = `<div class="p11-qr">${K.qr.svg(K.qr.encode(link(), 'M'), { margin: 2 })}<small>${esc(tr('Escanéalo con el móvil para abrir el chat'))}</small></div>`; }
        if (k === 'save') { const ph = digits(); if (ph.length < 7) return E.toast(tr('Número no válido')); const r = await K.ui.prompt(tr('Guardar contacto'), tr('Nombre'), ''); if (!r) return; const l = contacts().filter(x => x.phone !== ph); l.unshift({ name: r.replace(/[<>]/g, '').slice(0, 40), phone: ph }); S.set(CK, l.slice(0, 60)); draw(); }
        if (k === 'file') { const f = await U.pickBlob({ title: tr('Archivo para compartir') }); if (!f) return; if (caps.shareFiles) { try { const file = new File([f.blob], f.name, { type: f.blob.type || 'application/octet-stream' }); if (navigator.canShare && !navigator.canShare({ files: [file] })) throw new Error('tipo'); await navigator.share({ files: [file], title: f.name }); } catch (er) { if (er && er.name !== 'AbortError') E.toast(tr('Este tipo de archivo no se puede compartir')); } } else { F.msg.value = (F.msg.value ? F.msg.value + '\n' : '') + '📎 ' + f.name; E.toast(tr('Se añadió el nombre del archivo al mensaje. Para enviar el archivo, expórtalo y adjúntalo en WhatsApp.')); } }
      });
      draw();
    }
  });

  /* ============================== Lanzador TV ============================== */
  K.define('tvlauncher', {
    init(b, w) {
      w.classList.add('maximized');
      b.innerHTML = `<div class="p11-tv"><header class="p11-tvh"><b class="p11-tvlogo">EISEN <span>PRIME</span></b><span data-clock></span><div class="k9-row"><button class="p11-tvb" data-t="downloads">⬇️ ${esc(tr('Descargas'))}</button><button class="p11-tvb" data-t="transfer">🔁 ${esc(tr('Transferir'))}</button><button class="p11-tvb" data-t="vcursor">🖱️ ${esc(tr('Cursor'))}</button><button class="p11-tvb" data-t="full">⛶</button><button class="p11-tvb" data-t="settings">⚙️</button></div></header><main class="p11-tvm" data-v></main><footer class="p11-tvf">${esc(tr('Cruceta o palanca: moverse · A: abrir · B: volver · ☰: Inicio'))}</footer></div>`;
      const V = q(b, '[data-v]');
      const card = a => `<button class="p11-tvc" data-app="${esc(a.id)}">${E.tile(a, 64)}<span>${esc(a.name)}</span></button>`;
      const row = (title, list) => list.length ? `<section><h3>${esc(tr(title))}</h3><div class="p11-tvrow">${list.map(card).join('')}</div></section>` : '';
      const draw = () => {
        const inst = E.installedApps().filter(a => a.id !== 'deskfolder' && a.id !== 'tvlauncher');
        const rec = (S.get('recent_apps', []) || []).map(appOf).filter(a => a && E.isInstalled(a.id) && a.id !== 'tvlauncher' && a.id !== 'deskfolder').slice(0, 10);
        const top = P.reg.topUsed(10).map(appOf).filter(Boolean);
        V.innerHTML = row('Continuar', rec) + row('Más usadas', top) + row('Juegos', inst.filter(a => a.game).slice(0, 30)) + row('Multimedia', inst.filter(a => a.cat === 'Multimedia' && !a.game)) + `<section><h3>${esc(tr('Todas las apps'))}</h3><div class="p11-tvgrid">${inst.filter(a => !a.game).sort((x, y) => x.name.localeCompare(y.name)).map(card).join('')}</div></section>`;
      };
      const clock = () => { const c = q(b, '[data-clock]'); if (c) c.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
      clock(); const ct = setInterval(clock, 15000); w.__p11ct = ct;
      b.addEventListener('click', e => {
        const a = e.target.closest('[data-app]'); if (a) { E.launch(a.dataset.app); return; }
        const t = e.target.closest('[data-t]'); if (!t) return;
        if (t.dataset.t === 'vcursor') P.vcursor.toggle(); else if (t.dataset.t === 'full') { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch { /* ignorar */ } } else E.launch(t.dataset.t);
      });
      draw(); w.__p11draw = draw;
      setTimeout(() => { const f = q(V, '.p11-tvc'); if (f) f.focus(); }, 120);
    },
    onOpen(b, w) { w.classList.add('maximized'); if (w.__p11draw) w.__p11draw(); setTimeout(() => { const f = b.querySelector('.p11-tvc'); if (f) f.focus(); }, 120); },
    destroy() { }
  });
})();

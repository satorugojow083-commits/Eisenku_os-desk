# EISENKU OS · Auditoría previa a la versión 10.0 (Fase 1)

Fecha: 7 de noviembre de 2026 · Base auditada: **EISENKU OS 9.0.0 ENTERPRISE** (build 2026.11.02, 91 archivos, 2,3 MB de código).
Método: lectura del código, inventario automático en Chromium sin interfaz (Playwright) y regresión completa (abrir y cerrar cada app).

## 1. Arquitectura encontrada

| Capa | Archivos | Función |
|---|---|---|
| Arranque | `js/os9/boot.js` (sin `defer`) | versión, perfil, migraciones reversibles, idioma, capacidades del navegador, captura de errores |
| Base 7.0/8.0 | `app.js`, `core.js`, `extras.js`, `apps-office.js`, `apps-media.js`, `games*.js`, `store.js`, `domingo.js`, `layout.js`, `desktop.js`, `shell.js`, `guide.js`, `i18n.js` | ventanas, sistema de archivos IndexedDB (`eisen_vault`), navegador, 45 apps, 28 juegos, Linux/Windows Mode |
| Núcleo 9.0 | `js/os9/kernel.js` | eventos, preferencias, permisos, saneador HTML, iconos, apps de carga diferida (`K.app` + `K.define`), copias, integridad, perfiles |
| Shell 9.0 | `shell9.js`, `start9.js`, `settings9.js`, `files9.js`, `appcenter.js`, `browser9.js`, `office9.js`, `catalog9.js`, `i18n9.js` | escritorios virtuales, búsqueda, widgets, notificaciones, inicio de sesión, Configuración (22 apartados), Archivos, App Center |
| Apps 9.0 (diferidas) | `js/os9/apps/*.js` | 46 apps que solo se descargan al abrirlas |
| Servidor | `server.mjs`, `lib/*.mjs`, `netlify/`, `functions/`, `_worker.js` | estáticos, proxy aislado, IA opcional, cabeceras de seguridad |

Punto de extensión correcto para 10.0: manifiestos con `K.app()` y módulos con `K.define()` (carga diferida), eventos `K.on/K.emit`, preferencias `K.pref`, permisos `K.perms`, búsqueda `K.search.register`, widgets `K.widgets.register`, atajos `K.keys.register`, archivos `K.files`.

## 2. Inventario de funciones (resultado del inventario automático)

- **91 apps registradas** (Sistema 22, Productividad 17, Internet 14, Educación 14, Desarrollo 10, Multimedia 9, Creatividad 4, Game Hub), 6 opcionales; **178 entradas** de catálogo (88 apps, 62 apps web, 28 juegos).
- **22 apartados de Configuración** con buscador; **7 widgets**; **23 atajos** personalizables; 6 escritorios virtuales; vista general; centro de notificaciones con calendario; búsqueda global; modo concentración; perfiles con PIN (PBKDF2); bloqueo automático; copias completas y puntos de restauración; comprobación de integridad SHA-256; 20 idiomas.
- Regresión de la base: **90 ventanas de app abiertas y cerradas sin fallos, 0 errores de JavaScript, 28 juegos correctos, cambio Linux ⇄ Windows y bajo consumo correctos.**

## 3. Módulos repetidos (se conservan; se documenta su papel)

| Función | Implementaciones | Decisión 10.0 |
|---|---|---|
| Monitor | `monitor` (8.0, administrador de tareas) · `diagnostics` (9.0) | Se conservan. Nuevo **Monitor de recursos** con métricas e historial; *Monitor del sistema* sigue como administrador de tareas. |
| Imágenes | `gallery` (8.0) · `imageviewer` (9.0) · `medialib` (9.0) | Se conservan; el nuevo *Centro multimedia* las enlaza. |
| Texto | `notepad` · `codeeditor` · `markdown` | Se conservan («Abrir con» elige). |
| Contraseñas | `passgen` (8.0) · generador dentro de `passwords` | Se conservan. |
| Red | `netcheck` (8.0) · `netconfig` (9.0) | Se conservan; el nuevo *Centro de conexiones* los enlaza. |
| PDF | `pdf` (visor) · `pdftools` (creador) | Funciones distintas. |
| Configuración | reorganización 8.0 en `shell.js` · `settings9.js` | `settings9.js` manda; 10.0 la amplía sin borrar tarjetas. |
| Terminal | `app.js` (7.0, oculta) · `extras.js`/`shell.js` · `files9.js` | Cadena de ampliaciones; se conserva. |

## 4. Errores y defectos encontrados

1. **Rendimiento:** la barra de tareas se reconstruye por completo con *cada* clic en cualquier parte (`shell.js`, `pointerdown → renderBar`). → Se evita reconstruirla si nada cambió.
2. **Rendimiento / memoria:** el explorador muestra las miniaturas con la imagen original completa (fotos de varios MB). → Miniaturas reducidas con caché en IndexedDB.
3. **ZIP sin compresión:** `K.zip` solo «almacena» (método 0). → Compresión DEFLATE real cuando el navegador tiene `CompressionStream`.
4. **Lector QR inutilizable en Windows, Linux, Xbox y Firefox:** depende de `BarcodeDetector`, que esos navegadores no tienen. → Decodificador QR propio como respaldo.
5. **El mando solo funciona dentro de los juegos:** la documentación decía que mueve el foco, pero no había navegación global con el mando. → Navegación espacial con mando Xbox.
6. Sin errores de JavaScript en tiempo de ejecución en la regresión.

## 5. Seguridad (revisión)

- Se mantienen las protecciones de 9.0 (proxy aislado, SSRF, saneador, permisos, PBKDF2, AES-GCM, CSP).
- Riesgos conocidos sin cambios: `'unsafe-inline'` en la CSP por compatibilidad, datos no cifrados accesibles con las herramientas del navegador, `HOST=0.0.0.0` sin HTTPS.
- Requisitos para lo nuevo: el historial del portapapeles no debe guardar campos de contraseña; el lector de pantalla no debe leer contraseñas; el editor de configuración avanzada solo acepta claves `eisen_*` y JSON válido; los registros de conexiones guardan origen y ruta, **nunca** parámetros de consulta; el bloqueo de apps usa el PIN con PBKDF2 existente.

## 6. Rendimiento (medido en la base)

- Apps 9.0 de carga diferida y Service Worker «red primero» ya existen.
- Arranque: todos los módulos 8.0/9.0 se cargan al inicio (≈ 1,4 MB de JS); las 10.0 nuevas deben ser diferidas y los módulos de arranque 10.0, pequeños.

## 7. Limitaciones del navegador relevantes (no se simulan)

- **No accesibles:** temperatura de CPU, uso real de CPU/GPU, RAM física usada, procesos del sistema operativo, modelo exacto de CPU, discos físicos, dispositivos USB sin permiso, ICMP (`ping` real), detalles TLS/certificado, ejecutar programas nativos.
- **Aproximados u opcionales:** `navigator.deviceMemory` (redondeado y con tope de 8 GB, solo Chromium), `hardwareConcurrency` (núcleos lógicos), GPU por WebGL/WebGPU (puede estar oculta), batería (Chromium), red (`navigator.connection`, Chromium), memoria JS (`performance.memory`, Chromium).
- **Con permiso del usuario:** cámara, micrófono, captura de pantalla, fuentes locales (Chromium de escritorio), WebUSB/WebHID/Serie/Bluetooth (Chromium de escritorio), pantallas múltiples.

## 8. Mapa de las 100 funciones pedidas

Leyenda: **E** = existía y se conserva · **A** = existía y se amplía · **N** = nueva en 10.0 · **N\*** = nueva con alternativa compatible porque el navegador no permite la versión nativa.

| # | Función | Estado | Dónde |
|---|---|---|---|
| 1 | System Core | N | app `syscore` |
| 2 | System Information | E | app `sysinfo` |
| 3 | Hardware Inspector | N\* | app `hwinspect` (datos reales que expone el navegador) |
| 4 | Resource Monitor | N | app `resmon` (métricas de EISENKU, no del SO) |
| 5 | System Event Viewer | N | app `eventviewer` + registro `K.log` |
| 6 | Service Manager | N | app `services` + registro de servicios internos |
| 7 | Startup Manager | N | app `startup` |
| 8 | System Scheduler | N | app `scheduler` + servicio |
| 9 | System Diagnostics | A | `diagnostics` + pruebas del sistema |
| 10 | Compatibility Manager | N | app `compat` |
| 11 | Virtual Desktops | A | fondo por escritorio, renombrar |
| 12 | Virtual Display Profiles | N | perfiles de pantalla (escala, márgenes de TV) |
| 13 | Snap Layouts | N | diseños de ajuste (mitades, tercios, cuartos) |
| 14 | Window Overview | A | vista de ventanas reales (exposé) |
| 15 | Custom Side Panels | N | paneles laterales configurables |
| 16 | Interactive Desktop Widgets | A | widgets movibles e interactivos nuevos |
| 17 | Advanced Context Menus | A | menús con submenús y teclado |
| 18 | Activity Center | N | app `activity` |
| 19 | Clipboard History | N | servicio + panel (Ctrl+Alt+V) |
| 20 | Keyboard and Controller Shortcuts | A | atajos del mando + hoja de atajos |
| 21 | Dual Pane File Explorer | N | Archivos › doble panel |
| 22 | Document and Image Preview | N | Archivos › vista rápida (Espacio) |
| 23 | File Tags and Colors | N | Archivos › etiquetas |
| 24 | Advanced File Search | N | Archivos › búsqueda avanzada (contenido incluido) |
| 25 | Custom Filters | N | Archivos › filtros guardados |
| 26 | Quick Access Locations | A | Archivos › acceso rápido y frecuentes |
| 27 | Internal Recycle Bin | A | vaciado automático por antigüedad |
| 28 | ZIP Compression and Extraction | A | DEFLATE real + comprimir selección |
| 29 | File Comparison | N | Archivos › comparar |
| 30 | File Metadata Viewer | N | Archivos › metadatos (EXIF, duración, hashes…) |
| 31–34 | CPU / Memoria / Almacenamiento / Pantalla | N\* | pestañas de `hwinspect` |
| 35 | Input Devices Center | N | app `inputcenter` |
| 36 | Keyboard Configuration | N | Configuración › Teclado |
| 37 | Mouse Configuration | N | Configuración › Dispositivos › Ratón |
| 38 | Game Controller Center | N | app `gamepads` |
| 39 | Audio Devices Center | N | app `audiodev` |
| 40 | Peripheral Registry | N\* | app `peripherals` (WebUSB/HID/Serie + registro manual) |
| 41 | Connection Center | N | app `conncenter` |
| 42 | Connectivity Diagnostics | N\* | app `netdiag` (HTTP(S), sin ICMP) |
| 43 | Favorite Servers | N\* | app `servers` (comprobación HTTP(S)) |
| 44 | Shared Links Manager | N | app `sharelinks` + recibir enlaces compartidos (PWA) |
| 45 | QR Code Generator | E | app `qr` |
| 46 | QR Code Reader | A | decodificador propio cuando falta `BarcodeDetector` |
| 47 | Device Communication Center | N | app `devcomm` (pestañas y WebRTC directo) |
| 48 | Secure Connection Information | N | app `secinfo` |
| 49 | Service Connection History | N | app `connlog` + registro pasivo |
| 50 | Browser Privacy Panel | N | app `browserprivacy` |
| 51 | Word Processor | A | Writer + insertar citas, bibliografía e índice |
| 52 | Spreadsheet Editor | E | Sheets 9.0 |
| 53 | Presentation Creator | E | Presentaciones |
| 54 | Ebook Reader | E | Biblioteca digital |
| 55 | Academic Document Organizer | N | app `docorg` |
| 56 | Bibliography Generator | N | app `bibgen` |
| 57 | Reference Manager | N | app `refs` |
| 58 | Mathematical Formula Editor | E | Editor de ecuaciones |
| 59 | Interactive Whiteboard | N | app `whiteboard` |
| 60 | Quick Ideas Capture | N | app `ideas` + captura global |
| 61 | Photo Gallery | E | Galería |
| 62 | Photo Editor | E | Editor de fotos |
| 63 | Audio Editor | E | Editor de audio |
| 64 | Video Editor | N | app `videoeditor` (exporta WebM) |
| 65 | Screen Recorder | N | app `screenrec` |
| 66 | RAW Image Viewer | N\* | app `rawviewer` (vista previa incrustada + EXIF) |
| 67 | Multimedia Collection Manager | N | app `collections` |
| 68 | Subtitle Player | N | app `subplayer` (SRT/VTT) |
| 69 | Podcast Library | N | app `podcasts` (RSS por el proxy) |
| 70 | Multimedia Center | N | app `mediacenter` (interfaz para TV) |
| 71 | Accessible Interface Reader | N | servicio lector de pantalla |
| 72 | Screen Magnifier | N | servicio lupa |
| 73 | High Contrast Mode | A | 4 variantes de contraste |
| 74 | Custom Text Scaling | A | escala por app |
| 75 | Complete Keyboard Navigation | A | F6 por regiones, menús con flechas, hoja de atajos |
| 76 | Xbox Controller Navigation | N | servicio de navegación con mando |
| 77 | Motion and Animation Controls | A | velocidad y estilo de animación |
| 78 | Theme Manager | N | app `thememgr` |
| 79 | Icon Packs | N | paquetes de iconos |
| 80 | Accessibility Profiles | N | perfiles de accesibilidad + filtros de color |
| 81 | Privacy Center | E | app `privacy` |
| 82 | Internal Permissions Manager | E | app `permissions` |
| 83 | Local Activity History | A | + Centro de actividad |
| 84 | Internal Session Lock | A | bloquear al ocultar, pantalla de privacidad |
| 85 | Local PIN Protection | A | bloqueo de apps con PIN |
| 86 | Session Manager | E | app `sessions` |
| 87 | Module Integrity Checker | N | app `modcheck` |
| 88 | File Hash Verification | N | app `hashcheck` (MD5, SHA-1/256/384/512, CRC32) |
| 89 | Storage Analysis | A | `storagemon` + mapa, duplicados, antiguos |
| 90 | Configuration Recovery Center | N | app `recovery` + Configuración › Recuperación |
| 91 | Hexadecimal Editor | N | app `hexedit` |
| 92 | Universal Format Converter | N | app `fconvert` |
| 93 | Font Manager | N | app `fonts` |
| 94 | Scientific and Graphing Calculator | E | Calculadora + Graficadora |
| 95 | Programming Calculator | N | app `progcalc` |
| 96 | Technical Diagram Generator | N | app `diagrams` |
| 97 | Electronic Circuit Simulator | N | app `circuits` (análisis nodal) |
| 98 | Physics and Mathematics Laboratory | N | app `mathlab` (+ enlaces a los laboratorios existentes) |
| 99 | Network Topology Simulator | N | app `nettopo` |
| 100 | Interactive Computer Science Learning Center | N | app `cslearn` |

Fases 3 a 6: Configuración en 25 categorías (sección 4 del plan), escritorio avanzado, **Centro del equipo** (`computercenter`) y ecosistema de apps.

## 9. Plan de implementación

1. Núcleo 10.0 pequeño y cargado al inicio (`js/os10/core10.js`): versión, registro de eventos, servicios, programador, portapapeles, historial de conexiones, bloqueo de apps.
2. Shell y accesibilidad (`shell10.js`, `a11y10.js`, `css/eisenku10.css`): las piezas visuales se crean la primera vez que se usan.
3. Configuración: `settings9.js` expone su API y `settings10.js` reorganiza en 25 categorías sin borrar tarjetas.
4. Archivos: ganchos en `files9.js` y `files10.js` diferido (se carga al abrir Archivos).
5. Apps nuevas en `js/os10/apps/*.js` con manifiesto (`catalog10.js`), carga diferida, versión, permisos, datos propios y desinstalación.
6. App Center (versiones y notas 10.0), Service Worker, `integrity.json`, textos en inglés.
7. Pruebas automáticas (regresión + funcionales con valores calculados por herramientas independientes) e informe técnico.

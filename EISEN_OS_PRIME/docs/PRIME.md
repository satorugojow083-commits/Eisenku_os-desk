# EISEN OS PRIME 11.0 · `eisen_osprime`

Versión **11.0.0** (nombre en clave *Prime*) · compilación **2026.11.22** · base: EISENKU OS 10.0.0 NEXT GENERATION.
PRIME se construye **encima** de 10.0 por sus puntos de extensión (`K.app`, `K.define`, `K.keys`, `K.widgets`, `K.cfgUI`, `K.gamepadNav`, `E.deskMenuExtra`…). No se eliminó ninguna app, función, archivo ni ajuste de 8.0, 9.0 o 10.0. Copia del original: `backup/EISENKU_OS_10_0_NEXT_GENERATION_original.zip`.

## 1. Lo principal

### Dispositivos que no permiten descargas (Xbox, TV, navegadores dentro de apps)
- PRIME **detecta** si el dispositivo puede descargar (Xbox, televisores, navegadores de Instagram/Facebook/TikTok, iPhone en modo app…). Si no puede, activa solo el modo **«Solo dentro de EISEN»**.
- **Todo lo que se descarga queda dentro de EISEN**: exportaciones de cualquier app, enlaces con `download`, documentos que una app abre en ventana nueva (`blob:`/`data:`), y lo que pegues en **Descargas** (cualquier URL; pasa por el proxy propio si el sitio no permite CORS). Hay progreso, cola, cancelar y reintentar.
- **Se usa aquí, sin salir de EISEN**: visor de imágenes (zoom con rueda o pellizco, girar, voltear, cambiar tamaño, convertir a PNG/JPG/WEBP, usar como fondo), reproductor de audio/vídeo (velocidad, bucle A–B, imagen en imagen, capturar fotograma, temporizador de apagado, controles en la pantalla de bloqueo, reproducir la carpeta entera), PDF, textos y Markdown, HTML **aislado sin scripts** (opción para permitirlos aislados), ZIP (ver y extraer) y «Abrir con…» cualquier app de EISEN.
- **Instalar desde Descargas**: `.eisenapp` (apps aisladas), `.eisenplugin`, `.eistheme` y `.eisenenv` (entornos).
- Cada descarga guarda origen, fecha y huella **SHA-256** (verificación y comparación con una huella publicada). Los programas (`.exe`, `.apk`, `.bat`…) se marcan como **peligrosos** y nunca se abren solos.
- Instalado como app en Android, EISEN aparece en **Compartir** del teléfono: lo que compartes (fotos, PDF, enlaces, texto) entra en Descargas o Notas.

### Tienda e instalación
- Al instalar una app aparece **sola en el escritorio y en el menú Inicio** (configurable). Las instalaciones múltiples (paquetes, «instalar opcionales», importar lista) van a **una carpeta** del escritorio.
- **Registro real** de apps instaladas: fecha, método de apertura, tipo, versión, número de usos y último uso (Centro PRIME › Apps instaladas), con búsqueda, orden, selección múltiple, desinstalación múltiple y exportar/importar la lista.
- **Instalación virtual** de apps web: cada una se abre con el método que funciona en el dispositivo — *ventana de app EISEN*, *navegador EISEN* o *ventana real (PWA)* — y se puede cambiar en la ficha del App Center o del Centro PRIME. Los servicios que no permiten mostrarse dentro de otras páginas (WhatsApp, Telegram, Discord, Gmail, Netflix, Google Docs…) se abren en una ventana real **sin fingir** que están integrados.
- **WhatsApp Hub**: abre WhatsApp Web (o la app en el móvil), escribe a cualquier número sin guardarlo, contactos y plantillas locales, QR del chat y compartir archivos de EISEN con la hoja de compartir del sistema.
- **Paquetes**: Escuela, Gaming, Creador, Oficina, Xbox y TV, Comunicación.
- Enlaces `?app=ID`, `#install=ID` (el QR de «instalar en otro dispositivo» los usa).

### Datos que no se pierden
- **Espejo PRIME**: cada cambio de `eisen_*` se copia por lotes a IndexedDB (`eisenprime_<perfil>`). Al arrancar **repara** claves dañadas y, si el navegador vació `localStorage`, **ofrece recuperar** el entorno.
- **Sincronización en vivo entre pestañas** (apps, escritorio, anclajes, widgets, fondos; tema e idioma con «Aplicar ahora») y **protección de perfil**: si otra pestaña cambia de perfil, esta deja de guardar para no mezclar datos (antes podía ocurrir).
- **Deshacer cambios** de apariencia, escritorio, anclajes y apps; **punto de restauración diario** automático; **almacenamiento persistente** solicitado una vez; liberación automática de espacio (recorta registros) si `localStorage` se llena.
- **Copiar el entorno a otro perfil** (cuenta local), con o sin archivos, sin duplicar.

### Transferir entre pestañas, navegadores, cuentas, teléfonos, tabletas y Xbox
| Método | Cuándo | Cómo |
|---|---|---|
| Pestañas | mismo navegador | automático y en vivo |
| Código de texto | cualquier navegador o equipo | `EISEN1.<datos>.<suma>` (gzip + base64url + SHA-256 truncado); se detectan códigos incompletos |
| QR animado | móvil ↔ PC/TV con cámara | el entorno se parte en varios QR que rotan solos; el lector junta las partes (BarcodeDetector o el lector propio de 10.0) o las lee de imágenes |
| Archivo `.eisenenv` | copias y otros dispositivos | ligero o completo (con archivos); **AES-GCM 256 con contraseña** (PBKDF2 150 000) |
| Red local | PC → Xbox/móvil en la misma red | `INICIAR` con `HOST=0.0.0.0`; código de 12 caracteres, un solo uso, caduca a los 10 min; cifrado en el navegador (el servidor no ve la clave) |
| Perfiles | otra cuenta del mismo equipo | Centro PRIME › Sesiones y perfiles |

Al recibir: resumen, **fusión sin duplicados** (escritorio por app/carpeta, anclajes, apps, contactos, organizador académico, notas…) o **reemplazo**, con punto de restauración previo. También acepta las copias de Configuración › Copias de seguridad de 8.0/9.0/10.0. Los datos sensibles (claves de servicios, bóveda de contraseñas) **no se exportan** salvo que lo marques; los ajustes propios del dispositivo (modo de descarga, perfil de pantalla, bajo consumo) nunca viajan.

## 2. Errores corregidos (encontrados con pruebas reales)

1. **App Center en móviles y ventanas estrechas**: `.ac9-split` anulaba la regla responsive y partía la tienda en dos columnas con el contenido cortado. Ahora cada ventana adapta su diseño **a su propio ancho** (ResizeObserver), también en tabletas y ventanas pequeñas del PC.
2. **Ventanas imposibles de mover con el dedo**: la barra de título no tenía `touch-action:none`; el navegador cancelaba el arrastre (`pointercancel`).
3. **Tirar hacia abajo recargaba la página** en Android y se perdía la sesión (`overscroll-behavior`).
4. **Doble toque hacía zoom** en botones (`touch-action: manipulation`).
5. **El teclado virtual tapaba los campos** en ventanas maximizadas (visualViewport).
6. **Barra de tareas desbordada en teléfonos** (botones fuera de pantalla): se ocultan los que no aportan en el móvil y se indica que hay más.
7. **Datos mezclados entre pestañas** al cambiar de perfil en una de ellas.
8. **Cambios del escritorio perdidos entre pestañas** (una pestaña con el escritorio antiguo podía sobrescribir lo instalado en otra).
9. **Privacidad del navegador**: la carga de páginas consultaba a la vez proxies públicos de terceros aunque existiera el proxy propio; ahora el propio va primero y solo se usan los públicos si falla. El proxy propio se detecta al arrancar (antes solo al abrir el navegador).
10. **Textos de versión antiguos** («novedades de la versión 9.0», «10.0» en el asistente inicial y en `neofetch`).
11. WhatsApp Web se intentaba abrir dentro del navegador aislado, donde no puede funcionar: ahora es el **WhatsApp Hub**.

## 3. Pruebas realizadas (Chromium sin interfaz, Playwright)

| Prueba | Resultado |
|---|---|
| Abrir y cerrar **las 144 apps** en PC (1366×768) y teléfono (Pixel 7) | 0 fallos, 0 ventanas fuera de pantalla, ninguna lenta, 0 errores de JavaScript |
| Apps PRIME (8) abiertas | todas correctas |
| Instalar app → escritorio + Inicio + registro | correcto |
| Descarga desde URL dentro de EISEN, visor, SHA-256 | correcto |
| Xbox (agente Xbox, 1920×1080): detección, perfil TV, modo «solo en EISEN», descarga de una app | correcto (descarga guardada en Descargas, sin descarga real) |
| Código de transferencia cifrado: empaquetar → código → leer → validar; contraseña incorrecta | correcto / detectada |
| Fusión sin duplicados del escritorio | 25 → 25 elementos |
| Relé de red local: enviar, recibir, segunda lectura | correcto / 404 (un solo uso) |
| QR de 850 caracteres: generar y leer con el lector propio | versión 21, leído |
| Plugin de ejemplo (tema, fondos, enlaces, comandos, widget aislado); plugin malicioso (`javascript:`, `url()`) | instalado / rechazado |
| Estudio: resumen, palabras clave, INFLESZ, preguntas | correcto |
| Recordatorios en lenguaje natural (8 frases) | fechas correctas, conservando tildes |
| Dos pestañas: instalar en A → aparece en B; fondo; cambio de perfil en A → B bloqueada | correcto |
| Clave dañada a mano → reparada desde el espejo al recargar | correcto |
| `localStorage` vaciado → oferta de recuperación → entorno recuperado | correcto |
| 4 arranques fallidos seguidos → modo seguro automático | correcto |

**No probado en hardware real** (Xbox, Android, iPhone, tabletas): se emularon agente, pantalla y táctil. La vibración del mando, `gamepadInputEmulation` (solo Edge heredado de Xbox), la hoja de compartir y el Wake Lock dependen del dispositivo; PRIME comprueba cada API antes de usarla.

## 4. Límites honestos

- El **relé de red local** solo existe con el servidor incluido (`INICIAR.bat`/`INICIAR.sh`). En Netlify, Cloudflare o GitHub Pages se ocultan esas opciones (código, QR y archivo funcionan igual).
- En **GitHub Pages** (u otro alojamiento estático) no hay proxy ni IA del servidor: funcionan las apps, las descargas por URL de sitios con CORS, la transferencia por código/QR/archivo y todo lo local.
- Los servicios que bloquean marcos (WhatsApp, Gmail, Netflix…) **no pueden** mostrarse dentro de una página: se abren en ventana real. No se simula lo contrario.
- La recuperación del espejo protege ante borrados de `localStorage` o claves dañadas; si el navegador borra **todos** los datos del sitio (incluido IndexedDB), solo una copia exportada (archivo, código o QR) lo recupera.
- Los widgets de plugins se ejecutan aislados sin red ni acceso a EISEN; los plugins no pueden ejecutar código en la página principal.

## 5. Archivos nuevos y modificados

**Nuevos**: `js/os11/prime11.js`, `js/os11/shell11.js`, `js/os11/apps/hub11.js`, `js/os11/apps/sync11.js`, `js/os11/apps/tools11.js`, `css/eisenku11.css`, `css/apps11.css`, `recovery.html`, `apps/prime-sample.eisenplugin`, `docs/PRIME.md`.
**Ampliados (sin quitar nada)**: `index.html`, `sw.js` (módulos PRIME sin conexión y receptor de «Compartir»), `manifest.webmanifest` (atajos y `share_target`), `server.mjs` (relé), `version.json`, `lib/security.mjs` (versión), `js/os9/boot.js` (versión y protección contra bucles de arranque), `js/app.js` (exportaciones y privacidad del proxy), `js/domingo.js` (ganchos de comandos), `js/os9/appcenter.js`, `js/os9/start9.js`, `js/os9/apps/handbook.js` (capítulo PRIME), documentación.

## 6. Las 205 funciones nuevas

Todas tienen su estado en este dispositivo en **Centro PRIME › Funciones PRIME**.

### Escritorio y ventanas (10)

| # | Función | Dónde |
|---|---|---|
| d1 | Ventanas que adaptan su diseño a su propio ancho | Todas las ventanas |
| d2 | Rescatar ventanas fuera de la pantalla | Ctrl+Alt+Inicio · menú de ventana |
| d3 | Transparencia por ventana | Menú de la barra de título |
| d4 | Enrollar ventana (solo la barra) | Menú de la barra de título |
| d5 | Agitar una ventana para minimizar las demás | Arrastrar la barra de título de lado a lado |
| d6 | Mover y redimensionar ventanas con teclado o mando | Alt+Mayús+M |
| d7 | Insignia «Nuevo» en apps recién instaladas | Escritorio e Inicio |
| d8 | Ordenar iconos por uso real | Clic derecho en el escritorio › PRIME |
| d9 | Bloquear iconos del escritorio | Clic derecho › PRIME · Configuración › Escritorio |
| d10 | Carpeta automática al instalar varias apps | Paquetes e instalación múltiple |

### Menú Inicio (10)

| # | Función | Dónde |
|---|---|---|
| s1 | Sección «Recién instaladas» | Menú Inicio |
| s2 | Sección «Más usadas» con contador real | Menú Inicio |
| s3 | Búsqueda tolerante a errores («¿Quisiste decir…?») | Búsqueda de Inicio |
| s4 | Calculadora en la búsqueda | Escribe 2+2 o =raíz(16) en Inicio |
| s5 | Todas las apps de la A a la Z con índice | Inicio › Todas las apps › A–Z |
| s6 | Acciones rápidas PRIME | Menú Inicio |
| s7 | Inicio a pantalla completa | Configuración › Escritorio |
| s8 | Escribir en el escritorio abre la búsqueda | Escritorio |
| s9 | Instalar y abrir desde la búsqueda | Búsqueda de Inicio |
| s10 | Navegación con flechas en la cuadrícula de Inicio | Menú Inicio |

### Tienda y aplicaciones (10)

| # | Función | Dónde |
|---|---|---|
| t1 | Acceso directo en el escritorio al instalar | App Center |
| t2 | Entrada en el menú Inicio al instalar | App Center |
| t3 | Registro real de apps instaladas (fecha, método, usos) | app Centro PRIME |
| t4 | Instalación virtual: método elegido según el dispositivo | App Center · apps web |
| t5 | Método de apertura por app y ventana de app EISEN | app Centro PRIME |
| t6 | Paquetes de apps con un clic | app Centro PRIME |
| t7 | Instalación y desinstalación múltiple | app Centro PRIME |
| t8 | Exportar e importar la lista de apps | app Centro PRIME |
| t9 | WhatsApp Hub integrado | app WhatsApp Hub |
| t10 | Enlaces para abrir o instalar apps (?app= · #install=) | Dirección de EISEN |

### Cuentas, sincronización y transferencia (18)

| # | Función | Dónde |
|---|---|---|
| c1 | Espejo duradero de todos los datos en IndexedDB | Automático |
| c2 | Sincronización en vivo entre pestañas | Automático |
| c3 | Protección de perfil entre pestañas | Automático |
| c4 | Reparación automática de datos dañados | Automático |
| c5 | Recuperación del entorno tras un borrado del navegador | Automático |
| c6 | Punto de restauración automático diario | Automático |
| c7 | Indicador de guardado en la bandeja | Barra de tareas |
| c8 | Sesiones abiertas y «cerrar las demás» | app Centro PRIME |
| c9 | Copiar el entorno a otro perfil local | app Centro PRIME |
| c10 | Almacenamiento persistente automático | Automático |
| c11 | Paquete de entorno ligero o completo (.eisenenv) | app Transferir y sincronizar |
| c12 | Código de transferencia con suma de control | app Transferir y sincronizar |
| c13 | QR animado en varias partes | app Transferir y sincronizar |
| c14 | Lector QR que reúne las partes (cámara o imágenes) | app Transferir y sincronizar |
| c15 | Red local con código de un solo uso | app Transferir y sincronizar |
| c16 | Fusión sin duplicados | app Transferir y sincronizar |
| c17 | Instalar EISEN como app (PWA) | app Transferir y sincronizar |
| c18 | Enlace o QR para instalar una app en otro dispositivo | app Transferir y sincronizar |

### Seguridad y privacidad (10)

| # | Función | Dónde |
|---|---|---|
| x1 | Enlaces externos aislados (noopener/noreferrer) | Automático |
| x2 | Bloqueo de ventanas con direcciones inseguras | Automático |
| x3 | JSON seguro contra contaminación de prototipos | Importaciones |
| x4 | Pegado seguro en editores | Writer y editores |
| x5 | Exclusión de secretos al exportar | app Transferir y sincronizar |
| x6 | Cifrado AES-GCM con contraseña | app Transferir y sincronizar |
| x7 | Aviso y bloqueo de archivos peligrosos | app Descargas |
| x8 | Validación estricta de paquetes de entorno | app Transferir y sincronizar |
| x9 | Revisión de seguridad PRIME con arreglos | app Centro PRIME |
| x10 | HTML descargado sin scripts por defecto | app Descargas |

### Navegador (8)

| # | Función | Dónde |
|---|---|---|
| w1 | Instalar la página actual como app | Navegador › ⋮ |
| w2 | QR de la página actual | Navegador › ⋮ |
| w3 | Enviar la pestaña a otro dispositivo | Navegador › ⋮ |
| w4 | Anclar la página al escritorio | Navegador › ⋮ |
| w5 | Política de apertura para sitios que bloquean marcos | Automático |
| w6 | Descargas web guardadas dentro de EISEN | Automático |
| w7 | Copiar enlace sin rastreadores (utm, fbclid…) | Navegador › ⋮ |
| w8 | Abrir la página en una ventana de app | Navegador › ⋮ |

### Multimedia (8)

| # | Función | Dónde |
|---|---|---|
| m1 | Reproductor de descargas con velocidad | app Descargas |
| m2 | Bucle A–B | app Descargas |
| m3 | Imagen en imagen | app Descargas |
| m4 | Capturar fotograma de un vídeo | app Descargas |
| m5 | Temporizador de apagado | app Descargas |
| m6 | Controles en la pantalla de bloqueo (Media Session) | app Descargas |
| m7 | Reproducir una carpeta completa | app Descargas |
| m8 | Editor rápido de imágenes (girar, voltear, tamaño, formato) | app Descargas |

### Productividad y escuela (10)

| # | Función | Dónde |
|---|---|---|
| p1 | Resumen automático de textos | app Estudio PRIME |
| p2 | Palabras clave y frases frecuentes | app Estudio PRIME |
| p3 | Preguntas de repaso con huecos | app Estudio PRIME |
| p4 | Legibilidad (INFLESZ) y tiempo de lectura | app Estudio PRIME |
| p5 | Esquema automático | app Estudio PRIME |
| p6 | Exportar preguntas a Tarjetas de estudio | app Estudio PRIME |
| p7 | Temporizador de examen a pantalla completa | app Estudio PRIME |
| p8 | Lectura en voz alta con resaltado | app Estudio PRIME |
| p9 | Plan de repaso espaciado con recordatorios | app Estudio PRIME |
| p10 | Estadísticas de palabras | app Estudio PRIME |

### IA y automatización (10)

| # | Función | Dónde |
|---|---|---|
| a1 | Reglas «Si… entonces…» | app Automatización |
| a2 | Disparadores al instalar o abrir una app | app Automatización |
| a3 | Disparador al descargar (organizar por tipo) | app Automatización |
| a4 | Disparador al conectar un mando | app Automatización |
| a5 | Disparadores sin conexión y al reconectar | app Automatización |
| a6 | Disparadores de batería baja y a una hora | app Automatización |
| a7 | Recordatorios en lenguaje natural | Domingo · app Automatización |
| a8 | Comandos PRIME para Domingo | Maestro Domingo |
| a9 | Sugerencias inteligentes del sistema | Widget · Centro PRIME |
| a10 | Paleta de comandos | Ctrl+Mayús+Espacio |

### Archivos y descargas (11)

| # | Función | Dónde |
|---|---|---|
| f1 | Centro de descargas | app Descargas |
| f2 | Descargar desde una URL dentro de EISEN | app Descargas |
| f3 | Cola de descargas con cancelar y reintentar | app Descargas |
| f4 | Organizar descargas por tipo | Configuración › Archivos |
| f5 | Visores internos para todo lo descargado | app Descargas |
| f6 | Compartir archivos (WhatsApp, correo…) | app Descargas |
| f7 | Exportar al dispositivo cuando se pueda | app Descargas |
| f8 | Liberar espacio: descargas grandes y antiguas | app Descargas |
| f9 | Huella SHA-256 y verificación | app Descargas |
| f10 | Instalar paquetes desde Descargas | app Descargas |
| f11 | Recibir archivos compartidos desde otras apps del móvil | EISEN instalado como app |

### Xbox y mando (10)

| # | Función | Dónde |
|---|---|---|
| g1 | Cursor virtual con el mando | Ctrl+Alt+G · Centro de mandos |
| g2 | Vibración al aceptar y volver | Mando |
| g3 | Barra de ayuda de botones | Mando |
| g4 | Configuración automática para Xbox y TV | Primer arranque |
| g5 | Sin ratón emulado en Xbox (Edge heredado) | Xbox |
| g6 | Nuevas acciones asignables al mando | Centro de mandos |
| g7 | Indicador de mando en la bandeja | Barra de tareas |
| g8 | Lanzador TV | app Lanzador TV |
| g9 | Zoom de la interfaz desde el mando | Centro de mandos |
| g10 | Cerrar, maximizar y minimizar con el mando | Centro de mandos |

### Teléfonos y táctil (10)

| # | Función | Dónde |
|---|---|---|
| h1 | Arrastre de ventanas táctil fiable | Automático |
| h2 | Sin «tirar para recargar» | Automático |
| h3 | Sin zoom por doble toque en botones | Automático |
| h4 | Teclado virtual sin tapar el campo | Automático |
| h5 | Gestos de borde (abajo, izquierda, derecha) | Pantalla táctil |
| h6 | Deslizar hacia abajo para minimizar | Barra de título maximizada |
| h7 | Pulsación larga = clic derecho | Barras, listas y tarjetas |
| h8 | Respuesta háptica | Gestos |
| h9 | Márgenes seguros para pantallas con muesca | Automático |
| h10 | Botones de ventana de 44 px en táctil | Automático |

### Tabletas (10)

| # | Función | Dónde |
|---|---|---|
| b1 | Pantalla dividida con divisor arrastrable | Menú de ventana |
| b2 | Dos dedos a los lados cambian de escritorio | Escritorio |
| b3 | Modo tableta automático | Configuración › Dispositivos |
| b4 | La pantalla dividida se recoloca al girar | Automático |
| b5 | Detección de teclado físico | Automático |
| b6 | Apps maximizadas en vertical | Tableta |
| b7 | Apps abiertas en tarjetas (deslizar para cerrar) | Alt+Mayús+A · gesto desde abajo |
| b8 | Doble toque en el título para maximizar | Barra de título |
| b9 | Pantalla siempre encendida al ver o leer | Automático |
| b10 | Modo kiosco con PIN | Configuración › Dispositivos |

### Rendimiento (10)

| # | Función | Dónde |
|---|---|---|
| r1 | Prueba real de fluidez del equipo | Automático |
| r2 | Efectos según el nivel del equipo | Automático |
| r3 | Cierre de apps inactivas en segundo plano | Configuración › Rendimiento |
| r4 | Precarga de apps al pasar por su icono | Automático |
| r5 | Vigilante de bloqueos con «Cerrar app» | Automático |
| r6 | Animaciones en pausa en ventanas ocultas | Automático |
| r7 | Listas largas más rápidas (content-visibility) | Automático |
| r8 | Liberación automática de espacio al llenarse | Automático |
| r9 | Iconos de apps web guardados en el dispositivo | Automático |
| r10 | Módulos PRIME disponibles sin conexión | Service Worker |

### Accesibilidad (10)

| # | Función | Dónde |
|---|---|---|
| y1 | Objetivos táctiles grandes | Configuración › Accesibilidad |
| y2 | Regla de lectura | Configuración › Accesibilidad |
| y3 | Subrayar enlaces | Configuración › Accesibilidad |
| y4 | Espaciado de texto amplio | Configuración › Accesibilidad |
| y5 | Anuncios para lectores de pantalla | Automático |
| y6 | Modo fácil | Escritorio › PRIME · Domingo |
| y7 | Nombres accesibles para botones de icono | Automático |
| y8 | Atenuar todo salvo la ventana activa | Configuración › Accesibilidad |
| y9 | Notificaciones que no se cierran solas | Configuración › Accesibilidad |
| y10 | Mostrar teclas y clics pulsados | Configuración › Accesibilidad |

### Personalización (10)

| # | Función | Dónde |
|---|---|---|
| l1 | Acento a partir del fondo de pantalla | Configuración › Personalización |
| l2 | Fondo dinámico de día y de noche | Configuración › Personalización |
| l3 | Brillo de acento en la ventana activa | Configuración › Personalización |
| l4 | Estilo de las etiquetas del escritorio | Configuración › Escritorio |
| l5 | Fuente de la interfaz | Configuración › Personalización |
| l6 | Mensaje propio en el arranque | Configuración › Personalización |
| l7 | 6 fondos PRIME | Configuración › Personalización |
| l8 | Estilos de la barra de tareas | Configuración › Personalización |
| l9 | Color de los iconos (vivo, sobrio, monocromo) | Configuración › Escritorio |
| l10 | Sonidos PRIME | Configuración › Personalización |

### Diagnóstico y recuperación (10)

| # | Función | Dónde |
|---|---|---|
| q1 | Salud del sistema con reparaciones | app Centro PRIME |
| q2 | Modo seguro automático ante bucles de arranque | Automático |
| q3 | Restaurar ventanas tras un cierre inesperado | Automático |
| q4 | Página de recuperación independiente | recovery.html |
| q5 | Deshacer cambios de ajustes | app Centro PRIME |
| q6 | Informe de errores anónimo | app Centro PRIME |
| q7 | Reparar escritorio | app Centro PRIME |
| q8 | Reparar el registro de apps | app Centro PRIME |
| q9 | Restablecer Inicio y barra de tareas | app Centro PRIME |
| q10 | Volver a registrar el Service Worker | app Centro PRIME |

### Plugins (10)

| # | Función | Dónde |
|---|---|---|
| u1 | Formato .eisenplugin validado | app Plugins |
| u2 | Gestor de plugins | app Plugins |
| u3 | Plugins de temas | app Plugins |
| u4 | Plugins de enlaces rápidos | Inicio |
| u5 | Plugins de comandos | Domingo y paleta |
| u6 | Widgets de plugins aislados (CSP) | Widgets |
| u7 | Plugins de fondos | Configuración |
| u8 | Permisos y registro de seguridad de plugins | app Plugins |
| u9 | Plugins desactivados en modo seguro | Automático |
| u10 | Plugin de ejemplo y exportación | app Plugins |

### Widgets (10)

| # | Función | Dónde |
|---|---|---|
| i1 | Widget Descargas recientes | Widgets |
| i2 | Widget Guardado y sesiones | Widgets |
| i3 | Widget Recién instaladas | Widgets |
| i4 | Widget Clase actual | Widgets |
| i5 | Widget Próximo examen | Widgets |
| i6 | Widget Mando | Widgets |
| i7 | Widget Almacenamiento | Widgets |
| i8 | Widget Acciones rápidas PRIME | Widgets |
| i9 | Widget WhatsApp rápido | Widgets |
| i10 | Widget Sugerencias | Widgets |

### Notificaciones (10)

| # | Función | Dónde |
|---|---|---|
| n1 | Notificaciones con botones de acción | Automático |
| n2 | Notificaciones de progreso | Descargas y transferencias |
| n3 | Avisos del sistema en segundo plano | Configuración › Notificaciones |
| n4 | Insignia de no leídas (reloj e icono de la app) | Barra de tareas |
| n5 | Horario de silencio automático | Configuración › Notificaciones |
| n6 | Recordatorios con posponer | Automatización |
| n7 | Agrupar avisos repetidos | Automático |
| n8 | Avisos críticos que atraviesan «No molestar» | Automático |
| n9 | Notificaciones repetidas con contador ×N | Automático |
| n10 | Resumen al volver | Automático`.split('\n').map(l => { const [id, area, name, where] = l.split(' |

# EISENKU OS 10.0 NEXT GENERATION · Auditoría de seguridad

> Secciones 1 a 6: auditoría de 9.0 (vigente). Sección 7: revisión de 10.0.

Fecha: 2 de noviembre de 2026 · Alcance: todo el proyecto 8.0 Pro (cliente, servidor local `server.mjs`, Cloudflare y Netlify) y los cambios de 9.0.

EISENKU es una aplicación web que se ejecuta en el navegador. Su «sistema» es el almacenamiento del navegador (localStorage e IndexedDB) de su origen web. Por eso los riesgos principales son: que código ajeno (páginas del navegador integrado, apps de terceros, contenido pegado o abierto) llegue a ejecutarse **en el origen de EISENKU**, y que el servidor (proxy e IA) se use contra el propio equipo o se abuse de él.

## 1. Hallazgos en 8.0 y corrección en 9.0

| # | Gravedad | Hallazgo en 8.0 | Corrección en 9.0 |
|---|---|---|---|
| 1 | **Crítica** | En Netlify y Cloudflare, las páginas cargadas por el proxy (`/p/https/sitio/...`) se servían en **el mismo origen** que EISENKU. Cualquier web visitada (o un enlace preparado abierto en una pestaña) podía leer `localStorage`/IndexedDB: notas, archivos, ajustes. | Todas las respuestas del proxy llevan `Content-Security-Policy: sandbox …` **sin `allow-same-origin`**: la página corre en un origen opaco aunque se abra directamente. `frame-ancestors` limita quién puede incrustarlas. En local, el proxy funciona además en otro puerto (`PORT+1`), es decir, otro origen. |
| 2 | Alta | `server.mjs`: *path traversal* (comprobaba `startsWith(dir)` sin separador; aceptaba carpetas hermanas con el mismo prefijo) y escuchaba en todas las interfaces de red. | Normalización con separador, bloqueo de archivos ocultos y `node_modules`; escucha en `127.0.0.1` por defecto (`HOST=0.0.0.0` es explícito y muestra un aviso). |
| 3 | Alta | SSRF: el proxy solo filtraba nombres con una expresión regular; seguía redirecciones sin revalidar; no conocía IPv6 privadas ni formatos numéricos (`2130706433`, `0x7f000001`); cualquier puerto. | `checkTarget`: IPv4/IPv6 privadas, de enlace local y reservadas (todas las notaciones), nombres internos, credenciales en la URL, solo puertos 80/443/8080/8443, resolución DNS real en Node (anti *DNS rebinding*), cada redirección se revalida, métodos GET/HEAD/POST/OPTIONS, límites de tamaño (5 MB de cuerpo, 15 MB reescritos) y de tiempo (25 s), límite de peticiones por IP. 41 pruebas unitarias. |
| 4 | Alta | Cookies del proxy sin `HttpOnly` y compartidas entre sitios (un sitio podía hacer peticiones con las cookies de otro: CSRF entre sitios). | Cookies `HttpOnly`, aisladas por sitio y solo se adjuntan si la petición viene del mismo sitio. |
| 5 | Alta | El puente `postMessage` del navegador (`stget`) devolvía el almacenamiento simulado de **cualquier** sitio a cualquier página. | Cada página solo accede a los datos de su propio host; la navegación privada usa un almacén separado que se borra. |
| 6 | Media | Las páginas incrustadas recibían `allow="camera; microphone; geolocation; payment"` sin preguntar. | Permisos **por sitio** (cámara, micrófono, ubicación, leer el portapapeles, capturar la pantalla y MIDI) concedidos desde la barra del navegador (🛡️) y revocables en el Administrador de permisos; las ventanas emergentes se pueden bloquear con avisos. Las páginas en modo aislado no reciben permisos. |
| 7 | Media | IA: sin código de acceso, `Origin` opcional, IP falsificable en local, sin límite de tamaño de la petición. | `AI_ACCESS_CODE` opcional, comprobación de origen, límite por IP (`AI_RATE_PER_MIN`) y diario (`AI_DAILY_LIMIT`), tamaño máximo, la clave solo existe en el servidor. |
| 8 | Media | XSS: valor de celda de Sheets en `value="${val}"`, nombres de archivos del explorador antiguo, terminal antigua y el documento de Writer escrito con `document.write`. | Escapado en todos esos puntos; Writer sanea el contenido pegado, arrastrado o abierto (lista blanca de etiquetas, atributos y estilos) e imprime desde un `iframe` aislado. |
| 9 | Media | Las páginas `blob:`/`data:` generadas por apps se abrían **sin sandbox** (mismo origen). | Se abren aisladas; solo las páginas internas de confianza se marcan como tales. |
| 10 | Media | Restaurar una copia no validaba el contenido y la copia no incluía los archivos (IndexedDB). | Copia completa (ajustes + datos de apps + archivos) con validación de esquema; se crea un **punto de restauración** antes de restaurar. |
| 11 | Media | El generador de QR enviaba el contenido (incluidas contraseñas Wi-Fi) a `api.qrserver.com`. | Codificador QR propio que funciona sin conexión; nada sale del dispositivo. |
| 12 | Baja | La calculadora usaba `Function()` (evaluación de código). | Analizador de expresiones propio sin `eval`; lo mismo en Sheets, el Laboratorio de fórmulas y la calculadora algebraica. |
| 13 | Baja | El `ping` de la terminal era simulado (información falsa). | Ping HTTP real con medición de tiempos (y se explica que no es ICMP). |
| 14 | Baja | Exportar CSV podía generar fórmulas que otros programas ejecutan (*CSV injection*). | Los valores que empiezan por `= + - @` se exportan como texto (`'=…`). |
| 15 | Mantenimiento | Proxy duplicado en 5 archivos e IA en 4, con diferencias entre plataformas. | Una única fuente (`lib/*.mjs`) y archivos de Netlify/Cloudflare **generados** (`tools/build-edge.mjs`). |

## 2. Requisitos de seguridad de 9.0 y cómo se cumplen

- **«No guardes contraseñas en texto plano.»**
  - PIN de perfil: PBKDF2-SHA-256 con 150.000 iteraciones y sal aleatoria de 16 bytes; bloqueo progresivo tras 5 intentos (30 s → 5 min).
  - Gestor de contraseñas: bóveda cifrada con AES-256-GCM; clave derivada de la contraseña maestra con PBKDF2-SHA-256 (310.000 iteraciones). La contraseña maestra no se guarda.
  - Ninguna app guarda contraseñas en claro. (La app *Correo* no guarda credenciales: usa tu app o webmail.)
- **«No incluyas claves API en JavaScript del cliente.»** La clave de IA solo se lee en el servidor (`AI_API_KEY`). El cliente envía, como mucho, el **código de acceso** opcional. La integración opcional de Spotify usa OAuth PKCE con un *Client ID* (que no es secreto) y guarda sus tokens solo en este navegador.
- **«No permitas que aplicaciones de terceros ejecuten código arbitrario con privilegios del sistema.»** Las apps de terceros (`.eisenapp` y apps web) se ejecutan en `iframe sandbox` **sin `allow-same-origin`** (origen opaco): no pueden leer el almacenamiento, los archivos ni el DOM de EISENKU. Solo hablan con el sistema mediante un puente `postMessage` que comprueba los permisos concedidos. El HTML de un paquete está limitado a 1 MB y su manifiesto se valida.
- **«Implementa una arquitectura de permisos para las aplicaciones.»** `K.perms`: cada app declara permisos (notificaciones, almacenamiento propio, archivos que elija el usuario, portapapeles, red, cámara, micrófono, carpetas del dispositivo). Las de terceros piden consentimiento al instalarse; todos se revisan y revocan en el **Administrador de permisos** y el registro de seguridad anota cada cambio.
- **Ejecución de código del usuario**: en el Editor de código, la Consola de desarrollo y el Entorno de pruebas, el código corre en un *Worker* dentro de un `iframe` con origen opaco y CSP `default-src 'none'`, con tiempo máximo (un bucle infinito se detiene sin bloquear EISENKU). Code Studio (8.0) muestra la vista previa en un `iframe` aislado (origen opaco), sin límite de tiempo.
- **Actualizaciones:** sin actualizaciones automáticas ni descargas de código de terceros. El *Service Worker* usa «red primero» (siempre la versión del servidor si hay conexión), nunca intercepta `/proxy`, `/p/` ni `/ai`. La integridad de los archivos se comprueba con SHA-256 (`integrity.json`).

## 3. Cabeceras y políticas

Servidor local, `_worker.js` y `_headers` aplican: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (sin *topics*), `Cross-Origin-Opener-Policy: same-origin-allow-popups`.

CSP de la aplicación:

```
default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' https: blob:; style-src 'self' 'unsafe-inline' https:;
img-src 'self' https: http: data: blob:; media-src 'self' https: http: data: blob: mediastream:; font-src 'self' https: data:;
connect-src 'self' https: http: wss: data: blob:; frame-src 'self' https: http: data: blob: about:; worker-src 'self' blob:;
object-src 'none'; form-action 'self' https: http:; frame-ancestors 'self'
```

## 4. Riesgos que permanecen (y por qué)

1. **`'unsafe-inline'` en `script-src`.** Las páginas internas del navegador (`srcdoc`) heredan la CSP y usan scripts en línea, igual que partes de 8.0. Quitarlo rompería el navegador y apps de 8.0. Mitigación: todo el contenido externo se escapa o se sanea con lista blanca, y lo que no es de confianza corre en orígenes opacos.
2. **`https:` en `script-src`.** Lo necesita el «modo compatibilidad» del navegador (páginas con `<base>` del sitio real). Esas páginas están aisladas en sandbox.
3. **Es una aplicación web.** Quien tenga acceso a las herramientas de desarrollo del navegador o al disco del equipo puede leer los datos no cifrados. El PIN y la pantalla de bloqueo protegen frente a miradas, no frente a esa persona. La bóveda de contraseñas sí está cifrada.
4. **Datos en el navegador.** Borrar los datos del sitio elimina EISENKU de ese navegador. Configuración › Almacenamiento permite pedir almacenamiento persistente y hacer copias completas.
5. **Proxy.** Quien ejecuta el servidor (o Netlify/Cloudflare) ve las direcciones visitadas mediante el proxy. Los inicios de sesión de grandes servicios no funcionan dentro del proxy y no deben usarse ahí: usa «Abrir en pestaña real».
6. **Límites de peticiones en memoria.** En Netlify/Cloudflare cada instancia tiene su propio contador; no es una protección contra ataques distribuidos. Para uso público, añade `AI_ACCESS_CODE` y las protecciones de tu proveedor.
7. **`HOST=0.0.0.0`** expone el servidor (sin HTTPS ni autenticación) a toda la red local: úsalo solo en redes de confianza.
8. **Servicios externos** que se usan solo cuando abres la app correspondiente: Open-Meteo (Clima), OpenStreetMap/Nominatim (Mapas), servicios de traducción y Wikipedia, Jitsi Meet (Videollamadas), RSS de terceros (Noticias), el proveedor de IA que configures y Spotify (si lo conectas).

## 5. Cambios de configuración necesarios

- Ninguno para seguir funcionando: las integraciones de 8.0 (proxy, IA, Netlify, Cloudflare, modo local) se mantienen con las mismas rutas (`/proxy`, `/p/…`, `/ai`).
- Nuevo y opcional: `AI_ACCESS_CODE`, `AI_RATE_PER_MIN`, `AI_DAILY_LIMIT`, `HOST`.
- Si modificas `lib/*.mjs`, regenera los archivos de Netlify/Cloudflare con `node tools/build-edge.mjs`.
- Si editas archivos de la web, regenera `integrity.json` con `node tools/build-integrity.mjs`.

## 6. Verificación realizada

- 41 pruebas unitarias del proxy (SSRF, redirecciones, cookies, CORS, sandbox) y pruebas HTTP sobre el servidor: `127.0.0.1`, `10.0.0.1`, `169.254.169.254`, `[::1]`, `2130706433`, `0x7f000001`, `localhost:8081` y URLs con credenciales → **bloqueadas** (400); *path traversal* → 403; archivos ocultos → 404; CORS desde otro origen → sin `Access-Control-Allow-Origin`.
- Pegado en Writer de HTML con `onclick`, `onerror`, `<script>` y `javascript:` → eliminado (sin ejecución).
- Consola aislada sin acceso a `localStorage`; bucle infinito detenido por tiempo.
- QR: ninguna petición de red al generar (comprobado con el registro de peticiones del navegador).
- Registro de seguridad local (`Centro de seguridad`) para PIN fallidos, permisos, integridad, CSP y proxy.

## 7. Revisión de seguridad de 10.0

Se mantienen todas las medidas anteriores. Para lo nuevo:

| Riesgo | Medida |
|---|---|
| Archivos importados con contenido malicioso (`.eistheme`, `.eisboard`, `.eisdiag`, `.eiscirc`, `.eisnet`, BibTeX, RIS, OPML, CSV) | Validación campo a campo y límites de tamaño; un tema solo puede fijar 13 variables de color con valores `#rrggbb`. Probado con un tema que incluía HTML, `url(javascript:…)` y variables ajenas: se descarta. |
| HTML ajeno (documentos convertidos, Markdown, RSS, EXIF, nombres de fuentes) | Pasa por el saneador del núcleo o se escapa; los diagramas escapan todo el texto antes de generar el SVG. |
| Contraseñas en el portapapeles o leídas en voz alta | El historial ignora campos de contraseña y las apps de contraseñas; el lector de pantalla no los lee. |
| Envío de archivos entre dispositivos | Conexión directa cifrada (WebRTC) que se abre con un código de conexión, verificación SHA-256 de cada archivo; nada pasa por un servidor de EISENKU. |
| Acceso a USB, HID, serie, Bluetooth, pantalla, micrófono y fuentes locales | Solo con el permiso del navegador, por dispositivo, revocable desde el Registro de periféricos. |
| Tareas programadas | Lista cerrada de acciones; no se ejecuta código del usuario. |
| Configuración avanzada | Solo claves `eisen_*` con JSON válido; antes de eliminar una clave se crea un punto de restauración. |
| Bloqueo de apps | PIN del perfil (PBKDF2): la app bloqueada pide el PIN al abrirse. |
| Service worker | Caché `eisenku-10.0.0`; las peticiones de prueba de velocidad no se guardan. |

Riesgos que permanecen: los mismos de la sección 4 (CSP con `'unsafe-inline'`, datos locales legibles con las herramientas del navegador, `HOST=0.0.0.0` sin HTTPS).

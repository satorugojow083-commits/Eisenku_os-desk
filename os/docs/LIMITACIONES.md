# EISENKU OS 10.0 NEXT GENERATION · Limitaciones conocidas

Este documento describe con honestidad lo que EISENKU **no** hace o hace con restricciones. La misma información, resumida, está en el *EISENKU OS Handbook › Limitaciones conocidas*.

## Plataforma

- **Es una aplicación web.** Linux Mode y Windows Mode son interfaces de escritorio simuladas dentro del navegador: no instalan Linux ni Windows ni ejecutan programas nativos (`.exe`, `.apk`, binarios de Linux).
- **Terminal:** es un intérprete propio sobre el sistema de archivos de EISENKU (`ls`, `cd`, `mkdir`, `touch`, `mv`, `cp`, `rm`, `tree`, `du`, `write`, `ping`…). No es bash ni PowerShell; `ping` mide HTTPS porque los navegadores no permiten ICMP.
- **Archivos:** se guardan en el almacenamiento del navegador (IndexedDB) de este dispositivo. Máximo 512 MB por archivo; la cuota total la decide el navegador. **Si borras los datos del sitio, se pierden**: usa *Configuración › Copias de seguridad* (copia completa) y la opción de almacenamiento persistente.
- **Carpetas del dispositivo:** solo con permiso explícito y carpeta por carpeta (API File System Access de Chrome/Edge de escritorio). En otros navegadores se pueden importar archivos o carpetas, pero no escribir en el disco. No hay acceso libre al disco.
- **Sin sincronización en la nube:** cada navegador y dispositivo tiene sus propios datos. Para pasarlos de uno a otro, exporta e importa una copia completa.
- **Perfiles y PIN:** separan los datos de cada persona en el mismo navegador y protegen frente a miradas, pero no frente a alguien con acceso a las herramientas de desarrollo del navegador (salvo la bóveda de contraseñas, que está cifrada).
- **Sin conexión:** funciona tras la primera visita por `http(s)`. Las funciones en línea (navegador, clima, mapas, traductor, noticias, IA, videollamadas) necesitan Internet.
- **`file://`:** abrir `index.html` con doble clic deja fuera el proxy, la IA, el modo sin conexión y la comprobación de integridad.

## Navegador EISEN

- **No puede abrir todos los sitios.** Muchas webs prohíben mostrarse dentro de otra página (`X-Frame-Options`, CSP). El proxy de EISENKU ayuda, pero no todo es posible: inicios de sesión de Google, Microsoft, bancos o redes sociales, vídeo con DRM, sitios con protección antibots o que dependen de su propio origen. Para ellos está «Abrir en pestaña real».
- No se han desactivado protecciones del navegador para forzar la compatibilidad.
- La **navegación privada** no da anonimato: tu proveedor, tu red y los sitios pueden ver tu actividad. Si usas el proxy, el servidor que lo ejecuta ve las direcciones.
- La **Tienda/App Center** muestra fichas oficiales de Google Play, pero un navegador no puede instalar ni ejecutar APK de Android.

## Aplicaciones

- **EISEN Writer:** abre `.docx`, `.html`, `.txt` y `.md`; no abre `.doc`, `.odt`, `.rtf` ni `.pages`. De un `.docx` conserva texto, formato, estilos de título, listas, tablas, enlaces e imágenes, pero no encabezados y pies de página, notas al pie, comentarios, cuadros de texto ni control de cambios. Exporta a PDF mediante la impresión del navegador.
- **EISEN Sheets:** una hoja por archivo, hasta 2.000 filas × 26 columnas (A-Z); abre y guarda **CSV** (no `.xlsx`). Más de 40 funciones (no todas las de Excel). Las fórmulas se guardan protegidas con un apóstrofo (`'=…`) para que otros programas no las ejecuten.
- **PDF Creator:** usa las fuentes estándar de PDF (alfabeto latino, Windows-1252): las letras de otros alfabetos (árabe, cirílico, chino, japonés…) y los emojis aparecen como «?». Para esos textos, usa *Writer › Imprimir o guardar como PDF*.
- **Escáner de documentos:** mejora el contraste y crea PDF; no hace OCR (reconocimiento de texto) ni corrección de perspectiva.
- **Correo:** redacta con plantillas y contactos y abre tu app de correo o webmail (Gmail, Outlook). No lee tu bandeja (no hay IMAP/SMTP en el navegador).
- **Chat:** entre pestañas del mismo dispositivo, o directo entre dos dispositivos con WebRTC intercambiando códigos. No hay servidor intermedio (TURN): en algunas redes muy restrictivas la conexión directa no es posible.
- **Videollamadas:** usan Jitsi Meet, un servicio externo.
- **Editor de audio:** archivos de hasta 80 MB / 40 minutos; exporta WAV.
- **Biblioteca digital:** EPUB sin DRM, TXT, Markdown y PDF (con el visor del navegador).
- **Editor de ecuaciones:** subconjunto de LaTeX convertido a MathML.
- **Simuladores y Laboratorio de fórmulas:** modelos educativos simplificados.
- **Maestro Domingo:** sin `AI_API_KEY` en el servidor funciona en modo local (órdenes, matemáticas, clima, Wikipedia…). Con IA, las respuestas dependen del proveedor que configures.
- **Spotify (Música):** opcional; requiere tu propio *Client ID* de Spotify.
- **Notificaciones y alarmas:** solo mientras EISENKU está abierto (la pestaña puede estar en segundo plano). No hay notificaciones push desde un servidor.

## Idiomas

- El **español** es el idioma original y está completo.
- En **inglés** está traducida la mayor parte de la interfaz del sistema (escritorio, Configuración, Archivos, App Center, navegador, oficina).
- En los **otros 18 idiomas** se traduce el núcleo (menús, botones, apartados de Configuración, Archivos y nombres de apps) y el resto aparece en inglés; en **catalán**, en español.
- El contenido interno de muchas apps 9.0 y de los juegos sigue en español.
- *Configuración › Idiomas y región* muestra la cobertura real del idioma elegido y exporta los textos que faltan para completarlos (`tools/i18n-extra/<idioma>.json`).

## Dispositivos

- **Xbox (Microsoft Edge):** el mando mueve el foco; no se pueden descargar archivos al dispositivo (elige «Solo guardar dentro de EISEN»). Activa el modo de bajo consumo.
- **Móviles:** las ventanas se abren a pantalla completa; algunas apps de escritorio (editor de audio, explorador de proyectos) son más cómodas en tableta u ordenador.
- **Cámara, micrófono, portapapeles y modo sin conexión** requieren HTTPS (o `127.0.0.1`). En `http://IP-local` el navegador puede bloquearlos.
- Algunas funciones dependen del navegador (carpetas del dispositivo, compresión ZIP, lector de QR por cámara, WebRTC). La app **Información del sistema** muestra qué admite el tuyo.

## Seguridad

Ver [SEGURIDAD.md](SEGURIDAD.md), sección «Riesgos que permanecen»: `'unsafe-inline'` en la CSP por compatibilidad con 8.0, límites de peticiones en memoria por instancia, y `HOST=0.0.0.0` sin HTTPS.

## Accesibilidad

- Las apps y menús 9.0 se manejan con teclado (Tab, flechas, Enter, Esc) y tienen etiquetas para lectores de pantalla; hay alto contraste, reducción de movimiento, texto grande, fuente de lectura fácil y foco reforzado.
- Algunos juegos de 8.0 (lienzo/canvas) y partes de apps de 8.0 no son accesibles con lector de pantalla.

## Novedades de 10.0: límites del navegador

EISENKU no finge acceso al sistema. Lo que sigue **no se puede obtener** desde una página web y, por tanto, no se muestra:

- Temperatura de CPU o GPU, uso real de CPU o GPU, RAM física ocupada, procesos del sistema operativo, modelo exacto del procesador, discos físicos, placa base o BIOS.
- `ping` ICMP, detalles del certificado TLS, lista de redes Wi-Fi.
- Ejecutar programas nativos, instalar controladores o fuentes en el sistema operativo.

Lo que se muestra es **real pero aproximado u opcional**: núcleos lógicos, memoria del dispositivo (redondeada por el navegador, con tope de 8 GB), GPU si WebGL o WebGPU la informan, batería y tipo de red (solo Chromium), memoria JavaScript de EISENKU (solo Chromium), presión de cómputo (donde existe `PressureObserver`).

## Novedades de 10.0: apps con restricciones

- **Editor de vídeo:** exporta en tiempo real, en WebM (o MP4 si el navegador lo codifica); una pista de vídeo.
- **Grabador de pantalla:** solo donde existe la captura de pantalla (no en Xbox ni en casi ningún móvil).
- **Visor RAW:** muestra la vista previa JPEG incrustada; no revela el archivo RAW.
- **Registro de periféricos, fuentes del equipo:** la detección automática solo existe en Chrome y Edge de escritorio, con permiso.
- **Diagnóstico de red y Servidores favoritos:** miden por HTTP(S), no por ICMP.
- **Comunicación entre dispositivos:** sin servidor TURN; puede fallar entre redes con NAT estricto.
- **Podcasts, DOI e ISBN:** necesitan Internet y el proxy (servidor local, Netlify o Cloudflare).
- **Conversor:** sin MP3 ni `.xlsx`; YAML sin anclas ni etiquetas; el PDF es de texto con formato básico.
- **Editor hexadecimal:** hasta 96 MB (256 MB en equipos con 8 GB).
- **Simuladores:** modelos simplificados con fines educativos (circuitos ideales en corriente continua; redes sin ARP, VLAN ni NAT).
- **Lector QR propio:** falla con códigos muy pequeños y borrosos.
- **Idiomas:** las apps de 10.0 están escritas en español; en inglés hay 1.163 textos traducidos y el resto aparece en español.
- **Dispositivos reales:** 10.0 se probó con emulación (pantalla, táctil y mando), no en una Xbox, un móvil, Firefox ni Safari reales.

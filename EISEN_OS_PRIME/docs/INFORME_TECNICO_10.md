# EISENKU OS 10.0 NEXT GENERATION · Informe técnico (Fase 10)

Versión **10.0.0** (nombre en clave *Beyond*) · compilación **2026.11.12** · base: EISENKU OS 9.0.0 ENTERPRISE.
Este informe dice qué se implementó, qué quedó parcial, qué no se puede hacer en un navegador, los errores conocidos, el rendimiento medido y la seguridad. Todo lo que aparece como «probado» se ejecutó de verdad; los resultados están en `docs/PRUEBAS.md`.

## 1. Resumen

| | 9.0 | 10.0 |
|---|---|---|
| Archivos del proyecto | 91 | 113 (ninguno de 9.0 eliminado) |
| Apps integradas | 91 | **138** (47 nuevas, todas de carga diferida) |
| Entradas del catálogo (apps, apps web, juegos) | 178 | 225 |
| Apartados de Configuración | 22 | 29 (las 25 categorías pedidas + 4) |
| Widgets | 7 | 20 |
| Atajos personalizables | 23 | 39 |
| Funciones del núcleo (`EISENKU.*`) | 94 | 155 (ninguna retirada) |
| Capítulos del Handbook | 25 | 26 |

Comprobación automática de «no eliminar»: los 91 archivos y las 91 apps de 9.0 siguen presentes; las 94 funciones del núcleo y las 107 de la API heredada siguen existiendo; los 7 widgets y los 23 atajos se conservan. Los 22 apartados de Configuración de 9.0 se reorganizaron en las categorías nuevas **sin borrar ninguna tarjeta** (prueba `test_settings`: 0 tarjetas ausentes).

## 2. Implementado y probado

### Fase 1 · Auditoría
`docs/AUDITORIA_10.md`: arquitectura, inventario, módulos repetidos, 5 defectos encontrados en 9.0 y mapa de las 100 funciones. Los 5 defectos se corrigieron: barra de tareas que se reconstruía con cada clic, miniaturas a tamaño completo, ZIP sin compresión (ahora DEFLATE real), lector QR que dependía de `BarcodeDetector` (ahora con decodificador propio) y mando que solo funcionaba en juegos (ahora navega por todo el sistema).

### Fase 2 · Las 100 funciones (A–J)
El estado de cada una está en la tabla de `AUDITORIA_10.md` §8: **13 existían y se conservan**, **19 se ampliaron** y **68 son nuevas** (9 de ellas con alternativa compatible porque el navegador no permite la versión nativa). Apps nuevas por categoría:

- **Sistema (18):** Núcleo del sistema, Monitor de recursos, Visor de eventos, Servicios, Administrador de inicio, Programador de tareas, Administrador de compatibilidad, Centro de actividad, Centro de recuperación, Comprobador de integridad, Inspector de hardware, Centro de dispositivos de entrada, Centro de mandos, Centro de dispositivos de audio, Registro de periféricos, Administrador de temas, Verificador de huellas, Administrador de fuentes.
- **Internet (8):** Centro de conexiones, Diagnóstico de conectividad, Servidores favoritos, Enlaces compartidos, Comunicación entre dispositivos, Información de conexión segura, Historial de conexiones, Privacidad del navegador.
- **Educación (8):** Organizador de documentos académicos, Gestor de referencias, Generador de bibliografía, Simulador de circuitos, Laboratorio de física y matemáticas, Simulador de topología de red, Centro de aprendizaje de informática, Centro del equipo.
- **Multimedia (7):** Editor de vídeo, Grabador de pantalla, Visor RAW, Gestor de colecciones, Reproductor con subtítulos, Biblioteca de podcasts, Centro multimedia.
- **Productividad (3):** Pizarra interactiva, Ideas rápidas, Conversor universal de formatos.
- **Desarrollo (3):** Editor hexadecimal (opcional, se instala desde el App Center), Calculadora de programación, Generador de diagramas técnicos.

Además, sin ser apps: registro de eventos, 13 servicios internos, programador con acciones (copias, limpieza, comprobación de servidores, integridad, tema…), historial del portapapeles, diseños de ajuste de ventanas, vista de ventanas, paneles laterales, 13 widgets nuevos, lector de pantalla, lupa, 4 variantes de alto contraste, filtros de color, teclado en pantalla, navegación con mando, bloqueo de apps con PIN, Archivos 10.0 (doble panel, vista rápida, etiquetas, búsqueda en el contenido, filtros guardados, comparar, metadatos) y citas, bibliografía, índice y ecuaciones dentro de Writer.

### Fase 3 · Configuración
25 categorías con búsqueda global (más Escritorio, Tienda, Sistema y Acerca de). Las tarjetas de 9.0 se recolocaron, no se borraron.

### Fase 4 · Escritorio avanzado
Escritorios virtuales con nombre y fondo propios, perfiles de pantalla (escala y márgenes para TV), diseños de ajuste, vista de todas las ventanas, paneles laterales, menús contextuales con submenús y teclado, y hoja de atajos de teclado y de mando.

### Fase 5 · Centro del equipo
17 componentes (CPU, GPU, RAM, ROM, placa base, BIOS/UEFI, SSD, HDD, fuente, refrigeración, pantalla, teclado, ratón, audio, red, USB y Bluetooth). Cada ficha explica qué es, cómo funciona, especificaciones típicas, una analogía, cuidados y problemas frecuentes, y muestra **solo los datos reales** que el navegador expone, con una nota de lo que no puede saber. Incluye mapa interactivo y cuestionario.

### Fase 6 · Ecosistema de apps
Cada app 10.0 tiene id único, icono, descripción, categoría, versión, configuración persistente (`eisen_<id>_cfg`) y se puede desinstalar y reinstalar desde el App Center (probado: tras desinstalar, abrir la app lleva a su ficha de la tienda; tras reinstalar conserva sus datos). No hay ejecutables externos: todo es JavaScript del propio proyecto.
Formatos propios que se abren desde Archivos: `.eistheme`, `.eisboard`, `.eisdiag`, `.eiscirc`, `.eisnet`.

### Fase 7 · Rendimiento
Ver §6.

### Fase 8 · Diseño
Se conserva la identidad: negro, verde oscuro, rosa y gris neutro, sin colores fluorescentes. **EISENKU WINDOWS MODE** y **EISENKU LINUX MODE** comparten apps y datos. El Administrador de temas trae 6 temas en esa paleta, editor con vista previa, comprobación de contraste (WCAG) y archivos `.eistheme` validados.

### Fase 9 · Funcionalidad real
Ningún botón nuevo carece de acción. Ejemplos de comportamiento comprobado con valores conocidos:

| Módulo | Comprobación | Resultado |
|---|---|---|
| Verificador de huellas | MD5, SHA-1, SHA-256 y CRC32 de «abc»; HMAC de referencia | coinciden con los valores publicados |
| Lector QR propio | 50 códigos generados con otra biblioteca (rotados, en perspectiva, con ruido) | 50/50 |
| Simulador de circuitos | 3 V sobre 10 Ω; serie/paralelo; divisor 10 k/4,7 k; RC con τ = 1 s | 297 mA; 38,8 mA; 3,84 V; 5,69 V a 1 s (teórico 5,69 V) |
| Simulador de redes | ruta más corta, ruta alternativa al cortar un enlace, subredes sin router | PA→R1→R3→R4→PB (12 ms); alternativa de 20 ms; «red inaccesible» |
| Calculadora de subredes | 192.168.1.130/26; 10.20.30.40 con máscara 255.255.240.0 | red .128, difusión .191, 62 equipos; /20, 4094 equipos |
| Calculadora de programación | desbordamiento en 8 bits, rotaciones, división con signo, IEEE 754 de 0,1 | −128; 0x80000000; −3; 0x3DCCCCCD |
| Conversor | YAML ida y vuelta, XML ⇄ JSON, CSV con comillas, BMP/ICO/WAV válidos | iguales byte a byte o releídos correctamente |
| Fuentes | TTF, OTF y WOFF reales: nombre, peso, estilo y nº de caracteres | iguales a los que da *fontTools* |
| Citas | APA 7, MLA 9, Chicago, IEEE, Harvard y Vancouver | formato revisado caso a caso |
| Laboratorio | periodo medido de un oscilador frente al teórico | diferencia < 0,03 s |
| CPU de juguete | 3 programas (suma, cuenta atrás, multiplicación) | 12 · 5 4 3 2 1 0 · 18 |

## 3. Implementado de forma parcial

| Función | Qué funciona | Qué falta o está limitado |
|---|---|---|
| Traducción de las apps 10.0 | Español completo; inglés: 1.163 textos de sistema y de las apps nuevas | Muchos textos largos de las apps 10.0 siguen en español en inglés y en los otros 18 idiomas |
| Editor de vídeo | Clips de vídeo, imagen y título, recorte, fundidos, música, exportación real | Exporta en tiempo real (tarda lo que dura el vídeo); WebM, o MP4 solo si el navegador lo codifica; una pista de vídeo |
| Visor RAW | Vista previa JPEG incrustada, EXIF, histograma, exportar JPEG | No revela el sensor (sin *demosaico*): la calidad es la de la vista previa de la cámara |
| Grabador de pantalla | Pantalla, ventana o pestaña, con micrófono | Solo donde existe `getDisplayMedia` (no en Xbox ni en la mayoría de móviles) |
| Registro de periféricos | Registro manual en todos los navegadores | Detección por WebUSB/WebHID/Serie/Bluetooth solo en Chrome/Edge de escritorio y con permiso por dispositivo |
| Diagnóstico de red y servidores | Latencia y disponibilidad por HTTP(S) | No hay ICMP: no es un `ping` real ni mide pérdida de paquetes |
| Comunicación entre dispositivos | Pestañas del mismo navegador; entre equipos por WebRTC con código | Sin servidor TURN: puede fallar en redes con NAT estricto; el código se intercambia a mano o por QR |
| Podcasts | Suscripción por RSS, reproducción, progreso, OPML | Necesita el proxy (servidor local, Netlify o Cloudflare); abriendo solo `index.html` no funciona |
| Conversor | Imágenes, datos, codificaciones, documentos, audio | Sin MP3 (se ofrece WAV y Opus); YAML sin anclas ni etiquetas; el PDF generado es solo texto con formato básico; hojas `.xlsx` no |
| Fuentes | Instalar TTF/OTF/WOFF/WOFF2 para usarlas dentro de EISENKU | Las fuentes del equipo solo se listan en Chrome/Edge de escritorio; de un WOFF2 no se lee el nombre interno |
| Editor hexadecimal | Archivos de hasta 96 MB (256 MB con 8 GB de memoria) | No edita por partes archivos mayores |
| Simulador de circuitos | Pila, resistencia, LED, interruptor, condensador, bombilla, medidores | Modelos ideales; sin bobinas, transistores ni corriente alterna |
| Simulador de redes | Rutas por Dijkstra, subredes, enlaces caídos, IP duplicadas | No simula ARP, VLAN, NAT ni protocolos de enrutamiento dinámico |
| Generador de diagramas | Flujo, secuencia, clases y red, con SVG y PNG | Sintaxis propia inspirada en la habitual; no es compatible al 100 % con otras herramientas |
| Pruebas de rendimiento del Inspector | Puntuación relativa a un equipo de referencia | No es comparable con programas de prueba nativos |

## 4. No implementable en un navegador (y qué se ofrece a cambio)

| Pedido | Por qué no | Alternativa incluida |
|---|---|---|
| Temperatura de CPU/GPU | Ninguna API web la expone | Se indica «no disponible»; el Centro del equipo explica cómo verla en el sistema operativo |
| Uso real de CPU y de GPU | Sin acceso a contadores del sistema | Fluidez (FPS), retardo del hilo principal y presión de cómputo (`PressureObserver`, donde existe) |
| RAM física ocupada | Solo `deviceMemory` (aproximada y con tope) | Memoria JavaScript usada por EISENKU (Chromium) |
| Procesos del sistema operativo | Aislamiento del navegador | Lista de ventanas y servicios de EISENKU con «Finalizar tarea» |
| Modelo exacto de CPU, discos físicos, placa base, BIOS | No se exponen | Núcleos lógicos, arquitectura y plataforma si el navegador las da; fichas explicativas |
| Ejecutar programas nativos o instalar controladores | Aislamiento del navegador | Apps internas instalables desde el App Center |
| `ping` ICMP, detalles del certificado TLS | Sin sockets ni acceso a TLS | Latencia HTTP(S) y lectura de cabeceras de seguridad |
| Instalar fuentes en el sistema operativo | Aislamiento | Fuentes instaladas dentro de EISENKU |
| Codificar MP3 | Los navegadores no traen codificador | WAV y Opus |

En ningún caso se muestran cifras inventadas: donde no hay dato, la interfaz lo dice.

## 5. Errores y riesgos conocidos

1. **No se probó en dispositivos físicos.** Todas las pruebas se hicieron en Chromium sin interfaz (Linux) con emulación de pantalla, táctil y mando. No se ha verificado en una Xbox real, en Android/iOS reales, en Firefox ni en Safari. En Firefox y Safari faltan APIs opcionales (batería, red, WebUSB, fuentes locales, `PressureObserver`); las apps lo detectan y lo indican, pero ese camino solo se revisó por lectura del código.
2. **Servicios en línea** (DOI/ISBN, RSS, STUN): se probaron con respuestas simuladas porque el entorno de pruebas no tiene Internet libre.
3. **Exportación de vídeo y grabación** dependen de la carga del equipo: al ejecutar varias baterías de pruebas a la vez, 5 pruebas multimedia fallaron por tiempo y pasaron al repetirlas solas (14/14).
4. **Lector QR propio:** falla con códigos muy pequeños (≈ 2 píxeles por módulo) y muy borrosos.
5. **CSP con `'unsafe-inline'`** (heredado, por compatibilidad con 8.0).
6. **Traducción incompleta** de las apps nuevas (ver §3).
7. **`INICIAR.bat`** no se ejecutó en un Windows real (se revisó su sintaxis).
8. Durante las pruebas finales se encontraron y corrigieron dos defectos: con el mando, la cruceta no hacía nada si no había ningún elemento enfocado; y Archivos no reconocía extensiones de más de 6 letras (`.eistheme`, `.eisboard`).

## 6. Rendimiento

Medido en Chromium sin interfaz, 1366×768, servidor local:

| Medida | Valor |
|---|---|
| Arranque (`load`) | ≈ 0,5 s |
| Peticiones al arrancar | 42 · 1,88 MB sin comprimir (1,57 MB de JavaScript) |
| Código 10.0 que se carga al arrancar | 5 módulos, ≈ 227 KB |
| Código 10.0 que **no** se carga hasta que hace falta | Archivos 10.0, 8 módulos de apps y 4 bibliotecas, ≈ 856 KB |
| Memoria JavaScript tras arrancar | ≈ 5,5 MB (≈ 6,6 MB con 3 apps 10.0 abiertas) |
| Fluidez en reposo | 60 FPS |
| Abrir una app 10.0 la primera vez | 45–80 ms |
| Regresión | 137 ventanas de app abiertas y cerradas, 28 juegos: 0 fallos, 0 errores, ninguna lenta |

Medidas tomadas en un equipo de escritorio; en una Xbox o un móvil serán más lentas. Para esos equipos: carga diferida, liberación de la memoria de las apps cerradas, miniaturas reducidas con caché, pausa de animaciones cuando la ventana no se ve, **modo de bajo consumo** y los modos del Administrador de compatibilidad (sin animaciones, zoom, descarga de apps).

Pantallas probadas: 390×844 (táctil), 800×1280 (táctil) y 1920×1080, sin desbordamiento horizontal en las 16 apps revisadas; árabe (derecha a izquierda) sin errores.

## 7. Seguridad

- Se mantienen todas las protecciones de 9.0 (proxy aislado, bloqueo de destinos internos, saneador HTML, permisos, PBKDF2, AES-GCM, cabeceras).
- **Archivos importados** (`.eistheme`, `.eisboard`, `.eisdiag`, `.eiscirc`, `.eisnet`, BibTeX, RIS, OPML, CSV): se validan campo a campo; un tema solo puede fijar 13 variables de color con valores `#rrggbb`. Probado con un tema malicioso (HTML, `url(javascript:…)`, variables ajenas): se descarta todo.
- **Contenido ajeno mostrado en pantalla** (documentos convertidos, Markdown, fuentes RSS, metadatos EXIF, nombres de fuentes): pasa por el saneador o se escapa; los diagramas escapan todo el texto antes de generar el SVG.
- **Portapapeles e historial:** no se guardan campos de contraseña; el lector de pantalla no los lee.
- **Comunicación entre dispositivos:** conexión directa cifrada (WebRTC); cada archivo se verifica con SHA-256; no pasa por ningún servidor de EISENKU.
- **Dispositivos (USB, HID, serie, Bluetooth), pantalla, micrófono y fuentes locales:** siempre con el permiso que pide el navegador, por dispositivo y revocable.
- **Programador de tareas:** solo ejecuta acciones de una lista cerrada; no ejecuta código escrito por el usuario.
- **Configuración avanzada:** solo claves `eisen_*` y JSON válido.
- **Privacidad:** nada de lo nuevo envía datos fuera, salvo lo que el usuario pide (consultar un DOI, un RSS, un servidor favorito).
- Riesgos que permanecen: `'unsafe-inline'` en la CSP; los datos locales no cifrados son legibles con las herramientas del navegador; `HOST=0.0.0.0` expone EISENKU a la red local sin HTTPS.

## 8. Cómo verificarlo

- Dentro de EISENKU: *Comprobador de integridad* (huellas SHA-256 de `integrity.json`), *Núcleo del sistema › Diagnóstico* (17 pruebas), Terminal `sysinfo10`.
- Archivos de 9.0 modificados (ampliados, sin quitar funciones), 31 más `integrity.json` y la documentación: `index.html`, `sw.js`, `version.json`, `manifest.webmanifest`, `server.mjs`, `lib/security.mjs`, `tools/build-edge.mjs` y los archivos que genera (`_worker.js`, `functions/*`, `netlify/functions/*`), `js/app.js`, `js/extras.js`, `js/shell.js`, `js/apps-media.js`, `js/os9/boot.js`, `kernel.js`, `shell9.js`, `start9.js`, `settings9.js`, `files9.js`, `office9.js`, `browser9.js`, `appcenter.js`, `catalog9.js`, `apps/system.js`, `apps/handbook.js`, y el inglés (`tools/i18n-extra/en.json`, `js/os9/i18n/en.js`).
- Archivos nuevos, 22: `js/os10/` (18), `css/eisenku10.css`, `css/apps10.css`, `docs/AUDITORIA_10.md` y este informe.

# EISENKU OS 10.0 NEXT GENERATION · Pruebas realizadas

Fecha de la última ejecución completa: **12 de noviembre de 2026** · Entorno: Chromium sin interfaz (Playwright) en Linux, Node.js 22, servidor local `server.mjs`. La segunda parte de este documento conserva las pruebas de 9.0.

## Resumen de 10.0

| Conjunto | Qué comprueba | Resultado |
|---|---|---|
| Regresión completa | Abrir y cerrar las 137 ventanas de app (instalando las opcionales), 28 juegos, cambio Linux ⇄ Windows, bajo consumo | **137/137, 28/28, 0 errores de JavaScript** |
| Conservación de 9.0 | Inventario automático comparado con el de 9.0 | 91/91 archivos, 91/91 apps, 94/94 funciones del núcleo, 7/7 widgets, 23/23 atajos; 0 tarjetas de Configuración ausentes |
| Sistema | Núcleo, monitor, eventos, servicios, inicio, programador, compatibilidad, actividad, recuperación, integridad | 15/15 |
| Hardware | Inspector, entrada, mandos (mando simulado), audio, periféricos, Centro del equipo | 24/24 |
| Redes | Conexión, diagnóstico, servidores, enlaces, comunicación entre dispositivos, seguridad, historial, privacidad | 21/21 |
| Oficina | Citas en 6 estilos, BibTeX/RIS, DOI/ISBN (respuestas simuladas), Writer, organizador, ideas, pizarra | 19/19 |
| Multimedia | Editor de vídeo (exportación real), grabador (captura simulada), RAW, colecciones, subtítulos, podcasts, centro multimedia | 14/14 |
| Temas | Aplicar, crear, editar, exportar/importar `.eistheme`, tema malicioso, programar un tema | 11/11 |
| Herramientas | Huellas, editor hexadecimal, conversor, fuentes, calculadora de programación, diagramas | 41/41 |
| Ciencia y educación | Circuitos, laboratorio, redes, aprendizaje | 25/25 |
| Integración | Terminal 10.0, Handbook, «Abrir con», abrir `.eisboard`, service worker | 6/6 |
| Archivos 10.0 | Doble panel, vista rápida, etiquetas, búsqueda, comparar, metadatos, ZIP | 11/11 |
| Escritorio y accesibilidad | Ajuste de ventanas, paneles, widgets, portapapeles, lector, lupa, mando | 27/27 |
| Configuración | 29 apartados, búsqueda, alias de los apartados antiguos | 0 ausentes |
| Pantallas e idiomas | 16 apps a 390×844 táctil, 800×1280 táctil y 1920×1080; árabe (derecha a izquierda) | sin desbordamiento ni errores |
| Persistencia | Tema, fuente instalada, circuito, diagrama y progreso tras recargar; desinstalar y reinstalar una app | correcto |
| Lector QR propio | 50 imágenes generadas con otra biblioteca (rotación, perspectiva, ruido); 200 correcciones Reed-Solomon | 50/50 · 200/200 |
| Servidor | `127.0.0.1`, `10.0.0.1`, `169.254.169.254`, `[::1]`, `2130706433` por el proxy; ruta con `..%2f` | bloqueados (400 / 403) |

Total de 10.0: **220 comprobaciones funcionales en 12 conjuntos, más la regresión de 137 apps y 28 juegos; todas correctas en la última ejecución, con 0 errores de JavaScript.**

## Valores de referencia comprobados

- **Huellas** de «abc»: MD5 `900150983cd24fb0d6963f7d28e17f72`, SHA-1 `a9993e36…d0d89d`, SHA-256 `ba7816bf…f20015ad`, CRC32 `352441c2`; HMAC-SHA-256 de la frase de ejemplo habitual con clave `key`: `f7bc83f4…2d1a3cd8`.
- **Circuitos:** 3 V y 10 Ω → 297 mA y 0,88 W; 100 Ω en serie con 220 Ω ∥ 330 Ω a 9 V → 38,8 mA; divisor 10 kΩ/4,7 kΩ a 12 V → 3,84 V; RC de 1 kΩ y 1 mF a 9 V → 5,69 V al cabo de 1 s (error < 3 %); cortocircuito y LED sin resistencia → aviso.
- **Redes:** ruta de menor coste y TTL correctos; al cortar un enlace se elige la ruta alternativa (20 ms, TTL 60); dos subredes sin router → «red de destino inaccesible»; IP duplicada → conflicto.
- **Subredes:** 192.168.1.130/26 → red .128, difusión .191, 62 equipos; 10.20.30.40 con 255.255.240.0 → /20, red 10.20.16.0, 4094 equipos; máscaras no contiguas rechazadas.
- **Calculadora de programación:** `0xFF AND 0b1010 << 2` = 40; `127 + 1` en 8 bits con signo = −128; `-1 >>> 28` = 15; `1 ROL 31` = 0x80000000; 0,1 en float32 = 0x3DCCCCCD.
- **Conversor:** YAML → objeto → YAML idéntico (con cadenas ambiguas como `"123"`, `"true"`, `"a: b"`); XML → JSON → XML equivalente; CSV con comillas dobles; BMP, ICO, JPEG y WebP con cabeceras válidas y releídos; WAV a 16 kHz mono normalizado a −1 dB; Markdown → Word → releído; PDF con cabecera `%PDF`.
- **Fuentes:** DejaVu Sans (TTF), TeX Gyre Pagella Bold (OTF) y TeX Gyre Heros Bold Italic (WOFF): familia, peso, estilo y número de caracteres iguales a los de *fontTools*.
- **Ordenación:** los 5 algoritmos ordenan 20 listas aleatorias de 50 elementos cada uno; la burbuja hace 10 comparaciones con 5 elementos en orden inverso.
- **CPU de juguete:** suma → 12; cuenta atrás → 5 4 3 2 1 0; multiplicación 6 × 3 → 18.
- **Estadística:** para 12, 15, 15, 18, 21, 22, 22, 22, 25, 30, 41 → media 22,09, mediana 22, moda 22, Q1 16,5, Q3 23,5, atípico 41.

## Incidencias durante las pruebas

- **Corregidas:** la cruceta del mando no hacía nada sin un elemento enfocado; Archivos no reconocía extensiones de más de 6 letras; al cambiar de pestaña mientras una app calculaba (Conversor, Fuentes) se podía redibujar la pestaña anterior; el visor RAW y el reproductor con subtítulos no abrían el archivo elegido con «Abrir con».
- **Dependientes de la carga del equipo:** al ejecutar 9 conjuntos a la vez, 5 pruebas multimedia (exportación en tiempo real) y 1 de animación de la barra de tareas fallaron por tiempo; ejecutadas una tras otra pasan todas.
- **Ajustes en las propias pruebas:** dos pruebas calculaban mal una fecha u unas coordenadas y se corrigieron (no eran fallos de EISENKU).

## Lo que no se ha podido probar en 10.0

- **Dispositivos reales:** Xbox, móviles y tabletas Android/iOS, Firefox y Safari. Se usó emulación de pantalla, de táctil y un mando simulado.
- **Hardware real:** cámara, micrófono, captura de pantalla, USB/HID/serie/Bluetooth y vibración del mando se probaron con dispositivos simulados por el navegador de pruebas.
- **Internet:** DOI, ISBN, RSS de podcasts, STUN y servidores externos se probaron con respuestas simuladas.
- **Comunicación entre dos equipos distintos** por WebRTC: se probó entre dos pestañas.
- **Netlify, Cloudflare y Windows:** igual que en 9.0 (ver más abajo).

## Cómo repetir las comprobaciones dentro de EISENKU 10.0

- *Comprobador de integridad › Comprobar ahora* (82 archivos con SHA-256).
- *Núcleo del sistema › Diagnóstico* (17 pruebas) e informe exportable.
- Terminal: `sysinfo10`, `services`, `events 20 error`, `hash <archivo>`.
- *Administrador de compatibilidad*: qué funciones tiene tu navegador y qué apps dependen de ellas.

---

# Pruebas de 9.0 ENTERPRISE (se conservan)

Fecha: 2 de noviembre de 2026 · Entorno: Chromium (Playwright, sin interfaz), Node.js 22, servidor local `server.mjs`.

## Resumen

| Área | Resultado |
|---|---|
| 91 apps integradas (8.0 + 9.0) | **Todas abren sin errores de JavaScript**: 84 instaladas por defecto, las 6 opcionales tras instalarlas desde el App Center y *Carpeta* (ventana auxiliar de las carpetas del escritorio). |
| 28 juegos | Todos se inician y cierran sin errores. |
| Linux Mode ⇄ Windows Mode | Cambio en ambos sentidos, ventanas abiertas conservadas, elección recordada. |
| Bajo consumo | Se activa y desactiva correctamente. |
| Móvil (390×844), tableta (800×1280), Xbox/TV (1920×1080) | Settings, Archivos, Writer, App Center, Handbook y Editor de código caben en pantalla; sin desplazamiento horizontal. |
| Árabe (derecha a izquierda) y vuelta a español | Correcto, sin errores. |
| Integridad (`integrity.json`) | 62 archivos verificados, todos coinciden. |
| Actualización desde 8.0 | Con datos de 8.0 (notas, documento de Writer, hoja de Sheets, entorno Linux): se detecta la versión anterior, se crea un punto de restauración, todos los datos se conservan y el asistente muestra «EISENKU OS se ha actualizado a 9.0 ENTERPRISE». |
| Paquete ZIP | Descomprimido en una carpeta nueva: el servidor arranca, sirve los 62 archivos con las huellas de `integrity.json` y la primera visita muestra el asistente de bienvenida sin errores. |
| Seguridad HTTP | Cabeceras presentes; SSRF, *path traversal*, archivos ocultos y CORS bloqueados (ver abajo). |

## Detalle por conjunto de pruebas

### Regresión completa
Se abre cada app registrada (espera a que cargue su módulo), se comprueba que la ventana tiene contenido y que no aparece «Error al iniciar la app», y se cierra. Después: juegos, entornos, bajo consumo, comprobación de integridad desde la propia app, tres tamaños de pantalla e idioma árabe. **0 errores de JavaScript.**

### Oficina
- **Sheets:** 56 fórmulas comprobadas (SUMA/SUM, PROMEDIO, MIN/MAX, CONTAR/CONTARA, REDONDEAR, POTENCIA, RAIZ, SI, SI.ERROR, Y/O/NO, SUMAR.SI, CONTAR.SI con comodines, PROMEDIO.SI, BUSCARV exacto, MOD, MEDIANA, LOG, referencias absolutas `$A$1`, precedencia `2^3^2`, `-2^2`, porcentajes, decimales con coma y miles con punto, concatenación, comparación de textos, referencia circular `#CIRC!`, división por cero, `#VALUE!`, `#NAME?`, errores de sintaxis). Abrir CSV con punto y coma, guardar CSV con fórmulas protegidas, pegar un bloque con tabuladores, escribir una fórmula y bajar con Enter.
- **Writer:** guardar como .docx, .html y .txt en distintas carpetas; guardado automático al editar; documento nuevo; reabrir el .docx (ida y vuelta: títulos, listas anidadas, tabla con encabezado y color de celda, cita, código, colores, tachado, sub/superíndice, resaltado, enlace e imagen); buscar (2 coincidencias) y reemplazar todo; pegado de HTML con `onclick`, `onerror`, `<script>` y `javascript:` → nada se ejecuta ni se conserva; imprimir.
- **.docx generado** abierto con `python-docx` y convertido a PDF con LibreOffice: estructura, estilos, listas, tabla e imagen correctos.
- **Códigos QR:** 46 códigos (versiones 1 a 40, niveles L/M/Q/H, modos numérico, alfanumérico y bytes UTF-8, máscara automática) decodificados correctamente con OpenCV; límite de 2.953 bytes comprobado. Generar en la app no hace **ninguna petición de red**.
- **Música:** atajos Ctrl+Alt+K/J/L registrados; «Abrir con» de .docx → Writer y de .csv → Sheets.

### Idiomas
Alemán, árabe, japonés y catalán guardados y recargados: navegación de Configuración y Archivos traducida, `dir="rtl"` en árabe, fechas en formato regional, medidor de cobertura (nativo / con respaldo en inglés) y exportación de textos sin traducir.

### Servidor y proxy
- 41 pruebas unitarias del proxy: **41 OK**.
- Peticiones al servidor: `127.0.0.1:8280`, `localhost:8281`, `10.0.0.1`, `169.254.169.254`, `[::1]`, `2130706433`, `0x7f000001` → *«Destino privado o interno bloqueado»* (400); URL con usuario y contraseña → 400; `/..%2f..%2fetc%2fpasswd` → 403; `/.git/config` → 404; ping del proxy desde otro origen → sin `Access-Control-Allow-Origin`; `/ai` sin clave → 503 con mensaje claro.
- `INICIAR.sh` arranca el servidor en el puerto indicado.

### Apps 9.0 por áreas (sesiones anteriores, repetidas tras los cambios)
Internet (8 apps), multimedia (3), desarrollo (9; incluido el aislamiento: la consola no accede a `localStorage` y un bucle infinito se detiene), sistema (13), ciencia (7), Handbook, navegador 9.0, asistente de bienvenida y tutoriales, Archivos, App Center y productividad.

## Lo que no se ha podido probar aquí (y por qué)

- **Servicios en línea reales** (clima, mapas, traductor, noticias, Wikipedia, Jitsi, IA, Spotify): el entorno de pruebas no tiene acceso libre a Internet. Se probó que las apps abren, que gestionan la falta de conexión y que el servidor responde con mensajes claros.
- **Lector de QR por cámara:** Chromium sin interfaz en Linux no incluye `BarcodeDetector`.
- **Cámara y micrófono reales**, **Xbox y Android reales**: se usaron emulación de pantalla y de táctil, no dispositivos físicos.
- **Netlify y Cloudflare:** se generan desde la misma fuente que el servidor local (`lib/`), que sí se probó; el despliegue real requiere tu cuenta.
- **Windows:** `INICIAR.bat` no se ha ejecutado en un Windows real (se revisó su sintaxis y finales de línea CRLF).

## Cómo repetir las comprobaciones dentro de EISENKU

- *Centro de actualizaciones › Integridad › Comprobar ahora.*
- *Centro de seguridad* (puntuación y comprobaciones).
- *Panel de diagnóstico* (errores recientes, rendimiento, informe exportable).
- *Información del sistema* (compatibilidad del navegador).

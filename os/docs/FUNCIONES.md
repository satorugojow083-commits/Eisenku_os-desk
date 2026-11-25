# EISENKU OS 10.0 NEXT GENERATION · Funciones

> Las secciones 1 a 13 describen lo heredado de 9.0 (se conserva íntegro). La sección 14 resume lo nuevo de 10.0.

Resumen: **91 aplicaciones integradas** (45 de 8.0 conservadas y mejoradas + 46 nuevas de 9.0), **28 juegos**, **60 apps web** en el catálogo, **20 idiomas**, dos escritorios completos (Linux Mode y Windows Mode) y un servidor con proxy e IA para uso local, Netlify y Cloudflare Pages.

Las apps 9.0 se descargan solo al abrirlas (arranque rápido). Seis apps de desarrollo son **opcionales** y se instalan desde el App Center.

---

## 1. Sistema y escritorio

**Dos entornos completos** con los mismos datos (Configuración › Entorno, asistente inicial o Domingo); se recuerda la elección.
- **Windows Mode:** barra de tareas inferior, menú Inicio con búsqueda, apps fijadas y recientes, bandeja del sistema, vista de tareas y panel de widgets.
- **Linux Mode:** panel superior con Actividades, menú de aplicaciones por categorías, lanzador a pantalla completa, indicador de escritorios virtuales y dock configurable (posición, tamaño, ocultación automática).

**Ventanas:** mover, redimensionar, maximizar, minimizar, ajustar a mitad de pantalla (arrastrando o con atajos), menú de ventana (clic derecho en la barra de título: centrar, mover a otro escritorio, siempre visible…), y ajuste automático para que ninguna ventana quede fuera de la pantalla (tabletas y giros). En móviles se abren a pantalla completa.

**Escritorios virtuales:** hasta 6, vista general (Ctrl+Alt+↑) con miniaturas, arrastrar ventanas entre escritorios.

**Centro de notificaciones:** historial, No molestar, silenciar apps, ajustes rápidos y calendario (clic en el reloj).

**Búsqueda global (Ctrl+K):** apps, ajustes, archivos, capítulos de ayuda y la web.

**Widgets:** reloj, agenda de hoy, clima, sistema, última nota, concentración y accesos favoritos.

**Modo concentración:** temporizador que activa No molestar, oculta iconos y bloquea juegos y redes sociales.

**Inicio de sesión y bloqueo:** perfiles locales con avatar y PIN opcional (PBKDF2), bloqueo automático por inactividad, cambio de usuario.

**Bienvenida y ayuda:** asistente inicial (idioma, entorno, tema, perfil), 6 tutoriales interactivos sobre la interfaz real, Centro de bienvenida, **F1** abre la ayuda de la app activa.

**Atajos personalizables** (Configuración › Sistema): búsqueda, vista general, mostrar escritorio, escritorios anterior/siguiente, mover ventanas entre escritorios, ajustar/maximizar/minimizar/cerrar ventanas, notificaciones, accesos rápidos, Configuración, Archivos, Terminal, concentración, ayuda, bajo consumo y controles de música.

**Rendimiento:** modo de bajo consumo (sin cristal ni animaciones, widgets en pausa, apps liberadas al cerrarlas), ahorro de datos, apps de carga diferida y modo sin conexión (Service Worker «red primero»).

**Arranque:** apps de inicio, restaurar la disposición de ventanas, modo seguro (`?safe=1` o desde Mantenimiento).

**Personalización:** 7 temas (EISENKU Noir, Rosé Graphite, Aurora Enterprise, Blueprint, Jade, Porcelana claro, Clásico 8.0), colores de acento y selector libre, fondos (con presentación automática), densidad, esquinas, efecto cristal, tamaño de iconos y del texto.

**Accesibilidad:** alto contraste, reducir animaciones, texto grande, fuente de lectura fácil, foco reforzado, navegación con teclado y mando, etiquetas para lectores de pantalla, filtro de luz cálida y brillo.

## 2. Configuración (22 apartados con buscador)

Apariencia · Temas · Personalización · Entorno Linux / Windows · Idiomas y región · Pantalla · Sonido · Notificaciones · Accesibilidad · Rendimiento · Privacidad · Seguridad · Cuentas · Aplicaciones · Almacenamiento · Red · Navegador · Asistente · Copias de seguridad · Actualizaciones · Sistema · Información de EISENKU OS.

Incluye: perfiles y PIN, copias completas (ajustes + datos + archivos) con validación, puntos de restauración, almacenamiento persistente, historial de actividad local, formatos regionales (fecha, hora, números), cobertura de traducción, atajos y restablecimiento.

## 3. Archivos

Carpetas raíz (Documentos, Imágenes, Música, Vídeos, Descargas) con subcarpetas; vista de cuadrícula y lista; ordenar; buscar; copiar, cortar, pegar, renombrar, mover y arrastrar entre carpetas; **papelera con restauración**; favoritos (archivos y carpetas); panel de detalles; importar archivos o carpetas del dispositivo; exportar carpeta a ZIP y extraer ZIP; «Abrir con» y aplicaciones predeterminadas por extensión; selector de archivos para otras apps (con permiso); terminal con comandos reales sobre estos archivos.

## 4. EISENKU App Center

Inicio con destacadas, categorías, buscador, fichas con versión, novedades y permisos; instalar, desinstalar (conservando datos), restaurar y marcar favoritas; **Actualizaciones** de apps integradas con notas y confirmación; apps web por URL (detecta nombre, icono y descripción; valida la dirección); **paquetes de terceros `.eisenapp`** aislados con permisos y app de ejemplo; sección Google Play (fichas oficiales y versión web cuando existe).

## 5. Navegador EISEN

Tres perfiles de navegador (Eisen Web con Google, Eisen Privado con DuckDuckGo, Eisen Nova con Bing), pestañas (reabrir cerradas, sesiones guardadas), historial, marcadores con carpetas e importación/exportación estándar, descargas, página de resultados (DuckDuckGo/Bing + Wikipedia, vídeos), modo lectura, modo oscuro forzado, **navegación privada** (Eisen Privado), **permisos por sitio** (cámara, micrófono, ubicación, portapapeles, captura de pantalla, MIDI), bloqueo de ventanas emergentes, información del sitio (HTTPS, dominios internacionales), proxy aislado y «Abrir en pestaña real».

## 6. Aplicaciones de 8.0 (conservadas; mejoradas en 9.0 donde se indica)

- **Productividad:** **EISEN Writer** *(9.0: documentos en Archivos en .docx/.html/.txt, estilos, fuentes, colores, resaltado, enlaces seguros, imágenes, tablas, buscar y reemplazar, recuento de palabras, guardado automático, pegado saneado)*, **EISEN Sheets** *(9.0: motor de fórmulas con rangos, comparaciones y más de 40 funciones en español o inglés, abrir/guardar CSV, pegar bloques, navegación con teclado)*, PDF Studio *(apertura segura)*, Notas, Tareas, Calendario con recordatorios, Reloj y alarmas, Calculadora científica *(sin evaluación de código)*, Conversor (con divisas), Editor de texto, Presentaciones.
- **Internet:** Navegador EISEN *(9.0, ver arriba)*, Clima, Traductor, Noticias RSS, Mapas, **Códigos QR** *(9.0: generación sin conexión; texto, enlace, Wi-Fi, contacto, correo, teléfono y SMS; corrección y colores; PNG/SVG; lector con cámara o imagen si el navegador lo admite)*.
- **Multimedia:** Música *(9.0: teclas multimedia y atajos Ctrl+Alt+K/J/L; Spotify opcional)*, Galería, Grabadora, Cámara, Reproductor de vídeo, Piano.
- **Creatividad:** EISEN Paint, Editor de fotos, Pixel Art, Paletas de color.
- **Educación:** Tabla periódica, Graficadora, Tarjetas de estudio, Enciclopedia, Laboratorio de física, Mecanografía, Atlas mundial.
- **Desarrollo:** Code Studio (HTML/CSS/JS con vista previa aislada y consola).
- **Sistema:** EISENKU App Center, Archivos, Terminal *(9.0: comandos de archivos reales y ping HTTP)*, Configuración, Monitor del sistema, Generador de contraseñas, Prueba de red, Maestro Domingo *(IA opcional con código de acceso)*, Carpeta (carpetas del escritorio).
- **Juegos:** Game Hub (ver sección 8).

## 7. Aplicaciones nuevas de 9.0 (46)

**Productividad (6)**
- Editor Markdown: vista previa en vivo, índice y exportación a HTML.
- PDF Creator: PDF reales desde texto o imágenes, tamaño de página, márgenes y marca de agua.
- Gestor de proyectos: tableros Kanban con columnas, tarjetas, prioridades, fechas y progreso.
- Organizador de apuntes: cuadernos por materia, secciones, páginas de texto enriquecido, etiquetas y buscador.
- Gestor de contraseñas: bóveda AES-256-GCM con contraseña maestra (PBKDF2), generador, exportación cifrada.
- Escáner de documentos: cámara o imagen, filtros (gris, blanco y negro, alto contraste) y PDF.

**Internet (8)**
- Descargas, Marcadores (carpetas, importar/exportar HTML estándar), Historial (por días, borrado selectivo), Administrador de pestañas (sesiones), Centro de privacidad (qué se guarda, actividad, permisos, limpieza).
- Correo: borradores, plantillas y contactos; envío con tu app o webmail.
- Chat: entre pestañas o directo entre dos dispositivos (WebRTC) con código de invitación.
- Videollamadas: Jitsi Meet, prueba de cámara y micrófono.

**Multimedia (3)**
- Visor de imágenes: zoom, giro, volteo, pase de diapositivas, información, fondo de pantalla, guardar copia girada.
- Editor de audio: forma de onda, selección, recortar, silencio, fundidos, normalizar, ganancia, invertir, revertir, deshacer/rehacer, grabar y exportar WAV.
- Administrador multimedia: biblioteca de música, vídeos e imágenes, listas de reproducción, aleatorio y repetición.

**Desarrollo (9; 6 opcionales)**
- Editor de código: pestañas, resaltado, números de línea, buscar y reemplazar, ir a línea, ajuste de línea, vista previa HTML/Markdown, sesión guardada.
- Editor JSON: validación con línea y columna, árbol, estadísticas, formatear, minimizar, ordenar claves, CSV.
- Gestor de fragmentos: lenguaje, etiquetas, búsqueda, importar/exportar.
- *Opcionales:* Consola de desarrollo (JavaScript aislado), Explorador de proyectos (carpeta del dispositivo, ZIP o Archivos; árbol, búsqueda en contenido, estadísticas), Validador HTML (estructura, accesibilidad, SEO, seguridad), Formateador (JSON, CSS, HTML, JS, SQL, XML), Generador de documentación (JSDoc → Markdown/HTML), Entorno de pruebas (describe/test/expect aislados).

**Sistema (13)**
- Monitor de almacenamiento, Administrador de aplicaciones (datos, permisos, apps de inicio, predeterminadas), Centro de actualizaciones (versión, novedades, migraciones reversibles, integridad SHA-256, puntos de restauración), Administrador de permisos (apps, terceros, sitios, registro), Configuración de red (servicios, velocidad, modo del proxy, ahorro de datos), Administrador de dispositivos (cámaras, micrófonos, altavoces, pantalla, mandos, batería), Información del sistema (compatibilidad), Administrador de sesiones (perfiles y disposición de ventanas), Centro de seguridad (puntuación, comprobaciones, registro), Herramientas de mantenimiento (reparar datos, cachés, papelera, registros, ventanas, iconos, modo seguro), Panel de diagnóstico (errores, rendimiento, FPS, informe exportable sin datos personales), Centro de bienvenida y **EISENKU OS Handbook** (25 capítulos con buscador y tutoriales).

**Educación y ciencia (7)**
- Calculadora algebraica: polinomios, derivadas, ecuaciones hasta grado 4 (raíces exactas y complejas), sistemas lineales, fracciones exactas, factorización.
- Conversor científico: bases numéricas (enteros grandes), prefijos SI, unidades científicas y constantes CODATA.
- Laboratorio de fórmulas: 54 fórmulas de física, química y matemáticas; despeja cualquier variable.
- Editor de ecuaciones: sintaxis tipo LaTeX → MathML, paleta de símbolos, exportar HTML/SVG.
- Organizador académico: materias, horario semanal, calificaciones con promedio ponderado, entregas y exámenes, recordatorios.
- Biblioteca digital: EPUB, TXT, Markdown y PDF con progreso, marcadores, tamaño de letra y temas de lectura.
- Simuladores: péndulo, tiro parabólico, ondas, órbitas y circuito RC con gráficas.

## 8. Juegos (28, en el Game Hub)

Acción: Asteroides, Tanque Defensor, Space Shooter 2D · Arcade: Rompeladrillos, Pong Neón, Pájaro Volador, Corredor del Desierto, Snake Retro · Carreras: Turbo Carretera, Circuito Nébula · Puzles: Bloques, 2048, Buscaminas, Sudoku, Memoria, Luces Fuera · Estrategia: Tres en Raya, Conecta 4, Reversi, Ajedrez · Ciencia y lógica: Torre de Hanói, Código Secreto, Simón Dice, Quiz Científico, Juego de la Vida, Cálculo Mental · Aventuras: Laberinto Sombrío, El Observatorio Perdido. Récords guardados, controles táctiles y mando.

## 9. Apps web del catálogo (60)

Accesos a servicios web que se abren en el navegador EISEN o en una pestaña real (requieren Internet y, a veces, cuenta propia): Notion, Trello, Slack, Asana, Todoist, Evernote, Obsidian, Miro, Airtable, Coda, VS Code for Web, GitHub, CodePen, Replit, StackBlitz, Hoppscotch, Regex101, DevDocs, Glitch, JSFiddle, Figma, Canva, Photopea, Excalidraw, Coolors, Piskel, Three.js Editor, SVG-Edit, Spotify, YouTube, Twitch, SoundCloud, BandLab, AudioMass, Chess.com, Lichess, Krunker, GeoGuessr, tldraw, Squoosh, CyberChef, Desmos, GeoGebra, PhET, Khan Academy, Duolingo, WolframAlpha, Stellarium, Internet Archive, Google Docs, Google Drive, Microsoft 365, Google Classroom, Gmail, Outlook, WhatsApp Web, Telegram Web, Discord, OpenStreetMap y Slither.io. Puedes añadir cualquier otra.

## 10. Idiomas (20)

Español, English, Português, Français, Deutsch, Italiano, 日本語, 한국어, 中文（简体）, 中文（繁體）, Русский, العربية (de derecha a izquierda), हिन्दी, Nederlands, Türkçe, Polski, Українська, Bahasa Indonesia, Svenska, Català. Cambio instantáneo, formatos regionales, detección y exportación de textos sin traducir. Cobertura real en [LIMITACIONES.md](LIMITACIONES.md#idiomas).

## 11. Seguridad y privacidad

Proxy aislado en origen opaco, protección SSRF, apps de terceros en sandbox con permisos, permisos por sitio, PIN con PBKDF2, bóveda cifrada, saneado de HTML, ejecución de código aislada, CSP y cabeceras de seguridad, registro de seguridad local, historial de actividad desactivable, navegación privada, copias completas validadas, puntos de restauración, comprobación de integridad. Detalle en [SEGURIDAD.md](SEGURIDAD.md).

## 12. Servidor y despliegue

`server.mjs` (Node 18+, sin dependencias): archivos estáticos con gzip y ETag, proxy en un origen separado, IA compatible con OpenAI, cabeceras de seguridad, mensajes claros de error. Mismo comportamiento en Netlify (`netlify/functions`) y Cloudflare Pages (`_worker.js` o `functions/`), generados desde `lib/`. Ver [DESPLIEGUE.md](DESPLIEGUE.md).

## 13. Para desarrolladores

- Paquetes `.eisenapp` (JSON con HTML, permisos y metadatos) con SDK por `postMessage`; ejemplo en `apps/hola-eisenku.eisenapp`.
- Arquitectura modular (`js/os9/kernel.js`, módulos por área y apps de carga diferida en `js/os9/apps/`), descrita en el Handbook (*Arquitectura del proyecto* y *Desarrollo de aplicaciones*).
- Herramientas: `tools/build-edge.mjs`, `tools/build-i18n.mjs`, `tools/build-integrity.mjs`.

---

## 14. Novedades de 10.0 NEXT GENERATION

**138 aplicaciones integradas** (las 91 de 9.0 + 47 nuevas), 20 widgets, 39 atajos personalizables, Configuración en 25 categorías. Una app es opcional (Editor hexadecimal). El estado de cada una de las 100 funciones pedidas está en `AUDITORIA_10.md` §8 y lo parcial en `INFORME_TECNICO_10.md` §3.

### 14.1 Sistema (18 apps)
| App | Qué hace |
|---|---|
| Núcleo del sistema | Resumen, módulos cargados, eventos internos, apps en memoria (liberar memoria), diagnóstico de 17 pruebas e informe |
| Monitor de recursos | Fluidez, retardo del hilo principal, memoria JavaScript y red de EISENKU con gráficas; tabla de ventanas con «Finalizar tarea» |
| Visor de eventos | Registro del sistema con filtros y exportación CSV/JSON |
| Servicios | 13 servicios internos: iniciar, detener, reiniciar y tipo de inicio |
| Administrador de inicio | Apps de inicio, orden, retardo y tiempos de arranque |
| Programador de tareas | Una vez, diaria, semanal o por intervalo; copias, limpieza, avisos, servidores, integridad, tema, bajo consumo |
| Administrador de compatibilidad | Capacidades del navegador, qué necesita cada app y modos de compatibilidad |
| Centro de actividad | Continuar donde lo dejaste, línea de tiempo y uso por app |
| Centro de recuperación | Puntos de restauración (comparar y restaurar), restablecer por partes, exportar/importar configuración |
| Comprobador de integridad | Compara cada archivo con su huella SHA-256; comprobación semanal programable |
| Inspector de hardware | Procesador, memoria, gráficos, almacenamiento, pantalla, red, batería, pruebas de pantalla y de rendimiento |
| Centro de dispositivos de entrada | Probador de teclado, ratón (detecta doble clic involuntario), táctil y lápiz |
| Centro de mandos | Botones y palancas en vivo, calibración de zona muerta, vibración, reasignación |
| Centro de dispositivos de audio | Salida, tonos de prueba izquierda/derecha/graves, vúmetro y grabación de prueba |
| Registro de periféricos | Inventario con garantía; detección por USB/HID/serie/Bluetooth donde el navegador lo permite |
| Administrador de temas | 6 temas incluidos, editor con vista previa y contraste, archivos `.eistheme` |
| Verificador de huellas | MD5, SHA-1/256/384/512 y CRC32 de archivos y textos, HMAC, archivos de sumas |
| Administrador de fuentes | Instalar TTF/OTF/WOFF/WOFF2, fuentes del equipo, comparar, mapa de caracteres |

### 14.2 Internet (8 apps)
Centro de conexiones · Diagnóstico de conectividad (9 pasos) · Servidores favoritos (historial y avisos) · Enlaces compartidos (etiquetas, caducidad, QR) · Comunicación entre dispositivos (texto y archivos por WebRTC, verificados con SHA-256) · Información de conexión segura (cabeceras y CSP) · Historial de conexiones · Privacidad del navegador (borrar por periodo o por sitio, navegación privada por defecto).

### 14.3 Educación (8 apps)
| App | Qué hace |
|---|---|
| Centro del equipo | 17 componentes: qué son, cómo funcionan, cuidados, problemas; datos reales del dispositivo; mapa y cuestionario |
| Gestor de referencias | Libros, artículos, webs…; importar por DOI, ISBN, BibTeX o RIS; colecciones; duplicados |
| Generador de bibliografía | 6 estilos en español e inglés; copiar con formato, guardar o insertar en Writer |
| Organizador de documentos académicos | Materias, entregas con fecha, archivos adjuntos, calendario y tareas |
| Simulador de circuitos | Pila, resistencia, LED, interruptor, condensador, bombilla, amperímetro y voltímetro; corriente animada; 6 ejemplos; `.eiscirc` |
| Laboratorio de física y matemáticas | Series de Fourier, vectores y fuerzas, probabilidad y estadística, círculo unitario, oscilaciones |
| Simulador de topología de red | Equipos, switches y routers; ping y traceroute animados; tabla de rutas; enlaces caídos; calculadora de subredes; `.eisnet` |
| Centro de aprendizaje de informática | 8 lecciones interactivas (binario, puertas lógicas, ordenación, búsqueda, pilas y colas, recursión, CPU, redes) con ejercicios y progreso |

### 14.4 Multimedia (7 apps)
Editor de vídeo (clips, títulos, fundidos, música) · Grabador de pantalla (con micrófono, pausa) · Visor RAW (vista previa, EXIF, histograma) · Gestor de colecciones (libros, películas, juegos…; préstamos; CSV) · Reproductor con subtítulos (SRT/VTT, desfase, estilos, repetición A-B) · Biblioteca de podcasts (RSS, velocidad, progreso, OPML) · Centro multimedia (interfaz de sala para TV y mando).

### 14.5 Productividad y desarrollo (6 apps)
| App | Qué hace |
|---|---|
| Pizarra interactiva | Lienzo infinito: lápiz con presión, formas, flechas, texto, notas; PNG, SVG y `.eisboard` |
| Ideas rápidas | Captura con etiquetas y dictado; convertir en tarea, nota, evento o documento |
| Conversor universal de formatos | Imágenes (PNG, JPEG, WebP, AVIF, BMP, ICO), datos (CSV, TSV, JSON, XML, YAML, Markdown, HTML, SQL), 22 operaciones de texto y codificación, documentos (Word, Markdown, HTML, texto, PDF) y audio (WAV, Opus) |
| Editor hexadecimal (opcional) | Insertar y sobrescribir, deshacer, búsqueda de texto y bytes con comodines, inspector de datos |
| Calculadora de programación | 8–64 bits con y sin signo, 4 bases, operaciones de bits y rotaciones, bits pulsables, IEEE 754 |
| Generador de diagramas técnicos | Texto → diagrama de flujo, secuencia, clases o red; SVG y PNG; `.eisdiag` |

### 14.6 Escritorio, accesibilidad, Archivos y Configuración
- **Escritorio:** diseños de ajuste, vista de ventanas, paneles laterales, widgets nuevos (tareas, nota adhesiva, temporizador, reloj mundial, rendimiento, portapapeles, foto, cuenta atrás, batería, ideas, lanzador, escritorios y calculadora), fondo y nombre por escritorio, perfiles de pantalla.
- **Accesibilidad:** lector de pantalla, lupa, 4 contrastes, filtros de color, teclas especiales, localizar el puntero, teclado en pantalla, navegación con mando, perfiles de accesibilidad.
- **Archivos 10.0:** doble panel, vista rápida, etiquetas, búsqueda en el contenido, filtros guardados, comparar, metadatos, comprimir selección.
- **Configuración:** Personalización, Escritorio, Ventanas y multitarea, Notificaciones, Aplicaciones, Tienda, Navegador, Asistente, Archivos y almacenamiento, Red, Dispositivos, Pantalla, Audio, Teclado, Mando, Accesibilidad, Idioma, Fecha y hora, Privacidad, Seguridad, Cuentas, Rendimiento, Copias de seguridad, Recuperación, Actualizaciones, Opciones de desarrollador, Configuración avanzada, Sistema y Acerca de.

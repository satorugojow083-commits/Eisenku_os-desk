/* EISENKU OS 9.0 · EISENKU OS HANDBOOK: guía oficial integrada (26 capítulos en 10.0), con índice, categorías,
   buscador, ejemplos, botones para probar cada función y tutoriales interactivos sobre la interfaz real.
   Marcadores especiales en el texto: [[tour:id|Texto]] lanza un tutorial, [[open:app|arg|Texto]] abre una app,
   [[keys]] inserta la tabla de atajos real del sistema. */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)];
  const CATS = [['start', 'Empezar', 'sparkle'], ['use', 'Usar EISENKU', 'grid'], ['custom', 'Personalizar', 'palette'], ['protect', 'Proteger tus datos', 'shield'], ['help', 'Ayuda y referencia', 'help'], ['dev', 'Desarrolladores', 'code']];
  const C = (id, cat, title, md) => ({ id, cat, title, md });
  const CH = [
    C('intro', 'start', 'Introducción', `EISENKU OS es un **sistema de escritorio completo que funciona dentro del navegador**. No se instala en tu equipo ni sustituye a tu sistema operativo: es una aplicación web que ofrece ventanas, escritorio, apps, archivos y configuración, y que guarda tus datos **solo en este navegador**.

La edición **10.0 NEXT GENERATION** suma 47 apps nuevas (sistema, hardware, redes, oficina, multimedia, herramientas y educación), Configuración en 25 categorías y el Centro del equipo; el capítulo «Novedades de 10.0» las resume. La edición **9.0 ENTERPRISE** añadió dos escritorios completos (Linux Mode y Windows Mode), más de 45 apps nuevas, el EISENKU App Center, un navegador mejorado, 20 idiomas, seguridad reforzada, copias de seguridad completas y este Handbook.

### Dónde funciona
- PC con Chrome, Edge, Firefox o Safari recientes.
- Tablets y móviles Android o iOS (interfaz táctil).
- Xbox con el navegador Microsoft Edge (se puede usar con el mando).

### Cómo leer este Handbook
Usa el índice de la izquierda o el buscador. Los botones verdes abren la función de la que se habla o inician un **tutorial interactivo** que te guía sobre la interfaz real. Pulsa **F1** en cualquier app para abrir su capítulo.

[[open:welcome||Abrir el Centro de bienvenida]]`),
    C('prime', 'start', 'EISEN OS PRIME 11.0', `**EISEN OS PRIME 11.0** (eisen_osprime) conserva todo lo de 10.0 y añade **205 funciones nuevas**. Las tienes todas, con su estado en este dispositivo, en **Centro PRIME › Funciones PRIME**.

### Lo más importante
- **Descargas dentro de EISEN.** Si tu dispositivo no permite descargar (Xbox, TV, navegadores dentro de apps), todo lo que descargas se guarda en EISEN y se abre aquí: imágenes, música, vídeo, PDF, textos, ZIP y paquetes. Pega cualquier enlace en **Descargas** para bajarlo dentro de EISEN.
- **Instalar = escritorio + Inicio.** Al instalar una app desde el App Center aparece sola en el escritorio y en el menú Inicio, y queda en el **registro de apps** (fecha, método, usos).
- **Instalación virtual.** Las apps web se abren con el método que funciona en tu dispositivo: ventana de app EISEN, navegador EISEN o ventana real (por ejemplo WhatsApp, que no permite mostrarse dentro de otras páginas).
- **Tus datos no se pierden.** Una copia de todo vive también en IndexedDB (espejo PRIME): repara ajustes dañados, recupera tu entorno si el navegador borra los datos y permite **deshacer cambios**.
- **Transferir.** Lleva tu entorno a otra pestaña, navegador, perfil, móvil, tableta o Xbox con **código**, **QR animado**, **archivo .eisenenv** (con contraseña opcional) o por la **red local** con un código de un solo uso.
- **Mando y Xbox.** Cursor virtual (Ctrl+Alt+G), vibración, barra de ayuda de botones, Lanzador TV y configuración automática la primera vez.
- **Táctil.** Desliza desde abajo para ver las apps abiertas, desde la izquierda para los widgets y desde la derecha para las notificaciones; mantén pulsado para el menú contextual.
- **Paleta de comandos:** Ctrl+Mayús+Espacio.

### Si algo falla
Abre **Centro PRIME › Salud y reparación**. Si EISEN no arranca, abre la **página de recuperación** (recovery.html) o añade ?safe=1 a la dirección.

[[open:primecenter||Abrir el Centro PRIME]] [[open:downloads||Abrir Descargas]] [[open:transfer||Transferir mi entorno]]`),
    C('v10', 'start', 'Novedades de 10.0', `EISENKU OS 10.0 NEXT GENERATION conserva todo lo de 9.0 y añade **47 apps** que se descargan solo la primera vez que las abres. Todas se pueden desinstalar y reinstalar desde el App Center.

### Sistema y mantenimiento
- [[open:syscore||Núcleo del sistema]] · [[open:resmon||Monitor de recursos]] · [[open:eventviewer||Visor de eventos]] · [[open:services||Servicios]] · [[open:startup||Administrador de inicio]]
- [[open:scheduler||Programador de tareas]]: copias, avisos, limpieza o cambios de tema a una hora concreta.
- [[open:recovery||Centro de recuperación]] y [[open:modcheck||Comprobador de integridad]].

### Tu equipo
- [[open:computercenter||Centro del equipo]]: qué hace cada componente (CPU, GPU, RAM, SSD…) y los datos reales de tu dispositivo.
- [[open:hwinspect||Inspector de hardware]], [[open:inputcenter||Centro de entrada]] (teclado, ratón, táctil y lápiz), [[open:gamepads||Mandos]], [[open:audiodev||Dispositivos de audio]] y [[open:peripherals||Periféricos]].

### Redes
- [[open:conncenter||Centro de conexión]], [[open:netdiag||Diagnóstico de red]], [[open:servers||Servidores favoritos]], [[open:sharelinks||Enlaces compartidos]] y [[open:devcomm||Comunicación entre dispositivos]].

### Oficina, estudio y multimedia
- [[open:refs||Gestor de referencias]] y [[open:bibgen||Generador de bibliografía]] (citas en Writer), [[open:docorg||Organizador académico]], [[open:ideas||Ideas rápidas]] y [[open:whiteboard||Pizarra]].
- [[open:videoeditor||Editor de vídeo]], [[open:screenrec||Grabador de pantalla]], [[open:subplayer||Reproductor con subtítulos]], [[open:podcasts||Podcasts]] y [[open:mediacenter||Centro multimedia]] para TV y mando.

### Herramientas
- [[open:fconvert||Conversor universal]]: imágenes (PNG, JPEG, WebP, BMP, ICO), datos (CSV, JSON, XML, YAML, Markdown, SQL), codificaciones, documentos (Word, Markdown, HTML, PDF) y audio (WAV, Opus).
- [[open:hashcheck||Verificador de huellas]], [[open:hexedit||Editor hexadecimal]], [[open:fonts||Administrador de fuentes]], [[open:progcalc||Calculadora de programación]] y [[open:diagrams||Generador de diagramas]] (texto → SVG).

### Ciencia y educación
- [[open:circuits||Simulador de circuitos]]: tensiones y corrientes calculadas con análisis nodal, LED que se funden y condensadores que se cargan.
- [[open:mathlab||Laboratorio de física y matemáticas]], [[open:nettopo||Simulador de redes]] y [[open:cslearn||Centro de aprendizaje de informática]] con 8 lecciones y ejercicios.

### Personalización
- [[open:thememgr||Administrador de temas]] con archivos .eistheme para compartir, paquetes de iconos, paneles laterales, widgets y escritorios virtuales en Configuración.

Los archivos nuevos (.eistheme, .eisboard, .eisdiag, .eiscirc, .eisnet) se abren con doble clic o con «Abrir con» en Archivos.`),
    C('first', 'start', 'Primeros pasos', `### Abrir una app
En **Windows Mode** pulsa el botón de inicio de la barra de tareas; en **Linux Mode** pulsa **Aplicaciones** en el panel superior. Escribe el nombre de la app y pulsa Intro.

### Manejar ventanas
- Arrastra la barra de título para moverla; doble clic para maximizar.
- Arrastra una ventana a un borde para ajustarla a media pantalla.
- Los botones de la esquina minimizan, maximizan o cierran.
- Cambia el tamaño desde bordes y esquinas.

### Buscar cualquier cosa
**Ctrl+K** abre la búsqueda global: apps, archivos, ajustes, pestañas del navegador y cálculos rápidos (escribe \`=2+2*3\`).

[[tour:apps|Tutorial: abrir apps y manejar ventanas]] [[tour:search|Tutorial: búsqueda global]]`),
    C('setup', 'start', 'Configuración inicial', `La primera vez que abres EISENKU 9.0 aparece un **asistente** de cuatro pasos:

1. **Idioma** — 20 idiomas disponibles.
2. **Escritorio** — Linux Mode o Windows Mode.
3. **Aspecto** — tema y color de acento.
4. **Perfil** — tu nombre y, si quieres, un **PIN** de 4 a 12 cifras.

Puedes repetirlo cuando quieras desde el Centro de bienvenida. Todo lo que eliges se puede cambiar después en **Configuración**.

> Si vienes de EISENKU 8.0, tus archivos, notas y ajustes se conservan. Las migraciones de datos se registran y pueden revertirse en el Centro de actualizaciones.

[[open:welcome||Volver a abrir el asistente desde el Centro de bienvenida]]`),
    C('modes', 'start', 'Diferencias entre Linux Mode y Windows Mode', `Los dos modos son **interfaces de escritorio simuladas** con los mismos datos: cambia la organización, no tu información.

| | Windows Mode | Linux Mode |
|---|---|---|
| Barra principal | Barra de tareas abajo | Panel superior + dock |
| Abrir apps | Menú Inicio | Lanzador «Aplicaciones» |
| Ventanas y escritorios | Vista de tareas | «Actividades» |
| Reloj y notificaciones | Bandeja (derecha) | Centro del panel |
| Fondo por defecto | EISENKU Noir | Jade |

Para cambiar: **Configuración › Entorno Linux / Windows**. Cada modo recuerda su propio fondo de pantalla. El modo elegido se recuerda al volver a abrir EISENKU.

[[tour:env|Tutorial: cambiar de modo]] [[open:settings|env|Abrir Configuración › Entorno]]`),
    C('desktop', 'use', 'Escritorio', `El escritorio muestra accesos directos, carpetas y widgets.

- **Clic derecho** (o pulsación larga) en el escritorio: crear carpeta, documento u hoja, cambiar fondo, ordenar iconos, widgets y **Vista general**.
- **Widgets**: reloj, agenda, tiempo y otros. Se activan en Configuración › Personalización.
- **Escritorios virtuales**: separa tus ventanas por tareas. Ctrl+Alt+← y → cambian de escritorio; Ctrl+Alt+↑ abre la vista general.
- **Modo concentración**: silencia notificaciones y bloquea las apps que elijas durante un tiempo.

[[tour:desks|Tutorial: escritorios virtuales]]`),
    C('start', 'use', 'Menú de inicio', `En Windows Mode, el menú de inicio tiene un buscador, las apps fijadas, las recientes y accesos a carpetas. Puedes fijar apps con clic derecho. En Linux Mode, el lanzador **Aplicaciones** muestra las apps por categorías con búsqueda.

Desde el botón de usuario puedes **bloquear la sesión**, **cambiar de usuario** o reiniciar la interfaz.

[[tour:apps|Tutorial: menú y ventanas]]`),
    C('apps', 'use', 'Aplicaciones', `EISENKU incluye apps de 8.0 (Writer, Sheets, PDF Studio, Notas, Calendario, Música, Juegos…) y más de 45 apps 9.0 que **se descargan solo al abrirlas**, para que el arranque sea rápido:

- **Productividad**: Editor Markdown, PDF Creator, Gestor de proyectos, Organizador de apuntes, Gestor de contraseñas, Escáner.
- **Internet**: Descargas, Marcadores, Historial, Pestañas, Centro de privacidad, Correo, Chat P2P, Videollamadas (Jitsi).
- **Multimedia**: Visor de imágenes, Editor de audio, Administrador multimedia.
- **Desarrollo**: Editor de código, Editor JSON, Consola, Explorador de proyectos, Validador HTML, Formateador, Fragmentos, Generador de documentación, Entorno de pruebas.
- **Sistema**: Monitor de almacenamiento, Administrador de apps, Actualizaciones, Permisos, Red, Dispositivos, Información, Sesiones, Seguridad, Mantenimiento, Diagnóstico.
- **Educación y ciencia**: Calculadora algebraica, Conversor científico, Laboratorio de fórmulas, Editor de ecuaciones, Organizador académico, Biblioteca digital, Simuladores.

### Oficina
- **EISEN Writer** guarda documentos en Archivos como **Word (.docx)**, página web (.html) o texto (.txt) y abre también .md. Tiene estilos (Título 1-3, Cita, Código), fuentes, tamaños, colores y resaltado, listas con sangría (Tab dentro de una lista), tablas, imágenes, enlaces (**Ctrl + clic** para abrirlos), **buscar y reemplazar** (Ctrl+F / Ctrl+H), recuento de palabras y **guardado automático** en Archivos (menú Archivo). El texto que pegas desde otras páginas se limpia: no entran scripts, eventos ni estilos peligrosos. **Ctrl+P** imprime o guarda como PDF.
- **EISEN Sheets** calcula fórmulas con rangos (\`=SUMA(A1:C5)\`), operadores (+ − * / ^ % &), comparaciones y más de 40 funciones con nombre en español o en inglés (SI, SI.ERROR, SUMAR.SI, CONTAR.SI, PROMEDIO.SI, BUSCARV, REDONDEAR, TEXTO, HOY…; botón **ƒx Funciones**). Puedes pegar bloques copiados de otra hoja de cálculo, moverte con Enter y las flechas, y **abrir y guardar CSV** en Archivos. Al guardar, cada fórmula se escribe con un apóstrofo delante (\`'=SUMA(...)\`) para que otros programas no la ejecuten al abrir el CSV; EISEN Sheets la recupera al volver a abrirlo.
- **Códigos QR** se generan en tu dispositivo (los datos no se envían a ningún servicio): texto, enlaces, Wi-Fi, contactos, correo, teléfono y SMS, con nivel de corrección y colores; se descargan en PNG o SVG o se guardan en Archivos.

Algunas apps usan servicios externos y lo indican: Videollamadas (Jitsi Meet), Correo (tu app o webmail), Clima, Mapas, Traductor y la IA de Domingo.

[[open:appmanager||Abrir el Administrador de aplicaciones]]`),
    C('install', 'use', 'Instalación de aplicaciones', `El **EISENKU App Center** permite instalar, desinstalar y restaurar apps, ver novedades, versiones y permisos, y marcar favoritas.

### Apps de terceros
Puedes instalar paquetes **.eisenapp** (JSON con HTML) o añadir **apps web** por URL https. Las apps de terceros:
- se ejecutan **aisladas** (iframe *sandbox* con origen opaco): no pueden leer tus archivos ni ajustes;
- solo usan los **permisos que aceptas** al instalarlas (notificaciones, almacenamiento propio, archivos que tú elijas, portapapeles, red);
- se pueden revocar en el Administrador de permisos.

Desinstalar una app conserva sus datos por si la reinstalas. Para borrarlos usa *Restablecer datos* en el Administrador de aplicaciones.

[[open:appcenter||Abrir el App Center]]`),
    C('files', 'use', 'Explorador de archivos', `**Archivos** guarda tus documentos en el almacenamiento del navegador (IndexedDB). Raíces: Documentos, Imágenes, Música, Vídeos y Descargas.

- Vistas de **cuadrícula** y **lista**, orden por nombre, fecha, tamaño o tipo.
- **Copiar, cortar, pegar, renombrar, mover**, arrastrar entre carpetas.
- **Papelera** con restauración. **Favoritos** y búsqueda.
- **Abrir con…** y apps predeterminadas por tipo.
- **Importar** archivos o carpetas completas, descargar por URL y **exportar a ZIP** (también extraer ZIP).
- Límite por archivo: 512 MB.

> EISENKU no tiene acceso ilimitado al disco de tu dispositivo: solo a lo que importas o eliges tú. El espacio lo decide el navegador (míralo en el Monitor de almacenamiento).

[[tour:files|Tutorial: archivos]] [[open:explorer||Abrir Archivos]]`),
    C('folders', 'use', 'Gestión de carpetas', `- **Nueva carpeta**: botón de la barra o clic derecho. Se pueden anidar sin límite práctico.
- **Mover**: arrastra la carpeta a otra del panel lateral o usa Cortar/Pegar.
- **Renombrar y eliminar**: clic derecho. Eliminar envía el contenido a la papelera.
- **Favoritas**: estrella para tenerlas en el panel lateral.
- **Comprimir**: exporta una carpeta completa como ZIP para guardarla fuera del navegador.

Consejo: organiza por proyectos (por ejemplo *Documentos › Escuela › Matemáticas*) y usa la búsqueda para encontrar por nombre.`),
    C('browser', 'use', 'Navegador', `El **Navegador EISEN** tiene pestañas, tres perfiles (Web, Privado y Nova), historial, marcadores, descargas y lectura.

### Cómo carga las páginas
Muchas webs no se dejan mostrar dentro de otra página. EISENKU prueba, en este orden: **Directo**, el **proxy propio** de tu servidor (si abriste EISENKU con INICIAR.bat, Netlify o Cloudflare) y el **modo compatibilidad**. Las páginas que pasan por el proxy se **aíslan**: no pueden leer tus datos. Los inicios de sesión de algunos sitios (Google, bancos…) no funcionan dentro del proxy: usa *Abrir en pestaña real*.

### Funciones 9.0
- **Escudo** junto a la dirección: información del sitio y **permisos por sitio** (cámara, micrófono, ubicación…).
- Buscador configurable y página de inicio.
- **Ctrl+Shift+T** reabre la última pestaña cerrada; **Ctrl+J** descargas; **Ctrl+Shift+B** marcadores.
- Ventanas emergentes controladas y modo oscuro forzado.
- **Navegación privada** (Ctrl+Shift+N): no guarda historial ni datos de sitios, pero **no te hace anónimo** ante tu red o los sitios.

No es posible garantizar que todos los sitios funcionen dentro de EISENKU.

[[open:browser||Abrir el Navegador]]`),
    C('terminal', 'use', 'Terminal', `La Terminal trabaja con tus **archivos reales** de EISENKU. Comandos principales:

\`\`\`
help        lista de comandos
ls  cd  pwd tree        navegar
mkdir touch write       crear carpetas y archivos
cat  mv  cp  rm         ver, mover, copiar y borrar
du                      tamaño de carpetas
ping https://ejemplo.com   latencia HTTP real
calc 2^10 + sqrt(16)    calculadora segura
open <url|app>          abrir
services [start|stop|restart <id>]   servicios (10.0)
sched [run <id>]        tareas programadas (10.0)
events [n] [error]      últimos eventos (10.0)
hash <archivo> [sha256] huella de un archivo (10.0)
sysinfo10               resumen técnico (10.0)
theme [nombre]          temas (10.0)
\`\`\`

\`rm\` envía a la papelera. La Terminal no ejecuta programas de tu sistema operativo: es un intérprete propio de EISENKU.

[[open:terminal||Abrir la Terminal]]`),
    C('custom', 'custom', 'Personalización', `En **Configuración** tienes:
- **Temas** (Noir, Rosé Graphite, Aurora, Blueprint, Jade, Porcelana claro, Clásico 8.0), color de acento y fondos.
- **Densidad**, radio de las esquinas, efecto cristal, tamaño de la interfaz y del texto.
- **Barra de tareas**: alineación, dock, ocultación automática.
- **Accesibilidad**: alto contraste, reducir movimiento, foco visible, fuente para dislexia, luz nocturna.
- **Sonidos**, notificaciones por app y modo concentración.
- **Atajos de teclado** personalizables.
- **Modo de bajo consumo** para tablets, móviles y Xbox.

[[open:settings|appearance|Abrir Apariencia]]`),
    C('lang', 'custom', 'Idiomas', `EISENKU ofrece **20 idiomas**: español, inglés, portugués, francés, alemán, italiano, japonés, coreano, chino simplificado y tradicional, ruso, árabe, hindi, neerlandés, turco, polaco, ucraniano, indonesio, sueco y catalán.

- Se cambia en **Configuración › Idiomas y región** y se recuerda.
- Las fechas, horas y números siguen el formato regional (puedes elegir región y formato de 12/24 h).
- El **árabe** se muestra de derecha a izquierda (RTL).
- Si alguna frase aún no está traducida, se muestra en inglés (o en español). En *Idiomas* puedes ver la **cobertura** de cada idioma y exportar las frases que faltan para completarlas.

[[open:settings|lang|Abrir Idiomas y región]]`),
    C('privacy', 'protect', 'Privacidad', `- Todo se guarda **en este navegador**. EISENKU no tiene cuentas en la nube, no envía estadísticas y no incluye rastreadores.
- Se conecta a Internet solo cuando usas algo que lo necesita (navegar, Clima, Mapas, Noticias, Traductor, Videollamadas, IA).
- El **proxy** (si lo usas) ve las direcciones que visitas: es tu servidor o uno que tú configures.
- La **IA de Domingo** envía tus preguntas al proveedor configurado en el servidor (o a Puter.js si lo eliges).
- El **Centro de privacidad** muestra qué hay guardado, el historial de actividad y permite borrarlo por categorías o exportarlo.

[[open:privacy||Abrir el Centro de privacidad]]`),
    C('security', 'protect', 'Seguridad', `Protecciones de EISENKU 9.0:
- **PIN por perfil** (PBKDF2) con bloqueo temporal tras 5 intentos y **bloqueo automático** por inactividad.
- **Gestor de contraseñas** cifrado con AES-256-GCM.
- Páginas del proxy y apps de terceros **aisladas** (sandbox); permisos por app y por sitio.
- Servidor con protección contra **SSRF** (bloquea redes internas), límites de uso, cabeceras de seguridad y **código de acceso** opcional para la IA.
- **Política de seguridad de contenido (CSP)**, saneado de HTML y validación de archivos.
- **Registro de eventos de seguridad** y **Centro de seguridad** con puntuación y recomendaciones.

> Limitación honesta: la CSP permite scripts en línea porque gran parte del código de 8.0 los usa; el resto de protecciones compensa ese riesgo.

[[open:security||Abrir el Centro de seguridad]]`),
    C('backup', 'protect', 'Copias de seguridad', `### Copia completa
**Configuración › Copias de seguridad › Crear copia** genera un único archivo JSON con tus ajustes, datos de apps **y archivos**. Guárdalo fuera del navegador (USB, nube…). Al restaurar se valida su contenido y su suma de control.

### Puntos de restauración
Guardan tus ajustes y datos de apps (no los archivos) en el propio navegador. Se crean automáticamente antes de operaciones delicadas (migraciones, restablecer datos, reparar) y puedes crearlos a mano en el **Centro de actualizaciones**.

### Exportar e importar
Además puedes exportar carpetas como ZIP, marcadores en HTML estándar, fragmentos de código en JSON y el registro de seguridad.

[[open:settings|backup|Abrir Copias de seguridad]] [[open:updates|points|Puntos de restauración]]`),
    C('trouble', 'help', 'Solución de problemas', `| Problema | Solución |
|---|---|
| Una app no abre o muestra un error | Pulsa *Reintentar*. Si sigue, mira el **Panel de diagnóstico**. |
| Todo va lento | Activa el **modo de bajo consumo** (Configuración › Rendimiento) y cierra apps que no uses. |
| Una página no carga en el navegador | Cambia el modo de carga desde el escudo o usa *Abrir en pestaña real*. |
| «Almacenamiento lleno» | Vacía la papelera y revisa el **Monitor de almacenamiento**. |
| Datos que dan error | **Herramientas de mantenimiento › Reparar datos dañados**. |
| La interfaz se comporta raro o no arranca | **Reiniciar en modo seguro** desde Herramientas de mantenimiento, o abre la dirección con **?safe=1** al final (sin apps de inicio ni ventanas restauradas). |
| Olvidé el PIN | Tras 5 intentos se bloquea unos minutos. Si no lo recuerdas, otro perfil puede eliminar el tuyo o puedes restablecer EISENKU desde una copia. |
| La IA no responde | Revisa en Configuración de red si el servidor de IA está activo y si hace falta código de acceso. |

[[open:diagnostics||Panel de diagnóstico]] [[open:maintenance||Herramientas de mantenimiento]]`),
    C('keys', 'help', 'Atajos de teclado', `Estos son los atajos actuales de tu sistema (puedes cambiarlos en Configuración):

[[keys]]

Además, en el Navegador: **Ctrl+T** nueva pestaña, **Ctrl+W** cerrar, **Ctrl+Shift+T** reabrir, **Ctrl+L** dirección, **Ctrl+1…9** ir a pestaña, **Ctrl+J** descargas. En los editores: **Ctrl+S** guardar, **Ctrl+F** buscar, **Ctrl+Z / Ctrl+Y** deshacer y rehacer. En Writer, además: **Ctrl+H** reemplazar, **Ctrl+O** abrir, **Ctrl+Shift+S** guardar como y **Ctrl+P** imprimir o PDF. En Sheets: **Enter** baja una celda y las **flechas** mueven la selección. **F1** abre la ayuda de la app activa.`),
    C('faq', 'help', 'Preguntas frecuentes', `**¿EISENKU es un sistema operativo de verdad?** No. Es una aplicación web que simula un escritorio completo dentro de tu navegador.

**¿Dónde están mis archivos?** En el almacenamiento del navegador de este dispositivo. Si borras los datos del sitio, se pierden: haz copias.

**¿Puedo usarlo en varios dispositivos?** Sí, pero cada uno tiene sus propios datos. Pásalos con una copia de seguridad completa.

**¿Funciona sin Internet?** Sí, si lo abriste antes por http(s): el modo sin conexión guarda una copia. Las funciones online (navegar, clima, IA…) necesitan conexión.

**¿Por qué algunas webs no cargan?** Muchos sitios prohíben mostrarse dentro de otras páginas. El proxy ayuda, pero no todo es posible.

**¿Puedo crear mis propias apps?** Sí: lee *Desarrollo de aplicaciones*.`),
    C('req', 'help', 'Requisitos del sistema', `- **Navegador**: Chrome/Edge 100+, Firefox 110+ o Safari 16+. En Xbox, Microsoft Edge.
- **Memoria**: 2 GB recomendados; con menos, activa el modo de bajo consumo.
- **Almacenamiento**: el que conceda el navegador (suele ser una parte del espacio libre).
- **Para el proxy y la IA**: abrir EISENKU con **INICIAR.bat / INICIAR.sh** (Node.js 18+) o publicarlo en **Netlify** o **Cloudflare Pages**.
- Algunas funciones dependen del navegador (cámara, carpetas del dispositivo, WebRTC, compresión…). La app **Información del sistema** muestra la compatibilidad de tu dispositivo.

[[open:sysinfo||Ver la compatibilidad de este dispositivo]]`),
    C('limits', 'help', 'Limitaciones conocidas', `Para ser transparentes:
- EISENKU no puede acceder libremente al disco ni ejecutar programas de tu sistema operativo.
- No todos los sitios web funcionan dentro del navegador integrado; los inicios de sesión de algunos servicios fallan dentro del proxy.
- La navegación privada no da anonimato.
- **Idiomas**: el español es el idioma original y está completo. En inglés está traducida la mayor parte de la interfaz del sistema (escritorio, Configuración, Archivos, App Center, navegador). En los otros 18 idiomas se traduce el núcleo (menús, botones, apartados de Configuración, Archivos y nombres de apps) y el resto aparece en inglés (en catalán, en español). El contenido interno de muchas apps 9.0 sigue en español. *Configuración › Idioma* muestra la cobertura real y exporta los textos que faltan.
- **Oficina**: Writer abre .docx, .html, .txt y .md (no .doc, .odt ni .rtf); de un .docx conserva texto, formato, listas, tablas, enlaces e imágenes, pero no encabezados, pies de página, notas, comentarios ni control de cambios. Sheets abre y guarda CSV (no .xlsx) y trabaja con una hoja de hasta 2.000 filas × 26 columnas.
- La CSP permite scripts en línea por compatibilidad con 8.0.
- Los permisos de cámara/micrófono/ubicación de las apps integradas se atribuyen a la ventana activa.
- El Correo no lee tu bandeja: redacta y envía con tu app o webmail.
- Las videollamadas dependen de Jitsi Meet (servicio externo).
- El tamaño máximo por archivo es de 512 MB y la cuota total la decide el navegador.
- **10.0 · Hardware**: el navegador no deja leer la temperatura, el uso real de CPU o GPU, la RAM física ocupada ni los procesos del sistema operativo. El Centro del equipo y el Inspector muestran solo datos reales que el navegador expone (núcleos lógicos, memoria aproximada redondeada, GPU si WebGL la informa, batería, pantalla, red) y dicen claramente lo que no se puede medir.
- **10.0 · Formatos**: el Conversor no crea MP3 (los navegadores no incluyen ese codificador): ofrece WAV y Opus. El YAML admite el subconjunto habitual (mapas, listas, comillas, bloques | y >), no anclas ni etiquetas. De las fuentes WOFF2 no se puede leer el nombre interno (usan Brotli) y se toma del nombre del archivo.
- **10.0 · Simuladores**: el simulador de circuitos usa modelos ideales (pila con 0,1 Ω interna, LED por tramos, condensador con Euler implícito); el de redes simplifica el enrutamiento (rutas por Dijkstra y una regla de puerta de enlace) y no simula ARP, VLAN ni NAT.
- **10.0 · Traducción**: las apps nuevas de 10.0 están escritas en español; en otros idiomas aparecen en español salvo los textos comunes. Configuración › Idioma › «Textos sin traducir» exporta la lista para traducirla.`),
    C('updates', 'help', 'Actualizaciones', `EISENKU **no se actualiza solo** ni descarga código de fuentes desconocidas. La versión la decide quien publica tu copia (tu carpeta, Netlify o Cloudflare).

- El **Centro de actualizaciones** comprueba la versión publicada en tu servidor y muestra las novedades.
- Antes de aplicar migraciones de datos se crea un **punto de restauración**; cada migración se puede **revertir**.
- **Comprobar integridad** compara los archivos del sistema con sus huellas SHA-256 (integrity.json).
- En el App Center, las apps mejoradas aparecen en *Actualizaciones* con sus notas.

[[open:updates||Abrir el Centro de actualizaciones]]`),
    C('dev', 'dev', 'Desarrollo de aplicaciones', `Puedes crear apps para EISENKU como **paquetes .eisenapp**: un archivo JSON con este formato:

\`\`\`json
{
  "eisenapp": 1,
  "id": "mi-app",
  "name": "Mi app",
  "version": "1.0.0",
  "author": "Tu nombre",
  "description": "Qué hace",
  "icon": "🚀",
  "category": "Productividad",
  "permissions": ["notifications", "storage", "files"],
  "width": 640, "height": 480,
  "html": "<h1>Hola</h1><script>eisen.notify('Hola', 'Funciona')</script>"
}
\`\`\`

La app se ejecuta aislada y usa el **SDK \`window.eisen\`** (todas las funciones devuelven promesas):
- \`eisen.notify(titulo, texto)\`
- \`eisen.storage.get/set/keys/remove\` — almacenamiento propio (1 MB)
- \`eisen.files.open()\` y \`eisen.files.save(nombre, contenido, tipo)\` — solo con el permiso *files* y eligiendo tú
- \`eisen.clipboard.write(texto)\`, \`eisen.open(urlHttps)\`, \`eisen.theme()\`, \`eisen.info()\`

Con el permiso *network* la app puede conectarse a https. Sin él, no tiene red. Hay un ejemplo completo en \`apps/hola-eisenku.eisenapp\`.

Para probar código JavaScript rápido usa la **Consola de desarrollo** o el **Entorno de pruebas**.

[[open:appcenter||Instalar un paquete en el App Center]] [[open:devconsole||Consola de desarrollo]]`),
    C('arch', 'dev', 'Arquitectura del proyecto', `\`\`\`
index.html              escritorio y ventanas de 8.0
css/                    styles, eisenku8 (8.0), eisenku9 (9.0), apps9 (apps 9.0)
js/*.js                 núcleo 8.0 (app, core, shell, apps, juegos, Domingo…)
js/os9/boot.js          identidad, perfiles, migraciones, región (antes de todo)
js/os9/kernel.js        bus de eventos, preferencias, permisos, copias, integridad, UI
js/os9/shell9.js        escritorios, vista general, notificaciones, búsqueda, widgets, inicio de sesión
js/os9/settings9.js     configuración (22 apartados)
js/os9/files9.js        Archivos 9.0, ZIP, «Abrir con», Terminal real
js/os9/appcenter.js     App Center y paquetes de terceros
js/os9/browser9.js      ampliaciones del navegador
js/os9/office9.js       Writer 9.0, Sheets 9.0 (fórmulas, CSV) y controles de música
js/os9/docx.js          Word (.docx) ⇄ HTML, bajo demanda · js/os9/qrcode.js  códigos QR sin conexión
js/os9/catalog9.js      manifiestos de las apps 9.0 (carga diferida)
js/os9/apps/*.js        módulos de las apps 9.0
js/os9/i18n9.js + i18n/ 20 idiomas
js/os9/start9.js        arranque, asistente y tutoriales
lib/*.mjs               proxy, IA y seguridad (una sola fuente)
server.mjs              servidor local · tools/build-edge.mjs genera Netlify/Cloudflare
tools/build-i18n.mjs    paquetes de idioma · tools/build-integrity.mjs  integrity.json
docs/                   changelog, funciones, limitaciones, seguridad, despliegue, pruebas
\`\`\`

**10.0:** el núcleo nuevo está en \`js/os10/core10.js\` (eventos, servicios, programador), el escritorio y la accesibilidad en \`shell10.js\` y \`a11y10.js\`, y las 47 apps nuevas en \`js/os10/apps/*.js\` con sus manifiestos en \`catalog10.js\`; usan el mismo mecanismo que las de 9.0.

Las apps 9.0 se registran con \`K.app(manifiesto)\` y su código con \`K.define(id, { init(cuerpo, ventana, arg) })\`; el módulo se descarga la primera vez que se abre. Todo el estado se guarda con el prefijo \`eisen_\` en localStorage y los archivos en IndexedDB.`)
  ];
  const APPMAP = { explorer: 'files', terminal: 'terminal', browser: 'browser', settings: 'custom', appcenter: 'install', appmanager: 'install', security: 'security', passwords: 'security', privacy: 'privacy', updates: 'updates', maintenance: 'trouble', diagnostics: 'trouble', welcome: 'first', downloads: 'browser', bookmarks: 'browser', history: 'browser', tabsmgr: 'browser', storagemon: 'files', sysinfo: 'req', devconsole: 'dev', testlab: 'dev', codeeditor: 'dev', sessions: 'desktop', permissions: 'security' };
  const norm = s => K.norm(s);
  K.handbookChapters = CH;
  K.define('handbook', {
    init(b, w, arg) {
      const st = { cur: (get9('hb_last') || 'intro'), q: '' };
      function get9(k) { return S.get('a9_' + k, null); }
      b.innerHTML = `<div class="k9 a9-hb"><div class="k9-split" style="grid-template-columns:260px 1fr"><aside class="k9-side"><div class="a9-hb-brand">${I('book', 18)} <b>EISENKU OS Handbook</b></div><input class="input-text" data-q placeholder="${esc(tr('Buscar en el Handbook…'))}" aria-label="${esc(tr('Buscar en el Handbook'))}"><nav data-toc></nav></aside><main class="k9-main" data-main></main></div></div>`;
      const main = q(b, '[data-main]');
      function toc() {
        const read = S.get('a9_hb_read', []) || [];
        q(b, '[data-toc]').innerHTML = CATS.map(([c, l, ic]) => `<h6>${I(ic, 12)} ${esc(tr(l))}</h6>` + CH.map((x, i) => [x, i]).filter(([x]) => x.cat === c).map(([x, i]) => `<button class="k9-item${x.id === st.cur && !st.q ? ' on' : ''}" data-ch="${x.id}"><span class="a9-hb-n">${i + 1}</span><span style="flex:1;text-align:start">${esc(tr(x.title))}</span>${read.includes(x.id) ? `<span class="k9-ok" aria-label="${esc(tr('leído'))}">✓</span>` : ''}</button>`).join('')).join('');
      }
      function enrich(html) {
        return html.replace(/\[\[keys\]\]/g, () => `<table class="md-table"><thead><tr><th>${esc(tr('Acción'))}</th><th>${esc(tr('Atajo'))}</th></tr></thead><tbody>${(K.keys ? K.keys.defs : []).map(d => `<tr><td>${esc(tr(d.label))}</td><td><kbd>${esc(K.keys.map()[d.id] || '—')}</kbd></td></tr>`).join('')}</tbody></table>`)
          .replace(/\[\[(tour|open):([^\]|]+)(?:\|([^\]|]*))?(?:\|([^\]]*))?\]\]/g, (m, kind, id, a2, a3) => { const label = kind === 'tour' ? (a2 || '') : (a3 || a2 || ''); const arg = kind === 'open' && a3 !== undefined ? a2 : ''; return kind === 'tour' ? `<button class="k9-btn pri a9-hb-act" data-tour="${esc(id)}">${I('target', 14)} ${label}</button>` : `<button class="k9-btn a9-hb-act" data-open="${esc(id)}" data-arg="${esc(arg || '')}">${I('external', 14)} ${label}</button>`; });
      }
      function show(id, hl) {
        const i = CH.findIndex(x => x.id === id), ch = CH[i] || CH[0]; st.cur = ch.id; st.q = ''; S.set('a9_hb_last', ch.id);
        const read = S.get('a9_hb_read', []) || []; if (!read.includes(ch.id)) S.set('a9_hb_read', read.concat(ch.id));
        const md = tr('hb_' + ch.id) !== 'hb_' + ch.id ? tr('hb_' + ch.id) : ch.md;
        let html = enrich(K.md(md).html); if (hl) { const re = new RegExp('(' + hl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'); html = html.replace(/>([^<]+)</g, (m, t) => '>' + t.replace(re, '<mark>$1</mark>') + '<'); }
        const prev = CH[i - 1], next = CH[i + 1], cat = CATS.find(c => c[0] === ch.cat);
        main.innerHTML = `<article class="md-view a9-hb-page"><div class="a9-hb-crumb">${esc(tr(cat[1]))} · ${esc(tr('Capítulo'))} ${i + 1} ${esc(tr('de'))} ${CH.length}</div><h1>${esc(tr(ch.title))}</h1>${html}<nav class="a9-hb-nav">${prev ? `<button class="k9-btn" data-ch="${prev.id}">← ${esc(tr(prev.title))}</button>` : '<span></span>'}${next ? `<button class="k9-btn" data-ch="${next.id}">${esc(tr(next.title))} →</button>` : ''}</nav></article>`;
        main.scrollTop = 0; toc(); const m = main.querySelector('mark'); if (m) m.scrollIntoView({ block: 'center' });
      }
      function search(text) {
        st.q = text; const n = norm(text); if (!n) return show(st.cur);
        const words = n.split(/\s+/).filter(Boolean);
        const res = CH.map(c => { const plain = (tr(c.title) + ' ' + c.md.replace(/\[\[[^\]]*\]\]/g, '')).replace(/[`*#>|_]/g, ' '), np = norm(plain); const score = words.reduce((a, wd) => a + (np.split(wd).length - 1) + (norm(tr(c.title)).includes(wd) ? 5 : 0), 0); if (!words.every(wd => np.includes(wd))) return null; const idx = np.indexOf(words[0]); return { c, score, snip: plain.slice(Math.max(0, idx - 60), idx + 120).replace(/\s+/g, ' ').trim() }; }).filter(Boolean).sort((a, c) => c.score - a.score);
        main.innerHTML = `<div class="k9-body"><h3 class="a9-h">${res.length} ${esc(tr('resultados para'))} «${esc(text)}»</h3>${res.map(r => `<button class="k9-card a9-hb-res" data-ch="${r.c.id}" data-hl="${esc(words[0])}"><b>${esc(tr(r.c.title))}</b><small>…${esc(r.snip)}…</small></button>`).join('') || `<div class="k9-state">${I('search', 36)}<p>${esc(tr('Sin resultados. Prueba con otras palabras.'))}</p></div>`}</div>`;
        toc();
      }
      b.addEventListener('click', e => {
        const c = e.target.closest('[data-ch]'); if (c) { show(c.dataset.ch, c.dataset.hl); return; }
        const t = e.target.closest('[data-tour]'); if (t) { const tt = (K.TUTORIALS || []).find(x => x.id === t.dataset.tour); if (tt && K.tour) K.tour(tt); return; }
        const o = e.target.closest('[data-open]'); if (o) { E.launch(o.dataset.open, o.dataset.arg || undefined); return; }
        const a = e.target.closest('.a9-hb-page a[href^="#"]'); if (a) { e.preventDefault(); const x = main.querySelector(a.getAttribute('href')); if (x) x.scrollIntoView({ behavior: 'smooth' }); }
      });
      const qi = q(b, '[data-q]'); let tmr = 0; qi.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => search(qi.value), 200); });
      const handle = a2 => { if (a2 && a2.q) { qi.value = a2.q; search(a2.q); } else if (a2 && a2.app && APPMAP[a2.app]) show(APPMAP[a2.app]); else if (a2 && a2.chapter) show(a2.chapter); else show(st.cur); };
      this.onArg = handle; handle(arg);
    }
  });
})();

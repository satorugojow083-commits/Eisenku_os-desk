# EISENKU OS · Registro de cambios

## 10.0.0 NEXT GENERATION — 12 de noviembre de 2026

Evolución de EISENKU OS 9.0 ENTERPRISE (nombre en clave *Beyond*). **No se ha eliminado ningún archivo, app, función ni ajuste de 9.0**: se conservan los 91 archivos, las 91 apps, las claves de almacenamiento (`eisen_*`), la base de archivos y los tres despliegues. Detalle completo, con lo parcial y lo no implementable: `docs/INFORME_TECNICO_10.md`.

### Arquitectura
- Núcleo 10.0 (`js/os10/core10.js`): registro de eventos, 13 servicios internos, programador de tareas, historial del portapapeles, historial de conexiones, bloqueo de apps con PIN, almacén IndexedDB para datos grandes y fuentes instaladas.
- **47 apps nuevas de carga diferida** en 8 módulos (`js/os10/apps/*.js`) y 4 bibliotecas propias (huellas, EXIF, lector QR, pruebas de rendimiento). Total: 138 apps.
- ZIP con compresión DEFLATE real; miniaturas reducidas con caché; la barra de tareas ya no se reconstruye con cada clic.

### Sistema
- Núcleo del sistema, Monitor de recursos, Visor de eventos, Servicios, Administrador de inicio, Programador de tareas, Administrador de compatibilidad, Centro de actividad, Centro de recuperación y Comprobador de integridad.
- Terminal: `services`, `sched`, `events`, `hash`, `sysinfo10` y `theme`.

### Hardware
- **Centro del equipo:** 17 componentes explicados con los datos reales del dispositivo.
- Inspector de hardware (con pruebas de pantalla y de rendimiento), Centro de dispositivos de entrada, Centro de mandos (calibración, vibración, reasignación), Centro de dispositivos de audio y Registro de periféricos.

### Escritorio y accesibilidad
- Diseños de ajuste, vista de todas las ventanas, paneles laterales, 13 widgets nuevos, fondo y nombre por escritorio virtual, perfiles de pantalla, menús contextuales con submenús, historial del portapapeles (Ctrl+Alt+V) y captura rápida de ideas.
- **Navegación completa con mando Xbox**, teclado en pantalla, lector de pantalla, lupa, 4 variantes de alto contraste, filtros de color, perfiles de accesibilidad y control de animaciones.
- Administrador de temas (`.eistheme`), paquetes de iconos.

### Configuración
- 25 categorías con búsqueda global (29 apartados contando Escritorio, Tienda, Sistema y Acerca de). Las tarjetas de 9.0 se conservan.

### Archivos
- Doble panel, vista rápida (Espacio), etiquetas y colores, búsqueda avanzada dentro del contenido, filtros guardados, comparar archivos, metadatos (EXIF, duración, huellas), papelera con vaciado automático y «Abrir con» para los formatos nuevos.

### Redes
- Centro de conexiones, Diagnóstico de conectividad, Servidores favoritos, Enlaces compartidos (con QR), Comunicación entre dispositivos (WebRTC), Información de conexión segura, Historial de conexiones y Privacidad del navegador.
- Lector de códigos QR propio para los navegadores sin `BarcodeDetector`.

### Oficina y estudio
- Gestor de referencias (DOI, ISBN, BibTeX, RIS), Generador de bibliografía (APA, MLA, Chicago, IEEE, Harvard, Vancouver), Organizador de documentos académicos, Ideas rápidas y Pizarra interactiva.
- Writer: citas, bibliografía, índice, ecuaciones y fuentes instaladas.

### Multimedia
- Editor de vídeo, Grabador de pantalla, Visor RAW, Gestor de colecciones, Reproductor con subtítulos, Biblioteca de podcasts y Centro multimedia para TV.

### Herramientas
- Verificador de huellas, Editor hexadecimal, Conversor universal de formatos, Administrador de fuentes, Calculadora de programación y Generador de diagramas técnicos.

### Ciencia y educación
- Simulador de circuitos (análisis nodal), Laboratorio de física y matemáticas, Simulador de topología de red y Centro de aprendizaje de informática (8 lecciones).

### Correcciones
- Con el mando, la cruceta ya entra en la ventana activa aunque no haya nada enfocado.
- Archivos reconoce extensiones de hasta 10 letras.
- Las etiquetas EXIF de texto con tildes se leen bien (UTF-8).

## 9.0.0 ENTERPRISE — 2 de noviembre de 2026

Evolución completa de EISENKU OS 8.0 Pro. **No se ha eliminado ninguna app, función ni ajuste de 8.0**: las ventanas, ids, rutas del servidor (`/proxy`, `/p/…`, `/ai`), claves de almacenamiento (`eisen_*`), la base de archivos (`eisen_vault`) y los despliegues local, Netlify y Cloudflare siguen funcionando. Al actualizar se crea un punto de restauración y las migraciones de datos se pueden revertir.

### Arquitectura
- Núcleo 9.0 (`js/os9/kernel.js`): versión y migraciones reversibles, eventos, permisos, perfiles, copias completas, puntos de restauración, integridad, registro de seguridad, saneador HTML, iconos y kit de componentes.
- Apps 9.0 de **carga diferida** (`js/os9/apps/*.js`): se descargan al abrirlas y liberan memoria al cerrarlas.
- Servidor unificado: `lib/security.mjs`, `lib/proxy-core.mjs`, `lib/ai-core.mjs` son la única fuente; `tools/build-edge.mjs` genera Netlify y Cloudflare.
- Herramientas: `tools/build-i18n.mjs` (idiomas) y `tools/build-integrity.mjs` (huellas SHA-256).

### Diseño
- Rediseño empresarial: negro elegante, verde sobrio, rosa profesional y cristal controlado; 7 temas, colores de acento, densidad, esquinas, efecto cristal; iconos vectoriales propios; estados de carga, vacío y error coherentes.

### Escritorios
- **Linux Mode** y **Windows Mode** completos con los mismos datos y la elección recordada.
- Escritorios virtuales (hasta 6) y vista general; menú de ventana; ajuste de ventanas; ventanas siempre dentro de la pantalla.
- Centro de notificaciones con No molestar y apps silenciadas; búsqueda global (Ctrl+K); 7 widgets; modo concentración.
- Inicio de sesión, perfiles locales con PIN (PBKDF2), bloqueo automático.
- Atajos de teclado personalizables; modo de bajo consumo; ahorro de datos; accesibilidad ampliada.
- Asistente de bienvenida, 6 tutoriales interactivos, Centro de bienvenida, F1 para la ayuda de la app activa, modo seguro (`?safe=1`), apps de inicio y restauración de la disposición de ventanas.

### Configuración
- Centro de configuración con **22 apartados** y buscador (9 en 8.0).

### Archivos
- Explorador nuevo: subcarpetas, papelera con restauración, favoritos, copiar/cortar/pegar, cuadrícula y lista, detalles, ZIP (exportar y extraer), arrastrar entre carpetas, «Abrir con» y apps predeterminadas, importación de carpetas.
- Terminal con comandos reales sobre los archivos y ping HTTP real.

### App Center
- **EISENKU App Center** (antes EISEN Store): actualizaciones con notas, permisos, favoritos, restauración, apps web validadas y **paquetes de terceros `.eisenapp` aislados** con app de ejemplo.

### Navegador
- Permisos por sitio, gestor de descargas y marcadores, reabrir pestañas, sesiones, bloqueo de ventanas emergentes, modo oscuro forzado, navegación privada y páginas del proxy aisladas.

### Aplicaciones
- **46 apps nuevas**: 6 de productividad, 8 de internet, 3 multimedia, 9 de desarrollo, 13 de sistema y 7 de educación y ciencia, más el **EISENKU OS Handbook** (25 capítulos). Lista completa en [FUNCIONES.md](FUNCIONES.md).
- **EISEN Writer 9.0:** documentos en Archivos en Word (.docx), HTML o texto; estilos, fuentes, colores, resaltado, enlaces seguros, imágenes, tablas, buscar y reemplazar, recuento de palabras, guardado automático y pegado saneado.
- **EISEN Sheets 9.0:** motor de fórmulas propio (sin `eval`) con rangos, comparaciones y más de 40 funciones en español e inglés; CSV; pegar bloques; teclado.
- **Códigos QR 9.0:** generador propio sin conexión (antes enviaba los datos a un servicio externo); Wi-Fi, contactos, correo, teléfono y SMS.
- **Música:** teclas multimedia del sistema y atajos configurables.
- Calculadora sin evaluación de código; PDF Studio con apertura segura; Maestro Domingo con código de acceso opcional para la IA.

### Idiomas
- **20 idiomas** (antes 5), árabe de derecha a izquierda, formatos regionales, cambio instantáneo, detección y exportación de textos sin traducir. Cobertura detallada en [LIMITACIONES.md](LIMITACIONES.md#idiomas).

### Seguridad
- Corregida la vulnerabilidad crítica de 8.0 por la que las webs visitadas mediante el proxy podían leer los datos de EISENKU en Netlify/Cloudflare.
- SSRF, *path traversal*, cookies del proxy, permisos de sitios, XSS, sandbox de páginas generadas, límites de la IA, copias validadas. Auditoría completa en [SEGURIDAD.md](SEGURIDAD.md).

### Rendimiento y compatibilidad
- Arranque con módulos diferidos, Service Worker «red primero» con todas las apps disponibles sin conexión, modo de bajo consumo para Xbox, tabletas y equipos modestos, interfaz adaptada a móvil, tableta, PC y televisor.

### Documentación
- EISENKU OS Handbook integrado (25 capítulos, buscador, tutoriales) y exportado en `docs/HANDBOOK.md`; `docs/FUNCIONES.md`, `docs/LIMITACIONES.md`, `docs/SEGURIDAD.md`, `docs/DESPLIEGUE.md`, `docs/PRUEBAS.md`.

---

## 8.0 Pro

- Dos entornos (Windows y Linux), navegador con resultados EISEN, historial, favoritos y modo lectura, 34 apps nuevas, EISEN Store con apps web y fichas de Google Play, Game Hub con 28 juegos, Maestro Domingo con IA opcional, carpetas y accesos directos en el escritorio, 12 fondos.

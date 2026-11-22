# EISENKU OS 10.0 NEXT GENERATION · Instalación y despliegue

> El despliegue de 10.0 es idéntico al de 9.0: mismos archivos de arranque, mismas variables y mismos tres destinos. Al actualizar una copia ya publicada, sube la carpeta completa (hay 22 archivos nuevos en `js/os10/`, `css/` y `docs/`); los datos de los usuarios se conservan.

EISENKU OS es una aplicación web. Hay tres formas de usarla y las tres conservan todas las funciones:

| Forma | Proxy del navegador | IA de Maestro Domingo | Modo sin conexión |
|---|---|---|---|
| **Local** con `INICIAR.bat` / `INICIAR.sh` (Node.js) | Sí (en otro puerto, origen separado) | Sí, si defines `AI_API_KEY` | Sí, tras la primera visita |
| **Netlify** | Sí (función `/proxy` + respuestas aisladas) | Sí, con variables de entorno | Sí |
| **Cloudflare Pages** | Sí (`_worker.js` + respuestas aisladas) | Sí, con variables de entorno | Sí |
| Abrir `index.html` con doble clic | **No** | **No** (modo local) | No |

> Abrir `index.html` directamente (`file://`) funciona solo en parte: el navegador bloquea el proxy, la IA, el modo sin conexión y la comprobación de integridad. Usa siempre una de las tres primeras formas.

---

## 1. Local (Windows, macOS, Linux)

**Requisito:** [Node.js](https://nodejs.org) 18 o superior. No hay que instalar dependencias (`npm install` no es necesario).

- **Windows:** doble clic en `INICIAR.bat`.
- **macOS / Linux:** en una terminal, dentro de la carpeta: `sh INICIAR.sh` (o `chmod +x INICIAR.sh` y `./INICIAR.sh`).

Se abre `http://127.0.0.1:8080`. Deja la ventana del servidor abierta mientras lo uses.

### Opciones (variables de entorno)

Edita las líneas comentadas al principio de `INICIAR.bat` / `INICIAR.sh`, o defínelas antes de `node server.mjs`:

| Variable | Valor por defecto | Para qué sirve |
|---|---|---|
| `PORT` | `8080` | Puerto del escritorio. El proxy usa además `PORT+1` (8081). |
| `HOST` | `127.0.0.1` | Solo este equipo. Usa `0.0.0.0` para abrirlo desde otros dispositivos de tu red (Xbox, tableta…). **Solo en redes de confianza.** |
| `AI_API_KEY` | — | Clave de una API compatible con OpenAI. Activa la IA de Domingo. **Nunca llega al navegador.** |
| `AI_BASE_URL` | `https://api.groq.com/openai/v1` | Proveedor compatible con OpenAI (Groq, OpenRouter, Gemini con capa OpenAI, un servidor local…). Debe ser `https://` (o `http://localhost`). |
| `AI_MODEL` | `llama-3.3-70b-versatile` | Modelo del proveedor. |
| `AI_ACCESS_CODE` | — | Código que cada usuario escribe en *Domingo › Ajustes*. Recomendado si publicas EISENKU en Internet. |
| `AI_RATE_PER_MIN` | `20` | Peticiones de IA por minuto y por IP. |
| `AI_DAILY_LIMIT` | `500` | Peticiones de IA por día y por instancia del servidor. |

Ejemplos:

```bat
rem Windows (INICIAR.bat)
set PORT=8090
set AI_API_KEY=tu_clave
```

```sh
# macOS / Linux
PORT=8090 HOST=0.0.0.0 AI_API_KEY=tu_clave node server.mjs
```

### Usarlo desde la Xbox, una tableta o el móvil (misma red)

1. Inicia con `HOST=0.0.0.0` (en `INICIAR.bat`, quita `rem` de la línea `set HOST=0.0.0.0`).
2. Averigua la IP del equipo (por ejemplo `192.168.1.40`).
3. En el otro dispositivo abre `http://192.168.1.40:8080`.

Notas: en `http://` (sin HTTPS) algunos navegadores limitan funciones como la cámara, el micrófono, el portapapeles o el modo sin conexión. Para usarlas en otros dispositivos publica EISENKU en Netlify o Cloudflare (HTTPS).

### Si el puerto está ocupado

El servidor lo indica con un mensaje claro. Probablemente EISENKU ya está abierto en otra ventana; si no, usa otro puerto (`set PORT=8090` / `PORT=8090`).

---

## 2. Netlify

1. Sube la carpeta completa (con Git o con la CLI: `netlify deploy --prod`). `netlify.toml` ya configura la publicación (`publish = "."`) y las funciones (`netlify/functions`: `/proxy`, `/p/*` y `/ai`).
2. Opcional (IA): *Site configuration › Environment variables* → `AI_API_KEY` y, si quieres, `AI_BASE_URL`, `AI_MODEL`, `AI_ACCESS_CODE`, `AI_RATE_PER_MIN`, `AI_DAILY_LIMIT`. Vuelve a desplegar.
3. Las cabeceras de seguridad (CSP, `nosniff`, `X-Frame-Options`…) están en `_headers`.

> La subida por arrastrar y soltar de Netlify **no** publica funciones: el escritorio funciona, pero sin proxy ni IA. Usa Git o la CLI.

---

## 3. Cloudflare Pages

**Opción recomendada (`_worker.js`, modo avanzado):** sube la carpeta completa (Git o arrastrar y soltar). `_worker.js` sirve el escritorio, el proxy (`/proxy`, `/p/*`) y la IA (`/ai`) y añade las cabeceras de seguridad.

- Variables (opcional, IA): *Settings › Variables and Secrets* → `AI_API_KEY` (como **secreto**), `AI_BASE_URL`, `AI_MODEL`, `AI_ACCESS_CODE`…
- Si eliminas `_worker.js`, Cloudflare usa `functions/` (Pages Functions) y `_headers`, con el mismo comportamiento.

---

## 4. Después de modificar archivos

| Si cambias… | Ejecuta |
|---|---|
| `lib/*.mjs` (proxy, IA, seguridad) | `node tools/build-edge.mjs` (regenera `_worker.js`, `functions/`, `netlify/functions/` y `_headers`) |
| textos de `tools/i18n-core.txt` o `tools/i18n-extra/*.json` | `node tools/build-i18n.mjs` |
| cualquier archivo de la web (`index.html`, `css/`, `js/`, `apps/`…) | `node tools/build-integrity.mjs` (actualiza `integrity.json`, que usa *Centro de actualizaciones › Integridad*) |

Para publicar una versión nueva, cambia también `version.json` y `EISENKU_SERVER_VERSION` en `lib/security.mjs`. EISENKU **no se actualiza solo**: el Centro de actualizaciones avisa de que el servidor tiene otra versión y el usuario decide cuándo recargar.

---

## 5. Comprobación rápida tras desplegar

1. Abre la URL: debe aparecer el asistente de bienvenida (primera vez) o tu escritorio.
2. *Configuración › Red* o la app **Configuración de red** → «Servicios de EISENKU»: proxy e IA en verde (la IA solo si configuraste `AI_API_KEY`).
3. **Centro de actualizaciones › Integridad** → «Comprobar ahora»: todos los archivos deben coincidir.
4. Navegador EISEN: abre `https://es.wikipedia.org`.

## 6. Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| «IA no configurada en el servidor» | Falta `AI_API_KEY` en el servidor o en las variables del despliegue. Domingo sigue funcionando en modo local. |
| Domingo pide un código | El servidor tiene `AI_ACCESS_CODE`: escríbelo en *Domingo › Ajustes*. |
| El navegador no carga una web | Muchos sitios prohíben mostrarse dentro de otra página; usa «Abrir en pestaña real». Los inicios de sesión de Google, Microsoft o bancos no funcionan dentro del proxy. |
| La comprobación de integridad dice «No disponible» | Estás en `file://` o falta `integrity.json` (ejecuta `node tools/build-integrity.mjs`). |
| Archivos modificados en Integridad | La copia publicada no coincide con `integrity.json`: vuelve a subir la carpeta completa o regenera el manifiesto si los cambios son tuyos. |
| Pantalla en blanco o bloqueos al arrancar | Recarga con Ctrl+F5. Si persiste, abre la dirección con `?safe=1` al final (por ejemplo `http://127.0.0.1:8080/?safe=1`): es el **modo seguro**, sin apps de inicio ni ventanas restauradas. También está en *Herramientas de mantenimiento*. |


## EISEN OS PRIME 11.0

- **Servidor local (`INICIAR.bat` / `INICIAR.sh`)**: incluye el **relé de transferencia** (`/relay`) para «Transferir › Red local». Con `HOST=0.0.0.0`, abre EISEN en la Xbox, el móvil o la tableta con la IP del PC (`http://192.168.x.x:8080`) y recibe tu entorno con el código de 12 caracteres. El relé guarda el paquete **cifrado en el navegador**, en memoria, 10 minutos y para una sola lectura (máx. 8 MB, 200 paquetes). Exige la cabecera `x-eisen-relay` para que otras webs no puedan usarlo.
- **Netlify y Cloudflare Pages**: todo PRIME funciona salvo la red local (se oculta). Vuelve a ejecutar `node tools/build-edge.mjs` si cambias `lib/*.mjs`.
- **GitHub Pages u otro alojamiento estático**: sube la carpeta completa. Funcionan las apps, el espejo, la transferencia por código/QR/archivo y las descargas de sitios que permiten CORS; no hay proxy, IA del servidor ni red local.
- **Instalar como app (PWA)**: con HTTPS, el navegador ofrece instalar EISEN; en Android aparece además en «Compartir» (los archivos compartidos llegan a Descargas). Atajos del icono: Descargas, Transferir, Centro PRIME y Lanzador TV.
- Tras editar archivos de la web: `node tools/build-integrity.mjs`.

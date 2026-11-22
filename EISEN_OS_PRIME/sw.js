/* EISEN OS PRIME 11.0 · Service Worker (heredado de 9.0 ENTERPRISE y 10.0)
   Estrategia "red primero, caché de respaldo": siempre se usa la versión del servidor si hay conexión
   (sin actualizaciones silenciosas ni código antiguo atascado) y, sin conexión, se abre la última copia.
   Nunca intercepta el proxy (/p/, /proxy) ni la IA (/ai). */
const CACHE = 'eisenku-11.0.0-2026.11.22';
// Todo lo necesario para abrir EISENKU y sus apps sin conexión (las apps 9.0 y 10.0 y los idiomas se cargan bajo demanda)
const CORE = ['./', 'index.html', 'icon.svg', 'manifest.webmanifest', 'version.json', 'css/styles.css', 'css/eisenku8.css', 'css/eisenku9.css', 'css/apps9.css', 'css/eisenku10.css', 'css/apps10.css', 'css/eisenku11.css', 'css/apps11.css', 'recovery.html', 'apps/prime-sample.eisenplugin',
  'js/os9/boot.js', 'js/i18n.js', 'js/app.js', 'js/core.js', 'js/os9/kernel.js', 'js/extras.js', 'js/guide.js', 'js/apps-office.js', 'js/apps-media.js', 'js/games.js', 'js/games2.js', 'js/store.js', 'js/domingo.js', 'js/layout.js', 'js/desktop.js', 'js/shell.js',
  'js/os9/i18n9.js', 'js/os9/files9.js', 'js/os9/shell9.js', 'js/os9/settings9.js', 'js/os9/appcenter.js', 'js/os9/browser9.js', 'js/os9/office9.js', 'js/os9/catalog9.js', 'js/os9/start9.js',
  'js/os9/docx.js', 'js/os9/qrcode.js',
  'js/os10/core10.js', 'js/os10/catalog10.js', 'js/os10/shell10.js', 'js/os10/a11y10.js', 'js/os10/settings10.js', 'js/os10/files10.js',
  'js/os10/apps/system10.js', 'js/os10/apps/hardware10.js', 'js/os10/apps/network10.js', 'js/os10/apps/office10.js', 'js/os10/apps/media10.js', 'js/os10/apps/look10.js', 'js/os10/apps/tools10.js', 'js/os10/apps/edu10.js',
  'js/os11/prime11.js', 'js/os11/shell11.js', 'js/os11/apps/hub11.js', 'js/os11/apps/sync11.js', 'js/os11/apps/tools11.js',
  'js/os10/lib/hash10.js', 'js/os10/lib/exif10.js', 'js/os10/lib/qrdecode10.js', 'js/os10/lib/bench10.worker.js',
  'js/os9/apps/dev.js', 'js/os9/apps/handbook.js', 'js/os9/apps/internet.js', 'js/os9/apps/multimedia.js', 'js/os9/apps/productivity.js', 'js/os9/apps/science.js', 'js/os9/apps/system.js',
  'js/os9/i18n/ar.js', 'js/os9/i18n/ca.js', 'js/os9/i18n/de.js', 'js/os9/i18n/en.js', 'js/os9/i18n/fr.js', 'js/os9/i18n/hi.js', 'js/os9/i18n/id.js', 'js/os9/i18n/it.js', 'js/os9/i18n/ja.js', 'js/os9/i18n/ko.js', 'js/os9/i18n/nl.js', 'js/os9/i18n/pl.js', 'js/os9/i18n/pt.js', 'js/os9/i18n/ru.js', 'js/os9/i18n/sv.js', 'js/os9/i18n/tr.js', 'js/os9/i18n/uk.js', 'js/os9/i18n/zh-TW.js', 'js/os9/i18n/zh.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('eisenku-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  // PRIME 11: «Compartir» desde otras apps del teléfono (EISEN instalado como app): los archivos quedan en el buzón y se guardan en Descargas
  if (r.method === 'POST' && u.origin === location.origin && u.searchParams.has('share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await r.formData(), items = fd.getAll('files').filter(f => f && typeof f === 'object' && 'size' in f && f.size <= 512 * 1024 * 1024).slice(0, 50).map(f => ({ name: String(f.name || 'compartido').slice(0, 120), type: String(f.type || '').slice(0, 100), blob: f }));
        const meta = { title: String(fd.get('title') || '').slice(0, 300), text: String(fd.get('text') || '').slice(0, 5000), url: String(fd.get('url') || '').slice(0, 2000), at: Date.now() };
        const db = await new Promise((res, rej) => { const o = indexedDB.open('eisenprime_share', 1); o.onupgradeneeded = () => o.result.createObjectStore('inbox', { keyPath: 'id', autoIncrement: true }); o.onsuccess = () => res(o.result); o.onerror = () => rej(o.error); });
        await new Promise((res, rej) => { const t = db.transaction('inbox', 'readwrite'); t.objectStore('inbox').add({ meta, items }); t.oncomplete = res; t.onerror = () => rej(t.error); });
      } catch (err) { /* se abre EISEN igualmente */ }
      return Response.redirect('./?shared=1', 303);
    })());
    return;
  }
  if (r.method !== 'GET' || u.origin !== location.origin || /^\/(p\/|proxy|ai|relay)/.test(u.pathname) || u.searchParams.has('s10b')) return;   // s10b: mediciones de red (no se guardan en caché)
  e.respondWith(fetch(r).then(res => { if (res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)).catch(() => {}); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});

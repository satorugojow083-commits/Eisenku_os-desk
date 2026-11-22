/* EISENKU OS 8 · EISEN Store: catálogo, fichas, instalar/abrir/desinstalar, apps web, Google Play y apps manuales */
(() => {
  'use strict';
  const E = window.EISEN, storage = E.storage, esc = E.esc, toast = E.toast, $ = s => document.querySelector(s);
  const fav = d => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=64`;
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

  /* ---------- Apps web seleccionadas (abren en el navegador EISEN) ---------- */
  const WEB = [
    ['photopea', 'Photopea', 'Creatividad', 'https://www.photopea.com', 'Editor de imágenes por capas compatible con PSD.'], ['excalidraw', 'Excalidraw', 'Creatividad', 'https://excalidraw.com', 'Pizarra para diagramas a mano alzada.'], ['tldraw', 'tldraw', 'Creatividad', 'https://www.tldraw.com', 'Pizarra infinita para bocetos y esquemas.'], ['canva', 'Canva', 'Creatividad', 'https://www.canva.com', 'Diseña presentaciones, carteles y redes sociales.'], ['figma', 'Figma', 'Creatividad', 'https://www.figma.com', 'Diseño de interfaces colaborativo.'], ['piskel', 'Piskel', 'Creatividad', 'https://www.piskelapp.com', 'Editor de sprites y animación pixel art.'], ['squoosh', 'Squoosh', 'Creatividad', 'https://squoosh.app', 'Comprime y convierte imágenes en el navegador.'],
    ['vscode', 'VS Code for Web', 'Desarrollo', 'https://vscode.dev', 'El editor de código de Microsoft en la web.'], ['stackblitz', 'StackBlitz', 'Desarrollo', 'https://stackblitz.com', 'Entornos de desarrollo web instantáneos.'], ['codepen', 'CodePen', 'Desarrollo', 'https://codepen.io', 'Prueba HTML, CSS y JavaScript.'], ['github', 'GitHub', 'Desarrollo', 'https://github.com', 'Aloja repositorios y colabora en código.'], ['regex101', 'Regex101', 'Desarrollo', 'https://regex101.com', 'Crea y prueba expresiones regulares.'], ['devdocs', 'DevDocs', 'Desarrollo', 'https://devdocs.io', 'Documentación técnica unificada.'], ['cyberchef', 'CyberChef', 'Sistema', 'https://gchq.github.io/CyberChef/', 'Codifica, decodifica y analiza datos.'],
    ['desmos', 'Desmos', 'Educación', 'https://www.desmos.com/calculator', 'Calculadora gráfica avanzada.'], ['geogebra', 'GeoGebra', 'Educación', 'https://www.geogebra.org/calculator', 'Geometría, álgebra y cálculo interactivos.'], ['phet', 'PhET Simulaciones', 'Educación', 'https://phet.colorado.edu/es/', 'Simulaciones de física, química y biología.'], ['khan', 'Khan Academy', 'Educación', 'https://es.khanacademy.org', 'Cursos gratuitos de matemáticas y ciencias.'], ['duolingo', 'Duolingo', 'Educación', 'https://www.duolingo.com', 'Aprende idiomas jugando.'], ['wolfram', 'WolframAlpha', 'Educación', 'https://www.wolframalpha.com', 'Motor de conocimiento computacional.'], ['stellarium', 'Stellarium Web', 'Educación', 'https://stellarium-web.org', 'Planetario en tiempo real.'], ['archive', 'Internet Archive', 'Educación', 'https://archive.org', 'Libros, películas y webs históricas.'],
    ['gdocs', 'Google Docs', 'Productividad', 'https://docs.google.com', 'Documentos en la nube de Google.'], ['gdrive', 'Google Drive', 'Productividad', 'https://drive.google.com', 'Almacenamiento en la nube.'], ['office', 'Microsoft 365', 'Productividad', 'https://www.office.com', 'Word, Excel y PowerPoint en la web.'], ['notion', 'Notion', 'Productividad', 'https://www.notion.so', 'Notas, wikis y bases de datos.'], ['trello', 'Trello', 'Productividad', 'https://trello.com', 'Tableros Kanban para proyectos.'], ['todoist', 'Todoist', 'Productividad', 'https://todoist.com', 'Listas de tareas y recordatorios.'], ['classroom', 'Google Classroom', 'Productividad', 'https://classroom.google.com', 'Clases, tareas y calificaciones.'],
    ['gmail', 'Gmail', 'Internet', 'https://mail.google.com', 'Correo electrónico de Google.'], ['outlook', 'Outlook', 'Internet', 'https://outlook.live.com', 'Correo y calendario de Microsoft.'], ['whatsapp', 'WhatsApp Web', 'Internet', 'https://web.whatsapp.com', 'Mensajes de WhatsApp en el navegador.'], ['telegram', 'Telegram Web', 'Internet', 'https://web.telegram.org', 'Mensajería rápida y en la nube.'], ['discord', 'Discord', 'Internet', 'https://discord.com/app', 'Chat de voz y texto para comunidades.'], ['meet', 'Google Meet', 'Internet', 'https://meet.google.com', 'Videollamadas.'], ['osm', 'OpenStreetMap', 'Internet', 'https://www.openstreetmap.org', 'Mapa libre del mundo.'],
    ['youtube', 'YouTube', 'Multimedia', 'https://www.youtube.com', 'Videos (con reproductor integrado de EISEN).'], ['spotify', 'Spotify', 'Multimedia', 'https://open.spotify.com', 'Música en streaming (se abre en Música).'], ['twitch', 'Twitch', 'Multimedia', 'https://www.twitch.tv', 'Transmisiones en directo.'], ['soundcloud', 'SoundCloud', 'Multimedia', 'https://soundcloud.com', 'Descubre y comparte audio.'], ['bandlab', 'BandLab', 'Multimedia', 'https://www.bandlab.com', 'Estudio de música online.'],
    ['lichess', 'Lichess', 'Juegos', 'https://lichess.org', 'Ajedrez online gratis y sin anuncios.'], ['chesscom', 'Chess.com', 'Juegos', 'https://www.chess.com', 'Juega ajedrez y resuelve problemas.'], ['geoguessr', 'GeoGuessr', 'Juegos', 'https://www.geoguessr.com', 'Adivina lugares del mundo.'], ['krunker', 'Krunker', 'Juegos', 'https://krunker.io', 'Shooter ligero en el navegador.'], ['slither', 'Slither.io', 'Juegos', 'https://slither.io', 'Serpientes multijugador.']
  ];
  const list = E.apps();
  // reemplaza las entradas web antiguas por las nuevas (sin perder ids existentes)
  WEB.forEach(([id, name, cat, url, desc]) => { const e = { id, name, cat, ext: url, desc, img: fav(host(url)), icon: '🌐', web: true }; const old = list.findIndex(a => a.id === id); if (old >= 0) list.splice(old, 1, e); else list.push(e); });
  // las apps web de versiones anteriores se conservan con su id (las carpetas guardadas siguen funcionando)
  list.forEach(a => { if (a.ext && !a.user && !a.web) { a.web = true; a.img = fav(host(a.ext)); if (a.cat === 'Ciencia') a.cat = 'Educación'; } });

  /* ---------- Google Play (catálogo de referencia) ---------- */
  const PLAY = [['WhatsApp', 'com.whatsapp', 'Internet', 'https://web.whatsapp.com', 'whatsapp.com'], ['Instagram', 'com.instagram.android', 'Internet', 'https://www.instagram.com', 'instagram.com'], ['TikTok', 'com.zhiliaoapp.musically', 'Multimedia', 'https://www.tiktok.com', 'tiktok.com'], ['Spotify', 'com.spotify.music', 'Multimedia', 'https://open.spotify.com', 'spotify.com'], ['YouTube', 'com.google.android.youtube', 'Multimedia', 'https://www.youtube.com', 'youtube.com'], ['Netflix', 'com.netflix.mediaclient', 'Multimedia', 'https://www.netflix.com', 'netflix.com'], ['CapCut', 'com.lemon.lvoverseas', 'Creatividad', 'https://www.capcut.com', 'capcut.com'], ['Canva', 'com.canva.editor', 'Creatividad', 'https://www.canva.com', 'canva.com'], ['Snapseed', 'com.niksoftware.snapseed', 'Creatividad', '', 'snapseed.online'], ['Duolingo', 'com.duolingo', 'Educación', 'https://www.duolingo.com', 'duolingo.com'], ['Photomath', 'com.microblink.photomath', 'Educación', '', 'photomath.com'], ['Khan Academy', 'org.khanacademy.android', 'Educación', 'https://es.khanacademy.org', 'khanacademy.org'], ['Wikipedia', 'org.wikipedia', 'Educación', 'https://es.wikipedia.org', 'wikipedia.org'], ['Google Classroom', 'com.google.android.apps.classroom', 'Productividad', 'https://classroom.google.com', 'classroom.google.com'], ['Microsoft Teams', 'com.microsoft.teams', 'Productividad', 'https://teams.microsoft.com', 'teams.microsoft.com'], ['Google Drive', 'com.google.android.apps.docs', 'Productividad', 'https://drive.google.com', 'drive.google.com'], ['Microsoft Word', 'com.microsoft.office.word', 'Productividad', 'https://www.office.com', 'office.com'], ['Notion', 'notion.id', 'Productividad', 'https://www.notion.so', 'notion.so'], ['Zoom', 'us.zoom.videomeetings', 'Internet', 'https://app.zoom.us/wc', 'zoom.us'], ['Telegram', 'org.telegram.messenger', 'Internet', 'https://web.telegram.org', 'telegram.org'], ['Discord', 'com.discord', 'Internet', 'https://discord.com/app', 'discord.com'], ['Google Maps', 'com.google.android.apps.maps', 'Internet', 'https://www.google.com/maps', 'maps.google.com'], ['Waze', 'com.waze', 'Internet', 'https://www.waze.com/live-map', 'waze.com'], ['Minecraft', 'com.mojang.minecraftpe', 'Juegos', '', 'minecraft.net'], ['Roblox', 'com.roblox.client', 'Juegos', 'https://www.roblox.com', 'roblox.com'], ['Among Us', 'com.innersloth.spacemafia', 'Juegos', '', 'innersloth.com'], ['Genshin Impact', 'com.miHoYo.GenshinImpact', 'Juegos', '', 'genshin.hoyoverse.com'], ['Honkai: Star Rail', 'com.HoYoverse.hkrpgoversea', 'Juegos', '', 'hsr.hoyoverse.com'], ['Clash Royale', 'com.supercell.clashroyale', 'Juegos', '', 'clashroyale.com'], ['Brawl Stars', 'com.supercell.brawlstars', 'Juegos', '', 'brawlstars.com'], ['Subway Surfers', 'com.kiloo.subwaysurf', 'Juegos', '', 'subwaysurfers.com'], ['Chess.com', 'com.chess', 'Juegos', 'https://www.chess.com', 'chess.com']].map(([name, pkg, cat, web, dom]) => ({ id: 'play-' + pkg, name, pkg, cat, web, img: fav(dom), icon: '▶', desc: web ? 'App de Android · tiene versión web' : 'App de Android · solo en dispositivos Android' }));
  const playUrl = p => 'https://play.google.com/store/apps/details?id=' + encodeURIComponent(p);

  /* ---------- Apps añadidas por el usuario ---------- */
  const userApps = () => storage.get('user_apps', []);
  function syncUser() { for (let i = list.length - 1; i >= 0; i--) if (list[i].user) list.splice(i, 1); userApps().forEach(a => list.push(Object.assign({ user: true }, a))); }
  syncUser();

  /* ---------- Datos enriquecidos ---------- */
  const kind = a => a.user ? 'Añadida por ti' : a.game ? 'Juego integrado' : a.web ? 'App web' : 'App de EISENKU';
  const info = a => { const r = E.REG[a.id] || {}; const g = a.game && E.GAMES.find(x => x.id === a.game); return { feats: r.features || (g ? [g.how, 'Funciona sin conexión', 'Guarda tu récord'] : a.web ? ['Se abre en el Navegador EISEN', 'Algunos sitios piden abrirse en pestaña real', 'Requiere conexión a Internet'] : a.user ? ['Acceso directo a ' + host(a.ext || ''), 'Se abre en el Navegador EISEN'] : ['Integrada en el sistema']), cat: g ? 'Juegos · ' + g.cat : (E.CATS[a.cat] || {}).label || a.cat }; };
  const NEW8 = ['notes', 'tasks', 'calendar', 'clock', 'calc', 'converter', 'notepad', 'slides', 'periodic', 'grapher', 'flashcards', 'wiki', 'physics', 'typing', 'atlas', 'weather', 'translator', 'news', 'maps', 'qr', 'gallery', 'recorder', 'camera', 'video', 'piano', 'monitor', 'passgen', 'netcheck', 'paint', 'photo', 'pixel', 'colors', 'code', 'assistant'];
  const inst = a => E.isInstalled(a.id);
  const removable = a => !E.CORE_APPS.includes(a.id);

  /* ---------- Interfaz ---------- */
  const win = $('#win-appcenter');
  win.querySelector('.window-title-area').innerHTML = `${E.tile(E.REG.appcenter, 18, 'mini')}<span>EISEN Store</span>`;
  const old = win.querySelector('.appcenter-layout'); old.hidden = true; old.style.display = 'none';
  const root = document.createElement('div'); root.className = 'window-body st-root'; win.insertBefore(root, old);
  root.innerHTML = `<nav class="st-nav">${[['home', '🏠', 'Inicio'], ['apps', '🧩', 'Apps'], ['games', '🎮', 'Juegos'], ['web', '🌐', 'Web'], ['play', '▶', 'Google Play'], ['lib', '📚', 'Biblioteca'], ['add', '＋', 'Añadir app']].map(([k, i, l]) => `<button data-v="${k}"><span>${i}</span><small>${l}</small></button>`).join('')}</nav>
    <div class="st-main"><div class="st-top"><input class="input-text" data-q placeholder="Buscar apps, juegos y aplicaciones web"><span class="st-count" data-count></span></div><div class="st-view" data-view></div></div>`;
  const V = root.querySelector('[data-view]'); let view = 'home', q = '', cat = 'all', back = null, heroI = 0, heroT;

  const btns = (a, big) => {
    const b = [];
    if (a.pkg) { b.push(`<button class="btn-primary" data-ext-play="${esc(a.pkg)}">Ver en Google Play ↗</button>`); if (a.web) b.push(`<button class="btn-secondary" data-play-web="${a.id}">Abrir versión web</button><button class="btn-secondary" data-play-add="${a.id}">＋ Añadir a EISEN</button>`); return b.join(''); }
    if (inst(a)) { b.push(`<button class="btn-primary" data-open="${a.id}">Abrir</button>`); if (big && removable(a)) b.push(`<button class="btn-secondary" data-uninst="${a.id}">Desinstalar</button>`); if (big && E.addDesktopShortcut) b.push(`<button class="btn-secondary" data-desk="${a.id}">🖥 Al escritorio</button>`); if (big && a.user) b.push(`<button class="btn-secondary" data-edit-user="${a.id}">Editar</button>`); }
    else b.push(`<button class="btn-primary" data-inst="${a.id}">Instalar</button>`);
    return b.join('');
  };
  const card = a => `<article class="st-card" data-detail="${a.id}">${E.tile(a, 52)}<div class="st-ci"><h4>${esc(a.name)}</h4><span class="st-cat">${esc(a.game ? (a.gcat || 'Juego') : (E.CATS[a.cat] || {}).label || a.cat)}</span><p>${esc(a.desc || '')}</p><div class="st-cb">${btns(a)}${!a.pkg && inst(a) ? '<span class="st-ok">✓ Instalada</span>' : ''}</div></div></article>`;
  const row = (title, items, more) => items.length ? `<section class="st-sec"><div class="st-sec-h"><h3>${title}</h3>${more ? `<button class="btn-secondary" data-v="${more}">Ver todo ›</button>` : ''}</div><div class="st-row">${items.map(card).join('')}</div></section>` : '';
  const pool = () => list.filter(a => a.id !== 'appcenter');
  const match = a => !q || (a.name + ' ' + (a.desc || '') + ' ' + (a.cat || '') + ' ' + (a.kw || '') + ' ' + (a.gcat || '')).toLowerCase().includes(q);
  function catBar(cats) { return `<div class="st-chips">${['all', ...cats].map(c => `<button data-cat="${c}" class="${c === cat ? 'on' : ''}">${c === 'all' ? 'Todas' : (E.CATS[c] || {}).label || c}</button>`).join('')}</div>`; }

  function render() {
    clearInterval(heroT);
    root.querySelectorAll('.st-nav [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === view));
    const P = pool();
    if (q && !['add', 'detail'].includes(view)) {
      const r = P.filter(match), pr = PLAY.filter(match);
      V.innerHTML = `<h2>Resultados para “${esc(q)}”</h2><div class="st-grid">${r.map(card).join('') || '<p class="ap-empty">Nada en EISENKU con ese nombre.</p>'}</div>${pr.length ? `<h3>En Google Play</h3><div class="st-grid">${pr.map(card).join('')}</div>` : ''}<div class="ap-card">¿No está? <button class="btn-secondary" data-play-search="${esc(q)}">Buscar “${esc(q)}” en Google Play ↗</button> <button class="btn-secondary" data-v="add">＋ Añadirla manualmente</button></div>`;
      return count(r.length + pr.length);
    }
    if (view === 'home') {
      const native = P.filter(a => E.REG[a.id] && !E.REG[a.id].legacy);
      const feat = ['assistant', 'paint', 'weather', 'periodic', 'notes'].map(id => P.find(a => a.id === id)).filter(Boolean).concat([P.find(a => a.id === 'game-racer')]).filter(Boolean);
      const recCats = new Set((storage.get('recent_apps', [])).map(id => (P.find(a => a.id === id) || {}).cat).filter(Boolean));
      const rec = native.filter(a => recCats.has(a.cat) && !(storage.get('recent_apps', [])).includes(a.id)).slice(0, 8);
      const newer = NEW8.map(id => P.find(a => a.id === id)).filter(Boolean);
      V.innerHTML = `<div class="st-hero" data-hero></div>${row('⭐ Destacadas', feat.slice(0, 6))}${row('💡 Recomendadas para ti', rec.length ? rec : newer.slice(8, 16))}${row('✨ Nuevas en EISENKU 8', newer.slice(0, 12), 'apps')}${row('🎮 Juegos populares', P.filter(a => a.game).slice(0, 10), 'games')}${row('🌐 Apps web útiles', P.filter(a => a.web && a.cat !== 'Juegos').slice(0, 10), 'web')}
        <section class="st-sec"><h3>Explorar por categoría</h3><div class="st-cats">${Object.entries(E.CATS).filter(([k]) => k !== 'Ciencia').map(([k, c]) => `<button data-gocat="${k}" style="--g1:${c.g[0]};--g2:${c.g[1]}"><span>${c.ic}</span>${c.label}</button>`).join('')}</div></section>`;
      const heroes = feat.slice(0, 4);
      const hero = () => { const a = heroes[heroI % heroes.length]; const h = V.querySelector('[data-hero]'); if (!h || !a) return; const g = a.grad || (E.CATS[a.cat] || E.CATS.Sistema).g; h.style.cssText = `--g1:${g[0]};--g2:${g[1]}`; h.innerHTML = `<div class="st-hero-ic">${a.icon}</div><div><small>Destacado</small><h2>${esc(a.name)}</h2><p>${esc(a.desc || '')}</p><div class="st-cb">${btns(a)}<button class="btn-secondary" data-detail="${a.id}">Ver ficha</button></div></div><div class="st-dots">${heroes.map((_, i) => `<i class="${i === heroI % heroes.length ? 'on' : ''}" data-hi="${i}"></i>`).join('')}</div>`; };
      hero(); heroT = setInterval(() => { if (!win.classList.contains('open')) return; heroI++; hero(); }, 6000);
      return count(P.length);
    }
    if (view === 'apps') { const r = P.filter(a => !a.game && !a.web && !a.pkg && (cat === 'all' || a.cat === cat || (cat === 'Educación' && a.cat === 'Ciencia'))); V.innerHTML = `<h2>Apps de EISENKU</h2>${catBar(['Productividad', 'Educación', 'Internet', 'Multimedia', 'Sistema', 'Creatividad', 'Desarrollo'])}<div class="st-grid">${r.map(card).join('')}</div>`; return count(r.length); }
    if (view === 'games') { const r = P.filter(a => a.game && (cat === 'all' || a.gcat === cat)); V.innerHTML = `<h2>Juegos</h2>${catBar(E.GAME_CATS)}<div class="st-grid">${r.map(card).join('')}</div>`; return count(r.length); }
    if (view === 'web') { const r = P.filter(a => (a.web || a.user) && (cat === 'all' || a.cat === cat)); V.innerHTML = `<h2>Aplicaciones web</h2><p class="eis-muted">Se abren en el Navegador EISEN. Al instalarlas aparecen en el menú de inicio y puedes ponerlas en el escritorio.</p>${catBar(['Productividad', 'Educación', 'Internet', 'Multimedia', 'Creatividad', 'Desarrollo', 'Sistema', 'Juegos'])}<div class="st-grid">${r.map(card).join('')}</div>`; return count(r.length); }
    if (view === 'play') {
      const r = PLAY.filter(a => cat === 'all' || a.cat === cat);
      V.innerHTML = `<div class="st-play-h"><div class="st-play-logo">▶</div><div><h2>Google Play</h2><p class="eis-muted">Consulta apps de Android y abre su ficha oficial. EISENKU funciona en el navegador, así que <b>no puede instalar ni ejecutar APK</b>; cuando una app tiene versión web puedes abrirla o añadirla a EISEN.</p></div></div>
        <form class="ap-row" data-psearch><input class="input-text" data-pq placeholder="Buscar en Google Play (se abre la tienda oficial)" style="flex:1"><button class="btn-primary">Buscar ↗</button></form>${catBar(['Internet', 'Multimedia', 'Creatividad', 'Educación', 'Productividad', 'Juegos'])}<div class="st-grid">${r.map(card).join('')}</div>`;
      return count(r.length);
    }
    if (view === 'lib') {
      const r = P.filter(a => inst(a));
      const ups = userApps();
      V.innerHTML = `<h2>Biblioteca</h2><p class="eis-muted">${r.length} elementos instalados · Las apps desinstaladas desaparecen del menú y del escritorio, pero sus datos se conservan.</p><div class="st-grid">${r.map(card).join('')}</div>${ups.length ? `<h3>Añadidas por ti</h3><div class="st-grid">${ups.map(u => card(list.find(a => a.id === u.id) || u)).join('')}</div>` : ''}`;
      return count(r.length);
    }
    if (view === 'add') return addView();
    if (view === 'detail') return detail(back);
  }
  const count = n => { root.querySelector('[data-count]').textContent = n + ' resultados'; };

  function detail(id) {
    const a = list.find(x => x.id === id) || PLAY.find(x => x.id === id); if (!a) { view = 'home'; return render(); }
    const i = a.pkg ? { feats: ['Paquete: ' + a.pkg, a.web ? 'Tiene versión web que funciona en EISENKU' : 'Solo disponible en Android', 'La ficha se abre en Google Play'], cat: 'Google Play · ' + ((E.CATS[a.cat] || {}).label || a.cat) } : info(a);
    const similar = (a.pkg ? PLAY : pool()).filter(x => x.id !== a.id && x.cat === a.cat && (!!x.game === !!a.game)).slice(0, 8);
    const g = a.game && E.GAMES.find(x => x.id === a.game);
    V.innerHTML = `<button class="btn-secondary" data-v="${a.pkg ? 'play' : a.game ? 'games' : a.web ? 'web' : 'home'}">‹ Volver</button>
      <div class="st-detail">${E.tile(a, 104)}<div><h1>${esc(a.name)}</h1><p class="st-cat">${esc(i.cat)} · ${esc(a.pkg ? 'Android' : kind(a))}</p><div class="st-cb">${btns(a, true)}</div></div></div>
      ${g ? `<div class="st-shot">${E.cover(g, 200)}</div>` : ''}
      <section class="st-sec"><h3>Descripción</h3><p>${esc(a.desc || '')}</p>${(E.REG[a.id] || {}).kw ? `<p class="eis-muted">Palabras clave: ${esc(E.REG[a.id].kw)}</p>` : ''}</section>
      <section class="st-sec"><h3>Características</h3><div class="st-feats">${i.feats.map(f => `<div class="ap-card">✔ ${esc(f)}</div>`).join('')}</div></section>
      ${a.ext ? `<section class="st-sec"><h3>Dirección</h3><p><a href="#" data-external-url="${esc(a.ext)}">${esc(a.ext)}</a></p></section>` : ''}
      ${similar.length ? row('También te puede gustar', similar) : ''}`;
    count(1);
  }

  function addView() {
    V.innerHTML = `<h2>＋ Añadir aplicación manualmente</h2><p class="eis-muted">Agrega cualquier sitio, app web (PWA) o archivo HTML accesible por URL. Pega el enlace y pulsa “Detectar” para rellenar nombre, icono y descripción automáticamente.</p>
      <form class="st-add" data-addf><label>URL de la app o del manifiesto (.webmanifest)<div class="ap-row"><input class="input-text" name="url" type="url" required placeholder="https://ejemplo.com" style="flex:1"><button type="button" class="btn-secondary" data-detect>🔍 Detectar</button></div></label>
      <label>Nombre<input class="input-text" name="name" required maxlength="40"></label><label>Icono (emoji o URL de imagen)<input class="input-text" name="icon" value="🌐"></label>
      <label>Descripción<input class="input-text" name="desc" maxlength="140" placeholder="Para qué sirve"></label><label>Categoría<select class="input-text" name="cat">${['Productividad', 'Educación', 'Internet', 'Multimedia', 'Creatividad', 'Desarrollo', 'Sistema', 'Juegos'].map(c => `<option value="${c}">${(E.CATS[c] || {}).label || c}</option>`).join('')}</select></label>
      <label class="ap-check-l"><input type="checkbox" name="desk" checked> Crear acceso directo en el escritorio</label><div class="ap-row"><button class="btn-primary">Añadir a EISEN</button><span class="eis-muted" data-st></span></div><input type="hidden" name="edit"></form>`;
    count(0);
  }
  async function detect(f) {
    let u = f.url.value.trim(); if (!/^https?:\/\//i.test(u)) { if (!u) return; u = 'https://' + u; f.url.value = u; }
    const st = V.querySelector('[data-st]'); st.textContent = 'Analizando…';
    try {
      const txt = await E.ebFetchHtml(u); let man = null;
      if (/\.(webmanifest|json)(\?|$)/i.test(u) || /^\s*\{/.test(txt)) { man = JSON.parse(txt); }
      else { const d = new DOMParser().parseFromString(txt, 'text/html'); const abs = h => { try { return new URL(h, u).href; } catch { return ''; } };
        f.name.value = f.name.value || ((d.querySelector('meta[property="og:site_name"]') || {}).content || d.title || host(u)).trim().slice(0, 40);
        f.desc.value = f.desc.value || ((d.querySelector('meta[name="description"]') || d.querySelector('meta[property="og:description"]') || {}).content || '').trim().slice(0, 140);
        const ic = d.querySelector('link[rel="apple-touch-icon"], link[rel~="icon"]'); f.icon.value = ic ? abs(ic.getAttribute('href')) : fav(host(u));
        const ml = d.querySelector('link[rel="manifest"]'); if (ml) { try { const mu = abs(ml.getAttribute('href')); man = JSON.parse(await E.ebFetchHtml(mu)); man.__base = mu; } catch { /* sin manifiesto */ } } }
      if (man) { const base = man.__base || u; f.name.value = (man.short_name || man.name || f.name.value || '').slice(0, 40); f.desc.value = f.desc.value || (man.description || '').slice(0, 140); const ic = (man.icons || []).sort((a, b) => parseInt(b.sizes) - parseInt(a.sizes))[0]; if (ic) f.icon.value = new URL(ic.src, base).href; if (man.start_url) f.url.value = new URL(man.start_url, base).href; }
      st.textContent = '✓ Datos detectados';
    } catch { f.name.value = f.name.value || host(u); f.icon.value = fav(host(u)); st.textContent = 'No se pudo leer la página; se usará el icono del sitio. Completa los datos.'; }
  }
  root.addEventListener('submit', e => {
    if (e.target.matches('[data-psearch]')) { e.preventDefault(); const v = e.target.querySelector('[data-pq]').value.trim(); if (v) window.open('https://play.google.com/store/search?c=apps&q=' + encodeURIComponent(v), '_blank', 'noopener'); return; }
    if (!e.target.matches('[data-addf]')) return; e.preventDefault(); const f = e.target;
    const icon = f.icon.value.trim(), isImg = /^(https?:|data:image)/.test(icon);
    const a = { id: f.edit.value || 'user-' + E.uid(), name: f.name.value.trim(), ext: f.url.value.trim(), cat: f.cat.value, desc: f.desc.value.trim() || 'App añadida manualmente', icon: isImg ? '🌐' : (icon || '🌐'), img: isImg ? icon : '' };
    const all = userApps().filter(x => x.id !== a.id); all.push(a); storage.set('user_apps', all); syncUser(); E.setInstalled(a.id, true);
    if (f.desk.checked && E.addDesktopShortcut) E.addDesktopShortcut(a.id);
    toast('Añadida: ', a.name); back = a.id; view = 'detail'; render();
  });
  root.addEventListener('click', async e => {
    const t = e.target;
    const v = t.closest('[data-v]'); if (v) { view = v.dataset.v; cat = 'all'; q = ''; root.querySelector('[data-q]').value = ''; render(); V.scrollTop = 0; return; }
    const c = t.closest('[data-cat]'); if (c) { cat = c.dataset.cat; render(); return; }
    const gc = t.closest('[data-gocat]'); if (gc) { view = gc.dataset.gocat === 'Juegos' ? 'games' : 'apps'; cat = gc.dataset.gocat === 'Juegos' ? 'all' : gc.dataset.gocat; render(); return; }
    const hi = t.closest('[data-hi]'); if (hi) { heroI = +hi.dataset.hi; render(); return; }
    if (t.closest('[data-detect]')) return detect(t.closest('form'));
    const o = t.closest('[data-open]'); if (o) { e.stopPropagation(); E.launch(o.dataset.open); return; }
    const ins = t.closest('[data-inst]'); if (ins) { e.stopPropagation(); const a = list.find(x => x.id === ins.dataset.inst); ins.disabled = true; ins.innerHTML = '<i class="st-spin"></i> Instalando'; setTimeout(() => { E.setInstalled(a.id, true); E.notify('Instalada', a.name + ' ya está en el menú de inicio', '✅', 3500); render(); }, 450); return; }
    const un = t.closest('[data-uninst]'); if (un) { e.stopPropagation(); const a = list.find(x => x.id === un.dataset.uninst); if (!await E.confirm('Desinstalar', `¿Quitar ${a.name} del sistema? Sus datos se conservan.`, 'Desinstalar')) return; E.setInstalled(a.id, false); if (a.user && await E.confirm('Eliminar', '¿Borrar también esta app añadida manualmente?', 'Borrar')) { storage.set('user_apps', userApps().filter(x => x.id !== a.id)); syncUser(); view = 'lib'; } const w = $('#win-' + a.id); if (w) { const x = w.querySelector('[data-act=close]'); if (x) x.click(); } render(); return; }
    const dk = t.closest('[data-desk]'); if (dk) { e.stopPropagation(); E.addDesktopShortcut(dk.dataset.desk); toast('Acceso directo creado en el escritorio'); return; }
    const eu = t.closest('[data-edit-user]'); if (eu) { const a = userApps().find(x => x.id === eu.dataset.editUser); view = 'add'; addView(); const f = V.querySelector('form'); f.url.value = a.ext; f.name.value = a.name; f.icon.value = a.img || a.icon; f.desc.value = a.desc; f.cat.value = a.cat; f.edit.value = a.id; f.desk.checked = false; return; }
    const ep = t.closest('[data-ext-play]'); if (ep) { e.stopPropagation(); window.open(playUrl(ep.dataset.extPlay), '_blank', 'noopener'); return; }
    const pw = t.closest('[data-play-web]'); if (pw) { e.stopPropagation(); const a = PLAY.find(x => x.id === pw.dataset.playWeb); E.ebOpenUrl(a.web, true); return; }
    const pa = t.closest('[data-play-add]'); if (pa) { e.stopPropagation(); const a = PLAY.find(x => x.id === pa.dataset.playAdd); const u = { id: 'user-' + a.pkg.replace(/\W/g, '_'), name: a.name, ext: a.web, cat: a.cat, desc: a.name + ' (versión web)', icon: '🌐', img: a.img }; const all = userApps().filter(x => x.id !== u.id); all.push(u); storage.set('user_apps', all); syncUser(); E.setInstalled(u.id, true); toast(a.name + ' añadida a EISEN'); render(); return; }
    const ps = t.closest('[data-play-search]'); if (ps) { window.open('https://play.google.com/store/search?c=apps&q=' + encodeURIComponent(ps.dataset.playSearch), '_blank', 'noopener'); return; }
    const d = t.closest('[data-detail]'); if (d && !t.closest('button')) { back = d.dataset.detail; view = 'detail'; render(); V.scrollTop = 0; }
    else if (d && t.closest('button[data-detail]')) { back = d.dataset.detail; view = 'detail'; render(); }
  });
  let st; root.querySelector('[data-q]').oninput = e => { clearTimeout(st); st = setTimeout(() => { q = e.target.value.trim().toLowerCase(); render(); }, 150); };
  document.addEventListener('eisen:installed', () => { if (win.classList.contains('open')) render(); });
  (window.EISEN_HOOKS.appcenter = window.EISEN_HOOKS.appcenter || []).push(() => render());
  E.storeSearch = text => { E.openWindow('appcenter'); q = String(text || '').toLowerCase(); root.querySelector('[data-q]').value = text || ''; render(); };
  E.storeShow = id => { E.openWindow('appcenter'); back = id; view = 'detail'; q = ''; render(); };
  E.PLAY = PLAY;
  render();
})();

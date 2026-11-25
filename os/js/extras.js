/* EISENKU OS · Extras: Música (Spotify / YouTube / enlaces), integraciones y terminal ampliada */
(() => {
  'use strict';
  const E = window.EISEN, $ = s => document.querySelector(s), storage = E.storage;
  const tr = s => (window.EISEN_I18N ? window.EISEN_I18N.tr(s) : s);
  const esc = E.esc, toast = E.toast;

  /* ---------- Retorno de inicio de sesión de Spotify (ventana emergente) ---------- */
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('state') && q.get('state') === localStorage.getItem('eisen_sp_state') && (q.get('code') || q.get('error'))) {
      const bc = new BroadcastChannel('eisen_spotify'); bc.postMessage({ code: q.get('code'), state: q.get('state'), error: q.get('error') });
      localStorage.removeItem('eisen_sp_state');
      document.body.innerHTML = '<p style="font:16px system-ui;padding:30px">Spotify conectado. Puedes cerrar esta ventana.</p>'; setTimeout(() => window.close(), 400);
      return;
    }
  } catch { /* ignorar */ }

  /* ---------- Música: pestañas ---------- */
  const win = $('#win-music'), local = win.querySelector('.player-container');
  const bar = document.createElement('div'); bar.className = 'mu-tabs';
  bar.innerHTML = '<button data-mt="local" class="active">🎵 Local</button><button data-mt="spotify">🟢 Spotify</button><button data-mt="youtube">▶ YouTube</button><button data-mt="link">🔗 Enlace</button>';
  win.insertBefore(bar, local);
  const panels = {
    spotify: `<div class="mu-bar"><input id="sp-url" class="input-text" placeholder="Pega un enlace de Spotify (canción, álbum, playlist, podcast)"><button class="btn-primary" id="sp-load">Cargar</button></div>
      <div class="mu-bar"><button class="btn-secondary" id="sp-login">🔑 Iniciar sesión en Spotify</button><button class="btn-secondary" id="sp-connect">🔗 Conectar cuenta (buscar y mis playlists)</button><span id="sp-status" class="mu-small"></span></div>
      <div class="mu-bar" id="sp-search" hidden><input id="sp-q" class="input-text" placeholder="Busca canciones, álbumes, artistas…"><button class="btn-primary" id="sp-go">Buscar</button><button class="btn-secondary" id="sp-mine">Mis playlists</button></div>
      <div id="sp-results" class="mu-results" hidden></div>
      <iframe id="sp-frame" class="mu-frame" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>`,
    youtube: `<div class="mu-bar"><input id="yt-q" class="input-text" placeholder="Busca en YouTube o pega un enlace de video/lista"><button class="btn-primary" id="yt-go">Buscar</button></div>
      <div id="yt-results" class="mu-results" hidden></div>
      <iframe id="yt-frame" class="mu-frame" allowfullscreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>`,
    link: `<div class="mu-bar"><input id="ln-url" class="input-text" placeholder="URL de música o video (mp3, mp4, Spotify, YouTube, SoundCloud…)"><button class="btn-primary" id="ln-go">Reproducir</button></div>
      <div id="ln-stage" class="mu-stage"></div>`
  };
  Object.entries(panels).forEach(([k, html]) => { const d = document.createElement('div'); d.className = 'window-body mu-panel'; d.id = 'mu-' + k; d.hidden = true; d.innerHTML = html; win.appendChild(d); });
  function musicTab(name) {
    bar.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mt === name));
    local.style.display = name === 'local' ? '' : 'none';
    Object.keys(panels).forEach(k => { $('#mu-' + k).hidden = k !== name; });
    if (name === 'spotify' && !$('#sp-frame').src) spEmbed('playlist', '37i9dQZEVXbMDoHDwVN2tF');
  }
  bar.addEventListener('click', e => { const b = e.target.closest('[data-mt]'); if (b) musicTab(b.dataset.mt); });
  E.musicTab = musicTab; window.EISEN.musicTab = musicTab;

  /* ---------- Rutas de enlaces ---------- */
  function route(raw) {
    const v = String(raw || '').trim(); if (!v) return null;
    let m = v.match(/^spotify:(track|album|playlist|artist|show|episode):(\w+)/i); if (m) return { t: 'spotify', kind: m[1], id: m[2] };
    let u; try { u = new URL(/^https?:/i.test(v) ? v : (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(v) ? 'https://' + v : '')); } catch { u = null; }
    if (!u) return { t: 'search', q: v };
    const h = u.hostname.replace(/^www\.|^m\./, '');
    if (h === 'open.spotify.com' || h === 'spotify.link') { m = u.pathname.match(/\/(track|album|playlist|artist|show|episode)\/(\w+)/); if (m) return { t: 'spotify', kind: m[1], id: m[2] }; }
    if (/(^|\.)youtube(-nocookie)?\.com$|^youtu\.be$/.test(h)) {
      const list = u.searchParams.get('list');
      let id = h === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || (u.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/) || [])[2];
      if (id) return { t: 'youtube', id, list };
      if (list) return { t: 'youtube', list };
      if (u.pathname === '/results') return { t: 'search', q: u.searchParams.get('search_query') || '' };
    }
    if (/soundcloud\.com$/.test(h)) return { t: 'soundcloud', url: u.href };
    if (/\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?|#|$)/i.test(u.href)) return { t: 'audio', url: u.href };
    if (/\.(mp4|webm|mov|m3u8)(\?|#|$)/i.test(u.href)) return { t: 'video', url: u.href };
    return { t: 'page', url: u.href };
  }

  /* ---------- Spotify ---------- */
  const spFrame = $('#sp-frame');
  function spEmbed(kind, id) { spFrame.src = `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`; }
  function spLoad(raw) {
    const r = route(raw);
    if (r && r.t === 'spotify') { spEmbed(r.kind, r.id); return true; }
    toast('Pega un enlace de Spotify válido'); return false;
  }
  $('#sp-load').onclick = () => spLoad($('#sp-url').value);
  $('#sp-url').addEventListener('keydown', e => { if (e.key === 'Enter') spLoad(e.target.value); });
  $('#sp-login').onclick = () => { window.open('https://accounts.spotify.com/login', 'spotify_login', 'width=480,height=720'); toast('Inicia sesión en la ventana y luego recarga el reproductor'); };
  const spRedirect = () => location.origin + location.pathname;
  const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const spTok = () => storage.get('sp_tok', null);
  async function spToken() {
    let t = spTok(); if (!t) return '';
    if (Date.now() < t.exp - 30000) return t.access;
    try {
      const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: storage.get('sp_client', ''), grant_type: 'refresh_token', refresh_token: t.refresh }) });
      const j = await r.json(); if (!j.access_token) throw 0; spSave(j, t.refresh); return j.access_token;
    } catch { storage.set('sp_tok', null); spStatus(); return ''; }
  }
  function spSave(j, oldRefresh) { storage.set('sp_tok', { access: j.access_token, refresh: j.refresh_token || oldRefresh, exp: Date.now() + (j.expires_in || 3600) * 1000 }); }
  async function spApi(path) { const tk = await spToken(); if (!tk) throw new Error('auth'); const r = await fetch('https://api.spotify.com/v1' + path, { headers: { authorization: 'Bearer ' + tk } }); if (!r.ok) throw new Error('api'); return r.json(); }
  async function spStatus() {
    const st = $('#sp-status'), on = !!spTok();
    $('#sp-search').hidden = !on; $('#sp-connect').hidden = on;
    if (!on) { st.textContent = ''; $('#sp-results').hidden = true; return; }
    try { const me = await spApi('/me'); st.textContent = tr('Conectado como') + ' ' + (me.display_name || me.id); } catch { st.textContent = ''; }
  }
  async function spConnect() {
    const cid = storage.get('sp_client', '');
    if (!cid) { toast('Primero escribe tu Spotify Client ID en Ajustes › Aplicaciones vinculadas'); E.openWindow('settings'); return; }
    const verifier = b64u(crypto.getRandomValues(new Uint8Array(48)));
    const challenge = b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const state = b64u(crypto.getRandomValues(new Uint8Array(12)));
    const url = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({ client_id: cid, response_type: 'code', redirect_uri: spRedirect(), scope: 'user-read-private playlist-read-private user-library-read', code_challenge_method: 'S256', code_challenge: challenge, state });
    localStorage.setItem('eisen_sp_state', state);
    const bc = new BroadcastChannel('eisen_spotify');
    const got = new Promise(res => { bc.onmessage = e => res(e.data); setTimeout(() => res(null), 240000); });
    if (!window.open(url, 'spotify_auth', 'width=480,height=720')) { toast('Permite las ventanas emergentes para iniciar sesión'); return; }
    const msg = await got; bc.close();
    if (!msg || msg.state !== state || !msg.code) { toast('No se pudo conectar con Spotify'); return; }
    try {
      const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: cid, grant_type: 'authorization_code', code: msg.code, redirect_uri: spRedirect(), code_verifier: verifier }) });
      const j = await r.json(); if (!j.access_token) throw 0; spSave(j); toast('Spotify conectado'); spStatus();
    } catch { toast('Spotify rechazó la conexión: revisa el Client ID y la Redirect URI'); }
  }
  $('#sp-connect').onclick = spConnect;
  function spRows(items) {
    const box = $('#sp-results'); box.hidden = false;
    box.innerHTML = items.length ? items.map(i => `<div class="mu-row" data-k="${esc(i.kind)}" data-id="${esc(i.id)}"><b>${esc(i.name)}</b><span>${esc(i.sub)}</span></div>`).join('') : `<div class="mu-small" style="padding:10px">${esc(tr('Sin resultados'))}</div>`;
  }
  $('#sp-results').addEventListener('click', e => { const r = e.target.closest('[data-id]'); if (r) spEmbed(r.dataset.k, r.dataset.id); });
  async function spSearch() {
    const q = $('#sp-q').value.trim(); if (!q) return;
    try {
      const j = await spApi('/search?limit=8&type=track,album,playlist,artist&q=' + encodeURIComponent(q));
      const out = [];
      (j.tracks.items || []).forEach(x => out.push({ kind: 'track', id: x.id, name: '🎵 ' + x.name, sub: x.artists.map(a => a.name).join(', ') }));
      (j.albums.items || []).forEach(x => x && out.push({ kind: 'album', id: x.id, name: '💿 ' + x.name, sub: x.artists.map(a => a.name).join(', ') }));
      (j.playlists.items || []).forEach(x => x && out.push({ kind: 'playlist', id: x.id, name: '📃 ' + x.name, sub: x.owner && x.owner.display_name || '' }));
      (j.artists.items || []).forEach(x => x && out.push({ kind: 'artist', id: x.id, name: '🎤 ' + x.name, sub: '' }));
      spRows(out);
    } catch { toast('Spotify rechazó la conexión: revisa el Client ID y la Redirect URI'); }
  }
  $('#sp-go').onclick = spSearch; $('#sp-q').addEventListener('keydown', e => { if (e.key === 'Enter') spSearch(); });
  $('#sp-mine').onclick = async () => { try { const j = await spApi('/me/playlists?limit=40'); spRows(j.items.filter(Boolean).map(x => ({ kind: 'playlist', id: x.id, name: '📃 ' + x.name, sub: (x.tracks && x.tracks.total != null ? x.tracks.total + ' ' : '') + '♪' }))); } catch { toast('No se pudieron cargar tus playlists'); } };
  spStatus();

  /* ---------- YouTube ---------- */
  const ytFrame = $('#yt-frame');
  function ytPlay(id, list) {
    ytFrame.src = list && !id ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}&autoplay=1` : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0${list ? '&list=' + encodeURIComponent(list) : ''}`;
  }
  async function ytGo(raw) {
    const r = route(raw); if (!r) return;
    if (r.t === 'youtube') { ytPlay(r.id, r.list); $('#yt-results').hidden = true; return; }
    if (r.t !== 'search') { toast('Escribe una búsqueda o pega un enlace de YouTube'); return; }
    const box = $('#yt-results'); box.hidden = false; box.innerHTML = `<div class="mu-small" style="padding:10px">…</div>`;
    try {
      const v = await E.ytSearch(r.q);
      box.innerHTML = v.length ? v.slice(0, 24).map(x => `<div class="mu-row mu-yt" data-id="${esc(x.id)}"><img loading="lazy" src="https://i.ytimg.com/vi/${esc(x.id)}/mqdefault.jpg"><div><b>${esc(x.title)}</b><span>${esc(x.channel)} ${x.len ? '· ' + esc(x.len) : ''}</span></div></div>`).join('') : `<div class="mu-small" style="padding:10px">${esc(tr('Sin resultados'))}. ${esc(tr('Puedes añadir una clave API de YouTube en Ajustes › Aplicaciones vinculadas.'))}</div>`;
    } catch { box.innerHTML = `<div class="mu-small" style="padding:10px">${esc(tr('Sin resultados'))}. ${esc(tr('Puedes añadir una clave API de YouTube en Ajustes › Aplicaciones vinculadas.'))}</div>`; }
  }
  $('#yt-go').onclick = () => ytGo($('#yt-q').value); $('#yt-q').addEventListener('keydown', e => { if (e.key === 'Enter') ytGo(e.target.value); });
  $('#yt-results').addEventListener('click', e => { const r = e.target.closest('[data-id]'); if (r) { ytPlay(r.dataset.id); $('#yt-results').hidden = true; } });

  /* ---------- Enlace (cualquier URL) ---------- */
  function linkGo(raw) {
    const r = route(raw), st = $('#ln-stage'); if (!r) return;
    if (r.t === 'spotify') { musicTab('spotify'); spEmbed(r.kind, r.id); return; }
    if (r.t === 'youtube') { musicTab('youtube'); ytPlay(r.id, r.list); return; }
    if (r.t === 'search') { musicTab('youtube'); $('#yt-q').value = r.q; ytGo(r.q); return; }
    if (r.t === 'soundcloud') st.innerHTML = `<iframe class="mu-frame" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(r.url)}&auto_play=true"></iframe>`;
    else if (r.t === 'audio') st.innerHTML = `<div class="mu-media"><div style="font-size:60px">🎧</div><audio controls autoplay src="${esc(r.url)}" style="width:100%"></audio></div>`;
    else if (r.t === 'video') st.innerHTML = `<video controls autoplay src="${esc(r.url)}" style="width:100%;max-height:100%;background:#000"></video>`;
    else { E.ebOpenUrl(r.url, true); toast('Abierto en el Navegador EISEN'); }
  }
  $('#ln-go').onclick = () => linkGo($('#ln-url').value); $('#ln-url').addEventListener('keydown', e => { if (e.key === 'Enter') linkGo(e.target.value); });

  /* ---------- Ajustes: aplicaciones vinculadas ---------- */
  $('#cfg-yt-key').value = storage.get('yt_key', ''); $('#cfg-yt-key').onchange = e => storage.set('yt_key', e.target.value.trim());
  $('#cfg-sp-client').value = storage.get('sp_client', ''); $('#cfg-sp-client').onchange = e => { storage.set('sp_client', e.target.value.trim()); };
  $('#cfg-sp-redirect').textContent = 'Redirect URI: ' + spRedirect() + (location.hostname === 'localhost' ? '  (Spotify exige 127.0.0.1: abre http://127.0.0.1:' + (location.port || 80) + ')' : '');
  $('#cfg-btn-clear-sites').onclick = () => { storage.set('site_mode', {}); toast('Reglas por sitio borradas'); };

  /* ---------- Terminal ampliada ---------- */
  const log = $('#term-log'), inp = $('#term-input-cmd'), hist = []; let hi = 0;
  const t0 = Date.now(), out = s => { log.innerHTML += esc(String(s)) + '\n'; log.scrollTop = log.scrollHeight; };
  const fs = () => E.virtualFS, files = () => fs().filter(f => f.folder === E.folder());
  const wins = () => [...document.querySelectorAll('.window')];
  const FORTUNES = ['Quien persevera, alcanza.', 'Hoy es un buen día para compilar sin errores.', 'El mejor código es el que no se escribe.', 'Haz una copia de seguridad antes de presumir.', 'Un paso a la vez llega lejos.'];
  const JOKES = ['¿Por qué los programadores confunden Halloween y Navidad? Porque OCT 31 == DEC 25.', 'Hay 10 tipos de personas: las que entienden binario y las que no.', 'Un SQL entra a un bar, se acerca a dos mesas y pregunta: ¿puedo unirme?'];
  const MORSE = { a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  const C = {
    help: ['Lista de comandos (help <comando>)', a => { if (a[0] && C[a[0]]) return a[0] + ' - ' + C[a[0]][0]; return 'Comandos disponibles (' + Object.keys(C).length + '):\n' + Object.keys(C).sort().map(k => '  ' + k.padEnd(11) + '- ' + C[k][0]).join('\n'); }],
    clear: ['Limpia la pantalla', () => { log.innerHTML = ''; return ''; }],
    ls: ['Lista archivos de la carpeta actual', async () => { const v = (await E.vaultAll()).filter(f => f.folder === E.folder()).map(f => `  ${f.name} (${Math.max(1, Math.round(f.size / 1024))} KB)`); return files().map(f => `  ${f.name} (${f.size})`).concat(v).join('\n') || '(vacío)'; }],
    dir: ['Igual que ls', (a, r) => C.ls[1](a, r)],
    neofetch: ['Especificaciones del sistema', () => '  .---.      OS: ' + (window.EISENKU && EISENKU.label || 'EISENKU OS') + '\n /     \\     Kernel: HTML5 / ES2020 Web Desktop\n| () () |    Shell: EISEN Terminal Pro\n \\  _  /     Apps: EISEN Store\n  `---`      Memoria: ' + (navigator.deviceMemory || '?') + ' GB · ' + navigator.hardwareConcurrency + ' CPU'],
    date: ['Fecha y hora actual', () => new Date().toString()],
    time: ['Hora actual', () => new Date().toLocaleTimeString()],
    echo: ['Muestra un texto', (a, r) => r.replace(/^echo\s*/i, '')],
    pwd: ['Carpeta actual', () => '/Este Equipo/' + E.folder()],
    whoami: ['Usuario actual', () => 'eisen'],
    hostname: ['Nombre del equipo', () => 'eisen-desktop'],
    uname: ['Información del sistema', () => 'EISENKU 8.0 web x86_64 ' + navigator.platform],
    uptime: ['Tiempo encendido', () => { const s = Math.floor((Date.now() - t0) / 1000); return `up ${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m ${s % 60}s`; }],
    cal: ['Calendario del mes', () => { const d = new Date(), y = d.getFullYear(), m = d.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(); let o = d.toLocaleString('es', { month: 'long', year: 'numeric' }) + '\nLu Ma Mi Ju Vi Sa Do\n' + '   '.repeat(first); for (let i = 1; i <= n; i++) { o += String(i).padStart(2) + ((first + i) % 7 === 0 ? '\n' : ' '); } return o; }],
    history: ['Historial de comandos', () => hist.map((h, i) => `  ${i + 1}  ${h}`).join('\n')],
    cat: ['Muestra un archivo (cat nombre)', async a => { const n = a[0]; if (!n) return 'Uso: cat <archivo>'; const v = (await E.vaultAll()).find(f => f.name === n); if (v) return /^(text|application\/json)|\.(txt|csv|json|md|html)$/i.test(v.type + v.name) ? await v.blob.text() : '(archivo binario)'; return fs().find(f => f.name === n) ? '(archivo virtual sin contenido)' : 'cat: ' + n + ': no existe'; }],
    touch: ['Crea un archivo vacío', a => { if (!a[0]) return 'Uso: touch <nombre>'; fs().push({ name: a[0], type: 'text', folder: E.folder(), size: '0 KB' }); E.fsSave(); return 'Creado ' + a[0]; }],
    mkdir: ['Crea una carpeta', a => { if (!a[0]) return 'Uso: mkdir <nombre>'; fs().push({ name: a[0], type: 'folder', folder: E.folder(), size: '--' }); E.fsSave(); return 'Carpeta ' + a[0] + ' creada'; }],
    rm: ['Elimina un archivo', async a => { const n = a[0]; if (!n) return 'Uso: rm <nombre>'; const i = fs().findIndex(f => f.name === n && f.folder === E.folder()); if (i >= 0) { fs().splice(i, 1); E.fsSave(); return 'Eliminado ' + n; } return 'rm: ' + n + ': no existe'; }],
    files: ['Abre el Explorador de Archivos', () => { E.openWindow('explorer'); return 'Abriendo explorador…'; }],
    open: ['Abre una URL o app (open <url>)', (a, r) => { const v = r.replace(/^open\s*/i, '').trim(); if (!v) return 'Uso: open <url|app>'; E.ebOpenUrl(v, true); return 'Abriendo ' + v; }],
    search: ['Busca en la web', (a, r) => { const v = r.replace(/^search\s*/i, '').trim(); if (!v) return 'Uso: search <texto>'; E.ebOpenUrl(v, true); return 'Buscando…'; }],
    wallpaper: ['Cambia el fondo (wallpaper <url>)', a => { if (!a[0]) return 'Uso: wallpaper <url-imagen>'; return E.setWallpaperUrl(a[0]) ? 'Fondo actualizado' : 'URL no válida'; }],
    theme: ['Cambia el tema (dark|light|midnight)', a => { const s = $('#cfg-theme'); if (!['dark', 'light', 'midnight'].includes(a[0])) return 'Uso: theme dark|light|midnight'; s.value = a[0]; s.dispatchEvent(new Event('change')); return 'Tema ' + a[0]; }],
    lang: ['Cambia el idioma (es|en|pt|fr|de)', a => { if (!window.EISEN_I18N.langs[a[0]]) return 'Uso: lang es|en|pt|fr|de'; window.EISEN_I18N.setLang(a[0]); return 'Idioma: ' + window.EISEN_I18N.langs[a[0]]; }],
    accent: ['Color de acento (accent #hex)', a => { if (!/^#[0-9a-f]{6}$/i.test(a[0] || '')) return 'Uso: accent #0078d4'; const s = $('#cfg-accent'); s.value = a[0]; s.dispatchEvent(new Event('input')); return 'Acento ' + a[0]; }],
    calc: ['Calculadora (calc 2*(3+4), sin(pi/2), 2^10)', (a, r) => { const x = r.replace(/^calc\s*/i, '').trim(); if (!x) return 'Uso: calc <operación>'; try { const v = E.math.eval(x); return Number.isFinite(v) ? String(+v.toFixed(12)) : 'Resultado no válido'; } catch (e) { return 'Error: ' + e.message; } }], // 9.0: sin Function() (compatible con CSP)
    rand: ['Número aleatorio (rand min max)', a => { const lo = +a[0] || 0, hi = a[1] !== undefined ? +a[1] : (a[0] !== undefined ? 0 : 100); const [m, M] = lo <= hi ? [lo, hi] : [hi, lo]; return String(Math.floor(Math.random() * (M - m + 1)) + m); }],
    base64: ['Codifica en base64', (a, r) => btoa(unescape(encodeURIComponent(r.replace(/^base64\s*/i, ''))))],
    unbase64: ['Decodifica base64', (a, r) => { try { return decodeURIComponent(escape(atob(r.replace(/^unbase64\s*/i, '').trim()))); } catch { return 'Base64 inválido'; } }],
    upper: ['Texto en MAYÚSCULAS', (a, r) => r.replace(/^upper\s*/i, '').toUpperCase()],
    lower: ['Texto en minúsculas', (a, r) => r.replace(/^lower\s*/i, '').toLowerCase()],
    rev: ['Invierte un texto', (a, r) => [...r.replace(/^rev\s*/i, '')].reverse().join('')],
    wc: ['Cuenta palabras y letras', (a, r) => { const t = r.replace(/^wc\s*/i, ''); return `${t.trim() ? t.trim().split(/\s+/).length : 0} palabras, ${t.length} caracteres`; }],
    sort: ['Ordena palabras', (a) => [...a].sort((x, y) => x.localeCompare(y)).join(' ')],
    cowsay: ['La vaca habla', (a, r) => { const t = r.replace(/^cowsay\s*/i, '') || 'Muu'; return ` ${'_'.repeat(t.length + 2)}\n< ${t} >\n ${'-'.repeat(t.length + 2)}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`; }],
    fortune: ['Frase del día', () => FORTUNES[Math.floor(Math.random() * FORTUNES.length)]],
    joke: ['Un chiste de programadores', () => JOKES[Math.floor(Math.random() * JOKES.length)]],
    coin: ['Lanza una moneda', () => Math.random() < .5 ? 'Cara' : 'Cruz'],
    dice: ['Lanza dados (dice 2)', a => { const n = Math.min(20, Math.max(1, +a[0] || 1)); return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6)).join(' '); }],
    ping: ['Prueba de conexión simulada', async a => { const h = a[0] || 'localhost'; return [1, 2, 3, 4].map(i => `Respuesta de ${h}: bytes=32 tiempo=${10 + Math.floor(Math.random() * 40)}ms (${i}/4)`).join('\n') + '\n(simulado)'; }],
    ipconfig: ['Estado de red', () => `Conexión: ${navigator.onLine ? 'en línea' : 'sin conexión'}\nTipo: ${(navigator.connection && navigator.connection.effectiveType) || 'desconocido'}\nIdioma: ${navigator.language}\nHost: ${location.host || 'archivo local'}`],
    df: ['Uso de almacenamiento', async () => { try { const e = await navigator.storage.estimate(); return `Usado: ${(e.usage / 1048576).toFixed(1)} MB de ${(e.quota / 1048576).toFixed(0)} MB`; } catch { return 'No disponible'; } }],
    free: ['Memoria del navegador', () => performance.memory ? `Usada: ${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB / ${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(0)} MB` : 'No disponible en este navegador'],
    ps: ['Ventanas abiertas', () => wins().filter(w => w.classList.contains('open')).map((w, i) => `  ${String(i + 100)}  ${w.id.replace('win-', '')}${w.classList.contains('minimized') ? ' (minimizada)' : ''}`).join('\n') || '(ninguna)'],
    env: ['Variables de entorno', () => `USER=eisen\nLANG=${window.EISEN_I18N.lang}\nTHEME=${document.documentElement.dataset.theme}\nSHELL=eisen-term\nHOST=${location.host}`],
    banner: ['Texto grande', (a, r) => '█ ' + r.replace(/^banner\s*/i, '').toUpperCase().split('').join(' ') + ' █'],
    morse: ['Texto a morse', (a, r) => r.replace(/^morse\s*/i, '').toLowerCase().split('').map(c => c === ' ' ? '/' : MORSE[c] || '').join(' ')],
    hex: ['Número a hexadecimal', a => isNaN(+a[0]) ? 'Uso: hex <número>' : (+a[0]).toString(16).toUpperCase()],
    bin: ['Número a binario', a => isNaN(+a[0]) ? 'Uso: bin <número>' : (+a[0]).toString(2)],
    fact: ['Factorial (fact 5)', a => { const n = +a[0]; if (!(n >= 0 && n <= 170 && Number.isInteger(n))) return 'Uso: fact <0-170>'; let r = 1n; for (let i = 2n; i <= BigInt(n); i++) r *= i; return String(r); }],
    fib: ['Serie Fibonacci (fib 10)', a => { const n = Math.min(60, +a[0] || 10); let x = 0n, y = 1n; const o = []; for (let i = 0; i < n; i++) { o.push(x); [x, y] = [y, x + y]; } return o.join(' '); }],
    prime: ['¿Es primo? (prime 97)', a => { const n = +a[0]; if (!Number.isInteger(n) || n < 2) return 'false'; for (let i = 2; i * i <= n; i++) if (n % i === 0) return 'false'; return 'true'; }],
    sqrt: ['Raíz cuadrada', a => isNaN(+a[0]) ? 'Uso: sqrt <número>' : String(Math.sqrt(+a[0]))],
    pi: ['Valor de π', () => String(Math.PI)],
    tree: ['Árbol de carpetas', () => '/Este Equipo\n├── documents\n├── images\n├── music\n└── downloads'],
    find: ['Busca archivos por nombre', async a => { const q = (a[0] || '').toLowerCase(); if (!q) return 'Uso: find <texto>'; const r = fs().filter(f => f.name.toLowerCase().includes(q)).map(f => `${f.folder}/${f.name}`).concat((await E.vaultAll()).filter(f => f.name.toLowerCase().includes(q)).map(f => `${f.folder}/${f.name}`)); return r.join('\n') || 'Sin resultados'; }],
    apps: ['Lista apps del catálogo (apps texto)', a => { const q = (a[0] || '').toLowerCase(); const l = E.apps().filter(x => !q || (x.name + x.cat).toLowerCase().includes(q)); return l.slice(0, 60).map(x => `  ${x.id.padEnd(16)} ${x.name}`).join('\n') + `\n(${l.length} apps)`; }],
    run: ['Ejecuta una app o ventana (run excel)', (a, r) => { const n = (a[0] || '').toLowerCase(); if (!n) return 'Uso: run <app>'; const w = wins().find(x => x.id === 'win-' + n); if (w) { E.openWindow(n); return 'Abriendo ' + n; } const app = E.apps().find(x => x.id === n || x.name.toLowerCase().includes(r.replace(/^run\s*/i, '').toLowerCase())); if (app && app.ext) { E.ebOpenUrl(app.ext, true); return 'Abriendo ' + app.name; } if (app) { E.openWindow(app.id); return 'Abriendo ' + app.name; } return 'App no encontrada'; }],
    exit: ['Cierra la terminal', () => { const b = $('#win-terminal [data-act=close]'); if (b) b.click(); return ''; }],
    reboot: ['Reinicia la interfaz', () => { setTimeout(() => location.reload(), 400); return 'Reiniciando…'; }],
    sha256: ['Hash SHA-256 de un texto', async (a, r) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(r.replace(/^sha256\s*/i, ''))))],
    uuid: ['Genera un UUID', () => crypto.randomUUID ? crypto.randomUUID() : 'no disponible'],
    pass: ['Contraseña aleatoria (pass 16)', a => { const n = Math.min(64, Math.max(6, +a[0] || 16)), ch = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*'; return [...crypto.getRandomValues(new Uint8Array(n))].map(x => ch[x % ch.length]).join(''); }],
    color: ['HEX a RGB (color #ff8800)', a => { const m = (a[0] || '').match(/^#?([0-9a-f]{6})$/i); if (!m) return 'Uso: color #rrggbb'; const n = parseInt(m[1], 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; }],
    guide: ['Abre la guía de inicio', () => { E.guide && E.guide(); return 'Abriendo guía…'; }],
    youtube: ['Busca en YouTube (youtube texto)', (a, r) => { E.openWindow('music'); window.EISEN.musicTab('youtube'); const v = r.replace(/^youtube\s*/i, ''); if (v) { $('#yt-q').value = v; ytGo(v); } return 'Abriendo YouTube…'; }],
    spotify: ['Abre Spotify (spotify enlace)', (a) => { E.openWindow('music'); window.EISEN.musicTab('spotify'); if (a[0]) { $('#sp-url').value = a[0]; spLoad(a[0]); } return 'Abriendo Spotify…'; }],
    download: ['Descarga una URL a EISEN (download url)', a => { if (!a[0]) return 'Uso: download <url>'; E.importFromUrl(a[0], E.folder()); return 'Descargando…'; }]
  };
  async function exec(raw) {
    const cmd = raw.trim(); if (!cmd) return;
    hist.push(cmd); hi = hist.length;
    const a = (cmd.match(/"[^"]*"|\S+/g) || []).map(x => x.replace(/^"|"$/g, '')), name = (a.shift() || '').toLowerCase();
    if (C[name]) { try { const r = await C[name][1](a, cmd); if (r) out(r); } catch (e) { out('Error: ' + e.message); } }
    else out(`Comando no reconocido: ${name}. Escribe 'help'.`);
  }
  inp.onkeydown = e => {
    if (e.key === 'Enter') { const c = inp.value; log.innerHTML += 'eisen@desktop:~$ ' + esc(c) + '\n'; inp.value = ''; exec(c); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) inp.value = hist[--hi]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); inp.value = hi < hist.length - 1 ? hist[++hi] : (hi = hist.length, ''); }
  };
  window.EISEN.termCmds = C; window.EISEN.termOut = out;
  window.EISEN.termCount = Object.keys(C).length;
})();

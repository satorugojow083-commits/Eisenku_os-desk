/* EISENKU OS 8 · Apps de Internet, multimedia, sistema, creatividad y desarrollo */
(() => {
  'use strict';
  const E = window.EISEN, storage = E.storage, esc = E.esc, toast = E.toast, R = E.registerApp;
  const $in = (root, s) => root.querySelector(s), $$in = (root, s) => [...root.querySelectorAll(s)];
  const isOpen = b => b.closest('.window').classList.contains('open') && !b.closest('.window').classList.contains('minimized');

  /* ============ CLIMA (Open-Meteo, sin clave) ============ */
  const WMO = { 0: ['☀️', 'Despejado'], 1: ['🌤️', 'Mayormente despejado'], 2: ['⛅', 'Parcialmente nublado'], 3: ['☁️', 'Nublado'], 45: ['🌫️', 'Niebla'], 48: ['🌫️', 'Niebla con escarcha'], 51: ['🌦️', 'Llovizna ligera'], 53: ['🌦️', 'Llovizna'], 55: ['🌧️', 'Llovizna intensa'], 61: ['🌧️', 'Lluvia ligera'], 63: ['🌧️', 'Lluvia'], 65: ['🌧️', 'Lluvia fuerte'], 66: ['🌧️', 'Lluvia helada'], 67: ['🌧️', 'Lluvia helada fuerte'], 71: ['🌨️', 'Nieve ligera'], 73: ['🌨️', 'Nieve'], 75: ['❄️', 'Nieve fuerte'], 77: ['🌨️', 'Granizo fino'], 80: ['🌦️', 'Chubascos'], 81: ['🌧️', 'Chubascos fuertes'], 82: ['⛈️', 'Chubascos violentos'], 85: ['🌨️', 'Chubascos de nieve'], 86: ['❄️', 'Nevadas fuertes'], 95: ['⛈️', 'Tormenta'], 96: ['⛈️', 'Tormenta con granizo'], 99: ['⛈️', 'Tormenta fuerte'] };
  const wmo = c => WMO[c] || ['🌡️', '—'];
  E.weatherNow = async (loc) => {
    loc = loc || storage.get('weather_loc', null); if (!loc) return null;
    const j = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&forecast_days=7`)).json();
    return j;
  };
  E.wmo = wmo;
  R({
    id: 'weather', name: 'Clima', icon: '⛅', cat: 'Internet', grad: ['#0284c7', '#fde68a'], w: 760, h: 560,
    desc: 'Pronóstico real de 7 días por ciudad o ubicación (Open-Meteo).', kw: 'tiempo pronostico temperatura lluvia',
    features: ['Clima actual y por horas', 'Pronóstico de 7 días', 'Muestra la temperatura en la barra de tareas'],
    init(b) {
      b.innerHTML = `<div class="ap-col"><form class="ap-row" data-f><input class="input-text" data-q placeholder="Ciudad (p. ej. Guadalajara)" style="flex:1"><button class="btn-primary">Buscar</button><button type="button" class="btn-secondary" data-geo>📍 Mi ubicación</button></form><div data-res class="ap-col"></div><div data-out><p class="ap-empty">Busca una ciudad para ver el clima.</p></div></div>`;
      async function load(loc) {
        $in(b, '[data-out]').innerHTML = '<p class="ap-empty">Cargando…</p>';
        try {
          const j = await E.weatherNow(loc); storage.set('weather_loc', loc); document.dispatchEvent(new CustomEvent('eisen:weather'));
          const c = j.current, [ic, tx] = wmo(c.weather_code), d = j.daily, h = j.hourly, nowI = h.time.findIndex(t => t >= c.time);
          $in(b, '[data-out]').innerHTML = `<div class="wx-now"><div class="wx-ic">${ic}</div><div><h2>${Math.round(c.temperature_2m)}°C <small>${esc(loc.name)}</small></h2><p>${tx} · Sensación ${Math.round(c.apparent_temperature)}° · Humedad ${c.relative_humidity_2m}% · Viento ${Math.round(c.wind_speed_10m)} km/h</p><p class="eis-muted">Amanecer ${d.sunrise[0].slice(11)} · Atardecer ${d.sunset[0].slice(11)}</p></div></div>
            <div class="wx-hours">${h.time.slice(Math.max(0, nowI), Math.max(0, nowI) + 24).map((t, i) => `<div><small>${t.slice(11, 16)}</small><span>${wmo(h.weather_code[nowI + i])[0]}</span><b>${Math.round(h.temperature_2m[nowI + i])}°</b></div>`).join('')}</div>
            <div class="wx-days">${d.time.map((t, i) => `<div class="ap-card"><b>${i ? new Date(t + 'T12:00').toLocaleDateString([], { weekday: 'short', day: 'numeric' }) : 'Hoy'}</b><span class="wx-dic">${wmo(d.weather_code[i])[0]}</span><span>${Math.round(d.temperature_2m_max[i])}° / <small>${Math.round(d.temperature_2m_min[i])}°</small></span><small>💧 ${d.precipitation_probability_max[i] ?? 0}%</small></div>`).join('')}</div><p class="eis-muted" style="font-size:11px">Datos: Open-Meteo.com</p>`;
        } catch { $in(b, '[data-out]').innerHTML = '<p class="ap-empty">No se pudo obtener el clima (¿sin conexión?).</p>'; }
      }
      $in(b, '[data-f]').onsubmit = async e => {
        e.preventDefault(); const q = $in(b, '[data-q]').value.trim(); if (!q) return;
        try { const j = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=6&language=es&name=${encodeURIComponent(q)}`)).json();
          $in(b, '[data-res]').innerHTML = (j.results || []).map((r, i) => `<button class="ap-item" data-i="${i}">📍 <b>${esc(r.name)}</b> <span>${esc([r.admin1, r.country].filter(Boolean).join(', '))}</span></button>`).join('') || '<p class="ap-empty">No se encontró esa ciudad.</p>';
          $in(b, '[data-res]').onclick = ev => { const it = ev.target.closest('[data-i]'); if (!it) return; const r = j.results[+it.dataset.i]; $in(b, '[data-res]').innerHTML = ''; load({ name: r.name + (r.country ? ', ' + r.country : ''), lat: r.latitude, lon: r.longitude }); };
        } catch { toast('Sin conexión'); }
      };
      $in(b, '[data-geo]').onclick = () => { if (!navigator.geolocation) return toast('Tu navegador no permite ubicación'); navigator.geolocation.getCurrentPosition(p => load({ name: 'Mi ubicación', lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }), () => toast('Permiso de ubicación denegado')); };
      const saved = storage.get('weather_loc', null); if (saved) load(saved);
    }
  });

  /* ============ TRADUCTOR (MyMemory, sin clave) ============ */
  const LANGS = { es: 'Español', en: 'Inglés', pt: 'Portugués', fr: 'Francés', de: 'Alemán', it: 'Italiano', ja: 'Japonés', ko: 'Coreano', zh: 'Chino', ru: 'Ruso', ar: 'Árabe', nah: 'Náhuatl' };
  E.translate = async (text, from, to) => { const j = await (await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 480))}&langpair=${from}|${to}`)).json(); if (j.responseStatus !== 200 && j.responseStatus !== '200') throw new Error(j.responseDetails || 'error'); return j.responseData.translatedText; };
  R({
    id: 'translator', name: 'Traductor', icon: '🔤', cat: 'Internet', grad: ['#2563eb', '#f472b6'], w: 780, h: 460,
    desc: 'Traduce textos entre 12 idiomas y escucha la pronunciación.', kw: 'traducir ingles idiomas',
    features: ['12 idiomas', 'Lectura en voz alta', 'Historial de traducciones'],
    init(b) {
      const opt = v => Object.entries(LANGS).map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${l}</option>`).join('');
      b.innerHTML = `<div class="tr"><div class="ap-row"><select class="input-text" data-from>${opt('es')}</select><button class="btn-secondary" data-sw>⇄</button><select class="input-text" data-to>${opt('en')}</select><button class="btn-primary" data-go>Traducir</button></div><div class="tr-boxes"><div><textarea class="input-text" data-src rows="8" maxlength="480" placeholder="Escribe el texto (máx. 480 caracteres)"></textarea><div class="ap-row"><button class="ap-ico" data-say="src">🔊</button><small class="eis-muted" data-cnt>0/480</small></div></div><div><textarea class="input-text" data-dst rows="8" readonly placeholder="Traducción"></textarea><div class="ap-row"><button class="ap-ico" data-say="dst">🔊</button><button class="ap-ico" data-copy>📋</button></div></div></div><div data-hist class="ap-col"></div><p class="eis-muted" style="font-size:11px">Servicio: MyMemory (límite diario gratuito por dispositivo)</p></div>`;
      const H = storage.get('tr_hist', []);
      const hist = () => $in(b, '[data-hist]').innerHTML = H.slice(0, 5).map(h => `<div class="ap-card"><small class="eis-muted">${h.f}→${h.t}</small> ${esc(h.s)} → <b>${esc(h.d)}</b></div>`).join('');
      const go = async () => { const s = $in(b, '[data-src]').value.trim(); if (!s) return; $in(b, '[data-dst]').value = 'Traduciendo…'; const f = $in(b, '[data-from]').value, t = $in(b, '[data-to]').value; try { const d = await E.translate(s, f, t); $in(b, '[data-dst]').value = d; H.unshift({ f, t, s: s.slice(0, 80), d: d.slice(0, 120) }); storage.set('tr_hist', H.slice(0, 20)); hist(); } catch (e) { $in(b, '[data-dst]').value = 'No se pudo traducir: ' + e.message; } };
      $in(b, '[data-go]').onclick = go; $in(b, '[data-src]').onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) go(); };
      $in(b, '[data-src]').oninput = e => $in(b, '[data-cnt]').textContent = e.target.value.length + '/480';
      $in(b, '[data-sw]').onclick = () => { const f = $in(b, '[data-from]'), t = $in(b, '[data-to]'); [f.value, t.value] = [t.value, f.value]; const s = $in(b, '[data-src]'), d = $in(b, '[data-dst]'); [s.value, d.value] = [d.value, s.value]; };
      b.addEventListener('click', e => { const s = e.target.closest('[data-say]'); if (s) { const txt = $in(b, s.dataset.say === 'src' ? '[data-src]' : '[data-dst]').value; const u = new SpeechSynthesisUtterance(txt); u.lang = $in(b, s.dataset.say === 'src' ? '[data-from]' : '[data-to]').value; speechSynthesis.cancel(); speechSynthesis.speak(u); } if (e.target.closest('[data-copy]')) { navigator.clipboard && navigator.clipboard.writeText($in(b, '[data-dst]').value).then(() => toast('Copiado')); } });
      hist();
    }
  });

  /* ============ NOTICIAS RSS ============ */
  const FEEDS = [['BBC Mundo', 'https://feeds.bbci.co.uk/mundo/rss.xml'], ['NASA', 'https://www.nasa.gov/news-release/feed/'], ['Xataka', 'https://www.xataka.com/feedburner.xml'], ['El País', 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada'], ['Muy Interesante', 'https://www.muyinteresante.com/feed'], ['Hacker News', 'https://hnrss.org/frontpage']];
  R({
    id: 'news', name: 'Noticias RSS', icon: '📰', cat: 'Internet', grad: ['#b91c1c', '#fbbf24'], w: 860, h: 560, pad: false,
    desc: 'Lector de noticias por RSS con tus propias fuentes.', kw: 'rss noticias feed periodico',
    features: ['Fuentes incluidas y personalizadas', 'Abre las noticias en el navegador o en modo lectura', 'Funciona con el proxy de EISEN'],
    init(b) {
      let feeds = storage.get('feeds', FEEDS), cur = 0;
      b.innerHTML = `<div class="ap-split"><aside class="ap-side"><div class="ap-list" data-feeds></div><button class="btn-secondary" data-add>＋ Añadir fuente RSS</button></aside><main class="ap-main ap-scroll" data-list></main></div>`;
      const drawFeeds = () => $in(b, '[data-feeds]').innerHTML = feeds.map((f, i) => `<button class="ap-item ap-row${i === cur ? ' on' : ''}" data-i="${i}"><b style="flex:1">${esc(f[0])}</b><span class="ap-ico" data-del="${i}">✕</span></button>`).join('');
      async function load() {
        drawFeeds(); const L = $in(b, '[data-list]'); L.innerHTML = '<p class="ap-empty">Cargando noticias…</p>';
        try {
          const xml = await E.ebFetchHtml(feeds[cur][1]); const d = new DOMParser().parseFromString(xml, 'text/xml');
          const items = [...d.querySelectorAll('item, entry')].slice(0, 40).map(it => { const g = s => (it.querySelector(s) || {}).textContent || ''; const link = (it.querySelector('link[href]') || {}).getAttribute ? (it.querySelector('link[href]') || { getAttribute: () => '' }).getAttribute('href') : ''; const img = (it.querySelector('enclosure[url], content[url], thumbnail[url]') || { getAttribute: () => '' }).getAttribute('url'); return { t: g('title'), l: link || g('link').trim(), d: g('pubDate') || g('updated') || g('published'), s: (g('description') || g('summary')).replace(/<[^>]+>/g, '').trim().slice(0, 240), img }; });
          L.innerHTML = items.map(x => `<article class="ap-card nw-item">${x.img ? `<img src="${esc(x.img)}" loading="lazy" alt="">` : ''}<div><a href="#" data-external-url="${esc(x.l)}"><b>${esc(x.t)}</b></a><p>${esc(x.s)}</p><small class="eis-muted">${x.d ? esc(new Date(x.d).toLocaleString()) : ''}</small> · <a href="#" data-read="${esc(x.l)}">📖 Lectura</a></div></article>`).join('') || '<p class="ap-empty">La fuente no tiene noticias.</p>';
        } catch { L.innerHTML = '<p class="ap-empty">No se pudo leer esta fuente. Las fuentes RSS necesitan el proxy de EISEN (INICIAR.bat) o los servicios públicos de conexión.</p>'; }
      }
      b.addEventListener('click', async e => {
        const d = e.target.closest('[data-del]'); if (d) { e.stopPropagation(); feeds.splice(+d.dataset.del, 1); storage.set('feeds', feeds); cur = 0; load(); return; }
        const i = e.target.closest('[data-i]'); if (i) { cur = +i.dataset.i; load(); }
        const r = e.target.closest('[data-read]'); if (r) { e.preventDefault(); E.ebOpenUrl('about:reader?u=' + encodeURIComponent(r.dataset.read), true); }
        if (e.target.closest('[data-add]')) { const f = await E.form({ title: 'Añadir fuente RSS', fields: [{ k: 'n', label: 'Nombre', req: true }, { k: 'u', label: 'URL del feed RSS/Atom', type: 'url', ph: 'https://…/rss.xml', req: true }] }); if (f) { feeds.push([f.n, f.u]); storage.set('feeds', feeds); cur = feeds.length - 1; load(); } }
      });
      if (feeds.length) load(); else drawFeeds();
    }
  });

  /* ============ MAPAS (OpenStreetMap) ============ */
  R({
    id: 'maps', name: 'Mapas', icon: '🧭', cat: 'Internet', grad: ['#16a34a', '#86efac'], w: 900, h: 580, pad: false,
    desc: 'Busca lugares y explóralos en OpenStreetMap.', kw: 'mapa ubicacion direccion lugares',
    features: ['Búsqueda de lugares (Nominatim)', 'Mapa interactivo de OpenStreetMap', 'Mi ubicación'],
    init(b) {
      b.innerHTML = `<div class="ap-toolbar"><form data-f class="ap-row" style="flex:1"><input class="input-text" data-q placeholder="Buscar un lugar o dirección" style="flex:1"><button class="btn-primary">Buscar</button></form><button class="btn-secondary" data-geo>📍</button><button class="btn-secondary" data-ext>↗ Abrir OSM</button></div><div class="mp"><div class="ap-list" data-res></div><iframe data-map title="Mapa" loading="lazy"></iframe></div>`;
      let cur = storage.get('map_view', { lat: 19.4326, lon: -99.1332, z: 0.08, name: 'Ciudad de México' });
      const show = v => { cur = v; storage.set('map_view', v); const d = v.z; $in(b, '[data-map]').src = `https://www.openstreetmap.org/export/embed.html?bbox=${v.lon - d},${v.lat - d * .6},${v.lon + d},${v.lat + d * .6}&layer=mapnik&marker=${v.lat},${v.lon}`; };
      $in(b, '[data-f]').onsubmit = async e => { e.preventDefault(); const q = $in(b, '[data-q]').value.trim(); if (!q) return;
        try { const j = await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=8&accept-language=es&q=' + encodeURIComponent(q))).json();
          $in(b, '[data-res]').innerHTML = j.map((r, i) => `<button class="ap-item" data-i="${i}"><b>${esc(r.display_name.split(',')[0])}</b><span>${esc(r.display_name.split(',').slice(1, 4).join(','))}</span></button>`).join('') || '<p class="ap-empty">Sin resultados</p>';
          $in(b, '[data-res]').onclick = ev => { const it = ev.target.closest('[data-i]'); if (!it) return; const r = j[+it.dataset.i], bb = r.boundingbox.map(Number); show({ lat: +r.lat, lon: +r.lon, z: Math.min(2, Math.max(0.005, (bb[3] - bb[2]) / 1.6)), name: r.display_name }); };
          if (j[0]) $in(b, '[data-res] [data-i]').click();
        } catch { toast('Sin conexión con el buscador de mapas'); } };
      $in(b, '[data-geo]').onclick = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => show({ lat: p.coords.latitude, lon: p.coords.longitude, z: .01, name: 'Mi ubicación' }), () => toast('Permiso de ubicación denegado')) : toast('Ubicación no disponible');
      $in(b, '[data-ext]').onclick = () => E.ebOpenUrl(`https://www.openstreetmap.org/#map=15/${cur.lat}/${cur.lon}`, true);
      show(cur);
    }
  });

  /* ============ CÓDIGOS QR ============ */
  R({
    id: 'qr', name: 'Códigos QR', icon: '🔳', cat: 'Internet', grad: ['#111827', '#6b7280'], w: 760, h: 560, ver: '9.0.0',
    desc: 'Genera códigos QR sin conexión (texto, enlaces, Wi-Fi, contactos, correo, teléfono y SMS) y léelos con la cámara.', kw: 'qr codigo escanear wifi vcard',
    features: ['Generador propio: los datos no salen del dispositivo', 'Texto, enlace, Wi-Fi, contacto, correo, teléfono o SMS', 'Corrección de errores y colores', 'PNG, SVG, copiar y guardar en Archivos', 'Lector con cámara o imagen (lector propio si el navegador no trae uno)'],
    init(b) {
      // 9.0: generación local (js/os9/qrcode.js). Antes se enviaba el texto a api.qrserver.com.
      const K = window.EISENKU, native = 'BarcodeDetector' in window;   // 10.0: sin BarcodeDetector se usa el lector propio (js/os10/lib/qrdecode10.js)
      const lib = () => K.qrDecode ? Promise.resolve() : K.loadScript('js/os10/lib/qrdecode10.js');
      b.innerHTML = `<div class="ap-tabs"><button data-t="g" class="on">Generar</button><button data-t="s">Leer</button></div>
        <div data-g class="qr9"><div class="ap-col qr9-form">
          <select class="input-text" data-k aria-label="Tipo de contenido"><option value="t">Texto o enlace</option><option value="w">Red Wi-Fi</option><option value="c">Contacto (vCard)</option><option value="m">Correo electrónico</option><option value="p">Teléfono</option><option value="s">SMS</option></select>
          <div data-f="t" class="ap-col"><textarea class="input-text" data-txt rows="3" placeholder="https://…" aria-label="Texto o enlace">https://es.wikipedia.org</textarea></div>
          <div data-f="w" class="ap-col" hidden><input class="input-text" data-ss placeholder="Nombre de red (SSID)" aria-label="Nombre de red (SSID)"><input class="input-text" data-pw type="password" placeholder="Contraseña" aria-label="Contraseña" autocomplete="off"><select class="input-text" data-sec aria-label="Seguridad"><option value="WPA">WPA / WPA2 / WPA3</option><option value="WEP">WEP</option><option value="nopass">Sin contraseña</option></select><label class="ap-row" style="gap:6px"><input type="checkbox" data-hid> Red oculta</label></div>
          <div data-f="c" class="ap-col" hidden><div class="ap-row"><input class="input-text" data-cf placeholder="Nombre" aria-label="Nombre"><input class="input-text" data-cl placeholder="Apellidos" aria-label="Apellidos"></div><input class="input-text" data-ct placeholder="Teléfono" aria-label="Teléfono"><input class="input-text" data-ce placeholder="Correo" aria-label="Correo"><input class="input-text" data-co placeholder="Empresa" aria-label="Empresa"><input class="input-text" data-cu placeholder="Web" aria-label="Web"></div>
          <div data-f="m" class="ap-col" hidden><input class="input-text" data-me placeholder="destinatario@correo.com" aria-label="Destinatario"><input class="input-text" data-ms placeholder="Asunto" aria-label="Asunto"><textarea class="input-text" data-mb rows="2" placeholder="Mensaje" aria-label="Mensaje"></textarea></div>
          <div data-f="p" class="ap-col" hidden><input class="input-text" data-pt placeholder="+34 600 000 000" aria-label="Teléfono"></div>
          <div data-f="s" class="ap-col" hidden><input class="input-text" data-st placeholder="+34 600 000 000" aria-label="Teléfono"><textarea class="input-text" data-sb rows="2" placeholder="Mensaje" aria-label="Mensaje"></textarea></div>
          <div class="ap-row qr9-opts"><label>Corrección <select class="input-text" data-ecl><option value="L">Baja · 7 %</option><option value="M" selected>Media · 15 %</option><option value="Q">Alta · 25 %</option><option value="H">Máxima · 30 %</option></select></label><label>Color <input type="color" data-dark value="#111111"></label><label>Fondo <input type="color" data-light value="#ffffff"></label></div>
          <div class="ap-row"><button class="btn-primary" data-save>💾 Guardar en Archivos</button><button class="btn-secondary" data-png>⬇ PNG</button><button class="btn-secondary" data-svg>⬇ SVG</button><button class="btn-secondary" data-copy>📋 Copiar</button></div>
          <small class="eis-muted" data-info aria-live="polite">Generado en tu dispositivo: el contenido no se envía a ningún servicio.</small>
        </div><div class="qr-out" data-out role="img" aria-label="Código QR"></div></div>
        <div data-s hidden class="ap-col"><video data-v playsinline muted style="width:100%;max-height:300px;background:#000;border-radius:12px"></video><div class="ap-row"><button class="btn-primary" data-scan>📷 Empezar a leer</button><button class="btn-secondary" data-scanimg>🖼 Leer de una imagen</button></div><div class="ap-card" data-res>Apunta la cámara a un código QR.</div></div>`;
      const v = s => $in(b, s).value, out = $in(b, '[data-out]'), info = $in(b, '[data-info]');
      const data = () => {
        const k = v('[data-k]');
        if (k === 'w') return K.qr.wifi({ ssid: v('[data-ss]'), password: v('[data-pw]'), type: v('[data-sec]'), hidden: $in(b, '[data-hid]').checked });
        if (k === 'c') return K.qr.vcard({ first: v('[data-cf]'), last: v('[data-cl]'), tel: v('[data-ct]'), email: v('[data-ce]'), org: v('[data-co]'), url: v('[data-cu]') });
        if (k === 'm') { const q = [v('[data-ms]') && 'subject=' + encodeURIComponent(v('[data-ms]')), v('[data-mb]') && 'body=' + encodeURIComponent(v('[data-mb]'))].filter(Boolean).join('&'); return 'mailto:' + v('[data-me]').trim() + (q ? '?' + q : ''); }
        if (k === 'p') return 'tel:' + v('[data-pt]').replace(/[^\d+*#]/g, '');
        if (k === 's') return 'SMSTO:' + v('[data-st]').replace(/[^\d+]/g, '') + ':' + v('[data-sb]');
        return v('[data-txt]');
      };
      const lum = h => { const n = parseInt(h.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
      let qr = null, ready = false;
      const draw = () => {
        if (!ready) return;
        const dark = v('[data-dark]'), light = v('[data-light]'), d = data();
        try {
          qr = K.qr.encode(d, v('[data-ecl]'));
          out.innerHTML = K.qr.svg(qr, { dark, light, px: 300 });
          const l1 = lum(dark), l2 = lum(light), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          info.textContent = `Versión ${qr.version} · ${qr.size}×${qr.size} módulos · corrección ${qr.ecl} · ${new TextEncoder().encode(d).length} bytes. Generado en tu dispositivo: el contenido no se envía a ningún servicio.` + (l1 > l2 ? ' ⚠ Colores invertidos: muchos lectores no los reconocen.' : ratio < 4 ? ' ⚠ Poco contraste: puede costar leerlo.' : '');
        } catch (e) { qr = null; out.innerHTML = ''; info.textContent = e.message || String(e); }
      };
      let tq = 0; const later = () => { clearTimeout(tq); tq = setTimeout(draw, 120); };
      b.addEventListener('input', e => { if (e.target.closest('[data-g]')) later(); });
      b.addEventListener('change', e => { if (e.target.closest('[data-g]')) later(); });
      $in(b, '[data-k]').addEventListener('change', e => { $$in(b, '[data-f]').forEach(x => { x.hidden = x.dataset.f !== e.target.value; }); });
      const png = () => new Promise(res => K.qr.canvas(qr, { scale: 10, dark: v('[data-dark]'), light: v('[data-light]') }).toBlob(res, 'image/png'));
      $in(b, '[data-save]').onclick = async () => { if (!qr) return; E.saveToFiles('codigo_qr.png', await png(), 'images'); };
      $in(b, '[data-png]').onclick = async () => { if (qr) E.download('codigo_qr.png', await png()); };
      $in(b, '[data-svg]').onclick = () => { if (qr) E.download('codigo_qr.svg', new Blob([K.qr.svg(qr, { dark: v('[data-dark]'), light: v('[data-light]') })], { type: 'image/svg+xml' })); };
      $in(b, '[data-copy]').onclick = async () => { if (!qr) return; try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': await png() })]); toast('Código QR copiado'); } catch { toast('Tu navegador no permite copiar imágenes; usa PNG o Guardar'); } };
      (K.qr ? Promise.resolve() : K.loadScript('js/os9/qrcode.js')).then(() => { ready = true; draw(); }).catch(() => { info.textContent = 'No se pudo cargar el generador de códigos QR.'; });
      let stream, timer;
      const stop = () => { if (stream) stream.getTracks().forEach(x => x.stop()); stream = null; clearInterval(timer); };
      const showRes = t => { $in(b, '[data-res]').innerHTML = `<b>Leído:</b> ${esc(t)} ${/^https?:/.test(t) ? `<button class="btn-primary" data-external-url="${esc(t)}">Abrir</button>` : ''}`; };
      $$in(b, '[data-t]').forEach(t => t.onclick = () => { $$in(b, '[data-t]').forEach(x => x.classList.toggle('on', x === t)); $in(b, '[data-g]').hidden = t.dataset.t !== 'g'; $in(b, '[data-s]').hidden = t.dataset.t !== 's'; if (t.dataset.t === 'g') stop(); });
      $in(b, '[data-scan]').onclick = async () => {
        try { stop(); if (!native) await lib(); stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); const vd = $in(b, '[data-v]'); vd.srcObject = stream; await vd.play();
          const det = native ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null, cv = document.createElement('canvas'); let busy = false;
          $in(b, '[data-res]').textContent = native ? 'Apunta la cámara a un código QR.' : 'Apunta la cámara a un código QR (lector propio de EISENKU).';
          timer = setInterval(async () => { if (busy || !vd.videoWidth) return; busy = true; try { if (det) { const c = await det.detect(vd); if (c[0]) showRes(c[0].rawValue); } else { const s = Math.min(1, 720 / Math.max(vd.videoWidth, vd.videoHeight)); cv.width = Math.round(vd.videoWidth * s); cv.height = Math.round(vd.videoHeight * s); const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(vd, 0, 0, cv.width, cv.height); const r = K.qrDecode(x.getImageData(0, 0, cv.width, cv.height)); if (r) showRes(r.text); } } catch { /* seguir */ } busy = false; }, native ? 500 : 300);
        } catch { toast('No se pudo usar la cámara'); }
      };
      $in(b, '[data-scanimg]').onclick = async () => {
        const f = await (window.EISENKU.ui.pickFile('image/*')); if (!f[0]) return;
        try { await lib(); const t = await K.qrDecodeBlob(f[0]); if (t) showRes(t); else $in(b, '[data-res]').textContent = 'No se ha encontrado ningún código QR en la imagen.'; } catch { toast('No se pudo leer la imagen'); }
      };
      const w = b.closest('.window'); if (w) new MutationObserver(() => { if (!w.classList.contains('open') || w.classList.contains('minimized')) stop(); }).observe(w, { attributes: true, attributeFilter: ['class'] });
    }
  });

  /* ============ GALERÍA / VISOR DE IMÁGENES ============ */
  let galApi = null;
  R({
    id: 'gallery', name: 'Galería', icon: '🖼️', cat: 'Multimedia', grad: ['#0ea5e9', '#a78bfa'], w: 860, h: 560, pad: false,
    desc: 'Visor de imágenes con zoom, presentación y fondo de pantalla.', kw: 'fotos imagenes visor',
    features: ['Todas tus imágenes de Archivos', 'Zoom, giro y presentación', 'Poner como fondo de pantalla'],
    init(b) {
      let imgs = [], i = 0, zoom = 1, rot = 0, slide = null;
      b.innerHTML = `<div class="ap-toolbar"><button class="btn-secondary" data-a="import">＋ Importar</button><button class="btn-secondary" data-a="grid">▦ Todas</button><span class="ap-sep"></span><button class="btn-secondary" data-a="prev">‹</button><button class="btn-secondary" data-a="next">›</button><button class="btn-secondary" data-a="zin">＋</button><button class="btn-secondary" data-a="zout">－</button><button class="btn-secondary" data-a="rot">⟳</button><button class="btn-secondary" data-a="show">▶</button><button class="btn-secondary" data-a="wall">🖥 Fondo</button><button class="btn-secondary" data-a="edit">🎨 Editar</button><button class="btn-secondary" data-a="del">🗑</button><input type="file" accept="image/*" multiple hidden data-file></div><div class="gl-view" data-view></div>`;
      const V = $in(b, '[data-view]');
      async function refresh() { imgs = (await E.vaultAll()).filter(f => /^image\//.test(E.fileType(f))).sort((x, y) => y.date - x.date); }
      function grid() { clearInterval(slide); slide = null; V.className = 'gl-grid'; V.innerHTML = imgs.map((f, k) => `<button data-k="${k}"><img src="${URL.createObjectURL(f.blob)}" loading="lazy" alt=""><span>${esc(f.name)}</span></button>`).join('') || '<p class="ap-empty">No hay imágenes. Importa algunas o haz fotos con la Cámara.</p>'; }
      function one() { const f = imgs[i]; if (!f) return grid(); V.className = 'gl-view'; V.innerHTML = `<img src="${URL.createObjectURL(f.blob)}" style="transform:scale(${zoom}) rotate(${rot}deg)" alt=""><div class="gl-cap">${esc(f.name)} · ${i + 1}/${imgs.length}</div>`; }
      b.addEventListener('click', async e => {
        const k = e.target.closest('[data-k]'); if (k) { i = +k.dataset.k; zoom = 1; rot = 0; one(); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const f = imgs[i];
        ({ import: () => $in(b, '[data-file]').click(), grid, prev: () => { i = (i - 1 + imgs.length) % imgs.length; zoom = 1; rot = 0; one(); }, next: () => { i = (i + 1) % imgs.length; zoom = 1; rot = 0; one(); },
          zin: () => { zoom = Math.min(6, zoom * 1.25); one(); }, zout: () => { zoom = Math.max(.2, zoom / 1.25); one(); }, rot: () => { rot = (rot + 90) % 360; one(); },
          show: () => { if (slide) { clearInterval(slide); slide = null; return; } one(); slide = setInterval(() => { if (!isOpen(b)) return; i = (i + 1) % imgs.length; one(); }, 3000); },
          wall: () => { if (!f) return; const r = new FileReader(); r.onload = () => { if (f.blob.size < 4e6) E.setWallpaperUrl(r.result); else E.setWallpaperUrl(URL.createObjectURL(f.blob), false); toast('Fondo actualizado'); }; r.readAsDataURL(f.blob); },
          edit: () => { if (f && E.editPhoto) E.editPhoto(f.blob, f.name); },
          del: async () => { if (f && await E.confirm('Eliminar imagen', '¿Eliminar ' + f.name + '?')) { await E.vault.del(f.id); await refresh(); i = Math.min(i, imgs.length - 1); imgs.length ? one() : grid(); } } }[a.dataset.a] || (() => {}))();
      });
      $in(b, '[data-file]').onchange = async e => { for (const f of e.target.files) await E.vaultSave(f.name, f, 'images'); e.target.value = ''; await refresh(); grid(); };
      V.addEventListener('wheel', e => { if (V.className !== 'gl-view') return; e.preventDefault(); zoom = Math.max(.2, Math.min(6, zoom * (e.deltaY < 0 ? 1.1 : .9))); const im = V.querySelector('img'); if (im) im.style.transform = `scale(${zoom}) rotate(${rot}deg)`; }, { passive: false });
      galApi = { async view(id) { await refresh(); const k = imgs.findIndex(x => x.id === id); i = Math.max(0, k); zoom = 1; rot = 0; one(); }, async open() { await refresh(); grid(); } };
    },
    onOpen() { if (!galApi) return; if (galPending) { const id = galPending; galPending = null; galApi.view(id); } else galApi.open(); }
  });
  let galPending = null;
  E.viewImage = id => { galPending = id; E.openWindow('gallery'); };

  /* ============ GRABADORA DE VOZ ============ */
  R({
    id: 'recorder', name: 'Grabadora', icon: '🎙️', cat: 'Multimedia', grad: ['#e11d48', '#fda4af'], w: 560, h: 480,
    desc: 'Graba audio con el micrófono y guárdalo en Archivos › Música.', kw: 'grabar voz audio microfono',
    features: ['Visualizador de onda en vivo', 'Guarda en Archivos', 'Reproduce tus grabaciones'],
    init(b) {
      b.innerHTML = `<div class="ap-col ap-center"><canvas class="rec-wave" width="500" height="120"></canvas><div class="clk-big" data-t>00:00</div><div class="ap-row ap-center"><button class="btn-primary rec-btn" data-rec>⏺ Grabar</button></div><div class="ap-col" data-list style="width:100%"></div></div>`;
      let mr, chunks = [], st, t0, raf, ana, stream;
      const cv = $in(b, 'canvas'), ctx = cv.getContext('2d');
      async function list() { const l = (await E.vaultAll()).filter(f => /^Grabación/.test(f.name)).sort((x, y) => y.date - x.date); $in(b, '[data-list]').innerHTML = l.map(f => `<div class="ap-card"><b>${esc(f.name)}</b><audio controls preload="none" src="${URL.createObjectURL(f.blob)}" style="width:100%"></audio></div>`).join('') || '<p class="ap-empty">Aún no hay grabaciones</p>'; }
      function draw() { if (!ana) return; const d = new Uint8Array(ana.fftSize); ana.getByteTimeDomainData(d); ctx.clearRect(0, 0, 500, 120); ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 2; ctx.beginPath(); d.forEach((v, i) => { const x = i / d.length * 500, y = v / 255 * 120; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); $in(b, '[data-t]').textContent = new Date(Date.now() - t0).toISOString().slice(14, 19); raf = requestAnimationFrame(draw); }
      $in(b, '[data-rec]').onclick = async e => {
        if (mr && mr.state === 'recording') { mr.stop(); return; }
        if (!navigator.mediaDevices || !window.MediaRecorder) return toast('Tu navegador no permite grabar audio');
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return toast('Permiso de micrófono denegado'); }
        const ac = new (window.AudioContext || window.webkitAudioContext)(); ana = ac.createAnalyser(); ana.fftSize = 1024; ac.createMediaStreamSource(stream).connect(ana);
        mr = new MediaRecorder(stream); chunks = []; mr.ondataavailable = ev => chunks.push(ev.data);
        mr.onstop = async () => { cancelAnimationFrame(raf); stream.getTracks().forEach(x => x.stop()); ac.close(); ana = null; e.target.textContent = '⏺ Grabar'; e.target.classList.remove('on'); const type = mr.mimeType || 'audio/webm'; const blob = new Blob(chunks, { type }); const ext = /ogg/.test(type) ? 'ogg' : /mp4/.test(type) ? 'm4a' : 'webm'; await E.vaultSave(`Grabación ${new Date().toLocaleString().replace(/[/:]/g, '-')}.${ext}`, blob, 'music'); toast('Grabación guardada en Archivos › Música'); list(); };
        mr.start(); t0 = Date.now(); e.target.textContent = '⏹ Detener'; e.target.classList.add('on'); draw();
      };
      list();
    }
  });

  /* ============ CÁMARA ============ */
  R({
    id: 'camera', name: 'Cámara', icon: '📷', cat: 'Multimedia', grad: ['#374151', '#f59e0b'], w: 720, h: 560, pad: false,
    desc: 'Toma fotos con filtros y guárdalas en Archivos › Imágenes.', kw: 'foto selfie webcam',
    features: ['Fotos con filtros', 'Cambiar de cámara', 'Guardado en Archivos'],
    init(b) {
      b.innerHTML = `<div class="cam"><video playsinline muted data-v></video><div class="cam-flash" data-fl></div><div class="cam-bar"><select class="input-text" data-fx style="width:140px"><option value="none">Sin filtro</option><option value="grayscale(1)">Blanco y negro</option><option value="sepia(1)">Sepia</option><option value="saturate(2)">Vívido</option><option value="contrast(1.4) brightness(1.1)">Contraste</option><option value="hue-rotate(180deg)">Psicodélico</option><option value="invert(1)">Negativo</option></select><button class="cam-shot" data-shot aria-label="Tomar foto"></button><button class="btn-secondary" data-flip>🔄</button><button class="btn-secondary" data-start>▶ Encender</button></div></div>`;
      const v = $in(b, '[data-v]'); let stream = null, facing = 'user';
      async function start() { stop(); try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false }); v.srcObject = stream; await v.play(); $in(b, '[data-start]').textContent = '⏹ Apagar'; } catch { toast('No se pudo acceder a la cámara (permiso o dispositivo)'); } }
      function stop() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; $in(b, '[data-start]').textContent = '▶ Encender'; }
      $in(b, '[data-fx]').onchange = e => v.style.filter = e.target.value;
      $in(b, '[data-start]').onclick = () => stream ? stop() : start();
      $in(b, '[data-flip]').onclick = () => { facing = facing === 'user' ? 'environment' : 'user'; start(); };
      $in(b, '[data-shot]').onclick = () => { if (!stream) return toast('Enciende la cámara primero'); const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; const x = c.getContext('2d'); x.filter = v.style.filter || 'none'; if (facing === 'user') { x.translate(c.width, 0); x.scale(-1, 1); } x.drawImage(v, 0, 0); c.toBlob(bl => E.saveToFiles(`Foto ${new Date().toLocaleString().replace(/[/:]/g, '-')}.jpg`, bl, 'images'), 'image/jpeg', .92); const fl = $in(b, '[data-fl]'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on'); };
      document.addEventListener('eisen:close', e => { if (e.detail === 'camera') stop(); });
    }
  });

  /* ============ REPRODUCTOR DE VIDEO ============ */
  let vidApi = null;
  R({
    id: 'video', name: 'Reproductor de video', icon: '🎬', cat: 'Multimedia', grad: ['#7f1d1d', '#f87171'], w: 820, h: 540, pad: false,
    desc: 'Reproduce videos locales, de Archivos o por URL.', kw: 'pelicula mp4 webm',
    features: ['Lista de videos de Archivos', 'Velocidad y pantalla en imagen (PiP)', 'Abrir por URL'],
    init(b) {
      b.innerHTML = `<div class="ap-toolbar"><button class="btn-secondary" data-a="file">📂 Abrir</button><input type="file" accept="video/*" hidden data-file><input class="input-text" data-url placeholder="URL de video (.mp4, .webm) o YouTube" style="flex:1"><button class="btn-primary" data-a="url">▶</button><select class="input-text" data-rate style="width:80px"><option>0.5</option><option>0.75</option><option selected>1</option><option>1.25</option><option>1.5</option><option>2</option></select><button class="btn-secondary" data-a="pip">⧉</button></div><div class="vd"><video controls playsinline data-v></video><aside class="ap-list" data-list></aside></div>`;
      const v = $in(b, '[data-v]');
      async function list() { const l = (await E.vaultAll()).filter(f => /^video\//.test(E.fileType(f))); $in(b, '[data-list]').innerHTML = l.map(f => `<button class="ap-item" data-id="${f.id}">🎞 ${esc(f.name)}</button>`).join('') || '<p class="ap-empty">Sin videos en Archivos</p>'; }
      const play = (src, name) => { v.src = src; v.play().catch(() => {}); b.closest('.window').querySelector('.window-title-area span:last-child').textContent = (name || 'Video') + ' · Reproductor'; };
      b.addEventListener('click', async e => {
        const it = e.target.closest('[data-id]'); if (it) { const f = await E.vault.get(it.dataset.id); play(URL.createObjectURL(f.blob), f.name); }
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'file') $in(b, '[data-file]').click();
        if (a.dataset.a === 'url') { const u = $in(b, '[data-url]').value.trim(); if (/youtu/.test(u)) { E.ebOpenUrl(u, true); return; } if (u) play(u, u.split('/').pop()); }
        if (a.dataset.a === 'pip') { try { await v.requestPictureInPicture(); } catch { toast('Imagen en imagen no disponible'); } }
      });
      $in(b, '[data-file]').onchange = async e => { const f = e.target.files[0]; if (!f) return; play(URL.createObjectURL(f), f.name); if (await E.confirm('Guardar video', '¿Guardar una copia en Archivos?')) { await E.vaultSave(f.name, f, 'downloads'); list(); } };
      $in(b, '[data-rate]').onchange = e => v.playbackRate = +e.target.value;
      document.addEventListener('eisen:close', e => { if (e.detail === 'video') v.pause(); });
      vidApi = { play: f => play(URL.createObjectURL(f.blob), f.name) }; list();
    }
  });
  E.playVideo = f => { E.openWindow('video'); setTimeout(() => vidApi && vidApi.play(f), 30); };

  /* ============ PIANO ============ */
  R({
    id: 'piano', name: 'Piano', icon: '🎹', cat: 'Multimedia', grad: ['#1f2937', '#e5e7eb'], w: 820, h: 420,
    desc: 'Piano de dos octavas con sonidos, teclado y grabación.', kw: 'musica instrumento teclado notas',
    features: ['Toca con ratón, táctil o teclado', '4 timbres', 'Graba y reproduce tu melodía'],
    init(b) {
      const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], KEYS = 'awsedftgyhujkolpñ;', ES = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
      const keys = []; for (let o = 4; o <= 5; o++) NOTES.forEach((n, i) => keys.push({ n, o, f: 440 * Math.pow(2, ((o - 4) * 12 + i - 9) / 12) })); keys.push({ n: 'C', o: 6, f: 1046.5 });
      b.innerHTML = `<div class="ap-row"><select class="input-text" data-w style="width:140px"><option value="piano">Piano</option><option value="sine">Flauta (seno)</option><option value="square">8 bits</option><option value="sawtooth">Sintetizador</option></select><label>Volumen <input type="range" min="0" max="1" step=".05" value=".6" data-vol></label><button class="btn-secondary" data-rec>⏺ Grabar</button><button class="btn-secondary" data-play>▶ Reproducir</button><small class="eis-muted">Teclado: A W S E D F T G Y H U J K…</small></div><div class="pn">${keys.map((k, i) => `<button class="pn-k${k.n.includes('#') ? ' bk' : ''}" data-i="${i}">${k.n.includes('#') ? '' : `<span>${ES[k.n]}${k.o}</span><small>${(KEYS[keys.filter(x => true).indexOf(k)] || '').toUpperCase()}</small>`}</button>`).join('')}</div>`;
      let ac, rec = null, recT = 0;
      const tone = i => {
        ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume();
        const k = keys[i], w = $in(b, '[data-w]').value, t = ac.currentTime, g = ac.createGain(), vol = +$in(b, '[data-vol]').value * .4;
        const mk = (type, mult, gv) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = k.f * mult; const og = ac.createGain(); og.gain.value = gv; o.connect(og); og.connect(g); o.start(t); o.stop(t + 1.6); };
        if (w === 'piano') { mk('triangle', 1, 1); mk('sine', 2, .35); mk('sine', 3, .12); } else mk(w, 1, w === 'sine' ? 1 : .5);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + (w === 'piano' ? 1.5 : .8)); g.connect(ac.destination);
        const el = $in(b, `[data-i="${i}"]`); el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 160);
        if (rec) rec.push([i, performance.now() - recT]);
      };
      b.addEventListener('pointerdown', e => { const k = e.target.closest('[data-i]'); if (k) { e.preventDefault(); tone(+k.dataset.i); } });
      const W = b.closest('.window'); W.tabIndex = -1;
      W.addEventListener('keydown', e => { if (e.repeat || e.target.matches('input,select')) return; const i = KEYS.indexOf(e.key.toLowerCase()); if (i >= 0 && i < keys.length) { e.preventDefault(); tone(i); } });
      $in(b, '[data-rec]').onclick = e => { if (rec) { storage.set('piano_song', rec); rec = null; e.target.textContent = '⏺ Grabar'; toast('Melodía guardada'); } else { rec = []; recT = performance.now(); e.target.textContent = '⏹ Parar'; W.focus(); } };
      $in(b, '[data-play]').onclick = () => { const s = storage.get('piano_song', []); if (!s.length) return toast('Graba una melodía primero'); s.forEach(([i, t]) => setTimeout(() => tone(i), t)); };
    }
  });

  /* ============ MONITOR DEL SISTEMA ============ */
  R({
    id: 'monitor', name: 'Monitor del sistema', icon: '📟', cat: 'Sistema', grad: ['#0f766e', '#2dd4bf'], w: 760, h: 540,
    desc: 'Administrador de tareas: ventanas abiertas, rendimiento y almacenamiento.', kw: 'administrador de tareas rendimiento memoria fps',
    features: ['Cerrar o enfocar ventanas abiertas', 'FPS, memoria y almacenamiento en vivo', 'Información del dispositivo y batería'],
    init(b) {
      b.innerHTML = `<div class="ap-tabs"><button data-t="p" class="on">⚙ Procesos</button><button data-t="r">📊 Rendimiento</button><button data-t="d">💻 Dispositivo</button></div><div data-p></div><div data-r hidden><div class="mon-grid"><div class="ap-card"><span>FPS</span><b data-fps>—</b><canvas data-g width="300" height="60"></canvas></div><div class="ap-card"><span>Memoria JS</span><b data-mem>—</b></div><div class="ap-card"><span>Almacenamiento</span><b data-sto>—</b></div><div class="ap-card"><span>Datos de EISEN</span><b data-ls>—</b></div></div><div class="ap-row"><button class="btn-secondary" data-clean>🧹 Liberar memoria (descargar pestañas y cachés)</button></div></div><div data-d hidden class="ap-card" data-dev></div>`;
      let tab = 'p', frames = 0, last = performance.now(), hist = [];
      $$in(b, '[data-t]').forEach(t => t.onclick = () => { tab = t.dataset.t; $$in(b, '[data-t]').forEach(x => x.classList.toggle('on', x === t)); ['p', 'r', 'd'].forEach(k => $in(b, `[data-${k}]`).hidden = k !== tab); upd(); });
      const name = w => (E.REG[w.id.slice(4)] || {}).name || (w.querySelector('.window-title-area') || {}).textContent.trim();
      async function upd() {
        if (tab === 'p') $in(b, '[data-p]').innerHTML = `<table class="mon-tab"><tr><th>Aplicación</th><th>Estado</th><th></th></tr>${[...document.querySelectorAll('.window.open')].map(w => `<tr><td>${esc(name(w))}</td><td>${w.classList.contains('minimized') ? 'Minimizada' : w.classList.contains('active') ? 'Activa' : 'Abierta'}</td><td><button class="btn-secondary" data-f="${w.id}">Mostrar</button> <button class="btn-secondary" data-k="${w.id}">Finalizar</button></td></tr>`).join('')}</table>`;
        if (tab === 'r') {
          $in(b, '[data-mem]').textContent = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) + ' MB' : 'No disponible';
          try { const e = await navigator.storage.estimate(); $in(b, '[data-sto]').textContent = `${(e.usage / 1048576).toFixed(1)} MB de ${(e.quota / 1073741824).toFixed(1)} GB`; } catch { $in(b, '[data-sto]').textContent = 'No disponible'; }
          let n = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('eisen_')) n += (localStorage.getItem(k) || '').length * 2; } $in(b, '[data-ls]').textContent = (n / 1024).toFixed(0) + ' KB';
        }
        if (tab === 'd') { let bat = ''; try { const bt = await navigator.getBattery(); bat = `${Math.round(bt.level * 100)}% ${bt.charging ? '(cargando)' : ''}`; } catch { bat = 'No disponible'; }
          const c = navigator.connection || {};
          $in(b, '[data-dev]').innerHTML = [['Sistema', 'EISENKU OS ' + E.VERSION + ' · ' + (document.documentElement.dataset.env === 'linux' ? 'Entorno Linux' : 'Entorno Windows')], ['Navegador', navigator.userAgent], ['Plataforma', navigator.platform || '—'], ['Núcleos de CPU', navigator.hardwareConcurrency || '—'], ['Memoria del equipo', navigator.deviceMemory ? navigator.deviceMemory + ' GB (aprox.)' : '—'], ['Pantalla', `${screen.width}×${screen.height} @${devicePixelRatio}x`], ['Ventana', `${innerWidth}×${innerHeight}`], ['Táctil', navigator.maxTouchPoints > 0 ? 'Sí' : 'No'], ['Red', navigator.onLine ? `En línea ${c.effectiveType ? '· ' + c.effectiveType : ''}${c.downlink ? ' · ' + c.downlink + ' Mbps' : ''}` : 'Sin conexión'], ['Batería', bat], ['Idioma', navigator.language]].map(([k, v]) => `<div class="mon-row"><span>${k}</span><b>${esc(String(v))}</b></div>`).join(''); }
      }
      b.addEventListener('click', e => {
        const f = e.target.closest('[data-f]'); if (f) { E.openWindow(f.dataset.f.slice(4)); }
        const k = e.target.closest('[data-k]'); if (k) { const w = document.getElementById(k.dataset.k); const c = w && w.querySelector('[data-act=close]'); if (c) c.click(); upd(); }
        if (e.target.closest('[data-clean]')) { document.querySelectorAll('.eb-frame:not(.show)').forEach(fr => { try { fr.src = 'about:blank'; } catch { /* ignorar */ } }); toast('Pestañas inactivas descargadas'); }
      });
      const g = $in(b, '[data-g]').getContext('2d');
      const loop = t => { frames++; if (t - last >= 1000) { const fps = Math.round(frames * 1000 / (t - last)); frames = 0; last = t; if (isOpen(b)) { $in(b, '[data-fps]').textContent = fps; hist.push(fps); hist = hist.slice(-60); g.clearRect(0, 0, 300, 60); g.strokeStyle = '#2dd4bf'; g.lineWidth = 2; g.beginPath(); hist.forEach((v, i) => { const x = i * 5, y = 60 - Math.min(60, v); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); upd(); } } if (isOpen(b)) requestAnimationFrame(loop); else running = false; };
      let running = false; const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
      this.onOpen = kick; kick(); upd();
    },
    onOpen(b) { const t = b.querySelector('[data-t].on'); if (t) t.click(); }
  });

  /* ============ CONTRASEÑAS ============ */
  const WORDS = 'sol luna mar rio monte nube fuego agua tierra viento roca arbol flor hoja rama cielo nieve lluvia trueno rayo estrella cometa planeta bosque selva playa isla puerto barco tren avion cohete robot pixel codigo dato red nodo cristal hierro oro plata cobre jade rubi lince lobo zorro aguila halcon delfin ballena tigre panda koala gato perro raton conejo tortuga dragon fenix grifo'.split(' ');
  R({
    id: 'passgen', name: 'Generador de contraseñas', icon: '🔐', cat: 'Sistema', grad: ['#4338ca', '#818cf8'], w: 560, h: 460,
    desc: 'Crea contraseñas seguras o frases de paso y mide su fuerza.', kw: 'password seguridad clave',
    features: ['Generación criptográfica segura', 'Frases de paso fáciles de recordar', 'Medidor de fortaleza'],
    init(b) {
      b.innerHTML = `<div class="ap-col"><div class="pw-out"><input class="input-text mono" data-o readonly><button class="btn-primary" data-copy>📋</button><button class="btn-secondary" data-gen>🔄</button></div><div class="pw-meter"><i data-bar></i></div><p data-str class="eis-muted"></p><div class="ap-tabs"><button data-m="c" class="on">Caracteres</button><button data-m="p">Frase de paso</button></div><label>Longitud: <b data-lv>16</b><input type="range" min="6" max="64" value="16" data-l></label><div class="ap-row" data-sets><label class="ap-check-l"><input type="checkbox" data-s="a" checked>a-z</label><label class="ap-check-l"><input type="checkbox" data-s="A" checked>A-Z</label><label class="ap-check-l"><input type="checkbox" data-s="0" checked>0-9</label><label class="ap-check-l"><input type="checkbox" data-s="#" checked>!@#$</label><label class="ap-check-l"><input type="checkbox" data-s="x" checked>Sin ambiguos (0/O, l/1)</label></div><hr><label>Comprobar mi contraseña <input class="input-text" type="password" data-chk placeholder="Se analiza solo en este dispositivo"></label><p data-chkr class="eis-muted"></p></div>`;
      let mode = 'c';
      const rnd = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
      const entropy = p => { let pool = 0; if (/[a-z]/.test(p)) pool += 26; if (/[A-Z]/.test(p)) pool += 26; if (/\d/.test(p)) pool += 10; if (/[^\w]/.test(p)) pool += 30; return Math.round(p.length * Math.log2(Math.max(pool, 1))); };
      const verdict = bits => bits < 40 ? ['Débil', 25, '#ef4444'] : bits < 60 ? ['Aceptable', 50, '#f59e0b'] : bits < 80 ? ['Fuerte', 75, '#22c55e'] : ['Muy fuerte', 100, '#10b981'];
      function gen() {
        const L = +$in(b, '[data-l]').value; $in(b, '[data-lv]').textContent = L; let out = '', bits;
        if (mode === 'p') { const n = Math.max(3, Math.round(L / 4)); const w = []; for (let i = 0; i < n; i++) w.push(WORDS[rnd(WORDS.length)]); out = w.join('-') + '-' + rnd(100); bits = Math.round(n * Math.log2(WORDS.length) + 6.6); }
        else { const amb = $in(b, '[data-s="x"]').checked; let cs = ''; if ($in(b, '[data-s="a"]').checked) cs += 'abcdefghijkmnopqrstuvwxyz' + (amb ? '' : 'l'); if ($in(b, '[data-s="A"]').checked) cs += 'ABCDEFGHJKLMNPQRSTUVWXYZ' + (amb ? '' : 'IO'); if ($in(b, '[data-s="0"]').checked) cs += '23456789' + (amb ? '' : '01'); if ($in(b, '[data-s="#"]').checked) cs += '!@#$%&*?-_+='; if (!cs) cs = 'abcdefghijkmnopqrstuvwxyz'; for (let i = 0; i < L; i++) out += cs[rnd(cs.length)]; bits = Math.round(L * Math.log2(cs.length)); }
        $in(b, '[data-o]').value = out; const [t, p, c] = verdict(bits); $in(b, '[data-bar]').style.cssText = `width:${p}%;background:${c}`; $in(b, '[data-str]').textContent = `${t} · ~${bits} bits de entropía`;
      }
      b.addEventListener('input', e => { if (e.target.matches('[data-chk]')) { const v = e.target.value, bits = entropy(v), [t] = verdict(bits); $in(b, '[data-chkr]').textContent = v ? `${t} (~${bits} bits). ${/(.)\1\1/.test(v) ? 'Evita repetir caracteres. ' : ''}${/^(123|abc|qwe|password|contraseña)/i.test(v) ? 'Empieza con un patrón muy común. ' : ''}` : ''; } else gen(); });
      b.addEventListener('click', e => { const m = e.target.closest('[data-m]'); if (m) { mode = m.dataset.m; $$in(b, '[data-m]').forEach(x => x.classList.toggle('on', x === m)); $in(b, '[data-sets]').hidden = mode === 'p'; gen(); } if (e.target.closest('[data-gen]')) gen(); if (e.target.closest('[data-copy]')) navigator.clipboard && navigator.clipboard.writeText($in(b, '[data-o]').value).then(() => toast('Contraseña copiada')); });
      gen();
    }
  });

  /* ============ PRUEBA DE RED ============ */
  R({
    id: 'netcheck', name: 'Prueba de red', icon: '📶', cat: 'Sistema', grad: ['#0369a1', '#22c55e'], w: 560, h: 460,
    desc: 'Mide latencia y velocidad de descarga reales de tu conexión.', kw: 'velocidad internet ping speedtest',
    features: ['Latencia a varios servidores', 'Velocidad de descarga (Cloudflare)', 'Comprobación del proxy de EISEN'],
    init(b) {
      b.innerHTML = `<div class="ap-col"><button class="btn-primary" data-go>▶ Iniciar prueba</button><div class="mon-grid"><div class="ap-card"><span>Latencia</span><b data-lat>—</b></div><div class="ap-card"><span>Descarga</span><b data-dl>—</b></div><div class="ap-card"><span>Proxy EISEN</span><b data-px>—</b></div><div class="ap-card"><span>Estado</span><b>${navigator.onLine ? 'En línea' : 'Sin conexión'}</b></div></div><div data-log class="ap-col mono" style="font-size:12px"></div></div>`;
      const log = t => $in(b, '[data-log]').insertAdjacentHTML('beforeend', `<div>${esc(t)}</div>`);
      $in(b, '[data-go]').onclick = async e => {
        e.target.disabled = true; $in(b, '[data-log]').innerHTML = '';
        const hosts = [['Cloudflare', 'https://www.cloudflare.com/cdn-cgi/trace'], ['Wikipedia', 'https://es.wikipedia.org/favicon.ico'], ['Google', 'https://www.google.com/favicon.ico']]; const ts = [];
        for (const [n, u] of hosts) { const t0 = performance.now(); try { await fetch(u + (u.includes('?') ? '&' : '?') + 'r=' + Math.random(), { mode: 'no-cors', cache: 'no-store' }); const ms = Math.round(performance.now() - t0); ts.push(ms); log(`${n}: ${ms} ms`); } catch { log(`${n}: sin respuesta`); } }
        $in(b, '[data-lat]').textContent = ts.length ? Math.min(...ts) + ' ms' : 'Error';
        try { const t0 = performance.now(); const r = await fetch('https://speed.cloudflare.com/__down?bytes=8000000', { cache: 'no-store' }); const buf = await r.arrayBuffer(); const s = (performance.now() - t0) / 1000; const mbps = (buf.byteLength * 8 / s / 1e6).toFixed(1); $in(b, '[data-dl]').textContent = mbps + ' Mbps'; log(`Descarga: ${(buf.byteLength / 1e6).toFixed(1)} MB en ${s.toFixed(2)} s`); } catch { $in(b, '[data-dl]').textContent = 'No disponible'; log('La prueba de descarga fue bloqueada por el navegador o la red.'); }
        try { const r = await fetch('/proxy?ping=1'); const j = await r.json(); $in(b, '[data-px]').textContent = j.ok ? '✅ Activo' : '—'; } catch { $in(b, '[data-px]').textContent = '❌ No (solo servicios públicos)'; }
        e.target.disabled = false;
      };
    }
  });

  /* ============ PAINT ============ */
  R({
    id: 'paint', name: 'EISEN Paint', icon: '🖌️', cat: 'Creatividad', grad: ['#ea580c', '#a855f7'], w: 920, h: 600, pad: false,
    desc: 'Dibuja con pinceles, formas, relleno y texto; guarda en PNG.', kw: 'dibujar pintar canvas',
    features: ['Pincel, borrador, línea, rectángulo, círculo, relleno y texto', 'Deshacer y rehacer', 'Abrir imágenes y guardar en Archivos'],
    init(b) {
      const TOOLS = [['brush', '🖌️', 'Pincel'], ['eraser', '🧽', 'Borrador'], ['line', '📏', 'Línea'], ['rect', '▭', 'Rectángulo'], ['ellipse', '◯', 'Elipse'], ['fill', '🪣', 'Relleno'], ['text', '🔤', 'Texto'], ['pick', '💧', 'Cuentagotas']];
      const PAL = ['#000000', '#ffffff', '#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#78350f', '#64748b'];
      b.innerHTML = `<div class="pt"><div class="pt-tools">${TOOLS.map(([k, i, l]) => `<button data-tool="${k}" title="${l}"${k === 'brush' ? ' class="on"' : ''}>${i}</button>`).join('')}<hr><input type="color" data-col value="#1e293b"><input type="range" min="1" max="60" value="6" data-sz orient="vertical"><label class="ap-check-l" title="Relleno de formas"><input type="checkbox" data-fillshape> ■</label></div>
        <div class="pt-main"><div class="ap-toolbar"><button class="btn-secondary" data-a="new">Nuevo</button><button class="btn-secondary" data-a="open">Abrir</button><input type="file" accept="image/*" hidden data-file><button class="btn-secondary" data-a="undo">↶</button><button class="btn-secondary" data-a="redo">↷</button><button class="btn-primary" data-a="save">💾 Guardar</button><button class="btn-secondary" data-a="dl">⬇ PNG</button><span class="pt-pal">${PAL.map(c => `<i data-c="${c}" style="background:${c}"></i>`).join('')}</span></div><div class="pt-stage"><canvas data-cv width="1000" height="640"></canvas><canvas data-ov width="1000" height="640" class="pt-ov"></canvas></div></div></div>`;
      const cv = $in(b, '[data-cv]'), ctx = cv.getContext('2d', { willReadFrequently: true }), ov = $in(b, '[data-ov]'), oc = ov.getContext('2d');
      let tool = 'brush', undo = [], redo = [], drawing = null;
      const col = () => $in(b, '[data-col]').value, sz = () => +$in(b, '[data-sz]').value;
      const clear = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); };
      const snap = () => { undo.push(ctx.getImageData(0, 0, cv.width, cv.height)); if (undo.length > 25) undo.shift(); redo = []; };
      const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
      function flood(x, y, hex) {
        x = Math.floor(x); y = Math.floor(y); const W = cv.width, H = cv.height, img = ctx.getImageData(0, 0, W, H), d = img.data, i0 = (y * W + x) * 4, t = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
        const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255, 255]; if (t.every((v, k) => Math.abs(v - c[k]) < 3)) return;
        const same = i => Math.abs(d[i] - t[0]) < 32 && Math.abs(d[i + 1] - t[1]) < 32 && Math.abs(d[i + 2] - t[2]) < 32 && Math.abs(d[i + 3] - t[3]) < 32;
        const st = [[x, y]]; while (st.length) { let [px, py] = st.pop(); let i = (py * W + px) * 4; while (py >= 0 && same(i)) { py--; i -= W * 4; } py++; i += W * 4; let L = false, Rr = false;
          while (py < H && same(i)) { d.set(c, i); if (px > 0) { if (same(i - 4)) { if (!L) { st.push([px - 1, py]); L = true; } } else L = false; } if (px < W - 1) { if (same(i + 4)) { if (!Rr) { st.push([px + 1, py]); Rr = true; } } else Rr = false; } py++; i += W * 4; } }
        ctx.putImageData(img, 0, 0);
      }
      const shape = (c, x0, y0, x1, y1) => { c.strokeStyle = c.fillStyle = col(); c.lineWidth = sz(); c.lineCap = 'round'; c.beginPath();
        if (tool === 'line') { c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
        if (tool === 'rect') { c.rect(x0, y0, x1 - x0, y1 - y0); $in(b, '[data-fillshape]').checked ? c.fill() : c.stroke(); }
        if (tool === 'ellipse') { c.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, 7); $in(b, '[data-fillshape]').checked ? c.fill() : c.stroke(); } };
      ov.addEventListener('pointerdown', async e => {
        const [x, y] = pos(e); ov.setPointerCapture(e.pointerId);
        if (tool === 'pick') { const p = ctx.getImageData(x, y, 1, 1).data; $in(b, '[data-col]').value = '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join(''); return; }
        snap();
        if (tool === 'fill') { flood(x, y, col()); return; }
        if (tool === 'text') { const r = await E.form({ title: 'Texto', fields: [{ k: 't', label: 'Escribe el texto', req: true }] }); if (r) { ctx.fillStyle = col(); ctx.font = `bold ${sz() * 4}px system-ui`; ctx.fillText(r.t, x, y); } return; }
        drawing = { x, y, lx: x, ly: y };
        if (tool === 'brush' || tool === 'eraser') { ctx.beginPath(); ctx.fillStyle = tool === 'eraser' ? '#fff' : col(); ctx.arc(x, y, sz() / 2, 0, 7); ctx.fill(); }
      });
      ov.addEventListener('pointermove', e => {
        if (!drawing) return; const [x, y] = pos(e);
        if (tool === 'brush' || tool === 'eraser') { ctx.strokeStyle = tool === 'eraser' ? '#fff' : col(); ctx.lineWidth = sz(); ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(drawing.lx, drawing.ly); ctx.lineTo(x, y); ctx.stroke(); drawing.lx = x; drawing.ly = y; }
        else { oc.clearRect(0, 0, ov.width, ov.height); shape(oc, drawing.x, drawing.y, x, y); }
      });
      ov.addEventListener('pointerup', e => { if (!drawing) return; const [x, y] = pos(e); if (!['brush', 'eraser'].includes(tool)) { oc.clearRect(0, 0, ov.width, ov.height); shape(ctx, drawing.x, drawing.y, x, y); } drawing = null; });
      const loadImg = blob => { const im = new Image(); im.onload = () => { snap(); clear(); const s = Math.min(cv.width / im.width, cv.height / im.height, 1); ctx.drawImage(im, (cv.width - im.width * s) / 2, (cv.height - im.height * s) / 2, im.width * s, im.height * s); }; im.src = URL.createObjectURL(blob); };
      b.addEventListener('click', async e => {
        const t = e.target.closest('[data-tool]'); if (t) { tool = t.dataset.tool; $$in(b, '[data-tool]').forEach(x => x.classList.toggle('on', x === t)); }
        const c = e.target.closest('[data-c]'); if (c) $in(b, '[data-col]').value = c.dataset.c;
        const a = e.target.closest('[data-a]'); if (!a) return;
        ({ new: async () => { if (await E.confirm('Nuevo dibujo', '¿Borrar el lienzo actual?')) { snap(); clear(); } }, open: () => $in(b, '[data-file]').click(),
          undo: () => { if (undo.length) { redo.push(ctx.getImageData(0, 0, cv.width, cv.height)); ctx.putImageData(undo.pop(), 0, 0); } }, redo: () => { if (redo.length) { undo.push(ctx.getImageData(0, 0, cv.width, cv.height)); ctx.putImageData(redo.pop(), 0, 0); } },
          save: () => cv.toBlob(bl => E.saveToFiles(`Dibujo ${new Date().toLocaleString().replace(/[/:]/g, '-')}.png`, bl, 'images')), dl: () => cv.toBlob(bl => E.download('dibujo.png', bl)) }[a.dataset.a])();
      });
      $in(b, '[data-file]').onchange = e => { const f = e.target.files[0]; if (f) loadImg(f); e.target.value = ''; };
      b.closest('.window').addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); $in(b, '[data-a="undo"]').click(); } });
      clear();
    }
  });

  /* ============ EDITOR DE FOTOS ============ */
  let photoApi = null;
  R({
    id: 'photo', name: 'Editor de fotos', icon: '🎞️', cat: 'Creatividad', grad: ['#be123c', '#fb923c'], w: 940, h: 600, pad: false,
    desc: 'Ajusta brillo, contraste, color y filtros; gira, voltea y recorta.', kw: 'retocar imagen filtros recortar',
    features: ['Ajustes de luz y color', 'Filtros rápidos', 'Girar, voltear, recortar y exportar'],
    init(b) {
      const ADJ = [['brightness', 'Brillo', 0, 200, 100, '%'], ['contrast', 'Contraste', 0, 200, 100, '%'], ['saturate', 'Saturación', 0, 300, 100, '%'], ['hue-rotate', 'Tono', 0, 360, 0, 'deg'], ['blur', 'Desenfoque', 0, 10, 0, 'px'], ['sepia', 'Sepia', 0, 100, 0, '%'], ['grayscale', 'Grises', 0, 100, 0, '%'], ['invert', 'Invertir', 0, 100, 0, '%']];
      const PRE = { 'Original': {}, 'Cálido': { sepia: 30, saturate: 130, brightness: 105 }, 'Frío': { 'hue-rotate': 190, saturate: 80 }, 'B/N': { grayscale: 100, contrast: 120 }, 'Vintage': { sepia: 55, contrast: 90, brightness: 110 }, 'Dramático': { contrast: 160, saturate: 70, brightness: 90 } };
      b.innerHTML = `<div class="ph-ed"><aside class="ap-side"><div class="ap-row"><button class="btn-secondary" data-a="open">📂 Abrir</button><input type="file" accept="image/*" hidden data-file></div>${ADJ.map(([k, l, mi, ma, v]) => `<label>${l} <b data-v="${k}">${v}</b><input type="range" min="${mi}" max="${ma}" value="${v}" data-k="${k}"></label>`).join('')}<div class="ph-pre">${Object.keys(PRE).map(p => `<button class="btn-secondary" data-pre="${p}">${p}</button>`).join('')}</div></aside>
        <main class="ap-main"><div class="ap-toolbar"><button class="btn-secondary" data-a="rl">⟲</button><button class="btn-secondary" data-a="rr">⟳</button><button class="btn-secondary" data-a="fh">⇋</button><button class="btn-secondary" data-a="fv">⇵</button><button class="btn-secondary" data-a="crop">✂ Recortar</button><span class="ap-sep"></span><button class="btn-primary" data-a="save">💾 Guardar</button><button class="btn-secondary" data-a="dl">⬇</button></div><div class="pt-stage" data-st><canvas data-cv></canvas><div class="ph-crop" data-crop hidden></div></div></main></div>`;
      const cv = $in(b, '[data-cv]'), ctx = cv.getContext('2d'); let src = null, name = 'foto.png', rot = 0, fh = 1, fv = 1, cropMode = false, crop = null;
      const filt = () => ADJ.map(([k, , , , d, u]) => { const v = +$in(b, `[data-k="${k}"]`).value; return v === d ? '' : `${k}(${v}${u})`; }).filter(Boolean).join(' ') || 'none';
      function render(target = cv, full = false) {
        if (!src) { cv.width = 600; cv.height = 360; ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, 600, 360); ctx.fillStyle = '#94a3b8'; ctx.font = '18px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Abre una imagen para empezar', 300, 185); return; }
        const sw = crop ? crop.w : src.width, sh = crop ? crop.h : src.height, r90 = rot % 180 !== 0, c = target.getContext('2d');
        target.width = r90 ? sh : sw; target.height = r90 ? sw : sh;
        c.save(); c.filter = filt(); c.translate(target.width / 2, target.height / 2); c.rotate(rot * Math.PI / 180); c.scale(fh, fv);
        c.drawImage(src, crop ? crop.x : 0, crop ? crop.y : 0, sw, sh, -sw / 2, -sh / 2, sw, sh); c.restore();
      }
      const load = (blob, n) => { const im = new Image(); im.onload = () => { src = im; name = (n || 'foto').replace(/\.\w+$/, '') + '_editada.png'; rot = 0; fh = fv = 1; crop = null; render(); }; im.src = URL.createObjectURL(blob); };
      b.addEventListener('input', e => { const k = e.target.dataset.k; if (k) { $in(b, `[data-v="${k}"]`).textContent = e.target.value; render(); } });
      b.addEventListener('click', e => {
        const p = e.target.closest('[data-pre]'); if (p) { ADJ.forEach(([k, , , , d]) => { const v = PRE[p.dataset.pre][k] ?? d; $in(b, `[data-k="${k}"]`).value = v; $in(b, `[data-v="${k}"]`).textContent = v; }); render(); }
        const a = e.target.closest('[data-a]'); if (!a) return;
        ({ open: () => $in(b, '[data-file]').click(), rl: () => { rot = (rot + 270) % 360; render(); }, rr: () => { rot = (rot + 90) % 360; render(); }, fh: () => { fh *= -1; render(); }, fv: () => { fv *= -1; render(); },
          crop: () => { if (!src) return; if (rot) { toast('Recorta antes de girar (vuelve a 0°)'); return; } cropMode = !cropMode; a.classList.toggle('btn-primary', cropMode); $in(b, '[data-crop]').hidden = true; toast(cropMode ? 'Arrastra sobre la imagen para recortar' : 'Recorte cancelado'); },
          save: () => { if (!src) return; const c = document.createElement('canvas'); render(c, true); c.toBlob(bl => E.saveToFiles(name, bl, 'images')); }, dl: () => { if (!src) return; const c = document.createElement('canvas'); render(c, true); c.toBlob(bl => E.download(name, bl)); } }[a.dataset.a])();
      });
      let cs = null; const box = $in(b, '[data-crop]');
      cv.addEventListener('pointerdown', e => { if (!cropMode) return; const r = cv.getBoundingClientRect(); cs = { x: e.clientX, y: e.clientY, r }; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', e => { if (!cs) return; const st = $in(b, '[data-st]').getBoundingClientRect(); const x = Math.min(cs.x, e.clientX), y = Math.min(cs.y, e.clientY); box.hidden = false; box.style.cssText = `left:${x - st.left + $in(b, '[data-st]').scrollLeft}px;top:${y - st.top + $in(b, '[data-st]').scrollTop}px;width:${Math.abs(e.clientX - cs.x)}px;height:${Math.abs(e.clientY - cs.y)}px`; });
      cv.addEventListener('pointerup', e => { if (!cs) return; const r = cs.r, k = cv.width / r.width, ox = crop ? crop.x : 0, oy = crop ? crop.y : 0; const x0 = (Math.min(cs.x, e.clientX) - r.left) * k, y0 = (Math.min(cs.y, e.clientY) - r.top) * k, w = Math.abs(e.clientX - cs.x) * k, h = Math.abs(e.clientY - cs.y) * k; cs = null; box.hidden = true; if (w > 8 && h > 8) { const sx = fh < 0 ? cv.width - x0 - w : x0, sy = fv < 0 ? cv.height - y0 - h : y0; crop = { x: ox + sx, y: oy + sy, w, h }; cropMode = false; $in(b, '[data-a="crop"]').classList.remove('btn-primary'); render(); } });
      $in(b, '[data-file]').onchange = e => { const f = e.target.files[0]; if (f) load(f, f.name); e.target.value = ''; };
      photoApi = { load }; render();
    }
  });
  E.editPhoto = (blob, name) => { E.openWindow('photo'); setTimeout(() => photoApi && photoApi.load(blob, name), 30); };

  /* ============ PIXEL ART ============ */
  R({
    id: 'pixel', name: 'Pixel Art', icon: '👾', cat: 'Creatividad', grad: ['#4f46e5', '#ec4899'], w: 760, h: 600, pad: false,
    desc: 'Crea sprites pixel a pixel con espejo y exportación PNG.', kw: 'sprite 8 bits dibujo videojuego',
    features: ['Lienzos 16×16, 32×32 y 64×64', 'Modo espejo, relleno y cuentagotas', 'Exporta PNG ampliado'],
    init(b) {
      const PAL = ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'];
      let N = 16, px = storage.get('pixel_art', null), col = '#ff004d', tool = 'pen', mirror = false;
      if (!px || px.length !== N * N) px = Array(N * N).fill('');
      b.innerHTML = `<div class="ap-toolbar"><select class="input-text" data-n style="width:90px"><option>16</option><option>32</option><option>64</option></select><button class="btn-secondary on" data-t="pen">✏️</button><button class="btn-secondary" data-t="er">🧽</button><button class="btn-secondary" data-t="fill">🪣</button><button class="btn-secondary" data-t="pick">💧</button><button class="btn-secondary" data-mir>⇋ Espejo</button><button class="btn-secondary" data-clr>Limpiar</button><span class="ap-sep"></span><button class="btn-primary" data-save>💾 PNG</button></div><div class="px-wrap"><div class="px-pal">${PAL.map(c => `<i data-c="${c}" style="background:${c}"></i>`).join('')}<input type="color" data-col value="${col}"></div><canvas data-cv width="512" height="512" class="px-cv"></canvas></div>`;
      const cv = $in(b, '[data-cv]'), ctx = cv.getContext('2d');
      function draw() { const s = 512 / N; ctx.clearRect(0, 0, 512, 512); for (let i = 0; i < N * N; i++) { const x = i % N, y = Math.floor(i / N); ctx.fillStyle = px[i] || (((x + y) & 1) ? '#d1d5db' : '#f3f4f6'); ctx.fillRect(x * s, y * s, s, s); } if (N <= 32) { ctx.strokeStyle = '#0001'; for (let i = 0; i <= N; i++) { ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, 512); ctx.moveTo(0, i * s); ctx.lineTo(512, i * s); ctx.stroke(); } } storage.set('pixel_art', px); }
      const idx = e => { const r = cv.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) / r.width * N), y = Math.floor((e.clientY - r.top) / r.height * N); return x >= 0 && y >= 0 && x < N && y < N ? [x, y] : null; };
      const set = (x, y, c) => { px[y * N + x] = c; if (mirror) px[y * N + (N - 1 - x)] = c; };
      function fill(x, y) { const t = px[y * N + x], c = col; if (t === c) return; const st = [[x, y]]; while (st.length) { const [a, z] = st.pop(); if (a < 0 || z < 0 || a >= N || z >= N || px[z * N + a] !== t) continue; px[z * N + a] = c; st.push([a + 1, z], [a - 1, z], [a, z + 1], [a, z - 1]); } }
      let down = false;
      const act = e => { const p = idx(e); if (!p) return; const [x, y] = p; if (tool === 'pick') { col = px[y * N + x] || col; $in(b, '[data-col]').value = col; return; } if (tool === 'fill') fill(x, y); else set(x, y, tool === 'er' ? '' : col); draw(); };
      cv.addEventListener('pointerdown', e => { down = true; cv.setPointerCapture(e.pointerId); act(e); });
      cv.addEventListener('pointermove', e => { if (down && (tool === 'pen' || tool === 'er')) act(e); });
      cv.addEventListener('pointerup', () => down = false);
      b.addEventListener('click', async e => {
        const c = e.target.closest('[data-c]'); if (c) { col = c.dataset.c; $in(b, '[data-col]').value = col; tool = 'pen'; $$in(b, '[data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === 'pen')); }
        const t = e.target.closest('[data-t]'); if (t) { tool = t.dataset.t; $$in(b, '[data-t]').forEach(x => x.classList.toggle('on', x === t)); }
        if (e.target.closest('[data-mir]')) { mirror = !mirror; e.target.classList.toggle('on', mirror); }
        if (e.target.closest('[data-clr]') && await E.confirm('Limpiar', '¿Borrar todo el dibujo?')) { px = Array(N * N).fill(''); draw(); }
        if (e.target.closest('[data-save]')) { const s = Math.max(1, Math.floor(512 / N)), c2 = document.createElement('canvas'); c2.width = c2.height = N * s; const x2 = c2.getContext('2d'); px.forEach((v, i) => { if (v) { x2.fillStyle = v; x2.fillRect((i % N) * s, Math.floor(i / N) * s, s, s); } }); c2.toBlob(bl => E.saveToFiles(`sprite_${N}x${N}.png`, bl, 'images')); }
      });
      $in(b, '[data-col]').oninput = e => col = e.target.value;
      $in(b, '[data-n]').onchange = async e => { if (!await E.confirm('Cambiar tamaño', 'Se borrará el dibujo actual. ¿Continuar?')) { e.target.value = N; return; } N = +e.target.value; px = Array(N * N).fill(''); draw(); };
      draw();
    }
  });

  /* ============ PALETAS DE COLOR ============ */
  R({
    id: 'colors', name: 'Paletas de color', icon: '🌈', cat: 'Creatividad', grad: ['#f43f5e', '#06b6d4'], w: 720, h: 520,
    desc: 'Genera armonías de color, tonos y revisa el contraste (WCAG).', kw: 'colores diseño hex rgb contraste',
    features: ['Complementarios, tríadas y análogos', 'Comprobador de contraste WCAG', 'Guardar paletas y copiar HEX'],
    init(b) {
      b.innerHTML = `<div class="ap-col"><div class="ap-row"><input type="color" data-c value="#6366f1" style="width:64px;height:44px"><input class="input-text mono" data-hex value="#6366f1" style="width:110px"><select class="input-text" data-h style="width:160px"><option value="comp">Complementario</option><option value="tri">Tríada</option><option value="ana">Análogo</option><option value="tet">Tétrada</option><option value="mono">Monocromático</option></select><button class="btn-secondary" data-rnd>🎲 Aleatorio</button><button class="btn-secondary" data-save>⭐ Guardar</button></div><div class="cl-pal" data-pal></div><div class="cl-shades" data-sh></div><div class="ap-card"><b>Contraste</b><div class="ap-row"><input type="color" data-fg value="#ffffff"><span>sobre</span><input type="color" data-bg value="#6366f1"><div class="cl-prev" data-prev>Texto de ejemplo Aa</div><b data-ratio></b></div></div><div data-saved class="ap-col"></div></div>`;
      const hex2hsl = h => { let r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, bl = parseInt(h.slice(5, 7), 16) / 255; const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); let H = 0, S = 0; const L = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; S = L > .5 ? d / (2 - mx - mn) : d / (mx + mn); H = mx === r ? (g - bl) / d + (g < bl ? 6 : 0) : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; H *= 60; } return [H, S * 100, L * 100]; };
      const hsl2hex = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); };
      const lum = h => { const c = [1, 3, 5].map(i => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
      const sw = c => `<button class="cl-sw" data-copy="${c}" style="background:${c};color:${lum(c) > .4 ? '#000' : '#fff'}">${c}</button>`;
      function draw() {
        const c = $in(b, '[data-c]').value, [h, s, l] = hex2hsl(c), m = $in(b, '[data-h]').value;
        const set = { comp: [0, 180], tri: [0, 120, 240], ana: [-30, 0, 30, 60], tet: [0, 90, 180, 270], mono: null }[m];
        const pal = set ? set.map(d => hsl2hex((h + d + 360) % 360, s, l)) : [20, 35, 50, 65, 80].map(L => hsl2hex(h, s, L));
        $in(b, '[data-pal]').innerHTML = pal.map(sw).join(''); $in(b, '[data-sh]').innerHTML = [95, 85, 70, 55, 40, 28, 16].map(L => sw(hsl2hex(h, s, L))).join('');
        $in(b, '[data-hex]').value = c; $in(b, '[data-bg]').value = c; contrast(); b.dataset.pal = JSON.stringify(pal);
      }
      function contrast() { const f = $in(b, '[data-fg]').value, g = $in(b, '[data-bg]').value, L1 = lum(f), L2 = lum(g), r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); $in(b, '[data-prev]').style.cssText = `color:${f};background:${g}`; $in(b, '[data-ratio]').textContent = `${r.toFixed(2)}:1 ${r >= 7 ? 'AAA ✅' : r >= 4.5 ? 'AA ✅' : r >= 3 ? 'AA grande ⚠️' : '❌'}`; }
      const saved = () => $in(b, '[data-saved]').innerHTML = (storage.get('palettes', [])).map((p, i) => `<div class="ap-row cl-saved">${p.map(sw).join('')}<button class="ap-ico" data-del="${i}">✕</button></div>`).join('');
      $in(b, '[data-c]').oninput = draw; $in(b, '[data-h]').onchange = draw; $in(b, '[data-fg]').oninput = contrast; $in(b, '[data-bg]').oninput = contrast;
      $in(b, '[data-hex]').onchange = e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) { $in(b, '[data-c]').value = e.target.value; draw(); } };
      b.addEventListener('click', e => {
        const c = e.target.closest('[data-copy]'); if (c) { navigator.clipboard && navigator.clipboard.writeText(c.dataset.copy); toast('Copiado ' + c.dataset.copy); }
        if (e.target.closest('[data-rnd]')) { $in(b, '[data-c]').value = hsl2hex(Math.random() * 360, 50 + Math.random() * 40, 40 + Math.random() * 25); draw(); }
        if (e.target.closest('[data-save]')) { const l = storage.get('palettes', []); l.unshift(JSON.parse(b.dataset.pal)); storage.set('palettes', l.slice(0, 20)); saved(); }
        const d = e.target.closest('[data-del]'); if (d) { const l = storage.get('palettes', []); l.splice(+d.dataset.del, 1); storage.set('palettes', l); saved(); }
      });
      draw(); saved();
    }
  });

  /* ============ EDITOR DE CÓDIGO (HTML/CSS/JS) ============ */
  R({
    id: 'code', name: 'Code Studio', icon: '🧩', cat: 'Desarrollo', grad: ['#0f172a', '#22c55e'], w: 980, h: 600, pad: false,
    desc: 'Editor HTML, CSS y JavaScript con vista previa en vivo y consola.', kw: 'programar html css javascript web',
    features: ['Vista previa instantánea aislada', 'Consola integrada', 'Guarda proyectos como .html en Archivos'],
    init(b) {
      const def = { html: '<h1>Hola, EISENKU 👋</h1>\n<button id="b">Púlsame</button>\n<p id="o"></p>', css: 'body{font-family:system-ui;padding:20px;background:#0f172a;color:#e2e8f0}\nbutton{padding:10px 18px;border-radius:10px;border:0;background:#22c55e;font-weight:700}', js: "let n = 0;\ndocument.getElementById('b').onclick = () => {\n  n++;\n  document.getElementById('o').textContent = 'Clics: ' + n;\n  console.log('clic', n);\n};" };
      let p = storage.get('code_proj', def), tab = 'html';
      b.innerHTML = `<div class="ap-toolbar"><div class="ap-tabs" style="margin:0">${['html', 'css', 'js'].map(t => `<button data-t="${t}"${t === 'html' ? ' class="on"' : ''}>${t.toUpperCase()}</button>`).join('')}</div><label class="ap-check-l"><input type="checkbox" data-auto checked> Auto</label><button class="btn-primary" data-run>▶ Ejecutar</button><button class="btn-secondary" data-save>💾 Guardar .html</button><button class="btn-secondary" data-open>↗ Abrir en pestaña</button><button class="btn-secondary" data-reset>Plantilla</button></div><div class="cs"><textarea class="ap-editor mono" data-ed spellcheck="false"></textarea><div class="cs-right"><iframe data-pv sandbox="allow-scripts allow-modals" title="Vista previa"></iframe><div class="cs-con mono" data-con></div></div></div>`;
      const ed = $in(b, '[data-ed]'), pv = $in(b, '[data-pv]'), con = $in(b, '[data-con]');
      const doc = () => `<!doctype html><html><head><meta charset="utf-8"><style>${p.css}</style><script>(function(){var P=parent;['log','warn','error','info'].forEach(function(k){var o=console[k];console[k]=function(){try{P.postMessage({eiscode:1,k:k,a:[].map.call(arguments,function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}o.apply(console,arguments)}});addEventListener('error',function(e){P.postMessage({eiscode:1,k:'error',a:e.message+' (línea '+e.lineno+')'},'*')})})()<\/script></head><body>${p.html}<script>${p.js.replace(/<\/script/gi, '<\\/script')}<\/script></body></html>`;
      const run = () => { con.innerHTML = ''; pv.srcdoc = doc(); };
      window.addEventListener('message', e => { if (e.source === pv.contentWindow && e.data && e.data.eiscode) { con.insertAdjacentHTML('beforeend', `<div class="cs-${esc(e.data.k)}">› ${esc(e.data.a)}</div>`); con.scrollTop = con.scrollHeight; } });
      const show = () => { ed.value = p[tab]; $$in(b, '[data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === tab)); };
      let tm; ed.oninput = () => { p[tab] = ed.value; storage.set('code_proj', p); if ($in(b, '[data-auto]').checked) { clearTimeout(tm); tm = setTimeout(run, 500); } };
      ed.onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); const s = ed.selectionStart; ed.setRangeText('  ', s, ed.selectionEnd, 'end'); ed.oninput(); } };
      b.addEventListener('click', async e => {
        const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; show(); }
        if (e.target.closest('[data-run]')) run();
        if (e.target.closest('[data-save]')) { const r = await E.form({ title: 'Guardar proyecto', fields: [{ k: 'n', label: 'Nombre', value: 'mi_pagina.html' }] }); if (r) E.saveToFiles(r.n.endsWith('.html') ? r.n : r.n + '.html', new Blob([doc()], { type: 'text/html' })); }
        if (e.target.closest('[data-open]')) E.ebOpenHtml('Code Studio', doc(), true);
        if (e.target.closest('[data-reset]') && await E.confirm('Plantilla', '¿Reemplazar el código por la plantilla inicial?')) { p = JSON.parse(JSON.stringify(def)); storage.set('code_proj', p); show(); run(); }
      });
      show(); run();
    }
  });
})();

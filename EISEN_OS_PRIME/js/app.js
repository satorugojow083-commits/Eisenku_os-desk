(() => {
  'use strict';

  /* --------------------------------------------------------------------------
     A. UTILIDADES Y ESTADO PERSISTENTE
     -------------------------------------------------------------------------- */
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const storage = {
    get: (k, def) => { try { return JSON.parse(localStorage.getItem('eisen_' + k)) ?? def; } catch { return def; } },
    set: (k, val) => { try { localStorage.setItem('eisen_' + k, JSON.stringify(val)); return true; } catch { return false; } }
  };

  let zIndexCounter = 100;
  let activeWindow = null;

  /* --------------------------------------------------------------------------
     B. GESTIÓN DE VENTANAS (VENTANAS MIN/MAX/MOVE)
     -------------------------------------------------------------------------- */
  function openWindow(winId) {
    const win = $('#win-' + winId);
    if (!win) {
      // 9.0: apps de carga diferida (su ventana se crea al abrirlas por primera vez)
      const r = window.EISEN && window.EISEN.REG && window.EISEN.REG[winId];
      if (r && r.launch) r.launch();
      return;
    }
    win.classList.remove('minimized');
    if (!win.classList.contains('open') && window.innerWidth < 700) win.classList.add('maximized');
    win.classList.add('open');
    focusWindow(win);
    updateTaskbarButtons();
    // Acciones automáticas por app al abrir
    if (winId === 'excel') renderExcelTable();
    if (winId === 'arcade') initShooterGame();
    if (winId === 'explorer') renderExplorer();
    if (winId === 'browser') ebInit();
    win.classList.remove('eis-anim-in'); void win.offsetWidth; win.classList.add('eis-anim-in');
    const hk = (window.EISEN_HOOKS || {})[winId]; if (hk) hk.forEach(f => { try { f(win); } catch (e) { console.error(e); } });
    try { const rc = storage.get('recent_apps', []).filter(x => x !== winId); rc.unshift(winId); storage.set('recent_apps', rc.slice(0, 12)); } catch { /* ignorar */ }
    document.dispatchEvent(new CustomEvent('eisen:open', { detail: winId })); // 9.0: historial de actividad y escritorios virtuales
  }

  function focusWindow(win) {
    $$('.window').forEach(w => w.classList.remove('active'));
    win.classList.add('active');
    win.style.zIndex = ++zIndexCounter;
    activeWindow = win;
  }

  function setupWindowInteractions() { $$('.window').forEach(wireWindow); }
  function snapWindow(win, side) {
    if (!win.dataset.prev) win.dataset.prev = JSON.stringify({ l: win.style.left, t: win.style.top, w: win.style.width, h: win.style.height });
    const top = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) || 0;
    const bottom = (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--taskbar-h')) || 48);
    const H = window.innerHeight - top - bottom, W = window.innerWidth;
    win.style.top = top + 'px'; win.style.height = H + 'px'; win.style.width = Math.floor(W / 2) + 'px';
    win.style.left = side === 'left' ? '0px' : Math.ceil(W / 2) + 'px';
    win.classList.add('snapped');
  }
  function unsnap(win, clientX) {
    if (!win.dataset.prev) return;
    try { const p = JSON.parse(win.dataset.prev); win.style.width = p.w; win.style.height = p.h; if (clientX != null) win.style.left = Math.max(0, clientX - win.offsetWidth / 2) + 'px'; } catch { /* ignorar */ }
    delete win.dataset.prev; win.classList.remove('snapped');
  }
  function wireWindow(win) {
    if (win.__wired) return; win.__wired = true;
    {
      win.addEventListener('pointerdown', () => focusWindow(win));
      const header = win.querySelector('.window-header');
      if (!header) return;

      // Arrastrar ventana
      let drag = null;
      header.addEventListener('pointerdown', e => {
        if (e.target.closest('button') || win.classList.contains('maximized')) return;
        if (win.classList.contains('snapped')) unsnap(win, e.clientX);
        const rect = win.getBoundingClientRect();
        drag = { x: e.clientX - rect.left, y: e.clientY - rect.top, sx: e.clientX, sy: e.clientY };
        header.setPointerCapture(e.pointerId);
        focusWindow(win);
      });
      header.addEventListener('pointermove', e => {
        if (!drag) return;
        const newX = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, e.clientX - drag.x));
        const minY = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) || 0;
        const newY = Math.max(minY, Math.min(window.innerHeight - 50, e.clientY - drag.y));
        drag.moved = true;
        win.style.left = newX + 'px';
        win.style.top = newY + 'px';
      });
      const stopDrag = () => drag = null;
      header.addEventListener('pointerup', e => {
        if (drag && drag.moved && storage.get('snap', true)) {
          const top = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) || 0;
          if (e.clientX <= 6) snapWindow(win, 'left');
          else if (e.clientX >= window.innerWidth - 6) snapWindow(win, 'right');
          else if (e.clientY <= top + 4) { win.classList.add('maximized'); updateTaskbarButtons(); }
        }
        drag = null;
      });
      header.addEventListener('pointercancel', stopDrag);

      // Doble click maximizar
      header.addEventListener('dblclick', e => {
        if (e.target.closest('button')) return;
        win.classList.toggle('maximized');
      });

      // Botones ventana
      win.querySelectorAll('.win-ctrl-btn').forEach(btn => {
        btn.onclick = () => {
          const act = btn.dataset.act;
          if (act === 'close') { win.classList.remove('open', 'maximized', 'minimized', 'active'); document.dispatchEvent(new CustomEvent('eisen:close', { detail: win.id.replace('win-', '') })); }
          if (act === 'min') win.classList.add('minimized');
          if (act === 'max') { win.classList.toggle('maximized'); win.classList.remove('minimized'); }
          updateTaskbarButtons();
        };
      });
    }
  }

  function updateTaskbarButtons() {
    document.dispatchEvent(new CustomEvent('eisen:windows'));
    $$('#taskbar-center [data-launch]').forEach(tbBtn => {
      const app = tbBtn.dataset.launch;
      const win = $('#win-' + app);
      if (win && win.classList.contains('open')) {
        tbBtn.classList.add('running');
        tbBtn.classList.toggle('active', win.classList.contains('active') && !win.classList.contains('minimized'));
      } else {
        tbBtn.classList.remove('running', 'active');
      }
    });
  }

  /* --------------------------------------------------------------------------
     NAVEGADOR EISEN: pestañas internas, 3 navegadores, buscador y proxy opcional
     -------------------------------------------------------------------------- */
  const EB_BROWSERS = {
    web:  { name: 'Eisen Web',     icon: '🌐', color: '#0078d4', engine: 'Google',     search: 'https://www.google.com/search?q=%s&igu=1', desc: 'Navegador general con buscador Google.' },
    priv: { name: 'Eisen Privado', icon: '🕶️', color: '#8b5cf6', engine: 'DuckDuckGo', search: 'https://html.duckduckgo.com/html/?q=%s',  desc: 'Búsquedas con DuckDuckGo, sin rastreo.' },
    nova: { name: 'Eisen Nova',    icon: '🧭', color: '#10b981', engine: 'Bing',       search: 'https://www.bing.com/search?q=%s',        desc: 'Búsquedas con Bing.' }
  };
  // 9.0 (seguridad): los permisos sensibles (cámara, micrófono, ubicación…) ya no se delegan a cualquier sitio;
  // se conceden por sitio desde Navegador › Información del sitio (window.EISEN.ebSitePerms).
  const EB_ALLOW = 'fullscreen; autoplay; encrypted-media; picture-in-picture; clipboard-write; web-share; accelerometer; gyroscope';
  const ebAllowFor = url => {
    let h = ''; try { h = new URL(url).hostname; } catch { /* about:, blob:, data: */ }
    let extra = []; try { const f = window.EISEN && window.EISEN.ebSitePerms; if (f && h) extra = f(h) || []; } catch { extra = []; }
    const ok = ['camera', 'microphone', 'geolocation', 'clipboard-read', 'display-capture', 'midi', 'payment', 'usb', 'serial', 'bluetooth'];
    return [EB_ALLOW].concat(extra.filter(x => ok.includes(x))).join('; ');
  };
  const EB_SANDBOX = 'allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-presentation allow-pointer-lock allow-popups-to-escape-sandbox';
  const eb = { cur: 'web', sessions: {}, ready: false, proxyDetected: false, uid: 0 };
  const ebEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ebS = () => eb.sessions[eb.cur];
  const ebCur = () => ebS().tabs.find(t => t.id === ebS().active);
  const ebHost = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  const ebQ = (u, k = 'q') => { try { return new URLSearchParams(String(u).split('?').slice(1).join('?')).get(k) || ''; } catch { return ''; } };
  const ebTitle = t => t.title || (t.url === 'about:newtab' ? 'Nueva pestaña' : t.url === 'about:html' ? 'Documento' : /^about:search/.test(t.url) ? ebQ(t.url) + ' · Buscar' : t.url === 'about:history' ? 'Historial' : t.url === 'about:bookmarks' ? 'Favoritos' : /^about:reader/.test(t.url) ? 'Lectura · ' + ebHost(ebQ(t.url, 'u')) : ebHost(t.url));
  const ebInternal = u => /^about:(search|history|bookmarks|reader)/.test(u);
  const ebNative = () => storage.get('search_native', true);
  const ebProxyMode = () => storage.get('browser_proxy_mode', 'auto');
  const ebCustomProxy = () => String(storage.get('browser_proxy_url', '') || '').trim();
  const ebPrefix = () => ebCustomProxy() || eb.alt || '/proxy?url=';
  const ebSameOriginProxy = () => { try { return new URL(ebPrefix(), location.href).origin === location.origin; } catch { return false; } };

  function ebMakeTab(url) {
    return { id: 't' + (++eb.uid), url, title: '', hist: [url], hi: 0, loading: false, loaded: false, frame: null, htmlSrc: '', forceProxy: false, noteOff: false, tok: 0, mode: '', eff: '' };
  }
  const ebUseProxy = t => ebMode(t) === 'server';

  function ebResolve(raw) {
    const v = String(raw || '').trim();
    if (!v) return '';
    if (/^about:(newtab|blank)$/i.test(v)) return 'about:newtab';
    if (/^about:(search|history|bookmarks|reader)/i.test(v)) return v;
    if (/^(https?|file|blob|data):/i.test(v)) return v;
    if (/^(localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?([/?#]|$)/i.test(v)) return 'http://' + v;
    if (!/\s/.test(v) && /^([\w-]+\.)+[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(v)) return 'https://' + v;
    return ebNative() ? 'about:search?q=' + encodeURIComponent(v) : EB_BROWSERS[eb.cur].search.replace('%s', encodeURIComponent(v));
  }

  /* ---- Modo compatibilidad: carga páginas sin servidor propio ---- */
  const EB_PROXIES = [
    u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    u => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u),
    u => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
    u => ({ url: 'https://api.allorigins.win/get?url=' + encodeURIComponent(u), json: 'contents' })
  ];
  const ebHtmlCache = new Map();
  const EB_MEDIA = /\.(png|jpe?g|gif|webp|svg|ico|pdf|mp4|webm|mp3|ogg|wav)(\?|#|$)/i;
  const ebHaveProxy = () => eb.proxyDetected || !!ebCustomProxy();
  const ebProxyBase = () => ebPrefix().replace(/\/proxy\?url=$/, '');
  const ebSiteMode = h => (storage.get('site_mode', {}) || {})[h] || '';
  function ebMode(t) {
    if (!/^https?:/i.test(t.url)) return 'local';
    if (t.mode) return t.mode;
    const m = ebProxyMode(), sm = ebSiteMode(ebHost(t.url));
    if (EB_MEDIA.test(t.url)) return 'direct';
    if (/(^|\.)google\.[a-z.]+$/.test(ebHost(t.url)) && /[?&]igu=1/.test(t.url)) return 'direct';
    if (sm && (sm !== 'server' || ebHaveProxy())) return sm;
    if (m === 'off') return 'direct';
    if (m === 'on') return 'server';
    return ebHaveProxy() ? 'auto' : 'compat';
  }
  const ebProbeCache = new Map();
  function ebProbe(url) {
    let h; try { h = new URL(url).host; } catch { return Promise.resolve(false); }
    if (ebProbeCache.has(h)) return Promise.resolve(ebProbeCache.get(h));
    const c = new AbortController(), to = setTimeout(() => c.abort(), 6000);
    return fetch(ebProxyBase() + '/proxy?probe=' + encodeURIComponent(url), { signal: c.signal }).finally(() => clearTimeout(to)).then(r => r.json()).then(j => { ebProbeCache.set(h, !!j.frameable); return !!j.frameable; }).catch(() => false);
  }
  function ebFetchHtml(url) {
    const hit = ebHtmlCache.get(url); if (hit && Date.now() - hit.d < 120000) return Promise.resolve(hit.v);
    return ebFetchHtml0(url).then(v => { ebHtmlCache.set(url, { v, d: Date.now() }); if (ebHtmlCache.size > 40) ebHtmlCache.delete(ebHtmlCache.keys().next().value); return v; });
  }
  function ebFetchHtml0(url) {
    // PRIME 11 (privacidad): si hay proxy propio se usa primero, solo; los proxies públicos de terceros únicamente si falla
    const race = mk => new Promise((res, rej) => {
      let left = mk.length; const ctrls = []; if (!left) return rej(new Error('fail'));
      mk.forEach((u, i) => {
        const c = new AbortController(); ctrls.push(c);
        const to = setTimeout(() => c.abort(), 15000);
        const spec = u(), su = typeof spec === 'string' ? spec : spec.url;
        fetch(su, { signal: c.signal }).then(async r => {
          if (!r.ok) throw 0;
          let txt = await r.text();
          if (spec.json) { try { txt = JSON.parse(txt)[spec.json] || ''; } catch { throw 0; } }
          if (txt.trim().length < 20) throw 0;
          return txt;
        }).then(txt => { clearTimeout(to); ctrls.forEach((x, j) => { if (j !== i) x.abort(); }); res(txt); })
          .catch(() => { clearTimeout(to); if (--left === 0) rej(new Error('fail')); });
      });
    });
    const pub = EB_PROXIES.map(f => () => f(url));
    if (ebHaveProxy()) { let own = null; try { const a = new URL(url); own = ebProxyBase() + '/p/' + a.protocol.slice(0, -1) + '/' + a.host + a.pathname + a.search; } catch { /* ignorar */ } if (own) return race([() => own]).catch(() => race(pub)); }
    return race(pub);
  }
  async function ebFetchBlob(url) {
    const tries = [() => url];
    if (ebHaveProxy()) { try { const a = new URL(url); tries.push(() => ebProxyBase() + '/p/' + a.protocol.slice(0, -1) + '/' + a.host + a.pathname + a.search); } catch { /* ignorar */ } }
    tries.push(() => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url));
    for (const mk of tries) { try { const r = await fetch(mk()); if (r.ok) return await r.blob(); } catch { /* siguiente */ } }
    throw new Error('fail');
  }
  const decodeEnt = t => { const x = document.createElement('textarea'); x.innerHTML = t; return x.value; };
  async function ytSearch(q) {
    const key = storage.get('yt_key', '');
    if (key) {
      try {
        const r = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=24&q=' + encodeURIComponent(q) + '&key=' + encodeURIComponent(key));
        const j = await r.json();
        if (j.items) return j.items.filter(i => i.id && i.id.videoId).map(i => ({ id: i.id.videoId, title: decodeEnt(i.snippet.title), channel: i.snippet.channelTitle, len: '', views: '' }));
      } catch { /* usar el método sin clave */ }
    }
    const html = await ebFetchHtml('https://www.youtube.com/results?hl=es&search_query=' + encodeURIComponent(q));
    const d = JSON.parse(html.match(/ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/)[1]);
    const vids = [], tx = x => x ? (x.simpleText || (x.runs || []).map(r => r.text).join('')) : '';
    (function w(o) { if (!o || typeof o !== 'object') return; if (o.videoRenderer && o.videoRenderer.videoId) vids.push({ id: o.videoRenderer.videoId, title: tx(o.videoRenderer.title), channel: tx(o.videoRenderer.ownerText), len: tx(o.videoRenderer.lengthText), views: tx(o.videoRenderer.viewCountText) }); for (const k in o) w(o[k]); })(d);
    return vids;
  }
  const EB_SHIM_SRC = "(function(R,I){var H;try{H=new URL(R).host}catch(e){H=location.host}var P=parent;function post(m){m.eisen=1;try{P.postMessage(m,'*')}catch(e){}}var okL=1,okC=1;try{localStorage.getItem('x')}catch(e){okL=0}try{void document.cookie}catch(e){okC=0}if(okL&&okC)return;var has=Object.prototype.hasOwnProperty,tm=0,L={},C={};try{if(I){L=I.l||{};C=I.c||{}}}catch(e){}function sync(){clearTimeout(tm);tm=setTimeout(function(){post({st:{h:H,l:L,c:C}})},400)}function mk(d,pe){var api={getItem:function(k){k=String(k);return has.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v);if(pe)sync()},removeItem:function(k){delete d[String(k)];if(pe)sync()},clear:function(){for(var k in d)delete d[k];if(pe)sync()},key:function(i){var a=Object.keys(d);return a[i]===undefined?null:a[i]}};return new Proxy(api,{get:function(t,k){if(k==='length')return Object.keys(d).length;if(typeof k==='string'&&has.call(t,k))return t[k];if(typeof k==='string'&&has.call(d,k))return d[k];return undefined},set:function(t,k,v){d[String(k)]=String(v);if(pe)sync();return true},deleteProperty:function(t,k){delete d[k];if(pe)sync();return true},has:function(t,k){return has.call(t,k)||has.call(d,k)},ownKeys:function(){return Object.keys(d)},getOwnPropertyDescriptor:function(t,k){return has.call(d,k)?{value:d[k],enumerable:true,configurable:true,writable:true}:undefined}})}if(!okL){var ls=mk(L,1),ss=mk({},0);try{Object.defineProperty(window,'localStorage',{get:function(){return ls},configurable:true})}catch(e){}try{Object.defineProperty(window,'sessionStorage',{get:function(){return ss},configurable:true})}catch(e){}}if(!okC){try{Object.defineProperty(document,'cookie',{get:function(){return Object.keys(C).map(function(k){return k+'='+C[k]}).join('; ')},set:function(v){var p=String(v).split(';'),nv=p.shift(),i=nv.indexOf('=');if(i<1)return;var n=nv.slice(0,i).trim(),val=nv.slice(i+1).trim(),del=false;p.forEach(function(x){var q=x.trim().split('='),k=q[0].toLowerCase();if(k==='max-age'&&parseInt(q[1],10)<=0)del=true;if(k==='expires'&&Date.parse(q.slice(1).join('='))<Date.now())del=true});if(del)delete C[n];else C[n]=val;sync()},configurable:true})}catch(e){}}addEventListener('message',function(e){var m=e.data;if(!m||!m.eisenst||e.source!==P)return;var a=m.l||{},b=m.c||{},k;for(k in a)if(!has.call(L,k))L[k]=a[k];for(k in b)if(!has.call(C,k))C[k]=b[k]});post({stget:H})})";
  const EB_EXTONLY = /^(accounts\.google\.com|login\.microsoftonline\.com|login\.live\.com|appleid\.apple\.com|idmsa\.apple\.com|signin\.aws\.amazon\.com|auth\.openai\.com)$/;
  const ebStore = () => storage.get('eb_store', {}) || {};
  function ebShimTag(base) {
    let h = ''; try { h = new URL(base).host; } catch { /* ignorar */ }
    return '<script>' + EB_SHIM_SRC + '(' + JSON.stringify(base).replace(/</g, '\\u003c') + ',' + JSON.stringify(ebStore()[h] || null).replace(/</g, '\\u003c') + ')<\/script>';
  }
  function ebInject(base) {
    return ebShimTag(base) + '<base href="' + base.replace(/"/g, '&quot;') + '"><script>(function(){var P=parent;function s(m){m.eisen=1;P.postMessage(m,"*")}' +
      'document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a[href]");if(!a||e.defaultPrevented||e.button>0)return;var h=a.getAttribute("href")||"";if(/^(javascript:|mailto:|tel:)/i.test(h))return;e.preventDefault();if(h.charAt(0)==="#"){var el=document.getElementById(h.slice(1))||document.getElementsByName(h.slice(1))[0];if(el)el.scrollIntoView();return}s({nav:a.href,tab:(e.ctrlKey||e.metaKey||a.target==="_blank")?1:0})},true);' +
      'document.addEventListener("submit",function(e){var f=e.target;if(e.defaultPrevented)return;e.preventDefault();var u=new URL(f.getAttribute("action")||"",document.baseURI);if((f.method||"get").toLowerCase()==="get")u.search="";new FormData(f).forEach(function(v,k){if(typeof v==="string")u.searchParams.append(k,v)});s({nav:u.href})},true);' +
      'window.open=function(u){if(u)s({nav:new URL(u,document.baseURI).href,tab:1});return null};' +
      'addEventListener("load",function(){s({loaded:1,title:document.title,url:' + JSON.stringify(base).replace(/</g, '\\u003c') + '})})})()<\/script>';
  }
  function ebPrepare(html, url) {
    html = html.replace(/<meta[^>]+http-equiv=["']?content-security-policy[^>]*>/gi, '').replace(/<base\b[^>]*>/gi, '');
    const inj = ebInject(url);
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, m => m + inj);
    if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, m => m + inj);
    return inj + html;
  }
  function ebUnwrap(u) {
    try {
      const x = new URL(u), h = x.hostname; let r = '';
      if (/(^|\.)duckduckgo\.com$/.test(h) && x.pathname === '/l/') r = x.searchParams.get('uddg') || '';
      else if (/(^|\.)google\.[a-z.]+$/.test(h) && x.pathname === '/url') r = x.searchParams.get('q') || x.searchParams.get('url') || '';
      else if (/(^|\.)bing\.com$/.test(h) && x.pathname.startsWith('/ck/')) { let v = x.searchParams.get('u') || ''; if (/^a1/.test(v)) { try { r = atob(v.slice(2).replace(/-/g, '+').replace(/_/g, '/')); } catch { r = ''; } } }
      if (/^https?:/i.test(r)) return r;
    } catch { /* ignorar */ }
    return u;
  }
  function ebPageStyle() {
    const light = document.documentElement.dataset.theme === 'light';
    return { bg: light ? '#f4f6fb' : '#161a24', fg: light ? '#191c24' : '#f5f6fa', mut: light ? '#5e6678' : '#9aa1b2', card: light ? '#ffffff' : '#222838', color: EB_BROWSERS[eb.cur].color };
  }
  const EB_LINKJS = '<script>document.querySelectorAll("a[data-u]").forEach(function(a){a.onclick=function(e){e.preventDefault();parent.postMessage({eisen:1,nav:a.dataset.u},"*")}});var f=document.getElementById("f");if(f)f.onsubmit=function(e){e.preventDefault();var v=document.getElementById("q").value.trim();if(v)parent.postMessage({eisen:1,nav:"https://www.youtube.com/results?search_query="+encodeURIComponent(v)},"*")};<\/script>';
  function ebErrorHtml(url) {
    const c = ebPageStyle(), h = ebHost(url), B = (x, l, p) => `<button data-${x}="${ebEsc(p || '')}" style="border:0;border-radius:99px;background:${c.color};color:#fff;font-weight:700;padding:9px 16px;margin:4px;cursor:pointer">${l}</button>`;
    return `<!doctype html><meta charset="utf-8"><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:${c.bg};color:${c.fg};font-family:system-ui,sans-serif;text-align:center"><div style="max-width:500px;padding:20px"><div style="font-size:44px">🛰️</div><h2>${ebEsc(trI('No se pudo cargar la página'))}</h2><p style="color:${c.mut};font-size:13px;word-break:break-all">${ebEsc(url)}</p><p style="color:${c.mut};font-size:13px">${ebEsc(trI('Los servicios públicos de conexión no respondieron. Prueba otra opción:'))}</p><div>${B('retry', '↻ Reintentar')}${B('u', '📖 Modo lectura', 'about:reader?u=' + encodeURIComponent(url))}${B('ext', '↗ Pestaña real')}${B('u', '🔎 Buscar ' + ebEsc(h), 'about:search?q=' + encodeURIComponent(h))}</div><p style="color:${c.mut};font-size:12px;margin-top:18px">${ebEsc(trI('Para la máxima compatibilidad abre EISENKU con INICIAR.bat (proxy propio) o súbelo a Cloudflare Pages / Netlify.'))}</p></div><script>document.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.u!==undefined)parent.postMessage({eisen:1,nav:b.dataset.u},'*');if(b.dataset.retry!==undefined)parent.postMessage({eisen:1,retry:1},'*');if(b.dataset.ext!==undefined)parent.postMessage({eisen:1,ext:1},'*')})<\/script></body>`;
  }
  async function ebCompat(t) {
    const f = t.frame, tok = ++t.tok;
    f.removeAttribute('src'); f.setAttribute('sandbox', EB_SANDBOX);
    t.loading = true;
    let html;
    try {
      html = await ebFetchHtml(t.url);
      const g = t.url.match(/^https?:\/\/(www\.)?google\.[a-z.]+\/search\?(.*)/i);
      if (g && !/\/url\?q=/.test(html)) { // Google exige JavaScript: usar DuckDuckGo con la misma búsqueda
        const q = new URLSearchParams(g[2]).get('q');
        if (q) { const n = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q); if (t.tok !== tok) return; t.url = n; t.hist[t.hi] = n; html = await ebFetchHtml(n); }
      }
    } catch {
      if (t.tok !== tok) return;
      f.srcdoc = ebErrorHtml(t.url); return;
    }
    if (t.tok !== tok) return;
    f.srcdoc = ebPrepare(html, t.url);
    ebRenderBar();
  }
  function ebYtId(u) {
    try {
      const x = new URL(u), h = x.hostname.replace(/^www\.|^m\./, '');
      if (h === 'youtu.be') return x.pathname.slice(1).split('/')[0];
      if (/^(music\.)?youtube(-nocookie)?\.com$/.test(h)) {
        if (x.pathname === '/watch') return x.searchParams.get('v') || '';
        const m = x.pathname.match(/^\/(shorts|embed|live)\/([\w-]{6,})/); if (m) return m[2];
      }
    } catch { /* ignorar */ }
    return '';
  }
  const ebIsYtSearch = u => { try { const x = new URL(u), h = x.hostname.replace(/^www\.|^m\./, ''); return h === 'youtube.com' && (x.pathname === '/results' || x.pathname === '/'); } catch { return false; } };
  async function ebYoutube(t) {
    const f = t.frame, tok = ++t.tok; let q = 'tendencias';
    try { q = new URL(t.url).searchParams.get('search_query') || q; } catch { /* ignorar */ }
    f.removeAttribute('src'); f.removeAttribute('sandbox'); t.loading = true;
    let vids = [];
    try { vids = await ytSearch(q); } catch { /* sin resultados */ }
    if (t.tok !== tok) return;
    t.title = 'YouTube · ' + q;
    const c = ebPageStyle();
    const cards = vids.slice(0, 40).map(v => `<a href="#" data-u="https://www.youtube.com/watch?v=${ebEsc(v.id)}" class="c"><div class="th"><img loading="lazy" src="https://i.ytimg.com/vi/${ebEsc(v.id)}/hqdefault.jpg"><i>${ebEsc(v.len)}</i></div><b>${ebEsc(v.title)}</b><span>${ebEsc(v.channel)} ${v.views ? '· ' + ebEsc(v.views) : ''}</span></a>`).join('');
    f.srcdoc = `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:${c.bg};color:${c.fg};font-family:system-ui,sans-serif;padding:14px}form{display:flex;gap:8px;max-width:700px;margin:0 auto 16px}input{flex:1;padding:11px 16px;border-radius:99px;border:2px solid ${c.color}66;background:${c.card};color:${c.fg};font-size:14px;outline:none}button{border:0;border-radius:99px;background:#e62117;color:#fff;font-weight:700;padding:0 20px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}.c{color:${c.fg};text-decoration:none;display:flex;flex-direction:column;gap:4px;font-size:13px}.th{position:relative;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#000}.th img{width:100%;height:100%;object-fit:cover}.th i{position:absolute;right:6px;bottom:6px;background:#000c;color:#fff;font-size:11px;padding:1px 5px;border-radius:4px;font-style:normal}.c span{color:${c.mut};font-size:12px}</style><body><form id="f"><input id="q" value="${ebEsc(q)}" placeholder="YouTube"><button>▶ ${ebEsc(trI('Buscar'))}</button></form><div class="g">${cards || `<p style="color:${c.mut}">${ebEsc(trI('Sin resultados'))}. ${ebEsc(trI('Puedes añadir una clave API de YouTube en Ajustes › Aplicaciones vinculadas.'))}</p>`}</div></body>${EB_LINKJS}`;
  }
  const ebSpotifyEmbed = u => { try { const x = new URL(u); if (!/(^|\.)open\.spotify\.com$/.test(x.hostname)) return ''; const m = x.pathname.match(/\/(track|album|playlist|artist|show|episode)\/(\w+)/); return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0` : ''; } catch { return ''; } };
  const ebIsSpotify = u => /(^|\.)open\.spotify\.com$/.test(ebHost(u));
  function ebTwitch(t) {
    const f = t.frame, c = ebPageStyle();
    const m = (() => { try { return new URL(t.url).pathname.match(/^\/(\w{3,25})\/?$/); } catch { return null; } })();
    const ch = m && !/^(directory|downloads|jobs|turbo|settings|videos|p|search)$/i.test(m[1]) ? m[1] : '';
    f.removeAttribute('sandbox'); f.removeAttribute('src'); t.loading = false; t.title = 'Twitch' + (ch ? ' · ' + ch : '');
    const host = encodeURIComponent(location.hostname || 'localhost');
    f.srcdoc = `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;height:100vh;display:flex;flex-direction:column;background:${c.bg};color:${c.fg};font-family:system-ui,sans-serif}form{display:flex;gap:8px;padding:10px}input{flex:1;padding:10px 16px;border-radius:99px;border:2px solid #9146ff88;background:${c.card};color:${c.fg};outline:none}button{border:0;border-radius:99px;background:#9146ff;color:#fff;font-weight:700;padding:0 20px}.v{flex:1;display:flex;min-height:0}.v iframe{border:0;height:100%}.v iframe:first-child{flex:1}.v iframe:last-child{width:320px}</style><body><form id="f"><input id="q" value="${ebEsc(ch)}" placeholder="${ebEsc(trI('Canal de Twitch'))}"><button>${ebEsc(trI('Ver'))}</button></form>${ch ? `<div class="v"><iframe allowfullscreen allow="autoplay; fullscreen" src="https://player.twitch.tv/?channel=${ch}&parent=${host}"></iframe><iframe src="https://www.twitch.tv/embed/${ch}/chat?parent=${host}&darkpopout"></iframe></div>` : `<p style="padding:20px;color:${c.mut}">${ebEsc(trI('Escribe el nombre de un canal de Twitch.'))}</p>`}<script>document.getElementById("f").onsubmit=function(e){e.preventDefault();var v=document.getElementById("q").value.trim();if(v)parent.postMessage({eisen:1,nav:"https://www.twitch.tv/"+v.replace(/[^\\w]/g,"")},"*")};<\/script>`;
    ebRenderTabs(); ebRenderBar();
  }
  function ebNewTabHtml() {
    const b = EB_BROWSERS[eb.cur], c = ebPageStyle();
    const base = [['Wikipedia', 'https://' + ebWikiLang() + '.wikipedia.org', '📚'], ['YouTube', 'https://www.youtube.com', '▶️'], ['GitHub', 'https://github.com', '🐙'], ['Mapas', 'https://www.openstreetmap.org', '🗺️'], ['Noticias', 'https://news.google.com', '📰'], ['Traductor', 'https://translate.google.com', '🔤']];
    const cnt = {}; ebHist().forEach(x => { const h = ebHost(x.u); cnt[h] = cnt[h] || { n: 0, u: x.u, t: x.t }; cnt[h].n++; });
    const top = Object.entries(cnt).sort((x, y) => y[1].n - x[1].n).slice(0, 8);
    const marks = ebMarks().slice(0, 12);
    const tile = (u, t, ic) => `<a data-u="${ebEsc(u)}" title="${ebEsc(t)}"><span>${ic}</span>${ebEsc(t).slice(0, 18)}</a>`;
    return ebShell(trI('Nueva pestaña'), `<div class="nt"><div class="logo">${b.icon}</div><h1>${ebEsc(b.name)}</h1>
<form id="f" data-base=""><input id="q" autofocus autocomplete="off" placeholder="${ebEsc(trI('Busca lo que quieras o escribe una dirección'))}"><button>${ebEsc(trI('Buscar'))}</button></form>
<p class="mut" style="font-size:12px">${ebEsc(trI('Buscador:'))} ${ebNative() ? 'resultados EISEN (' + (b.engine === 'Bing' ? 'Bing' : 'DuckDuckGo') + ' + Wikipedia)' : b.engine}${eb.cur === 'priv' ? ' · ' + ebEsc(trI('sin historial')) : ''}</p>
${marks.length ? `<h4>⭐ ${ebEsc(trI('Favoritos'))}</h4><div class="l">${marks.map(m => tile(m.u, m.t, ebFav(ebHost(m.u)))).join('')}</div>` : ''}
<h4>${top.length ? '🔥 ' + ebEsc(trI('Más visitados')) : '🚀 ' + ebEsc(trI('Accesos rápidos'))}</h4><div class="l">${(top.length ? top.map(([h, v]) => tile('https://' + h, h, ebFav(h))) : base.map(l => tile(l[1], l[0], l[2]))).join('')}</div>
<p style="margin-top:20px"><a class="chip" data-u="about:history">🕘 ${ebEsc(trI('Historial'))}</a><a class="chip" data-u="about:bookmarks">⭐ ${ebEsc(trI('Favoritos'))}</a></p></div>`,
      `.nt{width:min(720px,92vw);margin:6vh auto;text-align:center}.logo{font-size:54px}h1{margin:6px 0 18px;font-size:26px}h4{text-align:left;margin:22px 0 8px;color:${c.mut};font-weight:600}.nt form{max-width:none}
.l{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:10px}.l a{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 6px;border-radius:14px;background:${c.card};color:${c.fg};font-size:12px;overflow:hidden}.l a:hover{outline:2px solid ${c.color};text-decoration:none}.l span{font-size:22px;line-height:1}.l span img{width:24px;height:24px}`);
  }

  /* ---- v8: páginas internas (buscador EISEN, historial, favoritos, lectura) ---- */
  const ebHist = () => storage.get('browser_history', []) || [];
  const ebMarks = () => storage.get('browser_bookmarks', []) || [];
  function ebRecord(t) {
    if (eb.cur === 'priv' || !/^https?:/i.test(t.url)) return;
    const h = ebHist();
    if (h[0] && h[0].u === t.url) { if (t.title) h[0].t = t.title; h[0].d = Date.now(); }
    else h.unshift({ u: t.url, t: t.title || ebHost(t.url), d: Date.now() });
    storage.set('browser_history', h.slice(0, 400));
  }
  function ebToggleMark() {
    const t = ebCur(); if (!t || !/^https?:/i.test(t.url)) return;
    const m = ebMarks(), i = m.findIndex(x => x.u === t.url);
    if (i >= 0) { m.splice(i, 1); toast(trI('Quitado de favoritos')); } else { m.unshift({ u: t.url, t: ebTitle(t) }); toast(trI('Añadido a favoritos ⭐')); }
    storage.set('browser_bookmarks', m.slice(0, 200)); ebRenderBar();
  }
  const EB_PAGEJS = `<script>document.addEventListener('click',function(e){var a=e.target.closest('[data-u]');if(a){e.preventDefault();parent.postMessage({eisen:1,nav:a.dataset.u,tab:(e.ctrlKey||e.metaKey)?1:0},'*');return}var c=e.target.closest('[data-cmd]');if(c){e.preventDefault();parent.postMessage({eisen:1,cmd:c.dataset.cmd,arg:c.dataset.arg||''},'*')}});document.addEventListener('auxclick',function(e){var a=e.target.closest('[data-u]');if(a&&e.button===1){e.preventDefault();parent.postMessage({eisen:1,nav:a.dataset.u,tab:1},'*')}});var f=document.getElementById('f');if(f)f.onsubmit=function(e){e.preventDefault();var v=document.getElementById('q').value.trim();if(v)parent.postMessage({eisen:1,nav:f.hasAttribute('data-base')?v:'about:search?q='+encodeURIComponent(v)},'*')};var hq=document.getElementById('hq');if(hq)hq.oninput=function(){var v=hq.value.toLowerCase();document.querySelectorAll('[data-row]').forEach(function(r){r.style.display=r.textContent.toLowerCase().indexOf(v)>=0?'':'none'})};<\/script>`;
  function ebShell(title, body, extraCss = '') {
    const c = ebPageStyle();
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ebEsc(title)}</title><style>
*{box-sizing:border-box}body{margin:0;background:${c.bg};color:${c.fg};font:14px/1.5 system-ui,"Segoe UI",sans-serif}a{color:${c.color};text-decoration:none;cursor:pointer}a:hover{text-decoration:underline}
.top{position:sticky;top:0;z-index:2;display:flex;gap:10px;align-items:center;padding:12px 18px;background:${c.bg}ee;backdrop-filter:blur(10px);border-bottom:1px solid ${c.mut}33}
.top b{font-size:18px;white-space:nowrap}form{display:flex;flex:1;gap:8px;max-width:720px}input{flex:1;min-width:0;padding:10px 16px;border-radius:99px;border:2px solid ${c.color}55;background:${c.card};color:${c.fg};font-size:14px;outline:none}input:focus{border-color:${c.color}}
button{border:0;border-radius:99px;background:${c.color};color:#fff;font-weight:700;padding:0 18px;cursor:pointer;min-height:38px}.ghost{background:transparent;border:1px solid ${c.mut}66;color:${c.fg};font-weight:600}
.wrap{max-width:1080px;margin:0 auto;padding:14px 18px 40px}.mut{color:${c.mut}}.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 14px}.tabs a{padding:6px 14px;border-radius:99px;background:${c.card};color:${c.fg};font-size:13px}.tabs a.on{background:${c.color};color:#fff}
.card{background:${c.card};border-radius:14px;padding:14px 16px;margin-bottom:12px;box-shadow:0 1px 3px #0002}.res h3{margin:2px 0 4px;font-size:17px;font-weight:600}.res .u{font-size:12px;color:${c.mut};display:flex;gap:6px;align-items:center;word-break:break-all}.res .u img{width:16px;height:16px;border-radius:4px}.res p{margin:0;color:${c.fg}cc;font-size:13.5px}
.grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px}@media(max-width:820px){.grid{grid-template-columns:1fr}}
.kp img{width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin-bottom:8px}.sk{height:64px;border-radius:14px;margin-bottom:12px;background:linear-gradient(90deg,${c.card},${c.mut}22,${c.card});background-size:200% 100%;animation:sk 1.2s infinite}@keyframes sk{to{background-position:-200% 0}}
.vids{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}.vids a{color:${c.fg}}.vids img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;background:#0003}.vids b{display:block;font-size:13px;margin-top:4px}
.chip{display:inline-block;padding:6px 12px;border-radius:99px;background:${c.card};margin:3px;font-size:13px;color:${c.fg}}.row{display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:10px}.row:hover{background:${c.card}}.row img{width:16px;height:16px}.row .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.x{background:transparent;color:${c.mut};min-height:28px;padding:0 10px}
${extraCss}</style></head><body>${body}${EB_PAGEJS}</body></html>`;
  }
  const ebFav = h => `<img loading="lazy" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=32" alt="">`;
  function ebParseResults(html, kind) {
    const d = new DOMParser().parseFromString(html, 'text/html'), out = [];
    if (kind === 'ddg') d.querySelectorAll('.result').forEach(r => {
      if (r.classList.contains('result--ad')) return;
      const a = r.querySelector('.result__a'); if (!a) return;
      let href = a.getAttribute('href') || ''; if (href.startsWith('//')) href = 'https:' + href;
      href = ebUnwrap(href); if (!/^https?:/i.test(href) || /duckduckgo\.com\/y\.js/.test(href)) return;
      out.push({ u: href, t: a.textContent.trim(), s: (r.querySelector('.result__snippet') || {}).textContent || '' });
    });
    if (kind === 'bing') d.querySelectorAll('li.b_algo').forEach(r => {
      const a = r.querySelector('h2 a'); if (!a) return;
      const href = ebUnwrap(a.getAttribute('href') || ''); if (!/^https?:/i.test(href)) return;
      out.push({ u: href, t: a.textContent.trim(), s: ((r.querySelector('.b_caption p, .b_lineclamp2, .b_lineclamp3, .b_algoSlug, p') || {}).textContent || '').trim() });
    });
    return out;
  }
  async function ebWebResults(q) {
    const eng = EB_BROWSERS[eb.cur].engine, order = eng === 'Bing' ? ['bing', 'ddg'] : ['ddg', 'bing'];
    const urls = { ddg: 'https://html.duckduckgo.com/html/?kl=' + (ebWikiLang() === 'es' ? 'es-es' : 'wt-wt') + '&q=' + encodeURIComponent(q), bing: 'https://www.bing.com/search?setlang=es&q=' + encodeURIComponent(q) };
    for (const k of order) { try { const r = ebParseResults(await ebFetchHtml(urls[k]), k); if (r.length) return { src: k === 'ddg' ? 'DuckDuckGo' : 'Bing', items: r }; } catch { /* siguiente */ } }
    return { src: '', items: [] };
  }
  const ebWikiLang = () => (window.EISEN_I18N && window.EISEN_I18N.lang) || 'es';
  async function ebWiki(q) {
    const L = ebWikiLang(), base = `https://${L}.wikipedia.org`;
    const c = new AbortController(), to = setTimeout(() => c.abort(), 8000);
    try {
      const j = await (await fetch(`${base}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5&format=json&origin=*&utf8=1`, { signal: c.signal })).json();
      const items = ((j.query && j.query.search) || []).map(x => ({ u: `${base}/wiki/${encodeURIComponent(x.title.replace(/ /g, '_'))}`, t: x.title, s: decodeEnt(String(x.snippet).replace(/<[^>]+>/g, '')) }));
      let sum = null;
      if (items[0]) { try { const r = await fetch(`${base}/api/rest_v1/page/summary/${encodeURIComponent(items[0].t)}`, { signal: c.signal }); if (r.ok) sum = await r.json(); } catch { /* sin resumen */ } }
      return { items, sum };
    } catch { return { items: [], sum: null }; } finally { clearTimeout(to); }
  }
  function ebSearchBody(q, tab, inner, side = '') {
    const T = (k, l) => `<a data-u="about:search?q=${encodeURIComponent(q)}&tab=${k}" class="${tab === k ? 'on' : ''}">${l}</a>`;
    const ext = [['Google', 'https://www.google.com/search?igu=1&q='], ['Bing', 'https://www.bing.com/search?q='], ['DuckDuckGo', 'https://html.duckduckgo.com/html/?q='], ['Wikipedia', `https://${ebWikiLang()}.wikipedia.org/w/index.php?search=`]].map(([n, u]) => `<a class="chip" data-u="${u}${encodeURIComponent(q)}">${n} ↗</a>`).join('');
    return `<div class="top"><b>🔎 EISEN</b><form id="f"><input id="q" value="${ebEsc(q)}" autocomplete="off"><button>${ebEsc(trI('Buscar'))}</button></form></div><div class="wrap"><div class="tabs">${T('all', '🌐 Todo')}${T('videos', '▶ Videos')}${T('wiki', '📚 Wikipedia')}</div><div class="grid"><div>${inner}</div><div>${side}<div class="card"><b>${ebEsc(trI('Buscar también en'))}</b><div style="margin-top:6px">${ext}</div></div></div></div></div>`;
  }
  const ebResHtml = r => { const h = ebHost(r.u); return `<div class="card res"><div class="u">${ebFav(h)}<span>${ebEsc(h)}</span></div><h3><a data-u="${ebEsc(r.u)}">${ebEsc(r.t)}</a></h3><p>${ebEsc(r.s).slice(0, 320)}</p></div>`; };
  async function ebSearchPage(t) {
    const f = t.frame, tok = ++t.tok, q = ebQ(t.url), tab = ebQ(t.url, 'tab') || 'all';
    f.removeAttribute('src'); f.setAttribute('sandbox', 'allow-scripts allow-popups');
    t.loading = true; t.busy = true; t.eff = 'local'; t.title = q + ' · Buscar';
    f.srcdoc = ebShell(t.title, ebSearchBody(q, tab, '<div class="sk"></div>'.repeat(5)));
    ebRender();
    let inner = '', side = '';
    if (tab === 'videos') {
      let v = []; try { v = await ytSearch(q); } catch { /* sin videos */ }
      inner = v.length ? `<div class="vids">${v.slice(0, 30).map(x => `<a data-u="https://www.youtube.com/watch?v=${ebEsc(x.id)}"><img loading="lazy" src="https://i.ytimg.com/vi/${ebEsc(x.id)}/mqdefault.jpg"><b>${ebEsc(x.title)}</b><span class="mut">${ebEsc(x.channel)} ${x.len ? '· ' + ebEsc(x.len) : ''}</span></a>`).join('')}</div>` : `<div class="card">${ebEsc(trI('No se pudieron obtener videos ahora. Abre YouTube directamente:'))} <a data-u="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}">YouTube</a></div>`;
    } else {
      const [web, wk] = await Promise.all([tab === 'wiki' ? Promise.resolve({ items: [] }) : ebWebResults(q), ebWiki(q)]);
      if (t.tok !== tok) return;
      if (wk.sum && wk.sum.extract) side = `<div class="card kp">${wk.sum.thumbnail ? `<img src="${ebEsc(wk.sum.thumbnail.source)}" alt="">` : ''}<b style="font-size:17px">${ebEsc(wk.sum.title)}</b><p class="mut" style="margin:2px 0 6px">${ebEsc(wk.sum.description || '')}</p><p>${ebEsc(wk.sum.extract).slice(0, 600)}</p><a data-u="${ebEsc((wk.sum.content_urls && wk.sum.content_urls.desktop && wk.sum.content_urls.desktop.page) || wk.items[0].u)}">Wikipedia ↗</a></div>`;
      const wikiCards = wk.items.map(ebResHtml).join('');
      if (tab === 'wiki') inner = wikiCards || `<div class="card">${ebEsc(trI('Sin resultados en Wikipedia.'))}</div>`;
      else if (web.items.length) inner = `<p class="mut" style="margin:0 0 8px;font-size:12px">${ebEsc(trI('Resultados web vía'))} ${web.src}</p>` + web.items.slice(0, 20).map(ebResHtml).join('') + (wk.items.length ? `<h3 style="margin:18px 0 8px">📚 Wikipedia</h3>` + wikiCards : '');
      else inner = `<div class="card">⚠️ ${ebEsc(trI('Los buscadores web no respondieron desde aquí (sin proxy propio). Mostrando Wikipedia; usa los botones de la derecha para abrir Google, Bing o DuckDuckGo.'))}</div>` + (wikiCards || `<div class="card">${ebEsc(trI('Sin resultados.'))}</div>`);
    }
    if (t.tok !== tok) return;
    t.busy = false; f.srcdoc = ebShell(t.title, ebSearchBody(q, tab, inner, side));
    ebDone(t); ebRender();
  }
  function ebHistoryPage(t) {
    const h = ebHist(), days = {};
    h.forEach(x => { const k = new Date(x.d).toLocaleDateString(); (days[k] = days[k] || []).push(x); });
    const body = `<div class="top"><b>🕘 ${ebEsc(trI('Historial'))}</b><form onsubmit="return false"><input id="hq" placeholder="${ebEsc(trI('Buscar en el historial'))}"></form><button class="ghost" data-cmd="histclear">${ebEsc(trI('Borrar todo'))}</button></div><div class="wrap">` +
      (Object.entries(days).map(([d, l]) => `<h3>${ebEsc(d)}</h3><div class="card">${l.map(x => `<div class="row" data-row><span class="mut" style="font-size:12px;min-width:70px">${new Date(x.d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>${ebFav(ebHost(x.u))}<a class="t" data-u="${ebEsc(x.u)}" title="${ebEsc(x.u)}">${ebEsc(x.t)}</a><span class="mut" style="font-size:12px">${ebEsc(ebHost(x.u))}</span><button class="x" data-cmd="histdel" data-arg="${ebEsc(x.u)}">✕</button></div>`).join('')}</div>`).join('') || `<div class="card mut">${ebEsc(trI('El historial está vacío.'))} ${eb.cur === 'priv' ? ebEsc(trI('(Eisen Privado no guarda historial)')) : ''}</div>`) + '</div>';
    t.frame.removeAttribute('src'); t.frame.setAttribute('sandbox', 'allow-scripts'); t.frame.srcdoc = ebShell('Historial', body); t.loading = false; t.eff = 'local';
  }
  function ebBookmarksPage(t) {
    const m = ebMarks();
    const body = `<div class="top"><b>⭐ ${ebEsc(trI('Favoritos'))}</b><form onsubmit="return false"><input id="hq" placeholder="${ebEsc(trI('Buscar en favoritos'))}"></form></div><div class="wrap"><div class="card">` + (m.map(x => `<div class="row" data-row>${ebFav(ebHost(x.u))}<a class="t" data-u="${ebEsc(x.u)}">${ebEsc(x.t)}</a><span class="mut" style="font-size:12px">${ebEsc(ebHost(x.u))}</span><button class="x" data-cmd="markdel" data-arg="${ebEsc(x.u)}">✕</button></div>`).join('') || `<span class="mut">${ebEsc(trI('Aún no tienes favoritos. Pulsa ☆ en la barra para guardar una página.'))}</span>`) + '</div></div>';
    t.frame.removeAttribute('src'); t.frame.setAttribute('sandbox', 'allow-scripts'); t.frame.srcdoc = ebShell('Favoritos', body); t.loading = false; t.eff = 'local';
  }
  function ebExtract(html, url) {
    const d = new DOMParser().parseFromString(html, 'text/html');
    const title = (d.querySelector('meta[property="og:title"]') || {}).content || d.title || ebHost(url);
    d.querySelectorAll('script,style,noscript,nav,header,footer,aside,form,iframe,svg,button,[role=navigation],[aria-hidden=true],.ad,.ads,.advert,.cookie,.share,.social,.comments').forEach(x => x.remove());
    let root = d.querySelector('article') || d.querySelector('main') || d.querySelector('[role=main]');
    if (!root) { let best = d.body, sc = 0; d.querySelectorAll('div,section').forEach(x => { const v = [...x.children].filter(c => c.tagName === 'P').reduce((a, p) => a + p.textContent.length, 0); if (v > sc) { sc = v; best = x; } }); root = best; }
    const abs = u => { try { return new URL(u, url).href; } catch { return ''; } };
    const parts = []; let n = 0;
    (root ? root.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,pre,img,figcaption,table') : []).forEach(el => {
      if (n > 400) return; const tg = el.tagName.toLowerCase();
      if (tg === 'img') { const src = abs(el.getAttribute('src') || el.getAttribute('data-src') || ''); if (/^https?:/.test(src) && !/(pixel|spacer|1x1|logo)/i.test(src)) { parts.push(`<img loading="lazy" src="${ebEsc(src)}" alt="${ebEsc(el.alt || '')}">`); n++; } return; }
      if (el.closest('li') && tg !== 'li') return;
      if (tg === 'table') { parts.push('<div style="overflow:auto">' + el.outerHTML.replace(/\son\w+="[^"]*"/gi, '').replace(/<a\b[^>]*>/gi, '<span>').replace(/<\/a>/gi, '</span>') + '</div>'); n++; return; }
      const txt = el.textContent.replace(/\s+/g, ' ').trim(); if (txt.length < (tg === 'p' ? 25 : 2)) return;
      let inner = ebEsc(txt);
      const a = el.querySelector('a[href]'); if (a && tg === 'li') { const h = abs(a.getAttribute('href')); if (/^https?:/.test(h)) inner = `<a data-u="${ebEsc(h)}">${inner}</a>`; }
      parts.push(`<${tg}>${inner}</${tg}>`); n++;
    });
    return { title, html: parts.join('\n') };
  }
  async function ebReaderPage(t) {
    const f = t.frame, tok = ++t.tok, u = ebQ(t.url, 'u');
    f.removeAttribute('src'); f.setAttribute('sandbox', 'allow-scripts'); t.loading = true; t.busy = true; t.eff = 'local';
    f.srcdoc = ebShell('Lectura', '<div class="wrap" style="max-width:760px"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>'); ebRender();
    let r; try { r = ebExtract(await ebFetchHtml(u), u); } catch { r = null; }
    if (t.tok !== tok) return;
    const css = '.rd{max-width:760px;margin:0 auto;padding:20px 20px 60px;font:18px/1.75 Georgia,"Times New Roman",serif}.rd h1{font:700 30px/1.25 system-ui,sans-serif}.rd img{max-width:100%;border-radius:10px;margin:10px 0}.rd pre{white-space:pre-wrap;background:#0002;padding:10px;border-radius:8px;font-size:14px}.rd blockquote{border-left:4px solid currentColor;margin:0;padding-left:14px;opacity:.85}.rd table{border-collapse:collapse;font:14px system-ui}.rd td,.rd th{border:1px solid #8885;padding:4px 8px}';
    t.title = r ? r.title : 'Lectura'; t.busy = false;
    f.srcdoc = ebShell(t.title, r && r.html ? `<div class="top"><b>📖</b><span class="mut" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ebEsc(u)}</span><button class="ghost" data-u="${ebEsc(u)}">${ebEsc(trI('Ver original'))}</button></div><article class="rd"><h1>${ebEsc(r.title)}</h1>${r.html}</article>` : ebErrorHtml(u).replace(/^<!doctype html><meta charset="utf-8">/, ''), css);
    ebDone(t); ebRender();
  }
  function ebLoadInternal(t) {
    ebWatch(t);
    if (/^about:search/.test(t.url)) return ebSearchPage(t);
    if (t.url === 'about:history') return ebHistoryPage(t);
    if (t.url === 'about:bookmarks') return ebBookmarksPage(t);
    if (/^about:reader/.test(t.url)) return ebReaderPage(t);
  }

  function ebEnsureFrame(t) {
    if (t.frame) return;
    const f = document.createElement('iframe');
    f.className = 'eb-frame';
    f.setAttribute('allow', EB_ALLOW);
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    f.addEventListener('load', () => {
      if (!f.getAttribute('src') && !f.hasAttribute('srcdoc')) return;
      if (!t.busy) ebDone(t);
      try { const d = f.contentDocument; if (d && d.title && /^https?:/i.test(t.url) && (t.eff || ebMode(t)) === 'direct') t.title = d.title; } catch { /* sitio de otro origen */ }
      ebRenderTabs(); ebRenderBar();
    });
    $('#eb-views').appendChild(f);
    t.frame = f;
  }

  function ebWatch(t) {
    clearTimeout(t.wd); t.slow = false; const tok = t.tok;
    t.wd = setTimeout(() => {
      if (!(t.loading && t.tok === tok)) return;
      t.slow = true; ebRenderBar();
      t.wd = setTimeout(() => { if (t.loading && t.tok === tok) { t.loading = false; t.noteOff = false; ebRender(); toast(trI('La página no terminó de cargar. Prueba Lectura, otro modo o pestaña real.')); } }, 35000);
    }, 20000);
  }
  function ebDone(t) { clearTimeout(t.wd); t.slow = false; t.loading = false; }
  function ebExtPage(t) {
    const c = ebPageStyle(), f = t.frame; t.eff = 'adapter'; t.loading = false; f.removeAttribute('src'); f.setAttribute('sandbox', EB_SANDBOX);
    f.srcdoc = `<!doctype html><meta charset="utf-8"><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:${c.bg};color:${c.fg};font-family:system-ui,sans-serif;text-align:center"><div style="max-width:440px;padding:20px"><div style="font-size:44px">🔐</div><h2>${ebEsc(ebHost(t.url))}</h2><p style="color:${c.mut};font-size:13px">${ebEsc(trI('Por seguridad este sitio no permite iniciar sesión dentro de otra página. Ábrelo en una pestaña real del navegador.'))}</p><p><button id="a" style="border:0;border-radius:99px;background:${c.color};color:#fff;font-weight:700;padding:10px 20px;cursor:pointer">${ebEsc(trI('Abrir en pestaña real ↗'))}</button> <button id="b" style="border:1px solid ${c.mut};border-radius:99px;background:transparent;color:${c.fg};padding:10px 20px;cursor:pointer">${ebEsc(trI('Intentar aquí de todos modos'))}</button></p></div><script>a.onclick=function(){parent.postMessage({eisen:1,ext:1},"*")};b.onclick=function(){parent.postMessage({eisen:1,force:1},"*")}<\/script>`;
  }
  function ebLoad(t) {
    ebEnsureFrame(t);
    const f = t.frame;
    t.loaded = true; t.seen = Date.now();
    f.setAttribute('allow', ebAllowFor(t.url)); // permisos delegados según el sitio (se evalúan al navegar)
    // 9.0 (seguridad): blob:/data: escritos a mano se aíslan (podrían contener HTML con el origen de EISENKU)
    if (/^(blob|data):/i.test(t.url) && !(window.EISEN && window.EISEN.trustedBlobs && window.EISEN.trustedBlobs.has(t.url))) {
      t.tok++; f.removeAttribute('srcdoc'); f.setAttribute('sandbox', 'allow-scripts allow-downloads'); t.eff = 'local'; t.loading = false; f.src = t.url; return;
    }
    if (t.url === 'about:newtab' || t.url === 'about:html') {
      if (t.sbx) f.setAttribute('sandbox', EB_SANDBOX); else f.removeAttribute('sandbox');
      f.removeAttribute('src');
      f.srcdoc = t.url === 'about:html' ? t.htmlSrc : ebNewTabHtml();
      t.loading = false; t.eff = 'local';
      return;
    }
    if (ebInternal(t.url)) { t.busy = false; ebLoadInternal(t); return; }
    t.tok++; ebWatch(t);
    f.removeAttribute('srcdoc');
    t.eff = '';
    ebRecord(t);
    if (/^https?:/i.test(t.url) && !t.force && EB_EXTONLY.test(ebHost(t.url))) { ebExtPage(t); return; }
    const yt = ebYtId(t.url), sp = ebSpotifyEmbed(t.url);
    if (yt) { f.removeAttribute('sandbox'); t.loading = true; t.eff = 'adapter'; t.title = t.title || 'YouTube'; f.src = 'https://www.youtube-nocookie.com/embed/' + yt + '?autoplay=1&rel=0'; return; }
    if (sp) { f.removeAttribute('sandbox'); t.loading = true; t.eff = 'adapter'; t.title = t.title || 'Spotify'; f.src = sp; return; }
    if (ebIsSpotify(t.url)) {
      t.eff = 'adapter'; t.title = 'Spotify'; t.loading = false; f.removeAttribute('sandbox');
      const c = ebPageStyle();
      f.srcdoc = `<!doctype html><meta charset="utf-8"><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:${c.bg};color:${c.fg};font-family:system-ui,sans-serif;text-align:center"><div><div style="font-size:48px">🟢</div><h2>Spotify</h2><p style="color:${c.mut}">${ebEsc(trI('Spotify funciona en la app Música (pestaña Spotify).'))}</p></div></body>`;
      if (window.EISEN && window.EISEN.musicTab) { openWindow('music'); window.EISEN.musicTab('spotify'); }
      return;
    }
    if (/(^|\.)twitch\.tv$/.test(ebHost(t.url))) { t.eff = 'adapter'; ebTwitch(t); return; }
    if (ebIsYtSearch(t.url) && ebMode(t) !== 'direct') { t.eff = 'adapter'; ebYoutube(t); return; }
    const mode = ebMode(t);
    if (mode === 'auto') {
      const tok = t.tok; t.loading = true; ebRender();
      ebProbe(t.url).then(ok => { if (t.tok === tok) ebLoadWith(t, ok ? 'direct' : 'server'); });
      return;
    }
    ebLoadWith(t, mode);
  }
  function ebLoadWith(t, mode) {
    const f = t.frame; t.eff = mode;
    if (mode === 'compat') { ebCompat(t); ebRender(); return; }
    if (mode === 'server' && ebSameOriginProxy()) f.setAttribute('sandbox', EB_SANDBOX); else f.removeAttribute('sandbox');
    t.loading = true;
    f.src = mode === 'server' ? ebPrefix() + encodeURIComponent(t.url) : t.url;
    ebRender();
  }

  setInterval(() => {
    if (!eb.ready) return;
    const loaded = []; Object.entries(eb.sessions).forEach(([id, s]) => s.tabs.forEach(t => { if (t.frame && t.loaded) loaded.push([id, s, t]); }));
    if (loaded.length <= 3) return;
    const now = Date.now();
    loaded.forEach(([id, s, t]) => {
      if ((id === eb.cur && s.active === t.id) || t.eff === 'adapter' || t.eff === 'local' || /^about:/.test(t.url) || now - (t.seen || 0) < 300000) return;
      clearTimeout(t.wd); t.tok++; t.frame.removeAttribute('srcdoc'); t.frame.src = 'about:blank'; t.loaded = false; t.loading = false;
    });
  }, 60000);
  function ebNavigate(t, url, push = true) {
    t.url = url; t.title = ''; t.noteOff = false; t.mode = ''; t.force = false;
    if (push) { t.hist = t.hist.slice(0, t.hi + 1); t.hist.push(url); t.hi = t.hist.length - 1; }
    ebLoad(t); ebRender(); ebSave();
  }
  function ebGo(delta) {
    const t = ebCur(), i = t.hi + delta;
    if (i < 0 || i >= t.hist.length) return;
    t.hi = i; t.url = t.hist[i]; t.title = '';
    ebLoad(t); ebRender();
  }
  function ebAddTab(sess = eb.cur, url = 'about:newtab') {
    const t = ebMakeTab(url);
    eb.sessions[sess].tabs.push(t);
    return t;
  }
  function ebActivate(t) {
    const s = ebS();
    s.active = t.id; t.seen = Date.now();
    if (!t.loaded) ebLoad(t);
    ebRender(); ebSave();
  }
  function ebClose(id) {
    const s = ebS(), i = s.tabs.findIndex(t => t.id === id);
    if (i < 0) return;
    const [t] = s.tabs.splice(i, 1);
    if (t.frame) t.frame.remove();
    if (!s.tabs.length) { const n = ebAddTab(); s.active = n.id; ebLoad(n); }
    else if (s.active === id) { const n = s.tabs[Math.min(i, s.tabs.length - 1)]; s.active = n.id; if (!n.loaded) ebLoad(n); }
    ebRender(); ebSave();
  }

  function ebSave() {
    const out = {};
    Object.entries(eb.sessions).forEach(([id, s]) => {
      const keep = id === 'priv' ? [] : s.tabs.filter(t => /^https?:/i.test(t.url) || /^about:search/.test(t.url)); // 9.0: la navegación privada no guarda pestañas
      const a = s.tabs.find(t => t.id === s.active);
      out[id] = { urls: keep.map(t => t.url), active: Math.max(0, keep.indexOf(a)) };
    });
    storage.set('browser_tabs', out);
  }

  function ebRenderTabs() {
    const s = ebS();
    $('#eb-tabs').innerHTML = s.tabs.map(t => `<div class="eb-tab${t.id === s.active ? ' active' : ''}" data-tab="${t.id}" title="${ebEsc(ebTitle(t))}"><span class="eb-tab-ic">${t.loading ? '<i class="eb-spin"></i>' : t.url === 'about:newtab' ? '🏠' : t.url === 'about:html' ? '📄' : /^about:search/.test(t.url) ? '🔎' : t.url === 'about:history' ? '🕘' : t.url === 'about:bookmarks' ? '⭐' : /^about:reader/.test(t.url) ? '📖' : ebFav(ebHost(t.url))}</span><span class="eb-tab-title">${ebEsc(ebTitle(t))}</span><button class="eb-tab-x" data-close="${t.id}" aria-label="Cerrar pestaña">✕</button></div>`).join('') + '<button class="eb-newtab" id="eb-new" title="Nueva pestaña" aria-label="Nueva pestaña">＋</button>';
  }
  function ebRenderBar() {
    const t = ebCur(); if (!t) return;
    const omni = $('#nav-url-input');
    if (document.activeElement !== omni) omni.value = /^about:search/.test(t.url) ? ebQ(t.url) : /^about:reader/.test(t.url) ? ebQ(t.url, 'u') : /^about:/.test(t.url) ? (t.url === 'about:html' ? ebTitle(t) : '') : t.url;
    const star = $('#nav-btn-star'); if (star) { const on = ebMarks().some(m => m.u === t.url); star.textContent = on ? '★' : '☆'; star.classList.toggle('on', on); star.disabled = !/^https?:/i.test(t.url); }
    const rd = $('#nav-btn-read'); if (rd) rd.disabled = !/^https?:/i.test(t.url);
    $('#nav-btn-back').disabled = t.hi <= 0;
    $('#nav-btn-fwd').disabled = t.hi >= t.hist.length - 1;
    $('#nav-btn-reload').textContent = t.loading ? '✕' : '↻';
    $('#nav-btn-ext').disabled = !/^https?:/i.test(t.url);
    $('#eb-loadbar').classList.toggle('on', !!t.loading);
    const note = $('#eb-note');
    if (/^https?:/i.test(t.url) && t.eff !== 'adapter' && !t.noteOff) {
      const cur = t.eff || ebMode(t), btn = (m, label) => `<button data-n="${m}"${cur === m ? ' style="outline:2px solid var(--eb-accent)"' : ''}>${label}</button>`;
      note.hidden = false;
      note.innerHTML = (t.slow && t.loading ? '<span>⏳ La página tarda en responder.</span><button data-n="retry">Reintentar</button>' : '') + '<span>Si la página no se ve bien, cambia el modo de carga:</span>' + btn('direct', 'Directo') + (ebHaveProxy() || ebProxyMode() === 'on' ? btn('server', 'Proxy') : '') + btn('compat', 'Compatibilidad') + '<button data-n="reader">📖 Lectura</button><button data-n="ext">Abrir en pestaña real ↗</button><button data-n="x" aria-label="Cerrar aviso">✕</button>';
    } else note.hidden = true;
  }
  function ebShowFrames() {
    Object.entries(eb.sessions).forEach(([id, s]) => s.tabs.forEach(t => { if (t.frame) t.frame.classList.toggle('show', id === eb.cur && t.id === s.active); }));
  }
  function ebRender() {
    const b = EB_BROWSERS[eb.cur];
    $('#win-browser').style.setProperty('--eb-accent', b.color);
    $('#eb-title').textContent = `${b.icon} ${b.name} · ${b.engine}`;
    $('#eb-switch').value = eb.cur;
    ebRenderTabs(); ebRenderBar(); ebShowFrames();
  }

  function ebSwitch(id) {
    if (!EB_BROWSERS[id]) return;
    eb.cur = id; storage.set('browser_default', id);
    $('#cfg-browser').value = id;
    const t = ebCur(); t.seen = Date.now(); if (!t.loaded) ebLoad(t);
    ebRender();
    const d = $('#cfg-browser-desc'); if (d) d.textContent = EB_BROWSERS[id].desc;
  }

  function ebInit() {
    if (eb.ready) return;
    eb.ready = true;
    const def = storage.get('browser_default', 'web');
    eb.cur = EB_BROWSERS[def] ? def : 'web';
    const saved = storage.get('browser_tabs', {});
    Object.keys(EB_BROWSERS).forEach(id => {
      const s = { tabs: [], active: null };
      ((saved[id] && saved[id].urls) || []).forEach(u => { if (typeof u === 'string' && (/^https?:/i.test(u) || /^about:search/.test(u))) s.tabs.push(ebMakeTab(u)); });
      if (!s.tabs.length) s.tabs.push(ebMakeTab('about:newtab'));
      s.active = s.tabs[Math.min((saved[id] && saved[id].active) || 0, s.tabs.length - 1)].id;
      eb.sessions[id] = s;
    });
    const t = ebCur(); ebLoad(t);
    ebRender();
    fetch('/proxy?ping=1').then(r => r.ok ? r.json() : null).then(j => {
      if (j && j.ok) { eb.proxyDetected = true; if (j.alt) eb.alt = j.alt; ebRenderBar(); const t = ebCur(); if (t && /^https?:/i.test(t.url) && t.loaded) ebLoad(t); }
    }).catch(() => {});
  }

  // API pública del navegador
  function ebOpenUrl(raw, newTab = false) {
    const url = ebResolve(raw);
    if (!url) return;
    openWindow('browser');
    ebInit();
    let t = ebCur();
    if (newTab) {
      const same = ebS().tabs.find(x => x.url === url);
      if (same) { ebActivate(same); return; }
      if (t.url === 'about:newtab') { /* reutiliza la pestaña vacía */ } else { t = ebAddTab(); ebS().active = t.id; }
    }
    ebS().active = t.id;
    ebNavigate(t, url);
  }
  function ebOpenHtml(title, html, sbx) {
    openWindow('browser'); ebInit();
    const t = ebAddTab(eb.cur, 'about:html');
    t.htmlSrc = html; t.title = title; t.hist = ['about:html']; t.sbx = !!sbx;
    ebS().active = t.id;
    ebLoad(t); ebRender();
  }

  function navigateInApp(rawUrl) {
    const u0 = ebResolve(rawUrl);
    if (ebIsSpotify(u0) && !ebSpotifyEmbed(u0) && window.EISEN && window.EISEN.musicTab) { openWindow('music'); window.EISEN.musicTab('spotify'); closeFlyouts(); return; }
    ebOpenUrl(rawUrl, true);
    closeFlyouts();
  }

  // Eventos del navegador
  (function ebWire() {
    $('#eb-tabs').addEventListener('click', e => {
      const x = e.target.closest('[data-close]');
      if (x) { ebClose(x.dataset.close); return; }
      if (e.target.closest('#eb-new')) { const t = ebAddTab(); ebActivate(t); $('#nav-url-input').focus(); return; }
      const tab = e.target.closest('[data-tab]');
      if (tab) { const t = ebS().tabs.find(z => z.id === tab.dataset.tab); if (t) ebActivate(t); }
    });
    $('#eb-tabs').addEventListener('auxclick', e => { const tab = e.target.closest('[data-tab]'); if (tab && e.button === 1) { e.preventDefault(); ebClose(tab.dataset.tab); } });
    const go = () => { const v = $('#nav-url-input').value; const url = ebResolve(v); if (!url) return; ebNavigate(ebCur(), url); $('#nav-url-input').blur(); };
    $('#nav-btn-go').onclick = go;
    $('#nav-url-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    $('#nav-url-input').addEventListener('focus', e => e.target.select());
    $('#nav-url-input').addEventListener('blur', ebRenderBar);
    $('#nav-btn-back').onclick = () => ebGo(-1);
    $('#nav-btn-fwd').onclick = () => ebGo(1);
    $('#nav-btn-home').onclick = () => ebNavigate(ebCur(), 'about:newtab');
    $('#nav-btn-reload').onclick = () => {
      const t = ebCur();
      if (t.loading) { try { t.frame.contentWindow.stop(); } catch { /* ignorar */ } t.tok++; ebDone(t); ebRender(); } else ebLoad(t), ebRender();
    };
    $('#nav-btn-ext').onclick = () => { const t = ebCur(); if (/^https?:/i.test(t.url)) window.open(t.url, '_blank', 'noopener'); };
    $('#nav-btn-star').onclick = () => ebToggleMark();
    $('#nav-btn-read').onclick = () => { const t = ebCur(); if (/^https?:/i.test(t.url)) ebNavigate(t, 'about:reader?u=' + encodeURIComponent(t.url)); };
    const menu = $('#eb-menu');
    $('#nav-btn-menu').onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
    document.addEventListener('pointerdown', e => { if (!e.target.closest('#eb-menu') && !e.target.closest('#nav-btn-menu')) menu.hidden = true; });
    window.addEventListener('blur', () => { menu.hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') menu.hidden = true; });
    menu.addEventListener('click', e => {
      const b = e.target.closest('[data-m]'); if (!b) return; menu.hidden = true; const t = ebCur();
      ({ tab: () => { const n = ebAddTab(); ebActivate(n); $('#nav-url-input').focus(); }, hist: () => ebOpenUrl('about:history', true), marks: () => ebOpenUrl('about:bookmarks', true), dup: () => { if (/^(https?:|about:)/.test(t.url) && t.url !== 'about:html') { const n = ebAddTab(); ebS().active = n.id; ebNavigate(n, t.url); } },
        clear: () => { if (confirm('¿Borrar historial y datos de sitios guardados?')) { storage.set('browser_history', []); storage.set('eb_store', {}); toast('Historial borrado'); } },
        native: () => { storage.set('search_native', !ebNative()); toast(ebNative() ? 'Resultados de búsqueda EISEN activados' : 'Se usará la página del buscador'); ebRender(); } }[b.dataset.m] || (() => {}))();
    });
    $('#eb-switch').innerHTML = Object.entries(EB_BROWSERS).map(([id, b]) => `<option value="${id}">${b.icon} ${b.name}</option>`).join('');
    $('#eb-switch').onchange = e => ebSwitch(e.target.value);
    $('#eb-note').addEventListener('click', e => {
      const b = e.target.closest('[data-n]'); if (!b) return;
      const t = ebCur(), n = b.dataset.n;
      if (n === 'ext') { window.open(t.url, '_blank', 'noopener'); return; }
      if (n === 'retry') { ebLoad(t); ebRender(); return; }
      if (n === 'reader') { ebNavigate(t, 'about:reader?u=' + encodeURIComponent(t.url)); return; }
      if (n === 'x') { t.noteOff = true; ebRenderBar(); return; }
      t.mode = n; const rules = storage.get('site_mode', {}) || {}; rules[ebHost(t.url)] = n; storage.set('site_mode', rules);
      t.tok++; t.frame && t.frame.removeAttribute('srcdoc'); ebLoadWith(t, n);
    });
    // Mensajes desde páginas internas (inicio) y desde páginas cargadas con proxy
    window.addEventListener('message', e => {
      const m = e.data;
      if (!m || typeof m !== 'object' || !m.eisen || !eb.ready) return;
      let tab = null, sess = null;
      Object.entries(eb.sessions).forEach(([id, s]) => s.tabs.forEach(t => { if (t.frame && t.frame.contentWindow === e.source) { tab = t; sess = id; } }));
      if (!tab) return;
      let th = ''; try { th = new URL(tab.url).host; } catch { /* ignorar */ }
      // 9.0 (seguridad): una página solo puede leer los datos guardados de SU propio sitio
      if (m.stget) { if (String(m.stget) !== th || eb.cur === 'priv') return; const st = ebStore()[th] || {}; try { e.source.postMessage({ eisenst: 1, l: st.l || {}, c: st.c || {} }, '*'); } catch { /* ignorar */ } return; }
      if (m.st && typeof m.st === 'object') {
        if (String(m.st.h) !== th || eb.cur === 'priv') return; // la navegación privada no guarda datos de sitios
        const j = JSON.stringify({ l: m.st.l || {}, c: m.st.c || {} });
        if (j.length < 300000) { const all = ebStore(); all[th] = JSON.parse(j); const ks = Object.keys(all); if (ks.length > 60) delete all[ks[0]]; storage.set('eb_store', all); }
        return;
      }
      if (m.ext) { const u = /^about:reader/.test(tab.url) ? ebQ(tab.url, 'u') : tab.url; if (/^https?:/i.test(u)) window.open(u, '_blank', 'noopener'); return; }
      if (m.retry) { if (/^about:reader/.test(tab.url)) ebHtmlCache.delete(ebQ(tab.url, 'u')); else ebHtmlCache.delete(tab.url); ebLoad(tab); ebRender(); return; }
      if (m.cmd) {
        if (m.cmd === 'histclear' && confirm('¿Borrar todo el historial?')) storage.set('browser_history', []);
        if (m.cmd === 'histdel') storage.set('browser_history', ebHist().filter(x => x.u !== m.arg));
        if (m.cmd === 'markdel') storage.set('browser_bookmarks', ebMarks().filter(x => x.u !== m.arg));
        ebLoad(tab); ebRender(); return;
      }
      if (m.force) { tab.force = true; ebLoad(tab); ebRender(); return; }
      if (m.nav) {
        const url = ebResolve(ebUnwrap(String(m.nav))); if (!url) return;
        if (!/^(https?:|about:(search|reader|history|bookmarks|newtab))/i.test(url)) return; // 9.0: las páginas solo pueden navegar a http(s) o páginas internas
        if (m.popup && window.EISEN.ebPopupHook && window.EISEN.ebPopupHook(tab, url)) return; // 9.0: ventanas emergentes controladas
        if (m.tab) { const n = ebAddTab(sess); if (sess === eb.cur) { ebS().active = n.id; } ebNavigate(n, url); }
        else ebNavigate(tab, url);
      } else if (m.loaded) {
        ebDone(tab);
        if (m.title) { tab.title = String(m.title).slice(0, 120); if (/^https?:/i.test(tab.url)) ebRecord(tab); }
        if (typeof m.url === 'string' && /^https?:/i.test(m.url) && m.url !== tab.url) { tab.url = m.url; tab.hist[tab.hi] = m.url; ebSave(); }
        ebRenderTabs(); ebRenderBar();
      }
    });
    // Atajos con la ventana del navegador activa
    document.addEventListener('keydown', e => {
      if (!eb.ready || !activeWindow || activeWindow.id !== 'win-browser' || !activeWindow.classList.contains('open')) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'l') { e.preventDefault(); $('#nav-url-input').focus(); }
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); ebGo(-1); }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); ebGo(1); }
      if ((e.ctrlKey || e.metaKey) && k === 't') { e.preventDefault(); const t = ebAddTab(); ebActivate(t); $('#nav-url-input').focus(); }
      if ((e.ctrlKey || e.metaKey) && k === 'w') { e.preventDefault(); ebClose(ebS().active); }
      if ((e.ctrlKey || e.metaKey) && k === 'r' || e.key === 'F5') { e.preventDefault(); ebLoad(ebCur()); ebRender(); }
      if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); ebToggleMark(); }
      if ((e.ctrlKey || e.metaKey) && k === 'h') { e.preventDefault(); ebOpenUrl('about:history', true); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') { e.preventDefault(); const s = ebS(), i = s.tabs.findIndex(x => x.id === s.active); ebActivate(s.tabs[(i + (e.shiftKey ? -1 : 1) + s.tabs.length) % s.tabs.length]); }
    });
    // Configuración del navegador
    $('#cfg-browser').innerHTML = Object.entries(EB_BROWSERS).map(([id, b]) => `<option value="${id}">${b.icon} ${b.name} (${b.engine})</option>`).join('');
    const sel = storage.get('browser_default', 'web'); eb.cur = EB_BROWSERS[sel] ? sel : 'web';
    $('#cfg-browser').value = eb.cur;
    $('#cfg-browser-desc').textContent = EB_BROWSERS[eb.cur].desc;
    $('#cfg-browser').onchange = e => { storage.set('browser_default', e.target.value); if (eb.ready) ebSwitch(e.target.value); else { eb.cur = e.target.value; $('#cfg-browser-desc').textContent = EB_BROWSERS[eb.cur].desc; } };
    $('#cfg-proxy-mode').value = ebProxyMode();
    $('#cfg-proxy-mode').onchange = e => { storage.set('browser_proxy_mode', e.target.value); if (eb.ready) ebRenderBar(); };
    $('#cfg-proxy-url').value = ebCustomProxy();
    $('#cfg-proxy-url').onchange = e => { storage.set('browser_proxy_url', e.target.value.trim()); if (eb.ready) ebRenderBar(); };
  })();

  document.addEventListener('click', e => {
    const external = e.target.closest('[data-external-url]');
    if (external) { e.preventDefault(); navigateInApp(external.dataset.externalUrl); }
  });

  // Enlazado de lanzadores globales
  document.addEventListener('click', e => {
    const launcher = e.target.closest('[data-launch]');
    if (launcher) {
      const app = launcher.dataset.launch;
      const win = $('#win-' + app);
      if (win && win.classList.contains('open') && !win.classList.contains('minimized') && win.classList.contains('active')) {
        win.classList.add('minimized');
      } else {
        openWindow(app);
      }
      closeFlyouts();
    }
  });

  /* --------------------------------------------------------------------------
     C. MENÚ INICIO & ACTION CENTER
     -------------------------------------------------------------------------- */
  const startMenu = $('#start-menu-panel');
  const actionCenter = $('#action-center');

  function closeFlyouts() {
    startMenu.classList.remove('open');
    actionCenter.classList.remove('open');
    $('#context-menu').style.display = 'none';
  }

  $('#tb-start-trigger').onclick = e => {
    e.stopPropagation();
    actionCenter.classList.remove('open');
    startMenu.classList.toggle('open');
  };

  $('#systray-quick-btn').onclick = e => {
    e.stopPropagation();
    startMenu.classList.remove('open');
    actionCenter.classList.toggle('open');
  };

  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#start-menu-panel') && !e.target.closest('#tb-start-trigger') &&
        !e.target.closest('#action-center') && !e.target.closest('#systray-quick-btn') &&
        !e.target.closest('#context-menu')) {
      closeFlyouts();
    }
  });

  // Brillo
  $('#qc-brightness').oninput = e => {
    $('#screen-brightness-overlay').style.opacity = e.target.value;
  };

  // Menú contextual en el escritorio
  $('#desktop-viewport').addEventListener('contextmenu', e => {
    if (e.target.closest('.window')) return;
    e.preventDefault();
    closeFlyouts();
    const cm = $('#context-menu');
    cm.style.display = 'block';
    cm.style.left = Math.min(window.innerWidth - 200, e.clientX) + 'px';
    cm.style.top = Math.min(window.innerHeight - 200, e.clientY) + 'px';
  });

  $('#ctx-new-doc').onclick = () => { openWindow('word'); closeFlyouts(); };
  $('#ctx-new-sheet').onclick = () => { openWindow('excel'); closeFlyouts(); };
  $('#ctx-new-folder').onclick = () => { openWindow('explorer'); closeFlyouts(); };

  /* --------------------------------------------------------------------------
     D. CATÁLOGO PRO (> 200 APLICACIONES)
     -------------------------------------------------------------------------- */
  const catalogList = [
    // Productividad & Oficina
    { id: 'word', name: 'EISEN Writer', cat: 'Productividad', icon: '📝', desc: 'Editor enriquecido con exportación a PDF.' },
    { id: 'excel', name: 'EISEN Sheets', cat: 'Productividad', icon: '📊', desc: 'Hojas de cálculo con fórmulas y gráficos.' },
    { id: 'pdf', name: 'PDF Studio', cat: 'Productividad', icon: '📕', desc: 'Visor y maquetador de archivos PDF.' },
    { id: 'notion', name: 'Notion Workspace', cat: 'Productividad', icon: '📓', ext: 'https://www.notion.so' },
    { id: 'trello', name: 'Trello Kanban', cat: 'Productividad', icon: '📋', ext: 'https://trello.com' },
    { id: 'slack', name: 'Slack Web', cat: 'Productividad', icon: '💬', ext: 'https://slack.com' },
    { id: 'asana', name: 'Asana Projects', cat: 'Productividad', icon: '🎯', ext: 'https://app.asana.com' },
    { id: 'todoist', name: 'Todoist', cat: 'Productividad', icon: '✅', ext: 'https://todoist.com' },
    { id: 'evernote', name: 'Evernote Web', cat: 'Productividad', icon: '🐘', ext: 'https://www.evernote.com' },
    { id: 'obsidian', name: 'Obsidian Hub', cat: 'Productividad', icon: '💎', ext: 'https://obsidian.md' },
    { id: 'miro', name: 'Miro Pizarras', cat: 'Productividad', icon: '🟡', ext: 'https://miro.com' },
    { id: 'airtable', name: 'Airtable Base', cat: 'Productividad', icon: '🗃️', ext: 'https://airtable.com' },
    { id: 'coda', name: 'Coda Docs', cat: 'Productividad', icon: '📜', ext: 'https://coda.io' },

    // Desarrollo y Programación
    { id: 'terminal', name: 'Terminal Bash', cat: 'Desarrollo', icon: '$_', desc: 'Consola de comandos simulada.' },
    { id: 'vscode', name: 'VS Code for Web', cat: 'Desarrollo', icon: '💻', ext: 'https://vscode.dev' },
    { id: 'github', name: 'GitHub Code', cat: 'Desarrollo', icon: '🐙', ext: 'https://github.com' },
    { id: 'codepen', name: 'CodePen Editor', cat: 'Desarrollo', icon: '✏️', ext: 'https://codepen.io' },
    { id: 'replit', name: 'Replit IDE', cat: 'Desarrollo', icon: '⚡', ext: 'https://replit.com' },
    { id: 'stackblitz', name: 'StackBlitz', cat: 'Desarrollo', icon: '⚡', ext: 'https://stackblitz.com' },
    { id: 'hoppscotch', name: 'Hoppscotch API', cat: 'Desarrollo', icon: '🔌', ext: 'https://hoppscotch.io' },
    { id: 'jsoneditor', name: 'JSON Hero', cat: 'Desarrollo', icon: '{ }', ext: 'https://jsonhero.io' },
    { id: 'regex101', name: 'Regex Tester', cat: 'Desarrollo', icon: '🔍', ext: 'https://regex101.com' },
    { id: 'devdocs', name: 'DevDocs Manuales', cat: 'Desarrollo', icon: '📚', ext: 'https://devdocs.io' },
    { id: 'glitch', name: 'Glitch Web Dev', cat: 'Desarrollo', icon: '🎏', ext: 'https://glitch.com' },
    { id: 'jsfiddle', name: 'JSFiddle Sandbox', cat: 'Desarrollo', icon: '🎻', ext: 'https://jsfiddle.net' },

    // Creatividad & Diseño
    { id: 'figma', name: 'Figma Cloud', cat: 'Creatividad', icon: '🎨', ext: 'https://www.figma.com' },
    { id: 'canva', name: 'Canva Design', cat: 'Creatividad', icon: '✿', ext: 'https://www.canva.com' },
    { id: 'photopea', name: 'Photopea Photoshop', cat: 'Creatividad', icon: '🖌️', ext: 'https://www.photopea.com' },
    { id: 'excalidraw', name: 'Excalidraw', cat: 'Creatividad', icon: '✏️', ext: 'https://excalidraw.com' },
    { id: 'coolors', name: 'Coolors Paletas', cat: 'Creatividad', icon: '🌈', ext: 'https://coolors.co' },
    { id: 'piskel', name: 'Piskel Pixel Art', cat: 'Creatividad', icon: '👾', ext: 'https://www.piskelapp.com' },
    { id: 'threejs', name: 'Three.js 3D Editor', cat: 'Creatividad', icon: '🧊', ext: 'https://threejs.org/editor' },
    { id: 'svgedit', name: 'SVG-Edit Web', cat: 'Creatividad', icon: '✒️', ext: 'https://svg-edit.github.io/svgedit/' },

    // Multimedia & Audio
    { id: 'music', name: 'Reproductor EISEN', cat: 'Multimedia', icon: '🎵', desc: 'Audio persistente con sintetizador.' },
    { id: 'spotify', name: 'Spotify Player', cat: 'Multimedia', icon: '🟢', ext: 'https://open.spotify.com' },
    { id: 'youtube', name: 'YouTube Video', cat: 'Multimedia', icon: '▶️', ext: 'https://www.youtube.com' },
    { id: 'twitch', name: 'Twitch Streams', cat: 'Multimedia', icon: '🟣', ext: 'https://www.twitch.tv' },
    { id: 'soundcloud', name: 'SoundCloud Music', cat: 'Multimedia', icon: '☁️', ext: 'https://soundcloud.com' },
    { id: 'bandlab', name: 'BandLab DAW', cat: 'Multimedia', icon: '🎹', ext: 'https://www.bandlab.com' },
    { id: 'audiomass', name: 'AudioMass Waveform', cat: 'Multimedia', icon: '🎛️', ext: 'https://audiomass.co' },

    // Videojuegos
    { id: 'arcade', name: 'Centro Arcade Pro', cat: 'Juegos', icon: '🎮', desc: 'Ajedrez, Space Shooter y Snake.' },
    { id: 'chesscom', name: 'Chess.com', cat: 'Juegos', icon: '♟️', ext: 'https://www.chess.com' },
    { id: 'lichess', name: 'Lichess Free', cat: 'Juegos', icon: '♘', ext: 'https://lichess.org' },
    { id: 'krunker', name: 'Krunker FPS', cat: 'Juegos', icon: '🎯', ext: 'https://krunker.io' },
    { id: 'geoguessr', name: 'GeoGuessr Map', cat: 'Juegos', icon: '🌍', ext: 'https://www.geoguessr.com' }
  ];

  const tinyDescriptions = {
    notion:'Crea páginas, notas y bases de datos.', trello:'Organiza proyectos con tableros y tarjetas.', slack:'Comunícate con equipos y canales.', asana:'Planifica proyectos y tareas compartidas.', todoist:'Crea listas de tareas y recordatorios.', evernote:'Guarda notas y recortes web.', obsidian:'Conecta notas mediante enlaces.', miro:'Colabora en pizarras digitales.', airtable:'Organiza información en bases de datos.', coda:'Combina documentos con tablas y flujos.',
    vscode:'Edita código desde el navegador.', github:'Aloja repositorios y colabora en código.', codepen:'Prueba HTML, CSS y JavaScript.', replit:'Programa y ejecuta proyectos online.', stackblitz:'Desarrolla aplicaciones web en el navegador.', hoppscotch:'Prueba solicitudes a APIs.', jsoneditor:'Visualiza y edita datos JSON.', regex101:'Crea y prueba expresiones regulares.', devdocs:'Consulta documentación técnica.', glitch:'Crea y comparte proyectos web.', jsfiddle:'Experimenta con código web.',
    figma:'Diseña interfaces y prototipos.', canva:'Diseña presentaciones, carteles e imágenes.', photopea:'Edita imágenes por capas.', excalidraw:'Dibuja diagramas a mano alzada.', coolors:'Genera paletas de colores.', piskel:'Crea sprites y animaciones pixel art.', threejs:'Explora y edita escenas 3D.', svgedit:'Crea y modifica gráficos SVG.',
    spotify:'Escucha música en streaming.', youtube:'Busca y reproduce videos.', twitch:'Mira transmisiones en directo.', soundcloud:'Descubre y comparte audio.', bandlab:'Graba y mezcla música online.', audiomass:'Edita audio y formas de onda.', chesscom:'Juega ajedrez y resuelve problemas.', lichess:'Juega ajedrez gratis online.', krunker:'Accede a un juego de disparos web.', geoguessr:'Adivina lugares usando imágenes de mapas.'
  };
  const categoryDescriptions = {Productividad:'Organiza tareas, notas y documentos.',Desarrollo:'Crea, prueba o consulta código.',Creatividad:'Diseña gráficos, dibujos y prototipos.',Multimedia:'Reproduce o edita contenido multimedia.',Juegos:'Abre un juego o servicio de entretenimiento.',Ciencia:'Explora conceptos científicos.',Sistema:'Utilidad auxiliar para el entorno web.'};
  catalogList.forEach(app => { if (!app.desc) app.desc = tinyDescriptions[app.id] || categoryDescriptions[app.cat] || 'Acceso rápido a una herramienta web.'; });

  // v8: se eliminaron los 'atajos de búsqueda' de relleno; el catálogo real vive en la Tienda (store.js)

  function renderAppCatalog(filterText = '', filterCat = 'all') {
    const container = $('#appstore-cards-container');
    const filtered = catalogList.filter(app => {
      const matchText = (app.name + ' ' + (app.desc || '')).toLowerCase().includes(filterText.toLowerCase());
      const matchCat = filterCat === 'all' || app.cat === filterCat;
      return matchText && matchCat;
    });

    container.innerHTML = filtered.map(app => `
      <div class="catalog-card-pro">
        <div class="cat-icon-badge">${app.icon}</div>
        <div style="flex:1;min-width:0;">
          <h4 style="font-size:13px;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${app.name}</h4>
          <span style="font-size:10px;color:var(--accent);font-weight:600;">${app.cat}</span>
          <p class="app-mini-desc" title="${app.desc}">${app.desc}</p>
          <button class="btn-primary" style="padding:4px 10px;font-size:11px;" ${app.ext ? `data-external-url="${app.ext}"` : `data-launch="${app.id}"`}>
            ${app.ext ? (app.id.startsWith('auto-app-') ? 'Buscar en web ↗' : 'Abrir Web ↗') : 'Ejecutar'}
          </button>
        </div>
      </div>
    `).join('');
  }

  $('#appstore-search').oninput = e => renderAppCatalog(e.target.value);
  $$('#appstore-categories button').forEach(b => {
    b.onclick = () => {
      $$('#appstore-categories button').forEach(x => { x.className = 'btn-secondary'; });
      b.className = 'btn-primary';
      renderAppCatalog($('#appstore-search').value, b.dataset.cat);
    };
  });

  // Rellenar menú Inicio
  function renderStartMenu() {
    const pinnedContainer = $('#start-pinned-grid');
    pinnedContainer.innerHTML = catalogList.slice(0, 18).map(app => `
      <button class="start-app-item" title="${app.desc}" ${app.ext ? `data-external-url="${app.ext}"` : `data-launch="${app.id}"`}>
        <span class="start-ico">${app.icon}</span>
        <span class="start-name">${app.name}</span><span class="start-mini-desc">${app.desc}</span>
      </button>
    `).join('');

    $('#start-recents-list').innerHTML = '';
  }

  /* --------------------------------------------------------------------------
     E. SUITE OFIMÁTICA (WORD, EXCEL, PDF)
     -------------------------------------------------------------------------- */
  // Word
  $$('[data-fmt]').forEach(btn => {
    btn.onclick = () => {
      document.execCommand(btn.dataset.fmt, false, null);
      $('#word-doc-body').focus();
    };
  });
  $('#word-btn-table').onclick = () => {
    const rows = prompt('Número de filas:', '3');
    const cols = prompt('Número de columnas:', '3');
    if (!rows || !cols) return;
    let html = '<table border="1" style="width:100%;border-collapse:collapse;margin:10px 0;">';
    for (let i = 0; i < rows; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) html += '<td style="padding:8px;border:1px solid #ccc;">&nbsp;</td>';
      html += '</tr>';
    }
    html += '</table><p></p>';
    document.execCommand('insertHTML', false, html);
  };
  $('#word-btn-save').onclick = () => {
    storage.set('word_doc', $('#word-doc-body').innerHTML);
    vaultSave('Documento_EISEN.html', new Blob(['<!doctype html><meta charset="utf-8"><title>Documento EISEN</title><body style="font-family:Arial,sans-serif;padding:40px">' + $('#word-doc-body').innerHTML], { type: 'text/html' }), 'documents').then(() => toast('Guardado en Archivos: ', 'Documento_EISEN.html'));
    alert('Documento guardado localmente en EISENKU OS.');
  };
  $('#word-btn-pdf').onclick = () => {
    if (saveMode() !== 'device') vaultSave('Documento_EISEN.html', new Blob(['<!doctype html><meta charset="utf-8"><title>Documento EISEN</title><body style="font-family:Arial,sans-serif;padding:40px">' + $('#word-doc-body').innerHTML], { type: 'text/html' }), 'downloads').then(() => toast('Guardado en Archivos › Descargas: ', 'Documento_EISEN.html'));
    const printFrame = document.createElement('iframe');
    printFrame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    printFrame.setAttribute('title', 'Vista de impresión del documento');
    document.body.appendChild(printFrame);
    const doc = printFrame.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Documento EISEN</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#111}table{border-collapse:collapse}td,th{border:1px solid #999;padding:6px}</style></head><body>${$('#word-doc-body').innerHTML}</body></html>`);
    doc.close();
    printFrame.onload = () => { printFrame.contentWindow.focus(); printFrame.contentWindow.print(); setTimeout(() => printFrame.remove(), 1000); };
  };

  // Excel
  const excelState = { rows: 18, cols: 8, data: storage.get('excel_data', {}) };
  function renderExcelTable() {
    const thRow = $('#excel-th-row');
    const tableBody = $('#excel-main-table tbody');
    let head = '<th></th>';
    for (let c = 0; c < excelState.cols; c++) head += `<th>${String.fromCharCode(65 + c)}</th>`;
    thRow.innerHTML = head;
    const rowsHtml = []; // 9.0: la tabla se construye de una vez (antes, una reconstrucción por fila)
    for (let r = 1; r <= excelState.rows; r++) {
      let tr = `<tr><th>${r}</th>`;
      for (let c = 0; c < excelState.cols; c++) {
        const cellId = String.fromCharCode(65 + c) + r;
        const val = excelState.data[cellId] || '';
        tr += `<td><input class="excel-cell-input" data-cell="${cellId}" value="${ebEsc(val)}" aria-label="${cellId}"></td>`; // 9.0: valor escapado (XSS)
      }
      rowsHtml.push(tr + '</tr>');
    }
    tableBody.innerHTML = rowsHtml.join('');
    bindExcelEvents();
    refreshExcelComputedValues();
  }

  function evaluateFormula(expr, stack = new Set()) {
    const K9 = window.EISENKU; if (K9 && K9.sheet && stack.size === 0) return K9.sheet.evaluate(expr, excelState.data); // 9.0: motor de fórmulas completo (js/os9/office9.js)
    if (expr == null || expr === '') return '';
    const raw = String(expr).trim(); if (!raw.startsWith('=')) return raw;
    try {
      let clean = raw.slice(1).toUpperCase();
      const cellValue = cell => {
        if (stack.has(cell)) throw new Error('Referencia circular');
        const v = excelState.data[cell] ?? '';
        if (String(v).startsWith('=')) { const next=new Set(stack); next.add(cell); return Number(evaluateFormula(v,next)) || 0; }
        return Number(v) || 0;
      };
      clean=clean.replace(/(SUM|AVERAGE|AVG|MIN|MAX|COUNT)\(([A-Z]+\d+):([A-Z]+\d+)\)/g,(_,fn,first,last)=>{
        const a=first.match(/^([A-Z]+)(\d+)$/),b=last.match(/^([A-Z]+)(\d+)$/); if(!a||!b||a[1]!==b[1]) throw new Error('Rango no compatible');
        const lo=Math.min(+a[2],+b[2]),hi=Math.max(+a[2],+b[2]),vals=[];for(let r=lo;r<=hi;r++)vals.push(cellValue(a[1]+r));
        if(fn==='SUM')return String(vals.reduce((x,y)=>x+y,0)); if(fn==='AVERAGE'||fn==='AVG')return String(vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:0);
        if(fn==='MIN')return String(Math.min(...vals));if(fn==='MAX')return String(Math.max(...vals));return String(vals.filter(v=>v!==0).length);
      });
      clean=clean.replace(/\b([A-Z]+\d+)\b/g,(_,cell)=>String(cellValue(cell)));
      const tokens=clean.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/-]/g)||[];
      if(tokens.join('')!==clean.replace(/\s+/g,''))throw new Error('Fórmula inválida');
      let i=0;
      function primary(){const t=tokens[i++];if(t==='+')return primary();if(t==='-')return-primary();if(t==='('){const v=expression();if(tokens[i++]!==')')throw new Error('Falta )');return v;}if(t==null||!Number.isFinite(Number(t)))throw new Error('Número inválido');return Number(t);}
      function term(){let v=primary();while(tokens[i]==='*'||tokens[i]==='/'){const op=tokens[i++],n=primary();v=op==='*'?v*n:v/n;}return v;}
      function expression(){let v=term();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],n=term();v=op==='+'?v+n:v-n;}return v;}
      const result=expression();if(i!==tokens.length||!Number.isFinite(result))return '#ERROR!';return Number(result.toFixed(8));
    } catch { return '#ERROR!'; }
  }
  let excelFocusedCell='A1';
  function bindExcelEvents(){
    $$('.excel-cell-input').forEach(inp=>{
      inp.onfocus=()=>{excelFocusedCell=inp.dataset.cell;$('#excel-active-cell').textContent=excelFocusedCell;$('#excel-formula-input').value=excelState.data[excelFocusedCell]??'';};
      inp.onchange=()=>{excelState.data[inp.dataset.cell]=inp.value;storage.set('excel_data',excelState.data);refreshExcelComputedValues();};
      inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();inp.blur();}};
    });
  }
  function refreshExcelComputedValues(){
    $$('.excel-cell-input').forEach(inp=>{const raw=excelState.data[inp.dataset.cell]??'';if(document.activeElement!==inp)inp.value=String(raw).startsWith('=')?evaluateFormula(raw):raw;inp.title=String(raw).startsWith('=')?raw:'';});
  }
  function commitExcelFormula(){if(!excelFocusedCell)return;excelState.data[excelFocusedCell]=$('#excel-formula-input').value;storage.set('excel_data',excelState.data);renderExcelTable();const target=$(`[data-cell="${excelFocusedCell}"]`);if(target)target.focus();refreshExcelComputedValues();}
  $('#excel-formula-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commitExcelFormula();}});
  $('#excel-formula-input').addEventListener('change',commitExcelFormula);

  $('#sheet-btn-addrow').onclick = () => { excelState.rows += 5; renderExcelTable(); };
  $('#sheet-btn-csv').onclick = () => {
    let csv = '';
    for (let r = 1; r <= excelState.rows; r++) {
      let row = [];
      for (let c = 0; c < excelState.cols; c++) {
        let v = String(excelState.data[String.fromCharCode(65 + c) + r] ?? ''); if (/^[=+\-@\t\r]/.test(v) && !/^-?\d/.test(v)) v = "'" + v; // 9.0: sin inyección de fórmulas en CSV
        row.push('"' + v.replace(/"/g, '""') + '"');
      }
      csv += row.join(',') + '\r\n';
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Hoja_EISEN.csv'; a.click();
  };

  $('#sheet-btn-sum').onclick=()=>{
    const nums=Object.values(excelState.data).map(v=>String(v).startsWith('=')?Number(evaluateFormula(v)):Number(v)).filter(Number.isFinite);
    const cell=excelFocusedCell||'A1';excelState.data[cell]=String(nums.reduce((a,b)=>a+b,0));storage.set('excel_data',excelState.data);renderExcelTable();const t=$(`[data-cell="${cell}"]`);if(t)t.focus();
  };
  $('#sheet-btn-sort').onclick=()=>{const vals=[];for(let r=1;r<=excelState.rows;r++)vals.push(excelState.data['A'+r]??'');vals.sort((a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:'base'}));vals.forEach((v,i)=>excelState.data['A'+(i+1)]=v);storage.set('excel_data',excelState.data);renderExcelTable();};
  $('#sheet-btn-chart').onclick=()=>{
    const vals=[];
    for(let r=1;r<=excelState.rows;r++){
      const raw=excelState.data['A'+r]??'';
      const n=Number(String(raw).startsWith('=')?evaluateFormula(raw):raw);
      if(raw!==''&&Number.isFinite(n)) vals.push({label:'A'+r,value:n});
    }
    if(!vals.length){alert('Escribe números en la columna A para crear un gráfico.');return;}
    const max=Math.max(...vals.map(x=>Math.abs(x.value)),1);
    const bars=vals.map(x=>`<div style="display:flex;align-items:center;gap:10px;margin:10px 0"><b style="width:36px">${x.label}</b><div style="height:22px;width:${Math.max(2,Math.min(100,Math.abs(x.value)/max*100))}%;background:#0078d4;border-radius:4px"></div><span>${x.value}</span></div>`).join('');
    const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font:14px system-ui;padding:24px;background:#fff;color:#111"><h2>Gráfico · Columna A</h2>${bars}</body>`;
    ebOpenHtml('Gráfico de EISEN Sheets',html);
  }

  // PDF
  $('#pdf-print-current').onclick=()=>{const f=$('#pdf-viewer-frame');if($('#pdf-empty-placeholder').style.display!=='none'){alert('Primero carga un PDF.');return;}try{f.contentWindow.focus();f.contentWindow.print();}catch{alert('El navegador no permite imprimir este PDF desde el visor integrado. Usa los controles del visor para guardarlo o imprimirlo.');}};
  $('#pdf-file-picker').onchange = e => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(new Blob([file], { type: 'application/pdf' })); // 9.0: tipo forzado, nunca HTML
      $('#pdf-viewer-frame').src = url;
      $('#pdf-empty-placeholder').style.display = 'none';
    }
  };

  /* --------------------------------------------------------------------------
     F. VIDEOJUEGOS: SPACE SHOOTER 2D & AJEDREZ JUGABLE
     -------------------------------------------------------------------------- */
  // Pestañas de juegos
  $('#arcade-tab-shooter').onclick = () => {
    $('#arcade-mod-shooter').style.display = 'flex';
    $('#arcade-mod-chess').style.display = 'none';
    $('#arcade-mod-snake').style.display = 'none';
    initShooterGame();
  };
  $('#arcade-tab-chess').onclick = () => {
    $('#arcade-mod-shooter').style.display = 'none';
    $('#arcade-mod-chess').style.display = 'flex';
    $('#arcade-mod-snake').style.display = 'none';
    initChessGame();
  };
  $('#arcade-tab-snake').onclick = () => {
    $('#arcade-mod-shooter').style.display = 'none';
    $('#arcade-mod-chess').style.display = 'none';
    $('#arcade-mod-snake').style.display = 'flex';
    initSnakeGame();
  };

  // 1. Shooter 2D
  let shooterLoop = null;
  function initShooterGame() {
    const canvas = $('#shooter-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let ship = { x: canvas.width / 2 - 15, y: canvas.height - 40, w: 30, h: 20, speed: 6 };
    let bullets = [], enemies = [], score = 0, lives = 3;
    let keys = {};

    window.onkeydown = e => keys[e.code] = true;
    window.onkeyup = e => keys[e.code] = false;

    // Disparo y movimiento táctil
    canvas.onpointerdown = e => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      if (clickX < canvas.width / 3) ship.x -= 20;
      else if (clickX > (canvas.width * 2) / 3) ship.x += 20;
      bullets.push({ x: ship.x + ship.w / 2 - 2, y: ship.y, w: 4, h: 10, speed: 8 });
    };

    $('#shooter-btn-start').onclick = () => {
      score = 0; lives = 3; bullets = []; enemies = [];
      $('#shooter-score').textContent = '0';
      $('#shooter-lives').textContent = '3';
      clearInterval(shooterLoop);
      shooterLoop = setInterval(update, 1000 / 60);
    };

    function update() {
      if (keys['ArrowLeft'] || keys['KeyA']) ship.x = Math.max(0, ship.x - ship.speed);
      if (keys['ArrowRight'] || keys['KeyD']) ship.x = Math.min(canvas.width - ship.w, ship.x + ship.speed);
      if (keys['Space']) {
        if (!ship.cooldown) {
          bullets.push({ x: ship.x + ship.w / 2 - 2, y: ship.y, w: 4, h: 10, speed: 9 });
          ship.cooldown = 12;
        }
      }
      if (ship.cooldown) ship.cooldown--;

      // Generar enemigos
      if (Math.random() < 0.03) {
        enemies.push({ x: Math.random() * (canvas.width - 25), y: -20, w: 25, h: 20, speed: 2 + Math.random() * 2 });
      }

      // Dibujar
      ctx.fillStyle = '#080b11'; ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Jugador
      ctx.fillStyle = '#0078d4'; ctx.fillRect(ship.x, ship.y, ship.w, ship.h);

      // Balas
      ctx.fillStyle = '#ff5ebc';
      bullets.forEach((b, i) => {
        b.y -= b.speed;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.y < -10) bullets.splice(i, 1);
      });

      // Enemigos
      ctx.fillStyle = '#e81123';
      enemies.forEach((en, i) => {
        en.y += en.speed;
        ctx.fillRect(en.x, en.y, en.w, en.h);

        // Colisión con balas
        bullets.forEach((b, bi) => {
          if (b.x < en.x + en.w && b.x + b.w > en.x && b.y < en.y + en.h && b.y + b.h > en.y) {
            enemies.splice(i, 1);
            bullets.splice(bi, 1);
            score += 20;
            $('#shooter-score').textContent = score;
          }
        });

        // Colisión con nave
        if (en.y > canvas.height) {
          enemies.splice(i, 1);
          lives--;
          $('#shooter-lives').textContent = lives;
          if (lives <= 0) {
            clearInterval(shooterLoop);
            alert('¡Fin de la partida! Puntuación final: ' + score);
          }
        }
      });
    }
  }

  // 2. Ajedrez con reglas legales: jaque, enroque, captura al paso, promoción y mate.
  function initChessGame() {
    const boardEl = $('#chess-board-dom');
    if (boardEl.dataset.ready === '1') return;
    boardEl.dataset.ready = '1';
    const glyph = {K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
    const dirs = {n:[-33,-31,-18,-14,14,18,31,33],b:[-17,-15,15,17],r:[-16,-1,1,16],q:[-17,-16,-15,-1,1,15,16,17],k:[-17,-16,-15,-1,1,15,16,17]};
    const on = i => i >= 0 && i < 128 && !(i & 0x88);
    const side = p => !p || p==='.' ? 0 : p===p.toUpperCase() ? 1 : -1;
    const sqName = i => 'abcdefgh'[i&7] + (8-(i>>4));
    const fromName = x => (8-Number(x[1]))*16+'abcdefgh'.indexOf(x[0]);
    let state, selected=-1, legalMoves=[], history=[];
    function initial(){return {b:Array.from({length:128},(_,i)=>{if(!on(i))return ' ';const row=i>>4,col=i&7;const back='rnbqkbnr';return row===0?back[col]:row===1?'p':row===6?'P':row===7?back[col].toUpperCase():'.';}),t:1,c:15,ep:-1,half:0,full:1};}
    function attacked(s,target,by){
      for(let f=0;f<128;f++){
        if(!on(f)||side(s.b[f])!==by)continue;
        const p=s.b[f].toLowerCase();
        if(p==='p'){if(target===f-16*by-1||target===f-16*by+1)return true;continue;}
        for(const d of (dirs[p]||[]))for(let t=f+d;on(t);t+=d){if(t===target)return true;if(s.b[t]!=='.'||p==='n'||p==='k')break;}
      }
      return false;
    }
    function inCheck(s,color=s.t){const k=s.b.indexOf(color===1?'K':'k');return k<0||attacked(s,k,-color);}
    function apply(s,m){
      const [f,t,promo,flag]=m,b=s.b.slice(),piece=b[f],captured=flag==='ep'?b[t+16*s.t]:b[t];let c=s.c;
      b[f]='.';b[t]=promo?(s.t===1?promo.toUpperCase():promo):piece;
      if(flag==='ep')b[t+16*s.t]='.';
      if(flag==='castle'){const rf=t>f?f+3:f-4,rt=t>f?f+1:f-1;b[rt]=b[rf];b[rf]='.';}
      if(piece==='K')c&=~3;if(piece==='k')c&=~12;
      const rb={119:1,112:2,7:4,0:8};if(piece.toLowerCase()==='r')c&=~(rb[f]||0);if(captured.toLowerCase()==='r')c&=~(rb[t]||0);
      return {b,t:-s.t,c,ep:piece.toLowerCase()==='p'&&Math.abs(t-f)===32?(t+f)/2:-1,half:piece.toLowerCase()==='p'||captured!=='.'?0:s.half+1,full:s.full+(s.t===-1?1:0)};
    }
    function pseudo(s){
      const out=[];
      for(let f=0;f<128;f++){
        if(!on(f)||side(s.b[f])!==s.t)continue;const p=s.b[f].toLowerCase();
        const add=(t,flag='')=>{if(!on(t)||s.b[t].toLowerCase()==='k')return;if(p==='p'&&((t>>4)===0||(t>>4)===7)){for(const q of ['q','r','b','n'])out.push([f,t,q,flag]);}else out.push([f,t,'',flag]);};
        if(p==='p'){
          const t=f-16*s.t;if(on(t)&&s.b[t]==='.'){add(t);const u=t-16*s.t;if((f>>4)===(s.t===1?6:1)&&s.b[u]==='.')add(u);}
          for(const d of [-1,1]){const u=t+d;if(!on(u))continue;if(side(s.b[u])===-s.t)add(u);else if(u===s.ep&&s.b[u]==='.'&&s.b[u+16*s.t]===(s.t===1?'p':'P'))add(u,'ep');}
        }else{
          for(const d of (dirs[p]||[]))for(let t=f+d;on(t);t+=d){if(side(s.b[t])===s.t)break;add(t);if(s.b[t]!=='.'||p==='n'||p==='k')break;}
          const home=s.t===1?116:4,rook=s.t===1?'R':'r',bits=s.t===1?[1,2]:[4,8];
          if(p==='k'&&f===home&&!inCheck(s)){
            if((s.c&bits[0])&&s.b[f+3]===rook&&s.b[f+1]==='.'&&s.b[f+2]==='.'&&!attacked(s,f+1,-s.t)&&!attacked(s,f+2,-s.t))add(f+2,'castle');
            if((s.c&bits[1])&&s.b[f-4]===rook&&s.b[f-1]==='.'&&s.b[f-2]==='.'&&s.b[f-3]==='.'&&!attacked(s,f-1,-s.t)&&!attacked(s,f-2,-s.t))add(f-2,'castle');
          }
        }
      }
      return out;
    }
    function legal(s){return pseudo(s).filter(m=>!inCheck(apply(s,m),s.t));}
    function status(){const ms=legal(state),check=inCheck(state);if(!ms.length)return check?`Jaque mate. Ganan ${state.t===1?'Negras':'Blancas'}.`:'Tablas por ahogado.';return `Turno: ${state.t===1?'Blancas':'Negras'}${check?' · ¡Jaque!':''}`;}
    function render(){
      boardEl.innerHTML='';legalMoves=legal(state);const targets=selected<0?[]:legalMoves.filter(m=>m[0]===selected).map(m=>m[1]);
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        const i=r*16+c,el=document.createElement('div');el.className=`chess-square ${(r+c)%2===0?'light':'dark'}`;el.dataset.i=i;el.textContent=state.b[i]==='.'?'':glyph[state.b[i]];
        if(i===selected)el.classList.add('selected');if(targets.includes(i))el.classList.add('target');
        el.onclick=()=>clickSquare(i);boardEl.appendChild(el);
      }
      $('#chess-status').textContent=status();
    }
    function doMove(m){state=apply(state,m);history.push(state);selected=-1;render();if($('#chess-mode').value==='ai'&&state.t===-1&&legal(state).length){setTimeout(aiMove,250);}}
    function clickSquare(i){if(!legal(state).length)return;const piece=state.b[i];if(selected>=0){let choices=legalMoves.filter(m=>m[0]===selected&&m[1]===i);if(choices.length){if(choices.length>1){const answer=(prompt('Promoción: escribe dama, torre, alfil o caballo','dama')||'dama').toLowerCase();const map={dama:'q',reina:'q',q:'q',torre:'r',r:'r',alfil:'b',b:'b',caballo:'n',n:'n',knight:'n'};const promo=map[answer]||'q';doMove(choices.find(m=>m[2]===promo)||choices[0]);}else doMove(choices[0]);return;}}
      if(side(piece)===state.t&&!(($('#chess-mode').value==='ai')&&state.t===-1)){selected=i;render();}else{selected=-1;render();}}
    function aiMove(){if($('#chess-mode').value!=='ai'||state.t!==-1)return;const ms=legal(state);if(!ms.length){render();return;}const captures=ms.filter(m=>state.b[m[1]]!=='.'||m[3]==='ep');const pool=captures.length&&Math.random()<0.65?captures:ms;doMove(pool[Math.floor(Math.random()*pool.length)]);}
    $('#chess-restart').onclick=()=>{state=initial();selected=-1;history=[state];render();};
    $('#chess-mode').onchange=()=>{state=initial();selected=-1;history=[state];render();};
    state=initial();history=[state];render();
  }

  // 3. Snake Retro
  function initSnakeGame() {
    const canvas = $('#snake-canvas');
    const ctx = canvas.getContext('2d');
    let snake = [{x: 10, y: 10}], food = {x: 5, y: 5}, dx = 1, dy = 0, score = 0, snakeTimer = null;
    if(canvas.dataset.touchReady!=='1'){canvas.dataset.touchReady='1';canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;if(x<0.25){dx=-1;dy=0;}else if(x>0.75){dx=1;dy=0;}else if(y<0.5){dx=0;dy=-1;}else{dx=0;dy=1;}});}

    $('#snake-restart').onclick = () => {
      snake = [{x: 10, y: 10}]; dx = 1; dy = 0; score = 0;
      clearInterval(snakeTimer);
      snakeTimer = setInterval(step, 100);
    };

    if (canvas._snakeKeyHandler) window.removeEventListener('keydown', canvas._snakeKeyHandler);
    canvas._snakeKeyHandler = e => {
      if (!$('#win-arcade').classList.contains('open') || $('#arcade-mod-snake').style.display === 'none') return;
      if (e.key === 'ArrowUp' && dy === 0) { dx = 0; dy = -1; }
      if (e.key === 'ArrowDown' && dy === 0) { dx = 0; dy = 1; }
      if (e.key === 'ArrowLeft' && dx === 0) { dx = -1; dy = 0; }
      if (e.key === 'ArrowRight' && dx === 0) { dx = 1; dy = 0; }
    };
    window.addEventListener('keydown', canvas._snakeKeyHandler);

    function step() {
      const head = {x: snake[0].x + dx, y: snake[0].y + dy};
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        $('#snake-score').textContent = score;
        food = {x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20)};
      } else {
        snake.pop();
      }

      // Colisiones bordes
      if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20 || snake.slice(1).some(p => p.x === head.x && p.y === head.y)) {
        clearInterval(snakeTimer);
        alert('Juego terminado. Puntos: ' + score);
        return;
      }

      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0078d4';
      snake.forEach(part => ctx.fillRect(part.x * 20, part.y * 20, 18, 18));
      ctx.fillStyle = '#8df0b0'; ctx.fillRect(food.x * 20, food.y * 20, 18, 18);
    }
  }

  /* --------------------------------------------------------------------------
     G. REPRODUCTOR DE MÚSICA PERSISTENTE (WEB AUDIO SYNTH)
     -------------------------------------------------------------------------- */
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  let audioCtx=null,synthOsc=null,synthGain=null,isPlaying=false,audioPlaylist=[],playlistIndex=0,activeAudio=null;
  function getAudioContext(){if(!AudioContextClass)return null;if(!audioCtx)audioCtx=new AudioContextClass();return audioCtx;}
  function updateAudioUI(playing){isPlaying=playing;$('#p-play-main').textContent=playing?'⏸':'▶';$('#qc-play').textContent=playing?'⏸':'▶';}
  function stopSynth(){if(synthOsc){try{synthOsc.stop();}catch{}synthOsc=null;}synthGain=null;}
  function stopTrack(){if(activeAudio){activeAudio.pause();activeAudio.currentTime=0;activeAudio=null;}stopSynth();updateAudioUI(false);}
  function playSynthTrack(){const ctx=getAudioContext();if(!ctx){alert('Este navegador no admite audio web.');return;}ctx.resume();stopSynth();synthOsc=ctx.createOscillator();synthGain=ctx.createGain();synthOsc.type='sawtooth';synthOsc.frequency.setValueAtTime(220,ctx.currentTime);synthGain.gain.setValueAtTime(Number($('#player-vol-slider').value)*0.08,ctx.currentTime);synthOsc.connect(synthGain);synthGain.connect(ctx.destination);synthOsc.start();$('#player-track-name').textContent='EISEN Synthwave';$('#qc-track-title').textContent='EISEN Synthwave';updateAudioUI(true);}
  function playPlaylistIndex(index){if(!audioPlaylist.length){playSynthTrack();return;}stopTrack();playlistIndex=(index+audioPlaylist.length)%audioPlaylist.length;activeAudio=new Audio(audioPlaylist[playlistIndex].url);activeAudio.volume=Number($('#player-vol-slider').value);activeAudio.onended=()=>playPlaylistIndex(playlistIndex+1);activeAudio.onerror=()=>{updateAudioUI(false);alert('No se pudo reproducir este archivo de audio.');};$('#player-track-name').textContent=audioPlaylist[playlistIndex].name;$('#qc-track-title').textContent=audioPlaylist[playlistIndex].name;activeAudio.play().then(()=>updateAudioUI(true)).catch(()=>{updateAudioUI(false);alert('Toca Reproducir para permitir el audio en el navegador.');});}
  function togglePlayback(){if(activeAudio){if(activeAudio.paused)activeAudio.play().then(()=>updateAudioUI(true)).catch(()=>{});else{activeAudio.pause();updateAudioUI(false);}return;}if(isPlaying)stopTrack();else playSynthTrack();}
  $('#p-play-main').onclick=togglePlayback;$('#qc-play').onclick=togglePlayback;
  $('#p-next').onclick=$('#qc-next').onclick=()=>playPlaylistIndex(playlistIndex+1);$('#p-prev').onclick=$('#qc-prev').onclick=()=>playPlaylistIndex(playlistIndex-1);
  function syncVolume(value){const v=Math.max(0,Math.min(1,Number(value)));$('#player-vol-slider').value=v;$('#qc-volume').value=v;if(activeAudio)activeAudio.volume=v;if(synthGain&&audioCtx)synthGain.gain.setTargetAtTime(v*0.08,audioCtx.currentTime,0.02);storage.set('volume',v);}
  $('#player-vol-slider').oninput=e=>syncVolume(e.target.value);$('#qc-volume').oninput=e=>syncVolume(e.target.value);syncVolume(storage.get('volume',0.8));
  $('#audio-file-input').onchange=e=>{const files=[...e.target.files];if(!files.length)return;audioPlaylist.forEach(x=>URL.revokeObjectURL(x.url));audioPlaylist=files.map(file=>({name:file.name,url:URL.createObjectURL(file)}));playlistIndex=0;playPlaylistIndex(0);};

  /* --------------------------------------------------------------------------
     H. EXPLORADOR DE ARCHIVOS PRO
     -------------------------------------------------------------------------- */
  const virtualFS = storage.get('vfs', [
    { name: 'Manual_Usuario.txt', type: 'text', folder: 'documents', size: '2 KB' },
    { name: 'Foto_Fondo.png', type: 'img', folder: 'images', size: '180 KB' },
    { name: 'Pistas_Musica.mp3', type: 'audio', folder: 'music', size: '4.2 MB' }
  ]);
  let currentFolder = 'documents';

  /* --------------------------------------------------------------------------
     ARCHIVOS INTERNOS: guarda archivos dentro de EISEN (IndexedDB) para dispositivos sin descargas
     -------------------------------------------------------------------------- */
  const trI = s => (window.EISEN_I18N ? window.EISEN_I18N.tr(s) : s);
  function toast(msg, extra = '') {
    let t = $('#eisen-toast');
    if (!t) { t = document.createElement('div'); t.id = 'eisen-toast'; t.style.cssText = 'position:fixed;left:50%;bottom:70px;transform:translateX(-50%);background:var(--win-header);color:var(--text-main);border:1px solid var(--shell-border);padding:10px 16px;border-radius:12px;z-index:99999;font-size:13px;box-shadow:0 8px 30px #0008;max-width:90vw;display:none'; document.body.appendChild(t); }
    t.textContent = trI(msg) + extra; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(() => { t.style.display = 'none'; }, 3500);
  }
  const vault = (() => {
    let dbp = null; const mem = new Map();
    const open = () => dbp || (dbp = new Promise((res, rej) => { try { const r = indexedDB.open(window.EISEN_VAULT_DB || 'eisen_vault', 1); r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }));
    const run = (mode, fn, memFn) => open().then(db => new Promise((res, rej) => { const t = db.transaction('files', mode); const q = fn(t.objectStore('files')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); })).catch(() => memFn());
    return {
      put: f => run('readwrite', s => s.put(f), () => { mem.set(f.id, f); }),
      all: () => run('readonly', s => s.getAll(), () => [...mem.values()]),
      get: id => run('readonly', s => s.get(id), () => mem.get(id)),
      del: id => run('readwrite', s => s.delete(id), () => { mem.delete(id); })
    };
  })();
  const MIME = { txt: 'text/plain', csv: 'text/csv', json: 'application/json', html: 'text/html', htm: 'text/html', md: 'text/markdown', xml: 'text/xml', js: 'text/javascript', css: 'text/css', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', mp4: 'video/mp4', webm: 'video/webm' };
  const fileType = f => f.type || MIME[(f.name.split('.').pop() || '').toLowerCase()] || '';
  const saveMode = () => storage.get('save_mode', 'both');
  async function vaultSave(name, blob, folder = 'downloads') {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    await vault.put({ id, name, type: blob.type || '', size: blob.size, folder, date: Date.now(), blob });
    if ($('#win-explorer').classList.contains('open')) renderExplorer();
    return id;
  }
  function captureDownload(a) {
    const name = a.getAttribute('download') || 'archivo';
    fetch(a.href).then(r => r.blob()).then(b => vaultSave(name, b, 'downloads').then(id => { document.dispatchEvent(new CustomEvent('eisen:download', { detail: { id, name, size: b.size, type: b.type } })); return id; })).then(() => toast('Guardado en Archivos › Descargas: ', name)).catch(() => {}); // 9.0: registro en Descargas
  }
  const origAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download') && /^(blob:|data:)/.test(this.href) && !this.__eisen) {
      this.__eisen = true;
      if (saveMode() !== 'device') captureDownload(this);
      if (saveMode() === 'vault') return;
    }
    return origAnchorClick.call(this);
  };
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[download]');
    if (!a || a.__eisen || !/^(blob:|data:)/.test(a.href)) return;
    a.__eisen = true;
    if (saveMode() !== 'device') captureDownload(a);
    if (saveMode() === 'vault') e.preventDefault();
  }, true);
  const esc = s => ebEsc(s);
  async function vaultOpen(id) {
    const f = await vault.get(id); if (!f) return;
    if (window.EISEN.openFileHook) { try { if (await window.EISEN.openFileHook(f)) return; } catch (e) { console.error(e); } }
    const type = fileType(f), url = URL.createObjectURL(f.blob);
    if (/^image\/(?!svg)/.test(type) || type === 'image/svg+xml') ebOpenHtml(f.name, `<body style="margin:0;background:#111;display:grid;place-items:center;min-height:100vh"><img src="${url}" style="max-width:100%;max-height:100vh"></body>`);
    else if (/^(audio|video)\//.test(type)) ebOpenHtml(f.name, `<body style="margin:0;background:#111;display:grid;place-items:center;min-height:100vh"><${type.startsWith('audio') ? 'audio' : 'video'} src="${url}" controls autoplay style="max-width:100%;max-height:100vh"></${type.startsWith('audio') ? 'audio' : 'video'}></body>`);
    else if (type === 'application/pdf') { URL.revokeObjectURL(url); const pu = URL.createObjectURL(new Blob([f.blob], { type: 'application/pdf' })); (window.EISEN.trustedBlobs = window.EISEN.trustedBlobs || new Set()).add(pu); ebOpenUrl(pu, true); } // tipo forzado: nunca se interpreta como HTML
    else if (type === 'text/html') ebOpenHtml(f.name, await f.blob.text(), true);
    else if (/^text\/|json|xml|javascript/.test(type)) ebOpenHtml(f.name, `<meta charset="utf-8"><body style="margin:0;padding:18px;background:#fff;color:#111"><pre style="white-space:pre-wrap;word-break:break-word;font:14px/1.5 ui-monospace,Consolas,monospace">${esc(await f.blob.text())}</pre></body>`);
    else toast('No se pudo abrir este tipo de archivo aquí. Usa Descargar.');
  }
  async function vaultDownload(id) {
    const f = await vault.get(id); if (!f) return;
    const a = document.createElement('a'); a.__eisen = true; a.href = URL.createObjectURL(f.blob); a.download = f.name; document.body.appendChild(a); origAnchorClick.call(a); a.remove();
  }
  const fmtSize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

  let exTok = 0;
  async function renderExplorer() {
    const container = $('#explorer-items-list'), tok = ++exTok;
    const items = virtualFS.filter(f => f.folder === currentFolder);
    let html = items.map((f, i) => `
      <div class="file-row-item ui-between" data-vfs="${i}">
        <div class="ui-row">
          <span>${f.type === 'text' ? '📄' : f.type === 'img' ? '🖼️' : '📁'}</span>
          <span style="font-size:12px;font-weight:500;">${ebEsc(f.name)}</span>
        </div>
        <span style="font-size:11px;color:var(--text-muted);">${ebEsc(f.size)}</span>
      </div>
    `).join('');
    let files = [];
    try { files = (await vault.all()).filter(f => f.folder === currentFolder).sort((a, b) => b.date - a.date); } catch { /* sin archivos */ }
    if (tok !== exTok) return;
    html += files.map(f => {
      const ty = fileType(f), ic = /^image/.test(ty) ? '🖼️' : /^audio/.test(ty) ? '🎵' : /^video/.test(ty) ? '🎬' : ty === 'application/pdf' ? '📕' : '📄';
      return `<div class="file-row-item ui-between" data-vid="${f.id}"><div class="ui-row" style="min-width:0"><span>${ic}</span><span style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</span></div><span class="ui-row" style="flex-shrink:0;gap:4px"><span style="font-size:11px;color:var(--text-muted)">${fmtSize(f.size)}</span><button class="eb-btn" data-vact="open" title="Abrir">👁</button><button class="eb-btn" data-vact="dl" title="Descargar">⬇</button><button class="eb-btn" data-vact="ren" title="Renombrar">✏️</button><button class="eb-btn" data-vact="del" title="Eliminar">🗑</button></span></div>`;
    }).join('');
    container.innerHTML = html || '<div style="padding:20px;text-align:center;color:var(--text-muted);">Carpeta vacía</div>';
  }
  $('#explorer-items-list').addEventListener('dblclick', e => {
    const row = e.target.closest('[data-vid]'); if (row) { vaultOpen(row.dataset.vid); return; }
    const vr = e.target.closest('[data-vfs]'); if (!vr) return;
    const f = virtualFS.filter(x => x.folder === currentFolder)[+vr.dataset.vfs]; if (!f) return;
    if (f.type === 'text' && window.EISEN.openText) window.EISEN.openText({ name: f.name, text: f.text || '' , folder: currentFolder, legacy: f });
    else if (f.type === 'img') toast('Archivo de ejemplo sin contenido de imagen');
    else toast('Carpeta de ejemplo: crea carpetas reales en el escritorio o guarda archivos aquí');
  });
  $('#explorer-items-list').addEventListener('click', async e => {
    const b = e.target.closest('[data-vact]'), row = e.target.closest('[data-vid]'); if (!b || !row) return;
    const id = row.dataset.vid, act = b.dataset.vact;
    if (act === 'open') vaultOpen(id);
    if (act === 'dl') vaultDownload(id);
    if (act === 'ren') { const f = await vault.get(id); const n = f && prompt('Nuevo nombre:', f.name); if (n) { f.name = n; await vault.put(f); renderExplorer(); } }
    if (act === 'del') { if (confirm('¿Eliminar este archivo?')) { await vault.del(id); renderExplorer(); } }
  });
  $('#fs-btn-import').onclick = () => $('#fs-real-picker').click();
  $('#fs-real-picker').onchange = async e => {
    const files = [...e.target.files];
    for (const f of files) await vaultSave(f.name, f, currentFolder);
    e.target.value = '';
    if (files.length) { toast('Archivos importados a EISEN'); renderExplorer(); }
  };
  $('#cfg-save-mode').value = saveMode();
  $('#cfg-save-mode').onchange = e => storage.set('save_mode', e.target.value);

  /* ---- URL y arrastrar y soltar: archivos y fondo de pantalla ---- */
  function setWallpaperUrl(url, persist = true) {
    url = String(url || '').trim();
    if (!/^(https?:|data:image|blob:)/i.test(url)) { toast('La dirección de la imagen no es válida'); return false; }
    const dv = $('#desktop-viewport');
    dv.style.backgroundImage = `url("${url.replace(/"/g, '%22')}")`;
    dv.style.backgroundSize = 'cover'; dv.style.backgroundPosition = 'center';
    if (persist) { storage.set('wp', 'custom'); storage.set('customWallpaper', url); }
    return true;
  }
  function setWallpaperFile(file) {
    if (!/^image\//.test(file.type)) { toast('Ese archivo no es una imagen'); return; }
    if (file.size > 4 * 1024 * 1024) { setWallpaperUrl(URL.createObjectURL(file), false); toast('Imagen grande: se usará solo en esta sesión'); return; }
    const r = new FileReader(); r.onload = () => setWallpaperUrl(r.result); r.readAsDataURL(file);
  }
  const nameFromUrl = (u, blob) => { let n = 'archivo'; try { n = decodeURIComponent(new URL(u).pathname.split('/').filter(Boolean).pop() || 'archivo'); } catch { /* ignorar */ } if (!/\.\w{2,5}$/.test(n)) { const ext = Object.keys(MIME).find(k => MIME[k] === blob.type); if (ext) n += '.' + ext; } return n.slice(0, 80); };
  async function importFromUrl(url, folder) {
    url = String(url || '').trim();
    if (!/^https?:\/\//i.test(url)) { toast('La dirección no es válida'); return; }
    toast('Descargando a EISEN…');
    try { const blob = await ebFetchBlob(url); const name = nameFromUrl(url, blob); await vaultSave(name, blob, folder); toast('Guardado en Archivos: ', name); renderExplorer(); }
    catch { toast('No se pudo descargar ese enlace'); }
  }
  async function handleDrop(e, where) {
    const dt = e.dataTransfer; if (!dt) return;
    const files = [...(dt.files || [])];
    if (files.length) {
      if (where === 'wallpaper') { const img = files.find(f => /^image\//.test(f.type)); if (img) setWallpaperFile(img); files.filter(f => f !== img).forEach(f => vaultSave(f.name, f, 'documents')); if (!img) toast('Archivos importados a EISEN'); }
      else { for (const f of files) await vaultSave(f.name, f, currentFolder); toast('Archivos importados a EISEN'); renderExplorer(); }
      return;
    }
    const url = ((dt.getData('text/uri-list') || dt.getData('text/plain') || '').split(/\r?\n/).find(l => /^https?:\/\//i.test(l.trim())) || '').trim();
    if (!url) return;
    if (where === 'wallpaper') setWallpaperUrl(url); else importFromUrl(url, currentFolder);
  }
  const dropOk = e => e.dataTransfer && [...e.dataTransfer.types].some(t => t === 'Files' || t === 'text/uri-list' || t === 'text/plain');
  const dv = $('#desktop-viewport');
  dv.addEventListener('dragover', e => { if (dropOk(e) && !e.target.closest('[contenteditable],input,textarea')) e.preventDefault(); });
  dv.addEventListener('drop', e => { if (e.defaultPrevented || e.target.closest('[contenteditable],input,textarea') || !dropOk(e)) return; e.preventDefault(); handleDrop(e, 'wallpaper'); });
  const ex = $('#win-explorer');
  ex.addEventListener('dragover', e => { if (dropOk(e)) { e.preventDefault(); e.stopPropagation(); } });
  ex.addEventListener('drop', e => { if (!dropOk(e)) return; e.preventDefault(); e.stopPropagation(); handleDrop(e, 'explorer'); });
  $('#fs-btn-url').onclick = () => { const u = prompt('Pega la dirección (URL) del archivo:', 'https://'); if (u) importFromUrl(u, currentFolder); };
  $('#cfg-wp-url-btn').onclick = () => setWallpaperUrl($('#cfg-wp-url').value);
  $('#cfg-wp-url').addEventListener('keydown', e => { if (e.key === 'Enter') setWallpaperUrl(e.target.value); });
  if (storage.get('wp', '') === 'custom' && /^https?:/i.test(storage.get('customWallpaper', ''))) $('#cfg-wp-url').value = storage.get('customWallpaper', '');

  window.EISEN = { excel: { state: excelState, render: () => renderExcelTable(), refresh: () => refreshExcelComputedValues(), focused: () => excelFocusedCell }, eb: { state: eb, S: ebS, cur: ebCur, add: ebAddTab, activate: ebActivate, close: ebClose, nav: ebNavigate, load: ebLoad, render: ebRender, renderBar: ebRenderBar, save: ebSave, switchTo: ebSwitch, init: ebInit, browsers: EB_BROWSERS, cache: ebHtmlCache, host: ebHost, title: ebTitle, resolve: ebResolve }, ebClearCache: () => { ebHtmlCache.clear(); ebProbeCache.clear(); }, stopShooter: () => clearInterval(shooterLoop), ebFetchHtml, ebRender: () => eb.ready && ebRender(), wireWindow, focusWindow, updateTaskbarButtons, closeFlyouts, renderAppCatalog, renderStartMenu, snapWindow, vault, vaultOpen, vaultDownload, fileType, ebNewTab: (u) => ebOpenUrl(u || 'about:newtab', true), openWindow, storage, ebOpenHtml, ebOpenUrl, ytSearch, ebFetchBlob, vaultSave, vaultAll: () => vault.all(), ebPrefix, ebHaveProxy, ebProbe, ebSameOriginProxy, EB_SANDBOX, captureDownload, toast, esc: ebEsc, virtualFS, fsSave: () => storage.set('vfs', virtualFS), apps: () => catalogList, setWallpaperUrl, setWallpaperFile, importFromUrl, folder: () => currentFolder, renderExplorer };

  $$('.explorer-sidebar button').forEach(b => {
    b.onclick = () => {
      currentFolder = b.dataset.folder;
      $('#explorer-current-path').textContent = `/Este Equipo/${b.textContent.trim()}`;
      renderExplorer();
    };
  });

  $('#fs-btn-new-file').onclick = async () => {
    const n = prompt('Nombre del nuevo archivo:', 'nota.txt');
    if (!n) return;
    const id = await vaultSave(n, new Blob([''], { type: fileType({ name: n, type: '' }) || 'text/plain' }), currentFolder);
    renderExplorer();
    if (/\.(txt|md|csv|json|html?|js|css)$/i.test(n) && window.EISEN.openText) window.EISEN.openText({ id, name: n, text: '', folder: currentFolder });
  };

  /* --------------------------------------------------------------------------
     I. TERMINAL EDUCATIVA
     -------------------------------------------------------------------------- */
  const termHistory = $('#term-log');
  const termInput = $('#term-input-cmd');

  termInput.onkeydown = e => {
    if (e.key === 'Enter') {
      const cmd = termInput.value.trim();
      termHistory.innerHTML += `eisen@desktop:~$ ${ebEsc(cmd)}\n`;
      execTerm(cmd);
      termInput.value = '';
      termHistory.scrollTop = termHistory.scrollHeight;
    }
  };

  function execTerm(cmd) {
    const c = cmd.toLowerCase();
    if (c === 'help') {
      termHistory.innerHTML += `Comandos disponibles:\n  help      - Lista de comandos\n  dir / ls  - Listar archivos\n  clear     - Limpiar pantalla\n  neofetch  - Especificaciones del sistema\n  date      - Fecha y hora actual\n`;
    } else if (c === 'clear') {
      termHistory.innerHTML = '';
    } else if (c === 'ls' || c === 'dir') {
      termHistory.innerHTML += virtualFS.map(f => `  ${ebEsc(f.name)} (${ebEsc(f.size)})`).join('\n') + '\n';
    } else if (c === 'neofetch') {
      termHistory.innerHTML += `
  .---.      OS: EISEN OS PRIME 11.0 (eisen_osprime)
 /     \\     Kernel: HTML5 / ES6 Web Desktop
| () () |    Shell: EISEN Terminal Pro
 \\  _  /     Apps: catálogo real en EISEN Store
  \`---\`      Memoria: LocalStorage 5MB Virtual\n`;
    } else if (c === 'date') {
      termHistory.innerHTML += new Date().toString() + '\n';
    } else {
      termHistory.innerHTML += `Comando no reconocido: ${ebEsc(c)}. Escribe 'help'.\n`;
    }
  }

  /* --------------------------------------------------------------------------
     J. RELOJ, AJUSTES & WALLPAPER
     -------------------------------------------------------------------------- */
  function updateClock() {
    const now = new Date();
    $('#clock-time').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $('#clock-date').textContent = now.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Fondos de pantalla
  const wallpapers = {
    flow: 'radial-gradient(ellipse at 80% 20%, #1e4287 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, #0078d4 0%, transparent 45%), linear-gradient(135deg, #09101d, #0b1528)',
    'dark-flow': 'linear-gradient(135deg, #090b10 0%, #171b26 50%, #090b10 100%)',
    nature: 'linear-gradient(135deg, #0d324d 0%, #7f5a83 100%)',
    cyber: 'radial-gradient(circle, #ff007f 0%, #000000 80%)'
  };

  $('#cfg-wallpaper').onchange=e=>{$('#desktop-viewport').style.backgroundImage=wallpapers[e.target.value];storage.set('wp',e.target.value);storage.set('customWallpaper','');};
  const savedWallpaper=storage.get('wp','e9-noir');
  if(savedWallpaper==='custom'&&storage.get('customWallpaper',''))$('#desktop-viewport').style.backgroundImage=`url("${storage.get('customWallpaper','')}")`;
  else{$('#cfg-wallpaper').value=wallpapers[savedWallpaper]?savedWallpaper:'flow';$('#desktop-viewport').style.backgroundImage=wallpapers[$('#cfg-wallpaper').value];}

  function applyTheme(theme){document.documentElement.dataset.theme=theme;$('#cfg-theme').value=theme;storage.set('theme',theme);}
  $('#cfg-theme').onchange=e=>applyTheme(e.target.value);applyTheme(storage.get('theme','dark'));
  $('#cfg-accent').value=storage.get('accent','#0078d4');
  function applyAccent(color){document.documentElement.style.setProperty('--accent',color);document.documentElement.style.setProperty('--accent-light',color);const n=parseInt(color.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;document.documentElement.style.setProperty('--accent-glow',`rgba(${r},${g},${b},0.35)`);storage.set('accent',color);}
  applyAccent($('#cfg-accent').value);$('#cfg-accent').oninput=e=>applyAccent(e.target.value);
  $('#cfg-btn-custom-bg').onclick=()=>$('#cfg-file-bg').click();
  $('#cfg-file-bg').onchange=e=>{const file=e.target.files[0];if(!file)return;if(file.size>4*1024*1024){alert('Elige una imagen de hasta 4 MB para no llenar el almacenamiento local.');return;}const reader=new FileReader();reader.onload=()=>{const data=reader.result;$('#desktop-viewport').style.backgroundImage=`url("${data}")`;storage.set('customWallpaper',data);storage.set('wp','custom');};reader.readAsDataURL(file);};
  $('#cfg-btn-backup').onclick=()=>{const data={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('eisen_'))data[k]=localStorage.getItem(k);}const blob=new Blob([JSON.stringify({app:'EISENKU OS',version:'8.0',created:new Date().toISOString(),data},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='EISENKU_OS_respaldo.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
  $('#cfg-btn-restore').onclick=()=>$('#cfg-file-restore').click();
  $('#cfg-file-restore').onchange=e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const obj=JSON.parse(reader.result);if(!obj.data||typeof obj.data!=='object')throw new Error();Object.entries(obj.data).forEach(([k,v])=>{if(k.startsWith('eisen_'))localStorage.setItem(k,v);});alert('Respaldo restaurado. La página se recargará.');location.reload();}catch{alert('El archivo no parece ser un respaldo válido de EISENKU OS.');}};reader.readAsText(file);};
  $('#cfg-btn-reset').onclick=()=>{if(confirm('¿Restablecer EISENKU OS? Se borrarán los datos locales. Exporta un respaldo antes si quieres conservarlos.')){Object.keys(localStorage).filter(k=>k.startsWith('eisen_')).forEach(k=>localStorage.removeItem(k));location.reload();}};
  $('#sys-btn-restart').onclick=()=>{if(confirm('¿Reiniciar la interfaz de EISENKU OS?'))location.reload();};
  $('#qt-dark').onclick=()=>applyTheme(document.documentElement.dataset.theme==='light'?'dark':'light');
  ['qt-wifi','qt-bt'].forEach(id=>{const el=$('#'+id);el.onclick=()=>{el.classList.toggle('active');el.setAttribute('aria-pressed',el.classList.contains('active')?'true':'false');};});
  $('#start-search-input').oninput=e=>{const q=e.target.value.trim().toLowerCase();if(q){openWindow('appcenter');$('#appstore-search').value=q;renderAppCatalog(q);}};
  const storageInfo=$('#cfg-storage-info');if(storageInfo){let bytes=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('eisen_'))bytes+=(localStorage.getItem(k)||'').length*2;}storageInfo.textContent=`Uso local aproximado: ${(bytes/1024).toFixed(1)} KB. El navegador puede limitar este espacio.`;}

  /* --------------------------------------------------------------------------
     K. INICIALIZACIÓN GENERAL
     -------------------------------------------------------------------------- */
  setupWindowInteractions();
  renderAppCatalog();
  renderStartMenu();
  updateTaskbarButtons();

})();

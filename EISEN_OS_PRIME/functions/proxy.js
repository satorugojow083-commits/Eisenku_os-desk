// =====================================================================
// ARCHIVO GENERADO por tools/build-edge.mjs — NO editar a mano (edita lib/*.mjs y vuelve a generarlo).
// EISENKU OS 10.0 NEXT GENERATION · Cloudflare Pages Functions (solo se usan si eliminas _worker.js). Ruta: /proxy
// =====================================================================
// =====================================================================
// EISENKU OS 9.0 ENTERPRISE · Seguridad compartida del servidor
// Fuente única usada por server.mjs (Node), Cloudflare (_worker.js, functions/) y Netlify (netlify/functions/).
// Los archivos de Cloudflare/Netlify se GENERAN con `node tools/build-edge.mjs` (no editarlos a mano).
// =====================================================================

const EISENKU_SERVER_VERSION = '10.0.0';

// ---------- Política de seguridad de contenido de la app ----------
// Notas honestas (ver docs/SEGURIDAD.md):
//  - 'unsafe-inline' sigue siendo necesario: las páginas internas del navegador (srcdoc) heredan esta política
//    y usan scripts en línea; la defensa principal contra XSS es el escapado/saneado y el aislamiento (sandbox).
//  - https: en script-src permite que el "modo compatibilidad" (srcdoc con <base> del sitio real) cargue los scripts del sitio.
const APP_CSP = [
  "default-src 'self' https: data: blob:",
  "script-src 'self' 'unsafe-inline' https: blob:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' https: http: data: blob:",
  "media-src 'self' https: http: data: blob: mediastream:",
  "font-src 'self' https: data:",
  "connect-src 'self' https: http: wss: data: blob:",
  "frame-src 'self' https: http: data: blob: about:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "form-action 'self' https: http:",
  "frame-ancestors 'self'"
].join('; ');

const APP_HEADERS = {
  'content-security-policy': APP_CSP,
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
  'permissions-policy': 'browsing-topics=(), interest-cohort=()',
  'cross-origin-opener-policy': 'same-origin-allow-popups'
};

// Las páginas cargadas mediante el proxy se ejecutan en un ORIGEN OPACO (sandbox sin allow-same-origin):
// aunque se abran directamente en una pestaña, no pueden leer localStorage/IndexedDB de EISENKU.
const PROXY_SANDBOX = 'sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-presentation allow-pointer-lock allow-popups-to-escape-sandbox';

// ---------- Registro de eventos de seguridad (salida estructurada en el log del servidor) ----------
function secLog(event, data) {
  try { console.warn(JSON.stringify(Object.assign({ t: new Date().toISOString(), sec: event }, data || {}))); } catch { /* sin consola */ }
}

// ---------- IP y nombres de host privados (protección SSRF) ----------
function v4parts(ip) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return null;
  const p = ip.split('.').map(Number); return p.some(x => x > 255) ? null : p;
}
function ipv4Private(ip) {
  const p = v4parts(ip); if (!p) return false;
  const [a, b, c] = p;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113);
}
function v6words(ip) {
  ip = ip.replace(/^\[|\]$/g, '').toLowerCase().split('%')[0];
  if (!/^[0-9a-f:.]+$/.test(ip) || ip.indexOf(':') < 0) return null;
  let tail4 = null;
  const m = ip.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (m) { const p = v4parts(m[1]); if (!p) return null; tail4 = p; ip = ip.slice(0, -m[1].length) + ((p[0] << 8) | p[1]).toString(16) + ':' + ((p[2] << 8) | p[3]).toString(16); }
  const halves = ip.split('::'); if (halves.length > 2) return null;
  const a = halves[0] ? halves[0].split(':') : [], b = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - a.length - b.length : 0; if (fill < 0) return null;
  const w = a.concat(Array(fill).fill('0'), b).map(x => parseInt(x || '0', 16));
  return w.length === 8 && w.every(x => x >= 0 && x <= 0xffff) ? w : null;
}
function ipv6Private(ip) {
  const w = v6words(ip); if (!w) return false;
  const allZero = w.slice(0, 7).every(x => x === 0);
  if (allZero && (w[7] === 0 || w[7] === 1)) return true;                       // :: y ::1
  const emb = () => `${w[6] >> 8}.${w[6] & 255}.${w[7] >> 8}.${w[7] & 255}`;
  if (w.slice(0, 5).every(x => x === 0) && w[5] === 0xffff) return ipv4Private(emb()) || true; // ::ffff:a.b.c.d (siempre bloqueado)
  if (w[0] === 0x64 && w[1] === 0xff9b) return ipv4Private(emb());              // NAT64
  if ((w[0] & 0xfe00) === 0xfc00) return true;                                  // fc00::/7 ULA
  if ((w[0] & 0xffc0) === 0xfe80) return true;                                  // fe80::/10 enlace local
  if ((w[0] & 0xff00) === 0xff00) return true;                                  // multicast
  if (w[0] === 0x2001 && w[1] === 0x0db8) return true;                          // documentación
  if (w[0] === 0x100 && w.slice(1, 4).every(x => x === 0)) return true;          // descarte
  return false;
}
function isPrivateIp(ip) { return ipv4Private(ip) || ipv6Private(ip); }

function hostBlocked(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/\.$/, '');
  if (!h) return true;
  if (h.startsWith('[')) return ipv6Private(h);
  if (v4parts(h)) return ipv4Private(h);
  if (h.indexOf('.') < 0) return true;                                            // nombres de una sola etiqueta (router, nas…)
  return /(^|\.)(localhost|local|localdomain|internal|intranet|lan|home|corp|home\.arpa|in-addr\.arpa|ip6\.arpa)$/.test(h) ||
    h === 'metadata.google.internal' || h === 'metadata';
}
function portAllowed(u) {
  const p = u.port ? +u.port : (u.protocol === 'https:' ? 443 : 80);
  return [80, 443, 8080, 8443].includes(p);
}

// Valida un destino del proxy. resolveGuard (opcional) comprueba también las IP reales vía DNS (Node/Netlify).
async function checkTarget(urlLike, resolveGuard) {
  let u; try { u = new URL(urlLike); } catch { return { ok: false, why: 'URL inválida' }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, why: 'Protocolo no permitido' };
  if (u.username || u.password) return { ok: false, why: 'Credenciales en la URL no permitidas' };
  if (hostBlocked(u.hostname)) return { ok: false, why: 'Destino privado o interno bloqueado' };
  if (!portAllowed(u)) return { ok: false, why: 'Puerto no permitido' };
  if (resolveGuard) { try { if (!(await resolveGuard(u.hostname))) return { ok: false, why: 'El nombre resuelve a una red privada' }; } catch { return { ok: false, why: 'No se pudo resolver el nombre' }; } }
  return { ok: true, url: u };
}

// ---------- Limitador de peticiones (ventana deslizante en memoria, por instancia) ----------
class RateLimiter {
  constructor(limit, windowMs) { this.limit = limit; this.win = windowMs; this.m = new Map(); this.n = 0; }
  hit(key) {
    const now = Date.now(), arr = (this.m.get(key) || []).filter(t => now - t < this.win);
    if (arr.length >= this.limit) { this.m.set(key, arr); return { ok: false, retry: Math.ceil((this.win - (now - arr[0])) / 1000) }; }
    arr.push(now); this.m.set(key, arr);
    if (++this.n % 500 === 0) for (const [k, v] of this.m) if (!v.length || now - v[v.length - 1] > this.win) this.m.delete(k);
    return { ok: true };
  }
}

function clientIp(request, fallback) {
  const h = request.headers;
  return h.get('cf-connecting-ip') || h.get('x-nf-client-connection-ip') || fallback || (h.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
}

// Lee el cuerpo con un límite de tamaño (evita peticiones abusivas)
async function readLimited(request, max) {
  const cl = +(request.headers.get('content-length') || 0);
  if (cl > max) throw Object.assign(new Error('Cuerpo demasiado grande'), { status: 413 });
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader(); const chunks = []; let n = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    n += value.byteLength; if (n > max) { try { reader.cancel(); } catch { /* ignorar */ } throw Object.assign(new Error('Cuerpo demasiado grande'), { status: 413 }); }
    chunks.push(value);
  }
  const out = new Uint8Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  return out;
}

function withHeaders(res, headers) {
  const h = new Headers(res.headers); Object.entries(headers).forEach(([k, v]) => { if (!h.has(k)) h.set(k, v); });
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

// Comparación en tiempo constante (código de acceso de la IA)
function safeEqual(a, b) {
  a = String(a || ''); b = String(b || ''); let r = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) r |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ (b.charCodeAt(i % (b.length || 1)) || 0);
  return r === 0 && a.length > 0;
}

// =====================================================================
// EISENKU OS 9.0 ENTERPRISE · Proxy del Navegador EISEN (v3, endurecido)
// Rutas: /proxy?ping=1 · /proxy?probe=URL · /proxy?url=URL (redirige) · /p/<https|http>/<host>/<ruta> (contenido)
// Cambios de seguridad respecto a 8.0:
//  - Las respuestas llevan "Content-Security-Policy: sandbox …": la página corre en un origen opaco y NO puede
//    leer los datos de EISENKU aunque se abra directamente en una pestaña (antes podía en Netlify/Cloudflare).
//  - frame-ancestors: solo EISENKU puede incrustar las páginas del proxy.
//  - SSRF: IPv4/IPv6 privadas, nombres internos, puertos no estándar, credenciales en URL y (en Node) DNS real.
//  - Redirecciones revalidadas, métodos permitidos GET/HEAD/POST/OPTIONS, límites de tamaño y de tiempo.
//  - Cookies del sitio: HttpOnly y solo se adjuntan cuando la petición viene de ese mismo sitio (sin CSRF entre sitios).
//  - CORS: solo EISENKU (mismo host) y las propias páginas aisladas (origen "null"); otros orígenes reciben 403.
//  - Limitación de peticiones por IP y registro de eventos de seguridad.
// =====================================================================

const DROP = ['x-frame-options', 'content-security-policy', 'content-security-policy-report-only', 'set-cookie', 'content-encoding', 'content-length', 'transfer-encoding', 'strict-transport-security', 'cross-origin-opener-policy', 'cross-origin-embedder-policy', 'cross-origin-resource-policy', 'report-to', 'nel', 'referrer-policy', 'permissions-policy', 'link', 'alt-svc', 'clear-site-data', 'server-timing'];
const SKIP = /^(host|cookie|origin|referer|content-length|connection|accept-encoding|keep-alive|upgrade|te|trailer|proxy-.*|sec-fetch-.*|cf-.*|x-forwarded-.*|x-real-ip|x-nf-.*|forwarded|cdn-loop|via|upgrade-insecure-requests|x-eisen-.*)$/i;
const MAX_BODY = 5 * 1024 * 1024;        // cuerpo de peticiones POST
const MAX_REWRITE = 15 * 1024 * 1024;    // HTML/CSS que se reescribe en memoria
const TIMEOUT = 25000;
const hk = s => s.replace(/[^\w]/g, '_');
const pxPath = a => '/p/' + a.protocol.slice(0, -1) + '/' + a.host + a.pathname + a.search;
// sitio "registrable" aproximado (ejemplo.com, ejemplo.co.uk) para decidir si una petición viene del mismo sitio
const siteOf = h => { const p = String(h || '').toLowerCase().split('.'); if (p.length <= 2) return p.join('.'); const sld = p[p.length - 2]; return (sld.length <= 3 && p[p.length - 1].length === 2 ? p.slice(-3) : p.slice(-2)).join('.'); };

function px(u, base) {
  if (!u) return u;
  u = String(u).replace(/&amp;/g, '&').trim();
  if (/^(data:|blob:|javascript:|about:|#|mailto:|tel:)/i.test(u) || u.startsWith('/p/')) return u;
  try { const a = new URL(u, base); return /^https?:$/.test(a.protocol) ? pxPath(a) + a.hash : u; } catch { return u; }
}
function rewriteCss(css, base) {
  return css.replace(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi, (m, q, u) => 'url(' + q + px(u, base) + q + ')').replace(/@import\s+(["'])([^"']+)\1/gi, (m, q, u) => '@import ' + q + px(u, base) + q);
}
function rewriteHtml(html, base) {
  html = html.replace(/<meta[^>]+(http-equiv=["']?content-security-policy|name=["']?referrer)[^>]*>/gi, '');
  html = html.replace(/<(script|img|source|video|audio|iframe|embed|track|input|link|base|object)\b[^>]*>/gi, tag => {
    const name = tag.slice(1).match(/^\w+/)[0].toLowerCase();
    const attrs = name === 'link' || name === 'base' ? ['href'] : name === 'object' ? ['data'] : ['src', 'poster', 'data-src'];
    tag = tag.replace(/\s(integrity|nonce)=("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    attrs.forEach(a => {
      tag = tag.replace(new RegExp('(\\s' + a + '=)("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'), (m, pre, val, d, s1, u) => pre + '"' + px(d ?? s1 ?? u, base).replace(/"/g, '&quot;') + '"');
    });
    if (/\ssrcset=/i.test(tag)) tag = tag.replace(/(\ssrcset=)("([^"]*)"|'([^']*)')/i, (m, pre, q, d, s1) => pre + '"' + (d ?? s1).split(',').map(x => { const p = x.trim().split(/\s+/); p[0] = px(p[0], base); return p.join(' '); }).join(', ') + '"');
    return tag;
  });
  return html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, m => rewriteCss(m, base));
}

// Adaptador de almacenamiento: los sitios aislados no tienen localStorage/cookies; el shim los emula y
// EISENKU los guarda por sitio (el padre solo devuelve los datos del MISMO sitio desde 9.0).
const SHIM_SRC = "(function(R,I){var H;try{H=new URL(R).host}catch(e){H=location.host}var P=parent;function post(m){m.eisen=1;try{P.postMessage(m,'*')}catch(e){}}var okL=1,okC=1;try{localStorage.getItem('x')}catch(e){okL=0}try{void document.cookie}catch(e){okC=0}if(okL&&okC)return;var has=Object.prototype.hasOwnProperty,tm=0,L={},C={};try{if(I){L=I.l||{};C=I.c||{}}}catch(e){}function sync(){clearTimeout(tm);tm=setTimeout(function(){post({st:{h:H,l:L,c:C}})},400)}function mk(d,pe){var api={getItem:function(k){k=String(k);return has.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v);if(pe)sync()},removeItem:function(k){delete d[String(k)];if(pe)sync()},clear:function(){for(var k in d)delete d[k];if(pe)sync()},key:function(i){var a=Object.keys(d);return a[i]===undefined?null:a[i]}};return new Proxy(api,{get:function(t,k){if(k==='length')return Object.keys(d).length;if(typeof k==='string'&&has.call(t,k))return t[k];if(typeof k==='string'&&has.call(d,k))return d[k];return undefined},set:function(t,k,v){d[String(k)]=String(v);if(pe)sync();return true},deleteProperty:function(t,k){delete d[k];if(pe)sync();return true},has:function(t,k){return has.call(t,k)||has.call(d,k)},ownKeys:function(){return Object.keys(d)},getOwnPropertyDescriptor:function(t,k){return has.call(d,k)?{value:d[k],enumerable:true,configurable:true,writable:true}:undefined}})}if(!okL){var ls=mk(L,1),ss=mk({},0);try{Object.defineProperty(window,'localStorage',{get:function(){return ls},configurable:true})}catch(e){}try{Object.defineProperty(window,'sessionStorage',{get:function(){return ss},configurable:true})}catch(e){}}if(!okC){try{Object.defineProperty(document,'cookie',{get:function(){return Object.keys(C).map(function(k){return k+'='+C[k]}).join('; ')},set:function(v){var p=String(v).split(';'),nv=p.shift(),i=nv.indexOf('=');if(i<1)return;var n=nv.slice(0,i).trim(),val=nv.slice(i+1).trim(),del=false;p.forEach(function(x){var q=x.trim().split('='),k=q[0].toLowerCase();if(k==='max-age'&&parseInt(q[1],10)<=0)del=true;if(k==='expires'&&Date.parse(q.slice(1).join('='))<Date.now())del=true});if(del)delete C[n];else C[n]=val;sync()},configurable:true})}catch(e){}}addEventListener('message',function(e){var m=e.data;if(!m||!m.eisenst||e.source!==P)return;var a=m.l||{},b=m.c||{},k;for(k in a)if(!has.call(L,k))L[k]=a[k];for(k in b)if(!has.call(C,k))C[k]=b[k]});post({stget:H})})";
const inject = real => `<script>${SHIM_SRC}(${JSON.stringify(real).replace(/</g, '\\u003c')},null)<\/script><script>(function(){var REAL=${JSON.stringify(real).replace(/</g, '\\u003c')},PO=location.href.split('/p/')[0],P=parent;
function s(m){m.eisen=1;P.postMessage(m,'*')}
function px(u){try{var a=new URL(u,REAL);if(!/^https?:$/.test(a.protocol))return u;if(a.href.indexOf(PO+'/p/')===0)return a.href;return PO+'/p/'+a.protocol.slice(0,-1)+'/'+a.host+a.pathname+a.search+a.hash}catch(e){return u}}
function real(u){if(u.indexOf(PO+'/p/')===0){var r=u.slice(PO.length+3),i=r.indexOf('/');return r.slice(0,i)+'://'+r.slice(i+1)}return u}
var of=window.fetch;if(of)window.fetch=function(i,o){try{if(typeof i==='string'||i instanceof URL){i=px(String(i));o=Object.assign({credentials:'include'},o||{})}else if(i&&i.url){i=new Request(px(i.url),i);o=Object.assign({credentials:'include'},o||{})}}catch(e){}return of.call(this,i,o)};
var ox=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){arguments[1]=px(String(u));var r=ox.apply(this,arguments);try{this.withCredentials=true}catch(e){}return r};
[[HTMLScriptElement,'src'],[HTMLImageElement,'src'],[HTMLIFrameElement,'src'],[HTMLSourceElement,'src'],[HTMLMediaElement,'src'],[HTMLLinkElement,'href'],[HTMLEmbedElement,'src'],[HTMLTrackElement,'src']].forEach(function(p){var d=Object.getOwnPropertyDescriptor(p[0].prototype,p[1]);if(!d||!d.set)return;Object.defineProperty(p[0].prototype,p[1],{get:d.get,set:function(v){d.set.call(this,px(String(v)))},configurable:true,enumerable:d.enumerable})});
var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){if(/^(src|href|data-src|poster)$/i.test(n)&&/^(SCRIPT|IMG|IFRAME|SOURCE|VIDEO|AUDIO|LINK|EMBED|TRACK)$/.test(this.tagName))v=px(String(v));return sa.call(this,n,v)};
var OW=window.Worker;if(OW)window.Worker=function(u,o){return new OW(px(String(u)),o)};
try{navigator.serviceWorker.register=function(){return Promise.reject(new Error('disabled'))}}catch(e){}
['pushState','replaceState'].forEach(function(k){var o=history[k];history[k]=function(st,t,u){if(u!=null){try{REAL=new URL(String(u),REAL).href;s({loaded:1,url:REAL,title:document.title});u=px(REAL)}catch(e){}}try{return o.call(this,st,t,u)}catch(e){return o.call(this,st,t)}}});
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button>0)return;var h=a.getAttribute('href')||'';if(/^(javascript:|mailto:|tel:)/i.test(h))return;e.preventDefault();if(h.charAt(0)==='#'){var el=document.getElementById(h.slice(1))||document.getElementsByName(h.slice(1))[0];if(el)el.scrollIntoView();return}s({nav:new URL(h,real(document.baseURI)).href,tab:(e.ctrlKey||e.metaKey||a.target==='_blank')?1:0})},false);
document.addEventListener('submit',function(e){var f=e.target;if(e.defaultPrevented)return;var act=new URL(f.getAttribute('action')||'',real(document.baseURI));if((f.method||'get').toLowerCase()==='get'){e.preventDefault();var u=new URL(act.href);u.search='';new FormData(f).forEach(function(v,k){if(typeof v==='string')u.searchParams.append(k,v)});s({nav:u.href})}else{f.action=px(act.href)}},false);
window.open=function(u){if(u)s({nav:new URL(String(u),REAL).href,tab:1,popup:1});return null};
addEventListener('load',function(){s({loaded:1,title:document.title,url:REAL})});
})()<\/script>`;

function targetOf(u, request) {
  const m = u.pathname.match(/^\/p\/(https?)\/([^/]+)(\/.*)?$/);
  if (m) { try { return new URL(m[1] + '://' + m[2] + (m[3] || '/') + u.search); } catch { return null; } }
  if (u.pathname.startsWith('/p/')) return null;
  const ref = request.headers.get('referer');   // rutas absolutas sueltas: se deducen de la página que las pidió
  if (ref) { try { const r = new URL(ref), mm = r.pathname.match(/^\/p\/(https?)\/([^/]+)/); if (mm && r.host === u.host) return new URL(mm[1] + '://' + mm[2] + u.pathname + u.search); } catch { /* ignorar */ } }
  return null;
}
// ¿De qué sitio proxied viene la petición? (por el Referer /p/<esquema>/<host>/…)
function initiatorHost(request, selfHost) {
  const ref = request.headers.get('referer'); if (!ref) return '';
  try { const r = new URL(ref); if (r.host !== selfHost) return '#foreign'; const mm = r.pathname.match(/^\/p\/https?\/([^/]+)/); return mm ? mm[1].replace(/:\d+$/, '') : ''; } catch { return ''; }
}

/**
 * Crea el manejador del proxy.
 * @param {object} o
 * @param {(host:string)=>Promise<boolean>} [o.resolveGuard] comprobación DNS (true = permitido)
 * @param {string} [o.frameAncestors] orígenes que pueden incrustar las páginas del proxy (por defecto 'self')
 * @param {(origin:string, selfHost:string)=>boolean} [o.originAllowed] orígenes extra permitidos (p. ej. puerto principal en local)
 */
function createProxy(o = {}) {
  const pageLimiter = new RateLimiter(+(o.navPerMin || 120), 60000);    // navegaciones /proxy?url= y sondeos
  const reqLimiter = new RateLimiter(+(o.reqPerMin || 1200), 60000);   // subrecursos /p/…
  const allowOrigin = (origin, selfHost) => {
    if (!origin) return true;
    if (origin === 'null') return true;                                   // páginas aisladas del propio proxy
    try { const oh = new URL(origin); if (oh.host === selfHost || oh.hostname === selfHost.split(':')[0]) return true; } catch { return false; }
    return !!(o.originAllowed && o.originAllowed(origin, selfHost));
  };

  return async function proxy(request, extra) {
    const u = new URL(request.url);
    const ip = clientIp(request, extra && extra.ip);
    const origin = request.headers.get('origin');
    const json = (obj, st = 200, h = {}) => new Response(JSON.stringify(obj), { status: st, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }, h) });

    if (u.pathname === '/proxy') {
      if (u.searchParams.has('ping')) return json(Object.assign({ ok: true, v: 3, sandbox: true }, (extra && extra.ping) || {}));
      if (!allowOrigin(origin, u.host)) { secLog('proxy.origin_denied', { ip, origin }); return json({ error: 'Origen no permitido' }, 403); }
      // CORS solo para orígenes permitidos (el escritorio en el puerto principal consulta el proxy alternativo)
      const pc = origin && origin !== 'null' ? { 'access-control-allow-origin': origin, vary: 'origin' } : {};
      const lim = pageLimiter.hit(ip); if (!lim.ok) { secLog('proxy.rate_limited', { ip, path: '/proxy' }); return json({ error: 'Demasiadas peticiones' }, 429, Object.assign({ 'retry-after': String(lim.retry) }, pc)); }
      if (u.searchParams.has('probe')) { // ¿el sitio permite mostrarse dentro de un iframe? (redirecciones revalidadas)
        let target = u.searchParams.get('probe');
        try {
          for (let hop = 0; hop < 5; hop++) {
            const ck = await checkTarget(target, o.resolveGuard);
            if (!ck.ok) { secLog('proxy.blocked', { ip, target: String(target).slice(0, 200), why: ck.why }); return json({ frameable: false }, 200, pc); }
            const c = new AbortController(), to = setTimeout(() => c.abort(), 8000);
            const r = await fetch(ck.url.href, { redirect: 'manual', signal: c.signal, headers: { 'user-agent': request.headers.get('user-agent') || 'Mozilla/5.0', 'accept-language': request.headers.get('accept-language') || 'es' } }).finally(() => clearTimeout(to));
            try { r.body && r.body.cancel(); } catch { /* ignorar */ }
            const loc = r.headers.get('location');
            if (r.status >= 300 && r.status < 400 && loc) { target = new URL(loc, ck.url).href; continue; }
            const xfo = r.headers.get('x-frame-options'), csp = r.headers.get('content-security-policy') || '';
            const fa = (csp.match(/frame-ancestors([^;]*)/i) || [])[1];
            return json({ frameable: r.ok && !xfo && (!fa || /\*/.test(fa)) }, 200, pc);
          }
          return json({ frameable: false }, 200, pc);
        } catch { return json({ frameable: false }, 200, pc); }
      }
      const ck = await checkTarget(u.searchParams.get('url') || '', o.resolveGuard);
      if (!ck.ok) { secLog('proxy.blocked', { ip, target: String(u.searchParams.get('url') || '').slice(0, 200), why: ck.why }); return json({ error: ck.why }, 400, pc); }
      return new Response(null, { status: 302, headers: { location: pxPath(ck.url) + ck.url.hash, 'cache-control': 'no-store' } });
    }

    const t0 = targetOf(u, request);
    if (!t0) return u.pathname.startsWith('/p/') ? json({ error: 'URL inválida' }, 400) : null;
    if (!['GET', 'HEAD', 'POST', 'OPTIONS'].includes(request.method)) return json({ error: 'Método no permitido' }, 405, { allow: 'GET, HEAD, POST, OPTIONS' });
    if (!allowOrigin(origin, u.host)) { secLog('proxy.origin_denied', { ip, origin }); return json({ error: 'Origen no permitido' }, 403); }
    // el origen ya está validado: las respuestas de error también llevan CORS (así la app ve el error real)
    const cors = origin ? { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': (request.headers.get('access-control-request-headers') || 'content-type').slice(0, 500), 'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS', 'access-control-max-age': '600', 'vary': 'Origin' } : {};
    const lim = reqLimiter.hit(ip); if (!lim.ok) { secLog('proxy.rate_limited', { ip, path: '/p/' }); return json({ error: 'Demasiadas peticiones' }, 429, Object.assign({ 'retry-after': String(lim.retry) }, cors)); }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const ck = await checkTarget(t0.href, o.resolveGuard);
    if (!ck.ok) { secLog('proxy.blocked', { ip, target: t0.href.slice(0, 200), why: ck.why }); return json({ error: ck.why }, 400, cors); }
    const t = ck.url;

    const h = new Headers();
    request.headers.forEach((v, k) => { if (!SKIP.test(k)) h.set(k, v); });
    h.set('referer', t.origin + '/');
    if (request.method === 'POST') h.set('origin', t.origin);
    // cookies del sitio: solo si la petición la hace ese mismo sitio (o es una navegación de EISENKU)
    const ini = initiatorHost(request, u.host);
    const sameSite = !ini || (ini !== '#foreign' && siteOf(ini) === siteOf(t.hostname));
    const pre = '__e_' + hk(t.host) + '_';
    if (sameSite) {
      const ckStr = (request.headers.get('cookie') || '').split(/;\s*/).filter(x => x.startsWith(pre)).map(x => x.slice(pre.length)).join('; ');
      if (ckStr) h.set('cookie', ckStr);
    } else if (ini === '#foreign') secLog('proxy.foreign_referer', { ip, target: t.host });
    if (!h.get('user-agent')) h.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36');
    const init = { method: request.method, headers: h, redirect: 'manual' };
    if (request.method === 'POST') {
      try { init.body = await readLimited(request, MAX_BODY); } catch (e) { return json({ error: e.message }, e.status || 400, cors); }
    }
    let res;
    const c = new AbortController(), to = setTimeout(() => c.abort(), TIMEOUT); init.signal = c.signal;
    try { res = await fetch(t.href, init); } catch (e) { clearTimeout(to); return json({ error: 'No se pudo conectar con el sitio' }, 502, cors); }
    clearTimeout(to);

    const out = new Headers(res.headers);
    DROP.forEach(k => out.delete(k));
    Object.entries(cors).forEach(([k, v]) => out.set(k, v));
    out.set('x-robots-tag', 'noindex, nofollow');
    out.set('content-security-policy', PROXY_SANDBOX + '; frame-ancestors ' + (o.frameAncestors || "'self'"));
    out.set('referrer-policy', 'no-referrer-when-downgrade');
    const https = u.protocol === 'https:';
    if (sameSite) {
      const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
      sc.slice(0, 50).forEach(cs => {
        const parts = cs.split(';'), nv = parts.shift(), i = nv.indexOf('=');
        const name = i > 0 ? nv.slice(0, i).trim() : '';
        if (!/^[\w.-]{1,100}$/.test(name)) return;
        let attrs = ''; parts.forEach(p => { const [k, ...v] = p.trim().split('='); if (/^(max-age|expires)$/i.test(k)) attrs += '; ' + k + '=' + v.join('=').replace(/[;\r\n]/g, ''); });
        out.append('set-cookie', pre + name + '=' + nv.slice(i + 1).trim().slice(0, 4096) + '; Path=/; HttpOnly' + attrs + (https ? '; SameSite=None; Secure' : '; SameSite=Lax'));
      });
    }
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) { try { const a = new URL(loc, t); out.set('location', pxPath(a) + a.hash); } catch { out.delete('location'); } }

    const ct = out.get('content-type') || '';
    const len = +(res.headers.get('content-length') || 0);
    if ((/text\/html/i.test(ct) || /text\/css/i.test(ct)) && (!len || len <= MAX_REWRITE)) {
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_REWRITE) return new Response(buf, { status: res.status, headers: out });
      let cs = (ct.match(/charset=([\w-]+)/i) || [])[1];
      if (!cs) cs = ((new TextDecoder('latin1').decode(buf.slice(0, 2048))).match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1] || 'utf-8';
      let txt; try { txt = new TextDecoder(cs).decode(buf); } catch { txt = new TextDecoder('utf-8').decode(buf); }
      if (/text\/css/i.test(ct)) { out.set('content-type', 'text/css; charset=utf-8'); return new Response(rewriteCss(txt, t.href), { status: res.status, headers: out }); }
      txt = rewriteHtml(txt, t.href);
      const inj = inject(t.href);
      if (/<head[^>]*>/i.test(txt)) txt = txt.replace(/<head[^>]*>/i, m => m + inj);
      else if (/<html[^>]*>/i.test(txt)) txt = txt.replace(/<html[^>]*>/i, m => m + inj);
      else txt = inj + txt;
      out.set('content-type', 'text/html; charset=utf-8');
      return new Response(txt, { status: res.status, headers: out });
    }
    return new Response(request.method === 'HEAD' ? null : res.body, { status: res.status, headers: out });
  };
}

const proxy = createProxy({});
export const onRequest = async ({ request }) => (await proxy(request, { ping: { server: 'cloudflare-functions', version: EISENKU_SERVER_VERSION } })) || new Response('No encontrado', { status: 404 });

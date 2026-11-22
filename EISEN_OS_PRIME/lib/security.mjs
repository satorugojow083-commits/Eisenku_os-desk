// =====================================================================
// EISENKU OS 9.0 ENTERPRISE · Seguridad compartida del servidor
// Fuente única usada por server.mjs (Node), Cloudflare (_worker.js, functions/) y Netlify (netlify/functions/).
// Los archivos de Cloudflare/Netlify se GENERAN con `node tools/build-edge.mjs` (no editarlos a mano).
// =====================================================================

export const EISENKU_SERVER_VERSION = '11.0.0';

// ---------- Política de seguridad de contenido de la app ----------
// Notas honestas (ver docs/SEGURIDAD.md):
//  - 'unsafe-inline' sigue siendo necesario: las páginas internas del navegador (srcdoc) heredan esta política
//    y usan scripts en línea; la defensa principal contra XSS es el escapado/saneado y el aislamiento (sandbox).
//  - https: en script-src permite que el "modo compatibilidad" (srcdoc con <base> del sitio real) cargue los scripts del sitio.
export const APP_CSP = [
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

export const APP_HEADERS = {
  'content-security-policy': APP_CSP,
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
  'permissions-policy': 'browsing-topics=(), interest-cohort=()',
  'cross-origin-opener-policy': 'same-origin-allow-popups'
};

// Las páginas cargadas mediante el proxy se ejecutan en un ORIGEN OPACO (sandbox sin allow-same-origin):
// aunque se abran directamente en una pestaña, no pueden leer localStorage/IndexedDB de EISENKU.
export const PROXY_SANDBOX = 'sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-presentation allow-pointer-lock allow-popups-to-escape-sandbox';

// ---------- Registro de eventos de seguridad (salida estructurada en el log del servidor) ----------
export function secLog(event, data) {
  try { console.warn(JSON.stringify(Object.assign({ t: new Date().toISOString(), sec: event }, data || {}))); } catch { /* sin consola */ }
}

// ---------- IP y nombres de host privados (protección SSRF) ----------
function v4parts(ip) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return null;
  const p = ip.split('.').map(Number); return p.some(x => x > 255) ? null : p;
}
export function ipv4Private(ip) {
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
export function ipv6Private(ip) {
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
export function isPrivateIp(ip) { return ipv4Private(ip) || ipv6Private(ip); }

export function hostBlocked(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/\.$/, '');
  if (!h) return true;
  if (h.startsWith('[')) return ipv6Private(h);
  if (v4parts(h)) return ipv4Private(h);
  if (h.indexOf('.') < 0) return true;                                            // nombres de una sola etiqueta (router, nas…)
  return /(^|\.)(localhost|local|localdomain|internal|intranet|lan|home|corp|home\.arpa|in-addr\.arpa|ip6\.arpa)$/.test(h) ||
    h === 'metadata.google.internal' || h === 'metadata';
}
export function portAllowed(u) {
  const p = u.port ? +u.port : (u.protocol === 'https:' ? 443 : 80);
  return [80, 443, 8080, 8443].includes(p);
}

// Valida un destino del proxy. resolveGuard (opcional) comprueba también las IP reales vía DNS (Node/Netlify).
export async function checkTarget(urlLike, resolveGuard) {
  let u; try { u = new URL(urlLike); } catch { return { ok: false, why: 'URL inválida' }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, why: 'Protocolo no permitido' };
  if (u.username || u.password) return { ok: false, why: 'Credenciales en la URL no permitidas' };
  if (hostBlocked(u.hostname)) return { ok: false, why: 'Destino privado o interno bloqueado' };
  if (!portAllowed(u)) return { ok: false, why: 'Puerto no permitido' };
  if (resolveGuard) { try { if (!(await resolveGuard(u.hostname))) return { ok: false, why: 'El nombre resuelve a una red privada' }; } catch { return { ok: false, why: 'No se pudo resolver el nombre' }; } }
  return { ok: true, url: u };
}

// ---------- Limitador de peticiones (ventana deslizante en memoria, por instancia) ----------
export class RateLimiter {
  constructor(limit, windowMs) { this.limit = limit; this.win = windowMs; this.m = new Map(); this.n = 0; }
  hit(key) {
    const now = Date.now(), arr = (this.m.get(key) || []).filter(t => now - t < this.win);
    if (arr.length >= this.limit) { this.m.set(key, arr); return { ok: false, retry: Math.ceil((this.win - (now - arr[0])) / 1000) }; }
    arr.push(now); this.m.set(key, arr);
    if (++this.n % 500 === 0) for (const [k, v] of this.m) if (!v.length || now - v[v.length - 1] > this.win) this.m.delete(k);
    return { ok: true };
  }
}

export function clientIp(request, fallback) {
  const h = request.headers;
  return h.get('cf-connecting-ip') || h.get('x-nf-client-connection-ip') || fallback || (h.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
}

// Lee el cuerpo con un límite de tamaño (evita peticiones abusivas)
export async function readLimited(request, max) {
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

export function withHeaders(res, headers) {
  const h = new Headers(res.headers); Object.entries(headers).forEach(([k, v]) => { if (!h.has(k)) h.set(k, v); });
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

// Comparación en tiempo constante (código de acceso de la IA)
export function safeEqual(a, b) {
  a = String(a || ''); b = String(b || ''); let r = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) r |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ (b.charCodeAt(i % (b.length || 1)) || 0);
  return r === 0 && a.length > 0;
}

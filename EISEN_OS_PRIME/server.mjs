// =====================================================================
// EISEN OS PRIME 11.0 (base EISENKU OS 10.0) · Servidor local
// Uso: node server.mjs   ->  http://127.0.0.1:8080
// Variables: PORT (8080), HOST (127.0.0.1; usa 0.0.0.0 para abrirlo desde otros dispositivos de tu red: Xbox, tablet…),
//            AI_API_KEY, AI_BASE_URL, AI_MODEL, AI_ACCESS_CODE, AI_RATE_PER_MIN, AI_DAILY_LIMIT (ver docs/DESPLIEGUE.md)
// El proxy del navegador corre además en PORT+1 (otro origen) para que las páginas nunca toquen tus datos.
// =====================================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import dns from 'node:dns';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { APP_HEADERS, isPrivateIp, secLog, EISENKU_SERVER_VERSION } from './lib/security.mjs';
import { createProxy } from './lib/proxy-core.mjs';
import { createAi } from './lib/ai-core.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const PORT = +process.env.PORT || 8080;
// PRIME 11: EISEN_CLOUD=1 (lo pone «npm start») = alojamiento en la nube con un solo puerto público:
// escucha en todas las interfaces y el proxy usa el mismo origen (con iframes aislados) en vez de PORT+1.
const CLOUD = process.env.EISEN_CLOUD === '1';
const HOST = process.env.HOST || (CLOUD ? '0.0.0.0' : '127.0.0.1');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf'
};
const COMPRESS = /^(text\/|application\/(json|javascript|manifest\+json)|image\/svg)/;

// DNS real: bloquea nombres públicos que resuelven a IP privadas (rebinding hacia tu red local)
const resolveGuard = host => new Promise(res => {
  if (/^[\d.]+$/.test(host) || host.startsWith('[')) return res(true); // los literales ya los valida checkTarget
  dns.lookup(host, { all: true }, (err, addrs) => {
    if (err || !addrs || !addrs.length) return res(false);
    const bad = addrs.find(a => isPrivateIp(a.address));
    if (bad) secLog('proxy.dns_private', { host, ip: bad.address });
    res(!bad);
  });
});
const proxyMain = createProxy({ resolveGuard });
const proxyAlt = createProxy({
  resolveGuard,
  // en local el proxy alternativo (PORT+1) solo puede incrustarse desde el escritorio (PORT)
  // (los orígenes permitidos por CORS son el mismo nombre de host con cualquier puerto: el escritorio en PORT)
  frameAncestors: "'self' http://127.0.0.1:" + PORT + ' http://localhost:' + PORT + (HOST !== '127.0.0.1' ? ' http://*:' + PORT : '')
});
const ai = createAi();

const toRequest = req => {
  const h = new Headers(); for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') h.set(k, v); else if (Array.isArray(v)) h.set(k, v.join(', '));
  const init = { method: req.method, headers: h };
  if (!['GET', 'HEAD'].includes(req.method)) { init.body = req; init.duplex = 'half'; }
  const host = String(req.headers.host || 'localhost').replace(/[^\w.:[\]-]/g, '') || 'localhost';
  return new Request('http://' + host + req.url, init);
};
const send = async (res, r) => {
  const h = {}; r.headers.forEach((v, k) => { if (k === 'set-cookie') return; h[k] = v; });
  const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : []; if (sc.length) h['set-cookie'] = sc;
  res.writeHead(r.status, h);
  if (!r.body) return res.end();
  try { for await (const chunk of r.body) res.write(chunk); } catch { /* conexión cortada */ }
  res.end();
};
const ipOf = req => (req.socket && req.socket.remoteAddress) || 'local';

// ---------- archivos estáticos con cabeceras de seguridad, ETag y gzip ----------
const gzCache = new Map();
function serveStatic(req, res, u) {
  let rel; try { rel = decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname); } catch { res.writeHead(400); return res.end('Ruta inválida'); }
  if (rel.includes('\0')) { res.writeHead(400); return res.end(); }
  const p = path.normalize(path.join(dir, rel));
  // 9.0: corrige path traversal (8.0 aceptaba carpetas hermanas con el mismo prefijo)
  if (p !== dir && !p.startsWith(dir + path.sep)) { secLog('static.traversal', { ip: ipOf(req), path: rel.slice(0, 200) }); res.writeHead(403); return res.end(); }
  if (/(^|[\\/])\.|[\\/]node_modules([\\/]|$)/.test(path.relative(dir, p))) { res.writeHead(404); return res.end('No encontrado'); }
  fs.stat(p, (e, st) => {
    if (e || !st.isFile()) {
      res.writeHead(404, Object.assign({ 'content-type': 'text/html; charset=utf-8' }, APP_HEADERS));
      return res.end('<!doctype html><meta charset="utf-8"><title>404 · EISENKU OS</title><body style="font:15px system-ui;background:#0b0c0f;color:#e9ebef;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="font-weight:600">404</h1><p>Este recurso no existe en EISENKU OS.</p><p><a style="color:#34a582" href="/">Volver al escritorio</a></p></div>');
    }
    const type = TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream';
    const etag = '"' + st.size.toString(36) + '-' + Math.floor(st.mtimeMs).toString(36) + '"';
    const headers = Object.assign({ 'content-type': type, etag, 'cache-control': /\.(png|jpe?g|gif|webp|ico|woff2?)$/i.test(p) ? 'public, max-age=86400' : 'no-cache' }, type.startsWith('text/html') ? APP_HEADERS : { 'x-content-type-options': 'nosniff' });
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
    const gz = /\bgzip\b/.test(req.headers['accept-encoding'] || '') && COMPRESS.test(type) && st.size > 1024;
    if (req.method === 'HEAD') { res.writeHead(200, headers); return res.end(); }
    fs.readFile(p, (err, data) => {
      if (err) { res.writeHead(500); return res.end('Error'); }
      if (gz) {
        const k = p + etag; let z = gzCache.get(k);
        if (!z) { z = zlib.gzipSync(data, { level: 6 }); gzCache.set(k, z); if (gzCache.size > 200) gzCache.delete(gzCache.keys().next().value); }
        headers['content-encoding'] = 'gzip'; headers.vary = 'Accept-Encoding'; res.writeHead(200, headers); return res.end(z);
      }
      res.writeHead(200, headers); res.end(data);
    });
  });
}

// ---------- PRIME 11: relé de transferencia para la red local ----------
// Guarda en memoria, durante 10 minutos y para UNA sola lectura, un paquete que el navegador ya cifró (AES-GCM).
// El servidor nunca ve la clave: forma parte del código que el usuario lleva al otro dispositivo (Xbox, móvil, tableta).
const RELAY = new Map(), RELAY_TTL = 10 * 60000, RELAY_MAX = 8 * 1024 * 1024, RELAY_TOTAL = 64 * 1024 * 1024, relayHits = new Map();
const RELAY_ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
async function relay(req, res, u) {
  const t = Date.now(); for (const [k, v] of RELAY) if (t - v.at > RELAY_TTL) RELAY.delete(k);
  const ip = ipOf(req), h = relayHits.get(ip) || { n: 0, t }; if (t - h.t > 60000) { h.n = 0; h.t = t; } h.n++; relayHits.set(ip, h); if (relayHits.size > 5000) relayHits.clear();
  const json = (st, o) => { res.writeHead(st, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(o)); };
  if (h.n > 60) return json(429, { error: 'Demasiadas peticiones: espera un minuto' });
  if (req.method === 'GET' && u.pathname === '/relay/ping') return json(200, { ok: true, ttl: RELAY_TTL / 1000, max: RELAY_MAX });
  if (req.method === 'POST' && u.pathname === '/relay') {
    if (req.headers['x-eisen-relay'] !== '1') return json(403, { error: 'Petición no permitida' });   // obliga a un preflight CORS: otra web no puede usar el relé
    const used = [...RELAY.values()].reduce((n, x) => n + x.body.length, 0);
    if (RELAY.size >= 200 || used > RELAY_TOTAL) return json(503, { error: 'El relé está lleno: inténtalo en unos minutos' });
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > RELAY_MAX) { req.destroy(); return json(413, { error: 'Demasiado grande (máx. 8 MB)' }); } chunks.push(c); }
    const body = Buffer.concat(chunks); if (body.length < 16 || body.slice(0, 4).toString('latin1') !== 'EENV') return json(400, { error: 'Paquete no válido' });
    let id; do { id = Array.from(crypto.randomBytes(6), b => RELAY_ALPHA[b % RELAY_ALPHA.length]).join(''); } while (RELAY.has(id));
    RELAY.set(id, { at: t, body }); secLog('relay.put', { ip, size: body.length });
    return json(200, { id, ttl: RELAY_TTL / 1000 });
  }
  const m = /^\/relay\/([A-Z0-9]{6})$/.exec(u.pathname);
  if (req.method === 'GET' && m) { const x = RELAY.get(m[1]); if (!x) return json(404, { error: 'Código caducado o ya usado' }); RELAY.delete(m[1]); secLog('relay.get', { ip, size: x.body.length }); res.writeHead(200, { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); return res.end(x.body); }
  return json(404, { error: 'No encontrado' });
}

// mensajes claros si el puerto está ocupado (p. ej. EISENKU ya abierto en otra ventana)
function portError(e, port) {
  if (e && e.code === 'EADDRINUSE') {
    console.error(`\n  El puerto ${port} ya está en uso.\n  ¿EISENKU OS ya está abierto en otra ventana? Abre http://127.0.0.1:${PORT} en el navegador,\n  o inicia en otro puerto:  PORT=8090 node server.mjs   (Windows: set PORT=8090 y luego INICIAR.bat)\n`);
  } else if (e && e.code === 'EACCES') {
    console.error(`\n  Sin permiso para usar el puerto ${port}. Prueba con un puerto mayor que 1024 (PORT=8080).\n`);
  } else console.error('\n  No se pudo iniciar el servidor:', e && e.message, '\n');
  process.exit(1);
}

http.createServer(async (req, res) => {
  let u; try { u = new URL(req.url, 'http://x'); } catch { res.writeHead(400); return res.end(); }
  try {
    const host = String(req.headers.host || '');
    if (u.pathname === '/ai') return await send(res, await ai(toRequest(req), process.env, { ip: ipOf(req) }));
    if (u.pathname === '/proxy' || u.pathname.startsWith('/p/')) {
      const hn = host.replace(/:\d+$/, '') || '127.0.0.1';
      return await send(res, await proxyMain(toRequest(req), { ip: ipOf(req), ping: Object.assign(CLOUD ? {} : { alt: `http://${hn}:${PORT + 1}/proxy?url=` }, { server: 'node', version: EISENKU_SERVER_VERSION }) }));
    }
    if (u.pathname === '/relay' || u.pathname.startsWith('/relay/')) return await relay(req, res, u);
    if (u.pathname === '/version.json') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); return res.end(JSON.stringify({ version: EISENKU_SERVER_VERSION, edition: 'PRIME' })); }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { allow: 'GET, HEAD' }); return res.end(); }
    serveStatic(req, res, u);
  } catch (e) { secLog('server.error', { msg: String(e && e.message || e).slice(0, 200) }); if (!res.headersSent) res.writeHead(500); res.end('Error'); }
}).on('error', e => portError(e, PORT)).listen(PORT, HOST, () => {
  const shown = HOST === '0.0.0.0' || HOST === '::' ? 'localhost' : HOST;
  console.log(`\n  EISEN OS PRIME 11.0 listo en  http://${shown}:${PORT}`);
  console.log(`  Asistente IA: ${process.env.AI_API_KEY ? 'activado (' + (process.env.AI_MODEL || 'modelo por defecto') + ')' + (process.env.AI_ACCESS_CODE ? ' · con código de acceso' : '') : 'modo local (define AI_API_KEY para activar la IA)'}`);
  if (CLOUD) console.log('  Modo nube (EISEN_CLOUD=1): un solo puerto público, proxy en el mismo origen.');
  else if (HOST === '0.0.0.0' || HOST === '::') console.log('  AVISO: visible para otros dispositivos de tu red (HOST=' + HOST + '). Úsalo solo en redes de confianza.');
  console.log('  (deja esta ventana abierta mientras lo uses)\n');
});

if (!CLOUD) http.createServer(async (req, res) => {
  try { const r = await proxyAlt(toRequest(req), { ip: ipOf(req) }); if (r) return await send(res, r); res.writeHead(404); res.end(); }
  catch (e) { secLog('proxy.error', { msg: String(e && e.message || e).slice(0, 200) }); if (!res.headersSent) res.writeHead(500); res.end(); }
}).on('error', e => portError(e, PORT + 1)).listen(PORT + 1, HOST);

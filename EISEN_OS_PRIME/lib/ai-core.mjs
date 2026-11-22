// =====================================================================
// EISENKU OS 9.0 ENTERPRISE · /ai — IA del Maestro Domingo (la clave vive SOLO en el servidor)
// Variables: AI_API_KEY (obligatoria para activar), AI_BASE_URL, AI_MODEL,
//            AI_ACCESS_CODE (opcional: código que cada usuario escribe en Domingo › Ajustes),
//            AI_RATE_PER_MIN (por IP, 20 por defecto), AI_DAILY_LIMIT (por instancia, 500 por defecto).
// =====================================================================
import { RateLimiter, clientIp, readLimited, secLog, safeEqual } from './security.mjs';

export function createAi() {
  let limiter = null, day = '', used = 0;
  return async function aiHandler(request, env, extra) {
    env = env || {};
    const u = new URL(request.url);
    const key = env.AI_API_KEY;
    let base = String(env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
    const model = String(env.AI_MODEL || 'llama-3.3-70b-versatile');
    const code = env.AI_ACCESS_CODE || '';
    const J = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }, h) });
    if (request.method === 'GET') return J({ ok: !!key, model: key ? model : null, access: !!code });
    if (!key) return J({ error: 'IA no configurada en el servidor (falta AI_API_KEY)' }, 503);
    if (request.method !== 'POST') return J({ error: 'Método no permitido' }, 405, { allow: 'GET, POST' });
    // solo https (o http hacia un modelo local, p. ej. Ollama en localhost)
    try { const b = new URL(base); if (!(b.protocol === 'https:' || (b.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(b.hostname)))) return J({ error: 'AI_BASE_URL debe usar https' }, 500); } catch { return J({ error: 'AI_BASE_URL no es válida' }, 500); }
    const ip = clientIp(request, extra && extra.ip);
    // control de origen: las peticiones de navegador deben venir del mismo sitio
    const origin = request.headers.get('origin'), sfs = request.headers.get('sec-fetch-site');
    try { if (origin && new URL(origin).host !== u.host) { secLog('ai.origin_denied', { ip, origin }); return J({ error: 'Origen no permitido' }, 403); } } catch { return J({ error: 'Origen no válido' }, 403); }
    if (sfs && !/^(same-origin|none)$/.test(sfs)) { secLog('ai.cross_site', { ip, sfs }); return J({ error: 'Origen no permitido' }, 403); }
    if (code && !safeEqual(request.headers.get('x-eisen-access') || '', code)) { secLog('ai.bad_code', { ip }); return J({ error: 'Código de acceso de la IA incorrecto (Domingo › Ajustes)' }, 401); }
    if (!limiter) limiter = new RateLimiter(Math.max(1, +env.AI_RATE_PER_MIN || 20), 60000);
    const lim = limiter.hit(ip); if (!lim.ok) { secLog('ai.rate_limited', { ip }); return J({ error: 'Demasiadas peticiones; espera un minuto' }, 429, { 'retry-after': String(lim.retry) }); }
    const today = new Date().toISOString().slice(0, 10); if (today !== day) { day = today; used = 0; }
    const cap = Math.max(1, +env.AI_DAILY_LIMIT || 500);
    if (used >= cap) { secLog('ai.daily_cap', { ip, cap }); return J({ error: 'Se alcanzó el límite diario de la IA en este servidor' }, 429); }
    let body;
    try { body = JSON.parse(new TextDecoder().decode(await readLimited(request, 256 * 1024))); } catch (e) { return J({ error: e.status === 413 ? 'Mensaje demasiado grande' : 'JSON inválido' }, e.status || 400); }
    const messages = (Array.isArray(body && body.messages) ? body.messages : []).filter(m => m && ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string').slice(-20).map(m => ({ role: m.role, content: m.content.slice(0, 12000) }));
    if (!messages.length) return J({ error: 'Sin mensajes' }, 400);
    used++;
    const c = new AbortController(), to = setTimeout(() => c.abort(), 45000);
    try {
      const r = await fetch(base + '/chat/completions', { method: 'POST', signal: c.signal, headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' }, body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 1200 }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        secLog('ai.provider_error', { status: r.status, detail: String((j.error && (j.error.message || j.error)) || '').slice(0, 300) });
        return J({ error: r.status === 401 || r.status === 403 ? 'La clave de IA del servidor no es válida (revisa AI_API_KEY)' : r.status === 429 ? 'El proveedor de IA está limitando las peticiones; prueba más tarde' : 'El proveedor de IA devolvió un error (' + r.status + ')' }, 502);
      }
      return J({ text: (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '' });
    } catch (e) {
      return J({ error: e && e.name === 'AbortError' ? 'La IA tardó demasiado en responder' : 'No se pudo contactar con el proveedor de IA' }, 502);
    } finally { clearTimeout(to); }
  };
}

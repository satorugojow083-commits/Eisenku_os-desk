// =====================================================================
// EISENKU OS 9.0 · Genera los archivos de Cloudflare y Netlify a partir de lib/ (fuente única).
// Uso: node tools/build-edge.mjs
// Motivo: Cloudflare (subida por arrastrar y soltar) necesita archivos autocontenidos; así evitamos
// mantener 5 copias del proxy y 4 de la IA como en 8.0, sin depender de un empaquetador en el despliegue.
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
// quita imports y la palabra export para poder concatenar los módulos en un solo archivo
const inline = f => read(f).replace(/^import [^;]+;\s*$/gm, '').replace(/^export (?=(const|function|async function|class|let) )/gm, '');
const LIB = ['lib/security.mjs', 'lib/proxy-core.mjs', 'lib/ai-core.mjs'].map(inline).join('\n');
const LIB_PROXY = ['lib/security.mjs', 'lib/proxy-core.mjs'].map(inline).join('\n');
const LIB_AI = ['lib/security.mjs', 'lib/ai-core.mjs'].map(inline).join('\n');
const HEAD = (what) => `// =====================================================================\n// ARCHIVO GENERADO por tools/build-edge.mjs — NO editar a mano (edita lib/*.mjs y vuelve a generarlo).\n// EISENKU OS 10.0 NEXT GENERATION · ${what}\n// =====================================================================\n`;
const NODE_DNS = `
const resolveGuard = host => new Promise(res => {
  if (/^[\\d.]+$/.test(host) || host.startsWith('[')) return res(true);
  dns.lookup(host, { all: true }, (err, addrs) => {
    if (err || !addrs || !addrs.length) return res(false);
    const bad = addrs.find(a => isPrivateIp(a.address));
    if (bad) secLog('proxy.dns_private', { host, ip: bad.address });
    res(!bad);
  });
});`;

const files = {
  '_worker.js': HEAD('Cloudflare Pages (modo avanzado: subida por arrastrar y soltar o Git). Sirve el escritorio, el proxy y /ai.') + LIB + `
// Workers no puede alcanzar redes privadas; la validación de host/IP/puerto de checkTarget sigue aplicándose.
const proxy = createProxy({});
const ai = createAi();
export default {
  async fetch(request, env) {
    const u = new URL(request.url);
    if (u.pathname === '/ai') return ai(request, env);
    const r = await proxy(request, { ping: { server: 'cloudflare', version: EISENKU_SERVER_VERSION } });
    if (r) return r;
    const a = await env.ASSETS.fetch(request);
    const ct = a.headers.get('content-type') || '';
    return withHeaders(a, ct.includes('text/html') ? APP_HEADERS : { 'x-content-type-options': 'nosniff' });
  }
};
`,
  'functions/proxy.js': HEAD('Cloudflare Pages Functions (solo se usan si eliminas _worker.js). Ruta: /proxy') + LIB_PROXY + `
const proxy = createProxy({});
export const onRequest = async ({ request }) => (await proxy(request, { ping: { server: 'cloudflare-functions', version: EISENKU_SERVER_VERSION } })) || new Response('No encontrado', { status: 404 });
`,
  'functions/p/[[path]].js': HEAD('Cloudflare Pages Functions (solo se usan si eliminas _worker.js). Ruta: /p/*') + LIB_PROXY + `
const proxy = createProxy({});
export const onRequest = async ({ request }) => (await proxy(request)) || new Response('No encontrado', { status: 404 });
`,
  'functions/ai.js': HEAD('Cloudflare Pages Functions (solo se usan si eliminas _worker.js). Ruta: /ai') + LIB_AI + `
const ai = createAi();
export const onRequest = ({ request, env }) => ai(request, env);
`,
  'netlify/functions/proxy.mjs': HEAD('Netlify Functions. Rutas: /proxy y /p/*') + `import dns from 'node:dns';\n` + LIB_PROXY + NODE_DNS + `
const proxy = createProxy({ resolveGuard });
export default async (req, context) => (await proxy(req, { ip: context && context.ip, ping: { server: 'netlify', version: EISENKU_SERVER_VERSION } })) || new Response('No encontrado', { status: 404 });
export const config = { path: ['/proxy', '/p/*'] };
`,
  'netlify/functions/ai.mjs': HEAD('Netlify Functions. Ruta: /ai (configura AI_API_KEY en Site settings › Environment variables)') + LIB_AI + `
const ai = createAi();
export default async (req, context) => ai(req, process.env, { ip: context && context.ip });
export const config = { path: '/ai' };
`
};
for (const [f, src] of Object.entries(files)) {
  fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
  fs.writeFileSync(path.join(root, f), src);
  console.log('generado', f, (src.length / 1024).toFixed(1) + ' KB');
}

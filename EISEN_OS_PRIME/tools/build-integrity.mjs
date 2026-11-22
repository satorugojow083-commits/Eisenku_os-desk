// EISENKU OS 9.0 · Genera integrity.json con la huella SHA-256 de cada archivo que se sirve al navegador.
// Configuración › Actualizaciones › Integridad (y la app Centro de actualizaciones) compara estos valores
// con los archivos publicados para detectar copias incompletas o modificadas.
// Uso: node tools/build-integrity.mjs   (vuelve a ejecutarlo después de editar cualquier archivo de la web)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');   // funciona también en Windows (rutas con espacios)
// version.json no se incluye: el servidor local lo genera al vuelo (versión del servidor)
const INCLUDE = ['index.html', 'recovery.html', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'css', 'js', 'apps'];
const files = {};
const walk = rel => {
  const abs = path.join(root, rel), st = fs.statSync(abs);
  if (st.isDirectory()) { fs.readdirSync(abs).sort().forEach(n => walk(rel + '/' + n)); return; }
  if (/\.(js|mjs|css|html|json|svg|webmanifest|eisenapp|eisenplugin|png|ico|woff2?)$/i.test(rel)) files[rel] = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
};
INCLUDE.forEach(r => { if (fs.existsSync(path.join(root, r))) walk(r); });
const version = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
const out = { app: 'EISENKU OS', product: version.product || 'EISENKU OS', version: version.version, edition: version.edition, build: version.build, generated: new Date().toISOString(), algorithm: 'SHA-256', files };
fs.writeFileSync(path.join(root, 'integrity.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`integrity.json: ${Object.keys(files).length} archivos · versión ${version.version}`);

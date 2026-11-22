// EISENKU OS 9.0 · Genera los paquetes de idioma js/os9/i18n/<idioma>.js a partir de tools/i18n-core.txt
// y, si existen, de tools/i18n-extra/<idioma>.json ({ "texto en español": "traducción" }).
// Uso: node tools/build-i18n.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');   // funciona también en Windows (rutas con espacios)
const COLS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'zh-TW', 'ru', 'ar', 'hi', 'nl', 'tr', 'pl', 'uk', 'id', 'sv', 'ca'];
const src = fs.readFileSync(path.join(root, 'tools/i18n-core.txt'), 'utf8').split(/\r?\n/);
const packs = Object.fromEntries(COLS.slice(1).map(c => [c, {}]));
let n = 0, errors = 0;
src.forEach((line, i) => {
  if (!line.trim() || line.startsWith('#')) return;
  const cells = line.split('|').map(s => s.trim());
  if (cells.length !== COLS.length) { console.error(`Línea ${i + 1}: ${cells.length} columnas (se esperaban ${COLS.length})`); errors++; return; }
  const key = cells[0].replace(/\s+/g, ' ');
  COLS.slice(1).forEach((c, j) => { if (cells[j + 1]) packs[c][key] = cells[j + 1]; });
  n++;
});
const outDir = path.join(root, 'js/os9/i18n'); fs.mkdirSync(outDir, { recursive: true });
for (const [c, dict] of Object.entries(packs)) {
  const extra = path.join(root, 'tools/i18n-extra', c + '.json');
  if (fs.existsSync(extra)) { try { Object.assign(dict, JSON.parse(fs.readFileSync(extra, 'utf8'))); } catch (e) { console.error('JSON no válido en', extra, e.message); errors++; } }
  const body = `/* EISENKU OS 9.0 · Paquete de idioma «${c}» (generado por tools/build-i18n.mjs; no editar a mano) */\n(window.EISEN_I18N9_PACKS = window.EISEN_I18N9_PACKS || {})[${JSON.stringify(c)}] = ${JSON.stringify(dict, null, 0).replace(/<\//g, '<\\/')};\n`;
  fs.writeFileSync(path.join(outDir, c + '.js'), body);
}
console.log(`${n} textos · ${Object.keys(packs).length} idiomas generados en js/os9/i18n/${errors ? ' · ' + errors + ' errores' : ''}`);
process.exit(errors ? 1 : 0);

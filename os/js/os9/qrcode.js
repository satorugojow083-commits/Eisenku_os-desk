/* =====================================================================
   EISENKU OS 9.0 ENTERPRISE · Generador de códigos QR sin conexión
   Implementación propia del estándar ISO/IEC 18004 (modelo 2, versiones 1-40,
   niveles de corrección L/M/Q/H, modos numérico, alfanumérico y bytes UTF-8,
   elección automática de máscara). Basada en el algoritmo público de Project Nayuki.
   Los datos nunca salen del dispositivo.
   Uso: K.qr.encode(texto, 'M') → { size, version, ecl, mask, modules[y][x] }
        K.qr.svg(qr, { margin, dark, light }) · K.qr.canvas(qr, { scale, margin, dark, light })
   ===================================================================== */
(() => {
  'use strict';
  const K = window.EISENKU || (window.EISENKU = {});
  const ECL = { L: 0, M: 1, Q: 2, H: 3 }, FORMAT = [1, 0, 3, 2];
  const ECC_PER_BLOCK = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];
  const NUM_BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];
  const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  const bit = (x, i) => ((x >>> i) & 1) !== 0;
  const push = (bb, val, len) => { for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1); };

  const rawModules = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
  const dataCodewords = (v, e) => Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK[e][v] * NUM_BLOCKS[e][v];

  /* ---------- Reed-Solomon sobre GF(256) ---------- */
  const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z; };
  const divisor = deg => { const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1; for (let i = 0; i < deg; i++) { for (let j = 0; j < r.length; j++) { r[j] = mul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = mul(root, 2); } return r; };
  const remainder = (data, div) => { const r = div.map(() => 0); for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= mul(c, f); }); } return r; };

  /* ---------- Segmento de datos (un único modo, el más compacto posible) ---------- */
  function segment(text) {
    const bb = [];
    if (/^\d*$/.test(text)) {
      for (let i = 0; i < text.length;) { const n = Math.min(3, text.length - i); push(bb, parseInt(text.substr(i, n), 10), n * 3 + 1); i += n; }
      return { mode: 1, count: text.length, bits: bb, cc: [10, 12, 14] };
    }
    if (/^[0-9A-Z $%*+\-./:]*$/.test(text)) {
      let i = 0; for (; i + 2 <= text.length; i += 2) push(bb, ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11);
      if (i < text.length) push(bb, ALNUM.indexOf(text[i]), 6);
      return { mode: 2, count: text.length, bits: bb, cc: [9, 11, 13] };
    }
    const bytes = new TextEncoder().encode(text); bytes.forEach(b => push(bb, b, 8));
    return { mode: 4, count: bytes.length, bits: bb, cc: [8, 16, 16] };
  }
  const ccBits = (seg, v) => seg.cc[v < 10 ? 0 : v < 27 ? 1 : 2];

  function encode(text, ecl = 'M', o = {}) {
    let e = ECL[String(ecl).toUpperCase()] ?? 1;
    const seg = segment(String(text ?? ''));
    let v = Math.max(1, o.minVersion || 1), used;
    for (; ; v++) {
      used = 4 + ccBits(seg, v) + seg.bits.length;
      if (seg.count < (1 << ccBits(seg, v)) && used <= dataCodewords(v, e) * 8) break;
      if (v >= 40) throw new RangeError('El texto es demasiado largo para un código QR (máximo 2.953 bytes con corrección baja).');
    }
    if (o.boost !== false) for (let ne = e + 1; ne <= 3; ne++) if (used <= dataCodewords(v, ne) * 8) e = ne;   // más corrección si cabe sin crecer
    const cap = dataCodewords(v, e) * 8, bb = [];
    push(bb, seg.mode, 4); push(bb, seg.count, ccBits(seg, v)); bb.push(...seg.bits);
    push(bb, 0, Math.min(4, cap - bb.length)); push(bb, 0, (8 - bb.length % 8) % 8);
    for (let pad = 0xec; bb.length < cap; pad ^= 0xec ^ 0x11) push(bb, pad, 8);
    const data = new Array(bb.length / 8).fill(0); bb.forEach((b, i) => { data[i >>> 3] |= b << (7 - (i & 7)); });

    /* bloques con corrección de errores, intercalados */
    const nb = NUM_BLOCKS[e][v], el = ECC_PER_BLOCK[e][v], raw = Math.floor(rawModules(v) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), div = divisor(el), blocks = [];
    for (let i = 0, k = 0; i < nb; i++) { const d = data.slice(k, k + shortLen - el + (i < nShort ? 0 : 1)); k += d.length; const ec = remainder(d, div); if (i < nShort) d.push(0); blocks.push(d.concat(ec)); }
    const cw = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - el || j >= nShort) cw.push(b[i]); });

    /* matriz */
    const size = v * 4 + 17, M = [...Array(size)].map(() => new Array(size).fill(false)), FN = [...Array(size)].map(() => new Array(size).fill(false));
    const set = (x, y, d) => { M[y][x] = d; FN[y][x] = true; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy; if (xx >= 0 && xx < size && yy >= 0 && yy < size) set(xx, yy, d !== 2 && d !== 4); } };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    if (v > 1) {
      const n = Math.floor(v / 7) + 2, step = Math.floor((v * 8 + n * 3 + 5) / (n * 4 - 4)) * 2, pos = [6];
      for (let p = size - 7; pos.length < n; p -= step) pos.splice(1, 0, p);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
    const format = mask => {
      const d = FORMAT[e] << 3 | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = (d << 10 | r) ^ 0x5412;
      for (let i = 0; i <= 5; i++) set(8, i, bit(b, i));
      set(8, 7, bit(b, 6)); set(8, 8, bit(b, 7)); set(7, 8, bit(b, 8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(b, i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(b, i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(b, i));
      set(8, size - 8, true);
    };
    format(0);
    if (v >= 7) {
      let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const b = v << 12 | r;
      for (let i = 0; i < 18; i++) { const c = bit(b, i), a = size - 11 + i % 3, bb2 = Math.floor(i / 3); set(a, bb2, c); set(bb2, a, c); }
    }
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!FN[y][x] && i < cw.length * 8) { M[y][x] = bit(cw[i >>> 3], 7 - (i & 7)); i++; }
      }
    }
    const applyMask = m => {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        let inv;
        switch (m) {
          case 0: inv = (x + y) % 2 === 0; break; case 1: inv = y % 2 === 0; break; case 2: inv = x % 3 === 0; break; case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break; case 5: inv = x * y % 2 + x * y % 3 === 0; break;
          case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break; default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
        }
        if (!FN[y][x] && inv) M[y][x] = !M[y][x];
      }
    };
    const penalty = () => {
      let r = 0;
      const addH = (len, h) => { if (h[0] === 0) len += size; h.pop(); h.unshift(len); };
      const count = h => { const n = h[1], core = n > 0 && h[2] === n && h[3] === n * 3 && h[4] === n && h[5] === n; return (core && h[0] >= n * 4 && h[6] >= n ? 1 : 0) + (core && h[6] >= n * 4 && h[0] >= n ? 1 : 0); };
      const line = get => {
        let color = false, run = 0; const h = [0, 0, 0, 0, 0, 0, 0];
        for (let k = 0; k < size; k++) {
          if (get(k) === color) { run++; if (run === 5) r += 3; else if (run > 5) r++; }
          else { addH(run, h); if (!color) r += count(h) * 40; color = get(k); run = 1; }
        }
        if (color) { addH(run, h); run = 0; }
        run += size; addH(run, h); r += count(h) * 40;
      };
      for (let y = 0; y < size; y++) line(x => M[y][x]);
      for (let x = 0; x < size; x++) line(y => M[y][x]);
      for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) r += 3; }
      let dark = 0; M.forEach(row => row.forEach(c => { if (c) dark++; }));
      const total = size * size; r += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
      return r;
    };
    let best = o.mask >= 0 && o.mask < 8 ? o.mask : -1;
    if (best < 0) { let min = Infinity; for (let m = 0; m < 8; m++) { applyMask(m); format(m); const p = penalty(); if (p < min) { min = p; best = m; } applyMask(m); } }
    applyMask(best); format(best);
    return { size, version: v, ecl: 'LMQH'[e], mask: best, modules: M };
  }

  function svg(qr, o = {}) {
    const m = o.margin ?? 4, n = qr.size + m * 2, dark = o.dark || '#000', light = o.light || '#fff'; let d = '';
    qr.modules.forEach((row, y) => row.forEach((c, x) => { if (c) d += `M${x + m},${y + m}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${o.px || n * 8}" height="${o.px || n * 8}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
  }
  function canvas(qr, o = {}) {
    const m = o.margin ?? 4, s = Math.max(1, Math.floor(o.scale || 8)), n = (qr.size + m * 2) * s, c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'); g.fillStyle = o.light || '#fff'; g.fillRect(0, 0, n, n); g.fillStyle = o.dark || '#000';
    qr.modules.forEach((row, y) => row.forEach((on, x) => { if (on) g.fillRect((x + m) * s, (y + m) * s, s, s); }));
    return c;
  }
  // Texto de una red Wi-Fi según el formato estándar (escapa \ ; , : ")
  const wifiEsc = s => String(s || '').replace(/([\\;,:"])/g, '\\$1');
  const wifi = ({ ssid, password, type = 'WPA', hidden }) => `WIFI:T:${type === 'nopass' ? 'nopass' : type};S:${wifiEsc(ssid)};${type === 'nopass' ? '' : 'P:' + wifiEsc(password) + ';'}${hidden ? 'H:true;' : ''};`;
  const vcEsc = s => String(s || '').replace(/([\\;,])/g, '\\$1').replace(/\r?\n/g, '\\n');
  const vcard = c => ['BEGIN:VCARD', 'VERSION:3.0', `N:${vcEsc(c.last)};${vcEsc(c.first)};;;`, `FN:${vcEsc([c.first, c.last].filter(Boolean).join(' '))}`, c.org ? `ORG:${vcEsc(c.org)}` : '', c.tel ? `TEL;TYPE=CELL:${vcEsc(c.tel)}` : '', c.email ? `EMAIL:${vcEsc(c.email)}` : '', c.url ? `URL:${vcEsc(c.url)}` : '', 'END:VCARD'].filter(Boolean).join('\n');
  K.qr = { encode, svg, canvas, wifi, vcard };
})();

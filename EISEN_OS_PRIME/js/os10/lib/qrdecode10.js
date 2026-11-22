/* =====================================================================
   EISENKU OS 10.0 · Lector de códigos QR propio (sin dependencias)
   Se usa cuando el navegador no incluye BarcodeDetector (Chrome y Edge en Windows y Linux, Firefox…).
   Implementación de ISO/IEC 18004 (modelo 2, versiones 1-40):
     binarización adaptativa → patrones de búsqueda (1:1:3:1:1) → patrón de alineación →
     transformación de perspectiva → información de formato y versión (BCH) → desenmascarado →
     lectura en zigzag → desentrelazado de bloques → corrección Reed-Solomon (Berlekamp-Massey,
     Chien y Forney sobre GF(256)) → segmentos numérico, alfanumérico, bytes (UTF-8/ISO-8859-1/ECI) y kanji.
   Todo se procesa en el dispositivo.
   Uso: K.qrDecode(imageData) → { text, version, ecl, bytes } | null
        K.qrDecodeBlob(blob) → Promise<texto|null> · K.qrScan({ title }) → Promise<texto|null> (cámara o imagen)
   ===================================================================== */
(() => {
  'use strict';
  const K = window.EISENKU || (window.EISENKU = {});

  /* ---------- Tablas del estándar (mismas que el generador js/os9/qrcode.js) ---------- */
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
  const ECL_NAME = ['L', 'M', 'Q', 'H'], ECL_FMT = [1, 0, 3, 2];   // bits de formato de cada nivel
  const rawModules = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
  const alignPos = v => { if (v === 1) return []; const n = Math.floor(v / 7) + 2, size = v * 4 + 17, step = Math.floor((v * 8 + n * 3 + 5) / (n * 4 - 4)) * 2, r = [6]; for (let p = size - 7; r.length < n; p -= step) r.splice(1, 0, p); return r; };
  const FORMATS = []; for (let e = 0; e < 4; e++) for (let m = 0; m < 8; m++) { const d = ECL_FMT[e] << 3 | m; let rem = d; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537); FORMATS.push({ code: ((d << 10) | rem) ^ 0x5412, e, m }); }
  const VERSIONS = []; for (let v = 7; v <= 40; v++) { let rem = v; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25); VERSIONS.push({ code: (v << 12) | rem, v }); }
  const popcnt = x => { let n = 0; while (x) { x &= x - 1; n++; } return n; };
  const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0, (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];

  /* ---------- GF(256) y Reed-Solomon ---------- */
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; }
  const gmul = (a, b) => a && b ? EXP[LOG[a] + LOG[b]] : 0;
  const gdiv = (a, b) => { if (!b) throw new Error('div0'); return a ? EXP[(LOG[a] + 255 - LOG[b]) % 255] : 0; };
  const gpow = e => EXP[((e % 255) + 255) % 255];
  const peval = (p, x) => { let y = 0; for (let i = p.length - 1; i >= 0; i--) y = gmul(y, x) ^ p[i]; return y; };   // p con grado bajo primero
  // corrige en el sitio el bloque (coeficiente de mayor grado primero); devuelve nº de errores o -1
  function rsCorrect(cw, nsym) {
    const n = cw.length, S = new Array(nsym); let any = false;
    for (let i = 0; i < nsym; i++) { let s = 0; const a = gpow(i); for (let j = 0; j < n; j++) s = gmul(s, a) ^ cw[j]; S[i] = s; if (s) any = true; }
    if (!any) return 0;
    let C = [1], B = [1], L = 0, m = 1, bb = 1;
    for (let r = 0; r < nsym; r++) {
      let d = S[r]; for (let i = 1; i <= L; i++) d ^= gmul(C[i] || 0, S[r - i]);
      if (d === 0) { m++; continue; }
      const coef = gdiv(d, bb), T = C.slice(), need = B.length + m; while (C.length < need) C.push(0);
      for (let i = 0; i < B.length; i++) C[i + m] ^= gmul(coef, B[i]);
      if (2 * L <= r) { L = r + 1 - L; B = T; bb = d; m = 1; } else m++;
    }
    while (C.length > 1 && C[C.length - 1] === 0) C.pop();
    if (C.length - 1 !== L || L * 2 > nsym) return -1;
    const pos = []; for (let k = 0; k < n; k++) { const xinv = gpow(-(n - 1 - k)); if (peval(C, xinv) === 0) pos.push(k); }
    if (pos.length !== L) return -1;
    const Om = new Array(nsym).fill(0); for (let i = 0; i < nsym; i++) for (let j = 0; j < C.length && i + j < nsym; j++) Om[i + j] ^= gmul(S[i], C[j]);
    const dC = []; for (let i = 1; i < C.length; i += 2) { dC[i - 1] = C[i]; } for (let i = 0; i < dC.length; i++) if (dC[i] === undefined) dC[i] = 0;
    for (const k of pos) { const X = gpow(n - 1 - k), xinv = gpow(-(n - 1 - k)), den = peval(dC, xinv); if (!den) return -1; cw[k] ^= gmul(X, gdiv(peval(Om, xinv), den)); }
    for (let i = 0; i < nsym; i++) { let s = 0; const a = gpow(i); for (let j = 0; j < n; j++) s = gmul(s, a) ^ cw[j]; if (s) return -1; }
    return L;
  }

  /* ---------- Binarización adaptativa por bloques ---------- */
  function binarize(img, invert) {
    const { width: w, height: h, data } = img, lum = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < lum.length; i++, p += 4) lum[i] = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8;
    const B = 8, bw = Math.ceil(w / B), bh = Math.ceil(h / B), avg = new Float32Array(bw * bh);
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      let mn = 255, mx = 0, sum = 0, n = 0;
      for (let y = by * B; y < Math.min(h, by * B + B); y++) for (let x = bx * B; x < Math.min(w, bx * B + B); x++) { const v = lum[y * w + x]; sum += v; n++; if (v < mn) mn = v; if (v > mx) mx = v; }
      let a = sum / n;
      if (mx - mn <= 24) { a = mn / 2; if (by > 0 && bx > 0) { const nb = (avg[(by - 1) * bw + bx] + 2 * avg[by * bw + bx - 1] + avg[(by - 1) * bw + bx - 1]) / 4; if (mn < nb) a = nb; } }
      avg[by * bw + bx] = a;
    }
    const bin = new Uint8Array(w * h);
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      const cx = Math.min(Math.max(bx, 2), bw - 3), cy = Math.min(Math.max(by, 2), bh - 3); let s = 0, n = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const yy = cy + dy, xx = cx + dx; if (yy >= 0 && yy < bh && xx >= 0 && xx < bw) { s += avg[yy * bw + xx]; n++; } }
      const t = s / n;
      for (let y = by * B; y < Math.min(h, by * B + B); y++) for (let x = bx * B; x < Math.min(w, bx * B + B); x++) { const d = lum[y * w + x] <= t ? 1 : 0; bin[y * w + x] = invert ? 1 - d : d; }
    }
    return { bin, w, h };
  }

  /* ---------- Patrones de búsqueda ---------- */
  const crossOK = c => { const t = c[0] + c[1] + c[2] + c[3] + c[4]; if (t < 7) return false; const ms = t / 7, v = ms / 2; return Math.abs(ms - c[0]) < v && Math.abs(ms - c[1]) < v && Math.abs(3 * ms - c[2]) < 3 * v && Math.abs(ms - c[3]) < v && Math.abs(ms - c[4]) < v; };
  const centerEnd = (c, end) => end - c[4] - c[3] - c[2] / 2;
  function findFinders(B) {
    const { bin, w, h } = B, at = (x, y) => bin[y * w + x] === 1, cands = [];
    const crossV = (si, cj, maxC, tot) => { const c = [0, 0, 0, 0, 0]; let i = si; while (i >= 0 && at(cj, i)) { c[2]++; i--; } if (i < 0) return NaN; while (i >= 0 && !at(cj, i) && c[1] <= maxC) { c[1]++; i--; } if (i < 0 || c[1] > maxC) return NaN; while (i >= 0 && at(cj, i) && c[0] <= maxC) { c[0]++; i--; } if (c[0] > maxC) return NaN; i = si + 1; while (i < h && at(cj, i)) { c[2]++; i++; } if (i === h) return NaN; while (i < h && !at(cj, i) && c[3] < maxC) { c[3]++; i++; } if (i === h || c[3] >= maxC) return NaN; while (i < h && at(cj, i) && c[4] < maxC) { c[4]++; i++; } if (c[4] >= maxC) return NaN; const t = c[0] + c[1] + c[2] + c[3] + c[4]; if (5 * Math.abs(t - tot) >= 2 * tot) return NaN; return crossOK(c) ? centerEnd(c, i) : NaN; };
    const crossH = (sj, ci, maxC, tot) => { const c = [0, 0, 0, 0, 0]; let j = sj; while (j >= 0 && at(j, ci)) { c[2]++; j--; } if (j < 0) return NaN; while (j >= 0 && !at(j, ci) && c[1] <= maxC) { c[1]++; j--; } if (j < 0 || c[1] > maxC) return NaN; while (j >= 0 && at(j, ci) && c[0] <= maxC) { c[0]++; j--; } if (c[0] > maxC) return NaN; j = sj + 1; while (j < w && at(j, ci)) { c[2]++; j++; } if (j === w) return NaN; while (j < w && !at(j, ci) && c[3] < maxC) { c[3]++; j++; } if (j === w || c[3] >= maxC) return NaN; while (j < w && at(j, ci) && c[4] < maxC) { c[4]++; j++; } if (c[4] >= maxC) return NaN; const t = c[0] + c[1] + c[2] + c[3] + c[4]; if (5 * Math.abs(t - tot) >= tot) return NaN; return crossOK(c) ? centerEnd(c, j) : NaN; };
    const handle = (c, i, j) => {
      const tot = c[0] + c[1] + c[2] + c[3] + c[4]; let cj = centerEnd(c, j); const ci = crossV(i, Math.floor(cj), c[2], tot); if (isNaN(ci)) return false;
      cj = crossH(Math.floor(cj), Math.floor(ci), c[2], tot); if (isNaN(cj)) return false;
      const ms = tot / 7;
      for (const p of cands) if (Math.abs(ci - p.y) <= ms && Math.abs(cj - p.x) <= ms && (Math.abs(ms - p.s) <= 1 || Math.abs(ms - p.s) <= p.s)) { const n = p.n + 1; p.x = (p.x * p.n + cj) / n; p.y = (p.y * p.n + ci) / n; p.s = (p.s * p.n + ms) / n; p.n = n; return true; }
      cands.push({ x: cj, y: ci, s: ms, n: 1 }); return true;
    };
    const skip = Math.max(1, Math.floor(3 * h / (4 * 97)));
    for (let i = skip - 1; i < h; i += skip) {
      const c = [0, 0, 0, 0, 0]; let st = 0;
      for (let j = 0; j < w; j++) {
        if (at(j, i)) { if (st & 1) st++; c[st]++; }
        else if (!(st & 1)) { if (st === 4) { if (crossOK(c) && handle(c, i, j)) { c.fill(0); st = 0; } else { c[0] = c[2]; c[1] = c[3]; c[2] = c[4]; c[3] = 1; c[4] = 0; st = 3; } } else c[++st]++; }
        else c[st]++;
      }
      if (st === 4 && crossOK(c)) handle(c, i, w);
    }
    return cands;
  }
  function pickTriples(cands) {
    const P = cands.slice().sort((a, b) => b.n - a.n).slice(0, 14), out = [], d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) for (let c = b + 1; c < P.length; c++) {
      const T = [P[a], P[b], P[c]], sz = T.map(p => p.s), mx = Math.max(...sz), mn = Math.min(...sz); if (mx / mn > 1.7) continue;
      const dab = d(T[0], T[1]), dac = d(T[0], T[2]), dbc = d(T[1], T[2]); let tl, o1, o2, hyp, s1, s2;
      if (dbc >= dab && dbc >= dac) { tl = T[0]; o1 = T[1]; o2 = T[2]; hyp = dbc; s1 = dab; s2 = dac; } else if (dac >= dab) { tl = T[1]; o1 = T[0]; o2 = T[2]; hyp = dac; s1 = dab; s2 = dbc; } else { tl = T[2]; o1 = T[0]; o2 = T[1]; hyp = dab; s1 = dac; s2 = dbc; }
      const ratio = Math.max(s1, s2) / Math.min(s1, s2); if (ratio > 1.8) continue;
      const ang = Math.abs(hyp * hyp - (s1 * s1 + s2 * s2)) / (hyp * hyp); if (ang > 0.45) continue;
      const ms = (T[0].s + T[1].s + T[2].s) / 3; if ((s1 + s2) / 2 / ms < 10) continue;
      // orientación: con y hacia abajo, (TR − TL) × (BL − TL) > 0
      let tr = o1, bl = o2; if ((tr.x - tl.x) * (bl.y - tl.y) - (tr.y - tl.y) * (bl.x - tl.x) < 0) { tr = o2; bl = o1; }
      out.push({ tl, tr, bl, ms, score: ang + (ratio - 1) + (mx / mn - 1) - 0.03 * Math.min(6, tl.n + tr.n + bl.n) });
    }
    return out.sort((a, b) => a.score - b.score).slice(0, 4);
  }

  /* ---------- Patrón de alineación y perspectiva ---------- */
  // candidatos a patrón de alineación alrededor de la posición estimada, ordenados por parecido (5×5) y distancia
  function findAlign(B, ex, ey, ms, ux, uy) {
    const { bin, w, h } = B, at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && bin[y * w + x] === 1;
    const near = (v, t) => v >= t * 0.5 && v <= t * 1.7, r = Math.ceil(ms * 14), found = [];
    const x0 = Math.max(0, Math.floor(ex - r)), x1 = Math.min(w - 1, Math.ceil(ex + r)), y0 = Math.max(0, Math.floor(ey - r)), y1 = Math.min(h - 1, Math.ceil(ey + r));
    for (let y = y0; y <= y1; y++) {
      const runs = []; let x = x0; while (x <= x1) { const c = at(x, y) ? 1 : 0, s0 = x; while (x <= x1 && (at(x, y) ? 1 : 0) === c) x++; runs.push([c, s0, x - s0]); }
      for (let i = 2; i + 2 < runs.length; i++) {
        const R = runs; if (R[i][0] !== 1 || !near(R[i][2], ms) || !near(R[i - 1][2], ms) || !near(R[i + 1][2], ms) || R[i - 2][2] < ms * 0.5 || R[i + 2][2] < ms * 0.5) continue;
        const cx = R[i][1] + R[i][2] / 2, ix = Math.floor(cx);
        let u = y; while (u >= 0 && at(ix, u)) u--; let dn = y; while (dn < h && at(ix, dn)) dn++; const cl = dn - u - 1; if (!near(cl, ms)) continue;
        let a = u, la = 0; while (a >= 0 && !at(ix, a)) { a--; la++; } let bd = dn, lb = 0; while (bd < h && !at(ix, bd)) { bd++; lb++; } if (!near(la, ms) || !near(lb, ms)) continue;
        const cy = (u + dn) / 2; if (found.some(f => Math.abs(f.x - cx) < ms * 0.8 && Math.abs(f.y - cy) < ms * 0.8)) continue;
        // parecido con el patrón 5×5 (anillo oscuro, anillo claro, centro oscuro) usando la orientación del código
        const lm = (R[i][2] + cl) / 2 / ms; let sc = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const px = Math.floor(cx + (dx * ux[0] + dy * uy[0]) * lm), py = Math.floor(cy + (dx * ux[1] + dy * uy[1]) * lm), want = Math.max(Math.abs(dx), Math.abs(dy)) !== 1; if (at(px, py) === want) sc++; }
        if (sc >= 21) found.push({ x: cx, y: cy, d: Math.hypot(cx - ex, cy - ey), sc });
      }
    }
    return found.sort((p, q) => (q.sc - p.sc) || (p.d - q.d)).slice(0, 3);
  }
  function homography(src, dst) {
    const A = [], bvec = [];
    for (let i = 0; i < 4; i++) { const [u, v] = src[i], [x, y] = dst[i]; A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); bvec.push(x); A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); bvec.push(y); }
    for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; if (Math.abs(A[p][c]) < 1e-12) return null; [A[c], A[p]] = [A[p], A[c]]; [bvec[c], bvec[p]] = [bvec[p], bvec[c]]; for (let r = 0; r < 8; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; if (!f) continue; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; bvec[r] -= f * bvec[c]; } }
    const H = bvec.map((v, i) => v / A[i][i]);
    return (u, v) => { const z = H[6] * u + H[7] * v + 1; return [(H[0] * u + H[1] * v + H[2]) / z, (H[3] * u + H[4] * v + H[5]) / z]; };
  }
  function sample(B, T, dim, align) {
    const { bin, w, h } = B, br = align ? [dim - 6.5, dim - 6.5] : [dim - 3.5, dim - 3.5], brImg = align ? [align.x, align.y] : [T.tr.x + T.bl.x - T.tl.x, T.tr.y + T.bl.y - T.tl.y];
    const f = homography([[3.5, 3.5], [dim - 3.5, 3.5], [3.5, dim - 3.5], br], [[T.tl.x, T.tl.y], [T.tr.x, T.tr.y], [T.bl.x, T.bl.y], brImg]); if (!f) return null;
    const M = []; for (let y = 0; y < dim; y++) { const row = new Uint8Array(dim); for (let x = 0; x < dim; x++) { const [px, py] = f(x + 0.5, y + 0.5), ix = Math.floor(px), iy = Math.floor(py); row[x] = ix >= 0 && iy >= 0 && ix < w && iy < h ? bin[iy * w + ix] : 0; } M.push(row); }
    return M;
  }

  /* ---------- Matriz → datos ---------- */
  function readFormat(M) {
    const n = M.length, g = (x, y) => M[y][x]; let a = 0, b = 0;
    for (let i = 0; i <= 5; i++) a |= g(8, i) << i; a |= g(8, 7) << 6; a |= g(8, 8) << 7; a |= g(7, 8) << 8; for (let i = 9; i < 15; i++) a |= g(14 - i, 8) << i;
    for (let i = 0; i < 8; i++) b |= g(n - 1 - i, 8) << i; for (let i = 8; i < 15; i++) b |= g(8, n - 15 + i) << i;
    let best = null; for (const f of FORMATS) for (const v of [a, b]) { const d = popcnt(f.code ^ v); if (!best || d < best.d) best = { d, e: f.e, m: f.m }; }
    return best && best.d <= 3 ? best : null;
  }
  function readVersion(M) {
    const n = M.length; let a = 0, b = 0; for (let i = 0; i < 18; i++) { a |= M[Math.floor(i / 3)][n - 11 + i % 3] << i; b |= M[n - 11 + i % 3][Math.floor(i / 3)] << i; }
    let best = null; for (const t of VERSIONS) for (const v of [a, b]) { const d = popcnt(t.code ^ v); if (!best || d < best.d) best = { d, v: t.v }; }
    return best && best.d <= 3 ? best.v : null;
  }
  function funcMask(v) {
    const n = v * 4 + 17, F = Array.from({ length: n }, () => new Uint8Array(n)), rect = (x0, y0, ww, hh) => { for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + ww; x++) if (x >= 0 && y >= 0 && x < n && y < n) F[y][x] = 1; };
    rect(0, 0, 9, 9); rect(n - 8, 0, 8, 9); rect(0, n - 8, 9, 8); rect(6, 0, 1, n); rect(0, 6, n, 1);
    const ap = alignPos(v), L = ap.length; for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) { if ((i === 0 && j === 0) || (i === 0 && j === L - 1) || (i === L - 1 && j === 0)) continue; rect(ap[i] - 2, ap[j] - 2, 5, 5); }
    if (v >= 7) { rect(n - 11, 0, 3, 6); rect(0, n - 11, 6, 3); }
    return F;
  }
  function decodeMatrix(M) {
    const n = M.length; if (n < 21 || (n - 17) % 4) return null;
    const fmt = readFormat(M); if (!fmt) return null;
    let v = (n - 17) / 4; if (v >= 7) { const vv = readVersion(M); if (vv && vv !== v) return null; }
    const F = funcMask(v), mask = MASKS[fmt.m], bits = [];
    for (let right = n - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? n - 1 - vert : vert; if (!F[y][x]) bits.push(M[y][x] ^ (mask(x, y) ? 1 : 0)); } }
    const raw = Math.floor(rawModules(v) / 8), cw = new Uint8Array(raw); for (let i = 0; i < raw; i++) { let b = 0; for (let k = 0; k < 8; k++) b = (b << 1) | (bits[i * 8 + k] || 0); cw[i] = b; }
    const e = fmt.e, nb = NUM_BLOCKS[e][v], ecc = ECC_PER_BLOCK[e][v], shortLen = Math.floor(raw / nb), nShort = nb - raw % nb;
    const blocks = Array.from({ length: nb }, (_, j) => ({ d: shortLen - ecc + (j >= nShort ? 1 : 0), b: [] })), maxD = shortLen - ecc + 1; let p = 0;
    for (let i = 0; i < maxD; i++) for (const bl of blocks) if (i < bl.d) bl.b.push(cw[p++]);
    for (let i = 0; i < ecc; i++) for (const bl of blocks) bl.b.push(cw[p++]);
    const data = []; let fixed = 0;
    for (const bl of blocks) { const r = rsCorrect(bl.b, ecc); if (r < 0) return null; fixed += r; for (let i = 0; i < bl.d; i++) data.push(bl.b[i]); }
    const out = parseData(data, v); if (out == null) return null;
    return { text: out.text, bytes: out.bytes, version: v, ecl: ECL_NAME[e], errors: fixed };
  }
  const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  function parseData(data, v) {
    let pos = 0; const len = data.length * 8, rd = n => { if (pos + n > len) throw new Error('eof'); let x = 0; for (let i = 0; i < n; i++, pos++) x = (x << 1) | ((data[pos >> 3] >> (7 - (pos & 7))) & 1); return x; };
    const g = v < 10 ? 0 : v < 27 ? 1 : 2; let text = '', eci = null; const allBytes = [];
    const dec = (bytes, enc) => { const u8 = new Uint8Array(bytes); const tryDec = l => { try { return new TextDecoder(l, { fatal: true }).decode(u8); } catch { return null; } }; if (enc === 'shift_jis') return tryDec('shift_jis') || tryDec('utf-8') || tryDec('iso-8859-1'); if (enc === 'iso-8859-1') return tryDec('iso-8859-1'); return tryDec('utf-8') || tryDec('iso-8859-1') || String.fromCharCode(...u8); };
    try {
      while (pos + 4 <= len) {
        const mode = rd(4); if (mode === 0) break;
        if (mode === 7) { const a = rd(8); eci = (a & 0x80) === 0 ? a : (a & 0xC0) === 0x80 ? ((a & 0x3F) << 8) | rd(8) : ((a & 0x1F) << 16) | rd(16); continue; }
        if (mode === 3) { rd(16); continue; } if (mode === 5) continue; if (mode === 9) { rd(8); continue; }
        if (mode === 1) { let n = rd([10, 12, 14][g]); while (n >= 3) { text += String(rd(10)).padStart(3, '0'); n -= 3; } if (n === 2) text += String(rd(7)).padStart(2, '0'); else if (n === 1) text += String(rd(4)); }
        else if (mode === 2) { let n = rd([9, 11, 13][g]); while (n >= 2) { const x = rd(11); text += ALNUM[Math.floor(x / 45)] + ALNUM[x % 45]; n -= 2; } if (n === 1) text += ALNUM[rd(6)]; }
        else if (mode === 4) { const n = rd([8, 16, 16][g]), b = []; for (let i = 0; i < n; i++) b.push(rd(8)); allBytes.push(...b); text += dec(b, eci === 20 ? 'shift_jis' : eci === 3 || eci === 1 ? 'iso-8859-1' : 'utf-8'); }
        else if (mode === 8) { const n = rd([8, 10, 12][g]), b = []; for (let i = 0; i < n; i++) { const x = rd(13); let c = (Math.floor(x / 0xC0) << 8) | (x % 0xC0); c += c + 0x8140 <= 0x9FFC ? 0x8140 : 0xC140; b.push(c >> 8, c & 0xFF); } text += dec(b, 'shift_jis'); }
        else return null;
      }
    } catch { if (!text) return null; }
    return { text, bytes: allBytes };
  }

  /* ---------- Tamaño de módulo medido en la dirección real (giro, inclinación y perspectiva) ---------- */
  function bwbRun(B, fx, fy, tx, ty) {
    const { bin, w, h } = B, steep = Math.abs(ty - fy) > Math.abs(tx - fx); if (steep) { [fx, fy] = [fy, fx]; [tx, ty] = [ty, tx]; }
    const dx = Math.abs(tx - fx), dy = Math.abs(ty - fy), xs = fx < tx ? 1 : -1, ys = fy < ty ? 1 : -1; let err = -dx / 2, st = 0;
    for (let x = fx, y = fy; x !== tx + xs; x += xs) {
      const rx = steep ? y : x, ry = steep ? x : y; if (rx < 0 || ry < 0 || rx >= w || ry >= h) break;
      if ((st === 1) === (bin[ry * w + rx] === 1)) { if (st === 2) return Math.hypot(x - fx, y - fy); st++; }
      err += dy; if (err > 0) { if (y === ty) break; y += ys; err -= dx; }
    }
    return st === 2 ? Math.hypot(tx + xs - fx, ty - fy) : NaN;
  }
  function bwbBoth(B, fx, fy, tx, ty) {
    fx = Math.floor(fx); fy = Math.floor(fy); tx = Math.floor(tx); ty = Math.floor(ty);
    let r = bwbRun(B, fx, fy, tx, ty), sc = 1, ox = fx - (tx - fx);
    if (ox < 0) { sc = fx / (fx - ox); ox = 0; } else if (ox >= B.w) { sc = (B.w - 1 - fx) / (ox - fx); ox = B.w - 1; }
    let oy = Math.floor(fy - (ty - fy) * sc); sc = 1;
    if (oy < 0) { sc = fy / (fy - oy); oy = 0; } else if (oy >= B.h) { sc = (B.h - 1 - fy) / (oy - fy); oy = B.h - 1; }
    ox = Math.floor(fx + (ox - fx) * sc);
    r += bwbRun(B, fx, fy, ox, oy); return r - 1;
  }
  const moduleOneWay = (B, p, o) => { const a = bwbBoth(B, p.x, p.y, o.x, o.y), b = bwbBoth(B, o.x, o.y, p.x, p.y); if (isNaN(a)) return b / 7; if (isNaN(b)) return a / 7; return (a + b) / 14; };

  /* ---------- API ---------- */
  function decodeBin(B) {
    const triples = pickTriples(findFinders(B));
    for (const T of triples) {
      const d1 = Math.hypot(T.tr.x - T.tl.x, T.tr.y - T.tl.y), d2 = Math.hypot(T.bl.x - T.tl.x, T.bl.y - T.tl.y);
      let m1 = moduleOneWay(B, T.tl, T.tr), m2 = moduleOneWay(B, T.tl, T.bl); if (!(m1 > 0)) m1 = T.ms; if (!(m2 > 0)) m2 = T.ms; T.ms = (m1 + m2) / 2;
      const est = Math.round((Math.round(d1 / m1) + Math.round(d2 / m2)) / 2) + 7;
      const dims = []; for (const dd of [0, -4, 4, -8, 8]) { let dim = est + dd; const r = (dim - 17) % 4; dim = r === 0 ? dim : dim + (r <= 2 ? -r : 4 - r); if (dim >= 21 && dim <= 177 && !dims.includes(dim)) dims.push(dim); }
      for (const dim of dims) {
        let al = []; if (dim > 21) { const brx = T.tr.x + T.bl.x - T.tl.x, bry = T.tr.y + T.bl.y - T.tl.y, k = 1 - 3 / (dim - 7), n7 = dim - 7; al = findAlign(B, T.tl.x + k * (brx - T.tl.x), T.tl.y + k * (bry - T.tl.y), T.ms, [(T.tr.x - T.tl.x) / n7, (T.tr.y - T.tl.y) / n7], [(T.bl.x - T.tl.x) / n7, (T.bl.y - T.tl.y) / n7]); }
        for (const a of al.concat([null])) {
          const M = sample(B, T, dim, a); if (!M) continue;
          let r = decodeMatrix(M); if (r) return r;
          const Mt = M.map((row, y) => Uint8Array.from(row, (_, x) => M[x][y])); r = decodeMatrix(Mt); if (r) return Object.assign(r, { mirrored: true });
        }
      }
    }
    return null;
  }
  K.qrDecode = img => { if (!img || !img.width) return null; return decodeBin(binarize(img, false)) || decodeBin(binarize(img, true)); };
  K.qrDecodeMatrix = decodeMatrix; K.qrRS = rsCorrect; K._qrIn = { binarize, findFinders, pickTriples, findAlign, sample, moduleOneWay };   // para pruebas
  const toCanvas = (src, maxW) => { const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height, s = Math.min(1, maxW / Math.max(sw, sh)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sw * s)); c.height = Math.max(1, Math.round(sh * s)); const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.drawImage(src, 0, 0, c.width, c.height); return c; };
  async function decodeSource(src, sizes = [1000, 640, 1600]) {
    if ('BarcodeDetector' in window) { try { const r = await new window.BarcodeDetector({ formats: ['qr_code'] }).detect(src); if (r[0]) return r[0].rawValue; } catch { /* usa el decodificador propio */ } }
    for (const s of sizes) { const c = toCanvas(src, s), r = K.qrDecode(c.getContext('2d').getImageData(0, 0, c.width, c.height)); if (r) return r.text; }
    return null;
  }
  K.qrDecodeBlob = async blob => { const bmp = await createImageBitmap(blob); try { return await decodeSource(bmp); } finally { if (bmp.close) bmp.close(); } };
  K.qrScan = (o = {}) => new Promise(resolve => {
    const E = window.EISEN, esc = E.esc, tr = K.tr || (s => s);
    const ov = document.createElement('div'); ov.className = 'eis-modal';
    ov.innerHTML = `<div class="eis-modal-card s10-scan" role="dialog" aria-label="${esc(tr('Leer código QR'))}"><h3>${esc(o.title || tr('Leer código QR'))}</h3><div class="s10-scan-v"><video playsinline muted></video><i class="s10-scan-f"></i></div><p class="k9-small k9-muted" data-st>${esc(tr('Iniciando la cámara…'))}</p><div class="eis-modal-btns"><button type="button" class="btn-secondary" data-img>${esc(tr('Elegir imagen…'))}</button><button type="button" class="btn-secondary" data-x>${esc(tr('Cancelar'))}</button></div></div>`;
    document.body.appendChild(ov);
    const vd = ov.querySelector('video'), st = ov.querySelector('[data-st]'); let stream = null, timer = 0, done = false, busy = false;
    const finish = v => { if (done) return; done = true; clearInterval(timer); if (stream) stream.getTracks().forEach(t => t.stop()); ov.remove(); resolve(v); };
    ov.querySelector('[data-x]').onclick = () => finish(null);
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') finish(null); });
    ov.querySelector('[data-img]').onclick = async () => {
      let blob = null; if (K.u10 && K.u10.pickBlob) { const f = await K.u10.pickBlob({ title: tr('Imagen con un código QR'), accept: x => /^image\//.test(x.type || '') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(x.name), deviceAccept: 'image/*' }); blob = f && f.blob; }
      if (!blob) return; st.textContent = tr('Leyendo la imagen…'); try { const t = await K.qrDecodeBlob(blob); if (t) finish(t); else st.textContent = tr('No se encontró ningún código QR en la imagen.'); } catch { st.textContent = tr('No se pudo leer la imagen.'); }
    };
    (async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { st.textContent = tr('No hay cámara disponible: elige una imagen.'); return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } }); } catch { st.textContent = tr('No se pudo usar la cámara: elige una imagen.'); return; }
      if (done) { stream.getTracks().forEach(t => t.stop()); return; }
      vd.srcObject = stream; try { await vd.play(); } catch { /* reproducción automática */ }
      st.textContent = tr('Apunta la cámara al código QR.') + ('BarcodeDetector' in window ? '' : ' ' + tr('(lector propio de EISENKU)'));
      timer = setInterval(async () => { if (busy || done || !vd.videoWidth) return; busy = true; try { const t = await decodeSource(vd, [720]); if (t) finish(t); } catch { /* seguir */ } busy = false; }, 280);
    })();
  });
})();

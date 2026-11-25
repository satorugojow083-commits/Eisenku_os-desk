/* =====================================================================
   EISENKU OS 10.0 · Ciencia y educación (carga diferida)
   Simulador de circuitos (análisis nodal real), Laboratorio de física y matemáticas,
   Simulador de topología de red (Dijkstra, subredes) y Centro de aprendizaje de informática.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, U = K.u10, F = K.files;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)];
  const fid = a => a && (a.fileId || a.id);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const theme = () => ({ text: css('--e9-text') || '#e9ebef', muted: css('--e9-muted') || '#8f96a3', line: css('--e9-line-2') || 'rgba(255,255,255,.12)', green: css('--e9-green') || '#34a582', pink: css('--e9-pink') || '#e8709f', bg: css('--e9-bg-2') || '#101217', solid: css('--e9-solid') || '#121419', warn: '#d9a03a', blue: '#6a9fd8' });
  // valores con prefijo SI (1.5 mA, 4.7 kΩ…)
  const si = (v, unit, d = 3) => { if (!Number.isFinite(v)) return '—'; const a = Math.abs(v); if (a < 1e-12) return '0 ' + unit; const P = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']]; const [m, p] = P.find(([x]) => a >= x * .9995) || P[P.length - 1]; return (+(v / m).toPrecision(d)).toLocaleString(K.locale) + ' ' + p + unit; };
  const parseSI = s => { const m = /^\s*([-+]?\d*[.,]?\d+(?:e[-+]?\d+)?)\s*([GMkKmuµnp]?)/.exec(String(s)); if (!m) return NaN; return parseFloat(m[1].replace(',', '.')) * ({ G: 1e9, M: 1e6, k: 1e3, K: 1e3, m: 1e-3, u: 1e-6, 'µ': 1e-6, n: 1e-9, p: 1e-12 }[m[2]] || 1); };
  const hidpi = (cv) => { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height)); if (cv.width !== w * d || cv.height !== h * d) { cv.width = w * d; cv.height = h * d; } const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { g, w, h }; };

  /* ===================================================================
     Simulador de circuitos: análisis nodal (MNA con equivalentes de Norton), LED por tramos,
     condensadores con Euler implícito, corriente animada y medidores
     =================================================================== */
  const CT = {
    wire: { n: 'Cable', g: 1e3 },
    battery: { n: 'Pila', v: 9, unit: 'V', key: 'v', label: 'Tensión', r: 0.1 },
    resistor: { n: 'Resistencia', v: 1000, unit: 'Ω', key: 'v', label: 'Resistencia' },
    led: { n: 'LED', v: 2, unit: 'V', key: 'v', label: 'Tensión directa', color: '#e8709f' },
    switch: { n: 'Interruptor', on: false },
    capacitor: { n: 'Condensador', v: 0.001, unit: 'F', key: 'v', label: 'Capacidad' },
    bulb: { n: 'Bombilla', v: 10, unit: 'Ω', key: 'v', label: 'Resistencia', p: 0.9 },
    ammeter: { n: 'Amperímetro' },
    voltmeter: { n: 'Voltímetro' }
  };
  const CPRE = {
    simple: { n: 'Pila y bombilla', els: [['battery', 4, 8, 4, 4, { v: 3 }], ['wire', 4, 4, 10, 4], ['bulb', 10, 4, 10, 8], ['wire', 10, 8, 7, 8], ['switch', 7, 8, 4, 8, { on: true }]] },
    serie: { n: 'Serie y paralelo', els: [['battery', 3, 10, 3, 4, { v: 9 }], ['wire', 3, 4, 6, 4], ['resistor', 6, 4, 10, 4, { v: 100 }], ['wire', 10, 4, 13, 4], ['resistor', 13, 4, 13, 7, { v: 220 }], ['resistor', 16, 4, 16, 7, { v: 330 }], ['wire', 13, 4, 16, 4], ['wire', 13, 7, 16, 7], ['wire', 13, 7, 13, 10], ['ammeter', 13, 10, 8, 10], ['wire', 8, 10, 3, 10]] },
    divisor: { n: 'Divisor de tensión', els: [['battery', 4, 10, 4, 4, { v: 12 }], ['wire', 4, 4, 9, 4], ['resistor', 9, 4, 9, 7, { v: 10000 }], ['resistor', 9, 7, 9, 10, { v: 4700 }], ['wire', 9, 10, 4, 10], ['voltmeter', 9, 7, 13, 7], ['wire', 13, 7, 13, 10], ['wire', 13, 10, 9, 10]] },
    led: { n: 'LED con resistencia', els: [['battery', 4, 9, 4, 4, { v: 5 }], ['wire', 4, 4, 7, 4], ['resistor', 7, 4, 11, 4, { v: 150 }], ['led', 11, 4, 11, 9, { v: 2 }], ['wire', 11, 9, 4, 9], ['ammeter', 11, 4, 14, 4], ['led', 14, 4, 14, 9, { v: 2, color: '#34a582' }], ['wire', 14, 9, 11, 9]] },
    rc: { n: 'Carga de un condensador (RC)', els: [['battery', 3, 9, 3, 4, { v: 9 }], ['switch', 3, 4, 7, 4, { on: false }], ['resistor', 7, 4, 12, 4, { v: 1000 }], ['capacitor', 12, 4, 12, 9, { v: 0.001 }], ['wire', 12, 9, 3, 9], ['voltmeter', 12, 4, 16, 4], ['wire', 16, 4, 16, 9], ['wire', 16, 9, 12, 9]] },
    corto: { n: 'Cortocircuito (qué no hacer)', els: [['battery', 4, 8, 4, 4, { v: 9 }], ['wire', 4, 4, 9, 4], ['wire', 9, 4, 9, 8], ['wire', 9, 8, 4, 8]] }
  };
  // resolver A·x = b (eliminación gaussiana con pivoteo parcial)
  function solve(A, b) {
    const n = b.length;
    for (let c = 0; c < n; c++) {
      let p = c, mx = Math.abs(A[c][c]); for (let r = c + 1; r < n; r++) { const v = Math.abs(A[r][c]); if (v > mx) { mx = v; p = r; } }
      if (mx < 1e-18) continue; if (p !== c) { [A[p], A[c]] = [A[c], A[p]]; [b[p], b[c]] = [b[c], b[p]]; }
      const piv = A[c][c]; for (let r = c + 1; r < n; r++) { const f = A[r][c] / piv; if (!f) continue; const Ar = A[r], Ac = A[c]; for (let k = c; k < n; k++) Ar[k] -= f * Ac[k]; b[r] -= f * b[c]; }
    }
    const x = new Array(n).fill(0); for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = Math.abs(A[r][r]) < 1e-18 ? 0 : s / A[r][r]; }
    return x;
  }
  // simulación de un paso: devuelve tensiones de nodo y corriente de cada elemento (de a hacia b)
  function simulate(els, dt) {
    const key = (x, y) => x + ',' + y, nodes = new Map();
    els.forEach(e => { [key(e.ax, e.ay), key(e.bx, e.by)].forEach(k => { if (!nodes.has(k)) nodes.set(k, nodes.size); }); });
    const n = nodes.size; if (!n) return { V: [], nodes };
    const bat = els.find(e => e.t === 'battery'), gnd = bat ? nodes.get(key(bat.ax, bat.ay)) : 0;
    const idx = i => i === gnd ? -1 : i < gnd ? i : i - 1, m = n - 1;
    els.forEach(e => { e.na = nodes.get(key(e.ax, e.ay)); e.nb = nodes.get(key(e.bx, e.by)); });
    let V = new Array(n).fill(0);
    for (let iter = 0; iter < 25; iter++) {
      const A = Array.from({ length: m }, () => new Float64Array(m)), b = new Float64Array(m);
      const G = (a, c, g) => { const i = idx(a), j = idx(c); if (i >= 0) A[i][i] += g; if (j >= 0) A[j][j] += g; if (i >= 0 && j >= 0) { A[i][j] -= g; A[j][i] -= g; } };
      const Isrc = (a, c, I) => { const i = idx(a), j = idx(c); if (i >= 0) b[i] -= I; if (j >= 0) b[j] += I; };   // corriente I que sale de a y entra en c por fuera… (fuente de a→b internamente)
      for (let i = 0; i < m; i++) A[i][i] += 1e-9;
      els.forEach(e => {
        if (e.na === e.nb) return;
        switch (e.t) {
          case 'wire': case 'ammeter': G(e.na, e.nb, 1e3); break;
          case 'switch': if (e.on) G(e.na, e.nb, 1e3); break;
          case 'resistor': case 'bulb': G(e.na, e.nb, 1 / Math.max(1e-3, e.v)); break;
          case 'voltmeter': G(e.na, e.nb, 1e-7); break;
          case 'battery': { const g = 1 / CT.battery.r; G(e.na, e.nb, g); Isrc(e.na, e.nb, g * e.v); break; }   // Norton: corriente g·V del polo − al + por dentro
          case 'led': if (e.burnt) break; if (e.lon) { const g = 0.5; G(e.na, e.nb, g); Isrc(e.nb, e.na, g * e.v); } else G(e.na, e.nb, 1e-9); break;
          case 'capacitor': { const g = e.v / dt; G(e.na, e.nb, g); Isrc(e.nb, e.na, g * (e.vc || 0)); break; }
        }
      });
      const x = solve(A.map(r => Array.from(r)), Array.from(b)); V = new Array(n).fill(0); for (let i = 0; i < n; i++) { const j = idx(i); if (j >= 0) V[i] = x[j]; }
      let changed = false;
      els.forEach(e => { if (e.t !== 'led' || e.burnt) return; const vd = V[e.na] - V[e.nb]; if (!e.lon && vd > e.v + 1e-6) { e.lon = true; changed = true; } else if (e.lon && vd < e.v - 1e-6) { e.lon = false; changed = true; } });
      if (!changed) break;
    }
    els.forEach(e => {
      const vd = V[e.na] - V[e.nb]; e.vd = vd;
      switch (e.t) {
        case 'wire': case 'ammeter': e.i = vd * 1e3; break;
        case 'switch': e.i = e.on ? vd * 1e3 : 0; break;
        case 'resistor': case 'bulb': e.i = vd / Math.max(1e-3, e.v); break;
        case 'voltmeter': e.i = vd * 1e-7; break;
        case 'battery': e.i = (e.v - (V[e.nb] - V[e.na])) / CT.battery.r; break;
        case 'led': e.i = e.burnt ? 0 : e.lon ? (vd - e.v) * 0.5 : vd * 1e-9; break;
        case 'capacitor': e.i = e.v / dt * (vd - (e.vc || 0)); e.vc = vd; break;
      }
      e.p = Math.abs(e.t === 'battery' ? e.v * e.i : vd * e.i);
    });
    return { V, nodes, gnd };
  }
  K.circuitSim = { simulate, solve };

  K.define('circuits', {
    init(b, w, arg) {
      const C = K.cfg('circuits', { els: null, speed: 1 });
      const GS = 28, TOOLS = [['select', '↖', 'Seleccionar y mover'], ['wire', '╱', 'Cable'], ['battery', '🔋', 'Pila'], ['resistor', 'Ω', 'Resistencia'], ['led', '💡', 'LED'], ['switch', '⏻', 'Interruptor'], ['capacitor', '⊣⊢', 'Condensador'], ['bulb', '◎', 'Bombilla'], ['ammeter', 'A', 'Amperímetro'], ['voltmeter', 'V', 'Voltímetro'], ['erase', '🗑', 'Borrar']];
      let els = [], tool = 'select', sel = null, drag = null, hover = null, run = true, simT = 0, raf = 0, last = 0, warn = '', dirty = true, view = { x: 0, y: 0 };
      const mk = (t, ax, ay, bx, by, o = {}) => Object.assign({ id: E.uid(), t, ax, ay, bx, by, v: CT[t].v, on: CT[t].on, color: CT[t].color, ph: 0, vc: 0 }, o);
      const load = list => { els = (list || []).filter(e => e && CT[e.t]).map(e => Object.assign(mk(e.t, e.ax, e.ay, e.bx, e.by), { v: Number.isFinite(+e.v) ? +e.v : CT[e.t].v, on: !!e.on, color: e.color || CT[e.t].color })); sel = null; dirty = true; };
      const save = () => C.set('els', els.map(e => ({ t: e.t, ax: e.ax, ay: e.ay, bx: e.bx, by: e.by, v: e.v, on: e.on, color: e.color })));
      const preset = k => { const p = CPRE[k]; load(p.els.map(([t, ax, ay, bx, by, o]) => Object.assign({ t, ax, ay, bx, by }, o || {}))); save(); simT = 0; fitView(); info(); };
      const fitView = () => { if (!els.length) return; const xs = els.flatMap(e => [e.ax, e.bx]), ys = els.flatMap(e => [e.ay, e.by]), r = cv.getBoundingClientRect(); if (!r.width) return; view.x = Math.round(r.width / 2 - (Math.min(...xs) + Math.max(...xs)) / 2 * GS); view.y = Math.round(r.height / 2 - (Math.min(...ys) + Math.max(...ys)) / 2 * GS); };
      b.innerHTML = `<div class="k9 s10-ci"><div class="s10-ci-bar">${TOOLS.map(([k, g, l]) => `<button class="k9-btn ${k === tool ? 'on' : ''}" data-tool="${k}" title="${esc(tr(l))}"><b>${g}</b><span>${esc(tr(l))}</span></button>`).join('')}<span class="s10-wb-sep"></span><select class="input-text" data-pre><option value="">${esc(tr('Ejemplos…'))}</option>${Object.entries(CPRE).map(([k, p]) => `<option value="${k}">${esc(tr(p.n))}</option>`).join('')}</select><button class="k9-btn" data-a="run" title="${esc(tr('Pausar o reanudar'))}">⏯</button><button class="k9-btn" data-a="reset" title="${esc(tr('Reiniciar (descarga los condensadores y repara los LED)'))}">↺</button><button class="k9-btn" data-a="more">${I('more', 14)}</button></div>
        <div class="s10-ci-main"><canvas class="s10-ci-cv" data-cv tabindex="0" aria-label="${esc(tr('Esquema del circuito'))}"></canvas><aside class="s10-ci-side" data-side></aside></div><div class="s10-ci-st k9-small" data-st></div></div>`;
      const cv = q(b, '[data-cv]'), side = q(b, '[data-side]'), st = q(b, '[data-st]');
      const toPx = (gx, gy) => [gx * GS + view.x, gy * GS + view.y], toG = (px, py) => [Math.round((px - view.x) / GS), Math.round((py - view.y) / GS)];
      const segDist = (px, py, e) => { const [ax, ay] = toPx(e.ax, e.ay), [bx, by] = toPx(e.bx, e.by), dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)); return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)); };
      const pick = (px, py) => { let best = null, bd = 10; els.forEach(e => { const d = segDist(px, py, e); if (d < bd) { bd = d; best = e; } }); return best; };
      function draw() {
        const { g, w: W, h: H } = hidpi(cv), T = theme(); g.clearRect(0, 0, W, H);
        g.fillStyle = T.line; for (let x = view.x % GS; x < W; x += GS) for (let y = view.y % GS; y < H; y += GS) g.fillRect(x - 1, y - 1, 2, 2);
        els.forEach(e => drawEl(g, e, T));
        if (drag && drag.kind === 'new') { const [ax, ay] = toPx(drag.a[0], drag.a[1]), [bx, by] = toPx(drag.b[0], drag.b[1]); g.globalAlpha = .55; drawEl(g, mk(tool, drag.a[0], drag.a[1], drag.b[0], drag.b[1]), T); g.globalAlpha = 1; g.fillStyle = T.pink; [[ax, ay], [bx, by]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }); }
        if (sel) { g.fillStyle = T.pink; [[sel.ax, sel.ay], [sel.bx, sel.by]].forEach(([x, y]) => { const [px, py] = toPx(x, y); g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill(); }); }
      }
      function drawEl(g, e, T) {
        const [ax, ay] = toPx(e.ax, e.ay), [bx, by] = toPx(e.bx, e.by), L = Math.hypot(bx - ax, by - ay); if (L < 2) return;
        const ang = Math.atan2(by - ay, bx - ax), S2 = Math.min(L * .8, 2 * GS), s0 = (L - S2) / 2;
        g.save(); g.translate(ax, ay); g.rotate(ang); g.lineCap = 'round'; g.lineJoin = 'round';
        const lead = col => { g.strokeStyle = col || T.muted; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(e.t === 'wire' ? L : s0, 0); if (e.t !== 'wire') { g.moveTo(s0 + S2, 0); g.lineTo(L, 0); } g.stroke(); };
        const ihot = Math.min(1, Math.abs(e.i || 0) / 0.02);
        lead(sel === e ? T.pink : null); g.strokeStyle = sel === e ? T.pink : T.text; g.lineWidth = 2;
        const cx = s0 + S2 / 2;
        switch (e.t) {
          case 'battery': { g.beginPath(); g.moveTo(cx - 5, -14); g.lineTo(cx - 5, 14); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(cx + 5, -7); g.lineTo(cx + 5, 7); g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(s0, 0); g.lineTo(cx - 5, 0); g.moveTo(cx + 5, 0); g.lineTo(s0 + S2, 0); g.stroke(); g.save(); g.rotate(-ang); g.fillStyle = Math.abs(e.i || 0) > 5 ? '#e5484d' : T.muted; g.font = '600 12px system-ui'; g.textAlign = 'center'; const [lx, ly] = rot(cx, -24, ang); g.fillText(si(e.v, 'V', 3), lx, ly); g.restore(); g.fillStyle = T.text; g.font = '600 11px system-ui'; g.fillText('−', cx - 15, -10); g.fillText('+', cx + 9, -10); break; }
          case 'resistor': case 'bulb': {
            if (e.t === 'resistor') { g.beginPath(); g.moveTo(s0, 0); const n = 6, seg = S2 / n; for (let i = 0; i < n; i++) g.lineTo(s0 + seg * (i + .5), i % 2 ? 8 : -8); g.lineTo(s0 + S2, 0); g.stroke(); }
            else { const r = Math.min(13, S2 / 2.6), glow = Math.min(1, (e.p || 0) / (CT.bulb.p || 1)); if (glow > .02) { const gr = g.createRadialGradient(cx, 0, 2, cx, 0, r * 3); gr.addColorStop(0, `rgba(255,214,102,${.85 * glow})`); gr.addColorStop(1, 'rgba(255,214,102,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, 0, r * 3, 0, 7); g.fill(); } g.beginPath(); g.arc(cx, 0, r, 0, 7); g.fillStyle = glow > .02 ? `rgba(255,224,130,${.4 + .6 * glow})` : T.solid; g.fill(); g.stroke(); const k = r * .7; g.beginPath(); g.moveTo(cx - k, -k); g.lineTo(cx + k, k); g.moveTo(cx - k, k); g.lineTo(cx + k, -k); g.stroke(); g.beginPath(); g.moveTo(s0, 0); g.lineTo(cx - r, 0); g.moveTo(cx + r, 0); g.lineTo(s0 + S2, 0); g.stroke(); }
            g.save(); g.rotate(-ang); g.fillStyle = T.muted; g.font = '12px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; const [lx, ly] = rot(cx, e.t === 'bulb' ? -40 : -22, ang); g.fillText(si(e.v, 'Ω', 3), lx, ly); g.restore(); break;
          }
          case 'led': { const col = e.color || '#e8709f'; if (e.lon && !e.burnt && ihot > .02) { const gr = g.createRadialGradient(cx, 0, 2, cx, 0, 30); gr.addColorStop(0, col + 'cc'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.beginPath(); g.arc(cx, 0, 30, 0, 7); g.fill(); } g.beginPath(); g.moveTo(cx - 9, -10); g.lineTo(cx + 9, 0); g.lineTo(cx - 9, 10); g.closePath(); g.fillStyle = e.burnt ? '#555' : e.lon ? col : T.solid; g.fill(); g.stroke(); g.beginPath(); g.moveTo(cx + 9, -10); g.lineTo(cx + 9, 10); g.moveTo(s0, 0); g.lineTo(cx - 9, 0); g.moveTo(cx + 9, 0); g.lineTo(s0 + S2, 0); g.moveTo(cx + 2, -13); g.lineTo(cx + 8, -19); g.moveTo(cx + 7, -12); g.lineTo(cx + 13, -18); g.stroke(); if (e.burnt) { g.strokeStyle = '#e5484d'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 8, -8); g.lineTo(cx + 8, 8); g.moveTo(cx - 8, 8); g.lineTo(cx + 8, -8); g.stroke(); } break; }
          case 'switch': { g.beginPath(); g.arc(s0 + 4, 0, 3.5, 0, 7); g.arc(s0 + S2 - 4, 0, 3.5, 0, 7); g.fillStyle = T.text; g.fill(); g.beginPath(); g.moveTo(s0 + 4, 0); if (e.on) g.lineTo(s0 + S2 - 4, 0); else g.lineTo(s0 + S2 - 10, -16); g.lineWidth = 3; g.strokeStyle = e.on ? T.green : T.text; g.stroke(); break; }
          case 'capacitor': { g.beginPath(); g.moveTo(s0, 0); g.lineTo(cx - 5, 0); g.moveTo(cx + 5, 0); g.lineTo(s0 + S2, 0); g.moveTo(cx - 5, -13); g.lineTo(cx - 5, 13); g.moveTo(cx + 5, -13); g.lineTo(cx + 5, 13); g.stroke(); g.save(); g.rotate(-ang); g.fillStyle = T.muted; g.font = '12px system-ui'; g.textAlign = 'center'; const [lx, ly] = rot(cx, -24, ang); g.fillText(si(e.v, 'F', 3) + ' · ' + si(e.vd || 0, 'V', 3), lx, ly); g.restore(); break; }
          case 'ammeter': case 'voltmeter': { const r = Math.min(15, S2 / 2.4); g.beginPath(); g.moveTo(s0, 0); g.lineTo(cx - r, 0); g.moveTo(cx + r, 0); g.lineTo(s0 + S2, 0); g.stroke(); g.beginPath(); g.arc(cx, 0, r, 0, 7); g.fillStyle = T.solid; g.fill(); g.strokeStyle = e.t === 'ammeter' ? T.green : T.pink; g.stroke(); g.save(); g.translate(cx, 0); g.rotate(-ang); g.fillStyle = g.strokeStyle; g.font = '700 13px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e.t === 'ammeter' ? 'A' : 'V', 0, 0); g.fillStyle = T.text; g.font = '600 12px system-ui'; g.fillText(e.t === 'ammeter' ? si(e.i || 0, 'A') : si(e.vd || 0, 'V'), 0, -r - 10); g.restore(); break; }
        }
        // corriente animada (sentido convencional)
        if (Math.abs(e.i || 0) > 1e-6 && e.t !== 'voltmeter') { g.fillStyle = T.warn; for (let d = ((e.ph % 16) + 16) % 16; d < L; d += 16) { g.beginPath(); g.arc(d, 0, 2.2, 0, 7); g.fill(); } }
        g.restore();
      }
      const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
      function step(ms) {
        const hasDyn = els.some(e => e.t === 'capacitor'), n = Math.max(1, Math.min(40, Math.round(ms / 4))), dt = run ? Math.max(1e-5, ms / 1000 / n * (+C.get('speed', 1) || 1)) : 1e-6;
        if (dirty || (hasDyn && run)) { for (let i = 0; i < (hasDyn && run ? n : 1); i++) { simulate(els, dt); if (hasDyn && run) simT += dt; } dirty = false; checks(dt * n); }
        els.forEach(e => { const i = e.i || 0; if (Math.abs(i) > 1e-6) e.ph += Math.sign(i) * Math.min(160, 30 * Math.log10(1 + Math.abs(i) * 1e4)) * ms / 1000; });
      }
      function checks(dtTot) {
        let wmsg = '';
        els.forEach(e => {
          if (e.t === 'battery' && Math.abs(e.i) > 5) wmsg = tr('¡Cortocircuito! La pila entrega') + ' ' + si(Math.abs(e.i), 'A') + '. ' + tr('En la vida real se calentaría y podría dañarse: añade una resistencia o una bombilla.');
          if (e.t === 'led' && !e.burnt && e.i > 0.05) { e.hot = (e.hot || 0) + dtTot; if (e.hot > 0.15) { e.burnt = true; e.lon = false; e.lastI = e.i; dirty = true; } } else if (e.t === 'led') e.hot = 0;
        });
        const bl = els.filter(e => e.t === 'led' && e.burnt); if (bl.length) wmsg = (wmsg ? wmsg + ' ' : '') + tr('Un LED se ha fundido: le llegaba') + ' ' + si(Math.max(...bl.map(e => e.lastI || 0)), 'A') + ' ' + tr('(máx. ~30 mA). Pon una resistencia en serie y pulsa ↺ para repararlo.');
        if (wmsg !== warn) { warn = wmsg; info(); }
      }
      let fc = 0;
      function loop(t) { const ms = Math.min(100, last ? t - last : 16); last = t; if (b.isConnected && cv.offsetParent) { step(ms); draw(); if (++fc % 8 === 0) liveInfo(); } raf = requestAnimationFrame(loop); }
      function liveInfo() { if (side.contains(document.activeElement) && document.activeElement.matches('input')) return; const r = q(side, '[data-live]'); if (r && sel) r.innerHTML = readings(sel); const s = q(side, '[data-sum]'); if (s) s.innerHTML = summary(); }
      const readings = e => U.kv([['Tensión entre extremos', si(Math.abs(e.vd || 0), 'V')], e.t !== 'voltmeter' ? ['Corriente', si(Math.abs(e.i || 0), 'A')] : null, e.t !== 'wire' && e.t !== 'voltmeter' && e.t !== 'ammeter' ? ['Potencia', si(e.p || 0, 'W')] : null, e.t === 'led' ? ['Estado', tr(e.burnt ? 'Fundido' : e.lon ? 'Encendido' : 'Apagado')] : null, e.t === 'capacitor' ? ['Carga almacenada', si(e.v * Math.abs(e.vd || 0), 'C')] : null]);
      const summary = () => { const bats = els.filter(e => e.t === 'battery'); const meters = els.filter(e => e.t === 'ammeter' || e.t === 'voltmeter'); return (bats.length ? U.kv(bats.map((x, i) => [tr('Pila') + ' ' + (i + 1) + ' (' + si(x.v, 'V') + ')', si(Math.abs(x.i || 0), 'A') + ' · ' + si(x.p || 0, 'W')])) : `<p class="k9-small k9-muted">${esc(tr('Añade una pila para alimentar el circuito.'))}</p>`) + (meters.length ? U.kv(meters.map((x, i) => [(x.t === 'ammeter' ? tr('Amperímetro') : tr('Voltímetro')) + ' ' + (i + 1), x.t === 'ammeter' ? si(Math.abs(x.i || 0), 'A') : si(x.vd || 0, 'V')])) : '') + (els.some(e => e.t === 'capacitor') ? `<p class="k9-small k9-muted">${esc(tr('Tiempo simulado'))}: ${simT.toFixed(2)} s</p>` : ''); };
      function info() {
        const e = sel, d = e && CT[e.t];
        side.innerHTML = (warn ? `<div class="s10-note warn">${I('shield', 15)}<span>${esc(warn)}</span></div>` : '') + (e ? `<b>${esc(tr(d.n))}</b>${d.key ? `<label class="k9-field">${esc(tr(d.label))} (${d.unit})<input class="input-text" data-val value="${esc(si(e.v, '', 4).trim())}" spellcheck="false"></label>` : ''}${e.t === 'led' ? `<label class="k9-field">${esc(tr('Color'))}<input type="color" data-col value="${esc(e.color || '#e8709f')}"></label>` : ''}${e.t === 'switch' ? `<button class="k9-btn pri" data-a="toggle">${esc(tr(e.on ? 'Abrir el interruptor' : 'Cerrar el interruptor'))}</button>` : ''}<div data-live>${readings(e)}</div><div class="k9-row" style="flex-wrap:wrap"><button class="k9-btn" data-a="flip">⇄ ${esc(tr('Invertir'))}</button><button class="k9-btn dng" data-a="del">${I('trash', 13)} ${esc(tr('Borrar'))}</button></div><hr>` : `<p class="k9-small k9-muted">${esc(tr('Elige una herramienta y arrastra sobre la cuadrícula para colocar el componente. Con «Seleccionar» puedes moverlo, ver sus medidas o cambiar su valor. Toca un interruptor para abrirlo o cerrarlo.'))}</p>`) + `<b class="k9-small">${esc(tr('Medidas'))}</b><div data-sum>${summary()}</div>`;
        st.textContent = `${els.length} ${tr('componentes')} · ${run ? tr('simulando') : tr('en pausa')} · ${tr('corriente convencional (de + a −)')}`;
      }
      const setTool = t => { tool = t; qa(b, '[data-tool]').forEach(x => x.classList.toggle('on', x.dataset.tool === t)); cv.style.cursor = t === 'select' ? 'default' : t === 'erase' ? 'not-allowed' : 'crosshair'; };
      const ptr = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.addEventListener('pointerdown', e => {
        cv.focus(); const [px, py] = ptr(e), gpt = toG(px, py); cv.setPointerCapture(e.pointerId);
        if (tool === 'erase') { const h = pick(px, py); if (h) { els = els.filter(x => x !== h); if (sel === h) sel = null; dirty = true; save(); info(); } return; }
        if (tool === 'select') {
          if (sel) { for (const end of ['a', 'b']) { const [ex, ey] = toPx(sel[end + 'x'], sel[end + 'y']); if (Math.hypot(px - ex, py - ey) < 9) { drag = { kind: 'end', end, el: sel }; return; } } }
          const h = pick(px, py); sel = h; if (h) { drag = { kind: 'move', el: h, g0: gpt, a: [h.ax, h.ay, h.bx, h.by], moved: false }; } else drag = { kind: 'pan', p0: [px, py], v0: { ...view } }; info(); return;
        }
        drag = { kind: 'new', a: gpt, b: gpt, moved: false };
      });
      cv.addEventListener('pointermove', e => {
        const [px, py] = ptr(e), gpt = toG(px, py); if (!drag) { const h = tool !== 'select' && tool !== 'erase' ? null : pick(px, py); if (h !== hover) { hover = h; cv.style.cursor = h ? (h.t === 'switch' && tool === 'select' ? 'pointer' : tool === 'erase' ? 'not-allowed' : 'move') : tool === 'select' ? 'default' : tool === 'erase' ? 'not-allowed' : 'crosshair'; } return; }
        if (drag.kind === 'new') { if (gpt[0] !== drag.b[0] || gpt[1] !== drag.b[1]) { drag.b = gpt; drag.moved = true; } }
        if (drag.kind === 'end') { drag.el[drag.end + 'x'] = gpt[0]; drag.el[drag.end + 'y'] = gpt[1]; dirty = true; }
        if (drag.kind === 'move') { const dx = gpt[0] - drag.g0[0], dy = gpt[1] - drag.g0[1]; if (dx || dy) drag.moved = true; const [a1, a2, b1, b2] = drag.a; Object.assign(drag.el, { ax: a1 + dx, ay: a2 + dy, bx: b1 + dx, by: b2 + dy }); dirty = true; }
        if (drag.kind === 'pan') { view.x = drag.v0.x + px - drag.p0[0]; view.y = drag.v0.y + py - drag.p0[1]; }
      });
      cv.addEventListener('pointerup', () => {
        if (!drag) return;
        if (drag.kind === 'new') { let [ax, ay] = drag.a, [bx, by] = drag.b; if (!drag.moved || (ax === bx && ay === by)) { bx = ax + (tool === 'wire' ? 2 : 3); by = ay; } const n2 = mk(tool, ax, ay, bx, by); els.push(n2); sel = n2; dirty = true; save(); info(); }
        if (drag.kind === 'move' && !drag.moved && drag.el.t === 'switch') { drag.el.on = !drag.el.on; dirty = true; save(); info(); }
        if (drag.kind === 'end' || (drag.kind === 'move' && drag.moved)) { els = els.filter(x => !(x.ax === x.bx && x.ay === x.by)); dirty = true; save(); }
        drag = null;
      });
      cv.addEventListener('keydown', e => { if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { els = els.filter(x => x !== sel); sel = null; dirty = true; save(); info(); } if (e.key === 'Escape') { sel = null; setTool('select'); info(); } if (e.key === ' ' && sel && sel.t === 'switch') { e.preventDefault(); sel.on = !sel.on; dirty = true; save(); info(); } });
      b.addEventListener('click', async e => {
        const t = e.target.closest('[data-tool]'); if (t) { setTool(t.dataset.tool); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'run') { run = !run; info(); }
        if (k === 'reset') { els.forEach(x => { x.vc = 0; x.burnt = false; x.lon = false; x.hot = 0; }); simT = 0; warn = ''; dirty = true; info(); }
        if (k === 'toggle' && sel) { sel.on = !sel.on; dirty = true; save(); info(); }
        if (k === 'flip' && sel) { [sel.ax, sel.ay, sel.bx, sel.by] = [sel.bx, sel.by, sel.ax, sel.ay]; dirty = true; save(); info(); }
        if (k === 'del' && sel) { els = els.filter(x => x !== sel); sel = null; dirty = true; save(); info(); }
        if (k === 'more') { const r = a.getBoundingClientRect(); K.ui.menu(r.left, r.bottom + 4, [
          { label: tr('Velocidad de la simulación') + ': ×' + C.get('speed', 1), icon: '⏱', act: async () => { const v = await E.form({ title: tr('Velocidad'), fields: [{ k: 's', label: tr('Multiplicador del tiempo'), type: 'select', options: [['0.25', '×0,25'], ['0.5', '×0,5'], ['1', '×1'], ['2', '×2'], ['5', '×5']], value: String(C.get('speed', 1)) }] }); if (v) C.set('speed', +v.s); } },
          { label: tr('Guardar como .eiscirc'), icon: '💾', act: () => U.saveBlob(tr('Circuito') + '.eiscirc', new Blob([JSON.stringify({ app: 'EISENKU circuit', v: 1, els: JSON.parse(JSON.stringify(C.get('els', []))) })], { type: 'application/json' }), 'documents') },
          { label: tr('Abrir .eiscirc…'), icon: '📂', act: async () => { const f = await U.pickBlob({ title: tr('Circuito (.eiscirc)'), accept: x => /\.eiscirc$/i.test(x.name), deviceAccept: '.eiscirc,application/json' }); if (f) openFile(f); } },
          { label: tr('Exportar imagen PNG'), icon: '🖼', act: async () => { const bl = await new Promise(r => cv.toBlob(r, 'image/png')); if (bl) U.saveBlob(tr('Circuito') + '.png', bl, 'images'); } },
          { sep: true }, { label: tr('Vaciar el circuito'), icon: '🧹', danger: true, act: () => { els = []; sel = null; dirty = true; save(); info(); } }]); }
      });
      b.addEventListener('change', e => { if (e.target.matches('[data-pre]') && e.target.value) { preset(e.target.value); e.target.value = ''; } if (e.target.matches('[data-val]') && sel) { const v = parseSI(e.target.value); if (!(v > 0) || v > 1e9) { E.toast(tr('Valor no válido')); info(); return; } sel.v = sel.t === 'battery' ? Math.min(1000, v) : v; dirty = true; save(); info(); } if (e.target.matches('[data-col]') && sel) { sel.color = e.target.value; save(); } });
      async function openFile(f) { try { const j = JSON.parse(await f.blob.text()); if (!Array.isArray(j.els)) throw 0; load(j.els.slice(0, 500)); save(); simT = 0; fitView(); info(); } catch { E.toast(tr('Archivo de circuito no válido')); } }
      const saved = C.get('els', null); if (saved && saved.length) load(saved); else preset('simple');
      const argFile = async a => { const f = fid(a) && await F.get(fid(a)); if (f) openFile(f); };
      info(); raf = requestAnimationFrame(loop); argFile(arg); requestAnimationFrame(() => fitView());
      this.onOpen = (bb, ww, a) => argFile(a); this.destroy = () => cancelAnimationFrame(raf);
      K.ext.circuits = { els: () => els, preset, step: ms => step(ms), sim: () => { dirty = true; step(16); }, set: (i, o) => { Object.assign(els[i], o); dirty = true; }, simT: () => simT, warn: () => warn, run: v => { run = v; } };
    }
  });

  /* ===================================================================
     Laboratorio de física y matemáticas: Fourier, vectores, probabilidad, círculo unitario y oscilaciones
     =================================================================== */
  const rnd = n => { const u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] % n; };
  const fmtN = (v, d = 3) => Number.isFinite(v) ? (+v.toFixed(d)).toLocaleString(K.locale) : '—';
  const EXACT = { 0: ['0', '1', '0'], 30: ['1/2', '√3/2', '√3/3'], 45: ['√2/2', '√2/2', '1'], 60: ['√3/2', '1/2', '√3'], 90: ['1', '0', '∞'], 120: ['√3/2', '−1/2', '−√3'], 135: ['√2/2', '−√2/2', '−1'], 150: ['1/2', '−√3/2', '−√3/3'], 180: ['0', '−1', '0'], 210: ['−1/2', '−√3/2', '√3/3'], 225: ['−√2/2', '−√2/2', '1'], 240: ['−√3/2', '−1/2', '√3'], 270: ['−1', '0', '∞'], 300: ['−√3/2', '1/2', '−√3'], 315: ['−√2/2', '√2/2', '−1'], 330: ['−1/2', '√3/2', '−√3/3'], 360: ['0', '1', '0'] };
  const RADF = { 0: '0', 30: 'π/6', 45: 'π/4', 60: 'π/3', 90: 'π/2', 120: '2π/3', 135: '3π/4', 150: '5π/6', 180: 'π', 210: '7π/6', 225: '5π/4', 240: '4π/3', 270: '3π/2', 300: '5π/3', 315: '7π/4', 330: '11π/6', 360: '2π' };
  const FOURIER = { square: { n: 'Cuadrada', f: x => Math.sign(Math.sin(x)) || 0, b: k => k % 2 ? 4 / (Math.PI * k) : 0 }, triangle: { n: 'Triangular', f: x => (2 / Math.PI) * Math.asin(Math.sin(x)), b: k => k % 2 ? (8 / (Math.PI * Math.PI)) * (((k - 1) / 2) % 2 ? -1 : 1) / (k * k) : 0 }, saw: { n: 'Diente de sierra', f: x => { const y = ((x + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return y / Math.PI; }, b: k => (2 / Math.PI) * (k % 2 ? 1 : -1) / k } };
  const fsum = (w, N, x) => { let s = 0; for (let k = 1; k <= N; k++) { const bk = FOURIER[w].b(k); if (bk) s += bk * Math.sin(k * x); } return s; };
  function describe(data) {
    const v = data.slice().sort((a, c) => a - c), n = v.length; if (!n) return null; const mean = v.reduce((a, c) => a + c, 0) / n, q2 = p => { const i = (n - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return v[lo] + (v[hi] - v[lo]) * (i - lo); };
    const cnt = new Map(); v.forEach(x => cnt.set(x, (cnt.get(x) || 0) + 1)); const mx = Math.max(...cnt.values()), modes = mx > 1 ? [...cnt].filter(([, c]) => c === mx).map(([x]) => x) : [];
    const ss = v.reduce((a, c) => a + (c - mean) ** 2, 0), Q1 = q2(.25), Q3 = q2(.75), iqr = Q3 - Q1;
    return { n, mean, median: q2(.5), modes, min: v[0], max: v[n - 1], range: v[n - 1] - v[0], varP: ss / n, varS: n > 1 ? ss / (n - 1) : NaN, sdP: Math.sqrt(ss / n), sdS: n > 1 ? Math.sqrt(ss / (n - 1)) : NaN, Q1, Q3, iqr, out: v.filter(x => x < Q1 - 1.5 * iqr || x > Q3 + 1.5 * iqr), sorted: v };
  }
  K.mathlab = { fsum, FOURIER, describe };
  K.define('mathlab', {
    init(b) {
      const C = K.cfg('mathlab', { exp: 'fourier', wave: 'square', N: 5, vecs: [[4, 1], [-1, 3]], dice: 2, angle: 30, sys: 'spring', m: 1, k: 10, damp: 0.1, x0: 0.3, L: 1, th0: 30, gv: 9.81 });
      const EXPS = [['fourier', 'Series de Fourier', '∿'], ['vectors', 'Vectores y fuerzas', '↗'], ['prob', 'Probabilidad y estadística', '🎲'], ['trig', 'Círculo unitario', '◷'], ['osc', 'Oscilaciones', '〰']];
      const LINKS = [['simulators', 'Simuladores educativos'], ['physics', 'Laboratorio de física'], ['grapher', 'Graficadora'], ['formulas', 'Laboratorio de fórmulas'], ['algebra', 'Calculadora algebraica'], ['equations', 'Editor de ecuaciones']].filter(([id]) => E.REG[id] || (K.MANIFESTS && K.MANIFESTS[id]));
      let exp = C.get('exp', 'fourier'), raf = 0, cleanup = null, onN = null;
      b.innerHTML = `<div class="k9 s10-ml"><nav class="s10-ml-nav">${EXPS.map(([k, n, g]) => `<button data-exp="${k}"><b>${g}</b><span>${esc(tr(n))}</span></button>`).join('')}<div class="s10-ml-links"><small>${esc(tr('Más laboratorios'))}</small>${LINKS.map(([id, n]) => `<button data-launch="${id}">${esc(tr(n))} ↗</button>`).join('')}</div></nav><section class="s10-ml-v" data-v></section></div>`;
      const V = q(b, '[data-v]');
      const stop = () => { cancelAnimationFrame(raf); raf = 0; if (cleanup) { cleanup(); cleanup = null; } };
      const anim = fn => { let last = 0; const f = t => { if (!b.isConnected) return; const dt = Math.min(.05, last ? (t - last) / 1000 : .016); last = t; if (V.offsetParent) fn(dt, t / 1000); raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); };
      /* ---------- Fourier ---------- */
      function fourier() {
        V.innerHTML = `<h3>${esc(tr('Series de Fourier'))}</h3><p class="k9-small k9-muted">${esc(tr('Toda señal periódica se puede construir sumando senos. Añade armónicos y observa cómo la suma se acerca a la onda; cerca de los saltos queda siempre un pico de ~9 % (fenómeno de Gibbs).'))}</p><div class="k9-row" style="flex-wrap:wrap"><select class="input-text" data-wave>${Object.entries(FOURIER).map(([k, w]) => `<option value="${k}"${C.get('wave') === k ? ' selected' : ''}>${esc(tr(w.n))}</option>`).join('')}</select><label class="k9-small">${esc(tr('Armónicos'))}: <b data-nl>${C.get('N')}</b> <input type="range" min="1" max="60" data-n value="${C.get('N')}"></label><label class="k9-small"><input type="checkbox" data-epi checked> ${esc(tr('Epiciclos animados'))}</label></div><canvas class="s10-ml-cv" data-cv style="height:300px"></canvas><canvas class="s10-ml-cv" data-bars style="height:90px"></canvas><div data-st class="k9-small"></div>`;
        const cv = q(V, '[data-cv]'), bars = q(V, '[data-bars]');
        const stats = () => { const w = C.get('wave'), N = +C.get('N'); let mx = -Infinity, err = 0; const M = 2000; for (let i = 0; i < M; i++) { const x = -Math.PI + 2 * Math.PI * i / M, s = fsum(w, N, x); mx = Math.max(mx, s); err += (s - FOURIER[w].f(x)) ** 2; } q(V, '[data-st]').innerHTML = U.kv([['Máximo de la suma parcial', fmtN(mx, 4) + (w === 'square' ? ' · ' + tr('sobrepaso') + ' ' + fmtN((mx - 1) / 2 * 100, 1) + ' % ' + tr('del salto') : '')], ['Error cuadrático medio', fmtN(Math.sqrt(err / M), 4)], ['Fórmula', w === 'square' ? 'f(x) = 4/π · Σ sen(kx)/k, k impar' : w === 'triangle' ? 'f(x) = 8/π² · Σ (−1)^((k−1)/2) sen(kx)/k², k impar' : 'f(x) = 2/π · Σ (−1)^(k+1) sen(kx)/k']]); };
        let t = 0;
        anim(dt => {
          const w = C.get('wave'), N = +C.get('N'), { g, w: W, h: H } = hidpi(cv), T = theme(), epi = q(V, '[data-epi]') && q(V, '[data-epi]').checked; g.clearRect(0, 0, W, H); t += dt * .8;
          const sy = H * (epi ? .3 : .36), rmax = Math.abs(FOURIER[w].b(1)) * sy, ex = rmax + 12, x0 = epi ? ex + rmax + 30 : 10, sx = (W - x0 - 10) / (4 * Math.PI), cy = H / 2, X = x => x0 + (x + 2 * Math.PI) * sx;
          g.strokeStyle = T.line; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, cy); g.lineTo(W, cy); g.stroke();
          g.strokeStyle = T.muted; g.setLineDash([4, 4]); g.beginPath(); for (let i = 0; i <= 800; i++) { const x = -2 * Math.PI + 4 * Math.PI * i / 800, y = FOURIER[w].f(x); i ? g.lineTo(X(x), cy - y * sy) : g.moveTo(X(x), cy - y * sy); } g.stroke(); g.setLineDash([]);
          g.strokeStyle = T.green; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 1200; i++) { const x = -2 * Math.PI + 4 * Math.PI * i / 1200, y = fsum(w, N, x); i ? g.lineTo(X(x), cy - y * sy) : g.moveTo(X(x), cy - y * sy); } g.stroke();
          if (epi) { let px = ex, py = cy; g.lineWidth = 1; for (let k = 1; k <= N; k++) { const bk = FOURIER[w].b(k); if (!bk) continue; g.strokeStyle = T.line; g.beginPath(); g.arc(px, py, Math.abs(bk) * sy, 0, 7); g.stroke(); const nx = px + bk * sy * Math.cos(k * t), ny = py - bk * sy * Math.sin(k * t); g.strokeStyle = T.pink; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke(); px = nx; py = ny; } const xt = ((t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI, yv = cy - fsum(w, N, xt) * sy; g.strokeStyle = T.pink; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(px, py); g.lineTo(X(xt), yv); g.stroke(); g.setLineDash([]); g.fillStyle = T.pink; g.beginPath(); g.arc(X(xt), yv, 4, 0, 7); g.fill(); }
          const { g: g2, w: W2, h: H2 } = hidpi(bars); g2.clearRect(0, 0, W2, H2); const bw = Math.max(2, Math.min(18, (W2 - 20) / 60 - 2)); for (let k = 1; k <= 60; k++) { const bk = Math.abs(FOURIER[w].b(k)), h2 = Math.min(1, bk / 1.3) * (H2 - 18); g2.fillStyle = k <= N ? T.green : T.line; g2.fillRect(10 + (k - 1) * (bw + 2), H2 - 14 - h2, bw, h2); } g2.fillStyle = T.muted; g2.font = '11px system-ui'; g2.fillText(tr('Amplitud de cada armónico k = 1…60'), 10, H2 - 2);
        });
        stats(); onN = U.debounce(stats, 120); return () => { onN = null; };
      }
      /* ---------- Vectores ---------- */
      function vectors() {
        const COL = ['#34a582', '#6a9fd8', '#d9a03a', '#b48ade'];
        V.innerHTML = `<h3>${esc(tr('Vectores y fuerzas'))}</h3><p class="k9-small k9-muted">${esc(tr('Arrastra la punta de cada fuerza (1 cuadro = 1 N). La resultante (rosa) es la suma vectorial; si es casi cero, el cuerpo está en equilibrio.'))}</p><div class="s10-ml-two"><canvas class="s10-ml-cv" data-cv style="height:380px;touch-action:none"></canvas><div><div class="k9-row" style="flex-wrap:wrap"><button class="k9-btn" data-va="add">${I('plus', 13)} ${esc(tr('Fuerza'))}</button><button class="k9-btn" data-va="del">${I('trash', 13)}</button><button class="k9-btn" data-va="eq">${esc(tr('Equilibrar'))}</button><label class="k9-small"><input type="checkbox" data-poly> ${esc(tr('Polígono de fuerzas'))}</label></div><div data-tab></div></div></div>`;
        const cv = q(V, '[data-cv]'); let vs = (C.get('vecs') || [[4, 1], [-1, 3]]).map(x => [+x[0], +x[1]]), dragI = -1, U1 = 30;
        const tab = () => { const R = vs.reduce((a, c) => [a[0] + c[0], a[1] + c[1]], [0, 0]), m = v => Math.hypot(v[0], v[1]), ang = v => (Math.atan2(v[1], v[0]) * 180 / Math.PI + 360) % 360; const dot = vs.length > 1 ? vs[0][0] * vs[1][0] + vs[0][1] * vs[1][1] : null; q(V, '[data-tab]').innerHTML = `<table class="k9-table"><thead><tr><th></th><th>Fx</th><th>Fy</th><th>|F|</th><th>${esc(tr('Ángulo'))}</th></tr></thead><tbody>${vs.map((v, i) => `<tr><td><b style="color:${COL[i]}">F${i + 1}</b></td><td>${fmtN(v[0], 2)}</td><td>${fmtN(v[1], 2)}</td><td>${fmtN(m(v), 2)} N</td><td>${fmtN(ang(v), 1)}°</td></tr>`).join('')}<tr><td><b style="color:var(--e9-pink)">R</b></td><td>${fmtN(R[0], 2)}</td><td>${fmtN(R[1], 2)}</td><td><b>${fmtN(m(R), 2)} N</b></td><td>${fmtN(ang(R), 1)}°</td></tr></tbody></table>${m(R) < .05 ? `<p class="s10-hc-ok">✓ ${esc(tr('Equilibrio: la suma de fuerzas es cero'))}</p>` : ''}${dot != null ? U.kv([['F1 · F2 (producto escalar)', fmtN(dot, 2)], ['Ángulo entre F1 y F2', fmtN(Math.acos(Math.max(-1, Math.min(1, dot / (m(vs[0]) * m(vs[1]) || 1)))) * 180 / Math.PI, 1) + '°'], ['F1 × F2 (componente z)', fmtN(vs[0][0] * vs[1][1] - vs[0][1] * vs[1][0], 2)]]) : ''}`; C.set('vecs', vs); };
        const arrow = (g, x1, y1, x2, y2, col, w = 2.5) => { const a = Math.atan2(y2 - y1, x2 - x1); g.strokeStyle = g.fillStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - 11 * Math.cos(a - .4), y2 - 11 * Math.sin(a - .4)); g.lineTo(x2 - 11 * Math.cos(a + .4), y2 - 11 * Math.sin(a + .4)); g.closePath(); g.fill(); };
        const draw = () => { const { g, w: W, h: H } = hidpi(cv), T = theme(), ox = W / 2, oy = H / 2; U1 = Math.max(16, Math.min(40, Math.min(W, H) / 16)); g.clearRect(0, 0, W, H); g.strokeStyle = T.line; g.lineWidth = 1; for (let x = ox % U1; x < W; x += U1) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = oy % U1; y < H; y += U1) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.strokeStyle = T.muted; g.beginPath(); g.moveTo(0, oy); g.lineTo(W, oy); g.moveTo(ox, 0); g.lineTo(ox, H); g.stroke(); const poly = q(V, '[data-poly]') && q(V, '[data-poly]').checked; let px = ox, py = oy; vs.forEach((v, i) => { if (poly) { arrow(g, px, py, px + v[0] * U1, py - v[1] * U1, COL[i]); px += v[0] * U1; py -= v[1] * U1; } else arrow(g, ox, oy, ox + v[0] * U1, oy - v[1] * U1, COL[i]); }); const R = vs.reduce((a, c) => [a[0] + c[0], a[1] + c[1]], [0, 0]); if (Math.hypot(R[0], R[1]) > .05) arrow(g, ox, oy, ox + R[0] * U1, oy - R[1] * U1, T.pink, 3.5); g.fillStyle = T.text; g.beginPath(); g.arc(ox, oy, 6, 0, 7); g.fill(); vs.forEach((v, i) => { g.fillStyle = COL[i]; g.font = '600 12px system-ui'; g.fillText('F' + (i + 1), ox + v[0] * U1 + 6, oy - v[1] * U1 - 6); }); };
        const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left - r.width / 2) / U1, -(e.clientY - r.top - r.height / 2) / U1]; };
        cv.onpointerdown = e => { const [x, y] = pos(e); dragI = vs.findIndex(v => Math.hypot(v[0] - x, v[1] - y) < .6); if (dragI >= 0) cv.setPointerCapture(e.pointerId); };
        cv.onpointermove = e => { if (dragI < 0) return; const [x, y] = pos(e); vs[dragI] = [Math.round(x * 2) / 2, Math.round(y * 2) / 2]; draw(); tab(); };
        cv.onpointerup = () => { dragI = -1; };
        V.onclick = e => { const a = e.target.closest('[data-va]'); if (!a) return; if (a.dataset.va === 'add' && vs.length < 4) vs.push([rnd(7) - 3, rnd(7) - 3]); if (a.dataset.va === 'del' && vs.length > 1) vs.pop(); if (a.dataset.va === 'eq') { const R = vs.slice(0, -1).reduce((s, c) => [s[0] + c[0], s[1] + c[1]], [0, 0]); if (vs.length < 2) vs.push([0, 0]); vs[vs.length - 1] = [-R[0], -R[1]]; } draw(); tab(); };
        V.onchange = e => { if (e.target.matches('[data-poly]')) draw(); };
        const ro = new ResizeObserver(draw); ro.observe(cv); draw(); tab(); return () => ro.disconnect();
      }
      /* ---------- Probabilidad y estadística ---------- */
      function prob() {
        V.innerHTML = `<h3>${esc(tr('Probabilidad y estadística'))}</h3>${U.tabs([['dice', 'Dados', ''], ['coin', 'Monedas', ''], ['data', 'Mis datos', '']], C.get('pmode', 'dice'), 'pm')}<div data-pv style="margin-top:10px"></div>`;
        const P = q(V, '[data-pv]');
        const dice = () => { const nd = +C.get('dice', 2); P.innerHTML = `<div class="k9-row" style="flex-wrap:wrap"><label class="k9-small">${esc(tr('Dados'))} <select class="input-text" data-nd>${[1, 2, 3].map(n => `<option${n === nd ? ' selected' : ''}>${n}</option>`).join('')}</select></label>${[10, 100, 1000, 10000].map(n => `<button class="k9-btn" data-roll="${n}">${esc(tr('Lanzar'))} ${n.toLocaleString(K.locale)}</button>`).join('')}<button class="k9-btn" data-roll="0">${esc(tr('Reiniciar'))}</button></div><canvas class="s10-ml-cv" data-h style="height:230px"></canvas><canvas class="s10-ml-cv" data-run style="height:110px"></canvas><div data-ds></div>`; let rolls = [], sums = new Map(); const nd2 = () => +C.get('dice', 2);
          const theo = () => { let d = [1]; for (let k = 0; k < nd2(); k++) { const nd3 = new Array(d.length + 6).fill(0); d.forEach((p, i) => { for (let f = 1; f <= 6; f++) nd3[i + f] += p / 6; }); d = nd3; } return d; };
          const draw = () => { const { g, w: W, h: H } = hidpi(q(P, '[data-h]')), T = theme(), th = theo(), n = nd2(), lo = n, hi = 6 * n, cols = hi - lo + 1, bw = (W - 40) / cols, N = rolls.length || 1, mx = Math.max(...th.slice(lo), ...[...sums.values()].map(c => c / N)) * 1.15; g.clearRect(0, 0, W, H); for (let s = lo; s <= hi; s++) { const x = 30 + (s - lo) * bw, f = (sums.get(s) || 0) / N, h2 = f / mx * (H - 30); g.fillStyle = T.green; g.fillRect(x + 2, H - 20 - h2, bw - 4, h2); const ht = th[s] / mx * (H - 30); g.strokeStyle = T.pink; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 2, H - 20 - ht); g.lineTo(x + bw - 2, H - 20 - ht); g.stroke(); g.fillStyle = T.muted; g.font = '11px system-ui'; g.textAlign = 'center'; g.fillText(s, x + bw / 2, H - 6); } g.textAlign = 'left'; g.fillStyle = T.muted; g.fillText(tr('Verde: frecuencia observada · rosa: probabilidad teórica'), 30, 12);
            const { g: g2, w: W2, h: H2 } = hidpi(q(P, '[data-run]')); g2.clearRect(0, 0, W2, H2); const exp = 3.5 * n; g2.strokeStyle = T.pink; g2.setLineDash([4, 4]); g2.beginPath(); g2.moveTo(0, H2 / 2); g2.lineTo(W2, H2 / 2); g2.stroke(); g2.setLineDash([]); if (rolls.length) { g2.strokeStyle = T.green; g2.lineWidth = 1.6; g2.beginPath(); let s = 0; const step = Math.max(1, Math.floor(rolls.length / W2)); for (let i = 0; i < rolls.length; i++) { s += rolls[i]; if (i % step && i !== rolls.length - 1) continue; const m = s / (i + 1), x = (i + 1) / rolls.length * W2, y = H2 / 2 - (m - exp) / (n * 2.5) * H2 / 2; i ? g2.lineTo(x, y) : g2.moveTo(x, y); } g2.stroke(); } g2.fillStyle = T.muted; g2.font = '11px system-ui'; g2.fillText(tr('Media acumulada → valor esperado') + ' ' + exp, 6, 12);
            const d = describe(rolls); q(P, '[data-ds]').innerHTML = U.kv([['Lanzamientos', rolls.length.toLocaleString(K.locale)], ['Media observada / esperada', d ? fmtN(d.mean, 3) + ' / ' + exp : '—'], ['Varianza observada / teórica', d ? fmtN(d.varP, 3) + ' / ' + fmtN(35 / 12 * n, 3) : '—'], ['Suma más frecuente', d && d.modes.length ? d.modes.join(', ') : '—']]); };
          P.onclick = e => { const r = e.target.closest('[data-roll]'); if (!r) return; const k = +r.dataset.roll; if (!k) { rolls = []; sums = new Map(); } else for (let i = 0; i < k && rolls.length < 200000; i++) { let s = 0; for (let j = 0; j < nd2(); j++) s += rnd(6) + 1; rolls.push(s); sums.set(s, (sums.get(s) || 0) + 1); } draw(); };
          P.onchange = e => { if (e.target.matches('[data-nd]')) { C.set('dice', +e.target.value); rolls = []; sums = new Map(); draw(); } }; draw(); };
        const coin = () => { P.innerHTML = `<div class="k9-row" style="flex-wrap:wrap">${[10, 100, 1000, 10000].map(n => `<button class="k9-btn" data-flip="${n}">${esc(tr('Lanzar'))} ${n.toLocaleString(K.locale)}</button>`).join('')}<button class="k9-btn" data-flip="0">${esc(tr('Reiniciar'))}</button></div><canvas class="s10-ml-cv" data-run style="height:200px"></canvas><div data-ds></div>`; let fl = [];
          const draw = () => { const { g, w: W, h: H } = hidpi(q(P, '[data-run]')), T = theme(); g.clearRect(0, 0, W, H); g.strokeStyle = T.pink; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke(); g.setLineDash([]); let c = 0, run = 0, best = 0, prev = -1; if (fl.length) { g.strokeStyle = T.green; g.lineWidth = 1.6; g.beginPath(); const step = Math.max(1, Math.floor(fl.length / W)); fl.forEach((x, i) => { c += x; run = x === prev ? run + 1 : 1; prev = x; best = Math.max(best, run); if (i % step && i !== fl.length - 1) return; const y = H - (c / (i + 1)) * H; i ? g.lineTo((i + 1) / fl.length * W, y) : g.moveTo(0, y); }); g.stroke(); } g.fillStyle = T.muted; g.font = '11px system-ui'; g.fillText(tr('Proporción de caras → 0,5 (ley de los grandes números)'), 6, 12); q(P, '[data-ds]').innerHTML = U.kv([['Lanzamientos', fl.length.toLocaleString(K.locale)], ['Caras', c + (fl.length ? ' (' + fmtN(c / fl.length * 100, 2) + ' %)' : '')], ['Cruces', fl.length - c], ['Racha más larga', best]]); };
          P.onclick = e => { const r = e.target.closest('[data-flip]'); if (!r) return; const k = +r.dataset.flip; if (!k) fl = []; else for (let i = 0; i < k && fl.length < 200000; i++) fl.push(rnd(2)); draw(); }; draw(); };
        const data = () => { P.innerHTML = `<label class="k9-field">${esc(tr('Tus datos (separados por comas, espacios o líneas)'))}<textarea class="input-text" data-dt rows="3">${esc(C.get('pdata', '12, 15, 15, 18, 21, 22, 22, 22, 25, 30, 41'))}</textarea></label><canvas class="s10-ml-cv" data-bx style="height:150px"></canvas><div data-ds></div>`;
          const go = () => { const raw = q(P, '[data-dt]').value; C.set('pdata', raw.slice(0, 5000)); const v = raw.split(/[\s;,]+/).map(x => parseFloat(x.replace(',', '.'))).filter(Number.isFinite); const d = describe(v), { g, w: W, h: H } = hidpi(q(P, '[data-bx]')), T = theme(); g.clearRect(0, 0, W, H); if (!d) { q(P, '[data-ds]').innerHTML = `<p class="k9-muted">${esc(tr('Escribe al menos un número.'))}</p>`; return; } const lo = d.min - (d.range || 1) * .05, hi = d.max + (d.range || 1) * .05, X = x => 20 + (x - lo) / (hi - lo) * (W - 40), y = H * .38; g.strokeStyle = T.text; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(Math.max(d.min, d.Q1 - 1.5 * d.iqr)), y); g.lineTo(X(d.Q1), y); g.moveTo(X(d.Q3), y); g.lineTo(X(Math.min(d.max, d.Q3 + 1.5 * d.iqr)), y); g.stroke(); g.fillStyle = 'rgba(52,165,130,.25)'; g.fillRect(X(d.Q1), y - 20, X(d.Q3) - X(d.Q1), 40); g.strokeRect(X(d.Q1), y - 20, X(d.Q3) - X(d.Q1), 40); g.strokeStyle = T.pink; g.lineWidth = 3; g.beginPath(); g.moveTo(X(d.median), y - 20); g.lineTo(X(d.median), y + 20); g.stroke(); g.fillStyle = T.warn; d.out.forEach(o => { g.beginPath(); g.arc(X(o), y, 4, 0, 7); g.fill(); }); g.fillStyle = T.muted; g.font = '11px system-ui'; g.fillText(fmtN(d.min, 2), X(d.min) - 6, H - 30); g.fillText(fmtN(d.max, 2), X(d.max) - 10, H - 30); d.sorted.forEach(x => { g.fillStyle = T.green; g.fillRect(X(x) - 1, H - 22, 2, 10); });
            q(P, '[data-ds]').innerHTML = U.kv([['n', d.n], ['Media', fmtN(d.mean, 4)], ['Mediana', fmtN(d.median, 4)], ['Moda', d.modes.length ? d.modes.map(x => fmtN(x, 4)).join(', ') : tr('no hay (ningún valor se repite)')], ['Rango', fmtN(d.range, 4) + ' (' + fmtN(d.min, 4) + ' – ' + fmtN(d.max, 4) + ')'], ['Cuartiles Q1 · Q3 · RIC', fmtN(d.Q1, 4) + ' · ' + fmtN(d.Q3, 4) + ' · ' + fmtN(d.iqr, 4)], ['Varianza (población / muestra)', fmtN(d.varP, 4) + ' / ' + fmtN(d.varS, 4)], ['Desviación típica (población / muestra)', fmtN(d.sdP, 4) + ' / ' + fmtN(d.sdS, 4)], ['Valores atípicos (1,5·RIC)', d.out.length ? d.out.map(x => fmtN(x, 4)).join(', ') : tr('ninguno')]]); };
          P.oninput = U.debounce(go, 200); go(); };
        const sub = () => { qa(V, '[data-pm]').forEach(t => t.classList.toggle('on', t.dataset.pm === C.get('pmode', 'dice'))); ({ dice, coin, data })[C.get('pmode', 'dice')](); };
        V.onclick = e => { const t = e.target.closest('[data-pm]'); if (t) { C.set('pmode', t.dataset.pm); sub(); } }; sub(); return () => {};
      }
      /* ---------- Círculo unitario ---------- */
      function trig() {
        V.innerHTML = `<h3>${esc(tr('Círculo unitario y trigonometría'))}</h3><p class="k9-small k9-muted">${esc(tr('Arrastra el punto. El coseno es la sombra horizontal (rosa) y el seno la vertical (verde); la tangente es la altura donde el radio corta la recta x = 1.'))}</p><div class="k9-row" style="flex-wrap:wrap"><input type="range" min="0" max="360" step="1" data-ang value="${C.get('angle', 30)}" style="flex:1;min-width:200px"><label class="k9-small"><input type="checkbox" data-play> ${esc(tr('Girar'))}</label></div><div class="s10-chips" style="margin:6px 0">${[0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330].map(a => `<button class="s10-chip" data-sa="${a}">${a}°</button>`).join('')}</div><div class="s10-ml-two"><canvas class="s10-ml-cv" data-cv style="height:330px;touch-action:none"></canvas><div><canvas class="s10-ml-cv" data-wv style="height:170px"></canvas><div data-vals></div></div></div>`;
        const cv = q(V, '[data-cv]'), wv = q(V, '[data-wv]'); let ang = +C.get('angle', 30), drag = false;
        const draw = () => {
          const { g, w: W, h: H } = hidpi(cv), T = theme(), R = Math.min(W, H) * .36, ox = W / 2 - R * .2, oy = H / 2, a = ang * Math.PI / 180, cx = Math.cos(a), sy = Math.sin(a); g.clearRect(0, 0, W, H);
          g.strokeStyle = T.line; g.lineWidth = 1; g.beginPath(); g.moveTo(ox - R * 1.3, oy); g.lineTo(ox + R * 1.9, oy); g.moveTo(ox, oy - R * 1.3); g.lineTo(ox, oy + R * 1.3); g.stroke(); g.strokeStyle = T.muted; g.beginPath(); g.arc(ox, oy, R, 0, 7); g.stroke();
          g.fillStyle = 'rgba(232,112,159,.15)'; g.beginPath(); g.moveTo(ox, oy); g.arc(ox, oy, R * .22, 0, -a, true); g.closePath(); g.fill();
          if (Math.abs(cx) > .02) { const tn = sy / cx; if (Math.abs(tn) < 4) { g.strokeStyle = T.warn; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + R, oy - tn * R); g.stroke(); g.setLineDash([]); g.lineWidth = 3; g.beginPath(); g.moveTo(ox + R, oy); g.lineTo(ox + R, oy - tn * R); g.stroke(); } }
          g.lineWidth = 3; g.strokeStyle = T.pink; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + cx * R, oy); g.stroke(); g.strokeStyle = T.green; g.beginPath(); g.moveTo(ox + cx * R, oy); g.lineTo(ox + cx * R, oy - sy * R); g.stroke(); g.strokeStyle = T.text; g.lineWidth = 2; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + cx * R, oy - sy * R); g.stroke();
          g.fillStyle = T.text; g.beginPath(); g.arc(ox + cx * R, oy - sy * R, 7, 0, 7); g.fill(); g.font = '600 12px system-ui'; g.fillText(`(${fmtN(cx, 3)}, ${fmtN(sy, 3)})`, ox + cx * R + 10, oy - sy * R - 10);
          const { g: g2, w: W2, h: H2 } = hidpi(wv), X = t => 10 + t / (2 * Math.PI) * (W2 - 20), Y = v => H2 / 2 - v * (H2 / 2 - 14); g2.clearRect(0, 0, W2, H2); g2.strokeStyle = T.line; g2.beginPath(); g2.moveTo(10, H2 / 2); g2.lineTo(W2 - 10, H2 / 2); g2.stroke(); [[Math.sin, T.green], [Math.cos, T.pink]].forEach(([f, c]) => { g2.strokeStyle = c; g2.lineWidth = 2; g2.beginPath(); for (let i = 0; i <= 200; i++) { const t = 2 * Math.PI * i / 200; i ? g2.lineTo(X(t), Y(f(t))) : g2.moveTo(X(t), Y(f(t))); } g2.stroke(); }); g2.strokeStyle = T.text; g2.setLineDash([3, 3]); g2.beginPath(); g2.moveTo(X(a % (2 * Math.PI)), 6); g2.lineTo(X(a % (2 * Math.PI)), H2 - 6); g2.stroke(); g2.setLineDash([]); [[sy, T.green], [cx, T.pink]].forEach(([v, c]) => { g2.fillStyle = c; g2.beginPath(); g2.arc(X(a % (2 * Math.PI)), Y(v), 5, 0, 7); g2.fill(); });
          const ex = EXACT[ang], deg = ang, rad = ang * Math.PI / 180, quad = ang % 90 === 0 ? tr('sobre un eje') : tr('cuadrante') + ' ' + (Math.floor(ang / 90) % 4 + 1);
          q(V, '[data-vals]').innerHTML = U.kv([['Ángulo', deg + '° = ' + (RADF[deg] || fmtN(rad, 4) + ' rad') + ' · ' + quad], ['sen θ', fmtN(sy, 4) + (ex ? ' = ' + ex[0] : '')], ['cos θ', fmtN(cx, 4) + (ex ? ' = ' + ex[1] : '')], ['tan θ', Math.abs(cx) < 1e-9 ? '∞ (' + tr('no definida') + ')' : fmtN(sy / cx, 4) + (ex ? ' = ' + ex[2] : '')], ['sen² θ + cos² θ', fmtN(sy * sy + cx * cx, 6)]]);
          const rg = q(V, '[data-ang]'); if (rg && +rg.value !== Math.round(ang)) rg.value = Math.round(ang);
        };
        const at = e => { const r = cv.getBoundingClientRect(), R = Math.min(r.width, r.height) * .36, ox = r.width / 2 - R * .2, oy = r.height / 2; let d = Math.atan2(-(e.clientY - r.top - oy), e.clientX - r.left - ox) * 180 / Math.PI; if (d < 0) d += 360; return Math.round(d); };
        cv.onpointerdown = e => { drag = true; cv.setPointerCapture(e.pointerId); ang = at(e); C.set('angle', ang); draw(); }; cv.onpointermove = e => { if (drag) { ang = at(e); C.set('angle', ang); draw(); } }; cv.onpointerup = () => { drag = false; };
        V.oninput = e => { if (e.target.matches('[data-ang]')) { ang = +e.target.value; C.set('angle', ang); draw(); } };
        V.onclick = e => { const s = e.target.closest('[data-sa]'); if (s) { ang = +s.dataset.sa; C.set('angle', ang); draw(); } };
        anim(dt => { const p = q(V, '[data-play]'); if (p && p.checked) { ang = (ang + dt * 40) % 360; draw(); } });
        const ro = new ResizeObserver(draw); ro.observe(cv); draw(); return () => ro.disconnect();
      }
      /* ---------- Oscilaciones ---------- */
      function osc() {
        const sys = C.get('sys', 'spring');
        V.innerHTML = `<h3>${esc(tr('Oscilaciones'))}</h3><div class="k9-row" style="flex-wrap:wrap"><select class="input-text" data-sys><option value="spring"${sys === 'spring' ? ' selected' : ''}>${esc(tr('Masa y muelle'))}</option><option value="pend"${sys === 'pend' ? ' selected' : ''}>${esc(tr('Péndulo'))}</option></select><button class="k9-btn pri" data-oa="play">⏯</button><button class="k9-btn" data-oa="reset">↺</button></div>
          <div class="s10-tm-grid" style="margin:8px 0">${(sys === 'spring' ? [['m', 'Masa (kg)', .1, 5, .1], ['k', 'Constante k (N/m)', 1, 100, 1], ['damp', 'Amortiguamiento b (kg/s)', 0, 3, .05], ['x0', 'Elongación inicial (m)', .05, .5, .01]] : [['L', 'Longitud (m)', .2, 3, .05], ['th0', 'Ángulo inicial (°)', 5, 170, 1], ['damp', 'Amortiguamiento', 0, 1, .01]]).map(([k, l, mn, mx, st]) => `<label class="k9-field">${esc(tr(l))}: <b data-ov="${k}">${C.get(k)}</b><input type="range" min="${mn}" max="${mx}" step="${st}" data-op="${k}" value="${C.get(k)}"></label>`).join('')}${sys === 'pend' ? `<label class="k9-field">${esc(tr('Gravedad'))}<select class="input-text" data-op="gv">${[[9.81, 'Tierra (9,81)'], [1.62, 'Luna (1,62)'], [3.71, 'Marte (3,71)'], [24.79, 'Júpiter (24,79)']].map(([v, l]) => `<option value="${v}"${+C.get('gv') === v ? ' selected' : ''}>${esc(tr(l))}</option>`).join('')}</select></label>` : ''}</div>
          <div class="s10-ml-two"><canvas class="s10-ml-cv" data-cv style="height:300px"></canvas><div><canvas class="s10-ml-cv" data-gr style="height:150px"></canvas><canvas class="s10-ml-cv" data-en style="height:60px"></canvas><div data-os class="k9-small"></div></div></div>`;
        let st = { x: 0, v: 0, t: 0 }, play = true, hist = [], cross = [], lastSign = 0, fr = 0;
        const P2 = () => ({ m: +C.get('m'), k: +C.get('k'), b: +C.get('damp'), x0: +C.get('x0'), L: +C.get('L'), th0: +C.get('th0') * Math.PI / 180, g: +C.get('gv') });
        const reset = () => { const p = P2(); st = { x: sys === 'spring' ? p.x0 : p.th0, v: 0, t: 0 }; hist = []; cross = []; lastSign = 0; };
        const acc = (x, v) => { const p = P2(); return sys === 'spring' ? (-p.k * x - p.b * v) / p.m : -(p.g / p.L) * Math.sin(x) - p.b * v; };
        const rk4 = h => { const { x, v } = st, k1x = v, k1v = acc(x, v), k2x = v + k1v * h / 2, k2v = acc(x + k1x * h / 2, k2x), k3x = v + k2v * h / 2, k3v = acc(x + k2x * h / 2, k3x), k4x = v + k3v * h, k4v = acc(x + k3x * h, k4x); st.x += h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x); st.v += h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v); st.t += h; };
        const energy = () => { const p = P2(); if (sys === 'spring') return [.5 * p.m * st.v * st.v, .5 * p.k * st.x * st.x]; return [.5 * 1 * (p.L * st.v) ** 2, 1 * p.g * p.L * (1 - Math.cos(st.x))]; };
        reset();
        anim(dt => {
          if (play) for (let i = 0; i < 10; i++) { const prev = st.x; rk4(dt / 10); const s = Math.sign(st.x); if (s && lastSign && s !== lastSign && prev * st.x <= 0) { cross.push(st.t); if (cross.length > 9) cross.shift(); } if (s) lastSign = s; }
          if (play) { hist.push([st.t, st.x]); while (hist.length && st.t - hist[0][0] > 10) hist.shift(); }
          const p = P2(), { g, w: W, h: H } = hidpi(q(V, '[data-cv]')), T = theme(); g.clearRect(0, 0, W, H);
          if (sys === 'spring') { const wallX = 30, cy = H / 2, scale = (W - 140) / 1.2, eq = wallX + (W - 140) / 2, xm = eq + st.x * scale; g.fillStyle = T.line; g.fillRect(10, cy - 60, 20, 120); g.strokeStyle = T.muted; g.lineWidth = 2; g.beginPath(); g.moveTo(wallX, cy); const n = 14; for (let i = 1; i <= n; i++) g.lineTo(wallX + (xm - 30 - wallX) * i / n, cy + (i === n ? 0 : (i % 2 ? -12 : 12))); g.lineTo(xm - 30, cy); g.stroke(); g.fillStyle = T.green; g.fillRect(xm - 30, cy - 30, 60, 60); g.fillStyle = '#fff'; g.font = '600 12px system-ui'; g.textAlign = 'center'; g.fillText(p.m + ' kg', xm, cy + 4); g.textAlign = 'left'; g.strokeStyle = T.pink; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(eq, cy - 70); g.lineTo(eq, cy + 70); g.stroke(); g.setLineDash([]); g.strokeStyle = T.line; g.beginPath(); g.moveTo(10, cy + 31); g.lineTo(W - 10, cy + 31); g.stroke(); }
          else { const ox = W / 2, oy = 20, Lp = (H - 60) * Math.min(1, p.L / 3 + .25), bx = ox + Lp * Math.sin(st.x), by = oy + Lp * Math.cos(st.x); g.strokeStyle = T.line; g.beginPath(); g.moveTo(ox - 60, oy); g.lineTo(ox + 60, oy); g.stroke(); g.strokeStyle = T.pink; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox, oy + Lp + 20); g.stroke(); g.setLineDash([]); g.strokeStyle = T.muted; g.lineWidth = 2; g.beginPath(); g.moveTo(ox, oy); g.lineTo(bx, by); g.stroke(); g.fillStyle = T.green; g.beginPath(); g.arc(bx, by, 16, 0, 7); g.fill(); }
          const { g: g2, w: W2, h: H2 } = hidpi(q(V, '[data-gr]')), amp = sys === 'spring' ? Math.max(p.x0, .01) : Math.max(p.th0, .01); g2.clearRect(0, 0, W2, H2); g2.strokeStyle = T.line; g2.beginPath(); g2.moveTo(0, H2 / 2); g2.lineTo(W2, H2 / 2); g2.stroke(); if (hist.length > 1) { const t0 = Math.max(0, st.t - 10); g2.strokeStyle = T.green; g2.lineWidth = 1.8; g2.beginPath(); hist.forEach(([t, x], i) => { const X = (t - t0) / 10 * W2, Y = H2 / 2 - x / amp * (H2 / 2 - 6); i ? g2.lineTo(X, Y) : g2.moveTo(X, Y); }); g2.stroke(); } g2.fillStyle = T.muted; g2.font = '11px system-ui'; g2.fillText(sys === 'spring' ? tr('posición x(t), últimos 10 s') : tr('ángulo θ(t), últimos 10 s'), 6, 12);
          const [Ek, Ep] = energy(), E0 = sys === 'spring' ? .5 * p.k * p.x0 * p.x0 : p.g * p.L * (1 - Math.cos(p.th0)), { g: g3, w: W3, h: H3 } = hidpi(q(V, '[data-en]')); g3.clearRect(0, 0, W3, H3); [[Ek, T.pink, tr('cinética')], [Ep, T.green, tr('potencial')], [Ek + Ep, T.text, tr('total')]].forEach(([v, c, l], i) => { const w2 = Math.min(1, v / (E0 || 1)) * (W3 - 90); g3.fillStyle = c; g3.fillRect(70, 4 + i * 18, w2, 12); g3.fillStyle = T.muted; g3.font = '11px system-ui'; g3.fillText(l, 4, 14 + i * 18); });
          if (++fr % 10 === 1) { const per = cross.length > 2 ? 2 * (cross[cross.length - 1] - cross[0]) / (cross.length - 1) : NaN, w0 = sys === 'spring' ? Math.sqrt(p.k / p.m) : Math.sqrt(p.g / p.L), gam = sys === 'spring' ? p.b / (2 * p.m) : p.b / 2, wd = Math.sqrt(Math.max(0, w0 * w0 - gam * gam)); q(V, '[data-os]').innerHTML = U.kv([['Tiempo', fmtN(st.t, 1) + ' s'], ['Periodo teórico (sin rozamiento' + (sys === 'pend' ? ', ángulo pequeño' : '') + ')', fmtN(2 * Math.PI / w0, 3) + ' s'], gam > 0 ? ['Periodo amortiguado', wd > 0 ? fmtN(2 * Math.PI / wd, 3) + ' s' : tr('sobreamortiguado (no oscila)')] : null, ['Periodo medido', Number.isFinite(per) ? fmtN(per, 3) + ' s' : '…'], ['Energía total', fmtN(Ek + Ep, 4) + ' J' + (E0 ? ' (' + fmtN((Ek + Ep) / E0 * 100, 1) + ' %)' : '')]]); }
        });
        V.onclick = e => { const a = e.target.closest('[data-oa]'); if (!a) return; if (a.dataset.oa === 'play') play = !play; else reset(); };
        V.oninput = e => { const o = e.target.closest('[data-op]'); if (!o) return; C.set(o.dataset.op, +o.value); const l = q(V, `[data-ov="${o.dataset.op}"]`); if (l) l.textContent = o.value; if (/^(x0|th0)$/.test(o.dataset.op)) reset(); };
        V.onchange = e => { if (e.target.matches('[data-sys]')) { C.set('sys', e.target.value); go(); } if (e.target.matches('select[data-op]')) { C.set('gv', +e.target.value); reset(); } };
        K.ext.mathlab = Object.assign(K.ext.mathlab || {}, { osc: () => ({ t: st.t, x: st.x, cross: cross.slice() }), oscReset: reset });
        return () => {};
      }
      const go = () => { stop(); V.onclick = V.oninput = V.onchange = null; qa(b, '[data-exp]').forEach(x => x.classList.toggle('on', x.dataset.exp === exp)); C.set('exp', exp); cleanup = ({ fourier, vectors, prob, trig, osc })[exp](); };
      b.addEventListener('click', e => { const x = e.target.closest('[data-exp]'); if (x) { exp = x.dataset.exp; go(); return; } const l = e.target.closest('[data-launch]'); if (l) E.launch(l.dataset.launch); });
      b.addEventListener('change', e => { if (e.target.matches('[data-wave]')) { C.set('wave', e.target.value); go(); } });
      b.addEventListener('input', e => { if (e.target.matches('[data-n]')) { C.set('N', +e.target.value); const l = q(b, '[data-nl]'); if (l) l.textContent = e.target.value; if (onN) onN(); } });
      go();
      this.onOpen = () => { if (!raf) go(); }; this.onClose = () => stop(); this.destroy = stop;
      K.ext.mathlab = Object.assign(K.ext.mathlab || {}, { go: k => { exp = k; go(); }, describe, fsum });
    }
  });

  /* ===================================================================
     Simulador de topología de red: equipos, enlaces con latencia, Dijkstra, ping/traceroute y subredes
     =================================================================== */
  const ip2n = s => { const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(s || '').trim()); if (!m) return null; const p = m.slice(1).map(Number); if (p.some(x => x > 255)) return null; return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]; };
  const n2ip = n => [24, 16, 8, 0].map(s => (n >>> s) & 255).join('.');
  const cidrMask = c => c <= 0 ? 0 : (0xffffffff << (32 - c)) >>> 0;
  function parseCidr(s) {
    const m = /^\s*([\d.]+)\s*(?:\/\s*(\d{1,2})|\s+([\d.]+))?\s*$/.exec(String(s || '')); if (!m) return null; const ip = ip2n(m[1]); if (ip == null) return null;
    let c = m[2] != null ? +m[2] : null; if (m[3]) { const mk = ip2n(m[3]); if (mk == null) return null; const bs = mk.toString(2).padStart(32, '0'); if (!/^1*0*$/.test(bs)) return null; c = bs.indexOf('0') < 0 ? 32 : bs.indexOf('0'); }
    if (c == null) { const a = ip >>> 24; c = a < 128 ? 8 : a < 192 ? 16 : 24; } if (c > 32) return null; return { ip, cidr: c };
  }
  function subnetInfo(ip, c) {
    const mask = cidrMask(c), net = (ip & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0, size = 2 ** (32 - c), a = ip >>> 24;
    const kind = a === 10 || (ip >>> 20) === 0xAC1 || (ip >>> 16) === 0xC0A8 ? 'privada (RFC 1918)' : a === 127 ? 'bucle local (loopback)' : (ip >>> 16) === 0xA9FE ? 'enlace local (APIPA)' : (ip >>> 22) === 0x191 ? 'CGNAT (RFC 6598)' : a >= 224 && a < 240 ? 'multidifusión' : a >= 240 ? 'reservada' : 'pública';
    return { net, bc, mask, wild: (~mask) >>> 0, size, hosts: c >= 31 ? (c === 32 ? 1 : 2) : size - 2, first: c >= 31 ? net : net + 1, last: c >= 31 ? bc : bc - 1, cls: a < 128 ? 'A' : a < 192 ? 'B' : a < 224 ? 'C' : a < 240 ? 'D' : 'E', kind };
  }
  const NT = { pc: ['PC', '🖥️'], laptop: ['Portátil', '💻'], server: ['Servidor', '🗄️'], switch: ['Switch', '🔀'], router: ['Router', '📡'], cloud: ['Internet', '☁️'] };
  const HOST = t => t === 'pc' || t === 'laptop' || t === 'server';
  const NPRE = {
    casa: { n: 'Red doméstica', nodes: [['I', 'cloud', 'Internet', '8.8.8.8/8', 450, 50], ['R', 'router', 'Router', '192.168.1.1/24', 450, 160], ['SW', 'switch', 'Switch', '', 450, 270], ['P1', 'pc', 'PC de Ana', '192.168.1.10/24', 250, 390], ['P2', 'laptop', 'Portátil', '192.168.1.11/24', 450, 400], ['NAS', 'server', 'NAS', '192.168.1.5/24', 650, 390]], links: [['I', 'R', 12], ['R', 'SW', 1], ['SW', 'P1', 1], ['SW', 'P2', 2], ['SW', 'NAS', 1]] },
    subredes: { n: 'Dos subredes y un router', nodes: [['R1', 'router', 'Router', '10.0.0.1/24', 450, 90], ['S1', 'switch', 'Switch A', '', 250, 220], ['S2', 'switch', 'Switch B', '', 650, 220], ['A1', 'pc', 'Aula 1', '192.168.1.10/24', 150, 370], ['A2', 'pc', 'Aula 2', '192.168.1.11/24', 330, 370], ['B1', 'pc', 'Oficina 1', '192.168.2.10/24', 570, 370], ['B2', 'server', 'Servidor', '192.168.2.2/24', 750, 370]], links: [['R1', 'S1', 1], ['R1', 'S2', 1], ['S1', 'A1', 1], ['S1', 'A2', 1], ['S2', 'B1', 1], ['S2', 'B2', 1], ['S1', 'S2', 1, false]] },
    malla: { n: 'Malla con rutas alternativas', nodes: [['PA', 'pc', 'Equipo A', '10.1.0.10/16', 90, 260], ['R1', 'router', 'R1', '10.1.0.1/16', 250, 260], ['R2', 'router', 'R2', '10.2.0.1/16', 450, 110], ['R3', 'router', 'R3', '10.3.0.1/16', 450, 410], ['R4', 'router', 'R4', '10.4.0.1/16', 650, 260], ['PB', 'server', 'Servidor B', '10.4.0.20/16', 810, 260]], links: [['PA', 'R1', 1], ['R1', 'R2', 5], ['R1', 'R3', 2], ['R2', 'R4', 5], ['R3', 'R4', 2], ['R2', 'R3', 1], ['R4', 'PB', 1]] }
  };
  function routeNet(net, a, b) {
    const N = new Map(net.nodes.map(n => [n.id, n])), dist = new Map([[a, 0]]), prev = new Map(), done = new Set();
    const adj = id => net.links.filter(l => l.up !== false && (l.a === id || l.b === id)).map(l => [l.a === id ? l.b : l.a, Math.max(.1, +l.cost || 1)]);
    for (;;) {
      let u = null, du = Infinity; dist.forEach((d, id) => { if (!done.has(id) && d < du) { du = d; u = id; } }); if (u == null) break; done.add(u); if (u === b) break;
      const nu = N.get(u); if (u !== a && HOST(nu.type)) continue;   // los equipos finales no reenvían paquetes
      adj(u).forEach(([v, c]) => { const nv = N.get(v); if (!nv || nv.up === false) return; const d = du + c; if (d < (dist.get(v) ?? Infinity)) { dist.set(v, d); prev.set(v, u); } });
    }
    if (!dist.has(b)) return null; const path = [b]; while (path[0] !== a) path.unshift(prev.get(path[0])); return { path, cost: dist.get(b) };
  }
  function pingNet(net, a, b) {
    const N = new Map(net.nodes.map(n => [n.id, n])), A = N.get(a), Bn = N.get(b);
    if (!A || !Bn) return { ok: false, err: 'Equipo desconocido' }; if (A.up === false) return { ok: false, err: 'El equipo de origen está apagado' };
    const pa = parseCidr(A.ip), pb = parseCidr(Bn.ip); if (!pa || !pb) return { ok: false, err: 'Falta una dirección IP válida en el origen o en el destino' };
    if (net.nodes.some(n => n !== A && n.ip && parseCidr(n.ip) && parseCidr(n.ip).ip === pa.ip)) return { ok: false, err: 'Conflicto: otra máquina tiene la misma dirección IP que el origen' };
    if (Bn.up === false) return { ok: false, err: 'Tiempo de espera agotado: el destino está apagado', timeout: true };
    const same = ((pa.ip & cidrMask(pa.cidr)) >>> 0) === ((pb.ip & cidrMask(pa.cidr)) >>> 0), any = routeNet(net, a, b);
    if (!any) return { ok: false, err: 'Destino inaccesible: no hay ningún camino (revisa cables y enlaces caídos)' };
    let r = any;
    if (!same) {   // otra subred: el paquete tiene que pasar por un router (puerta de enlace)
      r = null; net.nodes.filter(n => /router|cloud/.test(n.type) && n.up !== false && n.id !== a && n.id !== b).forEach(rt => { const r1 = routeNet(net, a, rt.id), r2 = r1 && routeNet(net, rt.id, b); if (r1 && r2 && (!r || r1.cost + r2.cost < r.cost)) r = { path: r1.path.concat(r2.path.slice(1)), cost: r1.cost + r2.cost }; });
      if (!r) return { ok: false, err: 'Red de destino inaccesible: las dos máquinas están en subredes distintas y no hay un router (puerta de enlace) entre ellas', path: any.path };
    }
    const routers = r.path.slice(1, -1).filter(id => /router|cloud/.test(N.get(id).type));
    return { ok: true, path: r.path, rtt: 2 * r.cost, ttl: 64 - routers.length, hops: r.path.length - 1, same };
  }
  K.netSim = { ip2n, n2ip, parseCidr, subnetInfo, routeNet, pingNet, cidrMask };
  K.define('nettopo', {
    init(b, w, arg) {
      const C = K.cfg('nettopo', { net: null, tab: 'topo', calc: '192.168.1.130/26', split: 4 });
      let net = { nodes: [], links: [] }, tool = 'select', sel = null, drag = null, linkFrom = null, anims = [], log = [], raf = 0, tab = C.get('tab', 'topo');
      const TOOLS = [['select', '↖', 'Seleccionar y mover'], ['pc', '🖥️', 'PC'], ['laptop', '💻', 'Portátil'], ['server', '🗄️', 'Servidor'], ['switch', '🔀', 'Switch'], ['router', '📡', 'Router'], ['cloud', '☁️', 'Internet'], ['link', '🔗', 'Cable'], ['erase', '🗑', 'Borrar']];
      const load = j => { net = { nodes: (j.nodes || []).filter(n => n && NT[n.type]).slice(0, 200).map(n => ({ id: String(n.id), type: n.type, name: String(n.name || n.id).slice(0, 40), ip: String(n.ip || '').slice(0, 40), x: +n.x || 0, y: +n.y || 0, up: n.up !== false })), links: (j.links || []).filter(l => l && l.a !== l.b).slice(0, 600).map(l => ({ id: l.id || E.uid(), a: String(l.a), b: String(l.b), cost: Math.max(.1, +l.cost || 1), up: l.up !== false })) }; sel = null; anims = []; };
      const save = () => C.set('net', net);
      const preset = k => { const p = NPRE[k]; load({ nodes: p.nodes.map(([id, type, name, ip, x, y]) => ({ id, type, name, ip, x, y })), links: p.links.map(([a, c, cost, up]) => ({ a, b: c, cost, up })) }); save(); log = []; addLog(tr('Ejemplo cargado') + ': ' + tr(p.n)); info(); };
      b.innerHTML = `<div class="k9 s10-nt">${U.tabs([['topo', 'Topología', 'network'], ['calc', 'Calculadora de subredes', 'calc']], tab)}<div data-topo class="s10-nt-topo"><div class="s10-ci-bar">${TOOLS.map(([k, g, l]) => `<button class="k9-btn ${k === tool ? 'on' : ''}" data-tool="${k}" title="${esc(tr(l))}"><b>${g}</b><span>${esc(tr(l))}</span></button>`).join('')}<span class="s10-wb-sep"></span><select class="input-text" data-pre><option value="">${esc(tr('Ejemplos…'))}</option>${Object.entries(NPRE).map(([k, p]) => `<option value="${k}">${esc(tr(p.n))}</option>`).join('')}</select><button class="k9-btn" data-a="more">${I('more', 14)}</button></div><div class="s10-ci-main"><canvas class="s10-ci-cv" data-cv tabindex="0" aria-label="${esc(tr('Mapa de la red'))}"></canvas><aside class="s10-ci-side" data-side></aside></div></div><div data-calc class="s10-nt-calc" hidden></div></div>`;
      const cv = q(b, '[data-cv]'), side = q(b, '[data-side]');
      const node = id => net.nodes.find(n => n.id === id), ptr = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      const hitNode = (x, y) => net.nodes.slice().reverse().find(n => Math.abs(n.x - x) < 34 && Math.abs(n.y - y) < 30);
      const hitLink = (x, y) => { let best = null, bd = 8; net.links.forEach(l => { const A = node(l.a), B2 = node(l.b); if (!A || !B2) return; const dx = B2.x - A.x, dy = B2.y - A.y, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - A.x) * dx + (y - A.y) * dy) / L)), d = Math.hypot(x - A.x - t * dx, y - A.y - t * dy); if (d < bd) { bd = d; best = l; } }); return best; };
      const addLog = (t, kind = '') => { log.unshift({ t, kind, at: Date.now() }); log = log.slice(0, 40); const el = q(side, '[data-log]'); if (el) el.innerHTML = logHtml(); };
      const logHtml = () => log.map(x => `<div class="${x.kind}">${esc(x.t)}</div>`).join('') || `<span class="k9-muted">${esc(tr('Aquí aparecen los resultados de ping y traceroute.'))}</span>`;
      function draw() {
        const { g, w: W, h: H } = hidpi(cv), T = theme(); g.clearRect(0, 0, W, H);
        net.links.forEach(l => { const A = node(l.a), B2 = node(l.b); if (!A || !B2) return; g.strokeStyle = l.up === false ? '#e5484d' : sel === l ? T.pink : T.muted; g.lineWidth = sel === l ? 3.5 : 2.2; g.setLineDash(l.up === false ? [6, 5] : []); g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B2.x, B2.y); g.stroke(); g.setLineDash([]); const L0 = Math.hypot(B2.x - A.x, B2.y - A.y) || 1, mx = (A.x + B2.x) / 2 + (-(B2.y - A.y) / L0) * 18, my = (A.y + B2.y) / 2 + ((B2.x - A.x) / L0) * 18; g.fillStyle = T.solid; g.fillRect(mx - 22, my - 9, 44, 18); g.fillStyle = l.up === false ? '#e5484d' : T.muted; g.font = '11px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(l.up === false ? tr('caído') : fmtN(l.cost, 1) + ' ms', mx, my); });
        if (linkFrom) { const A = node(linkFrom); if (A && drag && drag.p) { g.strokeStyle = T.pink; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(drag.p[0], drag.p[1]); g.stroke(); g.setLineDash([]); } }
        net.nodes.forEach(n => { const on = n.up !== false; g.globalAlpha = on ? 1 : .45; g.fillStyle = T.solid; g.strokeStyle = sel === n ? T.pink : n.id === linkFrom ? T.warn : n.type === 'router' || n.type === 'cloud' ? T.green : T.line; g.lineWidth = sel === n ? 3 : 2; g.beginPath(); g.roundRect ? g.roundRect(n.x - 30, n.y - 24, 60, 44, 10) : g.rect(n.x - 30, n.y - 24, 60, 44); g.fill(); g.stroke(); g.font = '24px system-ui, "Segoe UI Emoji", "Noto Color Emoji"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(NT[n.type][1], n.x, n.y - 2); g.fillStyle = T.text; g.font = '600 12px system-ui'; g.fillText(n.name, n.x, n.y + 34); if (n.ip) { g.fillStyle = T.muted; g.font = '11px system-ui'; g.fillText(n.ip, n.x, n.y + 49); } g.globalAlpha = 1; });
        anims.forEach(a => { const A = node(a.path[a.seg]), B2 = node(a.path[a.seg + 1]); if (!A || !B2) return; const x = A.x + (B2.x - A.x) * a.t, y = A.y + (B2.y - A.y) * a.t; g.fillStyle = a.color; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); });
      }
      function step(dt) {
        anims.forEach(a => { const A = node(a.path[a.seg]), B2 = node(a.path[a.seg + 1]); const l = A && B2 && net.links.find(x => (x.a === A.id && x.b === B2.id) || (x.b === A.id && x.a === B2.id)); const dur = .22 + Math.min(1, (l ? l.cost : 1) * .03); a.t += dt / dur; while (a.t >= 1) { a.t -= 1; a.seg++; if (a.seg >= a.path.length - 1) { a.done = true; break; } } });
        const fin = anims.filter(a => a.done); anims = anims.filter(a => !a.done); fin.forEach(a => a.onDone && a.onDone());
      }
      const loop = t => { const dt = Math.min(.05, loop.l ? (t - loop.l) / 1000 : .016); loop.l = t; if (b.isConnected && cv.offsetParent) { step(dt); draw(); } raf = requestAnimationFrame(loop); };
      function ping(a, c, trace) {
        const A = node(a), Bn = node(c), r = pingNet(net, a, c);
        if (!r.ok) { addLog(`✗ ${A.name} → ${Bn ? Bn.name : '?'}: ${tr(r.err)}`, 'bad'); if (r.path && r.path.length > 1) anims.push({ path: r.path.slice(0, 2), seg: 0, t: 0, color: '#e5484d' }); return r; }
        anims.push({ path: r.path, seg: 0, t: 0, color: theme().warn, onDone: () => { anims.push({ path: r.path.slice().reverse(), seg: 0, t: 0, color: theme().green, onDone: () => addLog(`✓ ${tr('Respuesta de')} ${Bn.ip.split('/')[0]} (${Bn.name}): ${tr('tiempo')}=${fmtN(r.rtt, 1)} ms TTL=${r.ttl}`, 'ok') }); } });
        if (trace) addLog(`${tr('Traceroute a')} ${Bn.name}: ` + r.path.slice(1).map((id, i) => `${i + 1}. ${node(id).name}`).join(' → '));
        return r;
      }
      function routes(src) {
        return net.nodes.filter(n => n.id !== src.id && parseCidr(n.ip)).map(n => { const r = routeNet(net, src.id, n.id), p = parseCidr(n.ip), si2 = subnetInfo(p.ip, p.cidr); return { dest: n.name, netw: n2ip(si2.net) + '/' + p.cidr, next: r && r.path.length > 1 ? node(r.path[1]).name : '—', cost: r ? r.cost : null, hops: r ? r.path.length - 1 : null }; }).sort((x, y) => (x.cost ?? 1e9) - (y.cost ?? 1e9));
      }
      function info() {
        const s = sel;
        let h = '';
        if (s && s.type) {
          const others = net.nodes.filter(n => n !== s && n.ip), p = parseCidr(s.ip), dup = p && net.nodes.some(n => n !== s && parseCidr(n.ip) && parseCidr(n.ip).ip === p.ip), rt = routes(s);
          h = `<b>${NT[s.type][1]} ${esc(tr(NT[s.type][0]))}</b><label class="k9-field">${esc(tr('Nombre'))}<input class="input-text" data-nf="name" value="${esc(s.name)}"></label>${s.type !== 'switch' ? `<label class="k9-field">${esc(tr('Dirección IP / prefijo'))}<input class="input-text" data-nf="ip" value="${esc(s.ip)}" placeholder="192.168.1.10/24" spellcheck="false"></label>${s.ip && !p ? `<p class="s10-hc-bad k9-small">${esc(tr('Dirección no válida'))}</p>` : ''}${dup ? `<p class="s10-hc-bad k9-small">⚠ ${esc(tr('Otra máquina usa la misma IP'))}</p>` : ''}${p ? `<p class="k9-small k9-muted">${esc(tr('Red'))} ${n2ip(subnetInfo(p.ip, p.cidr).net)}/${p.cidr} · ${esc(tr('máscara'))} ${n2ip(cidrMask(p.cidr))}</p>` : ''}` : `<p class="k9-small k9-muted">${esc(tr('Un switch une equipos de la misma red local; no necesita IP.'))}</p>`}
            <label class="k9-row k9-small"><input type="checkbox" data-nf="up" ${s.up !== false ? 'checked' : ''}> ${esc(tr('Encendido'))}</label>
            ${s.type !== 'switch' && others.length ? `<div class="k9-row" style="flex-wrap:wrap"><select class="input-text" data-pt>${others.map(n => `<option value="${esc(n.id)}">${esc(n.name)} (${esc(n.ip.split('/')[0])})</option>`).join('')}</select><button class="k9-btn pri" data-a="ping">Ping</button><button class="k9-btn" data-a="trace">Traceroute</button></div>` : ''}
            ${rt.length ? `<details ${s.type === 'router' ? 'open' : ''}><summary class="k9-small"><b>${esc(tr('Tabla de rutas (Dijkstra)'))}</b></summary><table class="k9-table s10-nt-rt"><thead><tr><th>${esc(tr('Destino'))}</th><th>${esc(tr('Red'))}</th><th>${esc(tr('Siguiente salto'))}</th><th>${esc(tr('Coste'))}</th></tr></thead><tbody>${rt.map(r => `<tr><td>${esc(r.dest)}</td><td>${esc(r.netw)}</td><td>${esc(r.next)}</td><td>${r.cost == null ? '∞' : fmtN(r.cost, 1) + ' ms'}</td></tr>`).join('')}</tbody></table></details>` : ''}
            <button class="k9-btn dng" data-a="del">${I('trash', 13)} ${esc(tr('Eliminar equipo'))}</button><hr>`;
        } else if (s) {
          const A = node(s.a), B2 = node(s.b); h = `<b>🔗 ${esc(A ? A.name : '?')} ↔ ${esc(B2 ? B2.name : '?')}</b><label class="k9-field">${esc(tr('Latencia / coste (ms)'))}<input class="input-text" type="number" min="0.1" max="1000" step="0.1" data-lf="cost" value="${s.cost}"></label><label class="k9-row k9-small"><input type="checkbox" data-lf="up" ${s.up !== false ? 'checked' : ''}> ${esc(tr('Enlace activo (desmárcalo para simular una avería)'))}</label><button class="k9-btn dng" data-a="del">${I('trash', 13)} ${esc(tr('Quitar cable'))}</button><hr>`;
        } else h = `<p class="k9-small k9-muted">${esc(tr('Añade equipos con la barra superior, únelos con «Cable» (toca un equipo y luego otro) y selecciona uno para darle una IP y hacer ping. Toca un cable para cambiar su latencia o simular que se corta.'))}</p>`;
        side.innerHTML = h + `<b class="k9-small">${esc(tr('Consola'))}</b><div class="s10-nt-log" data-log>${logHtml()}</div>`;
      }
      const setTool = t => { tool = t; linkFrom = null; qa(b, '[data-tool]').forEach(x => x.classList.toggle('on', x.dataset.tool === t)); cv.style.cursor = t === 'select' ? 'default' : 'crosshair'; };
      cv.addEventListener('pointerdown', e => {
        const [x, y] = ptr(e), n = hitNode(x, y); cv.setPointerCapture(e.pointerId);
        if (tool === 'erase') { if (n) { net.nodes = net.nodes.filter(z => z !== n); net.links = net.links.filter(l => l.a !== n.id && l.b !== n.id); } else { const l = hitLink(x, y); if (l) net.links = net.links.filter(z => z !== l); } sel = null; save(); info(); return; }
        if (tool === 'link') { if (!n) { linkFrom = null; return; } if (!linkFrom) { linkFrom = n.id; drag = { kind: 'link', p: [x, y] }; return; } if (linkFrom !== n.id && !net.links.some(l => (l.a === linkFrom && l.b === n.id) || (l.b === linkFrom && l.a === n.id))) { net.links.push({ id: E.uid(), a: linkFrom, b: n.id, cost: 1, up: true }); save(); } linkFrom = null; drag = null; info(); return; }
        if (NT[tool]) { const used = new Set(net.nodes.map(z => z.id)); let k = 1; const pre = { pc: 'PC', laptop: 'L', server: 'SRV', switch: 'SW', router: 'R', cloud: 'NET' }[tool]; while (used.has(pre + k)) k++; const nn = { id: pre + k, type: tool, name: tr(NT[tool][0]) + ' ' + k, ip: '', x, y, up: true }; net.nodes.push(nn); sel = nn; save(); info(); setTool('select'); return; }
        if (n) { sel = n; drag = { kind: 'move', n, d: [x - n.x, y - n.y] }; } else { sel = hitLink(x, y); drag = null; } info();
      });
      cv.addEventListener('pointermove', e => { const [x, y] = ptr(e); if (drag && drag.kind === 'move') { drag.n.x = x - drag.d[0]; drag.n.y = y - drag.d[1]; drag.moved = true; } if (drag && drag.kind === 'link') drag.p = [x, y]; });
      cv.addEventListener('pointerup', e => { if (drag && drag.kind === 'move' && drag.moved) save(); if (drag && drag.kind === 'link') { const [x, y] = ptr(e), n = hitNode(x, y); if (n && n.id !== linkFrom) { if (!net.links.some(l => (l.a === linkFrom && l.b === n.id) || (l.b === linkFrom && l.a === n.id))) { net.links.push({ id: E.uid(), a: linkFrom, b: n.id, cost: 1, up: true }); save(); } linkFrom = null; info(); } } if (!drag || drag.kind !== 'link') drag = null; else drag = { kind: 'link', p: drag.p }; });
      cv.addEventListener('keydown', e => { if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { if (sel.type) { net.nodes = net.nodes.filter(z => z !== sel); net.links = net.links.filter(l => l.a !== sel.id && l.b !== sel.id); } else net.links = net.links.filter(l => l !== sel); sel = null; save(); info(); } if (e.key === 'Escape') { setTool('select'); sel = null; info(); } });
      // calculadora de subredes
      function drawCalc() {
        const P = q(b, '[data-calc]'), v = C.get('calc', '192.168.1.130/26'), p = parseCidr(v), n = Math.max(2, Math.min(256, +C.get('split', 4) || 4));
        let body = ''; if (!p) body = `<p class="s10-hc-bad">${esc(tr('Escribe una dirección como 192.168.1.130/26 o 10.0.0.1 255.255.0.0'))}</p>`; else { const i2 = subnetInfo(p.ip, p.cidr), bits = Math.ceil(Math.log2(n)), nc = p.cidr + bits; body = U.kv([['Dirección', n2ip(p.ip)], ['Prefijo y máscara', '/' + p.cidr + ' · ' + n2ip(i2.mask)], ['Máscara comodín (wildcard)', n2ip(i2.wild)], ['Red', n2ip(i2.net)], ['Difusión (broadcast)', n2ip(i2.bc)], ['Primer y último equipo', n2ip(i2.first) + ' – ' + n2ip(i2.last)], ['Equipos utilizables', i2.hosts.toLocaleString(K.locale)], ['Clase · tipo', i2.cls + ' · ' + tr(i2.kind)], ['Máscara en binario', i2.mask.toString(2).padStart(32, '0').replace(/(.{8})(?!$)/g, '$1.')]]) + `<h4 style="margin:14px 0 6px">${esc(tr('Dividir en'))} <input class="input-text" type="number" min="2" max="256" data-split value="${n}" style="width:80px;display:inline-block"> ${esc(tr('subredes'))}</h4>` + (nc > 32 ? `<p class="s10-hc-bad">${esc(tr('No caben tantas subredes en este prefijo'))}</p>` : `<p class="k9-small k9-muted">/${nc} · ${(2 ** bits)} ${esc(tr('subredes de'))} ${(2 ** (32 - nc)).toLocaleString(K.locale)} ${esc(tr('direcciones'))}</p><table class="k9-table"><thead><tr><th>#</th><th>${esc(tr('Red'))}</th><th>${esc(tr('Equipos'))}</th><th>${esc(tr('Difusión'))}</th></tr></thead><tbody>${Array.from({ length: Math.min(2 ** bits, 256) }, (_, k) => { const nn = (i2.net + k * 2 ** (32 - nc)) >>> 0, s2 = subnetInfo(nn, nc); return `<tr><td>${k + 1}</td><td>${n2ip(nn)}/${nc}</td><td>${n2ip(s2.first)} – ${n2ip(s2.last)}</td><td>${n2ip(s2.bc)}</td></tr>`; }).join('')}</tbody></table>`); }
        P.innerHTML = `<label class="k9-field">${esc(tr('Dirección IP con prefijo o máscara'))}<input class="input-text" data-calcin value="${esc(v)}" spellcheck="false"></label><div data-calcout>${body}</div>`;
      }
      const showTab = () => { qa(b, '[data-tab]').forEach(t => { t.classList.toggle('on', t.dataset.tab === tab); t.setAttribute('aria-selected', t.dataset.tab === tab); }); q(b, '[data-topo]').hidden = tab !== 'topo'; q(b, '[data-calc]').hidden = tab !== 'calc'; C.set('tab', tab); if (tab === 'calc') drawCalc(); };
      b.addEventListener('click', async e => {
        const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; showTab(); return; }
        const tl = e.target.closest('[data-tool]'); if (tl) { setTool(tl.dataset.tool); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if ((k === 'ping' || k === 'trace') && sel && sel.type) ping(sel.id, q(side, '[data-pt]').value, k === 'trace');
        if (k === 'del' && sel) { if (sel.type) { net.nodes = net.nodes.filter(z => z !== sel); net.links = net.links.filter(l => l.a !== sel.id && l.b !== sel.id); } else net.links = net.links.filter(l => l !== sel); sel = null; save(); info(); }
        if (k === 'more') { const r = a.getBoundingClientRect(); K.ui.menu(r.left, r.bottom + 4, [
          { label: tr('Guardar como .eisnet'), icon: '💾', act: () => U.saveBlob(tr('Red') + '.eisnet', new Blob([JSON.stringify({ app: 'EISENKU network', v: 1, nodes: net.nodes, links: net.links })], { type: 'application/json' }), 'documents') },
          { label: tr('Abrir .eisnet…'), icon: '📂', act: async () => { const f = await U.pickBlob({ title: tr('Red (.eisnet)'), accept: x => /\.eisnet$/i.test(x.name), deviceAccept: '.eisnet,application/json' }); if (f) openFile(f); } },
          { label: tr('Exportar imagen PNG'), icon: '🖼', act: async () => { const bl = await new Promise(r => cv.toBlob(r, 'image/png')); if (bl) U.saveBlob(tr('Red') + '.png', bl, 'images'); } },
          { label: tr('Ping entre todos los equipos'), icon: '📶', act: () => { const hs = net.nodes.filter(n => n.ip && n.type !== 'switch'); let ok = 0, tot = 0; hs.forEach(x => hs.forEach(y => { if (x !== y) { tot++; if (pingNet(net, x.id, y.id).ok) ok++; } })); addLog(`${tr('Conectividad')}: ${ok}/${tot} ${tr('pares se comunican')}`, ok === tot ? 'ok' : 'bad'); } },
          { sep: true }, { label: tr('Vaciar la red'), icon: '🧹', danger: true, act: () => { net = { nodes: [], links: [] }; sel = null; save(); info(); } }]); }
      });
      b.addEventListener('change', e => {
        if (e.target.matches('[data-pre]') && e.target.value) { preset(e.target.value); e.target.value = ''; return; }
        const nf = e.target.closest('[data-nf]'); if (nf && sel && sel.type) { const k = nf.dataset.nf; if (k === 'up') sel.up = nf.checked; else sel[k] = nf.value.trim().slice(0, 40); save(); info(); return; }
        const lf = e.target.closest('[data-lf]'); if (lf && sel && !sel.type) { if (lf.dataset.lf === 'up') { sel.up = lf.checked; addLog(`${tr(sel.up ? 'Enlace restablecido' : 'Enlace caído')}: ${node(sel.a).name} ↔ ${node(sel.b).name}`, sel.up ? 'ok' : 'bad'); } else sel.cost = Math.max(.1, Math.min(1000, +lf.value || 1)); save(); info(); }
        if (e.target.matches('[data-split]')) { C.set('split', +e.target.value); drawCalc(); }
      });
      b.addEventListener('input', U.debounce(e => { if (e.target.matches('[data-calcin]')) { C.set('calc', e.target.value); const pos = e.target.selectionStart; drawCalc(); const i = q(b, '[data-calcin]'); i.focus(); i.setSelectionRange(pos, pos); } }, 300));
      async function openFile(f) { try { const j = JSON.parse(await f.blob.text()); if (!Array.isArray(j.nodes)) throw 0; load(j); save(); info(); } catch { E.toast(tr('Archivo de red no válido')); } }
      const sv = C.get('net', null); if (sv && sv.nodes && sv.nodes.length) load(sv); else preset('casa');
      const argFile = async a => { const f = fid(a) && await F.get(fid(a)); if (f) openFile(f); };
      info(); showTab(); raf = requestAnimationFrame(loop); argFile(arg);
      this.onOpen = (bb, ww, a) => argFile(a); this.destroy = () => cancelAnimationFrame(raf);
      K.ext.nettopo = { net: () => net, preset, ping: (a, c) => ping(a, c), pingNet: (a, c) => pingNet(net, a, c), routes: id => routes(node(id)), log: () => log, anims: () => anims.length, setLink: (a, c, o) => { const l = net.links.find(x => (x.a === a && x.b === c) || (x.a === c && x.b === a)); Object.assign(l, o); save(); } };
    }
  });

  /* ===================================================================
     Centro de aprendizaje de informática: 8 lecciones interactivas con ejercicios y progreso
     =================================================================== */
  // algoritmos de ordenación como generadores (cada paso: comparación o escritura)
  const SORTS = {
    bubble: { n: 'Burbuja', o: 'O(n²)', *run(a) { const n = a.length; for (let i = 0; i < n - 1; i++) { let sw = false; for (let j = 0; j < n - 1 - i; j++) { yield { c: [j, j + 1] }; if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; sw = true; yield { s: [j, j + 1] }; } } yield { fixed: n - 1 - i }; if (!sw) break; } } },
    selection: { n: 'Selección', o: 'O(n²)', *run(a) { const n = a.length; for (let i = 0; i < n - 1; i++) { let m = i; for (let j = i + 1; j < n; j++) { yield { c: [m, j] }; if (a[j] < a[m]) m = j; } if (m !== i) { [a[i], a[m]] = [a[m], a[i]]; yield { s: [i, m] }; } yield { fixed: i }; } } },
    insertion: { n: 'Inserción', o: 'O(n²), O(n) casi ordenada', *run(a) { for (let i = 1; i < a.length; i++) { let j = i; while (j > 0) { yield { c: [j - 1, j] }; if (a[j - 1] <= a[j]) break; [a[j - 1], a[j]] = [a[j], a[j - 1]]; yield { s: [j - 1, j] }; j--; } } } },
    merge: { n: 'Mezcla (merge sort)', o: 'O(n log n)', *run(a) { const tmp = a.slice(); function* ms(lo, hi) { if (hi - lo < 2) return; const mid = (lo + hi) >> 1; yield* ms(lo, mid); yield* ms(mid, hi); let i = lo, j = mid, k = lo; while (i < mid && j < hi) { yield { c: [i, j] }; tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++]; } while (i < mid) tmp[k++] = a[i++]; while (j < hi) tmp[k++] = a[j++]; for (let x = lo; x < hi; x++) { a[x] = tmp[x]; yield { w: x }; } } yield* ms(0, a.length); } },
    quick: { n: 'Rápida (quicksort)', o: 'O(n log n) medio, O(n²) peor', *run(a) { function* qs(lo, hi) { if (lo >= hi) return; const p = a[hi]; let i = lo; for (let j = lo; j < hi; j++) { yield { c: [j, hi] }; if (a[j] < p) { [a[i], a[j]] = [a[j], a[i]]; if (i !== j) yield { s: [i, j] }; i++; } } [a[i], a[hi]] = [a[hi], a[i]]; yield { s: [i, hi] }; yield* qs(lo, i - 1); yield* qs(i + 1, hi); } yield* qs(0, a.length - 1); } }
  };
  const CPUPROG = {
    suma: { n: 'Sumar dos números', mem: ['LOAD 14', 'ADD 15', 'OUT', 'HLT', '', '', '', '', '', '', '', '', '', '', '7', '5'] },
    cuenta: { n: 'Cuenta atrás', mem: ['LOAD 15', 'OUT', 'SUB 14', 'STORE 15', 'JZ 6', 'JMP 1', 'OUT', 'HLT', '', '', '', '', '', '', '1', '5'] },
    mult: { n: 'Multiplicar sumando (6 × 3)', mem: ['LOAD 12', 'ADD 13', 'STORE 12', 'LOAD 14', 'SUB 15', 'STORE 14', 'JZ 8', 'JMP 0', 'LOAD 12', 'OUT', 'HLT', '', '0', '6', '3', '1'] }
  };
  function cpuStep(st) {   // ejecuta una instrucción completa (captación, decodificación, ejecución)
    if (st.halt) return st; const ins = String(st.mem[st.pc] || '').trim().toUpperCase(), [op, arg] = ins.split(/\s+/), ad = parseInt(arg, 10), val = i => { const v = parseInt(st.mem[i], 10); return Number.isFinite(v) ? v : 0; };
    st.ir = ins || '(vacío)'; st.pc = (st.pc + 1) % 16; st.steps++;
    switch (op) {
      case 'LOAD': st.acc = val(ad); break; case 'STORE': st.mem[ad] = String(st.acc); break; case 'ADD': st.acc = (st.acc + val(ad)) & 255; break; case 'SUB': st.acc = (st.acc - val(ad) + 256) & 255; break;
      case 'JMP': st.pc = ad; break; case 'JZ': if (st.acc === 0) st.pc = ad; break; case 'OUT': st.out.push(st.acc); break; case 'HLT': st.halt = true; break; default: st.halt = true; st.err = tr('Instrucción desconocida') + ': ' + (ins || tr('celda vacía'));
    }
    st.z = st.acc === 0; if (st.steps > 500) { st.halt = true; st.err = tr('Demasiados pasos (¿bucle infinito?)'); } return st;
  }
  K.cs = { SORTS, cpuStep, CPUPROG };
  const LES = [
    { id: 'bin', ic: '01', n: 'Números binarios y hexadecimales', intro: 'Un ordenador guarda todo con bits: 0 o 1. Cada posición vale el doble que la de su derecha (1, 2, 4, 8, 16, 32, 64 y 128), así que 8 bits —un byte— representan números del 0 al 255. El hexadecimal agrupa 4 bits en un solo dígito (0–9 y A–F) y por eso se usa para escribir colores, direcciones de memoria o códigos de error.' },
    { id: 'logic', ic: '⊻', n: 'Puertas lógicas', intro: 'Los circuitos del procesador combinan señales con puertas lógicas. AND da 1 solo si las dos entradas son 1; OR, si al menos una lo es; NOT invierte; XOR da 1 cuando las entradas son distintas; NAND y NOR son AND y OR invertidas. Con suficientes NAND se puede construir cualquier otro circuito, incluido un sumador.' },
    { id: 'sort', ic: '📊', n: 'Algoritmos de ordenación', intro: 'Ordenar es una de las tareas más comunes. La burbuja, la selección y la inserción comparan casi todos los pares (del orden de n²). La mezcla y la rápida dividen el problema en mitades y necesitan del orden de n·log n comparaciones: con 1000 elementos son unas 10 000 en lugar de 500 000.' },
    { id: 'search', ic: '🔍', n: 'Búsqueda lineal y binaria', intro: 'La búsqueda lineal mira los elementos uno a uno. La binaria, si la lista está ordenada, mira el centro y descarta la mitad en cada paso: con 1000 elementos le bastan 10 pasos y con un millón, 20.' },
    { id: 'ds', ic: '🧱', n: 'Pilas y colas', intro: 'Una pila funciona como un montón de platos: el último en entrar es el primero en salir (LIFO). La usa el botón Deshacer o la memoria de llamadas de un programa. Una cola es como la fila del súper: el primero en llegar es el primero en salir (FIFO). La usan la impresora o los mensajes.' },
    { id: 'rec', ic: '🌀', n: 'Recursión', intro: 'Una función recursiva se llama a sí misma con un problema más pequeño hasta llegar a un caso base que se resuelve directamente. Las Torres de Hanói se resuelven así: mover n discos = mover n−1 a la torre auxiliar, mover el mayor y volver a mover los n−1 encima. Necesita 2ⁿ − 1 movimientos.' },
    { id: 'cpu', ic: '🧠', n: 'La CPU por dentro', intro: 'La CPU repite sin parar un ciclo: capta la instrucción a la que apunta el contador de programa (PC), la decodifica y la ejecuta. El acumulador (ACC) guarda el resultado de las operaciones. Esta CPU de juguete tiene 16 celdas de memoria y 8 instrucciones: LOAD, STORE, ADD, SUB, JMP, JZ (salta si ACC es 0), OUT y HLT.' },
    { id: 'net', ic: '🌐', n: 'Cómo viaja una página web', intro: 'Al abrir una dirección, el navegador pregunta al DNS la IP del servidor, abre una conexión TCP (saludo en tres pasos), la cifra con TLS y pide la página con HTTP. Cada capa añade su cabecera: HTTP dentro de TCP (puertos), dentro de IP (direcciones) y dentro de la trama de enlace (Wi-Fi o Ethernet).' }
  ];
  const EXS = {
    bin: () => { const a = 1 + rnd(255), bb = 1 + rnd(255), h = 16 + rnd(240); return [{ q: `¿Cómo se escribe ${a} en binario?`, num: a.toString(2), fmt: 'bin' }, { q: `¿Qué número decimal es el binario ${bb.toString(2).padStart(8, '0')}?`, num: String(bb) }, { q: `¿Cuánto vale 0x${h.toString(16).toUpperCase()} en decimal?`, num: String(h) }]; },
    logic: () => [{ q: '¿Qué puerta da 1 solo cuando sus dos entradas son distintas?', opts: ['AND', 'OR', 'XOR', 'NAND'], a: 2 }, { q: 'Si A = 1 y B = 1, ¿cuánto vale A NAND B?', opts: ['0', '1'], a: 0 }, { q: '¿Con qué puerta, repetida, se puede construir cualquier circuito digital?', opts: ['XOR', 'NAND', 'NOT'], a: 1 }],
    sort: () => [{ q: '¿Qué algoritmo necesita del orden de n·log n comparaciones?', opts: ['Burbuja', 'Selección', 'Mezcla'], a: 2 }, { q: 'En el peor caso, ¿cuántas comparaciones hace la burbuja con 5 elementos? (4 + 3 + 2 + 1)', num: '10' }, { q: '¿Cuál es más rápido con una lista que ya está casi ordenada?', opts: ['Inserción', 'Selección'], a: 0 }],
    search: () => [{ q: 'Con 1000 elementos ordenados, ¿cuántos pasos necesita como máximo la búsqueda binaria?', num: '10' }, { q: '¿Funciona la búsqueda binaria en una lista desordenada?', opts: ['Sí', 'No'], a: 1 }, { q: '¿Y con 1 000 000 de elementos?', num: '20' }],
    ds: () => [{ q: 'Pila vacía: meter A, meter B, sacar, meter C, sacar, sacar. ¿Qué letra sale en el último «sacar»?', opts: ['A', 'B', 'C'], a: 0 }, { q: 'Cola vacía: encolar 1, 2 y 3; desencolar. ¿Qué número sale?', num: '1' }, { q: '¿Qué estructura usa el botón «Deshacer» de un editor?', opts: ['Pila', 'Cola'], a: 0 }],
    rec: () => [{ q: '¿Cuántos movimientos mínimos hacen falta para 5 discos de Hanói?', num: '31' }, { q: 'factorial(5) = 5 × 4 × 3 × 2 × 1 = ?', num: '120' }, { q: '¿Qué necesita toda función recursiva para no repetirse para siempre?', opts: ['Un caso base', 'Un bucle while', 'Una variable global'], a: 0 }],
    cpu: () => [{ q: 'Con 7 en la celda 14 y 5 en la 15, tras LOAD 14 y ADD 15, ¿qué valor tiene ACC?', num: '12' }, { q: '¿Qué registro indica la siguiente instrucción que se va a ejecutar?', opts: ['PC', 'ACC', 'IR'], a: 0 }, { q: '¿En qué fase se lee la instrucción de la memoria?', opts: ['Captación', 'Decodificación', 'Ejecución'], a: 0 }],
    net: () => [{ q: '¿Qué servicio traduce un nombre como ejemplo.org en una dirección IP?', opts: ['DNS', 'HTTP', 'TCP'], a: 0 }, { q: '¿En qué capa están las direcciones IP?', opts: ['Red', 'Enlace', 'Aplicación'], a: 0 }, { q: '¿Qué puerto usa HTTPS por defecto?', num: '443' }]
  };
  K.define('cslearn', {
    init(b) {
      const PK = 'os10_cslearn', prog = () => S.get(PK, {}) || {}, setProg = (id, i, ok) => { const p = prog(); const l = p[id] = p[id] || { ok: [], tries: 0 }; l.tries++; if (ok && !l.ok.includes(i)) l.ok.push(i); p[id] = l; S.set(PK, p); };
      let cur = null, exs = [], stopW = null;
      b.innerHTML = `<div class="k9 s10-cs" data-v></div>`; const V = q(b, '[data-v]');
      const pct = id => Math.round(((prog()[id] || { ok: [] }).ok.length / 3) * 100);
      function home() {
        if (stopW) { stopW(); stopW = null; } cur = null; const tot = Math.round(LES.reduce((a, l) => a + pct(l.id), 0) / LES.length);
        V.innerHTML = `<div class="s10-cs-home"><h3>${esc(tr('Centro de aprendizaje de informática'))}</h3><p class="k9-small k9-muted">${esc(tr('Ocho lecciones con algo que tocar y ejercicios para comprobar lo aprendido. Tu progreso se guarda en este equipo.'))}</p><div class="k9-row"><div class="k9-meter" style="flex:1"><i style="width:${tot}%"></i></div><b>${tot} %</b></div><div class="s10-cs-grid">${LES.map((l, i) => `<button class="k9-card s10-cs-card" data-les="${l.id}"><span class="s10-cs-ic">${l.ic}</span><b>${i + 1}. ${esc(tr(l.n))}</b><div class="k9-meter"><i style="width:${pct(l.id)}%"></i></div><small class="k9-muted">${pct(l.id) === 100 ? '✓ ' + esc(tr('Completada')) : pct(l.id) + ' %'}</small></button>`).join('')}</div><button class="k9-btn" data-a="resetp">${esc(tr('Borrar mi progreso'))}</button></div>`;
      }
      function lesson(id) {
        if (stopW) { stopW(); stopW = null; } cur = id; const L = LES.find(l => l.id === id), i = LES.indexOf(L); exs = EXS[id]();
        V.innerHTML = `<div class="s10-cs-les"><div class="k9-row"><button class="k9-btn" data-a="home">← ${esc(tr('Lecciones'))}</button><span style="flex:1"></span>${i > 0 ? `<button class="k9-btn" data-les="${LES[i - 1].id}">‹</button>` : ''}${i < LES.length - 1 ? `<button class="k9-btn" data-les="${LES[i + 1].id}">›</button>` : ''}</div><h3>${L.ic} ${esc(tr(L.n))}</h3><p class="s10-cs-intro">${esc(tr(L.intro))}</p><div class="k9-card s10-cs-w" data-w></div><h4>${esc(tr('Ejercicios'))}</h4><div data-ex></div><button class="k9-btn" data-a="newex">↻ ${esc(tr('Otros ejercicios'))}</button></div>`;
        drawEx(); stopW = (W[id] || (() => null))(q(V, '[data-w]')) || null;
      }
      function drawEx() { const p = prog()[cur] || { ok: [] }; q(V, '[data-ex]').innerHTML = exs.map((x, i) => `<div class="s10-cs-q ${p.ok.includes(i) ? 'done' : ''}" data-q="${i}"><p>${i + 1}. ${esc(tr(x.q))}</p>${x.opts ? `<div class="k9-row" style="flex-wrap:wrap">${x.opts.map((o, j) => `<button class="k9-btn" data-ans="${j}">${esc(tr(o))}</button>`).join('')}</div>` : `<div class="k9-row"><input class="input-text" data-num style="width:160px" inputmode="${x.fmt === 'bin' ? 'numeric' : 'decimal'}"><button class="k9-btn pri" data-a="check">${esc(tr('Comprobar'))}</button></div>`}<div class="s10-cs-fb" data-fb></div></div>`).join(''); }
      function answer(qi, ok, msg) { setProg(cur, qi, ok); const el = q(V, `[data-q="${qi}"]`); el.classList.toggle('done', ok || el.classList.contains('done')); q(el, '[data-fb]').innerHTML = ok ? `<span class="s10-hc-ok">✓ ${esc(tr('¡Correcto!'))}</span>` : `<span class="s10-hc-bad">✗ ${esc(tr('No es correcto.'))} ${esc(msg || '')}</span>`; }
      /* ---------- widgets ---------- */
      const W = {
        bin(el) { let v = 0b10110101; const draw = () => { el.innerHTML = `<div class="s10-cs-bits">${[7, 6, 5, 4, 3, 2, 1, 0].map(i => `<button class="${v >> i & 1 ? 'on' : ''}" data-bit="${i}"><b>${v >> i & 1}</b><small>${1 << i}</small></button>`).join('')}</div><p class="s10-cs-big">${esc(tr('Decimal'))} <b>${v}</b> · ${esc(tr('hexadecimal'))} <b>0x${v.toString(16).toUpperCase().padStart(2, '0')}</b> · ${esc(tr('octal'))} <b>${v.toString(8)}</b></p><p class="k9-small k9-muted">${[7, 6, 5, 4, 3, 2, 1, 0].filter(i => v >> i & 1).map(i => 1 << i).join(' + ') || '0'} = ${v}</p><div class="k9-row"><button class="k9-btn" data-bw="inc">+1</button><button class="k9-btn" data-bw="shl">${esc(tr('Desplazar ←  (×2)'))}</button><button class="k9-btn" data-bw="rnd">${esc(tr('Aleatorio'))}</button><button class="k9-btn" data-bw="zero">0</button></div>`; }; el.onclick = e => { const bt = e.target.closest('[data-bit]'); if (bt) { v ^= 1 << +bt.dataset.bit; draw(); } const w2 = e.target.closest('[data-bw]'); if (w2) { const k = w2.dataset.bw; v = k === 'inc' ? (v + 1) & 255 : k === 'shl' ? (v << 1) & 255 : k === 'rnd' ? rnd(256) : 0; draw(); } }; draw(); },
        logic(el) { const G = { AND: (a, c) => a & c, OR: (a, c) => a | c, XOR: (a, c) => a ^ c, NAND: (a, c) => 1 - (a & c), NOR: (a, c) => 1 - (a | c), NOT: a => 1 - a }; let g = 'AND', A = 1, Bv = 0; const draw = () => { const one = g === 'NOT', out = G[g](A, Bv); el.innerHTML = `<div class="s10-chips">${Object.keys(G).map(k => `<button class="s10-chip ${k === g ? 'on' : ''}" data-gate="${k}">${k}</button>`).join('')}</div><div class="s10-cs-gate"><div><button class="s10-cs-in ${A ? 'on' : ''}" data-in="A">A = ${A}</button>${one ? '' : `<button class="s10-cs-in ${Bv ? 'on' : ''}" data-in="B">B = ${Bv}</button>`}</div><div class="s10-cs-gbox">${g}</div><div class="s10-cs-lamp ${out ? 'on' : ''}">${out}</div></div><table class="k9-table s10-cs-tt"><thead><tr><th>A</th>${one ? '' : '<th>B</th>'}<th>${g}</th></tr></thead><tbody>${(one ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]]).map(r => `<tr class="${r[0] === A && (one || r[1] === Bv) ? 'cur' : ''}"><td>${r[0]}</td>${one ? '' : `<td>${r[1]}</td>`}<td><b>${G[g](r[0], r[1])}</b></td></tr>`).join('')}</tbody></table>`; }; el.onclick = e => { const x = e.target.closest('[data-gate]'); if (x) g = x.dataset.gate; const i2 = e.target.closest('[data-in]'); if (i2) { if (i2.dataset.in === 'A') A ^= 1; else Bv ^= 1; } if (x || i2) draw(); }; draw(); },
        sort(el) {
          let alg = 'bubble', n = 24, arr = [], it = null, hl = {}, cmp = 0, sw = 0, playing = false, timer = 0, fixed = new Set();
          el.innerHTML = `<div class="k9-row" style="flex-wrap:wrap"><select class="input-text" data-alg>${Object.entries(SORTS).map(([k, s2]) => `<option value="${k}">${esc(tr(s2.n))}</option>`).join('')}</select><label class="k9-small">n = <b data-nl>${n}</b> <input type="range" min="8" max="60" value="${n}" data-sn></label><button class="k9-btn" data-sa="shuffle">${esc(tr('Mezclar'))}</button><button class="k9-btn" data-sa="step">${esc(tr('Paso'))}</button><button class="k9-btn pri" data-sa="play">⏯</button><label class="k9-small">${esc(tr('Velocidad'))} <input type="range" min="1" max="10" value="6" data-sp></label></div><canvas class="s10-ml-cv" data-cv style="height:220px"></canvas><p class="k9-small" data-sst></p>`;
          const cv = q(el, '[data-cv]'), shuffle = () => { arr = Array.from({ length: n }, (_, i) => i + 1); for (let i = n - 1; i > 0; i--) { const j = rnd(i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } it = SORTS[alg].run(arr); hl = {}; cmp = sw = 0; fixed = new Set(); draw(); };
          const draw = () => { const { g, w: W2, h: H } = hidpi(cv), T = theme(), bw = W2 / arr.length; g.clearRect(0, 0, W2, H); arr.forEach((v, i) => { g.fillStyle = hl.s && hl.s.includes(i) ? T.pink : hl.c && hl.c.includes(i) ? T.warn : hl.w === i ? T.blue : it === null ? T.green : T.muted; g.fillRect(i * bw + 1, H - v / n * (H - 6), Math.max(1, bw - 2), v / n * (H - 6)); }); q(el, '[data-sst]').textContent = `${tr(SORTS[alg].n)} · ${SORTS[alg].o} · ${tr('comparaciones')}: ${cmp} · ${tr('intercambios/escrituras')}: ${sw}${it === null ? ' · ✓ ' + tr('ordenado') : ''}`; };
          const step = () => { if (!it) return false; const r = it.next(); if (r.done) { it = null; hl = {}; draw(); playing = false; return false; } hl = r.value; if (hl.c) cmp++; if (hl.s || hl.w != null) sw++; if (hl.fixed != null) fixed.add(hl.fixed); draw(); return true; };
          const tick = () => { if (!playing) return; const sp = +q(el, '[data-sp]').value; for (let k = 0; k < Math.max(1, sp - 5); k++) if (!step()) break; if (playing) timer = setTimeout(tick, Math.max(8, 220 - sp * 30)); };
          el.onclick = e => { const a = e.target.closest('[data-sa]'); if (!a) return; if (a.dataset.sa === 'shuffle') { playing = false; shuffle(); } if (a.dataset.sa === 'step') step(); if (a.dataset.sa === 'play') { if (!it) shuffle(); playing = !playing; tick(); } };
          el.onchange = e => { if (e.target.matches('[data-alg]')) { alg = e.target.value; playing = false; shuffle(); } };
          el.oninput = e => { if (e.target.matches('[data-sn]')) { n = +e.target.value; q(el, '[data-nl]').textContent = n; playing = false; shuffle(); } };
          shuffle(); K.ext.cslearn = Object.assign(K.ext.cslearn || {}, { sortRun: (a2, k) => { const x = a2.slice(); let c = 0; for (const s2 of SORTS[k].run(x)) if (s2.c) c++; return { sorted: x, cmp: c }; } }); return () => { playing = false; clearTimeout(timer); };
        },
        search(el) {
          const mk = () => { const s2 = new Set(); while (s2.size < 31) s2.add(1 + rnd(99)); return [...s2].sort((a, c) => a - c); }; let arr = mk(), lo, hi, mid, steps, found, mode = null, lin = 0;
          const draw = () => { el.innerHTML = `<div class="k9-row" style="flex-wrap:wrap"><label class="k9-small">${esc(tr('Buscar'))} <input class="input-text" type="number" data-tg value="${arr[rnd(31)]}" style="width:90px"></label><button class="k9-btn" data-sr="lin">${esc(tr('Lineal: paso'))}</button><button class="k9-btn" data-sr="bin">${esc(tr('Binaria: paso'))}</button><button class="k9-btn" data-sr="new">${esc(tr('Nueva lista'))}</button></div><div class="s10-cs-arr">${arr.map((v, i) => `<span class="${mode === 'bin' && (i < lo || i > hi) ? 'out' : ''} ${i === mid ? 'mid' : ''} ${found === i ? 'hit' : ''} ${mode === 'lin' && i < lin ? 'seen' : ''}"><small>${i}</small>${v}</span>`).join('')}</div><p class="k9-small" data-ss>${mode ? `${esc(tr(mode === 'bin' ? 'Búsqueda binaria' : 'Búsqueda lineal'))}: ${steps} ${esc(tr('pasos'))}${found != null ? (found >= 0 ? ' · ✓ ' + esc(tr('encontrado en la posición')) + ' ' + found : ' · ✗ ' + esc(tr('no está en la lista'))) : ''}` : esc(tr('Elige un número y avanza paso a paso con cada método.'))}</p>`; };
          const reset = m => { mode = m; lo = 0; hi = arr.length - 1; mid = -1; steps = 0; found = null; lin = 0; };
          el.onclick = e => { const a = e.target.closest('[data-sr]'); if (!a) return; const t = +q(el, '[data-tg]').value, k = a.dataset.sr; if (k === 'new') { arr = mk(); reset(null); draw(); return; } if (mode !== k || found != null) { reset(k); el.dataset.t = t; } if (k === 'bin') { if (lo > hi) { found = -1; } else { mid = (lo + hi) >> 1; steps++; if (arr[mid] === t) found = mid; else if (arr[mid] < t) lo = mid + 1; else hi = mid - 1; if (lo > hi && found == null) found = -1; } } else { if (lin < arr.length) { steps++; mid = lin; if (arr[lin] === t) found = lin; lin++; if (lin >= arr.length && found == null) found = -1; } } const keep = q(el, '[data-tg]').value; draw(); q(el, '[data-tg]').value = keep; };
          reset(null); draw();
        },
        ds(el) { const st = [], qu = []; let last = ''; const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; let ni = 0; const draw = () => { el.innerHTML = `<div class="s10-ml-two"><div><b>${esc(tr('Pila (LIFO)'))}</b><div class="k9-row"><button class="k9-btn" data-ds="push">${esc(tr('Meter'))}</button><button class="k9-btn" data-ds="pop" ${st.length ? '' : 'disabled'}>${esc(tr('Sacar'))}</button></div><div class="s10-cs-stack">${st.slice().reverse().map((x, i) => `<span class="${i === 0 ? 'top' : ''}">${x}</span>`).join('') || `<small class="k9-muted">${esc(tr('vacía'))}</small>`}</div></div><div><b>${esc(tr('Cola (FIFO)'))}</b><div class="k9-row"><button class="k9-btn" data-ds="enq">${esc(tr('Encolar'))}</button><button class="k9-btn" data-ds="deq" ${qu.length ? '' : 'disabled'}>${esc(tr('Desencolar'))}</button></div><div class="s10-cs-queue">${qu.map((x, i) => `<span class="${i === 0 ? 'top' : ''}">${x}</span>`).join('') || `<small class="k9-muted">${esc(tr('vacía'))}</small>`}</div></div></div><p class="k9-small">${last ? esc(tr('Ha salido')) + ': <b>' + esc(last) + '</b>' : esc(tr('Mete y saca elementos para ver la diferencia.'))}</p>`; }; el.onclick = e => { const a = e.target.closest('[data-ds]'); if (!a) return; const k = a.dataset.ds; if (k === 'push') st.push(L[ni++ % 26]); if (k === 'pop') last = st.pop(); if (k === 'enq') qu.push(String(1 + (ni++ % 99))); if (k === 'deq') last = qu.shift(); draw(); }; draw(); },
        rec(el) {
          let n = 4, pegs, moves = [], mi = 0, playing = false, timer = 0, fn = 5;
          const solve = (k, a, c, t) => { if (!k) return; solve(k - 1, a, t, c); moves.push([a, c]); solve(k - 1, t, c, a); };
          const reset = () => { pegs = [Array.from({ length: n }, (_, i) => n - i), [], []]; moves = []; solve(n, 0, 2, 1); mi = 0; draw(); };
          el.innerHTML = `<div class="k9-row" style="flex-wrap:wrap"><b>${esc(tr('Torres de Hanói'))}</b><label class="k9-small">${esc(tr('Discos'))} <select class="input-text" data-hn>${[3, 4, 5, 6, 7].map(x => `<option${x === n ? ' selected' : ''}>${x}</option>`).join('')}</select></label><button class="k9-btn" data-ha="step">${esc(tr('Paso'))}</button><button class="k9-btn pri" data-ha="play">⏯</button><button class="k9-btn" data-ha="reset">↺</button></div><canvas class="s10-ml-cv" data-cv style="height:170px"></canvas><p class="k9-small" data-hs></p><div class="k9-row" style="margin-top:8px"><b>factorial(</b><input class="input-text" type="number" min="1" max="12" value="${fn}" data-fn style="width:70px"><b>)</b></div><pre class="s10-fc-pre" data-ft></pre>`;
          const cv = q(el, '[data-cv]');
          const draw = () => { const { g, w: W2, h: H } = hidpi(cv), T = theme(); g.clearRect(0, 0, W2, H); for (let p = 0; p < 3; p++) { const x = W2 * (p + .5) / 3; g.fillStyle = T.line; g.fillRect(x - 3, 20, 6, H - 30); g.fillRect(x - W2 / 7, H - 12, W2 / 3.5, 6); pegs[p].forEach((d, i) => { const w2 = (W2 / 3.5 - 10) * d / n, y = H - 12 - (i + 1) * Math.min(18, (H - 40) / n); g.fillStyle = `hsl(${150 + d * 25} 45% 45%)`; g.fillRect(x - w2 / 2, y, w2, Math.min(16, (H - 40) / n - 2)); }); } q(el, '[data-hs]').textContent = `${tr('Movimiento')} ${mi} / ${moves.length} (2^${n} − 1 = ${2 ** n - 1})`; };
          const stepH = () => { if (mi >= moves.length) { playing = false; return false; } const [a, c] = moves[mi++]; pegs[c].push(pegs[a].pop()); draw(); return true; };
          const tick = () => { if (playing && stepH()) timer = setTimeout(tick, Math.max(60, 500 - n * 55)); };
          const fact = () => { const k = Math.max(1, Math.min(12, +q(el, '[data-fn]').value || 1)), lines = []; const f = (m, d) => { lines.push('  '.repeat(d) + `factorial(${m})` + (m === 1 ? ` = 1  ← ${tr('caso base')}` : ` = ${m} × factorial(${m - 1})`)); const r = m === 1 ? 1 : m * f(m - 1, d + 1); lines.push('  '.repeat(d) + `↳ ${tr('devuelve')} ${r}`); return r; }; f(k, 0); q(el, '[data-ft]').textContent = lines.join('\n'); };
          el.onclick = e => { const a = e.target.closest('[data-ha]'); if (!a) return; if (a.dataset.ha === 'step') stepH(); if (a.dataset.ha === 'play') { playing = !playing; tick(); } if (a.dataset.ha === 'reset') { playing = false; reset(); } };
          el.onchange = e => { if (e.target.matches('[data-hn]')) { n = +e.target.value; playing = false; reset(); } if (e.target.matches('[data-fn]')) fact(); };
          el.oninput = e => { if (e.target.matches('[data-fn]')) fact(); };
          reset(); fact(); return () => { playing = false; clearTimeout(timer); };
        },
        cpu(el) {
          let pk = 'suma', stt = null, timer = 0, playing = false;
          const reset = () => { stt = { mem: CPUPROG[pk].mem.slice(), pc: 0, acc: 0, ir: '', z: false, out: [], halt: false, steps: 0 }; draw(); };
          const draw = () => { el.innerHTML = `<div class="k9-row" style="flex-wrap:wrap"><select class="input-text" data-cp>${Object.entries(CPUPROG).map(([k, p]) => `<option value="${k}"${k === pk ? ' selected' : ''}>${esc(tr(p.n))}</option>`).join('')}</select><button class="k9-btn" data-ca="step">${esc(tr('Siguiente instrucción'))}</button><button class="k9-btn pri" data-ca="run">⏯</button><button class="k9-btn" data-ca="reset">↺</button></div><div class="s10-cs-cpu"><div class="s10-cs-regs">${[['PC', stt.pc], ['ACC', stt.acc], ['IR', stt.ir || '—'], ['Z', stt.z ? 1 : 0]].map(([k, v]) => `<div><small>${k}</small><b>${esc(String(v))}</b></div>`).join('')}<div class="s10-cs-out"><small>${esc(tr('Salida'))}</small><b>${esc(stt.out.join(' ') || '—')}</b></div>${stt.err ? `<p class="s10-hc-bad k9-small">${esc(stt.err)}</p>` : stt.halt ? `<p class="s10-hc-ok k9-small">HLT · ${stt.steps} ${esc(tr('instrucciones'))}</p>` : ''}</div><div class="s10-cs-mem">${stt.mem.map((m, i) => `<label class="${i === stt.pc ? 'pc' : ''}"><small>${i}</small><input class="input-text" data-mem="${i}" value="${esc(m)}" spellcheck="false"></label>`).join('')}</div></div><p class="k9-small k9-muted">${esc(tr('Puedes editar la memoria: escribe instrucciones (LOAD 14, ADD 15, OUT…) o números en cualquier celda.'))}</p>`; };
          const tick = () => { if (!playing) return; cpuStep(stt); draw(); if (stt.halt) { playing = false; return; } timer = setTimeout(tick, 450); };
          el.onclick = e => { const a = e.target.closest('[data-ca]'); if (!a) return; if (a.dataset.ca === 'step') { cpuStep(stt); draw(); } if (a.dataset.ca === 'run') { if (stt.halt) reset(); playing = !playing; tick(); } if (a.dataset.ca === 'reset') { playing = false; reset(); } };
          el.onchange = e => { if (e.target.matches('[data-cp]')) { pk = e.target.value; playing = false; reset(); } const m = e.target.closest('[data-mem]'); if (m) stt.mem[+m.dataset.mem] = m.value.trim().slice(0, 12); };
          reset(); return () => { playing = false; clearTimeout(timer); };
        },
        net(el) {
          const STEPS = [['DNS', 'aplicación', 'El navegador pregunta al servidor DNS: «¿qué IP tiene ejemplo.org?». La respuesta llega en milisegundos y se guarda en caché.'], ['TCP · SYN', 'transporte', 'Primer paso del saludo: el navegador pide abrir una conexión al puerto 443 del servidor.'], ['TCP · SYN-ACK', 'transporte', 'El servidor acepta y responde.'], ['TCP · ACK', 'transporte', 'El navegador confirma: la conexión queda abierta.'], ['TLS', 'presentación', 'Se negocian claves para cifrar todo lo que viaje: nadie en el camino podrá leerlo. Por eso la dirección empieza por https.'], ['HTTP · GET /', 'aplicación', 'El navegador pide la página. El mensaje HTTP va dentro de un segmento TCP, dentro de un paquete IP y dentro de una trama Wi-Fi o Ethernet.'], ['HTTP · 200 OK', 'aplicación', 'El servidor devuelve el HTML. El navegador lo lee y pide también las imágenes, estilos y scripts que necesite.']];
          let i = 0; const draw = () => { const [t, layer, d] = STEPS[i]; el.innerHTML = `<div class="s10-cs-net"><div class="s10-cs-host">💻<small>${esc(tr('Tu equipo'))}</small></div><div class="s10-cs-wire"><span class="pkt ${i % 2 === 1 || i === 2 || i === 6 ? 'back' : ''}" style="animation-duration:1.2s">${esc(t)}</span></div><div class="s10-cs-host">${i === 0 ? '📖<small>DNS</small>' : '🗄️<small>ejemplo.org</small>'}</div></div><div class="s10-cs-layers">${[['aplicación', 'HTTP / DNS'], ['presentación', 'TLS'], ['transporte', 'TCP · puertos'], ['red', 'IP · direcciones'], ['enlace', 'Wi-Fi / Ethernet']].map(([k, v]) => `<div class="${k === layer ? 'on' : ''}"><b>${esc(tr(k))}</b><small>${esc(v)}</small></div>`).join('')}</div><p><b>${i + 1}/${STEPS.length} · ${esc(t)}</b> — ${esc(tr(d))}</p><div class="k9-row"><button class="k9-btn" data-na="prev" ${i ? '' : 'disabled'}>‹ ${esc(tr('Anterior'))}</button><button class="k9-btn pri" data-na="next" ${i < STEPS.length - 1 ? '' : 'disabled'}>${esc(tr('Siguiente'))} ›</button></div>`; }; el.onclick = e => { const a = e.target.closest('[data-na]'); if (!a) return; i = Math.max(0, Math.min(STEPS.length - 1, i + (a.dataset.na === 'next' ? 1 : -1))); draw(); }; draw();
        }
      };
      b.addEventListener('click', async e => {
        const l = e.target.closest('[data-les]'); if (l) { lesson(l.dataset.les); return; }
        const ans = e.target.closest('[data-ans]'); if (ans) { const qi = +ans.closest('[data-q]').dataset.q, x = exs[qi], ok = +ans.dataset.ans === x.a; answer(qi, ok, ok ? '' : tr('Prueba otra vez.')); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'home') home(); if (k === 'newex') { exs = EXS[cur](); drawEx(); }
        if (k === 'check') { const box = a.closest('[data-q]'), qi = +box.dataset.q, x = exs[qi], v = q(box, '[data-num]').value.trim().replace(/\s/g, ''), ok = x.fmt === 'bin' ? /^[01]+$/.test(v) && parseInt(v, 2) === parseInt(x.num, 2) : v.replace(',', '.') === x.num; answer(qi, ok, ok ? '' : tr('Pista: revisa el planteamiento e inténtalo de nuevo.')); }
        if (k === 'resetp' && await E.confirm(tr('Borrar progreso'), tr('Se borrarán los ejercicios completados de todas las lecciones.'))) { S.set(PK, {}); home(); }
      });
      b.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-num]')) { const bt = e.target.closest('[data-q]').querySelector('[data-a="check"]'); if (bt) bt.click(); } });
      home();
      this.onClose = () => { if (stopW) { stopW(); stopW = null; } };
      K.ext.cslearn = Object.assign(K.ext.cslearn || {}, { lesson, home, exs: () => exs, cur: () => cur, prog });
    }
  });
})();

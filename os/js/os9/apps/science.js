/* EISENKU OS 9.0 · Educación y ciencia: Calculadora algebraica, Conversor científico, Laboratorio de fórmulas,
   Editor de ecuaciones, Organizador académico, Biblioteca digital y Simuladores. Todo funciona sin conexión. */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, F = K.files;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)];
  const get = (k, d) => S.get('a9_' + k, d), put = (k, v) => S.set('a9_' + k, v);
  const tabsUi = (tabs, cur) => `<div class="k9-tabs">${tabs.map(([k, l]) => `<button class="${k === cur ? 'on' : ''}" data-tab="${k}">${esc(tr(l))}</button>`).join('')}</div>`;
  const devDownload = (name, blob) => { const a = document.createElement('a'); a.__eisen = true; a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); HTMLAnchorElement.prototype.click.call(a); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
  const sup = n => String(n).split('').map(c => SUP[c] || c).join('');
  const fmtNum = (x, d = 10) => { if (!isFinite(x)) return String(x); if (Math.abs(x) < 1e-12) return '0'; const a = Math.abs(x); if (a >= 1e12 || a < 1e-6) return x.toExponential(Math.min(d, 8)).replace(/\.?0+e/, 'e'); return String(+x.toPrecision(d)); };

  /* ======================================================================
     Álgebra exacta: fracciones (BigInt) y polinomios en varias variables
     ====================================================================== */
  const gcdB = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  class Fr {
    constructor(n, d = 1n) { n = BigInt(n); d = BigInt(d); if (d === 0n) throw new Error(tr('División entre cero')); if (d < 0n) { n = -n; d = -d; } const g = gcdB(n, d) || 1n; this.n = n / g; this.d = d / g; }
    static of(x) { if (x instanceof Fr) return x; const s = String(x).trim(); let m; if ((m = s.match(/^(-?)(\d+)$/))) return new Fr(BigInt(s)); if ((m = s.match(/^(-?)(\d*)\.(\d+)$/))) { const den = 10n ** BigInt(m[3].length), v = BigInt(m[2] || '0') * den + BigInt(m[3]); return new Fr(m[1] ? -v : v, den); } throw new Error(tr('Número no válido') + ': ' + s); }
    add(o) { return new Fr(this.n * o.d + o.n * this.d, this.d * o.d); } sub(o) { return new Fr(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { return new Fr(this.n * o.n, this.d * o.d); } div(o) { if (o.n === 0n) throw new Error(tr('División entre cero')); return new Fr(this.n * o.d, this.d * o.n); }
    neg() { return new Fr(-this.n, this.d); } pow(k) { if (k < 0) return new Fr(this.d, this.n).pow(-k); return new Fr(this.n ** BigInt(k), this.d ** BigInt(k)); }
    get zero() { return this.n === 0n; } get int() { return this.d === 1n; } eq(o) { return this.n === o.n && this.d === o.d; }
    num() { return Number(this.n) / Number(this.d); } toString() { return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`; }
  }
  const ZERO = new Fr(0n), ONE = new Fr(1n);
  const mkey = m => Object.keys(m).filter(v => m[v]).sort().map(v => m[v] === 1 ? v : v + '^' + m[v]).join('*');
  const mparse = k => { const m = {}; if (k) k.split('*').forEach(p => { const [v, e] = p.split('^'); m[v] = e ? +e : 1; }); return m; };
  const mdeg = k => Object.values(mparse(k)).reduce((a, b) => a + b, 0);
  class P {
    constructor(t) { this.t = t || new Map(); }
    static c(f) { const p = new P(); if (!f.zero) p.t.set('', f); return p; }
    static v(x) { return new P(new Map([[x, ONE]])); }
    clone() { return new P(new Map(this.t)); }
    addTerm(k, c) { const v = (this.t.get(k) || ZERO).add(c); if (v.zero) this.t.delete(k); else this.t.set(k, v); return this; }
    add(o) { const r = this.clone(); o.t.forEach((c, k) => r.addTerm(k, c)); return r; }
    neg() { const r = new P(); this.t.forEach((c, k) => r.t.set(k, c.neg())); return r; }
    sub(o) { return this.add(o.neg()); }
    mul(o) { const r = new P(); this.t.forEach((a, ka) => o.t.forEach((b, kb) => { const m = mparse(ka), n = mparse(kb); Object.entries(n).forEach(([v, e]) => { m[v] = (m[v] || 0) + e; }); r.addTerm(mkey(m), a.mul(b)); })); return r; }
    pow(k) { if (k < 0 || !Number.isInteger(k)) throw new Error(tr('El exponente debe ser un entero no negativo')); if (k > 64) throw new Error(tr('Exponente demasiado grande')); let r = P.c(ONE), b = this; while (k) { if (k & 1) r = r.mul(b); b = b.mul(b); k >>= 1; } return r; }
    get isConst() { return [...this.t.keys()].every(k => k === ''); } get cst() { return this.t.get('') || ZERO; }
    vars() { const s = new Set(); this.t.forEach((c, k) => Object.keys(mparse(k)).forEach(v => s.add(v))); return [...s].sort(); }
    deg() { let d = 0; this.t.forEach((c, k) => { d = Math.max(d, mdeg(k)); }); return d; }
    diff(x) { const r = new P(); this.t.forEach((c, k) => { const m = mparse(k), e = m[x] || 0; if (!e) return; m[x] = e - 1; r.addTerm(mkey(m), c.mul(new Fr(BigInt(e)))); }); return r; }
    integ(x) { const r = new P(); this.t.forEach((c, k) => { const m = mparse(k), e = (m[x] || 0) + 1; m[x] = e; r.addTerm(mkey(m), c.div(new Fr(BigInt(e)))); }); return r; }
    subst(x, f) { let r = new P(); this.t.forEach((c, k) => { const m = mparse(k), e = m[x] || 0; delete m[x]; r.addTerm(mkey(m), c.mul(f.pow(e))); }); return r; }
    coeffs(x) { const a = []; this.t.forEach((c, k) => { const m = mparse(k); const e = m[x] || 0; delete m[x]; if (Object.keys(m).length) throw new Error(tr('La ecuación tiene más de una incógnita')); a[e] = (a[e] || ZERO).add(c); }); for (let i = 0; i < a.length; i++) a[i] = a[i] || ZERO; return a; }
    toString() {
      if (!this.t.size) return '0';
      const ks = [...this.t.keys()].sort((a, b) => mdeg(b) - mdeg(a) || a.localeCompare(b));
      return ks.map((k, i) => { const c = this.t.get(k), neg = c.n < 0n, a = neg ? c.neg() : c, mono = Object.entries(mparse(k)).map(([v, e]) => v + (e > 1 ? sup(e) : '')).join(''); let cs = !k ? a.toString() : a.eq(ONE) ? '' : a.int ? a.toString() : `(${a})`; return (i ? (neg ? ' − ' : ' + ') : neg ? '−' : '') + cs + mono; }).join('');
    }
  }
  function parseAlg(src) {
    const toks = []; const s = src.replace(/[−–]/g, '-').replace(/[·×]/g, '*').replace(/÷/g, '/').replace(/²/g, '^2').replace(/³/g, '^3');
    for (let i = 0; i < s.length;) { const c = s[i]; if (/\s/.test(c)) { i++; continue; } const m = s.slice(i).match(/^\d+(?:\.\d+)?|^\.\d+/); if (m) { toks.push({ t: 'n', v: m[0] }); i += m[0].length; continue; } if (/[a-zA-Z]/.test(c)) { toks.push({ t: 'v', v: c }); i++; continue; } if ('+-*/^()'.includes(c)) { toks.push({ t: c }); i++; continue; } throw new Error(`${tr('Carácter no válido')} «${c}»`); }
    let i = 0; const peek = () => toks[i], eat = t => { if (!toks[i] || toks[i].t !== t) throw new Error(tr('Falta') + ' «' + t + '»'); i++; };
    function expr() { let v = term(); while (peek() && (peek().t === '+' || peek().t === '-')) { const op = toks[i++].t, r = term(); v = op === '+' ? v.add(r) : v.sub(r); } return v; }
    function term() { let v = factor(); for (;;) { const p = peek(); if (p && (p.t === '*' || p.t === '/')) { i++; const r = factor(); if (p.t === '*') v = v.mul(r); else { if (!r.isConst || r.cst.zero) throw new Error(r.isConst ? tr('División entre cero') : tr('Solo se puede dividir entre números')); v = v.mul(P.c(ONE.div(r.cst))); } } else if (p && (p.t === 'v' || p.t === '(' || p.t === 'n')) v = v.mul(factor()); else break; } return v; }
    function factor() { const p = peek(); if (p && p.t === '-') { i++; return factor().neg(); } if (p && p.t === '+') { i++; return factor(); } return power(); }
    function power() { const b = atom(); if (peek() && peek().t === '^') { i++; const e = factor(); if (!e.isConst || !e.cst.int) throw new Error(tr('El exponente debe ser un número entero')); const k = Number(e.cst.n); if (k < 0) { if (!b.isConst) throw new Error(tr('Exponentes negativos solo con números')); return P.c(b.cst.pow(k)); } return b.pow(k); } return b; }
    function atom() { const p = toks[i++]; if (!p) throw new Error(tr('Expresión incompleta')); if (p.t === 'n') return P.c(Fr.of(p.v)); if (p.t === 'v') return P.v(p.v); if (p.t === '(') { const v = expr(); eat(')'); return v; } throw new Error(`${tr('Símbolo inesperado')} «${p.t}»`); }
    const r = expr(); if (i < toks.length) throw new Error(`${tr('Símbolo inesperado')} «${toks[i].t === 'n' || toks[i].t === 'v' ? toks[i].v : toks[i].t}»`); return r;
  }
  const parseEq = s => { const parts = s.split('='); if (parts.length > 2) throw new Error(tr('Usa un solo signo =')); return parts.length === 2 ? parseAlg(parts[0]).sub(parseAlg(parts[1])) : parseAlg(s); };
  // raíces de polinomios en una variable: racionales exactas + fórmula cuadrática + numéricas (Durand-Kerner)
  const horner = (a, x) => a.reduceRight((acc, c) => acc.mul(x).add(c), ZERO);
  const divs = n => { n = n < 0n ? -n : n; const out = []; if (n > 10n ** 12n) return out; for (let i = 1n; i * i <= n; i++) if (n % i === 0n) { out.push(i); if (i * i !== n) out.push(n / i); } return out; };
  function sqrtParts(n) { let out = 1n, rest = n; for (let p = 2n; p * p <= rest && p < 100000n; p++) while (rest % (p * p) === 0n) { rest /= p * p; out *= p; } return [out, rest]; }
  function solvePoly(a0) {
    let a = a0.slice(); while (a.length && a[a.length - 1].zero) a.pop();
    const roots = []; if (a.length < 2) return { roots, note: a.length && !a[0].zero ? tr('Sin solución') : tr('Cualquier valor es solución') };
    while (a.length > 1 && a[0].zero) { roots.push({ exact: '0', v: 0 }); a.shift(); }
    // racionales
    let L = 1n; a.forEach(c => { L = L / gcdB(L, c.d) * c.d; }); const ia = a.map(c => c.n * (L / c.d));
    const P0 = divs(ia[0]), Q = divs(ia[ia.length - 1]);
    let found = true;
    while (found && a.length > 2) {
      found = false;
      for (const p of P0) { for (const qq of Q) { for (const sgn of [1n, -1n]) { const x = new Fr(sgn * p, qq); if (horner(a, x).zero) { roots.push({ exact: x.toString(), v: x.num() }); const b = []; let acc = ZERO; for (let i = a.length - 1; i >= 1; i--) { acc = acc.mul(x).add(a[i]); b.unshift(acc); } a = b; found = true; break; } } if (found) break; } if (found) break; }
    }
    if (a.length === 2) { const x = a[0].neg().div(a[1]); roots.push({ exact: x.toString(), v: x.num() }); return { roots }; }
    if (a.length === 3) {
      const [c, b, A] = a, D = b.mul(b).sub(new Fr(4n).mul(A).mul(c));
      const den = new Fr(2n).mul(A), mid = b.neg().div(den);
      if (D.zero) { roots.push({ exact: mid.toString(), v: mid.num() }, { exact: mid.toString(), v: mid.num() }); return { roots }; }
      const neg = D.n < 0n, Dn = neg ? D.neg() : D; const [o, r] = sqrtParts(Dn.n * Dn.d); // √(n/d) = √(n·d)/d
      const k = new Fr(o, Dn.d).div(den.n < 0n ? den.neg() : den), rad = r === 1n ? '' : '√' + r;
      const kS = k.eq(ONE) ? (rad || '1') : (k.int ? k.toString() : `(${k})`) + rad, m = mid.zero ? '' : mid.toString() + ' ';
      const s = Math.sqrt(Dn.num()) / Math.abs(den.num());
      if (neg) { roots.push({ exact: `${m}+ ${kS}i`.trim().replace(/^\+ /, ''), v: null, re: mid.num(), im: s }, { exact: `${m}− ${kS}i`.trim().replace(/^− /, '−'), v: null, re: mid.num(), im: -s }); }
      else { roots.push({ exact: `${m}+ ${kS}`.replace(/^\+ /, ''), v: mid.num() + s }, { exact: `${m}− ${kS}`.replace(/^− /, '−'), v: mid.num() - s }); }
      return { roots };
    }
    // numérico (grado ≥ 3 sin raíces racionales)
    const c = a.map(x => x.num()), n = c.length - 1, lead = c[n], cf = c.map(x => x / lead);
    const mul = (x, y) => [x[0] * y[0] - x[1] * y[1], x[0] * y[1] + x[1] * y[0]], dv = (x, y) => { const d = y[0] * y[0] + y[1] * y[1] || 1e-300; return [(x[0] * y[0] + x[1] * y[1]) / d, (x[1] * y[0] - x[0] * y[1]) / d]; };
    const ev = z => cf.reduceRight((acc, k) => { const m = mul(acc, z); return [m[0] + k, m[1]]; }, [0, 0]);
    let z = Array.from({ length: n }, (_, i) => { const ang = 2 * Math.PI * i / n + 0.4; return [Math.cos(ang) * 0.9, Math.sin(ang) * 0.9]; });
    for (let it = 0; it < 800; it++) { let delta = 0; z = z.map((zi, i) => { let den = [1, 0]; z.forEach((zj, j) => { if (i !== j) den = mul(den, [zi[0] - zj[0], zi[1] - zj[1]]); }); const step = dv(ev(zi), den); delta = Math.max(delta, Math.hypot(...step)); return [zi[0] - step[0], zi[1] - step[1]]; }); if (delta < 1e-14) break; }
    z.sort((x, y) => x[0] - y[0]).forEach(r => { if (Math.abs(r[1]) < 1e-9) roots.push({ exact: null, v: r[0] }); else roots.push({ exact: null, v: null, re: r[0], im: r[1] }); });
    return { roots, numeric: true };
  }
  function gaussJordan(rows, vars) {
    const m = rows.map(r => r.slice()), R = m.length, C = vars.length; let piv = 0; const pc = [];
    for (let col = 0; col < C && piv < R; col++) {
      let sel = -1; for (let r = piv; r < R; r++) if (!m[r][col].zero) { sel = r; break; } if (sel < 0) continue;
      [m[piv], m[sel]] = [m[sel], m[piv]]; const p = m[piv][col]; m[piv] = m[piv].map(x => x.div(p));
      for (let r = 0; r < R; r++) if (r !== piv && !m[r][col].zero) { const f = m[r][col]; m[r] = m[r].map((x, j) => x.sub(f.mul(m[piv][j]))); }
      pc.push(col); piv++;
    }
    for (let r = piv; r < R; r++) if (!m[r][C].zero) return { status: 'none', m };
    if (pc.length < C) return { status: 'many', m, pc };
    return { status: 'one', sol: vars.map((v, i) => [v, m[i][C]]), m };
  }
  const factorize = n => { n = n < 0n ? -n : n; if (n < 2n) return String(n); const f = []; for (let p = 2n; p * p <= n && p < 1000000n; p += p === 2n ? 1n : 2n) { let e = 0; while (n % p === 0n) { n /= p; e++; } if (e) f.push(p + (e > 1 ? sup(e) : '')); } if (n > 1n) f.push(String(n)); return f.join(' · '); };
  K.algebra = { Fr, P, parseAlg, parseEq, solvePoly, gaussJordan };

  K.define('algebra', {
    init(b) {
      let tab = 'poly';
      b.innerHTML = `<div class="k9 a9-alg">${tabsUi([['poly', 'Polinomios'], ['eq', 'Ecuaciones'], ['sys', 'Sistemas'], ['num', 'Números y fracciones']], tab)}<div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]'), hist = get('algebra', []) || [];
      const out = (html, cls = '') => { const r = q(V, '[data-out]'); r.innerHTML = `<div class="k9-card a9-alg-res ${cls}">${html}</div>` + r.innerHTML; };
      const err = e => out(`<b class="k9-bad">✕ ${esc(e.message || String(e))}</b>`);
      const remember = s => { const l = hist.filter(x => x !== s); l.unshift(s); hist.length = 0; hist.push(...l.slice(0, 30)); put('algebra', hist); };
      const EX = { poly: ['(x + 2)^3', '(2x - 1)(x^2 + 3x - 4)', 'x(x - y)^2 + 3/4 x', '(a + b)^4'], eq: ['x^2 - 5x + 6 = 0', '2x^2 + 3x = 7', 'x^3 - 6x^2 + 11x - 6 = 0', 'x^4 - 5x^2 + 4 = 0', 'x^3 - 2x + 5 = 0', 'x^2 + 2x + 5 = 0'], sys: ['2x + 3y = 7\nx - y = 1', 'x + y + z = 6\n2x - y + z = 3\nx + 2y - z = 2'], num: ['3/4 + 5/6 * 2', '84, 126, 210', '(1/2)^3 - 0.125'] };
      function draw() {
        qa(b, '[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
        const multi = tab === 'sys', ph = { poly: 'Ej.: (x + 1)^2 (x − 3)', eq: 'Ej.: x^2 − 5x + 6 = 0', sys: 'Una ecuación por línea: 2x + 3y = 7', num: 'Ej.: 3/4 + 5/6, o una lista: 84, 126, 210' }[tab];
        V.innerHTML = `<div class="k9-card"><div class="k9-col">${multi ? `<textarea class="input-text k9-mono" data-in rows="4" placeholder="${esc(tr(ph))}"></textarea>` : `<input class="input-text k9-mono" data-in placeholder="${esc(tr(ph))}" autocomplete="off">`}
          <div class="k9-row">${tab === 'poly' ? `<button class="k9-btn pri" data-a="expand">${esc(tr('Expandir y simplificar'))}</button><button class="k9-btn" data-a="diff">d/d<span data-var>x</span></button><button class="k9-btn" data-a="integ">∫ d<span data-var>x</span></button><input class="input-text" data-at placeholder="${esc(tr('Evaluar en x ='))}" style="width:130px"><button class="k9-btn" data-a="eval">${esc(tr('Evaluar'))}</button>` : tab === 'eq' ? `<button class="k9-btn pri" data-a="solve">${esc(tr('Resolver'))}</button>` : tab === 'sys' ? `<button class="k9-btn pri" data-a="sys">${esc(tr('Resolver sistema'))}</button>` : `<button class="k9-btn pri" data-a="num">${esc(tr('Calcular'))}</button>`}<span class="sp" style="flex:1"></span><span class="k9-small k9-muted">${esc(tr('Ejemplos'))}:</span>${EX[tab].map((x, i) => `<button class="k9-btn" data-ex="${i}">${esc(x.split('\n')[0])}${x.includes('\n') ? '…' : ''}</button>`).join('')}</div></div></div><div data-out></div>`;
        const inp = q(V, '[data-in]'); inp.focus();
        inp.addEventListener('keydown', e => { if (e.key === 'Enter' && (!multi || e.ctrlKey)) { e.preventDefault(); q(V, '.k9-btn.pri').click(); } });
      }
      function run(a) {
        const src = q(V, '[data-in]').value.trim(); if (!src) return; remember(src);
        try {
          if (tab === 'poly') {
            const p = parseAlg(src), x = p.vars()[0] || 'x'; qa(V, '[data-var]').forEach(s => { s.textContent = x; });
            if (a === 'expand') out(`<div class="k9-small k9-muted">${esc(src)}</div><div class="a9-alg-big">= ${esc(p.toString())}</div><div class="k9-small k9-muted">${esc(tr('Grado'))} ${p.deg()} · ${p.t.size} ${esc(tr('términos'))}${p.vars().length ? ' · ' + esc(tr('variables')) + ': ' + esc(p.vars().join(', ')) : ''}</div>`);
            if (a === 'diff') out(`<div class="k9-small k9-muted">d/d${esc(x)} [ ${esc(p.toString())} ]</div><div class="a9-alg-big">= ${esc(p.diff(x).toString())}</div>`);
            if (a === 'integ') out(`<div class="k9-small k9-muted">∫ ( ${esc(p.toString())} ) d${esc(x)}</div><div class="a9-alg-big">= ${esc(p.integ(x).toString())} + C</div>`);
            if (a === 'eval') { const v = parseAlg(q(V, '[data-at]').value || '0'); if (!v.isConst) throw new Error(tr('El valor debe ser un número')); const r = p.subst(x, v.cst); out(`<div class="k9-small k9-muted">${esc(p.toString())} ${esc(tr('con'))} ${esc(x)} = ${esc(v.cst.toString())}</div><div class="a9-alg-big">= ${esc(r.toString())}${r.isConst && !r.cst.int ? ' ≈ ' + fmtNum(r.cst.num()) : ''}</div>`); }
          }
          if (tab === 'eq') {
            const p = parseEq(src), vs = p.vars(); if (vs.length > 1) throw new Error(tr('Hay varias incógnitas: usa la pestaña Sistemas'));
            const x = vs[0] || 'x', co = p.coeffs(x); if (co.length - 1 > 4) throw new Error(tr('Se resuelven ecuaciones hasta grado 4'));
            const r = solvePoly(co);
            out(`<div class="k9-small k9-muted">${esc(p.toString())} = 0 · ${esc(tr('grado'))} ${p.deg()}</div>${r.note ? `<div class="a9-alg-big">${esc(r.note)}</div>` : r.roots.map((t, i) => `<div class="a9-alg-big">${esc(x)}${r.roots.length > 1 ? `<sub>${i + 1}</sub>` : ''} = ${t.exact ? esc(t.exact) : ''}${t.v != null && (!t.exact || /√|\//.test(t.exact)) ? ` ${t.exact ? '≈' : ''} ${fmtNum(t.v)}` : ''}${t.v == null && t.re != null && !t.exact ? `${fmtNum(t.re)} ${t.im < 0 ? '−' : '+'} ${fmtNum(Math.abs(t.im))}i` : t.v == null && t.re != null ? ` ≈ ${fmtNum(t.re)} ${t.im < 0 ? '−' : '+'} ${fmtNum(Math.abs(t.im))}i` : ''}</div>`).join('')}${r.numeric ? `<p class="k9-small k9-muted">${esc(tr('Raíces aproximadas por método numérico (Durand-Kerner).'))}</p>` : ''}`);
          }
          if (tab === 'sys') {
            const eqs = src.split('\n').map(l => l.trim()).filter(Boolean).map(parseEq), vars = [...new Set(eqs.flatMap(e => e.vars()))].sort();
            if (!vars.length) throw new Error(tr('No hay incógnitas'));
            eqs.forEach(e => { if (e.deg() > 1) throw new Error(tr('El sistema debe ser lineal (sin potencias ni productos de incógnitas)')); });
            const rows = eqs.map(e => vars.map(v => e.t.get(v) || ZERO).concat([e.cst.neg()]));
            const r = gaussJordan(rows, vars);
            out(`<div class="k9-small k9-muted">${eqs.length} ${esc(tr('ecuaciones'))}, ${vars.length} ${esc(tr('incógnitas'))}</div>${r.status === 'one' ? r.sol.map(([v, x]) => `<div class="a9-alg-big">${esc(v)} = ${esc(x.toString())}${x.int ? '' : ' ≈ ' + fmtNum(x.num())}</div>`).join('') : `<div class="a9-alg-big">${esc(r.status === 'none' ? tr('Sistema incompatible: no tiene solución') : tr('Sistema compatible indeterminado: infinitas soluciones'))}</div>`}<details class="k9-small"><summary>${esc(tr('Matriz reducida'))}</summary><pre class="k9-mono">${esc(r.m.map(row => row.map(x => x.toString().padStart(7)).join(' ')).join('\n'))}</pre></details>`);
          }
          if (tab === 'num') {
            if (/^\s*-?\d+(\s*[,;\s]\s*-?\d+)+\s*$/.test(src)) { const ns = src.split(/[,;\s]+/).filter(Boolean).map(x => BigInt(x)); const g = ns.reduce((a, c) => gcdB(a, c)), l = ns.reduce((a, c) => a / gcdB(a, c) * (c < 0n ? -c : c)); out(`<div class="a9-alg-big">MCD = ${g}</div><div class="a9-alg-big">MCM = ${l}</div>${ns.map(n => `<div class="k9-small">${n} = ${esc(factorize(n))}</div>`).join('')}`); }
            else { const p = parseAlg(src); if (!p.isConst) throw new Error(tr('Usa la pestaña Polinomios para expresiones con letras')); const v = p.cst, w = v.n / v.d, rem = v.n % v.d; out(`<div class="k9-small k9-muted">${esc(src)}</div><div class="a9-alg-big">= ${esc(v.toString())}</div>${v.int ? '' : `<div class="k9-small">${esc(tr('Número mixto'))}: ${w !== 0n ? w + ' ' : ''}${(w !== 0n && rem < 0n ? -rem : rem)}/${v.d} · ${esc(tr('Decimal'))}: ${fmtNum(v.num(), 14)} · ${(v.num() * 100).toPrecision(8).replace(/\.?0+$/, '')}%</div>`}`); }
          }
        } catch (e) { err(e); }
      }
      b.addEventListener('click', e => {
        const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; draw(); return; }
        const ex = e.target.closest('[data-ex]'); if (ex) { const i = q(V, '[data-in]'); i.value = EX[tab][+ex.dataset.ex]; i.focus(); return; }
        const a = e.target.closest('[data-a]'); if (a) run(a.dataset.a);
      });
      draw();
    }
  });

  /* ======================================================================
     Conversor científico
     ====================================================================== */
  const CONST = [['c', 'Velocidad de la luz en el vacío', '299792458', 'm/s', 'exacta'], ['h', 'Constante de Planck', '6.62607015e-34', 'J·s', 'exacta'], ['ħ', 'Constante de Planck reducida', '1.054571817e-34', 'J·s', ''], ['e', 'Carga elemental', '1.602176634e-19', 'C', 'exacta'], ['k_B', 'Constante de Boltzmann', '1.380649e-23', 'J/K', 'exacta'], ['N_A', 'Número de Avogadro', '6.02214076e23', '1/mol', 'exacta'], ['R', 'Constante de los gases', '8.314462618', 'J/(mol·K)', 'exacta'], ['G', 'Constante de gravitación universal', '6.67430e-11', 'N·m²/kg²', ''], ['g₀', 'Gravedad estándar', '9.80665', 'm/s²', 'exacta'], ['ε₀', 'Permitividad del vacío', '8.8541878128e-12', 'F/m', ''], ['μ₀', 'Permeabilidad del vacío', '1.25663706212e-6', 'N/A²', ''], ['k_e', 'Constante de Coulomb', '8.9875517923e9', 'N·m²/C²', ''], ['mₑ', 'Masa del electrón', '9.1093837015e-31', 'kg', ''], ['mₚ', 'Masa del protón', '1.67262192369e-27', 'kg', ''], ['mₙ', 'Masa del neutrón', '1.67492749804e-27', 'kg', ''], ['u', 'Unidad de masa atómica', '1.66053906660e-27', 'kg', ''], ['σ', 'Constante de Stefan-Boltzmann', '5.670374419e-8', 'W/(m²·K⁴)', ''], ['F', 'Constante de Faraday', '96485.33212', 'C/mol', ''], ['α', 'Constante de estructura fina', '7.2973525693e-3', '—', ''], ['R∞', 'Constante de Rydberg', '10973731.568160', '1/m', ''], ['a₀', 'Radio de Bohr', '5.29177210903e-11', 'm', ''], ['eV', 'Electronvoltio', '1.602176634e-19', 'J', 'exacta'], ['atm', 'Atmósfera estándar', '101325', 'Pa', 'exacta'], ['b', 'Constante de Wien', '2.897771955e-3', 'm·K', ''], ['V_m', 'Volumen molar (0 °C, 1 atm)', '22.41396954e-3', 'm³/mol', '']];
  const UNITS = {
    'Energía': { J: 1, kJ: 1e3, MJ: 1e6, cal: 4.184, kcal: 4184, eV: 1.602176634e-19, keV: 1.602176634e-16, MeV: 1.602176634e-13, Wh: 3600, kWh: 3.6e6, BTU: 1055.05585, erg: 1e-7 },
    'Presión': { Pa: 1, hPa: 100, kPa: 1e3, MPa: 1e6, bar: 1e5, mbar: 100, atm: 101325, mmHg: 133.322387415, Torr: 101325 / 760, psi: 6894.757293168 },
    'Ángulo': { 'grado (°)': Math.PI / 180, rad: 1, mrad: 1e-3, 'gradián': Math.PI / 200, vuelta: 2 * Math.PI, "minuto (′)": Math.PI / 10800, "segundo (″)": Math.PI / 648000 },
    'Datos': { bit: 1 / 8, byte: 1, kB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824, TiB: 1099511627776 },
    'Fuerza': { N: 1, kN: 1e3, dyn: 1e-5, kgf: 9.80665, lbf: 4.4482216152605 },
    'Potencia': { W: 1, kW: 1e3, MW: 1e6, 'hp (mecánico)': 745.69987158227, CV: 735.49875, 'BTU/h': 0.29307107 },
    'Temperatura': { K: 'K', '°C': 'C', '°F': 'F' }
  };
  const PREF = [['Q', 30], ['R', 27], ['Y', 24], ['Z', 21], ['E', 18], ['P', 15], ['T', 12], ['G', 9], ['M', 6], ['k', 3], ['h', 2], ['da', 1], ['', 0], ['d', -1], ['c', -2], ['m', -3], ['μ', -6], ['n', -9], ['p', -12], ['f', -15], ['a', -18], ['z', -21], ['y', -24], ['r', -27], ['q', -30]];
  K.define('sciconv', {
    init(b) {
      let tab = 'base';
      b.innerHTML = `<div class="k9">${tabsUi([['base', 'Bases numéricas'], ['si', 'Prefijos y notación'], ['units', 'Unidades científicas'], ['const', 'Constantes físicas']], tab)}<div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]');
      function draw() {
        qa(b, '[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
        if (tab === 'base') { V.innerHTML = `<div class="k9-card"><div class="a9-sc-grid">${[['2', 'Binario'], ['8', 'Octal'], ['10', 'Decimal'], ['16', 'Hexadecimal']].map(([r, l]) => `<label class="k9-field">${esc(tr(l))} (${r})<input class="input-text k9-mono" data-base="${r}" autocomplete="off" spellcheck="false"></label>`).join('')}</div><p class="k9-small k9-muted" data-binfo style="margin-top:8px">${esc(tr('Escribe en cualquier campo: los demás se actualizan. Admite enteros de cualquier tamaño (también negativos).'))}</p></div>`; const i = q(V, '[data-base="10"]'); i.value = '2026'; i.dispatchEvent(new Event('input', { bubbles: true })); }
        if (tab === 'si') V.innerHTML = `<div class="k9-card"><div class="k9-row"><label class="k9-field">${esc(tr('Valor'))}<input class="input-text k9-mono" data-sv value="0.000123456" style="width:200px"></label><label class="k9-field">${esc(tr('Unidad (opcional)'))}<input class="input-text" data-su value="m" style="width:90px"></label><label class="k9-field">${esc(tr('Cifras significativas'))}<input class="input-text" type="number" data-sd value="6" min="1" max="15" style="width:90px"></label></div><div data-sres style="margin-top:12px"></div></div>`;
        if (tab === 'units') V.innerHTML = `<div class="k9-card"><div class="k9-row"><select class="input-text" data-cat>${Object.keys(UNITS).map(c => `<option>${esc(c)}</option>`).join('')}</select><input class="input-text k9-mono" data-uv value="1" style="width:160px"><select class="input-text" data-uf></select></div><div data-ures style="margin-top:12px"></div></div>`;
        if (tab === 'const') V.innerHTML = `<input class="input-text" data-cq placeholder="${esc(tr('Buscar constante…'))}" style="width:260px;margin-bottom:10px"><div class="k9-card" style="padding:2px 8px" data-cl></div><p class="k9-small k9-muted" style="margin-top:8px">${esc(tr('Valores recomendados CODATA 2018. «Exacta»: valor fijado por definición en el SI desde 2019.'))}</p>`;
        if (tab === 'units') { fillUnits(); conv(); } if (tab === 'si') si(); if (tab === 'const') consts();
      }
      const fillUnits = () => { const c = q(V, '[data-cat]').value; q(V, '[data-uf]').innerHTML = Object.keys(UNITS[c]).map(u => `<option>${esc(u)}</option>`).join(''); };
      const toK = (v, u) => u === 'K' ? v : u === 'C' ? v + 273.15 : (v - 32) * 5 / 9 + 273.15, fromK = (k, u) => u === 'K' ? k : u === 'C' ? k - 273.15 : (k - 273.15) * 9 / 5 + 32;
      function conv() { const c = q(V, '[data-cat]').value, U = UNITS[c], from = q(V, '[data-uf]').value, v = parseFloat(String(q(V, '[data-uv]').value).replace(',', '.')); if (isNaN(v)) { q(V, '[data-ures]').innerHTML = ''; return; } q(V, '[data-ures]').innerHTML = `<table class="k9-table"><tbody>${Object.keys(U).map(u => { const r = c === 'Temperatura' ? fromK(toK(v, U[from]), U[u]) : v * U[from] / U[u]; return `<tr${u === from ? ' class="a9-sc-on"' : ''}><td>${esc(u)}</td><td class="k9-mono">${esc(fmtNum(r, 10))}</td><td><button class="k9-btn" data-copy="${esc(String(r))}" aria-label="${esc(tr('Copiar'))}">${I('copy', 13)}</button></td></tr>`; }).join('')}</tbody></table>`; }
      function si() {
        const v = parseFloat(String(q(V, '[data-sv]').value).replace(',', '.')), u = q(V, '[data-su]').value, d = Math.max(1, Math.min(15, +q(V, '[data-sd]').value || 6)), R = q(V, '[data-sres]');
        if (isNaN(v)) { R.innerHTML = ''; return; }
        const e = v === 0 ? 0 : Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, e), e3 = Math.floor(e / 3) * 3, m3 = v / Math.pow(10, e3), p = PREF.find(x => x[1] === e3);
        const rows = [['Notación científica', `${(+m.toPrecision(d))} × 10${sup(e)}`], ['Notación de ingeniería', `${(+m3.toPrecision(d))} × 10${sup(e3)}`], ['Con prefijo SI', p ? `${+m3.toPrecision(d)} ${p[0]}${u}` : '—'], ['Notación E', v.toExponential(d - 1)], ['Decimal', fmtNum(v, d)]];
        R.innerHTML = `<table class="k9-table"><tbody>${rows.map(([l, x]) => `<tr><td>${esc(tr(l))}</td><td class="k9-mono"><b>${esc(x)}</b></td></tr>`).join('')}</tbody></table><h4 class="a9-h" style="margin-top:12px">${esc(tr('Prefijos del SI'))}</h4><div class="a9-sc-pref">${PREF.filter(x => x[0]).map(([s, x]) => `<span><b>${s}</b> 10${sup(x)}</span>`).join('')}</div>`;
      }
      function consts() { const n = K.norm((q(V, '[data-cq]') || {}).value || ''); q(V, '[data-cl]').innerHTML = CONST.filter(c => !n || K.norm(c.join(' ')).includes(n)).map(([s, l, v, u, ex]) => `<div class="k9-li"><b class="a9-sc-sym">${esc(s)}</b><div class="t"><b>${esc(tr(l))}</b><small class="k9-mono">${esc(v.replace(/e(-?\d+)/, (m, x) => ' × 10' + sup(x)))} ${esc(u)}${ex ? ' · ' + esc(tr('exacta')) : ''}</small></div><button class="k9-btn" data-copy="${esc(v)}" aria-label="${esc(tr('Copiar'))}">${I('copy', 13)}</button></div>`).join(''); }
      b.addEventListener('input', e => {
        const bi = e.target.closest('[data-base]'); if (bi) { const r = +bi.dataset.base, s = bi.value.trim().replace(/\s|_/g, '').toLowerCase(), neg = s.startsWith('-'), body = neg ? s.slice(1) : s; const ok = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[\da-f]+$/ }[r]; if (!body || !ok.test(body)) { bi.classList.add('a9-bad'); return; } bi.classList.remove('a9-bad'); let n = 0n; for (const ch of body) n = n * BigInt(r) + BigInt(parseInt(ch, 16)); if (neg) n = -n; qa(V, '[data-base]').forEach(x => { if (x !== bi) x.value = (n < 0n ? '-' : '') + (n < 0n ? -n : n).toString(+x.dataset.base).toUpperCase(); }); const a = n < 0n ? -n : n; q(V, '[data-binfo]').textContent = `${a.toString(2).length} ${tr('bits')} · ${Math.ceil(a.toString(2).length / 8)} ${tr('bytes')}${a < 1114112n && a > 31n ? ' · ' + tr('carácter Unicode') + ': ' + String.fromCodePoint(Number(a)) : ''}`; return; }
        if (e.target.matches('[data-sv],[data-su],[data-sd]')) si();
        if (e.target.matches('[data-uv]')) conv();
        if (e.target.matches('[data-cq]')) consts();
      });
      b.addEventListener('change', e => { if (e.target.matches('[data-cat]')) { fillUnits(); conv(); } if (e.target.matches('[data-uf]')) conv(); });
      b.addEventListener('click', e => { const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; draw(); return; } const c = e.target.closest('[data-copy]'); if (c) K.ui.copy(c.dataset.copy); });
      draw();
    }
  });

  /* ======================================================================
     Laboratorio de fórmulas (despeje numérico de cualquier variable)
     ====================================================================== */
  const G_ = 6.6743e-11, KE = 8.9875517923e9, CL = 299792458, RG = 8.314462618, NA = 6.02214076e23;
  const f = (cat, name, txt, vars, fn, info) => ({ cat, name, txt, vars: vars.map(v => { const [k, n, u, def] = v.split('|'); return { k, n, u: u || '', def: def === undefined ? '' : def }; }), fn, info });
  const FORMULAS = [
    f('Cinemática', 'Velocidad media', 'v = d / t', ['v|Velocidad|m/s', 'd|Distancia|m|100', 't|Tiempo|s|9.58'], o => o.v - o.d / o.t, 'Distancia recorrida dividida entre el tiempo empleado.'),
    f('Cinemática', 'MRUA: velocidad', 'v = v₀ + a·t', ['v|Velocidad final|m/s', 'v0|Velocidad inicial|m/s|0', 'a|Aceleración|m/s²|9.81', 't|Tiempo|s|3'], o => o.v - (o.v0 + o.a * o.t), 'Movimiento rectilíneo uniformemente acelerado.'),
    f('Cinemática', 'MRUA: posición', 'x = x₀ + v₀·t + ½·a·t²', ['x|Posición final|m', 'x0|Posición inicial|m|0', 'v0|Velocidad inicial|m/s|0', 'a|Aceleración|m/s²|9.81', 't|Tiempo|s|2'], o => o.x - (o.x0 + o.v0 * o.t + 0.5 * o.a * o.t * o.t), 'Si despejas t, puede haber dos soluciones: se muestra la positiva.'),
    f('Cinemática', 'MRUA sin tiempo', 'v² = v₀² + 2·a·d', ['v|Velocidad final|m/s', 'v0|Velocidad inicial|m/s|0', 'a|Aceleración|m/s²|9.81', 'd|Desplazamiento|m|20'], o => o.v * o.v - (o.v0 * o.v0 + 2 * o.a * o.d), ''),
    f('Cinemática', 'Caída libre: tiempo', 'h = ½·g·t²', ['h|Altura|m|45', 'g|Gravedad|m/s²|9.81', 't|Tiempo|s'], o => o.h - 0.5 * o.g * o.t * o.t, ''),
    f('Cinemática', 'Aceleración centrípeta', 'a = v² / r', ['a|Aceleración centrípeta|m/s²', 'v|Velocidad|m/s|10', 'r|Radio|m|5'], o => o.a - o.v * o.v / o.r, ''),
    f('Dinámica', 'Segunda ley de Newton', 'F = m·a', ['F|Fuerza|N', 'm|Masa|kg|10', 'a|Aceleración|m/s²|2'], o => o.F - o.m * o.a, 'La fuerza neta es igual a la masa por la aceleración.'),
    f('Dinámica', 'Peso', 'P = m·g', ['P|Peso|N', 'm|Masa|kg|70', 'g|Gravedad|m/s²|9.81'], o => o.P - o.m * o.g, 'En la Luna g ≈ 1.62 m/s².'),
    f('Dinámica', 'Fuerza de rozamiento', 'Fr = μ·N', ['Fr|Rozamiento|N', 'mu|Coeficiente μ||0.3', 'N|Fuerza normal|N|200'], o => o.Fr - o.mu * o.N, ''),
    f('Dinámica', 'Ley de Hooke', 'F = k·x', ['F|Fuerza|N', 'k|Constante elástica|N/m|250', 'x|Deformación|m|0.04'], o => o.F - o.k * o.x, ''),
    f('Dinámica', 'Gravitación universal', 'F = G·m₁·m₂ / r²', ['F|Fuerza|N', 'm1|Masa 1|kg|5.972e24', 'm2|Masa 2|kg|7.348e22', 'r|Distancia|m|3.844e8'], o => o.F - G_ * o.m1 * o.m2 / (o.r * o.r), 'G = 6.674 × 10⁻¹¹ N·m²/kg².'),
    f('Dinámica', 'Fuerza centrípeta', 'F = m·v² / r', ['F|Fuerza|N', 'm|Masa|kg|1000', 'v|Velocidad|m/s|20', 'r|Radio|m|50'], o => o.F - o.m * o.v * o.v / o.r, ''),
    f('Dinámica', 'Cantidad de movimiento', 'p = m·v', ['p|Momento lineal|kg·m/s', 'm|Masa|kg|0.145', 'v|Velocidad|m/s|40'], o => o.p - o.m * o.v, ''),
    f('Energía', 'Energía cinética', 'Ec = ½·m·v²', ['Ec|Energía cinética|J', 'm|Masa|kg|2', 'v|Velocidad|m/s|3'], o => o.Ec - 0.5 * o.m * o.v * o.v, ''),
    f('Energía', 'Energía potencial gravitatoria', 'Ep = m·g·h', ['Ep|Energía potencial|J', 'm|Masa|kg|2', 'g|Gravedad|m/s²|9.81', 'h|Altura|m|10'], o => o.Ep - o.m * o.g * o.h, ''),
    f('Energía', 'Energía potencial elástica', 'Ee = ½·k·x²', ['Ee|Energía elástica|J', 'k|Constante elástica|N/m|250', 'x|Deformación|m|0.1'], o => o.Ee - 0.5 * o.k * o.x * o.x, ''),
    f('Energía', 'Trabajo', 'W = F·d·cos θ', ['W|Trabajo|J', 'F|Fuerza|N|50', 'd|Distancia|m|4', 'th|Ángulo θ|°|0'], o => o.W - o.F * o.d * Math.cos(o.th * Math.PI / 180), ''),
    f('Energía', 'Potencia', 'P = W / t', ['P|Potencia|W', 'W|Trabajo|J|1200', 't|Tiempo|s|60'], o => o.P - o.W / o.t, ''),
    f('Energía', 'Equivalencia masa-energía', 'E = m·c²', ['E|Energía|J', 'm|Masa|kg|0.001'], o => o.E - o.m * CL * CL, 'c = 299 792 458 m/s.'),
    f('Fluidos', 'Densidad', 'ρ = m / V', ['rho|Densidad ρ|kg/m³', 'm|Masa|kg|2', 'V|Volumen|m³|0.002'], o => o.rho - o.m / o.V, ''),
    f('Fluidos', 'Presión', 'P = F / A', ['P|Presión|Pa', 'F|Fuerza|N|500', 'A|Área|m²|0.25'], o => o.P - o.F / o.A, ''),
    f('Fluidos', 'Presión hidrostática', 'P = ρ·g·h', ['P|Presión|Pa', 'rho|Densidad ρ|kg/m³|1000', 'g|Gravedad|m/s²|9.81', 'h|Profundidad|m|10'], o => o.P - o.rho * o.g * o.h, ''),
    f('Fluidos', 'Empuje (Arquímedes)', 'E = ρ·g·V', ['E|Empuje|N', 'rho|Densidad del fluido|kg/m³|1000', 'g|Gravedad|m/s²|9.81', 'V|Volumen sumergido|m³|0.01'], o => o.E - o.rho * o.g * o.V, ''),
    f('Fluidos', 'Caudal', 'Q = A·v', ['Q|Caudal|m³/s', 'A|Sección|m²|0.01', 'v|Velocidad|m/s|2'], o => o.Q - o.A * o.v, ''),
    f('Ondas', 'Periodo del péndulo', 'T = 2π·√(L / g)', ['T|Periodo|s', 'L|Longitud|m|1', 'g|Gravedad|m/s²|9.81'], o => o.T - 2 * Math.PI * Math.sqrt(o.L / o.g), 'Válido para oscilaciones pequeñas.'),
    f('Ondas', 'Frecuencia y periodo', 'f = 1 / T', ['f|Frecuencia|Hz', 'T|Periodo|s|0.02'], o => o.f - 1 / o.T, ''),
    f('Ondas', 'Velocidad de una onda', 'v = λ·f', ['v|Velocidad|m/s', 'l|Longitud de onda λ|m|0.5', 'f|Frecuencia|Hz|680'], o => o.v - o.l * o.f, ''),
    f('Ondas', 'Energía de un fotón', 'E = h·c / λ', ['E|Energía|J', 'l|Longitud de onda λ|m|5.5e-7'], o => o.E - 6.62607015e-34 * CL / o.l, ''),
    f('Óptica', 'Índice de refracción', 'n = c / v', ['n|Índice n|', 'v|Velocidad en el medio|m/s|2.25e8'], o => o.n - CL / o.v, ''),
    f('Óptica', 'Ley de Snell', 'n₁·sen θ₁ = n₂·sen θ₂', ['n1|Índice 1||1', 'th1|Ángulo 1|°|30', 'n2|Índice 2||1.33', 'th2|Ángulo 2|°'], o => o.n1 * Math.sin(o.th1 * Math.PI / 180) - o.n2 * Math.sin(o.th2 * Math.PI / 180), ''),
    f('Óptica', 'Lente delgada', '1/f = 1/dₒ + 1/dᵢ', ['f|Distancia focal|m', 'do|Distancia al objeto|m|0.3', 'di|Distancia a la imagen|m|0.15'], o => 1 / o.f - (1 / o.do + 1 / o.di), ''),
    f('Electricidad', 'Ley de Ohm', 'V = I·R', ['V|Voltaje|V', 'I|Corriente|A|0.5', 'R|Resistencia|Ω|220'], o => o.V - o.I * o.R, ''),
    f('Electricidad', 'Potencia eléctrica', 'P = V·I', ['P|Potencia|W', 'V|Voltaje|V|230', 'I|Corriente|A|2'], o => o.P - o.V * o.I, ''),
    f('Electricidad', 'Ley de Coulomb', 'F = k·q₁·q₂ / r²', ['F|Fuerza|N', 'q1|Carga 1|C|1e-6', 'q2|Carga 2|C|2e-6', 'r|Distancia|m|0.05'], o => o.F - KE * o.q1 * o.q2 / (o.r * o.r), 'k = 8.988 × 10⁹ N·m²/C².'),
    f('Electricidad', 'Energía consumida', 'E = P·t', ['E|Energía|kWh', 'P|Potencia|kW|2', 't|Tiempo|h|3'], o => o.E - o.P * o.t, ''),
    f('Electricidad', 'Constante de tiempo RC', 'τ = R·C', ['tau|Constante τ|s', 'R|Resistencia|Ω|10000', 'C|Capacidad|F|0.0001'], o => o.tau - o.R * o.C, ''),
    f('Calor', 'Calor sensible', 'Q = m·c·ΔT', ['Q|Calor|J', 'm|Masa|kg|1', 'c|Calor específico|J/(kg·K)|4186', 'dT|ΔT|K|10'], o => o.Q - o.m * o.c * o.dT, ''),
    f('Calor', 'Dilatación lineal', 'ΔL = α·L₀·ΔT', ['dL|ΔL|m', 'a|Coeficiente α|1/K|1.2e-5', 'L0|Longitud inicial|m|10', 'dT|ΔT|K|30'], o => o.dL - o.a * o.L0 * o.dT, ''),
    f('Calor', 'Gases ideales', 'P·V = n·R·T', ['P|Presión|Pa|101325', 'V|Volumen|m³', 'n|Cantidad|mol|1', 'T|Temperatura|K|273.15'], o => o.P * o.V - o.n * RG * o.T, 'R = 8.314 J/(mol·K).'),
    f('Química', 'Moles', 'n = m / M', ['n|Moles|mol', 'm|Masa|g|36', 'M|Masa molar|g/mol|18'], o => o.n - o.m / o.M, ''),
    f('Química', 'Molaridad', 'M = n / V', ['M|Molaridad|mol/L', 'n|Moles|mol|0.5', 'V|Volumen|L|0.25'], o => o.M - o.n / o.V, ''),
    f('Química', 'Dilución', 'C₁·V₁ = C₂·V₂', ['C1|Concentración 1|mol/L|2', 'V1|Volumen 1|L', 'C2|Concentración 2|mol/L|0.5', 'V2|Volumen 2|L|1'], o => o.C1 * o.V1 - o.C2 * o.V2, ''),
    f('Química', 'pH', 'pH = −log₁₀[H⁺]', ['pH|pH|', 'H|[H⁺]|mol/L|1e-7'], o => o.pH + Math.log10(o.H), ''),
    f('Química', 'Ley de Boyle', 'P₁·V₁ = P₂·V₂', ['P1|Presión 1|atm|1', 'V1|Volumen 1|L|10', 'P2|Presión 2|atm|2', 'V2|Volumen 2|L'], o => o.P1 * o.V1 - o.P2 * o.V2, 'A temperatura constante.'),
    f('Química', 'Ley de Charles', 'V₁ / T₁ = V₂ / T₂', ['V1|Volumen 1|L|2', 'T1|Temperatura 1|K|300', 'V2|Volumen 2|L', 'T2|Temperatura 2|K|450'], o => o.V1 / o.T1 - o.V2 / o.T2, 'A presión constante; T en kelvin.'),
    f('Química', 'Número de partículas', 'N = n·Nₐ', ['N|Partículas|', 'n|Moles|mol|2'], o => o.N - o.n * NA, 'Nₐ = 6.022 × 10²³.'),
    f('Química', 'Porcentaje en masa', '% = m_soluto / m_disolución · 100', ['pc|Porcentaje|%', 'ms|Masa de soluto|g|20', 'mt|Masa de disolución|g|200'], o => o.pc - o.ms / o.mt * 100, ''),
    f('Matemáticas', 'Teorema de Pitágoras', 'c² = a² + b²', ['c|Hipotenusa|', 'a|Cateto a||3', 'b|Cateto b||4'], o => o.c * o.c - (o.a * o.a + o.b * o.b), ''),
    f('Matemáticas', 'Área del círculo', 'A = π·r²', ['A|Área|u²', 'r|Radio|u|5'], o => o.A - Math.PI * o.r * o.r, ''),
    f('Matemáticas', 'Longitud de la circunferencia', 'C = 2π·r', ['C|Longitud|u', 'r|Radio|u|5'], o => o.C - 2 * Math.PI * o.r, ''),
    f('Matemáticas', 'Área del triángulo', 'A = b·h / 2', ['A|Área|u²', 'b|Base|u|6', 'h|Altura|u|4'], o => o.A - o.b * o.h / 2, ''),
    f('Matemáticas', 'Volumen de la esfera', 'V = 4/3·π·r³', ['V|Volumen|u³', 'r|Radio|u|3'], o => o.V - 4 / 3 * Math.PI * o.r ** 3, ''),
    f('Matemáticas', 'Volumen del cilindro', 'V = π·r²·h', ['V|Volumen|u³', 'r|Radio|u|2', 'h|Altura|u|10'], o => o.V - Math.PI * o.r * o.r * o.h, ''),
    f('Matemáticas', 'Interés compuesto', 'A = P·(1 + r/n)^(n·t)', ['A|Monto final|$', 'P|Capital|$|1000', 'r|Tasa anual (0.05 = 5 %)||0.05', 'n|Capitalizaciones por año||12', 't|Años||10'], o => o.A - o.P * Math.pow(1 + o.r / o.n, o.n * o.t), '')
  ];
  function solveFor(fm, unk, vals) {
    const g = x => { const o = Object.assign({}, vals, { [unk]: x }); const r = fm.fn(o); return isFinite(r) ? r : NaN; };
    const roots = [];
    const newton = x0 => { let x = x0; for (let i = 0; i < 80; i++) { const y = g(x); if (!isFinite(y)) return null; if (Math.abs(y) < 1e-13 * (1 + Math.abs(x))) return x; const hh = 1e-7 * (Math.abs(x) + 1e-7), d = (g(x + hh) - g(x - hh)) / (2 * hh); if (!isFinite(d) || d === 0) return null; const nx = x - y / d; if (!isFinite(nx)) return null; if (Math.abs(nx - x) < 1e-14 * (1 + Math.abs(x))) return nx; x = nx; } return Math.abs(g(x)) < 1e-6 * (1 + Math.abs(x)) ? x : null; };
    const add = r => { if (r != null && isFinite(r) && Math.abs(g(r)) < 1e-6 * (1 + Math.abs(r)) && !roots.some(x => Math.abs(x - r) < 1e-9 * (1 + Math.abs(r)))) roots.push(r); };
    [1, 0.5, 2, 10, 0.01, 100, 1e4, 1e-4, -1, 1e8, 1e-8, 1e12, 1e-12, 1e20, 1e-20].forEach(x0 => add(newton(x0)));
    // búsqueda de cambios de signo en escala logarítmica (positivos y negativos) + bisección
    const pts = []; for (let e = -30; e <= 30; e += 0.25) { pts.push(Math.pow(10, e)); pts.push(-Math.pow(10, e)); } pts.sort((a, c) => a - c);
    for (let i = 1; i < pts.length; i++) { let a = pts[i - 1], c = pts[i], fa = g(a), fc = g(c); if (!isFinite(fa) || !isFinite(fc) || fa * fc > 0) continue; for (let k = 0; k < 200; k++) { const m = (a + c) / 2, fm2 = g(m); if (!isFinite(fm2)) break; if (fa * fm2 <= 0) { c = m; fc = fm2; } else { a = m; fa = fm2; } } add((a + c) / 2); }
    return roots.sort((a, c) => (c > 0) - (a > 0) || Math.abs(a) - Math.abs(c));
  }
  K.define('formulas', {
    init(b) {
      const defUnk = i => (FORMULAS[i].vars.find(v => v.def === '') || FORMULAS[i].vars[0]).k;
      let cur = 0, unk = defUnk(0), fq = '';
      b.innerHTML = `<div class="k9"><div class="k9-split" style="grid-template-columns:260px 1fr"><aside class="k9-side"><input class="input-text" data-q placeholder="${esc(tr('Buscar fórmula…'))}" style="margin-bottom:6px"><div data-list></div></aside><main class="k9-main k9-body" data-main></main></div></div>`;
      function list() { const n = K.norm(fq); let last = ''; q(b, '[data-list]').innerHTML = FORMULAS.map((x, i) => ({ x, i })).filter(({ x }) => !n || K.norm(x.name + ' ' + x.cat + ' ' + x.txt).includes(n)).map(({ x, i }) => { const h = x.cat !== last ? `<h6>${esc(tr(x.cat))}</h6>` : ''; last = x.cat; return h + `<button class="k9-item${i === cur ? ' on' : ''}" data-f="${i}">${esc(tr(x.name))}</button>`; }).join(''); }
      function main() {
        const fm = FORMULAS[cur], saved = (get('formulas', {}) || {})[fm.name] || {};
        q(b, '[data-main]').innerHTML = `<div class="k9-card"><div class="k9-small k9-muted">${esc(tr(fm.cat))}</div><h3 style="font-size:17px;margin:2px 0 8px">${esc(tr(fm.name))}</h3><div class="a9-fl-formula">${esc(fm.txt)}</div>${fm.info ? `<p class="k9-small k9-muted" style="margin-top:6px">${esc(tr(fm.info))}</p>` : ''}</div>
          <div class="k9-card"><h4>${esc(tr('Datos'))} <span class="k9-small k9-muted" style="font-weight:400">${esc(tr('Marca la variable que quieres calcular'))}</span></h4>${fm.vars.map(v => `<label class="a9-fl-row${v.k === unk ? ' unk' : ''}"><input type="radio" name="unk" value="${esc(v.k)}"${v.k === unk ? ' checked' : ''}><span class="a9-fl-n">${esc(tr(v.n))}</span><input class="input-text k9-mono" data-v="${esc(v.k)}" value="${esc(v.k === unk ? '' : (saved[v.k] ?? v.def))}" ${v.k === unk ? 'disabled placeholder="?"' : ''}><span class="a9-fl-u">${esc(v.u)}</span></label>`).join('')}<div class="k9-row" style="margin-top:10px"><button class="k9-btn pri" data-a="calc">${esc(tr('Calcular'))}</button></div><div data-res style="margin-top:10px"></div></div>`;
      }
      function calc() {
        const fm = FORMULAS[cur], vals = {}, store = {}; let bad = null;
        fm.vars.forEach(v => { if (v.k === unk) return; const s = q(b, `[data-v="${v.k}"]`).value.trim().replace(',', '.').replace(/×\s*10\^?/i, 'e'); const x = Number(s); if (s === '' || !isFinite(x)) bad = v; vals[v.k] = x; store[v.k] = s; });
        const R = q(b, '[data-res]');
        if (bad) { R.innerHTML = `<p class="k9-bad">${esc(tr('Falta un valor válido para'))} «${esc(tr(bad.n))}»</p>`; return; }
        const all = get('formulas', {}) || {}; all[fm.name] = store; put('formulas', all);
        const roots = solveFor(fm, unk, vals), v = fm.vars.find(x => x.k === unk);
        if (!roots.length) { R.innerHTML = `<p class="k9-bad">${esc(tr('No hay solución con esos datos (o no es un número real).'))}</p>`; return; }
        R.innerHTML = `<div class="a9-alg-res"><div class="a9-alg-big">${esc(tr(v.n))} = ${esc(fmtNum(roots[0], 8))} ${esc(v.u)}</div>${roots.length > 1 ? `<p class="k9-small k9-muted">${esc(tr('Otras soluciones'))}: ${roots.slice(1, 4).map(r => esc(fmtNum(r, 8))).join(', ')}</p>` : ''}<p class="k9-small k9-muted">${esc(tr('Despeje numérico (Newton y bisección); se muestra primero la solución positiva.'))}</p></div>`;
        K.activity('science', 'formulas', fm.name);
      }
      b.addEventListener('click', e => { const fb = e.target.closest('[data-f]'); if (fb) { cur = +fb.dataset.f; unk = defUnk(cur); list(); main(); return; } if (e.target.closest('[data-a="calc"]')) calc(); });
      b.addEventListener('change', e => { if (e.target.name === 'unk') { unk = e.target.value; main(); } });
      b.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-v]')) calc(); });
      q(b, '[data-q]').addEventListener('input', e => { fq = e.target.value; list(); });
      list(); main();
    }
  });

  /* ======================================================================
     Editor de ecuaciones: sintaxis tipo LaTeX → MathML
     ====================================================================== */
  const GREEK = 'alpha:α beta:β gamma:γ delta:δ epsilon:ε varepsilon:ε zeta:ζ eta:η theta:θ vartheta:ϑ iota:ι kappa:κ lambda:λ mu:μ nu:ν xi:ξ pi:π varpi:ϖ rho:ρ sigma:σ varsigma:ς tau:τ upsilon:υ phi:φ varphi:ϕ chi:χ psi:ψ omega:ω Gamma:Γ Delta:Δ Theta:Θ Lambda:Λ Xi:Ξ Pi:Π Sigma:Σ Upsilon:Υ Phi:Φ Psi:Ψ Omega:Ω';
  const SYMS = 'pm:± mp:∓ times:× cdot:⋅ div:÷ leq:≤ le:≤ geq:≥ ge:≥ neq:≠ ne:≠ approx:≈ equiv:≡ sim:∼ propto:∝ infty:∞ to:→ rightarrow:→ leftarrow:← Rightarrow:⇒ Leftrightarrow:⇔ leftrightarrow:↔ implies:⟹ iff:⟺ partial:∂ nabla:∇ in:∈ notin:∉ subset:⊂ subseteq:⊆ supset:⊃ cup:∪ cap:∩ emptyset:∅ forall:∀ exists:∃ neg:¬ land:∧ lor:∨ angle:∠ perp:⊥ parallel:∥ degree:° circ:∘ ldots:… cdots:⋯ dots:… prime:′ hbar:ℏ ell:ℓ Re:ℜ Im:ℑ aleph:ℵ mathbb{R}:ℝ mathbb{N}:ℕ mathbb{Z}:ℤ mathbb{Q}:ℚ mathbb{C}:ℂ';
  const MAPG = Object.fromEntries(GREEK.split(' ').map(x => x.split(':'))), MAPS = Object.fromEntries(SYMS.split(' ').map(x => { const i = x.indexOf(':'); return [x.slice(0, i), x.slice(i + 1)]; }));
  const BIGOP = { sum: '∑', prod: '∏', int: '∫', iint: '∬', iiint: '∭', oint: '∮', bigcup: '⋃', bigcap: '⋂', lim: 'lim', max: 'max', min: 'min', sup: 'sup', inf: 'inf' };
  const FUNCS = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'log', 'ln', 'exp', 'det', 'gcd', 'deg', 'dim', 'arg'];
  function tex2mml(src) {
    let i = 0; const s = src;
    const x = t => esc(t);
    function cmd() { let m = s.slice(i).match(/^\\([a-zA-Z]+|.)/); if (!m) return null; i += m[0].length; if (m[1] === 'mathbb' && s[i] === '{') { const e = s.indexOf('}', i); const key = 'mathbb{' + s.slice(i + 1, e) + '}'; i = e + 1; return key; } return m[1]; }
    function group() { skip(); if (s[i] === '{') { i++; const r = seq(['}']); if (s[i] === '}') i++; return r; } return atom(true) || '<mrow></mrow>'; }
    function skip() { while (i < s.length && /\s/.test(s[i])) i++; }
    function optArg() { skip(); if (s[i] !== '[') return null; const e = s.indexOf(']', i); const r = s.slice(i + 1, e < 0 ? s.length : e); i = e < 0 ? s.length : e + 1; return tex2mml(r).replace(/^<math[^>]*>|<\/math>$/g, ''); }
    function atom(single) {
      skip(); if (i >= s.length) return null; const c = s[i];
      if (c === '{') { i++; const r = seq(['}']); if (s[i] === '}') i++; return r; }
      if (c === '\\') {
        const save = i, name = cmd();
        if (name === '\\') { i = save; return null; }
        if (name === 'frac' || name === 'dfrac' || name === 'tfrac') { const a = group(), b2 = group(); return `<mfrac>${a}${b2}</mfrac>`; }
        if (name === 'sqrt') { const n = optArg(), a = group(); return n ? `<mroot>${a}<mrow>${n}</mrow></mroot>` : `<msqrt>${a}</msqrt>`; }
        if (name === 'text' || name === 'mathrm' || name === 'textrm') { skip(); if (s[i] === '{') { const e = s.indexOf('}', i); const t = s.slice(i + 1, e < 0 ? s.length : e); i = e < 0 ? s.length : e + 1; return `<mtext>${x(t)}</mtext>`; } return ''; }
        if (name === 'overline' || name === 'bar') return `<mover accent="true">${group()}<mo>¯</mo></mover>`;
        if (name === 'hat') return `<mover accent="true">${group()}<mo>^</mo></mover>`;
        if (name === 'vec') return `<mover accent="true">${group()}<mo>→</mo></mover>`;
        if (name === 'dot') return `<mover accent="true">${group()}<mo>˙</mo></mover>`;
        if (name === 'underline') return `<munder>${group()}<mo>_</mo></munder>`;
        if (name === 'left' || name === 'right') { skip(); let d = s[i]; if (d === '\\') { const sv = i; const nm = cmd(); d = nm === '{' ? '{' : nm === '}' ? '}' : nm === '|' ? '‖' : nm === 'langle' ? '⟨' : nm === 'rangle' ? '⟩' : (i = sv, s[i++], ''); } else i++; return d === '.' ? '' : `<mo stretchy="true">${x(d)}</mo>`; }
        if (name === 'begin') { skip(); const e = s.indexOf('}', i); const env = s.slice(i + 1, e); i = e + 1; const rows = [[]]; for (;;) { const cell = seq(['&', '\\\\', '\\end']); rows[rows.length - 1].push(cell); if (s.startsWith('&', i)) { i++; continue; } if (s.startsWith('\\\\', i)) { i += 2; rows.push([]); continue; } break; } if (s.startsWith('\\end', i)) { const e2 = s.indexOf('}', i); i = e2 < 0 ? s.length : e2 + 1; } const tbl = `<mtable>${rows.filter(r => r.length && !(r.length === 1 && r[0] === '<mrow></mrow>')).map(r => `<mtr>${r.map(cl => `<mtd>${cl}</mtd>`).join('')}</mtr>`).join('')}</mtable>`; const fence = { pmatrix: ['(', ')'], bmatrix: ['[', ']'], vmatrix: ['|', '|'], Bmatrix: ['{', '}'], cases: ['{', ''] }[env]; return fence ? `<mrow><mo>${fence[0]}</mo>${tbl}${fence[1] ? `<mo>${fence[1]}</mo>` : ''}</mrow>` : tbl; }
        if (BIGOP[name]) return `<mo${/^(sum|prod|bigcup|bigcap)$/.test(name) ? ' largeop="true" movablelimits="false"' : name.length > 3 || /^(lim|max|min|sup|inf)$/.test(name) ? ' movablelimits="false"' : ''} data-big="${name}">${BIGOP[name]}</mo>`;
        if (FUNCS.includes(name)) return `<mi>${name}</mi><mo>&#x2061;</mo>`;
        if (MAPG[name]) return `<mi>${MAPG[name]}</mi>`;
        if (MAPS[name]) return `<mo>${MAPS[name]}</mo>`;
        if (name === ',' || name === ';' || name === ' ' || name === 'quad' || name === 'qquad') return `<mspace width="${name === 'qquad' ? '2em' : name === 'quad' ? '1em' : '0.3em'}"></mspace>`;
        if (name === '{' || name === '}' || name === '%' || name === '$' || name === '#' || name === '&' || name === '_') return `<mo>${x(name)}</mo>`;
        return `<mtext mathcolor="#e5484d">\\${x(name)}</mtext>`;
      }
      if (/\d/.test(c) || (c === '.' && /\d/.test(s[i + 1] || ''))) { const m = s.slice(i).match(/^\d*\.?\d+/); i += m[0].length; return `<mn>${m[0]}</mn>`; }
      if (/[a-zA-Z]/.test(c)) { i++; return `<mi>${c}</mi>`; }
      if (c === '}' || c === '&' || c === '^' || c === '_') return null;
      i++; return `<mo>${x(c === '-' ? '−' : c === '*' ? '⋅' : c === "'" ? '′' : c)}</mo>`;
    }
    function scripts(base) {
      for (;;) {
        skip(); const c = s[i];
        if (c !== '^' && c !== '_') return base;
        let sub = null, supx = null;
        while (s[i] === '^' || s[i] === '_') { const k = s[i++]; const g = group(); if (k === '^') supx = g; else sub = g; skip(); }
        const big = /data-big="(sum|prod|lim|max|min|bigcup|bigcap|sup|inf)"/.test(base);
        if (big) return sub && supx ? `<munderover>${base}${sub}${supx}</munderover>` : sub ? `<munder>${base}${sub}</munder>` : `<mover>${base}${supx}</mover>`;
        base = sub && supx ? `<msubsup>${base}${sub}${supx}</msubsup>` : sub ? `<msub>${base}${sub}</msub>` : `<msup>${base}${supx}</msup>`;
      }
    }
    function seq(stops) { let out = ''; for (;;) { skip(); if (i >= s.length || stops.some(t => s.startsWith(t, i))) break; const a = atom(); if (a === null) { if (s[i] === '^' || s[i] === '_') { out = scripts(out ? `<mrow>${out}</mrow>` : '<mrow></mrow>'); continue; } if (stops.some(t => s.startsWith(t, i)) || i >= s.length) break; i++; continue; } out += scripts(a); } return `<mrow>${out}</mrow>`; }
    const body = seq([]).replace(/ data-big="\w+"/g, '');
    return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">${body}</math>`;
  }
  K.tex2mml = tex2mml;
  K.define('equations', {
    init(b) {
      const PAL = [['Estructuras', ['\\frac{a}{b}', '\\sqrt{x}', '\\sqrt[n]{x}', 'x^{2}', 'x_{i}', '\\sum_{i=1}^{n}', '\\int_{a}^{b}', '\\lim_{x \\to 0}', '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', '\\vec{v}', '\\overline{x}', '\\left( \\right)']], ['Griego', ['\\alpha', '\\beta', '\\gamma', '\\delta', '\\theta', '\\lambda', '\\mu', '\\pi', '\\sigma', '\\phi', '\\omega', '\\Delta', '\\Sigma', '\\Omega']], ['Símbolos', ['\\pm', '\\times', '\\cdot', '\\div', '\\leq', '\\geq', '\\neq', '\\approx', '\\infty', '\\to', '\\Rightarrow', '\\partial', '\\nabla', '\\in', '\\forall', '\\exists', '\\mathbb{R}']]];
      const EX = ['x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', 'e^{i\\pi} + 1 = 0', '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}', '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}', 'A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}', '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1', 'F = G \\frac{m_1 m_2}{r^2}'];
      b.innerHTML = `<div class="k9 a9-eqe"><div class="k9-bar"><select class="input-text" data-ex><option value="">${esc(tr('Ejemplos…'))}</option>${EX.map((x, i) => `<option value="${i}">${esc(x.slice(0, 40))}</option>`).join('')}</select><span class="sp"></span><button class="k9-btn" data-a="mml">${I('copy', 14)} MathML</button><button class="k9-btn" data-a="tex">${I('copy', 14)} LaTeX</button><button class="k9-btn" data-a="png">${I('image', 14)} ${esc(tr('Imagen'))}</button><button class="k9-btn pri" data-a="save">${I('save', 14)} ${esc(tr('Guardar HTML'))}</button></div>
        <div class="a9-eqe-pal">${PAL.map(([g, l]) => `<div><small>${esc(tr(g))}</small>${l.map(t => `<button class="k9-btn" data-ins="${esc(t)}" title="${esc(t)}">${tex2mml(t.replace(/\\left\( \\right\)/, '( )')).replace(' display="block"', '')}</button>`).join('')}</div>`).join('')}</div>
        <textarea class="input-text k9-mono a9-eqe-in" data-src spellcheck="false" aria-label="LaTeX"></textarea><div class="a9-eqe-view" data-view aria-live="polite"></div></div>`;
      const src = q(b, '[data-src]'), view = q(b, '[data-view]');
      const draw = () => { view.innerHTML = tex2mml(src.value); put('eq', src.value.slice(0, 5000)); };
      src.addEventListener('input', draw);
      b.addEventListener('change', e => { if (e.target.matches('[data-ex]') && e.target.value !== '') { src.value = EX[+e.target.value]; draw(); e.target.value = ''; } });
      b.addEventListener('click', async e => {
        const ins = e.target.closest('[data-ins]'); if (ins) { src.focus(); src.setRangeText(ins.dataset.ins + ' ', src.selectionStart, src.selectionEnd, 'end'); draw(); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'mml') K.ui.copy(tex2mml(src.value)); if (k === 'tex') K.ui.copy(src.value);
        if (k === 'save') { const n = await K.ui.prompt(tr('Guardar ecuación'), tr('Nombre'), 'ecuacion.html'); if (!n) return; const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(n)}</title></head><body style="font-size:24px;font-family:serif;padding:2rem">${tex2mml(src.value)}<pre style="font-size:13px;color:#555">${esc(src.value)}</pre></body></html>`; const nm = await F.uniqueName('documents', F.cleanName(/\.html?$/i.test(n) ? n : n + '.html')); await F.save(nm, new Blob([html], { type: 'text/html' }), 'documents'); E.toast(tr('Guardado en Archivos') + ': ' + nm); }
        if (k === 'png') { const r = view.getBoundingClientRect(), mml = view.innerHTML; const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(r.width)}" height="${Math.ceil(r.height)}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:22px;color:#111;background:#fff;padding:10px;display:flex;align-items:center;justify-content:center;height:100%;box-sizing:border-box">${mml}</div></foreignObject></svg>`; devDownload('ecuacion.svg', new Blob([svg], { type: 'image/svg+xml' })); }
      });
      src.value = get('eq', '') || EX[0]; draw();
    }
  });

  /* ======================================================================
     Organizador académico
     ====================================================================== */
  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  K.define('academic', {
    init(b) {
      let tab = 'week';
      const D = Object.assign({ subjects: [], schedule: [], grades: [], tasks: [], scale: 10 }, get('academic', {}));
      const save = () => put('academic', D), uid = () => E.uid();
      const subj = id => D.subjects.find(s => s.id === id) || { name: '—', color: '#666' };
      const COLORS = ['#2a9d76', '#c93a73', '#6a9fd8', '#d79a3c', '#8a74c4', '#e5484d', '#34a582', '#e8709f'];
      b.innerHTML = `<div class="k9">${tabsUi([['week', 'Horario'], ['tasks', 'Entregas y exámenes'], ['grades', 'Calificaciones'], ['subjects', 'Materias']], tab)}<div class="k9-body" data-v></div></div>`;
      const V = q(b, '[data-v]');
      const avg = sid => { const g = D.grades.filter(x => x.sid === sid && x.max > 0); const w = g.reduce((a, x) => a + (+x.weight || 1), 0); return w ? g.reduce((a, x) => a + x.score / x.max * (+x.weight || 1), 0) / w * D.scale : null; };
      const today = () => new Date().toISOString().slice(0, 10);
      function draw() {
        qa(b, '[data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
        if (!D.subjects.length && tab !== 'subjects') { V.innerHTML = `<div class="k9-state">${I('graduation', 44)}<p>${esc(tr('Empieza añadiendo tus materias.'))}</p><button class="k9-btn pri" data-a="addsub">${I('plus', 14)} ${esc(tr('Añadir materia'))}</button></div>`; return; }
        if (tab === 'week') {
          const H0 = 7, H1 = 22, px = 42, toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
          V.innerHTML = `<div class="k9-row" style="margin-bottom:8px"><button class="k9-btn pri" data-a="addclass">${I('plus', 14)} ${esc(tr('Añadir clase'))}</button><span class="k9-small k9-muted">${esc(tr('Pulsa una clase para editarla.'))}</span></div><div class="a9-week" style="--px:${px}px"><div class="a9-week-h"></div>${DAYS.map(d => `<div class="a9-week-h">${esc(tr(d).slice(0, 3))}</div>`).join('')}<div class="a9-week-hours">${Array.from({ length: H1 - H0 }, (_, i) => `<span>${H0 + i}:00</span>`).join('')}</div>${DAYS.map((d, di) => `<div class="a9-week-col" style="height:${(H1 - H0) * px}px">${D.schedule.filter(c => +c.day === di).map(c => { const s = subj(c.sid), top = (toMin(c.start) - H0 * 60) / 60 * px, h = Math.max(18, (toMin(c.end) - toMin(c.start)) / 60 * px); return `<button class="a9-week-c" data-cls="${esc(c.id)}" style="top:${top}px;height:${h}px;--c:${esc(s.color)}"><b>${esc(s.name)}</b><small>${esc(c.start)}–${esc(c.end)}${c.room ? ' · ' + esc(c.room) : ''}</small></button>`; }).join('')}</div>`).join('')}</div>`;
        }
        if (tab === 'tasks') {
          const l = D.tasks.slice().sort((a, c) => (a.done - c.done) || a.due.localeCompare(c.due)), t0 = today();
          V.innerHTML = `<div class="k9-row" style="margin-bottom:8px"><button class="k9-btn pri" data-a="addtask">${I('plus', 14)} ${esc(tr('Nueva entrega o examen'))}</button><span class="k9-small k9-muted">${esc(tr('EISENKU te avisa el día anterior y el mismo día (mientras esté abierto).'))}</span></div><div class="k9-card" style="padding:2px 8px">${l.map(t => { const s = subj(t.sid), late = !t.done && t.due < t0, soon = !t.done && !late && (new Date(t.due) - new Date(t0)) / 864e5 <= 2; return `<div class="k9-li${t.done ? ' a9-done' : ''}"><input type="checkbox" data-done="${esc(t.id)}" ${t.done ? 'checked' : ''} aria-label="${esc(tr('Hecho'))}"><span class="a9-dotc" style="background:${esc(s.color)}"></span><div class="t"><b>${t.type === 'examen' ? '📝 ' : '📎 '}${esc(t.title)}</b><small>${esc(s.name)} · ${esc(K.fmt.date(t.due + 'T12:00'))}${t.time ? ' ' + esc(t.time) : ''}</small></div>${late ? `<span class="k9-badge d">${esc(tr('atrasada'))}</span>` : soon ? `<span class="k9-badge w">${esc(tr('pronto'))}</span>` : ''}<button class="k9-btn" data-edtask="${esc(t.id)}">${I('edit', 14)}</button><button class="k9-btn dng" data-deltask="${esc(t.id)}">✕</button></div>`; }).join('') || `<p class="k9-small k9-muted" style="padding:8px">${esc(tr('Nada pendiente.'))}</p>`}</div>`;
        }
        if (tab === 'grades') {
          const all = D.subjects.map(s => avg(s.id)).filter(x => x != null), gen = all.length ? all.reduce((a, c) => a + c, 0) / all.length : null;
          V.innerHTML = `<div class="k9-row" style="margin-bottom:8px"><button class="k9-btn pri" data-a="addgrade">${I('plus', 14)} ${esc(tr('Añadir calificación'))}</button><label class="k9-small k9-row">${esc(tr('Escala'))} <select class="input-text" data-scale><option value="10"${D.scale === 10 ? ' selected' : ''}>0–10</option><option value="100"${D.scale === 100 ? ' selected' : ''}>0–100</option><option value="20"${D.scale === 20 ? ' selected' : ''}>0–20</option><option value="5"${D.scale === 5 ? ' selected' : ''}>0–5</option></select></label><span style="flex:1"></span><b>${esc(tr('Promedio general'))}: ${gen == null ? '—' : gen.toFixed(2)}</b></div>${D.subjects.map(s => { const g = D.grades.filter(x => x.sid === s.id), a = avg(s.id); return `<div class="k9-card"><h4><span class="a9-dotc" style="background:${esc(s.color)}"></span>${esc(s.name)}<span style="flex:1"></span><span class="k9-badge ${a == null ? '' : a >= D.scale * 0.6 ? 'g' : 'd'}">${a == null ? '—' : a.toFixed(2)}</span></h4>${g.map(x => `<div class="k9-li"><div class="t"><b>${esc(x.name)}</b><small>${esc(String(x.score))}/${esc(String(x.max))} · ${esc(tr('peso'))} ${esc(String(x.weight || 1))}${x.date ? ' · ' + esc(K.fmt.date(x.date + 'T12:00')) : ''}</small></div><button class="k9-btn dng" data-delgrade="${esc(x.id)}">✕</button></div>`).join('') || `<p class="k9-small k9-muted">${esc(tr('Sin calificaciones'))}</p>`}</div>`; }).join('')}<p class="k9-small k9-muted">${esc(tr('Promedio ponderado: suma de (nota/máximo × peso) dividida entre la suma de pesos, en la escala elegida.'))}</p>`;
        }
        if (tab === 'subjects') V.innerHTML = `<div class="k9-row" style="margin-bottom:8px"><button class="k9-btn pri" data-a="addsub">${I('plus', 14)} ${esc(tr('Añadir materia'))}</button></div><div class="k9-card" style="padding:2px 8px">${D.subjects.map(s => `<div class="k9-li"><span class="a9-dotc" style="background:${esc(s.color)}"></span><div class="t"><b>${esc(s.name)}</b><small>${esc(s.teacher || '')}${s.room ? ' · ' + esc(s.room) : ''}</small></div><button class="k9-btn" data-edsub="${esc(s.id)}">${I('edit', 14)}</button><button class="k9-btn dng" data-delsub="${esc(s.id)}">✕</button></div>`).join('') || `<p class="k9-small k9-muted" style="padding:8px">${esc(tr('Sin materias'))}</p>`}</div>`;
      }
      const subjOpts = () => D.subjects.map(s => [s.id, s.name]);
      async function editSub(s) { const r = await E.form({ title: s ? tr('Editar materia') : tr('Nueva materia'), fields: [{ k: 'name', label: tr('Nombre'), value: s ? s.name : '', req: true }, { k: 'teacher', label: tr('Profesor/a'), value: s ? s.teacher || '' : '' }, { k: 'room', label: tr('Aula'), value: s ? s.room || '' : '' }, { k: 'color', label: tr('Color'), type: 'select', options: COLORS.map((c, i) => [c, ['Jade', 'Rosa', 'Acero', 'Ámbar', 'Lavanda', 'Rojo', 'Verde', 'Rosa claro'][i]]), value: s ? s.color : COLORS[D.subjects.length % COLORS.length] }], ok: tr('Guardar') }); if (!r || !r.name.trim()) return; const o = { name: r.name.trim().slice(0, 60), teacher: r.teacher.slice(0, 60), room: r.room.slice(0, 30), color: r.color }; if (s) Object.assign(s, o); else D.subjects.push(Object.assign({ id: uid() }, o)); save(); draw(); }
      async function editClass(c) { const r = await E.form({ title: c ? tr('Editar clase') : tr('Nueva clase'), fields: [{ k: 'sid', label: tr('Materia'), type: 'select', options: subjOpts(), value: c ? c.sid : D.subjects[0].id }, { k: 'day', label: tr('Día'), type: 'select', options: DAYS.map((d, i) => [String(i), tr(d)]), value: c ? String(c.day) : '0' }, { k: 'start', label: tr('Inicio'), type: 'time', value: c ? c.start : '08:00' }, { k: 'end', label: tr('Fin'), type: 'time', value: c ? c.end : '09:00' }, { k: 'room', label: tr('Aula'), value: c ? c.room || '' : '' }], ok: tr('Guardar'), cancel: c ? tr('Cancelar') : undefined }); if (!r) return; if (r.end <= r.start) return E.toast(tr('La hora de fin debe ser posterior al inicio')); const o = { sid: r.sid, day: +r.day, start: r.start, end: r.end, room: r.room.slice(0, 30) }; if (c) Object.assign(c, o); else D.schedule.push(Object.assign({ id: uid() }, o)); save(); draw(); }
      async function editTask(t) { const r = await E.form({ title: t ? tr('Editar') : tr('Nueva entrega o examen'), fields: [{ k: 'title', label: tr('Título'), value: t ? t.title : '', req: true }, { k: 'type', label: tr('Tipo'), type: 'select', options: [['entrega', tr('Entrega')], ['examen', tr('Examen')]], value: t ? t.type : 'entrega' }, { k: 'sid', label: tr('Materia'), type: 'select', options: subjOpts(), value: t ? t.sid : D.subjects[0].id }, { k: 'due', label: tr('Fecha'), type: 'date', value: t ? t.due : today(), req: true }, { k: 'time', label: tr('Hora (opcional)'), type: 'time', value: t ? t.time || '' : '' }], ok: tr('Guardar') }); if (!r || !r.title.trim() || !r.due) return; const o = { title: r.title.trim().slice(0, 120), type: r.type, sid: r.sid, due: r.due, time: r.time }; if (t) Object.assign(t, o); else D.tasks.push(Object.assign({ id: uid(), done: false }, o)); save(); draw(); }
      async function addGrade() { const r = await E.form({ title: tr('Añadir calificación'), fields: [{ k: 'sid', label: tr('Materia'), type: 'select', options: subjOpts(), value: D.subjects[0].id }, { k: 'name', label: tr('Actividad'), value: tr('Examen parcial'), req: true }, { k: 'score', label: tr('Nota obtenida'), type: 'number', value: '8', req: true }, { k: 'max', label: tr('Nota máxima'), type: 'number', value: String(D.scale), req: true }, { k: 'weight', label: tr('Peso (porcentaje o factor)'), type: 'number', value: '1' }, { k: 'date', label: tr('Fecha'), type: 'date', value: today() }], ok: tr('Guardar') }); if (!r) return; const sc = +r.score, mx = +r.max, w = +r.weight || 1; if (!(mx > 0) || !(sc >= 0)) return E.toast(tr('Revisa los números')); D.grades.push({ id: uid(), sid: r.sid, name: r.name.slice(0, 80), score: sc, max: mx, weight: w, date: r.date }); save(); draw(); }
      b.addEventListener('click', async e => {
        const t = e.target;
        const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; draw(); return; }
        const cl = t.closest('[data-cls]'); if (cl) { const c = D.schedule.find(x => x.id === cl.dataset.cls); const act = await E.form({ title: subj(c.sid).name, html: `<p class="k9-small">${esc(tr(DAYS[c.day]))} · ${esc(c.start)}–${esc(c.end)}</p>`, fields: [{ k: 'a', label: tr('Acción'), type: 'select', options: [['edit', tr('Editar')], ['del', tr('Eliminar')]], value: 'edit' }], ok: tr('Aceptar') }); if (!act) return; if (act.a === 'del') { D.schedule = D.schedule.filter(x => x !== c); save(); draw(); } else editClass(c); return; }
        const dn = t.closest('[data-done]'); if (dn) { const x = D.tasks.find(y => y.id === dn.dataset.done); x.done = dn.checked; save(); draw(); return; }
        const et = t.closest('[data-edtask]'); if (et) { editTask(D.tasks.find(y => y.id === et.dataset.edtask)); return; }
        const dt = t.closest('[data-deltask]'); if (dt) { D.tasks = D.tasks.filter(y => y.id !== dt.dataset.deltask); save(); draw(); return; }
        const dg = t.closest('[data-delgrade]'); if (dg) { D.grades = D.grades.filter(y => y.id !== dg.dataset.delgrade); save(); draw(); return; }
        const es = t.closest('[data-edsub]'); if (es) { editSub(D.subjects.find(y => y.id === es.dataset.edsub)); return; }
        const ds = t.closest('[data-delsub]'); if (ds) { const id = ds.dataset.delsub; if (!await E.confirm(tr('Eliminar materia'), tr('También se borrarán sus clases, notas y entregas.'))) return; D.subjects = D.subjects.filter(y => y.id !== id); D.schedule = D.schedule.filter(y => y.sid !== id); D.grades = D.grades.filter(y => y.sid !== id); D.tasks = D.tasks.filter(y => y.sid !== id); save(); draw(); return; }
        const a = t.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'addsub') editSub(null); if (k === 'addclass') editClass(null); if (k === 'addtask') editTask(null); if (k === 'addgrade') addGrade();
      });
      b.addEventListener('change', e => { if (e.target.matches('[data-scale]')) { D.scale = +e.target.value; save(); draw(); } });
      draw(); this.onOpen = draw;
    }
  });

  /* ======================================================================
     Biblioteca digital: EPUB (descompresión nativa), TXT, Markdown y PDF
     ====================================================================== */
  async function loadEpub(blob) {
    const items = await K.unzip(blob, 200 * 1024 * 1024), map = new Map(items.map(x => [x.name, x.data])), dec = new TextDecoder();
    const txt = p => { const d = map.get(p); return d ? dec.decode(d) : null; };
    const cont = txt('META-INF/container.xml'); if (!cont) throw new Error(tr('No es un EPUB válido (falta container.xml)'));
    const opfPath = (cont.match(/full-path="([^"]+)"/) || [])[1]; const opf = txt(opfPath); if (!opf) throw new Error(tr('EPUB dañado (falta el paquete OPF)'));
    const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
    const doc = new DOMParser().parseFromString(opf, 'application/xml'), manifest = {};
    doc.querySelectorAll('manifest > item').forEach(it => { manifest[it.getAttribute('id')] = { href: decodeURIComponent(it.getAttribute('href') || ''), type: it.getAttribute('media-type') || '', props: it.getAttribute('properties') || '' }; });
    const title = (doc.querySelector('metadata > *|title, metadata title') || {}).textContent || '';
    const author = (doc.querySelector('metadata > *|creator, metadata creator') || {}).textContent || '';
    const spine = [...doc.querySelectorAll('spine > itemref')].map(r => manifest[r.getAttribute('idref')]).filter(Boolean).map(m => base + m.href);
    const resolve = (from, rel) => { const parts = (from.includes('/') ? from.slice(0, from.lastIndexOf('/') + 1) : '').concat(rel).split('/'), out = []; parts.forEach(p => { if (p === '..') out.pop(); else if (p && p !== '.') out.push(p); }); return out.join('/'); };
    return { title: title.trim(), author: author.trim(), spine, chapter(i) { const p = spine[i]; const raw = txt(p) || ''; const d = new DOMParser().parseFromString(raw, /\.x?html?$/i.test(p) && raw.startsWith('<?xml') ? 'application/xhtml+xml' : 'text/html'); const body = d.body || d.querySelector('body') || d.documentElement; const urls = []; body.querySelectorAll('img[src], image').forEach(im => { const attr = im.tagName.toLowerCase() === 'image' ? (im.getAttribute('href') || im.getAttribute('xlink:href')) : im.getAttribute('src'); if (!attr || /^https?:/i.test(attr)) { im.remove(); return; } const path = resolve(p, attr.split('#')[0]), data = map.get(path); if (!data) { im.remove(); return; } const u = URL.createObjectURL(new Blob([data], { type: F.typeOf({ name: path }) })); urls.push(u); if (im.tagName.toLowerCase() === 'image') { const n = d.createElement('img'); n.setAttribute('src', u); im.closest('svg') ? im.closest('svg').replaceWith(n) : im.replaceWith(n); } else im.setAttribute('src', u); }); return { html: K.sanitize(body.innerHTML || ''), urls }; } };
  }
  K.define('library', (() => {
    let urls = [];
    const free = () => { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; };
    return {
      init(b, w, arg) {
        const st = { view: 'shelf', book: null, file: null, ch: 0 };
        const D = Object.assign({ books: {}, fs: 18, theme: 'sepia', font: 'serif' }, get('library', {}));
        const save = () => put('library', D);
        b.innerHTML = `<div class="k9 a9-lib" data-root></div>`;
        const R = q(b, '[data-root]');
        const isBook = f => /\.(epub|txt|md|markdown|pdf)$/i.test(f.name);
        async function shelf() {
          st.view = 'shelf'; free(); setTitleW(tr('Biblioteca digital'));
          const l = (await F.all()).filter(isBook).sort((a, c) => ((D.books[c.id] || {}).last || 0) - ((D.books[a.id] || {}).last || 0) || a.name.localeCompare(c.name));
          R.innerHTML = `<div class="k9-bar"><b class="k9-small">${esc(tr('Mis libros'))}</b><span class="sp"></span><button class="k9-btn pri" data-a="import">${I('upload', 14)} ${esc(tr('Añadir libros'))}</button></div><div class="k9-body">${l.length ? `<div class="a9-shelf">${l.map(f => { const m = D.books[f.id] || {}, ext = F.extOf(f.name); return `<button class="a9-book" data-open="${esc(f.id)}"><span class="a9-book-cover" data-ext="${esc(ext)}"><b>${esc((m.title || f.name.replace(/\.[^.]+$/, '')).slice(0, 60))}</b><small>${esc(ext.toUpperCase())}</small></span><span class="a9-book-t">${esc(m.title || f.name)}</span><span class="k9-meter"><i style="width:${Math.round((m.pct || 0) * 100)}%"></i></span><small class="k9-muted">${m.last ? esc(K.fmt.rel(m.last)) : esc(tr('sin empezar'))}${m.marks && m.marks.length ? ' · 🔖 ' + m.marks.length : ''}</small></button>`; }).join('')}</div>` : `<div class="k9-state">${I('book', 44)}<p>${esc(tr('Añade libros EPUB, TXT, Markdown o PDF. Se guardan en Archivos › Documentos › Libros y se leen sin conexión.'))}</p></div>`}</div>`;
        }
        function setTitleW(t) { const s = w.querySelector('.window-title-area > span:not(.ico-tile)'); if (s) s.textContent = t; }
        async function open(id) {
          const f = await F.get(id); if (!f) return shelf();
          const ext = F.extOf(f.name); D.books[id] = Object.assign({ pos: { ch: 0, y: 0 }, marks: [] }, D.books[id], { last: Date.now() }); save();
          if (ext === 'pdf') { E.vaultOpen(id); return; }
          st.file = f; st.view = 'read'; K.ui.loading(R, tr('Abriendo libro…'));
          try {
            if (ext === 'epub') { st.book = await loadEpub(f.blob); D.books[id].title = st.book.title || f.name; }
            else { const t = await f.blob.text(); const chunks = []; if (/^(md|markdown)$/.test(ext)) { const parts = t.split(/\n(?=#{1,2}\s)/); parts.forEach(p => chunks.push(p)); } else { const paras = t.replace(/\r\n?/g, '\n').split(/\n{2,}/); let cur = ''; paras.forEach(p => { if ((cur + p).length > 12000 && cur) { chunks.push(cur); cur = ''; } cur += p + '\n\n'; }); if (cur) chunks.push(cur); } st.book = { title: f.name.replace(/\.[^.]+$/, ''), author: '', spine: chunks.map((_, i) => String(i)), chapter: i => ({ html: /^(md|markdown)$/.test(ext) ? K.md(chunks[i] || '').html : (chunks[i] || '').split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join(''), urls: [] }) }; }
            save(); setTitleW((st.book.title || f.name) + ' — ' + tr('Biblioteca digital')); reader(D.books[id].pos.ch || 0, D.books[id].pos.y || 0);
          } catch (e) { K.ui.error(R, e.message, () => open(id)); }
        }
        function reader(ch, y) {
          free(); st.ch = Math.max(0, Math.min(st.book.spine.length - 1, ch)); const c = st.book.chapter(st.ch); urls = c.urls; const m = D.books[st.file.id];
          R.innerHTML = `<div class="k9-bar"><button class="k9-btn" data-a="shelf">${I('back', 14)} ${esc(tr('Biblioteca'))}</button><button class="k9-btn" data-a="prev" ${st.ch ? '' : 'disabled'} aria-label="${esc(tr('Anterior'))}">${I('left', 14)}</button><span class="k9-small">${st.ch + 1} / ${st.book.spine.length}</span><button class="k9-btn" data-a="next" ${st.ch < st.book.spine.length - 1 ? '' : 'disabled'} aria-label="${esc(tr('Siguiente'))}">${I('right', 14)}</button><span class="sp"></span><button class="k9-btn" data-a="mark" title="${esc(tr('Añadir marcador'))}">🔖</button><button class="k9-btn" data-a="marks">${esc(tr('Marcadores'))}${m.marks.length ? ' (' + m.marks.length + ')' : ''}</button><button class="k9-btn" data-a="fs-">A−</button><button class="k9-btn" data-a="fs+">A+</button><select class="input-text" data-theme9 aria-label="${esc(tr('Tema de lectura'))}"><option value="light">${esc(tr('Claro'))}</option><option value="sepia">${esc(tr('Sepia'))}</option><option value="dark">${esc(tr('Oscuro'))}</option></select><select class="input-text" data-font aria-label="${esc(tr('Letra'))}"><option value="serif">Serif</option><option value="sans">Sans</option></select></div><div class="a9-read" data-scroll data-tone="${esc(D.theme)}" data-font="${esc(D.font)}" style="--fs:${D.fs}px"><article class="a9-read-page">${c.html}</article></div><div class="k9-status"><span data-pct></span><span style="margin-left:auto">${esc(st.book.author || '')}</span></div>`;
          q(R, '[data-theme9]').value = D.theme; q(R, '[data-font]').value = D.font;
          const sc = q(R, '[data-scroll]'); sc.scrollTop = (y || 0) * (sc.scrollHeight - sc.clientHeight);
          const prog = () => { const fr = sc.scrollHeight > sc.clientHeight ? sc.scrollTop / (sc.scrollHeight - sc.clientHeight) : 1, pct = (st.ch + fr) / st.book.spine.length; m.pos = { ch: st.ch, y: fr }; m.pct = pct; m.last = Date.now(); q(R, '[data-pct]').textContent = Math.round(pct * 100) + '%'; };
          let t = 0; sc.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => { prog(); save(); }, 300); }); prog(); save();
          sc.addEventListener('click', e => { const a = e.target.closest('a[data-external-url]'); if (a) { e.preventDefault(); E.ebOpenUrl(a.dataset.externalUrl, true); } });
        }
        R.addEventListener('click', async e => {
          const o = e.target.closest('[data-open]'); if (o) { open(o.dataset.open); return; }
          const jm = e.target.closest('[data-jump]'); if (jm) { const [c, y] = jm.dataset.jump.split('|').map(Number); reader(c, y); return; }
          const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a, m = st.file ? D.books[st.file.id] : null;
          if (k === 'shelf') shelf(); if (k === 'prev') reader(st.ch - 1, 0); if (k === 'next') reader(st.ch + 1, 0);
          if (k === 'fs-' || k === 'fs+') { D.fs = Math.max(12, Math.min(30, D.fs + (k === 'fs+' ? 1 : -1))); save(); q(R, '[data-scroll]').style.setProperty('--fs', D.fs + 'px'); }
          if (k === 'mark' && m) { const sc = q(R, '[data-scroll]'), fr = sc.scrollHeight > sc.clientHeight ? sc.scrollTop / (sc.scrollHeight - sc.clientHeight) : 0; const p = [...q(R, '.a9-read-page').querySelectorAll('p,h1,h2,h3,li')].find(x => x.offsetTop >= sc.scrollTop) || {}; m.marks.push({ ch: st.ch, y: fr, t: (p.textContent || '').trim().slice(0, 80), at: Date.now() }); save(); E.toast(tr('Marcador añadido')); reader(st.ch, fr); }
          if (k === 'marks' && m) { const r = a.getBoundingClientRect(); K.ui.menu(r.left - 100, r.bottom + 4, m.marks.length ? m.marks.map((x, i) => ({ label: `${x.ch + 1}: ${x.t || tr('Marcador')} `, icon: 'bookmark', act: () => reader(x.ch, x.y) })).concat([{ sep: true }, { label: 'Borrar marcadores', icon: 'trash', danger: true, act: () => { m.marks = []; save(); reader(st.ch, m.pos.y); } }]) : [{ label: 'Sin marcadores', disabled: true }]); }
          if (k === 'import') { const fl = await K.ui.pickFile('.epub,.txt,.md,.markdown,.pdf,application/epub+zip,application/pdf,text/plain', true); if (!fl.length) return; await F.mkdir('documents/Libros'); for (const fi of fl) await F.save(await F.uniqueName('documents/Libros', F.cleanName(fi.name)), fi, 'documents/Libros'); E.toast(fl.length + ' ' + tr('libros añadidos')); shelf(); }
        });
        R.addEventListener('change', e => { if (e.target.matches('[data-theme9]')) { D.theme = e.target.value; save(); q(R, '[data-scroll]').dataset.tone = D.theme; } if (e.target.matches('[data-font]')) { D.font = e.target.value; save(); q(R, '[data-scroll]').dataset.font = D.font; } });
        R.addEventListener('keydown', e => { if (st.view !== 'read') return; if (e.key === 'ArrowRight' && e.altKey) reader(st.ch + 1, 0); if (e.key === 'ArrowLeft' && e.altKey) reader(st.ch - 1, 0); });
        this.onArg = a2 => { if (a2 && a2.fileId) open(a2.fileId); };
        if (arg && arg.fileId) open(arg.fileId); else shelf();
      },
      onClose() { }, destroy: free
    };
  })());

  /* ======================================================================
     Simuladores educativos
     ====================================================================== */
  function graph(cv, series, o = {}) {
    const g = cv.getContext('2d'), d = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * d; cv.height = H * d; g.scale(d, d); g.clearRect(0, 0, W, H);
    const all = series.flatMap(s => s.pts); if (!all.length) return;
    const xs = all.map(p => p[0]), ys = all.map(p => p[1]); let x0 = o.x0 ?? Math.min(...xs), x1 = o.x1 ?? Math.max(...xs), y0 = o.y0 ?? Math.min(...ys), y1 = o.y1 ?? Math.max(...ys); if (x1 === x0) x1 = x0 + 1; if (y1 === y0) { y1 += 1; y0 -= 1; }
    const P = 30, X = x => P + (x - x0) / (x1 - x0) * (W - P - 8), Y = y => H - 18 - (y - y0) / (y1 - y0) * (H - 28);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(P, 6); g.lineTo(P, H - 18); g.lineTo(W - 8, H - 18); g.stroke();
    if (y0 < 0 && y1 > 0) { g.setLineDash([3, 3]); g.beginPath(); g.moveTo(P, Y(0)); g.lineTo(W - 8, Y(0)); g.stroke(); g.setLineDash([]); }
    g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '10px system-ui'; g.fillText(fmtNum(y1, 3), 2, 12); g.fillText(fmtNum(y0, 3), 2, H - 20); g.fillText(fmtNum(x1, 3) + (o.xl ? ' ' + o.xl : ''), W - 60, H - 4);
    series.forEach(s => { g.strokeStyle = s.c; g.lineWidth = 1.8; g.beginPath(); s.pts.forEach((p, i) => { i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])); }); g.stroke(); });
  }
  const SIMS = {
    pendulum: { name: 'Péndulo', params: [['L', 'Longitud (m)', 0.2, 5, 0.05, 1.5], ['g', 'Gravedad (m/s²)', 1, 25, 0.01, 9.81], ['th', 'Ángulo inicial (°)', 5, 170, 1, 30], ['b', 'Amortiguamiento', 0, 1, 0.01, 0.02]],
      init: p => ({ th: p.th * Math.PI / 180, w: 0, t: 0, hist: [], cross: [] }),
      step(s, p, dt) { const n = 8; for (let k = 0; k < n; k++) { const h = dt / n, a = -(p.g / p.L) * Math.sin(s.th) - p.b * s.w; const prev = s.th; s.w += a * h; s.th += s.w * h; s.t += h; if (prev < 0 && s.th >= 0) s.cross.push(s.t); } s.hist.push([s.t, s.th * 180 / Math.PI]); if (s.hist.length > 600) s.hist.shift(); },
      draw(g, s, p, W, H) { const ox = W / 2, oy = 30, sc = Math.min((H - 70) / p.L, 120), x = ox + Math.sin(s.th) * p.L * sc, y = oy + Math.cos(s.th) * p.L * sc; g.strokeStyle = '#9aa3ad'; g.lineWidth = 2; g.beginPath(); g.moveTo(ox - 60, oy); g.lineTo(ox + 60, oy); g.stroke(); g.beginPath(); g.moveTo(ox, oy); g.lineTo(x, y); g.stroke(); g.fillStyle = '#c93a73'; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); },
      info(s, p) { const T0 = 2 * Math.PI * Math.sqrt(p.L / p.g), c = s.cross, Tm = c.length > 1 ? c[c.length - 1] - c[c.length - 2] : null; return `T teórico (ángulos pequeños) = ${T0.toFixed(3)} s · T medido = ${Tm ? Tm.toFixed(3) + ' s' : '…'} · θ = ${(s.th * 180 / Math.PI).toFixed(1)}°`; },
      series: s => [{ c: '#34a582', pts: s.hist }], xl: 's' },
    projectile: { name: 'Tiro parabólico', params: [['v', 'Velocidad inicial (m/s)', 1, 100, 0.5, 25], ['a', 'Ángulo (°)', 0, 90, 1, 45], ['h', 'Altura inicial (m)', 0, 100, 0.5, 0], ['g', 'Gravedad (m/s²)', 1, 25, 0.01, 9.81], ['k', 'Rozamiento con el aire', 0, 0.2, 0.001, 0]],
      init: p => ({ x: 0, y: p.h, vx: p.v * Math.cos(p.a * Math.PI / 180), vy: p.v * Math.sin(p.a * Math.PI / 180), t: 0, path: [[0, p.h]], maxH: p.h, done: false }),
      step(s, p, dt) { if (s.done) return; const n = 10; for (let k = 0; k < n && !s.done; k++) { const h = dt / n, v = Math.hypot(s.vx, s.vy); s.vx += -p.k * v * s.vx * h; s.vy += (-p.g - p.k * v * s.vy) * h; s.x += s.vx * h; s.y += s.vy * h; s.t += h; s.maxH = Math.max(s.maxH, s.y); if (s.y < 0) { s.y = 0; s.done = true; } } s.path.push([s.x, s.y]); },
      draw(g, s, p, W, H) { const R = (p.v * p.v / p.g) * 1.05 + 5, Hm = (p.v * p.v / (2 * p.g)) + p.h + 5, sc = Math.min((W - 40) / R, (H - 40) / Hm), X = x => 20 + x * sc, Y = y => H - 20 - y * sc; g.strokeStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(10, Y(0)); g.lineTo(W - 10, Y(0)); g.stroke(); g.strokeStyle = '#34a582'; g.lineWidth = 2; g.beginPath(); s.path.forEach((q2, i) => { i ? g.lineTo(X(q2[0]), Y(q2[1])) : g.moveTo(X(q2[0]), Y(q2[1])); }); g.stroke(); g.fillStyle = '#c93a73'; g.beginPath(); g.arc(X(s.x), Y(s.y), 7, 0, 7); g.fill(); },
      info(s, p) { const a = p.a * Math.PI / 180, vy = p.v * Math.sin(a), tf = p.k ? null : (vy + Math.sqrt(vy * vy + 2 * p.g * p.h)) / p.g; return `Tiempo = ${s.t.toFixed(2)} s · Alcance = ${s.x.toFixed(2)} m · Altura máx. = ${s.maxH.toFixed(2)} m${tf != null ? ` · Teórico: vuelo ${tf.toFixed(2)} s, alcance ${(p.v * Math.cos(a) * tf).toFixed(2)} m` : ' · (con rozamiento no hay fórmula sencilla)'}`; },
      series: s => [{ c: '#34a582', pts: s.path }], xl: 'm' },
    waves: { name: 'Ondas', params: [['A1', 'Amplitud 1', 0, 2, 0.05, 1], ['l1', 'Longitud de onda 1 (m)', 0.5, 10, 0.1, 4], ['f1', 'Frecuencia 1 (Hz)', 0, 3, 0.05, 0.5], ['A2', 'Amplitud 2', 0, 2, 0.05, 1], ['l2', 'Longitud de onda 2 (m)', 0.5, 10, 0.1, 4], ['f2', 'Frecuencia 2 (Hz)', -3, 3, 0.05, -0.5]],
      init: () => ({ t: 0 }), step(s, p, dt) { s.t += dt; },
      draw(g, s, p, W, H) { const L = 20, Y0 = H / 2, sc = H / 7, X = x => 10 + x / L * (W - 20); const y = (A, l, f2, x) => A * Math.sin(2 * Math.PI * (x / l - f2 * s.t)); [['rgba(106,159,216,.8)', x => y(p.A1, p.l1, p.f1, x)], ['rgba(224,100,143,.8)', x => y(p.A2, p.l2, p.f2, x)], ['#34a582', x => y(p.A1, p.l1, p.f1, x) + y(p.A2, p.l2, p.f2, x)]].forEach(([c, fn], k) => { g.strokeStyle = c; g.lineWidth = k === 2 ? 3 : 1.5; g.beginPath(); for (let i = 0; i <= 300; i++) { const x = i / 300 * L; i ? g.lineTo(X(x), Y0 - fn(x) * sc) : g.moveTo(X(x), Y0 - fn(x) * sc); } g.stroke(); }); },
      info: (s, p) => `v₁ = λ₁·f₁ = ${(p.l1 * p.f1).toFixed(2)} m/s · v₂ = ${(p.l2 * p.f2).toFixed(2)} m/s · ${Math.abs(p.f1 + p.f2) < 1e-9 && p.l1 === p.l2 ? 'Onda estacionaria (frecuencias opuestas)' : 'Azul + rosa = verde (superposición)'}`, series: () => [] },
    orbit: { name: 'Órbitas', params: [['M', 'Masa central (masas solares)', 0.1, 5, 0.05, 1], ['r', 'Distancia inicial (UA)', 0.3, 5, 0.05, 1], ['v', 'Velocidad inicial (km/s)', 5, 60, 0.5, 29.8], ['sp', 'Velocidad de simulación (días/s)', 1, 120, 1, 40]],
      init: p => ({ x: p.r, y: 0, vx: 0, vy: p.v * 86400 / 1.495978707e8, t: 0, trail: [], E0: null, rmin: p.r, rmax: p.r }),
      step(s, p, dt) { const GM = 2.959122e-4 * p.M, days = dt * p.sp, n = Math.ceil(days / 0.25), h = days / n; for (let k = 0; k < n; k++) { let r = Math.hypot(s.x, s.y), a = -GM / (r * r * r); s.vx += a * s.x * h / 2; s.vy += a * s.y * h / 2; s.x += s.vx * h; s.y += s.vy * h; r = Math.hypot(s.x, s.y); a = -GM / (r * r * r); s.vx += a * s.x * h / 2; s.vy += a * s.y * h / 2; s.t += h; s.rmin = Math.min(s.rmin, r); s.rmax = Math.max(s.rmax, r); } s.trail.push([s.x, s.y]); if (s.trail.length > 1500) s.trail.shift(); },
      draw(g, s, p, W, H) { const sc = Math.min(W, H) / 2 / Math.max(1.2, p.r * 2.2), X = x => W / 2 + x * sc, Y = y => H / 2 - y * sc; g.fillStyle = '#f0c46b'; g.beginPath(); g.arc(W / 2, H / 2, 10, 0, 7); g.fill(); g.strokeStyle = 'rgba(52,165,130,.6)'; g.lineWidth = 1.5; g.beginPath(); s.trail.forEach((q2, i) => { i ? g.lineTo(X(q2[0]), Y(q2[1])) : g.moveTo(X(q2[0]), Y(q2[1])); }); g.stroke(); g.fillStyle = '#6a9fd8'; g.beginPath(); g.arc(X(s.x), Y(s.y), 6, 0, 7); g.fill(); },
      info(s, p) { const GM = 2.959122e-4 * p.M, r = Math.hypot(s.x, s.y), v2 = s.vx * s.vx + s.vy * s.vy, E2 = v2 / 2 - GM / r, a = -GM / (2 * E2), e = (s.rmax - s.rmin) / (s.rmax + s.rmin); return E2 < 0 ? `Órbita cerrada · semieje a = ${a.toFixed(3)} UA · periodo (Kepler) = ${(2 * Math.PI * Math.sqrt(a ** 3 / GM)).toFixed(1)} días · excentricidad ≈ ${e.toFixed(3)} · t = ${s.t.toFixed(0)} días` : `Trayectoria abierta: supera la velocidad de escape (${(Math.sqrt(2 * GM / p.r) * 1.495978707e8 / 86400).toFixed(1)} km/s)`; }, series: () => [] },
    rc: { name: 'Circuito RC', params: [['V', 'Fuente (V)', 1, 24, 0.5, 9], ['R', 'Resistencia (kΩ)', 0.1, 100, 0.1, 10], ['C', 'Condensador (μF)', 1, 1000, 1, 100], ['mode', 'Interruptor: 1 carga · 0 descarga', 0, 1, 1, 1]],
      init: () => ({ vc: 0, t: 0, hist: [], mode: 1 }),
      step(s, p, dt) { const tau = p.R * 1e3 * p.C * 1e-6, n = 20; if (s.mode !== p.mode) { s.mode = p.mode; s.t = 0; s.hist = []; } for (let k = 0; k < n; k++) { const h = dt / n, i = (p.mode ? (p.V - s.vc) : -s.vc) / (p.R * 1e3); s.vc += i / (p.C * 1e-6) * h; s.t += h; } const i = (p.mode ? (p.V - s.vc) : -s.vc) / (p.R * 1e3); s.hist.push([s.t, s.vc, i * 1e3]); if (s.hist.length > 800) s.hist.shift(); void tau; },
      draw(g, s, p, W, H) { g.strokeStyle = '#9aa3ad'; g.lineWidth = 2; const x0 = W * 0.2, x1 = W * 0.8, y0 = H * 0.25, y1 = H * 0.75; g.strokeRect(x0, y0, x1 - x0, y1 - y0); g.fillStyle = '#0b0c0f'; g.fillRect(W / 2 - 30, y0 - 8, 60, 16); g.strokeRect(W / 2 - 30, y0 - 8, 60, 16); g.fillRect(x1 - 14, H / 2 - 4, 28, 8); g.beginPath(); g.moveTo(x1 - 16, H / 2 - 5); g.lineTo(x1 + 16, H / 2 - 5); g.moveTo(x1 - 16, H / 2 + 5); g.lineTo(x1 + 16, H / 2 + 5); g.stroke(); g.fillStyle = '#e9ebef'; g.font = '12px system-ui'; g.fillText('R', W / 2 - 4, y0 - 12); g.fillText('C', x1 + 20, H / 2 + 4); g.fillText(p.mode ? 'V' : '⏚', x0 - 22, H / 2 + 4); const lvl = s.vc / p.V; g.fillStyle = `rgba(52,165,130,${0.2 + 0.8 * lvl})`; g.fillRect(x1 + 30, y1 - (y1 - y0) * lvl, 14, (y1 - y0) * lvl); },
      info(s, p) { const tau = p.R * p.C / 1000; return `τ = R·C = ${tau.toFixed(3)} s · Vc = ${s.vc.toFixed(3)} V (${(s.vc / p.V * 100).toFixed(1)} %) · tras 5τ ≈ 99,3 % · t = ${s.t.toFixed(2)} s`; },
      series: s => [{ c: '#34a582', pts: s.hist.map(h => [h[0], h[1]]) }, { c: '#e0648f', pts: s.hist.map(h => [h[0], h[2]]) }], xl: 's' }
  };
  K.define('simulators', (() => {
    let raf = 0;
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    return {
      init(b) {
        let cur = 'pendulum', p = {}, s = null, run = true, last = 0, gt = 0;
        const saved = get('sim', {}) || {};
        b.innerHTML = `<div class="k9 a9-sim"><div class="k9-tabs">${Object.entries(SIMS).map(([k, x]) => `<button class="${k === cur ? 'on' : ''}" data-sim="${k}">${esc(tr(x.name))}</button>`).join('')}</div><div class="a9-sim-body"><div class="a9-sim-stage"><canvas data-cv></canvas><canvas data-gr class="a9-sim-graph"></canvas></div><aside class="a9-sim-side"><div data-params></div><div class="k9-row"><button class="k9-btn pri" data-a="play">❚❚ ${esc(tr('Pausa'))}</button><button class="k9-btn" data-a="reset">${I('refresh', 14)} ${esc(tr('Reiniciar'))}</button></div><p class="k9-small a9-sim-info" data-info></p></aside></div></div>`;
        const cv = q(b, '[data-cv]'), gr = q(b, '[data-gr]');
        function setup(keep) {
          const S2 = SIMS[cur]; qa(b, '[data-sim]').forEach(x => x.classList.toggle('on', x.dataset.sim === cur));
          if (!keep) { p = {}; S2.params.forEach(([k, , , , , d]) => { p[k] = (saved[cur] || {})[k] ?? d; }); }
          q(b, '[data-params]').innerHTML = S2.params.map(([k, l, mn, mx, st2]) => `<label class="k9-field">${esc(tr(l))} <b data-pv="${k}">${p[k]}</b><input type="range" min="${mn}" max="${mx}" step="${st2}" value="${p[k]}" data-p="${k}"></label>`).join('');
          s = S2.init(p); gt = 0;
        }
        function frame(t) {
          const S2 = SIMS[cur], dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016); last = t;
          if (run) S2.step(s, p, dt);
          const d = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; if (cv.width !== W * d || cv.height !== H * d) { cv.width = W * d; cv.height = H * d; }
          const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H); S2.draw(g, s, p, W, H);
          if (t - gt > 120) { gt = t; const ser = S2.series(s); gr.hidden = !ser.length; if (ser.length) graph(gr, ser, { xl: S2.xl }); q(b, '[data-info]').textContent = tr(S2.info(s, p)); }
          raf = requestAnimationFrame(frame);
        }
        b.addEventListener('input', e => { const r = e.target.closest('[data-p]'); if (!r) return; p[r.dataset.p] = +r.value; q(b, `[data-pv="${r.dataset.p}"]`).textContent = r.value; saved[cur] = Object.assign({}, p); put('sim', saved); if (cur !== 'waves' && cur !== 'rc') s = SIMS[cur].init(p); });
        b.addEventListener('click', e => { const sm = e.target.closest('[data-sim]'); if (sm) { cur = sm.dataset.sim; setup(); return; } const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'reset') { s = SIMS[cur].init(p); } if (a.dataset.a === 'play') { run = !run; a.innerHTML = run ? '❚❚ ' + esc(tr('Pausa')) : '▶ ' + esc(tr('Continuar')); } });
        setup(); stop(); raf = requestAnimationFrame(frame);
        this.onOpen = () => { if (!raf) raf = requestAnimationFrame(frame); };
      },
      onClose: stop, destroy: stop
    };
  })());
})();

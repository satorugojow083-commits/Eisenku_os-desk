/* EISENKU OS 8 · Juegos de puzles, estrategia, ciencia y lógica, aventuras + interfaz del Game Hub */
(() => {
  'use strict';
  const E = window.EISEN, storage = E.storage, esc = E.esc, add = E.addGame, best = E.gameBest, $ = s => document.querySelector(s);
  const GAMES = E.GAMES, CATS = E.GAME_CATS;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const dom = (st, html) => { st.innerHTML = `<div class="gm gm-dom">${html}</div>`; return st.firstElementChild; };
  const keyHandler = (st, fn) => { const h = e => { if (!st.isConnected) return; const w = st.closest('.window'); if (!w || !w.classList.contains('active') || e.target.matches('input,textarea,select')) return; fn(e); }; document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); };

  /* ================= PUZLES ================= */
  add({ id: 'blocks', name: 'Bloques', cat: 'Puzles', icon: '🟪', grad: ['#4c1d95', '#22d3ee'], desc: 'Encaja las piezas que caen y completa líneas.', how: '←/→ mover · ↑ girar · ↓ bajar · Espacio caída',
    mount(st) {
      const C = 10, R = 20, S = 26, G = E.canvasGame(st, C * S + 150, R * S, { pad: ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'Space'] }), { ctx, keys, pressed } = G;
      const P = { I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]] };
      const COL = { I: '#22d3ee', O: '#facc15', T: '#a855f7', S: '#22c55e', Z: '#ef4444', J: '#3b82f6', L: '#f97316' };
      let grid, cur, next, drop, score, lines, level, over, das = 0, bag = [];
      const pick = () => { if (!bag.length) bag = shuffle(Object.keys(P)); return bag.pop(); };
      const piece = t => ({ t, c: P[t].map(p => [...p]), x: 3, y: 0 });
      const fits = (c, x, y) => c.every(([a, b]) => a + x >= 0 && a + x < C && b + y < R && (b + y < 0 || !grid[b + y][a + x]));
      const reset = () => { grid = Array.from({ length: R }, () => Array(C).fill(0)); cur = piece(pick()); next = pick(); drop = 0; score = 0; lines = 0; level = 1; over = false; G.hideOver(); };
      const lock = () => { cur.c.forEach(([a, b]) => { if (b + cur.y >= 0) grid[b + cur.y][a + cur.x] = COL[cur.t]; }); let n = 0; grid = grid.filter(r => { if (r.every(Boolean)) { n++; return false; } return true; }); while (grid.length < R) grid.unshift(Array(C).fill(0)); lines += n; score += [0, 100, 300, 500, 800][n] * level; level = 1 + Math.floor(lines / 10); cur = piece(next); next = pick(); if (!fits(cur.c, cur.x, cur.y)) { over = true; const nb = best('blocks', score); G.over('Fin del juego', `Puntos ${score} · Líneas ${lines}${nb ? ' · ¡Récord!' : ''}`, 'Jugar otra vez', reset); } };
      const rot = () => { if (cur.t === 'O') return; const n = cur.c.map(([a, b]) => [2 - b, a]); for (const k of [0, -1, 1, -2, 2]) if (fits(n, cur.x + k, cur.y)) { cur.c = n; cur.x += k; return; } };
      reset();
      G.loop(dt => {
        if (over) return;
        if (pressed.ArrowUp) rot();
        if (pressed.ArrowLeft && fits(cur.c, cur.x - 1, cur.y)) { cur.x--; das = -.18; } if (pressed.ArrowRight && fits(cur.c, cur.x + 1, cur.y)) { cur.x++; das = -.18; }
        if (keys.ArrowLeft || keys.ArrowRight) { das += dt; if (das > .05) { das = 0; const d = keys.ArrowLeft ? -1 : 1; if (fits(cur.c, cur.x + d, cur.y)) cur.x += d; } }
        if (pressed.Space) { while (fits(cur.c, cur.x, cur.y + 1)) { cur.y++; score += 2; } lock(); }
        drop += dt * (keys.ArrowDown ? 20 : 1 + level * .45);
        if (drop >= 1) { drop = 0; if (fits(cur.c, cur.x, cur.y + 1)) cur.y++; else lock(); }
        ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, G.W, G.H); ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, C * S, R * S);
        const cell = (x, y, c, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(x * S + 1, y * S + 1, S - 2, S - 2); ctx.fillStyle = '#ffffff33'; ctx.fillRect(x * S + 1, y * S + 1, S - 2, 4); ctx.globalAlpha = 1; };
        grid.forEach((r, y) => r.forEach((c, x) => c && cell(x, y, c)));
        let gy = cur.y; while (fits(cur.c, cur.x, gy + 1)) gy++; cur.c.forEach(([a, b]) => cell(a + cur.x, b + gy, COL[cur.t], .2));
        cur.c.forEach(([a, b]) => b + cur.y >= 0 && cell(a + cur.x, b + cur.y, COL[cur.t]));
        ctx.fillStyle = '#cbd5e1'; ctx.font = '14px system-ui'; ctx.fillText('Siguiente', C * S + 20, 30); P[next].forEach(([a, b]) => { ctx.fillStyle = COL[next]; ctx.fillRect(C * S + 24 + a * 22, 50 + b * 22, 20, 20); });
        G.hud(`<b>Puntos ${score}</b><span>Líneas ${lines}</span><span>Nivel ${level}</span><span>Récord ${best('blocks')}</span>`);
      });
      return G.destroy;
    } });

  add({ id: 'g2048', name: '2048', cat: 'Puzles', icon: '🔢', grad: ['#b45309', '#fde68a'], desc: 'Une fichas iguales hasta llegar a 2048.', how: 'Flechas o desliza el dedo',
    mount(st) {
      const root = dom(st, `<div class="gm-hud" data-hud></div><div class="g48" data-b></div><div class="ap-row ap-center"><button class="btn-secondary" data-n>Nueva partida</button><button class="btn-secondary" data-u>↶ Deshacer</button></div>`);
      let b, score, prev, won;
      const reset = () => { b = Array(16).fill(0); score = 0; won = false; prev = null; addT(); addT(); draw(); };
      const addT = () => { const e = b.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (e.length) b[e[Math.floor(Math.random() * e.length)]] = Math.random() < .9 ? 2 : 4; };
      const line = l => { const a = l.filter(Boolean); for (let i = 0; i < a.length - 1; i++) if (a[i] === a[i + 1]) { a[i] *= 2; score += a[i]; if (a[i] === 2048 && !won) { won = true; E.notify('🎉 ¡2048!', 'Lo lograste. Puedes seguir jugando.', '🏆'); } a.splice(i + 1, 1); } while (a.length < 4) a.push(0); return a; };
      function move(d) {
        const old = b.join(), os = score; prev = [b.slice(), score];
        for (let k = 0; k < 4; k++) { const idx = [0, 1, 2, 3].map(i => d === 'L' ? k * 4 + i : d === 'R' ? k * 4 + 3 - i : d === 'U' ? i * 4 + k : (3 - i) * 4 + k); const r = line(idx.map(i => b[i])); idx.forEach((i, j) => b[i] = r[j]); }
        if (b.join() !== old) { addT(); draw(); if (!canMove()) { best('g2048', score); root.querySelector('[data-hud]').innerHTML += ' <b>· Sin movimientos</b>'; } } else { prev = null; score = os; }
      }
      const canMove = () => b.includes(0) || b.some((v, i) => (i % 4 < 3 && v === b[i + 1]) || (i < 12 && v === b[i + 4]));
      function draw() { root.querySelector('[data-b]').innerHTML = b.map(v => `<div class="t48 v${Math.min(v, 4096)}">${v || ''}</div>`).join(''); best('g2048', score); root.querySelector('[data-hud]').innerHTML = `<b>Puntos ${score}</b><span>Récord ${best('g2048')}</span>`; }
      const off = keyHandler(st, e => { const d = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D' }[e.key]; if (d) { e.preventDefault(); move(d); } });
      let sx, sy; const bd = root.querySelector('[data-b]');
      bd.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; }); bd.addEventListener('pointerup', e => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return; move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')); });
      root.querySelector('[data-n]').onclick = reset; root.querySelector('[data-u]').onclick = () => { if (prev) { [b, score] = prev; prev = null; draw(); } };
      reset(); return off;
    } });

  add({ id: 'mines', name: 'Buscaminas', cat: 'Puzles', icon: '💣', grad: ['#334155', '#94a3b8'], desc: 'Descubre todas las casillas sin pisar una mina.', how: 'Clic: descubrir · Clic derecho o modo 🚩: bandera',
    mount(st) {
      const root = dom(st, `<div class="ap-row ap-center"><select class="input-text" data-lv style="width:150px"><option value="9,9,10">Fácil 9×9</option><option value="12,12,24">Medio 12×12</option><option value="16,16,40">Difícil 16×16</option></select><button class="btn-secondary" data-flag>⛏ Modo: descubrir</button><button class="btn-primary" data-new>Nueva</button></div><div class="gm-hud" data-hud></div><div class="mn" data-b></div>`);
      let W, H, M, cells, first, over, flagMode = false, t0, tm;
      const nb = i => { const x = i % W, y = Math.floor(i / W), r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const a = x + dx, c = y + dy; if (a >= 0 && c >= 0 && a < W && c < H) r.push(c * W + a); } return r; };
      function reset() { [W, H, M] = root.querySelector('[data-lv]').value.split(',').map(Number); cells = Array.from({ length: W * H }, () => ({ m: 0, o: 0, f: 0, n: 0 })); first = true; over = false; clearInterval(tm); t0 = 0; draw(); }
      function plant(safe) { const ban = new Set([safe, ...nb(safe)]); const pool = shuffle([...cells.keys()].filter(i => !ban.has(i))).slice(0, M); pool.forEach(i => cells[i].m = 1); cells.forEach((c, i) => c.n = nb(i).filter(j => cells[j].m).length); t0 = Date.now(); tm = setInterval(hud, 1000); }
      function open(i) { const st2 = [i]; while (st2.length) { const k = st2.pop(), c = cells[k]; if (c.o || c.f) continue; c.o = 1; if (!c.n && !c.m) st2.push(...nb(k)); } }
      function click(i, flag) {
        if (over) return; const c = cells[i];
        if (flag) { if (!c.o) c.f = !c.f; return draw(); }
        if (c.f) return; if (first) { plant(i); first = false; }
        if (c.o && c.n) { const f = nb(i).filter(j => cells[j].f).length; if (f === c.n) nb(i).forEach(j => { if (!cells[j].f) { if (cells[j].m) lose(); else open(j); } }); }
        else if (c.m) return lose(); else open(i);
        if (!over && cells.every(c2 => c2.m || c2.o)) { over = true; clearInterval(tm); const s = Math.round((Date.now() - t0) / 1000); const k = 'mines_' + W; const bt = storage.get(k, 0); if (!bt || s < bt) storage.set(k, s); E.notify('💣 ¡Ganaste!', `Tiempo: ${s} s`, '🏆'); }
        draw();
      }
      function lose() { over = true; clearInterval(tm); cells.forEach(c => { if (c.m) c.o = 1; }); draw(); root.querySelector('[data-hud]').innerHTML += ' <b>💥 ¡Boom!</b>'; }
      const hud = () => root.querySelector('[data-hud]').innerHTML = `<b>🚩 ${M - cells.filter(c => c.f).length}</b><span>⏱ ${t0 ? Math.round((Date.now() - t0) / 1000) : 0} s</span><span>Mejor ${storage.get('mines_' + W, 0) || '—'} s</span>`;
      function draw() { const b = root.querySelector('[data-b]'); b.style.gridTemplateColumns = `repeat(${W}, 1fr)`; b.innerHTML = cells.map((c, i) => `<button data-i="${i}" class="${c.o ? 'o' : ''}${c.o && c.m ? ' m' : ''}" style="color:${['', '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#b45309', '#0891b2', '#111', '#666'][c.n]}">${c.o ? (c.m ? '💣' : c.n || '') : c.f ? '🚩' : ''}</button>`).join(''); hud(); }
      const b = root.querySelector('[data-b]');
      b.addEventListener('click', e => { const c = e.target.closest('[data-i]'); if (c) click(+c.dataset.i, flagMode); });
      b.addEventListener('contextmenu', e => { const c = e.target.closest('[data-i]'); if (c) { e.preventDefault(); click(+c.dataset.i, true); } });
      root.querySelector('[data-new]').onclick = reset; root.querySelector('[data-lv]').onchange = reset;
      root.querySelector('[data-flag]').onclick = e => { flagMode = !flagMode; e.target.textContent = flagMode ? '🚩 Modo: bandera' : '⛏ Modo: descubrir'; };
      reset(); return () => clearInterval(tm);
    } });

  add({ id: 'sudoku', name: 'Sudoku', cat: 'Puzles', icon: '9️⃣', grad: ['#1e3a8a', '#93c5fd'], desc: 'Sudokus generados al azar con solución única.', how: 'Toca una casilla y elige un número (o usa el teclado)',
    mount(st) {
      const root = dom(st, `<div class="ap-row ap-center"><select class="input-text" data-lv style="width:130px"><option value="36">Fácil</option><option value="46" selected>Medio</option><option value="54">Difícil</option></select><button class="btn-primary" data-new>Nuevo</button><button class="btn-secondary" data-chk>Comprobar</button><button class="btn-secondary" data-hint>💡 Pista</button></div><div class="gm-hud" data-hud></div><div class="sd" data-b></div><div class="sd-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join('')}<button data-n="0">⌫</button></div>`);
      const ok = (g, i, v) => { const r = Math.floor(i / 9), c = i % 9, br = r - r % 3, bc = c - c % 3; for (let k = 0; k < 9; k++) { if (g[r * 9 + k] === v || g[k * 9 + c] === v || g[(br + Math.floor(k / 3)) * 9 + bc + k % 3] === v) return false; } return true; };
      function fill(g) { const i = g.indexOf(0); if (i < 0) return true; for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) if (ok(g, i, v)) { g[i] = v; if (fill(g)) return true; g[i] = 0; } return false; }
      function count(g, lim = 2) { const i = g.indexOf(0); if (i < 0) return 1; let n = 0; for (let v = 1; v <= 9 && n < lim; v++) if (ok(g, i, v)) { g[i] = v; n += count(g, lim - n); g[i] = 0; } return n; }
      let sol, puz, cur, sel = -1, t0, tm;
      function gen() { sol = Array(81).fill(0); fill(sol); puz = sol.slice(); let rm = 0; const tgt = +root.querySelector('[data-lv]').value; for (const i of shuffle([...Array(81).keys()])) { if (rm >= tgt) break; const v = puz[i]; puz[i] = 0; if (count(puz.slice()) !== 1) puz[i] = v; else rm++; } cur = puz.slice(); sel = -1; t0 = Date.now(); clearInterval(tm); tm = setInterval(hud, 1000); draw(); }
      const hud = () => root.querySelector('[data-hud]').innerHTML = `<b>⏱ ${Math.round((Date.now() - t0) / 1000)} s</b><span>Vacías ${cur.filter(v => !v).length}</span>`;
      function draw(check) { root.querySelector('[data-b]').innerHTML = cur.map((v, i) => { const fixed = puz[i], r = Math.floor(i / 9), c = i % 9; const same = sel >= 0 && (Math.floor(sel / 9) === r || sel % 9 === c); const bad = v && !fixed && (check ? v !== sol[i] : (() => { const g = cur.slice(); g[i] = 0; return !ok(g, i, v); })()); return `<button data-i="${i}" class="${fixed ? 'fx' : ''}${i === sel ? ' sel' : same ? ' hl' : ''}${bad ? ' bad' : ''}${c % 3 === 2 && c < 8 ? ' br' : ''}${r % 3 === 2 && r < 8 ? ' bb' : ''}">${v || ''}</button>`; }).join(''); hud(); }
      function put(n) { if (sel < 0 || puz[sel]) return; cur[sel] = n; draw(); if (cur.every((v, i) => v === sol[i])) { clearInterval(tm); const s = Math.round((Date.now() - t0) / 1000); E.notify('🧩 ¡Sudoku resuelto!', `En ${s} segundos`, '🏆'); best('sudoku', 1 + (storage.get('game_best', {}).sudoku || 0)); } }
      root.addEventListener('click', e => { const c = e.target.closest('[data-i]'); if (c) { sel = +c.dataset.i; draw(); } const n = e.target.closest('[data-n]'); if (n) put(+n.dataset.n); });
      root.querySelector('[data-new]').onclick = gen; root.querySelector('[data-chk]').onclick = () => draw(true);
      root.querySelector('[data-hint]').onclick = () => { const e = cur.map((v, i) => v !== sol[i] ? i : -1).filter(i => i >= 0 && !puz[i]); if (e.length) { const i = e[Math.floor(Math.random() * e.length)]; cur[i] = sol[i]; sel = i; draw(); } };
      const off = keyHandler(st, e => { if (/^[1-9]$/.test(e.key)) put(+e.key); else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') put(0); else if (sel >= 0 && e.key.startsWith('Arrow')) { e.preventDefault(); sel = (sel + { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key] + 81) % 81; draw(); } });
      gen(); return () => { off(); clearInterval(tm); };
    } });

  add({ id: 'memory', name: 'Memoria', cat: 'Puzles', icon: '🧠', grad: ['#be185d', '#fbcfe8'], desc: 'Encuentra todas las parejas en el menor número de intentos.', how: 'Toca dos cartas para darles la vuelta',
    mount(st) {
      const root = dom(st, `<div class="ap-row ap-center"><select class="input-text" data-lv style="width:120px"><option value="8">4×4</option><option value="10">4×5</option><option value="18">6×6</option></select><button class="btn-primary" data-new>Nueva</button></div><div class="gm-hud" data-hud></div><div class="mm" data-b></div>`);
      const EM = '🍎🚀🐙🎸🌵🦊🍩⚽🎈🐢🌙🔥💎🎲🦄🍕🛸🐝🌈🎯'.match(/\p{Extended_Pictographic}/gu);
      let cards, open, moves, found, lock, t0;
      function reset() { const n = +root.querySelector('[data-lv]').value; cards = shuffle(shuffle(EM.slice()).slice(0, n).flatMap(e => [e, e])).map(e => ({ e, f: 0, ok: 0 })); open = []; moves = 0; found = 0; lock = false; t0 = Date.now(); const b = root.querySelector('[data-b]'); b.style.gridTemplateColumns = `repeat(${n === 18 ? 6 : 4},1fr)`; draw(); }
      function draw() { root.querySelector('[data-b]').innerHTML = cards.map((c, i) => `<button data-i="${i}" class="${c.f || c.ok ? 'up' : ''}${c.ok ? ' ok' : ''}"><span>${c.e}</span></button>`).join(''); root.querySelector('[data-hud]').innerHTML = `<b>Intentos ${moves}</b><span>Parejas ${found}/${cards.length / 2}</span>`; }
      root.querySelector('[data-b]').addEventListener('click', e => {
        const b = e.target.closest('[data-i]'); if (!b || lock) return; const c = cards[+b.dataset.i]; if (c.f || c.ok) return;
        c.f = 1; open.push(c); draw();
        if (open.length === 2) { moves++; lock = true; const [a, d] = open; setTimeout(() => { if (a.e === d.e) { a.ok = d.ok = 1; found++; } a.f = d.f = 0; open = []; lock = false; draw(); if (found === cards.length / 2) { const s = Math.round((Date.now() - t0) / 1000); E.notify('🧠 ¡Completado!', `${moves} intentos en ${s} s`, '🏆'); } }, a.e === d.e ? 300 : 800); }
      });
      root.querySelector('[data-new]').onclick = reset; root.querySelector('[data-lv]').onchange = reset; reset();
    } });

  add({ id: 'lights', name: 'Luces Fuera', cat: 'Puzles', icon: '💡', grad: ['#713f12', '#facc15'], desc: 'Apaga todas las luces: cada toque cambia las vecinas.', how: 'Toca una casilla para alternarla junto con sus 4 vecinas',
    mount(st) {
      const root = dom(st, `<div class="ap-row ap-center"><button class="btn-primary" data-new>Nuevo nivel</button></div><div class="gm-hud" data-hud></div><div class="lo" data-b></div>`);
      let g, moves, lvl = storage.get('lights_lvl', 1);
      const tog = i => { const x = i % 5, y = Math.floor(i / 5); [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < 5 && b < 5) g[b * 5 + a] ^= 1; }); };
      function reset() { g = Array(25).fill(0); for (let k = 0; k < 3 + lvl * 2; k++) tog(Math.floor(Math.random() * 25)); if (!g.some(Boolean)) tog(12); moves = 0; draw(); }
      const draw = () => { root.querySelector('[data-b]').innerHTML = g.map((v, i) => `<button data-i="${i}" class="${v ? 'on' : ''}"></button>`).join(''); root.querySelector('[data-hud]').innerHTML = `<b>Nivel ${lvl}</b><span>Movimientos ${moves}</span><span>Encendidas ${g.filter(Boolean).length}</span>`; };
      root.querySelector('[data-b]').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; tog(+b.dataset.i); moves++; draw(); if (!g.some(Boolean)) { lvl++; storage.set('lights_lvl', lvl); best('lights', lvl); E.notify('💡 ¡Nivel superado!', `Nivel ${lvl - 1} en ${moves} movimientos`, '🏆'); setTimeout(reset, 900); } });
      root.querySelector('[data-new]').onclick = reset; reset();
    } });

  /* ================= ESTRATEGIA ================= */
  add({ id: 'tictactoe', name: 'Tres en Raya', cat: 'Estrategia', icon: '⭕', grad: ['#0f766e', '#99f6e4'], desc: 'Contra una IA imbatible (o fácil) o contra un amigo.', how: 'Toca una casilla · Consigue 3 en línea',
    mount(st) {
      const root = dom(st, `<div class="ap-row ap-center"><select class="input-text" data-m style="width:180px"><option value="hard">IA imbatible</option><option value="easy">IA fácil</option><option value="2p">Dos jugadores</option></select><button class="btn-primary" data-new>Nueva</button></div><div class="gm-hud" data-hud></div><div class="ttt" data-b></div>`);
      const WL = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
      let b, turn, done, sc = storage.get('ttt_sc', { w: 0, l: 0, d: 0 });
      const win = g => { for (const [a, c, d] of WL) if (g[a] && g[a] === g[c] && g[a] === g[d]) return g[a]; return g.every(Boolean) ? 'D' : null; };
      const mm = (g, p) => { const w = win(g); if (w) return w === 'O' ? 10 : w === 'X' ? -10 : 0; const s = []; g.forEach((v, i) => { if (!v) { g[i] = p; s.push(mm(g, p === 'O' ? 'X' : 'O')); g[i] = ''; } }); return p === 'O' ? Math.max(...s) : Math.min(...s); };
      const ai = () => { const m = root.querySelector('[data-m]').value; const free = b.map((v, i) => v ? -1 : i).filter(i => i >= 0); let pick = free[Math.floor(Math.random() * free.length)]; if (m === 'hard' || Math.random() < .35) { let bs = -99; free.forEach(i => { b[i] = 'O'; const s = mm(b, 'X'); b[i] = ''; if (s > bs) { bs = s; pick = i; } }); } play(pick); };
      function play(i) { if (done || b[i]) return; b[i] = turn; turn = turn === 'X' ? 'O' : 'X'; const w = win(b); if (w) { done = true; const m = root.querySelector('[data-m]').value; if (m !== '2p') { if (w === 'X') sc.w++; else if (w === 'O') sc.l++; else sc.d++; storage.set('ttt_sc', sc); } } draw(w); if (!done && turn === 'O' && root.querySelector('[data-m]').value !== '2p') setTimeout(ai, 300); }
      function draw(w) { root.querySelector('[data-b]').innerHTML = b.map((v, i) => `<button data-i="${i}" class="${v === 'X' ? 'x' : v === 'O' ? 'o' : ''}">${v === 'X' ? '✕' : v === 'O' ? '◯' : ''}</button>`).join(''); root.querySelector('[data-hud]').innerHTML = (w ? `<b>${w === 'D' ? '🤝 Empate' : w === 'X' ? '🎉 Gana ✕' : '🏆 Gana ◯'}</b>` : `<b>Turno: ${turn === 'X' ? '✕' : '◯'}</b>`) + `<span>Tú ${sc.w} · IA ${sc.l} · Empates ${sc.d}</span>`; }
      const reset = () => { b = Array(9).fill(''); turn = 'X'; done = false; draw(); };
      root.querySelector('[data-b]').addEventListener('click', e => { const c = e.target.closest('[data-i]'); if (c && (turn === 'X' || root.querySelector('[data-m]').value === '2p')) play(+c.dataset.i); });
      root.querySelector('[data-new]').onclick = reset; reset();
    } });

  add({ id: 'connect4', name: 'Conecta 4', cat: 'Estrategia', icon: '🔴', grad: ['#1d4ed8', '#fde047'], desc: 'Alinea cuatro fichas antes que la computadora.', how: 'Toca una columna para soltar tu ficha',
    mount(st) {
      const root = dom(st, `<div class="ap-row ap-center"><select class="input-text" data-d style="width:150px"><option value="2">Fácil</option><option value="4" selected>Normal</option><option value="6">Difícil</option></select><button class="btn-primary" data-new>Nueva</button></div><div class="gm-hud" data-hud></div><div class="c4" data-b></div>`);
      const R = 6, C = 7; let g, over, busy;
      const drop = (g2, c, p) => { for (let r = R - 1; r >= 0; r--) if (!g2[r][c]) { g2[r][c] = p; return r; } return -1; };
      const winAt = (g2, p) => { for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (g2[r][c] === p) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { let k = 1; while (k < 4 && g2[r + dr * k] && g2[r + dr * k][c + dc * k] === p) k++; if (k === 4) return true; } return false; };
      const score = g2 => { let s = 0; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { const w = []; for (let k = 0; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= R || cc < 0 || cc >= C) break; w.push(g2[rr][cc]); } if (w.length < 4) continue; const a = w.filter(x => x === 2).length, h = w.filter(x => x === 1).length; if (a && h) continue; s += [0, 1, 5, 40, 1000][a] - [0, 1, 6, 60, 1000][h]; } for (let r = 0; r < R; r++) if (g2[r][3] === 2) s += 3; return s; };
      const ab = (g2, d, al, be, max) => { if (winAt(g2, 2)) return 100000 + d; if (winAt(g2, 1)) return -100000 - d; if (!d || g2[0].every(Boolean)) return score(g2); let v = max ? -Infinity : Infinity; for (const c of [3, 2, 4, 1, 5, 0, 6]) { if (g2[0][c]) continue; const r = drop(g2, c, max ? 2 : 1); const s = ab(g2, d - 1, al, be, !max); g2[r][c] = 0; if (max) { v = Math.max(v, s); al = Math.max(al, v); } else { v = Math.min(v, s); be = Math.min(be, v); } if (al >= be) break; } return v; };
      function draw(msg) { root.querySelector('[data-b]').innerHTML = Array.from({ length: C }, (_, c) => `<button class="c4-col" data-c="${c}">${g.map(row => `<i class="${row[c] === 1 ? 'r' : row[c] === 2 ? 'y' : ''}"></i>`).join('')}</button>`).join(''); root.querySelector('[data-hud]').innerHTML = `<b>${msg || (busy ? '🤖 Pensando…' : '🔴 Tu turno')}</b><span>Victorias ${best('connect4')}</span>`; }
      function play(c) {
        if (over || busy || g[0][c]) return; drop(g, c, 1);
        if (winAt(g, 1)) { over = true; best('connect4', best('connect4') + 1); return draw('🎉 ¡Ganaste!'); }
        if (g[0].every(Boolean)) { over = true; return draw('🤝 Empate'); }
        busy = true; draw();
        setTimeout(() => { const d = +root.querySelector('[data-d]').value; let bc = 3, bv = -Infinity; for (const cc of [3, 2, 4, 1, 5, 0, 6]) { if (g[0][cc]) continue; const r = drop(g, cc, 2); const v = ab(g, d - 1, -Infinity, Infinity, false) + (d <= 2 ? Math.random() * 30 : 0); g[r][cc] = 0; if (v > bv) { bv = v; bc = cc; } } drop(g, bc, 2); busy = false; if (winAt(g, 2)) { over = true; return draw('🤖 Gana la computadora'); } if (g[0].every(Boolean)) { over = true; return draw('🤝 Empate'); } draw(); }, 60);
      }
      const reset = () => { g = Array.from({ length: R }, () => Array(C).fill(0)); over = false; busy = false; draw(); };
      root.querySelector('[data-b]').addEventListener('click', e => { const c = e.target.closest('[data-c]'); if (c) play(+c.dataset.c); });
      root.querySelector('[data-new]').onclick = reset; reset();
    } });

  add({ id: 'reversi', name: 'Reversi', cat: 'Estrategia', icon: '⚫', grad: ['#14532d', '#4ade80'], desc: 'Voltea las fichas rivales encerrándolas entre las tuyas.', how: 'Juegas con negras · Los puntos marcan jugadas válidas',
    mount(st) {
      const root = dom(st, `<div class="ap-row ap-center"><button class="btn-primary" data-new>Nueva partida</button></div><div class="gm-hud" data-hud></div><div class="rv" data-b></div>`);
      const D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]], WT = [100, -20, 10, 5, 5, 10, -20, 100, -20, -50, -2, -2, -2, -2, -50, -20, 10, -2, 1, 1, 1, 1, -2, 10, 5, -2, 1, 0, 0, 1, -2, 5, 5, -2, 1, 0, 0, 1, -2, 5, 10, -2, 1, 1, 1, 1, -2, 10, -20, -50, -2, -2, -2, -2, -50, -20, 100, -20, 10, 5, 5, 10, -20, 100];
      let g, turn, busy;
      const flips = (g2, i, p) => { if (g2[i]) return []; const x = i % 8, y = Math.floor(i / 8), out = []; for (const [dx, dy] of D) { const run = []; let a = x + dx, b = y + dy; while (a >= 0 && b >= 0 && a < 8 && b < 8 && g2[b * 8 + a] === 3 - p) { run.push(b * 8 + a); a += dx; b += dy; } if (run.length && a >= 0 && b >= 0 && a < 8 && b < 8 && g2[b * 8 + a] === p) out.push(...run); } return out; };
      const moves = p => g.map((_, i) => flips(g, i, p).length ? i : -1).filter(i => i >= 0);
      const put = (i, p) => { flips(g, i, p).forEach(k => g[k] = p); g[i] = p; };
      const cnt = p => g.filter(v => v === p).length;
      function draw(msg) { const mv = turn === 1 && !busy ? moves(1) : []; root.querySelector('[data-b]').innerHTML = g.map((v, i) => `<button data-i="${i}">${v ? `<i class="${v === 1 ? 'k' : 'w'}"></i>` : mv.includes(i) ? '<b></b>' : ''}</button>`).join(''); root.querySelector('[data-hud]').innerHTML = `<b>${msg || (turn === 1 ? '⚫ Tu turno' : '⚪ Pensando…')}</b><span>⚫ ${cnt(1)} · ⚪ ${cnt(2)}</span>`; }
      function next() {
        const mine = moves(1), cpu = moves(2);
        if (!mine.length && !cpu.length) { const a = cnt(1), b = cnt(2); if (a > b) best('reversi', best('reversi') + 1); return draw(a > b ? '🎉 ¡Ganaste!' : a < b ? '🤖 Gana la computadora' : '🤝 Empate'); }
        if (turn === 2) { if (!cpu.length) { turn = 1; return draw('⚪ pasa: sin jugadas'); } busy = true; draw(); setTimeout(() => { let bi = cpu[0], bv = -Infinity; cpu.forEach(i => { const v = WT[i] + flips(g, i, 2).length * 2; if (v > bv) { bv = v; bi = i; } }); put(bi, 2); busy = false; turn = 1; next(); }, 450); }
        else if (!mine.length) { turn = 2; draw('Sin jugadas: pasas'); setTimeout(next, 700); } else draw();
      }
      const reset = () => { g = Array(64).fill(0); g[27] = g[36] = 2; g[28] = g[35] = 1; turn = 1; busy = false; draw(); };
      root.querySelector('[data-b]').addEventListener('click', e => { const c = e.target.closest('[data-i]'); if (!c || turn !== 1 || busy) return; const i = +c.dataset.i; if (!flips(g, i, 1).length) return; put(i, 1); turn = 2; next(); });
      root.querySelector('[data-new]').onclick = reset; reset();
    } });

  /* ================= CIENCIA Y LÓGICA ================= */
  add({ id: 'hanoi', name: 'Torre de Hanói', cat: 'Ciencia y lógica', icon: '🗼', grad: ['#7c2d12', '#fdba74'], desc: 'Mueve la torre respetando las reglas en el mínimo de movimientos.', how: 'Toca una torre para tomar el disco superior y otra para dejarlo',
    mount(st) {
      const root = dom(st, `<div class="ap-row ap-center"><label>Discos <select class="input-text" data-n style="width:70px">${[3, 4, 5, 6, 7, 8].map(n => `<option${n === 4 ? ' selected' : ''}>${n}</option>`).join('')}</select></label><button class="btn-primary" data-new>Reiniciar</button></div><div class="gm-hud" data-hud></div><div class="hn" data-b></div><p class="eis-muted ap-center">Regla: nunca pongas un disco grande sobre uno pequeño. Mínimo = 2ⁿ − 1.</p>`);
      let P, sel, moves, N;
      const reset = () => { N = +root.querySelector('[data-n]').value; P = [Array.from({ length: N }, (_, i) => N - i), [], []]; sel = -1; moves = 0; draw(); };
      function draw() { root.querySelector('[data-b]').innerHTML = P.map((p, i) => `<button class="hn-peg${sel === i ? ' sel' : ''}" data-p="${i}"><i class="hn-pole"></i>${p.map(d => `<b style="width:${20 + d / N * 75}%;background:hsl(${d * 360 / N},70%,55%)"></b>`).reverse().join('')}</button>`).join(''); root.querySelector('[data-hud]').innerHTML = `<b>Movimientos ${moves}</b><span>Mínimo ${2 ** N - 1}</span>`; }
      root.querySelector('[data-b]').addEventListener('click', e => { const p = e.target.closest('[data-p]'); if (!p) return; const i = +p.dataset.p;
        if (sel < 0) { if (P[i].length) sel = i; } else { const d = P[sel][P[sel].length - 1], t = P[i][P[i].length - 1]; if (i !== sel && (!t || d < t)) { P[i].push(P[sel].pop()); moves++; } sel = -1; }
        draw(); if (P[2].length === N) { const opt = moves === 2 ** N - 1; E.notify('🗼 ¡Torre completada!', `${moves} movimientos${opt ? ' (¡óptimo!)' : ''}`, '🏆'); best('hanoi', N); } });
      root.querySelector('[data-new]').onclick = reset; root.querySelector('[data-n]').onchange = reset; reset();
    } });

  add({ id: 'mastermind', name: 'Código Secreto', cat: 'Ciencia y lógica', icon: '🔐', grad: ['#581c87', '#e879f9'], desc: 'Descifra el código de 4 colores con deducción lógica.', how: 'Elige 4 colores y pulsa Probar · ● color y posición correctos · ○ solo color',
    mount(st) {
      const COLS = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7', '#f97316'];
      const root = dom(st, `<div class="gm-hud" data-hud></div><div class="mmd" data-rows></div><div class="ap-row ap-center" data-cur></div><div class="ap-row ap-center">${COLS.map((c, i) => `<button class="mmd-c" data-c="${i}" style="background:${c}"></button>`).join('')}<button class="btn-secondary" data-del>⌫</button><button class="btn-primary" data-try>Probar</button><button class="btn-secondary" data-new>Nuevo</button></div>`);
      let code, rows, cur, over;
      const reset = () => { code = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6)); rows = []; cur = []; over = false; draw(); };
      function draw(msg) { root.querySelector('[data-rows]').innerHTML = rows.map(r => `<div class="mmd-row">${r.g.map(c => `<i style="background:${COLS[c]}"></i>`).join('')}<span>${'●'.repeat(r.b)}${'○'.repeat(r.w)}</span></div>`).join(''); root.querySelector('[data-cur]').innerHTML = Array.from({ length: 4 }, (_, i) => `<i class="mmd-slot" style="background:${cur[i] != null ? COLS[cur[i]] : 'transparent'}"></i>`).join(''); root.querySelector('[data-hud]').innerHTML = `<b>${msg || `Intento ${rows.length + 1}/10`}</b>${over ? `<span>Código: ${code.map(c => `<i class="mmd-dot" style="background:${COLS[c]}"></i>`).join('')}</span>` : ''}`; }
      root.addEventListener('click', e => {
        if (e.target.closest('[data-new]')) return reset(); if (over) return;
        const c = e.target.closest('[data-c]'); if (c && cur.length < 4) { cur.push(+c.dataset.c); draw(); }
        if (e.target.closest('[data-del]')) { cur.pop(); draw(); }
        if (e.target.closest('[data-try]') && cur.length === 4) { let b2 = 0, w = 0; const cr = [], gr = []; cur.forEach((v, i) => { if (v === code[i]) b2++; else { cr.push(code[i]); gr.push(v); } }); gr.forEach(v => { const k = cr.indexOf(v); if (k >= 0) { w++; cr.splice(k, 1); } }); rows.push({ g: cur, b: b2, w }); cur = [];
          if (b2 === 4) { over = true; best('mastermind', 11 - rows.length); draw(`🎉 ¡Descifrado en ${rows.length} intentos!`); } else if (rows.length >= 10) { over = true; draw('🔒 Sin intentos'); } else draw(); }
      });
      reset();
    } });

  add({ id: 'simon', name: 'Simón Dice', cat: 'Ciencia y lógica', icon: '🎵', grad: ['#166534', '#ef4444'], desc: 'Repite la secuencia de luces y sonidos cada vez más larga.', how: 'Observa y repite tocando los colores',
    mount(st) {
      const root = dom(st, `<div class="gm-hud" data-hud></div><div class="sm" data-b>${['#22c55e', '#ef4444', '#facc15', '#3b82f6'].map((c, i) => `<button data-i="${i}" style="--c:${c}"></button>`).join('')}</div><div class="ap-row ap-center"><button class="btn-primary" data-go>Empezar</button></div>`);
      const F = [329.6, 261.6, 220, 164.8]; let seq = [], pos = 0, input = false, ac;
      const flash = i => { const b = root.querySelector(`[data-i="${i}"]`); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 320); try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = F[i]; g.gain.value = .15; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + .3); } catch { /* sin audio */ } };
      const hud = m => root.querySelector('[data-hud]').innerHTML = `<b>${m}</b><span>Nivel ${seq.length}</span><span>Récord ${best('simon')}</span>`;
      const play = () => { input = false; hud('👀 Observa…'); seq.forEach((v, k) => setTimeout(() => flash(v), 600 + k * 550)); setTimeout(() => { input = true; pos = 0; hud('👆 Tu turno'); }, 600 + seq.length * 550); };
      const nextR = () => { seq.push(Math.floor(Math.random() * 4)); play(); };
      root.querySelector('[data-b]').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b || !input) return; const i = +b.dataset.i; flash(i); if (i !== seq[pos]) { input = false; const nb = best('simon', seq.length - 1); hud(`❌ Fallaste. Llegaste al nivel ${seq.length}${nb ? ' · ¡Récord!' : ''}`); return; } if (++pos === seq.length) { input = false; setTimeout(nextR, 700); } });
      root.querySelector('[data-go]').onclick = () => { seq = []; nextR(); }; hud('Pulsa Empezar');
    } });

  const QZ = [['¿Cuál es el planeta más grande del sistema solar?', ['Júpiter', 'Saturno', 'Neptuno', 'Tierra'], 'Júpiter tiene más masa que todos los demás planetas juntos.'], ['¿Qué gas absorben las plantas en la fotosíntesis?', ['Dióxido de carbono', 'Oxígeno', 'Nitrógeno', 'Helio'], 'Con CO₂, agua y luz producen glucosa y liberan O₂.'], ['¿Cuál es la fórmula química del agua?', ['H₂O', 'CO₂', 'NaCl', 'O₂'], 'Dos átomos de hidrógeno y uno de oxígeno.'], ['¿Quién descubrió la penicilina?', ['Alexander Fleming', 'Louis Pasteur', 'Marie Curie', 'Isaac Newton'], 'Fleming la descubrió en 1928.'], ['¿Quién formuló las leyes del movimiento planetario?', ['Johannes Kepler', 'Galileo Galilei', 'Albert Einstein', 'Nicolás Copérnico'], 'Kepler publicó sus tres leyes entre 1609 y 1619.'], ['¿Qué científico desarrolló la pasteurización?', ['Louis Pasteur', 'Robert Koch', 'Gregor Mendel', 'Charles Darwin'], 'Calentar alimentos para eliminar microbios.'], ['¿Cuál es la velocidad aproximada de la luz?', ['300 000 km/s', '30 000 km/s', '3 000 km/s', '300 km/s'], 'Exactamente 299 792 458 m/s en el vacío.'], ['¿Cuál es la unidad de fuerza en el SI?', ['Newton', 'Julio', 'Vatio', 'Pascal'], '1 N = 1 kg·m/s².'], ['¿Qué orgánulo produce energía en la célula?', ['Mitocondria', 'Ribosoma', 'Núcleo', 'Vacuola'], 'La mitocondria produce ATP mediante la respiración celular.'], ['¿Cuántos huesos tiene un adulto humano?', ['206', '180', '250', '312'], 'Al nacer hay unos 300 que luego se fusionan.'], ['¿Qué partícula tiene carga negativa?', ['Electrón', 'Protón', 'Neutrón', 'Fotón'], 'El electrón tiene carga −1.'], ['¿Cuál es el símbolo químico del oro?', ['Au', 'Ag', 'Go', 'Or'], 'Del latín aurum.'], ['¿Qué tipo de energía tiene un objeto en movimiento?', ['Cinética', 'Potencial', 'Química', 'Nuclear'], 'Ec = ½·m·v².'], ['¿Cuánto vale π aproximadamente?', ['3,1416', '2,7182', '1,6180', '1,4142'], 'π es la razón entre circunferencia y diámetro.'], ['¿Cuál es el planeta más cercano al Sol?', ['Mercurio', 'Venus', 'Marte', 'Tierra'], 'Mercurio orbita a unos 58 millones de km.'], ['¿Qué estudia la genética?', ['La herencia biológica', 'Las rocas', 'El clima', 'Los astros'], 'Gregor Mendel es considerado su padre.'], ['¿Cuál es el pH del agua pura a 25 °C?', ['7', '0', '14', '5'], 'Es neutra: ni ácida ni básica.'], ['¿Qué capa protege la Tierra de la radiación ultravioleta?', ['Ozono', 'Troposfera', 'Ionosfera', 'Corteza'], 'El ozono (O₃) absorbe gran parte de los rayos UV.'], ['¿Cuál es la raíz cuadrada de 144?', ['12', '14', '11', '16'], '12 × 12 = 144.'], ['¿Qué científico propuso la teoría de la relatividad?', ['Albert Einstein', 'Stephen Hawking', 'Niels Bohr', 'Max Planck'], 'Relatividad especial (1905) y general (1915).'], ['¿Qué órgano bombea la sangre?', ['Corazón', 'Pulmón', 'Hígado', 'Riñón'], 'Late unas 100 000 veces al día.'], ['¿Cuál es el estado de la materia del vapor?', ['Gaseoso', 'Líquido', 'Sólido', 'Plasma'], 'El vapor es agua en estado gaseoso.'], ['¿Cuántos lados tiene un hexágono?', ['6', '5', '7', '8'], 'Hexa = seis.'], ['¿Qué científica ganó dos premios Nobel en ciencias distintas?', ['Marie Curie', 'Rosalind Franklin', 'Ada Lovelace', 'Lise Meitner'], 'Física (1903) y Química (1911).'], ['¿Cuál es el elemento más abundante del universo?', ['Hidrógeno', 'Helio', 'Oxígeno', 'Carbono'], 'Aproximadamente el 74 % de la materia ordinaria.'], ['¿Qué instrumento mide la presión atmosférica?', ['Barómetro', 'Termómetro', 'Higrómetro', 'Sismógrafo'], 'Inventado por Torricelli en 1643.'], ['¿Cuántos cromosomas tiene una célula humana típica?', ['46', '23', '48', '44'], '23 pares.'], ['¿En qué unidad se mide la resistencia eléctrica?', ['Ohmio', 'Voltio', 'Amperio', 'Hercio'], 'Ley de Ohm: V = I·R.'], ['¿Qué tipo de roca se forma por enfriamiento del magma?', ['Ígnea', 'Sedimentaria', 'Metamórfica', 'Caliza'], 'Por ejemplo el granito o el basalto.'], ['¿Cuál es el resultado de 2⁵?', ['32', '25', '10', '64'], '2·2·2·2·2 = 32.']];
  add({ id: 'sciquiz', name: 'Quiz Científico', cat: 'Ciencia y lógica', icon: '🔬', grad: ['#0e7490', '#a5f3fc'], desc: '30 preguntas de ciencia con explicaciones; 10 por ronda.', how: 'Elige la respuesta correcta antes de que acabe el tiempo',
    mount(st) {
      const root = dom(st, `<div class="gm-hud" data-hud></div><div class="qz" data-q></div>`);
      let qs, i, ok, t, tm;
      function start() { qs = shuffle(QZ.slice()).slice(0, 10); i = 0; ok = 0; ask(); }
      function ask() {
        clearInterval(tm); if (i >= qs.length) { const nb = best('sciquiz', ok); root.querySelector('[data-q]').innerHTML = `<h2>${ok >= 8 ? '🏆' : ok >= 5 ? '👍' : '📚'} ${ok}/10 aciertos</h2><p>${nb ? '¡Nuevo récord!' : 'Récord: ' + best('sciquiz')}</p><button class="btn-primary" data-r>Otra ronda</button>`; return; }
        const [q, ans, ex] = qs[i], opts = shuffle(ans.slice()); t = 20;
        root.querySelector('[data-q]').innerHTML = `<h3>${esc(q)}</h3><div class="qz-opts">${opts.map(o => `<button class="btn-secondary" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div><p class="eis-muted" data-ex></p>`;
        const hud = () => root.querySelector('[data-hud]').innerHTML = `<b>Pregunta ${i + 1}/10</b><span>Aciertos ${ok}</span><span>⏱ ${t}s</span>`; hud();
        tm = setInterval(() => { t--; hud(); if (t <= 0) answer(null); }, 1000);
        const answer = o => { clearInterval(tm); const good = o === ans[0]; if (good) ok++; root.querySelectorAll('[data-o]').forEach(b => { b.disabled = true; if (b.dataset.o === ans[0]) b.className = 'btn-primary'; else if (b.dataset.o === o) b.classList.add('bad'); }); root.querySelector('[data-ex]').innerHTML = `${good ? '✅ ¡Correcto!' : o ? '❌ Incorrecto.' : '⏰ Tiempo agotado.'} ${esc(ex)} <button class="btn-primary" data-n>Siguiente</button>`; };
        root.querySelector('[data-q]').onclick = e => { const b = e.target.closest('[data-o]'); if (b && !b.disabled) answer(b.dataset.o); if (e.target.closest('[data-n]')) { i++; ask(); } if (e.target.closest('[data-r]')) start(); };
      }
      start(); return () => clearInterval(tm);
    } });

  add({ id: 'life', name: 'Juego de la Vida', cat: 'Ciencia y lógica', icon: '🧫', grad: ['#065f46', '#a7f3d0'], desc: 'El autómata celular de Conway: dibuja y mira evolucionar la vida.', how: 'Dibuja células con el ratón o el dedo · ▶ para simular',
    mount(st) {
      const G = E.canvasGame(st, 720, 450, { pad: false }), { ctx, W, H } = G, S = 10, C = W / S, R = H / S;
      let g = new Uint8Array(C * R), run = false, gen = 0, acc = 0, speed = 10;
      st.querySelector('.gm').insertAdjacentHTML('beforeend', `<div class="ap-row ap-center"><button class="btn-primary" data-run>▶ Simular</button><button class="btn-secondary" data-step>Paso</button><button class="btn-secondary" data-rnd>🎲 Aleatorio</button><button class="btn-secondary" data-glider>Planeador</button><button class="btn-secondary" data-gun>Cañón de Gosper</button><button class="btn-secondary" data-clr>Limpiar</button><label>Velocidad <input type="range" min="1" max="30" value="10" data-sp></label></div>`);
      const step = () => { const n = new Uint8Array(C * R); for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { let k = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) k += g[((y + dy + R) % R) * C + (x + dx + C) % C]; const a = g[y * C + x]; n[y * C + x] = k === 3 || (a && k === 2) ? 1 : 0; } g = n; gen++; };
      const pat = (cells, ox, oy) => cells.forEach(([x, y]) => g[(oy + y) * C + ox + x] = 1);
      let paint = -1;
      G.cv.addEventListener('pointerdown', e => { const [x, y] = G.ptr(e), i = Math.floor(y / S) * C + Math.floor(x / S); paint = g[i] ? 0 : 1; g[i] = paint; G.cv.setPointerCapture(e.pointerId); });
      G.cv.addEventListener('pointermove', e => { if (paint < 0) return; const [x, y] = G.ptr(e); if (x >= 0 && y >= 0 && x < W && y < H) g[Math.floor(y / S) * C + Math.floor(x / S)] = paint; });
      G.cv.addEventListener('pointerup', () => paint = -1);
      st.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.run !== undefined) { run = !run; b.textContent = run ? '⏸ Pausa' : '▶ Simular'; }
        if (b.dataset.step !== undefined) step();
        if (b.dataset.rnd !== undefined) { g = g.map(() => Math.random() < .25 ? 1 : 0); gen = 0; }
        if (b.dataset.clr !== undefined) { g = new Uint8Array(C * R); gen = 0; }
        if (b.dataset.glider !== undefined) pat([[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]], 5, 5);
        if (b.dataset.gun !== undefined) pat([[0, 4], [0, 5], [1, 4], [1, 5], [10, 4], [10, 5], [10, 6], [11, 3], [11, 7], [12, 2], [12, 8], [13, 2], [13, 8], [14, 5], [15, 3], [15, 7], [16, 4], [16, 5], [16, 6], [17, 5], [20, 2], [20, 3], [20, 4], [21, 2], [21, 3], [21, 4], [22, 1], [22, 5], [24, 0], [24, 1], [24, 5], [24, 6], [34, 2], [34, 3], [35, 2], [35, 3]], 2, 2);
      });
      st.querySelector('[data-sp]').oninput = e => speed = +e.target.value;
      pat([[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]], 5, 5);
      G.loop(dt => {
        if (run) { acc += dt * speed; while (acc >= 1) { step(); acc--; } }
        ctx.fillStyle = '#022c22'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#34d399';
        for (let i = 0; i < g.length; i++) if (g[i]) ctx.fillRect((i % C) * S + 1, Math.floor(i / C) * S + 1, S - 2, S - 2);
        G.hud(`<b>Generación ${gen}</b><span>Células vivas ${g.reduce((a, v) => a + v, 0)}</span>`);
      });
      return G.destroy;
    } });

  add({ id: 'mathsprint', name: 'Cálculo Mental', cat: 'Ciencia y lógica', icon: '➗', grad: ['#9d174d', '#fda4af'], desc: 'Resuelve operaciones contra reloj durante 60 segundos.', how: 'Escribe el resultado y pulsa Enter',
    mount(st) {
      const root = dom(st, `<div class="ap-row ap-center"><select class="input-text" data-lv style="width:140px"><option value="1">Básico</option><option value="2">Intermedio</option><option value="3">Avanzado</option></select><button class="btn-primary" data-go>Empezar</button></div><div class="gm-hud" data-hud></div><div class="ms"><div class="ms-q" data-q>¿Listo?</div><input class="input-text ms-in" data-in inputmode="numeric" autocomplete="off" disabled></div>`);
      let ans, ok, bad, t, tm;
      function q() { const lv = +root.querySelector('[data-lv]').value, R = n => 1 + Math.floor(Math.random() * n); const ops = lv === 1 ? ['+', '-'] : lv === 2 ? ['+', '-', '×'] : ['+', '-', '×', '÷'], op = ops[Math.floor(Math.random() * ops.length)]; let a, b; const m = lv === 1 ? 20 : lv === 2 ? 50 : 100;
        if (op === '+') { a = R(m); b = R(m); ans = a + b; } else if (op === '-') { a = R(m); b = R(a); ans = a - b; } else if (op === '×') { a = R(lv === 2 ? 12 : 25); b = R(12); ans = a * b; } else { b = R(12); ans = R(12); a = b * ans; }
        root.querySelector('[data-q]').textContent = `${a} ${op} ${b} = ?`; }
      const hud = () => root.querySelector('[data-hud]').innerHTML = `<b>⏱ ${t}s</b><span>✅ ${ok}</span><span>❌ ${bad}</span><span>Récord ${best('mathsprint')}</span>`;
      root.querySelector('[data-go]').onclick = () => { ok = 0; bad = 0; t = 60; const I = root.querySelector('[data-in]'); I.disabled = false; I.value = ''; I.focus(); q(); hud(); clearInterval(tm); tm = setInterval(() => { t--; hud(); if (t <= 0) { clearInterval(tm); I.disabled = true; const nb = best('mathsprint', ok); root.querySelector('[data-q]').textContent = `⏰ ¡Tiempo! ${ok} correctas${nb ? ' · ¡Récord!' : ''}`; } }, 1000); };
      root.querySelector('[data-in]').onkeydown = e => { if (e.key !== 'Enter') return; const v = +e.target.value; if (e.target.value.trim() === '') return; if (v === ans) ok++; else bad++; e.target.value = ''; e.target.classList.remove('good', 'bad'); void e.target.offsetWidth; e.target.classList.add(v === ans ? 'good' : 'bad'); q(); hud(); };
      return () => clearInterval(tm);
    } });

  /* ================= AVENTURAS ================= */
  add({ id: 'maze', name: 'Laberinto Sombrío', cat: 'Aventuras', icon: '🗝️', grad: ['#1c1917', '#a16207'], desc: 'Explora laberintos a oscuras: encuentra la llave y la salida.', how: 'Flechas o botones para moverte · Cada nivel es más grande',
    mount(st) {
      const G = E.canvasGame(st, 600, 600, { pad: ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'] }), { ctx, W, H, pressed, keys } = G;
      let N, cells, p, key, exit, hasKey, lvl = 1, t0, seen, rep = 0;
      function build() {
        N = 7 + lvl * 2; cells = Array.from({ length: N * N }, () => ({ w: [1, 1, 1, 1], v: 0 })); const st2 = [0]; cells[0].v = 1;
        const D = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]];
        while (st2.length) { const c = st2[st2.length - 1], x = c % N, y = Math.floor(c / N); const nb = D.map(([dx, dy, a, b]) => [x + dx, y + dy, a, b]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !cells[b * N + a].v); if (!nb.length) { st2.pop(); continue; } const [a, b, w1, w2] = nb[Math.floor(Math.random() * nb.length)]; cells[c].w[w1] = 0; cells[b * N + a].w[w2] = 0; cells[b * N + a].v = 1; st2.push(b * N + a); }
        p = { x: 0, y: 0 }; exit = { x: N - 1, y: N - 1 }; do { key = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; } while (key.x + key.y < N / 2); hasKey = false; t0 = performance.now(); seen = new Uint8Array(N * N);
      }
      const go = (dx, dy, w) => { if (!cells[p.y * N + p.x].w[w]) { p.x += dx; p.y += dy; } if (p.x === key.x && p.y === key.y && !hasKey) { hasKey = true; E.toast('🗝️ ¡Tienes la llave! Busca la puerta.'); } if (p.x === exit.x && p.y === exit.y && hasKey) { const s = ((performance.now() - t0) / 1000).toFixed(1); E.notify('🚪 ¡Escapaste!', `Nivel ${lvl} en ${s} s`, '🏆'); lvl++; best('maze', lvl - 1); build(); } };
      build();
      G.loop(dt => {
        rep -= dt; const dir = keys.ArrowLeft ? 'L' : keys.ArrowRight ? 'R' : keys.ArrowUp ? 'U' : keys.ArrowDown ? 'D' : null;
        if (pressed.ArrowLeft || pressed.ArrowRight || pressed.ArrowUp || pressed.ArrowDown) rep = 0;
        if (dir && rep <= 0) { rep = .13; ({ L: () => go(-1, 0, 3), R: () => go(1, 0, 1), U: () => go(0, -1, 0), D: () => go(0, 1, 2) })[dir](); }
        const S = W / N, rad = 3.2; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.hypot(x - p.x, y - p.y) < rad) seen[y * N + x] = 1;
        ctx.fillStyle = '#0c0a09'; ctx.fillRect(0, 0, W, H);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (!seen[y * N + x]) continue; const d = Math.hypot(x - p.x, y - p.y), a = d < rad ? 1 : .35; ctx.globalAlpha = a; ctx.fillStyle = '#292524'; ctx.fillRect(x * S, y * S, S, S); ctx.strokeStyle = '#d6d3d1'; ctx.lineWidth = 2; ctx.beginPath(); const w = cells[y * N + x].w; if (w[0]) { ctx.moveTo(x * S, y * S); ctx.lineTo(x * S + S, y * S); } if (w[1]) { ctx.moveTo(x * S + S, y * S); ctx.lineTo(x * S + S, y * S + S); } if (w[2]) { ctx.moveTo(x * S, y * S + S); ctx.lineTo(x * S + S, y * S + S); } if (w[3]) { ctx.moveTo(x * S, y * S); ctx.lineTo(x * S, y * S + S); } ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.font = `${S * .7}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (!hasKey && seen[key.y * N + key.x]) ctx.fillText('🗝️', key.x * S + S / 2, key.y * S + S / 2);
        if (seen[exit.y * N + exit.x]) ctx.fillText(hasKey ? '🚪' : '🔒', exit.x * S + S / 2, exit.y * S + S / 2);
        ctx.fillText('🧙', p.x * S + S / 2, p.y * S + S / 2); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        G.hud(`<b>Nivel ${lvl}</b><span>${hasKey ? '🗝️ Llave conseguida' : 'Busca la llave'}</span><span>⏱ ${((performance.now() - t0) / 1000).toFixed(0)} s</span><span>Récord nivel ${best('maze')}</span>`);
      });
      return G.destroy;
    } });

  add({ id: 'adventure', name: 'El Observatorio Perdido', cat: 'Aventuras', icon: '🔭', grad: ['#1e1b4b', '#818cf8'], desc: 'Aventura conversacional: repara el telescopio para ver el cometa.', how: 'Escribe órdenes: norte, sur, este, oeste, subir, bajar, mirar, coger X, usar X, inventario, ayuda',
    mount(st) {
      const root = dom(st, `<div class="tx-log mono" data-log></div><form class="ap-row" data-f><span>&gt;</span><input class="input-text mono" data-in placeholder="¿Qué haces?" autocomplete="off" style="flex:1"><button class="btn-primary">↵</button></form><div class="ap-row tx-quick">${['norte', 'sur', 'este', 'oeste', 'subir', 'bajar', 'mirar', 'inventario', 'ayuda'].map(c => `<button class="btn-secondary" data-c="${c}">${c}</button>`).join('')}</div>`);
      const ROOMS = {
        bosque: { n: 'Puerta del bosque', d: 'Estás al borde de un bosque de pinos. Un sendero se adentra hacia el norte.', ex: { norte: 'sendero' } },
        sendero: { n: 'Sendero', d: 'El sendero se bifurca. Al este ves una cabaña; al norte, un claro iluminado por la luna.', ex: { sur: 'bosque', este: 'cabana', norte: 'claro' } },
        cabana: { n: 'Cabaña del guarda', d: 'Una cabaña polvorienta con una mesa y un viejo cajón.', ex: { oeste: 'sendero' } },
        claro: { n: 'Claro', d: 'En lo alto de la colina se alza la cúpula del observatorio. Su puerta está al norte. Al oeste se oye un lago.', ex: { sur: 'sendero', oeste: 'lago', norte: 'vestibulo' } },
        lago: { n: 'Orilla del lago', d: 'El agua refleja las estrellas. Algo brilla entre los juncos.', ex: { este: 'claro' } },
        vestibulo: { n: 'Vestíbulo del observatorio', d: 'Un vestíbulo circular. Una escalera sube a la cúpula y otra baja al sótano.', ex: { sur: 'claro', subir: 'cupula', bajar: 'sotano' } },
        sotano: { n: 'Sótano', d: 'Huele a aceite de máquina. Hay estanterías con piezas.', ex: { subir: 'vestibulo' }, dark: true },
        cupula: { n: 'Cúpula', d: 'El gran telescopio apunta al cielo, pero le faltan piezas: la lente principal y un engranaje del motor.', ex: { bajar: 'vestibulo' } }
      };
      const ITEMS = { linterna: 'bosque', llave: 'cabana', lente: 'lago', engranaje: 'sotano' };
      let s = storage.get('adv_state', null) || { r: 'bosque', inv: [], at: Object.assign({}, ITEMS), door: false, lit: false, fix: [], moves: 0, won: false };
      const log = (t, cls = '') => { const L = root.querySelector('[data-log]'); L.insertAdjacentHTML('beforeend', `<p class="${cls}">${t}</p>`); L.scrollTop = L.scrollHeight; };
      const save = () => storage.set('adv_state', s);
      const look = () => { const r = ROOMS[s.r]; if (r.dark && !s.lit) return log(`<b>${r.n}</b><br>Está demasiado oscuro para ver nada. Necesitas luz.`); const it = Object.entries(s.at).filter(([, w]) => w === s.r).map(([k]) => k); log(`<b>${r.n}</b><br>${r.d}${it.length ? `<br>Ves: <i>${it.join(', ')}</i>.` : ''}<br><span class="eis-muted">Salidas: ${Object.keys(r.ex).join(', ')}</span>`); };
      const DIR = { n: 'norte', s: 'sur', e: 'este', o: 'oeste', w: 'oeste', arriba: 'subir', abajo: 'bajar', sube: 'subir', baja: 'bajar' };
      function cmd(raw) {
        const c = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); if (!c) return; log('&gt; ' + esc(raw), 'tx-cmd'); s.moves++;
        if (s.won) return log('Ya completaste la aventura. Escribe <b>reiniciar</b> para jugar de nuevo.') || (c === 'reiniciar' && reset());
        let [v, ...rest] = c.split(/\s+/); let o = rest.filter(w => !['el', 'la', 'los', 'las', 'un', 'una', 'al', 'a', 'de', 'con'].includes(w)).join(' ');
        if (v === 'ir' || v === 've') { v = o; o = ''; } v = DIR[v] || v;
        if (['norte', 'sur', 'este', 'oeste', 'subir', 'bajar'].includes(v)) { const to = ROOMS[s.r].ex[v]; if (!to) return log('No puedes ir por ahí.');
          if (to === 'vestibulo' && s.r === 'claro' && !s.door) return log('La puerta del observatorio está cerrada con llave.');
          s.r = to; look(); return save(); }
        if (['mirar', 'm', 'l', 'examinar', 'ver'].includes(v)) { if (o.includes('cajon') && s.r === 'cabana') return log(s.at.llave === 'cabana' ? 'Dentro del cajón hay una <i>llave</i> oxidada.' : 'El cajón está vacío.'); if (o.includes('telescopio') && s.r === 'cupula') return s.fix.length === 2 ? win() : log(`Le faltan: ${['lente', 'engranaje'].filter(x => !s.fix.includes(x)).join(' y ')}.`); return look(); }
        if (['coger', 'tomar', 'agarrar', 'recoger', 'toma', 'coge'].includes(v)) { if (ROOMS[s.r].dark && !s.lit) return log('Está oscuro; no ves nada que coger.'); const it = Object.keys(s.at).find(k => o.includes(k) && s.at[k] === s.r); if (!it) return log('No ves eso aquí.'); s.at[it] = 'inv'; s.inv.push(it); log(`Coges: <i>${it}</i>.`); return save(); }
        if (['inventario', 'i', 'inv'].includes(v)) return log(s.inv.length ? 'Llevas: ' + s.inv.join(', ') + (s.lit ? ' (linterna encendida)' : '') : 'No llevas nada.');
        if (v === 'encender' && o.includes('linterna')) { if (!s.inv.includes('linterna')) return log('No tienes linterna.'); s.lit = true; log('La linterna se enciende con un clic. 🔦'); if (ROOMS[s.r].dark) look(); return save(); }
        if (['usar', 'abrir', 'poner', 'colocar', 'usa', 'abre'].includes(v)) {
          if ((o.includes('llave') || o.includes('puerta')) && s.r === 'claro') { if (!s.inv.includes('llave')) return log('No tienes con qué abrirla.'); s.door = true; log('La llave gira con un chirrido. ¡La puerta se abre!'); return save(); }
          if (o.includes('linterna')) return cmd('encender linterna');
          if (['lente', 'engranaje'].some(k => o.includes(k))) { const k = o.includes('lente') ? 'lente' : 'engranaje'; if (s.r !== 'cupula') return log('Aquí no tiene uso.'); if (!s.inv.includes(k)) return log('No tienes eso.'); s.inv = s.inv.filter(x => x !== k); s.fix.push(k); log(`Colocas ${k === 'lente' ? 'la lente' : 'el engranaje'} en el telescopio.${s.fix.length === 2 ? ' ¡El motor zumba! Ahora puedes <b>mirar telescopio</b>.' : ''}`); return save(); }
          if (o.includes('cajon') && s.r === 'cabana') return cmd('mirar cajon');
          return log('No sabes cómo usar eso aquí.');
        }
        if (v === 'reiniciar') return reset();
        if (v === 'ayuda') return log('Órdenes: <b>norte/sur/este/oeste/subir/bajar</b>, <b>mirar</b> [algo], <b>coger</b> X, <b>usar</b> X, <b>encender linterna</b>, <b>inventario</b>, <b>reiniciar</b>.');
        log('No entiendo esa orden. Escribe <b>ayuda</b>.');
      }
      function win() { s.won = true; save(); best('adventure', Math.max(1, 200 - s.moves)); log('🔭 Miras por el telescopio y ves el gran cometa cruzando el cielo, con su cola de hielo brillando. <b>¡Has recuperado el Observatorio Perdido!</b> (' + s.moves + ' órdenes)', 'tx-win'); E.notify('🔭 ¡Aventura completada!', `En ${s.moves} órdenes`, '🏆'); }
      function reset() { s = { r: 'bosque', inv: [], at: Object.assign({}, ITEMS), door: false, lit: false, fix: [], moves: 0, won: false }; save(); root.querySelector('[data-log]').innerHTML = ''; log('<b>EL OBSERVATORIO PERDIDO</b><br>Dicen que esta noche pasará un cometa que solo se verá una vez en la vida. El viejo observatorio lleva años abandonado…', 'tx-win'); look(); }
      root.querySelector('[data-f]').onsubmit = e => { e.preventDefault(); const I = root.querySelector('[data-in]'); cmd(I.value); I.value = ''; };
      root.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) cmd(b.dataset.c); });
      if (s.moves) { log('<i>Partida guardada recuperada.</i>'); look(); } else reset();
      setTimeout(() => root.querySelector('[data-in]').focus(), 50);
    } });

  /* ================= JUEGOS CLÁSICOS DE EISENKU (v7) ================= */
  [['shooter', 'Space Shooter 2D', 'Acción', '🚀', ['#1e3a8a', '#f43f5e'], 'El shooter espacial original de EISENKU.', 'A/D o flechas · Espacio o clic para disparar'], ['chess', 'Ajedrez', 'Estrategia', '♟️', ['#44403c', '#d6d3d1'], 'Ajedrez completo contra la computadora o 2 jugadores.', 'Toca una pieza y luego la casilla destino'], ['snake', 'Snake Retro', 'Arcade', '🐍', ['#14532d', '#bef264'], 'La serpiente clásica: come y crece.', 'Flechas para girar']].forEach(([id, name, cat, icon, grad, desc, how]) => add({ id, name, cat, icon, grad, desc, how, legacy: true }));

  /* ================= INTERFAZ DEL GAME HUB ================= */
  const win = $('#win-arcade'), body = win.querySelector('.window-body');
  win.querySelector('.window-title-area').innerHTML = `${E.tile({ icon: '🎮', grad: ['#7c3aed', '#f43f5e'] }, 18, 'mini')}<span>Game Hub · EISENKU</span>`;
  const ribbon = body.querySelector('.office-ribbon'), legacyMount = $('#arcade-screen-mount'); ribbon.style.display = 'none'; legacyMount.style.display = 'none';
  const lib = document.createElement('div'); lib.className = 'gh-lib';
  const player = document.createElement('div'); player.className = 'gh-player'; player.hidden = true;
  player.innerHTML = `<div class="gh-bar"><button class="btn-secondary" data-back>‹ Biblioteca</button><b data-title></b><span class="eis-muted" data-how></span><button class="btn-secondary" data-restart>↻</button><button class="btn-secondary" data-full>⛶</button></div><div class="gh-stage" data-stage></div>`;
  body.prepend(player); body.prepend(lib);
  let cat = 'Todos', q = '', destroy = null, curGame = null;
  const recentG = () => storage.get('recent_games', []);
  function renderLib() {
    const list = GAMES.filter(g => (cat === 'Todos' || g.cat === cat) && (!q || (g.name + g.desc + g.cat).toLowerCase().includes(q)));
    const feat = GAMES.find(g => g.id === (recentG()[0] || 'blocks')) || GAMES[0];
    lib.innerHTML = `<div class="gh-hero" style="--g1:${feat.grad[0]};--g2:${feat.grad[1]}"><div class="gh-hero-ic">${feat.icon}</div><div><small>${recentG().length ? 'Seguir jugando' : 'Destacado'}</small><h2>${esc(feat.name)}</h2><p>${esc(feat.desc)}</p><button class="btn-primary" data-play="${feat.id}">▶ Jugar</button></div></div>
      <div class="gh-filters"><input class="input-text" data-q placeholder="Buscar juegos…" value="${esc(q)}">${['Todos', ...CATS].map(c => `<button class="${c === cat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
      <div class="gh-grid">${list.map(g => `<article class="gh-card">${E.cover(g)}<div class="gh-info"><div class="gh-meta"><span class="gh-tag">${g.cat}</span>${best(g.id) ? `<span>🏆 ${best(g.id)}</span>` : ''}</div><h4>${esc(g.name)}</h4><p>${esc(g.desc)}</p><button class="btn-primary" data-play="${g.id}">▶ Jugar</button></div></article>`).join('') || '<p class="ap-empty">No hay juegos con ese filtro.</p>'}</div>`;
    const qi = lib.querySelector('[data-q]'); qi.oninput = e => { q = e.target.value.toLowerCase(); const pos = e.target.selectionStart; renderLib(); const n = lib.querySelector('[data-q]'); n.focus(); n.setSelectionRange(pos, pos); };
  }
  function stop() { if (E.stopShooter) E.stopShooter(); if (destroy) { try { destroy(); } catch (e) { console.error(e); } destroy = null; } player.querySelector('[data-stage]').innerHTML = ''; if (legacyMount.parentElement !== body) body.appendChild(legacyMount); legacyMount.style.display = 'none'; }
  function play(id) {
    const g = GAMES.find(x => x.id === id); if (!g) return false;
    stop(); curGame = g; lib.hidden = true; player.hidden = false;
    player.querySelector('[data-title]').textContent = g.icon + ' ' + g.name; player.querySelector('[data-how]').textContent = g.how || '';
    const rg = recentG().filter(x => x !== id); rg.unshift(id); storage.set('recent_games', rg.slice(0, 8));
    const stage = player.querySelector('[data-stage]');
    if (g.legacy) {
      stage.appendChild(legacyMount); legacyMount.style.display = 'flex';
      ['shooter', 'chess', 'snake'].forEach(k => $('#arcade-mod-' + k).style.display = k === id ? 'flex' : 'none');
      $('#arcade-tab-' + id).click();
    } else { try { destroy = g.mount(stage) || null; } catch (e) { console.error(e); stage.innerHTML = `<p class="ap-empty">⚠️ No se pudo iniciar el juego: ${esc(e.message)}</p>`; } }
    return true;
  }
  E.playGame = id => { E.openWindow('arcade'); return play(id); };
  E.gameLibrary = () => { stop(); curGame = null; player.hidden = true; lib.hidden = false; renderLib(); };
  lib.addEventListener('click', e => { const p = e.target.closest('[data-play]'); if (p) play(p.dataset.play); const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; renderLib(); } });
  player.addEventListener('click', e => {
    if (e.target.closest('[data-back]')) E.gameLibrary();
    if (e.target.closest('[data-restart]') && curGame) play(curGame.id);
    if (e.target.closest('[data-full]')) { win.classList.toggle('maximized'); }
  });
  document.addEventListener('eisen:close', e => { if (e.detail === 'arcade') { stop(); curGame = null; player.hidden = true; lib.hidden = false; } });
  (window.EISEN_HOOKS.arcade = window.EISEN_HOOKS.arcade || []).push(() => { if (!curGame) { lib.hidden = false; player.hidden = true; renderLib(); } });
  renderLib();
  // Juegos en el catálogo de la tienda / menú
  GAMES.forEach(g => { const list = E.apps(); if (!list.find(a => a.id === 'game-' + g.id)) list.push({ id: 'game-' + g.id, name: g.name, cat: 'Juegos', icon: g.icon, desc: g.desc, grad: g.grad, game: g.id, gcat: g.cat }); });
})();

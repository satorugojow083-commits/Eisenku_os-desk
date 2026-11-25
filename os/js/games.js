/* EISENKU OS 8 · Game Hub: catálogo con portadas, marco común de juego (teclado, táctil y mando) y juegos de acción, arcade y carreras */
(() => {
  'use strict';
  const E = window.EISEN, storage = E.storage, esc = E.esc, $ = s => document.querySelector(s);
  const GAMES = []; E.GAMES = GAMES;
  const CATS = ['Acción', 'Estrategia', 'Carreras', 'Puzles', 'Arcade', 'Ciencia y lógica', 'Aventuras'];
  E.GAME_CATS = CATS;
  const best = (id, v) => { const m = storage.get('game_best', {}); if (v === undefined) return m[id] || 0; if (v > (m[id] || 0)) { m[id] = v; storage.set('game_best', m); return true; } return false; };
  E.gameBest = best;

  /* ---------- Portadas (SVG generado, sin descargas) ---------- */
  const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  let cvN = 0;
  E.cover = (g, h = 120) => {
    const r = hash(g.id), [a, b] = g.grad, shapes = [], gid = 'cg' + g.id + (++cvN);
    for (let i = 0; i < 7; i++) { const x = (r >>> (i * 3)) % 320, y = (r >>> (i * 2 + 1)) % 180, s = 12 + (r >>> i) % 60; shapes.push(i % 2 ? `<circle cx="${x}" cy="${y}" r="${s}" fill="#fff" opacity=".08"/>` : `<rect x="${x}" y="${y}" width="${s * 1.4}" height="${s * 1.4}" rx="${s / 3}" transform="rotate(${(r >>> i) % 90} ${x} ${y})" fill="#000" opacity=".1"/>`); }
    return `<svg class="gh-cover" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" style="height:${h}px" role="img" aria-label="${esc(g.name)}"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="320" height="180" fill="url(#${gid})"/>${shapes.join('')}<text x="160" y="104" font-size="74" text-anchor="middle" dominant-baseline="middle">${g.icon}</text><rect y="146" width="320" height="34" fill="#0006"/><text x="14" y="168" font-size="15" font-weight="700" fill="#fff" font-family="system-ui,sans-serif">${esc(g.name)}</text></svg>`;
  };

  /* ---------- Marco común ---------- */
  // Crea un lienzo escalable con bucle, teclas (teclado + botones táctiles + mando) y limpieza automática
  E.canvasGame = (stage, W, H, opts = {}) => {
    stage.innerHTML = `<div class="gm"><div class="gm-hud" data-hud></div><div class="gm-cv"><canvas width="${W}" height="${H}"></canvas><div class="gm-over" data-over hidden></div></div>${opts.pad === false ? '' : `<div class="gm-pad">${(opts.pad || ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'Space']).map(k => `<button data-k="${k}">${({ ArrowLeft: '◀', ArrowRight: '▶', ArrowUp: '▲', ArrowDown: '▼', Space: opts.spaceLabel || '●', KeyZ: 'Z' })[k] || k}</button>`).join('')}</div>`}</div>`;
    const cv = stage.querySelector('canvas'), ctx = cv.getContext('2d'), keys = {}, pressed = {};
    let raf = 0, alive = true, last = 0, fn = null;
    const kd = e => { if (!stage.isConnected) return; const k = e.code; if (/^(Arrow|Space|Key[WASDZXP]|Enter)/.test(k) && !e.target.matches('input,textarea,select')) { if (!keys[k]) pressed[k] = true; keys[k] = true; e.preventDefault(); } };
    const ku = e => { keys[e.code] = false; };
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
    stage.querySelectorAll('[data-k]').forEach(b => { const k = b.dataset.k; b.addEventListener('pointerdown', e => { e.preventDefault(); keys[k] = true; pressed[k] = true; b.classList.add('on'); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { keys[k] = false; b.classList.remove('on'); })); });
    const padMap = { 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight', 0: 'Space', 1: 'KeyZ', 9: 'Enter' }, prevPad = {};
    function pollPad() {
      const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null; if (!gp) return;
      const st = {}; Object.entries(padMap).forEach(([i, k]) => { if (gp.buttons[i] && gp.buttons[i].pressed) st[k] = true; });
      if (gp.axes[0] < -.5) st.ArrowLeft = true; if (gp.axes[0] > .5) st.ArrowRight = true; if (gp.axes[1] < -.5) st.ArrowUp = true; if (gp.axes[1] > .5) st.ArrowDown = true;
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyZ', 'Enter'].forEach(k => { if (st[k] && !prevPad[k]) pressed[k] = true; if (st[k] !== prevPad[k]) keys[k] = !!st[k]; prevPad[k] = !!st[k]; });
    }
    const visible = () => { const w = stage.closest('.window'); return w && w.classList.contains('open') && !w.classList.contains('minimized') && document.visibilityState === 'visible'; };
    function frame(t) {
      if (!alive) return; raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
      if (!visible() || G.paused) return;
      pollPad(); if (fn) fn(dt); for (const k in pressed) delete pressed[k];
    }
    const G = {
      cv, ctx, W, H, keys, pressed, paused: false,
      loop(f) { fn = f; if (!raf) raf = requestAnimationFrame(frame); },
      hud(html) { stage.querySelector('[data-hud]').innerHTML = html; },
      over(title, sub, btn = 'Jugar otra vez', cb) { const o = stage.querySelector('[data-over]'); o.hidden = false; o.innerHTML = `<h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}<button class="btn-primary" data-again>${btn}</button>`; o.querySelector('[data-again]').onclick = () => { o.hidden = true; cb && cb(); }; },
      hideOver() { stage.querySelector('[data-over]').hidden = true; },
      ptr(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; },
      destroy() { alive = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); }
    };
    return G;
  };
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const add = g => { GAMES.push(g); };
  E.addGame = add;

  /* ================= ACCIÓN ================= */
  add({ id: 'asteroids', name: 'Asteroides', cat: 'Acción', icon: '☄️', grad: ['#0f172a', '#7c3aed'], desc: 'Destruye rocas espaciales sin que te golpeen.', how: '←/→ girar · ↑ impulso · Espacio disparar',
    mount(st) {
      const G = E.canvasGame(st, 720, 480, { pad: ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'Space'] }), { ctx, W, H, keys, pressed } = G;
      let ship, rocks, shots, score, lives, level, inv;
      const spawn = n => { for (let i = 0; i < n; i++) { let x, y; do { x = rnd(0, W); y = rnd(0, H); } while (Math.hypot(x - W / 2, y - H / 2) < 140); rocks.push({ x, y, vx: rnd(-60, 60), vy: rnd(-60, 60), r: 42, a: rnd(0, 6), pts: Array.from({ length: 10 }, () => rnd(.75, 1.15)) }); } };
      const reset = () => { ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2 }; rocks = []; shots = []; score = 0; lives = 3; level = 1; inv = 2; spawn(4); G.hideOver(); };
      const wrap = o => { o.x = (o.x + W) % W; o.y = (o.y + H) % H; };
      reset();
      G.loop(dt => {
        if (lives <= 0) return;
        if (keys.ArrowLeft) ship.a -= 4 * dt; if (keys.ArrowRight) ship.a += 4 * dt;
        if (keys.ArrowUp) { ship.vx += Math.cos(ship.a) * 260 * dt; ship.vy += Math.sin(ship.a) * 260 * dt; }
        ship.vx *= .99; ship.vy *= .99; ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrap(ship); inv -= dt;
        if (pressed.Space && shots.length < 6) shots.push({ x: ship.x + Math.cos(ship.a) * 16, y: ship.y + Math.sin(ship.a) * 16, vx: Math.cos(ship.a) * 480 + ship.vx, vy: Math.sin(ship.a) * 480 + ship.vy, t: 1.1 });
        shots.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt; wrap(s); }); shots = shots.filter(s => s.t > 0);
        rocks.forEach(r => { r.x += r.vx * dt; r.y += r.vy * dt; r.a += dt * .5; wrap(r); });
        for (const r of rocks.slice()) {
          const hit = shots.find(s => Math.hypot(s.x - r.x, s.y - r.y) < r.r);
          if (hit) { shots.splice(shots.indexOf(hit), 1); rocks.splice(rocks.indexOf(r), 1); score += r.r > 30 ? 20 : r.r > 18 ? 50 : 100; if (r.r > 16) for (let i = 0; i < 2; i++) rocks.push({ x: r.x, y: r.y, vx: rnd(-110, 110), vy: rnd(-110, 110), r: r.r / 1.7, a: 0, pts: r.pts }); continue; }
          if (inv <= 0 && Math.hypot(ship.x - r.x, ship.y - r.y) < r.r + 10) { lives--; inv = 2.5; ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2 }; if (lives <= 0) { const nb = best('asteroids', score); G.over('💥 Fin de la partida', `Puntos: ${score}${nb ? ' · ¡Nuevo récord!' : ''}`, 'Jugar otra vez', reset); } }
        }
        if (!rocks.length) { level++; spawn(3 + level); inv = 2; }
        ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
        rocks.forEach(r => { ctx.beginPath(); r.pts.forEach((p, i) => { const an = r.a + i / r.pts.length * Math.PI * 2; ctx.lineTo(r.x + Math.cos(an) * r.r * p, r.y + Math.sin(an) * r.r * p); }); ctx.closePath(); ctx.stroke(); });
        ctx.fillStyle = '#fde047'; shots.forEach(s => ctx.fillRect(s.x - 2, s.y - 2, 4, 4));
        if (inv < 0 || Math.floor(inv * 8) % 2) { ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.a); ctx.strokeStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-11, -10); ctx.lineTo(-6, 0); ctx.lineTo(-11, 10); ctx.closePath(); ctx.stroke(); if (keys.ArrowUp) { ctx.strokeStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-18 - Math.random() * 6, 0); ctx.lineTo(-8, 4); ctx.stroke(); } ctx.restore(); }
        G.hud(`<b>Puntos ${score}</b><span>Nivel ${level}</span><span>${'❤️'.repeat(lives)}</span><span>Récord ${best('asteroids')}</span>`);
      });
      return G.destroy;
    } });

  add({ id: 'tanks', name: 'Tanque Defensor', cat: 'Acción', icon: '🛡️', grad: ['#365314', '#a3e635'], desc: 'Protege la base de oleadas de drones enemigos.', how: 'Mueve el ratón/dedo para apuntar y toca para disparar · ←/→ mover',
    mount(st) {
      const G = E.canvasGame(st, 720, 480, { pad: ['ArrowLeft', 'ArrowRight', 'Space'], spaceLabel: '💥' }), { ctx, W, H, keys, pressed } = G;
      let tank, aim, bullets, drones, wave, score, hp, spawnT, toSpawn;
      const reset = () => { tank = { x: W / 2 }; aim = -Math.PI / 2; bullets = []; drones = []; wave = 1; score = 0; hp = 100; spawnT = 0; toSpawn = 6; G.hideOver(); };
      G.cv.addEventListener('pointermove', e => { const [x, y] = G.ptr(e); aim = Math.atan2(y - (H - 40), x - tank.x); });
      G.cv.addEventListener('pointerdown', e => { const [x, y] = G.ptr(e); aim = Math.atan2(y - (H - 40), x - tank.x); fire(); });
      const fire = () => { if (bullets.length < 8) bullets.push({ x: tank.x + Math.cos(aim) * 26, y: H - 40 + Math.sin(aim) * 26, vx: Math.cos(aim) * 520, vy: Math.sin(aim) * 520 }); };
      reset();
      G.loop(dt => {
        if (hp <= 0) return;
        if (keys.ArrowLeft) tank.x -= 260 * dt; if (keys.ArrowRight) tank.x += 260 * dt; tank.x = clamp(tank.x, 30, W - 30);
        if (keys.ArrowUp) aim = Math.max(-Math.PI + .2, aim - 2 * dt); if (keys.ArrowDown) aim = Math.min(-.2, aim + 2 * dt);
        if (pressed.Space) fire();
        spawnT -= dt; if (toSpawn > 0 && spawnT <= 0) { toSpawn--; spawnT = Math.max(.35, 1.4 - wave * .1); drones.push({ x: rnd(30, W - 30), y: -20, vx: rnd(-40, 40), vy: 40 + wave * 8, hp: 1 + Math.floor(wave / 3), t: rnd(0, 6) }); }
        if (!toSpawn && !drones.length) { wave++; toSpawn = 5 + wave * 2; hp = Math.min(100, hp + 10); }
        bullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; }); bullets = bullets.filter(b => b.x > -10 && b.x < W + 10 && b.y > -10);
        drones.forEach(d => { d.t += dt; d.x += (d.vx + Math.sin(d.t * 2) * 60) * dt; d.y += d.vy * dt; d.x = clamp(d.x, 10, W - 10); });
        drones = drones.filter(d => { const b = bullets.find(b => Math.hypot(b.x - d.x, b.y - d.y) < 18); if (b) { bullets.splice(bullets.indexOf(b), 1); if (--d.hp <= 0) { score += 10 * wave; return false; } } if (d.y > H - 30) { hp -= 15; return false; } return true; });
        if (hp <= 0) { const nb = best('tanks', score); G.over('🏚️ La base cayó', `Oleada ${wave} · Puntos ${score}${nb ? ' · ¡Récord!' : ''}`, 'Reintentar', reset); }
        const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b1324'); gr.addColorStop(1, '#1e293b'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#365314'; ctx.fillRect(0, H - 20, W, 20);
        drones.forEach(d => { ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.ellipse(d.x, d.y, 16, 9, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fecdd3'; ctx.fillRect(d.x - 3, d.y - 3, 6, 6); });
        ctx.fillStyle = '#fde047'; bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, 7); ctx.fill(); });
        ctx.save(); ctx.translate(tank.x, H - 40); ctx.fillStyle = '#84cc16'; ctx.fillRect(-26, 0, 52, 18); ctx.beginPath(); ctx.arc(0, 0, 14, Math.PI, 0); ctx.fill(); ctx.rotate(aim); ctx.fillRect(0, -4, 28, 8); ctx.restore();
        G.hud(`<b>Puntos ${score}</b><span>Oleada ${wave}</span><span>Base ${Math.max(0, hp)}%</span><span>Récord ${best('tanks')}</span>`);
      });
      return G.destroy;
    } });

  /* ================= ARCADE ================= */
  add({ id: 'breakout', name: 'Rompeladrillos', cat: 'Arcade', icon: '🧱', grad: ['#9a3412', '#fbbf24'], desc: 'Rebota la pelota y rompe todos los ladrillos.', how: '←/→ o arrastra para mover la paleta · Espacio lanzar',
    mount(st) {
      const G = E.canvasGame(st, 640, 480, { pad: ['ArrowLeft', 'Space', 'ArrowRight'] }), { ctx, W, H, keys, pressed } = G;
      let pad, ball, bricks, score, lives, level, stuck;
      const build = () => { bricks = []; const rows = Math.min(8, 4 + level); for (let r = 0; r < rows; r++) for (let c = 0; c < 10; c++) bricks.push({ x: 20 + c * 60, y: 50 + r * 22, hp: r < level - 1 ? 2 : 1, col: `hsl(${r * 40},80%,55%)` }); };
      const serve = () => { stuck = true; ball = { x: pad.x, y: H - 46, vx: 0, vy: 0 }; };
      const reset = () => { pad = { x: W / 2, w: 90 }; score = 0; lives = 3; level = 1; build(); serve(); G.hideOver(); };
      G.cv.addEventListener('pointermove', e => { pad.x = clamp(G.ptr(e)[0], pad.w / 2, W - pad.w / 2); });
      G.cv.addEventListener('pointerdown', () => { if (stuck) pressed.Space = true; });
      reset();
      G.loop(dt => {
        if (lives <= 0) return;
        if (keys.ArrowLeft) pad.x -= 480 * dt; if (keys.ArrowRight) pad.x += 480 * dt; pad.x = clamp(pad.x, pad.w / 2, W - pad.w / 2);
        if (stuck) { ball.x = pad.x; if (pressed.Space) { stuck = false; const sp = 330 + level * 25; ball.vx = sp * .5; ball.vy = -sp * .87; } }
        else {
          ball.x += ball.vx * dt; ball.y += ball.vy * dt;
          if (ball.x < 7 || ball.x > W - 7) { ball.vx *= -1; ball.x = clamp(ball.x, 7, W - 7); } if (ball.y < 7) { ball.vy = Math.abs(ball.vy); }
          if (ball.y > H - 38 && ball.y < H - 24 && Math.abs(ball.x - pad.x) < pad.w / 2 + 6 && ball.vy > 0) { const sp = Math.hypot(ball.vx, ball.vy) * 1.01, a = (ball.x - pad.x) / (pad.w / 2) * 1.05; ball.vx = sp * Math.sin(a); ball.vy = -sp * Math.cos(a); }
          for (const b of bricks) { if (ball.x > b.x - 7 && ball.x < b.x + 56 + 7 && ball.y > b.y - 7 && ball.y < b.y + 18 + 7) { const ox = Math.min(ball.x - (b.x - 7), b.x + 63 - ball.x), oy = Math.min(ball.y - (b.y - 7), b.y + 25 - ball.y); if (ox < oy) ball.vx *= -1; else ball.vy *= -1; if (--b.hp <= 0) { bricks.splice(bricks.indexOf(b), 1); score += 10; } break; } }
          if (ball.y > H + 10) { lives--; if (lives <= 0) { const nb = best('breakout', score); G.over('Fin del juego', `Puntos ${score}${nb ? ' · ¡Récord!' : ''}`, 'Otra vez', reset); } else serve(); }
          if (!bricks.length) { level++; build(); serve(); }
        }
        ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, W, H);
        bricks.forEach(b => { ctx.fillStyle = b.col; ctx.globalAlpha = b.hp > 1 ? 1 : .85; ctx.fillRect(b.x, b.y, 56, 18); }); ctx.globalAlpha = 1;
        ctx.fillStyle = '#e5e7eb'; ctx.fillRect(pad.x - pad.w / 2, H - 30, pad.w, 10); ctx.beginPath(); ctx.arc(ball.x, ball.y, 7, 0, 7); ctx.fillStyle = '#fbbf24'; ctx.fill();
        if (stuck) { ctx.fillStyle = '#9ca3af'; ctx.font = '15px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Espacio o toca para lanzar', W / 2, H / 2); ctx.textAlign = 'left'; }
        G.hud(`<b>Puntos ${score}</b><span>Nivel ${level}</span><span>${'🟡'.repeat(Math.max(0, lives))}</span><span>Récord ${best('breakout')}</span>`);
      });
      return G.destroy;
    } });

  add({ id: 'pong', name: 'Pong Neón', cat: 'Arcade', icon: '🏓', grad: ['#164e63', '#22d3ee'], desc: 'El clásico tenis de mesa contra la computadora.', how: '↑/↓ o arrastra · Gana el primero en llegar a 7',
    mount(st) {
      const G = E.canvasGame(st, 720, 440, { pad: ['ArrowUp', 'ArrowDown'] }), { ctx, W, H, keys } = G;
      let p, c, ball, sp, sc, wait;
      const serve = d => { ball = { x: W / 2, y: H / 2, vx: 300 * d, vy: rnd(-160, 160) }; wait = 1; };
      const reset = () => { p = H / 2; c = H / 2; sc = [0, 0]; serve(Math.random() < .5 ? 1 : -1); G.hideOver(); };
      G.cv.addEventListener('pointermove', e => { p = clamp(G.ptr(e)[1], 45, H - 45); });
      reset();
      G.loop(dt => {
        if (sc[0] >= 7 || sc[1] >= 7) return;
        if (keys.ArrowUp) p -= 420 * dt; if (keys.ArrowDown) p += 420 * dt; p = clamp(p, 45, H - 45);
        c += clamp(ball.y - c, -300 * dt, 300 * dt) * (ball.vx > 0 ? 1 : .3); c = clamp(c, 45, H - 45);
        if ((wait -= dt) <= 0) { ball.x += ball.vx * dt; ball.y += ball.vy * dt; }
        if (ball.y < 8 || ball.y > H - 8) { ball.vy *= -1; ball.y = clamp(ball.y, 8, H - 8); }
        const hit = (px, py) => Math.abs(ball.x - px) < 14 && Math.abs(ball.y - py) < 50;
        if (ball.vx < 0 && hit(30, p)) { ball.vx = Math.abs(ball.vx) * 1.06; ball.vy += (ball.y - p) * 5; }
        if (ball.vx > 0 && hit(W - 30, c)) { ball.vx = -Math.abs(ball.vx) * 1.06; ball.vy += (ball.y - c) * 5; }
        if (ball.x < -10) { sc[1]++; serve(1); } if (ball.x > W + 10) { sc[0]++; serve(-1); }
        if (sc[0] >= 7 || sc[1] >= 7) { if (sc[0] >= 7) best('pong', (storage.get('game_best', {}).pong || 0) + 1); G.over(sc[0] >= 7 ? '🏆 ¡Ganaste!' : '🤖 Gana la computadora', `${sc[0]} - ${sc[1]}`, 'Revancha', reset); }
        ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, W, H); ctx.setLineDash([8, 10]); ctx.strokeStyle = '#1e3a5f'; ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
        ctx.shadowBlur = 16; ctx.shadowColor = '#22d3ee'; ctx.fillStyle = '#22d3ee'; ctx.fillRect(22, p - 45, 10, 90); ctx.shadowColor = '#f472b6'; ctx.fillStyle = '#f472b6'; ctx.fillRect(W - 32, c - 45, 10, 90); ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 8, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
        ctx.font = 'bold 44px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#334155'; ctx.fillText(sc[0], W / 2 - 60, 60); ctx.fillText(sc[1], W / 2 + 60, 60); ctx.textAlign = 'left';
        G.hud(`<b>Tú ${sc[0]} · CPU ${sc[1]}</b><span>Victorias totales ${best('pong')}</span>`);
      });
      return G.destroy;
    } });

  add({ id: 'flappy', name: 'Pájaro Volador', cat: 'Arcade', icon: '🐦', grad: ['#0ea5e9', '#86efac'], desc: 'Aletea entre las tuberías sin chocar.', how: 'Espacio, ↑ o toca para aletear',
    mount(st) {
      const G = E.canvasGame(st, 420, 560, { pad: ['Space'], spaceLabel: '⬆' }), { ctx, W, H, pressed } = G;
      let y, v, pipes, score, dead, started;
      const reset = () => { y = H / 2; v = 0; pipes = []; score = 0; dead = false; started = false; G.hideOver(); };
      G.cv.addEventListener('pointerdown', () => { pressed.Space = true; });
      reset();
      G.loop(dt => {
        if (pressed.Space || pressed.ArrowUp) { if (!dead) { started = true; v = -330; } }
        if (started && !dead) {
          v += 980 * dt; y += v * dt;
          if (!pipes.length || pipes[pipes.length - 1].x < W - 210) pipes.push({ x: W + 30, gap: rnd(120, H - 190), passed: false });
          pipes.forEach(p => { p.x -= 160 * dt; if (!p.passed && p.x + 30 < 90) { p.passed = true; score++; } }); pipes = pipes.filter(p => p.x > -80);
          if (y > H - 30 || y < 0 || pipes.some(p => 90 + 14 > p.x && 90 - 14 < p.x + 60 && (y - 12 < p.gap - 75 || y + 12 > p.gap + 75))) { dead = true; const nb = best('flappy', score); G.over('💫 ¡Choque!', `Pasaste ${score} tuberías${nb ? ' · ¡Récord!' : ''}`, 'Volar otra vez', reset); }
        }
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#38bdf8'); g.addColorStop(1, '#bae6fd'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#16a34a'; pipes.forEach(p => { ctx.fillRect(p.x, 0, 60, p.gap - 75); ctx.fillRect(p.x, p.gap + 75, 60, H); ctx.fillStyle = '#15803d'; ctx.fillRect(p.x - 4, p.gap - 95, 68, 20); ctx.fillRect(p.x - 4, p.gap + 75, 68, 20); ctx.fillStyle = '#16a34a'; });
        ctx.fillStyle = '#a16207'; ctx.fillRect(0, H - 30, W, 30);
        ctx.save(); ctx.translate(90, y); ctx.rotate(clamp(v / 600, -.5, 1)); ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.scale(-1, 1); ctx.fillText('🐦', 0, 0); ctx.restore();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 40px system-ui'; ctx.textAlign = 'center'; ctx.fillText(score, W / 2, 70); if (!started) { ctx.font = '16px system-ui'; ctx.fillText('Toca o pulsa Espacio para empezar', W / 2, H / 2 + 60); } ctx.textAlign = 'left';
        G.hud(`<b>Puntos ${score}</b><span>Récord ${best('flappy')}</span>`);
      });
      return G.destroy;
    } });

  add({ id: 'dino', name: 'Corredor del Desierto', cat: 'Arcade', icon: '🦖', grad: ['#78350f', '#fcd34d'], desc: 'Salta cactus y agáchate ante los pájaros.', how: 'Espacio/↑ saltar · ↓ agacharse',
    mount(st) {
      const G = E.canvasGame(st, 720, 300, { pad: ['ArrowDown', 'Space'], spaceLabel: '⤒' }), { ctx, W, H, keys, pressed } = G;
      let y, v, obs, speed, dist, dead, t;
      const reset = () => { y = 0; v = 0; obs = []; speed = 320; dist = 0; dead = false; t = 0; G.hideOver(); };
      G.cv.addEventListener('pointerdown', () => pressed.Space = true);
      reset();
      G.loop(dt => {
        if (dead) return; t += dt;
        if ((pressed.Space || pressed.ArrowUp) && y === 0) v = 620;
        v -= 1800 * dt; y = Math.max(0, y + v * dt); if (y === 0) v = 0;
        const duck = keys.ArrowDown && y === 0; speed += 6 * dt; dist += speed * dt;
        if (!obs.length || obs[obs.length - 1].x < W - rnd(260, 520)) obs.push(Math.random() < .25 && dist > 1500 ? { x: W + 20, bird: true, h: Math.random() < .5 ? 36 : 70 } : { x: W + 20, w: rnd(14, 34), hh: rnd(30, 52) });
        obs.forEach(o => o.x -= speed * dt); obs = obs.filter(o => o.x > -50);
        const ph = duck ? 26 : 46, px = 70;
        for (const o of obs) { if (o.bird) { if (o.x < px + 34 && o.x + 36 > px && y + ph > o.h && y < o.h + 22) dead = true; } else if (o.x < px + 30 && o.x + o.w > px + 6 && y < o.hh) dead = true; }
        if (dead) { const s = Math.floor(dist / 10), nb = best('dino', s); G.over('🌵 ¡Ay!', `Distancia ${s}${nb ? ' · ¡Récord!' : ''}`, 'Correr otra vez', reset); }
        ctx.fillStyle = '#fef3c7'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#92400e'; ctx.fillRect(0, H - 40, W, 2);
        for (let i = 0; i < 12; i++) { ctx.fillRect(((i * 97 - dist * .9) % W + W) % W, H - 30 + (i % 3) * 7, 6, 2); }
        obs.forEach(o => { if (o.bird) { ctx.font = '30px serif'; ctx.fillText(Math.floor(t * 6) % 2 ? '🦅' : '🦇', o.x, H - 40 - o.h); } else { ctx.fillStyle = '#15803d'; ctx.fillRect(o.x, H - 40 - o.hh, o.w, o.hh); ctx.fillRect(o.x - 6, H - 40 - o.hh * .7, 6, 14); ctx.fillRect(o.x + o.w, H - 40 - o.hh * .55, 6, 12); } });
        ctx.font = (duck ? 30 : 44) + 'px serif'; ctx.save(); ctx.translate(px, H - 40 - y); ctx.scale(-1, 1); ctx.fillText('🦖', -40, -2); ctx.restore();
        G.hud(`<b>Distancia ${Math.floor(dist / 10)}</b><span>Récord ${best('dino')}</span>`);
      });
      return G.destroy;
    } });

  /* ================= CARRERAS ================= */
  add({ id: 'highway', name: 'Turbo Carretera', cat: 'Carreras', icon: '🏎️', grad: ['#1f2937', '#ef4444'], desc: 'Esquiva el tráfico a toda velocidad y recoge combustible.', how: '←/→ cambiar de carril · ↑ acelerar · ↓ frenar',
    mount(st) {
      const G = E.canvasGame(st, 420, 600, { pad: ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'] }), { ctx, W, H, keys, pressed } = G;
      const L = [80, 165, 255, 340]; let car, cars, speed, dist, fuel, dead, off, items;
      const reset = () => { car = { lane: 1, x: L[1] }; cars = []; items = []; speed = 260; dist = 0; fuel = 100; dead = false; off = 0; G.hideOver(); };
      const COLS = ['#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];
      reset();
      const drawCar = (x, y, col, me) => { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 20, y - 36, 40, 72, 9) : ctx.rect(x - 20, y - 36, 40, 72); ctx.fill(); ctx.fillStyle = '#0f172acc'; ctx.fillRect(x - 15, y - (me ? 22 : 10), 30, 14); ctx.fillRect(x - 15, y + (me ? 8 : 18), 30, 10); ctx.fillStyle = me ? '#fef08a' : '#fca5a5'; ctx.fillRect(x - 16, y + (me ? -36 : 32), 8, 4); ctx.fillRect(x + 8, y + (me ? -36 : 32), 8, 4); };
      G.loop(dt => {
        if (dead) return;
        if (pressed.ArrowLeft) car.lane = Math.max(0, car.lane - 1); if (pressed.ArrowRight) car.lane = Math.min(3, car.lane + 1);
        car.x += (L[car.lane] - car.x) * Math.min(1, dt * 12);
        if (keys.ArrowUp) speed += 160 * dt; else if (keys.ArrowDown) speed -= 300 * dt; else speed += 20 * dt;
        speed = clamp(speed, 120, 720); dist += speed * dt; off = (off + speed * dt) % 80; fuel -= dt * (2.5 + speed / 300);
        if (Math.random() < dt * (0.8 + dist / 15000)) { const lane = Math.floor(Math.random() * 4); if (!cars.some(c => c.lane === lane && c.y < 120)) cars.push({ lane, y: -60, v: rnd(90, 220), col: COLS[Math.floor(Math.random() * COLS.length)] }); }
        if (Math.random() < dt * .18) items.push({ lane: Math.floor(Math.random() * 4), y: -30 });
        cars.forEach(c => c.y += (speed - c.v) * dt); cars = cars.filter(c => c.y < H + 80 && c.y > -200);
        items.forEach(i => i.y += speed * dt); items = items.filter(i => { if (i.y > H - 140 && i.y < H - 40 && Math.abs(L[i.lane] - car.x) < 30) { fuel = Math.min(100, fuel + 30); return false; } return i.y < H + 30; });
        if (cars.some(c => Math.abs(L[c.lane] - car.x) < 36 && Math.abs(c.y - (H - 90)) < 68) || fuel <= 0) { dead = true; const s = Math.floor(dist / 100), nb = best('highway', s); G.over(fuel <= 0 ? '⛽ Sin combustible' : '💥 ¡Choque!', `Recorriste ${s} m${nb ? ' · ¡Récord!' : ''}`, 'Arrancar de nuevo', reset); }
        ctx.fillStyle = '#166534'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#374151'; ctx.fillRect(36, 0, W - 72, H);
        ctx.fillStyle = '#e5e7eb'; ctx.fillRect(36, 0, 4, H); ctx.fillRect(W - 40, 0, 4, H);
        ctx.fillStyle = '#f8fafc'; for (let k = 0; k < 3; k++) { const x = (L[k] + L[k + 1]) / 2; for (let yy = -80 + off; yy < H; yy += 80) ctx.fillRect(x - 2, yy, 4, 40); }
        items.forEach(i => { ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.fillText('⛽', L[i.lane], i.y); ctx.textAlign = 'left'; });
        cars.forEach(c => drawCar(L[c.lane], c.y, c.col, false)); drawCar(car.x, H - 90, '#ef4444', true);
        ctx.fillStyle = '#0008'; ctx.fillRect(10, 10, 104, 12); ctx.fillStyle = fuel > 30 ? '#22c55e' : '#ef4444'; ctx.fillRect(12, 12, fuel, 8);
        G.hud(`<b>${Math.floor(dist / 100)} m</b><span>${Math.round(speed / 3)} km/h</span><span>⛽ ${Math.max(0, Math.round(fuel))}%</span><span>Récord ${best('highway')} m</span>`);
      });
      return G.destroy;
    } });

  add({ id: 'racer', name: 'Circuito Nébula', cat: 'Carreras', icon: '🏁', grad: ['#312e81', '#f472b6'], desc: 'Carrera contrarreloj en circuito: logra tu mejor vuelta.', how: '↑ acelerar · ↓ frenar · ←/→ girar · 3 vueltas',
    mount(st) {
      const G = E.canvasGame(st, 760, 500, { pad: ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'] }), { ctx, W, H, keys } = G;
      const PTS = [[120, 250], [140, 120], [300, 70], [470, 110], [560, 70], [680, 130], [690, 300], [600, 420], [430, 380], [330, 440], [170, 420]];
      const path = new Path2D(); const sm = []; for (let i = 0; i < PTS.length; i++) { const a = PTS[i], b = PTS[(i + 1) % PTS.length]; sm.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); }
      path.moveTo(...sm[sm.length - 1]); PTS.forEach((p, i) => path.quadraticCurveTo(p[0], p[1], sm[i][0], sm[i][1]));
      const cps = sm.map(p => p); let car, lap, cp, lapT, laps, total, done, bestLap = storage.get('racer_lap', 0);
      const reset = () => { car = { x: sm[sm.length - 1][0], y: sm[sm.length - 1][1], a: Math.atan2(sm[0][1] - sm[sm.length - 1][1], sm[0][0] - sm[sm.length - 1][0]), v: 0 }; lap = 1; cp = 0; lapT = 0; laps = []; total = 0; done = false; G.hideOver(); };
      reset();
      G.loop(dt => {
        if (done) return;
        ctx.lineWidth = 62; const on = ctx.isPointInStroke(path, car.x, car.y);
        if (keys.ArrowUp) car.v += 260 * dt; if (keys.ArrowDown) car.v -= 380 * dt;
        car.v *= on ? .992 : .95; car.v = clamp(car.v, -80, on ? 330 : 120);
        const steer = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0); car.a += steer * dt * 2.8 * clamp(car.v / 160, -1, 1);
        car.x = clamp(car.x + Math.cos(car.a) * car.v * dt, 10, W - 10); car.y = clamp(car.y + Math.sin(car.a) * car.v * dt, 10, H - 10);
        lapT += dt; total += dt;
        if (Math.hypot(car.x - cps[cp][0], car.y - cps[cp][1]) < 60) { cp++; if (cp >= cps.length) { cp = 0; laps.push(lapT); if (!bestLap || lapT < bestLap) { bestLap = lapT; storage.set('racer_lap', bestLap); } lapT = 0; lap++; if (lap > 3) { done = true; G.over('🏁 ¡Meta!', `Tiempo total ${total.toFixed(2)} s · Mejor vuelta ${Math.min(...laps).toFixed(2)} s`, 'Correr otra vez', reset); } } }
        ctx.fillStyle = '#14532d'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 72; ctx.lineJoin = 'round'; ctx.stroke(path); ctx.strokeStyle = '#3f3f46'; ctx.lineWidth = 62; ctx.stroke(path);
        ctx.setLineDash([14, 14]); ctx.strokeStyle = '#a1a1aa'; ctx.lineWidth = 2; ctx.stroke(path); ctx.setLineDash([]);
        const f = sm[sm.length - 1]; ctx.save(); ctx.translate(f[0], f[1]); ctx.rotate(Math.atan2(sm[0][1] - f[1], sm[0][0] - f[0])); for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? '#111' : '#fff'; ctx.fillRect(-4, -32 + k * 8, 8, 8); } ctx.restore();
        const nx = cps[cp]; ctx.strokeStyle = '#facc15aa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(nx[0], nx[1], 14, 0, 7); ctx.stroke();
        ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.a); ctx.fillStyle = '#ec4899'; ctx.fillRect(-14, -8, 28, 16); ctx.fillStyle = '#0f172a'; ctx.fillRect(2, -6, 8, 12); ctx.fillStyle = '#fde047'; ctx.fillRect(12, -7, 3, 4); ctx.fillRect(12, 3, 3, 4); ctx.restore();
        if (!on) { ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 14px system-ui'; ctx.fillText('¡Fuera de pista!', car.x + 16, car.y - 14); }
        G.hud(`<b>Vuelta ${Math.min(lap, 3)}/3</b><span>⏱ ${lapT.toFixed(2)} s</span><span>${Math.round(Math.abs(car.v) / 1.5)} km/h</span><span>Mejor vuelta ${bestLap ? bestLap.toFixed(2) + ' s' : '—'}</span>`);
      });
      return G.destroy;
    } });
})();

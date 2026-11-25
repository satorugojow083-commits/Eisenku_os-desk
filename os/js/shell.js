/* EISENKU OS 8 · Shell: entornos Windows y Linux, barra de tareas/dock dinámicos, menú de inicio, lanzador, centro de acciones y Configuración */
(() => {
  'use strict';
  const E = window.EISEN, storage = E.storage, esc = E.esc, toast = E.toast, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const html = document.documentElement, tb = $('#taskbar'), center = $('#taskbar-center'), startBtn = $('#tb-start-trigger'), startMenu = $('#start-menu-panel');
  const DEF_PINS = ['explorer', 'browser', 'appcenter', 'word', 'notes', 'arcade', 'music', 'assistant'];
  const pins = () => storage.get('pinned', DEF_PINS).filter(id => E.apps().some(a => a.id === id) && E.isInstalled(id));
  const app = id => E.apps().find(a => a.id === id) || E.REG[id];
  const winOf = id => document.getElementById('win-' + id);
  const isRunning = id => { const w = winOf(id); return w && w.classList.contains('open'); };

  /* ---------- Pantalla de arranque ---------- */
  const boot = document.createElement('div'); boot.id = 'eis-boot';
  boot.innerHTML = `<div class="eis-boot-logo"><svg viewBox="0 0 64 64"><defs><linearGradient id="bl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34a582"/><stop offset=".55" stop-color="#5fb39a"/><stop offset="1" stop-color="#e8709f"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="#0f1115"/><rect x="1" y="1" width="62" height="62" rx="14" fill="none" stroke="url(#bl)" stroke-opacity=".45" stroke-width="1.5"/><path d="M21 18.5h22M21 32h16M21 45.5h22M21 18.5v27" fill="none" stroke="url(#bl)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="45" cy="32" r="3" fill="#e8709f"/></svg><b>EISENKU OS</b><small>9.0 ENTERPRISE</small></div><i class="eis-boot-bar"></i>`;
  document.body.appendChild(boot); setTimeout(() => boot.classList.add('out'), 700); setTimeout(() => boot.remove(), 1300);

  /* ---------- Entornos ---------- */
  const panel = document.createElement('div'); panel.id = 'lx-panel';
  panel.innerHTML = `<div class="lx-left"><button class="lx-btn" data-lx="act">⬤ Actividades</button><button class="lx-btn" data-lx="apps">Aplicaciones ▾</button><span class="lx-focus" data-focus></span></div><button class="lx-clock" data-lx="cal"><b data-t></b> <span data-d></span></button><div class="lx-right"><button class="lx-btn" data-lx="wx" data-wx>⛅</button><button class="lx-btn" data-lx="dom" title="Maestro Domingo">✦</button><button class="lx-btn" data-lx="qs"><span data-net>📶</span> <span>🔊</span> <span data-bat></span> ⏻</button></div>`;
  document.body.appendChild(panel);
  const cal = document.createElement('div'); cal.id = 'lx-cal'; cal.hidden = true; document.body.appendChild(cal);
  function setEnv(env, quiet) {
    env = env === 'linux' ? 'linux' : 'windows';
    const prev = html.dataset.env;
    if (prev && prev !== env && storage.get('env_wall', true)) { storage.set('wp_env_' + prev, { wp: storage.get('wp', 'e9-noir'), c: storage.get('customWallpaper', '') }); const n = storage.get('wp_env_' + env, null); if (n) { if (n.wp === 'custom' && n.c) E.setWallpaperUrl(n.c); else E.setWp(n.wp); } else E.setWp(env === 'linux' ? 'e9-jade' : 'e9-noir'); }
    html.dataset.env = env; storage.set('env', env);
    html.style.setProperty('--top-h', env === 'linux' ? '34px' : '0px');
    $$('[data-envpick]').forEach(b => b.classList.toggle('on', b.dataset.envpick === env));
    renderBar(); renderStart(); E.closeFlyouts();
    document.dispatchEvent(new CustomEvent('eisen:env', { detail: env }));
    if (!quiet && prev && prev !== env) E.notify(env === 'linux' ? 'Entorno Linux' : 'Entorno Windows', 'Tus archivos, apps y ajustes se mantienen.', env === 'linux' ? '🐧' : '🪟', 3500);
  }
  E.setEnv = setEnv;

  /* ---------- Barra de tareas / Dock ---------- */
  const search = center.querySelector('[data-launch="appcenter"][title="Buscar"]'); if (search) search.remove();
  center.querySelectorAll('[data-launch]').forEach(b => b.remove());
  const pinWrap = document.createElement('div'); pinWrap.className = 'tb-apps'; center.appendChild(pinWrap);
  const srchBtn = document.createElement('button'); srchBtn.className = 'tb-btn tb-search'; srchBtn.title = 'Buscar (Ctrl+K)'; srchBtn.innerHTML = '<span>🔍</span><em>Buscar</em>'; center.insertBefore(srchBtn, pinWrap);
  const gridBtn = document.createElement('button'); gridBtn.className = 'tb-btn tb-grid'; gridBtn.title = 'Mostrar aplicaciones'; gridBtn.innerHTML = '<span class="tb-gridic"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>'; center.appendChild(gridBtn);
  startBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="2" y="2" width="9" height="9" rx="2" fill="currentColor"/><rect x="13" y="2" width="9" height="9" rx="2" fill="currentColor" opacity=".8"/><rect x="2" y="13" width="9" height="9" rx="2" fill="currentColor" opacity=".8"/><rect x="13" y="13" width="9" height="9" rx="2" fill="currentColor" opacity=".6"/></svg>';
  function renderBar() {
    const p = pins(), open = $$('.window.open:not(.s9-otherdesk)').map(w => w.id.slice(4)).filter(id => id !== 'deskfolder' || true);
    const ids = p.concat(open.filter(id => !p.includes(id)));
    // 10.0: antes se reconstruía con cada clic en cualquier parte; ahora solo si cambió algo
    const sig = ids.map(id => { const w = winOf(id); return id + (w ? (w.classList.contains('open') ? 'o' : '') + (w.classList.contains('active') ? 'a' : '') + (w.classList.contains('minimized') ? 'm' : '') : ''); }).join(',') + '|' + p.length + '|' + (renderBar.v || 0);
    const f0 = $('.window.active.open:not(.minimized)'); const fa0 = f0 && app(f0.id.slice(4)); panel.querySelector('[data-focus]').textContent = fa0 ? fa0.name : '';
    if (sig === renderBar.sig && pinWrap.childElementCount) return;
    renderBar.sig = sig;
    pinWrap.innerHTML = ids.map(id => { const a = app(id) || { name: id, icon: '🗔' }; const w = winOf(id), run = w && w.classList.contains('open'), act = run && w.classList.contains('active') && !w.classList.contains('minimized'); return `<button class="tb-btn tb-app${run ? ' running' : ''}${act ? ' active' : ''}${p.includes(id) ? '' : ' unpinned'}" data-tb="${id}" title="${esc(a.name)}">${E.tile(a, 26)}</button>`; }).join('');
    const f = $('.window.active.open:not(.minimized)'); const fa = f && app(f.id.slice(4)); panel.querySelector('[data-focus]').textContent = fa ? fa.name : '';
  }
  pinWrap.addEventListener('click', e => {
    const b = e.target.closest('[data-tb]'); if (!b) return; const id = b.dataset.tb, w = winOf(id);
    if (w && w.classList.contains('open') && !w.classList.contains('minimized') && w.classList.contains('active')) { w.classList.add('minimized'); E.updateTaskbarButtons(); }
    else if (w && w.classList.contains('open')) { E.openWindow(id); } else E.launch(id);
  });
  pinWrap.addEventListener('contextmenu', e => {
    const b = e.target.closest('[data-tb]'); if (!b) return; e.preventDefault(); const id = b.dataset.tb, p = storage.get('pinned', DEF_PINS);
    const cm = $('#context-menu'); E.closeFlyouts();
    cm.innerHTML = `<button class="ctx-item" data-x="open"><span>▶</span> Abrir</button><button class="ctx-item" data-x="pin"><span>📌</span> ${p.includes(id) ? 'Desanclar de la barra' : 'Anclar a la barra'}</button>${isRunning(id) ? '<button class="ctx-item" data-x="close"><span>✕</span> Cerrar ventana</button>' : ''}`;
    cm.style.display = 'block'; cm.style.left = Math.min(innerWidth - 220, e.clientX) + 'px'; cm.style.top = Math.max(6, e.clientY - cm.offsetHeight - 6) + 'px';
    cm.onclick = ev => { const x = ev.target.closest('[data-x]'); if (!x) return; cm.style.display = 'none'; cm.onclick = null; if (x.dataset.x === 'open') E.launch(id); if (x.dataset.x === 'pin') { storage.set('pinned', p.includes(id) ? p.filter(k => k !== id) : p.concat(id)); renderBar(); } if (x.dataset.x === 'close') winOf(id).querySelector('[data-act=close]').click(); };
  });
  document.addEventListener('eisen:windows', renderBar);
  document.addEventListener('eisen:close', () => setTimeout(renderBar, 0));
  document.addEventListener('eisen:installed', () => { renderBar.v = (renderBar.v || 0) + 1; renderBar(); renderStart(); });
  document.addEventListener('eisen:env', () => { renderBar.v = (renderBar.v || 0) + 1; });
  E.renderBarForce = () => { renderBar.v = (renderBar.v || 0) + 1; renderBar(); };
  document.addEventListener('pointerdown', () => setTimeout(renderBar, 0));

  /* ---------- Menú de inicio ---------- */
  const sbody = startMenu.querySelector('.start-body');
  sbody.querySelector('.start-section-title').innerHTML = '<span>Anclado</span><button class="btn-secondary sm-btn" data-all>Todas las apps ›</button>';
  const pinnedGrid = $('#start-pinned-grid'), recWrap = $('#start-recents-list');
  const allView = document.createElement('div'); allView.className = 'sm-all'; allView.hidden = true; sbody.appendChild(allView);
  const results = document.createElement('div'); results.className = 'sm-results'; results.hidden = true; sbody.prepend(results);
  const DEF_START = ['explorer', 'browser', 'appcenter', 'assistant', 'word', 'excel', 'notes', 'tasks', 'calendar', 'calc', 'paint', 'weather', 'music', 'arcade', 'wiki', 'settings', 'terminal', 'camera'];
  const startPins = () => storage.get('start_pins', DEF_START).filter(id => app(id) && E.isInstalled(id));
  const item = a => `<button class="start-app-item" data-sa="${a.id}" title="${esc(a.desc || a.name)}">${E.tile(a, 40)}<span class="start-name">${esc(a.name)}</span></button>`;
  async function renderStart() {
    pinnedGrid.innerHTML = startPins().map(id => item(app(id))).join('');
    const rec = storage.get('recent_apps', []).filter(id => app(id) && id !== 'deskfolder').slice(0, 4);
    let files = []; try { files = (await E.vaultAll()).sort((a, b) => b.date - a.date).slice(0, 4); } catch { /* sin archivos */ }
    recWrap.innerHTML = rec.map(id => { const a = app(id); return `<button class="sm-rec" data-sa="${id}">${E.tile(a, 30)}<span><b>${esc(a.name)}</b><small>Usada recientemente</small></span></button>`; }).join('') + files.map(f => `<button class="sm-rec" data-sf="${f.id}"><span class="sm-fic">${/^image/.test(f.type) ? '🖼️' : /^audio/.test(f.type) ? '🎵' : /^video/.test(f.type) ? '🎬' : /pdf/.test(f.type) ? '📕' : '📄'}</span><span><b>${esc(f.name)}</b><small>${new Date(f.date).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></span></button>`).join('') || '<p class="eis-muted" style="font-size:12px">Aquí aparecerán tus apps y archivos recientes.</p>';
    const u = storage.get('user_name', 'Eisen'); startMenu.querySelector('.user-profile').innerHTML = `<div class="user-avatar">${esc(storage.get('user_avatar', '') || u[0].toUpperCase())}</div><span>${esc(u)}</span>`;
  }
  function renderAll() {
    const groups = {}; E.installedApps().filter(a => a.id !== 'deskfolder').forEach(a => { const k = a.game ? 'Juegos' : (E.CATS[a.cat] || {}).label || a.cat; (groups[k] = groups[k] || []).push(a); });
    allView.innerHTML = `<button class="btn-secondary sm-btn" data-back>‹ Atrás</button>` + Object.keys(groups).sort().map(k => `<h4>${esc(k)}</h4><div class="sm-list">${groups[k].sort((a, b) => a.name.localeCompare(b.name)).map(a => `<button class="sm-row" data-sa="${a.id}">${E.tile(a, 26)}<span>${esc(a.name)}</span><small>${esc(a.desc || '')}</small></button>`).join('')}</div>`).join('');
  }
  const SETTINGS_SHORT = [['Cambiar a entorno Linux', '🐧', () => setEnv('linux')], ['Cambiar a entorno Windows', '🪟', () => setEnv('windows')], ['Fondo de pantalla', '🖼️', () => { E.openWindow('settings'); E.settingsGo('look'); }], ['Tema oscuro / claro', '🌓', () => $('#qt-dark').click()], ['Configuración de entorno', '⚙️', () => { E.openWindow('settings'); E.settingsGo('env'); }]];
  async function doSearch(q) {
    const n = q.toLowerCase().trim(); results.hidden = !n; pinnedGrid.parentElement.querySelectorAll(':scope > :not(.sm-results)').forEach(x => x.classList.toggle('sm-hide', !!n));
    if (!n) return;
    const apps = E.installedApps().filter(a => a.id !== 'deskfolder' && (a.name + ' ' + (a.desc || '') + ' ' + (a.kw || (E.REG[a.id] || {}).kw || '')).toLowerCase().includes(n)).slice(0, 8);
    const sets = SETTINGS_SHORT.filter(s => s[0].toLowerCase().includes(n));
    let files = []; try { files = (await E.vaultAll()).filter(f => f.name.toLowerCase().includes(n)).slice(0, 5); } catch { /* ignorar */ }
    results.innerHTML = (apps.length ? `<h4>Aplicaciones</h4>${apps.map(a => `<button class="sm-row" data-sa="${a.id}">${E.tile(a, 26)}<span>${esc(a.name)}</span><small>${esc(a.desc || '')}</small></button>`).join('')}` : '') +
      (sets.length ? `<h4>Configuración</h4>${sets.map((s, i) => `<button class="sm-row" data-set="${SETTINGS_SHORT.indexOf(s)}"><span class="sm-fic">${s[1]}</span><span>${esc(s[0])}</span></button>`).join('')}` : '') +
      (files.length ? `<h4>Archivos</h4>${files.map(f => `<button class="sm-row" data-sf="${f.id}"><span class="sm-fic">📄</span><span>${esc(f.name)}</span><small>${esc(f.folder)}</small></button>`).join('')}` : '') +
      `<h4>Más</h4><button class="sm-row" data-web="${esc(q)}"><span class="sm-fic">🔎</span><span>Buscar “${esc(q)}” en la web</span></button><button class="sm-row" data-ask="${esc(q)}"><span class="sm-fic">✦</span><span>Preguntar a Domingo: “${esc(q)}”</span></button><button class="sm-row" data-store="${esc(q)}"><span class="sm-fic">🛍️</span><span>Buscar en EISEN Store</span></button>`;
  }
  const sInput = $('#start-search-input');
  sInput.oninput = e => doSearch(e.target.value);
  sInput.onkeydown = e => { if (e.key === 'Enter') { const f = results.querySelector('button'); if (f) f.click(); } if (e.key === 'Escape') E.closeFlyouts(); };
  startMenu.addEventListener('click', async e => {
    const t = e.target;
    if (t.closest('[data-all]')) { renderAll(); allView.hidden = false; pinnedGrid.parentElement.querySelectorAll(':scope > :not(.sm-all)').forEach(x => x.classList.add('sm-hide')); return; }
    if (t.closest('[data-back]')) { allView.hidden = true; $$('.sm-hide').forEach(x => x.classList.remove('sm-hide')); return; }
    const a = t.closest('[data-sa]'); if (a) { E.launch(a.dataset.sa); E.closeFlyouts(); return; }
    const f = t.closest('[data-sf]'); if (f) { E.vaultOpen(f.dataset.sf); E.closeFlyouts(); return; }
    const s = t.closest('[data-set]'); if (s) { SETTINGS_SHORT[+s.dataset.set][2](); E.closeFlyouts(); return; }
    const w = t.closest('[data-web]'); if (w) { E.ebOpenUrl(w.dataset.web, true); E.closeFlyouts(); return; }
    const k = t.closest('[data-ask]'); if (k) { E.domingo(k.dataset.ask); E.closeFlyouts(); return; }
    const st = t.closest('[data-store]'); if (st) { E.storeSearch(st.dataset.store); E.closeFlyouts(); }
  });
  startMenu.addEventListener('contextmenu', e => {
    const a = e.target.closest('[data-sa]'); if (!a) return; e.preventDefault(); const id = a.dataset.sa, sp = storage.get('start_pins', DEF_START), tp = storage.get('pinned', DEF_PINS);
    const cm = $('#context-menu'); cm.innerHTML = `<button class="ctx-item" data-x="sp"><span>📌</span> ${sp.includes(id) ? 'Desanclar de Inicio' : 'Anclar a Inicio'}</button><button class="ctx-item" data-x="tp"><span>📍</span> ${tp.includes(id) ? 'Desanclar de la barra' : 'Anclar a la barra'}</button><button class="ctx-item" data-x="dk"><span>🖥</span> Crear acceso en el escritorio</button>${E.CORE_APPS.includes(id) ? '' : '<button class="ctx-item" data-x="un"><span>🗑</span> Desinstalar</button>'}`;
    cm.style.display = 'block'; cm.style.left = Math.min(innerWidth - 230, e.clientX) + 'px'; cm.style.top = Math.min(innerHeight - cm.offsetHeight - 6, e.clientY) + 'px';
    cm.onclick = ev => { const x = ev.target.closest('[data-x]'); if (!x) return; cm.style.display = 'none'; cm.onclick = null; const k = x.dataset.x;
      if (k === 'sp') storage.set('start_pins', sp.includes(id) ? sp.filter(z => z !== id) : sp.concat(id)); if (k === 'tp') storage.set('pinned', tp.includes(id) ? tp.filter(z => z !== id) : tp.concat(id)); if (k === 'dk') E.addDesktopShortcut(id); if (k === 'un') E.setInstalled(id, false); renderStart(); renderBar(); };
  });
  // botón de apagado con menú
  const pw = $('#sys-btn-restart'); pw.onclick = e => { e.stopPropagation(); const cm = $('#context-menu'); cm.innerHTML = `<button class="ctx-item" data-x="lock"><span>🔒</span> Bloquear</button><button class="ctx-item" data-x="env"><span>${html.dataset.env === 'linux' ? '🪟' : '🐧'}</span> Cambiar a ${html.dataset.env === 'linux' ? 'Windows' : 'Linux'}</button><button class="ctx-item" data-x="rb"><span>↻</span> Reiniciar interfaz</button>`; cm.style.display = 'block'; const r = pw.getBoundingClientRect(); cm.style.left = Math.min(innerWidth - 230, r.left) + 'px'; cm.style.top = (r.top - cm.offsetHeight - 6) + 'px'; cm.onclick = ev => { const x = ev.target.closest('[data-x]'); if (!x) return; cm.style.display = 'none'; cm.onclick = null; if (x.dataset.x === 'rb') location.reload(); if (x.dataset.x === 'env') setEnv(html.dataset.env === 'linux' ? 'windows' : 'linux'); if (x.dataset.x === 'lock') lock(); }; };
  const openStart = () => { if (html.dataset.env === 'linux') return openLauncher(); startMenu.classList.add('open'); renderStart(); setTimeout(() => sInput.focus(), 60); };
  startBtn.addEventListener('click', () => { if (startMenu.classList.contains('open')) { sInput.value = ''; doSearch(''); allView.hidden = true; $$('.sm-hide').forEach(x => x.classList.remove('sm-hide')); renderStart(); setTimeout(() => sInput.focus(), 60); } });
  srchBtn.onclick = e => { e.stopPropagation(); if (html.dataset.env === 'linux') return openLauncher(); E.closeFlyouts(); openStart(); };

  /* ---------- Lanzador (Linux) ---------- */
  const lx = document.createElement('div'); lx.id = 'lx-launcher'; lx.hidden = true;
  lx.innerHTML = `<div class="lx-l-top"><input class="input-text" data-q placeholder="Escribe para buscar aplicaciones…"><div class="lx-l-cats" data-cats></div></div><div class="lx-l-grid" data-g></div><div class="lx-l-win" data-w></div>`;
  document.body.appendChild(lx); let lxCat = 'all';
  function renderLauncher() {
    const q = lx.querySelector('[data-q]').value.toLowerCase(); const all = E.installedApps().filter(a => a.id !== 'deskfolder');
    const cats = ['all', ...new Set(all.map(a => a.game ? 'Juegos' : a.cat === 'Ciencia' ? 'Educación' : a.cat))];
    lx.querySelector('[data-cats]').innerHTML = cats.map(c => `<button data-c="${c}" class="${c === lxCat ? 'on' : ''}">${c === 'all' ? 'Todas' : (E.CATS[c] || {}).label || c}</button>`).join('');
    lx.querySelector('[data-g]').innerHTML = all.filter(a => (lxCat === 'all' || (a.game ? 'Juegos' : a.cat === 'Ciencia' ? 'Educación' : a.cat) === lxCat) && (!q || (a.name + (a.desc || '')).toLowerCase().includes(q))).sort((a, b) => a.name.localeCompare(b.name)).map(a => `<button data-sa="${a.id}" title="${esc(a.desc || '')}">${E.tile(a, 64)}<span>${esc(a.name)}</span></button>`).join('') || '<p class="ap-empty">Sin resultados</p>';
    const open = $$('.window.open'); lx.querySelector('[data-w]').innerHTML = open.length ? `<h4>Ventanas abiertas</h4>${open.map(w => { const a = app(w.id.slice(4)) || { name: w.id }; return `<button data-win="${w.id.slice(4)}">${E.tile(a, 22)}<span>${esc(a.name)}</span></button>`; }).join('')}` : '';
  }
  function openLauncher() { E.closeFlyouts(); lx.hidden = false; requestAnimationFrame(() => lx.classList.add('on')); lxCat = 'all'; lx.querySelector('[data-q]').value = ''; renderLauncher(); setTimeout(() => lx.querySelector('[data-q]').focus(), 50); }
  function closeLauncher() { lx.classList.remove('on'); setTimeout(() => lx.hidden = true, 180); }
  lx.querySelector('[data-q]').oninput = renderLauncher;
  lx.querySelector('[data-q]').onkeydown = e => { if (e.key === 'Escape') closeLauncher(); if (e.key === 'Enter') { const f = lx.querySelector('[data-sa]'); if (f) f.click(); } };
  lx.addEventListener('click', e => { const c = e.target.closest('[data-c]'); if (c) { lxCat = c.dataset.c; renderLauncher(); return; } const a = e.target.closest('[data-sa]'); if (a) { closeLauncher(); E.launch(a.dataset.sa); return; } const w = e.target.closest('[data-win]'); if (w) { closeLauncher(); E.openWindow(w.dataset.win); return; } if (e.target === lx || e.target.closest('.lx-l-grid') === e.target) closeLauncher(); });
  gridBtn.onclick = e => { e.stopPropagation(); lx.hidden ? openLauncher() : closeLauncher(); };
  E.openLauncher = openLauncher;

  /* ---------- Panel superior Linux ---------- */
  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-lx]'); if (!b) return; e.stopPropagation(); const k = b.dataset.lx;
    if (k === 'act' || k === 'apps') { lx.hidden ? openLauncher() : closeLauncher(); }
    if (k === 'qs') { E.closeFlyouts(); $('#action-center').classList.toggle('open'); }
    if (k === 'dom') E.domingo();
    if (k === 'wx') E.launch('weather');
    if (k === 'cal') { cal.hidden = !cal.hidden; if (!cal.hidden) drawCal(); }
  });
  function drawCal() {
    const d = new Date(), y = d.getFullYear(), m = d.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), evs = storage.get('events', []);
    const k = dd => `${y}-${String(m + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    cal.innerHTML = `<b>${d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</b><div class="lx-cg">${'LMXJVSD'.split('').map(x => `<i>${x}</i>`).join('')}${'<span></span>'.repeat(first)}${Array.from({ length: n }, (_, i) => `<span class="${i + 1 === d.getDate() ? 'on' : ''}${evs.some(e => e.d === k(i + 1)) ? ' ev' : ''}">${i + 1}</span>`).join('')}</div><h5>Hoy</h5>${evs.filter(e => e.d === k(d.getDate())).map(e => `<p>• ${esc(e.h || '')} ${esc(e.t)}</p>`).join('') || '<p class="eis-muted">Sin eventos</p>'}<button class="btn-secondary" data-opencal>Abrir Calendario</button>`;
    cal.querySelector('[data-opencal]').onclick = () => { cal.hidden = true; E.launch('calendar'); };
  }
  document.addEventListener('pointerdown', e => { if (!e.target.closest('#lx-cal,[data-lx="cal"]')) cal.hidden = true; if (!lx.hidden && !e.target.closest('#lx-launcher,[data-lx],.tb-grid,.tb-search,#tb-start-trigger')) closeLauncher(); });

  /* ---------- Reloj, red, batería, clima ---------- */
  const clockT = () => { const d = new Date(); panel.querySelector('[data-t]').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); panel.querySelector('[data-d]').textContent = d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }); };
  setInterval(clockT, 10000); clockT();
  const tray = $('#systray-quick-btn');
  async function trayUpd() {
    const on = navigator.onLine, net = on ? '📶' : '🚫';
    let bat = ''; try { if (navigator.getBattery) { const b = await navigator.getBattery(); bat = `${b.charging ? '⚡' : '🔋'} ${Math.round(b.level * 100)}%`; } } catch { /* sin batería */ }
    tray.innerHTML = `<span title="${on ? 'En línea' : 'Sin conexión'}">${net}</span><span>🔊</span>${bat ? `<span>${bat}</span>` : ''}<span class="tb-bell" data-bell>🔔</span>`;
    panel.querySelector('[data-net]').textContent = net; panel.querySelector('[data-bat]').textContent = bat;
    const qw = $('#qt-wifi'); if (qw) { qw.classList.toggle('active', on); qw.querySelector('span:last-child').textContent = on ? 'En línea' : 'Sin conexión'; }
  }
  addEventListener('online', trayUpd); addEventListener('offline', trayUpd); trayUpd(); setInterval(trayUpd, 120000);
  const wxBtn = $('#taskbar-left .tb-btn');
  async function wxUpd() {
    const loc = storage.get('weather_loc', null);
    if (!loc) { wxBtn.innerHTML = '⛅ <span>Clima</span>'; panel.querySelector('[data-wx]').textContent = '⛅'; return; }
    try { const j = await E.weatherNow(loc), w = E.wmo(j.current.weather_code), t = Math.round(j.current.temperature_2m) + '°C'; wxBtn.innerHTML = `${w[0]} <span><b>${t}</b><small>${esc(loc.name.split(',')[0])}</small></span>`; wxBtn.title = w[1]; panel.querySelector('[data-wx]').textContent = `${w[0]} ${t}`; }
    catch { wxBtn.innerHTML = '⛅ <span>Clima</span>'; }
  }
  wxBtn.onclick = () => E.launch('weather'); wxUpd(); setInterval(() => { if (!document.documentElement.classList.contains('data-saver')) wxUpd(); }, 1800000); /* 9.0: respeta el ahorro de datos */ document.addEventListener('eisen:weather', wxUpd);
  const domBtn = document.createElement('button'); domBtn.className = 'tb-btn tb-dom'; domBtn.title = 'Maestro Domingo'; domBtn.innerHTML = E.DOMINGO_AVATAR || '✦'; $('#taskbar-right').prepend(domBtn); domBtn.onclick = () => { const w = winOf('assistant'); if (w && w.classList.contains('open') && !w.classList.contains('minimized') && w.classList.contains('active')) { w.classList.add('minimized'); E.updateTaskbarButtons(); } else E.domingo(); };

  /* ---------- Centro de acciones (botones reales) ---------- */
  const ac = $('#action-center'), tiles = ac.querySelector('.quick-tiles-grid');
  const qw = $('#qt-wifi'); qw.onclick = () => { E.launch('netcheck'); E.closeFlyouts(); }; qw.title = 'Estado de la red (abre Prueba de red)';
  const qb = $('#qt-bt'); qb.innerHTML = '<span class="qt-icon">🔕</span><span>No molestar</span>'; qb.classList.toggle('active', storage.get('dnd', false));
  qb.onclick = () => { const v = !storage.get('dnd', false); storage.set('dnd', v); qb.classList.toggle('active', v); html.classList.toggle('dnd', v); };
  html.classList.toggle('dnd', storage.get('dnd', false));
  tiles.insertAdjacentHTML('beforeend', `<button class="quick-tile" id="qt-env"><span class="qt-icon">🐧</span><span>Modo Linux</span></button><button class="quick-tile" id="qt-dom"><span class="qt-icon">✦</span><span>Domingo</span></button><button class="quick-tile" id="qt-set"><span class="qt-icon">⚙️</span><span>Configuración</span></button>`);
  $('#qt-env').onclick = () => setEnv(html.dataset.env === 'linux' ? 'windows' : 'linux');
  $('#qt-dom').onclick = () => { E.closeFlyouts(); E.domingo(); };
  $('#qt-set').onclick = () => { E.closeFlyouts(); E.openWindow('settings'); };
  ac.insertAdjacentHTML('beforeend', `<div class="ac-notes"><div class="ac-nh"><b>Notificaciones</b><button class="btn-secondary sm-btn" data-clrn>Borrar</button></div><div data-nl></div></div>`);
  const drawNotes = () => { const l = storage.get('notif_log', []); ac.querySelector('[data-nl]').innerHTML = l.slice(0, 6).map(n => `<div class="ac-n"><span>${esc(n.icon)}</span><div><b>${esc(n.title)}</b><p>${esc(n.body)}</p></div><small>${new Date(n.d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>`).join('') || '<p class="eis-muted" style="font-size:12px">Sin notificaciones</p>'; $('#qt-env').querySelector('span:last-child').textContent = html.dataset.env === 'linux' ? 'Modo Windows' : 'Modo Linux'; $('#qt-env .qt-icon').textContent = html.dataset.env === 'linux' ? '🪟' : '🐧'; };
  ac.querySelector('[data-clrn]').onclick = () => { storage.set('notif_log', []); drawNotes(); };
  document.addEventListener('eisen:notify', drawNotes); document.addEventListener('eisen:env', drawNotes);
  $('#systray-quick-btn').addEventListener('click', drawNotes); drawNotes();

  /* ---------- Bloqueo de pantalla ---------- */
  function lock() {
    if (E.lock9) return E.lock9(); // 9.0: bloqueo con PIN del perfil y notificaciones
    E.closeFlyouts(); const l = document.createElement('div'); l.id = 'eis-lock';
    const draw = () => { const d = new Date(); l.querySelector('[data-t]').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); l.querySelector('[data-d]').textContent = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }); };
    l.innerHTML = `<div class="lk-time"><b data-t></b><span data-d></span></div><div class="lk-user"><div class="user-avatar">${esc(storage.get('user_avatar', '') || storage.get('user_name', 'Eisen')[0])}</div><b>${esc(storage.get('user_name', 'Eisen'))}</b><button class="btn-primary">Desbloquear</button><small>Toca o pulsa cualquier tecla</small></div>`;
    l.style.backgroundImage = getComputedStyle($('#desktop-viewport')).backgroundImage;
    document.body.appendChild(l); draw(); const t = setInterval(draw, 5000);
    const un = () => { clearInterval(t); l.classList.add('out'); setTimeout(() => l.remove(), 300); document.removeEventListener('keydown', un); };
    l.onclick = un; setTimeout(() => document.addEventListener('keydown', un), 300);
  }
  E.lock = lock;

  /* ---------- Configuración reorganizada ---------- */
  const sw = $('#win-settings'), sb = sw.querySelector('.window-body');
  sw.querySelector('.window-title-area').innerHTML = `${E.tile(E.REG.settings, 18, 'mini')}<span>Configuración</span>`;
  const cards = [...sb.querySelectorAll(':scope > .ui-card')];
  const CARD_ID = { 'Personalización & Aspecto': '#cfg-theme', 'Fondo de Pantalla': '#cfg-wallpaper', 'Idioma y archivos': '#cfg-lang', 'Navegador Web': '#cfg-browser', 'Ventanas e Inicio': '#cfg-btn-reset-win', 'Aplicaciones vinculadas': '#cfg-yt-key', 'Almacenamiento Local & Sistema': '#cfg-btn-backup' };
  const byTitle = t => cards.find(c => c.querySelector(CARD_ID[t])) || document.createElement('div');
  const SECT = [['env', '🖥️', 'Entorno'], ['look', '🎨', 'Personalización'], ['desk', '🗂️', 'Escritorio y ventanas'], ['web', '🌐', 'Navegador'], ['ai', '✦', 'Asistente'], ['apps', '🔗', 'Apps vinculadas'], ['lang', '🌍', 'Idioma y archivos'], ['sys', '💾', 'Sistema y datos'], ['about', 'ℹ️', 'Acerca de']];
  sb.classList.add('cfg'); sb.innerHTML = `<nav class="cfg-nav">${SECT.map(([k, i, l]) => `<button data-sec="${k}"><span>${i}</span>${l}</button>`).join('')}</nav><div class="cfg-main" data-main></div>`;
  const main = sb.querySelector('[data-main]'), sec = {};
  SECT.forEach(([k, i, l]) => { const d = document.createElement('section'); d.className = 'cfg-sec'; d.dataset.s = k; d.innerHTML = `<h2>${i} ${l}</h2>`; main.appendChild(d); sec[k] = d; });
  const envCard = E.h(`<div class="ui-card ui-stack"><b>Elige tu entorno</b><div class="env-pick"><button data-envpick="windows"><div class="env-prev win"><i class="ep-bar"></i><i class="ep-win"></i></div><b>🪟 Windows</b><small>Barra inferior, menú Inicio y ventanas con controles a la derecha.</small></button><button data-envpick="linux"><div class="env-prev lin"><i class="ep-top"></i><i class="ep-win"></i><i class="ep-dock"></i></div><b>🐧 Linux</b><small>Panel superior, dock flotante y lanzador de aplicaciones a pantalla completa.</small></button></div><label class="ap-check-l"><input type="checkbox" data-o="env_wall"> Recordar un fondo distinto para cada entorno</label><p class="eis-muted" style="font-size:11px">Ambos entornos comparten archivos, apps instaladas, carpetas y ajustes. Puedes cambiar en cualquier momento desde aquí, el centro de acciones o diciéndoselo a Domingo.</p></div>`);
  sec.env.appendChild(envCard);
  sec.look.append(byTitle('Personalización & Aspecto'), byTitle('Fondo de Pantalla'));
  sec.look.appendChild(E.h(`<div class="ui-card ui-stack"><b>Efectos</b><label class="ap-check-l"><input type="checkbox" data-o="anim" > Animaciones de ventanas y menús</label><label class="ap-check-l"><input type="checkbox" data-o="glass"> Efecto cristal (desactívalo en equipos modestos o Xbox)</label><label class="ap-check-l"><input type="checkbox" data-o="notif_sound"> Sonido en las notificaciones</label></div>`));
  sec.desk.appendChild(E.h(`<div class="ui-card ui-stack"><b>Escritorio</b><div class="ui-grid-2"><label>Tamaño de iconos<select class="input-text" data-sel="icon_size"><option value="s">Pequeños</option><option value="m">Medianos</option><option value="l">Grandes</option></select></label><label>Abrir iconos con<select class="input-text" data-sel="dbl_open"><option value="false">Un clic / toque</option><option value="true">Doble clic</option></select></label></div><div class="ui-row"><button class="btn-secondary" data-do="newfolder">📁 Nueva carpeta</button><button class="btn-secondary" data-do="arrange">🔤 Ordenar iconos</button><button class="btn-secondary" data-do="resetdesk">↺ Restablecer escritorio</button></div></div>`));
  sec.desk.appendChild(E.h(`<div class="ui-card ui-stack"><b>Ventanas</b><label class="ap-check-l"><input type="checkbox" data-o="snap"> Ajustar al arrastrar a los bordes (mitad izquierda/derecha y maximizar arriba)</label></div>`));
  sec.desk.appendChild(byTitle('Ventanas e Inicio'));
  sec.web.appendChild(byTitle('Navegador Web'));
  sec.web.appendChild(E.h(`<div class="ui-card ui-stack"><b>Resultados de búsqueda</b><label class="ap-check-l"><input type="checkbox" data-o="search_native"> Mostrar resultados con la página de búsqueda EISEN (más compatible: DuckDuckGo/Bing + Wikipedia)</label><div class="ui-row"><button class="btn-secondary" data-do="hist">🕘 Historial</button><button class="btn-secondary" data-do="marks">⭐ Favoritos</button></div></div>`));
  sec.ai.appendChild(E.h(`<div class="ui-card ui-stack"><b>Maestro Domingo</b><p style="font-size:12px">Domingo responde órdenes del sistema, matemáticas, clima y traducciones sin claves. Para conversación completa con IA hay dos opciones que <b>no exponen claves públicas</b>:</p><ol style="font-size:12px;padding-left:18px"><li><b>Servidor propio</b>: define la variable <code>AI_API_KEY</code> (y opcionalmente <code>AI_BASE_URL</code>, <code>AI_MODEL</code>) donde ejecutes EISENKU (INICIAR.bat, Cloudflare o Netlify). La clave nunca llega al navegador.</li><li><b>Puter.js</b>: cada usuario inicia sesión con su cuenta gratuita de Puter y usa su propia cuota.</li></ol><div class="ui-row"><button class="btn-primary" data-do="dom">Abrir Domingo y sus ajustes</button></div></div>`));
  sec.apps.appendChild(byTitle('Aplicaciones vinculadas'));
  sec.lang.appendChild(byTitle('Idioma y archivos'));
  sec.sys.appendChild(byTitle('Almacenamiento Local & Sistema'));
  sec.sys.appendChild(E.h(`<div class="ui-card ui-stack"><b>Usuario</b><div class="ui-grid-2"><label>Nombre<input class="input-text" data-txt="user_name" maxlength="24"></label><label>Avatar (emoji o letra)<input class="input-text" data-txt="user_avatar" maxlength="4"></label></div></div>`));
  sec.about.appendChild(E.h(`<div class="ui-card ui-stack about"><div class="about-logo">${boot.querySelector('svg') ? boot.querySelector('svg').outerHTML : ''}</div><b style="font-size:18px">${(window.EISENKU && EISENKU.label) || "EISENKU OS"}</b><p>Sistema operativo web con entornos Windows y Linux, ${E.apps().filter(a => E.REG[a.id] && a.id !== 'deskfolder').length} apps integradas, ${(E.GAMES || []).length} juegos, EISEN Store y el asistente Maestro Domingo.</p><p class="eis-muted" style="font-size:12px">Funciona en navegadores modernos (Chrome, Edge, Firefox, Safari), tabletas Android y Microsoft Edge en Xbox. Tus datos se guardan solo en este dispositivo (localStorage e IndexedDB).</p><div class="ui-row"><button class="btn-secondary" data-do="guide">Ver guía de inicio</button><button class="btn-secondary" data-do="lock">🔒 Bloquear pantalla</button></div></div>`));
  cards.forEach(c => { if (!c.parentElement || c.parentElement === sb) sec.sys.appendChild(c); });
  const OPTS = { env_wall: true, anim: true, glass: true, notif_sound: false, snap: true, search_native: true };
  const applyOpts = () => { html.classList.toggle('no-anim', !storage.get('anim', true)); html.classList.toggle('no-glass', !storage.get('glass', !/Xbox/i.test(navigator.userAgent))); };
  sb.querySelectorAll('[data-o]').forEach(i => { const k = i.dataset.o; i.checked = storage.get(k, k === 'glass' ? !/Xbox/i.test(navigator.userAgent) : OPTS[k]); i.onchange = () => { storage.set(k, i.checked); applyOpts(); if (k === 'search_native') E.ebRender(); }; });
  sb.querySelectorAll('[data-sel]').forEach(s => { const k = s.dataset.sel; s.value = String(storage.get(k, k === 'icon_size' ? 'm' : false)); s.onchange = () => { storage.set(k, k === 'dbl_open' ? s.value === 'true' : s.value); E.desktopRender && E.desktopRender(); }; });
  sb.querySelectorAll('[data-txt]').forEach(i => { const k = i.dataset.txt; i.value = storage.get(k, k === 'user_name' ? 'Eisen' : ''); i.oninput = () => { storage.set(k, i.value.trim()); renderStart(); }; });
  sb.addEventListener('click', async e => {
    const s = e.target.closest('[data-sec]'); if (s) return go(s.dataset.sec);
    const p = e.target.closest('[data-envpick]'); if (p) return setEnv(p.dataset.envpick);
    const d = e.target.closest('[data-do]'); if (!d) return;
    ({ newfolder: () => E.desktopNewFolder(), arrange: () => { E.desktopItems().filter(i => !i.p).forEach(i => i.x = null); E.desktopRender(); }, resetdesk: async () => { if (await E.confirm('Restablecer escritorio', 'Se restaurarán los iconos y carpetas iniciales.')) { storage.set('desk_items', null); location.reload(); } }, hist: () => E.ebOpenUrl('about:history', true), marks: () => E.ebOpenUrl('about:bookmarks', true), dom: () => { E.domingo(); setTimeout(() => { const c = $('#win-assistant [data-cfg]'); if (c) c.click(); }, 120); }, guide: () => $('#cfg-btn-guide').click(), lock }[d.dataset.do] || (() => {}))();
  });
  function go(k) { sb.querySelectorAll('[data-sec]').forEach(b => b.classList.toggle('on', b.dataset.sec === k)); main.querySelectorAll('.cfg-sec').forEach(x => x.hidden = x.dataset.s !== k); main.scrollTop = 0; storage.set('cfg_sec', k); }
  E.settingsGo = go; go(storage.get('cfg_sec', 'env')); applyOpts();
  sw.style.width = Math.min(860, innerWidth - 20) + 'px'; sw.style.height = Math.min(600, innerHeight - 70) + 'px';

  /* ---------- Atajos de teclado globales ---------- */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' || (e.altKey && e.code === 'Space')) { e.preventDefault(); html.dataset.env === 'linux' ? openLauncher() : (startMenu.classList.contains('open') ? E.closeFlyouts() : openStart()); }
    if (e.key === 'Escape') { if (!lx.hidden) closeLauncher(); }
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'l') { e.preventDefault(); lock(); }
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); E.domingo(); }
  });
  document.addEventListener('keyup', e => { if (e.key === 'Meta' && !e.ctrlKey && !e.altKey && !e.shiftKey && document.activeElement === document.body) { html.dataset.env === 'linux' ? (lx.hidden ? openLauncher() : closeLauncher()) : (startMenu.classList.contains('open') ? E.closeFlyouts() : openStart()); } });

  /* ---------- Terminal: nuevos comandos ---------- */
  const C = E.termCmds;
  if (C) Object.assign(C, {
    envmode: ['Cambia de entorno (envmode linux|windows)', a => { if (!/^(linux|windows)$/.test(a[0] || '')) return 'Uso: envmode linux|windows · actual: ' + html.dataset.env; setEnv(a[0]); return 'Entorno: ' + a[0]; }],
    store: ['Busca en EISEN Store (store texto)', (a, r) => { E.storeSearch(r.replace(/^store\s*/i, '')); return 'Abriendo EISEN Store…'; }],
    install: ['Instala una app (install id)', a => { const x = E.findApp(a.join(' ')); if (!x) return 'No existe esa app'; E.setInstalled(x.id, true); return 'Instalada: ' + x.name; }],
    uninstall: ['Desinstala una app (uninstall id)', a => { const x = E.findApp(a.join(' ')); if (!x) return 'No existe esa app'; if (E.CORE_APPS.includes(x.id)) return 'Es una app del sistema'; E.setInstalled(x.id, false); return 'Desinstalada: ' + x.name; }],
    domingo: ['Pregunta al asistente (domingo texto)', (a, r) => { E.domingo(r.replace(/^domingo\s*/i, '')); return 'Domingo está respondiendo en su ventana…'; }],
    play: ['Abre un juego (play bloques)', a => { const g = (E.GAMES || []).find(x => x.id === a[0] || x.name.toLowerCase().includes((a.join(' ') || '').toLowerCase())); if (!g) return 'Juegos: ' + E.GAMES.map(x => x.id).join(', '); E.playGame(g.id); return 'Jugando ' + g.name; }],
    note: ['Crea una nota (note texto)', (a, r) => { const t = r.replace(/^note\s*/i, ''); if (!t) return 'Uso: note <texto>'; E.addNote(t.slice(0, 40), t); return 'Nota creada'; }],
    todo: ['Añade una tarea (todo texto)', (a, r) => { const t = r.replace(/^todo\s*/i, ''); if (!t) return 'Uso: todo <texto>'; E.addTask(t); return 'Tarea añadida'; }],
    lock: ['Bloquea la pantalla', () => { lock(); return ''; }],
    mkfolder: ['Crea una carpeta en el escritorio', (a, r) => { E.desktopNewFolder(r.replace(/^mkfolder\s*/i, '') || 'Nueva carpeta'); return 'Carpeta creada en el escritorio'; }]
  });
  if (C && C.neofetch) C.neofetch[1] = () => `  ▗▄▄▄▖ ▗▄▄▄▖     OS: ${(window.EISENKU && EISENKU.label) || 'EISENKU OS'} (${html.dataset.env === 'linux' ? 'entorno Linux' : 'entorno Windows'})\n  ▐█▀▀▘ ▐█▀▀▘     Kernel: HTML5 / ES2020\n  ▐█▄▄▖ ▐█▄▄▖     Apps: ${E.installedApps().length} instaladas · ${(E.GAMES || []).length} juegos\n  ▐█▀▀▘ ▐█▀▀▘     Asistente: Maestro Domingo\n  ▐█▄▄▄▖▐█▄▄▄▖    CPU: ${navigator.hardwareConcurrency || '?'} núcleos · RAM ~${navigator.deviceMemory || '?'} GB`;

  /* ---------- Notificaciones: respetar No molestar ---------- */
  const _n = E.notify; E.notify = (t, b, i, ms) => { if (storage.get('dnd', false)) { const log = storage.get('notif_log', []); log.unshift({ title: t, body: b, icon: i || '🔔', d: Date.now() }); storage.set('notif_log', log.slice(0, 80)); document.dispatchEvent(new CustomEvent('eisen:notify')); return; } _n(t, b, i, ms); };

  /* ---------- Inicio ---------- */
  setEnv(storage.get('env', 'windows'), true);
  renderStart();
  // Xbox y pantallas táctiles: objetivos más grandes
  if (/Xbox/i.test(navigator.userAgent)) html.classList.add('xbox');
  if (matchMedia('(pointer:coarse)').matches) html.classList.add('touch');
})();

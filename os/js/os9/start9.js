/* =====================================================================
   EISENKU OS 9.0 ENTERPRISE · Arranque del sistema
   - Asistente de configuración inicial (idioma, escritorio, tema y perfil).
   - Tutoriales interactivos sobre la interfaz real (K.tour / K.TUTORIALS).
   - Inicio de sesión al arrancar, apps de inicio, restauración de ventanas y modo seguro.
   - Modo sin conexión (Service Worker), avisos de actualización y ahorro de datos.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, $ = K.$, $$ = K.$$;
  const html = document.documentElement;
  const isLinux = () => html.dataset.env === 'linux';
  const vis = el => !!el && el.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden]');
  const pick = (...sels) => { for (const s of sels) { const el = typeof s === 'function' ? s() : $(s); if (vis(el)) return el; } return null; };

  /* ---------- Modo seguro (una sola vez, desde Herramientas de mantenimiento) ---------- */
  let safe = /[?&]safe(=1)?(&|$)/.test(location.search); try { safe = safe || sessionStorage.getItem('eisenku_safe') === '1'; sessionStorage.removeItem('eisenku_safe'); } catch { /* sin sessionStorage */ }   // también con ?safe=1 en la dirección
  K.safeMode = safe;
  const firstRun = !S.get('os9_welcome', '');
  if (firstRun) S.set('guide_seen', true); // el asistente 9.0 sustituye a la guía de 8.0 (sigue disponible en Configuración)

  /* ---------- Disposición de ventanas (sesiones) ---------- */
  K.layout = {
    capture() { return $$('.window.open').map(w => ({ id: w.id.slice(4), l: w.style.left, t: w.style.top, w: w.style.width, h: w.style.height, max: w.classList.contains('maximized'), min: w.classList.contains('minimized'), desk: +w.dataset.desk || 0 })).filter(x => x.id && x.id !== 'sessions'); },
    async restore(wins) {
      for (const x of wins || []) {
        if (!E.REG[x.id] && !document.getElementById('win-' + x.id)) continue;
        if (E.REG[x.id] && E.isInstalled && !E.isInstalled(x.id)) continue;
        try { E.launch(x.id); } catch { continue; }
        await new Promise(r => setTimeout(r, 80));
        const w = document.getElementById('win-' + x.id); if (!w) continue;
        if (!x.max && x.w) Object.assign(w.style, { left: x.l, top: x.t, width: x.w, height: x.h });
        if (x.max && !w.classList.contains('maximized')) { const m = w.querySelector('[data-act="max"]'); if (m) m.click(); }
        if (x.desk) w.dataset.desk = x.desk;
        if (x.min) { const m = w.querySelector('[data-act="min"]'); if (m) m.click(); }
      }
      if (K.desks) K.desks.apply();
    }
  };
  window.addEventListener('pagehide', () => { if (!K.safeMode) { try { S.set('os9_layout_last', K.layout.capture()); } catch { /* ignorar */ } } });

  /* ---------- Tutoriales interactivos ---------- */
  let tourEl = null;
  K.tour = (t, start = 0) => {
    if (tourEl) tourEl.close();
    let i = start, timer = null, raf = 0;
    const box = K.ui.el('div', { class: 's9-tour', role: 'dialog', 'aria-live': 'polite', 'aria-label': tr(t.title) });
    const spot = K.ui.el('div', { class: 's9-tour-spot' });
    document.body.append(spot, box);
    const close = () => { clearInterval(timer); cancelAnimationFrame(raf); box.remove(); spot.remove(); window.removeEventListener('keydown', key, true); tourEl = null; };
    const key = e => { if (e.key === 'Escape' && !$('.eis-modal')) { e.stopPropagation(); close(); } };
    window.addEventListener('keydown', key, true);
    function place() {
      const s = t.steps[i]; if (!s) return;
      const el = s.sel ? pick(...[].concat(s.sel)) : null;
      if (el) {
        const r = el.getBoundingClientRect(), pad = 6;
        Object.assign(spot.style, { display: 'block', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
        const bw = box.offsetWidth, bh = box.offsetHeight; let x = r.left + r.width / 2 - bw / 2, y = r.bottom + 14;
        if (y + bh > innerHeight - 8) y = r.top - bh - 14; if (y < 8) y = Math.min(innerHeight - bh - 8, r.bottom + 14);
        box.style.left = Math.max(8, Math.min(innerWidth - bw - 8, x)) + 'px'; box.style.top = Math.max(8, y) + 'px';
      } else { spot.style.display = 'none'; box.style.left = (innerWidth - box.offsetWidth) / 2 + 'px'; box.style.top = Math.max(8, innerHeight * 0.3) + 'px'; }
      raf = requestAnimationFrame(place);
    }
    function show() {
      clearInterval(timer); const s = t.steps[i];
      if (!s) { close(); E.toast('✓ ' + tr('Tutorial completado') + ': ' + tr(t.title)); K.activity('tour', 'welcome', t.title); const d = S.get('os9_tours_done', []) || []; if (!d.includes(t.id)) S.set('os9_tours_done', d.concat(t.id)); return; }
      if (s.do) { try { s.do(); } catch { /* ignorar */ } }
      box.innerHTML = `<div class="s9-tour-h"><b>${esc(tr(t.title))}</b><small>${i + 1}/${t.steps.length}</small></div><p>${esc(tr(typeof s.text === 'function' ? s.text() : s.text))}</p>${s.wait ? `<p class="s9-tour-wait">${I('target', 13)} ${esc(tr('Hazlo tú: el tutorial avanzará solo.'))}</p>` : ''}<div class="s9-tour-b"><button class="k9-btn" data-x>${esc(tr('Salir'))}</button><span style="flex:1"></span>${i ? `<button class="k9-btn" data-prev>${esc(tr('Atrás'))}</button>` : ''}<button class="k9-btn pri" data-next>${esc(tr(s.wait ? 'Saltar paso' : i === t.steps.length - 1 ? 'Terminar' : 'Siguiente'))}</button></div>`;
      if (s.wait) timer = setInterval(() => { try { if (s.wait()) { i++; show(); } } catch { /* ignorar */ } }, 300);
      setTimeout(() => { const n = box.querySelector('[data-next]'); if (n && !s.wait) n.focus({ preventScroll: true }); }, 50);
    }
    box.addEventListener('click', e => { if (e.target.closest('[data-x]')) close(); else if (e.target.closest('[data-next]')) { i++; show(); } else if (e.target.closest('[data-prev]')) { i = Math.max(0, i - 1); show(); } });
    tourEl = { close }; show(); place();
    return tourEl;
  };
  const winCount = () => $$('.window.open').length;
  let base = 0;
  K.TUTORIALS = [
    { id: 'apps', icon: 'grid', title: 'Abrir apps y manejar ventanas', desc: 'Menú de aplicaciones, ventanas y barra de tareas', steps: [
      { sel: ['#tb-start-trigger', '#lx-panel [data-lx="apps"]'], text: () => isLinux() ? 'Pulsa «Aplicaciones» para abrir el lanzador.' : 'Pulsa el botón de inicio para abrir el menú.', wait: () => vis($('#start-menu-panel.open')) || vis($('#s9-appmenu')), do: () => { base = winCount(); } },
      { sel: ['#start-menu-panel.open #start-search-input', '#s9-appmenu input', '#s9-appmenu'], text: 'Escribe el nombre de una app (por ejemplo «Notas») y ábrela.', wait: () => winCount() > base },
      { sel: [() => { const w = $$('.window.open').sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0]; return w && w.querySelector('.window-header'); }], text: 'Arrastra la barra de título para mover la ventana. Doble clic la maximiza; arrástrala a un borde para ajustarla a media pantalla.' },
      { sel: [() => { const w = $$('.window.open').sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0))[0]; return w && w.querySelector('.window-controls'); }], text: 'Minimiza, maximiza o cierra la ventana. Los bordes y esquinas sirven para cambiar su tamaño.' },
      { sel: ['#taskbar'], text: () => isLinux() ? 'El dock muestra las apps abiertas y fijadas. Pulsa una para traerla al frente o minimizarla.' : 'La barra de tareas muestra las apps abiertas. Pulsa una para traerla al frente o minimizarla.' }
    ] },
    { id: 'desks', icon: 'layers', title: 'Escritorios virtuales y vista general', desc: 'Organiza tus ventanas en varios escritorios', steps: [
      { sel: ['#s9-taskview', '#lx-panel [data-lx="act"]'], text: () => isLinux() ? 'Pulsa «Actividades» (o Ctrl+Alt+↑).' : 'Pulsa el botón de vista de tareas (o Ctrl+Alt+↑).', wait: () => vis($('#s9-overview')) },
      { sel: ['#s9-overview'], text: 'Aquí ves todas las ventanas y escritorios. Arrastra una ventana a otro escritorio o crea uno nuevo. Ctrl+Alt+← y → cambian de escritorio.' },
      { sel: ['#s9-overview'], text: 'Pulsa Esc o elige una ventana para salir.', wait: () => !vis($('#s9-overview')) }
    ] },
    { id: 'files', icon: 'folder', title: 'Guardar y encontrar archivos', desc: 'Carpetas, búsqueda, papelera e importación', steps: [
      { text: 'Vamos a abrir Archivos, el explorador de EISENKU.', do: () => E.launch('explorer') },
      { sel: ['#win-explorer [data-a="newdir"]'], text: 'Crea carpetas y subcarpetas aquí. También puedes importar archivos o carpetas completas de tu dispositivo.' },
      { sel: ['#win-explorer .fm9-search'], text: 'Busca por nombre en la carpeta actual y sus subcarpetas.' },
      { sel: ['#win-explorer .k9-side'], text: 'Accesos rápidos: Documentos, Imágenes, Música, Vídeos, Descargas, favoritos y la Papelera, desde donde puedes restaurar lo que borres.' },
      { text: 'Consejo: con clic derecho (o pulsación larga) sobre un archivo tienes Abrir con, Renombrar, Copiar, Mover, Comprimir en ZIP y Propiedades.' }
    ] },
    { id: 'env', icon: 'monitor', title: 'Cambiar entre Linux Mode y Windows Mode', desc: 'Dos escritorios completos con los mismos datos', steps: [
      { text: 'Abrimos Configuración › Entorno.', do: () => { base = html.dataset.env; E.launch('settings', 'env'); } },
      { sel: ['#win-settings [data-envpick="linux"]', '#win-settings [data-envpick]'], text: () => isLinux() ? 'Elige Windows Mode.' : 'Elige Linux Mode.', wait: () => html.dataset.env !== base },
      { text: 'Listo: cambia la organización completa de la interfaz, pero tus apps, archivos y ajustes son los mismos. Puedes volver cuando quieras.' }
    ] },
    { id: 'search', icon: 'search', title: 'Búsqueda global y atajos', desc: 'Encuentra apps, archivos, ajustes y pestañas', steps: [
      { text: 'Abrimos la búsqueda global (también con Ctrl+K).', do: () => K.search && K.search.toggle && !vis($('#s9-search')) && K.search.toggle() },
      { sel: ['#s9-search'], text: 'Escribe el nombre de una app, archivo, ajuste, pestaña abierta o un cálculo. Usa ↑ ↓ e Intro. Pulsa Esc para cerrar.', wait: () => !vis($('#s9-search')) },
      { text: 'Puedes ver y cambiar todos los atajos de teclado en Configuración › Accesibilidad › Atajos. F1 abre la ayuda de la app activa.' }
    ] },
    { id: 'nc', icon: 'bell', title: 'Notificaciones y ajustes rápidos', desc: 'Calendario, avisos, sonido, brillo y modo concentración', steps: [
      { sel: ['#systray-clock', '#lx-panel [data-lx="cal"]'], text: 'Pulsa el reloj para abrir notificaciones y calendario.', wait: () => vis($('#s9-nc.open')) },
      { sel: ['#s9-nc'], text: 'Aquí están tus notificaciones (puedes silenciar apps) y el calendario del mes.' },
      { sel: ['#systray-quick-btn', '#lx-panel .lx-right'], text: 'Y aquí los ajustes rápidos: volumen, brillo, modo concentración, luz nocturna y más.', do: () => E.closeFlyouts && E.closeFlyouts() }
    ] }
  ];

  /* ---------- Asistente de configuración inicial ---------- */
  K.welcomeWizard = (force) => {
    if ($('#s9-welcome')) return;
    const L = (window.EISEN_I18N && window.EISEN_I18N.langs) || { es: 'Español' };
    const me = K.profiles.current();
    const st = { step: 0, lang: (window.EISEN_I18N && window.EISEN_I18N.lang) || 'es', env: html.dataset.env || 'windows', theme: 'noir', name: me.name || S.get('user_name', '') || '', pin: '' };
    const THEMES = [['noir', 'EISENKU Noir', 'dark', '#2a9d76', 'e9-noir'], ['rose', 'Rosé Graphite', 'dark', '#c93a73', 'e9-rose'], ['aurora', 'Aurora Enterprise', 'dark', '#34a582', 'e9-aurora'], ['porcelain', 'Porcelana (claro)', 'light', '#1f8160', 'e9-porcelain']];
    const ov = K.ui.el('div', { id: 's9-welcome', role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Configuración inicial') });
    document.body.appendChild(ov);
    const steps = ['lang', 'env', 'theme', 'profile', 'done'];
    function draw() {
      const k = steps[st.step], dots = steps.map((x, j) => `<i class="${j <= st.step ? 'on' : ''}"></i>`).join('');
      let body = '';
      if (k === 'lang') body = `<h2>${esc(K.updatedFrom ? tr('EISENKU OS se ha actualizado a') + ' 10.0 ' + K.edition : tr('Te damos la bienvenida a EISENKU OS'))}</h2><p>${esc(tr(K.updatedFrom ? 'Tus archivos, apps y ajustes se han conservado. Revisemos unos detalles en menos de un minuto.' : 'Vamos a dejarlo a tu gusto en menos de un minuto. Podrás cambiarlo todo después en Configuración.'))}</p><label class="k9-field">${esc(tr('Idioma'))}<select class="input-text" data-lang>${Object.entries(L).map(([c, n]) => `<option value="${c}"${c === st.lang ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
      if (k === 'env') body = `<h2>${esc(tr('Elige tu escritorio'))}</h2><p>${esc(tr('Son dos interfaces completas con los mismos datos. Puedes cambiar en cualquier momento.'))}</p><div class="s9-wz-envs"><button class="s9-wz-env${st.env === 'windows' ? ' on' : ''}" data-wzenv="windows"><span class="s9-wz-prev win"><i></i></span><b>Windows Mode</b><small>${esc(tr('Barra de tareas abajo, menú Inicio y bandeja del sistema.'))}</small></button><button class="s9-wz-env${st.env === 'linux' ? ' on' : ''}" data-wzenv="linux"><span class="s9-wz-prev lin"><i></i></span><b>Linux Mode</b><small>${esc(tr('Panel superior, Actividades, lanzador de apps y dock.'))}</small></button></div>`;
      if (k === 'theme') body = `<h2>${esc(tr('Aspecto'))}</h2><p>${esc(tr('Elige un tema. Hay más temas, colores y fondos en Configuración › Apariencia.'))}</p><div class="s9-wz-themes">${THEMES.map(t => `<button class="s9-wz-theme${st.theme === t[0] ? ' on' : ''}" data-wztheme="${t[0]}"><span class="s9-wz-sw" style="--a:${t[3]}" data-tone="${t[2]}"></span>${esc(tr(t[1]))}</button>`).join('')}</div>`;
      if (k === 'profile') body = `<h2>${esc(tr('Tu perfil'))}</h2><p>${esc(tr('El nombre aparece en el inicio de sesión. El PIN es opcional y protege tu escritorio en este dispositivo.'))}</p><label class="k9-field">${esc(tr('Nombre'))}<input class="input-text" data-name maxlength="32" value="${esc(st.name)}" placeholder="Eisen"></label><label class="k9-field">${esc(tr('PIN (opcional, 4 a 12 cifras)'))}<input class="input-text" data-pin type="password" inputmode="numeric" maxlength="12" autocomplete="new-password" value="${esc(st.pin)}"></label><p class="k9-small k9-muted">${esc(tr('El PIN se guarda cifrado (PBKDF2). Tras 5 intentos fallidos se bloquea temporalmente.'))}</p>`;
      if (k === 'done') body = `<h2>${esc(tr('¡Todo listo!'))}</h2><p>${esc(tr('¿Quieres un recorrido rápido? Te enseñamos a abrir apps y manejar ventanas sobre la interfaz real.'))}</p><div class="s9-wz-final"><button class="k9-btn pri" data-fin="tour">${I('target', 15)} ${esc(tr('Hacer el recorrido'))}</button><button class="k9-btn" data-fin="handbook">${I('book', 15)} ${esc(tr('Abrir el Handbook'))}</button><button class="k9-btn" data-fin="welcome">${I('sparkle', 15)} ${esc(tr('Centro de bienvenida'))}</button><button class="k9-btn" data-fin="close">${esc(tr('Empezar a usar EISENKU'))}</button></div>`;
      ov.innerHTML = `<div class="s9-wz"><div class="s9-wz-side"><img src="icon.svg" width="54" height="54" alt=""><b>EISEN OS</b><span>${esc(String(K.version).split('.').slice(0, 2).join('.'))} ${esc(K.edition)}</span><div class="s9-wz-dots">${dots}</div></div><div class="s9-wz-main"><div class="s9-wz-body">${body}<p class="k9-small k9-bad" data-err></p></div><div class="s9-wz-nav">${k !== 'done' ? `<button class="k9-btn" data-skip>${esc(tr('Omitir'))}</button>` : ''}<span style="flex:1"></span>${st.step && k !== 'done' ? `<button class="k9-btn" data-back>${esc(tr('Atrás'))}</button>` : ''}${k !== 'done' ? `<button class="k9-btn pri" data-next>${esc(tr('Continuar'))}</button>` : ''}</div></div></div>`;
      const f = ov.querySelector('select, input, [data-next], [data-fin]'); if (f) setTimeout(() => f.focus(), 60);
    }
    const applyTheme = t => { const s = $('#cfg-theme'); if (s) { s.value = t[2]; s.dispatchEvent(new Event('change')); } const a = $('#cfg-accent'); if (a) { a.value = t[3]; a.dispatchEvent(new Event('input')); } if (E.setWp) E.setWp(t[4]); };
    const finish = () => { S.set('os9_welcome', 'done'); S.set('guide_seen', true); ov.classList.add('out'); setTimeout(() => ov.remove(), 260); K.activity('system', 'welcome', 'Configuración inicial completada'); };
    async function next() {
      const k = steps[st.step], err = ov.querySelector('[data-err]');
      if (k === 'profile') {
        st.name = (ov.querySelector('[data-name]').value || '').trim().slice(0, 32); st.pin = ov.querySelector('[data-pin]').value.trim();
        if (st.pin && !/^\d{4,12}$/.test(st.pin)) { err.textContent = tr('El PIN debe tener entre 4 y 12 cifras.'); return; }
        if (st.name) { K.profiles.update(K.profileId, { name: st.name }); S.set('user_name', st.name); }
        if (st.pin) { await K.profiles.setPin(K.profileId, st.pin); K.seclog('account', 'PIN configurado en el asistente inicial'); }
      }
      st.step = Math.min(steps.length - 1, st.step + 1); draw();
    }
    ov.addEventListener('change', e => { if (e.target.matches('[data-lang]')) { st.lang = e.target.value; if (window.EISEN_I18N) window.EISEN_I18N.setLang(st.lang); draw(); } });
    ov.addEventListener('click', e => {
      const t = e.target;
      const en = t.closest('[data-wzenv]'); if (en) { st.env = en.dataset.wzenv; if (E.setEnv) E.setEnv(st.env, true); draw(); return; }
      const th = t.closest('[data-wztheme]'); if (th) { st.theme = th.dataset.wztheme; applyTheme(THEMES.find(x => x[0] === st.theme)); draw(); return; }
      if (t.closest('[data-next]')) { next(); return; }
      if (t.closest('[data-back]')) { st.step = Math.max(0, st.step - 1); draw(); return; }
      if (t.closest('[data-skip]')) { finish(); return; }
      const fin = t.closest('[data-fin]'); if (fin) { finish(); const v = fin.dataset.fin; setTimeout(() => { if (v === 'tour') K.tour(K.TUTORIALS[0]); if (v === 'handbook') E.launch('handbook'); if (v === 'welcome') E.launch('welcome'); }, 320); }
    });
    ov.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.target.matches('button, select')) { e.preventDefault(); next(); } });
    draw(); void force;
  };

  /* ---------- Secuencia de arranque ---------- */
  function boot() {
    html.classList.toggle('data-saver', !!K.pref('dataSaver'));
    // inicio de sesión: con PIN se pide SIEMPRE (salvo justo después de cambiar de usuario, ya verificado)
    const mode = K.pref('loginScreen') || 'auto', list = K.profiles.list(), me = K.profiles.current();
    let just = 0; try { just = +K._get('eisenku_sys_justswitched', 0) || 0; if (just) K._set('eisenku_sys_justswitched', 0); } catch { /* ignorar */ }
    const need = !!me.pin || mode === 'always' || (mode === 'auto' && list.length > 1);
    if (need && Date.now() - just > 30000 && K.login && !firstRun) K.login.show('boot');
    if (firstRun && !S.get('guide_force', false)) setTimeout(() => K.welcomeWizard(), 400);
    if (K.safeMode) { E.notify(tr('Modo seguro'), tr('EISENKU se ha iniciado sin apps de inicio ni ventanas restauradas. Recarga para volver al modo normal.'), '🛟', 9000); K.seclog('system', 'Inicio en modo seguro'); }
    else {
      const startup = (S.get('os9_startup', []) || []).filter(id => E.REG[id] && (!E.isInstalled || E.isInstalled(id)));
      const dly = Math.max(0, Math.min(120, +S.get('os10_startup_delay', 0) || 0)) * 1000; K.startupPlan = { apps: startup.slice(), delay: dly, at: Date.now() };   // 10.0: retardo configurable (Administrador de inicio)
      startup.forEach((id, i) => setTimeout(() => { try { E.launch(id); if (K.log) K.log('info', 'startup', 'App de inicio abierta: ' + ((E.REG[id] || {}).name || id)); } catch { /* ignorar */ } }, 600 + dly + i * 300));
      if (K.pref('restoreLayout')) { const l = S.get('os9_layout_last', []) || []; if (l.length) setTimeout(() => K.layout.restore(l.filter(x => !startup.includes(x.id))), 700 + dly + startup.length * 300); }
    }
    // punto de restauración al actualizar (además, cada migración de datos guarda los valores anteriores y se puede revertir)
    if (K.updatedFrom && S.get('os9_upd_snap', '') !== K.version && K.backup && K.backup.snapshot) { S.set('os9_upd_snap', K.version); K.backup.snapshot('Actualización a ' + K.version + ' desde ' + K.updatedFrom).catch(() => {}); }
    if (K.updatedFrom && !S.get('os9_upd_noticed', false)) { S.set('os9_upd_noticed', true); setTimeout(() => E.notify(K.label, tr('Actualizado desde la versión') + ' ' + K.updatedFrom + '. ' + tr('Tus datos se han conservado. Mira las novedades en el Centro de actualizaciones.'), '⬆️', 9000), 1500); }
    // comprobación semanal de versión en TU servidor (nunca descarga ni instala nada por sí sola)
    const last = +S.get('os9_upd_check', 0) || 0;
    if (!K.pref('dataSaver') && /^https?:$/.test(location.protocol) && Date.now() - last > 7 * 864e5) setTimeout(() => K.updates.check().then(r => { if (r.ok && r.newer) E.notify(tr('Actualización disponible'), tr('Tu servidor tiene EISENKU OS') + ' ' + r.remote + '. ' + tr('Recarga para usarla (se crea antes un punto de restauración desde el Centro de actualizaciones).'), '⬆️', 10000); }), 8000);
    // modo sin conexión: solo con http(s) (no al abrir index.html como archivo)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && K.pref('offline') !== false) navigator.serviceWorker.register('sw.js').catch(e => K.seclog('system', 'Service Worker no registrado: ' + e.message));
    // recordatorios del Organizador académico (una vez al día por tarea: el día anterior y el mismo día)
    const remind = () => { try { const A = S.get('a9_academic', null); if (!A || !Array.isArray(A.tasks)) return; const d0 = new Date(), iso = x => new Date(x.getTime() - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10), today = iso(d0), tomorrow = iso(new Date(d0.getTime() + 864e5)), sent = S.get('os9_acad_sent', {}) || {}; A.tasks.filter(t => !t.done && (t.due === today || t.due === tomorrow)).forEach(t => { const k = t.id + '|' + today; if (sent[k]) return; sent[k] = 1; const s = (A.subjects || []).find(x => x.id === t.sid) || {}; E.notify((t.type === 'examen' ? '📝 ' : '📎 ') + (t.due === today ? tr('Hoy') : tr('Mañana')) + ': ' + t.title, (s.name || '') + (t.time ? ' · ' + t.time : ''), '🎓', 9000); }); Object.keys(sent).forEach(k => { if (!k.endsWith(today)) delete sent[k]; }); S.set('os9_acad_sent', sent); } catch { /* ignorar */ } };
    setTimeout(remind, 5000); setInterval(remind, 30 * 60000);
    K.bootMs = Math.round(performance.now());
  }
  // F1: ayuda contextual de la app activa
  window.addEventListener('keydown', e => { if (e.key === 'F1' && !e.ctrlKey && !e.altKey) { e.preventDefault(); const id = K.activeApp ? K.activeApp() : null; if (K.help) K.help(id && id !== 'desktop' ? id : null); } });
  if (document.readyState === 'complete') setTimeout(boot, 30); else window.addEventListener('load', () => setTimeout(boot, 30), { once: true });
})();

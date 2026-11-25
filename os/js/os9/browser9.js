/* =====================================================================
   EISENKU OS 9.0 ENTERPRISE · Navegador EISEN (ampliación profesional)
   Sobre el navegador de 8.0 (app.js) añade: información del sitio y permisos por sitio,
   buscador configurable, página de inicio, descargas registradas, reapertura de pestañas,
   ventanas emergentes controladas, modo oscuro forzado, explicación honesta de la navegación
   privada, más atajos y un menú ampliado. No desactiva protecciones del navegador.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, $ = K.$, $$ = K.$$, tr = K.tr, I = K.icon;
  const B = E.eb; const win = $('#win-browser'); if (!B || !win) return;
  const hostOf = u => { try { return new URL(u).hostname; } catch { return ''; } };

  /* ---------- permisos por sitio ---------- */
  const SP = ['camera', 'microphone', 'geolocation', 'clipboard-read', 'display-capture', 'midi'];
  const SPN = { camera: 'Cámara', microphone: 'Micrófono', geolocation: 'Ubicación', 'clipboard-read': 'Leer el portapapeles', 'display-capture': 'Capturar la pantalla', midi: 'Dispositivos MIDI' };
  const perms = () => S.get('os9_siteperms', {}) || {};
  E.ebSitePerms = h => (perms()[h] || []).filter(p => SP.includes(p));
  function setSitePerm(h, p, on) { const m = perms(), l = new Set(m[h] || []); on ? l.add(p) : l.delete(p); if (l.size) m[h] = [...l]; else delete m[h]; S.set('os9_siteperms', m); K.seclog('perm', `${on ? 'Concedido' : 'Revocado'} «${tr(SPN[p])}» al sitio ${h}`); }

  /* ---------- buscador configurable ---------- */
  const ENG = { google: ['Google', 'https://www.google.com/search?q=%s&igu=1'], bing: ['Bing', 'https://www.bing.com/search?q=%s'], ddg: ['DuckDuckGo', 'https://html.duckduckgo.com/html/?q=%s'], startpage: ['Startpage', 'https://www.startpage.com/do/search?q=%s'], ecosia: ['Ecosia', 'https://www.ecosia.org/search?q=%s'], brave: ['Brave Search', 'https://search.brave.com/search?q=%s'], wikipedia: ['Wikipedia', 'https://es.wikipedia.org/w/index.php?search=%s'] };
  const DEF = {}; Object.entries(B.browsers).forEach(([k, v]) => { DEF[k] = { engine: v.engine, search: v.search }; });
  function applyEngine() {
    const e = K.pref('searchEngine');
    if (e === 'eisen') S.set('search_native', true);
    else S.set('search_native', false);
    Object.entries(B.browsers).forEach(([k, v]) => { if (ENG[e]) { v.engine = ENG[e][0]; v.search = ENG[e][1]; } else { v.engine = DEF[k].engine; v.search = DEF[k].search; } });
    if (B.state.ready) B.render();
  }
  K.on('pref', x => { if (x && x.k === 'searchEngine') applyEngine(); if (x && x.k === 'forceDark') dark(); });
  if (K.pref('searchEngine') !== 'eisen') applyEngine();

  /* ---------- barra: botón de información del sitio + menú ampliado ---------- */
  const tb = win.querySelector('.eb-toolbar'), omni = $('#nav-url-input');
  const siteBtn = K.ui.el('button', { class: 'eb-btn', id: 'nav-btn-site', title: tr('Información del sitio y permisos'), 'aria-label': tr('Información del sitio') }, I('shield', 15));
  omni.before(siteBtn);
  const pop = K.ui.el('div', { class: 'eb9-pop', hidden: '' }); win.appendChild(pop);
  siteBtn.onclick = e => { e.stopPropagation(); pop.hidden ? sitePanel() : (pop.hidden = true); };
  window.addEventListener('pointerdown', e => { if (!pop.hidden && !e.target.closest('.eb9-pop,#nav-btn-site,.eis-modal')) pop.hidden = true; }, true);
  function sitePanel() {
    const t = B.cur(); if (!t) return;
    const h = hostOf(t.url), web = /^https?:/i.test(t.url), sec = /^https:/i.test(t.url);
    const mode = { direct: tr('Directo'), server: tr('Proxy de EISENKU (aislado)'), compat: tr('Compatibilidad (aislado)'), adapter: tr('Adaptador integrado'), local: tr('Página interna'), auto: tr('Automático') }[t.eff || 'local'] || t.eff;
    const priv = B.state.cur === 'priv';
    pop.innerHTML = web ? `<div class="eb9-ph"><b>${esc(h)}</b><button class="k9-btn" data-x>✕</button></div>
      <div class="k9-row k9-small" style="margin:6px 0"><span class="k9-dot ${sec ? 'g' : 'd'}"></span>${esc(sec ? tr('Conexión cifrada (HTTPS)') : tr('Conexión NO cifrada: no escribas contraseñas'))}</div>
      <div class="k9-small k9-muted">${esc(tr('Modo de carga'))}: ${esc(mode)}${priv ? ' · 🕶️ ' + esc(tr('privado')) : ''}</div>
      <h5>${esc(tr('Permisos de este sitio'))}</h5>${SP.map(p => `<label class="eb9-perm"><span>${esc(tr(SPN[p]))}</span><input type="checkbox" class="k9-switch" data-sp="${p}" ${E.ebSitePerms(h).includes(p) ? 'checked' : ''}></label>`).join('')}
      <p class="k9-small k9-muted" style="margin:6px 0">${esc(tr('Solo funcionan en modo Directo: el navegador además te pedirá confirmación. Las páginas en modo aislado no reciben estos permisos.'))}</p>
      <div class="k9-row"><button class="k9-btn" data-clr>${I('trash', 13)} ${esc(tr('Borrar datos del sitio'))}</button><button class="k9-btn" data-ext>${I('external', 13)} ${esc(tr('Pestaña real'))}</button></div>`
      : `<div class="eb9-ph"><b>${esc(tr('Página interna de EISENKU'))}</b><button class="k9-btn" data-x>✕</button></div><p class="k9-small k9-muted">${esc(tr('Esta página la genera EISENKU y no se conecta a ningún sitio.'))}</p>`;
    pop.hidden = false;
  }
  pop.addEventListener('click', e => {
    const t = B.cur(), h = hostOf(t && t.url);
    if (e.target.closest('[data-x]')) { pop.hidden = true; return; }
    if (e.target.closest('[data-ext]')) { window.open(t.url, '_blank', 'noopener'); return; }
    if (e.target.closest('[data-clr]')) { const st = S.get('eb_store', {}) || {}; delete st[h]; Object.keys(st).forEach(k => { if (k.split(':')[0] === h) delete st[k]; }); S.set('eb_store', st); const sm = S.get('site_mode', {}) || {}; delete sm[h]; S.set('site_mode', sm); const p = perms(); delete p[h]; S.set('os9_siteperms', p); E.ebClearCache(); E.toast(tr('Datos del sitio borrados')); K.seclog('privacy', 'Datos borrados del sitio ' + h); sitePanel(); }
  });
  pop.addEventListener('change', e => { const c = e.target.closest('[data-sp]'); if (!c) return; const t = B.cur(), h = hostOf(t.url); setSitePerm(h, c.dataset.sp, c.checked); E.toast(tr('Se aplicará al recargar la página')); B.load(t); B.render(); });

  // menú ⋮ ampliado
  const menu = $('#eb-menu');
  menu.insertAdjacentHTML('beforeend', `<div class="eb9-sep"></div><button data-m9="reopen">↺ ${esc(tr('Reabrir pestaña cerrada'))} <kbd>Ctrl+Shift+T</kbd></button><button data-m9="downloads">⬇ ${esc(tr('Descargas'))} <kbd>Ctrl+J</kbd></button><button data-m9="bookmarks">🔖 ${esc(tr('Administrar marcadores'))} <kbd>Ctrl+Shift+B</kbd></button><button data-m9="tabs">🗃 ${esc(tr('Administrador de pestañas'))}</button><button data-m9="site">🛡 ${esc(tr('Información del sitio y permisos'))}</button><button data-m9="private">🕶 ${esc(tr('Navegación privada'))} <kbd>Ctrl+Shift+N</kbd></button><button data-m9="settings">⚙ ${esc(tr('Configuración del navegador'))}</button>`);
  menu.addEventListener('click', e => { const b = e.target.closest('[data-m9]'); if (!b) return; menu.hidden = true; ({ reopen, downloads: () => E.launch('downloads'), bookmarks: () => E.launch('bookmarks'), tabs: () => E.launch('tabsmgr'), site: () => setTimeout(sitePanel, 30), private: privateMode, settings: () => E.launch('settings', 'browser') }[b.dataset.m9] || (() => {}))(); });

  /* ---------- pestañas cerradas ---------- */
  const close0 = B.close;
  B.close = id => { const s = B.S(), t = s.tabs.find(x => x.id === id); if (t && /^https?:|^about:search/.test(t.url) && B.state.cur !== 'priv') { const l = S.get('os9_closedtabs', []) || []; l.unshift({ u: t.url, t: B.title(t), s: B.state.cur, d: Date.now() }); S.set('os9_closedtabs', l.slice(0, 25)); } return close0(id); };
  // la pestaña "✕" de 8.0 llama a su función interna: se registra también desde el clic
  $('#eb-tabs').addEventListener('click', e => { const x = e.target.closest('[data-close]'); if (!x) return; const t = B.S().tabs.find(z => z.id === x.dataset.close); if (t && /^https?:|^about:search/.test(t.url) && B.state.cur !== 'priv') { const l = S.get('os9_closedtabs', []) || []; l.unshift({ u: t.url, t: B.title(t), s: B.state.cur, d: Date.now() }); S.set('os9_closedtabs', l.slice(0, 25)); } }, true);
  function reopen() { const l = S.get('os9_closedtabs', []) || []; const x = l.shift(); S.set('os9_closedtabs', l); if (!x) return E.toast(tr('No hay pestañas cerradas recientes')); if (x.s && B.browsers[x.s] && x.s !== B.state.cur) B.switchTo(x.s); E.ebOpenUrl(x.u, true); }
  K.ebReopen = reopen;

  /* ---------- navegación privada: explicación honesta ---------- */
  async function privateMode() {
    if (!S.get('os9_priv_explained', false)) {
      const ok = await E.form({ title: '🕶️ ' + tr('Navegación privada'), html: `<p class="k9-small">${esc(tr('En “Eisen Privado”, EISENKU no guarda historial, pestañas abiertas ni datos de los sitios cuando cierras la sesión.'))}</p><h4 style="margin:10px 0 4px;font-size:12.5px">${esc(tr('Limitaciones'))}</h4><ul class="k9-small" style="padding-left:18px;display:flex;flex-direction:column;gap:3px"><li>${esc(tr('No te hace anónimo: tu proveedor de Internet, tu red y los sitios pueden ver tu actividad.'))}</li><li>${esc(tr('Si usas el proxy de EISENKU, el servidor donde lo ejecutas ve las direcciones que visitas.'))}</li><li>${esc(tr('Los archivos que descargues y los marcadores que guardes sí se conservan.'))}</li><li>${esc(tr('El navegador real (Chrome, Edge…) puede guardar su propia caché.'))}</li></ul>`, ok: tr('Entendido'), cancel: tr('Cancelar') });
      if (!ok) return; S.set('os9_priv_explained', true);
    }
    E.launch('browser'); B.init(); B.switchTo('priv'); E.toast('🕶️ ' + tr('Navegación privada activada'));
  }

  /* ---------- ventanas emergentes controladas ---------- */
  E.ebPopupHook = (tab, url) => {
    const h = hostOf(tab.url), allow = S.get('os9_popups_ok', []) || [];
    if (K.pref('popups') !== 'block' || allow.includes(h)) return false;
    K.seclog('browser', `Ventana emergente bloqueada en ${h}: ${url.slice(0, 120)}`);
    const n = $('#eb-note'); n.hidden = false;
    n.innerHTML = `<span>🚫 ${esc(tr('Ventana emergente bloqueada'))}: ${esc(url.slice(0, 80))}</span><button data-pu="open">${esc(tr('Abrir'))}</button><button data-pu="allow">${esc(tr('Permitir siempre en'))} ${esc(h)}</button><button data-pu="x">✕</button>`;
    n.onclick = e => { const b = e.target.closest('[data-pu]'); if (!b) return; n.onclick = null; if (b.dataset.pu === 'open') E.ebOpenUrl(url, true); if (b.dataset.pu === 'allow') { allow.push(h); S.set('os9_popups_ok', allow); E.ebOpenUrl(url, true); } n.hidden = true; B.renderBar(); };
    return true;
  };

  /* ---------- página de inicio configurable ---------- */
  $('#nav-btn-home').onclick = () => { const h = String(K.pref('homepage') || 'about:newtab').trim(); B.nav(B.cur(), B.resolve(h) || 'about:newtab'); };

  /* ---------- modo oscuro forzado (filtro visual sobre páginas externas) ---------- */
  const views = $('#eb-views');
  function dark() { if (!B.state.ready || !B.S()) return; const t = B.cur(); const on = !!K.pref('forceDark') && t && /^https?:/i.test(t.url) && !/adapter|local/.test(t.eff || ''); views.classList.toggle('eb9-dark', on); }
  new MutationObserver(dark).observe(views, { subtree: true, attributes: true, attributeFilter: ['class'] });

  /* ---------- registro de descargas ---------- */
  const logDl = d => { const l = S.get('os9_downloads', []) || []; l.unshift(Object.assign({ at: Date.now(), app: K.activeApp() }, d)); S.set('os9_downloads', l.slice(0, 300)); K.emit('downloads'); };
  document.addEventListener('eisen:download', e => logDl({ id: e.detail.id, name: e.detail.name, size: e.detail.size, type: e.detail.type, src: '' }));
  K.on('download', d => logDl({ name: d.name, size: d.size, src: d.url }));
  const imp0 = E.importFromUrl; E.importFromUrl = async (url, folder) => { const r = await imp0(url, folder); try { const all = await E.vaultAll(); const f = all.sort((a, b) => b.date - a.date)[0]; if (f && Date.now() - f.date < 15000) logDl({ id: f.id, name: f.name, size: f.size, src: url }); } catch { /* ignorar */ } return r; };

  /* ---------- atajos adicionales ---------- */
  document.addEventListener('keydown', e => {
    const w = $('.window.active.open'); if (!w || w.id !== 'win-browser') return;
    const c = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (c && e.shiftKey && k === 't') { e.preventDefault(); reopen(); }
    else if (c && !e.shiftKey && k === 'j') { e.preventDefault(); E.launch('downloads'); }
    else if (c && e.shiftKey && k === 'b') { e.preventDefault(); E.launch('bookmarks'); }
    else if (c && e.shiftKey && k === 'n') { e.preventDefault(); privateMode(); }
    else if (c && /^[1-9]$/.test(e.key)) { e.preventDefault(); const s = B.S(); const t = e.key === '9' ? s.tabs[s.tabs.length - 1] : s.tabs[+e.key - 1]; if (t) B.activate(t); }
  });

  /* ---------- aviso del modo privado en la barra ---------- */
  const tag = K.ui.el('span', { class: 'eb9-privtag', title: tr('Navegación privada: no se guarda historial ni datos de sitios') }, '🕶️ ' + esc(tr('Privado')));
  omni.after(tag);
  const sync = () => { tag.hidden = B.state.cur !== 'priv'; dark(); };
  $('#eb-switch').addEventListener('change', () => setTimeout(sync, 0));
  document.addEventListener('eisen:open', e => { if (e.detail === 'browser') setTimeout(sync, 50); });
  setTimeout(sync, 0);

  /* ---------- 10.0: borrado de datos de navegación y preferencias de privacidad ---------- */
  // since = 0 → todo; si no, solo lo posterior a esa fecha (los datos de sitios no llevan fecha: se borran solo con «todo»)
  K.ebPrivacy = {
    clear(since = 0, w = {}) {
      const r = {}, filt = (key, tOf) => { const l = S.get(key, []) || []; const keep = since ? l.filter(x => (tOf(x) || 0) < since) : []; S.set(key, keep); return l.length - keep.length; };
      if (w.history) r.history = filt('browser_history', x => x.d);
      if (w.closed) r.closed = filt('os9_closedtabs', x => x.d);
      if (w.downloads) { r.downloads = filt('os9_downloads', x => x.at); K.emit('downloads'); }
      if (w.site && !since) { r.site = Object.keys(S.get('eb_store', {}) || {}).length; S.set('eb_store', {}); }
      if (w.perms) { r.perms = Object.keys(S.get('os9_siteperms', {}) || {}).length; S.set('os9_siteperms', {}); }
      if (w.modes) { r.modes = Object.keys(S.get('site_mode', {}) || {}).length; S.set('site_mode', {}); }
      if (w.popups) { r.popups = (S.get('os9_popups_ok', []) || []).length; S.set('os9_popups_ok', []); }
      if (w.cache && E.ebClearCache) { E.ebClearCache(); r.cache = true; }
      K.seclog('privacy', 'Datos de navegación borrados (' + (since ? 'desde ' + new Date(since).toLocaleString() : 'todo') + '): ' + Object.entries(r).map(([k, v]) => k + '=' + v).join(', '));
      return r;
    },
    site(h, w = {}) {
      const r = {};
      if (w.history) { const l = S.get('browser_history', []) || [], keep = l.filter(x => hostOf(x.u) !== h); r.history = l.length - keep.length; S.set('browser_history', keep); }
      if (w.data) { const st = S.get('eb_store', {}) || {}; let n = 0; Object.keys(st).forEach(k => { if (k === h || k.split(':')[0] === h) { delete st[k]; n++; } }); S.set('eb_store', st); r.data = n; }
      if (w.perms) { const m = perms(); r.perms = (m[h] || []).length; delete m[h]; S.set('os9_siteperms', m); }
      if (w.mode) { const sm = S.get('site_mode', {}) || {}; r.mode = h in sm; delete sm[h]; S.set('site_mode', sm); }
      if (w.popups) { S.set('os9_popups_ok', (S.get('os9_popups_ok', []) || []).filter(x => x !== h)); }
      K.seclog('privacy', `Datos del sitio ${h} borrados`); return r;
    },
    hostOf
  };
  { let fresh = true; const pv = () => K.cfg ? K.cfg('browserprivacy', { privDefault: false, clearOnClose: false }) : null;
    document.addEventListener('eisen:open', e => { if (e.detail !== 'browser') return; const p = pv(); if (fresh && p && p.get('privDefault') && B.state.ready && B.state.cur !== 'priv') { B.switchTo('priv'); E.toast('🕶️ ' + tr('Navegación privada (preferencia de Privacidad del navegador)')); } fresh = false; });
    document.addEventListener('eisen:close', e => { if (e.detail !== 'browser') return; fresh = true; const p = pv(); if (p && p.get('clearOnClose')) { K.ebPrivacy.clear(0, { history: true, closed: true, site: true, cache: true }); if (K.log) K.log('info', 'privacy', 'Datos del navegador borrados al cerrarlo (preferencia)'); } });
  }

  /* ---------- búsqueda global: abre pestañas abiertas ---------- */
  K.search.register(tr('Pestañas abiertas'), n => { if (!B.state.ready) return []; const out = []; Object.entries(B.state.sessions).forEach(([sid, s]) => s.tabs.forEach(t => { const ti = B.title(t); if (K.norm(ti + ' ' + t.url).includes(n)) out.push({ icon: '🗂️', title: ti, sub: B.browsers[sid].name, run: () => { E.launch('browser'); if (sid !== B.state.cur) B.switchTo(sid); B.activate(t); } }); })); return out.slice(0, 4); });
})();

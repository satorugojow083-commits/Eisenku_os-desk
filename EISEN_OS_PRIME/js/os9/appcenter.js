/* =====================================================================
   EISENKU OS 9.0 ENTERPRISE · EISENKU App Center
   Sustituye la interfaz de EISEN Store (8.0) en la misma ventana "appcenter",
   reutilizando su catálogo (apps integradas, juegos, apps web, Google Play, apps añadidas).
   Novedades: actualizaciones con notas de versión, permisos, favoritos, recientes,
   restauración de apps/datos, validación de apps web y paquetes de terceros AISLADOS
   (iframe sandbox + puente con permisos: nunca ejecutan código con privilegios del sistema).
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, $ = K.$, $$ = K.$$, tr = K.tr, I = K.icon;
  const win = $('#win-appcenter'); if (!win) return;
  const list = E.apps(), PLAY = E.PLAY || [];
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
  const fav = d => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=64`;

  /* ---------- versiones de las apps integradas (notas de la versión 9.0) ---------- */
  const V9 = {
    explorer: ['9.0.0', 'Explorador nuevo: subcarpetas, papelera con restauración, favoritos, copiar/cortar/pegar, vista de cuadrícula y lista, detalles, ZIP y arrastrar entre carpetas.'],
    settings: ['9.0.0', 'Centro de configuración con 22 apartados, buscador, temas, accesibilidad, perfiles, copias completas y atajos personalizables.'],
    appcenter: ['9.0.0', 'EISENKU App Center: actualizaciones, permisos, favoritos, restauración y paquetes de terceros aislados.'],
    browser: ['9.0.0', 'Permisos por sitio, gestor de descargas y marcadores, reapertura de pestañas, ventanas emergentes controladas y modo oscuro forzado.'],
    terminal: ['9.0.0', 'Comandos de archivos reales (ls, cd, mkdir, touch, mv, cp, rm, tree, du, write) y ping HTTP real.'],
    word: ['9.0.0', 'Documentos múltiples guardados en Archivos, estilos, colores, enlaces seguros, buscar y reemplazar y recuento de palabras.'],
    excel: ['9.0.0', 'Rangos rectangulares (A1:C5), funciones ROUND, ABS, POW, SQRT, IF, importación CSV y exportación segura.'],
    qr: ['9.0.0', 'Generador QR sin conexión: tus datos ya no se envían a un servicio externo.'],
    assistant: ['9.0.0', 'Código de acceso opcional para el servidor de IA y límites de uso.'],
    pdf: ['9.0.0', 'Apertura segura de PDF (el tipo se fuerza para que nunca se interprete como página web).'],
    music: ['9.0.0', 'Control desde el centro de notificaciones y atajos del sistema.']
  };
  const verOf = id => (K.MANIFESTS[id] && K.MANIFESTS[id].ver) || (K.VERS10 && K.VERS10[id] && K.VERS10[id][0]) || (V9[id] && V9[id][0]) || (E.REG[id] && E.REG[id].ver) || (E.REG[id] ? '8.0.0' : (list.find(a => a.id === id) || {}).game ? '8.0.0' : '—');
  const notesOf = id => (K.MANIFESTS[id] && K.MANIFESTS[id].notes) || (K.VERS10 && K.VERS10[id] && K.VERS10[id][1]) || (V9[id] && V9[id][1]) || '';
  // primera ejecución de 9.0: registra versiones. Si vienes de 8.0, las apps mejoradas aparecen en "Actualizaciones".
  (() => { const m = K.appVersions(); if (Object.keys(m).length) return; Object.keys(E.REG).forEach(id => { m[id] = K.updatedFrom && V9[id] ? '8.0.0' : verOf(id); }); S.set('os9_app_versions', m); })();
  K.appVerOf = verOf; K.appNotesOf = notesOf;   // 10.0: usadas por el núcleo para registrar las apps nuevas
  const pending = () => Object.keys(E.REG).filter(id => E.isInstalled(id) && verOf(id) !== '—' && K.cmpVer(verOf(id), K.appVersions()[id] || '0') > 0);
  const favs = () => S.get('os9_app_favs', []) || [];
  const instAt = () => S.get('os9_installed_at', {}) || {};
  document.addEventListener('eisen:installed', e => { const d = e.detail || {}; const m = instAt(); if (d.on) m[d.id] = Date.now(); else delete m[d.id]; S.set('os9_installed_at', m); if (d.on && !K.appVersions()[d.id]) K.markAppVersion(d.id, verOf(d.id)); K.seclog('apps', `${d.on ? 'Instalada' : 'Desinstalada'}: ${(E.REG[d.id] || list.find(a => a.id === d.id) || {}).name || d.id}`); });

  /* ---------- validación de apps web añadidas por el usuario ---------- */
  const PRIV = /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i;
  function checkWeb(a) {
    const bad = [], warn = [], good = [];
    let u = null; try { u = new URL(a.ext); } catch { bad.push(tr('La dirección no es una URL válida')); }
    if (u) {
      if (!/^https?:$/.test(u.protocol)) bad.push(tr('Protocolo no permitido') + ' (' + u.protocol + ')');
      else if (u.protocol !== 'https:') bad.push(tr('Debe usar HTTPS (conexión cifrada)')); else good.push(tr('Conexión cifrada (HTTPS)'));
      if (PRIV.test(u.hostname)) bad.push(tr('Apunta a una red privada o interna'));
      if (u.username || u.password) bad.push(tr('La URL contiene usuario o contraseña'));
      if (/(^|\.)xn--/.test(u.hostname)) warn.push(tr('Dominio con caracteres internacionales: comprueba que no imita a otro sitio'));
      if (a.ext.length > 2000) bad.push(tr('URL demasiado larga'));
    }
    if (!a.name || !a.name.trim()) bad.push(tr('Falta el nombre'));
    if (/[<>]/.test(a.name + a.desc)) warn.push(tr('Se quitaron caracteres < > del nombre o la descripción'));
    if (a.img && !/^https:\/\//i.test(a.img)) bad.push(tr('El icono debe ser una imagen https o un emoji'));
    good.push(tr('Se abrirá en el navegador aislado de EISENKU, sin acceso a tus archivos ni al sistema'));
    return { bad, warn, good };
  }

  /* ---------- paquetes de terceros (.eisenapp) ---------- */
  const PKG_PERMS = ['notifications', 'storage', 'clipboard', 'files', 'network'];
  const pkgs = () => S.get('os9_packages', []) || [];
  function validatePkg(o, raw) {
    const errors = [], warnings = [];
    if (!o || o.eisenapp !== 1) errors.push(tr('No es un paquete EISENKU (falta "eisenapp": 1)'));
    else {
      if (!/^[a-z][a-z0-9-]{2,39}$/.test(o.id || '')) errors.push(tr('Identificador inválido (minúsculas, números y guiones; 3-40)'));
      if (E.REG[o.id] && !(E.REG[o.id] || {}).thirdParty) errors.push(tr('El identificador coincide con una app del sistema'));
      if (!o.name || String(o.name).length > 40) errors.push(tr('Nombre ausente o demasiado largo'));
      if (!/^\d+\.\d+\.\d+$/.test(o.version || '')) errors.push(tr('Versión inválida (formato 1.0.0)'));
      if (typeof o.html !== 'string' || !o.html.trim()) errors.push(tr('Falta el contenido HTML de la app'));
      if ((raw || '').length > 1024 * 1024) errors.push(tr('El paquete supera 1 MB'));
      (o.permissions || []).forEach(p => { if (!PKG_PERMS.includes(p)) errors.push(tr('Permiso no admitido') + ': ' + p); });
      if (/\beval\s*\(|new\s+Function\s*\(/.test(o.html || '')) warnings.push(tr('Usa evaluación dinámica de código (eval/Function)'));
      if (/(top|parent)\.location/.test(o.html || '')) warnings.push(tr('Intenta navegar la ventana principal (será bloqueado por el aislamiento)'));
      if (/<iframe/i.test(o.html || '')) warnings.push(tr('Incluye marcos (iframes)'));
    }
    return { ok: !errors.length, errors, warnings };
  }
  const SDK = `<script>(function(){var P=parent,n=0,cb={};function call(m,a){return new Promise(function(res,rej){var i=++n;cb[i]=[res,rej];P.postMessage({eisenpkg:1,i:i,m:m,a:a||[]},'*')})}addEventListener('message',function(e){var d=e.data;if(!d||!d.eisenpkgr||e.source!==P)return;var c=cb[d.i];if(!c)return;delete cb[d.i];d.err?c[1](new Error(d.err)):c[0](d.r)});window.eisen={notify:function(t,b){return call('notify',[t,b])},storage:{get:function(k){return call('storage.get',[k])},set:function(k,v){return call('storage.set',[k,v])},keys:function(){return call('storage.keys')},remove:function(k){return call('storage.remove',[k])}},files:{open:function(o){return call('files.open',[o||{}])},save:function(n,c,t){return call('files.save',[n,c,t])}},clipboard:{write:function(t){return call('clipboard.write',[t])}},open:function(u){return call('open',[u])},theme:function(){return call('theme')},info:function(){return call('info')}}})()<\/script>`;
  const csp = perms => perms.includes('network') ? "default-src 'none'; script-src 'unsafe-inline' https: blob:; style-src 'unsafe-inline' https:; img-src https: data: blob:; media-src https: data: blob:; font-src https: data:; connect-src https:" : "default-src 'none'; script-src 'unsafe-inline' blob:; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:";
  function registerPkg(p) {
    const id = 'pkg-' + p.id;
    const app = { id, name: p.name, icon: p.icon || '🧩', cat: p.category || 'Sistema', desc: p.description || '', w: p.width || 720, h: p.height || 520, pad: false, thirdParty: true, perms: p.permissions || [], ver: p.version, author: p.author || tr('Desconocido'), noWindow: true, launch: () => openPkg(id) };
    E.registerApp(app);
  }
  function openPkg(id) {
    const p = pkgs().find(x => 'pkg-' + x.id === id); if (!p) return;
    if (!E.isInstalled(id)) { show('detail', id); return; }
    const w = E.createAppWindow(E.REG[id]); const body = w.querySelector('.app-body');
    if (!w.__pkg) {
      w.__pkg = true;
      const granted = (p.permissions || []).filter(x => K.perms.has(id, x));
      const doc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp(granted)}"><meta name="viewport" content="width=device-width,initial-scale=1">${SDK}</head><body>${p.html}</body></html>`;
      body.innerHTML = `<div class="ac9-pkgbar">${I('shield', 13)} ${esc(tr('App de terceros aislada'))} · ${esc(p.author || '')} · v${esc(p.version)} <button class="k9-btn k9-small" data-pkgperm>${esc(tr('Permisos'))}</button></div><iframe class="ac9-pkgframe" sandbox="allow-scripts allow-forms allow-modals allow-downloads" referrerpolicy="no-referrer" title="${esc(p.name)}"></iframe>`;
      const f = body.querySelector('iframe'); f.srcdoc = doc; w.__frame = f;
      body.querySelector('[data-pkgperm]').onclick = () => E.launch('permissions', id);
    }
    E.openWindow(id);
  }
  // puente: valida origen, método, permisos y tamaños
  window.addEventListener('message', async e => {
    const d = e.data; if (!d || d.eisenpkg !== 1 || typeof d.m !== 'string') return;
    const w = $$('.window').find(x => x.__frame && x.__frame.contentWindow === e.source); if (!w) return;
    const id = w.id.slice(4), p = pkgs().find(x => 'pkg-' + x.id === id); if (!p) return;
    const reply = (r, err) => { try { e.source.postMessage({ eisenpkgr: 1, i: d.i, r, err }, '*'); } catch { /* cerrado */ } };
    const need = { 'notify': 'notifications', 'storage.get': 'storage', 'storage.set': 'storage', 'storage.keys': 'storage', 'storage.remove': 'storage', 'files.open': 'files', 'files.save': 'files', 'clipboard.write': 'clipboard' }[d.m];
    if (need && (!(p.permissions || []).includes(need) || !K.perms.has(id, need))) { K.seclog('perm', `${p.name} pidió «${need}» sin permiso`, 'warn'); return reply(null, 'Permiso denegado: ' + need); }
    const a = Array.isArray(d.a) ? d.a : [], key = 'pkgdata_' + p.id;
    try {
      switch (d.m) {
        case 'notify': E.notify(String(a[0] || p.name).slice(0, 80), String(a[1] || '').slice(0, 300), p.icon || '🧩'); return reply(true);
        case 'storage.get': return reply((S.get(key, {}) || {})[String(a[0])] ?? null);
        case 'storage.keys': return reply(Object.keys(S.get(key, {}) || {}));
        case 'storage.set': { const m = S.get(key, {}) || {}; m[String(a[0]).slice(0, 100)] = a[1]; if (JSON.stringify(m).length > 1024 * 1024) return reply(null, 'Límite de 1 MB superado'); S.set(key, m); return reply(true); }
        case 'storage.remove': { const m = S.get(key, {}) || {}; delete m[String(a[0])]; S.set(key, m); return reply(true); }
        case 'files.open': { const f = await K.files.pick({ title: p.name + ': ' + tr('elegir archivo') }); if (!f) return reply(null); if (f.size > 10 * 1024 * 1024) return reply(null, 'Archivo demasiado grande (máx. 10 MB)'); K.seclog('perm', `${p.name} recibió el archivo ${f.name} (elegido por ti)`); const text = /^text\/|json|xml|javascript/.test(f.type || '') ? await f.blob.text() : null; return reply({ name: f.name, type: f.type, size: f.size, text, dataUrl: text == null ? await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f.blob); }) : null }); }
        case 'files.save': { const n = K.files.cleanName(a[0] || 'archivo.txt'), c = String(a[1] ?? ''); if (c.length > 10 * 1024 * 1024) return reply(null, 'Contenido demasiado grande'); const dir = 'documents/Apps/' + K.files.cleanName(p.name); await K.files.mkdir(dir); await K.files.save(await K.files.uniqueName(dir, n), new Blob([c], { type: String(a[2] || 'text/plain').slice(0, 80) }), dir); return reply(true); }
        case 'clipboard.write': return reply(await K.ui.copy(String(a[0] || '').slice(0, 100000)));
        case 'open': { const u = String(a[0] || ''); if (!/^https:\/\//i.test(u)) return reply(null, 'Solo se pueden abrir enlaces https'); E.ebOpenUrl(u, true); return reply(true); }
        case 'theme': { const cs = getComputedStyle(document.documentElement); return reply({ dark: document.documentElement.dataset.theme !== 'light', accent: cs.getPropertyValue('--accent').trim(), text: cs.getPropertyValue('--e9-text').trim(), bg: cs.getPropertyValue('--e9-solid').trim() }); }
        case 'info': return reply({ os: 'EISENKU OS', version: K.version, lang: (window.EISEN_I18N || {}).lang || 'es', permissions: (p.permissions || []).filter(x => K.perms.has(id, x)) });
        default: return reply(null, 'Método desconocido');
      }
    } catch (er) { reply(null, String(er && er.message || er)); }
  });
  pkgs().forEach(registerPkg);
  async function installPkgFromText(text, source) {
    if (S.get('os10_allow_pkg', true) === false) { K.seclog('apps', 'Instalación de paquete bloqueada por la configuración', 'warn'); return K.ui.alert(tr('Apps de terceros desactivadas'), tr('Actívalas en Configuración › Tienda de aplicaciones para instalar paquetes .eisenapp.')); }
    let o = null; try { o = JSON.parse(text); } catch { const m = String(text).match(/<script[^>]+type=["']application\/eisen-manifest["'][^>]*>([\s\S]*?)<\/script>/i); if (m) { try { o = JSON.parse(m[1]); o.html = text.replace(m[0], ''); } catch { o = null; } } }
    const v = validatePkg(o, text);
    if (!v.ok) { K.seclog('apps', 'Paquete rechazado: ' + v.errors.join('; '), 'warn'); return K.ui.alert(tr('Paquete rechazado'), v.errors.join('\n')); }
    const perms = (o.permissions || []);
    const ok = await E.form({ title: tr('Instalar app de terceros'), html: `<div class="k9-row" style="gap:12px;margin-bottom:8px"><span class="ico-tile" style="--s:48px;--g1:#2b3038;--g2:#4a515c"><b>${esc(o.icon || '🧩')}</b></span><div><b>${esc(o.name)}</b> <span class="k9-badge">v${esc(o.version)}</span><br><small class="eis-muted">${esc(o.author || tr('Autor desconocido'))} · ${esc(source || '')}</small></div></div><p class="k9-small">${esc(o.description || '')}</p><h4 style="margin:10px 0 4px;font-size:12.5px">${esc(tr('Permisos que solicita'))}</h4>${perms.length ? perms.map(p => `<div class="k9-row k9-small">${esc((K.PERMS[p] || {}).i || '•')} ${esc(tr((K.PERMS[p] || {}).n || p))}</div>`).join('') : `<p class="k9-small k9-muted">${esc(tr('Ninguno'))}</p>`}${v.warnings.length ? `<p class="k9-small" style="color:var(--e9-warn);margin-top:8px">⚠️ ${v.warnings.map(esc).join('<br>⚠️ ')}</p>` : ''}<p class="eis-muted k9-small" style="margin-top:8px">${esc(tr('Se ejecutará en un espacio aislado: no puede leer tus datos, archivos ni ajustes salvo lo que autorices aquí.'))}</p>`, ok: tr('Instalar y conceder'), cancel: tr('Cancelar') });
    if (!ok) return;
    const all = pkgs().filter(x => x.id !== o.id); all.push({ id: o.id, name: String(o.name).replace(/[<>]/g, '').slice(0, 40), version: o.version, author: String(o.author || '').replace(/[<>]/g, '').slice(0, 60), description: String(o.description || '').replace(/[<>]/g, '').slice(0, 200), icon: String(o.icon || '🧩').slice(0, 4), category: E.CATS[o.category] ? o.category : 'Sistema', permissions: perms, html: o.html, width: Math.min(1200, +o.width || 720), height: Math.min(900, +o.height || 520), at: Date.now() });
    S.set('os9_packages', all);
    perms.forEach(p => K.perms.set('pkg-' + o.id, p, true));
    registerPkg(all.find(x => x.id === o.id)); E.setInstalled('pkg-' + o.id, true); K.markAppVersion('pkg-' + o.id, o.version);
    K.seclog('apps', `Paquete instalado: ${o.name} ${o.version} (permisos: ${perms.join(', ') || 'ninguno'})`);
    E.notify(tr('App instalada'), o.name, '🧩'); show('detail', 'pkg-' + o.id);
  }
  K.installPackage = installPkgFromText;

  /* ---------- interfaz ---------- */
  const old = win.querySelector('.st-root'); if (old) { old.hidden = true; old.style.display = 'none'; }
  const legacy = win.querySelector('.appcenter-layout'); if (legacy) legacy.style.display = 'none';
  win.querySelector('.window-title-area').innerHTML = `${E.tile(E.REG.appcenter, 18, 'mini')}<span>EISENKU App Center</span>`;
  E.REG.appcenter.name = 'EISENKU App Center'; const ce = list.find(a => a.id === 'appcenter'); if (ce) ce.name = 'EISENKU App Center';
  const root = document.createElement('div'); root.className = 'window-body ac9 k9'; root.style.padding = '0';
  win.insertBefore(root, win.querySelector('.window-body'));
  const NAV = [['home', 'Inicio', 'home'], ['explore', 'Explorar', 'grid'], ['games', 'Juegos', 'sparkle'], ['web', 'Apps web', 'globe'], ['play', 'Google Play', 'right'], ['installed', 'Instaladas', 'check'], ['updates', 'Actualizaciones', 'update'], ['favs', 'Favoritos', 'star'], ['packages', 'Paquetes', 'box'], ['add', 'Añadir app web', 'plus']];
  root.innerHTML = `<div class="k9-split ac9-split"><nav class="k9-side ac9-nav"><div class="ac9-brand"><img src="icon.svg" width="26" height="26" alt=""><b>App Center</b></div>${NAV.map(([k, l, i]) => `<button class="k9-item" data-v="${k}">${I(i, 16)}<span>${esc(tr(l))}</span>${k === 'updates' ? '<em class="ac9-n" data-updn></em>' : ''}</button>`).join('')}</nav><main class="k9-main"><div class="ac9-top"><div class="ac9-search">${I('search', 15)}<input class="input-text" data-q placeholder="${esc(tr('Buscar apps, juegos y apps web'))}" aria-label="${esc(tr('Buscar en el App Center'))}"></div><span class="k9-muted k9-small" data-count></span></div><div class="ac9-view" data-view></div></main></div>`;
  const VW = root.querySelector('[data-view]');
  let view = 'home', arg = null, q = '', cat = 'all', hist = [];
  const pool = () => list.filter(a => a.id !== 'appcenter' && a.id !== 'deskfolder');
  const catLabel = a => a.pkg ? 'Google Play' : a.game ? tr('Juego') + (a.gcat ? ' · ' + tr(a.gcat) : '') : tr((E.CATS[a.cat] || {}).label || a.cat || '');
  const kind = a => a.pkg ? 'Android' : a.user ? tr('Añadida por ti') : (E.REG[a.id] || {}).thirdParty ? tr('Paquete de terceros') : a.game ? tr('Juego integrado') : a.web ? tr('App web') : K.MANIFESTS[a.id] ? tr('App 9.0') : tr('App integrada');
  const isFav = id => favs().includes(id);
  const actions = (a, big) => {
    if (a.pkg) return `<button class="k9-btn pri" data-play="${esc(a.pkg)}">${esc(tr('Ver en Google Play'))} ↗</button>${a.web ? `<button class="k9-btn" data-playweb="${esc(a.id)}">${esc(tr('Abrir versión web'))}</button><button class="k9-btn" data-playadd="${esc(a.id)}">＋ ${esc(tr('Añadir a EISENKU'))}</button>` : ''}`;
    const inst = E.isInstalled(a.id), b = [];
    if (inst) b.push(`<button class="k9-btn pri" data-open="${esc(a.id)}">${esc(tr('Abrir'))}</button>`); else b.push(`<button class="k9-btn pri" data-inst="${esc(a.id)}">${I('download', 14)} ${esc(tr('Instalar'))}</button>`);
    if (big) {
      if (inst && !E.CORE_APPS.includes(a.id)) b.push(`<button class="k9-btn" data-uninst="${esc(a.id)}">${esc(tr('Desinstalar'))}</button>`);
      if (inst && (E.REG[a.id] || a.game)) b.push(`<button class="k9-btn" data-reset="${esc(a.id)}">${I('refresh', 14)} ${esc(tr('Restablecer datos'))}</button>`);
      if (inst && E.addDesktopShortcut) b.push(`<button class="k9-btn" data-desk="${esc(a.id)}">${I('monitor', 14)} ${esc(tr('Al escritorio'))}</button>`);
      if (inst) b.push(`<button class="k9-btn" data-pin="${esc(a.id)}">${I('pin', 14)} ${esc(tr('Anclar'))}</button>`);
      if (a.user) b.push(`<button class="k9-btn" data-edituser="${esc(a.id)}">${I('edit', 14)} ${esc(tr('Editar'))}</button>`);
    }
    b.push(`<button class="k9-btn ac9-fav${isFav(a.id) ? ' on' : ''}" data-fav="${esc(a.id)}" title="${esc(tr('Favorito'))}" aria-label="${esc(tr('Favorito'))}">${I('star', 14)}</button>`);
    return b.join('');
  };
  const card = a => `<article class="ac9-card" data-detail="${esc(a.id)}" tabindex="0">${E.tile(a, 52)}<div class="ac9-ci"><h4>${esc(a.name)}</h4><span class="ac9-cat">${esc(catLabel(a))}</span><p>${esc(a.desc || '')}</p><div class="ac9-cb">${actions(a)}${!a.pkg && E.isInstalled(a.id) ? `<span class="ac9-ok">${I('check', 12)} ${esc(tr('Instalada'))}</span>` : ''}</div></div></article>`;
  const row = (title, items, more) => items.length ? `<section class="ac9-sec"><div class="ac9-sec-h"><h3>${title}</h3>${more ? `<button class="k9-btn" data-v="${more}">${esc(tr('Ver todo'))} ›</button>` : ''}</div><div class="ac9-row">${items.map(card).join('')}</div></section>` : '';
  const grid = items => `<div class="ac9-grid">${items.map(card).join('') || `<p class="k9-muted">${esc(tr('No hay elementos.'))}</p>`}</div>`;
  const chips = (cats, field = 'cat') => `<div class="ac9-chips">${['all', ...cats].map(c => `<button data-cat="${esc(c)}" class="${c === cat ? 'on' : ''}">${esc(c === 'all' ? tr('Todas') : tr((E.CATS[c] || {}).label || c))}</button>`).join('')}</div>`;
  const count = n => { root.querySelector('[data-count]').textContent = n == null ? '' : n + ' ' + tr('elementos'); };
  const match = a => !q || K.norm(a.name + ' ' + (a.desc || '') + ' ' + (a.cat || '') + ' ' + (a.kw || (E.REG[a.id] || {}).kw || '') + ' ' + (a.gcat || '')).includes(K.norm(q));
  function show(v, a) { if (v !== view || a !== arg) hist.push([view, arg]); view = v; arg = a; cat = 'all'; render(); VW.scrollTop = 0; }
  E.storeShow = id => { E.openWindow('appcenter'); q = ''; root.querySelector('[data-q]').value = ''; show('detail', id); };
  E.storeSearch = text => { E.openWindow('appcenter'); q = String(text || ''); root.querySelector('[data-q]').value = q; view = 'home'; render(); };
  E.REG.appcenter.onArg = a => { if (typeof a === 'string') show(NAV.some(n => n[0] === a) ? a : 'detail', NAV.some(n => n[0] === a) ? null : a); };

  function render() {
    $$('[data-v]', root.querySelector('.ac9-nav')).forEach(b => b.classList.toggle('on', b.dataset.v === view));
    const un = pending().length; root.querySelector('[data-updn]').textContent = un || '';
    const P = pool();
    if (q && view !== 'detail' && view !== 'add') {
      const r = P.filter(match), pr = PLAY.filter(match);
      VW.innerHTML = `<h2 class="ac9-h">${esc(tr('Resultados para'))} “${esc(q)}”</h2>${grid(r)}${pr.length ? `<h3 class="ac9-h3">Google Play</h3>${grid(pr)}` : ''}`; return count(r.length + pr.length);
    }
    if (view === 'home') {
      const n9 = Object.keys(K.MANIFESTS).map(id => P.find(a => a.id === id)).filter(Boolean);
      const feat = ['handbook', 'passwords', 'projects', 'markdown', 'security', 'academic'].map(id => P.find(a => a.id === id)).filter(Boolean);
      const rec = (S.get('recent_apps', []) || []).map(id => P.find(a => a.id === id)).filter(Boolean).slice(0, 8);
      const heroA = feat[0] || P[0];
      VW.innerHTML = `<div class="ac9-hero"><div class="ac9-hero-t"><small>${esc(tr('Nuevo en') + ' ' + (K.label || 'EISENKU OS'))}</small><h2>${esc(tr('Un ecosistema completo de aplicaciones'))}</h2><p>${esc(tr('Productividad, internet, multimedia, desarrollo, sistema y ciencia: todas funcionan sin conexión salvo las que necesitan Internet, y se instalan sin depender de una tienda externa.'))}</p><div class="k9-row">${heroA ? `<button class="k9-btn pri" data-detail="${esc(heroA.id)}">${esc(tr('Descubrir'))} ${esc(heroA.name)}</button>` : ''}<button class="k9-btn" data-v="explore">${esc(tr('Explorar categorías'))}</button></div></div><div class="ac9-hero-tiles">${feat.slice(0, 6).map(a => `<button data-detail="${esc(a.id)}" title="${esc(a.name)}">${E.tile(a, 54)}</button>`).join('')}</div></div>
        ${un ? `<div class="ac9-banner">${I('update', 16)} ${un} ${esc(tr('apps tienen novedades en esta versión'))} <button class="k9-btn pri" data-v="updates">${esc(tr('Ver actualizaciones'))}</button></div>` : ''}
        ${row(esc(tr('Destacadas')), feat)}${rec.length ? row(esc(tr('Usadas recientemente')), rec) : ''}${row(esc(tr('Apps de EISENKU')), n9.slice(0, 14), 'explore')}${row(esc(tr('Juegos populares')), P.filter(a => a.game).slice(0, 10), 'games')}
        <section class="ac9-sec"><h3>${esc(tr('Explorar por categoría'))}</h3><div class="ac9-cats">${Object.entries(E.CATS).filter(([k]) => k !== 'Ciencia').map(([k, c]) => `<button data-gocat="${esc(k)}" style="--g1:${c.g[0]};--g2:${c.g[1]}"><span>${c.ic}</span>${esc(tr(c.label))}<small>${P.filter(a => !a.web && !a.game && (a.cat === k || (k === 'Educación' && a.cat === 'Ciencia'))).length || ''}</small></button>`).join('')}</div></section>`;
      return count(P.length);
    }
    if (view === 'explore') { const r = P.filter(a => !a.game && !a.web && !a.pkg && !a.user && (cat === 'all' || a.cat === cat || (cat === 'Educación' && a.cat === 'Ciencia'))); VW.innerHTML = `<h2 class="ac9-h">${esc(tr('Apps de EISENKU'))}</h2>${chips(['Productividad', 'Internet', 'Multimedia', 'Desarrollo', 'Sistema', 'Educación', 'Creatividad'])}${grid(r.sort((a, b) => a.name.localeCompare(b.name)))}`; return count(r.length); }
    if (view === 'games') { const r = P.filter(a => a.game && (cat === 'all' || a.gcat === cat)); VW.innerHTML = `<h2 class="ac9-h">${esc(tr('Juegos'))}</h2>${chips(E.GAME_CATS || [])}${grid(r)}`; return count(r.length); }
    if (view === 'web') { const r = P.filter(a => (a.web || a.user) && (cat === 'all' || a.cat === cat)); VW.innerHTML = `<h2 class="ac9-h">${esc(tr('Aplicaciones web'))}</h2><p class="k9-muted k9-small">${esc(tr('Se abren en el navegador aislado de EISENKU. Algunos sitios piden abrirse en una pestaña real.'))}</p>${chips(['Productividad', 'Educación', 'Internet', 'Multimedia', 'Creatividad', 'Desarrollo', 'Juegos'])}${grid(r)}`; return count(r.length); }
    if (view === 'play') { const r = PLAY.filter(a => cat === 'all' || a.cat === cat); VW.innerHTML = `<div class="ac9-banner">${I('info', 16)} ${esc(tr('EISENKU funciona en el navegador: no puede instalar ni ejecutar APK de Android. Aquí ves fichas oficiales y, si existe, la versión web.'))}</div><form class="k9-row" data-psearch style="margin:10px 0"><input class="input-text" data-pq placeholder="${esc(tr('Buscar en Google Play (se abre la tienda oficial)'))}" style="flex:1"><button class="k9-btn pri">${esc(tr('Buscar'))} ↗</button></form>${chips(['Internet', 'Multimedia', 'Creatividad', 'Educación', 'Productividad', 'Juegos'])}${grid(r)}`; return count(r.length); }
    if (view === 'installed') {
      const r = P.filter(a => E.isInstalled(a.id) && (cat === 'all' || (cat === 'sys' && E.CORE_APPS.includes(a.id)) || (cat === 'app' && E.REG[a.id] && !a.game && !(E.REG[a.id] || {}).thirdParty) || (cat === 'game' && a.game) || (cat === 'web' && (a.web || a.user)) || (cat === 'pkg' && (E.REG[a.id] || {}).thirdParty)));
      const unin = P.filter(a => !E.isInstalled(a.id) && (S.get('installed', {}) || {})[a.id] === false);
      VW.innerHTML = `<h2 class="ac9-h">${esc(tr('Instaladas'))}</h2><div class="ac9-chips">${[['all', 'Todas'], ['sys', 'Sistema'], ['app', 'Apps'], ['game', 'Juegos'], ['web', 'Web'], ['pkg', 'Paquetes']].map(([k, l]) => `<button data-cat="${k}" class="${cat === k ? 'on' : ''}">${esc(tr(l))}</button>`).join('')}</div><div class="k9-card ac9-table">${r.map(a => `<div class="k9-li">${E.tile(a, 32)}<div class="t"><b>${esc(a.name)}</b><small>${esc(catLabel(a))} · v${esc(verOf(a.id))}</small></div>${E.CORE_APPS.includes(a.id) ? `<span class="k9-badge">${esc(tr('Sistema'))}</span>` : `<button class="k9-btn" data-uninst="${esc(a.id)}">${esc(tr('Desinstalar'))}</button>`}<button class="k9-btn" data-detail="${esc(a.id)}">${esc(tr('Detalles'))}</button></div>`).join('')}</div>${unin.length ? `<h3 class="ac9-h3">${esc(tr('Desinstaladas (tus datos se conservan)'))}</h3><div class="k9-card ac9-table">${unin.map(a => `<div class="k9-li">${E.tile(a, 32)}<div class="t"><b>${esc(a.name)}</b><small>${esc(catLabel(a))}</small></div><button class="k9-btn pri" data-inst="${esc(a.id)}">${I('refresh', 14)} ${esc(tr('Restaurar'))}</button></div>`).join('')}</div>` : ''}`;
      return count(r.length);
    }
    if (view === 'updates') {
      const l = pending();
      VW.innerHTML = `<h2 class="ac9-h">${esc(tr('Actualizaciones'))}</h2><p class="k9-muted k9-small">${esc(tr('Las apps integradas se actualizan junto con EISENKU OS (sin descargas automáticas). Aquí revisas las novedades y confirmas la actualización de cada app.'))}</p>${l.length ? `<div class="k9-row" style="margin:10px 0"><button class="k9-btn pri" data-updall>${I('update', 14)} ${esc(tr('Actualizar todo'))} (${l.length})</button></div><div class="k9-card ac9-table">${l.map(id => { const a = E.REG[id] || {}; return `<div class="k9-li">${E.tile(a, 34)}<div class="t"><b>${esc(a.name || id)} <span class="k9-badge">${esc(K.appVersions()[id] || '—')} → ${esc(verOf(id))}</span></b><small style="white-space:normal">${esc(tr(notesOf(id)))}</small></div><button class="k9-btn pri" data-upd="${esc(id)}">${esc(tr('Actualizar'))}</button></div>`; }).join('')}</div>` : `<div class="k9-state" style="min-height:200px">${I('check', 36)}<p>${esc(tr('Todas tus apps están al día.'))}</p><button class="k9-btn" data-syscheck>${esc(tr('Buscar actualizaciones del sistema'))}</button></div>`}
        <h3 class="ac9-h3">${esc(tr('Historial de versiones'))}</h3><div class="k9-card ac9-table">${Object.entries(V9).filter(([id]) => E.REG[id]).map(([id, v]) => `<div class="k9-li">${E.tile(E.REG[id], 26)}<div class="t"><b>${esc(E.REG[id].name)} ${esc(v[0])}</b><small style="white-space:normal">${esc(tr(v[1]))}</small></div></div>`).join('')}</div>`;
      return count(l.length);
    }
    if (view === 'favs') { const r = favs().map(id => P.find(a => a.id === id) || PLAY.find(a => a.id === id)).filter(Boolean); VW.innerHTML = `<h2 class="ac9-h">${esc(tr('Favoritos'))}</h2>${r.length ? grid(r) : `<div class="k9-state" style="min-height:200px">${I('star', 36)}<p>${esc(tr('Marca apps con la estrella para encontrarlas aquí.'))}</p></div>`}`; return count(r.length); }
    if (view === 'packages') {
      const l = pkgs();
      VW.innerHTML = `<h2 class="ac9-h">${esc(tr('Paquetes de terceros'))}</h2><div class="ac9-banner">${I('shield', 16)} ${esc(tr('Las apps de terceros se ejecutan aisladas (sandbox) y solo usan los permisos que concedas: notificaciones, almacenamiento propio, portapapeles, archivos que elijas o Internet.'))}</div><div class="k9-row" style="margin:10px 0"><button class="k9-btn pri" data-pkgfile>${I('upload', 14)} ${esc(tr('Instalar desde archivo (.eisenapp)'))}</button><button class="k9-btn" data-pkgsample>${I('box', 14)} ${esc(tr('Instalar app de ejemplo'))}</button><button class="k9-btn" data-pkgdocs>${I('book', 14)} ${esc(tr('Cómo crear apps (Handbook)'))}</button></div>${l.length ? `<div class="k9-card ac9-table">${l.map(p => `<div class="k9-li"><span class="ico-tile" style="--s:34px;--g1:#2b3038;--g2:#4a515c"><b>${esc(p.icon)}</b></span><div class="t"><b>${esc(p.name)} <span class="k9-badge">v${esc(p.version)}</span></b><small>${esc(p.author || '')} · ${esc((p.permissions || []).map(x => tr((K.PERMS[x] || {}).n || x)).join(', ') || tr('sin permisos'))}</small></div><button class="k9-btn pri" data-open="pkg-${esc(p.id)}">${esc(tr('Abrir'))}</button><button class="k9-btn" data-pkgperm="pkg-${esc(p.id)}">${esc(tr('Permisos'))}</button><button class="k9-btn dng" data-pkgdel="${esc(p.id)}">${esc(tr('Eliminar'))}</button></div>`).join('')}</div>` : `<p class="k9-muted">${esc(tr('Aún no has instalado paquetes.'))}</p>`}`;
      return count(l.length);
    }
    if (view === 'add') return addView();
    if (view === 'detail') return detail(arg);
  }
  function detail(id) {
    const a = list.find(x => x.id === id) || PLAY.find(x => x.id === id); if (!a) { view = 'home'; return render(); }
    const r = E.REG[id] || {}, g = a.game && E.GAMES.find(x => x.id === a.game);
    const perms = K.perms.declared(id);
    const feats = r.features || (g ? [g.how, tr('Funciona sin conexión'), tr('Guarda tu récord')] : a.web ? [tr('Se abre en el navegador EISEN'), tr('Requiere conexión a Internet')] : a.pkg ? [tr('Paquete') + ': ' + a.pkg, a.web ? tr('Tiene versión web') : tr('Solo Android')] : []);
    const pub = r.thirdParty ? (r.author || tr('Desconocido')) : a.web || a.user ? host(a.ext || '') : a.pkg ? 'Google Play' : 'EISENKU Technology';
    const similar = (a.pkg ? PLAY : pool()).filter(x => x.id !== a.id && x.cat === a.cat && !!x.game === !!a.game).slice(0, 8);
    VW.innerHTML = `<button class="k9-btn" data-back>${I('back', 14)} ${esc(tr('Volver'))}</button>
      <div class="ac9-detail">${E.tile(a, 96)}<div class="ac9-dt"><h1>${esc(a.name)}</h1><p class="k9-muted">${esc(pub)} · ${esc(catLabel(a))} · ${esc(kind(a))}</p><div class="ac9-cb">${actions(a, true)}</div></div></div>
      <div class="ac9-facts"><div><span>${esc(tr('Versión'))}</span><b>${esc(a.pkg ? '—' : verOf(id))}</b></div><div><span>${esc(tr('Estado'))}</span><b>${esc(a.pkg ? tr('Externa') : E.isInstalled(id) ? tr('Instalada') : tr('No instalada'))}</b></div><div><span>${esc(tr('Funciona sin conexión'))}</span><b>${esc(a.web || a.pkg || /weather|maps|wiki|news|translator|atlas|meet|chat/.test(id) ? tr('No') : tr('Sí'))}</b></div><div><span>${esc(tr('Compatible con'))}</span><b>Linux · Windows</b></div></div>
      ${g ? `<div class="ac9-shot">${E.cover(g, 200)}</div>` : ''}
      <section class="ac9-sec"><h3>${esc(tr('Descripción'))}</h3><p>${esc(a.desc || '')}</p></section>
      ${notesOf(id) ? `<section class="ac9-sec"><h3>${esc(tr('Novedades de esta versión'))}</h3><p>${esc(tr(notesOf(id)))}</p></section>` : ''}
      ${feats.length ? `<section class="ac9-sec"><h3>${esc(tr('Características'))}</h3><div class="ac9-feats">${feats.map(f => `<div>${I('check', 14)} ${esc(tr(f))}</div>`).join('')}</div></section>` : ''}
      ${!a.pkg && !a.web ? `<section class="ac9-sec"><h3>${esc(tr('Permisos'))}</h3>${perms.length ? `<div class="ac9-perms">${perms.map(p => `<div class="ac9-perm"><span>${esc((K.PERMS[p] || {}).i || '•')}</span><b>${esc(tr((K.PERMS[p] || {}).n || p))}</b><em class="k9-badge ${K.perms.has(id, p) ? 'g' : 'd'}">${esc(K.perms.has(id, p) ? tr('Permitido') : tr('Bloqueado'))}</em></div>`).join('')}</div><button class="k9-btn" data-permapp="${esc(id)}" style="margin-top:8px">${I('shield', 14)} ${esc(tr('Gestionar permisos'))}</button>` : `<p class="k9-muted k9-small">${esc(tr('No necesita permisos especiales.'))}</p>`}</section>` : ''}
      ${a.ext ? `<section class="ac9-sec"><h3>${esc(tr('Dirección'))}</h3><p><a href="#" data-external-url="${esc(a.ext)}">${esc(a.ext)}</a></p></section>` : ''}
      ${similar.length ? row(esc(tr('También te puede gustar')), similar) : ''}`;
    count(null);
  }
  function addView(edit) {
    VW.innerHTML = `<h2 class="ac9-h">＋ ${esc(tr('Añadir una app web'))}</h2><p class="k9-muted k9-small">${esc(tr('Agrega cualquier sitio o app web (PWA). Pulsa “Detectar” para leer su nombre, icono y descripción. Antes de añadirla, EISENKU comprueba que la dirección sea segura.'))}</p>
      <form class="ac9-add k9-card" data-addf><label class="k9-field">${esc(tr('URL de la app o de su manifiesto'))}<div class="k9-row"><input class="input-text" name="url" type="url" required placeholder="https://ejemplo.com" style="flex:1"><button type="button" class="k9-btn" data-detect>${I('search', 14)} ${esc(tr('Detectar'))}</button></div></label>
      <label class="k9-field">${esc(tr('Nombre'))}<input class="input-text" name="name" required maxlength="40"></label><label class="k9-field">${esc(tr('Icono (emoji o URL https de imagen)'))}<input class="input-text" name="icon" value="🌐"></label>
      <label class="k9-field">${esc(tr('Descripción'))}<input class="input-text" name="desc" maxlength="140"></label><label class="k9-field">${esc(tr('Categoría'))}<select class="input-text" name="cat">${['Productividad', 'Educación', 'Internet', 'Multimedia', 'Creatividad', 'Desarrollo', 'Sistema', 'Juegos'].map(c => `<option value="${c}">${esc(tr((E.CATS[c] || {}).label || c))}</option>`).join('')}</select></label>
      <label class="k9-row"><input type="checkbox" name="desk" checked> ${esc(tr('Crear acceso directo en el escritorio'))}</label><div data-check class="k9-small"></div><div class="k9-row"><button class="k9-btn pri">${esc(tr('Comprobar y añadir'))}</button><span class="k9-muted k9-small" data-st></span></div><input type="hidden" name="edit" value="${esc(edit || '')}"></form>`;
    count(null);
  }
  async function detect(f) {
    let u = f.url.value.trim(); if (!/^https?:\/\//i.test(u)) { if (!u) return; u = 'https://' + u; f.url.value = u; }
    const st = VW.querySelector('[data-st]'); st.textContent = tr('Analizando…');
    try {
      const txt = await E.ebFetchHtml(u); let man = null;
      if (/\.(webmanifest|json)(\?|$)/i.test(u) || /^\s*\{/.test(txt)) man = JSON.parse(txt);
      else { const d = new DOMParser().parseFromString(txt, 'text/html'); const abs = h => { try { return new URL(h, u).href; } catch { return ''; } };
        f.name.value = f.name.value || ((d.querySelector('meta[property="og:site_name"]') || {}).content || d.title || host(u)).trim().slice(0, 40);
        f.desc.value = f.desc.value || ((d.querySelector('meta[name="description"]') || d.querySelector('meta[property="og:description"]') || {}).content || '').trim().slice(0, 140);
        const ic = d.querySelector('link[rel="apple-touch-icon"], link[rel~="icon"]'); f.icon.value = ic ? abs(ic.getAttribute('href')) : fav(host(u));
        const ml = d.querySelector('link[rel="manifest"]'); if (ml) { try { const mu = abs(ml.getAttribute('href')); man = JSON.parse(await E.ebFetchHtml(mu)); man.__base = mu; } catch { /* sin manifiesto */ } } }
      if (man) { const b = man.__base || u; f.name.value = String(man.short_name || man.name || f.name.value || '').slice(0, 40); f.desc.value = f.desc.value || String(man.description || '').slice(0, 140); const ic = (man.icons || []).sort((x, y) => parseInt(y.sizes) - parseInt(x.sizes))[0]; if (ic) f.icon.value = new URL(ic.src, b).href; if (man.start_url) f.url.value = new URL(man.start_url, b).href; }
      st.textContent = '✓ ' + tr('Datos detectados');
    } catch { f.name.value = f.name.value || host(u); f.icon.value = fav(host(u)); st.textContent = tr('No se pudo leer la página; se usará el icono del sitio.'); }
  }
  root.addEventListener('submit', async e => {
    if (e.target.matches('[data-psearch]')) { e.preventDefault(); const v = e.target.querySelector('[data-pq]').value.trim(); if (v) window.open('https://play.google.com/store/search?c=apps&q=' + encodeURIComponent(v), '_blank', 'noopener'); return; }
    if (!e.target.matches('[data-addf]')) return; e.preventDefault(); const f = e.target;
    const icon = f.icon.value.trim(), isImg = /^(https?:|data:)/i.test(icon);
    const a = { id: f.edit.value || 'user-' + E.uid(), name: f.name.value.replace(/[<>]/g, '').trim().slice(0, 40), ext: f.url.value.trim(), cat: f.cat.value, desc: (f.desc.value.replace(/[<>]/g, '').trim() || tr('App añadida manualmente')).slice(0, 140), icon: isImg ? '🌐' : ([...(icon || '🌐')].slice(0, 2).join('') || '🌐'), img: isImg ? icon : '' };
    const c = checkWeb(a), box = f.querySelector('[data-check]');
    box.innerHTML = `<div class="ac9-checks">${c.good.map(x => `<div class="k9-ok">✔ ${esc(x)}</div>`).join('')}${c.warn.map(x => `<div style="color:var(--e9-warn)">⚠ ${esc(x)}</div>`).join('')}${c.bad.map(x => `<div class="k9-bad">✖ ${esc(x)}</div>`).join('')}</div>`;
    if (c.bad.length) { K.seclog('apps', 'App web rechazada (' + a.ext.slice(0, 80) + '): ' + c.bad.join('; '), 'warn'); return; }
    const users = (S.get('user_apps', []) || []).filter(x => x.id !== a.id); users.push(a); S.set('user_apps', users);
    for (let i = list.length - 1; i >= 0; i--) if (list[i].user) list.splice(i, 1); users.forEach(u => list.push(Object.assign({ user: true, web: true }, u)));
    E.setInstalled(a.id, true); if (f.desk.checked && E.addDesktopShortcut) E.addDesktopShortcut(a.id);
    K.seclog('apps', 'App web añadida tras validación: ' + a.name + ' (' + host(a.ext) + ')');
    E.toast(tr('Añadida') + ': ' + a.name); show('detail', a.id);
  });
  root.addEventListener('click', async e => {
    const t = e.target;
    const v = t.closest('[data-v]'); if (v) { q = ''; root.querySelector('[data-q]').value = ''; show(v.dataset.v); return; }
    if (t.closest('[data-back]')) { const [pv, pa] = hist.pop() || ['home', null]; view = pv; arg = pa; render(); return; }
    const c = t.closest('[data-cat]'); if (c) { cat = c.dataset.cat; render(); return; }
    const gc = t.closest('[data-gocat]'); if (gc) { show('explore'); cat = gc.dataset.gocat; render(); return; }
    if (t.closest('[data-detect]')) return detect(t.closest('form'));
    const o = t.closest('[data-open]'); if (o) { e.stopPropagation(); E.launch(o.dataset.open); return; }
    const ins = t.closest('[data-inst]'); if (ins) { e.stopPropagation(); ins.disabled = true; ins.innerHTML = `<span class="k9-spin" style="width:14px;height:14px;border-width:2px"></span> ${esc(tr('Instalando'))}`; setTimeout(() => { const a = list.find(x => x.id === ins.dataset.inst) || {}; E.setInstalled(ins.dataset.inst, true); E.notify(tr('Instalada'), (a.name || '') + ' ' + tr('ya está en el menú de aplicaciones'), '✅', 3500); render(); }, 380); return; }
    const un = t.closest('[data-uninst]'); if (un) { e.stopPropagation(); const a = list.find(x => x.id === un.dataset.uninst) || E.REG[un.dataset.uninst] || {}; if (!await E.confirm(tr('Desinstalar'), `${a.name}: ${tr('se quitará del sistema. Sus datos se conservan y puedes restaurarla después.')}`, tr('Desinstalar'))) return; E.setInstalled(un.dataset.uninst, false); const w = document.getElementById('win-' + un.dataset.uninst); if (w && w.classList.contains('open')) w.querySelector('[data-act="close"]').click(); render(); return; }
    const rs = t.closest('[data-reset]'); if (rs) { const id = rs.dataset.reset, a = E.REG[id] || list.find(x => x.id === id) || {}; const keys = appKeys(id); if (!keys.length) return E.toast(tr('Esta app no tiene datos propios guardados')); if (!await E.confirm(tr('Restablecer datos'), `${a.name}: ${keys.length} ${tr('elementos de datos volverán a su estado inicial. Se crea antes un punto de restauración.')}`, tr('Restablecer'))) return; await K.backup.snapshot('Antes de restablecer ' + a.name); keys.forEach(k => S.del(k)); K.seclog('apps', 'Datos restablecidos: ' + a.name); E.toast(tr('Datos restablecidos. Se aplicará al reiniciar la app.')); return; }
    const dk = t.closest('[data-desk]'); if (dk) { E.addDesktopShortcut(dk.dataset.desk); E.toast(tr('Acceso directo creado en el escritorio')); return; }
    const pn = t.closest('[data-pin]'); if (pn) { const id = pn.dataset.pin; const sp = S.get('pinned', []) || []; if (!sp.includes(id)) { sp.push(id); S.set('pinned', sp); } const st = S.get('start_pins', null); if (Array.isArray(st) && !st.includes(id)) { st.push(id); S.set('start_pins', st); } document.dispatchEvent(new CustomEvent('eisen:installed', { detail: { id, on: true } })); E.toast(tr('Anclada a la barra y al Inicio')); return; }
    const fv = t.closest('[data-fav]'); if (fv) { e.stopPropagation(); const l = favs(), id = fv.dataset.fav, i = l.indexOf(id); if (i >= 0) l.splice(i, 1); else l.push(id); S.set('os9_app_favs', l); fv.classList.toggle('on', i < 0); if (view === 'favs') render(); return; }
    const eu = t.closest('[data-edituser]'); if (eu) { const a = (S.get('user_apps', []) || []).find(x => x.id === eu.dataset.edituser); if (!a) return; view = 'add'; addView(a.id); const f = VW.querySelector('form'); f.url.value = a.ext; f.name.value = a.name; f.icon.value = a.img || a.icon; f.desc.value = a.desc; f.cat.value = a.cat; f.desk.checked = false; return; }
    const pl = t.closest('[data-play]'); if (pl) { e.stopPropagation(); window.open('https://play.google.com/store/apps/details?id=' + encodeURIComponent(pl.dataset.play), '_blank', 'noopener'); return; }
    const pw = t.closest('[data-playweb]'); if (pw) { e.stopPropagation(); const a = PLAY.find(x => x.id === pw.dataset.playweb); if (a) E.ebOpenUrl(a.web, true); return; }
    const pa = t.closest('[data-playadd]'); if (pa) { e.stopPropagation(); const a = PLAY.find(x => x.id === pa.dataset.playadd); if (!a) return; show('add'); const f = VW.querySelector('form'); f.url.value = a.web; f.name.value = a.name; f.icon.value = a.img || '🌐'; f.desc.value = a.name; f.cat.value = a.cat; return; }
    const ud = t.closest('[data-upd]'); if (ud) { K.markAppVersion(ud.dataset.upd, verOf(ud.dataset.upd)); K.seclog('apps', 'App actualizada: ' + ud.dataset.upd + ' ' + verOf(ud.dataset.upd)); render(); return; }
    if (t.closest('[data-updall]')) { pending().forEach(id => K.markAppVersion(id, verOf(id))); E.notify(tr('Apps actualizadas'), tr('Todas las apps están al día.'), '⬆️', 3500); render(); return; }
    if (t.closest('[data-syscheck]')) { const r = await K.updates.check(); E.toast(!r.ok ? tr('No se pudo comprobar (sin conexión o abierto como archivo)') : r.newer ? tr('Hay una versión nueva del sistema') + ': ' + r.remote : tr('Ya tienes la última versión') + ' (' + r.local + ')'); return; }
    const pp = t.closest('[data-permapp],[data-pkgperm]'); if (pp) { E.launch('permissions', pp.dataset.permapp || pp.dataset.pkgperm); return; }
    if (t.closest('[data-pkgfile]')) { const [f] = await K.ui.pickFile('.eisenapp,.json,.html,application/json,text/html'); if (f) { if (f.size > 1024 * 1024) return K.ui.alert(tr('Paquete rechazado'), tr('El paquete supera 1 MB')); installPkgFromText(await f.text(), f.name); } return; }
    if (t.closest('[data-pkgsample]')) { try { const r = await fetch('apps/hola-eisenku.eisenapp', { cache: 'no-store' }); installPkgFromText(await r.text(), 'hola-eisenku.eisenapp'); } catch { K.ui.alert(tr('No disponible'), tr('El paquete de ejemplo está en la carpeta apps/ del proyecto (requiere abrir EISENKU con su servidor).')); } return; }
    if (t.closest('[data-pkgdocs]')) { K.help && K.help(null, 'desarrollo de aplicaciones'); return; }
    const pd = t.closest('[data-pkgdel]'); if (pd) { const p = pkgs().find(x => x.id === pd.dataset.pkgdel); if (!p || !await E.confirm(tr('Eliminar paquete'), p.name + ': ' + tr('se eliminará la app y sus datos.'))) return; S.set('os9_packages', pkgs().filter(x => x.id !== p.id)); S.del('pkgdata_' + p.id); E.setInstalled('pkg-' + p.id, false); K.perms.reset('pkg-' + p.id); K.seclog('apps', 'Paquete eliminado: ' + p.name); render(); return; }
    const d = t.closest('[data-detail]'); if (d && !t.closest('button:not([data-detail])')) { show('detail', d.dataset.detail); }
  });
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.ac9-card')) show('detail', e.target.dataset.detail); });
  let qt; root.querySelector('[data-q]').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { q = e.target.value.trim(); render(); }, 140); });
  // claves de datos de una app (para "Restablecer datos")
  const APPKEYS = { notes: ['notes'], tasks: ['tasks'], calendar: ['events'], clock: ['alarms', 'fired'], calc: ['calc_hist'], excel: ['excel_data'], word: ['word_doc', 'os9_word_docs'], slides: ['slides_deck'], flashcards: ['flash'], typing: ['typing_best'], weather: ['weather_loc'], news: ['feeds'], translator: ['tr_hist'], maps: ['map_view'], colors: ['palettes'], code: ['code_proj'], piano: ['piano_song'], pixel: ['pixel_art'], grapher: ['graph_fx'], assistant: ['dom_chat', 'dom_cfg'], browser: ['browser_history', 'browser_bookmarks', 'browser_tabs', 'eb_store', 'site_mode'], arcade: ['game_best', 'recent_games'] };
  function appKeys(id) { const out = []; (APPKEYS[id] || []).forEach(k => { if (localStorage.getItem('eisen_' + k) != null) out.push(k); }); try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('eisen_' + id + '_')) out.push(k.slice(6)); if (k && k.startsWith('eisen_a9_' + id)) out.push(k.slice(6)); } } catch { /* ignorar */ } return [...new Set(out)]; }
  K.appKeys = appKeys;
  document.addEventListener('eisen:installed', () => { if (win.classList.contains('open')) render(); });
  document.addEventListener('eisen:open', e => { if (e.detail === 'appcenter') render(); });
  win.style.width = Math.min(1040, innerWidth - 20) + 'px'; win.style.height = Math.min(660, innerHeight - 70) + 'px';
  render();
})();

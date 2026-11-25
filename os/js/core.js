/* EISENKU OS · Núcleo de apps: registro, ventanas dinámicas, iconos, instalación, notificaciones y formularios
   (8.0, ampliado en 9.0: creación de ventanas reutilizable para apps de carga diferida e iconos sin manejadores en línea) */
(() => {
  'use strict';
  const E = window.EISEN, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], storage = E.storage, esc = E.esc;
  window.EISEN_HOOKS = window.EISEN_HOOKS || {};
  E.VERSION = (window.EISENKU && window.EISENKU.version) || '9.0';

  /* ---------- Categorías e iconos ---------- */
  const CATS = {
    Productividad: { label: 'Productividad y oficina', g: ['#2563eb', '#06b6d4'], ic: '💼' },
    Educación: { label: 'Educación y ciencia', g: ['#7c3aed', '#c084fc'], ic: '🎓' },
    Ciencia: { label: 'Educación y ciencia', g: ['#7c3aed', '#c084fc'], ic: '🔬' },
    Internet: { label: 'Internet y comunicación', g: ['#0891b2', '#22d3ee'], ic: '🌐' },
    Multimedia: { label: 'Multimedia y entretenimiento', g: ['#db2777', '#f472b6'], ic: '🎬' },
    Sistema: { label: 'Herramientas del sistema', g: ['#475569', '#94a3b8'], ic: '🛠️' },
    Creatividad: { label: 'Edición y creatividad', g: ['#ea580c', '#fbbf24'], ic: '🎨' },
    Desarrollo: { label: 'Desarrollo', g: ['#16a34a', '#4ade80'], ic: '💻' },
    Juegos: { label: 'Juegos', g: ['#dc2626', '#fb923c'], ic: '🎮' }
  };
  E.CATS = CATS;
  const catOf = c => CATS[c] || CATS.Sistema;
  E.tile = (app, size = 44, extra = '') => {
    app = app || {};
    const g = app.grad || catOf(app.cat).g;
    // 9.0: sin onload/onerror en línea (compatible con CSP); un único escuchador global marca o retira la imagen
    const img = app.img && /^(https:|data:image\/|blob:)/i.test(String(app.img)) ? `<img class="ico-img" src="${esc(app.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '';
    return `<span class="ico-tile ${esc(extra)}" style="--s:${+size || 44}px;--g1:${esc(g[0])};--g2:${esc(g[1])}">${img}<b>${esc(app.icon || '◆')}</b></span>`;
  };
  document.addEventListener('load', e => { const t = e.target; if (t && t.classList && t.classList.contains('ico-img') && t.naturalWidth > 1) t.classList.add('ok'); }, true);
  document.addEventListener('error', e => { const t = e.target; if (t && t.classList && t.classList.contains('ico-img')) t.remove(); }, true);

  /* ---------- Formularios modales (sustituyen prompt() en lo nuevo) ---------- */
  E.form = ({ title, fields = [], ok = 'Aceptar', cancel = 'Cancelar', html = '' }) => new Promise(res => {
    const ov = document.createElement('div'); ov.className = 'eis-modal';
    ov.innerHTML = `<form class="eis-modal-card"><h3>${esc(title)}</h3>${html}${fields.map((f, i) => `<label class="eis-field"><span>${esc(f.label || '')}</span>${
      f.type === 'select' ? `<select class="input-text" name="${f.k}">${f.options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(f.value) === String(v) ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`
        : f.type === 'textarea' ? `<textarea class="input-text" name="${f.k}" rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}">${esc(f.value || '')}</textarea>`
          : `<input class="input-text" name="${f.k}" type="${f.type || 'text'}" value="${esc(f.value ?? '')}" placeholder="${esc(f.ph || '')}"${i === 0 ? ' autofocus' : ''}${f.req ? ' required' : ''}>`}</label>`).join('')}
      <div class="eis-modal-btns"><button type="button" class="btn-secondary" data-x>${esc(cancel)}</button><button class="btn-primary">${esc(ok)}</button></div></form>`;
    document.body.appendChild(ov);
    const fm = ov.querySelector('form'), done = v => { ov.remove(); res(v); };
    fm.onsubmit = e => { e.preventDefault(); const o = {}; fields.forEach(f => { o[f.k] = fm.elements[f.k].value; }); done(o); };
    ov.querySelector('[data-x]').onclick = () => done(null);
    ov.addEventListener('pointerdown', e => { if (e.target === ov) done(null); });
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') done(null); });
    setTimeout(() => { const f = fm.querySelector('[autofocus],input,select,textarea'); if (f) f.focus(); }, 30);
  });
  E.confirm = (title, text, ok = 'Aceptar') => E.form({ title, html: `<p class="eis-muted">${esc(text)}</p>`, ok }).then(v => !!v);

  /* ---------- Notificaciones ---------- */
  let nwrap;
  E.notify = (title, body = '', icon = '🔔', ms = 6000) => {
    if (!nwrap) { nwrap = document.createElement('div'); nwrap.id = 'eis-notes'; document.body.appendChild(nwrap); }
    const n = document.createElement('div'); n.className = 'eis-note';
    n.innerHTML = `<span class="eis-note-ic">${esc(icon)}</span><div><b>${esc(title)}</b><p>${esc(body)}</p></div><button aria-label="Cerrar">✕</button>`;
    n.querySelector('button').onclick = () => n.remove();
    nwrap.prepend(n); setTimeout(() => n.classList.add('out'), ms); setTimeout(() => n.remove(), ms + 400);
    const log = storage.get('notif_log', []); log.unshift({ title, body, icon, d: Date.now() }); storage.set('notif_log', log.slice(0, 80));
    document.dispatchEvent(new CustomEvent('eisen:notify'));
    try { if (storage.get('notif_sound', false)) { const ac = new (window.AudioContext || window.webkitAudioContext)(), o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; g.gain.value = .05; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + .12); } } catch { /* sin audio */ }
  };

  /* ---------- Registro de apps ---------- */
  const REG = {};
  E.REG = REG;
  const CORE = ['explorer', 'settings', 'browser', 'appcenter', 'terminal', 'assistant'];
  E.CORE_APPS = CORE;
  // apps de las versiones anteriores: se integran en el registro (sin tocar su HTML)
  const LEGACY = [
    { id: 'appcenter', name: 'EISEN Store', icon: '🛍️', cat: 'Sistema', desc: 'Instala apps, juegos y aplicaciones web.', grad: ['#0ea5e9', '#6366f1'] },
    { id: 'explorer', name: 'Archivos', icon: '📁', cat: 'Sistema', desc: 'Explorador de archivos con almacenamiento local.', grad: ['#f59e0b', '#fcd34d'] },
    { id: 'word', name: 'EISEN Writer', icon: '📝', cat: 'Productividad', desc: 'Procesador de textos con exportación a PDF.', grad: ['#1d4ed8', '#60a5fa'] },
    { id: 'excel', name: 'EISEN Sheets', icon: '📊', cat: 'Productividad', desc: 'Hojas de cálculo con fórmulas, CSV y gráfico.', grad: ['#15803d', '#4ade80'] },
    { id: 'pdf', name: 'PDF Studio', icon: '📕', cat: 'Productividad', desc: 'Visor de PDF con impresión.', grad: ['#b91c1c', '#f87171'] },
    { id: 'arcade', name: 'Game Hub', icon: '🎮', cat: 'Juegos', desc: 'Centro de juegos de EISENKU.', grad: ['#7c3aed', '#f43f5e'] },
    { id: 'browser', name: 'Navegador EISEN', icon: '🌐', cat: 'Internet', desc: 'Navegador con pestañas, buscador, historial y favoritos.', grad: ['#0284c7', '#38bdf8'] },
    { id: 'music', name: 'Música', icon: '🎵', cat: 'Multimedia', desc: 'Reproductor local, Spotify, YouTube y enlaces.', grad: ['#be185d', '#fb7185'] },
    { id: 'terminal', name: 'Terminal', icon: '⌨️', cat: 'Sistema', desc: 'Consola con más de 70 comandos.', grad: ['#111827', '#4b5563'] },
    { id: 'settings', name: 'Configuración', icon: '⚙️', cat: 'Sistema', desc: 'Personaliza entorno, tema, fondo y más.', grad: ['#334155', '#64748b'] }
  ];
  LEGACY.forEach(a => { REG[a.id] = Object.assign({ legacy: true }, a); });

  function syncCatalog(a) {
    const list = E.apps(), i = list.findIndex(x => x.id === a.id);
    const entry = { id: a.id, name: a.name, cat: a.cat, icon: a.icon, desc: a.desc, grad: a.grad };
    if (i >= 0) Object.assign(list[i], entry); else list.push(entry);
  }
  LEGACY.forEach(syncCatalog);

  // Crea la ventana estándar de una app (la usan registerApp y las apps 9.0 de carga diferida)
  E.createAppWindow = (a) => {
    let win = $('#win-' + a.id);
    if (win) return win;
    win = document.createElement('section');
    win.className = 'window app-window'; win.id = 'win-' + a.id;
    win.setAttribute('role', 'dialog'); win.setAttribute('aria-label', a.title || a.name);
    const W = Math.min(a.w || 720, window.innerWidth - 20), H = Math.min(a.h || 500, window.innerHeight - 70);
    const n = Object.keys(REG).length % 8;
    win.style.cssText = `width:${W}px;height:${H}px;left:${Math.max(0, Math.min(window.innerWidth - W, 90 + n * 26))}px;top:${Math.max(0, 30 + n * 22)}px;`;
    win.innerHTML = `<div class="window-header"><div class="window-title-area">${E.tile(a, 18, 'mini')}<span>${esc(a.title || a.name)}</span></div><div class="window-controls"><button class="win-ctrl-btn" data-act="min" aria-label="Minimizar">🗕</button><button class="win-ctrl-btn" data-act="max" aria-label="Maximizar">🗖</button><button class="win-ctrl-btn close" data-act="close" aria-label="Cerrar">✕</button></div></div><div class="window-body app-body${a.pad === false ? ' nopad' : ''}"></div>`;
    document.body.appendChild(win);
    E.wireWindow(win);
    if (document.querySelector('.window .rz')) ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach(d => { const h = document.createElement('div'); h.className = 'rz rz-' + d; h.dataset.dir = d; win.appendChild(h); });
    document.dispatchEvent(new CustomEvent('eisen:window-created', { detail: a.id }));
    return win;
  };

  E.registerApp = (a) => {
    REG[a.id] = a;
    syncCatalog(a);
    if (a.noWindow) return a;
    E.createAppWindow(a);
    if (a.init) {
      let done = false;
      (window.EISEN_HOOKS[a.id] = window.EISEN_HOOKS[a.id] || []).push(w => {
        if (!done) { done = true; try { a.init(w.querySelector('.app-body'), w); } catch (e) { console.error('init ' + a.id, e); w.querySelector('.app-body').innerHTML = '<p style="padding:20px">⚠️ Error al iniciar la app: ' + esc(e.message) + '</p>'; } }
        if (a.onOpen) try { a.onOpen(w.querySelector('.app-body'), w); } catch (e) { console.error(e); }
      });
    }
    return a;
  };

  /* ---------- Instalación ---------- */
  // installed: { id: true|false } — por defecto todas las apps integradas están instaladas; las web y Play se instalan desde la Tienda
  const inst = () => storage.get('installed', {}) || {};
  E.isInstalled = id => { if (CORE.includes(id)) return true; const v = inst()[id]; if (v !== undefined) return !!v; const r = REG[id]; if (r) return !r.optional; const e = E.apps().find(x => x.id === id); return !!(e && e.game); };
  E.setInstalled = (id, on) => { const m = inst(); m[id] = !!on; storage.set('installed', m); document.dispatchEvent(new CustomEvent('eisen:installed', { detail: { id, on } })); };
  E.installedApps = () => E.apps().filter(a => E.isInstalled(a.id) && (REG[a.id] || a.ext || a.user || a.game));

  /* ---------- Lanzar cualquier app por id ---------- */
  E.launch = (id, arg) => {
    const r = REG[id];
    if (r && r.launch) return r.launch(arg);
    if ($('#win-' + id)) { E.openWindow(id); if (r && r.onArg && arg != null) r.onArg(arg); return true; }
    const a = E.apps().find(x => x.id === id);
    if (a && (a.ext || a.url)) { E.ebOpenUrl(a.ext || a.url, true); return true; }
    if (a && a.game && E.playGame) { E.playGame(a.game); return true; }
    return false;
  };
  E.findApp = q => {
    q = String(q || '').toLowerCase().trim(); if (!q) return null;
    const list = E.apps();
    return list.find(a => a.id === q) || list.find(a => a.name.toLowerCase() === q) || list.find(a => a.name.toLowerCase().startsWith(q)) || list.find(a => a.name.toLowerCase().includes(q)) || list.find(a => (a.kw || '').includes(q));
  };

  /* ---------- utilidades compartidas ---------- */
  E.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  E.h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  E.download = (name, blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  E.saveToFiles = async (name, blob, folder = 'documents') => { const id = await E.vaultSave(name, blob, folder); E.toast('Guardado en Archivos › ' + ({ documents: 'Documentos', images: 'Imágenes', music: 'Música', downloads: 'Descargas' }[folder] || folder) + ': ', name); return id; };
  // Expresiones matemáticas seguras (sin eval): + - * / ^ % ( ) , funciones y constantes
  E.math = (() => {
    const F = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, ln: Math.log, log: Math.log10, log2: Math.log2, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign, min: Math.min, max: Math.max, pow: Math.pow, fact: n => { n = Math.round(n); if (n < 0 || n > 170) return NaN; let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, sind: x => Math.sin(x * Math.PI / 180), cosd: x => Math.cos(x * Math.PI / 180), tand: x => Math.tan(x * Math.PI / 180) };
    const C = { pi: Math.PI, e: Math.E, phi: (1 + Math.sqrt(5)) / 2, tau: Math.PI * 2 };
    function compile(src) {
      const s = String(src).replace(/π/g, 'pi').replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.').replace(/;/g, ',').replace(/\s+/g, '');
      const tk = s.match(/\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|[a-z_]\w*|\*\*|[-+*/^%(),!]/gi) || [];
      if (tk.join('') !== s) throw new Error('Carácter no válido');
      let i = 0;
      const peek = () => tk[i], next = () => tk[i++];
      function expr() { let n = term(); while (peek() === '+' || peek() === '-') { const o = next(), r = term(), l = n; n = o === '+' ? v => l(v) + r(v) : v => l(v) - r(v); } return n; }
      function term() { let n = unary(); while (peek() === '*' || peek() === '/' || peek() === '%' || (peek() && /^[a-z(\d.]/i.test(peek()))) { const o = /^[*/%]$/.test(peek()) ? next() : '*', r = unary(), l = n; n = o === '*' ? v => l(v) * r(v) : o === '/' ? v => l(v) / r(v) : v => l(v) % r(v); } return n; }
      function unary() { if (peek() === '-') { next(); const u = unary(); return v => -u(v); } if (peek() === '+') { next(); return unary(); } return power(); }
      function power() { let b = postfix(); if (peek() === '^' || peek() === '**') { next(); const e = unary(), l = b; b = v => Math.pow(l(v), e(v)); } return b; }
      function postfix() { let p = prim(); while (peek() === '!') { next(); const l = p; p = v => F.fact(l(v)); } return p; }
      function prim() {
        const t = next(); if (t == null) throw new Error('Expresión incompleta');
        if (t === '(') { const n = expr(); if (next() !== ')') throw new Error('Falta )'); return n; }
        if (/^[\d.]/.test(t)) { const n = parseFloat(t); return () => n; }
        const k = t.toLowerCase();
        if (k === 'x') return v => v;
        if (F[k] && peek() === '(') { next(); const args = []; if (peek() !== ')') { args.push(expr()); while (peek() === ',') { next(); args.push(expr()); } } if (next() !== ')') throw new Error('Falta )'); return v => F[k](...args.map(a => a(v))); }
        if (k in C) return () => C[k];
        throw new Error('Desconocido: ' + t);
      }
      const f = expr(); if (i < tk.length) throw new Error('Sobra: ' + tk[i]); return f;
    }
    return { compile, eval: (s, x = 0) => compile(s)(x) };
  })();
})();

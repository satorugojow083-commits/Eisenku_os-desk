/* EISENKU OS 9.0 · Apps de desarrollo: Editor de código, Editor JSON, Consola, Explorador de proyectos,
   Validador HTML, Formateador, Fragmentos, Generador de documentación y Entorno de pruebas.
   Todo es propio y sin dependencias. El código del usuario se ejecuta SIEMPRE aislado
   (iframe sandbox de origen opaco + Web Worker con límite de tiempo). */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, F = K.files;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)];
  const get = (k, d) => S.get('a9_' + k, d), put = (k, v) => S.set('a9_' + k, v);
  const baseName = n => String(n).replace(/\.[^.]+$/, '');
  const setTitle = (w, t) => { const s = w && w.querySelector('.window-title-area > span:not(.ico-tile)'); if (s) s.textContent = t; };
  const devDownload = (name, blob) => { const a = document.createElement('a'); a.__eisen = true; a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); HTMLAnchorElement.prototype.click.call(a); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const lineOf = (s, p) => { let n = 1; for (let i = 0; i < p && i < s.length; i++) if (s.charCodeAt(i) === 10) n++; return n; };
  const MAX_TEXT = 5 * 1024 * 1024;

  /* ======================================================================
     Resaltado de sintaxis
     ====================================================================== */
  const NUM = String.raw`\b(?:0[xX][\da-fA-F_]+|0[bBoO][\d_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?n?)\b`;
  const LANGS = {
    js: { re: new RegExp(String.raw`(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|(\x60(?:\\[\s\S]|[^\\\x60])*\x60?|'(?:\\.|[^\\'\n])*'?|"(?:\\.|[^\\"\n])*"?)|(${NUM})|(\b(?:break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|of|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield|async|await|from|interface|type|enum|implements)\b)|(\b(?:true|false|null|undefined|NaN|Infinity)\b)|([A-Za-z_$][\w$]*(?=\s*\())`, 'g'), cls: ['c', 's', 'n', 'k', 'l', 'f'] },
    py: { re: new RegExp(String.raw`(#[^\n]*)|((?:[rRbBfFuU]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^\\"\n])*"?|'(?:\\.|[^\\'\n])*'?))|(${NUM}j?)|(\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|match|case)\b)|(\b(?:True|False|None|self|cls)\b)|(@[\w.]+|[A-Za-z_]\w*(?=\s*\())`, 'g'), cls: ['c', 's', 'n', 'k', 'l', 'f'] },
    css: { re: /(\/\*[\s\S]*?(?:\*\/|$))|("(?:\\.|[^\\"\n])*"?|'(?:\\.|[^\\'\n])*'?)|(@[\w-]+|!important)|(#[\da-fA-F]{3,8}\b(?![^{]*\{)|-?\b\d*\.?\d+(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|rad|turn|fr|ch|ex|pt|cm|mm|in|dpi|dppx)?\b)|([\w-]+(?=\s*:[^{};]*[;}]))|([.#]?[A-Za-z_-][\w-]*(?=[^{};]*\{))/g, cls: ['c', 's', 'k', 'n', 'p', 't'] },
    html: { re: /(<!--[\s\S]*?(?:-->|$))|(<!DOCTYPE[^>]*>|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?(?:\]\]>|$))|(<\/?[A-Za-z][\w:.-]*)|(\s[A-Za-z_:@#][\w:.@-]*(?=\s*=))|(=\s*(?:"[^"]*"?|'[^']*'?))|(\/?>)|(&[#\w]+;)/g, cls: ['c', 'k', 't', 'a', 'v', 't', 'e'] },
    json: { re: /("(?:\\.|[^\\"\n])*"(?=\s*:))|("(?:\\.|[^\\"\n])*"?)|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(\b(?:true|false|null)\b)/g, cls: ['p', 's', 'n', 'l'] },
    md: { re: /(^#{1,6}[^\n]*)|(```[\s\S]*?(?:```|$)|`[^`\n]+`)|(\*\*[^*\n]+\*\*|__[^_\n]+__)|(\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_)|(!?\[[^\]\n]*\]\([^)\n]*\))|(^[ \t]*(?:[-*+]|\d+\.)[ \t])|(^>[^\n]*)/gm, cls: ['h', 's', 'b', 'i', 'a', 'k', 'c'] },
    sql: { re: /(--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:''|[^'])*'?|"[^"\n]*"?|`[^`\n]*`?)|(\b\d+(?:\.\d+)?\b)|(\b(?:select|from|where|and|or|not|insert|into|values|update|set|delete|create|table|drop|alter|add|column|join|left|right|inner|outer|full|cross|on|as|group|by|order|having|limit|offset|union|all|distinct|case|when|then|else|end|null|is|in|like|between|exists|primary|key|foreign|references|index|view|asc|desc|default|with|returning|unique|check|constraint|if|begin|commit|rollback)\b)|(\b(?:count|sum|avg|min|max|coalesce|now|cast|lower|upper|length|substr|round)\b(?=\s*\())/gi, cls: ['c', 's', 'n', 'k', 'f'] }
  };
  LANGS.xml = LANGS.html;
  const LANG_NAMES = { js: 'JavaScript', py: 'Python', css: 'CSS', html: 'HTML', xml: 'XML', json: 'JSON', md: 'Markdown', sql: 'SQL', text: tr('Texto sin formato') };
  const EXT_LANG = { js: 'js', mjs: 'js', cjs: 'js', jsx: 'js', ts: 'js', tsx: 'js', py: 'py', pyw: 'py', css: 'css', scss: 'css', less: 'css', html: 'html', htm: 'html', vue: 'html', svg: 'xml', xml: 'xml', json: 'json', webmanifest: 'json', md: 'md', markdown: 'md', sql: 'sql' };
  const langOf = name => EXT_LANG[F.extOf(name)] || 'text';
  const EXT_OF = { js: 'js', py: 'py', css: 'css', html: 'html', xml: 'xml', json: 'json', md: 'md', sql: 'sql', text: 'txt' };
  function hl(text, lang) {
    const L = LANGS[lang]; if (!L) return esc(text);
    let out = '', last = 0, m; L.re.lastIndex = 0;
    while ((m = L.re.exec(text))) {
      if (!m[0]) { L.re.lastIndex++; continue; }
      let g = 1; while (g < m.length && m[g] === undefined) g++;
      out += esc(text.slice(last, m.index)) + `<i class="h-${L.cls[g - 1]}">${esc(m[0])}</i>`;
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }
  K.highlight = hl; K.langOf = langOf;

  /* ---------- Área de código: textarea + capa resaltada + números de línea ---------- */
  function codeArea(host, o = {}) {
    host.innerHTML = `<div class="a9-ce${o.readOnly ? ' ro' : ''}"><div class="a9-ce-gut" aria-hidden="true"></div><div class="a9-ce-wrap"><pre class="a9-ce-hl" aria-hidden="true"><code></code></pre><textarea class="a9-ce-ta" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="${esc(o.label || tr('Código'))}"${o.readOnly ? ' readonly' : ''}></textarea></div></div>`;
    const root = host.firstElementChild, gut = q(root, '.a9-ce-gut'), pre = q(root, '.a9-ce-hl'), code = pre.firstChild, ta = q(root, 'textarea');
    let lang = o.lang || 'text', lines = 0, raf = 0;
    const LH = 20;
    const sync = () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gut.scrollTop = ta.scrollTop; };
    function paint() {
      raf = 0; const v = ta.value;
      code.innerHTML = (v.length > 400000 ? esc(v) : hl(v, lang)) + '\n ';
      const n = (v.match(/\n/g) || []).length + 1;
      if (n !== lines) { lines = n; const a = new Array(n); for (let i = 0; i < n; i++) a[i] = i + 1; gut.textContent = a.join('\n') + '\n '; }
      sync();
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(paint); };
    function ins(text) {
      ta.focus();
      if (!text && ta.selectionStart === ta.selectionEnd) return;
      let ok = false; try { ok = text ? document.execCommand('insertText', false, text) : document.execCommand('delete'); } catch { ok = false; }
      if (!ok) { ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    const scrollTo = p => { const ln = lineOf(ta.value, p); ta.scrollTop = Math.max(0, (ln - 1) * LH - ta.clientHeight / 2); sync(); };
    const COMMENT = { js: '//', py: '#', sql: '--' };
    ta.addEventListener('input', () => { schedule(); o.onInput && o.onInput(); });
    ta.addEventListener('scroll', sync);
    ta.addEventListener('keydown', e => {
      if (o.readOnly) return;
      const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
      if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        if (s !== en && v.slice(s, en).includes('\n')) { const block = v.slice(ls, en), nb = e.shiftKey ? block.replace(/^( {1,2}|\t)/gm, '') : block.replace(/^/gm, '  '); ta.setSelectionRange(ls, en); ins(nb); ta.setSelectionRange(ls, ls + nb.length); }
        else if (e.shiftKey) { const m = v.slice(ls).match(/^( {1,2}|\t)/); if (m) { ta.setSelectionRange(ls, ls + m[0].length); ins(''); ta.setSelectionRange(Math.max(ls, s - m[0].length), Math.max(ls, s - m[0].length)); } }
        else ins('  ');
      } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const ls = v.lastIndexOf('\n', s - 1) + 1, line = v.slice(ls, s); let ind = (line.match(/^[ \t]*/) || [''])[0];
        const opens = /[{[(]\s*$/.test(line) || (lang === 'py' && /:\s*(#.*)?$/.test(line)) || (/^(html|xml)$/.test(lang) && /<([a-z][\w-]*)(?:\s[^>]*)?>\s*$/i.test(line) && !/<\/|\/>\s*$/.test(line));
        e.preventDefault();
        if (opens && /^\s*[}\])]/.test(v.slice(s, s + 3))) { ins('\n' + ind + '  \n' + ind); ta.setSelectionRange(s + ind.length + 3, s + ind.length + 3); }
        else ins('\n' + ind + (opens ? '  ' : ''));
      } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const ls = v.lastIndexOf('\n', s - 1) + 1, le0 = v.indexOf('\n', Math.max(s, en - 1)), le = le0 < 0 ? v.length : le0, block = v.slice(ls, le); let nb;
        if (COMMENT[lang]) { const c = COMMENT[lang], ls2 = block.split('\n'), all = ls2.every(l => !l.trim() || l.trimStart().startsWith(c)); nb = ls2.map(l => !l.trim() ? l : all ? l.replace(new RegExp('^(\\s*)' + reEsc(c) + ' ?'), '$1') : l.replace(/^(\s*)/, '$1' + c + ' ')).join('\n'); }
        else { const [a, z] = lang === 'css' ? ['/*', '*/'] : ['<!--', '-->'], t = block.trim(); nb = t.startsWith(a) && t.endsWith(z) ? block.replace(a + ' ', '').replace(a, '').replace(' ' + z, '').replace(z, '') : block.replace(/^(\s*)([\s\S]*?)(\s*)$/, `$1${a} $2 ${z}$3`); }
        ta.setSelectionRange(ls, le); ins(nb); ta.setSelectionRange(ls, ls + nb.length);
      }
    });
    const api = {
      el: root, ta,
      get value() { return ta.value; }, set value(v) { ta.value = v; paint(); },
      get lang() { return lang; }, setLang(l) { lang = l; paint(); },
      focus() { ta.focus(); }, ins, paint,
      select(a, z) { ta.focus(); ta.setSelectionRange(a, z); scrollTo(a); },
      goto(line, col = 1) { const v = ta.value; let p = 0; for (let i = 1; i < line; i++) { const nx = v.indexOf('\n', p); if (nx < 0) break; p = nx + 1; } p = Math.min(v.length, p + col - 1); api.select(p, p); },
      cursor() { const p = ta.selectionStart, v = ta.value.slice(0, p), ln = (v.match(/\n/g) || []).length + 1; return { line: ln, col: p - v.lastIndexOf('\n'), sel: ta.selectionEnd - p }; },
      wrap(on) { ta.wrap = on ? 'soft' : 'off'; root.classList.toggle('wrap', !!on); paint(); },
      font(px) { root.style.setProperty('--ce-fs', px + 'px'); root.style.setProperty('--ce-lh', Math.round(px * 1.54) + 'px'); paint(); }
    };
    paint(); return api;
  }
  K.codeArea = codeArea;

  /* ======================================================================
     Entorno aislado para ejecutar JavaScript del usuario
     iframe sandbox="allow-scripts" (origen opaco: sin acceso a los datos de EISENKU)
     + Web Worker dentro (se puede terminar si se cuelga: protege contra bucles infinitos).
     ====================================================================== */
  function sbCore(post, exec) {
    const tn = v => Object.prototype.toString.call(v).slice(8, -1);
    function show(v, d, seen) {
      d = d || 0; seen = seen || new WeakSet();
      try {
        if (v === null) return 'null';
        switch (typeof v) {
          case 'undefined': return 'undefined';
          case 'string': return JSON.stringify(v.length > 5000 ? v.slice(0, 5000) + '…' : v);
          case 'number': return Object.is(v, -0) ? '-0' : String(v);
          case 'bigint': return v + 'n';
          case 'boolean': case 'symbol': return String(v);
          case 'function': { const src = Function.prototype.toString.call(v); return /^class\b/.test(src) ? 'class ' + (v.name || '') : 'ƒ ' + (v.name || '') + '()'; }
        }
        if (seen.has(v)) return '[Circular]'; seen.add(v);
        if (v instanceof Error) return v.name + ': ' + v.message;
        if (v instanceof Date) return isNaN(v) ? 'Invalid Date' : v.toISOString();
        if (v instanceof RegExp) return String(v);
        if (typeof Promise !== 'undefined' && v instanceof Promise) return 'Promise {…}';
        if (d > 4) return Array.isArray(v) ? '[…]' : '{…}';
        if (Array.isArray(v) || ArrayBuffer.isView(v)) { const len = v.length, a = Array.prototype.slice.call(v, 0, 100).map(x => show(x, d + 1, seen)); return (Array.isArray(v) ? '' : tn(v) + '(' + len + ') ') + '[' + a.join(', ') + (len > 100 ? ', … ' + (len - 100) + ' más' : '') + ']'; }
        if (v instanceof Map) return 'Map(' + v.size + ') {' + Array.from(v).slice(0, 50).map(p => show(p[0], d + 1, seen) + ' => ' + show(p[1], d + 1, seen)).join(', ') + '}';
        if (v instanceof Set) return 'Set(' + v.size + ') {' + Array.from(v).slice(0, 50).map(x => show(x, d + 1, seen)).join(', ') + '}';
        const ks = Object.keys(v), c = v.constructor, nm = c && c !== Object && c.name ? c.name + ' ' : '';
        return nm + '{' + ks.slice(0, 60).map(k => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + show(v[k], d + 1, seen)).join(', ') + (ks.length > 60 ? ', …' : '') + '}';
      } catch (e) { return '[' + tn(v) + ']'; }
    }
    const cut = s => s.length > 20000 ? s.slice(0, 20000) + '… (' + s.length + ' caracteres)' : s;
    let cur = 0;
    const logf = lvl => function () { const a = Array.prototype.slice.call(arguments); post({ t: 'log', id: cur, lvl: lvl, text: cut(a.map(x => typeof x === 'string' ? x : show(x)).join(' ')) }); };
    const C = self.console || (self.console = {});
    C.log = logf('log'); C.info = logf('info'); C.warn = logf('warn'); C.error = logf('error'); C.debug = logf('log'); C.dir = logf('log');
    C.table = d => post({ t: 'log', id: cur, lvl: 'log', text: cut(show(d)) });
    C.clear = () => post({ t: 'clear' });
    C.assert = function (c) { if (!c) logf('error').apply(null, ['Aserción fallida:'].concat(Array.prototype.slice.call(arguments, 1))); };
    const timers = {}, counts = {};
    C.time = l => { timers[l || 'default'] = performance.now(); };
    C.timeEnd = l => { l = l || 'default'; if (timers[l] != null) { logf('log')(l + ': ' + (performance.now() - timers[l]).toFixed(2) + ' ms'); delete timers[l]; } };
    C.count = l => { l = l || 'default'; counts[l] = (counts[l] || 0) + 1; logf('log')(l + ': ' + counts[l]); };
    const errText = e => (!e || typeof e !== 'object') ? 'Error: ' + show(e) : (e.name || 'Error') + ': ' + e.message;
    const STMT = /^\s*(?:function|class|var|let|const|if|for|while|do|switch|try|import|export|return|throw|async\s+function)\b/;
    return async function run(m) {
      if (!m || m.t !== 'run') return;
      cur = m.id; const t0 = performance.now();
      try {
        let expr = false, v;
        if (!m.stmt && !STMT.test(m.code)) { try { exec('self.__k9r = (async () => (\n' + m.code + '\n))();'); expr = true; } catch (er) { if (!(er instanceof SyntaxError)) throw er; } }
        if (expr) v = await self.__k9r;
        else {
          try { exec(m.code + '\n;self.__k9r = void 0;'); }
          catch (er) { if (er instanceof SyntaxError && /\bawait\b/.test(m.code)) { exec('self.__k9r = (async () => {\n' + m.code + '\n})();'); v = await self.__k9r; } else throw er; }
        }
        post({ t: 'done', id: m.id, ok: true, text: m.quiet || m.raw ? '' : cut(show(v)), value: m.raw ? v : undefined, ms: performance.now() - t0 });
      } catch (er) { post({ t: 'done', id: m.id, ok: false, text: errText(er), ms: performance.now() - t0 }); }
    };
  }
  const WORKER_SRC = `const sbCore = ${sbCore};\nconst __run = sbCore(m => postMessage(m), src => { const u = URL.createObjectURL(new Blob([src], { type: 'text/javascript' })); try { importScripts(u); } finally { URL.revokeObjectURL(u); } });\nself.onmessage = e => __run(e.data);\npostMessage({ t: 'ready', mode: 'worker' });`;
  function frameMain(WSRC) {
    const send = m => parent.postMessage(Object.assign({ __k9sb: 1 }, m), '*');
    let wk = null, inline = null;
    function boot() {
      try { wk = new Worker(URL.createObjectURL(new Blob([WSRC], { type: 'text/javascript' }))); wk.onmessage = e => send(e.data); wk.onerror = e => { e.preventDefault(); send({ t: 'fatal', text: e.message || 'Worker no disponible' }); }; }
      catch (e) { wk = null; send({ t: 'fatal', text: String(e && e.message || e) }); }
    }
    // sin Worker (navegadores antiguos): se ejecuta en este iframe aislado inyectando scripts en línea
    function useInline() {
      if (wk) { wk.terminate(); wk = null; }
      inline = window.__sbCore(send, src => { let err = null; const h = ev => { err = ev.error || new Error(ev.message); ev.preventDefault(); }; addEventListener('error', h); const s = document.createElement('script'); s.textContent = src; document.head.appendChild(s); s.remove(); removeEventListener('error', h); if (err) throw err; });
      send({ t: 'ready', mode: 'inline' });
    }
    addEventListener('message', e => {
      if (e.source !== parent) return; const m = e.data || {};
      if (m.t === 'reset') { if (wk) { wk.terminate(); boot(); } }
      else if (m.t === 'inline') { try { useInline(); } catch (er) { send({ t: 'fatal', text: 'Sin entorno de ejecución: ' + er.message }); } }
      else if (wk) wk.postMessage(m); else if (inline) inline(m);
    });
    boot();
  }
  const SB_HTML = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:; connect-src https:; img-src https: data: blob:"><script>window.__sbCore = ${sbCore};</script><script>(${frameMain})(${JSON.stringify(WORKER_SRC)});</script>`;
  function Sandbox(onEvent, o = {}) {
    let fr = null, ready = false, mode = '', seq = 0, tried = false; const pend = new Map(), queue = [];
    const post = m => fr && fr.contentWindow && fr.contentWindow.postMessage(m, '*');
    function boot() {
      if (fr) fr.remove(); ready = false; tried = false;
      fr = document.createElement('iframe'); fr.setAttribute('sandbox', 'allow-scripts'); fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1; fr.title = 'sandbox';
      fr.style.cssText = 'position:fixed;width:1px;height:1px;left:-9px;top:-9px;border:0;opacity:0;pointer-events:none';
      fr.srcdoc = SB_HTML; document.body.appendChild(fr);
    }
    const h = e => {
      if (!fr || e.source !== fr.contentWindow) return; const m = e.data; if (!m || !m.__k9sb) return;
      if (m.t === 'ready') { ready = true; mode = m.mode; onEvent && onEvent({ t: 'mode', mode }); while (queue.length) post(queue.shift()); return; }
      if (m.t === 'fatal') { if (!ready && !tried) { tried = true; post({ t: 'inline' }); return; } pend.forEach(p => { clearTimeout(p.timer); p.res({ ok: false, text: m.text }); }); pend.clear(); onEvent && onEvent({ t: 'fatal', text: m.text }); return; }
      if (m.t === 'done') { const p = pend.get(m.id); if (p) { clearTimeout(p.timer); pend.delete(m.id); p.res(m); } return; }
      onEvent && onEvent(m);
    };
    window.addEventListener('message', h);
    boot();
    const api = {
      get mode() { return mode; }, get ready() { return ready; },
      run(code, ro = {}) {
        return new Promise(res => {
          const id = ++seq, ms = ro.timeout || o.timeout || 8000;
          const timer = setTimeout(() => { pend.delete(id); res({ ok: false, timeout: true, text: tr('Tiempo agotado') + ` (${Math.round(ms / 1000)} s): ${tr('¿un bucle infinito? El entorno se ha reiniciado.')}` }); api.reset(); }, ms);
          pend.set(id, { res, timer });
          const m = { __k9sb: 1, t: 'run', id, code, stmt: !!ro.stmt, quiet: !!ro.quiet, raw: !!ro.raw };
          ready ? post(m) : queue.push(m);
        });
      },
      reset() { pend.forEach(p => { clearTimeout(p.timer); p.res({ ok: false, text: tr('Entorno reiniciado') }); }); pend.clear(); if (mode === 'worker' && ready) { ready = false; post({ t: 'reset' }); } else boot(); },
      whenReady() { return new Promise(r => { const t0 = Date.now(); const ck = () => ready || Date.now() - t0 > 4000 ? r(ready) : setTimeout(ck, 30); ck(); }); },
      destroy() { window.removeEventListener('message', h); pend.forEach(p => clearTimeout(p.timer)); if (fr) fr.remove(); fr = null; }
    };
    return api;
  }
  K.Sandbox = Sandbox;

  /* ======================================================================
     Editor de código
     ====================================================================== */
  K.define('codeeditor', {
    init(b, w, arg) {
      const st = { tabs: [], cur: -1, wrap: !!get('ce_wrap', false), fs: +get('ce_fs', 13) || 13 };
      b.innerHTML = `<div class="k9 a9-code"><div class="k9-bar">
        <button class="k9-btn" data-a="new">${I('file', 15)} ${esc(tr('Nuevo'))}</button><button class="k9-btn" data-a="open" title="Ctrl+O">${I('folder', 15)} ${esc(tr('Abrir'))}</button><button class="k9-btn pri" data-a="save" title="Ctrl+S">${I('save', 15)} ${esc(tr('Guardar'))}</button><button class="k9-btn" data-a="saveas">${esc(tr('Guardar como…'))}</button>
        <span class="sp"></span><button class="k9-btn" data-a="find" title="${esc(tr('Buscar y reemplazar'))} (Ctrl+F)" aria-label="${esc(tr('Buscar y reemplazar'))}">${I('search', 15)}</button><button class="k9-btn" data-a="goto" title="${esc(tr('Ir a la línea'))} (Ctrl+G)">Ln</button><button class="k9-btn" data-a="wrap" title="${esc(tr('Ajuste de línea'))}" aria-label="${esc(tr('Ajuste de línea'))}">↩</button><button class="k9-btn" data-a="fsm" aria-label="${esc(tr('Reducir letra'))}">A−</button><button class="k9-btn" data-a="fsp" aria-label="${esc(tr('Aumentar letra'))}">A+</button><button class="k9-btn" data-a="preview" title="${esc(tr('Vista previa aislada (HTML) o en el Editor Markdown'))}">${I('eye', 15)}</button>
        <select class="input-text" data-lang aria-label="${esc(tr('Lenguaje'))}">${Object.entries(LANG_NAMES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></div>
        <div class="a9-code-tabs" data-tabs role="tablist"></div>
        <div class="k9-bar a9-find" data-findbar hidden><input class="input-text" data-fq placeholder="${esc(tr('Buscar'))}" style="width:180px"><input class="input-text" data-fr placeholder="${esc(tr('Reemplazar con'))}" style="width:160px"><label class="k9-small k9-row" title="${esc(tr('Distinguir mayúsculas'))}"><input type="checkbox" data-fcase> Aa</label><label class="k9-small k9-row" title="${esc(tr('Expresión regular'))}"><input type="checkbox" data-fre> .*</label><span class="k9-small k9-muted" data-fcount></span><span class="sp"></span><button class="k9-btn" data-a="fprev" aria-label="${esc(tr('Anterior'))}">↑</button><button class="k9-btn" data-a="fnext" aria-label="${esc(tr('Siguiente'))}">↓</button><button class="k9-btn" data-a="frep">${esc(tr('Reemplazar'))}</button><button class="k9-btn" data-a="frepall">${esc(tr('Reemplazar todo'))}</button><button class="k9-btn" data-a="fclose" aria-label="${esc(tr('Cerrar'))}">✕</button></div>
        <div class="a9-code-ed" data-ed></div>
        <div class="k9-status"><span data-pos></span><span data-len></span><span style="margin-left:auto" data-langn></span><span>UTF-8 · LF</span></div></div>`;
      const persist = debounce(() => put('code_session', { tabs: st.tabs.map(t => ({ id: t.id, name: t.name, folder: t.folder, lang: t.lang, dirty: t.dirty, text: (!t.id || t.dirty) && t.text.length < 200000 ? t.text : null })), cur: st.cur }), 700);
      const ed = codeArea(q(b, '[data-ed]'), { onInput: () => { const t = st.tabs[st.cur]; if (!t) return; t.text = ed.value; if (!t.dirty) { t.dirty = true; tabs(); } persist(); status(); } });
      ed.wrap(st.wrap); ed.font(st.fs);
      function status() { const t = st.tabs[st.cur]; if (!t) return; const c = ed.cursor(); q(b, '[data-pos]').textContent = `${tr('Ln')} ${c.line}, ${tr('Col')} ${c.col}${c.sel ? ` (${c.sel} ${tr('seleccionados')})` : ''}`; q(b, '[data-len]').textContent = `${ed.value.length.toLocaleString(K.locale)} ${tr('caracteres')}`; q(b, '[data-langn]').textContent = LANG_NAMES[t.lang] || t.lang; }
      ['keyup', 'click'].forEach(ev => ed.ta.addEventListener(ev, status));
      function tabs() {
        q(b, '[data-tabs]').innerHTML = st.tabs.map((t, i) => `<div class="a9-ctab${i === st.cur ? ' on' : ''}" role="tab" aria-selected="${i === st.cur}" data-tab="${i}" title="${esc(t.folder ? F.pretty(t.folder) + ' › ' + t.name : t.name)}"><span>${esc(t.name)}</span>${t.dirty ? `<i class="a9-dirty" title="${esc(tr('Sin guardar'))}">●</i>` : ''}<button data-close="${i}" aria-label="${esc(tr('Cerrar'))} ${esc(t.name)}">✕</button></div>`).join('') + `<button class="a9-ctab-add" data-a="new" aria-label="${esc(tr('Nuevo'))}">＋</button>`;
      }
      function activate(i) {
        const o = st.tabs[st.cur]; if (o && st.cur !== i) { o.text = ed.value; o.scroll = ed.ta.scrollTop; o.sel = [ed.ta.selectionStart, ed.ta.selectionEnd]; }
        st.cur = i; const t = st.tabs[i]; if (!t) return;
        ed.setLang(t.lang); ed.value = t.text; ed.ta.scrollTop = t.scroll || 0; if (t.sel) ed.ta.setSelectionRange(t.sel[0], t.sel[1]); ed.paint();
        q(b, '[data-lang]').value = t.lang; setTitle(w, t.name + ' — ' + tr('Editor de código')); tabs(); status(); persist();
      }
      function add(t) { const ex = t.id ? st.tabs.findIndex(x => x.id === t.id) : -1; if (ex >= 0) return activate(ex); st.tabs.push(Object.assign({ id: null, name: tr('sin título') + '.js', folder: 'documents', lang: 'js', text: '', dirty: false }, t)); activate(st.tabs.length - 1); }
      async function openId(id) { const f = await F.get(id); if (!f) return E.toast(tr('El archivo ya no existe')); if (f.size > MAX_TEXT) return K.ui.alert(tr('Archivo demasiado grande'), tr('El editor abre archivos de texto de hasta 5 MB.')); add({ id: f.id, name: f.name, folder: f.folder || 'documents', lang: langOf(f.name), text: await f.blob.text() }); K.activity('file', 'codeeditor', f.name); }
      async function save(t, as) {
        if (!t) return;
        if (!t.id || as) {
          const r = await E.form({ title: as ? tr('Guardar como') : tr('Guardar archivo'), fields: [{ k: 'n', label: tr('Nombre'), value: t.id && as ? baseName(t.name) + ' (copia).' + (F.extOf(t.name) || EXT_OF[t.lang]) : (/\.\w+$/.test(t.name) && !t.name.startsWith(tr('sin título')) ? t.name : 'archivo.' + (EXT_OF[t.lang] || 'txt')) }, { k: 'f', label: tr('Carpeta'), type: 'select', options: F.ROOTS.map(r => [r[0], tr(r[1])]).concat((S.get('fs9_dirs', []) || []).map(d => [d, F.pretty(d)])), value: t.folder || 'documents' }], ok: tr('Guardar') });
          if (!r || !r.n.trim()) return;
          const name = await F.uniqueName(r.f, F.cleanName(r.n.trim()));
          t.id = await F.save(name, new Blob([ed.value], { type: F.typeOf({ name }) }), r.f); t.name = name; t.folder = r.f;
          if (t.lang === 'text' || !st.tabs.includes(t)) t.lang = langOf(name);
        } else await F.writeText(t.id, ed.value, F.typeOf({ name: t.name }));
        t.text = ed.value; t.dirty = false; tabs(); persist(); setTitle(w, t.name + ' — ' + tr('Editor de código')); E.toast(tr('Guardado en Archivos') + ': ' + t.name);
      }
      async function close(i) {
        const t = st.tabs[i]; if (!t) return;
        if (t.dirty && !await E.confirm(tr('Cerrar sin guardar'), `«${t.name}» ${tr('tiene cambios sin guardar. ¿Cerrar de todos modos?')}`)) return;
        st.tabs.splice(i, 1); if (!st.tabs.length) { st.cur = -1; add({}); return; }
        st.cur = -1; activate(Math.min(i, st.tabs.length - 1));
      }
      // buscar y reemplazar
      const fq = q(b, '[data-fq]'), fr = q(b, '[data-fr]');
      const fRe = () => { const v = fq.value; if (!v) return null; try { return new RegExp(q(b, '[data-fre]').checked ? v : reEsc(v), 'g' + (q(b, '[data-fcase]').checked ? '' : 'i')); } catch { return false; } };
      const matches = () => { const re = fRe(); if (!re) return re; const out = [], v = ed.value; let m; while ((m = re.exec(v)) && out.length < 20000) { if (!m[0]) { re.lastIndex++; continue; } out.push([m.index, m.index + m[0].length]); } return out; };
      const fcount = t => { q(b, '[data-fcount]').textContent = t; };
      function step(dir) { const l = matches(); if (l === false) return fcount(tr('Expresión no válida')); if (!l || !l.length) return fcount(l ? tr('Sin resultados') : ''); const p = dir > 0 ? ed.ta.selectionEnd : ed.ta.selectionStart; let i = dir > 0 ? l.findIndex(m => m[0] >= p) : l.map(m => m[1] <= p).lastIndexOf(true); if (i < 0) i = dir > 0 ? 0 : l.length - 1; ed.select(l[i][0], l[i][1]); fcount(`${i + 1} ${tr('de')} ${l.length}`); fq.focus(); }
      function repOne() { const re = fRe(); if (!re) return; const s = ed.ta.selectionStart, e2 = ed.ta.selectionEnd, sel = ed.value.slice(s, e2); const one = new RegExp(re.source, re.flags.replace('g', '')); const m = sel.match(one); if (m && m[0] === sel) { ed.ins(q(b, '[data-fre]').checked ? sel.replace(one, fr.value) : fr.value); } step(1); }
      function repAll() { const re = fRe(); if (!re) return; const v = ed.value; let n = 0; const nv = v.replace(re, (...a) => { n++; return q(b, '[data-fre]').checked ? a[0].replace(new RegExp(re.source, re.flags.replace('g', '')), fr.value) : fr.value; }); if (!n) return fcount(tr('Sin resultados')); ed.ta.focus(); ed.ta.setSelectionRange(0, v.length); ed.ins(nv); fcount(`${n} ${tr('reemplazos')}`); }
      fq.addEventListener('input', () => { const l = matches(); fcount(l === false ? tr('Expresión no válida') : l ? `${l.length} ${tr('coincidencias')}` : ''); });
      fq.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1); } if (e.key === 'Escape') q(b, '[data-findbar]').hidden = true; });
      fr.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); repOne(); } });
      const showFind = () => { const fb = q(b, '[data-findbar]'); fb.hidden = false; const s = ed.value.slice(ed.ta.selectionStart, ed.ta.selectionEnd); if (s && !s.includes('\n')) fq.value = s; fq.focus(); fq.select(); fq.dispatchEvent(new Event('input')); };
      async function gotoLine() { const v = await K.ui.prompt(tr('Ir a la línea'), tr('Línea[:columna]'), String(ed.cursor().line)); if (!v) return; const [l, c] = v.split(':').map(x => parseInt(x, 10)); if (l > 0) ed.goto(l, c > 0 ? c : 1); }
      async function act(a) {
        const t = st.tabs[st.cur];
        if (a === 'new') add({ lang: (t && t.lang) || 'js', name: tr('sin título') + '.' + (EXT_OF[(t && t.lang) || 'js'] || 'txt') });
        if (a === 'open') { const f = await F.pick({ title: tr('Abrir archivo de texto o código'), accept: f => F.kindOf(f) === 'text' || /\.(js|mjs|ts|tsx|jsx|py|css|scss|less|html?|xml|svg|json|md|markdown|sql|txt|csv|ini|cfg|conf|yml|yaml|toml|sh|bat|ps1|java|c|h|cpp|cs|go|rs|php|rb|lua|kt|swift|log)$/i.test(f.name), deviceAccept: '.js,.mjs,.ts,.tsx,.jsx,.py,.css,.scss,.html,.htm,.xml,.svg,.json,.md,.sql,.txt,.csv,.yml,.yaml,.toml,.sh,.bat,.java,.c,.cpp,.cs,.go,.rs,.php,.rb,.log,text/*', folder: 'documents' }); if (f) openId(f.id); }
        if (a === 'save') save(t); if (a === 'saveas') save(t, true);
        if (a === 'find') showFind(); if (a === 'fclose') q(b, '[data-findbar]').hidden = true; if (a === 'fnext') step(1); if (a === 'fprev') step(-1); if (a === 'frep') repOne(); if (a === 'frepall') repAll();
        if (a === 'goto') gotoLine();
        if (a === 'wrap') { st.wrap = !st.wrap; put('ce_wrap', st.wrap); ed.wrap(st.wrap); q(b, '[data-a="wrap"]').classList.toggle('on', st.wrap); }
        if (a === 'fsm' || a === 'fsp') { st.fs = Math.max(10, Math.min(24, st.fs + (a === 'fsp' ? 1 : -1))); put('ce_fs', st.fs); ed.font(st.fs); }
        if (a === 'preview' && t) { if (/^(html|xml)$/.test(t.lang)) E.ebOpenHtml(t.name, ed.value, true); else if (t.lang === 'md') E.ebOpenHtml(t.name, '<meta charset="utf-8"><style>body{font:15px/1.6 system-ui,sans-serif;max-width:820px;margin:2rem auto;padding:0 1rem}pre{background:#f4f5f6;padding:10px;border-radius:8px;overflow:auto}code{background:#f0f2f4;padding:1px 4px;border-radius:4px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}</style>' + K.md(ed.value).html, true); else E.toast(tr('La vista previa está disponible para HTML, XML y Markdown')); }
      }
      q(b, '[data-a="wrap"]').classList.toggle('on', st.wrap);
      b.addEventListener('click', e => {
        const c = e.target.closest('[data-close]'); if (c) { e.stopPropagation(); close(+c.dataset.close); return; }
        const tb = e.target.closest('[data-tab]'); if (tb) { activate(+tb.dataset.tab); return; }
        const a = e.target.closest('[data-a]'); if (a) act(a.dataset.a);
      });
      b.addEventListener('auxclick', e => { const tb = e.target.closest('[data-tab]'); if (tb && e.button === 1) close(+tb.dataset.tab); });
      q(b, '[data-lang]').addEventListener('change', e => { const t = st.tabs[st.cur]; if (t) { t.lang = e.target.value; ed.setLang(t.lang); status(); persist(); } });
      b.addEventListener('keydown', e => {
        const c = e.ctrlKey || e.metaKey, k = e.key.toLowerCase(); if (!c) return;
        if (k === 's') { e.preventDefault(); save(st.tabs[st.cur], e.shiftKey); } else if (k === 'o') { e.preventDefault(); act('open'); } else if (k === 'f' || k === 'h') { e.preventDefault(); showFind(); } else if (k === 'g') { e.preventDefault(); gotoLine(); }
      });
      this.onArg = a2 => { if (!a2) return; if (a2.fileId) openId(a2.fileId); else if (a2.text != null) add({ name: a2.name || tr('sin título') + '.txt', lang: a2.lang || langOf(a2.name || ''), text: String(a2.text), dirty: true }); };
      // restaurar la sesión anterior
      (async () => {
        const ss = get('code_session', null);
        if (ss && Array.isArray(ss.tabs)) for (const t of ss.tabs.slice(0, 20)) { if (t.text != null) st.tabs.push({ id: t.id, name: t.name, folder: t.folder, lang: t.lang || 'text', dirty: !!t.dirty, text: t.text }); else if (t.id) { const f = await F.get(t.id); if (f && !f.trash && f.size <= MAX_TEXT) st.tabs.push({ id: f.id, name: f.name, folder: f.folder, lang: t.lang || langOf(f.name), dirty: false, text: await f.blob.text() }); } }
        if (!st.tabs.length) st.tabs.push({ id: null, name: tr('sin título') + '.js', folder: 'documents', lang: 'js', dirty: false, text: `// ${tr('Bienvenido al Editor de código de EISENKU OS')}\n// Ctrl+S ${tr('guarda')} · Ctrl+F ${tr('busca')} · Ctrl+/ ${tr('comenta')} · Tab ${tr('sangra')}\n\nfunction saludar(nombre) {\n  return \`Hola, \${nombre}\`;\n}\n\nconsole.log(saludar('EISENKU'));\n` });
        st.cur = -1; activate(Math.min(ss && ss.cur >= 0 ? ss.cur : 0, st.tabs.length - 1));
        if (arg) this.onArg(arg);
      })();
    }
  });

  /* ======================================================================
     Editor JSON
     ====================================================================== */
  function jsonCheck(s) {
    let i = 0; const n = s.length;
    const err = m => { throw { pos: i, msg: m }; };
    const ws = () => { while (i < n && (s[i] === ' ' || s[i] === '\t' || s[i] === '\n' || s[i] === '\r')) i++; };
    const str = () => { i++; while (i < n) { const c = s[i]; if (c === '"') { i++; return; } if (c === '\\') { const e = s[i + 1]; if (!/["\\/bfnrtu]/.test(e || '')) err(tr('Secuencia de escape no válida')); if (e === 'u' && !/^[\da-fA-F]{4}$/.test(s.substr(i + 2, 4))) err(tr('Escape \\u no válido')); i += e === 'u' ? 6 : 2; continue; } if (c < ' ') err(tr('Salto de línea o carácter de control dentro de una cadena (¿faltan comillas de cierre?)')); i++; } err(tr('Cadena sin cerrar')); };
    const val = depth => {
      if (depth > 2000) err(tr('Anidamiento demasiado profundo'));
      ws(); const c = s[i];
      if (c === '{') { i++; ws(); if (s[i] === '}') { i++; return; } for (;;) { ws(); if (s[i] !== '"') err(s[i] === "'" ? tr('Las claves deben ir entre comillas dobles, no simples') : s[i] === '}' ? tr('Coma sobrante antes de «}»') : tr('Se esperaba una clave entre comillas dobles')); str(); ws(); if (s[i] !== ':') err(tr('Se esperaban dos puntos «:» después de la clave')); i++; val(depth + 1); ws(); if (s[i] === ',') { i++; continue; } if (s[i] === '}') { i++; return; } err(tr('Se esperaba «,» o «}»')); } }
      if (c === '[') { i++; ws(); if (s[i] === ']') { i++; return; } for (;;) { ws(); if (s[i] === ']') err(tr('Coma sobrante antes de «]»')); val(depth + 1); ws(); if (s[i] === ',') { i++; continue; } if (s[i] === ']') { i++; return; } err(tr('Se esperaba «,» o «]»')); } }
      if (c === '"') return str();
      if (c === '-' || (c >= '0' && c <= '9')) { const m = s.slice(i, i + 400).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/); if (!m) err(tr('Número no válido')); i += m[0].length; return; }
      for (const wd of ['true', 'false', 'null']) if (s.startsWith(wd, i)) { i += wd.length; return; }
      if (c === "'") err(tr('Las cadenas deben ir entre comillas dobles'));
      err(i >= n ? tr('El texto termina antes de tiempo') : `${tr('Carácter inesperado')} «${c}»`);
    };
    try { val(0); ws(); if (i < n) err(tr('Contenido sobrante después del JSON')); return null; }
    catch (e) { if (e && e.pos != null) { const before = s.slice(0, e.pos); return { msg: e.msg, line: (before.match(/\n/g) || []).length + 1, col: e.pos - before.lastIndexOf('\n'), pos: e.pos }; } return { msg: String(e && e.message || e), line: 1, col: 1, pos: 0 }; }
  }
  const sortKeys = v => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.keys(v).sort((a, b) => a.localeCompare(b)).reduce((o, k) => { o[k] = sortKeys(v[k]); return o; }, {}) : v;
  const csvCell = x => { let s = x == null ? '' : typeof x === 'object' ? JSON.stringify(x) : String(x); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  function toCSV(v) {
    if (Array.isArray(v) && v.length && v.every(x => x && typeof x === 'object' && !Array.isArray(x))) { const keys = []; v.forEach(o => Object.keys(o).forEach(k => { if (!keys.includes(k)) keys.push(k); })); return [keys.map(csvCell).join(',')].concat(v.map(o => keys.map(k => csvCell(o[k])).join(','))).join('\r\n'); }
    if (Array.isArray(v)) return ['valor'].concat(v.map(csvCell)).join('\r\n');
    if (v && typeof v === 'object') return ['clave,valor'].concat(Object.entries(v).map(([k, x]) => csvCell(k) + ',' + csvCell(x))).join('\r\n');
    return csvCell(v);
  }
  K.define('jsoneditor', {
    init(b, w, arg) {
      const st = { id: null, name: 'datos.json', folder: 'documents', val: undefined, ok: false, nodes: 0 };
      b.innerHTML = `<div class="k9 a9-json"><div class="k9-bar">
        <button class="k9-btn" data-a="open">${I('folder', 15)} ${esc(tr('Abrir'))}</button><button class="k9-btn pri" data-a="save">${I('save', 15)} ${esc(tr('Guardar'))}</button><span class="sp"></span>
        <select class="input-text" data-ind aria-label="${esc(tr('Sangría'))}"><option value="2">2 ${esc(tr('espacios'))}</option><option value="4">4 ${esc(tr('espacios'))}</option><option value="t">${esc(tr('Tabulador'))}</option></select>
        <button class="k9-btn" data-a="fmt">${esc(tr('Formatear'))}</button><button class="k9-btn" data-a="min">${esc(tr('Minimizar'))}</button><button class="k9-btn" data-a="sort">${esc(tr('Ordenar claves'))}</button><button class="k9-btn" data-a="csv">${I('download', 14)} CSV</button></div>
        <div class="a9-json-body"><div class="a9-json-src" data-ed></div><div class="a9-json-side"><div class="k9-tabs"><button class="on" data-v="tree">${esc(tr('Árbol'))}</button><button data-v="stats">${esc(tr('Resumen'))}</button></div><div class="a9-json-tree" data-tree></div></div></div>
        <div class="k9-status"><span data-msg></span><span style="margin-left:auto" data-jpath></span></div></div>`;
      let view = 'tree';
      const ed = codeArea(q(b, '[data-ed]'), { lang: 'json', label: 'JSON', onInput: debounce(() => { check(); put('json_draft', ed.value.length < 300000 ? ed.value : ''); }, 250) });
      const msg = (h, cls) => { const m = q(b, '[data-msg]'); m.innerHTML = h; m.className = cls || ''; };
      function check() {
        const src = ed.value;
        if (!src.trim()) { st.ok = false; st.val = undefined; msg(esc(tr('Escribe o pega JSON, o abre un archivo.'))); draw(); return; }
        const e = jsonCheck(src);
        if (e) { st.ok = false; msg(`<button class="a9-json-err" data-goto="${e.pos}">✕ ${esc(tr('Línea'))} ${e.line}, ${esc(tr('columna'))} ${e.col}: ${esc(e.msg)}</button>`, 'k9-bad'); draw(); return; }
        try { st.val = JSON.parse(src); st.ok = true; msg(`<span class="k9-ok">✓ ${esc(tr('JSON válido'))}</span> · ${esc(K.fmt.bytes(new Blob([src]).size))}`); } catch (er) { st.ok = false; msg(esc(er.message), 'k9-bad'); }
        draw();
      }
      const pathOf = (p, k, arr) => p + (arr ? `[${k}]` : /^[A-Za-z_$][\w$]*$/.test(k) ? '.' + k : `[${JSON.stringify(k)}]`);
      function node(v, path, depth) {
        if (++st.nodes > 20000) return '<span class="k9-muted">…</span>';
        if (v === null || typeof v !== 'object') { const t = v === null ? 'l' : typeof v === 'string' ? 's' : typeof v === 'number' ? 'n' : 'l'; return `<span class="h-${t}" data-path="${esc(path)}">${esc(typeof v === 'string' && v.length > 300 ? JSON.stringify(v.slice(0, 300)) + '…' : JSON.stringify(v))}</span>`; }
        const arr = Array.isArray(v), keys = arr ? v.map((_, i) => i) : Object.keys(v);
        if (!keys.length) return `<span data-path="${esc(path)}">${arr ? '[]' : '{}'}</span>`;
        return `<details${depth < 2 ? ' open' : ''}><summary data-path="${esc(path)}"><span class="k9-muted">${arr ? `[${keys.length}]` : `{${keys.length}}`}</span></summary><ul>${keys.slice(0, 2000).map(k => `<li><span class="h-p">${esc(arr ? String(k) : JSON.stringify(k))}</span>: ${node(v[k], pathOf(path, k, arr), depth + 1)}</li>`).join('')}${keys.length > 2000 ? `<li class="k9-muted">… ${keys.length - 2000} ${esc(tr('más'))}</li>` : ''}</ul></details>`;
      }
      function stats(v) {
        const c = { obj: 0, arr: 0, str: 0, num: 0, bool: 0, nul: 0, depth: 0, keys: new Map() };
        const walk = (x, d) => { c.depth = Math.max(c.depth, d); if (x === null) c.nul++; else if (Array.isArray(x)) { c.arr++; x.forEach(y => walk(y, d + 1)); } else if (typeof x === 'object') { c.obj++; Object.entries(x).forEach(([k, y]) => { c.keys.set(k, (c.keys.get(k) || 0) + 1); walk(y, d + 1); }); } else if (typeof x === 'string') c.str++; else if (typeof x === 'number') c.num++; else c.bool++; };
        walk(v, 0);
        return `<div class="k9-grid" style="--min:110px">${[['Objetos', c.obj], ['Listas', c.arr], ['Textos', c.str], ['Números', c.num], ['Booleanos', c.bool], ['Nulos', c.nul], ['Profundidad', c.depth]].map(([l, n]) => `<div class="k9-card k9-kpi"><b>${n}</b><span>${esc(tr(l))}</span></div>`).join('')}</div><h4 class="a9-h" style="margin-top:14px">${esc(tr('Claves más usadas'))}</h4>${[...c.keys].sort((a, d) => d[1] - a[1]).slice(0, 15).map(([k, n]) => `<div class="k9-row k9-small"><code style="flex:1">${esc(k)}</code><span class="k9-muted">${n}</span></div>`).join('') || `<p class="k9-muted k9-small">—</p>`}`;
      }
      function draw() {
        const T = q(b, '[data-tree]'); st.nodes = 0;
        qa(b, '[data-v]').forEach(x => x.classList.toggle('on', x.dataset.v === view));
        if (!st.ok) { T.innerHTML = `<div class="k9-state">${I('code', 34)}<p>${esc(tr('La vista aparecerá cuando el JSON sea válido.'))}</p></div>`; return; }
        T.innerHTML = view === 'tree' ? `<div class="a9-jtree">${node(st.val, '$', 0)}</div>` : stats(st.val);
      }
      const ind = () => { const v = q(b, '[data-ind]').value; return v === 't' ? '\t' : +v; };
      function setText(t) { ed.ta.focus(); ed.ta.setSelectionRange(0, ed.value.length); ed.ins(t); check(); }
      async function openId(id) { const f = await F.get(id); if (!f) return; if (f.size > MAX_TEXT) return K.ui.alert(tr('Archivo demasiado grande'), tr('El editor abre archivos de hasta 5 MB.')); Object.assign(st, { id: f.id, name: f.name, folder: f.folder || 'documents' }); ed.value = await f.blob.text(); check(); setTitle(w, f.name + ' — ' + tr('Editor JSON')); }
      b.addEventListener('click', async e => {
        const g = e.target.closest('[data-goto]'); if (g) { ed.select(+g.dataset.goto, +g.dataset.goto + 1); return; }
        const p = e.target.closest('[data-path]'); if (p && e.target.closest('[data-tree]')) { q(b, '[data-jpath]').textContent = p.dataset.path; if (e.detail === 2 || e.altKey) K.ui.copy(p.dataset.path); return; }
        const v = e.target.closest('[data-v]'); if (v) { view = v.dataset.v; draw(); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'open') { const f = await F.pick({ title: tr('Abrir JSON'), accept: f => /\.(json|webmanifest|geojson)$/i.test(f.name) || /json/.test(F.typeOf(f)), deviceAccept: '.json,.geojson,.webmanifest,application/json', folder: 'documents' }); if (f) openId(f.id); }
        if (k === 'save') { if (!st.ok && !await E.confirm(tr('JSON no válido'), tr('¿Guardar igualmente?'))) return; if (!st.id) { const n = await K.ui.prompt(tr('Guardar JSON'), tr('Nombre'), st.name); if (!n) return; st.name = /\.\w+$/.test(n) ? n : n + '.json'; st.id = await F.save(await F.uniqueName(st.folder, F.cleanName(st.name)), new Blob([ed.value], { type: 'application/json' }), st.folder); } else await F.writeText(st.id, ed.value, 'application/json'); E.toast(tr('Guardado en Archivos') + ': ' + st.name); }
        if (!st.ok && ['fmt', 'min', 'sort', 'csv'].includes(k)) return E.toast(tr('Corrige primero los errores del JSON'));
        if (k === 'fmt') setText(JSON.stringify(st.val, null, ind()));
        if (k === 'min') setText(JSON.stringify(st.val));
        if (k === 'sort') setText(JSON.stringify(sortKeys(st.val), null, ind()));
        if (k === 'csv') { const csv = '﻿' + toCSV(st.val), name = baseName(st.name) + '.csv'; const r = await E.form({ title: tr('Convertir a CSV'), html: `<pre class="k9-mono k9-small" style="max-height:180px;overflow:auto;background:var(--e9-bg-2);padding:8px;border-radius:8px">${esc(csv.slice(1, 1500))}</pre>`, fields: [{ k: 'to', label: tr('Destino'), type: 'select', options: [['files', tr('Guardar en Archivos')], ['device', tr('Descargar al dispositivo')]], value: 'files' }], ok: tr('Exportar') }); if (!r) return; const blob = new Blob([csv], { type: 'text/csv' }); if (r.to === 'files') { const nm = await F.uniqueName(st.folder, name); await F.save(nm, blob, st.folder); E.toast(tr('Guardado en Archivos') + ': ' + nm); } else devDownload(name, blob); }
      });
      const d = get('json_draft', '');
      ed.value = d || `{\n  "app": "EISENKU OS",\n  "version": "9.0",\n  "modos": ["Linux", "Windows"],\n  "idiomas": 20,\n  "seguro": true,\n  "autor": { "nombre": "Eisen", "pais": null }\n}\n`;
      check();
      this.onArg = a2 => { if (a2 && a2.fileId) openId(a2.fileId); };
      if (arg && arg.fileId) openId(arg.fileId);
    }
  });

  /* ======================================================================
     Consola de desarrollo (aislada)
     ====================================================================== */
  K.define('devconsole', (() => {
    let sb = null;
    return {
      init(b) {
        const hist = get('devcon_hist', []) || []; let hi = hist.length;
        b.innerHTML = `<div class="k9 a9-con"><div class="k9-bar"><span class="k9-small" data-mode><span class="k9-dot w"></span> ${esc(tr('Preparando entorno aislado…'))}</span><span class="sp"></span><button class="k9-btn" data-a="ex">${I('book', 14)} ${esc(tr('Ejemplos'))}</button><button class="k9-btn" data-a="reset" title="${esc(tr('Borra variables y empieza de cero'))}">${I('refresh', 14)} ${esc(tr('Reiniciar entorno'))}</button><button class="k9-btn" data-a="clear" title="Ctrl+L">${I('trash', 14)} ${esc(tr('Limpiar'))}</button></div>
          <div class="a9-con-out" data-out role="log" aria-live="polite"></div>
          <div class="a9-con-in"><span class="a9-con-pr">›</span><textarea class="k9-mono" data-in rows="1" spellcheck="false" autocapitalize="off" placeholder="${esc(tr('Escribe JavaScript y pulsa Intro (Mayús+Intro: nueva línea)'))}" aria-label="${esc(tr('Entrada de JavaScript'))}"></textarea></div></div>`;
        const out = q(b, '[data-out]'), inp = q(b, '[data-in]');
        const add = (cls, html) => { out.insertAdjacentHTML('beforeend', `<div class="a9-con-l ${cls}">${html}</div>`); while (out.children.length > 1500) out.firstChild.remove(); out.scrollTop = out.scrollHeight; };
        add('info', esc(tr('Consola JavaScript aislada: el código se ejecuta en un entorno sin acceso a tus archivos, ajustes ni datos de EISENKU. Las variables se conservan hasta que reinicias el entorno. Límite de 10 s por orden.')));
        if (sb) sb.destroy();
        sb = Sandbox(m => {
          if (m.t === 'mode') q(b, '[data-mode]').innerHTML = m.mode === 'worker' ? `<span class="k9-dot g"></span> ${esc(tr('Aislado: Worker en sandbox (se detiene si se cuelga)'))}` : `<span class="k9-dot w"></span> ${esc(tr('Aislado: sandbox sin Worker (un bucle infinito puede bloquear la pestaña)'))}`;
          if (m.t === 'log') add(m.lvl, esc(m.text));
          if (m.t === 'clear') out.innerHTML = '';
          if (m.t === 'fatal') add('error', esc(m.text));
        }, { timeout: 10000 });
        const grow = () => { inp.style.height = 'auto'; inp.style.height = Math.min(160, inp.scrollHeight) + 'px'; };
        async function run(code) {
          if (!code.trim()) return;
          add('in', `<span class="a9-con-pr">›</span>${hl(code, 'js')}`);
          if (hist[hist.length - 1] !== code) { hist.push(code); if (hist.length > 100) hist.shift(); put('devcon_hist', hist); } hi = hist.length;
          const r = await sb.run(code);
          add(r.ok ? 'res' : 'error', (r.ok ? '<span class="a9-con-pr">‹</span>' : '') + esc(r.text) + (r.ms != null && r.ms > 50 ? ` <small class="k9-muted">${Math.round(r.ms)} ms</small>` : ''));
        }
        inp.addEventListener('input', grow);
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const c = inp.value; inp.value = ''; grow(); run(c); }
          else if (e.key === 'ArrowUp' && !inp.value.slice(0, inp.selectionStart).includes('\n') && hi > 0) { e.preventDefault(); inp.value = hist[--hi]; grow(); }
          else if (e.key === 'ArrowDown' && !inp.value.slice(inp.selectionEnd).includes('\n')) { e.preventDefault(); hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ''; grow(); }
          else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') { e.preventDefault(); out.innerHTML = ''; }
        });
        const EX = [['Variables y funciones', 'const doble = x => x * 2;\n[1, 2, 3].map(doble)'], ['Objetos', '({ nombre: "Eisen", idiomas: 20, modos: ["Linux", "Windows"] })'], ['Fechas', 'new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })'], ['Consola', 'console.log("Hola"); console.warn("Cuidado"); console.error("Error"); 42'], ['Clases', 'class Punto { constructor(x, y) { this.x = x; this.y = y; } dist() { return Math.hypot(this.x, this.y); } }\nnew Punto(3, 4).dist()'], ['Promesas y await', 'await new Promise(r => setTimeout(() => r("listo tras 500 ms"), 500))'], ['Medir tiempo', 'console.time("bucle"); let s = 0; for (let i = 0; i < 1e6; i++) s += i; console.timeEnd("bucle"); s']];
        b.addEventListener('click', e => {
          const a = e.target.closest('[data-a]'); if (!a) return;
          if (a.dataset.a === 'clear') out.innerHTML = '';
          if (a.dataset.a === 'reset') { sb.reset(); add('info', esc(tr('Entorno reiniciado: variables borradas.'))); }
          if (a.dataset.a === 'ex') { const r = a.getBoundingClientRect(); K.ui.menu(r.left - 120, r.bottom + 4, EX.map(([l, c]) => ({ label: l, icon: 'code', act: () => { inp.value = c; grow(); inp.focus(); } }))); }
        });
        out.addEventListener('click', () => { if (!getSelection().toString()) inp.focus(); });
        setTimeout(() => inp.focus(), 50);
      },
      destroy() { if (sb) sb.destroy(); sb = null; }
    };
  })());

  /* ======================================================================
     Explorador de proyectos
     ====================================================================== */
  const SKIP_DIRS = /^(node_modules|\.git|\.svn|\.hg|__pycache__|\.venv|venv|\.idea|\.vscode|\.next|\.cache|dist|build|coverage)$/;
  const TEXT_EXT = /\.(js|mjs|cjs|jsx|ts|tsx|py|css|scss|less|html?|xml|svg|json|md|markdown|txt|csv|yml|yaml|toml|ini|cfg|conf|sh|bat|ps1|sql|java|c|h|cpp|hpp|cs|go|rs|php|rb|lua|kt|swift|vue|svelte|gitignore|env|lock|log|gradle|properties|dockerfile|makefile)$|(^|\/)(Dockerfile|Makefile|LICENSE|README)$/i;
  const LANG_GROUP = e => ({ js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript', py: 'Python', css: 'CSS', scss: 'CSS', less: 'CSS', html: 'HTML', htm: 'HTML', vue: 'Vue', svelte: 'Svelte', json: 'JSON', md: 'Markdown', markdown: 'Markdown', java: 'Java', c: 'C/C++', h: 'C/C++', cpp: 'C/C++', hpp: 'C/C++', cs: 'C#', go: 'Go', rs: 'Rust', php: 'PHP', rb: 'Ruby', kt: 'Kotlin', swift: 'Swift', sql: 'SQL', sh: 'Shell', bat: 'Shell', ps1: 'Shell', yml: 'YAML', yaml: 'YAML', xml: 'XML', svg: 'SVG' }[e] || (e ? e.toUpperCase() : tr('Otros')));
  K.define('projexplorer', {
    init(b) {
      const st = { name: '', files: [], cache: new Map(), cur: null, tab: 'tree', src: '' };
      b.innerHTML = `<div class="k9 a9-px"><div class="k9-bar"><button class="k9-btn pri" data-a="dir">${I('folder', 15)} ${esc(tr('Abrir carpeta del dispositivo'))}</button><button class="k9-btn" data-a="zip">${I('box', 15)} ${esc(tr('Importar ZIP'))}</button><button class="k9-btn" data-a="files">${I('layers', 15)} ${esc(tr('Carpeta de Archivos'))}</button><span class="sp"></span><b data-pname class="k9-small"></b><button class="k9-btn" data-a="more" aria-label="${esc(tr('Más opciones'))}">${I('more', 15)}</button></div>
        <div class="k9-tabs"><button class="on" data-t="tree">${esc(tr('Archivos'))}</button><button data-t="search">${esc(tr('Buscar en el contenido'))}</button><button data-t="stats">${esc(tr('Estadísticas'))}</button></div>
        <div class="a9-px-body" data-body></div></div>`;
      const body = q(b, '[data-body]');
      const isText = f => TEXT_EXT.test(f.path) || /^text\//.test(f.type || '');
      async function textOf(f) { if (st.cache.has(f.path)) return st.cache.get(f.path); if (f.size > 2 * 1024 * 1024) return null; const t = await (await f.get()).text(); if ([...st.cache.values()].reduce((a, x) => a + (x ? x.length : 0), 0) < 60e6) st.cache.set(f.path, t); return t; }
      function setProject(name, files, src) { Object.assign(st, { name, files: files.sort((a, c) => a.path.localeCompare(c.path)), cache: new Map(), cur: null, src }); q(b, '[data-pname]').textContent = name ? `${name} · ${files.length} ${tr('archivos')}` : ''; st.tab = 'tree'; draw(); K.activity('dev', 'projexplorer', name); }
      async function fromHandle(dir) {
        const files = []; let skipped = 0;
        const walk = async (h, pre) => { for await (const [nm, ch] of h.entries()) { if (files.length >= 5000) { skipped++; continue; } if (ch.kind === 'directory') { if (!SKIP_DIRS.test(nm)) await walk(ch, pre + nm + '/'); else skipped++; } else { const fl = await ch.getFile(); files.push({ path: pre + nm, size: fl.size, type: fl.type, get: () => ch.getFile() }); } } };
        K.ui.loading(body, tr('Leyendo la carpeta…')); await walk(dir, '');
        setProject(dir.name, files, 'device'); if (skipped) E.toast(`${skipped} ${tr('elementos omitidos (node_modules, .git, límite de 5000 archivos)')}`);
      }
      function fromList(list) { const files = []; for (const fl of list) { const p = fl.webkitRelativePath || fl.name, parts = p.split('/'); if (parts.slice(0, -1).some(x => SKIP_DIRS.test(x)) || files.length >= 5000) continue; files.push({ path: parts.length > 1 ? parts.slice(1).join('/') : p, size: fl.size, type: fl.type, get: async () => fl }); } setProject((list[0] && (list[0].webkitRelativePath || '').split('/')[0]) || tr('Proyecto'), files, 'device'); }
      async function fromZip(f) { K.ui.loading(body, tr('Descomprimiendo…')); try { const items = await K.unzip(f.blob || f); const root = items.length && items.every(x => x.name.split('/')[0] === items[0].name.split('/')[0] && x.name.includes('/')) ? items[0].name.split('/')[0] + '/' : ''; setProject(baseName(f.name), items.filter(x => !x.name.split('/').some(p => SKIP_DIRS.test(p))).slice(0, 5000).map(x => ({ path: x.name.slice(root.length), size: x.data.length, type: F.typeOf({ name: x.name }), get: async () => new Blob([x.data], { type: F.typeOf({ name: x.name }) }) })), 'zip'); } catch (e) { K.ui.error(body, e.message); } }
      async function fromFiles(folder) { const l = (await F.all()).filter(x => (x.folder || '') === folder || (x.folder || '').startsWith(folder + '/')); setProject(F.pretty(folder), l.map(x => ({ path: (x.folder.length > folder.length ? x.folder.slice(folder.length + 1) + '/' : '') + x.name, size: x.size, type: x.type, id: x.id, get: async () => x.blob })), 'files'); }
      function treeHtml() {
        const root = {}; st.files.forEach((f, i) => { const parts = f.path.split('/'); let n = root; parts.slice(0, -1).forEach(p => { n = n[p + '/'] = n[p + '/'] || {}; }); n[parts[parts.length - 1]] = i; });
        const render = (n, d) => Object.keys(n).sort((a, c) => (c.endsWith('/') - a.endsWith('/')) || a.localeCompare(c)).map(k => k.endsWith('/') ? `<details${d < 1 ? ' open' : ''}><summary>📁 ${esc(k.slice(0, -1))}</summary>${render(n[k], d + 1)}</details>` : `<button class="a9-px-f${st.cur === n[k] ? ' on' : ''}" data-f="${n[k]}">${isText(st.files[n[k]]) ? '📄' : F.kindOf({ name: k, type: st.files[n[k]].type }) === 'image' ? '🖼️' : '📦'} ${esc(k)}</button>`).join('');
        return render(root, 0);
      }
      async function showFile(i, line) {
        st.cur = i; const f = st.files[i], V = q(b, '[data-view]'); if (!V) return;
        qa(b, '.a9-px-f').forEach(x => x.classList.toggle('on', +x.dataset.f === i));
        const head = `<div class="k9-bar"><b class="k9-small" style="flex:1;overflow:hidden;text-overflow:ellipsis">${esc(f.path)}</b><span class="k9-small k9-muted">${esc(K.fmt.bytes(f.size))}</span><button class="k9-btn" data-a="edit">${I('edit', 14)} ${esc(tr('Abrir en el Editor de código'))}</button></div>`;
        if (isText(f)) { const t = await textOf(f); if (t == null) { V.innerHTML = head + `<div class="k9-state"><p>${esc(tr('Archivo de más de 2 MB: ábrelo en el Editor de código.'))}</p></div>`; return; } V.innerHTML = head + '<div class="a9-px-code"></div>'; const ca = codeArea(q(V, '.a9-px-code'), { readOnly: true, lang: langOf(f.path) }); ca.value = t; if (line) setTimeout(() => ca.goto(line), 30); }
        else if (F.kindOf({ name: f.path, type: f.type }) === 'image') { if (st.img) URL.revokeObjectURL(st.img); const u = st.img = URL.createObjectURL(await f.get()); V.innerHTML = head + `<div class="k9-state"><img src="${u}" alt="" style="max-width:100%;max-height:60vh;border-radius:8px"></div>`; }
        else V.innerHTML = head + `<div class="k9-state">${I('box', 36)}<p>${esc(tr('Archivo binario: no se muestra su contenido.'))}</p></div>`;
      }
      async function search(qv, cs, rx) {
        const R = q(b, '[data-res]'); let re; try { re = new RegExp(rx ? qv : reEsc(qv), 'g' + (cs ? '' : 'i')); } catch { R.innerHTML = `<p class="k9-bad">${esc(tr('Expresión no válida'))}</p>`; return; }
        R.innerHTML = `<p class="k9-muted k9-small">${esc(tr('Buscando…'))}</p>`; let html = '', total = 0, nf = 0;
        for (let i = 0; i < st.files.length && total < 2000; i++) {
          const f = st.files[i]; if (!isText(f)) continue; const t = await textOf(f); if (!t) continue;
          const hits = []; re.lastIndex = 0; let m; while ((m = re.exec(t)) && hits.length < 50) { if (!m[0]) { re.lastIndex++; continue; } const ls = t.lastIndexOf('\n', m.index) + 1, le = t.indexOf('\n', m.index); hits.push({ line: lineOf(t, m.index), txt: t.slice(ls, le < 0 ? t.length : le), a: m.index - ls, z: m.index - ls + m[0].length }); }
          if (hits.length) { nf++; total += hits.length; html += `<div class="k9-card" style="padding:6px 10px"><b class="k9-small">${esc(f.path)}</b> <span class="k9-badge">${hits.length}</span>${hits.map(h => { const pre = h.txt.slice(Math.max(0, h.a - 60), h.a), mid = h.txt.slice(h.a, h.z), post = h.txt.slice(h.z, h.z + 80); return `<button class="a9-px-hit" data-hit="${i}|${h.line}"><span class="k9-muted">${h.line}</span> ${esc(pre.trimStart())}<mark>${esc(mid)}</mark>${esc(post)}</button>`; }).join('')}</div>`; }
        }
        R.innerHTML = total ? `<p class="k9-small k9-muted" style="margin-bottom:8px">${total} ${esc(tr('coincidencias en'))} ${nf} ${esc(tr('archivos'))}${total >= 2000 ? ' · ' + esc(tr('se muestran las primeras 2000')) : ''}</p>` + html : `<p class="k9-muted">${esc(tr('Sin resultados'))}</p>`;
      }
      async function statsHtml() {
        const by = new Map(); let lines = 0, bytes = 0;
        K.ui.loading(body, tr('Analizando…'));
        for (const f of st.files) { const e = F.extOf(f.path), g = LANG_GROUP(e), o = by.get(g) || { files: 0, bytes: 0, lines: 0 }; o.files++; o.bytes += f.size; bytes += f.size; if (isText(f)) { const t = await textOf(f); if (t) { const n = (t.match(/\n/g) || []).length + (t && !t.endsWith('\n') ? 1 : 0); o.lines += n; lines += n; } } by.set(g, o); }
        const rows = [...by].sort((a, c) => c[1].lines - a[1].lines || c[1].bytes - a[1].bytes), max = Math.max(1, ...rows.map(r => r[1].lines));
        const big = st.files.slice().sort((a, c) => c.size - a.size).slice(0, 10);
        return `<div class="k9-body"><div class="k9-grid" style="--min:140px"><div class="k9-card k9-kpi"><b>${st.files.length}</b><span>${esc(tr('Archivos'))}</span></div><div class="k9-card k9-kpi"><b>${lines.toLocaleString(K.locale)}</b><span>${esc(tr('Líneas de texto'))}</span></div><div class="k9-card k9-kpi"><b>${esc(K.fmt.bytes(bytes))}</b><span>${esc(tr('Tamaño total'))}</span></div><div class="k9-card k9-kpi"><b>${by.size}</b><span>${esc(tr('Lenguajes y tipos'))}</span></div></div>
          <h4 class="a9-h" style="margin-top:16px">${esc(tr('Por lenguaje'))}</h4><div class="k9-card"><table class="k9-table"><thead><tr><th>${esc(tr('Lenguaje'))}</th><th>${esc(tr('Archivos'))}</th><th>${esc(tr('Líneas'))}</th><th>${esc(tr('Tamaño'))}</th><th style="width:30%"></th></tr></thead><tbody>${rows.map(([g, o]) => `<tr><td><b>${esc(g)}</b></td><td>${o.files}</td><td>${o.lines.toLocaleString(K.locale)}</td><td>${esc(K.fmt.bytes(o.bytes))}</td><td><div class="k9-meter"><i style="width:${(o.lines / max * 100).toFixed(1)}%"></i></div></td></tr>`).join('')}</tbody></table></div>
          <h4 class="a9-h" style="margin-top:16px">${esc(tr('Archivos más grandes'))}</h4><div class="k9-card" style="padding:2px 8px">${big.map(f => `<button class="k9-li a9-px-hit" data-hit="${st.files.indexOf(f)}|1" style="width:100%"><div class="t"><b>${esc(f.path)}</b></div><span class="k9-small k9-muted">${esc(K.fmt.bytes(f.size))}</span></button>`).join('')}</div></div>`;
      }
      async function draw() {
        qa(b, '[data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === st.tab));
        if (!st.files.length) { body.innerHTML = `<div class="k9-state">${I('folder', 44)}<p>${esc(tr('Abre la carpeta de un proyecto de tu dispositivo, importa un ZIP o elige una carpeta de Archivos. Todo se analiza en tu navegador: nada se sube a Internet.'))}</p><p class="k9-small k9-muted">${esc('showDirectoryPicker' in window ? tr('Tu navegador permite abrir carpetas del dispositivo en modo de solo lectura.') : tr('Tu navegador no permite el acceso directo a carpetas: se usará el selector de carpetas clásico.'))}</p></div>`; return; }
        if (st.tab === 'tree') { body.innerHTML = `<div class="a9-px-split"><nav class="a9-px-tree">${treeHtml()}</nav><section class="a9-px-view" data-view><div class="k9-state"><p>${esc(tr('Elige un archivo para verlo.'))}</p></div></section></div>`; if (st.cur != null) showFile(st.cur); }
        if (st.tab === 'search') { body.innerHTML = `<div class="k9-body"><form class="k9-row" data-sf style="margin-bottom:10px"><input class="input-text" name="q" placeholder="${esc(tr('Texto a buscar en todos los archivos'))}" style="flex:1" required><label class="k9-small k9-row"><input type="checkbox" name="cs"> Aa</label><label class="k9-small k9-row"><input type="checkbox" name="rx"> .*</label><button class="k9-btn pri">${I('search', 14)} ${esc(tr('Buscar'))}</button></form><div data-res></div></div>`; q(body, 'input').focus(); }
        if (st.tab === 'stats') body.innerHTML = await statsHtml();
      }
      b.addEventListener('submit', e => { e.preventDefault(); const f = e.target; if (f.matches('[data-sf]')) search(f.q.value, f.cs.checked, f.rx.checked); });
      b.addEventListener('click', async e => {
        const t = e.target;
        const tb = t.closest('[data-t]'); if (tb) { st.tab = tb.dataset.t; draw(); return; }
        const ff = t.closest('[data-f]'); if (ff) { showFile(+ff.dataset.f); return; }
        const hit = t.closest('[data-hit]'); if (hit) { const [i, ln] = hit.dataset.hit.split('|').map(Number); st.tab = 'tree'; st.cur = i; await draw(); showFile(i, ln); return; }
        const a = t.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'dir') {
          if ('showDirectoryPicker' in window) { try { await fromHandle(await window.showDirectoryPicker({ mode: 'read' })); } catch (er) { if (er && er.name !== 'AbortError') K.ui.alert(tr('No se pudo abrir la carpeta'), er.message); else draw(); } }
          else { const i = document.createElement('input'); i.type = 'file'; i.webkitdirectory = true; i.multiple = true; i.onchange = () => i.files.length && fromList([...i.files]); i.click(); }
        }
        if (k === 'zip') { const f = await F.pick({ title: tr('Importar ZIP'), accept: f => /\.zip$/i.test(f.name), deviceAccept: '.zip,application/zip', folder: 'downloads' }); if (f) fromZip(f); }
        if (k === 'files') { const opts = F.ROOTS.map(r => [r[0], tr(r[1])]).concat((S.get('fs9_dirs', []) || []).map(d => [d, F.pretty(d)])); const r = await E.form({ title: tr('Carpeta de Archivos'), fields: [{ k: 'f', label: tr('Carpeta'), type: 'select', options: opts, value: 'documents' }], ok: tr('Abrir') }); if (r) fromFiles(r.f); }
        if (k === 'edit' && st.cur != null) { const f = st.files[st.cur]; if (f.id) E.launch('codeeditor', { fileId: f.id }); else { const tx = await textOf(f); if (tx != null) E.launch('codeeditor', { text: tx, name: f.path.split('/').pop() }); else E.toast(tr('Archivo demasiado grande')); } }
        if (k === 'more') { const r = a.getBoundingClientRect(); K.ui.menu(r.left - 200, r.bottom + 4, [{ label: 'Exportar el proyecto como ZIP', icon: 'download', disabled: !st.files.length, act: async () => { const entries = []; for (const f of st.files) entries.push({ name: f.path, data: await f.get() }); devDownload((st.name || 'proyecto') + '.zip', await K.zip(entries)); } }, { label: 'Copiar el proyecto a Archivos', icon: 'folder', disabled: !st.files.length || st.src === 'files', act: async () => { const tot = st.files.reduce((x, f) => x + f.size, 0); if (!await E.confirm(tr('Copiar a Archivos'), `${st.files.length} ${tr('archivos')} · ${K.fmt.bytes(tot)} → ${tr('Documentos')} › ${st.name}`)) return; const dest = 'documents/' + F.cleanName(st.name || 'proyecto'); for (const f of st.files) { const parts = f.path.split('/').map(F.cleanName), fn = parts.pop(), d = parts.length ? dest + '/' + parts.join('/') : dest; await F.mkdir(d); await F.save(fn, await f.get(), d); } E.toast(tr('Proyecto copiado a Archivos')); E.filesOpenFolder(dest); } }]); }
      });
      draw();
    }
  });

  /* ======================================================================
     Validador HTML
     ====================================================================== */
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  function htmlTokens(src, xml) {
    const out = [], n = src.length, RAW = /^(script|style|textarea|title)$/i; let i = 0;
    const tagEnd = j0 => { let qc = null; for (let j = j0 + 1; j < n; j++) { const c = src[j]; if (qc) { if (c === qc) qc = null; } else if ((c === '"' || c === "'") && /=\s*$/.test(src.slice(Math.max(j0, j - 3), j))) qc = c; else if (c === '>') return j + 1; else if (c === '<') return j; } return n; };
    while (i < n) {
      if (src.startsWith('<!--', i)) { const e = src.indexOf('-->', i + 4); out.push({ k: 'comment', a: i, z: e < 0 ? n : e + 3, open: e < 0 }); i = e < 0 ? n : e + 3; continue; }
      if (src.startsWith('<![CDATA[', i)) { const e = src.indexOf(']]>', i); out.push({ k: 'cdata', a: i, z: e < 0 ? n : e + 3 }); i = e < 0 ? n : e + 3; continue; }
      if (src.startsWith('<?', i)) { const e = src.indexOf('?>', i); out.push({ k: 'pi', a: i, z: e < 0 ? n : e + 2 }); i = e < 0 ? n : e + 2; continue; }
      if (/^<!doctype/i.test(src.slice(i, i + 9))) { const e = src.indexOf('>', i); out.push({ k: 'doctype', a: i, z: e < 0 ? n : e + 1 }); i = e < 0 ? n : e + 1; continue; }
      if (src[i] === '<' && /[A-Za-z/]/.test(src[i + 1] || '')) {
        const end = tagEnd(i), raw = src.slice(i, end), m = raw.match(/^<(\/?)([A-Za-z][\w:.-]*)/);
        if (!m) { out.push({ k: 'text', a: i, z: i + 1 }); i++; continue; }
        const t = { k: m[1] ? 'end' : 'start', name: xml ? m[2] : m[2].toLowerCase(), a: i, z: end, self: /\/\s*>$/.test(raw), attrs: [], unclosed: !raw.endsWith('>') };
        if (!m[1]) { const inner = raw.slice(m[0].length).replace(/\/?\s*>?$/, ''), re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g; let am; while ((am = re.exec(inner))) t.attrs.push({ n: xml ? am[1] : am[1].toLowerCase(), v: am[2] ?? am[3] ?? am[4] ?? null, p: i + m[0].length + am.index }); }
        out.push(t); i = end;
        if (!xml && t.k === 'start' && RAW.test(t.name) && !t.self) { const c = src.toLowerCase().indexOf('</' + t.name, i), ce = c < 0 ? n : c; if (ce > i) out.push({ k: 'text', a: i, z: ce, raw: true, of: t.name }); i = ce; }
        continue;
      }
      const nx = src.indexOf('<', i + 1), e2 = nx < 0 ? n : nx; out.push({ k: 'text', a: i, z: e2 }); i = e2;
    }
    return out;
  }
  function validateHtml(src) {
    const toks = htmlTokens(src), issues = [], add = (sev, cat, pos, msg) => issues.push({ sev, cat, pos, msg });
    const OPT = new Set(['p', 'li', 'dt', 'dd', 'option', 'optgroup', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'colgroup', 'caption', 'rb', 'rt', 'rp', 'html', 'head', 'body']);
    const stack = [], ids = new Map(), labelsFor = new Set(), fields = [];
    let doctype = false, lang = null, title = false, desc = false, viewport = false, charset = false, h1 = 0, lastH = 0;
    for (const t of toks) {
      if (t.k === 'doctype') doctype = true;
      if (t.k === 'comment' && t.open) add('error', 'estructura', t.a, tr('Comentario sin cerrar (falta «-->»)'));
      if (t.k === 'text' && !t.raw) { const tx = src.slice(t.a, t.z); stack.forEach(s => { if (s.name === 'a' || s.name === 'button' || s.name === 'label') s.text += tx; }); }
      if (t.k === 'start') {
        const A = {}; const seen = new Set();
        t.attrs.forEach(x => { if (seen.has(x.n)) add('error', 'estructura', x.p, `${tr('Atributo duplicado')} «${x.n}» ${tr('en')} <${t.name}>`); seen.add(x.n); A[x.n] = x.v ?? ''; });
        if (t.unclosed) add('error', 'estructura', t.a, `<${t.name}> ${tr('sin cerrar con «>»')}`);
        const foreign = stack.some(s => s.name === 'svg' || s.name === 'math') || t.name === 'svg' || t.name === 'math';
        if ('id' in A) { if (!A.id) add('warn', 'estructura', t.a, tr('Atributo id vacío')); else if (ids.has(A.id)) add('error', 'estructura', t.a, `${tr('id duplicado')} «${A.id}» (${tr('ya usado en la línea')} ${lineOf(src, ids.get(A.id))})`); else ids.set(A.id, t.a); }
        if (t.name === 'html') lang = A.lang ?? '';
        if (t.name === 'title') title = true;
        if (t.name === 'meta') { const nm = (A.name || '').toLowerCase(); if (nm === 'description' && A.content) desc = true; if (nm === 'viewport') viewport = true; if ('charset' in A || /charset=/i.test(A.content || '')) charset = true; }
        if (t.name === 'img') { if (!('alt' in A)) add('error', 'accesibilidad', t.a, tr('<img> sin atributo alt (usa alt="" si la imagen es decorativa)')); else stack.forEach(s => { if (s.name === 'a' || s.name === 'button') s.text += A.alt; }); }
        if ((t.name === 'input' && !/^(hidden|submit|button|reset|image)$/i.test(A.type || '')) || t.name === 'select' || t.name === 'textarea') fields.push({ t, A, inLabel: stack.some(s => s.name === 'label') });
        if (t.name === 'label' && A.for) labelsFor.add(A.for);
        if (t.name === 'iframe' && !A.title) add('warn', 'accesibilidad', t.a, tr('<iframe> sin title que describa su contenido'));
        if (/^h[1-6]$/.test(t.name)) { const lv = +t.name[1]; if (lv === 1) h1++; if (lastH && lv > lastH + 1) add('warn', 'accesibilidad', t.a, `${tr('Salto de nivel de encabezado')}: h${lastH} → h${lv}`); lastH = lv; }
        if (A.tabindex && +A.tabindex > 0) add('warn', 'accesibilidad', t.a, tr('tabindex positivo: altera el orden natural del teclado'));
        if (t.name === 'meta' && /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/i.test(A.content || '')) add('warn', 'accesibilidad', t.a, tr('El viewport impide hacer zoom (usuarios con baja visión)'));
        t.attrs.forEach(x => {
          if (/^on[a-z]+$/.test(x.n)) add('warn', 'seguridad', x.p, `${tr('Manejador de eventos en línea')} «${x.n}»: ${tr('muévelo a un script; las políticas CSP estrictas lo bloquean')}`);
          if (/^(href|src|action|formaction|xlink:href|data)$/.test(x.n) && /^\s*javascript:/i.test(x.v || '')) add('error', 'seguridad', x.p, tr('URL javascript: (riesgo de XSS)'));
          if (/^(src|href|action|data)$/.test(x.n) && /^\s*http:\/\//i.test(x.v || '') && !(t.name === 'a')) add('warn', 'seguridad', x.p, `${tr('Recurso cargado por http:// (no cifrado, contenido mixto)')}: ${(x.v || '').slice(0, 60)}`);
        });
        if (t.name === 'a' && (A.target || '').toLowerCase() === '_blank' && !/noopener|noreferrer/i.test(A.rel || '')) add('warn', 'seguridad', t.a, tr('target="_blank" sin rel="noopener": la página abierta puede controlar esta pestaña'));
        if (t.name === 'form' && /^\s*http:\/\//i.test(A.action || '')) add('error', 'seguridad', t.a, tr('El formulario envía datos sin cifrar (http://)'));
        if (t.name === 'input' && (A.type || '').toLowerCase() === 'password' && !('autocomplete' in A)) add('info', 'seguridad', t.a, tr('Campo de contraseña sin autocomplete (current-password o new-password)'));
        if (t.name === 'script' && A.src && /^https?:/i.test(A.src) && !A.integrity) add('info', 'seguridad', t.a, tr('Script externo sin integrity (SRI)'));
        if (t.self && !VOID.has(t.name) && !foreign) add('warn', 'estructura', t.a, `<${t.name}/> ${tr('no es un elemento vacío en HTML: la barra se ignora y queda abierto')}`);
        if (!VOID.has(t.name) && !(t.self && foreign)) stack.push({ name: t.name, a: t.a, text: '', A });
      }
      if (t.k === 'end') {
        if (VOID.has(t.name)) { add('info', 'estructura', t.a, `</${t.name}> ${tr('sobra')}: <${t.name}> ${tr('es un elemento vacío')}`); continue; }
        let idx = -1; for (let j = stack.length - 1; j >= 0; j--) if (stack[j].name === t.name) { idx = j; break; }
        if (idx < 0) { add('error', 'estructura', t.a, `${tr('Etiqueta de cierre')} </${t.name}> ${tr('sin apertura')}`); continue; }
        for (let j = stack.length - 1; j > idx; j--) if (!OPT.has(stack[j].name)) add('error', 'estructura', stack[j].a, `<${stack[j].name}> ${tr('no se cierra antes de')} </${t.name}>`);
        const el = stack[idx]; stack.length = idx;
        if ((el.name === 'a' || el.name === 'button') && !el.text.trim() && !el.A['aria-label'] && !el.A['aria-labelledby'] && !el.A.title) add('error', 'accesibilidad', el.a, `<${el.name}> ${tr('sin texto accesible (añade texto, aria-label o title)')}`);
        if (el.name === 'a' && !('href' in el.A) && !el.A.role) add('info', 'accesibilidad', el.a, tr('<a> sin href: no es un enlace navegable con teclado'));
        if (el.name === 'label' && !el.A.for && !el.text.trim()) add('warn', 'accesibilidad', el.a, tr('<label> vacía'));
      }
    }
    stack.forEach(s => { if (!OPT.has(s.name)) add('error', 'estructura', s.a, `<${s.name}> ${tr('no está cerrada')}`); });
    fields.forEach(({ t, A, inLabel }) => { if (!inLabel && !(A.id && labelsFor.has(A.id)) && !A['aria-label'] && !A['aria-labelledby'] && !A.title) add('error', 'accesibilidad', t.a, `<${t.name}${A.type ? ` type="${A.type}"` : ''}> ${tr('sin etiqueta asociada (label for, aria-label…)')}`); if (A.placeholder && !inLabel && !(A.id && labelsFor.has(A.id)) && !A['aria-label']) add('info', 'accesibilidad', t.a, tr('El placeholder no sustituye a una etiqueta')); });
    labelsFor.forEach(id => { if (!ids.has(id)) add('warn', 'accesibilidad', 0, `<label for="${id}"> ${tr('apunta a un id que no existe')}`); });
    if (/<html[\s>]|<head[\s>]|<body[\s>]/i.test(src)) {
      if (!doctype) add('warn', 'estructura', 0, tr('Falta <!DOCTYPE html> (el navegador usará el modo de compatibilidad)'));
      if (!lang) add('error', 'accesibilidad', 0, tr('<html> sin atributo lang (los lectores de pantalla no saben el idioma)'));
      if (!title) add('error', 'seo', 0, tr('Falta <title>'));
      if (!desc) add('warn', 'seo', 0, tr('Falta <meta name="description">'));
      if (!viewport) add('warn', 'seo', 0, tr('Falta <meta name="viewport"> (la página no se adaptará a móviles)'));
      if (!charset) add('warn', 'estructura', 0, tr('Falta <meta charset="utf-8">'));
      if (!h1) add('info', 'seo', 0, tr('No hay ningún <h1>'));
    }
    if (h1 > 1) add('warn', 'seo', 0, `${tr('Hay')} ${h1} ${tr('encabezados <h1>: se recomienda uno por página')}`);
    const rank = { error: 0, warn: 1, info: 2 };
    return issues.sort((a, c) => rank[a.sev] - rank[c.sev] || a.pos - c.pos);
  }
  K.validateHtml = validateHtml;
  K.define('htmlvalidator', {
    init(b) {
      let issues = [], filter = 'all';
      b.innerHTML = `<div class="k9 a9-hv"><div class="k9-bar"><button class="k9-btn" data-a="open">${I('folder', 15)} ${esc(tr('Abrir'))}</button><button class="k9-btn" data-a="example">${esc(tr('Ejemplo con errores'))}</button><button class="k9-btn" data-a="preview">${I('eye', 15)} ${esc(tr('Vista previa aislada'))}</button><span class="sp"></span><span class="k9-small" data-sum></span></div>
        <div class="a9-hv-body"><div class="a9-hv-src" data-ed></div><div class="a9-hv-res"><div class="k9-tabs" data-filters></div><div class="a9-hv-list" data-list></div></div></div></div>`;
      const ed = codeArea(q(b, '[data-ed]'), { lang: 'html', label: 'HTML', onInput: debounce(() => { run(); put('hv_draft', ed.value.length < 300000 ? ed.value : ''); }, 300) });
      const CATS = { all: 'Todos', error: 'Errores', warn: 'Avisos', info: 'Sugerencias', estructura: 'Estructura', accesibilidad: 'Accesibilidad', seo: 'SEO', seguridad: 'Seguridad' };
      function run() {
        issues = validateHtml(ed.value);
        const c = s => issues.filter(x => x.sev === s).length;
        q(b, '[data-sum]').innerHTML = !ed.value.trim() ? '' : issues.length ? `<span class="k9-bad">✕ ${c('error')}</span> · <span style="color:var(--e9-warn)">⚠ ${c('warn')}</span> · <span class="k9-muted">ℹ ${c('info')}</span>` : `<span class="k9-ok">✓ ${esc(tr('Sin problemas detectados'))}</span>`;
        q(b, '[data-filters]').innerHTML = Object.entries(CATS).map(([k, l]) => { const n = k === 'all' ? issues.length : issues.filter(x => x.sev === k || x.cat === k).length; return `<button class="${filter === k ? 'on' : ''}" data-fl="${k}">${esc(tr(l))} <small class="k9-muted">${n}</small></button>`; }).join('');
        const l = issues.filter(x => filter === 'all' || x.sev === filter || x.cat === filter);
        q(b, '[data-list]').innerHTML = !ed.value.trim() ? `<div class="k9-state">${I('check', 34)}<p>${esc(tr('Pega HTML o abre un archivo para analizarlo.'))}</p></div>` : l.length ? l.map(x => `<button class="a9-hv-it ${x.sev}" data-pos="${x.pos}"><span class="a9-hv-ic">${x.sev === 'error' ? '✕' : x.sev === 'warn' ? '⚠' : 'ℹ'}</span><span class="t"><b>${esc(x.msg)}</b><small>${esc(tr('Línea'))} ${lineOf(ed.value, x.pos)} · ${esc(tr(x.cat))}</small></span></button>`).join('') : `<div class="k9-state">${I('check', 34)}<p>${esc(tr('Nada en esta categoría.'))}</p></div>`;
      }
      const EXAMPLE = '<html>\n<head>\n  <title>Mi página</title>\n</head>\n<body>\n  <h1>Hola</h1>\n  <h3>Sección</h3>\n  <img src="http://example.com/foto.jpg">\n  <a href="https://example.com" target="_blank"></a>\n  <div id="caja"><p>Texto</div>\n  <span id="caja">Otro</span>\n  <input type="text" placeholder="Nombre">\n  <button onclick="enviar()">Enviar</button>\n  <a href="javascript:alert(1)">Clic</a>\n</body>\n</html>\n';
      b.addEventListener('click', async e => {
        const it = e.target.closest('[data-pos]'); if (it) { const p = +it.dataset.pos; const v = ed.value, z = Math.max(p + 1, v.indexOf('>', p) + 1); ed.select(p, z || p); return; }
        const fl = e.target.closest('[data-fl]'); if (fl) { filter = fl.dataset.fl; run(); return; }
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'open') { const f = await F.pick({ title: tr('Abrir HTML'), accept: f => /\.(html?|xhtml|svg|xml)$/i.test(f.name), deviceAccept: '.html,.htm,.xhtml', folder: 'documents' }); if (f) { ed.value = await f.blob.text(); run(); } }
        if (a.dataset.a === 'example') { ed.value = EXAMPLE; run(); }
        if (a.dataset.a === 'preview') E.ebOpenHtml(tr('Vista previa HTML'), ed.value, true);
      });
      ed.value = get('hv_draft', '') || EXAMPLE; run();
    }
  });

  /* ======================================================================
     Formateador de código
     ====================================================================== */
  function jsTokens(s) {
    const T = [], n = s.length; let i = 0;
    const regexOk = () => { for (let j = T.length - 1; j >= 0; j--) { const t = T[j]; if (t.k === 'ws' || t.k === 'com') continue; if (t.k === 'id') return /^(return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/.test(t.v); if (t.k !== 'p') return false; return !/^[)\]}]$/.test(t.v); } return true; };
    while (i < n) {
      const c = s[i];
      if (/\s/.test(c)) { let j = i; while (j < n && /\s/.test(s[j])) j++; const v = s.slice(i, j); T.push({ k: 'ws', v, nl: (v.match(/\n/g) || []).length }); i = j; continue; }
      if (c === '/' && s[i + 1] === '/') { let j = s.indexOf('\n', i); if (j < 0) j = n; T.push({ k: 'com', v: s.slice(i, j), line: true }); i = j; continue; }
      if (c === '/' && s[i + 1] === '*') { let j = s.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; T.push({ k: 'com', v: s.slice(i, j) }); i = j; continue; }
      if (c === '"' || c === "'") { let j = i + 1; while (j < n && s[j] !== c && s[j] !== '\n') { if (s[j] === '\\') j++; j++; } T.push({ k: 'str', v: s.slice(i, j + 1) }); i = j + 1; continue; }
      if (c === '`') { let j = i + 1, d = 0; while (j < n) { const ch = s[j]; if (ch === '\\') { j += 2; continue; } if (d === 0 && ch === '`') break; if (ch === '$' && s[j + 1] === '{') { d++; j += 2; continue; } if (d > 0 && ch === '{') d++; else if (d > 0 && ch === '}') d--; j++; } T.push({ k: 'str', v: s.slice(i, j + 1) }); i = j + 1; continue; }
      if (c === '/' && regexOk()) { let j = i + 1, cls = false; while (j < n && s[j] !== '\n') { if (s[j] === '\\') { j += 2; continue; } if (s[j] === '[') cls = true; else if (s[j] === ']') cls = false; else if (s[j] === '/' && !cls) break; j++; } j++; while (j < n && /[a-z]/i.test(s[j])) j++; T.push({ k: 're', v: s.slice(i, j) }); i = j; continue; }
      if (/\d/.test(c) || (c === '.' && /\d/.test(s[i + 1] || ''))) { const m = s.slice(i, i + 80).match(/^(?:0[xX][\da-fA-F_]+n?|0[oObB][\d_]+n?|\d[\d_]*n|(?:\d[\d_]*)?\.?\d[\d_]*(?:[eE][+-]?\d+)?)/); const v = m ? m[0] : c; T.push({ k: 'num', v }); i += v.length; continue; }
      if (/[A-Za-z_$#À-￿]/.test(c)) { let j = i + 1; while (j < n && /[\w$À-￿]/.test(s[j])) j++; T.push({ k: 'id', v: s.slice(i, j) }); i = j; continue; }
      const op = s.slice(i, i + 4).match(/^(?:>>>=|\.\.\.|===|!==|\*\*=|<<=|>>=|>>>|&&=|\|\|=|\?\?=|=>|==|!=|<=|>=|&&|\|\||\?\?|\?\.|\+\+|--|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|\*\*|<<|>>)/);
      const v = op ? op[0] : c; T.push({ k: 'p', v }); i += v.length;
    }
    return T;
  }
  // constructor de salida por fragmentos (evita operaciones O(n²) con cadenas grandes)
  function Builder() {
    const a = [];
    const B = {
      a,
      last: () => a.length ? a[a.length - 1] : '',
      put: s => { if (s) a.push(s); },
      trim(re = /[ \t]+$/) { while (a.length) { const s = a[a.length - 1], t = s.replace(re, ''); if (t === s) return; if (t) { a[a.length - 1] = t; return; } a.pop(); } },
      endsWith: s => a.slice(-3).join('').endsWith(s),
      atLS: () => { let i = a.length - 1; while (i >= 0 && /^[ \t]*$/.test(a[i])) i--; return i < 0 || a[i].endsWith('\n'); },
      nl(ind, lvl, blank) { B.trim(); if (!a.length) return; if (!B.endsWith('\n')) a.push('\n'); if (blank && !B.endsWith('\n\n')) a.push('\n'); if (lvl > 0) a.push(ind.repeat(lvl)); },
      sp: () => { if (a.length && !/[\s([{]$/.test(B.last())) a.push(' '); },
      str: () => a.join('')
    };
    return B;
  }
  const finish = s => s.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  function jsBeautify(src, ind) {
    const T = jsTokens(src), B = Builder(); let lvl = 0, prev = null, lineKw = ''; const stack = [], tern = [0];
    const top = () => stack[stack.length - 1], inParen = () => stack.length > 0 && top() !== '{';
    const next = x => { for (let j = x + 1; j < T.length; j++) if (T[j].k !== 'ws') return T[j]; return null; };
    const skipWs = x => { let blank = false; while (T[x + 1] && T[x + 1].k === 'ws') { if (T[x + 1].nl > 1) blank = true; x++; } return [x, blank]; };
    const nl = blank => B.nl(ind, lvl, blank);
    const valueEnd = p => !!p && (p.k === 'num' || p.k === 'str' || p.k === 're' || (p.k === 'id' && !/^(return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/.test(p.v)) || (p.k === 'p' && /^([)\]]|\+\+|--)$/.test(p.v)));
    const BIN = /^(?:=|==|===|!=|!==|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|\*\*=|<<=|>>=|>>>=|&&=|\|\|=|\?\?=|&&|\|\||\?\?|<|>|<=|>=|=>|\*|\/|%|\*\*|&|\||\^|<<|>>|>>>)$/;
    for (let x = 0; x < T.length; x++) {
      const t = T[x]; let blank;
      if (t.k === 'ws') { if (t.nl && !inParen()) nl(t.nl > 1); else B.sp(); continue; }
      if (t.k === 'com') { if (!B.atLS()) B.sp(); B.put(t.v); if (t.line) nl(); continue; }
      if (B.atLS()) lineKw = t.v;
      if (t.k !== 'p') { B.put(t.v); prev = t; continue; }
      const v = t.v;
      if (v === '{') { B.sp(); B.put('{'); stack.push('{'); tern.push(0); lvl++; const nx = next(x); if (!(nx && nx.v === '}')) { [x] = skipWs(x); nl(); } }
      else if (v === '}') { lvl = Math.max(0, lvl - 1); if (top() === '{') { stack.pop(); tern.pop(); } if (B.last().endsWith('{')) B.put('}'); else { nl(); B.put('}'); } const nx = next(x); if (nx && (/^[)\],;.]$/.test(nx.v) || nx.v === '?.')) [x] = skipWs(x); else if (nx && /^(else|catch|finally|while)$/.test(nx.v)) { [x] = skipWs(x); B.put(' '); } else if (nx) { [x, blank] = skipWs(x); nl(blank); } }
      else if (v === '(' || v === '[') { if (v === '(' && prev && prev.k === 'id' && /^(if|for|while|switch|catch|with|function)$/.test(prev.v)) B.sp(); B.put(v); stack.push(v); tern.push(0); }
      else if (v === ')' || v === ']') { B.trim(); B.put(v); stack.pop(); tern.pop(); if (!tern.length) tern.push(0); }
      else if (v === ';') { B.trim(); B.put(';'); if (inParen()) { B.put(' '); [x] = skipWs(x); } else { const nx = next(x); if (nx && !(nx.k === 'com' && nx.line && T[x + 1] && T[x + 1].k === 'ws' && !T[x + 1].nl)) { [x, blank] = skipWs(x); nl(blank); } } }
      else if (v === ',') { B.trim(); B.put(','); [x] = skipWs(x); if (top() === '{') nl(); else B.put(' '); }
      else if (v === '?') { B.sp(); B.put('? '); tern[tern.length - 1]++; [x] = skipWs(x); }
      else if (v === ':') { B.trim(); [x, blank] = skipWs(x); if (tern[tern.length - 1] > 0) { tern[tern.length - 1]--; B.put(' : '); } else if (/^(case|default)$/.test(lineKw) && top() === '{') { B.put(':'); nl(blank); } else B.put(': '); }
      else if (((v === '+' || v === '-') && valueEnd(prev)) || BIN.test(v)) { B.sp(); B.put(v + ' '); [x] = skipWs(x); }
      else B.put(v);
      prev = t;
    }
    return finish(B.str());
  }
  function jsCompact(src) {
    const T = jsTokens(src), a = []; let ws = null, prev = null, lastCh = '';
    const glue = (c) => (/[\w$À-￿]/.test(lastCh) && /^[\w$\\À-￿]/.test(c)) || (lastCh === '+' && c[0] === '+') || (lastCh === '-' && c[0] === '-') || (lastCh === '/' && c[0] === '/');
    for (const t of T) {
      if (t.k === 'ws') { ws = { nl: (ws && ws.nl) || t.nl > 0 }; continue; }
      if (t.k === 'com') { if (/^\/\*!/.test(t.v)) { if (a.length) a.push('\n'); a.push(t.v, '\n'); lastCh = '\n'; ws = null; prev = null; continue; } ws = { nl: (ws && ws.nl) || !!t.line || /\n/.test(t.v) }; continue; }
      if (ws && a.length) {
        const pv = prev ? prev.v : '';
        const canJoin = prev && prev.k === 'p' && pv !== '++' && pv !== '--' && pv !== ')' && pv !== ']' && pv !== '}';
        const nextJoin = t.k === 'p' && (/^[)\]},;.:?]$/.test(t.v) || /^(=|==|===|!=|!==|&&|\|\||\?\?|=>|\?\.|\+=|-=|\*=|\/=)$/.test(t.v));
        if (ws.nl && !canJoin && !nextJoin) { a.push('\n'); lastCh = '\n'; } else if (glue(t.v)) a.push(' ');
      } else if (a.length && glue(t.v)) a.push(' ');
      ws = null; a.push(t.v); lastCh = t.v.slice(-1); prev = t;
    }
    return a.join('').trim() + '\n';
  }
  function cssFormat(src, ind, minify) {
    const toks = []; let i = 0; const n = src.length;
    while (i < n) { const c = src[i]; if (c === '/' && src[i + 1] === '*') { let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; toks.push({ k: 'com', v: src.slice(i, j) }); i = j; continue; } if (c === '"' || c === "'") { let j = i + 1; while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; } toks.push({ k: 'str', v: src.slice(i, j + 1) }); i = j + 1; continue; } if (/\s/.test(c)) { let j = i; while (j < n && /\s/.test(src[j])) j++; toks.push({ k: 'ws', v: ' ' }); i = j; continue; } toks.push({ k: 'ch', v: c }); i++; }
    const nextSig = x => { for (let j = x + 1; j < toks.length; j++) if (toks[j].k !== 'ws' && toks[j].k !== 'com') return toks[j]; return null; };
    if (minify) {
      const a = []; let lastCh = '', paren = 0;
      for (let x = 0; x < toks.length; x++) {
        const t = toks[x];
        if (t.k === 'com') { if (/^\/\*!/.test(t.v)) { a.push(t.v); lastCh = '/'; } continue; }
        if (t.k === 'ws') { const nx = nextSig(x), c2 = nx ? nx.v[0] : ''; if (!a.length || !nx || /[{};,>~(:]/.test(lastCh) || (!paren && /[{};,>~)!]/.test(c2)) || (paren && /[,)]/.test(c2))) continue; a.push(' '); lastCh = ' '; continue; }
        if (t.v === '(') paren++; else if (t.v === ')') paren = Math.max(0, paren - 1);
        if (t.v === '}' && lastCh === ';' && a[a.length - 1] === ';') a.pop();
        a.push(t.v); lastCh = t.v.slice(-1);
      }
      return a.join('') + '\n';
    }
    const B = Builder(); let lvl = 0, paren = 0, decl = false;
    for (let x = 0; x < toks.length; x++) {
      const t = toks[x];
      if (t.k === 'com') { if (!B.atLS()) B.put(' '); B.put(t.v); B.nl(ind, lvl); continue; }
      if (t.k === 'ws') { if (B.a.length && !/[\s(]$/.test(B.last())) B.put(' '); continue; }
      if (t.k === 'str') { B.put(t.v); continue; }
      const v = t.v;
      if (v === '(') paren++; else if (v === ')') paren = Math.max(0, paren - 1);
      if (paren || v === ')') { B.put(v); continue; }
      if (v === '{') { B.trim(/\s+$/); B.put(' {'); lvl++; decl = false; B.nl(ind, lvl); continue; }
      if (v === '}') { lvl = Math.max(0, lvl - 1); B.nl(ind, lvl); B.put('}'); decl = false; B.nl(ind, lvl, lvl === 0); continue; }
      if (v === ';') { B.trim(/\s+$/); B.put(';'); decl = false; B.nl(ind, lvl); continue; }
      if (v === ':' && lvl > 0 && !decl) { let sawBrace = false; for (let j = x + 1; j < toks.length; j++) { if (toks[j].k !== 'ch') continue; const y = toks[j].v; if (y === '{') { sawBrace = true; break; } if (y === ';' || y === '}') break; } if (!sawBrace) { B.trim(/\s+$/); B.put(': '); decl = true; while (toks[x + 1] && toks[x + 1].k === 'ws') x++; continue; } }
      if (v === ',') { B.trim(/\s+$/); B.put(', '); while (toks[x + 1] && toks[x + 1].k === 'ws') x++; continue; }
      B.put(v);
    }
    return finish(B.str());
  }
  const collapseTag = raw => raw.replace(/("[^"]*"|'[^']*')|\s+/g, (m, qd) => qd || ' ').replace(/\s+(\/?>)$/, '$1');
  const isJsType = attrs => !/\btype\s*=\s*["']?(?!(?:text|application)\/(?:java|ecma)script|module)[\w/+.-]/i.test(attrs || '');
  function markupFormat(src, ind, minify, xml) {
    const toks = htmlTokens(src, xml);
    const INLINE = xml ? new Set() : new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'img', 'kbd', 'label', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'button', 'input', 'select']);
    const PRE = xml ? /^$/ : /^(pre|textarea)$/;
    if (minify) {
      const a = []; let pre = 0, lastTag = null, lastCh = '', scriptAttrs = '';
      for (const t of toks) {
        const raw = src.slice(t.a, t.z);
        if (t.k === 'comment') { if (/^<!--\[if|^<!--!/.test(raw)) { a.push(raw); lastCh = '>'; } continue; }
        if (t.k === 'text') {
          if (t.raw || pre) { const txt = t.raw && t.of === 'style' ? cssFormat(raw, '', true).trim() : t.raw && t.of === 'script' && isJsType(scriptAttrs) ? jsCompact(raw).trim() : raw; a.push(txt); lastCh = txt.slice(-1); continue; }
          const c = raw.replace(/\s+/g, ' ');
          if (c === ' ') { const nxt = src.slice(t.z, t.z + 40).match(/^<\/?([\w-]+)/); if (!(nxt && INLINE.has(nxt[1].toLowerCase()) && lastTag && INLINE.has(lastTag))) continue; }
          a.push(c); lastCh = c.slice(-1); continue;
        }
        if (t.k === 'start' && PRE.test(t.name)) pre++; if (t.k === 'end' && PRE.test(t.name)) pre = Math.max(0, pre - 1);
        if (t.k === 'start' && t.name === 'script') scriptAttrs = raw;
        const r2 = t.k === 'start' || t.k === 'end' ? collapseTag(raw) : raw;
        a.push(r2); lastCh = r2.slice(-1); if (t.k === 'start' || t.k === 'end') lastTag = t.name;
      }
      return a.join('').trim() + '\n';
    }
    const lines = []; let lvl = 0, line = '', pre = 0;
    const pad = () => ind.repeat(Math.max(0, lvl));
    const flush = () => { if (line.trim()) lines.push(pad() + line.trim()); line = ''; };
    for (let x = 0; x < toks.length; x++) {
      const t = toks[x], raw = src.slice(t.a, t.z);
      if (pre) { line += raw; if (t.k === 'end' && PRE.test(t.name)) { pre--; if (!pre) { lines.push(pad() + line.replace(/^\s+/, '')); line = ''; } } else if (t.k === 'start' && PRE.test(t.name)) pre++; continue; }
      if (t.k === 'text') {
        if (t.raw) { flush(); const body = raw.replace(/^\s*\n|\s+$/g, ''); if (body.trim()) { const ls = body.split('\n'), mi = ls.filter(l => l.trim()).reduce((m, l) => Math.min(m, l.match(/^\s*/)[0].length), Infinity); ls.forEach(l => lines.push(l.trim() ? pad() + l.slice(mi === Infinity ? 0 : mi) : '')); } continue; }
        const c = raw.replace(/\s+/g, ' '); if (c.trim()) line += (line && /^\s/.test(raw) ? ' ' : '') + c.trim() + (/\s$/.test(raw) ? ' ' : ''); else if (line) line += ' ';
        continue;
      }
      if (t.k === 'start' && PRE.test(t.name) && !t.self) { flush(); pre = 1; line = collapseTag(raw); continue; }
      if ((t.k === 'start' || t.k === 'end') && INLINE.has(t.name)) { line += collapseTag(raw); continue; }
      if (t.k === 'start') {
        const t1 = toks[x + 1], t2 = toks[x + 2];
        if (t1 && t1.k === 'text' && t2 && t2.k === 'end' && t2.name === t.name) { const txt = src.slice(t1.a, t1.z).replace(/\s+/g, ' ').trim(); if (txt.length <= 100 && (!/^(script|style)$/.test(t.name) || !txt)) { flush(); lines.push(pad() + collapseTag(raw) + txt + src.slice(t2.a, t2.z)); x += 2; continue; } }
        flush(); lines.push(pad() + collapseTag(raw));
        if (!t.self && !(!xml && VOID.has(t.name))) { lvl++; if (t1 && t1.k === 'end' && t1.name === t.name) { lines[lines.length - 1] += src.slice(t1.a, t1.z); lvl--; x++; } }
        continue;
      }
      if (t.k === 'end') { flush(); lvl = Math.max(0, lvl - 1); lines.push(pad() + raw); continue; }
      flush(); lines.push(pad() + raw.trim());
    }
    flush();
    return finish(lines.join('\n'));
  }
  function sqlFormat(src, ind, minify, upper) {
    const toks = []; let i = 0; const n = src.length;
    while (i < n) { const c = src[i]; if (c === '-' && src[i + 1] === '-') { let j = src.indexOf('\n', i); if (j < 0) j = n; toks.push({ k: 'com', v: src.slice(i, j) }); i = j; continue; } if (c === '/' && src[i + 1] === '*') { let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; toks.push({ k: 'com', v: src.slice(i, j) }); i = j; continue; } if (c === "'" || c === '"' || c === '`') { let j = i + 1; while (j < n) { if (src[j] === c) { if (c === "'" && src[j + 1] === "'") { j += 2; continue; } break; } j++; } toks.push({ k: 'str', v: src.slice(i, j + 1) }); i = j + 1; continue; } if (/\s/.test(c)) { let j = i; while (j < n && /\s/.test(src[j])) j++; toks.push({ k: 'ws', v: ' ' }); i = j; continue; } if (/[\w@$#]/.test(c)) { let j = i; while (j < n && /[\w@$#.]/.test(src[j])) j++; toks.push({ k: 'w', v: src.slice(i, j) }); i = j; continue; } const m = src.slice(i, i + 2).match(/^(<>|<=|>=|!=|\|\||::)/); const v = m ? m[0] : c; toks.push({ k: 'p', v }); i += v.length; }
    const KW = /^(select|from|where|and|or|not|insert|into|values|update|set|delete|create|table|drop|alter|add|column|join|left|right|inner|outer|full|cross|on|as|group|by|order|having|limit|offset|union|all|distinct|case|when|then|else|end|null|is|in|like|between|exists|primary|key|foreign|references|index|view|asc|desc|default|with|returning|unique|check|constraint|if|begin|commit|rollback|count|sum|avg|min|max|coalesce|cast|true|false)$/i;
    const W = t => t.k === 'w' && KW.test(t.v) ? (upper ? t.v.toUpperCase() : t.v.toLowerCase()) : t.v;
    const nextSig = x => { for (let j = x + 1; j < toks.length; j++) if (toks[j].k !== 'ws' && toks[j].k !== 'com') return j; return -1; };
    if (minify) { const a = []; let lastCh = ''; for (let x = 0; x < toks.length; x++) { const t = toks[x]; if (t.k === 'com') continue; if (t.k === 'ws') { const j = nextSig(x); if (a.length && j >= 0 && !/[(,=<>]/.test(lastCh) && !/^[),=<>;]/.test(toks[j].v)) { a.push(' '); lastCh = ' '; } continue; } const v = W(t); a.push(v); lastCh = v.slice(-1); } return a.join('').trim() + '\n'; }
    const MAJOR = /^(select|from|where|having|limit|offset|values|set|returning|with)$/i, JOINW = /^(join|left|right|inner|outer|full|cross)$/i;
    const B = Builder(); let depth = 0, clause = '', parenAt = [], prevW = '';
    const brk = d => { B.trim(/\s+$/); if (B.a.length) B.put('\n' + ind.repeat(Math.max(0, d))); };
    for (let x = 0; x < toks.length; x++) {
      const t = toks[x];
      if (t.k === 'ws') { if (B.a.length && !/[\s(]$/.test(B.last())) B.put(' '); continue; }
      if (t.k === 'com') { if (B.a.length && !/\s$/.test(B.last())) B.put(' '); B.put(t.v); if (t.v.startsWith('--')) brk(depth + (clause ? 1 : 0)); continue; }
      const lw = t.k === 'w' ? t.v.toLowerCase() : '', j = nextSig(x), nx = j >= 0 ? toks[j] : null;
      if ((lw === 'group' || lw === 'order') && nx && /^by$/i.test(nx.v)) { brk(depth); B.put(W(t) + ' ' + W(nx)); x = j; brk(depth + 1); clause = lw; prevW = 'by'; continue; }
      if (/^(insert|delete|update|create|alter|drop)$/.test(lw)) { brk(depth); B.put(W(t)); clause = lw; prevW = lw; continue; }
      if (lw === 'union' || lw === 'except' || lw === 'intersect') { brk(depth); B.put(W(t)); if (nx && /^all$/i.test(nx.v)) { B.put(' ' + W(nx)); x = j; } brk(depth); clause = ''; prevW = lw; continue; }
      if (MAJOR.test(lw)) { brk(depth); B.put(W(t)); brk(depth + 1); clause = lw; prevW = lw; continue; }
      if (JOINW.test(lw) && !JOINW.test(prevW)) { brk(depth); B.put(W(t)); clause = 'join'; prevW = lw; continue; }
      if ((lw === 'and' || lw === 'or') && /^(where|having|join)$/.test(clause) && !parenAt.length) { brk(depth + 1); B.put(W(t)); prevW = lw; continue; }
      if (t.v === '(') { if (nx && /^select$/i.test(nx.v)) { B.put('('); parenAt.push(clause); depth++; clause = ''; } else { parenAt.push(null); B.put('('); } continue; }
      if (t.v === ')') { const pc = parenAt.pop(); if (pc !== null && pc !== undefined) { depth = Math.max(0, depth - 1); brk(depth + 1); B.put(')'); clause = pc; } else { B.trim(); B.put(')'); } continue; }
      if (t.v === ',') { B.trim(); B.put(','); if (/^(select|group|order|set|returning)$/.test(clause) && !parenAt.some(p => p === null)) brk(depth + 1); else B.put(' '); while (toks[x + 1] && toks[x + 1].k === 'ws') x++; continue; }
      if (t.v === ';') { B.trim(/\s+$/); B.put(';\n\n'); clause = ''; depth = 0; parenAt = []; continue; }
      B.put(W(t)); if (t.k === 'w') prevW = lw;
    }
    return finish(B.str());
  }
  const FORMATS = { json: 'JSON', css: 'CSS', html: 'HTML', xml: 'XML', js: 'JavaScript', sql: 'SQL' };
  function formatCode(lang, src, o) {
    const ind = o.indent === 'tab' ? '\t' : ' '.repeat(+o.indent || 2);
    if (lang === 'json') { const e = jsonCheck(src); if (e) throw new Error(`${tr('Línea')} ${e.line}, ${tr('columna')} ${e.col}: ${e.msg}`); return o.minify ? JSON.stringify(JSON.parse(src)) + '\n' : JSON.stringify(JSON.parse(src), null, ind) + '\n'; }
    if (lang === 'css') return cssFormat(src, ind, o.minify);
    if (lang === 'html' || lang === 'xml') return markupFormat(src, ind, o.minify, lang === 'xml');
    if (lang === 'js') return o.minify ? jsCompact(src) : jsBeautify(src, ind);
    if (lang === 'sql') return sqlFormat(src, ind, o.minify, o.upper !== false);
    return src;
  }
  K.formatCode = formatCode;
  K.define('formatter', {
    init(b) {
      const S0 = Object.assign({ lang: 'js', indent: '2', upper: true }, get('fmt_prefs', {}));
      b.innerHTML = `<div class="k9 a9-fmt"><div class="k9-bar"><select class="input-text" data-lang aria-label="${esc(tr('Lenguaje'))}">${Object.entries(FORMATS).map(([k, v]) => `<option value="${k}"${k === S0.lang ? ' selected' : ''}>${v}</option>`).join('')}</select><select class="input-text" data-ind aria-label="${esc(tr('Sangría'))}"><option value="2">2 ${esc(tr('espacios'))}</option><option value="4">4 ${esc(tr('espacios'))}</option><option value="tab">${esc(tr('Tabulador'))}</option></select><label class="k9-small k9-row" data-upw><input type="checkbox" data-upper ${S0.upper ? 'checked' : ''}> ${esc(tr('Palabras clave en MAYÚSCULAS'))}</label><span class="sp"></span><button class="k9-btn pri" data-a="beauty">${esc(tr('Embellecer'))}</button><button class="k9-btn" data-a="min">${esc(tr('Minimizar'))}</button><button class="k9-btn" data-a="open">${I('folder', 14)} ${esc(tr('Abrir'))}</button></div>
        <div class="a9-fmt-body"><div><div class="a9-fmt-h">${esc(tr('Entrada'))}</div><div class="a9-fmt-ed" data-in></div></div><div><div class="a9-fmt-h">${esc(tr('Resultado'))} <span class="k9-muted k9-small" data-info></span><span class="sp"></span><button class="k9-btn" data-a="copy">${I('copy', 13)} ${esc(tr('Copiar'))}</button><button class="k9-btn" data-a="save">${I('save', 13)} ${esc(tr('Guardar'))}</button><button class="k9-btn" data-a="use">⇐ ${esc(tr('Usar como entrada'))}</button></div><div class="a9-fmt-ed" data-out></div></div></div></div>`;
      q(b, '[data-ind]').value = S0.indent;
      const inp = codeArea(q(b, '[data-in]'), { lang: S0.lang === 'xml' ? 'xml' : S0.lang, label: tr('Entrada') }), out = codeArea(q(b, '[data-out]'), { lang: S0.lang, readOnly: true, label: tr('Resultado') });
      const SAMPLE = { js: 'function suma(a,b){if(a==null){return b}const r=a+b;return r}\nconst lista=[1,2,3].map(x=>x*2);console.log(suma(1,2),lista)', json: '{"nombre":"EISENKU","version":9,"modos":["Linux","Windows"],"activo":true}', css: '.tarjeta{display:flex;gap:8px;padding:12px}.tarjeta:hover{background:#eee}@media (max-width:600px){.tarjeta{flex-direction:column}}', html: '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Demo</title></head><body><main><h1>Hola</h1><p>Texto con <b>negrita</b> y <a href="#">enlace</a>.</p><ul><li>Uno</li><li>Dos</li></ul></main></body></html>', xml: '<?xml version="1.0"?><catalogo><libro id="1"><titulo>Don Quijote</titulo><autor>Cervantes</autor></libro><libro id="2"><titulo>La Celestina</titulo></libro></catalogo>', sql: "select id, nombre, email from usuarios u left join pedidos p on p.usuario_id = u.id where u.activo = 1 and p.total > 100 order by nombre asc limit 10;" };
      const lang = () => q(b, '[data-lang]').value;
      const savePrefs = () => put('fmt_prefs', { lang: lang(), indent: q(b, '[data-ind]').value, upper: q(b, '[data-upper]').checked });
      function go(minify) {
        const l = lang(), src = inp.value; out.setLang(l);
        try { const r = formatCode(l, src, { indent: q(b, '[data-ind]').value, minify, upper: q(b, '[data-upper]').checked }); out.value = r; const a = new Blob([src]).size, z = new Blob([r]).size; q(b, '[data-info]').textContent = `${K.fmt.bytes(a)} → ${K.fmt.bytes(z)}${a ? ` (${z <= a ? '−' : '+'}${Math.abs(Math.round((1 - z / a) * 100))}%)` : ''}`; }
        catch (e) { out.value = '✕ ' + e.message; q(b, '[data-info]').textContent = ''; }
        savePrefs();
      }
      const syncLang = () => { const l = lang(); inp.setLang(l); out.setLang(l); q(b, '[data-upw]').hidden = l !== 'sql'; };
      q(b, '[data-lang]').addEventListener('change', () => { syncLang(); if (!inp.value.trim() || Object.values(SAMPLE).includes(inp.value)) inp.value = SAMPLE[lang()]; out.value = ''; savePrefs(); });
      b.addEventListener('click', async e => {
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'beauty') go(false); if (k === 'min') go(true);
        if (k === 'copy') K.ui.copy(out.value);
        if (k === 'use') { inp.value = out.value; }
        if (k === 'save') { if (!out.value.trim()) return; const n = await K.ui.prompt(tr('Guardar resultado'), tr('Nombre'), 'formateado.' + (lang() === 'js' ? 'js' : lang())); if (n) { const nm = await F.uniqueName('documents', F.cleanName(n)); await F.save(nm, new Blob([out.value], { type: F.typeOf({ name: nm }) }), 'documents'); E.toast(tr('Guardado en Archivos') + ': ' + nm); } }
        if (k === 'open') { const f = await F.pick({ title: tr('Abrir archivo'), accept: f => F.kindOf(f) === 'text', deviceAccept: '.js,.json,.css,.html,.htm,.xml,.sql,.svg', folder: 'documents' }); if (f) { const l = { js: 'js', mjs: 'js', json: 'json', css: 'css', html: 'html', htm: 'html', xml: 'xml', svg: 'xml', sql: 'sql' }[F.extOf(f.name)]; if (l) q(b, '[data-lang]').value = l; syncLang(); inp.value = await f.blob.text(); } }
      });
      syncLang(); inp.value = SAMPLE[lang()];
    }
  });

  /* ======================================================================
     Gestor de fragmentos
     ====================================================================== */
  K.define('snippets', {
    init(b) {
      let list = get('snippets', null); if (!Array.isArray(list)) { list = [{ id: E.uid(), title: tr('Petición fetch con JSON'), lang: 'js', tags: ['red', 'async'], code: "const res = await fetch('https://api.example.com/datos');\nif (!res.ok) throw new Error('HTTP ' + res.status);\nconst datos = await res.json();", mod: Date.now() }, { id: E.uid(), title: 'debounce', lang: 'js', tags: ['utilidades'], code: 'const debounce = (fn, ms = 300) => {\n  let t;\n  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };\n};', mod: Date.now() }, { id: E.uid(), title: tr('Centrar con CSS Grid'), lang: 'css', tags: ['diseño'], code: '.centro {\n  display: grid;\n  place-items: center;\n  min-height: 100vh;\n}', mod: Date.now() }]; put('snippets', list); }
      let cur = list[0] ? list[0].id : null, fq = '', ftag = '';
      b.innerHTML = `<div class="k9 a9-snip"><div class="k9-bar"><button class="k9-btn pri" data-a="new">${I('plus', 15)} ${esc(tr('Nuevo'))}</button><span class="sp"></span><button class="k9-btn" data-a="import">${I('upload', 15)} ${esc(tr('Importar JSON'))}</button><button class="k9-btn" data-a="export">${I('download', 15)} ${esc(tr('Exportar JSON'))}</button></div>
        <div class="k9-split" style="grid-template-columns:260px 1fr"><aside class="k9-side"><input class="input-text" data-q placeholder="${esc(tr('Buscar fragmentos…'))}"><div class="a9-snip-tags" data-tags></div><div data-list></div></aside><main class="k9-main" data-ed></main></div></div>`;
      const save = debounce(() => put('snippets', list), 400);
      const curS = () => list.find(x => x.id === cur);
      function side() {
        const tags = [...new Set(list.flatMap(x => x.tags || []))].sort();
        q(b, '[data-tags]').innerHTML = tags.map(t => `<button class="k9-badge${ftag === t ? ' g' : ''}" data-tag="${esc(t)}">#${esc(t)}</button>`).join('');
        const n = K.norm(fq), l = list.filter(x => (!ftag || (x.tags || []).includes(ftag)) && (!n || K.norm(x.title + ' ' + x.code + ' ' + (x.tags || []).join(' ')).includes(n))).sort((a, c) => c.mod - a.mod);
        q(b, '[data-list]').innerHTML = l.map(x => `<button class="k9-item${x.id === cur ? ' on' : ''}" data-id="${esc(x.id)}"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.title || tr('Sin título'))}</span><small class="k9-badge">${esc(LANG_NAMES[x.lang] || x.lang)}</small></button>`).join('') || `<p class="k9-small k9-muted" style="padding:8px">${esc(tr('Sin resultados'))}</p>`;
      }
      let area = null;
      function editor() {
        const s = curS(), M = q(b, '[data-ed]');
        if (!s) { M.innerHTML = `<div class="k9-state">${I('code', 40)}<p>${esc(tr('Crea un fragmento para guardar código que reutilizas a menudo.'))}</p></div>`; return; }
        M.innerHTML = `<div class="k9-bar"><input class="input-text" data-f="title" value="${esc(s.title)}" style="flex:1;font-weight:600" aria-label="${esc(tr('Título'))}"><select class="input-text" data-f="lang">${Object.entries(LANG_NAMES).map(([k, v]) => `<option value="${k}"${k === s.lang ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></div><div class="k9-bar"><input class="input-text" data-f="tags" value="${esc((s.tags || []).join(', '))}" placeholder="${esc(tr('Etiquetas separadas por comas'))}" style="flex:1"><button class="k9-btn pri" data-a="copy">${I('copy', 14)} ${esc(tr('Copiar'))}</button><button class="k9-btn" data-a="toeditor">${I('code', 14)} ${esc(tr('Abrir en el Editor'))}</button><button class="k9-btn" data-a="dup">${esc(tr('Duplicar'))}</button><button class="k9-btn dng" data-a="del" aria-label="${esc(tr('Eliminar'))}">${I('trash', 14)}</button></div><div class="a9-snip-code" data-code></div><div class="k9-status"><span>${esc(tr('Modificado'))}: ${esc(K.fmt.dt(s.mod))}</span><span style="margin-left:auto">${s.code.split('\n').length} ${esc(tr('líneas'))}</span></div>`;
        area = codeArea(q(M, '[data-code]'), { lang: s.lang, onInput: () => { s.code = area.value.slice(0, 100000); s.mod = Date.now(); save(); } }); area.value = s.code;
      }
      b.addEventListener('input', e => { const f = e.target.closest('[data-f]'), s = curS(); if (!f || !s) return; if (f.dataset.f === 'title') s.title = f.value.slice(0, 120); if (f.dataset.f === 'tags') s.tags = f.value.split(',').map(x => x.trim().toLowerCase()).filter(Boolean).slice(0, 8); s.mod = Date.now(); save(); side(); });
      b.addEventListener('change', e => { const f = e.target.closest('[data-f="lang"]'), s = curS(); if (f && s) { s.lang = f.value; area && area.setLang(s.lang); save(); side(); } });
      q(b, '[data-q]').addEventListener('input', e => { fq = e.target.value; side(); });
      b.addEventListener('click', async e => {
        const it = e.target.closest('[data-id]'); if (it) { cur = it.dataset.id; side(); editor(); return; }
        const tg = e.target.closest('[data-tag]'); if (tg) { ftag = ftag === tg.dataset.tag ? '' : tg.dataset.tag; side(); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const s = curS();
        if (a.dataset.a === 'new') { const n = { id: E.uid(), title: tr('Nuevo fragmento'), lang: s ? s.lang : 'js', tags: [], code: '', mod: Date.now() }; list.push(n); cur = n.id; save(); side(); editor(); q(b, '[data-f="title"]').select(); }
        if (a.dataset.a === 'copy' && s) K.ui.copy(s.code);
        if (a.dataset.a === 'toeditor' && s) E.launch('codeeditor', { text: s.code, name: F.cleanName(s.title) + '.' + (EXT_OF[s.lang] || 'txt'), lang: s.lang });
        if (a.dataset.a === 'dup' && s) { const n = Object.assign({}, s, { id: E.uid(), title: s.title + ' (' + tr('copia') + ')', tags: (s.tags || []).slice(), mod: Date.now() }); list.push(n); cur = n.id; save(); side(); editor(); }
        if (a.dataset.a === 'del' && s && await E.confirm(tr('Eliminar fragmento'), s.title)) { list = list.filter(x => x !== s); cur = list[0] ? list[0].id : null; put('snippets', list); side(); editor(); }
        if (a.dataset.a === 'export') devDownload('fragmentos_eisenku.json', new Blob([JSON.stringify({ app: 'EISENKU OS', type: 'snippets', v: 1, items: list }, null, 2)], { type: 'application/json' }));
        if (a.dataset.a === 'import') { const [f] = await K.ui.pickFile('.json,application/json'); if (!f) return; try { const d = JSON.parse(await f.text()), items = Array.isArray(d) ? d : d.items; if (!Array.isArray(items)) throw new Error(tr('Formato no reconocido')); let n = 0; items.slice(0, 2000).forEach(x => { if (!x || typeof x.code !== 'string') return; list.push({ id: E.uid(), title: String(x.title || tr('Importado')).slice(0, 120), lang: LANG_NAMES[x.lang] ? x.lang : 'text', tags: Array.isArray(x.tags) ? x.tags.map(t => String(t).slice(0, 30)).slice(0, 8) : [], code: x.code.slice(0, 100000), mod: Date.now() }); n++; }); put('snippets', list); side(); E.toast(n + ' ' + tr('fragmentos importados')); } catch (er) { K.ui.alert(tr('No se pudo importar'), er.message); } }
      });
      side(); editor();
    }
  });

  /* ======================================================================
     Generador de documentación (JSDoc → Markdown/HTML)
     ====================================================================== */
  function parseDocs(src, file) {
    const out = [], undocumented = [], re = /\/\*\*([\s\S]*?)\*\//g; let m; const documented = new Set(); let header = null;
    while ((m = re.exec(src))) {
      const body = m[1].split('\n').map(l => l.replace(/^\s*\*\s?/, '')).join('\n').trim();
      // la declaración es la primera línea con código tras el comentario (sin consumir el siguiente comentario)
      let decl = ((src.slice(m.index + m[0].length, m.index + m[0].length + 600).match(/^\s*([^\n]*)/) || [])[1] || '').trim(); if (decl.startsWith('/*')) decl = '';
      const desc = [], tags = []; let ct = null;
      body.split('\n').forEach(l => { const t = l.match(/^@(\w+)\s*([\s\S]*)$/); if (t) { ct = { tag: t[1], text: t[2] }; tags.push(ct); } else if (ct) ct.text += '\n' + l; else desc.push(l); });
      const T = n => tags.filter(t => t.tag === n), T1 = n => T(n)[0];
      let kind = 'other', name = '', sig = '', ext = '', d;
      if ((d = decl.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([\w$]+)\s*\(([^)]*)\)/))) { kind = 'function'; name = d[1]; sig = d[2]; }
      else if ((d = decl.match(/^(?:export\s+)?(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s+)?(?:function\s*\*?\s*[\w$]*\s*)?\(([^)]*)\)/))) { kind = 'function'; name = d[1]; sig = d[2]; }
      else if ((d = decl.match(/^(?:export\s+)?(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s+)?([\w$]+)\s*=>/))) { kind = 'function'; name = d[1]; sig = d[2]; }
      else if ((d = decl.match(/^(?:export\s+)?(?:default\s+)?class\s+([\w$]+)(?:\s+extends\s+([\w$.]+))?/))) { kind = 'class'; name = d[1]; ext = d[2] || ''; }
      else if ((d = decl.match(/^(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?(?!if\b|for\b|while\b|switch\b|catch\b|function\b)([\w$]+)\s*\(([^)]*)\)\s*\{/))) { kind = 'method'; name = d[1]; sig = d[2]; }
      else if ((d = decl.match(/^([\w$]+)\s*:\s*(?:async\s+)?(?:function\s*)?\(([^)]*)\)/))) { kind = 'method'; name = d[1]; sig = d[2]; }
      else if ((d = decl.match(/^(?:export\s+)?(?:const|let|var)\s+([\w$]+)/))) { kind = 'constant'; name = d[1]; }
      if (T1('typedef')) { kind = 'typedef'; const td = T1('typedef').text.match(/^(?:\{([^}]*)\}\s*)?([\w$.]+)/); name = td ? td[2] : name; sig = td && td[1] ? td[1] : ''; }
      if (T1('callback')) { kind = 'typedef'; name = T1('callback').text.trim().split(/\s/)[0]; }
      if (T1('file') || T1('fileoverview') || T1('module')) { header = { desc: desc.join('\n').trim() || (T1('file') || T1('fileoverview') || {}).text || '', module: T1('module') ? T1('module').text.trim() : '' }; if (!name) continue; }
      if (!name) continue;
      const params = T('param').concat(T('arg'), T('argument')).map(p => { const x = p.text.match(/^(?:\{([^}]*)\})?\s*(\[)?([\w$.]+)(?:=([^\]]*))?\]?\s*(?:-\s*)?([\s\S]*)$/) || []; return { type: x[1] || '', opt: !!x[2], name: x[3] || '', def: x[4] || '', desc: (x[5] || '').trim() }; });
      const ret = T1('returns') || T1('return'); const rx = ret ? ret.text.match(/^(?:\{([^}]*)\})?\s*([\s\S]*)$/) : null;
      const props = T('property').concat(T('prop')).map(p => { const x = p.text.match(/^(?:\{([^}]*)\})?\s*(\[)?([\w$.]+)(?:=([^\]]*))?\]?\s*(?:-\s*)?([\s\S]*)$/) || []; return { type: x[1] || '', opt: !!x[2], name: x[3] || '', def: x[4] || '', desc: (x[5] || '').trim() }; });
      documented.add(name);
      out.push({ kind, name, sig, ext, file, line: lineOf(src, m.index), desc: desc.join('\n').trim(), params, props, returns: rx ? { type: rx[1] || '', desc: rx[2].trim() } : null, examples: T('example').map(x => x.text.replace(/^\n+|\s+$/g, '')), deprecated: T1('deprecated') ? (T1('deprecated').text.trim() || true) : false, throws: T('throws').concat(T('exception')).map(x => x.text.trim()), since: T1('since') ? T1('since').text.trim() : '', see: T('see').map(x => x.text.trim()), async: /\basync\b/.test(decl) });
    }
    const dre = /^\s*(?:export\s+)?(?:(?:async\s+)?function\s*\*?\s*([\w$]+)|class\s+([\w$]+)|(?:const|let)\s+([\w$]+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|[\w$]+\s*=>))/gm; let u;
    while ((u = dre.exec(src))) { const n = u[1] || u[2] || u[3]; if (n && !documented.has(n) && !n.startsWith('_')) undocumented.push({ name: n, line: lineOf(src, u.index), file }); }
    return { items: out, undocumented, header };
  }
  function docsMarkdown(title, parsed) {
    const KN = { function: 'Función', class: 'Clase', method: 'Método', constant: 'Constante', typedef: 'Tipo', other: 'Elemento' };
    const all = parsed.flatMap(p => p.items), head = parsed.map(p => p.header).filter(Boolean);
    const sigOf = it => it.kind === 'class' ? `class ${it.name}${it.ext ? ' extends ' + it.ext : ''}` : it.kind === 'constant' ? it.name : it.kind === 'typedef' ? it.name + (it.sig ? ': ' + it.sig : '') : `${it.async ? 'async ' : ''}${it.name}(${it.params.length ? it.params.map(p => p.opt ? `[${p.name}]` : p.name).join(', ') : it.sig.replace(/\s+/g, ' ').trim()})`;
    let md = `# ${title}\n\n`;
    head.forEach(h => { if (h.module) md += `**${tr('Módulo')}:** \`${h.module}\`\n\n`; if (h.desc) md += h.desc + '\n\n'; });
    md += `> ${tr('Generado con EISENKU OS el')} ${new Date().toLocaleDateString(K.locale, { day: 'numeric', month: 'long', year: 'numeric' })} · ${all.length} ${tr('elementos documentados')}\n\n## ${tr('Índice')}\n\n`;
    all.forEach(it => { const h = sigOf(it); md += `- [${h.replace(/[[\]]/g, '')}](#${K.slug(h)}) — ${tr(KN[it.kind])}${it.deprecated ? ' · ' + tr('obsoleto') : ''}\n`; });
    all.forEach(it => {
      const h = sigOf(it); md += `\n---\n\n## ${h}\n\n*${tr(KN[it.kind])}*${it.file ? ` · \`${it.file}\` ${tr('línea')} ${it.line}` : ''}${it.since ? ` · ${tr('desde')} ${it.since}` : ''}\n\n`;
      if (it.deprecated) md += `> **${tr('Obsoleto')}.** ${it.deprecated === true ? '' : it.deprecated}\n\n`;
      if (it.desc) md += it.desc + '\n\n';
      const rows = (l, ttl) => { if (!l.length) return; md += `**${ttl}**\n\n| ${tr('Nombre')} | ${tr('Tipo')} | ${tr('Descripción')} |\n|---|---|---|\n`; l.forEach(p => { md += `| \`${p.name}\`${p.opt ? ' *(' + tr('opcional') + ')*' : ''}${p.def ? ` = \`${p.def}\`` : ''} | ${p.type ? '`' + p.type.replace(/\|/g, ' o ') + '`' : '—'} | ${(p.desc || '—').replace(/\n/g, ' ').replace(/\|/g, '/')} |\n`; }); md += '\n'; };
      rows(it.params, tr('Parámetros')); rows(it.props, tr('Propiedades'));
      if (it.returns) md += `**${tr('Devuelve')}:** ${it.returns.type ? '`' + it.returns.type + '`' : ''} ${it.returns.desc}\n\n`;
      if (it.throws.length) md += `**${tr('Lanza')}:** ${it.throws.join('; ')}\n\n`;
      it.examples.forEach(ex => { md += `**${tr('Ejemplo')}**\n\n\`\`\`js\n${ex}\n\`\`\`\n\n`; });
      if (it.see.length) md += `**${tr('Ver también')}:** ${it.see.join(', ')}\n\n`;
    });
    const und = parsed.flatMap(p => p.undocumented);
    if (und.length) { md += `\n---\n\n## ${tr('Sin documentar')}\n\n`; und.forEach(u => { md += `- \`${u.name}\`${u.file ? ` (${u.file}, ${tr('línea')} ${u.line})` : ''}\n`; }); }
    return md;
  }
  K.define('docgen', {
    init(b) {
      const st = { sources: [], title: tr('Documentación de la API') };
      b.innerHTML = `<div class="k9 a9-doc"><div class="k9-bar"><button class="k9-btn" data-a="open">${I('folder', 15)} ${esc(tr('Añadir archivo'))}</button><button class="k9-btn" data-a="example">${esc(tr('Ejemplo'))}</button><input class="input-text" data-title value="${esc(st.title)}" style="width:220px" aria-label="${esc(tr('Título'))}"><span class="sp"></span><button class="k9-btn pri" data-a="md">${I('save', 14)} Markdown</button><button class="k9-btn" data-a="html">${I('download', 14)} HTML</button></div>
        <div class="a9-doc-body"><div class="a9-doc-src"><div class="k9-tabs" data-files></div><div class="a9-doc-ed" data-ed></div></div><article class="md-view a9-doc-view" data-view></article></div>
        <div class="k9-status"><span data-stat></span></div></div>`;
      const ed = codeArea(q(b, '[data-ed]'), { lang: 'js', label: tr('Código fuente'), onInput: debounce(() => { if (st.sources[st.cur]) st.sources[st.cur].code = ed.value; render(); }, 300) });
      st.cur = 0;
      let md = '';
      function render() {
        st.title = q(b, '[data-title]').value || st.title;
        const parsed = st.sources.map(s => parseDocs(s.code, st.sources.length > 1 ? s.name : ''));
        md = docsMarkdown(st.title, parsed); const r = K.md(md); q(b, '[data-view]').innerHTML = r.html;
        const n = parsed.reduce((a, p) => a + p.items.length, 0), u = parsed.reduce((a, p) => a + p.undocumented.length, 0);
        q(b, '[data-stat]').textContent = `${n} ${tr('elementos documentados')}${u ? ` · ${u} ${tr('sin documentar')}` : ''} · ${st.sources.length} ${tr('archivos')}`;
        q(b, '[data-files]').innerHTML = st.sources.map((s, i) => `<button class="${i === st.cur ? 'on' : ''}" data-src="${i}">${esc(s.name)}${st.sources.length > 1 ? ` <span data-rm="${i}" aria-label="${esc(tr('Quitar'))}">✕</span>` : ''}</button>`).join('');
      }
      const EXAMPLE = `/**\n * @file Utilidades matemáticas de ejemplo.\n * @module mates\n */\n\n/**\n * Suma dos números.\n * @param {number} a - Primer sumando.\n * @param {number} [b=0] - Segundo sumando.\n * @returns {number} La suma de a y b.\n * @example\n * suma(2, 3); // 5\n */\nexport function suma(a, b = 0) {\n  return a + b;\n}\n\n/**\n * Punto en el plano.\n * @typedef {Object} Punto\n * @property {number} x - Coordenada horizontal.\n * @property {number} y - Coordenada vertical.\n */\n\n/**\n * Distancia entre dos puntos.\n * @param {Punto} p\n * @param {Punto} q\n * @returns {number}\n * @throws {TypeError} Si falta algún punto.\n * @since 9.0\n */\nexport const distancia = (p, q) => Math.hypot(q.x - p.x, q.y - p.y);\n\n/**\n * Calcula la media.\n * @deprecated Usa {@link estadistica.media}.\n * @param {number[]} lista\n */\nfunction media(lista) { return lista.reduce((a, b) => a + b, 0) / lista.length; }\n\nfunction sinDocumentar() {}\n`;
      b.addEventListener('click', async e => {
        const rm = e.target.closest('[data-rm]'); if (rm) { e.stopPropagation(); st.sources.splice(+rm.dataset.rm, 1); st.cur = 0; ed.value = st.sources[0] ? st.sources[0].code : ''; render(); return; }
        const s = e.target.closest('[data-src]'); if (s) { st.cur = +s.dataset.src; ed.value = st.sources[st.cur].code; render(); return; }
        const lk = e.target.closest('[data-view] a[href^="#"]'); if (lk) { e.preventDefault(); const t = q(b, '[data-view]').querySelector(CSS.escape ? '#' + CSS.escape(lk.getAttribute('href').slice(1)) : lk.getAttribute('href')); if (t) t.scrollIntoView({ behavior: 'smooth' }); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'open') { const f = await F.pick({ title: tr('Añadir archivo de código'), accept: f => /\.(m?js|cjs|jsx|tsx?)$/i.test(f.name), deviceAccept: '.js,.mjs,.cjs,.jsx,.ts,.tsx', folder: 'documents' }); if (f) { if (st.sources.length === 1 && st.sources[0].name === tr('ejemplo.js')) st.sources = []; st.sources.push({ name: f.name, code: await f.blob.text() }); st.cur = st.sources.length - 1; ed.value = st.sources[st.cur].code; render(); } }
        if (k === 'example') { st.sources = [{ name: tr('ejemplo.js'), code: EXAMPLE }]; st.cur = 0; ed.value = EXAMPLE; render(); }
        if (k === 'md' || k === 'html') {
          const name = F.cleanName(st.title) + (k === 'md' ? '.md' : '.html');
          const data = k === 'md' ? md : `<!doctype html><html lang="${(window.EISEN_I18N || {}).lang || 'es'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(st.title)}</title><style>body{font:15px/1.6 system-ui,sans-serif;max-width:860px;margin:2rem auto;padding:0 1rem;color:#1b1d22}code{background:#f0f2f4;padding:1px 5px;border-radius:4px}pre{background:#f6f8fa;padding:12px;border-radius:8px;overflow:auto}table{border-collapse:collapse}td,th{border:1px solid #d6dade;padding:6px 10px}blockquote{border-left:3px solid #c93a73;margin:0;padding:4px 14px;background:#fdf1f5}h2{border-bottom:1px solid #e3e6e9;padding-bottom:4px}a{color:#1f6f55}</style></head><body>${K.md(md).html.replace(/<a href="#" data-external-url="([^"]+)">/g, '<a href="$1" rel="noopener">')}</body></html>`;
          const blob = new Blob([data], { type: k === 'md' ? 'text/markdown' : 'text/html' }); const nm = await F.uniqueName('documents', name); await F.save(nm, blob, 'documents'); devDownload(name, blob); E.toast(tr('Guardado en Archivos') + ': ' + nm);
        }
      });
      q(b, '[data-title]').addEventListener('input', debounce(render, 300));
      st.sources = [{ name: tr('ejemplo.js'), code: EXAMPLE }]; ed.value = EXAMPLE; render();
    }
  });

  /* ======================================================================
     Entorno de pruebas (tests unitarios aislados)
     ====================================================================== */
  const HARNESS = `(function(){
  var tests = [], prefix = [], before = [], after = [];
  function fv(v){ try { if (typeof v === 'string') return JSON.stringify(v); if (v === undefined) return 'undefined'; if (typeof v === 'function') return 'ƒ ' + (v.name || ''); if (typeof v === 'number' || typeof v === 'boolean' || v === null) return String(v); if (typeof v === 'bigint') return v + 'n'; return JSON.stringify(v, function(k, x){ return typeof x === 'bigint' ? x + 'n' : x; }); } catch (e) { return String(v); } }
  function eq(a, b){ if (Object.is(a, b)) return true; if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false; if (Array.isArray(a) !== Array.isArray(b)) return false; if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && +a === +b; if (a instanceof Map || a instanceof Set) return eq(Array.from(a), Array.from(b)); var ka = Object.keys(a), kb = Object.keys(b); if (ka.length !== kb.length) return false; return ka.every(function(k){ return Object.prototype.hasOwnProperty.call(b, k) && eq(a[k], b[k]); }); }
  self.describe = function(name, fn){ prefix.push(name); try { fn(); } finally { prefix.pop(); } };
  self.test = self.it = function(name, fn){ tests.push({ name: prefix.concat(name).join(' › '), fn: fn }); };
  self.test.skip = self.it.skip = function(name){ tests.push({ name: prefix.concat(name).join(' › '), skip: true }); };
  self.beforeEach = function(fn){ before.push(fn); }; self.afterEach = function(fn){ after.push(fn); };
  self.expect = function(actual){
    function mk(neg){
      function chk(pass, msg){ if (pass === neg) { var e = new Error((neg ? 'No se esperaba que ' : '') + msg()); e.__exp = true; throw e; } }
      return {
        toBe: function(x){ chk(Object.is(actual, x), function(){ return 'esperado ' + fv(x) + ', recibido ' + fv(actual); }); },
        toEqual: function(x){ chk(eq(actual, x), function(){ return 'esperado ' + fv(x) + ', recibido ' + fv(actual); }); },
        toStrictEqual: function(x){ chk(eq(actual, x), function(){ return 'esperado ' + fv(x) + ', recibido ' + fv(actual); }); },
        toBeTruthy: function(){ chk(!!actual, function(){ return 'esperado un valor verdadero, recibido ' + fv(actual); }); },
        toBeFalsy: function(){ chk(!actual, function(){ return 'esperado un valor falso, recibido ' + fv(actual); }); },
        toBeNull: function(){ chk(actual === null, function(){ return 'esperado null, recibido ' + fv(actual); }); },
        toBeUndefined: function(){ chk(actual === undefined, function(){ return 'esperado undefined, recibido ' + fv(actual); }); },
        toBeDefined: function(){ chk(actual !== undefined, function(){ return 'esperado un valor definido'; }); },
        toBeNaN: function(){ chk(Number.isNaN(actual), function(){ return 'esperado NaN, recibido ' + fv(actual); }); },
        toContain: function(x){ chk(actual != null && (typeof actual === 'string' ? actual.indexOf(x) >= 0 : Array.from(actual).some(function(y){ return Object.is(y, x); })), function(){ return fv(actual) + ' contuviera ' + fv(x); }); },
        toMatch: function(r){ chk(typeof actual === 'string' && (r instanceof RegExp ? r.test(actual) : actual.indexOf(r) >= 0), function(){ return fv(actual) + ' coincidiera con ' + String(r); }); },
        toHaveLength: function(n){ chk(actual != null && actual.length === n, function(){ return 'longitud ' + n + ', recibida ' + (actual == null ? fv(actual) : actual.length); }); },
        toHaveProperty: function(k){ var v = arguments, has = actual != null && k in Object(actual); chk(has && (v.length < 2 || eq(actual[k], v[1])), function(){ return 'propiedad ' + fv(k) + (v.length > 1 ? ' = ' + fv(v[1]) : ''); }); },
        toBeGreaterThan: function(n){ chk(actual > n, function(){ return fv(actual) + ' > ' + fv(n); }); },
        toBeGreaterThanOrEqual: function(n){ chk(actual >= n, function(){ return fv(actual) + ' >= ' + fv(n); }); },
        toBeLessThan: function(n){ chk(actual < n, function(){ return fv(actual) + ' < ' + fv(n); }); },
        toBeLessThanOrEqual: function(n){ chk(actual <= n, function(){ return fv(actual) + ' <= ' + fv(n); }); },
        toBeCloseTo: function(n, d){ d = d == null ? 2 : d; chk(Math.abs(actual - n) < Math.pow(10, -d) / 2, function(){ return fv(actual) + ' ≈ ' + fv(n) + ' (' + d + ' decimales)'; }); },
        toBeInstanceOf: function(C){ chk(actual instanceof C, function(){ return 'instancia de ' + (C && C.name); }); },
        toThrow: function(m){ var threw = false, err; try { actual(); } catch (e) { threw = true; err = e; } chk(threw && (m === undefined || (m instanceof RegExp ? m.test(err && err.message) : typeof m === 'function' ? err instanceof m : String(err && err.message).indexOf(m) >= 0)), function(){ return threw ? 'el error «' + (err && err.message) + '» coincidiera con ' + String(m) : 'lanzara un error'; }); }
      };
    }
    var o = mk(false); o.not = mk(true); return o;
  };
  self.__k9tests = async function(){
    var res = [], T0 = performance.now();
    for (var i = 0; i < tests.length; i++) { var t = tests[i]; if (t.skip) { res.push({ name: t.name, st: 'skip', ms: 0 }); continue; } var t0 = performance.now();
      try { for (var j = 0; j < before.length; j++) await before[j](); await t.fn(); for (var k = 0; k < after.length; k++) await after[k](); res.push({ name: t.name, st: 'pass', ms: performance.now() - t0 }); }
      catch (e) { res.push({ name: t.name, st: 'fail', ms: performance.now() - t0, err: (e && e.__exp ? '' : (e && e.name ? e.name + ': ' : '')) + (e && e.message || String(e)) }); } }
    return { res: res, ms: performance.now() - T0 };
  };
})();`;
  K.define('testlab', (() => {
    let sb = null;
    return {
      init(b) {
        const SAMPLE = { code: `// ${tr('Escribe aquí tus funciones')}\nfunction esPrimo(n) {\n  if (n < 2) return false;\n  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;\n  return true;\n}\n\nconst capitalizar = s => s.charAt(0).toUpperCase() + s.slice(1);\n\nasync function esperar(ms) {\n  return new Promise(r => setTimeout(() => r(ms), ms));\n}\n`, tests: `describe('esPrimo', () => {\n  test('reconoce primos', () => {\n    expect(esPrimo(2)).toBe(true);\n    expect(esPrimo(17)).toBeTruthy();\n  });\n  test('descarta compuestos', () => {\n    expect([4, 6, 9].some(esPrimo)).toBe(false);\n  });\n});\n\ntest('capitalizar', () => {\n  expect(capitalizar('eisenku')).toEqual('Eisenku');\n});\n\ntest('pruebas asíncronas', async () => {\n  expect(await esperar(50)).toBe(50);\n});\n\ntest('esta prueba falla a propósito', () => {\n  expect({ a: 1, b: [1, 2] }).toEqual({ a: 1, b: [1, 3] });\n});\n` };
        const st = Object.assign({}, SAMPLE, get('testlab', {}));
        b.innerHTML = `<div class="k9 a9-tl"><div class="k9-bar"><button class="k9-btn pri" data-a="run" title="Ctrl+Enter">▶ ${esc(tr('Ejecutar pruebas'))}</button><span class="k9-small k9-muted" data-mode></span><span class="sp"></span><button class="k9-btn" data-a="sample">${esc(tr('Ejemplo'))}</button><button class="k9-btn" data-a="api">${I('help', 14)} ${esc(tr('API'))}</button><button class="k9-btn" data-a="save">${I('save', 14)} ${esc(tr('Guardar como .js'))}</button></div>
          <div class="a9-tl-body"><div class="a9-tl-eds"><div class="a9-fmt-h">${esc(tr('Código'))}</div><div class="a9-tl-ed" data-code></div><div class="a9-fmt-h">${esc(tr('Pruebas'))}</div><div class="a9-tl-ed" data-tests></div></div><div class="a9-tl-rep" data-rep><div class="k9-state">${I('check', 36)}<p>${esc(tr('Pulsa «Ejecutar pruebas». El código se ejecuta aislado: no puede tocar tus datos.'))}</p></div></div></div></div>`;
        const save = debounce(() => put('testlab', { code: ce.value, tests: te.value }), 500);
        const ce = codeArea(q(b, '[data-code]'), { lang: 'js', label: tr('Código'), onInput: save }), te = codeArea(q(b, '[data-tests]'), { lang: 'js', label: tr('Pruebas'), onInput: save });
        ce.value = st.code; te.value = st.tests;
        if (sb) sb.destroy();
        const logs = [];
        sb = Sandbox(m => { if (m.t === 'log') logs.push(m); if (m.t === 'mode') q(b, '[data-mode]').textContent = m.mode === 'worker' ? tr('Aislado (Worker)') : tr('Aislado (sin Worker)'); }, { timeout: 15000 });
        let busy = false;
        async function run() {
          if (busy) return; busy = true; const R = q(b, '[data-rep]'); K.ui.loading(R, tr('Ejecutando pruebas…')); logs.length = 0;
          sb.reset(); await sb.whenReady();
          const steps = [[HARNESS, tr('Preparación')], [ce.value, tr('Código')], [te.value, tr('Pruebas')]];
          for (const [src, nm] of steps) { const r = await sb.run(src, { stmt: true, quiet: true }); if (!r.ok) { busy = false; R.innerHTML = `<div class="k9-card a9-tl-fatal"><h4 class="k9-bad">✕ ${esc(tr('Error en'))} «${esc(nm)}»</h4><pre class="k9-mono k9-small">${esc(r.text)}</pre></div>`; return; } }
          const r = await sb.run('__k9tests()', { raw: true }); busy = false;
          if (!r.ok || !r.value) { R.innerHTML = `<div class="k9-card a9-tl-fatal"><h4 class="k9-bad">✕ ${esc(tr('No se pudieron ejecutar las pruebas'))}</h4><pre class="k9-mono k9-small">${esc(r.text || '')}</pre></div>`; return; }
          const res = r.value.res, c = s => res.filter(x => x.st === s).length, ok = c('fail') === 0;
          R.innerHTML = `<div class="a9-tl-sum ${ok ? 'ok' : 'bad'}"><b>${ok ? '✓' : '✕'} ${c('pass')} ${esc(tr('superadas'))} · ${c('fail')} ${esc(tr('fallidas'))}${c('skip') ? ` · ${c('skip')} ${esc(tr('omitidas'))}` : ''}</b><span>${res.length} ${esc(tr('pruebas'))} · ${r.value.ms.toFixed(1)} ms</span></div>` +
            res.map(x => `<div class="a9-tl-t ${x.st}"><span class="a9-tl-ic">${x.st === 'pass' ? '✓' : x.st === 'fail' ? '✕' : '○'}</span><div class="t"><b>${esc(x.name)}</b>${x.err ? `<pre class="k9-mono">${esc(x.err)}</pre>` : ''}</div><small class="k9-muted">${x.ms.toFixed(1)} ms</small></div>`).join('') +
            (logs.length ? `<h4 class="a9-h" style="margin:14px 2px 6px">${esc(tr('Salida de consola'))}</h4><div class="k9-card k9-mono k9-small" style="white-space:pre-wrap">${logs.slice(0, 300).map(l => `<div class="a9-con-l ${l.lvl}">${esc(l.text)}</div>`).join('')}</div>` : '');
          K.activity('dev', 'testlab', `${c('pass')}/${res.length}`);
        }
        b.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } });
        b.addEventListener('click', async e => {
          const a = e.target.closest('[data-a]'); if (!a) return;
          if (a.dataset.a === 'run') run();
          if (a.dataset.a === 'sample') { ce.value = SAMPLE.code; te.value = SAMPLE.tests; save(); }
          if (a.dataset.a === 'api') K.ui.alert(tr('API de pruebas'), 'describe(nombre, fn) · test/it(nombre, fn) · test.skip · beforeEach · afterEach\nexpect(x).toBe · toEqual · toStrictEqual · toBeTruthy · toBeFalsy · toBeNull · toBeUndefined · toBeDefined · toBeNaN · toContain · toMatch · toHaveLength · toHaveProperty · toBeGreaterThan(OrEqual) · toBeLessThan(OrEqual) · toBeCloseTo · toBeInstanceOf · toThrow\n.not invierte cualquier comprobación. Las pruebas pueden ser async.');
          if (a.dataset.a === 'save') { const n = await K.ui.prompt(tr('Guardar como .js'), tr('Nombre'), 'pruebas.test.js'); if (!n) return; const nm = await F.uniqueName('documents', F.cleanName(/\.js$/i.test(n) ? n : n + '.js')); await F.save(nm, new Blob([ce.value + '\n\n// ---- ' + tr('Pruebas') + ' ----\n' + te.value], { type: 'text/javascript' }), 'documents'); E.toast(tr('Guardado en Archivos') + ': ' + nm); }
        });
      },
      destroy() { if (sb) sb.destroy(); sb = null; }
    };
  })());
})();

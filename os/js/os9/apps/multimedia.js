/* EISENKU OS 9.0 · Apps multimedia: Visor de imágenes, Editor de audio y Administrador multimedia */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, F = K.files;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)];
  const get = (k, d) => S.get('a9_' + k, d), put = (k, v) => S.set('a9_' + k, v);
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  const baseName = n => String(n).replace(/\.[^.]+$/, '');
  const setTitle = (w, t) => { const s = w && w.querySelector('.window-title-area > span:not(.ico-tile)'); if (s) s.textContent = t; };
  const devDownload = (name, blob) => { const a = document.createElement('a'); a.__eisen = true; a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); HTMLAnchorElement.prototype.click.call(a); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const canvasBlob = (c, type = 'image/png', qy = 0.9) => new Promise(r => c.toBlob(r, type, qy));

  /* ===================== Visor de imágenes ===================== */
  K.define('imageviewer', (() => {
    let st = null, timer = 0, offFs = null;
    const free = () => { if (!st) return; if (st.url) URL.revokeObjectURL(st.url); st.url = null; st.thumbs.forEach(u => URL.revokeObjectURL(u)); st.thumbs = []; clearInterval(timer); timer = 0; };
    return {
      init(b, w, arg) {
        st = { list: [], i: -1, z: 1, fit: true, rot: 0, fx: 1, fy: 1, x: 0, y: 0, url: null, thumbs: [], f: null };
        b.innerHTML = `<div class="k9 a9-iv"><div class="k9-bar">
          <button class="k9-btn" data-a="open">${I('folder', 15)} ${esc(tr('Abrir'))}</button>
          <button class="k9-btn" data-a="prev" title="${esc(tr('Anterior'))} (←)" aria-label="${esc(tr('Anterior'))}">${I('left', 15)}</button><span class="k9-small k9-muted" data-pos></span><button class="k9-btn" data-a="next" title="${esc(tr('Siguiente'))} (→)" aria-label="${esc(tr('Siguiente'))}">${I('right', 15)}</button>
          <span class="sp"></span>
          <button class="k9-btn" data-a="zout" title="${esc(tr('Alejar'))} (−)" aria-label="${esc(tr('Alejar'))}">−</button><button class="k9-btn" data-a="fit" data-z title="${esc(tr('Ajustar a la ventana'))} (0)">100%</button><button class="k9-btn" data-a="zin" title="${esc(tr('Acercar'))} (+)" aria-label="${esc(tr('Acercar'))}">+</button><button class="k9-btn" data-a="one" title="${esc(tr('Tamaño real'))} (1)">1:1</button>
          <button class="k9-btn" data-a="rl" title="${esc(tr('Girar a la izquierda'))}" aria-label="${esc(tr('Girar a la izquierda'))}">⟲</button><button class="k9-btn" data-a="rr" title="${esc(tr('Girar a la derecha'))} (R)" aria-label="${esc(tr('Girar a la derecha'))}">⟳</button><button class="k9-btn" data-a="fh" title="${esc(tr('Voltear horizontalmente'))}" aria-label="${esc(tr('Voltear horizontalmente'))}">⇋</button><button class="k9-btn" data-a="fv" title="${esc(tr('Voltear verticalmente'))}" aria-label="${esc(tr('Voltear verticalmente'))}">⇵</button>
          <button class="k9-btn" data-a="show" title="${esc(tr('Presentación'))} (${esc(tr('Espacio'))})">${I('fullscreen', 15)} ${esc(tr('Presentación'))}</button><button class="k9-btn" data-a="info" title="${esc(tr('Información'))} (I)" aria-label="${esc(tr('Información'))}">${I('info', 15)}</button><button class="k9-btn" data-a="more" aria-label="${esc(tr('Más opciones'))}">${I('more', 15)}</button></div>
          <div class="a9-iv-main" data-main tabindex="0"><div class="a9-iv-stage" data-stage><img data-img alt="" draggable="false" hidden><div class="k9-state" data-empty>${I('image', 44)}<p>${esc(tr('Abre una imagen de Archivos o de tu dispositivo, o arrástrala aquí.'))}</p><div class="k9-row" style="justify-content:center"><button class="k9-btn pri" data-a="open">${I('folder', 14)} ${esc(tr('Abrir imagen'))}</button><button class="k9-btn" data-a="all">${I('grid', 14)} ${esc(tr('Ver todas mis imágenes'))}</button></div></div></div><aside class="a9-iv-info" data-info hidden></aside></div>
          <div class="a9-iv-strip" data-strip></div></div>`;
        const img = q(b, '[data-img]'), stage = q(b, '[data-stage]'), main = q(b, '[data-main]'), rootEl = q(b, '.a9-iv');
        const dims = () => { const r = st.rot % 180 !== 0; return { w: r ? img.naturalHeight : img.naturalWidth, h: r ? img.naturalWidth : img.naturalHeight }; };
        const fitScale = () => { const d = dims(); if (!d.w || !d.h) return 1; return Math.min(1, Math.max(0.01, (stage.clientWidth - 24) / d.w), Math.max(0.01, (stage.clientHeight - 24) / d.h)); };
        const scale = () => st.fit ? fitScale() : st.z;
        function apply() {
          if (!st.f) return;
          const s = scale();
          img.style.transform = `translate(-50%, -50%) translate(${st.x}px, ${st.y}px) rotate(${st.rot}deg) scale(${st.fx * s}, ${st.fy * s})`;
          q(b, '[data-z]').textContent = Math.round(s * 100) + '%';
          stage.classList.toggle('pan', !st.fit);
        }
        function fit() { st.fit = true; st.x = st.y = 0; apply(); }
        function zoomTo(ns, px = 0, py = 0) { const s = scale(); ns = Math.max(0.02, Math.min(16, ns)); const k = ns / s; st.x = px - (px - st.x) * k; st.y = py - (py - st.y) * k; st.fit = false; st.z = ns; apply(); }
        const rel = (cx, cy) => { const r = stage.getBoundingClientRect(); return [cx - r.left - r.width / 2, cy - r.top - r.height / 2]; };
        stage.addEventListener('wheel', e => { if (!st.f) return; e.preventDefault(); const [px, py] = rel(e.clientX, e.clientY); zoomTo(scale() * Math.pow(1.0018, -e.deltaY), px, py); }, { passive: false });
        const pts = new Map(); let last = null, pinch = null;
        stage.addEventListener('pointerdown', e => { if (!st.f || e.target.closest('button')) return; main.focus({ preventScroll: true }); try { stage.setPointerCapture(e.pointerId); } catch { /* ignorar */ } pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, c] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - c[0], a[1] - c[1]) || 1, s: scale() }; } last = [e.clientX, e.clientY]; });
        stage.addEventListener('pointermove', e => {
          if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
          if (pts.size === 2 && pinch) { const [a, c] = [...pts.values()]; const [px, py] = rel((a[0] + c[0]) / 2, (a[1] + c[1]) / 2); zoomTo(pinch.s * Math.hypot(a[0] - c[0], a[1] - c[1]) / pinch.d, px, py); return; }
          if (pts.size === 1 && last && !st.fit) { st.x += e.clientX - last[0]; st.y += e.clientY - last[1]; last = [e.clientX, e.clientY]; apply(); }
        });
        const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; last = pts.size === 1 ? [...pts.values()][0] : null; };
        stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
        stage.addEventListener('dblclick', e => { if (!st.f) return; if (st.fit) { const [px, py] = rel(e.clientX, e.clientY); zoomTo(1, px, py); } else fit(); });
        img.addEventListener('load', () => { fit(); info(); });
        img.addEventListener('error', () => { if (!st.f) return; img.hidden = true; const e = q(b, '[data-empty]'); e.hidden = false; e.innerHTML = `${I('image', 44)}<p><b>${esc(st.f.name)}</b></p><p>${esc(tr('Este navegador no puede mostrar este formato de imagen (por ejemplo HEIC o TIFF). Conviértelo a JPG o PNG.'))}</p>`; });
        new ResizeObserver(() => { if (st && st.fit) apply(); }).observe(stage);

        function buildStrip() {
          st.thumbs.forEach(u => URL.revokeObjectURL(u)); st.thumbs = [];
          const l = st.list.slice(0, 400);
          q(b, '[data-strip]').innerHTML = l.length > 1 ? l.map((f, i) => { const u = URL.createObjectURL(new Blob([f.blob], { type: F.typeOf(f) })); st.thumbs.push(u); return `<button data-i="${i}" title="${esc(f.name)}" aria-label="${esc(f.name)}"><img loading="lazy" src="${u}" alt=""></button>`; }).join('') : '';
          q(b, '[data-strip]').hidden = l.length < 2;
        }
        async function show(i) {
          if (!st.list.length) { st.f = null; img.hidden = true; img.removeAttribute('src'); q(b, '[data-empty]').hidden = false; q(b, '[data-pos]').textContent = ''; setTitle(w, tr('Visor de imágenes')); return; }
          st.i = ((i % st.list.length) + st.list.length) % st.list.length;
          const f = await F.get(st.list[st.i].id);
          if (!f || f.trash) { st.list.splice(st.i, 1); buildStrip(); return show(st.i); }
          st.f = f; if (st.url) URL.revokeObjectURL(st.url);
          st.url = URL.createObjectURL(new Blob([f.blob], { type: F.typeOf(f) }));   // tipo forzado de imagen
          Object.assign(st, { rot: 0, fx: 1, fy: 1, fit: true, x: 0, y: 0 });
          q(b, '[data-empty]').hidden = true; img.hidden = false; img.alt = f.name; img.src = st.url;
          q(b, '[data-pos]').textContent = `${st.i + 1} / ${st.list.length}`;
          setTitle(w, f.name + ' — ' + tr('Visor de imágenes'));
          qa(b, '[data-strip] button').forEach(x => x.classList.toggle('on', +x.dataset.i === st.i));
          const cur = q(b, `[data-strip] button[data-i="${st.i}"]`); if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
        }
        async function openId(id, scope) {
          const f = await F.get(id); if (!f) return;
          const all = (await F.all()).filter(x => F.kindOf(x) === 'image');
          st.list = (scope === 'all' ? all.sort((a, c) => (c.mod || c.date) - (a.mod || a.date)) : all.filter(x => (x.folder || '') === (f.folder || '')).sort(byName));
          buildStrip(); await show(Math.max(0, st.list.findIndex(x => x.id === id)));
          K.activity('file', 'imageviewer', f.name);
        }
        function info() {
          const el = q(b, '[data-info]'); if (el.hidden || !st.f) return; const f = st.f, W = img.naturalWidth, H = img.naturalHeight;
          const g = (a, c) => c ? g(c, a % c) : a, d = W && H ? g(W, H) : 1;
          el.innerHTML = `<h4>${esc(tr('Información'))}</h4><dl class="a9-dl"><dt>${esc(tr('Nombre'))}</dt><dd>${esc(f.name)}</dd><dt>${esc(tr('Tipo'))}</dt><dd>${esc(F.typeOf(f))}</dd><dt>${esc(tr('Tamaño'))}</dt><dd>${esc(K.fmt.bytes(f.size))}</dd><dt>${esc(tr('Dimensiones'))}</dt><dd>${W} × ${H} px${W ? ` · ${(W * H / 1e6).toFixed(1)} MP` : ''}</dd><dt>${esc(tr('Proporción'))}</dt><dd>${W ? `${W / d}:${H / d}` : '—'}</dd><dt>${esc(tr('Carpeta'))}</dt><dd>${esc(F.pretty(f.folder || 'documents'))}</dd><dt>${esc(tr('Modificado'))}</dt><dd>${esc(K.fmt.dt(f.mod || f.date))}</dd></dl>`;
        }
        // aplica giro/volteo a un lienzo (para guardar copia, fondo y portapapeles)
        function render(maxSide = 0) {
          const W0 = img.naturalWidth, H0 = img.naturalHeight, r = st.rot % 180 !== 0;
          let k = 1; if (maxSide && Math.max(W0, H0) > maxSide) k = maxSide / Math.max(W0, H0);
          const c = document.createElement('canvas'); c.width = Math.round((r ? H0 : W0) * k); c.height = Math.round((r ? W0 : H0) * k);
          const x = c.getContext('2d'); x.translate(c.width / 2, c.height / 2); x.rotate(st.rot * Math.PI / 180); x.scale(st.fx * k, st.fy * k); x.drawImage(img, -W0 / 2, -H0 / 2); return c;
        }
        async function saveCopy() {
          if (!st.f) return; const t = F.typeOf(st.f), keep = /jpeg|png|webp/.test(t) ? t : 'image/png', ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[keep];
          const blob = await canvasBlob(render(), keep, 0.92); if (!blob) return E.toast(tr('No se pudo procesar la imagen'));
          const folder = st.f.folder || 'images', name = await F.uniqueName(folder, baseName(st.f.name) + ' (' + tr('editada') + ').' + ext);
          const id = await F.save(name, blob, folder); E.toast(tr('Guardado en Archivos') + ': ' + name); openId(id);
        }
        async function wallpaper() {
          if (!st.f) return; const blob = await canvasBlob(render(2048), 'image/jpeg', 0.86);
          if (!blob) return; E.setWallpaperUrl && E.setWallpaperFile(new File([blob], 'fondo.jpg', { type: 'image/jpeg' })); E.toast(tr('Fondo de pantalla actualizado'));
        }
        function slideshow(on) {
          if (on === undefined) on = !timer;
          clearInterval(timer); timer = 0; rootEl.classList.toggle('show', !!on);
          if (on && st.list.length) {
            timer = setInterval(() => show(st.i + 1), Math.max(2, +get('iv_secs', 4) || 4) * 1000);
            try { if (main.requestFullscreen && !document.fullscreenElement) main.requestFullscreen().catch(() => { /* sin pantalla completa: modo ventana */ }); } catch { /* ignorar */ }
          } else if (document.fullscreenElement === main) document.exitFullscreen().catch(() => {});
        }
        const fsH = () => { if (!document.fullscreenElement && timer) slideshow(false); }; document.addEventListener('fullscreenchange', fsH); offFs = () => document.removeEventListener('fullscreenchange', fsH);
        async function act(a, ev) {
          if (a === 'open') { const f = await F.pick({ title: tr('Abrir imagen'), accept: f => F.kindOf(f) === 'image', deviceAccept: 'image/*', folder: 'images' }); if (f) openId(f.id); }
          if (a === 'all') { const l = (await F.all()).filter(x => F.kindOf(x) === 'image'); if (!l.length) return E.toast(tr('No hay imágenes en Archivos')); openId(l.sort((x, c) => (c.mod || c.date) - (x.mod || x.date))[0].id, 'all'); }
          if (!st.f) return;
          if (a === 'prev') show(st.i - 1); if (a === 'next') show(st.i + 1);
          if (a === 'zin') zoomTo(scale() * 1.25); if (a === 'zout') zoomTo(scale() / 1.25); if (a === 'fit') fit(); if (a === 'one') { st.x = st.y = 0; zoomTo(1); }
          if (a === 'rl' || a === 'rr') { st.rot = (st.rot + (a === 'rr' ? 90 : 270)) % 360; if (st.fit) fit(); else apply(); }
          if (a === 'fh') { st.fx *= -1; apply(); } if (a === 'fv') { st.fy *= -1; apply(); }
          if (a === 'show') slideshow();
          if (a === 'info') { const el = q(b, '[data-info]'); el.hidden = !el.hidden; info(); setTimeout(() => st.fit && apply(), 30); }
          if (a === 'more') {
            const r = ev.target.closest('button').getBoundingClientRect();
            K.ui.menu(r.left, r.bottom + 4, [
              { label: 'Usar como fondo de pantalla', icon: 'monitor', act: wallpaper },
              { label: 'Guardar copia con giro y volteo', icon: 'save', act: saveCopy },
              { label: 'Copiar imagen', icon: 'copy', act: async () => { try { const bl = await canvasBlob(render(4096), 'image/png'); await navigator.clipboard.write([new ClipboardItem({ 'image/png': bl })]); E.toast(tr('Imagen copiada')); } catch { E.toast(tr('Este navegador no permite copiar imágenes')); } } },
              { label: 'Descargar al dispositivo', icon: 'download', act: () => devDownload(st.f.name, st.f.blob) },
              { label: 'Mostrar en Archivos', icon: 'folder', act: () => E.filesOpenFolder(st.f.folder || 'images') },
              { label: 'Segundos por imagen en la presentación', icon: 'clock', act: async () => { const v = await K.ui.prompt(tr('Presentación'), tr('Segundos por imagen'), String(get('iv_secs', 4)), { type: 'number' }); if (v && +v >= 2) put('iv_secs', Math.min(60, +v)); } },
              { sep: true },
              { label: 'Mover a la papelera', icon: 'trash', danger: true, act: async () => { if (!await E.confirm(tr('Mover a la papelera'), st.f.name)) return; await F.trash(st.f.id); st.list.splice(st.i, 1); buildStrip(); show(st.i); } }
            ]);
          }
        }
        b.addEventListener('click', e => { const s = e.target.closest('[data-strip] [data-i]'); if (s) { show(+s.dataset.i); return; } const a = e.target.closest('[data-a]'); if (a) act(a.dataset.a, e); });
        b.addEventListener('keydown', e => {
          if (e.target.closest('input,textarea,select,[contenteditable="true"]') || e.ctrlKey || e.metaKey || e.altKey) return;
          const k = { ArrowLeft: 'prev', ArrowRight: 'next', '+': 'zin', '=': 'zin', '-': 'zout', '0': 'fit', '1': 'one', r: 'rr', R: 'rl', i: 'info', ' ': 'show' }[e.key];
          if (e.key === 'Escape' && timer) { slideshow(false); return; }
          if (k && (st.f || k === 'open')) { e.preventDefault(); act(k, e); }
        });
        main.addEventListener('dragover', e => { if ([...(e.dataTransfer.items || [])].some(x => x.kind === 'file')) { e.preventDefault(); main.classList.add('over'); } });
        main.addEventListener('dragleave', () => main.classList.remove('over'));
        main.addEventListener('drop', async e => { e.preventDefault(); main.classList.remove('over'); const l = [...e.dataTransfer.files].filter(f => /^image\//.test(f.type)); if (!l.length) return E.toast(tr('Suelta archivos de imagen')); let id = null; for (const f of l) id = await F.save(await F.uniqueName('images', F.cleanName(f.name)), f, 'images'); E.toast(l.length + ' ' + tr('imágenes guardadas en Imágenes')); openId(id); });
        this.onArg = a2 => { if (a2 && a2.fileId) openId(a2.fileId); };
        if (arg && arg.fileId) openId(arg.fileId);
      },
      onClose() { clearInterval(timer); timer = 0; },
      destroy() { free(); if (offFs) offFs(); st = null; }
    };
  })());

  /* ===================== Editor de audio ===================== */
  K.define('audioedit', (() => {
    let ac = null, st = null, src = null, raf = 0, rec = null;
    const ctx = () => ac || (ac = new (window.AudioContext || window.webkitAudioContext)());
    const MAX_BYTES = 80 * 1024 * 1024, MAX_SECS = 40 * 60;
    const tf = s => { s = Math.max(0, s || 0); const m = Math.floor(s / 60); return m + ':' + (s - m * 60).toFixed(2).padStart(5, '0'); };
    const mk = (ch, len, sr) => { try { return new AudioBuffer({ numberOfChannels: ch, length: Math.max(1, len), sampleRate: sr }); } catch { return ctx().createBuffer(ch, Math.max(1, len), sr); } };
    function stopPlay() { if (src) { try { src.onended = null; src.stop(); } catch { /* ya detenido */ } src = null; } cancelAnimationFrame(raf); if (st) st.play = null; }
    // WAV PCM 16 bits
    function wav(buf, a = 0, z = buf.length) {
      const ch = buf.numberOfChannels, n = Math.max(0, z - a), sr = buf.sampleRate, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
      const w4 = (o, s) => { for (let i = 0; i < 4; i++) out.setUint8(o + i, s.charCodeAt(i)); };
      w4(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w4(8, 'WAVE'); w4(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w4(36, 'data'); out.setUint32(40, n * ch * 2, true);
      const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
      let o = 44; for (let i = a; i < z; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
      return new Blob([out], { type: 'audio/wav' });
    }
    return {
      init(b, w, arg) {
        st = { buf: null, name: '', id: null, folder: 'music', sel: null, cur: 0, view: [0, 0], undo: [], redo: [], play: null, dirty: false };
        b.innerHTML = `<div class="k9 a9-ae"><div class="k9-bar">
          <button class="k9-btn" data-a="open">${I('folder', 15)} ${esc(tr('Abrir'))}</button><button class="k9-btn" data-a="rec">${I('mic', 15)} <span data-rect>${esc(tr('Grabar'))}</span></button><button class="k9-btn pri" data-a="save">${I('save', 15)} ${esc(tr('Exportar WAV'))}</button>
          <span class="sp"></span><button class="k9-btn" data-a="undo" title="${esc(tr('Deshacer'))} (Ctrl+Z)" aria-label="${esc(tr('Deshacer'))}">↶</button><button class="k9-btn" data-a="redo" title="${esc(tr('Rehacer'))} (Ctrl+Y)" aria-label="${esc(tr('Rehacer'))}">↷</button><button class="k9-btn" data-a="zsel" title="${esc(tr('Zoom a la selección'))}">${I('search', 15)}+</button><button class="k9-btn" data-a="zall" title="${esc(tr('Ver todo'))}">${I('fullscreen', 15)}</button></div>
          <div class="k9-bar a9-ae-tools">
          <button class="k9-btn" data-a="play" title="${esc(tr('Reproducir / pausa'))} (${esc(tr('Espacio'))})">▶ ${esc(tr('Reproducir'))}</button><button class="k9-btn" data-a="stop" aria-label="${esc(tr('Detener'))}">■</button>
          <span class="a9-ae-sep"></span>
          <button class="k9-btn" data-a="crop" title="${esc(tr('Conservar solo la selección'))}">${esc(tr('Recortar'))}</button><button class="k9-btn" data-a="del" title="${esc(tr('Borrar la selección'))} (Supr)">${esc(tr('Borrar'))}</button><button class="k9-btn" data-a="silence">${esc(tr('Silencio'))}</button><button class="k9-btn" data-a="fadein" title="${esc(tr('Sin selección: primer segundo'))}">${esc(tr('Fundido de entrada'))}</button><button class="k9-btn" data-a="fadeout" title="${esc(tr('Sin selección: último segundo'))}">${esc(tr('Fundido de salida'))}</button>
          <button class="k9-btn" data-a="norm">${esc(tr('Normalizar'))}</button><button class="k9-btn" data-a="gain">${esc(tr('Ganancia…'))}</button><button class="k9-btn" data-a="invert" title="${esc(tr('Invierte la polaridad de la onda'))}">${esc(tr('Invertir'))}</button><button class="k9-btn" data-a="reverse" title="${esc(tr('Reproduce el fragmento al revés'))}">${esc(tr('Al revés'))}</button></div>
          <div class="a9-ae-wave" data-wrap tabindex="0" aria-label="${esc(tr('Forma de onda: arrastra para seleccionar'))}"><canvas data-wave></canvas><canvas data-ov></canvas><div class="k9-state" data-empty>${I('music', 44)}<p>${esc(tr('Abre un audio (MP3, WAV, OGG, M4A…) o el audio de un vídeo, o graba con el micrófono.'))}</p><div class="k9-row" style="justify-content:center"><button class="k9-btn pri" data-a="open">${I('folder', 14)} ${esc(tr('Abrir audio'))}</button><button class="k9-btn" data-a="rec">${I('mic', 14)} ${esc(tr('Grabar'))}</button></div></div></div>
          <div class="k9-status"><span data-info></span><span data-selinfo></span><span style="margin-left:auto" data-name></span></div></div>`;
        const wrap = q(b, '[data-wrap]'), wave = q(b, '[data-wave]'), ov = q(b, '[data-ov]');
        const dur = () => st.buf ? st.buf.duration : 0;
        const tAt = x => st.view[0] + (x / Math.max(1, wrap.clientWidth)) * (st.view[1] - st.view[0]);
        const xAt = t => (t - st.view[0]) / Math.max(1e-9, st.view[1] - st.view[0]) * wrap.clientWidth;
        function size(c) { const d = devicePixelRatio || 1; c.width = Math.max(1, wrap.clientWidth * d); c.height = Math.max(1, wrap.clientHeight * d); }
        function drawWave() {
          size(wave); const g = wave.getContext('2d'), W = wave.width, H = wave.height; g.clearRect(0, 0, W, H);
          if (!st.buf) return;
          const sr = st.buf.sampleRate, a = Math.floor(st.view[0] * sr), z = Math.min(st.buf.length, Math.ceil(st.view[1] * sr)), per = Math.max(1, (z - a) / W), chs = [];
          for (let c = 0; c < st.buf.numberOfChannels; c++) chs.push(st.buf.getChannelData(c));
          const nC = chs.length, hh = H / nC, css = getComputedStyle(b), col = css.getPropertyValue('--e9-green').trim() || '#34a582';
          for (let c = 0; c < nC; c++) {
            const d = chs[c], mid = hh * c + hh / 2;
            g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, Math.round(mid), W, 1);
            g.fillStyle = col;
            for (let x = 0; x < W; x++) { const s0 = a + Math.floor(x * per), s1 = Math.min(z, a + Math.floor((x + 1) * per)); let mn = 1, mx = -1; const step = Math.max(1, Math.floor((s1 - s0) / 400)); for (let i = s0; i < s1; i += step) { const v = d[i]; if (v < mn) mn = v; if (v > mx) mx = v; } if (mx < mn) { mn = mx = 0; } g.fillRect(x, mid - mx * hh * 0.46, 1, Math.max(1, (mx - mn) * hh * 0.46)); }
          }
        }
        function drawOv() {
          size(ov); const g = ov.getContext('2d'), d = devicePixelRatio || 1, W = ov.width, H = ov.height; g.clearRect(0, 0, W, H);
          if (!st.buf) return;
          const pink = getComputedStyle(b).getPropertyValue('--e9-pink').trim() || '#e0648f';
          if (st.sel) { const x0 = xAt(st.sel[0]) * d, x1 = xAt(st.sel[1]) * d; g.fillStyle = 'rgba(224,100,143,.18)'; g.fillRect(x0, 0, x1 - x0, H); g.fillStyle = pink; g.fillRect(x0, 0, 1 * d, H); g.fillRect(x1, 0, 1 * d, H); }
          // regla de tiempo
          const span = st.view[1] - st.view[0], steps = [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300], st0 = steps.find(s => span / s <= 12) || 600;
          g.fillStyle = 'rgba(255,255,255,.45)'; g.font = `${10 * d}px system-ui, sans-serif`;
          for (let t = Math.ceil(st.view[0] / st0) * st0; t <= st.view[1]; t += st0) { const x = xAt(t) * d; g.fillRect(x, 0, 1, 6 * d); g.fillText(st0 < 1 ? t.toFixed(2) + 's' : tf(t).replace(/\.\d+$/, ''), x + 3 * d, 11 * d); }
          const ph = st.play ? st.play.off + (ctx().currentTime - st.play.t0) : st.cur;
          g.fillStyle = '#fff'; g.fillRect(xAt(ph) * d, 0, 1.5 * d, H);
        }
        function info() {
          q(b, '[data-empty]').hidden = !!st.buf;
          q(b, '[data-info]').textContent = st.buf ? `${tf(dur())} · ${st.buf.sampleRate} Hz · ${st.buf.numberOfChannels === 1 ? tr('mono') : st.buf.numberOfChannels === 2 ? tr('estéreo') : st.buf.numberOfChannels + ' ' + tr('canales')}` : '';
          q(b, '[data-selinfo]').textContent = st.sel ? `${tr('Selección')}: ${tf(st.sel[0])} – ${tf(st.sel[1])} (${tf(st.sel[1] - st.sel[0])})` : st.buf ? `${tr('Cursor')}: ${tf(st.cur)}` : '';
          q(b, '[data-name]').textContent = st.buf ? (st.name || tr('Grabación')) + (st.dirty ? ' •' : '') : '';
          q(b, '[data-a="undo"]').disabled = !st.undo.length; q(b, '[data-a="redo"]').disabled = !st.redo.length;
          qa(b, '.a9-ae-tools [data-a], [data-a="save"], [data-a="zsel"], [data-a="zall"]').forEach(x => { x.disabled = !st.buf; });
          ['crop', 'del', 'silence'].forEach(k => { const x = q(b, `[data-a="${k}"]`); if (x) x.disabled = !st.buf || !st.sel; });
        }
        const redraw = () => { drawWave(); drawOv(); info(); };
        new ResizeObserver(() => { if (st && st.buf) { drawWave(); drawOv(); } }).observe(wrap);
        function setBuf(buf, o = {}) {
          stopPlay(); st.buf = buf; st.sel = null; st.cur = 0; st.view = [0, buf.duration]; if (o.reset) { st.undo = []; st.redo = []; st.dirty = false; } redraw();
        }
        function edit(fn) {
          if (!st.buf) return; stopPlay();
          // deshacer: hasta ~200 MB de copias
          st.undo.push(st.buf); let tot = 0; for (let i = st.undo.length - 1; i >= 0; i--) { tot += st.undo[i].length * st.undo[i].numberOfChannels * 4; if (tot > 200e6) { st.undo.splice(0, i + 1); break; } }
          st.redo = []; const nb = fn(st.buf); st.buf = nb || st.buf; st.dirty = true;
          if (st.sel) st.sel = [Math.min(st.sel[0], dur()), Math.min(st.sel[1], dur())]; if (st.sel && st.sel[1] - st.sel[0] < 0.001) st.sel = null;
          if (st.view[1] > dur() || !nb) st.view = [0, dur()]; st.cur = Math.min(st.cur, dur()); redraw();
        }
        const range = (whole = true) => { const sr = st.buf.sampleRate; if (st.sel) return [Math.floor(st.sel[0] * sr), Math.min(st.buf.length, Math.ceil(st.sel[1] * sr))]; return whole ? [0, st.buf.length] : null; };
        const copy = buf => { const n = mk(buf.numberOfChannels, buf.length, buf.sampleRate); for (let c = 0; c < buf.numberOfChannels; c++) n.getChannelData(c).set(buf.getChannelData(c)); return n; };
        const slice = (buf, a, z) => { const n = mk(buf.numberOfChannels, z - a, buf.sampleRate); for (let c = 0; c < buf.numberOfChannels; c++) n.getChannelData(c).set(buf.getChannelData(c).subarray(a, z)); return n; };
        const mapRange = (fn, whole = true) => edit(buf => { const n = copy(buf), [a, z] = range(whole); for (let c = 0; c < n.numberOfChannels; c++) fn(n.getChannelData(c), a, z); return n; });
        const OPS = {
          crop: () => { const [a, z] = range(false) || []; if (z > a) { edit(buf => slice(buf, a, z)); st.sel = null; st.view = [0, dur()]; redraw(); } },
          del: () => { const [a, z] = range(false) || []; if (!(z > a)) return; edit(buf => { if (z - a >= buf.length) return mk(buf.numberOfChannels, 1, buf.sampleRate); const n = mk(buf.numberOfChannels, buf.length - (z - a), buf.sampleRate); for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c), o = n.getChannelData(c); o.set(d.subarray(0, a)); o.set(d.subarray(z), a); } return n; }); st.cur = a / st.buf.sampleRate; st.sel = null; redraw(); },
          silence: () => mapRange((d, a, z) => d.fill(0, a, z), false),
          fadein: () => { const sr = st.buf.sampleRate; const r = st.sel ? range() : [0, Math.min(st.buf.length, sr)]; edit(buf => { const n = copy(buf); for (let c = 0; c < n.numberOfChannels; c++) { const d = n.getChannelData(c); for (let i = r[0]; i < r[1]; i++) d[i] *= (i - r[0]) / Math.max(1, r[1] - r[0]); } return n; }); },
          fadeout: () => { const sr = st.buf.sampleRate; const r = st.sel ? range() : [Math.max(0, st.buf.length - sr), st.buf.length]; edit(buf => { const n = copy(buf); for (let c = 0; c < n.numberOfChannels; c++) { const d = n.getChannelData(c); for (let i = r[0]; i < r[1]; i++) d[i] *= 1 - (i - r[0]) / Math.max(1, r[1] - r[0]); } return n; }); },
          norm: () => { let pk = 0; const [a, z] = range(); for (let c = 0; c < st.buf.numberOfChannels; c++) { const d = st.buf.getChannelData(c); for (let i = a; i < z; i++) { const v = Math.abs(d[i]); if (v > pk) pk = v; } } if (!pk) return E.toast(tr('El fragmento está en silencio')); const k = 0.98 / pk; mapRange((d, x, y) => { for (let i = x; i < y; i++) d[i] *= k; }); E.toast(`${tr('Normalizado')}: ${(20 * Math.log10(k)).toFixed(1)} dB`); },
          gain: async () => { const v = await K.ui.prompt(tr('Ganancia'), tr('Decibelios (−24 a +24)'), '3', { type: 'number' }); if (v == null || v === '' || isNaN(+v)) return; const db = Math.max(-24, Math.min(24, +v)), k = Math.pow(10, db / 20); let clip = 0; mapRange((d, a, z) => { for (let i = a; i < z; i++) { let x = d[i] * k; if (x > 1) { x = 1; clip++; } else if (x < -1) { x = -1; clip++; } d[i] = x; } }); if (clip) E.toast(tr('Aviso: parte de la señal se ha recortado (saturación)')); },
          invert: () => mapRange((d, a, z) => { for (let i = a; i < z; i++) d[i] = -d[i]; }),
          reverse: () => mapRange((d, a, z) => d.subarray(a, z).reverse())
        };
        function play() {
          if (!st.buf) return; if (st.play) { st.cur = st.play.off + (ctx().currentTime - st.play.t0); stopPlay(); drawOv(); return; }
          const c = ctx(); if (c.state === 'suspended') c.resume();
          const from = st.sel ? st.sel[0] : (st.cur >= dur() - 0.01 ? 0 : st.cur), to = st.sel ? st.sel[1] : dur();
          src = c.createBufferSource(); src.buffer = st.buf; src.connect(c.destination); src.start(0, from, Math.max(0.01, to - from));
          st.play = { t0: c.currentTime, off: from }; src.onended = () => { st.cur = st.sel ? st.sel[0] : 0; stopPlay(); drawOv(); q(b, '[data-a="play"]').innerHTML = '▶ ' + esc(tr('Reproducir')); };
          q(b, '[data-a="play"]').innerHTML = '❚❚ ' + esc(tr('Pausa'));
          const loop = () => { drawOv(); if (st.play) raf = requestAnimationFrame(loop); }; loop();
        }
        async function loadBlob(blob, name, id, folder) {
          if (blob.size > MAX_BYTES) return K.ui.alert(tr('Archivo demasiado grande'), tr('El editor trabaja en memoria y admite archivos de hasta 80 MB. Para audios más largos usa un editor de escritorio.'));
          K.ui.loading(q(b, '[data-empty]'), tr('Decodificando audio…')); q(b, '[data-empty]').hidden = false;
          try {
            const buf = await ctx().decodeAudioData(await blob.arrayBuffer());
            if (buf.duration > MAX_SECS) throw new Error(tr('El audio dura más de 40 minutos: es demasiado para editarlo en el navegador.'));
            Object.assign(st, { name, id: id || null, folder: folder || 'music' }); setBuf(buf, { reset: true }); setTitle(w, name + ' — ' + tr('Editor de audio'));
          } catch (e) {
            st.buf = null; redraw(); q(b, '[data-empty]').innerHTML = `${I('music', 44)}<p><b>${esc(tr('No se pudo abrir el audio'))}</b></p><p>${esc(e && e.message && !/decode|Unable/i.test(e.message) ? e.message : tr('Formato no compatible con este navegador o archivo dañado.'))}</p><button class="k9-btn pri" data-a="open">${I('folder', 14)} ${esc(tr('Abrir otro'))}</button>`;
          }
        }
        async function openId(id) { const f = await F.get(id); if (f) loadBlob(f.blob, f.name, f.id, f.folder); }
        async function record() {
          if (rec) { rec.stop(); return; }
          if (!window.MediaRecorder) return K.ui.alert(tr('No disponible'), tr('Este navegador no puede grabar audio.'));
          try {
            const ms = await navigator.mediaDevices.getUserMedia({ audio: true }); const chunks = [], t0 = Date.now();
            rec = new MediaRecorder(ms); rec.ondataavailable = e => e.data.size && chunks.push(e.data);
            const tick = setInterval(() => { const s = q(b, '[data-rect]'); if (s) s.textContent = '● ' + tf((Date.now() - t0) / 1000).replace(/\.\d+$/, '') + ' · ' + tr('Detener'); }, 250);
            rec.onstop = async () => { clearInterval(tick); ms.getTracks().forEach(t => t.stop()); rec = null; q(b, '[data-rect]').textContent = tr('Grabar'); q(b, '[data-a="rec"]').classList.remove('on'); const bl = new Blob(chunks, { type: chunks[0] ? chunks[0].type : 'audio/webm' }); if (bl.size) { await loadBlob(bl, tr('Grabación') + ' ' + new Date().toLocaleString(K.locale).replace(/[/:]/g, '-') + '.wav', null, 'music'); st.dirty = true; info(); } };
            rec.start(250); q(b, '[data-a="rec"]').classList.add('on');
          } catch (e) { rec = null; K.ui.alert(tr('Sin acceso al micrófono'), (e && e.message) || ''); }
        }
        async function save() {
          if (!st.buf) return;
          const r = await E.form({ title: tr('Exportar WAV'), fields: [{ k: 'n', label: tr('Nombre'), value: baseName(st.name || tr('audio')) + (st.id ? ' (' + tr('editado') + ')' : '') }, { k: 'what', label: tr('Contenido'), type: 'select', options: [['all', tr('Todo el audio')]].concat(st.sel ? [['sel', tr('Solo la selección')]] : []), value: 'all' }, { k: 'to', label: tr('Destino'), type: 'select', options: [['files', tr('Archivos › ') + F.pretty(st.folder || 'music')], ['device', tr('Descargar al dispositivo')], ['both', tr('Ambos')]], value: 'files' }], ok: tr('Exportar') });
          if (!r) return; const sr = st.buf.sampleRate, a = r.what === 'sel' ? Math.floor(st.sel[0] * sr) : 0, z = r.what === 'sel' ? Math.ceil(st.sel[1] * sr) : st.buf.length;
          const blob = wav(st.buf, a, z), name = F.cleanName(baseName(r.n) || 'audio') + '.wav';
          if (r.to !== 'device') { const nm = await F.uniqueName(st.folder || 'music', name); await F.save(nm, blob, st.folder || 'music'); E.toast(tr('Guardado en Archivos') + ': ' + nm); }
          if (r.to !== 'files') devDownload(name, blob);
          st.dirty = false; info();
        }
        // selección con el puntero
        let drag = null;
        ov.addEventListener('pointerdown', e => { if (!st.buf) return; wrap.focus({ preventScroll: true }); try { ov.setPointerCapture(e.pointerId); } catch { /* ignorar */ } const r = ov.getBoundingClientRect(); drag = { t: Math.max(0, Math.min(dur(), tAt(e.clientX - r.left))), moved: false }; });
        ov.addEventListener('pointermove', e => { if (!drag) return; const r = ov.getBoundingClientRect(), t = Math.max(0, Math.min(dur(), tAt(e.clientX - r.left))); if (Math.abs(xAt(t) - xAt(drag.t)) > 3) drag.moved = true; if (drag.moved) { st.sel = [Math.min(drag.t, t), Math.max(drag.t, t)]; drawOv(); info(); } });
        ov.addEventListener('pointerup', () => { if (!drag) return; if (!drag.moved) { st.sel = null; st.cur = drag.t; if (st.play) { stopPlay(); play(); } } drag = null; drawOv(); info(); });
        wrap.addEventListener('wheel', e => { if (!st.buf || !(e.ctrlKey || e.metaKey)) return; e.preventDefault(); const r = wrap.getBoundingClientRect(), t = tAt(e.clientX - r.left), k = Math.pow(1.002, e.deltaY), span = Math.max(0.01, Math.min(dur(), (st.view[1] - st.view[0]) * k)); let a = t - (t - st.view[0]) * span / (st.view[1] - st.view[0]); a = Math.max(0, Math.min(dur() - span, a)); st.view = [a, a + span]; drawWave(); drawOv(); }, { passive: false });
        b.addEventListener('click', e => {
          const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
          if (k === 'open') K.files.pick({ title: tr('Abrir audio'), accept: f => /^(audio|video)$/.test(F.kindOf(f)), deviceAccept: 'audio/*,video/*', folder: 'music' }).then(f => f && openId(f.id));
          else if (k === 'rec') record(); else if (k === 'save') save(); else if (k === 'play') play(); else if (k === 'stop') { stopPlay(); st.cur = 0; drawOv(); info(); q(b, '[data-a="play"]').innerHTML = '▶ ' + esc(tr('Reproducir')); }
          else if (k === 'undo' && st.undo.length) { stopPlay(); st.redo.push(st.buf); st.buf = st.undo.pop(); st.sel = null; st.view = [0, dur()]; st.dirty = true; redraw(); }
          else if (k === 'redo' && st.redo.length) { stopPlay(); st.undo.push(st.buf); st.buf = st.redo.pop(); st.sel = null; st.view = [0, dur()]; st.dirty = true; redraw(); }
          else if (k === 'zsel' && st.sel) { st.view = [st.sel[0], st.sel[1]]; drawWave(); drawOv(); }
          else if (k === 'zall' && st.buf) { st.view = [0, dur()]; drawWave(); drawOv(); }
          else if (OPS[k] && st.buf) OPS[k]();
        });
        b.addEventListener('keydown', e => {
          if (e.target.closest('input,textarea,select') || !st.buf) return;
          const c = e.ctrlKey || e.metaKey;
          if (e.key === ' ' && !c) { e.preventDefault(); play(); }
          else if (c && e.key.toLowerCase() === 'z') { e.preventDefault(); q(b, '[data-a="undo"]').click(); }
          else if (c && e.key.toLowerCase() === 'y') { e.preventDefault(); q(b, '[data-a="redo"]').click(); }
          else if ((e.key === 'Delete' || e.key === 'Backspace') && st.sel) { e.preventDefault(); OPS.del(); }
          else if (c && e.key.toLowerCase() === 'a') { e.preventDefault(); st.sel = [0, dur()]; drawOv(); info(); }
          else if (c && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
        });
        info();
        this.onArg = a2 => { if (a2 && a2.fileId) openId(a2.fileId); };
        if (arg && arg.fileId) openId(arg.fileId);
      },
      onClose() { stopPlay(); if (rec) try { rec.stop(); } catch { /* ignorar */ } },
      destroy() { stopPlay(); if (ac) ac.close().catch(() => {}); ac = null; st = null; }
    };
  })());

  /* ===================== Administrador multimedia ===================== */
  K.define('medialib', (() => {
    let st = null, el = null, url = null, root = null;
    const KIND = { all: ['Todo', 'layers'], audio: ['Música', 'music'], video: ['Vídeos', 'video'], image: ['Imágenes', 'image'] };
    const lists = () => get('playlists', []) || [], saveLists = l => put('playlists', l);
    function stop() { if (el) { el.pause(); el.removeAttribute('src'); try { el.load(); } catch { /* ignorar */ } } if (url) URL.revokeObjectURL(url); url = null; if (st) st.now = null; }
    return {
      init(b, w, arg) {
        root = b;
        st = { view: 'audio', list: null, q: '', sort: 'name', files: [], queue: [], qi: -1, now: null, shuffle: !!get('ml_shuffle', false), repeat: get('ml_repeat', 'off'), thumbs: [] };
        b.innerHTML = `<div class="k9 a9-ml"><div class="k9-split" style="grid-template-columns:210px 1fr"><aside class="k9-side" data-nav></aside><main class="k9-main"><div class="k9-bar"><input class="input-text" data-q placeholder="${esc(tr('Buscar…'))}" style="width:200px"><select class="input-text" data-sort><option value="name">${esc(tr('Nombre'))}</option><option value="date">${esc(tr('Más recientes'))}</option><option value="size">${esc(tr('Tamaño'))}</option></select><span class="sp"></span><button class="k9-btn" data-a="playall">▶ ${esc(tr('Reproducir todo'))}</button><button class="k9-btn" data-a="import">${I('upload', 15)} ${esc(tr('Importar'))}</button></div><div class="k9-body" data-l></div></main></div>
          <div class="a9-ml-player" data-player hidden><video data-v playsinline></video><div class="a9-ml-ctl"><div class="a9-ml-now"><b data-title>—</b><small data-sub></small></div><div class="a9-ml-btns"><button class="k9-btn" data-p="shuffle" title="${esc(tr('Aleatorio'))}" aria-label="${esc(tr('Aleatorio'))}">🔀</button><button class="k9-btn" data-p="prev" aria-label="${esc(tr('Anterior'))}">⏮</button><button class="k9-btn pri a9-ml-play" data-p="play" aria-label="${esc(tr('Reproducir / pausa'))}">▶</button><button class="k9-btn" data-p="next" aria-label="${esc(tr('Siguiente'))}">⏭</button><button class="k9-btn" data-p="repeat" title="${esc(tr('Repetir'))}" aria-label="${esc(tr('Repetir'))}">🔁</button></div><div class="a9-ml-seek"><span data-t0>0:00</span><input type="range" data-seek min="0" max="1000" value="0" aria-label="${esc(tr('Posición'))}"><span data-t1>0:00</span></div><div class="a9-ml-vol"><span aria-hidden="true">🔊</span><input type="range" data-vol min="0" max="100" value="${+get('ml_vol', 90)}" aria-label="${esc(tr('Volumen'))}"><button class="k9-btn" data-p="fs" title="${esc(tr('Pantalla completa'))}" aria-label="${esc(tr('Pantalla completa'))}">${I('fullscreen', 14)}</button></div></div></div></div>`;
        el = q(b, '[data-v]'); el.volume = (+get('ml_vol', 90)) / 100;
        const mm = s => { s = Math.max(0, s || 0); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); };
        const ofKind = (f, k) => k === 'all' ? /^(audio|video|image)$/.test(F.kindOf(f)) : F.kindOf(f) === k;
        function nav() {
          const L = lists(), cnt = k => st.files.filter(f => ofKind(f, k)).length;
          q(b, '[data-nav]').innerHTML = `<h6>${esc(tr('Biblioteca'))}</h6>` + Object.entries(KIND).map(([k, [l, i]]) => `<button class="k9-item${!st.list && st.view === k ? ' on' : ''}" data-view="${k}">${I(i, 15)} ${esc(tr(l))}<small class="k9-muted" style="margin-left:auto">${cnt(k)}</small></button>`).join('') + `<h6>${esc(tr('Listas de reproducción'))}</h6>` + L.map(p => `<button class="k9-item${st.list === p.id ? ' on' : ''}" data-list="${esc(p.id)}">${I('list', 15)} <span style="flex:1;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</span><small class="k9-muted">${p.items.length}</small></button>`).join('') + `<button class="k9-item" data-a="newlist">${I('plus', 15)} ${esc(tr('Nueva lista'))}</button>`;
        }
        function items() {
          if (st.list) { const p = lists().find(x => x.id === st.list); if (!p) { st.list = null; return items(); } const m = new Map(st.files.map(f => [f.id, f])); return p.items.map(id => m.get(id) || { id, name: tr('(archivo eliminado)'), missing: true, size: 0 }); }
          const n = K.norm(st.q);
          const l = st.files.filter(f => ofKind(f, st.view) && (!n || K.norm(f.name + ' ' + (f.folder || '')).includes(n)));
          return l.sort(st.sort === 'date' ? (a, c) => (c.mod || c.date) - (a.mod || a.date) : st.sort === 'size' ? (a, c) => c.size - a.size : byName);
        }
        function draw() {
          nav(); st.thumbs.forEach(u => URL.revokeObjectURL(u)); st.thumbs = [];
          const l = items(), L = q(b, '[data-l]'), pl = st.list ? lists().find(x => x.id === st.list) : null;
          q(b, '[data-q]').hidden = q(b, '[data-sort]').hidden = !!pl;
          const head = pl ? `<div class="k9-row" style="margin-bottom:10px"><h3 style="font-size:16px;flex:1">${esc(pl.name)}</h3><button class="k9-btn" data-a="renlist">${I('edit', 14)} ${esc(tr('Renombrar'))}</button><button class="k9-btn dng" data-a="dellist">${I('trash', 14)} ${esc(tr('Eliminar lista'))}</button></div>` : '';
          if (!l.length) { L.innerHTML = head + `<div class="k9-state">${I(pl ? 'list' : KIND[st.view][1], 40)}<p>${esc(pl ? tr('Lista vacía. Añade canciones o vídeos con el botón ＋ de cada elemento.') : tr('No hay archivos de este tipo en Archivos. Importa música, vídeos o imágenes para verlos aquí.'))}</p>${pl ? '' : `<button class="k9-btn pri" data-a="import">${I('upload', 14)} ${esc(tr('Importar'))}</button>`}</div>`; return; }
          if (!pl && st.view === 'image') { L.innerHTML = `<div class="a9-ml-grid">${l.slice(0, 600).map(f => { const u = URL.createObjectURL(new Blob([f.blob], { type: F.typeOf(f) })); st.thumbs.push(u); return `<button class="a9-ml-th" data-img="${esc(f.id)}" title="${esc(f.name)}"><img loading="lazy" src="${u}" alt=""><span>${esc(f.name)}</span></button>`; }).join('')}</div>`; return; }
          L.innerHTML = head + `<div class="k9-card" style="padding:2px 8px">${l.map((f, i) => `<div class="k9-li a9-ml-row${st.now && st.now.id === f.id ? ' on' : ''}${f.missing ? ' gone' : ''}" data-row="${i}"><span class="a9-ml-ic">${st.now && st.now.id === f.id ? '♪' : F.kindOf(f) === 'video' ? '🎬' : F.kindOf(f) === 'image' ? '🖼️' : '🎵'}</span><div class="t"><b>${esc(baseName(f.name))}</b><small>${f.missing ? '' : esc(F.pretty(f.folder || 'music')) + ' · ' + esc(K.fmt.bytes(f.size))}</small></div>${f.missing ? '' : `<button class="k9-btn" data-play="${i}" aria-label="${esc(tr('Reproducir'))}">▶</button>`}${pl ? `<button class="k9-btn" data-mv="${i}|-1" aria-label="${esc(tr('Subir'))}">↑</button><button class="k9-btn" data-mv="${i}|1" aria-label="${esc(tr('Bajar'))}">↓</button><button class="k9-btn" data-rm="${i}" aria-label="${esc(tr('Quitar de la lista'))}">✕</button>` : `<button class="k9-btn" data-add="${i}" title="${esc(tr('Añadir a una lista'))}" aria-label="${esc(tr('Añadir a una lista'))}">＋</button>`}</div>`).join('')}</div>`;
          b._items = l;
        }
        async function load() { K.ui.loading(q(b, '[data-l]')); st.files = (await F.all()).filter(f => ofKind(f, 'all')); draw(); }
        function setQueue(l, i) { st.queue = l.filter(f => !f.missing && F.kindOf(f) !== 'image'); st.qi = Math.max(0, st.queue.findIndex(f => f.id === (l[i] || {}).id)); playIdx(st.qi); }
        async function playIdx(i) {
          if (!st.queue.length) return; st.qi = ((i % st.queue.length) + st.queue.length) % st.queue.length;
          const f0 = st.queue[st.qi], f = await F.get(f0.id); if (!f) { st.queue.splice(st.qi, 1); return st.queue.length ? playIdx(st.qi) : stop(); }
          if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(new Blob([f.blob], { type: F.typeOf(f) }));
          st.now = f; el.src = url; const isV = F.kindOf(f) === 'video';
          const P = q(b, '[data-player]'); P.hidden = false; P.classList.toggle('video', isV);
          q(b, '[data-title]').textContent = baseName(f.name); q(b, '[data-sub]').textContent = `${F.pretty(f.folder || 'music')} · ${st.qi + 1}/${st.queue.length}`;
          try { await el.play(); } catch (e) { if (e && e.name !== 'AbortError') E.toast(tr('No se puede reproducir este formato en este navegador')); }
          if ('mediaSession' in navigator) { try { navigator.mediaSession.metadata = new MediaMetadata({ title: baseName(f.name), artist: 'EISENKU OS', album: tr('Administrador multimedia') }); } catch { /* ignorar */ } }
          K.activity('media', 'medialib', f.name); draw();
        }
        const next = (dir = 1, auto = false) => { if (!st.queue.length) return; if (auto && st.repeat === 'one') { el.currentTime = 0; el.play(); return; } if (st.shuffle && st.queue.length > 1) { let n; do { n = Math.floor(Math.random() * st.queue.length); } while (n === st.qi); return playIdx(n); } if (auto && st.qi + dir >= st.queue.length && st.repeat !== 'all') { el.pause(); return; } playIdx(st.qi + dir); };
        const syncBtns = () => { q(b, '[data-p="shuffle"]').classList.toggle('on', st.shuffle); const r = q(b, '[data-p="repeat"]'); r.classList.toggle('on', st.repeat !== 'off'); r.textContent = st.repeat === 'one' ? '🔂' : '🔁'; r.title = tr('Repetir') + ': ' + tr({ off: 'no', all: 'todo', one: 'una' }[st.repeat]); };
        el.addEventListener('ended', () => next(1, true));
        el.addEventListener('play', () => { q(b, '[data-p="play"]').textContent = '❚❚'; });
        el.addEventListener('pause', () => { q(b, '[data-p="play"]').textContent = '▶'; });
        el.addEventListener('timeupdate', () => { if (!el.duration) return; q(b, '[data-seek]').value = Math.round(el.currentTime / el.duration * 1000); q(b, '[data-t0]').textContent = mm(el.currentTime); q(b, '[data-t1]').textContent = mm(el.duration); });
        el.addEventListener('click', () => el.paused ? el.play() : el.pause());
        q(b, '[data-seek]').addEventListener('input', e => { if (el.duration) el.currentTime = e.target.value / 1000 * el.duration; });
        q(b, '[data-vol]').addEventListener('input', e => { el.volume = e.target.value / 100; put('ml_vol', +e.target.value); });
        if ('mediaSession' in navigator) { try { navigator.mediaSession.setActionHandler('previoustrack', () => next(-1)); navigator.mediaSession.setActionHandler('nexttrack', () => next(1)); } catch { /* ignorar */ } }
        async function addTo(f, ev) {
          const L = lists(), r = ev.target.getBoundingClientRect();
          const addIn = id => { const l = lists(), p = l.find(x => x.id === id); if (!p.items.includes(f.id)) p.items.push(f.id); saveLists(l); E.toast(tr('Añadido a') + ' ' + p.name); nav(); };
          K.ui.menu(r.left - 160, r.bottom + 4, L.map(p => ({ label: p.name, icon: 'list', act: () => addIn(p.id) })).concat(L.length ? [{ sep: true }] : [], [{ label: 'Nueva lista…', icon: 'plus', act: async () => { const id = await newList(); if (id) addIn(id); } }]));
        }
        async function newList() { const n = await K.ui.prompt(tr('Nueva lista de reproducción'), tr('Nombre'), tr('Mi lista')); if (!n || !n.trim()) return null; const l = lists(); const id = E.uid(); l.push({ id, name: n.trim().slice(0, 60), items: [] }); saveLists(l); nav(); return id; }
        b.addEventListener('click', async e => {
          const t = e.target, l = b._items || [];
          const v = t.closest('[data-view]'); if (v) { st.view = v.dataset.view; st.list = null; draw(); return; }
          const li = t.closest('[data-list]'); if (li) { st.list = li.dataset.list; draw(); return; }
          const im = t.closest('[data-img]'); if (im) { E.launch('imageviewer', { fileId: im.dataset.img }); return; }
          const pb = t.closest('[data-play]'); if (pb) { const f = l[+pb.dataset.play]; if (F.kindOf(f) === 'image') E.launch('imageviewer', { fileId: f.id }); else setQueue(l, +pb.dataset.play); return; }
          const row = t.closest('[data-row]'); if (row && !t.closest('button')) { const f = l[+row.dataset.row]; if (!f.missing) { if (F.kindOf(f) === 'image') E.launch('imageviewer', { fileId: f.id }); else setQueue(l, +row.dataset.row); } return; }
          const ad = t.closest('[data-add]'); if (ad) { addTo(l[+ad.dataset.add], e); return; }
          const mv = t.closest('[data-mv]'); if (mv) { const [i, d] = mv.dataset.mv.split('|').map(Number); const L = lists(), p = L.find(x => x.id === st.list), j = i + d; if (j < 0 || j >= p.items.length) return; [p.items[i], p.items[j]] = [p.items[j], p.items[i]]; saveLists(L); draw(); return; }
          const rm = t.closest('[data-rm]'); if (rm) { const L = lists(), p = L.find(x => x.id === st.list); p.items.splice(+rm.dataset.rm, 1); saveLists(L); draw(); return; }
          const p = t.closest('[data-p]'); if (p) { const k = p.dataset.p; if (k === 'play') { if (!st.now) { setQueue(items(), 0); return; } el.paused ? el.play() : el.pause(); } if (k === 'next') next(1); if (k === 'prev') { if (el.currentTime > 3) el.currentTime = 0; else next(-1); } if (k === 'shuffle') { st.shuffle = !st.shuffle; put('ml_shuffle', st.shuffle); syncBtns(); } if (k === 'repeat') { st.repeat = { off: 'all', all: 'one', one: 'off' }[st.repeat]; put('ml_repeat', st.repeat); syncBtns(); } if (k === 'fs') { const tgt = q(b, '[data-player]').classList.contains('video') ? el : q(b, '[data-player]'); try { tgt.requestFullscreen && tgt.requestFullscreen(); } catch { /* ignorar */ } } return; }
          const a = t.closest('[data-a]'); if (!a) return;
          if (a.dataset.a === 'playall') { const l2 = items(); if (l2.length) setQueue(l2, 0); }
          if (a.dataset.a === 'newlist') { const id = await newList(); if (id) { st.list = id; draw(); } }
          if (a.dataset.a === 'renlist') { const L = lists(), p2 = L.find(x => x.id === st.list); const n = await K.ui.prompt(tr('Renombrar lista'), tr('Nombre'), p2.name); if (n && n.trim()) { p2.name = n.trim().slice(0, 60); saveLists(L); draw(); } }
          if (a.dataset.a === 'dellist') { if (!await E.confirm(tr('Eliminar lista'), tr('Los archivos no se borran, solo la lista.'))) return; saveLists(lists().filter(x => x.id !== st.list)); st.list = null; draw(); }
          if (a.dataset.a === 'import') { const fl = await K.ui.pickFile('audio/*,video/*,image/*', true); if (!fl.length) return; let n = 0; for (const f of fl) { const k = /^audio\//.test(f.type) ? 'music' : /^video\//.test(f.type) ? 'videos' : /^image\//.test(f.type) ? 'images' : null; if (!k) continue; if (f.size > 512 * 1024 * 1024) continue; await F.save(await F.uniqueName(k, F.cleanName(f.name)), f, k); n++; } E.toast(n + ' ' + tr('archivos importados')); load(); }
        });
        q(b, '[data-q]').addEventListener('input', e => { st.q = e.target.value; draw(); });
        q(b, '[data-sort]').addEventListener('change', e => { st.sort = e.target.value; draw(); });
        const offFiles = K.on('files', () => { if (st) F.all().then(l => { st.files = l.filter(f => ofKind(f, 'all')); draw(); }); }); this._off = offFiles;
        syncBtns(); load();
        this.onArg = async a2 => { if (!a2 || !a2.fileId) return; if (!st.files.length) await load(); const f = st.files.find(x => x.id === a2.fileId); if (!f) return; const k = F.kindOf(f); if (k === 'image') return E.launch('imageviewer', { fileId: f.id }); st.view = k; st.list = null; draw(); const l = items(); setQueue(l, l.findIndex(x => x.id === f.id)); };
        if (arg && arg.fileId) setTimeout(() => this.onArg(arg), 50);
      },
      onClose() { stop(); },
      destroy() { stop(); if (st) st.thumbs.forEach(u => URL.revokeObjectURL(u)); if (this._off) this._off(); st = null; el = null; root = null; }
    };
  })());
})();

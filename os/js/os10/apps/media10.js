/* =====================================================================
   EISENKU OS 10.0 · Multimedia (carga diferida)
   Editor de vídeo (canvas + MediaRecorder), Grabador de pantalla (getDisplayMedia), Visor RAW
   (vista previa incrustada + EXIF + histograma), Gestor de colecciones, Reproductor con subtítulos
   (SRT/VTT propios), Biblioteca de podcasts (RSS/OPML) y Centro multimedia para TV y mando.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, U = K.u10, F = K.files;
  const q = (r, s) => r.querySelector(s), qa = (r, s) => [...r.querySelectorAll(s)];
  const badge = (txt, cls = '') => `<span class="k9-badge ${cls}">${esc(tr(txt))}</span>`;
  const shell = (tabs, cur) => `<div class="k9">${U.tabs(tabs, cur)}<div class="k9-body" data-v></div></div>`;
  const tabber = (b, draw) => b.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (!t || !b.contains(t)) return; qa(b, '[data-tab]').forEach(x => { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t); }); draw(t.dataset.tab); });
  const card = (icon, title, body) => `<div class="k9-card"><h4>${I(icon, 16)} ${esc(tr(title))}</h4>${body}</div>`;
  const tc = s => { if (!isFinite(s)) return '--:--'; s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = Math.floor(s % 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const stamp = () => new Date().toLocaleString(K.locale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/[/:,]/g, '-').replace(/\s+/g, ' ');
  const recMime = () => ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
  const extOf = m => /mp4/.test(m) ? 'mp4' : 'webm';
  const blobUrl = (() => { const cache = new Map(); return async id => { if (cache.has(id)) return cache.get(id); const f = await F.get(id); if (!f) return null; const u = URL.createObjectURL(f.blob); cache.set(id, u); return u; }; })();
  const pick = (title, kinds, accept) => U.pickBlob({ title, accept: f => kinds.includes(F.kindOf(f)) || (accept && accept.test(f.name)), deviceAccept: kinds.map(k => k + '/*').join(',') });

  /* ===================== Editor de vídeo ===================== */
  K.define('videoeditor', {
    init(b) {
      const cfg = K.cfg('videoeditor', { clips: [], music: null, fade: 0.5, res: '1280x720', fps: 30 });
      b.innerHTML = `<div class="k9 s10-ve"><div class="k9-bar"><button class="k9-btn" data-a="addv">${I('video', 14)} ${esc(tr('Vídeo'))}</button><button class="k9-btn" data-a="addi">${I('image', 14)} ${esc(tr('Imagen'))}</button><button class="k9-btn" data-a="addt">${I('edit', 14)} ${esc(tr('Título'))}</button><button class="k9-btn" data-a="music">${I('music', 14)} ${esc(tr('Música'))}</button><span class="sp"></span><label class="k9-small">${esc(tr('Fundido'))} <select class="input-text" data-fade>${[0, .3, .5, 1, 1.5].map(v => `<option value="${v}"${+cfg.get('fade') === v ? ' selected' : ''}>${v ? v + ' s' : tr('No')}</option>`).join('')}</select></label><select class="input-text" data-res>${[['1280x720', '720p'], ['1920x1080', '1080p'], ['854x480', '480p'], ['1080x1920', tr('Vertical 1080×1920')]].map(([v, l]) => `<option value="${v}"${cfg.get('res') === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select><button class="k9-btn pri" data-a="export">${I('download', 14)} ${esc(tr('Exportar'))}</button></div>
        <div class="s10-ve-main"><div class="s10-ve-stage"><canvas data-cv></canvas><div class="k9-row s10-ve-ctl"><button class="k9-btn pri" data-a="play">▶</button><span class="k9-mono k9-small" data-time>0:00 / 0:00</span><span class="sp"></span><span class="k9-small k9-muted" data-st></span></div></div><div class="s10-ve-props" data-props></div></div><div class="s10-ve-tl" data-tl></div></div>`;
      const cv = q(b, '[data-cv]'), x = cv.getContext('2d'); let sel = null, playing = null;
      const clips = () => cfg.get('clips') || [], save = l => { cfg.set('clips', l); drawTL(); };
      const dims = () => cfg.get('res').split('x').map(Number);
      const len = c => c.kind === 'video' ? Math.max(.1, (c.out ?? c.dur) - (c.in || 0)) : +c.dur || 3;
      const total = () => clips().reduce((a, c) => a + len(c), 0);
      function setSize() { const [w, h] = dims(); cv.width = w; cv.height = h; blank(); }
      const blank = () => { x.fillStyle = '#000'; x.fillRect(0, 0, cv.width, cv.height); };
      const fitDraw = (src, sw, sh, zoom = 1) => { const W = cv.width, H = cv.height, s = Math.max(W / sw, H / sh) * zoom; x.drawImage(src, (W - sw * s) / 2, (H - sh * s) / 2, sw * s, sh * s); };
      const drawTitle = c => { x.fillStyle = c.bg || '#101418'; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = c.fg || '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; const lines = String(c.text || '').split('\n'), fs = Math.round(cv.height / (lines.length > 2 ? 12 : 9)); x.font = `700 ${fs}px ${c.font || 'system-ui, sans-serif'}`; lines.forEach((l, i) => x.fillText(l, cv.width / 2, cv.height / 2 + (i - (lines.length - 1) / 2) * fs * 1.25)); if (c.sub) { x.font = `400 ${Math.round(fs * .45)}px system-ui, sans-serif`; x.globalAlpha *= .8; x.fillText(c.sub, cv.width / 2, cv.height / 2 + (lines.length / 2 + .9) * fs); } };
      function drawTL() {
        const l = clips(), T = total(), m = cfg.get('music');
        q(b, '[data-tl]').innerHTML = (l.length ? l.map((c, i) => `<div class="s10-clip ${sel === c.id ? 'on' : ''} k-${c.kind}" data-clip="${esc(c.id)}" style="flex-grow:${Math.max(1, len(c))}"><b>${c.kind === 'title' ? '🅃 ' + esc(String(c.text || '').split('\n')[0].slice(0, 30)) : (c.kind === 'image' ? '🖼 ' : '🎬 ') + esc(c.name)}</b><small>${tc(len(c))}${c.kind === 'video' && (c.in || (c.out != null && c.out < c.dur)) ? ' · ✂' : ''}</small><span class="s10-clip-act"><button data-mv="${i}:-1" aria-label="${esc(tr('Mover a la izquierda'))}" ${i ? '' : 'disabled'}>◀</button><button data-mv="${i}:1" aria-label="${esc(tr('Mover a la derecha'))}" ${i < l.length - 1 ? '' : 'disabled'}>▶</button><button data-rm="${esc(c.id)}" aria-label="${esc(tr('Quitar'))}">✕</button></span></div>`).join('') : `<div class="k9-small k9-muted" style="padding:14px">${esc(tr('Añade vídeos, imágenes o títulos para empezar. Se reproducen en orden, de izquierda a derecha.'))}</div>`) + (m ? `<div class="s10-clip k-music"><b>🎵 ${esc(m.name)}</b><small>${esc(tr('Volumen'))} ${Math.round(m.vol * 100)} %</small><span class="s10-clip-act"><button data-a="nomusic">✕</button></span></div>` : '');
        q(b, '[data-time]').textContent = '0:00 / ' + tc(T); drawProps();
      }
      function drawProps() {
        const c = clips().find(z => z.id === sel), P = q(b, '[data-props]'), m = cfg.get('music');
        if (!c) { P.innerHTML = card('info', 'Proyecto', U.kv([['Clips', clips().length], ['Duración total', tc(total())], ['Formato de exportación', recMime() ? extOf(recMime()).toUpperCase() : tr('no disponible')], ['Resolución', cfg.get('res').replace('x', ' × ')]]) + (m ? `<label class="k9-field" style="margin-top:8px">${esc(tr('Volumen de la música'))}<input type="range" min="0" max="1" step="0.05" value="${m.vol}" data-mvol></label>` : '') + `<p class="k9-small k9-muted" style="margin-top:8px">${esc(tr('La exportación se hace en tiempo real (un vídeo de 1 minuto tarda 1 minuto) y la pestaña debe permanecer visible.'))}</p>`); return; }
        if (c.kind === 'video') P.innerHTML = card('video', c.name, `<label class="k9-field">${esc(tr('Inicio'))} <b data-o="in">${tc(c.in || 0)}</b><input type="range" min="0" max="${c.dur}" step="0.1" value="${c.in || 0}" data-p="in"></label><label class="k9-field">${esc(tr('Final'))} <b data-o="out">${tc(c.out ?? c.dur)}</b><input type="range" min="0" max="${c.dur}" step="0.1" value="${c.out ?? c.dur}" data-p="out"></label><label class="k9-field">${esc(tr('Volumen del clip'))}<input type="range" min="0" max="1" step="0.05" value="${c.vol ?? 1}" data-p="vol"></label><p class="k9-small k9-muted">${esc(tr('Duración original'))}: ${tc(c.dur)}</p>`);
        else if (c.kind === 'image') P.innerHTML = card('image', c.name, `<label class="k9-field">${esc(tr('Duración (s)'))}<input type="number" class="input-text" min="1" max="60" step="0.5" value="${c.dur}" data-p="dur"></label><label class="k9-row k9-small"><input type="checkbox" data-p="kb" ${c.kb !== false ? 'checked' : ''}> ${esc(tr('Acercamiento lento (efecto Ken Burns)'))}</label>`);
        else P.innerHTML = card('edit', 'Título', `<label class="k9-field">${esc(tr('Texto'))}<textarea class="input-text" rows="2" data-p="text">${esc(c.text || '')}</textarea></label><label class="k9-field">${esc(tr('Subtítulo'))}<input class="input-text" data-p="sub" value="${esc(c.sub || '')}"></label><div class="k9-row"><label class="k9-field">${esc(tr('Fondo'))}<input type="color" data-p="bg" value="${esc(c.bg || '#101418')}"></label><label class="k9-field">${esc(tr('Texto'))}<input type="color" data-p="fg" value="${esc(c.fg || '#ffffff')}"></label><label class="k9-field">${esc(tr('Duración (s)'))}<input type="number" class="input-text" min="1" max="30" step="0.5" value="${c.dur}" data-p="dur" style="width:80px"></label></div>`);
      }
      const probe = blob => new Promise(res => { const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.src = URL.createObjectURL(blob); v.onloadedmetadata = () => { const d = v.duration; URL.revokeObjectURL(v.src); res(isFinite(d) ? d : 0); }; v.onerror = () => res(0); });
      // reproducción y exportación con el mismo motor
      async function run(rec) {
        const l = clips(); if (!l.length) return; const fade = +cfg.get('fade') || 0, fps = cfg.get('fps') || 30;
        let ac = null, dest = null, musicEl = null; const stop = { v: false }; playing = stop;
        if (rec) { ac = new (window.AudioContext || window.webkitAudioContext)(); dest = ac.createMediaStreamDestination(); }
        const m = cfg.get('music');
        if (m) { const u = await blobUrl(m.fileId); if (u) { musicEl = new Audio(u); musicEl.loop = true; musicEl.volume = rec ? 1 : m.vol; if (rec) { const src = ac.createMediaElementSource(musicEl), g = ac.createGain(); g.gain.value = m.vol; src.connect(g).connect(dest); } musicEl.play().catch(() => { }); } }
        let mr = null, chunks = []; const mime = recMime();
        if (rec) { const vs = cv.captureStream(fps), st = new MediaStream([...vs.getVideoTracks(), ...dest.stream.getAudioTracks()]); mr = new MediaRecorder(st, mime ? { mimeType: mime, videoBitsPerSecond: cv.height >= 1080 ? 8e6 : 5e6 } : {}); mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); }; mr.start(1000); }
        const T = total(); let base = 0; const stEl = q(b, '[data-st]'), tEl = q(b, '[data-time]');
        const alphaAt = (t, d) => fade ? Math.max(0, Math.min(1, t / fade, (d - t) / fade)) : 1;
        for (const c of l) {
          if (stop.v) break; const d = len(c);
          if (c.kind === 'video') {
            const u = await blobUrl(c.fileId); if (!u) { base += d; continue; } const v = document.createElement('video'); v.src = u; v.playsInline = true; v.muted = !rec; v.volume = c.vol ?? 1; v.preload = 'auto';
            if (rec) { const src = ac.createMediaElementSource(v), g = ac.createGain(); g.gain.value = c.vol ?? 1; src.connect(g).connect(dest); }
            await new Promise(r => { v.onloadeddata = r; v.onerror = r; }); v.currentTime = c.in || 0; await new Promise(r => { v.onseeked = r; setTimeout(r, 1500); }); await v.play().catch(() => { });
            await new Promise(r => { const step = () => { if (stop.v || v.ended || v.currentTime >= (c.out ?? c.dur) - 0.02) { v.pause(); r(); return; } const t = v.currentTime - (c.in || 0); blank(); x.globalAlpha = alphaAt(t, d); if (v.videoWidth) fitDraw(v, v.videoWidth, v.videoHeight); x.globalAlpha = 1; tEl.textContent = tc(base + t) + ' / ' + tc(T); if (rec) stEl.textContent = tr('Exportando') + ' ' + Math.round((base + t) / T * 100) + ' %'; (v.requestVideoFrameCallback ? v.requestVideoFrameCallback(step) : requestAnimationFrame(step)); }; step(); setTimeout(() => { if (!v.paused && v.currentTime < 0.05) r(); }, 4000); });
            v.removeAttribute('src'); v.load();
          } else {
            let img = null; if (c.kind === 'image') { const f = await F.get(c.fileId); if (f) img = await createImageBitmap(f.blob).catch(() => null); }
            const t0 = performance.now();
            await new Promise(r => { const step = () => { const t = (performance.now() - t0) / 1000; if (stop.v || t >= d) { r(); return; } blank(); x.globalAlpha = alphaAt(t, d); if (img) fitDraw(img, img.width, img.height, c.kb !== false ? 1 + .08 * t / d : 1); else drawTitle(c); x.globalAlpha = 1; tEl.textContent = tc(base + t) + ' / ' + tc(T); if (rec) stEl.textContent = tr('Exportando') + ' ' + Math.round((base + t) / T * 100) + ' %'; requestAnimationFrame(step); }; step(); });
            if (img && img.close) img.close();
          }
          base += d;
        }
        if (musicEl) { musicEl.pause(); musicEl.src = ''; }
        playing = null; q(b, '[data-a="play"]').textContent = '▶';
        if (rec) { await new Promise(r => { mr.onstop = r; mr.stop(); }); ac.close(); stEl.textContent = ''; if (stop.v) { E.toast(tr('Exportación cancelada')); return; } const blob = new Blob(chunks, { type: mr.mimeType || mime || 'video/webm' }); const id = await U.saveBlob(tr('Proyecto de vídeo') + ' ' + stamp() + '.' + extOf(blob.type), blob, 'videos'); K.log('ok', 'media', `Vídeo exportado (${K.fmt.bytes(blob.size)}, ${extOf(blob.type)})`); q(b, '[data-props]').insertAdjacentHTML('afterbegin', `<div class="s10-note ok">${I('check', 14)}<span>${esc(tr('Vídeo guardado en Archivos › Vídeos'))} · ${esc(K.fmt.bytes(blob.size))} <button class="k9-btn" data-openf="${esc(id)}">${esc(tr('Abrir'))}</button></span></div>`); }
      }
      async function addMedia(kind) {
        const f = await pick(tr(kind === 'video' ? 'Elige un vídeo' : 'Elige una imagen'), [kind]); if (!f) return;
        const c = { id: E.uid(), kind, fileId: f.id, name: f.name }; if (kind === 'video') { c.dur = Math.round(await probe(f.blob) * 10) / 10; if (!c.dur) return E.toast(tr('No se pudo leer la duración del vídeo (formato no compatible con el navegador)')); c.in = 0; c.out = c.dur; } else c.dur = 4;
        save(clips().concat(c)); sel = c.id; drawTL();
      }
      b.addEventListener('input', e => { const t = e.target; const c = clips().find(z => z.id === sel);
        if (t.matches('[data-mvol]')) { const m = cfg.get('music'); m.vol = +t.value; cfg.set('music', m); return; }
        if (!c || !t.dataset.p) return; const l = clips(), cc = l.find(z => z.id === sel), k = t.dataset.p; let v = t.type === 'checkbox' ? t.checked : t.type === 'range' || t.type === 'number' ? +t.value : t.value;
        if (k === 'in') v = Math.min(v, (cc.out ?? cc.dur) - .2); if (k === 'out') v = Math.max(v, (cc.in || 0) + .2); cc[k] = v; cfg.set('clips', l);
        const o = q(b, `[data-o="${k}"]`); if (o) o.textContent = tc(v); if (k === 'in' || k === 'out') { t.value = v; previewAt(cc, v); }
        if (cc.kind === 'title') { blank(); drawTitle(cc); } });
      b.addEventListener('change', e => { const t = e.target; if (t.matches('[data-fade]')) cfg.set('fade', +t.value); if (t.matches('[data-res]')) { cfg.set('res', t.value); setSize(); } if (t.dataset.p) drawTL(); });
      async function previewAt(c, t) { const u = await blobUrl(c.fileId); if (!u) return; const v = previewAt.v || (previewAt.v = document.createElement('video')); v.muted = true; if (v.dataset.id !== c.fileId) { v.src = u; v.dataset.id = c.fileId; await new Promise(r => { v.onloadeddata = r; setTimeout(r, 2000); }); } v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 800); }); blank(); if (v.videoWidth) fitDraw(v, v.videoWidth, v.videoHeight); }
      b.addEventListener('click', async e => {
        const of = e.target.closest('[data-openf]'); if (of) { F.open(of.dataset.openf); return; }
        const mv = e.target.closest('[data-mv]'); if (mv) { const [i, d] = mv.dataset.mv.split(':').map(Number), l = clips(); [l[i], l[i + d]] = [l[i + d], l[i]]; save(l); return; }
        const rm = e.target.closest('[data-rm]'); if (rm) { save(clips().filter(c => c.id !== rm.dataset.rm)); if (sel === rm.dataset.rm) sel = null; drawTL(); return; }
        const cl = e.target.closest('[data-clip]'); if (cl) { sel = sel === cl.dataset.clip ? null : cl.dataset.clip; drawTL(); const c = clips().find(z => z.id === sel); if (c && c.kind === 'video') previewAt(c, c.in || 0); else if (c && c.kind === 'title') { blank(); drawTitle(c); } return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'addv') addMedia('video'); if (k === 'addi') addMedia('image');
        if (k === 'addt') { const c = { id: E.uid(), kind: 'title', text: tr('Mi vídeo'), sub: '', bg: '#101418', fg: '#ffffff', dur: 3 }; save(clips().concat(c)); sel = c.id; drawTL(); blank(); drawTitle(c); }
        if (k === 'music') { const f = await pick(tr('Música de fondo'), ['audio']); if (f) { cfg.set('music', { fileId: f.id, name: f.name, vol: .5 }); drawTL(); } }
        if (k === 'nomusic') { cfg.set('music', null); drawTL(); }
        if (k === 'play') { if (playing) { playing.v = true; a.textContent = '▶'; return; } if (!clips().length) return E.toast(tr('Añade algún clip')); a.textContent = '⏸'; run(false); }
        if (k === 'export') { if (!window.MediaRecorder || !cv.captureStream) return E.toast(tr('Este navegador no puede grabar vídeo (MediaRecorder)')); if (!clips().length) return E.toast(tr('Añade algún clip')); if (playing) playing.v = true; await sleep(150); E.toast(tr('Exportando en tiempo real… mantén esta ventana visible')); run(true); }
      });
      setSize(); drawTL();
      this.onClose = () => { if (playing) playing.v = true; }; this.destroy = this.onClose;
    }
  });

  /* ===================== Grabador de pantalla ===================== */
  K.define('screenrec', {
    init(b) {
      const cfg = K.cfg('screenrec', { sys: true, mic: false, count: 3, q: 'high' });
      b.innerHTML = `<div class="k9"><div class="k9-body"><div class="s10-rec-hero"><div class="s10-rec-dot" data-dot></div><b data-tm>0:00</b><small data-st>${esc(tr('Listo para grabar'))}</small></div><div class="k9-row" style="justify-content:center;margin:12px 0"><button class="k9-btn pri big" data-a="start">${I('right', 16)} ${esc(tr('Elegir qué grabar y empezar'))}</button><button class="k9-btn" data-a="pause" disabled>⏸ ${esc(tr('Pausa'))}</button><button class="k9-btn dng" data-a="stop" disabled>⏹ ${esc(tr('Detener'))}</button></div>${card('settings', 'Opciones', `<label class="k9-row k9-small"><input type="checkbox" data-o="sys" ${cfg.get('sys') ? 'checked' : ''}> ${esc(tr('Grabar el audio de la pestaña o del sistema (si el navegador lo ofrece)'))}</label><label class="k9-row k9-small"><input type="checkbox" data-o="mic" ${cfg.get('mic') ? 'checked' : ''}> ${esc(tr('Grabar también el micrófono'))}</label><div class="k9-row"><label class="k9-field">${esc(tr('Cuenta atrás'))}<select class="input-text" data-o="count">${[0, 3, 5, 10].map(v => `<option value="${v}"${+cfg.get('count') === v ? ' selected' : ''}>${v ? v + ' s' : tr('No')}</option>`).join('')}</select></label><label class="k9-field">${esc(tr('Calidad'))}<select class="input-text" data-o="q"><option value="high"${cfg.get('q') === 'high' ? ' selected' : ''}>${esc(tr('Alta (8 Mb/s)'))}</option><option value="mid"${cfg.get('q') === 'mid' ? ' selected' : ''}>${esc(tr('Media (4 Mb/s)'))}</option><option value="low"${cfg.get('q') === 'low' ? ' selected' : ''}>${esc(tr('Ligera (1,5 Mb/s)'))}</option></select></label></div>`)}<div data-out></div>${U.note('El navegador te pregunta qué compartir (pantalla, ventana o pestaña) y muestra un aviso mientras se graba. El audio del sistema solo está disponible en algunos navegadores (Chrome y Edge en Windows, o al compartir una pestaña).')}</div></div>`;
      let rec = null, streams = [], t0 = 0, acc = 0, timer = 0, ac = null;
      const st = s => { q(b, '[data-st]').textContent = tr(s); }, btn = k => q(b, `[data-a="${k}"]`);
      const tick = () => { const ms = acc + (rec && rec.state === 'recording' ? Date.now() - t0 : 0); q(b, '[data-tm]').textContent = tc(ms / 1000); };
      const cleanup = () => { clearInterval(timer); streams.forEach(s => s.getTracks().forEach(t => t.stop())); streams = []; if (ac) { ac.close().catch(() => { }); ac = null; } q(b, '[data-dot]').classList.remove('on', 'paused'); btn('start').disabled = false; btn('pause').disabled = true; btn('stop').disabled = true; };
      async function start() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) return E.toast(tr('Este navegador no permite grabar la pantalla'));
        let disp; try { disp = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: !!cfg.get('sys') }); } catch (er) { st(er.name === 'NotAllowedError' ? 'Grabación cancelada' : 'No se pudo capturar: ' + er.message); return; }
        streams = [disp]; let mic = null; if (cfg.get('mic')) { try { mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); streams.push(mic); } catch { E.toast(tr('Micrófono no disponible: se graba sin él')); } }
        const tracks = [...disp.getVideoTracks()], auds = [disp, mic].filter(s => s && s.getAudioTracks().length);
        if (auds.length === 1) tracks.push(...auds[0].getAudioTracks()); else if (auds.length > 1) { ac = new AudioContext(); const dest = ac.createMediaStreamDestination(); auds.forEach(s => ac.createMediaStreamSource(s).connect(dest)); tracks.push(...dest.stream.getAudioTracks()); }
        const n = +cfg.get('count') || 0; for (let i = n; i > 0; i--) { st(tr('Empieza en') + ' ' + i + '…'); q(b, '[data-tm]').textContent = String(i); await sleep(1000); if (!disp.active) { cleanup(); st('Grabación cancelada'); return; } }
        const mime = recMime(), chunks = [], bps = { high: 8e6, mid: 4e6, low: 1.5e6 }[cfg.get('q')] || 4e6;
        rec = new MediaRecorder(new MediaStream(tracks), mime ? { mimeType: mime, videoBitsPerSecond: bps } : { videoBitsPerSecond: bps }); rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = async () => { acc += rec._last ? Date.now() - rec._last : 0; cleanup(); const blob = new Blob(chunks, { type: rec.mimeType || 'video/webm' }); if (!blob.size) { st('No se grabó nada'); return; } const name = tr('Grabación de pantalla') + ' ' + stamp() + '.' + extOf(blob.type); const id = await U.saveBlob(name, blob, 'videos'); K.log('ok', 'media', `Grabación de pantalla guardada (${K.fmt.bytes(blob.size)})`); st('Guardado en Archivos › Vídeos'); const u = URL.createObjectURL(blob); q(b, '[data-out]').innerHTML = card('video', 'Última grabación', `<video controls src="${u}" style="width:100%;max-height:40vh;border-radius:10px;background:#000"></video><div class="k9-row" style="margin-top:8px"><b class="k9-small">${esc(name)}</b><span class="sp"></span><span class="k9-small k9-muted">${esc(K.fmt.bytes(blob.size))}</span><button class="k9-btn" data-openf="${esc(id)}">${esc(tr('Mostrar en Archivos'))}</button></div>`); rec = null; };
        disp.getVideoTracks()[0].addEventListener('ended', () => { if (rec && rec.state !== 'inactive') rec.stop(); });
        acc = 0; t0 = Date.now(); rec.start(1000); timer = setInterval(tick, 250); q(b, '[data-dot]').classList.add('on'); st('Grabando…'); btn('start').disabled = true; btn('pause').disabled = false; btn('stop').disabled = false; K.log('info', 'media', 'Grabación de pantalla iniciada');
      }
      b.addEventListener('change', e => { const o = e.target.closest('[data-o]'); if (o) cfg.set(o.dataset.o, o.type === 'checkbox' ? o.checked : o.value); });
      b.addEventListener('click', e => { const of = e.target.closest('[data-openf]'); if (of) { F.get(of.dataset.openf).then(f => f && E.filesOpenFolder(f.folder)); return; } const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'start') start();
        if (a.dataset.a === 'stop' && rec) rec.stop();
        if (a.dataset.a === 'pause' && rec) { if (rec.state === 'recording') { rec.pause(); acc += Date.now() - t0; q(b, '[data-dot]').classList.add('paused'); st('En pausa'); a.textContent = '▶ ' + tr('Continuar'); } else { rec.resume(); t0 = Date.now(); q(b, '[data-dot]').classList.remove('paused'); st('Grabando…'); a.textContent = '⏸ ' + tr('Pausa'); } } });
      this.destroy = () => { if (rec && rec.state !== 'inactive') rec.stop(); else cleanup(); };
    }
  });

  /* ===================== Visor RAW ===================== */
  const RAWX = /\.(dng|cr2|cr3|crw|nef|nrw|arw|srf|sr2|orf|raf|rw2|pef|srw|x3f|3fr|erf|kdc|mos|mrw|iiq|rwl)$/i;
  K.define('rawviewer', {
    init(b, w, arg) {
      b.innerHTML = `<div class="k9"><div class="k9-bar"><button class="k9-btn pri" data-a="open">${I('folder', 14)} ${esc(tr('Abrir RAW…'))}</button><span class="k9-small k9-muted" data-name></span><span class="sp"></span><button class="k9-btn" data-a="fit" disabled>${esc(tr('Ajustar'))}</button><button class="k9-btn" data-a="one" disabled>100 %</button><label class="k9-small" data-ql hidden>JPEG <select class="input-text" data-q>${[95, 90, 85, 75].map(v => `<option value="${v}"${v === 90 ? ' selected' : ''}>${v} %</option>`).join('')}</select></label><button class="k9-btn" data-a="export" disabled>${I('save', 14)} ${esc(tr('Exportar JPEG'))}</button></div><div class="s10-raw"><div class="s10-raw-view" data-view><div class="k9-state">${I('image', 44)}<p>${esc(tr('Abre una foto RAW (DNG, CR2, CR3, NEF, ARW, ORF, RAF, RW2, PEF…) para ver su vista previa y sus datos.'))}</p></div></div><aside class="s10-raw-side" data-side></aside></div></div>`;
      const view = q(b, '[data-view]'), side = q(b, '[data-side]'); let bmp = null, cur = null, zoom = 'fit';
      async function load(f) {
        cur = f; q(b, '[data-name]').textContent = f.name + ' · ' + K.fmt.bytes(f.blob.size); view.innerHTML = `<div class="k9-state"><span class="k9-spin"></span></div>`;
        if (!K.exif) await K.loadScript('js/os10/lib/exif10.js');
        const u8 = new Uint8Array(await f.blob.arrayBuffer()); let jpeg = null, info = null, tags = {};
        if (u8[0] === 0xFF && u8[1] === 0xD8) { jpeg = f.blob; tags = (K.exif.fromJpeg(u8) || {}).tags || {}; }
        else { const r = K.exif.previews(u8); tags = r.tags || {}; const p = r.previews[0]; if (p) { info = p; jpeg = new Blob([u8.subarray(p.off, p.off + p.len)], { type: 'image/jpeg' }); } }
        if (bmp && bmp.close) bmp.close(); bmp = null;
        if (jpeg) { try { bmp = await createImageBitmap(jpeg); } catch { bmp = null; } }
        if (!bmp) { view.innerHTML = `<div class="k9-state">${I('image', 40)}<p>${esc(tr('Este archivo no contiene una vista previa JPEG que el navegador pueda mostrar.'))}</p></div>`; side.innerHTML = card('info', 'Datos', U.kv(K.exif.describe(tags).map(([k, v]) => [tr(k), v]))); ['fit', 'one', 'export'].forEach(k => { q(b, `[data-a="${k}"]`).disabled = true; }); return; }
        view.innerHTML = `<canvas data-c></canvas>`; const c = q(view, '[data-c]'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0); setZoom('fit');
        ['fit', 'one', 'export'].forEach(k => { q(b, `[data-a="${k}"]`).disabled = false; }); q(b, '[data-ql]').hidden = false;
        // histograma (luminancia y RGB) sobre una copia reducida
        const s = Math.min(1, 400 / Math.max(bmp.width, bmp.height)), hc = document.createElement('canvas'); hc.width = Math.max(1, Math.round(bmp.width * s)); hc.height = Math.max(1, Math.round(bmp.height * s)); const hx = hc.getContext('2d', { willReadFrequently: true }); hx.drawImage(bmp, 0, 0, hc.width, hc.height); const d = hx.getImageData(0, 0, hc.width, hc.height).data, H = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)]; let clipHi = 0, clipLo = 0;
        for (let i = 0; i < d.length; i += 4) { H[0][d[i]]++; H[1][d[i + 1]]++; H[2][d[i + 2]]++; const y = (d[i] * 54 + d[i + 1] * 183 + d[i + 2] * 19) >> 8; H[3][y]++; if (y >= 253) clipHi++; if (y <= 2) clipLo++; }
        const px = d.length / 4;
        side.innerHTML = card('chart', 'Histograma', `<canvas data-h width="256" height="110" style="width:100%;height:110px;background:#111;border-radius:6px"></canvas><p class="k9-small k9-muted" style="margin-top:4px">${esc(tr('Altas luces recortadas'))}: ${(clipHi / px * 100).toFixed(1)} % · ${esc(tr('Sombras recortadas'))}: ${(clipLo / px * 100).toFixed(1)} %</p>`) + card('image', 'Vista previa incrustada', U.kv([['Tamaño', bmp.width + ' × ' + bmp.height + ' px'], ['Megapíxeles', (bmp.width * bmp.height / 1e6).toFixed(1) + ' MP'], ['Origen', info ? tr('JPEG incrustado en el RAW') : tr('Imagen JPEG')]])) + card('info', 'Datos de la toma (EXIF)', U.kv(K.exif.describe(tags).map(([k, v]) => [tr(k), v])) || `<p class="k9-small k9-muted">${esc(tr('Sin datos EXIF legibles.'))}</p>`) + U.note('EISENKU muestra la vista previa JPEG que la cámara guarda dentro del RAW (suele tener la resolución completa o casi). Los datos del sensor sin revelar no se procesan en el navegador.');
        const hcv = q(side, '[data-h]').getContext('2d'), mx = Math.max(...H[3].slice(3, 253), 1); hcv.globalCompositeOperation = 'lighter';
        [['#ff4a4a', 0], ['#3ddc84', 1], ['#4a7dff', 2]].forEach(([col, k]) => { hcv.fillStyle = col; hcv.globalAlpha = .55; for (let i = 0; i < 256; i++) { const hgt = Math.min(110, H[k][i] / mx * 100); hcv.fillRect(i, 110 - hgt, 1, hgt); } });
        K.cfg('rawviewer').set('recent', [f.id].concat((K.cfg('rawviewer').get('recent', []) || []).filter(x => x !== f.id)).slice(0, 12));
      }
      function setZoom(z) { zoom = z; const c = q(view, '[data-c]'); if (!c) return; if (z === 'fit') { c.style.width = c.style.height = ''; c.className = 'fit'; } else { c.className = ''; c.style.width = bmp.width + 'px'; c.style.height = bmp.height + 'px'; } }
      b.addEventListener('click', async e => { const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'open') { const f = await U.pickBlob({ title: tr('Foto RAW o JPEG'), accept: x => RAWX.test(x.name) || /\.(jpe?g|tiff?)$/i.test(x.name), deviceAccept: '.dng,.cr2,.cr3,.crw,.nef,.nrw,.arw,.srf,.sr2,.orf,.raf,.rw2,.pef,.srw,.x3f,.3fr,.erf,.kdc,.mos,.mrw,.iiq,.rwl,.jpg,.jpeg,.tif,.tiff', folder: 'images' }); if (f) load(f); }
        if (k === 'fit') setZoom('fit'); if (k === 'one') setZoom('100');
        if (k === 'export' && bmp) { const c = q(view, '[data-c]'); const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', +q(b, '[data-q]').value / 100)); await U.saveBlob(cur.name.replace(/\.[^.]+$/, '') + '.jpg', blob, 'images'); } });
      const fid = a => a && (a.id || a.fileId);
      if (fid(arg)) F.get(fid(arg)).then(f => f && load(f));
      this.onArg = a => { if (fid(a)) F.get(fid(a)).then(f => f && load(f)); };
      this.destroy = () => { if (bmp && bmp.close) bmp.close(); };
    }
  });

  /* ===================== Gestor de colecciones ===================== */
  const CK = 'os10_collections', DEF_COLLS = [['movies', 'Películas', '🎬'], ['series', 'Series', '📺'], ['music', 'Música', '💿'], ['books', 'Libros', '📚'], ['games', 'Videojuegos', '🎮']];
  const CST = [['have', 'En mi colección', 'g'], ['wish', 'Lo deseo', 'p'], ['lent', 'Prestado', 'w'], ['todo', 'Pendiente', ''], ['doing', 'En curso', ''], ['done', 'Terminado', 'g']];
  const cdata = () => { const d = S.get(CK, null) || {}; return { colls: Array.isArray(d.colls) && d.colls.length ? d.colls : DEF_COLLS.map(([id, name, icon]) => ({ id, name, icon })), items: Array.isArray(d.items) ? d.items : [] }; };
  const csave = d => S.set(CK, d);
  // CSV con comillas, separador ; o , detectado en la primera línea
  const parseCSV = txt => { const s = String(txt).replace(/^\ufeff/, ''), first = s.split(/\r?\n/)[0] || '', d = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ','; const rows = []; let row = [], cell = '', inq = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (inq) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else inq = false; } else cell += c; } else if (c === '"') inq = true; else if (c === d) { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c; } if (cell || row.length) { row.push(cell); rows.push(row); } return rows.filter(r => r.some(x => x.trim())); };
  K.parseCSV = parseCSV;
  K.define('collections', {
    init(b) {
      let coll = '', stF = '', sort = 'title';
      b.innerHTML = `<div class="k9"><div class="k9-bar"><button class="k9-btn pri" data-a="add">${I('plus', 14)} ${esc(tr('Añadir'))}</button><input class="input-text" data-q placeholder="${esc(tr('Buscar…'))}" style="flex:1;min-width:120px"><select class="input-text" data-st><option value="">${esc(tr('Todos los estados'))}</option>${CST.map(([v, l]) => `<option value="${v}">${esc(tr(l))}</option>`).join('')}</select><select class="input-text" data-sort><option value="title">${esc(tr('Título'))}</option><option value="year">${esc(tr('Año'))}</option><option value="rating">${esc(tr('Valoración'))}</option><option value="added">${esc(tr('Añadido'))}</option></select><button class="k9-btn" data-a="more">${I('more', 14)}</button></div><div class="s10-coll"><nav class="s10-coll-nav" data-nav></nav><div class="k9-body" data-v></div></div></div>`;
      const V = q(b, '[data-v]');
      function draw() {
        const d = cdata(), nq = K.norm(q(b, '[data-q]').value.trim());
        q(b, '[data-nav]').innerHTML = `<button class="${!coll ? 'on' : ''}" data-coll="">🗂️ ${esc(tr('Todo'))} <small>${d.items.length}</small></button>` + d.colls.map(c => `<button class="${coll === c.id ? 'on' : ''}" data-coll="${esc(c.id)}">${esc(c.icon || '📁')} ${esc(tr(c.name))} <small>${d.items.filter(x => x.coll === c.id).length}</small></button>`).join('') + `<button data-a="newcoll" class="k9-small">＋ ${esc(tr('Nueva colección'))}</button><button class="${coll === '__lent' ? 'on' : ''}" data-coll="__lent">🤝 ${esc(tr('Préstamos'))} <small>${d.items.filter(x => x.status === 'lent').length}</small></button>`;
        if (coll === '__lent') { const l = d.items.filter(x => x.status === 'lent').sort((a, c) => (a.lentAt || 0) - (c.lentAt || 0)); V.innerHTML = l.length ? card('users', 'Prestado a otras personas', l.map(x => `<div class="k9-li"><div class="t"><b>${esc(x.title)}</b><small>${esc(x.lentTo || '?')} · ${x.lentAt ? esc(tr('desde')) + ' ' + esc(new Date(x.lentAt).toLocaleDateString(K.locale)) + ' (' + Math.floor((Date.now() - x.lentAt) / 864e5) + ' ' + esc(tr('días')) + ')' : ''}</small></div><button class="k9-btn pri" data-ret="${esc(x.id)}">${esc(tr('Devuelto'))}</button></div>`).join('')) : `<div class="k9-state">${I('check', 36)}<p>${esc(tr('No tienes nada prestado.'))}</p></div>`; return; }
        let l = d.items.filter(x => (!coll || x.coll === coll) && (!stF || x.status === stF) && (!nq || K.norm([x.title, x.creator, x.year, x.format, x.notes].join(' ')).includes(nq)));
        l.sort(sort === 'year' ? (a, c) => (+c.year || 0) - (+a.year || 0) : sort === 'rating' ? (a, c) => (c.rating || 0) - (a.rating || 0) : sort === 'added' ? (a, c) => (c.added || 0) - (a.added || 0) : (a, c) => K.norm(a.title).localeCompare(K.norm(c.title)));
        V.innerHTML = l.length ? `<div class="s10-coll-grid">${l.map(x => { const c = d.colls.find(z => z.id === x.coll) || {}, s2 = CST.find(z => z[0] === x.status) || CST[0]; return `<button class="s10-citem" data-it="${esc(x.id)}"><span class="s10-ccover">${x.cover ? `<img src="${esc(x.cover)}" alt="">` : `<i>${esc(c.icon || '📁')}</i>`}</span><b>${esc(x.title)}</b><small>${esc([x.creator, x.year].filter(Boolean).join(' · '))}</small><span class="k9-row" style="gap:4px;justify-content:space-between;width:100%"><span class="s10-stars" aria-label="${x.rating || 0}/5">${'★'.repeat(x.rating || 0)}${'☆'.repeat(5 - (x.rating || 0))}</span>${badge(s2[1], s2[2])}</span></button>`; }).join('')}</div>` : `<div class="k9-state">${I('box', 40)}<p>${esc(tr(d.items.length ? 'Nada coincide con el filtro.' : 'Cataloga tus películas, series, discos, libros y juegos: estado, valoración, préstamos y lista de deseos.'))}</p></div>`;
      }
      async function edit(x0) {
        const d = cdata();
        const r = await E.form({ title: tr(x0 ? 'Editar' : 'Añadir a la colección'), ok: tr('Guardar'), fields: [{ k: 'title', label: tr('Título'), value: x0 ? x0.title : '', req: true }, { k: 'coll', label: tr('Colección'), type: 'select', value: x0 ? x0.coll : (coll && coll !== '__lent' ? coll : d.colls[0].id), options: d.colls.map(c => [c.id, (c.icon || '') + ' ' + tr(c.name)]) }, { k: 'creator', label: tr('Autor, director, artista o estudio'), value: x0 ? x0.creator || '' : '' }, { k: 'year', label: tr('Año'), value: x0 ? x0.year || '' : '' }, { k: 'format', label: tr('Formato (DVD, Blu-ray, vinilo, digital, tapa dura…)'), value: x0 ? x0.format || '' : '' }, { k: 'status', label: tr('Estado'), type: 'select', value: x0 ? x0.status : 'have', options: CST.map(([v, l]) => [v, tr(l)]) }, { k: 'lentTo', label: tr('Prestado a (si está prestado)'), value: x0 ? x0.lentTo || '' : '' }, { k: 'rating', label: tr('Valoración'), type: 'select', value: x0 ? String(x0.rating || 0) : '0', options: [0, 1, 2, 3, 4, 5].map(n => [String(n), n ? '★'.repeat(n) : tr('Sin valorar')]) }, { k: 'notes', label: tr('Notas'), type: 'textarea', value: x0 ? x0.notes || '' : '' }] });
        if (!r) return null; const x = x0 ? d.items.find(z => z.id === x0.id) : { id: E.uid(), added: Date.now() }; const wasLent = x.status === 'lent';
        Object.assign(x, { title: r.title.trim().slice(0, 160), coll: r.coll, creator: r.creator.trim().slice(0, 120), year: r.year.replace(/[^\d]/g, '').slice(0, 4), format: r.format.trim().slice(0, 40), status: r.status, lentTo: r.status === 'lent' ? r.lentTo.trim().slice(0, 60) : '', rating: +r.rating || 0, notes: r.notes.slice(0, 2000), mod: Date.now() }); if (r.status === 'lent' && !wasLent) x.lentAt = Date.now(); if (r.status !== 'lent') delete x.lentAt;
        if (!x0) d.items.unshift(x); csave(d); draw(); return x;
      }
      async function setCover(id) { const f = await pick(tr('Portada'), ['image']); if (!f) return; const bm = await createImageBitmap(f.blob), s = Math.min(1, 240 / Math.max(bm.width, bm.height)), c = document.createElement('canvas'); c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s); c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height); const d = cdata(), x = d.items.find(z => z.id === id); x.cover = c.toDataURL('image/jpeg', .8); csave(d); draw(); }
      const csv = s => String(s ?? '').replace(/"/g, '""');
      b.addEventListener('input', U.debounce(e => { if (e.target.matches('[data-q]')) draw(); }, 160));
      b.addEventListener('change', e => { if (e.target.matches('[data-st]')) { stF = e.target.value; draw(); } if (e.target.matches('[data-sort]')) { sort = e.target.value; draw(); } });
      b.addEventListener('click', async e => {
        const c = e.target.closest('[data-coll]'); if (c) { coll = c.dataset.coll; draw(); return; }
        const rt = e.target.closest('[data-ret]'); if (rt) { const d = cdata(), x = d.items.find(z => z.id === rt.dataset.ret); x.status = 'have'; x.lentTo = ''; delete x.lentAt; csave(d); E.toast(tr('Marcado como devuelto')); draw(); return; }
        const it = e.target.closest('[data-it]'); if (it) { const x = cdata().items.find(z => z.id === it.dataset.it); const r = it.getBoundingClientRect(); K.ui.menu(r.left + 20, r.top + 40, [{ label: tr('Editar'), icon: '✎', act: () => edit(x) }, { label: tr('Poner portada…'), icon: '🖼', act: () => setCover(x.id) }, { label: tr('Eliminar'), icon: '🗑', danger: true, act: async () => { if (await E.confirm(tr('Eliminar de la colección'), x.title)) { const d = cdata(); d.items = d.items.filter(z => z.id !== x.id); csave(d); draw(); } } }]); return; }
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'add') edit(null);
        if (a.dataset.a === 'newcoll') { const r = await E.form({ title: tr('Nueva colección'), fields: [{ k: 'n', label: tr('Nombre'), req: true }, { k: 'i', label: tr('Icono (un emoji)'), value: '📁' }] }); if (r) { const d = cdata(); d.colls.push({ id: E.uid(), name: r.n.trim().slice(0, 30), icon: [...(r.i || '📁')].slice(0, 2).join('') }); csave(d); draw(); } }
        if (a.dataset.a === 'more') { const r = a.getBoundingClientRect(); K.ui.menu(r.left - 140, r.bottom + 4, [{ label: tr('Exportar CSV'), icon: '⬇', act: () => { const d = cdata(); K.ui.download('EISENKU_colecciones.csv', '﻿titulo;coleccion;autor;año;formato;estado;prestado_a;valoracion;notas\n' + d.items.map(x => [x.title, (d.colls.find(z => z.id === x.coll) || {}).name, x.creator, x.year, x.format, (CST.find(z => z[0] === x.status) || [, ''])[1], x.lentTo, x.rating, x.notes].map(v => '"' + csv(v) + '"').join(';')).join('\n'), 'text/csv'); } }, { label: tr('Importar CSV'), icon: '⬆', act: async () => { const f = await U.pickBlob({ title: tr('Archivo CSV'), accept: x => /\.csv$/i.test(x.name), deviceAccept: '.csv,text/csv' }); if (!f) return; const rows = parseCSV(await f.blob.text()); const head = (rows.shift() || []).map(h => K.norm(h)); const col = n => head.findIndex(h => n.some(k => h.startsWith(k))); const d = cdata(); let n = 0; rows.forEach(r2 => { const t = r2[col(['titulo', 'title'])]; if (!t) return; const cn = K.norm(r2[col(['coleccion', 'collection'])] || ''); const cc = d.colls.find(z => K.norm(z.name) === cn) || d.colls[0]; const stn = K.norm(r2[col(['estado', 'status'])] || ''); d.items.push({ id: E.uid(), added: Date.now(), title: t.slice(0, 160), coll: cc.id, creator: (r2[col(['autor', 'creator'])] || '').slice(0, 120), year: (r2[col(['ano', 'año', 'year'])] || '').replace(/\D/g, '').slice(0, 4), format: (r2[col(['formato', 'format'])] || '').slice(0, 40), status: (CST.find(z => K.norm(tr(z[1])) === stn) || CST[0])[0], lentTo: (r2[col(['prestado', 'lent'])] || '').slice(0, 60), rating: Math.min(5, +r2[col(['valoracion', 'rating'])] || 0), notes: (r2[col(['notas', 'notes'])] || '').slice(0, 2000) }); n++; }); csave(d); E.toast(n + ' ' + tr('elementos importados')); draw(); } }]); }
      });
      draw(); this.onOpen = draw;
    }
  });

  /* ===================== Reproductor con subtítulos ===================== */
  const ts2s = t => { const m = String(t).trim().replace(',', '.').match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?$/); if (!m) return NaN; return (+m[1] || 0) * 3600 + +m[2] * 60 + +m[3] + (m[4] ? +m[4].padEnd(3, '0') / 1000 : 0); };
  const s2ts = (s, vtt) => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = Math.floor(s % 60), ms = Math.round((s - Math.floor(s)) * 1000) % 1000; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}${vtt ? '.' : ','}${String(ms).padStart(3, '0')}`; };
  function parseSubs(txt) {
    const out = [], lines = String(txt).replace(/^﻿/, '').replace(/\r/g, '').split('\n'); let i = 0;
    while (i < lines.length) { const l = lines[i]; const m = l.match(/^\s*([\d:.,]+)\s*-->\s*([\d:.,]+)/); if (m) { const a = ts2s(m[1]), z = ts2s(m[2]); const txtL = []; i++; while (i < lines.length && lines[i].trim() !== '') { txtL.push(lines[i]); i++; } if (isFinite(a) && isFinite(z) && txtL.length) out.push({ a, z, t: txtL.join('\n') }); } else i++; }
    return out.sort((p, q2) => p.a - q2.a);
  }
  const cueHtml = t => esc(t.replace(/<(?!\/?[ibu]>)[^>]*>/gi, '').replace(/\{\\[^}]*\}/g, '')).replace(/&lt;(\/?[ibu])&gt;/gi, '<$1>').replace(/\n/g, '<br>');
  K.subs = { parse: parseSubs, s2ts };
  K.define('subplayer', {
    init(b, w, arg) {
      const cfg = K.cfg('subplayer', { size: 26, color: '#ffffff', bg: .55, pos: 'bottom' });
      b.innerHTML = `<div class="k9 s10-sp"><div class="k9-bar"><button class="k9-btn pri" data-a="video">${I('video', 14)} ${esc(tr('Vídeo…'))}</button><button class="k9-btn" data-a="subs">${I('list', 14)} ${esc(tr('Subtítulos…'))}</button><span class="k9-small k9-muted" data-names></span><span class="sp"></span><label class="k9-small">${esc(tr('Desfase'))} <button class="k9-btn" data-off="-100">−0,1 s</button><b data-offv class="k9-mono">0 ms</b><button class="k9-btn" data-off="100">+0,1 s</button></label><button class="k9-btn" data-a="export" disabled>${I('save', 14)} ${esc(tr('Guardar corregidos'))}</button></div>
        <div class="s10-sp-main"><div class="s10-sp-stage"><video data-v playsinline></video><div class="s10-sp-cue" data-cue></div></div><aside class="s10-sp-side"><input class="input-text" data-q placeholder="${esc(tr('Buscar en los subtítulos…'))}"><div class="s10-sp-list" data-list><p class="k9-small k9-muted" style="padding:10px">${esc(tr('Abre un vídeo y sus subtítulos (SRT o VTT). Pulsa una frase para saltar a ese momento.'))}</p></div></aside></div>
        <div class="k9-bar s10-sp-ctl"><button class="k9-btn" data-a="play">▶</button><span class="k9-mono k9-small" data-t>0:00 / 0:00</span><input type="range" data-seek min="0" max="1000" value="0" style="flex:1" aria-label="${esc(tr('Posición'))}"><select class="input-text" data-rate aria-label="${esc(tr('Velocidad'))}">${[.5, .75, 1, 1.25, 1.5, 2].map(v => `<option value="${v}"${v === 1 ? ' selected' : ''}>${v}×</option>`).join('')}</select><button class="k9-btn" data-ab="a" title="${esc(tr('Marcar el punto A (tecla A)'))}">A</button><button class="k9-btn" data-ab="b" title="${esc(tr('Marcar el punto B y repetir (tecla B)'))}">B</button><button class="k9-btn" data-ab="x" title="${esc(tr('Quitar la repetición'))}">✕</button><button class="k9-btn" data-a="style">${I('settings', 14)}</button></div></div>`;
      const v = q(b, '[data-v]'), cueEl = q(b, '[data-cue]'), list = q(b, '[data-list]'); let cues = [], off = 0, A = null, B = null, vf = null, sf = null, last = -1;
      const apply = () => { cueEl.style.fontSize = cfg.get('size') + 'px'; cueEl.style.color = cfg.get('color'); cueEl.style.setProperty('--sb', `rgba(0,0,0,${cfg.get('bg')})`); cueEl.classList.toggle('top', cfg.get('pos') === 'top'); };
      const names = () => { q(b, '[data-names]').textContent = [vf && vf.name, sf && sf.name + ' · ' + cues.length + ' ' + tr('frases')].filter(Boolean).join(' · '); q(b, '[data-a="export"]').disabled = !cues.length; };
      const drawList = () => { const nq = K.norm(q(b, '[data-q]').value.trim()); list.innerHTML = cues.map((c, i) => (!nq || K.norm(c.t).includes(nq)) ? `<button class="s10-sp-line" data-i="${i}"><small>${tc(c.a + off / 1000)}</small><span>${cueHtml(c.t)}</span></button>` : '').join('') || `<p class="k9-small k9-muted" style="padding:10px">${esc(tr(cues.length ? 'Sin coincidencias.' : 'Sin subtítulos cargados.'))}</p>`; last = -1; };
      const update = () => {
        const t = v.currentTime - off / 1000; let idx = -1; for (let i = 0; i < cues.length; i++) { if (cues[i].a <= t && t < cues[i].z) { idx = i; break; } if (cues[i].a > t) break; }
        if (idx !== last) { last = idx; cueEl.innerHTML = idx >= 0 ? `<span>${cueHtml(cues[idx].t)}</span>` : ''; qa(list, '.s10-sp-line.on').forEach(x => x.classList.remove('on')); const el = q(list, `[data-i="${idx}"]`); if (el) { el.classList.add('on'); el.scrollIntoView({ block: 'nearest' }); } }
        if (A != null && B != null && v.currentTime >= B) v.currentTime = A;
        q(b, '[data-t]').textContent = tc(v.currentTime) + ' / ' + tc(v.duration); if (isFinite(v.duration) && document.activeElement !== q(b, '[data-seek]')) q(b, '[data-seek]').value = v.currentTime / v.duration * 1000;
      };
      async function loadVideo(f) { vf = f; v.src = URL.createObjectURL(f.blob); names(); if (!cues.length) { const base = f.name.replace(/\.[^.]+$/, ''), sib = (await F.all()).find(x => x.folder === f.folder && /\.(srt|vtt)$/i.test(x.name) && x.name.replace(/(\.[a-z]{2,3})?\.(srt|vtt)$/i, '') === base); if (sib) { loadSubs(sib); E.toast(tr('Subtítulos encontrados') + ': ' + sib.name); } } }
      async function loadSubs(f) { sf = f; cues = parseSubs(await f.blob.text()); if (!cues.length) E.toast(tr('No se encontraron frases en el archivo')); names(); drawList(); update(); }
      const setOff = ms => { off = ms; q(b, '[data-offv]').textContent = (off > 0 ? '+' : '') + off + ' ms'; drawList(); last = -2; update(); };
      v.addEventListener('timeupdate', update); v.addEventListener('seeked', update); v.addEventListener('play', () => { q(b, '[data-a="play"]').textContent = '⏸'; }); v.addEventListener('pause', () => { q(b, '[data-a="play"]').textContent = '▶'; }); v.addEventListener('loadedmetadata', update);
      const raf = () => { if (!v.paused) update(); b.__raf = requestAnimationFrame(raf); }; raf();
      b.addEventListener('input', e => { if (e.target.matches('[data-seek]') && isFinite(v.duration)) v.currentTime = e.target.value / 1000 * v.duration; if (e.target.matches('[data-q]')) drawList(); });
      b.addEventListener('change', e => { if (e.target.matches('[data-rate]')) v.playbackRate = +e.target.value; });
      b.addEventListener('keydown', e => { if (e.target.closest('input,textarea,select')) return; const k = e.key.toLowerCase(); if (k === ' ') { e.preventDefault(); v.paused ? v.play() : v.pause(); } if (k === 'arrowleft') v.currentTime -= 5; if (k === 'arrowright') v.currentTime += 5; if (k === '[') setOff(off - 100); if (k === ']') setOff(off + 100); if (k === 'a') { A = v.currentTime; E.toast('A = ' + tc(A)); } if (k === 'b' && A != null) { B = v.currentTime; E.toast(tr('Repitiendo') + ' ' + tc(A) + ' → ' + tc(B)); } });
      b.addEventListener('click', async e => {
        const ln = e.target.closest('[data-i]'); if (ln) { v.currentTime = cues[+ln.dataset.i].a + off / 1000 + .01; v.play().catch(() => { }); return; }
        const of = e.target.closest('[data-off]'); if (of) { setOff(off + +of.dataset.off); return; }
        const ab = e.target.closest('[data-ab]'); if (ab) { const k = ab.dataset.ab; if (k === 'a') { A = v.currentTime; E.toast('A = ' + tc(A)); } if (k === 'b') { if (A == null) return E.toast(tr('Marca primero el punto A')); B = Math.max(A + .5, v.currentTime); E.toast(tr('Repitiendo') + ' ' + tc(A) + ' → ' + tc(B)); } if (k === 'x') { A = B = null; } qa(b, '[data-ab]').forEach(x => x.classList.toggle('on', (x.dataset.ab === 'a' && A != null) || (x.dataset.ab === 'b' && B != null))); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'video') { const f = await pick(tr('Vídeo'), ['video']); if (f) loadVideo(f); }
        if (k === 'subs') { const f = await U.pickBlob({ title: tr('Subtítulos (.srt o .vtt)'), accept: x => /\.(srt|vtt)$/i.test(x.name), deviceAccept: '.srt,.vtt' }); if (f) loadSubs(f); }
        if (k === 'play') { if (!v.src) return E.toast(tr('Abre primero un vídeo')); v.paused ? v.play() : v.pause(); }
        if (k === 'export' && cues.length) { const r = a.getBoundingClientRect(); const mk = vtt => (vtt ? 'WEBVTT\n\n' : '') + cues.map((c, i) => `${vtt ? '' : (i + 1) + '\n'}${s2ts(c.a + off / 1000, vtt)} --> ${s2ts(c.z + off / 1000, vtt)}\n${c.t}`).join('\n\n') + '\n'; const base = (sf ? sf.name : 'subtitulos').replace(/\.(srt|vtt)$/i, ''); K.ui.menu(r.left - 100, r.bottom + 4, [{ label: 'SRT', icon: '⬇', act: () => U.saveBlob(base + (off ? ' (corregido)' : '') + '.srt', new Blob([mk(false)], { type: 'text/plain' }), sf ? sf.folder : 'videos') }, { label: 'WebVTT', icon: '⬇', act: () => U.saveBlob(base + (off ? ' (corregido)' : '') + '.vtt', new Blob([mk(true)], { type: 'text/vtt' }), sf ? sf.folder : 'videos') }]); }
        if (k === 'style') { const r = await E.form({ title: tr('Estilo de los subtítulos'), ok: tr('Aplicar'), fields: [{ k: 'size', label: tr('Tamaño (px)'), type: 'select', value: String(cfg.get('size')), options: [18, 22, 26, 32, 40, 52].map(n => [String(n), n + ' px']) }, { k: 'color', label: tr('Color'), type: 'select', value: cfg.get('color'), options: [['#ffffff', tr('Blanco')], ['#fde047', tr('Amarillo')], ['#86efac', tr('Verde claro')], ['#f9a8d4', tr('Rosa')]] }, { k: 'bg', label: tr('Fondo'), type: 'select', value: String(cfg.get('bg')), options: [['0', tr('Sin fondo (con sombra)')], ['0.35', tr('Suave')], ['0.55', tr('Normal')], ['0.85', tr('Opaco')]] }, { k: 'pos', label: tr('Posición'), type: 'select', value: cfg.get('pos'), options: [['bottom', tr('Abajo')], ['top', tr('Arriba')]] }] }); if (r) { cfg.set('size', +r.size); cfg.set('color', r.color); cfg.set('bg', +r.bg); cfg.set('pos', r.pos); apply(); } }
      });
      const fid = a => a && (a.id || a.fileId), openArg = a => { if (fid(a)) F.get(fid(a)).then(f => { if (!f) return; if (/\.(srt|vtt)$/i.test(f.name)) loadSubs(f); else loadVideo(f); }); };
      apply(); openArg(arg);
      this.onArg = openArg;
      this.onClose = () => v.pause(); this.destroy = () => { cancelAnimationFrame(b.__raf); v.pause(); v.removeAttribute('src'); };
      K.ext.subplayer = { state: () => ({ cues: cues.length, off, A, B, t: v.currentTime }), loadSubsText: t => { cues = parseSubs(t); names(); drawList(); }, setOff };
    }
  });

  /* ===================== Biblioteca de podcasts ===================== */
  const PK = 'os10_podcasts';
  const pdata = () => { const d = S.get(PK, null) || {}; return { feeds: Array.isArray(d.feeds) ? d.feeds : [], prog: d.prog && typeof d.prog === 'object' ? d.prog : {}, dl: d.dl && typeof d.dl === 'object' ? d.dl : {} }; };
  const psave = d => S.set(PK, d);
  const durS = s => { if (!s) return 0; if (/^\d+$/.test(s)) return +s; const p = String(s).split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : 0; };
  function parseFeed(xml, url) {
    const d = new DOMParser().parseFromString(xml, 'text/xml'); if (d.querySelector('parsererror')) throw new Error(tr('El enlace no es un feed RSS válido'));
    const ch = d.querySelector('channel'); if (!ch) throw new Error(tr('El feed no tiene canal (¿es un podcast?)'));
    const kid = (el, name) => [...el.children].find(c => c.localName === name || c.nodeName === name);
    const txt = (el, name) => { const c = kid(el, name); return c ? c.textContent.trim() : ''; };
    const itImg = kid(ch, 'image'), img = (() => { const it = [...ch.children].find(c => c.localName === 'image' && c.getAttribute('href')); return it ? it.getAttribute('href') : itImg ? txt(itImg, 'url') : ''; })();
    const eps = [...ch.querySelectorAll('item')].slice(0, 300).map(it => { const enc = kid(it, 'enclosure'); if (!enc || !enc.getAttribute('url')) return null; const guid = txt(it, 'guid') || enc.getAttribute('url'); return { id: 'e' + [...guid].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36), title: txt(it, 'title').slice(0, 300), date: Date.parse(txt(it, 'pubDate')) || 0, url: enc.getAttribute('url'), type: enc.getAttribute('type') || 'audio/mpeg', size: +enc.getAttribute('length') || 0, dur: durS([...it.children].find(c => c.localName === 'duration') ? [...it.children].find(c => c.localName === 'duration').textContent.trim() : ''), desc: txt(it, 'description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 600) }; }).filter(Boolean);
    return { url, title: txt(ch, 'title').slice(0, 200) || url, author: ([...ch.children].find(c => c.localName === 'author') || { textContent: '' }).textContent.trim().slice(0, 120), image: /^https:\/\//.test(img) ? img : '', desc: txt(ch, 'description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 600), episodes: eps, updated: Date.now() };
  }
  // el feed se pide por el proxy del navegador EISEN (los feeds no suelen permitir CORS); si no, directamente
  const fetchText = async url => {
    const tries = [() => E.ebFetchHtml ? E.ebFetchHtml(url) : Promise.reject(new Error('sin proxy')), async () => { const r = await fetch('/proxy?url=' + encodeURIComponent(url)); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }, async () => { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }];
    let err = null; for (const t of tries) { try { const s = await t(); if (s && /<(rss|feed|channel)[\s>]/i.test(s)) return s; err = new Error(tr('La respuesta no es un feed RSS')); } catch (e) { err = e; } } throw err;
  };
  K.podcasts = { parseFeed };
  K.define('podcasts', {
    init(b) {
      b.innerHTML = `<div class="k9 s10-pod"><div class="k9-bar"><button class="k9-btn pri" data-a="add">${I('plus', 14)} ${esc(tr('Suscribirse'))}</button><button class="k9-btn" data-a="refresh">${I('refresh', 14)} ${esc(tr('Actualizar'))}</button><span class="sp"></span><button class="k9-btn" data-a="opml-in">${I('upload', 14)} OPML</button><button class="k9-btn" data-a="opml-out">${I('download', 14)} OPML</button></div><div class="s10-pod-main"><nav class="s10-pod-feeds" data-feeds></nav><div class="k9-body" data-v></div></div><div class="s10-pod-player" data-player hidden><audio data-au preload="metadata"></audio><b data-pt></b><button class="k9-btn" data-j="-15">↺15</button><button class="k9-btn pri" data-a="pp">⏸</button><button class="k9-btn" data-j="30">30↻</button><span class="k9-mono k9-small" data-ptime></span><input type="range" min="0" max="1000" value="0" data-pseek style="flex:1"><select class="input-text" data-prate>${[.75, 1, 1.25, 1.5, 1.75, 2].map(v => `<option value="${v}"${v === 1 ? ' selected' : ''}>${v}×</option>`).join('')}</select></div></div>`;
      const V = q(b, '[data-v]'), au = q(b, '[data-au]'); let cur = null, playing = null, lastSave = 0;
      function drawFeeds() { const d = pdata(); q(b, '[data-feeds]').innerHTML = `<button class="${!cur ? 'on' : ''}" data-feed="">🎧 ${esc(tr('Novedades'))}</button>` + d.feeds.map(f => `<button class="${cur === f.url ? 'on' : ''}" data-feed="${esc(f.url)}">${f.image ? `<img src="${esc(f.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '🎙️'}<span>${esc(f.title)}</span><small>${f.episodes.filter(e => !(d.prog[e.id] || {}).done).length}</small></button>`).join(''); }
      function draw() {
        drawFeeds(); const d = pdata(); const f = d.feeds.find(x => x.url === cur);
        const eps = f ? f.episodes.map(e => Object.assign({ feed: f }, e)) : d.feeds.flatMap(fd => fd.episodes.slice(0, 10).map(e => Object.assign({ feed: fd }, e))).sort((a, c) => c.date - a.date).slice(0, 60);
        V.innerHTML = (f ? `<div class="s10-pod-head">${f.image ? `<img src="${esc(f.image)}" alt="" referrerpolicy="no-referrer">` : ''}<div><h3>${esc(f.title)}</h3><small class="k9-muted">${esc(f.author)}</small><p class="k9-small">${esc(f.desc)}</p><div class="k9-row"><button class="k9-btn" data-unsub="${esc(f.url)}">${esc(tr('Cancelar suscripción'))}</button><span class="k9-small k9-muted">${esc(tr('Actualizado'))} ${esc(K.fmt.rel(f.updated))}</span></div></div></div>` : '') +
          (eps.length ? eps.map(e => { const p = d.prog[e.id] || {}, pct = p.d ? Math.min(100, p.t / p.d * 100) : 0; return `<div class="k9-li s10-ep ${p.done ? 'done' : ''}"><button class="k9-btn ${playing === e.id ? 'pri' : ''}" data-play="${esc(e.id)}" aria-label="${esc(tr('Reproducir'))}">${playing === e.id && !au.paused ? '⏸' : '▶'}</button><div class="t"><b>${esc(e.title)}</b><small>${f ? '' : esc(e.feed.title) + ' · '}${e.date ? esc(new Date(e.date).toLocaleDateString(K.locale)) : ''}${e.dur ? ' · ' + tc(e.dur) : ''}${p.done ? ' · ✓ ' + esc(tr('escuchado')) : pct > 1 ? ' · ' + Math.round(pct) + ' %' : ''}${d.dl[e.id] ? ' · 📥' : ''}</small>${pct > 1 && !p.done ? `<div class="s10-ep-bar"><i style="width:${pct}%"></i></div>` : ''}</div><button class="k9-btn" data-dl="${esc(e.id)}" title="${esc(tr('Descargar a Archivos'))}" ${d.dl[e.id] ? 'disabled' : ''}>${I('download', 13)}</button><button class="k9-btn" data-done="${esc(e.id)}" title="${esc(tr(p.done ? 'Marcar como no escuchado' : 'Marcar como escuchado'))}">${p.done ? '↺' : '✓'}</button></div>`; }).join('') : `<div class="k9-state">${I('mic', 40)}<p>${esc(tr(d.feeds.length ? 'Sin episodios.' : 'Suscríbete a un podcast con su enlace RSS (lo encuentras en la web del programa) o importa un archivo OPML.'))}</p></div>`);
      }
      const findEp = id => { for (const f of pdata().feeds) { const e = f.episodes.find(x => x.id === id); if (e) return Object.assign({ feed: f }, e); } return null; };
      async function subscribe(url) { url = url.trim(); if (!/^https?:\/\//i.test(url)) url = 'https://' + url; const d = pdata(); if (d.feeds.some(f => f.url === url)) return E.toast(tr('Ya estás suscrito')); E.toast(tr('Leyendo el feed…')); try { const f = parseFeed(await fetchText(url), url); d.feeds.push(f); psave(d); cur = url; draw(); K.log('info', 'media', 'Suscripción a podcast: ' + f.title); } catch (er) { E.toast(tr('No se pudo leer el podcast') + ': ' + er.message); } }
      async function refresh() { const d = pdata(); let n = 0; for (const f of d.feeds) { try { const nf = parseFeed(await fetchText(f.url), f.url); const ids = new Set(f.episodes.map(e => e.id)); n += nf.episodes.filter(e => !ids.has(e.id)).length; Object.assign(f, nf); } catch { /* feed sin conexión */ } } psave(d); draw(); E.toast(n + ' ' + tr('episodios nuevos')); }
      async function play(id) {
        if (playing === id) { au.paused ? au.play() : au.pause(); return; } const e = findEp(id); if (!e) return; const d = pdata(); let src = e.url;
        if (d.dl[id]) { const u = await blobUrl(d.dl[id]); if (u) src = u; }
        playing = id; au.src = src; au.playbackRate = +q(b, '[data-prate]').value; const p = d.prog[id]; au.currentTime = p && !p.done ? p.t || 0 : 0; q(b, '[data-player]').hidden = false; q(b, '[data-pt]').textContent = e.title;
        au.play().catch(er => E.toast(tr('No se pudo reproducir') + ': ' + er.message)); draw();
      }
      const saveProg = (force) => { if (!playing || !(au.currentTime > 0)) return; if (!force && Date.now() - lastSave < 5000) return; lastSave = Date.now(); const d = pdata(), dur = isFinite(au.duration) ? au.duration : ((findEp(playing) || {}).dur || 0); const done = dur ? au.currentTime / dur > .95 : false; d.prog[playing] = { t: au.currentTime, d: dur, done: done || (d.prog[playing] || {}).done || false, at: Date.now() }; psave(d); };
      au.addEventListener('timeupdate', () => { q(b, '[data-ptime]').textContent = tc(au.currentTime) + ' / ' + tc(au.duration); if (isFinite(au.duration)) q(b, '[data-pseek]').value = au.currentTime / au.duration * 1000; saveProg(false); });
      au.addEventListener('pause', () => { saveProg(true); q(b, '[data-a="pp"]').textContent = '▶'; draw(); }); au.addEventListener('play', () => { q(b, '[data-a="pp"]').textContent = '⏸'; }); au.addEventListener('ended', () => { saveProg(true); draw(); });
      b.addEventListener('input', e => { if (e.target.matches('[data-pseek]') && isFinite(au.duration)) au.currentTime = e.target.value / 1000 * au.duration; });
      b.addEventListener('change', e => { if (e.target.matches('[data-prate]')) au.playbackRate = +e.target.value; });
      b.addEventListener('click', async e => {
        const fd = e.target.closest('[data-feed]'); if (fd) { cur = fd.dataset.feed || null; draw(); return; }
        const pl = e.target.closest('[data-play]'); if (pl) { play(pl.dataset.play); return; }
        const j = e.target.closest('[data-j]'); if (j) { au.currentTime = Math.max(0, au.currentTime + +j.dataset.j); return; }
        const dn = e.target.closest('[data-done]'); if (dn) { const d = pdata(), p = d.prog[dn.dataset.done] || { t: 0, d: 0 }; p.done = !p.done; d.prog[dn.dataset.done] = p; psave(d); draw(); return; }
        const us = e.target.closest('[data-unsub]'); if (us) { if (!await E.confirm(tr('Cancelar suscripción'), (pdata().feeds.find(f => f.url === us.dataset.unsub) || {}).title || '')) return; const d = pdata(); d.feeds = d.feeds.filter(f => f.url !== us.dataset.unsub); psave(d); cur = null; draw(); return; }
        const dl = e.target.closest('[data-dl]'); if (dl) { const ep = findEp(dl.dataset.dl); if (!ep) return; dl.disabled = true; E.toast(tr('Descargando episodio…')); try { let r = await fetch('/proxy?url=' + encodeURIComponent(ep.url)).catch(() => null); if (!r || !r.ok) r = await fetch(ep.url); if (!r.ok) throw new Error('HTTP ' + r.status); const blob = await r.blob(); const ext = (ep.url.split('?')[0].match(/\.(mp3|m4a|aac|ogg|opus|wav)$/i) || [, 'mp3'])[1]; const id = await U.saveBlob(ep.feed.title.slice(0, 40) + ' - ' + ep.title.slice(0, 80) + '.' + ext, new Blob([blob], { type: ep.type }), 'music'); const d = pdata(); d.dl[ep.id] = id; psave(d); draw(); } catch (er) { dl.disabled = false; E.toast(tr('No se pudo descargar') + ': ' + er.message); } return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'add') { const r = await E.form({ title: tr('Suscribirse a un podcast'), ok: tr('Suscribirse'), fields: [{ k: 'u', label: tr('Enlace RSS del podcast'), ph: 'https://…/feed.xml', req: true }] }); if (r) subscribe(r.u); }
        if (k === 'refresh') refresh();
        if (k === 'pp') { if (au.src) au.paused ? au.play() : au.pause(); }
        if (k === 'opml-out') { const d = pdata(); const X = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); K.ui.download('EISENKU_podcasts.opml', `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0"><head><title>EISENKU Podcasts</title></head><body>\n${d.feeds.map(f => `<outline type="rss" text="${X(f.title)}" title="${X(f.title)}" xmlUrl="${X(f.url)}"/>`).join('\n')}\n</body></opml>`, 'text/x-opml'); }
        if (k === 'opml-in') { const f = await U.pickBlob({ title: tr('Archivo OPML'), accept: x => /\.(opml|xml)$/i.test(x.name), deviceAccept: '.opml,.xml' }); if (!f) return; const doc = new DOMParser().parseFromString(await f.blob.text(), 'text/xml'); const urls = [...doc.querySelectorAll('outline[xmlUrl]')].map(o => o.getAttribute('xmlUrl')).filter(u => /^https?:\/\//.test(u)); E.toast(urls.length + ' ' + tr('podcasts en el archivo')); for (const u of urls) await subscribe(u); }
      });
      draw(); this.onOpen = draw; this.onClose = () => { saveProg(true); }; this.destroy = () => { saveProg(true); au.pause(); };
      K.ext.podcasts = { subscribe, play, refresh };
    }
  });

  /* ===================== Centro multimedia (TV, Xbox y mando) ===================== */
  const MK = 'os10_mc_progress';
  async function videoThumb(f) {
    const key = 'vid_' + f.id; try { const c = await K.store10.get('thumbs', key); if (c && c.blob) return URL.createObjectURL(c.blob); } catch { /* sin caché */ }
    return new Promise(res => { const v = document.createElement('video'); v.muted = true; v.preload = 'metadata'; v.src = URL.createObjectURL(f.blob); const done = u => { URL.revokeObjectURL(v.src); res(u); }; v.onloadedmetadata = () => { v.currentTime = Math.min(30, (v.duration || 10) * .1); }; v.onseeked = () => { const c = document.createElement('canvas'), s = 320 / Math.max(1, v.videoWidth); c.width = 320; c.height = Math.round(v.videoHeight * s) || 180; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); c.toBlob(bl => { if (!bl) return done(null); K.store10.put('thumbs', { id: key, blob: bl, t: Date.now() }).catch(() => { }); done(URL.createObjectURL(bl)); }, 'image/jpeg', .75); }; v.onerror = () => done(null); setTimeout(() => done(null), 6000); });
  }
  K.define('mediacenter', {
    init(b) {
      b.innerHTML = `<div class="s10-mc"><header class="s10-mc-top"><b>🍿 ${esc(tr('Centro multimedia'))}</b><nav class="s10-mc-tabs" role="tablist">${[['home', 'Inicio'], ['music', 'Música'], ['video', 'Vídeos'], ['photo', 'Fotos'], ['pod', 'Podcasts']].map(([k, l], i) => `<button class="${i ? '' : 'on'}" data-mt="${k}" role="tab">${esc(tr(l))}</button>`).join('')}</nav><button class="s10-mc-btn" data-a="fs" title="${esc(tr('Pantalla completa'))}">⛶</button></header><main class="s10-mc-body" data-v></main><div class="s10-mc-player" data-pl hidden></div></div>`;
      const V = q(b, '[data-v]'), PL = q(b, '[data-pl]'); let tab = 'home', files = [], objUrls = [];
      const prog = () => S.get(MK, {}) || {};
      const tile = (f, sub, wide) => `<button class="s10-mc-tile ${wide ? 'wide' : ''}" data-f="${esc(f.id)}"><span class="s10-mc-art" data-art="${esc(f.id)}">${{ audio: '🎵', video: '🎬', image: '🖼️' }[F.kindOf(f)] || '📄'}</span><b>${esc(f.name.replace(/\.[^.]+$/, ''))}</b><small>${esc(sub || F.pretty(f.folder))}</small>${(() => { const p = prog()[f.id]; return p && p.d && p.t / p.d > .02 && p.t / p.d < .95 ? `<i class="s10-mc-prog"><i style="width:${p.t / p.d * 100}%"></i></i>` : ''; })()}</button>`;
      const row = (title, items, wide) => items.length ? `<section class="s10-mc-row"><h3>${esc(tr(title))}</h3><div class="s10-mc-strip">${items.join('')}</div></section>` : '';
      async function arts() { for (const el of qa(V, '[data-art]')) { const f = files.find(x => x.id === el.dataset.art); if (!f) continue; const k = F.kindOf(f); if (k === 'image' && K.thumbUrl) { const u = await K.thumbUrl(f, 256).catch(() => null); if (u && el.isConnected) el.innerHTML = `<img src="${u}" alt="">`; } else if (k === 'video') { const u = await videoThumb(f); if (u) { objUrls.push(u); if (el.isConnected) el.innerHTML = `<img src="${u}" alt="">`; } } } }
      async function draw(tb = tab) {
        tab = tb; files = (await F.all()).filter(f => ['audio', 'video', 'image'].includes(F.kindOf(f)));
        const by = k => files.filter(f => F.kindOf(f) === k).sort((a, c) => (c.mod || c.date) - (a.mod || a.date)), P = prog();
        if (tab === 'home') { const cont = files.filter(f => { const p = P[f.id]; return p && p.d && p.t / p.d > .02 && p.t / p.d < .95; }).sort((a, c) => P[c.id].at - P[a.id].at); const pd = pdata(); const podCont = pd.feeds.flatMap(fd => fd.episodes.map(e => ({ e, fd }))).filter(x => { const p = pd.prog[x.e.id]; return p && !p.done && p.t > 5; }).slice(0, 8);
          V.innerHTML = row('Seguir viendo y escuchando', cont.slice(0, 12).map(f => tile(f, tc(P[f.id].t) + ' / ' + tc(P[f.id].d), true))) + row('Vídeos recientes', by('video').slice(0, 12).map(f => tile(f, '', true))) + row('Música reciente', by('audio').slice(0, 12).map(f => tile(f))) + row('Fotos recientes', by('image').slice(0, 16).map(f => tile(f))) + (podCont.length ? `<section class="s10-mc-row"><h3>${esc(tr('Podcasts en curso'))}</h3><div class="s10-mc-strip">${podCont.map(x => `<button class="s10-mc-tile" data-pod="${esc(x.e.id)}"><span class="s10-mc-art">🎙️</span><b>${esc(x.e.title)}</b><small>${esc(x.fd.title)}</small></button>`).join('')}</div></section>` : '') || `<div class="k9-state">${I('video', 48)}<p>${esc(tr('Tu música, vídeos y fotos de Archivos aparecerán aquí.'))}</p></div>`; }
        else if (tab === 'music') { const l = by('audio'); V.innerHTML = l.length ? `<div class="k9-row" style="margin-bottom:12px"><button class="s10-mc-btn big" data-a="playall">▶ ${esc(tr('Reproducir todo'))}</button><button class="s10-mc-btn big" data-a="shuffle">🔀 ${esc(tr('Aleatorio'))}</button></div><div class="s10-mc-grid">${l.map(f => tile(f)).join('')}</div>` : `<div class="k9-state"><p>${esc(tr('No hay música en Archivos.'))}</p></div>`; }
        else if (tab === 'video') { const l = by('video'); V.innerHTML = l.length ? `<div class="s10-mc-grid wide">${l.map(f => tile(f, '', true)).join('')}</div>` : `<div class="k9-state"><p>${esc(tr('No hay vídeos en Archivos.'))}</p></div>`; }
        else if (tab === 'photo') { const l = by('image'); V.innerHTML = l.length ? `<div class="k9-row" style="margin-bottom:12px"><button class="s10-mc-btn big" data-a="slides">▶ ${esc(tr('Presentación'))}</button></div><div class="s10-mc-grid">${l.map(f => tile(f)).join('')}</div>` : `<div class="k9-state"><p>${esc(tr('No hay fotos en Archivos.'))}</p></div>`; }
        else { const pd = pdata(); const eps = pd.feeds.flatMap(fd => fd.episodes.slice(0, 8).map(e => ({ e, fd }))).sort((a, c) => c.e.date - a.e.date).slice(0, 40); V.innerHTML = eps.length ? `<div class="s10-mc-grid">${eps.map(x => `<button class="s10-mc-tile" data-pod="${esc(x.e.id)}"><span class="s10-mc-art">${x.fd.image ? `<img src="${esc(x.fd.image)}" alt="" referrerpolicy="no-referrer">` : '🎙️'}</span><b>${esc(x.e.title)}</b><small>${esc(x.fd.title)}</small></button>`).join('')}</div>` : `<div class="k9-state"><p>${esc(tr('Suscríbete a podcasts en la Biblioteca de podcasts.'))}</p><button class="s10-mc-btn big" data-launch="podcasts">${esc(tr('Abrir Biblioteca de podcasts'))}</button></div>`; }
        const first = q(V, 'button'); if (first && b.contains(document.activeElement) === false) first.focus({ preventScroll: true });
        arts();
      }
      function closePlayer() { const m = q(PL, 'video,audio'); if (m) { savePos(m); m.pause(); } clearInterval(PL.__t); PL.hidden = true; PL.innerHTML = ''; const f = q(V, `[data-f="${PL.__last}"]`) || q(V, 'button'); if (f) f.focus(); draw(); }
      const savePos = m => { const id = m.dataset.fid; if (!id || !isFinite(m.duration)) return; const P = prog(); P[id] = { t: m.currentTime, d: m.duration, at: Date.now() }; if (m.currentTime / m.duration > .95) delete P[id]; const keys = Object.keys(P).sort((a, c) => P[c].at - P[a].at); keys.slice(200).forEach(k => delete P[k]); S.set(MK, P); };
      async function playMedia(list, i = 0) {
        const f = list[i]; if (!f) return closePlayer(); PL.__last = f.id; const k = F.kindOf(f), u = URL.createObjectURL(f.blob); objUrls.push(u);
        if (k === 'image') { PL.hidden = false; PL.innerHTML = `<img src="${u}" alt="${esc(f.name)}"><div class="s10-mc-cap"><b>${esc(f.name)}</b><small>${i + 1} / ${list.length}</small></div><div class="s10-mc-pctl"><button class="s10-mc-btn" data-p="prev">⏮</button><button class="s10-mc-btn" data-p="close">✕ ${esc(tr('Cerrar'))}</button><button class="s10-mc-btn" data-p="next">⏭</button></div>`; clearInterval(PL.__t); if (PL.__slides) PL.__t = setInterval(() => playMedia(list, (i + 1) % list.length), 5000); PL.__nav = d => playMedia(list, (i + d + list.length) % list.length); q(PL, '[data-p="next"]').focus(); return; }
        PL.hidden = false; PL.innerHTML = `<${k === 'video' ? 'video' : 'audio'} data-fid="${esc(f.id)}" src="${u}" controls autoplay playsinline></${k === 'video' ? 'video' : 'audio'}>${k === 'audio' ? `<div class="s10-mc-np">🎵<b>${esc(f.name.replace(/\.[^.]+$/, ''))}</b><small>${i + 1} / ${list.length}</small></div>` : ''}<div class="s10-mc-pctl"><button class="s10-mc-btn" data-p="prev">⏮</button><button class="s10-mc-btn" data-p="back">−10 s</button><button class="s10-mc-btn" data-p="pp">⏯</button><button class="s10-mc-btn" data-p="fwd">+10 s</button><button class="s10-mc-btn" data-p="next">⏭</button><button class="s10-mc-btn" data-p="close">✕ ${esc(tr('Cerrar'))}</button></div>`;
        const m = q(PL, 'video,audio'), P = prog()[f.id]; if (P && P.t / P.d < .95) m.currentTime = P.t; m.addEventListener('ended', () => { savePos(m); playMedia(list, i + 1); }); m.addEventListener('pause', () => savePos(m)); PL.__t = setInterval(() => savePos(m), 5000); PL.__nav = d => { savePos(m); playMedia(list, i + d); }; q(PL, '[data-p="pp"]').focus();
      }
      b.addEventListener('click', async e => {
        const t = e.target.closest('[data-mt]'); if (t) { qa(b, '[data-mt]').forEach(x => x.classList.toggle('on', x === t)); draw(t.dataset.mt); return; }
        const l = e.target.closest('[data-launch]'); if (l) { E.launch(l.dataset.launch); return; }
        const p = e.target.closest('[data-p]'); if (p) { const m = q(PL, 'video,audio'), k = p.dataset.p; if (k === 'close') closePlayer(); if (k === 'next' || k === 'prev') PL.__nav && PL.__nav(k === 'next' ? 1 : -1); if (m && k === 'pp') m.paused ? m.play() : m.pause(); if (m && k === 'back') m.currentTime -= 10; if (m && k === 'fwd') m.currentTime += 10; return; }
        const pod = e.target.closest('[data-pod]'); if (pod) { await E.launch('podcasts'); setTimeout(() => K.ext.podcasts && K.ext.podcasts.play(pod.dataset.pod), 400); return; }
        const tf = e.target.closest('[data-f]'); if (tf) { const f = files.find(x => x.id === tf.dataset.f); if (!f) return; const k = F.kindOf(f), list = files.filter(x => F.kindOf(x) === k).sort((a, c) => (c.mod || c.date) - (a.mod || a.date)); PL.__slides = false; playMedia(list, list.indexOf(f)); return; }
        const a = e.target.closest('[data-a]'); if (!a) return; const k = a.dataset.a;
        if (k === 'fs') { const el = q(b, '.s10-mc'); document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen && el.requestFullscreen().catch(() => { }); }
        if (k === 'playall' || k === 'shuffle') { const l = files.filter(f => F.kindOf(f) === 'audio'); if (k === 'shuffle') l.sort(() => Math.random() - .5); playMedia(l, 0); }
        if (k === 'slides') { PL.__slides = true; playMedia(files.filter(f => F.kindOf(f) === 'image'), 0); }
      });
      b.addEventListener('keydown', e => { if (!PL.hidden) { if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'BrowserBack') { e.preventDefault(); e.stopPropagation(); closePlayer(); } if (e.key === 'MediaTrackNext') PL.__nav && PL.__nav(1); if (e.key === 'MediaTrackPrevious') PL.__nav && PL.__nav(-1); return; }
        const tabs = qa(b, '[data-mt]'), i = tabs.findIndex(x => x.classList.contains('on')); if (e.key === 'PageDown' || e.key === ']') { tabs[(i + 1) % tabs.length].click(); e.preventDefault(); } if (e.key === 'PageUp' || e.key === '[') { tabs[(i - 1 + tabs.length) % tabs.length].click(); e.preventDefault(); } });
      draw(); this.onOpen = () => draw(); this.onClose = () => { if (!PL.hidden) closePlayer(); }; this.destroy = () => { objUrls.forEach(u => URL.revokeObjectURL(u)); objUrls = []; };
    }
  });
})();

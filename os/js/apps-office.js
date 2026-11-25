/* EISENKU OS 8 · Apps de productividad y educación (todas funcionales, datos guardados en el dispositivo) */
(() => {
  'use strict';
  const E = window.EISEN, storage = E.storage, esc = E.esc, toast = E.toast, R = E.registerApp;
  const $in = (root, s) => root.querySelector(s), $$in = (root, s) => [...root.querySelectorAll(s)];
  const fmtDate = d => new Date(d).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  const pad = n => String(n).padStart(2, '0');
  const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  /* Markdown mínimo y seguro */
  E.md = src => {
    const lines = esc(String(src || '')).split('\n'); let out = '', list = '';
    const inline = t => t.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/~~([^~]+)~~/g, '<s>$1</s>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="#" data-external-url="$2">$1</a>');
    const close = () => { if (list) { out += `</${list}>`; list = ''; } };
    lines.forEach(l => {
      let m;
      if ((m = l.match(/^(#{1,4})\s+(.*)/))) { close(); out += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; }
      else if ((m = l.match(/^\s*[-*]\s+\[( |x)\]\s+(.*)/i))) { if (list !== 'ul') { close(); out += '<ul class="md-check">'; list = 'ul'; } out += `<li>${m[1].trim() ? '☑' : '☐'} ${inline(m[2])}</li>`; }
      else if ((m = l.match(/^\s*[-*]\s+(.*)/))) { if (list !== 'ul') { close(); out += '<ul>'; list = 'ul'; } out += `<li>${inline(m[1])}</li>`; }
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); out += '<ol>'; list = 'ol'; } out += `<li>${inline(m[1])}</li>`; }
      else if (/^&gt;\s?/.test(l)) { close(); out += `<blockquote>${inline(l.replace(/^&gt;\s?/, ''))}</blockquote>`; }
      else if (/^---+$/.test(l.trim())) { close(); out += '<hr>'; }
      else if (!l.trim()) { close(); }
      else { close(); out += `<p>${inline(l)}</p>`; }
    });
    close(); return out;
  };

  /* ============ NOTAS ============ */
  R({
    id: 'notes', name: 'Notas', icon: '🗒️', cat: 'Productividad', grad: ['#f59e0b', '#fde047'], w: 820, h: 540, pad: false,
    desc: 'Notas con Markdown, búsqueda, fijado y exportación.', kw: 'apuntes markdown',
    features: ['Formato Markdown con vista previa', 'Buscar y fijar notas', 'Exportar a Archivos o descargar .md'],
    init(b) {
      let notes = storage.get('notes', null);
      if (!notes) notes = [{ id: E.uid(), title: 'Bienvenida', body: '# Mis notas\n\nEscribe en **Markdown**:\n- [ ] Tarea pendiente\n- [x] Tarea hecha\n\n> Las notas se guardan solas en este dispositivo.', pin: true, d: Date.now() }];
      let cur = notes[0] && notes[0].id, prev = false;
      b.innerHTML = `<div class="ap-split"><aside class="ap-side"><div class="ap-row"><input class="input-text" data-q placeholder="Buscar notas…"><button class="btn-primary" data-new title="Nueva nota">＋</button></div><div class="ap-list" data-list></div></aside>
        <main class="ap-main"><div class="ap-toolbar"><input class="input-text ap-title" data-title placeholder="Título"><button class="btn-secondary" data-pin title="Fijar">📌</button><button class="btn-secondary" data-prev>👁 Vista previa</button><button class="btn-secondary" data-save title="Guardar en Archivos">💾</button><button class="btn-secondary" data-del title="Eliminar">🗑</button></div>
        <textarea class="ap-editor" data-body placeholder="Escribe aquí…"></textarea><div class="ap-preview md" data-view hidden></div><div class="ap-status" data-st></div></main></div>`;
      const save = () => storage.set('notes', notes), get = () => notes.find(n => n.id === cur);
      function list() {
        const q = $in(b, '[data-q]').value.toLowerCase();
        const l = notes.filter(n => !q || (n.title + n.body).toLowerCase().includes(q)).sort((x, y) => (y.pin - x.pin) || (y.d - x.d));
        $in(b, '[data-list]').innerHTML = l.map(n => `<button class="ap-item${n.id === cur ? ' on' : ''}" data-id="${n.id}"><b>${n.pin ? '📌 ' : ''}${esc(n.title || 'Sin título')}</b><span>${esc(n.body.replace(/[#*>`-]/g, '').slice(0, 60))}</span><small>${fmtDate(n.d)}</small></button>`).join('') || '<p class="ap-empty">Sin notas</p>';
      }
      function show() {
        const n = get(); const has = !!n;
        $in(b, '[data-title]').value = has ? n.title : ''; $in(b, '[data-body]').value = has ? n.body : '';
        $in(b, '[data-body]').disabled = $in(b, '[data-title]').disabled = !has;
        render(); list();
      }
      function render() {
        const n = get(), t = $in(b, '[data-body]').value;
        $in(b, '[data-view]').hidden = !prev; $in(b, '[data-body]').hidden = prev;
        if (prev) $in(b, '[data-view]').innerHTML = E.md(t);
        $in(b, '[data-st]').textContent = n ? `${t.trim() ? t.trim().split(/\s+/).length : 0} palabras · ${t.length} caracteres · guardado automático` : '';
      }
      let tm;
      const edit = () => { const n = get(); if (!n) return; n.title = $in(b, '[data-title]').value; n.body = $in(b, '[data-body]').value; n.d = Date.now(); clearTimeout(tm); tm = setTimeout(() => { save(); list(); }, 300); render(); };
      $in(b, '[data-title]').oninput = edit; $in(b, '[data-body]').oninput = edit;
      $in(b, '[data-q]').oninput = list;
      $in(b, '[data-list]').onclick = e => { const it = e.target.closest('[data-id]'); if (it) { cur = it.dataset.id; show(); } };
      $in(b, '[data-new]').onclick = () => { const n = { id: E.uid(), title: 'Nueva nota', body: '', pin: false, d: Date.now() }; notes.unshift(n); cur = n.id; save(); prev = false; show(); $in(b, '[data-title]').select(); };
      $in(b, '[data-del]').onclick = async () => { const n = get(); if (!n || !await E.confirm('Eliminar nota', `¿Eliminar "${n.title}"?`)) return; notes = notes.filter(x => x.id !== cur); cur = notes[0] && notes[0].id; save(); show(); };
      $in(b, '[data-pin]').onclick = () => { const n = get(); if (!n) return; n.pin = !n.pin; save(); list(); };
      $in(b, '[data-prev]').onclick = () => { prev = !prev; render(); };
      $in(b, '[data-save]').onclick = () => { const n = get(); if (n) E.saveToFiles((n.title || 'nota').replace(/[\\/:*?"<>|]/g, '_') + '.md', new Blob([n.body], { type: 'text/markdown' })); };
      E.notesAdd = (title, body) => { const n = { id: E.uid(), title, body, pin: false, d: Date.now() }; notes.unshift(n); cur = n.id; save(); show(); };
      show();
    }
  });
  // permite crear notas antes de abrir la app (asistente)
  const _notesAdd = (title, body) => { const n = storage.get('notes', []) || []; n.unshift({ id: E.uid(), title, body, pin: false, d: Date.now() }); storage.set('notes', n); };
  E.addNote = (t, b) => { if (E.notesAdd) E.notesAdd(t, b); else _notesAdd(t, b); };

  /* ============ TAREAS ============ */
  R({
    id: 'tasks', name: 'Tareas', icon: '✅', cat: 'Productividad', grad: ['#059669', '#34d399'], w: 760, h: 520, pad: false,
    desc: 'Listas de tareas con fechas, prioridades y filtros.', kw: 'todo pendientes deberes',
    features: ['Prioridad y fecha límite', 'Vistas Hoy, Importantes, Próximas y Completadas', 'Aviso de tareas vencidas'],
    init(b) {
      let tasks = storage.get('tasks', []), view = 'all';
      b.innerHTML = `<div class="ap-split"><aside class="ap-side ap-nav">${[['all', '📋 Todas'], ['today', '☀️ Hoy'], ['imp', '⭐ Importantes'], ['next', '📅 Próximas'], ['done', '✔️ Completadas']].map(([k, l]) => `<button class="ap-navbtn" data-v="${k}">${l}<span data-c="${k}"></span></button>`).join('')}</aside>
        <main class="ap-main"><form class="ap-toolbar" data-f><input class="input-text" style="flex:1" data-t placeholder="Añadir una tarea… (Enter)" required><input type="date" class="input-text" data-d style="width:150px"><select class="input-text" data-p style="width:120px"><option value="1">Normal</option><option value="2">⭐ Importante</option><option value="0">Baja</option></select><button class="btn-primary">Añadir</button></form><div class="ap-scroll" data-list></div></main></div>`;
      const save = () => { storage.set('tasks', tasks); draw(); };
      const today = dayKey(new Date());
      const match = t => view === 'done' ? t.done : t.done ? false : view === 'today' ? t.due && t.due <= today : view === 'imp' ? t.p === 2 : view === 'next' ? t.due && t.due > today : true;
      function draw() {
        $$in(b, '[data-v]').forEach(x => x.classList.toggle('on', x.dataset.v === view));
        ['all', 'today', 'imp', 'next', 'done'].forEach(k => { const v = view; view = k; $in(b, `[data-c="${k}"]`).textContent = tasks.filter(match).length || ''; view = v; });
        const l = tasks.filter(match).sort((x, y) => (x.done - y.done) || (y.p - x.p) || String(x.due || '9').localeCompare(String(y.due || '9')));
        $in(b, '[data-list]').innerHTML = l.map(t => `<div class="ap-task${t.done ? ' done' : ''}${!t.done && t.due && t.due < today ? ' late' : ''}" data-id="${t.id}"><button class="ap-check" data-a="tog">${t.done ? '✔' : ''}</button><div class="ap-task-t"><span>${esc(t.t)}</span><small>${t.due ? '📅 ' + new Date(t.due + 'T12:00').toLocaleDateString() + (t.due < today && !t.done ? ' · vencida' : '') : ''}</small></div><button class="ap-ico" data-a="imp" title="Importante">${t.p === 2 ? '⭐' : '☆'}</button><button class="ap-ico" data-a="ed" title="Editar">✏️</button><button class="ap-ico" data-a="del" title="Eliminar">🗑</button></div>`).join('') || '<p class="ap-empty">Nada por aquí. ¡Añade una tarea!</p>';
      }
      $in(b, '[data-f]').onsubmit = e => { e.preventDefault(); const t = $in(b, '[data-t]').value.trim(); if (!t) return; tasks.push({ id: E.uid(), t, due: $in(b, '[data-d]').value || '', p: +$in(b, '[data-p]').value, done: false, c: Date.now() }); $in(b, '[data-t]').value = ''; save(); };
      b.addEventListener('click', async e => {
        const v = e.target.closest('[data-v]'); if (v) { view = v.dataset.v; draw(); return; }
        const a = e.target.closest('[data-a]'), row = e.target.closest('[data-id]'); if (!a || !row) return;
        const t = tasks.find(x => x.id === row.dataset.id);
        if (a.dataset.a === 'tog') t.done = !t.done;
        if (a.dataset.a === 'imp') t.p = t.p === 2 ? 1 : 2;
        if (a.dataset.a === 'del') tasks = tasks.filter(x => x !== t);
        if (a.dataset.a === 'ed') { const r = await E.form({ title: 'Editar tarea', fields: [{ k: 't', label: 'Tarea', value: t.t }, { k: 'due', label: 'Fecha límite', type: 'date', value: t.due }] }); if (r) { t.t = r.t || t.t; t.due = r.due; } }
        save();
      });
      E.tasksRefresh = () => { tasks = storage.get('tasks', []); draw(); };
      draw();
    }
  });
  E.addTask = (t, due = '') => { const l = storage.get('tasks', []); l.push({ id: E.uid(), t, due, p: 1, done: false, c: Date.now() }); storage.set('tasks', l); if (E.tasksRefresh) E.tasksRefresh(); };

  /* ============ CALENDARIO ============ */
  const evs = () => storage.get('events', []);
  R({
    id: 'calendar', name: 'Calendario', icon: '📅', cat: 'Productividad', grad: ['#dc2626', '#fb7185'], w: 860, h: 560, pad: false,
    desc: 'Agenda mensual con eventos y recordatorios.', kw: 'agenda eventos fechas',
    features: ['Vista mensual', 'Eventos con hora y color', 'Recordatorio con notificación'],
    init(b) {
      let ref = new Date(), sel = dayKey(new Date());
      b.innerHTML = `<div class="cal"><div class="cal-main"><div class="ap-toolbar"><button class="btn-secondary" data-m="-1">‹</button><b class="cal-title" data-title></b><button class="btn-secondary" data-m="1">›</button><button class="btn-secondary" data-today>Hoy</button></div><div class="cal-grid" data-grid></div></div>
        <aside class="cal-side"><h3 data-dt></h3><form data-f class="ap-col"><input class="input-text" data-t placeholder="Nuevo evento" required><div class="ap-row"><input type="time" class="input-text" data-h><select class="input-text" data-c><option value="#3b82f6">Azul</option><option value="#ef4444">Rojo</option><option value="#22c55e">Verde</option><option value="#f59e0b">Naranja</option><option value="#a855f7">Morado</option></select></div><label class="ap-check-l"><input type="checkbox" data-r checked> Recordarme</label><button class="btn-primary">Añadir evento</button></form><div data-list class="ap-col"></div><h4>Próximos</h4><div data-up class="ap-col"></div></aside></div>`;
      const DOW = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
      function draw() {
        const y = ref.getFullYear(), m = ref.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), all = evs(), tk = dayKey(new Date());
        $in(b, '[data-title]').textContent = ref.toLocaleDateString([], { month: 'long', year: 'numeric' });
        let h = DOW.map(d => `<div class="cal-dow">${d}</div>`).join('');
        for (let i = 0; i < first; i++) h += '<div class="cal-cell off"></div>';
        for (let d = 1; d <= n; d++) {
          const k = `${y}-${pad(m + 1)}-${pad(d)}`, es = all.filter(e => e.d === k);
          h += `<button class="cal-cell${k === tk ? ' today' : ''}${k === sel ? ' sel' : ''}" data-k="${k}"><span>${d}</span>${es.slice(0, 3).map(e => `<i style="background:${e.c}">${esc(e.t)}</i>`).join('')}${es.length > 3 ? `<i class="more">+${es.length - 3}</i>` : ''}</button>`;
        }
        $in(b, '[data-grid]').innerHTML = h;
        $in(b, '[data-dt]').textContent = new Date(sel + 'T12:00').toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
        $in(b, '[data-list]').innerHTML = all.filter(e => e.d === sel).sort((a, c) => (a.h || '').localeCompare(c.h || '')).map(e => `<div class="cal-ev" style="border-color:${e.c}"><b>${esc(e.h || 'Todo el día')}</b> ${esc(e.t)}${e.r ? ' 🔔' : ''}<button class="ap-ico" data-del="${e.id}">✕</button></div>`).join('') || '<p class="ap-empty">Sin eventos este día</p>';
        $in(b, '[data-up]').innerHTML = all.filter(e => e.d >= tk).sort((a, c) => (a.d + (a.h || '')).localeCompare(c.d + (c.h || ''))).slice(0, 6).map(e => `<div class="cal-ev" style="border-color:${e.c}"><small>${new Date(e.d + 'T12:00').toLocaleDateString()} ${esc(e.h || '')}</small> ${esc(e.t)}</div>`).join('') || '<p class="ap-empty">Nada próximo</p>';
      }
      b.addEventListener('click', e => {
        const mb = e.target.closest('[data-m]'); if (mb) { ref = new Date(ref.getFullYear(), ref.getMonth() + +mb.dataset.m, 1); draw(); }
        if (e.target.closest('[data-today]')) { ref = new Date(); sel = dayKey(ref); draw(); }
        const c = e.target.closest('[data-k]'); if (c) { sel = c.dataset.k; draw(); }
        const d = e.target.closest('[data-del]'); if (d) { storage.set('events', evs().filter(x => x.id !== d.dataset.del)); draw(); }
      });
      $in(b, '[data-f]').onsubmit = e => { e.preventDefault(); const all = evs(); all.push({ id: E.uid(), d: sel, t: $in(b, '[data-t]').value.trim(), h: $in(b, '[data-h]').value, c: $in(b, '[data-c]').value, r: $in(b, '[data-r]').checked && !!$in(b, '[data-h]').value }); storage.set('events', all); $in(b, '[data-t]').value = ''; draw(); };
      E.calRefresh = draw; draw();
    }
  });
  E.addEvent = (t, d, h = '') => { const all = evs(); all.push({ id: E.uid(), d, t, h, c: '#3b82f6', r: !!h }); storage.set('events', all); if (E.calRefresh) E.calRefresh(); };

  /* ============ RELOJ (alarmas, temporizador, cronómetro, pomodoro) ============ */
  let ac;
  const beep = (n = 3) => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); for (let i = 0; i < n; i++) { const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * .35; o.frequency.value = 880; o.type = 'triangle'; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .3); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + .32); } } catch { /* sin audio */ } };
  E.beep = beep;
  // vigilante global de alarmas y recordatorios (ligero: 1 comprobación cada 15 s)
  setInterval(() => {
    const now = new Date(), hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`, tk = dayKey(now), fired = storage.get('fired', {});
    let ch = false;
    (storage.get('alarms', []) || []).forEach(a => { const key = 'a' + a.id + tk + hm; if (a.on && a.h === hm && (!a.days || !a.days.length || a.days.includes(now.getDay())) && !fired[key]) { fired[key] = 1; ch = true; E.notify('⏰ Alarma ' + a.h, a.l || 'Alarma', '⏰', 15000); beep(6); } });
    evs().forEach(e => { const key = 'e' + e.id; if (e.r && e.d === tk && e.h === hm && !fired[key]) { fired[key] = 1; ch = true; E.notify('📅 ' + e.t, 'Evento a las ' + e.h, '📅', 15000); beep(3); } });
    if (ch) { const ks = Object.keys(fired); if (ks.length > 200) ks.slice(0, 100).forEach(k => delete fired[k]); storage.set('fired', fired); }
  }, 15000);
  R({
    id: 'clock', name: 'Reloj y alarmas', icon: '⏰', cat: 'Productividad', grad: ['#0f172a', '#6366f1'], w: 620, h: 520,
    desc: 'Reloj mundial, alarmas, temporizador, cronómetro y Pomodoro.', kw: 'alarma temporizador cronometro pomodoro hora',
    features: ['Alarmas con notificación y sonido', 'Temporizador y cronómetro con vueltas', 'Técnica Pomodoro'],
    init(b) {
      b.innerHTML = `<div class="ap-tabs">${['🌍 Mundial', '⏰ Alarmas', '⏳ Temporizador', '⏱ Cronómetro', '🍅 Pomodoro'].map((t, i) => `<button data-tab="${i}"${i ? '' : ' class="on"'}>${t}</button>`).join('')}</div><div class="ap-pages">
        <section data-p="0"><div class="clk-big" data-now></div><div class="clk-zones" data-zones></div></section>
        <section data-p="1" hidden><form class="ap-row" data-af><input type="time" class="input-text" data-ah required><input class="input-text" data-al placeholder="Etiqueta"><button class="btn-primary">Añadir</button></form><div class="ap-row clk-days">${['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d, i) => `<label><input type="checkbox" value="${i}">${d}</label>`).join('')}<small class="eis-muted">(sin días = todos)</small></div><div data-al-list class="ap-col"></div></section>
        <section data-p="2" hidden><div class="clk-big" data-tv>05:00</div><div class="ap-row ap-center"><input type="number" class="input-text" data-tm min="0" value="5" style="width:80px"> min <input type="number" class="input-text" data-ts min="0" max="59" value="0" style="width:80px"> s</div><div class="ap-row ap-center"><button class="btn-primary" data-tgo>Iniciar</button><button class="btn-secondary" data-treset>Reiniciar</button></div></section>
        <section data-p="3" hidden><div class="clk-big" data-sv>00:00.0</div><div class="ap-row ap-center"><button class="btn-primary" data-sgo>Iniciar</button><button class="btn-secondary" data-slap>Vuelta</button><button class="btn-secondary" data-sreset>Reiniciar</button></div><ol data-laps class="clk-laps"></ol></section>
        <section data-p="4" hidden><div class="clk-phase" data-pph>Concentración</div><div class="clk-big" data-pv>25:00</div><div class="ap-row ap-center"><button class="btn-primary" data-pgo>Iniciar</button><button class="btn-secondary" data-preset>Reiniciar</button></div><p class="eis-muted ap-center" data-pc>Pomodoros completados hoy: 0</p></section></div>`;
      $$in(b, '[data-tab]').forEach(t => t.onclick = () => { $$in(b, '[data-tab]').forEach(x => x.classList.toggle('on', x === t)); $$in(b, '[data-p]').forEach(p => p.hidden = p.dataset.p !== t.dataset.tab); });
      const zones = [['Ciudad de México', 'America/Mexico_City'], ['Madrid', 'Europe/Madrid'], ['Nueva York', 'America/New_York'], ['Buenos Aires', 'America/Argentina/Buenos_Aires'], ['Tokio', 'Asia/Tokyo'], ['Londres', 'Europe/London']];
      const tick = () => {
        const d = new Date(); $in(b, '[data-now]').innerHTML = `${d.toLocaleTimeString()}<small>${d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small>`;
        $in(b, '[data-zones]').innerHTML = zones.map(([n, z]) => { let t = ''; try { t = d.toLocaleTimeString([], { timeZone: z, hour: '2-digit', minute: '2-digit' }); } catch { t = '--'; } return `<div class="ap-card"><b>${t}</b><span>${n}</span></div>`; }).join('');
      };
      setInterval(() => { if (!b.closest('.window').classList.contains('open')) return; tick(); }, 1000); tick();
      // alarmas
      const drawA = () => { $in(b, '[data-al-list]').innerHTML = (storage.get('alarms', [])).map(a => `<div class="ap-card ap-row"><b style="font-size:22px">${a.h}</b><span style="flex:1">${esc(a.l || 'Alarma')}<br><small class="eis-muted">${a.days && a.days.length ? a.days.map(x => 'DLMXJVS'[x]).join(' ') : 'Todos los días'}</small></span><label class="sw"><input type="checkbox" data-on="${a.id}"${a.on ? ' checked' : ''}><i></i></label><button class="ap-ico" data-ad="${a.id}">🗑</button></div>`).join('') || '<p class="ap-empty">Sin alarmas</p>'; };
      $in(b, '[data-af]').onsubmit = e => { e.preventDefault(); const l = storage.get('alarms', []); l.push({ id: E.uid(), h: $in(b, '[data-ah]').value, l: $in(b, '[data-al]').value, on: true, days: $$in(b, '.clk-days input:checked').map(x => +x.value) }); storage.set('alarms', l); drawA(); toast('Alarma guardada'); };
      b.addEventListener('change', e => { const o = e.target.closest('[data-on]'); if (o) { const l = storage.get('alarms', []); const a = l.find(x => x.id === o.dataset.on); a.on = o.checked; storage.set('alarms', l); } });
      b.addEventListener('click', e => { const d = e.target.closest('[data-ad]'); if (d) { storage.set('alarms', storage.get('alarms', []).filter(x => x.id !== d.dataset.ad)); drawA(); } });
      drawA();
      // temporizador
      let tEnd = 0, tLeft = 300000, tRun = null;
      const tFmt = ms => { const s = Math.ceil(ms / 1000); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
      const tSet = () => { tLeft = ((+$in(b, '[data-tm]').value || 0) * 60 + (+$in(b, '[data-ts]').value || 0)) * 1000; $in(b, '[data-tv]').textContent = tFmt(tLeft); };
      $in(b, '[data-tm]').oninput = $in(b, '[data-ts]').oninput = () => { if (!tRun) tSet(); };
      $in(b, '[data-tgo]').onclick = e => {
        if (tRun) { clearInterval(tRun); tRun = null; tLeft = tEnd - Date.now(); e.target.textContent = 'Continuar'; return; }
        if (tLeft <= 0) tSet(); tEnd = Date.now() + tLeft; e.target.textContent = 'Pausar';
        tRun = setInterval(() => { const l = tEnd - Date.now(); $in(b, '[data-tv]').textContent = tFmt(Math.max(0, l)); if (l <= 0) { clearInterval(tRun); tRun = null; tLeft = 0; e.target.textContent = 'Iniciar'; E.notify('⏳ Temporizador', '¡Se acabó el tiempo!', '⏳', 12000); beep(5); } }, 200);
      };
      $in(b, '[data-treset]').onclick = () => { clearInterval(tRun); tRun = null; $in(b, '[data-tgo]').textContent = 'Iniciar'; tSet(); };
      // cronómetro
      let sStart = 0, sAcc = 0, sRun = null;
      const sFmt = ms => `${pad(Math.floor(ms / 60000))}:${pad(Math.floor(ms / 1000) % 60)}.${Math.floor(ms / 100) % 10}`;
      const sNow = () => sAcc + (sRun ? Date.now() - sStart : 0);
      $in(b, '[data-sgo]').onclick = e => { if (sRun) { sAcc = sNow(); clearInterval(sRun); sRun = null; e.target.textContent = 'Continuar'; } else { sStart = Date.now(); sRun = setInterval(() => $in(b, '[data-sv]').textContent = sFmt(sNow()), 100); e.target.textContent = 'Pausar'; } };
      $in(b, '[data-slap]').onclick = () => { if (sNow()) $in(b, '[data-laps]').insertAdjacentHTML('afterbegin', `<li>${sFmt(sNow())}</li>`); };
      $in(b, '[data-sreset]').onclick = () => { clearInterval(sRun); sRun = null; sAcc = 0; $in(b, '[data-sv]').textContent = '00:00.0'; $in(b, '[data-laps]').innerHTML = ''; $in(b, '[data-sgo]').textContent = 'Iniciar'; };
      // pomodoro
      let pWork = true, pLeft = 25 * 60000, pEnd = 0, pRun = null;
      const pc = () => { const k = 'pomo_' + dayKey(new Date()); $in(b, '[data-pc]').textContent = 'Pomodoros completados hoy: ' + (storage.get(k, 0)); };
      const pDraw = () => { $in(b, '[data-pv]').textContent = tFmt(pLeft); $in(b, '[data-pph]').textContent = pWork ? '🎯 Concentración' : '☕ Descanso'; };
      $in(b, '[data-pgo]').onclick = e => {
        if (pRun) { clearInterval(pRun); pRun = null; pLeft = pEnd - Date.now(); e.target.textContent = 'Continuar'; return; }
        pEnd = Date.now() + pLeft; e.target.textContent = 'Pausar';
        pRun = setInterval(() => { pLeft = pEnd - Date.now(); if (pLeft <= 0) { if (pWork) { const k = 'pomo_' + dayKey(new Date()); storage.set(k, storage.get(k, 0) + 1); pc(); } pWork = !pWork; pLeft = (pWork ? 25 : 5) * 60000; pEnd = Date.now() + pLeft; E.notify('🍅 Pomodoro', pWork ? 'Vuelve a concentrarte' : 'Toma un descanso de 5 min', '🍅'); beep(3); } pDraw(); }, 250);
      };
      $in(b, '[data-preset]').onclick = () => { clearInterval(pRun); pRun = null; pWork = true; pLeft = 25 * 60000; $in(b, '[data-pgo]').textContent = 'Iniciar'; pDraw(); };
      pc(); pDraw();
    }
  });

  /* ============ CALCULADORA ============ */
  R({
    id: 'calc', name: 'Calculadora', icon: '🧮', cat: 'Productividad', grad: ['#334155', '#f97316'], w: 380, h: 560,
    desc: 'Calculadora estándar y científica con historial.', kw: 'calcular matematicas',
    features: ['Funciones científicas (sin, log, √, x², !)', 'Historial de operaciones', 'Uso con teclado'],
    init(b) {
      let expr = '', sci = false, deg = true; const hist = storage.get('calc_hist', []);
      b.innerHTML = `<div class="calc"><div class="calc-top"><button class="btn-secondary" data-sci>Científica</button><button class="btn-secondary" data-deg>DEG</button><button class="btn-secondary" data-h>🕘</button></div><div class="calc-disp"><small data-e></small><b data-r>0</b></div><div class="calc-hist" data-hist hidden></div><div class="calc-keys" data-k></div></div>`;
      const STD = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '±', '0', ',', '='], SCI = ['sin', 'cos', 'tan', '√', 'x²', 'xʸ', 'ln', 'log', 'π', 'e', 'n!', '⌫'];
      const keys = () => { $in(b, '[data-k]').className = 'calc-keys' + (sci ? ' sci' : ''); $in(b, '[data-k]').innerHTML = (sci ? SCI : []).concat(STD).map(k => `<button data-key="${k}" class="${/[÷×+\-=]/.test(k) && k.length === 1 ? 'op' : k === 'C' || k === '⌫' ? 'fn' : ''}${k === '=' ? ' eq' : ''}">${k}</button>`).join(''); };
      const trig = f => `${f}(`;
      const prep = s => { let x = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.').replace(/√/g, 'sqrt').replace(/π/g, 'pi'); if (deg) x = x.replace(/\b(sin|cos|tan)\(/g, '$1d('); return x; };
      const show = () => { $in(b, '[data-e]').textContent = expr; let r = ''; try { if (expr) { const v = E.math.eval(prep(expr)); if (Number.isFinite(v)) r = String(+v.toPrecision(12)); } } catch { /* incompleta */ } $in(b, '[data-r]').textContent = r || (expr ? '…' : '0'); };
      const press = k => {
        if (k === 'C') expr = ''; else if (k === '⌫') expr = expr.slice(0, -1);
        else if (k === '=') { try { const v = E.math.eval(prep(expr)); const r = Number.isFinite(v) ? String(+v.toPrecision(12)) : 'Error'; hist.unshift(expr + ' = ' + r); storage.set('calc_hist', hist.slice(0, 30)); expr = r === 'Error' ? '' : r; $in(b, '[data-r]').textContent = r; $in(b, '[data-e]').textContent = ''; return; } catch { $in(b, '[data-r]').textContent = 'Error'; return; } }
        else if (k === '±') expr = expr.startsWith('-(') ? expr.slice(2, -1) : `-(${expr || 0})`;
        else if (['sin', 'cos', 'tan'].includes(k)) expr += trig(k);
        else if (k === 'ln' || k === 'log') expr += k + '(';
        else if (k === '√') expr += '√(';
        else if (k === 'x²') expr += '^2'; else if (k === 'xʸ') expr += '^'; else if (k === 'n!') expr += '!';
        else expr += k;
        show();
      };
      b.addEventListener('click', e => {
        const k = e.target.closest('[data-key]'); if (k) press(k.dataset.key);
        if (e.target.closest('[data-sci]')) { sci = !sci; keys(); }
        if (e.target.closest('[data-deg]')) { deg = !deg; e.target.textContent = deg ? 'DEG' : 'RAD'; show(); }
        if (e.target.closest('[data-h]')) { const h = $in(b, '[data-hist]'); h.hidden = !h.hidden; h.innerHTML = hist.map(x => `<div>${esc(x)}</div>`).join('') || '<p class="ap-empty">Sin historial</p>'; }
      });
      b.closest('.window').addEventListener('keydown', e => {
        if (e.target.matches('input,textarea')) return;
        const m = { Enter: '=', '=': '=', Backspace: '⌫', Escape: 'C', '*': '×', '/': '÷', '.': ',' }[e.key] || (/^[\d+\-()^!,]$/.test(e.key) ? e.key : null);
        if (m) { e.preventDefault(); press(m); }
      });
      b.closest('.window').tabIndex = -1;
      keys(); show();
    }
  });

  /* ============ CONVERSOR ============ */
  const UNITS = {
    'Longitud': { m: 1, km: 1000, cm: .01, mm: .001, mi: 1609.344, yd: .9144, ft: .3048, in: .0254, 'milla náutica': 1852 },
    'Masa': { kg: 1, g: .001, mg: 1e-6, t: 1000, lb: .45359237, oz: .028349523 },
    'Volumen': { L: 1, mL: .001, 'm³': 1000, 'galón US': 3.785411784, 'taza': .2365882, 'cucharada': .0147868 },
    'Área': { 'm²': 1, 'km²': 1e6, 'ha': 1e4, 'cm²': 1e-4, 'ft²': .09290304, 'acre': 4046.8564 },
    'Velocidad': { 'm/s': 1, 'km/h': 1 / 3.6, 'mph': .44704, 'nudo': .514444 },
    'Tiempo': { s: 1, min: 60, h: 3600, 'día': 86400, semana: 604800, año: 31557600 },
    'Datos': { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, bit: .125 },
    'Temperatura': { '°C': 'c', '°F': 'f', 'K': 'k' }
  };
  R({
    id: 'converter', name: 'Conversor', icon: '🔁', cat: 'Productividad', grad: ['#0d9488', '#5eead4'], w: 520, h: 440,
    desc: 'Convierte unidades y divisas (tipos del BCE en vivo).', kw: 'unidades divisas monedas dolar euro',
    features: ['8 categorías de unidades', 'Divisas con tipos actualizados (Frankfurter/BCE)', 'Conversión instantánea'],
    init(b) {
      b.innerHTML = `<div class="ap-col"><select class="input-text" data-cat>${Object.keys(UNITS).concat('Divisas').map(c => `<option>${c}</option>`).join('')}</select>
        <div class="conv"><input type="number" class="input-text" data-a value="1"><select class="input-text" data-ua></select><button class="btn-secondary" data-sw>⇄</button><input type="number" class="input-text" data-b><select class="input-text" data-ub></select></div><p class="eis-muted" data-note></p></div>`;
      let rates = null;
      const cat = () => $in(b, '[data-cat]').value;
      async function fill() {
        let opts;
        if (cat() === 'Divisas') {
          $in(b, '[data-note]').textContent = 'Cargando tipos de cambio…';
          if (!rates) { try { const j = await (await fetch('https://api.frankfurter.app/latest?from=USD')).json(); rates = Object.assign({ USD: 1 }, j.rates); rates._d = j.date; } catch { rates = null; } }
          if (!rates) { $in(b, '[data-note]').textContent = 'No se pudieron obtener los tipos de cambio (sin conexión).'; opts = []; }
          else { opts = Object.keys(rates).filter(k => k[0] !== '_'); $in(b, '[data-note]').textContent = 'Tipos de referencia del Banco Central Europeo · ' + rates._d; }
        } else { opts = Object.keys(UNITS[cat()]); $in(b, '[data-note]').textContent = ''; }
        $in(b, '[data-ua]').innerHTML = $in(b, '[data-ub]').innerHTML = opts.map(o => `<option>${o}</option>`).join('');
        if (cat() === 'Divisas' && opts.includes('MXN')) { $in(b, '[data-ua]').value = 'USD'; $in(b, '[data-ub]').value = 'MXN'; } else if (opts[1]) $in(b, '[data-ub]').value = opts[1];
        calc();
      }
      function conv(v, a, z) {
        const c = cat();
        if (c === 'Divisas') return rates ? v / rates[a] * rates[z] : NaN;
        if (c === 'Temperatura') { const k = a === '°C' ? v + 273.15 : a === '°F' ? (v - 32) * 5 / 9 + 273.15 : v; return z === '°C' ? k - 273.15 : z === '°F' ? (k - 273.15) * 9 / 5 + 32 : k; }
        return v * UNITS[c][a] / UNITS[c][z];
      }
      function calc(rev) {
        const A = $in(b, '[data-a]'), B = $in(b, '[data-b]'), ua = $in(b, '[data-ua]').value, ub = $in(b, '[data-ub]').value;
        if (rev) A.value = +conv(+B.value, ub, ua).toPrecision(10); else B.value = +conv(+A.value, ua, ub).toPrecision(10);
      }
      $in(b, '[data-cat]').onchange = fill; $in(b, '[data-a]').oninput = () => calc(); $in(b, '[data-b]').oninput = () => calc(true);
      $in(b, '[data-ua]').onchange = $in(b, '[data-ub]').onchange = () => calc();
      $in(b, '[data-sw]').onclick = () => { const a = $in(b, '[data-ua]').value; $in(b, '[data-ua]').value = $in(b, '[data-ub]').value; $in(b, '[data-ub]').value = a; calc(); };
      fill();
    }
  });

  /* ============ BLOC DE NOTAS / EDITOR DE TEXTO (abre archivos de Archivos) ============ */
  let npApi = null;
  R({
    id: 'notepad', name: 'Editor de texto', icon: '📄', cat: 'Productividad', grad: ['#475569', '#cbd5e1'], w: 720, h: 500, pad: false,
    desc: 'Abre y edita archivos .txt, .md, .csv, .json o .html de Archivos.', kw: 'bloc de notas txt',
    features: ['Abrir y guardar en Archivos', 'Buscar y reemplazar', 'Ajuste de línea y tamaño de letra'],
    init(b) {
      let file = null, dirty = false;
      b.innerHTML = `<div class="ap-toolbar"><button class="btn-secondary" data-a="new">Nuevo</button><button class="btn-secondary" data-a="open">Abrir…</button><button class="btn-primary" data-a="save">Guardar</button><button class="btn-secondary" data-a="saveas">Guardar como</button><button class="btn-secondary" data-a="dl">⬇</button><span class="ap-sep"></span><input class="input-text" data-find placeholder="Buscar" style="width:110px"><input class="input-text" data-rep placeholder="Reemplazar" style="width:110px"><button class="btn-secondary" data-a="rep">Reemplazar todo</button><label class="ap-check-l"><input type="checkbox" data-wrap checked> Ajustar</label><select class="input-text" data-fs style="width:70px"><option>13</option><option selected>15</option><option>18</option><option>22</option></select></div>
        <textarea class="ap-editor mono" data-t spellcheck="false"></textarea><div class="ap-status" data-st></div>`;
      const T = $in(b, '[data-t]'), W = b.closest('.window');
      const title = () => { W.querySelector('.window-title-area span:last-child').textContent = (dirty ? '● ' : '') + (file ? file.name : 'Sin título') + ' · Editor de texto'; $in(b, '[data-st]').textContent = `Líneas: ${T.value.split('\n').length} · Caracteres: ${T.value.length}${file && file.folder ? ' · Archivos/' + file.folder : ''}`; };
      T.oninput = () => { dirty = true; title(); };
      $in(b, '[data-wrap]').onchange = e => T.style.whiteSpace = e.target.checked ? 'pre-wrap' : 'pre';
      $in(b, '[data-fs]').onchange = e => T.style.fontSize = e.target.value + 'px';
      async function save(as) {
        let name = file && file.name;
        if (as || !name) { const r = await E.form({ title: 'Guardar como', fields: [{ k: 'n', label: 'Nombre del archivo', value: name || 'documento.txt' }, { k: 'f', label: 'Carpeta', type: 'select', value: (file && file.folder) || 'documents', options: [['documents', 'Documentos'], ['downloads', 'Descargas'], ['images', 'Imágenes'], ['music', 'Música']] }] }); if (!r) return; name = r.n; file = { name, folder: r.f }; }
        const blob = new Blob([T.value], { type: E.fileType({ name, type: '' }) || 'text/plain' });
        if (file.id && !as) { const f = await E.vault.get(file.id); if (f) { f.blob = blob; f.size = blob.size; f.date = Date.now(); f.name = name; await E.vault.put(f); } else file.id = await E.vaultSave(name, blob, file.folder); }
        else file.id = await E.vaultSave(name, blob, file.folder || 'documents');
        if (file.legacy) { file.legacy.text = T.value; E.fsSave(); }
        dirty = false; title(); toast('Guardado: ', name); if (E.renderExplorer) E.renderExplorer();
      }
      async function openPicker() {
        const all = (await E.vaultAll()).filter(f => /^text\/|json|xml|javascript|markdown|csv/.test(E.fileType(f)) || /\.(txt|md|csv|json|html?|js|css|xml|log)$/i.test(f.name));
        const r = await E.form({ title: 'Abrir archivo de texto', fields: [{ k: 'id', label: 'Archivo', type: 'select', options: all.length ? all.map(f => [f.id, f.name + ' (' + f.folder + ')']) : [['', '(no hay archivos de texto)']] }] });
        if (r && r.id) { const f = all.find(x => x.id === r.id); api.open({ id: f.id, name: f.name, folder: f.folder, text: await f.blob.text() }); }
      }
      b.addEventListener('click', e => {
        const a = e.target.closest('[data-a]'); if (!a) return;
        ({ new: () => { file = null; T.value = ''; dirty = false; title(); }, open: openPicker, save: () => save(false), saveas: () => save(true), dl: () => E.download(file ? file.name : 'documento.txt', new Blob([T.value], { type: 'text/plain' })),
          rep: () => { const f = $in(b, '[data-find]').value; if (!f) return; const n = T.value.split(f).length - 1; T.value = T.value.split(f).join($in(b, '[data-rep]').value); dirty = true; title(); toast(n + ' reemplazos'); } }[a.dataset.a])();
      });
      $in(b, '[data-find]').onkeydown = e => { if (e.key === 'Enter') { const i = T.value.toLowerCase().indexOf(e.target.value.toLowerCase(), T.selectionEnd); const j = i < 0 ? T.value.toLowerCase().indexOf(e.target.value.toLowerCase()) : i; if (j >= 0) { T.focus(); T.setSelectionRange(j, j + e.target.value.length); } } };
      W.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(false); } });
      const api = { open(f) { file = f; T.value = f.text || ''; dirty = false; title(); T.focus(); } };
      npApi = api; title();
    }
  });
  E.openText = f => { E.openWindow('notepad'); npApi && npApi.open(f); };
  // Abrir archivos de Archivos con la app adecuada
  E.openFileHook = async f => {
    const t = E.fileType(f);
    if (/^text\/(plain|markdown|csv|css|javascript|xml)|json/.test(t) || /\.(txt|md|csv|json|js|css|xml|log)$/i.test(f.name)) { E.openText({ id: f.id, name: f.name, folder: f.folder, text: await f.blob.text() }); return true; }
    if (/^image\//.test(t) && E.viewImage) { E.viewImage(f.id); return true; }
    if (/^video\//.test(t) && E.playVideo) { E.playVideo(f); return true; }
    return false;
  };

  /* ============ PRESENTACIONES ============ */
  const THEMES = { aurora: ['#0f172a', '#312e81', '#e0e7ff'], sol: ['#fff7ed', '#fed7aa', '#7c2d12'], bosque: ['#052e16', '#166534', '#dcfce7'], papel: ['#ffffff', '#f1f5f9', '#0f172a'], rosa: ['#500724', '#be185d', '#fce7f3'] };
  R({
    id: 'slides', name: 'Presentaciones', icon: '📽️', cat: 'Productividad', grad: ['#c2410c', '#fb923c'], w: 900, h: 560, pad: false,
    desc: 'Crea diapositivas y preséntalas a pantalla completa.', kw: 'diapositivas powerpoint exposicion',
    features: ['Temas de color', 'Modo presentación con teclado', 'Exportar como página HTML'],
    init(b) {
      let deck = storage.get('slides_deck', null) || { theme: 'aurora', slides: [{ t: 'Mi presentación', s: 'Subtítulo o autor', body: '' }, { t: 'Puntos clave', s: '', body: '- Primera idea\n- Segunda idea\n- Conclusión' }] }, cur = 0;
      b.innerHTML = `<div class="ap-split"><aside class="ap-side"><div class="ap-row"><button class="btn-primary" data-a="add">＋ Diapositiva</button></div><div class="ap-list sl-thumbs" data-list></div></aside><main class="ap-main"><div class="ap-toolbar"><select class="input-text" data-theme style="width:130px">${Object.keys(THEMES).map(k => `<option value="${k}">${k[0].toUpperCase() + k.slice(1)}</option>`).join('')}</select><button class="btn-secondary" data-a="up">↑</button><button class="btn-secondary" data-a="down">↓</button><button class="btn-secondary" data-a="del">🗑</button><button class="btn-secondary" data-a="export">Exportar HTML</button><button class="btn-primary" data-a="play">▶ Presentar</button></div>
        <div class="sl-edit"><input class="input-text" data-t placeholder="Título"><input class="input-text" data-s placeholder="Subtítulo"><textarea class="input-text" data-body rows="6" placeholder="Contenido (- viñetas, **negrita**)"></textarea><div class="sl-stage" data-stage></div></div></main></div>`;
      const save = () => storage.set('slides_deck', deck);
      const slideHtml = (s, th, big) => { const c = THEMES[th] || THEMES.aurora; return `<div class="sl-slide${big ? ' big' : ''}" style="background:linear-gradient(135deg,${c[0]},${c[1]});color:${c[2]}"><h1>${esc(s.t)}</h1>${s.s ? `<h3>${esc(s.s)}</h3>` : ''}<div class="md">${E.md(s.body)}</div></div>`; };
      function draw() {
        $in(b, '[data-list]').innerHTML = deck.slides.map((s, i) => `<button class="sl-th${i === cur ? ' on' : ''}" data-i="${i}"><span>${i + 1}</span>${slideHtml(s, deck.theme)}</button>`).join('');
        const s = deck.slides[cur]; $in(b, '[data-t]').value = s.t; $in(b, '[data-s]').value = s.s; $in(b, '[data-body]').value = s.body; $in(b, '[data-theme]').value = deck.theme;
        $in(b, '[data-stage]').innerHTML = slideHtml(s, deck.theme);
      }
      const edit = () => { const s = deck.slides[cur]; s.t = $in(b, '[data-t]').value; s.s = $in(b, '[data-s]').value; s.body = $in(b, '[data-body]').value; save(); $in(b, '[data-stage]').innerHTML = slideHtml(s, deck.theme); const th = $in(b, `[data-i="${cur}"]`); if (th) th.innerHTML = `<span>${cur + 1}</span>` + slideHtml(s, deck.theme); };
      ['[data-t]', '[data-s]', '[data-body]'].forEach(q => $in(b, q).oninput = edit);
      $in(b, '[data-theme]').onchange = e => { deck.theme = e.target.value; save(); draw(); };
      function present() {
        let i = cur; const ov = document.createElement('div'); ov.className = 'sl-present';
        const show = () => { ov.innerHTML = slideHtml(deck.slides[i], deck.theme, true) + `<div class="sl-pnav">${i + 1} / ${deck.slides.length} · ←/→ · Esc</div>`; };
        const key = e => { if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(e.key)) i = Math.min(deck.slides.length - 1, i + 1); else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) i = Math.max(0, i - 1); else if (e.key === 'Escape') return end(); else return; e.preventDefault(); show(); };
        const end = () => { document.removeEventListener('keydown', key, true); ov.remove(); try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* ignorar */ } };
        ov.onclick = e => { if (e.clientX < innerWidth / 3) i = Math.max(0, i - 1); else i = Math.min(deck.slides.length - 1, i + 1); show(); };
        document.addEventListener('keydown', key, true); document.body.appendChild(ov); show();
        try { ov.requestFullscreen && ov.requestFullscreen().catch(() => {}); } catch { /* ignorar */ }
        ov.addEventListener('dblclick', end);
      }
      b.addEventListener('click', e => {
        const t = e.target.closest('[data-i]'); if (t) { cur = +t.dataset.i; draw(); return; }
        const a = e.target.closest('[data-a]'); if (!a) return;
        const S = deck.slides;
        ({ add: () => { S.splice(cur + 1, 0, { t: 'Nueva diapositiva', s: '', body: '- ' }); cur++; },
          del: () => { if (S.length > 1) { S.splice(cur, 1); cur = Math.max(0, cur - 1); } },
          up: () => { if (cur > 0) { [S[cur - 1], S[cur]] = [S[cur], S[cur - 1]]; cur--; } },
          down: () => { if (cur < S.length - 1) { [S[cur + 1], S[cur]] = [S[cur], S[cur + 1]]; cur++; } },
          play: present,
          export: () => { const html = `<!doctype html><meta charset="utf-8"><title>${esc(S[0].t)}</title><style>body{margin:0;font-family:system-ui;background:#000}.sl-slide{width:100vw;height:100vh;display:flex;flex-direction:column;justify-content:center;padding:6vw;box-sizing:border-box;page-break-after:always}h1{font-size:5vw;margin:0}h3{font-size:2.6vw;opacity:.8}.md{font-size:2.4vw}</style>${S.map(s => slideHtml(s, deck.theme)).join('')}`; E.saveToFiles((S[0].t || 'presentacion').replace(/[\\/:*?"<>|]/g, '_') + '.html', new Blob([html], { type: 'text/html' })); } }[a.dataset.a])();
        save(); draw();
      });
      draw();
    }
  });

  /* ============ TABLA PERIÓDICA ============ */
  const PT = 'H Hidrógeno 1.008 nm|He Helio 4.0026 ng|Li Litio 6.94 am|Be Berilio 9.0122 ae|B Boro 10.81 md|C Carbono 12.011 nm|N Nitrógeno 14.007 nm|O Oxígeno 15.999 nm|F Flúor 18.998 hg|Ne Neón 20.180 ng|Na Sodio 22.990 am|Mg Magnesio 24.305 ae|Al Aluminio 26.982 pt|Si Silicio 28.085 md|P Fósforo 30.974 nm|S Azufre 32.06 nm|Cl Cloro 35.45 hg|Ar Argón 39.948 ng|K Potasio 39.098 am|Ca Calcio 40.078 ae|Sc Escandio 44.956 tm|Ti Titanio 47.867 tm|V Vanadio 50.942 tm|Cr Cromo 51.996 tm|Mn Manganeso 54.938 tm|Fe Hierro 55.845 tm|Co Cobalto 58.933 tm|Ni Níquel 58.693 tm|Cu Cobre 63.546 tm|Zn Zinc 65.38 tm|Ga Galio 69.723 pt|Ge Germanio 72.630 md|As Arsénico 74.922 md|Se Selenio 78.971 nm|Br Bromo 79.904 hg|Kr Kriptón 83.798 ng|Rb Rubidio 85.468 am|Sr Estroncio 87.62 ae|Y Itrio 88.906 tm|Zr Circonio 91.224 tm|Nb Niobio 92.906 tm|Mo Molibdeno 95.95 tm|Tc Tecnecio 98 tm|Ru Rutenio 101.07 tm|Rh Rodio 102.91 tm|Pd Paladio 106.42 tm|Ag Plata 107.87 tm|Cd Cadmio 112.41 tm|In Indio 114.82 pt|Sn Estaño 118.71 pt|Sb Antimonio 121.76 md|Te Telurio 127.60 md|I Yodo 126.90 hg|Xe Xenón 131.29 ng|Cs Cesio 132.91 am|Ba Bario 137.33 ae|La Lantano 138.91 ln|Ce Cerio 140.12 ln|Pr Praseodimio 140.91 ln|Nd Neodimio 144.24 ln|Pm Prometio 145 ln|Sm Samario 150.36 ln|Eu Europio 151.96 ln|Gd Gadolinio 157.25 ln|Tb Terbio 158.93 ln|Dy Disprosio 162.50 ln|Ho Holmio 164.93 ln|Er Erbio 167.26 ln|Tm Tulio 168.93 ln|Yb Iterbio 173.05 ln|Lu Lutecio 174.97 ln|Hf Hafnio 178.49 tm|Ta Tantalio 180.95 tm|W Wolframio 183.84 tm|Re Renio 186.21 tm|Os Osmio 190.23 tm|Ir Iridio 192.22 tm|Pt Platino 195.08 tm|Au Oro 196.97 tm|Hg Mercurio 200.59 tm|Tl Talio 204.38 pt|Pb Plomo 207.2 pt|Bi Bismuto 208.98 pt|Po Polonio 209 pt|At Astato 210 hg|Rn Radón 222 ng|Fr Francio 223 am|Ra Radio 226 ae|Ac Actinio 227 ac|Th Torio 232.04 ac|Pa Protactinio 231.04 ac|U Uranio 238.03 ac|Np Neptunio 237 ac|Pu Plutonio 244 ac|Am Americio 243 ac|Cm Curio 247 ac|Bk Berkelio 247 ac|Cf Californio 251 ac|Es Einstenio 252 ac|Fm Fermio 257 ac|Md Mendelevio 258 ac|No Nobelio 259 ac|Lr Lawrencio 266 ac|Rf Rutherfordio 267 tm|Db Dubnio 268 tm|Sg Seaborgio 269 tm|Bh Bohrio 270 tm|Hs Hasio 277 tm|Mt Meitnerio 278 tm|Ds Darmstatio 281 tm|Rg Roentgenio 282 tm|Cn Copernicio 285 tm|Nh Nihonio 286 pt|Fl Flerovio 289 pt|Mc Moscovio 290 pt|Lv Livermorio 293 pt|Ts Teneso 294 hg|Og Oganesón 294 ng';
  const PCAT = { am: ['Metal alcalino', '#f87171'], ae: ['Alcalinotérreo', '#fb923c'], tm: ['Metal de transición', '#facc15'], pt: ['Metal del bloque p', '#4ade80'], md: ['Metaloide', '#2dd4bf'], nm: ['No metal', '#60a5fa'], hg: ['Halógeno', '#a78bfa'], ng: ['Gas noble', '#f472b6'], ln: ['Lantánido', '#fdba74'], ac: ['Actínido', '#fca5a5'] };
  const ELEMENTS = PT.split('|').map((x, i) => { const [s, n, m, c] = x.split(' '), z = i + 1; let p, g;
    if (z <= 2) { p = 1; g = z === 1 ? 1 : 18; } else if (z <= 10) { p = 2; g = z <= 4 ? z - 2 : z + 8; } else if (z <= 18) { p = 3; g = z <= 12 ? z - 10 : z; }
    else if (z <= 36) { p = 4; g = z - 18; } else if (z <= 54) { p = 5; g = z - 36; }
    else if (z <= 86) { p = 6; g = z <= 56 ? z - 54 : z <= 71 ? null : z - 68; } else { p = 7; g = z <= 88 ? z - 86 : z <= 103 ? null : z - 100; }
    const row = g === null ? (p === 6 ? 9 : 10) : p, col = g === null ? (z - (p === 6 ? 57 : 89)) + 3 : g;
    return { z, s, n, m, c, p, g, row, col }; });
  const config = z => { const ORD = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p'], CAP = { s: 2, p: 6, d: 10, f: 14 }; let left = z; const o = []; for (const sh of ORD) { if (left <= 0) break; const n = Math.min(CAP[sh[1]], left); o.push(sh + '<sup>' + n + '</sup>'); left -= n; } return o.join(' '); };
  R({
    id: 'periodic', name: 'Tabla periódica', icon: '⚛️', cat: 'Educación', grad: ['#7c3aed', '#22d3ee'], w: 1000, h: 600,
    desc: 'Los 118 elementos con masa, categoría y configuración electrónica.', kw: 'quimica elementos atomos',
    features: ['118 elementos interactivos', 'Filtro por categoría y búsqueda', 'Modo quiz de símbolos'],
    init(b) {
      b.innerHTML = `<div class="ap-toolbar"><input class="input-text" data-q placeholder="Buscar elemento, símbolo o número" style="flex:1"><button class="btn-secondary" data-quiz>🎯 Quiz</button></div><div class="pt-legend">${Object.entries(PCAT).map(([k, [l, c]]) => `<button data-cat="${k}"><i style="background:${c}"></i>${l}</button>`).join('')}</div><div class="pt-wrap"><div class="pt-grid" data-grid>${ELEMENTS.map(e => `<button class="pt-el" data-z="${e.z}" style="grid-row:${e.row};grid-column:${e.col};--c:${PCAT[e.c][1]}"><small>${e.z}</small><b>${e.s}</b><span>${e.n}</span></button>`).join('')}<div class="pt-info" data-info style="grid-row:1/4;grid-column:3/13"></div></div></div>`;
      const info = e => { $in(b, '[data-info]').innerHTML = `<div class="pt-card" style="--c:${PCAT[e.c][1]}"><div class="pt-sym"><small>${e.z}</small><b>${e.s}</b></div><div><h3>${e.n}</h3><p>${PCAT[e.c][0]} · Periodo ${e.p}${e.g ? ' · Grupo ' + e.g : ''}</p><p>Masa atómica: <b>${e.m}</b> u</p><p>Configuración (Aufbau, aprox.): ${config(e.z)}</p><a href="#" data-external-url="https://es.wikipedia.org/wiki/${encodeURIComponent(e.n)}">Leer en Wikipedia ↗</a></div></div>`; };
      info(ELEMENTS[0]);
      let quiz = null;
      b.addEventListener('click', e => {
        const el = e.target.closest('[data-z]');
        if (el) { const x = ELEMENTS[el.dataset.z - 1]; if (quiz) { const ok = x.z === quiz.z; el.classList.add(ok ? 'ok' : 'bad'); setTimeout(() => el.classList.remove('ok', 'bad'), 700); if (ok) { quiz.score++; ask(); } else quiz.miss++; return; } info(x); }
        const c = e.target.closest('[data-cat]'); if (c) { const on = !c.classList.contains('on'); $$in(b, '[data-cat]').forEach(x => x.classList.remove('on')); c.classList.toggle('on', on); $$in(b, '.pt-el').forEach(x => x.classList.toggle('dim', on && ELEMENTS[x.dataset.z - 1].c !== c.dataset.cat)); }
        if (e.target.closest('[data-quiz]')) { quiz = quiz ? null : { score: 0, miss: 0 }; e.target.textContent = quiz ? '✖ Salir del quiz' : '🎯 Quiz'; if (quiz) ask(); else info(ELEMENTS[0]); }
      });
      function ask() { quiz.z = 1 + Math.floor(Math.random() * 54); const x = ELEMENTS[quiz.z - 1]; $in(b, '[data-info]').innerHTML = `<div class="pt-card"><div><h3>🎯 ¿Dónde está el ${x.n}?</h3><p>Toca su casilla en la tabla.</p><p>Aciertos: <b>${quiz.score}</b> · Fallos: ${quiz.miss}</p></div></div>`; }
      $in(b, '[data-q]').oninput = e => { const q = e.target.value.trim().toLowerCase(); $$in(b, '.pt-el').forEach(x => { const el = ELEMENTS[x.dataset.z - 1]; const m = !q || el.n.toLowerCase().includes(q) || el.s.toLowerCase() === q || String(el.z) === q; x.classList.toggle('dim', !m); }); const f = q && ELEMENTS.find(el => el.s.toLowerCase() === q || el.n.toLowerCase().startsWith(q) || String(el.z) === q); if (f) info(f); };
    }
  });

  /* ============ GRAFICADORA ============ */
  R({
    id: 'grapher', name: 'Graficadora', icon: '📈', cat: 'Educación', grad: ['#1d4ed8', '#a855f7'], w: 860, h: 560, pad: false,
    desc: 'Grafica funciones f(x), con zoom, desplazamiento y tabla.', kw: 'funciones matematicas grafica plot',
    features: ['Hasta 4 funciones a la vez', 'Zoom y arrastre', 'Coordenadas al pasar el cursor y tabla de valores'],
    init(b) {
      const COLS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'];
      let fx = storage.get('graph_fx', ['sin(x)', 'x^2/4', '', '']), view = { cx: 0, cy: 0, sc: 40 };
      b.innerHTML = `<div class="gr"><aside class="ap-side">${fx.map((f, i) => `<label class="gr-f"><i style="background:${COLS[i]}"></i>f${i + 1}(x)=<input class="input-text" data-f="${i}" value="${esc(f)}" placeholder="p. ej. 2x+1"></label>`).join('')}<small class="eis-muted">Usa x, + - * / ^, sin cos tan sqrt ln log abs, pi, e</small><div class="ap-row"><button class="btn-secondary" data-z="1.25">＋</button><button class="btn-secondary" data-z="0.8">－</button><button class="btn-secondary" data-z="0">Centrar</button><button class="btn-secondary" data-png>PNG</button></div><div data-err class="gr-err"></div><table class="gr-tab" data-tab></table></aside><div class="gr-canvas"><canvas></canvas><div class="gr-pos" data-pos></div></div></div>`;
      const cv = $in(b, 'canvas'), ctx = cv.getContext('2d');
      let fns = [];
      const compile = () => { const errs = []; fns = fx.map((s, i) => { if (!s.trim()) return null; try { return E.math.compile(s); } catch (e) { errs.push(`f${i + 1}: ${e.message}`); return null; } }); $in(b, '[data-err]').textContent = errs.join(' · '); table(); };
      const table = () => { const xs = [-3, -2, -1, 0, 1, 2, 3]; $in(b, '[data-tab]').innerHTML = `<tr><th>x</th>${fns.map((f, i) => f ? `<th style="color:${COLS[i]}">f${i + 1}</th>` : '').join('')}</tr>` + xs.map(x => `<tr><td>${x}</td>${fns.map(f => f ? `<td>${(v => Number.isFinite(v) ? +v.toFixed(3) : '—')(f(x))}</td>` : '').join('')}</tr>`).join(''); };
      function draw() {
        const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return; const dpr = window.devicePixelRatio || 1;
        if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; } ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const dark = document.documentElement.dataset.theme !== 'light';
        ctx.fillStyle = dark ? '#0f1320' : '#fff'; ctx.fillRect(0, 0, W, H);
        const X = x => W / 2 + (x - view.cx) * view.sc, Y = y => H / 2 - (y - view.cy) * view.sc;
        let step = 1; while (step * view.sc < 40) step *= 2; while (step * view.sc > 120) step /= 2;
        ctx.lineWidth = 1; ctx.font = '11px system-ui'; ctx.fillStyle = dark ? '#8892a8' : '#64748b';
        const x0 = view.cx - W / 2 / view.sc, x1 = view.cx + W / 2 / view.sc, y0 = view.cy - H / 2 / view.sc, y1 = view.cy + H / 2 / view.sc;
        ctx.strokeStyle = dark ? '#1e2638' : '#e2e8f0';
        for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) { ctx.beginPath(); ctx.moveTo(X(x), 0); ctx.lineTo(X(x), H); ctx.stroke(); if (Math.abs(x) > 1e-9) ctx.fillText(+x.toFixed(4), X(x) + 2, Math.min(H - 4, Math.max(12, Y(0) + 12))); }
        for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) { ctx.beginPath(); ctx.moveTo(0, Y(y)); ctx.lineTo(W, Y(y)); ctx.stroke(); if (Math.abs(y) > 1e-9) ctx.fillText(+y.toFixed(4), Math.min(W - 30, Math.max(2, X(0) + 4)), Y(y) - 2); }
        ctx.strokeStyle = dark ? '#94a3b8' : '#334155'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), H); ctx.stroke();
        fns.forEach((f, i) => { if (!f) return; ctx.strokeStyle = COLS[i]; ctx.lineWidth = 2.2; ctx.beginPath(); let pen = false, py = 0;
          for (let px = 0; px <= W; px++) { const x = view.cx + (px - W / 2) / view.sc; let y; try { y = f(x); } catch { y = NaN; } const sy = Y(y);
            if (!Number.isFinite(y) || (pen && Math.abs(sy - py) > H)) { pen = false; continue; } if (pen) ctx.lineTo(px, sy); else ctx.moveTo(px, sy); pen = true; py = sy; }
          ctx.stroke(); });
      }
      $$in(b, '[data-f]').forEach(inp => inp.oninput = () => { fx[+inp.dataset.f] = inp.value; storage.set('graph_fx', fx); compile(); draw(); });
      b.addEventListener('click', e => { const z = e.target.closest('[data-z]'); if (z) { if (+z.dataset.z) view.sc *= +z.dataset.z; else view = { cx: 0, cy: 0, sc: 40 }; draw(); } if (e.target.closest('[data-png]')) cv.toBlob(bl => E.saveToFiles('grafica.png', bl, 'images')); });
      let drag = null;
      cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy }; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', e => {
        const r = cv.getBoundingClientRect(), x = view.cx + (e.clientX - r.left - r.width / 2) / view.sc;
        $in(b, '[data-pos]').innerHTML = `x = ${x.toFixed(3)}` + fns.map((f, i) => f ? ` · <span style="color:${COLS[i]}">f${i + 1} = ${(v => Number.isFinite(v) ? v.toFixed(3) : '—')(f(x))}</span>` : '').join('');
        if (drag) { view.cx = drag.cx - (e.clientX - drag.x) / view.sc; view.cy = drag.cy + (e.clientY - drag.y) / view.sc; draw(); }
      });
      cv.addEventListener('pointerup', () => drag = null);
      cv.addEventListener('wheel', e => { e.preventDefault(); view.sc *= e.deltaY < 0 ? 1.12 : 0.89; view.sc = Math.max(.5, Math.min(5000, view.sc)); draw(); }, { passive: false });
      new ResizeObserver(draw).observe(cv);
      compile(); draw();
    }
  });

  /* ============ TARJETAS DE ESTUDIO ============ */
  R({
    id: 'flashcards', name: 'Tarjetas de estudio', icon: '🃏', cat: 'Educación', grad: ['#9333ea', '#f0abfc'], w: 720, h: 520,
    desc: 'Mazos de tarjetas con repaso espaciado (sistema Leitner).', kw: 'estudiar memorizar examen',
    features: ['Crea mazos y tarjetas', 'Repaso espaciado por cajas', 'Importa desde texto (pregunta;respuesta)'],
    init(b) {
      let decks = storage.get('flash', null) || [{ id: E.uid(), name: 'Capitales de América', cards: [['México', 'Ciudad de México'], ['Argentina', 'Buenos Aires'], ['Colombia', 'Bogotá'], ['Perú', 'Lima'], ['Chile', 'Santiago'], ['Canadá', 'Ottawa'], ['Brasil', 'Brasilia'], ['Uruguay', 'Montevideo']].map(([q, a]) => ({ q, a, box: 0 })) }];
      let deck = null, card = null, flipped = false;
      const save = () => storage.set('flash', decks);
      function home() {
        deck = null;
        b.innerHTML = `<div class="ap-toolbar"><b style="flex:1">Mis mazos</b><button class="btn-primary" data-a="new">＋ Mazo</button></div><div class="fc-decks">${decks.map(d => `<div class="ap-card fc-deck"><b>${esc(d.name)}</b><span class="eis-muted">${d.cards.length} tarjetas · dominadas ${d.cards.filter(c => c.box >= 3).length}</span><div class="ap-row"><button class="btn-primary" data-study="${d.id}">Estudiar</button><button class="btn-secondary" data-edit="${d.id}">Editar</button><button class="btn-secondary" data-deld="${d.id}">🗑</button></div></div>`).join('') || '<p class="ap-empty">Crea tu primer mazo</p>'}</div>`;
      }
      function pick() { const pool = deck.cards.slice().sort((x, y) => x.box - y.box || Math.random() - .5); const min = pool[0] ? pool[0].box : 0; const lows = pool.filter(c => c.box <= min + 1); return lows[Math.floor(Math.random() * lows.length)]; }
      function study() {
        if (!deck.cards.length) { toast('El mazo está vacío'); return edit(); }
        card = pick(); flipped = false;
        b.innerHTML = `<div class="ap-toolbar"><button class="btn-secondary" data-a="home">‹ Mazos</button><b style="flex:1">${esc(deck.name)}</b><span class="eis-muted">Caja ${card.box + 1}/5</span></div><div class="fc-stage"><button class="fc-card" data-a="flip"><div class="fc-in"><div class="fc-front">${esc(card.q)}</div><div class="fc-back">${esc(card.a)}</div></div></button><div class="ap-row ap-center" data-ans hidden><button class="btn-secondary" data-a="bad">🔁 Repasar</button><button class="btn-primary" data-a="good">✅ Lo sé</button></div><p class="eis-muted ap-center">Toca la tarjeta para girarla</p></div>`;
      }
      function edit() {
        b.innerHTML = `<div class="ap-toolbar"><button class="btn-secondary" data-a="home">‹ Mazos</button><input class="input-text" data-name value="${esc(deck.name)}" style="flex:1"><button class="btn-secondary" data-a="import">Importar texto</button></div><form class="ap-row" data-add style="padding:0 0 10px"><input class="input-text" data-q placeholder="Pregunta" required style="flex:1"><input class="input-text" data-ans2 placeholder="Respuesta" required style="flex:1"><button class="btn-primary">Añadir</button></form><div class="ap-col">${deck.cards.map((c, i) => `<div class="ap-card ap-row"><span style="flex:1"><b>${esc(c.q)}</b> → ${esc(c.a)}</span><button class="ap-ico" data-delc="${i}">🗑</button></div>`).join('')}</div>`;
        $in(b, '[data-name]').oninput = e => { deck.name = e.target.value; save(); };
        $in(b, '[data-add]').onsubmit = e => { e.preventDefault(); deck.cards.push({ q: $in(b, '[data-q]').value, a: $in(b, '[data-ans2]').value, box: 0 }); save(); edit(); $in(b, '[data-q]').focus(); };
      }
      b.addEventListener('click', async e => {
        const s = e.target.closest('[data-study]'); if (s) { deck = decks.find(d => d.id === s.dataset.study); return study(); }
        const ed = e.target.closest('[data-edit]'); if (ed) { deck = decks.find(d => d.id === ed.dataset.edit); return edit(); }
        const dd = e.target.closest('[data-deld]'); if (dd) { if (await E.confirm('Eliminar mazo', '¿Eliminar este mazo?')) { decks = decks.filter(d => d.id !== dd.dataset.deld); save(); home(); } return; }
        const dc = e.target.closest('[data-delc]'); if (dc) { deck.cards.splice(+dc.dataset.delc, 1); save(); return edit(); }
        const a = e.target.closest('[data-a]'); if (!a) return;
        const k = a.dataset.a;
        if (k === 'home') home();
        if (k === 'new') { const r = await E.form({ title: 'Nuevo mazo', fields: [{ k: 'n', label: 'Nombre', value: 'Mi mazo', req: true }] }); if (r) { deck = { id: E.uid(), name: r.n, cards: [] }; decks.push(deck); save(); edit(); } }
        if (k === 'flip') { flipped = !flipped; a.classList.toggle('flip', flipped); $in(b, '[data-ans]').hidden = !flipped; }
        if (k === 'good' || k === 'bad') { card.box = k === 'good' ? Math.min(4, card.box + 1) : 0; save(); study(); }
        if (k === 'import') { const r = await E.form({ title: 'Importar tarjetas', fields: [{ k: 't', label: 'Una por línea: pregunta;respuesta', type: 'textarea', rows: 8, ph: 'Agua;H2O\nSal;NaCl' }] }); if (r) { r.t.split('\n').map(l => l.split(/;|\t/)).filter(p => p.length >= 2).forEach(([q, ...a]) => deck.cards.push({ q: q.trim(), a: a.join(';').trim(), box: 0 })); save(); edit(); } }
      });
      home();
    }
  });

  /* ============ ENCICLOPEDIA (Wikipedia) ============ */
  R({
    id: 'wiki', name: 'Enciclopedia', icon: '📚', cat: 'Educación', grad: ['#374151', '#9ca3af'], w: 900, h: 600, pad: false,
    desc: 'Busca y lee artículos de Wikipedia sin salir del sistema.', kw: 'wikipedia investigar tareas',
    features: ['Búsqueda con sugerencias', 'Lectura limpia con enlaces internos', 'Artículo aleatorio y destacado del día'],
    init(b) {
      let lang = 'es'; const back = [];
      b.innerHTML = `<div class="ap-toolbar"><button class="btn-secondary" data-a="back">‹</button><form data-f class="ap-row" style="flex:1"><input class="input-text" data-q placeholder="Buscar en Wikipedia…" list="wk-sug" style="flex:1"><datalist id="wk-sug"></datalist><button class="btn-primary">Buscar</button></form><select class="input-text" data-lang style="width:70px"><option>es</option><option>en</option><option>pt</option><option>fr</option><option>de</option></select><button class="btn-secondary" data-a="rand">🎲</button><button class="btn-secondary" data-a="today">⭐ Hoy</button><button class="btn-secondary" data-a="save" title="Guardar como nota">🗒️</button></div><div class="wk-body md" data-body></div>`;
      const body = $in(b, '[data-body]'); let curT = '';
      const api = p => fetch(`https://${lang}.wikipedia.org/w/api.php?${p}&format=json&origin=*`).then(r => r.json());
      const loading = () => body.innerHTML = '<div class="ap-empty">Cargando…</div>';
      async function search(q) {
        loading();
        try { const j = await api('action=query&list=search&srlimit=20&srsearch=' + encodeURIComponent(q)); const l = j.query.search; body.innerHTML = `<h2>Resultados para “${esc(q)}”</h2>` + (l.map(x => `<div class="ap-card"><a href="#" data-t="${esc(x.title)}"><b>${esc(x.title)}</b></a><p>${esc(x.snippet.replace(/<[^>]+>/g, ''))}…</p></div>`).join('') || '<p>Sin resultados.</p>'); }
        catch { body.innerHTML = '<p class="ap-empty">Sin conexión con Wikipedia.</p>'; }
      }
      async function open(t, push = true) {
        loading(); if (push && curT) back.push(curT); curT = t;
        try {
          const j = await api('action=parse&prop=text|displaytitle&redirects=1&disableeditsection=1&page=' + encodeURIComponent(t));
          if (j.error) { body.innerHTML = `<p>${esc(j.error.info)}</p>`; return; }
          const d = new DOMParser().parseFromString(j.parse.text['*'], 'text/html');
          d.querySelectorAll('script,style,link,.mw-editsection,.navbox,.metadata,.mbox-small,.reference,.reflist,.mw-references-wrap,.noprint,sup.reference').forEach(x => x.remove());
          d.querySelectorAll('img').forEach(i => { const s = i.getAttribute('src') || ''; if (s.startsWith('//')) i.src = 'https:' + s; i.removeAttribute('srcset'); i.loading = 'lazy'; });
          d.querySelectorAll('a').forEach(a => { const h = a.getAttribute('href') || ''; const m = h.match(/^\/wiki\/([^#?]+)/); if (m && !/^(Archivo|File|Especial|Special|Ayuda|Help|Categoría|Category|Plantilla|Template|Portal|Wikipedia):/.test(decodeURIComponent(m[1]))) { a.setAttribute('href', '#'); a.dataset.t = decodeURIComponent(m[1]).replace(/_/g, ' '); } else if (/^https?:/.test(h)) { a.setAttribute('href', '#'); a.dataset.externalUrl = h; } else { a.removeAttribute('href'); } [...a.attributes].forEach(at => { if (/^on/i.test(at.name)) a.removeAttribute(at.name); }); });
          d.querySelectorAll('*').forEach(el => [...el.attributes].forEach(at => { if (/^on/i.test(at.name) || at.name === 'style' && /expression|url\(/i.test(at.value)) el.removeAttribute(at.name); }));
          curT = j.parse.title;
          body.innerHTML = `<h1>${esc(j.parse.title)}</h1><p class="eis-muted"><a href="#" data-external-url="https://${lang}.wikipedia.org/wiki/${encodeURIComponent(j.parse.title)}">Ver en Wikipedia ↗</a> · Texto bajo licencia CC BY-SA</p>` + d.body.innerHTML;
          body.scrollTop = 0;
        } catch { body.innerHTML = '<p class="ap-empty">No se pudo cargar el artículo.</p>'; }
      }
      async function today() {
        loading(); const d = new Date();
        try { const j = await (await fetch(`https://${lang}.wikipedia.org/api/rest_v1/feed/featured/${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`)).json();
          const tfa = j.tfa, on = (j.onthisday || []).slice(0, 8), mr = (j.mostread && j.mostread.articles || []).slice(0, 8);
          body.innerHTML = (tfa ? `<div class="ap-card"><h2>⭐ Artículo destacado</h2>${tfa.thumbnail ? `<img src="${esc(tfa.thumbnail.source)}" style="max-width:200px;float:right;margin:0 0 8px 12px;border-radius:10px">` : ''}<a href="#" data-t="${esc(tfa.title)}"><b>${esc(tfa.normalizedtitle || tfa.title)}</b></a><p>${esc(tfa.extract || '')}</p></div>` : '') +
            (on.length ? `<div class="ap-card"><h2>📆 Tal día como hoy</h2>${on.map(x => `<p><b>${x.year}</b>: ${esc(x.text)}</p>`).join('')}</div>` : '') +
            (mr.length ? `<div class="ap-card"><h2>🔥 Lo más leído</h2>${mr.map(x => `<p><a href="#" data-t="${esc(x.title)}">${esc(x.normalizedtitle || x.title)}</a> — ${esc(x.description || '')}</p>`).join('')}</div>` : '') || '<p class="ap-empty">No hay contenido destacado para este idioma.</p>';
        } catch { body.innerHTML = '<p class="ap-empty">Sin conexión con Wikipedia.</p>'; }
      }
      $in(b, '[data-f]').onsubmit = e => { e.preventDefault(); const q = $in(b, '[data-q]').value.trim(); if (q) search(q); };
      let st; $in(b, '[data-q]').oninput = e => { clearTimeout(st); const q = e.target.value.trim(); if (q.length < 2) return; st = setTimeout(async () => { try { const j = await (await fetch(`https://${lang}.wikipedia.org/w/api.php?action=opensearch&limit=8&format=json&origin=*&search=${encodeURIComponent(q)}`)).json(); $in(b, '#wk-sug').innerHTML = j[1].map(x => `<option value="${esc(x)}">`).join(''); } catch { /* ignorar */ } }, 250); };
      $in(b, '[data-lang]').onchange = e => { lang = e.target.value; today(); };
      b.addEventListener('click', async e => {
        const t = e.target.closest('[data-t]'); if (t) { e.preventDefault(); open(t.dataset.t); return; }
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'back' && back.length) open(back.pop(), false);
        if (a.dataset.a === 'today') today();
        if (a.dataset.a === 'rand') { try { const j = await api('action=query&list=random&rnnamespace=0&rnlimit=1'); open(j.query.random[0].title); } catch { toast('Sin conexión'); } }
        if (a.dataset.a === 'save' && curT) { E.addNote(curT, body.innerText.slice(0, 20000) + `\n\nFuente: https://${lang}.wikipedia.org/wiki/${encodeURIComponent(curT)}`); toast('Guardado en Notas'); }
      });
      E.wikiOpen = (q) => { $in(b, '[data-q]').value = q; search(q); };
      today();
    },
    onArg(q) { if (E.wikiOpen) E.wikiOpen(q); }
  });

  /* ============ LABORATORIO DE FÍSICA ============ */
  R({
    id: 'physics', name: 'Laboratorio de física', icon: '🧲', cat: 'Educación', grad: ['#0369a1', '#7dd3fc'], w: 860, h: 560, pad: false,
    desc: 'Simula tiro parabólico y péndulo con datos calculados.', kw: 'fisica simulador proyectil pendulo',
    features: ['Tiro parabólico con alcance y altura máxima', 'Péndulo con periodo y amortiguamiento', 'Gravedad de la Tierra, Luna o Marte'],
    init(b) {
      b.innerHTML = `<div class="ph"><aside class="ap-side"><div class="ap-tabs"><button data-s="proj" class="on">🎯 Proyectil</button><button data-s="pend">🕰 Péndulo</button></div>
        <label>Gravedad <select class="input-text" data-g><option value="9.81">Tierra (9.81)</option><option value="1.62">Luna (1.62)</option><option value="3.71">Marte (3.71)</option><option value="24.79">Júpiter (24.79)</option></select></label>
        <div data-pp><label>Velocidad: <b data-vv>25</b> m/s<input type="range" min="5" max="60" value="25" data-v></label><label>Ángulo: <b data-av>45</b>°<input type="range" min="5" max="85" value="45" data-a></label><label>Altura inicial: <b data-hv>0</b> m<input type="range" min="0" max="40" value="0" data-h></label></div>
        <div data-pd hidden><label>Longitud: <b data-lv>2</b> m<input type="range" min="0.5" max="5" step="0.1" value="2" data-l></label><label>Ángulo inicial: <b data-tv>30</b>°<input type="range" min="5" max="80" value="30" data-t></label><label>Amortiguamiento: <b data-dv>0</b><input type="range" min="0" max="0.5" step="0.01" value="0" data-d></label></div>
        <button class="btn-primary" data-go>▶ Lanzar / Reiniciar</button><div class="ap-card" data-out></div></aside><div class="gr-canvas"><canvas></canvas></div></div>`;
      const cv = $in(b, 'canvas'), ctx = cv.getContext('2d'); let sim = 'proj', raf = 0, t0 = 0, trail = [];
      const val = q => +$in(b, q).value, g = () => val('[data-g]');
      const labels = () => { [['v', 'vv'], ['a', 'av'], ['h', 'hv'], ['l', 'lv'], ['t', 'tv'], ['d', 'dv']].forEach(([i, o]) => $in(b, `[data-${o}]`).textContent = $in(b, `[data-${i}]`).value); out(); };
      function out() {
        if (sim === 'proj') { const v = val('[data-v]'), a = val('[data-a]') * Math.PI / 180, h = val('[data-h]'), G = g(), vy = v * Math.sin(a), vx = v * Math.cos(a), T = (vy + Math.sqrt(vy * vy + 2 * G * h)) / G;
          $in(b, '[data-out]').innerHTML = `Tiempo de vuelo: <b>${T.toFixed(2)} s</b><br>Alcance: <b>${(vx * T).toFixed(2)} m</b><br>Altura máxima: <b>${(h + vy * vy / (2 * G)).toFixed(2)} m</b>`; }
        else { const L = val('[data-l]'); $in(b, '[data-out]').innerHTML = `Periodo (pequeñas osc.): <b>${(2 * Math.PI * Math.sqrt(L / g())).toFixed(3)} s</b><br>Frecuencia: <b>${(1 / (2 * Math.PI * Math.sqrt(L / g()))).toFixed(3)} Hz</b>`; }
      }
      function size() { const W = cv.clientWidth, H = cv.clientHeight; if (cv.width !== W) { cv.width = W; cv.height = H; } return [W, H]; }
      let pend = { th: 0, w: 0 };
      function frame(ts) {
        if (!b.closest('.window').classList.contains('open')) { raf = 0; return; }
        const [W, H] = size(), dark = document.documentElement.dataset.theme !== 'light';
        ctx.fillStyle = dark ? '#0b1020' : '#f8fafc'; ctx.fillRect(0, 0, W, H);
        const t = (ts - t0) / 1000;
        if (sim === 'proj') {
          const v = val('[data-v]'), a = val('[data-a]') * Math.PI / 180, h0 = val('[data-h]'), G = g(), vy = v * Math.sin(a), vx = v * Math.cos(a), T = (vy + Math.sqrt(vy * vy + 2 * G * h0)) / G;
          const R2 = vx * T, Hm = h0 + vy * vy / (2 * G), sc = Math.min((W - 60) / Math.max(R2, 1), (H - 60) / Math.max(Hm, 1));
          const P = (x, y) => [30 + x * sc, H - 30 - y * sc];
          ctx.strokeStyle = dark ? '#334155' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, H - 30); ctx.lineTo(W, H - 30); ctx.stroke();
          const tt = Math.min(t, T), x = vx * tt, y = h0 + vy * tt - G * tt * tt / 2;
          trail.push(P(x, y)); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.beginPath(); trail.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke();
          const [px, py] = P(x, y); ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(px, py, 8, 0, 7); ctx.fill();
          ctx.fillStyle = dark ? '#e2e8f0' : '#0f172a'; ctx.font = '13px system-ui'; ctx.fillText(`t=${tt.toFixed(2)} s  x=${x.toFixed(1)} m  y=${Math.max(0, y).toFixed(1)} m`, 12, 20);
          if (t < T) raf = requestAnimationFrame(frame); else raf = 0;
        } else {
          const L = val('[data-l]'), G = g(), d = val('[data-d]'), dt = 1 / 60;
          for (let i = 0; i < 4; i++) { const acc = -G / L * Math.sin(pend.th) - d * pend.w; pend.w += acc * dt / 4; pend.th += pend.w * dt / 4; }
          const ox = W / 2, oy = 40, sc = (H - 100) / 5, bx = ox + Math.sin(pend.th) * L * sc, by = oy + Math.cos(pend.th) * L * sc;
          ctx.strokeStyle = dark ? '#94a3b8' : '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox - 60, oy); ctx.lineTo(ox + 60, oy); ctx.moveTo(ox, oy); ctx.lineTo(bx, by); ctx.stroke();
          ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(bx, by, 14, 0, 7); ctx.fill();
          ctx.fillStyle = dark ? '#e2e8f0' : '#0f172a'; ctx.font = '13px system-ui'; ctx.fillText(`θ=${(pend.th * 180 / Math.PI).toFixed(1)}°  ω=${pend.w.toFixed(2)} rad/s  t=${t.toFixed(1)} s`, 12, 20);
          raf = requestAnimationFrame(frame);
        }
      }
      const go = () => { cancelAnimationFrame(raf); trail = []; pend = { th: val('[data-t]') * Math.PI / 180, w: 0 }; t0 = performance.now(); raf = requestAnimationFrame(frame); };
      b.addEventListener('input', () => { labels(); if (sim === 'pend') return; });
      b.addEventListener('click', e => { const s = e.target.closest('[data-s]'); if (s) { sim = s.dataset.s; $$in(b, '[data-s]').forEach(x => x.classList.toggle('on', x === s)); $in(b, '[data-pp]').hidden = sim !== 'proj'; $in(b, '[data-pd]').hidden = sim !== 'pend'; labels(); go(); } if (e.target.closest('[data-go]')) go(); });
      $in(b, '[data-g]').onchange = () => { out(); go(); };
      labels(); setTimeout(go, 100);
    },
    onOpen(b) { const g = b.querySelector('[data-go]'); if (g) setTimeout(() => g.click(), 50); }
  });

  /* ============ MECANOGRAFÍA ============ */
  const TEXTS = ['El veloz murciélago hindú comía feliz cardillo y kiwi. La cigüeña tocaba el saxofón detrás del palenque de paja.', 'La práctica constante es la clave para escribir rápido y sin errores. Mantén la vista en la pantalla y los dedos en la fila guía.', 'Los planetas giran alrededor del Sol siguiendo órbitas elípticas, tal como describió Johannes Kepler en el siglo diecisiete.', 'Alexander Fleming descubrió la penicilina en mil novecientos veintiocho al observar un hongo que impedía el crecimiento de bacterias.', 'Programar es dar instrucciones precisas a una computadora. Cada línea de código cuenta una pequeña parte de la historia.'];
  R({
    id: 'typing', name: 'Mecanografía', icon: '⌨️', cat: 'Educación', grad: ['#065f46', '#6ee7b7'], w: 760, h: 440,
    desc: 'Mejora tu velocidad de escritura (PPM y precisión).', kw: 'teclado escribir rapido',
    features: ['Mide palabras por minuto y precisión', 'Textos en español', 'Guarda tu mejor marca'],
    init(b) {
      let text = '', start = 0, errs = 0, timer;
      b.innerHTML = `<div class="ty"><div class="ap-row"><b>Mejor marca: <span data-best>${storage.get('typing_best', 0)}</span> PPM</b><span style="flex:1"></span><button class="btn-secondary" data-new>Nuevo texto</button></div><div class="ty-text" data-text></div><input class="input-text ty-in" data-in autocomplete="off" spellcheck="false" placeholder="Empieza a escribir aquí…"><div class="ty-stats"><div><b data-wpm>0</b><span>PPM</span></div><div><b data-acc>100%</b><span>Precisión</span></div><div><b data-time>0s</b><span>Tiempo</span></div></div></div>`;
      const I = $in(b, '[data-in]');
      function load() { text = TEXTS[Math.floor(Math.random() * TEXTS.length)]; start = 0; errs = 0; I.value = ''; I.disabled = false; clearInterval(timer); paint(); ['wpm', 'time'].forEach(k => $in(b, `[data-${k}]`).textContent = k === 'time' ? '0s' : '0'); $in(b, '[data-acc]').textContent = '100%'; }
      function paint() { const v = I.value; $in(b, '[data-text]').innerHTML = [...text].map((c, i) => `<span class="${i < v.length ? (v[i] === c ? 'ok' : 'bad') : i === v.length ? 'cur' : ''}">${esc(c)}</span>`).join(''); }
      function stats() { const s = (Date.now() - start) / 1000, v = I.value, ok = [...v].filter((c, i) => c === text[i]).length; $in(b, '[data-wpm]').textContent = Math.round(ok / 5 / (s / 60)) || 0; $in(b, '[data-acc]').textContent = Math.max(0, Math.round(100 * (v.length - errs) / Math.max(1, v.length))) + '%'; $in(b, '[data-time]').textContent = Math.round(s) + 's'; }
      I.oninput = e => {
        if (!start) { start = Date.now(); timer = setInterval(stats, 300); }
        const v = I.value; if (e.inputType !== 'deleteContentBackward' && v[v.length - 1] !== text[v.length - 1]) errs++;
        paint(); stats();
        if (v.length >= text.length) { clearInterval(timer); I.disabled = true; const w = +$in(b, '[data-wpm]').textContent; if (w > storage.get('typing_best', 0)) { storage.set('typing_best', w); $in(b, '[data-best]').textContent = w; E.notify('⌨️ ¡Nuevo récord!', w + ' palabras por minuto', '🏆'); } }
      };
      $in(b, '[data-new]').onclick = () => { load(); I.focus(); };
      load();
    }
  });

  /* ============ ATLAS MUNDIAL ============ */
  R({
    id: 'atlas', name: 'Atlas mundial', icon: '🗺️', cat: 'Educación', grad: ['#15803d', '#38bdf8'], w: 860, h: 560, pad: false,
    desc: 'Datos de 250 países: capital, población, banderas y quiz.', kw: 'paises capitales geografia banderas',
    features: ['Ficha de cada país con bandera', 'Filtrar por continente', 'Quiz de capitales y banderas'],
    init(b) {
      let data = [], reg = 'all', quiz = null;
      b.innerHTML = `<div class="ap-split"><aside class="ap-side"><input class="input-text" data-q placeholder="Buscar país…"><select class="input-text" data-r><option value="all">Todos los continentes</option><option value="Americas">América</option><option value="Europe">Europa</option><option value="Asia">Asia</option><option value="Africa">África</option><option value="Oceania">Oceanía</option></select><button class="btn-secondary" data-quiz>🎯 Quiz de capitales</button><div class="ap-list" data-list><p class="ap-empty">Cargando países…</p></div></aside><main class="ap-main ap-scroll" data-view></main></div>`;
      const nm = c => (c.translations && c.translations.spa && c.translations.spa.common) || c.name.common;
      function list() { const q = $in(b, '[data-q]').value.toLowerCase(); $in(b, '[data-list]').innerHTML = data.filter(c => (reg === 'all' || c.region === reg) && (!q || nm(c).toLowerCase().includes(q) || (c.capital || []).join(' ').toLowerCase().includes(q))).map(c => `<button class="ap-item ap-row" data-c="${c.cca2}"><img src="${esc(c.flags.png)}" alt="" style="width:28px;border-radius:3px"><b>${esc(nm(c))}</b></button>`).join(''); }
      function show(c) { $in(b, '[data-view]').innerHTML = `<div class="at-card"><img src="${esc(c.flags.svg || c.flags.png)}" alt="${esc(c.flags.alt || '')}"><h2>${esc(nm(c))}</h2><p class="eis-muted">${esc(c.name.official)}</p><div class="at-grid"><div><span>Capital</span><b>${esc((c.capital || ['—']).join(', '))}</b></div><div><span>Población</span><b>${(c.population || 0).toLocaleString()}</b></div><div><span>Superficie</span><b>${(c.area || 0).toLocaleString()} km²</b></div><div><span>Región</span><b>${esc(c.region)}${c.subregion ? ' · ' + esc(c.subregion) : ''}</b></div><div><span>Idiomas</span><b>${esc(Object.values(c.languages || {}).join(', ') || '—')}</b></div><div><span>Moneda</span><b>${esc(Object.values(c.currencies || {}).map(x => x.name + (x.symbol ? ' (' + x.symbol + ')' : '')).join(', ') || '—')}</b></div></div><p><a href="#" data-external-url="https://es.wikipedia.org/wiki/${encodeURIComponent(nm(c))}">Wikipedia ↗</a> · <a href="#" data-external-url="https://www.openstreetmap.org/search?query=${encodeURIComponent(c.name.common)}">Mapa ↗</a></p></div>`; }
      function ask() { const pool = data.filter(c => c.capital && c.capital[0] && (reg === 'all' || c.region === reg)); const c = pool[Math.floor(Math.random() * pool.length)]; const opts = [c]; while (opts.length < 4) { const o = pool[Math.floor(Math.random() * pool.length)]; if (!opts.includes(o)) opts.push(o); } opts.sort(() => Math.random() - .5); quiz.c = c;
        $in(b, '[data-view]').innerHTML = `<div class="at-card"><img src="${esc(c.flags.png)}" alt="" style="max-width:220px"><h2>¿Cuál es la capital de ${esc(nm(c))}?</h2><div class="at-quiz">${opts.map(o => `<button class="btn-secondary" data-ans="${o.cca2}">${esc(o.capital[0])}</button>`).join('')}</div><p>Aciertos: <b>${quiz.ok}</b> / ${quiz.n}</p></div>`; }
      b.addEventListener('click', e => {
        const c = e.target.closest('[data-c]'); if (c) { quiz = null; show(data.find(x => x.cca2 === c.dataset.c)); }
        if (e.target.closest('[data-quiz]') && data.length) { quiz = { ok: 0, n: 0 }; ask(); }
        const a = e.target.closest('[data-ans]'); if (a && quiz) { quiz.n++; const ok = a.dataset.ans === quiz.c.cca2; if (ok) quiz.ok++; a.classList.add(ok ? 'btn-primary' : 'bad'); toast(ok ? '✅ ¡Correcto!' : '❌ Era ' + quiz.c.capital[0]); setTimeout(ask, 800); }
      });
      $in(b, '[data-q]').oninput = list; $in(b, '[data-r]').onchange = e => { reg = e.target.value; list(); };
      fetch('https://restcountries.com/v3.1/all?fields=name,capital,population,region,subregion,flags,area,languages,currencies,cca2,translations').then(r => r.json()).then(j => { data = j.sort((x, y) => nm(x).localeCompare(nm(y))); list(); show(data.find(c => c.cca2 === 'MX') || data[0]); }).catch(() => { $in(b, '[data-list]').innerHTML = '<p class="ap-empty">Sin conexión: no se pudieron cargar los países.</p>'; });
    }
  });
})();

/* EISENKU OS 8 · Maestro Domingo: asistente educativo y del sistema.
   Cerebro en capas: 1) órdenes del sistema y herramientas locales (sin Internet ni claves)
                     2) IA opcional: servidor propio (/ai con clave en variable de entorno) o Puter.js (cada usuario usa su cuenta)
                     3) respaldo de conocimiento con Wikipedia */
(() => {
  'use strict';
  const E = window.EISEN, storage = E.storage, esc = E.esc, toast = E.toast;
  const AVATAR_T = `<svg viewBox="0 0 120 120" class="dm-av" role="img" aria-label="Emblema del Maestro Domingo"><defs><radialGradient id="dmg__" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#2a3a7a"/><stop offset="1" stop-color="#0b1230"/></radialGradient><linearGradient id="dmgo__" x1="0" x2="1"><stop offset="0" stop-color="#f8e7b0"/><stop offset=".5" stop-color="#d4a94a"/><stop offset="1" stop-color="#f8e7b0"/></linearGradient></defs><circle cx="60" cy="60" r="58" fill="url(#dmg__)"/><ellipse cx="60" cy="30" rx="26" ry="7" fill="none" stroke="url(#dmgo__)" stroke-width="4"/><g fill="#f1f5ff" opacity=".95"><path d="M56 62 C40 50 22 52 12 66 C26 62 36 66 44 74 C34 72 26 76 20 84 C34 78 46 80 56 74Z"/><path d="M64 62 C80 50 98 52 108 66 C94 62 84 66 76 74 C86 72 94 76 100 84 C86 78 74 80 64 74Z"/></g><path d="M60 46 L64 58 L76 60 L64 62 L60 76 L56 62 L44 60 L56 58Z" fill="url(#dmgo__)"/><circle cx="60" cy="96" r="5" fill="url(#dmgo__)"/></svg>`;
  let avN = 0; const avatar = () => { const k = 'x' + (++avN); return AVATAR_T.replace(/__/g, k); };
  Object.defineProperty(E, 'DOMINGO_AVATAR', { get: avatar, configurable: true });
  const cfg = () => Object.assign({ provider: 'auto', speak: false, tutor: true, model: '' }, storage.get('dom_cfg', {}));
  const setCfg = o => storage.set('dom_cfg', Object.assign(cfg(), o));
  let serverAI = null; // null = sin comprobar
  fetch('/ai?ping=1').then(r => r.ok ? r.json() : null).then(j => { serverAI = !!(j && j.ok); }).catch(() => { serverAI = false; });

  /* ---------- Herramientas locales ---------- */
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const COLORS = { azul: '#2563eb', rojo: '#dc2626', verde: '#16a34a', morado: '#7c3aed', violeta: '#7c3aed', rosa: '#db2777', naranja: '#ea580c', amarillo: '#ca8a04', dorado: '#d4a94a', cian: '#0891b2', turquesa: '#0d9488', gris: '#64748b' };
  const LANG = { ingles: 'en', espanol: 'es', portugues: 'pt', frances: 'fr', aleman: 'de', italiano: 'it', japones: 'ja', coreano: 'ko', chino: 'zh', ruso: 'ru', arabe: 'ar' };
  function solveEq(src) {
    const [l, r] = src.split('='); if (r === undefined) return null;
    const f = E.math.compile(`(${l})-(${r})`); const a0 = f(0), a1 = f(1), a2 = f(2), a3 = f(-1);
    const d2 = a2 - 2 * a1 + a0;
    if (Math.abs(d2) < 1e-9) { const m = a1 - a0; if (Math.abs(m) < 1e-12) return Math.abs(a0) < 1e-9 ? 'La igualdad se cumple para cualquier x (identidad).' : 'No tiene solución.'; const x = -a0 / m; return `**Ecuación lineal.** Pasamos todo a un lado: (${l}) − (${r}) = 0, que equivale a ${+m.toFixed(6)}·x + (${+a0.toFixed(6)}) = 0.\nDespejamos: x = −(${+a0.toFixed(6)}) / ${+m.toFixed(6)}\n\n**x = ${+x.toFixed(6)}**\n\nComprobación: al sustituir, ambos lados valen ${+E.math.eval(l, x).toFixed(6)}.`; }
    const A = d2 / 2, B = a1 - a0 - A, C = a0; if (Math.abs(f(3) - (9 * A + 3 * B + C)) > 1e-6 || Math.abs(a3 - (A - B + C)) > 1e-6) return null;
    const D = B * B - 4 * A * C, fx = v => +v.toFixed(6);
    const sg = (v, t) => v === 0 ? '' : ` ${v < 0 ? '−' : '+'} ${Math.abs(fx(v)) === 1 && t ? '' : Math.abs(fx(v))}${t}`;
    let out = `**Ecuación cuadrática:** ${fx(A) === 1 ? '' : fx(A) === -1 ? '−' : fx(A)}x²${sg(B, 'x')}${sg(C, '')} = 0\nDiscriminante Δ = b² − 4ac = ${fx(D)}\n`;
    if (D < 0) return out + `Como Δ < 0, no hay soluciones reales. Soluciones complejas: x = ${fx(-B / (2 * A))} ± ${fx(Math.sqrt(-D) / (2 * A))}i`;
    const x1 = (-B + Math.sqrt(D)) / (2 * A), x2 = (-B - Math.sqrt(D)) / (2 * A);
    return out + `Fórmula general: x = (−b ± √Δ) / 2a\n\n**x₁ = ${fx(x1)}**${D > 0 ? `   **x₂ = ${fx(x2)}**` : ' (raíz doble)'}`;
  }
  async function wikiSummary(q) {
    const L = (window.EISEN_I18N && window.EISEN_I18N.lang) || 'es';
    const s = await (await fetch(`https://${L}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=1&format=json&origin=*`)).json();
    const t = s.query && s.query.search[0] && s.query.search[0].title; if (!t) return null;
    const j = await (await fetch(`https://${L}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`)).json();
    return j.extract ? { title: j.title, text: j.extract, url: j.content_urls && j.content_urls.desktop.page } : null;
  }
  const appList = () => E.apps().filter(a => E.isInstalled(a.id) || a.game);
  function findApp(name) {
    const n = norm(name).replace(/^(la|el|los|las|app|aplicacion|programa|juego)\s+/, '').replace(/\s+(app|aplicacion)$/, '');
    if (!n) return null;
    const L = E.apps(), by = f => L.find(a => f(norm(a.name), a));
    return by((x, a) => a.id === n) || by(x => x === n) || by(x => x.startsWith(n)) || by(x => x.includes(n)) || by((x, a) => norm(a.kw || '').includes(n)) || by((x, a) => norm(a.desc || '').includes(n));
  }
  // Acciones autorizadas (las usa el modo local y la IA mediante etiquetas [[accion:...]])
  const ACT = {
    abrir: id => { const a = findApp(id) || E.apps().find(x => x.id === id); if (!a) return `No encontré la app “${id}”.`; E.launch(a.id); return `Abriendo **${a.name}**.`; },
    jugar: id => { const g = (E.GAMES || []).find(x => norm(x.name).includes(norm(id)) || x.id === id); if (!g) return `No encontré el juego “${id}”.`; E.playGame(g.id); return `¡A jugar **${g.name}**! ${g.how || ''}`; },
    entorno: v => { if (!E.setEnv) return 'El cambio de entorno no está disponible.'; E.setEnv(/lin/.test(v) ? 'linux' : 'windows'); return `Entorno cambiado a **${/lin/.test(v) ? 'Linux' : 'Windows'}**. Tus archivos y apps siguen intactos.`; },
    tema: v => { const t = /clar|light/.test(v) ? 'light' : /medi|oled|midnight/.test(v) ? 'midnight' : 'dark'; const s = document.getElementById('cfg-theme'); s.value = t; s.dispatchEvent(new Event('change')); return `Tema cambiado a **${{ light: 'claro', dark: 'oscuro', midnight: 'medianoche' }[t]}**.`; },
    acento: v => { const c = /^#[0-9a-f]{6}$/i.test(v) ? v : COLORS[norm(v)]; if (!c) return 'No reconozco ese color.'; const s = document.getElementById('cfg-accent'); s.value = c; s.dispatchEvent(new Event('input')); return `Color de acento cambiado a ${v}.`; },
    buscar: v => { E.ebOpenUrl(v, true); return `Buscando “${v}” en el navegador.`; },
    nota: v => { const [t, ...b] = v.split('|'); E.addNote(t.trim().slice(0, 60) || 'Nota', (b.join('|') || t).trim()); return `Nota **${t.trim().slice(0, 60)}** guardada en Notas.`; },
    tarea: v => { const [t, d] = v.split('|'); E.addTask(t.trim(), (d || '').trim()); return `Tarea añadida: **${t.trim()}**${d ? ' para el ' + d.trim() : ''}.`; },
    carpeta: v => { if (!E.desktopNewFolder) return 'No disponible.'; E.desktopNewFolder(v || 'Nueva carpeta'); return `Carpeta **${v}** creada en el escritorio.`; },
    tienda: v => { E.storeSearch(v); return `Te muestro “${v}” en EISEN Store.`; },
    fondo: v => { if (E.nextWallpaper) { E.nextWallpaper(v); return 'Fondo de pantalla cambiado.'; } return 'No disponible.'; },
    wiki: v => { E.launch('wiki', v); return `Abriendo la Enciclopedia: “${v}”.`; }
  };
  const FAQ = [
    [/(como|donde).*(carpeta)/, 'Haz clic derecho en el escritorio → **Nueva carpeta**. Arrastra iconos de apps encima para guardarlas dentro. También puedes decirme: “crea una carpeta llamada Tareas”.'],
    [/(como|donde).*(fondo|wallpaper)/, 'Clic derecho en el escritorio → **Cambiar fondo**, o en **Configuración › Personalización**. Puedes subir una imagen, pegar una URL o arrastrar una imagen al escritorio.'],
    [/(como|donde).*(linux|windows|entorno)/, 'Ve a **Configuración › Entorno** y elige Windows o Linux, o dime “cambia a modo Linux”. Tus archivos, apps y ajustes se comparten entre ambos.'],
    [/(como|donde).*(instal|desinstal|tienda|store)/, 'Abre **EISEN Store**: elige una app y pulsa **Instalar**, **Abrir** o **Desinstalar**. En “Añadir app” puedes agregar cualquier web con su icono.'],
    [/(como|donde).*(acceso directo)/, 'Clic derecho en el escritorio → **Nuevo acceso directo**, o en la ficha de la Tienda pulsa **🖥 Al escritorio**.'],
    [/(como|donde).*(ia|inteligencia|clave|api)/, 'Puedo usar IA de dos formas sin exponer claves: 1) **Servidor propio** — define AI_API_KEY en el servidor (INICIAR.bat, Cloudflare o Netlify); 2) **Puter.js** — cada usuario inicia sesión con su cuenta gratuita de Puter. Configúralo en el ⚙️ de esta ventana.']
  ];
  async function local(text) {
    const t = norm(text); let m;
    // PRIME 11: comandos de otros módulos (transferir, descargar, modo fácil, plugins…); el primero que responde gana
    for (const h of (E.domingoHooks || [])) { try { const r = await h(text, t); if (r) return r; } catch (e) { console.error('[Domingo] gancho', e); } }
    if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey)\b/.test(t) && t.length < 25) return `¡Hola! Soy el **Maestro Domingo**. Puedo explicarte temas, resolver ecuaciones, abrir apps, crear notas y tareas, consultar el clima o traducir. ¿Por dónde empezamos?`;
    if (/^(ayuda|que puedes hacer|comandos|que sabes hacer)/.test(t)) return HELP;
    if ((m = t.match(/^(?:abre|abrir|abreme|inicia|iniciar|ejecuta|lanza|muestrame|pon|entra a)\s+(?:la |el |mi |los |las )?(.+)/)) && !/(alarma|temporizador|musica de|tema|fondo|modo)/.test(m[1])) {
      const g = (E.GAMES || []).find(x => norm(x.name) === m[1] || norm(x.name).includes(m[1])); if (g && !findApp(m[1])) return ACT.jugar(g.id);
      return ACT.abrir(m[1]);
    }
    if ((m = t.match(/^(?:juega|jugar|quiero jugar|vamos a jugar)\s+(?:a |al )?(.+)/))) return ACT.jugar(m[1]);
    if ((m = t.match(/^(?:cierra|cerrar)\s+(?:la |el )?(.+)/))) { const a = findApp(m[1]); const w = a && document.getElementById('win-' + a.id); if (w && w.classList.contains('open')) { w.querySelector('[data-act=close]').click(); return `Cerré **${a.name}**.`; } return 'Esa app no está abierta.'; }
    if (/(modo|entorno|escritorio|cambia(r)? a)\s*(linux|windows)/.test(t)) return ACT.entorno(t.includes('linux') ? 'linux' : 'windows');
    if ((m = t.match(/tema\s+(claro|oscuro|medianoche|oled)/)) || (m = t.match(/modo\s+(claro|oscuro)/))) return ACT.tema(m[1]);
    if ((m = t.match(/(?:color|acento)\s+(?:de acento\s+)?(?:a\s+|en\s+)?(#[0-9a-f]{6}|\w+)/)) && (COLORS[m[1]] || m[1].startsWith('#'))) return ACT.acento(m[1]);
    if (/(cambia|otro|siguiente|nuevo).*(fondo|wallpaper)/.test(t)) return ACT.fondo('');
    if ((m = text.match(/(?:crea|crear|haz|nueva)\s+(?:una\s+)?carpeta(?:\s+(?:llamada|que se llame|con el nombre))?\s*(.*)/i))) return ACT.carpeta((m[1] || 'Nueva carpeta').replace(/^["“]|["”]$/g, '').trim() || 'Nueva carpeta');
    if ((m = text.match(/^(?:crea|crear|anota|apunta|guarda)\s+(?:una\s+)?nota[:\s]+(.+)/i))) return ACT.nota(m[1].slice(0, 40) + '|' + m[1]);
    if ((m = text.match(/^(?:recu[eé]rdame|añade (?:una )?tarea|agrega (?:una )?tarea|nueva tarea|tengo que)[:\s]+(.+)/i))) {
      let task = m[1], due = ''; const d = new Date();
      if (/\bmañana\b/i.test(task)) { d.setDate(d.getDate() + 1); due = d.toISOString().slice(0, 10); task = task.replace(/\s*(para\s+)?mañana\b/i, ''); }
      else if (/\bhoy\b/i.test(task)) { due = d.toISOString().slice(0, 10); task = task.replace(/\s*(para\s+)?hoy\b/i, ''); }
      return ACT.tarea(task + '|' + due);
    }
    if ((m = t.match(/(?:alarma|despiertame|despertador).*?(\d{1,2})(?::|\s*y\s*)?(\d{2})?\s*(am|pm|de la manana|de la tarde|de la noche)?/))) {
      let h = +m[1], mi = +(m[2] || 0); if (/(pm|tarde|noche)/.test(m[3] || '') && h < 12) h += 12; if (/(am|manana)/.test(m[3] || '') && h === 12) h = 0;
      const hm = `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`; const l = storage.get('alarms', []); l.push({ id: E.uid(), h: hm, l: 'Alarma de Domingo', on: true, days: [] }); storage.set('alarms', l); return `⏰ Alarma programada a las **${hm}**. La verás en Reloj y alarmas.`;
    }
    if ((m = t.match(/temporizador\s+(?:de\s+)?(\d+)\s*(segundos?|minutos?|horas?|s|min|h)/))) {
      const n = +m[1], ms = n * (/^h/.test(m[2]) ? 3600000 : /^s/.test(m[2]) ? 1000 : 60000); setTimeout(() => { E.notify('⏳ Temporizador de Domingo', `Pasaron ${n} ${m[2]}`, '⏳', 15000); E.beep && E.beep(5); }, ms); return `⏳ Temporizador de **${n} ${m[2]}** en marcha. Te avisaré con una notificación.`;
    }
    if (/^(que hora|dime la hora|hora actual)/.test(t)) return `Son las **${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}**.`;
    if (/^(que dia|que fecha|fecha de hoy|dia de hoy)/.test(t)) return `Hoy es **${new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}**.`;
    if ((m = t.match(/(?:clima|tiempo|temperatura).*?(?:en|de)\s+([a-zñ\s]+)$/)) || /(que tiempo hace|como esta el clima|clima de hoy)/.test(t)) {
      try { let loc = storage.get('weather_loc', null); if (m && m[1]) { const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=es&name=${encodeURIComponent(m[1].trim())}`)).json(); const r = g.results && g.results[0]; if (r) loc = { name: r.name + ', ' + r.country, lat: r.latitude, lon: r.longitude }; }
        if (!loc) return 'Dime una ciudad, por ejemplo: “¿qué tiempo hace en Monterrey?”.';
        const j = await E.weatherNow(loc), c = j.current, d = j.daily, w = E.wmo(c.weather_code);
        return `${w[0]} En **${loc.name}**: ${Math.round(c.temperature_2m)}°C, ${w[1].toLowerCase()}. Sensación ${Math.round(c.apparent_temperature)}°, humedad ${c.relative_humidity_2m}%. Hoy: máx ${Math.round(d.temperature_2m_max[0])}° / mín ${Math.round(d.temperature_2m_min[0])}°, lluvia ${d.precipitation_probability_max[0] ?? 0}%.`;
      } catch { return 'No pude consultar el clima ahora (¿sin conexión?).'; }
    }
    if ((m = text.match(/^traduce[:\s]+(.+?)\s+(?:al|a)\s+(\w+)\s*$/i)) || (m = text.match(/^(?:como se dice|cómo se dice)\s+(.+?)\s+en\s+(\w+)\??$/i))) {
      const to = LANG[norm(m[2])] || norm(m[2]).slice(0, 2); try { return `🔤 **${await E.translate(m[1].replace(/^["“]|["”]$/g, ''), to === 'es' ? 'en' : 'es', to)}**`; } catch { return 'No pude traducir ahora.'; }
    }
    if ((m = text.match(/^(?:resuelve|despeja|resolver)\s*:?\s*(.+=.+)$/i)) || (m = text.match(/^([\dx\s+\-*/^().,²]+=[\dx\s+\-*/^().,²]+)$/i))) {
      try { const r = solveEq(m[1].replace(/²/g, '^2').replace(/(\d)\s*x/g, '$1*x')); if (r) return r; } catch { /* no es ecuación válida */ }
    }
    if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*%\s*de\s*(\d+(?:[.,]\d+)?)/))) { const p = parseFloat(m[1].replace(',', '.')), n = parseFloat(m[2].replace(',', '.')); return `🧮 ${p}% de ${n} = **${+(p * n / 100).toPrecision(12)}**`; }
    if ((m = text.match(/^(?:calcula|cuanto es|cuánto es|cuanto da|cuánto da)\s*:?\s*(.+?)\??$/i)) || (m = text.match(/^([\d\s+\-*/^().,%πe]+|.*(?:sqrt|sin|cos|tan|log|ln)\(.*)$/i))) {
      try { const v = E.math.eval(m[1].replace(/x/g, '*').replace(/raiz de|raíz de/gi, 'sqrt')); if (Number.isFinite(v)) return `🧮 ${esc(m[1])} = **${+v.toPrecision(12)}**`; } catch { /* no es operación */ }
    }
    if ((m = t.match(/^(?:busca|buscar|googlea|investiga)\s+(?:en internet\s+|en la web\s+|en google\s+)?(.+)/))) return ACT.buscar(m[1]);
    if ((m = t.match(/^(?:instala|instalar)\s+(.+)/))) { const a = findApp(m[1]); if (a) { E.setInstalled(a.id, true); return `**${a.name}** instalada. Ya aparece en el menú.`; } return ACT.tienda(m[1]); }
    for (const [re, ans] of FAQ) if (re.test(t)) return ans;
    return null;
  }
  const HELP = `Esto es lo que puedo hacer:\n- 📚 **Explicar** cualquier tema (“explícame la fotosíntesis”, “¿quién fue Kepler?”)\n- 🧮 **Matemáticas**: “calcula 15% de 80”, “resuelve 2x+3=11”, “resuelve x^2-5x+6=0”\n- 🚀 **Abrir apps y juegos**: “abre la calculadora”, “juega Bloques”\n- 🗒️ **Organizar**: “crea una nota: …”, “recuérdame estudiar mañana”, “pon una alarma a las 7:30”, “temporizador de 10 minutos”\n- ⚙️ **Sistema**: “cambia a modo Linux”, “tema claro”, “color de acento morado”, “crea una carpeta llamada Tareas”, “cambia el fondo”\n- 🌐 **Internet**: “¿qué tiempo hace en Puebla?”, “traduce buenos días al inglés”, “busca recetas de mole”`;

  /* ---------- IA ---------- */
  function systemPrompt() {
    const apps = appList().filter(a => !a.web && !a.user).map(a => `${a.id}=${a.name}`).join(', ');
    return `Eres el Maestro Domingo, el asistente de EISENKU OS (un sistema operativo web con entornos Windows y Linux). Personalidad: mentor sereno, elegante y amable; hablas en el idioma del usuario (por defecto español), con claridad y ejemplos. ${cfg().tutor ? 'Modo tutor activo: explica paso a paso, comprueba la comprensión con una pregunta breve al final y no hagas la tarea completa por el alumno si parece un examen; guía su razonamiento.' : ''}
Puedes ejecutar acciones del sistema incluyendo etiquetas exactas en tu respuesta (se ocultan al usuario): [[abrir:ID]], [[jugar:ID]], [[entorno:linux|windows]], [[tema:claro|oscuro|medianoche]], [[acento:#hex]], [[buscar:texto]], [[nota:título|contenido]], [[tarea:texto|AAAA-MM-DD]], [[carpeta:nombre]], [[tienda:texto]], [[wiki:tema]]. Úsalas solo cuando el usuario lo pida o claramente le ayude.
Apps disponibles: ${apps}. Juegos: ${(E.GAMES || []).map(g => g.id + '=' + g.name).join(', ')}.
Fecha actual: ${new Date().toLocaleString()}. Responde con Markdown simple (negritas, listas). Sé conciso salvo que pidan detalle.`;
  }
  let puterP = null;
  const loadPuter = () => puterP || (puterP = new Promise((res, rej) => { if (window.puter) return res(window.puter); const s = document.createElement('script'); s.src = 'https://js.puter.com/v2/'; s.onload = () => res(window.puter); s.onerror = () => { puterP = null; rej(new Error('No se pudo cargar Puter.js')); }; document.head.appendChild(s); }));
  async function ai(history) {
    const c = cfg(), msgs = [{ role: 'system', content: systemPrompt() }, ...history.slice(-16).map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.t }))];
    const useServer = c.provider === 'server' || (c.provider === 'auto' && serverAI);
    if (useServer) {
      const r = await fetch('/ai', { method: 'POST', headers: { 'content-type': 'application/json', 'x-eisen-access': String(cfg().access || '') }, body: JSON.stringify({ messages: msgs }) }); // 9.0: código de acceso opcional del servidor
      const j = await r.json().catch(() => ({})); if (!r.ok || !j.text) throw new Error(j.error || 'El servidor de IA no respondió'); return { text: j.text, via: 'Servidor EISEN' };
    }
    if (c.provider === 'puter') {
      const p = await loadPuter(); const r = await p.ai.chat(msgs, { model: c.model || undefined });
      const t = typeof r === 'string' ? r : r && r.message ? (typeof r.message.content === 'string' ? r.message.content : (r.message.content || []).map(x => x.text || '').join('')) : r && r.text ? r.text : String(r || '');
      if (!t) throw new Error('Respuesta vacía de Puter'); return { text: t, via: 'Puter · ' + (c.model || 'predeterminado') };
    }
    return null;
  }
  function runActions(text) {
    const done = [];
    const clean = text.replace(/\[\[(\w+):([^\]]*)\]\]/g, (m, k, v) => { const key = norm(k); if (ACT[key]) { try { done.push(ACT[key](v.trim())); } catch { /* acción fallida */ } } return ''; });
    return { clean: clean.trim(), done };
  }

  /* ---------- Interfaz ---------- */
  E.registerApp({
    id: 'assistant', name: 'Maestro Domingo', icon: '✦', cat: 'Sistema', grad: ['#0b1230', '#d4a94a'], w: 520, h: 640, pad: false,
    desc: 'Asistente inteligente: explica, resuelve, organiza y controla EISENKU.', kw: 'asistente ia chat ayuda tutor domingo',
    features: ['Funciona sin Internet para órdenes del sistema y matemáticas', 'IA opcional sin claves expuestas (servidor propio o Puter.js)', 'Modo tutor paso a paso y lectura en voz alta'],
    init(b) {
      let hist = storage.get('dom_chat', []);
      b.innerHTML = `<div class="dm"><header class="dm-head">${avatar()}<div><b>Maestro Domingo</b><small data-st>Listo para ayudarte</small></div><button class="ap-ico" data-cfg title="Ajustes del asistente">⚙️</button><button class="ap-ico" data-clear title="Nueva conversación">🧹</button></header>
        <div class="dm-cfg" data-cfgp hidden><label>Motor de IA <select class="input-text" data-prov><option value="auto">Automático (servidor propio si existe; si no, local)</option><option value="server">Servidor propio (/ai)</option><option value="puter">Puter.js (tu cuenta gratuita de Puter)</option><option value="local">Solo local (sin IA en la nube)</option></select></label><label data-modelw>Modelo de Puter <input class="input-text" data-model placeholder="(vacío = modelo predeterminado de Puter)"></label><label>Código de acceso del servidor (solo si el administrador lo configuró) <input class="input-text" type="password" data-access autocomplete="off" placeholder="AI_ACCESS_CODE"></label><label class="ap-check-l"><input type="checkbox" data-tutor> Modo tutor (explicaciones paso a paso)</label><label class="ap-check-l"><input type="checkbox" data-speak> Leer respuestas en voz alta</label><p class="eis-muted" data-srv></p></div>
        <div class="dm-log" data-log></div><div class="dm-chips" data-chips>${['¿Qué puedes hacer?', 'Explícame la fotosíntesis', 'Resuelve 2x+3=11', 'Abre la calculadora', 'Cambia a modo Linux', '¿Qué tiempo hace en Guadalajara?'].map(c => `<button>${c}</button>`).join('')}</div>
        <form class="dm-in" data-f><button type="button" class="ap-ico" data-mic title="Hablar">🎤</button><textarea data-t rows="1" placeholder="Pregúntale algo a Domingo…"></textarea><button class="btn-primary" data-send>➤</button></form></div>`;
      const L = b.querySelector('[data-log]'), T = b.querySelector('[data-t]'), ST = b.querySelector('[data-st]');
      const md = t => E.md ? E.md(t) : esc(t);
      const bubble = (m, anim) => { const d = document.createElement('div'); d.className = 'dm-msg ' + (m.r === 'u' ? 'me' : 'bot') + (anim ? ' in' : ''); d.innerHTML = (m.r === 'u' ? '' : `<span class="dm-mini">${avatar()}</span>`) + `<div class="dm-bub md">${m.r === 'u' ? esc(m.t).replace(/\n/g, '<br>') : md(m.t)}${m.via ? `<small>${esc(m.via)}</small>` : ''}</div>`; L.appendChild(d); L.scrollTop = L.scrollHeight; return d; };
      const greet = () => { L.innerHTML = ''; bubble({ r: 'b', t: 'Bienvenido. Soy el **Maestro Domingo**, tu guía en EISENKU OS. Pregúntame lo que quieras aprender o pídeme que haga algo por ti. Escribe **ayuda** para ver ejemplos.' }); };
      if (hist.length) hist.forEach(m => bubble(m)); else greet();
      const save = () => storage.set('dom_chat', hist.slice(-40));
      const say = t => { if (!cfg().speak || !window.speechSynthesis) return; const u = new SpeechSynthesisUtterance(t.replace(/[*#_`>\[\]]/g, '').slice(0, 1200)); u.lang = 'es-MX'; u.rate = 1.02; speechSynthesis.cancel(); speechSynthesis.speak(u); };
      async function send(text) {
        text = text.trim(); if (!text) return; T.value = ''; T.style.height = '';
        const um = { r: 'u', t: text }; hist.push(um); bubble(um, true); save();
        const typing = bubble({ r: 'b', t: '…' }, true); typing.classList.add('typing'); ST.textContent = 'Pensando…';
        let reply = null, via = '';
        try { reply = await local(text); if (reply) via = 'Local'; } catch (e) { console.error(e); }
        if (!reply && cfg().provider !== 'local') { try { const r = await ai(hist); if (r) { const x = runActions(r.text); reply = x.clean + (x.done.length ? '\n\n' + x.done.map(d => '✓ ' + d).join('\n') : ''); via = r.via; } } catch (e) { via = 'Local'; reply = null; ST.textContent = 'IA no disponible: ' + e.message; } }
        if (!reply) {
          const topic = text.replace(/^(que es|qué es|quien fue|quién fue|quien es|quién es|explicame|explícame|hablame de|háblame de|define|que son|qué son|como funciona|cómo funciona)\s+(el |la |los |las |un |una )?/i, '').replace(/[?¿!¡.]/g, '').trim();
          try { const w = await wikiSummary(topic); if (w) { reply = `📚 **${w.title}**\n\n${w.text}\n\n[Leer más en Wikipedia](${w.url})${cfg().provider === 'local' || !serverAI ? '\n\n*Respuesta de la enciclopedia. Activa una IA en ⚙️ para conversaciones más completas.*' : ''}`; via = 'Wikipedia'; } } catch { /* sin conexión */ }
        }
        if (!reply) { reply = 'No tengo una respuesta para eso sin conexión a una IA. Puedes activarla en ⚙️ (servidor propio o Puter.js), o probar con: **ayuda**.'; via = 'Local'; }
        typing.remove(); const bm = { r: 'b', t: reply, via }; hist.push(bm); bubble(bm, true); save(); say(reply);
        if (!/^IA no disponible/.test(ST.textContent)) ST.textContent = 'Listo para ayudarte';
      }
      b.querySelector('[data-f]').onsubmit = e => { e.preventDefault(); send(T.value); };
      T.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(T.value); } };
      T.oninput = () => { T.style.height = ''; T.style.height = Math.min(140, T.scrollHeight) + 'px'; };
      b.querySelector('[data-chips]').onclick = e => { const c = e.target.closest('button'); if (c) send(c.textContent); };
      b.querySelector('[data-clear]').onclick = () => { hist = []; save(); greet(); };
      const P = b.querySelector('[data-cfgp]');
      const syncCfg = () => { const c = cfg(); b.querySelector('[data-prov]').value = c.provider; b.querySelector('[data-tutor]').checked = c.tutor; b.querySelector('[data-speak]').checked = c.speak; b.querySelector('[data-model]').value = c.model; b.querySelector('[data-access]').value = c.access || ''; b.querySelector('[data-modelw]').hidden = c.provider !== 'puter'; b.querySelector('[data-srv]').textContent = serverAI ? '✅ Servidor de IA de EISEN detectado (la clave está guardada en el servidor, no en el navegador).' : 'ℹ️ No hay servidor de IA configurado. Puedes usar Puter.js (se pedirá iniciar sesión en Puter la primera vez) o el modo local + Wikipedia.'; };
      b.querySelector('[data-cfg]').onclick = () => { P.hidden = !P.hidden; syncCfg(); };
      P.addEventListener('change', e => { if (e.target.matches('[data-prov]')) setCfg({ provider: e.target.value }); if (e.target.matches('[data-tutor]')) setCfg({ tutor: e.target.checked }); if (e.target.matches('[data-speak]')) setCfg({ speak: e.target.checked }); if (e.target.matches('[data-model]')) setCfg({ model: e.target.value.trim() }); if (e.target.matches('[data-access]')) setCfg({ access: e.target.value.trim().slice(0, 200) }); syncCfg(); });
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = b.querySelector('[data-mic]');
      if (!SR) mic.hidden = true; else mic.onclick = () => { const r = new SR(); r.lang = 'es-MX'; r.interimResults = false; mic.classList.add('on'); r.onresult = ev => send(ev.results[0][0].transcript); r.onend = () => mic.classList.remove('on'); r.onerror = () => { mic.classList.remove('on'); toast('No se pudo usar el micrófono'); }; r.start(); };
      E.domingoAsk = q => { send(q); };
      setTimeout(() => T.focus(), 60);
    },
    onOpen(b) { const t = b.querySelector('[data-t]'); if (t) setTimeout(() => t.focus(), 60); }
  });
  E.domingo = q => { E.openWindow('assistant'); if (q) setTimeout(() => E.domingoAsk && E.domingoAsk(q), 80); };
  E.domingoLocal = local; // usado en pruebas
  E.domingoSolve = solveEq;
})();

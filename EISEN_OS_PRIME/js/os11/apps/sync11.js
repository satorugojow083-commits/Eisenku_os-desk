/* =====================================================================
   EISEN OS PRIME 11.0 · Transferir y sincronizar (carga diferida)
   Lleva el entorno a otra pestaña, navegador, perfil, teléfono, tableta o Xbox:
   - Paquete .eisenenv: JSON validado → gzip (CompressionStream) → AES-GCM opcional (PBKDF2 150 000).
   - Código de texto «EISEN1.<datos>.<suma>» (base64url + SHA-256 truncado).
   - QR animado en varias partes y lector que reúne las partes (cámara, BarcodeDetector o lector propio).
   - Red local: relé de un solo uso del servidor de EISEN (cifrado en el navegador; caduca en 10 min).
   - Recibir: fusión sin duplicados o reemplazo, con punto de restauración previo.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, P = K.prime, S = E.storage, esc = E.esc, tr = K.tr, I = K.icon, U = K.u10;
  const q = (r, s) => r.querySelector(s), now = () => Date.now(), caps = P.caps;
  const appOf = id => E.REG[id] || E.apps().find(a => a.id === id) || null;
  const MAGIC = [0x45, 0x45, 0x4e, 0x56];   // «EENV»
  const EXCL = /^eisen_(prime_session|prime_bootloop|prime_journal|prime_unread|os10_eventlog|os9_activity|os9_seclog|notif_log|os10_connlog|os9_last_version|os9_schema|os9_migrations|os9_skip_migr|prime_tv_setup|prime_persist_asked|prime_autosnap|os9_layout_last|prime_savemode_auto|save_mode|prime_caps_force|os10_disp_active|os9_lowpower|prime_quiet_on|eb_store)$/;
  const SECRET = /^eisen_(yt_key|sp_client|sp_token|sp_refresh|spotify\w*|dom_cfg|a9_passwords|os9_passwords|passwords\w*|a9_vault\w*)$/i;
  const LIGHT = /^eisen_(theme|accent|wp|customWallpaper|env|lang|os9_prefs|icon_size|pinned|start_pins|desk_items|installed|user_apps|os9_widgets|os9_desks|os9_desk_names|os10_(iconpack|theme_vars|themes|panels|dispcustom|tasks)|prime_(methods|wa_contacts|wa_templates|rules|plugins|reminders|registry|icons|dl_sort|bootmsg|easy|easy_prev|new)|browser_bookmarks|os9_keys|os9_app_favs|dbl_open|snap|user_name|user_avatar|os9_region|os9_hour|os9_packages|notes|tasks|events|a9_academic|flash|os9_mute|dnd|weather_loc|gamepad_cfg|os9_installed_at|os9_app_versions|os9_perms)$/;

  /* ---------- utilidades binarias ---------- */
  const b64u = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = s => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  const b64 = async blob => b64u(new Uint8Array(await blob.arrayBuffer())).replace(/-/g, '+').replace(/_/g, '/');
  const sum8 = async u8 => (await K.sha256(u8)).slice(0, 8);
  const stream = (u8, T) => new Response(new Blob([u8]).stream().pipeThrough(new T('gzip'))).arrayBuffer().then(b => new Uint8Array(b));
  const keyFrom = async (pass, salt) => crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  async function pack(obj, pass) {
    let body = new TextEncoder().encode(JSON.stringify(obj)), flags = 0, head = new Uint8Array(0);
    if ('CompressionStream' in window) { try { const z = await stream(body, CompressionStream); if (z.length < body.length) { body = z; flags |= 1; } } catch { /* sin compresión */ } }
    if (pass) { const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)); body = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFrom(pass, salt), body)); flags |= 2; head = new Uint8Array(28); head.set(salt, 0); head.set(iv, 16); }
    const out = new Uint8Array(6 + head.length + body.length); out.set(MAGIC, 0); out[4] = 1; out[5] = flags; out.set(head, 6); out.set(body, 6 + head.length); return out;
  }
  async function unpack(u8, askPass) {
    if (!u8 || u8.length < 7 || MAGIC.some((m, i) => u8[i] !== m)) throw new Error(tr('No es un paquete de entorno de EISEN'));
    if (u8[4] !== 1) throw new Error(tr('Versión de paquete no admitida'));
    const flags = u8[5]; let body;
    if (flags & 2) { const pass = await askPass(); if (!pass) throw new Error(tr('Se necesita la contraseña')); try { body = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8.slice(22, 34) }, await keyFrom(pass, u8.slice(6, 22)), u8.slice(34))); } catch { throw new Error(tr('Contraseña incorrecta o paquete dañado')); } }
    else body = u8.slice(6);
    if (flags & 1) { if (!('DecompressionStream' in window)) throw new Error(tr('Este navegador no puede descomprimir el paquete; actualízalo o usa otro navegador')); body = await stream(body, DecompressionStream); }
    if (body.length > 700 * 1048576) throw new Error(tr('Paquete demasiado grande'));
    const obj = P.safeParse(new TextDecoder().decode(body)); if (!obj) throw new Error(tr('El contenido no es válido')); return obj;
  }
  const toCode = async u8 => 'EISEN1.' + b64u(u8) + '.' + await sum8(u8);
  async function fromCode(txt) {
    const m = /EISEN1\.([A-Za-z0-9_-]+)\.([0-9a-f]{8})/.exec(String(txt).replace(/\s+/g, ''));
    if (!m) throw new Error(tr('No se encontró un código de EISEN («EISEN1.…»)'));
    const u8 = unb64u(m[1]); if (await sum8(u8) !== m[2]) throw new Error(tr('El código está incompleto o tiene errores: cópialo de nuevo'));
    return u8;
  }

  /* ---------- crear y validar paquetes (c11, x5, x8) ---------- */
  async function build(o) {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); if (!k || !/^eisen_[\w.-]{1,80}$/.test(k) || EXCL.test(k)) continue;
      if (SECRET.test(k) && !o.secrets) continue;
      if (o.scope === 'light' && !LIGHT.test(k)) continue;
      const v = localStorage.getItem(k); if (v == null) continue;
      if (o.scope === 'light' && k === 'eisen_customWallpaper' && v.length > 150000) continue;
      data[k] = v;
    }
    let files = [];
    if (o.files) { for (const f of await K.files.allRaw()) { if (!f || !f.blob || f.trash) continue; files.push({ name: f.name, type: f.type, folder: f.folder, size: f.size, date: f.date, b64: await b64(f.blob) }); } }
    const prof = K.profiles.current();
    const obj = { eisenenv: 1, app: 'EISEN OS PRIME', ver: K.version, created: new Date().toISOString(), scope: o.scope, device: P.caps.xbox ? 'Xbox' : P.caps.android ? 'Android' : P.caps.ios ? 'iOS' : P.caps.tv ? 'TV' : P.caps.touch ? 'Táctil' : 'PC', profile: { name: String(prof.name || '').slice(0, 32), avatar: String(prof.avatar || '').slice(0, 4), color: prof.color }, data, files };
    obj.sum = await K.sha256(JSON.stringify(data) + '|' + files.map(f => f.name + ':' + f.size).join(','));
    return obj;
  }
  async function validate(obj) {
    const errors = [], warn = [];
    // compatibilidad: respaldos de Configuración › Copias de seguridad (8.0/9.0/10.0)
    if (obj && obj.app === 'EISENKU OS' && obj.data && !obj.eisenenv) obj = { eisenenv: 1, app: 'EISENKU OS', ver: obj.version, created: obj.created, scope: 'full', data: obj.data, files: Array.isArray(obj.files) ? obj.files : [], legacy: true };
    if (!obj || obj.eisenenv !== 1 || !obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) return { ok: false, errors: [tr('No es un entorno de EISEN')] };
    const data = {}; let total = 0, skipped = 0;
    Object.entries(obj.data).forEach(([k, v]) => { if (!/^eisen_[\w.-]{1,80}$/.test(k) || typeof v !== 'string' || v.length > 8e6) { skipped++; return; } if (EXCL.test(k)) return; total += v.length; data[k] = v; });
    if (skipped) warn.push(skipped + ' ' + tr('elementos no válidos se ignoraron'));
    if (total > 40e6) errors.push(tr('Los datos superan 40 MB'));
    const files = (Array.isArray(obj.files) ? obj.files : []).filter(f => f && typeof f.name === 'string' && f.name.length <= 255 && typeof f.b64 === 'string' && (f.folder == null || (typeof f.folder === 'string' && f.folder.length <= 300 && !/(^|\/)\.\.(\/|$)/.test(f.folder))));
    if (files.length !== (Array.isArray(obj.files) ? obj.files.length : 0)) warn.push(tr('Algunos archivos del paquete no eran válidos y se ignoraron'));
    if (files.length > 5000) errors.push(tr('Demasiados archivos'));
    if (obj.sum && !obj.legacy) { const c = await K.sha256(JSON.stringify(obj.data) + '|' + (Array.isArray(obj.files) ? obj.files : []).map(f => f.name + ':' + f.size).join(',')); if (c !== obj.sum) warn.push(tr('La suma de control no coincide: el paquete pudo modificarse')); }
    const J = k => P.safeParse(data[k], null);
    const inst = J('eisen_installed') || {}, desk = J('eisen_desk_items') || [];
    return { ok: !errors.length, errors, warn, obj, data, files, summary: { created: obj.created, ver: obj.ver || '?', device: obj.device || '', profile: obj.profile && obj.profile.name || '', keys: Object.keys(data).length, apps: Object.values(inst).filter(Boolean).length, desk: Array.isArray(desk) ? desk.length : 0, files: files.length, size: files.reduce((n, f) => n + (+f.size || 0), 0), scope: obj.scope || 'full' } };
  }
  async function apply(v, o) {
    await K.backup.snapshot('Antes de importar un entorno (PRIME)');
    const cur = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && /^eisen_/.test(k)) cur[k] = localStorage.getItem(k); }
    let res;
    if (o.mode === 'replace') { Object.keys(cur).forEach(k => { if (!EXCL.test(k) && !(k in v.data)) { try { localStorage.removeItem(k); } catch { /* ignorar */ } } }); res = Object.assign({}, cur, v.data); }
    else res = P.mergeEnv(cur, v.data, { look: !!o.look });
    let nk = 0; Object.entries(res).forEach(([k, val]) => { if (cur[k] === val || EXCL.test(k)) return; try { localStorage.setItem(k, val); nk++; } catch { /* sin espacio */ } });
    let nf = 0, dup = 0;
    if (v.files.length) {
      const have = new Set((await K.files.allRaw()).filter(f => !f.trash).map(f => (f.folder || '') + '/' + f.name + ':' + f.size));
      for (const f of v.files) {
        const folder = String(f.folder || 'documents').split('/').map(x => K.files.cleanName(x)).join('/');
        if (have.has(folder + '/' + f.name + ':' + f.size)) { dup++; continue; }
        try { const bin = atob(f.b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); await K.files.save(await K.files.uniqueName(folder, K.files.cleanName(f.name)), new Blob([u], { type: String(f.type || '').slice(0, 100) }), folder); nf++; } catch { /* omitir */ }
      }
    }
    await P.flush();
    K.seclog('backup', `Entorno importado (${o.mode === 'replace' ? 'reemplazo' : 'fusión'}): ${nk} ajustes, ${nf} archivos, ${dup} duplicados omitidos`);
    return { nk, nf, dup };
  }

  /* ---------- relé de la red local (c15) ---------- */
  const RA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let relayOk = null;
  const relayAvail = async () => { if (relayOk !== null) return relayOk; try { const r = await fetch('relay/ping', { cache: 'no-store' }); relayOk = r.ok && !!(await r.json()).ok; } catch { relayOk = false; } return relayOk; };
  const rndKey = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => RA[b % RA.length]).join('');
  async function relaySend(obj) { const key = rndKey(), u8 = await pack(obj, key); const r = await fetch('relay', { method: 'POST', body: u8, headers: { 'content-type': 'application/octet-stream', 'x-eisen-relay': '1' } }); const j = await r.json().catch(() => ({})); if (!r.ok || !j.id) throw new Error(j.error || tr('El relé no respondió')); return j.id + '-' + key; }
  async function relayGet(code) { const m = /^([A-Z0-9]{6})-([A-Z0-9]{6})$/.exec(String(code).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{6})(.{6})$/, '$1-$2')); if (!m) throw new Error(tr('El código tiene 12 caracteres, por ejemplo K7M2QX-9F3T1A')); const r = await fetch('relay/' + m[1], { cache: 'no-store' }); if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || tr('Código caducado o ya usado')); } return unpack(new Uint8Array(await r.arrayBuffer()), async () => m[2]); }

  /* ---------- QR en varias partes (c13, c14) ---------- */
  const CHUNK = 850;
  const qrParts = code => { const sid = Array.from(crypto.getRandomValues(new Uint8Array(3)), b => RA[b % RA.length]).join('').slice(0, 4), n = Math.ceil(code.length / CHUNK); return Array.from({ length: n }, (_, i) => `EQ1:${sid}:${i + 1}/${n}:` + code.slice(i * CHUNK, (i + 1) * CHUNK)); };
  const qrSvg = async (text) => { if (!K.qr) await K.loadScript('js/os9/qrcode.js'); return K.qr.svg(K.qr.encode(text, 'L'), { margin: 2 }); };
  async function scanner(onText, title) {
    if (!K.qrDecode) await K.loadScript('js/os10/lib/qrdecode10.js');
    return new Promise(resolve => {
      const ov = document.createElement('div'); ov.className = 'eis-modal';
      ov.innerHTML = `<div class="eis-modal-card p11-scan"><h3>${esc(title)}</h3><div class="p11-scanv"><video playsinline muted></video><i></i></div><p class="k9-small" data-st>${esc(tr('Iniciando la cámara…'))}</p><div class="eis-modal-btns"><button type="button" class="btn-secondary" data-x>${esc(tr('Cerrar'))}</button></div></div>`;
      document.body.appendChild(ov);
      const vd = q(ov, 'video'), st = q(ov, '[data-st]'); let s = null, t = 0, done = false, busy = false; const bd = 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null; const cv = document.createElement('canvas');
      const finish = v => { if (done) return; done = true; clearInterval(t); if (s) s.getTracks().forEach(x => x.stop()); ov.remove(); resolve(v); };
      q(ov, '[data-x]').onclick = () => finish(null);
      (async () => {
        try { s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } }); } catch { st.textContent = tr('No se pudo usar la cámara. Usa «QR desde imágenes» o el código de texto.'); return; }
        vd.srcObject = s; try { await vd.play(); } catch { /* ignorar */ }
        st.textContent = tr('Apunta al código QR de EISEN…');
        t = setInterval(async () => {
          if (busy || done || !vd.videoWidth) return; busy = true;
          try {
            let txt = null;
            if (bd) { const r = await bd.detect(vd); if (r[0]) txt = r[0].rawValue; }
            else { const sc = Math.min(1, 900 / Math.max(vd.videoWidth, vd.videoHeight)); cv.width = Math.round(vd.videoWidth * sc); cv.height = Math.round(vd.videoHeight * sc); const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(vd, 0, 0, cv.width, cv.height); const r = K.qrDecode(x.getImageData(0, 0, cv.width, cv.height)); if (r) txt = r.text; }
            if (txt) { const r = onText(txt); if (r && r.done) finish(r.value); else if (r && r.msg) { st.textContent = r.msg; P.rumble && P.rumble(.1, .2, 20); } }
          } catch { /* seguir */ }
          busy = false;
        }, 220);
      })();
    });
  }
  // reúne partes «EQ1:sid:i/n:datos»; acepta también un código entero o un enlace #import= / #relay=
  const collector = () => { const sets = {}; return txt => { const s = String(txt).trim(); let m = /^EQ1:([A-Z0-9]{4}):(\d+)\/(\d+):(.*)$/s.exec(s); if (m) { const [, sid, i, n, d] = m; const set = sets[sid] = sets[sid] || { n: +n, parts: {} }; set.parts[+i] = d; const got = Object.keys(set.parts).length; if (got >= set.n) return { done: true, value: Array.from({ length: set.n }, (_, k) => set.parts[k + 1]).join('') }; return { msg: tr('Partes leídas') + `: ${got}/${set.n} — ` + tr('sigue apuntando, el QR va cambiando solo') }; } if (/EISEN1\./.test(s)) return { done: true, value: s }; m = /[#&](import|relay)=([^&\s]+)/.exec(s); if (m) return { done: true, value: m[1] === 'relay' ? 'RELAY:' + m[2] : decodeURIComponent(m[2]) }; return { msg: tr('Ese QR no es de EISEN') }; }; };

  /* ============================== interfaz ============================== */
  K.define('transfer', {
    init(b, w, arg) {
      const TABS = [['export', 'Enviar mi entorno', 'upload'], ['import', 'Recibir', 'download'], ['devices', 'Otros dispositivos', 'network']];
      let tab = TABS.some(t => t[0] === arg) ? arg : 'export', cur = null, qrTimer = 0;
      b.innerHTML = `<div class="p11-app"><header class="p11-apph"><div class="p11-brand"><span class="p11-logo">🔁</span><div><b>${esc(tr('Transferir y sincronizar'))}</b><small>${esc(tr('Pestañas, navegadores, perfiles, móviles, tabletas y Xbox'))}</small></div></div><div data-tabs></div></header><main class="p11-main" data-v></main></div>`;
      const V = q(b, '[data-v]');
      const go = t => { tab = t; clearInterval(qrTimer); render(); }; w.__p11go = go;
      function render() {
        q(b, '[data-tabs]').innerHTML = U.tabs(TABS, tab, 'tab');
        if (tab === 'export') {
          V.innerHTML = `${U.note('Tu entorno incluye apps instaladas, escritorio y carpetas, anclajes, apariencia, widgets, ajustes y datos de las apps. Elige cómo llevarlo: código, QR, archivo o red local.', 'info')}
            <form class="k9-card p11-col" data-exf><div class="k9-row"><label class="k9-row"><input type="radio" name="scope" value="light" checked> <b>${esc(tr('Ligero'))}</b> <span class="k9-small k9-muted">${esc(tr('(apps, escritorio, ajustes y datos de apps; ideal para código y QR)'))}</span></label></div><div class="k9-row"><label class="k9-row"><input type="radio" name="scope" value="full"> <b>${esc(tr('Completo'))}</b> <span class="k9-small k9-muted">${esc(tr('(todo; para archivo o red local)'))}</span></label></div>
            <label class="k9-row"><input type="checkbox" name="files"> ${esc(tr('Incluir mis archivos (solo «Completo»)'))}</label><label class="k9-row"><input type="checkbox" name="secrets"> ${esc(tr('Incluir datos sensibles (claves de servicios y contraseñas guardadas)'))}</label>
            <div class="k9-row"><input class="input-text" type="password" name="pass" autocomplete="new-password" placeholder="${esc(tr('Contraseña para cifrar (opcional)'))}" style="flex:1"><input class="input-text" type="password" name="pass2" autocomplete="new-password" placeholder="${esc(tr('Repítela'))}" style="flex:1"></div>
            <div class="k9-row p11-wrap"><button class="k9-btn pri" data-ex="code">${I('copy', 14)} ${esc(tr('Código de texto'))}</button><button class="k9-btn" data-ex="qr">${I('scan', 14)} ${esc(tr('QR animado'))}</button><button class="k9-btn" data-ex="file">${I('save', 14)} ${esc(tr('Archivo .eisenenv'))}</button><button class="k9-btn" data-ex="relay" data-relaybtn hidden>${I('network', 14)} ${esc(tr('Red local'))}</button></div><p class="k9-small k9-muted" data-info></p></form><div data-out></div>`;
          relayAvail().then(ok => { const r = q(V, '[data-relaybtn]'); if (r) r.hidden = !ok; });
        }
        if (tab === 'import') {
          V.innerHTML = `<div class="k9-card p11-col"><h3 class="p11-h3">${esc(tr('Pega el código'))}</h3><textarea class="input-text" rows="4" data-code placeholder="EISEN1.…"></textarea><div class="k9-row p11-wrap"><button class="k9-btn pri" data-im="code">${esc(tr('Leer código'))}</button><button class="k9-btn" data-im="scan">${I('camera', 14)} ${esc(tr('Escanear QR'))}</button><button class="k9-btn" data-im="images">${I('image', 14)} ${esc(tr('QR desde imágenes'))}</button><button class="k9-btn" data-im="file">${I('folder', 14)} ${esc(tr('Abrir archivo .eisenenv o copia'))}</button></div></div>
            <div class="k9-card p11-col" data-relaybox hidden><h3 class="p11-h3">${esc(tr('Código de red local'))}</h3><div class="k9-row"><input class="input-text" data-rcode maxlength="13" placeholder="K7M2QX-9F3T1A" style="flex:1;text-transform:uppercase;letter-spacing:.15em;font-size:18px" autocomplete="off" spellcheck="false"><button class="k9-btn pri" data-im="relay">${esc(tr('Recibir'))}</button></div></div><div data-sum></div>`;
          relayAvail().then(ok => { const r = q(V, '[data-relaybox]'); if (r) r.hidden = !ok; });
          if (P.pendingImport) { const c = P.pendingImport; P.pendingImport = null; q(V, '[data-code]').value = c; readBytes(() => fromCode(c)); }
          if (P.pendingFile) { const f = P.pendingFile; P.pendingFile = null; readFile(f); }
          if (P.pendingRelay) { const c = P.pendingRelay; P.pendingRelay = null; readObj(() => relayGet(c)); }
        }
        if (tab === 'devices') {
          const apps = E.installedApps().filter(a => a.id !== 'deskfolder').sort((x, y) => x.name.localeCompare(y.name));
          V.innerHTML = `<div class="p11-grid2"><section class="k9-card"><h3 class="p11-h3">🗂️ ${esc(tr('Otras pestañas'))}</h3><p class="k9-small">${esc(tr('Las pestañas de EISEN del mismo navegador se sincronizan solas y en vivo.'))} <b>${P.peers.size + 1}</b> ${esc(tr('abiertas ahora'))}.</p><button class="k9-btn" data-dv="sessions">${esc(tr('Ver sesiones'))}</button></section>
            <section class="k9-card"><h3 class="p11-h3">👥 ${esc(tr('Otros perfiles (cuentas)'))}</h3><p class="k9-small">${esc(tr('Copia tu entorno a otro perfil local sin duplicar lo que ya tenga.'))}</p><button class="k9-btn" data-dv="profiles">${esc(tr('Copiar a un perfil'))}</button></section>
            <section class="k9-card"><h3 class="p11-h3">📱 ${esc(tr('Instalar EISEN como app'))}</h3><p class="k9-small">${esc(caps.pwa ? tr('Tu navegador permite instalar EISEN: tendrá su propio icono y ventana.') : caps.ios ? tr('En iPhone/iPad: botón Compartir › «Añadir a pantalla de inicio».') : caps.xbox ? tr('En Xbox: menú de Edge › «Anclar a Inicio» para abrir EISEN desde la pantalla principal.') : tr('Si tu navegador lo permite, verás «Instalar» en su barra de direcciones o en su menú.'))}</p>${caps.pwa ? `<button class="k9-btn pri" data-dv="pwa">${esc(tr('Instalar EISEN'))}</button>` : ''}</section>
            <section class="k9-card"><h3 class="p11-h3">🔗 ${esc(tr('Instalar una app en otro dispositivo'))}</h3><div class="k9-row"><select class="input-text" data-lapp style="flex:1">${apps.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select><button class="k9-btn" data-dv="applink">${esc(tr('Crear QR'))}</button></div><div data-lout></div></section>
            <section class="k9-card" data-rsec hidden><h3 class="p11-h3">📡 ${esc(tr('Enviar un archivo por la red local'))}</h3><p class="k9-small">${esc(tr('Elige un archivo de EISEN (máx. 8 MB): el otro dispositivo lo recibe con el código en Transferir › Recibir.'))}</p><button class="k9-btn" data-dv="relayfile">${esc(tr('Elegir archivo'))}</button><div data-rfout></div></section></div>`;
          relayAvail().then(ok => { const r = q(V, '[data-rsec]'); if (r) r.hidden = !ok; });
        }
      }
      const out = html => { const o = q(V, '[data-out]') || q(V, '[data-sum]'); if (o) o.innerHTML = html; };
      async function exportAs(kind) {
        const f = q(V, '[data-exf]'), scope = f.scope.value, pass = f.pass.value;
        if (pass && pass !== f.pass2.value) return E.toast(tr('Las contraseñas no coinciden'));
        if (pass && pass.length < 6) return E.toast(tr('Usa al menos 6 caracteres'));
        const info = q(V, '[data-info]'); info.textContent = tr('Preparando…');
        const obj = await build({ scope, files: scope === 'full' && f.files.checked, secrets: f.secrets.checked });
        const nk = Object.keys(obj.data).length;
        if (kind === 'relay') { try { info.textContent = tr('Enviando al relé…'); const code = await relaySend(obj); const link = location.origin + location.pathname + '#relay=' + code; out(`<div class="k9-card p11-center"><p class="k9-small">${esc(tr('En el otro dispositivo abre EISEN desde este mismo servidor y ve a Transferir › Recibir, o escanea el QR. Caduca en 10 minutos y sirve una sola vez.'))}</p><div class="p11-bigcode">${esc(code)}</div><div class="p11-qr">${await qrSvg(link)}</div><button class="k9-btn" data-copy="${esc(code)}">${esc(tr('Copiar código'))}</button></div>`); info.textContent = nk + ' ' + tr('elementos enviados de forma cifrada'); S.set('os9_last_backup', now()); } catch (e) { info.textContent = e.message; } return; }
        const u8 = await pack(obj, pass);
        info.textContent = `${nk} ${tr('elementos')} · ${obj.files.length} ${tr('archivos')} · ${K.fmt.bytes(u8.length)}${pass ? ' · 🔒 ' + tr('cifrado') : ''}`;
        S.set('os9_last_backup', now());
        if (kind === 'file') { const name = 'entorno-eisen-' + new Date().toISOString().slice(0, 10) + '.eisenenv', blob = new Blob([u8], { type: 'application/octet-stream' }); if (caps.download && P.saveMode() !== 'vault') { E.download(name, blob); out(U.note('Archivo guardado en tu dispositivo. Ábrelo en el otro dispositivo con Transferir › Recibir › Abrir archivo.', 'info')); } else { const id = await U.saveBlob(name, blob, 'documents'); out(`${U.note('Guardado en Archivos › Documentos. Compártelo o cópialo al otro dispositivo.', 'info')}${caps.shareFiles ? `<button class="k9-btn" data-sharefile="${esc(id)}">${esc(tr('Compartir archivo'))}</button>` : ''}`); } return; }
        const code = await toCode(u8);
        if (kind === 'code') { out(`<div class="k9-card p11-col"><p class="k9-small">${esc(tr('Copia este código y pégalo en EISEN en el otro dispositivo (Transferir › Recibir). Sirve entre navegadores, cuentas y equipos.'))}</p><textarea class="input-text p11-codebox" rows="5" readonly>${esc(code)}</textarea><div class="k9-row"><button class="k9-btn pri" data-copy="${esc(code)}">${esc(tr('Copiar código'))}</button>${caps.share ? `<button class="k9-btn" data-sharetext="1">${esc(tr('Compartir'))}</button>` : ''}<span class="k9-small k9-muted">${code.length} ${esc(tr('caracteres'))}</span></div></div>`); cur = code; return; }
        if (kind === 'qr') {
          const parts = qrParts(code); if (parts.length > 60) return out(U.note('El entorno es demasiado grande para QR: usa «Ligero», el archivo o la red local.', 'warn'));
          let i = 0, paused = false;
          out(`<div class="k9-card p11-center"><p class="k9-small">${esc(tr('En el otro dispositivo: Transferir › Recibir › Escanear QR. El código cambia solo hasta completar todas las partes.'))}</p><div class="p11-qr big" data-qr></div><div class="k9-row"><button class="k9-btn" data-qp="prev">‹</button><b data-qi></b><button class="k9-btn" data-qp="next">›</button><button class="k9-btn" data-qp="pause">⏯</button></div></div>`);
          const show = async () => { const box = q(V, '[data-qr]'); if (!box) { clearInterval(qrTimer); return; } box.innerHTML = await qrSvg(parts[i]); q(V, '[data-qi]').textContent = (i + 1) + ' / ' + parts.length; };
          show(); clearInterval(qrTimer); qrTimer = setInterval(() => { if (!paused && parts.length > 1) { i = (i + 1) % parts.length; show(); } }, 1100);
          V.__qp = { prev: () => { i = (i - 1 + parts.length) % parts.length; show(); }, next: () => { i = (i + 1) % parts.length; show(); }, pause: () => { paused = !paused; } };
        }
      }
      async function readBytes(get) { try { const u8 = await get(); await readObj(() => unpack(u8, () => K.ui.prompt(tr('Paquete cifrado'), tr('Contraseña'), '', { type: 'password' }))); } catch (e) { out(U.note(e.message, 'warn')); } }
      async function readFile(blob) {
        try {
          if (blob.size > 800 * 1048576) throw new Error(tr('El archivo supera 800 MB'));
          const u8 = new Uint8Array(await blob.arrayBuffer());
          if (MAGIC.every((m, i) => u8[i] === m)) return readObj(() => unpack(u8, () => K.ui.prompt(tr('Paquete cifrado'), tr('Contraseña'), '', { type: 'password' })));
          const txt = new TextDecoder().decode(u8); if (/EISEN1\./.test(txt.slice(0, 200))) return readBytes(() => fromCode(txt));
          return readObj(async () => { const o = P.safeParse(txt); if (!o) throw new Error(tr('El archivo no es un entorno ni una copia de EISEN')); return o; });
        } catch (e) { out(U.note(e.message, 'warn')); }
      }
      async function readObj(get) {
        out(`<p class="k9-muted">${esc(tr('Comprobando el paquete…'))}</p>`);
        let v; try { const o = await get(); if (o && o.kind === 'link' && /^https?:\/\//.test(o.url || '')) { E.ebOpenUrl(o.url, true); return out(U.note('Pestaña recibida: se abrió en el navegador EISEN.', 'info')); } if (o && o.kind === 'file' && o.file && typeof o.file.b64 === 'string') { const f = o.file, bin = atob(f.b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const name = await K.files.uniqueName('downloads', K.files.cleanName(f.name)); const id = await K.files.save(name, new Blob([u], { type: String(f.type || '') }), 'downloads'); P.downloads.add({ id, name, size: u.length, type: f.type, src: tr('red local') }); P.notifyDownload(id, name, u.length); return out(U.note('Archivo recibido en Descargas.', 'info')); } v = await validate(o); } catch (e) { return out(U.note(e.message, 'warn')); }
        if (!v.ok) return out(`<div class="k9-card">${v.errors.map(x => `<p class="k9-bad">✖ ${esc(x)}</p>`).join('')}</div>`);
        const s = v.summary; cur = v;
        out(`<div class="k9-card p11-col"><h3 class="p11-h3">${esc(tr('Entorno listo para importar'))}</h3>${U.kv([['Creado', s.created ? K.fmt.dt(s.created) : '—'], ['Desde', [s.device, s.profile].filter(Boolean).join(' · ') || '—'], ['Versión', s.ver], ['Tipo', s.scope === 'light' ? tr('Ligero') : tr('Completo')], ['Ajustes y datos', s.keys], ['Apps instaladas', s.apps], ['Elementos del escritorio', s.desk], ['Archivos', s.files + (s.files ? ' · ' + K.fmt.bytes(s.size) : '')]])}${v.warn.map(x => `<p class="k9-small" style="color:var(--e9-warn)">⚠ ${esc(x)}</p>`).join('')}
          <label class="k9-row"><input type="radio" name="mode" value="merge" checked> <b>${esc(tr('Fusionar sin duplicados'))}</b> <span class="k9-small k9-muted">${esc(tr('(añade lo que falta y conserva lo de aquí)'))}</span></label><label class="k9-row"><input type="radio" name="mode" value="replace"> <b>${esc(tr('Reemplazar todo'))}</b> <span class="k9-small k9-muted">${esc(tr('(deja este dispositivo igual que el otro)'))}</span></label><label class="k9-row"><input type="checkbox" data-look checked> ${esc(tr('Usar la apariencia del otro dispositivo (tema, fondo, colores, widgets)'))}</label>
          <div class="k9-row"><button class="k9-btn pri" data-im="apply">${esc(tr('Importar'))}</button><span class="k9-small k9-muted">${esc(tr('Antes se crea un punto de restauración.'))}</span></div></div>`);
      }
      b.addEventListener('click', async e => {
        const t = e.target;
        const tb = t.closest('[data-tab]'); if (tb) return go(tb.dataset.tab);
        const cp = t.closest('[data-copy]'); if (cp) return K.ui.copy(cp.dataset.copy);
        if (t.closest('[data-sharetext]') && cur) { try { await navigator.share({ title: 'EISEN OS PRIME', text: cur }); } catch { /* cancelado */ } return; }
        const sf = t.closest('[data-sharefile]'); if (sf) { const f = await K.files.get(sf.dataset.sharefile); if (f) { try { await navigator.share({ files: [new File([f.blob], f.name)] }); } catch { /* cancelado */ } } return; }
        const qp = t.closest('[data-qp]'); if (qp && V.__qp) return V.__qp[qp.dataset.qp]();
        const ex = t.closest('[data-ex]'); if (ex) { e.preventDefault(); return exportAs(ex.dataset.ex); }
        const im = t.closest('[data-im]');
        if (im) {
          const k = im.dataset.im;
          if (k === 'code') return readBytes(() => fromCode(q(V, '[data-code]').value));
          if (k === 'relay') return readObj(() => relayGet(q(V, '[data-rcode]').value));
          if (k === 'scan') { const txt = await scanner(collector(), tr('Escanear QR de EISEN')); if (!txt) return; if (txt.startsWith('RELAY:')) return readObj(() => relayGet(txt.slice(6))); q(V, '[data-code]').value = txt; return readBytes(() => fromCode(txt)); }
          if (k === 'images') {
            if (!K.qrDecodeBlob) await K.loadScript('js/os10/lib/qrdecode10.js');
            const files = await K.ui.pickFile('image/*', true); if (!files.length) return; const col = collector(); let res = null, n = 0;
            for (const f of files) { try { const txt = await K.qrDecodeBlob(f); if (txt) { n++; const r = col(txt); if (r && r.done) { res = r.value; break; } } } catch { /* siguiente */ } }
            if (!res) return out(U.note(n ? 'Faltan partes: elige las imágenes de todos los QR.' : 'No se encontró ningún QR de EISEN en esas imágenes.', 'warn'));
            if (res.startsWith('RELAY:')) return readObj(() => relayGet(res.slice(6))); return readBytes(() => fromCode(res));
          }
          if (k === 'file') { const f = await U.pickBlob({ title: tr('Paquete de entorno o copia de seguridad'), accept: x => /\.(eisenenv|json|txt)$/i.test(x.name), deviceAccept: '.eisenenv,.json,.txt' }); if (f) readFile(f.blob); return; }
          if (k === 'apply' && cur && cur.data) {
            const mode = (V.querySelector('[name="mode"]:checked') || {}).value || 'merge', look = !!(q(V, '[data-look]') || {}).checked;
            if (mode === 'replace' && !await E.confirm(tr('Reemplazar todo'), tr('Los ajustes, apps y escritorio de este dispositivo se sustituirán por los del paquete. Se crea antes un punto de restauración.'), tr('Reemplazar'))) return;
            const r = await apply(cur, { mode, look }); cur = null;
            out(`<div class="k9-card p11-center"><h3>✅ ${esc(tr('Entorno importado'))}</h3><p>${r.nk} ${esc(tr('ajustes'))} · ${r.nf} ${esc(tr('archivos'))}${r.dup ? ' · ' + r.dup + ' ' + esc(tr('duplicados omitidos')) : ''}</p><button class="k9-btn pri" data-reload>${esc(tr('Recargar EISEN para aplicarlo'))}</button></div>`);
            return;
          }
        }
        if (t.closest('[data-reload]')) return location.reload();
        const dv = t.closest('[data-dv]'); if (!dv) return; const k = dv.dataset.dv;
        if (k === 'sessions') E.launch('primecenter', 'sessions');
        if (k === 'profiles') E.launch('primecenter', 'sessions');
        if (k === 'pwa') { const ok = await P.installPWA(); E.toast(ok ? '✓ ' + tr('EISEN instalado como app') : tr('Instalación cancelada')); }
        if (k === 'applink') { const id = q(V, '[data-lapp]').value, a = appOf(id); const link = location.origin + location.pathname + '#install=' + encodeURIComponent(id); q(V, '[data-lout]').innerHTML = `<div class="p11-qr">${await qrSvg(link)}<small>${esc(tr('Escanéalo en el otro dispositivo para abrir o instalar'))} ${esc(a ? a.name : id)}</small></div><button class="k9-btn" data-copy="${esc(link)}">${esc(tr('Copiar enlace'))}</button>`; }
        if (k === 'relayfile') {
          const f = await U.pickBlob({ title: tr('Archivo para enviar') }); if (!f) return; if (f.blob.size > 6 * 1048576) return E.toast(tr('Máximo 6 MB por la red local'));
          try { const code = await relaySend({ eisenenv: 1, kind: 'file', data: {}, file: { name: f.name, type: f.blob.type, b64: await b64(f.blob) } }); const link = location.origin + location.pathname + '#relay=' + code; q(V, '[data-rfout]').innerHTML = `<div class="p11-bigcode">${esc(code)}</div><div class="p11-qr">${await qrSvg(link)}</div>`; } catch (er) { E.toast(er.message); }
        }
      });
      b.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-rcode]')) { e.preventDefault(); readObj(() => relayGet(e.target.value)); } });
      render();
    },
    onOpen(b, w, arg) { if (w.__p11go && (arg || P.pendingImport || P.pendingFile || P.pendingRelay)) w.__p11go(arg || 'import'); }
  });
  // API para otras partes (Domingo, navegador): enviar una pestaña o un enlace por la red local
  P.transfer = { pack, unpack, toCode, fromCode, build, validate, relayAvail, relaySend, sendLink: url => relaySend({ eisenenv: 1, kind: 'link', data: {}, url }) };
})();

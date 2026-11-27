// EISENKU Apps · utilidades compartidas
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim();
export const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(n || 0);
export const mmss = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

export function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k === 'value' || k === 'checked' || k === 'textContent') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}

export function store(ns) {
  return {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(ns + '.' + k)); return v ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(ns + '.' + k, JSON.stringify(v)); } catch { toast('No hay espacio para guardar'); } },
  };
}

let toastT;
export function toast(msg) {
  let t = $('#toast');
  if (!t) { t = h('div', { id: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 2600);
}

export const I = {
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>', back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  check: '<path d="M5 12l5 5 9-10"/>', share: '<path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
  cam: '<path d="M3 8h3.5l2-2.5h7l2 2.5H21v11H3z"/><circle cx="12" cy="13" r="3.5"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="9.5" r="1.5"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4"/>', flash: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  file: '<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v3h3"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>', play: '<path d="M7 5l12 7-12 7z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
  star: '<path d="M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', mirror: '<path d="M12 3v18M8 7l-4 5 4 5zM16 7l4 5-4 5z"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>', target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-7"/>', wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
  goal: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
};
export function icon(n) { const t = document.createElement('template'); t.innerHTML = `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${I[n] || ''}</svg>`; return t.content.firstChild; }

// Ventana inferior (hoja). Devuelve la función para cerrarla.
export function sheet(title, body, actions = []) {
  const close = () => { scrim.classList.remove('on'); setTimeout(() => scrim.remove(), 220); removeEventListener('keydown', esc); };
  const esc = e => { if (e.key === 'Escape') close(); };
  const scrim = h('div', { class: 'scrim', onclick: e => { if (e.target === scrim) close(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-label': title },
      h('div', { class: 'sheet-h' }, h('b', {}, title), h('button', { class: 'ib', 'aria-label': 'Cerrar', onclick: close }, icon('close'))),
      body, actions.length ? h('div', { class: 'row sheet-a' }, actions) : null));
  document.body.append(scrim); addEventListener('keydown', esc);
  requestAnimationFrame(() => scrim.classList.add('on'));
  return close;
}
export function confirmSheet(title, msg, okLabel, onOk) {
  const close = sheet(title, h('p', { class: 'muted', style: 'margin:0' }, msg), [
    h('button', { class: 'btn', onclick: () => close() }, 'Cancelar'),
    h('button', { class: 'btn dng', onclick: () => { close(); onOk(); } }, okLabel)]);
}

// Almacén grande (fotos, PDFs) en IndexedDB.
export const idb = (() => {
  let dbp;
  const db = () => dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('eisenku-apps', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const run = async (mode, fn) => {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction('kv', mode), q = fn(t.objectStore('kv'));
      t.oncomplete = () => res(q.result); t.onerror = () => rej(t.error);
    });
  };
  return { get: k => run('readonly', s => s.get(k)), set: (k, v) => run('readwrite', s => s.put(v, k)), del: k => run('readwrite', s => s.delete(k)) };
})();

export function download(blob, name) {
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
export async function shareOrDownload(blob, name, title) {
  const f = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [f] })) {
    try { await navigator.share({ files: [f], title }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  download(blob, name);
}
export function wakeLock() {
  let l = null, want = false;
  document.addEventListener('visibilitychange', async () => { if (want && document.visibilityState === 'visible') try { l = await navigator.wakeLock?.request('screen'); } catch {} });
  return {
    async on() { want = true; try { l = await navigator.wakeLock?.request('screen'); } catch {} },
    off() { want = false; l?.release?.(); l = null; },
  };
}

// Registro del modo sin conexión y botón «Instalar».
export function boot() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    const b = $('#install'); if (!b) return;
    b.hidden = false;
    b.onclick = async () => { e.prompt(); await e.userChoice; b.hidden = true; };
  });
}

/* =====================================================================
   EISEN OS PRIME 11.1 · «Apps de Android» en navegadores (Xbox, televisores, PC, iPhone, Chromebook)
   Un navegador no puede instalar ni ejecutar apps de Android. Esta ventana es la misma que en el APK y abre
   cada app de la mejor forma real en este dispositivo:
     · Dentro de EISEN: equivalente de EISEN (Mapas, Enciclopedia, lector de YouTube) o reproductor oficial
       que se deja incrustar (Spotify, Waze).
     · Ventana propia: servicios que prohíben mostrarse dentro de otra página (WhatsApp, Netflix…). En PC se abre
       una ventana sin pestañas; en Xbox, TV y móvil, una pestaña. Con el servidor local de EISEN (INICIAR.bat)
       se abren dentro del navegador de EISEN.
     · En la nube: juegos con streaming oficial (ficha de la Tienda con Xbox Cloud Gaming y GeForce NOW).
   En el APK este archivo no hace nada: allí la ventana abre las apps reales del teléfono (js/apk/android.js).
   ===================================================================== */
(function () {
  'use strict';
  if (window.EisenAndroid) return;
  const E = window.EISEN, K = window.EISENKU;
  if (!E || !K || !E.registerApp) return;
  const S = E.storage, esc = E.esc, tr = K.tr || (x => x);
  const UA = navigator.userAgent || '', XBOX = /Xbox/i.test(UA), PHONE = /Android/i.test(UA);
  const SITE = 'https://eisenku.vercel.app/#descargas';
  const P = () => K.prime || {};

  // apps que se ven DENTRO de EISEN en cualquier navegador
  const IN = {
    'com.google.android.youtube': { run: () => E.ebOpenUrl('https://www.youtube.com', true), how: 'Lector de YouTube de EISEN' },
    'com.google.android.apps.maps': { run: () => E.launch('maps'), how: 'Mapas de EISEN' },
    'org.wikipedia': { run: () => E.launch('wiki'), how: 'Enciclopedia de EISEN' },
    'com.spotify.music': { url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M', how: 'Reproductor oficial de Spotify' },
    'com.waze': { url: 'https://embed.waze.com/iframe?zoom=12&lat=19.4326&lon=-99.1332', how: 'Mapa en vivo oficial de Waze' }
  };
  const CLOUD = new Set(['com.innersloth.spacemafia', 'com.miHoYo.GenshinImpact']);
  const ORDER = { in: 0, web: 1, cloud: 2, android: 3 };
  const LBL = { in: 'Dentro de EISEN', web: 'Ventana propia', cloud: 'En la nube', android: 'Solo Android' };
  const local = () => !!(E.ebHaveProxy && E.ebHaveProxy());
  const kind = a => IN[a.pkg] ? 'in' : CLOUD.has(a.pkg) ? 'cloud' : a.web ? 'web' : 'android';
  const label = a => { const k = kind(a); return k === 'web' && local() ? 'Dentro de EISEN' : k === 'web' && (XBOX || PHONE) ? 'Pestaña propia' : LBL[k]; };

  function open(a) {
    if (!a) return false;
    if (E.closeFlyouts) E.closeFlyouts();
    const k = kind(a);
    if (k === 'in') {
      const r = IN[a.pkg];
      if (r.run) r.run();
      else if (P().openAppWindow) P().openAppWindow({ id: 'aw-' + a.pkg.replace(/\W/g, '_'), name: a.name, ext: r.url, icon: '📱', img: a.img || '', cat: a.cat });
      else E.ebOpenUrl(r.url, true);
      return true;
    }
    if (k === 'web') {
      if (local()) { E.ebOpenUrl(a.web, true); return true; }        // servidor local de EISEN: dentro del navegador de EISEN
      if (P().openExternal) return P().openExternal(a.web, a.name);
      window.open(a.web, '_blank', 'noopener'); return true;
    }
    if (E.storeShow) E.storeShow(a.id);                                // nube o solo Android: ficha de la Tienda con las opciones reales
    return true;
  }

  function render(body) {
    if (!body) return;
    if (!body.__aw) {
      body.__aw = 1; body.style.padding = '0';
      body.innerHTML = `<div class="aa"><div class="aa-top"><input class="input-text" placeholder="${esc(tr('Buscar apps y juegos de Android'))}"><span data-n></span></div><p class="aa-note"></p><div class="aa-cta" hidden></div><div class="aa-grid"></div></div>`;
      body.querySelector('input').addEventListener('input', () => render(body));
      body.addEventListener('click', e => {
        const b = e.target.closest('[data-aw-open]'); if (!b) return;
        e.preventDefault(); e.stopPropagation();
        open((E.PLAY || []).find(x => x.id === b.dataset.awOpen));
      });
    }
    const q = body.querySelector('input').value.trim().toLowerCase();
    const items = (E.PLAY || []).filter(a => !q || (a.name + ' ' + a.pkg + ' ' + (a.cat || '')).toLowerCase().includes(q))
      .sort((x, y) => (ORDER[kind(x)] - ORDER[kind(y)]) || x.name.localeCompare(y.name, 'es'));
    body.querySelector('[data-n]').textContent = items.length + ' ' + tr('apps');
    body.querySelector('.aa-note').textContent = tr(XBOX
      ? 'La Xbox no ejecuta apps de Android: EISEN abre cada una dentro de EISEN cuando el servicio lo permite, en una pestaña o en la nube. Among Us y Genshin Impact también se instalan en la consola desde su ficha.'
      : PHONE
        ? 'En el navegador, EISEN abre cada app dentro de EISEN cuando el servicio lo permite, en una pestaña o en la nube.'
        : local()
          ? 'Este equipo no ejecuta apps de Android: con el servidor local de EISEN, sus versiones web se abren dentro de EISEN; los juegos, en la nube.'
          : 'Este dispositivo no ejecuta apps de Android: EISEN abre cada una dentro de EISEN cuando el servicio lo permite, en su propia ventana o en la nube.');
    const cta = body.querySelector('.aa-cta');
    cta.hidden = !PHONE;
    if (PHONE) cta.innerHTML = `<span>${esc(tr('En la app EISEN OS PRIME para Android, esta ventana abre las apps reales de tu teléfono.'))}</span><a class="btn-primary" href="${esc(SITE)}" target="_blank" rel="noopener">${esc(tr('Descargar el APK'))}</a>`;
    const btn = a => ({ in: 'Abrir', web: 'Abrir', cloud: 'Jugar', android: 'Detalles' })[kind(a)];
    body.querySelector('.aa-grid').innerHTML = items.length ? items.map(a => {
      const k = kind(a), img = /^(https:|data:)/.test(a.img || '') ? a.img : '';
      return `<div class="aa-it aw-${k}">${img ? `<img src="${esc(img)}" alt="">` : '<span class="aa-ph">📱</span>'}<b>${esc(a.name)}</b><em class="aw-k">${esc(tr(label(a)))}</em><div><button class="${k === 'android' ? 'btn-secondary' : 'btn-primary'}" data-aw-open="${esc(a.id)}" title="${esc(IN[a.pkg] ? tr(IN[a.pkg].how) : a.name)}">${esc(tr(btn(a)))}</button></div></div>`;
    }).join('') : `<p class="aa-empty">${esc(tr('No hay apps que coincidan.'))}</p>`;
    body.querySelectorAll('.aa-grid img').forEach(i => { i.onerror = () => { const s = document.createElement('span'); s.className = 'aa-ph'; s.textContent = '📱'; i.replaceWith(s); }; });
  }

  const css = document.createElement('style');
  css.textContent = '.aa{display:flex;flex-direction:column;height:100%}.aa-top{display:flex;gap:10px;align-items:center;padding:12px 14px;border-bottom:1px solid #ffffff14}.aa-top input{flex:1}.aa-top span{font-size:12px;opacity:.7}' +
    '.aa-note{margin:0;padding:8px 14px 0;font-size:12px;opacity:.72}.aa-cta{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 14px 0;padding:10px 12px;border-radius:12px;background:#15803d26;font-size:13px}.aa-cta span{flex:1 1 220px}' +
    '.aa-grid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:14px;align-content:start}' +
    '.aa-it{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 10px;border-radius:14px;background:#ffffff0d;text-align:center}.aa-it img,.aa-ph{width:56px;height:56px;border-radius:14px}.aa-ph{display:grid;place-items:center;font-size:30px;background:#ffffff14}' +
    '.aa-it b{font-size:13px;line-height:1.25;min-height:2.5em;overflow:hidden}.aa-it div{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}.aa-empty{padding:30px;text-align:center;opacity:.7}' +
    '.aw-k{font-style:normal;font-size:11px;padding:2px 8px;border-radius:999px;background:#ffffff14;opacity:.85}.aw-in .aw-k{background:#15803d40;color:#86efac}.aw-cloud .aw-k{background:#c93a7333;color:#f5a3c4}.aw-android{opacity:.72}';
  document.head.appendChild(css);

  E.registerApp({ id: 'android-apps', name: 'Apps de Android', icon: '📱', cat: 'Sistema', grad: ['#15803d', '#4ade80'], desc: 'Tus apps y juegos de Android abiertos de la mejor forma en este dispositivo: dentro de EISEN, en su propia ventana o en la nube.', w: 860, h: 600, init: b => render(b), onOpen: b => render(b) });
  E.androidWeb = { open, kind };
  // como en el APK: la primera vez aparece en el escritorio
  if (!S.get('aw_desk_v1', false)) {
    S.set('aw_desk_v1', true);
    try { E.setInstalled('android-apps', true); if (E.addDesktopShortcut) E.addDesktopShortcut('android-apps'); } catch { /* escritorio aún no listo */ }
  }
})();

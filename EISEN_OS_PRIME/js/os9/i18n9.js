/* =====================================================================
   EISENKU OS 9.0 ENTERPRISE · Idiomas (20) sobre el sistema de traducción de 8.0
   - Añade 15 idiomas a los 5 de 8.0, con paquetes en js/os9/i18n/<idioma>.js
     (generados desde tools/i18n-core.txt con tools/build-i18n.mjs).
   - Respaldo: idioma → inglés → texto original (en catalán, directamente al original).
   - Escritura de derecha a izquierda (árabe), formatos regionales y aviso a las apps.
   - Detección de traducciones que faltan: informe de cobertura y exportación para completarlas.
   ===================================================================== */
(() => {
  'use strict';
  const E = window.EISEN, K = window.EISENKU, I = window.EISEN_I18N; if (!I || !K) return;
  const NAMES = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', de: 'Deutsch', it: 'Italiano', ja: '日本語', ko: '한국어', zh: '中文（简体）', 'zh-TW': '中文（繁體）', ru: 'Русский', ar: 'العربية', hi: 'हिन्दी', nl: 'Nederlands', tr: 'Türkçe', pl: 'Polski', uk: 'Українська', id: 'Bahasa Indonesia', sv: 'Svenska', ca: 'Català' };
  Object.keys(I.langs).forEach(k => delete I.langs[k]); Object.assign(I.langs, NAMES); // mismo objeto que usa 8.0
  const PACKS = window.EISEN_I18N9_PACKS = window.EISEN_I18N9_PACKS || {};
  const NOFALL = { ca: 1 };   // el catalán cae al texto original (español), que se entiende mejor que el inglés
  const valueSet = {};       // traducciones conocidas (para no contar como "faltan" textos ya traducidos)
  const vals = l => valueSet[l] || (valueSet[l] = new Set(Object.values(PACKS[l] || {}).concat(Object.values(I.dict(l) || {}))));
  window.EISEN_I18N_X = (k, l) => {
    const p = PACKS[l]; if (p && p[k] != null) return p[k];
    if (l !== 'en' && !NOFALL[l]) { const pe = PACKS.en; if (pe && pe[k]) return pe[k]; const de = I.dict('en'); if (de && de[k]) return de[k]; }
    return null;
  };
  const loading = {};
  const load = l => l === 'es' || PACKS[l] ? Promise.resolve() : loading[l] || (loading[l] = new Promise(res => { const s = document.createElement('script'); s.src = 'js/os9/i18n/' + l + '.js?v=' + encodeURIComponent(K.version); s.onload = () => { delete valueSet[l]; res(); }; s.onerror = () => { delete loading[l]; res(); }; document.head.appendChild(s); }));

  /* ---------- seguimiento de textos sin traducir (solo los que pide el código, nunca el contenido del usuario) ---------- */
  const seen = new Set(), miss = new Set(), viaEn = new Set();
  const tracked = s => typeof s === 'string' && s.length > 1 && s.length < 400 && /[a-záéíóúñ]/i.test(s) && !/^https?:|^[\w.-]+\.\w{2,4}$/.test(s);
  const has = (d, k) => !!d && d[k] != null;
  const enOf = k => (PACKS.en && PACKS.en[k]) || (I.dict('en') || {})[k] || null;
  K.tr = s => {
    const r = I.tr(s), l = I.lang;
    if (l !== 'es' && tracked(s)) {
      const k = s.trim().replace(/\s+/g, ' '); seen.add(k);
      const nat = has(PACKS[l], k) || has(I.dict(l), k) || vals(l).has(k);
      const en = !nat && l !== 'en' && !NOFALL[l] ? enOf(k) : null;
      if (nat || (r !== s && !en) || en === k) { miss.delete(k); viaEn.delete(k); }   // nativo (o nombre propio igual en todos los idiomas)
      else if (en) { miss.delete(k); viaEn.add(k); }                                  // se muestra en inglés
      else { miss.add(k); viaEn.delete(k); }                                           // se muestra en español
    }
    return r;
  };

  /* ---------- cambio de idioma ---------- */
  const set0 = I.setLang;
  const apply = l => {
    set0(l); K.applyDir(l); K.computeLocale(); seen.clear(); miss.clear(); viaEn.clear();
    K.emit('locale'); K.emit('lang', l); document.dispatchEvent(new CustomEvent('eisen:lang', { detail: l }));
    fillSelect();
  };
  I.setLang = l => {
    l = NAMES[l] ? l : 'es';
    return Promise.all([load(l), l !== 'es' && l !== 'en' && !NOFALL[l] ? load('en') : null]).then(() => { apply(l); if (l !== 'es') K.seclog && K.seclog('system', 'Idioma cambiado a ' + NAMES[l]); });
  };
  function fillSelect() {
    const sel = document.getElementById('cfg-lang'); if (!sel) return;
    if (sel.options.length !== Object.keys(NAMES).length) sel.innerHTML = Object.entries(NAMES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    sel.value = I.lang; sel.onchange = e => I.setLang(e.target.value);
  }
  fillSelect();
  // idioma guardado: los paquetes ya se cargaron en boot.js; se reaplica para dirección, formatos y textos
  let saved = 'es'; try { saved = JSON.parse(localStorage.getItem('eisen_lang')) || 'es'; } catch { /* ignorar */ }
  if (saved !== 'es' && NAMES[saved]) I.setLang(saved);

  /* ---------- informe de cobertura y textos que faltan ---------- */
  const esc = E.esc, tr = K.tr;
  window.EISEN_I18N9 = {
    langs: NAMES, packs: PACKS, load,
    coverage() {
      const l = I.lang; if (l === 'es') return { lang: l, pct: 100, withFallback: 100, seen: 0, missing: 0, english: 0, pack: 0 };
      const s = seen.size, m = miss.size, e = viaEn.size, p = n => s ? Math.round(n / s * 100) : 100;
      return { lang: l, pct: p(s - m - e), withFallback: p(s - m), seen: s, missing: m, english: e, pack: Object.keys(PACKS[l] || {}).length + Object.keys(I.dict(l) || {}).length };
    },
    missing: () => [...miss].sort(),
    english: () => [...viaEn].sort(),
    reportHtml() {
      const c = this.coverage();
      if (c.lang === 'es') return `<p class="k9-small">${esc(tr('Español es el idioma original de EISENKU: cobertura completa.'))}</p>`;
      const fb = NOFALL[c.lang] || c.lang === 'en' ? '' : ` · ${esc(tr('en inglés'))}: ${c.english}`;
      return `<div class="k9-row"><b>${esc(NAMES[c.lang])}</b><span class="k9-badge ${c.pct >= 90 ? 'g' : c.pct >= 60 ? 'w' : 'd'}">${c.pct}% ${esc(tr('nativo'))}</span>${fb ? `<span class="k9-badge">${c.withFallback}%</span>` : ''}</div><div class="k9-meter" style="margin:8px 0"><i style="width:${c.pct}%"></i></div><p class="k9-small k9-muted">${esc(tr('Textos mostrados en esta sesión'))}: ${c.seen} · ${esc(tr('sin traducir'))}: ${c.missing}${fb} · ${esc(tr('diccionario'))}: ${c.pack} ${esc(tr('entradas'))}${NOFALL[c.lang] || c.lang === 'en' ? '' : ' · ' + esc(tr('los textos que faltan se muestran en inglés cuando existe traducción'))}</p>`;
    },
    showMissing() {
      const l = this.missing(), en = this.english(), all = l.concat(en);
      const li = x => `<li>${esc(x)}</li>`;
      E.form({ title: tr('Textos sin traducir') + ' · ' + NAMES[I.lang], html: all.length ? `<p class="k9-small k9-muted">${esc(tr('Se detectan mientras usas EISENKU. Exporta la lista para traducirla y añádela a tools/i18n-extra/<idioma>.json.'))}</p><div style="max-height:46vh;overflow:auto;font-size:12.5px">${l.length ? `<b>${esc(tr('sin traducir'))} (${l.length})</b><ul style="padding-left:18px;display:flex;flex-direction:column;gap:3px">${l.slice(0, 300).map(li).join('')}</ul>` : ''}${en.length ? `<b>${esc(tr('en inglés'))} (${en.length})</b><ul style="padding-left:18px;display:flex;flex-direction:column;gap:3px">${en.slice(0, 300).map(li).join('')}</ul>` : ''}</div>` : `<p>${esc(tr('No se ha detectado ningún texto sin traducir en esta sesión.'))}</p>`, ok: tr('Exportar'), cancel: tr('Cerrar') }).then(v => { if (v && all.length) this.exportMissing(); });
    },
    exportMissing() {
      const l = I.lang, keys = this.missing().concat(this.english()).sort();
      const data = { app: 'EISENKU OS', version: K.version, lang: l, language: NAMES[l], generated: new Date().toISOString(), howto: 'Traduce los valores vacíos de "strings" y guarda ese objeto como tools/i18n-extra/' + l + '.json; después ejecuta node tools/build-i18n.mjs. "reference_en" muestra la traducción inglesa cuando existe.', strings: Object.fromEntries(keys.map(k => [k, ''])), reference_en: Object.fromEntries(keys.filter(enOf).map(k => [k, enOf(k)])) };
      const a = document.createElement('a'); a.__eisen = true; a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = `eisenku_traducir_${l}.json`; document.body.appendChild(a); HTMLAnchorElement.prototype.click.call(a); a.remove();
    }
  };
})();

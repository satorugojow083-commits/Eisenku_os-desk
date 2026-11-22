/* EISENKU OS 10.0 · Lector de metadatos de imágenes (K.exif): EXIF/TIFF de JPEG y de fotos RAW basadas en TIFF,
   y localización de las vistas previas JPEG incrustadas en archivos RAW (CR2, CR3, NEF, ARW, DNG, ORF, RAF, RW2, PEF…).
   No revela el sensor RAW: muestra la vista previa que guardó la propia cámara. */
(() => {
  'use strict';
  const K = window.EISENKU; if (!K || K.exif) return;
  const NAMES = { 0x010F: 'Make', 0x0110: 'Model', 0x0112: 'Orientation', 0x0131: 'Software', 0x0132: 'DateTime', 0x013B: 'Artist', 0x8298: 'Copyright', 0x0100: 'ImageWidth', 0x0101: 'ImageHeight', 0x0103: 'Compression', 0x829A: 'ExposureTime', 0x829D: 'FNumber', 0x8822: 'ExposureProgram', 0x8827: 'ISO', 0x9003: 'DateTimeOriginal', 0x9201: 'ShutterSpeedValue', 0x9202: 'ApertureValue', 0x9204: 'ExposureBias', 0x9207: 'MeteringMode', 0x9209: 'Flash', 0x920A: 'FocalLength', 0xA002: 'PixelXDimension', 0xA003: 'PixelYDimension', 0xA405: 'FocalLength35mm', 0xA434: 'LensModel', 0xA433: 'LensMake', 0xA431: 'SerialNumber', 0xC612: 'DNGVersion', 0xC614: 'UniqueCameraModel' };
  const GPSN = { 1: 'GPSLatitudeRef', 2: 'GPSLatitude', 3: 'GPSLongitudeRef', 4: 'GPSLongitude', 6: 'GPSAltitude' };
  const SZ = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
  function parseTiff(u8, base = 0, maxIfds = 12) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); if (base + 8 > u8.length) return null;
    const bo = String.fromCharCode(u8[base], u8[base + 1]); if (bo !== 'II' && bo !== 'MM') return null; const le = bo === 'II';
    const u16 = o => dv.getUint16(base + o, le), u32 = o => dv.getUint32(base + o, le), i32 = o => dv.getInt32(base + o, le);
    if (u16(2) !== 42 && u16(2) !== 0x4f52 && u16(2) !== 0x55) return null;   // 42 = TIFF, ORF y RW2 usan otros valores
    const tags = {}, gps = {}, jpegs = [], seen = new Set();
    const val = (type, cnt, off) => { const sz = (SZ[type] || 1) * cnt, p = sz <= 4 ? off : u32(off); if (base + p + sz > u8.length) return null; const one = k => { const q = p + k * (SZ[type] || 1); switch (type) { case 3: return u16(q); case 4: return u32(q); case 5: return u32(q) / (u32(q + 4) || 1); case 10: return i32(q) / (i32(q + 4) || 1); case 9: return i32(q); case 1: case 7: return u8[base + q]; default: return null; } }; if (type === 2) { const bytes = []; for (let k = 0; k < cnt && k < 200; k++) { const c = u8[base + p + k]; if (!c) break; bytes.push(c); } let s; try { s = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)); } catch { s = String.fromCharCode(...bytes); } return s.trim(); } if (cnt === 1) return one(0); return Array.from({ length: Math.min(cnt, 16) }, (_, k) => one(k)); };
    const ifd = (off, into, names, depth) => {
      if (!off || off + 2 > u8.length - base || seen.has(off) || depth > 4 || seen.size > maxIfds * 4) return 0; seen.add(off);
      const n = u16(off); if (n > 500) return 0; let jo = 0, jl = 0, so = 0, sl = 0, comp = 0, w = 0, h = 0; const subs = [];
      for (let i = 0; i < n; i++) {
        const e = off + 2 + i * 12; if (base + e + 12 > u8.length) break; const tag = u16(e), type = u16(e + 2), cnt = u32(e + 4);
        const v = val(type, cnt, e + 8);
        if (names[tag] && v != null && into[names[tag]] === undefined) into[names[tag]] = v;
        if (tag === 0x8769) ifd(u32(e + 8), tags, NAMES, depth + 1);
        else if (tag === 0x8825) ifd(u32(e + 8), gps, GPSN, depth + 1);
        else if (tag === 0x014A) { if (cnt === 1) subs.push(u32(e + 8)); else { const p = u32(e + 8); for (let k = 0; k < Math.min(cnt, 8); k++) subs.push(u32(p + k * 4)); } }
        else if (tag === 0x0201) jo = v; else if (tag === 0x0202) jl = v; else if (tag === 0x0111) so = Array.isArray(v) ? v[0] : v; else if (tag === 0x0117) sl = Array.isArray(v) ? v[0] : v; else if (tag === 0x0103) comp = v; else if (tag === 0x0100) w = v; else if (tag === 0x0101) h = v;
      }
      if (jo && jl) jpegs.push({ off: base + jo, len: jl, src: 'IFD' }); if ((comp === 6 || comp === 7) && so && sl && u8[base + so] === 0xFF && u8[base + so + 1] === 0xD8) jpegs.push({ off: base + so, len: sl, src: 'tira', w, h });
      subs.forEach(s => ifd(s, {}, {}, depth + 1));
      return u32(off + 2 + n * 12);
    };
    let next = u32(4), k = 0; while (next && k++ < maxIfds) next = ifd(next, tags, NAMES, 0);
    if (Object.keys(gps).length) { const deg = a => Array.isArray(a) ? a[0] + (a[1] || 0) / 60 + (a[2] || 0) / 3600 : a; if (gps.GPSLatitude) tags.GPS = `${(deg(gps.GPSLatitude) * (gps.GPSLatitudeRef === 'S' ? -1 : 1)).toFixed(5)}, ${(deg(gps.GPSLongitude) * (gps.GPSLongitudeRef === 'W' ? -1 : 1)).toFixed(5)}`; }
    return { le, tags, jpegs };
  }
  // dimensiones y final real de un JPEG (recorre segmentos y datos comprimidos hasta EOI)
  function jpegInfo(u8, off, limit = u8.length) {
    if (u8[off] !== 0xFF || u8[off + 1] !== 0xD8) return null; let p = off + 2, w = 0, h = 0;
    while (p + 4 <= limit) {
      if (u8[p] !== 0xFF) return null; let m = u8[p + 1]; while (m === 0xFF && p + 2 < limit) { p++; m = u8[p + 1]; }
      if (m === 0xD9) return { off, end: p + 2, w, h };
      if (m >= 0xD0 && m <= 0xD7 || m === 0x01) { p += 2; continue; }
      const L = (u8[p + 2] << 8) | u8[p + 3]; if (L < 2) return null;
      if ((m >= 0xC0 && m <= 0xC3) || (m >= 0xC5 && m <= 0xC7) || (m >= 0xC9 && m <= 0xCB) || (m >= 0xCD && m <= 0xCF)) { h = (u8[p + 5] << 8) | u8[p + 6]; w = (u8[p + 7] << 8) | u8[p + 8]; }
      if (m === 0xDA) { let q = p + 2 + L; while (q + 1 < limit) { if (u8[q] === 0xFF && u8[q + 1] !== 0 && !(u8[q + 1] >= 0xD0 && u8[q + 1] <= 0xD7)) { if (u8[q + 1] === 0xD9) return { off, end: q + 2, w, h }; p = q; break; } q++; } if (q + 1 >= limit) return { off, end: limit, w, h, truncated: true }; continue; }
      p += 2 + L;
    }
    return null;
  }
  K.exif = {
    parseTiff, jpegInfo,
    fromJpeg(u8) { if (u8[0] !== 0xFF || u8[1] !== 0xD8) return null; let p = 2; while (p + 4 < u8.length && u8[p] === 0xFF) { const m = u8[p + 1], L = (u8[p + 2] << 8) | u8[p + 3]; if (m === 0xE1 && u8[p + 4] === 0x45 && u8[p + 5] === 0x78 && u8[p + 6] === 0x69 && u8[p + 7] === 0x66) return parseTiff(u8, p + 10); if (m === 0xDA) break; p += 2 + L; } return null; },
    // vistas previas JPEG incrustadas en un RAW, de mayor a menor
    previews(u8) {
      const out = [], seen = new Set(); const tiff = u8[0] === 0x49 || u8[0] === 0x4D ? parseTiff(u8, 0) : null;
      const cands = (tiff ? tiff.jpegs.map(j => j.off) : []).concat((() => { const l = []; for (let i = 0; i < u8.length - 3 && l.length < 40; i++) if (u8[i] === 0xFF && u8[i + 1] === 0xD8 && u8[i + 2] === 0xFF && (u8[i + 3] & 0xF0) === 0xE0 || (u8[i] === 0xFF && u8[i + 1] === 0xD8 && u8[i + 2] === 0xFF && u8[i + 3] === 0xDB)) { l.push(i); i += 1000; } return l; })());
      for (const o of cands) { if (seen.has(o)) continue; seen.add(o); const j = jpegInfo(u8, o); if (j && j.w && j.h && j.end - o > 1000) out.push({ off: o, len: j.end - o, w: j.w, h: j.h, truncated: !!j.truncated }); }
      return { previews: out.sort((a, b) => b.w * b.h - a.w * a.h), tags: tiff ? tiff.tags : {} };
    },
    describe(t) {
      if (!t) return []; const r = [];
      const num = v => Array.isArray(v) ? (v.length === 2 && v[1] ? v[0] / v[1] : +v[0]) : +v;   // racional, o par numerador/denominador
      t = Object.assign({}, t); ['ExposureTime', 'FNumber', 'FocalLength', 'ExposureBias'].forEach(k => { if (t[k] !== undefined) t[k] = num(t[k]); });
      const exp = v => v >= 1 ? +v.toFixed(1) + ' s' : '1/' + Math.round(1 / v) + ' s';
      if (t.Make || t.Model) r.push(['Cámara', [t.Make, t.Model].filter(Boolean).join(' ').replace(/^(\w+) \1/i, '$1')]);
      if (t.LensModel) r.push(['Objetivo', t.LensModel]);
      if (t.DateTimeOriginal || t.DateTime) r.push(['Fecha de la toma', String(t.DateTimeOriginal || t.DateTime).replace(/^(\d{4}):(\d\d):(\d\d)/, '$3/$2/$1')]);
      if (t.ExposureTime) r.push(['Exposición', exp(t.ExposureTime)]); if (t.FNumber) r.push(['Apertura', 'ƒ/' + (+t.FNumber).toFixed(1)]); if (t.ISO) r.push(['ISO', Array.isArray(t.ISO) ? t.ISO[0] : t.ISO]);
      if (t.FocalLength) r.push(['Distancia focal', (+t.FocalLength).toFixed(0) + ' mm' + (t.FocalLength35mm ? ' (' + t.FocalLength35mm + ' mm equiv.)' : '')]);
      if (t.ExposureBias) r.push(['Compensación', (t.ExposureBias > 0 ? '+' : '') + (+t.ExposureBias).toFixed(1) + ' EV']); if (t.Flash !== undefined) r.push(['Flash', t.Flash & 1 ? 'Disparado' : 'No disparado']);
      if (t.PixelXDimension) r.push(['Dimensiones (EXIF)', t.PixelXDimension + ' × ' + t.PixelYDimension]); if (t.Orientation) r.push(['Orientación', t.Orientation]);
      if (t.Software) r.push(['Software', t.Software]); if (t.Artist) r.push(['Autor', t.Artist]); if (t.Copyright) r.push(['Copyright', t.Copyright]); if (t.GPS) r.push(['Ubicación GPS', t.GPS]); if (t.DNGVersion) r.push(['DNG', Array.isArray(t.DNGVersion) ? t.DNGVersion.join('.') : t.DNGVersion]);
      return r;
    }
  };
})();

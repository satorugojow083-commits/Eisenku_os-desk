/* EISENKU OS 10.0 · Biblioteca de huellas (K.hash): MD5 y CRC32 propios (incrementales), SHA-1/256/384/512 con WebCrypto.
   La usan el Verificador de huellas, Archivos (metadatos y comparación) y el análisis de duplicados. */
(() => {
  'use strict';
  const K = window.EISENKU; if (!K || K.hash) return;
  /* ---------- CRC32 ---------- */
  const T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = () => { let c = 0xffffffff; return { update(u) { for (let i = 0; i < u.length; i++) c = T[(c ^ u[i]) & 255] ^ (c >>> 8); }, digest: () => ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0') }; };
  /* ---------- MD5 (RFC 1321), incremental ---------- */
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const KT = Array.from({ length: 64 }, (_, i) => (Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);
  function md5() {
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476, len = 0; const buf = new Uint8Array(64); let bl = 0; const M = new Uint32Array(16);
    const block = (u, o) => {
      for (let i = 0; i < 16; i++) M[i] = u[o + i * 4] | (u[o + i * 4 + 1] << 8) | (u[o + i * 4 + 2] << 16) | (u[o + i * 4 + 3] << 24);
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; } else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + KT[i] + M[g]) >>> 0; A = D; D = C; C = B; B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    };
    return {
      update(u) { len += u.length; let i = 0; if (bl) { const n = Math.min(64 - bl, u.length); buf.set(u.subarray(0, n), bl); bl += n; i = n; if (bl === 64) { block(buf, 0); bl = 0; } } for (; i + 64 <= u.length; i += 64) block(u, i); if (i < u.length) { buf.set(u.subarray(i), 0); bl = u.length - i; } },
      digest() { const bits = len * 8; const pad = new Uint8Array(((bl < 56) ? 56 - bl : 120 - bl) + 8); pad[0] = 0x80; const lo = bits >>> 0, hi = Math.floor(bits / 4294967296) >>> 0; const p = pad.length - 8; for (let k = 0; k < 4; k++) { pad[p + k] = (lo >>> (8 * k)) & 255; pad[p + 4 + k] = (hi >>> (8 * k)) & 255; } this.update(pad); const out = new Uint8Array(16); [a0, b0, c0, d0].forEach((w, j) => { for (let k = 0; k < 4; k++) out[j * 4 + k] = (w >>> (8 * k)) & 255; }); return [...out].map(x => x.toString(16).padStart(2, '0')).join(''); }
    };
  }
  const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
  const SUBTLE = { 'SHA-1': 'SHA-1', 'SHA-256': 'SHA-256', 'SHA-384': 'SHA-384', 'SHA-512': 'SHA-512' };
  K.hash = {
    ALGOS: ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'CRC32'],
    // calcula varias huellas de un Blob o texto; onProgress(fracción) para archivos grandes
    async compute(data, algos = ['SHA-256'], onProgress) {
      const blob = data instanceof Blob ? data : new Blob([typeof data === 'string' ? new TextEncoder().encode(data) : data]);
      const out = {}, inc = {}; if (algos.includes('MD5')) inc.MD5 = md5(); if (algos.includes('CRC32')) inc.CRC32 = crc32();
      const subtle = algos.filter(a => SUBTLE[a]);
      if (Object.keys(inc).length) { const CH = 4 * 1024 * 1024; for (let o = 0; o < blob.size; o += CH) { const u = new Uint8Array(await blob.slice(o, o + CH).arrayBuffer()); Object.values(inc).forEach(h => h.update(u)); onProgress && onProgress(Math.min(1, (o + CH) / blob.size) * (subtle.length ? .5 : 1)); await new Promise(r => setTimeout(r, 0)); } Object.entries(inc).forEach(([k, h]) => { out[k] = h.digest(); }); }
      if (subtle.length) { if (!(window.crypto && crypto.subtle)) throw new Error('WebCrypto no disponible (abre EISENKU con https o en 127.0.0.1)'); const ab = await blob.arrayBuffer(); for (const a of subtle) { out[a] = hex(await crypto.subtle.digest(SUBTLE[a], ab)); } onProgress && onProgress(1); }
      return out;
    },
    md5: s => { const h = md5(); h.update(typeof s === 'string' ? new TextEncoder().encode(s) : s); return h.digest(); },
    crc32: s => { const h = crc32(); h.update(typeof s === 'string' ? new TextEncoder().encode(s) : s); return h.digest(); },
    guess: h => { const n = String(h || '').trim().toLowerCase().replace(/\s/g, ''); return { 8: 'CRC32', 32: 'MD5', 40: 'SHA-1', 64: 'SHA-256', 96: 'SHA-384', 128: 'SHA-512' }[n.length] || null; }
  };
})();

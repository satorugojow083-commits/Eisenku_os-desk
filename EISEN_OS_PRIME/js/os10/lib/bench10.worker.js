/* EISENKU OS 10.0 · Trabajador de la prueba de rendimiento (Inspector de hardware).
   Mide cuántas unidades de trabajo fijas completa este hilo por segundo. No accede a nada del sistema:
   es JavaScript puro dentro del navegador, por eso el resultado compara navegadores y equipos entre sí,
   no es una medida de laboratorio del procesador. */
'use strict';
const WORK = {
  // enteros: generador xorshift y operaciones de bits (100 000 pasos por unidad)
  int() { let x = 2463534242 | 0, acc = 0; for (let i = 0; i < 100000; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; acc = (acc + (x & 1023) * 7) | 0; } return acc; },
  // coma flotante: trigonometría y raíces (40 000 pasos por unidad)
  float() { let a = 0; for (let i = 1; i < 40000; i++) { a += Math.sin(i * 0.001) * Math.cos(i * 0.002) + Math.sqrt(i) / (i + 1); } return a; },
  // memoria: ordenar 40 000 números (presión de caché y memoria)
  sort() { const n = 40000, arr = new Float64Array(n); let s = 1; for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; arr[i] = s; } arr.sort(); return arr[n >> 1]; },
  // objetos y cadenas: crear, serializar y leer JSON (300 objetos por unidad)
  json() { const o = []; for (let i = 0; i < 300; i++) o.push({ id: i, n: 'item' + i, v: [i, i * 2, i * 3], ok: i % 2 === 0 }); return JSON.parse(JSON.stringify(o)).length; }
};
self.onmessage = e => {
  const { tests = ['int', 'float', 'sort', 'json'], ms = 600 } = e.data || {}, out = {};
  let sink = 0;
  for (const t of tests) {
    const fn = WORK[t]; if (!fn) continue;
    fn(); // calentamiento (compilación JIT)
    const t0 = performance.now(); let n = 0;
    while (performance.now() - t0 < ms) { sink += +fn() || 0; n++; }
    out[t] = n / ((performance.now() - t0) / 1000);
  }
  out.sink = sink % 7; // evita que el motor elimine el trabajo
  self.postMessage(out);
};

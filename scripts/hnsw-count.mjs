// Counts distance computations for a plain HNSW (Malkov & Yashunin, Alg. 1–5)
// against brute force, at several sizes N. Writes JSON to stdout.
//   node scripts/hnsw-count.mjs                 (JSON to stdout)
//   node scripts/hnsw-count.mjs --module        (also writes src/figures/data/hnsw-count.js for fig 2)
// Data: a seeded mixture of 1,000 overlapping Gaussian clusters in 32 dimensions.
// M = 16, Mmax0 = 32, efConstruction = 100, efSearch = 64, k = 10.

const D = 32, M = 16, M0 = 32, EFC = 100, EF = 64, K = 10, Q = 200;
const SIZES = [1000, 3000, 10000, 30000, 100000, 300000];

let seed = 42;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const centres = Array.from({ length: 1000 }, () => Float32Array.from({ length: D }, () => gauss() * 1.5));
const sample = () => { const c = centres[Math.floor(rnd() * centres.length)]; return Float32Array.from(c, (x) => x + gauss()); };

let count = 0;
const dist = (a, b) => { count++; let s = 0; for (let i = 0; i < D; i++) { const d = a[i] - b[i]; s += d * d; } return s; };

// binary heap on [dist, id]; min-heap when sign = 1, max-heap when sign = -1
class Heap {
  constructor(sign) { this.a = []; this.s = sign; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.s * (a[p][0] - a[i][0]) <= 0) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && this.s * (a[l][0] - a[m][0]) < 0) m = l; if (r < a.length && this.s * (a[r][0] - a[m][0]) < 0) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
}

function build(data) {
  const mL = 1 / Math.log(M), level = [], links = []; // links[i][l] = neighbour ids
  let entry = -1, top = -1;
  const searchLayer = (q, eps, ef, l) => {
    const seen = new Set(eps.map((e) => e[1])), cand = new Heap(1), res = new Heap(-1);
    eps.forEach((e) => { cand.push(e); res.push(e); });
    while (cand.size) {
      const c = cand.pop();
      if (c[0] > res.peek()[0] && res.size >= ef) break;
      for (const n of links[c[1]][l]) {
        if (seen.has(n)) continue; seen.add(n);
        const d = dist(q, data[n]);
        if (res.size < ef || d < res.peek()[0]) { cand.push([d, n]); res.push([d, n]); if (res.size > ef) res.pop(); }
      }
    }
    return res.a.slice().sort((x, y) => x[0] - y[0]);
  };
  // Alg. 4: keep a candidate only if it is closer to the base than to every kept neighbour
  const select = (cands, m) => {
    const out = [];
    for (const [d, c] of cands) {
      if (out.length >= m) break;
      if (out.every(([, o]) => dist(data[c], data[o]) > d)) out.push([d, c]);
    }
    return out;
  };
  const insert = (i) => {
    const q = data[i], L = Math.floor(-Math.log(rnd() + 1e-12) * mL);
    level[i] = L; links[i] = Array.from({ length: L + 1 }, () => []);
    if (entry < 0) { entry = i; top = L; return; }
    let eps = [[dist(q, data[entry]), entry]];
    for (let l = top; l > L; l--) eps = searchLayer(q, eps, 1, l).slice(0, 1);
    for (let l = Math.min(top, L); l >= 0; l--) {
      const w = searchLayer(q, eps, EFC, l), cap = l ? M : M0;
      const nb = select(w, M);
      links[i][l] = nb.map(([, c]) => c);
      for (const [, c] of nb) {
        const ln = links[c][l]; ln.push(i);
        if (ln.length > cap) links[c][l] = select(ln.map((n) => [dist(data[c], data[n]), n]).sort((x, y) => x[0] - y[0]), cap).map(([, n]) => n);
      }
      eps = w;
    }
    if (L > top) { entry = i; top = L; }
  };
  const knn = (q, ef) => {
    let eps = [[dist(q, data[entry]), entry]];
    for (let l = top; l > 0; l--) eps = searchLayer(q, eps, 1, l).slice(0, 1);
    return searchLayer(q, eps, ef, 0).slice(0, K).map(([, c]) => c);
  };
  return { insert, knn, levels: () => level };
}

const out = [];
const data = [];
const queries = Array.from({ length: Q }, sample);
const index = build(data);
let built = 0;
for (const n of SIZES) {
  while (data.length < n) data.push(sample());
  const t0 = performance.now(), from = built; count = 0;
  for (; built < n; built++) index.insert(built);
  const perInsert = count / (n - from); // average over the inserts that grew the index to n
  const buildMs = performance.now() - t0;
  count = 0; let hit = 0;
  for (const q of queries) {
    const got = index.knn(q, EF);
    const c0 = count;
    const truth = data.map((x, i) => [dist(q, x), i]).sort((a, b) => a[0] - b[0]).slice(0, K).map(([, i]) => i);
    count = c0; // brute force is exactly n per query; don't add it to the HNSW count
    hit += got.filter((g) => truth.includes(g)).length;
  }
  const perQuery = count / Q;
  const layers = index.levels().reduce((a, b) => Math.max(a, b), 0) + 1;
  out.push({ n, perQuery: Math.round(perQuery), brute: n, recall: +(hit / (Q * K)).toFixed(3), perInsert: Math.round(perInsert), layers, buildSeconds: +(buildMs / 1000).toFixed(1) });
  console.error(JSON.stringify(out.at(-1)));
}
console.log(JSON.stringify({ D, M, M0, efConstruction: EFC, efSearch: EF, k: K, queries: Q, rows: out }, null, 1));
if (process.argv.includes('--module')) {
  const { writeFileSync } = await import('node:fs');
  const rows = out.map(({ n, perQuery, brute, recall, perInsert }) => `  { n: ${n}, perQuery: ${perQuery}, brute: ${brute}, recall: ${recall}, perInsert: ${perInsert} },`).join('\n');
  writeFileSync(new URL('../src/figures/data/hnsw-count.js', import.meta.url),
    `// Written by scripts/hnsw-count.mjs --module. ${D}-d clustered data, M = ${M}, efConstruction = ${EFC}, efSearch = ${EF}, k = ${K}, ${Q} queries per size.\n// perInsert is the mean over the inserts that grew the index to n.\nexport const COUNT = [\n${rows}\n];\n`);
}

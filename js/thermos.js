// Shared parts for ThermosClear: the heat-loss model of a vacuum flask, a generic flask built in
// 3D (all-steel or glass refill), chart boards, glowing dots and small helpers.
// Scene units: 1 unit ≈ 5 cm, +y up. The flask is a generic 500 mL flask: no maker's design.
//
// The heat-loss model (shared with HeatClear's "limits" chapter, which uses the same 500 mL flask,
// 0.035 m² inner wall, 5 mm gap, ε = 0.03 silvered glass and 0.012 W/K for neck and stopper together,
// so the two boxes agree). Heat leaves the drink by these routes, all in watts:
//  1. Gas in the gap. Full of air, a 5 mm gap conducts k/gap = 0.026/0.005 = 5.2 W/m²K (air k = 0.026
//     W/m·K at 25 °C, Incropera table A.4). In a 5 mm gap the air hardly circulates: the Rayleigh
//     number gβΔT·L³/(να) is about 540 at a 65 °C difference, below the ~1,000 at which convection
//     starts in a tall slot (Incropera §9.8), so convection adds nothing. Pump the gas out and, once
//     a molecule's mean free path is longer than the gap, conduction falls in step with pressure: the
//     free-molecule rate for air is Λ = (γ+1)/(γ−1)·√(R/8πMT) ≈ 1.1 W/m²K per pascal at 330 K, times an
//     accommodation factor of about 0.8 (both walls ≈ 0.9), so h_fm ≈ 0.9·p. We join the two limits in
//     series: h = 1 / (1/5.2 + 1/(0.9 p)). (Kennard; the standard result in vacuum-insulation texts.)
//  2. Radiation across the gap, between two long coaxial walls: q = σA(T₁⁴ − T₂⁴) ÷ (1/ε₁ + 1/ε₂ − 1)
//     (Incropera eq. 13.24 with A₁ ≈ A₂). Emissivities: silvered glass 0.03 (polished silver 0.02–0.03),
//     polished stainless steel 0.075, a dull or painted surface 0.9 (Engineering ToolBox, emissivity
//     coefficients). The outer wall sits within a degree or two of the room, so T₂ ≈ room.
//  3. The neck, where the two walls join: a thin ring of wall carries heat by plain conduction, kA/L.
//     Steel: k = 16, wall 0.4 mm, ring 11 cm round (35 mm mouth), 5 cm of path → 0.014 W/K; in series
//     with the outer case's film to the room (~0.08 W/K) → 0.012 W/K. Glass: k = 1.0, wall 1.5 mm,
//     3 cm of path → 0.0055, in series → 0.0051 W/K. Wall thicknesses and lengths are our estimates
//     for a typical 500 mL flask.
//  4. The stopper: a plastic plug about 4 cm across with a silicone ring; a solid polypropylene plug
//     4 cm long would pass k·A/L = 0.2 × 1.26e-3 / 0.04 = 0.0063 W/K; we use 0.0065 W/K (estimate).
//     With the stopper out, the open mouth loses heat by convection and evaporation, as in HeatClear:
//     A × 6 W/m²K × [(T − T_room) + 16.5 K/kPa × (p_sat(T) − p_sat(T_room))], halved because the
//     surface sits down in the neck.
// Glass flask: neck 0.0051 + stopper 0.0065 = 0.0116 W/K, the same as HeatClear's 0.012.
// Check against the standards: JIS S 2006 and EN 12546-1 both fill with water at 95 °C in a 20 °C
// room and read it after 6 hours. Our steel flask gives about 76 °C, the glass flask about 84 °C;
// EN 12546-1 asks a 500 mL flask for at least 70 °C (as reported by testers; we did not read the
// standard itself).
import { THREE, M, clamp, lerp, smooth, approach, beam, box, sphere, torus } from './kit.js';

export { THREE, M, clamp, lerp, smooth, approach, beam, box, sphere, torus };
export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- constants
export const SIGMA = 5.670374e-8;      // W/m²K⁴, Stefan–Boltzmann constant (CODATA 2018)
export const K0 = 273.15;
export const KB = 1.380649e-23;        // J/K, Boltzmann constant
export const C_WATER = 4186;           // J/kg·K
export const AIR_K = 0.026;            // W/m·K at 25 °C
export const GAP = 0.005;              // m, the vacuum gap of a 500 mL flask (drawn about twice as wide)
export const A_IN = 0.035;             // m², inner wall that faces the gap (as HeatClear)
export const A_OUT = 0.06;             // m², outside of the case
export const H_OUT = 10;               // W/m²K, still room air on the case: convection plus radiation
export const D_AIR = 3.7e-10;          // m, effective diameter of an air molecule (kinetic theory)
export const P_ATM = 101325;
export const P_GOOD = 0.01;            // Pa, about 10⁻⁴ torr: the vacuum makers pump flasks to (see vacuum.js)

export const FLASK = {
  steel: { n: 'All-steel flask', eps: 0.075, neck: 0.012, stop: 0.0065, Cwall: 60, surf: 'polished steel' },
  glass: { n: 'Glass refill', eps: 0.03, neck: 0.0051, stop: 0.0065, Cwall: 84, surf: 'silvered glass' },
};
export const EPS_DULL = 0.9;

// Saturation vapour pressure of water (kPa), Magnus formula (as HeatClear).
export const psat = (T) => 0.6112 * Math.exp((17.62 * T) / (243.12 + T));
export const hGas = (p) => 1 / (1 / (AIR_K / GAP) + 1 / Math.max(1e-12, 0.9 * p));
export const meanFreePath = (p, T = 50) => (KB * (T + K0)) / (Math.SQRT2 * Math.PI * D_AIR * D_AIR * Math.max(1e-9, p));
export const perCm3 = (p, T = 25) => (p / (KB * (T + K0))) * 1e-6;
// Rayleigh number of air in the gap: gβΔT L³ / (ν α), air near 50 °C: β = 1/323, ν = 1.8e-5, α = 2.5e-5.
export const rayleigh = (dT, p = P_ATM) => (9.81 * (1 / 323) * Math.abs(dT) * GAP ** 3) / (1.8e-5 * 2.5e-5) * (p / P_ATM) ** 2;

export function openLoss(T, Tr, A) { return A * 6 * ((T - Tr) + 16.5 * Math.max(0, psat(T) - psat(Tr))); }
export const MOUTH = Math.PI * 0.02 ** 2;

// Heat leaving the flask by each route (W). o: { kind, p, dull, stopper, fill }.
export function routes(T, Tr, o = {}) {
  const F = FLASK[o.kind || 'steel'], fill = o.fill ?? 1, p = o.p ?? P_GOOD;
  const e = o.dull ? EPS_DULL : F.eps, T1 = T + K0, T2 = Tr + K0;
  const wall = 0.6 + 0.4 * fill;                     // the wall above a part-filled drink runs a little cooler (estimate)
  const rad = (SIGMA * A_IN * wall * (T1 ** 4 - T2 ** 4)) / (2 / e - 1);
  const gas = hGas(p) * A_IN * wall * (T - Tr);
  const neck = F.neck * (T - Tr);
  const stop = o.stopper === false ? 0 : F.stop * (T - Tr);
  const open = o.stopper === false ? 0.5 * openLoss(T, Tr, MOUTH) : 0;
  return { gas, conv: 0, rad, neck, stop, open, total: gas + rad + neck + stop + open };
}
// Overall loss per degree near the given temperatures (W/K).
export const flaskUA = (T, Tr, o) => routes(T, Tr, o).total / (T - Tr || 1e-9);
export const flaskC = (kind, fill = 1) => fill * 0.5 * C_WATER + FLASK[kind].Cwall;
// The outside of the case: the heat crossing the gap must leave the case into the room.
export function caseTemp(T, Tr, o) {
  let To = Tr;
  for (let k = 0; k < 30; k++) {
    const r = routes(T, To, { ...o, stopper: true });
    const q = r.gas + r.rad;
    To = lerp(To, Tr + q / (H_OUT * A_OUT), 0.5);
  }
  return To;
}

// Mugs to compare (same 500 mL): a steel jug, 7 cm open top, 0.045 m² of side at 13 W/m²K
// (convection plus radiation), open top losing by convection and evaporation (HeatClear's figures);
// with a lid, the top only convects.
export const MUG = { A: 0.045, h: 13, top: Math.PI * 0.035 ** 2, Cwall: 100 };
export const mugLoss = (T, Tr, lid) => MUG.h * MUG.A * (T - Tr) + (lid ? MUG.h * MUG.top * (T - Tr) : openLoss(T, Tr, MUG.top));

// A cooling curve over `hours`: o = { vessel: 'flask'|'lid'|'open', kind, T0, Tr, fill, preheat, ... }.
// Without preheating, the drink first warms the cold inner wall: T = (C_drink·T0 + C_wall·T_room) ÷ C.
export function curve(o, hours = 12, every = 0.1) {
  const fill = o.fill ?? 1, Cd = fill * 0.5 * C_WATER;
  const Cw = o.vessel === 'flask' ? FLASK[o.kind || 'steel'].Cwall : MUG.Cwall, C = Cd + Cw;
  let T = o.preheat === false || o.vessel !== 'flask' ? (Cd * o.T0 + Cw * o.Tr) / C : o.T0;
  if (o.vessel !== 'flask') T = (Cd * o.T0 + Cw * o.Tr) / C;
  const rows = [[0, T]], dt = 30;
  let next = every;
  for (let t = dt; t <= hours * 3600 + 1; t += dt) {
    const q = o.vessel === 'flask' ? routes(T, o.Tr, o).total : mugLoss(T, o.Tr, o.vessel === 'lid');
    T -= (q * dt) / C;
    if (t / 3600 >= next - 1e-9) { rows.push([t / 3600, T]); next += every; }
  }
  return rows;
}
export const at = (rows, h) => { if (h <= 0) return rows[0][1]; for (let i = 1; i < rows.length; i++) if (rows[i][0] >= h) { const [a, b] = [rows[i - 1], rows[i]]; return lerp(a[1], b[1], (h - a[0]) / (b[0] - a[0] || 1)); } return rows.at(-1)[1]; };
// First time (h) the curve crosses `T` (going down for hot drinks, up for cold ones), or null.
export function crossing(rows, T) {
  const hot = rows[0][1] > T;
  for (let i = 1; i < rows.length; i++) { const y = rows[i][1]; if (hot ? y <= T : y >= T) { const [a, b] = [rows[i - 1], rows[i]]; return lerp(a[0], b[0], (T - a[1]) / (b[1] - a[1] || 1)); } }
  return null;
}

// ---------------------------------------------------------------- colours and numbers
export const COL = {
  hot: '#ff7a59', cold: '#6fb6ff', heat: '#ffb547', cond: '#ffb547', conv: '#5ce1a9', rad: '#ff5aa0',
  neck: '#c49bff', stop: '#8ef0ff', vac: '#7aa2ff', text: '#e8eef8', bad: '#ff5d5d', ok: '#5ce1a9',
};
export const hex = (c) => new THREE.Color(c).getHex();
export function fmtW(W) {
  const a = Math.abs(W);
  if (a >= 10) return Math.round(W) + ' W';
  if (a >= 0.1) return W.toFixed(a >= 1 ? 1 : 2) + ' W';
  if (a >= 0.001) return (W * 1000).toFixed(W * 1000 >= 10 ? 0 : 1) + ' mW';
  return '0 W';
}
export function fmtP(p) {
  if (p >= 1000) return (p / 1000).toFixed(p >= 1e4 ? 0 : 1) + ' kPa';
  if (p >= 1) return p.toFixed(p >= 10 ? 0 : 1) + ' Pa';
  const e = Math.floor(Math.log10(p)), m = p / 10 ** e;
  return `${m.toFixed(1)} × 10${sup(e)} Pa`;
}
export const sup = (n) => String(n).split('').map((c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]).join('');
export function fmtLen(m) {
  if (m >= 1) return m.toFixed(m >= 10 ? 0 : 1) + ' m';
  if (m >= 1e-3) return (m * 1000).toFixed(m >= 0.01 ? 0 : 1) + ' mm';
  if (m >= 1e-6) return (m * 1e6).toFixed(m >= 1e-5 ? 0 : 1) + ' µm';
  return (m * 1e9).toFixed(0) + ' nm';
}
export const fmtH = (h) => (h == null ? 'not in 12 h' : h >= 1 ? `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} min` : `${Math.round(h * 60)} min`);
export const link = (slug, name, hash = '') => `<a href="https://glassbox.how/${slug}/${hash ? '#' + hash : ''}">${name}</a>`;

const C_COLD = new THREE.Color(0x3b7bff), C_MID = new THREE.Color(0xe8eef8), C_HOT = new THREE.Color(0xff5a2a);
export function tempColor(T, lo = 0, hi = 100, out = new THREE.Color()) {
  const k = clamp((T - lo) / (hi - lo), 0, 1);
  return k < 0.5 ? out.copy(C_COLD).lerp(C_MID, k * 2) : out.copy(C_MID).lerp(C_HOT, (k - 0.5) * 2);
}
export const tempCss = (T, lo = 0, hi = 100) => '#' + tempColor(T, lo, hi).getHexString();

// ---------------------------------------------------------------- boards (live charts in 3D, as HeatClear)
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return { tex, redraw, canvas: c, mesh: m };
}
export function axes(g, w, h, { x0 = 84, x1 = w - 28, y0 = h - 64, y1 = 70, xMax, yMax, xMin = 0, yMin = 0, xTicks, yTicks, xFmt = String, yFmt = String, xLabel = '', yLabel = '', logX = false, logY = false }) {
  const lx = (v) => Math.log10(Math.max(v, 1e-30));
  const X = logX ? (x) => x0 + ((lx(x) - lx(xMin)) / (lx(xMax) - lx(xMin))) * (x1 - x0) : (x) => x0 + ((x - xMin) / (xMax - xMin)) * (x1 - x0);
  const Y = logY ? (y) => y0 - ((lx(y) - lx(yMin)) / (lx(yMax) - lx(yMin))) * (y0 - y1) : (y) => y0 - ((y - yMin) / (yMax - yMin)) * (y0 - y1);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '19px sans-serif';
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); const s = xFmt(t); g.fillText(s, X(t) - g.measureText(s).width / 2, y0 + 26); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); const s = yFmt(t); g.fillText(s, x0 - 10 - g.measureText(s).width, Y(t) + 6); }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '18px sans-serif';
  if (xLabel) g.fillText(xLabel, x1 - g.measureText(xLabel).width, y0 + 52);
  if (yLabel) g.fillText(yLabel, x0 + 8, y1 - 10);
  return { X, Y, x0, x1, y0, y1 };
}
export function title(g, text, sub = '') {
  g.fillStyle = COL.text; g.font = 'bold 24px sans-serif'; g.fillText(text, 20, 34);
  if (sub) { const x = 34 + g.measureText(text).width; g.font = '17px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(sub, x, 34); }
}
export function line(g, pts, X, Y, col, wdt = 5, dash = null) {
  if (pts.length < 2) return;
  g.strokeStyle = col; g.lineWidth = wdt; g.setLineDash(dash || []); g.lineJoin = 'round'; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.stroke(); g.setLineDash([]);
}
export function dot(g, x, y, col, r = 10) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
export function legend(g, items, x = 24, y = 50, font = 18) {
  g.font = `bold ${font}px sans-serif`;
  for (const [n, c] of items) { g.fillStyle = c; g.fillRect(x, y, 16, 16); g.fillStyle = COL.text; g.fillText(n, x + 22, y + 15); x += 36 + g.measureText(n).width; }
}
export function dashH(g, X0, X1, y, text = '', col = 'rgba(255,255,255,.5)', left = false) {
  g.strokeStyle = col; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); g.setLineDash([]);
  if (text) { g.font = '17px sans-serif'; g.fillStyle = col; const tw = g.measureText(text).width; g.fillText(text, left ? X0 + 6 : X1 - tw - 4, y - 8); }
}
export function dashV(g, x, Y0, Y1, text = '', col = 'rgba(255,255,255,.5)') {
  g.strokeStyle = col; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1); g.stroke(); g.setLineDash([]);
  if (text) { g.font = '17px sans-serif'; g.fillStyle = col; g.fillText(text, x + 6, Y1 + 18); }
}
export function bars(g, rows, { x = 20, y = 64, w = 600, rowH = 52, labelW = 230, unit = (v) => v, max = null } = {}) {
  const mx = max ?? Math.max(1e-9, ...rows.map((r) => Math.abs(r.value))) * 1.15, span = w - labelW - 20;
  rows.forEach((r, i) => {
    const yy = y + i * rowH, L = Math.min(span, (Math.abs(r.value) / mx) * span);
    g.font = 'bold 19px sans-serif'; g.fillStyle = r.color; g.fillText(r.label, x, yy + 24);
    g.globalAlpha = 0.85; g.fillRect(x + labelW, yy + 6, Math.max(2, L), rowH - 18); g.globalAlpha = 1;
    g.font = '18px sans-serif'; g.fillStyle = '#fff'; const t = r.text ?? unit(r.value), tw = g.measureText(t).width;
    g.fillText(t, x + labelW + L + 8 + tw > w ? x + labelW + L - tw - 8 : x + labelW + L + 8, yy + 25);
  });
}
export function wrap(g, text, x, y, maxW, lh) {
  let lineS = '', yy = y;
  for (const word of text.split(' ')) { const t = lineS ? lineS + ' ' + word : word; if (g.measureText(t).width > maxW && lineS) { g.fillText(lineS, x, yy); lineS = word; yy += lh; } else lineS = t; }
  if (lineS) g.fillText(lineS, x, yy);
  return yy;
}

// ---------------------------------------------------------------- dots and sparks
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function dots(n, r, color = 0xffffff, seg = 8) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const o = new THREE.Object3D(), col = new THREE.Color(color);
  for (let i = 0; i < n; i++) mesh.setColorAt(i, col);
  mesh.place = (i, x, y, z, s = 1) => { o.position.set(x, y, z); o.scale.setScalar(Math.max(0.0001, s)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); };
  mesh.tint = (i, c) => mesh.setColorAt(i, c);
  mesh.done = () => { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; };
  return mesh;
}
// Little sparks that drift from a source: step(dt, rate, at, vel, life). `path` (optional) moves
// each spark along its own function of age instead of a straight line.
export function sparks(parent, n, r, color, rnd) {
  const d = dots(n, r, color); parent.add(d);
  const P = Array.from({ length: n }, () => ({ life: 0, max: 1, p: [0, -99, 0], v: [0, 0, 0], f: null }));
  let acc = 0;
  return {
    mesh: d,
    step(dt, rate, at, vel, life = 1.2, path = null) {
      acc += rate * dt;
      for (let i = 0; i < n; i++) {
        const q = P[i];
        if (q.life <= 0 && acc >= 1) { acc -= 1; q.life = q.max = life * (0.8 + 0.4 * rnd()); q.p = at(); q.v = vel(q.p); q.f = path ? path(q.p, rnd()) : null; }
        if (q.life > 0) {
          q.life -= dt;
          if (q.f) { const k = 1 - q.life / q.max; q.p = q.f(k); } else { q.p[0] += q.v[0] * dt; q.p[1] += q.v[1] * dt; q.p[2] += q.v[2] * dt; }
        }
        const k = q.life / q.max;
        d.place(i, q.p[0], q.p[1], q.p[2], q.life > 0 ? 0.4 + 0.6 * Math.min(1, k * 3) : 0.0001);
      }
      if (acc > 20) acc = 20;
      d.done();
    },
    clear() { P.forEach((q) => { q.life = 0; }); acc = 0; },
  };
}

// ---------------------------------------------------------------- layout helpers (as HeatClear)
export const inReel = () => document.body.classList.contains('gb-reel');
// The readout sits at the upper left of the stage: on a wide stage nudge the picture right and down
// to clear it, on a phone just down, and in the reel not at all.
export function fitNarrow(stage, minor = [], wide = [0.14, -0.05]) {
  const narrow = stage.host.clientWidth < 560, reel = inReel();
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const [x, y] = reel ? [0, 0] : narrow ? [0, -0.14] : wide;
  if (!stage.shift || stage.shift[0] !== x || stage.shift[1] !== y) stage.setShift(x, y);
  return narrow;
}
// Boards sit beside the model; in the tall reel frame they stack above it.
export function reelBoards(boards, place) {
  const r = inReel();
  boards.forEach((b, i) => {
    if (!b.home) b.home = { p: b.mesh.position.clone(), s: b.mesh.scale.x };
    if (r && place) { const [x, y, z, s] = place(i); b.mesh.position.set(x, y, z); b.mesh.scale.setScalar(s); }
    else { b.mesh.position.copy(b.home.p); b.mesh.scale.setScalar(b.home.s); }
  });
}

// ---------------------------------------------------------------- the 3D flask
// The cut faces sit at angles π/2 and 2π; FACES picks a random angle just inside one of them.
export const nearFace = (u, w = 0.55) => (u < 0.5 ? Math.PI / 2 + 0.05 + u * 2 * w : Math.PI * 2 - 0.05 - (u - 0.5) * 2 * w);
// A solid of revolution about +y from a closed outline of [r, y] points. With `cut` it is drawn with
// a quarter removed (the quarter facing +x/+z, towards the usual camera) and the cut faces capped.
const CUT0 = Math.PI / 2, CUTL = Math.PI * 1.5;
export function revolve(outline, mat, { seg = 72, cut = true } = {}) {
  const g = new THREE.Group();
  const pts = outline.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
  const full = new THREE.Mesh(new THREE.LatheGeometry([...pts, pts[0]], seg), mat);
  const part = new THREE.Mesh(new THREE.LatheGeometry([...pts, pts[0]], seg, CUT0, CUTL), mat);
  [full, part].forEach((m) => { m.castShadow = true; m.receiveShadow = true; m.geometry.computeVertexNormals(); });
  const shape = new THREE.Shape(outline.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)));
  const capMat = mat.clone(); capMat.side = THREE.DoubleSide;
  const capA = new THREE.Mesh(new THREE.ShapeGeometry(shape), capMat);
  const capB = new THREE.Mesh(new THREE.ShapeGeometry(shape), capMat); capB.rotation.y = -Math.PI / 2;
  const cutG = new THREE.Group(); cutG.add(part, capA, capB);
  g.add(full, cutG);
  g.setCut = (on) => { full.visible = !on; cutG.visible = on; };
  g.setCut(cut);
  g.mats = [mat, capMat];
  return g;
}
// A thin wall following a path of [r, y] points (outside face), `t` thick, offset inwards.
export function wall(path, t) { return [...path, ...path.slice().reverse().map(([r, y]) => [Math.max(0, r - t), y])]; }

// The generic flask. kind: 'steel' (welded double steel wall) or 'glass' (a silvered glass refill in
// a case). Returns its parts and the numbers the chapters use to place heat sparks.
export function makeFlask({ kind = 'steel', cut = true, caseColor = 0x3d6f8f, face = true } = {}) {
  const g = new THREE.Group(), steel = kind === 'steel';
  if (face) g.rotation.y = -Math.PI / 4;      // turn the cut quarter towards a camera on +z
  const caseMat = steel ? M.metal(0xb8bfca, { roughness: 0.32 }) : M.plastic(caseColor, { roughness: 0.4 });
  const mirror = M.metal(0xf0f3f8, { roughness: steel ? 0.12 : 0.04, metalness: 1 });
  // Radii (units of 5 cm): outer wall of the vacuum jacket, inner wall, neck.
  const D = steel ? { ro: 0.8, ri: 0.6, rn: 0.4, rno: 0.56, top: 5.05, bot: 0.26 } : { ro: 0.72, ri: 0.54, rn: 0.38, rno: 0.5, top: 5.0, bot: 0.3 };
  const parts = {};
  // Inner bottle (its outside face is the shiny surface facing the gap).
  const innerPath = [[0, D.bot], [D.ri - 0.05, D.bot], [D.ri, D.bot + 0.06], [D.ri, 4.1], [D.ri - 0.08, 4.4], [D.rn + 0.03, 4.62], [D.rn, 4.75], [D.rn, D.top]];
  parts.inner = revolve(wall(innerPath, steel ? 0.03 : 0.05), steel ? mirror : M.glass({ color: 0xe8f0ff, transmission: 0.2, opacity: 0.85, metalness: 0.9, roughness: 0.04 }), { cut });
  // Outer wall of the jacket: for steel this is the case itself; for glass it is the refill's outer glass.
  const outerPath = [[0, D.bot - 0.2], [D.ro - 0.06, D.bot - 0.2], [D.ro, D.bot - 0.12], [D.ro, 4.25], [D.ro - 0.06, 4.5], [D.rno + 0.02, 4.72], [D.rno, 4.8], [D.rno, D.top]];
  parts.outer = revolve(wall(outerPath, steel ? 0.03 : 0.05), steel ? caseMat : M.glass({ color: 0xe8f0ff, transmission: 0.2, opacity: 0.85, metalness: 0.9, roughness: 0.04 }), { cut });
  // The ring where the two walls join: the only place they touch.
  parts.lip = revolve([[D.rn, D.top - 0.06], [D.rno, D.top - 0.06], [D.rno, D.top + 0.02], [D.rn, D.top + 0.02]], M.metal(0xd8dee8, { roughness: 0.25 }), { cut });
  parts.lipMat = parts.lip.mats;
  // A faint blue fill shows where the vacuum is.
  parts.gap = revolve([[D.ri + 0.01, D.bot + 0.04], [D.ro - 0.01, D.bot - 0.1], [D.ro - 0.01, 4.25], [D.ro - 0.07, 4.5], [D.rno - 0.01, 4.72], [D.rno - 0.01, D.top - 0.07], [D.rn + 0.01, D.top - 0.07], [D.rn + 0.01, 4.75], [D.rn + 0.04, 4.62], [D.ri - 0.07, 4.4], [D.ri + 0.01, 4.1]], M.ghost(0x7aa2ff, 0.16), { cut });
  parts.gap.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 2; } });
  g.add(parts.inner, parts.outer, parts.lip, parts.gap);
  if (!steel) {
    // Glass refill: sealed tip at the bottom where the air was pumped out, a case around it, a base
    // cap with a soft pad, and a collar that grips the neck.
    parts.tip = revolve([[0, D.bot - 0.2], [0.07, D.bot - 0.2], [0.05, D.bot - 0.36], [0, D.bot - 0.4]], M.glass({ color: 0xdfe8ff, transmission: 0.5 }), { cut });
    g.add(parts.tip);
    parts.case = revolve(wall([[0.86, 0.1], [0.86, 4.3], [0.8, 4.55], [0.62, 4.76], [0.6, 4.86], [0.6, 5.06]], 0.04), caseMat, { cut });
    parts.base = revolve([[0, -0.08], [0.88, -0.08], [0.9, 0.0], [0.9, 0.42], [0.86, 0.42], [0.86, 0.06], [0, 0.06]], M.plastic(0x2a2f38), { cut });
    parts.pad = revolve([[0, 0.06], [0.4, 0.06], [0.4, 0.12], [0, 0.12]], M.matte(0x55606e), { cut });
    parts.collar = revolve(wall([[0.61, 4.82], [0.61, 5.1]], 0.1), M.plastic(0x2a2f38), { cut });
    g.add(parts.case, parts.base, parts.pad, parts.collar);
  } else {
    parts.base = revolve([[0, 0.0], [D.ro - 0.02, 0.0], [D.ro + 0.01, 0.03], [D.ro + 0.01, 0.12], [0, 0.12]], M.plastic(0x2a2f38), { cut });
    g.add(parts.base);
  }
  // The drink: a unit-tall column scaled to the fill level.
  const liqMat = new THREE.MeshStandardMaterial({ color: 0xc8823c, roughness: 0.15, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
  parts.drink = revolve([[0, 0], [D.ri - (steel ? 0.04 : 0.06), 0], [D.ri - (steel ? 0.04 : 0.06), 1], [0, 1]], liqMat, { cut });
  parts.drink.position.y = D.bot + 0.03; parts.liqMat = liqMat;
  g.add(parts.drink);
  const yFull = 4.05;
  parts.setFill = (f) => { const h = Math.max(0.01, (yFull - D.bot) * clamp(f, 0.02, 1)); parts.drink.scale.y = h; parts.level = D.bot + 0.03 + h; };
  parts.setFill(1);
  // Stopper: a plastic plug with a silicone ring, and a domed head.
  const stopper = new THREE.Group();
  const plugMat = M.plastic(0x3a3f4b, { roughness: 0.5 });
  stopper.add(revolve([[0, 4.62], [D.rn - 0.04, 4.62], [D.rn - 0.02, 4.68], [D.rn - 0.02, D.top + 0.05], [D.rno + 0.02, D.top + 0.05], [D.rno + 0.02, D.top + 0.32], [D.rno - 0.06, D.top + 0.4], [0, D.top + 0.42]], plugMat, { cut }));
  const seal = torus(D.rn - 0.01, 0.035, M.matte(0xd8dde6, { roughness: 0.6 }), 48); seal.rotation.x = Math.PI / 2; seal.position.y = 4.88; stopper.add(seal);
  g.add(stopper); parts.stopper = stopper; parts.seal = seal;
  // The cup that screws over the top.
  const cupMat = steel ? M.metal(0xb8bfca, { roughness: 0.32 }) : M.plastic(caseColor, { roughness: 0.4 });
  parts.cup = revolve(wall([[0.9, 4.32], [0.9, 5.82], [0.86, 5.9], [0, 5.9]], 0.035), cupMat, { cut });
  g.add(parts.cup);
  parts.D = D; parts.steel = steel; parts.caseMat = caseMat; parts.mirror = mirror; parts.cupMat = cupMat;
  parts.setCut = (on) => g.traverse((o) => o.setCut && o.setCut(on));
  parts.group = g;
  return parts;
}

// A plain thermometer column with a bulb: setT(T) scales it between lo and hi.
export function thermometer(parent, x, y0, h, z = 0, lo = 0, hi = 100) {
  const g = new THREE.Group(); g.position.set(x, y0, z); parent.add(g);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, h, 16, 1, true), M.clear(0xffffff, 0.25)); glass.position.y = h / 2; g.add(glass);
  const mat = M.glow(0xff5a4a), bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 12), mat); g.add(bulb);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 12), mat); g.add(col);
  g.setT = (T) => { const k = clamp((T - lo) / (hi - lo), 0.02, 1) * h; col.scale.y = k; col.position.y = k / 2; tempColor(T, lo, hi, mat.color); };
  return g;
}

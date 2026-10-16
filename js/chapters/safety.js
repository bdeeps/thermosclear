// Chapter 5: using a flask safely. Four cases, all computed:
//  - Food kept warm: a 500 mL wide-mouth steel food jar holding 400 g of dal (c ≈ 3,800 J/kg·K, mostly
//    water; our estimate) plus 70 J/K of inner wall. Its gap and walls are as the steel flask, but its
//    7 cm mouth widens the neck ring (22 cm round → 0.024 W/K) and the lid (≈ 3 × the stopper's area
//    → 0.02 W/K) (scaled from thermos.js; estimates).
//    WHO, Five Keys to Safer Food (key 4, as PAHO/WHO publish it): "keep cooked food piping hot (more
//    than 60°C) prior to serving", chill "preferably below 5°C", and do not leave cooked food at room
//    temperature for more than 2 hours. (FridgeClear uses the same 5–60 °C band.)
//  - A hot drink sealed in, then cooling: the headspace holds air and water vapour at 1 atm when you
//    close it. Later p = (p_atm − p_sat(T₀)) × T/T₀ (kelvin) + p_sat(T): the air cools and the vapour
//    condenses, so the pressure inside falls below the room's and pulls the stopper in.
//  - A fizzy drink: CO₂ shares itself between the drink and the headspace (Henry's law),
//    p = n ÷ (k_H·V_drink + V_head ÷ RT), with k_H = 0.034 mol/(L·atm) at 25 °C and
//    d(ln k_H)/d(1/T) = 2,400 K (Sander, Compilation of Henry's law constants, 2015). A typical
//    soft drink carries about 3.5 volumes of CO₂ (≈ 7 g/L; a common industry figure). 450 mL of drink,
//    50 mL of headspace. Pouring loses some gas, so these are upper limits.
//  - Fermenting: yeast turns sugar into alcohol and CO₂, C₆H₁₂O₆ → 2 C₂H₅OH + 2 CO₂, so each gram of
//    sugar makes 0.49 g (11 mmol) of CO₂, shared as above, at 30 °C, on top of the headspace air.
//  Force on a stopper 4 cm across: (p_inside − p_outside) × 1.26 × 10⁻³ m².
//  Scalds: the US Consumer Product Safety Commission says water at 60 °C (140 °F) causes a serious
//  burn in about 6 seconds, and at about 66 °C (150 °F) in about 2 seconds (Tap Water Scalds alert).
import {
  THREE, M, makeFlask, revolve, wall, routes, curve, at, crossing, psat, K0, C_WATER, COL, hex, fmtW, fmtH, link,
  board, panelBg, axes, title, line, legend, dashH, dot, fitNarrow, inReel, reelBoards, tempColor, tempCss, clamp, sparks, rng,
} from '../thermos.js';
import { arrow } from '../kit.js';

const VIEW = { pos: [2.4, 4.4, 11.4], target: [1.9, 3.4, 0] };
const A_STOP = Math.PI * 0.02 ** 2, ATM = 101.325;
const kH = (T) => 0.034 * Math.exp(2400 * (1 / (T + K0) - 1 / 298.15));       // mol/(L·atm)
const V_DRINK = 0.45, V_HEAD = 0.05, R_L = 0.082057;                            // L, L·atm/(mol·K)
const N_SODA = (3.5 * V_DRINK) / 22.414;                                        // mol of CO₂ in 450 mL of a 3.5-volume drink
// CO₂'s own pressure in the headspace (kPa). The air sealed in stays at about 1 atm, so this is how far the
// inside is above the room.
export const sodaP = (T) => N_SODA / (kH(T) * V_DRINK + V_HEAD / (R_L * (T + K0))) * ATM;
export const fermentP = (g, T = 30) => ATM + ((g / 180) * 2) / (kH(T) * V_DRINK + V_HEAD / (R_L * (T + K0))) * ATM;   // kPa absolute
export const sealedP = (T0, T) => (ATM - psat(T0)) * (T + K0) / (T0 + K0) + psat(T);
// Food jar: heat budget at temperature T.
const JAR = { C: 0.4 * 3800 + 70, neck: 0.024, lid: 0.02 };
function jarCurve(T0, Tr, hours = 12) {
  const rows = [[0, T0]], dt = 30; let T = T0, next = 0.1;
  for (let t = dt; t <= hours * 3600 + 1; t += dt) {
    const r = routes(T, Tr, { kind: 'steel', fill: 1 });
    const q = r.rad + r.gas + (JAR.neck + JAR.lid) * (T - Tr);
    T -= (q * dt) / JAR.C;
    if (t / 3600 >= next - 1e-9) { rows.push([t / 3600, T]); next += 0.1; }
  }
  return rows;
}
const CASES = {
  food: { n: 'Food kept warm' }, sealed: { n: 'Hot drink sealed' }, fizz: { n: 'Fizzy drink' }, ferment: { n: 'Fermenting drink' },
};

export default {
  id: 'safety',
  short: 'Using it safely',
  title: 'Using a flask safely',
  subtitle: 'Hot enough to scald, sealed tight enough to push, and warm enough to grow germs.',
  view: VIEW,
  learn: `<p>A flask is good at one thing: slowing heat down. That makes it safe for some jobs and risky for others.</p>
    <p><b>Scalds.</b> A flask keeps a drink scalding for hours. The US Consumer Product Safety Commission says water at <b>60 °C</b> can cause a serious burn in about <b>6 seconds</b>, and at 66 °C in about 2. Pour slowly, away from your body, keep flasks out of small children's reach, and let the cup cool: IARC calls drinks above 65 °C "very hot".</p>
    <p><b>Never seal in anything fizzy or fermenting.</b> A stopper is made to keep heat in, not to hold pressure. Carbon dioxide from a soft drink, or from yeast in a fermenting drink, can push on a 4 cm stopper with the weight of several kilograms, or tens of kilograms. It can blow the stopper out or spray the drink when you open it. Flask makers' instructions say the same.</p>
    <p><b>Hot sealed drinks can stick.</b> As a drink cools, the air above it shrinks and the steam turns back to water, so the pressure inside drops and the room's air holds the stopper in. Loosen it slowly.</p>
    <p><b>Food kept warm.</b> Germs in food grow best between about <b>5 and 60 °C</b>. The WHO's advice is plain: keep cooked food <b>piping hot, above 60 °C</b>, keep it cold below 5 °C, and don't leave it at room temperature for more than 2 hours. FSSAI's hygiene rules for food businesses also ask that hot food stays hot and cold food stays at 5 °C or colder. A food jar slowly drifts down into that band, so pack food boiling hot, and eat it within the time the model shows. The same goes for milk.</p>
    <p class="tip"><b>Try it:</b> see how long dal stays above 60 °C on a hot day. Then seal a cold soft drink, warm it up and watch the force on the stopper.</p>`,
  terms: [
    { t: 'Scald', d: 'A burn from hot liquid or steam.' },
    { t: 'Danger zone', d: 'About 5 to 60 °C: the temperatures where germs in food multiply fastest.' },
    { t: "Henry's law", d: 'The amount of gas a liquid holds depends on the gas pressure above it. Warm liquids hold less, so warm fizzy drinks push harder.' },
    { t: 'Fermentation', d: 'Yeast turning sugar into alcohol and carbon dioxide gas.' },
    { t: 'Partial vacuum', d: 'Pressure lower than the air outside. A cooling sealed flask makes one, which grips the stopper.' },
  ],
  defaults: { cas: 'food', T0: 85, room: 30, t: 0, play: true, fizzT: 25, sugar: 2 },
  controls: [
    { key: 'cas', type: 'seg', label: 'What\'s inside', options: Object.entries(CASES).map(([v, c]) => ({ v, label: c.n })) },
    { key: 'T0', type: 'range', label: 'Food or drink when packed', min: 65, max: 95, step: 1, ends: ['65 °C', '95 °C'], fmt: (v) => v + ' °C', hint: 'For food kept warm and the sealed hot drink.' },
    { key: 'room', type: 'range', label: 'Room', min: 10, max: 40, step: 1, ends: ['10 °C', '40 °C'], fmt: (v) => v + ' °C' },
    { key: 't', type: 'range', label: 'Hours since packing', min: 0, max: 12, step: 0.05, ends: ['0 h', '12 h'], fmt: (v) => fmtH(v) },
    { key: 'fizzT', type: 'range', label: 'Fizzy drink temperature', min: 4, max: 40, step: 1, ends: ['4 °C', '40 °C'], fmt: (v) => v + ' °C' },
    { key: 'sugar', type: 'range', label: 'Sugar the yeast has used', min: 0, max: 5, step: 0.1, ends: ['0 g', '5 g'], fmt: (v) => v.toFixed(1) + ' g' },
  ],
  onChange(s, key) {
    if (key === 'T0' && !['food', 'sealed'].includes(s.cas)) s.cas = 'food';
    if (key === 'fizzT') s.cas = 'fizz';
    if (key === 'sugar') s.cas = 'ferment';
    if (key === 't') { s.play = false; if (!['food', 'sealed'].includes(s.cas)) s.cas = 'food'; }
    if (key === 'cas' || key === 'T0' || key === 'room') { s.t = 0; s.play = true; }
  },
  quiz: [
    { q: 'Why should you never put a fizzy drink in a sealed flask?', options: ['It goes flat at once', 'The gas builds pressure that can blow the stopper out or spray the drink', 'It damages the vacuum', 'Fizzy drinks conduct heat'], answer: 1, why: 'Carbon dioxide comes out of the drink into the small space under the stopper. The stopper isn\'t made to hold that pressure.' },
    { q: 'What does the WHO advise for cooked food kept hot?', options: ['Above 60 °C', 'Between 20 and 40 °C', 'Exactly 37 °C', 'Any temperature is fine for a day'], answer: 0, why: 'Germs grow fastest between about 5 and 60 °C, so cooked food should be kept piping hot, above 60 °C, or cooled below 5 °C.' },
    { q: 'A flask of hot tea has cooled overnight and the stopper is stuck. Why?', options: ['The tea froze', 'The vacuum leaked into the tea', 'The air inside shrank and the steam condensed, so the pressure outside pushes the stopper in', 'The tea expanded'], answer: 2, why: 'Cooling lowers the pressure in the space above the tea, so the room\'s air presses the stopper in. Loosen it slowly to let air back.' },
  ],
  reel: [
    { ms: 5000, caption: 'Never seal a fizzy drink in a flask: as it warms, its gas can push on the stopper like a weight of tens of kilograms.', set: { cas: 'fizz', room: 30, play: false }, anim: { fizzT: [4, 35] }, view: { pos: [0.3, 5.8, 6.6], target: [0.2, 5.3, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(17);
    let S = {}, key = '', runs = null, rkey = '';
    const F = makeFlask({ kind: 'steel', cut: true }); root.add(F.group); F.cup.visible = false;
    // the food jar: squat, wide mouth, with a screw lid
    const jar = new THREE.Group(); root.add(jar);
    const jm = M.metal(0xb8bfca, { roughness: 0.32 });
    jar.add(revolve(wall([[0, 0.05], [0.9, 0.05], [0.95, 0.12], [0.95, 2.7], [0.82, 2.9], [0.8, 3.05]], 0.03), jm));
    jar.add(revolve(wall([[0, 0.25], [0.7, 0.25], [0.75, 0.32], [0.75, 2.8], [0.8, 3.05]], 0.03), F.mirror));
    const dalMat = new THREE.MeshStandardMaterial({ color: 0xe0a630, roughness: 0.4, side: THREE.DoubleSide });
    const dal = revolve([[0, 0.28], [0.72, 0.28], [0.72, 2.4], [0, 2.4]], dalMat); jar.add(dal);
    const jlid = revolve([[0, 3.05], [0.86, 3.05], [0.86, 3.35], [0.8, 3.4], [0, 3.4]], M.plastic(0x3a3f4b)); jar.add(jlid);
    const up = arrow(0xff5d5d, 1, 0.3, 0.06), down = arrow(0x6fb6ff, 1, 0.3, 0.06);
    root.add(up, down);
    down.rotation.z = Math.PI;
    const bub = sparks(root, 80, 0.04, 0xf2f6ff, rnd);
    const lF = stage.label('', [0, 0, 0], root, 'hot'), lIn = stage.label('', [0, 0, 0], root, 'hot');

    const bA = board(root, 5.0, 3.2, 540, 346, (g, w, h) => {
      panelBg(g, w, h);
      if (!runs) return;
      if (S.cas === 'food' || S.cas === 'sealed') {
        const food = S.cas === 'food', rows = food ? runs.food : runs.drink;
        if (food) {
          title(g, 'Food jar over 12 hours', `400 g of dal, ${S.room} °C room`);
          const { X, Y } = axes(g, w, h, { x0: 70, y1: 72, y0: h - 46, xMax: 12, yMin: 0, yMax: 100, xTicks: [0, 2, 4, 6, 8, 10, 12], yTicks: [0, 20, 40, 60, 80, 100], xFmt: (v) => v + ' h', yFmt: (v) => v + '°' });
          g.fillStyle = 'rgba(255,93,93,.12)'; g.fillRect(X(0), Y(60), X(12) - X(0), Y(5) - Y(60));
          dashH(g, X(0), X(12), Y(60), 'WHO: keep hot food above 60 °C', 'rgba(255,93,93,.9)');
          g.font = '17px sans-serif'; g.fillStyle = 'rgba(255,93,93,.8)'; g.fillText('5–60 °C: germs grow fastest', X(0) + 8, Y(30));
          line(g, rows, X, Y, '#ffb547', 3, [6, 6]); line(g, rows.filter((r) => r[0] <= S.t + 1e-6), X, Y, '#ffb547', 5); dot(g, X(S.t), Y(at(rows, S.t)), '#ffb547', 8);
        } else {
          title(g, 'Pressure under the stopper', `sealed at ${S.T0} °C`);
          const pts = rows.map(([hh, T]) => [hh, sealedP(S.T0, T)]);
          const { X, Y } = axes(g, w, h, { x0: 80, y1: 72, y0: h - 46, xMax: 12, yMin: 0, yMax: 120, xTicks: [0, 2, 4, 6, 8, 10, 12], yTicks: [0, 25, 50, 75, 100], xFmt: (v) => v + ' h', yFmt: (v) => v + ' kPa' });
          dashH(g, X(0), X(12), Y(ATM), 'room air 101 kPa', 'rgba(111,182,255,.8)');
          line(g, pts, X, Y, '#6fb6ff', 3, [6, 6]); line(g, pts.filter((r) => r[0] <= S.t + 1e-6), X, Y, '#6fb6ff', 5); dot(g, X(S.t), Y(sealedP(S.T0, at(rows, S.t))), '#6fb6ff', 8);
        }
      } else if (S.cas === 'fizz') {
        title(g, 'Push on the stopper', 'fizzy drink, 3.5 volumes of CO₂');
        const pts = []; for (let T = 0; T <= 40; T += 1) pts.push([T, sodaP(T) * A_STOP * 1000 / 9.81]);
        const { X, Y } = axes(g, w, h, { x0: 80, y1: 72, y0: h - 46, xMax: 40, yMin: 0, yMax: 80, xTicks: [0, 10, 20, 30, 40], yTicks: [0, 20, 40, 60, 80], xFmt: (v) => v + ' °C', yFmt: (v) => v + ' kg' });
        line(g, pts, X, Y, '#ff5d5d', 5); dot(g, X(S.fizzT), Y(sodaP(S.fizzT) * A_STOP * 1000 / 9.81), '#ff5d5d', 8);
        g.font = '17px sans-serif'; g.fillStyle = 'rgba(255,255,255,.65)'; g.fillText('as a weight pressing on a 4 cm stopper', 90, h - 70);
      } else {
        title(g, 'Push on the stopper', 'fermenting, 30 °C');
        const pts = []; for (let gg = 0; gg <= 5.001; gg += 0.1) pts.push([gg, (fermentP(gg) - ATM) * A_STOP * 1000 / 9.81]);
        const { X, Y } = axes(g, w, h, { x0: 80, y1: 72, y0: h - 46, xMax: 5, yMin: 0, yMax: 80, xTicks: [0, 1, 2, 3, 4, 5], yTicks: [0, 20, 40, 60, 80], xFmt: (v) => v + ' g', yFmt: (v) => v + ' kg', xLabel: 'sugar used by yeast' });
        line(g, pts, X, Y, '#ff5d5d', 5); dot(g, X(S.sugar), Y((fermentP(S.sugar) - ATM) * A_STOP * 1000 / 9.81), '#ff5d5d', 8);
      }
    }, [4.3, 3.2, 0]);

    return {
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, [], [0.05, -0.1]);
        reelBoards([bA], () => [0.4, 9.3, 0, 1.05]);
        const rk = `${s.T0}|${s.room}`;
        if (rk !== rkey) { rkey = rk; runs = { food: jarCurve(s.T0, s.room), drink: curve({ vessel: 'flask', kind: 'steel', T0: s.T0, Tr: s.room, fill: 0.9 }) }; }
        if (s.play && !inReel() && (s.cas === 'food' || s.cas === 'sealed')) { s.t = Math.min(12, s.t + 0.5 * dt); if (s.t >= 12) s.play = false; }
        const food = s.cas === 'food';
        jar.visible = food; F.group.visible = !food;
        let dP = 0, T = 0;                                       // kPa, inside minus outside
        if (food) { T = at(runs.food, s.t); tempColor(T, 0, 100, dalMat.color).lerp(new THREE.Color(0xe0a630), 0.6); }
        else if (s.cas === 'sealed') { T = at(runs.drink, s.t); dP = sealedP(s.T0, T) - ATM; tempColor(T, 0, 100, F.liqMat.color); }
        else if (s.cas === 'fizz') { T = s.fizzT; dP = sodaP(T); F.liqMat.color.setHex(0x5a2a14); }
        else { T = 30; dP = fermentP(s.sugar) - ATM; F.liqMat.color.setHex(0xd9c27a); }
        F.setFill(0.9);
        const N = dP * 1000 * A_STOP, kg = Math.abs(N) / 9.81;
        const top = F.D.top + 0.45;
        up.position.set(0, top + 0.05, 0); up.set(clamp(0.4 + kg * 0.05, 0.4, 2.2));
        const Ld = clamp(0.4 + kg * 0.05, 0.4, 2.2); down.position.set(0, top + 0.1 + Ld, 0); down.set(Ld);
        up.visible = !food && N > 1; down.visible = !food && N < -1;
        const gas = s.cas === 'fizz' || s.cas === 'ferment';
        bub.step(dt, gas ? 25 : 0, () => [(rnd() - 0.5) * 0.9, 0.4 + rnd() * 1.5, 0.15 + rnd() * 0.35], () => [0, 0.8 + rnd() * 0.5, 0], 2.4);
        lF.element.style.setProperty('--c', N > 0 ? COL.bad : COL.cold);
        if (food) { lF.position.set(0, 3.9, 0); lF.element.innerHTML = `dal <b>${T.toFixed(1)} °C</b> ${T >= 60 ? '· above 60 °C' : '· in the 5–60 °C band'}`; lF.element.style.setProperty('--c', T >= 60 ? COL.ok : COL.bad); }
        else { lF.position.set(0, top + 3.4, 0); lF.element.innerHTML = Math.abs(N) < 1 ? 'no push on the stopper' : N > 0 ? `pushing out <b>${N.toFixed(0)} N</b> · like ${kg.toFixed(0)} kg` : `pulling in <b>${(-N).toFixed(0)} N</b> · like ${kg.toFixed(1)} kg`; }
        lIn.visible = !food; lIn.position.set(1.4, 1.3, 0.6); lIn.element.style.setProperty('--c', COL.text); lIn.element.innerHTML = `inside <b>${(ATM + dP).toFixed(0)} kPa</b>`;
        const kk = `${s.cas}|${s.T0}|${s.room}|${s.t.toFixed(2)}|${s.fizzT}|${s.sugar}`;
        if (kk !== key) { key = kk; bA.redraw(); }
      },
      readout: (s) => {
        if (!runs) return '';
        if (s.cas === 'food') {
          const r = runs.food, t60 = crossing(r, 60);
          return `<div class="big">${s.t.toFixed(1)} h: ${at(r, s.t).toFixed(1)} °C</div>
            <div class="row"><span>Stays above 60 °C for</span><b ${t60 && t60 < 4 ? 'class="no"' : ''}>${t60 == null ? 'all 12 h' : fmtH(t60)}</b></div>
            <div class="row"><span>After 6 h · 12 h</span><b>${at(r, 6).toFixed(0)} · ${at(r, 12).toFixed(0)} °C</b></div>
            <div class="row"><span>Food jar: 7 cm mouth, UA</span><b>${((routes(80, s.room, { kind: 'steel' }).rad + routes(80, s.room, { kind: 'steel' }).gas) / (80 - s.room) * 1000 + (JAR.neck + JAR.lid) * 1000).toFixed(0)} mW/K</b></div>
            <small>A wide mouth leaks more than a narrow flask. Pack food boiling hot and eat it while it is still above 60 °C.</small>`;
        }
        if (s.cas === 'sealed') {
          const T = at(runs.drink, s.t), p = sealedP(s.T0, T), N = (ATM - p) * 1000 * A_STOP;
          return `<div class="big">Sealed at ${s.T0} °C, now ${T.toFixed(0)} °C</div>
            <div class="row"><span>Pressure inside</span><b>${p.toFixed(0)} kPa</b></div>
            <div class="row"><span>Steam in the headspace</span><b>${psat(T).toFixed(0)} kPa (was ${psat(s.T0).toFixed(0)})</b></div>
            <div class="row"><span>Room air holds the stopper in with</span><b>${N.toFixed(0)} N</b></div>
            <small>If the seal is airtight. Loosen the stopper slowly to let air in.</small>`;
        }
        if (s.cas === 'fizz') {
          const p = sodaP(s.fizzT), N = p * 1000 * A_STOP;
          return `<div class="big">Up to ${p.toFixed(0)} kPa above the room</div>
            <div class="row"><span>CO₂ the drink holds at ${s.fizzT} °C (Henry)</span><b>${kH(s.fizzT).toFixed(3)} mol/L·atm</b></div>
            <div class="row"><span>Push on a 4 cm stopper</span><b class="no">${N.toFixed(0)} N · like ${(N / 9.81).toFixed(0)} kg</b></div>
            <small>Warm drinks hold less gas, so it comes out and pushes harder. Pouring loses some gas, so real pressures are lower, but still far more than a stopper is made for.</small>`;
        }
        const n = (s.sugar / 180) * 2, p = fermentP(s.sugar), N = (p - ATM) * 1000 * A_STOP;
        return `<div class="big">${(p - ATM).toFixed(0)} kPa above the room</div>
          <div class="row"><span>CO₂ made from ${s.sugar.toFixed(1)} g of sugar</span><b>${(n * 44).toFixed(2)} g · ${(n * 1000).toFixed(0)} mmol</b></div>
          <div class="row"><span>Push on a 4 cm stopper</span><b class="no">${N.toFixed(0)} N · like ${(N / 9.81).toFixed(0)} kg</b></div>
          <small>A spoonful of sugar is about 4 g. Live yeast keeps going for hours, so the pressure keeps rising.</small>`;
      },
    };
  },
};

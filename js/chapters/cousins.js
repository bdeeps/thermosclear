// Chapter 6: cousins of the flask, and where the idea came from.
//  - Dewar flask of liquid nitrogen (boils at −196 °C, 77 K; latent heat 199 kJ/kg; liquid density
//    807 kg/m³). A 1 L silvered glass Dewar: 0.05 m² of inner wall, ε = 0.03 on both faces, so
//    radiation σA(T_room⁴ − T⁴) ÷ (2/ε − 1); a long, thin glass neck, 0.0015 W/K (estimate); the mouth is
//    only loosely capped so the boiling gas can escape. Boil-off = watts ÷ latent heat.
//  - Windows: heat through 1 m² of glazing, q = U·ΔT, between a 24 °C air-conditioned room and a 40 °C
//    afternoon (sunlight left out). U: single glazing about 5.8 W/m²K, double glazing about 2.8
//    (Brussels energy agency table, as quoted by search results), vacuum glazing about 1.1
//    (Pilkington's figure for Spacia after tests); vacuum glazing keeps glass a fraction of a
//    millimetre apart with tiny pillars.
//  - Insulated casserole (the "hot pot" of Indian homes): steel inside, plastic outside, polyurethane
//    foam between (k = 0.022 W/m·K, as HeatClear), no vacuum. 1.5 L pot, 0.085 m² of walls and lid,
//    15 mm of foam with 10 W/m²K on the outside: U = 1 ÷ (0.015/0.022 + 1/10) = 1.28 W/m²K, plus
//    0.03 W/K for the lid's rim (estimate), UA ≈ 0.14 W/K. Holding 1 kg of dal (c ≈ 3,800 J/kg·K) and
//    0.3 kg of steel, C ≈ 3,950 J/K. Compared with the steel flask of thermos.js.
import {
  THREE, M, makeFlask, revolve, wall, routes, curve, crossing, at, flaskC, SIGMA, K0, COL, hex, fmtW, fmtH, link,
  fitNarrow, inReel, sparks, rng, clamp, box, tempColor,
} from '../thermos.js';

const VIEW = { pos: [1.4, 4.6, 12.2], target: [0.6, 3.0, 0] };
const LN2 = { T: -196, L: 199000, rho: 807, A: 0.05, eps: 0.03, neck: 0.0015 };
export function dewar(Tr = 25) {
  const T1 = Tr + K0, T2 = LN2.T + K0;
  const rad = (SIGMA * LN2.A * (T1 ** 4 - T2 ** 4)) / (2 / LN2.eps - 1), neck = LN2.neck * (Tr - LN2.T), W = rad + neck;
  const kgDay = (W * 86400) / LN2.L;
  return { rad, neck, W, kgDay, Lday: kgDay / LN2.rho * 1000 };
}
const GLAZE = { single: { n: 'Single glass', U: 5.8 }, double: { n: 'Double glazing', U: 2.8 }, vacuum: { n: 'Vacuum glazing', U: 1.1 } };
const POT = { UA: 1.28 * 0.085 + 0.03, C: 1 * 3800 + 0.3 * 500 };
function potCurve(T0, Tr, hours = 12) {
  const rows = [[0, T0]]; let T = T0;
  for (let t = 60; t <= hours * 3600; t += 60) { T -= (POT.UA * (T - Tr) * 60) / POT.C; if (t % 360 === 0) rows.push([t / 3600, T]); }
  return rows;
}
const LIST = { dewar: 'Lab Dewar', window: 'Windows', pot: 'Hot pot', flask: 'Flask' };

export default {
  id: 'cousins',
  short: 'Cousins and history',
  title: 'Cousins of the flask',
  subtitle: 'From a scientist\'s bottle of liquid air to double glazing and the casserole on the dining table.',
  view: VIEW,
  learn: `<p>The flask began in a laboratory. In 1892 the Scottish chemist <b>James Dewar</b>, at the Royal Institution in London, needed to keep liquefied gases cold long enough to study them. He put one glass flask inside another and pumped out the space between them. It was first shown on <b>Christmas Day 1892</b>; later he narrowed the neck and silvered the walls. He never patented it.</p>
    <p>In 1903 the German glassblower <b>Reinhold Burger</b> patented a version for everyday use, protected by a metal case, and in 1904 registered the name <b>Thermos</b>, from the Greek <i>thermē</i>, heat. The company says the name came from a public competition, won by a resident of Munich. Dewar went to court over the invention and lost. "Thermos" spread so far that in 1962 and 1963 United States courts ruled that the lower-case word had become generic there, while the company kept its capital-T brand. Stainless steel flasks, first made in Japan in 1978, are now the steel flask of Indian offices and trains; India's BIS standard for them is IS 17526 (2021).</p>
    <p>The idea lives on. A <b>Dewar</b> of liquid nitrogen at −196 °C in a hospital or lab is the same flask, left loosely capped so the boiling gas can escape. <b>Double glazing</b> traps still gas between two panes, and <b>vacuum glazing</b> goes the whole way. The <b>insulated casserole</b> on many Indian tables uses plain foam, not a vacuum: it works because a big pot of food holds a lot of heat.</p>
    <p class="tip"><b>Try it:</b> step through the cousins. Compare how long the hot pot and the flask keep food above 60 °C.</p>`,
  terms: [
    { t: 'Dewar flask', d: 'A vacuum flask for liquefied gases, named after James Dewar. Its mouth is never sealed tight.' },
    { t: 'Liquid nitrogen', d: 'Nitrogen cooled until it turns liquid, at −196 °C. Used to freeze samples in labs and hospitals.' },
    { t: 'Boil-off', d: 'The liquid gas that evaporates each day because some heat still leaks in.' },
    { t: 'Double glazing', d: 'A window of two panes with a sealed layer of still air or gas between them.' },
    { t: 'Genericide', d: 'When a brand name becomes the everyday word for a kind of thing and loses its protection, as "thermos" did in the US.' },
  ],
  defaults: { which: 'dewar', glaze: 'double', out: 40, pot0: 90, room: 30 },
  controls: [
    { key: 'which', type: 'seg', label: 'Cousin', options: Object.entries(LIST).map(([v, n]) => ({ v, label: n })) },
    { key: 'glaze', type: 'seg', label: 'Window glass', options: Object.entries(GLAZE).map(([v, g]) => ({ v, label: g.n })), fmt: (v) => `U ≈ ${GLAZE[v].U} W/m²K` },
    { key: 'out', type: 'range', label: 'Outside, for the window', min: 25, max: 46, step: 1, ends: ['25 °C', '46 °C'], fmt: (v) => v + ' °C' },
    { key: 'room', type: 'range', label: 'Dining room', min: 10, max: 40, step: 1, ends: ['10 °C', '40 °C'], fmt: (v) => v + ' °C' },
  ],
  onChange(s, key) { if (key === 'glaze' || key === 'out') s.which = 'window'; },
  quiz: [
    { q: 'What was the first vacuum flask made for?', options: ['Tea on trains', 'Keeping liquefied gases cold in a laboratory', 'Storing medicines', 'Carrying soup to school'], answer: 1, why: 'James Dewar made it in 1892 to keep gases he had liquefied cold long enough to study. Keeping tea hot came later.' },
    { q: 'Why is a Dewar of liquid nitrogen never sealed tight?', options: ['To let light in', 'It would freeze shut', 'Heat still leaks in and boils some liquid; the gas must escape or the pressure would build up', 'Nitrogen needs air'], answer: 2, why: 'No flask is perfect. The leak boils off some nitrogen every day, and that gas needs a way out.' },
    { q: 'How does an insulated casserole keep food warm without a vacuum?', options: ['Foam full of trapped gas between two walls, and a lot of food storing heat', 'A small heater', 'It reflects heat with a mirror', 'It doesn\'t'], answer: 0, why: 'Foam is mostly tiny pockets of still gas, a poor conductor. A big pot holds a lot of heat for the area it loses it through.' },
  ],
  reel: [
    { ms: 5000, caption: 'James Dewar made the first vacuum flask in 1892 to keep liquid gases cold. Labs still call it a Dewar.', set: { which: 'dewar' }, view: { pos: [0.9, 4.0, 4.6], target: [0.2, 2.8, 0] }, spin: 0.35 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(23);
    const G = { dewar: new THREE.Group(), window: new THREE.Group(), pot: new THREE.Group(), flask: new THREE.Group() };
    Object.values(G).forEach((g) => root.add(g));
    G.dewar.rotation.y = G.pot.rotation.y = -Math.PI / 4;     // cutaways face the camera
    // Dewar: a wide silvered glass flask on a stand, loosely capped, nitrogen boiling inside.
    const silver = M.metal(0xf0f3f8, { roughness: 0.04 });
    G.dewar.add(revolve(wall([[0, 0.3], [1.05, 0.3], [1.15, 0.45], [1.15, 3.6], [0.9, 4.0], [0.55, 4.2], [0.5, 4.6]], 0.05), silver));
    G.dewar.add(revolve(wall([[0, 0.5], [0.85, 0.5], [0.95, 0.62], [0.95, 3.5], [0.7, 3.9], [0.42, 4.1], [0.4, 4.6]], 0.04), silver));
    G.dewar.add(revolve([[0, 0], [1.35, 0], [1.35, 0.3], [0, 0.3]], M.plastic(0x2a2f38)));
    const ln2 = revolve([[0, 0.55], [0.88, 0.55], [0.88, 3.0], [0, 3.0]], new THREE.MeshStandardMaterial({ color: 0xbfe3ff, roughness: 0.05, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); G.dewar.add(ln2);
    const cap = revolve([[0, 4.75], [0.55, 4.75], [0.55, 4.95], [0, 5.0]], M.matte(0xe8ecf2)); cap.position.y = 0.15; G.dewar.add(cap);
    const mist = sparks(G.dewar, 90, 0.07, 0xe8f6ff, rnd), boil = sparks(G.dewar, 60, 0.035, 0xffffff, rnd);
    // Window: a frame with two or three panes, seen in section.
    const frame = M.plastic(0xd8dde6), glassM = M.clear(0xbfe6ff, 0.35);
    const fr = new THREE.Group(); G.window.add(fr);
    [[0, 0.15], [0, 4.85]].forEach(([x, y]) => { const b = box(0.7, 0.3, 3.6, frame); b.position.set(x, y, 0); fr.add(b); });
    const paneA = box(0.04, 4.4, 3.4, glassM), paneB = box(0.04, 4.4, 3.4, glassM); paneA.position.set(-0.18, 2.5, 0); paneB.position.set(0.18, 2.5, 0); fr.add(paneA, paneB);
    const pillars = new THREE.Group(); for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), M.metal(0xc9ced8)); p.rotation.z = Math.PI / 2; p.position.set(0, 0.7 + i * 0.7, -1.4 + j * 0.7); pillars.add(p); } fr.add(pillars);
    const gasM = M.ghost(0xcfe8ff, 0.15), gasSlab = box(0.32, 4.4, 3.4, gasM); gasSlab.position.set(0, 2.5, 0); fr.add(gasSlab);
    fr.rotation.y = -0.5;
    const heatIn = sparks(G.window, 80, 0.05, hex(COL.heat), rnd);
    // Hot pot: steel bowl, yellow foam, plastic shell, domed lid; cut away.
    G.pot.add(revolve(wall([[0, 0.3], [1.5, 0.3], [1.6, 0.4], [1.6, 2.1]], 0.04), M.metal(0xc9ced8, { roughness: 0.2 })));
    G.pot.add(revolve([[0, 0.05], [1.95, 0.05], [1.95, 2.2], [1.6, 2.2], [1.6, 0.4], [0, 0.3]], M.matte(0xf2d27a)));
    G.pot.add(revolve(wall([[0, 0], [1.95, 0], [2.0, 0.05], [2.0, 2.25]], 0.05), M.plastic(0x8c2f39, { roughness: 0.4 })));
    G.pot.add(revolve([[0, 2.25], [2.05, 2.25], [2.0, 2.45], [1.4, 2.75], [0.3, 2.85], [0.3, 3.05], [0, 3.05]], M.plastic(0x8c2f39, { roughness: 0.4 })));
    const potFood = revolve([[0, 0.34], [1.55, 0.34], [1.55, 1.6], [0, 1.6]], new THREE.MeshStandardMaterial({ color: 0xe0a630, roughness: 0.5, side: THREE.DoubleSide })); G.pot.add(potFood);
    // Flask for comparison.
    const F = makeFlask({ kind: 'steel', cut: true }); G.flask.add(F.group); F.group.scale.setScalar(0.85); F.cup.visible = false;
    const lA = stage.label('', [0, 0, 0], root, 'hot'), lB = stage.label('', [0, 0, 0], root);
    let which = '';
    return {
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05));
        fitNarrow(stage, [lB], [0.12, -0.05]);
        if (s.which !== which) { which = s.which; Object.entries(G).forEach(([k, g]) => { g.visible = k === which; }); }
        if (which === 'dewar') {
          const d = dewar(25);
          mist.step(dt, 30, () => [(rnd() - 0.5) * 0.6, 4.9, (rnd() - 0.5) * 0.6], () => [(rnd() - 0.5) * 0.5, 0.5, (rnd() - 0.5) * 0.5], 2.2);
          boil.step(dt, 40, () => [(rnd() - 0.5) * 1.4, 0.7 + rnd() * 0.3, (rnd() - 0.5) * 0.6 + 0.3], () => [0, 1.2, 0], 1.8);
          lA.element.style.setProperty('--c', COL.cold); lA.position.set(-1.9, 2.2, 0.5); lA.element.innerHTML = `liquid nitrogen <b>−196 °C</b>`;
          lB.position.set(1.9, 4.9, 0.3); lB.element.innerHTML = `loose cap: boil-off gas escapes`;
        } else if (which === 'window') {
          const U = GLAZE[s.glaze].U;
          pillars.visible = s.glaze === 'vacuum'; paneB.visible = s.glaze !== 'single'; gasSlab.visible = s.glaze === 'double';
          heatIn.step(dt, clamp(U * (s.out - 24) * 0.25, 0, 60), () => [2.2, 0.8 + rnd() * 3.6, (rnd() - 0.5) * 2.4], () => [-1.4, 0, 0.7], 2.6);
          lA.element.style.setProperty('--c', COL.hot); lA.position.set(2.6, 5.3, 0); lA.element.innerHTML = `outside <b>${s.out} °C</b>`;
          lB.position.set(-2.6, 5.3, 0); lB.element.innerHTML = 'air-conditioned room 24 °C';
        } else if (which === 'pot') {
          lA.element.style.setProperty('--c', COL.heat); lA.position.set(2.6, 1.2, 0.6); lA.element.innerHTML = 'foam between the walls: no vacuum';
          lB.position.set(-2.3, 2.4, 0.6); lB.element.innerHTML = '1.5 L, 1 kg of dal';
        } else {
          lA.element.style.setProperty('--c', COL.vac); lA.position.set(1.3, 3.3, 0.5); lA.element.innerHTML = 'vacuum gap';
          lB.position.set(-1.6, 1.0, 0.5); lB.element.innerHTML = '500 mL steel flask';
        }
      },
      readout: (s) => {
        if (s.which === 'dewar') {
          const d = dewar(25);
          return `<div class="big">Boil-off about ${d.Lday.toFixed(1)} L a day</div>
            <div class="row"><span>Radiation in, silvered walls</span><b>${fmtW(d.rad)}</b></div>
            <div class="row"><span>Down the neck</span><b>${fmtW(d.neck)}</b></div>
            <div class="row"><span>Nitrogen boiled away</span><b>${(d.kgDay * 1000).toFixed(0)} g a day</b></div>
            <small>A 1 L Dewar at 25 °C, a rough estimate. The temperature gap is 221 °C, over three times a hot flask's.</small>`;
        }
        if (s.which === 'window') {
          const rows = Object.entries(GLAZE).map(([k, g]) => `<div class="row"><span>${g.n}, U ${g.U}</span><b ${k === s.glaze ? 'style="color:#ffb547"' : ''}>${Math.round(g.U * (s.out - 24))} W per m²</b></div>`).join('');
          return `<div class="big">Heat in: ${Math.round(GLAZE[s.glaze].U * (s.out - 24))} W per m²</div>${rows}
            <small>Through the glass alone, ${s.out} °C outside and 24 °C inside, sunlight left out. Every watt kept out is one the air conditioner needn't pump.</small>`;
        }
        if (s.which === 'pot') {
          const r = potCurve(90, s.room), t60 = crossing(r, 60);
          const f = curve({ vessel: 'flask', kind: 'steel', T0: 90, Tr: s.room, fill: 1 });
          return `<div class="big">Above 60 °C for ${fmtH(t60)}</div>
            <div class="row"><span>Hot pot UA · heat stored</span><b>${(POT.UA * 1000).toFixed(0)} mW/K · ${(POT.C / 1000).toFixed(1)} kJ/K</b></div>
            <div class="row"><span>Time constant: hot pot · flask</span><b>${(POT.C / POT.UA / 3600).toFixed(0)} h · ${(flaskC('steel') / (routes(80, s.room, { kind: 'steel' }).total / (80 - s.room)) / 3600).toFixed(0)} h</b></div>
            <div class="row"><span>500 mL flask above 60 °C for</span><b>${fmtH(crossing(f, 60))}</b></div>
            <small>Foam leaks five times more than a vacuum flask, but the pot holds twice as much heat. Packed at 90 °C in a ${s.room} °C room.</small>`;
        }
        const r = routes(90, 25, { kind: 'steel' });
        return `<div class="big">The flask: ${fmtW(r.total)} at 90 °C</div>
          <div class="row"><span>Neck and stopper</span><b>${fmtW(r.neck + r.stop)}</b></div>
          <div class="row"><span>Across the vacuum</span><b>${fmtW(r.rad + r.gas)}</b></div>
          <small>The same physics as a Dewar, a vacuum window and a hot pot, in a bag-sized bottle.</small>`;
      },
    };
  },
};

// Chapter 4: making the vacuum, and losing it.
// How good must the vacuum be? Gas conduction across a 5 mm gap (thermos.js, hGas): at ordinary
// pressures it does not depend on pressure at all (5.2 W/m²K), because fewer molecules each carry heat
// further. Only once the mean free path λ = kT ÷ (√2 π d² p) (d = 0.37 nm for air) is longer than the
// gap does conduction fall, in step with pressure. λ = 5 mm at about 1.5 Pa.
// How flasks are made (sources in history.json):
//  - Steel: Nippon Sanso's process (US patent 4,157,779, filed 1978, granted 1979): the two SUS 304
//    shells go into a vacuum furnace; once it reaches 10⁻² torr it is heated to about 1,050 °C to melt
//    the brazing metal, which seals the pumping port; a powdered getter such as titanium hydride, held
//    near 600 °C, then soaks up the leftover gas, mainly hydrogen coming out of the steel. The same
//    patent compares it with a conventional bottle evacuated to 10⁻⁴ torr (0.013 Pa).
//  - Glass: the gap is silvered, baked and pumped through a small tube that is then melted shut,
//    leaving the sealed tip at the bottom of a refill (process described in vacuum-bottle patents; we
//    read only search summaries of these).
// Damage: a crack lets air in, p → 1 atm. A dent that pushes the outer wall onto the inner one makes
// a solid bridge: a 1 cm² patch of 0.4 mm steel walls touching passes k·A ÷ t ≈ 16 × 10⁻⁴ ÷ 0.0008
// = 2 W/K before the films on each side limit it; we lump it, with those films, as 0.05 W/K (estimate).
// The warm-outside test: the heat that crosses the gap must leave the case (0.06 m² at 10 W/m²K).
import {
  THREE, M, makeFlask, routes, caseTemp, hGas, meanFreePath, perCm3, flaskC, GAP, P_ATM, P_GOOD, A_IN, COL, hex, fmtW, fmtP, fmtLen, sup,
  board, panelBg, axes, title, line, dot, dashH, dashV, dots, rng, fitNarrow, inReel, reelBoards, tempCss, clamp, box, beam, curve, at,
} from '../thermos.js';

const VIEW = { pos: [2.6, 4.4, 11.4], target: [2.1, 3.4, 0] };
const LOGP = [Math.log10(0.001), Math.log10(P_ATM)];
const DENT = 0.05;

export default {
  id: 'vacuum',
  short: 'Making the vacuum',
  title: 'Making the vacuum, and losing it',
  subtitle: 'Pump the gap down to a ten-millionth of an atmosphere, seal it, and never let it crack.',
  view: VIEW,
  learn: `<p>Here is a surprise: taking out <b>most</b> of the air does nothing. Halve the air in the gap and each molecule just travels twice as far between bumps, carrying heat just as well. Conduction only drops once the molecules are so few that they fly from wall to wall without meeting each other: once their <b>mean free path</b> is longer than the gap. For a 5 mm gap that means below about <b>1 pascal</b>, a hundred-thousandth of an atmosphere. Good flasks are pumped to about <b>0.01 Pa</b>.</p>
    <p><b>Steel flasks</b> are made in a <b>vacuum furnace</b>. The two shells go in together, the furnace is pumped out and heated to about 1,050 °C, and a ring of brazing metal melts to seal the gap shut with the vacuum inside. Steel slowly breathes out hydrogen, so a pinch of <b>getter</b>, a metal powder such as titanium hydride, sits in the gap to soak it up for years.</p>
    <p><b>Glass refills</b> are silvered on the inside of the gap, heated, and pumped through a little glass tube at the bottom. Then the tube is melted shut: that is the <b>sealed tip</b> under every refill, hidden behind the case's soft pad.</p>
    <p>Lose the vacuum and the flask is just a bottle. A <b>dropped glass flask</b> cracks, air rushes in, and it is ruined. A <b>dented steel flask</b> may be fine, unless the dent pushes the outer wall onto the inner one, or a weld cracks. The test is simple: fill it with hot water and feel the outside. A working flask stays at room temperature. If the outside gets <b>warm</b>, the vacuum has gone.</p>
    <p class="tip"><b>Try it:</b> press "Pump it down" and watch the pressure fall, but the heat loss stay put until the very end. Then crack it, or dent it, and feel the outside warm up.</p>`,
  terms: [
    { t: 'Pascal (Pa)', d: 'The unit of pressure. The air around us pushes at about 101,000 Pa.' },
    { t: 'Mean free path', d: 'How far a gas molecule travels, on average, before hitting another one. In room air it is about 70 nanometres.' },
    { t: 'Getter', d: 'A reactive metal placed inside a sealed vacuum to soak up any gas that seeps out of the walls later.' },
    { t: 'Brazing', d: 'Joining metal parts with a melted filler metal, here done inside a vacuum furnace so the seal traps the vacuum.' },
    { t: 'Thermal bridge', d: 'A solid path that lets heat skip the insulation, like a dent where the two walls touch.' },
  ],
  defaults: { kind: 'steel', p: P_ATM, dent: false, T: 90, room: 25, pumping: false },
  controls: [
    { key: 'kind', type: 'seg', label: 'Flask', options: [{ v: 'steel', label: 'All-steel' }, { v: 'glass', label: 'Glass refill' }] },
    { key: 'p', type: 'log', label: 'Pressure in the gap', min: 0.001, max: P_ATM, ends: ['0.001 Pa', '1 atmosphere'], fmt: (v) => fmtP(v) },
    { key: 'go', type: 'buttons', label: 'Do it', items: [
      { label: 'Pump it down', act: (s) => { s.pumping = true; s.dent = false; } },
      { label: 'Crack it (air in)', act: (s) => { s.pumping = false; s.p = P_ATM; } },
      { label: 'Dent it (walls touch)', act: (s) => { s.pumping = false; s.kind = 'steel'; s.dent = true; } },
    ] },
    { key: 'T', type: 'range', label: 'Hot water inside', min: 40, max: 95, step: 1, ends: ['40 °C', '95 °C'], fmt: (v) => v + ' °C' },
  ],
  onChange(s, key) { if (key === 'p') s.pumping = false; if (key === 'kind' && s.kind === 'glass') s.dent = false; },
  quiz: [
    { q: 'You pump half the air out of the gap. What happens to the heat it conducts?', options: ['It halves', 'Almost nothing changes', 'It doubles', 'It stops completely'], answer: 1, why: 'Fewer molecules each travel further between collisions, so they carry heat just as well. Conduction only falls once molecules fly from wall to wall without meeting.' },
    { q: 'What does a getter do inside a steel flask?', options: ['Soaks up gas that seeps out of the steel, keeping the vacuum good', 'Gets the heat out', 'Makes the walls shiny', 'Holds the walls apart'], answer: 0, why: 'Steel slowly gives off hydrogen. The getter, a reactive metal powder, captures it so the vacuum lasts for years.' },
    { q: 'You fill a flask with hot water and the outside gets warm. What does it tell you?', options: ['It is working well', 'The water is too hot', 'The stopper is missing', 'The vacuum has been lost'], answer: 3, why: 'With a vacuum, almost no heat reaches the outer case, so it stays at room temperature. A warm case means heat is crossing the gap: air has got in, or the walls touch.' },
  ],
  reel: [
    { ms: 5200, caption: 'Pump out the air and nothing changes, until the molecules are so few they cross the gap without meeting.', set: { kind: 'steel', dent: false, T: 90, room: 25, pumping: false }, anim: { p: [P_ATM, P_GOOD, true] }, view: { pos: [0.4, 5.4, 6.0], target: [0.2, 4.9, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(3);
    let F = null, kind = '', S = {}, key = '';
    const fG = new THREE.Group(); fG.rotation.y = -Math.PI / 4; root.add(fG);
    // the pump: a box on a hose from the base, a gauge on top
    const pumpG = new THREE.Group(); pumpG.position.set(-2.4, 0, 0.4); root.add(pumpG);
    const body = box(1.1, 0.8, 0.8, M.plastic(0x4a5263)); body.position.y = 0.4; pumpG.add(body);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 24), M.metal(0x8a93a3)); motor.rotation.z = Math.PI / 2; motor.position.set(0, 0.95, 0); pumpG.add(motor);
    const hose = beam([-1.85, 0.25, 0.4], [-0.5, 0.18, 0.2], 0.05, M.matte(0x2a2f38)); root.add(hose);
    const NM = 220, mol = dots(NM, 0.035, 0xcfe8ff); fG.add(mol);
    const Mo = Array.from({ length: NM }, () => ({ a: 0, r: 0, y: 0, vy: 0 }));
    const lGap = stage.label('', [0, 0, 0], root, 'hot'), lCase = stage.label('', [0, 0, 0], root, 'hot'), lPump = stage.label('vacuum pump', [-2.4, 1.5, 0.4], root);
    const lDent = stage.label('dent: walls touch', [0, 0, 0], root, 'hot'); lDent.element.style.setProperty('--c', COL.bad);
    lGap.element.style.setProperty('--c', COL.vac);
    const dentM = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 10), M.glow(0xff5d5d)); fG.add(dentM);
    function make(k) {
      if (F) fG.remove(F.group);
      F = makeFlask({ kind: k, cut: true, face: false }); fG.add(F.group); kind = k; F.cup.visible = false;
      const D = F.D;
      Mo.forEach((m) => { m.a = Math.PI / 2 + rnd() * Math.PI * 1.5; m.r = D.ri + 0.03 + rnd() * (D.ro - D.ri - 0.08); m.y = D.bot + 0.1 + rnd() * (4.0 - D.bot); });
    }
    const P = (a, r, y) => [r * Math.sin(a), y, r * Math.cos(a)];
    const opts = (s) => ({ kind: s.kind, p: s.p, stopper: true });
    const loss = (s) => { const r = routes(s.T, s.room, opts(s)); const dent = s.dent ? DENT * (s.T - s.room) : 0; return { ...r, dent, total: r.total + dent }; };
    const outside = (s) => { const To = caseTemp(s.T, s.room, opts(s)); return s.dent ? To + (DENT * (s.T - s.room)) / (10 * 0.06) : To; };   // averaged over the case: the spot over the dent is hotter

    const bA = board(root, 5.0, 3.2, 540, 346, (g, w, h) => {
      panelBg(g, w, h);
      title(g, 'Gas conduction across the gap', '5 mm, air');
      const { X, Y } = axes(g, w, h, { x0: 92, y1: 72, y0: h - 58, xMin: 0.001, xMax: P_ATM, yMin: 0.0005, yMax: 20, logX: true, logY: true, xTicks: [0.001, 0.1, 10, 1000, 100000], yTicks: [0.001, 0.01, 0.1, 1, 10], xFmt: (v) => (v >= 1000 ? v / 1000 + 'k' : String(v)), yFmt: (v) => String(v), xLabel: 'pressure, Pa', yLabel: 'W/m²K' });
      const pts = []; for (let e = -3; e <= 5.006; e += 0.05) { const p = 10 ** e; pts.push([p, hGas(p)]); }
      line(g, pts, X, Y, COL.cond, 4);
      const pMfp = (1.380649e-23 * 323) / (Math.SQRT2 * Math.PI * 3.7e-10 ** 2 * GAP);
      dashV(g, X(pMfp), h - 58, 72, 'mean free path = gap', 'rgba(255,255,255,.55)');
      dashV(g, X(P_GOOD), h - 58, 140, 'good flask', 'rgba(122,162,255,.8)');
      dot(g, X(S.p), Y(hGas(S.p)), '#fff', 9);
    }, [4.3, 3.2, 0]);

    return {
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, [lPump], [0.05, -0.1]);
        reelBoards([bA], () => [0.6, 8.0, 0, 1.15]);
        if (s.kind !== kind) make(s.kind);
        if (s.pumping && !inReel()) { s.p = Math.max(P_GOOD, s.p * Math.exp(-2.9 * dt)); if (s.p <= P_GOOD * 1.0001) s.pumping = false; }
        pumpG.visible = hose.visible = s.p > P_GOOD * 1.5 || s.pumping;
        motor.rotation.x += (s.pumping ? 25 : 0) * dt;
        const D = F.D;
        const k = clamp((Math.log10(s.p) - LOGP[0]) / (LOGP[1] - LOGP[0]), 0, 1), nShow = Math.round(NM * k * k);
        for (let i = 0; i < NM; i++) {
          const m = Mo[i];
          if (i < nShow) {
            const j = 0.5; m.a += (rnd() - 0.5) * j * dt * 2; m.y += (rnd() - 0.5) * j * dt * 6; m.r += (rnd() - 0.5) * j * dt;
            m.a = clamp(m.a, Math.PI / 2 + 0.02, Math.PI * 2 - 0.02); m.r = clamp(m.r, D.ri + 0.04, D.ro - 0.04); m.y = clamp(m.y, D.bot + 0.05, 4.15);
            mol.place(i, ...P(m.a, m.r, m.y));
          } else mol.place(i, 0, -50, 0, 0.0001);
        }
        mol.done();
        dentM.visible = lDent.visible = s.dent && s.kind === 'steel';
        dentM.position.set(...P(Math.PI * 0.25, D.ro + 0.02, 1.6)); lDent.position.set(1.2, 1.25, 0.9);
        const To = outside(s);
        lCase.element.style.setProperty('--c', To > s.room + 6 ? COL.hot : COL.ok);
        lCase.element.innerHTML = `outside <b>${To.toFixed(1)} °C</b> ${To > s.room + 6 ? '· feels warm' : '· feels like the room'}`;
        lCase.position.set(-1.5, 3.2, 0.6);
        lGap.element.innerHTML = `gap <b>${fmtP(s.p)}</b>`; lGap.position.set(1.15, 4.3, 0.4);
        tempColor2(F, s.T);
        const kk = `${s.kind}|${s.p.toPrecision(3)}|${s.dent}|${s.T}`;
        if (kk !== key) { key = kk; bA.redraw(); }
      },
      readout: (s) => {
        const r = loss(s), lam = meanFreePath(s.p), To = outside(s);
        const UA = r.total / (s.T - s.room), tau = flaskC(s.kind) / UA / 3600;
        return `<div class="big">Losing ${fmtW(r.total)}</div>
          <div class="row"><span>Molecules per cm³ in the gap</span><b>${sci(perCm3(s.p))}</b></div>
          <div class="row"><span>Mean free path · gap</span><b ${lam > GAP ? 'class="ok"' : ''}>${fmtLen(lam)} · 5 mm</b></div>
          <div class="row"><span>Gas conduction across the gap</span><b style="color:${COL.cond}">${fmtW(r.gas)}</b></div>
          ${s.dent ? `<div class="row"><span>Through the dent</span><b class="no">${fmtW(r.dent)}</b></div>` : ''}
          <div class="row"><span>Outside of the case, on average</span><b ${To > s.room + 6 ? 'class="no"' : 'class="ok"'}>${To.toFixed(1)} °C</b></div>
          <div class="row"><span>Cooling time constant</span><b>${tau >= 1 ? tau.toFixed(1) + ' h' : Math.round(tau * 60) + ' min'}</b></div>
          <small>${s.p > 2 ? 'Molecules still bump into each other before they cross: pumping more has hardly helped yet.' : s.dent ? 'The vacuum is fine, but the touching walls make a bridge for heat.' : 'Molecules now fly wall to wall: conduction falls with every bit of gas removed.'}</small>`;
      },
    };
  },
};

function sci(v) { if (v < 1000) return Math.round(v).toString(); const e = Math.floor(Math.log10(v)); return `${(v / 10 ** e).toFixed(1)} × 10${sup(e)}`; }
function tempColor2(F, T) { const c = new THREE.Color(tempCss(T, 0, 100)); F.liqMat.color.copy(c); }

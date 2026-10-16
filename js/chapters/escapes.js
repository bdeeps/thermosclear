// Chapter 2: the three ways heat escapes and how a flask blocks each one, plus the leaks that remain.
// All watts come from routes() in thermos.js (conduction through the gas in the gap, radiation across
// the gap with Stefan–Boltzmann, conduction along the neck, conduction through the stopper, and the
// open mouth when the stopper is out). 500 mL at 90 °C in a 25 °C room by default.
// 1 unit ≈ 5 cm; the gap is drawn about twice as wide as a real flask's 5 mm.
import {
  THREE, makeFlask, routes, flaskC, hGas, rayleigh, FLASK, EPS_DULL, P_ATM, P_GOOD, COL, hex, fmtW, fmtP, fmtH, link,
  board, panelBg, title, bars, nearFace, sparks, dots, rng, fitNarrow, inReel, reelBoards, tempColor, clamp, curve, at,
} from '../thermos.js';

const VIEW = { pos: [2.4, 4.4, 10.6], target: [1.9, 3.4, 0] };
const LOGP = [Math.log10(0.001), Math.log10(P_ATM)];

export default {
  id: 'escapes',
  short: 'Three escapes',
  title: 'Three ways out, all blocked',
  subtitle: 'Heat leaves by touch, by moving air and by glowing. A flask stops all three, nearly.',
  view: VIEW,
  learn: `<p>Heat only ever moves three ways, as ${link('heatclear', 'HeatClear')} shows: by <b>conduction</b> (molecules jostling their neighbours), by <b>convection</b> (warm air or water carrying it away) and by <b>radiation</b> (an invisible infrared glow that crosses empty space). A flask has a trick for each.</p>
    <p><b>Conduction:</b> with the gap full of air, heat would hop from molecule to molecule across it. Fill the 5 mm gap with air and 90 °C chai would lose about <b>12 W</b> that way. Pump the air out and there is almost nothing left to carry it: a few hundredths of a watt.</p>
    <p><b>Convection:</b> a gap this thin barely lets air circulate even when it is full, and with a vacuum there is no air to move at all.</p>
    <p><b>Radiation:</b> a vacuum does not stop infrared. That is why the walls facing the gap are <b>shiny</b>. A shiny surface is a poor emitter and a good mirror: its <b>emissivity</b> is about 0.03 for silvered glass and 0.075 for polished steel, against 0.9 for a dull one. The <b>Stefan–Boltzmann law</b> turns that into watts: dull walls would leak about <b>15 W</b>, polished steel about 0.7 W.</p>
    <p>So where does the heat go? Mostly through the two places the vacuum can't reach: the <b>neck</b>, where the walls are joined, and the <b>stopper</b>. Together they carry more than half of what a good flask loses.</p>
    <p class="tip"><b>Try it:</b> let the air back into the gap, then make the walls dull. Put both back, then pull the stopper out and watch the steam take over.</p>`,
  terms: [
    { t: 'Conduction', d: 'Heat passed along by molecules bumping into their neighbours. It needs matter.' },
    { t: 'Convection', d: 'Heat carried by a moving liquid or gas, like warm air rising.' },
    { t: 'Radiation', d: 'Heat carried by infrared light. It crosses a vacuum, which is how sunlight reaches us.' },
    { t: 'Emissivity (ε)', d: 'How strongly a surface glows compared with a perfect black body, from 0 to 1. Shiny metal is low, dull paint is high.' },
    { t: 'Stefan–Boltzmann law', d: 'Radiated power grows with the fourth power of the absolute temperature: q = εσ(T₁⁴ − T₂⁴) per square metre.' },
    { t: 'Heat budget', d: 'A list of every route heat takes out of something, in watts, that adds up to the total.' },
  ],
  defaults: { kind: 'steel', p: P_GOOD, dull: false, stopper: true, T: 90, room: 25 },
  controls: [
    { key: 'kind', type: 'seg', label: 'Flask', options: [{ v: 'steel', label: 'All-steel' }, { v: 'glass', label: 'Glass refill' }] },
    { key: 'p', type: 'log', label: 'Air left in the gap', min: 0.001, max: P_ATM, ends: ['hard vacuum', 'full of air'], fmt: (v) => fmtP(v) },
    { key: 'dull', type: 'seg', label: 'Walls facing the gap', options: [{ v: 0, label: 'Shiny' }, { v: 1, label: 'Dull' }], fmt: (v, s) => `ε = ${v ? EPS_DULL : FLASK[s.kind].eps}` },
    { key: 'stopper', type: 'toggle', label: 'Stopper in' },
    { key: 'T', type: 'range', label: 'Drink temperature', min: 40, max: 95, step: 1, ends: ['40 °C', '95 °C'], fmt: (v) => v + ' °C' },
    { key: 'room', type: 'range', label: 'Room', min: 10, max: 40, step: 1, ends: ['10 °C', '40 °C'], fmt: (v) => v + ' °C' },
  ],
  quiz: [
    { q: 'Which way of losing heat can cross a vacuum?', options: ['Conduction', 'Convection', 'Radiation', 'None of them'], answer: 2, why: 'Radiation is infrared light. Light needs no matter to travel through, so the flask uses shiny walls to block it instead.' },
    { q: 'Why are the walls inside the gap shiny?', options: ['To look nice', 'Shiny surfaces glow and absorb very little infrared, so little heat radiates across', 'To make the vacuum stronger', 'To stop rust only'], answer: 1, why: 'A shiny surface has a low emissivity: it is a weak emitter and a good reflector. Dull walls would leak about twenty times as much.' },
    { q: 'In a good flask, where does most of the heat leak out?', options: ['Straight through the vacuum', 'Through the neck and the stopper', 'Through the bottom', 'It loses no heat'], answer: 1, why: 'The vacuum and the shiny walls make the sides almost perfect. The neck, where the walls join, and the stopper are solid paths the vacuum can\'t protect.' },
  ],
  reel: [
    { ms: 5400, caption: 'Fill the gap with air and 90 °C chai loses 12 watts by conduction. Pump it out and that falls to a few hundredths.', set: { kind: 'steel', dull: false, stopper: true, T: 90, room: 25 }, anim: { p: [P_ATM, P_GOOD, true] }, view: { pos: [0.8, 5.4, 6.1], target: [0.2, 4.8, 0] }, spin: 0 },
    { ms: 5000, caption: 'A vacuum can\'t stop the infrared glow. Shiny walls can: dull ones would leak 15 watts.', set: { kind: 'steel', p: P_GOOD, stopper: true, T: 90, room: 25, dull: 1 }, anim: { dull: [1, 0] }, view: { pos: [0.8, 5.4, 6.1], target: [0.2, 4.8, 0] }, spin: 0 },
  ],
  onChange(s) { s.dull = s.dull ? 1 : 0; },

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(7);
    let F = null, kind = '', S = {}, key = '';
    const flaskG = new THREE.Group(); root.add(flaskG);
    // particles live in the flask's frame
    flaskG.rotation.y = -Math.PI / 4;
    const NM = 260, mol = dots(NM, 0.035, 0xcfe8ff); flaskG.add(mol);
    const M = Array.from({ length: NM }, () => ({ a: 0, r: 0, y: 0 }));
    const cond = sparks(flaskG, 70, 0.05, hex(COL.cond), rnd);
    const rad = sparks(flaskG, 90, 0.06, hex(COL.rad), rnd);
    const neck = sparks(flaskG, 50, 0.05, hex(COL.neck), rnd);
    const stop = sparks(flaskG, 40, 0.05, hex(COL.stop), rnd);
    const steam = sparks(flaskG, 80, 0.07, 0xe8f2ff, rnd);
    const lab = (c) => { const l = stage.label('', [0, 0, 0], root, 'hot'); l.element.style.setProperty('--c', c); return l; };
    const lCond = lab(COL.cond), lRad = lab(COL.rad), lNeck = lab(COL.neck), lStop = lab(COL.stop);
    const lDrink = stage.label('', [0, 0.9, 0], root, 'hot');

    function make(k) {
      if (F) { flaskG.remove(F.group); }
      F = makeFlask({ kind: k, cut: true, face: false }); flaskG.add(F.group); kind = k;
      F.cup.visible = false;
      const D = F.D;
      M.forEach((m) => { m.a = Math.PI / 2 + rnd() * Math.PI * 1.5; m.r = D.ri + 0.03 + rnd() * (D.ro - D.ri - 0.08); m.y = D.bot + 0.1 + rnd() * (4.0 - D.bot); });
    }
    // A point on the cut face nearest the viewer (angle π/2 means +x, 2π means +z).
    const P = (a, r, y) => [r * Math.sin(a), y, r * Math.cos(a)];

    const bA = board(root, 5.0, 3.2, 540, 346, (g, w, h) => {
      panelBg(g, w, h);
      if (!F) return;
      const r = routes(S.T, S.room, { kind: S.kind, p: S.p, dull: S.dull, stopper: S.stopper });
      title(g, 'Heat budget', `${S.T} °C drink, ${S.room} °C room`);
      const rows = [
        { label: 'Gas in the gap', value: r.gas, color: COL.cond },
        { label: 'Convection', value: 0, color: COL.conv, text: S.p > 1000 ? 'gap too thin' : 'nothing to move' },
        { label: 'Radiation', value: r.rad, color: COL.rad },
        { label: 'Neck joint', value: r.neck, color: COL.neck },
        S.stopper ? { label: 'Stopper', value: r.stop, color: COL.stop } : { label: 'Open mouth', value: r.open, color: '#e8f2ff' },
      ];
      bars(g, rows, { y: 50, w: w - 10, rowH: 46, labelW: 178, unit: fmtW, max: Math.max(2.5, r.total * 1.05) });
      g.font = 'bold 24px sans-serif'; g.fillStyle = COL.heat; g.fillText(`Total ${fmtW(r.total)}`, 20, h - 18);
      const leak = (r.neck + r.stop + r.open) / r.total;
      g.font = '18px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(`neck and ${S.stopper ? 'stopper' : 'mouth'}: ${Math.round(leak * 100)}% of it`, 200, h - 20);
    }, [4.3, 3.2, 0]);

    return {
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, [lCond, lNeck], [0.05, -0.1]);
        reelBoards([bA], () => [0.3, 8.0, 0, 1.15]);
        if (inReel()) { flaskG.position.set(-0.2, 0, 0); } else flaskG.position.set(0, 0, 0);
        if (s.kind !== kind) make(s.kind);
        const D = F.D, r = routes(s.T, s.room, { kind: s.kind, p: s.p, dull: s.dull, stopper: s.stopper });
        const ox = flaskG.position.x;
        // the drink's colour follows its temperature
        tempColor(s.T, 0, 100, F.liqMat.color);
        F.stopper.position.y = s.stopper ? 0 : 1.4;
        F.stopper.visible = s.stopper || !inReel();
        // gas molecules: how many we draw follows the log of the pressure
        const k = clamp((Math.log10(s.p) - LOGP[0]) / (LOGP[1] - LOGP[0]), 0, 1), nShow = Math.round(NM * k * k);
        const jig = 0.25 + (s.T - 20) * 0.004;
        for (let i = 0; i < NM; i++) {
          const m = M[i];
          if (i < nShow) {
            m.a += (rnd() - 0.5) * jig * dt * 2; m.y += (rnd() - 0.5) * jig * dt * 6; m.r += (rnd() - 0.5) * jig * dt * 0.8;
            m.a = clamp(m.a, Math.PI / 2 + 0.02, Math.PI * 2 - 0.02); m.r = clamp(m.r, D.ri + 0.04, D.ro - 0.04); m.y = clamp(m.y, D.bot + 0.05, 4.15);
            mol.place(i, ...P(m.a, m.r, m.y));
          } else mol.place(i, 0, -50, 0, 0.0001);
        }
        mol.done();
        // conduction: sparks hop across the gap, as many as the watts
        cond.step(dt, clamp(r.gas * 5, 0, 60), () => { const y = D.bot + 0.3 + rnd() * 3.5; return P(nearFace(rnd()), D.ri, y); }, (p) => { const a = Math.atan2(p[0], p[2]); return [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3]; }, 0.7);
        // radiation: rays leave the inner wall; on shiny walls most bounce back
        const e = s.dull ? EPS_DULL : FLASK[s.kind].eps, fEsc = (1 / (2 / e - 1)) / (1 / (2 / EPS_DULL - 1));
        rad.step(dt, 28, () => { const a = nearFace(rnd(), 0.8); return P(a, D.ri, D.bot + 0.3 + rnd() * 3.6); }, () => [0, 0, 0], 0.9, (p0, u) => {
          const a = Math.atan2(p0[0], p0[2]), y0 = p0[1], esc = u < fEsc;
          return (kk) => { const rr = esc ? D.ri + (D.ro - D.ri - 0.02) * kk : D.ri + (D.ro - D.ri - 0.02) * (kk < 0.5 ? 2 * kk : 2 - 2 * kk); return P(a, rr, y0 + 0.25 * kk); };
        });
        // the neck: heat creeps up the inner wall, round the joint, and out through the case
        neck.step(dt, clamp(r.neck * 14, 0, 40), () => P(nearFace(rnd(), 0.6), D.ri, 3.6), () => [0, 0, 0], 1.6, (p0, u) => {
          const a = Math.atan2(p0[0], p0[2]);
          const pts = [[D.ri, 3.7], [D.rn + 0.02, 4.7], [D.rn + 0.02, D.top - 0.02], [D.rno, D.top - 0.02], [D.rno + 0.03, 4.7], [D.ro + 0.05, 4.3], [D.ro + 0.5, 4.0]];
          return (kk) => { const f = kk * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), t = f - i; const rr = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, yy = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t; return P(a, rr, yy); };
        });
        // the stopper: straight up through the plug
        if (s.stopper) stop.step(dt, clamp(r.stop * 14, 0, 40), () => P(nearFace(rnd(), 1.2), rnd() * (D.rn - 0.08), 4.65), () => [0, 0.45, 0], 1.7);
        else stop.step(dt, 0, () => [0, -9, 0], () => [0, 0, 0]);
        // steam with the stopper out
        steam.step(dt, s.stopper ? 0 : clamp(r.open * 6, 0, 50), () => P(rnd() * Math.PI * 2, rnd() * D.rn * 0.8, D.top), () => [(rnd() - 0.5) * 0.3, 0.9, (rnd() - 0.5) * 0.3], 1.6);
        // labels
        const L = (l, html, pos) => { l.element.innerHTML = html; l.position.set(pos[0] + ox, pos[1], pos[2]); };
        L(lCond, `conduction across the gap <b>${fmtW(r.gas)}</b>`, [-1.9, 1.3, 0.6]);
        L(lRad, `radiation <b>${fmtW(r.rad)}</b>`, [-1.45, 2.5, 0.6]);
        L(lNeck, `neck <b>${fmtW(r.neck)}</b>`, [-1.3, 4.6, 0.4]);
        L(lStop, s.stopper ? `stopper <b>${fmtW(r.stop)}</b>` : `open mouth <b>${fmtW(r.open)}</b>`, [-1.1, 5.75, 0.3]);
        lDrink.element.style.setProperty('--c', COL.hot);
        L(lDrink, `drink <b>${s.T} °C</b>`, [0, 0.8, 0.2]);
        const kk = `${s.kind}|${s.p.toPrecision(3)}|${s.dull}|${s.stopper}|${s.T}|${s.room}`;
        if (kk !== key) { key = kk; bA.redraw(); }
      },
      readout: (s) => {
        const r = routes(s.T, s.room, { kind: s.kind, p: s.p, dull: s.dull, stopper: s.stopper });
        const UA = r.total / Math.max(1, s.T - s.room), C = flaskC(s.kind), tau = C / Math.max(1e-6, UA) / 3600;
        const c12 = curve({ vessel: 'flask', kind: s.kind, T0: s.T, Tr: s.room, p: s.p, dull: s.dull, stopper: s.stopper, fill: 1 }, 12, 0.25);
        return `<div class="big">Losing ${fmtW(r.total)}</div>
          <div class="row"><span>Heat lost per degree, UA</span><b>${(UA * 1000).toFixed(1)} mW/K</b></div>
          <div class="row"><span>Cooling time constant, C ÷ UA</span><b>${tau >= 1 ? tau.toFixed(1) + ' h' : Math.round(tau * 60) + ' min'}</b></div>
          <div class="row"><span>After 12 hours</span><b style="color:${COL.hot}">${at(c12, 12).toFixed(0)} °C</b></div>
          <small>${s.p > 100 ? `Air in the gap: it conducts ${(hGas(s.p)).toFixed(1)} W/m²K. Ra ≈ ${Math.round(rayleigh(s.T - s.room, s.p))}, too low for it to circulate.` : s.dull ? 'Dull walls glow strongly in the infrared, and the vacuum can\'t stop light.' : !s.stopper ? 'With the mouth open, steam carries heat away fast.' : 'Vacuum and mirrors leave only the neck and stopper as real leaks.'}</small>`;
      },
    };
  },
};

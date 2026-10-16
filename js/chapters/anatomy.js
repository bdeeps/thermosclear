// Chapter 1: take a flask apart. A generic 500 mL flask, 1 unit ≈ 5 cm (the vacuum gap, 5 mm in a
// real flask, is drawn about twice as wide so you can see it).
// Numbers in the readout: inner wall 0.035 m² (as HeatClear), gap 5 mm, pressure about 0.01 Pa
// (10⁻⁴ torr, the level vacuum-bottle makers pump to: see the vacuum chapter), so about 2.4 × 10¹²
// molecules per cm³ against 2.5 × 10¹⁹ in room air (n = p ÷ kT). Masses are typical: a 500 mL steel
// flask weighs roughly 300–400 g empty; we do not quote a figure.
import { THREE, makeFlask, routes, perCm3, P_GOOD, P_ATM, fitNarrow, COL, fmtW } from '../thermos.js';
import { exploder as explode } from '../kit.js';

const VIEW = { pos: [2.7, 4.6, 9.8], target: [0.4, 3.4, 0] };

export default {
  id: 'anatomy',
  short: 'Inside a flask',
  title: 'Inside a vacuum flask',
  subtitle: 'A bottle inside a bottle, with nothing at all between them.',
  view: VIEW,
  learn: `<p>Every office, train and school bag in India seems to have one: the steel <b>flask</b> of chai or coffee that is still hot at teatime. Most people call it a <b>thermos</b>. It is really a <b>vacuum flask</b>, and it is simpler than it looks.</p>
    <p>It is <b>a bottle inside a bottle</b>. The <b>inner bottle</b> holds the drink. The <b>outer case</b> wraps around it with a narrow gap, about 5 mm. The air in that gap has been pumped out, leaving a <b>vacuum</b>: almost nothing at all. The two walls touch in only one place, a thin ring at the <b>neck</b>.</p>
    <p>The surfaces that face each other across the gap are <b>shiny</b>: silvered glass in the older flasks, polished steel in today's. A <b>stopper</b> with a soft <b>silicone ring</b> closes the mouth, and a <b>cup</b> screws on over the top.</p>
    <p>There are two kinds. A <b>glass refill</b> flask has a fragile double-walled glass bottle sitting on a soft pad inside a plastic or metal case. An <b>all-steel</b> flask welds two steel bottles together at the neck, so it survives being dropped. Either way, the clever part is the gap you can't see.</p>
    <p class="tip"><b>Try it:</b> take the flask apart, then switch between steel and glass. Turn the cutaway off to see it as you would on a shelf.</p>`,
  terms: [
    { t: 'Vacuum flask', d: 'A double-walled bottle with the air pumped out of the gap between the walls. People often call it a thermos.' },
    { t: 'Vacuum', d: 'A space with almost all the gas taken out. A flask\'s gap holds about a ten-millionth of the air it would at normal pressure.' },
    { t: 'Inner bottle', d: 'The wall that touches the drink. In a glass flask it is called the refill.' },
    { t: 'Neck joint', d: 'The thin ring where the inner and outer walls meet. It is the only solid path for heat between them.' },
    { t: 'Stopper', d: 'The plug in the mouth, usually plastic with a silicone sealing ring.' },
  ],
  defaults: { kind: 'steel', explode: 0, cut: true },
  controls: [
    { key: 'kind', type: 'seg', label: 'Type', options: [{ v: 'steel', label: 'All-steel' }, { v: 'glass', label: 'Glass refill' }] },
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'cut', type: 'toggle', label: 'Cutaway view' },
  ],
  quiz: [
    { q: 'What fills the gap between the two walls of a good flask?', options: ['Foam', 'Air', 'Almost nothing: a vacuum', 'Water'], answer: 2, why: 'The air is pumped out of the gap and the gap is sealed. With no molecules left, heat can\'t be passed across by touch.' },
    { q: 'Where do the inner and outer walls touch?', options: ['All along the side', 'Only at the bottom', 'Only in a thin ring at the neck', 'They don\'t touch at all'], answer: 2, why: 'They must be joined somewhere to hold the vacuum. Makers join them only at the neck, with as thin a ring as possible.' },
    { q: 'Why is an all-steel flask more popular for school bags than a glass one?', options: ['It keeps drinks hotter', 'It survives knocks and drops', 'It weighs nothing', 'It needs no vacuum'], answer: 1, why: 'Glass refills are fragile: a crack lets air into the gap and the flask stops working. Welded steel walls take knocks much better.' },
  ],
  reel: [
    { ms: 5600, caption: 'A vacuum flask is a bottle inside a bottle, with the air pumped out of the gap between them.', set: { kind: 'steel', cut: true }, anim: { explode: [0, 1] }, view: { pos: [2.2, 5.4, 4.7], target: [0.1, 4.2, 0] }, spin: 0.5 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    let F = null, setExplode = () => {}, labels = [], kind = '', cut = null;
    // Parts sit in the flask's frame, turned −45° so the cutaway faces the camera; label offsets are given
    // as seen on screen and turned back into that frame.
    const toLocal = ([x, y, z]) => { const c = Math.SQRT1_2; return [c * (x + z), y, c * (z - x)]; };
    const L = (html, obj, pos, c) => { const l = stage.label(html, toLocal(pos), obj, c ? 'hot' : ''); if (c) l.element.style.setProperty('--c', c); labels.push(l); return l; };
    function make(k) {
      if (F) { root.remove(F.group); labels.forEach((l) => { l.element.remove(); l.parent?.remove(l); }); labels = []; F.group.traverse((o) => { o.geometry?.dispose(); }); }
      F = makeFlask({ kind: k, cut: true }); root.add(F.group); kind = k; cut = null;
      F.liqMat.color.setHex(0xc8823c);
      const parts = [
        { obj: F.cup, off: [0, 1.9, 0] },
        { obj: F.stopper, off: [0, 1.05, 0] },
      ];
      if (k === 'glass') {
        // The refill comes out of the case: the case lifts away to the right, the base drops.
        const refill = new THREE.Group(); [F.inner, F.outer, F.lip, F.tip, F.drink].forEach((o) => { F.group.remove(o); refill.add(o); }); F.group.add(refill); F.refill = refill;
        const caseG = new THREE.Group(); [F.case, F.collar].forEach((o) => { F.group.remove(o); caseG.add(o); }); F.group.add(caseG);
        parts.push({ obj: caseG, off: toLocal([2.0, 0.3, -0.4]) }, { obj: F.base, off: [0, -0.6, 0] }, { obj: F.pad, off: [0, -0.35, 0] });
        L('Glass refill: two glass walls', refill, [-1.25, 2.4, 0.4]);
        L('Silvered surfaces face the gap', refill, [0.85, 1.4, 0.6], COL.rad);
        L('Vacuum gap', refill, [1.0, 3.4, 0.5], COL.vac);
        L('Walls fused at the neck', refill, [1.2, 4.6, 0.5], COL.neck);
        L('Sealed tip: the air was pumped out here', refill, [0.2, -0.15, 0.8]);
        L('Case', caseG, [0.95, 2.6, 0.2]);
        L('Soft pad', F.pad, [0.9, 0.0, 0.5]);
      } else {
        L('Outer case', F.outer, [1.05, 2.0, 0.2]);
        L('Inner bottle: polished steel', F.inner, [-1.35, 1.6, 0.4], COL.rad);
        L('Vacuum gap', F.inner, [1.05, 3.4, 0.55], COL.vac);
        L('Walls welded at the neck: their only contact', F.lip, [1.25, 4.6, 0.5], COL.neck);
        L('Hot drink', F.drink, [0.0, 0.6, 0.0]);
      }
      L('Stopper with silicone ring', F.stopper, [1.3, 5.25, 0.3]);
      L('Cup', F.cup, [1.25, 5.85, 0.2]);
      setExplode = explode(parts);
    }
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        fitNarrow(stage, [], [0.17, -0.1]);
        if (s.kind !== kind) make(s.kind);
        if (s.cut !== cut) { cut = s.cut; F.setCut(cut); }
        setExplode(s.explode);
        // Without the cutaway the inner labels would float over a closed bottle: show only the outside ones.
        labels.forEach((l) => { const t = l.element.textContent; const inner = /gap|Inner|Silvered|neck|drink|Sealed|pad|refill/i.test(t); l.visible = s.cut || !inner || s.explode > 0.5; });
      },
      readout: (s) => {
        const r = routes(90, 25, { kind: s.kind }), air = perCm3(P_ATM), vac = perCm3(P_GOOD);
        return `<div class="big">${s.kind === 'steel' ? 'Two steel bottles, one vacuum' : 'A glass bottle in a case'}</div>
          <div class="row"><span>Holds · gap</span><b>500 mL · about 5 mm</b></div>
          <div class="row"><span>Pressure in the gap</span><b>about 0.01 Pa</b></div>
          <div class="row"><span>Molecules per cm³, air · gap</span><b>${(air / 1e19).toFixed(1)} × 10¹⁹ · ${(vac / 1e12).toFixed(1)} × 10¹²</b></div>
          <div class="row"><span>Losing, 90 °C chai, 25 °C room</span><b style="color:${COL.heat}">${fmtW(r.total)}</b></div>
          <small>${s.kind === 'steel' ? 'Steel shrugs off knocks. Its walls conduct more than glass, so the neck is made long and thin.' : 'Silvered glass reflects heat best and conducts poorly, but one crack lets the air back in.'}</small>`;
      },
    };
  },
};

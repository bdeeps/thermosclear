// Chapter 3: the cooling curve. Newton's law of cooling, dT/dt = −UA (T − T_room) ÷ C, integrated
// step by step with the full heat budget of thermos.js (so radiation keeps its T⁴ shape) for the flask,
// and for the same 500 mL in a steel jug with and without a lid (HeatClear's mug figures: 0.045 m²
// of side at 13 W/m²K, a 7 cm top losing by convection and evaporation).
// C = fill × 0.5 kg × 4,186 J/kg·K + the inner wall (steel 60 J/K, glass 84 J/K, jug 100 J/K).
// Without pre-heating, the drink first warms the cold inner wall to a shared temperature.
// What "hot for 12 hours" means: JIS S 2006 and EN 12546-1 fill with 95 °C water in a 20 °C room and
// read it after 6 hours (testers' summaries; we did not read the standards themselves).
// IARC (2016, Monographs vol. 116): drinking very hot beverages, above 65 °C, is "probably
// carcinogenic to humans" (Group 2A), as in CoffeeClear and TeaClear.
// WHO, Five Keys to Safer Food: keep cooked food piping hot, more than 60 °C, before serving.
// Time-lapse: 12 hours in 24 seconds.
import {
  THREE, M, makeFlask, revolve, wall, curve, at, crossing, flaskC, routes, FLASK, COL, hex, fmtW, fmtH, link,
  board, panelBg, axes, title, line, legend, dashH, dot, fitNarrow, inReel, reelBoards, tempColor, tempCss, clamp, sparks, rng,
} from '../thermos.js';

const VIEW = { pos: [1.5, 4.6, 13.2], target: [1.5, 3.4, 0] };
const DRINKS = { boil: { n: 'Boiling water, 95 °C', T: 95 }, chai: { n: 'Chai, 90 °C', T: 90 }, cold: { n: 'Iced water, 4 °C', T: 4 } };
const RATE = 0.5;                 // hours of simulated time per second
const RUN = { flask: '#ff7a59', lid: '#ffb547', open: '#8ef0ff' };

function makeJug(lid) {
  const g = new THREE.Group(), mat = M.metal(0xc5cbd5, { roughness: 0.3 });
  g.rotation.y = -Math.PI / 4;
  g.add(revolve(wall([[0, 0], [0.62, 0], [0.68, 0.05], [0.7, 2.25], [0.74, 2.3]], 0.04), mat, { cut: true }));
  const liqMat = new THREE.MeshStandardMaterial({ color: 0xc8823c, roughness: 0.15, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
  const liq = revolve([[0, 0], [0.64, 0], [0.64, 1], [0, 1]], liqMat, { cut: true }); liq.position.y = 0.05; liq.scale.y = 1.95; g.add(liq);
  if (lid) { const l = revolve([[0, 2.32], [0.78, 2.32], [0.78, 2.4], [0.3, 2.45], [0.12, 2.6], [0, 2.6]], mat, { cut: true }); g.add(l); }
  g.liqMat = liqMat; g.liq = liq;
  return g;
}

export default {
  id: 'cooling',
  short: 'The cooling curve',
  title: 'The cooling curve',
  subtitle: 'A flask doesn\'t stop cooling. It just cools about twenty times more slowly than a jug.',
  view: VIEW,
  learn: `<p>No flask keeps a drink hot for ever. Heat leaks out at a rate that depends on how much hotter the drink is than the room. Hot things cool fast at first, then slower and slower. That is <b>Newton's law of cooling</b>, and the curve it makes is the same for a geyser, a cup of chai and a flask.</p>
    <p>How fast depends on two numbers. <b>UA</b> is how many watts leak out for each degree of difference: a good steel flask leaks about <b>0.03 W per degree</b>, a steel jug with a lid about 20 times more. <b>C</b>, the <b>heat capacity</b>, is how much heat the drink stores: 500 mL of water holds about 2,100 joules per degree. Divide C by UA and you get the <b>time constant</b>: about 20 hours for the flask, under an hour for the jug.</p>
    <p>What does "keeps hot for 12 hours" mean, then? Not "still steaming". Makers and testers start with water at 95 °C in a 20 °C room. After 12 hours a good steel flask is at about <b>60 to 65 °C</b>: hot enough for tea, and below the 65 °C the WHO's cancer agency, IARC, calls "very hot" (see ${link('coffeeclear', 'CoffeeClear')} and ${link('teaclear', 'TeaClear')}).</p>
    <p>Three tips follow from the physics. <b>Fill it up:</b> a half-full flask leaks almost as much heat but stores only half, so it cools about twice as fast. <b>Pre-heat it</b> with hot water: then the drink doesn't spend its heat warming the cold steel (it helps a little, about 2 °C). And it works the other way too: <b>cold drinks</b> stay cold, because heat leaking in is blocked just the same.</p>
    <p class="tip"><b>Try it:</b> press play and watch twelve hours go by. Then half-fill the flask and run it again. Try iced water on a 35 °C day.</p>`,
  terms: [
    { t: "Newton's law of cooling", d: 'Heat flows out at a rate proportional to the temperature difference, so cooling is fast at first and slows down.' },
    { t: 'Heat capacity (C)', d: 'How much heat something stores per degree. 500 mL of water: about 2,100 J/K.' },
    { t: 'UA', d: 'The watts that leak out for every degree between the drink and the room. Small UA means good insulation.' },
    { t: 'Time constant', d: 'C ÷ UA. In one time constant the gap between the drink and the room shrinks to about 37 %.' },
    { t: 'Pre-heating', d: 'Rinsing the flask with hot water first, so the drink doesn\'t lose heat warming the cold inner wall.' },
  ],
  defaults: { kind: 'steel', drink: 'boil', fill: 1, preheat: true, room: 20, t: 0, play: true },
  controls: [
    { key: 'drink', type: 'seg', label: 'Fill it with', options: [{ v: 'boil', label: '95 °C water' }, { v: 'chai', label: '90 °C chai' }, { v: 'cold', label: '4 °C water' }] },
    { key: 'kind', type: 'seg', label: 'Flask', options: [{ v: 'steel', label: 'All-steel' }, { v: 'glass', label: 'Glass refill' }] },
    { key: 'fill', type: 'range', label: 'How full', min: 0.25, max: 1, step: 0.05, ends: ['a quarter', 'full'], fmt: (v) => Math.round(v * 500) + ' mL' },
    { key: 'preheat', type: 'toggle', label: 'Pre-heated (or pre-chilled)' },
    { key: 'room', type: 'range', label: 'Room', min: 5, max: 40, step: 1, ends: ['5 °C', '40 °C'], fmt: (v) => v + ' °C' },
    { key: 't', type: 'range', label: 'Time', min: 0, max: 12, step: 0.05, ends: ['0 h', '12 h'], fmt: (v) => fmtH(v) },
    { key: 'go', type: 'buttons', label: 'Time-lapse', items: [{ label: '▶ Play 12 hours', act: (s) => { s.t = 0; s.play = true; } }, { label: 'Pause', act: (s) => { s.play = false; } }] },
  ],
  onChange(s, key) { if (key && key !== 't' && key !== 'play' && key !== 'action') { s.t = 0; s.play = true; } if (key === 't') s.play = false; },
  quiz: [
    { q: 'A flask of tea is at 90 °C in a 25 °C room. When does it lose heat fastest?', options: ['At the start', 'Evenly all day', 'At the end', 'Only when you open it'], answer: 0, why: 'The leak is proportional to the difference between the tea and the room. That difference is biggest at the start.' },
    { q: 'Why does a half-full flask go cold faster?', options: ['Half the vacuum is missing', 'It leaks almost as much heat but stores only half as much', 'Air is a good conductor of heat', 'It doesn\'t; it cools at the same rate'], answer: 1, why: 'The neck, stopper and walls leak about the same. With half the drink there is half the heat to lose, so the temperature drops about twice as fast.' },
    { q: 'Can the same flask keep iced water cold?', options: ['No, it only works for hot drinks', 'Only if it is a glass flask', 'Only in winter', 'Yes, it blocks heat flowing in just as well as heat flowing out'], answer: 3, why: 'The vacuum and mirrors block heat whichever way it flows. Cold drinks warm up slowly for exactly the same reason hot ones cool slowly.' },
  ],
  reel: [
    { ms: 5600, caption: 'Twelve hours in twenty seconds: boiling water in a jug is cold by lunch. In the flask it is still about 60 °C.', set: { kind: 'steel', drink: 'boil', fill: 1, preheat: true, room: 20, play: false }, anim: { t: [0, 12] }, view: { pos: [0.1, 5.4, 6.0], target: [0.1, 4.9, 0] }, spin: 0 },
    { ms: 4800, caption: 'Half-full, the flask leaks almost as much heat but stores half as much, so it cools twice as fast.', set: { kind: 'steel', drink: 'boil', fill: 0.5, preheat: true, room: 20, play: false }, anim: { t: [0, 12] }, view: { pos: [0.1, 5.4, 6.0], target: [0.1, 4.9, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(11);
    let F = null, kind = '', S = {}, runs = null, rkey = '', bkey = '';
    const fG = new THREE.Group(); fG.position.set(-1.9, 0, 0); root.add(fG);
    const jl = makeJug(true); jl.position.set(0.15, 0, 0.2); root.add(jl);
    const jo = makeJug(false); jo.position.set(2.0, 0, 0.2); root.add(jo);
    const steam = sparks(root, 60, 0.06, 0xe8f2ff, rnd);
    const lab = (pos) => { const l = stage.label('', pos, root, 'hot'); return l; };
    const lF = lab([-1.9, 2.9, 1.0]), lL = lab([0.15, 1.1, 1.0]), lO = lab([2.0, 1.1, 1.0]);
    const nF = stage.label('flask', [-1.9, -0.35, 0.8], root), nL = stage.label('jug + lid', [0.15, -0.35, 0.8], root), nO = stage.label('open jug', [2.0, -0.35, 0.8], root);
    const lClock = stage.label('', [4.6, 0.55, 0], root);

    function make(k) {
      if (F) fG.remove(F.group);
      F = makeFlask({ kind: k, cut: true }); fG.add(F.group); kind = k; F.cup.visible = false;
    }
    function compute(s) {
      const T0 = DRINKS[s.drink].T, base = { T0, Tr: s.room, fill: s.fill };
      runs = {
        flask: curve({ ...base, vessel: 'flask', kind: s.kind, preheat: s.preheat }),
        lid: curve({ ...base, vessel: 'lid' }),
        open: curve({ ...base, vessel: 'open' }),
        full: s.fill < 0.99 ? curve({ ...base, vessel: 'flask', kind: s.kind, preheat: s.preheat, fill: 1 }) : null,
      };
    }
    const bA = board(root, 4.6, 2.76, 600, 360, (g, w, h) => {
      panelBg(g, w, h);
      if (!runs) return;
      const cold = DRINKS[S.drink].T < S.room, T0 = DRINKS[S.drink].T;
      title(g, cold ? 'Warming up over 12 hours' : 'Cooling over 12 hours', `${Math.round(S.fill * 500)} mL, ${S.room} °C room`);
      const yMin = cold ? 0 : Math.min(10, S.room - 5), yMax = cold ? 45 : 100;
      const { X, Y } = axes(g, w, h, { x0: 70, y1: 82, y0: h - 46, xMax: 12, yMin, yMax, xTicks: [0, 2, 4, 6, 8, 10, 12], yTicks: cold ? [0, 10, 20, 30, 40] : [20, 40, 60, 80, 100].filter((v) => v >= yMin), xFmt: (v) => v + ' h', yFmt: (v) => v + '°' });
      if (!cold) dashH(g, X(0), X(12), Y(65), 'IARC: very hot above 65 °C', 'rgba(255,93,93,.85)');
      dashH(g, X(0), X(12), Y(S.room), `room ${S.room} °C`, 'rgba(111,182,255,.7)', true);
      const upto = (rows) => rows.filter((r) => r[0] <= S.t + 1e-6);
      if (runs.full) line(g, runs.full, X, Y, 'rgba(255,122,89,.35)', 3, [6, 6]);
      ['open', 'lid', 'flask'].forEach((k) => { line(g, runs[k], X, Y, RUN[k] + '33', 3); line(g, upto(runs[k]), X, Y, RUN[k], 5); dot(g, X(S.t), Y(at(runs[k], S.t)), RUN[k], 7); });
      legend(g, [['flask', RUN.flask], ['jug + lid', RUN.lid], ['open jug', RUN.open], ...(runs.full ? [['full flask', 'rgba(255,122,89,.6)']] : [])], 20, 46, 16);
    }, [5.0, 3.3, 0]);

    return {
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        const narrow = fitNarrow(stage, [nL, nO, lClock], [0.08, -0.04]);
        reelBoards([bA], () => [0.2, 8.1, 0, 1.15]);
        if (s.kind !== kind) make(s.kind);
        const rk = `${s.kind}|${s.drink}|${s.fill}|${s.preheat}|${s.room}`;
        if (rk !== rkey) { rkey = rk; compute(s); }
        if (s.play && !inReel()) { s.t = Math.min(12, s.t + RATE * dt); if (s.t >= 12) s.play = false; }
        const Tf = at(runs.flask, s.t), Tl = at(runs.lid, s.t), To = at(runs.open, s.t);
        const lo = 0, hi = 100;
        tempColor(Tf, lo, hi, F.liqMat.color); tempColor(Tl, lo, hi, jl.liqMat.color); tempColor(To, lo, hi, jo.liqMat.color);
        F.setFill(s.fill); jl.liq.scale.y = 1.95 * s.fill; jo.liq.scale.y = 1.95 * s.fill;
        const set = (l, T, c) => { l.element.innerHTML = `<b>${T.toFixed(1)} °C</b>`; l.element.style.setProperty('--c', tempCss(T, lo, hi)); };
        set(lF, Tf); set(lL, Tl); set(lO, To);
        const hh = 7 + s.t, hr = Math.floor(hh) % 24, mn = Math.floor((hh % 1) * 60);
        lClock.element.innerHTML = `clock <b>${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}</b>`;
        // a little steam over the open jug while it is hot
        steam.step(dt, To > 50 ? (To - 45) * 0.5 : 0, () => [2.0 + (rnd() - 0.5) * 0.8, 0.1 + 1.95 * s.fill, 0.2 + (rnd() - 0.5) * 0.8], () => [(rnd() - 0.5) * 0.2, 0.6, 0], 1.4);
        const bk = `${rk}|${s.t.toFixed(2)}`;
        if (bk !== bkey) { bkey = bk; bA.redraw(); }
      },
      readout: (s) => {
        if (!runs) return '';
        const T0 = DRINKS[s.drink].T, cold = T0 < s.room, f = runs.flask;
        const UA = routes(cold ? 10 : 80, s.room, { kind: s.kind, fill: s.fill }).total / ((cold ? 10 : 80) - s.room);
        const tau = flaskC(s.kind, s.fill) / UA / 3600;
        const rows = cold
          ? `<div class="row"><span>Flask after 6 h · 12 h</span><b>${at(f, 6).toFixed(1)} · ${at(f, 12).toFixed(1)} °C</b></div>
             <div class="row"><span>Open jug passes 15 °C after</span><b>${fmtH(crossing(runs.open, 15))}</b></div>
             <div class="row"><span>Flask passes 15 °C after</span><b>${fmtH(crossing(f, 15))}</b></div>`
          : `<div class="row"><span>Flask after 6 h · 12 h</span><b>${at(f, 6).toFixed(1)} · ${at(f, 12).toFixed(1)} °C</b></div>
             <div class="row"><span>Below 65 °C: open jug · flask</span><b>${fmtH(crossing(runs.open, 65))} · ${fmtH(crossing(f, 65))}</b></div>
             <div class="row"><span>Below 60 °C: flask</span><b>${fmtH(crossing(f, 60))}</b></div>`;
        return `<div class="big">${s.t.toFixed(1)} h: flask at ${at(f, s.t).toFixed(1)} °C</div>
          <div class="row"><span>UA · C · time constant</span><b>${(UA * 1000).toFixed(0)} mW/K · ${Math.round(flaskC(s.kind, s.fill)).toLocaleString('en-IN')} J/K · ${tau.toFixed(0)} h</b></div>
          ${rows}
          <small>${!s.preheat ? `Unheated, the cold wall took the start down to ${f[0][1].toFixed(1)} °C.` : s.fill < 0.6 ? 'Half-empty: about the same leak, much less heat stored.' : 'Starting temperature and room matter as much as the flask.'}</small>`;
      },
    };
  },
};

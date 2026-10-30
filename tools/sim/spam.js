'use strict';
// "Can a mass of 1-2 unit types win quickly?" Runs scripted spam strategies against the AI.
//   node tools/sim/spam.js [level] [seeds]       env: FAST=180 (seconds that count as a "fast win")
const { runTasks } = require('./pool');
const { Sim } = require('./engine');

const LEVEL = process.argv[2] || 'hard';
const SEEDS = +(process.argv[3] || 4);
const FAST = +(process.env.FAST || 180);
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const UNITS = process.env.UNITS ? JSON.parse(process.env.UNITS) : null;
const CASTLE_HP = +(process.env.CASTLE_HP || 0);
const GLOBALS = process.env.GLOBALS ? JSON.parse(process.env.GLOBALS) : undefined;   // e.g. GLOBALS='{"HOME_ATK_BONUS":0.3}'

(async () => {
  const sim = new Sim();
  const ids = sim.eval('UNIT_TYPES.filter(u => !u.isSupport).map(u => u.id)');
  const strategies = [];
  for (const id of ids) strategies.push({ name: `mono ${id}`, spec: { kind: 'mono', unit: id } });
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    strategies.push({ name: `duo ${ids[i]}+${ids[j]}`, spec: { kind: 'duo', units: [ids[i], ids[j]] } });
  }
  for (const id of ids) strategies.push({ name: `burst ${id}`, spec: { kind: 'burst', units: [id], threshold: 600 } });
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    strategies.push({ name: `burst ${ids[i]}+${ids[j]}`, spec: { kind: 'burst', units: [ids[i], ids[j]], threshold: 600 } });
  }
  strategies.push({ name: 'mix all', spec: { kind: 'mix' } });
  strategies.push({ name: 'mix all + castle', spec: { kind: 'mix', castle: true } });
  for (const id of ['cavalry', 'knight', 'mage', 'peasant']) {
    strategies.push({ name: `mono ${id} + castle`, spec: { kind: 'mono', unit: id, castle: true, castleFrom: 40 } });
  }
  const list = ONLY ? strategies.filter(s => ONLY.test(s.name)) : strategies;

  const tasks = [], meta = [];
  list.forEach((st, k) => {
    for (let s = 1; s <= SEEDS; s++) {
      tasks.push({ fn: 'simMatch', cfg: { player: st.spec, enemy: { kind: 'ai', level: LEVEL }, seed: s * 7 + k, maxTime: 600, units: UNITS, castleHp: CASTLE_HP, globals: GLOBALS } });
      meta.push(k);
    }
  });
  console.log(`${list.length} strategies x ${SEEDS} seeds vs AI "${LEVEL}" (${tasks.length} matches)`);
  const t0 = Date.now();
  const res = await runTasks(tasks, { progress: 20 });
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  const rows = list.map(st => ({ name: st.name, runs: [] }));
  res.forEach((r, i) => rows[meta[i]].runs.push(r));
  if (process.env.FASTLOG) {
    console.log('\nfast player wins (< ' + FAST + 's):');
    rows.forEach(r => r.runs.filter(x => x.winner === 'player' && x.t < FAST).slice(0, 2).forEach(x => {
      const modes = x.aiModes ? Object.entries(x.aiModes).map(([k, v]) => k + ':' + Math.round(v)).join(' ') : '';
      console.log(`  ${r.name.padEnd(26)} t=${String(x.t).padEnd(6)} opening=${x.opening} modes[${modes}] aiBought=${JSON.stringify(x.bought.enemy)} playerBought=${JSON.stringify(x.bought.player)}`);
    }));
  }
  const med = a => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
  let fastWins = 0, wins = 0, total = 0;
  const out = rows.map(r => {
    const w = r.runs.filter(x => x.winner === 'player');
    wins += w.length; total += r.runs.length;
    const fast = w.filter(x => x.t < FAST).length; fastWins += fast;
    return { name: r.name, winPct: Math.round(100 * w.length / r.runs.length), fast, medT: med(w.map(x => x.t)), minT: w.length ? Math.min(...w.map(x => x.t)) : null,
             lossT: med(r.runs.filter(x => x.winner === 'enemy').map(x => x.t)) };
  });
  out.sort((a, b) => b.winPct - a.winPct || (a.minT || 9999) - (b.minT || 9999));
  console.log('\nstrategy'.padEnd(30) + 'win%  fast  medWinT  minWinT  medLossT');
  out.slice(0, +(process.env.TOP || 25)).forEach(o =>
    console.log(o.name.padEnd(30) + String(o.winPct).padStart(4) + String(o.fast).padStart(6) + String(o.medT ?? '-').padStart(9) + String(o.minT ?? '-').padStart(9) + String(o.lossT ?? '-').padStart(10)));
  console.log(`\nspam wins: ${wins}/${total} (${(100 * wins / total).toFixed(0)}%), wins faster than ${FAST}s: ${fastWins}`);
  const fastest = out.filter(o => o.minT !== null).sort((a, b) => a.minT - b.minT).slice(0, 5);
  console.log('fastest wins: ' + fastest.map(o => `${o.name} ${o.minT}s`).join(' | '));
  process.exit(0);
})();

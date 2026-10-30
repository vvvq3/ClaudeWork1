'use strict';
// Pairwise army duels at equal gold: which unit beats which, and by how much?
//   node tools/sim/matrix.js [budget ...]        (default budgets: 300 900)
const { runTasks } = require('./pool');
const { Sim } = require('./engine');

const budgets = process.argv.slice(2).map(Number).filter(Boolean);
if (!budgets.length) budgets.push(300, 900);
const SEEDS = +(process.env.SEEDS || 10);
const UNITS = process.env.UNITS ? JSON.parse(process.env.UNITS) : null;   // e.g. UNITS='{"catapult":{"baseCost":120}}'

(async () => {
  const sim = new Sim();
  const units = sim.eval('UNIT_TYPES.filter(u => !u.isSupport).map(u => ({ id: u.id, cost: u.baseCost, name: u.name }))');
  const ids = units.map(u => u.id);
  const cost = Object.fromEntries(units.map(u => [u.id, (UNITS && UNITS[u.id] && UNITS[u.id].baseCost) || u.cost]));

  for (const budget of budgets) {
    const tasks = [], meta = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = { [ids[i]]: Math.max(1, Math.round(budget / cost[ids[i]])) };
      const b = { [ids[j]]: Math.max(1, Math.round(budget / cost[ids[j]])) };
      for (let s = 1; s <= SEEDS; s++) { tasks.push({ fn: 'simDuel', cfg: { a, b, seed: s, units: UNITS } }); meta.push([i, j, s]); }
      for (let s = 1; s <= SEEDS; s++) { tasks.push({ fn: 'simDuel', cfg: { a: b, b: a, seed: 100 + s, units: UNITS } }); meta.push([j, i, s]); }
    }
    const res = await runTasks(tasks, {});
    const sum = ids.map(() => ids.map(() => 0)), cnt = ids.map(() => ids.map(() => 0));
    res.forEach((r, k) => {
      const [i, j] = meta[k];
      const score = r.a - r.b;            // + : first army won
      sum[i][j] += score; cnt[i][j]++;
      sum[j][i] -= score; cnt[j][i]++;
    });
    const M = sum.map((row, i) => row.map((v, j) => (cnt[i][j] ? v / cnt[i][j] : 0)));
    console.log(`\n=== equal gold: ${budget} (rows beat columns when > 0) ===`);
    const w = 7;
    console.log(''.padEnd(13) + ids.map(id => id.slice(0, 6).padStart(w)).join('') + '   avg   wins losses');
    ids.forEach((id, i) => {
      const row = M[i];
      const others = row.filter((_, j) => j !== i);
      const avg = others.reduce((x, y) => x + y, 0) / others.length;
      const wins = others.filter(v => v > 0.25).length, losses = others.filter(v => v < -0.25).length;
      console.log(id.padEnd(13) + row.map((v, j) => (i === j ? '   -   ' : v.toFixed(2).padStart(w))).join('') +
        '  ' + avg.toFixed(2).padStart(5) + '  ' + String(wins).padStart(4) + '  ' + String(losses).padStart(5));
    });
    if (process.env.JSON) console.log(JSON.stringify({ budget, ids, M }));
  }
  process.exit(0);
})();

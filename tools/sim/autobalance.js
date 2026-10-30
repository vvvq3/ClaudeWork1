'use strict';
// Adjusts unit COSTS until every fighter has an average duel result close to zero.
// It shows how far prices are from "fair" at the current stats.
//   node tools/sim/autobalance.js [iterations]     env: UNITS='{"catapult":{"baseHp":150}}'  BUDGETS=600,1200  SEEDS=6
const { runTasks } = require('./pool');
const { Sim } = require('./engine');

const ITER = +(process.argv[2] || 6);
const BUDGETS = (process.env.BUDGETS || '600,1200').split(',').map(Number);
const SEEDS = +(process.env.SEEDS || 6);
const BASE = process.env.UNITS ? JSON.parse(process.env.UNITS) : {};

async function measure(costs, ids) {
  const units = {};
  for (const id of ids) units[id] = Object.assign({}, BASE[id] || {}, { baseCost: costs[id] });
  const tasks = [], meta = [];
  for (const budget of BUDGETS) {
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const a = { [ids[i]]: Math.max(1, Math.round(budget / costs[ids[i]])) };
      const b = { [ids[j]]: Math.max(1, Math.round(budget / costs[ids[j]])) };
      for (let s = 1; s <= SEEDS; s++) {
        tasks.push({ fn: 'simDuel', cfg: { a, b, seed: s, units } }); meta.push([i, j]);
        tasks.push({ fn: 'simDuel', cfg: { a: b, b: a, seed: 100 + s, units } }); meta.push([j, i]);
      }
    }
  }
  const res = await runTasks(tasks, {});
  const sum = ids.map(() => 0), cnt = ids.map(() => 0);
  res.forEach((r, k) => {
    const [i, j] = meta[k];
    const sc = r.a - r.b;
    sum[i] += sc; cnt[i]++; sum[j] -= sc; cnt[j]++;
  });
  return sum.map((v, i) => v / cnt[i]);
}

(async () => {
  const sim = new Sim();
  const units = sim.eval('UNIT_TYPES.filter(u => !u.isSupport).map(u => ({ id: u.id, cost: u.baseCost }))');
  const ids = units.map(u => u.id);
  const costs = Object.fromEntries(units.map(u => [u.id, (BASE[u.id] && BASE[u.id].baseCost) || u.cost]));
  for (let it = 0; it <= ITER; it++) {
    const avg = await measure(costs, ids);
    console.log(`iter ${it}: ` + ids.map((id, i) => `${id} ${costs[id]} (${avg[i] >= 0 ? '+' : ''}${avg[i].toFixed(2)})`).join('  '));
    if (it === ITER) break;
    ids.forEach((id, i) => { costs[id] = Math.max(2, costs[id] * (1 + 0.55 * avg[i])); });
  }
  console.log('final costs:', JSON.stringify(Object.fromEntries(ids.map(id => [id, Math.round(costs[id])]))));
  process.exit(0);
})();

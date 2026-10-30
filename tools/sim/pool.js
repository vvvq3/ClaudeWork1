'use strict';
// Runs simulator tasks on several worker threads: each worker owns one vm context.
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

if (!isMainThread) {
  const { Sim } = require('./engine');
  const sim = new Sim(workerData || {});
  parentPort.on('message', msg => {
    if (msg === 'exit') process.exit(0);
    try { parentPort.postMessage({ id: msg.id, result: sim.call(msg.fn, msg.cfg) }); }
    catch (e) { parentPort.postMessage({ id: msg.id, error: String(e && e.stack || e) }); }
  });
} else {
  module.exports.runTasks = function runTasks(tasks, opts = {}) {
    const n = Math.min(opts.workers || os.cpus().length, Math.max(1, tasks.length));
    return new Promise((resolve, reject) => {
      const results = new Array(tasks.length);
      let next = 0, done = 0;
      const workers = [];
      const feed = w => {
        if (next >= tasks.length) return;
        const id = next++;
        w.postMessage({ id, fn: tasks[id].fn, cfg: tasks[id].cfg });
      };
      for (let i = 0; i < n; i++) {
        const w = new Worker(__filename, { workerData: opts.overrides || {} });
        workers.push(w);
        w.on('message', m => {
          if (m.error) { workers.forEach(x => x.terminate()); return reject(new Error(m.error)); }
          results[m.id] = m.result;
          done++;
          if (opts.progress && done % opts.progress === 0) process.stderr.write(`  ${done}/${tasks.length}\r`);
          if (done === tasks.length) { workers.forEach(x => x.postMessage('exit')); resolve(results); }
          else feed(w);
        });
        w.on('error', reject);
        feed(w);
      }
    });
  };
}

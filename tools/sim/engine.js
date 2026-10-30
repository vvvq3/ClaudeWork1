'use strict';
// Host side of the balance simulator: builds a vm context holding the REAL game scripts
// (so balance numbers always come from the shipped code) and exposes simMatch / simDuel.
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const GAME_FILES = ['js/units.js', 'js/state.js', 'js/upgrades.js', 'js/ai-data.js', 'js/ai.js', 'js/battle.js'];

// a stand-in for DOM nodes, the Art namespace and anything else the game touches but a headless run does not need
function makeStub() {
  const fn = function () { return proxy; };
  const proxy = new Proxy(fn, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : proxy),
    apply: () => proxy,
    set: () => true
  });
  return proxy;
}

function createContext(overrides) {
  const stub = makeStub();
  const sandbox = {
    console,
    document: { getElementById: () => stub, createElement: () => stub, querySelectorAll: () => [] },
    window: {},
    Art: stub,
    SoundFX: { play() {}, init() {}, muted: false },
    spawnFloatingText() {}, spawnHitParticles() {}, spawnClashStarburst() {}, spawnCorpse() {},
    updateEffects() {}, updateHUD() {}
  };
  const ctx = vm.createContext(sandbox);
  const files = (overrides && overrides.gameDir ? GAME_FILES.map(f => path.join(overrides.gameDir, f)) : GAME_FILES.map(f => path.join(ROOT, f)));
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  }
  vm.runInContext('canvasWidth = 1280; canvasHeight = 548;', ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'sandbox.js'), 'utf8'), ctx, { filename: 'sandbox.js' });
  return ctx;
}

class Sim {
  constructor(overrides) { this.ctx = createContext(overrides); }
  call(fn, cfg) { return JSON.parse(vm.runInContext(`JSON.stringify(${fn}(${JSON.stringify(cfg)}))`, this.ctx)); }
  match(cfg) { return this.call('simMatch', cfg); }
  duel(cfg) { return this.call('simDuel', cfg); }
  eval(code) { return JSON.parse(vm.runInContext(`JSON.stringify(${code})`, this.ctx)); }
}

module.exports = { Sim, ROOT };

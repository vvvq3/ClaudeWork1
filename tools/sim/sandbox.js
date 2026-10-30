// ============================================================================
// SANDBOX SIDE OF THE BALANCE SIMULATOR
// Evaluated inside the vm context, after the real game scripts. It adds a headless
// game loop (same order of updates as js/main.js), scripted "player" bots, army
// duels and full matches. Nothing here is shipped with the game.
// ============================================================================
const SIM = { bought: null };

function seedRandom(seed) {
  let s = (seed >>> 0) || 1;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// count purchases per team and unit
const __origBuy = buyUnit;
buyUnit = function (team, id) {
  const ok = __origBuy(team, id);
  if (ok && SIM.bought) SIM.bought[team][id] = (SIM.bought[team][id] || 0) + 1;
  return ok;
};

function finishGame(winner) {
  gameState.gameOver = true;
  gameState.winner = winner;
}

const UT = id => UNIT_TYPES.find(t => t.id === id);

// Experiments can override unit fields per task: cfg.units = { catapult: { baseCost: 100 } }.
// The original definitions are restored before every task so overrides never leak.
const ORIG_UNITS = JSON.parse(JSON.stringify(UNIT_TYPES));
function applyOverrides(over, globals) {
  if (globals && globals.HOME_ATK_BONUS !== undefined) HOME_ATK_BONUS = globals.HOME_ATK_BONUS;
  ORIG_UNITS.forEach(o => Object.assign(UT(o.id), JSON.parse(JSON.stringify(o))));
  if (over) for (const id of Object.keys(over)) Object.assign(UT(id), over[id]);
}
const FIGHTERS = () => UNIT_TYPES.filter(u => !u.isSupport).map(u => u.id);

function armyValue(team) {
  let v = 0;
  for (const u of gameState.units) {
    if (u.team === team && u.hp > 0) v += u.type.baseCost * Math.max(0, Math.min(1, u.hp / u.maxHp));
  }
  return v;
}

// ---- bots ----------------------------------------------------------------------------------
// A bot buys units like a person clicking the cards: it never cheats, it only chooses what to buy.
function cardScore(c, units, team) {
  const enemy = otherTeam(team);
  const enemyCount = gameState.units.filter(u => u.team === enemy && u.hp > 0).length;
  if (c.unitId && units.includes(c.unitId)) return 10 + c.pct / 10;
  if (c.type === 'gold_rate') return 6 + c.amount;
  if (c.type === 'instant_gold') return 5 + c.amount / 100;
  if (c.type === 'wipe_enemies') return enemyCount >= 6 ? 9 : 1;
  if (c.type === 'castle_heal') return teamCastleHp(team) < teamCastleMaxHp(team) * 0.7 ? 8 : 1;
  if (c.type === 'castle_max_hp') return 3;
  return 1;
}

function makeBot(team, spec) {
  const bot = { team, spec, spent: {}, acc: 0, pending: null };
  const units = spec.units || (spec.unit ? [spec.unit] : FIGHTERS());
  const weights = spec.weights || units.map(() => 1);

  const nextUnit = () => {
    // the unit whose share of the spending is furthest below its target share
    let best = units[0], bestRatio = Infinity;
    units.forEach((u, i) => {
      const ratio = (bot.spent[u] || 0) / weights[i];
      if (ratio < bestRatio) { bestRatio = ratio; best = u; }
    });
    return best;
  };
  const buy = id => {
    const cost = getTeamUnitStats(team, UT(id)).cost;
    if (buyUnit(team, id)) { bot.spent[id] = (bot.spent[id] || 0) + cost; return true; }
    return false;
  };

  bot.update = function (dt) {
    bot.acc += dt;
    if (bot.acc < 0.25) return;
    bot.acc = 0;
    if (spec.castle && teamCastleLevel(team) < CASTLE_UPGRADES.length) {
      const up = CASTLE_UPGRADES[teamCastleLevel(team)];
      if (gameState.elapsedTime >= (spec.castleFrom || 0) && teamGold(team) >= up.cost) {
        setTeamGold(team, teamGold(team) - up.cost);
        applyCastleUpgrade(team);
        return;
      }
    }
    switch (spec.kind) {
      case 'idle': return;
      case 'mono':
      case 'duo':
        for (let i = 0; i < 10; i++) { if (!buy(nextUnit())) break; }
        return;
      case 'burst':
        // hold the money, then send everything at once
        if (teamGold(team) >= (spec.threshold || 600)) {
          for (let i = 0; i < 60; i++) { if (!buy(nextUnit())) break; }
        }
        return;
      case 'mix':
        for (let i = 0; i < 10; i++) {
          if (!bot.pending) bot.pending = units[Math.floor(Math.random() * units.length)];
          if (buy(bot.pending)) bot.pending = null; else break;
        }
        return;
    }
  };
  bot.pickCard = cards => {
    let best = cards[0], bestScore = -1;
    for (const c of cards) { const sc = cardScore(c, units, team); if (sc > bestScore) { bestScore = sc; best = c; } }
    return best;
  };
  return bot;
}

function makeController(team, spec) {
  if (spec.kind === 'ai') {
    if (typeof createAI === 'function') return createAI(team, spec.level || 'hard', spec.options || {});
    // legacy shim: the enemy-only AI of the previous version
    return { update: dt => updateEnemyAI(dt), pickCard: cards => cards[Math.floor(Math.random() * cards.length)] };
  }
  return makeBot(team, spec);
}

// ---- full match ---------------------------------------------------------------------------------
function simStep(dt, ctl) {
  gameState.elapsedTime += dt;
  gameState.goldTickTimer += dt;
  while (gameState.goldTickTimer >= GOLD_TICK_INTERVAL) {
    gameState.goldTickTimer -= GOLD_TICK_INTERVAL;
    gameState.gold += gameState.goldPerTick;
    gameState.enemyGold += gameState.enemyGoldPerTick;
  }
  gameState.upgradeTimer += dt;
  if (gameState.upgradeTimer >= UPGRADE_INTERVAL) {
    gameState.upgradeTimer -= UPGRADE_INTERVAL;
    for (const team of ['player', 'enemy']) {
      const cards = generateThreeUpgradeCards(team);
      const chosen = ctl[team].pickCard(cards) || cards[0];
      chosen.applyToTeam(team);
      if (team === 'player') gameState.appliedUpgradesCount++; else gameState.aiUpgradesCount++;
    }
  }
  ctl.player.update(dt);
  ctl.enemy.update(dt);
  updateBattlefield(dt);
}

function simMatch(cfg) {
  applyOverrides(cfg.units, cfg.globals);
  seedRandom(cfg.seed || 1);
  gameState = createInitialState();
  gameState.paused = false;
  if (cfg.castleHp) {
    gameState.playerCastleHp = gameState.playerCastleMaxHp = cfg.castleHp;
    gameState.enemyCastleHp = gameState.enemyCastleMaxHp = cfg.castleHp;
  }
  SIM.bought = { player: {}, enemy: {} };
  SIM.trace = null;
  const ctl = { player: makeController('player', cfg.player), enemy: makeController('enemy', cfg.enemy) };
  const dt = cfg.dt || 0.05;
  const maxT = cfg.maxTime || 600;
  const snaps = [];
  let nextSnap = 30;
  while (!gameState.gameOver && gameState.elapsedTime < maxT) {
    simStep(dt, ctl);
    if (cfg.trace && Math.floor(gameState.elapsedTime / cfg.trace) !== Math.floor((gameState.elapsedTime - dt) / cfg.trace)) {
      const cnt = team => gameState.units.filter(u => u.team === team && u.hp > 0).length;
      (SIM.trace = SIM.trace || []).push([Math.round(gameState.elapsedTime), ctl.enemy.mode || '-', Math.round(gameState.enemyGold), cnt('enemy'), cnt('player'),
        Math.round(armyValue('enemy')), Math.round(armyValue('player')), Math.round(gameState.playerCastleHp), Math.round(gameState.enemyCastleHp)]);
    }
    if (gameState.elapsedTime >= nextSnap) {
      nextSnap += 30;
      snaps.push([Math.round(gameState.elapsedTime), Math.round(gameState.playerCastleHp), Math.round(gameState.enemyCastleHp),
        Math.round(armyValue('player')), Math.round(armyValue('enemy'))]);
    }
  }
  const alive = team => gameState.units.filter(u => u.team === team && u.hp > 0).reduce((m, u) => (m[u.type.id] = (m[u.type.id] || 0) + 1, m), {});
  return {
    winner: gameState.winner || 'none',
    t: Math.round(gameState.elapsedTime * 10) / 10,
    pHp: Math.round(gameState.playerCastleHp), eHp: Math.round(gameState.enemyCastleHp),
    pLvl: gameState.playerCastleLevel, eLvl: gameState.enemyCastleLevel,
    bought: SIM.bought, aliveP: alive('player'), aliveE: alive('enemy'), snaps,
    mods: { p: gameState.unitMods, e: gameState.enemyUnitMods },
    trace: SIM.trace, aiModes: ctl.enemy.modeLog || null, opening: ctl.enemy.opening || null
  };
}

// ---- army duel (no economy, no castle defenders): who survives with how much? --------------------
function simDuel(cfg) {
  applyOverrides(cfg.units, cfg.globals);
  seedRandom(cfg.seed || 1);
  gameState = createInitialState();
  gameState.paused = false;
  gameState.playerCastleDefenders = [];
  gameState.enemyCastleDefenders = [];
  gameState.playerCastleHp = gameState.playerCastleMaxHp = 1e9;
  gameState.enemyCastleHp = gameState.enemyCastleMaxHp = 1e9;
  const place = (team, army) => {
    for (const id of Object.keys(army)) {
      for (let i = 0; i < army[id]; i++) gameState.units.push(createUnitEntity(team, UT(id)));
    }
  };
  place('player', cfg.a);
  place('enemy', cfg.b);
  const v0 = { a: armyValue('player'), b: armyValue('enemy') };
  const dt = 0.05;
  const maxT = cfg.maxTime || 150;
  while (gameState.elapsedTime < maxT) {
    gameState.elapsedTime += dt;
    updateBattlefield(dt);
    const na = gameState.units.some(u => u.team === 'player' && u.hp > 0 && !u.type.isSupport);
    const nb = gameState.units.some(u => u.team === 'enemy' && u.hp > 0 && !u.type.isSupport);
    if (!na || !nb) break;
  }
  return { a: armyValue('player') / v0.a, b: armyValue('enemy') / v0.b, t: Math.round(gameState.elapsedTime) };
}

// ============================================================================
// COMPUTER OPPONENT
// One engine, three difficulty levels (easy / normal / hard). It can drive either side, which
// the balance simulator in tools/sim uses for mirror matches. The AI never cheats: it earns the
// same gold and pays the same prices as the player.
//
// The "hard" level thinks like this:
//  1. It watches the enemy army (what is on the field plus what it has bought recently) and looks
//     up which of its own unit types counter that mix (AI_COUNTER, measured by the simulator).
//  2. It picks a tactic and switches when the situation changes:
//       rush    - opening strike with fast cheap units while the enemy is still empty
//       balance - mixed army, mild counter-picking
//       counter - the enemy is one-sided: build mostly what beats it
//       defend  - enemy troops are about to reach the gate: spend everything on defenders now
//       push    - clearly ahead: siege and heavy units to finish the castle
//       turtle  - behind or the castle is hurt: ranged units and castle upgrades
//  3. Upgrade cards change its tastes: a unit that got +damage, +health or a discount is bought
//     more often, and it picks cards that fit the army it is building.
//  4. Outside of emergencies it saves gold and releases it in waves, so units arrive together
//     instead of one by one.
// ============================================================================

const AI_FIGHTERS = ['peasant', 'archer', 'knight', 'crossbowman', 'cavalry', 'catapult', 'spearman', 'mage'];
const AI_MELEE = ['peasant', 'spearman', 'knight', 'cavalry'];

// how much each tactic likes each unit (1 = neutral)
const AI_TACTICS = {
  rush:   { cavalry: 2.4, peasant: 1.8, knight: 0.9, archer: 0.8, spearman: 0.5, crossbowman: 0.3, mage: 0.2, catapult: 0.05 },
  defend: { archer: 1.5, crossbowman: 1.5, knight: 1.3, mage: 1.3, spearman: 1.2, peasant: 1.0, cavalry: 0.8, catapult: 0.4 },
  push:   { catapult: 1.6, mage: 1.3, knight: 1.3, cavalry: 1.2, crossbowman: 1.0, archer: 0.9, spearman: 0.8, peasant: 0.7 },
  turtle: { mage: 1.3, crossbowman: 1.3, archer: 1.3, knight: 1.1, spearman: 1.0, catapult: 0.6, cavalry: 0.7, peasant: 0.6 }
};

// fixed shopping list used by the easy level (and as a mild bias for normal)
function aiBaseWeight(id, t, level) {
  switch (id) {
    case 'peasant': return t < 15 ? 16 : 9;
    case 'archer': return 26;
    case 'knight': return 28;
    case 'crossbowman': return 22;
    case 'cavalry': return t > 15 ? 18 : 10;
    case 'catapult': return t > 25 ? 12 : 5;
    case 'spearman': return 7;
    case 'mage': return t > level.mageFrom ? 14 : 0;
    default: return 10;
  }
}

const AI_LEVELS = {
  // `waste` is a handicap: the easy AI loses that share of its income (it "wastes" the gold)
  easy:   { think: 1.2, counterK: 0,   buffExp: 0,   diversityK: 0,   waves: false, tactics: false, castle: 0.1, commander: 0,   smartCards: false, mageFrom: 90, baseBias: 1,   waste: 0.35 },
  normal: { think: 0.5, counterK: 0.7, buffExp: 0.3, diversityK: 0.3, waves: false, tactics: false, castle: 0.3, commander: 0,   smartCards: false, mageFrom: 30, baseBias: 1,   waste: 0 },
  hard:   { think: 0.28, counterK: 2.3, buffExp: 1.4, diversityK: 1.4, waves: true,  tactics: true,  castle: 1.0,  commander: 2.2, smartCards: true,  mageFrom: 0,  baseBias: 0.15 }
};

function aiUnitsOf(team) {
  return gameState.units.filter(u => u.team === team && u.hp > 0);
}
function aiValue(u) {
  return u.type.baseCost * Math.max(0, Math.min(1, u.hp / u.maxHp));
}
function aiGateX(team) {
  const pos = getCastlePositions();
  return team === 'player' ? pos.leftCastleX + 54 : pos.rightCastleX - 54;
}
function aiIncome(team) {
  return (team === 'player' ? gameState.goldPerTick : gameState.enemyGoldPerTick) / GOLD_TICK_INTERVAL;
}
// combined strength multiplier from upgrade cards: damage x health / price
function aiBuff(team, id) {
  const m = teamMods(team)[id];
  return m.atkMult * m.hpMult / m.costMult;
}

function createAI(team, level = 'hard', options = {}) {
  const cfg = Object.assign({}, AI_LEVELS[level] || AI_LEVELS.hard, options);
  const foe = otherTeam(team);
  const ai = {
    team, level, cfg,
    mode: 'balance', modeSince: 0, nextMode: 0, nextThink: 0.3, lastThink: 0,
    opening: Math.random() < (options.rushChance !== undefined ? options.rushChance : 0.15) ? 'rush' : 'balance',
    waving: false,
    seen: new Set(),     // enemy unit ids already counted in the history
    hist: {},            // decayed memory of what the enemy has been fielding
    seenSpent: 0,        // total price of every enemy unit seen so far (to guess how much gold the enemy is saving)
    modeLog: {}          // seconds spent in each tactic (for tests)
  };

  // ---- perception -------------------------------------------------------------------------
  function perceive() {
    const t = gameState.elapsedTime;
    const mine = aiUnitsOf(team);
    const theirs = aiUnitsOf(foe);
    const gate = aiGateX(team);
    const p = { t, gold: teamGold(team), income: aiIncome(team), mine, theirs, myValue: 0, theirValue: 0, ownBy: {}, enBy: {}, threat: 0, local: 0, imminent: 0, rangedValue: 0 };

    for (const u of mine) {
      const v = aiValue(u);
      if (!u.type.isSupport) p.myValue += v;
      p.ownBy[u.type.id] = (p.ownBy[u.type.id] || 0) + v;
      if (Math.abs(u.x - gate) < 560) p.local += v;
    }
    for (const u of theirs) {
      const v = aiValue(u);
      if (!u.type.isSupport) p.theirValue += v;
      p.enBy[u.type.id] = (p.enBy[u.type.id] || 0) + v;
      if (!ai.seen.has(u.id)) {          // first sighting: remember it for a while
        ai.seen.add(u.id);
        ai.hist[u.type.id] = (ai.hist[u.type.id] || 0) + u.type.baseCost;
        ai.seenSpent += u.type.baseCost;
      }
      const dist = Math.abs(u.x - gate);
      const eta = dist / Math.max(20, u.type.speed);
      if (u.type.isRanged && !u.type.isSupport) p.rangedValue += v;
      if (dist < 450 || eta < 9) p.imminent += v;
      if (dist < 380 || eta < 7) {
        // ranged troops far from the gate hurt less than melee ones about to storm it
        p.threat += v * (u.type.isRanged && dist > u.range * 1.2 ? 0.5 : 1);
      }
    }
    p.defended = p.local + 40 + 60 * teamCastleLevel(team);
    // what the enemy is built from: what we see now, plus a decaying memory of recent purchases
    p.comp = {};
    for (const id of AI_FIGHTERS) p.comp[id] = (p.enBy[id] || 0) + 0.6 * (ai.hist[id] || 0);
    // an enemy commander is a tough, armoured target: treat it like a knight
    if (p.enBy.commander) p.comp.knight += p.enBy.commander * 0.5;
    p.castleRatio = teamCastleHp(team) / teamCastleMaxHp(team);
    // The enemy's bank can be guessed from what it has shown: expected income minus the price of
    // everything it has put on the field. A player who buys nothing is saving for one big strike.
    p.enemyBank = Math.max(0, 100 + 4.5 * t - ai.seenSpent);
    return p;
  }

  // ---- tactics ----------------------------------------------------------------------------
  function chooseMode(p) {
    if (!cfg.tactics) return 'balance';
    if (p.threat > 0.8 * p.defended + 25 && p.threat > 40) return 'defend';
    if (ai.opening === 'rush' && p.t < 55) {
      // a rush runs straight into shooters: call it off when the enemy fields many of them
      if (p.t > 8 && (p.rangedValue > 35 || p.theirValue > 90)) ai.opening = 'balance';
      else return 'rush';
    }
    const ratio = (p.myValue + 1) / (p.theirValue + 1);
    if (ratio > 1.5 && p.myValue > 220 && p.castleRatio > 0.35) return 'push';
    if (ratio < 0.65 || p.castleRatio < 0.4) return 'turtle';
    // a one-sided enemy army is worth countering hard
    const tot = AI_FIGHTERS.reduce((s, id) => s + p.comp[id], 0);
    const top = Math.max(...AI_FIGHTERS.map(id => p.comp[id]));
    return tot > 120 && top / tot > 0.5 ? 'counter' : 'balance';
  }

  function updateMode(p) {
    const wanted = chooseMode(p);
    const urgent = wanted === 'defend' || ai.mode === 'defend';
    if (wanted !== ai.mode && (urgent || p.t - ai.modeSince > 6)) {
      ai.mode = wanted;
      ai.modeSince = p.t;
    }
  }

  // ---- shopping ---------------------------------------------------------------------------
  function unitWeights(p) {
    const weights = {};
    const compTotal = AI_FIGHTERS.reduce((s, id) => s + p.comp[id], 0);
    const ownTotal = AI_FIGHTERS.reduce((s, id) => s + (p.ownBy[id] || 0), 0) || 1;
    const meleeShare = AI_MELEE.reduce((s, id) => s + (p.ownBy[id] || 0), 0) / ownTotal;
    const tactic = AI_TACTICS[ai.mode] || {};
    for (const id of AI_FIGHTERS) {
      let w = 1;
      if (cfg.counterK > 0 && compTotal > 0) {
        let S = 0;
        for (const j of AI_FIGHTERS) S += p.comp[j] * AI_COUNTER[id][j];
        w = Math.exp(cfg.counterK * (S / compTotal));
      }
      if (cfg.baseBias > 0) {
        const b = aiBaseWeight(id, p.t, cfg) / 20;
        w *= Math.pow(Math.max(0.01, b), cfg.baseBias);
      } else if (id === 'mage' && p.t <= cfg.mageFrom) {
        w *= 0.2;
      }
      w *= Math.pow(aiBuff(team, id), cfg.buffExp);
      w /= 1 + cfg.diversityK * ((p.ownBy[id] || 0) / ownTotal);
      if (cfg.tactics) w *= tactic[id] !== undefined ? tactic[id] : 1;
      if (cfg.tactics && ownTotal > 60) {
        // keep a front line in front of the shooters and some shooters behind the front line
        if (meleeShare < 0.3 && AI_MELEE.includes(id)) w *= 1.6;
        if (meleeShare > 0.8 && !AI_MELEE.includes(id)) w *= 1.4;
      }
      weights[id] = w;
    }
    return weights;
  }

  function candidates(p, horizon) {
    const list = [];
    const weights = unitWeights(p);
    const reach = p.gold + p.income * horizon;
    for (const id of AI_FIGHTERS) {
      const cost = getTeamUnitStats(team, UNIT_TYPES.find(u => u.id === id)).cost;
      let w = weights[id];
      if (cost > reach) w *= 0.12;           // too far away to be worth saving for
      list.push({ kind: 'unit', id, cost, w });
    }
    // castle upgrade: mostly a defensive investment
    const level = teamCastleLevel(team);
    if (cfg.castle > 0 && level < CASTLE_UPGRADES.length && p.t > 45 && ai.mode !== 'rush') {
      const up = CASTLE_UPGRADES[level];
      let w = cfg.castle * ({ defend: 2.6, turtle: 1.6, balance: 0.7, counter: 0.7, push: 0.25 }[ai.mode] || 0.6);
      if (p.castleRatio < 0.7) w *= 1.4;
      if (up.cost > reach) w *= 0.12;
      list.push({ kind: 'castle', id: 'castle', cost: up.cost, w });
    }
    // commander: only worth it once there is an army to inspire, and only one at a time
    if (cfg.commander > 0 && ai.mode !== 'rush' && p.t > 50 && auraFactor(team) < 1) {
      const fighters = p.mine.filter(u => !u.type.isSupport).length;
      if (fighters >= 5 && p.myValue >= 140) {
        const cost = getTeamUnitStats(team, UNIT_TYPES.find(u => u.id === 'commander')).cost;
        let w = cfg.commander * Math.max(0.5, Math.min(2, p.myValue / 300));
        if (cost > reach) w *= 0.12;
        list.push({ kind: 'unit', id: 'commander', cost, w });
      }
    }
    return list;
  }

  function weightedPick(list) {
    // sharpen the weights a little so strong choices win more often than a plain lottery would give
    const sharp = list.map(c => Math.pow(c.w, cfg.tactics ? 1.6 : 1));
    const total = sharp.reduce((a, b) => a + b, 0);
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (let i = 0; i < list.length; i++) { r -= sharp[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }

  function waveGold(p) {
    if (!cfg.waves) return 0;
    const base = Math.min(260, 70 + p.t * 0.5);
    return base * (ai.mode === 'push' ? 1.3 : ai.mode === 'turtle' ? 0.8 : 1);
  }

  // Gold the hard AI keeps back for an emergency (grows with the size of the enemy army).
  function reserve(p) {
    if (!cfg.waves || p.t < 40 || ai.mode === 'rush') return 0;
    const guess = 0.9 * p.enemyBank + 0.3 * p.theirValue;
    return Math.max(30, Math.min(700, guess)) * (ai.mode === 'push' ? 0.5 : 1);
  }

  function spend(p) {
    let keep = 0;                   // gold that must stay in the bank after buying
    let horizon = 5;
    if (cfg.waves) {
      // the enemy is at the gate and we are too weak there: answer with everything at once
      const dumping = p.imminent > 30 && p.imminent > 0.5 * p.local;
      if (dumping || ai.mode === 'rush') {
        horizon = 2;
      } else if (ai.mode === 'defend') {
        // do not feed defenders one by one into a bigger army: wait until a response the size of
        // the threat can be bought in one go (the castle and its garrison hold meanwhile)
        const needed = Math.min(1.15 * p.threat, 520);
        if (p.gold < needed && !ai.waving) return;
        ai.waving = true;
        horizon = 2;
      } else {
        const need = waveGold(p);
        keep = reserve(p);
        if (!ai.waving && p.gold < need + keep) return;      // keep saving for the next wave
        ai.waving = true;
      }
    }
    for (let n = 0; n < 14; n++) {
      p.gold = teamGold(team);
      const pick = weightedPick(candidates(p, horizon));
      if (!pick || p.gold < pick.cost) break;       // wait until the chosen item is affordable
      if (p.gold - pick.cost < keep) break;
      let ok = false;
      if (pick.kind === 'castle') {
        setTeamGold(team, p.gold - pick.cost);
        ok = applyCastleUpgrade(team);
      } else {
        ok = buyUnit(team, pick.id);
      }
      if (!ok) break;
      p.ownBy[pick.id] = (p.ownBy[pick.id] || 0) + pick.cost;
      if (pick.kind === 'unit' && pick.id !== 'commander') p.myValue += pick.cost;
    }
    if (teamGold(team) < keep + 12) ai.waving = false;
  }

  // ---- main update --------------------------------------------------------------------------
  ai.update = function (dt) {
    if (cfg.waste) setTeamGold(team, Math.max(0, teamGold(team) - aiIncome(team) * cfg.waste * dt));
    ai.nextThink -= dt;
    if (ai.nextThink > 0) return;
    ai.nextThink = cfg.think * (0.8 + Math.random() * 0.4);

    const p = perceive();
    const elapsed = p.t - ai.lastThink;
    ai.lastThink = p.t;
    if (elapsed > 0) {
      const decay = Math.exp(-elapsed / 45);
      for (const id of Object.keys(ai.hist)) ai.hist[id] *= decay;
    }
    ai.modeLog[ai.mode] = (ai.modeLog[ai.mode] || 0) + elapsed;
    updateMode(p);
    spend(p);
  };

  // ---- upgrade cards --------------------------------------------------------------------------
  ai.pickCard = function (cards) {
    const enemyCount = aiUnitsOf(foe).length;
    if (!cfg.smartCards) {
      // easy / normal: random card, but never a pointless "wipe" when the field is empty
      const ok = cards.filter(c => !(c.type === 'wipe_enemies' && enemyCount < 3));
      const pool = ok.length ? ok : cards;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const p = perceive();
    const w = unitWeights(p);
    const wTotal = AI_FIGHTERS.reduce((s, id) => s + w[id], 0) || 1;
    const timeLeft = Math.max(0, (600 - p.t) / 60);          // minutes of game that are probably left
    let best = cards[0], bestScore = -Infinity;
    for (const c of cards) {
      let score = 1;
      if (c.unitId) {
        // a buff is worth what the army will actually be made of
        const share = (w[c.unitId] || 0.05) / wTotal;
        const own = (p.ownBy[c.unitId] || 0) / (AI_FIGHTERS.reduce((s, id) => s + (p.ownBy[id] || 0), 0) || 1);
        score = (c.pct / 10) * (0.4 + 5 * Math.max(share, own));
        if (c.type === 'unit_hp') score *= 0.9;
      } else if (c.type === 'gold_rate') {
        score = c.amount * (0.9 + timeLeft * 0.8);
      } else if (c.type === 'instant_gold') {
        score = c.amount / 25;
      } else if (c.type === 'castle_max_hp') {
        score = (c.pct / 10) * (p.castleRatio < 0.7 ? 1.8 : 1) * (ai.mode === 'turtle' || ai.mode === 'defend' ? 1.5 : 1);
      } else if (c.type === 'castle_heal') {
        score = (1 - p.castleRatio) * c.pct / 4;
      } else if (c.type === 'wipe_enemies') {
        score = p.theirValue / 55 * (p.myValue < p.theirValue ? 1.4 : 1) + (p.threat > 60 ? 4 : 0);
      }
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  };

  return ai;
}

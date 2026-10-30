// ============================================================================
// GAME STATE & UPGRADE SYSTEM
// ============================================================================
const UPGRADE_INTERVAL = 20; // Every 20 seconds 3 cards appear & game pauses
const GOLD_TICK_INTERVAL = 0.25; // +1 coin per 0.25s = +4 coins/sec
const ROAD_HALF_WIDTH = 72; // 2x wider solid sandy road
const CORPSE_DURATION = 15.0; // Blood puddle & unique corpse remain for 15 seconds

let gameState = null;

function createUnitModsMap() {
  const mods = {};
  UNIT_TYPES.forEach(u => {
    mods[u.id] = {
      costMult: 1.0,
      atkMult: 1.0,
      hpMult: 1.0
    };
  });
  return mods;
}

function createUnitBattleStatsMap() {
  const map = {};
  UNIT_TYPES.forEach(u => {
    map[u.id] = {
      id: u.id,
      name: u.name,
      spawned: 0,
      damageDealt: 0,
      kills: 0
    };
  });
  map['castle_archers'] = {
    id: 'castle_archers',
    name: 'Лучники замка (x3)',
    spawned: 3,
    damageDealt: 0,
    kills: 0
  };
  return map;
}

function createInitialState() {
  return {
    running: true,
    paused: false,
    gameOver: false,
    winner: null,
    elapsedTime: 0,

    // Economy: +4 coins/sec, both sides start with 100 coins
    goldTickTimer: 0,
    goldPerTick: 1.0,
    gold: 100,

    // Paid extra 3-card upgrade button: arithmetic progression 100, 200, 300, 400...
    paidUpgradeCost: 100,
    paidUpgradePurchases: 0,

    // Player castle & 3 archers on castle walls (with 2x range!)
    playerCastleHp: 1000,
    playerCastleMaxHp: 1000,
    playerCastleArcherTimers: [0.15, 0.55, 0.95],
    playerCastleArcherAnim: [0, 0, 0],
    unitMods: createUnitModsMap(),
    appliedUpgradesCount: 0,

    // Enemy AI stats & 3 archers on castle walls
    enemyGold: 100,
    enemyGoldPerTick: 1.0,
    enemyCastleHp: 1000,
    enemyCastleMaxHp: 1000,
    enemyCastleArcherTimers: [0.25, 0.65, 1.05],
    enemyCastleArcherAnim: [0, 0, 0],
    enemyUnitMods: createUnitModsMap(),
    aiPlannedUnitId: null,
    aiDecisionCooldown: 0.4,
    aiUpgradesCount: 0,
    lastEnemyUpgradeText: '',

    // 3-Card Upgrade system every 20 seconds
    upgradeTimer: 0,
    pendingUpgrades: 0,
    modalOpen: false,
    currentCards: [],

    // Entities on battlefield
    units: [],
    corpses: [], // Blood puddles & unique unit corpses that stay for 15 seconds
    projectiles: [],
    particles: [],
    clashes: [],
    floatingTexts: [],

    // Detailed per-unit statistics for Player
    unitBattleStats: createUnitBattleStatsMap(),

    // Overall Statistics
    stats: {
      unitsSpawned: 0,
      enemiesDefeated: 0,
      goldEarned: 100,
      upgradesPicked: 0
    }
  };
}

// Effective stats for Player or Enemy team
function getTeamUnitStats(team, unitType) {
  const modMap = team === 'player' ? gameState.unitMods : gameState.enemyUnitMods;
  const mod = modMap[unitType.id];
  const cost = Math.max(1, Math.round(unitType.baseCost * mod.costMult));
  const hp = Math.max(1, Math.round(unitType.baseHp * mod.hpMult));
  const atk = Math.max(1, Math.round(unitType.baseAtk * mod.atkMult));
  return { cost, hp, atk };
}

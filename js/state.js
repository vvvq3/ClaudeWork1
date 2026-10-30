// ============================================================================
// GAME STATE & UPGRADE SYSTEM
// ============================================================================
const UPGRADE_INTERVAL = 20; // Every 20 seconds 3 cards appear & game pauses
const GOLD_TICK_INTERVAL = 0.25; // +1 coin per 0.25s = +4 coins/sec
const ROAD_HALF_WIDTH = 72; // 2x wider solid sandy road
const CORPSE_DURATION = 15.0; // fallen units stay on the road for 15 seconds

// ---- castle garrison & upgrades ---------------------------------------------
// Castle-local slots (origin = centre of the castle base, +x towards the road, y down).
// Slots 0-2 are the wall archers every castle starts with; 3-7 are unlocked by castle upgrades.
const CASTLE_SLOTS = [
  { x: -38, y: -92 },   // 0 wall archer
  { x: -5,  y: -98 },   // 1 wall archer (on the plinth)
  { x: 28,  y: -92 },   // 2 wall archer
  { x: 46,  y: -92 },   // 3 upgrade 1: archer on the wall
  { x: -21, y: -92 },   // 4 upgrade 2: crossbowman on the wall
  { x: -42, y: 15 },    // 5 upgrade 3: mage in the yard
  { x: -86, y: 13 },    // 6 upgrade 4: catapult in the yard
  { x: -2,  y: 17 }     // 7 upgrade 5: commander in the yard
];
// What each garrison member shoots with (stats come from the matching unit type).
const CASTLE_DEFENDER_KINDS = {
  archer:      { unit: 'archer',      range: 570, muzzleY: -22, arc: 36, speedMul: 1.15 },
  crossbowman: { unit: 'crossbowman', range: 620, muzzleY: -22, arc: 12, speedMul: 1.1 },
  mage:        { unit: 'mage',        range: 480, muzzleY: -34, arc: 18, speedMul: 1.0 },
  catapult:    { unit: 'catapult',    range: 640, muzzleY: -40, arc: 90, speedMul: 1.0 },
  commander:   { unit: 'commander' }   // no weapon: provides the inspiring aura
};
// Castle upgrade ladder: price, new garrison member, slot they stand in.
const CASTLE_UPGRADES = [
  { cost: 100, kind: 'archer',      slot: 3, name: 'Лучник' },
  { cost: 200, kind: 'crossbowman', slot: 4, name: 'Арбалетчик' },
  { cost: 300, kind: 'mage',        slot: 5, name: 'Маг' },
  { cost: 400, kind: 'catapult',    slot: 6, name: 'Катапульта' },
  { cost: 500, kind: 'commander',   slot: 7, name: 'Командир' }
];
const CASTLE_UPGRADE_HP = 400;   // every castle upgrade also adds this much max HP (and heals it)

// Commander aura numbers live with the unit definition.
const COMMANDER_AURA = UNIT_TYPES.find(t => t.id === 'commander').aura;

function createCastleDefenders(timerOffset) {
  return [0.15, 0.55, 0.95].map((t, i) => ({ kind: 'archer', slot: i, timer: t + timerOffset, anim: 0 }));
}

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
    name: 'Гарнизон замка',
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

    // Player castle & its garrison (3 wall archers + castle upgrades)
    playerCastleHp: 1000,
    playerCastleMaxHp: 1000,
    playerCastleLevel: 0,
    playerCastleDefenders: createCastleDefenders(0),
    unitMods: createUnitModsMap(),
    appliedUpgradesCount: 0,

    // Enemy AI stats & garrison
    enemyGold: 100,
    enemyGoldPerTick: 1.0,
    enemyCastleHp: 1000,
    enemyCastleMaxHp: 1000,
    enemyCastleLevel: 0,
    enemyCastleDefenders: createCastleDefenders(0.1),
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
    corpses: [], // fallen units that stay on the road for a while
    projectiles: [],
    particles: [],
    clashes: [],
    floatingTexts: [],
    bolts: [],   // lightning flashes (visual only)
    flash: 0,    // full-screen flash strength (visual only)
    auraActive: { player: false, enemy: false },   // commander aura switched on

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

// ============================================================================
// UNIT DEFINITIONS (gameplay stats; the artwork lives in js/art/)
// - Cavalry movement speed doubled: 78 * 2 = 156
// - Melee units have tight contact range so they walk right up to each other!
// - Knights take 50% less damage from all arrows, bolts & catapults!
// ============================================================================
const UNIT_TYPES = [
  {
    id: 'peasant',
    key: '1',
    name: 'Крестьянин',
    genitivePlural: 'крестьян',
    baseCost: 5,
    baseHp: 20,
    baseAtk: 5,
    range: 4, // Tight melee contact range so they walk right up to each other
    speed: 62,
    atkCooldown: 1.0,
    radius: 8.5, // 6.5 * 1.3
    isRanged: false,
    splash: 0
  },
  {
    id: 'archer',
    key: '2',
    name: 'Лучник',
    genitivePlural: 'лучников',
    baseCost: 12,
    baseHp: 36,
    baseAtk: 8,
    range: 175,
    speed: 50,
    atkCooldown: 1.25,
    radius: 8.5,
    isRanged: true,
    projectileType: 'arrow',
    projectileSpeed: 360,
    splash: 0
  },
  {
    id: 'knight',
    key: '3',
    name: 'Рыцарь',
    genitivePlural: 'рыцарей',
    baseCost: 25,
    baseHp: 100,
    baseAtk: 22,
    range: 5, // Tight melee contact range
    speed: 46,
    atkCooldown: 1.1,
    radius: 10.4, // 8 * 1.3
    isRanged: false,
    rangedDamageResistance: 0.5, // Takes 50% less damage from all arrows/bolts & catapults!
    splash: 0
  },
  {
    id: 'crossbowman',
    key: '4',
    name: 'Арбалетчик',
    genitivePlural: 'арбалетчиков',
    baseCost: 35,
    baseHp: 60,
    baseAtk: 16,
    range: 322,
    speed: 45,
    atkCooldown: 1.45,
    radius: 9.1, // 7 * 1.3
    isRanged: true,
    projectileType: 'bolt',
    projectileSpeed: 460,
    splash: 0
  },
  {
    id: 'cavalry',
    key: '5',
    name: 'Рыцарь на коне',
    shortCardTitle: 'Всадник',
    genitivePlural: 'конных рыцарей',
    baseCost: 60,
    baseHp: 170,
    baseAtk: 40,
    range: 7, // Tight lance melee contact range
    speed: 156, // 2x faster movement speed! (was 78)
    atkCooldown: 1.05,
    radius: 13.0, // 10 * 1.3
    isRanged: false,
    rangedDamageResistance: 0.5, // Mounted knight also armored against arrows/catapults
    splash: 0
  },
  {
    id: 'catapult',
    key: '6',
    name: 'Катапульта',
    genitivePlural: 'катапульт',
    baseCost: 110,
    baseHp: 220,
    baseAtk: 42,
    range: 295,
    speed: 28,
    atkCooldown: 2.4,
    radius: 15.6, // 12 * 1.3
    isRanged: true,
    projectileType: 'boulder',
    projectileSpeed: 260,
    splash: 42
  }
];

function formatInt(val) {
  return Math.round(val);
}

// ============================================================================
// UNIT CARD PORTRAITS
// ============================================================================
function getUnitCardSVG(unitId) {
  // portraits are rendered from the battlefield sprites (js/art/icons.js)
  return Art.icons.unitCard(unitId);
}

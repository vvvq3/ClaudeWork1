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
    splash: 0,
    role: 'Дешёвый боец ближнего боя',
    notes: ['Выручает, пока золота мало', 'Уязвим для стрел и огня']
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
    splash: 0,
    role: 'Стрелок с луком',
    notes: ['Стреляет издалека, пока свои держат строй', 'Слаб против конницы']
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
    splash: 0,
    role: 'Тяжёлый пехотинец',
    notes: ['−50% урона от стрел, болтов и камней', 'Магия бьёт его без скидки']
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
    splash: 0,
    role: 'Дальний стрелок',
    notes: ['Самая большая дальность среди бойцов', 'Болты вдвое слабее по рыцарям и коннице']
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
    splash: 0,
    role: 'Быстрая ударная конница',
    notes: ['Скорость вдвое выше, чем у остальных', '−50% урона от стрел, болтов и камней', 'Копейщики наносят ей ×2,5 урона']
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
    splash: 42,
    role: 'Осадная машина',
    notes: ['Камень бьёт по площади и по замку', 'Очень медленная', 'Огонь мага наносит ей ×1,5 урона']
  },
  {
    id: 'spearman',
    key: '7',
    name: 'Копейщик',
    genitivePlural: 'копейщиков',
    baseCost: 15,
    baseHp: 55,
    baseAtk: 9,
    range: 10, // long spear: reaches a little further than other melee units
    speed: 52,
    atkCooldown: 1.0,
    radius: 9.2,
    isRanged: false,
    splash: 0,
    bonusVs: { cavalry: 2.5 }, // anti-cavalry: x2.5 damage against mounted knights
    role: 'Охотник на конницу',
    notes: ['×2,5 урона по конным рыцарям', 'Длинное копьё бьёт чуть дальше других', 'Слабоват против пехоты']
  },
  {
    id: 'mage',
    key: '8',
    name: 'Маг',
    genitivePlural: 'магов',
    baseCost: 50,
    baseHp: 45,
    baseAtk: 16,
    range: 235,
    speed: 44,
    atkCooldown: 2.0,
    radius: 8.8,
    isRanged: true,
    projectileType: 'fireball',
    projectileSpeed: 330,
    splash: 0,
    multiTarget: 3,          // each fireball burns up to 3 enemies at once
    ignoreArmor: true,       // fire ignores the knights' ranged-damage resistance
    bonusVs: { catapult: 1.5 }, // wooden siege machines burn well
    role: 'Огненные шары',
    notes: ['Каждый шар бьёт сразу 3 цели', 'Игнорирует броню рыцарей и конницы', '×1,5 урона по катапультам', 'Очень хрупкий']
  },
  {
    id: 'commander',
    key: '9',
    name: 'Командир',
    genitivePlural: 'командиров',
    baseCost: 90,
    baseHp: 120,
    baseAtk: 12,
    range: 6,
    speed: 40,
    atkCooldown: 1.1,
    radius: 10.5,
    isRanged: false,
    splash: 0,
    isSupport: true,         // keeps behind the army instead of leading the charge
    aura: { atkMult: 1.3, hpMult: 1.3, healPerSec: 0.03 },
    role: 'Воодушевляет армию',
    notes: ['Пока жив: все ваши бойцы на поле получают +30% здоровья и урона', 'И лечатся на 3% здоровья в секунду', 'Держится позади армии', 'Несколько командиров не складываются']
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

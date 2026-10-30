// ============================================================================
// UNIT DEFINITIONS
// - Unit size increased by +30%: UNIT_SCALE = 0.5 * 1.3 = 0.65
// - Cavalry movement speed doubled: 78 * 2 = 156
// - Melee units have tight contact range so they walk right up to each other!
// - Knights take 50% less damage from all arrows, bolts & catapults!
// ============================================================================
const UNIT_SCALE = 0.65; // +30% larger than 0.5!

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
// SVG THUMBNAILS FOR UNIT CARDS & BONUS UPGRADE CARD
// ============================================================================
function getUnitCardSVG(unitId) {
  switch (unitId) {
    case 'peasant':
      return `<svg viewBox="0 0 64 64" class="w-11 h-11 sm:w-13 sm:h-13 drop-shadow">
        <line x1="14" y1="12" x2="14" y2="58" stroke="#6b4423" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M8 17 L8 7 M14 17 L14 6 M20 17 L20 7 M8 15 Q14 19 20 15" stroke="#cbd5e1" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <rect x="27" y="48" width="6" height="9" rx="2" fill="#5c3a21" stroke="#1f140e" stroke-width="2"/>
        <rect x="36" y="48" width="6" height="9" rx="2" fill="#5c3a21" stroke="#1f140e" stroke-width="2"/>
        <path d="M24 31 L45 31 L47 49 L22 49 Z" fill="#e5cca9" stroke="#1f140e" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="23" y="41" width="23" height="4" fill="#5c3a21" stroke="#1f140e" stroke-width="1.8"/>
        <circle cx="34.5" cy="21" r="10.5" fill="#f7cfa6" stroke="#1f140e" stroke-width="2.5"/>
        <path d="M24 19 Q34.5 7 45 19 Q42 12 34.5 12 Q27 12 24 19 Z" fill="#7c4722" stroke="#1f140e" stroke-width="2.2"/>
        <circle cx="31.5" cy="21.5" r="1.6" fill="#1f140e"/>
        <circle cx="38" cy="21.5" r="1.6" fill="#1f140e"/>
        <path d="M32 26 Q35 28 37.5 26" stroke="#7c4722" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      </svg>`;
    case 'archer':
      return `<svg viewBox="0 0 64 64" class="w-11 h-11 sm:w-13 sm:h-13 drop-shadow">
        <path d="M20 32 L40 32 L42 50 L18 50 Z" fill="#3f6212" stroke="#1a2e05" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="30" cy="22" r="9.5" fill="#f7cfa6" stroke="#1a2e05" stroke-width="2.5"/>
        <path d="M18 24 Q28 5 41 21 L30 14 Z" fill="#365314" stroke="#1a2e05" stroke-width="2.5"/>
        <path d="M43 11 Q56 32 43 53" fill="none" stroke="#854d0e" stroke-width="3.8" stroke-linecap="round"/>
        <line x1="43" y1="12" x2="43" y2="52" stroke="#e5e7eb" stroke-width="1.5"/>
        <line x1="31" y1="32" x2="54" y2="32" stroke="#a16207" stroke-width="2.5"/>
        <polygon points="55,32 49,29 49,35" fill="#cbd5e1"/>
      </svg>`;
    case 'knight':
      return `<svg viewBox="0 0 64 64" class="w-11 h-11 sm:w-13 sm:h-13 drop-shadow">
        <polygon points="10,8 16,7 20,37 14,38" fill="#f8fafc" stroke="#1f2937" stroke-width="2.3"/>
        <line x1="9" y1="33" x2="24" y2="31" stroke="#f59e0b" stroke-width="3.5" stroke-linecap="round"/>
        <rect x="23" y="31" width="20" height="21" rx="4" fill="#9ca3af" stroke="#1f2937" stroke-width="2.5"/>
        <path d="M31 6 Q39 4 42 13" fill="none" stroke="#ef4444" stroke-width="5" stroke-linecap="round"/>
        <rect x="23" y="12" width="19" height="18" rx="6" fill="#d1d5db" stroke="#1f2937" stroke-width="2.5"/>
        <line x1="27" y1="20" x2="38" y2="20" stroke="#1f2937" stroke-width="2.5"/>
        <line x1="32.5" y1="16" x2="32.5" y2="26" stroke="#475569" stroke-width="2"/>
        <path d="M38 32 L54 32 L54 42 Q46 54 38 42 Z" fill="#dc2626" stroke="#1f2937" stroke-width="2.5"/>
        <line x1="46" y1="34" x2="46" y2="48" stroke="#fde047" stroke-width="2.5"/>
        <line x1="41" y1="39" x2="51" y2="39" stroke="#fde047" stroke-width="2.5"/>
      </svg>`;
    case 'crossbowman':
      return `<svg viewBox="0 0 64 64" class="w-11 h-11 sm:w-13 sm:h-13 drop-shadow">
        <rect x="19" y="32" width="19" height="20" rx="4" fill="#475569" stroke="#1f2937" stroke-width="2.5"/>
        <circle cx="28.5" cy="22.5" r="9.5" fill="#f7cfa6" stroke="#1f2937" stroke-width="2.5"/>
        <path d="M16 20 Q28.5 8 41 20 Z" fill="#94a3b8" stroke="#1f2937" stroke-width="2.5"/>
        <rect x="32" y="31" width="23" height="5.5" rx="2" fill="#78350f" stroke="#1f140e" stroke-width="2"/>
        <path d="M50 21 Q58 34 50 47" fill="none" stroke="#cbd5e1" stroke-width="3.5" stroke-linecap="round"/>
      </svg>`;
    case 'cavalry':
      return `<svg viewBox="0 0 64 64" class="w-11 h-11 sm:w-13 sm:h-13 drop-shadow">
        <rect x="13" y="36" width="33" height="15" rx="6.5" fill="#92400e" stroke="#27180c" stroke-width="2.5"/>
        <path d="M40 40 L48 23 L58 28 L50 43 Z" fill="#92400e" stroke="#27180c" stroke-width="2.5"/>
        <path d="M15 40 L45 40 L43 50 L17 50 Z" fill="#dc2626" stroke="#27180c" stroke-width="2"/>
        <rect x="23" y="20" width="14" height="17" rx="3.5" fill="#d1d5db" stroke="#1f2937" stroke-width="2.2"/>
        <circle cx="30" cy="13.5" r="7" fill="#9ca3af" stroke="#1f2937" stroke-width="2.2"/>
        <line x1="7" y1="34" x2="59" y2="14" stroke="#d97706" stroke-width="3.8" stroke-linecap="round"/>
        <polygon points="59,14 50,14 53,20" fill="#e5e7eb" stroke="#1f2937" stroke-width="1.5"/>
      </svg>`;
    case 'catapult':
      return `<svg viewBox="0 0 64 64" class="w-11 h-11 sm:w-13 sm:h-13 drop-shadow">
        <line x1="36" y1="40" x2="15" y2="17" stroke="#78350f" stroke-width="5" stroke-linecap="round"/>
        <circle cx="14" cy="15" r="7" fill="#6b7280" stroke="#1f2937" stroke-width="2.2"/>
        <polygon points="13,46 53,46 42,25 24,25" fill="#a16207" stroke="#27180c" stroke-width="2.5"/>
        <rect x="9" y="42" width="46" height="7" rx="2" fill="#78350f" stroke="#27180c" stroke-width="2.5"/>
        <circle cx="19" cy="51" r="8.5" fill="#5c3a21" stroke="#1f140e" stroke-width="2.5"/>
        <circle cx="19" cy="51" r="3" fill="#9ca3af"/>
        <circle cx="45" cy="51" r="8.5" fill="#5c3a21" stroke="#1f140e" stroke-width="2.5"/>
        <circle cx="45" cy="51" r="3" fill="#9ca3af"/>
      </svg>`;
    case 'buy_cards':
      return `<svg viewBox="0 0 64 64" class="w-11 h-11 sm:w-13 sm:h-13 drop-shadow">
        <rect x="10" y="14" width="24" height="34" rx="4" transform="rotate(-14 22 31)" fill="#3b82f6" stroke="#1e1b4b" stroke-width="2.5"/>
        <rect x="20" y="11" width="24" height="34" rx="4" fill="#ef4444" stroke="#1e1b4b" stroke-width="2.5"/>
        <rect x="30" y="14" width="24" height="34" rx="4" transform="rotate(14 42 31)" fill="#eab308" stroke="#1e1b4b" stroke-width="2.5"/>
        <text x="42" y="36" font-size="16" font-weight="900" fill="#fff" stroke="#1e1b4b" stroke-width="1" text-anchor="middle">★</text>
      </svg>`;
  }
}

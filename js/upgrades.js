// ============================================================================
// CONTEXT-AWARE 3-CARD UPGRADE GENERATOR WITH SIMPLIFIED ONE-NUMBER DISPLAY
// ============================================================================
function generateThreeUpgradeCards(forTeam = 'player') {
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const isEarlyGame = gameState.elapsedTime < 45 && gameState.appliedUpgradesCount < 2;

  const eligibleUnits = isEarlyGame
    ? UNIT_TYPES.filter(u => u.baseCost <= 35)
    : UNIT_TYPES;
  const pickEligibleUnit = () => eligibleUnits[Math.floor(Math.random() * eligibleUnits.length)];

  const castleHp = forTeam === 'player' ? gameState.playerCastleHp : gameState.enemyCastleHp;
  const castleMaxHp = forTeam === 'player' ? gameState.playerCastleMaxHp : gameState.enemyCastleMaxHp;
  const opposingTeam = forTeam === 'player' ? 'enemy' : 'player';
  const enemiesOnField = gameState.units.filter(u => u.team === opposingTeam && u.hp > 0).length;

  const availableTypes = [
    'gold_rate',
    'instant_gold',
    'unit_discount',
    'unit_atk',
    'unit_hp'
  ];

  if (!isEarlyGame) {
    availableTypes.push('castle_max_hp');
    if (castleHp <= castleMaxHp * 0.88) {
      availableTypes.push('castle_heal');
    }
  } else if (castleHp <= castleMaxHp * 0.75) {
    availableTypes.push('castle_heal');
  }

  if (enemiesOnField >= 2 || (!isEarlyGame && enemiesOnField >= 1)) {
    availableTypes.push('wipe_enemies');
  }

  const shuffled = [...availableTypes].sort(() => Math.random() - 0.5);
  const chosenTypes = shuffled.slice(0, 3);

  return chosenTypes.map(type => createUpgradeCardObject(type, randInt, pickEligibleUnit));
}

function createUpgradeCardObject(type, randInt, pickUnit) {
  if (type === 'gold_rate') {
    const bonusPerSec = [1, 2, 3][randInt(0, 2)];
    const bonusPerTick = bonusPerSec * GOLD_TICK_INTERVAL;
    return {
      type,
      theme: 'green',
      subject: 'ДОБЫЧА ЗОЛОТА',
      bigValue: `+${bonusPerSec}/сек`,
      subtitle: 'Скорость монет',
      shortTag: `+${bonusPerSec}/с 🪙`,
      iconSVG: `<svg viewBox="0 0 64 64" class="w-12 h-12 mx-auto drop-shadow">
        <path d="M20 12 H44 L36 30 L44 48 H20 L28 30 Z" fill="#fef08a" stroke="#451a03" stroke-width="3"/>
        <circle cx="45" cy="44" r="10" fill="#facc15" stroke="#451a03" stroke-width="2.5"/>
      </svg>`,
      applyToTeam: (team) => {
        if (team === 'player') {
          gameState.goldPerTick = +(gameState.goldPerTick + bonusPerTick).toFixed(3);
          spawnFloatingText(180, canvasHeight * 0.45, `ДОБЫЧА +${bonusPerSec}/СЕК!`, '#fde047');
        } else {
          gameState.enemyGoldPerTick = +(gameState.enemyGoldPerTick + bonusPerTick).toFixed(3);
          spawnFloatingText(canvasWidth - 180, canvasHeight * 0.42, `ИИ: ДОБЫЧА +${bonusPerSec}/СЕК`, '#93c5fd');
        }
      },
      aiSummary: `Добыча +${bonusPerSec}/сек`
    };
  }

  if (type === 'instant_gold') {
    const coins = [100, 200, 300][randInt(0, 2)];
    return {
      type,
      theme: 'gold',
      subject: 'КАЗНА СРАЗУ',
      bigValue: `+${coins} 🪙`,
      subtitle: 'Монет мгновенно',
      shortTag: `+${coins}🪙`,
      iconSVG: `<svg viewBox="0 0 64 64" class="w-12 h-12 mx-auto drop-shadow">
        <circle cx="24" cy="38" r="13" fill="#eab308" stroke="#451a03" stroke-width="2.8"/>
        <circle cx="40" cy="36" r="13" fill="#facc15" stroke="#451a03" stroke-width="2.8"/>
        <circle cx="32" cy="24" r="13" fill="#fde047" stroke="#451a03" stroke-width="2.8"/>
        <text x="32" y="29" font-size="14" font-weight="900" fill="#713f12" text-anchor="middle">★</text>
      </svg>`,
      applyToTeam: (team) => {
        if (team === 'player') {
          gameState.gold += coins;
          gameState.stats.goldEarned += coins;
          spawnFloatingText(180, canvasHeight * 0.45, `+${coins} МОНЕТ!`, '#fde047');
        } else {
          gameState.enemyGold += coins;
          spawnFloatingText(canvasWidth - 180, canvasHeight * 0.42, `ИИ: +${coins} МОНЕТ!`, '#fde047');
        }
      },
      aiSummary: `Казна +${coins}🪙`
    };
  }

  if (type === 'wipe_enemies') {
    return {
      type,
      theme: 'purple',
      subject: 'КАРА ВРАГОВ',
      bigValue: `100% 💀`,
      subtitle: 'Убить всех на поле',
      shortTag: `Кара 💀`,
      iconSVG: `<svg viewBox="0 0 64 64" class="w-12 h-12 mx-auto drop-shadow">
        <polygon points="36,6 16,34 31,34 24,58 48,28 33,28" fill="#fde047" stroke="#451a03" stroke-width="2.8" stroke-linejoin="round"/>
      </svg>`,
      applyToTeam: (team) => {
        const targetTeam = team === 'player' ? 'enemy' : 'player';
        let killed = 0;
        for (let i = gameState.units.length - 1; i >= 0; i--) {
          const u = gameState.units[i];
          if (u.team === targetTeam) {
            spawnHitParticles(u.x, u.y - 12, '#fde047', 10);
            spawnClashStarburst(u.x, u.y - 12);
            spawnCorpse(u);
            if (targetTeam === 'enemy') gameState.stats.enemiesDefeated++;
            gameState.units.splice(i, 1);
            killed++;
          }
        }
        SoundFX.play('wipe');
        if (team === 'player') {
          spawnFloatingText(canvasWidth * 0.5, canvasHeight * 0.42, `ВСЕ ВРАГИ УНИЧТОЖЕНЫ (${killed})!`, '#f87171');
        } else {
          spawnFloatingText(canvasWidth * 0.5, canvasHeight * 0.42, `ИИ УНИЧТОЖИЛ ВАШ ОТРЯД (${killed})!`, '#60a5fa');
        }
      },
      aiSummary: `Кара врагов (100% 💀)`
    };
  }

  if (type === 'unit_discount') {
    const unit = pickUnit();
    const pct = [20, 25, 30, 35][randInt(0, 3)];
    const shortName = unit.shortCardTitle || unit.name;
    return {
      type,
      theme: 'green',
      subject: `ЦЕНА: ${shortName.toUpperCase()}`,
      bigValue: `-${pct}%`,
      subtitle: 'Дешевле найм',
      shortTag: `${shortName} -${pct}%🪙`,
      iconSVG: `<svg viewBox="0 0 64 64" class="w-12 h-12 mx-auto drop-shadow">
        <polygon points="14,32 34,12 52,12 52,30 32,50" fill="#4ade80" stroke="#14532d" stroke-width="3"/>
        <circle cx="43" cy="21" r="3.5" fill="#14532d"/>
      </svg>`,
      applyToTeam: (team) => {
        const mods = team === 'player' ? gameState.unitMods : gameState.enemyUnitMods;
        mods[unit.id].costMult *= (1 - pct / 100);
        if (team === 'player') {
          spawnFloatingText(180, canvasHeight * 0.45, `${shortName}: ЦЕНА -${pct}%!`, '#86efac');
        } else {
          spawnFloatingText(canvasWidth - 180, canvasHeight * 0.42, `ИИ: ${shortName} -${pct}%🪙`, '#93c5fd');
        }
      },
      aiSummary: `${shortName}: Цена -${pct}%`
    };
  }

  if (type === 'unit_atk') {
    const unit = pickUnit();
    const pct = [25, 30, 35, 40][randInt(0, 3)];
    const shortName = unit.shortCardTitle || unit.name;
    return {
      type,
      theme: 'red',
      subject: `УРОН: ${shortName.toUpperCase()}`,
      bigValue: `+${pct}%`,
      subtitle: 'Сила удара',
      shortTag: `${shortName} +${pct}%⚔️`,
      iconSVG: `<svg viewBox="0 0 64 64" class="w-12 h-12 mx-auto drop-shadow">
        <path d="M14 50 L48 14 L54 12 L52 18 L18 54 Z" fill="#e5e7eb" stroke="#450a0a" stroke-width="2.5"/>
        <line x1="14" y1="38" x2="28" y2="52" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
      </svg>`,
      applyToTeam: (team) => {
        const mods = team === 'player' ? gameState.unitMods : gameState.enemyUnitMods;
        mods[unit.id].atkMult *= (1 + pct / 100);
        gameState.units.forEach(u => {
          if (u.team === team && u.type.id === unit.id) {
            u.atk = Math.max(1, Math.round(u.atk * (1 + pct / 100)));
          }
        });
        if (team === 'player') {
          spawnFloatingText(180, canvasHeight * 0.45, `${shortName}: УРОН +${pct}%!`, '#fca5a5');
        } else {
          spawnFloatingText(canvasWidth - 180, canvasHeight * 0.42, `ИИ: ${shortName} +${pct}%⚔️`, '#fca5a5');
        }
      },
      aiSummary: `${shortName}: Урон +${pct}%`
    };
  }

  if (type === 'unit_hp') {
    const unit = pickUnit();
    const pct = [25, 30, 35, 40][randInt(0, 3)];
    const shortName = unit.shortCardTitle || unit.name;
    return {
      type,
      theme: 'blue',
      subject: `ЗАЩИТА: ${shortName.toUpperCase()}`,
      bigValue: `+${pct}%`,
      subtitle: 'Здоровье бойца',
      shortTag: `${shortName} +${pct}%🛡️`,
      iconSVG: `<svg viewBox="0 0 64 64" class="w-12 h-12 mx-auto drop-shadow">
        <path d="M16 14 L32 8 L48 14 V32 C48 44 32 54 32 54 C32 54 16 44 16 32 Z" fill="#38bdf8" stroke="#0c4a6e" stroke-width="3"/>
        <path d="M32 16 V46 M22 28 H42" stroke="#e0f2fe" stroke-width="4" stroke-linecap="round"/>
      </svg>`,
      applyToTeam: (team) => {
        const mods = team === 'player' ? gameState.unitMods : gameState.enemyUnitMods;
        mods[unit.id].hpMult *= (1 + pct / 100);
        gameState.units.forEach(u => {
          if (u.team === team && u.type.id === unit.id) {
            const inc = Math.round(u.maxHp * (pct / 100));
            u.maxHp += inc;
            u.hp += inc;
          }
        });
        if (team === 'player') {
          spawnFloatingText(180, canvasHeight * 0.45, `${shortName}: HP +${pct}%!`, '#7dd3fc');
        } else {
          spawnFloatingText(canvasWidth - 180, canvasHeight * 0.42, `ИИ: ${shortName} +${pct}%🛡️`, '#7dd3fc');
        }
      },
      aiSummary: `${shortName}: Защита +${pct}%`
    };
  }

  if (type === 'castle_max_hp') {
    const pct = [20, 25, 30][randInt(0, 2)];
    return {
      type,
      theme: 'blue',
      subject: 'БРОНЯ ЗАМКА',
      bigValue: `+${pct}%`,
      subtitle: 'Макс. HP замка',
      shortTag: `Замок +${pct}%🏰`,
      iconSVG: `<svg viewBox="0 0 64 64" class="w-12 h-12 mx-auto drop-shadow">
        <rect x="16" y="24" width="32" height="28" rx="3" fill="#9ca3af" stroke="#1e293b" stroke-width="3"/>
        <path d="M32 30 V44 M25 37 H39" stroke="#22c55e" stroke-width="4" stroke-linecap="round"/>
      </svg>`,
      applyToTeam: (team) => {
        if (team === 'player') {
          const boost = Math.round(gameState.playerCastleMaxHp * (pct / 100));
          gameState.playerCastleMaxHp += boost;
          gameState.playerCastleHp += boost;
          spawnFloatingText(140, canvasHeight * 0.4, `ЗАМОК +${boost} HP!`, '#67e8f9');
        } else {
          const boost = Math.round(gameState.enemyCastleMaxHp * (pct / 100));
          gameState.enemyCastleMaxHp += boost;
          gameState.enemyCastleHp += boost;
          spawnFloatingText(canvasWidth - 140, canvasHeight * 0.4, `ИИ ЗАМОК +${boost} HP!`, '#67e8f9');
        }
      },
      aiSummary: `Броня замка +${pct}%`
    };
  }

  const healPct = [20, 30, 40, 50][randInt(0, 3)];
  return {
    type: 'castle_heal',
    theme: 'blue',
    subject: 'РЕМОНТ ЗАМКА',
    bigValue: `+${healPct}%`,
    subtitle: 'Лечение HP замка',
    shortTag: `Ремонт +${healPct}%❤️`,
    iconSVG: `<svg viewBox="0 0 64 64" class="w-12 h-12 mx-auto drop-shadow">
      <circle cx="32" cy="32" r="20" fill="#22c55e" stroke="#14532d" stroke-width="3"/>
      <path d="M32 20 V44 M20 32 H44" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
    applyToTeam: (team) => {
      if (team === 'player') {
        const healAmount = Math.round(gameState.playerCastleMaxHp * (healPct / 100));
        gameState.playerCastleHp = Math.min(gameState.playerCastleMaxHp, gameState.playerCastleHp + healAmount);
        spawnFloatingText(140, canvasHeight * 0.4, `РЕМОНТ +${healAmount} HP!`, '#4ade80');
      } else {
        const healAmount = Math.round(gameState.enemyCastleMaxHp * (healPct / 100));
        gameState.enemyCastleHp = Math.min(gameState.enemyCastleMaxHp, gameState.enemyCastleHp + healAmount);
        spawnFloatingText(canvasWidth - 140, canvasHeight * 0.4, `ИИ РЕМОНТ +${healAmount} HP!`, '#4ade80');
      }
    },
    aiSummary: `Ремонт замка +${healPct}%`
  };
}

function applyRandomUpgradeForEnemy() {
  const aiCards = generateThreeUpgradeCards('enemy');
  const playerUnitCount = gameState.units.filter(u => u.team === 'player' && u.hp > 0).length;
  let candidates = aiCards.filter(c => !(c.type === 'wipe_enemies' && playerUnitCount < 3));
  if (candidates.length === 0) candidates = aiCards;

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  chosen.applyToTeam('enemy');
  gameState.aiUpgradesCount++;
  gameState.lastEnemyUpgradeText = chosen.aiSummary;

  const enemyBuffsRow = document.getElementById('enemyBuffsRow');
  if (enemyBuffsRow && chosen.shortTag) {
    const badge = document.createElement('span');
    badge.className = 'px-1.5 py-0.5 rounded bg-sky-950/90 border border-sky-400/70 text-sky-200 text-[10px] font-bold shadow';
    badge.textContent = chosen.shortTag;
    enemyBuffsRow.appendChild(badge);
  }

  return chosen;
}

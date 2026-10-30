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

// The chips above the castles show the last three cards each side has picked.
const MAX_BUFF_CHIPS = 3;
function addBuffChip(team, text) {
  const row = document.getElementById(team === 'player' ? 'playerBuffsRow' : 'enemyBuffsRow');
  if (!row || !text) return;
  const chip = document.createElement('span');
  chip.className = 'buff-chip ' + (team === 'player' ? 'buff-player' : 'buff-enemy');
  chip.textContent = text;
  row.appendChild(chip);
  while (row.children.length > MAX_BUFF_CHIPS) row.removeChild(row.firstChild);
}

// Visual feedback for card effects (position of the castle that receives them).
function castleFxPos(team) {
  const { leftCastleX, rightCastleX, roadCenterY } = getCastlePositions();
  return { x: team === 'player' ? leftCastleX - 10 : rightCastleX + 10, y: roadCenterY - 70 };
}

function createUpgradeCardObject(type, randInt, pickUnit) {
  if (type === 'gold_rate') {
    const bonusPerSec = [1, 2, 3][randInt(0, 2)];
    const bonusPerTick = bonusPerSec * GOLD_TICK_INTERVAL;
    return {
      type,
      theme: 'green',
      amount: bonusPerSec,
      subject: 'ДОБЫЧА ЗОЛОТА',
      bigValue: `+${bonusPerSec}/сек`,
      subtitle: 'Скорость монет',
      shortTag: `+${bonusPerSec}/с 🪙`,
      iconSVG: Art.icons.upgrade('gold_rate'),
      applyToTeam: (team) => {
        if (team === 'player') {
          gameState.goldPerTick = +(gameState.goldPerTick + bonusPerTick).toFixed(3);
          Art.fx.coins(castleFxPos('player').x, castleFxPos('player').y + 30, 5);
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
      amount: coins,
      subject: 'КАЗНА СРАЗУ',
      bigValue: `+${coins} 🪙`,
      subtitle: 'Монет мгновенно',
      shortTag: `+${coins}🪙`,
      iconSVG: Art.icons.upgrade('instant_gold'),
      applyToTeam: (team) => {
        if (team === 'player') {
          gameState.gold += coins;
          gameState.stats.goldEarned += coins;
          Art.fx.coins(castleFxPos('player').x, castleFxPos('player').y + 30, 10);
          spawnFloatingText(180, canvasHeight * 0.45, `+${coins} МОНЕТ!`, '#fde047');
        } else {
          gameState.enemyGold += coins;
          Art.fx.coins(castleFxPos('enemy').x, castleFxPos('enemy').y + 30, 10);
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
      iconSVG: Art.icons.upgrade('wipe_enemies'),
      applyToTeam: (team) => {
        const targetTeam = team === 'player' ? 'enemy' : 'player';
        let killed = 0;
        for (let i = gameState.units.length - 1; i >= 0; i--) {
          const u = gameState.units[i];
          if (u.team === targetTeam) {
            Art.fx.lightning(u.x, u.y - 8);
            spawnHitParticles(u.x, u.y - 12, '#fde047', 10);
            spawnClashStarburst(u.x, u.y - 12, 'magic');
            spawnCorpse(u);
            if (targetTeam === 'enemy') gameState.stats.enemiesDefeated++;
            gameState.units.splice(i, 1);
            killed++;
          }
        }
        SoundFX.play('wipe');
        gameState.flash = 1;
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
      unitId: unit.id,
      pct,
      subject: `ЦЕНА: ${shortName.toUpperCase()}`,
      bigValue: `-${pct}%`,
      subtitle: 'Дешевле найм',
      shortTag: `${shortName} -${pct}%🪙`,
      iconSVG: Art.icons.upgrade('unit_discount', unit.id),
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
      unitId: unit.id,
      pct,
      subject: `УРОН: ${shortName.toUpperCase()}`,
      bigValue: `+${pct}%`,
      subtitle: 'Сила удара',
      shortTag: `${shortName} +${pct}%⚔️`,
      iconSVG: Art.icons.upgrade('unit_atk', unit.id),
      applyToTeam: (team) => {
        const mods = team === 'player' ? gameState.unitMods : gameState.enemyUnitMods;
        mods[unit.id].atkMult *= (1 + pct / 100);
        gameState.units.forEach(u => {
          if (u.team === team && u.type.id === unit.id) {
            u.atk = Math.max(1, Math.round(u.atk * (1 + pct / 100)));
            Art.fx.sparkle(u.x, u.y - 24, 2);
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
      unitId: unit.id,
      pct,
      subject: `ЗАЩИТА: ${shortName.toUpperCase()}`,
      bigValue: `+${pct}%`,
      subtitle: 'Здоровье бойца',
      shortTag: `${shortName} +${pct}%🛡️`,
      iconSVG: Art.icons.upgrade('unit_hp', unit.id),
      applyToTeam: (team) => {
        const mods = team === 'player' ? gameState.unitMods : gameState.enemyUnitMods;
        mods[unit.id].hpMult *= (1 + pct / 100);
        gameState.units.forEach(u => {
          if (u.team === team && u.type.id === unit.id) {
            const inc = Math.round(u.maxHp * (pct / 100));
            u.maxHp += inc;
            u.hp += inc;
            Art.fx.sparkle(u.x, u.y - 24, 2);
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
      pct,
      subject: 'БРОНЯ ЗАМКА',
      bigValue: `+${pct}%`,
      subtitle: 'Макс. HP замка',
      shortTag: `Замок +${pct}%🏰`,
      iconSVG: Art.icons.upgrade('castle_max_hp'),
      applyToTeam: (team) => {
        if (team === 'player') {
          const boost = Math.round(gameState.playerCastleMaxHp * (pct / 100));
          gameState.playerCastleMaxHp += boost;
          gameState.playerCastleHp += boost;
          Art.fx.sparkle(castleFxPos('player').x, castleFxPos('player').y, 8);
          spawnFloatingText(140, canvasHeight * 0.4, `ЗАМОК +${boost} HP!`, '#67e8f9');
        } else {
          const boost = Math.round(gameState.enemyCastleMaxHp * (pct / 100));
          gameState.enemyCastleMaxHp += boost;
          gameState.enemyCastleHp += boost;
          Art.fx.sparkle(castleFxPos('enemy').x, castleFxPos('enemy').y, 8);
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
    pct: healPct,
    subject: 'РЕМОНТ ЗАМКА',
    bigValue: `+${healPct}%`,
    subtitle: 'Лечение HP замка',
    shortTag: `Ремонт +${healPct}%❤️`,
    iconSVG: Art.icons.upgrade('castle_heal'),
    applyToTeam: (team) => {
      if (team === 'player') {
        const healAmount = Math.round(gameState.playerCastleMaxHp * (healPct / 100));
        gameState.playerCastleHp = Math.min(gameState.playerCastleMaxHp, gameState.playerCastleHp + healAmount);
        Art.fx.plus(castleFxPos('player').x, castleFxPos('player').y, 7);
        spawnFloatingText(140, canvasHeight * 0.4, `РЕМОНТ +${healAmount} HP!`, '#4ade80');
      } else {
        const healAmount = Math.round(gameState.enemyCastleMaxHp * (healPct / 100));
        gameState.enemyCastleHp = Math.min(gameState.enemyCastleMaxHp, gameState.enemyCastleHp + healAmount);
        Art.fx.plus(castleFxPos('enemy').x, castleFxPos('enemy').y, 7);
        spawnFloatingText(canvasWidth - 140, canvasHeight * 0.4, `ИИ РЕМОНТ +${healAmount} HP!`, '#4ade80');
      }
    },
    aiSummary: `Ремонт замка +${healPct}%`
  };
}

function applyRandomUpgradeForEnemy() {
  // the enemy AI chooses from its own three cards (smart picks on the hard level)
  const aiCards = generateThreeUpgradeCards('enemy');
  const chosen = gameState.enemyAI.pickCard(aiCards) || aiCards[0];
  chosen.applyToTeam('enemy');
  gameState.aiUpgradesCount++;
  gameState.lastEnemyUpgradeText = chosen.aiSummary;

  addBuffChip('enemy', chosen.shortTag);

  return chosen;
}

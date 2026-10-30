// ============================================================================
// ENEMY AI: picks what to buy next, counters what the player fields,
// and upgrades its castle now and then.
// ============================================================================

// The AI may buy the next castle upgrade once enough time has passed for that level.
function aiCastleUpgradeReady() {
  const lvl = gameState.enemyCastleLevel;
  return lvl < CASTLE_UPGRADES.length && gameState.elapsedTime > 40 + lvl * 40;
}

function pickNextAiPlannedUnit() {
  const t = gameState.elapsedTime;
  const playerAlive = gameState.units.filter(u => u.team === 'player' && u.hp > 0);
  const enemyAlive = gameState.units.filter(u => u.team === 'enemy' && u.hp > 0);
  const playerCavalry = playerAlive.filter(u => u.type.id === 'cavalry').length;
  const hasCommander = teamHasCommander('enemy');
  const armyUnits = enemyAlive.filter(u => !u.type.isSupport).length;

  const weights = [
    { id: 'peasant', w: t < 15 ? 16 : 9 },
    { id: 'archer', w: 26 },
    { id: 'knight', w: 28 },
    { id: 'crossbowman', w: 22 },
    { id: 'cavalry', w: t > 15 ? 18 : 10 },
    { id: 'catapult', w: t > 25 ? 12 : 5 },
    // new units: spearmen answer enemy cavalry, mages join once the economy is running,
    // a commander only makes sense with an army to inspire (and only one at a time)
    { id: 'spearman', w: playerCavalry > 0 ? 10 + playerCavalry * 12 : 7 },
    { id: 'mage', w: t > 30 ? 14 : 0 },
    { id: 'commander', w: (!hasCommander && armyUnits >= 4 && t > 40) ? 10 : 0 }
  ];
  // an affordable-by-plan castle upgrade (levels 1-3); the expensive ones are bought opportunistically
  if (aiCastleUpgradeReady() && CASTLE_UPGRADES[gameState.enemyCastleLevel].cost <= 300) {
    weights.push({ id: 'castle', w: 24 });
  }

  const pool = weights.filter(item => item.w > 0);
  const totalW = pool.reduce((acc, item) => acc + item.w, 0);
  let r = Math.random() * totalW;
  for (const item of pool) {
    r -= item.w;
    if (r <= 0) return item.id;
  }
  return 'knight';
}

function updateEnemyAI(dt) {
  gameState.aiDecisionCooldown -= dt;
  if (gameState.aiDecisionCooldown > 0) return;

  const { rightCastleX } = getCastlePositions();
  const enemyUnits = gameState.units.filter(u => u.team === 'enemy' && u.hp > 0);
  const playerUnitsNearCastle = gameState.units.some(
    u => u.team === 'player' && u.hp > 0 && u.x >= rightCastleX - 310
  );

  const isEmergencyDefense = (enemyUnits.length === 0 && playerUnitsNearCastle);

  if (isEmergencyDefense) {
    // buy the two strongest fighters we can afford (never the support commander)
    const affordableUnits = UNIT_TYPES
      .filter(u => !u.isSupport && getTeamUnitStats('enemy', u).cost <= gameState.enemyGold)
      .sort((a, b) => getTeamUnitStats('enemy', a).cost - getTeamUnitStats('enemy', b).cost);
    if (affordableUnits.length > 0) {
      const topAffordable = affordableUnits.slice(-2);
      const chosen = topAffordable[Math.floor(Math.random() * topAffordable.length)];
      const cost = getTeamUnitStats('enemy', chosen).cost;
      gameState.enemyGold -= cost;
      spawnEnemyUnit(chosen.id);
      gameState.aiPlannedUnitId = pickNextAiPlannedUnit();
      gameState.aiDecisionCooldown = 0.4;
      return;
    } else {
      gameState.aiPlannedUnitId = 'peasant';
    }
  }

  // expensive castle upgrades (400/500) are bought whenever the bank allows it
  if (aiCastleUpgradeReady()) {
    const up = CASTLE_UPGRADES[gameState.enemyCastleLevel];
    if (up.cost > 300 && gameState.enemyGold >= up.cost + 60) {
      gameState.enemyGold -= up.cost;
      applyCastleUpgrade('enemy');
      gameState.aiDecisionCooldown = 0.5;
      return;
    }
  }

  if (!gameState.aiPlannedUnitId) {
    gameState.aiPlannedUnitId = pickNextAiPlannedUnit();
  }

  // planned castle upgrade
  if (gameState.aiPlannedUnitId === 'castle') {
    if (!aiCastleUpgradeReady()) {
      gameState.aiPlannedUnitId = pickNextAiPlannedUnit();
      return;
    }
    const up = CASTLE_UPGRADES[gameState.enemyCastleLevel];
    if (gameState.enemyGold >= up.cost) {
      gameState.enemyGold -= up.cost;
      applyCastleUpgrade('enemy');
      gameState.aiPlannedUnitId = pickNextAiPlannedUnit();
      gameState.aiDecisionCooldown = 0.55 + Math.random() * 0.55;
    } else {
      gameState.aiDecisionCooldown = 0.2;
    }
    return;
  }

  let plannedType = UNIT_TYPES.find(u => u.id === gameState.aiPlannedUnitId) || UNIT_TYPES[0];
  // a plan made earlier may have become pointless (a second commander): re-plan
  if (plannedType.isSupport && teamHasCommander('enemy')) {
    gameState.aiPlannedUnitId = pickNextAiPlannedUnit();
    return;
  }
  const plannedCost = getTeamUnitStats('enemy', plannedType).cost;

  if (gameState.enemyGold >= plannedCost) {
    gameState.enemyGold -= plannedCost;
    spawnEnemyUnit(plannedType.id);
    gameState.aiPlannedUnitId = pickNextAiPlannedUnit();
    gameState.aiDecisionCooldown = 0.55 + Math.random() * 0.55;
  } else {
    gameState.aiDecisionCooldown = 0.2;
  }
}

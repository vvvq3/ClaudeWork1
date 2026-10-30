function pickNextAiPlannedUnit() {
  const t = gameState.elapsedTime;
  const weights = [
    { id: 'peasant', w: t < 15 ? 16 : 9 },
    { id: 'archer', w: 26 },
    { id: 'knight', w: 28 },
    { id: 'crossbowman', w: 22 },
    { id: 'cavalry', w: t > 15 ? 18 : 10 },
    { id: 'catapult', w: t > 25 ? 12 : 5 }
  ];
  const totalW = weights.reduce((acc, item) => acc + item.w, 0);
  let r = Math.random() * totalW;
  for (const item of weights) {
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
    const affordableUnits = UNIT_TYPES.filter(
      u => getTeamUnitStats('enemy', u).cost <= gameState.enemyGold
    );
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

  if (!gameState.aiPlannedUnitId) {
    gameState.aiPlannedUnitId = pickNextAiPlannedUnit();
  }

  const plannedType = UNIT_TYPES.find(u => u.id === gameState.aiPlannedUnitId) || UNIT_TYPES[0];
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

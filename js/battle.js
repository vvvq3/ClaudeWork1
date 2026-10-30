// ============================================================================
// SPAWNING, HOMING PROJECTILES, MELEE CONTACT & KNIGHT 50% RANGED RESISTANCE
// ============================================================================
let canvas = document.getElementById('battleCanvas');
let ctx = canvas.getContext('2d');
let canvasWidth = 1200;
let canvasHeight = 620;

function getCastlePositions() {
  const leftCastleX = Math.max(105, canvasWidth * 0.115);
  const rightCastleX = Math.min(canvasWidth - 105, canvasWidth * 0.885);
  const roadCenterY = canvasHeight * 0.64;
  return { leftCastleX, rightCastleX, roadCenterY };
}

function createUnitEntity(team, unitType) {
  const stats = getTeamUnitStats(team, unitType);
  const { leftCastleX, rightCastleX, roadCenterY } = getCastlePositions();
  const laneOffset = (Math.random() - 0.5) * (ROAD_HALF_WIDTH * 1.6);
  const startX = team === 'player'
    ? leftCastleX + 54 + Math.random() * 8
    : rightCastleX - 54 - Math.random() * 8;

  return {
    id: Math.random().toString(36).slice(2),
    team,
    type: unitType,
    x: startX,
    y: roadCenterY + laneOffset,
    laneOffset,
    hp: stats.hp,
    maxHp: stats.hp,
    atk: stats.atk,
    range: unitType.range,
    speed: unitType.speed,
    atkCooldown: unitType.atkCooldown,
    atkTimer: 0,
    state: 'walk',
    animPhase: Math.random() * Math.PI * 2,
    attackAnim: 0,
    hitFlash: 0
  };
}

function spawnPlayerUnit(unitId) {
  if (!gameState || gameState.gameOver || gameState.paused || gameState.modalOpen) return;
  const unitType = UNIT_TYPES.find(u => u.id === unitId);
  if (!unitType) return;

  const stats = getTeamUnitStats('player', unitType);
  if (gameState.gold < stats.cost) return;

  gameState.gold -= stats.cost;
  gameState.stats.unitsSpawned++;
  if (gameState.unitBattleStats[unitType.id]) {
    gameState.unitBattleStats[unitType.id].spawned++;
  }
  SoundFX.play('spawn');

  gameState.units.push(createUnitEntity('player', unitType));
  updateHUD();
}

function spawnEnemyUnit(unitId) {
  const unitType = UNIT_TYPES.find(u => u.id === unitId);
  if (!unitType) return;
  gameState.units.push(createUnitEntity('enemy', unitType));
}


// Helper to get the visual center of a unit's model so arrows fly directly into the model!
function getUnitModelCenterY(u) {
  return u.y - (u.type.id === 'cavalry' ? 18 : 13);
}

// Each castle has 3 archers on its battlements with 2X firing range (570px)!
function updateCastleArchers(dt) {
  const { leftCastleX, rightCastleX, roadCenterY } = getCastlePositions();
  const archerType = UNIT_TYPES.find(u => u.id === 'archer');
  const castleRange = 570;

  // Player Castle 3 Archers
  const pArcherStats = getTeamUnitStats('player', archerType);
  const pTurretPositions = [
    { x: leftCastleX - 38, y: roadCenterY - 96 },
    { x: leftCastleX - 5,  y: roadCenterY - 102 },
    { x: leftCastleX + 28, y: roadCenterY - 96 }
  ];

  gameState.playerCastleArcherTimers.forEach((timer, idx) => {
    gameState.playerCastleArcherAnim[idx] = Math.max(0, gameState.playerCastleArcherAnim[idx] - dt * 2.5);
    let t = timer - dt;
    if (t <= 0) {
      let target = null;
      let bestDist = castleRange;
      for (const u of gameState.units) {
        if (u.team === 'enemy' && u.hp > 0) {
          const d = u.x - (leftCastleX + 40);
          if (d <= bestDist) {
            bestDist = d;
            target = u;
          }
        }
      }
      if (target) {
        t = archerType.atkCooldown;
        gameState.playerCastleArcherAnim[idx] = 1.0;
        const pos = pTurretPositions[idx];
        gameState.projectiles.push({
          team: 'player',
          sourceUnitTypeId: 'castle_archers',
          projType: 'arrow',
          startX: pos.x,
          startY: pos.y,
          x: pos.x,
          y: pos.y,
          prevX: pos.x,
          prevY: pos.y,
          targetUnitRef: target,
          targetIsCastle: false,
          targetX: target.x,
          targetY: getUnitModelCenterY(target),
          progress: 0,
          speed: archerType.projectileSpeed * 1.15,
          damage: pArcherStats.atk,
          splash: 0,
          arcHeight: 36
        });
      } else {
        t = 0.2;
      }
    }
    gameState.playerCastleArcherTimers[idx] = t;
  });

  // Enemy Castle 3 Archers
  const eArcherStats = getTeamUnitStats('enemy', archerType);
  const eTurretPositions = [
    { x: rightCastleX + 38, y: roadCenterY - 96 },
    { x: rightCastleX + 5,  y: roadCenterY - 102 },
    { x: rightCastleX - 28, y: roadCenterY - 96 }
  ];

  gameState.enemyCastleArcherTimers.forEach((timer, idx) => {
    gameState.enemyCastleArcherAnim[idx] = Math.max(0, gameState.enemyCastleArcherAnim[idx] - dt * 2.5);
    let t = timer - dt;
    if (t <= 0) {
      let target = null;
      let bestDist = castleRange;
      for (const u of gameState.units) {
        if (u.team === 'player' && u.hp > 0) {
          const d = (rightCastleX - 40) - u.x;
          if (d <= bestDist) {
            bestDist = d;
            target = u;
          }
        }
      }
      if (target) {
        t = archerType.atkCooldown;
        gameState.enemyCastleArcherAnim[idx] = 1.0;
        const pos = eTurretPositions[idx];
        gameState.projectiles.push({
          team: 'enemy',
          sourceUnitTypeId: 'castle_archers',
          projType: 'arrow',
          startX: pos.x,
          startY: pos.y,
          x: pos.x,
          y: pos.y,
          prevX: pos.x,
          prevY: pos.y,
          targetUnitRef: target,
          targetIsCastle: false,
          targetX: target.x,
          targetY: getUnitModelCenterY(target),
          progress: 0,
          speed: archerType.projectileSpeed * 1.15,
          damage: eArcherStats.atk,
          splash: 0,
          arcHeight: 36
        });
      } else {
        t = 0.2;
      }
    }
    gameState.enemyCastleArcherTimers[idx] = t;
  });
}

function spawnFloatingText(x, y, text, color = '#ffffff') {
  gameState.floatingTexts.push({
    x,
    y,
    text,
    color,
    alpha: 1,
    vy: -26,
    life: 0.95
  });
}

function spawnHitParticles(x, y, color = '#fbbf24', count = 5) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 25 + Math.random() * 65;
    gameState.particles.push({
      x,
      y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 16,
      radius: 1.5 + Math.random() * 2,
      color,
      life: 0.22 + Math.random() * 0.22
    });
  }
}

function spawnClashStarburst(x, y) {
  const exists = gameState.clashes.some(c => Math.abs(c.x - x) < 14 && c.life > 0.14);
  if (!exists) {
    gameState.clashes.push({
      x,
      y,
      life: 0.22,
      maxLife: 0.22,
      scale: (0.85 + Math.random() * 0.35) * 0.78
    });
  }
}

function spawnCorpse(u) {
  gameState.corpses.push({
    x: u.x,
    y: u.y,
    team: u.team,
    typeId: u.type.id,
    radius: u.type.radius,
    life: CORPSE_DURATION,
    maxLife: CORPSE_DURATION,
    bloodBlobs: [
      { dx: 0, dy: 1.5, rx: u.type.radius * 1.25, ry: 4.5 },
      { dx: -4.5, dy: 2.5, rx: u.type.radius * 0.75, ry: 3.2 },
      { dx: 5, dy: 0.8, rx: u.type.radius * 0.8, ry: 3.4 }
    ]
  });
}

function recordPlayerStatDamage(sourceUnitTypeId, actualDamage, killedTarget) {
  if (!sourceUnitTypeId || !gameState.unitBattleStats[sourceUnitTypeId]) return;
  gameState.unitBattleStats[sourceUnitTypeId].damageDealt += Math.round(actualDamage);
  if (killedTarget) {
    gameState.unitBattleStats[sourceUnitTypeId].kills += 1;
  }
}

// Applies damage to a target unit or castle.
// If `isRangedAttack` is true and the target is a Knight (`rangedDamageResistance: 0.5`),
// damage from arrows, bolts, and catapults is reduced by 50%!
function dealDamageToTarget(attackerTeam, sourceUnitTypeId, target, isCastle, rawDamage, attackerPos = null, isRangedAttack = false) {
  let modifiedDamage = rawDamage;

  if (!isCastle && isRangedAttack && target && target.type && target.type.rangedDamageResistance) {
    modifiedDamage = rawDamage * (1 - target.type.rangedDamageResistance);
  }

  const intDamage = Math.max(1, Math.round(modifiedDamage));

  if (isCastle) {
    if (target === 'enemyCastle') {
      const actualDmg = Math.min(gameState.enemyCastleHp, intDamage);
      gameState.enemyCastleHp = Math.max(0, Math.round(gameState.enemyCastleHp - intDamage));
      if (attackerTeam === 'player') {
        recordPlayerStatDamage(sourceUnitTypeId, actualDmg, false);
      }
      const { rightCastleX, roadCenterY } = getCastlePositions();
      spawnHitParticles(rightCastleX - 40, roadCenterY - 25, '#fbbf24', 6);
      spawnClashStarburst(rightCastleX - 42, roadCenterY - 22);
      spawnFloatingText(rightCastleX - 35, roadCenterY - 65, `-${intDamage}`, '#f87171');
      if (gameState.enemyCastleHp <= 0) {
        finishGame('player');
      }
    } else if (target === 'playerCastle') {
      gameState.playerCastleHp = Math.max(0, Math.round(gameState.playerCastleHp - intDamage));
      const { leftCastleX, roadCenterY } = getCastlePositions();
      spawnHitParticles(leftCastleX + 40, roadCenterY - 25, '#fbbf24', 6);
      spawnClashStarburst(leftCastleX + 42, roadCenterY - 22);
      spawnFloatingText(leftCastleX + 35, roadCenterY - 65, `-${intDamage}`, '#f87171');
      if (gameState.playerCastleHp <= 0) {
        finishGame('enemy');
      }
    }
    return;
  }

  const wasAlive = target.hp > 0;
  const effectiveStatDmg = wasAlive ? Math.min(target.hp, intDamage) : 0;
  target.hp = Math.round(target.hp - intDamage);
  const justKilled = wasAlive && target.hp <= 0;

  if (attackerTeam === 'player') {
    recordPlayerStatDamage(sourceUnitTypeId, effectiveStatDmg, justKilled);
  }

  target.hitFlash = 0.16;
  spawnHitParticles(target.x, getUnitModelCenterY(target), '#fef08a', 4);
  if (attackerPos) {
    spawnClashStarburst((attackerPos.x + target.x) * 0.5, (attackerPos.y + target.y) * 0.5 - 12);
  }
  spawnFloatingText(target.x + (Math.random() - 0.5) * 10, target.y - 28, `-${intDamage}`, target.team === 'player' ? '#fca5a5' : '#fde047');
}

function updateBattlefield(dt) {
  const { leftCastleX, rightCastleX, roadCenterY } = getCastlePositions();
  const leftGateX = leftCastleX + 54;
  const rightGateX = rightCastleX - 54;
  const maxLaneOffset = ROAD_HALF_WIDTH - 10;

  // Castle defensive archers shoot (3 per castle, 2x range)
  updateCastleArchers(dt);

  const playerUnits = gameState.units.filter(u => u.team === 'player' && u.hp > 0).sort((a, b) => b.x - a.x);
  const enemyUnits = gameState.units.filter(u => u.team === 'enemy' && u.hp > 0).sort((a, b) => a.x - b.x);

  // Pre-step: Find each unit's single closest opponent and check true 2D contact for melee units
  const unitTargets = new Map();
  for (const u of gameState.units) {
    if (u.hp <= 0) continue;
    const dir = u.team === 'player' ? 1 : -1;
    const opposingList = u.team === 'player' ? enemyUnits : playerUnits;

    let closestEnemy = null;
    let closestScore = Infinity;
    let closestDx = Infinity;

    for (const foe of opposingList) {
      if (foe.hp <= 0) continue;
      const dx = (foe.x - u.x) * dir;
      const dy = Math.abs(foe.laneOffset - u.laneOffset);
      // Weight Y distance so melee units pick the opponent directly in front of them
      const score = dx + dy * (u.type.isRanged ? 0.18 : 0.65);
      if (dx >= -18 && score < closestScore) {
        closestScore = score;
        closestDx = dx;
        closestEnemy = foe;
      }
    }

    const distToCastle = u.team === 'player' ? (rightGateX - u.x) : (u.x - leftGateX);
    let inRangeOfUnit = false;

    if (closestEnemy) {
      if (u.type.isRanged) {
        const contactRadius = (u.type.radius + closestEnemy.type.radius) * 0.7;
        const effectiveEnemyDist = Math.max(0, closestDx - contactRadius);
        inRangeOfUnit = effectiveEnemyDist <= u.range;
      } else {
        // Melee units must walk right up to the enemy in BOTH X and Y before swinging!
        // They never swing from afar across the road or from a distance.
        const touchDistX = u.type.radius + closestEnemy.type.radius + u.range;
        const dy = Math.abs(closestEnemy.laneOffset - u.laneOffset);
        const touchDistY = u.type.radius + closestEnemy.type.radius + 6;
        inRangeOfUnit = (closestDx <= touchDistX && dy <= touchDistY);
      }
    }

    const inRangeOfCastle = u.type.isRanged
      ? (distToCastle <= u.range)
      : (distToCastle <= u.type.radius + u.range + 4);

    unitTargets.set(u.id, {
      closestEnemy,
      closestDx,
      inRangeOfUnit,
      inRangeOfCastle
    });
  }

  // Synchronize attack timers ONLY for newly engaging melee units
  for (const u of gameState.units) {
    if (u.hp <= 0 || u.type.isRanged) continue;
    const info = unitTargets.get(u.id);
    if (!info) continue;
    if (u.state === 'walk' && (info.inRangeOfUnit || info.inRangeOfCastle)) {
      u.atkTimer = 0;
    }
  }

  const pendingMeleeHits = [];

  for (const u of gameState.units) {
    if (u.hp <= 0) continue;

    if (u.hitFlash > 0) u.hitFlash = Math.max(0, u.hitFlash - dt);
    if (u.attackAnim > 0) u.attackAnim = Math.max(0, u.attackAnim - dt * 2.8);
    u.atkTimer = Math.max(0, u.atkTimer - dt);

    const dir = u.team === 'player' ? 1 : -1;
    const sameTeamSorted = u.team === 'player' ? playerUnits : enemyUnits;
    const info = unitTargets.get(u.id);
    const { closestEnemy, closestDx, inRangeOfUnit, inRangeOfCastle } = info;

    if (inRangeOfUnit || inRangeOfCastle) {
      u.state = 'attack';

      // Keep melee fighters tightly aligned face-to-face
      if (!u.type.isRanged && inRangeOfUnit && closestEnemy) {
        const yDiff = closestEnemy.laneOffset - u.laneOffset;
        if (Math.abs(yDiff) > 3) {
          u.laneOffset += Math.sign(yDiff) * Math.min(Math.abs(yDiff), 55 * dt);
        }
      }

      if (u.atkTimer <= 0) {
        u.atkTimer = u.atkCooldown;
        u.attackAnim = 1.0;

        const targetIsCastle = !inRangeOfUnit && inRangeOfCastle;
        const singleTargetObj = inRangeOfUnit
          ? closestEnemy
          : (u.team === 'player' ? 'enemyCastle' : 'playerCastle');

        if (u.type.isRanged) {
          const startX = u.x + dir * 9;
          const startY = getUnitModelCenterY(u);
          const targetX = inRangeOfUnit
            ? closestEnemy.x
            : (u.team === 'player' ? rightGateX + 10 : leftGateX - 10);
          const targetY = inRangeOfUnit
            ? getUnitModelCenterY(closestEnemy)
            : roadCenterY - 22;

          gameState.projectiles.push({
            team: u.team,
            sourceUnitTypeId: u.type.id,
            projType: u.type.projectileType,
            startX,
            startY,
            x: startX,
            y: startY,
            prevX: startX,
            prevY: startY,
            targetUnitRef: inRangeOfUnit ? closestEnemy : null,
            targetIsCastle,
            targetX,
            targetY,
            progress: 0,
            speed: u.type.projectileSpeed,
            damage: u.atk,
            splash: u.type.splash || 0,
            arcHeight: u.type.projectileType === 'boulder' ? 80 : (u.type.projectileType === 'arrow' ? 26 : 8)
          });
        } else {
          pendingMeleeHits.push({
            attackerTeam: u.team,
            sourceUnitTypeId: u.type.id,
            attackerPos: { x: u.x, y: u.y },
            target: singleTargetObj,
            isCastle: targetIsCastle,
            damage: u.atk
          });
        }
      }
    } else {
      // Walking toward the enemy or enemy castle
      u.state = 'walk';
      u.animPhase += dt * (u.speed * 0.14);

      let desiredMove = u.speed * dt;

      if (closestEnemy) {
        // Walk right up until models touch in X, and steer in Y toward closestEnemy if close in X!
        const minStopDistX = (u.type.radius + closestEnemy.type.radius) * 0.85;
        if (!u.type.isRanged && closestDx < 95) {
          const yDiff = closestEnemy.laneOffset - u.laneOffset;
          if (Math.abs(yDiff) > 2) {
            u.laneOffset += Math.sign(yDiff) * Math.min(Math.abs(yDiff), u.speed * 0.85 * dt);
            u.laneOffset = Math.max(-maxLaneOffset, Math.min(maxLaneOffset, u.laneOffset));
          }
        }
        if (closestDx - desiredMove < minStopDistX) {
          desiredMove = Math.max(0, closestDx - minStopDistX);
        }
      }

      // Friendly overtaking around allies
      for (const ally of sameTeamSorted) {
        if (ally === u) continue;
        const dx = (ally.x - u.x) * dir;
        const minGapX = (u.type.radius + ally.type.radius) * 0.75;
        const dy = u.laneOffset - ally.laneOffset;
        const minGapY = (u.type.radius + ally.type.radius) * 0.62;

        if (dx > 0 && dx < minGapX + 12 && Math.abs(dy) < minGapY) {
          let steerDir = dy >= 0 ? 1 : -1;
          if (u.laneOffset > maxLaneOffset - 10) steerDir = -1;
          if (u.laneOffset < -maxLaneOffset + 10) steerDir = 1;

          u.laneOffset += steerDir * 72 * dt;
          u.laneOffset = Math.max(-maxLaneOffset, Math.min(maxLaneOffset, u.laneOffset));
        }
      }

      u.x += dir * desiredMove;
    }

    u.y = roadCenterY + u.laneOffset;
  }

  // Apply simultaneous melee strikes
  for (const hit of pendingMeleeHits) {
    dealDamageToTarget(hit.attackerTeam, hit.sourceUnitTypeId, hit.target, hit.isCastle, hit.damage, hit.attackerPos, false);
  }

  // Update Homing Projectiles:
  // Every arrow/bolt/boulder dynamically tracks its target unit's exact model center
  // and deals damage at the exact moment it touches the unit's model!
  for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
    const p = gameState.projectiles[i];
    p.prevX = p.x;
    p.prevY = p.y;

    // If target unit is still alive, continuously home in on its exact model center
    if (p.targetUnitRef && p.targetUnitRef.hp > 0) {
      p.targetX = p.targetUnitRef.x;
      p.targetY = getUnitModelCenterY(p.targetUnitRef);
    } else if (!p.targetIsCastle && p.splash === 0) {
      // If original target died mid-flight, retarget nearest living enemy near targetX so arrow still hits a model
      const foes = gameState.units.filter(u => u.team !== p.team && u.hp > 0);
      let nearest = null;
      let bestD = 75;
      for (const f of foes) {
        const d = Math.hypot(f.x - p.targetX, getUnitModelCenterY(f) - p.targetY);
        if (d < bestD) {
          bestD = d;
          nearest = f;
        }
      }
      if (nearest) {
        p.targetUnitRef = nearest;
        p.targetX = nearest.x;
        p.targetY = getUnitModelCenterY(nearest);
      }
    }

    const totalDist = Math.max(12, Math.hypot(p.targetX - p.startX, p.targetY - p.startY));
    p.progress += (p.speed * dt) / totalDist;

    const t = Math.min(1, p.progress);
    p.x = p.startX + (p.targetX - p.startX) * t;
    p.y = p.startY + (p.targetY - p.startY) * t - Math.sin(t * Math.PI) * p.arcHeight;

    // Check if the projectile has touched its target unit's model (or reached the target point)
    let touchedModel = false;
    if (p.targetUnitRef && p.targetUnitRef.hp > 0 && p.splash === 0) {
      const distToModel = Math.hypot(p.x - p.targetUnitRef.x, p.y - getUnitModelCenterY(p.targetUnitRef));
      if (distToModel <= p.targetUnitRef.type.radius + 4) {
        touchedModel = true;
      }
    }

    if (touchedModel || p.progress >= 1) {
      const foes = gameState.units.filter(u => u.team !== p.team && u.hp > 0);
      const enemyGateX = p.team === 'player' ? rightGateX : leftGateX;

      if (p.splash > 0) {
        // Catapult boulder AoE damage (50% reduced against Knights!)
        spawnHitParticles(p.targetX, p.targetY, '#f97316', 12);
        spawnClashStarburst(p.targetX, p.targetY);
        foes.forEach(f => {
          if (Math.abs(f.x - p.targetX) <= p.splash + f.type.radius) {
            dealDamageToTarget(p.team, p.sourceUnitTypeId, f, false, p.damage, null, true);
          }
        });
        if (Math.abs(p.targetX - enemyGateX) <= p.splash + 30) {
          dealDamageToTarget(p.team, p.sourceUnitTypeId, p.team === 'player' ? 'enemyCastle' : 'playerCastle', true, p.damage, null, true);
        }
      } else {
        // Single-target arrow or crossbow bolt: hits exact target model on contact!
        if (p.targetUnitRef && p.targetUnitRef.hp > 0) {
          dealDamageToTarget(p.team, p.sourceUnitTypeId, p.targetUnitRef, false, p.damage, null, true);
        } else if (p.targetIsCastle || Math.abs(p.targetX - enemyGateX) <= 45) {
          dealDamageToTarget(p.team, p.sourceUnitTypeId, p.team === 'player' ? 'enemyCastle' : 'playerCastle', true, p.damage, null, true);
        }
      }

      gameState.projectiles.splice(i, 1);
    }
  }

  // Remove fallen units & spawn blood puddle + unique unit corpse for 15 seconds
  for (let i = gameState.units.length - 1; i >= 0; i--) {
    const u = gameState.units[i];
    if (u.hp <= 0) {
      spawnHitParticles(u.x, getUnitModelCenterY(u), '#dc2626', 8);
      spawnCorpse(u);
      if (u.team === 'enemy') {
        gameState.stats.enemiesDefeated++;
      }
      gameState.units.splice(i, 1);
    }
  }

  // Update Corpses (15s lifetime)
  for (let i = gameState.corpses.length - 1; i >= 0; i--) {
    const c = gameState.corpses[i];
    c.life -= dt;
    if (c.life <= 0) {
      gameState.corpses.splice(i, 1);
    }
  }

  for (let i = gameState.particles.length - 1; i >= 0; i--) {
    const pt = gameState.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += 180 * dt;
    pt.life -= dt;
    if (pt.life <= 0) gameState.particles.splice(i, 1);
  }

  for (let i = gameState.clashes.length - 1; i >= 0; i--) {
    const cl = gameState.clashes[i];
    cl.life -= dt;
    if (cl.life <= 0) gameState.clashes.splice(i, 1);
  }

  for (let i = gameState.floatingTexts.length - 1; i >= 0; i--) {
    const ft = gameState.floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.life -= dt;
    ft.alpha = Math.max(0, ft.life / 0.95);
    if (ft.life <= 0) gameState.floatingTexts.splice(i, 1);
  }
}


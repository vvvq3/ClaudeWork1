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
    seed: Math.random() * 6.28,
    attackAnim: 0,
    inspired: false,   // commander aura active on this unit
    auraFactor: 0,     // 1 = commander with the army, 0.5 = castle commander
    auraHpBonus: 0
  };
}

// Pays for a unit and puts it on the field. Works for either team (the AI and the simulator use it too).
function buyUnit(team, unitId) {
  const unitType = UNIT_TYPES.find(u => u.id === unitId);
  if (!unitType) return false;
  const stats = getTeamUnitStats(team, unitType);
  if (teamGold(team) < stats.cost) return false;
  setTeamGold(team, teamGold(team) - stats.cost);
  if (team === 'player') {
    gameState.stats.unitsSpawned++;
    if (gameState.unitBattleStats[unitType.id]) gameState.unitBattleStats[unitType.id].spawned++;
    SoundFX.play('spawn');
  }
  gameState.units.push(createUnitEntity(team, unitType));
  return true;
}

function spawnPlayerUnit(unitId) {
  if (!gameState || gameState.gameOver || gameState.paused || gameState.modalOpen) return;
  if (buyUnit('player', unitId)) updateHUD();
}

function spawnEnemyUnit(unitId) {
  const unitType = UNIT_TYPES.find(u => u.id === unitId);
  if (!unitType) return;
  const spawned = createUnitEntity('enemy', unitType);
  gameState.units.push(spawned);
}


// Helper to get the visual center of a unit's model so arrows fly directly into the model!
function getUnitModelCenterY(u) {
  return u.y - (u.type.id === 'cavalry' ? 18 : 13);
}

// ---- castle garrison ------------------------------------------------------------------
// Every castle starts with 3 wall archers; castle upgrades add a 4th archer, a crossbowman,
// a mage, a catapult and a commander. Each shooter uses the stats of its unit type.
function castleSlotWorld(team, slotIndex) {
  const { leftCastleX, rightCastleX, roadCenterY } = getCastlePositions();
  const slot = CASTLE_SLOTS[slotIndex];
  const castleY = roadCenterY + 18;
  return team === 'player'
    ? { x: leftCastleX + slot.x, y: castleY + slot.y }
    : { x: rightCastleX - slot.x, y: castleY + slot.y };
}

function fireCastleProjectile(team, def, kind, unitType, target) {
  const pos = castleSlotWorld(team, def.slot);
  const stats = getTeamUnitStats(team, unitType);
  const sx = pos.x, sy = pos.y + kind.muzzleY;
  gameState.projectiles.push({
    team,
    sourceUnitTypeId: 'castle_archers',   // statistics row
    srcType: unitType.id,                 // real type, for damage bonuses
    projType: unitType.projectileType,
    startX: sx, startY: sy, x: sx, y: sy, prevX: sx, prevY: sy,
    targetUnitRef: target,
    targetIsCastle: false,
    targetX: target.x,
    targetY: getUnitModelCenterY(target),
    progress: 0,
    speed: unitType.projectileSpeed * kind.speedMul,
    damage: stats.atk * (kind.dmgMult || 1),
    splash: unitType.splash || 0,
    multiTarget: unitType.multiTarget || 0,
    arcHeight: kind.arc
  });
}

function updateCastleDefenders(dt) {
  const { leftCastleX, rightCastleX } = getCastlePositions();
  for (const team of ['player', 'enemy']) {
    const defenders = team === 'player' ? gameState.playerCastleDefenders : gameState.enemyCastleDefenders;
    const castleX = team === 'player' ? leftCastleX : rightCastleX;
    for (const def of defenders) {
      def.anim = Math.max(0, def.anim - dt * 2.5);
      const kind = CASTLE_DEFENDER_KINDS[def.kind];
      if (!kind.range) continue;            // the commander does not shoot
      def.timer -= dt;
      if (def.timer > 0) continue;

      let target = null;
      let bestDist = kind.range;
      for (const u of gameState.units) {
        if (u.team === team || u.hp <= 0) continue;
        const d = team === 'player' ? u.x - (castleX + 40) : (castleX - 40) - u.x;
        if (d <= bestDist) {
          bestDist = d;
          target = u;
        }
      }
      const unitType = UNIT_TYPES.find(t => t.id === kind.unit);
      if (!target) {
        def.timer = 0.2;
        continue;
      }
      def.timer = unitType.atkCooldown;
      def.anim = 1.0;
      fireCastleProjectile(team, def, kind, unitType, target);
    }
  }
}

// Buys the next castle upgrade for a team (gold is paid by the caller): a new garrison member
// plus extra castle health.
function applyCastleUpgrade(team) {
  const isPlayer = team === 'player';
  const level = isPlayer ? gameState.playerCastleLevel : gameState.enemyCastleLevel;
  if (level >= CASTLE_UPGRADES.length) return false;
  const up = CASTLE_UPGRADES[level];

  const defenders = isPlayer ? gameState.playerCastleDefenders : gameState.enemyCastleDefenders;
  defenders.push({ kind: up.kind, slot: up.slot, timer: 0.6, anim: 0 });
  if (isPlayer) {
    gameState.playerCastleLevel++;
    gameState.playerCastleMaxHp += CASTLE_UPGRADE_HP;
    gameState.playerCastleHp += CASTLE_UPGRADE_HP;
    gameState.unitBattleStats.castle_archers.spawned++;
  } else {
    gameState.enemyCastleLevel++;
    gameState.enemyCastleMaxHp += CASTLE_UPGRADE_HP;
    gameState.enemyCastleHp += CASTLE_UPGRADE_HP;
  }

  // feedback
  const pos = castleSlotWorld(team, up.slot);
  const fx = castleFxPos(team);
  Art.fx.sparkle(pos.x, pos.y - 24, 8);
  Art.fx.debris(pos.x, pos.y, 4);
  spawnFloatingText(fx.x + (isPlayer ? 20 : -20), fx.y - 30, (isPlayer ? '' : 'ВРАГ: ') + `ЗАМОК: ${up.name.toUpperCase()}!`, isPlayer ? '#fde047' : '#93c5fd');
  spawnFloatingText(fx.x + (isPlayer ? 20 : -20), fx.y - 8, `+${CASTLE_UPGRADE_HP} HP`, '#4ade80');
  SoundFX.play('upgrade');

  return true;
}

// ---- commander aura ----------------------------------------------------------------------
// While a team has a commander, every fighter of that team is inspired: +30% health and damage and
// slow healing. A commander walking with the army gives the full aura (and dies like anyone);
// the one living in the castle never dies but only gives half of it.
const CASTLE_COMMANDER_AURA = 0.5;

function auraFactor(team) {
  if (gameState.units.some(u => u.team === team && u.hp > 0 && u.type.isSupport)) return 1;
  const defenders = team === 'player' ? gameState.playerCastleDefenders : gameState.enemyCastleDefenders;
  return defenders.some(d => d.kind === 'commander') ? CASTLE_COMMANDER_AURA : 0;
}

function teamHasCommander(team) {
  return auraFactor(team) > 0;
}

// Defender's advantage: fighters standing close to their own castle hit harder.
var HOME_ATK_BONUS = 0.25;
const HOME_RANGE = 280;

function nearOwnGate(u) {
  const { leftCastleX, rightCastleX } = getCastlePositions();
  const gate = u.team === 'player' ? leftCastleX + 54 : rightCastleX - 54;
  return Math.abs(u.x - gate) < HOME_RANGE;
}

function effectiveAtk(u) {
  let mult = 1;
  if (u.auraFactor) mult += (COMMANDER_AURA.atkMult - 1) * u.auraFactor;
  if (HOME_ATK_BONUS && nearOwnGate(u)) mult += HOME_ATK_BONUS;
  return u.atk * mult;
}

function updateInspiration(dt) {
  for (const team of ['player', 'enemy']) {
    const factor = auraFactor(team);
    if (factor !== gameState.auraActive[team]) {
      const was = gameState.auraActive[team];
      gameState.auraActive[team] = factor;
      if (!was !== !factor) {   // switched on or off (not just full <-> half)
        const { leftCastleX, rightCastleX, roadCenterY } = getCastlePositions();
        const fx = team === 'player' ? leftCastleX + 90 : rightCastleX - 90;
        spawnFloatingText(fx, roadCenterY - 100,
          factor ? (team === 'player' ? 'ВДОХНОВЕНИЕ!' : 'ВРАГ ВДОХНОВЛЁН!') : 'Вдохновение угасло',
          factor ? '#ffe36b' : '#cbd5e1');
      }
    }
    for (const u of gameState.units) {
      if (u.team !== team || u.hp <= 0) continue;
      if ((u.auraFactor || 0) !== factor) {
        // swap the old health bonus for the new one
        u.maxHp -= u.auraHpBonus;
        u.hp = Math.min(u.hp, u.maxHp);
        u.auraFactor = factor;
        u.auraHpBonus = Math.round(u.maxHp * (COMMANDER_AURA.hpMult - 1) * factor);
        u.maxHp += u.auraHpBonus;
        u.hp += u.auraHpBonus;
        u.inspired = factor > 0;
        if (factor > 0) Art.fx.sparkle(u.x, u.y - 24, 2);
      }
      if (u.auraFactor && u.hp < u.maxHp) {
        u.hp = Math.min(u.maxHp, u.hp + u.maxHp * COMMANDER_AURA.healPerSec * u.auraFactor * dt);
        if (Math.random() < dt * 1.4) Art.fx.plus(u.x, u.y - 22, 1);
      }
    }
  }
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
function dealDamageToTarget(attackerTeam, sourceUnitTypeId, target, isCastle, rawDamage, attackerPos = null, isRangedAttack = false, srcTypeId = null) {
  let modifiedDamage = rawDamage;
  // `srcTypeId` is the real unit type when the statistics row differs (castle garrison shots)
  const srcDef = UNIT_TYPES.find(t => t.id === (srcTypeId || sourceUnitTypeId));

  if (!isCastle && target && target.type && srcDef) {
    // type bonuses: spearmen vs cavalry, fire vs catapults
    const bonus = srcDef.bonusVs && srcDef.bonusVs[target.type.id];
    if (bonus) modifiedDamage *= bonus;
  }
  if (!isCastle && isRangedAttack && target && target.type && target.type.rangedDamageResistance &&
      !(srcDef && srcDef.ignoreArmor)) {
    modifiedDamage *= (1 - target.type.rangedDamageResistance);
  }

  // walls: siege engines and magic are good against stone, cavalry and rabble are not
  if (isCastle && srcDef && srcDef.castleMult) modifiedDamage *= srcDef.castleMult;

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
      Art.fx.debris(rightCastleX - 40, roadCenterY - 25, 3);
      spawnClashStarburst(rightCastleX - 42, roadCenterY - 22);
      spawnFloatingText(rightCastleX - 35, roadCenterY - 65, `-${intDamage}`, '#f87171');
      if (gameState.enemyCastleHp <= 0) {
        finishGame('player');
      }
    } else if (target === 'playerCastle') {
      gameState.playerCastleHp = Math.max(0, Math.round(gameState.playerCastleHp - intDamage));
      const { leftCastleX, roadCenterY } = getCastlePositions();
      spawnHitParticles(leftCastleX + 40, roadCenterY - 25, '#fbbf24', 6);
      Art.fx.debris(leftCastleX + 40, roadCenterY - 25, 3);
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

  // Castle garrison shoots, commander aura is refreshed
  updateCastleDefenders(dt);
  updateInspiration(dt);

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

    // Ranged units focus an enemy commander (support unit) whenever one is in reach: his aura is
    // worth more than any single fighter, so he must be protected.
    if (u.type.isRanged) {
      let pick = null;
      let pickDx = Infinity;
      for (const foe of opposingList) {
        if (!foe.type.isSupport || foe.hp <= 0) continue;
        const fdx = (foe.x - u.x) * dir;
        if (fdx < -18 || fdx >= pickDx) continue;
        const reach = Math.max(0, fdx - (u.type.radius + foe.type.radius) * 0.7);
        if (reach <= u.range && !(u.type.minRange && fdx < u.type.minRange)) {
          pick = foe;
          pickDx = fdx;
        }
      }
      if (pick) {
        closestEnemy = pick;
        closestDx = pickDx;
      }
    }

    const distToCastle = u.team === 'player' ? (rightGateX - u.x) : (u.x - leftGateX);
    let inRangeOfUnit = false;

    if (closestEnemy) {
      if (u.type.isRanged) {
        const contactRadius = (u.type.radius + closestEnemy.type.radius) * 0.7;
        const effectiveEnemyDist = Math.max(0, closestDx - contactRadius);
        inRangeOfUnit = effectiveEnemyDist <= u.range;
        // siege engines have a dead zone: they cannot hit enemies standing right next to them
        if (u.type.minRange && closestDx < u.type.minRange) inRangeOfUnit = false;
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
            srcType: u.type.id,
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
            damage: effectiveAtk(u),
            splash: u.type.splash || 0,
            multiTarget: u.type.multiTarget || 0,
            arcHeight: u.type.projectileType === 'boulder' ? 80 : (u.type.projectileType === 'arrow' ? 26 : (u.type.projectileType === 'fireball' ? 16 : 8))
          });
        } else {
          pendingMeleeHits.push({
            attackerTeam: u.team,
            sourceUnitTypeId: u.type.id,
            attackerPos: { x: u.x, y: u.y },
            target: singleTargetObj,
            isCastle: targetIsCastle,
            damage: effectiveAtk(u)
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

      // Support units (the commander) trail behind the army's front line instead of leading the charge
      if (u.type.isSupport) {
        const lead = sameTeamSorted.find(a => !a.type.isSupport);
        if (!lead || (lead.x - u.x) * dir < 85) desiredMove = 0;
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

      if (p.projType === 'fireball') {
        // Fireball: burns the target and up to two more enemies close to it. Ignores armour.
        const primary = (p.targetUnitRef && p.targetUnitRef.hp > 0) ? p.targetUnitRef : null;
        if (primary) {
          const extra = foes
            .filter(f => f !== primary)
            .map(f => ({ f, d: Math.hypot(f.x - primary.x, f.y - primary.y) }))
            .filter(o => o.d <= 85)
            .sort((a, b) => a.d - b.d)
            .slice(0, Math.max(0, (p.multiTarget || 3) - 1))
            .map(o => o.f);
          [primary, ...extra].forEach(t => {
            spawnClashStarburst(t.x, getUnitModelCenterY(t), 'fire');
            spawnHitParticles(t.x, getUnitModelCenterY(t), '#ff9a1f', 6);
            dealDamageToTarget(p.team, p.sourceUnitTypeId, t, false, p.damage, null, true, p.srcType);
          });
        } else if (p.targetIsCastle || Math.abs(p.targetX - enemyGateX) <= 45) {
          dealDamageToTarget(p.team, p.sourceUnitTypeId, p.team === 'player' ? 'enemyCastle' : 'playerCastle', true, p.damage, null, true, p.srcType);
        }
      } else if (p.splash > 0) {
        // Catapult boulder AoE damage (50% reduced against Knights!)
        spawnHitParticles(p.targetX, p.targetY, '#f97316', 12);
        spawnClashStarburst(p.targetX, p.targetY, 'boulder');
        // the blast is a circle around the landing point (not a strip across the whole road)
        foes.forEach(f => {
          if (Math.hypot(f.x - p.targetX, getUnitModelCenterY(f) - p.targetY) <= p.splash + f.type.radius * 0.6) {
            dealDamageToTarget(p.team, p.sourceUnitTypeId, f, false, p.damage, null, true, p.srcType);
          }
        });
        if (Math.abs(p.targetX - enemyGateX) <= p.splash + 30) {
          dealDamageToTarget(p.team, p.sourceUnitTypeId, p.team === 'player' ? 'enemyCastle' : 'playerCastle', true, p.damage, null, true, p.srcType);
        }
      } else {
        // Single-target arrow or crossbow bolt: hits exact target model on contact!
        if (p.targetUnitRef && p.targetUnitRef.hp > 0) {
          dealDamageToTarget(p.team, p.sourceUnitTypeId, p.targetUnitRef, false, p.damage, null, true, p.srcType);
        } else if (p.targetIsCastle || Math.abs(p.targetX - enemyGateX) <= 45) {
          dealDamageToTarget(p.team, p.sourceUnitTypeId, p.team === 'player' ? 'enemyCastle' : 'playerCastle', true, p.damage, null, true, p.srcType);
        }
      }

      gameState.projectiles.splice(i, 1);
    }
  }

  // Remove fallen units & spawn blood puddle + unique unit corpse for 15 seconds
  for (let i = gameState.units.length - 1; i >= 0; i--) {
    const u = gameState.units[i];
    if (u.hp <= 0) {
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

  // particles, starbursts, floating numbers, lightning (see js/art/fx.js)
  updateEffects(dt);
}


// ============================================================================
// MAIN GAME LOOP & EVENT LISTENERS
// ============================================================================
let lastFrameTime = performance.now();
let hudSyncTimer = 0;

function resizeCanvas() {
  const container = document.getElementById('canvasContainer');
  if (!container) return;
  canvasWidth = container.clientWidth || window.innerWidth;
  canvasHeight = container.clientHeight || (window.innerHeight - 110);
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
}

function gameLoop(now) {
  const rawDt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;
  const dt = Math.min(0.1, Math.max(0, rawDt));

  const isSimulating = gameState && !gameState.paused && !gameState.gameOver && !gameState.modalOpen;

  if (isSimulating) {
    gameState.elapsedTime += dt;

    gameState.goldTickTimer += dt;
    while (gameState.goldTickTimer >= GOLD_TICK_INTERVAL) {
      gameState.goldTickTimer -= GOLD_TICK_INTERVAL;
      gameState.gold = +(gameState.gold + gameState.goldPerTick).toFixed(2);
      gameState.enemyGold = +(gameState.enemyGold + gameState.enemyGoldPerTick).toFixed(2);
      gameState.stats.goldEarned = +(gameState.stats.goldEarned + gameState.goldPerTick).toFixed(2);
      updateHUD();
    }

    gameState.upgradeTimer += dt;
    if (gameState.upgradeTimer >= UPGRADE_INTERVAL) {
      gameState.upgradeTimer -= UPGRADE_INTERVAL;
      gameState.pendingUpgrades++;
      openUpgradeModal(true);
    }

    if (!gameState.modalOpen) {
      updateEnemyAI(dt);
      updateBattlefield(dt);
    }

    hudSyncTimer += dt;
    if (hudSyncTimer >= 0.12) {
      hudSyncTimer = 0;
      updateHUD();
    }
  }

  if (gameState) {
    renderScene(isSimulating ? dt : 0);
  }

  requestAnimationFrame(gameLoop);
}

function restartGame() {
  document.getElementById('gameOverModal').classList.add('hidden');
  upgradeModal.classList.add('hidden');
  const buffsRow = document.getElementById('playerBuffsRow');
  if (buffsRow) buffsRow.innerHTML = '';
  const enemyBuffsRow = document.getElementById('enemyBuffsRow');
  if (enemyBuffsRow) enemyBuffsRow.innerHTML = '';
  gameState = createInitialState();
  gameState.aiPlannedUnitId = pickNextAiPlannedUnit();
  buildBottomUnitCards();
  updateHUD();
}

window.addEventListener('resize', () => {
  resizeCanvas();
  if (gameState) renderScene(0);
});

// Keyboard shortcuts:
// When the 3-card upgrade modal is open, keyboard selection is strictly disabled (mouse click only!)
window.addEventListener('keydown', (e) => {
  if (!gameState || gameState.gameOver) return;
  if (gameState.modalOpen) {
    // Block all keyboard card selection so player never accidentally picks a card while pressing unit hotkeys!
    return;
  }
  const key = e.key;
  if (key >= '1' && key <= '7') {
    const idx = parseInt(key, 10) - 1;
    if (idx === 6) {
      buyExtraUpgradeCards();
      return;
    }
    if (UNIT_TYPES[idx]) {
      spawnPlayerUnit(UNIT_TYPES[idx].id);
    }
  } else if (key === ' ') {
    e.preventDefault();
    togglePause();
  }
});

function togglePause() {
  if (!gameState || gameState.gameOver || gameState.modalOpen) return;
  gameState.paused = !gameState.paused;
  document.getElementById('btnPauseGame').textContent = gameState.paused ? '▶️' : '⏸️';
}

document.getElementById('btnToggleMute').addEventListener('click', () => {
  SoundFX.muted = !SoundFX.muted;
  document.getElementById('btnToggleMute').textContent = SoundFX.muted ? '🔇' : '🔊';
});

document.getElementById('btnPauseGame').addEventListener('click', togglePause);
document.getElementById('btnRestartTop').addEventListener('click', restartGame);
document.getElementById('btnPlayAgain').addEventListener('click', restartGame);
document.getElementById('btnSkipUpgradeModal').addEventListener('click', () => {
  selectUpgradeCard(Math.floor(Math.random() * 3));
});
document.getElementById('btnReadyUpgrade').addEventListener('click', () => openUpgradeModal(false));

// Start screen: the battle stays frozen until the player presses "В бой!"
// (a user gesture is also required before the browser allows audio).
const startScreen = document.getElementById('startScreen');

document.getElementById('btnStartGame').addEventListener('click', () => {
  SoundFX.init();
  startScreen.classList.add('hidden');
  gameState.paused = false;
  lastFrameTime = performance.now();
});

window.onload = () => {
  resizeCanvas();
  restartGame();
  gameState.paused = true;
  lastFrameTime = performance.now();
  requestAnimationFrame(gameLoop);
};

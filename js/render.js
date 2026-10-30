// ============================================================================
// SCENE RENDERER
// Composes the cached scenery layers, castles, units, projectiles and effects.
// The art itself lives in js/art/*; this file only decides what goes where.
// ============================================================================
let dpr = 1;
let sceneCache = null;
let lastRenderClock = performance.now();

function rebuildScene() {
  Art.dpr = dpr;
  Art.castle.clearCache();
  sceneCache = Art.scene.build(canvasWidth, canvasHeight, dpr, getCastlePositions());
}

function renderScene(dt) {
  if (!sceneCache || sceneCache.W !== canvasWidth || sceneCache.H !== canvasHeight || sceneCache.d !== dpr) {
    rebuildScene();
  }
  // ambient animation (flags, clouds, idle breathing) keeps running while paused
  const clock = performance.now();
  const realDt = Math.min(0.1, (clock - lastRenderClock) / 1000);
  lastRenderClock = clock;
  const time = clock / 1000;

  const W = canvasWidth, H = canvasHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.drawImage(sceneCache.bg, 0, 0, W, H);
  Art.scene.drawClouds(ctx, W, H, realDt);

  const { leftCastleX, rightCastleX, roadCenterY } = getCastlePositions();

  // fallen units on the road
  gameState.corpses.forEach(c => Art.units.drawCorpse(ctx, c));

  // castles with their wall archers
  Art.castle.draw(ctx, leftCastleX, roadCenterY + 18, true,
    gameState.playerCastleHp / gameState.playerCastleMaxHp, time,
    gameState.playerCastleDefenders);
  Art.castle.draw(ctx, rightCastleX, roadCenterY + 18, false,
    gameState.enemyCastleHp / gameState.enemyCastleMaxHp, time,
    gameState.enemyCastleDefenders);

  // living units, back to front
  const sorted = [...gameState.units].sort((a, b) => a.y - b.y);
  sorted.forEach(u => Art.units.draw(ctx, u, time));

  // projectiles and impacts
  gameState.projectiles.forEach(p => Art.fx.drawProjectile(ctx, p, dt));
  Art.fx.drawBursts(ctx, gameState.clashes);
  Art.fx.drawParticles(ctx, gameState.particles);

  // foreground framing
  ctx.drawImage(sceneCache.fg, 0, sceneCache.fgTop, W, H - sceneCache.fgTop);

  Art.fx.drawBolts(ctx, gameState.bolts);
  Art.fx.drawTexts(ctx, gameState.floatingTexts);

  if (gameState.flash > 0) {
    ctx.fillStyle = `rgba(255, 246, 190, ${Math.min(0.6, gameState.flash * 0.6)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

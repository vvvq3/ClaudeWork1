// ============================================================================
// VISUAL EFFECTS: impact starbursts, sparks, dust puffs, debris, stars, trails,
// floating numbers, lightning. Pure visuals: nothing here touches game rules.
// Particles/bursts/texts live in gameState arrays and are updated by
// updateEffects(dt), which the battle loop calls once per simulation step.
// ============================================================================
Art.fx = (function () {
  const A = Art;
  const R = (a, b) => a + Math.random() * (b - a);
  const add = p => gameState.particles.push(p);

  // ---- spawners -------------------------------------------------------------------
  function sparks(x, y, n = 6, color = '#ffc94a', speed = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = R(60, 150) * speed;
      add({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 25, life: R(0.18, 0.36), maxLife: 0.36, color, len: R(5, 10), grav: 280, drag: 1.2 });
    }
  }
  function dust(x, y, n = 3, size = 1, spread = 1) {
    for (let i = 0; i < n; i++) {
      const life = R(0.45, 0.8);
      add({ kind: 'dust', x: x + R(-7, 7) * spread, y: y + R(-4, 3), vx: R(-26, 26) * spread, vy: R(-30, -8), r: R(4.5, 8) * size, grow: R(14, 26) * size, life, maxLife: life, grav: -12, drag: 2.2, tone: 0 });
    }
  }
  function smoke(x, y, size = 1, tone = 1) {
    const life = R(0.5, 0.9);
    add({ kind: 'dust', x: x + R(-2, 2), y, vx: R(-8, 8), vy: R(-24, -10), r: R(3.5, 6) * size, grow: R(10, 18) * size, life, maxLife: life, grav: -16, drag: 1.5, tone });
  }
  function stars(x, y, n = 3, color = '#ffe45e') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = R(40, 110);
      add({ kind: 'star', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 50, r: R(3.5, 6), life: R(0.5, 0.85), maxLife: 0.85, rot: R(0, 6), vr: R(-6, 6), grav: 150, drag: 1.4, color });
    }
  }
  function debris(x, y, n = 5, color = '#9aa2b2') {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + R(-1.2, 1.2), s = R(70, 190);
      add({ kind: 'debris', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: R(2.4, 4.8), life: R(0.5, 0.9), maxLife: 0.9, rot: R(0, 6), vr: R(-12, 12), grav: 520, drag: 0.4, color });
    }
  }
  function plus(x, y, n = 4) {
    for (let i = 0; i < n; i++) {
      add({ kind: 'plus', x: x + R(-26, 26), y: y + R(-10, 16), vx: R(-6, 6), vy: R(-48, -26), r: R(4, 6.5), life: R(0.8, 1.2), maxLife: 1.2, grav: 0, drag: 0.2 });
    }
  }
  function coins(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      add({ kind: 'coin', x: x + R(-14, 14), y, vx: R(-50, 50), vy: R(-170, -90), r: R(4, 6), life: R(0.7, 1.05), maxLife: 1.05, rot: R(0, 6), vr: R(-8, 8), grav: 420, drag: 0.3 });
    }
  }
  function sparkle(x, y, n = 5) {
    for (let i = 0; i < n; i++) {
      add({ kind: 'twinkle', x: x + R(-30, 30), y: y + R(-40, 20), vx: 0, vy: R(-20, -6), r: R(3, 6), life: R(0.5, 0.9), maxLife: 0.9, grav: 0, drag: 0 });
    }
  }
  // Cartoon "poof": big dust ring with a few stars.
  function poof(x, y, size = 1) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + R(-0.3, 0.3), s = R(28, 52) * size;
      const life = R(0.5, 0.8);
      add({ kind: 'dust', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.55 - 12, r: R(5, 8) * size, grow: R(16, 26) * size, life, maxLife: life, grav: -8, drag: 3, tone: 0 });
    }
    stars(x, y - 10 * size, 3);
  }
  function lightning(x, y) {
    const pts = [[x + R(-12, 12), -10]];
    const steps = 7;
    for (let i = 1; i <= steps; i++) pts.push([x + (i === steps ? 0 : R(-16, 16)), -10 + ((y + 10) * i) / steps]);
    gameState.bolts.push({ pts, life: 0.28, maxLife: 0.28 });
  }

  // ---- per-step update ---------------------------------------------------------------
  function update(dt) {
    const S = gameState;
    for (let i = S.particles.length - 1; i >= 0; i--) {
      const p = S.particles[i];
      p.life -= dt;
      if (p.life <= 0) { S.particles.splice(i, 1); continue; }
      const k = Math.max(0, 1 - (p.drag || 0) * dt);
      p.vx *= k;
      p.vy = p.vy * k + (p.grav != null ? p.grav : 180) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
      if (p.grow) p.r += p.grow * dt;
    }
    for (let i = S.clashes.length - 1; i >= 0; i--) {
      S.clashes[i].life -= dt;
      if (S.clashes[i].life <= 0) S.clashes.splice(i, 1);
    }
    for (let i = S.floatingTexts.length - 1; i >= 0; i--) {
      const ft = S.floatingTexts[i];
      ft.age += dt;
      ft.y += ft.vy * dt;
      ft.vy *= Math.max(0, 1 - 1.6 * dt);
      ft.life -= dt;
      ft.alpha = Math.max(0, Math.min(1, ft.life / 0.4));
      if (ft.life <= 0) S.floatingTexts.splice(i, 1);
    }
    for (let i = S.bolts.length - 1; i >= 0; i--) {
      S.bolts[i].life -= dt;
      if (S.bolts[i].life <= 0) S.bolts.splice(i, 1);
    }
    if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 2.8);
  }

  // ---- drawing ---------------------------------------------------------------------------
  function puff(g, p) {
    const t = p.life / p.maxLife;
    const a = Math.min(1, t * 1.6) * (p.tone ? 0.8 : 0.92);
    const fill = p.tone ? '#8a8294' : '#f7f4ee', shade = p.tone ? '#615a6c' : '#d6cfc6';
    g.save();
    g.globalAlpha = a;
    g.translate(p.x, p.y);
    const parts = [[0, 0, 1], [-0.7, 0.2, 0.72], [0.7, 0.15, 0.78], [0.05, -0.55, 0.7]];
    g.lineJoin = 'round';
    parts.forEach(([dx, dy, k]) => { g.beginPath(); g.arc(dx * p.r, dy * p.r, p.r * k, 0, 6.3); g.lineWidth = 3.6; g.strokeStyle = 'rgba(70,55,70,0.55)'; g.stroke(); });
    parts.forEach(([dx, dy, k]) => { g.beginPath(); g.arc(dx * p.r, dy * p.r, p.r * k, 0, 6.3); g.fillStyle = fill; g.fill(); });
    g.fillStyle = shade; g.globalAlpha = a * 0.7;
    parts.forEach(([dx, dy, k]) => { g.beginPath(); g.arc(dx * p.r + p.r * 0.18, dy * p.r + p.r * 0.28, p.r * k * 0.7, 0.1, Math.PI - 0.1); g.fill(); });
    g.restore();
  }
  function plusSign(g, x, y, r) {
    g.beginPath();
    g.rect(-r * 0.32, -r, r * 0.64, r * 2); g.rect(-r, -r * 0.32, r * 2, r * 0.64);
    g.fillStyle = '#4ade5a'; g.fill();
    A.stroke(g, 1.8, '#14532d');
  }

  let g; // current context for helper closures
  function drawParticles(ctx, list) {
    g = ctx;
    for (const p of list) {
      const t = p.life / p.maxLife;
      if (p.kind === 'dust') { puff(g, p); continue; }
      g.save();
      g.translate(p.x, p.y);
      if (p.kind === 'spark') {
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const dx = (p.vx / sp) * p.len * (0.5 + t), dy = (p.vy / sp) * p.len * (0.5 + t);
        g.globalAlpha = Math.min(1, t * 2);
        g.lineCap = 'round';
        g.strokeStyle = p.color; g.lineWidth = 2.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(-dx, -dy); g.stroke();
        g.strokeStyle = '#fff8dc'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(-dx * 0.6, -dy * 0.6); g.stroke();
      } else if (p.kind === 'star' || p.kind === 'twinkle') {
        g.globalAlpha = Math.min(1, t * 2);
        g.rotate(p.rot || 0);
        const s = p.r * (p.kind === 'twinkle' ? (0.4 + Math.sin(t * Math.PI)) : (0.5 + t * 0.7));
        A.star(g, 0, 0, s, s * (p.kind === 'twinkle' ? 0.28 : 0.46), p.kind === 'twinkle' ? 4 : 5);
        A.fillStroke(g, p.kind === 'twinkle' ? '#fff6b0' : p.color, p.kind === 'twinkle' ? 0.8 : 1.4);
      } else if (p.kind === 'debris') {
        g.globalAlpha = Math.min(1, t * 2.2);
        g.rotate(p.rot);
        A.poly(g, [-p.r, -p.r * 0.6, p.r * 0.8, -p.r, p.r, p.r * 0.7, -p.r * 0.5, p.r], p.color, 1.6);
      } else if (p.kind === 'plus') {
        g.globalAlpha = Math.min(1, t * 1.8);
        plusSign(g, 0, 0, p.r * (0.7 + (1 - t) * 0.3));
      } else if (p.kind === 'coin') {
        g.globalAlpha = Math.min(1, t * 2);
        g.scale(Math.abs(Math.cos(p.rot)) * 0.8 + 0.2, 1);
        A.circ(g, 0, 0, p.r, '#ffd447', 1.6);
        A.circ(g, 0, 0, p.r * 0.55, '#ffb81c', 0);
        A.gloss(g, -p.r * 0.3, -p.r * 0.3, p.r * 0.3, p.r * 0.18, -0.6, 0.8);
      }
      g.restore();
    }
  }

  function drawBursts(ctx, list) {
    for (const c of list) {
      const t = 1 - c.life / c.maxLife;
      const grow = A.easeOutBack(Math.min(1, t * 3.2));
      const s = c.scale * grow * (1 - t * 0.25);
      const alpha = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
      const kind = c.kind || 'hit';
      const pal = kind === 'boulder' ? ['#ff6a1a', '#ffb02e', '#fff0a6'] : kind === 'magic' ? ['#a855f7', '#e0b3ff', '#ffffff'] : ['#ff9a1f', '#ffd447', '#fffbe6'];
      const R0 = 21 * s;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot || 0);
      ctx.globalAlpha = alpha;
      ctx.lineJoin = 'round';
      A.star(ctx, 0, 0, R0, R0 * 0.52, 10);
      A.fillStroke(ctx, pal[0], 2);
      A.star(ctx, 0, 0, R0 * 0.72, R0 * 0.4, 8, 0.3);
      ctx.fillStyle = pal[1]; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, R0 * 0.34, 0, 6.3); ctx.fillStyle = pal[2]; ctx.fill();
      // speed lines
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * R0 * 1.12, Math.sin(a) * R0 * 1.12); ctx.lineTo(Math.cos(a) * R0 * (1.4 + t * 0.3), Math.sin(a) * R0 * (1.4 + t * 0.3)); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawTexts(ctx, list) {
    for (const ft of list) {
      const pop = ft.age < 0.14 ? A.easeOutBack(ft.age / 0.14) : 1;
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.translate(ft.x, ft.y);
      ctx.scale(pop, pop);
      ctx.font = `900 ${ft.size}px Rubik, 'Arial Black', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(4, ft.size * 0.32);
      ctx.strokeStyle = '#2a1810';
      ctx.strokeText(ft.text, 0, 0);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);
      ctx.globalAlpha = ft.alpha * 0.35;
      ctx.fillStyle = '#fff';
      ctx.fillText(ft.text, 0, -ft.size * 0.06);
      ctx.restore();
    }
  }

  function drawBolts(ctx, list) {
    for (const b of list) {
      const a = b.life / b.maxLife;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,214,64,0.55)'; ctx.lineWidth = 12;
      ctx.beginPath(); b.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.strokeStyle = '#fff7c2'; ctx.lineWidth = 4.2; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
    }
  }

  // ---- projectiles ---------------------------------------------------------------------------
  function drawProjectile(ctx, p, dt) {
    if (!p.trail) p.trail = [];
    if (dt > 0) {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > (p.projType === 'boulder' ? 10 : 9)) p.trail.shift();
    }
    const team = p.team === 'player' ? A.TEAM.player : A.TEAM.enemy;
    const t = Math.min(1, p.progress);
    // ground shadow
    const gy = p.y + Math.sin(t * Math.PI) * p.arcHeight + 12;
    ctx.fillStyle = 'rgba(20,45,12,0.26)';
    ctx.beginPath(); ctx.ellipse(p.x, gy, p.projType === 'boulder' ? 7 : 4.5, p.projType === 'boulder' ? 2.6 : 1.6, 0, 0, 6.3); ctx.fill();

    if (p.projType === 'boulder') {
      if (dt > 0 && Math.random() < 0.55) smoke(p.x, p.y, 0.7, 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.progress * 9);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-7, -2); ctx.lineTo(-3.5, -7.2); ctx.lineTo(3.5, -7); ctx.lineTo(7.4, -1.5); ctx.lineTo(5, 5.8); ctx.lineTo(-2, 7.4); ctx.lineTo(-6.8, 4);
      ctx.closePath();
      A.fillStroke(ctx, '#8e99aa', 2.2);
      ctx.fillStyle = 'rgba(43,18,54,0.3)'; ctx.beginPath(); ctx.moveTo(1, 7.4); ctx.lineTo(5, 5.8); ctx.lineTo(7.4, -1.5); ctx.lineTo(2, 1); ctx.closePath(); ctx.fill();
      A.gloss(ctx, -2.6, -3, 2.6, 1.5, -0.6, 0.6);
      ctx.restore();
      return;
    }

    // speed streak
    const n = p.trail.length;
    if (n > 1) {
      ctx.lineCap = 'round';
      for (let i = 1; i < n; i++) {
        const k = i / n;
        ctx.strokeStyle = `rgba(255,255,255,${k * 0.6})`;
        ctx.lineWidth = 0.6 + k * (p.projType === 'bolt' ? 2.6 : 1.9);
        ctx.beginPath(); ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y); ctx.lineTo(p.trail[i].x, p.trail[i].y); ctx.stroke();
      }
    }
    const dx = p.x - (p.prevX != null ? p.prevX : p.startX), dy = p.y - (p.prevY != null ? p.prevY : p.startY);
    const ang = Math.abs(dx) + Math.abs(dy) > 0.01 ? Math.atan2(dy, dx) : (p.team === 'player' ? 0 : Math.PI);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (p.projType === 'bolt') {
      A.cap(ctx, -8, 0, 5, 0, 2.6, '#7b5330', 1.4);
      A.poly(ctx, [4, -3.4, 12, 0, 4, 3.4], '#e7eef6', 1.5);
      A.poly(ctx, [-8, 0, -5, -3, -3, -3, -4, 0], team.base, 1.1);
      A.poly(ctx, [-8, 0, -5, 3, -3, 3, -4, 0], team.base, 1.1);
    } else {
      A.cap(ctx, -9, 0, 6, 0, 1.7, '#c99560', 1.3);
      A.poly(ctx, [5, -3.2, 12, 0, 5, 3.2], '#e7eef6', 1.5);
      A.poly(ctx, [-9.5, 0, -6, -3.4, -3.5, -3.4, -5, 0], team.base, 1.1);
      A.poly(ctx, [-9.5, 0, -6, 3.4, -3.5, 3.4, -5, 0], '#f4f1e8', 1.1);
    }
    ctx.restore();
  }

  return { sparks, dust, smoke, stars, debris, plus, coins, sparkle, poof, lightning, update, drawParticles, drawBursts, drawTexts, drawBolts, drawProjectile };
})();

// ---- global spawn helpers used by the battle and upgrade code --------------------------------
function spawnFloatingText(x, y, text, color = '#ffffff') {
  const m = /^-(\d+)$/.exec(text);
  const dmg = m ? +m[1] : 0;
  const size = m ? (dmg >= 40 ? 21 : dmg >= 20 ? 18 : 15) : 17;
  gameState.floatingTexts.push({ x, y, text, color, size, alpha: 1, vy: m ? -46 : -34, life: m ? 0.85 : 1.25, age: 0 });
}

function spawnHitParticles(x, y, color = '#fbbf24', count = 5) {
  Art.fx.sparks(x, y, count, color);
}

function spawnClashStarburst(x, y, kind = 'hit', big = 1) {
  const exists = gameState.clashes.some(c => Math.abs(c.x - x) < 14 && c.life > 0.14 && c.kind === kind);
  if (exists) return;
  const base = kind === 'boulder' ? 1.7 : 0.95;
  gameState.clashes.push({
    x, y, kind, rot: Math.random() * 6,
    life: kind === 'boulder' ? 0.34 : 0.24,
    maxLife: kind === 'boulder' ? 0.34 : 0.24,
    scale: (0.85 + Math.random() * 0.3) * base * big
  });
  if (kind === 'boulder') {
    Art.fx.dust(x, y + 8, 5, 1.3, 1.6);
    Art.fx.debris(x, y, 6);
    Art.fx.sparks(x, y, 8, '#ff9a1f', 1.2);
  } else {
    Art.fx.sparks(x, y, 3, '#ffd447');
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
    rotSign: Math.random() < 0.5 ? 1 : -1,
    bitmap: null
  });
  Art.fx.poof(u.x, u.y - 12, u.type.id === 'cavalry' || u.type.id === 'catapult' ? 1.5 : 1);
  if (u.type.id === 'catapult') Art.fx.debris(u.x, u.y - 24, 9, '#b57a3c');
}

function updateEffects(dt) {
  Art.fx.update(dt);
}

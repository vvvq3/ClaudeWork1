// ============================================================================
// UNIT RENDERING ENTRY POINTS
// Turns live game entities into animation poses, draws them with their shadow,
// hit flash and health bar, handles falling corpses and card portraits.
// ============================================================================
(function () {
  const A = Art;
  const U = A.units;

  // h: pixel height of the sprite (for the health bar), hp: bar width, cx: horizontal centre for portraits.
  // box: bounding box of every animation frame (feet at 0,0), frames: cached animation steps.
  const SPEC = {
    peasant:     { h: 62, hp: 28, scale: 1.0,  cx: 6, box: [-26, -82, 74, 6],    walk: 12, wind: 5,  sway: 1 },
    archer:      { h: 64, hp: 28, scale: 1.0,  cx: 4, box: [-30, -74, 46, 6],    walk: 14, wind: 8,  sway: 3 },
    knight:      { h: 68, hp: 32, scale: 1.04, cx: 6, box: [-34, -79, 58, 6],    walk: 16, wind: 5,  sway: 3 },
    crossbowman: { h: 64, hp: 30, scale: 1.0,  cx: 6, box: [-26, -71, 46, 6],    walk: 16, wind: 8,  sway: 1 },
    cavalry:     { h: 96, hp: 38, scale: 1.0,  cx: 8, box: [-46, -124, 107, 6],  walk: 12, wind: 5,  sway: 3 },
    catapult:    { h: 86, hp: 40, scale: 1.22, cx: 2, box: [-54, -94, 46, 6],    walk: 20, wind: 14, sway: 1 }
  };
  U.SPEC = SPEC;

  const fnFor = id => (U.infantry[id] || (U.heavy && U.heavy[id]));

  // Build the animation pose from a live unit.
  U.pose = function (u, time) {
    const cd = u.atkCooldown;
    const attacking = u.state === 'attack';
    const strike = attacking && u.attackAnim > 0 ? 1 - u.attackAnim : -1;
    let wind = 0;
    if (attacking && strike < 0) {
      if (u.type.isRanged) {
        const since = cd - u.atkTimer;
        wind = A.clamp((since - 0.36) / Math.max(0.25, cd - 0.36));
      } else {
        wind = A.clamp(1 - u.atkTimer / 0.32);
      }
    }
    return { ph: u.animPhase, walk: attacking ? 0 : 1, wind, strike, t: time, seed: u.seed || 0, dist: u.x * (u.team === 'player' ? 1 : -1) };
  };

  const IDLE = { ph: 0, walk: 0, wind: 0, strike: -1, t: 0, seed: 0, x: 0 };

  U.drawBody = function (g, typeId, teamKey, pose) {
    g.lineJoin = 'round';
    g.lineCap = 'round';
    fnFor(typeId)(g, pose, A.TEAM[teamKey]);
  };

  // ---- hit flash via a shared scratch canvas (used for the falling-corpse flash) ----
  let scratch = null;
  function drawFlashed(g, paint) {
    const d = A.dpr || 1;
    const W = 260, H = 230, ox = 130, oy = 185;
    if (!scratch || scratch.d !== d) {
      const c = A.canvas(W * d, H * d);
      scratch = { c, g: c.getContext('2d'), d };
    }
    const sg = scratch.g;
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.clearRect(0, 0, W * d, H * d);
    sg.setTransform(d, 0, 0, d, ox * d, oy * d);
    paint(sg);
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.globalCompositeOperation = 'source-atop';
    sg.fillStyle = 'rgba(255,255,255,0.72)';
    sg.fillRect(0, 0, W * d, H * d);
    sg.globalCompositeOperation = 'source-over';
    g.drawImage(scratch.c, -ox, -oy, W, H);
  }

  // ---- sprite cache -------------------------------------------------------------------
  // Drawing a unit with dozens of inked paths every frame is expensive, so each animation
  // step (walk phase, wind-up amount, strike progress) is rendered once into an offscreen
  // bitmap and then simply blitted. Poses are quantised to a few steps per animation.
  const sprites = new Map();
  let spriteDpr = 0;

  function quantize(typeId, pose, time) {
    const spec = SPEC[typeId];
    if (pose.strike >= 0) {
      const n = 8, i = Math.min(n - 1, Math.floor(pose.strike * n));
      return { key: 's' + i, q: { ph: 0, walk: 0, wind: 0, strike: (i + 0.35) / n, t: 0, seed: 0, dist: 0 } };
    }
    if (pose.walk > 0.5) {
      const n = spec.walk, TAU = Math.PI * 2;
      const i = Math.floor((((pose.ph % TAU) + TAU) % TAU) / TAU * n) % n;
      const ph = (i / n) * TAU;
      return { key: 'w' + i, q: { ph, walk: 1, wind: 0, strike: -1, t: 0, seed: 0, dist: ph * 7.14 } };
    }
    const n = spec.wind, w = Math.min(n, Math.round(pose.wind * n));
    const sw = spec.sway > 1 ? Math.floor((((time * 0.8 + pose.seed) % 1) + 1) % 1 * spec.sway) : 0;
    return { key: 'r' + w + '.' + sw, q: { ph: 0, walk: 0, wind: w / n, strike: -1, t: sw * 2.1 + 0.4, seed: 0, dist: 0 } };
  }

  function makeSprite(typeId, team, q) {
    const spec = SPEC[typeId], d = Math.min(2, A.dpr || 1), sc = spec.scale, bx = spec.box;
    const w = (bx[2] - bx[0]) * sc, h = (bx[3] - bx[1]) * sc;
    const cv = A.canvas(w * d, h * d);
    const g = cv.getContext('2d');
    g.setTransform(d * sc, 0, 0, d * sc, -bx[0] * sc * d, -bx[1] * sc * d);
    U.drawBody(g, typeId, team, q);
    return { cv, ox: bx[0] * sc, oy: bx[1] * sc, w, h, flash: null };
  }

  function getSprite(typeId, team, pose, time) {
    const d = A.dpr || 1;
    if (spriteDpr !== d) { sprites.clear(); spriteDpr = d; }
    const { key, q } = quantize(typeId, pose, time);
    const k = typeId + team + key;
    let sp = sprites.get(k);
    if (!sp) { sp = makeSprite(typeId, team, q); sprites.set(k, sp); }
    return sp;
  }

  function flashOf(sp) {
    if (!sp.flash) {
      const f = A.canvas(sp.cv.width, sp.cv.height);
      const g = f.getContext('2d');
      g.drawImage(sp.cv, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255,255,255,0.72)';
      g.fillRect(0, 0, f.width, f.height);
      sp.flash = f;
    }
    return sp.flash;
  }

  // Blit a cached frame at the current origin, facing `dir` (1 = right, -1 = left).
  U.blit = function (g, typeId, team, pose, time, dir, flash, mul = 1) {
    const sp = getSprite(typeId, team, pose, time);
    g.save();
    g.scale(dir * mul, mul);
    g.drawImage(flash ? flashOf(sp) : sp.cv, sp.ox, sp.oy, sp.w, sp.h);
    g.restore();
  };

  function hpBar(g, u, spec) {
    const ratio = A.clamp(u.hp / u.maxHp);
    const w = spec.hp, h = 6.5;
    const x = -w / 2, y = -spec.h * spec.scale - 12;
    const col = u.team === 'player' ? A.TEAM.player : A.TEAM.enemy;
    g.beginPath();
    g.roundRect(x - 1.8, y - 1.8, w + 3.6, h + 3.6, 4.5);
    g.fillStyle = A.INK;
    g.fill();
    g.fillStyle = '#3d2f2a';
    g.fillRect(x, y, w, h);
    if (ratio > 0) {
      const fw = Math.max(h * 0.8, w * ratio);
      g.fillStyle = col.base;
      g.fillRect(x, y, fw, h);
      g.fillStyle = col.hi;
      g.fillRect(x, y, fw, h * 0.4);
      g.fillStyle = col.lo;
      g.fillRect(x, y + h * 0.8, fw, h * 0.2);
    }
  }

  // Draws one living unit (position taken from the entity).
  U.draw = function (g, u, time) {
    const spec = SPEC[u.type.id];
    const dir = u.team === 'player' ? 1 : -1;
    const pose = U.pose(u, time);

    g.save();
    g.translate(u.x, u.y);
    g.fillStyle = 'rgba(20, 45, 12, 0.32)';
    g.beginPath();
    g.ellipse(0, 1, u.type.radius * 2.1 * spec.scale, 5.2 * spec.scale, 0, 0, Math.PI * 2);
    g.fill();
    U.blit(g, u.type.id, u.team, pose, time, dir, u.hitFlash > 0);
    hpBar(g, u, spec);
    g.restore();
  };

  // ---- corpses -----------------------------------------------------------
  const FALL = 0.6;

  function lyingBitmap(c) {
    const d = A.dpr || 1;
    const W = 230, H = 150, ox = 115, oy = 100;
    const cv = A.canvas(W * d, H * d);
    const g = cv.getContext('2d');
    g.setTransform(d, 0, 0, d, ox * d, oy * d);
    paintLying(g, c, 1);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(70,60,95,0.3)';
    g.fillRect(0, 0, W * d, H * d);
    return { cv, W, H, ox, oy };
  }

  function paintLying(g, c, k) {
    const spec = SPEC[c.typeId];
    const dir = c.team === 'player' ? 1 : -1;
    g.scale(dir * spec.scale, spec.scale);
    if (c.typeId === 'catapult') {
      g.rotate(0.12 * k);
      U.drawBody(g, c.typeId, c.team, IDLE);
      return;
    }
    const big = c.typeId === 'cavalry';
    const pivotY = big ? -14 : -5;
    g.translate(-10 * k, 0);
    g.translate(0, pivotY);
    g.rotate(-(big ? 1.25 : 1.5) * k * c.rotSign);
    g.translate(0, -pivotY);
    U.drawBody(g, c.typeId, c.team, IDLE);
  }

  U.drawCorpse = function (g, c) {
    const age = c.maxLife - c.life;
    const fade = c.life < 2.5 ? Math.max(0, c.life / 2.5) : 1;
    g.save();
    g.translate(c.x, c.y);
    g.globalAlpha = fade;
    g.fillStyle = 'rgba(20, 45, 12, 0.3)';
    g.beginPath();
    g.ellipse(0, 1, c.radius * 2.2, 5, 0, 0, Math.PI * 2);
    g.fill();

    if (age < FALL) {
      const k = A.easeOut(age / FALL);
      const dir = c.team === 'player' ? 1 : -1;
      const hop = Math.sin((age / FALL) * Math.PI) * 16;
      g.translate(0, -hop);
      const paint = ctx => {
        ctx.save();
        paintLying(ctx, c, k);
        ctx.restore();
      };
      if (age < 0.12) drawFlashed(g, paint); else paint(g);
    } else {
      if (!c.bitmap) c.bitmap = lyingBitmap(c);
      const b = c.bitmap;
      g.drawImage(b.cv, -b.ox, -b.oy, b.W, b.H);
    }
    g.restore();
  };

  // ---- portraits for the unit cards ---------------------------------------
  const portraitCache = new Map();
  U.portrait = function (typeId, teamKey = 'player', px = 64) {
    const key = typeId + teamKey + px;
    if (portraitCache.has(key)) return portraitCache.get(key);
    const d = 2;
    const spec = SPEC[typeId];
    const cv = A.canvas(px * d, px * d);
    const g = cv.getContext('2d');
    const wide = typeId === 'cavalry' || typeId === 'catapult';
    const boxH = spec.h + 6;
    const boxW = wide ? 112 : 70;
    const sc = Math.min((px * 0.94) / boxH, (px * 0.98) / boxW);
    g.setTransform(d * sc, 0, 0, d * sc, d * px / 2 - d * sc * spec.cx, d * (px * 0.97));
    U.drawBody(g, typeId, teamKey, IDLE);
    const url = cv.toDataURL('image/png');
    portraitCache.set(key, url);
    return url;
  };
})();

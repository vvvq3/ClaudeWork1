// ============================================================================
// CASTLE ART
// The stone body is rendered once per (team, damage level) into offscreen
// bitmaps with two layers: `back` (towers, wall, gate) and `front` (battlement
// merlons that hide the archers' legs). Flags, archers, smoke and fire are
// animated every frame on top.
//
// Local coordinates: origin = centre of the castle base, +x faces the road,
// y grows downwards. The enemy castle is drawn mirrored.
// ============================================================================
Art.castle = (function () {
  const A = Art;
  const { INK } = A;

  const STONE = '#b6bdc9', STONE_LO = '#8590a2', STONE_HI = '#dde2ea';
  const BOX = { W: 200, H: 300, ox: 130, oy: 284 };   // bitmap size and origin offset (css px)

  const SLOTS = [
    { x: -38, y: -92 },
    { x: -5,  y: -98 },
    { x: 28,  y: -92 }
  ];
  const FLAGS = [
    { x: -92, y: -214, s: 1.0 },
    { x: -52, y: -246, s: 1.25 },
    { x: -4,  y: -196, s: 1.0 },
    { x: -68, y: -162, s: 0.9 }
  ];

  // ---- stone helpers ---------------------------------------------------------
  function bricks(g, x, y, w, h, base, rnd, bw = 15, bh = 9) {
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    g.fillStyle = base;
    g.fillRect(x, y, w, h);
    for (let r = 0, yy = y; yy < y + h; r++, yy += bh) {
      const off = (r % 2) * (bw / 2);
      for (let xx = x - off; xx < x + w; xx += bw) {
        const t = (rnd() - 0.5) * 0.16;
        g.fillStyle = t > 0 ? A.tint(base, t) : A.shade(base, -t);
        g.fillRect(xx + 0.5, yy + 0.5, bw - 1, bh - 1);
      }
    }
    g.strokeStyle = 'rgba(43,18,54,0.34)';
    g.lineWidth = 1;
    for (let r = 0, yy = y; yy <= y + h; r++, yy += bh) {
      g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke();
      const off = (r % 2) * (bw / 2);
      for (let xx = x - off + bw; xx < x + w; xx += bw) {
        g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + bh); g.stroke();
      }
    }
    g.restore();
  }

  // side shading: dark on side S, highlight on the opposite side
  function shadeSides(g, x, y, w, h, S, round) {
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    if (S > 0) {
      gr.addColorStop(0, 'rgba(255,248,225,0.30)');
      gr.addColorStop(round ? 0.35 : 0.2, 'rgba(255,248,225,0)');
      gr.addColorStop(round ? 0.62 : 0.72, 'rgba(43,18,54,0)');
      gr.addColorStop(1, 'rgba(43,18,54,0.42)');
    } else {
      gr.addColorStop(0, 'rgba(43,18,54,0.42)');
      gr.addColorStop(round ? 0.38 : 0.28, 'rgba(43,18,54,0)');
      gr.addColorStop(round ? 0.65 : 0.8, 'rgba(255,248,225,0)');
      gr.addColorStop(1, 'rgba(255,248,225,0.30)');
    }
    g.fillStyle = gr;
    g.fillRect(x, y, w, h);
    // ambient occlusion at the base
    const ao = g.createLinearGradient(0, y + h - 18, 0, y + h);
    ao.addColorStop(0, 'rgba(43,18,54,0)');
    ao.addColorStop(1, 'rgba(43,18,54,0.28)');
    g.fillStyle = ao;
    g.fillRect(x, y + h - 18, w, 18);
    g.restore();
  }

  function window_(g, x, y, w, h) {
    g.beginPath();
    g.moveTo(x - w / 2, y + h);
    g.lineTo(x - w / 2, y + w / 2);
    g.arc(x, y + w / 2, w / 2, Math.PI, 0);
    g.lineTo(x + w / 2, y + h);
    g.closePath();
    A.fillStroke(g, '#2d2540', 2);
    g.fillStyle = 'rgba(255,214,120,0.28)';
    g.beginPath(); g.rect(x - w / 2 + 1.5, y + w / 2, w / 2 - 1, h - w / 2 - 1); g.fill();
    g.strokeStyle = STONE_HI; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(x - w / 2 - 1.5, y + h + 1); g.lineTo(x + w / 2 + 1.5, y + h + 1); g.stroke();
    g.strokeStyle = INK; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h); g.stroke();
  }

  function merlons(g, x0, x1, y, S, rnd, skip = []) {
    let i = 0;
    for (let x = x0; x + 12 <= x1 + 0.1; x += 18, i++) {
      if (skip.includes(i)) continue;
      g.save();
      bricks(g, x, y - 14, 12, 14, STONE, rnd, 12, 7);
      g.restore();
      g.beginPath(); g.rect(x, y - 14, 12, 14); A.stroke(g, 2.4);
      g.fillStyle = S > 0 ? 'rgba(43,18,54,0.28)' : 'rgba(43,18,54,0.28)';
      g.fillRect(S > 0 ? x + 8 : x + 1, y - 13, 3.5, 13);
      g.fillStyle = 'rgba(255,248,225,0.35)';
      g.fillRect(x + 1, y - 13, 12 - 2, 2);
    }
  }

  function coneRoof(g, cx, baseY, halfW, h, T, S, rnd) {
    const path = () => {
      g.beginPath();
      g.moveTo(cx - halfW, baseY);
      g.quadraticCurveTo(cx - halfW * 0.34, baseY - h * 0.55, cx, baseY - h);
      g.quadraticCurveTo(cx + halfW * 0.34, baseY - h * 0.55, cx + halfW, baseY);
      g.quadraticCurveTo(cx, baseY + 9, cx - halfW, baseY);
      g.closePath();
    };
    path();
    A.fillStroke(g, T.base, 2.8);
    g.save();
    path();
    g.clip();
    // shingle rows
    g.strokeStyle = T.lo;
    g.lineWidth = 1.3;
    const rows = Math.max(4, Math.round(h / 9));
    for (let r = 1; r <= rows; r++) {
      const yy = baseY + 2 - (r * h) / (rows + 0.6);
      const k = (baseY - yy) / h;
      const hw = halfW * (1 - k) * 1.05;
      g.beginPath();
      g.moveTo(cx - hw, yy);
      g.quadraticCurveTo(cx, yy + 5, cx + hw, yy);
      g.stroke();
      const n = Math.max(2, Math.round((hw * 2) / 9));
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const xx = cx - hw + ((i + (r % 2) * 0.5) * (hw * 2)) / n;
        if (xx < cx - hw || xx > cx + hw) continue;
        g.moveTo(xx, yy + 2); g.lineTo(xx, yy + 9);
      }
      g.stroke();
    }
    // shading
    const gr = g.createLinearGradient(cx - halfW, 0, cx + halfW, 0);
    if (S > 0) {
      gr.addColorStop(0, 'rgba(255,240,210,0.34)'); gr.addColorStop(0.3, 'rgba(255,240,210,0)');
      gr.addColorStop(0.55, 'rgba(43,18,54,0)'); gr.addColorStop(1, 'rgba(43,18,54,0.46)');
    } else {
      gr.addColorStop(0, 'rgba(43,18,54,0.46)'); gr.addColorStop(0.45, 'rgba(43,18,54,0)');
      gr.addColorStop(0.7, 'rgba(255,240,210,0)'); gr.addColorStop(1, 'rgba(255,240,210,0.34)');
    }
    g.fillStyle = gr;
    g.fillRect(cx - halfW, baseY - h - 2, halfW * 2, h + 14);
    g.restore();
    // glossy streak
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    g.beginPath();
    const sx = S > 0 ? -1 : 1;
    g.moveTo(cx + sx * halfW * 0.5, baseY - h * 0.22);
    g.quadraticCurveTo(cx + sx * halfW * 0.28, baseY - h * 0.55, cx + sx * 3, baseY - h * 0.86);
    g.stroke();
    // eave trim
    g.beginPath();
    g.moveTo(cx - halfW, baseY);
    g.quadraticCurveTo(cx, baseY + 9, cx + halfW, baseY);
    A.stroke(g, 2.6);
    // golden finial
    A.circ(g, cx, baseY - h - 1, 2.8, '#ffd447', 1.8);
  }

  function tower(g, x, y, w, h, roofH, roofHalf, T, S, rnd, o = {}) {
    // body
    bricks(g, x, y - h, w, h, STONE, rnd, 14, 9);
    shadeSides(g, x, y - h, w, h, S, true);
    g.beginPath(); g.rect(x, y - h, w, h); A.stroke(g, 2.8);
    // top ring (corbel band)
    const ry = y - h - 9;
    bricks(g, x - 3.5, ry, w + 7, 9, A.tint(STONE, 0.05), rnd, 12, 9);
    shadeSides(g, x - 3.5, ry, w + 7, 9, S, true);
    g.beginPath(); g.rect(x - 3.5, ry, w + 7, 9); A.stroke(g, 2.6);
    // windows
    (o.windows || []).forEach(([wx, wy, ww, wh]) => window_(g, x + wx, y - h + wy, ww, wh));
    coneRoof(g, x + w / 2, ry + 2, roofHalf, roofH, T, S, rnd);
  }

  // ---- wall pieces --------------------------------------------------------------
  function gate(g, x0, x1, S, rnd) {
    const cx = (x0 + x1) / 2, r = (x1 - x0) / 2;
    // stone arch ring
    g.beginPath();
    g.moveTo(x0 - 5, 0); g.lineTo(x0 - 5, -48); g.arc(cx, -48, r + 5, Math.PI, 0); g.lineTo(x1 + 5, 0); g.closePath();
    A.fillStroke(g, A.tint(STONE, 0.12), 2.6);
    // door
    g.beginPath();
    g.moveTo(x0, 0); g.lineTo(x0, -48); g.arc(cx, -48, r, Math.PI, 0); g.lineTo(x1, 0); g.closePath();
    g.fillStyle = '#6a4222'; g.fill();
    g.save();
    g.clip();
    for (let px = x0; px < x1; px += 8.5) {
      g.fillStyle = (Math.round((px - x0) / 8.5) % 2) ? '#7a4c27' : '#6a4222';
      g.fillRect(px, -70, 8.5, 72);
    }
    g.strokeStyle = 'rgba(30,15,8,0.6)'; g.lineWidth = 1.2;
    for (let px = x0 + 8.5; px < x1; px += 8.5) { g.beginPath(); g.moveTo(px, -70); g.lineTo(px, 0); g.stroke(); }
    // dark interior shadow along the arch
    g.strokeStyle = 'rgba(20,8,20,0.35)'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0, -48); g.arc(cx, -48, r, Math.PI, 0); g.lineTo(x1, 0); g.stroke();
    // iron bands
    [-14, -34].forEach(by => { g.fillStyle = '#4a4f5c'; g.fillRect(x0, by - 2.6, x1 - x0, 5.2); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x0, by - 2.6, x1 - x0, 1.3); });
    g.restore();
    g.beginPath();
    g.moveTo(x0, 0); g.lineTo(x0, -48); g.arc(cx, -48, r, Math.PI, 0); g.lineTo(x1, 0);
    A.stroke(g, 2.6);
    // rivets
    g.fillStyle = '#c5ccd8';
    [-14, -34].forEach(by => [x0 + 4, x1 - 4, cx].forEach(rx => { g.beginPath(); g.arc(rx, by, 1.3, 0, 6.3); g.fill(); }));
    // keystone
    A.poly(g, [cx - 5, -48 - r - 5, cx + 5, -48 - r - 5, cx + 3.6, -48 - r + 4, cx - 3.6, -48 - r + 4], STONE_HI, 1.8);
    // ring door handle
    g.beginPath(); g.arc(cx, -22, 3, 0, 6.3); A.stroke(g, 1.8, '#d3dae6');
  }

  function banner(g, x, y, h, T) {
    g.beginPath();
    g.moveTo(x - 7.5, y); g.lineTo(x + 7.5, y); g.lineTo(x + 7.5, y + h - 9); g.lineTo(x, y + h); g.lineTo(x - 7.5, y + h - 9);
    g.closePath();
    A.fillStroke(g, T.base, 2.2);
    g.fillStyle = T.hi; g.globalAlpha = 0.4; g.fillRect(x, y + 1, 6.5, h - 10); g.globalAlpha = 1;
    g.strokeStyle = '#ffd447'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x - 5, y + 3); g.lineTo(x + 5, y + 3); g.stroke();
    A.star(g, x, y + h * 0.45, 4.4, 2, 5);
    A.fillStroke(g, '#ffd447', 1.3);
    A.cap(g, x - 9, y - 0.5, x + 9, y - 0.5, 2.2, '#7a4c27', 1.4);
  }

  function crack(g, pts, w = 2.2) {
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    A.stroke(g, w, '#2a1b2c');
  }

  // ---- bitmap builder -----------------------------------------------------------
  function build(isPlayer, level) {
    const d = A.dpr || 1;
    const T = isPlayer ? A.TEAM.player : A.TEAM.enemy;
    const S = isPlayer ? 1 : -1;
    const rnd = A.rng(isPlayer ? 7 : 19);
    const mk = () => {
      const c = A.canvas(BOX.W * d, BOX.H * d);
      const g = c.getContext('2d');
      // the enemy castle is baked already mirrored, so its origin sits on the other side of the bitmap
      g.setTransform(d, 0, 0, d, (isPlayer ? BOX.ox : BOX.W - BOX.ox) * d, BOX.oy * d);
      if (!isPlayer) g.scale(-1, 1);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      return { c, g };
    };
    const back = mk(), front = mk();
    const g = back.g;

    // soft ground shadow
    g.fillStyle = 'rgba(25,55,15,0.30)';
    g.beginPath(); g.ellipse(-24, 6, 100, 13, 0, 0, 6.3); g.fill();

    // far tower A and the central keep
    tower(g, -112, -2, 40, 150, 62, 29, A.pal(T.lo), S, rnd, { windows: [[20, 34, 9, 18], [20, 78, 9, 18]] });
    tower(g, -80, -2, 56, 174, 70, 39, T, S, rnd, { windows: [[28, 30, 14, 26], [28, 84, 10, 20]] });
    // mid tower B
    tower(g, -26, -2, 44, 138, 56, 30, T, S, rnd, { windows: [[22, 32, 10, 20], [22, 78, 8, 16]] });

    // front corner tower C
    tower(g, -90, 4, 44, 112, 52, 31, T, S, rnd, { windows: [[22, 30, 10, 20], [22, 68, 8, 16]] });

    // curtain wall with a walkway
    const wx0 = -48, wx1 = 60, wTop = -92;
    bricks(g, wx0, wTop, wx1 - wx0, -wTop + 2, STONE, rnd, 15, 9);
    shadeSides(g, wx0, wTop, wx1 - wx0, -wTop + 2, S, false);
    g.beginPath(); g.rect(wx0, wTop, wx1 - wx0, -wTop + 2); A.stroke(g, 2.8);
    // stone cornice under the battlements
    bricks(g, wx0 - 2, wTop - 1, wx1 - wx0 + 4, 7, A.tint(STONE, 0.1), rnd, 12, 7);
    g.beginPath(); g.rect(wx0 - 2, wTop - 1, wx1 - wx0 + 4, 7); A.stroke(g, 2.4);
    // plinth for the central archer
    bricks(g, -16, wTop - 7, 22, 7, STONE, rnd, 11, 7);
    g.beginPath(); g.rect(-16, wTop - 7, 22, 7); A.stroke(g, 2.2);
    // arrow slits
    [-30, -4].forEach(sx => { g.beginPath(); g.roundRect(sx - 1.8, -70, 3.6, 17, 1.8); A.fillStroke(g, '#1f1830', 1.6); });

    gate(g, 22, 56, S, rnd);
    banner(g, -22, -86, 44, T);
    banner(g, 8, -86, 44, T);

    // base stones and grass tufts
    for (let i = 0; i < 9; i++) {
      const bx = -100 + i * 21 + rnd() * 8, br = 4 + rnd() * 3.5;
      g.beginPath(); g.ellipse(bx, 2, br * 1.5, br, 0, 0, 6.3);
      A.fillStroke(g, A.tint('#a2a9b6', rnd() * 0.15), 2);
    }

    // ---- damage ---------------------------------------------------------------
    if (level >= 1) {
      crack(g, [-60, -150, -54, -134, -62, -120, -57, -102]);
      crack(g, [-40, -80, -34, -66, -40, -54]);
      crack(g, [-104, -120, -98, -104, -104, -90]);
    }
    if (level >= 2) {
      crack(g, [-14, -126, -8, -108, -16, -94, -10, -80], 2.6);
      crack(g, [-76, -50, -66, -36, -72, -22], 2.6);
      // soot
      g.fillStyle = 'rgba(30,20,30,0.28)';
      g.beginPath(); g.ellipse(-52, -150, 14, 9, 0.3, 0, 6.3); g.fill();
      g.beginPath(); g.ellipse(2, -112, 11, 7, -0.2, 0, 6.3); g.fill();
    }
    if (level >= 3) {
      // a breach through the wall
      g.save();
      g.beginPath();
      g.moveTo(4, -62); g.lineTo(14, -78); g.lineTo(21, -66); g.lineTo(18, -48); g.lineTo(8, -40); g.lineTo(0, -48);
      g.closePath();
      g.fillStyle = '#251c2e'; g.fill();
      g.clip();
      bricks(g, 0, -80, 24, 42, '#5a5368', rnd, 9, 6);
      g.restore();
      g.beginPath();
      g.moveTo(4, -62); g.lineTo(14, -78); g.lineTo(21, -66); g.lineTo(18, -48); g.lineTo(8, -40); g.lineTo(0, -48);
      g.closePath();
      A.stroke(g, 2.6);
      // fallen stones
      [[-8, 1, 6], [4, 3, 5], [16, 1, 7], [26, 4, 4]].forEach(([sx, sy, sr]) => { g.beginPath(); g.ellipse(sx + 12, sy, sr * 1.3, sr * 0.9, 0.3, 0, 6.3); A.fillStroke(g, '#9aa2b2', 2); });
    }

    // ---- front layer: battlements ---------------------------------------------
    const skip = level >= 2 ? [2] : (level >= 1 ? [5] : []);
    merlons(front.g, wx0, wx1, wTop, S, rnd, skip);
    // tiny rubble where a merlon is missing
    skip.forEach(i => {
      const mx = wx0 + i * 18;
      front.g.beginPath(); front.g.ellipse(mx + 6, wTop - 2, 6, 3, 0, 0, 6.3); A.fillStroke(front.g, '#9aa2b2', 1.8);
    });
    return { back: back.c, front: front.c, W: BOX.W, H: BOX.H, ox: BOX.ox, oy: BOX.oy, d };
  }

  const cache = new Map();
  function get(isPlayer, level) {
    const d = A.dpr || 1;
    const key = (isPlayer ? 'p' : 'e') + level + '@' + d;
    let bm = cache.get(key);
    if (!bm) { bm = build(isPlayer, level); cache.set(key, bm); }
    return bm;
  }

  const levelOf = r => (r > 0.75 ? 0 : r > 0.5 ? 1 : r > 0.25 ? 2 : 3);

  // ---- dynamic bits -------------------------------------------------------------
  function drawFlag(g, x, y, s, T, time, seed) {
    g.save();
    g.translate(x, y);
    A.cap(g, 0, 2, 0, -26 * s, 1.8 * s, '#8a5a2e', 1.5);
    const L = 30 * s, H = 15 * s;
    const w = k => Math.sin(time * 5.5 + seed - k * 3.2) * (1.5 + k * 3.2) * s;
    g.beginPath();
    g.moveTo(0, -26 * s);
    for (let i = 1; i <= 6; i++) { const k = i / 6; g.lineTo(k * L, -26 * s + w(k) * 0.6 - 0); }
    // swallow-tail edge
    g.lineTo(L - 6 * s, -26 * s + H * 0.5 + w(0.95) * 0.5);
    g.lineTo(L, -26 * s + H + w(1) * 0.6);
    for (let i = 6; i >= 0; i--) { const k = i / 6; g.lineTo(k * L, -26 * s + H + w(k) * 0.6); }
    g.closePath();
    A.fillStroke(g, T.base, 2.1);
    g.save(); g.clip();
    g.fillStyle = T.hi; g.globalAlpha = 0.45; g.fillRect(0, -26 * s, L, H * 0.35);
    g.restore();
    g.strokeStyle = '#ffd447'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(3, -26 * s + H * 0.5); g.lineTo(L * 0.55, -26 * s + H * 0.5 + w(0.55) * 0.6); g.stroke();
    A.circ(g, 0, -27 * s, 2.4 * s, '#ffd447', 1.5);
    g.restore();
  }

  function drawSmoke(g, time, x, y, strength) {
    for (let i = 0; i < 5; i++) {
      const a = (time * 0.35 + i / 5) % 1;
      const px = x + Math.sin(a * 6 + i * 2) * 7 + a * 12;
      const py = y - a * 78;
      const r = 6 + a * 15;
      g.fillStyle = `rgba(86,78,98,${(1 - a) * 0.55 * strength})`;
      g.beginPath(); g.arc(px, py, r, 0, 6.3); g.fill();
      g.strokeStyle = `rgba(40,30,50,${(1 - a) * 0.35 * strength})`;
      g.lineWidth = 1.6; g.stroke();
    }
  }

  function drawFire(g, time, x, y, scale) {
    for (let i = 0; i < 3; i++) {
      const ph = time * 9 + i * 2.1;
      const fx = x + (i - 1) * 8 * scale, h = (13 + Math.sin(ph) * 4 + i % 2 * 4) * scale;
      g.beginPath();
      g.moveTo(fx - 5 * scale, y);
      g.quadraticCurveTo(fx - 6 * scale, y - h * 0.6, fx + Math.sin(ph * 0.7) * 2.5, y - h);
      g.quadraticCurveTo(fx + 6 * scale, y - h * 0.5, fx + 5 * scale, y);
      g.closePath();
      A.fillStroke(g, '#ff8a1f', 1.8);
      g.beginPath();
      g.moveTo(fx - 2.6 * scale, y);
      g.quadraticCurveTo(fx - 3 * scale, y - h * 0.4, fx, y - h * 0.65);
      g.quadraticCurveTo(fx + 3 * scale, y - h * 0.3, fx + 2.6 * scale, y);
      g.closePath();
      g.fillStyle = '#ffe36b'; g.fill();
    }
  }

  function draw(g, cx, cy, isPlayer, hpRatio, time, archerAnims, archerTimers) {
    const T = isPlayer ? A.TEAM.player : A.TEAM.enemy;
    const lvl = levelOf(hpRatio);
    const bm = get(isPlayer, lvl);
    g.save();
    g.translate(cx, cy);
    g.drawImage(bm.back, isPlayer ? -bm.ox : -(bm.W - bm.ox), -bm.oy, bm.W, bm.H);

    if (!isPlayer) g.scale(-1, 1);

    // archers on the wall (cached sprites, scaled down to fit the battlements)
    const teamKey = isPlayer ? 'player' : 'enemy';
    SLOTS.forEach((s, i) => {
      const anim = archerAnims[i] || 0;
      const timer = archerTimers[i] || 0;
      g.save();
      g.translate(s.x, s.y + 2);
      A.units.blit(g, 'archer', teamKey, {
        ph: 0, walk: 0,
        wind: A.clamp(1 - timer / 1.25),
        strike: anim > 0 ? 1 - anim : -1,
        seed: i * 0.31 + (isPlayer ? 0 : 0.17)
      }, time, 1, false, 0.74);
      g.restore();
    });

    g.restore();
    g.save();
    g.translate(cx, cy);
    g.drawImage(bm.front, isPlayer ? -bm.ox : -(bm.W - bm.ox), -bm.oy, bm.W, bm.H);
    if (!isPlayer) g.scale(-1, 1);
    FLAGS.forEach((f, i) => drawFlag(g, f.x, f.y, f.s, T, time, i * 1.7 + (isPlayer ? 0 : 0.9)));
    if (lvl >= 2) drawSmoke(g, time, -52, -178, lvl === 3 ? 1 : 0.6);
    if (lvl >= 3) {
      drawFire(g, time, 10, -44, 1);
      drawFire(g, time + 1.3, -90, -150, 0.8);
    }
    g.restore();
  }

  function clearCache() { cache.clear(); }

  return { draw, clearCache, SLOTS, FLAGS, BOX, levelOf };
})();

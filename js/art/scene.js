// ============================================================================
// SCENERY: sky, drifting clouds, hills, meadow, trees, bushes and the sandy road.
// The static parts are baked into three offscreen layers (sky / land / foreground)
// every time the canvas is resized; only the clouds move.
// ============================================================================
Art.scene = (function () {
  const A = Art;
  const { INK } = A;

  const GREEN = { base: '#4fb336', hi: '#8bdc5a', lo: '#2f8a2c', deep: '#1f6a28' };

  // ---- trees, bushes, flowers ---------------------------------------------------
  function leafBlob(g, circles, base, hi, lo, ol = 2.6) {
    // outline pass then fill pass so overlapping circles read as one silhouette
    g.lineJoin = 'round';
    circles.forEach(c => { g.beginPath(); g.arc(c.x, c.y, c.r, 0, 6.3); g.lineWidth = ol * 2; g.strokeStyle = INK; g.stroke(); });
    circles.forEach(c => { g.beginPath(); g.arc(c.x, c.y, c.r, 0, 6.3); g.fillStyle = base; g.fill(); });
    // shading clipped to the silhouette
    g.save();
    g.beginPath();
    circles.forEach(c => { g.moveTo(c.x + c.r, c.y); g.arc(c.x, c.y, c.r, 0, 6.3); });
    g.clip();
    const minX = Math.min(...circles.map(c => c.x - c.r)), maxX = Math.max(...circles.map(c => c.x + c.r));
    const minY = Math.min(...circles.map(c => c.y - c.r)), maxY = Math.max(...circles.map(c => c.y + c.r));
    const gr = g.createLinearGradient(minX, minY, maxX, maxY);
    gr.addColorStop(0, 'rgba(255,255,200,0.30)');
    gr.addColorStop(0.45, 'rgba(255,255,200,0)');
    gr.addColorStop(0.62, 'rgba(20,50,40,0)');
    gr.addColorStop(1, 'rgba(20,50,40,0.5)');
    g.fillStyle = gr;
    g.fillRect(minX, minY, maxX - minX, maxY - minY);
    // lighter leaf clusters on the lit side
    g.fillStyle = hi;
    g.globalAlpha = 0.65;
    circles.forEach(c => { g.beginPath(); g.arc(c.x - c.r * 0.28, c.y - c.r * 0.34, c.r * 0.55, 0, 6.3); g.fill(); });
    g.globalAlpha = 0.4;
    g.fillStyle = '#e8ffb0';
    circles.forEach(c => { g.beginPath(); g.arc(c.x - c.r * 0.42, c.y - c.r * 0.5, c.r * 0.2, 0, 6.3); g.fill(); });
    g.restore();
    // contour of each lump inside the silhouette for a hand-drawn look
    g.save();
    g.beginPath();
    circles.forEach(c => { g.moveTo(c.x + c.r, c.y); g.arc(c.x, c.y, c.r, 0, 6.3); });
    g.clip();
    g.strokeStyle = 'rgba(25,60,35,0.45)';
    g.lineWidth = 1.6;
    circles.forEach(c => { g.beginPath(); g.arc(c.x, c.y, c.r - 1, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); });
    g.restore();
  }

  function roundTree(g, x, y, s, rnd, tone = 0) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = 'rgba(25,55,15,0.28)';
    g.beginPath(); g.ellipse(2, 3, 34, 8, 0, 0, 6.3); g.fill();
    // trunk
    g.beginPath();
    g.moveTo(-9, 2); g.quadraticCurveTo(-6, -10, -6, -28); g.lineTo(6, -28); g.quadraticCurveTo(6, -10, 10, 2);
    g.closePath();
    A.fillStroke(g, '#8a5a32', 2.6);
    g.fillStyle = 'rgba(43,18,54,0.3)'; g.beginPath(); g.moveTo(1, -28); g.lineTo(6, -28); g.quadraticCurveTo(6, -10, 10, 2); g.lineTo(2, 2); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,20,10,0.45)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-2, -4); g.lineTo(-2, -16); g.moveTo(2, -10); g.lineTo(2, -24); g.stroke();
    A.cap(g, -4, -22, -14, -34, 3.4, '#8a5a32', 2);
    const base = A.mix('#3da443', '#5bbb45', tone), hi = '#8de05a';
    leafBlob(g, [
      { x: -20, y: -42, r: 17 }, { x: 19, y: -42, r: 17 }, { x: 0, y: -62, r: 24 },
      { x: -24, y: -60, r: 14 }, { x: 24, y: -60, r: 14 }, { x: 0, y: -40, r: 20 }
    ], base, hi, '#2a7a30');
    g.restore();
  }

  function pineTree(g, x, y, s, tone = 0) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = 'rgba(25,55,15,0.28)';
    g.beginPath(); g.ellipse(2, 3, 26, 7, 0, 0, 6.3); g.fill();
    A.rr(g, -5, -22, 10, 24, 2, '#7a4c2a', 2.4);
    const cols = [A.mix('#2e8a47', '#3f9c4c', tone), A.mix('#35974c', '#49aa52', tone), A.mix('#3fa653', '#58b95a', tone), A.mix('#4bb55a', '#68c761', tone)];
    [[-16, 34, 30], [-36, 29, 28], [-55, 24, 26], [-72, 18, 24]].forEach(([yy, hw, h], i) => {
      g.beginPath();
      g.moveTo(-hw, yy);
      g.quadraticCurveTo(-hw * 0.4, yy - h * 0.2, 0, yy - h);
      g.quadraticCurveTo(hw * 0.4, yy - h * 0.2, hw, yy);
      g.quadraticCurveTo(0, yy + 7, -hw, yy);
      g.closePath();
      A.fillStroke(g, cols[i], 2.6);
      g.save(); g.clip();
      g.fillStyle = 'rgba(255,255,200,0.3)'; g.beginPath(); g.moveTo(-hw, yy); g.lineTo(0, yy - h); g.lineTo(-2, yy); g.closePath(); g.fill();
      g.fillStyle = 'rgba(20,50,40,0.35)'; g.beginPath(); g.moveTo(hw, yy); g.lineTo(2, yy - h); g.lineTo(hw * 0.2, yy + 4); g.closePath(); g.fill();
      g.restore();
    });
    g.restore();
  }

  function bush(g, x, y, s, rnd, flowers) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = 'rgba(25,55,15,0.25)';
    g.beginPath(); g.ellipse(0, 2, 24, 6, 0, 0, 6.3); g.fill();
    leafBlob(g, [{ x: -13, y: -9, r: 10 }, { x: 11, y: -9, r: 10.5 }, { x: 0, y: -15, r: 12 }], '#42a843', '#8de05a', '#2a7a30', 2.3);
    if (flowers) {
      [[-9, -12], [4, -19], [11, -9], [-1, -9]].forEach(([fx, fy], i) => {
        A.circ(g, fx, fy, 2.2, ['#ff7aa8', '#fff3b0', '#ffffff', '#ff9a5a'][i % 4], 1.2);
      });
    }
    g.restore();
  }

  function rock(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.beginPath();
    g.moveTo(-12, 0); g.quadraticCurveTo(-14, -9, -5, -11); g.quadraticCurveTo(4, -14, 11, -7); g.quadraticCurveTo(15, -2, 12, 0);
    g.closePath();
    A.fillStroke(g, '#a9b0bd', 2.2);
    g.save(); g.clip();
    g.fillStyle = 'rgba(43,18,54,0.3)'; g.fillRect(2, -14, 14, 16);
    g.restore();
    A.gloss(g, -4, -7, 4.2, 1.6, -0.4, 0.55);
    g.restore();
  }

  function flower(g, x, y, col, r = 2.3) {
    g.fillStyle = col;
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, r * 0.75, 0, 6.3); g.fill();
    }
    g.fillStyle = '#ffd447'; g.beginPath(); g.arc(x, y, r * 0.6, 0, 6.3); g.fill();
  }

  function tuft(g, x, y, s, col) {
    g.strokeStyle = col; g.lineWidth = 1.6 * s; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x - 4 * s, y); g.quadraticCurveTo(x - 4 * s, y - 5 * s, x - 6 * s, y - 8 * s);
    g.moveTo(x, y); g.quadraticCurveTo(x, y - 6 * s, x + 0.5 * s, y - 10 * s);
    g.moveTo(x + 4 * s, y); g.quadraticCurveTo(x + 4 * s, y - 5 * s, x + 6.5 * s, y - 8 * s);
    g.stroke();
  }

  // ---- layers ------------------------------------------------------------------------
  function layer(W, H, d) {
    const c = A.canvas(W * d, H * d);
    const g = c.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    return { c, g };
  }

  function buildSky(W, H, d) {
    const { c, g } = layer(W, H, d);
    const sky = g.createLinearGradient(0, 0, 0, H * 0.56);
    sky.addColorStop(0, '#3f98ec');
    sky.addColorStop(0.55, '#8fcdf7');
    sky.addColorStop(1, '#d6f0fd');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    // soft sun glow
    const glow = g.createRadialGradient(W * 0.72, H * 0.06, 0, W * 0.72, H * 0.06, W * 0.5);
    glow.addColorStop(0, 'rgba(255,255,235,0.55)');
    glow.addColorStop(1, 'rgba(255,255,235,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H * 0.7);
    return c;
  }

  function hillPath(g, W, H, pts, closeY) {
    g.beginPath();
    g.moveTo(0, H * pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i], [qx, qy] = pts[i - 1];
      g.quadraticCurveTo(W * (qx + (px - qx) * 0.5), H * (Math.min(py, qy) - 0.035), W * px, H * py);
    }
    g.lineTo(W, closeY);
    g.lineTo(0, closeY);
    g.closePath();
  }

  function buildLand(W, H, d, pos) {
    const { c, g } = layer(W, H, d);
    const rnd = A.rng(1234 + Math.round(W));
    const { leftCastleX, rightCastleX, roadCenterY } = pos;

    // far blue-green hills with tiny pines
    hillPath(g, W, H, [[0, 0.43], [0.2, 0.34], [0.42, 0.41], [0.66, 0.33], [0.86, 0.4], [1, 0.36]], H);
    const far = g.createLinearGradient(0, H * 0.28, 0, H * 0.5);
    far.addColorStop(0, '#9fd9a2'); far.addColorStop(1, '#78c487');
    g.fillStyle = far; g.fill();
    for (let i = 0; i < Math.round(W / 26); i++) {
      const x = rnd() * W, y = H * (0.36 + rnd() * 0.06);
      const s = 0.22 + rnd() * 0.12;
      pineTree(g, x, y, s, 0.2);
    }

    // mid hills
    hillPath(g, W, H, [[0, 0.5], [0.16, 0.42], [0.36, 0.48], [0.58, 0.41], [0.8, 0.47], [1, 0.42]], H);
    const mid = g.createLinearGradient(0, H * 0.36, 0, H * 0.62);
    mid.addColorStop(0, '#7fd15a'); mid.addColorStop(1, '#58b83a');
    g.fillStyle = mid; g.fill();
    g.strokeStyle = 'rgba(30,90,40,0.55)'; g.lineWidth = 2.4; g.stroke();

    // main meadow
    g.beginPath();
    g.moveTo(0, H * 0.5);
    g.quadraticCurveTo(W * 0.3, H * 0.43, W * 0.55, H * 0.5);
    g.quadraticCurveTo(W * 0.8, H * 0.44, W, H * 0.49);
    g.lineTo(W, H); g.lineTo(0, H); g.closePath();
    const meadow = g.createLinearGradient(0, H * 0.42, 0, H);
    meadow.addColorStop(0, '#7ad152'); meadow.addColorStop(0.5, '#59b93a'); meadow.addColorStop(1, '#3f9a2d');
    g.fillStyle = meadow; g.fill();
    g.strokeStyle = 'rgba(25,80,30,0.5)'; g.lineWidth = 2.2; g.stroke();

    // soft light/dark patches in the grass
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = H * (0.5 + rnd() * 0.5), r = 40 + rnd() * 90;
      g.fillStyle = rnd() > 0.5 ? 'rgba(190,255,120,0.10)' : 'rgba(10,70,30,0.10)';
      g.beginPath(); g.ellipse(x, y, r, r * 0.28, 0, 0, 6.3); g.fill();
    }
    // grass tufts and flowers across the field
    for (let i = 0; i < Math.round(W / 4.5); i++) {
      const x = rnd() * W, y = H * (0.52 + rnd() * 0.48);
      if (Math.abs(y - roadCenterY) < 82 && x > leftCastleX - 10 && x < rightCastleX + 10) continue;
      tuft(g, x, y, 0.7 + (y / H) * 0.6, rnd() > 0.5 ? '#3a9a2c' : '#a4e46c');
    }
    const fcols = ['#ffffff', '#ffe36b', '#ff8fb5', '#c7a4ff', '#ff9a5a'];
    for (let i = 0; i < Math.round(W / 22); i++) {
      const x = rnd() * W, y = H * (0.56 + rnd() * 0.42);
      if (Math.abs(y - roadCenterY) < 84 && x > leftCastleX - 10 && x < rightCastleX + 10) continue;
      flower(g, x, y, fcols[Math.floor(rnd() * fcols.length)], 1.8 + (y / H) * 1.4);
    }

    // trees behind the road
    const back = [
      [0.215, -112, 0.9, 0], [0.265, -120, 1.05, 1], [0.34, -126, 0.78, 0], [0.4, -118, 0.95, 2],
      [0.6, -122, 0.82, 0], [0.665, -114, 1.0, 1], [0.735, -124, 0.9, 0], [0.79, -112, 1.0, 2]
    ];
    back.forEach(([fx, dy, s, kind], i) => {
      const x = W * fx, y = roadCenterY + dy;
      if (kind === 1) pineTree(g, x, y, s * 0.9, rnd());
      else roundTree(g, x, y, s * 0.92, rnd, rnd() * 0.5);
      if (i % 2 === 0) bush(g, x + 34 * s, y + 8, 0.8, rnd, true);
    });
    bush(g, W * 0.5, roadCenterY - 100, 1.0, rnd, true);
    bush(g, W * 0.44, roadCenterY - 94, 0.8, rnd, false);
    bush(g, W * 0.57, roadCenterY - 96, 0.85, rnd, true);

    // ----- the road -----------------------------------------------------------------
    const xa = leftCastleX + 26, xb = rightCastleX - 26, hw = 74;
    const edge = (x, k) => Math.sin(x * 0.012 + k) * 4.5 + Math.sin(x * 0.031 + k * 2.3) * 2.2;
    const road = path => {
      g.beginPath();
      g.moveTo(xa - 10, roadCenterY - hw + 6);
      for (let x = xa; x <= xb; x += 12) g.lineTo(x, roadCenterY - hw + edge(x, 0));
      g.lineTo(xb + 10, roadCenterY - hw + 6);
      g.quadraticCurveTo(xb + 22, roadCenterY, xb + 10, roadCenterY + hw - 6);
      for (let x = xb; x >= xa; x -= 12) g.lineTo(x, roadCenterY + hw + edge(x, 4));
      g.lineTo(xa - 10, roadCenterY + hw - 6);
      g.quadraticCurveTo(xa - 22, roadCenterY, xa - 10, roadCenterY - hw + 6);
      g.closePath();
    };
    // grass shadow rim, outline, sand fill
    road();
    g.lineWidth = 12; g.strokeStyle = 'rgba(30,100,30,0.35)'; g.stroke();
    road();
    const sand = g.createLinearGradient(0, roadCenterY - hw, 0, roadCenterY + hw);
    sand.addColorStop(0, '#ecc783'); sand.addColorStop(0.5, '#e1b873'); sand.addColorStop(1, '#d2a45f');
    g.fillStyle = sand; g.fill();
    g.save(); road(); g.clip();
    // darker verge inside the edges
    g.lineWidth = 16; g.strokeStyle = 'rgba(150,100,45,0.45)'; road(); g.stroke();
    // wheel ruts
    g.strokeStyle = 'rgba(160,110,55,0.5)'; g.lineWidth = 3;
    [-30, 26].forEach((oy, k) => {
      g.beginPath();
      for (let x = xa; x <= xb; x += 14) { const yy = roadCenterY + oy + Math.sin(x * 0.02 + k * 2) * 3; if (x === xa) g.moveTo(x, yy); else g.lineTo(x, yy); }
      g.stroke();
    });
    // pebbles and dust speckles
    for (let i = 0; i < Math.round((xb - xa) / 6); i++) {
      const x = xa + rnd() * (xb - xa), y = roadCenterY + (rnd() - 0.5) * hw * 2;
      g.fillStyle = rnd() > 0.5 ? 'rgba(255,240,200,0.55)' : 'rgba(150,105,55,0.5)';
      g.beginPath(); g.ellipse(x, y, 1.6 + rnd() * 2.6, 1 + rnd() * 1.4, 0, 0, 6.3); g.fill();
    }
    g.restore();
    road();
    g.lineWidth = 3.4; g.strokeStyle = '#7e5a2e'; g.stroke();
    g.save(); road(); g.clip();
    g.lineWidth = 2.4; g.strokeStyle = 'rgba(255,245,210,0.55)';
    g.beginPath(); for (let x = xa; x <= xb; x += 12) { const yy = roadCenterY - hw + edge(x, 0) + 5; if (x === xa) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke();
    g.restore();
    // grass overhanging the edges, rocks beside the road
    for (let i = 0; i < Math.round((xb - xa) / 14); i++) {
      const x = xa + rnd() * (xb - xa);
      tuft(g, x, roadCenterY - hw + edge(x, 0) + 2, 0.9 + rnd() * 0.5, '#3a9a2c');
      tuft(g, xa + rnd() * (xb - xa), roadCenterY + hw + edge(x, 4) + 3, 1 + rnd() * 0.5, '#2f8a28');
    }
    for (let i = 0; i < 9; i++) {
      const x = xa + 60 + rnd() * (xb - xa - 120);
      rock(g, x, roadCenterY + (rnd() > 0.5 ? 1 : -1) * (hw + 8 + rnd() * 6), 0.7 + rnd() * 0.6);
    }
    return c;
  }

  function buildForeground(W, H, d, top) {
    const { c, g } = layer(W, H - top, d);
    g.translate(0, -top);
    const rnd = A.rng(99 + Math.round(H));
    pineTree(g, W * 0.045, H * 1.0, 1.55 * Math.min(1.2, H / 650), 0.1);
    roundTree(g, W * 0.955, H * 1.0, 1.35 * Math.min(1.2, H / 650), rnd, 0.3);
    bush(g, W * 0.12, H * 0.985, 1.25, rnd, true);
    bush(g, W * 0.9, H * 0.99, 1.15, rnd, true);
    bush(g, W * 0.3, H * 1.0, 1.0, rnd, false);
    bush(g, W * 0.72, H * 1.0, 1.1, rnd, true);
    for (let i = 0; i < Math.round(W / 28); i++) tuft(g, rnd() * W, H * (0.965 + rnd() * 0.04), 1.5, rnd() > 0.5 ? '#2f8a28' : '#4fb336');
    return c;
  }

  // ---- clouds ----------------------------------------------------------------------
  const clouds = [
    { x: 0.14, y: 0.11, s: 1.15, spd: 0.004 },
    { x: 0.46, y: 0.07, s: 1.45, spd: 0.003 },
    { x: 0.78, y: 0.15, s: 1.0, spd: 0.005 },
    { x: 0.97, y: 0.05, s: 0.8, spd: 0.0035 }
  ];

  function drawCloud(g, cx, cy, s) {
    g.save();
    g.translate(cx, cy);
    g.scale(s, s);
    const blobs = [[-34, 4, 17], [-12, -6, 22], [14, -9, 24], [38, 2, 18], [2, 8, 22]];
    g.lineJoin = 'round';
    blobs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 6.3); g.lineWidth = 5; g.strokeStyle = 'rgba(112,160,215,0.75)'; g.stroke(); });
    blobs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fillStyle = '#ffffff'; g.fill(); });
    g.save();
    g.beginPath(); blobs.forEach(([x, y, r]) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.3); }); g.clip();
    g.fillStyle = 'rgba(160,200,245,0.55)';
    g.beginPath(); g.ellipse(2, 26, 62, 15, 0, 0, 6.3); g.fill();
    g.restore();
    g.restore();
  }

  function drawClouds(g, W, H, dt) {
    clouds.forEach(c => {
      c.x += c.spd * dt;
      if (c.x > 1.18) c.x = -0.18;
      drawCloud(g, c.x * W, c.y * H, c.s);
    });
  }

  function build(W, H, d, pos) {
    // sky and land never overlap the clouds, so they are merged into one opaque background layer
    const { c, g } = layer(W, H, d);
    g.drawImage(buildSky(W, H, d), 0, 0, W, H);
    g.drawImage(buildLand(W, H, d, pos), 0, 0, W, H);
    const fgTop = Math.floor(H * 0.52);
    return { bg: c, fg: buildForeground(W, H, d, fgTop), fgTop, W, H, d };
  }

  return { build, drawClouds, tree: roundTree, pine: pineTree, bush, drawCloud };
})();

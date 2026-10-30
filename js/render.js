// ============================================================================
// HIGH-DETAIL CARTOON RENDERER (+30% Unit Size, Oriented Homing Arrows, Unique Corpses)
// ============================================================================
const clouds = [
  { x: 0.16, y: 0.13, s: 1.05, spd: 0.004 },
  { x: 0.48, y: 0.09, s: 1.3, spd: 0.003 },
  { x: 0.78, y: 0.14, s: 0.95, spd: 0.005 }
];

function drawCloud(cx, cy, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.strokeStyle = 'rgba(147, 197, 253, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 28, Math.PI * 0.85, Math.PI * 1.95);
  ctx.arc(26, -6, 23, Math.PI * 1.05, Math.PI * 1.95);
  ctx.arc(48, 3, 18, Math.PI * 1.1, Math.PI * 0.4);
  ctx.lineTo(-24, 21);
  ctx.arc(-24, 4, 18, Math.PI * 0.5, Math.PI * 1.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTree(x, y, scale, isPine = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#1b120b';

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#6e472b';
  ctx.beginPath();
  ctx.roundRect(-7, -28, 14, 30, 3);
  ctx.fill();
  ctx.stroke();

  if (isPine) {
    const layers = [
      { y: -20, w: 32, h: 28, c: '#276738' },
      { y: -38, w: 26, h: 26, c: '#2f7a42' },
      { y: -55, w: 19, h: 24, c: '#398e4e' }
    ];
    layers.forEach(l => {
      ctx.fillStyle = l.c;
      ctx.beginPath();
      ctx.moveTo(-l.w, l.y);
      ctx.lineTo(0, l.y - l.h);
      ctx.lineTo(l.w, l.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  } else {
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(-17, -34, 16, 0, Math.PI * 2);
    ctx.arc(17, -34, 16, 0, Math.PI * 2);
    ctx.arc(0, -48, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(-6, -50, 14, 0, Math.PI * 2);
    ctx.arc(9, -43, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCorpseOnCanvas(c) {
  ctx.save();
  ctx.translate(c.x, c.y);

  const alpha = c.life < 3.0 ? Math.max(0, c.life / 3.0) : 0.94;
  ctx.globalAlpha = alpha;

  const dir = c.team === 'player' ? 1 : -1;
  const teamColor = c.team === 'player' ? '#dc2626' : '#2563eb';
  const teamDark = c.team === 'player' ? '#991b1b' : '#1e40af';

  // 1. Blood Puddle underneath
  ctx.fillStyle = c.typeId === 'catapult' ? 'rgba(90, 40, 20, 0.7)' : 'rgba(153, 27, 27, 0.84)';
  c.bloodBlobs.forEach(b => {
    ctx.beginPath();
    ctx.ellipse(b.dx, b.dy, b.rx, b.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  if (c.typeId !== 'catapult') {
    ctx.fillStyle = 'rgba(220, 38, 38, 0.65)';
    ctx.beginPath();
    ctx.ellipse(0, 1.2, c.radius * 0.9, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scale corpse by UNIT_SCALE (0.65)
  ctx.scale(dir * UNIT_SCALE, UNIT_SCALE);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#1b120c';

  if (c.typeId === 'peasant') {
    ctx.fillStyle = '#4a2e16';
    ctx.fillRect(6, -4, 7, 4);
    ctx.strokeRect(6, -4, 7, 4);

    ctx.fillStyle = '#e5cca9';
    ctx.beginPath();
    ctx.roundRect(-10, -7, 17, 8, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = teamColor;
    ctx.fillRect(-3, -7, 3.5, 8);

    ctx.fillStyle = '#eab68c';
    ctx.beginPath();
    ctx.arc(-13, -3, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#6b4226';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-8, 4); ctx.lineTo(14, 2);
    ctx.stroke();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(14, -1); ctx.lineTo(14, 5);
    ctx.moveTo(14, -1); ctx.lineTo(19, -1);
    ctx.moveTo(14, 2);  ctx.lineTo(19, 2);
    ctx.moveTo(14, 5);  ctx.lineTo(19, 5);
    ctx.stroke();

  } else if (c.typeId === 'archer') {
    ctx.fillStyle = '#3f2e21';
    ctx.fillRect(6, -4, 7, 4);
    ctx.strokeRect(6, -4, 7, 4);

    ctx.fillStyle = '#3f6212';
    ctx.beginPath();
    ctx.roundRect(-10, -7, 17, 8, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#eab68c';
    ctx.beginPath();
    ctx.arc(-13, -3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#365314';
    ctx.beginPath();
    ctx.moveTo(-11, -8);
    ctx.lineTo(-21, -4);
    ctx.lineTo(-11, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(3, 4, 8, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();

  } else if (c.typeId === 'knight') {
    ctx.fillStyle = '#475569';
    ctx.fillRect(7, -5, 8, 4.5);
    ctx.strokeRect(7, -5, 8, 4.5);

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(-11, -8, 19, 9.5, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.roundRect(-19, -8, 9, 8.5, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = teamColor;
    ctx.beginPath();
    ctx.arc(-21, -5, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = teamColor;
    ctx.beginPath();
    ctx.roundRect(-6, -6, 12, 8, 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -2); ctx.lineTo(4, -2);
    ctx.moveTo(0, -5);  ctx.lineTo(0, 1);
    ctx.stroke();

  } else if (c.typeId === 'crossbowman') {
    ctx.fillStyle = teamDark;
    ctx.beginPath();
    ctx.roundRect(-10, -7, 17, 8.5, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(-14, -3, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.fillRect(2, 1, 13, 3.5);
    ctx.strokeRect(2, 1, 13, 3.5);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(13, 2.5, 6, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

  } else if (c.typeId === 'cavalry') {
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.ellipse(-2, -4, 16, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = teamColor;
    ctx.beginPath();
    ctx.roundRect(-11, -8, 18, 7, 3);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.ellipse(15, -2, 7, 4.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(-16, -2, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.lineTo(18, 2);
    ctx.lineTo(18, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

  } else if (c.typeId === 'catapult') {
    ctx.fillStyle = '#78350f';
    ctx.save();
    ctx.rotate(-0.15);
    ctx.fillRect(-18, -6, 34, 5.5);
    ctx.strokeRect(-18, -6, 34, 5.5);
    ctx.restore();

    ctx.fillStyle = '#92400e';
    ctx.save();
    ctx.rotate(0.28);
    ctx.fillRect(-12, -9, 24, 5);
    ctx.strokeRect(-12, -9, 24, 5);
    ctx.restore();

    ctx.fillStyle = teamColor;
    ctx.fillRect(-8, -3, 14, 4);
    ctx.strokeRect(-8, -3, 14, 4);

    [-11, 10].forEach((wx, idx) => {
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(wx, idx === 0 ? 1 : -1, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(wx, idx === 0 ? 1 : -1, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(19, 1, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawBattlementArcher(tx, ty, teamColor, shootAnim = 0) {
  ctx.save();
  ctx.translate(tx, ty);
  ctx.scale(UNIT_SCALE, UNIT_SCALE);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#1b120c';

  ctx.fillStyle = '#3f6212';
  ctx.beginPath();
  ctx.roundRect(-6, -16, 12, 14, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = teamColor;
  ctx.fillRect(-6, -8, 12, 3);

  ctx.fillStyle = '#f7cfa6';
  ctx.beginPath();
  ctx.arc(0, -22, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1b120c';
  ctx.beginPath();
  ctx.arc(2, -22.5, 1.1, 0, Math.PI * 2);
  ctx.arc(4.5, -22.5, 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = teamColor;
  ctx.beginPath();
  ctx.moveTo(-6.5, -21);
  ctx.quadraticCurveTo(0, -32, 6.5, -21);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const pull = shootAnim > 0 ? Math.sin(shootAnim * Math.PI) * 3.5 : 0;
  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(5, -14, 8.5, -Math.PI * 0.44, Math.PI * 0.44);
  ctx.stroke();

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(6.5, -22);
  ctx.lineTo(6.5 - pull, -14);
  ctx.lineTo(6.5, -6);
  ctx.stroke();
  ctx.restore();
}

function drawMultiTowerCastle(x, y, isPlayer, hpRatio) {
  ctx.save();
  ctx.translate(x, y);
  if (!isPlayer) ctx.scale(-1, 1);

  const roofMain = isPlayer ? '#d92626' : '#2563eb';
  const roofLight = isPlayer ? '#ef4444' : '#3b82f6';
  const roofDark = isPlayer ? '#991b1b' : '#1e40af';
  const bannerColor = isPlayer ? '#dc2626' : '#2563eb';
  const archerAnims = isPlayer ? gameState.playerCastleArcherAnim : gameState.enemyCastleArcherAnim;

  ctx.lineWidth = 2.8;
  ctx.strokeStyle = '#1b130e';

  function drawConicalTower(tx, ty, tw, th, roofH, roofCol, hasFlag = true) {
    const grad = ctx.createLinearGradient(tx, ty - th, tx + tw, ty);
    grad.addColorStop(0, '#9ca3af');
    grad.addColorStop(0.5, '#cbd5e1');
    grad.addColorStop(1, '#64748b');
    ctx.fillStyle = grad;
    ctx.fillRect(tx, ty - th, tw, th);
    ctx.strokeRect(tx, ty - th, tw, th);

    ctx.strokeStyle = 'rgba(30, 20, 15, 0.25)';
    ctx.lineWidth = 1.8;
    for (let sy = ty - th + 18; sy < ty - 10; sy += 18) {
      ctx.beginPath();
      ctx.moveTo(tx + 3, sy);
      ctx.lineTo(tx + tw - 3, sy);
      ctx.stroke();
    }
    ctx.strokeStyle = '#1b130e';
    ctx.lineWidth = 2.8;

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(tx + tw * 0.5 - 4, ty - th * 0.65, 8, 16, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(tx - 4, ty - th - 8, tw + 8, 8);
    ctx.strokeRect(tx - 4, ty - th - 8, tw + 8, 8);

    const rGrad = ctx.createLinearGradient(tx - 8, ty - th - roofH, tx + tw + 8, ty - th);
    rGrad.addColorStop(0, roofLight);
    rGrad.addColorStop(0.6, roofCol);
    rGrad.addColorStop(1, roofDark);
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.moveTo(tx - 9, ty - th - 8);
    ctx.lineTo(tx + tw * 0.5, ty - th - 8 - roofH);
    ctx.lineTo(tx + tw + 9, ty - th - 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (hasFlag) {
      const peakX = tx + tw * 0.5;
      const peakY = ty - th - 8 - roofH;
      ctx.beginPath();
      ctx.moveTo(peakX, peakY);
      ctx.lineTo(peakX, peakY - 24);
      ctx.stroke();

      ctx.fillStyle = bannerColor;
      ctx.beginPath();
      ctx.moveTo(peakX, peakY - 24);
      ctx.quadraticCurveTo(peakX + 14, peakY - 28, peakX + 26, peakY - 19);
      ctx.quadraticCurveTo(peakX + 14, peakY - 12, peakX, peakY - 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  drawConicalTower(-108, -4, 42, 128, 46, roofDark, true);
  drawConicalTower(-64, -20, 62, 168, 58, roofMain, true);
  drawConicalTower(-8, -14, 48, 146, 50, roofMain, true);

  const wallGrad = ctx.createLinearGradient(-75, -108, 55, 0);
  wallGrad.addColorStop(0, '#94a3b8');
  wallGrad.addColorStop(0.55, '#cbd5e1');
  wallGrad.addColorStop(1, '#64748b');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(-72, -102, 126, 102);
  ctx.strokeRect(-72, -102, 126, 102);

  drawBattlementArcher(-38, -102, bannerColor, archerAnims[0]);
  drawBattlementArcher(-5,  -106, bannerColor, archerAnims[1]);
  drawBattlementArcher(28,  -102, bannerColor, archerAnims[2]);

  for (let bx = -74; bx <= 42; bx += 19) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(bx, -113, 13, 11);
    ctx.strokeRect(bx, -113, 13, 11);
  }

  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(22, -40, 29, Math.PI, 0, false);
  ctx.lineTo(51, 0);
  ctx.lineTo(-7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#2c190e';
  ctx.beginPath();
  ctx.arc(22, -38, 22, Math.PI, 0, false);
  ctx.lineTo(44, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.2;
  for (let gx = 8; gx <= 36; gx += 7) {
    ctx.beginPath();
    ctx.moveTo(gx, -56);
    ctx.lineTo(gx, 0);
    ctx.stroke();
  }
  for (let gy = -42; gy <= -14; gy += 14) {
    ctx.beginPath();
    ctx.moveTo(2, gy);
    ctx.lineTo(42, gy);
    ctx.stroke();
  }
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = '#1b130e';

  drawConicalTower(-44, 4, 42, 118, 46, roofLight, true);

  [-26, 40].forEach(bx => {
    ctx.fillStyle = bannerColor;
    ctx.beginPath();
    ctx.moveTo(bx - 7, -86);
    ctx.lineTo(bx + 7, -86);
    ctx.lineTo(bx + 7, -50);
    ctx.lineTo(bx, -41);
    ctx.lineTo(bx - 7, -50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(bx - 4.5, -83, 9, 27);
    ctx.strokeStyle = '#1b130e';
    ctx.lineWidth = 2.8;
  });

  if (hpRatio < 0.65) {
    ctx.strokeStyle = '#1f1712';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-58, -88);
    ctx.lineTo(-45, -66);
    ctx.lineTo(-52, -42);
    ctx.stroke();
  }
  ctx.restore();
}

function drawChibiFace(ctx, x, y, r, skinColor = '#f7cfa6', stern = false) {
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
  ctx.beginPath();
  ctx.arc(x - r * 0.1, y + r * 0.18, r * 0.22, 0, Math.PI * 2);
  ctx.fill();

  const ex1 = x + r * 0.18;
  const ex2 = x + r * 0.58;
  const ey = y - r * 0.06;

  ctx.fillStyle = '#1b120c';
  ctx.beginPath();
  ctx.arc(ex1, ey, 1.5, 0, Math.PI * 2);
  ctx.arc(ex2, ey, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ex1 - 0.4, ey - 0.5, 0.55, 0, Math.PI * 2);
  ctx.arc(ex2 - 0.4, ey - 0.5, 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (stern) {
    ctx.moveTo(ex1 - 2, ey - 3.2); ctx.lineTo(ex1 + 1.5, ey - 2.2);
    ctx.moveTo(ex2 + 2, ey - 3.2); ctx.lineTo(ex2 - 1.5, ey - 2.2);
  } else {
    ctx.moveTo(ex1 - 1.8, ey - 2.8); ctx.lineTo(ex1 + 1.8, ey - 2.8);
    ctx.moveTo(ex2 - 1.8, ey - 2.8); ctx.lineTo(ex2 + 1.8, ey - 2.8);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + r * 0.22, y + r * 0.34);
  ctx.lineTo(x + r * 0.48, y + r * 0.34);
  ctx.stroke();

  ctx.strokeStyle = '#1b120c';
  ctx.lineWidth = 2.3;
}

function drawRoundedBoots(ctx, legSwing, bootColor = '#4a2e16', pantsColor = '#5c4028') {
  [-3.8, 3.8].forEach((lx, i) => {
    const swing = i === 0 ? -legSwing : legSwing;
    const footX = lx + swing;
    ctx.strokeStyle = pantsColor;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lx, -13);
    ctx.lineTo(footX, -3);
    ctx.stroke();

    ctx.fillStyle = bootColor;
    ctx.strokeStyle = '#1b120c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(footX - 3, -5, 7.5, 5.5, 2.5);
    ctx.fill();
    ctx.stroke();
  });
  ctx.lineWidth = 2.3;
}

function drawUnitOnCanvas(u) {
  ctx.save();
  ctx.translate(u.x, u.y);

  const dir = u.team === 'player' ? 1 : -1;
  const teamPrimary = u.team === 'player' ? '#dc2626' : '#2563eb';
  const teamDark = u.team === 'player' ? '#991b1b' : '#1e40af';
  const hpBarColor = u.team === 'player' ? '#ef4444' : '#3b82f6';

  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 1.5, u.type.radius * 1.05, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();

  const walkBob = u.state === 'walk' ? Math.abs(Math.sin(u.animPhase)) * 2.5 : 0;
  const lungeX = u.attackAnim > 0 ? Math.sin(u.attackAnim * Math.PI) * 5.5 * dir : 0;

  ctx.save();
  ctx.translate(lungeX, -walkBob);
  // Scale the unit sprite by UNIT_SCALE (0.65 = +30% larger than 0.5!)
  ctx.scale(dir * UNIT_SCALE, UNIT_SCALE);

  if (u.hitFlash > 0) {
    ctx.filter = 'brightness(1.85)';
  }

  ctx.lineWidth = 2.3;
  ctx.strokeStyle = '#1b120c';

  const id = u.type.id;
  const swingAngle = u.attackAnim > 0 ? Math.sin(u.attackAnim * Math.PI) * 0.95 : 0;
  const legSwing = u.state === 'walk' ? Math.sin(u.animPhase) * 4.8 : 0;

  if (id === 'peasant') {
    drawRoundedBoots(ctx, legSwing, '#4a2e16', '#6b4423');

    ctx.fillStyle = '#e5cca9';
    ctx.beginPath();
    ctx.moveTo(-8, -28);
    ctx.lineTo(8, -28);
    ctx.lineTo(10, -11);
    ctx.lineTo(-10, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = teamPrimary;
    ctx.beginPath();
    ctx.moveTo(-5, -28);
    ctx.lineTo(5, -28);
    ctx.lineTo(0, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(-9, -18, 18, 4);
    ctx.strokeRect(-9, -18, 18, 4);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-2, -18, 4, 4);

    drawChibiFace(ctx, 0, -36, 8.8, '#f7cfa6', false);
    ctx.fillStyle = '#7c4722';
    ctx.beginPath();
    ctx.arc(0, -38, 9.2, Math.PI * 0.92, Math.PI * 0.08);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = teamPrimary;
    ctx.fillRect(-8.8, -40, 17.6, 3.2);
    ctx.strokeRect(-8.8, -40, 17.6, 3.2);

    ctx.save();
    ctx.translate(4, -21);
    ctx.rotate(swingAngle * 0.75 + 0.22);
    ctx.strokeStyle = '#6b4226';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-5, 13); ctx.lineTo(14, -15);
    ctx.stroke();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(9, -17); ctx.lineTo(19, -10);
    ctx.moveTo(9.5, -16.5); ctx.lineTo(14.5, -23.5);
    ctx.moveTo(14, -13.5); ctx.lineTo(19, -20.5);
    ctx.moveTo(18.5, -10.5); ctx.lineTo(23.5, -17.5);
    ctx.stroke();
    ctx.fillStyle = '#f7cfa6';
    ctx.strokeStyle = '#1b120c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(3, 1, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

  } else if (id === 'archer') {
    drawRoundedBoots(ctx, legSwing, '#3f2e21', '#4d7c0f');

    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.roundRect(-12, -32, 5.5, 14, 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, -32); ctx.lineTo(-13, -36);
    ctx.moveTo(-8.5, -32); ctx.lineTo(-10, -36);
    ctx.stroke();
    ctx.strokeStyle = '#1b120c';
    ctx.lineWidth = 2.3;

    ctx.fillStyle = '#3f6212';
    ctx.beginPath();
    ctx.moveTo(-8, -28);
    ctx.lineTo(8, -28);
    ctx.lineTo(9.5, -11);
    ctx.lineTo(-9.5, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = teamPrimary;
    ctx.fillRect(-8.5, -17, 17, 3.5);
    ctx.strokeRect(-8.5, -17, 17, 3.5);

    drawChibiFace(ctx, 0, -36, 8.5, '#f7cfa6', true);
    ctx.fillStyle = '#365314';
    ctx.beginPath();
    ctx.moveTo(-9, -35);
    ctx.quadraticCurveTo(-2, -49, 9, -35);
    ctx.lineTo(0, -41);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = teamPrimary;
    ctx.beginPath();
    ctx.moveTo(-3, -43);
    ctx.quadraticCurveTo(-11, -50, -13, -42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const pull = u.attackAnim > 0 ? Math.sin(u.attackAnim * Math.PI) * 5 : 0;
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(6.5, -21, 12, -Math.PI * 0.44, Math.PI * 0.44);
    ctx.stroke();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(8.5, -32.5);
    ctx.lineTo(8.5 - pull, -21);
    ctx.lineTo(8.5, -9.5);
    ctx.stroke();

  } else if (id === 'knight') {
    drawRoundedBoots(ctx, legSwing, '#475569', '#64748b');

    const plateGrad = ctx.createLinearGradient(-10, -31, 10, -11);
    plateGrad.addColorStop(0, '#f1f5f9');
    plateGrad.addColorStop(0.6, '#cbd5e1');
    plateGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = plateGrad;
    ctx.beginPath();
    ctx.roundRect(-10, -31, 20, 20, 4.5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = teamPrimary;
    ctx.fillRect(-3.5, -30, 7, 18);
    ctx.strokeRect(-3.5, -30, 7, 18);

    ctx.fillStyle = teamPrimary;
    ctx.beginPath();
    ctx.moveTo(-1, -46);
    ctx.quadraticCurveTo(-12, -53, -15, -40);
    ctx.quadraticCurveTo(-8, -39, -1, -43);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(-8.5, -46, 17, 16, 5.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-6.5, -40, 14, 8);
    ctx.strokeRect(-6.5, -40, 14, 8);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, -38.5, 9, 2.5);

    ctx.save();
    ctx.translate(5, -24);
    ctx.rotate(swingAngle - 0.18);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(22, -20);
    ctx.lineTo(25, -18);
    ctx.lineTo(3, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(-2, -5); ctx.lineTo(6, 3);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = teamPrimary;
    ctx.beginPath();
    ctx.moveTo(2, -28);
    ctx.lineTo(16, -28);
    ctx.lineTo(16, -16);
    ctx.lineTo(9, -7);
    ctx.lineTo(2, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(9, -25); ctx.lineTo(9, -11);
    ctx.moveTo(5, -19); ctx.lineTo(13, -19);
    ctx.stroke();

  } else if (id === 'crossbowman') {
    drawRoundedBoots(ctx, legSwing, '#334155', '#475569');

    ctx.fillStyle = teamDark;
    ctx.beginPath();
    ctx.roundRect(-9, -29, 18, 18, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.fillRect(-7.5, -28, 15, 11);
    ctx.strokeRect(-7.5, -28, 15, 11);

    drawChibiFace(ctx, 0, -37, 8.5, '#f7cfa6', true);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(-12, -38);
    ctx.quadraticCurveTo(0, -49, 12, -38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.fillRect(3, -24, 17, 4.5);
    ctx.strokeRect(3, -24, 17, 4.5);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(17, -22, 8.5, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

  } else if (id === 'cavalry') {
    const gallop = u.state === 'walk' ? Math.sin(u.animPhase * 1.3) * 5.5 : 0;
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-13, -13); ctx.lineTo(-16 - gallop, 0);
    ctx.moveTo(-7, -13); ctx.lineTo(-5 + gallop, 0);
    ctx.moveTo(8, -13); ctx.lineTo(7 - gallop, 0);
    ctx.moveTo(14, -13); ctx.lineTo(17 + gallop, 0);
    ctx.stroke();

    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.moveTo(-18, -25);
    ctx.quadraticCurveTo(-27, -22, -25, -11);
    ctx.quadraticCurveTo(-19, -15, -18, -21);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.roundRect(-19, -28, 36, 16, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = teamPrimary;
    ctx.beginPath();
    ctx.roundRect(-16, -24, 30, 11, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.moveTo(10, -24);
    ctx.lineTo(19, -42);
    ctx.lineTo(29, -35);
    ctx.lineTo(18, -19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(19, -42);
    ctx.lineTo(29, -35);
    ctx.lineTo(25, -32);
    ctx.lineTo(18, -38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(-6.5, -44, 13.5, 18, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = teamPrimary;
    ctx.beginPath();
    ctx.moveTo(-1, -57);
    ctx.quadraticCurveTo(-11, -62, -13, -52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(-7, -57, 14, 13, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-1, -51, 7, 2.2);

    ctx.save();
    ctx.translate(2, -34);
    ctx.rotate(swingAngle * 0.3);
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(-15, -2.5);
    ctx.lineTo(32, -5.5);
    ctx.lineTo(32, -2);
    ctx.lineTo(-15, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(32, -6.5);
    ctx.lineTo(40, -3.8);
    ctx.lineTo(32, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

  } else if (id === 'catapult') {
    ctx.save();
    const armAngle = u.attackAnim > 0 ? Math.sin(u.attackAnim * Math.PI) * 1.05 : -0.45;
    ctx.save();
    ctx.translate(0, -19);
    ctx.rotate(armAngle);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 5.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-20, -18);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(-21, -20, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(-20, -8);
    ctx.lineTo(20, -8);
    ctx.lineTo(9, -29);
    ctx.lineTo(-9, -29);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#78350f';
    ctx.fillRect(-23, -13, 46, 6.5);
    ctx.strokeRect(-23, -13, 46, 6.5);

    ctx.fillStyle = teamPrimary;
    ctx.fillRect(-14, -19, 28, 4.5);
    ctx.strokeRect(-14, -19, 28, 4.5);

    [-13, 13].forEach(wx => {
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(wx, -7, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(wx, -7, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  ctx.restore();

  // ALWAYS-ON OVERHEAD HEALTH BAR (Scaled proportionally for UNIT_SCALE = 0.65)
  const bw = 22;
  const bh = 4;
  const by = (id === 'cavalry' ? -66 : (id === 'knight' ? -56 : -50)) * UNIT_SCALE - 4;
  const ratio = Math.max(0, Math.min(1, u.hp / u.maxHp));

  ctx.fillStyle = 'rgba(15, 10, 8, 0.85)';
  ctx.beginPath();
  ctx.roundRect(-bw / 2 - 1, by - 1, bw + 2, bh + 2, 2);
  ctx.fill();

  ctx.fillStyle = hpBarColor;
  ctx.beginPath();
  ctx.roundRect(-bw / 2, by, bw * ratio, bh, 1);
  ctx.fill();

  ctx.restore();
}

function drawClashStarburst(cl) {
  ctx.save();
  ctx.translate(cl.x, cl.y);
  const progress = 1 - cl.life / cl.maxLife;
  const sc = cl.scale * (0.7 + progress * 0.5);
  ctx.scale(sc, sc);
  ctx.globalAlpha = Math.max(0, cl.life / cl.maxLife);

  ctx.fillStyle = '#f97316';
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  const spikes = 8;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 18 : 7;
    const a = (i * Math.PI) / spikes;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 10 : 4;
    const a = (i * Math.PI) / spikes;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderScene(dt) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 1. Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight * 0.52);
  skyGrad.addColorStop(0, '#569ef8');
  skyGrad.addColorStop(1, '#c3e6fd');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. Clouds
  clouds.forEach(c => {
    c.x += c.spd * dt;
    if (c.x > 1.15) c.x = -0.15;
    drawCloud(c.x * canvasWidth, c.y * canvasHeight, c.s);
  });

  // 3. Distant Hills
  ctx.fillStyle = '#70ad78';
  ctx.beginPath();
  ctx.moveTo(0, canvasHeight * 0.44);
  ctx.quadraticCurveTo(canvasWidth * 0.24, canvasHeight * 0.27, canvasWidth * 0.52, canvasHeight * 0.41);
  ctx.quadraticCurveTo(canvasWidth * 0.78, canvasHeight * 0.26, canvasWidth, canvasHeight * 0.42);
  ctx.lineTo(canvasWidth, canvasHeight);
  ctx.lineTo(0, canvasHeight);
  ctx.closePath();
  ctx.fill();

  // Midground Meadow
  const meadowGrad = ctx.createLinearGradient(0, canvasHeight * 0.35, 0, canvasHeight);
  meadowGrad.addColorStop(0, '#68c747');
  meadowGrad.addColorStop(0.55, '#4ea630');
  meadowGrad.addColorStop(1, '#3b8223');
  ctx.fillStyle = meadowGrad;
  ctx.beginPath();
  ctx.moveTo(0, canvasHeight * 0.41);
  ctx.quadraticCurveTo(canvasWidth * 0.30, canvasHeight * 0.33, canvasWidth * 0.60, canvasHeight * 0.43);
  ctx.quadraticCurveTo(canvasWidth * 0.84, canvasHeight * 0.37, canvasWidth, canvasHeight * 0.41);
  ctx.lineTo(canvasWidth, canvasHeight);
  ctx.lineTo(0, canvasHeight);
  ctx.closePath();
  ctx.fill();

  const { leftCastleX, rightCastleX, roadCenterY } = getCastlePositions();

  // 4. Horizon Trees
  drawTree(canvasWidth * 0.23, roadCenterY - 96, 0.88, false);
  drawTree(canvasWidth * 0.29, roadCenterY - 104, 0.98, true);
  drawTree(canvasWidth * 0.39, roadCenterY - 110, 0.72, false);
  drawTree(canvasWidth * 0.61, roadCenterY - 108, 0.76, false);
  drawTree(canvasWidth * 0.70, roadCenterY - 98, 0.92, false);
  drawTree(canvasWidth * 0.76, roadCenterY - 104, 0.86, true);

  // 5. SOLID ONE-PIECE SANDY BATTLE ROAD
  ctx.save();
  const roadGrad = ctx.createLinearGradient(0, roadCenterY - ROAD_HALF_WIDTH, 0, roadCenterY + ROAD_HALF_WIDTH);
  roadGrad.addColorStop(0, '#deb87c');
  roadGrad.addColorStop(0.5, '#d6af72');
  roadGrad.addColorStop(1, '#cfa465');
  ctx.fillStyle = roadGrad;
  ctx.strokeStyle = '#9e7944';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(leftCastleX, roadCenterY - ROAD_HALF_WIDTH);
  ctx.bezierCurveTo(
    canvasWidth * 0.35, roadCenterY - ROAD_HALF_WIDTH - 10,
    canvasWidth * 0.65, roadCenterY - ROAD_HALF_WIDTH + 10,
    rightCastleX, roadCenterY - ROAD_HALF_WIDTH
  );
  ctx.lineTo(rightCastleX, roadCenterY + ROAD_HALF_WIDTH);
  ctx.bezierCurveTo(
    canvasWidth * 0.65, roadCenterY + ROAD_HALF_WIDTH + 10,
    canvasWidth * 0.35, roadCenterY + ROAD_HALF_WIDTH - 10,
    leftCastleX, roadCenterY + ROAD_HALF_WIDTH
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 6. Blood Puddles & Unique Corpses lying on the road (remain for 15 seconds)
  gameState.corpses.forEach(c => drawCorpseOnCanvas(c));

  // 7. Multi-Tower Castles with 3 Archers on each wall
  drawMultiTowerCastle(leftCastleX, roadCenterY + 18, true, gameState.playerCastleHp / gameState.playerCastleMaxHp);
  drawMultiTowerCastle(rightCastleX, roadCenterY + 18, false, gameState.enemyCastleHp / gameState.enemyCastleMaxHp);

  // 8. Living Units sorted by Y
  const sortedUnits = [...gameState.units].sort((a, b) => a.y - b.y);
  sortedUnits.forEach(u => drawUnitOnCanvas(u));

  // 9. Clash Starbursts
  gameState.clashes.forEach(cl => drawClashStarburst(cl));

  // 10. Projectiles (Oriented along their flight trajectory straight into the target model!)
  gameState.projectiles.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.projType === 'boulder') {
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      const dx = p.x - (p.prevX ?? p.startX);
      const dy = p.y - (p.prevY ?? p.startY);
      const angle = (Math.abs(dx) + Math.abs(dy) > 0.01)
        ? Math.atan2(dy, dx)
        : (p.team === 'player' ? 0 : Math.PI);
      ctx.rotate(angle);

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(4.5, -2.3);
      ctx.lineTo(4.5, 2.3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });

  // 11. Particles
  gameState.particles.forEach(pt => {
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // 12. Foreground framing trees
  drawTree(canvasWidth * 0.06, canvasHeight * 0.95, 1.08, true);
  drawTree(canvasWidth * 0.94, canvasHeight * 0.94, 1.08, false);

  // 13. Floating Combat/Upgrade Texts
  gameState.floatingTexts.forEach(ft => {
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.font = '900 13px Rubik, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#1b1109';
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  });
}

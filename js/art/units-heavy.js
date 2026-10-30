// ============================================================================
// HEAVY UNITS ART: mounted knight (horse + lance) and catapult.
// ============================================================================
Art.units = Art.units || {};

(function () {
  const A = Art;
  const { INK, clamp, lerp, ease, easeOut } = A;
  const I = () => A.units.infantry;

  // Draw several overlapping shapes as one silhouette: ink strokes first, fills on top.
  function union(g, shapes, fill, ol = 2.4) {
    g.lineJoin = 'round';
    shapes.forEach(s => { g.beginPath(); s(g); g.lineWidth = ol * 2; g.strokeStyle = INK; g.stroke(); });
    shapes.forEach(s => { g.beginPath(); s(g); g.fillStyle = fill; g.fill(); });
  }

  // ---- horse parts -----------------------------------------------------------
  function horseLeg(g, x, y, phase, front, moving, col, hoof) {
    const sw = moving ? Math.sin(phase) : (front ? 0.12 : -0.1);
    const lift = moving ? Math.max(0, Math.cos(phase)) : 0;
    const a1 = sw * 0.75;
    const kx = x + Math.sin(a1) * 12.5, ky = y + Math.cos(a1) * 12.5;
    const a2 = a1 - (front ? lift * 1.25 : lift * 0.7) + (front ? 0.05 : 0.15);
    let fx = kx + Math.sin(a2) * 13.5, fy = ky + Math.cos(a2) * 13.5;
    if (fy > 0) fy = 0;
    A.cap(g, x, y, kx, ky, 6.4, col, 2.2);
    A.cap(g, kx, ky, fx, fy - 2, 4.6, col, 2.2);
    A.circ(g, kx, ky, 3.7, col, 0);
    // hoof
    g.beginPath();
    g.moveTo(fx - 3.6, fy - 4.6);
    g.lineTo(fx + 3.6, fy - 4.6);
    g.lineTo(fx + 4.6, fy);
    g.lineTo(fx - 4.2, fy);
    g.closePath();
    A.fillStroke(g, hoof, 2);
  }

  function cavalry(g, p, T) {
    const walking = p.walk > 0.5;
    const s = Math.sin(p.ph), c = Math.cos(p.ph);
    const sq = p.strike >= 0 ? Math.sin(p.strike * Math.PI) : 0;
    const bob = walking ? Math.abs(s) * 3.4 : Math.sin(p.t * 2.2 + p.seed) * 0.7;
    const pitch = walking ? s * 0.035 : -sq * 0.05;
    const horse = A.pal('#b0703d'), mane = '#3d2316', hoof = '#4a3426';

    // far legs (darker)
    const far = A.shade(horse.base, 0.25);
    horseLeg(g, 15, -25, p.ph + 0.5, true, walking, far, hoof);
    horseLeg(g, -15, -25, p.ph + Math.PI * 0.6, false, walking, far, hoof);

    g.save();
    g.translate(sq * 4, -bob);
    g.rotate(pitch);

    // tail
    const wag = Math.sin(p.t * 7 + p.seed) * 3 + (walking ? s * 5 : 0);
    g.beginPath();
    g.moveTo(-23, -42);
    g.bezierCurveTo(-34, -44 - wag, -40, -34, -35 - wag, -18);
    g.bezierCurveTo(-31, -28, -29, -34, -21, -34);
    g.closePath();
    A.fillStroke(g, mane, 2.2);

    // barrel + chest + rump as one silhouette
    union(g, [
      g => g.ellipse(0, -34, 25, 13.5, 0, 0, 6.3),
      g => g.ellipse(16, -37, 11, 13, 0, 0, 6.3),
      g => g.ellipse(-17, -36, 11, 13.5, 0, 0, 6.3)
    ], horse.base);
    g.save();
    g.beginPath(); g.ellipse(0, -34, 25, 13.5, 0, 0, 6.3); g.clip();
    g.fillStyle = 'rgba(43,18,54,0.3)';
    g.beginPath(); g.ellipse(-2, -22, 30, 9, 0, 0, 6.3); g.fill();
    g.restore();
    A.gloss(g, 6, -43, 9, 2.4, -0.05, 0.4);

    // neck + head
    A.cap(g, 17, -40, 33, -60, 15, horse.base, 2.4);
    A.cap(g, 17, -36, 31, -54, 6, A.shade(horse.base, 0.18), 0);
    g.beginPath();
    g.ellipse(41, -66, 11, 7.4, 0.75, 0, 6.3);
    A.fillStroke(g, horse.base, 2.4);
    g.beginPath();
    g.ellipse(49, -60.5, 6.4, 5.6, 0.5, 0, 6.3);
    A.fillStroke(g, A.tint(horse.base, 0.12), 2.2);
    // blaze + nostril + eye
    g.beginPath(); g.moveTo(37, -72); g.quadraticCurveTo(46, -66, 50, -60); g.lineTo(47, -58); g.quadraticCurveTo(42, -64, 35, -69); g.closePath();
    g.fillStyle = '#fff6e6'; g.fill();
    A.circ(g, 52, -60, 1.1, INK, 0);
    g.fillStyle = INK; g.beginPath(); g.ellipse(43, -68, 1.8, 2.5, 0.3, 0, 6.3); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(43.5, -69, 0.7, 0, 6.3); g.fill();
    // ears
    A.poly(g, [34, -73, 33, -83, 38.5, -74], horse.base, 1.9);
    A.poly(g, [38, -75, 40, -84, 43, -75], A.shade(horse.base, 0.1), 1.9);
    // bridle in team colour
    g.strokeStyle = T.lo; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(38, -72); g.quadraticCurveTo(43, -63, 47, -64); g.moveTo(45, -57); g.lineTo(37, -62); g.stroke();
    // mane
    g.beginPath();
    g.moveTo(14, -52);
    const mw = Math.sin(p.t * 6 + p.seed) * 1.2 + (walking ? s * 1.6 : 0);
    g.quadraticCurveTo(8 - mw, -60, 14 - mw, -66);
    g.quadraticCurveTo(14 - mw, -73, 22, -78 - mw * 0.4);
    g.quadraticCurveTo(26, -80, 32, -79);
    g.lineTo(29, -70);
    g.quadraticCurveTo(24, -64, 21, -56);
    g.closePath();
    A.fillStroke(g, mane, 2.2);
    g.strokeStyle = 'rgba(255,220,170,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(15, -62); g.quadraticCurveTo(19, -70, 28, -76); g.stroke();

    // caparison (team cloth) with golden trim and cross
    const flap = walking ? Math.sin(p.ph + 1) * 1.4 : Math.sin(p.t * 3) * 0.4;
    g.beginPath();
    g.moveTo(-17, -46);
    g.lineTo(13, -46);
    g.lineTo(14 + flap, -22);
    g.lineTo(9.5 + flap, -25);
    g.lineTo(4.6 + flap, -21.5);
    g.lineTo(0, -25);
    g.lineTo(-4.6 + flap, -21.5);
    g.lineTo(-9.5 + flap, -25);
    g.lineTo(-18, -22);
    g.closePath();
    A.fillStroke(g, T.base, 2.3);
    g.save(); g.clip();
    g.fillStyle = T.hi; g.globalAlpha = 0.4; g.fillRect(2, -48, 16, 30);
    g.globalAlpha = 0.3; g.fillStyle = '#2b1236'; g.fillRect(-20, -48, 12, 30);
    g.restore();
    g.strokeStyle = '#ffd447'; g.lineWidth = 2; g.beginPath(); g.moveTo(-15, -42); g.lineTo(11, -42); g.lineTo(12 + flap, -27); g.stroke();
    g.fillStyle = '#ffffff'; g.strokeStyle = INK; g.lineWidth = 1.4;
    g.beginPath(); g.rect(-2.2, -41, 4.4, 14); g.fill(); g.stroke();
    g.beginPath(); g.rect(-7, -36, 14, 4.4); g.fill(); g.stroke();
    // saddle front
    A.rr(g, -9, -49, 14, 5, 2.5, '#6a3f20', 1.9);

    g.restore();

    // near legs
    g.save();
    g.translate(0, -bob * 0.3);
    horseLeg(g, 14, -25, p.ph, true, walking, horse.base, hoof);
    horseLeg(g, -16, -25, p.ph + Math.PI * 0.1 + Math.PI, false, walking, horse.base, hoof);
    g.restore();

    // ---- rider ---------------------------------------------------------------
    g.save();
    g.translate(sq * 4.5, -bob);
    g.rotate(pitch * 0.7 + sq * 0.12 - p.wind * 0.08);
    g.translate(-3, -46);   // saddle point

    // lance geometry
    let ang, lx, ly;
    if (p.strike >= 0) {
      const k = 1 - ease(Math.min(1, p.strike * 1.4));
      ang = lerp(-0.34, -0.06, k); lx = lerp(8, 17, k); ly = lerp(-10, -7, k);
    } else {
      ang = lerp(-0.34, -0.72, p.wind); lx = lerp(8, 2, p.wind); ly = lerp(-10, -14, p.wind);
    }
    const lanceWobble = walking ? s * 0.03 : 0;
    ang += lanceWobble;

    // far arm
    A.cap(g, 1, -18, lx + 3, ly - 1, 5.4, '#8f9eb3', 2);

    // rider's leg with stirrup (in front of the caparison)
    A.cap(g, -1, -2, 6, 12, 6.6, '#9aa9bd', 2);
    g.beginPath(); g.moveTo(1, 11.5); g.lineTo(12, 11.5); g.quadraticCurveTo(14, 15, 11, 17); g.lineTo(1, 17); g.closePath();
    A.fillStroke(g, '#3a2f3d', 2);

    // torso: steel + team tabard
    I().torso(g, 9, 8.2, 20, '#b9c6d8', 2);
    g.beginPath();
    g.moveTo(-6, -17); g.lineTo(6, -17); g.lineTo(7.4, 3); g.lineTo(-7.4, 3); g.closePath();
    A.fillStroke(g, T.base, 2);
    g.fillStyle = T.hi; g.globalAlpha = 0.4; g.fillRect(0.5, -17, 7, 20); g.globalAlpha = 1;
    g.strokeStyle = '#ffd447'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-3.4, -12); g.lineTo(0, -8.6); g.lineTo(3.4, -12); g.stroke();
    A.rr(g, -8.6, -3, 17.2, 3.4, 1.3, '#6a4426', 1.5);
    A.circ(g, -7.4, -16, 4.9, '#c9d4e2', 2);

    // lance (long, with pennant) held under the arm
    g.save();
    g.translate(lx, ly);
    g.rotate(ang);
    A.cap(g, -26, 0, 66, 0, 3.4, '#b5773a', 2);
    g.strokeStyle = 'rgba(255,230,170,0.55)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-22, -1); g.lineTo(60, -1); g.stroke();
    A.poly(g, [66, -3.4, 82, 0, 66, 3.4], '#e7eef6', 1.9);
    A.cap(g, 5.5, -6, 5.5, 6, 2.4, '#ffd447', 1.4);   // vamplate
    // pennant
    const fl = Math.sin(p.t * 11 + p.seed) * 2.6 + (walking ? s * 2.2 : 0);
    g.beginPath();
    g.moveTo(48, -1.6);
    g.quadraticCurveTo(38 - fl, -9, 22 - fl * 1.6, -5 + fl * 0.6);
    g.lineTo(26 - fl * 1.4, 2.4);
    g.quadraticCurveTo(38 - fl, -2.6, 48, 1.6);
    g.closePath();
    A.fillStroke(g, T.base, 1.8);
    g.restore();

    // near arm with shield
    const shx = 5 + (p.strike >= 0 ? sq * 2 : 0);
    A.cap(g, -3, -16.6, shx + 2, -4.5, 5.8, '#aab7ca', 2);
    I().kiteShield(g, shx + 4, -3, T, 0.9);
    A.circ(g, shx + 1, -6.4, 3.5, '#b9c6d8', 1.8);
    // swoosh for the thrust
    if (p.strike >= 0 && p.strike < 0.4) {
      g.save(); g.globalAlpha = 0.7 * (1 - p.strike / 0.4);
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.lineCap = 'round';
      [-5, 0, 5].forEach((o, i) => { g.beginPath(); g.moveTo(lx + 38 - i * 6, ly + o * 1.1 - 4); g.lineTo(lx + 84, ly + o * 1.1 - 2); g.stroke(); });
      g.restore();
    }

    // head with great helm + plume
    const hx = 0.5, hy = -31, r = 10.4;
    const wave = Math.sin(p.t * 6 + p.seed) * 1.5 + (walking ? s * 3.4 : 1);
    g.beginPath();
    g.moveTo(hx - 1, hy - r - 1);
    g.bezierCurveTo(hx - 8, hy - r - 11, hx - 21 - wave, hy - r - 6 + wave * 0.3, hx - 26 - wave, hy - 4 + wave * 0.5);
    g.bezierCurveTo(hx - 18 - wave, hy - r - 2, hx - 10, hy - r + 3, hx - 6, hy - r + 5);
    g.closePath();
    A.fillStroke(g, T.base, 2.1);
    g.strokeStyle = T.hi; g.lineWidth = 1.2; g.beginPath(); g.moveTo(hx - 3, hy - r - 3); g.quadraticCurveTo(hx - 13, hy - r - 6, hx - 21 - wave, hy - 4); g.stroke();
    A.circ(g, hx, hy, r + 1.2, '#c4cfdf', 2.4);
    g.beginPath(); g.roundRect(hx + 0.4, hy - 3.2, 11.4, 9.8, 3); g.fillStyle = '#f7c9a1'; g.fill(); A.stroke(g, 1.9);
    I().eye(g, hx + 4.2, hy + 0.5, r); I().eye(g, hx + 8.4, hy + 0.5, r * 0.92);
    g.strokeStyle = INK; g.lineWidth = 1.8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx + 2.2, hy - 2.8); g.lineTo(hx + 5.8, hy - 1.6); g.moveTo(hx + 6.9, hy - 1.6); g.lineTo(hx + 10.8, hy - 2.8); g.stroke();
    g.beginPath(); g.moveTo(hx + 5.4, hy + 4.4); g.quadraticCurveTo(hx + 7.2, hy + 5.4, hx + 9, hy + 4.3); A.stroke(g, 1.4);
    g.beginPath(); g.moveTo(hx - 1, hy - r - 1); g.quadraticCurveTo(hx + 8, hy - r + 1, hx + 11.6, hy - 4); A.stroke(g, 1.6, '#6f7d92');
    A.gloss(g, hx - 3, hy - 7, 4.4, 1.9, -0.4, 0.7);

    g.restore();
  }

  // ===========================================================================
  // CATAPULT: wooden throwing machine with a spoon arm and spoked wheels
  // ===========================================================================
  function wheel(g, x, y, r, rot, T) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    A.circ(g, 0, 0, r, '#6f4524', 2.6);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      A.cap(g, 0, 0, Math.cos(a) * (r - 2), Math.sin(a) * (r - 2), 2.4, '#b57a3c', 1.5);
    }
    g.beginPath(); g.arc(0, 0, r - 1.6, 0, 6.3); g.strokeStyle = '#8a5a2e'; g.lineWidth = 2.6; g.stroke();
    // iron studs
    g.fillStyle = '#c7d0dc';
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g.beginPath(); g.arc(Math.cos(a) * (r - 1.4), Math.sin(a) * (r - 1.4), 1, 0, 6.3); g.fill(); }
    A.circ(g, 0, 0, 3.8, T.base, 1.8);
    A.circ(g, 0, 0, 1.4, '#ffd447', 0);
    g.restore();
  }

  function catapult(g, p, T) {
    const walking = p.walk > 0.5;
    const sq = p.strike >= 0 ? Math.sin(p.strike * Math.PI) : 0;
    const jolt = p.strike >= 0 ? Math.sin(Math.min(1, p.strike * 3) * Math.PI) : 0;
    const bump = walking ? Math.abs(Math.sin(p.ph * 1.5)) * 1.3 : 0;
    const dist = p.dist != null ? p.dist : p.ph * 4;
    const R = 13;

    // arm angle: cocked back/down (2.75) -> swings over the top -> stops forward (5.5)
    const A0 = 2.75, A1 = 5.5;
    let alpha, loaded;
    if (p.strike >= 0) {
      const k = clamp(p.strike / 0.34);
      alpha = lerp(A0, A1, easeOut(k)) - (p.strike > 0.3 ? Math.sin((p.strike - 0.3) * 18) * 0.07 * (1 - p.strike) : 0);
      loaded = false;
    } else if (walking) {
      alpha = A0; loaded = true;
    } else {
      alpha = lerp(A1, A0, ease(p.wind));
      loaded = p.wind > 0.88;
    }

    g.save();
    g.translate(-jolt * 3, -bump);
    g.rotate(-jolt * 0.025);

    const P = { x: 2, y: -37 };

    // chassis beams
    A.rr(g, -32, -24, 66, 7, 2.5, '#8a5a2e', 2.2);
    A.rr(g, -28, -18, 58, 4.5, 2, '#6f4524', 1.8);
    // team-coloured stripe
    g.fillStyle = T.base; g.fillRect(-26, -22.2, 50, 2.6);
    g.fillStyle = T.hi; g.fillRect(-26, -22.2, 50, 0.9);
    // front bumper
    A.rr(g, 28, -28, 8, 14, 3, '#a8703a', 2);

    wheel(g, -17, -12, R, dist / R, T);
    wheel(g, 17, -12, R, dist / R, T);

    // A-frame (far post)
    A.cap(g, -9, -22, P.x, P.y, 5.4, '#7a4c27', 2);
    // winch at the back
    const wr = (p.strike >= 0 ? 0 : p.wind) * 9;
    A.rr(g, -30, -33, 5.5, 14, 2, '#6f4524', 1.8);
    g.save(); g.translate(-27.2, -26); g.rotate(wr);
    A.cap(g, 0, -7, 0, 7, 2.4, '#d7b787', 1.4); A.cap(g, -7, 0, 7, 0, 2.4, '#d7b787', 1.4);
    g.restore();

    // arm (spoon end towards the enemy)
    const L = 40;
    const tipX = P.x + Math.cos(alpha) * L, tipY = P.y + Math.sin(alpha) * L;
    const bkX = P.x - Math.cos(alpha) * 13, bkY = P.y - Math.sin(alpha) * 13;
    // rope from the arm tip down to the winch while cocking
    if (p.strike < 0) {
      g.strokeStyle = '#e8d8b0'; g.lineWidth = 1.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(-27, -27); g.stroke();
    }
    // counterweight end
    A.cap(g, P.x, P.y, bkX, bkY, 5, '#9a6234', 2);
    A.rr(g, bkX - 6, bkY - 5, 12, 10, 3, '#8795ab', 2);
    // long arm
    A.cap(g, P.x, P.y, tipX, tipY, 5.4, '#b57a3c', 2.1);
    g.strokeStyle = 'rgba(255,230,170,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(P.x, P.y - 1.6); g.lineTo(tipX, tipY - 1.6); g.stroke();
    // spoon / bucket
    g.save();
    g.translate(tipX, tipY);
    g.rotate(alpha + Math.PI * 0.5 * 0);
    g.beginPath();
    g.moveTo(-3, -7.5);
    g.quadraticCurveTo(10, -9, 11, 0);
    g.quadraticCurveTo(10, 9, -3, 7.5);
    g.closePath();
    A.fillStroke(g, '#8a5a2e', 2.2);
    g.restore();
    // boulder
    if (loaded) {
      const bx = tipX + Math.cos(alpha) * 3.5 - Math.sin(alpha) * 4.5 * (Math.cos(alpha) < 0 ? -1 : 1) * 0;
      const by = tipY + Math.sin(alpha) * 3.5 - 4.6;
      A.circ(g, bx, by, 7.4, '#8d98a8', 2.2);
      A.gloss(g, bx - 2.4, by - 2.6, 2.6, 1.6, -0.5, 0.6);
      g.fillStyle = 'rgba(43,18,54,0.3)'; g.beginPath(); g.arc(bx + 2, by + 2.4, 4.2, 0, 3.1); g.fill();
    }

    // A-frame (near post) + axle cap
    A.cap(g, 14, -22, P.x, P.y, 5.8, '#a8703a', 2);
    A.cap(g, 14, -22, 6, -31, 1.4, 'rgba(255,230,170,0.5)', 0);
    A.cap(g, -3, -30, 11, -30, 3.6, '#8a5a2e', 1.8);
    A.circ(g, P.x, P.y, 4.2, '#cfd8e5', 2);
    A.circ(g, P.x, P.y, 1.5, INK, 0);

    // team banner on the frame
    const fl = Math.sin(p.t * 8 + p.seed) * 2 + (walking ? Math.sin(p.ph) * 1.5 : 0);
    A.cap(g, P.x, P.y - 2, P.x, P.y - 19, 1.6, '#7a4c27', 1.5);
    g.beginPath();
    g.moveTo(P.x, P.y - 19);
    g.quadraticCurveTo(P.x - 6, P.y - 21 + fl * 0.4, P.x - 14 - fl, P.y - 17);
    g.lineTo(P.x - 11 - fl, P.y - 13);
    g.quadraticCurveTo(P.x - 6, P.y - 14, P.x, P.y - 11);
    g.closePath();
    A.fillStroke(g, T.base, 1.8);

    g.restore();
  }

  Art.units.heavy = { cavalry, catapult };
})();

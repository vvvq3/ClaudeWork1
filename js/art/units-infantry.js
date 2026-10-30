// ============================================================================
// INFANTRY ART: peasant, knight, archer, crossbowman.
// Skeleton-style procedural animation. Every figure is drawn facing +X with
// its feet at (0,0); y grows downwards, so the body is built with negative y.
//
// `pose` = { ph, walk, wind, strike, t, seed }
//   ph      walk-cycle phase (radians)
//   walk    1 while marching, 0 while fighting
//   wind    0..1 wind-up / bow draw amount just before the next attack
//   strike  0..1 progress of the attack follow-through, -1 when not striking
// ============================================================================
Art.units = Art.units || {};

(function () {
  const A = Art;
  const { INK, clamp, lerp, ease, easeOut } = A;
  const SKIN = '#f7c9a1';

  // ---- shared parts -------------------------------------------------------
  function stance(p, o) {
    const walking = p.walk > 0.5;
    const s = Math.sin(p.ph), c = Math.cos(p.ph);
    const bob = walking ? Math.abs(s) * o.bob : Math.sin(p.t * 2.4 + p.seed) * 0.55;
    const sq = p.strike >= 0 ? Math.sin(p.strike * Math.PI) : 0;
    const lunge = sq * o.lunge;
    const hipY = -o.leg - bob;
    let fN, fF;
    if (walking) {
      fN = { x: s * o.stride, y: -Math.max(0, c) * o.lift };
      fF = { x: -s * o.stride, y: -Math.max(0, -c) * o.lift };
    } else {
      fN = { x: o.stand + lunge * 0.7, y: 0 };
      fF = { x: -o.stand, y: 0 };
    }
    return { walking, bob, hipY, fN, fF, sq, lunge };
  }

  function legs(g, st, o) {
    const hy = st.hipY + 3;
    // far leg (darker) then near leg
    [[st.fF, -2.2, A.shade(o.pants, 0.22)], [st.fN, 2.6, o.pants]].forEach(([f, hx, col]) => {
      A.cap(g, hx, hy, f.x, f.y - 3.2, o.w, col, 2.2);
      // boot
      const bx = f.x + 1.8, by = f.y - 2.6;
      g.beginPath();
      g.moveTo(bx - 4.6, by - 3.4);
      g.lineTo(bx + 2.2, by - 3.4);
      g.quadraticCurveTo(bx + 7.2, by - 1.6, bx + 6.8, by + 2.6);
      g.lineTo(bx - 4.8, by + 2.6);
      g.closePath();
      A.fillStroke(g, f === st.fN ? o.boot : A.shade(o.boot, 0.2), 2.2);
    });
  }

  function arm(g, sx, sy, hx, hy, w, sleeve, hand) {
    A.cap(g, sx, sy, hx, hy, w, sleeve, 2.1);
    A.circ(g, hx, hy, w * 0.62 + 0.8, hand || SKIN, 1.9);
  }

  function eye(g, x, y, r) {
    g.fillStyle = INK;
    g.beginPath();
    g.ellipse(x, y, r * 0.14, r * 0.21, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(x + r * 0.04, y - r * 0.07, r * 0.055, 0, Math.PI * 2);
    g.fill();
  }

  // Big chibi head, 3/4 view facing +X. `o.mouth` 0..1 opens the mouth (battle cry).
  function face(g, x, y, r, o = {}) {
    const skin = o.skin || SKIN, lo = A.shade(skin, 0.16);
    A.circ(g, x - r * 0.8, y + r * 0.1, r * 0.25, lo, 1.9); // far ear
    A.circ(g, x, y, r, skin);
    g.save();
    g.beginPath();
    g.arc(x, y, r - 1.2, 0, Math.PI * 2);
    g.clip();
    g.globalAlpha = 0.6;
    g.fillStyle = lo;
    g.beginPath();
    g.ellipse(x - r * 0.62, y + r * 0.5, r * 0.95, r * 0.75, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    A.gloss(g, x + r * 0.05, y - r * 0.62, r * 0.32, r * 0.14, -0.2, 0.35);
    // cheek blush
    g.fillStyle = 'rgba(255,120,110,0.38)';
    g.beginPath();
    g.ellipse(x + r * 0.3, y + r * 0.42, r * 0.2, r * 0.12, 0, 0, Math.PI * 2);
    g.fill();
    eye(g, x + r * 0.14, y + r * 0.04, r);
    eye(g, x + r * 0.6, y + r * 0.04, r * 0.92);
    // brows
    g.strokeStyle = o.brow || INK;
    g.lineWidth = r * 0.16;
    g.lineCap = 'round';
    const fierce = o.fierce ? 1 : 0;
    [[x + r * 0.12, 1], [x + r * 0.6, 0.9]].forEach(([bx, k]) => {
      g.beginPath();
      g.moveTo(bx - r * 0.18 * k, y - r * (0.32 + 0.04 * fierce) * k);
      g.lineTo(bx + r * 0.2 * k, y - r * (0.32 - 0.1 * fierce) * k);
      g.stroke();
    });
    // nose
    A.circ(g, x + r * 0.95, y + r * 0.26, r * 0.14, skin, 1.7);
    // mouth
    const m = o.mouth || 0;
    if (m > 0.15) {
      g.beginPath();
      g.ellipse(x + r * 0.5, y + r * 0.56, r * 0.2, r * (0.1 + 0.16 * m), 0, 0, Math.PI * 2);
      g.fillStyle = '#7a1f1f';
      g.fill();
      A.stroke(g, 1.5);
    } else {
      g.beginPath();
      g.moveTo(x + r * 0.34, y + r * 0.56);
      g.quadraticCurveTo(x + r * 0.52, y + r * 0.68, x + r * 0.7, y + r * 0.54);
      A.stroke(g, 1.5);
    }
  }

  function hairCap(g, hx, hy, r, col, tufts) {
    g.beginPath();
    g.arc(hx, hy, r + 1.1, Math.PI * 0.74, Math.PI * 1.86);
    g.quadraticCurveTo(hx + r * 0.55, hy - r * 0.5, hx + r * 0.12, hy - r * 0.46);
    g.quadraticCurveTo(hx - r * 0.5, hy - r * 0.44, hx - r * 0.82, hy - r * 0.02);
    g.closePath();
    A.fillStroke(g, col, 2.2);
    A.gloss(g, hx - r * 0.1, hy - r * 0.9, r * 0.45, r * 0.12, -0.2, 0.32);
    if (tufts) {
      g.beginPath();
      g.moveTo(hx - r * 0.2, hy - r * 1.02);
      g.quadraticCurveTo(hx - r * 0.1, hy - r * 1.45, hx + r * 0.3, hy - r * 1.3);
      g.quadraticCurveTo(hx + r * 0.1, hy - r * 1.1, hx + r * 0.35, hy - r * 0.95);
      g.closePath();
      A.fillStroke(g, col, 2);
    }
  }

  function torso(g, w0, w1, h, fill, y0 = 0) {
    g.beginPath();
    g.moveTo(-w0, y0);
    g.lineTo(w0, y0);
    g.lineTo(w1, y0 - h + 4);
    g.quadraticCurveTo(w1, y0 - h, w1 - 4, y0 - h);
    g.lineTo(-w1 + 4, y0 - h);
    g.quadraticCurveTo(-w1, y0 - h, -w1, y0 - h + 4);
    g.closePath();
    A.fillStroke(g, fill, 2.3);
    // cel shade on the back side
    g.save();
    g.clip();
    g.globalAlpha = 0.28;
    g.fillStyle = '#2b1236';
    g.fillRect(-w0 - 2, y0 - h - 1, w0 * 0.9 + 2, h + 2);
    g.restore();
  }

  function swoosh(g, x, y, a0, a1, r0, r1, alpha) {
    if (alpha <= 0.02) return;
    g.save();
    g.translate(x, y);
    g.globalAlpha = alpha;
    g.beginPath();
    g.arc(0, 0, r1, a0, a1, a1 < a0);
    g.arc(0, 0, r0, a1, a0, a1 >= a0);
    g.closePath();
    const grad = g.createLinearGradient(Math.cos(a0) * r1, Math.sin(a0) * r1, Math.cos(a1) * r1, Math.sin(a1) * r1);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(255,255,255,0.95)');
    g.fillStyle = grad;
    g.fill();
    g.restore();
  }

  // ---- weapons ------------------------------------------------------------
  function pitchfork(g, x, y, ang) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    A.cap(g, -15, 0, 40, 0, 3.1, '#b57a3c', 1.9);
    g.strokeStyle = 'rgba(255,230,170,0.6)';
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(-12, -0.9);
    g.lineTo(36, -0.9);
    g.stroke();
    A.cap(g, 40, -6.2, 40, 6.2, 2.2, '#cfd9e5', 1.5);
    [-6.2, 0, 6.2].forEach(oy => A.cap(g, 40, oy, 51, oy, 1.7, '#eef4fb', 1.4));
    g.restore();
  }

  function sword(g, x, y, ang, len = 31) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    A.cap(g, -6, 0, 1, 0, 3.2, '#7a4a28', 1.7);
    A.circ(g, -7.4, 0, 2.5, '#f6c433', 1.5);
    A.cap(g, 2, -5.6, 2, 5.6, 2.6, '#f6c433', 1.6);
    A.poly(g, [3.4, -3, len, -3, len + 7, 0, len, 3, 3.4, 3], '#e4ecf5', 1.9);
    g.fillStyle = '#9db0c6';
    g.beginPath();
    g.moveTo(3.4, 0.2);
    g.lineTo(len + 5, 0.2);
    g.lineTo(len, 2.4);
    g.lineTo(3.4, 2.4);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(6, -1.6);
    g.lineTo(len - 2, -1.6);
    g.stroke();
    g.restore();
  }

  function kiteShield(g, cx, cy, T, s = 1) {
    g.save();
    g.translate(cx, cy);
    g.scale(s, s);
    const path = k => {
      g.beginPath();
      g.moveTo(-9 * k, -11 * k);
      g.quadraticCurveTo(0, -14.5 * k, 9 * k, -11 * k);
      g.lineTo(9 * k, 2 * k);
      g.quadraticCurveTo(8 * k, 11 * k, 0, 15.5 * k);
      g.quadraticCurveTo(-8 * k, 11 * k, -9 * k, 2 * k);
      g.closePath();
    };
    path(1);
    A.fillStroke(g, '#c9d4e2', 2.3);
    path(0.74);
    A.fillStroke(g, T.base, 1.6);
    // lighter right half for a bevelled look
    g.save();
    path(0.74);
    g.clip();
    g.fillStyle = T.hi;
    g.globalAlpha = 0.55;
    g.fillRect(0, -14, 10, 30);
    g.restore();
    // cross
    g.fillStyle = '#ffd447';
    g.strokeStyle = INK;
    g.lineWidth = 1.3;
    g.beginPath();
    g.rect(-1.6, -8, 3.2, 17);
    g.fill();
    g.stroke();
    g.beginPath();
    g.rect(-6, -3.2, 12, 3.2);
    g.fill();
    g.stroke();
    A.gloss(g, -4, -9, 3.5, 1.4, -0.4, 0.55);
    g.restore();
  }

  // ===========================================================================
  // PEASANT: pitchfork farmer with a team-coloured headband
  // ===========================================================================
  function peasant(g, p, T) {
    const st = stance(p, { leg: 14, stride: 6, lift: 4, bob: 2.3, stand: 5.5, lunge: 4 });
    legs(g, st, { pants: '#7d5535', boot: '#4a2d18', w: 6 });

    g.save();
    g.translate(st.lunge * 0.5, st.hipY);
    g.rotate((st.walking ? 0.05 : 0.02) + st.sq * 0.17 - p.wind * 0.1);

    // pitchfork pose
    const k = p.strike >= 0 ? 1 - ease(p.strike) : 0;
    const w = p.strike >= 0 ? 0 : p.wind;
    let bx = lerp(8, -1, w), by = lerp(-9, -11, w), ang = lerp(-1.22, -0.45, w);
    if (p.strike >= 0) {
      bx = lerp(8, 14, k); by = lerp(-9, -11, k); ang = lerp(-1.22, -0.12, k);
    }

    // torso: cream tunic, brown belt, team neckerchief
    torso(g, 8.6, 6.8, 18, '#ecd9b2');
    g.fillStyle = '#9a7a52';
    g.fillRect(-8.2, -7, 16.4, 4);
    g.strokeStyle = INK; g.lineWidth = 1.6; g.strokeRect(-8.2, -7, 16.4, 4);
    A.rr(g, -1.8, -7.4, 4.2, 4.8, 1, '#ffd447', 1.3);
    A.poly(g, [-5.5, -18, 5.5, -18, 0, -11.5], T.base, 1.9);

    // far arm + fork + near arm
    const dx = Math.cos(ang), dy = Math.sin(ang);
    A.cap(g, 2.6, -16.5, bx + dx * 11, by + dy * 11, 5.2, A.shade('#ecd9b2', 0.18), 2);
    pitchfork(g, bx, by, ang);
    A.circ(g, bx + dx * 11, by + dy * 11, 3.6, A.shade(SKIN, 0.1), 1.8);
    arm(g, -2.2, -16.4, bx, by, 5.4, '#ecd9b2');

    // head
    const hx = 1.6, hy = -30.2, r = 11.2;
    face(g, hx, hy, r, { mouth: p.strike >= 0 && p.strike < 0.5 ? 1 : 0, fierce: !st.walking });
    hairCap(g, hx, hy, r, '#7b4a25', true);
    // headband
    g.beginPath();
    g.arc(hx, hy, r + 0.9, Math.PI * 1.22, Math.PI * 1.8);
    g.arc(hx, hy, r - 3.4, Math.PI * 1.8, Math.PI * 1.22, true);
    g.closePath();
    A.fillStroke(g, T.base, 1.8);
    A.cap(g, hx - r * 0.95, hy - r * 0.5, hx - r - 5, hy - r * 0.05 + Math.sin(p.t * 6 + p.seed) * 1.2, 2.6, T.lo, 1.5);

    g.restore();
    if (p.strike >= 0 && p.strike < 0.4) swoosh(g, bx + st.lunge * 0.5, st.hipY + by, -0.5, 0.35, 28, 46, 0.6 * (1 - p.strike / 0.4));
  }

  // ===========================================================================
  // KNIGHT: steel armour, team tabard, plume, sword and kite shield
  // ===========================================================================
  function knight(g, p, T) {
    const st = stance(p, { leg: 14.5, stride: 5.4, lift: 3.4, bob: 1.8, stand: 6, lunge: 5 });
    legs(g, st, { pants: '#8c9db3', boot: '#3a2f3d', w: 7 });

    g.save();
    g.translate(st.lunge * 0.5, st.hipY);
    g.rotate((st.walking ? 0.04 : 0.02) + st.sq * 0.2 - p.wind * 0.12);

    // sword angle
    let ang, hx, hy;
    if (p.strike >= 0) {
      const s = p.strike;
      ang = s < 0.3 ? lerp(-0.35, 0.65, s / 0.3) : lerp(0.65, -1.05, ease((s - 0.3) / 0.7));
      hx = lerp(13, 9, s); hy = lerp(-14, -15, s);
    } else {
      ang = lerp(-1.05, -2.35, p.wind);
      hx = lerp(9, 3, p.wind); hy = lerp(-15, -25, p.wind);
    }
    const dx = Math.cos(ang), dy = Math.sin(ang);

    // far arm holding the sword
    A.cap(g, 3.4, -17, hx, hy, 5.6, '#8f9eb3', 2);
    sword(g, hx, hy, ang);
    A.circ(g, hx, hy, 3.8, '#aab7ca', 1.8);

    // body: steel breastplate + team tabard
    torso(g, 9.6, 8.6, 19, '#b9c6d8');
    A.gloss(g, 4, -14, 2.2, 5, 0.2, 0.55);
    // tabard
    g.beginPath();
    g.moveTo(-6.4, -18); g.lineTo(6.4, -18); g.lineTo(8.6, 10); g.lineTo(5, 7.5); g.lineTo(1.7, 10.5);
    g.lineTo(-1.7, 7.5); g.lineTo(-5, 10.5); g.lineTo(-8.6, 8); g.closePath();
    A.fillStroke(g, T.base, 2.1);
    g.fillStyle = T.hi; g.globalAlpha = 0.45;
    g.beginPath(); g.moveTo(1, -18); g.lineTo(6.4, -18); g.lineTo(8.4, 9); g.lineTo(1, 7); g.closePath(); g.fill();
    g.globalAlpha = 1;
    A.rr(g, -8.8, -6.6, 17.6, 3.8, 1.4, '#6a4426', 1.7);
    A.rr(g, -2, -7, 4.4, 4.6, 1, '#ffd447', 1.3);
    // gold chevron
    g.strokeStyle = '#ffd447'; g.lineWidth = 2; g.beginPath(); g.moveTo(-3.6, -14); g.lineTo(0, -10.5); g.lineTo(3.6, -14); g.stroke();
    // pauldrons
    A.circ(g, -7.6, -17.2, 5.2, '#c9d4e2', 2);
    A.gloss(g, -8.8, -19, 2, 1.1, -0.5, 0.65);

    // head with great helm
    const hx0 = 1.2, hy0 = -31, r = 11;
    // plume (behind)
    const wave = Math.sin(p.t * 5 + p.seed) * 1.5 + (st.walking ? Math.sin(p.ph) * 2.5 : 0);
    g.beginPath();
    g.moveTo(hx0 - 1, hy0 - r - 1);
    g.bezierCurveTo(hx0 - 9, hy0 - r - 12 - wave * 0.3, hx0 - 20 - wave, hy0 - r - 4, hx0 - 22 - wave, hy0 - 1);
    g.bezierCurveTo(hx0 - 15 - wave, hy0 - r - 1, hx0 - 9, hy0 - r + 3, hx0 - 6, hy0 - r + 5);
    g.closePath();
    A.fillStroke(g, T.base, 2.1);
    g.strokeStyle = T.hi; g.lineWidth = 1.2; g.beginPath(); g.moveTo(hx0 - 3, hy0 - r - 3); g.quadraticCurveTo(hx0 - 12, hy0 - r - 7, hx0 - 18 - wave, hy0 - 3); g.stroke();

    A.circ(g, hx0, hy0, r + 1.3, '#c4cfdf', 2.4);
    // face opening
    g.beginPath();
    g.roundRect(hx0 + 0.5, hy0 - 3.4, 12.2, 10.6, 3.2);
    g.fillStyle = SKIN; g.fill();
    A.stroke(g, 1.9);
    eye(g, hx0 + 4.4, hy0 + 0.5, r); eye(g, hx0 + 8.9, hy0 + 0.5, r * 0.92);
    g.strokeStyle = INK; g.lineWidth = 1.8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx0 + 2.4, hy0 - 3); g.lineTo(hx0 + 6.2, hy0 - 1.8); g.moveTo(hx0 + 7.4, hy0 - 1.8); g.lineTo(hx0 + 11.4, hy0 - 3); g.stroke();
    if (p.strike >= 0 && p.strike < 0.5) {
      g.fillStyle = '#7a1f1f'; g.beginPath(); g.ellipse(hx0 + 8, hy0 + 4.6, 2.2, 1.9, 0, 0, Math.PI * 2); g.fill();
    } else {
      g.beginPath(); g.moveTo(hx0 + 5.6, hy0 + 4.8); g.quadraticCurveTo(hx0 + 7.6, hy0 + 5.8, hx0 + 9.6, hy0 + 4.7); A.stroke(g, 1.4);
    }
    // helm ridge + rivets + gloss
    g.beginPath(); g.moveTo(hx0 - 1, hy0 - r - 1.2); g.quadraticCurveTo(hx0 + 8, hy0 - r + 1, hx0 + 12.5, hy0 - 4); A.stroke(g, 1.6, '#6f7d92');
    g.fillStyle = '#6f7d92'; [[-8, 2], [-8, 7]].forEach(([ox, oy]) => { g.beginPath(); g.arc(hx0 + ox, hy0 + oy, 0.9, 0, 6.3); g.fill(); });
    A.gloss(g, hx0 - 3, hy0 - 7.5, 4.6, 2, -0.4, 0.7);
    A.rr(g, hx0 - 4.2, hy0 + 7, 9, 3, 1.5, '#a8b5c8', 1.7);

    // near arm + shield
    const sh = p.strike >= 0 ? Math.sin(p.strike * Math.PI) * 3.5 : 0;
    A.cap(g, -3, -16.6, 7 + sh, -6, 5.8, '#aab7ca', 2);
    kiteShield(g, 9 + sh, -3.5, T, 1.05);
    A.circ(g, 4.6 + sh, -7.2, 3.6, '#b9c6d8', 1.8);

    g.restore();
    if (p.strike >= 0 && p.strike < 0.45) swoosh(g, hx + st.lunge * 0.5, st.hipY + hy, -1.9, 0.5, 20, 40, 0.75 * (1 - p.strike / 0.45));
  }

  // ===========================================================================
  // ARCHER: green hooded ranger with quiver and longbow
  // ===========================================================================
  function archer(g, p, T) {
    const st = stance(p, { leg: 15, stride: 5.6, lift: 3.6, bob: 2, stand: 5, lunge: 0 });
    legs(g, st, { pants: '#6b5a3a', boot: '#523119', w: 5.6 });

    const w = p.strike >= 0 ? 0 : (st.walking ? 0 : p.wind);
    const rel = p.strike >= 0 ? clamp(p.strike * 3) : 1;   // string snap-back after release
    const recoil = p.strike >= 0 ? Math.sin(p.strike * Math.PI) * 1.6 : 0;

    g.save();
    g.translate(-recoil, st.hipY);
    g.rotate((st.walking ? 0.03 : -0.02) - w * 0.04);

    // quiver on back
    g.save();
    g.translate(-8.5, -12);
    g.rotate(-0.42);
    [[-3, T.base], [0, '#f4f1e8'], [3, T.base]].forEach(([ox, col], i) => {
      A.cap(g, ox, -9, ox, -17 - i % 2 * 2, 1.3, '#d7b787', 1.1);
      A.poly(g, [ox - 2.2, -17 - i % 2 * 2, ox + 2.2, -17 - i % 2 * 2, ox, -22 - i % 2 * 2], col, 1.3);
    });
    A.rr(g, -5.5, -9, 11, 20, 3, '#8a5a2b', 2);
    g.fillStyle = '#a97439'; g.fillRect(-4, -4, 8, 2);
    g.restore();

    // bow geometry
    const walkBow = st.walking ? 1 : 0;
    const gripX = lerp(15, 11, walkBow), gripY = lerp(-17, -12, walkBow);
    const tipX = gripX - 7 - 1.8 * w, topY = gripY - 18, botY = gripY + 18;
    const nockX = tipX - 12.5 * w * (p.strike >= 0 ? 0 : 1) - (p.strike >= 0 ? Math.max(0, 1 - rel) * 8 : 0);

    // far arm (bow arm)
    A.cap(g, 3.4, -17.2, gripX - 1, gripY, 5, A.shade('#4f9a2f', 0.18), 2);

    // torso: green tunic with zig-zag hem and belt
    g.beginPath();
    g.moveTo(-8.4, 3); g.lineTo(-5.6, 6); g.lineTo(-2.8, 3); g.lineTo(0, 6); g.lineTo(2.8, 3); g.lineTo(5.6, 6); g.lineTo(8.4, 3);
    g.lineTo(6.8, -17.5); g.quadraticCurveTo(6, -19.5, 3, -19.5); g.lineTo(-3, -19.5); g.quadraticCurveTo(-6, -19.5, -6.8, -17.5);
    g.closePath();
    A.fillStroke(g, '#58a533', 2.3);
    g.save(); g.clip(); g.globalAlpha = 0.28; g.fillStyle = '#2b1236'; g.fillRect(-10, -20, 8, 28); g.restore();
    A.rr(g, -8.2, -6.4, 16.4, 3.8, 1.4, '#6a4426', 1.6);
    A.rr(g, -1.8, -6.8, 4, 4.6, 1, '#ffd447', 1.2);
    // team-coloured scarf
    A.poly(g, [-5.4, -18.5, 5.4, -18.5, 0.5, -12.5], T.base, 1.8);

    // bow (wood)
    g.beginPath();
    g.moveTo(tipX, topY);
    g.quadraticCurveTo(gripX + 14 - w * 3, gripY, tipX, botY);
    g.strokeStyle = INK; g.lineWidth = 5.8; g.lineCap = 'round'; g.stroke();
    g.strokeStyle = '#a8703a'; g.lineWidth = 3.2; g.stroke();
    g.strokeStyle = 'rgba(255,225,160,0.7)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(tipX + 1, topY + 2); g.quadraticCurveTo(gripX + 11 - w * 3, gripY - 3, tipX + 4, gripY - 14); g.stroke();
    A.circ(g, tipX, topY, 1.9, '#f6c433', 1.2); A.circ(g, tipX, botY, 1.9, '#f6c433', 1.2);
    // string
    g.strokeStyle = '#f5efe0'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(tipX, topY); g.lineTo(nockX, gripY); g.lineTo(tipX, botY); g.stroke();
    // arrow
    if (w > 0.04) {
      A.cap(g, nockX, gripY, gripX + 20, gripY, 1.5, '#d7b787', 1);
      A.poly(g, [gripX + 20, gripY - 2.6, gripX + 26, gripY, gripX + 20, gripY + 2.6], '#e7eef6', 1.3);
      A.poly(g, [nockX, gripY, nockX + 4, gripY - 3, nockX + 6, gripY - 3, nockX + 3, gripY], T.base, 1);
      A.poly(g, [nockX, gripY, nockX + 4, gripY + 3, nockX + 6, gripY + 3, nockX + 3, gripY], '#f4f1e8', 1);
    }
    // bow hand
    A.circ(g, gripX + 4, gripY, 3.6, '#7a5a35', 1.8);
    // draw arm (near)
    const handX = w > 0.04 || p.strike >= 0 ? nockX + 0.5 : 4;
    const handY = w > 0.04 || p.strike >= 0 ? gripY + 1 : -6;
    A.cap(g, -2.4, -16.8, handX, handY, 5.2, '#58a533', 2);
    A.circ(g, handX, handY, 3.4, '#7a5a35', 1.8);

    // head + hood
    const hx = 1.2, hy = -30.6, r = 11;
    face(g, hx, hy, r, { mouth: 0, fierce: !st.walking });
    // hood
    g.beginPath();
    g.arc(hx, hy, r + 1.8, Math.PI * 0.62, Math.PI * 1.9);
    g.quadraticCurveTo(hx + r * 0.62, hy - r * 0.2, hx + r * 0.3, hy - r * 0.05);
    g.quadraticCurveTo(hx + r * 0.02, hy + r * 0.5, hx - r * 0.45, hy + r * 0.8);
    g.closePath();
    A.fillStroke(g, '#4d9a2c', 2.3);
    // pointed tail of the hood
    const sway = Math.sin(p.t * 5 + p.seed) * 1.6 + (st.walking ? Math.sin(p.ph) * 2.2 : 0);
    g.beginPath();
    g.moveTo(hx - r * 0.9, hy - r * 0.9);
    g.quadraticCurveTo(hx - r * 1.5, hy - r * 1.2 - sway, hx - r * 2.0 - sway, hy - r * 0.6);
    g.quadraticCurveTo(hx - r * 1.3, hy - r * 0.55, hx - r * 1.0, hy - r * 0.1);
    g.closePath();
    A.fillStroke(g, '#3f8523', 2);
    g.save(); g.beginPath(); g.arc(hx, hy, r + 0.8, 0, 6.3); g.clip();
    g.fillStyle = 'rgba(30,60,20,0.45)';
    g.beginPath(); g.ellipse(hx + r * 0.52, hy - r * 0.34, r * 0.8, r * 0.28, 0.1, 0, 6.3); g.fill();
    g.restore();
    A.gloss(g, hx - r * 0.25, hy - r * 0.9, r * 0.42, r * 0.13, -0.15, 0.4);
    // feather in team colour
    A.poly(g, [hx + 1, hy - r - 1, hx + 5, hy - r - 9, hx + 9, hy - r - 6, hx + 4, hy - r + 1], T.base, 1.6);

    g.restore();
  }

  // ===========================================================================
  // CROSSBOWMAN: kettle hat, gambeson in team colour, steel crossbow
  // ===========================================================================
  function crossbowman(g, p, T) {
    const st = stance(p, { leg: 14.5, stride: 5.2, lift: 3.4, bob: 1.9, stand: 5.2, lunge: 0 });
    legs(g, st, { pants: '#4d5a70', boot: '#3b2a1e', w: 6.2 });

    const w = p.strike >= 0 ? 0 : (st.walking ? 0 : p.wind);
    const kick = p.strike >= 0 ? Math.sin(Math.min(1, p.strike * 2.4) * Math.PI) : 0;

    g.save();
    g.translate(-kick * 3, st.hipY);
    g.rotate((st.walking ? 0.03 : 0.0) - kick * 0.05);

    // far arm (supports the prod)
    const cx = 5 - kick * 2, cy = st.walking ? -13 : -15.5 - kick * 1.6;
    const cang = st.walking ? -0.28 : -0.06 - kick * 0.14;
    A.cap(g, 3.2, -17, cx + 17, cy + 1, 5.2, A.shade('#6c7a92', 0.15), 2);

    // body: padded gambeson (team colour) over mail
    torso(g, 9, 8.4, 19, '#8795ab');
    g.beginPath();
    g.moveTo(-7.8, -18); g.lineTo(7.8, -18); g.lineTo(8.4, 4); g.lineTo(-8.4, 4);
    g.closePath();
    A.fillStroke(g, T.base, 2.2);
    g.save(); g.clip(); g.globalAlpha = 0.3; g.fillStyle = '#2b1236'; g.fillRect(-10, -20, 9, 26);
    g.globalAlpha = 0.5; g.strokeStyle = T.lo; g.lineWidth = 1.2;
    for (let yy = -14; yy < 4; yy += 5) { g.beginPath(); g.moveTo(-9, yy); g.lineTo(9, yy); g.stroke(); }
    g.restore();
    A.rr(g, -8.8, -6.4, 17.6, 3.8, 1.4, '#5a3a22', 1.6);
    A.rr(g, -2, -6.8, 4.2, 4.6, 1, '#ffd447', 1.2);
    A.circ(g, -7.4, -16.8, 4.6, '#aab4c5', 1.9);

    // crossbow
    g.save();
    g.translate(cx, cy);
    g.rotate(cang);
    A.rr(g, -9, -2.8, 34, 5.4, 2.2, '#9a6234', 2);
    g.fillStyle = 'rgba(255,230,170,0.5)'; g.fillRect(-6, -1.8, 28, 1.1);
    A.rr(g, -11, -3.8, 6, 7.6, 2, '#7a4a28', 1.8); // butt
    // prod (steel limbs), tips flex back when cranked
    const flex = 3.2 * w;
    g.beginPath();
    g.moveTo(21 - flex, -15.5);
    g.quadraticCurveTo(30 - flex * 0.3, 0, 21 - flex, 15.5);
    g.strokeStyle = INK; g.lineWidth = 6; g.lineCap = 'round'; g.stroke();
    g.strokeStyle = '#d3dce8'; g.lineWidth = 3.2; g.stroke();
    A.gloss(g, 26, -6, 1.5, 4.5, 0.2, 0.7);
    // string + bolt
    const sx = p.strike >= 0 ? 21 - Math.max(0, 1 - p.strike * 4) * 6 : lerp(21, 6, w);
    g.strokeStyle = '#f5efe0'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(21 - flex, -15.5); g.lineTo(sx, 0); g.lineTo(21 - flex, 15.5); g.stroke();
    if (w > 0.45 || (st.walking)) {
      const bxs = st.walking ? 8 : sx;
      A.cap(g, bxs, 0, 30, 0, 1.9, '#7b5330', 1.2);
      A.poly(g, [30, -2.6, 37, 0, 30, 2.6], '#e7eef6', 1.4);
      A.poly(g, [bxs, 0, bxs + 3, -2.6, bxs + 6, -2.6, bxs + 5, 0], T.base, 1);
    }
    // stirrup at the front of the prod
    A.circ(g, 26, 0, 2.4, '#cfd8e5', 1.5);
    g.restore();

    // near arm hand on the stock
    A.cap(g, -2.6, -16.6, cx + 1, cy + 3, 5.4, '#8795ab', 2);
    A.circ(g, cx + 1, cy + 3, 3.6, '#7a5a35', 1.8);

    // head with kettle hat
    const hx = 1.2, hy = -30.6, r = 11;
    face(g, hx, hy, r, { mouth: 0, fierce: true });
    // brim (behind the dome from this angle)
    g.beginPath();
    g.ellipse(hx + 0.8, hy - 5.2, r + 6.8, 4.4, -0.06, 0, Math.PI * 2);
    A.fillStroke(g, '#a9b6c8', 2.3);
    g.save(); g.beginPath(); g.ellipse(hx + 0.8, hy - 5.2, r + 6.8, 4.4, -0.06, 0, 6.3); g.clip();
    g.fillStyle = 'rgba(43,18,54,0.3)'; g.fillRect(hx - 22, hy - 12, 16, 16); g.restore();
    g.beginPath();
    g.arc(hx + 0.8, hy - 6, r - 0.6, Math.PI, 0);
    g.quadraticCurveTo(hx + r, hy - 4.6, hx + 0.8 + r - 0.6, hy - 4.6);
    g.lineTo(hx + 0.8 - r + 0.6, hy - 4.6);
    g.closePath();
    A.fillStroke(g, '#c3cedc', 2.3);
    A.gloss(g, hx - 2.5, hy - 13.5, 4.8, 2, -0.35, 0.75);
    // team band on the helmet
    g.beginPath(); g.rect(hx - 10.2, hy - 9.4, 22, 3); g.fillStyle = T.base; g.fill(); A.stroke(g, 1.3);
    A.circ(g, hx + 0.8, hy - r - 5.2, 1.8, '#ffd447', 1.3);

    g.restore();
  }

  Art.units.infantry = { peasant, knight, archer, crossbowman, face, hairCap, torso, arm, legs, stance, kiteShield, sword, swoosh, eye };
})();

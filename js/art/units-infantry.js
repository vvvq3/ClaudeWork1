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


  // ===========================================================================
  // SPEARMAN: conical helmet, mail coat, round shield on the back, long spear
  // ===========================================================================
  function spearHead(g, x, y, ang, T, p) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    A.cap(g, -20, 0, 60, 0, 3.2, '#b88442', 1.9);
    g.strokeStyle = 'rgba(255,230,170,0.6)';
    g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(-16, -0.9); g.lineTo(55, -0.9); g.stroke();
    // pennon in team colour just below the blade
    const fl = Math.sin(p.t * 9 + p.seed) * 2 + (p.walk > 0.5 ? Math.sin(p.ph) * 2.4 : 0);
    g.beginPath();
    g.moveTo(52, -1.2);
    g.quadraticCurveTo(44, -8 - fl * 0.5, 31 - fl, -5 + fl * 0.4);
    g.lineTo(34 - fl, 2.2);
    g.quadraticCurveTo(44, -1, 52, 1.2);
    g.closePath();
    A.fillStroke(g, T.base, 1.7);
    // leaf-shaped blade
    g.beginPath();
    g.moveTo(58, -3.6);
    g.quadraticCurveTo(67, -6.2, 80, 0);
    g.quadraticCurveTo(67, 6.2, 58, 3.6);
    g.closePath();
    A.fillStroke(g, '#e4ecf5', 1.9);
    g.fillStyle = '#9db0c6';
    g.beginPath(); g.moveTo(58, 0.4); g.lineTo(78, 0.4); g.quadraticCurveTo(67, 5.8, 58, 3.4); g.closePath(); g.fill();
    A.cap(g, 57, -4.2, 57, 4.2, 2.4, '#8793a5', 1.4);
    g.restore();
  }

  function spearman(g, p, T) {
    const st = stance(p, { leg: 14.5, stride: 5.6, lift: 3.6, bob: 2.1, stand: 5.5, lunge: 5 });
    legs(g, st, { pants: '#6a5738', boot: '#3b281a', w: 6.2 });

    g.save();
    g.translate(st.lunge * 0.5, st.hipY);
    g.rotate((st.walking ? 0.05 : 0.02) + st.sq * 0.18 - p.wind * 0.1);

    const k = p.strike >= 0 ? 1 - ease(p.strike) : 0;
    const w = p.strike >= 0 ? 0 : p.wind;
    let bx = lerp(7, -3, w), by = lerp(-7, -9, w), ang = lerp(-1.12, -0.3, w);
    if (p.strike >= 0) { bx = lerp(7, 17, k); by = lerp(-7, -9, k); ang = lerp(-1.12, -0.08, k); }
    const dx = Math.cos(ang), dy = Math.sin(ang);

    // round shield slung on the back
    A.circ(g, -10.5, -12, 9.6, '#a06a38', 2.2);
    A.circ(g, -10.5, -12, 6.4, T.base, 1.6);
    A.circ(g, -10.5, -12, 2.3, '#cfd8e5', 1.4);
    A.gloss(g, -13, -15.5, 2.6, 1.2, -0.6, 0.5);

    torso(g, 8.8, 7.2, 18, '#8f9db2');
    // team tabard
    g.beginPath();
    g.moveTo(-6, -17); g.lineTo(6, -17); g.lineTo(7.6, 5); g.lineTo(2.6, 3); g.lineTo(0, 5.4); g.lineTo(-2.6, 3); g.lineTo(-7.6, 5);
    g.closePath();
    A.fillStroke(g, T.base, 2);
    g.fillStyle = T.hi; g.globalAlpha = 0.4;
    g.beginPath(); g.moveTo(0.5, -17); g.lineTo(6, -17); g.lineTo(7.4, 4.6); g.lineTo(0.5, 3); g.closePath(); g.fill();
    g.globalAlpha = 1;
    A.rr(g, -8.6, -6.4, 17.2, 3.6, 1.4, '#5a3a22', 1.6);
    A.rr(g, -2, -6.8, 4.2, 4.4, 1, '#ffd447', 1.2);
    A.circ(g, -6.6, -16.6, 4.4, '#b6c2d3', 1.9);

    // arms + spear
    A.cap(g, 3, -16.5, bx + dx * 15, by + dy * 15, 5.2, A.shade('#8f9db2', 0.2), 2);
    spearHead(g, bx, by, ang, T, p);
    A.circ(g, bx + dx * 15, by + dy * 15, 3.5, A.shade(SKIN, 0.1), 1.8);
    arm(g, -2.2, -16.4, bx, by, 5.4, '#8f9db2');

    // head with a conical helmet and nasal
    const hx = 1.4, hy = -30.4, r = 11;
    face(g, hx, hy, r, { mouth: p.strike >= 0 && p.strike < 0.5 ? 1 : 0, fierce: true });
    g.beginPath();
    g.moveTo(hx - r * 1.05, hy + r * 0.2);
    g.quadraticCurveTo(hx - r * 1.05, hy - r * 1.1, hx + 0.2 * r, hy - r * 1.75);
    g.quadraticCurveTo(hx + r * 1.0, hy - r * 1.05, hx + r * 1.0, hy - r * 0.32);
    g.quadraticCurveTo(hx + r * 0.3, hy - r * 0.52, hx - r * 1.05, hy + r * 0.2);
    g.closePath();
    A.fillStroke(g, '#c1ccdb', 2.3);
    g.save(); g.clip();
    g.fillStyle = 'rgba(43,18,54,0.3)'; g.fillRect(hx - r * 1.2, hy - r * 2, r * 0.7, r * 2.4);
    g.restore();
    A.cap(g, hx + r * 0.88, hy - r * 0.34, hx + r * 0.92, hy + r * 0.38, 2.2, '#cfd8e5', 1.4);
    g.strokeStyle = '#7f8da1'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(hx - r * 0.9, hy - r * 0.2); g.quadraticCurveTo(hx, hy - r * 0.55, hx + r * 0.9, hy - r * 0.34); g.stroke();
    A.gloss(g, hx - r * 0.1, hy - r * 1.05, r * 0.4, r * 0.15, -0.5, 0.6);
    A.poly(g, [hx - 1.4, hy - r * 1.7, hx + 0.6, hy - r * 1.7 - 8, hx + 3.2, hy - r * 1.7], T.base, 1.6);

    g.restore();
    if (p.strike >= 0 && p.strike < 0.4) {
      g.save(); g.globalAlpha = 0.7 * (1 - p.strike / 0.4); g.strokeStyle = '#fff'; g.lineWidth = 2; g.lineCap = 'round';
      [-4, 0, 4].forEach((o, i) => { g.beginPath(); g.moveTo(bx + 40 - i * 7 + st.lunge * 0.5, st.hipY + by + o - 2); g.lineTo(bx + 84 + st.lunge * 0.5, st.hipY + by + o - 1); g.stroke(); });
      g.restore();
    }
  }

  // ===========================================================================
  // MAGE: team-coloured robe, wizard hat, white beard, staff with a fire orb
  // ===========================================================================
  function fireOrb(g, x, y, r, glow, p) {
    // outer glow
    const gr = g.createRadialGradient(x, y, 0, x, y, r * (2.3 + glow));
    gr.addColorStop(0, 'rgba(255,190,70,0.65)');
    gr.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r * (2.3 + glow), 0, 6.3); g.fill();
    // flame tongues
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.7 + Math.sin(p.t * 7 + i * 2) * 0.2;
      const len = r * (1.5 + glow * 0.8) + (i === 1 ? 3 : 0);
      g.beginPath();
      g.moveTo(x + Math.cos(a + 1.5) * r * 0.8, y + Math.sin(a + 1.5) * r * 0.8);
      g.quadraticCurveTo(x + Math.cos(a) * len * 0.9 + 2, y + Math.sin(a) * len * 0.7, x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.quadraticCurveTo(x + Math.cos(a) * len * 0.7 - 2, y + Math.sin(a) * len * 0.9, x + Math.cos(a - 1.5) * r * 0.8, y + Math.sin(a - 1.5) * r * 0.8);
      g.closePath();
      A.fillStroke(g, '#ff8a1f', 1.6);
    }
    // the orb
    g.beginPath(); g.arc(x, y, r, 0, 6.3);
    const og = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    og.addColorStop(0, '#fffbe0'); og.addColorStop(0.45, '#ffd447'); og.addColorStop(1, '#f0661a');
    g.fillStyle = og; g.fill();
    A.stroke(g, 2);
    A.gloss(g, x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.17, -0.6, 0.85);
  }

  function mage(g, p, T) {
    const st = stance(p, { leg: 12, stride: 4.4, lift: 3, bob: 1.8, stand: 4.6, lunge: 2.5 });
    legs(g, st, { pants: A.shade(T.base, 0.35), boot: '#3a2a22', w: 5.4 });

    g.save();
    g.translate(st.lunge * 0.4, st.hipY);
    g.rotate((st.walking ? 0.035 : 0.0) + st.sq * 0.1 - p.wind * 0.06);

    const k = p.strike >= 0 ? 1 - ease(p.strike) : 0;
    const w = p.strike >= 0 ? 0 : p.wind;
    // staff: upright while marching, tilts forward while charging a spell, thrusts on release
    let sx = 8, sy = -6, ang = -1.45 + (st.walking ? Math.sin(p.ph) * 0.05 : 0);
    if (p.strike >= 0) { sx = lerp(9, 16, k); sy = lerp(-8, -13, k); ang = lerp(-1.3, -0.62, k); }
    else { sx = lerp(8, 11, w); sy = lerp(-6, -11, w); ang = lerp(ang, -1.02, w); }
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const ox = sx + dx * 47, oy = sy + dy * 47;

    // far arm: open hand raised while casting
    const fhx = lerp(10, 18, Math.max(w, k)), fhy = lerp(-8, -22, Math.max(w, k));
    A.cap(g, 3, -16.5, fhx, fhy, 6.2, A.shade(T.base, 0.25), 2);
    A.circ(g, fhx, fhy, 3.4, A.shade(SKIN, 0.08), 1.8);
    if (Math.max(w, k) > 0.3) A.gloss(g, fhx + 4, fhy - 4, 3, 3, 0, 0.35 * Math.max(w, k));

    // long robe
    g.beginPath();
    g.moveTo(-6.4, -18); g.lineTo(6.4, -18); g.lineTo(7.4, -6); g.lineTo(11.4, 8); g.lineTo(5, 6); g.lineTo(0, 8.4);
    g.lineTo(-5, 6); g.lineTo(-11.4, 8); g.lineTo(-7.8, -6); g.closePath();
    A.fillStroke(g, T.base, 2.3);
    g.save(); g.clip();
    g.fillStyle = 'rgba(43,18,54,0.28)'; g.fillRect(-12, -19, 10, 30);
    g.fillStyle = T.hi; g.globalAlpha = 0.35; g.fillRect(2, -19, 6, 30); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(43,18,54,0.35)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-2, -4); g.lineTo(-4, 7); g.moveTo(3, -4); g.lineTo(4.4, 7); g.stroke();
    g.restore();
    // gold hem, sash and collar
    g.strokeStyle = '#ffd447'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(-11, 7.4); g.lineTo(-5, 5.4); g.lineTo(0, 7.6); g.lineTo(5, 5.4); g.lineTo(11, 7.4); g.stroke();
    A.rr(g, -8.2, -8, 16.4, 3.8, 1.6, T.lo, 1.6);
    A.rr(g, -2, -8.4, 4, 4.6, 1.2, '#ffd447', 1.2);
    A.poly(g, [-5.5, -18, 5.5, -18, 0.5, -12], '#f6efe0', 1.7);

    // staff with a claw holding the fire orb
    g.save();
    g.translate(sx, sy);
    g.rotate(ang);
    A.cap(g, -14, 0, 44, 0, 3.2, '#8a5a2e', 1.9);
    g.strokeStyle = 'rgba(255,230,170,0.5)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-10, -1); g.lineTo(40, -1); g.stroke();
    A.cap(g, 20, -2.6, 24, 2.6, 2, '#6a4222', 1.2);
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 4.4; g.lineCap = 'round';
    g.beginPath(); g.arc(ox, oy, 6.6, ang + 2.3, ang + 4.0); g.stroke();
    g.strokeStyle = '#8a5a2e'; g.lineWidth = 2.2; g.stroke();
    fireOrb(g, ox, oy, 5.2 + w * 1.8 + k * 2.2, w + k * 1.2, p);
    // staff hand
    arm(g, -2.2, -16.4, sx, sy, 6, T.base);

    // head: pale face, white beard, wizard hat
    const hx = 1.4, hy = -29.6, r = 10.4;
    face(g, hx, hy, r, { mouth: 0, fierce: false, skin: '#f4cfae' });
    // beard + moustache
    g.beginPath();
    g.moveTo(hx - r * 0.5, hy + r * 0.55);
    g.quadraticCurveTo(hx + r * 0.2, hy + r * 0.8, hx + r * 0.85, hy + r * 0.5);
    g.quadraticCurveTo(hx + r * 0.7, hy + r * 1.75, hx + r * 0.1, hy + r * 2.0);
    g.quadraticCurveTo(hx - r * 0.7, hy + r * 1.6, hx - r * 0.5, hy + r * 0.55);
    g.closePath();
    A.fillStroke(g, '#f1ede6', 2);
    g.strokeStyle = 'rgba(120,110,130,0.45)'; g.lineWidth = 1.1;
    g.beginPath(); g.moveTo(hx, hy + r * 0.95); g.lineTo(hx - 0.2, hy + r * 1.7); g.moveTo(hx + r * 0.4, hy + r * 0.95); g.lineTo(hx + r * 0.35, hy + r * 1.55); g.stroke();
    A.ell(g, hx + r * 0.5, hy + r * 0.48, r * 0.34, r * 0.11, 0.15, '#f1ede6', 1.4);
    // hat: wide brim + tall bent cone
    const hatCol = A.shade(T.base, 0.18);
    const bend = Math.sin(p.t * 5 + p.seed) * 1.6 + (st.walking ? Math.sin(p.ph) * 2.2 : 0);
    A.ell(g, hx + 0.6, hy - r * 0.58, r * 1.7, r * 0.42, -0.05, T.lo, 2.2);
    g.beginPath();
    g.moveTo(hx - r * 0.95, hy - r * 0.72);
    g.quadraticCurveTo(hx - r * 0.7, hy - r * 2.2, hx - r * 1.1 - bend, hy - r * 3.1 + 2);
    g.quadraticCurveTo(hx + r * 0.5, hy - r * 2.1, hx + r * 1.0, hy - r * 0.78);
    g.closePath();
    A.fillStroke(g, hatCol, 2.3);
    g.save(); g.clip();
    g.fillStyle = 'rgba(43,18,54,0.3)'; g.fillRect(hx - r * 1.6, hy - r * 3.4, r * 1.2, r * 3);
    g.fillStyle = T.hi; g.globalAlpha = 0.35; g.fillRect(hx + r * 0.2, hy - r * 3, r * 0.5, r * 3); g.globalAlpha = 1;
    g.restore();
    g.strokeStyle = '#ffd447'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(hx - r * 0.93, hy - r * 0.9); g.quadraticCurveTo(hx, hy - r * 0.62, hx + r * 0.97, hy - r * 0.96); g.stroke();
    A.star(g, hx + r * 0.1, hy - r * 1.55, r * 0.32, r * 0.14, 5, 0.2);
    A.fillStroke(g, '#ffd447', 1.1);

    g.restore();
  }

  // ===========================================================================
  // COMMANDER: gold-trimmed plate, tall crest, flowing cape, team banner and sword
  // ===========================================================================
  function commander(g, p, T) {
    const st = stance(p, { leg: 14.5, stride: 5, lift: 3.2, bob: 1.8, stand: 5.8, lunge: 4 });
    legs(g, st, { pants: '#8896ab', boot: '#33271f', w: 7 });

    g.save();
    g.translate(st.lunge * 0.5, st.hipY);
    g.rotate((st.walking ? 0.04 : 0.02) + st.sq * 0.18 - p.wind * 0.1);

    // cape streaming behind
    const sway = st.walking ? Math.sin(p.ph) * 3.2 : Math.sin(p.t * 3 + p.seed) * 1.4;
    g.beginPath();
    g.moveTo(-4, -18);
    g.quadraticCurveTo(-14 - sway, -8, -17 - sway * 1.4, 10);
    g.lineTo(-10 - sway * 0.6, 7.6);
    g.lineTo(-7 - sway * 0.4, 11);
    g.lineTo(0, 8);
    g.lineTo(5, -4);
    g.closePath();
    A.fillStroke(g, T.lo, 2.2);
    g.strokeStyle = '#ffd447'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(-16.4 - sway * 1.4, 9); g.lineTo(-10 - sway * 0.6, 6.6); g.lineTo(-7 - sway * 0.4, 10); g.lineTo(0, 7); g.stroke();

    // banner (held by the far arm, flag streaming backwards)
    const flutter = Math.sin(p.t * 8 + p.seed) * 2 + (st.walking ? Math.sin(p.ph) * 2.4 : 0);
    const px = 12, top = -80;
    A.cap(g, px, 12, px, top, 3.2, '#8a5a2e', 1.9);
    g.strokeStyle = 'rgba(255,230,170,0.5)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(px - 1, 8); g.lineTo(px - 1, top + 6); g.stroke();
    A.poly(g, [px - 3.4, top + 1, px, top - 8, px + 3.4, top + 1], '#ffe27a', 1.6);   // spear-point finial
    const FL = 26, FH = 17;
    g.beginPath();
    g.moveTo(px, top + 3);
    for (let i = 1; i <= 6; i++) { const kk = i / 6; g.lineTo(px - kk * FL, top + 3 + Math.sin(kk * 4 + p.t * 8 + p.seed) * (1 + kk * 2.4) + (st.walking ? Math.sin(p.ph - kk * 2) * kk * 1.5 : 0)); }
    g.lineTo(px - FL + 4 - flutter, top + 3 + FH);
    for (let i = 6; i >= 0; i--) { const kk = i / 6; g.lineTo(px - kk * FL, top + 3 + FH + Math.sin(kk * 4 + p.t * 8 + p.seed) * (1 + kk * 2.4)); }
    g.closePath();
    A.fillStroke(g, T.base, 2.1);
    g.save(); g.clip();
    g.fillStyle = T.hi; g.globalAlpha = 0.4; g.fillRect(px - FL - 6, top, FL + 10, 5); g.globalAlpha = 1;
    g.restore();
    g.strokeStyle = '#ffd447'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(px - 3, top + 5.5); g.lineTo(px - FL + 3, top + 5.5); g.moveTo(px - 3, top + FH + 0.5); g.lineTo(px - FL + 5, top + FH + 0.5); g.stroke();
    A.star(g, px - 13, top + 11.5, 5.4, 2.4, 5);
    A.fillStroke(g, '#ffd447', 1.2);
    // the arm holding the pole
    A.cap(g, 3.4, -16.8, px - 0.5, -8, 5.6, '#8f9eb3', 2);
    A.circ(g, px - 0.5, -8, 3.8, '#aab7ca', 1.8);

    // sword pose (same slash as the knight)
    let ang, hx0, hy0;
    if (p.strike >= 0) {
      const s = p.strike;
      ang = s < 0.3 ? lerp(-0.3, 0.7, s / 0.3) : lerp(0.7, -0.4, ease((s - 0.3) / 0.7));
      hx0 = lerp(13, 9, s); hy0 = lerp(-10, -9, s);
    } else {
      ang = lerp(-0.45, -2.2, p.wind);
      hx0 = lerp(9, 4, p.wind); hy0 = lerp(-9, -21, p.wind);
    }

    // steel breastplate + gold-trimmed tabard
    torso(g, 9.8, 8.8, 19, '#c0cbdc');
    A.gloss(g, 4.5, -14, 2.2, 5, 0.2, 0.55);
    g.beginPath();
    g.moveTo(-6, -18); g.lineTo(6, -18); g.lineTo(8.2, 9); g.lineTo(0, 6.4); g.lineTo(-8.2, 9);
    g.closePath();
    A.fillStroke(g, T.base, 2.1);
    g.fillStyle = T.hi; g.globalAlpha = 0.4; g.beginPath(); g.moveTo(1, -18); g.lineTo(6, -18); g.lineTo(8, 8.4); g.lineTo(1, 6.2); g.closePath(); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = '#ffd447'; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(-6, -17); g.lineTo(-8.2, 8.6); g.moveTo(6, -17); g.lineTo(8.2, 8.6); g.stroke();
    A.star(g, 0, -9, 5, 2.2, 5);
    A.fillStroke(g, '#ffd447', 1.2);
    A.rr(g, -8.8, -3.8, 17.6, 3.4, 1.4, '#6a4426', 1.6);
    A.rr(g, -2, -4.2, 4.2, 4.2, 1, '#ffd447', 1.2);
    A.circ(g, -7.8, -17.2, 5.4, '#d3dcea', 2);
    A.circ(g, -7.8, -17.2, 2.4, '#ffd447', 1.2);

    // sword arm
    sword(g, hx0, hy0, ang);
    arm(g, -2.6, -16.6, hx0, hy0, 5.8, '#aab7ca', '#aab7ca');

    // helm with a tall crest
    const hx = 1.2, hy = -31, r = 11;
    const wave = Math.sin(p.t * 5 + p.seed) * 1.6 + (st.walking ? Math.sin(p.ph) * 3 : 0);
    g.beginPath();
    g.moveTo(hx + 2, hy - r - 1);
    g.bezierCurveTo(hx - 2, hy - r - 18, hx - 18 - wave, hy - r - 20 + wave * 0.3, hx - 25 - wave, hy - 2 + wave * 0.5);
    g.bezierCurveTo(hx - 16 - wave, hy - r - 8, hx - 8, hy - r + 2, hx - 5, hy - r + 5);
    g.closePath();
    A.fillStroke(g, T.base, 2.1);
    g.strokeStyle = '#ffd447'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(hx, hy - r - 3); g.bezierCurveTo(hx - 4, hy - r - 14, hx - 14 - wave, hy - r - 15, hx - 21 - wave, hy - 3); g.stroke();
    A.circ(g, hx, hy, r + 1.3, '#cdd7e6', 2.4);
    g.beginPath(); g.roundRect(hx + 0.5, hy - 3.4, 12, 10.4, 3.2); g.fillStyle = SKIN; g.fill(); A.stroke(g, 1.9);
    eye(g, hx + 4.4, hy + 0.5, r); eye(g, hx + 8.9, hy + 0.5, r * 0.92);
    g.strokeStyle = INK; g.lineWidth = 1.8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx + 2.4, hy - 3); g.lineTo(hx + 6.2, hy - 2); g.moveTo(hx + 7.4, hy - 2); g.lineTo(hx + 11.4, hy - 3.2); g.stroke();
    A.ell(g, hx + 7.6, hy + 4.4, 3.6, 1.1, 0, '#6a4426', 1.2);   // moustache
    // gold band around the helm + gloss
    g.strokeStyle = '#ffd447'; g.lineWidth = 2.4;
    g.beginPath(); g.arc(hx, hy, r + 0.6, Math.PI * 1.08, Math.PI * 1.62); g.stroke();
    A.gloss(g, hx - 3, hy - 7.5, 4.6, 2, -0.4, 0.7);

    g.restore();
    if (p.strike >= 0 && p.strike < 0.45) swoosh(g, hx0 + st.lunge * 0.5, st.hipY + hy0, -1.9, 0.5, 20, 40, 0.75 * (1 - p.strike / 0.45));
  }

  Art.units.infantry = { peasant, knight, archer, crossbowman, spearman, mage, commander, face, hairCap, torso, arm, legs, stance, kiteShield, sword, swoosh, eye };
})();

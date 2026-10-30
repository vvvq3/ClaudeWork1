// ============================================================================
// ART TOOLKIT: colours, easing and outline helpers shared by all procedural art.
// Everything is drawn in a thick-ink-outline, cel-shaded cartoon style.
// ============================================================================
const Art = (window.Art = window.Art || {});

Art.INK = '#2a1810';   // outline colour used everywhere
Art.OL = 2.4;          // default outline width (art units)

Art.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
Art.lerp = (a, b, t) => a + (b - a) * t;
Art.ease = t => t * t * (3 - 2 * t);
Art.easeOut = t => 1 - (1 - t) * (1 - t);
Art.easeOutBack = t => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ---- colour helpers --------------------------------------------------------
Art.rgb = h => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
Art.hex = (r, g, b) =>
  '#' + [r, g, b].map(v => Math.round(Art.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
Art.mix = (a, b, t) => {
  const A = Art.rgb(a), B = Art.rgb(b);
  return Art.hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
};
// Shadows lean towards a deep violet and highlights towards warm white: richer than plain black/white.
Art.shade = (c, t) => Art.mix(c, '#2b1236', t);
Art.tint = (c, t) => Art.mix(c, '#fff4d6', t);

const palCache = new Map();
Art.pal = base => {
  let p = palCache.get(base);
  if (!p) {
    p = { base, hi: Art.tint(base, 0.38), lo: Art.shade(base, 0.28), deep: Art.shade(base, 0.52) };
    palCache.set(base, p);
  }
  return p;
};

Art.TEAM = {
  player: Art.pal('#dd3b36'),
  enemy: Art.pal('#3b78dc')
};
Art.TEAM.player.trim = Art.TEAM.enemy.trim = '#ffd447';

Art.STEEL = Art.pal('#b8c5d6');
Art.GOLD = Art.pal('#f6c433');
Art.WOOD = Art.pal('#9a6234');
Art.SKIN = Art.pal('#f7c9a1');

// ---- drawing helpers (all take a 2D context `g`) --------------------------
Art.stroke = (g, lw = Art.OL, col = Art.INK) => {
  if (!lw) return;
  g.lineWidth = lw;
  g.strokeStyle = col;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.stroke();
};
Art.fillStroke = (g, fill, lw = Art.OL, col = Art.INK) => {
  g.fillStyle = fill;
  g.fill();
  Art.stroke(g, lw, col);
};
Art.rr = (g, x, y, w, h, r, fill, lw) => {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  Art.fillStroke(g, fill, lw);
};
Art.circ = (g, x, y, r, fill, lw) => {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  Art.fillStroke(g, fill, lw);
};
Art.ell = (g, x, y, rx, ry, rot, fill, lw) => {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  Art.fillStroke(g, fill, lw);
};
Art.poly = (g, pts, fill, lw) => {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  Art.fillStroke(g, fill, lw);
};
// A rounded limb: ink-coloured thick line with a coloured thinner line on top.
Art.cap = (g, x1, y1, x2, y2, w, fill, ol = Art.OL) => {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.strokeStyle = Art.INK;
  g.lineWidth = w + ol * 2;
  g.stroke();
  g.strokeStyle = fill;
  g.lineWidth = w;
  g.stroke();
};
// Soft translucent highlight blob (the "gloss" on armour, noses, shields ...).
Art.gloss = (g, x, y, rx, ry, rot = 0, a = 0.5) => {
  g.save();
  g.globalAlpha *= a;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fill();
  g.restore();
};
Art.star = (g, x, y, rOut, rIn, points, rot = 0) => {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = rot + (i * Math.PI) / points - Math.PI / 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
};

// Offscreen canvas factory (device-pixel aware).
Art.canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

// Deterministic random so cached scenery looks identical after every resize.
Art.rng = seed => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

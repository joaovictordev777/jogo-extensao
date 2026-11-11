'use strict';
/* =========================================================
   ART — tudo é desenhado com formas geométricas (sem imagens!)
   ========================================================= */

const OUTLINE = 'rgba(22,12,36,0.9)';

function limb(g, x1, y1, x2, y2, w, color) {
  g.lineCap = 'round';
  g.strokeStyle = OUTLINE;
  g.lineWidth = w + 4;
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.strokeStyle = color;
  g.lineWidth = w;
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
}

function blob(g, x, y, r, color) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = OUTLINE;
  g.stroke();
}

function poly(g, pts, color, stroke = true) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fillStyle = color;
  g.fill();
  if (stroke) {
    g.lineJoin = 'round';
    g.lineWidth = 2.5;
    g.strokeStyle = OUTLINE;
    g.stroke();
  }
}

function box(g, x, y, w, h, r, color) {
  roundRect(g, x, y, w, h, r);
  g.fillStyle = color;
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = OUTLINE;
  g.stroke();
}

function glow(g, x, y, r, color) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(0.35, color);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/* ---------- Esqueleto animado ----------
   Cada pose diz onde ficam as mãos (fh = mão da frente, bh = mão de trás),
   os pés (ff / bf), a inclinação do tronco (lean) e o agachamento (crouch).
   Braços e pernas são calculados com "cinemática inversa": o código descobre
   sozinho onde dobrar o cotovelo e o joelho para a mão/pé chegar no alvo! */

const GUARD = { fh: [24, -76], bh: [12, -70], ff: [14, 0], bf: [-14, 0], lean: 0.06, crouch: 4 };

const POSES = {
  idle: (t) => ({ ...GUARD, crouch: 4 + Math.sin(t * 5) * 1.5, fh: [24, -76 + Math.sin(t * 5) * 1.5] }),
  walk: (t, dir = 1) => {
    const s = Math.sin(t * 13);
    const c = Math.cos(t * 13);
    return {
      fh: [22 + s * 5, -74], bh: [10 - s * 5, -68],
      ff: [10 + s * 15, -Math.max(0, c) * 9], bf: [-10 - s * 15, -Math.max(0, -c) * 9],
      lean: dir > 0 ? 0.16 : -0.06, crouch: 3 + Math.abs(c) * 3,
    };
  },
  jump: () => ({ fh: [26, -100], bh: [-22, -96], ff: [18, -26], bf: [-8, -12], lean: 0, crouch: 0 }),
  fall: () => ({ fh: [30, -88], bh: [-26, -90], ff: [12, -6], bf: [-12, -2], lean: -0.05, crouch: 0 }),
  charge: (t) => ({ fh: [26, -46], bh: [-26, -46], ff: [24, 0], bf: [-24, 0], lean: -0.06, crouch: 12 + Math.sin(t * 30) * 1.5 }),
  block: () => ({ fh: [22, -94], bh: [26, -82], ff: [14, 0], bf: [-20, 0], lean: -0.12, crouch: 8 }),
  hurt: () => ({ fh: [-6, -60], bh: [-30, -78], ff: [8, 0], bf: [-18, 0], lean: -0.42, crouch: 6 }),
  launched: (t) => ({ fh: [12 + Math.sin(t * 20) * 8, -112], bh: [-30, -102], ff: [26, -22], bf: [6, -10], lean: -0.6, crouch: 0 }),
  lying: () => ({ fh: [22, -58], bh: [-22, -56], ff: [12, 0], bf: [-12, 0], lean: 0, crouch: 0 }),
  getup: () => ({ fh: [26, -40], bh: [-10, -40], ff: [16, 0], bf: [-20, 0], lean: 0.3, crouch: 20 }),
  beamCharge: () => ({ fh: [-24, -56], bh: [-28, -52], ff: [24, 0], bf: [-26, 0], lean: -0.2, crouch: 12 }),
  beamFire: () => ({ fh: [54, -66], bh: [50, -62], ff: [26, 0], bf: [-30, 0], lean: 0.24, crouch: 10 }),
  sphereHold: () => ({ fh: [8, -150], bh: [-8, -150], ff: [18, 0], bf: [-18, 0], lean: -0.08, crouch: 2 }),
  sphereThrow: () => ({ fh: [58, -98], bh: [52, -92], ff: [24, 0], bf: [-26, 0], lean: 0.38, crouch: 6 }),
  teleport: () => ({ fh: [16, -112], bh: [10, -66], ff: [10, 0], bf: [-10, 0], lean: 0, crouch: 2 }),
  blast: () => ({ fh: [58, -78], bh: [0, -66], ff: [22, 0], bf: [-22, 0], lean: 0.22, crouch: 6 }),
  win: (t) => ({ fh: [16, -146], bh: [-14, -64], ff: [12, 0], bf: [-12, 0], lean: -0.05, crouch: 2 + Math.sin(t * 4) }),
};

function mergePose(base, over) { return over ? { ...base, ...over } : base; }

// Suaviza a troca de poses (as articulações "deslizam" até o alvo)
function blendPose(cur, target, k) {
  if (!cur) return clonePose(target);
  for (const key of ['fh', 'bh', 'ff', 'bf']) {
    cur[key][0] += (target[key][0] - cur[key][0]) * k;
    cur[key][1] += (target[key][1] - cur[key][1]) * k;
  }
  cur.lean += ((target.lean || 0) - cur.lean) * k;
  cur.crouch += ((target.crouch || 0) - cur.crouch) * k;
  return cur;
}

function clonePose(p) {
  return { fh: p.fh.slice(), bh: p.bh.slice(), ff: p.ff.slice(), bf: p.bf.slice(), lean: p.lean || 0, crouch: p.crouch || 0 };
}

// Cinemática inversa de 2 ossos: acha o cotovelo/joelho
function ik2(ax, ay, bx, by, l1, l2, side) {
  let dx = bx - ax;
  let dy = by - ay;
  let d = Math.hypot(dx, dy);
  const maxd = l1 + l2 - 0.01;
  if (d > maxd) { bx = ax + (dx / d) * maxd; by = ay + (dy / d) * maxd; dx = bx - ax; dy = by - ay; d = maxd; }
  d = Math.max(d, 0.001);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = ax + (dx * a) / d;
  const my = ay + (dy * a) / d;
  return { ex: mx + (side * -dy * h) / d, ey: my + (side * dx * h) / d, bx, by };
}

const SPIKY = [[-12, -96], [-28, -100], [-17, -108], [-31, -119], [-14, -118], [-15, -136], [-1, -122], [5, -142], [10, -122], [23, -134], [19, -117], [29, -114], [18, -111], [14, -108], [10, -113], [5, -109], [0, -115], [-5, -104], [-10, -94]];
const SUPER_SPIKY = SPIKY.map(([x, y]) => [x * 1.1, y < -104 ? -104 + (y + 104) * 1.45 : y]);
const FLAME = [[-12, -98], [-19, -112], [-13, -120], [-18, -140], [-7, -130], [-3, -156], [4, -134], [11, -152], [12, -130], [22, -142], [19, -118], [24, -110], [15, -113], [9, -118], [3, -110], [-3, -115], [-8, -104]];

function drawArm(g, sx, sy, hand, cfg, big) {
  const k = ik2(sx, sy, hand[0], hand[1], 23, 23, 1);
  limb(g, sx, sy, k.ex, k.ey, 11, cfg.skin);
  limb(g, sx, sy, sx + (k.ex - sx) * 0.6, sy + (k.ey - sy) * 0.6, 15, cfg.sleeve || cfg.gi);
  limb(g, k.ex, k.ey, k.bx, k.by, 10, cfg.skin);
  if (cfg.wrist) limb(g, k.ex + (k.bx - k.ex) * 0.6, k.ey + (k.by - k.ey) * 0.6, k.ex + (k.bx - k.ex) * 0.85, k.ey + (k.by - k.ey) * 0.85, 12, cfg.wrist);
  blob(g, k.bx, k.by, big ? 9.5 : 7, cfg.glove || cfg.skin);
  if (cfg.pads) blob(g, sx, sy + 2, 11, cfg.pads);
}

function drawLeg(g, hx, hy, foot, cfg, pants) {
  const k = ik2(hx, hy, foot[0], foot[1] - 8, 24, 24, -1);
  limb(g, hx, hy, k.ex, k.ey, 16, pants);
  limb(g, k.ex, k.ey, k.bx, k.by, 14, pants);
  const ang = Math.atan2(k.by - k.ey, k.bx - k.ex);
  g.save();
  g.translate(k.bx, k.by);
  g.rotate(ang - Math.PI / 2);
  box(g, -8, -4, 20, 12, 4, cfg.boots);
  g.restore();
}

function drawAura(g, t, color, big = 1) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const k = (1 + i * 0.2) * big;
    g.globalAlpha = 0.28 - i * 0.07;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, 6);
    g.bezierCurveTo(-58 * k, -8, -44 * k + Math.sin(t * 22 + i) * 7, -112 * k, 0, -158 * k - Math.sin(t * 27 + i) * 12);
    g.bezierCurveTo(44 * k + Math.cos(t * 21 + i) * 7, -112 * k, 58 * k, -8, 0, 6);
    g.fill();
  }
  g.restore();
}

function drawLightning(g, t) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = '#b3f5ff';
  g.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    if (Math.sin(t * 37 + i * 11) < 0.3) continue;
    let x = rand(-34, 34);
    let y = rand(-130, -20);
    g.beginPath();
    g.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += rand(-10, 10); y += rand(6, 14); g.lineTo(x, y); }
    g.stroke();
  }
  g.restore();
}

/**
 * Desenha um lutador.
 * o: { facing, scale, pose ou joints, t, aura, super, flash, alpha, lie (0..1), face, bigFist }
 */
function drawCharacter(g, cfg, x, y, o = {}) {
  const s = (o.scale || 1) * (cfg.scale || 1);
  const facing = o.facing || 1;
  const t = o.t || 0;
  const J = o.joints || (POSES[o.pose] || POSES.idle)(t, 1);
  const superMode = !!o.super;
  const isSpiky = cfg.hair === 'spiky';
  const hairColor = superMode && isSpiky ? '#ffe14d' : cfg.hairColor;
  const pants = cfg.pants || cfg.gi;
  const face = o.face || (o.pose === 'hurt' ? 'hurt' : o.pose === 'charge' ? 'shout' : 'normal');

  g.save();
  g.translate(x, y);
  g.scale(facing * s, s);
  if (o.alpha !== undefined) g.globalAlpha = o.alpha;
  if (o.flash) g.filter = 'brightness(2.6)';
  if (o.aura) drawAura(g, t, o.aura, o.auraBig || 1);

  const lie = o.lie || 0;
  if (lie > 0) { g.translate(0, -14 * lie); g.rotate((-Math.PI / 2) * lie); }

  const hipY = -44 + (J.crouch || 0);
  const a = J.lean || 0;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  // converte um ponto do "tronco" para a posição real (girando junto com a inclinação)
  const tp = (px, py) => [px * ca - py * sa, hipY + px * sa + py * ca];
  const shB = tp(-10, -36);
  const shF = tp(12, -36);
  const torsoFrame = (fn) => { g.save(); g.translate(0, hipY); g.rotate(a); g.translate(0, 44); fn(); g.restore(); };

  if (cfg.cape) {
    torsoFrame(() => {
      const wv = Math.sin(t * 6) * 5;
      poly(g, [[-14, -86], [12, -86], [16, -8 + wv], [-42 + wv, -4]], cfg.cape);
    });
  }

  drawArm(g, shB[0], shB[1], J.bh, cfg, o.bigFist === 'bh');
  drawLeg(g, -6, hipY, J.bf, cfg, pants);
  drawLeg(g, 6, hipY, J.ff, cfg, pants);

  torsoFrame(() => {
    box(g, -17, -88, 34, 48, 9, cfg.gi);
    if (cfg.armor) {
      box(g, -19, -90, 38, 34, 10, cfg.armor);
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, -84); g.lineTo(0, -60); g.moveTo(-12, -70); g.lineTo(12, -70); g.stroke();
    } else {
      poly(g, [[-8, -88], [8, -88], [0, -72]], cfg.shirt);
    }
    box(g, -18, -52, 36, 8, 3, cfg.belt);
    if (!cfg.armor) poly(g, [[-14, -46], [-24, -34], [-17, -32], [-10, -44]], cfg.belt);

    box(g, -5, -94, 11, 9, 2, cfg.skin);
    if (cfg.hair === 'helmet') {
      box(g, -14, -124, 34, 36, 11, cfg.skin);
      box(g, 2, -112, 20, 9, 4, hairColor);
      glow(g, 14, -108, 12, hairColor);
    } else {
      blob(g, 3, -104, 16, cfg.skin);
      if (cfg.hair === 'horns') poly(g, [[-6, -106], [-14, -114], [-8, -98]], cfg.skin);
      else blob(g, -4, -103, 4, cfg.skin);
      drawFace(g, cfg, face, t, superMode && isSpiky);
    }

    switch (cfg.hair) {
      case 'spiky': poly(g, superMode ? SUPER_SPIKY : SPIKY, hairColor); break;
      case 'flame': poly(g, FLAME, hairColor); break;
      case 'horns':
        poly(g, [[-6, -116], [-14, -140], [1, -119]], hairColor);
        poly(g, [[7, -119], [13, -142], [16, -115]], hairColor);
        break;
      case 'ninja': {
        poly(g, SPIKY.map(([px, py]) => [px * 0.85, -104 + (py + 104) * 0.7]), '#20202c');
        const wv = Math.sin(t * 12) * 4;
        poly(g, [[-12, -112], [-36, -120 + wv], [-38, -108 + wv], [-12, -106]], hairColor);
        box(g, -14, -116, 35, 8, 3, hairColor);
        box(g, -1, -101, 21, 13, 5, cfg.shirt);
        break;
      }
      case 'crown':
        poly(g, [[-12, -112], [-8, -134], [1, -119], [7, -140], [12, -118], [22, -130], [19, -108], [4, -116]], hairColor);
        break;
      case 'bald':
        if (cfg.beard) {
          poly(g, [[-1, -98], [21, -98], [13, -74], [4, -78]], cfg.beard);
          poly(g, [[-12, -112], [-16, -104], [-9, -100]], cfg.beard);
        }
        break;
      default: break;
    }

    if (cfg.scouter) {
      g.save();
      g.globalAlpha *= 0.75;
      box(g, 11, -112, 12, 9, 3, cfg.scouter);
      g.restore();
      limb(g, -2, -103, 11, -108, 2, '#dddddd');
    }
  });

  drawArm(g, shF[0], shF[1], J.fh, cfg, o.bigFist === 'fh');

  if (superMode) drawLightning(g, t);
  g.filter = 'none';
  g.restore();
}

function drawFace(g, cfg, face, t, superEyes) {
  const hurt = face === 'hurt';
  g.lineCap = 'round';
  if (hurt) {
    g.strokeStyle = OUTLINE;
    g.lineWidth = 2.5;
    for (const ex of [8, 15]) {
      g.beginPath();
      g.moveTo(ex - 3, -108); g.lineTo(ex + 3, -102);
      g.moveTo(ex + 3, -108); g.lineTo(ex - 3, -102);
      g.stroke();
    }
  } else {
    const blink = face === 'normal' && Math.sin(t * 1.7) > 0.985;
    for (const ex of [8, 15.5]) {
      g.fillStyle = '#fff';
      g.beginPath();
      g.ellipse(ex, -105, 3.2, blink ? 0.6 : 4.2, 0, 0, Math.PI * 2);
      g.fill();
      if (!blink) {
        g.fillStyle = superEyes ? '#00bfa5' : cfg.eyes || '#1b1030';
        g.beginPath();
        g.arc(ex + 1.2, -105, 2, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.strokeStyle = cfg.hair === 'bald' && cfg.beard ? cfg.beard : OUTLINE;
    g.lineWidth = cfg.hair === 'horns' || cfg.beard ? 4 : 2.8;
    g.beginPath();
    g.moveTo(3, -114); g.lineTo(11, -109.5);
    g.moveTo(13, -109.5); g.lineTo(20, -113);
    g.stroke();
  }
  g.strokeStyle = OUTLINE;
  g.lineWidth = 2;
  if (face === 'shout' || hurt) {
    g.fillStyle = '#5a1a2a';
    g.beginPath();
    g.ellipse(13, -95, 3.4, hurt ? 2.4 : 3.4, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    g.beginPath();
    g.moveTo(10, -95); g.lineTo(16, -96);
    g.stroke();
  }
}


/* ---------- Fundos das arenas ---------- */
const bgCache = new Map();

function mountainLayer(rnd, baseY, amp, step) {
  const pts = [];
  let y = baseY;
  for (let x = -40; x <= W + 40; x += step) {
    y = clamp(y + (rnd() - 0.5) * amp, baseY - amp * 1.4, baseY + amp * 0.6);
    pts.push([x, y]);
  }
  return pts;
}

function getBgData(seed) {
  if (!bgCache.has(seed)) {
    const rnd = mulberry32(seed * 97 + 3);
    bgCache.set(seed, {
      far: mountainLayer(rnd, 300, 90, 60),
      near: mountainLayer(rnd, 370, 60, 45),
      stars: Array.from({ length: 90 }, () => [rnd() * W, rnd() * 380, rnd() * 1.8 + 0.4, rnd() * 6]),
      clouds: Array.from({ length: 5 }, () => [rnd() * W, 50 + rnd() * 140, 0.6 + rnd() * 0.8]),
    });
  }
  return bgCache.get(seed);
}

function fillMountains(g, pts, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(-40, H);
  for (const [x, y] of pts) g.lineTo(x, y);
  g.lineTo(W + 40, H);
  g.closePath();
  g.fill();
}

function drawArenaBg(g, theme, seed, t, groundY = 462) {
  const d = getBgData(seed);
  const sky = g.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, theme.sky[0]);
  sky.addColorStop(1, theme.sky[1]);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  if (theme.deco === 'stars' || theme.deco === 'snow') {
    for (const [x, y, r, ph] of d.stars) {
      g.globalAlpha = theme.deco === 'stars' ? 0.5 + Math.sin(t * 3 + ph) * 0.5 : 0.25;
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }
  if (theme.deco === 'stars') {
    glow(g, 760, 120, 120, 'rgba(224,64,251,0.5)');
    blob(g, 760, 120, 44, '#5e35b1');
    g.strokeStyle = 'rgba(255,255,255,0.4)';
    g.lineWidth = 4;
    g.beginPath(); g.ellipse(760, 120, 80, 16, -0.3, 0, Math.PI * 2); g.stroke();
  } else {
    glow(g, 790, 110, 110, theme.deco === 'snow' ? 'rgba(255,255,255,0.6)' : 'rgba(255,220,120,0.8)');
    g.fillStyle = theme.deco === 'snow' ? '#f4f8ff' : '#fff3c4';
    g.beginPath(); g.arc(790, 110, 42, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [cx, cy, k] of d.clouds) {
      const x = ((cx + t * 12 * k) % (W + 200)) - 100;
      g.beginPath();
      g.ellipse(x, cy, 50 * k, 16 * k, 0, 0, Math.PI * 2);
      g.ellipse(x + 30 * k, cy - 10 * k, 30 * k, 16 * k, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  fillMountains(g, d.far, theme.mount[0]);
  fillMountains(g, d.near, theme.mount[1]);

  // Chão da arena
  g.fillStyle = theme.floor;
  g.fillRect(0, groundY - 6, W, H - groundY + 6);
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(0, groundY - 6, W, 4);
  g.strokeStyle = theme.floorLine;
  g.lineWidth = 2;
  for (let i = -10; i <= 10; i++) {
    g.beginPath();
    g.moveTo(W / 2 + i * 60, groundY - 2);
    g.lineTo(W / 2 + i * 150, H);
    g.stroke();
  }
  for (const yy of [490, 515]) {
    g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke();
  }

  if (theme.deco === 'snow') {
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 60; i++) {
      const x = (hash2(i, 1) * W + Math.sin(t + i) * 20 + W) % W;
      const y = (hash2(i, 2) * H + t * (30 + hash2(i, 3) * 50)) % H;
      g.beginPath(); g.arc(x, y, 1.5 + hash2(i, 4) * 2, 0, Math.PI * 2); g.fill();
    }
  }
}

/* ---------- Peças do mapa ---------- */
function drawTree(g, x, baseY, theme, t, tx, ty) {
  const sway = Math.sin(t * 1.5 + tx * 0.7 + ty) * 1.5;
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.beginPath(); g.ellipse(x, baseY - 4, 20, 7, 0, 0, Math.PI * 2); g.fill();
  switch (theme.treeStyle) {
    case 'cactus':
      box(g, x - 7, baseY - 50, 14, 48, 7, theme.tree);
      box(g, x - 20, baseY - 38, 9, 20, 4, theme.tree);
      box(g, x + 11, baseY - 44, 9, 22, 4, theme.tree);
      limb(g, x - 15, baseY - 22, x - 6, baseY - 22, 6, theme.tree);
      limb(g, x + 15, baseY - 26, x + 6, baseY - 26, 6, theme.tree);
      break;
    case 'pine':
      box(g, x - 4, baseY - 14, 8, 12, 2, '#6d4c2f');
      poly(g, [[x - 22, baseY - 12], [x + sway, baseY - 46], [x + 22, baseY - 12]], theme.tree);
      poly(g, [[x - 17, baseY - 32], [x + sway, baseY - 66], [x + 17, baseY - 32]], theme.tree);
      poly(g, [[x - 8 + sway, baseY - 56], [x + sway, baseY - 68], [x + 8 + sway, baseY - 56]], '#ffffff', false);
      break;
    case 'crystal':
      glow(g, x, baseY - 26, 34, 'rgba(179,136,255,0.5)');
      poly(g, [[x - 14, baseY - 4], [x - 18, baseY - 34], [x - 6, baseY - 58], [x + 4, baseY - 30], [x, baseY - 4]], theme.tree);
      poly(g, [[x, baseY - 4], [x + 4, baseY - 40], [x + 14, baseY - 50], [x + 18, baseY - 20], [x + 12, baseY - 4]], theme.tree2);
      break;
    default:
      box(g, x - 5, baseY - 22, 10, 20, 3, '#7a5233');
      blob(g, x - 11 + sway, baseY - 32, 14, theme.tree);
      blob(g, x + 11 + sway, baseY - 32, 14, theme.tree);
      blob(g, x + sway, baseY - 46, 17, theme.tree2);
      break;
  }
}

function drawRock(g, x, baseY, theme) {
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.beginPath(); g.ellipse(x, baseY - 5, 20, 6, 0, 0, Math.PI * 2); g.fill();
  poly(g, [[x - 19, baseY - 6], [x - 14, baseY - 26], [x + 2, baseY - 34], [x + 17, baseY - 22], [x + 20, baseY - 6]], theme.rock);
  g.fillStyle = 'rgba(255,255,255,0.3)';
  g.beginPath(); g.ellipse(x - 4, baseY - 24, 6, 3, -0.4, 0, Math.PI * 2); g.fill();
}

function drawSign(g, x, baseY, t) {
  box(g, x - 3, baseY - 30, 6, 28, 2, '#7a5233');
  box(g, x - 20, baseY - 50, 40, 26, 5, '#c58b4a');
  text(g, '</>', x, baseY - 32, { size: 15, color: '#2b1a10', align: 'center', font: 'Consolas, monospace', weight: '700' });
  const pulse = 0.5 + Math.sin(t * 4) * 0.5;
  g.globalAlpha = 0.5 * pulse;
  glow(g, x, baseY - 38, 30, '#4fc3f7');
  g.globalAlpha = 1;
}

function drawOrb(g, x, y, t, phase) {
  const by = y - 20 + Math.sin(t * 3 + phase) * 5;
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.beginPath(); g.ellipse(x, y - 4, 10, 4, 0, 0, Math.PI * 2); g.fill();
  glow(g, x, by, 30, 'rgba(255,170,40,0.8)');
  blob(g, x, by, 11, '#ffb52e');
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath(); g.arc(x - 4, by - 4, 3.5, 0, Math.PI * 2); g.fill();
  text(g, '★', x, by + 4, { size: 11, color: '#d84315', align: 'center' });
}

function drawPortal(g, x, baseY, t, color) {
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.ellipse(x, baseY - 4, 34, 10, 0, 0, Math.PI * 2); g.fill();
  glow(g, x, baseY - 46, 70, color);
  g.save();
  g.translate(x, baseY - 46);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    g.rotate(t * 0.6 + i);
    g.strokeStyle = i % 2 ? '#ffffff' : color;
    g.globalAlpha = 0.55;
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(0, 0, 26 + i * 2, 42 - i * 3, 0, 0.3, Math.PI * 1.6);
    g.stroke();
  }
  g.restore();
  g.globalAlpha = 1;
  text(g, 'ARENA', x, baseY - 100, { size: 24, color: '#ffd54a', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 6 });
}

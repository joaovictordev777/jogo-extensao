'use strict';
/* =========================================================
   FINISHER — finalizações cinematográficas!
   Cada finalização é uma LISTA DE PASSOS (como um roteiro de filme):
   o código executa um passo, espera ele terminar e vai para o próximo.
   Cada inimigo tem a sua (veja FINISHERS no final do arquivo).
   ========================================================= */

const easeOut = (k) => 1 - (1 - k) * (1 - k);
const easeIn = (k) => k * k;

const FP = () => Fight.p;
const FE = () => Fight.e;
const enemyCenter = () => ({ x: FE().x, y: FE().y - FE().h * 0.55 });
const setPose = (f, pose) => { f.poseOverride = pose; };

function finHit(x, y, dir, big, word, color = '#ffd54a') {
  FX.burst(x, y, '#ffffff', big ? 26 : 10, big ? 500 : 280, big ? 5 : 3.5);
  FX.burst(x, y, color, big ? 16 : 6, big ? 380 : 220, big ? 4 : 3);
  FX.ring(x, y, color, big ? 130 : 50, big ? 0.45 : 0.22);
  FX.sparks(x, y, dir, '#ffffff', big ? 12 : 6, big ? 70 : 40);
  if (word) FX.pop(x + rand(-20, 20), y - 40, word, big ? '#ff7a3c' : '#ffd54a', big ? 52 : 30);
  FX.shake = Math.max(FX.shake, big ? 18 : 7);
  Sound.play(big ? 'heavy' : 'hit');
  FE().flash = 0.08;
}

// Inimigo bate no chão: cratera, poeira e tremor
function crater(word = 'CRASH!') {
  const e = FE();
  e.y = GROUND_Y;
  e.spin = 0;
  e.onGround = true;
  e.state = 'ko';
  setPose(e, POSES.lying(0));
  FX.ring(e.x, GROUND_Y, '#ffffff', 230, 0.6);
  FX.ring(e.x, GROUND_Y, '#ffd54a', 150, 0.45);
  FX.dust(e.x, GROUND_Y, 26);
  FX.burst(e.x, GROUND_Y - 10, '#c8b89a', 24, 420, 5, 900);
  FX.pop(e.x, GROUND_Y - 130, word, '#ff7a3c', 56);
  FX.shake = 24;
  Sound.play('boom');
  Fin.craters.push({ x: e.x });
}

function bigBoom(x, y, color = '#ffd54a') {
  FX.burst(x, y, '#ffffff', 50, 650, 7, 0);
  FX.burst(x, y, color, 40, 480, 6, 0);
  FX.ring(x, y, color, 360, 0.8);
  FX.ring(x, y, '#ffffff', 240, 0.6);
  FX.pop(x, y - 80, 'KABOOOOM!', '#ff7a3c', 64);
  FX.shake = 28;
  Fight.flashA = 1;
  Sound.play('boom');
}

/* ---------- Motor ---------- */
const Fin = {
  steps: null,
  i: 0,
  t: 0,
  total: 0,
  dir: 1,
  n: -1,
  zoom: 1.25,
  dark: 0,
  darkT: 0,
  beam: null,
  sphere: null,
  dragon: null,
  wave: null,
  star: null,
  chargeGlow: 0,
  bolts: [],
  clones: [],
  orbs: [],
  pillars: [],
  craters: [],
  saved: {},

  reset() {
    this.steps = null;
    this.dark = 0;
    this.darkT = 0;
    this.zoom = 1.25;
    this.beam = null;
    this.sphere = null;
    this.dragon = null;
    this.wave = null;
    this.star = null;
    this.chargeGlow = 0;
    this.bolts = [];
    this.clones = [];
    this.orbs = [];
    this.pillars = [];
    this.craters = [];
    this.saved = {};
  },

  start(def) {
    this.reset();
    this.steps = def.steps();
    this.i = -1;
    this.total = 0;
    Fight.finBanner = { text: def.name, color: def.color || '#ffd54a' };
    this.next();
  },

  next() {
    this.i++;
    if (this.i >= this.steps.length) {
      this.steps = null;
      this.darkT = 0;
      Fight.endFinisher();
      return;
    }
    this.t = 0;
    const s = this.steps[this.i];
    if (s.start) s.start();
  },

  update(dt) {
    this.updateFx(dt);
    if (!this.steps) return;
    const s = this.steps[this.i];
    this.t += dt;
    this.total += dt;
    const k = clamp(this.t / s.d, 0, 1);
    if (s.update) s.update(k, dt);
    if (this.t >= s.d) {
      if (s.end) s.end();
      this.next();
    }
  },

  updateFx(dt) {
    this.dark = lerp(this.dark, this.darkT, Math.min(1, dt * 5));
    for (const b of this.bolts) b.life -= dt;
    this.bolts = this.bolts.filter((b) => b.life > 0);
    for (const o of this.orbs) {
      o.t += dt / 0.25;
      o.x = lerp(o.x0, o.tx, o.t);
      o.y = lerp(o.y0, o.ty, o.t);
      if (o.t >= 1) { o.dead = true; finHit(o.x, o.y, Fin.dir, false, pick(['ZAP!', 'BUM!', 'PAF!']), '#7ef9ff'); }
    }
    this.orbs = this.orbs.filter((o) => !o.dead);
    if (this.star) this.star.t += dt;
    for (const p of this.pillars) p.life -= dt;

    // Câmera acompanha a ação
    const p = FP();
    const e = FE();
    let x = e.hidden ? p.x : (p.x + e.x) / 2;
    let y = (e.hidden ? p.y : Math.min(p.y, e.y)) - 80;
    if (this.sphere) y = Math.min(y, this.sphere.y + 60);
    if (this.star) { x = this.star.x; y = this.star.y + 60; }
    Fight.camT = { x, y, z: this.zoom };
  },

  /* ---------- Desenho ---------- */
  drawBack(g) {
    for (const c of this.craters) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath(); g.ellipse(c.x, GROUND_Y + 4, 80, 14, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.45)';
      g.lineWidth = 3;
      g.beginPath();
      for (const a of [-0.9, -0.3, 0.4, 1.0]) { g.moveTo(c.x, GROUND_Y + 4); g.lineTo(c.x + Math.cos(a) * 110, GROUND_Y + 4 + Math.sin(a) * 18); }
      g.stroke();
    }
    if (this.wave) {
      glow(g, this.wave.x, GROUND_Y - 10, 70, this.wave.color);
      FX.dust(this.wave.x, GROUND_Y, 1);
    }
  },

  drawFront(g) {
    const p = FP();
    const t = Fight.t;
    // Pilares de energia
    for (const pl of this.pillars) {
      const a = clamp(pl.life / 0.4, 0, 1);
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.5 * a;
      g.fillStyle = pl.color;
      g.fillRect(pl.x - pl.w / 2, GROUND_Y - pl.h, pl.w, pl.h);
      g.globalAlpha = a;
      g.fillStyle = '#ffffff';
      g.fillRect(pl.x - pl.w / 6, GROUND_Y - pl.h, pl.w / 3, pl.h);
      g.restore();
      glow(g, pl.x, GROUND_Y, 80 * a, pl.color);
    }
    // Brilho carregando na mão
    if (this.chargeGlow > 0) {
      const h = limbWorld(p, [-30, -54]);
      glow(g, h.x, h.y, 14 + this.chargeGlow * 60, this.beam ? this.beam.color : '#7ef9ff');
    }
    // Onda gigante
    if (this.beam && this.beam.w > 1) {
      const h = limbWorld(p, [60, -64]);
      const end = this.dir > 0 ? W + 300 : -300;
      const wob = Math.sin(t * 60) * 4;
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const [k, col, a] of [[1, this.beam.color, 0.35], [0.65, this.beam.color, 0.7], [0.3, '#ffffff', 1]]) {
        const hh = Math.max(0, this.beam.w * k + wob);
        g.globalAlpha = a;
        g.fillStyle = col;
        roundRect(g, Math.min(h.x, end), h.y - hh / 2, Math.abs(end - h.x), hh, hh / 2);
        g.fill();
      }
      g.restore();
      glow(g, h.x, h.y, this.beam.w * 1.2, this.beam.color);
    }
    // Esfera gigante
    if (this.sphere) {
      const s = this.sphere;
      glow(g, s.x, s.y, s.r * 2.3, 'rgba(255,200,60,0.9)');
      blob(g, s.x, s.y, s.r, '#ffe082');
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.beginPath(); g.arc(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.35, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.6)';
      g.lineWidth = 3;
      g.beginPath(); g.ellipse(s.x, s.y, s.r * 1.3, s.r * 0.35, t * 2, 0, Math.PI * 2); g.stroke();
    }
    // Dragão de energia
    if (this.dragon && this.dragon.pts.length) {
      const D = this.dragon;
      const n = D.pts.length;
      for (let i = n - 1; i >= 0; i--) {
        const [x, y] = D.pts[i];
        const r = 6 + (1 - i / n) * 18;
        if (i % 3 === 0) glow(g, x, y, r * 2.2, D.color);
        blob(g, x, y, r, i % 2 ? D.color : '#fff3c4');
      }
      const [hx, hy] = D.pts[0];
      const [nx, ny] = D.pts[Math.min(2, n - 1)];
      const ang = Math.atan2(hy - ny, hx - nx);
      g.save();
      g.translate(hx, hy);
      g.rotate(ang);
      poly(g, [[-10, -18], [-30, -36], [-2, -20]], '#fff3c4');
      poly(g, [[-10, 18], [-30, 36], [-2, 20]], '#fff3c4');
      blob(g, 0, 0, 26, D.color);
      poly(g, [[14, -14], [40, -6], [40, 6], [14, 14]], D.color);
      g.fillStyle = '#d50000';
      g.beginPath(); g.arc(8, -9, 4, 0, Math.PI * 2); g.arc(8, 9, 4, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    // Raios
    for (const b of this.bolts) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const [w, col] of [[b.w * 2.5, b.color], [b.w, '#ffffff']]) {
        g.strokeStyle = col;
        g.lineWidth = w;
        g.lineJoin = 'round';
        g.beginPath();
        let x = b.x + rand(-30, 30);
        g.moveTo(x, -80);
        const steps = 9;
        for (let i = 1; i <= steps; i++) {
          const yy = -80 + ((b.y + 80) * i) / steps;
          x = i === steps ? b.x : b.x + rand(-28, 28);
          g.lineTo(x, yy);
        }
        g.stroke();
      }
      g.restore();
      glow(g, b.x, b.y, 50, b.color);
    }
    // Clones
    for (const c of this.clones) {
      if (this.t < c.t0) continue;
      const pose = this.t >= c.hitAt ? c.hitP : c.windP;
      drawCharacter(g, HERO, c.x, c.y, { facing: c.facing, joints: pose, t, tint: '#7ef9ff', alpha: 0.8 });
      glow(g, c.x, c.y - 60, 40, '#7ef9ff');
    }
    // Rajadas da chuva de ki
    for (const o of this.orbs) {
      glow(g, o.x, o.y, 26, '#7ef9ff');
      blob(g, o.x, o.y, 7, '#ffffff');
    }
    // Estrelinha "PING!" de quando o inimigo voa para longe
    if (this.star) {
      const s = this.star;
      const k = clamp(s.t / 0.8, 0, 1);
      const r = Math.sin(k * Math.PI) * 34;
      if (r > 0.5) {
        glow(g, s.x, s.y, r * 2.4, '#ffe14d');
        g.save();
        g.translate(s.x, s.y);
        g.rotate(s.t * 5);
        poly(g, [[0, -r], [r * 0.22, -r * 0.22], [r, 0], [r * 0.22, r * 0.22], [0, r], [-r * 0.22, r * 0.22], [-r, 0], [-r * 0.22, -r * 0.22]], '#ffffff', false);
        g.restore();
      }
    }
  },
};

/* ---------- Passos (peças de montar as finalizações) ---------- */
const FS = {
  // Câmera fecha, aura acende e o nome da finalização aparece
  intro: (d = 0.9) => ({
    d,
    start() {
      const p = FP();
      const e = FE();
      Fin.dir = Math.sign(e.x - p.x) || 1;
      Fin.saved = { px: p.x, py: p.y, ey: e.y };
      p.state = 'finisher';
      p.facing = Fin.dir;
      e.state = 'hurt';
      e.facing = -Fin.dir;
      p.finAura = '#7ef9ff';
      setPose(p, POSES.charge(0));
      setPose(e, POSES.hurt(0));
      Fin.zoom = 1.3;
      Fight.flashA = 0.6;
      FX.ring(p.x, p.y - 60, '#ffffff', 200, 0.6);
      Sound.play('transform');
    },
    update(k) {
      const p = FP();
      const e = FE();
      const tx = clamp(e.x - Fin.dir * 170, 50, W - 50);
      p.x = lerp(Fin.saved.px, tx, easeOut(k));
      p.y = lerp(Fin.saved.py, GROUND_Y, easeOut(k));
      e.y = lerp(Fin.saved.ey, GROUND_Y, easeOut(k));
    },
  }),

  wait: (d, fn) => ({ d, start: fn }),

  darken: (d, v) => ({ d, start() { Fin.darkT = v; } }),

  zoom: (z) => ({ d: 0.01, start() { Fin.zoom = z; } }),

  transform: (d = 1.0) => ({
    d,
    start() {
      const p = FP();
      p.superT = 999;
      setPose(p, POSES.charge(0));
      FX.ring(p.x, p.y - 60, '#ffe14d', 260, 0.8);
      FX.ring(p.x, p.y - 60, '#ffffff', 180, 0.6);
      FX.burst(p.x, p.y - 60, '#ffe14d', 50, 520, 5, 0);
      FX.pop(p.x, p.y - 190, 'MODO SUPER!', '#ffe14d', 48);
      FX.shake = 18;
      Fight.flashA = 0.9;
      Sound.play('transform');
    },
    update() { if (Math.random() < 0.6) FX.burst(FP().x + rand(-40, 40), GROUND_Y - rand(0, 20), '#ffe14d', 1, 80, 3, -600); },
  }),

  // Some e aparece em outro lugar
  tp: (where, d = 0.26) => ({
    d,
    start() {
      const p = FP();
      FX.burst(p.x, p.y - 60, '#ffffff', 16, 300, 3, 0);
      FX.pop(p.x, p.y - 140, 'ZUM!', '#ffffff', 26);
      Sound.play('teleport');
      p.hidden = true;
    },
    end() {
      const p = FP();
      const e = FE();
      const dir = Fin.dir;
      if (where === 'above') { p.x = e.x - dir * 20; p.y = e.y - 170; }
      else if (where === 'behind') { p.x = clamp(e.x + dir * 72, 40, W - 40); p.y = e.y; }
      else if (where === 'far') { p.x = clamp(e.x - dir * 330, 60, W - 60); p.y = GROUND_Y; }
      else { p.x = clamp(e.x - dir * 72, 40, W - 40); p.y = e.y; }
      p.facing = Math.sign(e.x - p.x) || dir;
      p.faceAnim = p.facing;
      p.hidden = false;
      FX.burst(p.x, p.y - 60, '#ffffff', 16, 300, 3, 0);
    },
  }),

  // Sequência de socos e chutes super rápidos
  rush: (d, hits) => ({
    d,
    start() {
      const p = FP();
      const e = FE();
      p.x = clamp(e.x - Fin.dir * 72, 40, W - 40);
      p.y = e.y;
      p.facing = Fin.dir;
      p.fxTrail = true;
      Fin.n = -1;
      Fin.zoom = 1.4;
    },
    update(k) {
      const p = FP();
      const e = FE();
      const i = Math.min(hits - 1, Math.floor(k * hits));
      if (i === Fin.n) return;
      Fin.n = i;
      const m = MOVES[['jab', 'cross', 'lowkick', 'highkick', 'jab', 'roundhouse'][i % 6]];
      setPose(p, mergePose(GUARD, m.hitP));
      setPose(e, POSES.hurt(0));
      const c = limbWorld(p, m.hitP[m.limb]);
      finHit(c.x, c.y, Fin.dir, false, pick(m.kind === 'kick' ? KICK_WORDS : HIT_WORDS));
      p.combo++;
      p.comboT = 1.5;
      e.x = clamp(e.x + Fin.dir * 2, 50, W - 50);
      p.x = clamp(e.x - Fin.dir * 72, 40, W - 40);
    },
    end() { FP().fxTrail = false; },
  }),

  // Gancho que manda o inimigo para cima (altura grande = sai da tela!)
  launch: (d, height, word = 'KA-POW!') => ({
    d,
    start() {
      const p = FP();
      const e = FE();
      p.x = clamp(e.x - Fin.dir * 70, 40, W - 40);
      setPose(p, mergePose(GUARD, MOVES.upper.hitP));
      setPose(e, POSES.launched(0));
      e.state = 'launched';
      e.onGround = false;
      Fin.saved.ey = e.y;
      const c = enemyCenter();
      finHit(c.x, c.y, Fin.dir, true, word);
      Fin.zoom = 1.15;
    },
    update(k, dt) {
      const e = FE();
      e.y = lerp(Fin.saved.ey, GROUND_Y - height, easeOut(k));
      e.spin += dt * 10;
      if (e.y < -60) e.hidden = true;
    },
  }),

  // Herói (no ar, acima do inimigo) martela para baixo
  slam: (d = 0.5) => ({
    d,
    start() {
      setPose(FP(), { fh: [14, -150], bh: [4, -150], ff: [12, -24], bf: [-14, -12], lean: -0.25, crouch: 0 });
      Fin.saved.ey = FE().y;
      Fin.hit = false;
    },
    update(k) {
      const e = FE();
      if (k > 0.25 && !Fin.hit) {
        Fin.hit = true;
        setPose(FP(), { fh: [52, -30], bh: [46, -26], ff: [14, -20], bf: [-14, -10], lean: 0.55, crouch: 0 });
        const c = enemyCenter();
        finHit(c.x, c.y, Fin.dir, true, 'WHAM!');
        e.spin = 0;
      }
      if (Fin.hit) e.y = lerp(Fin.saved.ey, GROUND_Y, easeIn((k - 0.25) / 0.75));
    },
    end() { crater(); },
  }),

  // Chute voador de cima para baixo
  dive: (d = 0.3) => ({
    d,
    start() {
      const p = FP();
      Fin.saved.px = p.x;
      Fin.saved.py = p.y;
      setPose(p, mergePose(GUARD, MOVES.airkick.hitP));
      p.fxTrail = true;
      Sound.play('whoosh');
    },
    update(k) {
      const p = FP();
      const e = FE();
      p.x = lerp(Fin.saved.px, e.x - Fin.dir * 46, easeIn(k));
      p.y = lerp(Fin.saved.py, e.y - 10, easeIn(k));
    },
    end() {
      const p = FP();
      const c = enemyCenter();
      p.fxTrail = false;
      finHit(c.x, c.y, Fin.dir, true, 'VOADORA!');
      crater('METEORO!');
      p.y = GROUND_Y;
      setPose(p, POSES.getup(0));
    },
  }),

  rise: (d, h) => ({
    d,
    start() { Fin.saved.py = FP().y; setPose(FP(), POSES.jump(0)); Sound.play('jump'); FX.dust(FP().x, GROUND_Y, 8); },
    update(k) { FP().y = lerp(Fin.saved.py, GROUND_Y - h, easeOut(k)); },
  }),

  land: (d = 0.25) => ({
    d,
    start() { Fin.saved.py = FP().y; setPose(FP(), POSES.fall(0)); FP().spinTurn = false; },
    update(k) { FP().y = lerp(Fin.saved.py, GROUND_Y, easeIn(k)); },
    end() { FP().y = GROUND_Y; FX.dust(FP().x, GROUND_Y, 8); setPose(FP(), POSES.idle(0)); },
  }),

  enemyFall: (d = 0.55, word = 'CRASH!') => ({
    d,
    start() { Fin.saved.ey = FE().y; FE().state = 'launched'; FE().hidden = false; setPose(FE(), POSES.launched(0)); Fin.zoom = 1.1; },
    update(k, dt) { FE().y = lerp(Fin.saved.ey, GROUND_Y, easeIn(k)); FE().spin += dt * 9; },
    end() { crater(word); },
  }),

  beamCharge: (d, color) => ({
    d,
    start() { setPose(FP(), POSES.beamCharge(0)); Fin.beam = { w: 0, color }; Fin.zoom = 1.05; Sound.play('beam'); },
    update(k) { Fin.chargeGlow = k; if (Math.random() < 0.7) { const h = limbWorld(FP(), [-30, -54]); FX.burst(h.x + rand(-60, 60), h.y + rand(-60, 60), color, 1, 40, 2.5, 0); } },
    end() { Fin.chargeGlow = 0; },
  }),

  // Onda gigante que leva o inimigo para fora da tela
  beam: (d, width, color) => ({
    d,
    start() {
      const e = FE();
      setPose(FP(), POSES.beamFire(0));
      Fin.beam = { w: 0, color };
      Fin.saved.ex = e.x;
      Fin.saved.ey = e.y;
      e.state = 'launched';
      e.onGround = false;
      setPose(e, POSES.launched(0));
      Sound.play('boom');
      Fight.flashA = 0.5;
    },
    update(k, dt) {
      const e = FE();
      Fin.beam.w = width * Math.min(1, k * 5) * (k > 0.85 ? (1 - k) / 0.15 : 1);
      const tx = Fin.dir > 0 ? W + 200 : -200;
      e.x = lerp(Fin.saved.ex, tx, easeIn(clamp((k - 0.15) / 0.65, 0, 1)));
      e.y = Fin.saved.ey - 24;
      e.spin += dt * 6;
      e.flash = 0.05;
      FX.shake = Math.max(FX.shake, 10);
      if (Math.random() < 0.6 && !e.hidden) FX.burst(e.x, e.y - 60, color, 2, 320, 3, 0);
      if (e.x < -80 || e.x > W + 80) e.hidden = true;
    },
    end() { Fin.beam = null; FE().hidden = true; },
  }),

  // Estrelinha brilhando onde o inimigo sumiu
  twinkle: (d = 1.0) => ({
    d,
    start() {
      const e = FE();
      Fin.star = { x: clamp(e.x, 50, W - 50), y: clamp(e.y - 60, 50, GROUND_Y - 80), t: 0 };
      if (e.y < 0) Fin.star.y = 50;
      Fin.zoom = 1;
      setPose(FP(), POSES.win(0));
      Sound.play('ping');
      FX.pop(Fin.star.x, Fin.star.y + 50, 'PING!', '#ffffff', 34);
    },
    end() { Fin.star = null; },
  }),

  sphereGrow: (d, maxR) => ({
    d,
    start() { const p = FP(); setPose(p, POSES.sphereHold(0)); Fin.sphere = { x: p.x, y: p.y - 250, r: 5 }; Fin.zoom = 0.95; Sound.play('sphere'); },
    update(k) {
      const s = Fin.sphere;
      s.r = 5 + easeOut(k) * maxR;
      if (Math.random() < 0.9) {
        const a = rand(0, Math.PI * 2);
        FX.parts.push({ x: s.x + Math.cos(a) * 260, y: s.y + Math.sin(a) * 200, vx: -Math.cos(a) * 480, vy: -Math.sin(a) * 380, life: 0.5, max: 0.5, color: '#ffe082', size: 3, gravity: 0 });
      }
    },
  }),

  sphereThrow: (d = 0.55) => ({
    d,
    start() { setPose(FP(), POSES.sphereThrow(0)); Fin.saved.sx = Fin.sphere.x; Fin.saved.sy = Fin.sphere.y; Sound.play('whoosh'); },
    update(k) { const c = enemyCenter(); Fin.sphere.x = lerp(Fin.saved.sx, c.x, easeIn(k)); Fin.sphere.y = lerp(Fin.saved.sy, c.y, easeIn(k)); },
    end() {
      const c = enemyCenter();
      Fin.sphere = null;
      bigBoom(c.x, c.y);
      FE().y = GROUND_Y - 340;
      FE().state = 'launched';
    },
  }),

  lightning: (d, n, color) => ({
    d,
    start() { setPose(FP(), { fh: [18, -156], bh: [-20, -74], ff: [14, 0], bf: [-14, 0], lean: -0.1, crouch: 0 }); Fin.n = -1; Fin.zoom = 1.1; },
    update(k) {
      const i = Math.floor(k * n);
      if (i === Fin.n || i >= n) return;
      Fin.n = i;
      const e = FE();
      const big = i === n - 1;
      const c = enemyCenter();
      Fin.bolts.push({ x: c.x + (big ? 0 : rand(-24, 24)), y: big ? GROUND_Y : c.y, life: big ? 0.4 : 0.18, w: big ? 10 : 4, color });
      setPose(e, POSES.hurt(0));
      finHit(c.x, c.y, Fin.dir, big, big ? 'KA-BRUUUM!' : pick(['BZZT!', 'ZAP!', 'TZZZ!']), color);
      Sound.play('zap');
      if (big) Fight.flashA = 0.9;
      e.x = clamp(e.x + rand(-4, 4), 50, W - 50);
    },
    end() {
      const e = FE();
      e.state = 'ko';
      e.onGround = true;
      setPose(e, POSES.lying(0));
      FX.dust(e.x, GROUND_Y, 20);
      for (let i = 0; i < 12; i++) FX.burst(e.x + rand(-40, 40), GROUND_Y - 20, 'rgba(90,90,90,0.8)', 1, 60, 7, -120);
    },
  }),

  // Três cópias do herói atacam de lados diferentes
  clones: (d = 1.6) => ({
    d,
    start() {
      const e = FE();
      const dir = Fin.dir;
      FP().hidden = true;
      Sound.play('teleport');
      const mk = (x, y, facing, move, t0) => ({ x, y, facing, windP: mergePose(GUARD, MOVES[move].windP), hitP: mergePose(GUARD, MOVES[move].hitP), t0, hitAt: t0 + 0.18, done: false, move });
      Fin.clones = [
        mk(e.x - dir * 72, e.y, dir, 'highkick', 0.1),
        mk(e.x + dir * 72, e.y, -dir, 'cross', 0.5),
        mk(e.x - dir * 30, e.y - 150, dir, 'airkick', 0.9),
      ];
      Fin.zoom = 1.35;
    },
    update() {
      for (const c of Fin.clones) {
        if (!c.done && Fin.t >= c.hitAt) {
          c.done = true;
          const m = MOVES[c.move];
          const pt = { x: c.x + c.facing * m.hitP[m.limb][0], y: c.y + m.hitP[m.limb][1] };
          finHit(pt.x, pt.y, c.facing, c.move === 'airkick', c.move === 'airkick' ? 'TRIPLO!' : pick(HIT_WORDS), '#7ef9ff');
          setPose(FE(), POSES.hurt(0));
        }
      }
    },
    end() { Fin.clones = []; FP().hidden = false; },
  }),

  // Herói gira como um tornado e puxa o inimigo
  tornado: (d = 1.2) => ({
    d,
    start() {
      const p = FP();
      p.spinTurn = true;
      p.fxTrail = true;
      setPose(p, mergePose(GUARD, MOVES.roundhouse.hitP));
      Fin.saved.ex = FE().x;
      Fin.n = -1;
      Fin.zoom = 1.25;
    },
    update(k, dt) {
      const p = FP();
      const e = FE();
      e.x = lerp(Fin.saved.ex, p.x + Fin.dir * 64, easeIn(Math.min(1, k * 1.5)));
      e.y = GROUND_Y - Math.sin(k * Math.PI) * 70;
      e.spin += dt * 16;
      setPose(e, POSES.launched(0));
      const i = Math.floor(k * 8);
      if (i !== Fin.n) {
        Fin.n = i;
        FX.ring(p.x, p.y - 60, '#b3f5ff', 110, 0.3);
        if (k > 0.3) finHit(e.x, e.y - 60, Fin.dir, false, pick(['VUUSH!', 'VAP!', 'TÓIN!']), '#b3f5ff');
        Sound.play('whoosh');
      }
    },
    end() { FP().spinTurn = false; FP().fxTrail = false; setPose(FP(), mergePose(GUARD, MOVES.highkick.hitP)); },
  }),

  // Inimigo voa girando para fora da tela
  fling: (d = 0.6) => ({
    d,
    start() { const e = FE(); Fin.saved.ex = e.x; Fin.saved.ey = e.y; const c = enemyCenter(); finHit(c.x, c.y, Fin.dir, true, 'PRA LONGE!'); Fin.zoom = 1; },
    update(k, dt) {
      const e = FE();
      e.x = lerp(Fin.saved.ex, Fin.dir > 0 ? W + 160 : -160, easeIn(k));
      e.y = lerp(Fin.saved.ey, 120, easeOut(k));
      e.spin += dt * 20;
      if (e.x < -60 || e.x > W + 60) e.hidden = true;
    },
    end() { FE().hidden = true; },
  }),

  kiRain: (d, n) => ({
    d,
    start() { Fin.n = -1; Fin.zoom = 1.05; },
    update(k) {
      const i = Math.floor(k * n);
      if (i === Fin.n || i >= n) return;
      Fin.n = i;
      const p = FP();
      setPose(p, i % 2 ? POSES.blast(0) : mergePose(POSES.blast(0), { fh: [30, -82], bh: [58, -76] }));
      const h = limbWorld(p, [58, -78]);
      const c = enemyCenter();
      Fin.orbs.push({ x: h.x, y: h.y, x0: h.x, y0: h.y, tx: c.x + rand(-30, 30), ty: c.y + rand(-40, 40), t: 0 });
      Sound.play('blast');
    },
  }),

  boom: (d = 0.45) => ({
    d,
    start() { const c = enemyCenter(); bigBoom(c.x, c.y, '#7ef9ff'); FE().y = GROUND_Y - 200; FE().state = 'launched'; },
  }),

  dragon: (d, color) => ({
    d,
    start() { setPose(FP(), POSES.beamFire(0)); Fin.dragon = { pts: [], color }; Fin.zoom = 1; Sound.play('beam'); FX.pop(FP().x, FP().y - 190, 'RUAAAARGH!', color, 40); },
    update(k) {
      const h = limbWorld(FP(), [60, -64]);
      const c = enemyCenter();
      let hx;
      let hy;
      if (k < 0.55) {
        const kk = k / 0.55;
        hx = lerp(h.x, c.x, kk);
        hy = lerp(h.y, c.y, kk) - Math.sin(kk * Math.PI) * 230 + Math.sin(kk * 14) * 26;
      } else {
        const a = ((k - 0.55) / 0.45) * Math.PI * 4;
        hx = c.x + Math.cos(a) * 80;
        hy = c.y + Math.sin(a) * 60;
        if (Math.random() < 0.25) finHit(c.x + rand(-20, 20), c.y + rand(-30, 30), Fin.dir, false, null, color);
        setPose(FE(), POSES.hurt(0));
      }
      Fin.dragon.pts.unshift([hx, hy]);
      if (Fin.dragon.pts.length > 28) Fin.dragon.pts.length = 28;
    },
    end() { const c = enemyCenter(); Fin.dragon = null; bigBoom(c.x, c.y, color); FE().y = GROUND_Y - 300; },
  }),

  groundPound: (d = 0.5, color = '#ff6e40') => ({
    d,
    start() {
      const p = FP();
      setPose(p, { fh: [44, -6], bh: [20, -34], ff: [20, 0], bf: [-24, 0], lean: 0.65, crouch: 24 });
      FX.ring(p.x, GROUND_Y, '#ffffff', 140, 0.4);
      FX.shake = 16;
      Sound.play('heavy');
      Fin.wave = { x: p.x, color };
      Fin.saved.px = p.x;
    },
    update(k) { Fin.wave.x = lerp(Fin.saved.px, FE().x, k); },
    end() { Fin.wave = null; },
  }),

  pillars: (d, color) => ({
    d,
    start() {
      const e = FE();
      Fin.pillars = [-70, 0, 70].map((dx, i) => ({ x: e.x + dx, h: 0, w: i === 1 ? 90 : 50, color, life: d }));
      finHit(e.x, GROUND_Y - 40, Fin.dir, true, 'ERUPÇÃO!', color);
      e.state = 'launched';
      setPose(e, POSES.launched(0));
      Fin.saved.ey = e.y;
      Fin.zoom = 0.95;
    },
    update(k, dt) {
      for (const pl of Fin.pillars) pl.h = 640 * easeOut(Math.min(1, k * 2));
      const e = FE();
      e.y = lerp(Fin.saved.ey, GROUND_Y - 380, easeOut(k));
      e.spin += dt * 8;
      FX.shake = Math.max(FX.shake, 8);
    },
    end() { Fin.pillars = []; },
  }),

  win: (d = 0.8, word = 'FINALIZADO!') => ({
    d,
    start() { const p = FP(); setPose(p, POSES.win(0)); FX.pop(p.x, p.y - 200, word, '#ffe14d', 40); Fin.zoom = 1.2; Fin.darkT = 0; },
  }),
};

/* ---------- Uma finalização diferente para cada inimigo ---------- */
const FINISHERS = {
  'Goblin Folha': { name: 'VOADORA METEORO', color: '#ffd54a', steps: () => [FS.intro(), FS.launch(0.45, 230), FS.tp('above'), FS.wait(0.12), FS.dive(0.3), FS.win()] },
  'Goblin Tronco': { name: 'RAJADA DE MIL SOCOS', color: '#ff8a65', steps: () => [FS.intro(), FS.rush(1.5, 14), FS.launch(0.7, 1000, 'TCHAU!'), FS.twinkle(), FS.win()] },
  'Brutão': { name: 'ONDA ESTELAR MÁXIMA', color: '#7ef9ff', steps: () => [FS.intro(), FS.tp('far'), FS.beamCharge(0.9, '#7ef9ff'), FS.beam(1.4, 120, '#7ef9ff'), FS.twinkle(), FS.win()] },
  'Soldado Krag': { name: 'TORNADO GIRATÓRIO', color: '#b3f5ff', steps: () => [FS.intro(), FS.tornado(1.3), FS.fling(0.6), FS.twinkle(), FS.win()] },
  'Soldado Vorn': { name: 'MARTELO DO CÉU', color: '#ffca28', steps: () => [FS.intro(), FS.rush(0.5, 4), FS.launch(0.45, 260), FS.tp('above'), FS.slam(0.5), FS.land(), FS.win()] },
  'Comandante Zarkon': { name: 'ESFERA SOLAR SUPREMA', color: '#ffe082', steps: () => [FS.intro(), FS.tp('far'), FS.sphereGrow(1.5, 130), FS.sphereThrow(0.55), FS.enemyFall(0.7), FS.win()] },
  'Ninja Gelo': { name: 'CLONES FANTASMAS', color: '#7ef9ff', steps: () => [FS.intro(), FS.clones(1.5), FS.tp('front'), FS.launch(0.5, 240, 'PEGUEI!'), FS.enemyFall(0.5), FS.win()] },
  'Ninja Neve': { name: 'CHUVA DE KI', color: '#80d8ff', steps: () => [FS.intro(), FS.tp('far'), FS.rise(0.35, 240), FS.kiRain(1.5, 16), FS.boom(), FS.land(), FS.enemyFall(0.5), FS.win()] },
  'Ninja Tempestade': { name: 'TROVÃO SUPREMO', color: '#b3f5ff', steps: () => [FS.intro(), FS.darken(0.5, 0.65), FS.lightning(1.9, 7, '#b3f5ff'), FS.darken(0.3, 0), FS.win()] },
  'Soldado Estelar': { name: 'DRAGÃO DE ENERGIA', color: '#ffd54a', steps: () => [FS.intro(), FS.tp('far'), FS.dragon(2.1, '#ffd54a'), FS.enemyFall(0.6), FS.win()] },
  'Capitão Cometa': { name: 'ERUPÇÃO ESTELAR', color: '#ff6e40', steps: () => [FS.intro(), FS.groundPound(0.5, '#ff6e40'), FS.pillars(0.9, '#ff6e40'), FS.enemyFall(0.6), FS.win()] },
  'General Nebulosa': { name: 'COMBO INFINITO', color: '#f50057', steps: () => [FS.intro(), FS.rush(0.8, 8), FS.launch(0.4, 220), FS.tp('above'), FS.slam(0.45), FS.land(0.2), FS.tp('far'), FS.beamCharge(0.5, '#ff4081'), FS.beam(1.1, 90, '#ff4081'), FS.twinkle(), FS.win()] },
  'Rei Sombrio': { name: 'SUPER ONDA ESTELAR FINAL', color: '#ffe14d', steps: () => [FS.intro(), FS.transform(1.0), FS.rush(1.0, 10), FS.launch(0.4, 250), FS.tp('above'), FS.slam(0.45), FS.land(0.2), FS.tp('far'), FS.darken(0.3, 0.5), FS.beamCharge(1.0, '#ffe14d'), FS.beam(1.9, 180, '#ffe14d'), FS.darken(0.2, 0), FS.twinkle(), FS.win(1.0, 'CAMPEÃO!')] },
  default: { name: 'GOLPE FINAL', color: '#ffd54a', steps: () => [FS.intro(), FS.rush(0.8, 6), FS.launch(0.5, 240), FS.enemyFall(0.5), FS.win()] },
};

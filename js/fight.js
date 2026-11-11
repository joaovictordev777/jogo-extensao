'use strict';
/* =========================================================
   FIGHT — duelo 2D: física, golpes, energia, raio especial e IA
   ========================================================= */

const GROUND_Y = 462;
const GRAVITY = 2000;
const JUMP_SPEED = 780;
const BEAM_TIME = 1.5;   // duração total do especial
const BEAM_ACTIVE = 1.05; // a partir daqui o raio está saindo
const BLAST_COST = 12;
const HIT_WORDS = ['POW!', 'BAM!', 'TUM!', 'PÁ!', 'CABUM!'];
const SHOT_WORDS = ['ZAP!', 'BUM!', 'VUSH!'];

function noCtrl() {
  return { move: 0, jump: false, punch: false, blast: false, special: false, charge: false };
}

function makeFighter(cfg, isPlayer, x, facing, hp, stats) {
  const s = cfg.scale || 1;
  return {
    cfg, isPlayer, x, y: GROUND_Y, vx: 0, vy: 0, facing,
    hp, maxHp: hp, hpShow: hp, ki: isPlayer ? 30 : 20,
    state: 'idle', stateT: 0, hurtT: 0, flash: 0, cd: 0, t: 0,
    onGround: true, jumps: 0, hitDone: false, beamTick: 0,
    w: 44 * s, h: 118 * s, s,
    speed: stats.speed, dmg: stats.dmg, shotDmg: stats.shotDmg, beamDmg: stats.beamDmg,
    ai: { t: 1, move: 0, moveT: 0, chargeT: 0, last: 'esperando...' },
  };
}

function bodyBox(f) {
  return { x: f.x - f.w / 2, y: f.y - f.h, w: f.w, h: f.h };
}

function punchBox(f) {
  const reach = 66 * f.s;
  return {
    x: f.facing > 0 ? f.x + 6 : f.x - 6 - reach,
    y: f.y - 98 * f.s,
    w: reach,
    h: 44 * f.s,
  };
}

function handPos(f) {
  return { x: f.x + f.facing * 48 * f.s, y: f.y - 70 * f.s };
}

function beamActive(f) {
  return f.state === 'beam' && f.stateT <= BEAM_ACTIVE && f.stateT > 0.08;
}

const Fight = {
  levelIndex: 0,
  level: null,
  p: null,
  e: null,
  shots: [],
  phase: 'intro',
  phaseT: 0,
  t: 0,
  slowmo: 0,
  won: false,

  start(levelIndex, playerHp, enemyCfg = null) {
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    const E = enemyCfg || this.level.enemy;
    this.enemyCfg = E;
    this.isBoss = !enemyCfg;
    const pw = 1 + levelIndex * 0.12; // o herói também fica mais forte a cada fase
    this.p = makeFighter(HERO, true, 230, 1, playerHp, { speed: 310, dmg: 9 * pw, shotDmg: 7 * pw, beamDmg: 3.4 * pw });
    this.e = makeFighter(E, false, W - 230, -1, E.hp, { speed: E.speed, dmg: E.dmg, shotDmg: E.dmg * 0.85, beamDmg: 1.6 + E.dmg * 0.1 });
    this.shots = [];
    this.phase = 'intro';
    this.phaseT = 0;
    this.t = 0;
    this.slowmo = 0;
    this.won = false;
    FX.clear();
  },

  /* ---------- Controles ---------- */
  playerControl() {
    return {
      move: (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0),
      jump: Input.tapped('up'),
      punch: Input.tapped('punch'),
      blast: Input.tapped('blast'),
      special: Input.tapped('special'),
      charge: Input.held('charge'),
    };
  },

  // A "inteligência" do inimigo: um monte de SE/SENÃO!
  aiControl(f, opp, dt) {
    const c = noCtrl();
    const ai = f.ai;
    ai.t -= dt;
    ai.moveT -= dt;
    ai.chargeT -= dt;
    if (f.hurtT > 0 || f.state === 'ko' || f.state === 'beam') return c;
    const P = f.cfg;
    const dx = opp.x - f.x;
    const ad = Math.abs(dx);
    const dir = Math.sign(dx) || 1;

    if (ad < 130) ai.chargeT = 0; // parar de carregar se o jogador chegar perto

    if (ai.t <= 0) {
      ai.t = P.think * (0.6 + Math.random() * 0.8);
      const r = Math.random();
      if (P.beam && f.ki >= 100 && r < 0.6) {
        c.special = true; ai.last = 'energia cheia → ESPECIAL';
      } else if (ad < 110) {
        if (r < 0.65) { c.punch = true; ai.last = 'perto → SOCO'; if (Math.random() < (P.combo || 0)) { ai.t = 0.25; ai.last = 'perto → COMBO!'; } }
        else if (r < 0.82) { ai.move = -dir; ai.moveT = 0.35; ai.last = 'perto → recuar'; }
        else { c.jump = true; ai.last = 'perto → pular'; }
      } else if (ad > 260) {
        if (r < P.blast && f.ki >= BLAST_COST) { c.blast = true; ai.last = 'longe → RAJADA'; }
        else if (r < P.blast + 0.15 && f.ki < 70) { ai.chargeT = 0.9; ai.last = 'longe → carregar energia'; }
        else { ai.move = dir; ai.moveT = 0.5 + Math.random() * 0.5; ai.last = 'longe → aproximar'; if (Math.random() < 0.15) c.jump = true; }
      } else if (r < P.blast * 0.6 && f.ki >= BLAST_COST) {
        c.blast = true; ai.last = 'médio → RAJADA';
      } else {
        ai.move = dir; ai.moveT = 0.4; ai.last = 'médio → aproximar';
      }
    }

    // Desviar de rajadas que estão vindo
    for (const s of this.shots) {
      if (s.owner !== f && Math.abs(s.x - f.x) < 160 && Math.sign(f.x - s.x) === Math.sign(s.vx) && f.onGround && Math.random() < 0.03 * (1 / P.think)) {
        c.jump = true;
        ai.last = 'rajada vindo → PULAR';
      }
    }

    if (ai.chargeT > 0) c.charge = true;
    else if (ai.moveT > 0) {
      c.move = ai.move;
      if (ad < 75 && ai.move === dir) { c.move = 0; ai.moveT = 0; }
    }
    return c;
  },

  /* ---------- Ações ---------- */
  startPunch(f) {
    f.state = 'punch';
    f.stateT = 0.3;
    f.hitDone = false;
    f.cd = 0.36;
    f.vx = f.facing * 90;
    Sound.play('punch');
  },

  startBlast(f) {
    f.state = 'blast';
    f.stateT = 0.22;
    f.cd = 0.34;
    f.ki -= BLAST_COST;
    const h = handPos(f);
    this.shots.push({ x: h.x, y: h.y, vx: f.facing * 640, r: 13, owner: f, color: f.cfg.shot, dmg: f.shotDmg, life: 2.2 });
    Sound.play('blast');
  },

  startBeam(f) {
    f.state = 'beam';
    f.stateT = BEAM_TIME;
    f.ki = 0;
    f.beamTick = 0;
    f.vx = 0;
    f.vy = 0;
    FX.pop(f.x, f.y - f.h - 40, f.cfg.special, f.cfg.aura, 40);
    Sound.play('beam');
  },

  damage(target, amount, dir, kind) {
    if (target.state === 'ko') return;
    target.hp = Math.max(0, target.hp - amount);
    target.flash = 0.12;
    // Quem também está soltando o especial não é interrompido por outro raio (assim os raios podem se chocar)
    const keepBeam = kind === 'beam' && target.state === 'beam' && target.hp > 0;
    if (keepBeam) {
      // só perde vida
    } else if (kind === 'beam') {
      target.state = 'hurt';
      target.hurtT = 0.12;
      target.vx = dir * 160;
    } else {
      target.state = 'hurt';
      target.hurtT = 0.3;
      target.vx = dir * 340;
      target.vy = target.onGround ? -180 : -100;
      target.onGround = false;
    }
    target.ki = Math.min(100, target.ki + 4);
    const cx = target.x;
    const cy = target.y - target.h * 0.6;
    FX.burst(cx, cy, '#ffffff', 10, 280, 3.5);
    FX.burst(cx, cy, '#ffd54a', 8, 220, 3);
    if (kind !== 'beam' || Math.random() < 0.2) {
      FX.pop(cx + rand(-20, 20), cy - 30, kind === 'shot' ? pick(SHOT_WORDS) : pick(HIT_WORDS), kind === 'shot' ? '#7ef9ff' : '#ffd54a');
      Sound.play('hit');
    }
    FX.shake = Math.max(FX.shake, kind === 'beam' ? 5 : 9);

    if (target.hp <= 0) {
      target.state = 'ko';
      target.hurtT = 0;
      target.vy = -620;
      target.vx = dir * 420;
      target.onGround = false;
      this.slowmo = 0.9;
      FX.shake = 18;
      FX.burst(cx, cy, '#ffffff', 30, 420, 5);
      Sound.play('ko');
    }
  },

  /* ---------- Atualização de um lutador ---------- */
  updateFighter(f, opp, c, dt) {
    f.t += dt;
    f.flash = Math.max(0, f.flash - dt);
    f.cd = Math.max(0, f.cd - dt);
    f.hpShow = lerp(f.hpShow, f.hp, Math.min(1, dt * 6));

    if (f.state === 'ko') {
      this.physics(f, dt);
      if (f.onGround) f.vx *= Math.pow(0.02, dt);
      return;
    }

    if (f.hurtT > 0) {
      f.hurtT -= dt;
      f.vx *= Math.pow(0.05, dt);
      if (f.hurtT <= 0) f.state = 'idle';
    }

    const busy = f.state === 'punch' || f.state === 'blast' || f.state === 'beam';
    if (busy) {
      f.stateT -= dt;
      if (f.state === 'punch') {
        f.vx *= Math.pow(0.01, dt);
        if (!f.hitDone && f.stateT <= 0.2) {
          f.hitDone = true;
          if (opp.state !== 'ko' && rectsOverlap(punchBox(f), bodyBox(opp))) {
            this.damage(opp, f.dmg, f.facing, 'punch');
            f.ki = Math.min(100, f.ki + 10);
          }
        }
      } else if (f.state === 'beam') {
        f.vx = 0;
        f.vy = 0;
        if (f.stateT > BEAM_ACTIVE && Math.random() < 0.5) {
          const h = handPos(f);
          FX.burst(h.x, h.y, f.cfg.shot, 1, 120, 3, 0);
        }
        if (beamActive(f)) this.updateBeam(f, opp, dt);
      }
      if (f.stateT <= 0) f.state = 'idle';
    }

    const free = !busy && f.hurtT <= 0;
    if (free) {
      f.facing = opp.x > f.x ? 1 : -1;
      if (c.charge && f.onGround) {
        f.state = 'charge';
        f.vx = 0;
        f.ki = Math.min(100, f.ki + 45 * dt);
        if (Math.random() < dt * 8) Sound.play('charge');
        if (Math.random() < dt * 30) FX.burst(f.x + rand(-30, 30), f.y - rand(0, 40), f.cfg.aura, 1, 60, 3, -300);
      } else {
        f.vx = c.move * f.speed;
        f.state = !f.onGround ? 'jump' : c.move ? 'walk' : 'idle';
        if (c.jump && f.jumps < 2) {
          f.vy = -JUMP_SPEED * (f.jumps ? 0.85 : 1);
          f.jumps++;
          f.onGround = false;
          f.state = 'jump';
          Sound.play('jump');
          if (f.jumps === 2) FX.burst(f.x, f.y, '#ffffff', 8, 120, 3, 0);
        }
        if (c.special && f.ki >= 100) this.startBeam(f);
        else if (c.punch && f.cd <= 0) this.startPunch(f);
        else if (c.blast && f.cd <= 0) {
          if (f.ki >= BLAST_COST) this.startBlast(f);
          else if (f.isPlayer) FX.pop(f.x, f.y - f.h - 20, 'SEM ENERGIA! (L)', '#ff8a80', 20);
        }
      }
    }

    if (f.state !== 'charge') f.ki = Math.min(100, f.ki + 5 * dt);
    if (f.state !== 'beam') this.physics(f, dt);
  },

  physics(f, dt) {
    f.vy += GRAVITY * dt;
    f.y += f.vy * dt;
    if (f.y >= GROUND_Y) {
      f.y = GROUND_Y;
      f.vy = 0;
      f.onGround = true;
      f.jumps = 0;
    } else {
      f.onGround = false;
    }
    f.x = clamp(f.x + f.vx * dt, 40, W - 40);
  },

  // Calcula onde o raio termina (se dois raios se encontram, eles empatam no meio!)
  beamEnd(f, opp) {
    const h = handPos(f);
    if (beamActive(opp) && opp.facing === -f.facing && (f.facing > 0 ? opp.x > f.x : opp.x < f.x)) {
      return { x: (h.x + handPos(opp).x) / 2, clash: true };
    }
    return { x: f.facing > 0 ? W + 60 : -60, clash: false };
  },

  beamRect(f, opp) {
    const h = handPos(f);
    const end = this.beamEnd(f, opp);
    return { x: Math.min(h.x, end.x), y: h.y - 22, w: Math.abs(end.x - h.x), h: 44, end };
  },

  updateBeam(f, opp, dt) {
    const r = this.beamRect(f, opp);
    if (r.end.clash) {
      if (Math.random() < 0.6) FX.burst(r.end.x, handPos(f).y, '#ffffff', 2, 300, 3, 0);
      FX.shake = Math.max(FX.shake, 4);
      if (Math.random() < dt * 4) Sound.play('clash');
      return;
    }
    // O raio destrói rajadas inimigas no caminho
    for (const s of this.shots) {
      if (s.owner !== f && s.x > r.x && s.x < r.x + r.w && Math.abs(s.y - (r.y + 22)) < 30) s.dead = true;
    }
    f.beamTick -= dt;
    if (f.beamTick <= 0) {
      f.beamTick = 0.08;
      if (opp.state !== 'ko' && rectsOverlap(r, bodyBox(opp))) this.damage(opp, f.beamDmg, f.facing, 'beam');
    }
  },

  updateShots(dt) {
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.life -= dt;
      const target = s.owner === this.p ? this.e : this.p;
      const b = bodyBox(target);
      const nx = clamp(s.x, b.x, b.x + b.w);
      const ny = clamp(s.y, b.y, b.y + b.h);
      if (target.state !== 'ko' && Math.hypot(s.x - nx, s.y - ny) < s.r) {
        s.dead = true;
        this.damage(target, s.dmg, Math.sign(s.vx), 'shot');
        s.owner.ki = Math.min(100, s.owner.ki + 4);
      }
      if (s.x < -50 || s.x > W + 50 || s.life <= 0) s.dead = true;
    }
    // Rajadas que se chocam explodem
    for (const a of this.shots) {
      for (const b of this.shots) {
        if (a === b || a.dead || b.dead || a.owner === b.owner) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) {
          a.dead = true;
          b.dead = true;
          FX.burst((a.x + b.x) / 2, a.y, '#ffffff', 18, 300, 4, 0);
          FX.pop((a.x + b.x) / 2, a.y - 30, 'PAF!', '#ffffff', 30);
          Sound.play('clash');
        }
      }
    }
    for (const s of this.shots) if (s.dead && s.life > 0 && s.x > 0 && s.x < W) FX.burst(s.x, s.y, s.color, 8, 160, 3, 0);
    this.shots = this.shots.filter((s) => !s.dead);
  },

  update(dt) {
    if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.35; }
    this.t += dt;
    this.phaseT += dt;
    const p = this.p;
    const e = this.e;

    let pc = noCtrl();
    let ec = noCtrl();
    if (this.phase === 'intro') {
      if (this.phaseT > 2.6) { this.phase = 'fight'; this.phaseT = 0; }
    } else if (this.phase === 'fight') {
      pc = this.playerControl();
      ec = this.aiControl(e, p, dt);
    }

    this.updateFighter(p, e, pc, dt);
    this.updateFighter(e, p, ec, dt);

    // Empurra os lutadores para não ficarem um dentro do outro
    const minDist = (p.w + e.w) / 2;
    const dist = e.x - p.x;
    if (Math.abs(dist) < minDist && Math.abs(p.y - e.y) < 60 && p.state !== 'ko' && e.state !== 'ko') {
      const push = (minDist - Math.abs(dist)) / 2;
      const sgn = Math.sign(dist) || 1;
      p.x = clamp(p.x - sgn * push, 40, W - 40);
      e.x = clamp(e.x + sgn * push, 40, W - 40);
    }

    this.updateShots(dt);
    FX.update(dt);

    if (this.phase === 'fight' && (p.state === 'ko' || e.state === 'ko')) {
      this.phase = 'ko';
      this.phaseT = 0;
      this.won = e.state === 'ko';
    }
    if (this.phase === 'ko' && this.phaseT > 1.6) {
      this.phase = 'done';
      Game.onFightEnd(this.won);
    }
  },

  /* ---------- Desenho ---------- */
  draw(g) {
    g.save();
    if (FX.shake > 0) g.translate(rand(-FX.shake, FX.shake), rand(-FX.shake, FX.shake));
    drawArenaBg(g, this.level.theme, this.level.seed, this.t, GROUND_Y);

    for (const f of [this.p, this.e]) this.drawShadow(g, f);
    // O lutador atacando fica na frente
    const order = this.p.state === 'punch' ? [this.e, this.p] : [this.p, this.e];
    for (const f of order) this.drawFighter(g, f);

    for (const f of [this.p, this.e]) this.drawBeam(g, f, f === this.p ? this.e : this.p);

    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const s of this.shots) {
      glow(g, s.x, s.y, s.r * 2.6, s.color);
      g.fillStyle = s.color;
      for (let i = 1; i <= 4; i++) {
        g.globalAlpha = 0.25 - i * 0.05;
        g.beginPath(); g.arc(s.x - Math.sign(s.vx) * i * 10, s.y, s.r * (1 - i * 0.15), 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(s.x, s.y, s.r * 0.6, 0, Math.PI * 2); g.fill();
    }
    g.restore();

    FX.draw(g);
    if (Game.debug) this.drawDebug(g);
    g.restore();

    this.drawHud(g);
    this.drawPhaseText(g);
  },

  drawShadow(g, f) {
    const k = clamp(1 - (GROUND_Y - f.y) / 400, 0.3, 1);
    g.fillStyle = `rgba(0,0,0,${0.3 * k})`;
    g.beginPath();
    g.ellipse(f.x, GROUND_Y + 2, 34 * f.s * k, 9 * k, 0, 0, Math.PI * 2);
    g.fill();
  },

  drawFighter(g, f) {
    let pose = f.state;
    if (pose === 'beam') pose = 'blast';
    const superMode = f.isPlayer && f.ki >= 100;
    const aura = f.state === 'charge' || f.state === 'beam' ? f.cfg.aura : superMode ? HERO.aura : null;
    drawCharacter(g, f.cfg, f.x, f.y, { facing: f.facing, pose, t: f.t, aura, super: superMode, flash: f.flash > 0 });

    if (f.state === 'beam' && f.stateT > BEAM_ACTIVE) {
      const h = handPos(f);
      const grow = 1 - (f.stateT - BEAM_ACTIVE) / (BEAM_TIME - BEAM_ACTIVE);
      glow(g, h.x, h.y, 20 + grow * 40, f.cfg.shot);
    }
    if (f.state === 'ko' && f.onGround) {
      // Estrelinhas de "tonto" (ninguém se machuca de verdade!)
      const hx = f.x - f.facing * 100 * f.s;
      for (let i = 0; i < 3; i++) {
        const a = f.t * 4 + (i * Math.PI * 2) / 3;
        text(g, '★', hx + Math.cos(a) * 26, GROUND_Y - 34 + Math.sin(a) * 8, { size: 18, color: '#ffd54a', align: 'center', stroke: '#1b1030', lw: 3 });
      }
    }
  },

  drawBeam(g, f, opp) {
    if (!beamActive(f)) return;
    const r = this.beamRect(f, opp);
    const h = handPos(f);
    const wob = Math.sin(this.t * 50) * 3;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const layers = [[56 + wob, f.cfg.shot, 0.35], [36 + wob, f.cfg.shot, 0.7], [16, '#ffffff', 1]];
    for (const [hh, col, a] of layers) {
      g.globalAlpha = a;
      g.fillStyle = col;
      roundRect(g, r.x, h.y - hh / 2, r.w, hh, hh / 2);
      g.fill();
    }
    g.restore();
    glow(g, h.x, h.y, 50, f.cfg.shot);
    if (r.end.clash) glow(g, r.end.x, h.y, 70 + wob * 4, '#ffffff');
  },

  drawBar(g, x, y, w, h, value, max, colors, alignRight, ghost) {
    panel(g, x - 3, y - 3, w + 6, h + 6, { r: (h + 6) / 2, fill: 'rgba(12,10,36,0.85)', stroke: 'rgba(255,255,255,0.5)' });
    const k = clamp(value / max, 0, 1);
    if (ghost !== undefined) {
      const kg = clamp(ghost / max, 0, 1);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      roundRect(g, alignRight ? x + w - w * kg : x, y, w * kg, h, h / 2);
      g.fill();
    }
    if (k > 0) {
      const grd = g.createLinearGradient(0, y, 0, y + h);
      grd.addColorStop(0, colors[0]);
      grd.addColorStop(1, colors[1]);
      g.fillStyle = grd;
      roundRect(g, alignRight ? x + w - w * k : x, y, w * k, h, h / 2);
      g.fill();
    }
  },

  drawHud(g) {
    const hpColors = (f) => {
      const k = f.hp / f.maxHp;
      return k > 0.5 ? ['#9cff57', '#2e9d3a'] : k > 0.25 ? ['#ffe14d', '#f9a825'] : ['#ff8a80', '#d32f2f'];
    };
    const sides = [[this.p, false], [this.e, true]];
    for (const [f, right] of sides) {
      const bw = 360;
      const x = right ? W - 24 - bw : 24;
      text(g, f.cfg.name.toUpperCase(), right ? W - 24 : 24, 32, { size: 26, color: '#fff', align: right ? 'right' : 'left', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 6 });
      text(g, `${Math.ceil(f.hp)}/${f.maxHp}`, right ? W - 24 - bw : 24 + bw, 32, { size: 14, color: '#fff', align: right ? 'left' : 'right', stroke: '#1b1030', lw: 4 });
      this.drawBar(g, x, 42, bw, 20, f.hp, f.maxHp, hpColors(f), right, f.hpShow);
      const kw = 240;
      const kx = right ? W - 24 - kw : 24;
      const full = f.ki >= 100;
      this.drawBar(g, kx, 72, kw, 10, f.ki, 100, full ? ['#ffffff', HERO.aura] : ['#7ef9ff', '#1e88e5'], right);
      text(g, 'KI', right ? kx - 10 : kx + kw + 10, 82, { size: 13, color: '#7ef9ff', align: right ? 'right' : 'left', stroke: '#1b1030', lw: 3 });
      if (f.isPlayer && full && Math.sin(this.t * 10) > -0.3) {
        text(g, IS_TOUCH ? 'ESPECIAL PRONTO!' : 'APERTE I: ESPECIAL!', kx, 106, { size: 16, color: '#ffd54a', stroke: '#1b1030', lw: 4 });
      }
    }
    text(g, this.isBoss ? 'CHEFE DA FASE' : `FASE ${this.levelIndex + 1}`, W / 2, 34, { size: 22, color: this.isBoss ? '#ff5252' : '#ffd54a', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 6 });
    text(g, 'VS', W / 2, 62, { size: 20, color: '#fff', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 5 });

    if (!IS_TOUCH && (this.phase === 'fight' || this.phase === 'intro')) {
      const hint = '←→ andar   ↑ pular (2x)   J soco   K rajada   L carregar   I especial   P modo programador';
      g.font = `900 13px ${FONT_BODY}`;
      const w = g.measureText(hint).width + 28;
      panel(g, W / 2 - w / 2, H - 34, w, 26, { r: 13, fill: 'rgba(12,10,36,0.6)' });
      text(g, hint, W / 2, H - 16, { size: 13, color: '#e8e6ff', align: 'center' });
    }
  },

  drawPhaseText(g) {
    const big = (str, color, size, scale = 1) => {
      g.save();
      g.translate(W / 2, H / 2 - 30);
      g.scale(scale, scale);
      text(g, str, 0, 0, { size, color, align: 'center', base: 'middle', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 12 });
      g.restore();
    };
    if (this.phase === 'intro') {
      const t = this.phaseT;
      if (t < 1.3) {
        const a = clamp(t * 4, 0, 1);
        g.globalAlpha = a;
        big(this.level.name.toUpperCase(), '#ffffff', 64);
        text(g, `${HERO.name}  vs  ${this.enemyCfg.name}, ${this.enemyCfg.title}`, W / 2, H / 2 + 30, { size: 22, color: '#ffd54a', align: 'center', stroke: '#1b1030', lw: 6 });
        g.globalAlpha = 1;
      } else if (t < 2.0) {
        big('PRONTO?', '#ffffff', 90, 1 + (2.0 - t) * 0.3);
      } else {
        big('LUTE!', '#ffd54a', 120, 1 + (2.6 - t) * 0.8);
      }
    } else if (this.phase === 'ko' || this.phase === 'done') {
      big('K.O.!', '#ff5c8a', 140, 1 + Math.max(0, 0.4 - this.phaseT));
    }
  },

  drawDebug(g) {
    g.lineWidth = 2;
    for (const f of [this.p, this.e]) {
      const b = bodyBox(f);
      g.strokeStyle = f.isPlayer ? '#00e5ff' : '#ff1744';
      g.strokeRect(b.x, b.y, b.w, b.h);
      if (f.state === 'punch') {
        const pb = punchBox(f);
        g.strokeStyle = '#ffd54a';
        g.strokeRect(pb.x, pb.y, pb.w, pb.h);
      }
      const opp = f === this.p ? this.e : this.p;
      if (beamActive(f)) {
        const r = this.beamRect(f, opp);
        g.strokeStyle = '#ffd54a';
        g.strokeRect(r.x, r.y, r.w, r.h);
      }
      const lines = [
        `estado: ${f.state}`,
        `vida: ${Math.ceil(f.hp)}   ki: ${Math.floor(f.ki)}`,
        `x: ${Math.round(f.x)}  y: ${Math.round(f.y)}  vx: ${Math.round(f.vx)}`,
      ];
      if (!f.isPlayer) lines.push(`IA: ${f.ai.last}`);
      lines.forEach((l, i) => text(g, l, f.x, b.y - 60 + i * 15, { size: 12, color: f.isPlayer ? '#00e5ff' : '#ff8a80', align: 'center', stroke: '#000', lw: 3 }));
    }
    for (const s of this.shots) {
      g.strokeStyle = '#ffd54a';
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.setLineDash([6, 6]);
    g.beginPath(); g.moveTo(0, GROUND_Y); g.lineTo(W, GROUND_Y); g.stroke();
    g.setLineDash([]);
    text(g, `chão: y = ${GROUND_Y}   gravidade: ${GRAVITY}`, 12, GROUND_Y - 8, { size: 12, color: '#fff', stroke: '#000', lw: 3 });
  },
};

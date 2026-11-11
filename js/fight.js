'use strict';
/* =========================================================
   FIGHT — duelo 2D: socos, chutes, combos, defesa, teleporte,
   onda de energia, esfera gigante, transformação e IA
   ========================================================= */

const GROUND_Y = 462;
const GRAVITY = 2000;
const JUMP_SPEED = 800;
const COST = { blast: 8, teleport: 20, beam: 50, sphere: 100 };
const BEAM_CHARGE = 0.65;
const BEAM_FIRE = 1.0;
const SPHERE_HOLD = 1.3;
const HIT_WORDS = ['POW!', 'BAM!', 'TUM!', 'PÁ!', 'SOC!'];
const KICK_WORDS = ['VAP!', 'TÓIN!', 'PLAFT!', 'BUM!'];
const HEAVY_WORDS = ['CABUM!', 'KA-POW!', 'WHAM!'];

/* Golpes corpo a corpo.
   wind = preparação, act = momento do golpe, rec = recuperação (em segundos).
   windP / hitP = pose durante a preparação e no impacto. limb = parte do corpo que acerta. */
const MOVES = {
  jab: {
    kind: 'punch', limb: 'fh', dmg: 6, wind: 0.06, act: 0.09, rec: 0.13, kb: 180, stun: 0.34,
    windP: { fh: [6, -76], bh: [10, -70], lean: -0.05 },
    hitP: { fh: [62, -84], bh: [8, -68], ff: [22, 0], bf: [-18, 0], lean: 0.2, crouch: 2 },
  },
  cross: {
    kind: 'punch', limb: 'bh', dmg: 7, wind: 0.07, act: 0.09, rec: 0.15, kb: 200, stun: 0.36,
    windP: { bh: [-18, -72], fh: [22, -78], lean: -0.15 },
    hitP: { bh: [64, -84], fh: [12, -70], ff: [24, 0], bf: [-24, 0], lean: 0.4, crouch: 4 },
  },
  upper: {
    kind: 'punch', limb: 'fh', dmg: 11, wind: 0.1, act: 0.12, rec: 0.26, kb: 240, lift: -660, knock: true, stun: 0.5,
    windP: { fh: [12, -40], bh: [8, -60], crouch: 18, lean: 0.18 },
    hitP: { fh: [34, -134], bh: [2, -70], crouch: -8, lean: -0.14, ff: [16, -8], bf: [-12, 0] },
  },
  lowkick: {
    kind: 'kick', limb: 'ff', dmg: 7, wind: 0.07, act: 0.1, rec: 0.15, kb: 200, stun: 0.36,
    windP: { ff: [2, -28], lean: -0.08 },
    hitP: { ff: [64, -30], bf: [-12, 0], lean: -0.3, fh: [20, -82], bh: [-8, -74], crouch: 4 },
  },
  highkick: {
    kind: 'kick', limb: 'ff', dmg: 9, wind: 0.08, act: 0.11, rec: 0.17, kb: 220, stun: 0.4,
    windP: { ff: [8, -46], lean: -0.15, crouch: 4 },
    hitP: { ff: [62, -98], bf: [-6, 0], lean: -0.52, fh: [8, -90], bh: [-26, -80] },
  },
  roundhouse: {
    kind: 'kick', limb: 'ff', dmg: 13, wind: 0.12, act: 0.12, rec: 0.3, kb: 580, lift: -400, knock: true, stun: 0.5,
    windP: { ff: [-24, -32], bf: [-4, 0], lean: 0.28, crouch: 8, fh: [-10, -80], bh: [-28, -70] },
    hitP: { ff: [66, -80], bf: [-4, 0], lean: -0.62, fh: [-24, -98], bh: [-34, -70] },
  },
  airkick: {
    kind: 'kick', limb: 'ff', dmg: 10, wind: 0.05, act: 0.24, rec: 0.12, kb: 300, stun: 0.42, air: true,
    windP: { ff: [0, -32], bf: [-10, -24], lean: 0.1 },
    hitP: { ff: [52, -8], bf: [-14, -36], lean: 0.38, fh: [20, -92], bh: [-26, -98] },
  },
  tpstrike: {
    kind: 'punch', limb: 'fh', dmg: 12, wind: 0.05, act: 0.1, rec: 0.25, kb: 540, lift: -420, knock: true, stun: 0.5,
    windP: { fh: [0, -92], lean: -0.1 },
    hitP: { fh: [62, -72], bh: [0, -80], ff: [26, 0], bf: [-26, 0], lean: 0.38, crouch: 6 },
  },
};
const CHAINS = { punch: ['jab', 'cross', 'upper'], kick: ['lowkick', 'highkick', 'roundhouse'] };

function noCtrl() {
  return { move: 0, jump: false, punch: false, kick: false, blast: false, beam: false, teleport: false, sphere: false, charge: false, guard: false, force: null };
}

function makeFighter(cfg, isPlayer, x, facing, hp, mult) {
  const s = cfg.scale || 1;
  return {
    cfg, isPlayer, x, y: GROUND_Y, vx: 0, vy: 0, facing,
    hp, maxHp: hp, hpShow: hp, ki: isPlayer ? 40 : 30,
    state: 'idle', st: 0, move: null, moveName: '', hitDone: false, buffer: null,
    chain: 0, chainT: 0, hurtT: 0, inv: 0, flash: 0, cd: 0, t: 0,
    onGround: true, jumps: 0, guarding: false, lie: 0,
    combo: 0, comboT: 0, superT: 0, transformed: false, chargeHold: 0,
    beamTick: 0, sphereR: 0, sphereThrown: false, atkId: 0, trail: [], trailT: 0, anim: null,
    w: 44 * s, h: 118 * s, s,
    speed: isPlayer ? 320 : cfg.speed, mult,
    ai: { t: 0.8, move: 0, moveT: 0, chargeT: 0, guardT: 0, queue: [], seenAtk: -1, last: 'esperando...' },
  };
}

const bodyBox = (f) => ({ x: f.x - f.w / 2, y: f.y - f.h, w: f.w, h: f.h });
const hasMove = (f, m) => f.isPlayer || (f.cfg.moves || []).includes(m);
const powerOf = (f) => f.mult * (f.superT > 0 ? 1.3 : 1);
// Converte um ponto do corpo (pose) para a posição na tela
const limbWorld = (f, p) => ({ x: f.x + f.facing * p[0] * f.s, y: f.y + p[1] * f.s });
const FREE = new Set(['idle', 'walk', 'jump', 'charge', 'guard']);

function circleHitsBox(cx, cy, r, b) {
  const nx = clamp(cx, b.x, b.x + b.w);
  const ny = clamp(cy, b.y, b.y + b.h);
  return Math.hypot(cx - nx, cy - ny) < r;
}

const Fight = {
  levelIndex: 0,
  level: null,
  enemyCfg: null,
  isBoss: false,
  p: null,
  e: null,
  shots: [],
  phase: 'intro',
  phaseT: 0,
  t: 0,
  slowmo: 0,
  hitStop: 0,
  won: false,

  start(levelIndex, playerHp, enemyCfg = null) {
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    const E = enemyCfg || this.level.enemy;
    this.enemyCfg = E;
    this.isBoss = !enemyCfg;
    this.p = makeFighter(HERO, true, 230, 1, playerHp, 1 + levelIndex * 0.15);
    this.e = makeFighter(E, false, W - 230, -1, E.hp, E.dmg / 6);
    this.shots = [];
    this.phase = 'intro';
    this.phaseT = 0;
    this.t = 0;
    this.slowmo = 0;
    this.hitStop = 0;
    this.won = false;
    FX.clear();
  },

  /* ---------- Controles do jogador ---------- */
  playerControl() {
    return {
      move: (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0),
      jump: Input.tapped('up'),
      punch: Input.tapped('punch'),
      kick: Input.tapped('kick'),
      blast: Input.tapped('blast'),
      beam: Input.tapped('beam'),
      teleport: Input.tapped('teleport'),
      sphere: Input.tapped('sphere'),
      charge: Input.held('charge'),
      guard: Input.held('down'),
      force: null,
    };
  },

  /* ---------- Inteligência do inimigo: muitos SE/SENÃO! ---------- */
  aiControl(f, opp, dt) {
    const c = noCtrl();
    const ai = f.ai;
    const P = f.cfg;
    const skill = P.skill || 0.3;
    ai.t -= dt;
    ai.moveT -= dt;
    ai.chargeT -= dt;
    ai.guardT -= dt;
    if (!FREE.has(f.state) && f.state !== 'attack') { ai.queue.length = 0; return c; }

    const dx = opp.x - f.x;
    const ad = Math.abs(dx);
    const dir = Math.sign(dx) || 1;

    // Continua o combo: aperta o próximo golpe enquanto o atual acontece
    if (f.state === 'attack') {
      if (ai.queue.length && f.move && f.st > f.move.wind) c[ai.queue.shift()] = true;
      return c;
    }

    // Transformação quando está perdendo
    if (P.transform && !f.transformed && f.hp < f.maxHp * 0.5) {
      this.transform(f, true);
      ai.last = 'vida baixa → FORMA FINAL!';
      return c;
    }

    // Reação a um ataque do jogador (decide uma vez por golpe)
    const oppAttacking = opp.state === 'attack' || opp.state === 'beam' || opp.state === 'tpprep';
    if (oppAttacking && opp.atkId !== ai.seenAtk && ad < (opp.state === 'beam' ? 999 : 150)) {
      ai.seenAtk = opp.atkId;
      const r = Math.random();
      if (r < skill * 0.55) { ai.guardT = 0.45; ai.last = 'ataque vindo → DEFENDER'; }
      else if (r < skill * 0.75 && f.ki >= COST.teleport && hasMove(f, 'teleport') && opp.state !== 'beam') { c.teleport = true; ai.last = 'ataque vindo → TELEPORTE!'; return c; }
      else if (opp.state === 'beam' && r < skill * 0.9) { c.jump = true; ai.last = 'onda vindo → PULAR'; }
    }
    // Rajadas e esferas vindo na direção dele
    for (const s of this.shots) {
      if (s.owner === f || s.seen) continue;
      if (Math.sign(f.x - s.x) === Math.sign(s.vx) && Math.abs(s.x - f.x) < 260) {
        s.seen = true;
        const r = Math.random();
        if (r < skill * 0.5) { ai.guardT = 0.4; ai.last = 'rajada vindo → DEFENDER'; }
        else if (r < skill * 0.8) { c.jump = true; ai.last = 'rajada vindo → PULAR'; }
      }
    }
    if (ai.guardT > 0) { c.guard = true; return c; }

    // Antiaéreo: jogador pulando por cima → gancho
    if (!opp.onGround && ad < 90 && opp.y < f.y - 30 && Math.random() < skill * 0.06) {
      c.force = 'upper';
      ai.last = 'inimigo no ar → GANCHO';
      return c;
    }

    if (ad < 80) ai.chargeT = 0;

    if (ai.t <= 0) {
      ai.t = P.think * (0.5 + Math.random() * 0.6);
      const r = Math.random();
      if (hasMove(f, 'sphere') && f.ki >= COST.sphere && ad > 280 && r < 0.5) {
        c.sphere = true; ai.last = 'longe + energia cheia → ESFERA GIGANTE';
      } else if (hasMove(f, 'beam') && f.ki >= COST.beam && Math.abs(opp.y - f.y) < 80 && r < 0.3) {
        c.beam = true; ai.last = 'energia → ONDA';
      } else if (ad < 95) {
        // Combo! Quanto maior a habilidade, mais golpes seguidos
        const n = 2 + Math.floor(Math.random() * (1 + skill * 2.5));
        const first = Math.random() < 0.5 ? 'punch' : 'kick';
        c[first] = true;
        ai.queue = Array.from({ length: n - 1 }, () => (Math.random() < 0.5 ? 'punch' : 'kick'));
        ai.last = `perto → COMBO de ${n}`;
      } else if (ad < 300) {
        if (r < 0.12 + skill * 0.15 && f.ki >= COST.teleport && hasMove(f, 'teleport')) { c.teleport = true; ai.last = 'médio → TELEPORTE + ataque'; }
        else if (r < 0.75) { ai.move = dir; ai.moveT = 0.45; ai.last = 'médio → avançar'; }
        else if (r < 0.88) { c.jump = true; ai.move = dir; ai.moveT = 0.5; ai.last = 'médio → pular e chutar'; ai.queue = ['kick']; }
        else if (f.ki >= COST.blast) { c.blast = true; ai.last = 'médio → RAJADA'; }
      } else {
        if (r < 0.4 && f.ki >= COST.blast) { c.blast = true; ai.last = 'longe → RAJADA'; }
        else if (r < 0.55 && f.ki < 90) { ai.chargeT = 0.7; ai.last = 'longe → carregar energia'; }
        else { ai.move = dir; ai.moveT = 0.6; ai.last = 'longe → aproximar'; }
      }
    }

    // Chute voador enquanto está no ar
    if (!f.onGround && ai.queue[0] === 'kick' && f.vy > -200) { c.kick = true; ai.queue.shift(); }

    if (ai.chargeT > 0) c.charge = true;
    else if (ai.moveT > 0) {
      c.move = ai.move;
      if (ad < 70 && ai.move === dir) { c.move = 0; ai.moveT = 0; }
    }
    return c;
  },

  /* ---------- Ações ---------- */
  setState(f, s) { f.state = s; f.st = 0; },

  beginMove(f, name) {
    const m = MOVES[name];
    this.setState(f, 'attack');
    f.move = m;
    f.moveName = name;
    f.hitDone = false;
    f.buffer = null;
    f.atkId++;
    if (m.air) { f.vx = f.facing * 460; f.vy = 520; }
    else if (f.onGround) f.vx = f.facing * (m.kind === 'punch' ? 140 : 100);
    Sound.play('whoosh');
  },

  startAttack(f, kind) {
    if (!f.onGround) { this.beginMove(f, kind === 'kick' ? 'airkick' : 'jab'); return; }
    f.chain = f.chainT > 0 ? (f.chain + 1) % 3 : 0;
    this.beginMove(f, CHAINS[kind][f.chain]);
  },

  startBlast(f) {
    f.ki -= COST.blast;
    f.cd = 0.2;
    this.setState(f, 'blast');
    const h = limbWorld(f, [60, -78]);
    this.shots.push({ kind: 'blast', x: h.x, y: h.y, vx: f.facing * 700, vy: 0, r: 12, owner: f, color: f.cfg.shot, dmg: 6 * powerOf(f), life: 2 });
    Sound.play('blast');
  },

  startBeam(f) {
    f.ki -= COST.beam;
    this.setState(f, 'beam');
    f.beamTick = 0;
    f.atkId++;
    f.vx = 0;
    f.vy = 0;
    FX.pop(f.x, f.y - f.h - 40, f.cfg.special, f.cfg.aura, 38);
    Sound.play('beam');
  },

  startSphere(f) {
    f.ki -= COST.sphere;
    this.setState(f, 'sphere');
    f.sphereR = 6;
    f.sphereThrown = false;
    f.atkId++;
    f.vx = 0;
    FX.pop(f.x, f.y - f.h - 90, f.cfg.sphereName || 'ESFERA GIGANTE!', '#ffd54a', 36);
    Sound.play('sphere');
  },

  startTeleport(f) {
    f.ki -= COST.teleport;
    this.setState(f, 'tpprep');
    f.atkId++;
    f.vx = 0;
  },

  transform(f, permanent = false) {
    this.setState(f, 'transform');
    f.transformed = true;
    f.superT = permanent ? 9999 : 14;
    f.inv = 0.9;
    f.vx = 0;
    FX.ring(f.x, f.y - 60, '#ffffff', 160, 0.6);
    FX.ring(f.x, f.y - 60, f.isPlayer ? '#ffe14d' : f.cfg.aura, 220, 0.8);
    FX.burst(f.x, f.y - 60, f.isPlayer ? '#ffe14d' : f.cfg.aura, 40, 500, 5, 0);
    FX.pop(f.x, f.y - f.h - 50, f.isPlayer ? 'MODO SUPER!' : 'FORMA FINAL!', '#ffe14d', 44);
    FX.shake = 16;
    this.hitStop = 0.15;
    Sound.play('transform');
  },

  hittable(f) {
    return f.state !== 'ko' && f.state !== 'vanish' && f.state !== 'down' && f.state !== 'getup' && f.inv <= 0;
  },

  /**
   * Aplica dano (com defesa, combo, empurrão e efeitos).
   * o: { srcX, dir, kb, lift, knock, stun, kind: 'melee'|'blast'|'sphere'|'beam', fx: {x,y}, words }
   */
  applyDamage(att, tgt, dmg, o) {
    if (!this.hittable(tgt)) return false;
    const fromFront = Math.sign(o.srcX - tgt.x) === tgt.facing;
    const blocking = tgt.guarding && fromFront && tgt.onGround;
    const fx = o.fx || { x: tgt.x, y: tgt.y - tgt.h * 0.6 };

    if (blocking) {
      const k = o.kind === 'sphere' ? 0.35 : o.kind === 'beam' ? 0.25 : 0.12;
      tgt.hp = Math.max(1, tgt.hp - dmg * k);
      this.setState(tgt, 'block');
      tgt.hurtT = o.kind === 'beam' ? 0.1 : 0.18;
      tgt.vx = o.dir * (o.kind === 'sphere' ? 500 : 240);
      tgt.ki = Math.min(100, tgt.ki + 2);
      tgt.guarding = true;
      if (o.kind === 'melee') att.vx = -o.dir * 120;
      FX.sparks(fx.x, fx.y, -o.dir, '#7ef9ff', 5, 30);
      if (o.kind !== 'beam' || Math.random() < 0.15) {
        FX.ring(fx.x, fx.y, '#7ef9ff', 40, 0.2);
        if (Math.random() < 0.4) FX.pop(tgt.x, tgt.y - tgt.h - 20, 'DEFESA!', '#7ef9ff', 22);
        Sound.play('block');
      }
      this.hitStop = Math.max(this.hitStop, 0.04);
      return true;
    }

    // Combo: golpes seguidos enquanto o outro ainda está tonto
    const inCombo = tgt.state === 'hurt' || tgt.state === 'launched';
    if (o.kind === 'melee' || o.kind === 'blast') {
      att.combo = inCombo ? att.combo + 1 : 1;
      att.comboT = 1.2;
    }
    const scale = Math.max(0.5, 1 - 0.08 * Math.max(0, att.combo - 1));
    tgt.hp = Math.max(0, tgt.hp - dmg * scale);
    tgt.flash = 0.1;
    att.ki = Math.min(100, att.ki + (o.kind === 'beam' ? 0 : 6));
    tgt.ki = Math.min(100, tgt.ki + 3);
    tgt.move = null;
    tgt.sphereR = 0;

    if (o.knock || tgt.hp <= 0 || o.kind === 'sphere') {
      this.setState(tgt, 'launched');
      tgt.vx = o.dir * (o.kb || 400);
      tgt.vy = o.lift || -460;
      tgt.onGround = false;
    } else if (tgt.state === 'launched') {
      tgt.vy = -380; // malabarismo no ar!
      tgt.vx = o.dir * 120;
    } else {
      this.setState(tgt, 'hurt');
      tgt.hurtT = o.stun || 0.3;
      tgt.vx = o.dir * (o.kb || 200);
      if (!tgt.onGround) tgt.vy = -260;
    }

    const heavy = o.knock || o.kind === 'sphere';
    if (o.kind !== 'beam' || Math.random() < 0.25) {
      FX.burst(fx.x, fx.y, '#ffffff', heavy ? 18 : 10, heavy ? 420 : 280, 3.5);
      FX.burst(fx.x, fx.y, '#ffd54a', 8, 220, 3);
      FX.ring(fx.x, fx.y, heavy ? '#ffd54a' : '#ffffff', heavy ? 90 : 50, heavy ? 0.35 : 0.22);
      FX.sparks(fx.x, fx.y, o.dir, '#ffffff', heavy ? 10 : 6, heavy ? 60 : 40);
      const words = heavy ? HEAVY_WORDS : o.words || HIT_WORDS;
      FX.pop(fx.x + rand(-20, 20), fx.y - 34, pick(words), heavy ? '#ff7a3c' : '#ffd54a', heavy ? 44 : 32);
      Sound.play(heavy ? 'heavy' : 'hit');
    }
    FX.shake = Math.max(FX.shake, heavy ? 14 : o.kind === 'beam' ? 4 : 7);
    this.hitStop = Math.max(this.hitStop, heavy ? 0.12 : o.kind === 'beam' ? 0 : 0.06);

    if (tgt.hp <= 0) {
      this.setState(tgt, 'ko');
      tgt.vy = -680;
      tgt.vx = o.dir * 460;
      tgt.onGround = false;
      this.slowmo = 1.0;
      FX.shake = 20;
      FX.burst(fx.x, fx.y, '#ffffff', 34, 480, 5);
      FX.ring(fx.x, fx.y, '#ffffff', 200, 0.6);
      Sound.play('ko');
    }
    return true;
  },

  /* ---------- Atualização de um lutador ---------- */
  updateFighter(f, opp, c, dt) {
    f.t += dt;
    f.st += dt;
    f.flash = Math.max(0, f.flash - dt);
    f.cd = Math.max(0, f.cd - dt);
    f.inv = Math.max(0, f.inv - dt);
    f.chainT = Math.max(0, f.chainT - dt);
    f.comboT -= dt;
    if (f.comboT <= 0) f.combo = 0;
    if (f.superT > 0) {
      f.superT -= dt;
      if (Math.random() < dt * 25) FX.burst(f.x + rand(-26, 26), f.y - rand(0, 100), f.isPlayer ? '#ffe14d' : f.cfg.aura, 1, 40, 2.5, -260);
    }
    f.hpShow = lerp(f.hpShow, f.hp, Math.min(1, dt * 6));
    if (f.state !== 'block') f.guarding = false;
    const wasOnGround = f.onGround;
    const dirTo = opp.x > f.x ? 1 : -1;

    switch (f.state) {
      case 'ko':
      case 'launched':
        this.physics(f, dt);
        if (f.onGround) {
          f.vx *= Math.pow(0.01, dt);
          if (f.state === 'launched') {
            this.setState(f, 'down');
            f.inv = 0.8;
            FX.dust(f.x, GROUND_Y, 10);
            FX.shake = Math.max(FX.shake, 6);
          }
        }
        break;
      case 'down':
        f.vx *= Math.pow(0.01, dt);
        this.physics(f, dt);
        if (f.st > 0.5) { this.setState(f, 'getup'); f.inv = 0.3; }
        break;
      case 'getup':
        if (f.st > 0.22) this.setState(f, 'idle');
        break;
      case 'hurt':
      case 'block':
        f.hurtT -= dt;
        f.vx *= Math.pow(0.03, dt);
        this.physics(f, dt);
        if (f.hurtT <= 0) this.setState(f, 'idle');
        break;
      case 'attack':
        this.updateAttack(f, opp, c, dt);
        this.physics(f, dt);
        break;
      case 'blast':
        this.physics(f, dt);
        if (f.st > 0.16) this.setState(f, 'idle');
        break;
      case 'beam':
        f.vx = 0;
        f.vy = 0;
        if (f.st < BEAM_CHARGE) {
          if (Math.random() < 0.6) {
            const h = limbWorld(f, [-30, -54]);
            FX.burst(h.x + rand(-40, 40), h.y + rand(-40, 40), f.cfg.shot, 1, 30, 2.5, 0);
          }
        } else if (f.st < BEAM_CHARGE + BEAM_FIRE) {
          this.updateBeam(f, opp, dt);
        } else this.setState(f, 'idle');
        break;
      case 'sphere':
        f.vx = 0;
        if (f.st < SPHERE_HOLD) {
          f.sphereR = 6 + (f.st / SPHERE_HOLD) * 44;
          if (Math.random() < 0.8) {
            const a = rand(0, Math.PI * 2);
            FX.parts.push({ x: f.x + Math.cos(a) * 180, y: f.y - 200 * f.s + Math.sin(a) * 140, vx: -Math.cos(a) * 340, vy: -Math.sin(a) * 260, life: 0.5, max: 0.5, color: '#ffe082', size: 3, gravity: 0 });
          }
        } else if (!f.sphereThrown) {
          f.sphereThrown = true;
          const sx = f.x;
          const sy = f.y - 200 * f.s;
          const speed = 420;
          const time = Math.max(0.35, Math.abs(opp.x - sx) / speed);
          this.shots.push({ kind: 'sphere', x: sx, y: sy, vx: f.facing * speed, vy: (opp.y - 50 - sy) / time, r: 46, owner: f, color: '#ffd54a', dmg: 40 * powerOf(f), life: 3 });
          f.sphereR = 0;
          Sound.play('blast');
        } else if (f.st > SPHERE_HOLD + 0.4) this.setState(f, 'idle');
        this.physics(f, dt);
        break;
      case 'tpprep':
        if (f.st > 0.16) {
          this.setState(f, 'vanish');
          f.inv = 0.2;
          FX.burst(f.x, f.y - 60, '#ffffff', 14, 260, 3, 0);
          FX.pop(f.x, f.y - f.h - 10, 'ZUM!', '#ffffff', 28);
          Sound.play('teleport');
        }
        break;
      case 'vanish':
        if (f.st > 0.14) {
          let nx = opp.x - opp.facing * 72;
          if (nx < 40 || nx > W - 40) nx = opp.x + opp.facing * 72;
          f.x = clamp(nx, 40, W - 40);
          f.y = Math.min(GROUND_Y, opp.y);
          f.vy = 0;
          f.facing = opp.x > f.x ? 1 : -1;
          FX.burst(f.x, f.y - 60, '#ffffff', 14, 260, 3, 0);
          this.beginMove(f, 'tpstrike');
        }
        break;
      case 'transform':
        f.vx = 0;
        if (Math.random() < 0.6) FX.burst(f.x + rand(-40, 40), f.y - rand(0, 30), f.isPlayer ? '#ffe14d' : f.cfg.aura, 1, 60, 3, -500);
        this.physics(f, dt);
        if (f.st > 0.9) this.setState(f, 'idle');
        break;
      default:
        this.updateFree(f, opp, c, dt, dirTo);
        this.physics(f, dt);
        break;
    }

    if (!wasOnGround && f.onGround && f.state !== 'ko' && f.state !== 'down') FX.dust(f.x, GROUND_Y, 5);
    if (f.state !== 'charge' && f.state !== 'beam' && f.state !== 'sphere') f.ki = Math.min(100, f.ki + (f.superT > 0 ? 9 : 4) * dt);
    this.updateAnim(f, opp, dt);
  },

  updateFree(f, opp, c, dt, dirTo) {
    f.facing = dirTo;
    if (c.force) { this.beginMove(f, c.force); return; }
    const back = c.move === -dirTo;
    f.guarding = f.onGround && (c.guard || back);

    if (c.charge && f.onGround) {
      if (f.state !== 'charge') this.setState(f, 'charge');
      f.vx = 0;
      f.ki = Math.min(100, f.ki + 42 * dt);
      if (Math.random() < dt * 8) Sound.play('charge');
      if (Math.random() < dt * 30) FX.burst(f.x + rand(-30, 30), f.y - rand(0, 40), f.cfg.aura, 1, 60, 3, -300);
      if (f.isPlayer && f.ki >= 100 && f.superT <= 0) {
        f.chargeHold += dt;
        if (f.chargeHold > 0.8) { f.chargeHold = 0; this.transform(f); }
      }
      return;
    }
    f.chargeHold = 0;

    const sp = f.speed * (f.superT > 0 ? 1.15 : 1) * (back ? 0.75 : 1);
    if (c.guard && f.onGround) { f.vx = 0; if (f.state !== 'guard') this.setState(f, 'guard'); }
    else {
      f.vx = c.move * sp;
      const ns = !f.onGround ? 'jump' : c.move ? 'walk' : 'idle';
      if (ns !== f.state) this.setState(f, ns);
    }
    if (c.jump && f.jumps < 2) {
      f.vy = -JUMP_SPEED * (f.jumps ? 0.85 : 1);
      f.jumps++;
      f.onGround = false;
      f.guarding = false;
      this.setState(f, 'jump');
      Sound.play('jump');
      if (f.jumps === 1) FX.dust(f.x, f.y, 5);
      else FX.ring(f.x, f.y, '#ffffff', 40, 0.25);
    }

    const need = (what) => { if (f.isPlayer) FX.pop(f.x, f.y - f.h - 20, `PRECISA DE ${COST[what]} DE KI (segure L)`, '#ff8a80', 18); };
    if (c.sphere && hasMove(f, 'sphere')) { if (f.ki >= COST.sphere) this.startSphere(f); else need('sphere'); }
    else if (c.beam && hasMove(f, 'beam')) { if (f.ki >= COST.beam) this.startBeam(f); else need('beam'); }
    else if (c.teleport && hasMove(f, 'teleport')) { if (f.ki >= COST.teleport) this.startTeleport(f); else need('teleport'); }
    else if (c.punch) this.startAttack(f, 'punch');
    else if (c.kick) this.startAttack(f, 'kick');
    else if (c.blast && f.cd <= 0) { if (f.ki >= COST.blast) this.startBlast(f); else need('blast'); }
  },

  updateAttack(f, opp, c, dt) {
    const m = f.move;
    if (!m) { this.setState(f, 'idle'); return; }
    const total = m.wind + m.act + m.rec;
    if (f.onGround && !m.air) f.vx *= Math.pow(0.004, dt);
    if (f.st > m.wind * 0.5) {
      if (c.punch) f.buffer = 'punch';
      else if (c.kick) f.buffer = 'kick';
    }
    // Momento do golpe: a mão/pé está esticado? Encostou no corpo do outro?
    if (!f.hitDone && f.st >= m.wind && f.st < m.wind + m.act) {
      const p = limbWorld(f, m.hitP[m.limb]);
      if (this.hittable(opp) && circleHitsBox(p.x, p.y, 28 * f.s, bodyBox(opp))) {
        f.hitDone = true;
        this.applyDamage(f, opp, m.dmg * powerOf(f), {
          srcX: f.x, dir: f.facing, kb: m.kb, lift: m.lift, knock: m.knock, stun: m.stun,
          kind: 'melee', fx: p, words: m.kind === 'kick' ? KICK_WORDS : HIT_WORDS,
        });
      }
    }
    const landed = m.air && f.onGround && f.st > m.wind;
    if (f.st >= total || landed) {
      this.setState(f, 'idle');
      f.move = null;
      f.chainT = 0.4;
      if (f.buffer) { const b = f.buffer; f.buffer = null; this.startAttack(f, b); }
    }
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

  /* ---------- Animação: escolhe a pose-alvo e suaviza ---------- */
  targetPose(f, opp) {
    const t = f.t;
    switch (f.state) {
      case 'attack': {
        const m = f.move;
        if (!m) return POSES.idle(t);
        if (f.st < m.wind) return mergePose(GUARD, m.windP);
        if (f.st < m.wind + m.act + m.rec * 0.45) return mergePose(GUARD, m.hitP);
        return GUARD;
      }
      case 'beam': return f.st < BEAM_CHARGE ? POSES.beamCharge(t) : POSES.beamFire(t);
      case 'sphere': return f.st < SPHERE_HOLD ? POSES.sphereHold(t) : POSES.sphereThrow(t);
      case 'tpprep': return POSES.teleport(t);
      case 'charge':
      case 'transform': return POSES.charge(t);
      case 'blast': return POSES.blast(t);
      case 'hurt': return POSES.hurt(t);
      case 'block':
      case 'guard': return POSES.block(t);
      case 'launched': return POSES.launched(t);
      case 'down':
      case 'ko': return POSES.lying(t);
      case 'getup': return POSES.getup(t);
      case 'jump': return f.vy < 0 ? POSES.jump(t) : POSES.fall(t);
      case 'walk': return POSES.walk(t, Math.sign(f.vx) === f.facing ? 1 : -1);
      default: {
        const threat = (opp.state === 'attack' || opp.state === 'beam') && Math.abs(opp.x - f.x) < 220;
        return f.guarding && threat ? POSES.block(t) : POSES.idle(t);
      }
    }
  },

  updateAnim(f, opp, dt) {
    const target = this.targetPose(f, opp);
    const fast = f.state === 'attack' || f.state === 'hurt' || f.state === 'block' || f.state === 'tpprep';
    // No instante do golpe a pose "estala" direto para a extensão máxima
    const strike = f.state === 'attack' && f.move && f.st >= f.move.wind && f.st < f.move.wind + f.move.act;
    f.anim = blendPose(f.anim, target, strike ? 1 : Math.min(1, dt * (fast ? 38 : 16)));
    const lying = (f.state === 'down' || f.state === 'ko') && f.onGround;
    f.lie = lerp(f.lie, lying ? 1 : 0, Math.min(1, dt * 12));

    // Rastro de "imagens fantasmas" nos movimentos rápidos
    f.trailT -= dt;
    const fastMove = (f.state === 'attack' && f.move && f.st >= f.move.wind) || (f.state === 'launched' && Math.abs(f.vx) > 250) || (f.superT > 0 && f.state === 'walk');
    if (fastMove && f.trailT <= 0) {
      f.trailT = 0.03;
      f.trail.push({ x: f.x, y: f.y, facing: f.facing, joints: clonePose(f.anim), life: 0.16 });
    }
    for (const tr of f.trail) tr.life -= dt;
    f.trail = f.trail.filter((tr) => tr.life > 0).slice(-5);
  },

  /* ---------- Onda de energia ---------- */
  beamOrigin(f) { return limbWorld(f, [60, -64]); },
  beamActive(f) { return f.state === 'beam' && f.st >= BEAM_CHARGE && f.st < BEAM_CHARGE + BEAM_FIRE; },

  beamEnd(f, opp) {
    const h = this.beamOrigin(f);
    if (this.beamActive(opp) && opp.facing === -f.facing && (f.facing > 0 ? opp.x > f.x : opp.x < f.x)) {
      return { x: (h.x + this.beamOrigin(opp).x) / 2, clash: true };
    }
    return { x: f.facing > 0 ? W + 60 : -60, clash: false };
  },

  beamRect(f, opp) {
    const h = this.beamOrigin(f);
    const end = this.beamEnd(f, opp);
    return { x: Math.min(h.x, end.x), y: h.y - 24, w: Math.abs(end.x - h.x), h: 48, end };
  },

  updateBeam(f, opp, dt) {
    const r = this.beamRect(f, opp);
    if (r.end.clash) {
      if (Math.random() < 0.7) FX.burst(r.end.x, r.y + 24, '#ffffff', 2, 320, 3, 0);
      FX.shake = Math.max(FX.shake, 5);
      if (Math.random() < dt * 4) Sound.play('clash');
      return;
    }
    for (const s of this.shots) {
      if (s.owner !== f && s.kind === 'blast' && s.x > r.x && s.x < r.x + r.w && Math.abs(s.y - (r.y + 24)) < 34) s.dead = true;
    }
    f.beamTick -= dt;
    if (f.beamTick <= 0) {
      f.beamTick = 0.07;
      if (rectsOverlap(r, bodyBox(opp))) {
        this.applyDamage(f, opp, 2.6 * powerOf(f), { srcX: f.x, dir: f.facing, kind: 'beam', stun: 0.15, kb: 160, fx: { x: opp.x - f.facing * 10, y: r.y + 24 } });
      }
    }
  },

  /* ---------- Rajadas e esferas ---------- */
  explode(s, target) {
    s.dead = true;
    FX.burst(s.x, s.y, '#ffffff', 40, 520, 6, 0);
    FX.burst(s.x, s.y, '#ffd54a', 30, 380, 5, 0);
    FX.ring(s.x, s.y, '#ffd54a', 220, 0.6);
    FX.ring(s.x, s.y, '#ffffff', 150, 0.45);
    FX.pop(s.x, s.y - 60, 'KABOOOM!', '#ff7a3c', 56);
    FX.shake = 24;
    Sound.play('boom');
    if (Math.hypot(target.x - s.x, target.y - target.h / 2 - s.y) < 150) {
      this.applyDamage(s.owner, target, s.dmg, { srcX: s.x, dir: Math.sign(target.x - s.x) || 1, kind: 'sphere', kb: 600, lift: -620, knock: true });
    }
  },

  updateShots(dt) {
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      const target = s.owner === this.p ? this.e : this.p;
      if (s.kind === 'sphere') {
        if ((this.hittable(target) && circleHitsBox(s.x, s.y, s.r, bodyBox(target))) || s.y > GROUND_Y - 20) this.explode(s, target);
      } else if (this.hittable(target) && circleHitsBox(s.x, s.y, s.r, bodyBox(target))) {
        s.dead = true;
        this.applyDamage(s.owner, target, s.dmg, { srcX: s.x, dir: Math.sign(s.vx), kind: 'blast', stun: 0.25, kb: 220, fx: { x: s.x, y: s.y }, words: ['ZAP!', 'BUM!', 'VUSH!'] });
      }
      if (s.x < -80 || s.x > W + 80 || s.life <= 0) s.dead = true;
    }
    for (const a of this.shots) {
      for (const b of this.shots) {
        if (a === b || a.dead || b.dead || a.owner === b.owner) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) {
          if (a.kind === 'sphere' || b.kind === 'sphere') {
            (a.kind === 'sphere' ? b : a).dead = true; // a esfera engole a rajada
            continue;
          }
          a.dead = true;
          b.dead = true;
          FX.burst((a.x + b.x) / 2, a.y, '#ffffff', 18, 300, 4, 0);
          FX.pop((a.x + b.x) / 2, a.y - 30, 'PAF!', '#ffffff', 30);
          Sound.play('clash');
        }
      }
    }
    this.shots = this.shots.filter((s) => !s.dead);
  },

  update(dt) {
    FX.update(dt);
    if (this.hitStop > 0) { this.hitStop -= dt; return; } // "congela" um instante no impacto
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

    // Não deixa um lutador ficar dentro do outro
    const minDist = (p.w + e.w) / 2;
    const dist = e.x - p.x;
    const solid = (f) => f.state !== 'ko' && f.state !== 'vanish' && f.state !== 'down';
    if (Math.abs(dist) < minDist && Math.abs(p.y - e.y) < 70 && solid(p) && solid(e)) {
      const push = (minDist - Math.abs(dist)) / 2;
      const sgn = Math.sign(dist) || 1;
      p.x = clamp(p.x - sgn * push, 40, W - 40);
      e.x = clamp(e.x + sgn * push, 40, W - 40);
    }

    this.updateShots(dt);

    if (this.phase === 'fight' && (p.state === 'ko' || e.state === 'ko')) {
      this.phase = 'ko';
      this.phaseT = 0;
      this.won = e.state === 'ko';
    }
    if (this.phase === 'ko' && this.phaseT > 1.8) {
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
    const order = this.p.state === 'attack' ? [this.e, this.p] : [this.p, this.e];
    for (const f of order) this.drawFighter(g, f);
    for (const f of [this.p, this.e]) this.drawBeam(g, f, f === this.p ? this.e : this.p);
    this.drawShots(g);

    FX.draw(g);
    if (Game.debug) this.drawDebug(g);
    g.restore();

    this.drawHud(g);
    this.drawPhaseText(g);
  },

  drawShadow(g, f) {
    if (f.state === 'vanish') return;
    const k = clamp(1 - (GROUND_Y - f.y) / 400, 0.3, 1);
    g.fillStyle = `rgba(0,0,0,${0.3 * k})`;
    g.beginPath();
    g.ellipse(f.x, GROUND_Y + 2, (34 + f.lie * 30) * f.s * k, 9 * k, 0, 0, Math.PI * 2);
    g.fill();
  },

  fighterLook(f) {
    const superMode = f.superT > 0;
    const myAura = f.isPlayer && superMode ? '#ffe14d' : f.cfg.aura;
    let aura = null;
    if (f.state === 'charge' || f.state === 'beam' || f.state === 'transform' || f.state === 'sphere' || superMode) aura = myAura;
    let face = 'normal';
    if (f.state === 'hurt' || f.state === 'launched' || f.state === 'down' || f.state === 'ko') face = 'hurt';
    else if (['attack', 'beam', 'charge', 'transform', 'sphere', 'blast'].includes(f.state)) face = 'shout';
    let bigFist = null;
    if (f.state === 'attack' && f.move && f.move.kind === 'punch' && f.st >= f.move.wind) bigFist = f.move.limb;
    return { superMode, aura, face, bigFist };
  },

  drawFighter(g, f) {
    if (f.state === 'vanish' || !f.anim) return;
    const look = this.fighterLook(f);
    for (const tr of f.trail) {
      drawCharacter(g, f.cfg, tr.x, tr.y, { facing: tr.facing, joints: tr.joints, t: f.t, super: look.superMode, alpha: 0.3 * (tr.life / 0.16), flash: true });
    }
    drawCharacter(g, f.cfg, f.x, f.y, {
      facing: f.facing, joints: f.anim, t: f.t, aura: look.aura, auraBig: f.state === 'transform' ? 1.4 : 1,
      super: look.superMode, flash: f.flash > 0, lie: f.lie, face: look.face, bigFist: look.bigFist,
      alpha: f.inv > 0 && (f.state === 'getup' || f.state === 'down') ? 0.6 + Math.sin(f.t * 40) * 0.3 : undefined,
    });

    // Rastro do golpe (arco do chute / linha do soco)
    if (f.state === 'attack' && f.move && f.st >= f.move.wind && f.st < f.move.wind + f.move.act) {
      const p = limbWorld(f, f.move.hitP[f.move.limb]);
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = f.move.kind === 'kick' ? 'rgba(255,214,90,0.85)' : 'rgba(255,255,255,0.85)';
      g.lineWidth = 6;
      g.lineCap = 'round';
      g.beginPath();
      if (f.move.kind === 'kick') {
        const cy = f.y - 46 * f.s;
        const ang = Math.atan2(p.y - cy, (p.x - f.x) * f.facing);
        const a0 = f.facing > 0 ? ang + 1.1 : Math.PI - ang - 1.1;
        const a1 = f.facing > 0 ? ang : Math.PI - ang;
        g.arc(f.x, cy, Math.hypot(p.x - f.x, p.y - cy), Math.min(a0, a1), Math.max(a0, a1));
      } else {
        g.moveTo(p.x - f.facing * 54, p.y);
        g.lineTo(p.x, p.y);
      }
      g.stroke();
      g.restore();
      glow(g, p.x, p.y, 26, f.isPlayer ? '#7ef9ff' : f.cfg.aura);
    }
    if (f.state === 'beam' && f.st < BEAM_CHARGE) {
      const h = limbWorld(f, [-30, -54]);
      glow(g, h.x, h.y, 14 + (f.st / BEAM_CHARGE) * 36, f.cfg.shot);
    }
    if (f.state === 'sphere' && f.sphereR > 0) {
      const cx = f.x;
      const cy = f.y - 200 * f.s;
      glow(g, cx, cy, f.sphereR * 2.4, 'rgba(255,200,60,0.9)');
      blob(g, cx, cy, f.sphereR, '#ffe082');
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.beginPath(); g.arc(cx - f.sphereR * 0.3, cy - f.sphereR * 0.3, f.sphereR * 0.35, 0, Math.PI * 2); g.fill();
    }
    if ((f.state === 'down' || f.state === 'ko') && f.onGround) {
      const hx = f.x - f.facing * 100 * f.s;
      for (let i = 0; i < 3; i++) {
        const a = f.t * 4 + (i * Math.PI * 2) / 3;
        text(g, '★', hx + Math.cos(a) * 26, GROUND_Y - 34 + Math.sin(a) * 8, { size: 18, color: '#ffd54a', align: 'center', stroke: '#1b1030', lw: 3 });
      }
    }
  },

  drawBeam(g, f, opp) {
    if (!this.beamActive(f)) return;
    const r = this.beamRect(f, opp);
    const h = this.beamOrigin(f);
    const wob = Math.sin(this.t * 50) * 3;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const layers = [[64 + wob, f.cfg.shot, 0.35], [40 + wob, f.cfg.shot, 0.7], [18, '#ffffff', 1]];
    for (const [hh, col, a] of layers) {
      g.globalAlpha = a;
      g.fillStyle = col;
      roundRect(g, r.x, h.y - hh / 2, r.w, hh, hh / 2);
      g.fill();
    }
    g.restore();
    glow(g, h.x, h.y, 56, f.cfg.shot);
    if (r.end.clash) glow(g, r.end.x, h.y, 80 + wob * 4, '#ffffff');
  },

  drawShots(g) {
    for (const s of this.shots) {
      if (s.kind === 'sphere') {
        glow(g, s.x, s.y, s.r * 2.4, 'rgba(255,200,60,0.9)');
        blob(g, s.x, s.y, s.r, '#ffe082');
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.beginPath(); g.arc(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.35, 0, Math.PI * 2); g.fill();
        continue;
      }
      g.save();
      g.globalCompositeOperation = 'lighter';
      glow(g, s.x, s.y, s.r * 2.6, s.color);
      g.fillStyle = s.color;
      for (let i = 1; i <= 4; i++) {
        g.globalAlpha = 0.25 - i * 0.05;
        g.beginPath(); g.arc(s.x - Math.sign(s.vx) * i * 10, s.y, s.r * (1 - i * 0.15), 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(s.x, s.y, s.r * 0.6, 0, Math.PI * 2); g.fill();
      g.restore();
    }
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
    for (const [f, right] of [[this.p, false], [this.e, true]]) {
      const bw = 360;
      const x = right ? W - 24 - bw : 24;
      text(g, f.cfg.name.toUpperCase(), right ? W - 24 : 24, 32, { size: 26, color: f.superT > 0 ? '#ffe14d' : '#fff', align: right ? 'right' : 'left', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 6 });
      text(g, `${Math.ceil(f.hp)}/${f.maxHp}`, right ? W - 24 - bw : 24 + bw, 32, { size: 14, color: '#fff', align: right ? 'left' : 'right', stroke: '#1b1030', lw: 4 });
      this.drawBar(g, x, 42, bw, 20, f.hp, f.maxHp, hpColors(f), right, f.hpShow);
      const kw = 240;
      const kx = right ? W - 24 - kw : 24;
      this.drawBar(g, kx, 72, kw, 10, f.ki, 100, f.ki >= 100 ? ['#ffffff', '#ffd54a'] : ['#7ef9ff', '#1e88e5'], right);
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (const v of [COST.teleport, COST.beam]) g.fillRect(right ? kx + kw - (kw * v) / 100 : kx + (kw * v) / 100, 70, 2, 14);
      text(g, 'KI', right ? kx - 10 : kx + kw + 10, 82, { size: 13, color: '#7ef9ff', align: right ? 'right' : 'left', stroke: '#1b1030', lw: 3 });
      if (f.combo >= 2 && f.comboT > 0) {
        const sc = 1 + Math.max(0, f.comboT - 1) * 2;
        g.save();
        g.translate(right ? W - 100 : 100, 168);
        g.scale(sc, sc);
        text(g, `${f.combo} HITS!`, 0, 0, { size: 38, color: '#ffd54a', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 8 });
        g.restore();
      }
    }

    // Especiais disponíveis para o jogador
    const p = this.p;
    const items = [['U', 'Rajada', COST.blast], ['O', 'Teleporte', COST.teleport], ['I', 'Onda', COST.beam], ['P', 'Esfera', COST.sphere]];
    let ix = 24;
    for (const [k, label, cost] of items) {
      const ok = p.ki >= cost;
      const str = IS_TOUCH ? label : `${k} ${label}`;
      g.font = `900 12px ${FONT_BODY}`;
      const w = g.measureText(str).width + 16;
      panel(g, ix, 92, w, 22, { r: 8, fill: ok ? 'rgba(255,213,74,0.9)' : 'rgba(12,10,36,0.6)', stroke: ok ? '#1b1030' : 'rgba(255,255,255,0.2)' });
      text(g, str, ix + 8, 108, { size: 12, color: ok ? '#1b1030' : 'rgba(255,255,255,0.45)' });
      ix += w + 6;
    }
    if (p.superT > 0) {
      text(g, `MODO SUPER ${Math.ceil(p.superT)}s`, 24, 136, { size: 18, color: '#ffe14d', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 5 });
    } else if (p.ki >= 100 && Math.sin(this.t * 8) > -0.3) {
      text(g, IS_TOUCH ? 'SEGURE CARREGAR: MODO SUPER!' : 'SEGURE L: MODO SUPER!', 24, 136, { size: 16, color: '#ffe14d', stroke: '#1b1030', lw: 4 });
    }

    text(g, this.isBoss ? 'CHEFE DA FASE' : `FASE ${this.levelIndex + 1}`, W / 2, 34, { size: 22, color: this.isBoss ? '#ff5252' : '#ffd54a', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 6 });
    text(g, 'VS', W / 2, 62, { size: 20, color: '#fff', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 5 });

    if (!IS_TOUCH && (this.phase === 'fight' || this.phase === 'intro')) {
      const hint = '←→ andar • segure ← ou ↓ defender • ↑ pular • J soco • K chute • L carregar • U O I P especiais • TAB programador';
      g.font = `900 12px ${FONT_BODY}`;
      const w = g.measureText(hint).width + 24;
      panel(g, W / 2 - w / 2, H - 32, w, 24, { r: 12, fill: 'rgba(12,10,36,0.6)' });
      text(g, hint, W / 2, H - 15, { size: 12, color: '#e8e6ff', align: 'center' });
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
        g.globalAlpha = clamp(t * 4, 0, 1);
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
      const col = f.isPlayer ? '#00e5ff' : '#ff8a80';
      g.strokeStyle = col;
      g.strokeRect(b.x, b.y, b.w, b.h);
      if (f.state === 'attack' && f.move) {
        const p = limbWorld(f, f.move.hitP[f.move.limb]);
        const active = f.st >= f.move.wind && f.st < f.move.wind + f.move.act;
        g.strokeStyle = active ? '#ffd54a' : 'rgba(255,213,74,0.35)';
        g.beginPath(); g.arc(p.x, p.y, 28 * f.s, 0, Math.PI * 2); g.stroke();
      }
      const opp = f === this.p ? this.e : this.p;
      if (this.beamActive(f)) {
        const r = this.beamRect(f, opp);
        g.strokeStyle = '#ffd54a';
        g.strokeRect(r.x, r.y, r.w, r.h);
      }
      const lines = [
        `estado: ${f.state}${f.move && f.state === 'attack' ? ' (' + f.moveName + ')' : ''}`,
        `vida: ${Math.ceil(f.hp)}   ki: ${Math.floor(f.ki)}   combo: ${f.combo}`,
        `x: ${Math.round(f.x)}  y: ${Math.round(f.y)}  defendendo: ${f.guarding ? 'sim' : 'não'}`,
      ];
      if (!f.isPlayer) lines.push(`IA: ${f.ai.last}`);
      lines.forEach((l, i) => text(g, l, clamp(f.x, 130, W - 130), b.y - 70 + i * 15, { size: 12, color: col, align: 'center', stroke: '#000', lw: 3 }));
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

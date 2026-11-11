'use strict';
/* =========================================================
   WORLD — mapa para explorar antes de cada luta
   ========================================================= */

const TILE = 48;
const MW = 40; // largura do mapa em quadradinhos
const MH = 22; // altura do mapa em quadradinhos
const T = { GRASS: 0, TREE: 1, ROCK: 2, WATER: 3, PATH: 4, FLOWER: 5 };
const SOLID = new Set([T.TREE, T.ROCK]); // a água NÃO é sólida: dá para nadar!
const WATER_SPEED = 0.55; // na água o herói anda mais devagar
const ORBS_PER_LEVEL = 5;

/* ---------- Geração procedural do mapa ---------- */
function generateMap(level, levelIndex) {
  const rnd = mulberry32(level.seed);
  const map = [];
  for (let y = 0; y < MH; y++) {
    const row = [];
    for (let x = 0; x < MW; x++) {
      if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) { row.push(T.TREE); continue; }
      const r = rnd();
      row.push(r < 0.08 ? T.TREE : r < 0.12 ? T.ROCK : r < 0.2 ? T.FLOWER : T.GRASS);
    }
    map.push(row);
  }

  // Lagos
  for (let i = 0; i < 4; i++) {
    const cx = 5 + Math.floor(rnd() * (MW - 10));
    const cy = 3 + Math.floor(rnd() * (MH - 6));
    const rx = 1.2 + rnd() * 2.2;
    const ry = 1 + rnd() * 1.4;
    for (let y = 1; y < MH - 1; y++) {
      for (let x = 1; x < MW - 1; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) map[y][x] = T.WATER;
      }
    }
  }

  // Trilha sinuosa do oeste (início) até o leste (arena)
  let py = Math.floor(MH / 2);
  const startY = py;
  const pathCells = [];
  for (let x = 1; x <= MW - 3; x++) {
    map[py][x] = T.PATH;
    pathCells.push([x, py]);
    if (x > 3 && x < MW - 5 && rnd() < 0.35) {
      py = clamp(py + (rnd() < 0.5 ? -1 : 1), 3, MH - 4);
      map[py][x] = T.PATH;
      pathCells.push([x, py]);
    }
  }
  const portalT = { x: MW - 3, y: py };

  const clearAround = (cx, cy) => {
    for (let y = cy - 1; y <= cy + 1; y++) {
      for (let x = cx - 1; x <= cx + 1; x++) {
        if (x > 0 && y > 0 && x < MW - 1 && y < MH - 1 && map[y][x] !== T.PATH) map[y][x] = T.GRASS;
      }
    }
  };
  clearAround(2, startY);
  clearAround(4, startY - 1);
  clearAround(portalT.x, portalT.y);

  // Quais quadradinhos dá para alcançar a pé? (busca em largura)
  const seen = Array.from({ length: MH }, () => new Array(MW).fill(false));
  const queue = [[2, startY]];
  seen[startY][2] = true;
  const reachable = [];
  while (queue.length) {
    const [x, y] = queue.shift();
    reachable.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || seen[ny][nx] || SOLID.has(map[ny][nx])) continue;
      seen[ny][nx] = true;
      queue.push([nx, ny]);
    }
  }

  // Espalha esferas e placas em lugares alcançáveis e longe uns dos outros
  const spots = shuffle(
    reachable.filter(([x, y]) => x > 6 && x < MW - 4 && map[y][x] !== T.PATH),
    rnd,
  );
  const used = [[2, startY], [4, startY - 1], [portalT.x, portalT.y]];

  // Inimigos espalhados pela trilha, cada um mais forte que o anterior
  const foes = [];
  const minions = level.minions || [];
  minions.forEach((cfg, i) => {
    const cell = pathCells[Math.floor((pathCells.length * (i + 1)) / (minions.length + 1))];
    used.push(cell);
    foes.push({
      type: 'foe', cfg, name: cfg.name, order: i, defeated: false,
      homeX: cell[0] * TILE + TILE / 2, x: cell[0] * TILE + TILE / 2, y: cell[1] * TILE + TILE - 8,
      facing: -1, phase: i * 2,
    });
  });
  const takeSpot = (minDist) => {
    for (let i = 0; i < spots.length; i++) {
      const [x, y] = spots[i];
      if (used.every(([ux, uy]) => Math.abs(ux - x) + Math.abs(uy - y) >= minDist)) {
        spots.splice(i, 1);
        used.push([x, y]);
        return [x, y];
      }
    }
    return spots.length ? spots.shift() : null;
  };

  const entities = [];
  entities.push({
    type: 'npc', cfg: MASTER, name: MASTER.name,
    x: 4 * TILE + TILE / 2, y: (startY - 1) * TILE + TILE - 6,
    lines: level.intro,
  });
  for (let i = 0; i < 3; i++) {
    const s = takeSpot(6);
    if (!s) break;
    entities.push({
      type: 'sign', name: 'Placa de Código',
      x: s[0] * TILE + TILE / 2, y: s[1] * TILE + TILE - 6,
      lines: [FACTS[(levelIndex * 3 + i) % FACTS.length]],
    });
  }
  for (let i = 0; i < ORBS_PER_LEVEL; i++) {
    const s = takeSpot(5);
    if (!s) break;
    entities.push({ type: 'orb', x: s[0] * TILE + TILE / 2, y: s[1] * TILE + TILE - 8, taken: false, phase: i * 1.3 });
  }
  entities.push(...foes);

  return {
    map,
    entities,
    start: { x: 2 * TILE + TILE / 2, y: startY * TILE + TILE - 8 },
    portal: { x: portalT.x * TILE + TILE / 2, y: portalT.y * TILE + TILE - 6 },
  };
}

function buildMinimap(map, th) {
  const c = document.createElement('canvas');
  c.width = MW * 3;
  c.height = MH * 3;
  const g = c.getContext('2d');
  const colors = {
    [T.GRASS]: th.ground, [T.FLOWER]: th.ground, [T.PATH]: th.path,
    [T.WATER]: th.water, [T.TREE]: th.tree, [T.ROCK]: th.rock,
  };
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      g.fillStyle = colors[map[y][x]];
      g.fillRect(x * 3, y * 3, 3, 3);
    }
  }
  return c;
}

/* ---------- O mundo ---------- */
const World = {
  levelIndex: 0,
  level: null,
  map: null,
  entities: [],
  portal: null,
  player: null,
  cam: { x: 0, y: 0 },
  t: 0,
  dialog: null,
  toast: null,
  near: null,
  nearPortal: false,
  collected: 0,
  minimap: null,

  load(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    const gen = generateMap(this.level, index);
    this.map = gen.map;
    this.entities = gen.entities;
    this.portal = gen.portal;
    this.player = { x: gen.start.x, y: gen.start.y, facing: 1, moving: false, t: 0 };
    this.collected = 0;
    this.t = 0;
    this.toast = null;
    this.minimap = buildMinimap(this.map, this.level.theme);
    FX.clear();
    this.updateCamera(true);
    const n = this.foes().length;
    this.openDialog(MASTER.name, [
      ...this.level.intro,
      `Cuidado: ${n} inimigos estão vigiando a trilha, cada um mais forte que o outro. Derrote todos para abrir o portal! (Ah, e você pode nadar nos lagos!)`,
    ]);
  },

  foes() { return this.entities.filter((e) => e.type === 'foe'); },
  foesLeft() { return this.foes().filter((e) => !e.defeated).length; },

  // Chamado quando o herói vence uma luta contra um inimigo do caminho
  defeatFoe(foe) {
    foe.defeated = true;
    const left = this.foesLeft();
    this.showToast(left ? `${foe.name} derrotado! Faltam ${left} inimigo(s) na trilha.` : 'Caminho livre! O PORTAL DA ARENA está aberto!');
  },

  inWater(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor((y - 4) / TILE);
    return this.map[ty] && this.map[ty][tx] === T.WATER;
  },

  isSolid(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
    return SOLID.has(this.map[ty][tx]);
  },

  // Caixa de colisão dos pés do personagem
  feetBox(x, y) { return { x: x - 12, y: y - 14, w: 24, h: 14 }; },

  collides(x, y) {
    const b = this.feetBox(x, y);
    const tx0 = Math.floor(b.x / TILE);
    const tx1 = Math.floor((b.x + b.w - 0.01) / TILE);
    const ty0 = Math.floor(b.y / TILE);
    const ty1 = Math.floor((b.y + b.h - 0.01) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (this.isSolid(tx, ty)) return true;
      }
    }
    return false;
  },

  openDialog(speaker, lines, onClose = null) {
    this.dialog = { speaker, lines, i: 0, chars: 0, onClose };
  },

  showToast(msg) { this.toast = { msg, t: 2.6 }; },

  updateDialog(dt) {
    const d = this.dialog;
    const line = d.lines[d.i];
    const before = Math.floor(d.chars);
    d.chars = Math.min(line.length, d.chars + 55 * dt);
    if (Math.floor(d.chars) !== before && Math.floor(d.chars) % 3 === 0) Sound.play('talk');
    if (Input.tapped('confirm')) {
      if (d.chars < line.length) {
        d.chars = line.length;
      } else {
        d.i++;
        d.chars = 0;
        if (d.i >= d.lines.length) {
          this.dialog = null;
          if (d.onClose) d.onClose();
        }
      }
    }
  },

  updateCamera(snap = false) {
    const p = this.player;
    const tx = clamp(p.x - W / 2, 0, MW * TILE - W);
    const ty = clamp(p.y - H / 2 - 20, 0, MH * TILE - H);
    if (snap) { this.cam.x = tx; this.cam.y = ty; }
    else { this.cam.x = lerp(this.cam.x, tx, 0.12); this.cam.y = lerp(this.cam.y, ty, 0.12); }
  },

  update(dt) {
    this.t += dt;
    FX.update(dt);
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    if (this.dialog) { this.updateDialog(dt); return; }

    const p = this.player;
    let mx = (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0);
    let my = (Input.held('down') ? 1 : 0) - (Input.held('up') ? 1 : 0);
    if (mx && my) { mx *= Math.SQRT1_2; my *= Math.SQRT1_2; }
    const swimming = this.inWater(p.x, p.y);
    const speed = 230 * (swimming ? WATER_SPEED : 1);
    if (swimming && (mx || my) && Math.random() < dt * 12) {
      FX.burst(p.x + rand(-10, 10), p.y - 6, 'rgba(255,255,255,0.9)', 2, 70, 2.5, 200);
    }
    if (swimming && !p.swimming) { Sound.play('splash'); FX.burst(p.x, p.y - 6, '#ffffff', 12, 140, 3, 300); }
    p.swimming = swimming;
    const nx = p.x + mx * speed * dt;
    if (!this.collides(nx, p.y)) p.x = nx;
    const ny = p.y + my * speed * dt;
    if (!this.collides(p.x, ny)) p.y = ny;
    p.moving = mx !== 0 || my !== 0;
    if (mx) p.facing = Math.sign(mx);
    p.t += dt;

    // Pegar esferas
    for (const e of this.entities) {
      if (e.type !== 'orb' || e.taken) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < 34) {
        e.taken = true;
        this.collected++;
        Game.totalOrbs++;
        Sound.play('orb');
        FX.burst(e.x, e.y - 20, '#ffb52e', 18, 200, 4, 0);
        FX.pop(e.x, e.y - 50, '+10 VIDA', '#ffd54a', 26);
        this.showToast(`Esfera de energia! (${this.collected}/${ORBS_PER_LEVEL})  Vida na luta: ${this.fightHp()}`);
      }
    }

    // Inimigos da trilha: patrulham e desafiam o herói quando ele chega perto
    for (const f of this.foes()) {
      if (f.defeated) continue;
      const nxF = f.homeX + Math.sin(this.t * 1.2 + f.phase) * 22;
      f.moving = Math.abs(nxF - f.x) > 0.2;
      f.facing = Math.abs(p.x - f.x) < 200 ? Math.sign(p.x - f.x) || -1 : Math.sign(nxF - f.x) || f.facing;
      f.x = nxF;
      if (Math.hypot(f.x - p.x, f.y - p.y) < 60) {
        Sound.play('alert');
        this.openDialog(f.name, f.cfg.taunt, () => Game.startFight(f));
        return;
      }
    }

    // Quem está perto para conversar?
    this.near = null;
    let best = 62;
    for (const e of this.entities) {
      if (e.type !== 'npc' && e.type !== 'sign') continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < best) { best = d; this.near = e; }
    }
    this.nearPortal = Math.hypot(this.portal.x - p.x, this.portal.y - p.y) < 60;

    if (Input.tapped('confirm')) {
      if (this.near) {
        this.openDialog(this.near.name, this.near.lines);
      } else if (this.nearPortal) {
        const left = this.foesLeft();
        if (left > 0) {
          this.openDialog('Portal Trancado', [`🔒 O portal está trancado! Ainda faltam ${left} inimigo(s) na trilha. Siga o caminho e derrote todos.`]);
        } else {
          const en = this.level.enemy;
          this.openDialog(en.name, en.taunt, () => Game.startFight(null));
        }
      }
    }

    this.updateCamera();
  },

  // Vida na luta = base + esferas desta fase + força ganha em cada vitória
  fightHp() { return 100 + this.collected * 10 + Game.power; },

  /* ---------- Desenho ---------- */
  draw(g) {
    const th = this.level.theme;
    const cx = Math.round(this.cam.x);
    const cy = Math.round(this.cam.y);
    const tx0 = Math.max(0, Math.floor(cx / TILE));
    const tx1 = Math.min(MW - 1, Math.floor((cx + W) / TILE));
    const ty0 = Math.max(0, Math.floor(cy / TILE));
    const ty1 = Math.min(MH - 1, Math.floor((cy + H) / TILE) + 2);

    g.fillStyle = th.ground;
    g.fillRect(0, 0, W, H);
    g.save();
    g.translate(-cx, -cy);

    // Camada do chão
    const objects = [];
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const k = this.map[ty][tx];
        this.drawGround(g, k, tx, ty, th);
        if (k === T.TREE || k === T.ROCK) objects.push({ y: ty * TILE + TILE, kind: k, tx, ty });
      }
    }

    // Objetos e personagens em ordem de profundidade (quem está mais embaixo é desenhado por cima)
    for (const e of this.entities) {
      if ((e.type === 'orb' && e.taken) || (e.type === 'foe' && e.defeated)) continue;
      objects.push({ y: e.y, ent: e });
    }
    objects.push({ y: this.portal.y, portal: true });
    objects.push({ y: this.portal.y + 1, waitingEnemy: true });
    objects.push({ y: this.player.y, player: true });
    objects.sort((a, b) => a.y - b.y);

    for (const o of objects) {
      if (o.kind === T.TREE) drawTree(g, o.tx * TILE + TILE / 2, o.y, th, this.t, o.tx, o.ty);
      else if (o.kind === T.ROCK) drawRock(g, o.tx * TILE + TILE / 2, o.y, th);
      else if (o.portal) drawPortal(g, this.portal.x, this.portal.y, this.t, this.level.enemy.aura);
      else if (o.waitingEnemy) {
        drawCharacter(g, this.level.enemy, this.portal.x + 40, this.portal.y, { scale: 0.5, facing: -1, pose: 'idle', t: this.t });
        const left = this.foesLeft();
        if (left > 0) {
          panel(g, this.portal.x - 46, this.portal.y - 60, 92, 30, { r: 10, fill: 'rgba(12,10,36,0.85)', stroke: '#ff5252' });
          text(g, `🔒 faltam ${left}`, this.portal.x, this.portal.y - 39, { size: 14, color: '#fff', align: 'center' });
        }
      } else if (o.player) this.drawPlayer(g);
      else if (o.ent) this.drawEntity(g, o.ent);
    }

    FX.draw(g);
    this.drawPrompts(g);
    if (Game.debug) this.drawDebug(g, tx0, tx1, ty0, ty1);
    g.restore();

    this.drawHud(g);
    if (this.dialog) this.drawDialog(g);
  },

  drawGround(g, k, tx, ty, th) {
    const px = tx * TILE;
    const py = ty * TILE;
    g.fillStyle = (tx + ty) & 1 ? th.ground : th.ground2;
    g.fillRect(px, py, TILE, TILE);
    const h = hash2(tx, ty);
    if (k === T.PATH) {
      g.fillStyle = th.path;
      g.fillRect(px, py, TILE, TILE);
      g.fillStyle = 'rgba(0,0,0,0.08)';
      g.beginPath();
      g.arc(px + 10 + h * 26, py + 12 + hash2(ty, tx) * 24, 3, 0, Math.PI * 2);
      g.fill();
    } else if (k === T.WATER) {
      g.fillStyle = th.water;
      g.fillRect(px, py, TILE, TILE);
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 2;
      const off = Math.sin(this.t * 2 + tx * 0.8 + ty) * 4;
      g.beginPath();
      g.moveTo(px + 8 + off, py + 18); g.quadraticCurveTo(px + 16 + off, py + 13, px + 24 + off, py + 18);
      g.moveTo(px + 22 - off, py + 34); g.quadraticCurveTo(px + 30 - off, py + 29, px + 38 - off, py + 34);
      g.stroke();
    } else if (k === T.FLOWER) {
      for (let i = 0; i < 3; i++) {
        const fx = px + 8 + hash2(tx * 3 + i, ty) * 32;
        const fy = py + 8 + hash2(tx, ty * 3 + i) * 32;
        g.fillStyle = th.deco2[i % th.deco2.length];
        g.beginPath(); g.arc(fx, fy, 3.5, 0, Math.PI * 2); g.fill();
      }
    } else if (h > 0.7) {
      g.strokeStyle = 'rgba(0,0,0,0.12)';
      g.lineWidth = 2;
      const gx = px + 10 + h * 20;
      const gy = py + 30;
      g.beginPath();
      g.moveTo(gx, gy); g.lineTo(gx - 3, gy - 7);
      g.moveTo(gx + 4, gy); g.lineTo(gx + 6, gy - 8);
      g.stroke();
    }
  },

  drawPlayer(g) {
    const p = this.player;
    const opts = { scale: 0.5, facing: p.facing, pose: p.moving ? 'walk' : 'idle', t: p.t };
    if (p.swimming) {
      // Nadando: só a parte de cima do corpo aparece, com ondinhas em volta
      const bob = Math.sin(p.t * 6) * 2;
      const waterline = p.y - 22;
      g.save();
      g.beginPath();
      g.rect(p.x - 60, waterline - 120, 120, 120 + bob);
      g.clip();
      drawCharacter(g, HERO, p.x, p.y + 4 + bob, opts);
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 2.5;
      const r = 14 + Math.sin(p.t * 5) * 2;
      g.beginPath(); g.ellipse(p.x, waterline + bob, r, r * 0.3, 0, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 0.5;
      g.beginPath(); g.ellipse(p.x, waterline + bob, r + 8, (r + 8) * 0.3, 0, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 1;
      return;
    }
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.beginPath(); g.ellipse(p.x, p.y - 2, 15, 5, 0, 0, Math.PI * 2); g.fill();
    drawCharacter(g, HERO, p.x, p.y, opts);
  },

  drawEntity(g, e) {
    if (e.type === 'foe') {
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.beginPath(); g.ellipse(e.x, e.y - 2, 16, 5, 0, 0, Math.PI * 2); g.fill();
      drawCharacter(g, e.cfg, e.x, e.y, { scale: 0.5, facing: e.facing, pose: e.moving ? 'walk' : 'idle', t: this.t + e.phase });
      const bob = Math.sin(this.t * 5 + e.phase) * 3;
      text(g, '!', e.x, e.y - 82 + bob, { size: 30, color: '#ff5252', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 5 });
      text(g, `${e.name}  (${e.order + 1}/${this.foes().length})`, e.x, e.y + 16, { size: 12, color: '#fff', align: 'center', stroke: '#1b1030', lw: 4 });
    } else if (e.type === 'orb') drawOrb(g, e.x, e.y, this.t, e.phase);
    else if (e.type === 'sign') drawSign(g, e.x, e.y, this.t);
    else if (e.type === 'npc') {
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.beginPath(); g.ellipse(e.x, e.y - 2, 15, 5, 0, 0, Math.PI * 2); g.fill();
      drawCharacter(g, e.cfg, e.x, e.y, { scale: 0.5, facing: this.player.x < e.x ? -1 : 1, pose: 'idle', t: this.t });
    }
  },

  drawPrompts(g) {
    if (this.dialog) return;
    const bob = Math.sin(this.t * 6) * 3;
    const key = IS_TOUCH ? 'OK' : 'E';
    const bubble = (x, y, label) => {
      g.font = `900 15px ${FONT_BODY}`;
      const w = g.measureText(label).width + 48;
      panel(g, x - w / 2, y - 30 + bob, w, 30, { r: 15, fill: 'rgba(255,255,255,0.95)', stroke: '#1b1030' });
      roundRect(g, x - w / 2 + 6, y - 25 + bob, 26, 20, 5);
      g.fillStyle = '#1b1030';
      g.fill();
      text(g, key, x - w / 2 + 19, y - 10 + bob, { size: 12, color: '#fff', align: 'center' });
      text(g, label, x - w / 2 + 38, y - 10 + bob, { size: 15, color: '#1b1030' });
    };
    if (this.near) bubble(this.near.x, this.near.y - (this.near.type === 'sign' ? 58 : 76), this.near.type === 'sign' ? 'Ler placa' : 'Conversar');
    else if (this.nearPortal) bubble(this.portal.x, this.portal.y - 128, this.foesLeft() ? 'Portal trancado' : 'LUTAR!');
  },

  drawHud(g) {
    // Painel de fase
    panel(g, 12, 12, 300, 94);
    text(g, `FASE ${this.levelIndex + 1}/${LEVELS.length}`, 26, 38, { size: 15, color: '#ffd54a' });
    text(g, this.level.name, 26, 64, { size: 26, color: '#fff', font: FONT_TITLE, weight: '400' });
    text(g, `★ ${this.collected}/${ORBS_PER_LEVEL}`, 296, 38, { size: 16, color: '#ffb52e', align: 'right' });
    text(g, `❤ ${this.fightHp()}`, 296, 64, { size: 16, color: '#ff6b8b', align: 'right' });
    const foes = this.foes();
    const beaten = foes.length - this.foesLeft();
    text(g, beaten === foes.length ? '⚔ Trilha livre! Vá até a ARENA' : `⚔ Inimigos derrotados: ${beaten}/${foes.length}`, 26, 92, { size: 15, color: beaten === foes.length ? '#9cff57' : '#ff8a80' });

    // Minimapa
    const mmx = W - MW * 3 - 16;
    const mmy = 14;
    panel(g, mmx - 6, mmy - 6, MW * 3 + 12, MH * 3 + 12, { r: 8 });
    g.drawImage(this.minimap, mmx, mmy);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(mmx + (this.cam.x / TILE) * 3, mmy + (this.cam.y / TILE) * 3, (W / TILE) * 3, (H / TILE) * 3);
    for (const e of this.entities) {
      if (e.type === 'orb' && !e.taken) {
        g.fillStyle = '#ffb52e';
        g.fillRect(mmx + (e.x / TILE) * 3 - 1.5, mmy + (e.y / TILE) * 3 - 1.5, 3, 3);
      } else if (e.type === 'foe' && !e.defeated) {
        g.fillStyle = '#ff1744';
        g.fillRect(mmx + (e.x / TILE) * 3 - 2.5, mmy + (e.y / TILE) * 3 - 4, 5, 5);
      }
    }
    const blink = Math.sin(this.t * 8) > 0;
    g.fillStyle = blink ? '#ff1744' : '#ffffff';
    g.beginPath(); g.arc(mmx + (this.portal.x / TILE) * 3, mmy + (this.portal.y / TILE) * 3 - 2, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#00e5ff';
    g.beginPath(); g.arc(mmx + (this.player.x / TILE) * 3, mmy + (this.player.y / TILE) * 3 - 2, 3, 0, Math.PI * 2); g.fill();

    // Seta apontando para a arena quando ela está fora da tela
    const sx = this.portal.x - this.cam.x;
    const sy = this.portal.y - 40 - this.cam.y;
    if (sx < 0 || sx > W || sy < 0 || sy > H) {
      const ax = clamp(sx, 40, W - 40);
      const ay = clamp(sy, 100, H - 70);
      const ang = Math.atan2(sy - ay, sx - ax);
      g.save();
      g.translate(ax, ay);
      g.rotate(ang);
      g.translate(Math.sin(this.t * 6) * 4, 0);
      poly(g, [[16, 0], [-10, -12], [-4, 0], [-10, 12]], '#ffd54a');
      g.restore();
      text(g, 'ARENA', ax, ay + 30, { size: 13, color: '#ffd54a', align: 'center', stroke: '#1b1030', lw: 4 });
    }

    // Dica de controles
    if (!this.dialog) {
      const hint = IS_TOUCH
        ? 'Setas: andar  •  OK: conversar/lutar'
        : 'Setas/WASD: andar  •  E/Espaço: conversar  •  TAB: modo programador  •  M: som';
      g.font = `900 13px ${FONT_BODY}`;
      const w = g.measureText(hint).width + 28;
      panel(g, W / 2 - w / 2, H - 38, w, 28, { r: 14, fill: 'rgba(12,10,36,0.65)' });
      text(g, hint, W / 2, H - 19, { size: 13, color: '#e8e6ff', align: 'center' });
    }

    if (this.toast) {
      g.globalAlpha = clamp(this.toast.t * 2, 0, 1);
      g.font = `900 17px ${FONT_BODY}`;
      const w = g.measureText(this.toast.msg).width + 36;
      panel(g, W / 2 - w / 2, 92, w, 38, { fill: 'rgba(255,181,46,0.95)', stroke: '#1b1030' });
      text(g, this.toast.msg, W / 2, 117, { size: 17, color: '#1b1030', align: 'center' });
      g.globalAlpha = 1;
    }
  },

  drawDialog(g) {
    const d = this.dialog;
    const x = 40;
    const y = H - 150;
    const w = W - 80;
    panel(g, x, y, w, 128, { fill: 'rgba(12,10,36,0.94)', stroke: '#ffd54a', lw: 3 });
    g.font = `900 16px ${FONT_BODY}`;
    const nw = g.measureText(d.speaker).width + 30;
    panel(g, x + 20, y - 18, nw, 32, { r: 10, fill: '#ffd54a', stroke: '#1b1030' });
    text(g, d.speaker, x + 35, y + 4, { size: 16, color: '#1b1030' });

    const line = d.lines[d.i].slice(0, Math.floor(d.chars));
    g.font = `700 20px ${FONT_BODY}`;
    const lines = wrapLines(g, line, w - 50);
    lines.forEach((l, i) => text(g, l, x + 25, y + 46 + i * 28, { size: 20, weight: '700', color: '#fff' }));

    if (d.chars >= d.lines[d.i].length && Math.sin(this.t * 8) > 0) {
      text(g, IS_TOUCH ? 'OK ▶' : 'ENTER ▶', x + w - 20, y + 116, { size: 14, color: '#ffd54a', align: 'right' });
    }
    text(g, `${d.i + 1}/${d.lines.length}`, x + 25, y + 116, { size: 12, color: 'rgba(255,255,255,0.5)' });
  },

  drawDebug(g, tx0, tx1, ty0, ty1) {
    g.lineWidth = 1;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        g.strokeStyle = 'rgba(255,255,255,0.15)';
        g.strokeRect(tx * TILE, ty * TILE, TILE, TILE);
        if (SOLID.has(this.map[ty][tx])) {
          g.fillStyle = 'rgba(255,23,68,0.22)';
          g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        }
      }
    }
    const p = this.player;
    const b = this.feetBox(p.x, p.y);
    g.strokeStyle = '#00e5ff';
    g.lineWidth = 2;
    g.strokeRect(b.x, b.y, b.w, b.h);
    text(g, `x: ${Math.round(p.x)}  y: ${Math.round(p.y)}`, p.x, p.y + 18, { size: 12, color: '#00e5ff', align: 'center', stroke: '#000', lw: 3 });
    text(g, `quadrado: [${Math.floor(p.x / TILE)}, ${Math.floor(p.y / TILE)}]`, p.x, p.y + 32, { size: 12, color: '#00e5ff', align: 'center', stroke: '#000', lw: 3 });
  },
};

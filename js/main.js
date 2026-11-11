'use strict';
/* =========================================================
   MAIN — telas do jogo e o "game loop" (o coração do jogo)
   ========================================================= */

const Game = {
  state: 'title', // title | world | fight | won | lost | end
  stateT: 0,
  t: 0,
  levelIndex: 0,
  totalOrbs: 0,
  power: 0,       // vida extra ganha a cada vitória
  currentFoe: null, // inimigo da trilha que está lutando (null = chefe)
  debug: false,
  startTime: 0,
  endTime: 0,
  fade: null,
  fadeA: 0,
  fps: 60,

  setState(s) { this.state = s; this.stateT = 0; },

  // Escurece a tela, troca de cena e clareia de novo
  transition(cb) {
    if (this.fade) return;
    this.fade = { phase: 'out', cb };
  },

  newGame() {
    this.levelIndex = 0;
    this.totalOrbs = 0;
    this.power = 0;
    this.startTime = performance.now();
    this.transition(() => { World.load(0); this.setState('world'); });
  },

  startFight(foe = null) {
    this.currentFoe = foe;
    Sound.play('portal');
    this.transition(() => { Fight.start(this.levelIndex, World.fightHp(), foe ? foe.cfg : null); this.setState('fight'); });
  },

  onFightEnd(won) {
    Sound.play(won ? 'win' : 'lose');
    if (won) this.power += 5;
    this.setState(won ? 'won' : 'lost');
  },

  update(dt) {
    this.t += dt;
    this.stateT += dt;
    if (Input.tapped('debug')) this.debug = !this.debug;
    if (Input.tapped('mute')) Sound.muted = !Sound.muted;

    if (this.fade) {
      if (this.fade.phase === 'out') {
        this.fadeA = Math.min(1, this.fadeA + dt * 3.5);
        if (this.fadeA >= 1) {
          this.fade.cb();
          this.fade.phase = 'in';
          Input.reset();
        }
      } else {
        this.fadeA = Math.max(0, this.fadeA - dt * 3.5);
        if (this.fadeA <= 0) this.fade = null;
      }
      return;
    }

    const go = Input.tapped('confirm') || Input.tapped('punch');
    switch (this.state) {
      case 'title':
        if (go) { Sound.play('select'); this.newGame(); }
        break;
      case 'world':
        World.update(dt);
        break;
      case 'fight':
        Fight.update(dt);
        break;
      case 'won':
        Fight.update(dt);
        if (this.stateT > 0.25 && Math.random() < 0.5) FX.confetti(1);
        if (go && this.stateT > 0.8) {
          Sound.play('select');
          const next = this.levelIndex + 1;
          if (this.currentFoe) {
            // Venceu um inimigo da trilha: volta para o mapa no mesmo lugar
            const foe = this.currentFoe;
            this.currentFoe = null;
            this.transition(() => { FX.clear(); World.defeatFoe(foe); this.setState('world'); });
          } else if (next < LEVELS.length) {
            this.levelIndex = next;
            this.transition(() => { World.load(next); this.setState('world'); });
          } else {
            this.endTime = performance.now();
            this.transition(() => { FX.clear(); this.setState('end'); });
          }
        }
        break;
      case 'lost':
        Fight.update(dt);
        if (go && this.stateT > 0.8) {
          Sound.play('select');
          this.transition(() => { Fight.start(this.levelIndex, World.fightHp(), this.currentFoe ? this.currentFoe.cfg : null); this.setState('fight'); });
        }
        break;
      case 'end':
        FX.update(dt);
        if (Math.random() < 0.6) FX.confetti(1);
        if (go && this.stateT > 1.2) {
          Sound.play('select');
          this.transition(() => { FX.clear(); this.setState('title'); });
        }
        break;
      default: break;
    }
  },

  draw(g) {
    g.clearRect(0, 0, W, H);
    switch (this.state) {
      case 'title': this.drawTitle(g); break;
      case 'world': World.draw(g); break;
      case 'fight': Fight.draw(g); break;
      case 'won': Fight.draw(g); this.drawResult(g, true); break;
      case 'lost': Fight.draw(g); this.drawResult(g, false); break;
      case 'end': this.drawEnd(g); break;
      default: break;
    }

    if (this.debug) {
      panel(g, W / 2 - 170, H - 76, 340, 34, { fill: 'rgba(0,229,255,0.9)', stroke: '#1b1030' });
      text(g, `MODO PROGRAMADOR  •  ${Math.round(this.fps)} quadros/segundo`, W / 2, H - 53, { size: 15, color: '#1b1030', align: 'center' });
    }
    if (Sound.muted) text(g, '🔇', W - 18, H - 14, { size: 18, align: 'right' });

    if (this.fadeA > 0) {
      g.fillStyle = `rgba(5,3,15,${this.fadeA})`;
      g.fillRect(0, 0, W, H);
    }
  },

  drawTitle(g) {
    const th = LEVELS[3].theme;
    drawArenaBg(g, th, LEVELS[3].seed, this.t);
    g.fillStyle = 'rgba(5,3,15,0.35)';
    g.fillRect(0, 0, W, H);

    // Herói carregando energia
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath(); g.ellipse(230, 462, 60, 14, 0, 0, Math.PI * 2); g.fill();
    drawCharacter(g, HERO, 230, 462, { scale: 1.5, pose: 'charge', t: this.t, aura: Math.sin(this.t * 0.8) > 0 ? '#ffe14d' : HERO.aura, super: Math.sin(this.t * 0.8) > 0 });
    // Rival observando
    drawCharacter(g, LEVELS[3].enemy, 760, 462, { scale: 1.2, facing: -1, pose: 'idle', t: this.t });

    const bounce = Math.sin(this.t * 2.5) * 4;
    text(g, 'GUERREIROS', W / 2 + 70, 120 + bounce, { size: 96, color: '#ffd54a', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 14 });
    text(g, 'DO CÓDIGO', W / 2 + 70, 205 + bounce, { size: 80, color: '#ff7a3c', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 14 });
    text(g, 'Uma aventura de luta feita 100% com programação', W / 2 + 70, 248, { size: 20, color: '#ffffff', align: 'center', stroke: '#1b1030', lw: 5 });

    panel(g, W / 2 - 110, 280, 360, 124, { fill: 'rgba(12,10,36,0.78)' });
    const lines = IS_TOUCH
      ? ['Use os botões na tela', 'SOCO • KI • CARREGAR • ESPECIAL', 'Explore o mapa e entre no portal!']
      : ['Setas: andar • ↑ ou Espaço: pular • ←: defender', 'J: soco   K: chute   L: carregar KI', 'U rajada  O teleporte  I onda  P esfera', 'TAB: modo programador   M: som'];
    lines.forEach((l, i) => text(g, l, W / 2 + 70, 308 + i * 26, { size: 16, color: '#e8e6ff', align: 'center' }));

    if (Math.sin(this.t * 5) > -0.2) {
      text(g, IS_TOUCH ? 'TOQUE NA TELA PARA COMEÇAR' : 'APERTE ENTER PARA COMEÇAR', W / 2 + 70, 450, { size: 30, color: '#ffffff', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 8 });
    }
  },

  drawResult(g, won) {
    const a = clamp(this.stateT * 3, 0, 1);
    g.fillStyle = `rgba(5,3,15,${0.55 * a})`;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = a;
    const enemy = Fight.enemyCfg;
    panel(g, W / 2 - 300, 130, 600, 270, { fill: 'rgba(12,10,36,0.92)', stroke: won ? '#ffd54a' : '#ff8a80', lw: 4, r: 22 });
    if (won) {
      text(g, 'VITÓRIA!', W / 2, 210, { size: 90, color: '#ffd54a', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 12 });
      text(g, `Você venceu ${enemy.name}!`, W / 2, 262, { size: 24, color: '#fff', align: 'center' });
      const next = LEVELS[this.levelIndex + 1];
      const msg = this.currentFoe ? `${HERO.name} ficou mais forte (+5 de vida)! Continue pela trilha.` : next ? `Próxima fase: ${next.name}` : 'Você venceu o último desafio!';
      text(g, msg, W / 2, 302, { size: 20, color: '#7ef9ff', align: 'center' });
    } else {
      text(g, 'QUASE LÁ!', W / 2, 210, { size: 84, color: '#ff8a80', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 12 });
      text(g, `${enemy.name} venceu desta vez. Tente de novo!`, W / 2, 262, { size: 22, color: '#fff', align: 'center' });
      text(g, 'Dica: segure ← para defender e faça combos com J e K!', W / 2, 302, { size: 17, color: '#7ef9ff', align: 'center' });
    }
    if (this.stateT > 0.8 && Math.sin(this.t * 6) > -0.3) {
      const label = won ? 'CONTINUAR' : 'TENTAR DE NOVO';
      text(g, IS_TOUCH ? `TOQUE: ${label}` : `ENTER: ${label}`, W / 2, 368, { size: 28, color: '#fff', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 7 });
    }
    g.globalAlpha = 1;
  },

  drawEnd(g) {
    drawArenaBg(g, LEVELS[0].theme, LEVELS[0].seed, this.t);
    g.fillStyle = 'rgba(5,3,15,0.25)';
    g.fillRect(0, 0, W, H);
    drawCharacter(g, HERO, W / 2, 470, { scale: 1.4, pose: 'win', t: this.t, aura: '#ffe14d', super: true });
    drawCharacter(g, MASTER, W / 2 - 220, 470, { scale: 1.1, pose: 'idle', t: this.t });
    FX.draw(g);

    text(g, 'PARABÉNS, CAMPEÃO!', W / 2, 90, { size: 72, color: '#ffd54a', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 12 });
    text(g, 'Você agora é um Guerreiro do Código!', W / 2, 132, { size: 24, color: '#fff', align: 'center', stroke: '#1b1030', lw: 6 });

    const secs = Math.round((this.endTime - this.startTime) / 1000);
    panel(g, W / 2 + 120, 170, 320, 150, { fill: 'rgba(12,10,36,0.85)' });
    text(g, `Tempo: ${Math.floor(secs / 60)}min ${secs % 60}s`, W / 2 + 140, 205, { size: 18, color: '#fff' });
    text(g, `Esferas: ${this.totalOrbs}/${LEVELS.length * ORBS_PER_LEVEL} ★`, W / 2 + 140, 235, { size: 18, color: '#ffb52e' });
    text(g, 'Feito só com HTML, CSS', W / 2 + 140, 270, { size: 15, color: '#7ef9ff' });
    text(g, 'e JavaScript. Sem imagens!', W / 2 + 140, 292, { size: 15, color: '#7ef9ff' });

    text(g, '"Quer criar o seu? Aprenda a programar!" — Mestre Byte', W / 2, H - 50, { size: 18, color: '#fff', align: 'center', stroke: '#1b1030', lw: 5 });
    if (this.stateT > 1.2 && Math.sin(this.t * 5) > -0.2) {
      text(g, IS_TOUCH ? 'TOQUE PARA JOGAR DE NOVO' : 'ENTER PARA JOGAR DE NOVO', W / 2, H - 16, { size: 22, color: '#ffd54a', align: 'center', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 6 });
    }
  },
};

/* ---------- Game loop: ler → atualizar → desenhar, ~60x por segundo ---------- */
let lastTime = performance.now();
function frame(now) {
  const raw = (now - lastTime) / 1000;
  lastTime = now;
  const dt = Math.min(raw, 1 / 30);
  if (raw > 0) Game.fps = lerp(Game.fps, 1 / raw, 0.05);
  Game.update(dt);
  Game.draw(ctx);
  Input.endFrame();
  requestAnimationFrame(frame);
}

setupTouchControls();
if (document.fonts && document.fonts.load) {
  document.fonts.load('40px "Bangers"').catch(() => {});
}
requestAnimationFrame(frame);

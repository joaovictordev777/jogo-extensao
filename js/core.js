'use strict';
/* =========================================================
   CORE — tela, utilitários, teclado/toque, sons e efeitos
   ========================================================= */

/* ---------- Tela ---------- */
const W = 960;
const H = 540;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

/* ---------- Utilitários ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Gerador de números aleatórios com "semente": o mesmo número sempre gera o mesmo mapa.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function shuffle(arr, rnd = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/* ---------- Texto e painéis ---------- */
const FONT_TITLE = '"Bangers", Impact, "Arial Black", sans-serif';
const FONT_BODY = '"Nunito", "Segoe UI", Arial, sans-serif';

function text(g, str, x, y, o = {}) {
  const {
    size = 20, color = '#fff', align = 'left', base = 'alphabetic',
    font = FONT_BODY, weight = '900', stroke = null, lw = 5,
  } = o;
  g.font = `${weight} ${size}px ${font}`;
  g.textAlign = align;
  g.textBaseline = base;
  if (stroke) {
    g.lineJoin = 'round';
    g.lineWidth = lw;
    g.strokeStyle = stroke;
    g.strokeText(str, x, y);
  }
  g.fillStyle = color;
  g.fillText(str, x, y);
}

function wrapLines(g, str, maxW) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
}

function panel(g, x, y, w, h, o = {}) {
  const { fill = 'rgba(12,10,36,0.82)', stroke = 'rgba(255,255,255,0.28)', r = 14, lw = 2 } = o;
  roundRect(g, x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = lw;
  g.strokeStyle = stroke;
  g.stroke();
}

/* ---------- Entrada (teclado + toque) ---------- */
const KEYMAP = {
  ArrowLeft: ['left'], KeyA: ['left'],
  ArrowRight: ['right'], KeyD: ['right'],
  ArrowUp: ['up'], KeyW: ['up'],
  ArrowDown: ['down'], KeyS: ['down'],
  KeyJ: ['punch'], Space: ['punch', 'confirm'],
  KeyK: ['blast'], KeyL: ['charge'], KeyI: ['special'],
  Enter: ['confirm'], KeyE: ['confirm'],
  KeyP: ['debug'], KeyM: ['mute'],
};

const Input = {
  down: new Set(),
  hit: new Set(),
  press(a) { if (!this.down.has(a)) this.hit.add(a); this.down.add(a); },
  release(a) { this.down.delete(a); },
  held(a) { return this.down.has(a); },
  tapped(a) { return this.hit.has(a); },
  endFrame() { this.hit.clear(); },
  reset() { this.down.clear(); this.hit.clear(); },
};

window.addEventListener('keydown', (e) => {
  const acts = KEYMAP[e.code];
  if (!acts) return;
  e.preventDefault();
  Sound.unlock();
  if (e.repeat) return;
  acts.forEach((a) => Input.press(a));
});
window.addEventListener('keyup', (e) => {
  const acts = KEYMAP[e.code];
  if (!acts) return;
  e.preventDefault();
  acts.forEach((a) => Input.release(a));
});
window.addEventListener('blur', () => Input.reset());

canvas.addEventListener('pointerdown', () => { Sound.unlock(); Input.press('confirm'); });
canvas.addEventListener('pointerup', () => Input.release('confirm'));
canvas.addEventListener('pointercancel', () => Input.release('confirm'));

const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

function setupTouchControls() {
  if (!IS_TOUCH) return;
  const touch = document.getElementById('touch');
  touch.hidden = false;
  touch.querySelectorAll('[data-action]').forEach((btn) => {
    const acts = btn.dataset.action.split(' ');
    const on = (e) => {
      e.preventDefault();
      Sound.unlock();
      if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
      btn.classList.add('on');
      acts.forEach((a) => Input.press(a));
    };
    const off = (e) => {
      e.preventDefault();
      btn.classList.remove('on');
      acts.forEach((a) => Input.release(a));
    };
    btn.addEventListener('pointerdown', on);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, off));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}

/* ---------- Sons (gerados por matemática, sem arquivos!) ---------- */
const Sound = {
  ac: null,
  master: null,
  noiseBuf: null,
  muted: false,

  unlock() {
    try {
      if (!this.ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ac = new AC();
        this.master = this.ac.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ac.destination);
        const len = this.ac.sampleRate * 0.5;
        this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ac.state === 'suspended') this.ac.resume();
    } catch (err) { /* sem som, sem problema */ }
  },

  tone(freq, dur, o = {}) {
    if (this.muted || !this.ac) return;
    const { type = 'square', vol = 0.12, to = null, delay = 0 } = o;
    const t = this.ac.currentTime + delay;
    const osc = this.ac.createOscillator();
    const gain = this.ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  },

  noise(dur, vol = 0.2) {
    if (this.muted || !this.ac || !this.noiseBuf) return;
    const t = this.ac.currentTime;
    const src = this.ac.createBufferSource();
    const gain = this.ac.createGain();
    src.buffer = this.noiseBuf;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(gain);
    gain.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.03);
  },

  play(name) {
    switch (name) {
      case 'punch': this.noise(0.08, 0.2); this.tone(200, 0.08, { to: 90, vol: 0.1 }); break;
      case 'hit': this.noise(0.14, 0.3); this.tone(140, 0.14, { type: 'sawtooth', to: 55, vol: 0.12 }); break;
      case 'blast': this.tone(700, 0.25, { type: 'sawtooth', to: 160, vol: 0.08 }); break;
      case 'beam':
        this.tone(160, 1.1, { type: 'sawtooth', to: 520, vol: 0.08 });
        this.tone(80, 1.1, { type: 'square', to: 260, vol: 0.05 });
        break;
      case 'jump': this.tone(320, 0.14, { type: 'triangle', to: 640, vol: 0.12 }); break;
      case 'charge': this.tone(220 + Math.random() * 120, 0.12, { type: 'triangle', to: 480, vol: 0.04 }); break;
      case 'orb': [660, 880, 1320].forEach((f, i) => this.tone(f, 0.14, { type: 'triangle', vol: 0.14, delay: i * 0.07 })); break;
      case 'talk': this.tone(480 + Math.random() * 220, 0.035, { vol: 0.03 }); break;
      case 'select': this.tone(440, 0.08, { vol: 0.09 }); this.tone(880, 0.12, { vol: 0.09, delay: 0.08 }); break;
      case 'ko': this.tone(420, 0.7, { type: 'sawtooth', to: 50, vol: 0.14 }); this.noise(0.4, 0.25); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, { vol: 0.1, delay: i * 0.13 })); break;
      case 'lose': [392, 330, 262].forEach((f, i) => this.tone(f, 0.32, { type: 'triangle', vol: 0.14, delay: i * 0.2 })); break;
      case 'portal': this.tone(180, 0.6, { type: 'sine', to: 900, vol: 0.14 }); break;
      case 'splash': this.noise(0.25, 0.18); this.tone(500, 0.2, { type: 'sine', to: 150, vol: 0.1 }); break;
      case 'alert': this.tone(880, 0.1, { vol: 0.1 }); this.tone(1175, 0.18, { vol: 0.1, delay: 0.1 }); break;
      case 'clash': this.noise(0.25, 0.25); this.tone(900, 0.2, { type: 'square', to: 300, vol: 0.06 }); break;
      default: break;
    }
  },
};

/* ---------- Efeitos: partículas, textos "POW!" e tremor de tela ---------- */
const FX = {
  parts: [],
  pops: [],
  shake: 0,

  clear() { this.parts.length = 0; this.pops.length = 0; this.shake = 0; },

  burst(x, y, color, n = 14, speed = 260, size = 4, gravity = 300) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.4 + Math.random() * 0.4, max: 0.8, color, size: size * (0.6 + Math.random() * 0.8), gravity,
      });
    }
  },

  confetti(n = 6) {
    const colors = ['#ffd54a', '#ff5c8a', '#4fc3f7', '#7cff6b', '#b388ff', '#ff9a3c'];
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x: Math.random() * W, y: -10, vx: rand(-40, 40), vy: rand(60, 160),
        life: 4, max: 4, color: pick(colors), size: rand(4, 8), gravity: 40, square: true, rot: rand(0, 6),
      });
    }
  },

  pop(x, y, str, color = '#ffd54a', size = 34) {
    this.pops.push({ x, y, str, color, size, life: 0.9, max: 0.9, rot: rand(-0.25, 0.25) });
  },

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 30);
    for (const p of this.parts) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.rot !== undefined) p.rot += dt * 5;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const p of this.pops) { p.life -= dt; p.y -= 40 * dt; }
    this.pops = this.pops.filter((p) => p.life > 0);
  },

  draw(g) {
    for (const p of this.parts) {
      g.globalAlpha = clamp(p.life / p.max, 0, 1);
      g.fillStyle = p.color;
      if (p.square) {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        g.restore();
      } else {
        g.beginPath();
        g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    for (const p of this.pops) {
      const k = p.life / p.max;
      const scale = k > 0.8 ? 1 + (k - 0.8) * 3 : 1;
      g.save();
      g.globalAlpha = clamp(k * 1.6, 0, 1);
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.scale(scale, scale);
      text(g, p.str, 0, 0, { size: p.size, color: p.color, align: 'center', base: 'middle', font: FONT_TITLE, weight: '400', stroke: '#1b1030', lw: 7 });
      g.restore();
    }
    g.globalAlpha = 1;
  },
};

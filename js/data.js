'use strict';
/* =========================================================
   DATA — personagens, fases e curiosidades sobre programação.
   Quer mudar o jogo? Comece por aqui! Troque cores, nomes e vida.

   Campos dos inimigos:
   hp = vida • dmg = força • speed = velocidade • think = tempo para "pensar" (menor = mais esperto)
   skill = habilidade de 0 a 1 (defender, desviar, combos) • moves = especiais que ele sabe usar
   transform = vira "FORMA FINAL" quando a vida cai pela metade
   ========================================================= */

const HERO = {
  name: 'Leo',
  special: 'ONDA ESTELAR!',
  sphereName: 'ESFERA SOLAR!',
  skin: '#f6c8a0',
  gi: '#1fa39a',
  shirt: '#0d4f4b',
  pants: '#1fa39a',
  belt: '#ffc531',
  wrist: '#ffc531',
  boots: '#243b6b',
  hair: 'spiky',
  hairColor: '#1d1d2b',
  eyes: '#1b1030',
  aura: '#7ef9ff',
  shot: '#7ef9ff',
};

const MASTER = {
  name: 'Mestre Byte',
  skin: '#f2c79a',
  gi: '#d9534f',
  shirt: '#fff3e0',
  belt: '#3b2a20',
  boots: '#5b3a29',
  hair: 'bald',
  hairColor: '#ffffff',
  beard: '#ffffff',
  eyes: '#1b1030',
  scale: 0.95,
};

const FACTS = [
  'Este mapa foi criado por um ALGORITMO: o código sorteia onde ficam as árvores, as pedras e os lagos!',
  'Seu personagem anda porque o código soma a velocidade à posição dele 60 vezes por segundo.',
  'Aperte TAB para ligar o MODO PROGRAMADOR e ver as "caixas invisíveis" que o jogo usa para saber quem bateu em quem!',
  'O inimigo "pensa" usando SE/SENÃO: SE você está longe, ele atira energia. SENÃO, ele faz um combo!',
  'A barra de vida é só um número guardado numa VARIÁVEL. Cada golpe faz: vida = vida - dano.',
  'Os braços e pernas usam CINEMÁTICA INVERSA: o código calcula onde dobrar o cotovelo e o joelho para o soco e o chute chegarem no alvo!',
  'O pulo usa FÍSICA: a cada quadro, a gravidade puxa o personagem um pouquinho para baixo.',
  'Os sons também são matemática: o código cria ondas sonoras na hora, sem nenhum arquivo de áudio!',
  'Um LOOP é uma repetição. O jogo inteiro é um grande loop: ler o teclado, atualizar tudo e desenhar.',
  'COMBO é uma sequência! Aperte J e K várias vezes seguidas (soco, soco, chute...) e o último golpe arremessa o inimigo.',
  'Com programação dá para criar jogos, aplicativos, sites, robôs, filmes animados e até foguetes!',
  'Segure L com a energia cheia para o MODO SUPER: o código troca a cor do cabelo e multiplica a sua força por 1,3!',
];

const LEVELS = [
  {
    name: 'Vale Verde',
    seed: 1207,
    theme: {
      ground: '#7cc45c', ground2: '#74bb54', path: '#dcc08a', water: '#4aa8e8',
      treeStyle: 'round', tree: '#2e8b3e', tree2: '#3fa64f', rock: '#9aa0a6',
      deco2: ['#ff6b8b', '#fff176', '#ffffff'],
      sky: ['#6ec6ff', '#d6f3ff'], mount: ['#9fd0b4', '#5a9e6f'], floor: '#5c9e3f', floorLine: '#4b8733', deco: 'sun',
    },
    intro: [
      'Olá, jovem guerreiro! Eu sou o Mestre Byte.',
      'Sabia que este mundo inteiro foi criado com PROGRAMAÇÃO? Cada árvore, cada lago... e até você!',
      'Na luta: J = soco, K = chute. Aperte várias vezes seguidas para fazer COMBOS! Segure ← ou ↓ para DEFENDER.',
      'Segure L para carregar KI. Com KI você usa: U rajada, O teleporte, I Onda Estelar e P Esfera Solar!',
      'Pegue as esferas ★ (+10 de vida na luta), leia as placas </> e siga a trilha até o PORTAL DA ARENA. O Brutão está esperando!',
    ],
    minions: [
      {
        name: 'Goblin Folha', title: 'Guardião da Trilha', special: 'FOLHADA!',
        skin: '#a5d66b', gi: '#6d8b3a', shirt: '#4e6b25', pants: '#55702b', belt: '#2f3d14', boots: '#2f3d14',
        hair: 'horns', hairColor: '#e8dcc0', eyes: '#c62828', scale: 0.95, aura: '#b2ff59', shot: '#b2ff59',
        hp: 90, speed: 190, dmg: 6, think: 0.75, skill: 0.25, moves: [],
        taunt: ['Ei! Quem deixou você passar por aqui?', 'Vou te mandar de volta pro começo!'],
      },
      {
        name: 'Goblin Tronco', title: 'O Brigão do Lago', special: 'TRONCADA!',
        skin: '#8bc34a', gi: '#795548', shirt: '#5d4037', pants: '#6d4c41', belt: '#3e2723', boots: '#3e2723',
        hair: 'horns', hairColor: '#fff8e1', eyes: '#b71c1c', scale: 1.05, aura: '#76ff03', shot: '#76ff03',
        hp: 110, speed: 200, dmg: 7, think: 0.68, skill: 0.32, moves: ['beam'],
        taunt: ['O Goblin Folha perdeu? Comigo vai ser diferente!', 'Prepare-se!'],
      },
    ],
    enemy: {
      name: 'Brutão', title: 'O Ogro da Floresta', special: 'TERREMOTO VERDE!',
      skin: '#7cc35b', gi: '#8a5a2c', shirt: '#5e3a1a', pants: '#6d4420', belt: '#3a2615', boots: '#3a2615',
      hair: 'horns', hairColor: '#f3e3c3', eyes: '#c62828', scale: 1.18, aura: '#7cff6b', shot: '#9cff57',
      hp: 160, speed: 200, dmg: 9, think: 0.58, skill: 0.4, moves: ['beam'], transform: true,
      taunt: ['Hahaha! Ninguém passa pela minha floresta!', 'Mostre do que você é capaz, pequeno guerreiro!'],
    },
  },
  {
    name: 'Deserto Vermelho',
    seed: 4242,
    theme: {
      ground: '#e8bb73', ground2: '#e1b169', path: '#c98f4a', water: '#3fb4c9',
      treeStyle: 'cactus', tree: '#3f9b4f', tree2: '#4caf50', rock: '#b5653a',
      deco2: ['#a1887f', '#d7ccc8', '#ff8a65'],
      sky: ['#ff8a50', '#ffe0a3'], mount: ['#e09a6a', '#b4603a'], floor: '#c98f4a', floorLine: '#b27a3a', deco: 'sun',
    },
    intro: [
      'Incrível! Você venceu o Brutão!',
      'Cuidado: chegaram GUERREIROS DO ESPAÇO com armaduras e rastreadores de energia. Eles sentem o seu KI de longe!',
      'Eles também sabem se teletransportar. Fique atento e segure ← para defender!',
    ],
    minions: [
      {
        name: 'Soldado Krag', title: 'Tropa de Elite', special: 'DISPARO KRAG!',
        skin: '#f0b98a', gi: '#263238', shirt: '#263238', pants: '#263238', belt: '#ffca28', boots: '#eceff1', glove: '#eceff1',
        armor: '#eceff1', pads: '#8d6e63', scouter: '#00e676',
        hair: 'flame', hairColor: '#3e2723', eyes: '#1b1030', scale: 1, aura: '#ff9100', shot: '#ff9100',
        hp: 140, speed: 240, dmg: 9, think: 0.55, skill: 0.45, moves: ['teleport'],
        taunt: ['Meu rastreador marcou seu poder: só 5 mil! Hahaha!', 'Isso vai ser rápido.'],
      },
      {
        name: 'Soldado Vorn', title: 'O Gigante Careca', special: 'BOMBA VORN!',
        skin: '#e0a978', gi: '#1a237e', shirt: '#1a237e', pants: '#1a237e', belt: '#ffca28', boots: '#eceff1', glove: '#eceff1',
        armor: '#cfd8dc', pads: '#6d4c41', scouter: '#ff1744',
        hair: 'bald', hairColor: '#000000', eyes: '#1b1030', scale: 1.22, aura: '#ffea00', shot: '#ffea00',
        hp: 165, speed: 220, dmg: 10, think: 0.5, skill: 0.5, moves: ['beam'],
        taunt: ['O Krag era fraco. Eu sou o MAIS forte do esquadrão!', 'Vou te esmagar!'],
      },
    ],
    enemy: {
      name: 'Comandante Zarkon', title: 'O Orgulhoso Guerreiro do Espaço', special: 'CANHÃO GALÁTICO!',
      skin: '#f0c49a', gi: '#311b92', shirt: '#311b92', pants: '#311b92', belt: '#ffd54a', boots: '#fafafa', glove: '#fafafa',
      armor: '#fafafa', pads: '#ffd54a',
      hair: 'flame', hairColor: '#1a1a2e', eyes: '#1b1030', scale: 1.02, aura: '#d500f9', shot: '#e040fb',
      hp: 215, speed: 260, dmg: 11, think: 0.42, skill: 0.6, moves: ['beam', 'teleport'], transform: true,
      taunt: ['Então você derrotou meus soldados... interessante.', 'Mas eu sou o guerreiro mais orgulhoso do universo. Prepare-se!'],
    },
  },
  {
    name: 'Montanhas Geladas',
    seed: 777,
    theme: {
      ground: '#eaf4fb', ground2: '#e0edf7', path: '#bdd2e3', water: '#8fd0fa',
      treeStyle: 'pine', tree: '#2f6f5e', tree2: '#3a8a74', rock: '#90a4ae',
      deco2: ['#ffffff', '#b3e5fc', '#e1f5fe'],
      sky: ['#5b7fd6', '#cfe3ff'], mount: ['#d5e4f5', '#a5bedd'], floor: '#dfeefa', floorLine: '#b8d0e6', deco: 'snow',
    },
    intro: [
      'Montanhas Geladas! Brrr... até a neve que cai aqui é feita de matemática.',
      'Os ninjas daqui são MUITO rápidos e defendem quase tudo. Dica: use o TELEPORTE (O) para atacar pelas costas!',
    ],
    minions: [
      {
        name: 'Ninja Gelo', title: 'Sombra da Neve', special: 'NEVASCA!',
        skin: '#f1c27d', gi: '#00838f', shirt: '#004d56', pants: '#006064', belt: '#ffffff', boots: '#004d56',
        hair: 'ninja', hairColor: '#80deea', eyes: '#1b1030', scale: 0.95, aura: '#80deea', shot: '#80deea',
        hp: 180, speed: 290, dmg: 10, think: 0.44, skill: 0.55, moves: ['teleport'],
        taunt: ['Shhh... você nem me viu chegar.', 'Sinta o frio da montanha!'],
      },
      {
        name: 'Ninja Neve', title: 'Lâmina de Cristal', special: 'GEADA!',
        skin: '#e0ac69', gi: '#5e35b1', shirt: '#311b92', pants: '#4527a0', belt: '#80deea', boots: '#311b92',
        hair: 'ninja', hairColor: '#ffffff', eyes: '#1b1030', scale: 1, aura: '#b388ff', shot: '#b388ff',
        hp: 200, speed: 300, dmg: 11, think: 0.4, skill: 0.62, moves: ['beam', 'teleport'],
        taunt: ['Minha irmã é rápida. Eu sou MAIS rápida!', 'Já conheço todos os seus golpes!'],
      },
    ],
    enemy: {
      name: 'Ninja Tempestade', title: 'A Lâmina do Vento', special: 'FURACÃO!',
      skin: '#f1c27d', gi: '#3949ab', shirt: '#1a237e', pants: '#283593', belt: '#e53935', boots: '#1a237e',
      hair: 'ninja', hairColor: '#e53935', eyes: '#1b1030', scale: 1.04, aura: '#64b5f6', shot: '#64b5f6',
      hp: 260, speed: 320, dmg: 12, think: 0.34, skill: 0.72, moves: ['beam', 'teleport'], transform: true,
      taunt: ['Você é lento como uma tartaruga!', 'Tente me acompanhar... se conseguir!'],
    },
  },
  {
    name: 'Arena Cósmica',
    seed: 9001,
    theme: {
      ground: '#3d2f6b', ground2: '#382b63', path: '#6f5cb8', water: '#150d33',
      treeStyle: 'crystal', tree: '#b388ff', tree2: '#7c4dff', rock: '#5e4b9b',
      deco2: ['#ffffff', '#e040fb', '#80d8ff'],
      sky: ['#0b0726', '#3a1d6e'], mount: ['#2b1b55', '#1d1240'], floor: '#4a3a86', floorLine: '#6a56b8', deco: 'stars',
    },
    intro: [
      'Chegamos à Arena Cósmica, o último desafio!',
      'O Rei Sombrio sabe TODOS os especiais, inclusive a Esfera Gigante. Quando ela vier, segure ← para defender ou pule!',
      'Acredite em você. Programar é como treinar: cada tentativa te deixa mais forte!',
    ],
    minions: [
      {
        name: 'Soldado Estelar', title: 'Guarda do Imperador', special: 'METEORO!',
        skin: '#c5cae9', gi: '#e0e0e0', shirt: '#3949ab', pants: '#283593', belt: '#3949ab', boots: '#1a237e',
        armor: '#e8eaf6', pads: '#3949ab', scouter: '#00e5ff',
        hair: 'crown', hairColor: '#3949ab', eyes: '#00b0ff', scale: 1, aura: '#448aff', shot: '#448aff',
        hp: 230, speed: 270, dmg: 12, think: 0.38, skill: 0.65, moves: ['beam'],
        taunt: ['Pelo Rei Sombrio! Você não passará!'],
      },
      {
        name: 'Capitão Cometa', title: 'Veloz como a Luz', special: 'COMETA!',
        skin: '#ffccbc', gi: '#ff7043', shirt: '#bf360c', pants: '#d84315', belt: '#ffd54a', boots: '#bf360c',
        hair: 'spiky', hairColor: '#ff3d00', eyes: '#1b1030', scale: 1.02, aura: '#ff6e40', shot: '#ff6e40',
        hp: 250, speed: 310, dmg: 13, think: 0.35, skill: 0.7, moves: ['beam', 'teleport'],
        taunt: ['Ninguém é mais rápido que um cometa!', 'Vamos ver se você aguenta!'],
      },
      {
        name: 'General Nebulosa', title: 'Braço Direito do Rei', special: 'NEBULOSA!',
        skin: '#e1bee7', gi: '#ce93d8', shirt: '#6a1b9a', pants: '#7b1fa2', belt: '#ffd54a', boots: '#4a148c',
        armor: '#f3e5f5', pads: '#880e4f',
        hair: 'crown', hairColor: '#ab47bc', cape: '#880e4f', eyes: '#f50057', scale: 1.08, aura: '#f50057', shot: '#f50057',
        hp: 270, speed: 280, dmg: 13, think: 0.33, skill: 0.75, moves: ['beam', 'teleport'], transform: true,
        taunt: ['Você chegou longe, guerreiro...', 'Mas o caminho até o Rei termina AQUI!'],
      },
    ],
    enemy: {
      name: 'Rei Sombrio', title: 'O Imperador das Estrelas', special: 'ECLIPSE FINAL!', sphereName: 'SUPERNOVA!',
      skin: '#d9d2f2', gi: '#f5f5f5', shirt: '#7e57c2', pants: '#5e35b1', belt: '#7e57c2', boots: '#4a148c',
      hair: 'crown', hairColor: '#7e57c2', cape: '#4a148c', eyes: '#d500f9', scale: 1.12, aura: '#e040fb', shot: '#e040fb',
      hp: 340, speed: 290, dmg: 15, think: 0.3, skill: 0.82, moves: ['beam', 'teleport', 'sphere'], transform: true,
      taunt: ['Então você é o guerreiro que derrotou meus capangas...', 'Prepare-se para conhecer o poder das estrelas!'],
    },
  },
];

'use strict';
/* =========================================================
   DATA — personagens, fases e curiosidades sobre programação.
   Quer mudar o jogo? Comece por aqui! Troque cores, nomes e vida.
   ========================================================= */

const HERO = {
  name: 'Leo',
  special: 'ONDA ESTELAR!',
  skin: '#f6c8a0',
  gi: '#1fa39a',
  shirt: '#0d4f4b',
  pants: '#1fa39a',
  belt: '#ffc531',
  boots: '#243b6b',
  hair: 'spiky',
  hairColor: '#1d1d2b',
  eyes: '#1b1030',
  aura: '#ffd54a',
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
  eyes: '#1b1030',
  scale: 0.95,
};

const FACTS = [
  'Este mapa foi criado por um ALGORITMO: o código sorteia onde ficam as árvores, as pedras e os lagos!',
  'Seu personagem anda porque o código soma a velocidade à posição dele 60 vezes por segundo.',
  'Pressione P para ligar o MODO PROGRAMADOR e ver as "caixas invisíveis" que o jogo usa para saber quem bateu em quem!',
  'O inimigo "pensa" usando SE/SENÃO: SE você está longe, ele atira energia. SENÃO, ele dá um soco!',
  'A barra de vida é só um número guardado numa VARIÁVEL. Cada golpe faz: vida = vida - dano.',
  'Nenhuma imagem foi usada neste jogo: todos os desenhos são círculos, retângulos e linhas feitos por código.',
  'O pulo usa FÍSICA: a cada quadro, a gravidade puxa o personagem um pouquinho para baixo.',
  'Os sons também são matemática: o código cria ondas sonoras na hora, sem nenhum arquivo de áudio!',
  'Um LOOP é uma repetição. O jogo inteiro é um grande loop: ler o teclado, atualizar tudo e desenhar.',
  'Bugs são erros no código. Todo programador encontra bugs... e o legal é descobrir como consertar!',
  'Com programação dá para criar jogos, aplicativos, sites, robôs, filmes animados e até foguetes!',
  'Este jogo funciona no computador e no celular, porque o mesmo código roda em qualquer navegador.',
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
      'Explore o Vale Verde! Pegue as esferas de energia ★ (cada uma dá +10 de vida na luta) e leia as placas de código </>.',
      'Quando estiver pronto, siga a trilha até o PORTAL DA ARENA, lá no leste. O Brutão está esperando!',
    ],
    enemy: {
      name: 'Brutão', title: 'O Ogro da Floresta', special: 'TERREMOTO!',
      skin: '#7cc35b', gi: '#8a5a2c', shirt: '#5e3a1a', pants: '#6d4420', belt: '#3a2615', boots: '#3a2615',
      hair: 'horns', hairColor: '#f3e3c3', eyes: '#c62828', scale: 1.15, aura: '#7cff6b', shot: '#9cff57',
      hp: 110, speed: 180, dmg: 8, blast: 0.2, beam: false, think: 0.8, combo: 0.25,
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
      'Agora estamos no Deserto Vermelho. Repare: o mesmo código trocou as cores e transformou árvores em cactos!',
      'O Robô Z-9 dispara muitas rajadas de energia. Use o PULO DUPLO (aperte para cima duas vezes) para desviar!',
    ],
    enemy: {
      name: 'Robô Z-9', title: 'O Guardião de Metal', special: 'LASER TOTAL!',
      skin: '#b0bec5', gi: '#546e7a', shirt: '#37474f', pants: '#455a64', belt: '#ff7043', boots: '#263238',
      glove: '#78909c', hair: 'helmet', hairColor: '#ff1744', eyes: '#ff1744', scale: 1.05, aura: '#ff5252', shot: '#ff5252',
      hp: 150, speed: 210, dmg: 9, blast: 0.45, beam: true, think: 0.65, combo: 0.35,
      taunt: ['BIP BOP. ANALISANDO OPONENTE...', 'PROBABILIDADE DE VITÓRIA: 99%. INICIANDO COMBATE.'],
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
      'A Ninja Tempestade é MUITO rápida. Dica: segure L para carregar energia e aperte K para soltar rajadas de longe!',
    ],
    enemy: {
      name: 'Ninja Tempestade', title: 'A Lâmina do Vento', special: 'FURACÃO!',
      skin: '#f1c27d', gi: '#3949ab', shirt: '#1a237e', pants: '#283593', belt: '#e53935', boots: '#1a237e',
      hair: 'ninja', hairColor: '#e53935', eyes: '#1b1030', scale: 1, aura: '#64b5f6', shot: '#64b5f6',
      hp: 185, speed: 290, dmg: 10, blast: 0.4, beam: true, think: 0.45, combo: 0.5,
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
      'O Rei Sombrio também sabe usar um ATAQUE ESPECIAL. Se os dois raios se encontrarem, eles se anulam!',
      'Acredite em você. Programar é como treinar: cada tentativa te deixa mais forte!',
    ],
    enemy: {
      name: 'Rei Sombrio', title: 'O Imperador das Estrelas', special: 'ECLIPSE FINAL!',
      skin: '#d9d2f2', gi: '#f5f5f5', shirt: '#7e57c2', pants: '#5e35b1', belt: '#7e57c2', boots: '#4a148c',
      hair: 'crown', hairColor: '#7e57c2', cape: '#4a148c', eyes: '#d500f9', scale: 1.1, aura: '#e040fb', shot: '#e040fb',
      hp: 240, speed: 245, dmg: 12, blast: 0.45, beam: true, think: 0.4, combo: 0.6,
      taunt: ['Então você é o guerreiro que derrotou meus capangas...', 'Prepare-se para conhecer o poder das estrelas!'],
    },
  },
];

/* Inimigos que aparecem no meio da trilha (ficam mais fortes a cada um!) */
const MINIONS = [
  [
    {
      name: 'Goblin Folha', title: 'Guardião da Trilha', special: 'FOLHADA!',
      skin: '#a5d66b', gi: '#6d8b3a', shirt: '#4e6b25', pants: '#55702b', belt: '#2f3d14', boots: '#2f3d14',
      hair: 'horns', hairColor: '#e8dcc0', eyes: '#c62828', scale: 0.95, aura: '#b2ff59', shot: '#b2ff59',
      hp: 60, speed: 150, dmg: 5, blast: 0.1, beam: false, think: 1.0, combo: 0.1,
      taunt: ['Ei! Quem deixou você passar por aqui?', 'Vou te mandar de volta pro começo!'],
    },
    {
      name: 'Goblin Tronco', title: 'O Brigão do Lago', special: 'TRONCADA!',
      skin: '#8bc34a', gi: '#795548', shirt: '#5d4037', pants: '#6d4c41', belt: '#3e2723', boots: '#3e2723',
      hair: 'horns', hairColor: '#fff8e1', eyes: '#b71c1c', scale: 1.05, aura: '#76ff03', shot: '#76ff03',
      hp: 80, speed: 170, dmg: 6, blast: 0.15, beam: false, think: 0.9, combo: 0.15,
      taunt: ['O Goblin Folha perdeu? Comigo vai ser diferente!', 'Prepare-se!'],
    },
  ],
  [
    {
      name: 'Drone R-1', title: 'Patrulha do Deserto', special: 'LASER!',
      skin: '#cfd8dc', gi: '#78909c', shirt: '#546e7a', pants: '#607d8b', belt: '#ffca28', boots: '#37474f',
      glove: '#90a4ae', hair: 'helmet', hairColor: '#ffca28', eyes: '#ffca28', scale: 0.95, aura: '#ffca28', shot: '#ffca28',
      hp: 95, speed: 195, dmg: 7, blast: 0.35, beam: false, think: 0.78, combo: 0.2,
      taunt: ['INTRUSO DETECTADO.', 'PROTOCOLO DE COMBATE: ATIVADO.'],
    },
    {
      name: 'Drone R-2', title: 'Patrulha Turbo', special: 'LASER DUPLO!',
      skin: '#b0bec5', gi: '#455a64', shirt: '#263238', pants: '#37474f', belt: '#00e5ff', boots: '#263238',
      glove: '#78909c', hair: 'helmet', hairColor: '#00e5ff', eyes: '#00e5ff', scale: 1, aura: '#00e5ff', shot: '#00e5ff',
      hp: 115, speed: 210, dmg: 8, blast: 0.45, beam: false, think: 0.7, combo: 0.3,
      taunt: ['ATUALIZAÇÃO INSTALADA: VERSÃO 2.0.', 'AGORA SOU MAIS FORTE.'],
    },
  ],
  [
    {
      name: 'Ninja Gelo', title: 'Sombra da Neve', special: 'NEVASCA!',
      skin: '#f1c27d', gi: '#00838f', shirt: '#004d56', pants: '#006064', belt: '#ffffff', boots: '#004d56',
      hair: 'ninja', hairColor: '#80deea', eyes: '#1b1030', scale: 0.95, aura: '#80deea', shot: '#80deea',
      hp: 120, speed: 250, dmg: 8, blast: 0.3, beam: false, think: 0.6, combo: 0.35,
      taunt: ['Shhh... você nem me viu chegar.', 'Sinta o frio da montanha!'],
    },
    {
      name: 'Ninja Neve', title: 'Lâmina de Cristal', special: 'GEADA!',
      skin: '#e0ac69', gi: '#5e35b1', shirt: '#311b92', pants: '#4527a0', belt: '#80deea', boots: '#311b92',
      hair: 'ninja', hairColor: '#ffffff', eyes: '#1b1030', scale: 1, aura: '#b388ff', shot: '#b388ff',
      hp: 140, speed: 270, dmg: 9, blast: 0.35, beam: true, think: 0.52, combo: 0.4,
      taunt: ['Minha irmã é rápida. Eu sou MAIS rápida!', 'Já conheço todos os seus golpes!'],
    },
  ],
  [
    {
      name: 'Soldado Estelar', title: 'Guarda do Imperador', special: 'METEORO!',
      skin: '#c5cae9', gi: '#e0e0e0', shirt: '#3949ab', pants: '#283593', belt: '#3949ab', boots: '#1a237e',
      hair: 'crown', hairColor: '#3949ab', eyes: '#00b0ff', scale: 1, aura: '#448aff', shot: '#448aff',
      hp: 150, speed: 230, dmg: 9, blast: 0.4, beam: true, think: 0.55, combo: 0.4,
      taunt: ['Pelo Rei Sombrio! Você não passará!'],
    },
    {
      name: 'Capitão Cometa', title: 'Veloz como a Luz', special: 'COMETA!',
      skin: '#ffccbc', gi: '#ff7043', shirt: '#bf360c', pants: '#d84315', belt: '#ffd54a', boots: '#bf360c',
      hair: 'spiky', hairColor: '#ff3d00', eyes: '#1b1030', scale: 1.02, aura: '#ff6e40', shot: '#ff6e40',
      hp: 170, speed: 270, dmg: 10, blast: 0.4, beam: true, think: 0.48, combo: 0.5,
      taunt: ['Ninguém é mais rápido que um cometa!', 'Vamos ver se você aguenta!'],
    },
    {
      name: 'General Nebulosa', title: 'Braço Direito do Rei', special: 'NEBULOSA!',
      skin: '#e1bee7', gi: '#ce93d8', shirt: '#6a1b9a', pants: '#7b1fa2', belt: '#ffd54a', boots: '#4a148c',
      hair: 'crown', hairColor: '#ab47bc', cape: '#880e4f', eyes: '#f50057', scale: 1.08, aura: '#f50057', shot: '#f50057',
      hp: 190, speed: 240, dmg: 11, blast: 0.45, beam: true, think: 0.44, combo: 0.55,
      taunt: ['Você chegou longe, guerreiro...', 'Mas o caminho até o Rei termina AQUI!'],
    },
  ],
];
LEVELS.forEach((level, i) => { level.minions = MINIONS[i]; });

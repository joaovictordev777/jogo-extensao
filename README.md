# ⚡ Guerreiros do Código

Jogo de luta 2D estilo anime feito **100% com programação** (HTML + CSS + JavaScript puro, sem imagens, sem bibliotecas), criado para mostrar às crianças o que o código pode fazer.

## Como jogar

1. **Explore o mapa** de cada fase: pegue as esferas ★ (+10 de vida na luta), leia as placas de código `</>`, converse com o Mestre Byte e **nade nos lagos** (na água o herói anda mais devagar).
2. Siga a trilha: no caminho há **inimigos** (2 por fase, 3 na última), cada um mais forte que o anterior. Eles desafiam o herói quando ele chega perto. Cada vitória deixa o herói mais forte (+5 de vida).
3. Com a trilha livre, o **portal da ARENA** destrava (a seta amarela e o minimapa mostram onde fica; inimigos aparecem em vermelho no minimapa).
4. **Duele** com o chefe da fase. Venceu? Vai para a próxima fase. São 4 fases e 13 lutas, e a dificuldade sobe a cada uma: mais vida, mais dano, mais velocidade, combos e ataques especiais.

| Tecla | Ação |
|---|---|
| Setas / WASD | Andar (no mapa) · andar e pular (na luta, pulo duplo) |
| J ou Espaço | Soco |
| K | Rajada de energia (gasta KI) |
| L (segurar) | Carregar energia (KI) |
| I | Especial: Onda Estelar (KI cheio) |
| E / Enter | Conversar · ler placa · entrar na arena |
| **P** | **Modo Programador**: mostra caixas de colisão, posições, física e o que a IA está "pensando" |
| M | Liga/desliga o som |

No celular aparecem botões na tela (jogue com o celular deitado).

## Estrutura

```
index.html      página e botões de toque
style.css       layout responsivo
js/core.js      tela, teclado/toque, sons gerados por código, partículas
js/art.js       desenho dos personagens, cenários e objetos
js/data.js      personagens, fases e curiosidades (ótimo para editar ao vivo!)
js/world.js     mapa gerado por algoritmo, colisão, diálogos, minimapa
js/fight.js     física, golpes, rajadas, raio especial e IA dos inimigos
js/main.js      telas e o game loop
```

Dica para a apresentação: abra `js/data.js` e mude a cor do cabelo do herói, a vida de um inimigo ou o texto de uma placa. Salve e recarregue: as crianças veem a mudança na hora.

## Rodar localmente

Basta abrir o `index.html` no navegador (duplo clique). Ou, no VS Code, use a extensão **Live Server**.

## Deploy no Vercel

**Opção A: pelo site**
1. Suba esta pasta para um repositório no GitHub.
2. Em vercel.com → *Add New → Project* → importe o repositório.
3. Framework Preset: **Other**. Não precisa de build command nem output directory. Clique em **Deploy**.

**Opção B: pela linha de comando**
```bash
npm i -g vercel
vercel        # dentro desta pasta; aceite os padrões
vercel --prod
```

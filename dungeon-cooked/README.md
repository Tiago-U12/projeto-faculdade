# Dungeon Cooked — A Cozinha dos Impossíveis (versão web 2D)

Um chef fantasma reabre a taberna **Mesa do Luar** numa dungeon frequentada por orcs, elfos, dragões, goblins, magos, cavaleiros, anões e espíritos. Você colhe ingredientes estranhos, corta, cozinha, entrega, acalma brigas e descobre por que a taberna continua existindo entre o mundo dos vivos e o dos espíritos.

Jogo single-player em Canvas 2D, em português do Brasil, **offline**, sem conta, sem anúncios e sem coleta de dados.

## Jogar

- **Arquivo único:** gere com `npm run build` e abra `dist/Dungeon_Cooked_FINAL_OFFLINE.html` com dois cliques. Funciona direto do disco (`file://`), sem servidor e sem internet.
- **Desenvolvimento:** `npm run dev` e abra `http://localhost:5174` (o `index.html` da raiz usa módulos ES, que precisam de `http://`).

Requer Node.js 20+ apenas para gerar a build e rodar os testes. O jogador final não precisa de Node, npm, CDN nem servidor.

## Modos

| Modo | Como funciona |
| --- | --- |
| **História** | Sete noites com objetivos, diálogos, loja e três finais. Clientes perdem a paciência, pratos podem queimar, conflitos aumentam a tensão. |
| **Tranquilo** | A mesma campanha (com save próprio) sem cronômetro: ninguém vai embora por demora, nada queima esperando, a tensão não sobe sozinha. Todos os finais continuam possíveis. |
| **Desafio** | Turno único de 3 minutos com todas as estações; o cardápio cresce com o tempo, combos rendem pontos e o recorde fica no navegador. |

## Como cozinhar

1. Leia o pedido (coluna/linha de pedidos): prato, ingredientes e estação. Pedidos abertos aceitam qualquer prato com a característica pedida (ex.: "algo quentinho").
2. Pegue o ingrediente na despensa: **Horta Subterrânea**, **Despensa Rústica** ou **Armário Arcano** (aparece um seletor; teclas 1–4 também escolhem).
3. Ingrediente cru vai à **tábua**: dois cortes. Água do Luar, Brasa Encantada e Gelatina de Slime vão direto.
4. Coloque na estação certa: **caldeirão**, **forno**, **grelha** ou **bancada fria**. A receita começa sozinha quando fica completa; a bancada fria monta na hora e nunca queima.
5. Espere ficar **no ponto** (não dá para tirar cru) e pegue antes de queimar.
6. Entregue no **balcão**, em frente ao cliente. Prato errado é recusado e continua com você; prato queimado pede confirmação.
7. Conflitos entre rivais: toque o **Sino da Harmonia**, **converse** com um deles de mãos vazias ou sirva um **prato da paz**.

Conversar com um cliente sentado (mãos vazias) revela gostos e aversões; elas aparecem no pedido e no Livro.

## Controles

| Ação | Teclado e mouse | Toque |
| --- | --- | --- |
| Andar | WASD ou setas | Joystick, ou toque no chão/estação |
| Interagir (verbo muda por estação) | E, Espaço ou Enter | Botão grande de ação |
| Descartar / limpar estação | Q (pratos e estações pedem confirmação) | Botão Descartar |
| Escolher ingrediente | 1 a 4 ou clique | Toque no ingrediente |
| Pausar | P ou Esc | Botão de pausa |
| Livro de receitas, clientes e diário | R | Botão do livro |
| Silenciar | M | Botão de som |
| Avançar diálogo | Enter, Espaço ou clique | Toque na caixa |

Clicar/tocar numa estação faz o chef andar até ela (A* com desvio das bancadas) e interagir ao chegar, revalidando o alvo. A interface se adapta a desktop (pedidos numa coluna), tablet, celular em pé (câmera segue o chef) e celular deitado (pedidos e joystick à esquerda, ações à direita).

## Salvamento

- Salva automaticamente **ao fim de cada noite** (junto com a recompensa, de forma atômica) e **após cada compra**. Se sair no meio de uma noite, ela recomeça do início — isso é avisado na pausa.
- Um slot por modo narrativo (História e Tranquilo). Recordes do Desafio, conquistas e finais vistos ficam num registro separado. Ajustes também são salvos.
- **Opções → Dados salvos:** exportar (texto JSON para copiar, ou arquivo `.json` onde o navegador permite baixar), importar arquivo ou texto colado (validação estrita e confirmação; uma cópia de segurança do save atual é guardada) e apagar tudo.
- Se o navegador bloquear o armazenamento, o jogo continua jogável e avisa que não pode salvar.

Chaves usadas no `localStorage`: `dungeonCooked.save.v1`, `dungeonCooked.meta.v1`, `dungeonCooked.settings.v1` e `dungeonCooked.save.v1.backup`.

## Conteúdo

12 ingredientes, 12 receitas, 8 clientes com gostos e falas próprios, 3 rivalidades pessoais, 7 noites com objetivos e bônus, 4 pistas sobre a voz do caldeirão, 6 melhorias que mudam o cálculo do jogo (velocidade, capacidade, tempo de caldeirão, recarga do sino, janela do forno/grelha, paciência), 3 reformas decorativas e 3 finais (Mesa Compartilhada, Lenda da Panela Assombrada, Segredo do Luar). As condições dos finais aparecem no Diário em linguagem natural; a escolha é feita na última noite entre os finais que você tornou possíveis.

## Acessibilidade e opções

Volume de música e efeitos, mudo, alto contraste, texto maior, reduzir movimento (respeita `prefers-reduced-motion`), nomes das estações no mapa, falas em balões, efeito de escrita, controles de toque (automático/sempre/nunca), dicas de próximo passo e ritmo do serviço. Estados de cozinha e tensão usam **texto + ícone**, não só cor. Botões são DOM com rótulos, foco visível e janelas com foco preso.

Limitação real: a cozinha em si é Canvas; leitores de tela recebem o contexto (estação próxima, itens na mão, avisos) pelo DOM, mas não há descrição completa da cena. Não foi feita auditoria WCAG.

## Estrutura

```
dungeon-cooked/
  index.html               entrada de desenvolvimento
  src/main.js              fluxo do app (menu, noites, loja, finais, Desafio)
  src/core/                utilitários, RNG com semente, eventos
  src/data/                ingredientes, receitas, clientes, noites, diálogos, melhorias, conquistas
  src/sim/                 simulação sem DOM: mundo/A*, cozinha, pedidos, caos, serviço, campanha, save, história
  src/render/              arte procedural, câmera, partículas, renderer
  src/systems/             áudio (Web Audio), entrada, ajustes
  src/ui/                  HUD, telas, diálogos, seletor, janelas
  tests/                   testes de regras (node --test) e robô de campanha
  scripts/                 build (HTML único), servidor de dev, verificação no navegador
  docs/originais/          protótipo HTML original, intocado
```

Dados ficam fora da lógica; a simulação não depende de DOM nem de relógios próprios (tudo anda por `updateService(dt)`, que não é chamado em pausa e limita saltos de tempo).

## Comandos

```bash
npm run build          # gera dist/Dungeon_Cooked_FINAL_OFFLINE.html e dist/index.html
node scripts/build.mjs --page   # também gera dist/page.html, sem <html>/<head>/<body>, para páginas hospedadas
npm test               # 51 testes de regras (Node, sem dependências)
npm run test:browser   # 15 verificações no navegador (requer Playwright + Chromium)
npm run dev            # servidor local em http://localhost:5174
```

O build é um mini-empacotador próprio (só módulos nativos do Node): junta os módulos em escopos isolados, embute o CSS, confere a sintaxe e recusa qualquer recurso externo no HTML final.

## O que foi testado

Veja `TEST_REPORT.md`. Resumo: 51 testes de regras passando (incluindo a bateria CK/OR/CH/SV/PR/IN do GDD e um robô que conclui a campanha nos três finais) e 15 verificações automáticas no Chromium headless abrindo a build via `file://`, além de sessões guiadas (Noites 1, 3, 5 e 7, Desafio completo, Tranquilo, alto contraste) com capturas revisadas em 360×800, 390×844, 768×1024, 800×360, 844×390, 1366×768 e 1920×1080.

**Não testado:** aparelhos reais (Android/iOS), Firefox, Safari e Edge, zoom de 125%/200%, leitor de tela, modo avião literal e a qualidade do áudio ouvida por uma pessoa. Também não houve playtest com pessoas: as metas de playtest do GDD continuam pendentes.

## Créditos e licenças

Ver `CREDITS_AND_LICENSES.md`. Histórico de mudanças em `CHANGELOG.md`; estado detalhado em `STATUS.md`.

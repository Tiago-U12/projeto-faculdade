# Homologação v0.5 — 2026-10-23

Validação do checklist de uso real (acesso, filtros, modos, gabarito, resultados, progresso, Study Radio, offline, visual/acessibilidade, acervo, privacidade e publicação), com resultados **reais** desta execução.

## Publicação

- O workflow “Publicar TROCA Ticket” ([execução 39965304006](https://github.com/Tiago-U12/projeto-faculdade/actions/runs/39965304006), tentativa 2, 14:46) executou **com sucesso** os três passos do Study Mastery: instalar dependências, gerar e incluir na publicação. Conferido passo a passo via API do GitHub; nenhum deles ficou *skipped*. A mesma execução publicou o TrocaTicket, o Aysha Park e o Dungeon Cooked.
- Endereço: <https://tiago-u12.github.io/projeto-faculdade/study-mastery/>
- **Limitação deste ambiente:** a política de rede da sessão bloqueia `tiago-u12.github.io` e o armazenamento de artefatos do GitHub. A homologação foi feita com **o mesmo commit publicado** (`079cbfa`, árvore `study-mastery` idêntica), compilado aqui e servido no **mesmo subcaminho** `/projeto-faculdade/study-mastery/`, com service worker. Abrir o link público no celular continua sendo conferência do usuário (lista no fim).

## Como foi testado

`npm run build && npm run e2e:homologacao` (`tests/e2e/homologacao.ts`):
- Chromium 141 com emulação de celular (390×844, DPR 3, toque) e **perfil persistente**: o teste offline fecha o navegador inteiro e o reabre sem rede.
- Cada item é feito pela interface, como o estudante faria. A sessão montada pelo app é conferida contra o banco publicado.
- O player usa um MP3 **sintético de silêncio** gerado num diretório temporário. Nenhuma música foi criada ou gravada no repositório.
- Acessibilidade conferida pelo axe-core 4.10 (WCAG 2.2 A/AA) em 7 telas × 2 temas.

Na mesma rodada, também passaram:
- `npm run typecheck`;
- `npm test` (681/681);
- `npm run test:pwa` (6/6);
- `npm run e2e` (39 verificações);
- `npm run e2e:render` (600 questões × 390 e 320 px);
- `npm run e2e:offline`.

**Resultado: 137/137 verificações automatizadas passaram**, mais 6 itens manuais ou informativos.

## Problemas encontrados e corrigidos nesta homologação

| Problema | Correção |
|---|---|
| “Pular para o conteúdo” no quiz mudava o endereço para `#main`: o app usa rotas por `#`, então tirava o estudante da sessão | o link só move o foco para o conteúdo (`<main tabIndex=-1>`); Enter em links também não avança mais a questão |
| Contraste: texto branco sobre o lilás selecionado (tema escuro) = 4,14:1 | `--lav-strong` `#7c68ee` → `#6f5ce6` (4,83:1) |
| Contraste: selo “prova 26/10” no tema claro = 2,45:1 | fundo amarelo fixo `#ffd37a` (10,3:1) |
| Contraste: texto secundário (4,23:1) e verde das contagens (4,48:1) no tema claro | `--faint` `#5b6782` (4,98:1), `--mint` `#08745b` (5,05:1) |
| Alternativas só com fórmula ficavam sem nome para leitor de tela depois da correção (letra A–D com `aria-hidden`) | a letra passa a ser lida, o que também ajuda a usar os atalhos A–D |
| `<input type=file>` escondidos (rádio e importar histórico) apareciam como controles invisíveis; o da importação recebia foco no Tab | `tabIndex=-1` e `aria-hidden`: quem os aciona são os botões visíveis |
| Links do histórico com 21 px de altura (difíceis de tocar) | área de toque com 44 px |
| Zoom de texto alto (150% ≈ 260 px de largura): o cabeçalho e os cartões exigiam 305 px e o navegador encolhia a página | abaixo de 310 px: só o símbolo ✳ na marca, ícone da disciplina acima do texto, métricas e listas quebram linha |

Ficou como informativo: em 260 px (abaixo dos 320 px exigidos pela WCAG), a questão com a fórmula mais longa da amostra ainda precisa de 299 px.

## Revisão de conteúdo (amostra à mão)

Antes da prova de 26/10, revisei à mão **32 questões fáceis e médias** dos 4 assuntos da prova, com as contas refeitas uma a uma. **Todas estão corretas**: gabarito certo, distratores claramente errados e explicação e passos consistentes.
- L’Hôpital: 002, 007, 008, 014, 017, 022, 026, 030.
- Primitivas: 001, 003, 006, 009, 015, 016, 017, 026.
- Substituição: 001, 003, 004, 013, 021, 024, 025, 026.
- Integral definida: 001, 006, 008, 010, 014, 016, 017, 026.

As 100 difíceis de cada disciplina já tinham sido revisadas na auditoria (`AUDITORIA_V05.md`). As 600 foram reexecutadas por SymPy/mpmath, Node, MariaDB e Chromium. Isso **não** equivale a revisão humana, que continua pendente. O “Foco da prova” confere com o aviso da professora registrado em `content/sources.json` (L’Hôpital, integral indefinida, definida e substituição).

## O que continua dependendo de você

- [ ] Abrir <https://tiago-u12.github.io/projeto-faculdade/study-mastery/> no celular. Fazer Cálculo II → Foco da prova → 5 questões, depois uma de Full Stack.
- [ ] Instalar o app pelo navegador e abrir pelo ícone. O Chromium aceitou os critérios de instalação, mas o comportamento varia por aparelho.
- [ ] Com o app aberto uma vez, ativar o modo avião, fechar e reabrir.
- [ ] (Opcional) testar com TalkBack/VoiceOver e com o tamanho de fonte do sistema aumentado.
- [ ] Conferir que o TrocaTicket e o Dungeon Cooked continuam abrindo no endereço público. Na simulação com o build real, abriram; o Aysha Park tem um erro preexistente no Chromium sem tela, sem relação com o Study Mastery.
- [ ] Revisão humana das questões, começando pelos assuntos da prova, e conferência do SQL em MySQL.

## Relatório completo da execução

### 1. Acesso e navegação

| | Verificação | Detalhe |
|:-:|---|---|
| ✓ | página inicial abre (HTTP 200) sem tela em branco |  |
| ✓ | “Cálculo II” aparece com o nome correto |  |
| ✓ | “Cálculo II” mostra 300 questões aprovadas | 300 questões aprovadas · 0 já praticadas · meta 300 |
| ✓ | “Desenvolvimento Web Full Stack” aparece com o nome correto |  |
| ✓ | “Desenvolvimento Web Full Stack” mostra 300 questões aprovadas | 300 questões aprovadas · 0 já praticadas · meta 300 |
| ✓ | “Começar a estudar” abre a configuração |  |
| ✓ | “Meu progresso” abre o progresso |  |
| ✓ | “Acervo e fontes” abre o acervo |  |
| ✓ | a marca volta à página inicial |  |
| ✓ | alterna de disciplina na configuração | HTML semântico e Emmet |
| ✓ | recarregar #/setup?d=fullstack não dá 404 nem tela em branco | cache · Voltar |
| ✓ | recarregar #/progress não dá 404 nem tela em branco | cache · Início |
| ✓ | recarregar #/library não dá 404 nem tela em branco | cache · Início |
| ✓ | recarregar #/results não dá 404 nem tela em branco | cache · Nada por aqui ainda |
| ✓ | recarregar #/quiz não dá 404 nem tela em branco | cache · Nenhuma sessão em andamento |
| ✓ | recarregar #/ não dá 404 nem tela em branco | cache · SEU ESPAÇO DE EVOLUÇÃO |

### 2. Filtros e configuração

| | Verificação | Detalhe |
|:-:|---|---|
| ✓ | um assunto (L’Hôpital, 20): só questões dele | 20 questões, 0 fora do filtro, 0 repetidas |
| ✓ | vários assuntos (primitivas + substituição, 20): só os marcados | 20 questões, 0 fora do filtro, 0 repetidas |
| ✓ | …e mistura os dois marcados |  |
| ✓ | Full Stack, um assunto (React Router): só ele | 10 questões, 0 fora do filtro, 0 repetidas |
| ✓ | “Foco da prova” marca exatamente os 4 assuntos da prova | Antiderivadas e integrais indefinidas · Integral definida, Riemann, TFC e áreas · Integração por substituição · Regra de L'Hôpital |
| ✓ | o atalho da página inicial abre com os mesmos 4 assuntos |  |
| ✓ | prova (20 questões): só os 4 assuntos | 20 questões, 0 fora do filtro, 0 repetidas |
| ✓ | só Fácil: respeita a dificuldade | 20 questões, 0 fora do filtro, 0 repetidas |
| ✓ | só Média: respeita a dificuldade | 20 questões, 0 fora do filtro, 0 repetidas |
| ✓ | só Difícil: respeita a dificuldade | 20 questões, 0 fora do filtro, 0 repetidas |
| ✓ | profundidade “Só aulas”: nenhuma de aprofundamento/desafio e só os assuntos marcados | 20 questões, 0 fora do filtro, 0 repetidas |
| ✓ | profundidade “Aulas + aprofundamento”: nenhum desafio e só os assuntos marcados | 20 questões, 0 fora do filtro, 0 repetidas |
| ✓ | profundidade “Também desafios”: não acrescenta outros assuntos | 20 questões, 0 fora do filtro, 0 repetidas |
| ✓ | sessão de 5 | 5 questões, 0 fora do filtro, 0 repetidas |
| ✓ | sessão de 10 | 10 questões, 0 fora do filtro, 0 repetidas |
| ✓ | sessão de 20 | 20 questões, 0 fora do filtro, 0 repetidas |
| ✓ | sem questões elegíveis o botão fica desabilitado, com aviso |  |
| ✓ | sem nenhum assunto marcado também não inicia |  |
| ✓ | teste especial — “Regras de derivação” pedindo 20: avisa que só há 17 | 17 questões elegíveis Só há 17 questões aprovadas nesta seleção — a sessão terá 17, sem repetir e sem incluir outros ass |
| ✓ | …e a sessão tem 17, todas de Regras de derivação, sem completar com outros assuntos |  |

### 3. Modos de estudo

| | Verificação | Detalhe |
|:-:|---|---|
| ✓ | Aprender: “Próxima” só libera depois de responder |  |
| ✓ | Aprender: mostra na hora quando a resposta está errada |  |
| ✓ | Aprender: explica por que a escolhida está errada |  |
| ✓ | Aprender: explica por que a correta está certa |  |
| ✓ | Aprender: resposta travada após a correção |  |
| ✓ | Aprender: permite avançar após a correção |  |
| ✓ | Aprender: mostra na hora quando a resposta está certa |  |
| ✓ | Simulado: não revela gabarito nem explicação antes do fim |  |
| ✓ | Simulado: avisa que o gabarito vem no final |  |
| ✓ | Simulado: permite trocar a resposta |  |
| ✓ | Simulado: mapa de questões navega | QUESTÃO 3 DE 5 |
| ✓ | Simulado: permite voltar | QUESTÃO 2 DE 5 |
| ✓ | Simulado: pede confirmação com questões em branco |  |
| ✓ | Simulado: finaliza com 4 em branco, marcadas como “em branco” | ACERTOU,EM BRANCO,EM BRANCO,EM BRANCO,EM BRANCO |
| ✓ | Simulado: correção completa aparece no resultado |  |
| ✓ | Revisão: a configuração mostra 3 erros e 3 vencidas | Na seleção atual: 3 para refazer (erros) e 3 vencidas na repetição espaçada. O restante é  |
| ✓ | Revisão: os erros vêm primeiro | c2-derivadas-002,c2-derivadas-003,c2-derivadas-001 |
| ✓ | Revisão: depois as vencidas na repetição espaçada |  |
| ✓ | Revisão: completa com não vistas dos mesmos assuntos | {"errors":3,"due":3,"fresh":4,"other":0} |
| ✓ | Misto: intercala assuntos e dificuldades | 11 assuntos, 3 dificuldades |
| ✓ | Misto: mantém os filtros configurados |  |
| ✓ | Misto: corrige a resposta normalmente |  |

### 4. Gabarito, explicações e matemática

| | Verificação | Detalhe |
|:-:|---|---|
| ✓ | as 10 questões têm 4 alternativas |  |
| ✓ | embaralhamento não altera o gabarito (a correta, onde quer que esteja, dá “Correto!”) | 10/10 · 10 com ordem embaralhada |
| ✓ | fórmulas aparecem formatadas pelo KaTeX, sem erro de renderização | 60 fórmulas, 0 erros |
| ✓ | código mantém a indentação exata | fs-classes-erros-001 |
| ✓ | explicação mostra o passo a passo completo | c2-substituicao-002: 3 passos |
| ✓ | cada questão traz fonte/referência |  |
| • | as 600 questões: 4 alternativas distintas, explicação de cada errada, fonte existente, LaTeX pareado | coberto por `bank-integrity.test.ts` (600 questões) e `e2e:render` (600 × 2 larguras, sem erro de KaTeX) |
| • | a alternativa marcada como correta realmente resolve o problema | 600/600 reexecutadas por SymPy/mpmath, Node, MariaDB e Chromium (`validate --recheck-approved`); amostra revisada à mão no relatório |

### 5. Resultados e desempenho

| | Verificação | Detalhe |
|:-:|---|---|
| ✓ | pontuação e porcentagem corretas (8 de 10 = 80%) | 8 / 10 acertos · 80% |
| ✓ | mostra desempenho por assunto |  |
| ✓ | mostra desempenho por dificuldade (soma = 10 em cada quadro) | 4/4 2/3 1/2 1/1 2/3 4/5 2/2 |
| ✓ | revisão individual mostra a resposta dada e a correta | 2 erradas abertas |
| ✓ | “Refazer os erros” traz exatamente as 2 erradas daquela tentativa |  |
| ✓ | resultado antigo reabre pelo histórico com a pontuação daquela tentativa | #/results?id=cb672445-4230-4dcc-89ef-809adb0d32b9 |

### 6. Progresso e armazenamento

| | Verificação | Detalhe |
|:-:|---|---|
| ✓ | histórico registra as sessões concluídas (Cálculo II) | 4 sessões |
| ✓ | estatísticas de Full Stack separadas das de Cálculo II | Full Stack: 1 · Cálculo II: 4 |
| ✓ | desempenho por assunto atualizado | Regra de L'Hôpital 10/45 questões praticadas 90% |
| ✓ | sair da sessão e voltar: a página inicial oferece continuar (2 de 5) | Continuar sessão em andamento Aprender · 2 de 5 respondidas |
| ✓ | …e continua na mesma questão | QUESTÃO 2 DE 5 |
| ✓ | recarregar preserva a sessão em andamento e as respostas | QUESTÃO 2 DE 5 · 2 respostas · mesma sessão: true |
| ✓ | iniciar outra sessão com uma ativa pede confirmação | Substituir a sessão em andamento? As respostas não concluídas serão descartadas. |
| ✓ | cancelar preserva a sessão e as respostas |  |
| ✓ | confirmar substitui pela nova sessão |  |
| ✓ | exportar gera JSON do Study Mastery com todas as sessões | study-mastery-historico-2026-10-23.json · 5 sessões |
| ✓ | importar e mesclar o mesmo arquivo não duplica | Importado: 0 sessão(ões) adicionada(s). |
| ✓ | arquivo inválido é recusado sem danificar os dados | O arquivo não é um JSON válido. |
| ✓ | “Apagar meus dados” pede confirmação |  |
| ✓ | cancelar não apaga |  |
| ✓ | apagar remove histórico e estatísticas |  |
| ✓ | importar e mesclar acrescenta as sessões do arquivo | Importado: 5 sessão(ões) adicionada(s). |
| ✓ | importar e substituir restaura exatamente o histórico do arquivo | Importado: 5 sessão(ões) carregada(s). |

### 7. Study Radio

| | Verificação | Detalhe |
|:-:|---|---|
| ✓ | o painel da rádio abre |  |
| ✓ | sem MP3: informa que não há música e o Play fica desabilitado |  |
| ✓ | arquivo que não é MP3 é recusado com mensagem clara |  |
| ✓ | MP3 acima de 60 MB é recusado com mensagem clara |  |
| ✓ | é possível escolher um MP3 do aparelho |  |
| ✓ | Play inicia a reprodução | {"n":1,"paused":false,"loop":true,"t":0.001062,"vol":0.6,"dur":2.006813,"ev":{"loadstart":1,"ended":0,"emptied":0}} |
| ✓ | o botão do cabeçalho indica que está tocando |  |
| ✓ | ajustar o volume funciona | 0.3 |
| ✓ | pausar funciona |  |
| ✓ | retomar funciona |  |
| ✓ | a música continua ao trocar de questão e de tela, sem reiniciar o carregamento | {"paused":false,"loadstart":1} |
| ✓ | a música recomeça sozinha ao chegar ao fim (loop) | duração 2.01 s · ended=0 |
| ✓ | o MP3 escolhido continua disponível depois de fechar e reabrir |  |
| ✓ | requisições da rádio: o arquivo não é enviado a servidor | só GET/HEAD |

### 8. Offline e instalação

| | Verificação | Detalhe |
|:-:|---|---|
| ✓ | o navegador considera o app instalável (manifest + service worker) | sem erros de instalabilidade |
| ✓ | nome e ícones corretos no manifest | icon.svg:svg=any · icon-192.png:192x192=192x192 · icon-512.png:512x512=512x512 · icon-maskable-512.png:512x512=512x512 |
| • | instalar e abrir pelo ícone em um celular real | depende do aparelho; o Chromium aceitou os critérios de instalação |
| ✓ | navegador fechado e reaberto sem internet: a página inicial abre |  |
| ✓ | Cálculo II funciona offline (questões, fórmulas, explicações) | 7 fórmulas na 1ª questão |
| ✓ | Full Stack funciona offline |  |
| ✓ | sessões e progresso são salvos sem internet |  |
| ✓ | a música do aparelho toca offline |  |
| ✓ | remover a música apaga o arquivo guardado pelo app |  |
| ✓ | volta a funcionar normalmente com a conexão restabelecida |  |

### 9. Visual e acessibilidade

| | Verificação | Detalhe |
|:-:|---|---|
| ✓ | sem rolagem horizontal em 320×640 (7 telas) |  |
| ✓ | sem rolagem horizontal em 360×780 (7 telas) |  |
| ✓ | sem rolagem horizontal em 390×844 (7 telas) |  |
| ✓ | sem rolagem horizontal em 412×915 (7 telas) |  |
| ✓ | sem rolagem horizontal em paisagem 844×390 (7 telas) |  |
| • | telas em zoom 150% (260 px) (texto ampliado) | rolagem horizontal em: questão com explicação (precisa de 299 px) (abaixo da largura mínima de 320 px exigida pela WCAG) |
| ✓ | alvos de toque com pelo menos 24 px (WCAG 2.5.8) | todos ≥ 24 px |
| • | alvos entre 24 e 40 px (confortáveis, abaixo do ideal de 44 px) | 5: questão com explicação: Fonte e referência 298×32 / acervo: Cobertura por assunto 298×32 / painel da rádio: Fechar Study Radio 36×36 / painel da rádio:  213×32 |
| ✓ | textos não ficam cortados |  |
| ✓ | tema escuro aplicado | rgb(9, 15, 29) |
| ✓ | tema claro aplicado | rgb(244, 245, 251) |
| ✓ | axe-core (WCAG 2.2 A/AA): sem violações nos dois temas e 7 telas | 0 violações |
| ✓ | o botão alterna o tema |  |
| ✓ | Tab: o primeiro foco é “Pular para o conteúdo” |  |
| ✓ | “Pular para o conteúdo” no quiz não tira o estudante da sessão | #/quiz |
| ✓ | teclado: 1–4 respondem e Enter avança |  |
| ✓ | preferência de movimento reduzido respeitada | {"t":"0s","a":"none"} |
| • | leitor de tela real (TalkBack/VoiceOver) e ampliação de fonte do sistema | não automatizável aqui; axe-core cobre nomes acessíveis, rótulos e papéis ARIA |

### 10. Acervo e cobertura

| | Verificação | Detalhe |
|:-:|---|---|
| ✓ | acervo mostra 600 de 600 aprovadas |  |
| ✓ | 100/100 por dificuldade em cada disciplina | [["100/100","100/100","100/100"],["100/100","100/100","100/100"]] |
| ✓ | cobertura por assunto bate com o banco e com as cotas | 24 assuntos |
| ✓ | acervo declara revisão humana pendente |  |

### 11. Segurança e privacidade

| | Verificação | Detalhe |
|:-:|---|---|
| ✓ | nenhum login ou senha é pedido |  |
| ✓ | nenhuma requisição para fora do próprio site (Moodle, Google Drive ou outros) | 381 requisições, todas do próprio site |
| ✓ | nenhum envio de dados (só GET/HEAD durante toda a homologação) |  |
| ✓ | dados locais só sob o nome do Study Mastery | {"ls":["study-mastery:radio:v1","study-mastery:state:v1"],"caches":["study-mastery-0.5.0-ba5c648dda22bb2b"],"idb":["study-mastery-radio"]} |
| ✓ | nenhuma chave de API ou segredo nos arquivos publicados | 77 arquivos verificados |
| ✓ | nenhum material privado da faculdade na publicação (PDF, ZIP, texto extraído) |  |
| ✓ | nenhum MP3 incluído na publicação |  |
| ✓ | sem erros de console durante a homologação |  |

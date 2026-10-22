# Relatório de testes — Dungeon Cooked (web 2D)

Data: 21/10/2026. Ambiente: contêiner Linux, Node.js 22.22.0, Playwright 1.56.1 com Chromium headless (build 1194). Só estão listados testes que foram executados de fato.

## 1. Testes de regras (`npm test`)

**51 de 51 passando.** Rodam a simulação real (sem DOM) com relógio controlado.

| Arquivo | Casos |
| --- | --- |
| `cooking.test.mjs` | Dados (12 receitas e 12 ingredientes usados; nenhuma receita é sub-multiconjunto de outra na mesma estação; cada noite tem estação e ingredientes para o que desbloqueia). **CK-01** a **CK-08**. Tábua (dois cortes, recusa ingrediente sem preparo). As 12 receitas de ponta a ponta. Lixeira/Q com confirmação para prato e limpeza de estação (E não confirma limpeza). Nenhum item em dois lugares numa sessão longa. |
| `orders.test.mjs` | **OR-01**, **OR-02**, **OR-02b** (confirmação de prato queimado cancelada se o pedido expira), **OR-03** (4 min de noite real verificando lugares e pedidos a cada quadro). Entrega errada (explicada, prato fica com o chef, próxima tentativa funciona). Pedido aberto por característica. Prato queimado (confirmação, avaliação baixa, tensão). Preferências (Líria e picância). Tranquilo (não expira, não queima, tensão parada). Desafio termina em 180 s e pontua. **IN-01/IN-02** na simulação (sem update nada anda; salto de 300 s é limitado a 0,1 s). |
| `chaos.test.mjs` | **CH-01** (sino sem conflito não paga, nem repetido). Conflito: aviso → ativo, tensão só sobe com atrito. Sino resolve, paga bônus uma vez e entra em recarga. Conversar acalma (+0,5 de vínculo). Prato da paz reconcilia (+1). Harmonia de rivais que chegam juntos. **CH-02** (crise visível, limitada, paciência não zera, serviço continua). Tranquilo sem crise. Faixas com nome e ícone. |
| `progression.test.mjs` | **PR-02**: um robô joga as **7 noites completas três vezes** com estratégias de diálogo diferentes e chega aos **três finais** (Segredo do Luar, Mesa Compartilhada, Lenda), comprando ≥ 3 melhorias. **PR-01** (débito único; +12% de velocidade medido no movimento). Commit não duplica recompensa. Final exige elegibilidade; revisitar a Noite 7 restaura o checkpoint. |
| `save.test.mjs` | **SV-01** (salvar/reabrir reconstitui noite, melhorias, confiança, conquistas e ajustes). **SV-02** (8 arquivos corrompidos/maliciosos recusados; save anterior intacto). **SV-03** (versão mais nova ou antiga recusada com erro claro). Exportar/importar ida e volta. Armazenamento bloqueado. Save corrompido no armazenamento. |
| `input.test.mjs` | Navegação por clique entre **todas as 156 combinações** de estações. Colisão: 3.200 passos em 8 direções sem entrar em bancada. A* com destino inalcançável. **IN-04** (toque → objeto sob o dedo com escala, câmera seguindo e canvas deslocado). Câmera (letterbox no desktop, zoom e limites no celular). **IN-03** na lógica do joystick (zona morta e vetor). |

Observação do robô de campanha (perfeito, sem tempo de caminhada real): 6–11 pratos por noite, média 5★, ~1.000 moedas por noite. É um teto, não a experiência de uma pessoa.

## 2. Verificação no navegador (`npm run test:browser`)

**15 de 15 passando**, abrindo `dist/Dungeon_Cooked_FINAL_OFFLINE.html` via `file://`:

1. abre sem erros de JavaScript;
2. não deixa tirar prato durante o cozimento;
3. pega o prato pronto;
4. entrega correta conta 1 prato (tutorial completo por cliques no canvas);
5. pausa congela o relógio;
6. aba oculta pausa o jogo;
7. nenhum erro no fluxo;
8. 360×800 sem rolagem horizontal;
9. joystick visível no toque;
10. joystick move o chef;
11. `pointercancel` para o movimento (IN-03);
12. tutorial completo por toque com a câmera seguindo o chef;
13. armazenamento bloqueado: aviso e jogo funcionando;
14. recarregar lê o save local;
15. save corrompido não impede abrir.

## 3. Sessões guiadas no Chromium headless (roteiros de Playwright)

Executadas durante o desenvolvimento, com capturas de tela revisadas uma a uma:

| Sessão | Resultado observado |
| --- | --- |
| Noite 1 completa por cliques (robô) | 6 clientes servidos, encerramento, resultados, compra de "Deslize Fantasmal" (debitada e salva), abertura da Noite 2; após recarregar a página o menu oferece "Continuar · Noite 2". |
| Noite 3 (save montado) | Rixa da Batata: aviso → conflito ativo com linha/raio entre os rivais e pedidos com contorno; o sino resolveu e pagou o bônus de paz uma vez. |
| Noite 5 (save montado) | O caldeirão sussurrou, o diálogo abriu no meio do serviço, a pista foi salva e a campanha avançou para a Noite 6. |
| Noite 7 (save montado) | Conflito acalmado conversando, Banquete servido à Mora, tela de escolha com os três finais e condições, epílogo "Segredo do Luar" com ilustração e resumo; save marcado como concluído. |
| Desafio completo (3 min reais) | 12 pratos, 1.270 pontos, recorde salvo no registro separado. |
| Erros | Entrega errada recusada com explicação; prato deixado no fogo passou por "quase queimando" e "queimado"; entrega do queimado pediu confirmação. |
| Teclado | WASD até a Horta, E abriu o seletor, tecla 1 pegou o cogumelo. |
| Tranquilo, alto contraste, texto maior | Pedidos "sem pressa", tensão desligada; ajustes aplicados e salvos. |
| Áudio | Nenhuma nota antes do primeiro gesto (autoplay respeitado); trilha agendada após o gesto; mudo salvo. Qualidade sonora **não** foi avaliada por ouvido. |
| Desempenho | 60 FPS medidos em 1920×1080 na Noite 7 com todas as reformas (Chromium headless; não é medição em celular real). |

Resoluções revisadas por captura: 360×800, 390×844, 768×1024 (toque), 800×360 e 844×390 (celular deitado), 1366×768 e 1920×1080. Nenhuma teve rolagem horizontal; botões de ação ficam visíveis e com 42–62 px de altura.

## 4. Defeitos encontrados e corrigidos durante os testes

- Par de rivais podia sentar só pela metade (índice de lugar errado) — o objetivo de harmonia da Noite 6 ficava impossível. Corrigido e coberto por teste.
- Clientes avulsos furavam a fila do par e do tutorial. Corrigido.
- O chef encalhava na quina do caldeirão em alguns trajetos por clique. Corrigido (folga e replanejamento) e coberto pelo teste de 156 trajetos.
- Câmera nunca entrava no modo "seguir" em retrato; página mais larga que a tela no celular. Corrigidos.
- Música não começava se pedida antes do primeiro gesto. Corrigido e verificado.
- Selo "quase queimando" sumia ao piscar. Agora pulsa sem esconder o texto.
- Com ingrediente na mão, o caldeirão ocupado dizia "ainda cozinhando" em vez de "ocupado". Corrigido (CK-04).

## 5. Não testado (pendente)

- Aparelhos reais: Chrome Android, Safari iOS, tablets. Toque foi **emulado** no Chromium.
- Navegadores Firefox, Safari e Edge.
- Zoom do navegador em 125% e 200%; modo avião literal (a build não referencia rede e o build recusa recursos externos).
- Leitor de tela e auditoria de contraste formal.
- Playtest com pessoas: nenhuma das métricas da seção 17.4 do GDD foi medida.

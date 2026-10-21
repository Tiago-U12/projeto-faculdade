# Status da entrega — V1.0

Checklist do aceite do prompt mestre e dos portões do GDD (seção 17.3). "Feito" significa implementado **e** verificado conforme `TEST_REPORT.md`.

## P0 — estabilidade

| Item | Estado |
| --- | --- |
| HTML offline abre via `file://` sem exceções | Feito (Chromium headless) |
| Entrada, câmera e colisão | Feito |
| Pedidos e preparo com estados seguros (sucesso, erro, queima) | Feito |
| Impede tirar prato cozinhando e depositar em estação ocupada | Feito |
| Pausa real (inclui aba oculta e perda de foco) | Feito |
| Menus | Feito |
| Salvar, fechar, reabrir e continuar sem duplicar recompensa | Feito |

## P1 — conteúdo

| Item | Estado |
| --- | --- |
| 12 ingredientes e 12 receitas usados | Feito |
| 8 clientes distintos | Feito |
| 7 noites com história e objetivos | Feito |
| 3 finais alcançáveis por decisões plausíveis | Feito (robô chega aos três; condições visíveis no Diário) |
| 6 melhorias funcionais | Feito (efeitos aplicados no cálculo; +12% de velocidade medido) |
| Modos História, Tranquilo e Desafio | Feito |
| Livro, diário, conquistas, créditos | Feito |
| Acessibilidade e ajustes essenciais | Feito (com a limitação de leitor de tela descrita no README) |
| Pacote, README e documentação | Feito |

## P2 — polimento

| Item | Estado |
| --- | --- |
| Direção visual 2D consistente (arte procedural própria, não placeholders) | Feito, revisado por capturas |
| Animações, partículas, feedback de personagens | Feito |
| Áudio (música por tema + efeitos) | Feito; qualidade não avaliada por ouvido |
| Responsividade (360×800 a 1920×1080, retrato e paisagem) | Feito em emulação |

## Pendente / fora do alcance desta sessão

- Testes em aparelhos e navegadores reais (Android, iOS, Firefox, Safari, Edge) e em zoom 125%/200%.
- Playtest com pessoas e as métricas da seção 17.4 do GDD.
- Balanceamento fino: noites duram ~3–6 min para quem joga bem (o GDD sugere 6–10) e as moedas sobram no fim da campanha. Tempos, paciência, valores e preços estão em `src/data/` para ajuste.
- Descrição completa da cena para leitores de tela.

## Próximo passo sugerido

Jogar a campanha em um celular e um computador reais, anotar onde houve confusão ou espera, e ajustar `src/data/nights.js` (paciência, intervalos, convidados) e `src/data/upgrades.js` (preços).

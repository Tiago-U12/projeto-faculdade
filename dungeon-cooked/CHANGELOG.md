# Changelog

## 1.0.0 — 21/10/2026

Reescrita completa a partir do protótipo `docs/originais/dungeon_cooked_cozinha_2d.html` (preservado sem alterações), seguindo o GDD V1.0.

### Correções em relação ao protótipo

- **Prato cru:** no protótipo, `pot.ready` era definido ao colocar o segundo ingrediente e a coleta só checava `pot.ready`; dava para tirar o prato antes de cozinhar e quebrar o estado ao fim do timer. Agora as estações são máquinas de estado (`EMPTY → LOADING → PROCESSING → READY → SPOILED`) e o prato só sai em `READY` ou `SPOILED`.
- **Estação ocupada** recusa outro lote sem consumir o ingrediente da mão.
- **Receitas por multiconjunto + estação** (ordem irrelevante, multiplicidade conta), não por "todos os ingredientes estão na lista".
- **Salada na bancada fria**, sem fervura e sem queimar.
- **Sino** não gera moedas fora de conflito; bônus de paz uma vez por conflito.
- **Pausa real:** tudo anda por um único `updateService(dt)`; nada usa `setTimeout` para regras. Aba oculta e perda de foco pausam; saltos de tempo são limitados.
- **Clique/toque** convertidos com DPR, letterbox e câmera; colisão impede atravessar bancadas.
- **Pedidos** com fechamento único (`FULFILLED | EXPIRED | CANCELLED`): sem pagamento ou expiração em dobro.

### Novidades

- Campanha de 7 noites com objetivos, bônus, diálogos com escolhas, eventos no meio do serviço e 3 finais; modos Tranquilo e Desafio.
- 12 ingredientes, 12 receitas, 4 estações de preparo + tábua, despensa em 3 prateleiras, lixeira e Sino da Harmonia.
- 8 clientes com gostos, aversões, falas, confiança e rivalidades pessoais; pedidos abertos por característica; pedidos prioritários.
- Motor do Caos: faixas de tensão com texto e ícone, conflitos com aviso, resolução por sino, conversa ou prato da paz, crise recuperável.
- Loja com 6 melhorias funcionais e 3 reformas que mudam o salão.
- Livro de receitas, perfis de clientes, diário, pistas e conquistas locais.
- Save versionado com validação estrita, exportação/importação JSON e cópia de segurança.
- Arte procedural nova (chef, 8 clientes, ingredientes, pratos, estações, cenário, finais), música e efeitos com Web Audio, interface responsiva com joystick e opções de acessibilidade.
- Build em HTML único offline e testes automatizados.

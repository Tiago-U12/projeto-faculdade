# Changelog

## 1.1.0 — 22/10/2026

### Link de continuar

- Novo **link de continuar**: o save inteiro, compactado (`CompressionStream` deflate, base64url), vai no endereço do jogo depois de `#continuar=`. Abrir o link em outro aparelho ou navegador mostra o que vem nele e o que já existe ali, e só substitui com confirmação e cópia de segurança. Sem servidor e sem conta.
- Acesso em **Opções → Dados salvos** e num lembrete no resultado de cada noite concluída. Botões de copiar e, onde o navegador oferece, compartilhar.
- **Importar save** aceita também o link (ou só o código), mesmo com quebras de linha de apps de mensagem.
- Links cortados, alterados, de formato desconhecido ou que inflariam além de 2 MB são recusados sem tocar no save atual; o conteúdo passa pela mesma validação estrita do import.
- O código sai da barra de endereço logo após ser lido (recarregar não pergunta de novo). Abrir um link com o mesmo progresso só avisa.
- Pedido de armazenamento persistente (`navigator.storage.persist`) ao fim da primeira noite salva.
- Correção: o aviso "Importado só nesta sessão" era fechado na mesma hora pela volta ao menu; agora aparece depois dela.

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

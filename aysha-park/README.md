# Aysha Park — protótipo jogável v0.2

Primeiro marco do GDD: uma área do **Jardim dos Herbívoros** com Aysha controlável, Jenny acompanhando, Tico interativo e uma missão para encontrar e entregar três frutas. A conclusão rende o primeiro Emblema da Amizade.

## Executar

Para jogar, abra `dist/index.html` no navegador. O arquivo é independente e funciona sem internet.

Para desenvolver, requer Node.js 20+ e npm. Não precisa instalar dependências: o Phaser 3.90.0 está incluído em `vendor/`, com licença MIT.

```bash
npm run dev
```

Abra `http://localhost:5173`. Para testar no celular, acesse `http://IP-DO-COMPUTADOR:5173`, com celular e computador na mesma rede.

```bash
npm run build
npm run preview
```

O build estático é gerado em `dist/index.html`, com código, estilos, arte e motor incorporados. Não há download de assets durante o jogo.

## Controles

| Ação | Computador | Celular |
| --- | --- | --- |
| Mover Aysha | WASD ou setas | Joystick virtual |
| Conversar / coletar / entregar | E | Botão Interagir |
| Avançar diálogo | Espaço, Enter, E ou clique | Toque na caixa de diálogo |
| Pausar / continuar | Esc | Botão de pausa |
| Pedir dica à Jenny | Clique na setinha do objetivo | Toque na setinha do objetivo |

No celular, pode jogar em pé ou deitado. Durante a aventura, o jardim ocupa a área disponível, a missão fica compacta no topo e a câmera se adapta à tela. O progresso é salvo no navegador; a opção de reiniciar permite começar novamente.

## Correções desta revisão

- Interface menor no celular, com botões de toque maiores e sem o aviso permanente de rotação.
- Câmera mais aberta em telas estreitas, mantendo Aysha no centro e sem prender a visão nas bordas do mapa.
- Limite caminhável segue o contorno real da ilha, evitando andar sobre a água exterior.
- Fruta rosa descoberta e árvores translúcidas quando encobrem Aysha ou Jenny.
- Jenny retoma no mesmo ponto seguro de Aysha e segue o percurso real, inclusive junto a obstáculos.
- Progresso salvo é validado antes de continuar; itens inválidos ou repetidos são descartados.
- Reiniciar cancela dicas antigas; a pausa preserva a fala atual e limpa teclas e joystick.
- Uma seta aponta o próximo objetivo e permite pedir uma dica à Jenny. As dicas automáticas aparecem após inatividade.
- Diálogos não avançam várias vezes ao segurar uma tecla; navegação por teclado permanece no diálogo aberto.

## Roteiro de validação

1. Comece a aventura e caminhe pelo jardim.
2. Observe Jenny seguindo Aysha e teste os limites e obstáculos do cenário.
3. Aproxime-se de Tico e converse com ele.
4. Encontre e colete as três frutas, acompanhando o contador.
5. Volte a Tico para entregar as frutas e receber o emblema.
6. Recarregue a página para conferir o progresso salvo; teste também pausa, áudio e controles por toque.

## Escopo e limitações

Este projeto implementa apenas o primeiro marco. As outras duas missões, o epílogo, Aurora e a homenagem de aniversário ficam para uma etapa posterior à validação deste protótipo.

Os personagens, elementos do cenário e efeitos usam **assets procedurais provisórios**, produzidos no próprio projeto. Eles permitem avaliar movimento, leitura do cenário e interações; não representam os sprites, animações ou a arte final. Nenhuma aparência definitiva de Aysha ou Jenny foi assumida.

Os diálogos e as posições das frutas ficam em `src/data.js`. A arte fica em `src/art.js`; lógica e interface, em `src/main.js` e `src/style.css`. O contorno compartilhado do cenário e o cálculo da câmera ficam em `src/geometry.js`. Os scripts de build e servidor usam apenas módulos nativos do Node. O próximo marco é revisar a experiência no computador e celular antes de expandir as áreas.

Validação desta entrega: build e sintaxe JavaScript verificados; simulação da missão completa, coleta sem duplicação, colisões, proteção do save e acompanhamento de Jenny aprovados. Texturas e composição do jardim conferidas por renderização estática. A execução real no navegador deste ambiente ficou bloqueada pelas restrições do sandbox; use o roteiro acima para a revisão visual e de controles no dispositivo.

## GitHub Pages

Jogue em https://tiago-u12.github.io/projeto-faculdade/aysha-park/.

Este projeto fica isolado em `aysha-park/`. O fluxo compartilhado em `.github/workflows/deploy.yml` gera o jogo e acrescenta seu HTML em `/aysha-park/` no mesmo artefato do Pages, mantendo o TrocaTicket na raiz. Não é necessário instalar dependências para gerar o Aysha Park.

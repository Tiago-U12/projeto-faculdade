# Créditos e licenças

## Autoria

- **Conceito, nome e personagens-base:** equipe do projeto Dungeon Cooked (repositório histórico `2026-1-NCC1/Projeto2`) e protótipo HTML "Cozinha do Desespero" fornecido pelo proprietário do projeto.
- **Especificação:** GDD V1.0 "Dungeon Cooked — Documento mestre de produção" fornecido pelo proprietário.
- **Implementação desta versão web 2D:** código, arte procedural, roteiro, falas, música e efeitos sonoros escritos para este projeto, com auxílio de IA (Claude Code), a partir das especificações acima.

## Recursos de terceiros

**Nenhum** recurso de terceiros é distribuído:

- Imagens: todas desenhadas em tempo de execução com a API Canvas 2D (`src/render/`). Não há arquivos de imagem.
- Áudio: sintetizado em tempo de execução com Web Audio (`src/systems/audio.js`). Não há arquivos de som.
- Fontes: só as fontes do sistema do jogador (pilhas `Trebuchet MS`, `Georgia`, `system-ui` etc.). Nenhuma fonte é embutida.
- Bibliotecas: nenhuma em tempo de execução. Os scripts de build e servidor usam só módulos nativos do Node.js.
- Ferramentas de teste (não fazem parte do jogo): Node.js test runner; Playwright (Apache-2.0) com Chromium, usado apenas para a verificação opcional no navegador e não incluído no pacote.
- Os recursos 3D do projeto Unity histórico **não** foram usados.

As inspirações declaradas pela equipe (Coffee Talk, Dungeon Meshi, Doodle God, Dave the Diver) orientaram apenas o tom; nenhum personagem, arte, áudio ou código desses jogos foi usado.

## Licença

O repositório não declara uma licença de código aberto. Até que o proprietário defina uma, todos os direitos sobre o conteúdo deste diretório pertencem aos autores do projeto Dungeon Cooked.

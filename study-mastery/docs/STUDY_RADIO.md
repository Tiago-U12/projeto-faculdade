# Study Radio

Player próprio para uma faixa MP3 em loop. Sem cadastro, anúncios, Spotify ou serviços pagos. **Nenhuma música acompanha o repositório.** Não há reprodução automática: o estudante precisa tocar no botão de reprodução.

## Origens

- **Do app:** um responsável pode fornecer `public/audio/study-radio.mp3` antes do build. O arquivo é opcional; sua ausência não impede estudar. A consulta de disponibilidade usa HEAD, sem baixar o arquivo inteiro.
- **Do aparelho:** “Escolher MP3 do aparelho” aceita MP3 por MIME ou extensão, não vazio, até 60 MiB. O arquivo fica no IndexedDB desse navegador; não é enviado a servidor. Se o armazenamento estiver bloqueado, o player avisa que a faixa vale apenas para a aba aberta.

O volume e a origem preferida ficam em `localStorage` (`study-mastery:radio:v1`); a faixa local fica no IndexedDB `study-mastery-radio`. “Remover” apaga a faixa local. Exportar/importar histórico de estudos não transfere a música nem essas preferências.

## Continuidade e offline

O `RadioProvider` mantém um único elemento de áudio fora das telas do quiz: fechar o painel, avançar questões e navegar não reinicia a faixa. O MP3 fica em loop e há controles de volume, pausa e origem, além da integração com Media Session quando suportada.

O worker guarda o MP3 do app completo, nunca um pedaço 206. Para reprodução/seek, devolve `206 Partial Content` a partir do arquivo completo em cache; aceita intervalos delimitados, abertos e sufixos. Intervalos fora do arquivo retornam 416. HEAD com cache lê os metadados; sem cache preserva HEAD na rede. Falha de quota não impede tocar a resposta online.

Se o MP3 estiver no build, ele integra a lista de assets do pré-cache; também pode entrar no cache quando solicitado posteriormente. Para a faixa do aparelho, o blob salvo em IndexedDB funciona offline. Cache/IndexedDB podem ser removidos pelo navegador; nesse caso é necessário obter a faixa novamente. Um arquivo com extensão MP3 ainda pode ser inválido: erros de decodificação aparecem no player.

## Testes

- `src/lib/__tests__/radio.test.ts`: preferências, limites/formatos e distinção entre áudio e fallback HTML.
- `src/components/__tests__/RadioPlayer.test.tsx`: jsdom com provider real, ausência de música, upload inválido, fallback de armazenamento, volume, pausa, remoção, Escape e continuidade entre telas. Mídia e armazenamento indisponíveis em jsdom são substituídos nos testes.
- `npm run test:pwa`: transporte Range/cache/HEAD e falha de quota, sem arquivo de música.
- `npm run e2e:offline`: bytes sintéticos em memória para verificar transporte em Playwright. A fixture não é uma música nem comprova decodificação de um MP3 real.

Os seis testes isolados do PWA passaram nesta continuação. Vitest e Playwright permanecem bloqueados pelo ambiente; veja [AUDITORIA_V05.md](AUDITORIA_V05.md). A experiência sonora exige um MP3 válido fornecido pelo usuário ou responsável.

# Diagnóstico: "não abre no Chrome do Galaxy A52"

Relato de 24/10/2026, 00:02 UTC: o Study Mastery "não abre" no Chrome 155.0.8059.84 de um Galaxy A52. O sintoma exato
(tela em branco, código de erro, carregamento infinito, endereço usado) **ainda não foi informado**. Houve antes um
`DNS_PROBE_FINISHED_NXDOMAIN` seguido de acesso normal. Os dois relatos são tratados separadamente.

Limitação principal: **não houve teste no aparelho real.** Tudo abaixo é emulação no Chromium 141 deste ambiente (tela,
toque, user agent, CPU e rede) ou execução no Chrome de um runner do GitHub. Emulação não reproduz GPU, memória, fontes,
configurações nem extensões do aparelho.

## O que foi verificado

| # | Verificação | Como | Resultado | Tipo |
|---|---|---|---|---|
| 1 | Endereços públicos na 0.5.2 | Chrome real em runner do GitHub, 23/10 17:29 UTC (run 39995401213) | `study-mastery.pages.dev` e o GitHub Pages abrem a v0.5.2; recarga online e offline, resposta de questão e sessão preservada; sem erros de página | Medido (desktop Linux, não Android) |
| 2 | Aparelho que ficou com o service worker da 0.5.0/0.5.1 | `tests/e2e/a52-diagnostico.ts`, cenário 1, layout do Cloudflare (index.html → / com 308) | Recarregar com o worker antigo dá `net::ERR_FAILED`: a página não abre | **Reproduzido em emulação** |
| 3 | O mesmo aparelho depois do deploy da 0.5.2 | cenário 1, só recargas comuns (sem `registration.update()` manual) | Abriu na primeira nova tentativa (~1,5 s depois do erro); progresso e sessão em andamento preservados | Reproduzido em emulação |
| 4 | Desempenho | cenário 2: 412×915 @2,625, toque, UA Android/Chrome 155, CPU 4× mais lenta, 150 ms + 1,6 Mbit/s, texto comprimido como no Cloudflare | Tela inicial em ~2,9 s na 1ª visita e ~0,5 s com cache | Medido em emulação |
| 5 | Layout e botões | cenário 2 | Sem rolagem horizontal em início, configuração e 5 questões | Medido em emulação |
| 6 | Fórmulas | cenário 2, 5 questões de Cálculo II | Nenhum erro de KaTeX; também cobertas pelas 600 questões de `npm run e2e:render` | Medido em emulação |
| 7 | Persistência local | cenário 2 | Sessão salva, mantida após recarga, Progresso abre offline | Medido em emulação |
| 8 | Console | cenário 2 | Nenhum erro | Medido em emulação |

## Hipóteses (não confirmadas)

1. **Service worker anterior à 0.5.2 no aparelho (mais provável para "não abre")**. Da criação do projeto no
   Cloudflare (~16:45 UTC de 23/10) até o deploy da 0.5.2 (~17:27 UTC), o site serviu a 0.5.0/0.5.1, cujo worker
   atendia a navegação com o `index.html` do cache — que no Cloudflare é uma resposta redirecionada; o Chrome recusa
   isso com `ERR_FAILED`. Se o A52 abriu o site nessa janela, a primeira visita seguinte falha. A emulação mostra que uma nova
   tentativa já recupera. Se o aparelho continuar sem abrir depois de 2–3 tentativas, esta hipótese fica fraca.
2. **Tela em branco durante o carregamento**. Até a 0.5.2 a página ficava vazia até o JavaScript terminar (~3 s em rede
   lenta, mais em rede pior). Em conexão ruim isso pode parecer "não abre". Mitigado nesta versão (ver abaixo).
3. **Endereço com caractere invisível**. O endereço do Cloudflare foi compartilhado com um caractere invisível (U+2060)
   colado depois da barra. Nos testes, caminhos desconhecidos caem no app normalmente; não explica o erro sozinho.
4. **DNS_PROBE_FINISHED_NXDOMAIN**. Ocorreu antes do acesso bem-sucedido: compatível com o domínio `*.pages.dev`
   recém-criado ainda propagando ou com cache negativo de DNS no aparelho/operadora. Não reproduzível agora; não
   indica falha do app.

## O que mudou no app (0.6.0)

- O `index.html` mostra "Carregando o Study Mastery…" antes do JavaScript, em vez de uma página vazia.
- Se o app não abrir (arquivo que não carregou, erro na inicialização ou mais de 20 s), aparece **"O Study Mastery
  não terminou de abrir"** com "Tentar de novo" e "Reparar e recarregar". O reparo remove só o service worker e os
  caches deste app; progresso (localStorage) e música do aparelho (IndexedDB) ficam. Testado no cenário 3.
- Erro em uma tela mostra uma mensagem com "Voltar ao início", "Recarregar" e "Ajuda e diagnóstico" em vez de branco.
- Nova tela **Ajuda e diagnóstico** (`#/ajuda`, link no rodapé): diagnóstico copiável (versão, navegador, tela, service
  worker, caches, armazenamento, erros técnicos — sem respostas do estudante) e "Reparar o app" com opção de exportar o
  histórico antes. Testado no cenário 4.
- O pré-cache deixou de baixar as fontes `.ttf`/`.woff` alternativas do KaTeX (~700 KB que o Chrome não usa); se algum
  navegador pedir, o worker guarda na primeira vez.

## O que pedir a quem tem o A52

1. O que aparece exatamente (print): tela branca, "Carregando…", mensagem de erro com código, ou outra coisa.
2. Qual endereço foi aberto (Cloudflare ou GitHub Pages) e se foi pelo WhatsApp/navegador interno ou pelo Chrome.
3. Se abrir: rodapé → **Ajuda e diagnóstico** → "Copiar diagnóstico" e enviar o texto.
4. Se não abrir nem a ajuda: no Chrome, abrir `chrome://serviceworker-internals`, procurar `study-mastery`, tocar em
   **Unregister** e recarregar. Isso não apaga o progresso. Evite "Limpar dados do site" se houver progresso no
   aparelho que ainda não foi exportado.

## Como repetir

```bash
npm run build
CHROMIUM_PATH=/caminho/do/chrome npx tsx tests/e2e/a52-diagnostico.ts
```

Capturas: `docs/screenshots/v06/a52-*.png`.

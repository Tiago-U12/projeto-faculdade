# Publicação do Study Mastery

Endereço principal: <https://study-mastery.pages.dev/>.
Endereço mantido no GitHub Pages: <https://tiago-u12.github.io/projeto-faculdade/study-mastery/>.

O app mantém `base: './'` e roteamento por hash (`#/setup`, `#/quiz`, `#/results?id=...`).
Tentativas são locais ao navegador: o link identifica uma tentativa existente naquele aparelho, não compartilha seus dados.

## Cloudflare Pages e atualizações automáticas

Integração oficial Cloudflare Workers and Pages com o GitHub:
- Repositório: `Tiago-U12/projeto-faculdade`.
- Branch de produção: `main`.
- Root directory: `study-mastery`.
- Framework: React (Vite).
- Build command: `npm run build`.
- Build output directory: `dist`.
- Node: `NODE_VERSION=22.22.0`, versão usada na validação registrada.
- Hospedagem estática no plano Free, com domínio `pages.dev`; nenhum backend, API paga ou MP3 é necessário.

As configurações ficam no painel Cloudflare. O check **Cloudflare Pages**, publicado no GitHub pelo app oficial, identifica o SHA e o resultado do deploy. Branches de trabalho podem gerar prévias; a prévia não comprova que a mesma versão já está em produção.

Para atualizar: abrir um PR para `main`, executar os testes pertinentes, revisar e mesclar. A integração publica o novo build automaticamente. Conferir o check do SHA mesclado e a versão do rodapé no endereço principal.

O Worker separado chamado `projeto-faculdade` (`workers.dev`) é distinto do projeto Pages `study-mastery`. Uma falha no check **Workers Builds: projeto-faculdade** deve ser diagnosticada separadamente e não deve ser descrita como falha do Pages. Desconectar ou remover esse Worker exige ação no painel; não é necessário alterar o código dos outros aplicativos para publicar o Study Mastery.

## GitHub Pages e os outros projetos

A publicação existente permanece ativa. Os três passos de Study Mastery em `.github/workflows/deploy.yml` exigem:

```yaml
if: vars.PUBLICAR_STUDY_MASTERY == 'true'
```

A autorização para habilitar esses passos já foi concedida pelo Tiago. A execução [39965304006](https://github.com/Tiago-U12/projeto-faculdade/actions/runs/39965304006), tentativa 2, executou instalação, build e inclusão do Study Mastery com sucesso.
O workflow dispara em push para `main` ou execução manual e copia o build para `TrocaTicket/dist/study-mastery/`.

A variável controla a inclusão no próximo artefato. Desabilitá-la pode remover o Study Mastery do próximo deploy do GitHub Pages; não é um modo de congelar a publicação anterior.

TrocaTicket, Aysha Park e Dungeon Cooked continuam na hospedagem existente. Seus passos de build não foram alterados nesta atualização. A auditoria registra um erro preexistente do Aysha Park em Chromium headless, sem relação com o Study Mastery.

**O repositório permanece público por instrução do Tiago.** Qualquer privatização futura exige confirmação explícita e alternativas de hospedagem validadas para todos os sites afetados; Pages de repositórios privados não está incluído no GitHub Free.

## Validação

```bash
cd study-mastery
npm ci
npm run typecheck
npm test
npm run test:pwa
npm run build
npm run e2e
npm run e2e:render
npm run e2e:offline
npm run e2e:homologacao
HOMOLOG_LAYOUT=cloudflare npm run e2e:homologacao
```

Os testes de navegador exigem Chromium instalado; use `CHROMIUM_PATH` quando necessário.
A homologação usa um perfil persistente e MP3 sintético de silêncio temporário. No layout Cloudflare, testa o app na raiz e o fallback HTML para arquivos inexistentes. O player reconhece esse HTML como ausência de música.

Resultados registrados e limitações: [HOMOLOGACAO_V05.md](HOMOLOGACAO_V05.md) e [AUDITORIA_V05.md](AUDITORIA_V05.md). A simulação local não equivale a testar o endereço público ou um celular físico.
Após um deploy, conferir acesso anônimo, sessões nas duas disciplinas, filtros, resultado pelo histórico, rádio local, instalação/offline e atualização de cache. Conferir também os endereços dos outros aplicativos.

## Dados locais e troca de endereço

Os domínios GitHub Pages e Cloudflare não compartilham localStorage, IndexedDB ou a instalação do PWA.
Antes de trocar: terminar a sessão, exportar o histórico em Progresso e guardar o JSON. No novo endereço, importar e conferir tentativas e estatísticas.
A exportação exclui a sessão em andamento e não inclui o MP3 ou preferências da rádio. Escolher o MP3 novamente e instalar o PWA no novo domínio.

## PWA e recuperação

O plugin `tools/pwa.ts` injeta todos os assets finais e um hash em `sw.js`. O hash depende dos arquivos, versão e template. Uma instalação incompleta não ativa a nova versão; o shell e os assets usam o cache da mesma versão.
O `activate` remove somente caches com prefixo `study-mastery-`; no GitHub Pages, requisições fora da pasta do app não são interceptadas. O MP3 usa arquivo completo em cache e respostas Range; veja [STUDY_RADIO.md](STUDY_RADIO.md).

Em falha de publicação, restaurar um deployment funcional anterior no Pages e corrigir o código por PR. Rollback de deploy não reverte um commit Git. O GitHub Pages permanece como endereço alternativo enquanto estiver configurado; para levar dados de volta, exportar no domínio utilizado e importar no destino.

Pendências: revisão humana das 600 questões e da dificuldade, conferência MariaDB × MySQL e testes em aparelho/leitor de tela reais. Todas as conferências editoriais registradas até aqui são assistidas por IA. Nenhuma música acompanha a plataforma.

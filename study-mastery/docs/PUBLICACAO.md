# Publicação do Study Mastery

Destino previsto: <https://tiago-u12.github.io/projeto-faculdade/study-mastery/>.

O app mantém `base: './'` e roteamento por hash (`#/setup`, `#/quiz`, `#/results?id=...`). Tentativas são locais ao aparelho: o link identifica uma tentativa existente naquele navegador, não compartilha seus dados.

## Autorização e workflow

Nenhuma publicação é autorizada apenas por este branch ou pelo merge. Os três passos adicionados a `.github/workflows/deploy.yml` (instalação, build e cópia) exigem literalmente:

```yaml
if: vars.PUBLICAR_STUDY_MASTERY == 'true'
```

Ausente, `false` ou outro valor: o Study Mastery não entra no artefato. Os passos existentes de TrocaTicket, Aysha Park e Dungeon Cooked foram preservados. **Não habilitar a variável nem executar o workflow de deploy sem autorização do Tiago.** Nenhum segredo é necessário no repositório para esse build estático.

Após a autorização, um responsável com acesso às configurações do repositório define a variável de Actions `PUBLICAR_STUDY_MASTERY=true`. O workflow existente dispara em push para `main` ou execução manual; esta tarefa não executou nenhum deles. O build é copiado para `TrocaTicket/dist/study-mastery/` antes de empacotar o artefato Pages.

A condição controla inclusão no próximo artefato: não é uma promessa de manter uma publicação anterior quando a variável for desabilitada. Esta versão não altera os arquivos-fonte dos outros aplicativos.

## Verificação local

```bash
cd study-mastery
npm ci
npm run build
npm run test:pwa
npm run e2e:offline
```

O teste offline copia o build para uma pasta temporária com o layout `TrocaTicket/dist/study-mastery`, serve no subcaminho final e testa instalação, arquivos em cache, ambas as disciplinas, Range e caches vizinhos. Não publica nada. Use `CHROMIUM_PATH` para selecionar o Chromium instalado.

Em 2026-10-23 o workflow foi simulado com o **build real**: passos existentes mais os condicionados, servido em `/projeto-faculdade/`. TrocaTicket, Dungeon Cooked e Study Mastery funcionaram; o service worker ficou restrito ao subcaminho; os arquivos dos outros projetos ficaram idênticos. Aysha Park tem um erro preexistente no Chromium headless, sem relação com este branch. Detalhes em [AUDITORIA_V05.md](AUDITORIA_V05.md).

## PWA e atualização

O plugin `tools/pwa.ts` enumera os arquivos finais do build, incluindo chunks e fontes, e injeta a lista e um hash em `sw.js`. O hash depende dos nomes, conteúdo, versão do app e template do worker. Uma instalação incompleta não ativa a nova versão. O shell e seus assets usam o cache da mesma versão.

O `activate` remove somente caches antigos cujo nome começa por `study-mastery-`. Requisições fora da pasta do app não são interceptadas. MP3 recebe tratamento separado de arquivo completo/Range; veja [STUDY_RADIO.md](STUDY_RADIO.md).

Pendências externas: revisão humana do banco e das dificuldades, autorização do Tiago para a variável e MP3 opcional fornecido por quem tem direito de usá-lo.

## Estado em 2026-10-23

Publicado. A variável `PUBLICAR_STUDY_MASTERY=true` foi criada e o workflow reexecutado ([execução 39965304006](https://github.com/Tiago-U12/projeto-faculdade/actions/runs/39965304006), tentativa 2). Os três passos do Study Mastery rodaram e passaram. Para tirar do ar numa próxima publicação, basta mudar a variável para outro valor (os passos voltam a ser pulados). Homologação: [HOMOLOGACAO_V05.md](HOMOLOGACAO_V05.md).

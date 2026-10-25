# Configuração automatizada dos feedbacks — Codex

## Estado e escopo

Automação preparada para **Tiago-U12/projeto-faculdade**, projeto **Pages study-mastery**, diretório `study-mastery`, build `npm run build`, saída `dist` e produção `main`. Não configura o Worker separado chamado `projeto-faculdade`.

**Ainda não executada na conta Cloudflare.** Este ambiente não tem credencial Cloudflare. O formulário está no PR #9; testes locais e um preview estático publicado não comprovam recebimento real. Não se deve mesclar o PR para tentar ativar o banco.

O script usa a API oficial com Node 22+ e módulos nativos. Não instala Wrangler, não envia código-fonte para outro serviço e não substitui a configuração geral do Pages. Preserva o deploy por GitHub já existente. Não modifica os três outros aplicativos, a visibilidade do repositório ou `.github/workflows/deploy.yml`.

## Preparação única pelo responsável

O **token de API Cloudflare é uma credencial gratuita**, não crédito para IA. Ele autoriza o acesso à conta; é diferente da chave administrativa que abre os relatos. Não envie nenhum deles pelo chat.

1. Confirme no painel que Workers e Turnstile estão no plano **Free**. A automação não altera assinaturas nem cadastra cobrança; a confirmação do plano vem do responsável, não de uma consulta automática de faturamento. Os limites gratuitos continuam valendo.
2. Em [Cloudflare → API Tokens](https://dash.cloudflare.com/profile/api-tokens), crie um token personalizado restrito à conta do projeto, com **Account / Cloudflare Pages / Edit**, **Account / D1 / Edit** e **Account / Turnstile / Edit**. Não use Global API Key. Guarde o token e escolha uma validade curta suficiente para configurar e testar.
3. Em [GitHub → Actions secrets](https://github.com/Tiago-U12/projeto-faculdade/settings/secrets/actions), cadastre:
   - `CLOUDFLARE_API_TOKEN`: o token acima.
   - `FEEDBACK_ADMIN_TOKEN_PREVIEW`: uma senha aleatória de pelo menos 32 caracteres ASCII sem espaços, gerada em gerenciador de senhas. Guarde-a: ela abre a caixa administrativa do preview. Alternativa no computador: `node study-mastery/tools/feedback-key.mjs`; guarde a **chave**, não o hash, neste segredo.
4. Em [GitHub → Actions variables](https://github.com/Tiago-U12/projeto-faculdade/settings/variables/actions), cadastre:
   - `CLOUDFLARE_ACCOUNT_ID`: ID de 32 caracteres da conta, disponível no painel Cloudflare; não é token nem e-mail.
   - `CLOUDFLARE_FREE_CONFIRMED`: `true`, somente após conferir os planos.
   - `STUDY_FEEDBACK_SETUP_PREVIEW`: `true`, para autorizar a preparação do preview neste branch.

Os segredos são disponibilizados somente ao passo de configuração. Os testes não recebem credenciais. Não há arquivos de chaves, artefatos com segredos ou impressão dos valores nos logs.

## Primeiro preview, ainda antes do merge

O workflow é `.github/workflows/study-mastery-feedback.yml`, **Preparar feedbacks do Study Mastery**. Um push dos arquivos da automação no branch `feat/feedback-inbox` executa os testes. A configuração fica **pulada por padrão**, até a variável de autorização acima ser definida.

Depois de cadastrar os segredos/variáveis, use **Re-run all jobs** na execução desse workflow associada ao commit atual, ou peça ao agente para reexecutá-la. A reexecução deve usar esse mesmo commit. Se a plataforma não reavaliar a variável de um job pulado, um novo commit revisado em um dos arquivos monitorados dispara outra execução; não altere o aplicativo só para provocar um deploy.

O script busca um preview concluído do SHA exato no Pages antes de fazer alterações. Se o build ainda estiver em andamento, ele para com uma mensagem para aguardar e reexecutar. Isso também evita refazer um deploy antigo.

O botão **Run workflow** de `workflow_dispatch` só fica disponível depois que o arquivo do workflow existe na branch padrão. Essa limitação do GitHub é o motivo do gatilho optativo de `push` neste branch. Não é preciso mesclar todo o formulário para fazer o primeiro teste. O gatilho de push nunca configura produção.

Quando autorizado, a automação:

1. Confere projeto, repositório, branch de produção e configuração de build por leitura da API.
2. Cria/reutiliza `study-mastery-feedback-preview` no D1 e executa o SQL real de `migrations-feedback/0001_feedback.sql`.
3. Cria/reutiliza um widget Managed real `study-mastery-feedback-preview`, autorizado para `study-mastery.pages.dev` e seus subdomínios. Não usa as chaves de demonstração do Turnstile.
4. Configura **somente preview**: binding `FEEDBACK_DB`, secrets `FEEDBACK_ADMIN_TOKEN_SHA256` e `TURNSTILE_SECRET_KEY`, variável pública `TURNSTILE_SITE_KEY`. Acrescenta marcadores de propriedade/banco para verificar reexecuções e o deploy testado. A chave administrativa original não é enviada ao Pages.
5. Solicita retry do preview desse commit pela API. Não publica produção nem faz merge. O log fornece a URL; ainda é necessário aguardar o build terminar.

Os previews de todos os branches desse projeto compartilham a configuração de ambiente preview do Pages. Portanto o banco de teste só deve conter relatos fictícios, sem dados pessoais. O banco e a chave de produção serão separados.

Depois da preparação, desative `STUDY_FEEDBACK_SETUP_PREVIEW` (remova ou defina `false`) para evitar reconfigurações/rebuilds desnecessários em futuros pushes.

## Teste real e preparação de produção

Abra o novo preview e confirme `GET /api/feedback?action=config` com JSON `enabled: true`; `GET ?action=list` sem chave deve responder 401. No formulário, envie um relato fictício com print, anote o protocolo e abra `#/feedback-admin` usando a chave de preview. Confira o texto e a imagem e marque **Em análise**. Teste também rascunho offline/reabertura. Preserve esse relato até terminar a preparação de produção; ele é a evidência consultada pelo script.

O teste humano do fluxo não é substituído pela presença de uma linha no D1. A automação confere o protocolo, versão do app, existência de imagem, status, data posterior ao deploy, SHA e ambiente. Não consegue comprovar sozinha se uma pessoa inspecionou visualmente o print, nem auditar alterações manuais feitas diretamente no banco.

Para preparar produção, cadastre uma **nova** chave em `FEEDBACK_ADMIN_TOKEN_PRODUCTION`; não reutilize a de preview. Use o workflow manual no branch/commit já testado, quando ele estiver disponível na branch padrão, ou o comando local abaixo. É possível incorporar somente os arquivos de automação à main em uma revisão separada para disponibilizar o botão, sem liberar o formulário; isso não foi feito nesta tarefa.

Selecione `production`, marque aplicar e revisão, informe o UUID do deploy e o protocolo, e escreva `PUBLICAR_FEEDBACK`. O commit selecionado precisa ser exatamente o do preview testado. A automação cria `study-mastery-feedback-production`, um widget separado e configura apenas produção. **Mesmo essa etapa não publica o site.** O merge/redeploy final pela integração GitHub exige a revisão do PR e autorização correspondente, depois do teste real.

Após o deploy final, repetir envio, imagem, administração, status, exclusão, offline/reabertura no domínio oficial. Só então registrar recebimento ativo. Apague os relatos fictícios. O link público continua `https://study-mastery.pages.dev/`.

## Execução local alternativa

Em um terminal pessoal, dentro de `study-mastery/`, com Node 22+:

```bash
export CLOUDFLARE_ACCOUNT_ID='ID_DA_CONTA'
export FEEDBACK_COMMIT_SHA="$(git rev-parse HEAD)"
export FEEDBACK_TARGET=preview
read -rs -p 'Token Cloudflare: ' CLOUDFLARE_API_TOKEN; echo
export CLOUDFLARE_API_TOKEN
read -rs -p 'Chave administrativa de preview: ' FEEDBACK_ADMIN_TOKEN; echo
export FEEDBACK_ADMIN_TOKEN
npm run feedback:setup
# Depois de conferir os planos Free e o plano exibido:
export FEEDBACK_FREE_CONFIRMED=true
npm run feedback:setup -- --apply --retry-preview
unset CLOUDFLARE_API_TOKEN FEEDBACK_ADMIN_TOKEN
```

Sem `--apply`, o script só faz GET. Para produção: `FEEDBACK_TARGET=production`, nova `FEEDBACK_ADMIN_TOKEN`, `FEEDBACK_PREVIEW_DEPLOYMENT_ID`, `FEEDBACK_PREVIEW_RECEIPT`, `FEEDBACK_PREVIEW_REVIEWED=true`, `FEEDBACK_PRODUCTION_CONFIRM=PUBLICAR_FEEDBACK`; use `--apply` **sem** `--retry-preview`. O SHA continua sendo o do commit validado no preview. Credenciais também podem ser configuradas no ambiente seguro de execução do agente, sem passar pelo chat.

## Interrupção, repetição e recuperação

- Banco/widget já existentes com os nomes esperados são reutilizados; o schema é conferido e não há DROP, exclusão de relatos ou rotação automática de chaves.
- Configuração manual anterior, chave diferente, schema incompatível, Wrangler existente ou banco compartilhado fazem o script parar. Não remova os marcadores para forçar passagem: revise a configuração.
- O PATCH envia só os campos do ambiente selecionado e preserva outros bindings. Segredos alheios mascarados não são reenviados. Há releituras antes/depois, mas a API não oferece uma transação abrangendo D1, Turnstile e Pages. Evite edições simultâneas no painel.
- Uma falha pode deixar banco/widget criados sem binding/deploy. Não são apagados automaticamente. Reexecutar com a mesma chave retoma a configuração; confirme os nomes antes de qualquer remoção manual.
- Se precisar desativar recebimento, remova a configuração de feedback do ambiente afetado e refaça seu deploy, ou restaure o último deploy conhecido pelo painel. O app continua oferecendo rascunho quando falta configuração. Preserve o D1 para não perder relatos; um rollback do site não desfaz dados do banco.
- Após validar, revogue o token de configuração e remova-o dos secrets se não precisar dele. Atualizações comuns do aplicativo continuam usando a integração GitHub do Pages, sem esse token. Guarde a chave administrativa em gerenciador de senhas.

## Validação e limites desta entrega

Em 25/10/2026, `npm run test:automation`: **38 testes passaram**, com API simulada e SQLite real em memória. Cobrem plano somente leitura, configuração isolada, SQL real, reutilização sem perder relatos, interrupção/repetição, mudanças concorrentes, configuração alheia, segredo ausente/diferente, retry limitado ao preview e bloqueios de produção. `node --check tools/cloudflare-feedback.mjs`, `git diff --check` e `npm run build` (TypeScript + Vite) passaram. YAML, gatilho restrito, permissões e isolamento dos segredos foram conferidos localmente. Node local: 24.19.0; workflow configurado para Node 22. A execução real no Actions/Node 22 ainda precisa ser observada.

Contratos conferidos nas fontes oficiais: [Pages API](https://github.com/cloudflare/cloudflare-typescript/blob/main/src/resources/pages/projects/projects.ts), [retry de deployment](https://github.com/cloudflare/cloudflare-typescript/blob/main/src/resources/pages/projects/deployments/deployments.ts), [Turnstile](https://github.com/cloudflare/cloudflare-typescript/blob/main/src/resources/turnstile/widgets.ts) e [PATCH de secrets no Wrangler](https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/pages/secret/index.ts). A resposta de deployment não documenta bindings D1; a associação é conferida por marcador nas variáveis do deploy, binding atual do projeto e consulta ao protocolo no banco de preview.

O kit enviado foi usado como referência, não executado: seus nomes `DB`/`ADMIN_KEY`/`TURNSTILE_SECRET`, SQL de exemplo, segredos locais em texto e configuração genérica não correspondem ao contrato do app. Nenhuma evidência local é apresentada como teste do captcha ou da conta real.

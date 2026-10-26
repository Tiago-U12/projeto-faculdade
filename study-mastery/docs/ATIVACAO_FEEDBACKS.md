# Ativação dos feedbacks — Codex

Registro de 26/10/2026 (horário de Brasília).

## Evidência do preview

O responsável enviou um relato com print pelo preview `https://b1fe8d1a.study-mastery.pages.dev`, conferiu-o na administração e marcou **Em análise**. O protocolo e o commit testado estão em `feedback-preview-proof.json`; esse arquivo não contém texto, imagem ou credencial.

A [checagem real no Actions](https://github.com/Tiago-U12/projeto-faculdade/actions/runs/40320431756) confirmou commit/ambiente, banco separado, data do relato posterior ao deploy, versão do app, print e status. O diff conferiu que o aplicativo continuava igual ao checkpoint testado, excluindo ferramentas, testes e documentação. Os 42 testes da automação passaram. Isso valida o fluxo do serviço; não constitui revisão humana das questões do banco.

## Preparação de produção

Na [execução 40321070122](https://github.com/Tiago-U12/projeto-faculdade/actions/runs/40321070122), a prova foi conferida novamente e o job `prepare-production` concluiu: D1 `study-mastery-feedback-production`, schema real, widget Managed separado, binding `FEEDBACK_DB`, site key e secrets de produção confirmados pela API. A chave administrativa de produção é diferente da usada no preview. Nenhuma credencial foi gravada no repositório ou nos logs.

O workflow `.github/workflows/study-mastery-feedback-proof.yml` primeiro valida a prova e a igualdade do aplicativo, depois prepara a configuração de produção. Ele não faz merge nem publica o aplicativo. Os marcadores e as releituras continuam protegendo configurações alheias. Projeto Pages existente e deploy por integração GitHub foram preservados.

## Verificação após publicar

`.github/workflows/study-mastery-feedback-smoke.yml` aguarda o deploy do SHA exato da main. Então confere acesso público, API habilitada, recusa administrativa sem chave e com chave incorreta, aceitação da chave correta e `no-store`. Não registra conteúdo dos relatos nem cria relatos de produção. O resultado real dessa execução deve ser consultado no Actions; a existência do workflow não é resultado de teste.

O envio com captcha/print foi exercitado no preview pelo responsável. O smoke público verifica implantação e integração do backend, mas não repete o captcha no domínio de produção ou um teste em aparelho físico.

Após concluir, desative a variável `STUDY_FEEDBACK_SETUP_PREVIEW` para evitar configurações/rebuilds optativos desnecessários. O token de configuração pode ser revogado e removido dos secrets depois das verificações; enquanto o smoke depender dele, essa remoção exigirá ajustar a verificação ou desabilitar esse workflow. Atualizações do site pela integração GitHub não dependem desse token. Guarde a chave administrativa de produção; a chave de preview não abre a caixa principal.

Se houver falha, o formulário preserva rascunhos e só informa recebimento após protocolo confirmado. Para recuperação: conferir o deploy no Pages, restaurar o último deploy estável se necessário e preservar o D1 para não perder relatos. Não alterar os bancos ou widgets de outros projetos. Detalhes: `FEEDBACKS.md` e `AUTOMACAO_FEEDBACKS.md`.

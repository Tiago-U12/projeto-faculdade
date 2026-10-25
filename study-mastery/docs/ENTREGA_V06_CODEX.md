# Entrega v0.6 — revisão e publicação do modo local

Responsável por esta continuação: **Codex**, em 24/10/2026 (horário de São Paulo). Base: branch `ccr-71aa1f28-s1s3f6`, commit `817f6d6`, preservando os oito commits anteriores do Claude. Tiago autorizou finalizar e publicar. Repositório permanece público.

## Escopo liberado

Endereço principal: <https://study-mastery.pages.dev/>. O build opera **sem conta e sem IA remota**: banco existente, disciplinas pessoais, PDF/texto processados no navegador, guias com trechos de origem, questões criadas manualmente, agenda, planejamento, progresso, rádio e offline. A publicação ocorre pela integração existente com `main`; os checks desse commit são a evidência de deploy, não este documento isoladamente.

Contas e sincronização continuam indisponíveis. A consulta ao conector Supabase nesta rodada retornou lista vazia de projetos. Não foi criado projeto, configurado SMTP, aplicado schema hospedado ou ativada chave de IA. A implementação dessas integrações permanece no código, com telas que explicam sua indisponibilidade. Os testes de funções usam serviços simulados, e os de RLS usam Postgres local; não são homologação de Supabase hospedado.

## Ajustes desta revisão

- Frase inicial curta em “Como verificamos as questões”: “Conferimos respostas com ferramentas de cálculo, testes de código e consulta às fontes, conforme o tipo de questão.”
- Aviso visível fora dos detalhes: “A revisão humana ainda está pendente. As verificações automáticas não eliminam todos os erros.” Pendência parcial é calculada quando houver revisão humana futura.
- Detalhes nativos, fechados inicialmente, agrupados em Matemática, Programação e Consulta às fontes. Nomes, métodos e quantidades vêm dos registros; termos têm explicações breves.
- Home e Acervo distinguem disponibilidade, revisão assistida por IA e humana com contagens reais. Fontes e questões existentes preservadas.
- Questões pessoais renderizam enunciado e explicação em contêineres de bloco, permitindo exemplos de código sem `<pre>` dentro de `<p>`.
- Testes novos de apresentação da qualidade e de código em questão pessoal; homologação inclui teclado e detalhes abertos em 320/390 px.
- Documentados os pré-requisitos e a geração local dos fixtures próprios de teste; corrigida promessa não demonstrada de capacidade gratuita para uma turma.

O banco publicado continua com 600 questões, 300 por disciplina, 100 por dificuldade em cada disciplina. Todas as revisões registradas são `ai-assisted`, nenhuma humana. Os 21 registros `source-review` são conferências declaradas, sem execução; não se afirma validação semântica automática. Os JSONs de questões/fontes não foram alterados em relação à main-base.

## Evidências novas

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | passou |
| `npm test` com Postgres e Chromium disponíveis | 817 testes, 28 arquivos, nenhum pulado, nenhuma falha |
| Isolamento/RLS/banco, incluído no total | 26/26 em Postgres 17.11 temporário, duas contas e serviços simulados |
| `npm run test:pwa` | 7/7 |
| `npm run build` | passou, sem configuração de contas |
| `npm run e2e:v06` | 293 verificações, zero falhas; 390/320/1280 px, console e axe-core |
| `npm run e2e` | passou |
| `HOMOLOG_LAYOUT=cloudflare npm run e2e:homologacao` | 145/145 automatizadas; 6 itens manuais/informativos |
| `npm run e2e:render` | 600 questões × 390/320 px, zero problemas |
| `npm run e2e:offline` | passou: duas disciplinas, Range e caches de outros apps |
| `npm run e2e:redirects` | passou: reload, perfil reaberto e recuperação do worker antigo sem perder sessão |
| `npm run e2e:a52` | todos os cenários passaram após ajustar a classificação da sondagem opcional do MP3 |

Ambiente: Node 24.19.0, Chromium 154, Python com SymPy/mpmath e dependências de PDF, sandbox dos starters instalado. Postgres usado apenas em diretório temporário; nenhuma alteração em banco externo. A configuração de deploy existente continua com Node 22. O check Cloudflare precisa confirmar o build nesse ambiente de produção.

A primeira execução local encontrou fixtures não gerados e sandbox/Postgres ausentes. Foram preparados a partir do gerador e das dependências existentes, e a suíte foi reexecutada integralmente. Não foram reduzidos testes para obter aprovação.

No diagnóstico A52, foi reproduzido um falso positivo de console: a sondagem de `audio/study-radio.mp3` retornava 503 offline, pois não há faixa incluída. O teste agora exclui somente 404/503 dessa URL opcional, como já fazia a homologação principal, mantendo falhas de outros recursos. Nenhuma música foi adicionada. A inspeção de A52 é emulação, não teste em celular físico.

## Acesso público e atualização

O domínio principal respondeu HTTP 200 nesta rodada, e um navegador com perfil novo abriu a versão anterior (0.5.2) antes do deploy. Uma sessão foi criada pela interface e guardada no perfil de teste para comparar após a atualização. O erro de certificado encontrado inicialmente era da confiança do proxy no navegador deste ambiente; foi resolvido configurando sua CA no perfil, mantendo a verificação TLS.

O relato anterior de NXDOMAIN não foi reproduzido e sua causa continua indeterminada. Não foram alterados DNS, domínio ou infraestrutura por tentativa e erro. O Worker separado `projeto-faculdade` tem checks próprios; falha nele não comprova falha no Cloudflare Pages `study-mastery`.

Após a publicação, conferir o SHA/check e o rodapé no endereço principal, preservação do progresso existente, sessão completa nas duas disciplinas, Acervo, funções pessoais locais e recarga offline. Os resultados dessa verificação pública são entregues junto com o link/PR; não inferir sucesso apenas de um build local.

## Limites e próximos passos

- Revisão humana do conteúdo e da dificuldade continua pendente. Testes de software não certificam qualidade pedagógica.
- Antes de habilitar contas: projeto gratuito dentro das quotas, migrações, funções, SMTP e teste de integração hospedado com duas contas. Não é necessário fazê-lo para estudar no modo local.
- IA paga não autorizada/ativada. A cota diária atual não é um teto financeiro atômico sob concorrência; corrigir reservas de consumo e limites globais antes de qualquer ativação paga.
- Nunca inserir segredos em `VITE_*`: a recusa em runtime não impede que o Vite os inclua no bundle.
- Usuários devem exportar backups do progresso; dados pessoais locais não são sincronizados entre aparelhos/domínios.
- Roteiro de colegas: `ROTEIRO_TESTES_COLEGAS.md`. Recolher sessões completas, dúvidas por questão e compreensão dos filtros/status; aparência não comprova aprendizagem.
- TrocaTicket, Aysha Park e Dungeon Cooked não receberam alterações de código. O workflow conserva seus passos; a mudança nele só fornece variáveis públicas opcionais ao build do Study Mastery.

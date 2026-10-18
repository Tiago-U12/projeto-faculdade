# TrocaTicket — demonstração acadêmica

[Abrir o site](https://tiago-u12.github.io/projeto-faculdade/)

Frontend em React e Vite para explorar os perfis de participante, organizador, fornecedor e administrador. A página inicial apresenta seis atalhos de acesso fictícios e explica como experimentar o sistema.

Esta publicação usa dados fictícios salvos somente no navegador de cada visitante. Os perfis compartilham esse armazenamento local; não são contas autenticadas independentes. Nenhuma compra, pagamento, ingresso ou transferência real é realizada. Não há conexão com API nem MySQL neste site público. Use somente informações fictícias. Limpar os dados do site restaura os exemplos.

A versão completa com API e MySQL permanece separada no projeto local. Credenciais, configuração da conexão e arquivos do banco não fazem parte desta publicação.

## Executar esta demonstração no computador

Requer Node.js 22.12 ou mais recente.

1. Abra a pasta TrocaTicket no terminal.
2. Execute npm ci.
3. Execute npm run dev e abra o endereço exibido, com /projeto-faculdade/.

Use npm test para verificar as regras e npm run build para gerar o site em dist. A publicação usa o fluxo existente em .github/workflows/deploy.yml. As rotas usam # para permitir acesso direto e recarregamento no GitHub Pages.

Há ajustes de fonte, contraste, espaçamento, aparência e idioma no cabeçalho. O VLibras é opcional e depende do serviço externo após sua ativação.

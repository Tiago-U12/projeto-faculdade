// Exercícios originais do SQL Lab (bancos fictícios: loja, biblioteca, universidade). São dados: enunciado, schema,
// bancos de teste e solução de referência. A solução fica no cliente e NÃO é secreta — serve para gerar o resultado
// esperado em cada banco de teste; a interface não a mostra durante as tentativas.
//
// Regras de escrita (para valerem igual no SQLite e no MySQL 8):
//  - nada de funções de data, concatenação com || , divisão inteira ou comparação que dependa de maiúsculas;
//  - datas como texto 'AAAA-MM-DD' (comparáveis como texto e como DATE);
//  - FOREIGN KEY em cláusula separada (no MySQL 8 o REFERENCES na própria coluna é aceito e ignorado).
import type { SqlLabExercise } from './types';

const LOJA = `CREATE TABLE clientes (
  id INTEGER PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  cidade VARCHAR(60)
);
CREATE TABLE produtos (
  id INTEGER PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  categoria VARCHAR(40) NOT NULL,
  preco DECIMAL(10,2) NOT NULL
);
CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY,
  cliente_id INTEGER NOT NULL,
  data DATE NOT NULL,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);
CREATE TABLE itens_pedido (
  pedido_id INTEGER NOT NULL,
  produto_id INTEGER NOT NULL,
  quantidade INTEGER NOT NULL,
  preco_unit DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (pedido_id, produto_id),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  FOREIGN KEY (produto_id) REFERENCES produtos(id)
);`;

const BIBLIOTECA = `CREATE TABLE livros (
  id INTEGER PRIMARY KEY,
  titulo VARCHAR(120) NOT NULL,
  autor VARCHAR(80) NOT NULL,
  ano INTEGER,
  paginas INTEGER
);
CREATE TABLE emprestimos (
  id INTEGER PRIMARY KEY,
  livro_id INTEGER NOT NULL,
  leitor VARCHAR(80) NOT NULL,
  data_saida DATE NOT NULL,
  data_devolucao DATE,
  FOREIGN KEY (livro_id) REFERENCES livros(id)
);`;

const UNIVERSIDADE = `CREATE TABLE alunos (
  id INTEGER PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  curso VARCHAR(60) NOT NULL
);
CREATE TABLE disciplinas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome VARCHAR(80) NOT NULL,
  creditos INTEGER NOT NULL
);
CREATE TABLE matriculas (
  aluno_id INTEGER NOT NULL,
  disciplina_id INTEGER NOT NULL,
  nota DECIMAL(4,2),
  PRIMARY KEY (aluno_id, disciplina_id),
  FOREIGN KEY (aluno_id) REFERENCES alunos(id),
  FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id)
);`;

// ——— dados reutilizados ———
const PRODUTOS_VITRINE = `INSERT INTO produtos (id, nome, categoria, preco) VALUES
  (1, 'Caderno 96 folhas', 'Papelaria', 18.90),
  (2, 'Mochila escolar', 'Acessórios', 129.90),
  (3, 'Marca-texto', 'Papelaria', 6.50),
  (4, 'Fone de ouvido', 'Eletrônicos', 49.90),
  (5, 'Garrafa térmica', 'Acessórios', 50.00),
  (6, 'Caneta gel azul', 'Papelaria', 6.50),
  (7, 'Mouse sem fio', 'Eletrônicos', 79.00);`;

const CLIENTES_PEDIDOS = `INSERT INTO clientes (id, nome, cidade) VALUES
  (1, 'Ana Souza', 'Recife'),
  (2, 'Bruno Lima', NULL),
  (3, 'Carla Dias', 'Natal'),
  (4, 'Diego Rocha', 'Recife'),
  (5, 'Elisa Prado', NULL);
${PRODUTOS_VITRINE}
INSERT INTO pedidos (id, cliente_id, data) VALUES
  (101, 1, '2026-08-03'),
  (102, 3, '2026-08-05'),
  (103, 1, '2026-08-20'),
  (104, 4, '2026-09-02'),
  (105, 3, '2026-09-15');
INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unit) VALUES
  (101, 2, 1, 129.90),
  (101, 3, 4, 6.50),
  (102, 1, 3, 18.90),
  (103, 7, 1, 79.00),
  (104, 4, 1, 49.90),
  (104, 6, 2, 6.50),
  (105, 5, 1, 50.00),
  (105, 1, 2, 18.90);`;

const ACERVO = `INSERT INTO livros (id, titulo, autor, ano, paginas) VALUES
  (1, 'Estruturas de Dados na Prática', 'R. Moreira', 2019, 412),
  (2, 'Introdução a Bancos de Dados', 'L. Fonseca', 2021, 288),
  (3, 'Algoritmos em Pseudocódigo', 'T. Campos', 2015, 196),
  (4, 'Redes sem Mistério', 'P. Andrade', 2020, 350),
  (5, 'Engenharia de Requisitos', 'M. Teles', 2018, 240),
  (6, 'Lógica para Computação', 'R. Moreira', 2012, 180);`;

const TURMA = `INSERT INTO alunos (id, nome, curso) VALUES
  (1, 'Ana Souza', 'Sistemas de Informação'),
  (2, 'Bruno Lima', 'Ciência da Computação'),
  (3, 'Carla Dias', 'Sistemas de Informação'),
  (4, 'Diego Rocha', 'Engenharia de Software'),
  (5, 'Elisa Prado', 'Sistemas de Informação');`;

const base = { kind: 'sql' as const, dialect: 'sqlite' as const, disciplineId: 'fullstack', topicIds: ['mysql'], version: 1 };

export const SQL_EXERCISES: SqlLabExercise[] = [
  {
    ...base,
    id: 'sql-produtos-ate-50',
    title: 'Vitrine de produtos até R$ 50',
    skills: ['sql.select'],
    difficulty: 'facil',
    scope: 'aula',
    estimatedMinutes: 5,
    database: 'Loja',
    prompt:
      'A loja quer uma vitrine de produtos baratos. Liste o **nome** e o **preco** dos produtos que custam **até R$ 50,00 (inclusive)**, do mais barato para o mais caro. Em caso de empate no preço, ordene pelo nome.',
    objectives: ['Escolher colunas no SELECT', 'Filtrar com WHERE e um operador de comparação', 'Ordenar com ORDER BY e desempate'],
    hints: ['Comece com `SELECT nome, preco FROM produtos`.', '"Até 50, inclusive" pede o operador `<=`.', '`ORDER BY` aceita mais de uma coluna: a segunda só desempata a primeira.'],
    explanation:
      '`WHERE preco <= 50` mantém o limite (50,00 entra; 50,01 não). `ORDER BY preco, nome` ordena pelo preço e usa o nome só para desempatar. Sem ORDER BY nenhum banco garante a ordem das linhas.',
    relations: { keywords: ['select', 'where', 'order by'] },
    schemaSql: LOJA,
    fixtures: [
      { id: 'enunciado', label: 'Dados do enunciado', seedSql: PRODUTOS_VITRINE },
      {
        id: 'limite',
        label: 'Preço no limite e centavos',
        seedSql: `INSERT INTO produtos (id, nome, categoria, preco) VALUES (1, 'Agenda 2027', 'Papelaria', 50.01), (2, 'Estojo', 'Papelaria', 50.00), (3, 'Régua 30 cm', 'Papelaria', 3.75);`,
        hint: 'Confira o produto de exatamente R$ 50,00 (entra) e o de R$ 50,01 (não entra).',
      },
      {
        id: 'vazio',
        label: 'Nenhum produto barato',
        seedSql: `INSERT INTO produtos (id, nome, categoria, preco) VALUES (1, 'Monitor 24 polegadas', 'Eletrônicos', 899.00), (2, 'Cadeira de escritório', 'Móveis', 450.00);`,
        hint: 'Quando nenhum produto atende ao filtro, a resposta certa é um resultado vazio.',
      },
    ],
    starterSql: 'SELECT *\nFROM produtos;\n',
    solutionSql: 'SELECT nome, preco\nFROM produtos\nWHERE preco <= 50\nORDER BY preco, nome;',
    grading: { mode: 'result', orderMatters: true, orderKeys: [{ column: 'preco' }, { column: 'nome' }], columnNamesMatter: false, tolerance: 0.001 },
    portability: 'sql-comum',
  },
  {
    ...base,
    id: 'sql-tres-mais-caros',
    title: 'Os três produtos mais caros',
    skills: ['sql.select'],
    difficulty: 'facil',
    scope: 'aula',
    estimatedMinutes: 5,
    database: 'Loja',
    prompt:
      'Liste o **nome** e o **preco** dos **3 produtos mais caros**, do mais caro para o mais barato. Se houver empate no preço, a ordem alfabética do nome decide (inclusive quem entra no top 3).',
    objectives: ['Ordenar de forma decrescente (DESC)', 'Limitar a quantidade de linhas com LIMIT', 'Entender como o desempate afeta um ranking'],
    hints: ['Ordene do maior para o menor preço com `DESC`.', 'Para pegar só as primeiras linhas use `LIMIT`.', 'O desempate vem depois: `ORDER BY preco DESC, nome`.'],
    explanation:
      '`ORDER BY preco DESC, nome LIMIT 3` ordena do mais caro ao mais barato, desempata pelo nome e corta nas três primeiras linhas. Com menos de três produtos, LIMIT devolve o que houver. No MySQL a sintaxe é a mesma.',
    relations: { keywords: ['order by', 'limit', 'ranking'] },
    schemaSql: LOJA,
    fixtures: [
      { id: 'enunciado', label: 'Dados do enunciado', seedSql: PRODUTOS_VITRINE },
      {
        id: 'empate',
        label: 'Empate na fronteira do top 3',
        seedSql: `INSERT INTO produtos (id, nome, categoria, preco) VALUES (1, 'Teclado', 'Eletrônicos', 80.00), (2, 'Webcam', 'Eletrônicos', 120.00), (3, 'Hub USB', 'Eletrônicos', 80.00), (4, 'Suporte de notebook', 'Acessórios', 95.50), (5, 'Cabo HDMI', 'Eletrônicos', 25.00);`,
        hint: 'Há dois produtos com o mesmo preço disputando o 3º lugar: o desempate pelo nome decide quem entra.',
      },
      {
        id: 'poucos',
        label: 'Menos de três produtos',
        seedSql: `INSERT INTO produtos (id, nome, categoria, preco) VALUES (1, 'Lapiseira 0,7', 'Papelaria', 12.40), (2, 'Borracha', 'Papelaria', 2.10);`,
        hint: 'Com só dois produtos, o resultado tem duas linhas.',
      },
    ],
    starterSql: 'SELECT *\nFROM produtos;\n',
    solutionSql: 'SELECT nome, preco\nFROM produtos\nORDER BY preco DESC, nome\nLIMIT 3;',
    grading: { mode: 'result', orderMatters: true, orderKeys: [{ column: 'preco', desc: true }, { column: 'nome' }], columnNamesMatter: false, tolerance: 0.001 },
    portability: 'sql-comum',
  },
  {
    ...base,
    id: 'sql-clientes-sem-cidade',
    title: 'Clientes sem cidade cadastrada',
    skills: ['sql.select'],
    difficulty: 'facil',
    scope: 'aula',
    estimatedMinutes: 5,
    database: 'Loja',
    prompt: 'O cadastro está incompleto. Liste o **id** e o **nome** dos clientes **sem cidade cadastrada** (cidade nula), em ordem de id.',
    objectives: ['Testar ausência de valor com IS NULL', 'Diferenciar NULL de texto vazio'],
    hints: ['Cidade "sem cadastro" é NULL no banco.', 'Comparar com `= NULL` nunca é verdadeiro — nem quando o valor é nulo.', 'Use `WHERE cidade IS NULL`.'],
    explanation:
      'NULL representa ausência de valor; qualquer comparação comum com ele (=, <>, <) dá "desconhecido", e o WHERE descarta a linha. Por isso existe `IS NULL`. Texto vazio (\'\') é um valor e não é NULL.',
    relations: { keywords: ['null', 'is null', 'where'] },
    schemaSql: LOJA,
    fixtures: [
      { id: 'enunciado', label: 'Dados do enunciado', seedSql: CLIENTES_PEDIDOS },
      {
        id: 'vazio-nao-e-nulo',
        label: 'Texto vazio não é nulo',
        seedSql: `INSERT INTO clientes (id, nome, cidade) VALUES (1, 'Fábio Nunes', ''), (2, 'Gabi Torres', NULL), (3, 'Hugo Melo', 'Olinda');`,
        hint: "Cidade em branco ('') é um texto vazio, não NULL: esse cliente tem cidade (mesmo vazia).",
      },
      { id: 'todos-com-cidade', label: 'Todos com cidade', seedSql: `INSERT INTO clientes (id, nome, cidade) VALUES (1, 'Iara Lopes', 'Caruaru'), (2, 'João Pires', 'Recife');`, hint: 'Sem cliente com cidade nula, o resultado é vazio.' },
    ],
    starterSql: 'SELECT *\nFROM clientes;\n',
    solutionSql: 'SELECT id, nome\nFROM clientes\nWHERE cidade IS NULL\nORDER BY id;',
    grading: { mode: 'result', orderMatters: true, orderKeys: [{ column: 'id' }], columnNamesMatter: false, tolerance: 0 },
    portability: 'sql-comum',
  },
  {
    ...base,
    id: 'sql-pedidos-com-cliente',
    title: 'Pedidos com o nome do cliente',
    skills: ['sql.join'],
    difficulty: 'medio',
    scope: 'aula',
    estimatedMinutes: 8,
    database: 'Loja',
    prompt: 'Para cada pedido, mostre o **id do pedido**, o **nome do cliente** que fez o pedido e a **data**, em ordem de id do pedido.',
    objectives: ['Relacionar duas tabelas com JOIN … ON', 'Usar a chave estrangeira certa na condição', 'Qualificar colunas com o nome (ou alias) da tabela'],
    hints: [
      'O nome do cliente está em `clientes`; o pedido guarda só `cliente_id`.',
      'A condição do JOIN liga `pedidos.cliente_id` a `clientes.id` (não `pedidos.id`).',
      'As duas tabelas têm coluna `id`: escreva `p.id` ou `pedidos.id` para dizer qual.',
    ],
    explanation:
      '`FROM pedidos p JOIN clientes c ON c.id = p.cliente_id` junta cada pedido ao seu cliente pela chave estrangeira. Um cliente com dois pedidos aparece duas vezes — são dois pedidos. Clientes sem pedido não aparecem no INNER JOIN.',
    relations: { keywords: ['join', 'inner join', 'chave estrangeira'] },
    schemaSql: LOJA,
    fixtures: [
      { id: 'enunciado', label: 'Dados do enunciado', seedSql: CLIENTES_PEDIDOS },
      {
        id: 'homonimos',
        label: 'Clientes com o mesmo nome',
        seedSql: `INSERT INTO clientes (id, nome, cidade) VALUES (1, 'Ana Souza', 'Recife'), (2, 'Ana Souza', 'Natal'), (3, 'Caio Brito', NULL);
INSERT INTO pedidos (id, cliente_id, data) VALUES (7, 2, '2026-10-01'), (8, 1, '2026-10-02'), (9, 2, '2026-10-03');`,
        hint: 'Dois clientes diferentes têm o mesmo nome; cada pedido tem que aparecer uma vez, com o seu cliente.',
      },
      {
        id: 'sem-pedido',
        label: 'Cliente sem pedido',
        seedSql: `INSERT INTO clientes (id, nome, cidade) VALUES (1, 'Lia Ramos', 'Natal'), (2, 'Davi Costa', 'Recife');
INSERT INTO pedidos (id, cliente_id, data) VALUES (40, 2, '2026-07-11');`,
        hint: 'A pergunta é sobre pedidos: um cliente que não comprou não aparece.',
      },
    ],
    starterSql: 'SELECT *\nFROM pedidos;\n',
    solutionSql: 'SELECT p.id, c.nome, p.data\nFROM pedidos p\nJOIN clientes c ON c.id = p.cliente_id\nORDER BY p.id;',
    grading: { mode: 'result', orderMatters: true, orderKeys: [{ column: 'id' }], columnNamesMatter: false, tolerance: 0 },
    portability: 'sql-comum',
  },
  {
    ...base,
    id: 'sql-clientes-sem-pedido',
    title: 'Clientes que nunca compraram',
    skills: ['sql.join', 'sql.subquery'],
    difficulty: 'medio',
    scope: 'aprofundamento',
    estimatedMinutes: 10,
    database: 'Loja',
    prompt: 'O marketing quer reativar quem nunca comprou. Liste o **nome** dos clientes que **nunca fizeram um pedido**, em ordem alfabética.',
    objectives: ['Usar LEFT JOIN para manter linhas sem correspondência', 'Filtrar a ausência com IS NULL (ou NOT EXISTS)', 'Relacionar pelo id, não pelo nome'],
    hints: [
      'Um INNER JOIN some com quem não tem pedido — e é justamente quem você procura.',
      'Com `clientes LEFT JOIN pedidos`, quem não tem pedido fica com as colunas do pedido nulas.',
      'Outra forma: `WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.id)`.',
    ],
    explanation:
      '`FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id WHERE p.id IS NULL` mantém todos os clientes e fica só com os que não acharam pedido. `NOT EXISTS` dá o mesmo resultado. Comparar por nome falha quando dois clientes têm o mesmo nome.',
    relations: { keywords: ['left join', 'not exists', 'is null'] },
    schemaSql: LOJA,
    fixtures: [
      { id: 'enunciado', label: 'Dados do enunciado', seedSql: CLIENTES_PEDIDOS },
      {
        id: 'homonimos',
        label: 'Homônimos: um comprou, outro não',
        seedSql: `INSERT INTO clientes (id, nome, cidade) VALUES (1, 'Ana Souza', 'Recife'), (2, 'Ana Souza', 'Natal'), (3, 'Beto Alves', NULL);
INSERT INTO pedidos (id, cliente_id, data) VALUES (10, 1, '2026-06-01');`,
        hint: 'Há duas clientes chamadas Ana Souza e só uma comprou: relacione pelo id do cliente.',
      },
      {
        id: 'todos-compraram',
        label: 'Todos compraram',
        seedSql: `INSERT INTO clientes (id, nome, cidade) VALUES (1, 'Rui Gomes', 'Natal'), (2, 'Sara Leite', 'Recife');
INSERT INTO pedidos (id, cliente_id, data) VALUES (1, 1, '2026-05-01'), (2, 2, '2026-05-02'), (3, 2, '2026-05-09');`,
        hint: 'Se todo mundo comprou, o resultado é vazio.',
      },
    ],
    starterSql: 'SELECT *\nFROM clientes;\n',
    solutionSql: 'SELECT c.nome\nFROM clientes c\nLEFT JOIN pedidos p ON p.cliente_id = c.id\nWHERE p.id IS NULL\nORDER BY c.nome;',
    grading: { mode: 'result', orderMatters: true, orderKeys: [{ column: 'nome' }], columnNamesMatter: false, tolerance: 0 },
    portability: 'sql-comum',
  },
  {
    ...base,
    id: 'sql-resumo-por-categoria',
    title: 'Resumo por categoria',
    skills: ['sql.aggregate'],
    difficulty: 'medio',
    scope: 'aula',
    estimatedMinutes: 8,
    database: 'Loja',
    prompt:
      'Para cada **categoria**, mostre a categoria, a **quantidade de produtos** e o **preço médio**, em ordem alfabética de categoria. (Arredondar a média para 2 casas é opcional.)',
    objectives: ['Agrupar linhas com GROUP BY', 'Contar com COUNT e calcular média com AVG', 'Entender que cada grupo vira uma linha'],
    hints: ['Cada categoria vira uma linha: `GROUP BY categoria`.', 'No SELECT, além da categoria, use funções de agregação: `COUNT(*)` e `AVG(preco)`.', 'Ordene o resultado pela categoria.'],
    explanation:
      '`SELECT categoria, COUNT(*), AVG(preco) FROM produtos GROUP BY categoria` produz uma linha por categoria. Toda coluna do SELECT que não está numa agregação precisa estar no GROUP BY (no MySQL com ONLY_FULL_GROUP_BY, o padrão, isso é exigido).',
    relations: { keywords: ['group by', 'count', 'avg'] },
    schemaSql: LOJA,
    fixtures: [
      { id: 'enunciado', label: 'Dados do enunciado', seedSql: PRODUTOS_VITRINE },
      {
        id: 'dizima',
        label: 'Média com dízima',
        seedSql: `INSERT INTO produtos (id, nome, categoria, preco) VALUES (1, 'Clipes', 'Papelaria', 1.00), (2, 'Grampos', 'Papelaria', 2.00), (3, 'Elásticos', 'Papelaria', 2.00), (4, 'Pendrive', 'Eletrônicos', 39.90);`,
        hint: 'A média pode ter muitas casas (1,6666…): arredondar para 2 casas é aceito; para inteiro, não.',
      },
      { id: 'uma-categoria', label: 'Uma única categoria', seedSql: `INSERT INTO produtos (id, nome, categoria, preco) VALUES (1, 'Lousa branca', 'Escritório', 210.00), (2, 'Apagador', 'Escritório', 14.99);`, hint: 'Com uma categoria só, o resultado tem uma linha.' },
    ],
    starterSql: 'SELECT *\nFROM produtos;\n',
    solutionSql: 'SELECT categoria, COUNT(*) AS quantidade, AVG(preco) AS preco_medio\nFROM produtos\nGROUP BY categoria\nORDER BY categoria;',
    grading: { mode: 'result', orderMatters: true, orderKeys: [{ column: 'categoria' }], columnNamesMatter: false, tolerance: 0.01 },
    portability: 'sql-comum',
  },
  {
    ...base,
    id: 'sql-clientes-acima-de-100',
    title: 'Clientes que gastaram mais de R$ 100',
    skills: ['sql.join', 'sql.aggregate'],
    difficulty: 'dificil',
    scope: 'aprofundamento',
    estimatedMinutes: 15,
    database: 'Loja',
    prompt:
      'Mostre o **nome** de cada cliente e o **total gasto** — a soma de `quantidade × preco_unit` de todos os itens de todos os pedidos dele — apenas para quem gastou **mais de R$ 100,00**. Ordene do maior total para o menor; empate pelo nome.',
    objectives: ['Encadear dois JOINs', 'Somar uma expressão com SUM', 'Filtrar grupos com HAVING', 'Agrupar pela chave do cliente'],
    hints: [
      'Caminho: clientes → pedidos → itens_pedido (dois JOINs).',
      'O total de cada cliente é `SUM(i.quantidade * i.preco_unit)` agrupado por cliente.',
      'Filtro sobre o resultado de uma agregação vai no `HAVING`, não no `WHERE`.',
      'Agrupe pelo id do cliente (e o nome junto): dois clientes podem ter o mesmo nome.',
    ],
    explanation:
      'O WHERE filtra linhas antes de agrupar; o HAVING filtra os grupos já somados. `GROUP BY c.id, c.nome` separa clientes homônimos — agrupar só por nome somaria o gasto de pessoas diferentes. "Mais de 100" exclui quem gastou exatamente 100,00.',
    relations: { keywords: ['having', 'sum', 'group by', 'join'] },
    schemaSql: LOJA,
    fixtures: [
      { id: 'enunciado', label: 'Dados do enunciado', seedSql: CLIENTES_PEDIDOS },
      {
        id: 'exatamente-100',
        label: 'Total exatamente R$ 100,00',
        seedSql: `INSERT INTO clientes (id, nome, cidade) VALUES (1, 'Lia Ramos', 'Natal'), (2, 'Davi Costa', 'Recife');
INSERT INTO produtos (id, nome, categoria, preco) VALUES (1, 'Kit pincéis', 'Arte', 25.00), (2, 'Tela 40x50', 'Arte', 33.34);
INSERT INTO pedidos (id, cliente_id, data) VALUES (1, 1, '2026-04-01'), (2, 2, '2026-04-02');
INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unit) VALUES (1, 1, 4, 25.00), (2, 2, 3, 33.34);`,
        hint: 'Quem gastou exatamente R$ 100,00 não entra ("mais de 100"); centavos acima já entram.',
      },
      {
        id: 'homonimos',
        label: 'Clientes com o mesmo nome',
        seedSql: `INSERT INTO clientes (id, nome, cidade) VALUES (1, 'Ana Souza', 'Recife'), (2, 'Ana Souza', 'Natal'), (3, 'Téo Barros', NULL);
INSERT INTO produtos (id, nome, categoria, preco) VALUES (1, 'Luminária', 'Casa', 60.00), (2, 'Tapete', 'Casa', 150.00);
INSERT INTO pedidos (id, cliente_id, data) VALUES (1, 1, '2026-03-01'), (2, 2, '2026-03-02'), (3, 3, '2026-03-03');
INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unit) VALUES (1, 1, 1, 60.00), (2, 1, 1, 60.00), (3, 2, 1, 150.00);`,
        hint: 'As duas Ana Souza são clientes diferentes: cada uma gastou R$ 60,00. Agrupe pelo id do cliente.',
      },
    ],
    starterSql: 'SELECT *\nFROM itens_pedido;\n',
    solutionSql:
      'SELECT c.nome, SUM(i.quantidade * i.preco_unit) AS total\nFROM clientes c\nJOIN pedidos p ON p.cliente_id = c.id\nJOIN itens_pedido i ON i.pedido_id = p.id\nGROUP BY c.id, c.nome\nHAVING SUM(i.quantidade * i.preco_unit) > 100\nORDER BY total DESC, c.nome;',
    grading: { mode: 'result', orderMatters: true, orderKeys: [{ column: 'total', desc: true }, { column: 'nome' }], columnNamesMatter: false, tolerance: 0.005 },
    portability: 'sql-comum',
  },
  {
    ...base,
    id: 'sql-livros-acima-da-media',
    title: 'Livros maiores que a média',
    skills: ['sql.subquery', 'sql.aggregate'],
    difficulty: 'medio',
    scope: 'aprofundamento',
    estimatedMinutes: 10,
    database: 'Biblioteca',
    prompt:
      'Liste **titulo** e **paginas** dos livros com **mais páginas que a média** do acervo, do maior para o menor; empate pelo título. A média deve ser calculada pela própria consulta.',
    objectives: ['Usar uma subconsulta escalar no WHERE', 'Lembrar que AVG ignora valores nulos'],
    hints: ['Primeiro descubra a média: `SELECT AVG(paginas) FROM livros`.', 'Uma consulta entre parênteses pode virar um valor dentro do WHERE.', 'Não fixe o número da média: em outros bancos de teste ela é outra.'],
    explanation:
      '`WHERE paginas > (SELECT AVG(paginas) FROM livros)` calcula a média a cada execução. AVG ignora livros sem número de páginas (NULL), e esses livros também não passam no filtro — comparar NULL dá "desconhecido".',
    relations: { keywords: ['subconsulta', 'avg', 'where'] },
    schemaSql: BIBLIOTECA,
    fixtures: [
      { id: 'enunciado', label: 'Dados do enunciado', seedSql: ACERVO },
      {
        id: 'iguais',
        label: 'Todos do mesmo tamanho',
        seedSql: `INSERT INTO livros (id, titulo, autor, ano, paginas) VALUES (1, 'Volume A', 'C. Rocha', 2020, 200), (2, 'Volume B', 'C. Rocha', 2021, 200);`,
        hint: 'Se todos têm o mesmo tamanho, nenhum fica acima da média.',
      },
      {
        id: 'nulos',
        label: 'Média quebrada e livro sem páginas',
        seedSql: `INSERT INTO livros (id, titulo, autor, ano, paginas) VALUES (1, 'Guia 1', 'N. Dias', 2010, 100), (2, 'Guia 2', 'N. Dias', 2011, 101), (3, 'Guia 3', 'N. Dias', 2012, 102), (4, 'Guia 4', 'N. Dias', 2013, 103), (5, 'Guia 5', 'N. Dias', 2014, NULL);`,
        hint: 'A média aqui é 101,5 — calcule-a na consulta. O livro sem páginas (NULL) não entra na média nem no resultado.',
      },
    ],
    starterSql: 'SELECT *\nFROM livros;\n',
    solutionSql: 'SELECT titulo, paginas\nFROM livros\nWHERE paginas > (SELECT AVG(paginas) FROM livros)\nORDER BY paginas DESC, titulo;',
    grading: { mode: 'result', orderMatters: true, orderKeys: [{ column: 'paginas', desc: true }, { column: 'titulo' }], columnNamesMatter: false, tolerance: 0 },
    portability: 'sql-comum',
  },
  {
    ...base,
    id: 'sql-reajuste-papelaria',
    title: 'Reajuste de 10% na Papelaria',
    skills: ['sql.dml'],
    difficulty: 'medio',
    scope: 'aula',
    estimatedMinutes: 8,
    database: 'Loja',
    prompt:
      'A loja vai reajustar em **10%** o preço de todos os produtos da categoria **Papelaria**. Escreva o comando que faz isso — os outros produtos não podem mudar. (Arredondar para 2 casas é opcional.)',
    objectives: ['Alterar dados com UPDATE … SET', 'Restringir a alteração com WHERE', 'Calcular o novo valor a partir do atual'],
    hints: ['A estrutura é `UPDATE tabela SET coluna = expressão WHERE condição`.', 'Aumentar 10% é multiplicar por 1.10.', 'Sem WHERE, TODOS os produtos seriam reajustados.'],
    explanation:
      '`UPDATE produtos SET preco = preco * 1.10 WHERE categoria = \'Papelaria\'` lê o preço atual de cada linha e grava o novo. O WHERE é o que protege o resto da tabela — teste antes com um SELECT usando o mesmo WHERE.',
    relations: { keywords: ['update', 'where', 'dml'] },
    schemaSql: LOJA,
    fixtures: [
      { id: 'enunciado', label: 'Dados do enunciado', seedSql: PRODUTOS_VITRINE },
      { id: 'sem-papelaria', label: 'Sem produtos de Papelaria', seedSql: `INSERT INTO produtos (id, nome, categoria, preco) VALUES (1, 'Caixa de som', 'Eletrônicos', 199.00), (2, 'Carregador', 'Eletrônicos', 59.90);`, hint: 'Sem produtos de Papelaria, a tabela deve ficar exatamente igual.' },
      { id: 'mistura', label: 'Categorias misturadas', seedSql: `INSERT INTO produtos (id, nome, categoria, preco) VALUES (1, 'Bloco adesivo', 'Papelaria', 9.99), (2, 'Pasta catálogo', 'Papelaria', 21.00), (3, 'Squeeze', 'Acessórios', 21.00);`, hint: 'Só os produtos de Papelaria mudam; o de outra categoria com o mesmo preço continua igual.' },
    ],
    starterSql: '-- Executar roda num banco temporário (descartado depois).\n-- Para ver o efeito, acrescente: SELECT * FROM produtos;\n',
    solutionSql: "UPDATE produtos\nSET preco = preco * 1.10\nWHERE categoria = 'Papelaria';",
    grading: { mode: 'state', stateQueries: [{ label: 'tabela produtos', sql: 'SELECT id, nome, categoria, preco FROM produtos ORDER BY id' }], tolerance: 0.006 },
    portability: 'sql-comum',
  },
  {
    ...base,
    id: 'sql-limpar-emprestimos',
    title: 'Limpeza de empréstimos antigos',
    skills: ['sql.dml'],
    difficulty: 'medio',
    scope: 'aula',
    estimatedMinutes: 8,
    database: 'Biblioteca',
    prompt:
      'Apague os empréstimos **já devolvidos** com data de devolução **anterior a 2026-01-01**. Empréstimos em aberto (sem data de devolução) nunca podem ser apagados.',
    objectives: ['Remover linhas com DELETE … WHERE', 'Comparar datas no formato AAAA-MM-DD', 'Lembrar como NULL se comporta em comparações'],
    hints: ['A estrutura é `DELETE FROM tabela WHERE condição`.', 'Datas no formato \'AAAA-MM-DD\' se comparam com < e >.', 'Pense no que acontece com `data_devolucao < \'2026-01-01\'` quando a devolução é NULL.'],
    explanation:
      '`DELETE FROM emprestimos WHERE data_devolucao < \'2026-01-01\'` apaga só devoluções anteriores a 2026. Para empréstimos em aberto a comparação com NULL dá "desconhecido", e eles ficam — não é preciso um `IS NOT NULL` extra, mas ele deixa a intenção explícita.',
    relations: { keywords: ['delete', 'datas', 'null'] },
    schemaSql: BIBLIOTECA,
    fixtures: [
      {
        id: 'enunciado',
        label: 'Dados do enunciado',
        seedSql: `${ACERVO}
INSERT INTO emprestimos (id, livro_id, leitor, data_saida, data_devolucao) VALUES
  (1, 1, 'Ana Souza', '2025-09-02', '2025-09-20'),
  (2, 3, 'Bruno Lima', '2025-11-10', '2025-12-01'),
  (3, 2, 'Carla Dias', '2025-12-15', '2026-01-08'),
  (4, 4, 'Ana Souza', '2026-02-01', NULL),
  (5, 1, 'Diego Rocha', '2026-03-05', '2026-03-19');`,
      },
      {
        id: 'virada',
        label: 'Devolução no dia 2026-01-01',
        seedSql: `${ACERVO}
INSERT INTO emprestimos (id, livro_id, leitor, data_saida, data_devolucao) VALUES (1, 2, 'Lia Ramos', '2025-12-20', '2026-01-01'), (2, 5, 'Davi Costa', '2025-12-01', '2025-12-31');`,
        hint: 'Devolvido em 2026-01-01 não é "anterior a 2026-01-01": fica.',
      },
      {
        id: 'aberto-antigo',
        label: 'Empréstimo antigo ainda em aberto',
        seedSql: `${ACERVO}
INSERT INTO emprestimos (id, livro_id, leitor, data_saida, data_devolucao) VALUES (1, 6, 'Rui Gomes', '2025-03-01', NULL), (2, 3, 'Sara Leite', '2025-04-10', '2025-05-02');`,
        hint: 'Um empréstimo que saiu em 2025 e não voltou continua em aberto — e não pode ser apagado.',
      },
    ],
    starterSql: '-- Executar roda num banco temporário (descartado depois).\n-- Para ver o efeito, acrescente: SELECT * FROM emprestimos;\n',
    solutionSql: "DELETE FROM emprestimos\nWHERE data_devolucao < '2026-01-01';",
    grading: { mode: 'state', stateQueries: [{ label: 'tabela emprestimos', sql: 'SELECT id, livro_id, leitor, data_saida, data_devolucao FROM emprestimos ORDER BY id' }], tolerance: 0 },
    portability: 'sql-comum',
  },
  {
    ...base,
    id: 'sql-matricular-turma',
    title: 'Nova disciplina e matrícula da turma',
    skills: ['sql.dml', 'sql.subquery'],
    difficulty: 'dificil',
    scope: 'desafio',
    estimatedMinutes: 15,
    database: 'Universidade',
    prompt:
      'Cadastre a disciplina **Banco de Dados II**, com **4 créditos**, e matricule nela, **sem nota**, **todos os alunos do curso Sistemas de Informação**. Não suponha qual id a nova disciplina vai receber.',
    objectives: ['Inserir uma linha com INSERT … VALUES', 'Inserir várias linhas a partir de uma consulta (INSERT … SELECT)', 'Buscar o id gerado sem fixá-lo no código'],
    hints: [
      'São dois comandos: um INSERT para a disciplina e outro para as matrículas.',
      'O segundo pode ser `INSERT INTO matriculas (aluno_id, disciplina_id, nota) SELECT …`.',
      'O id da disciplina nova pode ser lido pelo nome, numa subconsulta ou num JOIN.',
    ],
    explanation:
      'Depois de `INSERT INTO disciplinas (nome, creditos) VALUES (\'Banco de Dados II\', 4)`, o `INSERT … SELECT` gera uma matrícula por aluno do curso, buscando o id da disciplina pelo nome. Fixar o id (ex.: 4) quebra quando o banco já usou outros ids.',
    relations: { keywords: ['insert', 'insert select', 'subconsulta'] },
    schemaSql: UNIVERSIDADE,
    fixtures: [
      {
        id: 'enunciado',
        label: 'Dados do enunciado',
        seedSql: `${TURMA}
INSERT INTO disciplinas (id, nome, creditos) VALUES (1, 'Algoritmos', 4), (2, 'Banco de Dados I', 4), (3, 'Redes', 2);
INSERT INTO matriculas (aluno_id, disciplina_id, nota) VALUES (1, 2, 8.5), (3, 2, 6.0), (2, 1, 9.0), (5, 3, NULL);`,
      },
      {
        id: 'outros-ids',
        label: 'Ids já usados são outros',
        seedSql: `${TURMA}
INSERT INTO disciplinas (id, nome, creditos) VALUES (1, 'Algoritmos', 4), (4, 'Banco de Dados I', 4), (9, 'Redes', 2);`,
        hint: 'Neste banco os ids já usados são outros: busque o id da nova disciplina em vez de fixá-lo.',
      },
      {
        id: 'sem-alunos-si',
        label: 'Nenhum aluno de Sistemas de Informação',
        seedSql: `INSERT INTO alunos (id, nome, curso) VALUES (1, 'Iara Lopes', 'Ciência da Computação'), (2, 'João Pires', 'Engenharia de Software');
INSERT INTO disciplinas (id, nome, creditos) VALUES (1, 'Algoritmos', 4);`,
        hint: 'Mesmo sem alunos do curso, a disciplina precisa ser cadastrada.',
      },
    ],
    starterSql: '-- Executar roda num banco temporário (descartado depois).\n-- Para ver o efeito, acrescente: SELECT * FROM matriculas;\n',
    solutionSql:
      "INSERT INTO disciplinas (nome, creditos) VALUES ('Banco de Dados II', 4);\nINSERT INTO matriculas (aluno_id, disciplina_id, nota)\nSELECT a.id, d.id, NULL\nFROM alunos a\nJOIN disciplinas d ON d.nome = 'Banco de Dados II'\nWHERE a.curso = 'Sistemas de Informação';",
    grading: {
      mode: 'state',
      stateQueries: [
        { label: 'tabela disciplinas', sql: 'SELECT nome, creditos FROM disciplinas ORDER BY nome' },
        {
          label: 'tabela matriculas',
          sql: 'SELECT a.nome AS aluno, d.nome AS disciplina, m.nota FROM matriculas m JOIN alunos a ON a.id = m.aluno_id JOIN disciplinas d ON d.id = m.disciplina_id ORDER BY a.id, d.nome',
        },
      ],
      tolerance: 0.001,
    },
    portability: 'sql-comum',
  },
  {
    ...base,
    id: 'sql-criar-avaliacoes',
    title: 'Criar a tabela de avaliações',
    skills: ['sql.ddl'],
    difficulty: 'medio',
    scope: 'aprofundamento',
    estimatedMinutes: 12,
    database: 'Loja',
    prompt:
      'Crie a tabela **avaliacoes** com: **id** (inteiro, chave primária), **produto_id** (obrigatório, chave estrangeira para `produtos.id`), **nota** (inteiro obrigatório, de **1 a 5**) e **comentario** (texto opcional).',
    objectives: ['Definir colunas e tipos com CREATE TABLE', 'Declarar PRIMARY KEY, NOT NULL e FOREIGN KEY', 'Restringir valores com CHECK'],
    hints: [
      'Comece com `CREATE TABLE avaliacoes ( … );` e uma linha por coluna.',
      '"Obrigatório" é `NOT NULL`; "de 1 a 5" pode ser `CHECK (nota BETWEEN 1 AND 5)`.',
      'A chave estrangeira pode ir no fim: `FOREIGN KEY (produto_id) REFERENCES produtos(id)`.',
    ],
    explanation:
      'A correção testa o comportamento da tabela: aceita uma avaliação válida e comentário vazio, e recusa nota fora de 1–5, nota ou produto ausentes, produto inexistente e id repetido. No MySQL 8, escreva a FOREIGN KEY como cláusula separada: o REFERENCES na própria coluna é aceito mas ignorado. CHECK é respeitado a partir do MySQL 8.0.16.',
    relations: { keywords: ['create table', 'constraints', 'foreign key', 'check'] },
    schemaSql: LOJA,
    fixtures: [{ id: 'enunciado', label: 'Regras da tabela', seedSql: PRODUTOS_VITRINE }],
    starterSql: 'CREATE TABLE avaliacoes (\n  id INTEGER PRIMARY KEY\n  -- complete as outras colunas\n);\n',
    solutionSql:
      'CREATE TABLE avaliacoes (\n  id INTEGER PRIMARY KEY,\n  produto_id INTEGER NOT NULL,\n  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),\n  comentario TEXT,\n  FOREIGN KEY (produto_id) REFERENCES produtos(id)\n);',
    grading: {
      mode: 'schema',
      table: 'avaliacoes',
      columns: ['id', 'produto_id', 'nota', 'comentario'],
      probes: [
        { label: 'uma avaliação válida é aceita', sql: "INSERT INTO avaliacoes (id, produto_id, nota, comentario) VALUES (1, 1, 5, 'Ótimo');", expect: 'ok' },
        { label: 'comentário pode ficar vazio (NULL)', sql: 'INSERT INTO avaliacoes (id, produto_id, nota, comentario) VALUES (2, 1, 3, NULL);', expect: 'ok' },
        { label: 'nota 6 é recusada', sql: 'INSERT INTO avaliacoes (id, produto_id, nota, comentario) VALUES (3, 1, 6, NULL);', expect: 'erro' },
        { label: 'nota 0 é recusada', sql: 'INSERT INTO avaliacoes (id, produto_id, nota, comentario) VALUES (4, 1, 0, NULL);', expect: 'erro' },
        { label: 'nota é obrigatória', sql: "INSERT INTO avaliacoes (id, produto_id, nota, comentario) VALUES (5, 1, NULL, 'sem nota');", expect: 'erro' },
        { label: 'produto é obrigatório', sql: 'INSERT INTO avaliacoes (id, produto_id, nota, comentario) VALUES (6, NULL, 4, NULL);', expect: 'erro' },
        { label: 'produto inexistente é recusado', sql: 'INSERT INTO avaliacoes (id, produto_id, nota, comentario) VALUES (7, 999, 4, NULL);', expect: 'erro' },
        { label: 'id repetido é recusado', sql: 'INSERT INTO avaliacoes (id, produto_id, nota) VALUES (10, 1, 4); INSERT INTO avaliacoes (id, produto_id, nota) VALUES (10, 2, 2);', expect: 'erro' },
      ],
    },
    portability: 'sql-comum',
  },
];

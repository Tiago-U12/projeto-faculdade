// Lote fs-mysql — MySQL e persistência: 8 fáceis (001–008), 9 médias (009–017), 9 difíceis (018–026).
// Base: Aula 10 (README, schema.sql e repositórios com mysql2/promise: lugares, usuarios, avaliacoes, FKs, placeholders ?).
// Verificação REAL: o schema da aula e os dados de exemplo são carregados em um MariaDB temporário (compatível com MySQL; sql_mode do
// MySQL 8) e as consultas/erros do enunciado são executados com mysql2/promise. Evitamos depender de diferenças conhecidas entre
// MariaDB e MySQL (por exemplo, códigos de erro de CHECK).
import { m } from '../../tools/lib/dsl.ts';

const A10 = 'fs-aula-10';
const R = (n, o) => ({ d: 'fullstack', topic: 'mysql', ...o, id: `fs-mysql-${String(n).padStart(3, '0')}` });
const h = (strings, ...v) => m(strings, ...v).replaceAll('§', '`').replaceAll('\\n', '\n');
const code = (src, lang = 'js') => ('§§§' + lang + '\n').replaceAll('§', '`') + src.trim() + '\n§§§'.replaceAll('§', '`');

// schema.sql da aula (tabelas lugares, usuarios, avaliacoes) + dados de exemplo
const SCHEMA = `CREATE TABLE lugares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  descricao TEXT NOT NULL
);
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE avaliacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nota TINYINT NOT NULL,
  comentario TEXT NOT NULL,
  lugar_id INT NOT NULL,
  usuario_id INT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lugar_id) REFERENCES lugares(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT chk_nota CHECK (nota BETWEEN 1 AND 5)
);
INSERT INTO lugares (nome, categoria, cidade, descricao) VALUES
  ('Café Aroma','Cafeteria','São Paulo','x'),('Parque das Águas','Parque','Curitiba','x'),('Museu da Imagem','Museu','Rio de Janeiro','x'),
  ('Sabor Caseiro','Restaurante','Belo Horizonte','x'),('Livraria Página Viva','Livraria','Porto Alegre','x'),('Cine Estrela','Cinema','São Paulo','x');
INSERT INTO usuarios (nome, email, senha_hash) VALUES
  ('Marina Souza','marina@example.com','h'),('Diego Lima','diego@example.com','h'),('Beatriz Alves','beatriz@example.com','h'),('Pedro Nogueira','pedro@example.com','h');
INSERT INTO avaliacoes (nota, comentario, lugar_id, usuario_id) VALUES
  (5,'Melhor café da cidade!',1,1),(4,'Ambiente ótimo, um pouco caro.',1,2),(5,'Perfeito para caminhar.',2,1),(3,'Bonito, mas precisa de mais bancos.',2,3),
  (4,'Acervo impressionante.',3,4),(5,'Comida excelente.',4,2),(2,'Demorou muito para servir.',4,3),(5,'Adorei os eventos.',5,4),(3,'Cadeiras pouco confortáveis.',6,1);`;
const sql = (corpo, values) => ({ kind: 'sql', params: { code: `import mysqlLib from 'mysql2';\nawait conn.query(${JSON.stringify(SCHEMA)});\n${corpo}` }, values });
const stem = (intro, trecho, lang = 'js') => `${intro}\n\n${code(trecho, lang)}\n(Dados do §schema.sql§ da Aula 10.)`.replaceAll('§', '`');

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'AUTO_INCREMENT e insertId',
    stem: h`${stem('Depois de inserir uma nova avaliação, qual é o valor de §resultado.insertId§?', 'const [resultado] = await pool.query(\n  "INSERT INTO avaliacoes (nota, comentario, lugar_id, usuario_id) VALUES (?, ?, ?, ?)",\n  [5, "Muito bom!", 2, 1]\n);\nconsole.log(resultado.insertId);')}`,
    opts: [h`§10§`, [h`§1§`, h`O §AUTO_INCREMENT§ continua a sequência da tabela: já existem 9 avaliações (ids 1 a 9).`], [h`§9§`, h`§9§ é o id da última avaliação existente; a nova recebe o próximo número.`], [h`§0§`, h`O §insertId§ é o id gerado para a linha inserida (aqui 10).`]],
    exp: h`Com a coluna §id INT AUTO_INCREMENT§, o banco gera sozinho o próximo valor da sequência. Como as 9 avaliações de exemplo ocupam os ids 1–9, a nova recebe §10§, devolvido em §resultado.insertId§ — usado em §criarAvaliacao§ para retornar o registro criado.`,
    src: [[A10, 'criarAvaliacao: resultado.insertId é o id gerado pelo AUTO_INCREMENT']],
    verify: sql("const [resultado] = await conn.query('INSERT INTO avaliacoes (nota, comentario, lugar_id, usuario_id) VALUES (?, ?, ?, ?)', [5, 'Muito bom!', 2, 1]);\nconsole.log(resultado.insertId);", ['10', '1', '9', '0']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'SELECT com WHERE',
    stem: h`${stem('Quantas linhas retorna a consulta abaixo?', 'const [linhas] = await pool.query(\n  "SELECT id, nota FROM avaliacoes WHERE lugar_id = ?",\n  [1]\n);\nconsole.log(linhas.length);')}`,
    opts: [h`§2§`, [h`§9§`, h`O §WHERE lugar_id = ?§ filtra só as avaliações do lugar 1 (não todas as 9).`], [h`§1§`, h`O lugar 1 (Café Aroma) tem duas avaliações.`], [h`§0§`, h`Há avaliações do lugar 1 nos dados de exemplo.`]],
    exp: h`O filtro §WHERE lugar_id = 1§ mantém as avaliações de ids 1 e 2 (notas 5 e 4). O §?§ é substituído com segurança por §1§ — padrão de §listarAvaliacoesPorLugar(lugarId)§.`,
    src: [[A10, 'listarAvaliacoesPorLugar: SELECT filtrado por lugar_id (WHERE lugar_id = ?)']],
    verify: sql("const [linhas] = await conn.query('SELECT id, nota FROM avaliacoes WHERE lugar_id = ?', [1]);\nconsole.log(linhas.length);", ['2', '9', '1', '0']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'Placeholder ?',
    stem: h`Qual SQL final o §mysql2§ monta a partir do código abaixo?\n\n${code('import mysql from "mysql2";\nconsole.log(mysql.format("SELECT * FROM avaliacoes WHERE lugar_id = ?", [1]));')}`,
    opts: [h`§SELECT * FROM avaliacoes WHERE lugar_id = 1§`, [h`§SELECT * FROM avaliacoes WHERE lugar_id = ?§`, h`O §?§ é substituído pelo valor do array de parâmetros.`], [h`§SELECT * FROM avaliacoes WHERE lugar_id = '1'§`, h`Números são inseridos sem aspas; só strings recebem aspas.`], [h`§SELECT * FROM avaliacoes WHERE lugar_id = [1]§`, h`O array é um conjunto de valores; cada elemento ocupa o seu §?§.`]],
    exp: h`Cada §?§ é trocado, em ordem, pelo valor correspondente do array, com o escape adequado ao tipo (número sem aspas; texto entre aspas e com caracteres especiais protegidos). É assim que a aula pede que todas as queries sejam escritas.`,
    src: [[A10, 'Sempre use ? como placeholder e passe os valores em um array']],
    verify: sql('console.log(mysqlLib.format("SELECT * FROM avaliacoes WHERE lugar_id = ?", [1]));', ['SELECT * FROM avaliacoes WHERE lugar_id = 1', 'SELECT * FROM avaliacoes WHERE lugar_id = ?', "SELECT * FROM avaliacoes WHERE lugar_id = '1'", 'SELECT * FROM avaliacoes WHERE lugar_id = [1]']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'SQL injection',
    stem: h`${stem('A consulta é montada **concatenando** a entrada do usuário. Quantas linhas ela devolve para a entrada §x\' OR \'1\'=\'1§?', 'const entrada = "x\' OR \'1\'=\'1";\nconst [linhas] = await pool.query(\n  "SELECT * FROM lugares WHERE nome = \'" + entrada + "\'"\n);\nconsole.log(linhas.length);')}`,
    opts: [h`§6§ (todos os lugares)`, [h`§0§ — não existe lugar com esse nome`, h`A entrada fecha a aspa e acrescenta §OR '1'='1'§, que é sempre verdadeiro: a consulta devolve tudo.`], [h`§1§`, h`O filtro por nome é anulado pela cláusula injetada.`], [h`Um erro de sintaxe`, h`O SQL resultante é válido: §WHERE nome = 'x' OR '1'='1'§.`]],
    exp: h`Concatenar a entrada permite que o usuário altere a *estrutura* da consulta: o SQL final é §... WHERE nome = 'x' OR '1'='1'§ e devolve as 6 linhas. Com placeholders (§WHERE nome = ?§ + array) a entrada seria tratada como um valor (texto) e nada casaria. É a razão da regra “nunca concatene valores direto na string SQL”.`,
    src: [[A10, 'nunca concatene valores direto na string SQL (isso abre brecha para SQL injection)']],
    verify: sql("const entrada = \"x' OR '1'='1\";\nconst [linhas] = await conn.query(\"SELECT * FROM lugares WHERE nome = '\" + entrada + \"'\");\nconsole.log(linhas.length);", ['6', '0', '1', 'erro']),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'Chave estrangeira',
    stem: h`${stem('Qual é o código de erro do MySQL ao inserir uma avaliação para um §lugar_id§ que não existe (99)?', 'try {\n  await pool.query(\n    "INSERT INTO avaliacoes (nota, comentario, lugar_id, usuario_id) VALUES (?, ?, ?, ?)",\n    [5, "Ótimo", 99, 1]\n  );\n} catch (e) {\n  console.log(e.code);\n}')}`,
    opts: [h`§ER_NO_REFERENCED_ROW_2§`, [h`§ER_DUP_ENTRY§`, h`Esse erro ocorre quando um valor duplica uma chave única (como o e-mail), não numa chave estrangeira.`], [h`§ER_BAD_FIELD_ERROR§`, h`Esse erro indica coluna inexistente; aqui as colunas estão corretas.`], [h`§ER_PARSE_ERROR§`, h`O SQL é sintaticamente correto; o problema é a referência ao lugar 99.`]],
    exp: h`A chave estrangeira §FOREIGN KEY (lugar_id) REFERENCES lugares(id)§ impede referenciar um lugar inexistente: o banco recusa o §INSERT§ com §ER_NO_REFERENCED_ROW_2§. Assim ninguém grava uma avaliação “órfã”.`,
    src: [[A10, 'schema.sql: FOREIGN KEY (lugar_id) REFERENCES lugares(id) ON DELETE CASCADE']],
    verify: sql("try {\n  await conn.query('INSERT INTO avaliacoes (nota, comentario, lugar_id, usuario_id) VALUES (?, ?, ?, ?)', [5, 'Ótimo', 99, 1]);\n  console.log('inseriu');\n} catch (e) {\n  console.log(e.code);\n}", ['ER_NO_REFERENCED_ROW_2', 'ER_DUP_ENTRY', 'ER_BAD_FIELD_ERROR', 'ER_PARSE_ERROR']),
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'UNIQUE',
    stem: h`${stem('Qual é o código de erro ao cadastrar outro usuário com o e-mail §marina@example.com§ (que já existe)?', 'try {\n  await pool.query(\n    "INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)",\n    ["Outra Marina", "marina@example.com", "hash"]\n  );\n} catch (e) {\n  console.log(e.code);\n}')}`,
    opts: [h`§ER_DUP_ENTRY§`, [h`§ER_NO_REFERENCED_ROW_2§`, h`Esse erro é de chave estrangeira, e a tabela §usuarios§ não referencia outra.`], [h`§ER_BAD_NULL_ERROR§`, h`Todos os campos obrigatórios foram preenchidos.`], [h`Nenhum: o banco aceita a duplicata`, h`A coluna §email§ foi declarada §UNIQUE§, então o banco recusa valores repetidos.`]],
    exp: h`A restrição §email VARCHAR(255) NOT NULL UNIQUE§ garante e-mails únicos. Tentar repetir um valor causa §ER_DUP_ENTRY§ (“Duplicate entry ... for key”). A API (Aula 11) trata esse erro para responder “e-mail já cadastrado”.`,
    src: [[A10, 'schema.sql: usuarios.email UNIQUE']],
    verify: sql("try {\n  await conn.query('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)', ['Outra Marina', 'marina@example.com', 'hash']);\n  console.log('inseriu');\n} catch (e) {\n  console.log(e.code);\n}", ['ER_DUP_ENTRY', 'ER_NO_REFERENCED_ROW_2', 'ER_BAD_NULL_ERROR', 'inseriu']),
  }),
  R(7, {
    diff: 'facil', scope: 'aula', sub: 'CHECK na nota',
    stem: h`${stem('A tabela tem §CONSTRAINT chk_nota CHECK (nota BETWEEN 1 AND 5)§. O que acontece ao inserir uma avaliação com nota 8?', 'try {\n  await pool.query(\n    "INSERT INTO avaliacoes (nota, comentario, lugar_id, usuario_id) VALUES (8, \'Nota errada\', 1, 1)"\n  );\n  console.log("inserido");\n} catch (e) {\n  console.log("rejeitado");\n}')}`,
    opts: [h`§rejeitado§ — o próprio banco impede a linha`, [h`§inserido§ — o banco só guarda o número`, h`Com a restrição §CHECK§ o banco valida a regra de negócio e recusa notas fora de 1–5.`], [h`§inserido§, mas a nota vira 5`, h`O banco não ajusta valores: ou aceita ou rejeita.`], [h`§rejeitado§ apenas se a API validar antes`, h`A restrição fica no banco, valendo para qualquer cliente, mesmo sem validação na API.`]],
    exp: h`O §CHECK§ declara no banco a regra “nota de 1 a 5”, valendo para qualquer origem de dados (API, script, Workbench). A validação da API continua útil para devolver uma mensagem amigável, mas o banco é a última linha de defesa.`,
    src: [[A10, 'schema.sql: CONSTRAINT chk_nota CHECK (nota BETWEEN 1 AND 5)']],
    verify: sql("try {\n  await conn.query(\"INSERT INTO avaliacoes (nota, comentario, lugar_id, usuario_id) VALUES (8, 'Nota errada', 1, 1)\");\n  console.log('inserido');\n} catch (e) {\n  console.log('rejeitado');\n}", ['rejeitado', 'inserido', 'inserido, mas a nota vira 5', 'rejeitado apenas se a API validar antes']),
  }),
  R(8, {
    diff: 'facil', scope: 'aula', sub: 'ON DELETE CASCADE',
    stem: h`${stem('O lugar 4 (“Sabor Caseiro”) é excluído. Quantas avaliações restam na tabela?', 'await pool.query("DELETE FROM lugares WHERE id = ?", [4]);\nconst [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM avaliacoes");\nconsole.log(total);')}`,
    opts: [h`§7§`, [h`§9§`, h`Com §ON DELETE CASCADE§ as avaliações do lugar excluído (duas, do lugar 4) também são removidas.`], [h`§8§`, h`O lugar 4 tinha duas avaliações (notas 5 e 2): saem as duas, restando 7.`], [h`§0§`, h`Apenas as avaliações do lugar excluído são removidas.`]],
    exp: h`A chave estrangeira foi criada com §ON DELETE CASCADE§: ao excluir o lugar, o banco remove automaticamente as linhas filhas. O lugar 4 tinha 2 avaliações, então ficam 9 − 2 = 7.`,
    src: [[A10, 'schema.sql: FOREIGN KEY ... ON DELETE CASCADE']],
    verify: sql("await conn.query('DELETE FROM lugares WHERE id = ?', [4]);\nconst [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM avaliacoes');\nconsole.log(total);", ['7', '9', '8', '0']),
  }),

  // ---------------- MÉDIAS ----------------
  R(9, {
    diff: 'medio', scope: 'aprofundamento', sub: 'DECIMAL volta como texto',
    stem: h`${stem('Qual é o tipo e o valor de §media§ no JavaScript para o lugar 2 (notas 5 e 3)?', 'const [[linha]] = await pool.query(\n  "SELECT ROUND(AVG(nota), 1) AS media FROM avaliacoes WHERE lugar_id = ?",\n  [2]\n);\nconsole.log(typeof linha.media, linha.media);')}`,
    opts: [h`§string 4.0§`, [h`§number 4§`, h`O §mysql2§ devolve colunas §DECIMAL§ como *string* para não perder precisão, e o valor mantém a casa decimal (“4.0”).`], [h`§number 4.0§`, h`Em JavaScript o número seria impresso como §4§; e aqui o valor chega como texto.`], [h`§string 4§`, h`O §ROUND(..., 1)§ mantém uma casa decimal: “4.0”.`]],
    exp: h`§AVG§ e §ROUND§ produzem §DECIMAL§, que o driver entrega como string (§"4.0"§) por padrão. Se a conta no JS usar o valor como número, converta com §Number(...)§ — ou crie o pool com §decimalNumbers: true§.`,
    src: [[A10, 'listarLugares/rotas: notaMedia calculada a partir das avaliações vindas do MySQL']],
    verify: sql("const [[linha]] = await conn.query('SELECT ROUND(AVG(nota), 1) AS media FROM avaliacoes WHERE lugar_id = ?', [2]);\nconsole.log(typeof linha.media, linha.media);", ['string 4.0', 'number 4', 'number 4.0', 'string 4']),
  }),
  R(10, {
    diff: 'medio', scope: 'aprofundamento', sub: 'INNER JOIN versus LEFT JOIN',
    stem: h`Um novo lugar foi cadastrado e ainda **não tem avaliações**. Quantas linhas cada consulta devolve (INNER e LEFT, nesta ordem)?\n\n${code('INSERT INTO lugares (nome, categoria, cidade, descricao)\nVALUES (\'Novo Lugar\', \'Parque\', \'Recife\', \'x\');\n\n-- (1) INNER JOIN\nSELECT l.id, COUNT(a.id) AS total FROM lugares l\nJOIN avaliacoes a ON a.lugar_id = l.id GROUP BY l.id;\n\n-- (2) LEFT JOIN\nSELECT l.id, COUNT(a.id) AS total FROM lugares l\nLEFT JOIN avaliacoes a ON a.lugar_id = l.id GROUP BY l.id;', 'sql')}\n(Com os dados do §schema.sql§ da Aula 10.)`,
    opts: [h`§6§ e §7§`, [h`§7§ e §7§`, h`O §INNER JOIN§ só traz lugares que têm pelo menos uma avaliação; o novo lugar fica de fora.`], [h`§7§ e §6§`, h`É o contrário: o §LEFT JOIN§ preserva todos os lugares, inclusive os sem avaliações.`], [h`§6§ e §6§`, h`O §LEFT JOIN§ inclui o lugar novo (com total 0).`]],
    exp: h`O §INNER JOIN§ mantém só linhas com correspondência nas duas tabelas (6 lugares com avaliações). O §LEFT JOIN§ mantém *todos* os lugares da esquerda, com §NULL§ onde não há avaliação (7 lugares; o novo com §total = 0§). Para listar lugares com nota média inclusive os sem avaliações, use §LEFT JOIN§.`,
    src: [[A10, 'listar lugares com notas: relação lugares × avaliacoes (JOIN)']],
    verify: sql("await conn.query(\"INSERT INTO lugares (nome, categoria, cidade, descricao) VALUES ('Novo Lugar', 'Parque', 'Recife', 'x')\");\nconst [a] = await conn.query('SELECT l.id, COUNT(a.id) AS total FROM lugares l JOIN avaliacoes a ON a.lugar_id = l.id GROUP BY l.id');\nconst [b] = await conn.query('SELECT l.id, COUNT(a.id) AS total FROM lugares l LEFT JOIN avaliacoes a ON a.lugar_id = l.id GROUP BY l.id');\nconsole.log(a.length, b.length);", ['6 7', '7 7', '7 6', '6 6']),
  }),
  R(11, {
    diff: 'medio', scope: 'aprofundamento', sub: 'AVG sem linhas',
    stem: h`O lugar 7 não tem avaliações. O que o JavaScript recebe em §media§?\n\n${code('const [[linha]] = await pool.query(\n  "SELECT AVG(nota) AS media FROM avaliacoes WHERE lugar_id = ?",\n  [7]\n);\nconsole.log(linha.media);')}`,
    opts: [h`§null§`, [h`§0§`, h`No SQL a média de zero linhas é §NULL§ (indefinida), diferente do JavaScript, onde a função da aula retorna 0 para lista vazia.`], [h`§NaN§`, h`O banco não produz §NaN§; devolve §NULL§, que o driver converte em §null§.`], [h`Um erro de divisão por zero`, h`Funções de agregação sobre zero linhas não geram erro: §AVG§ devolve §NULL§.`]],
    exp: h`Em SQL, §AVG§ sobre um conjunto vazio retorna §NULL§ (e §COUNT§ retorna 0). O §mysql2§ converte §NULL§ em §null§. Por isso a API deve tratar esse caso (por exemplo com §COALESCE(AVG(nota), 0)§ ou calculando a média no JS com a função que devolve 0).`,
    src: [[A10, 'calcularMedia: lista vazia retorna 0 (no JS); tratar também no banco']],
    verify: sql('const [[linha]] = await conn.query("SELECT AVG(nota) AS media FROM avaliacoes WHERE lugar_id = ?", [7]);\nconsole.log(linha.media);', ['null', '0', 'NaN', 'erro']),
  }),
  R(12, {
    diff: 'medio', scope: 'aprofundamento', sub: 'GROUP BY estrito',
    stem: h`${stem('Qual é o código de erro (com o §sql_mode§ padrão do MySQL 8, que inclui §ONLY_FULL_GROUP_BY§)?', 'try {\n  await pool.query(\n    "SELECT lugar_id, comentario, COUNT(*) FROM avaliacoes GROUP BY lugar_id"\n  );\n} catch (e) {\n  console.log(e.code);\n}')}`,
    opts: [h`§ER_WRONG_FIELD_WITH_GROUP§`, [h`§ER_PARSE_ERROR§`, h`A sintaxe está correta; o problema é selecionar uma coluna que não é agregada nem está no §GROUP BY§.`], [h`§ER_BAD_FIELD_ERROR§`, h`As colunas existem; o problema é o agrupamento.`], [h`Nenhum erro: devolve um comentário qualquer de cada grupo`, h`Com §ONLY_FULL_GROUP_BY§ (padrão do MySQL 8) a consulta é rejeitada.`]],
    exp: h`Com §ONLY_FULL_GROUP_BY§ toda coluna do §SELECT§ precisa estar no §GROUP BY§ ou dentro de uma função de agregação; §comentario§ não está em nenhum dos dois, então o MySQL recusa com §ER_WRONG_FIELD_WITH_GROUP§ (que evita resultados ambíguos).`,
    src: [[A10, 'consultas agregadas sobre avaliações (média por lugar)']],
    verify: sql("try {\n  await conn.query('SELECT lugar_id, comentario, COUNT(*) FROM avaliacoes GROUP BY lugar_id');\n  console.log('sem erro');\n} catch (e) {\n  console.log(e.code);\n}", ['ER_WRONG_FIELD_WITH_GROUP', 'ER_PARSE_ERROR', 'ER_BAD_FIELD_ERROR', 'sem erro']),
  }),
  R(13, {
    diff: 'medio', scope: 'aprofundamento', sub: 'affectedRows e changedRows',
    stem: h`Um §UPDATE§ deixa com nota 5 todas as avaliações de um lugar cujas notas atuais são 5 e 3. O que o resultado informa em §affectedRows§ e §changedRows§?\n\n${code('const [r] = await pool.query(\n  "UPDATE avaliacoes SET nota = 5 WHERE lugar_id = ?",\n  [2]\n);\nconsole.log(r.affectedRows, r.changedRows);')}`,
    opts: [h`§2 1§`, [h`§1 1§`, h`Por padrão o §mysql2§ conta em §affectedRows§ as linhas que *casaram* com o §WHERE§ (2), mesmo que uma já valesse 5.`], [h`§2 2§`, h`A linha com nota 5 não mudou de valor, então só uma foi realmente alterada (§changedRows§ = 1).`], [h`§1 2§`, h`§changedRows§ nunca é maior que §affectedRows§.`]],
    exp: h`O §WHERE lugar_id = 2§ casa com 2 linhas (§affectedRows = 2§), mas apenas a de nota 3 mudou de fato para 5 (§changedRows = 1§). Dica: conferir §affectedRows§ ajuda a saber se o id existia (0 = nada encontrado → responder 404).`,
    src: [[A10, 'INSERT/UPDATE com pool.query retornam [resultado] com metadados']],
    verify: sql("const [r] = await conn.query('UPDATE avaliacoes SET nota = 5 WHERE lugar_id = ?', [2]);\nconsole.log(r.affectedRows, r.changedRows);", ['2 1', '1 1', '2 2', '1 2']),
  }),
  R(14, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Pool de conexões',
    stem: h`Um pool com §connectionLimit: 1§ cede a única conexão e ela **não é devolvida** (falta o §release()§). O que acontece com a próxima consulta?\n\n${code('const pool = mysql.createPool({ /* ... */ connectionLimit: 1 });\nconst conexao = await pool.getConnection();\n// ... usa a conexão, mas esquece de chamar conexao.release()\nawait pool.query("SELECT 1"); // fica esperando por uma conexão livre')}`,
    opts: [h`Fica esperando indefinidamente por uma conexão livre`, [h`Cria uma segunda conexão automaticamente`, h`O limite do pool é respeitado: sem conexão livre, a requisição entra na fila de espera.`], [h`Falha imediatamente com erro de sintaxe`, h`A consulta está correta; o problema é a falta de conexão disponível.`], [h`Reaproveita a conexão que está em uso`, h`Uma conexão em uso não é compartilhada com outra consulta.`]],
    exp: h`O pool mantém um número máximo de conexões. Conexões obtidas com §pool.getConnection()§ precisam ser devolvidas com §release()§ (idealmente em um §finally§). Esquecer isso “vaza” a conexão e, ao esgotar o limite, novas consultas ficam na fila e a API parece travada. Já §pool.query()§ obtém e devolve a conexão automaticamente — por isso a aula o usa.`,
    src: [[A10, 'bancoDados.js: pool de conexões do mysql2/promise (connectionLimit)']],
    verify: sql("const porta = conn.config.port;\nconst pool = mysqlLib.createPool({ host: '127.0.0.1', port: porta, user: 'root', database: 'q', connectionLimit: 1, waitForConnections: true }).promise();\nconst c = await pool.getConnection();\nconst r = await Promise.race([pool.query('SELECT 1').then(() => 'respondeu'), new Promise((res) => setTimeout(() => res('esperando'), 700))]);\nconsole.log(r);", ['esperando', 'respondeu', 'erro', 'reaproveitou']),
  }),
  R(15, {
    diff: 'medio', scope: 'aula', sub: 'AS para camelCase',
    stem: h`${stem('Quais são as chaves do objeto retornado, na ordem?', 'const [[linha]] = await pool.query(\n  "SELECT id, nota, lugar_id AS lugarId, usuario_id AS usuarioId FROM avaliacoes WHERE id = 1"\n);\nconsole.log(Object.keys(linha));')}`,
    opts: [h`§["id","nota","lugarId","usuarioId"]§`, [h`§["id","nota","lugar_id","usuario_id"]§`, h`O §AS§ renomeia a coluna no resultado, então as chaves ficam em camelCase.`], [h`§["id","nota"]§`, h`Todas as quatro colunas foram selecionadas.`], [h`§["lugarId","usuarioId","id","nota"]§`, h`A ordem das chaves segue a ordem das colunas no §SELECT§.`]],
    exp: h`Os nomes das colunas no banco usam snake_case (§lugar_id§), mas o JavaScript do projeto espera camelCase. O apelido §AS lugarId§ muda o nome da coluna no resultado, evitando conversões no código — exatamente o que o TODO da aula pede.`,
    src: [[A10, 'listarTodasAvaliacoes: lugar_id AS lugarId, usuario_id AS usuarioId']],
    verify: sql("const [[linha]] = await conn.query('SELECT id, nota, lugar_id AS lugarId, usuario_id AS usuarioId FROM avaliacoes WHERE id = 1');\nconsole.log(Object.keys(linha));", ['["id","nota","lugarId","usuarioId"]', '["id","nota","lugar_id","usuario_id"]', '["id","nota"]', '["lugarId","usuarioId","id","nota"]']),
  }),
  R(16, {
    diff: 'medio', scope: 'aprofundamento', sub: 'TIMESTAMP padrão',
    stem: h`Uma avaliação é inserida **sem** informar §criado_em§ (coluna §TIMESTAMP DEFAULT CURRENT_TIMESTAMP§). O que o JavaScript recebe nessa coluna?\n\n${code('await pool.query(\n  "INSERT INTO avaliacoes (nota, comentario, lugar_id, usuario_id) VALUES (5, \'ok!\', 1, 1)"\n);\nconst [[linha]] = await pool.query("SELECT criado_em FROM avaliacoes ORDER BY id DESC LIMIT 1");\nconsole.log(linha.criado_em instanceof Date);')}`,
    opts: [h`§true§ — um objeto §Date§ com o instante da inserção`, [h`§false§ — chega §null§`, h`O banco preenche o valor padrão (§CURRENT_TIMESTAMP§) quando a coluna não é informada.`], [h`§false§ — chega como número`, h`O §mysql2§ converte §TIMESTAMP§ para §Date§ por padrão.`], [h`Erro: a coluna é obrigatória`, h`Como a coluna tem valor padrão, ela não precisa ser informada.`]],
    exp: h`O §DEFAULT CURRENT_TIMESTAMP§ faz o banco registrar o momento do §INSERT§. O driver devolve §TIMESTAMP§/§DATETIME§ como objetos §Date§. Ao enviar pela API em JSON, vira texto ISO.`,
    src: [[A10, 'schema.sql: criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP']],
    verify: sql("await conn.query(\"INSERT INTO avaliacoes (nota, comentario, lugar_id, usuario_id) VALUES (5, 'ok!', 1, 1)\");\nconst [[linha]] = await conn.query('SELECT criado_em FROM avaliacoes ORDER BY id DESC LIMIT 1');\nconsole.log(linha.criado_em instanceof Date);", ['true', 'false', 'false (número)', 'erro']),
  }),
  R(17, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Transações',
    stem: h`Quantas avaliações existem depois deste código (a tabela começa com 9)?\n\n${code('const conexao = await pool.getConnection();\nawait conexao.beginTransaction();\nawait conexao.query(\n  "INSERT INTO avaliacoes (nota, comentario, lugar_id, usuario_id) VALUES (5, \'teste\', 1, 1)"\n);\nawait conexao.rollback();\nconexao.release();\nconst [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM avaliacoes");\nconsole.log(total);')}`,
    opts: [h`§9§`, [h`§10§`, h`O §rollback()§ desfaz tudo o que foi feito desde o §beginTransaction()§, inclusive o §INSERT§.`], [h`§0§`, h`O rollback só desfaz o que aconteceu na transação, não apaga a tabela.`], [h`§8§`, h`Nada foi removido: a transação foi revertida e a tabela volta a 9.`]],
    exp: h`Uma transação agrupa operações “tudo ou nada”: com §rollback()§ o §INSERT§ é descartado e a tabela volta a ter 9 linhas; com §commit()§ ele seria confirmado (10). É essencial quando várias gravações precisam ser consistentes.`,
    src: [[A10, 'persistência real em MySQL (mysql2/promise): operações de escrita']],
    verify: sql("await conn.beginTransaction();\nawait conn.query(\"INSERT INTO avaliacoes (nota, comentario, lugar_id, usuario_id) VALUES (5, 'teste', 1, 1)\");\nawait conn.rollback();\nconst [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM avaliacoes');\nconsole.log(total);", ['9', '10', '0', '8']),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(18, {
    diff: 'dificil', scope: 'desafio', sub: 'NULL em comparações',
    stem: h`A tabela abaixo tem dois valores §NULL§ na coluna §nota§. Quantas linhas as duas consultas devolvem (1ª e 2ª, nesta ordem)?\n\n${code('CREATE TABLE teste (id INT, nota INT);\nINSERT INTO teste VALUES (1, 5), (2, NULL), (3, NULL);\n\nSELECT * FROM teste WHERE nota = NULL;     -- (1)\nSELECT * FROM teste WHERE nota IS NULL;    -- (2)', 'sql')}`,
    opts: [h`§0§ e §2§`, [h`§2§ e §2§`, h`Comparar com §NULL§ usando §=§ resulta em “desconhecido” (nunca verdadeiro); é preciso §IS NULL§.`], [h`§2§ e §0§`, h`É o contrário: §= NULL§ não encontra nada; §IS NULL§ encontra as duas linhas.`], [h`§0§ e §0§`, h`O §IS NULL§ encontra as linhas 2 e 3.`]],
    exp: h`Em SQL, §NULL§ representa “valor desconhecido”: qualquer comparação com §=§ ou §<>§ resulta em desconhecido e a linha não é devolvida. Só §IS NULL§ / §IS NOT NULL§ testam a ausência de valor. Resultado: 0 linhas e 2 linhas.`,
    src: [[A10, 'schema.sql: colunas NOT NULL vs. colunas que aceitam NULL']],
    verify: sql("await conn.query('CREATE TABLE teste (id INT, nota INT); INSERT INTO teste VALUES (1, 5), (2, NULL), (3, NULL)');\nconst [a] = await conn.query('SELECT * FROM teste WHERE nota = NULL');\nconst [b] = await conn.query('SELECT * FROM teste WHERE nota IS NULL');\nconsole.log(a.length, b.length);", ['0 2', '2 2', '2 0', '0 0']),
  }),
  R(19, {
    diff: 'dificil', scope: 'desafio', sub: 'COUNT(*) versus COUNT(coluna)',
    stem: h`Com a tabela do exemplo anterior (notas §5, NULL, NULL§), qual é o resultado de cada contagem?\n\n${code('SELECT COUNT(*), COUNT(nota) FROM teste;', 'sql')}`,
    opts: [h`§3§ e §1§`, [h`§3§ e §3§`, h`§COUNT(coluna)§ ignora os valores §NULL§; só §COUNT(*)§ conta todas as linhas.`], [h`§1§ e §1§`, h`§COUNT(*)§ conta as linhas inteiras, inclusive as com §NULL§.`], [h`§3§ e §0§`, h`Há um valor não nulo (5), então §COUNT(nota)§ vale 1.`]],
    exp: h`§COUNT(*)§ conta linhas (3). §COUNT(nota)§ conta apenas as linhas em que §nota§ não é §NULL§ (1). A diferença importa em médias e totais: §AVG(nota)§, por exemplo, também ignora §NULL§ (aqui seria 5).`,
    src: [[A10, 'agregações sobre avaliacoes (COUNT/AVG)']],
    verify: sql("await conn.query('CREATE TABLE teste (id INT, nota INT); INSERT INTO teste VALUES (1, 5), (2, NULL), (3, NULL)');\nconst [[r]] = await conn.query('SELECT COUNT(*) AS a, COUNT(nota) AS b FROM teste');\nconsole.log(r.a, r.b);", ['3 1', '3 3', '1 1', '3 0']),
  }),
  R(20, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'DELETE sem WHERE',
    stem: h`${stem('O desenvolvedor esquece o §WHERE§. Quantas linhas o §DELETE§ remove (§affectedRows§)?', 'const [r] = await pool.query("DELETE FROM avaliacoes");\nconsole.log(r.affectedRows);')}`,
    opts: [h`§9§ — todas as avaliações`, [h`§1§`, h`Sem §WHERE§ o §DELETE§ apaga *todas* as linhas da tabela, não apenas uma.`], [h`§0§ — o banco exige um §WHERE§`, h`O MySQL aceita §DELETE§ sem §WHERE§ (a menos que o modo de atualização segura esteja ativo no cliente).`], [h`Um erro de sintaxe`, h`A sintaxe é válida; o problema é de lógica.`]],
    exp: h`Sem cláusula §WHERE§, §DELETE§ e §UPDATE§ atingem *todas* as linhas. Por isso a regra é parametrizar sempre o filtro (§WHERE id = ?§) e testar em ambiente de desenvolvimento antes. Transações e backups ajudam a se recuperar de erros assim.`,
    src: [[A10, 'repositórios: queries com WHERE e placeholders']],
    verify: sql("const [r] = await conn.query('DELETE FROM avaliacoes');\nconsole.log(r.affectedRows);", ['9', '1', '0', 'erro']),
  }),
  R(21, {
    diff: 'dificil', scope: 'desafio', sub: 'Múltiplos comandos desativados',
    stem: h`Uma conexão do §mysql2§ **sem** a opção §multipleStatements§ recebe uma entrada maliciosa concatenada. Qual é o código de erro?\n\n${code('const entrada = "1; DROP TABLE avaliacoes";\ntry {\n  await pool.query("SELECT * FROM avaliacoes WHERE id = " + entrada);\n} catch (e) {\n  console.log(e.code);\n}')}`,
    opts: [h`§ER_PARSE_ERROR§`, [h`Nenhum erro: a tabela é apagada`, h`Por padrão o §mysql2§ desativa múltiplos comandos, o que bloqueia esse tipo de ataque “em pilha”.`], [h`§ER_NO_SUCH_TABLE§`, h`A tabela existe; o erro acontece antes, ao analisar o SQL com duas instruções.`], [h`§ER_DUP_ENTRY§`, h`Esse erro é de valor duplicado em chave única.`]],
    exp: h`Por segurança, o §mysql2§ envia um único comando por chamada (§multipleStatements: false§ por padrão). A instrução com §;§ dá erro de sintaxe e não executa o §DROP TABLE§. Mesmo assim, concatenar entradas segue sendo perigoso (como na injeção com §OR '1'='1'§) — o correto é usar §?§.`,
    src: [[A10, 'nunca concatene valores na string SQL (SQL injection)']],
    verify: sql("const seguro = await mysqlLib.createConnection({ host: '127.0.0.1', port: conn.config.port, user: 'root', database: 'q' });\nconst entrada = '1; DROP TABLE avaliacoes';\ntry {\n  await seguro.promise().query('SELECT * FROM avaliacoes WHERE id = ' + entrada);\n  console.log('sem erro');\n} catch (e) {\n  console.log(e.code);\n}\nseguro.end();", ['ER_PARSE_ERROR', 'sem erro', 'ER_NO_SUCH_TABLE', 'ER_DUP_ENTRY']),
  }),
  R(22, {
    diff: 'dificil', scope: 'desafio', sub: 'Identificadores com ??',
    stem: h`Qual SQL o §mysql.format§ monta quando o nome da coluna de ordenação também vem de um parâmetro?\n\n${code('console.log(mysql.format("SELECT * FROM avaliacoes ORDER BY ?", ["nota"]));\nconsole.log(mysql.format("SELECT * FROM avaliacoes ORDER BY ??", ["nota"]));')}`,
    opts: [h`1ª: §ORDER BY 'nota'§ (texto, sem efeito); 2ª: a coluna §nota§ entre crases`, [h`Nas duas, a coluna §nota§ sem aspas`, h`O §?§ trata o valor como *literal* (texto entre aspas); só §??§ trata como identificador (nome de coluna).`], [h`1ª: a coluna §nota§ entre crases; 2ª: §ORDER BY 'nota'§ (texto)`, h`Está invertido: §??§ → identificador entre crases; §?§ → texto entre aspas.`], [h`Um erro nas duas linhas`, h`Ambos os formatos são aceitos pela biblioteca; apenas geram SQL com significados diferentes.`]],
    exp: h`O placeholder §?§ serve para *valores*; texto vira literal entre aspas, o que em §ORDER BY§ ordena por uma constante (sem efeito). Para nomes de colunas/tabelas existe §??§, que escapa identificadores com crases. Mesmo assim, valide identificadores contra uma lista permitida (nunca confie na entrada do usuário).`,
    src: [[A10, 'Sempre use ? como placeholder e passe os valores em um array']],
    verify: sql('console.log(mysqlLib.format("SELECT * FROM avaliacoes ORDER BY ?", ["nota"]));\nconsole.log(mysqlLib.format("SELECT * FROM avaliacoes ORDER BY ??", ["nota"]));', ["SELECT * FROM avaliacoes ORDER BY 'nota'\nSELECT * FROM avaliacoes ORDER BY `nota`", 'SELECT * FROM avaliacoes ORDER BY nota\nSELECT * FROM avaliacoes ORDER BY nota', "SELECT * FROM avaliacoes ORDER BY `nota`\nSELECT * FROM avaliacoes ORDER BY 'nota'", 'erro']),
  }),
  R(23, {
    diff: 'dificil', scope: 'desafio', sub: 'Escape de aspas',
    stem: h`Como o §mysql.format§ escreve o texto §O'Brien§ ao usá-lo como parâmetro?\n\n${code('console.log(mysql.format("SELECT * FROM usuarios WHERE nome = ?", ["O\'Brien"]));')}`,
    opts: [h`§SELECT * FROM usuarios WHERE nome = 'O\'Brien'§`, [h`§SELECT * FROM usuarios WHERE nome = 'O'Brien'§`, h`Sem escape a aspa simples fecharia o texto e quebraria (ou alteraria) a consulta; o driver a protege com barra invertida.`], [h`§SELECT * FROM usuarios WHERE nome = O'Brien§`, h`Textos sempre entram entre aspas simples no SQL.`], [h`§SELECT * FROM usuarios WHERE nome = ?§`, h`O §?§ é substituído pelo valor já escapado.`]],
    exp: h`Os placeholders escapam caracteres especiais dos textos (aspas, barras invertidas etc.): §O'Brien§ vira §'O\'Brien'§. Assim uma aspa no valor não altera a estrutura da consulta — é o mecanismo que impede a injeção do exemplo com §OR '1'='1'§.`,
    src: [[A10, 'Sempre use ? como placeholder (proteção contra SQL injection)']],
    verify: sql('console.log(mysqlLib.format("SELECT * FROM usuarios WHERE nome = ?", ["O\'Brien"]));', ["SELECT * FROM usuarios WHERE nome = 'O\\'Brien'", "SELECT * FROM usuarios WHERE nome = 'O'Brien'", "SELECT * FROM usuarios WHERE nome = O'Brien", 'SELECT * FROM usuarios WHERE nome = ?']),
  }),
  R(24, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Paginação',
    stem: h`${stem('Quais ids as avaliações da “página 2” (3 por página) têm?', 'const porPagina = 3, pagina = 2;\nconst [linhas] = await pool.query(\n  "SELECT id FROM avaliacoes ORDER BY id LIMIT ? OFFSET ?",\n  [porPagina, (pagina - 1) * porPagina]\n);\nconsole.log(linhas.map((l) => l.id));')}`,
    opts: [h`§[4,5,6]§`, [h`§[3,4,5]§`, h`O §OFFSET§ é 3 (pula as 3 primeiras): a página 2 começa no id 4.`], [h`§[1,2,3]§`, h`Esses são os ids da página 1 (OFFSET 0).`], [h`§[6,7,8]§`, h`Isso seria a página 3 (OFFSET 6).`]],
    exp: h`Paginação: §LIMIT§ define quantas linhas e §OFFSET§ quantas pular. Para a página 2 com 3 por página, §OFFSET = (2 − 1) × 3 = 3§: pula os ids 1–3 e devolve 4, 5 e 6. O §ORDER BY§ é necessário para a ordem ser previsível.`,
    src: [[A10, 'listarTodasAvaliacoes: ORDER BY id (ordem previsível)']],
    verify: sql("const porPagina = 3, pagina = 2;\nconst [linhas] = await conn.query('SELECT id FROM avaliacoes ORDER BY id LIMIT ? OFFSET ?', [porPagina, (pagina - 1) * porPagina]);\nconsole.log(linhas.map((l) => l.id));", ['[4,5,6]', '[3,4,5]', '[1,2,3]', '[6,7,8]']),
  }),
  R(25, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'JOIN com usuários',
    stem: h`${stem('O que a consulta devolve para o lugar 1 (Café Aroma)?', 'const [linhas] = await pool.query(\n  `SELECT u.nome, a.nota\n   FROM avaliacoes a\n   JOIN usuarios u ON u.id = a.usuario_id\n   WHERE a.lugar_id = ?\n   ORDER BY a.nota DESC, u.nome`,\n  [1]\n);\nconsole.log(JSON.stringify(linhas));')}`,
    opts: [h`§[{"nome":"Marina Souza","nota":5},{"nome":"Diego Lima","nota":4}]§`, [h`§[{"nome":"Diego Lima","nota":4},{"nome":"Marina Souza","nota":5}]§`, h`§ORDER BY a.nota DESC§ coloca a maior nota (5) primeiro.`], [h`§[{"nome":"Marina Souza","nota":5}]§`, h`O lugar 1 tem duas avaliações (a de Marina e a de Diego).`], [h`§[]§`, h`O §JOIN§ casa cada avaliação com o seu usuário, e há avaliações do lugar 1.`]],
    exp: h`O §JOIN§ liga cada avaliação ao usuário que a escreveu (§usuario_id§ → §usuarios.id§). O lugar 1 tem duas avaliações: Marina (5) e Diego (4). A ordenação por nota decrescente coloca Marina primeiro.`,
    src: [[A10, 'schema.sql: avaliacoes.usuario_id referencia usuarios(id)']],
    verify: sql("const [linhas] = await conn.query('SELECT u.nome, a.nota FROM avaliacoes a JOIN usuarios u ON u.id = a.usuario_id WHERE a.lugar_id = ? ORDER BY a.nota DESC, u.nome', [1]);\nconsole.log(JSON.stringify(linhas));", ['[{"nome":"Marina Souza","nota":5},{"nome":"Diego Lima","nota":4}]', '[{"nome":"Diego Lima","nota":4},{"nome":"Marina Souza","nota":5}]', '[{"nome":"Marina Souza","nota":5}]', '[]']),
  }),
  R(26, {
    diff: 'dificil', scope: 'desafio', sub: 'Média por lugar com LEFT JOIN e COALESCE',
    stem: h`Depois de cadastrar um novo lugar (id 7) sem avaliações, qual é o resultado desta consulta (ids 2 e 7)?\n\n${code('SELECT l.id, COALESCE(ROUND(AVG(a.nota), 1), 0) AS notaMedia\nFROM lugares l\nLEFT JOIN avaliacoes a ON a.lugar_id = l.id\nWHERE l.id IN (2, 7)\nGROUP BY l.id\nORDER BY l.id;', 'sql')}\nO resultado é lido com §mysql2§ (que devolve §DECIMAL§ como texto) e impresso com §JSON.stringify§.`,
    opts: [h`§[{"id":2,"notaMedia":"4.0"},{"id":7,"notaMedia":"0.0"}]§`, [h`§[{"id":2,"notaMedia":4},{"id":7,"notaMedia":0}]§`, h`O driver entrega colunas §DECIMAL§ como texto; os valores chegam entre aspas.`], [h`§[{"id":2,"notaMedia":"4.0"},{"id":7,"notaMedia":null}]§`, h`O §COALESCE§ troca o §NULL§ da média pelo valor 0.`], [h`§[{"id":2,"notaMedia":"4.0"}]§`, h`O §LEFT JOIN§ mantém o lugar 7 mesmo sem avaliações.`]],
    exp: h`O §LEFT JOIN§ preserva o lugar 7 (sem avaliações); §AVG§ dá §NULL§ nele e §COALESCE(..., 0)§ o transforma em 0. Como a coluna é §DECIMAL§ (escala 1), o driver entrega §"4.0"§ e §"0.0"§ (texto, com a mesma escala) — tipos que a API deve converter antes de usar como números.`,
    src: [[A10, 'notaMedia por lugar vinda do banco (substitui calcularMedia em memória)']],
    verify: sql("await conn.query(\"INSERT INTO lugares (nome, categoria, cidade, descricao) VALUES ('Novo', 'Parque', 'Recife', 'x')\");\nconst [linhas] = await conn.query('SELECT l.id, COALESCE(ROUND(AVG(a.nota), 1), 0) AS notaMedia FROM lugares l LEFT JOIN avaliacoes a ON a.lugar_id = l.id WHERE l.id IN (2, 7) GROUP BY l.id ORDER BY l.id');\nconsole.log(JSON.stringify(linhas));", ['[{"id":2,"notaMedia":"4.0"},{"id":7,"notaMedia":"0.0"}]', '[{"id":2,"notaMedia":4},{"id":7,"notaMedia":0}]', '[{"id":2,"notaMedia":"4.0"},{"id":7,"notaMedia":null}]', '[{"id":2,"notaMedia":"4.0"}]']),
  }),
];

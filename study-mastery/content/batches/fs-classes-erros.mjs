// Lote fs-classes-erros — Classes, validação e erros customizados: 7 fáceis (001–007), 7 médias (008–014), 8 difíceis (015–022).
// Base: Aula 05 (README e starter: ErroValidacao, Lugar, Usuario, Avaliacao; nota inteira de 1 a 5; senhaHash).
// Verificação REAL: todo código mostrado no enunciado é executado em Node isolado e a saída é comparada às alternativas.
import { m } from '../../tools/lib/dsl.ts';

const A5 = 'fs-aula-05';
const R = (n, o) => ({ d: 'fullstack', topic: 'classes-erros', ...o, id: `fs-classes-erros-${String(n).padStart(3, '0')}` });
const h = (strings, ...v) => m(strings, ...v).replaceAll('§', '`').replaceAll('\\n', '\n');
const code = (src) => '§§§js\n'.replaceAll('§', '`') + src.trim() + '\n§§§'.replaceAll('§', '`');
const saida = (src) => `O que o código abaixo imprime no console?\n\n${code(src)}`;
const js = (src, values, extra = {}) => ({ kind: 'js', params: { code: src, ...extra }, values });

const ERRO = `class ErroValidacao extends Error {
  constructor(mensagem, campo) {
    super(mensagem);
    this.name = "ErroValidacao";
    this.campo = campo;
  }
}`;
const comErro = (corpo) => `${ERRO}\n${corpo}`;

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'ErroValidacao',
    stem: h`${saida(comErro('const erro = new ErroValidacao("nota inválida", "nota");\nconsole.log(erro.name, erro.campo, erro instanceof Error);'))}`,
    opts: [h`§ErroValidacao nota true§`, [h`§Error nota true§`, h`A classe define §this.name = "ErroValidacao"§; sem isso o nome herdado seria §Error§.`], [h`§ErroValidacao undefined true§`, h`O segundo parâmetro do construtor é guardado em §this.campo§ (aqui §"nota"§).`], [h`§ErroValidacao nota false§`, h`§ErroValidacao§ estende §Error§, então §erro instanceof Error§ é §true§.`]],
    exp: h`A classe chama §super(mensagem)§, define §this.name = "ErroValidacao"§ e guarda o campo em §this.campo§. Como estende §Error§, o objeto também é uma instância de §Error§. Saída: §ErroValidacao nota true§. É a classe pedida em §js/erro-validacao.js§.`,
    src: [[A5, '1. js/erro-validacao.js — ErroValidacao: super, this.name e this.campo']],
    verify: js(comErro('const erro = new ErroValidacao("nota inválida", "nota");\nconsole.log(erro.name, erro.campo, erro instanceof Error);'), ['ErroValidacao nota true', 'Error nota true', 'ErroValidacao undefined true', 'ErroValidacao nota false']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'super() antes de this',
    stem: h`${saida('class ErroValidacao extends Error {\n  constructor(mensagem, campo) {\n    this.name = "ErroValidacao";\n    this.campo = campo;\n    super(mensagem);\n  }\n}\ntry {\n  new ErroValidacao("x", "nota");\n} catch (e) {\n  console.log(e.name);\n}')}`,
    opts: [h`§ReferenceError§`, [h`§ErroValidacao§`, h`O objeto nem chega a ser criado: o erro ocorre ao usar §this§ antes do §super()§, e quem é lançado é um §ReferenceError§.`], [h`§TypeError§`, h`O erro específico para usar §this§ antes de §super()§ é §ReferenceError§.`], [h`§SyntaxError§`, h`O código é sintaticamente válido; o problema só aparece em tempo de execução.`]],
    exp: h`Em uma classe que estende outra, §this§ só existe depois de §super(...)§. Acessar §this§ antes lança §ReferenceError§ (“Must call super constructor in derived class before accessing 'this'”). Por isso a aula insiste: “§super(...)§ como a primeira linha do construtor”.`,
    src: [[A5, '1. ErroValidacao: super(...) como a primeira linha do construtor, antes de usar this']],
    verify: js('class ErroValidacao extends Error {\n  constructor(mensagem, campo) {\n    this.name = "ErroValidacao";\n    this.campo = campo;\n    super(mensagem);\n  }\n}\ntry {\n  new ErroValidacao("x", "nota");\n} catch (e) {\n  console.log(e.name);\n}', ['ReferenceError', 'ErroValidacao', 'TypeError', 'SyntaxError']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'instanceof',
    stem: h`${saida(comErro('const erro = new ErroValidacao("x", "nome");\nconsole.log(erro instanceof ErroValidacao, erro instanceof Error, erro instanceof TypeError);'))}`,
    opts: [h`§true true false§`, [h`§true false false§`, h`Uma subclasse de §Error§ também é instância de §Error§ (herança).`], [h`§true true true§`, h`§TypeError§ é outra subclasse de §Error§, sem relação com §ErroValidacao§.`], [h`§false true false§`, h`§erro§ foi criado com §new ErroValidacao§, logo é instância dela.`]],
    exp: h`§instanceof§ percorre a cadeia de protótipos: o objeto é um §ErroValidacao§ e, por herança, um §Error§; mas não é um §TypeError§ (classe irmã). Saída: §true true false§. É assim que se distingue erro de validação de outros erros no §catch§.`,
    src: [[A5, 'erro customizado que estende Error e carrega o nome do campo']],
    verify: js(comErro('const erro = new ErroValidacao("x", "nome");\nconsole.log(erro instanceof ErroValidacao, erro instanceof Error, erro instanceof TypeError);'), ['true true false', 'true false false', 'true true true', 'false true false']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'Nome padrão do erro',
    stem: h`${saida('class ErroSimples extends Error {}\nconst e = new ErroSimples("falhou");\nconsole.log(e.name, e.message);')}`,
    opts: [h`§Error falhou§`, [h`§ErroSimples falhou§`, h`O §name§ não é preenchido automaticamente com o nome da classe; é herdado de §Error§ (§"Error"§) até ser definido.`], [h`§undefined falhou§`, h`§name§ existe em todo §Error§ (valor padrão §"Error"§).`], [h`§Error undefined§`, h`A mensagem passada ao §new§ é guardada em §message§ pelo construtor herdado.`]],
    exp: h`Sem construtor próprio, a subclasse usa o de §Error§: §message§ vira §"falhou"§, mas §name§ continua sendo o valor herdado §"Error"§. É por isso que a aula manda definir §this.name = "ErroValidacao"§ — para o erro se identificar corretamente.`,
    src: [[A5, '1. defina this.name = "ErroValidacao" (por padrão, herdaria o nome genérico "Error")']],
    verify: js('class ErroSimples extends Error {}\nconst e = new ErroSimples("falhou");\nconsole.log(e.name, e.message);', ['Error falhou', 'ErroSimples falhou', 'undefined falhou', 'Error undefined']),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'Number.isInteger',
    stem: h`${saida('console.log(Number.isInteger(5), Number.isInteger(4.5), Number.isInteger("5"));')}`,
    opts: [h`§true false false§`, [h`§true false true§`, h`§Number.isInteger§ não converte tipos: a string §"5"§ não é um número inteiro.`], [h`§true true false§`, h`§4.5§ tem parte decimal, portanto não é inteiro.`], [h`§false false false§`, h`§5§ é um número inteiro.`]],
    exp: h`§Number.isInteger(x)§ é §true§ só quando §x§ é do tipo número *e* inteiro: §5§ sim; §4.5§ não (decimal); §"5"§ não (é string). É a verificação da regra “nota precisa ser um inteiro de 1 a 5” da classe §Avaliacao§.`,
    src: [[A5, '4. Avaliacao: nota precisa ser um NÚMERO INTEIRO entre 1 e 5 (dica: Number.isInteger)']],
    verify: js('console.log(Number.isInteger(5), Number.isInteger(4.5), Number.isInteger("5"));', ['true false false', 'true false true', 'true true false', 'false false false']),
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'Validação da nota',
    stem: h`${saida('const notaValida = (n) => Number.isInteger(n) && n >= 1 && n <= 5;\nconsole.log([0, 3, 4.5, 6].map(notaValida));')}`,
    opts: [h`§[false,true,false,false]§`, [h`§[false,true,true,false]§`, h`§4.5§ está entre 1 e 5, mas não é inteiro: a regra do domínio rejeita decimais.`], [h`§[true,true,false,true]§`, h`§0§ e §6§ estão fora do intervalo de 1 a 5 e são rejeitados.`], [h`§[false,true,false,true]§`, h`§6§ passa de 5, então é inválido.`]],
    exp: h`A regra exige inteiro *e* entre 1 e 5: §0§ (fora) → falso; §3§ → verdadeiro; §4.5§ (decimal) → falso; §6§ (fora) → falso. Resultado: §[false,true,false,false]§. A aula pede que §new Avaliacao(1, 0, ...)§, §6§ e §4.5§ lancem §ErroValidacao§.`,
    src: [[A5, 'critérios de aceite: nota 0, 6 e 4.5 lançam ErroValidacao']],
    verify: js('const notaValida = (n) => Number.isInteger(n) && n >= 1 && n <= 5;\nconsole.log([0, 3, 4.5, 6].map(notaValida));', ['[false,true,false,false]', '[false,true,true,false]', '[true,true,false,true]', '[false,true,false,true]']),
  }),
  R(7, {
    diff: 'facil', scope: 'aula', sub: 'Regex de e-mail',
    stem: h`${saida('const emailValido = (s) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(s);\nconsole.log(emailValido("marina@example.com"), emailValido("nao-e-um-email"), emailValido("a@b"));')}`,
    opts: [h`§true false false§`, [h`§true false true§`, h`§"a@b"§ não tem ponto depois do @, e a regex exige §\.§ seguido de mais caracteres.`], [h`§true true false§`, h`§"nao-e-um-email"§ não contém §@§, então é inválido.`], [h`§false false false§`, h`§"marina@example.com"§ segue o formato esperado.`]],
    exp: h`A regex exige: algo sem espaços/§@§, depois §@§, algo, um ponto e algo mais. §marina@example.com§ passa; §nao-e-um-email§ não tem §@§; §a@b§ não tem o ponto. Resultado: §true false false§ — a validação “simples” sugerida no starter da classe §Usuario§.`,
    src: [[A5, '3. Usuario: email com regex /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/']],
    verify: js('const emailValido = (s) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(s);\nconsole.log(emailValido("marina@example.com"), emailValido("nao-e-um-email"), emailValido("a@b"));', ['true false false', 'true false true', 'true true false', 'false false false']),
  }),

  // ---------------- MÉDIAS ----------------
  R(8, {
    diff: 'medio', scope: 'aula', sub: 'Texto do erro',
    stem: h`${saida(comErro('console.log(String(new ErroValidacao("falhou", "nome")));'))}`,
    opts: [h`§ErroValidacao: falhou§`, [h`§Error: falhou§`, h`A conversão para texto usa o §name§ atual do objeto, que a classe define como §"ErroValidacao"§.`], [h`§falhou§`, h`§String(erro)§ inclui o nome do erro seguido de dois-pontos e da mensagem.`], [h`§ErroValidacao: nome§`, h`A mensagem é o primeiro argumento (§"falhou"§); §"nome"§ é o campo, guardado à parte em §campo§.`]],
    exp: h`§Error.prototype.toString§ devolve “§name: message§”. Como a classe define §name§ como §"ErroValidacao"§ e a mensagem foi §"falhou"§, o resultado é §ErroValidacao: falhou§; o campo (§"nome"§) fica em §erro.campo§.`,
    src: [[A5, 'ErroValidacao(mensagem, campo): mensagem + nome do campo']],
    verify: js(comErro('console.log(String(new ErroValidacao("falhou", "nome")));'), ['ErroValidacao: falhou', 'Error: falhou', 'falhou', 'ErroValidacao: nome']),
  }),
  R(9, {
    diff: 'medio', scope: 'aula', sub: 'Tratar ErroValidacao no catch',
    stem: h`${saida(comErro('function criar(nota) {\n  if (!Number.isInteger(nota)) throw new ErroValidacao("nota inválida", "nota");\n  return nota;\n}\nfor (const n of [5, 4.5]) {\n  try {\n    console.log("ok", criar(n));\n  } catch (e) {\n    console.log(e instanceof ErroValidacao ? "validação:" + e.campo : "outro");\n  }\n}'))}`,
    opts: [h`§ok 5§ e depois §validação:nota§`, [h`§ok 5§ e depois §ok 4.5§`, h`§4.5§ não é inteiro: a função lança §ErroValidacao§ e o §catch§ é executado.`], [h`§ok 5§ e depois §outro§`, h`O erro lançado é um §ErroValidacao§, então o §instanceof§ é verdadeiro.`], [h`Apenas §validação:nota§`, h`Para §5§ a função retorna normalmente e imprime §ok 5§.`]],
    exp: h`Para §5§, §criar§ retorna e imprime §ok 5§. Para §4.5§ lança §ErroValidacao§ com campo §"nota"§; o §catch§ usa §instanceof§ para reconhecer o tipo e imprime §validação:nota§. É o uso do campo no formulário da Aula 07: destacar o campo errado sem ler o texto da mensagem.`,
    src: [[A5, 'ErroValidacao carrega o campo que falhou (permite destacar o campo errado em um formulário)']],
    verify: js(comErro('function criar(nota) {\n  if (!Number.isInteger(nota)) throw new ErroValidacao("nota inválida", "nota");\n  return nota;\n}\nfor (const n of [5, 4.5]) {\n  try {\n    console.log("ok", criar(n));\n  } catch (e) {\n    console.log(e instanceof ErroValidacao ? "validação:" + e.campo : "outro");\n  }\n}'), ['ok 5\nvalidação:nota', 'ok 5\nok 4.5', 'ok 5\noutro', 'validação:nota']),
  }),
  R(10, {
    diff: 'medio', scope: 'aula', sub: 'Ordem das validações',
    stem: h`${saida(comErro('class Lugar {\n  constructor(nome, categoria) {\n    if (typeof nome !== "string" || nome.length < 2) throw new ErroValidacao("nome inválido", "nome");\n    if (typeof categoria !== "string" || categoria === "") throw new ErroValidacao("categoria inválida", "categoria");\n    this.nome = nome;\n    this.categoria = categoria;\n  }\n}\ntry {\n  new Lugar("C", "");\n} catch (e) {\n  console.log(e.campo);\n}'))}`,
    opts: [h`§nome§`, [h`§categoria§`, h`A primeira validação que falha interrompe o construtor com §throw§; a da categoria nem é avaliada.`], [h`§nome,categoria§`, h`Cada §throw§ encerra a execução; só um erro é lançado por vez.`], [h`Nada, porque o objeto é criado mesmo assim`, h`O §throw§ impede a criação do objeto.`]],
    exp: h`Os campos são validados na ordem do código; §"C"§ tem menos de 2 caracteres, então o primeiro §throw§ dispara com campo §"nome"§ e o construtor termina ali. Por isso a aula pede para validar “nesta ordem, antes de atribuir qualquer coisa a §this§”.`,
    src: [[A5, '2. Lugar: valide, nesta ordem, nome, categoria, cidade, descricao']],
    verify: js(comErro('class Lugar {\n  constructor(nome, categoria) {\n    if (typeof nome !== "string" || nome.length < 2) throw new ErroValidacao("nome inválido", "nome");\n    if (typeof categoria !== "string" || categoria === "") throw new ErroValidacao("categoria inválida", "categoria");\n    this.nome = nome;\n    this.categoria = categoria;\n  }\n}\ntry {\n  new Lugar("C", "");\n} catch (e) {\n  console.log(e.campo);\n}'), ['nome', 'categoria', 'nome,categoria', '']),
  }),
  R(11, {
    diff: 'medio', scope: 'aula', sub: 'instanceof em relações entre classes',
    stem: h`${saida(comErro('class Lugar {\n  constructor(nome) { this.nome = nome; }\n}\nclass Avaliacao {\n  constructor(nota, lugar) {\n    if (!(lugar instanceof Lugar)) throw new ErroValidacao("lugar inválido", "lugar");\n    this.nota = nota;\n    this.lugar = lugar;\n  }\n}\ntry {\n  new Avaliacao(5, { nome: "Café Aroma" });\n  console.log("criou");\n} catch (e) {\n  console.log(e.name, e.campo);\n}'))}`,
    opts: [h`§ErroValidacao lugar§`, [h`§criou§`, h`Um objeto literal com a mesma forma não é uma *instância* de §Lugar§; §instanceof§ compara a cadeia de protótipos.`], [h`§TypeError lugar§`, h`Quem lança é o código da classe: um §ErroValidacao§, não um §TypeError§.`], [h`§ErroValidacao nota§`, h`O campo que falha é §lugar§; a nota (§5§) é válida.`]],
    exp: h`§{ nome: "Café Aroma" }§ é um objeto simples, não foi criado por §new Lugar(...)§; então §lugar instanceof Lugar§ é falso e o construtor de §Avaliacao§ lança §ErroValidacao§ no campo §"lugar"§. A aula exige que §lugar§ seja instância de §Lugar§ e §usuario§ de §Usuario§.`,
    src: [[A5, '4. Avaliacao: lugar precisa ser uma instância de Lugar (lugar instanceof Lugar)']],
    verify: js(comErro('class Lugar {\n  constructor(nome) { this.nome = nome; }\n}\nclass Avaliacao {\n  constructor(nota, lugar) {\n    if (!(lugar instanceof Lugar)) throw new ErroValidacao("lugar inválido", "lugar");\n    this.nota = nota;\n    this.lugar = lugar;\n  }\n}\ntry {\n  new Avaliacao(5, { nome: "Café Aroma" });\n  console.log("criou");\n} catch (e) {\n  console.log(e.name, e.campo);\n}'), ['ErroValidacao lugar', 'criou', 'TypeError lugar', 'ErroValidacao nota']),
  }),
  R(12, {
    diff: 'medio', scope: 'aula', sub: 'Senha nunca em texto puro',
    stem: h`Na classe §Usuario§ da Aula 05, qual é a prática correta sobre a senha?`,
    opts: [h`Guardar apenas um hash no campo §senhaHash§ — nunca a senha em texto puro`, [h`Guardar a senha em um campo §senha§ para conferir no login`, h`A aula proíbe guardar a senha em texto puro; o campo se chama §senhaHash§ para deixar isso explícito.`], [h`Guardar a senha criptografada com uma chave que o servidor conhece`, h`Para senhas usa-se *hash* (sem volta), com bcrypt (aula 11); criptografia reversível não é a prática indicada.`], [h`Não validar o campo, pois a senha é secreta`, h`A classe valida que §senhaHash§ é uma string não vazia.`]],
    exp: h`A classe §Usuario§ valida §senhaHash§ (string não vazia) e o nome do campo já deixa claro que o valor guardado é um *hash*. O hash de verdade chega na Aula 11 com bcrypt; “nunca guarde a senha em texto puro”.`,
    src: [[A5, '3. Usuario: NUNCA guarde a senha em texto puro; senhaHash']],
    verify: { kind: 'source', claims: [h`README Aula 05, item 3: “Valide ... senhaHash (string não vazia). Nunca guarde a senha em texto puro — o hash de verdade (bcrypt) chega na aula 11, mas a classe já deve deixar isso explícito no nome do campo.”`] },
  }),
  R(13, {
    diff: 'medio', scope: 'aprofundamento', sub: 'throw de valores que não são Error',
    stem: h`${saida('try {\n  throw "falhou";\n} catch (e) {\n  console.log(typeof e, e instanceof Error);\n}')}`,
    opts: [h`§string false§`, [h`§object true§`, h`O §throw§ lança exatamente o valor dado; aqui uma string, que não é um objeto §Error§.`], [h`§string true§`, h`Strings não são instâncias de §Error§.`], [h`§undefined false§`, h`O valor capturado é a própria string §"falhou"§.`]],
    exp: h`JavaScript permite lançar qualquer valor, mas lançar string perde §name§, §message§ e §stack§. Por isso a aula lança objetos da classe §ErroValidacao§ (que estende §Error§), que carregam informação útil e permitem usar §instanceof§.`,
    src: [[A5, 'erro customizado em vez de um Error genérico']],
    verify: js('try {\n  throw "falhou";\n} catch (e) {\n  console.log(typeof e, e instanceof Error);\n}', ['string false', 'object true', 'string true', 'undefined false']),
  }),
  R(14, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Normalizar e-mail',
    stem: h`${saida('const email = "Marina@Example.COM";\nconsole.log(email.toLowerCase() === "marina@example.com", email === "marina@example.com");')}`,
    opts: [h`§true false§`, [h`§true true§`, h`A comparação de strings diferencia maiúsculas de minúsculas; sem normalizar, §email === "marina@..."§ é falso.`], [h`§false false§`, h`Depois de §toLowerCase()§ o texto fica igual a §"marina@example.com"§.`], [h`§false true§`, h`É o contrário: só a versão normalizada coincide.`]],
    exp: h`§toLowerCase()§ transforma tudo em minúsculas, então a primeira comparação é §true§; a original, com letras maiúsculas, é diferente (§false§). O starter de §Usuario§ sugere “pode normalizar para minúsculas” para evitar duplicidade de contas por diferença de caixa.`,
    src: [[A5, '3. Usuario: this.email (dica: pode normalizar para minúsculas)']],
    verify: js('const email = "Marina@Example.COM";\nconsole.log(email.toLowerCase() === "marina@example.com", email === "marina@example.com");', ['true false', 'true true', 'false false', 'false true']),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(15, {
    diff: 'dificil', scope: 'desafio', sub: 'Propriedades enumeráveis do erro',
    stem: h`${saida(comErro('const erro = new ErroValidacao("nota inválida", "nota");\nconsole.log(Object.keys(erro));\nconsole.log(Object.hasOwn(erro, "message"));'))}`,
    opts: [h`§["name","campo"]§ e depois §true§`, [h`§["message","name","campo"]§ e depois §true§`, h`§message§ existe como propriedade própria do erro, mas é *não enumerável*, então §Object.keys§ não a lista.`], [h`§["name","campo"]§ e depois §false§`, h`Quando se passa uma mensagem ao construtor, ela é criada como propriedade própria (não herdada).`], [h`§["campo"]§ e depois §true§`, h`§this.name = ...§ é uma atribuição no objeto: cria uma propriedade própria *enumerável*, que aparece em §Object.keys§.`]],
    exp: h`As atribuições do construtor (§this.name§ e §this.campo§) criam propriedades próprias enumeráveis: §["name","campo"]§. Já §message§ é definida pelo construtor de §Error§ como própria, porém não enumerável (e §stack§ também). Por isso §Object.hasOwn(erro, "message")§ é §true§ e ainda assim §message§ fica fora de §Object.keys§ e do §JSON.stringify§.`,
    src: [[A5, 'ErroValidacao: this.name e this.campo atribuídos no construtor']],
    verify: js(comErro('const erro = new ErroValidacao("nota inválida", "nota");\nconsole.log(Object.keys(erro));\nconsole.log(Object.hasOwn(erro, "message"));'), ['["name","campo"]\ntrue', '["message","name","campo"]\ntrue', '["name","campo"]\nfalse', '["campo"]\ntrue']),
  }),
  R(16, {
    diff: 'dificil', scope: 'desafio', sub: 'Serialização de erros',
    stem: h`${saida(comErro('console.log(JSON.stringify(new ErroValidacao("nota inválida", "nota")));'))}`,
    opts: [h`§{"name":"ErroValidacao","campo":"nota"}§`, [h`§{"message":"nota inválida","campo":"nota"}§`, h`§message§ de um §Error§ não é enumerável, então o §JSON.stringify§ o omite.`], [h`§{}§`, h`As propriedades criadas por atribuição no construtor (§this.name§, §this.campo§) são enumeráveis e aparecem no JSON.`], [h`§"ErroValidacao: nota inválida"§`, h`§JSON.stringify§ não usa §toString§ para objetos; serializa as propriedades enumeráveis próprias.`]],
    exp: h`§JSON.stringify§ inclui apenas propriedades *próprias e enumeráveis*. §message§ e §stack§ de um §Error§ são não enumeráveis, mas §this.name§ e §this.campo§, atribuídos no construtor, são enumeráveis. Resultado: §{"name":"ErroValidacao","campo":"nota"}§. Em uma API, devolva explicitamente §{ erro: e.message, campo: e.campo }§.`,
    src: [[A5, 'ErroValidacao carrega o campo (útil para devolver ao cliente)']],
    verify: js(comErro('console.log(JSON.stringify(new ErroValidacao("nota inválida", "nota")));'), ['{"name":"ErroValidacao","campo":"nota"}', '{"message":"nota inválida","campo":"nota"}', '{}', '"ErroValidacao: nota inválida"']),
  }),
  R(17, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Herança de erros',
    stem: h`${saida(comErro('class ErroNota extends ErroValidacao {\n  constructor(mensagem) {\n    super(mensagem, "nota");\n  }\n}\nconst e = new ErroNota("nota fora do intervalo");\nconsole.log(e.name, e.campo, e instanceof ErroNota, e instanceof ErroValidacao);'))}`,
    opts: [h`§ErroValidacao nota true true§`, [h`§ErroNota nota true true§`, h`O §name§ é definido no construtor de §ErroValidacao§ e a subclasse não o sobrescreve: continua §"ErroValidacao"§.`], [h`§ErroValidacao undefined true true§`, h`A subclasse passa §"nota"§ como campo no §super(mensagem, "nota")§.`], [h`§ErroValidacao nota true false§`, h`Uma subclasse também é instância da classe pai.`]],
    exp: h`§ErroNota§ reaproveita o construtor do pai: §super(mensagem, "nota")§ define §campo§ e §name = "ErroValidacao"§. Como a subclasse não redefine §name§, ele permanece §"ErroValidacao"§. O objeto é instância de §ErroNota§ e de §ErroValidacao§ (e de §Error§).`,
    src: [[A5, 'ErroValidacao estende Error; classes lançam ErroValidacao']],
    verify: js(comErro('class ErroNota extends ErroValidacao {\n  constructor(mensagem) {\n    super(mensagem, "nota");\n  }\n}\nconst e = new ErroNota("nota fora do intervalo");\nconsole.log(e.name, e.campo, e instanceof ErroNota, e instanceof ErroValidacao);'), ['ErroValidacao nota true true', 'ErroNota nota true true', 'ErroValidacao undefined true true', 'ErroValidacao nota true false']),
  }),
  R(18, {
    diff: 'dificil', scope: 'aula', sub: 'Objeto inválido não existe',
    stem: h`${saida(comErro('class Lugar {\n  constructor(nome) {\n    if (typeof nome !== "string" || nome.length < 2) throw new ErroValidacao("nome inválido", "nome");\n    this.nome = nome;\n  }\n}\nlet lugar;\ntry {\n  lugar = new Lugar("C");\n} catch (e) {\n  console.log(e.campo);\n}\nconsole.log(lugar);'))}`,
    opts: [h`§nome§ e depois §undefined§`, [h`§nome§ e depois §Lugar {}§`, h`Quando o construtor lança, a expressão §new§ não retorna objeto algum; a variável nunca recebe valor.`], [h`Apenas §nome§`, h`Depois do §catch§ o código continua e o segundo §console.log§ também imprime algo (§undefined§).`], [h`Apenas §undefined§`, h`O §catch§ é executado e imprime o campo com falha antes.`]],
    exp: h`Como a validação roda *antes* de atribuir qualquer coisa a §this§ e o construtor lança, o §new§ é abortado: a atribuição §lugar = ...§ nunca acontece e §lugar§ continua §undefined§. Garantia central da Aula 05: “um objeto inválido não deve conseguir existir”.`,
    src: [[A5, 'um objeto inválido não deve conseguir existir']],
    verify: js(comErro('class Lugar {\n  constructor(nome) {\n    if (typeof nome !== "string" || nome.length < 2) throw new ErroValidacao("nome inválido", "nome");\n    this.nome = nome;\n  }\n}\nlet lugar;\ntry {\n  lugar = new Lugar("C");\n} catch (e) {\n  console.log(e.campo);\n}\nconsole.log(lugar);'), ['nome\nundefined', 'nome\nLugar {}', 'nome', 'undefined']),
  }),
  R(19, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'isInteger versus coerção',
    stem: h`${saida('console.log(Number.isInteger(5.0), Number.isInteger("5"), Number.isNaN("abc"), isNaN("abc"));')}`,
    opts: [h`§true false false true§`, [h`§true false true true§`, h`§Number.isNaN("abc")§ não converte: só é §true§ para o valor §NaN§ em si; uma string não é §NaN§.`], [h`§false false false true§`, h`§5.0§ é o mesmo número que §5§ em JavaScript, portanto é inteiro.`], [h`§true true false false§`, h`§Number.isInteger("5")§ é §false§ (não converte) e o §isNaN§ global converte §"abc"§ em §NaN§.`]],
    exp: h`§5.0§ é o número 5 (inteiro). §Number.isInteger("5")§ é falso (não converte). §Number.isNaN("abc")§ é falso (a string não é o valor §NaN§), enquanto o §isNaN§ global converte para número antes (§Number("abc")§ → §NaN§) e dá verdadeiro. Para validar notas prefira as versões “estritas” de §Number§.`,
    src: [[A5, 'Avaliacao: nota número inteiro (dica: Number.isInteger)']],
    verify: js('console.log(Number.isInteger(5.0), Number.isInteger("5"), Number.isNaN("abc"), isNaN("abc"));', ['true false false true', 'true false true true', 'false false false true', 'true true false false']),
  }),
  R(20, {
    diff: 'dificil', scope: 'desafio', sub: 'Getter sem setter',
    stem: h`${saida('"use strict";\nclass Avaliacao {\n  constructor(nota) { this._nota = nota; }\n  get nota() { return this._nota; }\n}\nconst a = new Avaliacao(5);\ntry {\n  a.nota = 1;\n} catch (e) {\n  console.log(e.name);\n}\nconsole.log(a.nota);')}`,
    opts: [h`§TypeError§ e depois §5§`, [h`§1§ apenas`, h`Sem setter, a atribuição não altera o valor (e em modo estrito ainda lança erro).`], [h`§ReferenceError§ e depois §5§`, h`Atribuir a uma propriedade só com getter lança §TypeError§, não §ReferenceError§.`], [h`Apenas §5§`, h`Em modo estrito a atribuição lança §TypeError§, que o §catch§ imprime.`]],
    exp: h`Uma propriedade definida só com §get§ é somente leitura. Em modo estrito (§"use strict"§ ou módulos ES), atribuir a ela lança §TypeError§; fora do modo estrito a atribuição é ignorada silenciosamente. O valor continua §5§. É um jeito de proteger dados do domínio depois de validados no construtor.`,
    src: [[A5, 'classes de modelo: o formato dos dados vira responsabilidade das próprias classes']],
    verify: js('"use strict";\nclass Avaliacao {\n  constructor(nota) { this._nota = nota; }\n  get nota() { return this._nota; }\n}\nconst a = new Avaliacao(5);\ntry {\n  a.nota = 1;\n} catch (e) {\n  console.log(e.name);\n}\nconsole.log(a.nota);', ['TypeError\n5', '1', 'ReferenceError\n5', '5']),
  }),
  R(21, {
    diff: 'dificil', scope: 'desafio', sub: 'Object.freeze',
    stem: h`${saida('"use strict";\nconst lugar = Object.freeze({ nome: "Café Aroma" });\ntry {\n  lugar.nome = "Outro";\n} catch (e) {\n  console.log(e.name);\n}\nconsole.log(lugar.nome);')}`,
    opts: [h`§TypeError§ e depois §Café Aroma§`, [h`Apenas §Outro§`, h`Um objeto congelado não aceita novas atribuições; o valor original permanece.`], [h`§TypeError§ e depois §Outro§`, h`Com o objeto congelado, a propriedade não é alterada.`], [h`Nada é impresso por erro no §catch§`, h`O §console.log§ do final sempre executa e imprime o nome atual.`]],
    exp: h`§Object.freeze§ impede alterar, adicionar ou remover propriedades. Em modo estrito, tentar atribuir lança §TypeError§ (fora dele, falha em silêncio). O nome permanece §Café Aroma§. Congelar objetos já validados ajuda a manter o domínio consistente.`,
    src: [[A5, 'classes validam e garantem formato dos dados']],
    verify: js('"use strict";\nconst lugar = Object.freeze({ nome: "Café Aroma" });\ntry {\n  lugar.nome = "Outro";\n} catch (e) {\n  console.log(e.name);\n}\nconsole.log(lugar.nome);', ['TypeError\nCafé Aroma', 'Outro', 'TypeError\nOutro', 'Café Aroma']),
  }),
  R(22, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Limites da regex de e-mail',
    stem: h`${saida('const emailValido = (s) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(s);\nconsole.log(emailValido("a@b..c"), emailValido("a@@b.com"), emailValido("a b@c.de"));')}`,
    opts: [h`§true false false§`, [h`§false false false§`, h`A regex simples aceita §"a@b..c"§: depois do §@§ vem §b§, um ponto e então §.c§ (o terceiro grupo aceita qualquer caractere exceto espaço e §@§).`], [h`§true true false§`, h`§"a@@b.com"§ tem dois §@§ seguidos; o grupo depois do §@§ não aceita outro §@§.`], [h`§true false true§`, h`§"a b@c.de"§ tem espaço, que o primeiro grupo não aceita.`]],
    exp: h`A regex sugerida é “simples”: aceita formatos esquisitos como §a@b..c§ (válida para ela), mas rejeita dois §@§ e espaços. Serve para barrar erros óbvios; a validação definitiva de um e-mail é enviar uma mensagem de confirmação. Resultado: §true false false§.`,
    src: [[A5, '3. Usuario: regex simples já é suficiente']],
    verify: js('const emailValido = (s) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(s);\nconsole.log(emailValido("a@b..c"), emailValido("a@@b.com"), emailValido("a b@c.de"));', ['true false false', 'false false false', 'true true false', 'true false true']),
  }),
];

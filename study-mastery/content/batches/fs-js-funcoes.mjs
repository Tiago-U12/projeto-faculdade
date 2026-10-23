// Lote fs-js-funcoes — JavaScript: funções puras e arrays (map/filter/reduce/sort): 10 fáceis (001–010), 9 médias (011–019), 8 difíceis (020–027).
// Base: Aula 03 (README: calcularMedia, filtrarPorLugar, filtrarPorNotaMinima, ordenarPorNota sem mutar o original).
// Verificação REAL: o código mostrado no enunciado é executado em Node isolado (--permission) e a saída é comparada às alternativas.
import { m } from '../../tools/lib/dsl.ts';

const A3 = 'fs-aula-03';
const R = (n, o) => ({ d: 'fullstack', topic: 'js-funcoes', ...o, id: `fs-js-funcoes-${String(n).padStart(3, '0')}` });
// § = crase; \n literal vira quebra de linha
const h = (strings, ...v) => m(strings, ...v).replaceAll('§', '`').replaceAll('\\n', '\n');
const code = (src) => '§§§js\n'.replaceAll('§', '`') + src.trim() + '\n§§§'.replaceAll('§', '`');
const js = (src, values, extra = {}) => ({ kind: 'js', params: { code: src, ...extra }, values });
// questão de "qual é a saída?": o mesmo código aparece no enunciado e é o que roda no verificador
const saida = (src) => `O que o código abaixo imprime no console?\n\n${code(src)}`;

const C = {
  media: `function calcularMedia(avaliacoes) {
  if (avaliacoes.length === 0) return 0;
  const soma = avaliacoes.reduce((total, a) => total + a.nota, 0);
  return Math.round((soma / avaliacoes.length) * 10) / 10;
}
console.log(calcularMedia([{ nota: 5 }, { nota: 4 }]));`,
  vazia: `const avaliacoes = [];
const soma = avaliacoes.reduce((total, a) => total + a.nota, 0);
console.log(soma / avaliacoes.length);`,
  filtroLugar: `const avaliacoes = [
  { id: 1, lugarId: 1, nota: 5 },
  { id: 2, lugarId: 1, nota: 4 },
  { id: 3, lugarId: 2, nota: 3 },
];
const doLugar1 = avaliacoes.filter((a) => a.lugarId === 1);
console.log(doLugar1.map((a) => a.nota));`,
  notaMin: `const notas = [5, 4, 5, 3, 4, 5, 2, 5, 3];
console.log(notas.filter((n) => n >= 4).length);`,
  copia: `const original = [3, 1, 2];
const copia = original.slice().sort((a, b) => b - a);
console.log(original, copia);`,
  arred: `console.log(Math.round((23 / 6) * 10) / 10);`,
  puras: `let contador = 0;
const f1 = (lista) => lista.map((a) => a.nota);
const f2 = (lista) => lista.sort((a, b) => a.nota - b.nota);
const f3 = (lista) => { contador++; return lista.length + contador; };
const f4 = (lista) => lista.length * Math.random();`,
  forEach: `const resultado = [1, 2, 3].forEach((x) => x * 2);
console.log(resultado);`,
  find: `const notas = [3, 5, 4];
console.log(notas.find((n) => n >= 4));`,
  estrita: `const avaliacoes = [{ lugarId: "1", nota: 5 }, { lugarId: "1", nota: 4 }];
console.log(avaliacoes.filter((a) => a.lugarId === 1).length);`,
  reduceVazio: `try {
  [].reduce((total, n) => total + n);
} catch (erro) {
  console.log(erro.name);
}`,
  sortPadrao: `console.log([10, 9, 1].sort());`,
  asc: `const avaliacoes = [{ nota: 3 }, { nota: 5 }, { nota: 4 }];
avaliacoes.sort((a, b) => a.nota - b.nota);
console.log(avaliacoes.map((a) => a.nota));`,
  rasa: `const original = [{ nota: 5 }, { nota: 4 }];
const copia = [...original];
copia[0].nota = 1;
console.log(original[0].nota);`,
  mesmaRef: `const a = [3, 1, 2];
const b = a.sort();
console.log(a === b, a);`,
  float: `console.log(0.1 + 0.2 === 0.3, Math.round((0.1 + 0.2) * 10) / 10);`,
  meio: `console.log(Math.round(2.5), Math.round(-2.5));`,
  vazios: `console.log([].every((n) => n > 5), [].some((n) => n > 5));`,
  composicao: `const avaliacoes = [
  { lugarId: 2, nota: 5 },
  { lugarId: 2, nota: 3 },
  { lugarId: 1, nota: 4 },
];
const media = (lista) => lista.reduce((t, a) => t + a.nota, 0) / lista.length;
const doLugar2 = avaliacoes.filter((a) => a.lugarId === 2);
const boas = doLugar2.filter((a) => a.nota >= 4);
console.log(media(boas));`,
  parseInt: `console.log(["1", "2", "3"].map(parseInt));`,
  closure: `const fns = [];
for (var i = 0; i < 3; i++) {
  fns.push(() => i);
}
console.log(fns.map((f) => f()));`,
  reverse: `const a = [1, 2, 3];
const b = a.reverse().concat(a);
console.log(b);`,
  grupo: `const avaliacoes = [{ lugarId: 1 }, { lugarId: 2 }, { lugarId: 1 }, { lugarId: 3 }, { lugarId: 1 }];
const contagem = avaliacoes.reduce((acc, a) => {
  acc[a.lugarId] = (acc[a.lugarId] || 0) + 1;
  return acc;
}, {});
console.log(contagem);`,
  multi: `const avaliacoes = [
  { id: 1, nota: 5 },
  { id: 2, nota: 4 },
  { id: 3, nota: 5 },
  { id: 4, nota: 4 },
];
avaliacoes.sort((a, b) => b.nota - a.nota || a.id - b.id);
console.log(avaliacoes.map((a) => a.id));`,
  toSorted: `const original = [3, 1, 2];
const ordenada = original.toSorted();
console.log(original, ordenada);`,
  coercao: `console.log([3, 4, 5].filter((n) => n >= "4"), [3, 4, 5].filter((n) => n === "4"));`,
  strings: `const notas = JSON.parse('["5","4"]');
const soma = notas.reduce((t, n) => t + n, 0);
console.log(soma, typeof soma);`,
};

const purasVerifica = `${C.puras}
const dados = [{ nota: 5 }, { nota: 3 }];
const pura = (f) => {
  const antes = JSON.stringify(dados);
  const r1 = JSON.stringify(f(dados));
  const mutou = JSON.stringify(dados) !== antes;
  const r2 = JSON.stringify(f(dados));
  return !mutou && r1 === r2;
};
console.log([['f1', f1], ['f2', f2], ['f3', f3], ['f4', f4]].filter(([, f]) => pura(f)).map(([n]) => n).join(','));`;

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'calcularMedia',
    stem: h`${saida(C.media)}`,
    opts: [h`§4.5§`, [h`§9§`, h`§9§ é só a soma das notas (5 + 4); falta dividir pela quantidade de avaliações (2).`], [h`§4§`, h`A média de 5 e 4 é 4,5; o arredondamento é para 1 casa decimal (§Math.round(x * 10) / 10§), não para inteiro.`], [h`§5§`, h`§5§ é a maior nota, não a média.`]],
    exp: h`A soma das notas é 5 + 4 = 9; dividindo por 2 avaliações dá 4,5. O arredondamento §Math.round(4.5 * 10) / 10§ mantém 1 casa decimal e o resultado impresso é §4.5§. É exatamente a função §calcularMedia§ pedida na Aula 03.`,
    src: [[A3, 'calcularMedia(avaliacoes): média arredondada para 1 casa decimal']],
    verify: js(C.media, ['4.5', '9', '4', '5']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'Divisão por zero',
    stem: h`${saida(C.vazia)}`,
    opts: [h`§NaN§`, [h`§0§`, h`§0 / 0§ não é 0 em JavaScript: é indefinido, e o resultado é §NaN§.`], [h`§Infinity§`, h`§Infinity§ ocorreria com numerador positivo (por exemplo §5 / 0§); aqui o numerador também é 0.`], [h`§undefined§`, h`Operações aritméticas retornam número; para §0 / 0§ o valor é §NaN§, não §undefined§.`]],
    exp: h`Com a lista vazia a soma é §0§ e o tamanho é §0§, então a conta é §0 / 0§, que resulta em §NaN§. Por isso a Aula 03 exige “lista vazia deve retornar 0 (nunca dividir por zero)”: o §calcularMedia§ precisa de uma verificação antes da divisão.`,
    src: [[A3, 'calcularMedia([]) deve retornar 0, sem dividir por zero']],
    verify: js(C.vazia, ['NaN', '0', 'Infinity', 'undefined']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'filter + map',
    stem: h`${saida(C.filtroLugar)}`,
    opts: [h`§[5,4]§`, [h`§[5,4,3]§`, h`O §filter§ deixa só as avaliações do lugar 1; a nota 3 é do lugar 2.`], [h`§[1,1]§`, h`O §map§ devolve as *notas*, não os §lugarId§.`], [h`§[{"id":1,"lugarId":1,"nota":5},{"id":2,"lugarId":1,"nota":4}]§`, h`Essa seria a saída de §doLugar1§ sem o §map§; o §map§ transforma cada avaliação na sua nota.`]],
    exp: h`§filter§ mantém as avaliações de §lugarId === 1§ (ids 1 e 2) e §map§ extrai a nota de cada uma: §[5, 4]§ (o console mostra o array). É o padrão de §filtrarPorLugar§ combinado com um §map§.`,
    src: [[A3, 'filtrarPorLugar(avaliacoes, lugarId) usando Array.prototype.filter']],
    verify: js(C.filtroLugar, ['[5,4]', '[5,4,3]', '[1,1]', '[{"id":1,"lugarId":1,"nota":5},{"id":2,"lugarId":1,"nota":4}]']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'Nota mínima (>=)',
    stem: h`${saida(C.notaMin)}`,
    opts: [h`§6§`, [h`§4§`, h`§4§ seria o resultado com §n > 4§ (só os 5); o filtro da aula usa “maior ou igual” (§>=§).`], [h`§5§`, h`Há seis notas maiores ou iguais a 4: 5, 4, 5, 4, 5 e 5.`], [h`§9§`, h`§9§ é o tamanho do array original; o §filter§ remove as notas 3, 2 e 3.`]],
    exp: h`Notas ≥ 4 no array: 5, 4, 5, 4, 5, 5 — seis valores (as notas 3, 2 e 3 saem). A Aula 03 define §filtrarPorNotaMinima§ como “nota maior ou igual à mínima”, por isso o §4§ conta.`,
    src: [[A3, 'filtrarPorNotaMinima: nota maior ou igual à mínima']],
    verify: js(C.notaMin, ['6', '4', '5', '9']),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'Cópia antes de ordenar',
    stem: h`${saida(C.copia)}`,
    opts: [h`§[3,1,2] [3,2,1]§`, [h`§[3,2,1] [3,2,1]§`, h`O §sort§ foi aplicado à cópia criada por §slice()§; o array original não é alterado.`], [h`§[1,2,3] [3,2,1]§`, h`O original não foi ordenado, então continua §[3,1,2]§ (e não §[1,2,3]§).`], [h`§[3,1,2] [3,1,2]§`, h`A cópia foi ordenada em ordem decrescente pelo comparador §b - a§.`]],
    exp: h`§original.slice()§ cria uma cópia; o §sort§ com comparador §(a, b) => b - a§ ordena a cópia do maior para o menor (§[3,2,1]§) e o original continua §[3,1,2]§. É a técnica pedida em §ordenarPorNota§: nunca ordenar o array recebido diretamente.`,
    src: [[A3, 'ordenarPorNota: crie uma cópia com slice() e ordene a cópia']],
    verify: js(C.copia, ['[3,1,2] [3,2,1]', '[3,2,1] [3,2,1]', '[1,2,3] [3,2,1]', '[3,1,2] [3,1,2]']),
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'Arredondamento a 1 casa',
    stem: h`${saida(C.arred)}`,
    opts: [h`§3.8§`, [h`§3.9§`, h`§23 / 6 ≈ 3,8333§; multiplicado por 10 dá 38,33, que arredonda para 38 (e não 39).`], [h`§4§`, h`§Math.round(x * 10) / 10§ mantém 1 casa decimal; arredondar para inteiro seria §Math.round(x)§.`], [h`§3.83§`, h`O truque multiplica por 10 (1 casa), não por 100 (2 casas).`]],
    exp: h`23 ÷ 6 ≈ 3,8333. Multiplicando por 10: 38,33; §Math.round§ → 38; dividindo por 10: §3.8§. É a técnica sugerida na Aula 03 para arredondar a média a 1 casa decimal.`,
    src: [[A3, 'dica: Math.round(valor * 10) / 10']],
    verify: js(C.arred, ['3.8', '3.9', '4', '3.83']),
  }),
  R(7, {
    diff: 'facil', scope: 'aula', sub: 'Funções puras',
    stem: h`Considere as funções abaixo, todas recebendo uma lista de avaliações. Qual delas é **pura** (mesma entrada → mesma saída, sem efeitos colaterais)?\n\n${code(C.puras)}`,
    opts: [h`§f1§`, [h`§f2§`, h`§sort§ modifica o array recebido (efeito colateral); uma função pura não altera suas entradas.`], [h`§f3§`, h`O resultado depende de uma variável externa que muda a cada chamada (§contador§).`], [h`§f4§`, h`§Math.random()§ torna o resultado imprevisível para a mesma entrada.`]],
    exp: h`Uma função pura devolve sempre o mesmo resultado para os mesmos argumentos e não altera nada fora dela. §f1§ só lê a lista e cria um array novo. §f2§ altera o array recebido; §f3§ depende e altera §contador§; §f4§ usa aleatoriedade. A Aula 03 pede justamente funções puras, “sem efeitos colaterais, sem tocar no DOM”.`,
    src: [[A3, 'objetivo: funções puras (sem efeitos colaterais, sem tocar no DOM)']],
    verify: js(purasVerifica, ['f1', 'f2', 'f3', 'f4']),
  }),
  R(8, {
    diff: 'facil', scope: 'aula', sub: 'forEach não retorna valor',
    stem: h`${saida(C.forEach)}`,
    opts: [h`§undefined§`, [h`§[2,4,6]§`, h`Quem devolve um novo array é o §map§; o §forEach§ só percorre, sem retornar nada.`], [h`§[1,2,3]§`, h`O §forEach§ não devolve o array original como retorno.`], [h`§6§`, h`§forEach§ não acumula valores (isso é função do §reduce§).`]],
    exp: h`§Array.prototype.forEach§ executa a função para cada item e sempre retorna §undefined§, ignorando o valor de retorno do callback. Para transformar uma lista em outra usa-se §map§; para acumular, §reduce§.`,
    src: [[A3, 'uso de métodos de array (filter, sort) em funções que devolvem dados']],
    verify: js(C.forEach, ['undefined', '[2,4,6]', '[1,2,3]', '6']),
  }),
  R(9, {
    diff: 'facil', scope: 'aula', sub: 'find',
    stem: h`${saida(C.find)}`,
    opts: [h`§5§`, [h`§[5,4]§`, h`Esse seria o resultado de §filter§ (todas as notas ≥ 4). O §find§ devolve só o *primeiro* elemento que atende.`], [h`§4§`, h`A varredura segue a ordem do array: o primeiro elemento ≥ 4 é o 5 (índice 1).`], [h`§true§`, h`§find§ devolve o elemento, não um booleano (isso seria §some§).`]],
    exp: h`§find§ percorre o array em ordem e devolve o primeiro elemento que satisfaz a condição: 3 não passa, 5 passa. Resultado: §5§. Se nenhum passar, devolve §undefined§.`,
    src: [[A3, 'Array.prototype.filter e variações para selecionar avaliações']],
    verify: js(C.find, ['5', '[5,4]', '4', 'true']),
  }),
  R(10, {
    diff: 'facil', scope: 'aula', sub: 'Igualdade estrita',
    stem: h`${saida(C.estrita)}`,
    opts: [h`§0§`, [h`§2§`, h`§===§ não faz conversão de tipos: a string §"1"§ é diferente do número §1§.`], [h`§1§`, h`Nenhuma das duas avaliações passa no teste, pois ambas têm §lugarId§ do tipo string.`], [h`§undefined§`, h`§filter§ sempre devolve um array; o §length§ de um array vazio é §0§.`]],
    exp: h`O operador §===§ compara valor *e tipo*: §"1" === 1§ é §false§. Como os §lugarId§ vieram como texto, o §filter§ devolve um array vazio e o §length§ é §0§. Em dados reais (JSON, formulários, URLs) é comum precisar converter com §Number(...)§ antes de comparar.`,
    src: [[A3, 'filtrarPorLugar(avaliacoes, lugarId): lugarId igual ao parâmetro (number)']],
    verify: js(C.estrita, ['0', '2', '1', 'undefined']),
  }),

  // ---------------- MÉDIAS ----------------
  R(11, {
    diff: 'medio', scope: 'aula', sub: 'reduce sem valor inicial',
    stem: h`${saida(C.reduceVazio)}`,
    opts: [h`§TypeError§`, [h`§0§`, h`Sem o segundo argumento (valor inicial) o §reduce§ de um array vazio não devolve 0: ele lança erro.`], [h`§undefined§`, h`Não há retorno: o erro é lançado e capturado pelo §catch§, que imprime o nome do erro.`], [h`§NaN§`, h`O §reduce§ nem chega a executar o callback; o erro acontece antes.`]],
    exp: h`§reduce§ sem valor inicial usa o primeiro elemento como acumulador; em um array vazio não há elemento, então lança §TypeError: Reduce of empty array with no initial value§. Por isso o §calcularMedia§ da aula usa §reduce(..., 0)§ (e checa a lista vazia).`,
    src: [[A3, 'calcularMedia: lista vazia deve retornar 0']],
    verify: js(C.reduceVazio, ['TypeError', '0', 'undefined', 'NaN']),
  }),
  R(12, {
    diff: 'medio', scope: 'aprofundamento', sub: 'sort sem comparador',
    stem: h`${saida(C.sortPadrao)}`,
    opts: [h`§[1,10,9]§`, [h`§[1,9,10]§`, h`Sem comparador o §sort§ converte os itens em texto e ordena alfabeticamente: §"10"§ vem antes de §"9"§.`], [h`§[10,9,1]§`, h`Esse seria o resultado de ordem decrescente (§(a, b) => b - a§).`], [h`§[9,10,1]§`, h`Nem alfabética nem numérica: a ordem de texto coloca §"1"§ primeiro.`]],
    exp: h`Por padrão o §sort§ compara as *strings*: §"1"§ < §"10"§ < §"9"§. Para ordenar números é preciso um comparador, como §(a, b) => a - b§ — exatamente o que o §ordenarPorNota§ da Aula 03 faz com a nota.`,
    src: [[A3, 'ordenarPorNota: comparando a nota com Array.prototype.sort']],
    verify: js(C.sortPadrao, ['[1,10,9]', '[1,9,10]', '[10,9,1]', '[9,10,1]']),
  }),
  R(13, {
    diff: 'medio', scope: 'aula', sub: 'Comparador ascendente',
    stem: h`${saida(C.asc)}`,
    opts: [h`§[3,4,5]§`, [h`§[5,4,3]§`, h`§a.nota - b.nota§ coloca a menor nota primeiro (ascendente); o decrescente seria §b.nota - a.nota§.`], [h`§[3,5,4]§`, h`O array foi de fato ordenado pelo comparador; ele não permanece na ordem original.`], [h`§[4,3,5]§`, h`A ordem resultante é totalmente crescente: 3, 4, 5.`]],
    exp: h`Quando o comparador devolve negativo, §a§ vem antes de §b§. Com §a.nota - b.nota§, a menor nota precede a maior: §[3,4,5]§. O parâmetro §ordem === "asc"§ do §ordenarPorNota§ equivale a esse comparador.`,
    src: [[A3, 'ordenarPorNota(avaliacoes, ordem): "asc" menor para o maior']],
    verify: js(C.asc, ['[3,4,5]', '[5,4,3]', '[3,5,4]', '[4,3,5]']),
  }),
  R(14, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Cópia rasa',
    stem: h`${saida(C.rasa)}`,
    opts: [h`§1§`, [h`§5§`, h`O spread copia o array, mas os objetos dentro dele continuam sendo os mesmos (cópia rasa); alterar um objeto pela cópia altera o original.`], [h`§undefined§`, h`§original[0]§ existe e continua sendo um objeto com a propriedade §nota§.`], [h`§4§`, h`§4§ é a nota do segundo item, que não foi tocado.`]],
    exp: h`§[...original]§ cria um array novo, mas com *as mesmas referências* de objetos. §copia[0]§ e §original[0]§ são o mesmo objeto; mudar §nota§ por um aparece no outro. Copiar o array evita mutar a *ordem* (como no §sort§), mas não protege os objetos internos.`,
    src: [[A3, 'não modifique o array original (efeito colateral indesejado)']],
    verify: js(C.rasa, ['1', '5', 'undefined', '4']),
  }),
  R(15, {
    diff: 'medio', scope: 'aprofundamento', sub: 'sort retorna a mesma referência',
    stem: h`${saida(C.mesmaRef)}`,
    opts: [h`§true [1,2,3]§`, [h`§false [3,1,2]§`, h`§sort§ ordena *no próprio array* e devolve a mesma referência: §a === b§ e §a§ já está ordenado.`], [h`§false [1,2,3]§`, h`§sort§ não cria um array novo; §a§ e §b§ apontam para o mesmo array.`], [h`§true [3,1,2]§`, h`O §sort§ altera o array original: §a§ fica §[1,2,3]§.`]],
    exp: h`§Array.prototype.sort§ modifica o array e retorna o próprio array. Logo §b§ é a mesma referência de §a§ (§a === b§ é §true§) e §a§ passa a ser §[1,2,3]§. É por isso que a Aula 03 manda ordenar uma *cópia* (§slice()§).`,
    src: [[A3, 'NÃO ordene o array recebido diretamente (isso mudaria o array original)']],
    verify: js(C.mesmaRef, ['true [1,2,3]', 'false [3,1,2]', 'false [1,2,3]', 'true [3,1,2]']),
  }),
  R(16, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Ponto flutuante',
    stem: h`${saida(C.float)}`,
    opts: [h`§false 0.3§`, [h`§true 0.3§`, h`Na prática §0.1 + 0.2§ dá §0.30000000000000004§, então a comparação com §0.3§ é falsa.`], [h`§false 0.30000000000000004§`, h`O segundo valor passou por §Math.round(x * 10) / 10§, que o arredonda para §0.3§.`], [h`§true 0.30000000000000004§`, h`Nem a igualdade é verdadeira nem o valor arredondado mantém a cauda decimal.`]],
    exp: h`Números em JavaScript são binários de ponto flutuante: §0.1 + 0.2§ vale §0.30000000000000004§, diferente de §0.3§ (comparação §false§). O arredondamento a 1 casa (§Math.round(x * 10) / 10§) “limpa” o resultado para §0.3§. Por isso médias são arredondadas antes de mostrar.`,
    src: [[A3, 'dica: arredondar o resultado com Math.round(valor * 10) / 10']],
    verify: js(C.float, ['false 0.3', 'true 0.3', 'false 0.30000000000000004', 'true 0.30000000000000004']),
  }),
  R(17, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Math.round e metades',
    stem: h`${saida(C.meio)}`,
    opts: [h`§3 -2§`, [h`§3 -3§`, h`§Math.round§ arredonda metades “para cima” (rumo a +∞); para −2,5 isso significa −2.`], [h`§2 -2§`, h`§Math.round(2.5)§ é §3§ (a metade sobe).`], [h`§2 -3§`, h`Nenhum dos dois valores está correto: §2.5§ sobe para §3§ e §-2.5§ sobe para §-2§.`]],
    exp: h`§Math.round§ leva a metade (±0,5) em direção a +∞: 2,5 → 3 e −2,5 → −2. Isso difere do arredondamento “longe de zero” usado em algumas linguagens e pode surpreender com notas negativas ou diferenças.`,
    src: [[A3, 'calcularMedia: arredondamento com Math.round']],
    verify: js(C.meio, ['3 -2', '3 -3', '2 -2', '2 -3']),
  }),
  R(18, {
    diff: 'medio', scope: 'aprofundamento', sub: 'every e some em lista vazia',
    stem: h`${saida(C.vazios)}`,
    opts: [h`§true false§`, [h`§false false§`, h`§every§ em lista vazia é “verdadeiro por vacuidade”: não existe nenhum elemento que falhe no teste.`], [h`§true true§`, h`§some§ precisa de *pelo menos um* elemento que passe; na lista vazia não existe, então é §false§.`], [h`§false true§`, h`É o contrário: §every§ dá §true§ e §some§ dá §false§ em listas vazias.`]],
    exp: h`§every§ devolve §true§ se *nenhum* elemento falhar — numa lista vazia ninguém falha. §some§ devolve §true§ se *algum* elemento passar — numa lista vazia ninguém passa. Resultado: §true false§. Ao validar “todas as notas ≥ 4”, trate a lista vazia à parte.`,
    src: [[A3, 'tratar lista vazia (calcularMedia([]) retorna 0)']],
    verify: js(C.vazios, ['true false', 'false false', 'true true', 'false true']),
  }),
  R(19, {
    diff: 'medio', scope: 'aula', sub: 'Composição de funções puras',
    stem: h`${saida(C.composicao)}`,
    opts: [h`§5§`, [h`§4§`, h`§4§ é a nota do lugar 1; o código só usa as avaliações do lugar 2.`], [h`§4.5§`, h`Só a nota 5 passa no filtro “≥ 4”; a nota 3 é descartada antes da média.`], [h`§3§`, h`A nota 3 é eliminada por §filter(a => a.nota >= 4)§.`]],
    exp: h`Primeiro filtra o lugar 2 (notas 5 e 3), depois mantém notas ≥ 4 (só o 5) e por fim calcula a média de §[5]§ = §5§. Compor funções puras pequenas (filtrar → filtrar → calcular) é o estilo da Aula 03.`,
    src: [[A3, 'filtrarPorLugar + filtrarPorNotaMinima + calcularMedia']],
    verify: js(C.composicao, ['5', '4', '4.5', '3']),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(20, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'map com parseInt',
    stem: h`${saida(C.parseInt)}`,
    opts: [h`§[1,NaN,NaN]§`, [h`§[1,2,3]§`, h`O §map§ passa *três* argumentos ao callback (item, índice, array), e o §parseInt§ usa o segundo como base numérica.`], [h`§[NaN,NaN,NaN]§`, h`O primeiro item vira §1§: §parseInt("1", 0)§ trata a base 0 como 10.`], [h`§["1","2","3"]§`, h`O §parseInt§ converte para número; o resultado não são strings.`]],
    exp: h`O §map§ chama §parseInt("1", 0, arr)§, §parseInt("2", 1, arr)§ e §parseInt("3", 2, arr)§. Base 0 vale 10 (→ 1), base 1 é inválida (→ NaN) e base 2 não aceita o dígito 3 (→ NaN). Correção: §.map(Number)§ ou §.map((s) => parseInt(s, 10))§.`,
    src: [[A3, 'métodos de array com callbacks (map/filter) e seus argumentos']],
    verify: js(C.parseInt, ['[1,NaN,NaN]', '[1,2,3]', '[NaN,NaN,NaN]', '["1","2","3"]']),
  }),
  R(21, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'var e closures em laço',
    stem: h`${saida(C.closure)}`,
    opts: [h`§[3,3,3]§`, [h`§[0,1,2]§`, h`Isso aconteceria com §let§ (uma variável nova por iteração); com §var§ há uma única variável compartilhada.`], [h`§[1,2,3]§`, h`O laço começa em 0; e, de qualquer modo, todas as funções leem o mesmo §i§.`], [h`§[undefined,undefined,undefined]§`, h`As funções retornam §i§, que continua existindo (valor final §3§) na função/escopo externo.`]],
    exp: h`§var§ tem escopo de função: existe um único §i§, que termina o laço valendo §3§. As três arrow functions fecham sobre essa mesma variável e, ao serem chamadas depois, retornam §3§. Com §for (let i...)§ cada iteração teria seu próprio §i§ e o resultado seria §[0,1,2]§.`,
    src: [[A3, 'funções puras que não dependem de estado externo']],
    verify: js(C.closure, ['[3,3,3]', '[0,1,2]', '[1,2,3]', '[undefined,undefined,undefined]']),
  }),
  R(22, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'reverse muda o original',
    stem: h`${saida(C.reverse)}`,
    opts: [h`§[3,2,1,3,2,1]§`, [h`§[3,2,1,1,2,3]§`, h`O §reverse()§ já inverteu §a§ no lugar, então o §concat(a)§ acrescenta §[3,2,1]§ (e não o original).`], [h`§[1,2,3,3,2,1]§`, h`A ordem das operações importa: §a.reverse()§ roda antes do §concat§ e altera §a§.`], [h`§[3,2,1]§`, h`O §concat(a)§ acrescenta os elementos de §a§ ao final, dobrando o tamanho.`]],
    exp: h`§reverse()§ inverte o array *no lugar* e retorna a mesma referência: depois dele §a§ é §[3,2,1]§. Em seguida §concat(a)§ junta os elementos de §a§ (agora §[3,2,1]§) ao array invertido: §[3,2,1,3,2,1]§. Métodos que mutam (§sort§, §reverse§, §splice§) exigem cópia quando a função deve ser pura.`,
    src: [[A3, 'efeito colateral indesejado: mudar o array original']],
    verify: js(C.reverse, ['[3,2,1,3,2,1]', '[3,2,1,1,2,3]', '[1,2,3,3,2,1]', '[3,2,1]']),
  }),
  R(23, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'reduce para contar por grupo',
    stem: h`${saida(C.grupo)}`,
    opts: [h`§{"1":3,"2":1,"3":1}§`, [h`§{"1":1,"2":1,"3":1}§`, h`O acumulador soma 1 a cada ocorrência (§(acc[id] || 0) + 1§); o lugar 1 aparece três vezes.`], [h`§[3,1,1]§`, h`O acumulador é um objeto (§{}§), não um array; as chaves são os §lugarId§.`], [h`§{"1":5}§`, h`Cada §lugarId§ distinto cria sua própria chave; a contagem não é global.`]],
    exp: h`O §reduce§ começa com um objeto vazio e, para cada avaliação, incrementa o contador da chave §lugarId§: o lugar 1 aparece 3 vezes, o 2 uma vez e o 3 uma vez. Resultado: §{"1":3,"2":1,"3":1}§ — o padrão para agrupar/contar dados por categoria.`,
    src: [[A3, 'calcularMedia usa reduce; o mesmo padrão agrega dados']],
    verify: js(C.grupo, ['{"1":3,"2":1,"3":1}', '{"1":1,"2":1,"3":1}', '[3,1,1]', '{"1":5}']),
  }),
  R(24, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Ordenação por dois critérios',
    stem: h`${saida(C.multi)}`,
    opts: [h`§[1,3,2,4]§`, [h`§[1,2,3,4]§`, h`Primeiro vem o critério da nota (decrescente): as notas 5 (ids 1 e 3) precedem as notas 4 (ids 2 e 4).`], [h`§[3,1,4,2]§`, h`No empate de nota o desempate é §a.id - b.id§ (id *crescente*), então 1 vem antes de 3.`], [h`§[2,4,1,3]§`, h`O comparador usa §b.nota - a.nota§ (decrescente): as maiores notas vêm primeiro.`]],
    exp: h`O comparador §b.nota - a.nota || a.id - b.id§ ordena por nota decrescente; quando as notas são iguais (diferença 0, que é “falsy”), o operador §||§ passa para o desempate por id crescente. Notas 5: ids 1 e 3; notas 4: ids 2 e 4 → §[1,3,2,4]§.`,
    src: [[A3, 'ordenarPorNota com Array.prototype.sort (comparador)']],
    verify: js(C.multi, ['[1,3,2,4]', '[1,2,3,4]', '[3,1,4,2]', '[2,4,1,3]']),
  }),
  R(25, {
    diff: 'dificil', scope: 'desafio', sub: 'toSorted (ES2023)',
    stem: h`${saida(C.toSorted)}`,
    opts: [h`§[3,1,2] [1,2,3]§`, [h`§[1,2,3] [1,2,3]§`, h`§toSorted()§ (ES2023) devolve uma cópia ordenada e deixa o array original intacto, diferente de §sort()§.`], [h`§[3,1,2] [3,1,2]§`, h`A cópia retornada é a que está ordenada.`], [h`§undefined [1,2,3]§`, h`O original continua sendo o array §[3,1,2]§; nada o torna §undefined§.`]],
    exp: h`§Array.prototype.toSorted()§ é a versão não destrutiva do §sort()§: retorna um novo array ordenado sem alterar o original (por isso §original§ segue §[3,1,2]§). Equivale a §[...original].sort()§ e dispensa o §slice()§ da aula em ambientes que o suportam.`,
    src: [[A3, 'ordenarPorNota: devolver cópia ordenada, sem alterar o original']],
    verify: js(C.toSorted, ['[3,1,2] [1,2,3]', '[1,2,3] [1,2,3]', '[3,1,2] [3,1,2]', 'undefined [1,2,3]']),
  }),
  R(26, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Coerção em comparações',
    stem: h`${saida(C.coercao)}`,
    opts: [h`§[4,5] []§`, [h`§[4,5] [4]§`, h`§===§ não converte tipos: o número §4§ não é estritamente igual à string §"4"§.`], [h`§[] []§`, h`O operador relacional §>=§ converte a string §"4"§ em número antes de comparar.`], [h`§[3,4,5] [4]§`, h`O primeiro filtro remove o 3 (3 >= 4 é falso).`]],
    exp: h`Operadores relacionais (§>=§) convertem os operandos para número, então §n >= "4"§ funciona e mantém §[4,5]§. Já §===§ exige o mesmo tipo: nenhum número é estritamente igual a §"4"§ e o segundo filtro devolve §[]§. Por isso parâmetros vindos de formulários/URLs (texto) devem ser convertidos com §Number(...)§.`,
    src: [[A3, 'filtrarPorNotaMinima(avaliacoes, notaMinima) com comparação >=']],
    verify: js(C.coercao, ['[4,5] []', '[4,5] [4]', '[] []', '[3,4,5] [4]']),
  }),
  R(27, {
    diff: 'dificil', scope: 'desafio', sub: 'Soma que vira concatenação',
    stem: h`Uma API devolve as notas como texto (§["5","4"]§). O que o código abaixo imprime?\n\n${code(C.strings)}`,
    opts: [h`§054 string§`, [h`§9 number§`, h`Com strings, o operador §+§ concatena em vez de somar: §0 + "5"§ resulta em §"05"§.`], [h`§NaN number§`, h`Não há conversão numérica aqui; o resultado é uma string, não §NaN§.`], [h`§54 string§`, h`A soma começa em §0§ (número), que também entra na concatenação: §"0" + "5" + "4"§ → §"054"§.`]],
    exp: h`O valor inicial é o número §0§. Na primeira iteração §0 + "5"§ vira a string §"05"§ (o §+§ concatena se um dos lados é texto); depois §"05" + "4"§ → §"054"§. O §typeof§ confirma: §string§. Antes de somar notas vindas de JSON/formulário, converta com §Number(n)§ ou §parseFloat§.`,
    src: [[A3, 'calcularMedia: soma das notas (que devem ser números)']],
    verify: js(C.strings, ['054 string', '9 number', 'NaN number', '54 string']),
  }),
];

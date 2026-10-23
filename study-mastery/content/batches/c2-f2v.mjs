// Lote c2-f2v — Funções de duas variáveis: 5 fáceis (001–005), 5 médias (006–010), 5 difíceis (011–015).
// Base: slides da Aula 12 (Funcao2Var_Introducao.pdf, exemplos 1–5, lidos por renderização): valor numérico,
// modelo de demanda, quociente de diferenças f(3+Δx,4)−f(3,4), curvas de nível e receita de dois produtos.
import { m } from '../../tools/lib/dsl.ts';

const F = 'c2-f2v-intro';
const R = (n, o) => ({ d: 'calculo2', topic: 'funcoes-2-var', ...o, id: `c2-funcoes-2-var-${String(n).padStart(3, '0')}` });
const ex = (expr, numeric, values, extra = {}) => ({ kind: 'expr', params: { expr, numeric }, values, ...extra });
const fn = (expr, variable, values) => ({ kind: 'function', params: { expr, var: variable }, values });
const lab = (...a) => a.map((s) => `'${s}'`); // rótulos textuais entre aspas para o verificador
// avalia expressão em (x,y)=(a,b) sem depender de substituição simultânea
const at = (e, a, b) => `subs(subs(${e},x,${a}),y,${b})`;

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'Valor numérico',
    stem: m`Seja $f(x,y)=3x-y^{2}$. Calcule $f(2,-3)$.`,
    opts: [m`$-3$`, [m`$15$`, m`Ao calcular $y^2$ com $y=-3$ obtém-se $+9$, mas o termo entra com sinal negativo: $6-9=-3$, e não $6+9$.`], [m`$3$`, m`Trocou o sinal do resultado: $3\cdot2-(-3)^2=6-9=-3$.`], [m`$-15$`, m`Aplicou o sinal negativo também a $3x$: $-6-9=-15$. Só $y^2$ é subtraído.`]],
    exp: m`Substitua $x=2$ e $y=-3$: $f(2,-3)=3\cdot2-(-3)^{2}=6-9=-3$.`,
    steps: [m`$3x=3\cdot2=6$.`, m`$y^{2}=(-3)^{2}=9$.`, m`$f(2,-3)=6-9=-3$.`],
    src: [[F, 'exemplo 1: valor da função em pares ordenados']],
    verify: ex(at('3*x-y**2', 2, -3), '6-9', ['-3', '15', '3', '-15']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'Demanda com dois preços',
    stem: m`A demanda semanal de iogurte (em unidades) é $q=120-3x+2y$, em que $x$ é o preço do iogurte e $y$ é o preço de um produto substituto. Qual é a demanda se $x=15$ e $y=10$?`,
    opts: [m`$95$`, [m`$55$`, m`Subtraiu o termo do substituto: o coeficiente de $y$ é $+2$, logo soma-se $2\cdot10=20$.`], [m`$85$`, m`Usou $-3x+y$ (esqueceu o coeficiente $2$ de $y$): $120-45+10=85$.`], [m`$145$`, m`Inverteu os sinais dos dois termos ($120+45-20$): o preço próprio reduz a demanda ($-3x$) e o substituto a aumenta ($+2y$).`]],
    exp: m`Substituindo: $q=120-3\cdot15+2\cdot10=120-45+20=95$ unidades.`,
    steps: [m`$-3x=-45$ e $2y=20$.`, m`$q=120-45+20$.`, m`$q=95$.`],
    src: [[F, 'exemplo 2: demanda q = f(p1, p2)']],
    verify: ex(at('120-3*x+2*y', 15, 10), '120-45+20', ['95', '55', '85', '145']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'Receita de dois produtos',
    stem: m`Uma loja vende dois produtos: o primeiro a $450$ reais a unidade e o segundo a $700$ reais. Se foram vendidas $12$ unidades do primeiro e $8$ do segundo, qual foi a receita total, em reais?`,
    opts: [m`$11000$`, [m`$12000$`, m`Multiplicou cruzado ($450\cdot8+700\cdot12$): cada preço deve ser multiplicado pela *sua* quantidade.`], [m`$1150$`, m`Somou apenas os preços ($450+700$), sem multiplicar pelas quantidades.`], [m`$20$`, m`$20=12+8$ é o total de unidades, não a receita.`]],
    exp: m`A receita é $R(x,y)=450x+700y$, com $x=12$ e $y=8$: $R=450\cdot12+700\cdot8=5400+5600=11000$ reais.`,
    steps: [m`$R(x,y)=450x+700y$.`, m`$450\cdot12=5400$ e $700\cdot8=5600$.`, m`$R=11000$.`],
    src: [[F, 'exemplo 5: receita com dois produtos']],
    verify: ex(at('450*x+700*y', 12, 8), '5400+5600', ['11000', '12000', '1150', '20']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'Domínio',
    stem: m`Qual é o domínio de $f(x,y)=\dfrac{1}{x-y}$?`,
    opts: [m`todos os pares $(x,y)$ com $x\neq y$`, [m`apenas os pares com $x=y$`, m`Em $x=y$ o denominador se anula e a função *não* está definida.`], [m`todos os pares com $x>y$`, m`Para $x<y$ o denominador é negativo mas não nulo, e a função está definida.`], [m`todos os pares com $x\neq0$ e $y\neq0$`, m`O denominador depende de $x-y$; pontos como $(1,0)$ pertencem ao domínio.`]],
    exp: m`A fração só não existe onde o denominador é zero: $x-y=0\iff x=y$. Portanto o domínio é o plano inteiro menos a reta $y=x$.`,
    steps: [m`Condição: $x-y\neq0$.`, m`$x-y=0\iff x=y$ (reta).`, m`Domínio: $x\neq y$.`],
    src: [[F, 'exemplo 3: valor da função e restrição do denominador']],
    verify: ex(`'x!=y' if (solve(x-y,x)==[y] and ${at('x-y', 1, 1)}==0 and ${at('x-y', 1, 2)}!=0 and ${at('x-y', 2, 1)}!=0 and ${at('x-y', 1, 0)}!=0) else 'outro'`, "'x!=y'", lab('x!=y', 'x=y', 'x>y', 'x!=0,y!=0')),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'Curva de nível',
    stem: m`Qual dos pontos pertence à curva de nível $f(x,y)=6$ da função $f(x,y)=2x+y$?`,
    opts: [m`$(1,4)$`, [m`$(2,3)$`, m`$f(2,3)=4+3=7\neq6$.`], [m`$(3,3)$`, m`$f(3,3)=6+3=9\neq6$.`], [m`$(2,6)$`, m`$f(2,6)=4+6=10\neq6$.`]],
    exp: m`Um ponto está na curva de nível $6$ quando $2x+y=6$. Em $(1,4)$: $2\cdot1+4=6$ ✓. Em $(2,3)$: $7$; em $(3,3)$: $9$; em $(2,6)$: $10$.`,
    steps: [m`Teste $2x+y=6$ em cada ponto.`, m`$(1,4)$: $2+4=6$ ✓.`, m`Os demais dão $7$, $9$ e $10$.`],
    src: [[F, 'exemplo 4: f(x,y) = 2 (curva de nível)']],
    verify: { kind: 'expr', params: { target: 'v' }, perOption: [
      { expr: `'v' if ${at('2*x+y', 1, 4)}==6 else 'f'`, numeric: "'v' if 2*1+4==6 else 'f'" },
      { expr: `'v' if ${at('2*x+y', 2, 3)}==6 else 'f'`, numeric: "'v' if 2*2+3==6 else 'f'" },
      { expr: `'v' if ${at('2*x+y', 3, 3)}==6 else 'f'`, numeric: "'v' if 2*3+3==6 else 'f'" },
      { expr: `'v' if ${at('2*x+y', 2, 6)}==6 else 'f'`, numeric: "'v' if 2*2+6==6 else 'f'" },
    ], values: ['v', 'f', 'f', 'f'] },
  }),

  // ---------------- MÉDIAS ----------------
  R(6, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Domínio com raiz',
    stem: m`Qual é o domínio de $f(x,y)=\sqrt{9-x^{2}-y^{2}}$?`,
    opts: [m`$x^{2}+y^{2}\le9$ (disco de raio $3$)`, [m`$x^{2}+y^{2}\ge9$`, m`É a região *fora* do disco; lá o radicando $9-x^2-y^2$ é negativo.`], [m`$x^{2}+y^{2}\le3$`, m`O raio é $\sqrt9=3$, então a condição é $x^2+y^2\le9$ (e não $\le3$).`], [m`$x+y\le9$`, m`A condição envolve $x^2+y^2$, não $x+y$; o domínio é um disco, não um semiplano.`]],
    exp: m`A raiz exige radicando não negativo: $9-x^2-y^2\ge0\iff x^2+y^2\le9$. É o disco de centro na origem e raio $3$, incluindo a circunferência.`,
    steps: [m`Radicando $\ge0$: $9-x^{2}-y^{2}\ge0$.`, m`$x^{2}+y^{2}\le9$.`, m`Disco de raio $3$.`],
    src: [[F, 'conceito de função de duas variáveis (domínio)']],
    verify: ex(`'x2+y2<=9' if (${at('9-x**2-y**2', 3, 0)}==0 and ${at('9-x**2-y**2', 0, 0)}>0 and ${at('9-x**2-y**2', 4, 0)}<0 and ${at('9-x**2-y**2', 0, 3)}==0) else 'outro'`, "'x2+y2<=9'", lab('x2+y2<=9', 'x2+y2>=9', 'x2+y2<=3', 'x+y<=9')),
  }),
  R(7, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Domínio com logaritmo',
    stem: m`Qual é o domínio de $f(x,y)=\ln(x-y)$?`,
    opts: [m`$x>y$`, [m`$x\ge y$`, m`Em $x=y$ temos $\ln0$, que não existe: a desigualdade deve ser estrita.`], [m`$x\neq y$`, m`Para $x<y$ o argumento é negativo e o logaritmo real não existe.`], [m`$x>0$ e $y>0$`, m`A condição é sobre $x-y$; por exemplo $(1,-5)$ está no domínio e $(2,3)$ não está.`]],
    exp: m`O logaritmo exige argumento positivo: $x-y>0\iff x>y$. Portanto o domínio é o semiplano abaixo da reta $y=x$, sem a reta.`,
    steps: [m`Condição: $x-y>0$.`, m`$x>y$.`, m`Semiplano aberto abaixo da reta $y=x$.`],
    src: [[F, 'conceito de função de duas variáveis (domínio)']],
    verify: ex(`'x>y' if (${at('x-y', 2, 1)}>0 and ${at('x-y', 1, 1)}==0 and ${at('x-y', 1, 2)}<0 and ${at('x-y', 1, -5)}>0 and ${at('x-y', 2, 3)}<0) else 'outro'`, "'x>y'", lab('x>y', 'x>=y', 'x!=y', 'x>0,y>0')),
  }),
  R(8, {
    diff: 'medio', scope: 'aula', sub: 'Variação da função em x',
    stem: m`Seja $f(x,y)=x^{2}y$. Simplifique $f(3+\Delta x,\,4)-f(3,4)$.`,
    opts: [m`$24\,\Delta x+4(\Delta x)^{2}$`, [m`$4(\Delta x)^{2}$`, m`Esqueceu o termo cruzado de $(3+\Delta x)^2=9+6\Delta x+(\Delta x)^2$, que gera $24\,\Delta x$.`], [m`$24\,\Delta x$`, m`Faltou o termo $4(\Delta x)^2$ vindo do quadrado de $\Delta x$.`], [m`$36+24\,\Delta x+4(\Delta x)^{2}$`, m`Esse é $f(3+\Delta x,4)$; falta subtrair $f(3,4)=36$.`]],
    exp: m`$f(3+\Delta x,4)=4(3+\Delta x)^2=4\bigl(9+6\Delta x+(\Delta x)^2\bigr)=36+24\Delta x+4(\Delta x)^2$ e $f(3,4)=9\cdot4=36$. A diferença é $24\,\Delta x+4(\Delta x)^2$.`,
    steps: [m`$f(3+\Delta x,4)=4(3+\Delta x)^{2}$.`, m`$=36+24\Delta x+4(\Delta x)^{2}$.`, m`Subtraia $f(3,4)=36$.`],
    src: [[F, 'exemplo 3c: f(3+Δx, 4) − f(3, 4)']],
    verify: fn('4*(3+h)**2-4*3**2', 'h', ['24*h+4*h**2', '4*h**2', '24*h', '36+24*h+4*h**2']),
  }),
  R(9, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Lucro com dois produtos',
    stem: m`Uma fábrica tem receita $R(x,y)=20x+30y$ e custo $C(x,y)=500+8x+12y$ (em reais), em que $x$ e $y$ são as quantidades produzidas e vendidas de dois produtos. Qual é o lucro $L=R-C$ para $x=40$ e $y=25$?`,
    opts: [m`$430$ reais`, [m`$1550$ reais`, m`$1550$ é só a receita; o lucro é receita *menos* custo.`], [m`$1120$ reais`, m`$1120$ é só o custo ($500+320+300$); falta calcular $R-C$.`], [m`$2670$ reais`, m`Somou receita e custo; lucro é a *diferença* $R-C$.`]],
    exp: m`$R(40,25)=20\cdot40+30\cdot25=800+750=1550$. $C(40,25)=500+8\cdot40+12\cdot25=500+320+300=1120$. Lucro: $L=1550-1120=430$ reais.`,
    steps: [m`$R=800+750=1550$.`, m`$C=500+320+300=1120$.`, m`$L=1550-1120=430$.`],
    src: [[F, 'exemplo 5: receita de dois produtos (estendido para custo e lucro)']],
    verify: ex(`${at('20*x+30*y', 40, 25)}-${at('500+8*x+12*y', 40, 25)}`, '1550-1120', ['430', '1550', '1120', '2670']),
  }),
  R(10, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Forma de uma curva de nível',
    stem: m`Qual é a curva de nível $f(x,y)=25$ da função $f(x,y)=x^{2}+y^{2}$?`,
    opts: [m`uma circunferência de centro na origem e raio $5$`, [m`uma circunferência de centro na origem e raio $25$`, m`$x^2+y^2=25$ é $r^2=25$; o raio é $\sqrt{25}=5$.`], [m`uma reta`, m`$x^2+y^2=25$ não é equação de reta: tem termos quadráticos em $x$ e em $y$.`], [m`uma parábola`, m`Parábola tem apenas uma variável ao quadrado; aqui há $x^2$ e $y^2$ somados.`]],
    exp: m`A curva de nível $25$ é o conjunto dos pontos com $x^2+y^2=25$: circunferência de centro $(0,0)$ e raio $5$. Por exemplo, $(3,4)$, $(5,0)$ e $(0,5)$ pertencem a ela.`,
    steps: [m`Igualar: $x^{2}+y^{2}=25$.`, m`Reconhecer $r^{2}=25$.`, m`Raio $5$ (ex.: $(3,4)$ pertence).`],
    src: [[F, 'exemplo 4: curvas de nível']],
    verify: ex(`'circ5' if (${at('x**2+y**2', 3, 4)}==25 and ${at('x**2+y**2', 5, 0)}==25 and ${at('x**2+y**2', 0, 5)}==25 and ${at('x**2+y**2', 0, 0)}!=25) else 'outro'`, "'circ5'", lab('circ5', 'circ25', 'reta', 'parabola')),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(11, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Domínio com produto sob a raiz',
    stem: m`Qual é o domínio de $f(x,y)=\sqrt{xy}$?`,
    opts: [m`os pares com $xy\ge0$ (com os eixos)`, [m`os pares com $x\ge0$ e $y\ge0$`, m`Isso descarta o 3º quadrante, mas $(-2,-3)$ tem $xy=6\ge0$ e pertence ao domínio.`], [m`os pares com $xy>0$`, m`Os eixos têm $xy=0$ e $\sqrt0=0$ existe; eles pertencem ao domínio.`], [m`os pares com $x+y\ge0$`, m`A condição é sobre o produto: $(5,-1)$ tem $x+y\ge0$, mas $xy=-5<0$.`]],
    exp: m`A raiz exige $xy\ge0$: $x$ e $y$ com o mesmo sinal ou algum deles nulo. É a união do 1º e do 3º quadrantes com os dois eixos coordenados.`,
    steps: [m`Condição: $xy\ge0$.`, m`Sinais iguais ou fator nulo.`, m`1º e 3º quadrantes + eixos.`],
    src: [[F, 'conceito de função de duas variáveis (domínio)']],
    verify: ex(`'xy>=0' if (${at('x*y', -2, -3)}>=0 and ${at('x*y', 0, 5)}==0 and ${at('x*y', 5, -1)}<0 and ${at('x*y', -1, 2)}<0 and ${at('x*y', 2, 3)}>0) else 'outro'`, "'xy>=0'", lab('xy>=0', 'x>=0,y>=0', 'xy>0', 'x+y>=0')),
  }),
  R(12, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Domínio com raiz e logaritmo',
    stem: m`Qual é o domínio de $f(x,y)=\sqrt{y-x^{2}}+\ln(4-y)$?`,
    opts: [m`$x^{2}\le y<4$`, [m`$x^{2}\le y\le4$`, m`Em $y=4$ temos $\ln0$, indefinido: o limite superior é estrito.`], [m`$y\ge x^{2}$`, m`Falta a condição do logaritmo, $4-y>0$.`], [m`$y<4$ e $y\le x^{2}$`, m`A raiz exige $y-x^2\ge0$, isto é, $y\ge x^2$ (o sentido está invertido).`]],
    exp: m`Raiz: $y-x^2\ge0\iff y\ge x^2$. Logaritmo: $4-y>0\iff y<4$. Juntas: $x^2\le y<4$, região dentro da parábola $y=x^2$ e abaixo da reta $y=4$ (com a parábola, sem a reta).`,
    steps: [m`$y-x^{2}\ge0\iff y\ge x^{2}$.`, m`$4-y>0\iff y<4$.`, m`Interseção: $x^{2}\le y<4$.`],
    src: [[F, 'conceito de função de duas variáveis (domínio)']],
    verify: ex(`'x2<=y<4' if (${at('y-x**2', 0, 0)}>=0 and ${at('4-y', 0, 4)}==0 and ${at('y-x**2', 1, 3)}>=0 and ${at('4-y', 1, 3)}>0 and ${at('y-x**2', 0, -1)}<0 and ${at('y-x**2', 3, 5)}<0) else 'outro'`, "'x2<=y<4'", lab('x2<=y<4', 'x2<=y<=4', 'y>=x2', 'y<4,y<=x2')),
  }),
  R(13, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Composição com parâmetro',
    stem: m`Seja $f(x,y)=x^{2}+y$. Se $x=t+1$ e $y=t^{2}$, qual é a expressão de $F(t)=f(t+1,\,t^{2})$?`,
    opts: [m`$2t^{2}+2t+1$`, [m`$2t^{2}+1$`, m`Escreveu $(t+1)^2=t^2+1$, esquecendo o termo cruzado $2t$.`], [m`$(t+1)^{2}+t$`, m`Substituiu $y$ por $t$ em vez de $t^2$.`], [m`$(t+1)^{2}\,t^{2}$`, m`Multiplicou os termos; $f$ soma $x^2$ e $y$.`]],
    exp: m`Substituindo na definição $f(x,y)=x^2+y$: $F(t)=(t+1)^2+t^2=t^2+2t+1+t^2=2t^2+2t+1$.`,
    steps: [m`$x^{2}=(t+1)^{2}=t^{2}+2t+1$.`, m`$y=t^{2}$.`, m`$F(t)=2t^{2}+2t+1$.`],
    src: [[F, 'exemplos de avaliação de f(x,y) em expressões']],
    verify: fn('(t+1)**2+t**2', 't', ['2*t**2+2*t+1', '2*t**2+1', '(t+1)**2+t', '(t+1)**2*t**2']),
  }),
  R(14, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Retornos de escala',
    stem: m`Uma produção segue $Q(x,y)=10\sqrt{xy}$, em que $x$ e $y$ são as quantidades de dois insumos. Se os dois insumos são dobrados simultaneamente, por quanto fica multiplicada a produção $Q$?`,
    opts: [m`por $2$`, [m`por $4$`, m`$\sqrt{2x\cdot2y}=\sqrt{4xy}=2\sqrt{xy}$: a raiz reduz o fator $4$ para $2$.`], [m`por $\sqrt2$`, m`O fator de $xy$ é $4$ e $\sqrt4=2$, não $\sqrt2$.`], [m`por $1$ (não muda)`, m`Dobrar os insumos altera $Q$: $Q(2x,2y)=2\,Q(x,y)$.`]],
    exp: m`$Q(2x,2y)=10\sqrt{2x\cdot2y}=10\sqrt{4xy}=10\cdot2\sqrt{xy}=2\,Q(x,y)$. A produção dobra (retornos constantes de escala). Exemplo: $Q(4,9)=60$ e $Q(8,18)=10\sqrt{144}=120$.`,
    steps: [m`$Q(2x,2y)=10\sqrt{4xy}$.`, m`$\sqrt{4xy}=2\sqrt{xy}$.`, m`$Q(2x,2y)=2Q(x,y)$.`],
    src: [[F, 'função de duas variáveis aplicada à produção (generalização do exemplo 2)']],
    verify: ex('sqrt(2*4*2*9)/sqrt(4*9)', '12/6', ['2', '4', 'sqrt(2)', '1']),
  }),
  R(15, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Curva de nível por um ponto',
    stem: m`Qual é a equação da curva de nível de $f(x,y)=x^{2}-y$ que passa pelo ponto $(2,-1)$?`,
    opts: [m`$y=x^{2}-5$`, [m`$y=x^{2}+5$`, m`Isolando $y$ em $x^2-y=5$ obtém-se $y=x^2-5$ (o sinal de $5$ foi trocado).`], [m`$y=x^{2}-3$`, m`Usou $f(2,1)=3$, trocando o sinal de $y$: $f(2,-1)=4+1=5$.`], [m`$y=5-x^{2}$`, m`Isolou errado: de $x^2-y=5$ sai $y=x^2-5$, e não $5-x^2$.`]],
    exp: m`O nível é o valor da função no ponto: $f(2,-1)=2^2-(-1)=4+1=5$. A curva de nível é $x^2-y=5$, isto é, $y=x^2-5$ (uma parábola).`,
    steps: [m`$c=f(2,-1)=4+1=5$.`, m`$x^{2}-y=5$.`, m`$y=x^{2}-5$.`],
    src: [[F, 'exemplo 4: curvas de nível']],
    verify: ex(`solve(x**2-y-${at('x**2-y', 2, -1)},y)[0]`, 'x**2-5', ['x**2-5', 'x**2+5', 'x**2-3', '5-x**2']),
  }),
];

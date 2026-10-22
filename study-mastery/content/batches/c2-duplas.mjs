// Lote c2-duplas — Integrais duplas: 6 fáceis (001–006), 6 médias (007–012), 6 difíceis (013–018).
// Base: ementa/conteúdo programático da disciplina (c2-programa); não há slides do tema no material recebido.
// Verificação: SymPy (integral iterada exata) + quadratura aninhada mpmath na ordem original; quando indicado,
// a ordem invertida (Fubini) também é calculada e comparada.
import { m } from '../../tools/lib/dsl.ts';

const P = 'c2-programa';
const loc = 'conteúdo programático: integrais duplas';
const R = (n, o) => ({ d: 'calculo2', topic: 'integrais-duplas', ...o, id: `c2-integrais-duplas-${String(n).padStart(3, '0')}` });
const seg = ([variable, lo, hi]) => ({ var: variable, lo, hi });
// dbl(f, [var interna, lo, hi], [var externa, lo, hi], valores, extras)
const dbl = (expr, inner, outer, values, extra = {}) => ({
  kind: 'double',
  params: { expr, inner: seg(inner), outer: seg(outer), ...(extra.swap ? { swap: { inner: seg(extra.swap[0]), outer: seg(extra.swap[1]) } } : {}), ...(extra.exactFrom ? { exactFrom: extra.exactFrom } : {}) },
  values,
});

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'Integrando constante',
    stem: m`Calcule $\displaystyle\iint_R 6\,dA$, em que $R=[0,2]\times[0,3]$.`,
    opts: [m`$36$`, [m`$6$`, m`Esse é só o valor do integrando; falta multiplicar pela área de $R$ ($2\cdot3=6$).`], [m`$12$`, m`Integrou apenas em $x$ ($6\cdot2$); falta a integral em $y$, de comprimento $3$.`], [m`$18$`, m`Integrou apenas em $y$ ($6\cdot3$); falta a integral em $x$, de comprimento $2$.`]],
    exp: m`Para integrando constante, $\iint_R c\,dA=c\cdot\text{área}(R)$. A área de $R$ é $2\cdot3=6$, então o valor é $6\cdot6=36$. Em forma iterada: $\int_0^2\int_0^3 6\,dy\,dx=\int_0^2 18\,dx=36$.`,
    steps: [m`$\int_0^3 6\,dy=18$.`, m`$\int_0^2 18\,dx=36$.`],
    src: [[P, loc]],
    verify: dbl('6', ['y', '0', '3'], ['x', '0', '2'], ['36', '6', '12', '18']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'Integral iterada simples',
    stem: m`Calcule $\displaystyle\int_0^1\!\int_0^2 (x+y)\,dy\,dx$.`,
    opts: [m`$3$`, [m`$5$`, m`$\int_0^2(x+y)\,dy=2x+\frac{y^2}{2}\big|_0^2=2x+2$; usar $y^2=4$ sem dividir por $2$ dá $2x+4$ e o resultado errado $5$.`], [m`$1$`, m`Esse é só o efeito do termo $x$ ($\iint x\,dA=1$); falta a contribuição de $y$.`], [m`$2$`, m`Esse é só o efeito do termo $y$ ($\iint y\,dA=2$); falta a contribuição de $x$.`]],
    exp: m`Integral interna (em $y$, com $x$ constante): $\int_0^2(x+y)\,dy=2x+2$. Externa: $\int_0^1(2x+2)\,dx=\left[x^2+2x\right]_0^1=3$.`,
    steps: [m`$\int_0^2(x+y)\,dy=2x+2$.`, m`$\int_0^1(2x+2)\,dx=1+2$.`, m`Resultado: $3$.`],
    src: [[P, loc]],
    verify: dbl('x+y', ['y', '0', '2'], ['x', '0', '1'], ['3', '5', '1', '2']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'Retângulo com produto',
    stem: m`Calcule $\displaystyle\int_1^2\!\int_0^1 xy\,dy\,dx$.`,
    opts: [m`$\dfrac34$`, [m`$\dfrac32$`, m`Esqueceu o fator $\frac12$ de $\int_0^1y\,dy=\frac12$.`], [m`$\dfrac38$`, m`Dividiu por $2$ a mais: $\int_1^2x\,dx=\frac32$ (e não $\frac34$).`], [m`$\dfrac14$`, m`Usou os limites $0$ a $1$ para $x$; o enunciado dá $1$ a $2$ ($\int_1^2x\,dx=\frac32$).`]],
    exp: m`$\int_0^1xy\,dy=x\cdot\frac12$. Depois $\int_1^2\frac x2\,dx=\frac12\cdot\left[\frac{x^2}{2}\right]_1^2=\frac12\cdot\frac32=\frac34$.`,
    steps: [m`$\int_0^1 xy\,dy=\dfrac{x}{2}$.`, m`$\int_1^2\dfrac{x}{2}\,dx=\dfrac12\cdot\dfrac32$.`, m`$=\dfrac34$.`],
    src: [[P, loc]],
    verify: dbl('x*y', ['y', '0', '1'], ['x', '1', '2'], ['3/4', '3/2', '3/8', '1/4']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'Área por integral dupla',
    stem: m`Use uma integral dupla para calcular a área da região $D=\{(x,y):0\le x\le4,\ 0\le y\le x\}$.`,
    opts: [m`$8$`, [m`$16$`, m`Esse é o quadrado $4\times4$; $D$ é só o triângulo abaixo da diagonal.`], [m`$4$`, m`$\int_0^4dx=4$ ignora a integral interna, que fornece a altura $x$.`], [m`$\dfrac{64}{3}$`, m`Integrou $x^2$ no final; a integral interna $\int_0^x dy=x$ leva a $\int_0^4x\,dx$.`]],
    exp: m`$\text{área}(D)=\iint_D dA=\int_0^4\!\int_0^x dy\,dx=\int_0^4x\,dx=\left[\frac{x^2}{2}\right]_0^4=8$ (triângulo de base $4$ e altura $4$).`,
    steps: [m`$\int_0^x dy=x$.`, m`$\int_0^4x\,dx=\dfrac{4^{2}}{2}$.`, m`$=8$.`],
    src: [[P, loc]],
    verify: dbl('1', ['y', '0', 'x'], ['x', '0', '4'], ['8', '16', '4', '64/3']),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'Integrando só de x',
    stem: m`Calcule $\displaystyle\int_0^1\!\int_0^2 3x^{2}\,dy\,dx$.`,
    opts: [m`$2$`, [m`$1$`, m`Esse é $\int_0^13x^2\,dx$; falta multiplicar pelo comprimento $2$ do intervalo de $y$.`], [m`$6$`, m`$\int_0^23x^2\,dy=6x^2$ ainda depende de $x$; falta integrar em $x$ ($\int_0^16x^2\,dx=2$).`], [m`$12$`, m`Integrou em $y$ duas vezes (fator $2\cdot2$) e esqueceu o $\frac13$ de $\int x^2\,dx$.`]],
    exp: m`Como $3x^2$ não depende de $y$: $\int_0^23x^2\,dy=6x^2$. Depois $\int_0^16x^2\,dx=\left[2x^3\right]_0^1=2$.`,
    steps: [m`$\int_0^2 3x^{2}\,dy=6x^{2}$.`, m`$\int_0^1 6x^{2}\,dx=2x^{3}\big|_0^1$.`, m`$=2$.`],
    src: [[P, loc]],
    verify: dbl('3*x**2', ['y', '0', '2'], ['x', '0', '1'], ['2', '1', '6', '12']),
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'Integral separável',
    stem: m`Calcule $\displaystyle\iint_R xy\,dA$, com $R=[0,2]\times[0,3]$.`,
    opts: [m`$9$`, [m`$6$`, m`Tratou $\int x\,dx$ como $x$ e $\int y\,dy$ como $y$ (sem os fatores $\frac12$): $2\cdot3$.`], [m`$\dfrac92$`, m`Só a parte em $y$: $\int_0^3y\,dy=\frac92$; falta o fator $\int_0^2x\,dx=2$.`], [m`$2$`, m`Só a parte em $x$: $\int_0^2x\,dx=2$; falta o fator $\int_0^3y\,dy=\frac92$.`]],
    exp: m`Como $R$ é um retângulo e o integrando é produto de uma função de $x$ por uma de $y$: $\iint_Rxy\,dA=\int_0^2x\,dx\cdot\int_0^3y\,dy=2\cdot\frac92=9$.`,
    steps: [m`$\int_0^2x\,dx=2$.`, m`$\int_0^3y\,dy=\dfrac92$.`, m`Produto: $9$.`],
    src: [[P, loc]],
    verify: dbl('x*y', ['y', '0', '3'], ['x', '0', '2'], ['9', '6', '9/2', '2']),
  }),

  // ---------------- MÉDIAS ----------------
  R(7, {
    diff: 'medio', scope: 'aula', sub: 'Região triangular',
    stem: m`Calcule $\displaystyle\int_0^1\!\int_0^x (x+3y)\,dy\,dx$.`,
    opts: [m`$\dfrac56$`, [m`$2$`, m`Usou $y$ de $0$ a $1$ (retângulo); aqui o limite superior de $y$ é $x$.`], [m`$\dfrac43$`, m`$\int_0^x 3y\,dy=\frac{3x^2}{2}$; sem o $\frac12$ a interna vira $4x^2$ e o resultado sai $\frac43$.`], [m`$\dfrac5{12}$`, m`Dividiu por $2$ a mais ao integrar $\frac52x^2$ em $x$ ($\int_0^1\frac52x^2\,dx=\frac56$).`]],
    exp: m`Interna: $\int_0^x(x+3y)\,dy=x\cdot x+\frac{3x^2}{2}=\frac52x^2$. Externa: $\int_0^1\frac52x^2\,dx=\frac52\cdot\frac13=\frac56$.`,
    steps: [m`$\int_0^x (x+3y)\,dy=\dfrac{5}{2}x^{2}$.`, m`$\int_0^1\dfrac52x^{2}\,dx=\dfrac52\cdot\dfrac13$.`, m`$=\dfrac56$.`],
    src: [[P, loc]],
    verify: dbl('x+3*y', ['y', '0', 'x'], ['x', '0', '1'], ['5/6', '2', '4/3', '5/12']),
  }),
  R(8, {
    diff: 'medio', scope: 'aula', sub: 'Região sob uma parábola',
    stem: m`Calcule $\displaystyle\iint_D x\,dA$, em que $D=\{(x,y):0\le x\le2,\ 0\le y\le x^{2}\}$.`,
    opts: [m`$4$`, [m`$\dfrac83$`, m`Esse é $\iint_D1\,dA=\int_0^2x^2\,dx$, a área de $D$; esqueceu o integrando $x$.`], [m`$16$`, m`$\int_0^2x^3\,dx=\frac{x^4}{4}\big|_0^2=4$; sem dividir por $4$ dá $16$.`], [m`$8$`, m`Dividiu por $2$ em vez de $4$ ao integrar $x^3$.`]],
    exp: m`Interna: $\int_0^{x^2}x\,dy=x\cdot x^2=x^3$. Externa: $\int_0^2x^3\,dx=\left[\frac{x^4}{4}\right]_0^2=\frac{16}{4}=4$.`,
    steps: [m`$\int_0^{x^{2}}x\,dy=x^{3}$.`, m`$\int_0^2x^{3}\,dx=\dfrac{x^{4}}{4}\Big|_0^2$.`, m`$=4$.`],
    src: [[P, loc]],
    verify: dbl('x', ['y', '0', 'x**2'], ['x', '0', '2'], ['4', '8/3', '16', '8']),
  }),
  R(9, {
    diff: 'medio', scope: 'aula', sub: 'Área entre curvas',
    stem: m`Qual é a área da região limitada por $y=x^{2}$ (abaixo) e $y=x$ (acima), para $0\le x\le1$?`,
    opts: [m`$\dfrac16$`, [m`$\dfrac13$`, m`Esse é $\int_0^1x^2\,dx$, a área sob a parábola; é preciso subtrair da área sob a reta.`], [m`$\dfrac12$`, m`Esse é $\int_0^1x\,dx$, a área sob a reta; é preciso descontar a parte sob a parábola.`], [m`$\dfrac56$`, m`Somou as duas áreas ($\frac12+\frac13$) em vez de subtrair.`]],
    exp: m`$\text{área}=\int_0^1\!\int_{x^2}^{x}dy\,dx=\int_0^1(x-x^2)\,dx=\frac12-\frac13=\frac16$.`,
    steps: [m`$\int_{x^{2}}^{x}dy=x-x^{2}$.`, m`$\int_0^1(x-x^{2})\,dx=\dfrac12-\dfrac13$.`, m`$=\dfrac16$.`],
    src: [[P, loc]],
    verify: dbl('1', ['y', 'x**2', 'x'], ['x', '0', '1'], ['1/6', '1/3', '1/2', '5/6']),
  }),
  R(10, {
    diff: 'medio', scope: 'aula', sub: 'Integrando polinomial',
    stem: m`Calcule $\displaystyle\int_0^2\!\int_0^1 (3x^{2}y+2)\,dy\,dx$.`,
    opts: [m`$8$`, [m`$4$`, m`Esse valor vem só do termo $3x^2y$; falta a contribuição da constante $2$ (que dá $2\cdot2=4$).`], [m`$12$`, m`Esqueceu o fator $\frac12$ de $\int_0^1y\,dy$ no termo $3x^2y$: $3x^2$ em vez de $\frac32x^2$.`], [m`$6$`, m`Somou $2$ ao resultado em vez de integrar a constante sobre a região: $4+2=6$.`]],
    exp: m`Interna: $\int_0^1(3x^2y+2)\,dy=\frac32x^2+2$. Externa: $\int_0^2\left(\frac32x^2+2\right)dx=\left[\frac{x^3}{2}+2x\right]_0^2=4+4=8$.`,
    steps: [m`$\int_0^1 (3x^{2}y+2)\,dy=\dfrac32x^{2}+2$.`, m`$\int_0^2\left(\dfrac32x^{2}+2\right)dx=4+4$.`, m`$=8$.`],
    src: [[P, loc]],
    verify: dbl('3*x**2*y+2', ['y', '0', '1'], ['x', '0', '2'], ['8', '4', '12', '6']),
  }),
  R(11, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Volume sob um plano',
    stem: m`Qual é o volume do sólido sob o plano $z=6-x-y$ e acima do retângulo $R=[0,2]\times[0,3]$?`,
    opts: [m`$21$`, [m`$36$`, m`Esse é o volume do prisma de altura constante $6$ (ignorou os termos $-x$ e $-y$).`], [m`$27$`, m`Desconsiderou o termo $-x$: $\int_0^2(13{,}5)\,dx=27$.`], [m`$30$`, m`Desconsiderou o termo $-y$: $\int_0^2(18-3x)\,dx=30$.`]],
    exp: m`$V=\int_0^2\!\int_0^3(6-x-y)\,dy\,dx$. Interna: $18-3x-\frac92=\frac{27}{2}-3x$. Externa: $\int_0^2\left(\frac{27}{2}-3x\right)dx=27-6=21$.`,
    steps: [m`$\int_0^3(6-x-y)\,dy=\dfrac{27}{2}-3x$.`, m`$\int_0^2\left(\dfrac{27}{2}-3x\right)dx=27-6$.`, m`$V=21$.`],
    src: [[P, loc]],
    verify: dbl('6-x-y', ['y', '0', '3'], ['x', '0', '2'], ['21', '36', '27', '30']),
  }),
  R(12, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Integrando trigonométrico',
    stem: m`Calcule $\displaystyle\int_0^1\!\int_0^{\pi/2} x\sin y\,dy\,dx$.`,
    opts: [m`$\dfrac12$`, [m`$1$`, m`$\int_0^{\pi/2}\sin y\,dy=1$, mas ainda falta $\int_0^1x\,dx=\frac12$.`], [m`$0$`, m`Tomou só $-\cos\frac\pi2=0$ e esqueceu o termo $+\cos0=1$ da primitiva.`], [m`$-\dfrac12$`, m`Trocou o sinal: $\int\sin y\,dy=-\cos y$ (e não $+\cos y$).`]],
    exp: m`O integrando é produto de uma função de $x$ por uma de $y$: $\int_0^1x\,dx\cdot\int_0^{\pi/2}\sin y\,dy=\frac12\cdot\left[-\cos y\right]_0^{\pi/2}=\frac12\cdot1=\frac12$.`,
    steps: [m`$\int_0^{\pi/2}\sin y\,dy=-\cos y\big|_0^{\pi/2}=1$.`, m`$\int_0^1x\,dx=\dfrac12$.`, m`Produto: $\dfrac12$.`],
    src: [[P, loc]],
    verify: dbl('x*sin(y)', ['y', '0', 'pi/2'], ['x', '0', '1'], ['1/2', '1', '0', '-1/2']),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(13, {
    diff: 'dificil', scope: 'desafio', sub: 'Inversão da ordem de integração',
    stem: m`Calcule $\displaystyle\int_0^1\!\int_x^1 e^{y^{2}}\,dy\,dx$.`,
    opts: [m`$\dfrac{e-1}{2}$`, [m`$e-1$`, m`Esqueceu o fator $\frac12$ da primitiva de $y\,e^{y^2}$ ($\frac{e^{y^2}}2$).`], [m`$\dfrac e2$`, m`Perdeu o termo $-\frac12$: $\left[\frac{e^{y^2}}{2}\right]_0^1=\frac{e-1}{2}$.`], [m`não é possível calcular, pois $e^{y^2}$ não tem primitiva elementar`, m`Realmente não tem, mas a ordem de integração pode ser invertida (teorema de Fubini) e o valor sai em forma fechada.`]],
    exp: m`A região é $0\le x\le y\le1$. Invertendo a ordem: $\int_0^1\!\int_0^{y}e^{y^2}\,dx\,dy=\int_0^1y\,e^{y^2}\,dy=\left[\frac{e^{y^2}}{2}\right]_0^1=\frac{e-1}{2}$.`,
    steps: [m`Região: $0\le x\le y\le1$.`, m`$\int_0^{y}dx=y$ ⇒ $\int_0^1 y\,e^{y^{2}}\,dy$.`, m`$=\dfrac{e^{y^{2}}}{2}\Big|_0^1=\dfrac{e-1}{2}$.`],
    src: [[P, loc]],
    verify: dbl('exp(y**2)', ['y', 'x', '1'], ['x', '0', '1'], ['(E-1)/2', 'E-1', 'E/2', "'nao'"], { swap: [['x', '0', 'y'], ['y', '0', '1']], exactFrom: 'swap' }),
  }),
  R(14, {
    diff: 'dificil', scope: 'desafio', sub: 'Inversão de ordem (raiz)',
    stem: m`Calcule $\displaystyle\int_0^1\!\int_{\sqrt y}^{1} e^{x^{3}}\,dx\,dy$.`,
    opts: [m`$\dfrac{e-1}{3}$`, [m`$e-1$`, m`Esqueceu o fator $\frac13$ vindo da substituição $u=x^3$.`], [m`$\dfrac{e-1}{2}$`, m`Usou $\frac12$ em vez de $\frac13$ (a derivada de $x^3$ é $3x^2$, logo o fator é $\frac13$).`], [m`$\dfrac13$`, m`Esse é $\int_0^1x^2\,dx$; ainda falta a exponencial: $\int_0^1x^2e^{x^3}\,dx=\frac{e-1}{3}$.`]],
    exp: m`A região é $0\le y\le x^2$, $0\le x\le1$ (pois $x\ge\sqrt y\iff y\le x^2$). Invertendo: $\int_0^1\!\int_0^{x^2}e^{x^3}\,dy\,dx=\int_0^1x^2e^{x^3}\,dx$. Com $u=x^3$: $=\frac13\left[e^{u}\right]_0^1=\frac{e-1}{3}$.`,
    steps: [m`Região: $0\le y\le x^{2}$, $0\le x\le1$.`, m`$\int_0^{x^{2}}dy=x^{2}$ ⇒ $\int_0^1x^{2}e^{x^{3}}\,dx$.`, m`$u=x^{3}$: $\dfrac{e-1}{3}$.`],
    src: [[P, loc]],
    verify: dbl('exp(x**3)', ['x', 'sqrt(y)', '1'], ['y', '0', '1'], ['(E-1)/3', 'E-1', '(E-1)/2', '1/3'], { swap: [['y', '0', 'x**2'], ['x', '0', '1']], exactFrom: 'swap' }),
  }),
  R(15, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Região triangular com integrando linear',
    stem: m`Seja $D$ o triângulo de vértices $(0,0)$, $(2,0)$ e $(0,2)$. Calcule $\displaystyle\iint_D (x+2y)\,dA$.`,
    opts: [m`$4$`, [m`$12$`, m`Integrou sobre o quadrado $[0,2]\times[0,2]$; o triângulo tem $0\le y\le2-x$.`], [m`$\dfrac43$`, m`Esse é apenas $\iint_D x\,dA$; falta a parte $2y$.`], [m`$\dfrac83$`, m`Esse é apenas $\iint_D 2y\,dA$; falta a parte $x$.`]],
    exp: m`O triângulo é $0\le x\le2$, $0\le y\le2-x$. Interna: $\int_0^{2-x}(x+2y)\,dy=x(2-x)+(2-x)^2=4-2x$. Externa: $\int_0^2(4-2x)\,dx=8-4=4$. (Partes: $\iint x\,dA=\frac43$ e $\iint2y\,dA=\frac83$.)`,
    steps: [m`Limites: $0\le y\le2-x$.`, m`$\int_0^{2-x}(x+2y)\,dy=4-2x$.`, m`$\int_0^2(4-2x)\,dx=4$.`],
    src: [[P, loc]],
    verify: dbl('x+2*y', ['y', '0', '2-x'], ['x', '0', '2'], ['4', '12', '4/3', '8/3']),
  }),
  R(16, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Valor médio de uma função',
    stem: m`O valor médio de $f$ em uma região $R$ é $\dfrac{1}{\text{área}(R)}\iint_Rf\,dA$. Qual é o valor médio de $f(x,y)=xy$ em $R=[0,2]\times[0,3]$?`,
    opts: [m`$\dfrac32$`, [m`$9$`, m`Esse é $\iint_Rxy\,dA$; falta dividir pela área ($6$).`], [m`$\dfrac92$`, m`Dividiu por $2$ (largura) em vez da área $2\cdot3=6$.`], [m`$3$`, m`Dividiu por $3$ (altura) em vez da área $2\cdot3=6$.`]],
    exp: m`$\iint_Rxy\,dA=\int_0^2x\,dx\int_0^3y\,dy=2\cdot\frac92=9$ e a área de $R$ é $6$. Valor médio: $\frac96=\frac32$.`,
    steps: [m`$\iint_R xy\,dA=9$.`, m`Área de $R$: $2\cdot3=6$.`, m`Média: $9/6=\dfrac32$.`],
    src: [[P, loc]],
    verify: dbl('x*y/6', ['y', '0', '3'], ['x', '0', '2'], ['3/2', '9', '9/2', '3']),
  }),
  R(17, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Separação e substituição',
    stem: m`Calcule $\displaystyle\iint_R xy\,e^{x^{2}+y^{2}}\,dA$, com $R=[0,1]\times[0,1]$.`,
    opts: [m`$\dfrac{(e-1)^{2}}{4}$`, [m`$\dfrac{e-1}{2}$`, m`Calculou só um dos dois fatores; o integrando é produto de $x\,e^{x^2}$ por $y\,e^{y^2}$.`], [m`$\dfrac{(e-1)^{2}}{2}$`, m`Só um dos dois fatores $\frac12$ foi aplicado; cada substituição ($u=x^2$ e $v=y^2$) contribui com $\frac12$.`], [m`$(e-1)^{2}$`, m`Esqueceu os dois fatores $\frac12$ das substituições $u=x^2$ e $v=y^2$.`]],
    exp: m`$xy\,e^{x^2+y^2}=\bigl(x\,e^{x^2}\bigr)\bigl(y\,e^{y^2}\bigr)$ e $R$ é retângulo, logo a integral é o produto de duas integrais iguais: $\int_0^1xe^{x^2}dx=\left[\frac{e^{x^2}}{2}\right]_0^1=\frac{e-1}{2}$. Resultado: $\left(\frac{e-1}{2}\right)^2=\frac{(e-1)^2}{4}$.`,
    steps: [m`Fatore: $(x e^{x^{2}})(y e^{y^{2}})$.`, m`Cada integral: $\dfrac{e-1}{2}$.`, m`Produto: $\dfrac{(e-1)^{2}}{4}$.`],
    src: [[P, loc]],
    verify: dbl('x*y*exp(x**2+y**2)', ['y', '0', '1'], ['x', '0', '1'], ['(E-1)**2/4', '(E-1)/2', '(E-1)**2/2', '(E-1)**2']),
  }),
  R(18, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Volume sob paraboloide',
    stem: m`Qual é o volume do sólido sob $z=4-x^{2}-y^{2}$ e acima do quadrado $R=[-1,1]\times[-1,1]$?`,
    opts: [m`$\dfrac{40}{3}$`, [m`$16$`, m`Esse é o volume do prisma de altura $4$ sobre $R$ (área $4$); ignorou $-x^2-y^2$.`], [m`$\dfrac{32}{3}$`, m`Subtraiu $\frac{16}{3}$ em vez de $\frac83$: cada $\iint x^2\,dA$ vale $\frac43$, e há dois termos.`], [m`$\dfrac83$`, m`Esse é só o que deve ser *subtraído* dos $16$ ($\frac43+\frac43$).`]],
    exp: m`$V=\iint_R(4-x^2-y^2)\,dA=16-\iint x^2\,dA-\iint y^2\,dA$. Como $\iint_Rx^2\,dA=\int_{-1}^1x^2dx\cdot2=\frac23\cdot2=\frac43$ (e igual para $y^2$), $V=16-\frac83=\frac{40}{3}$.`,
    steps: [m`$\iint_R 4\,dA=16$.`, m`$\iint_R x^{2}\,dA=\iint_R y^{2}\,dA=\dfrac43$.`, m`$V=16-\dfrac83=\dfrac{40}{3}$.`],
    src: [[P, loc]],
    verify: dbl('4-x**2-y**2', ['y', '-1', '1'], ['x', '-1', '1'], ['40/3', '16', '32/3', '8/3']),
  }),
];

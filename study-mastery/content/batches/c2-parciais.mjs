// Lote c2-parciais — Derivadas parciais e derivada total: 7 fáceis (001–007), 7 médias (008–014), 7 difíceis (015–021).
// Base: ementa/conteúdo programático da disciplina (c2-programa). Não há slides de aula sobre o tema no material
// recebido; as questões são originais e verificadas por SymPy + diferenciação numérica (mpmath).
import { m } from '../../tools/lib/dsl.ts';

const P = 'c2-programa';
const loc = 'conteúdo programático: derivadas parciais';
const R = (n, o) => ({ d: 'calculo2', topic: 'derivadas-parciais', ...o, id: `c2-derivadas-parciais-${String(n).padStart(3, '0')}` });
const ex = (expr, numeric, values) => ({ kind: 'expr', params: { expr, numeric }, values });
// derivada parcial/mista em um ponto: SymPy + mpmath.diff (multivariável)
const pt = (expr, wrt, at, values) => ({ kind: 'derivative', params: { expr, wrt, at }, values });
const fn = (expr, variable, values) => ({ kind: 'function', params: { expr, var: variable }, values });

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'Derivada parcial em x',
    stem: m`Seja $f(x,y)=x^{2}y+3y$. Qual é $\dfrac{\partial f}{\partial x}$?`,
    opts: [m`$2xy$`, [m`$x^{2}+3$`, m`Essa é $\frac{\partial f}{\partial y}$ (derivada em relação a $y$).`], [m`$2xy+3$`, m`O termo $3y$ não depende de $x$; ao derivar em $x$ (com $y$ constante) sua derivada é $0$.`], [m`$2x$`, m`$y$ é constante, mas continua multiplicando: $\frac{\partial}{\partial x}(x^2y)=2x\cdot y$.`]],
    exp: m`Ao derivar em relação a $x$, trate $y$ como constante: $\dfrac{\partial}{\partial x}(x^2y)=2xy$ e $\dfrac{\partial}{\partial x}(3y)=0$. Logo $f_x=2xy$.`,
    steps: [m`$y$ é constante.`, m`$(x^{2}y)_x=2xy$ e $(3y)_x=0$.`, m`$f_x=2xy$.`],
    src: [[P, loc]],
    verify: ex('diff(x**2*y+3*y,x)', '2*x*y', ['2*x*y', 'x**2+3', '2*x*y+3', '2*x']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'Derivada parcial em y',
    stem: m`Para $f(x,y)=5x^{3}-2xy+y^{2}$, calcule $f_y=\dfrac{\partial f}{\partial y}$.`,
    opts: [m`$-2x+2y$`, [m`$15x^{2}-2y$`, m`Essa é $f_x$; o enunciado pede a derivada em relação a $y$.`], [m`$-2x+y^{2}$`, m`A derivada de $y^2$ em $y$ é $2y$, e não $y^2$.`], [m`$2y$`, m`Faltou o termo $-2xy$: derivando em $y$ (com $x$ constante) ele vira $-2x$.`]],
    exp: m`Com $x$ constante: $(5x^3)_y=0$, $(-2xy)_y=-2x$ e $(y^2)_y=2y$. Portanto $f_y=-2x+2y$.`,
    steps: [m`$(5x^{3})_y=0$.`, m`$(-2xy)_y=-2x$.`, m`$(y^{2})_y=2y$ ⇒ $f_y=-2x+2y$.`],
    src: [[P, loc]],
    verify: ex('diff(5*x**3-2*x*y+y**2,y)', '-2*x+2*y', ['-2*x+2*y', '15*x**2-2*y', '-2*x+y**2', '2*y']),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'Valor da derivada parcial',
    stem: m`Seja $f(x,y)=x^{2}y$. Calcule $f_x(3,2)$.`,
    opts: [m`$12$`, [m`$9$`, m`$9=x^2$ em $x=3$ é o valor de $f_y(3,2)$, a derivada em $y$.`], [m`$18$`, m`$18=f(3,2)$ é o valor da função, não da derivada.`], [m`$6$`, m`Esqueceu o fator $y$: $f_x=2xy$, e não $2x$.`]],
    exp: m`Derivando em $x$ com $y$ constante, $f_x(x,y)=2xy$. Em $(3,2)$: $f_x(3,2)=2\cdot3\cdot2=12$.`,
    steps: [m`$f_x=2xy$.`, m`Substitua $x=3$ e $y=2$.`, m`$f_x(3,2)=12$.`],
    src: [[P, loc]],
    verify: pt('x**2*y', ['x'], { x: '3', y: '2' }, ['12', '9', '18', '6']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'Exponencial',
    stem: m`Qual é $\dfrac{\partial}{\partial x}\left(e^{xy}\right)$?`,
    opts: [m`$y\,e^{xy}$`, [m`$x\,e^{xy}$`, m`O fator da regra da cadeia é a derivada de $xy$ em relação a $x$, que é $y$ (não $x$).`], [m`$e^{xy}$`, m`Faltou o fator interno $y$ da regra da cadeia.`], [m`$xy\,e^{xy-1}$`, m`$e^{u}$ não segue a regra da potência: $(e^u)'=e^u\cdot u'$.`]],
    exp: m`Regra da cadeia com $u=xy$: $\dfrac{\partial}{\partial x}e^{u}=e^{u}\cdot\dfrac{\partial u}{\partial x}=e^{xy}\cdot y$.`,
    steps: [m`$u=xy\Rightarrow u_x=y$.`, m`$(e^{u})_x=e^{u}u_x$.`, m`$=y\,e^{xy}$.`],
    src: [[P, loc]],
    verify: ex('diff(exp(x*y),x)', 'y*exp(x*y)', ['y*exp(x*y)', 'x*exp(x*y)', 'exp(x*y)', 'x*y*exp(x*y-1)']),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'Logaritmo',
    stem: m`Para $x>0$ e $y>0$, seja $f(x,y)=x\ln y$. Qual é $f_y$?`,
    opts: [m`$\dfrac{x}{y}$`, [m`$\ln y$`, m`Essa é $f_x$ (derivada em $x$, que resulta em $\ln y$).`], [m`$\dfrac{1}{y}$`, m`$x$ é constante mas continua multiplicando: $f_y=x\cdot\frac1y$.`], [m`$x\ln y+\dfrac{x}{y}$`, m`Aplicou a regra do produto com $x$ como variável; em $f_y$, $x$ é constante.`]],
    exp: m`Com $x$ constante, $f_y=x\cdot\dfrac{d}{dy}(\ln y)=\dfrac{x}{y}$.`,
    steps: [m`$x$ constante.`, m`$(\ln y)_y=\frac1y$.`, m`$f_y=\dfrac{x}{y}$.`],
    src: [[P, loc]],
    verify: ex('diff(x*log(y),y)', 'x/y', ['x/y', 'log(y)', '1/y', 'x*log(y)+x/y']),
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'Derivada parcial em um ponto',
    stem: m`Se $f(x,y)=x^{2}+3xy$, qual é o valor de $f_x(1,2)$?`,
    opts: [m`$8$`, [m`$3$`, m`$3$ é $f_y(1,2)=3x$; aqui é pedida a derivada em $x$.`], [m`$5$`, m`$f_x=2x+3y$ (e não $2x+3$): o fator $y$ permanece no termo $3xy$.`], [m`$2$`, m`$2$ vem de derivar só $x^2$ ($2x=2$); o termo $3xy$ também depende de $x$ e contribui com $3y=6$.`]],
    exp: m`Derivando em $x$ (com $y$ constante), $f_x=2x+3y$. Em $(1,2)$: $2\cdot1+3\cdot2=2+6=8$.`,
    steps: [m`$f_x=2x+3y$.`, m`Substituir $(1,2)$.`, m`$2+6=8$.`],
    src: [[P, loc]],
    verify: pt('x**2+3*x*y', ['x'], { x: '1', y: '2' }, ['8', '3', '5', '2']),
  }),
  R(7, {
    diff: 'facil', scope: 'aula', sub: 'Taxa marginal',
    stem: m`A demanda por um produto é $q=100-2x+y$, em que $x$ é o preço do próprio produto e $y$ é o preço de um substituto. Quanto vale $\dfrac{\partial q}{\partial x}$ e o que significa?`,
    opts: [m`$-2$: a demanda cai $2$ unidades por aumento de $1$ no preço $x$, com $y$ fixo`, [m`$+2$: a demanda sobe $2$ unidades por aumento de $1$ no preço $x$`, m`O coeficiente de $x$ é $-2$: aumentar o próprio preço *reduz* a demanda.`], [m`$1$: a demanda sobe $1$ unidade por aumento de $1$ no preço $x$`, m`$1$ é $\frac{\partial q}{\partial y}$ (efeito do preço do substituto).`], [m`$100$: a demanda base do produto`, m`$100$ é o termo constante, não a derivada em $x$.`]],
    exp: m`$\dfrac{\partial q}{\partial x}=-2$: mantendo o preço $y$ do substituto fixo, cada aumento de $1$ no preço $x$ reduz a demanda em $2$ unidades.`,
    steps: [m`Derive em $x$ com $y$ constante.`, m`$(100-2x+y)_x=-2$.`, m`Interpretação: taxa de variação de $q$ com $x$.`],
    src: [[P, loc]],
    verify: ex('diff(100-2*x+y,x)', '-2', ['-2', '2', '1', '100']),
  }),

  // ---------------- MÉDIAS ----------------
  R(8, {
    diff: 'medio', scope: 'aula', sub: 'Derivada mista',
    stem: m`Para $f(x,y)=x^{3}y^{2}$, calcule $\dfrac{\partial^{2}f}{\partial y\,\partial x}$ (derive primeiro em $x$ e depois em $y$).`,
    opts: [m`$6x^{2}y$`, [m`$6xy^{2}$`, m`Essa é $f_{xx}$ (duas vezes em $x$), não a derivada mista.`], [m`$2x^{3}$`, m`Essa é $f_{yy}$ (duas vezes em $y$).`], [m`$6x^{2}y^{2}$`, m`Confundiu o expoente: $\frac{\partial}{\partial y}(3x^2y^2)=6x^2y$, não $6x^2y^2$.`]],
    exp: m`$f_x=3x^2y^2$. Derivando em $y$: $f_{xy}=3x^2\cdot2y=6x^2y$. (O resultado é o mesmo derivando primeiro em $y$ e depois em $x$.)`,
    steps: [m`$f_x=3x^{2}y^{2}$.`, m`$(f_x)_y=6x^{2}y$.`, m`$f_{xy}=6x^{2}y$.`],
    src: [[P, loc]],
    verify: ex('diff(x**3*y**2,x,y)', '6*x**2*y', ['6*x**2*y', '6*x*y**2', '2*x**3', '6*x**2*y**2']),
  }),
  R(9, {
    diff: 'medio', scope: 'aula', sub: 'Mista com trigonométrica',
    stem: m`Para $f(x,y)=e^{x}\sin y$, qual é $f_{xy}$?`,
    opts: [m`$e^{x}\cos y$`, [m`$e^{x}\sin y$`, m`Essa é $f_{xx}$: derivar $e^x$ em $x$ não muda nada.`], [m`$-e^{x}\sin y$`, m`Essa é $f_{yy}$: $(\sin y)''=-\sin y$.`], [m`$-e^{x}\cos y$`, m`Sinal indevido: $(\sin y)_y=+\cos y$.`]],
    exp: m`Primeiro $f_x=e^x\sin y$ (derivando em $x$). Depois, em $y$: $f_{xy}=e^x\cos y$.`,
    steps: [m`$f_x=e^{x}\sin y$.`, m`$(\sin y)_y=\cos y$.`, m`$f_{xy}=e^{x}\cos y$.`],
    src: [[P, loc]],
    verify: ex('diff(exp(x)*sin(y),x,y)', 'exp(x)*cos(y)', ['exp(x)*cos(y)', 'exp(x)*sin(y)', '-exp(x)*sin(y)', '-exp(x)*cos(y)']),
  }),
  R(10, {
    diff: 'medio', scope: 'aula', sub: 'Regra da cadeia com raiz',
    stem: m`Calcule $\dfrac{\partial}{\partial x}\sqrt{x^{2}+y^{2}}$.`,
    opts: [m`$\dfrac{x}{\sqrt{x^{2}+y^{2}}}$`, [m`$\dfrac{2x}{\sqrt{x^{2}+y^{2}}}$`, m`Faltou o fator $\frac12$ da derivada da raiz: $\frac{1}{2\sqrt u}\cdot2x$.`], [m`$\dfrac{x}{x^{2}+y^{2}}$`, m`O denominador mantém a raiz: $\frac{1}{2\sqrt u}$, não $\frac{1}{u}$.`], [m`$\dfrac{1}{2\sqrt{x^{2}+y^{2}}}$`, m`Faltou multiplicar pela derivada interna $\frac{\partial}{\partial x}(x^2+y^2)=2x$.`]],
    exp: m`Com $u=x^2+y^2$: $\dfrac{\partial}{\partial x}\sqrt u=\dfrac{1}{2\sqrt u}\cdot u_x=\dfrac{2x}{2\sqrt{x^2+y^2}}=\dfrac{x}{\sqrt{x^2+y^2}}$.`,
    steps: [m`$(\sqrt{u})'=\dfrac{1}{2\sqrt{u}}$.`, m`$u_x=2x$ ($y$ constante).`, m`$\dfrac{2x}{2\sqrt{u}}=\dfrac{x}{\sqrt{x^{2}+y^{2}}}$.`],
    src: [[P, loc]],
    verify: ex('diff(sqrt(x**2+y**2),x)', 'x/sqrt(x**2+y**2)', ['x/sqrt(x**2+y**2)', '2*x/sqrt(x**2+y**2)', 'x/(x**2+y**2)', '1/(2*sqrt(x**2+y**2))']),
  }),
  R(11, {
    diff: 'medio', scope: 'aula', sub: 'Regra do quociente',
    stem: m`Para $f(x,y)=\dfrac{x}{x+y}$, qual é $f_y$?`,
    opts: [m`$-\dfrac{x}{(x+y)^{2}}$`, [m`$\dfrac{y}{(x+y)^{2}}$`, m`Essa é $f_x$ (derivada em $x$).`], [m`$\dfrac{x}{(x+y)^{2}}$`, m`Sinal errado: $\frac{\partial}{\partial y}(x+y)^{-1}=-(x+y)^{-2}$.`], [m`$-\dfrac{1}{(x+y)^{2}}$`, m`Faltou o fator $x$ do numerador (constante em $f_y$).`]],
    exp: m`Com $x$ constante, $f=x\,(x+y)^{-1}$ e $f_y=x\cdot(-1)(x+y)^{-2}=-\dfrac{x}{(x+y)^2}$.`,
    steps: [m`$f=x\,(x+y)^{-1}$.`, m`$\partial_y(x+y)^{-1}=-(x+y)^{-2}$.`, m`$f_y=-\dfrac{x}{(x+y)^{2}}$.`],
    src: [[P, loc]],
    verify: ex('diff(x/(x+y),y)', '-x/(x+y)**2', ['-x/(x+y)**2', 'y/(x+y)**2', 'x/(x+y)**2', '-1/(x+y)**2']),
  }),
  R(12, {
    diff: 'medio', scope: 'aula', sub: 'Valor num ponto com exponencial',
    stem: m`Seja $f(x,y)=3x^{2}e^{y}$. Calcule $f_y(1,0)$.`,
    opts: [m`$3$`, [m`$6$`, m`$6=f_x(1,0)=6xe^{y}$; aqui se pede $f_y$.`], [m`$3e$`, m`Em $y=0$, $e^{0}=1$ (e não $e$).`], [m`$0$`, m`$f_y=3x^2e^y$ não se anula: em $(1,0)$ vale $3$.`]],
    exp: m`$f_y=3x^2e^y$ (a derivada de $e^y$ em $y$ é $e^y$). Em $(1,0)$: $3\cdot1\cdot e^{0}=3$.`,
    steps: [m`$f_y=3x^{2}e^{y}$.`, m`$x=1,\ y=0$.`, m`$3\cdot1\cdot1=3$.`],
    src: [[P, loc]],
    verify: pt('3*x**2*exp(y)', ['y'], { x: '1', y: '0' }, ['3', '6', '3*E', '0']),
  }),
  R(13, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Produtividade marginal',
    stem: m`Uma empresa tem produção $Q(K,L)=10\sqrt{K}\,\sqrt{L}$, com capital $K$ e trabalho $L$. Qual é a produtividade marginal do trabalho, $\dfrac{\partial Q}{\partial L}$, quando $K=16$ e $L=25$?`,
    opts: [m`$4$`, [m`$5$`, m`Parou no coeficiente $5=10\cdot\frac12$ de $Q_L=5\sqrt K/\sqrt L$, sem substituir $K=16$ e $L=25$.`], [m`$8$`, m`$8$ ignora o fator $\frac12$ da derivada da raiz: $10\sqrt{K}\cdot\frac{1}{\sqrt L}=8$.`], [m`$200$`, m`$200$ é o valor de $Q(16,25)=10\cdot4\cdot5$, não da derivada.`]],
    exp: m`$\dfrac{\partial Q}{\partial L}=10\sqrt K\cdot\dfrac{1}{2\sqrt L}=\dfrac{5\sqrt K}{\sqrt L}$. Com $K=16$, $L=25$: $\dfrac{5\cdot4}{5}=4$ unidades de produto por unidade adicional de trabalho.`,
    steps: [m`$\partial_L\sqrt L=\frac{1}{2\sqrt L}$.`, m`$Q_L=5\sqrt K/\sqrt L$.`, m`$5\cdot4/5=4$.`],
    src: [[P, loc]],
    verify: pt('10*sqrt(x)*sqrt(y)', ['y'], { x: '16', y: '25' }, ['4', '5', '8', '200']),
  }),
  R(14, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Segundas derivadas em um ponto',
    stem: m`Seja $f(x,y)=x^{3}y-2xy^{2}$. Qual é o valor de $f_{xx}(1,2)$?`,
    opts: [m`$12$`, [m`$-4$`, m`$-4=f_{yy}(1,2)=-4x$; aqui são duas derivações em $x$.`], [m`$-5$`, m`$-5=f_{xy}(1,2)=3x^2-4y$ (derivada mista).`], [m`$-2$`, m`$-2=f_x(1,2)=3x^2y-2y^2$ (só uma derivação).`]],
    exp: m`$f_x=3x^2y-2y^2$ e $f_{xx}=6xy$. Em $(1,2)$: $6\cdot1\cdot2=12$.`,
    steps: [m`$f_x=3x^{2}y-2y^{2}$.`, m`$f_{xx}=6xy$.`, m`$f_{xx}(1,2)=12$.`],
    src: [[P, loc]],
    verify: pt('x**3*y-2*x*y**2', ['x', 'x'], { x: '1', y: '2' }, ['12', '-4', '-5', '-2']),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(15, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Derivada total (regra da cadeia)',
    stem: m`Seja $z=x^{2}+xy$, com $x=t^{2}$ e $y=t$. Qual é $\dfrac{dz}{dt}$?`,
    opts: [m`$4t^{3}+3t^{2}$`, [m`$2x+y$`, m`Essa é só $\frac{\partial z}{\partial x}$; falta compor com $x(t)$, $y(t)$ e somar as duas parcelas.`], [m`$(2x+y)\cdot2t$`, m`Faltou a parcela $\frac{\partial z}{\partial y}\frac{dy}{dt}=x\cdot1$.`], [m`$4t^{3}+t^{2}$`, m`Omitiu o termo $y$ de $z_x=2x+y$ (o produto $xy$ também depende de $x$): o correto é $4t^3+2t^2+t^2$.`]],
    exp: m`Regra da cadeia: $\dfrac{dz}{dt}=\dfrac{\partial z}{\partial x}\dfrac{dx}{dt}+\dfrac{\partial z}{\partial y}\dfrac{dy}{dt}=(2x+y)(2t)+x(1)=(2t^2+t)(2t)+t^2=4t^3+3t^2$. Conferência: $z(t)=t^4+t^3$, cuja derivada é $4t^3+3t^2$.`,
    steps: [m`$z_x=2x+y$ e $z_y=x$.`, m`$x'=2t$ e $y'=1$.`, m`$(2t^{2}+t)(2t)+t^{2}=4t^{3}+3t^{2}$.`],
    src: [[P, loc]],
    verify: fn('(2*t**2+t)*(2*t)+t**2', 't', ['4*t**3+3*t**2', '2*t**2+t', '(2*t**2+t)*(2*t)', '4*t**3+t**2']),
  }),
  R(16, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Laplaciano',
    stem: m`Para $f(x,y)=e^{x}\cos y$, qual é o valor de $f_{xx}+f_{yy}$?`,
    opts: [m`$0$`, [m`$2e^{x}\cos y$`, m`$f_{yy}=-e^x\cos y$ (e não $+e^x\cos y$): os termos se cancelam.`], [m`$e^{x}\cos y$`, m`Esse é $f_{xx}$ sozinho; falta somar $f_{yy}=-e^x\cos y$.`], [m`$-2e^{x}\sin y$`, m`Misturou as derivadas: $f_{xx}=e^x\cos y$ e $f_{yy}=-e^x\cos y$, sem termos em $\sin y$.`]],
    exp: m`$f_x=e^x\cos y\Rightarrow f_{xx}=e^x\cos y$. $f_y=-e^x\sin y\Rightarrow f_{yy}=-e^x\cos y$. A soma é $0$: $f$ é uma função harmônica (satisfaz a equação de Laplace).`,
    steps: [m`$f_{xx}=e^{x}\cos y$.`, m`$f_{yy}=-e^{x}\cos y$.`, m`Soma $=0$.`],
    src: [[P, loc]],
    verify: ex('diff(exp(x)*cos(y),x,2)+diff(exp(x)*cos(y),y,2)', '0', ['0', '2*exp(x)*cos(y)', 'exp(x)*cos(y)', '-2*exp(x)*sin(y)']),
  }),
  R(17, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Derivada mista com logaritmo',
    stem: m`Para $x>0$, qual é $f_{xy}$ de $f(x,y)=x\,e^{y}+y\ln x$?`,
    opts: [m`$e^{y}+\dfrac1x$`, [m`$e^{y}$`, m`Esqueceu o termo $y\ln x$: $\partial_x\partial_y(y\ln x)=\frac1x$.`], [m`$xe^{y}+\dfrac1x$`, m`$f_x=e^y+\frac yx$ e, derivando em $y$, o termo $e^y$ permanece sem o fator $x$.`], [m`$e^{y}+\ln x$`, m`O termo $\ln x$ aparece em $f_y$; derivando em $x$ ele vira $\frac1x$, e não permanece $\ln x$.`]],
    exp: m`$f_x=e^{y}+\dfrac{y}{x}$. Derivando em $y$: $f_{xy}=e^{y}+\dfrac1x$. (Conferência: $f_y=xe^y+\ln x$ e $(f_y)_x=e^y+\frac1x$ — igual, como garante o teorema de Schwarz.)`,
    steps: [m`$f_x=e^{y}+y/x$.`, m`$\partial_y$: $e^{y}+1/x$.`, m`Confirme com $f_y=xe^{y}+\ln x$.`],
    src: [[P, loc]],
    verify: ex('diff(x*exp(y)+y*log(x),x,y)', 'exp(y)+1/x', ['exp(y)+1/x', 'exp(y)', 'x*exp(y)+1/x', 'exp(y)+log(x)']),
  }),
  R(18, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Derivação implícita',
    stem: m`A curva $x^{2}+xy+y^{2}=7$ passa pelo ponto $(1,2)$. Qual é o valor de $\dfrac{dy}{dx}$ nesse ponto?`,
    opts: [m`$-\dfrac45$`, [m`$-\dfrac54$`, m`Inverteu a razão: $\frac{dy}{dx}=-\frac{F_x}{F_y}$, com $F_x=4$ e $F_y=5$.`], [m`$\dfrac45$`, m`Faltou o sinal negativo da fórmula $\frac{dy}{dx}=-\frac{F_x}{F_y}$.`], [m`$-\dfrac{2}{5}$`, m`$F_x(1,2)=2x+y=4$ (e não $2$): o termo $xy$ também contribui em $x$.`]],
    exp: m`Seja $F(x,y)=x^2+xy+y^2$ (a curva é $F=7$; confira: $1+2+4=7$). Então $F_x=2x+y=4$ e $F_y=x+2y=5$ em $(1,2)$. Pela derivação implícita, $\dfrac{dy}{dx}=-\dfrac{F_x}{F_y}=-\dfrac45$.`,
    steps: [m`$F_x=2x+y=4$.`, m`$F_y=x+2y=5$.`, m`$\dfrac{dy}{dx}=-\dfrac{4}{5}$.`],
    src: [[P, loc]],
    verify: ex(`-subs(subs(diff(x**2+x*y+y**2,x),x,1),y,2)/subs(subs(diff(x**2+x*y+y**2,y),x,1),y,2)`, '-4/5', ['-4/5', '-5/4', '4/5', '-2/5']),
  }),
  R(19, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Plano tangente',
    stem: m`Qual é a equação do plano tangente ao gráfico de $z=x^{2}+y^{2}$ no ponto $(1,2,5)$?`,
    opts: [m`$z=2x+4y-5$`, [m`$z=2x+4y+5$`, m`O plano passa por $(1,2,5)$: $2+8+5=15\neq5$. O termo constante é $5-2-8=-5$.`], [m`$z=x+2y-5$`, m`Esqueceu o fator $2$ das derivadas: $f_x=2x=2$ e $f_y=2y=4$.`], [m`$z=5+(x-1)+(y-2)$`, m`Usou derivadas iguais a $1$; as parciais em $(1,2)$ valem $2$ e $4$.`]],
    exp: m`Plano tangente: $z=f(1,2)+f_x(1,2)(x-1)+f_y(1,2)(y-2)$. Aqui $f=x^2+y^2$, $f(1,2)=5$, $f_x=2x=2$, $f_y=2y=4$. Logo $z=5+2(x-1)+4(y-2)=2x+4y-5$.`,
    steps: [m`$f(1,2)=5$; $f_x=2$; $f_y=4$.`, m`$z=5+2(x-1)+4(y-2)$.`, m`$z=2x+4y-5$.`],
    src: [[P, loc]],
    verify: ex('5+2*(x-1)+4*(y-2)', '2*x+4*y-5', ['2*x+4*y-5', '2*x+4*y+5', 'x+2*y-5', '5+(x-1)+(y-2)']),
  }),
  R(20, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Diferencial total e estimativa',
    stem: m`Sabe-se que $f_x(2,3)=-4$ e $f_y(2,3)=5$. Use a diferencial total para estimar a variação de $f$ ao passar de $(2,3)$ para $(2{,}1;\ 2{,}9)$.`,
    opts: [m`$\Delta f\approx-0{,}9$`, [m`$\Delta f\approx0{,}9$`, m`Os sinais foram trocados: $-4(0{,}1)=-0{,}4$ e $5(-0{,}1)=-0{,}5$.`], [m`$\Delta f\approx-0{,}1$`, m`Considerou só a variação em $y$ ($\Delta y=-0{,}1$), sem multiplicar pelas parciais nem somar o efeito de $x$.`], [m`$\Delta f\approx0{,}1$`, m`Usou $\Delta x$ e $\Delta y$ sem as derivadas parciais.`]],
    exp: m`$\Delta f\approx f_x\Delta x+f_y\Delta y$, com $\Delta x=0{,}1$ e $\Delta y=-0{,}1$: $\Delta f\approx(-4)(0{,}1)+5(-0{,}1)=-0{,}4-0{,}5=-0{,}9$.`,
    steps: [m`$\Delta x=0{,}1$, $\Delta y=-0{,}1$.`, m`$\Delta f\approx f_x\Delta x+f_y\Delta y$.`, m`$-0{,}4-0{,}5=-0{,}9$.`],
    src: [[P, loc]],
    verify: ex('-4*Rational(1,10)+5*(-Rational(1,10))', '-4*0.1+5*(-0.1)', ['-9/10', '9/10', '-1/10', '1/10']),
  }),
  R(21, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Variável no expoente',
    stem: m`Seja $f(x,y)=x^{y}$, com $x>0$. Calcule $f_y(2,3)$.`,
    opts: [m`$8\ln2$`, [m`$12$`, m`$12=f_x(2,3)=y\,x^{y-1}$ (regra da potência em $x$); aqui se deriva em $y$.`], [m`$24$`, m`Aplicou a regra da potência em $y$; como $y$ está no expoente, $\partial_y x^y=x^y\ln x$.`], [m`$8$`, m`$8=f(2,3)$ é o valor da função; falta derivar (fator $\ln x$).`]],
    exp: m`Com $x$ constante, $x^{y}=e^{y\ln x}$ e $\dfrac{\partial}{\partial y}x^{y}=x^{y}\ln x$. Em $(2,3)$: $2^{3}\ln2=8\ln2\approx5{,}55$.`,
    steps: [m`$x^{y}=e^{y\ln x}$.`, m`$\partial_y x^{y}=x^{y}\ln x$.`, m`$2^{3}\ln2=8\ln2$.`],
    src: [[P, loc]],
    verify: pt('x**y', ['y'], { x: '2', y: '3' }, ['8*log(2)', '12', '24', '8']),
  }),
];

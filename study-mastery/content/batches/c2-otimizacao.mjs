// Lote c2-otimizacao — Otimização com e sem restrições: 6 fáceis (001–006), 6 médias (007–012), 6 difíceis (013–018).
// Base: ementa/conteúdo programático da disciplina (c2-programa); não há slides do tema no material recebido.
// Verificação: SymPy (gradiente, Hessiana, sistemas de Lagrange) com os valores conferidos por cálculo independente.
import { m } from '../../tools/lib/dsl.ts';

const P = 'c2-programa';
const loc = 'conteúdo programático: otimização';
const R = (n, o) => ({ d: 'calculo2', topic: 'otimizacao', ...o, id: `c2-otimizacao-${String(n).padStart(3, '0')}` });
const ex = (expr, numeric, values) => ({ kind: 'expr', params: { expr, numeric }, values });
const lab = (...a) => a.map((s) => `'${s}'`);

// ---- construtores de expressões SymPy (strings) ----
const grad = (f) => `[diff(${f},x),diff(${f},y)]`;
const sol = (f) => `solve(${grad(f)},[x,y])`; // sistema ∇f = 0 (um único ponto crítico → dicionário)
const at = (e, px, py) => `subs(${e},{x:${px},y:${py}})`;
const hess = (f) => `(diff(${f},x,2)*diff(${f},y,2)-diff(${f},x,y)**2)`;
// classificação pelo teste da Hessiana em (px,py)
const cls = (f, px, py) =>
  `('naocritico' if (${at(`diff(${f},x)`, px, py)}!=0 or ${at(`diff(${f},y)`, px, py)}!=0) else ('sela' if ${at(hess(f), px, py)}<0 else ('inconclusivo' if ${at(hess(f), px, py)}==0 else ('min' if ${at(`diff(${f},x,2)`, px, py)}>0 else 'max'))))`;
// Lagrange: ∇f = λ∇g, g = c
const lag = (f, g, c) => `solve([diff(${f},x)-lam*diff(${g},x),diff(${f},y)-lam*diff(${g},y),${g}-(${c})],[x,y,lam])`;

export default [
  // ---------------- FÁCEIS ----------------
  R(1, {
    diff: 'facil', scope: 'aula', sub: 'Ponto crítico',
    stem: m`Qual é o ponto crítico de $f(x,y)=x^{2}+y^{2}-4x+6y$?`,
    opts: [m`$(2,-3)$`, [m`$(-2,3)$`, m`Trocou o sinal das duas coordenadas: $f_x=2x-4=0$ dá $x=+2$ e $f_y=2y+6=0$ dá $y=-3$.`], [m`$(4,-6)$`, m`Esqueceu de dividir por $2$: $2x=4\Rightarrow x=2$ e $2y=-6\Rightarrow y=-3$.`], [m`$(2,3)$`, m`Errou o sinal de $y$: $2y+6=0$ dá $y=-3$.`]],
    exp: m`Ponto crítico: $f_x=0$ e $f_y=0$. Aqui $f_x=2x-4$ e $f_y=2y+6$, logo $x=2$ e $y=-3$.`,
    steps: [m`$f_x=2x-4=0\Rightarrow x=2$.`, m`$f_y=2y+6=0\Rightarrow y=-3$.`, m`Ponto: $(2,-3)$.`],
    src: [[P, loc]],
    verify: ex(`[${sol('x**2+y**2-4*x+6*y')}[x],${sol('x**2+y**2-4*x+6*y')}[y]]`, '[2, -3]', ['[2,-3]', '[-2,3]', '[4,-6]', '[2,3]']),
  }),
  R(2, {
    diff: 'facil', scope: 'aula', sub: 'Teste da Hessiana (mínimo)',
    stem: m`Para $f(x,y)=x^{2}+y^{2}$, a origem é ponto crítico. Como ele se classifica?`,
    opts: [m`mínimo local ($D=4>0$, $f_{xx}>0$)`, [m`ponto de máximo local`, m`O máximo exigiria $f_{xx}<0$; aqui $f_{xx}=2>0$.`], [m`ponto de sela`, m`A sela exigiria $D<0$; aqui $D=f_{xx}f_{yy}-f_{xy}^2=4>0$.`], [m`o teste é inconclusivo`, m`Só seria inconclusivo se $D=0$; aqui $D=4\neq0$.`]],
    exp: m`$f_{xx}=2$, $f_{yy}=2$, $f_{xy}=0$. O discriminante é $D=f_{xx}f_{yy}-f_{xy}^2=4>0$ e $f_{xx}>0$, portanto a origem é mínimo local (de valor $0$).`,
    steps: [m`$f_{xx}=2,\ f_{yy}=2,\ f_{xy}=0$.`, m`$D=2\cdot2-0=4>0$.`, m`$D>0$ e $f_{xx}>0$ ⇒ mínimo.`],
    src: [[P, loc]],
    verify: ex(cls('x**2+y**2', 0, 0), "'min'", lab('min', 'max', 'sela', 'inconclusivo')),
  }),
  R(3, {
    diff: 'facil', scope: 'aula', sub: 'Valor máximo',
    stem: m`A função $f(x,y)=-x^{2}-y^{2}+2x$ tem um máximo local. Qual é o valor máximo?`,
    opts: [m`$1$`, [m`$0$`, m`$0$ é $f(0,0)$, mas o ponto crítico é $(1,0)$.`], [m`$2$`, m`$2$ é só o coeficiente do termo linear; o valor é $f(1,0)=-1-0+2=1$.`], [m`$-1$`, m`$-1$ vem só de $-x^2$ em $x=1$; falta somar o termo $2x=2$.`]],
    exp: m`$f_x=-2x+2=0\Rightarrow x=1$ e $f_y=-2y=0\Rightarrow y=0$. Como $f_{xx}=-2<0$ e $D=4>0$, é máximo. Valor: $f(1,0)=-1-0+2=1$.`,
    steps: [m`$f_x=-2x+2=0\Rightarrow x=1$; $f_y=-2y=0\Rightarrow y=0$.`, m`$f_{xx}=-2<0$ e $D=4>0$ ⇒ máximo.`, m`$f(1,0)=1$.`],
    src: [[P, loc]],
    verify: ex(`subs(-x**2-y**2+2*x,${sol('-x**2-y**2+2*x')})`, '1', ['1', '0', '2', '-1']),
  }),
  R(4, {
    diff: 'facil', scope: 'aula', sub: 'Ponto de sela',
    stem: m`Para $f(x,y)=x^{2}-y^{2}$, como se classifica o ponto crítico $(0,0)$?`,
    opts: [m`ponto de sela, pois $D=-4<0$`, [m`ponto de mínimo local`, m`Mínimo exigiria $D>0$; aqui $D=2\cdot(-2)-0=-4$ e a função cresce em $x$ mas decresce em $y$.`], [m`ponto de máximo local`, m`Máximo exigiria $D>0$ e $f_{xx}<0$; aqui $D<0$.`], [m`não é ponto crítico`, m`$f_x=2x$ e $f_y=-2y$ se anulam em $(0,0)$: é crítico.`]],
    exp: m`$f_{xx}=2$, $f_{yy}=-2$, $f_{xy}=0$, então $D=2\cdot(-2)-0=-4<0$. Com $D<0$ o ponto é de sela: $f$ tem mínimo ao longo do eixo $x$ e máximo ao longo do eixo $y$.`,
    steps: [m`$f_{xx}=2,\ f_{yy}=-2,\ f_{xy}=0$.`, m`$D=-4<0$.`, m`$D<0$ ⇒ sela.`],
    src: [[P, loc]],
    verify: ex(cls('x**2-y**2', 0, 0), "'sela'", lab('sela', 'min', 'max', 'naocritico')),
  }),
  R(5, {
    diff: 'facil', scope: 'aula', sub: 'Discriminante da Hessiana',
    stem: m`Para $f(x,y)=x^{2}+3y^{2}+xy$, calcule $D=f_{xx}\,f_{yy}-(f_{xy})^{2}$.`,
    opts: [m`$11$`, [m`$13$`, m`Somou $f_{xy}^2$ em vez de subtrair: $12+1$.`], [m`$12$`, m`Esqueceu de subtrair $(f_{xy})^2=1$.`], [m`$5$`, m`Usou $f_{yy}-f_{xy}^2$; faltou multiplicar $f_{xx}\cdot f_{yy}=2\cdot6$.`]],
    exp: m`$f_{xx}=2$, $f_{yy}=6$ e $f_{xy}=1$. Logo $D=2\cdot6-1^2=11$.`,
    steps: [m`$f_{xx}=2,\ f_{yy}=6$.`, m`$f_{xy}=1$.`, m`$D=12-1=11$.`],
    src: [[P, loc]],
    verify: ex(hess('x**2+3*y**2+x*y'), '2*6-1**2', ['11', '13', '12', '5']),
  }),
  R(6, {
    diff: 'facil', scope: 'aula', sub: 'Lucro máximo de dois produtos',
    stem: m`O lucro (em milhares de reais) de uma empresa que produz $x$ e $y$ milhares de unidades de dois produtos é $L(x,y)=-x^{2}-y^{2}+8x+10y-20$. Qual é o lucro máximo?`,
    opts: [m`$21$`, [m`$41$`, m`Esqueceu o custo fixo: $16+25=41$ ignora o termo $-20$.`], [m`$-20$`, m`É $L(0,0)$ (sem produção), não o máximo.`], [m`$9$`, m`$9=4+5$ é a soma das quantidades ótimas, não o lucro.`]],
    exp: m`$L_x=-2x+8=0\Rightarrow x=4$ e $L_y=-2y+10=0\Rightarrow y=5$. Como $L_{xx}=-2<0$ e $D=4>0$, é máximo. $L(4,5)=-16-25+32+50-20=21$.`,
    steps: [m`$x=4$ e $y=5$.`, m`$L_{xx}=-2<0$, $D=4>0$ ⇒ máximo.`, m`$L(4,5)=21$.`],
    src: [[P, loc]],
    verify: ex(`subs(-x**2-y**2+8*x+10*y-20,${sol('-x**2-y**2+8*x+10*y-20')})`, '21', ['21', '41', '-20', '9']),
  }),

  // ---------------- MÉDIAS ----------------
  R(7, {
    diff: 'medio', scope: 'aula', sub: 'Classificação de ponto crítico',
    stem: m`A função $f(x,y)=x^{3}-3x+y^{2}$ tem pontos críticos $(1,0)$ e $(-1,0)$. Como se classifica $(-1,0)$?`,
    opts: [m`ponto de sela`, [m`ponto de mínimo local`, m`Isso vale para $(1,0)$ ($D=12>0$, $f_{xx}=6>0$). Em $(-1,0)$, $D=-12<0$.`], [m`ponto de máximo local`, m`Máximo exigiria $D>0$ e $f_{xx}<0$; em $(-1,0)$ o discriminante é negativo.`], [m`o teste é inconclusivo`, m`$D=-12\neq0$: o teste decide (sela).`]],
    exp: m`$f_{xx}=6x$, $f_{yy}=2$, $f_{xy}=0$, então $D=12x$. Em $(-1,0)$: $D=-12<0$, portanto sela. (Em $(1,0)$: $D=12>0$ e $f_{xx}=6>0$, mínimo local.)`,
    steps: [m`$f_{xx}=6x$, $f_{yy}=2$, $f_{xy}=0$.`, m`$D(-1,0)=6(-1)\cdot2=-12$.`, m`$D<0$ ⇒ sela.`],
    src: [[P, loc]],
    verify: ex(cls('x**3-3*x+y**2', -1, 0), "'sela'", lab('sela', 'min', 'max', 'inconclusivo')),
  }),
  R(8, {
    diff: 'medio', scope: 'aula', sub: 'Mínimo com termo cruzado',
    stem: m`Qual é o valor mínimo de $f(x,y)=x^{2}+xy+y^{2}-3x$?`,
    opts: [m`$-3$`, [m`$3$`, m`Sinal trocado: $f(2,-1)=4-2+1-6=-3$.`], [m`$-1$`, m`$-1$ é a coordenada $y$ do ponto crítico, não o valor de $f$.`], [m`$2$`, m`$2$ é a coordenada $x$ do ponto crítico, não o valor de $f$.`]],
    exp: m`$f_x=2x+y-3=0$ e $f_y=x+2y=0$. Da segunda, $x=-2y$; na primeira, $-4y+y=3\Rightarrow y=-1$ e $x=2$. Como $f_{xx}=2>0$ e $D=2\cdot2-1=3>0$, é mínimo: $f(2,-1)=4-2+1-6=-3$.`,
    steps: [m`$2x+y=3$ e $x+2y=0$ ⇒ $(2,-1)$.`, m`$D=3>0$, $f_{xx}=2>0$ ⇒ mínimo.`, m`$f(2,-1)=-3$.`],
    src: [[P, loc]],
    verify: ex(`subs(x**2+x*y+y**2-3*x,${sol('x**2+x*y+y**2-3*x')})`, '-3', ['-3', '3', '-1', '2']),
  }),
  R(9, {
    diff: 'medio', scope: 'aula', sub: 'Custo mínimo',
    stem: m`O custo de produção de uma empresa é $C(x,y)=x^{2}+y^{2}-4x-6y+20$. Qual é o custo mínimo?`,
    opts: [m`$7$`, [m`$20$`, m`É $C(0,0)$, o custo sem produção — não é o mínimo.`], [m`$13$`, m`$13=2^2+3^2$ ignora os termos lineares e a constante: $C(2,3)=13-8-18+20=7$.`], [m`$-7$`, m`Custo calculado com sinal trocado; $C(2,3)=4+9-8-18+20=+7$.`]],
    exp: m`$C_x=2x-4=0\Rightarrow x=2$ e $C_y=2y-6=0\Rightarrow y=3$. Com $C_{xx}=2>0$ e $D=4>0$, é mínimo: $C(2,3)=4+9-8-18+20=7$.`,
    steps: [m`$(x,y)=(2,3)$.`, m`$C_{xx}=2>0$, $D=4>0$ ⇒ mínimo.`, m`$C(2,3)=7$.`],
    src: [[P, loc]],
    verify: ex(`subs(x**2+y**2-4*x-6*y+20,${sol('x**2+y**2-4*x-6*y+20')})`, '7', ['7', '20', '13', '-7']),
  }),
  R(10, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Multiplicadores de Lagrange',
    stem: m`Pelo método dos multiplicadores de Lagrange, qual é o valor máximo de $f(x,y)=xy$ sujeito a $x+y=10$?`,
    opts: [m`$25$`, [m`$10$`, m`$10$ é o valor da restrição $x+y$, não o valor de $xy$.`], [m`$5$`, m`$5$ são as coordenadas $x=y=5$ (e o multiplicador $\lambda$), não o valor de $xy$.`], [m`$50$`, m`Multiplicou por $2$ sem motivo: $f(5,5)=5\cdot5=25$.`]],
    exp: m`$\nabla f=\lambda\nabla g$ com $g=x+y$: $y=\lambda$ e $x=\lambda$, logo $x=y$. A restrição dá $2x=10\Rightarrow x=y=5$. O valor máximo é $f(5,5)=25$.`,
    steps: [m`$y=\lambda$ e $x=\lambda$ ⇒ $x=y$.`, m`$x+y=10\Rightarrow x=y=5$.`, m`$f(5,5)=25$.`],
    src: [[P, loc]],
    verify: ex(`subs(x*y,${lag('x*y', 'x+y', 10)})`, '25', ['25', '10', '5', '50']),
  }),
  R(11, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Mínimo com restrição linear',
    stem: m`Qual é o valor mínimo de $f(x,y)=x^{2}+y^{2}$ sujeito a $x+y=4$?`,
    opts: [m`$8$`, [m`$4$`, m`$4$ é o valor da restrição; o mínimo de $x^2+y^2$ em $x=y=2$ é $4+4=8$.`], [m`$16$`, m`$16=4^2$ vem de $(x+y)^2$ e inclui o termo $2xy$; o valor correto é $x^2+y^2=8$.`], [m`$2$`, m`$2$ é a coordenada ($x=y=2$), não o valor de $f$.`]],
    exp: m`$\nabla f=\lambda\nabla g$: $2x=\lambda$ e $2y=\lambda$, então $x=y$. Com $x+y=4$: $x=y=2$ e $f(2,2)=4+4=8$. (É o quadrado da distância da origem à reta $x+y=4$.)`,
    steps: [m`$2x=\lambda=2y\Rightarrow x=y$.`, m`$x+y=4\Rightarrow x=y=2$.`, m`$f(2,2)=8$.`],
    src: [[P, loc]],
    verify: ex(`subs(x**2+y**2,${lag('x**2+y**2', 'x+y', 4)})`, '8', ['8', '4', '16', '2']),
  }),
  R(12, {
    diff: 'medio', scope: 'aprofundamento', sub: 'Valor do multiplicador',
    stem: m`Ao maximizar $f(x,y)=xy$ com a restrição $x+y=10$, as equações de Lagrange são $y=\lambda$, $x=\lambda$ e $x+y=10$. Qual é o valor de $\lambda$?`,
    opts: [m`$5$`, [m`$25$`, m`$25$ é o valor máximo de $f$, não o multiplicador.`], [m`$10$`, m`$10$ é o valor da restrição; como $x=y=\lambda$ e $x+y=10$, tem-se $2\lambda=10$.`], [m`$1$`, m`Não decorre das equações: $\lambda=x=y=5$.`]],
    exp: m`De $y=\lambda$ e $x=\lambda$: $x=y=\lambda$. Substituindo em $x+y=10$: $2\lambda=10\Rightarrow\lambda=5$.`,
    steps: [m`$x=y=\lambda$.`, m`$2\lambda=10$.`, m`$\lambda=5$.`],
    src: [[P, loc]],
    verify: ex(`${lag('x*y', 'x+y', 10)}[lam]`, '5', ['5', '25', '10', '1']),
  }),

  // ---------------- DIFÍCEIS ----------------
  R(13, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Dois pontos críticos',
    stem: m`A função $f(x,y)=x^{3}+y^{3}-3xy$ tem pontos críticos $(0,0)$ e $(1,1)$. Como eles se classificam?`,
    opts: [m`$(0,0)$ é ponto de sela e $(1,1)$ é mínimo local`, [m`$(0,0)$ é mínimo local e $(1,1)$ é ponto de sela`, m`Trocou os pontos: em $(0,0)$, $D=0\cdot0-9=-9<0$ (sela); em $(1,1)$, $D=36-9=27>0$.`], [m`$(0,0)$ é ponto de sela e $(1,1)$ é máximo local`, m`Em $(1,1)$, $f_{xx}=6>0$ com $D=27>0$: é mínimo, não máximo.`], [m`ambos são mínimos locais`, m`Em $(0,0)$, $D=-9<0$: é sela.`]],
    exp: m`$f_x=3x^2-3y$ e $f_y=3y^2-3x$. Segundas derivadas: $f_{xx}=6x$, $f_{yy}=6y$, $f_{xy}=-3$, logo $D=36xy-9$. Em $(0,0)$: $D=-9<0$ ⇒ sela. Em $(1,1)$: $D=27>0$ e $f_{xx}=6>0$ ⇒ mínimo local, com $f(1,1)=-1$.`,
    steps: [m`$D=36xy-9$.`, m`$D(0,0)=-9<0$ ⇒ sela.`, m`$D(1,1)=27>0$, $f_{xx}=6>0$ ⇒ mínimo.`],
    src: [[P, loc]],
    verify: ex(`[${cls('x**3+y**3-3*x*y', 0, 0)},${cls('x**3+y**3-3*x*y', 1, 1)}]`, "['sela','min']", ["['sela','min']", "['min','sela']", "['sela','max']", "['min','min']"]),
  }),
  R(14, {
    diff: 'dificil', scope: 'desafio', sub: 'Teste da Hessiana inconclusivo',
    stem: m`Para $f(x,y)=x^{4}+y^{4}$ o ponto crítico $(0,0)$ tem $D=0$. O que se pode concluir?`,
    opts: [m`mínimo local ($D=0$ não decide; $f\ge0$)`, [m`é ponto de sela, pois $D=0$`, m`$D=0$ não indica sela (isso exige $D<0$); aqui $f\ge0$ perto de $(0,0)$, então não há direção de decrescimento.`], [m`é máximo local`, m`Em qualquer vizinhança há pontos com $f>0=f(0,0)$, então não é máximo.`], [m`não é ponto crítico`, m`$f_x=4x^3$ e $f_y=4y^3$ se anulam em $(0,0)$.`]],
    exp: m`Aqui $f_{xx}=12x^2$, $f_{yy}=12y^2$ e $f_{xy}=0$, então $D(0,0)=0$ e o teste da Hessiana não decide. Analisando diretamente: $f(x,y)=x^4+y^4\ge0$ e $f(0,0)=0$, portanto $(0,0)$ é mínimo local (e global).`,
    steps: [m`$D(0,0)=0$: teste inconclusivo.`, m`$x^{4}+y^{4}\ge0$ para todo $(x,y)$.`, m`$f\ge f(0,0)$ ⇒ mínimo.`],
    src: [[P, loc]],
    verify: ex(`'min' if (${cls('x**4+y**4', 0, 0)}=='inconclusivo' and ${at('x**4+y**4', 'Rational(1,10)', '-Rational(1,10)')}>0 and ${at('x**4+y**4', 'Rational(1,10)', 0)}>0 and ${at('x**4+y**4', 0, '-Rational(1,5)')}>0) else 'outro'`, "'min'", lab('min', 'sela', 'max', 'naocritico')),
  }),
  R(15, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Lagrange com circunferência',
    stem: m`Qual é o valor máximo de $f(x,y)=x+y$ sobre a circunferência $x^{2}+y^{2}=2$?`,
    opts: [m`$2$`, [m`$1$`, m`$1$ é a coordenada do ponto $(1,1)$, não o valor $x+y=2$.`], [m`$\sqrt2$`, m`$\sqrt2$ é o raio da circunferência; o máximo de $x+y$ é $1+1=2$.`], [m`$4$`, m`$4=2^2$ confunde $(x+y)^2$ com $x+y$; o máximo de $x+y$ é $2$.`]],
    exp: m`$\nabla f=\lambda\nabla g$: $1=2\lambda x$ e $1=2\lambda y$, logo $x=y$. A restrição dá $2x^2=2\Rightarrow x=\pm1$. Os candidatos são $(1,1)$, com $f=2$, e $(-1,-1)$, com $f=-2$. O máximo é $2$.`,
    steps: [m`$1=2\lambda x=2\lambda y\Rightarrow x=y$.`, m`$2x^{2}=2\Rightarrow x=\pm1$.`, m`$f(1,1)=2$ (máximo) e $f(-1,-1)=-2$.`],
    src: [[P, loc]],
    verify: ex(`sorted([subs(x+y,{x:p[0],y:p[1]}) for p in solve([1-2*lam*x,1-2*lam*y,x**2+y**2-2],[x,y,lam])])[-1]`, '2', ['2', '1', 'sqrt(2)', '4']),
  }),
  R(16, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Utilidade com restrição orçamentária',
    stem: m`Um consumidor gasta exatamente $12$ reais em dois bens, com preços de $2$ reais ($x$) e $3$ reais ($y$) por unidade, e quer maximizar a utilidade $U(x,y)=xy$. Qual é a utilidade máxima?`,
    opts: [m`$6$`, [m`$12$`, m`$12$ é o orçamento, não a utilidade.`], [m`$4$`, m`Dividiu o orçamento pelo preço de $y$ ($12/3$) sem usar a condição de Lagrange; o ótimo é $x=3$, $y=2$.`], [m`$3$`, m`$3$ é a quantidade ótima de $x$ (com $y=2$); a utilidade é $xy=6$.`]],
    exp: m`Restrição: $2x+3y=12$. Lagrange: $y=2\lambda$ e $x=3\lambda$, então $x=\frac32y$. Substituindo: $3y+3y=12\Rightarrow y=2$ e $x=3$. Utilidade máxima: $U(3,2)=6$.`,
    steps: [m`$y=2\lambda$, $x=3\lambda$ ⇒ $x=\frac32 y$.`, m`$2x+3y=12\Rightarrow y=2,\ x=3$.`, m`$U=3\cdot2=6$.`],
    src: [[P, loc]],
    verify: ex(`subs(x*y,${lag('x*y', '2*x+3*y', 12)})`, '6', ['6', '12', '4', '3']),
  }),
  R(17, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Caixa de menor área',
    stem: m`Uma caixa retangular sem tampa, de base $x\times y$ e altura $z$, deve ter volume $32$ m³. Qual é a menor área de material (base e quatro paredes) possível?`,
    opts: [m`$48$ m²`, [m`$64$ m²`, m`Incluiu a tampa: com tampa seria $16+16+32=64$; o enunciado diz *sem* tampa ($16+16+16=48$).`], [m`$32$ m²`, m`$32$ é o volume, não a área.`], [m`$96$ m²`, m`Dobrou a área: contou a base e as paredes duas vezes; no ótimo $S=16+16+16=48$.`]],
    exp: m`Com $z=\frac{32}{xy}$, a área é $S=xy+2z(x+y)=xy+\frac{64}{y}+\frac{64}{x}$. $S_x=y-\frac{64}{x^2}=0$ e $S_y=x-\frac{64}{y^2}=0$ levam a $x=y=4$ (e $z=2$). Como $S_{xx}=\frac{128}{x^3}=2>0$ e $D=3>0$ em $(4,4)$, é mínimo: $S=16+16+16=48$.`,
    steps: [m`$S=xy+\dfrac{64}{y}+\dfrac{64}{x}$.`, m`$S_x=S_y=0\Rightarrow x=y=4$, $z=2$.`, m`$S(4,4)=48$ (mínimo, $D=3>0$).`],
    src: [[P, loc]],
    verify: ex(`${at('x*y+64/y+64/x', 4, 4)} if (${at('diff(x*y+64/y+64/x,x)', 4, 4)}==0 and ${at('diff(x*y+64/y+64/x,y)', 4, 4)}==0 and ${at(hess('x*y+64/y+64/x'), 4, 4)}>0 and ${at('diff(x*y+64/y+64/x,x,2)', 4, 4)}>0) else 0`, '16+16+16', ['48', '64', '32', '96']),
  }),
  R(18, {
    diff: 'dificil', scope: 'aprofundamento', sub: 'Parâmetro e natureza do ponto crítico',
    stem: m`Para quais valores de $k$ o teste da Hessiana garante que a origem é ponto de mínimo local de $f(x,y)=x^{2}+kxy+y^{2}$?`,
    opts: [m`$-2<k<2$`, [m`$k<2$`, m`Para $k\le-2$ ainda se tem $D=4-k^2\le0$ (por exemplo $k=-3$ dá sela): falta o limite inferior.`], [m`$k>2$`, m`Para $k>2$ tem-se $D=4-k^2<0$: a origem é sela.`], [m`apenas $k=0$`, m`$D=4-k^2>0$ vale para todo $k$ com $|k|<2$, e não só em $k=0$.`]],
    exp: m`$f_{xx}=2$, $f_{yy}=2$ e $f_{xy}=k$, então $D=4-k^2$. Há mínimo local quando $D>0$ e $f_{xx}>0$: $4-k^2>0\iff-2<k<2$. Para $|k|>2$ é sela e, para $|k|=2$, o teste é inconclusivo ($D=0$).`,
    steps: [m`$f_{xx}=2$, $f_{xy}=k$, $f_{yy}=2$.`, m`$D=4-k^{2}>0$.`, m`$-2<k<2$.`],
    src: [[P, loc]],
    verify: ex(`'abs(k)<2' if [subs(${hess('x**2+k*x*y+y**2')},k,k0)>0 for k0 in [-3,-2,-1,0,1,2,3]]==[False,False,True,True,True,False,False] else 'outro'`, "'abs(k)<2'", lab('abs(k)<2', 'k<2', 'k>2', 'k=0')),
  }),
];

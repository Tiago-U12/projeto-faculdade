"""Gera a coleção de materiais de teste do Study Mastery (conteúdo próprio, escrito para os testes; uso livre no projeto).
    python3 -I tools/fixtures/gerar_materiais.py
Casos normais e problemáticos para extração, validação e geração."""
import io
import os
import sys

from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tests', 'fixtures', 'materiais')
os.makedirs(OUT, exist_ok=True)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
pdfmetrics.registerFont(TTFont('DV', FONT))
pdfmetrics.registerFont(TTFont('DVB', FONT_B))


def wrap(text, width_chars=88):
    out, line = [], ''
    for w in text.split():
        if len(line) + len(w) + 1 > width_chars:
            out.append(line)
            line = w
        else:
            line = (line + ' ' + w).strip()
    if line:
        out.append(line)
    return out


def page(c, title, paragraphs, size=A4):
    w, h = size
    y = h - 2.5 * cm
    c.setFont('DVB', 18)
    c.drawString(2 * cm, y, title)
    y -= 1.2 * cm
    for p in paragraphs:
        font, sz = ('DV', 10.5)
        if p.startswith('$ '):  # fórmula em destaque
            p = p[2:]
            font, sz = ('DV', 12)
            c.setFont(font, sz)
            c.drawString(3 * cm, y, p)
            y -= 0.8 * cm
            continue
        c.setFont(font, sz)
        for line in wrap(p):
            c.drawString(2 * cm, y, line)
            y -= 0.55 * cm
        y -= 0.35 * cm
    c.showPage()


INTEGRAIS = [
    ('1. Integração por partes', [
        'A integração por partes vem da regra do produto para derivadas. Se u e v são funções deriváveis, a derivada de u·v é u·v′ + u′·v. Integrando os dois lados e reorganizando, obtemos a fórmula usada para transformar uma integral difícil em outra mais simples.',
        '$ ∫ u dv = u·v − ∫ v du',
        'A escolha de u costuma seguir a ordem LIATE: logarítmicas, inversas trigonométricas, algébricas, trigonométricas e exponenciais. A função que aparece primeiro nessa lista é uma boa candidata a u, porque sua derivada fica mais simples.',
        'Exemplo resolvido: para calcular a integral de x·eˣ, escolhemos u = x e dv = eˣ dx. Então du = dx e v = eˣ. Aplicando a fórmula, a integral vale x·eˣ − ∫ eˣ dx = x·eˣ − eˣ + C.',
        '$ ∫ x·eˣ dx = (x − 1)·eˣ + C',
        'Erro frequente: esquecer o sinal de menos antes da nova integral ou trocar u e dv de forma que a nova integral fique mais difícil do que a original. Quando isso acontece, vale voltar e testar a outra escolha.',
    ]),
    ('2. Substituição trigonométrica', [
        'Integrais com raízes do tipo √(a² − x²), √(a² + x²) ou √(x² − a²) podem ser resolvidas trocando x por uma expressão trigonométrica. A ideia é usar identidades como sen²θ + cos²θ = 1 para eliminar a raiz.',
        '$ √(a² − x²): x = a·sen θ,  dx = a·cos θ dθ',
        '$ √(a² + x²): x = a·tg θ,  dx = a·sec² θ dθ',
        'Depois de integrar na variável θ, é preciso voltar para x. Um triângulo retângulo com os lados identificados a partir da substituição ajuda a escrever sen θ, cos θ e tg θ em função de x sem erro.',
        'Exemplo: na integral de dx dividido por √(4 − x²), usamos x = 2·sen θ. A raiz vira 2·cos θ e dx vira 2·cos θ dθ. A integral fica igual a θ + C, isto é, arcsen(x/2) + C.',
    ]),
    ('3. Frações parciais', [
        'Uma função racional própria, em que o grau do numerador é menor que o do denominador, pode ser escrita como soma de frações mais simples. Cada fator do denominador gera uma ou mais frações parciais com constantes a determinar.',
        '$ (3x + 5) / ((x − 1)(x + 2)) = A/(x − 1) + B/(x + 2)',
        'Para encontrar A e B, multiplicamos tudo pelo denominador e comparamos coeficientes, ou escolhemos valores convenientes de x. Com x = 1 obtemos 8 = 3A, logo A = 8/3; com x = −2 obtemos −1 = −3B, logo B = 1/3.',
        'Se o grau do numerador for maior ou igual ao do denominador, faça primeiro a divisão de polinômios. Fatores repetidos, como (x − 1)², exigem uma fração para cada potência.',
    ]),
    ('4. Integrais impróprias', [
        'Uma integral é imprópria quando um dos limites de integração é infinito ou quando a função tem uma descontinuidade infinita no intervalo. Ela é definida como um limite e pode convergir para um número ou divergir.',
        '$ ∫₁^∞ 1/xᵖ dx converge se p > 1 e diverge se p ≤ 1',
        'Para resolver, substitua o limite problemático por uma variável t, calcule a integral definida e depois o limite quando t tende ao valor problemático. Se o limite existir e for finito, a integral converge.',
        'O teste de comparação permite decidir a convergência sem calcular a integral: se 0 ≤ f(x) ≤ g(x) e a integral de g converge, a de f também converge.',
    ]),
]


def aula_integrais():
    c = canvas.Canvas(os.path.join(OUT, 'aula-integrais.pdf'), pagesize=A4)
    c.setTitle('Técnicas de integração — material de teste')
    for t, ps in INTEGRAIS:
        page(c, t, ps)
    c.save()


def slides_com_figura():
    size = landscape(A4)
    c = canvas.Canvas(os.path.join(OUT, 'slides-express.pdf'), pagesize=size)
    page(c, 'Rotas no Express', ['Uma rota associa um método HTTP e um caminho a uma função. Em app.get(\'/produtos\', handler), o handler recebe req e res e deve enviar uma resposta com res.json, res.send ou res.status. Rotas com parâmetros usam dois-pontos, como /produtos/:id, e o valor fica em req.params.id. A ordem de registro importa: o Express testa as rotas na ordem em que foram declaradas e usa a primeira que combina com o método e o caminho.', 'Parâmetros de consulta, como em /produtos?pagina=2, ficam em req.query e chegam sempre como texto: converta para número antes de usar em cálculos. Para responder com erro, defina o status antes do corpo, por exemplo res.status(404).json({ erro: \'não encontrado\' }). Um roteador criado com express.Router() agrupa rotas relacionadas e pode ser montado em um prefixo com app.use(\'/api/produtos\', roteador).'], size)
    # slide só com figura (sem texto selecionável)
    img = Image.new('RGB', (900, 500), 'white')
    d = ImageDraw.Draw(img)
    d.rectangle([60, 60, 840, 440], outline='black', width=6)
    d.line([60, 250, 840, 250], fill='black', width=4)
    buf = io.BytesIO()
    img.save(buf, 'PNG')
    buf.seek(0)
    from reportlab.lib.utils import ImageReader
    c.drawImage(ImageReader(buf), 3 * cm, 3 * cm, width=20 * cm, height=11 * cm)
    c.showPage()
    page(c, 'Middlewares', ['Um middleware é uma função com a assinatura (req, res, next). Ele pode ler e alterar a requisição, encerrar a resposta ou chamar next() para passar o controle adiante. express.json() é um middleware que lê o corpo JSON e preenche req.body. Middlewares de erro têm quatro parâmetros, (err, req, res, next), e devem ser registrados depois das rotas. Se um middleware não chamar next() nem responder, a requisição fica pendurada até o tempo limite do cliente.', 'A ordem também vale para middlewares: um middleware de autenticação registrado antes das rotas protege todas as que vêm depois. Para proteger só algumas rotas, passe o middleware como argumento da própria rota, entre o caminho e o handler. Funções assíncronas que lançam erros precisam encaminhar o erro com next(erro) para que o middleware de erro seja chamado.'], size)
    c.save()


def digitalizado():
    # página "escaneada": o texto existe só como imagem
    img = Image.new('L', (1240, 1754), 255)
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT, 34)
    y = 120
    for line in ['Lista de exercícios — Integrais', '1) Calcule a integral de x·cos(x) dx.', '2) Calcule a integral de ln(x) dx.', '3) Decida se a integral de 1/x² de 1 a ∞ converge.']:
        d.text((100, y), line, fill=0, font=f)
        y += 70
    img.save(os.path.join(OUT, 'digitalizado.pdf'), 'PDF', resolution=150)


def protegido():
    r = PdfReader(os.path.join(OUT, 'aula-integrais.pdf'))
    w = PdfWriter()
    for p in r.pages:
        w.add_page(p)
    w.encrypt(user_password='senha-de-teste', owner_password='dono', algorithm='AES-256')
    with open(os.path.join(OUT, 'protegido.pdf'), 'wb') as fh:
        w.write(fh)


def corrompido():
    data = open(os.path.join(OUT, 'aula-integrais.pdf'), 'rb').read()
    open(os.path.join(OUT, 'corrompido.pdf'), 'wb').write(data[: len(data) // 3])


def nao_e_pdf():
    img = Image.new('RGB', (40, 40), 'purple')
    img.save(os.path.join(OUT, 'nao-e-pdf.pdf'), 'PNG')  # extensão .pdf, conteúdo PNG


def curto():
    c = canvas.Canvas(os.path.join(OUT, 'curto.pdf'), pagesize=A4)
    page(c, 'Aviso', ['Prova na próxima quarta-feira. Tragam calculadora.'])
    c.save()


def tabela():
    c = canvas.Canvas(os.path.join(OUT, 'tabela-derivadas.pdf'), pagesize=A4)
    c.setFont('DVB', 18)
    c.drawString(2 * cm, 27 * cm, 'Tabela de derivadas e integrais')
    c.setFont('DV', 11)
    rows = [('Função', 'Derivada', 'Integral'), ('xⁿ', 'n·xⁿ⁻¹', 'xⁿ⁺¹/(n+1) + C'), ('eˣ', 'eˣ', 'eˣ + C'), ('ln x', '1/x', 'x·ln x − x + C'), ('sen x', 'cos x', '−cos x + C'), ('cos x', '−sen x', 'sen x + C'), ('tg x', 'sec² x', '−ln|cos x| + C')]
    y = 25.5 * cm
    for r in rows:
        for i, col in enumerate(r):
            c.drawString((2 + i * 6) * cm, y, col)
        y -= 0.8 * cm
    c.setFont('DV', 10.5)
    y -= 0.6 * cm
    texto = 'A tabela resume regras básicas usadas nas listas. Para usar a linha de xⁿ na integral, o expoente n precisa ser diferente de −1; quando n = −1, a primitiva de 1/x é ln|x| + C. Nas linhas trigonométricas, preste atenção aos sinais: a derivada do cosseno é menos seno e a integral do seno é menos cosseno. Essas regras aparecem combinadas com a regra da cadeia e com substituição, por isso vale conferir derivando o resultado obtido. Derivar a resposta é a forma mais rápida de verificar se uma integral indefinida está correta, porque a derivada da primitiva deve devolver exatamente a função que estava dentro da integral. ' * 2
    for line in wrap(texto):
        c.drawString(2 * cm, y, line)
        y -= 0.55 * cm
    c.showPage()
    c.save()


TEXTO_COLADO = """Revisão para a prova — Integrais duplas

Uma integral dupla soma os valores de uma função f(x, y) sobre uma região R do plano. Quando a região é um retângulo [a, b] × [c, d] e f é contínua, o teorema de Fubini permite calcular a integral dupla como duas integrais simples em sequência, em qualquer ordem.

Em regiões que não são retângulos, descreva a região com limites variáveis. Uma região do tipo I tem x entre a e b e y entre g1(x) e g2(x). Uma região do tipo II tem y entre c e d e x entre h1(y) e h2(y). Escolher a ordem certa pode transformar uma integral impossível em uma integral simples.

Exemplo resolvido: para integrar f(x, y) = x·y sobre o triângulo com vértices (0, 0), (1, 0) e (1, 1), descrevemos a região com x entre 0 e 1 e y entre 0 e x. A integral interna em y vale x·(x²/2), e a integral externa de x³/2 entre 0 e 1 vale 1/8.

Coordenadas polares ajudam quando a região é um disco ou um setor circular. Trocamos x por r·cos θ, y por r·sen θ e o elemento de área dA por r dr dθ. Esquecer o fator r é o erro mais comum nessa mudança de variáveis.

A área de uma região R é a integral dupla de 1 sobre R. O volume sob a superfície z = f(x, y), acima de R, é a integral dupla de f sobre R quando f é não negativa.
"""


def texto_colado():
    open(os.path.join(OUT, 'texto-colado.txt'), 'w', encoding='utf-8').write(TEXTO_COLADO)


if __name__ == '__main__':
    aula_integrais()
    slides_com_figura()
    digitalizado()
    protegido()
    corrompido()
    nao_e_pdf()
    curto()
    tabela()
    texto_colado()
    for f in sorted(os.listdir(OUT)):
        print(f, os.path.getsize(os.path.join(OUT, f)))

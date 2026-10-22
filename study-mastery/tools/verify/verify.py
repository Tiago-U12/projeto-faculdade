#!/usr/bin/env python3
"""Verificador matemático do Study Mastery: SymPy (simbólico) + mpmath/numérico (independente).

Entrada (stdin): lista JSON de tarefas
  {"id", "kind", "params", "optionValues": {optId: str}, "correctOptionId"}
Saída (stdout): lista JSON {"id","ok","method","details","errors":[...]}

Segurança: nenhuma expressão é passada a eval sem antes ser validada por uma whitelist de nós de AST
(sem atributos, sem dunder, sem imports, chamadas só a funções permitidas). Executar sempre em
subprocesso com timeout (feito por tools/lib/verify.ts). Rodar com `python3 -I`.
"""
import ast
import json
import random
import resource
import sys
import traceback

import mpmath as mp
import sympy as sp
from sympy import (E, Eq, Float, Integer, Rational, S, Symbol, oo, pi, zoo, nan)

mp.mp.dps = 250
resource.setrlimit(resource.RLIMIT_CPU, (50, 55))
resource.setrlimit(resource.RLIMIT_AS, (3 * 1024**3, 3 * 1024**3))

X, Y, Z, T, U, A, B, C, K, N, H = sp.symbols('x y z t u a b c k n h', real=True)
LAM = sp.Symbol('lambda_', real=True)
SYMBOLS = {s.name: s for s in (X, Y, Z, T, U, A, B, C, K, N, H)}
SYMBOLS['lam'] = LAM

FUNCS = {
    'sin': sp.sin, 'cos': sp.cos, 'tan': sp.tan, 'cot': sp.cot, 'sec': sp.sec, 'csc': sp.csc,
    'asin': sp.asin, 'acos': sp.acos, 'atan': sp.atan, 'sinh': sp.sinh, 'cosh': sp.cosh, 'tanh': sp.tanh,
    'exp': sp.exp, 'log': sp.log, 'ln': sp.log, 'sqrt': sp.sqrt, 'cbrt': sp.cbrt, 'root': sp.root, 'Abs': sp.Abs, 'abs': sp.Abs,
    'Rational': sp.Rational, 'Integer': sp.Integer, 'Float': sp.Float, 'factorial': sp.factorial, 'binomial': sp.binomial,
    'limit': sp.limit, 'diff': sp.diff, 'integrate': sp.integrate, 'series': sp.series, 'solve': sp.solve, 'simplify': sp.simplify,
    'expand': sp.expand, 'factor': sp.factor, 'Matrix': sp.Matrix, 'hessian': sp.hessian, 'Tuple': sp.Tuple, 'Sum': sp.Sum,
    'summation': sp.summation, 'sign': sp.sign, 'floor': sp.floor, 'ceiling': sp.ceiling, 'Max': sp.Max, 'Min': sp.Min,
    'Eq': sp.Eq, 'atan2': sp.atan2, 'det': sp.det, 'Symbol': sp.Symbol, 'symbols': sp.symbols,
    'FiniteSet': sp.FiniteSet, 'str': str, 'round': round, 'len': len, 'sorted': sorted, 'list': list, 'tuple': tuple, 'set': set, 'float': float, 'int': int,
    'subs': lambda e, *a: e.subs(*a),
}
CONSTS = {'pi': pi, 'E': E, 'e': E, 'oo': oo, 'inf': oo, 'I': sp.I, 'zoo': zoo, 'nan': nan, 'True': True, 'False': False}
ALLOWED_NODES = (
    ast.Expression, ast.BinOp, ast.UnaryOp, ast.Call, ast.Name, ast.Constant, ast.Tuple, ast.List, ast.Load,
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.USub, ast.UAdd, ast.Mod, ast.FloorDiv, ast.Subscript, ast.Index if hasattr(ast, 'Index') else ast.Load,
    ast.Slice, ast.keyword, ast.Compare, ast.Eq, ast.Lt, ast.Gt, ast.LtE, ast.GtE, ast.NotEq, ast.IfExp, ast.BoolOp, ast.And, ast.Or, ast.Not,
    ast.ListComp, ast.GeneratorExp, ast.comprehension, ast.Store, ast.Dict,
)


class Unsafe(Exception):
    pass


def safe_eval(src, extra=None):
    src = src.strip().replace('^', '**') if isinstance(src, str) else src
    tree = ast.parse(src, mode='eval')
    ns = {**SYMBOLS, **CONSTS, **FUNCS}
    if extra:
        ns.update(extra)
    comp_names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.comprehension):
            for t in ast.walk(node.target):
                if isinstance(t, ast.Name):
                    comp_names.add(t.id)
    for node in ast.walk(tree):
        if not isinstance(node, ALLOWED_NODES):
            raise Unsafe(f'nó de AST não permitido: {type(node).__name__}')
        if isinstance(node, ast.Name):
            if node.id.startswith('__'):
                raise Unsafe('nome inválido')
            if node.id not in ns and node.id not in comp_names:
                raise Unsafe(f'nome desconhecido: {node.id}')
        if isinstance(node, ast.Call) and not isinstance(node.func, ast.Name):
            raise Unsafe('apenas chamadas diretas a funções permitidas')
        if isinstance(node, ast.Constant) and isinstance(node.value, (bytes, complex)):
            raise Unsafe('constante não permitida')
        if isinstance(node, ast.Constant) and isinstance(node.value, int) and abs(node.value) > 10**12:
            raise Unsafe('inteiro grande demais')
    return eval(compile(tree, '<expr>', 'eval'), {'__builtins__': {}}, ns)


def parse(s, extra=None):
    v = safe_eval(s, extra)
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        v = sp.nsimplify(v) if isinstance(v, int) else sp.Float(v)
    return v


# ---------- comparação ----------

def is_nan(v):
    return v is nan or v == nan or (hasattr(v, 'is_nan') and v.is_nan)


def num(v, prec=30):
    try:
        return complex(sp.N(v, prec))
    except Exception:
        return None


def same_value(a, b, tol=1e-9):
    """Igualdade de valores (escalares, ±oo, listas/conjuntos de escalares)."""
    if isinstance(a, str) or isinstance(b, str):
        return str(a).strip().lower() == str(b).strip().lower()
    seq_types = (list, tuple, sp.Tuple)
    set_types = (set, frozenset, sp.FiniteSet)
    if isinstance(a, seq_types) and isinstance(b, seq_types):  # sequências: comparação ORDENADA
        return len(a) == len(b) and all(same_value(x, y, tol) for x, y in zip(a, b))
    if isinstance(a, set_types) or isinstance(b, set_types):  # conjuntos: sem ordem
        try:
            la, lb = list(a), list(b)
        except TypeError:
            return False
        if len(la) != len(lb):
            return False
        try:
            sa = sorted(la, key=lambda v: (num(v) or 0).real)
            sb = sorted(lb, key=lambda v: (num(v) or 0).real)
        except Exception:
            sa, sb = la, lb
        return all(same_value(x, y, tol) for x, y in zip(sa, sb))
    if isinstance(a, seq_types) or isinstance(b, seq_types):
        return False
    if a in (oo, -oo, zoo) or b in (oo, -oo, zoo):
        return a == b
    if is_nan(a) or is_nan(b):
        return is_nan(a) and is_nan(b)
    try:
        d = sp.simplify(a - b)
        if d == 0:
            return True
    except Exception:
        pass
    na, nb = num(a), num(b)
    if na is None or nb is None:
        return False
    return abs(na - nb) <= tol * max(1.0, abs(na), abs(nb))


SAMPLE_POINTS = [Rational(1, 3), Rational(7, 5), Rational(11, 4), Rational(5, 2), Rational(17, 10), Rational(23, 7), Rational(3, 5), Rational(9, 4)]


def same_function(f, g, var, points=None, tol=1e-8, allow_const=False):
    """Igualdade de funções por amostragem numérica (+ simplificação simbólica quando possível)."""
    try:
        if sp.simplify(f - g) == 0:
            return True
    except Exception:
        pass
    pts = points or SAMPLE_POINTS
    vals = []
    for p in pts:
        try:
            fv, gv = complex(sp.N(f.subs(var, p), 25)), complex(sp.N(g.subs(var, p), 25))
        except Exception:
            continue
        if any(v != v or abs(v) == float('inf') for v in (fv, gv)):
            continue
        vals.append(fv - gv)
    if len(vals) < 3:
        return False
    if allow_const:
        return all(abs(v - vals[0]) <= tol * max(1, abs(vals[0])) for v in vals)
    return all(abs(v) <= tol * max(1.0, abs(v)) and abs(v) <= tol for v in vals)


# ---------- tipos de verificação ----------

def mp_eval(expr, var, x):
    f = sp.lambdify(var, expr, modules='mpmath')
    return f(x)


def numeric_limit(expr, var, at, direction):
    """Estimativa numérica independente do SymPy (mpmath, 250 dígitos): sequências que se aproximam do ponto.
    No infinito usa x até 1e96; se a expressão estourar (ex.: exp(1e96)), recua para x até 1e6."""
    sequences = [(6, 12, 24, 48, 96), (1, 2, 3, 4, 5, 6)] if at in (oo, -oo) else [(6, 9, 12, 16, 20)]
    results = {}
    sides = ['+', '-'] if direction == '+-' else [direction]
    for side in sides:
        seq = []
        for ks in sequences:
            seq = []
            for k in ks:
                h = mp.mpf(10) ** (-k)
                try:
                    if at in (oo, -oo):
                        x = (mp.mpf(1) / h if at == oo else -mp.mpf(1) / h)
                    else:
                        x = mp.mpf(str(sp.N(at, 60))) + (h if side == '+' else -h)
                    seq.append(mp_eval(expr, var, x))
                except Exception:
                    seq.append(None)
            if len([v for v in seq if v is not None]) >= 4:
                break
        results[side] = seq
    return results


def classify_numeric(seq):
    vals = [v for v in seq if v is not None and not isinstance(v, mp.mpc)]
    if len(vals) < 4:
        return 'unknown', None
    last, prev, prev2 = vals[-1], vals[-2], vals[-3]
    if abs(last - prev) <= mp.mpf(10) ** -6 * max(1, abs(last)) and abs(prev - prev2) <= mp.mpf(10) ** -4 * max(1, abs(prev)):
        return 'finite', last
    # convergência lenta a zero (ex.: ln x / x^0,1): valores estritamente decrescentes e já muito pequenos
    if abs(last) < mp.mpf(10) ** -4 and all(abs(vals[i + 1]) < abs(vals[i]) for i in range(len(vals) - 4, len(vals) - 1)):
        return 'finite', last
    grow = all(abs(vals[i + 1]) > abs(vals[i]) for i in range(len(vals) - 4, len(vals) - 1))
    if grow and abs(last) >= 10 and abs(last) >= mp.mpf('1.3') * abs(prev2) and all((v > 0) == (last > 0) for v in vals[-3:]):
        return ('oo' if last > 0 else '-oo'), None
    return 'unknown', None


def verify_limit(p, options, correct):
    expr = parse(p['expr'])
    var = parse(p.get('var', 'x'))
    at = parse(p['at'])
    direction = p.get('dir', '+-')
    if direction == '+-':
        lp = sp.limit(expr, var, at, '+')
        lm = sp.limit(expr, var, at, '-')
        truth = lp if lp == lm else nan
        # ±oo de lados opostos => DNE (nan); mesmo sinal de infinito => oo
    else:
        truth = sp.limit(expr, var, at, direction)
    truth_label = 'DNE' if is_nan(truth) else str(truth)
    numeric = numeric_limit(expr, var, at, direction)
    # confere o numérico com o simbólico
    notes = []
    kinds = {s: classify_numeric(seq) for s, seq in numeric.items()}
    ok_numeric = True
    for s, (k, v) in kinds.items():
        if is_nan(truth):
            continue
        if truth == oo:
            ok_numeric &= (k == 'oo')
        elif truth == -oo:
            ok_numeric &= (k == '-oo')
        else:
            ok_numeric &= (k == 'finite' and abs(v - mp.mpf(str(sp.N(truth, 30)))) < mp.mpf(10) ** -5)
        notes.append(f'{s}:{k}')
    if is_nan(truth):
        # confirma que os lados realmente diferem ou divergem
        if direction == '+-':
            kp, kn = kinds['+'], kinds['-']
            differ = (kp[0] != kn[0]) or (kp[0] == 'finite' and kn[0] == 'finite' and abs(kp[1] - kn[1]) > mp.mpf(10) ** -4)
            ok_numeric = differ or kp[0] == 'unknown'
    return truth, truth_label, ok_numeric, ';'.join(notes)



def part_limit(expr_src, var, at, direction):
    expr = parse(expr_src)
    sym = sp.limit(expr, var, at, direction if direction != '+-' else '+-')
    seq = numeric_limit(expr, var, at, direction)
    kinds = [classify_numeric(v)[0] if v else 'unknown' for v in seq.values()]
    return sym, kinds


def kind_of(v):
    if v == oo or v == -oo:
        return 'oo'
    if v == 0:
        return '0'
    if v == 1:
        return '1'
    if is_nan(v):
        return 'dne'
    return 'finite'


def numeric_kind(kinds, sym):
    """Concorda a classificação numérica (mpmath) com o limite simbólico."""
    for k in kinds:
        if sym in (oo, -oo):
            if k != ('oo' if sym == oo else '-oo'):
                return False
        elif k not in ('finite', 'unknown'):
            return False
    return True


def verify_form(p):
    """Classifica a forma de uma expressão no ponto: 0/0, oo/oo, 0*oo, oo-oo, 1^oo, 0^0, oo^0 ou 'determinada'."""
    var = parse(p.get('var', 'x'))
    at = parse(p['at'])
    direction = p.get('dir', '+-')
    typ = p['type']
    fsrc, gsrc = p['parts']
    f, kf = part_limit(fsrc, var, at, direction)
    g, kg = part_limit(gsrc, var, at, direction)
    ok_num = numeric_kind(kf, f) and numeric_kind(kg, g)
    kf_, kg_ = kind_of(f), kind_of(g)
    label = 'determinada'
    if typ == 'quotient':
        if kf_ == '0' and kg_ == '0':
            label = '0/0'
        elif kf_ == 'oo' and kg_ == 'oo':
            label = 'oo/oo'
    elif typ == 'product':
        if {kf_, kg_} == {'0', 'oo'}:
            label = '0*oo'
    elif typ == 'difference':
        if kf_ == 'oo' and kg_ == 'oo' and f == g:
            label = 'oo-oo'
    elif typ == 'power':
        if kf_ == '1' and kg_ == 'oo':
            label = '1^oo'
        elif kf_ == '0' and kg_ == '0':
            label = '0^0'
        elif kf_ == 'oo' and kg_ == '0':
            label = 'oo^0'
    else:
        raise ValueError('type inválido')
    return label, ok_num, f'{typ}: lim f={f}, lim g={g} → {label}'


def scalar_truth(kind, p):
    """Valor verdadeiro de um problema escalar + status da checagem numérica independente."""
    if kind == 'limit':
        truth, label, ok_num, notes = verify_limit(p, {}, None)
        return truth, ok_num, f'limite={label}'
    if kind == 'definite':
        expr, var = parse(p['expr']), parse(p.get('var', 'x'))
        a, b = parse(p['a']), parse(p['b'])
        truth = sp.integrate(expr, (var, a, b))
        f = sp.lambdify(var, expr, modules='mpmath')
        lo = -mp.inf if a == -oo else mp.mpf(str(sp.N(a, 40)))
        hi = mp.inf if b == oo else mp.mpf(str(sp.N(b, 40)))
        nv = mp.quad(f, [lo, hi])
        tv = complex(sp.N(truth, 30))
        return truth, abs(tv - complex(nv)) < 1e-7 * max(1, abs(tv)), f'integral={truth}'
    if kind == 'form':
        label, ok_num, d = verify_form(p)
        return label, ok_num, d
    if kind == 'expr':
        truth = parse(p['expr'])
        ok = same_value(truth, parse(p['numeric']), 1e-7) if p.get('numeric') else False
        return truth, ok, f'valor={truth}'
    raise ValueError(f'perOption não suportado para {kind}')


def run_per_option(kind, p, options, correct):
    """Cada alternativa traz um problema próprio (p['perOption'][optId]); o valor declarado de cada alternativa
    deve coincidir com o valor calculado, e somente a correta pode igualar p['target']."""
    errors, notes = [], []
    target = p['target']
    matches = []
    for oid, sub in p['perOption'].items():
        sub = dict(sub)
        truth, ok_num, d = scalar_truth(kind, sub)
        notes.append(f'{oid}:{d}')
        claim = options.get(oid, '')
        if not ok_num:
            errors.append(f'alternativa {oid}: checagem numérica divergente')
        if isinstance(truth, str):
            claim_ok = str(truth).lower() == claim.strip().lower()
            tgt_ok = str(truth).lower() == str(target).lower()
        else:
            try:
                claim_ok = (claim.strip().upper() == 'DNE' and is_nan(truth)) or same_value(truth, parse(claim))
            except Exception:
                claim_ok = False
            try:
                tgt_ok = (str(target).upper() == 'DNE' and is_nan(truth)) or same_value(truth, parse(str(target)))
            except Exception:
                tgt_ok = False
        if not claim_ok:
            errors.append(f'alternativa {oid}: valor declarado «{claim}» ≠ calculado «{truth}»')
        if tgt_ok:
            matches.append(oid)
    if matches != [correct]:
        errors.append(f'alternativas que atendem ao alvo «{target}»: {matches or "nenhuma"} (esperado apenas {correct})')
    return dict(ok=not errors, method='sympy+mpmath (por alternativa)', details='; '.join(notes), errors=errors)


def compare_scalar_options(truth, options, correct):
    matches = []
    for oid, text in options.items():
        t = text.strip()
        if t.upper() == 'DNE':
            hit = is_nan(truth) or truth is None
        else:
            try:
                val = parse(t)
                hit = same_value(truth, val)
            except Exception:
                hit = False
        if hit:
            matches.append(oid)
    return matches


def run(task):
    kind, p, options, correct = task['kind'], task.get('params') or {}, task.get('optionValues') or {}, task['correctOptionId']
    if kind == 'source':
        return dict(ok=True, method='source-review', details='sem verificação automática: afirmações conferidas contra a fonte')
    errors = []
    if not options or set(options) == set():
        return dict(ok=False, method=kind, details='optionValues ausente', errors=['optionValues ausente'])

    if p.get('perOption'):
        return run_per_option(kind, p, options, correct)

    if kind == 'form':
        label, ok_num, d = verify_form(p)
        matches = [oid for oid, text in options.items() if text.strip().lower() == label.lower()]
        method = 'sympy+mpmath (forma)'
        details = f'{d}; checagem numérica {"ok" if ok_num else "DIVERGENTE"}'
        if not ok_num:
            errors.append('checagem numérica discorda do SymPy')
    elif kind == 'limit':
        truth, label, ok_num, notes = verify_limit(p, options, correct)
        matches = compare_scalar_options(truth, options, correct)
        method = 'sympy+mpmath'
        details = f'limite = {label}; checagem numérica {"ok" if ok_num else "DIVERGENTE"} ({notes})'
        if not ok_num:
            errors.append('checagem numérica discorda do SymPy')
    elif kind == 'definite':
        expr, var = parse(p['expr']), parse(p.get('var', 'x'))
        a, b = parse(p['a']), parse(p['b'])
        truth = sp.integrate(expr, (var, a, b))
        if truth.has(sp.Integral):
            errors.append('SymPy não resolveu a integral')
        f = sp.lambdify(var, expr, modules='mpmath')
        lo = -mp.inf if a == -oo else mp.mpf(str(sp.N(a, 40)))
        hi = mp.inf if b == oo else mp.mpf(str(sp.N(b, 40)))
        nv = mp.quad(f, [lo, hi])
        tv = complex(sp.N(truth, 30)) if not truth.has(sp.Integral) else None
        ok_num = tv is not None and abs(tv - complex(nv)) < 1e-7 * max(1, abs(tv))
        if not ok_num:
            errors.append(f'quadratura numérica ({nv}) discorda do SymPy ({truth})')
        matches = compare_scalar_options(truth, options, correct)
        method = 'sympy+mpmath.quad'
        details = f'valor = {truth} ≈ {sp.N(truth, 12)}; quadratura {"ok" if ok_num else "DIVERGENTE"}'
    elif kind == 'derivative':
        expr, var = parse(p['expr']), parse(p.get('var', 'x'))
        order = int(p.get('order', 1))
        truth = sp.diff(expr, var, order)
        if 'at' in p:
            at = parse(p['at'])
            truth = truth.subs(var, at)
            h = mp.mpf(10) ** -12
            fx = sp.lambdify(var, expr, modules='mpmath')
            x0 = mp.mpf(str(sp.N(at, 40)))
            num_d = mp.diff(fx, x0, order)
            ok_num = abs(complex(sp.N(truth, 30)) - complex(num_d)) < 1e-8 * max(1, abs(num_d))
            matches = compare_scalar_options(truth, options, correct)
        else:
            # derivada numérica (mpmath) em pontos de amostra
            fx = sp.lambdify(var, expr, modules='mpmath')
            ok_num = True
            for pt in SAMPLE_POINTS[:4]:
                x0 = mp.mpf(str(sp.N(pt, 40)))
                try:
                    nd = mp.diff(fx, x0, order)
                    sv = complex(sp.N(truth.subs(var, pt), 30))
                    ok_num &= abs(sv - complex(nd)) < 1e-8 * max(1, abs(sv))
                except Exception:
                    pass
            matches = []
            for oid, text in options.items():
                try:
                    g = parse(text)
                    if same_function(truth, g, var):
                        matches.append(oid)
                except Exception:
                    pass
        if not ok_num:
            errors.append('derivada numérica discorda do SymPy')
        method = 'sympy+mpmath.diff'
        details = f'derivada = {truth}; checagem numérica {"ok" if ok_num else "DIVERGENTE"}'
    elif kind == 'integral':
        # candidatos F: cada um é primitiva de expr se F' == expr (a constante C é irrelevante)
        expr, var = parse(p['expr']), parse(p.get('var', 'x'))
        sym = sp.integrate(expr, var)
        pts = [parse(q) for q in p['points']] if p.get('points') else None
        matches = []
        for oid, text in options.items():
            try:
                F = parse(text)
                dF = sp.diff(F, var)
                if same_function(dF, expr, var, points=pts):
                    matches.append(oid)
            except Exception:
                pass
        if p.get('invert'):  # "qual NÃO é primitiva": a resposta é a única alternativa que falha
            matches = [oid for oid in options if oid not in matches]
        ok_num = True
        prim_ids = [oid for oid in options if (oid not in matches)] if p.get('invert') else matches
        for oid in prim_ids:  # checagem numérica independente: diferença finita de F
            Ff = sp.lambdify(var, parse(options[oid]), modules='mpmath')
            ef = sp.lambdify(var, expr, modules='mpmath')
            for pt in (pts or SAMPLE_POINTS)[:4]:
                x0 = mp.mpf(str(sp.N(pt, 40)))
                try:
                    ok_num &= abs(mp.diff(Ff, x0) - ef(x0)) < 1e-8 * max(1, abs(ef(x0)))
                except Exception:
                    pass
        if not ok_num:
            errors.append('derivada numérica da primitiva discorda do integrando')
        method = 'sympy+mpmath.diff'
        details = f'∫ = {sym} + C; checagem numérica {"ok" if ok_num else "DIVERGENTE"}'
    elif kind == 'expr':
        truth = parse(p['expr'])
        ok_num = True
        if p.get('numeric'):
            nv = parse(p['numeric'])
            ok_num = same_value(truth, nv, 1e-7)
            if not ok_num:
                errors.append(f'verificação numérica independente ({nv}) discorda de ({truth})')
        else:
            errors.append('kind=expr exige params.numeric (checagem independente)')
            ok_num = False
        matches = []
        for oid, text in options.items():
            try:
                if text.strip().upper() == 'DNE':
                    hit = is_nan(truth)
                else:
                    hit = same_value(truth, parse(text))
            except Exception:
                hit = False
            if hit:
                matches.append(oid)
        method = 'sympy+independente'
        details = f'valor = {truth}; checagem independente {"ok" if ok_num else "AUSENTE/DIVERGENTE"}'
    elif kind == 'function':
        # a resposta correta é uma função; compara por amostragem com params.expr
        truth = parse(p['expr'])
        var = parse(p.get('var', 'x'))
        ok_num = True
        matches = []
        for oid, text in options.items():
            try:
                if same_function(truth, parse(text), var, allow_const=bool(p.get('modConst'))):
                    matches.append(oid)
            except Exception:
                pass
        method = 'sympy+amostragem'
        details = f'função de referência = {truth}'
    else:
        return dict(ok=False, method=kind, details=f'kind desconhecido: {kind}', errors=[f'kind desconhecido: {kind}'])

    if matches != [correct]:
        errors.append(f'alternativas que satisfazem a verificação: {matches or "nenhuma"} (esperado apenas {correct})')
    return dict(ok=not errors, method=method, details=details, errors=errors)


def main():
    tasks = json.load(sys.stdin)
    out = []
    for t in tasks:
        try:
            r = run(t)
        except Unsafe as e:
            r = dict(ok=False, method=t.get('kind'), details=f'expressão insegura: {e}', errors=[f'expressão insegura: {e}'])
        except Exception as e:  # noqa: BLE001
            r = dict(ok=False, method=t.get('kind'), details=f'erro: {type(e).__name__}: {e}', errors=[f'{type(e).__name__}: {e}'], trace=traceback.format_exc(limit=3))
        r['id'] = t['id']
        r.setdefault('errors', [])
        out.append(r)
    json.dump(out, sys.stdout, ensure_ascii=False)


if __name__ == '__main__':
    main()

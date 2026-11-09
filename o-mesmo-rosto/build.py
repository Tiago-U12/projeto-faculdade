#!/usr/bin/env python3
"""Gera o livro 'O Mesmo Rosto' em duas versões a partir de src/obra.txt:
web/index.html  (folhas soltas sobre uma noite de chuva)
print/print.html (páginas A5 para o PDF)
"""
import base64, html, random, re, sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).parent
FONTS = ROOT / "fontpkg/node_modules/@fontsource"

# ---------------------------------------------------------------- fontes
def font_face(family, path, weight, style):
    data = base64.b64encode((FONTS / path).read_bytes()).decode()
    return ("@font-face{font-family:'%s';src:url(data:font/woff2;base64,%s) format('woff2');"
            "font-weight:%s;font-style:%s;font-display:swap;}" % (family, data, weight, style))

FONT_CSS = "".join([
    font_face("EB Garamond", "eb-garamond/files/eb-garamond-latin-400-normal.woff2", 400, "normal"),
    font_face("EB Garamond", "eb-garamond/files/eb-garamond-latin-400-italic.woff2", 400, "italic"),
    font_face("EB Garamond", "eb-garamond/files/eb-garamond-latin-500-normal.woff2", 500, "normal"),
    font_face("IM Fell English", "im-fell-english/files/im-fell-english-latin-400-normal.woff2", 400, "normal"),
    font_face("IM Fell English", "im-fell-english/files/im-fell-english-latin-400-italic.woff2", 400, "italic"),
    font_face("Nothing You Could Do", "nothing-you-could-do/files/nothing-you-could-do-latin-400-normal.woff2", 400, "normal"),
])

# ---------------------------------------------------------------- texturas
def svg_uri(svg):
    return "url(\"data:image/svg+xml," + quote(svg, safe="/:=,'() ") + "\")"

TEX_FIBRA = svg_uri(
    "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>"
    "<filter id='f'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/>"
    "<feColorMatrix values='0 0 0 0 .30 0 0 0 0 .22 0 0 0 0 .12 0 0 0 .6 -.22'/></filter>"
    "<rect width='100%' height='100%' filter='url(#f)'/></svg>")
TEX_MANCHA = svg_uri(
    "<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640'>"
    "<filter id='m'><feTurbulence type='fractalNoise' baseFrequency='.006' numOctaves='3' seed='7' stitchTiles='stitch'/>"
    "<feColorMatrix values='0 0 0 0 .45 0 0 0 0 .31 0 0 0 0 .15 0 0 0 1.1 -.48'/></filter>"
    "<rect width='100%' height='100%' filter='url(#m)'/></svg>")

# ---------------------------------------------------------------- texto
def inline(text):
    t = html.escape(text, quote=False)
    return re.sub(r"\*(.+?)\*", r"<em>\1</em>", t)

def para(text):
    if text.startswith("— "):
        return '<p class="fala">%s</p>' % inline(text)
    if text.startswith("(") and text.endswith(")"):
        return '<p class="rubrica">%s</p>' % inline(text)
    return "<p>%s</p>" % inline(text)

def parse(src):
    blocks, cur = [], None
    for raw in src.splitlines():
        line = raw.rstrip()
        if line.startswith("@"):
            tag, _, rest = line[1:].partition(" ")
            if tag == "intro":
                cur = {"kind": "intro", "items": []}
            elif tag == "guia":
                cur = {"kind": "guia", "items": []}
            elif tag == "cap":
                roman, rain, title, sub = rest.split("|")
                cur = {"kind": "cap", "roman": roman, "rain": float(rain), "title": title, "sub": sub}
            elif tag == "frag":
                n, title = rest.split("|")
                cur = {"kind": "frag", "n": int(n), "title": title, "items": []}
            elif tag == "final":
                cur = {"kind": "final", "items": []}
            elif tag == "achado":
                cur = {"kind": "achado", "items": []}
            elif tag == "margem":
                blocks[-1]["margem"] = rest
                continue
            elif tag == "mao":
                cur["items"].append(("mao", rest))
                continue
            blocks.append(cur)
            continue
        if not line or cur is None:
            continue
        if cur["kind"] == "guia":
            label, nums = line.split("|")
            cur["items"].append((label, [int(x) for x in nums.split(",")]))
        else:
            cur.setdefault("items", []).append(("p", line))
    return blocks

BLOCKS = parse((ROOT / "src/obra.txt").read_text(encoding="utf-8"))

# chuva corrente para cada bloco
rain = 1.0
for b in BLOCKS:
    if b["kind"] == "cap":
        rain = b["rain"]
    b["rain_now"] = rain

# ---------------------------------------------------------------- decoração
FANTASMAS = {
    2: ("lista", "café\npão\npilhas AA\nleite\nligar p/ dentista\nsabão", "top:7%;right:9%;--g:5deg"),
    8: ("calendario", " D  S  T  Q  Q  S  S\n       1  2  3  4  5\n 6  7  8  9 10 11 12\n13 14 15 16 17 18 19\n20 21 22 23 24 25 26\n27 28 29 30 31", "bottom:9%;right:7%;--g:-2deg"),
    12: ("recibo", "PADARIA E MERCEARIA\nCUPOM NÃO FISCAL\n------------------------\n1 PÃO FRANCÊS KG    4,35\n1 CAFÉ 500G        18,90\n1 LEITE INT. 1L     5,49\n------------------------\nTOTAL R$           28,74", "top:34%;left:9%;--g:-3deg"),
    20: ("lista", "sáb. aniversário da tia\nbuscar remédio da vó\nlevar o bolo\nresponder o grupo", "top:38%;right:6%;--g:3deg"),
}
XICARA = {"capa": "top:-34px;right:-30px", 1: "bottom:6%;right:-26px", 34: "top:-28px;left:-34px"}
PAUTADO = {22, 33}
DOBRA = {4, 10, 16, 21, 29, 37, 38, 41}
N_FRAGS = sum(1 for b in BLOCKS if b["kind"] == "frag")
ROMANOS = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV"]

def decor(key, rain_now, kind):
    rng = random.Random("folha-%s" % key)
    out = []
    # manchas de água: mais frequentes enquanto chove mais
    n = 0
    if kind in ("frag", "cap", "capa"):
        if rng.random() < 0.65 * rain_now: n += 1
        if rng.random() < 0.30 * rain_now: n += 1
    for _ in range(n):
        size = rng.randint(70, 170)
        out.append('<i class="mancha" style="left:%d%%;top:%d%%;width:%dpx;height:%dpx;--rot:%ddeg;--a:%.2f"></i>'
                   % (rng.randint(-6, 82), rng.randint(2, 82), size, int(size * rng.uniform(.85, 1.1)),
                      rng.randint(0, 360), rng.uniform(.13, .24)))
    for _ in range(rng.randint(0, 3) if rain_now > .3 else rng.randint(0, 1)):
        s = rng.randint(5, 13)
        out.append('<i class="gota" style="left:%d%%;top:%d%%;width:%dpx;height:%dpx"></i>'
                   % (rng.randint(4, 94), rng.randint(3, 95), s, s))
    if key in XICARA:
        out.append('<i class="xicara" style="%s"></i>' % XICARA[key])
    if key in FANTASMAS:
        kind_g, text, pos = FANTASMAS[key]
        out.append('<div class="fantasma %s" style="%s" aria-hidden="true">%s</div>'
                   % (kind_g, pos, html.escape(text)))
    return "".join(out)

def classes(key):
    c = []
    if key in PAUTADO: c.append("pautado")
    if key in DOBRA: c.append("dobra")
    return " ".join(c)

def clip(rng):
    pts, steps = [], 12
    for i in range(steps + 1):
        pts.append("%.1f%% %.1fpx" % (i / steps * 100, rng.uniform(0, 5)))
    for i in range(1, steps + 1):
        pts.append("calc(100%% - %.1fpx) %.1f%%" % (rng.uniform(0, 4), i / steps * 100))
    for i in range(steps - 1, -1, -1):
        pts.append("%.1f%% calc(100%% - %.1fpx)" % (i / steps * 100, rng.uniform(0, 5)))
    for i in range(steps - 1, 0, -1):
        pts.append("%.1fpx %.1f%%" % (rng.uniform(0, 4), i / steps * 100))
    return "polygon(%s)" % ",".join(pts)

def leaf_style(key):
    rng = random.Random("forma-%s" % key)
    return "--r:%.2fdeg;--clip:%s" % (rng.uniform(-0.9, 0.9), clip(rng))

def rain_marks(rain_now):
    n = max(1, round(rain_now * 9))
    w = 14 + (n - 1) * 11
    rng = random.Random("marca-%d" % n)
    segs = []
    for i in range(n):
        y1 = rng.uniform(1, 9); ln = rng.uniform(9, 16); x1 = 9 + i * 11
        segs.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/>' % (x1, y1, x1 - ln * .22, y1 + ln))
    lines = "".join(segs)
    return ('<svg class="chuva-marca" width="%d" height="26" viewBox="0 0 %d 26" aria-hidden="true">%s</svg>'
            % (w, w, lines))

PAPERCLIP = ('<svg class="clipe" width="22" height="64" viewBox="0 0 22 64" aria-hidden="true">'
             '<path d="M7 18 V48 a4 4 0 0 0 8 0 V10 a6 6 0 0 0 -12 0 V50 a8 8 0 0 0 16 0 V20" '
             'fill="none" stroke="#8a8f96" stroke-width="2" stroke-linecap="round"/></svg>')

# ---------------------------------------------------------------- blocos (conteúdo comum)
def frag_header(b):
    return ('<header class="cab"><span class="n">%d</span><h3 id="t%d">%s</h3></header>'
            % (b["n"], b["n"], inline(b["title"])))

def body_items(b):
    out = []
    for kind, text in b.get("items", []):
        if kind == "mao":
            out.append('<p class="mao">%s</p>' % inline(text))
        else:
            out.append(para(text))
    if b.get("margem"):
        out.append('<p class="margem">%s</p>' % inline(b["margem"]))
    return out

def guia_items(b, chip_cls="chip"):
    rows = []
    for label, nums in b["items"]:
        chips = "".join('<a class="%s" href="#f%d" data-ir="f%d">%d</a>' % (chip_cls, n, n, n) for n in nums)
        rows.append('<li><span class="estado">%s</span><span class="chips">%s</span></li>' % (inline(label), chips))
    return '<ul class="guia">%s</ul>' % "".join(rows)

def cap_id(b):
    return "cap-" + (str(ROMANOS.index(b["roman"]) + 1) if b["roman"] else "fim")

# ================================================================ WEB
def web():
    parts = []
    # capa
    parts.append('<section class="trecho" data-rain="1">')
    parts.append(
        '<article class="folha capa" id="capa" style="%s"><div class="papel">%s<div class="texto">'
        '<h1>O Mesmo Rosto</h1><p class="sub">fragmentos para as noites em que chove por dentro</p>%s'
        '<p class="ficha">manuscrito sem nome &middot; %d fragmentos</p></div></div></article>'
        % (leaf_style("capa"), decor("capa", 1.0, "capa"), rain_marks(1.0), N_FRAGS))
    open_section = True
    for b in BLOCKS:
        k = b["kind"]
        if k == "intro":
            parts.append(
                '<article class="folha bilhete" id="antes" style="--r:-0.6deg"><div class="papel">%s<div class="texto">'
                '<p class="rotulo">nota do copista</p><h2>Antes de abrir</h2>%s</div></div></article>'
                % (PAPERCLIP, "".join(body_items(b))))
        elif k == "guia":
            parts.append(
                '<article class="folha bilhete" id="guia" style="--r:0.5deg"><div class="papel">%s<div class="texto">'
                '<p class="rotulo">do copista</p><h2>Para noites difíceis</h2>'
                '<p>Os números são dos fragmentos. Toque no que parecer mais perto desta noite.</p>%s</div></div></article>'
                % (PAPERCLIP, guia_items(b)))
        elif k == "cap":
            if open_section:
                parts.append("</section>")
            parts.append('<section class="trecho" data-rain="%s">' % b["rain"])
            roman = b["roman"] or "&#8258;"
            parts.append(
                '<article class="folha capitulo" id="%s" style="%s"><div class="papel">%s<div class="texto">'
                '<p class="romano">%s</p><h2>%s</h2><p class="sub">%s</p>%s</div></div></article>'
                % (cap_id(b), leaf_style(cap_id(b)), decor(cap_id(b), b["rain_now"], "cap"),
                   roman, inline(b["title"]), inline(b["sub"]), rain_marks(b["rain_now"])))
            open_section = True
        elif k == "frag":
            n = b["n"]
            dialog = " dialogo" if sum(1 for t, x in b["items"] if x.startswith("— ")) > 3 else ""
            parts.append(
                '<article class="folha fragmento %s%s" id="f%d" style="%s"><div class="papel">%s<div class="texto">%s%s</div></div></article>'
                % (classes(n), dialog, n, leaf_style(n), decor(n, b["rain_now"], "frag"),
                   frag_header(b), "".join(body_items(b))))
        elif k == "final":
            parts.append(
                '<article class="folha bilhete final" id="fim" style="--r:-0.4deg"><div class="papel">%s<div class="texto">'
                '<p class="rotulo">nota do copista</p>%s</div></div></article>'
                % (PAPERCLIP, "".join(body_items(b))))
        elif k == "achado":
            parts.append(
                '<article class="folha bilhete" id="achado" style="--r:0.7deg"><div class="papel">%s<div class="texto">'
                '<p class="rotulo">nota do copista</p><h2>Folhas achadas depois</h2>%s</div></div></article>'
                % (PAPERCLIP, "".join(body_items(b))))
    parts.append("</section>")

    # sumário (gaveta)
    toc = []
    cur = None
    notas = {"final": ("fim", "Nota final do copista"), "achado": ("achado", "Folhas achadas depois")}
    for b in BLOCKS:
        if b["kind"] in notas:
            if cur is not None:
                toc.append("</ol></li>")
                cur = None
            nid, nome = notas[b["kind"]]
            toc.append('<li><a class="cap-link" href="#%s" data-ir="%s">%s</a></li>' % (nid, nid, nome))
        elif b["kind"] == "cap":
            if cur is not None:
                toc.append("</ol></li>")
            label = (b["roman"] + " &middot; ") if b["roman"] else ""
            toc.append('<li><a class="cap-link" href="#%s" data-ir="%s">%s%s</a><ol>'
                       % (cap_id(b), cap_id(b), label, inline(b["title"])))
            cur = b
        elif b["kind"] == "frag":
            toc.append('<li><a href="#f%d" data-ir="f%d"><span class="tn">%d</span>%s</a></li>'
                       % (b["n"], b["n"], b["n"], inline(b["title"])))
    if cur is not None:
        toc.append("</ol></li>")
    guia_block = next(b for b in BLOCKS if b["kind"] == "guia")

    page = WEB_TEMPLATE
    page = page.replace("/*FONTS*/", FONT_CSS)
    page = page.replace("__FIBRA__", TEX_FIBRA).replace("__MANCHA__", TEX_MANCHA)
    page = page.replace("<!--LIVRO-->", "\n".join(parts))
    page = page.replace("<!--GUIA-->", guia_items(guia_block, "chip claro"))
    page = page.replace("<!--SUMARIO-->", "".join(toc))
    return page

WEB_TEMPLATE = r"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>O Mesmo Rosto</title>
<style>
:root{
  /* layout: uma pilha vertical de folhas soltas, levemente tortas, sobre uma noite de chuva */
  --noite:#11161c;
  --nevoa:#aebfcf;
  --papel:#e8d9ba;
  --tinta:#2a2017;
  --tinta-gasta:#6b5944;
  --caneta:#2b3d66;
  --bilhete:#eeebe3;
  --display:"IM Fell English","EB Garamond",Georgia,serif;
  --corpo:"EB Garamond",Georgia,"Times New Roman",serif;
  --mao:"Nothing You Could Do","Bradley Hand","Segoe Script",cursive;
  --fibra:__FIBRA__;
  --manchas:__MANCHA__;
  color-scheme:dark;
}
/*FONTS*/
*{box-sizing:border-box}
html,body{margin:0;background:var(--noite)}
body{color:var(--papel);font-family:var(--corpo);-webkit-font-smoothing:antialiased;overflow-x:hidden}
.janela{position:fixed;inset:0;z-index:0;pointer-events:none;background:
  radial-gradient(42vmax 30vmax at 10% 16%,rgba(200,150,80,.11),transparent 62%),
  radial-gradient(30vmax 26vmax at 90% 28%,rgba(120,150,195,.11),transparent 62%),
  radial-gradient(36vmax 22vmax at 72% 94%,rgba(175,120,65,.08),transparent 62%),
  linear-gradient(180deg,#0c1015 0%,#141b22 55%,#0f1419 100%)}
#chuva{position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}
main{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;
  gap:clamp(44px,9vw,80px);padding:clamp(28px,7vw,72px) 16px 150px}
.trecho{display:contents}

/* ---------- a folha */
.folha{position:relative;width:min(100%,640px);transform:rotate(var(--r,0deg));
  filter:drop-shadow(0 16px 22px rgba(0,0,0,.5)) drop-shadow(0 2px 3px rgba(0,0,0,.45));scroll-margin-top:28px}
.papel{position:relative;isolation:isolate;overflow:hidden;clip-path:var(--clip,none);color:var(--tinta);
  background:var(--fibra),var(--manchas),
    radial-gradient(120% 85% at 50% 38%,rgba(255,250,236,.55),rgba(255,250,236,0) 62%),var(--papel);
  box-shadow:inset 0 0 70px rgba(122,84,38,.40),inset 0 0 14px rgba(92,62,26,.45);
  padding:clamp(38px,8vw,66px) clamp(24px,7vw,62px) clamp(44px,8vw,66px)}
.texto{position:relative;z-index:2}
.papel p{font-size:clamp(18.5px,.9vw + 14.5px,20.5px);line-height:1.62;margin:0 0 .95em;text-wrap:pretty;
  text-shadow:0 0 .6px rgba(42,32,23,.45)}
.papel p:last-child{margin-bottom:0}
.papel em{font-style:italic}
.dialogo .fala{margin-bottom:.5em}
.rubrica{font-style:italic;color:var(--tinta-gasta);padding-left:1.4em;margin:1.1em 0 !important}

.cab{display:flex;align-items:baseline;gap:.7em;margin:0 0 1.5em;padding-bottom:.9em;
  border-bottom:1px solid rgba(107,89,68,.28)}
.cab .n{font-family:var(--display);font-size:clamp(26px,3vw,32px);line-height:1;color:var(--tinta-gasta);min-width:1.1em}
.cab h3{font-family:var(--display);font-style:italic;font-weight:400;font-size:clamp(24px,2.4vw + 14px,31px);
  line-height:1.15;margin:0;color:var(--tinta);text-wrap:balance}

.margem{font-family:var(--mao) !important;color:var(--caneta);font-size:clamp(22px,2vw + 14px,27px) !important;
  line-height:1.3 !important;transform:rotate(-3deg);transform-origin:right center;width:fit-content;max-width:82%;
  margin:1.8em 0 .2em auto !important;text-align:right;text-shadow:0 0 .5px rgba(43,61,102,.5) !important;opacity:.9}

/* ---------- capa e capítulos */
.capa .papel,.capitulo .papel{text-align:center;padding-top:clamp(70px,14vw,120px);padding-bottom:clamp(64px,13vw,110px)}
.capa h1{font-family:var(--display);font-weight:400;font-size:clamp(44px,8vw,66px);line-height:1.02;margin:0 0 .35em;
  letter-spacing:.01em;text-wrap:balance}
.capa .sub,.capitulo .sub{font-style:italic;color:var(--tinta-gasta);max-width:24em;margin:0 auto 1.6em;text-wrap:balance}
.capa .ficha{font-variant:small-caps;letter-spacing:.12em;font-size:16px !important;color:var(--tinta-gasta);margin-top:1.6em}
.romano{font-family:var(--display);font-size:clamp(76px,16vw,116px) !important;line-height:1 !important;margin:0 0 .15em !important;color:var(--tinta)}
.capitulo h2{font-family:var(--display);font-weight:400;font-size:clamp(30px,5vw,42px);line-height:1.1;margin:0 0 .4em;text-wrap:balance}
.chuva-marca{display:block;margin:0 auto;stroke:var(--tinta-gasta);stroke-width:1.1;stroke-linecap:round;opacity:.6}

/* ---------- bilhetes do copista */
.bilhete .papel{clip-path:none;padding-top:clamp(46px,9vw,64px);
  background:var(--fibra),linear-gradient(180deg,#f2f0ea,#e9e5db),var(--bilhete);
  box-shadow:inset 0 0 40px rgba(120,110,90,.18)}
.bilhete .papel p{font-size:clamp(17.5px,.8vw + 14px,19px);color:#2c2a27;text-shadow:none}
.bilhete h2{font-family:var(--display);font-weight:400;font-size:clamp(28px,4vw,36px);margin:0 0 .8em;color:#2c2a27}
.rotulo{font-variant:small-caps;letter-spacing:.14em;color:#7b766c !important;font-size:15px !important;margin:0 0 .3em !important}
.clipe{position:absolute;top:-14px;left:34px;z-index:3}
.mao{font-family:var(--mao) !important;color:var(--caneta) !important;font-size:clamp(25px,2vw + 17px,30px) !important;
  line-height:1.3 !important;transform:rotate(-2deg);margin:1em 0 1.1em !important;padding-left:.6em}
.guia{list-style:none;margin:1.4em 0 0;padding:0;display:grid;gap:14px}
.guia li{display:grid;gap:6px}
.estado{font-style:italic;font-size:18px;color:#2c2a27}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-grid;place-items:center;min-width:40px;height:40px;padding:0 8px;border-radius:999px;
  border:1px solid rgba(44,42,39,.35);font-family:var(--display);font-size:19px;color:#2c2a27;text-decoration:none;
  background:rgba(255,255,255,.35)}
.chip:hover{background:rgba(43,61,102,.10);border-color:var(--caneta)}
.chip:focus-visible,.controles button:focus-visible,.gaveta a:focus-visible,.gaveta button:focus-visible{
  outline:2px solid #c9a86a;outline-offset:2px}

/* ---------- marcas do papel */
.mancha,.gota,.xicara{position:absolute;z-index:1;pointer-events:none;mix-blend-mode:multiply}
.mancha{border-radius:46% 54% 51% 49%/53% 46% 54% 47%;transform:rotate(var(--rot));
  background:radial-gradient(closest-side,rgba(150,110,60,calc(var(--a)*.25)) 0 70%,rgba(128,88,42,var(--a)) 86%,
    rgba(128,88,42,calc(var(--a)*.35)) 93%,rgba(128,88,42,0) 100%)}
.gota{border-radius:50%;background:radial-gradient(closest-side,rgba(140,100,55,.10) 0 55%,rgba(110,75,35,.32) 80%,rgba(110,75,35,0) 100%)}
.xicara{width:150px;height:150px;border-radius:50%;
  background:radial-gradient(closest-side,transparent 0 84%,rgba(105,66,30,.30) 88%,rgba(105,66,30,.12) 92%,
    transparent 95%);-webkit-mask-image:conic-gradient(from 30deg,#000 0 64%,transparent 72% 84%,#000 92%);mask-image:conic-gradient(from 30deg,#000 0 64%,transparent 72% 84%,#000 92%)}
.dobra .papel::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:
  linear-gradient(90deg,transparent calc(50% - 1px),rgba(90,60,25,.16) 50%,rgba(255,252,240,.45) calc(50% + 1px),transparent calc(50% + 3px)),
  linear-gradient(180deg,transparent calc(50% - 1px),rgba(90,60,25,.14) 50%,rgba(255,252,240,.4) calc(50% + 1px),transparent calc(50% + 3px)),
  linear-gradient(90deg,rgba(80,50,20,.035) 0 50%,rgba(255,255,255,.03) 50%)}
.pautado .papel::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background:
  linear-gradient(90deg,transparent 46px,rgba(170,70,70,.20) 46px,rgba(170,70,70,.20) 47px,transparent 47px),
  repeating-linear-gradient(180deg,transparent 0 31px,rgba(70,100,150,.14) 31px 32px)}
.fantasma{position:absolute;z-index:0;pointer-events:none;white-space:pre;transform:scaleX(-1) rotate(var(--g,0deg));
  filter:blur(.55px);opacity:.10;line-height:1.45}
.fantasma.lista{font-family:var(--mao);font-size:26px;color:#1f2f55;opacity:.11}
.fantasma.recibo,.fantasma.calendario{font-family:"Courier New",Courier,monospace;font-size:14px;color:#1c1712}
.fantasma.calendario{font-size:16px;opacity:.09}

/* ---------- controles e sumário */
.controles{position:fixed;z-index:6;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));
  display:flex;gap:8px}
.controles button,.gaveta .fechar{font:500 16px/1 var(--corpo);color:var(--papel);background:rgba(17,22,28,.78);
  border:1px solid rgba(232,217,186,.28);border-radius:999px;padding:11px 16px;cursor:pointer;
  backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.controles{transition:transform .35s ease,opacity .35s ease}
.controles.oculto{transform:translateY(140%);opacity:0}
.controles button:hover{border-color:rgba(232,217,186,.6)}
.veu{position:fixed;inset:0;z-index:8;background:rgba(6,9,12,.55);display:none}
.veu.aberto{display:block}
.gaveta{position:absolute;top:0;right:0;bottom:0;width:min(440px,100%);overflow-y:auto;background:#141b22;
  border-left:1px solid rgba(232,217,186,.14);padding:26px 22px calc(40px + env(safe-area-inset-bottom));
  box-shadow:-20px 0 40px rgba(0,0,0,.4)}
.gaveta-topo{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}
.gaveta h2{font-family:var(--display);font-weight:400;font-size:26px;margin:0;color:var(--papel)}
.gaveta h3{font-family:var(--display);font-weight:400;font-size:21px;margin:30px 0 4px;color:var(--papel)}
.gaveta .estado{color:#cdbf9f}
.chip.claro{color:var(--papel);border-color:rgba(232,217,186,.32);background:rgba(232,217,186,.05)}
.chip.claro:hover{background:rgba(232,217,186,.14)}
.sumario,.sumario ol{list-style:none;margin:0;padding:0}
.sumario>li{margin-top:16px}
.sumario a{display:flex;gap:10px;color:#d8cbb0;text-decoration:none;padding:7px 0;font-size:18px;line-height:1.3}
.sumario a:hover{color:#fff4dc}
.sumario .cap-link{font-family:var(--display);font-size:19px;color:var(--papel);border-bottom:1px solid rgba(232,217,186,.14)}
.sumario .tn{font-family:var(--display);color:#9d8f74;min-width:1.6em;text-align:right;font-variant-numeric:tabular-nums}

@media (max-width:520px){
  .folha{transform:rotate(calc(var(--r,0deg) * .5))}
  .xicara{width:118px;height:118px}
  .fantasma.lista{font-size:21px}
  .fantasma.recibo{font-size:11.5px}
  .fantasma.calendario{font-size:13px}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
</head>
<body>
<div class="janela" aria-hidden="true"></div>
<canvas id="chuva" aria-hidden="true"></canvas>
<main>
<!--LIVRO-->
</main>
<nav class="controles" aria-label="Leitura">
  <button type="button" id="abrir-sumario" aria-haspopup="dialog" aria-controls="veu">Sumário</button>
  <button type="button" id="alternar-chuva" aria-pressed="true">Parar a chuva</button>
</nav>
<div class="veu" id="veu">
  <div class="gaveta" role="dialog" aria-modal="true" aria-labelledby="gaveta-titulo">
    <div class="gaveta-topo"><h2 id="gaveta-titulo">Sumário</h2><button type="button" class="fechar" id="fechar-sumario">Fechar</button></div>
    <h3>Para noites difíceis</h3>
    <!--GUIA-->
    <h3>Folhas</h3>
    <ol class="sumario">
      <li><a class="cap-link" href="#capa" data-ir="capa">Capa</a></li>
      <li><a class="cap-link" href="#antes" data-ir="antes">Antes de abrir</a></li>
      <!--SUMARIO-->
    </ol>
  </div>
</div>
<script>
(function(){
  // ---------- navegação
  var veu = document.getElementById('veu');
  var abrir = document.getElementById('abrir-sumario');
  function fecharSumario(){ veu.classList.remove('aberto'); abrir.focus(); }
  abrir.addEventListener('click', function(){ veu.classList.add('aberto'); document.getElementById('fechar-sumario').focus(); });
  document.getElementById('fechar-sumario').addEventListener('click', fecharSumario);
  veu.addEventListener('click', function(e){ if (e.target === veu) fecharSumario(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && veu.classList.contains('aberto')) fecharSumario(); });
  function ir(id, suave){
    var alvo = document.getElementById(id); if (!alvo) return;
    var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    alvo.scrollIntoView({behavior: (suave && !reduz) ? 'smooth' : 'auto', block: 'start'});
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest('a[data-ir]'); if (!a) return;
    e.preventDefault();
    var dentro = veu.classList.contains('aberto');
    if (dentro) veu.classList.remove('aberto');
    ir(a.getAttribute('data-ir'), !dentro);
  });
  function pelaHash(){ var h = (location.hash || '').slice(1); if (h && /^[a-z0-9-]+$/.test(h)) ir(h, false); }
  window.addEventListener('hashchange', pelaHash);
  if (location.hash) setTimeout(pelaHash, 60);

  // ---------- chuva
  var cv = document.getElementById('chuva'), cx = cv.getContext('2d');
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1, gotas = [], alvo = 1, atual = 1, ligada = true, ultimo = 0, raf = 0;
  function novaGota(g, topo){
    g.x = Math.random() * (W + 120) - 60;
    g.y = topo ? -Math.random() * 60 - 20 : Math.random() * H;
    g.c = 10 + Math.random() * 20;
    g.v = 520 + Math.random() * 520;
    g.a = .07 + Math.random() * .2;
    g.l = .6 + Math.random() * .7;
    return g;
  }
  function medir(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var max = Math.min(420, Math.round(W * H / 3200));
    while (gotas.length < max) gotas.push(novaGota({}, false));
    gotas.length = max;
  }
  function desenhar(dt){
    cx.clearRect(0, 0, W, H);
    var n = Math.round(gotas.length * atual);
    cx.lineCap = 'round';
    for (var i = 0; i < n; i++){
      var g = gotas[i];
      if (dt){ g.y += g.v * dt; g.x += g.v * .16 * dt; if (g.y - g.c > H) novaGota(g, true); }
      cx.strokeStyle = 'rgba(174,191,207,' + g.a + ')';
      cx.lineWidth = g.l;
      cx.beginPath(); cx.moveTo(g.x, g.y); cx.lineTo(g.x - g.c * .16, g.y - g.c); cx.stroke();
    }
  }
  function passo(t){
    var dt = ultimo ? Math.min((t - ultimo) / 1000, .05) : 0; ultimo = t;
    atual += (alvo - atual) * Math.min(1, dt * 1.2);
    desenhar(dt);
    raf = requestAnimationFrame(passo);
  }
  function iniciar(){ if (!ligada || reduz || raf) return; ultimo = 0; raf = requestAnimationFrame(passo); }
  function parar(){ if (raf) cancelAnimationFrame(raf); raf = 0; }
  var trechos = [].slice.call(document.querySelectorAll('[data-rain]'));
  function lerChuva(){
    var meio = window.innerHeight * .5, v = 1;
    for (var i = 0; i < trechos.length; i++){
      var primeiro = trechos[i].firstElementChild;
      if (primeiro && primeiro.getBoundingClientRect().top < meio) v = parseFloat(trechos[i].getAttribute('data-rain'));
    }
    alvo = v;
    if (reduz && ligada){ atual = v; desenhar(0); }
  }
  var agendado = false;
  var nav = document.querySelector('.controles'), yAnt = window.scrollY;
  window.addEventListener('scroll', function(){
    var y = window.scrollY;
    if (Math.abs(y - yAnt) > 12){ nav.classList.toggle('oculto', y > yAnt && y > 240); yAnt = y; }
  }, {passive: true});
  nav.addEventListener('focusin', function(){ nav.classList.remove('oculto'); });
  window.addEventListener('scroll', function(){ if (agendado) return; agendado = true;
    requestAnimationFrame(function(){ agendado = false; lerChuva(); }); }, {passive: true});
  window.addEventListener('resize', function(){ medir(); if (!raf && ligada) desenhar(0); });
  document.addEventListener('visibilitychange', function(){ if (document.hidden) parar(); else iniciar(); });
  var botao = document.getElementById('alternar-chuva');
  botao.addEventListener('click', function(){
    ligada = !ligada;
    botao.setAttribute('aria-pressed', String(ligada));
    botao.textContent = ligada ? 'Parar a chuva' : 'Deixar chover';
    if (ligada){ if (reduz) desenhar(0); else iniciar(); } else { parar(); cx.clearRect(0, 0, W, H); }
  });
  medir(); lerChuva(); atual = alvo; desenhar(0); iniciar();
})();
</script>
</body>
</html>
"""

# ================================================================ PRINT
def print_html():
    src = []
    src.append('<div class="bloco capa-p" data-kind="capa" data-rain="1"><div class="decor">%s</div><div class="corpo">'
               '<h1>O Mesmo Rosto</h1><p class="sub">fragmentos para as noites em que chove por dentro</p>%s'
               '<p class="ficha">manuscrito sem nome &middot; %d fragmentos</p></div></div>'
               % (decor("capa", 1.0, "capa"), rain_marks(1.0), N_FRAGS))
    for b in BLOCKS:
        k = b["kind"]
        if k == "intro":
            src.append('<div class="bloco bilhete-p" data-kind="bilhete" data-rain="0"><div class="decor"></div><div class="corpo">'
                       '<p class="rotulo">nota do copista</p><h2 id="antes">Antes de abrir</h2>%s</div></div>'
                       % "".join(body_items(b)))
        elif k == "guia":
            src.append('<div class="bloco bilhete-p" data-kind="bilhete" data-rain="0"><div class="decor"></div><div class="corpo">'
                       '<p class="rotulo">do copista</p><h2 id="guia">Para noites difíceis</h2>'
                       '<p>Os números são dos fragmentos.</p>%s</div></div>' % "".join(
                           '<p class="guia-p"><span>%s</span><i></i><b>%s</b></p>' % (inline(lb), ", ".join(
                               '<a href="#f%d">%d</a>' % (n, n) for n in ns)) for lb, ns in b["items"]))
            # sumário com números de página preenchidos depois da paginação
            rows = ['<p class="rotulo">do copista</p><h2>Sumário</h2>']
            for c in BLOCKS:
                if c["kind"] == "cap":
                    label = (c["roman"] + " &middot; ") if c["roman"] else ""
                    rows.append('<p class="toc toc-cap"><a href="#%s"><span>%s%s</span><i></i><b data-pg="%s">00</b></a></p>'
                                % (cap_id(c), label, inline(c["title"]), cap_id(c)))
                elif c["kind"] == "achado":
                    rows.append('<p class="toc toc-cap"><a href="#achado"><span>Folhas achadas depois</span><i></i><b data-pg="achado">00</b></a></p>')
                elif c["kind"] == "frag":
                    rows.append('<p class="toc"><a href="#f%d"><span>%d. %s</span><i></i><b data-pg="f%d">00</b></a></p>'
                                % (c["n"], c["n"], inline(c["title"]), c["n"]))
            src.append('<div class="bloco bilhete-p" data-kind="bilhete" data-rain="0"><div class="decor"></div><div class="corpo">%s</div></div>'
                       % "".join(rows))
        elif k == "cap":
            roman = b["roman"] or "&#8258;"
            src.append('<div class="bloco cap-p" data-kind="cap" data-rain="%s"><div class="decor">%s</div><div class="corpo">'
                       '<p class="romano" id="%s">%s</p><h2>%s</h2><p class="sub">%s</p>%s</div></div>'
                       % (b["rain_now"], decor(cap_id(b), b["rain_now"], "cap"), cap_id(b), roman,
                          inline(b["title"]), inline(b["sub"]), rain_marks(b["rain_now"])))
        elif k == "frag":
            n = b["n"]
            dialog = " dialogo" if sum(1 for t, x in b["items"] if x.startswith("— ")) > 3 else ""
            head = frag_header(b).replace('<header class="cab">', '<header class="cab" id="f%d">' % n)
            src.append('<div class="bloco frag-p %s%s" data-kind="frag" data-rain="%s"><div class="decor">%s</div><div class="corpo">%s%s</div></div>'
                       % (classes(n), dialog, b["rain_now"], decor(n, b["rain_now"], "frag"), head, "".join(body_items(b))))
        elif k == "final":
            src.append('<div class="bloco bilhete-p" data-kind="bilhete" data-rain="0"><div class="decor"></div><div class="corpo">'
                       '<p class="rotulo" id="fim">nota do copista</p>%s</div></div>' % "".join(body_items(b)))
        elif k == "achado":
            src.append('<div class="bloco bilhete-p" data-kind="bilhete" data-rain="0"><div class="decor"></div><div class="corpo">'
                       '<p class="rotulo">nota do copista</p><h2 id="achado">Folhas achadas depois</h2>%s</div></div>'
                       % "".join(body_items(b)))
    page = PRINT_TEMPLATE.replace("/*FONTS*/", FONT_CSS)
    for ph, name in (("__PAPEL__", "papel.jpg"), ("__BILHETE__", "bilhete.jpg")):
        page = page.replace(ph, "data:image/jpeg;base64," + base64.b64encode((ROOT / "print" / name).read_bytes()).decode())
    page = page.replace("__FIBRA__", TEX_FIBRA).replace("__MANCHA__", TEX_MANCHA)
    page = page.replace("<!--FONTE-->", "\n".join(src))
    return page

PRINT_TEMPLATE = r"""<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>O Mesmo Rosto</title>
<style>
:root{--papel:#e8d9ba;--tinta:#2a2017;--tinta-gasta:#6b5944;--caneta:#2b3d66;
  --display:"IM Fell English","EB Garamond",Georgia,serif;--corpo:"EB Garamond",Georgia,serif;
  --mao:"Nothing You Could Do",cursive;--fibra:__FIBRA__;--manchas:__MANCHA__}
/*FONTS*/
@page{size:148mm 210mm;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--papel);-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:var(--corpo);color:var(--tinta)}
#fonte{position:absolute;left:-9999px;top:0;width:148mm}
.pagina{position:relative;width:148mm;height:210mm;overflow:hidden;break-after:page;page-break-after:always;
  background:url(__PAPEL__) center/100% 100% no-repeat,var(--papel)}
.pagina:last-child{break-after:auto}
.pagina.bilhete{background:url(__BILHETE__) center/100% 100% no-repeat,#eeebe3}
.corpo{position:absolute;left:19mm;right:17mm;top:24mm;bottom:24mm;overflow:hidden;z-index:2}
.pagina.primeira.frag .corpo{top:34mm}
.corpo.apertado{bottom:16mm}
.corpo.apertado p{margin-bottom:.6em;line-height:1.5}
.corpo.apertado .margem{margin-top:4mm}
.pagina.capa .corpo,.pagina.cap .corpo{display:flex;flex-direction:column;justify-content:center;text-align:center;top:20mm;bottom:28mm}
.folio{position:absolute;bottom:11mm;left:0;right:0;text-align:center;font-family:var(--display);font-size:9.5pt;color:var(--tinta-gasta);z-index:2}
p{font-size:11.2pt;line-height:1.56;margin:0 0 .85em;text-wrap:pretty;orphans:2;widows:2}
em{font-style:italic}
.dialogo .fala{margin-bottom:.45em}
.rubrica{font-style:italic;color:var(--tinta-gasta);padding-left:1.4em;margin:1em 0}
.cab{display:flex;align-items:baseline;gap:3mm;margin:0 0 6mm;padding-bottom:3mm;border-bottom:.3mm solid rgba(107,89,68,.3)}
.cab .n{font-family:var(--display);font-size:17pt;line-height:1;color:var(--tinta-gasta)}
.cab h3{font-family:var(--display);font-style:italic;font-weight:400;font-size:16.5pt;line-height:1.15;margin:0}
.margem{font-family:var(--mao);color:var(--caneta);font-size:14.5pt;line-height:1.3;transform:rotate(-3deg);
  transform-origin:right center;width:fit-content;max-width:82%;margin:7mm 0 1mm auto;text-align:right;opacity:.9}
.mao{font-family:var(--mao);color:var(--caneta);font-size:16pt;line-height:1.3;transform:rotate(-2deg);margin:5mm 0 6mm;padding-left:3mm}
h1{font-family:var(--display);font-weight:400;font-size:34pt;line-height:1.02;margin:0 0 4mm}
.sub{font-style:italic;color:var(--tinta-gasta);margin:0 auto 7mm;max-width:80mm}
.ficha{font-variant:small-caps;letter-spacing:.12em;font-size:10pt;color:var(--tinta-gasta);margin-top:8mm}
.romano{font-family:var(--display);font-size:64pt;line-height:1;margin:0 0 2mm}
.pagina.cap h2{font-family:var(--display);font-weight:400;font-size:22pt;line-height:1.1;margin:0 0 3mm}
.chuva-marca{display:block;margin:0 auto;stroke:var(--tinta-gasta);stroke-width:1.1;stroke-linecap:round;opacity:.6}
.pagina.bilhete p{color:#2c2a27;font-size:10.8pt}
.pagina.bilhete h2{font-family:var(--display);font-weight:400;font-size:19pt;margin:0 0 5mm;color:#2c2a27}
.rotulo{font-variant:small-caps;letter-spacing:.14em;color:#7b766c !important;font-size:9.5pt !important;margin:0 0 1mm !important}
.guia{list-style:none;margin:4mm 0 0;padding:0}
.guia li{margin:0 0 3mm}
.estado{font-style:italic;font-size:10.8pt;display:block}
.chips{display:flex;gap:2mm;margin-top:1mm}
.chip{display:inline-block;min-width:7mm;text-align:center;border:.25mm solid rgba(44,42,39,.35);border-radius:4mm;
  padding:.4mm 1.6mm;font-family:var(--display);font-size:10pt;color:#2c2a27;text-decoration:none}
.guia-p{display:flex;align-items:baseline;gap:2mm;margin:0 0 2.6mm;font-size:10.6pt;line-height:1.35}
.guia-p span{font-style:italic;max-width:82mm}
.guia-p i{flex:1;border-bottom:.25mm dotted rgba(44,42,39,.4);transform:translateY(-1mm);min-width:6mm}
.guia-p b{font-weight:400;font-family:var(--display);white-space:nowrap}
.guia-p b a{color:#2c2a27;text-decoration:none}
.toc{margin:0 0 1.3mm;font-size:10pt;line-height:1.35}
.toc a{display:flex;align-items:baseline;gap:2mm;color:#2c2a27;text-decoration:none}
.toc span{flex:none;max-width:90mm}
.toc i{flex:1;border-bottom:.25mm dotted rgba(44,42,39,.4);transform:translateY(-1mm)}
.toc b{font-weight:400;font-family:var(--display);font-variant-numeric:tabular-nums}
.toc-cap{margin-top:3mm;font-family:var(--display);font-size:10.8pt}
.decor{position:absolute;inset:0;z-index:1}
.mancha,.gota,.xicara{position:absolute;pointer-events:none}
.mancha{border-radius:46% 54% 51% 49%/53% 46% 54% 47%;transform:rotate(var(--rot));
  background:radial-gradient(closest-side,rgba(150,110,60,calc(var(--a)*.25)) 0 70%,rgba(128,88,42,var(--a)) 86%,
    rgba(128,88,42,calc(var(--a)*.35)) 93%,rgba(128,88,42,0) 100%)}
.gota{border-radius:50%;background:radial-gradient(closest-side,rgba(140,100,55,.10) 0 55%,rgba(110,75,35,.32) 80%,rgba(110,75,35,0) 100%)}
.xicara{width:150px;height:150px;border-radius:50%;
  background:radial-gradient(closest-side,transparent 0 84%,rgba(105,66,30,.30) 88%,rgba(105,66,30,.12) 92%,transparent 95%);-webkit-mask-image:conic-gradient(from 30deg,#000 0 64%,transparent 72% 84%,#000 92%);mask-image:conic-gradient(from 30deg,#000 0 64%,transparent 72% 84%,#000 92%)}
.pagina.dobra::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:
  linear-gradient(90deg,transparent calc(50% - 1px),rgba(90,60,25,.15) 50%,rgba(255,252,240,.45) calc(50% + 1px),transparent calc(50% + 3px)),
  linear-gradient(180deg,transparent calc(50% - 1px),rgba(90,60,25,.13) 50%,rgba(255,252,240,.4) calc(50% + 1px),transparent calc(50% + 3px))}
.pagina.pautado::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background:
  linear-gradient(90deg,transparent 14mm,rgba(170,70,70,.2) 14mm,rgba(170,70,70,.2) 14.3mm,transparent 14.3mm),
  repeating-linear-gradient(180deg,transparent 0 6.6mm,rgba(70,100,150,.14) 6.6mm 6.85mm)}
.fantasma{position:absolute;pointer-events:none;white-space:pre;transform:scaleX(-1) rotate(var(--g,0deg));opacity:.09;line-height:1.45}
.fantasma.lista{font-family:var(--mao);font-size:19pt;color:#1f2f55;opacity:.11;transform:scaleX(-1) rotate(var(--g,0deg));margin:0;padding:0}
.fantasma.recibo,.fantasma.calendario{font-family:"DejaVu Sans Mono","Courier New",monospace;font-size:8.5pt;color:#1c1712}
</style></head>
<body>
<div id="livro"></div>
<div id="fonte"><!--FONTE--></div>
<script>
(async function(){
  await document.fonts.ready;
  function prng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var livro = document.getElementById('livro');
  var fonte = document.getElementById('fonte');
  var paginas = [];
  function novaPagina(bloco, primeira){
    var kind = bloco.dataset.kind;
    var p = document.createElement('div');
    p.className = 'pagina ' + kind + (primeira ? ' primeira' : '');
    if (primeira){
      bloco.classList.forEach(function(c){ if (c === 'dobra' || c === 'pautado' || c === 'dialogo') p.classList.add(c); });
      p.appendChild(bloco.querySelector('.decor'));
    } else {
      if (bloco.classList.contains('dialogo')) p.classList.add('dialogo');
      var d = document.createElement('div'); d.className = 'decor';
      var r = prng(paginas.length * 7919 + 17), chuva = parseFloat(bloco.dataset.rain || '0');
      if (r() < .45 * chuva){ var s = 70 + Math.round(r() * 90);
        d.innerHTML = '<i class="mancha" style="left:' + Math.round(r()*80) + '%;top:' + Math.round(r()*80) + '%;width:' + s + 'px;height:' + s + 'px;--rot:' + Math.round(r()*360) + 'deg;--a:.16"></i>'; }
      p.appendChild(d);
    }
    var corpo = document.createElement('div'); corpo.className = 'corpo';
    p.appendChild(corpo);
    livro.appendChild(p); paginas.push(p);
    return corpo;
  }
  function cabe(c){ return c.scrollHeight <= c.clientHeight + 1; }
  var blocos = [].slice.call(fonte.children);
  blocos.forEach(function(bloco){
    var itens = [].slice.call(bloco.querySelector('.corpo').children);
    var corpo = novaPagina(bloco, true), doBloco = [corpo];
    itens.forEach(function(el){
      corpo.appendChild(el);
      if (!cabe(corpo) && corpo.children.length > 1){
        corpo.removeChild(el);
        corpo = novaPagina(bloco, false); doBloco.push(corpo);
        corpo.appendChild(el);
      }
    });
    // evita uma folha final com uma ou duas linhas soltas
    if (doBloco.length > 1){
      var ult = doBloco[doBloco.length - 1], ant = doBloco[doBloco.length - 2];
      if (ult.children.length <= 2){
        var mov = [].slice.call(ult.children);
        ant.classList.add('apertado');
        mov.forEach(function(el){ ant.appendChild(el); });
        if (cabe(ant)){
          var pg = ult.parentNode; pg.remove(); paginas.splice(paginas.indexOf(pg), 1);
        } else {
          mov.forEach(function(el){ ult.appendChild(el); });
          ant.classList.remove('apertado');
          // uma nota de margem nunca fica sozinha: leva o parágrafo anterior junto
          if (ult.children.length === 1 && ult.firstElementChild.classList.contains('margem') && ant.children.length > 2){
            ult.insertBefore(ant.lastElementChild, ult.firstElementChild);
          }
        }
      }
    }
  });
  fonte.remove();
  paginas.forEach(function(p, i){
    if (i === 0) return;
    var f = document.createElement('div'); f.className = 'folio'; f.textContent = String(i + 1);
    p.appendChild(f);
  });
  document.querySelectorAll('[data-pg]').forEach(function(b){
    var alvo = document.getElementById(b.dataset.pg);
    var pg = alvo ? paginas.indexOf(alvo.closest('.pagina')) + 1 : 0;
    b.textContent = pg ? String(pg) : '';
  });
  window.__soltas = paginas.map(function(p, i){ var c = p.querySelector('.corpo');
    return [i + 1, c.children.length, c.textContent.length]; }).filter(function(x){ return x[1] <= 2 && x[2] < 260; });
  window.__pronto = paginas.length;
})();
</script>
</body></html>
"""

if __name__ == "__main__":
    (ROOT / "web").mkdir(exist_ok=True)
    (ROOT / "print").mkdir(exist_ok=True)
    (ROOT / "web/index.html").write_text(web(), encoding="utf-8")
    (ROOT / "print/print.html").write_text(print_html(), encoding="utf-8")
    frags = [b for b in BLOCKS if b["kind"] == "frag"]
    print("blocos:", len(BLOCKS), "fragmentos:", len(frags), [b["n"] for b in frags][-3:])
    print("web KB:", round((ROOT / "web/index.html").stat().st_size / 1024), "print KB:", round((ROOT / "print/print.html").stat().st_size / 1024))

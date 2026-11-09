"""Assa as texturas de papel do PDF em duas imagens JPEG (uma por tipo de folha),
para que o PDF reutilize a mesma imagem em todas as páginas."""
import asyncio, os, io, re
from pathlib import Path
from playwright.async_api import async_playwright
from PIL import Image

ROOT = Path(__file__).parent
build = (ROOT / "build.py").read_text()
# reaproveita as mesmas texturas SVG do build
ns = {}
ns["__file__"] = str(ROOT / "build.py")
exec(build.split("# ---------------------------------------------------------------- texto")[0].replace("FONT_CSS = ", "FONT_CSS_UNUSED = "), ns)
FIBRA, MANCHA = ns["TEX_FIBRA"], ns["TEX_MANCHA"]

HTML = """<!DOCTYPE html><html><head><style>
html,body{margin:0;background:#000}
.p{width:559px;height:794px;position:relative;overflow:hidden}
.papel{background:%(fibra)s,%(mancha)s,radial-gradient(120%% 90%% at 50%% 40%%,rgba(255,250,236,.6),rgba(255,250,236,0) 64%%),#e8d9ba;
  box-shadow:inset 0 0 64px rgba(122,84,38,.34),inset 0 0 10px rgba(92,62,26,.40)}
.papel::after{content:"";position:absolute;inset:0;background:rgba(232,217,186,.5)}
.bilhete{background:%(fibra)s,linear-gradient(180deg,#f1eee7,#e8e3d8);box-shadow:inset 0 0 44px rgba(120,110,90,.16)}
</style></head><body><div class="p %(cls)s"></div></body></html>"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"), args=["--no-sandbox"])
        ctx = await b.new_context(viewport={"width": 559, "height": 794}, device_scale_factor=1.6)
        pg = await ctx.new_page()
        for cls, name in [("papel", "papel.jpg"), ("bilhete", "bilhete.jpg")]:
            await pg.set_content(HTML % {"fibra": FIBRA, "mancha": MANCHA, "cls": cls})
            await pg.wait_for_timeout(300)
            png = await pg.locator(".p").screenshot()
            im = Image.open(io.BytesIO(png)).convert("RGB")
            im.save(ROOT / "print" / name, quality=80, optimize=True, progressive=True)
            print(name, im.size, (ROOT / "print" / name).stat().st_size // 1024, "KB")
        await b.close()

asyncio.run(main())

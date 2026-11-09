import asyncio, os, sys
from pathlib import Path
from playwright.async_api import async_playwright
from PIL import Image

ROOT = Path(__file__).parent
URL = (ROOT / "web/index.html").as_uri()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"), args=["--no-sandbox"])
        shots = []
        for name, vp, targets in [
            ("m", {"width": 390, "height": 844}, ["capa", "antes", "f2", "f4", "cap-5", "f21"]),
            ("d", {"width": 1280, "height": 860}, ["capa", "f12"]),
        ]:
            ctx = await b.new_context(viewport=vp, device_scale_factor=1)
            pg = await ctx.new_page()
            await pg.goto(URL)
            await pg.wait_for_timeout(600)
            for t in targets:
                await pg.evaluate("id => document.getElementById(id).scrollIntoView({block:'start'})", t)
                await pg.wait_for_timeout(500)
                path = ROOT / f"shots/{name}-{t}.png"
                await pg.screenshot(path=str(path))
                shots.append(path)
            await ctx.close()
        await b.close()
    # folha de contato
    mob = [Image.open(s) for s in shots if s.name.startswith("m-")]
    sheet = Image.new("RGB", (390 * 3 + 40, 844 * 2 + 30), "white")
    for i, im in enumerate(mob):
        sheet.paste(im, ((i % 3) * 400, (i // 3) * 874))
    sheet.save(ROOT / "shots/mobile-sheet.png")
    desk = [Image.open(s) for s in shots if s.name.startswith("d-")]
    sh2 = Image.new("RGB", (1280, 860 * 2 + 10), "white")
    for i, im in enumerate(desk):
        sh2.paste(im, (0, i * 870))
    sh2 = sh2.resize((960, int((860 * 2 + 10) * .75)))
    sh2.save(ROOT / "shots/desk-sheet.png")

asyncio.run(main())

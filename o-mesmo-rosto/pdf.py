import asyncio, os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).parent

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME", "/usr/bin/google-chrome"), args=["--no-sandbox"])
        pg = await b.new_page(viewport={"width": 560, "height": 800})
        await pg.goto((ROOT / "print/print.html").as_uri())
        await pg.wait_for_function("window.__pronto > 0", timeout=60000)
        n = await pg.evaluate("window.__pronto")
        await pg.emulate_media(media="print")
        await pg.pdf(path=str(ROOT / "O-Mesmo-Rosto.pdf"), prefer_css_page_size=True, print_background=True)
        print("paginas:", n, "soltas:", await pg.evaluate("window.__soltas"))
        await b.close()

asyncio.run(main())

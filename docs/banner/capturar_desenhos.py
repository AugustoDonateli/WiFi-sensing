"""Tira do site (demo/index.html, apresentação "Como funciona") os desenhos usados no banner, em alta
resolução e sem os textos da tela. Os traços ficam mais grossos que na TV: a tela é pequena (960 x 540)
e a escala é grande (5x), e o desenho do site engrossa as linhas junto com a escala.

    python docs/banner/capturar_desenhos.py     # salva em dados/graficos/banner/desenho-*.png

Precisa do Playwright com o Chromium. São ilustrações (desenho), não medições.
"""
import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / "dados" / "graficos" / "banner"
CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
# cena: (tempo da animação, recorte em fração da tela: esquerda, topo, direita, baixo)
CENAS = {
    "caminhos": (10, (0.42, 0.15, 0.97, 0.67)),
    "viabilidade": (10, (0.41, 0.36, 0.95, 0.66)),
    "sozinho": (10, (0.46, 0.18, 0.97, 0.68)),
    "escombros": (14, (0.575, 0.165, 0.89, 0.37)),
    "salto": (10, (0.035, 0.065, 0.23, 0.565)),
    "mexe": (11, (0.5, 0.2, 0.98, 0.76)),
}

with sync_playwright() as p:
    nav = p.chromium.launch(executable_path=CHROMIUM)
    pg = nav.new_page(viewport={"width": 960, "height": 540}, device_scale_factor=5)
    pg.goto((RAIZ / "demo" / "index.html").as_uri()); time.sleep(3)
    pg.keyboard.press("h"); time.sleep(3)
    pg.evaluate("historia.versao('completa')"); time.sleep(0.5)
    pg.add_style_tag(content=".h-textos,.h-topo,.h-progresso,.h-controles,.h-notas{display:none!important}")
    ordem = pg.evaluate("historia.estado().ordem")
    SAIDA.mkdir(parents=True, exist_ok=True)
    for cena, (amb, (a, b, c, d)) in CENAS.items():
        pg.evaluate(f"historia._teste.congelar({amb}); historia._teste.irPara({ordem.index(cena)}); historia._teste.quadro();")
        time.sleep(0.2)
        tmp = SAIDA / f"_{cena}.png"
        pg.screenshot(path=str(tmp))
        im = Image.open(tmp); W, H = im.size
        im.crop((int(a * W), int(b * H), int(c * W), int(d * H))).save(SAIDA / f"desenho-{cena}.png")
        tmp.unlink()
        print(cena, Image.open(SAIDA / f"desenho-{cena}.png").size)
    nav.close()

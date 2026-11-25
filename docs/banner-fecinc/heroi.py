"""Desenha a ilustração do topo do banner em vetor (SVG), a partir da silhueta (img/silhueta-ia.png).

A silhueta foi feita com IA generativa (Higgsfield, GPT Image 2.6). As linhas são desenhadas aqui, em
código: cada linha sobe onde o corpo está, como o sinal na tela do estande. Vetor = nítido em qualquer
tamanho de impressão.

    python docs/banner-fecinc/heroi.py [modo]   # modo: contorno (padrão) ou relevo
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

AQUI = Path(__file__).resolve().parent
W, H = 900.0, 440.0           # mm: largura do banner e altura da faixa preta
Y0, Y1 = 246.0, 430.0         # faixa das linhas
N = 36                        # número de linhas
PASSO_X = 0.6                 # mm entre pontos de cada linha
ALTURA_PESSOA = 182.0         # mm, da cabeça ao pé
X_PESSOA = 600.0              # mm, centro da pessoa
PE = 424.0                    # mm, onde fica o pé (de cima)
NOITE, LUZ = "#0F0F0E", "#EDEDE8"


def mascara():
    im = np.asarray(Image.open(AQUI / "img" / "silhueta-ia.png").convert("L")) > 128
    lin, col = np.where(im)
    y0, y1, x0, x1 = lin.min(), lin.max(), col.min(), col.max()
    esc = ALTURA_PESSOA / (y1 - y0)                     # mm por pixel
    return im, esc, (y0, y1, x0, x1)


def campo(modo):
    im, esc, (y0, y1, x0, x1) = mascara()
    res = 0.5                                           # mm por célula da grade
    gx = np.arange(0, W, res); gy = np.arange(0, H, res)
    # posição de cada célula na imagem da silhueta
    cx = (x0 + x1) / 2
    px = ((gx - X_PESSOA) / esc + cx).astype(int)
    py = ((gy - (PE - ALTURA_PESSOA)) / esc + y0).astype(int)
    m = np.zeros((len(gy), len(gx)), bool)
    ok_x = (px >= 0) & (px < im.shape[1]); ok_y = (py >= 0) & (py < im.shape[0])
    m[np.ix_(ok_y, ok_x)] = im[np.ix_(py[ok_y], px[ok_x])]
    dentro = ndimage.distance_transform_edt(m) * res        # mm até a borda, dentro do corpo
    fora = ndimage.distance_transform_edt(~m) * res          # mm até o corpo, fora
    volume = np.clip(dentro / 26.0, 0, 1) ** 0.7             # sobe mais no meio do tronco que nas bordas e nos braços
    volume = ndimage.gaussian_filter(volume, 1.6 / res)
    borda = ndimage.gaussian_filter(m.astype(float), 3.0 / res)
    h = 0.55 * volume + 0.45 * borda
    onda = np.exp(-fora / 70.0) * np.sin(2 * np.pi * fora / 34.0) * (fora > 0)
    return gx, gy, m, h, onda, res


def linhas_svg(modo="contorno"):
    gx, gy, m, h, onda, res = campo(modo)
    passo = (Y1 - Y0) / (N - 1)
    A = (1.25 if modo == "contorno" else 2.6) * passo
    R = 0.3 * passo
    xs = np.arange(0, W + PASSO_X, PASSO_X)
    ix = np.clip((xs / res).astype(int), 0, len(gx) - 1)
    rng = np.random.default_rng(7)
    partes = []
    for k in range(N):
        yb = Y0 + k * passo
        iy = min(int(yb / res), len(gy) - 1)
        # um tremor bem leve e liso, para não parecer régua
        ruido = sum(a * np.sin(2 * np.pi * xs / p + f) for a, p, f in
                    zip(rng.uniform(0.05, 0.18, 3), rng.uniform(90, 260, 3), rng.uniform(0, 6.3, 3)))
        y = yb - A * h[iy, ix] - R * onda[iy, ix] + ruido
        d = "M" + " L".join(f"{x:.1f},{v:.2f}" for x, v in zip(xs, y))
        if modo == "relevo":
            partes.append(f'<path d="{d} L{W:.1f},{H:.1f} L0,{H:.1f} Z" fill="{NOITE}" stroke="none"/>')
        partes.append(f'<path d="{d}" fill="none" stroke="{LUZ}" stroke-width="1.05" stroke-linejoin="round" stroke-linecap="round"/>')
    if modo == "contorno":
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        cs = plt.contour(gx, gy, m.astype(float), levels=[0.5])
        for seg in cs.allsegs[0]:
            if len(seg) < 30:
                continue
            seg = seg[::2]
            d = "M" + " L".join(f"{x:.1f},{y:.2f}" for x, y in seg) + " Z"
            partes.append(f'<path d="{d}" fill="none" stroke="{LUZ}" stroke-width="1.15" stroke-linejoin="round"/>')
        plt.close("all")
    return "\n".join(partes)


def placa(x, y, letra):
    """A placa ESP32 em pé num suporte, desenhada como nos desenhos da tela (vetor)."""
    w, hh = 20.0, 31.0
    pinos = "".join(f'<rect x="{x - w/2 + 1.6:.1f}" y="{y - hh/2 + 3 + i*3.1:.1f}" width="1.6" height="1.6" fill="{LUZ}"/>'
                    f'<rect x="{x + w/2 - 3.2:.1f}" y="{y - hh/2 + 3 + i*3.1:.1f}" width="1.6" height="1.6" fill="{LUZ}"/>' for i in range(8))
    return f'''<g>
  <rect x="{x - w/2 - 3}" y="{y - hh/2 - 3}" width="{w + 6}" height="{hh + 7}" rx="3" fill="{NOITE}"/>
  <rect x="{x - 9}" y="{y - hh/2 - 27}" width="18" height="22" fill="{NOITE}"/>
  <rect x="{x - 14}" y="{y + hh/2 + 66}" width="28" height="8" fill="{NOITE}"/>
  <rect x="{x - w/2}" y="{y - hh/2}" width="{w}" height="{hh}" rx="2" fill="{NOITE}" stroke="{LUZ}" stroke-width="1.2"/>
  <rect x="{x - 5.5}" y="{y - hh/2 + 4}" width="11" height="13" rx="0.8" fill="none" stroke="{LUZ}" stroke-width="1"/>
  <path d="M{x - 3.5},{y - hh/2 + 1.5} h7" stroke="{LUZ}" stroke-width="1.6"/>
  {pinos}
  <rect x="{x - 3}" y="{y + hh/2 - 2}" width="6" height="3.4" rx="0.8" fill="{NOITE}" stroke="{LUZ}" stroke-width="0.9"/>
  <path d="M{x},{y + hh/2 + 1.4} V{y + hh/2 + 70} M{x - 11},{y + hh/2 + 70} H{x + 11}" stroke="{LUZ}" stroke-width="1.4" fill="none"/>
  <text x="{x}" y="{y - hh/2 - 7}" text-anchor="middle" font-family="Instrument Serif" font-style="italic" font-size="20" fill="{LUZ}">{letra}</text>
</g>'''


def svg(modo="contorno"):
    corpo = linhas_svg(modo)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" width="{W:.0f}mm" height="{H:.0f}mm">'
            f'<rect width="{W}" height="{H}" fill="{NOITE}"/>{corpo}{placa(44, 330, "A")}{placa(W - 44, 330, "B")}</svg>')


if __name__ == "__main__":
    modo = sys.argv[1] if len(sys.argv) > 1 else "contorno"
    (AQUI / "img" / f"heroi-{modo}.svg").write_text(svg(modo))
    print("ok", modo)

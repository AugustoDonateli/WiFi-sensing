"""Suporte de parede (prateleirinha) para as placas ESP32 do Wave Sense: gera os arquivos para a impressora 3D.

    pip install manifold3d numpy matplotlib fonttools brotli
    python hardware/suporte_placa/suporte.py

Escreve, nesta pasta: suporte_A.stl, suporte_B.stl, teste_encaixe.stl e previa.png. Antes de salvar, confere
sozinho que a peça é fechada, que a placa encaixa sem encostar em nada e que as abinhas seguram a placa.

A peça já sai na posição de imprimir: a prateleira deitada na mesa da impressora e as costas em pé (é a mesma
posição em que ela fica na parede). Não precisa de suporte de impressão.

Se a placa não encaixar no teste, meça e mude as medidas abaixo (em milímetros) e rode de novo.
"""

import base64
import io
import re
import sys
import tempfile
from pathlib import Path

import numpy as np
from manifold3d import CrossSection, FillRule, JoinType, Manifold

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]

# ---------- Medidas da placa (ESP32 DevKit de 30 pinos, USB-C) ----------
PLACA_C = 51.5      # comprimento da placa (do USB até a ponta da antena)
PLACA_L = 28.5      # largura da placa
PLACA_E = 1.6       # espessura da placa
PINOS = 11.0        # quanto os pinos descem abaixo da placa (plástico preto + pino)
FOLGA = 0.5         # folga em volta da placa, de cada lado (aumente se ficar apertado)
CABO = 4.0          # grossura do cabo USB
PLUGUE_L = 13.0     # largura da capa do plugue USB-C (a parte de borracha)
PLUGUE_A = 7.5      # altura da capa do plugue

# ---------- Medidas do suporte ----------
PAREDE = 1.6        # parede da bandeja (é ela que dobra para a placa entrar: não engrosse muito)
PISO = 3.0          # espessura da prateleira
COSTAS_E = 3.0      # espessura das costas (o lado que vai na parede, com a fita)
COSTAS_A = 70.0     # altura das costas
COSTAS_L = 60.0     # largura das costas (mais largura = mais fita)
VAO = 40.0          # espaço entre as costas e a bandeja, para o plugue USB e a curva do cabo
ABA = 1.5           # quanto cada abinha passa por cima da borda da placa (descontada a folga)
NERVURA = 3.0       # espessura das nervuras que seguram a prateleira
NERVURA_A = 50.0    # altura das nervuras, junto das costas
LETRA_A = 30.0      # altura da letra A/B nas costas (nas nervuras ela é menor, do tamanho que couber)
LETRA_RELEVO = 1.2  # quanto a letra sai para fora

# ---------- Contas (não precisa mexer) ----------
Li, Wi = PLACA_C + 2 * FOLGA, PLACA_L + 2 * FOLGA           # bolso da placa
Lo, Wo = Li + 2 * PAREDE, Wi + 2 * PAREDE                   # bandeja por fora
X0 = COSTAS_E + VAO                                         # início da bandeja (lado do USB)
XI0, XI1 = X0 + PAREDE, X0 + PAREDE + Li                    # bolso: lado do USB e lado da antena
X1 = XI1 + PAREDE                                           # ponta da prateleira
Z_PLACA = PISO + PINOS + 1.0                                # onde a placa apoia (os pinos ficam soltos embaixo)
Z_ABA = Z_PLACA + PLACA_E + 0.3                             # embaixo da abinha
Z_TOPO = Z_ABA + 0.2 + ABA + 0.3                            # alto das paredes da bandeja
APOIO_L = Wi - 2 * 5.5                                      # degraus de apoio: só no meio, longe das fileiras de pinos
CANTO = 3.0                                                 # na ponta da antena, os cantos seguram a placa
SEDE_X = COSTAS_E + 3 + PLUGUE_A + 3.5 + 4.5                # onde o cabo fica preso no piso
GARGANTA = 0.8 * CABO                                       # a entrada da trava: mais estreita que o cabo, para prender


def caixa(x0, x1, y0, y1, z0, z1):
    return Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0])


# Perfis 2D extrudados e postos no lugar (só rotações, nada espelhado).
def no_plano_yz(secao, x0, espessura):
    """Perfil desenhado em (y, z), extrudado ao longo de x a partir de x0."""
    m = secao.extrude(espessura).transform(np.array([[0, 0, 1, 0], [1, 0, 0, 0], [0, 1, 0, 0]], dtype=float))
    return m.translate([x0, 0, 0])


def no_plano_xz(secao, y_centro, espessura):
    """Perfil desenhado em (x, z), extrudado ao longo de y, centrado em y_centro."""
    m = secao.extrude(espessura).transform(np.array([[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0]], dtype=float))
    return m.translate([0, y_centro + espessura / 2, 0])


def fonte_serifada():
    """A Instrument Serif itálica do site (a mesma do A e do B da tela); sem ela, a DejaVu Serif itálica."""
    from matplotlib.font_manager import FontProperties
    try:
        from fontTools.ttLib import TTFont
        css = (RAIZ / "demo" / "fontes.css").read_text()
        for bloco in re.findall(r"@font-face\s*\{(.*?)\}", css, re.S):
            if "Instrument Serif" in bloco and "italic" in bloco:
                dados = base64.b64decode(re.search(r"base64,([A-Za-z0-9+/=]+)", bloco).group(1))
                f = TTFont(io.BytesIO(dados))
                f.flavor = None
                destino = Path(tempfile.gettempdir()) / "wavesense-instrument-serif-italic.ttf"
                f.save(destino)
                return FontProperties(fname=str(destino)), "Instrument Serif itálica"
    except Exception as e:      # sem fonttools/brotli, ou o css mudou
        print("aviso: sem a fonte do site,", e)
    return FontProperties(family="DejaVu Serif", style="italic"), "DejaVu Serif itálica"


def contorno_letra(texto, fonte, altura):
    """O contorno 2D da letra, centrado na origem, com a altura pedida."""
    from matplotlib.textpath import TextPath
    caminho = TextPath((0, 0), texto, size=100, prop=fonte)
    polis = [p for p in caminho.to_polygons(closed_only=True) if len(p) >= 3]
    secao = CrossSection(polis, FillRule.EvenOdd)
    u0, v0, u1, v1 = secao.bounds()
    esc = altura / (v1 - v0)
    secao = secao.translate([-(u0 + u1) / 2, -(v0 + v1) / 2]).scale([esc, esc])
    return secao.offset(0.25, JoinType.Round)        # engrossa os traços finos da serifa para o bico de 0,4 mm


def triangulo_nervura():
    return CrossSection([np.array([[COSTAS_E - 0.1, PISO - 0.1], [COSTAS_E - 0.1, NERVURA_A], [X0, PISO - 0.1]])], FillRule.EvenOdd)


def letras(texto, fonte):
    """A letra em relevo: grande na frente das costas e, menor, do lado de fora das duas nervuras (o lado que o
    público vê quando passa). Na nervura, o tamanho é o maior que cabe no triângulo, com 2 mm de margem."""
    z_centro = (Z_TOPO + 6 + COSTAS_A - 5) / 2
    frente = no_plano_yz(contorno_letra(texto, fonte, LETRA_A).translate([0, z_centro]), COSTAS_E - 0.2, LETRA_RELEVO + 0.2)
    # o maior tamanho que cabe dentro da nervura (o triângulo encolhido 2 mm), perto do canto de baixo
    dentro = triangulo_nervura().offset(-2.0, JoinType.Miter)
    a, b = NERVURA_A - PISO, X0 - COSTAS_E                            # catetos do triângulo
    r = (a + b - np.hypot(a, b)) / 2                                  # raio do círculo inscrito
    cx, cz = COSTAS_E + r, PISO + r
    alt = 2 * r
    while alt > 8:
        for lado in (1, -1):
            base = contorno_letra(texto, fonte, alt)
            # quem olha a face de fora: no lado +y, a direita é -x; no lado -y, a direita é +x
            perfil = (base.mirror([1, 0]) if lado == 1 else base).translate([cx, cz])
            if (perfil - dentro).area() > 0.01:
                break
        else:
            break
        alt -= 0.5
    pecas = [frente]
    for lado in (1, -1):
        perfil = (contorno_letra(texto, fonte, alt).mirror([1, 0]) if lado == 1 else contorno_letra(texto, fonte, alt)).translate([cx, cz])
        y_face = lado * (COSTAS_L / 2 - 0.2)
        y_centro = y_face + lado * (LETRA_RELEVO / 2 - 0.1)
        pecas.append(no_plano_xz(perfil, y_centro, LETRA_RELEVO + 0.2))
    return Manifold.batch_boolean(pecas, _uniao())


def bandeja():
    """A bandeja da placa: bolso, degraus de apoio, aberturas e as quatro abinhas flexíveis."""
    m = caixa(X0, X1, -Wo / 2, Wo / 2, 0, Z_TOPO)
    m -= caixa(XI0, XI1, -Wi / 2, Wi / 2, PISO, Z_TOPO + 1)
    # ponta da antena: aberta da altura da placa para cima (sobram só os cantinhos que seguram a placa)
    m -= caixa(XI1 - 0.01, X1 + 1, -Wi / 2 + CANTO, Wi / 2 - CANTO, Z_PLACA, Z_TOPO + 1)
    m -= caixa(XI1 - 0.01, X1 + 1, -Wi / 2 - 0.01, Wi / 2 + 0.01, Z_PLACA + PLACA_E + 0.6, Z_TOPO + 1)
    # ponta do USB: o recorte para o plugue
    m -= caixa(X0 - 1, XI0 + 0.01, -(PLUGUE_L + 1) / 2, (PLUGUE_L + 1) / 2, Z_PLACA - 2, Z_TOPO + 1)
    # degraus onde a placa apoia, nas duas pontas curtas
    m += caixa(XI0 - 0.01, XI0 + 3, -APOIO_L / 2, APOIO_L / 2, PISO - 0.01, Z_PLACA)
    m += caixa(XI1 - 3, XI1 + 0.01, -APOIO_L / 2, APOIO_L / 2, PISO - 0.01, Z_PLACA)
    # abinhas: um dedo de parede solto por duas fendas, com um dente em rampa por cima da placa
    perfil = CrossSection([np.array([
        [Wi / 2 + 0.05, Z_ABA], [Wi / 2 - ABA, Z_ABA], [Wi / 2 - ABA, Z_ABA + 0.2], [Wi / 2 + 0.05, Z_ABA + 0.2 + ABA],
    ])], FillRule.EvenOdd)
    for fx0, fx1 in [(XI0 + 1.5, XI0 + 6.5), (XI1 - 6.5, XI1 - 1.5)]:
        for lado in (1, -1):
            yy = sorted([lado * (Wi / 2 - 0.1), lado * (Wo / 2 + 0.1)])
            m -= caixa(fx0 - 0.8, fx0, yy[0], yy[1], PISO + 1, Z_TOPO + 1)
            m -= caixa(fx1, fx1 + 0.8, yy[0], yy[1], PISO + 1, Z_TOPO + 1)
            dente = no_plano_yz(perfil, fx0 + 0.25, (fx1 - fx0) - 0.5)
            m += dente if lado == 1 else dente.mirror([0, 1, 0])
    return m


def suporte(texto, fonte):
    """A peça inteira: costas com a letra, nervuras, prateleira com a trava do cabo e a bandeja."""
    W = COSTAS_L
    # O piso fica um pouco para dentro das costas, das nervuras e da bandeja: peças que só se encostam numa aresta
    # viram, no STL, arestas com quatro faces, e o fatiador reclama ("malha não fechada").
    w, wo = W / 2 - 0.3, Wo / 2 - 0.5
    piso = CrossSection([np.array([
        [0.5, -w], [X0, -w], [X0 + (w - wo), -wo], [X1 - 0.5, -wo],
        [X1 - 0.5, wo], [X0 + (w - wo), wo], [X0, w], [0.5, w],
    ])], FillRule.EvenOdd).extrude(PISO)
    # costas com os cantos de cima arredondados
    r = 6.0
    arco = lambda cy, cz, a0: [[cy + r * np.cos(t), cz + r * np.sin(t)] for t in np.linspace(a0, a0 + np.pi / 2, 12)]
    perfil_costas = CrossSection([np.array([[-W / 2, 0], [W / 2, 0], *arco(W / 2 - r, COSTAS_A - r, 0),
                                            *arco(-W / 2 + r, COSTAS_A - r, np.pi / 2)])], FillRule.EvenOdd)
    costas = no_plano_yz(perfil_costas, 0, COSTAS_E)
    # a face de fora da nervura fica 0,2 mm para dentro da lateral das costas (de novo: nada de faces encostadas)
    nervuras = [no_plano_xz(triangulo_nervura(), lado * (W / 2 - 0.2 - NERVURA / 2), NERVURA) for lado in (1, -1)]
    m = Manifold.batch_boolean([piso, costas, *nervuras, letras(texto, fonte), bandeja()], _uniao())
    # trava do cabo: uma janela por onde passa o plugue e, dela, uma fenda estreita até o furo onde o cabo fica preso
    jx1 = COSTAS_E + 3 + PLUGUE_A + 3.5
    m -= caixa(COSTAS_E + 3, jx1, -(PLUGUE_L + 5) / 2, (PLUGUE_L + 5) / 2, -1, PISO + 1)
    m -= caixa(jx1 - 0.1, SEDE_X, -GARGANTA / 2, GARGANTA / 2, -1, PISO + 1)
    m -= Manifold.cylinder(PISO + 2, (CABO + 0.6) / 2, circular_segments=48).translate([SEDE_X, 0, -1])
    return m


def _uniao():
    from manifold3d import OpType
    return OpType.Add


def placa_fantasma():
    """A placa encaixada, com pinos, módulo, conector, plugue e cabo, para conferir as folgas (não é impressa)."""
    px0 = XI0 + FOLGA
    px1 = px0 + PLACA_C
    topo = Z_PLACA + PLACA_E
    partes = {
        "placa": caixa(px0, px1, -PLACA_L / 2, PLACA_L / 2, Z_PLACA, topo),
        "pinos": Manifold.batch_boolean([
            caixa((px0 + px1) / 2 - 19.05, (px0 + px1) / 2 + 19.05, s * (PLACA_L / 2 - 1.5) - 1.27, s * (PLACA_L / 2 - 1.5) + 1.27,
                  Z_PLACA - PINOS, Z_PLACA) for s in (1, -1)], _uniao()),
        "modulo": caixa(px1 - 25.5, px1, -9, 9, topo, topo + 3.1),
        "conector": caixa(px0 - 1.0, px0 + 7.3, -4.5, 4.5, topo, topo + 3.3),
        "plugue": caixa(px0 - 1.0 - 20, px0 - 1.0, -PLUGUE_L / 2, PLUGUE_L / 2, topo + 1.65 - PLUGUE_A / 2, topo + 1.65 + PLUGUE_A / 2),
        "cabo": Manifold.cylinder(PISO + 40, CABO / 2, circular_segments=32).translate([SEDE_X, 0, -30]),
    }
    return partes


def malha(m):
    t = m.to_mesh()
    return np.asarray(t.vert_properties)[:, :3], np.asarray(t.tri_verts)


def salvar_stl(m, caminho, nome):
    v, f = malha(m)
    tri = v[f]
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    dados = np.zeros(len(f), dtype=[("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")])
    dados["n"], dados["v"] = n, tri
    with open(caminho, "wb") as arq:
        arq.write(nome.encode()[:80].ljust(80, b" "))
        arq.write(np.uint32(len(f)).tobytes())
        arq.write(dados.tobytes())


def conferir(m, nome, fantasma=None, completo=True):
    """As conferências que valem para a impressão. Para na primeira que falhar."""
    erros = []
    if m.status().name != "NoError":
        erros.append(f"malha com erro: {m.status()}")
    if m.genus() < 0 or m.volume() <= 0:
        erros.append("malha aberta ou vazia")
    v, f = malha(m)
    tam = v.max(0) - v.min(0)
    # como o fatiador vai ler: vértices em float32 e juntados pela posição; toda aresta precisa ter duas faces
    v32 = v.astype(np.float32)
    _, ident = np.unique(v32, axis=0, return_inverse=True)
    ff = ident.reshape(-1)[f]
    arestas = np.sort(np.concatenate([ff[:, [0, 1]], ff[:, [1, 2]], ff[:, [2, 0]]]), axis=1)
    _, cont = np.unique(arestas, axis=0, return_counts=True)
    if (cont != 2).any():
        erros.append(f"o STL não fica fechado: {(cont != 2).sum()} arestas sem par (peças só encostando)")
    if tam.max() > 180:
        erros.append(f"grande demais para a mesa: {tam.round(1)}")
    if abs(v[:, 2].min()) > 1e-6:
        erros.append("não está apoiada na mesa (z mínimo ≠ 0)")
    # faces viradas para baixo (precisariam de suporte): fora a mesa, só podem ser as abinhas, pequenas
    tri = v[f]
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    area = np.linalg.norm(n, axis=1) / 2
    nz = n[:, 2] / np.maximum(2 * area, 1e-12)
    baixo = (nz < -0.71) & (tri[:, :, 2].min(1) > 0.01)
    # a letra em relevo também tem partes viradas para baixo (embaixo da barra do A, por exemplo), mas com só
    # LETRA_RELEVO de fundo: é uma ponte curtinha, que imprime sem suporte
    na_letra = (tri[:, :, 0].min(1) >= COSTAS_E - 0.3) & (tri[:, :, 0].max(1) <= COSTAS_E + LETRA_RELEVO + 0.01)
    ay = np.abs(tri[:, :, 1])
    na_letra |= (ay.min(1) >= COSTAS_L / 2 - 0.5) & (ay.max(1) <= COSTAS_L / 2 - 0.2 + LETRA_RELEVO + 0.01)   # letras das nervuras
    area_baixo = area[baixo & ~na_letra].sum()
    if area_baixo > 4 * 5 * ABA * 1.2 + 1:
        erros.append(f"área virada para baixo grande demais ({area_baixo:.0f} mm²): precisaria de suporte")
    if fantasma:
        for parte, g in fantasma.items():
            toque = (m ^ g).volume()
            if toque > 0.01:
                erros.append(f"a placa encosta na peça: {parte} ({toque:.2f} mm³)")
        # as abinhas passam por cima da placa: o que está logo acima da placa, dentro da área dela
        px0 = XI0 + FOLGA
        acima = caixa(px0, px0 + PLACA_C, -PLACA_L / 2, PLACA_L / 2, Z_PLACA + PLACA_E, Z_PLACA + PLACA_E + 2)
        abas = (m ^ acima).decompose()
        if len(abas) != 4:
            erros.append(f"esperava 4 abinhas por cima da placa, achei {len(abas)}")
        # a placa não sai pela ponta da antena: os cantinhos ficam na frente dela
        frente = caixa(px0 + PLACA_C, X1 + 1, -PLACA_L / 2, PLACA_L / 2, Z_PLACA, Z_PLACA + PLACA_E)
        if (m ^ frente).volume() <= 0:
            erros.append("nada segura a placa na ponta da antena")
    if completo and not (GARGANTA < CABO < CABO + 0.6):
        erros.append("trava do cabo: a fenda precisa ser mais estreita que o cabo e o furo, mais largo")
    print(f"  {nome}: {tam[0]:.1f} × {tam[1]:.1f} × {tam[2]:.1f} mm, {m.volume() / 1000:.1f} cm³ "
          f"(~{m.volume() / 1000 * 1.24:.0f} g se fosse maciço), {len(f)} triângulos, "
          f"virado para baixo: {area_baixo:.1f} mm² -> {'ok' if not erros else 'PROBLEMA'}")
    for e in erros:
        print("    -", e)
    return not erros


def renderizar(pecas, azim, elev, tam=(760, 560), margem=0.07):
    """Desenho de cada vista com z-buffer (projeção ortográfica), sombreado e contorno, sem depender de OpenGL.
    `pecas` = [(Manifold, cor RGB 0..1)]. Devolve a imagem e uma função que leva um ponto 3D para o pixel."""
    az, el = np.radians(azim), np.radians(elev)
    d = np.array([np.cos(el) * np.cos(az), np.cos(el) * np.sin(az), np.sin(el)])     # para onde está a câmera
    cima = np.array([0.0, 0.0, 1.0]) if abs(d[2]) < 0.99 else np.array([-np.cos(az), -np.sin(az), 0.0])
    direita = np.cross(cima, d); direita /= np.linalg.norm(direita)
    acima = np.cross(d, direita)
    tris, cores = [], []
    for m, cor in pecas:
        if m.is_empty():
            continue
        v, f = malha(m)
        tris.append(v[f]); cores.append(np.tile(cor, (len(f), 1)))
    tris, cores = np.concatenate(tris), np.concatenate(cores)
    P = np.stack([tris @ direita, tris @ acima, tris @ d], axis=-1)              # (n, 3 vértices, [x, y, prof])
    W, H = tam
    lo, hi = P[..., :2].reshape(-1, 2).min(0), P[..., :2].reshape(-1, 2).max(0)
    esc = min(W * (1 - 2 * margem) / (hi[0] - lo[0]), H * (1 - 2 * margem) / (hi[1] - lo[1]))
    cen = (lo + hi) / 2
    def pix(q):
        q = np.atleast_2d(q)
        return np.c_[W / 2 + (q @ direita - cen[0]) * esc, H / 2 - (q @ acima - cen[1]) * esc]
    X = W / 2 + (P[..., 0] - cen[0]) * esc
    Y = H / 2 - (P[..., 1] - cen[1]) * esc
    Z = P[..., 2]
    n = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    luz1 = d * 0.55 + acima * 0.6 + direita * 0.35; luz1 /= np.linalg.norm(luz1)
    luz2 = d * 0.8 - direita * 0.5; luz2 /= np.linalg.norm(luz2)
    k = 0.42 + 0.45 * np.clip(n @ luz1, 0, 1) + 0.18 * np.clip(n @ luz2, 0, 1)
    sombra = np.clip(cores * k[:, None], 0, 1)
    zbuf = np.full((H, W), -np.inf); img = np.ones((H, W, 3)) * np.array([0.957, 0.953, 0.937])
    idbuf = np.full((H, W), -1)
    for i in range(len(tris)):
        if n[i] @ d <= 0:          # costas viradas para longe da câmera
            continue
        x, y, z = X[i], Y[i], Z[i]
        x0, x1 = max(int(np.floor(x.min())), 0), min(int(np.ceil(x.max())), W - 1)
        y0, y1 = max(int(np.floor(y.min())), 0), min(int(np.ceil(y.max())), H - 1)
        if x0 > x1 or y0 > y1:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        den = (y[1] - y[2]) * (x[0] - x[2]) + (x[2] - x[1]) * (y[0] - y[2])
        if abs(den) < 1e-12:
            continue
        a = ((y[1] - y[2]) * (gx - x[2]) + (x[2] - x[1]) * (gy - y[2])) / den
        b = ((y[2] - y[0]) * (gx - x[2]) + (x[0] - x[2]) * (gy - y[2])) / den
        c = 1 - a - b
        dentro = (a >= -1e-6) & (b >= -1e-6) & (c >= -1e-6)
        prof = a * z[0] + b * z[1] + c * z[2]
        sub = zbuf[y0:y1 + 1, x0:x1 + 1]
        ganha = dentro & (prof > sub)
        sub[ganha] = prof[ganha]
        img[y0:y1 + 1, x0:x1 + 1][ganha] = sombra[i]
        idbuf[y0:y1 + 1, x0:x1 + 1][ganha] = i
    # contorno: onde muda a profundidade de repente ou a direção da face (cantos vivos)
    nb = np.zeros((H, W, 3)); ok = idbuf >= 0; nb[ok] = n[idbuf[ok]]
    zz = np.where(ok, zbuf, -1e6)
    borda = np.zeros((H, W), bool)
    for dy, dx in ((0, 1), (1, 0)):
        za, zb = zz[: H - dy, : W - dx], zz[dy:, dx:]
        na, nb2 = nb[: H - dy, : W - dx], nb[dy:, dx:]
        oa, ob = ok[: H - dy, : W - dx], ok[dy:, dx:]
        b = (oa | ob) & ((np.abs(za - zb) > 1.2 / esc * 3) | (oa & ob & ((na * nb2).sum(-1) < 0.82)))
        borda[: H - dy, : W - dx] |= b
    img[borda] = img[borda] * 0.25
    return img, pix


def previa(peca, fantasma, caminho, titulo):
    """Quatro vistas: em uso, de cima, o corte com a placa encaixada e o teste de encaixe. Placa fantasma em laranja."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    cinza, laranja, preto = np.array([0.80, 0.80, 0.78]), np.array([0.96, 0.62, 0.25]), np.array([0.25, 0.25, 0.25])
    cor_de = lambda nome: preto if nome == "cabo" else laranja
    corte = lambda m: m.trim_by_plane([0, 1, 0], 0.0)
    vistas = [
        ("Em uso: a parede fica atrás das costas", [(peca, cinza)] + [(g, cor_de(k)) for k, g in fantasma.items()], -38, 24),
        ("De cima: a placa à mostra e a trava do cabo", [(peca, cinza)] + [(g, cor_de(k)) for k, g in fantasma.items() if k != "cabo"], -90, 89),
        ("Corte no meio: pinos soltos embaixo, abinhas por cima", [(corte(peca), cinza)] + [(corte(g), cor_de(k)) for k, g in fantasma.items()], -90, 4),
        ("Do outro lado: a letra também nas nervuras", [(peca, cinza)], 125, 18),
    ]
    fig, eixos = plt.subplots(2, 2, figsize=(15.5, 11.6), facecolor="#F4F3EF")
    for ax, (nome, pecas, azim, elev) in zip(eixos.flat, vistas):
        img, pix = renderizar(pecas, azim, elev)
        ax.imshow(img); ax.set_axis_off(); ax.set_title(nome, fontsize=13, color="#222", loc="left")
        if nome.startswith("Em uso"):
            for txt, ponto, xy in [
                ("costas lisas: vão na parede,\ncom fita dupla face", (0, -COSTAS_L / 2 + 2, COSTAS_A * 0.8), (20, 40)),
                ("antena: aponte para a outra placa", (X1, 0, Z_PLACA + 2), (430, 520)),
                ("abinhas seguram a placa", (XI0 + 4, -Wi / 2, Z_TOPO), (300, 545)),
                ("trava do cabo:\no cabo desce por aqui", (SEDE_X, -CABO, PISO), (20, 470)),
            ]:
                (px, py), = pix(np.array(ponto))
                ax.annotate(txt, (px, py), xy, fontsize=10.5, color="#111", va="center",
                            bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="none", alpha=0.85),
                            arrowprops=dict(arrowstyle="-", color="#444", lw=0.9))
    fig.suptitle(titulo, fontsize=16, color="#111", x=0.02, ha="left")
    fig.tight_layout()
    fig.savefig(caminho, dpi=100, facecolor=fig.get_facecolor())
    plt.close(fig)


def main():
    fonte, nome_fonte = fonte_serifada()
    print(f"Letra: {nome_fonte}")
    fantasma = placa_fantasma()
    ok = True
    for texto in ("A", "B"):
        m = suporte(texto, fonte)
        ok &= conferir(m, f"suporte_{texto}", fantasma)
        salvar_stl(m, AQUI / f"suporte_{texto}.stl", f"Wave Sense suporte placa {texto}")
        if texto == "A":
            previa(m, fantasma, AQUI / "previa.png", "Suporte da placa A (a do B é igual, com a letra B)")
    teste = bandeja()
    fantasma_teste = {k: g for k, g in fantasma.items() if k not in ("cabo", "plugue")}
    ok &= conferir(teste, "teste_encaixe", fantasma_teste, completo=False)
    salvar_stl(teste.translate([-X0, 0, 0]), AQUI / "teste_encaixe.stl", "Wave Sense teste de encaixe")
    print("Tudo certo." if ok else "Tem problema: veja acima.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

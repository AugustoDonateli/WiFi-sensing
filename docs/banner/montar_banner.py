"""Monta o banner da XV JACITEC no modelo oficial (90 x 120 cm), versão 2 (16/10/2026).

    python ferramentas/figuras_banner.py        # gráficos com os dados reais
    python docs/banner/capturar_desenhos.py     # desenhos do site
    python docs/banner/montar_banner.py docs/banner/banner-wave-sense-jacitec.pptx

A ideia: o banner mostra o que o projeto fez. Uma faixa escura no topo (como a TV do estande) diz o
resultado principal em uma frase, com o desenho de como funciona e o sinal real; embaixo, as seções do
modelo, curtas, com figuras grandes. Todo número vem das gravações reais (sessão S0, 15/10/2026).
"""
import copy
import sys
from pathlib import Path

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

AQUI = Path(__file__).resolve().parent
FIG = AQUI.parents[1] / "dados" / "graficos" / "banner"
SAIDA = Path(sys.argv[1]) if len(sys.argv) > 1 else AQUI / "banner-wave-sense.pptx"
CM = 360000
cm = lambda x: Emu(int(round(x * CM)))

AZUL = RGBColor(0x20, 0x28, 0x4D)       # títulos das seções no modelo
PRETO = RGBColor(0x14, 0x14, 0x14)
DESTAQUE = RGBColor(0xC8, 0x21, 0x5A)   # o magenta do cabeçalho, mais escuro para imprimir
CINZA = RGBColor(0x55, 0x55, 0x55)
TELA = RGBColor(0x10, 0x10, 0x0F)       # o fundo da TV do estande (o tom médio dos desenhos tirados do site)
TINTA = RGBColor(0xED, 0xED, 0xE8)
APAGADO = RGBColor(0xA9, 0xA9, 0xA2)
ROSA_TELA = RGBColor(0xFF, 0x5C, 0x8F)  # o magenta, mais claro, para ler no fundo escuro
ROSA_FUNDO = RGBColor(0xFB, 0xEA, 0xF0)
FONTE = "Arial"

CORPO = 24        # pt (o modelo pede 32, podendo reduzir até 24; nada no banner fica abaixo de 24)
LEGENDA = 24
TITULO_SECAO = 60

from PIL import ImageFont
_FONTES = {}
def _fonte(neg, tam):
    k = (neg, tam)
    if k not in _FONTES:
        _FONTES[k] = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-%s.ttf" % ("Bold" if neg else "Regular"), tam * 10)
    return _FONTES[k]


def linhas_de(par, tamanho, largura_cm):
    """Quantas linhas o parágrafo ocupa (quebra por palavra, medindo com a fonte de mesma largura do Arial)."""
    larg = largura_cm / 2.54 * 72 * 10   # em décimos de ponto
    palavras = []
    for t in par:
        texto, neg, _, _ = trecho(t)
        for k, w in enumerate(texto.split(" ")):
            palavras.append((w, neg, k > 0 or (palavras and texto.startswith(" "))))
    n, x = 1, 0.0
    esp = _fonte(False, tamanho).getlength(" ")
    for w, neg, _ in palavras:
        if not w:
            x += esp; continue
        lw = _fonte(neg, tamanho).getlength(w)
        if x > 0 and x + esp + lw > larg:
            n += 1; x = lw
        else:
            x += (esp if x > 0 else 0) + lw
    return n


def altura_de(paragrafos, tamanho, largura_cm, linha=1.18, entre=0.35):
    lh = tamanho * linha / 72 * 2.54
    total = sum(linhas_de(p, tamanho, largura_cm) for p in paragrafos) * lh
    total += (len(paragrafos) - 1) * tamanho * entre * 2 / 72 * 2.54
    return total * 1.04 + 0.2   # 4% de folga para o PowerPoint


def trecho(t):
    if isinstance(t, str):
        return t, False, None, False
    t = tuple(t) + (False, None, False)[len(t) - 1:]
    return t[0], t[1], t[2], t[3]


def caixa(slide, x, y, w, h, nome):
    tb = slide.shapes.add_textbox(cm(x), cm(y), cm(w), cm(h))
    tb.name = nome
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    for lado in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
        setattr(tf, lado, 0)
    tf.vertical_anchor = MSO_ANCHOR.TOP
    return tb


def escrever(tf, paragrafos, tamanho, alinhar=PP_ALIGN.JUSTIFY, entre=0.35, linha=1.18, cor=PRETO, marcador=False, recuo=0.0):
    for i, par in enumerate(paragrafos):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = alinhar
        p.line_spacing = Pt(tamanho * linha)   # espaçamento exato, como no modelo
        p.space_after = Pt(tamanho * entre * 2) if i < len(paragrafos) - 1 else Pt(0)
        if recuo:
            pPr = p._p.get_or_add_pPr()
            pPr.set("marL", str(int(recuo * CM))); pPr.set("indent", str(int(-recuo * CM)))
        for t in par:
            texto, negrito, c, italico = trecho(t)
            r = p.add_run(); r.text = texto
            f = r.font; f.name = FONTE; f.size = Pt(tamanho); f.bold = bool(negrito); f.italic = bool(italico)
            f.color.rgb = c or cor
            rPr = r._r.get_or_add_rPr(); rPr.set("lang", "pt-BR")


def secao(slide, x, y, w, titulo, paragrafos, altura=None, tamanho=CORPO, **kw):
    t = caixa(slide, x, y, w, 2.4, f"Título: {titulo}")
    escrever(t.text_frame, [[(titulo, True, AZUL)]], TITULO_SECAO, alinhar=PP_ALIGN.LEFT, linha=1.0)
    if altura is None:
        altura = altura_de(paragrafos, tamanho, w, kw.get("linha", 1.18), kw.get("entre", 0.35))
    corpo = caixa(slide, x, y + 2.55, w, altura, f"Texto: {titulo}")
    escrever(corpo.text_frame, paragrafos, tamanho, **kw)
    return y + 2.55 + altura


def legenda(slide, x, y, w, rotulo, texto, h=None):
    if h is None:
        h = altura_de([[(rotulo + " ", True), texto]], LEGENDA, w, 1.1, 0)
    c = caixa(slide, x, y, w, h, f"Legenda: {rotulo}")
    escrever(c.text_frame, [[(rotulo + " ", True), texto]], LEGENDA, alinhar=PP_ALIGN.LEFT, linha=1.1)
    return y + h


def figura(slide, caminho, x, y, w, nome, descricao):
    from PIL import Image
    im = Image.open(caminho); h = w * im.height / im.width
    pic = slide.shapes.add_picture(str(caminho), cm(x), cm(y), cm(w), cm(h))
    pic.name = nome
    pic._element.nvPicPr.cNvPr.set("descr", descricao)
    return y + h


def tabela(slide, x, y, w, linhas, larguras, alturas):
    gf = slide.shapes.add_table(len(linhas), len(linhas[0]), cm(x), cm(y), cm(w), cm(sum(alturas)))
    gf.name = "Tabela 1"
    tbl = gf.table
    tblPr = tbl._tbl.tblPr
    tblPr.set("firstRow", "1"); tblPr.set("bandRow", "0")
    estilo = tblPr.find(qn("a:tableStyleId"))
    if estilo is None:
        estilo = etree.SubElement(tblPr, qn("a:tableStyleId"))
    estilo.text = "{2D5ABB26-0587-4C30-8999-92F81FD0307C}"   # "sem estilo, sem grade": as cores vêm daqui
    for j, l in enumerate(larguras):
        tbl.columns[j].width = cm(l)
    for i, a in enumerate(alturas):
        tbl.rows[i].height = cm(a)
    for i, linha in enumerate(linhas):
        for j, texto in enumerate(linha):
            cel = tbl.cell(i, j)
            cel.margin_left = cel.margin_right = cm(0.35); cel.margin_top = cel.margin_bottom = cm(0.15)
            cel.vertical_anchor = MSO_ANCHOR.MIDDLE
            cel.fill.solid()
            cel.fill.fore_color.rgb = AZUL if i == 0 else (RGBColor(0xF1, 0xF1, 0xF3) if i % 2 else RGBColor(0xFF, 0xFF, 0xFF))
            tf = cel.text_frame; tf.word_wrap = True
            partes = texto.split("\n")
            for k, parte in enumerate(partes):
                p = tf.paragraphs[0] if k == 0 else tf.add_paragraph()
                p.alignment = PP_ALIGN.LEFT if j == 0 else PP_ALIGN.CENTER
                r = p.add_run(); r.text = parte
                f = r.font; f.name = FONTE; f.size = Pt(LEGENDA if i == 0 else LEGENDA); f.bold = (i == 0 or j == 0)
                f.color.rgb = RGBColor(0xFF, 0xFF, 0xFF) if i == 0 else PRETO
                r._r.get_or_add_rPr().set("lang", "pt-BR")
    return y + sum(alturas)


def trocar_texto(shape, paragrafos):
    """Troca o texto de uma caixa do modelo mantendo o parágrafo e o estilo do primeiro trecho."""
    txBody = shape.text_frame._txBody
    ps = txBody.findall(qn("a:p"))
    modelos = []
    for p in ps:
        r = p.find(qn("a:r"))
        modelos.append((copy.deepcopy(p.find(qn("a:pPr"))), copy.deepcopy(r.find(qn("a:rPr")))))
        txBody.remove(p)
    for i, (texto, tam, negrito) in enumerate(paragrafos):
        pPr, rPr = modelos[min(i, len(modelos) - 1)]
        p = etree.SubElement(txBody, qn("a:p"))
        if pPr is not None:
            p.append(copy.deepcopy(pPr))
        r = etree.SubElement(p, qn("a:r"))
        rp = copy.deepcopy(rPr)
        rp.set("sz", str(int(tam * 100))); rp.set("b", "1" if negrito else "0"); rp.set("lang", "pt-BR")
        for k in ("err", "dirty"):
            rp.attrib.pop(k, None)
        for tag in ("a:latin", "a:ea", "a:cs", "a:sym"):
            e = rp.find(qn(tag))
            if e is not None:
                e.set("typeface", FONTE)
        r.append(rp)
        t = etree.SubElement(r, qn("a:t")); t.text = texto
    return shape


def painel(slide, x, y, w, h, cor, nome, raio=0.6):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cm(x), cm(y), cm(w), cm(h))
    s.name = nome
    s.adjustments[0] = raio / min(w, h)
    s.fill.solid(); s.fill.fore_color.rgb = cor
    s.line.fill.background(); s.shadow.inherit = False
    return s


def texto(slide, x, y, w, paragrafos, tamanho, nome, alinhar=PP_ALIGN.LEFT, cor=PRETO, linha=1.15, entre=0.3, h=None):
    if h is None:
        h = altura_de(paragrafos, tamanho, w, linha, entre)
    c = caixa(slide, x, y, w, h, nome)
    escrever(c.text_frame, paragrafos, tamanho, alinhar=alinhar, cor=cor, linha=linha, entre=entre)
    return y + h


def imagem(slide, caminho, x, y, w=None, h=None, nome="", descricao=""):
    from PIL import Image
    im = Image.open(caminho)
    if w is None: w = h * im.width / im.height
    if h is None: h = w * im.height / im.width
    pic = slide.shapes.add_picture(str(caminho), cm(x), cm(y), cm(w), cm(h))
    pic.name = nome
    pic._element.nvPicPr.cNvPr.set("descr", descricao)
    return w, h


# ----------------------------------------------------------------------------- textos
TITULO = "WAVE SENSE: DETECÇÃO DE MOVIMENTO HUMANO SEM CÂMERAS USANDO SINAIS WI-FI E ESP32"
AUTORES = "Augusto Donateli Simões e Daniel Elias Cardoso · Orientação: Diego Barcelos Rodrigues"
INSTITUICAO = "Instituto Federal do Espírito Santo (Ifes) – Campus Cachoeiro de Itapemirim, ES"

FRASE = "Duas placas Wi-Fi de baixo custo perceberam cada vez que uma pessoa cruzou entre elas. Até através de uma parede."
FRASE_APOIO = "A placa A envia mensagens Wi-Fi; a placa B mede como cada uma chegou. Quem se mexe muda os caminhos do sinal, e a medida treme. Sem câmera, sem nada preso ao corpo."
NUMEROS = [("7 de 7", "travessias percebidas, a 1,5 m"), ("5,9×", "a oscilação do sinal com a pessoa, comparada à sala vazia"), ("3,75 m", "através de uma parede, sem alarme com a sala vazia")]

INTRODUCAO = [
    ["O Wi-Fi está em quase todo lugar e faz mais do que levar internet: o sinal chega por vários caminhos, que se somam, e quem se mexe muda essa soma. O ",
     ("CSI", True), " (", ("Channel State Information", False, None, True),
     ") mede isso em 64 frequências a cada pacote (MA; ZHOU; WANG, 2019). É o sensoriamento por Wi-Fi, que ganhou padrão próprio em 2025 (IEEE, 2025)."],
    ["Dá para perceber pessoas sem câmera e sem nada no corpo. Mas até onde funciona, para que serve e quem mais poderia usar?"],
    [("Objetivo: ", True), "explorar essa tecnologia com duas placas ESP32 de baixo custo: medir o CSI, construir e testar um detector de movimento, inclusive através de parede, e mostrar ao público, ao vivo, o que ela faz, seus usos e seus riscos."],
]
HEDY = [[("Ciência Delas. ", True, DESTAQUE), "Em 1942, a atriz e inventora Hedy Lamarr patenteou, com George Antheil, o salto de frequência (MARKEY; ANTHEIL, 1942). Espalhar o sinal por várias frequências virou base da comunicação sem fio: o Wi-Fi de hoje usa 64 ao mesmo tempo, e são elas que o Wave Sense lê."]]
PASSOS = [("1  Placa A", "envia 50 mensagens Wi-Fi por segundo"), ("2  Placa B", "mede o CSI: 64 subportadoras"), ("3  Notebook", "decide a cada 0,2 s, ao vivo")]
METODOS = [
    [("Detector: ", True), "mede a oscilação de cada subportadora no último segundo, com cada pacote no mesmo volume. O limite vem da sala vazia (média + 3 desvios), e “movimento” exige 3 medidas seguidas acima dele, em Python e na demonstração."],
    [("Ajustes que fizeram funcionar: ", True), "a USB não dava conta de 100 pacotes/s (com 50, chegam de 76% a 92%), e o ganho automático fazia a sala vazia oscilar de 0,8 a 4,8; ajustar o volume de cada pacote resolveu."],
    [("Testes: ", True), "30 s de sala vazia e 30 s com uma pessoa: a 1,5 m, cruzando a linha entre as placas; a 3,75 m, andando atrás de uma parede."],
]
RESULTADOS = [
    ["A cada travessia, o sinal subiu até 5,9 vezes o nível da sala vazia, e o detector marcou as 7; a sala vazia deu 2 alarmes curtos em 30 s. Através da parede, a pessoa andando foi percebida quase o tempo todo, sem alarme com a sala vazia."],
    [("O que aprendemos sobre a tecnologia: ", True), "ela percebe movimento, não presença (quem fica parado não muda a soma), e atravessa paredes: útil e também um risco à privacidade."],
]
USOS = [
    ("Quem mora sozinho", "desenho-sozinho.png", "No Brasil, 5,7 milhões de idosos moram sozinhos (IBGE, 2024). Se até as 10h ninguém se mexeu, a casa avisa a família.",
     "Ilustração de dois dias numa linha do tempo: ontem, movimentos desde as 6h40; hoje, nenhum movimento até as 10h e um aviso para o celular da família."),
    ("Escombros", "desenho-escombros.png", "Um radar da NASA achou 4 pessoas vivas sob os escombros no Nepal, em 2015, pelos sinais vitais (NASA JPL, 2015). Queremos tentar com placas baratas.",
     "Ilustração de uma pessoa deitada num vão entre lajes caídas, entre as placas A e B, com ondinhas de respiração saindo do peito."),
]
CONCLUSAO = [
    ["Duas placas ESP32 e programas abertos perceberam movimento humano sem câmera, até através de parede, ao vivo no estande. E a tecnologia já chega às casas: nos EUA, uma operadora oferece isso no roteador, e os dados podem ir para a polícia com ordem judicial (BLEEPINGCOMPUTER, 2026)."],
    [("Próximos passos: ", True), "medir a respiração, que a mesma placa já captou (BURIMAS et al., 2024), e a taxa de acerto, em novas sessões. Defendemos consentimento e dados que não saem de casa, como no Wave Sense."],
]
REFERENCIAS = [
    ["BLEEPINGCOMPUTER. ", ("Comcast turns your Xfinity WiFi into a home motion detector", True), ". 2026. Disponível em: https://www.bleepingcomputer.com. Acesso em: 16 out. 2026."],
    ["BURIMAS, D. et al. Monitoring the sleep respiratory rate with low-cost microcontroller Wi-Fi in a controlled environment. ", ("Applied Sciences", True), ", v. 14, n. 15, 6458, 2024."],
    ["ESPRESSIF SYSTEMS. ", ("ESP-CSI", True), ". 2026. Disponível em: https://github.com/espressif/esp-csi. Acesso em: 15 out. 2026."],
    ["IBGE. ", ("Censo Demográfico 2022", True), ": composição domiciliar e óbitos informados. Rio de Janeiro: IBGE, 2024."],
    ["IEEE. ", ("IEEE 802.11bf-2025", True), ": WLAN sensing. Nova York: IEEE, 2025."],
    ["MA, Y.; ZHOU, G.; WANG, S. WiFi sensing with channel state information: a survey. ", ("ACM Computing Surveys", True), ", v. 52, n. 3, 2019."],
    ["MARKEY, H. K.; ANTHEIL, G. ", ("Secret communication system", True), ". Patente US 2.292.387, 1942."],
    ["NASA JPL. ", ("FINDER", True), ": Finding Individuals for Disaster and Emergency Response. Pasadena: JPL, 2015."],
]
USO_IA = "Uso de inteligência artificial: o assistente Claude (Anthropic) apoiou a escrita de código e de textos. Tudo foi revisado e testado pela equipe, e os dados foram medidos por nós."

# ----------------------------------------------------------------------------- montagem
pres = Presentation(str(AQUI / "modelo.pptx"))
slide = pres.slides[0]
por_nome = {sh.name: sh for sh in slide.shapes}

tit = trocar_texto(por_nome["TextBox 17"], [(TITULO, 60, True)])
lnSpc = tit.text_frame._txBody.find(qn("a:p")).find(qn("a:pPr")).find(qn("a:lnSpc"))
lnSpc.find(qn("a:spcPts")).set("val", str(int(60 * 1.06 * 100)))
tit.left, tit.top, tit.width = cm(4.0), cm(23.9), cm(82.0)
aut = trocar_texto(por_nome["TextBox 8"], [(AUTORES, 40, True), (INSTITUICAO, 30, False)])
aut.top = cm(29.0)
p2 = aut.text_frame._txBody.findall(qn("a:p"))[1].find(qn("a:pPr")).find(qn("a:lnSpc"))
p2.find(qn("a:spcPts")).set("val", str(30 * 120))
for nome in ["Group 11", "TextBox 16", "Group 18", "Group 21", "Group 24", "Group 27", "Group 30", "TextBox 33"]:
    el = por_nome[nome]._element
    el.getparent().remove(el)

X0, X1 = 2.85, 85.75                    # a linha do modelo
W = 40.2; XE, XD = X0, X1 - W           # duas colunas
GAP, FUNDO = 1.0, 112.4

# --- a faixa escura: a frase, os números, o desenho e o sinal real
HY, HH = 35.0, 15.4
painel(slide, X0, HY, X1 - X0, HH, TELA, "Faixa: o resultado", raio=0.8)
# da direita para a esquerda: o sinal real, o desenho e, no espaço que sobra, a frase e os números
IH = HH - 3.4                                   # altura das duas imagens (a legenda vai embaixo)
cw = IH * 19.0 / 15.0
cx = X1 - 1.4 - cw
from PIL import Image as _I
_c = _I.open(FIG / "desenho-caminhos.png"); iw = IH * _c.width / _c.height
ix = cx - 1.6 - iw
tx = X0 + 1.6; tw = ix - 1.8 - tx
y = texto(slide, tx, HY + 1.4, tw, [[(FRASE, True, TINTA)]], 44, "Frase principal", cor=TINTA, linha=1.08)
texto(slide, tx, y + 0.45, tw, [[(FRASE_APOIO, False, APAGADO)]], 24, "Como funciona, em uma frase", cor=APAGADO, linha=1.15)
nw = tw / 3
for k, (num, rot) in enumerate(NUMEROS):
    texto(slide, tx + k * nw, HY + HH - 5.4, nw - 0.5, [[(num, True, ROSA_TELA)]], 64, f"Número {k + 1}", linha=1.0, h=2.4)
    texto(slide, tx + k * nw, HY + HH - 2.9, nw - 0.6, [[(rot, False, TINTA)]], 24, f"Rótulo {k + 1}", linha=1.08, h=2.2)
imagem(slide, FIG / "desenho-caminhos.png", ix, HY + 1.2, h=IH, nome="Desenho: caminhos",
       descricao="Desenho: placas A e B numa sala; o sinal vai direto e rebatendo no teto e no chão; uma pessoa no meio do caminho.")
texto(slide, ix, HY + 1.2 + IH + 0.35, iw, [[("Figura 1: ", True, TINTA), ("os caminhos do sinal (desenho).", False, APAGADO)]], 24, "Legenda do desenho", linha=1.1)
imagem(slide, FIG / "csi-cruzando.png", cx, HY + 1.2, h=IH, nome="Sinal real",
       descricao="Linhas brancas empilhadas sobre fundo preto, medidas pela placa B enquanto uma pessoa cruzava entre as placas: as linhas do meio sobem num relevo alto.")
texto(slide, cx, HY + 1.2 + IH + 0.35, cw, [[("Figura 2: ", True, TINTA), ("sinal real, pessoa cruzando.", False, APAGADO)]], 24, "Legenda do sinal real", linha=1.1)

TOPO = HY + HH + 1.3

def coluna_esquerda():
    y = secao(slide, XE, TOPO, W, "INTRODUÇÃO", INTRODUCAO)
    # Ciência Delas: o retrato da Hedy Lamarr feito com as linhas do sinal
    hy = y + 0.7
    alt_txt = altura_de(HEDY, LEGENDA, W - 8.6, 1.12, 0)
    hh = max(7.2, alt_txt + 1.2)
    painel(slide, XE, hy, W, hh, ROSA_FUNDO, "Ciência Delas", raio=0.5)
    rw, _ = imagem(slide, FIG / "desenho-salto.png", XE + 0.7, hy + 0.7, h=hh - 1.4, nome="Retrato de Hedy Lamarr",
                   descricao="Retrato de Hedy Lamarr desenhado com linhas horizontais, como as do sinal (de uma foto de 1940, domínio público).")
    tx = XE + 0.7 + rw + 0.9
    alt_txt = altura_de(HEDY, LEGENDA, XE + W - 0.8 - tx, 1.12, 0)
    texto(slide, tx, hy + (hh - alt_txt) / 2, XE + W - 0.8 - tx, HEDY, LEGENDA, "Texto: Ciência Delas", linha=1.12, entre=0)
    y = hy + hh
    # métodos: o desenho das três peças e os três passos embaixo
    y = secao(slide, XE, y + GAP, W, "MATERIAIS E MÉTODOS", [])
    PW = W * 0.72; px0 = XE + (W - PW) / 2
    pw, ph = imagem(slide, FIG / "desenho-viabilidade.png", px0, y + 0.2, w=PW, nome="Desenho: montagem",
                    descricao="Desenho: placa A envia pacotes para a placa B, que está ligada por cabo a um notebook mostrando as linhas do sinal.")
    y = y + 0.2 + ph + 0.15
    y = texto(slide, XE, y, W, [[("Figura 3: ", True), "a montagem (desenho)."]], LEGENDA, "Legenda: montagem", alinhar=PP_ALIGN.CENTER, cor=CINZA, linha=1.05) + 0.3
    larg = 10.2
    alt = max(altura_de([[(a + " ", True), b]], LEGENDA, larg, 1.1, 0) for a, b in PASSOS)
    for k, ((a, b), f) in enumerate(zip(PASSOS, (0.16, 0.54, 0.84))):   # onde ficam a placa A, a placa B e o notebook no desenho
        x = min(max(px0 + f * PW - larg / 2, XE), XE + W - larg)
        texto(slide, x, y, larg, [[(a, True, DESTAQUE)], [b]], LEGENDA, f"Passo {k + 1}", alinhar=PP_ALIGN.CENTER, linha=1.1, entre=0.05,
              h=alt + 0.6)
    y += alt + 0.9
    y = texto(slide, XE, y, W, METODOS, CORPO, "Texto: métodos", alinhar=PP_ALIGN.JUSTIFY, linha=1.18, entre=0.35)
    return y


def coluna_direita():
    y = secao(slide, XD, TOPO, W, "RESULTADOS E DISCUSSÃO", [])
    fw, fh = imagem(slide, FIG / "figura-resultado.png", XD, y - 0.3, w=W, nome="Figura: resultado",
                    descricao="Dois gráficos de 30 segundos. A 1,5 m, a linha da pessoa sobe acima do limite 7 vezes, numeradas de 1 a 7, até 5,9 vezes a sala vazia. A 3,75 m com parede, a linha da pessoa fica acima do limite quase o tempo todo; a da sala vazia fica abaixo.")
    y = y - 0.3 + fh + 0.45
    y = texto(slide, XD, y, W, [[("Figura 4: ", True), "oscilação medida nos testes, em vezes a da sala vazia; em rosa, onde o detector disse “movimento”."]], LEGENDA, "Legenda: resultado", cor=CINZA, linha=1.1)
    y = texto(slide, XD, y + 0.6, W, RESULTADOS, CORPO, "Texto: resultados", alinhar=PP_ALIGN.JUSTIFY, linha=1.18, entre=0.35)
    # para que serve: dois cartões
    y = texto(slide, XD, y + 0.8, W, [[("Para que serve", True, AZUL)]], 40, "Título: para que serve", linha=1.0)
    larg = (W - 1.0) / 2
    alt_img = 0
    for k, (nome, arq, txt, descr) in enumerate(USOS):
        x = XD + k * (larg + 1.0)
        CARTAO = 8.0
        painel(slide, x, y + 0.3, larg, CARTAO, TELA, f"Fundo: {nome}", raio=0.4)
        from PIL import Image
        im = Image.open(FIG / arq); r = im.width / im.height
        iw = min(larg - 0.6, (CARTAO - 0.6) * r); ih = iw / r
        imagem(slide, FIG / arq, x + (larg - iw) / 2, y + 0.3 + (CARTAO - ih) / 2, w=iw, nome=f"Desenho: {nome}", descricao=descr)
        alt_img = CARTAO
    y += 0.3 + alt_img + 0.35
    alt = max(altura_de([[(f"Figura 5: {n}. ", True), t]], LEGENDA, larg, 1.1, 0) for n, _, t, _ in USOS)
    for k, (nome, arq, txt, descr) in enumerate(USOS):
        texto(slide, XD + k * (larg + 1.0), y, larg, [[(f"Figura {5 + k}: {nome}. ", True, DESTAQUE), txt]], LEGENDA, f"Texto: {nome}", linha=1.1, h=alt)
    y += alt
    y = secao(slide, XD, y + GAP, W, "CONCLUSÃO", CONCLUSAO)
    return y


y_esq = coluna_esquerda()
y_dir = coluna_direita()
# referências: faixa inteira embaixo, em duas colunas
ry = max(y_esq, y_dir) + GAP
t = caixa(slide, X0, ry, X1 - X0, 2.4, "Título: REFERÊNCIAS")
escrever(t.text_frame, [[("REFERÊNCIAS", True, AZUL)]], 40, alinhar=PP_ALIGN.LEFT, linha=1.0)
ry += 1.8
metade = (len(REFERENCIAS) + 1) // 2
fim = ry
for k, refs in enumerate([REFERENCIAS[:metade], REFERENCIAS[metade:]]):
    yk = texto(slide, XE if k == 0 else XD, ry, W, refs, 24, f"Referências {k + 1}", linha=1.05, entre=0.12)
    if k == 1:   # a declaração de uso de IA fecha a coluna da direita, que tem menos referências
        yk = texto(slide, XD, yk + 0.35, W, [[(USO_IA, False, CINZA, True)]], 24, "Uso de IA", cor=CINZA, linha=1.08)
    fim = max(fim, yk)
print(f"esquerda {y_esq:.1f} cm, direita {y_dir:.1f} cm, fim {fim:.1f} cm (limite {FUNDO} cm)")
pres.save(str(SAIDA))
print("salvo:", SAIDA)

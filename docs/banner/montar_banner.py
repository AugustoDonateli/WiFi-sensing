"""Monta o banner da XV JACITEC no modelo oficial (90 x 120 cm), com os textos e as figuras do Wave Sense."""
import copy
import sys
from pathlib import Path

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

AQUI = Path(__file__).resolve().parent
FIG = Path("/home/user/WiFi-sensing/dados/graficos/banner")
SAIDA = Path(sys.argv[1]) if len(sys.argv) > 1 else AQUI / "banner-wave-sense.pptx"
CM = 360000
cm = lambda x: Emu(int(round(x * CM)))

AZUL = RGBColor(0x20, 0x28, 0x4D)      # títulos das seções no modelo
PRETO = RGBColor(0, 0, 0)
DESTAQUE = RGBColor(0xC8, 0x21, 0x5A)  # o magenta do cabeçalho, mais escuro para imprimir
CINZA = RGBColor(0x55, 0x55, 0x55)
FONTE = "Arial"

CORPO = 26       # pt (o modelo pede 32, podendo reduzir até 24)
LEGENDA = 24
TITULO_SECAO = 60

# ----------------------------------------------------------------------------- textos
TITULO = "WAVE SENSE: DETECÇÃO DE MOVIMENTO HUMANO SEM CÂMERAS USANDO SINAIS WI-FI E ESP32"
AUTORES = "[Autor(a) 1], [Autor(a) 2] e [Autor(a) 3] · Orientação: [Professor(a)]"
INSTITUICAO = "[Nome da escola] – [Cidade], ES"

# Cada parágrafo é uma lista de trechos: texto, ou (texto, negrito, cor, itálico).
INTRODUCAO = [
    ["Para perceber uma queda em casa, hoje se usa câmera, que expõe a intimidade, ou pulseira, que a pessoa precisa lembrar de usar. Quedas são a segunda maior causa de morte por lesão acidental no mundo (OMS, 2021)."],
    ["O Wi-Fi é uma onda que chega ao receptor por vários caminhos, direto e rebatido em paredes e pessoas, e esses caminhos se somam. Quando alguém se mexe, a soma muda. O ",
     ("CSI", True), " (", ("Channel State Information", False, None, True),
     ") mostra essa soma em 64 frequências, as subportadoras, a cada pacote (Figura 1). Ele já foi usado para perceber movimento e quedas (MA; ZHOU; WANG, 2019; WANG; WU; NI, 2017)."],
    [("Objetivo: ", True), "investigar se o CSI medido por duas placas ESP32 de baixo custo permite detectar movimento humano sem câmeras, e mostrar ao público os limites da técnica e os riscos à privacidade."],
    [("Ciência Delas: ", True, DESTAQUE), "em 1942, a atriz e inventora Hedy Lamarr patenteou, com George Antheil, o salto de frequência (MARKEY; ANTHEIL, 1942), usado até hoje no Bluetooth e presente na primeira versão do Wi-Fi, de 1997."],
]
METODOS = [
    [("Placas: ", True), "duas ESP32 com os programas oficiais e abertos da Espressif, ESP-CSI e ESP-IDF 5.5.5 (ESPRESSIF SYSTEMS, 2026). A placa A envia cerca de 50 pacotes por segundo; a placa B mede o CSI de cada um e o envia ao notebook pela USB (Figura 2)."],
    [("Coleta: ", True), "um programa em Python grava 30 s de cada situação, com as condições anotadas."],
    [("Detector: ", True), "a cada 0,2 s, mede a oscilação do sinal no último segundo (o desvio padrão de cada subportadora, em média). Antes, cada pacote é levado ao mesmo volume, para tirar o efeito do ganho automático da placa B. O limite vem da sala vazia (média + 3 desvios), e \u201cmovimento\u201d exige 3 medidas seguidas acima dele. A mesma regra roda no Python e na tela da demonstração, conferida por testes."],
    [("Testes, em casa: ", True), "sala vazia e uma pessoa cruzando a linha entre as placas, a 1,5 m sem parede e a 3,75 m com uma parede no meio."],
]
RESULTADOS = [
    [("Pacotes: ", True), "a cerca de 91 pacotes/s, com o roteador da casa ao lado, só chegavam de 30% a 49%: a USB a 921.600 baud transmite umas 72 linhas de CSI por segundo. A 50 por segundo e longe do roteador, chegaram de 76% a 92%."],
    [("Ganho automático: ", True), "sem a correção do volume, a oscilação da sala vazia pulava sozinha de 0,8 a 4,8. Com ela, ficou estável."],
    [("Detecção (Tabela 1 e Figura 3): ", True), "a 1,5 m, as 7 travessias da linha foram marcadas, uma a uma, e a sala vazia deu 2 alarmes curtos em 30 s. Através da parede, não houve alarme com a sala vazia, e o andar foi percebido quase o tempo todo."],
    [("Limites: ", True), "uma gravação de 30 s por situação, em casa: mostra que funciona, mas ainda não é uma taxa de acerto."],
]
TABELA = [
    ["Montagem", "Oscilação típica\n(vazio / andando)", "Sala vazia\n(30 s)", "Pessoa andando\n(30 s)"],
    ["1,5 m, sem parede", "0,41 / 0,64", "2 alarmes curtos", "7 de 7 travessias"],
    ["3,75 m, com parede", "0,66 / 1,16", "nenhum alarme", "quase o tempo todo"],
]
CONCLUSAO = [
    ["Duas placas ESP32 e programas abertos bastaram para detectar movimento humano sem câmera, inclusive através de uma parede. Foi essencial limitar a taxa de pacotes ao que a USB transmite e corrigir o ganho automático."],
    ["O sistema percebe movimento, não presença: uma pessoa parada não faz o sinal oscilar. E, como o sinal atravessa paredes, a técnica poderia revelar se há gente num cômodo, o que pede regras de uso e consentimento. Desde 2025 existe um padrão só para sensoriamento por Wi-Fi (IEEE, 2025)."],
    [("Próximos passos: ", True), "mais gravações, em outros dias e lugares, para medir a taxa de acerto, e testar a detecção de quedas."],
]
REFERENCIAS = [
    ["ESPRESSIF SYSTEMS. ", ("ESP-CSI", True), ". GitHub, 2026. Disponível em: https://github.com/espressif/esp-csi. Acesso em: 15 out. 2026."],
    ["IEEE. ", ("IEEE 802.11bf-2025", True), ": WLAN sensing. Nova York: IEEE, 2025."],
    ["MA, Y.; ZHOU, G.; WANG, S. WiFi sensing with channel state information: a survey. ", ("ACM Computing Surveys", True), ", v. 52, n. 3, 2019."],
    ["MARKEY, H. K. (Hedy Lamarr); ANTHEIL, G. ", ("Secret communication system", True), ". Patente US 2.292.387, 11 ago. 1942."],
    ["OMS \u2013 ORGANIZAÇÃO MUNDIAL DA SAÚDE. ", ("Falls", True), ". Genebra: OMS, 26 abr. 2021. Disponível em: https://www.who.int/news-room/fact-sheets/detail/falls. Acesso em: 15 out. 2026."],
    ["WANG, Y.; WU, K.; NI, L. M. WiFall: device-free fall detection by wireless networks. ", ("IEEE Transactions on Mobile Computing", True), ", v. 16, n. 2, 2017."],
]
USO_IA = "Uso de inteligência artificial: o assistente Claude (Anthropic) apoiou a escrita de código e de textos. Tudo foi revisado e testado pela equipe, e os dados foram medidos por nós."

# ----------------------------------------------------------------------------- ajudantes
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


# ----------------------------------------------------------------------------- montagem
pres = Presentation(str(AQUI / "modelo.pptx"))
slide = pres.slides[0]
por_nome = {sh.name: sh for sh in slide.shapes}

# título, autores e instituição: as caixas do próprio modelo
tit = trocar_texto(por_nome["TextBox 17"], [(TITULO, 60, True)])
lnSpc = tit.text_frame._txBody.find(qn("a:p")).find(qn("a:pPr")).find(qn("a:lnSpc"))
lnSpc.find(qn("a:spcPts")).set("val", str(int(60 * 1.06 * 100)))
tit.left, tit.top, tit.width = cm(4.0), cm(23.9), cm(82.0)
aut = trocar_texto(por_nome["TextBox 8"], [(AUTORES, 40, True), (INSTITUICAO, 30, False)])
aut.top = cm(29.0)
p2 = aut.text_frame._txBody.findall(qn("a:p"))[1].find(qn("a:pPr")).find(qn("a:lnSpc"))
p2.find(qn("a:spcPts")).set("val", str(30 * 120))

# o que era só exemplo no modelo sai: as seções de texto, a moldura "SUA IMAGEM AQUI" e a legenda
for nome in ["Group 11", "TextBox 16", "Group 18", "Group 21", "Group 24", "Group 27", "Group 30", "TextBox 33"]:
    el = por_nome[nome]._element
    el.getparent().remove(el)

XE, XD, W = 2.85, 45.05, 40.7   # centrado na linha do modelo (2,7 a 85,8 cm)
TOPO, GAP, FUNDO = 35.0, 0.85, 112.4

def colunas():
    # coluna da esquerda: introdução, métodos (com o esquema), resultados e a tabela
    y = secao(slide, XE, TOPO, W, "INTRODUÇÃO", INTRODUCAO)
    y = secao(slide, XE, y + GAP, W, "MATERIAIS E MÉTODOS", METODOS)
    y = figura(slide, FIG / "figura-montagem.png", XE, y + 0.3, W, "Figura 2",
               "Esquema da montagem: a placa A envia pacotes Wi-Fi, que chegam à placa B por um caminho direto e por caminhos rebatidos; uma pessoa cruza a linha entre as placas; a placa B manda o CSI ao notebook pela USB.")
    y = legenda(slide, XE, y + 0.1, W, "Figura 2:", "esquema da montagem (desenho). O sinal chega à placa B por vários caminhos, que se somam.")
    y = secao(slide, XE, y + GAP, W, "RESULTADOS E DISCUSSÃO", RESULTADOS)
    y = legenda(slide, XE, y + 0.45, W, "Tabela 1:", "detector nas gravações reais de 30 s, com o limite calibrado na sala vazia de cada montagem.")
    y = tabela(slide, XE, y + 0.2, W, TABELA, [10.3, 10.6, 9.0, 10.8], [2.4, 1.5, 1.5])
    y_esq = y
    # coluna da direita: as duas figuras de dados, conclusão e referências
    y = figura(slide, FIG / "figura1-csi-real.png", XD, TOPO + 0.3, W, "Figura 1",
               "Duas pilhas de linhas brancas sobre fundo preto. À esquerda, sala vazia: linhas quase iguais. À direita, pessoa cruzando a linha entre as placas: as linhas do meio sobem num relevo alto.")
    y = legenda(slide, XD, y + 0.25, W, "Figura 1:", "CSI real medido pela placa B, 4,8 s de cada gravação. Cada linha é uma leitura (média de 0,1 s) das 64 subportadoras; a de baixo é a mais nova. Sala vazia × pessoa cruzando a linha, a 1,5 m.")
    y = figura(slide, FIG / "figura2-tremor-30s.png", XD, y + 0.6, W, "Figura 3",
               "Três gráficos da oscilação do sinal ao longo de 30 segundos, com a linha tracejada do limite e faixas onde o detector disse movimento: sala vazia com dois alarmes curtos; pessoa cruzando a linha com sete picos marcados de 1 a 7; pessoa andando atrás da parede, marcada quase o tempo todo.")
    y = legenda(slide, XD, y + 0.1, W, "Figura 3:", "oscilação do sinal nos 30 s de cada gravação, pela mesma regra da tela. Os números marcam as 7 travessias.")
    y = secao(slide, XD, y + GAP, W, "CONCLUSÃO", CONCLUSAO)
    y = secao(slide, XD, y + GAP, W, "REFERÊNCIAS", REFERENCIAS, tamanho=LEGENDA, alinhar=PP_ALIGN.LEFT, entre=0.25, linha=1.12)
    c = caixa(slide, XD, y + 0.6, W, altura_de([[USO_IA]], LEGENDA, W, 1.12, 0), "Uso de IA")
    escrever(c.text_frame, [[(USO_IA, False, CINZA, True)]], LEGENDA, alinhar=PP_ALIGN.LEFT, linha=1.12)
    y_dir = y + 0.6 + altura_de([[USO_IA]], LEGENDA, W, 1.12, 0)
    return y_esq, y_dir

y_esq, y_dir = colunas()
print(f"esquerda termina em {y_esq:.1f} cm, direita em {y_dir:.1f} cm (limite {FUNDO} cm)")
pres.save(str(SAIDA))
print("salvo:", SAIDA)

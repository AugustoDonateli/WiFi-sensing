"""Monta o banner da Fecinc 2026 (90 x 120 cm) em HTML e gera o PDF para a gráfica.

    python docs/banner-fecinc/figuras.py     # gráficos com os dados reais (SVG) e os números
    python docs/banner-fecinc/heroi.py       # ilustração do topo (vetor)
    python docs/banner-fecinc/montar.py      # banner.html
    node docs/banner-fecinc/exportar.js      # banner-fecinc.pdf e previa.png

Todo número do texto vem de fig/numeros.json (coletas reais da sessão S0, 15/10/2026, com a regra do
detector de hoje). A silhueta da ilustração foi feita com IA generativa; o banner diz isso, como pede o
regulamento da Fecinc (item 11).
"""
import json
import re
from pathlib import Path

import numpy as np
import segno
from PIL import Image

AQUI = Path(__file__).resolve().parent
FIG = AQUI / "fig"
NUM = json.loads((FIG / "numeros.json").read_text())


def svg_inline(caminho, classe):
    """Põe um SVG do matplotlib dentro do HTML (o texto usa as fontes da página)."""
    s = Path(caminho).read_text()
    s = s[s.index("<svg"):]
    s = re.sub(r'<svg([^>]*?) width="[^"]*" height="[^"]*"', r'<svg\1', s, count=1)
    return s.replace("<svg", f'<svg class="{classe}" preserveAspectRatio="xMidYMid meet"', 1)


def contorno_pessoa(altura=60.0):
    """Contorno da mesma silhueta da ilustração, para o desenho da montagem."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    im = np.asarray(Image.open(AQUI / "img" / "silhueta-ia.png").convert("L").reduce(4)) > 128
    lin, col = np.where(im)
    im = im[lin.min() - 2:lin.max() + 3, col.min() - 2:col.max() + 3]
    esc = altura / im.shape[0]
    cs = plt.contour(np.arange(im.shape[1]) * esc, np.arange(im.shape[0]) * esc, im.astype(float), levels=[0.5])
    seg = max(cs.allsegs[0], key=len)
    plt.close("all")
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in seg[::2]) + " Z", im.shape[1] * esc


def montagem_svg():
    """A montagem, em traço de tinta: A envia, a onda chega por vários caminhos, B mede, o notebook decide."""
    pessoa, largura_p = contorno_pessoa(58)
    tinta, cinza, laranja = "#141413", "#8C8C86", "#FF5A1F"

    def placa(x, y, letra):
        return (f'<rect x="{x - 6}" y="{y - 9}" width="12" height="18" rx="1.3" fill="#F5F3EE" stroke="{tinta}" stroke-width="0.9"/>'
                f'<rect x="{x - 3.2}" y="{y - 6.5}" width="6.4" height="7" rx="0.5" fill="none" stroke="{tinta}" stroke-width="0.7"/>'
                f'<path d="M{x},{y + 9} V{y + 40} M{x - 7},{y + 40} H{x + 7}" stroke="{tinta}" stroke-width="0.9" fill="none"/>'
                f'<text x="{x}" y="{y - 13}" text-anchor="middle" font-family="Instrument Serif" font-style="italic" font-size="13" fill="{tinta}">{letra}</text>')

    ax, bx, y = 22, 262, 52
    caminhos = (f'<path d="M{ax + 6},{y} L{bx - 6},{y}" stroke="{laranja}" stroke-width="1.1" stroke-dasharray="3 2.4" fill="none"/>'
                f'<path d="M{ax + 6},{y - 4} L142,8 L{bx - 6},{y - 4}" stroke="{cinza}" stroke-width="0.8" stroke-dasharray="2.4 2.4" fill="none"/>'
                f'<path d="M{ax + 6},{y + 4} L120,104 L{bx - 6},{y + 4}" stroke="{cinza}" stroke-width="0.8" stroke-dasharray="2.4 2.4" fill="none"/>'
                f'<path d="M84,8 H210 M60,104 H190" stroke="{cinza}" stroke-width="0.6"/>'
                f'<text x="214" y="10" font-family="Geist Mono" font-size="5.4" fill="{cinza}">PAREDE</text>'
                f'<text x="194" y="106" font-family="Geist Mono" font-size="5.4" fill="{cinza}">MÓVEL</text>')
    notebook = (f'<rect x="306" y="34" width="56" height="36" rx="2" fill="none" stroke="{tinta}" stroke-width="0.9"/>'
                f'<path d="M298,73 H370 L366,77 H302 Z" fill="none" stroke="{tinta}" stroke-width="0.9"/>'
                + "".join(f'<path d="M312,{40 + i * 3.2} C324,{37 + i * 3.2} 334,{44 + i * 3.2} 356,{40 + i * 3.2}" stroke="{tinta}" stroke-width="0.5" fill="none"/>' for i in range(9))
                + f'<path d="M{bx + 6},{y + 6} C285,74 292,80 302,75" stroke="{tinta}" stroke-width="0.8" fill="none"/>')
    px = 150 - largura_p / 2
    gente = f'<g transform="translate({px:.1f},26)"><path d="{pessoa}" fill="#F5F3EE" stroke="{tinta}" stroke-width="0.9" stroke-linejoin="round"/></g>'
    return (f'<svg class="montagem" viewBox="0 3 390 106" xmlns="http://www.w3.org/2000/svg">{caminhos}{gente}'
            f'{placa(ax, y, "A")}{placa(bx, y, "B")}{notebook}</svg>')


def qr_svg(url):
    q = segno.make(url, error="m")
    m = q.matrix
    n = len(m)
    caixas = "".join(f'<rect x="{c}" y="{r}" width="1.02" height="1.02"/>' for r, linha in enumerate(m) for c, v in enumerate(linha) if v)
    return f'<svg class="qr" viewBox="-2 -2 {n + 4} {n + 4}" xmlns="http://www.w3.org/2000/svg"><rect x="-2" y="-2" width="{n + 4}" height="{n + 4}" fill="#F5F3EE"/><g fill="#141413">{caixas}</g></svg>'


def br(x, casas=1):
    return f"{x:.{casas}f}".replace(".", ",")


def html():
    perto, parede = NUM["perto_1_5m"], NUM["parede_3_75m"]
    travessias = len(perto["picos_acima_do_limite"])
    assert travessias == 7 and perto["alarmes_sala_vazia"] == 0 and parede["alarmes_sala_vazia"] == 0
    pico = br(perto["pico_x"])
    pct_parede = round(parede["fracao_movimento"] * 100)
    heroi = (AQUI / "img" / "heroi-contorno.svg").read_text()
    heroi = heroi.replace('width="900mm" height="440mm"', 'class="heroi-arte" preserveAspectRatio="xMidYMax slice"')
    css = (AQUI / "estilo.css").read_text()
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Wave Sense · Fecinc 2026</title>
<link rel="stylesheet" href="../../demo/fontes.css">
<style>{css}</style></head>
<body><div class="pagina">

<header class="heroi">
  {heroi}
  <div class="topo"><span>Fecinc 2026 · Feira de Ciências e Inovação Capixaba</span><span>Ifes · Campus Cachoeiro de Itapemirim</span></div>
  <h1 class="manchete">O Wi<span class="hifen">-</span>Fi percebe<br>quando <em>você</em> passa.</h1>
</header>
<p class="fonte-ia">Ilustração do topo. Fonte: desenvolvido pelo autor utilizando inteligência artificial generativa (silhueta); as linhas foram desenhadas em código.</p>

<section class="identidade">
  <h2 class="titulo">Wave Sense: detecção de movimento humano sem câmeras usando sinais Wi-Fi e ESP32</h2>
  <p class="autores">Augusto Donateli Simões e Daniel Elias Cardoso <span>·</span> Orientação: Diego Barcelos Rodrigues</p>
  <p class="escola">Instituto Federal do Espírito Santo (Ifes) – Campus Cachoeiro de Itapemirim, ES</p>
</section>

<section class="numeros">
  <div><b>{travessias} de {travessias}</b><span>travessias percebidas, com as placas a 1,5 m uma da outra</span></div>
  <div><b>0</b><span>alarmes falsos nos 30 s de sala vazia, nas duas montagens</span></div>
  <div><b>3,75 m</b><span>e uma parede no meio: a pessoa andando foi percebida em {pct_parede}% do tempo</span></div>
</section>

<main class="corpo">
  <div class="faixa duas">
    <div>
      <section>
        <h3><i>01</i>Introdução</h3>
        <p>O sinal do Wi-Fi chega à antena por vários caminhos: direto e rebatendo em paredes, móveis e pessoas. Os caminhos se somam, e quem se mexe muda a soma. O <b>CSI</b> (<em>Channel State Information</em>) mede essa soma em 64 frequências a cada pacote (MA; ZHOU; WANG, 2019). Desde 2025, esse uso do Wi-Fi tem padrão próprio: o IEEE 802.11bf.</p>
      </section>
      <section>
        <h3><i>02</i>Objetivo</h3>
        <p>Medir o CSI com duas placas ESP32 de baixo custo, construir e testar um detector de movimento, inclusive através de parede, e mostrar ao público o que essa tecnologia faz e quais riscos traz.</p>
      </section>
      <p class="testes"><b>Testes:</b> 30 s de sala vazia e 30 s com uma pessoa, em duas montagens: placas a 1,5 m, com a pessoa cruzando a linha entre elas; e a 3,75 m, andando atrás de uma parede.</p>
      <div class="feira">
        <h3><i>22/10</i>Depois da primeira feira</h3>
        <p>Na feira de 22/10, com centenas de celulares por perto, chegavam só 20% a 40% dos pacotes. Depois dela: detector com janela de 2 s (funciona com 10 pacotes por segundo) e firmware próprio, que escuta só a placa A e procura o canal mais livre (em teste).</p>
      </div>
    </div>
    <section>
      <h3><i>03</i>Metodologia</h3>
      {montagem_svg()}
      <ol class="passos">
        <li><b>Placa A</b> envia 50 pacotes Wi-Fi por segundo (ESP-NOW).</li>
        <li><b>Placa B</b> mede o CSI de cada pacote: 64 subportadoras.</li>
        <li><b>Notebook</b> decide a cada 0,2 s: parado ou movimento.</li>
      </ol>
      <p><b>Oscilação:</b> quanto cada subportadora variou nos últimos 2 s, com o volume dos pacotes igualado (o ganho automático da placa B muda tudo de uma vez). <b>Limite:</b> média + 3 desvios da sala vazia. <b>Movimento:</b> 3 medidas seguidas acima dele.</p>
    </section>
  </div>

  <section class="resultados">
    <h3><i>04</i>Resultados e discussão</h3>
    <div class="faixa duas">
      <figure class="csi">
        <div><span class="rotulo">Sala vazia</span>{svg_inline(FIG / "csi-vazio.svg", "linhas")}</div>
        <div><span class="rotulo">Pessoa cruzando</span>{svg_inline(FIG / "csi-cruzando.svg", "linhas")}</div>
        <figcaption><b>Figura 1.</b> O sinal medido (placas a 1,5 m), em linhas empilhadas como na tela do estande. Cada linha é um instante; a mais nova fica embaixo.</figcaption>
      </figure>
      <figure class="graficos">
        {svg_inline(FIG / "oscilacao-perto.svg", "grafico")}
        <figcaption><b>Figura 2.</b> Oscilação, em vezes a da sala vazia. Em laranja claro, onde o detector marcou movimento; os números são as travessias.</figcaption>
      </figure>
    </div>
    <div class="texto-duas">
      <div>
        <p>Cada travessia fez o sinal oscilar até <b>{pico} vezes</b> o da sala vazia, e as {travessias} caíram em trechos marcados como movimento (a 2 e a 3 ficaram num trecho só). Atrás da parede, a 3,75 m, a pessoa foi marcada em {pct_parede}% do tempo. Nenhum alarme falso com a sala vazia, nas duas montagens.</p>
        <p><b>O que aprendemos:</b> a tecnologia percebe movimento, não presença: quem fica parado não muda a soma. E atravessa paredes, o que é útil e também um risco à privacidade.</p>
        <p class="limite"><b>Limite:</b> uma gravação de 30 s por situação, em casa; ainda não é uma taxa de acerto.</p>
      </div>
      <section class="conclusao">
        <h3><i>05</i>Considerações finais</h3>
        <p>Duas placas de baixo custo e programas abertos perceberam movimento humano sem câmera, até através de parede. A ideia pode avisar a família quando quem mora sozinho não se mexe (5,7 milhões de idosos moram sozinhos no Brasil; IBGE, 2024) ou ajudar a achar pessoas sob escombros (NASA JPL, 2015), com consentimento e dados que não saem de casa. <b>Próximos passos:</b> medir a respiração (BURIMAS et al., 2024) e a taxa de acerto.</p>
      </section>
    </div>
  </section>
</main>

<footer class="rodape">
  <div class="refs">
    <h4>Referências</h4>
    <p>BURIMAS, D. et al. Monitoring the sleep respiratory rate with low-cost microcontroller Wi-Fi in a controlled environment. <b>Applied Sciences</b>, v. 14, n. 15, 6458, 2024.</p>
    <p>ESPRESSIF SYSTEMS. <b>ESP-CSI</b>. 2026. Disponível em: https://github.com/espressif/esp-csi. Acesso em: 15 out. 2026.</p>
    <p>IBGE. <b>Censo Demográfico 2022</b>: composição domiciliar e óbitos informados. Rio de Janeiro: IBGE, 2024.</p>
    <p>IEEE. <b>IEEE 802.11bf-2025</b>: WLAN sensing. Nova York: IEEE, 2025.</p>
    <p>MA, Y.; ZHOU, G.; WANG, S. WiFi sensing with channel state information: a survey. <b>ACM Computing Surveys</b>, v. 52, n. 3, 2019.</p>
    <p>NASA JPL. <b>FINDER</b>: Finding Individuals for Disaster and Emergency Response. Pasadena: JPL, 2015.</p>
  </div>
  <div class="ia">
    <h4>Uso de inteligência artificial</h4>
    <p>O assistente Claude (Anthropic) apoiou a escrita de código e a revisão de textos. A silhueta da ilustração do topo foi gerada com IA (Higgsfield). Tudo foi revisado e testado pela equipe, e os dados foram medidos por nós.</p>
  </div>
  <div class="codigo">
    {qr_svg("https://github.com/AugustoDonateli/WiFi-sensing")}
    <p><b>Código e dados abertos</b><br>github.com/AugustoDonateli/WiFi-sensing</p>
  </div>
</footer>

</div></body></html>"""


if __name__ == "__main__":
    (AQUI / "banner.html").write_text(html())
    print("banner.html ok")

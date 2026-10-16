"""Figuras do banner da JACITEC, feitas com as coletas reais da sessão S0 (15/10/2026, em casa).

    python ferramentas/figuras_banner.py            # salva em dados/graficos/banner/

Figura 1: o CSI medido, desenhado em linhas empilhadas como na tela da demonstração (4,8 s de cada
          coleta): sala vazia e pessoa cruzando a linha entre as placas, mesma montagem (1,5 m).
Figura 2: a oscilação ao longo dos 30 s, com o limite calibrado na sala vazia da mesma montagem e os
          trechos em que o detector disse "movimento" (a mesma regra da tela, ferramentas/detector.py).

Nada aqui é simulado. Precisa de numpy e matplotlib.
"""

from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

import detector
from analise import carregar
from poster import leituras, FUNDO, TINTA

RAIZ = Path(__file__).resolve().parent.parent
BRUTOS = RAIZ / "dados" / "brutos"
SAIDA = RAIZ / "dados" / "graficos" / "banner"
FONTE = ["Arial", "Liberation Sans", "DejaVu Sans"]   # o banner usa Arial
DESTAQUE = "#C8215A"        # o magenta do cabeçalho da JACITEC, um pouco mais escuro para imprimir
DESTAQUE_FUNDO = "#F6D3DF"
CINZA = "#6B6B66"
DPI = 300

PERTO = ("20261015-164853_vazio.csv", "20261015-165324_andando.csv")
PAREDE = ("20261015-165612_vazio.csv", "20261015-165723_andando.csv")

plt.rcParams.update({"font.family": FONTE, "svg.fonttype": "none"})


def linhas(ax, ls, escala=0.04, lw=1.4, fundo=FUNDO):
    """O mesmo desenho do poster.py (e da tela): a mais antiga em cima, a mais nova embaixo."""
    ax.set_facecolor(fundo)
    uteis = ls.mean(axis=0) >= 0.5
    forma = ls[:, uteis]
    media = forma.mean()
    n, m = forma.shape
    x = np.concatenate([[0, 0.12], 0.12 + 0.76 * (np.arange(m) + 0.5) / m, [0.88, 1]])
    borda = np.sin(np.pi * (np.arange(m) + 0.5) / m)
    lenta = forma.mean(axis=0)
    for i in range(n):
        base = (n - 1 - i) / n
        relevo = np.maximum(0, forma[i] / media - 0.3 + 3 * (forma[i] - lenta) / media) * borda
        y = np.concatenate([[base, base], base + relevo * escala, [base, base]])
        ax.fill_between(x, y, -1, color=fundo, zorder=2 * i)
        ax.plot(x, y, color=TINTA, linewidth=lw * (1.8 if i == n - 1 else 1), zorder=2 * i + 1, solid_joinstyle="round")
    ax.set_xlim(-0.02, 1.02); ax.set_ylim(-0.05, 1.21); ax.axis("off")


def figura1():
    vazio, andando = (carregar(BRUTOS / a, remover_nulas=False) for a in PERTO)
    # sala vazia: o meio da gravação; pessoa: um trecho com duas travessias (ver a figura 2)
    lv, iv = leituras(vazio, None)
    la, ia = leituras(andando, andando["t"][0] + 9.4)
    fig = plt.figure(figsize=(40.7 / 2.54, 16.0 / 2.54), facecolor="white")
    for k, (ls, titulo) in enumerate([(lv, "SALA VAZIA"), (la, "PESSOA CRUZANDO A LINHA")]):
        ax = fig.add_axes([0.0 + k * 0.505, 0.0, 0.495, 1.0])
        ax.add_patch(plt.Rectangle((-0.02, -0.05), 1.04, 1.26, color=FUNDO, zorder=-1))
        linhas(ax, ls)
        ax.text(0.03, 1.165, titulo, color=TINTA, fontsize=24, fontweight="bold", va="top", zorder=500)
        ax.text(0.03, 1.095, "4,8 s · 48 leituras · 1,5 m entre as placas", color="#A9A9A2", fontsize=17, va="top", zorder=500)
        ax.text(0.97, -0.03, "agora", color="#A9A9A2", fontsize=16, ha="right", va="center", zorder=500)
    SAIDA.mkdir(parents=True, exist_ok=True)
    fig.savefig(SAIDA / "figura1-csi-real.png", dpi=DPI, facecolor="white")
    plt.close(fig)
    return iv - vazio["t"][0], ia - andando["t"][0]


def serie(arquivo):
    d = carregar(BRUTOS / arquivo, remover_nulas=False)
    t, v = detector.serie_oscilacao(d["t"], d["amp_completa"])
    return t - d["t"][0], v


def trechos(estados, t):
    out, ini = [], None
    for i, e in enumerate(estados):
        if e and ini is None: ini = t[i]
        if not e and ini is not None: out.append((ini, t[i])); ini = None
    if ini is not None: out.append((ini, t[-1]))
    return out


def figura2():
    fig, axs = plt.subplots(3, 1, figsize=(40.7 / 2.54, 21.0 / 2.54), facecolor="white", sharex=True,
                            gridspec_kw={"hspace": 0.78, "left": 0.085, "right": 0.985, "top": 0.86, "bottom": 0.13})
    resumo = {}
    topo = 0
    for par in (PERTO, PAREDE):
        for a in par:
            topo = max(topo, np.nanmax(serie(a)[1]))
    topo *= 1.12   # a mesma escala nos três gráficos, para comparar
    linhas_fig = [
        (PERTO, 0, "Sala vazia · 1,5 m, sem parede"),
        (PERTO, 1, "Pessoa cruzando a linha · 1,5 m, sem parede"),
        (PAREDE, 1, "Pessoa andando do outro lado de uma parede · 3,75 m"),
    ]
    for ax, (par, qual, titulo) in zip(axs, linhas_fig):
        tv, vv = serie(par[0])
        lim = detector.limiar_de_calibracao(vv)
        t, v = (tv, vv) if qual == 0 else serie(par[1])
        est = detector.detectar(v, lim)
        tr = trechos(est, t)
        resumo[titulo] = {"limiar": round(lim, 3), "trechos": [(round(a, 1), round(b, 1)) for a, b in tr]}
        for a, b in tr:
            ax.axvspan(a, b, color=DESTAQUE_FUNDO, lw=0, zorder=0)
        ax.plot(t, v, color="black", lw=1.6, zorder=3)
        ax.axhline(lim, color=DESTAQUE, lw=1.6, ls=(0, (5, 3)), zorder=2)
        ax.set_ylim(0, topo); ax.set_xlim(0, 30)
        ax.set_title(titulo, loc="left", fontsize=21, fontweight="bold", pad=8)
        ax.text(0.3, lim + topo * 0.02, "limite", color=DESTAQUE, fontsize=17, ha="left", va="bottom",
                bbox={"facecolor": "white", "edgecolor": "none", "pad": 1}, zorder=4)
        if qual == 1 and par is PERTO:
            for n, (a, b) in enumerate(tr, 1):
                ax.text((a + b) / 2, topo * 0.97, str(n), ha="center", va="top", fontsize=18, color=DESTAQUE, fontweight="bold")
        for s in ("top", "right"): ax.spines[s].set_visible(False)
        ax.tick_params(labelsize=17)
        ax.set_ylabel("oscilação", fontsize=17)
    axs[-1].set_xlabel("tempo (s)", fontsize=18)
    # legenda única
    from matplotlib.patches import Patch
    from matplotlib.lines import Line2D
    fig.legend(handles=[Line2D([], [], color="black", lw=1.6, label="oscilação do sinal (a cada 0,2 s)"),
                        Line2D([], [], color=DESTAQUE, lw=1.6, ls=(0, (5, 3)), label="limite (da sala vazia da mesma montagem)"),
                        Patch(color=DESTAQUE_FUNDO, label='o detector disse "movimento"')],
               loc="upper left", bbox_to_anchor=(0.075, 1.005), ncol=3, fontsize=17, frameon=False, handlelength=1.8, columnspacing=1.4)
    fig.savefig(SAIDA / "figura2-tremor-30s.png", dpi=DPI, facecolor="white")
    plt.close(fig)
    return resumo


def figura_montagem():
    """Esquema da montagem (desenho, não é medição): placa A, caminhos do sinal, pessoa, placa B, notebook."""
    from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
    fig = plt.figure(figsize=(40.7 / 2.54, 12.0 / 2.54), facecolor="white")
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, 40.7); ax.set_ylim(0, 12); ax.axis("off")
    lw = 2.2
    def placa(x, y, nome):
        ax.add_patch(FancyBboxPatch((x - 1.3, y - 1.9), 2.6, 3.8, boxstyle="round,pad=0,rounding_size=0.35", fc="white", ec="black", lw=lw, zorder=5))
        ax.add_patch(FancyBboxPatch((x - 0.85, y + 0.2), 1.7, 1.2, boxstyle="round,pad=0,rounding_size=0.12", fc="white", ec="black", lw=1.4, zorder=6))
        for k in range(5):
            ax.add_patch(Circle((x - 0.95, y - 1.5 + k * 0.42), 0.09, color="black", zorder=6)); ax.add_patch(Circle((x + 0.95, y - 1.5 + k * 0.42), 0.09, color="black", zorder=6))
        ax.text(x, y + 2.35, nome, ha="center", va="bottom", fontsize=22, fontweight="bold")
    xa, xb, y0 = 3.0, 21.5, 5.6
    # parede (em cima) e chão (embaixo), onde o sinal rebate
    ax.plot([5.2, 19.3], [11.0, 11.0], color=CINZA, lw=3); ax.text(12.25, 11.25, "parede, móveis, pessoas: o sinal rebate", ha="center", va="bottom", fontsize=17, color=CINZA)
    ax.plot([5.2, 19.3], [0.9, 0.9], color=CINZA, lw=3)
    # caminhos: direto e dois rebatidos (todos chegam na placa B e se somam)
    seta = dict(arrowstyle="-|>", mutation_scale=22, lw=lw, color="black", shrinkA=0, shrinkB=0, zorder=4)
    ax.add_patch(FancyArrowPatch((xa + 1.4, y0), (xb - 1.45, y0), **seta))
    for yr in (11.0, 0.9):
        xm = (xa + xb) / 2
        ax.plot([xa + 1.2, xm], [y0 + (0.8 if yr > y0 else -0.8), yr], color="black", lw=1.6, ls=(0, (4, 3)), zorder=3)
        ax.add_patch(FancyArrowPatch((xm, yr), (xb - 1.3, y0 + (0.8 if yr > y0 else -0.8)), arrowstyle="-|>", mutation_scale=18, lw=1.6, ls=(0, (4, 3)), color="black", shrinkA=0, shrinkB=0, zorder=3))
    # a pessoa cruzando a linha entre as placas
    xp = 13.6
    ax.add_patch(Circle((xp, 8.55), 0.55, fc="white", ec=DESTAQUE, lw=lw, zorder=7))
    ax.plot([xp, xp], [8.0, 5.0], color=DESTAQUE, lw=lw, zorder=7)
    ax.plot([xp - 1.1, xp, xp + 1.0], [6.0, 7.4, 6.3], color=DESTAQUE, lw=lw, zorder=7)
    ax.plot([xp - 0.9, xp, xp + 0.8], [2.6, 5.0, 2.7], color=DESTAQUE, lw=lw, zorder=7)
    ax.add_patch(FancyArrowPatch((xp + 1.6, 3.3), (xp + 1.6, 8.3), arrowstyle="-|>", mutation_scale=18, lw=1.8, color=DESTAQUE, zorder=7))
    ax.text(xp - 1.4, 8.3, "a pessoa\ncruza a linha", fontsize=18, color=DESTAQUE, va="center", ha="right")
    placa(xa, y0, "Placa A")
    placa(xb, y0, "Placa B")
    ax.text(xa, y0 - 2.4, "envia cerca de\n50 pacotes/s", ha="center", va="top", fontsize=17)
    ax.text(xb, y0 - 2.4, "mede o CSI de cada\npacote (64 subportadoras)", ha="center", va="top", fontsize=17)
    ax.text((xa + xb) / 2 - 3.2, y0 + 0.35, "caminho direto", ha="center", va="bottom", fontsize=17)
    # cabo USB e notebook
    ax.add_patch(FancyArrowPatch((xb + 1.4, y0), (31.0, y0), arrowstyle="-|>", mutation_scale=22, lw=lw, color="black", shrinkA=0, shrinkB=0))
    ax.text((xb + 1.4 + 31.0) / 2, y0 + 0.35, "USB", ha="center", va="bottom", fontsize=17)
    ax.add_patch(FancyBboxPatch((31.4, y0 - 1.0), 5.6, 3.6, boxstyle="round,pad=0,rounding_size=0.25", fc="white", ec="black", lw=lw))
    ax.plot([30.6, 37.8], [y0 - 1.25, y0 - 1.25], color="black", lw=lw * 1.6, solid_capstyle="round")
    for k in range(6):
        ax.plot([32.0, 36.4], [y0 + 2.0 - k * 0.5, y0 + 2.0 - k * 0.5 + (0.15 if k % 2 else 0)], color="black", lw=1.0)
    ax.text(34.2, y0 + 2.95, "Notebook", ha="center", va="bottom", fontsize=22, fontweight="bold")
    ax.text(34.2, y0 - 1.8, "Python grava as coletas;\no site desenha e detecta", ha="center", va="top", fontsize=17)
    fig.savefig(SAIDA / "figura-montagem.png", dpi=DPI, facecolor="white")
    plt.close(fig)


# ----------------------------------------------------------------------------- versão 2 do banner (16/10)

def csi_escuro(nome, ls, largura_cm, altura_cm, escala=0.05, lw=1.7):
    """As linhas do CSI real, sem texto, no fundo escuro da tela (os rótulos vão no próprio banner)."""
    fundo = "#10100F"     # o mesmo tom dos desenhos tirados do site, para a faixa escura do banner ser uma só
    fig = plt.figure(figsize=(largura_cm / 2.54, altura_cm / 2.54), facecolor=fundo)
    ax = fig.add_axes([0.0, 0.0, 1.0, 1.0])
    linhas(ax, ls, escala=escala, lw=lw, fundo=fundo)
    ax.set_xlim(0.04, 0.96)
    fig.savefig(SAIDA / nome, dpi=DPI, facecolor=fundo)
    plt.close(fig)


def figuras_csi():
    vazio, andando = (carregar(BRUTOS / a, remover_nulas=False) for a in PERTO)
    lv, _ = leituras(vazio, None)
    la, _ = leituras(andando, andando["t"][0] + 9.4)
    csi_escuro("csi-vazio.png", lv, 19.0, 15.0)
    csi_escuro("csi-cruzando.png", la, 19.0, 15.0)


def figura_resultado():
    """A oscilação nos 30 s, em vezes a sala vazia: a sala vazia (cinza) e a pessoa (preto) no mesmo gráfico,
    o limite tracejado e, em magenta, onde o detector disse "movimento". Mesma regra da tela."""
    fig, axs = plt.subplots(2, 1, figsize=(40.2 / 2.54, 12.8 / 2.54), facecolor="white",
                            gridspec_kw={"hspace": 0.68, "left": 0.085, "right": 0.83, "top": 0.9, "bottom": 0.15})
    resumo = {}
    for ax, (par, titulo, legenda_p) in zip(axs, [
            (PERTO, "1,5 m entre as placas", "pessoa cruzando"),
            (PAREDE, "3,75 m, com uma parede no meio", "pessoa andando")]):
        tv, vv = serie(par[0]); ta, va = serie(par[1])
        base = float(np.median(vv))
        lim = detector.limiar_de_calibracao(vv)
        est = detector.detectar(va, lim)
        tr = trechos(est, ta)
        for a, b in tr:
            ax.axvspan(a, b, color=DESTAQUE_FUNDO, lw=0, zorder=0)
        ax.plot(tv, vv / base, color="#9A9A94", lw=2.2, zorder=2)
        ax.plot(ta, va / base, color="black", lw=3.0, zorder=3)
        ax.axhline(lim / base, color=DESTAQUE, lw=2.6, ls=(0, (6, 4)), zorder=2.5)
        ax.set_xlim(0, 30); ax.set_ylim(0, 6.6)
        ax.set_yticks([0, 1, 2, 3, 4, 5, 6]); ax.set_yticklabels(["0", "1×", "", "3×", "", "5×", ""])
        ax.set_title(titulo, loc="left", fontsize=26, fontweight="bold", pad=12)
        # rótulos direto no fim das linhas, em vez de legenda
        yp, yl, yv = (4.6, 3.0, 0.95) if par is PERTO else (2.95, 1.6, 0.3)   # posições escolhidas para não encostar
        ax.text(30.4, yp, legenda_p, fontsize=22, va="center", ha="left", fontweight="bold", clip_on=False)
        ax.text(30.4, yv, "sala vazia", fontsize=22, va="center", ha="left", color="#77776F", clip_on=False)
        ax.text(30.4, yl, "limite", fontsize=22, va="center", ha="left", color=DESTAQUE, clip_on=False)
        if par is PERTO:
            for n, (a, b) in enumerate(tr, 1):
                ax.text((a + b) / 2, 6.5, str(n), ha="center", va="top", fontsize=24, color=DESTAQUE, fontweight="bold")
        pico = float(va.max() / base)
        resumo[titulo] = {"pico_x": round(pico, 1), "limite_x": round(lim / base, 2), "trechos": len(tr),
                          "frac_movimento": round(sum(b - a for a, b in tr) / (ta[-1] - ta[0]), 2)}
        for sp in ("top", "right"): ax.spines[sp].set_visible(False)
        for sp in ("left", "bottom"): ax.spines[sp].set_linewidth(1.6)
        ax.tick_params(labelsize=21, width=1.6, length=6)
        ax.grid(axis="y", color="#E4E4E0", lw=1.2, zorder=-1)
    axs[0].set_ylabel("oscilação\n(× sala vazia)", fontsize=21)
    axs[1].set_ylabel("oscilação\n(× sala vazia)", fontsize=21)
    axs[1].set_xlabel("tempo (s)", fontsize=22)
    fig.savefig(SAIDA / "figura-resultado.png", dpi=DPI, facecolor="white")
    plt.close(fig)
    return resumo


if __name__ == "__main__":
    figuras_csi()
    for k, v in figura_resultado().items():
        print(k, v)
    print("salvo em", SAIDA)

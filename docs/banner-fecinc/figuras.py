"""Figuras do banner da Fecinc 2026, feitas com as coletas reais da sessão S0 (15/10/2026, em casa).

    python docs/banner-fecinc/figuras.py      # salva SVG em docs/banner-fecinc/fig/ e imprime os números

Nada aqui é simulado. A regra do detector é a de hoje (ferramentas/detector.py: janela de 2 s, a mesma
da tela desde 22/10). Os números do banner saem daqui.
"""
import json
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
sys.path.insert(0, str(RAIZ / "ferramentas"))

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

import detector
from analise import carregar
from poster import leituras

BRUTOS = RAIZ / "dados" / "brutos"
SAIDA = AQUI / "fig"
PERTO = ("20261015-164853_vazio.csv", "20261015-165324_andando.csv")
PAREDE = ("20261015-165612_vazio.csv", "20261015-165723_andando.csv")

TINTA = "#141413"
PAPEL = "#F5F3EE"
NOITE = "#0F0F0E"
LUZ = "#EDEDE8"
CINZA = "#8C8C86"
DESTAQUE = "#FF5A1F"
DESTAQUE_CLARO = "#FFD9C9"

plt.rcParams.update({"font.family": ["Geist", "Inter", "DejaVu Sans"], "svg.fonttype": "none",
                     "font.size": 30})


def linhas_csi(nome, ls, escala=0.05, lw=2.6):
    """O CSI real em linhas empilhadas, como na tela do estande (a mesma conta do poster.py)."""
    fig = plt.figure(figsize=(30 / 2.54, 22 / 2.54), facecolor=NOITE)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_facecolor(NOITE)
    uteis = ls.mean(axis=0) >= 0.5
    forma = ls[:, uteis]
    media = forma.mean()
    n, m = forma.shape
    x = np.concatenate([[0, 0.1], 0.1 + 0.8 * (np.arange(m) + 0.5) / m, [0.9, 1]])
    borda = np.sin(np.pi * (np.arange(m) + 0.5) / m)
    lenta = forma.mean(axis=0)
    for i in range(n):
        base = (n - 1 - i) / n
        relevo = np.maximum(0, forma[i] / media - 0.3 + 3 * (forma[i] - lenta) / media) * borda
        y = np.concatenate([[base, base], base + relevo * escala, [base, base]])
        ax.fill_between(x, y, -1, color=NOITE, zorder=2 * i)
        ax.plot(x, y, color=LUZ, linewidth=lw * (1.6 if i == n - 1 else 1), zorder=2 * i + 1,
                solid_joinstyle="round", solid_capstyle="round")
    ax.set_xlim(0.02, 0.98); ax.set_ylim(-0.04, 1.22); ax.axis("off")
    fig.savefig(SAIDA / nome, facecolor=NOITE)
    plt.close(fig)


def serie(arquivo):
    d = carregar(BRUTOS / arquivo, remover_nulas=False)
    t, v = detector.serie_oscilacao(d["t"], d["amp_completa"])
    return t - d["t"][0], v


def trechos(estados, t):
    out, ini = [], None
    for i, e in enumerate(estados):
        if e and ini is None:
            ini = t[i]
        if not e and ini is not None:
            out.append((float(ini), float(t[i]))); ini = None
    if ini is not None:
        out.append((float(ini), float(t[-1])))
    return out


def picos_acima(t, y, limite, separacao=2.0):
    picos = []
    for i in range(1, len(y) - 1):
        if y[i] >= y[i - 1] and y[i] > y[i + 1] and y[i] > limite:
            if picos and t[i] - t[picos[-1]] < separacao:
                if y[i] > y[picos[-1]]:
                    picos[-1] = i
            else:
                picos.append(i)
    return picos


def grafico(nome, par, titulo, rotulo, numerar):
    tv, vv = serie(par[0]); ta, va = serie(par[1])
    base = float(np.median(vv))
    lim = detector.limiar_de_calibracao(vv)
    tr = trechos(detector.detectar(va, lim), ta)
    alarmes = trechos(detector.detectar(vv, lim), tv)
    fig, ax = plt.subplots(figsize=(38 / 2.54, 11.6 / 2.54), facecolor=PAPEL)
    fig.subplots_adjust(left=0.07, right=0.80, top=0.80, bottom=0.24)
    ax.set_facecolor(PAPEL)
    for a, b in tr:
        ax.axvspan(a, b, color=DESTAQUE_CLARO, lw=0, zorder=0)
    ax.plot(tv, vv / base, color=CINZA, lw=2.4, zorder=2)
    ax.plot(ta, va / base, color=TINTA, lw=3.4, zorder=3, solid_joinstyle="round")
    ax.axhline(lim / base, color=DESTAQUE, lw=2.8, ls=(0, (5, 4)), zorder=2.5)
    topo = 5.9 if par is PERTO else 3.4
    ax.set_xlim(0, 30); ax.set_ylim(0, topo)
    ax.set_yticks([1, 3, 5] if par is PERTO else [1, 2, 3])
    ax.set_yticklabels(["1×", "3×", "5×"] if par is PERTO else ["1×", "2×", "3×"])
    ax.set_xticks([0, 10, 20, 30]); ax.set_xticklabels(["0 s", "10 s", "20 s", "30 s"])
    ax.set_title(titulo, loc="left", fontsize=30, fontweight="medium", color=TINTA, pad=14)
    folga = 0.2 * topo                                   # distância mínima entre rótulos
    yr = {"limite": lim / base, "pessoa": lim / base + folga, "vazia": min(1.0, lim / base - folga)}
    ax.text(30.6, yr["pessoa"], rotulo, fontsize=27, va="center", color=TINTA, fontweight="medium", clip_on=False)
    ax.text(30.6, yr["limite"], "limite", fontsize=27, va="center", color=DESTAQUE, clip_on=False)
    ax.text(30.6, yr["vazia"], "sala vazia", fontsize=27, va="center", color=CINZA, clip_on=False)
    picos = picos_acima(ta, va / base, lim / base)
    if numerar:
        # um número por travessia: cada pico do sinal acima do limite (separados por 2 s ou mais)
        for k, i in enumerate(picos, 1):
            ax.text(float(ta[i]), float(va[i] / base) + 0.22, str(k), ha="center", va="bottom", fontsize=24,
                    color=DESTAQUE, fontweight="medium")
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    for s in ("left", "bottom"):
        ax.spines[s].set_color(TINTA); ax.spines[s].set_linewidth(1.6)
    ax.tick_params(colors=TINTA, labelsize=26, width=1.6, length=7)
    ax.grid(axis="y", color="#DEDBD3", lw=1.4, zorder=-1)
    fig.savefig(SAIDA / nome, facecolor=PAPEL)
    plt.close(fig)
    dur = float(ta[-1] - ta[0])
    return {"pico_x": round(float(va.max() / base), 1), "limite_x": round(lim / base, 2), "trechos": [(round(a, 1), round(b, 1)) for a, b in tr],
            "fracao_movimento": round(sum(b - a for a, b in tr) / dur, 3), "alarmes_sala_vazia": len(alarmes),
            "picos_acima_do_limite": [(round(float(ta[i]), 1), round(float(va[i] / base), 1)) for i in picos]}


if __name__ == "__main__":
    SAIDA.mkdir(exist_ok=True)
    vazio, andando = (carregar(BRUTOS / a, remover_nulas=False) for a in PERTO)
    lv, _ = leituras(vazio, None)
    la, _ = leituras(andando, andando["t"][0] + 9.4)
    linhas_csi("csi-vazio.svg", lv)
    linhas_csi("csi-cruzando.svg", la)
    r = {"perto_1_5m": grafico("oscilacao-perto.svg", PERTO, "Placas a 1,5 m: pessoa cruzando a linha entre elas", "pessoa", True),
         "parede_3_75m": grafico("oscilacao-parede.svg", PAREDE, "Placas a 3,75 m, com uma parede no meio", "pessoa", False)}
    (SAIDA / "numeros.json").write_text(json.dumps(r, indent=1, ensure_ascii=False))
    print(json.dumps(r, indent=1, ensure_ascii=False))

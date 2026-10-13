"""Desenha uma ou mais coletas lado a lado. Precisa de numpy e matplotlib.

    python ferramentas/plotar.py dados/brutos/20261016-150000_vazio.csv
    python ferramentas/plotar.py dados/brutos/*_vazio.csv dados/brutos/*_andando.csv

Cada coleta vira uma coluna, com as mesmas escalas, para comparar de olho:
  1. cascata: amplitude de cada subportadora ao longo do tempo
  2. oscilação por janela de 1 s (a medida candidata do detector)
  3. pacotes recebidos por segundo
  4. RSSI médio por segundo
A imagem é salva em dados/graficos/.
"""

import argparse
import glob
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from analise import carregar, oscilacao, por_janela

RAIZ = Path(__file__).resolve().parent.parent
TINTA = "#1f2a33"
TINTA_FRACA = "#5b6b77"
GRADE = "#e3e8ec"
LINHA = "#1b6f8a"


def estilo(ax):
    ax.grid(True, color=GRADE, linewidth=0.8)
    ax.set_axisbelow(True)
    for lado in ("top", "right"):
        ax.spines[lado].set_visible(False)
    for lado in ("left", "bottom"):
        ax.spines[lado].set_color(TINTA_FRACA)
    ax.tick_params(colors=TINTA_FRACA, labelsize=8)


def main():
    p = argparse.ArgumentParser(description="Gráficos de coletas de CSI.")
    p.add_argument("arquivos", nargs="+", help="arquivos .csv gravados pelo capturar.py (aceita *)")
    p.add_argument("--segmento", default="lltf", help="lltf (padrão) ou ht_ltf")
    p.add_argument("--janela", type=float, default=1.0, help="tamanho da janela em segundos")
    p.add_argument("--mostrar", action="store_true", help="abre a janela além de salvar a imagem")
    args = p.parse_args()

    caminhos = []
    for padrao in args.arquivos:
        achados = sorted(glob.glob(padrao))
        caminhos.extend(achados if achados else [padrao])

    coletas = [carregar(c, args.segmento) for c in caminhos]
    vazias = [c["arquivo"] for c in coletas if c["amp"].size == 0]
    if vazias:
        raise SystemExit(f"Sem pacotes utilizáveis em: {', '.join(vazias)}")

    # Mesma escala de cor e de eixo y em todas as colunas, senão a comparação engana.
    amp_max = max(np.nanpercentile(c["amp"], 99) for c in coletas)
    osc = [oscilacao(c, args.janela) for c in coletas]
    osc_max = max(np.nanmax(v) for _, v in osc if len(v)) * 1.1

    n = len(coletas)
    fig, eixos = plt.subplots(
        4, n, figsize=(4.2 * n + 1, 9), squeeze=False,
        gridspec_kw={"height_ratios": [3, 1.4, 1, 1]}, sharey="row",
    )
    for j, (c, (tc, ov)) in enumerate(zip(coletas, osc)):
        meta = c["meta"]
        titulo = meta.get("rotulo", "?")
        detalhes = f"{meta.get('participante', '-')} · {meta.get('distancia_m') or '?'} m · parede {meta.get('parede', '?')}"
        t = c["t"]

        ax = eixos[0][j]
        img = ax.imshow(
            c["amp"].T, aspect="auto", origin="lower", cmap="Blues", vmin=0, vmax=amp_max,
            extent=[t[0], t[-1], 0, c["amp"].shape[1]], interpolation="nearest",
        )
        ax.set_title(f"{titulo}\n{detalhes}", fontsize=10, color=TINTA, loc="left")
        ax.tick_params(colors=TINTA_FRACA, labelsize=8)
        if j == 0:
            ax.set_ylabel("subportadora (só as úteis)", fontsize=8, color=TINTA_FRACA)

        ax = eixos[1][j]
        ax.plot(tc, ov, color=LINHA, linewidth=2)
        ax.set_ylim(0, osc_max)
        estilo(ax)
        if j == 0:
            ax.set_ylabel(f"oscilação\n(janela {args.janela:g} s)", fontsize=8, color=TINTA_FRACA)

        ax = eixos[2][j]
        tp, _, contagem = por_janela(t, t, 1.0)
        ax.bar(tp, contagem, width=0.8, color=LINHA)
        estilo(ax)
        if j == 0:
            ax.set_ylabel("pacotes/s", fontsize=8, color=TINTA_FRACA)

        ax = eixos[3][j]
        tr, rssi_med, _ = por_janela(t, c["rssi"].astype(float), 1.0)
        ax.plot(tr, rssi_med, color=LINHA, linewidth=2)
        estilo(ax)
        ax.set_xlabel("tempo (s)", fontsize=8, color=TINTA_FRACA)
        if j == 0:
            ax.set_ylabel("RSSI (dBm)", fontsize=8, color=TINTA_FRACA)

        for linha in eixos[1:]:
            linha[j].set_xlim(t[0], t[-1])

    barra = fig.colorbar(img, ax=[linha[-1] for linha in eixos[:1]], fraction=0.04, pad=0.02)
    barra.set_label("amplitude", fontsize=8, color=TINTA_FRACA)
    barra.ax.tick_params(labelsize=8, colors=TINTA_FRACA)
    fig.suptitle("Wave Sense · " + ", ".join(c["arquivo"] for c in coletas),
                 fontsize=9, color=TINTA_FRACA, x=0.01, ha="left")

    saida = RAIZ / "dados" / "graficos"
    saida.mkdir(parents=True, exist_ok=True)
    nome = "_vs_".join(Path(c["arquivo"]).stem for c in coletas)[:150] + ".png"
    fig.savefig(saida / nome, dpi=130, bbox_inches="tight")
    print(f"Gráfico salvo em {saida / nome}")
    for c in coletas:
        ign = c["ignorados"]
        print(f"  {c['arquivo']}: {len(c['t'])} pacotes usados, {c['amp'].shape[1]} subportadoras úteis, "
              f"ignorados {ign['invalidos']} inválidos e {ign['len_desconhecido']} com len desconhecido")
    if args.mostrar:
        plt.show()


if __name__ == "__main__":
    main()

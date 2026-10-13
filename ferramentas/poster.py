"""Gera o pôster "antes e depois": coletas reais desenhadas como linhas empilhadas, lado a lado.

Precisa de numpy e matplotlib.
    python ferramentas/poster.py dados/brutos/ARQ_vazio.csv dados/brutos/ARQ_andando.csv \
        --titulos "Sala vazia" "Pessoa andando"

Cada painel usa 4,8 s da coleta (48 linhas de 0,1 s, como a tela de demonstração),
começando em --inicio segundos (padrão: no meio da gravação). Todos os painéis usam a mesma
regra de escala (relativa à amplitude média de cada coleta), para a comparação ser justa.
Embaixo de cada um vão as condições anotadas no .json. Se alguma coleta estiver marcada como
SINTETICO, o pôster ganha um aviso grande: dado inventado não pode parecer medição.
Sai um PDF (para imprimir) e um PNG em dados/graficos/.
"""

import argparse
import logging
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

import detector
from analise import carregar

logging.getLogger("matplotlib.font_manager").setLevel(logging.ERROR)  # sem aviso por fonte que falta

RAIZ = Path(__file__).resolve().parent.parent
LINHAS = 48
LEITURA_S = 0.1
FUNDO, TINTA, APAGADO, AVISO = "#0B0B0A", "#EDEDE8", "#8A8A84", "#E5484D"
# Mesmas fontes da tela, se estiverem instaladas; senão, as parecidas do Windows; senão, as do matplotlib.
SERIFA = ["Instrument Serif", "Georgia", "DejaVu Serif"]
TEXTO = ["Geist", "Segoe UI", "DejaVu Sans"]
MONO = ["Geist Mono", "Consolas", "DejaVu Sans Mono"]


def leituras(dados, inicio):
    t, a = dados["t"], dados["amp_completa"].copy()
    a[:, list(detector.IGNORAR)] = 0.0
    if inicio is None:
        inicio = max(t[0], (t[0] + t[-1]) / 2 - LINHAS * LEITURA_S / 2)
    saida = []
    for i in range(LINHAS):
        sel = (t >= inicio + i * LEITURA_S) & (t < inicio + (i + 1) * LEITURA_S)
        if sel.any():
            saida.append(a[sel].mean(axis=0))
    return np.array(saida), inicio


def desenhar(ax, ls, escala):
    """Mesma ideia da tela: a mais antiga em cima, a mais nova embaixo, cada linha tapa as de trás."""
    ax.set_facecolor(FUNDO)
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
        ax.fill_between(x, y, -1, color=FUNDO, zorder=2 * i)
        ax.plot(x, y, color=TINTA, linewidth=0.9, zorder=2 * i + 1)
    ax.set_xlim(0, 1); ax.set_ylim(-0.05, 1.25); ax.axis("off")


def num(x):
    return f"{x:.1f}".replace(".", ",")


def data_br(iso):
    return f"{iso[8:10]}/{iso[5:7]}/{iso[:4]}" if iso and len(iso) >= 10 else "data ?"


def condicoes(m):
    dist = m.get("distancia_m")
    parede = m.get("parede")
    texto_parede = {"nao": "sem parede", "não": "sem parede", None: "parede ?"}.get(parede, f"parede: {parede}")
    return f"{num(float(dist)) if dist not in (None, '') else '?'} m entre as placas · {texto_parede}"


def main():
    p = argparse.ArgumentParser(description="Pôster antes e depois com coletas reais.")
    p.add_argument("arquivos", nargs="+")
    p.add_argument("--titulos", nargs="*")
    p.add_argument("--inicio", type=float, help="segundo da coleta onde começa o trecho desenhado")
    p.add_argument("--titulo-geral", default="O mesmo lugar. Só mudou uma coisa.")
    p.add_argument("--saida", default=str(RAIZ / "dados" / "graficos" / "poster-antes-depois"))
    args = p.parse_args()

    titulos = args.titulos or [Path(a).stem for a in args.arquivos]
    if len(titulos) != len(args.arquivos):
        raise SystemExit("Passe um título para cada arquivo.")
    coletas = [carregar(a, remover_nulas=False) for a in args.arquivos]
    trechos = [leituras(c, args.inicio) for c in coletas]
    escala = 0.08

    n = len(coletas)
    sintetico = any("SINTETICO" in (c["meta"].get("obs") or "").upper() for c in coletas)
    fig = plt.figure(figsize=(8 * n, 11), facecolor=FUNDO)
    fig.text(0.04, 0.95, "WAVE SENSE · JACITEC 2026", color=APAGADO, fontsize=12, family=MONO)
    fig.text(0.04, 0.90, args.titulo_geral, color=TINTA, fontsize=40, family=SERIFA)
    if sintetico:
        fig.text(0.96, 0.95, "DADOS SINTÉTICOS · NÃO É MEDIÇÃO", color=AVISO, fontsize=14, family=MONO, ha="right")
    for i, (c, (ls, ini), titulo) in enumerate(zip(coletas, trechos, titulos)):
        x0 = 0.04 + i * (0.92 / n)
        ax = fig.add_axes([x0, 0.2, 0.92 / n - 0.03, 0.62])
        desenhar(ax, ls, escala)
        m = c["meta"]
        fig.text(x0, 0.15, titulo, color=TINTA, fontsize=30, family=SERIFA)
        fig.text(x0, 0.115, condicoes(m), color=APAGADO, fontsize=10, family=MONO)
        fig.text(x0, 0.095, f"sessão {m.get('sessao', '?')} · {data_br(m.get('inicio'))} · "
                 f"{num(LINHAS * LEITURA_S)} s a partir de {num(ini - c['t'][0])} s", color=APAGADO, fontsize=10, family=MONO)
    fig.text(0.04, 0.04, "Cada linha é a média de 0,1 s do sinal Wi-Fi medido por uma placa ESP32. A mais nova fica embaixo. "
             "Nenhuma câmera foi usada.", color=APAGADO, fontsize=11, family=TEXTO)

    saida = Path(args.saida)
    saida.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(saida.with_suffix(".pdf"), facecolor=FUNDO)
    fig.savefig(saida.with_suffix(".png"), facecolor=FUNDO, dpi=110)
    print(f"Pôster salvo em {saida.with_suffix('.pdf')} e {saida.with_suffix('.png')}")


if __name__ == "__main__":
    main()

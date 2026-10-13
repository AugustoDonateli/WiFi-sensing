"""Coletas INVENTADAS, só para testar o código. Não são medições e não servem como resultado.

Imitam o formato que o capturar.py grava (pc_tempo_s + linha CSI_DATA do csi_recv) e um
comportamento simples: amplitude quase parada quando "vazio" e balançando quando "andando".
Só biblioteca padrão.
"""

import json
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from csi_formato import COLUNAS  # noqa: E402

# Subportadoras sempre em zero, nas mesmas posições da linha de exemplo oficial (HT40 "below").
NULAS = {2, 3, 4, 60, 61, 62, 63}


def perfil(k):
    return 0.0 if k in NULAS else 12 + 6 * math.sin(k / 5)


def linha_csi(id_pacote, amps, rng, len_=128, first_word=0):
    """Monta uma linha CSI_DATA com as amplitudes pedidas no bloco LLTF (fase sorteada)."""
    valores = []
    for a in amps:
        fase = rng.uniform(0, 2 * math.pi)
        valores += [round(a * math.sin(fase)), round(a * math.cos(fase))]  # imag, real
    valores += [0] * (len_ - len(valores))
    return (f"CSI_DATA,{id_pacote},1a:00:00:00:00:00,-41,11,1,0,1,0,1,0,0,0,0,-95,0,11,2,"
            f"{10000 * id_pacote},0,30,1,{len_},{first_word},\"[{','.join(map(str, valores))}]\"")


def gravar_coleta(pasta, nome, rotulo, sessao, segundos, movimento, semente=0, len_=128,
                  taxa=100, buraco=None, first_word_a_cada=0):
    """Grava NOME.csv e NOME.json em `pasta`.

    movimento(t) -> intensidade do balanço (0 = parado). buraco=(ini, fim) apaga os pacotes desse trecho.
    """
    rng = random.Random(semente)
    pasta = Path(pasta)
    linhas = [",".join(["pc_tempo_s"] + COLUNAS)]
    for i in range(int(segundos * taxa)):
        t = i / taxa + rng.uniform(0, 0.003)
        if buraco and buraco[0] <= t < buraco[1]:
            continue
        m = movimento(t)
        amps = [max(0.0, perfil(k) * (1 + m * math.sin(2 * math.pi * 1.3 * t + k * 0.4)) + rng.gauss(0, 0.4))
                if k not in NULAS else 0.0 for k in range(64)]
        fw = 1 if first_word_a_cada and i % first_word_a_cada == 0 else 0
        linhas.append(f"{t:.4f}," + linha_csi(i, amps, rng, len_=len_, first_word=fw))
    (pasta / f"{nome}.csv").write_text("\n".join(linhas) + "\n", encoding="utf-8")
    meta = {"rotulo": rotulo, "sessao": sessao, "inicio": "2026-10-13T10:00:00", "distancia_m": 2.0,
            "parede": "nao", "obs": "SINTETICO, gerado pelos testes"}
    (pasta / f"{nome}.json").write_text(json.dumps(meta), encoding="utf-8")
    return pasta / f"{nome}.csv"


def parado(_t):
    return 0.0


def andando(_t):
    return 0.35

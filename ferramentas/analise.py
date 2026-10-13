"""Carrega um arquivo gravado pelo capturar.py e calcula medidas simples. Precisa de numpy."""

import csv
import json
from pathlib import Path

import numpy as np

import detector
from csi_formato import LinhaInvalida, ler_campos


def carregar(caminho, segmento="lltf", remover_nulas=True):
    """Lê uma coleta e devolve um dicionário com arrays numpy.

    t              tempo no PC (s) de cada pacote
    ids            número do pacote enviado pela Placa A
    rssi           força do sinal (dBm)
    amp            matriz (pacotes x subportadoras) para gráficos: pares inválidos viram NaN e,
                   com remover_nulas=True, as subportadoras sempre zeradas são removidas
    amp_completa   mesma matriz com todas as subportadoras e inválidos = 0 (é o que o detector usa,
                   igual à tela de demonstração)
    colunas        índice original de cada coluna de `amp`
    meta           conteúdo do .json da coleta, se existir
    """
    caminho = Path(caminho)
    t, ids, rssi, linhas_amp = [], [], [], []
    ignorados = {"len_desconhecido": 0, "invalidos": 0}

    with open(caminho, newline="", encoding="utf-8") as f:
        leitor = csv.reader(f)
        next(leitor)  # cabeçalho
        for campos in leitor:
            try:
                reg = ler_campos(campos[1:])  # tudo depois de pc_tempo_s
            except LinhaInvalida:
                ignorados["invalidos"] += 1
                continue
            segs = reg.segmentos()
            if segmento not in segs:
                ignorados["len_desconhecido"] += 1
                continue
            ini, fim = segs[segmento]
            amps = reg.amplitudes()[ini:fim]
            t.append(float(campos[0]))
            ids.append(reg.id)
            rssi.append(reg.rssi)
            linhas_amp.append([np.nan if a is None else a for a in amps])

    amp = np.array(linhas_amp, dtype=float)
    amp_completa = np.nan_to_num(amp, nan=0.0) if amp.size else amp
    colunas = np.arange(amp.shape[1]) if amp.size else np.array([], dtype=int)
    if amp.size and remover_nulas:
        # Subportadoras de guarda/nulas ficam sempre em zero e só atrapalham o gráfico.
        uteis = ~np.all((amp == 0) | np.isnan(amp), axis=0)
        colunas = np.flatnonzero(uteis)
        amp = amp[:, uteis]

    meta_path = caminho.with_suffix(".json")
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    return {
        "t": np.array(t), "ids": np.array(ids), "rssi": np.array(rssi),
        "amp": amp, "amp_completa": amp_completa, "colunas": colunas, "meta": meta,
        "ignorados": ignorados, "arquivo": caminho.name,
    }


def por_janela(t, valores, janela_s=1.0, func=np.nanmean):
    """Aplica `func` aos valores de cada janela de tempo. Devolve (centros, resultados, contagens)."""
    if len(t) == 0:
        return np.array([]), np.array([]), np.array([])
    bordas = np.arange(t[0], t[-1] + janela_s, janela_s)
    centros, res, cont = [], [], []
    for a, b in zip(bordas[:-1], bordas[1:]):
        sel = (t >= a) & (t < b)
        cont.append(int(sel.sum()))
        centros.append((a + b) / 2)
        res.append(func(valores[sel]) if sel.any() else np.nan)
    return np.array(centros), np.array(res), np.array(cont)


def oscilacao(dados, janela_s=detector.JANELA_S):
    """Oscilação ao longo do tempo, com a mesma regra do detector e da tela de demonstração."""
    if dados["amp_completa"].size == 0:
        return np.array([]), np.array([])
    return detector.serie_oscilacao(dados["t"], dados["amp_completa"], janela=janela_s)

"""Mede os acertos do detector de movimento com coletas reais. Precisa de numpy.

    python ferramentas/avaliar.py
    python ferramentas/avaliar.py --ajuste S1 S3 --teste S2

Passos:
  1. Limiar: calculado só com as coletas "vazio" das sessões de ajuste (média + 3 desvios).
  2. Teste: o detector roda em cada coleta das sessões de teste, do zero, com esse limiar.
  3. Resultado por medição (a cada 0,2 s) e por coleta (o que o detector disse na maior parte do tempo).

A verdade de cada coleta vem do rótulo: andando, sentar_levantar, queda_simulada e mao = movimento;
vazio e parado = sem movimento. Outros rótulos aparecem na tabela por rótulo, fora da matriz.
O relatório vai para resultados/ e também é impresso na tela.
"""

import argparse
from datetime import datetime
from pathlib import Path

import numpy as np

import conjunto
import detector
from analise import carregar

RAIZ = Path(__file__).resolve().parent.parent


def serie(coleta):
    dados = carregar(coleta["caminho"], remover_nulas=False)
    return detector.serie_oscilacao(dados["t"], dados["amp_completa"])[1]


def metricas(vp, fp, fn, vn):
    total = vp + fp + fn + vn
    div = lambda a, b: a / b if b else float("nan")
    precisao, recall = div(vp, vp + fp), div(vp, vp + fn)
    return {
        "acuracia": div(vp + vn, total),
        "precisao": precisao,
        "recall": recall,
        "especificidade": div(vn, vn + fp),
        "f1": div(2 * precisao * recall, precisao + recall) if vp else float("nan"),
    }


def pct(x):
    return "–" if np.isnan(x) else f"{x * 100:.1f}%".replace(".", ",")


def avaliar(coletas, ajuste=None, teste=None):
    aj, te, s_aj, s_te = conjunto.dividir(coletas, ajuste, teste)
    vazios = [c for c in aj if c["rotulo"] == "vazio"]
    if not vazios:
        raise SystemExit("Não há coletas 'vazio' nas sessões de ajuste. Grave pelo menos uma (protocolo: duas de 60 s no início).")
    if not te:
        raise SystemExit("Não há coletas nas sessões de teste. O protocolo usa sessões ímpares para ajuste e pares para teste.")

    valores_calib = np.concatenate([serie(c) for c in vazios])
    limiar = detector.limiar_de_calibracao(valores_calib)

    janelas = {"vp": 0, "fp": 0, "fn": 0, "vn": 0}
    coletas_m = {"vp": 0, "fp": 0, "fn": 0, "vn": 0}
    por_rotulo = {}
    for c in te:
        v = serie(c)
        ok = ~np.isnan(v)
        estados = detector.detectar(v, limiar)[ok]
        fracao = float(estados.mean()) if len(estados) else float("nan")
        r = por_rotulo.setdefault(c["rotulo"], {"coletas": 0, "medidas": 0, "marcadas": 0})
        r["coletas"] += 1; r["medidas"] += len(estados); r["marcadas"] += int(estados.sum())
        if c["rotulo"] in conjunto.COM_MOVIMENTO:
            janelas["vp"] += int(estados.sum()); janelas["fn"] += int((~estados).sum())
            coletas_m["vp" if fracao > 0.5 else "fn"] += 1
        elif c["rotulo"] in conjunto.SEM_MOVIMENTO:
            janelas["fp"] += int(estados.sum()); janelas["vn"] += int((~estados).sum())
            coletas_m["fp" if fracao > 0.5 else "vn"] += 1

    return {
        "limiar": limiar, "n_calib": int((~np.isnan(valores_calib)).sum()), "coletas_calib": len(vazios),
        "sessoes_ajuste": s_aj, "sessoes_teste": s_te, "n_ajuste": len(aj), "n_teste": len(te),
        "janelas": janelas, "coletas": coletas_m, "por_rotulo": por_rotulo,
        "m_janelas": metricas(**janelas), "m_coletas": metricas(**coletas_m),
    }


def relatorio(r, simulado):
    j, c = r["janelas"], r["coletas"]
    linhas = [
        f"# Avaliação do detector · {datetime.now():%d/%m/%Y %H:%M}",
        "",
    ]
    if simulado:
        linhas += ["> **ATENÇÃO: há coletas marcadas como sintéticas/teste. Este relatório não é resultado do projeto.**", ""]
    linhas += [
        f"- Sessões de ajuste: {', '.join(r['sessoes_ajuste'])} ({r['n_ajuste']} coletas). Sessões de teste: {', '.join(r['sessoes_teste'])} ({r['n_teste']} coletas).",
        f"- Limiar: {r['limiar']:.4f}, calculado com {r['n_calib']} medidas de {r['coletas_calib']} coleta(s) \"vazio\" do ajuste (média + {detector.K_DESVIOS:g} desvios, mínimo {detector.FATOR_MIN:g}× a média).",
        f"- Detector: janela de {detector.JANELA_S:g} s, uma medida a cada {detector.PASSO_S:g} s, liga com {detector.CONFIRMA_LIGA} seguidas acima e desliga com {detector.CONFIRMA_DESLIGA} seguidas abaixo.",
        "",
        "## Por medição (a cada 0,2 s)",
        "",
        "| Verdade \\ Detector | Movimento | Sem movimento |",
        "|---|---|---|",
        f"| Movimento | {j['vp']} | {j['fn']} |",
        f"| Sem movimento | {j['fp']} | {j['vn']} |",
        "",
        "| Acurácia | Precisão | Recall (sensibilidade) | Especificidade | F1 |",
        "|---|---|---|---|---|",
        "| " + " | ".join(pct(r["m_janelas"][k]) for k in ("acuracia", "precisao", "recall", "especificidade", "f1")) + " |",
        "",
        "As medições se sobrepõem (janela de 1 s, uma a cada 0,2 s) e as vizinhas são parecidas. Por isso o resultado por coleta, abaixo, é o mais honesto para citar.",
        "",
        "## Por coleta (o que o detector disse na maior parte do tempo)",
        "",
        "| Verdade \\ Detector | Movimento | Sem movimento |",
        "|---|---|---|",
        f"| Movimento | {c['vp']} | {c['fn']} |",
        f"| Sem movimento | {c['fp']} | {c['vn']} |",
        "",
        "| Acurácia | Precisão | Recall (sensibilidade) | Especificidade | F1 |",
        "|---|---|---|---|---|",
        "| " + " | ".join(pct(r["m_coletas"][k]) for k in ("acuracia", "precisao", "recall", "especificidade", "f1")) + " |",
        "",
        "## Por rótulo (sessões de teste)",
        "",
        "| Rótulo | Coletas | Medições | Marcadas como movimento |",
        "|---|---|---|---|",
    ]
    for rot, d in sorted(r["por_rotulo"].items()):
        linhas.append(f"| {rot} | {d['coletas']} | {d['medidas']} | {pct(d['marcadas'] / d['medidas']) if d['medidas'] else '–'} |")
    poucos = [rot for rot, d in r["por_rotulo"].items() if d["coletas"] < 5]
    if poucos:
        linhas += ["", f"Poucas coletas de teste (menos de 5) em: {', '.join(sorted(poucos))}. Os números podem mudar bastante com mais dados."]
    return "\n".join(linhas) + "\n"


def main():
    p = argparse.ArgumentParser(description="Avalia o detector de movimento com coletas gravadas.")
    p.add_argument("--pasta", default=str(conjunto.PASTA_PADRAO))
    p.add_argument("--ajuste", nargs="*", help="sessões de ajuste (padrão: as ímpares)")
    p.add_argument("--teste", nargs="*", help="sessões de teste (padrão: as pares)")
    p.add_argument("--saida", default=str(RAIZ / "resultados"))
    args = p.parse_args()

    coletas = conjunto.listar(args.pasta)
    if not coletas:
        raise SystemExit(f"Nenhuma coleta com .json em {args.pasta}.")
    r = avaliar(coletas, args.ajuste, args.teste)
    simulado = any("SINTETICO" in (c["meta"].get("obs") or "").upper() for c in coletas)
    texto = relatorio(r, simulado)
    saida = Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)
    arq = saida / f"avaliacao-{datetime.now():%Y%m%d-%H%M%S}.md"
    arq.write_text(texto, encoding="utf-8")
    print(texto)
    print(f"Relatório salvo em {arq}")


if __name__ == "__main__":
    main()

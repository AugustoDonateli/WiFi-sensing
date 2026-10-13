"""Classificador simples (Random Forest) para separar vazio / parado / andando etc. com coletas reais.

Precisa de numpy e scikit-learn:
    python -m pip install numpy scikit-learn
    python ferramentas/classificar.py
    python ferramentas/classificar.py --ajuste S1 S3 --teste S2 --rotulos vazio parado andando

Como funciona:
  1. Cada coleta é cortada em janelas de 1 s (uma nova a cada 0,5 s).
  2. De cada janela saem 6 números simples (lista CARACTERISTICAS abaixo).
  3. O modelo aprende só com as sessões de ajuste e é medido só nas sessões de teste,
     para gravações parecidas da mesma sessão não aparecerem nos dois lados.
  4. O relatório compara com o "chute" de sempre responder a classe mais comum.
"""

import argparse
from datetime import datetime
from pathlib import Path

import numpy as np

import conjunto
import detector
from analise import carregar

RAIZ = Path(__file__).resolve().parent.parent
JANELA_S = 1.0
PASSO_S = 0.5
CARACTERISTICAS = [
    ("oscilacao", "desvio padrão médio da amplitude (a mesma medida do detector)"),
    ("oscilacao_max", "maior desvio padrão entre as subportadoras"),
    ("variacao_pacote", "mudança média de um pacote para o seguinte, relativa à amplitude média"),
    ("descorrelacao", "1 menos a correlação média entre pacotes seguidos"),
    ("rssi_desvio", "desvio padrão do RSSI"),
    ("pacotes", "pacotes recebidos na janela"),
]


def caracteristicas_janela(amps, rssi):
    a = np.array(amps, dtype=float)
    a[:, list(detector.IGNORAR)] = 0.0
    uteis = a.mean(axis=0) >= 0.5
    if a.shape[0] < detector.MIN_PACOTES or uteis.sum() < 3:
        return None
    a = a[:, uteis]
    dp = a.std(axis=0)
    media = a.mean()
    dif = np.abs(np.diff(a, axis=0)).mean() / media if media else 0.0
    corr = []
    for x, y in zip(a[:-1], a[1:]):
        if x.std() > 0 and y.std() > 0:
            corr.append(np.corrcoef(x, y)[0, 1])
    descorr = 1 - float(np.mean(corr)) if corr else 0.0
    return [float(dp.mean()), float(dp.max()), float(dif), descorr, float(np.std(rssi)), float(a.shape[0])]


def janelas_da_coleta(coleta):
    d = carregar(coleta["caminho"], remover_nulas=False)
    t, amps, rssi = d["t"], d["amp_completa"], d["rssi"]
    linhas = []
    if len(t) == 0:
        return linhas
    for fim in np.arange(t[0] + JANELA_S, t[-1] + 1e-9, PASSO_S):
        sel = (t >= fim - JANELA_S) & (t <= fim)
        f = caracteristicas_janela(amps[sel], rssi[sel])
        if f is not None:
            linhas.append(f)
    return linhas


def montar(coletas, rotulos):
    X, y, grupo = [], [], []
    for i, c in enumerate(coletas):
        if rotulos and c["rotulo"] not in rotulos:
            continue
        for f in janelas_da_coleta(c):
            X.append(f); y.append(c["rotulo"]); grupo.append(i)
    return np.array(X), np.array(y), np.array(grupo)


def tabela_confusao(classes, verdade, previsto):
    linhas = ["| Verdade \\ Previsto | " + " | ".join(classes) + " |", "|---" * (len(classes) + 1) + "|"]
    for a in classes:
        linhas.append(f"| {a} | " + " | ".join(str(int(np.sum((verdade == a) & (previsto == b)))) for b in classes) + " |")
    return linhas


def treinar_e_medir(coletas, ajuste=None, teste=None, rotulos=None):
    """Treina só com as sessões de ajuste e mede só nas de teste. Devolve um dicionário com tudo."""
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import classification_report

    treino_c, teste_c, s_aj, s_te = conjunto.dividir(coletas, ajuste, teste)
    Xtr, ytr, _ = montar(treino_c, rotulos)
    Xte, yte, gte = montar(teste_c, rotulos)
    if len(Xtr) == 0 or len(Xte) == 0:
        raise SystemExit("Faltam janelas no treino ou no teste. Confira as sessões e os rótulos.")

    modelo = RandomForestClassifier(n_estimators=300, min_samples_leaf=2, class_weight="balanced", random_state=0)
    modelo.fit(Xtr, ytr)
    prev = modelo.predict(Xte)
    classes = sorted(set(ytr) | set(yte))

    # Por coleta: a classe que o modelo mais respondeu nas janelas daquela coleta.
    v_col, p_col = [], []
    for g in np.unique(gte):
        sel = gte == g
        valores, contagens = np.unique(prev[sel], return_counts=True)
        v_col.append(yte[sel][0]); p_col.append(valores[np.argmax(contagens)])

    mais_comum = max(sorted(set(ytr)), key=list(ytr).count)
    return {
        "modelo": modelo, "classes": classes, "yte": yte, "prev": prev,
        "v_col": np.array(v_col), "p_col": np.array(p_col),
        "s_aj": s_aj, "s_te": s_te, "n_treino": len(Xtr), "n_treino_coletas": len(treino_c),
        "mais_comum": mais_comum, "chute": float(np.mean(yte == mais_comum)),
        "rel": classification_report(yte, prev, labels=classes, output_dict=True, zero_division=0),
    }


def relatorio(r, simulado):
    classes, yte, prev, v_col, p_col, rel = r["classes"], r["yte"], r["prev"], r["v_col"], r["p_col"], r["rel"]
    linhas = [f"# Classificador (Random Forest) · {datetime.now():%d/%m/%Y %H:%M}", ""]
    if simulado:
        linhas += ["> **ATENÇÃO: há coletas marcadas como sintéticas/teste. Este relatório não é resultado do projeto.**", ""]
    linhas += [
        f"- Treino: sessões {', '.join(r['s_aj'])} · {r['n_treino']} janelas de {r['n_treino_coletas']} coletas.",
        f"- Teste: sessões {', '.join(r['s_te'])} · {len(yte)} janelas de {len(v_col)} coletas.",
        f"- Janelas de {JANELA_S:g} s, uma nova a cada {PASSO_S:g} s (as vizinhas se sobrepõem).",
        "",
        "## Por janela",
        "",
        *tabela_confusao(classes, yte, prev),
        "",
        f"Acurácia: **{rel['accuracy'] * 100:.1f}%** · chute (sempre \"{r['mais_comum']}\"): {r['chute'] * 100:.1f}%".replace(".", ","),
        "",
        "| Classe | Precisão | Recall | F1 | Janelas de teste |",
        "|---|---|---|---|---|",
    ]
    for cl in classes:
        d = rel.get(cl, {})
        linhas.append(f"| {cl} | {d.get('precision', 0) * 100:.1f}% | {d.get('recall', 0) * 100:.1f}% | {d.get('f1-score', 0) * 100:.1f}% | {int(d.get('support', 0))} |".replace(".", ","))
    linhas += [
        "",
        "## Por coleta (a classe mais respondida em cada gravação)",
        "",
        *tabela_confusao(classes, v_col, p_col),
        "",
        f"Acurácia por coleta: **{np.mean(v_col == p_col) * 100:.1f}%** ({int(np.sum(v_col == p_col))} de {len(v_col)})".replace(".", ","),
        "",
        "As janelas vizinhas se sobrepõem e se parecem; o resultado por coleta é o mais honesto para citar.",
        "",
        "## Peso de cada característica no modelo",
        "",
        "| Característica | O que é | Peso |",
        "|---|---|---|",
    ]
    for (nome, desc), peso in sorted(zip(CARACTERISTICAS, r["modelo"].feature_importances_), key=lambda x: -x[1]):
        linhas.append(f"| {nome} | {desc} | {peso:.2f} |".replace(".", ","))
    poucos = [cl for cl in classes if np.sum(v_col == cl) < 5]
    if poucos:
        linhas += ["", f"Menos de 5 coletas de teste em: {', '.join(poucos)}. Com tão pouco, os números ainda variam muito."]
    return "\n".join(linhas) + "\n"


def main():
    try:
        import sklearn  # noqa: F401
    except ImportError:
        raise SystemExit("Falta o scikit-learn. Instale com: python -m pip install scikit-learn")

    p = argparse.ArgumentParser(description="Treina e mede um classificador com coletas gravadas.")
    p.add_argument("--pasta", default=str(conjunto.PASTA_PADRAO))
    p.add_argument("--ajuste", nargs="*", help="sessões de treino (padrão: as ímpares)")
    p.add_argument("--teste", nargs="*", help="sessões de teste (padrão: as pares)")
    p.add_argument("--rotulos", nargs="*", help="só estes rótulos (padrão: todos)")
    p.add_argument("--saida", default=str(RAIZ / "resultados"))
    args = p.parse_args()

    coletas = conjunto.listar(args.pasta)
    if not coletas:
        raise SystemExit(f"Nenhuma coleta com .json em {args.pasta}.")
    r = treinar_e_medir(coletas, args.ajuste, args.teste, args.rotulos)
    simulado = any("SINTETICO" in (c["meta"].get("obs") or "").upper() for c in coletas)
    texto = relatorio(r, simulado)

    saida = Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)
    arq = saida / f"classificador-{datetime.now():%Y%m%d-%H%M%S}.md"
    arq.write_text(texto, encoding="utf-8")
    print(texto)
    print(f"Relatório salvo em {arq}")


if __name__ == "__main__":
    main()

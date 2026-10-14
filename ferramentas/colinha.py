"""Gera a colinha impressa da apresentação "Como funciona" (docs/colinha.md) a partir do demo/roteiro.js.

O roteiro é a fonte única: a janela do apresentador e esta colinha leem o mesmo arquivo.
Editou o roteiro? Rode de novo:

    python ferramentas/colinha.py            # escreve docs/colinha.md
    python ferramentas/colinha.py -          # mostra na tela

Precisa do Node.js (o roteiro é JavaScript).
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
ROTEIRO = RAIZ / "demo" / "roteiro.js"
SAIDA = RAIZ / "docs" / "colinha.md"


def ler_roteiro(caminho=ROTEIRO):
    node = shutil.which("node")
    if not node:
        raise SystemExit("Precisa do Node.js para ler o roteiro.js.")
    js = "const R = require(process.argv[1]); console.log(JSON.stringify(R));"
    r = subprocess.run([node, "-e", js, str(caminho)], capture_output=True, text=True, timeout=30, check=True)
    return json.loads(r.stdout)


def sem_marcas(t):
    return str(t or "").replace("*", "")


def minutos(s):
    return f"{s // 60}:{s % 60:02d}"


def gerar(R):
    cenas = R["cenas"]
    tot = sum(c.get("seg", {}).get("completa", 0) for c in cenas)
    tot_curta = sum(c["seg"]["curta"] for c in cenas if c.get("seg", {}).get("curta"))
    n_curta = sum(1 for c in cenas if c.get("seg", {}).get("curta"))
    L = [
        "# Colinha da apresentação \"Como funciona\"",
        "",
        "Gerada por `ferramentas/colinha.py` a partir do `demo/roteiro.js`. Não edite aqui: edite o roteiro e gere de novo.",
        "",
        f"- **Completa:** {len(cenas)} cenas, cerca de {minutos(tot)} (para avaliador).",
        f"- **Curta:** {n_curta} cenas, cerca de {minutos(tot_curta)} (para visitante). As cenas da curta estão marcadas com ●.",
        "- Na janela do apresentador (tecla P na TV), a mesma colinha aparece cena a cena. A tecla Q mostra as perguntas.",
        "",
        "Como ler: a **fala** é o que dizer, em frases curtas (não precisa decorar). As **ações** dizem o que fazer:",
        "APONTE, PERGUNTE (e espere a resposta), PAUSA (deixe a animação falar), FAÇA. A **ponte** leva para a próxima cena.",
        "",
    ]
    cap_atual = None
    for i, c in enumerate(cenas, 1):
        if c.get("cap") and c["cap"] != cap_atual:
            cap_atual = c["cap"]
            L += [f"## {R['capitulos'][cap_atual]}", ""]
        seg = c.get("seg", {})
        marca = " ●" if seg.get("curta") else ""
        tempo = f"{seg.get('completa', 0)} s" + (f" (curta: {seg['curta']} s)" if seg.get("curta") else "")
        L.append(f"### {i}. {sem_marcas(c['titulo'])}{marca}")
        L.append(f"*{tempo}*")
        L.append("")
        if c.get("tituloSimulacao"):
            L.append(f"Na simulação, a TV mostra: \"{sem_marcas(c['tituloSimulacao'])}\"")
            L.append("")
        L.append(f"**Fala.** {c.get('fala') or c.get('notas') or ''}")
        L.append("")
        for a in c.get("acao") or []:
            L.append(f"- {a}")
        if c.get("acao"):
            L.append("")
        if c.get("ponte"):
            L.append(f"→ *{c['ponte']}*")
            L.append("")
        for q in c.get("perguntas") or []:
            L.append(f"> **{q['p']}** {q['r']}")
            L.append(">")
        if c.get("perguntas"):
            L.pop()
            L.append("")
    L += ["## Perguntas que podem aparecer em qualquer momento", ""]
    for q in R.get("perguntasGerais") or []:
        L.append(f"- **{q['p']}** {q['r']}")
    L.append("")
    return "\n".join(L)


def main():
    texto = gerar(ler_roteiro())
    if len(sys.argv) > 1 and sys.argv[1] == "-":
        print(texto)
    else:
        SAIDA.write_text(texto, encoding="utf-8")
        print(f"Escrevi {SAIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()

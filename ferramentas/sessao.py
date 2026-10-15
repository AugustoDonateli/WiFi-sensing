"""Guia uma sessão de coleta inteira, na ordem do protocolo (experimentos/protocolo.md).

Em vez de digitar 18 comandos, roda este e segue o que aparece na tela:

    python ferramentas/sessao.py --porta COM9 --sessao S1 --distancia 1.5 --obs "casa, sala, A em 50/s"

Antes de cada coleta, diz o que fazer e espera o Enter. Depois, pergunta se ficou boa.
Se não ficou (alguém entrou na sala, a TV ligou...), a coleta é marcada como descartada,
com o motivo, e gravada de novo. Nada é apagado.

Parou no meio? Rode de novo com --continuar N (o número da próxima coleta).
"""

import argparse
import csv
import io
import json
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
REGISTRO = RAIZ / "experimentos" / "registro_coletas.csv"

# Protocolo: 2 vazio de 60 s, 5 de cada classe de 30 s alternando, 1 vazio de 60 s no fim.
MEIO = ["vazio", "andando", "parado", "andando", "vazio", "parado", "vazio", "andando",
        "parado", "vazio", "andando", "parado", "andando", "vazio", "parado"]
SEQUENCIA = [("vazio", 60), ("vazio", 60)] + [(r, 30) for r in MEIO] + [("vazio", 60)]

O_QUE_FAZER = {
    "vazio": "Ninguém perto das placas. Saia da sala (ou fique longe e parado) até aparecer o Fim.",
    "andando": "Ande indo e voltando, cruzando a linha entre as placas, em ritmo normal, até o Fim.",
    "parado": "Fique de pé no meio da linha entre as placas, parado, respirando normal, até o Fim.",
}


def comando(args, rotulo, duracao):
    return [
        sys.executable, str(AQUI / "capturar.py"), "--porta", args.porta, "--sessao", args.sessao,
        "--rotulo", rotulo, "--duracao", str(duracao), "--espera", str(args.espera),
        "--distancia", args.distancia, "--parede", args.parede,
        "--participante", "-" if rotulo == "vazio" else args.participante, "--obs", args.obs,
    ]


def marcar_descartada(json_path, motivo, registro=REGISTRO):
    """Marca a coleta como descartada no .json e no registro, com o motivo. Não apaga nada."""
    json_path = Path(json_path)
    meta = json.loads(json_path.read_text(encoding="utf-8"))
    meta["descartada"] = True
    meta["obs"] = f'{meta.get("obs", "")} | DESCARTADA: {motivo}'.strip(" |")
    json_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    registro = Path(registro)
    if registro.exists():
        texto = registro.read_text(encoding="utf-8")
        linhas = list(csv.reader(io.StringIO(texto)))
        for linha in linhas[1:]:
            if linha and linha[0] == meta.get("arquivo"):
                linha[-1] = meta["obs"]
        saida = io.StringIO()
        csv.writer(saida, lineterminator="\r\n" if "\r\n" in texto else "\n").writerows(linhas)
        registro.write_text(saida.getvalue(), encoding="utf-8")
    return meta


def main():
    p = argparse.ArgumentParser(description="Guia uma sessão de coleta inteira, na ordem do protocolo.")
    p.add_argument("--porta", required=True, help="porta da Placa B, ex.: COM9")
    p.add_argument("--sessao", required=True, help="S1, S2...")
    p.add_argument("--distancia", required=True, help="distância entre as placas, em metros")
    p.add_argument("--parede", choices=["sim", "nao"], default="nao")
    p.add_argument("--participante", default="P1", help="código de quem anda/fica parado (sem nome)")
    p.add_argument("--obs", required=True, help='onde e como, ex.: "casa, sala, A em 50/s"')
    p.add_argument("--espera", type=int, default=10, help="contagem antes de cada coleta (padrão 10 s)")
    p.add_argument("--continuar", type=int, default=1, help="começar da coleta N (padrão 1)")
    args = p.parse_args()

    pasta = RAIZ / "dados" / "brutos"
    total = len(SEQUENCIA)
    print(f"Sessão {args.sessao}: {total} coletas, uns {sum(d for _, d in SEQUENCIA) // 60 + total // 2} minutos.")
    print("Antes de tudo: feche o site e o monitor (a porta precisa estar livre).\n")
    n = args.continuar
    while n <= total:
        rotulo, duracao = SEQUENCIA[n - 1]
        print(f"===== Coleta {n} de {total}: {rotulo.upper()} ({duracao} s) =====")
        print(O_QUE_FAZER[rotulo])
        if input("Enter para gravar (ou q para sair): ").strip().lower() == "q":
            print(f"Parou. Para continuar depois: --continuar {n}")
            return
        antes = set(pasta.glob("*.json"))
        r = subprocess.run(comando(args, rotulo, duracao))
        novos = sorted(set(pasta.glob("*.json")) - antes)
        if r.returncode != 0 or not novos:
            print("A coleta não foi gravada (veja a mensagem acima). Vamos tentar de novo.\n")
            continue
        resp = input("Ficou boa? Enter = sim | r = refazer (e marcar esta como descartada): ").strip().lower()
        if resp == "r":
            motivo = input("Motivo, em poucas palavras (ex.: alguém entrou na sala): ").strip() or "refeita"
            marcar_descartada(novos[-1], motivo)
            print("Marcada como descartada. Vamos gravar de novo.\n")
            continue
        print()
        n += 1
    print(f"Sessão {args.sessao} completa. Agora: git add dados experimentos, git commit e git push.")


if __name__ == "__main__":
    main()

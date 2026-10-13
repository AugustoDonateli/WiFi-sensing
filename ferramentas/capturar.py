"""Grava uma coleta de CSI da Placa B (receptora) em arquivo, com rótulo e anotações.

Precisa só do pyserial, que já vem no Python do ESP-IDF. Exemplo (no "ESP-IDF PowerShell"):

    python ferramentas/capturar.py --porta COM3 --rotulo vazio --duracao 30

Feche o `idf.py monitor` antes: só um programa por vez pode usar a porta COM.
"""

import argparse
import csv
import json
import sys
import time
from datetime import datetime
from pathlib import Path

from csi_formato import COLUNAS, LinhaInvalida, ler_linha

RAIZ = Path(__file__).resolve().parent.parent
REGISTRO = RAIZ / "experimentos" / "registro_coletas.csv"
CAMPOS_REGISTRO = [
    "arquivo", "inicio", "rotulo", "participante", "distancia_m", "parede", "duracao_s",
    "pacotes_validos", "linhas_invalidas", "pacotes_perdidos", "taxa_media_por_s", "status", "obs",
]


def capturar(porta, saida, duracao, relogio=time.monotonic, mostrar=print):
    """Lê linhas da porta e grava as válidas em `saida` até `duracao` segundos.

    `porta` precisa ter readline() que devolve bytes (pyserial ou um objeto falso nos testes).
    Devolve um dicionário com as contagens.
    """
    saida.write(",".join(["pc_tempo_s"] + COLUNAS) + "\n")

    stats = {"pacotes_validos": 0, "linhas_invalidas": 0, "pacotes_perdidos": 0, "status": "completa"}
    inicio = relogio()
    ultimo_id = None
    ultimo_aviso = inicio
    na_janela, rssi_janela = 0, []
    avisou_sem_dados = False

    try:
        while True:
            agora = relogio()
            decorrido = agora - inicio
            if decorrido >= duracao:
                break

            bruto = porta.readline()
            if bruto:
                texto = bruto.decode("utf-8", errors="replace").strip()
                try:
                    registro = ler_linha(texto)
                except LinhaInvalida:
                    stats["linhas_invalidas"] += 1
                    registro = None
                if registro is not None:
                    # Grava a linha original sem mexer, só com o tempo do PC na frente.
                    saida.write(f"{decorrido:.4f},{texto}\n")
                    stats["pacotes_validos"] += 1
                    if ultimo_id is not None and registro.id > ultimo_id + 1:
                        stats["pacotes_perdidos"] += registro.id - ultimo_id - 1
                    ultimo_id = registro.id
                    na_janela += 1
                    rssi_janela.append(registro.rssi)

            if agora - ultimo_aviso >= 1.0:
                rssi = f"{sum(rssi_janela) / len(rssi_janela):.0f} dBm" if rssi_janela else "-"
                mostrar(
                    f"  t={decorrido:4.0f}s | {na_janela:3d} pacotes/s | RSSI {rssi} | "
                    f"inválidas {stats['linhas_invalidas']} | perdidos {stats['pacotes_perdidos']}"
                )
                if stats["pacotes_validos"] == 0 and decorrido >= 5 and not avisou_sem_dados:
                    mostrar(
                        "  ! Nenhuma linha CSI_DATA ainda. A Placa A está ligada? "
                        "Esta é a porta da Placa B? O monitor está aberto em outro terminal?"
                    )
                    avisou_sem_dados = True
                ultimo_aviso = agora
                na_janela, rssi_janela = 0, []
    except KeyboardInterrupt:
        stats["status"] = "interrompida"

    stats["duracao_s"] = round(relogio() - inicio, 2)
    stats["taxa_media_por_s"] = round(stats["pacotes_validos"] / stats["duracao_s"], 1) if stats["duracao_s"] else 0
    return stats


def anotar_registro(caminho, linha):
    novo = not caminho.exists()
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with open(caminho, "a", newline="", encoding="utf-8") as f:
        escritor = csv.DictWriter(f, fieldnames=CAMPOS_REGISTRO)
        if novo:
            escritor.writeheader()
        escritor.writerow(linha)


def main():
    p = argparse.ArgumentParser(description="Grava uma coleta de CSI com rótulo.")
    p.add_argument("--porta", required=True, help="porta da Placa B, ex.: COM3")
    p.add_argument("--rotulo", required=True, help="classe da coleta: vazio, parado, andando...")
    p.add_argument("--duracao", type=float, default=30, help="segundos de gravação (padrão 30)")
    p.add_argument("--espera", type=int, default=5, help="contagem regressiva antes de gravar (padrão 5)")
    p.add_argument("--participante", default="-", help="código anônimo, ex.: P1 (sem nome)")
    p.add_argument("--distancia", default="", help="distância entre as placas, em metros")
    p.add_argument("--parede", choices=["sim", "nao"], default="nao")
    p.add_argument("--obs", default="", help="qualquer coisa estranha que aconteceu")
    p.add_argument("--pasta", default=str(RAIZ / "dados" / "brutos"))
    p.add_argument("--baud", type=int, default=921600)
    p.add_argument("--registro", default=str(REGISTRO), help="planilha onde a coleta é anotada")
    args = p.parse_args()

    try:
        import serial
    except ImportError:
        sys.exit("pyserial não encontrado. Rode este script no 'ESP-IDF PowerShell' ou instale com: python -m pip install pyserial")

    inicio = datetime.now()
    pasta = Path(args.pasta)
    pasta.mkdir(parents=True, exist_ok=True)
    nome = f"{inicio:%Y%m%d-%H%M%S}_{args.rotulo}"
    arquivo_csv = pasta / f"{nome}.csv"

    porta = serial.Serial()
    porta.port = args.porta
    porta.baudrate = args.baud
    porta.timeout = 0.5
    # Mantém DTR/RTS desligados para abrir a porta sem reiniciar a placa.
    porta.dtr = False
    porta.rts = False
    try:
        porta.open()
    except serial.SerialException as erro:
        sys.exit(f"Não consegui abrir {args.porta}: {erro}\nConfira o número da porta e feche o monitor/outros programas.")

    with porta:
        for n in range(args.espera, 0, -1):
            print(f"Começa em {n}...")
            time.sleep(1)
        porta.reset_input_buffer()
        print(f"GRAVANDO '{args.rotulo}' por {args.duracao:.0f} s em {arquivo_csv.name} (Ctrl+C para parar)")
        with open(arquivo_csv, "w", newline="", encoding="utf-8") as saida:
            stats = capturar(porta, saida, args.duracao)

    metadados = {
        "arquivo": arquivo_csv.name,
        "inicio": inicio.isoformat(timespec="seconds"),
        "rotulo": args.rotulo,
        "participante": args.participante,
        "distancia_m": args.distancia,
        "parede": args.parede,
        "obs": args.obs,
        "porta": args.porta,
        "baud": args.baud,
        **stats,
    }
    with open(pasta / f"{nome}.json", "w", encoding="utf-8") as f:
        json.dump(metadados, f, ensure_ascii=False, indent=2)
    registro = Path(args.registro)
    anotar_registro(registro, {c: metadados.get(c, "") for c in CAMPOS_REGISTRO})

    print(
        f"\nFim ({stats['status']}). {stats['pacotes_validos']} pacotes válidos, "
        f"{stats['taxa_media_por_s']} por segundo, {stats['pacotes_perdidos']} perdidos, "
        f"{stats['linhas_invalidas']} linhas inválidas."
    )
    print(f"Arquivo: {arquivo_csv}\nAnotado em: {registro}")
    if stats["pacotes_validos"] == 0:
        print("ATENÇÃO: nenhum pacote gravado. Veja docs/erros-provaveis.md.")


if __name__ == "__main__":
    main()

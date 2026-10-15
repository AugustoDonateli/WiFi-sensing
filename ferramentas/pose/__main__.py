"""Comandos offline do laboratório: python -m ferramentas.pose --help."""

import argparse
import csv
from pathlib import Path
import sys

from . import JOINTS
from .data import Config, load_bundle, prepare, read_recording, save_bundle, summary, write_json
from .labels import LABEL_COLUMNS, attach_labels, import_openpose


def unused(path):
    if Path(path).exists():
        raise ValueError(f"Saída já existe: {path}. Escolha outro nome para preservar o experimento.")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Wave Sense Pose v0 — laboratório offline de seis articulações; ainda sem pesos validados nas placas.")
    commands = parser.add_subparsers(dest="command",required=True)
    p = commands.add_parser("preparar",help="Audita CSV brutos e cria janelas com máscara de qualidade; funciona em S0.")
    p.add_argument("entrada",nargs="+")
    p.add_argument("--saida",required=True,type=Path)
    p.add_argument("--cobertura-minima",type=float,default=.8)
    p.add_argument("--intervalo-maximo",type=float,default=.1,help="segundos sem pacote tolerados por janela")
    p = commands.add_parser("modelo-gabarito",help="Cria o contrato CSV e modelo de sincronização a preencher com medições.")
    p.add_argument("--saida",required=True,type=Path)
    p = commands.add_parser("importar-openpose",help="Converte saída BODY_25 já extraída do vídeo; não instala nem executa OpenPose.")
    p.add_argument("pasta",type=Path)
    p.add_argument("--tempos",required=True,type=Path)
    p.add_argument("--largura",required=True,type=int)
    p.add_argument("--altura",required=True,type=int)
    p.add_argument("--escala",required=True,choices=["pixels","normalizada"])
    p.add_argument("--saida",required=True,type=Path)
    p = commands.add_parser("rotular",help="Alinha gabarito visual ao relógio do CSI.")
    p.add_argument("conjunto",type=Path)
    p.add_argument("--gabarito",required=True,type=Path)
    p.add_argument("--sincronizacao",required=True,type=Path)
    p.add_argument("--saida",required=True,type=Path)
    p = commands.add_parser("treinar",help="Treina com gabarito; exige sessões diferentes de treino/validação.")
    p.add_argument("--treino",required=True,nargs="+")
    p.add_argument("--validacao",required=True,nargs="+")
    p.add_argument("--saida",required=True,type=Path)
    p.add_argument("--epocas",type=int,default=100)
    p.add_argument("--paciencia",type=int,default=15)
    p.add_argument("--seed",type=int,default=42)
    p = commands.add_parser("avaliar",help="Avalia sessões novas contra pose média e CSI embaralhado.")
    p.add_argument("--teste",required=True,nargs="+")
    p.add_argument("--modelo",required=True,type=Path)
    p.add_argument("--saida",required=True,type=Path)
    p = commands.add_parser("prever",help="Exporta coordenadas em replay; v0 pressupõe uma pessoa presente.")
    p.add_argument("conjunto",type=Path)
    p.add_argument("--modelo",required=True,type=Path)
    p.add_argument("--saida",required=True,type=Path)
    p.add_argument("--uma-pessoa-confirmada",action="store_true",help="O experimento tem exatamente uma pessoa; v0 não detecta presença.")
    args = parser.parse_args(argv)
    try:
        if args.command == "preparar":
            files = []
            for name in args.entrada:
                path = Path(name)
                files.extend(sorted(path.glob("*.csv")) if path.is_dir() else [path])
            if not files or len({p.stem for p in files}) != len(files):
                raise ValueError("Nenhum CSV encontrado, ou nomes de saída duplicados.")
            for p in files:
                unused(args.saida/(p.stem+".npz"))
                unused(args.saida/(p.stem+".qualidade.json"))
            unused(args.saida/"resumo.json")
            config = Config(min_coverage=args.cobertura_minima,max_gap_s=args.intervalo_maximo)
            reports = []
            for p in files:
                data = prepare(read_recording(p),config)
                save_bundle(args.saida/(p.stem+".npz"),data)
                report = summary(data)
                write_json(args.saida/(p.stem+".qualidade.json"),report)
                reports.append(report)
                q = report["window_quality"]
                print(f"{p.name}: {q['accepted']}/{q['total']} janelas aceitas; {q['labeled_and_accepted']} com gabarito.")
            write_json(args.saida/"resumo.json",reports)
        elif args.command == "modelo-gabarito":
            unused(args.saida/"gabarito.csv")
            unused(args.saida/"sincronizacao.json")
            args.saida.mkdir(parents=True,exist_ok=True)
            with (args.saida/"gabarito.csv").open("w",newline="",encoding="utf-8") as f:
                csv.writer(f).writerow(LABEL_COLUMNS)
            write_json(args.saida/"sincronizacao.json",{
                "schema":1,"largura_imagem":None,"altura_imagem":None,
                "metodo":"","observacoes":"","incerteza_s":None,"marcadores":[],
                "instrucoes":"Preencher com medições reais. Cada marcador: csi_s, video_s. Pelo menos dois, separados por 5 s; não inventar offset ou incerteza."})
            print("Modelo criado. Consulte ferramentas/pose/README.md antes de gravar o gabarito.")
        elif args.command == "importar-openpose":
            unused(args.saida)
            n = import_openpose(args.pasta,args.tempos,args.saida,args.largura,args.altura,args.escala)
            print(f"{n} quadros importados; ainda precisam de sincronização com CSI.")
        elif args.command == "rotular":
            unused(args.saida)
            data = attach_labels(load_bundle(args.conjunto),args.gabarito,args.sincronizacao)
            save_bundle(args.saida,data)
            print(f"{summary(data)['window_quality']['labeled_and_accepted']} janelas com sinal e gabarito utilizáveis.")
        elif args.command == "treinar":
            from .model import train
            unused(args.saida.with_suffix(".treino.json"))
            result = train(args.treino,args.validacao,args.saida,args.epocas,args.paciencia,args.seed)
            write_json(args.saida.with_suffix(".treino.json"),result)
            print(f"Treinado: {result['training_frames']} frames; avaliar agora em uma sessão nova.")
        elif args.command == "avaliar":
            from .model import evaluate
            unused(args.saida)
            result = evaluate(args.teste,args.modelo)
            write_json(args.saida,result)
            print(f"Erro médio: {result['model']['mean_error_pct_diagonal']:.2f}% da diagonal da imagem; veja cobertura e controles no JSON.")
        elif args.command == "prever":
            from .model import infer, load_model
            if not args.uma_pessoa_confirmada:
                raise ValueError("V0 pressupõe exatamente uma pessoa; para esse experimento use --uma-pessoa-confirmada.")
            unused(args.saida)
            unused(args.saida.with_suffix(".previsao.json"))
            data = load_bundle(args.conjunto)
            model,saved = load_model(args.modelo)
            pred = infer(data,model,saved)
            args.saida.parent.mkdir(parents=True,exist_ok=True)
            with args.saida.open("w",newline="",encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(["tempo_csi_s","status"]+[f"{j}_{axis}" for j in JOINTS for axis in ("x","y")])
                for t,valid,p in zip(data["times"],data["valid"],pred):
                    writer.writerow([float(t),"estimativa_experimental" if valid else "sem_dados_suficientes",
                                     *(p.ravel().tolist() if valid else [""]*12)])
            write_json(args.saida.with_suffix(".previsao.json"),{
                "model":str(args.modelo),"source_sha256":data["meta"]["source_sha256"],
                "data_kind":data["meta"]["data_kind"],"scope":saved["metadata"]["scope"],
                "quality":summary(data)["window_quality"],"one_person_confirmed":True,
                "note":"Qualidade de aquisição não é confiança da pose. Ausência de previsão não é ausência de pessoa."})
            print("Replay exportado. Lacunas continuam vazias, sem inventar ou congelar membros.")
    except (ValueError,KeyError,OSError,RuntimeError,TypeError) as error:
        parser.exit(2,f"Erro: {error}\n")
    except ModuleNotFoundError as error:
        parser.exit(2,f"Dependência ausente ({error.name}). Consulte ferramentas/pose/requirements-modelo.txt.\n")


if __name__ == "__main__":
    main()

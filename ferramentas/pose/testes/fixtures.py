"""Sinais e gabaritos INVENTADOS exclusivamente para testar software, não física."""

import csv
import json
from pathlib import Path

import numpy as np

from ferramentas.csi_formato import COLUNAS
from ferramentas.pose import JOINTS
from ferramentas.pose.labels import LABEL_COLUMNS


def recording(folder,session="SYNTH-A",duration=10,phase=0,gap=None,start_us=1_000_000):
    folder = Path(folder)
    folder.mkdir(parents=True,exist_ok=True)
    path = folder/(session+".csv")
    with path.open("w",newline="",encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["pc_tempo_s"]+COLUNAS)
        for i,t in enumerate(np.arange(0,duration+.011,.01)):
            if gap and gap[0] <= t < gap[1]:
                continue
            k = np.arange(192)
            re = np.rint(18+8*np.sin(1.4*t+phase+k*.1)).astype(int)
            im = np.rint(5+4*np.cos(t*.7+phase+k*.13)).astype(int)
            iq = np.stack((im,re),axis=1).ravel().tolist()
            iq[:4] = [47,-16,2,0]
            fields = ["CSI_DATA",100+i,"1a:00:00:00:00:00",-67,11,1,0,1,1,1,0,0,0,0,-97,0,11,2,
                      (start_us+round(t*1e6)) % 2**32,0,47,1,384,1,json.dumps(iq,separators=(",",":"))]
            writer.writerow([f"{t+.02:.4f}"]+fields)
    path.with_suffix(".json").write_text(json.dumps({"sessao":session,"sintetico":True,
          "obs":"INVENTADO para teste de software; não é medição de rádio."}),encoding="utf-8")
    return path


def labels(folder,session="SYNTH-A",duration=10,phase=0,people=1,confidence=1.):
    folder = Path(folder)
    path = folder/(session+"-labels.csv")
    with path.open("w",newline="",encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(LABEL_COLUMNS)
        for t in np.arange(0,duration+.01,1/30):
            xy = [[.35,.4],[.3+.04*np.sin(1.4*t+phase),.55],[.2+.08*np.sin(1.4*t+phase),.65],
                  [.65,.4],[.7+.04*np.cos(.7*t+phase),.55],[.8+.08*np.cos(.7*t+phase),.65]]
            writer.writerow([t+.3,people,*[v for p in xy for v in (*p,confidence)]])
    sync = folder/(session+"-sync.json")
    sync.write_text(json.dumps({"schema":1,"metodo":"SINTÉTICO","observacoes":"Marcadores inventados para teste.",
        "largura_imagem":640,"altura_imagem":480,"incerteza_s":.005,
        "marcadores":[{"csi_s":0.,"video_s":.3},{"csi_s":duration,"video_s":duration+.3}]}),encoding="utf-8")
    return path,sync

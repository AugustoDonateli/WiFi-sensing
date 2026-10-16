"""Converte intervalos de contato revisados no vídeo em sincronização experimental.

Não detecta cliques automaticamente nem atribui precisão perfeita ao botão.
"""
import argparse
import csv
import json
from pathlib import Path

import numpy as np

from .capturar_boot import BOOT_COLUMNS, digest
from .data import read_recording, write_json
from .labels import clock_fit

VIDEO_COLUMNS = ['evento','video_inicio_s','video_fim_s']


def synchronize(raw_path, annotations, width, height, extra_ms, method, observations, useful_start, useful_end):
    recording = read_recording(raw_path)
    meta = recording['meta']['source_metadata']
    capture = meta.get('pose_capture')
    if not capture or capture['clock_basis'] != 'esp_timer_callback_entry':
        raise ValueError('Este comando exige uma coleta BOOT com relógio compartilhado.')
    folder = Path(raw_path).resolve().parent
    events_file = (folder/capture['boot_file']).resolve()
    if events_file.parent != folder or digest(events_file) != capture['boot_file_sha256']:
        raise ValueError('Hash/caminho dos eventos BOOT incompatível.')
    with events_file.open(newline='',encoding='utf-8') as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != BOOT_COLUMNS:
            raise ValueError('Cabeçalho BOOT incompatível.')
        events = list(reader)
    seqs = [int(e['evento']) for e in events]
    devices = [int(e['device_us']) for e in events]
    levels = [int(e['nivel']) for e in events]
    if len(events)<4 or len(set(seqs))!=len(seqs) or any(b!=a+1 for a,b in zip(seqs,seqs[1:])) or any(b<=a for a,b in zip(devices,devices[1:])):
        raise ValueError('Eventos insuficientes, duplicados ou fora de ordem.')
    if any(v not in (0,1) for v in levels) or any(a==b for a,b in zip(levels,levels[1:])):
        raise ValueError('Estados BOOT não alternam entre pressionar e soltar.')
    with (folder/capture['clock_file']).open(newline='',encoding='utf-8') as f:
        first_device = int(next(csv.DictReader(f))['device_us'])
    presses = {int(e['evento']):(int(e['device_us'])-first_device)/1e6 for e in events if int(e['nivel'])==0}
    if not np.isfinite(extra_ms) or extra_ms<=0 or not method.strip() or not observations.strip():
        raise ValueError('Informe método, observações e incerteza adicional medida (>0 ms).')
    anchors,uncertainties,seen = [],[],set()
    with Path(annotations).open(newline='',encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != VIDEO_COLUMNS:
            raise ValueError('Anotações exigem evento,video_inicio_s,video_fim_s.')
        for row in reader:
            seq = int(row['evento'])
            lo,hi = float(row['video_inicio_s']),float(row['video_fim_s'])
            if seq not in presses or seq in seen:
                raise ValueError('Evento não é um aperto BOOT conhecido, ou está duplicado.')
            if not np.isfinite([lo,hi]).all() or lo<0 or hi<=lo:
                raise ValueError('Marque um intervalo positivo que contenha o contato; não invente um instante exato.')
            seen.add(seq)
            csi = presses[seq]
            if not 0<=csi<=recording['t'][-1]:
                raise ValueError('Marcador fora do período do CSI salvo.')
            anchors.append({'csi_s':csi,'video_s':(lo+hi)/2})
            uncertainties.append((hi-lo)/2+extra_ms/1000)
    if len(anchors)<4:
        raise ValueError('Revise pelo menos quatro apertos, distribuídos no início e no fim.')
    if not np.isfinite([useful_start,useful_end]).all() or not 0<=useful_start<useful_end:
        raise ValueError('Trecho útil do vídeo inválido.')
    if not anchors[0]['video_s']<useful_start<useful_end<anchors[-1]['video_s']:
        raise ValueError('O trecho útil deve ficar entre os marcadores, excluindo manipulação da placa.')
    spec = {'schema':1,'largura_imagem':width,'altura_imagem':height,
        'metodo':method,'observacoes':observations,'incerteza_s':max(uncertainties),
        'marcadores':anchors,'trechos_video_s':[[useful_start,useful_end]],
        'source_sha256':recording['meta']['source_sha256'],
        'boot_sha256':digest(events_file),'annotation_sha256':digest(annotations),
        'clock':recording['meta']['clock'],'hardware_timing_validated':False,
        'note':'Ajuste experimental. Resíduo pequeno não comprova latência absoluta pequena; rever contato/clique, rolling shutter e relação entre evento elétrico e filmagem.'}
    spec['fit_diagnostic'] = clock_fit(spec)
    return spec


def main(argv=None):
    p = argparse.ArgumentParser(description='Alinha BOOT ao vídeo por intervalos anotados e incerteza informada.')
    p.add_argument('coleta',type=Path)
    p.add_argument('--marcadores',type=Path,required=True)
    p.add_argument('--largura',type=int,required=True)
    p.add_argument('--altura',type=int,required=True)
    p.add_argument('--incerteza-extra-ms',type=float,required=True)
    p.add_argument('--metodo',required=True)
    p.add_argument('--obs',required=True)
    p.add_argument('--inicio-util-video',type=float,required=True)
    p.add_argument('--fim-util-video',type=float,required=True)
    p.add_argument('--saida',type=Path,required=True)
    args = p.parse_args(argv)
    try:
        if args.saida.exists():
            raise ValueError('Saída já existe; preserve o experimento.')
        spec = synchronize(args.coleta,args.marcadores,args.largura,args.altura,args.incerteza_extra_ms,
            args.metodo,args.obs,args.inicio_util_video,args.fim_util_video)
        write_json(args.saida,spec)
        print('Ajuste criado para revisão. Ainda não certifica sincronização física ou qualidade de pose.')
    except (ValueError,KeyError,OSError,TypeError) as error:
        p.exit(2,f'Erro: {error}\n')


if __name__ == '__main__':
    main()

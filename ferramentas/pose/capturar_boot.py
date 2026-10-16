"""Captura CSI + BOOT do firmware wave_boot; biblioteca padrão, pyserial só no CLI."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import time

from ferramentas.csi_formato import COLUNAS, LinhaInvalida, ler_linha

CLOCK_COLUMNS = ['id','radio_us','device_us','csi_descartados','boot_descartados']
BOOT_COLUMNS = ['evento','device_us','nivel','boot_descartados']


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


class Protocol:
    """Cada CSI_DATA só é salvo quando chega seu POSE_CLOCK correspondente."""
    def __init__(self, raw, clocks, boots):
        self.raw, self.clocks, self.boots = raw, clocks, boots
        self.pending = None
        self.info = None
        self.packets = self.presses = self.events = self.missing = 0
        self.last_id = self.last_device = self.last_event = self.last_event_us = self.last_level = None
        self.drops = []
        self.errors = []

    def consume(self, line, pc_s):
        fields = next(csv.reader([line]))
        kind = fields[0] if fields else ''
        if kind not in ('CSI_DATA','POSE_CLOCK','POSE_BOOT','POSE_INFO','POSE_STATUS'):
            return
        try:
            if kind == 'CSI_DATA':
                if self.pending is not None:
                    raise ValueError('CSI sem POSE_CLOCK; firmware/formato incompatível.')
                packet = ler_linha(line)
                if packet.len != 384:
                    raise ValueError('Este piloto exige CSI de 384 bytes.')
                self.pending = (packet,line,pc_s)
            elif kind == 'POSE_INFO':
                if len(fields) != 8 or fields[1:4] != ['1','boot0','esp32']:
                    raise ValueError('Versão do protocolo incompatível.')
                if len(fields[5]) != 40 or len(fields[6]) != 64 or len(fields[7]) != 16:
                    raise ValueError('Identificação do firmware inválida.')
                int(fields[5],16); int(fields[6],16); int(fields[7],16)
                if self.info and self.info != fields[2:]:
                    raise ValueError('Firmware ou identificação de boot mudou: houve reinício/troca da placa.')
                self.info = fields[2:]
            elif kind == 'POSE_CLOCK':
                if len(fields) != 7 or fields[1] != '1' or self.pending is None:
                    raise ValueError('POSE_CLOCK sem CSI correspondente.')
                ident,radio,device,csi_drop,boot_drop = map(int,fields[2:])
                packet,line,saved_pc = self.pending
                if ident != packet.id or radio != packet.local_timestamp % 2**32:
                    raise ValueError('POSE_CLOCK não corresponde ao pacote CSI.')
                if not 0 <= radio < 2**32 or min(device,csi_drop,boot_drop) < 0:
                    raise ValueError('Relógio/contadores inválidos.')
                if self.last_id is not None and (ident <= self.last_id or device <= self.last_device):
                    raise ValueError('ID/relógio recuou: possível reinício da placa.')
                if self.last_id is not None:
                    self.missing += ident-self.last_id-1
                self.last_id,self.last_device = ident,device
                self.raw.write(f'{saved_pc:.6f},{line}\n')
                self.clocks.writerow([ident,radio,device,csi_drop,boot_drop])
                self.drops.append((csi_drop,boot_drop))
                self.pending = None
                self.packets += 1
            elif kind == 'POSE_BOOT':
                if len(fields) != 6 or fields[1] != '1':
                    raise ValueError('POSE_BOOT incompatível.')
                seq,device,level,drops = map(int,fields[2:])
                if seq < 1 or device < 0 or level not in (0,1) or drops < 0:
                    raise ValueError('Evento BOOT inválido.')
                if self.last_event is not None and (seq != self.last_event+1 or device <= self.last_event_us or level == self.last_level):
                    raise ValueError('Eventos BOOT perdidos, repetidos ou fora de ordem; refazer piloto.')
                self.boots.writerow([seq,device,level,drops])
                self.last_event,self.last_event_us,self.last_level = seq,device,level
                self.events += 1
                self.presses += level == 0
            elif kind == 'POSE_STATUS':
                if len(fields) != 6 or fields[1] != '1' or any(int(x)<0 for x in fields[2:]):
                    raise ValueError('POSE_STATUS inválido.')
                self.drops.append(tuple(map(int,fields[3:5])))
        except (ValueError,LinhaInvalida) as error:
            self.errors.append(str(error))
            self.pending = None


def capture(port, folder, duration, session, metadata=None, clock=time.monotonic, show=print):
    if not 5 <= duration <= 3600 or not session.strip():
        raise ValueError('Duração precisa estar entre 5 e 3600 s; informe uma sessão.')
    folder = Path(folder)
    folder.mkdir(parents=True,exist_ok=False)
    start = clock()
    interrupted = False
    with (folder/'csi.csv').open('w',encoding='utf-8',newline='') as raw, \
         (folder/'relogio.csv').open('w',encoding='utf-8',newline='') as cf, \
         (folder/'boot.csv').open('w',encoding='utf-8',newline='') as bf, \
         (folder/'serial.txt').open('w',encoding='utf-8') as serial_log:
        cw,bw = csv.writer(cf),csv.writer(bf)
        raw.write(','.join(['pc_tempo_s']+COLUNAS)+'\n')
        cw.writerow(CLOCK_COLUMNS); bw.writerow(BOOT_COLUMNS)
        protocol = Protocol(raw,cw,bw)
        previous = -1.
        try:
            while True:
                before = clock()-start
                if before >= duration and (protocol.pending is None or before >= duration+1):
                    break
                value = port.readline()
                after = clock()-start
                if value:
                    line = value.decode('utf-8',errors='replace').strip()
                    serial_log.write(f'{after:.6f}\t{line}\n')
                    protocol.consume(line,after)
                if after-previous >= 1:
                    show(f'{after:.0f}s | CSI {protocol.packets} | apertos BOOT {protocol.presses} | erros {len(protocol.errors)}')
                    previous = after
        except KeyboardInterrupt:
            interrupted = True
        except OSError as error:
            protocol.errors.append(f'Leitura serial interrompida: {error}')
        if protocol.pending:
            protocol.errors.append('Último CSI sem relógio; captura incompleta.')
        if not protocol.info or protocol.packets < 2:
            protocol.errors.append('Não recebeu firmware wave_boot e CSI suficientes. Confira porta, Placa A e firmware.')
        if protocol.drops and max(d[1] for d in protocol.drops) > min(d[1] for d in protocol.drops):
            protocol.errors.append('Fila de eventos BOOT perdeu eventos durante a captura.')
    status = 'invalida' if protocol.errors else 'interrompida' if interrupted else 'completa'
    meta = dict(metadata or {},sessao=session.strip(),rotulo='bracos_piloto',status=status,
        pacotes_validos=protocol.packets,pacotes_perdidos=protocol.missing,
        duracao_s=round(clock()-start,3),
        pose_capture={'schema':1,'clock_basis':'esp_timer_callback_entry',
            'clock_file':'relogio.csv','clock_file_sha256':digest(folder/'relogio.csv'),
            'boot_file':'boot.csv','boot_file_sha256':digest(folder/'boot.csv'),
            'firmware_info':protocol.info,'apertos':protocol.presses,'eventos':protocol.events,
            'errors':protocol.errors,'hardware_timing_validated':False,
            'note':'Tempo no início do callback CSI; não é o instante físico de recepção. BOOT exige alinhamento visual/acústico e incerteza medida.'})
    (folder/'csi.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    show(f'Fim: {status}; {protocol.packets} pacotes, {protocol.presses} apertos. Arquivos em {folder}')
    return meta


def main(argv=None):
    p = argparse.ArgumentParser(description='Piloto sem LED: grava CSI + relógio + BOOT; exige firmware wave_boot.')
    p.add_argument('--porta',required=True)
    p.add_argument('--sessao',required=True)
    p.add_argument('--saida',type=Path,required=True,help='Pasta nova; nunca sobrescreve gravações.')
    p.add_argument('--duracao',type=float,default=40)
    p.add_argument('--distancia',default='')
    p.add_argument('--parede',choices=['sim','nao'],default='nao')
    p.add_argument('--obs',default='')
    args = p.parse_args(argv)
    try:
        import serial
        with serial.Serial(port=None,baudrate=921600,timeout=.25) as port:
            port.port = args.porta
            port.dtr = False; port.rts = False
            port.open()
            # Opening must not reset the board. No automatic reset/flash command.
            port.reset_input_buffer()
            result = capture(port,args.saida,args.duracao,args.sessao,
                {'porta':args.porta,'baud':921600,'distancia_m':args.distancia,'parede':args.parede,'obs':args.obs})
        if result['status'] != 'completa':
            p.exit(2,'Captura salva para diagnóstico; precisa ser refeita antes do treinamento.\n')
    except (ValueError,OSError,RuntimeError) as error:
        p.exit(2,f'Erro: {error}\n')
    except ModuleNotFoundError:
        p.exit(2,'Instale pyserial no Python usado para captura: python -m pip install pyserial\n')


if __name__ == '__main__':
    main()

"""Instala somente o aplicativo BOOT após ler tabela, identificar receptor e salvar backup.

Não é executado pela captura ou importado com efeitos na porta serial.
O comando deve ser iniciado pelo operador, com a porta da RECEPTORA.
"""
import argparse
from datetime import datetime
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys

APP_OFFSET = 0x20000
APP_SIZE = 0x100000
TABLE_OFFSET = 0xa000


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def project_name(image):
    # ESP image header (24) + first segment header (8) + esp_app_desc.
    if len(image)<112 or image[0]!=0xe9 or struct.unpack_from('<I',image,32)[0]!=0xabcd5432:
        raise ValueError('Aplicativo sem esp_app_desc reconhecível; não gravar.')
    name = image[80:112].split(b'\0',1)[0].decode('ascii')
    if name not in ('csi_recv','wave_boot'):
        raise ValueError(f'Aplicativo atual é {name!r}, não csi_recv/wave_boot. Confira a porta da receptora.')
    return name


def verify_package(folder):
    folder = Path(folder).resolve()
    manifest = json.loads((folder/'manifesto.json').read_text(encoding='utf-8'))
    if manifest.get('schema')!=1 or manifest.get('target')!='esp32':
        raise ValueError('Pacote de firmware incompatível.')
    for name in ('wave_boot.bin','partition-table.bin'):
        if digest(folder/name)!=manifest['sha256'][name]:
            raise ValueError(f'Hash de {name} não corresponde ao pacote.')
    if not 0<(folder/'wave_boot.bin').stat().st_size<=APP_SIZE:
        raise ValueError('Aplicativo não cabe na partição esperada.')
    if project_name((folder/'wave_boot.bin').read_bytes())!='wave_boot':
        raise ValueError('Imagem candidata não é wave_boot.')
    return manifest


def run_tool(port,*args):
    command = [sys.executable,'-m','esptool','--chip','esp32','--port',port,'--baud','460800',
               '--before','default_reset','--after','hard_reset',*map(str,args)]
    result = subprocess.run(command,capture_output=True,text=True,encoding='utf-8',errors='replace')
    print(result.stdout,flush=True)
    if result.stderr: print(result.stderr,file=sys.stderr,flush=True)
    if result.returncode:
        raise RuntimeError('esptool falhou; veja a mensagem acima. O backup existente foi preservado.')
    return result.stdout


def install(folder,port):
    folder = Path(folder).resolve()
    manifest = verify_package(folder)
    backup = folder/'backups'/datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    backup.mkdir(parents=True,exist_ok=False)
    table = backup/'tabela-lida.bin'
    print('Lendo a tabela da placa; mantenha o BOOT solto.',flush=True)
    run_tool(port,'read_flash',hex(TABLE_OFFSET),(folder/'partition-table.bin').stat().st_size,table)
    if table.read_bytes()!=(folder/'partition-table.bin').read_bytes():
        raise ValueError('Tabela da placa difere da montagem conferida. Nenhuma escrita foi feita; enviar diagnóstico.')
    original = backup/'receptora-anterior.bin'
    print('Salvando a partição atual antes da escrita...',flush=True)
    log = run_tool(port,'read_flash',hex(APP_OFFSET),hex(APP_SIZE),original)
    if original.stat().st_size!=APP_SIZE:
        raise ValueError('Backup incompleto; nenhuma escrita foi feita.')
    name = project_name(original.read_bytes())
    metadata = {'schema':1,'porta':port,'project_name':name,'offset':hex(APP_OFFSET),
        'size':APP_SIZE,'backup_sha256':digest(original),'target_sha256':manifest['sha256']['wave_boot.bin'],
        'status':'backup_salvo_antes_da_escrita'}
    meta_path = backup/'backup.json'
    meta_path.write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
    (backup/'leitura.log').write_text(log,encoding='utf-8')
    print(f'Backup salvo em {backup}. Gravando aplicativo wave_boot...',flush=True)
    run_tool(port,'write_flash',hex(APP_OFFSET),folder/'wave_boot.bin')
    metadata['status'] = 'gravacao_concluida'
    meta_path.write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Concluído. Feche este terminal de gravação antes de iniciar a captura.',flush=True)
    return backup


def restore(folder,port):
    folder = Path(folder)
    meta = json.loads((folder/'backup.json').read_text(encoding='utf-8'))
    file = folder/'receptora-anterior.bin'
    if meta.get('schema')!=1 or meta.get('offset')!=hex(APP_OFFSET) or file.stat().st_size!=APP_SIZE or digest(file)!=meta['backup_sha256']:
        raise ValueError('Backup não corresponde ao registro; não restaurar.')
    project_name(file.read_bytes())
    # Confirm the current board still has the expected partition table.
    table = folder/'tabela-lida.bin'
    expected = table.read_bytes()
    current = folder/'tabela-antes-restaurar.bin'
    run_tool(port,'read_flash',hex(TABLE_OFFSET),len(expected),current)
    if current.read_bytes()!=expected:
        raise ValueError('Outra tabela de partições; restauração interrompida.')
    current_app = folder/'aplicativo-antes-restaurar.bin'
    run_tool(port,'read_flash',hex(APP_OFFSET),256,current_app)
    project_name(current_app.read_bytes())
    run_tool(port,'write_flash',hex(APP_OFFSET),file)
    print('Aplicativo anterior restaurado. Nenhum erase_flash foi utilizado.')


def main(argv=None):
    p = argparse.ArgumentParser(description='Grava wave_boot na RECEPTORA, com identificação e backup antes da escrita.')
    p.add_argument('--porta',required=True)
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument('--pacote',type=Path)
    group.add_argument('--restaurar',type=Path,help='Pasta do backup gerado por este instalador.')
    args = p.parse_args(argv)
    try:
        if args.pacote: install(args.pacote,args.porta)
        else: restore(args.restaurar,args.porta)
    except (ValueError,KeyError,OSError,RuntimeError,UnicodeError) as error:
        p.exit(2,f'Erro: {error}\n')


if __name__=='__main__': main()

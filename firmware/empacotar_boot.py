"""Empacota uma compilação já concluída; nunca acessa uma porta serial."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import zipfile

from firmware.gravar_boot import project_name, verify_package

ROOT = Path(__file__).resolve().parent.parent


def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def package(build,output):
    build,output = Path(build).resolve(),Path(output).resolve()
    zipped = output.with_suffix('.zip')
    if output.exists() or zipped.exists(): raise ValueError('Saída já existe; escolha outro nome.')
    description = json.loads((build/'project_description.json').read_text(encoding='utf-8'))
    if description['project_name']!='wave_boot' or description['target']!='esp32' or description['git_revision']!='v5.5.5':
        raise ValueError('Exige wave_boot compilado para esp32 com ESP-IDF v5.5.5.')
    if sha(build.parent/'main/app_main.c')!=sha(ROOT/'firmware/csi_recv_boot/main/app_main.c'):
        raise ValueError('Fontes da compilação divergem do repositório.')
    if project_name((build/'wave_boot.bin').read_bytes())!='wave_boot': raise ValueError('Imagem inválida.')
    output.mkdir(parents=True)
    shutil.copy2(build/'wave_boot.bin',output/'wave_boot.bin')
    shutil.copy2(build/'partition_table/partition-table.bin',output/'partition-table.bin')
    files = ['firmware/gravar_boot.py','ferramentas/csi_formato.py','ferramentas/pose/__init__.py','ferramentas/pose/capturar_boot.py']
    for name in files:
        dest = output/name; dest.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(ROOT/name,dest)
    shutil.copy2(ROOT/'firmware/LICENSE',output/'LICENSE')
    (output/'NOTICE').write_text('Wi-Fi configuration derived from Espressif ESP-CSI csi_recv.\n'
        'Copyright 2025-2026 Espressif Systems (Shanghai) CO LTD.\n'
        'Base: 8633d67152db2808f141cc1595970aa9cf406045.\n'
        'Wave Sense changes: queued CSI, GPIO0/BOOT markers, shared callback clock and protocol.\n'
        'Firmware source: https://github.com/AugustoDonateli/WiFi-sensing/tree/codex/csi-pose-experimental/firmware/csi_recv_boot\n',encoding='utf-8')
    manifest = {'schema':1,'target':'esp32','idf_version':'v5.5.5','hardware_tested':False,
        'source_base_commit':'8633d67152db2808f141cc1595970aa9cf406045',
        'app_source_sha256':sha(ROOT/'firmware/csi_recv_boot/main/app_main.c'),
        'app_offset':'0x20000','app_partition_size':0x100000,'partition_table_offset':'0xa000',
        'sha256':{n:sha(output/n) for n in ['wave_boot.bin','partition-table.bin',*files,'LICENSE','NOTICE']}}
    (output/'manifesto.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    shutil.copy2(ROOT/'firmware/PILOTO-BOOT.md',output/'LEIA-ME.md')
    verify_package(output)
    with zipfile.ZipFile(zipped,'w',zipfile.ZIP_DEFLATED) as archive:
        for path in output.rglob('*'):
            if path.is_file(): archive.write(path,output.name+'/'+str(path.relative_to(output)))
    return zipped


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--build',type=Path,required=True)
    p.add_argument('--saida',type=Path,required=True)
    args = p.parse_args()
    print(package(args.build,args.saida))


if __name__=='__main__': main()

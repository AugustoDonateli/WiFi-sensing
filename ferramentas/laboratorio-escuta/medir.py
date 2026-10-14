import base64, json, sys, numpy as np
from playwright.sync_api import sync_playwright
import pathlib
aqui = pathlib.Path(__file__).parent  # grava cada opção num OfflineAudioContext e mede o volume (dBFS) em cada cena
ROT = [['vazio', 6], ['andando', 7], ['vazio', 5], ['parado', 4], ['mao', 4], ['vazio', 4]]
ids = sys.argv[1:] or ['vogal', 'harpa', 'batimento', 'partitura', 'hoje']
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page()
    pg.on('console', lambda m: print('console:', m.text))
    pg.on('pageerror', lambda e: print('ERRO:', e))
    pg.goto((aqui / 'medir.html').as_uri())
    for i in ids:
        r = pg.evaluate('([id, rot]) => gravar(id, rot)', [i, ROT])
        (aqui / f'{i}.wav').write_bytes(base64.b64decode(r['wav']))
        rms = np.array(r['rms']); pico = np.array(r['pico'])
        def seg(a, b): return rms[int(a*4)+2:int(b*4)].mean()
        print(f"{i:10s} vazio {seg(1,6):6.1f} | andando {seg(6,13):6.1f} | vazio {seg(13,18):6.1f} | parado {seg(18,22):6.1f} | mao {seg(22,26):6.1f} | pico max {pico.max():5.1f} dB")
    b.close()

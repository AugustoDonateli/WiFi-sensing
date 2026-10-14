import base64, json, sys, numpy as np
from playwright.sync_api import sync_playwright
import pathlib
aqui = pathlib.Path(__file__).parent  # grava cada opção num OfflineAudioContext e mede o volume (dBFS) em cada cena
ROT = [['vazio', 6], ['andando', 7], ['vazio', 5], ['parado', 4], ['vazio', 3], ['devagar', 8], ['mao', 4], ['vazio', 4]]
ids = sys.argv[1:] or ['vogal', 'harpa', 'batimento', 'batimento1', 'partitura', 'hoje']
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page()
    pg.on('console', lambda m: print('console:', m.text))
    pg.on('pageerror', lambda e: print('ERRO:', e))
    pg.goto((aqui / 'medir.html').as_uri())
    for i in ids:
        r = pg.evaluate('([id, rot]) => gravar(id, rot)', [i, ROT])
        (aqui / f'{i}.wav').write_bytes(base64.b64decode(r['wav']))
        rms = np.array(r['rms']); pico = np.array(r['pico']); envs = [np.array(r['envL']), np.array(r['envR'])]
        def seg(a, b): return rms[int(a*4)+2:int(b*4)].mean()
        def pulso(a, b):
            # quanto o volume sobe e desce dentro do trecho (envelope de 25 ms): 0 = liso
            v = []
            for env in envs:
                e = env[int(a*40)+20:int(b*40)]
                v.append((np.percentile(e, 90) - np.percentile(e, 10)) / (np.percentile(e, 90) + 1e-9))
            return sum(v) / 2
        print(f"{i:10s} dB  vazio {seg(1,6):6.1f} | andando {seg(6,13):6.1f} | parado {seg(18,22):6.1f} | devagar {seg(25,33):6.1f} | mao {seg(33,37):6.1f} | pico {pico.max():5.1f}")
        print(f"{'':10s} pulso vazio {pulso(1,6):5.2f} | andando {pulso(6,13):5.2f} | parado {pulso(18,22):5.2f} | devagar {pulso(25,33):5.2f} | mao {pulso(33,37):5.2f}")
    b.close()

"""Mede o volume dos sons das trocas de tela (demo/sons.js), sem tocar.

Grava cada uma das 20 trocas possíveis (5 telas x 4 destinos) num OfflineAudioContext, pela mesma cadeia
do site (limitador e volume 0,6), e mede o pico de volume em janelas de 50 ms (perto do que se ouve) e o
pico de amostra. Mede também o alerta do detector, para comparar.

    python ferramentas/laboratorio-passagens/medir.py            # todas as famílias
    python ferramentas/laboratorio-passagens/medir.py sinal ar   # só algumas
    python ferramentas/laboratorio-passagens/medir.py --wav PASTA   # e grava os .wav de algumas trocas

Precisa do Playwright com o Chromium (python -m playwright install chromium).
"""

import argparse
import math
import pathlib
import wave

import numpy as np
from playwright.sync_api import sync_playwright

AQUI = pathlib.Path(__file__).resolve().parent
TELAS = ["tela", "escuta", "desafio", "galeria", "historia"]
FAMILIAS = ["sinal", "notas", "ar", "antigo"]
GRAVAR = [("tela", "escuta"), ("escuta", "tela"), ("tela", "desafio"), ("desafio", "galeria"), ("galeria", "historia"), ("historia", "tela")]
ALERTA = """async () => {
  const ctx = new OfflineAudioContext(2, 44100 * 2, 44100);
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -28; lim.knee.value = 20; lim.ratio.value = 8; lim.attack.value = 0.01; lim.release.value = 0.3;
  const mestre = ctx.createGain(); mestre.gain.value = 0.6; lim.connect(mestre).connect(ctx.destination);
  const tom = (freq, dur, quando, ganho) => { const t = 0.05 + quando, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(ganho, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(lim); o.start(t); o.stop(t + dur + 0.05); };
  tom(659.25, 0.5, 0, 0.07); tom(880, 0.7, 0.14, 0.06);   // o somAlerta() do index.html
  const b = await ctx.startRendering(); return [Array.from(b.getChannelData(0)), Array.from(b.getChannelData(1))]; }"""


def db(x):
    return 20 * math.log10(max(x, 1e-9))


def medidas(l, r):
    m = (np.asarray(l) + np.asarray(r)) / 2
    jan = 2205   # 50 ms
    n = len(m) // jan
    curto = np.sqrt(np.mean(m[: n * jan].reshape(n, jan) ** 2, 1))
    return db(curto.max()), db(np.abs(np.stack([l, r])).max())


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("familias", nargs="*", default=FAMILIAS)
    ap.add_argument("--wav", help="pasta para gravar algumas trocas em .wav")
    a = ap.parse_args()
    with sync_playwright() as p:
        nav = p.chromium.launch()
        pg = nav.new_page()
        pg.on("pageerror", lambda e: print("ERRO:", e))
        pg.goto((AQUI / "medir.html").as_uri())
        print(f"{'':22s}pico 50 ms   pico de amostra   (dBFS; mais perto de 0 = mais alto)")
        p50, pa = medidas(*pg.evaluate(ALERTA))
        print(f"{'alerta do detector':22s}{p50:8.1f}   {pa:12.1f}")
        for f in a.familias:
            v50, va = [], []
            for o in TELAS:
                for d in TELAS:
                    if o == d:
                        continue
                    l, r = pg.evaluate(f"async () => {{ const T = medir.troca('{o}', '{d}'); return medir.gravar('{f}', T.eventos, T.fim + 2.2); }}")
                    x50, xa = medidas(l, r)
                    v50.append(x50); va.append(xa)
                    if a.wav and (o, d) in GRAVAR:
                        pasta = pathlib.Path(a.wav); pasta.mkdir(parents=True, exist_ok=True)
                        with wave.open(str(pasta / f"{f}_{o}-{d}.wav"), "wb") as w:
                            w.setnchannels(2); w.setsampwidth(2); w.setframerate(44100)
                            w.writeframes((np.clip(np.stack([l, r], 1), -1, 1) * 32767).astype("<i2").tobytes())
            print(f"{f:22s}{np.mean(v50):8.1f}   {max(va):12.1f}   (20 trocas; pico 50 ms de {min(v50):.1f} a {max(v50):.1f})")
        nav.close()


if __name__ == "__main__":
    main()

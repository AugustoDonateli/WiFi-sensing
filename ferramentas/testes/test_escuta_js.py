"""Testes da parte pura de demo/escuta.js (o som do modo escuta, "Batimento"). Precisa do Node.js.

    python -m unittest discover -s ferramentas/testes -v
"""

import json
import shutil
import subprocess
import unittest
from pathlib import Path

DEMO = Path(__file__).resolve().parents[2] / "demo"
NODE = shutil.which("node")

SCRIPT = r"""
const E = require(process.argv[1] + '/escuta.js');
const out = {};
// roda `s` segundos com o tremor `v` (limiar = 1), em passos de 0,2 s, como o detector
const rodar = (e, v, s, limiar = 1) => { for (let i = 0; i < Math.round(s / 0.2); i++) e = E.passo(e, { v, limiar }, 0.2); return e; };
out.inicial = E.inicial();
out.parado = rodar(null, 0.78, 10);
out.limiar = rodar(null, 1.0, 10);
out.forte = rodar(null, 3.0, 10);
out.enorme = rodar(null, 40, 10);
out.semDado = rodar(rodar(null, 3.0, 10), NaN, 2);
out.semLimiar = rodar(null, 3.0, 2, null);
const curva = []; for (const v of [0.8, 1, 1.2, 1.5, 2, 3]) curva.push(rodar(null, v, 10));
out.curva = curva;
out.chega = rodar(null, 3.0, 0.4).m;                     // 0,4 s depois de começar
out.vai = rodar(rodar(null, 3.0, 10), 0.78, 1).m;        // 1 s depois de parar
out.foi = rodar(rodar(null, 3.0, 10), 0.78, 6).m;        // 6 s depois de parar
out.const = { RESPIRO: E.RESPIRO, PULSO_MAX: E.PULSO_MAX, OUVIDO_DIR: E.OUVIDO_DIR };
console.log(JSON.stringify(out));
"""


@unittest.skipUnless(NODE, "precisa do Node.js")
class TestEscuta(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        r = subprocess.run([NODE, "-e", SCRIPT, str(DEMO)], capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            raise RuntimeError(r.stderr)
        cls.o = json.loads(r.stdout)

    def test_sala_parada_so_respira(self):
        p = self.o["parado"]
        self.assertAlmostEqual(p["m"], 0, places=6)
        self.assertAlmostEqual(p["pulso"], self.o["const"]["RESPIRO"])
        self.assertEqual(p["corpo"], 0)
        self.assertEqual(p, {**self.o["inicial"], "m": p["m"]})

    def test_no_limiar_ja_pulsa(self):
        # o "Movimento." da tela e o pulso começam juntos: no limiar, pelo menos 1 batida por segundo
        self.assertGreaterEqual(self.o["limiar"]["pulso"], 1.0)
        self.assertGreater(self.o["limiar"]["ganho"], self.o["parado"]["ganho"])

    def test_mais_movimento_mais_pulso_volume_e_brilho(self):
        c = self.o["curva"]
        for a, b in zip(c, c[1:]):
            for k in ("pulso", "ganho", "brilho", "fundo", "corpo"):
                self.assertLessEqual(a[k], b[k], k)
        self.assertAlmostEqual(c[-1]["m"], 1, places=3)

    def test_limites(self):
        e, k = self.o["enorme"], self.o["const"]
        self.assertAlmostEqual(e["m"], 1, places=3)
        self.assertAlmostEqual(e["pulso"], k["RESPIRO"] + k["PULSO_MAX"], places=3)
        self.assertLessEqual(e["fundo"], 0.95 + 1e-9)
        self.assertLessEqual(e["ganho"], 1.65 + 1e-9)

    def test_chega_rapido_e_vai_devagar(self):
        self.assertGreater(self.o["chega"], 0.7)
        self.assertGreater(self.o["vai"], 0.4)
        self.assertLess(self.o["foi"], 0.05)

    def test_sem_dado_ou_sem_limiar_nao_inventa(self):
        # medida inválida: o estado não muda (quem chama decide calar o som)
        self.assertAlmostEqual(self.o["semDado"]["m"], self.o["forte"]["m"], places=6)
        self.assertEqual(self.o["semLimiar"]["m"], 0)


if __name__ == "__main__":
    unittest.main()

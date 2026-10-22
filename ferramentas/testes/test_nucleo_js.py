"""Confere que a tela (demo/nucleo.js) e o Python (ferramentas/detector.py) dão o mesmo resultado.

Precisa de numpy e do Node.js. Sem eles, o teste é pulado.
    python -m unittest discover -s ferramentas/testes -v
"""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import sintetico  # noqa: E402
from csi_formato import ler_linha  # noqa: E402
from test_ferramentas import LINHA_OFICIAL  # noqa: E402

NUCLEO = Path(__file__).resolve().parents[2] / "demo" / "nucleo.js"
NODE = shutil.which("node")

SCRIPT_SERIE = r"""
const fs = require('fs');
const N = require(process.argv[1]);
const linhas = fs.readFileSync(process.argv[2], 'utf8').split('\n').slice(1).filter(Boolean);
const pacotes = [];
for (const l of linhas) {
  const i = l.indexOf(',');
  const p = N.lerLinhaCSI(l.slice(i + 1));
  if (p) { p.t = Number(l.slice(0, i)); pacotes.push(p); }
}
const { tempos, valores } = N.serieOscilacao(pacotes);
const limiar = N.limiarDeCalibracao(valores.slice(0, Number(process.argv[3])));
const d = new N.Detector(limiar);
const estados = valores.map((v) => d.passo(v));
console.log(JSON.stringify({ n: pacotes.length, tempos, valores, limiar, estados }));
"""

SCRIPT_LINHA = r"""
const N = require(process.argv[1]);
const p = N.lerLinhaCSI(process.argv[2]);
console.log(JSON.stringify({ id: p.id, rssi: p.rssi, amps: Array.from(p.amps) }));
"""


SCRIPT_JANELA = r"""
const N = require(process.argv[1]);
const ps = JSON.parse(process.argv[2]).map((a) => ({ amps: Float64Array.from(a) }));
console.log(JSON.stringify({ v: N.oscilacao(ps) }));
"""


def rodar_node(script, *args):
    # Com "node -e", os argumentos extras começam em process.argv[1].
    r = subprocess.run([NODE, "-e", script, str(NUCLEO), *map(str, args)], capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        raise AssertionError(r.stderr)
    return json.loads(r.stdout)


@unittest.skipIf(NODE is None, "Node.js não instalado")
class TestMesmaRegra(unittest.TestCase):
    def setUp(self):
        try:
            import numpy  # noqa: F401
        except ImportError:
            self.skipTest("numpy não instalado")

    def test_linha_oficial_igual(self):
        js = rodar_node(SCRIPT_LINHA, LINHA_OFICIAL)
        r = ler_linha(LINHA_OFICIAL)
        py = [0.0 if a is None else a for a in r.amplitudes()[:64]]
        self.assertEqual((js["id"], js["rssi"]), (r.id, r.rssi))
        self.assertEqual(len(js["amps"]), 64)
        for a, b in zip(js["amps"], py):
            self.assertAlmostEqual(a, b, places=9)

    def test_serie_limiar_e_estados_iguais(self):
        # Várias sementes e os dois tamanhos de linha: um pacote que cai bem na borda de uma
        # janela já fez as duas versões discordarem (np.arange arredonda diferente).
        for semente, len_ in ((3, 384), (8, 128), (13, 384), (21, 128)):
            with self.subTest(semente=semente, len_=len_):
                self._comparar(semente, len_)

    def _comparar(self, semente, len_):
        import numpy as np

        import detector
        from analise import carregar

        # Parado até 5 s, movimento de 5 a 8 s, parado depois. Buraco de pacotes em 11-13,3 s, maior que a
        # janela (2 s), para sobrar medida sem pacotes suficientes.
        mov = lambda t: 0.35 if 5 <= t < 8 else 0.0  # noqa: E731
        n_calib = 10
        with tempfile.TemporaryDirectory() as pasta:
            arq = sintetico.gravar_coleta(pasta, "cruzado", "teste", "S1", 16, mov, semente=semente, len_=len_,
                                          buraco=(11.0, 13.3), first_word_a_cada=7)
            js = rodar_node(SCRIPT_SERIE, arq, n_calib)
            dados = carregar(arq, remover_nulas=False)

        tempos, valores = detector.serie_oscilacao(dados["t"], dados["amp_completa"])
        limiar = detector.limiar_de_calibracao(valores[:n_calib])
        estados = detector.detectar(valores, limiar)

        self.assertEqual(js["n"], len(dados["t"]))
        self.assertEqual(js["tempos"], tempos.tolist())  # exatamente iguais, não só parecidos
        js_valores = np.array([np.nan if v is None else v for v in js["valores"]])
        np.testing.assert_array_equal(np.isnan(js_valores), np.isnan(valores))
        np.testing.assert_allclose(js_valores, valores, rtol=1e-9, equal_nan=True)
        self.assertAlmostEqual(js["limiar"], limiar, places=9)
        self.assertEqual(js["estados"], estados.tolist())

        # O cenário precisa exercitar as partes difíceis, senão o teste não prova nada.
        self.assertTrue(np.isnan(valores).any(), "o buraco deveria gerar medidas sem pacotes suficientes")
        self.assertTrue(estados[(tempos > 6.5) & (tempos < 8)].all(), "o movimento deveria ser detectado")
        self.assertFalse(estados[tempos < 5].any())
        self.assertFalse(estados[tempos > 11.0].any())  # desliga 5 medidas (1 s) depois que a janela esvazia

    def test_ganho_automatico_nao_e_movimento(self):
        # A placa B sobe e desce o volume do pacote inteiro (ganho automático). Mesmo formato com
        # volumes diferentes tem que dar oscilação ~0 nas duas versões; formato mudando, não.
        import numpy as np

        import detector

        rng = np.random.default_rng(5)
        forma = 10 + 6 * np.sin(np.arange(64) / 5.0)
        forma[[0, 1, 32]] = 0.0
        ganho = forma[None, :] * rng.uniform(0.6, 1.6, size=(40, 1))
        mexe = ganho * (1 + 0.15 * np.sin(np.arange(64)[None, :] / 3.0 + rng.uniform(0, 6, size=(40, 1))))
        for amps, quase_zero in ((ganho, True), (mexe, False)):
            py = detector.oscilacao_janela(amps)
            js = rodar_node(SCRIPT_JANELA, json.dumps(amps.tolist()))["v"]
            self.assertAlmostEqual(js, py, places=9)
            if quase_zero:
                self.assertLess(py, 1e-9)
            else:
                self.assertGreater(py, 0.5)
        # sem a normalização, o mesmo ganho daria uma oscilação grande
        self.assertGreater(ganho[:, 2:].std(axis=0).mean(), 2.0)


if __name__ == "__main__":
    unittest.main()

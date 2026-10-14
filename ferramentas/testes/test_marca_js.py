"""Testes das partes puras de demo/marca.js (a marca em anéis de cada travessia). Precisa do Node.js.

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
const M = require(process.argv[1] + '/marca.js');
const out = {};
// uma leitura: o formato fixo da sala e um tremor d proporcional a x (1 = sala vazia)
const l = (x, fase, k0 = 0) => ({ a: Array.from({ length: 64 }, (_, k) => (k < 5 || k > 59 ? 0 : 10 + 5 * Math.sin((k + k0) / 6))),
  d: Array.from({ length: 64 }, (_, k) => (x - 1) * 0.8 * Math.sin(k * 1.7)), x, fase });
const rastro = (nC, xs) => [...Array(nC)].map(() => l(1, 'contagem')).concat(xs.map((x) => l(x, 'correndo')));
const reg = (o) => M.registro({ n: 1, nome: 'Ana', quando: Date.UTC(2026, 9, 21, 17, 32, 8), fonte: 'live', lim: 1.3, ...o });

const quieto = reg({ tempo: 4.1, ok: true, rastro: rastro(30, Array(41).fill(1.05)) });
const pego = reg({ tempo: 0.6, ok: false, rastro: rastro(30, [1.2, 2, 4, 6, 8, 9.8]) });
const longo = reg({ tempo: 20, ok: true, rastro: rastro(30, Array(200).fill(1.1)) });
const raspou = reg({ tempo: 3, ok: true, rastro: rastro(30, [1, 1, 1.6, 1, 1]) });
const tempo = reg({ tempo: 60.1, ok: null, rastro: rastro(30, Array(600).fill(1)) });
out.quieto = { miolo: quieto.miolo.length, linhas: quieto.linhas.length, pico: quieto.pico, v: quieto.v, valido: M.valido(quieto) };
out.longo = { linhas: longo.linhas.length, miolo: longo.miolo.length };
const gq = M.geometria(quieto, 100), gp = M.geometria(pego, 100);
out.gq = gq.map((a) => ({ raio: a.raio, amp: a.amp, tipo: a.tipo, giro: a.giro }));
out.gl = M.geometria(longo, 100).map((a) => ({ raio: a.raio, amp: a.amp, tipo: a.tipo, giro: a.giro }));
out.gp = gp.map((a) => ({ raio: a.raio, amp: a.amp, tipo: a.tipo, giro: a.giro }));
out.relevoFecha = (() => { const r = M.relevo(l(3, 'correndo', 7)); return [r[0], r[r.length - 1]]; })();
out.textos = {
  quieto: [M.titulo(quieto), M.detalhe(quieto), M.resumo(quieto)],
  pego: [M.titulo(pego), M.detalhe(pego), M.resumo(pego)],
  raspou: M.detalhe(raspou), tempo: [M.titulo(tempo), M.resumo(tempo)],
  numero: M.numero(7),
};
out.duracao = [M.duracao(quieto), M.duracao(pego), M.duracao(longo)];
out.invalido = [M.valido(null), M.valido({ n: 1, linhas: [] }), M.valido({ v: 1, linhas: [{}] })];
console.log(JSON.stringify(out));
"""


@unittest.skipUnless(NODE, "precisa do Node.js")
class TestMarca(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        r = subprocess.run([NODE, "-e", SCRIPT, str(DEMO)], capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            raise RuntimeError(r.stderr)
        cls.o = json.loads(r.stdout)

    def test_registro_separa_contagem_e_travessia(self):
        q = self.o["quieto"]
        self.assertEqual(q["miolo"], 30)         # a contagem inteira
        self.assertEqual(q["linhas"], 41)        # um anel por leitura da travessia
        self.assertAlmostEqual(q["pico"], 1.05)
        self.assertTrue(q["valido"])

    def test_travessia_longa_e_amostrada(self):
        self.assertEqual(self.o["longo"]["linhas"], 90)

    def test_ate_32_aneis_com_leituras_reais(self):
        for g in (self.o["gp"], self.o["gq"], self.o["gl"]):
            self.assertLessEqual(len(g), 32)
        self.assertEqual(len(self.o["gp"]), 32)   # 36 leituras (30 da contagem + 6 da travessia), amostradas
        self.assertEqual([a["tipo"] for a in self.o["gp"]][-1], "deteccao")

    def test_anel_mais_largo_onde_o_sinal_mais_variou(self):
        g = self.o["gp"]
        vaos = [b["raio"] - a["raio"] for a, b in zip(g, g[1:])]
        self.assertEqual(vaos.index(max(vaos)), len(vaos) - 1)   # o último (9,8x) é o que mais variou

    def test_aneis_de_dentro_para_fora_e_dentro_do_raio(self):
        for g in (self.o["gq"], self.o["gp"]):
            raios = [a["raio"] for a in g]
            self.assertEqual(raios, sorted(raios))
            self.assertLessEqual(raios[-1], 100 + 1e-9)

    def test_anel_grosso_so_na_deteccao(self):
        self.assertEqual([a["tipo"] for a in self.o["gp"]][-1], "deteccao")
        self.assertNotIn("deteccao", [a["tipo"] for a in self.o["gq"]])

    def test_relevo_fecha_o_anel_sem_degrau(self):
        a, b = self.o["relevoFecha"]
        self.assertAlmostEqual(a, b, places=6)

    def test_textos_diretos_com_numeros(self):
        t = self.o["textos"]
        self.assertEqual(t["quieto"][0], "Não detectado.")
        self.assertIn("4,1 s", t["quieto"][1])
        self.assertIn("abaixo do limite o tempo todo", t["quieto"][1])
        self.assertIn("(limite 1,3×)", t["quieto"][1])
        self.assertEqual(t["pego"][0], "Detectado aos 0,6 s.")
        self.assertIn("9,8×", t["pego"][1])
        self.assertEqual(t["pego"][2], "Detectado aos 0,6 s")
        # passou do limite por um instante, sem o detector confirmar: não diz "abaixo o tempo todo"
        self.assertNotIn("abaixo do limite o tempo todo", t["raspou"])
        self.assertIn("1,6×", t["raspou"])
        self.assertEqual(t["tempo"][0], "Tempo esgotado.")
        self.assertEqual(t["numero"], "Nº 007")

    def test_duracao_da_formacao(self):
        q, p, l = self.o["duracao"]
        self.assertLessEqual(p, q)
        self.assertLess(max(q, l), 4.0)
        self.assertGreater(p, 0.5)

    def test_registros_antigos_nao_valem(self):
        self.assertEqual(self.o["invalido"], [False, False, False])


if __name__ == "__main__":
    unittest.main()

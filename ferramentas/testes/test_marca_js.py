"""Testes das partes puras de demo/marca.js (a marca em estrela de cada travessia). Precisa do Node.js.

    python -m unittest discover -s ferramentas/testes -v
"""

import json
import math
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
const rastro = (nC, xs, k0 = 0) => [...Array(nC)].map(() => l(1, 'contagem', k0)).concat(xs.map((x) => l(x, 'correndo', k0)));
const reg = (o) => M.registro({ n: 1, nome: 'Ana', quando: Date.UTC(2026, 9, 21, 17, 32, 8), fonte: 'live', lim: 1.3, ...o });
const aneis = (g) => g.map((a) => ({ raio: a.raio, amp: a.amp, tipo: a.tipo, giro: a.giro, forca: a.forca }));
const familia = (g) => ({ k: g.k, agudo: g.agudo, sentido: g.sentido, perfil: g.perfil, torcao: g.torcao });

const quieto = reg({ tempo: 4.1, ok: true, rastro: rastro(30, Array(41).fill(1.05)) });
const pego = reg({ tempo: 0.6, ok: false, rastro: rastro(30, [1.2, 2, 4, 6, 8, 9.8]) });
const longo = reg({ tempo: 20, ok: true, rastro: rastro(30, Array(200).fill(1.1)) });
const raspou = reg({ tempo: 3, ok: true, rastro: rastro(30, [1, 1, 1.6, 1, 1]) });
const tempo = reg({ tempo: 60.1, ok: null, rastro: rastro(30, Array(600).fill(1)) });
const semContagem = reg({ tempo: 2, ok: true, rastro: rastro(0, [1.1, 1.3, 1.2, 1.5]) });
out.quieto = { miolo: quieto.miolo.length, linhas: quieto.linhas.length, pico: quieto.pico, v: quieto.v, valido: M.valido(quieto) };
out.longo = { linhas: longo.linhas.length, miolo: longo.miolo.length };
out.gq = aneis(M.geometria(quieto, 100));
out.gl = aneis(M.geometria(longo, 100));
out.gp = aneis(M.geometria(pego, 100));
out.gs = aneis(M.geometria(semContagem, 100));
out.N = M.N_ANEIS;
// a mesma travessia dá sempre a mesma marca, também depois de guardada (JSON) e lida de novo
out.repete = JSON.stringify(aneis(M.geometria(pego, 100))) === JSON.stringify(aneis(M.geometria(JSON.parse(JSON.stringify(pego)), 100)))
  && JSON.stringify(familia(M.geometria(pego, 100))) === JSON.stringify(familia(M.geometria(JSON.parse(JSON.stringify(pego)), 100)));
// 60 travessias parecidas (só o tremor e a sala mudam um pouco): as famílias
let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
out.familias = [...Array(60)].map((_, i) => {
  const xs = [...Array(20 + Math.floor(rnd() * 30))].map(() => 1 + rnd() * 0.4);
  const g = M.geometria(reg({ tempo: 3, ok: true, rastro: rastro(30, xs, i) }), 100);
  const pontaMaisLonga = Math.max(...g.map((a) => a.raio * M.contorno(0, g.k, a.amp, g.agudo)));
  return { ...familia(g), cabe: pontaMaisLonga <= 100 + 1e-9, crescem: g.every((a, j) => !j || a.raio > g[j - 1].raio) };
});
out.contorno = [M.contorno(0, 5, 0.2, 1), M.contorno(Math.PI / 5, 5, 0.2, 1), M.contorno(Math.PI / 5, 5, 0.2, 2.5),
  M.contorno(0.3, 5, 0.2, 2), M.contorno(0.3 + 2 * Math.PI / 5, 5, 0.2, 2)];
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

    def test_28_aneis_com_leituras_reais(self):
        for g in (self.o["gp"], self.o["gq"], self.o["gl"], self.o["gs"]):
            self.assertEqual(len(g), self.o["N"])
        self.assertEqual(self.o["N"], 28)
        # 8 contornos da contagem (o miolo) e 20 da travessia
        self.assertEqual([a["tipo"] for a in self.o["gq"]][:8], ["miolo"] * 8)
        self.assertNotIn("miolo", [a["tipo"] for a in self.o["gs"]])   # sem contagem, tudo é travessia

    def test_aneis_de_dentro_para_fora_e_dentro_do_raio(self):
        for g in (self.o["gq"], self.o["gp"], self.o["gl"]):
            raios = [a["raio"] for a in g]
            self.assertEqual(raios, sorted(raios))
        for f in self.o["familias"]:
            self.assertTrue(f["cabe"], f)       # a ponta mais longa cabe no raio
            self.assertTrue(f["crescem"], f)

    def test_contorno_ponta_e_vao(self):
        ponta, vao, vao_agudo, a, b = self.o["contorno"]
        self.assertAlmostEqual(ponta, 1 + 1.4 * 0.2)
        self.assertAlmostEqual(vao, 1 - 0.6 * 0.2)
        self.assertAlmostEqual(vao_agudo, 1 - 0.6 * 0.2)
        self.assertAlmostEqual(a, b)            # as k pontas são iguais

    def test_anel_grosso_so_na_deteccao(self):
        self.assertEqual([a["tipo"] for a in self.o["gp"]][-1], "deteccao")
        for g in (self.o["gq"], self.o["gl"], self.o["gs"]):
            self.assertNotIn("deteccao", [a["tipo"] for a in g])

    def test_pico_e_o_momento_de_maior_tremor(self):
        g = self.o["gp"]
        tipos = [a["tipo"] for a in g]
        self.assertEqual(tipos.count("pico"), 1)
        i = tipos.index("pico")
        self.assertAlmostEqual(g[i]["forca"], 1.0)
        self.assertLess(i, len(g) - 1)

    def test_gira_mais_onde_o_sinal_mais_variou(self):
        g = self.o["gp"]   # a contagem é parada; o fim da travessia chega a 9,8x
        passo = [abs(b["giro"] - a["giro"]) for a, b in zip(g, g[1:])]
        self.assertGreater(sum(passo[-5:]) / 5, 2 * sum(passo[:5]) / 5)

    def test_mesma_travessia_mesma_marca(self):
        self.assertTrue(self.o["repete"])

    def test_travessias_diferentes_dao_marcas_diferentes(self):
        fs = self.o["familias"]
        self.assertGreaterEqual(len({f["k"] for f in fs}), 5)             # 4 a 9 pontas
        self.assertTrue(all(4 <= f["k"] <= 9 for f in fs))
        self.assertEqual({f["perfil"] for f in fs}, {"estrela", "flor", "nucleo"})
        self.assertEqual({f["sentido"] for f in fs}, {-1, 1})
        chaves = {(f["k"], f["perfil"], f["sentido"], round(f["agudo"], 1), round(f["torcao"], 2)) for f in fs}
        self.assertEqual(len(chaves), len(fs))                           # nenhuma repetida
        # com muitas pontas, as pontas não ficam finas demais (viram uma teia)
        self.assertTrue(all(f["agudo"] <= 1.9 for f in fs if f["k"] >= 8))
        # a espiral gira de 0,6 a 2 pontas inteiras, com qualquer número de pontas (mais que isso vira renda)
        voltas = [f["torcao"] * f["k"] / (2 * math.pi) for f in fs]
        self.assertTrue(all(0.45 - 1e-9 <= v <= 2 + 1e-9 for v in voltas), voltas)

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
        self.assertEqual(q, p)
        self.assertEqual(q, l)
        self.assertAlmostEqual(q, 27 * 0.075 + 0.95)   # um anel a cada 75 ms; cada um leva 0,95 s

    def test_registros_antigos_nao_valem(self):
        self.assertEqual(self.o["invalido"], [False, False, False])


if __name__ == "__main__":
    unittest.main()

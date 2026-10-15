"""Testes das funções puras de demo/historia.js (a apresentação "Como funciona"). Precisa do Node.js.

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
const H = require(process.argv[1] + '/historia.js'), R = require(process.argv[1] + '/roteiro.js');
const out = {};
// mola: chega exatamente no alvo e não passa dele
let x = 0, v = 0, maior = 0, passos = 0;
for (let i = 0; i < 600 && !(x === 3 && v === 0); i++) { [x, v] = H.mola(x, v, 3, 1 / 60, 3.8); maior = Math.max(maior, x); passos++; }
out.mola = { x, v, maior, passos };
// mola com dt enorme não explode
out.molaDtGrande = H.mola(0, 0, 1, 5);
// curva da transição: começa andando (inclinação m0), termina parada e exata, sempre para a frente
const pts = [], incl = [];
for (const m0 of [0, 1, 2, 3]) for (let i = 0; i <= 200; i++) { pts.push([m0, i / 200, H.transicao(i / 200, m0)]); incl.push(H.inclinacaoTransicao(i / 200, m0)); }
// curvas Bézier: começam em 0, terminam em 1; entra/sai/suave nunca voltam; o "pop" passa pouco do fim
const amostra = (f) => Array.from({ length: 401 }, (_, i) => f(i / 400));
out.curvas = Object.fromEntries(['entra', 'sai', 'suave', 'pop'].map((n) => {
  const v = amostra(H.curvas[n]);
  return [n, { ini: v[0], fim: v[400], max: Math.max(...v), min: Math.min(...v), monotonica: v.every((x, i) => i === 0 || x >= v[i - 1] - 1e-9) }];
}));
// confere a Bézier contra pontos conhecidos do cubic-bezier do CSS: ease (0.25, 0.1, 0.25, 1) em x = 0,5 dá ~0,8024
out.ease = H.bezier(0.25, 0.1, 0.25, 1)(0.5);
const marcas = R.cenas.flatMap((c) => [c.titulo, c.frase]).map((t) => (String(t).match(/\*/g) || []).length);
out.asteriscosPares = marcas.every((n) => n % 2 === 0);
out.transicao = {
  fim: [0, 1, 2, 3].map((m0) => H.transicao(1, m0)), comeco: [0, 1, 2, 3].map((m0) => H.transicao(0, m0)),
  inclinacao0: [0, 1, 2, 3].map((m0) => H.inclinacaoTransicao(0, m0)), inclinacao1: H.inclinacaoTransicao(1, 1),
  monotonica: pts.every(([m0, s, p], i) => i === 0 || pts[i - 1][0] !== m0 || p >= pts[i - 1][2] - 1e-12) && pts.every(([, , p]) => p >= -1e-12 && p <= 1 + 1e-12),
  meio: H.transicao(0.5, 1),
};
out.direcional = [H.alvoDirecional(2.2, 1), H.alvoDirecional(2.1, 1), H.alvoDirecional(2.9, -1), H.alvoDirecional(2.8, -1), H.alvoDirecional(3, 1)];
out.curta = H.ordemDa(R.cenas, 'curta');
out.completa = H.ordemDa(R.cenas, 'completa');
out.remap = [H.remapear('frequencias', R.cenas, 'curta'), H.remapear('placas', R.cenas, 'curta'), H.remapear('resultados', R.cenas, 'curta'), H.remapear('viabilidade', R.cenas, 'curta')];
const a = H.sinteticas(7, 30), b = H.sinteticas(7, 30), c = H.sinteticas(8, 30);
out.semente = { iguais: a.parado[20].a[10] === b.parado[20].a[10] && a.mexendo[25].a[40] === b.mexendo[25].a[40], diferentes: a.parado[20].a[10] !== c.parado[20].a[10] };
// perto de cada cena inteira nada se mexe (±0,12)
const ordem = ['placas', 'frequencias', 'linhas'], pad = Object.fromEntries(Object.entries(H.CAMADAS).map(([k, v]) => [k, v.padrao]));
const p1 = H.poseEm(1, ordem, H.POSES, pad), p2 = H.poseEm(1.1, ordem, H.POSES, pad), p0 = H.poseEm(0.9, ordem, H.POSES, pad);
// compara só o que aparece: camadas com presença > 0, números arredondados, sem a direção e o progresso da animação
const limpo = (p) => JSON.stringify(Object.fromEntries(Object.entries(p).filter(([k, q]) => !k.startsWith('_') && q.p > 1e-6)
  .map(([k, q]) => [k, Object.fromEntries(Object.entries(q).filter(([c]) => !["dir", "km", "vx", "lin"].includes(c)).map(([c, val]) => [c, typeof val === 'number' ? Math.round(val * 1e6) / 1e6 : val]))])));
out.repouso = { depois: limpo(p1) === limpo(p2), antes: limpo(p1) === limpo(p0) };
// em cada cena inteira (nas duas versões), o palco mostra exatamente a pose daquela cena
out.poseExata = [];
for (const v of ['completa', 'curta']) {
  const ord = H.ordemDa(R.cenas, v, (c) => Boolean(H.POSES[c.id]));
  ord.forEach((id, i) => {
    const P = H.poseEm(i, ord, H.POSES, pad), pose = H.POSES[id];
    const esperado = Object.fromEntries(Object.entries(pose).filter(([, q]) => (q.p ?? 1) > 0).map(([k, q]) => {
      const e = { ...pad[k], ...q }; delete e.entrada; delete e.saida; delete e.mover; delete e.p; return [k, e];
    }));
    const camadas = Object.entries(P).filter(([k, q]) => !k.startsWith('_') && q.p > 1e-9);
    if (camadas.some(([, q]) => q.p !== 1)) out.poseExata.push(`${v}:${id}:presença`);
    const visto = Object.fromEntries(camadas.map(([k, q]) => {
      const e = { ...q }; delete e.dir; delete e.km; delete e.vx; delete e.lin; delete e.p; return [k, e];
    }));
    const r = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, Object.keys(o[k]).sort().map((c) => [c, typeof o[k][c] === 'number' ? Math.round(o[k][c] * 1e6) / 1e6 : o[k][c]])]));
    if (r(esperado) !== r(visto)) out.poseExata.push(`${v}:${id}`);
  });
}
out.revela = [H.revelacao(0, 0, 5, 0.5, 0.9), H.revelacao(1, 4, 5, 0.5, 0.9), H.revelacao(0.7, 0, 5, 0.5, 0.9) > H.revelacao(0.7, 4, 5, 0.5, 0.9)];
out.ids = R.cenas.map((c) => c.id);
out.semPose = R.cenas.filter((c) => !H.POSES[c.id]).map((c) => c.id);
// a colinha: toda cena tem fala; todas menos a última têm a ponte para a próxima; ações e perguntas bem formadas
out.colinha = {
  semFala: R.cenas.filter((c) => !(typeof c.fala === 'string' && c.fala.length > 20)).map((c) => c.id),
  semPonte: R.cenas.slice(0, -1).filter((c) => !(typeof c.ponte === 'string' && c.ponte.length > 5)).map((c) => c.id),
  acoesRuins: R.cenas.filter((c) => c.acao !== undefined && !(Array.isArray(c.acao) && c.acao.every((a) => typeof a === 'string' && a.length > 3))).map((c) => c.id),
  perguntasRuins: [...R.cenas.flatMap((c) => c.perguntas || []), ...(R.perguntasGerais || [])].filter((q) => !(q.p && q.r)).length,
  gerais: (R.perguntasGerais || []).length,
  falaLonga: R.cenas.filter((c) => c.fala && c.fala.split(/[.!?]\s/).length > 6).map((c) => c.id),
};
console.log(JSON.stringify(out));
"""


@unittest.skipIf(NODE is None, "Node.js não instalado")
class TestHistoria(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        r = subprocess.run([NODE, "-e", SCRIPT, str(DEMO)], capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            raise AssertionError(r.stderr)
        cls.r = json.loads(r.stdout)

    def test_mola_chega_exata_e_sem_passar(self):
        m = self.r["mola"]
        self.assertEqual((m["x"], m["v"]), (3, 0))
        self.assertLessEqual(m["maior"], 3 + 1e-9)       # criticamente amortecida: não passa do alvo
        self.assertLess(m["passos"], 200)                # e para em menos de ~3 s

    def test_mola_com_dt_grande_nao_explode(self):
        x, v = self.r["molaDtGrande"]
        self.assertTrue(0 <= x <= 1)

    def test_curvas_bezier(self):
        for nome, v in self.r["curvas"].items():
            self.assertEqual((v["ini"], v["fim"]), (0, 1), nome)
        for nome in ("entra", "sai", "suave"):
            self.assertTrue(self.r["curvas"][nome]["monotonica"], nome)
            self.assertLessEqual(self.r["curvas"][nome]["max"], 1 + 1e-9, nome)
        self.assertLess(self.r["curvas"]["pop"]["max"], 1.06)       # passa no máximo 6% do fim
        self.assertAlmostEqual(self.r["ease"], 0.8024, places=3)      # mesmo resultado do navegador

    def test_palavra_chave_marcada_em_pares(self):
        self.assertTrue(self.r["asteriscosPares"])

    def test_curva_da_transicao(self):
        t = self.r["transicao"]
        self.assertEqual(t["fim"], [1, 1, 1, 1])
        self.assertEqual(t["comeco"], [0, 0, 0, 0])
        self.assertEqual(t["inclinacao0"], [0, 1, 2, 3])      # começa com a velocidade pedida
        self.assertEqual(t["inclinacao1"], 0)                  # e termina parada
        self.assertTrue(t["monotonica"])                       # nunca volta nem passa do fim
        self.assertGreater(t["meio"], 0.5)                     # mais da metade do caminho na primeira metade do tempo

    def test_encaixe_na_direcao_do_movimento(self):
        self.assertEqual(self.r["direcional"], [3, 2, 3, 2, 3])

    def test_versoes(self):
        self.assertEqual(len(self.r["completa"]), len(self.r["ids"]))
        self.assertEqual(len(self.r["curta"]), 12)
        self.assertEqual(self.r["curta"][0], "abertura")
        self.assertEqual(self.r["remap"], ["frequencias", "placas", "parado", "privacidade"])

    def test_dados_de_ilustracao_deterministicos(self):
        self.assertTrue(self.r["semente"]["iguais"])
        self.assertTrue(self.r["semente"]["diferentes"])

    def test_repouso_perto_da_cena(self):
        self.assertTrue(self.r["repouso"]["depois"])
        self.assertTrue(self.r["repouso"]["antes"])

    def test_cada_cena_parada_mostra_a_sua_pose(self):
        self.assertEqual(self.r["poseExata"], [])

    def test_revelacao_das_palavras(self):
        self.assertEqual(self.r["revela"][:2], [0, 1])
        self.assertTrue(self.r["revela"][2])            # a primeira palavra chega antes da última

    def test_colinha_completa(self):
        c = self.r["colinha"]
        self.assertEqual(c["semFala"], [])
        self.assertEqual(c["semPonte"], [])
        self.assertEqual(c["acoesRuins"], [])
        self.assertEqual(c["perguntasRuins"], 0)
        self.assertGreaterEqual(c["gerais"], 4)
        self.assertEqual(c["falaLonga"], [])        # fala curta: no máximo 6 frases por cena

    def test_ids_unicos(self):
        self.assertEqual(len(set(self.r["ids"])), len(self.r["ids"]))


if __name__ == "__main__":
    unittest.main()

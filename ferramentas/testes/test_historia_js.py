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
out.direcional = [H.alvoDirecional(2.2, 1), H.alvoDirecional(2.1, 1), H.alvoDirecional(2.9, -1), H.alvoDirecional(2.8, -1), H.alvoDirecional(3, 1)];
out.curta = H.ordemDa(R.cenas, 'curta');
out.completa = H.ordemDa(R.cenas, 'completa');
out.remap = [H.remapear('acorde', R.cenas, 'curta'), H.remapear('placas', R.cenas, 'curta'), H.remapear('lamarr', R.cenas, 'curta')];
const a = H.sinteticas(7, 30), b = H.sinteticas(7, 30), c = H.sinteticas(8, 30);
out.semente = { iguais: a.parado[20].a[10] === b.parado[20].a[10] && a.mexendo[25].a[40] === b.mexendo[25].a[40], diferentes: a.parado[20].a[10] !== c.parado[20].a[10] };
// perto de cada cena inteira nada se mexe (±0,12)
const ordem = ['placas', 'acorde', 'linhas'], pad = Object.fromEntries(Object.entries(H.CAMADAS).map(([k, v]) => [k, v.padrao]));
const p1 = H.poseEm(1, ordem, H.POSES, pad), p2 = H.poseEm(1.1, ordem, H.POSES, pad), p0 = H.poseEm(0.9, ordem, H.POSES, pad);
// compara só o que aparece: camadas com presença > 0, números arredondados, sem a direção e o progresso da animação
const limpo = (p) => JSON.stringify(Object.fromEntries(Object.entries(p).filter(([k, q]) => !k.startsWith('_') && q.p > 1e-6)
  .map(([k, q]) => [k, Object.fromEntries(Object.entries(q).filter(([c]) => !["dir", "km", "vx"].includes(c)).map(([c, val]) => [c, typeof val === 'number' ? Math.round(val * 1e6) / 1e6 : val]))])));
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
      const e = { ...q }; delete e.dir; delete e.km; delete e.vx; delete e.p; return [k, e];
    }));
    const r = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, Object.keys(o[k]).sort().map((c) => [c, typeof o[k][c] === 'number' ? Math.round(o[k][c] * 1e6) / 1e6 : o[k][c]])]));
    if (r(esperado) !== r(visto)) out.poseExata.push(`${v}:${id}`);
  });
}
out.revela = [H.revelacao(0, 0, 5, 0.5, 0.9), H.revelacao(1, 4, 5, 0.5, 0.9), H.revelacao(0.7, 0, 5, 0.5, 0.9) > H.revelacao(0.7, 4, 5, 0.5, 0.9)];
out.ids = R.cenas.map((c) => c.id);
out.semPose = R.cenas.filter((c) => !H.POSES[c.id]).map((c) => c.id);
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

    def test_encaixe_na_direcao_do_movimento(self):
        self.assertEqual(self.r["direcional"], [3, 2, 3, 2, 3])

    def test_versoes(self):
        self.assertEqual(len(self.r["completa"]), len(self.r["ids"]))
        self.assertEqual(len(self.r["curta"]), 11)
        self.assertEqual(self.r["curta"][0], "abertura")
        self.assertEqual(self.r["remap"], ["linhas", "placas", "fim"])

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

    def test_ids_unicos(self):
        self.assertEqual(len(set(self.r["ids"])), len(self.r["ids"]))


if __name__ == "__main__":
    unittest.main()

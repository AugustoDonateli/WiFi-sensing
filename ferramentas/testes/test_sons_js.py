"""Testes das partes puras de demo/sons.js (o som das trocas de tela). Precisa do Node.js.

    python -m unittest discover -s ferramentas/testes -v

O som em si (Web Audio) é medido no navegador: ferramentas/laboratorio-passagens/medir.py.
"""

import json
import shutil
import subprocess
import unittest
from pathlib import Path

DEMO = Path(__file__).resolve().parents[2] / "demo"
NODE = shutil.which("node")

SCRIPT = r"""
const S = require(process.argv[1] + '/sons.js'), P = require(process.argv[1] + '/passagem.js'), E = require(process.argv[1] + '/escuta.js');
const out = { problemas: [] };
const ruim = (msg) => out.problemas.push(msg);
const arr = (a) => Array.from(a || []);
const GESTOS_SAIDA = ['pouso', 'pousoHistoria', 'tomar', 'fecharOlhos', 'travessia', 'aneis', 'fade'];
const GESTOS_ENTRADA = ['pouso', 'historia', 'fecharOlhos', 'travessia', 'aneis', 'fade'];
const NOVAS = ['sinal', 'notas', 'ar'];
const quase = (a, b, tol = 1e-4) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const ctxs = { plano: {}, real: { espectro: S.espectro({ a: Array.from({ length: 64 }, (_, k) => (k < 5 || k > 59 ? 0 : 10 + 5 * Math.sin(k / 4))), d: Array.from({ length: 64 }, (_, k) => (k % 7 === 0 ? 3 : 0.2)) }) } };

// o som do SINAL de cada família: o "fade" em u = 0
for (const fam of NOVAS) for (const [nomeCtx, c] of Object.entries(ctxs)) {
  const base = S.amostrar(S.partitura(fam, 'entrada', 'fade', c), 'entrada', 1, 11).vozes;
  const mesmo = (v, b, onde) => {
    for (const k of ['f', 'g', 'pan', 'corte', 'q', 'bat']) {
      const a = v[k] ? v[k] : null, z = b[k] ? b[k] : null;
      if (!a && !z) continue;
      if (!a || !z || !quase(a.at(onde), z[0])) ruim(`${fam}/${nomeCtx}: ${k} diferente do SINAL (${a && a.at(onde)} x ${z && z[0]})`);
    }
  };
  // toda entrada começa no SINAL; vozes a mais começam caladas
  for (const g of GESTOS_ENTRADA) {
    const A = S.amostrar(S.partitura(fam, 'entrada', g, c), 'entrada', 1, 11);
    A.vozes.forEach((v, i) => { if (i < base.length) mesmo(v, base[i], 0); else if (v.g[0] > 1e-3) ruim(`${fam} ${g}: voz extra ${i} não começa calada`); });
  }
  // toda saída termina no SINAL (a de trás para a frente e a direta)
  for (const g of GESTOS_SAIDA) {
    const A = S.amostrar(S.partitura(fam, 'saida', g, c), 'saida', 1, 11);
    A.vozes.forEach((v, i) => { if (i < base.length) mesmo(v, base[i], -1); else if (v.g.at(-1) > 1e-3) ruim(`${fam} ${g}: voz extra ${i} não termina calada`); });
  }
}

// a saída é a entrada de trás para a frente (menos as diretas)
out.reverso = [];
for (const fam of NOVAS) for (const g of ['pouso', 'fecharOlhos', 'travessia', 'aneis']) {
  const Pt = S.partitura(fam, 'saida', g, {}), dur = 0.8;
  const a = S.amostrar(Pt, 'entrada', dur, 21), b = S.amostrar(Pt, 'saida', dur, 21);
  const curvas = a.vozes.every((v, i) => arr(v.g).every((x, j) => quase(x, b.vozes[i].g[20 - j])) && (!v.f || arr(v.f).every((x, j) => quase(x, b.vozes[i].f[20 - j]))));
  const toques = a.toques.length === b.toques.length && a.toques.every((t) => b.toques.some((u) => u.f === t.f && u.tipo === t.tipo && quase(u.t, dur - t.t, 1e-6)));
  out.reverso.push(curvas && toques);
}

// valores dentro dos limites; toques dentro do tempo; nenhuma família fica sem som num evento
out.semSom = []; out.inicio = {};
for (const fam of [...NOVAS, 'antigo']) for (const ev of ['saida', 'entrada']) for (const g of ev === 'saida' ? GESTOS_SAIDA : GESTOS_ENTRADA) {
  const Pt = S.partitura(fam, ev, g, ctxs.real);
  if (!Pt) { out.semSom.push(`${fam} ${ev} ${g}`); continue; }
  const dur = (P.TEMPOS[g] || P.TEMPOS.fade)[ev === 'saida' ? 0 : 1];
  const A = S.amostrar(Pt, ev, dur);
  for (const v of A.vozes) {
    if (arr(v.g).some((x) => !(x >= 0 && x <= 2.5))) ruim(`${fam} ${ev} ${g}: ganho fora`);   // o filtro estreito do assobio (ar) pede um pouco mais
    if (v.f && arr(v.f).some((x) => !(x >= 40 && x <= 5000))) ruim(`${fam} ${ev} ${g}: frequência fora`);
    if (arr(v.pan).some((x) => Math.abs(x) > 1)) ruim(`${fam} ${ev} ${g}: lado fora`);
  }
  for (const t of A.toques) if (!(t.t >= 0 && t.t <= dur + 1e-9 && t.g > 0 && t.dur > 0)) ruim(`${fam} ${ev} ${g}: toque fora do tempo`);
  // a saída responde logo ao clique: em até 0,2 s, um toque ou as vozes já em 25% do máximo
  if (ev === 'saida' && fam !== 'antigo') {
    const tot = arr(A.vozes[0].g).map((_, i) => A.vozes.reduce((s, v) => s + v.g[i], 0)), mx = Math.max(...tot);
    const tv = (tot.findIndex((x) => x >= 0.25 * mx) / (tot.length - 1)) * dur, tt = A.toques.length ? A.toques[0].t : Infinity;
    out.inicio[`${fam} ${g}`] = Math.round(Math.min(tv, tt) * 100) / 100;
  }
}

// o sopro de antes, igual ao que o index.html fazia
const ant = (ev, g) => { const Pt = S.partitura('antigo', ev, g); if (!Pt) return null; const A = S.amostrar(Pt, ev, 1, 3); const v = A.vozes[0]; return { pan: [v.pan[0], v.pan[2]], corte: [Math.round(v.corte[0]), Math.round(v.corte[2])], pico: Math.max(...arr(S.amostrar(Pt, ev, 1, 201).vozes[0].g)), filtro: v.filtro, nivel: Pt.nivel }; };
out.antigo = { saidaTravessia: ant('saida', 'travessia'), entradaPouso: ant('entrada', 'pouso'), entradaOlhos: ant('entrada', 'fecharOlhos'), saidaOlhos: ant('saida', 'fecharOlhos') };

// o espectro da leitura
const plano = S.espectro(null), real = ctxs.real.espectro;
const parado = S.espectro({ a: Array(64).fill(10), d: Array(64).fill(0.1) }), mexendo = S.espectro({ a: Array(64).fill(10), d: Array(64).fill(3) });
out.espectro = {
  plano: plano.peso.every((x) => x === 1) && plano.tremor.every((x) => x === 0) && !plano.real,
  tamanho: [real.peso.length, real.tremor.length], real: real.real,
  mediaPeso: real.peso.reduce((s, x) => s + x, 0) / real.peso.length,
  // mexeu, as notas tremem: o batimento sobe
  batParado: S.notasDoSinal({ espectro: parado }).map((b) => b.bat), batMexendo: S.notasDoSinal({ espectro: mexendo }).map((b) => b.bat),
  somaPesos: S.notasDoSinal({ espectro: real }).reduce((s, b) => s + b.p, 0),
};
out.acorde = { sons: S.ACORDE, escuta: E.NOTAS };
out.padrao = S.PADRAO; out.familias = Object.keys(S.FAMILIAS);
console.log(JSON.stringify(out));
"""


@unittest.skipIf(NODE is None, "Node.js não instalado")
class TestSons(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        r = subprocess.run([NODE, "-e", SCRIPT, str(DEMO)], capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            raise AssertionError(r.stderr)
        cls.r = json.loads(r.stdout)

    def test_toda_troca_passa_pelo_som_do_sinal(self):
        # toda entrada começa no som do SINAL e toda saída termina nele: qualquer saída emenda em qualquer entrada
        self.assertEqual(self.r["problemas"], [])

    def test_saida_e_a_entrada_de_tras_para_a_frente(self):
        self.assertTrue(all(self.r["reverso"]), self.r["reverso"])

    def test_propostas_tem_som_em_toda_troca(self):
        # só o sopro antigo fica calado (na escuta e nas entradas que ele não tinha)
        self.assertTrue(all(x.startswith("antigo ") for x in self.r["semSom"]), self.r["semSom"])

    def test_saida_responde_logo(self):
        lentos = {k: v for k, v in self.r["inicio"].items() if v > 0.2}
        self.assertEqual(lentos, {})

    def test_sopro_antigo_igual_ao_de_antes(self):
        a = self.r["antigo"]
        self.assertEqual(a["saidaTravessia"]["pan"], [0.800000011920929, -0.800000011920929])   # Float32
        self.assertEqual(a["saidaTravessia"]["corte"], [500, 1100])
        self.assertEqual(a["saidaTravessia"]["filtro"], "bandpass")
        self.assertAlmostEqual(a["saidaTravessia"]["pico"], 0.05, places=3)
        self.assertEqual(a["entradaPouso"]["corte"], [900, 240])
        self.assertAlmostEqual(a["entradaPouso"]["pico"], 0.035, places=3)
        self.assertIsNone(a["entradaOlhos"])
        self.assertIsNone(a["saidaOlhos"])
        self.assertEqual(a["entradaPouso"]["nivel"], 1)

    def test_espectro_da_leitura(self):
        e = self.r["espectro"]
        self.assertTrue(e["plano"])                      # sem leitura: nada inventado
        self.assertEqual(e["tamanho"], [12, 12])
        self.assertTrue(e["real"])
        self.assertAlmostEqual(e["mediaPeso"], 1, delta=0.15)
        self.assertAlmostEqual(e["somaPesos"], 1, places=6)
        self.assertTrue(all(m > p + 2 for p, m in zip(e["batParado"], e["batMexendo"])))   # mexeu, treme

    def test_mesmo_acorde_da_escuta(self):
        self.assertEqual(self.r["acorde"]["sons"], self.r["acorde"]["escuta"])

    def test_familias(self):
        self.assertEqual(self.r["familias"], ["sinal", "notas", "ar", "antigo"])
        self.assertIn(self.r["padrao"], self.r["familias"])


if __name__ == "__main__":
    unittest.main()

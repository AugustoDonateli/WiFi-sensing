"""Testes das partes puras de demo/passagem.js (as passagens entre as telas do site). Precisa do Node.js.

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
const P = require(process.argv[1] + '/passagem.js');
const out = {};
const V = { x: 0, y: 0, w: 1920, h: 1080 };
const cx = { V, grafico: P.caixaLinhas({ x: 1000, y: 120, w: 700, h: 756 }), ponto: { x: 1600, y: 540, r: 14 },
  historia: { x: 900, y: 200, w: 900, h: 600 }, historiaReal: { x: 900, y: 200, w: 900, h: 600 }, centro: { x: 960, y: 540 } };

// Uma máquina com um "site" de mentira: registra o que abriu e o que saiu.
function site(inicio = 'tela', pode = () => true, erro = null) {
  const log = [];
  let atual = inicio;
  const maq = P.criarMaquina({
    executar: (d) => { log.push('abre ' + d); if (d === erro) throw new Error('falhou'); if (pode(d)) atual = d; },
    modoAtual: () => atual, aoSair: (m) => log.push('sai ' + m),
  });
  const rodar = (s, dt = 1 / 60) => { for (let i = 0; i < s / dt && maq.estado().fase !== 'livre'; i++) maq.passo(dt); };
  return { maq, log, rodar, atual: () => atual };
}

// uma troca: sai a origem, abre o destino uma vez só, termina livre
{ const s = site(); const r = s.maq.pedir('desafio'); s.rodar(5); out.simples = { r, log: s.log, fase: s.maq.estado().fase, atual: s.atual() }; }
// mesma tela: abre direto, sem passagem
{ const s = site('desafio'); const r = s.maq.pedir('desafio'); out.mesma = { r, log: s.log, fase: s.maq.estado().fase }; }
// destino trocado antes do meio: só o último abre
{ const s = site(); s.maq.pedir('desafio'); s.maq.passo(0.2); s.maq.pedir('galeria'); s.rodar(5); out.antesDoMeio = { log: s.log, atual: s.atual() }; }
// depois do meio: volta de ré até o sinal e abre o novo destino
{
  const s = site(); s.maq.pedir('escuta'); s.rodar(1.6);
  const antes = s.maq.estado().fase;
  const r = s.maq.pedir('desafio'); const durante = s.maq.estado().fase;
  s.rodar(6); out.depoisDoMeio = { antes, r, durante, log: s.log, atual: s.atual(), fase: s.maq.estado().fase };
}
// pedir de novo a tela que está entrando não muda nada
{ const s = site(); s.maq.pedir('galeria'); s.rodar(1.4); const f = s.maq.estado().fase; const r = s.maq.pedir('galeria'); s.rodar(5); out.repetido = { f, r, log: s.log }; }
// a tela recusa no meio (fonte parou): a entrada é a da tela que ficou
{ const s = site('tela', (d) => d !== 'desafio'); s.maq.pedir('desafio'); s.rodar(1.2); out.recusa = { log: s.log, modo: s.maq.estado().modo, gesto: s.maq.estado().gEntrada }; s.rodar(5); }
// concluir antes do meio faz a troca que faltava
{ const s = site(); s.maq.pedir('historia'); s.maq.passo(0.1); s.maq.concluir(); out.concluir = { log: s.log, fase: s.maq.estado().fase, atual: s.atual() }; }
// salto enorme de tempo: termina tudo, na ordem (o sinal espera 2 quadros)
{ const s = site(); s.maq.pedir('galeria'); s.maq.passo(100); const f1 = s.maq.estado().fase; s.maq.passo(100); s.maq.passo(100); out.salto = { f1, fase: s.maq.estado().fase, log: s.log }; }
// a ação dá erro: a passagem não trava
{ const s = site('tela', () => true, 'galeria'); s.maq.pedir('galeria'); s.rodar(5); out.erro = { fase: s.maq.estado().fase, erro: Boolean(s.maq.estado().erro) }; }
// a rápida leva menos tempo
{
  const dur = (opc) => { const s = site('historia'); s.maq.pedir('tela', opc); let t = 0; while (s.maq.estado().fase !== 'livre' && t < 10) { s.maq.passo(1 / 60); t += 1 / 60; } return t; };
  out.rapida = { normal: dur({}), rapida: dur({ rapida: true }) };
}

// contrato do sinal: toda saída em u = 1 e toda entrada em u = 0 são o próprio sinal
const neutro = JSON.stringify(P.neutro({ V }));
const gestos = Object.keys(P.POSES);
out.contrato = {
  entradas: gestos.filter((g) => g !== 'fade').map((g) => [g, JSON.stringify(P.poseEntrada(g, 0, cx)) === neutro]),
  saidas: gestos.filter((g) => g !== 'fade').concat(['tomar']).map((g) => [g, JSON.stringify(P.poseSaida(g, 1, cx)) === neutro]),
};
// e perto das pontas a pose já é quase o sinal (sem salto)
const quase = (Q) => Q.fora > 0.99 && Q.dentro > 0.99 && Q.aperto < 0.01 && Q.ponto < 0.01 && Q.aneis < 0.01 && Math.abs(Q.L.w - P.caixaLinhas(V).w) < 2
  && (!Q.frente || Q.frente.x < -Q.frente.s * 2) && (!Q.pena || Q.pena.u < 0.01);
out.continuidade = gestos.filter((g) => g !== 'fade').map((g) => [g, quase(P.poseEntrada(g, 0.001, cx))]);
// no fim de cada entrada a passagem some (a tela de destino fica à mostra)
const fim = (g) => P.poseEntrada(g, 1, cx);
out.fins = {
  pouso: fim('pouso'), historia: fim('historia'), fecharOlhos: fim('fecharOlhos'), travessia: fim('travessia'), aneis: fim('aneis'),
};
out.grafico = cx.grafico;
out.raios = P.raiosAneis(V);

// Desenho num canvas de mentira: guarda os pontos de cada traço.
function canvasFalso() {
  const tracos = []; let atual = null;
  const c = {
    save() {}, restore() {}, clip() {}, rect() {}, fillRect() {}, fill() {}, arc() {}, fillText() {}, closePath() {},
    beginPath() { atual = []; }, moveTo(x, y) { atual.push([x, y]); }, lineTo(x, y) { atual.push([x, y]); },
    stroke() { tracos.push(atual); },
  };
  return { c, tracos };
}
// sem leituras: as linhas ficam retas (nada de relevo inventado)
{ const { c, tracos } = canvasFalso(); P.desenharPose(c, P.neutro({ V }), [], 0, { fundo: '#000000', tinta: '#ffffff' }, 0, V, null);
  out.retas = { n: tracos.length, retas: tracos.every((t) => t.every(([, y]) => Math.abs(y - t[0][1]) < 1e-9)) }; }
// com leituras e anéis completos: cada linha vira um anel (todos os pontos à mesma distância do centro, menos o relevo)
{
  const a = new Float32Array(64).fill(10), d = new Float32Array(64);
  for (const k of [0, 1, 2, 3, 4, 60, 61, 62, 63]) a[k] = 0;
  const ls = Array.from({ length: 49 }, () => ({ a, d }));
  const Q = P.poseEntrada('aneis', 0.5, cx);   // aneis = 1 (os anéis já fechados, começando a abrir)
  const { c, tracos } = canvasFalso(); P.desenharPose(c, Q, ls, 0, { fundo: '#000000', tinta: '#ffffff' }, 0, V, null);
  // com amplitude igual em todas as subportadoras o relevo só vem da borda (seno): a ponta reta de cada linha fica no raio-base
  const raioPonta = tracos.map((t) => Math.hypot(t[0][0] - 960, t[0][1] - 540));
  out.aneis = { n: tracos.length, crescente: raioPonta.every((r, i) => i === 0 || r > raioPonta[i - 1]), dentro: raioPonta[0], fora: raioPonta[raioPonta.length - 1] };
  const Q0 = P.poseEntrada('aneis', 0, cx), f2 = canvasFalso(); P.desenharPose(f2.c, Q0, ls, 0, { fundo: '#000000', tinta: '#ffffff' }, 0, V, null);
  out.aneisZero = { pontasRetas: f2.tracos.every((t) => Math.abs(t[0][1] - t[t.length - 1][1]) < 1e-6) };
}
out.cores = [P.misturarCores('#000000', '#ffffff', 0.5), P.misturarCores('#0B0B0A', '#EDEDE8', 0), P.misturarCores('#0B0B0A', '#EDEDE8', 1)];
console.log(JSON.stringify(out));
"""


@unittest.skipUnless(NODE, "precisa do Node.js")
class TestPassagem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        r = subprocess.run([NODE, "-e", SCRIPT, str(DEMO)], capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            raise RuntimeError(r.stderr)
        cls.o = json.loads(r.stdout)

    def test_troca_simples(self):
        s = self.o["simples"]
        self.assertEqual(s["r"], "saindo")
        self.assertEqual(s["log"], ["sai tela", "abre desafio"])   # a lógica sai antes; a tela nova abre uma vez
        self.assertEqual((s["fase"], s["atual"]), ("livre", "desafio"))

    def test_mesma_tela_abre_direto(self):
        m = self.o["mesma"]
        self.assertEqual((m["r"], m["log"], m["fase"]), ("direto", ["abre desafio"], "livre"))

    def test_destino_trocado_antes_do_meio(self):
        a = self.o["antesDoMeio"]
        self.assertEqual(a["log"], ["sai tela", "abre galeria"])
        self.assertEqual(a["atual"], "galeria")

    def test_volta_de_re_depois_do_meio(self):
        d = self.o["depoisDoMeio"]
        self.assertEqual(d["antes"], "entrando")
        self.assertEqual((d["r"], d["durante"]), ("recuando", "recuando"))
        self.assertEqual(d["log"], ["sai tela", "abre escuta", "sai escuta", "abre desafio"])
        self.assertEqual((d["atual"], d["fase"]), ("desafio", "livre"))

    def test_pedir_a_mesma_que_entra_nao_muda(self):
        r = self.o["repetido"]
        self.assertEqual((r["f"], r["r"]), ("entrando", "entrando"))
        self.assertEqual(r["log"], ["sai tela", "abre galeria"])

    def test_recusa_no_meio_entra_a_que_ficou(self):
        r = self.o["recusa"]
        self.assertEqual(r["modo"], "tela")
        self.assertEqual(r["gesto"], "pouso")

    def test_concluir_faz_a_troca(self):
        c = self.o["concluir"]
        self.assertEqual(c["log"], ["sai tela", "abre historia"])
        self.assertEqual((c["fase"], c["atual"]), ("livre", "historia"))

    def test_salto_de_tempo(self):
        s = self.o["salto"]
        self.assertEqual(s["f1"], "sinal")            # depois do meio, espera a tela nova ser pintada
        self.assertEqual(s["fase"], "livre")
        self.assertEqual(s["log"], ["sai tela", "abre galeria"])

    def test_erro_na_acao_nao_trava(self):
        self.assertEqual(self.o["erro"], {"fase": "livre", "erro": True})

    def test_rapida(self):
        r = self.o["rapida"]
        self.assertLess(r["rapida"], 1.2)
        self.assertLess(r["rapida"], r["normal"] * 0.65)

    def test_contrato_do_sinal(self):
        for g, igual in self.o["contrato"]["entradas"] + self.o["contrato"]["saidas"]:
            self.assertTrue(igual, g)
        for g, perto in self.o["continuidade"]:
            self.assertTrue(perto, g)

    def test_fim_das_entradas(self):
        f = self.o["fins"]
        self.assertEqual(f["pouso"]["L"], self.o["grafico"])   # as linhas caem exatamente no gráfico
        self.assertEqual(f["pouso"]["fora"], 0)
        self.assertEqual((f["historia"]["fora"], f["historia"]["dentro"], f["historia"]["linhas"]), (0, 0, 0))
        self.assertEqual((f["fecharOlhos"]["aperto"], f["fecharOlhos"]["ponto"], f["fecharOlhos"]["fora"]), (1, 1, 0))
        self.assertGreater(f["travessia"]["frente"]["x"], 1920)   # a pessoa já saiu pela direita
        r = self.o["raios"]
        self.assertGreater(f["aneis"]["revela"] * r["R"] * 1.05 * f["aneis"]["escala"], (1920 ** 2 + 1080 ** 2) ** 0.5 / 2)

    def test_sem_leituras_linhas_retas(self):
        self.assertEqual(self.o["retas"]["n"], 49)
        self.assertTrue(self.o["retas"]["retas"])

    def test_aneis(self):
        a = self.o["aneis"]
        self.assertEqual(a["n"], 49)
        self.assertTrue(a["crescente"])                 # a mais antiga por dentro, como na marca
        self.assertLess(a["dentro"], a["fora"])
        self.assertTrue(self.o["aneisZero"]["pontasRetas"])

    def test_cores(self):
        self.assertEqual(self.o["cores"], ["#808080", "#0b0b0a", "#edede8"])


if __name__ == "__main__":
    unittest.main()

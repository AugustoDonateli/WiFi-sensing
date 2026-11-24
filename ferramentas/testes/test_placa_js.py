"""Linhas de estado do firmware v2 (demo/placa.js): leitura e diagnóstico de onde os pacotes se perdem.

Precisa do Node.js. Sem ele, o teste é pulado.
    python -m unittest discover -s ferramentas/testes -v
"""

import json
import shutil
import subprocess
import unittest
from pathlib import Path

PLACA = Path(__file__).resolve().parents[2] / "demo" / "placa.js"
NODE = shutil.which("node")

SCRIPT = r"""
const P = require(process.argv[1]);
const entrada = JSON.parse(process.argv[2]);
const lidas = entrada.linhas.map((l) => P.lerLinhaPlaca(l));
const stats = lidas.filter((x) => x && x.tipo === 'stat');
console.log(JSON.stringify({ lidas, diag: P.diagnostico(stats) }));
"""


def stat(rec, tentou="100", fila=0, nao_saiu="0", estado="ok", canal=11):
    # WS_STAT,tempo_ms,canal,recebidos,repetidos,fila_cheia,a_tentou,a_sem_resposta,a_nao_saiu,rssi,ruido,estado,a_freq
    return f"WS_STAT,1000,{canal},{rec},0,{fila},{tentou},0,{nao_saiu},-60,-95,{estado},100"


def rodar(linhas):
    r = subprocess.run([NODE, "-e", SCRIPT, str(PLACA), json.dumps({"linhas": linhas})],
                       capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        raise AssertionError(r.stderr)
    return json.loads(r.stdout)


@unittest.skipUnless(NODE, "Node.js não encontrado")
class TestLeitura(unittest.TestCase):
    def test_stat_completo(self):
        s = rodar([stat(95, nao_saiu="2")])["lidas"][0]
        self.assertEqual(s["tipo"], "stat")
        self.assertEqual((s["canal"], s["recebidos"], s["aTentou"], s["aNaoSaiu"], s["rssi"]), (11, 95, 100, 2, -60))
        self.assertEqual(s["estado"], "ok")

    def test_campos_desconhecidos_viram_null(self):
        s = rodar(["WS_STAT,1000,6,0,0,0,-,-,-,-,-,procurando,0"])["lidas"][0]
        self.assertIsNone(s["aTentou"])
        self.assertIsNone(s["rssi"])
        self.assertEqual(s["estado"], "procurando")

    def test_outras_linhas(self):
        lidas = rodar([
            "WS_CANAL,6,ok",
            "WS_VARREDURA,6,120,4,9,-95",
            "WS_VARREDURA,fim,6",
            "WS_INFO,a Placa A sumiu: procurando em todos os canais",
            "CSI_DATA,1,1a:00:00:00:00:00",
            "WS_STAT,cortada",
            "lixo",
        ])["lidas"]
        self.assertEqual(lidas[0], {"tipo": "canal", "canal": 6, "resultado": "ok"})
        self.assertEqual(lidas[1]["ocupacao"], 4)
        self.assertEqual(lidas[1]["nota"], 9)
        self.assertEqual(lidas[2], {"tipo": "varredura-fim", "melhor": 6})
        self.assertIn("sumiu", lidas[3]["texto"])
        self.assertEqual(lidas[4:], [None, None, None])


@unittest.skipUnless(NODE, "Node.js não encontrado")
class TestDiagnostico(unittest.TestCase):
    def test_tudo_chegando(self):
        d = rodar([stat(98)] * 5)["diag"]
        self.assertEqual(d["situacao"], "ok")
        self.assertAlmostEqual(d["chegamPorS"], 98)
        self.assertAlmostEqual(d["tentouPorS"], 100)

    def test_perda_no_ar(self):
        d = rodar([stat(20)] * 5)["diag"]   # a feira de 22/10: 10 a 20 por segundo
        self.assertEqual(d["situacao"], "ar")
        self.assertAlmostEqual(d["fracaoNoAr"], 0.8)
        self.assertIn("80%", d["frase"])

    def test_canal_ocupado(self):
        d = rodar([stat(60, nao_saiu="30")] * 5)["diag"]
        self.assertEqual(d["situacao"], "canal-ocupado")
        self.assertAlmostEqual(d["fracaoNaoSaiu"], 0.3)

    def test_usb(self):
        d = rodar([stat(100, fila=20)] * 5)["diag"]
        self.assertEqual(d["situacao"], "usb")
        self.assertAlmostEqual(d["chegamPorS"], 80)

    def test_sem_a(self):
        d = rodar([stat(0, tentou="-", nao_saiu="-")] * 3)["diag"]
        self.assertEqual(d["situacao"], "sem-a")

    def test_segundo_vazio_conta_no_seguinte(self):
        # Um segundo sem nada: o número da sonda pula 200 no segundo seguinte.
        d = rodar([stat(0, tentou="-", nao_saiu="-"), stat(100, tentou="200")])["diag"]
        self.assertAlmostEqual(d["fracaoNoAr"], 0.5)

    def test_ignora_varredura_e_procura(self):
        d = rodar([stat(0, tentou="-", estado="varrendo"), stat(99)])["diag"]
        self.assertEqual(d["situacao"], "ok")
        self.assertEqual(d["segundos"], 1)

    def test_sem_dados(self):
        self.assertEqual(rodar([])["diag"]["situacao"], "sem-dados")


if __name__ == "__main__":
    unittest.main()

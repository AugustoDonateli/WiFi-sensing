"""Testes do ferramentas/sessao.py (a ordem do protocolo e o descarte sem apagar)."""

import json
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import sessao  # noqa: E402


class TestSessao(unittest.TestCase):
    def test_sequencia_do_protocolo(self):
        s = sessao.SEQUENCIA
        self.assertEqual(s[:2], [("vazio", 60), ("vazio", 60)])   # calibrar no início
        self.assertEqual(s[-1], ("vazio", 60))                    # mostra se algo mudou no fim
        meio = s[2:-1]
        self.assertEqual(Counter(r for r, _ in meio), {"vazio": 5, "andando": 5, "parado": 5})
        self.assertTrue(all(d == 30 for _, d in meio))
        self.assertTrue(all(a != b for (a, _), (b, _) in zip(meio, meio[1:])))   # nunca duas iguais seguidas

    def test_comando_sem_participante_no_vazio(self):
        class A:
            porta, sessao, espera, distancia, parede, participante, obs = "COM9", "S1", 10, "1.5", "nao", "P1", "casa"
        c = sessao.comando(A, "vazio", 60)
        self.assertEqual(c[c.index("--participante") + 1], "-")
        c = sessao.comando(A, "andando", 30)
        self.assertEqual(c[c.index("--participante") + 1], "P1")
        self.assertEqual(c[c.index("--duracao") + 1], "30")

    def test_marcar_descartada_nao_apaga(self):
        with tempfile.TemporaryDirectory() as pasta:
            pasta = Path(pasta)
            js = pasta / "x_andando.json"
            js.write_text(json.dumps({"arquivo": "x_andando.csv", "obs": "casa"}), encoding="utf-8")
            reg = pasta / "registro.csv"
            reg.write_text("arquivo,sessao,obs\nw_vazio.csv,S1,casa\nx_andando.csv,S1,casa\n", encoding="utf-8")
            sessao.marcar_descartada(js, "alguém entrou", registro=reg)
            meta = json.loads(js.read_text(encoding="utf-8"))
            linhas = reg.read_text(encoding="utf-8").splitlines()
        self.assertTrue(meta["descartada"])
        self.assertEqual(meta["obs"], "casa | DESCARTADA: alguém entrou")
        self.assertEqual(linhas[1], "w_vazio.csv,S1,casa")
        self.assertEqual(linhas[2], "x_andando.csv,S1,casa | DESCARTADA: alguém entrou")


if __name__ == "__main__":
    unittest.main()

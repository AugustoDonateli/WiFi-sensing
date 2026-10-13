"""Testes de conjunto.py, avaliar.py, classificar.py e poster.py com coletas INVENTADAS.

Os números destes testes não dizem nada sobre o projeto: só mostram que o código funciona
quando a diferença entre as classes é óbvia.
"""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import conjunto  # noqa: E402
import sintetico  # noqa: E402

FERRAMENTAS = Path(__file__).resolve().parent.parent


def precisa(modulo):
    try:
        __import__(modulo)
        return False
    except ImportError:
        return True


class TestConjunto(unittest.TestCase):
    def test_divide_impares_e_pares(self):
        coletas = [{"sessao": s, "rotulo": "vazio"} for s in ("S1", "S2", "S3", "S4")]
        aj, te, s_aj, s_te = conjunto.dividir(coletas)
        self.assertEqual((s_aj, s_te), (["S1", "S3"], ["S2", "S4"]))
        self.assertEqual(len(aj) + len(te), 4)

    def test_mesma_sessao_nos_dois_lados_e_erro(self):
        with self.assertRaises(ValueError):
            conjunto.dividir([{"sessao": "S1"}], ajuste=["S1"], teste=["S1"])

    def test_listar_le_sessao_do_json(self):
        with tempfile.TemporaryDirectory() as pasta:
            sintetico.gravar_coleta(pasta, "a", "vazio", "S3", 2, sintetico.parado)
            (Path(pasta) / "sem_json.csv").write_text("x\n")
            coletas = conjunto.listar(pasta)
        self.assertEqual([(c["rotulo"], c["sessao"]) for c in coletas], [("vazio", "S3")])


def montar_sessoes(pasta, por_rotulo=1):
    for sessao, base in (("S1", 0), ("S2", 100)):
        for j in range(por_rotulo):
            sintetico.gravar_coleta(pasta, f"{sessao}_vazio_{j}", "vazio", sessao, 8, sintetico.parado, semente=base + j)
            sintetico.gravar_coleta(pasta, f"{sessao}_andando_{j}", "andando", sessao, 8, sintetico.andando, semente=base + 50 + j)


@unittest.skipIf(precisa("numpy"), "numpy não instalado")
class TestAvaliar(unittest.TestCase):
    def test_separa_vazio_de_andando(self):
        import avaliar

        with tempfile.TemporaryDirectory() as pasta:
            montar_sessoes(pasta)
            r = avaliar.avaliar(conjunto.listar(pasta))
        self.assertEqual((r["sessoes_ajuste"], r["sessoes_teste"]), (["S1"], ["S2"]))
        self.assertEqual(r["coletas_calib"], 1)
        self.assertEqual(r["coletas"], {"vp": 1, "fp": 0, "fn": 0, "vn": 1})
        self.assertEqual(r["janelas"]["fp"], 0)
        texto = avaliar.relatorio(r, simulado=True)
        self.assertIn("ATENÇÃO", texto)
        self.assertIn("Por coleta", texto)

    def test_sem_vazio_no_ajuste_avisa(self):
        import avaliar

        with tempfile.TemporaryDirectory() as pasta:
            sintetico.gravar_coleta(pasta, "a", "andando", "S1", 3, sintetico.andando)
            sintetico.gravar_coleta(pasta, "b", "vazio", "S2", 3, sintetico.parado)
            with self.assertRaises(SystemExit):
                avaliar.avaliar(conjunto.listar(pasta))


@unittest.skipIf(precisa("numpy") or precisa("sklearn"), "numpy ou scikit-learn não instalados")
class TestClassificar(unittest.TestCase):
    def test_treina_em_s1_e_mede_em_s2(self):
        import classificar

        with tempfile.TemporaryDirectory() as pasta:
            montar_sessoes(pasta, por_rotulo=2)
            r = classificar.treinar_e_medir(conjunto.listar(pasta))
        self.assertEqual((r["s_aj"], r["s_te"]), (["S1"], ["S2"]))
        self.assertEqual(len(r["v_col"]), 4)
        self.assertTrue((r["v_col"] == r["p_col"]).all())
        self.assertAlmostEqual(r["chute"], 0.5, delta=0.1)
        texto = classificar.relatorio(r, simulado=True)
        self.assertIn("ATENÇÃO", texto)
        self.assertIn("chute", texto)


@unittest.skipIf(precisa("numpy") or precisa("matplotlib"), "numpy ou matplotlib não instalados")
class TestPoster(unittest.TestCase):
    def test_gera_pdf_e_png(self):
        with tempfile.TemporaryDirectory() as pasta:
            a = sintetico.gravar_coleta(pasta, "vazio", "vazio", "S1", 7, sintetico.parado)
            b = sintetico.gravar_coleta(pasta, "andando", "andando", "S1", 7, sintetico.andando, semente=1)
            saida = Path(pasta) / "poster"
            r = subprocess.run([sys.executable, str(FERRAMENTAS / "poster.py"), str(a), str(b),
                                "--titulos", "Vazio", "Andando", "--saida", str(saida)],
                               capture_output=True, text=True, timeout=120)
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertGreater(saida.with_suffix(".png").stat().st_size, 10000)
            self.assertGreater(saida.with_suffix(".pdf").stat().st_size, 1000)


if __name__ == "__main__":
    unittest.main()

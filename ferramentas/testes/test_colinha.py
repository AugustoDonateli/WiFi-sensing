"""A colinha impressa (ferramentas/colinha.py) sai do roteiro com todas as cenas e as perguntas.

    python -m unittest discover -s ferramentas/testes -v
"""

import shutil
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import colinha  # noqa: E402


@unittest.skipUnless(shutil.which("node"), "precisa do Node.js")
class TestColinha(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.R = colinha.ler_roteiro()
        cls.texto = colinha.gerar(cls.R)

    def test_todas_as_cenas_na_ordem(self):
        pos = [self.texto.index(colinha.sem_marcas(c["titulo"])) for c in self.R["cenas"]]
        self.assertEqual(pos, sorted(pos))

    def test_falas_pontes_e_perguntas(self):
        for c in self.R["cenas"]:
            self.assertIn(c["fala"], self.texto)
            if c.get("ponte"):
                self.assertIn(c["ponte"], self.texto)
        for q in self.R["perguntasGerais"]:
            self.assertIn(q["p"], self.texto)

    def test_sem_asteriscos_de_marcacao(self):
        for c in self.R["cenas"]:
            if "*" in c["titulo"]:
                self.assertNotIn(c["titulo"], self.texto)
                self.assertIn(colinha.sem_marcas(c["titulo"]), self.texto)

    def test_arquivo_gerado_esta_em_dia(self):
        # a colinha do repositório tem que ser a gerada a partir do roteiro atual
        self.assertEqual((Path(colinha.SAIDA)).read_text(encoding="utf-8"), self.texto)


if __name__ == "__main__":
    unittest.main()

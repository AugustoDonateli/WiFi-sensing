"""Exercita o contrato público dos comandos, inclusive recusas de uso indevido."""

from contextlib import redirect_stdout, redirect_stderr
import io
import json
from pathlib import Path
import tempfile
import unittest

from ferramentas.pose.__main__ import main
from ferramentas.pose.data import load_bundle, sha256
from ferramentas.pose.labels import clock_fit
from fixtures import recording


class TestCLI(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)

    def test_prepare_rejects_overwrite_and_training_without_labels(self):
        raw = recording(self.folder/"raw")
        out = self.folder/"prepared"
        args = ["preparar",str(raw),"--saida",str(out)]
        with redirect_stdout(io.StringIO()):
            main(args)
        bundle = out/(raw.stem+".npz")
        self.assertFalse(load_bundle(bundle)["label_mask"].any())
        self.assertEqual(json.loads((out/"resumo.json").read_text(encoding="utf-8"))[0]
                         ["window_quality"]["labeled_and_accepted"],0)
        before = sha256(bundle)
        with redirect_stderr(io.StringIO()) as errors, self.assertRaises(SystemExit) as error:
            main(args)
        self.assertEqual(error.exception.code,2)
        self.assertIn("já existe",errors.getvalue())
        self.assertEqual(before,sha256(bundle))
        checkpoint = self.folder/"invalid.pt"
        with redirect_stderr(io.StringIO()) as errors, self.assertRaises(SystemExit) as error:
            main(["treinar","--treino",str(bundle),"--validacao",str(bundle),"--saida",str(checkpoint)])
        self.assertEqual(error.exception.code,2)
        self.assertIn("Falta gabarito",errors.getvalue())
        self.assertFalse(checkpoint.exists())

    def test_template_requires_measured_synchronization(self):
        out = self.folder/"template"
        with redirect_stdout(io.StringIO()):
            main(["modelo-gabarito","--saida",str(out)])
        spec = json.loads((out/"sincronizacao.json").read_text(encoding="utf-8"))
        with self.assertRaises(ValueError):
            clock_fit(spec)
        self.assertEqual(len((out/"gabarito.csv").read_text().splitlines()),1)


if __name__ == "__main__":
    unittest.main()

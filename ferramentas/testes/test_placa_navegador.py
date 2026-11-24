"""Tela + Placa B de mentira (firmware v2) no Chromium: diagnóstico, varredura e troca de canal.

Precisa do Node.js com o Playwright e o Chromium. Sem eles, o teste é pulado.
    python -m unittest discover -s ferramentas/testes -v
"""

import json
import os
import shutil
import subprocess
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "navegador_placa.js"
NODE = shutil.which("node")


def ambiente():
    env = dict(os.environ)
    npm = shutil.which("npm")
    if npm:
        r = subprocess.run([npm, "root", "-g"], capture_output=True, text=True)
        if r.returncode == 0:
            env["NODE_PATH"] = r.stdout.strip()
    return env


def tem_playwright():
    if not NODE:
        return False
    r = subprocess.run([NODE, "-e", "require('playwright')"], capture_output=True, env=ambiente())
    return r.returncode == 0


@unittest.skipUnless(tem_playwright(), "Node.js com Playwright não encontrado")
class TestTelaComPlaca(unittest.TestCase):
    def test_fluxo_completo(self):
        r = subprocess.run([NODE, str(SCRIPT)], capture_output=True, text=True, timeout=180, env=ambiente())
        linhas = [l for l in r.stdout.splitlines() if l.startswith("{")]
        self.assertTrue(linhas, r.stderr or r.stdout)
        res = json.loads(linhas[-1])
        self.assertEqual(res["falhas"], [], res)


if __name__ == "__main__":
    unittest.main()

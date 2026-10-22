"""Testes das ferramentas sem placa. Rodar a partir da raiz do repositório:

    python -m unittest discover -s ferramentas/testes -v

A linha LINHA_OFICIAL é o exemplo do README oficial do ESP-CSI (ESP32). As outras linhas
são geradas aqui só para testar o código: NÃO são medições.
"""

import io
import random
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from csi_formato import LinhaInvalida, ler_linha  # noqa: E402
from capturar import capturar  # noqa: E402

LINHA_OFICIAL = (
    'CSI_DATA,0,94:d9:b3:80:8c:81,-30,11,1,6,1,0,1,0,1,0,0,-93,0,13,2,2751923,0,67,0,128,1,'
    '"[67,48,4,0,0,0,0,0,0,0,5,0,20,1,20,1,19,0,17,1,16,2,15,2,14,1,12,0,12,-1,12,-3,12,-4,'
    '13,-6,15,-7,16,-8,16,-8,16,-8,16,-6,15,-5,15,-4,14,-4,13,-4,12,-4,11,-4,10,-4,9,-5,8,-6,'
    '4,-4,8,-9,9,-10,9,-10,10,-11,11,-10,11,-10,12,-9,11,-8,11,-7,10,-6,9,-6,7,-6,6,-7,5,-7,'
    '5,-8,5,-9,5,-10,5,-11,5,-11,6,-11,7,-11,8,-11,9,-10,9,-9,8,-8,8,-7,1,-2,0,0,0,0,0,0,0,0]"'
)


def linha_sintetica(id_pacote, len_=128, ruido=0, rng=random.Random(0)):
    """Linha no formato do firmware com valores inventados (apenas para teste de código)."""
    valores = [rng.randint(-20, 20) + rng.randint(-ruido, ruido) for _ in range(len_)]
    valores[4:10] = [0] * 6  # subportadoras sempre nulas, como nas bordas reais
    dados = ",".join(str(v) for v in valores)
    return (f'CSI_DATA,{id_pacote},1a:00:00:00:00:00,-40,11,1,0,1,0,1,0,0,0,0,-95,0,11,2,'
            f'{1000 * id_pacote},0,30,1,{len_},0,"[{dados}]"')


class TestFormato(unittest.TestCase):
    def test_linha_oficial(self):
        r = ler_linha(LINHA_OFICIAL)
        self.assertEqual((r.id, r.rssi, r.channel, r.len, r.first_word), (0, -30, 13, 128, 1))
        self.assertEqual(r.mac, "94:d9:b3:80:8c:81")
        pares = r.pares()
        self.assertEqual(len(pares), 64)
        self.assertIsNone(pares[0])  # first_word = 1 invalida os 2 primeiros pares
        self.assertIsNone(pares[1])
        self.assertEqual(pares[6], (20, 1))
        self.assertAlmostEqual(r.amplitudes()[6], 20.025, places=3)
        self.assertEqual(r.segmentos(), {"lltf": (0, 64)})

    def test_linhas_que_nao_sao_csi(self):
        self.assertIsNone(ler_linha("I (523) csi_recv: ================ CSI RECV ================"))
        self.assertIsNone(ler_linha("type,id,mac,rssi,rate,sig_mode,mcs,bandwidth,data"))
        self.assertIsNone(ler_linha("\x00\xff lixo do boot"))

    def test_linha_cortada(self):
        with self.assertRaises(LinhaInvalida):
            ler_linha(LINHA_OFICIAL[:200])

    def test_len_diferente_da_lista(self):
        with self.assertRaises(LinhaInvalida):
            ler_linha(LINHA_OFICIAL.replace(",0,128,1,", ",0,130,1,"))

    def test_segmentos_384(self):
        r = ler_linha(linha_sintetica(1, len_=384))
        self.assertEqual(r.segmentos(), {"lltf": (0, 64), "ht_ltf": (64, 192)})
        self.assertEqual(len(r.amplitudes()), 192)


class PortaFalsa:
    """Imita a porta serial: devolve linhas em bytes e avança um relógio falso."""

    def __init__(self, linhas, relogio):
        self.linhas = [l.encode() + b"\r\n" for l in linhas]
        self.relogio = relogio

    def readline(self):
        self.relogio.t += 0.01
        return self.linhas.pop(0) if self.linhas else b""


class RelogioFalso:
    t = 0.0

    def __call__(self):
        return self.t


class TestCaptura(unittest.TestCase):
    def test_grava_validas_e_conta_perdas(self):
        relogio = RelogioFalso()
        linhas = (
            ["\x1b[0;32mI (31) boot: ESP-IDF v5.5.5", "type,id,mac,...,data"]
            + [linha_sintetica(i) for i in (0, 1, 2, 4, 5)]  # id 3 "perdido"
            + [LINHA_OFICIAL[:150]]  # cortada
        )
        saida = io.StringIO()
        stats = capturar(PortaFalsa(linhas, relogio), saida, duracao=1.0, relogio=relogio, mostrar=lambda *_: None)
        self.assertEqual(stats["pacotes_validos"], 5)
        self.assertEqual(stats["pacotes_perdidos"], 1)
        self.assertEqual(stats["linhas_invalidas"], 1)
        conteudo = saida.getvalue().splitlines()
        self.assertTrue(conteudo[0].startswith("pc_tempo_s,type,id,mac"))
        self.assertEqual(len(conteudo), 6)

    def test_analise_le_o_arquivo_gravado(self):
        try:
            from analise import carregar, oscilacao
        except ImportError:
            self.skipTest("numpy não instalado")
        relogio = RelogioFalso()
        linhas = [linha_sintetica(i, ruido=3) for i in range(300)]
        with tempfile.TemporaryDirectory() as pasta:
            arq = Path(pasta) / "teste.csv"
            with open(arq, "w", newline="", encoding="utf-8") as f:
                capturar(PortaFalsa(linhas, relogio), f, duracao=10, relogio=relogio, mostrar=lambda *_: None)
            dados = carregar(arq)
        self.assertEqual(dados["amp"].shape[0], 300)
        self.assertEqual(dados["amp"].shape[1], 64 - 3)  # 3 subportadoras sempre nulas removidas
        self.assertEqual(dados["amp_completa"].shape, (300, 64))
        tempos, valores = oscilacao(dados)
        # Uma medida a cada 0,2 s, a primeira quando já existe uma janela inteira de pacotes.
        import detector
        duracao = dados["t"][-1] - dados["t"][0]
        self.assertEqual(len(tempos), int((duracao - detector.JANELA_S) / 0.2 + 1e-9) + 1)
        self.assertAlmostEqual(tempos[0] - dados["t"][0], detector.JANELA_S)
        self.assertFalse(any(v != v for v in valores))  # nenhum NaN: todas as janelas têm pacotes


if __name__ == "__main__":
    unittest.main()

"""Leitura das linhas CSI_DATA impressas pelo exemplo oficial csi_recv (ESP32 clássico).

Só usa a biblioteca padrão do Python, para rodar também no Python que vem com o ESP-IDF.

Formato definido em esp-csi/examples/get-started/csi_recv/main/app_main.c (ramo do ESP32):
    type,id,mac,rssi,rate,sig_mode,mcs,bandwidth,smoothing,not_sounding,aggregation,stbc,
    fec_coding,sgi,noise_floor,ampdu_cnt,channel,secondary_channel,local_timestamp,ant,
    sig_len,rx_state,len,first_word,data

A lista `data` traz, para cada subportadora, a parte imaginária e depois a parte real.
"""

import csv
from dataclasses import dataclass, field

COLUNAS = [
    "type", "id", "mac", "rssi", "rate", "sig_mode", "mcs", "bandwidth", "smoothing",
    "not_sounding", "aggregation", "stbc", "fec_coding", "sgi", "noise_floor", "ampdu_cnt",
    "channel", "secondary_channel", "local_timestamp", "ant", "sig_len", "rx_state",
    "len", "first_word", "data",
]

# Colunas numéricas inteiras (todas menos type, mac e data).
_INTEIRAS = [c for c in COLUNAS if c not in ("type", "mac", "data")]

# Divisão da lista em blocos (LTFs), pela tabela oficial do guia de Wi-Fi do ESP-IDF
# para o ESP32 (canal secundário "below", que é o caso do firmware no canal 11).
# Valores em número de subportadoras (pares im/re). Confirmar com a primeira captura real.
_SEGMENTOS_POR_LEN = {
    128: {"lltf": (0, 64)},
    256: {"lltf": (0, 64), "ht_ltf": (64, 128)},
    384: {"lltf": (0, 64), "ht_ltf": (64, 192)},
}


class LinhaInvalida(ValueError):
    """A linha começa com CSI_DATA mas veio cortada ou com campos errados."""


@dataclass
class RegistroCSI:
    id: int
    mac: str
    rssi: int
    channel: int
    secondary_channel: int
    local_timestamp: int
    len: int
    first_word: int
    valores: list = field(repr=False)
    extras: dict = field(default_factory=dict, repr=False)

    def pares(self):
        """Lista de (imag, real) por subportadora. Pares inválidos viram None."""
        pares = [(self.valores[i], self.valores[i + 1]) for i in range(0, len(self.valores) - 1, 2)]
        if self.first_word:
            # Os 4 primeiros números (2 pares) são inválidos por limitação do hardware.
            pares[0] = None
            pares[1] = None
        return pares

    def amplitudes(self):
        """Amplitude de cada subportadora: raiz de (im² + re²). None onde o par é inválido."""
        return [None if p is None else (p[0] ** 2 + p[1] ** 2) ** 0.5 for p in self.pares()]

    def segmentos(self):
        """Dicionário nome -> (início, fim) em subportadoras, ou {'tudo': ...} se len for desconhecido."""
        return _SEGMENTOS_POR_LEN.get(self.len, {"tudo": (0, self.len // 2)})


def e_linha_csi(texto):
    return texto.startswith("CSI_DATA,")


def ler_linha(texto):
    """Converte uma linha de texto em RegistroCSI.

    Retorna None se a linha não for de CSI (logs, cabeçalho, lixo do boot).
    Lança LinhaInvalida se for CSI mas estiver incompleta ou inconsistente.
    """
    texto = texto.strip()
    if not e_linha_csi(texto):
        return None
    return ler_campos(next(csv.reader([texto])))


def ler_campos(campos):
    """Mesmo que ler_linha, mas recebe a linha já separada em campos (como o csv.reader devolve)."""
    if not campos or campos[0] != "CSI_DATA":
        raise LinhaInvalida("não começa com CSI_DATA")
    if len(campos) != len(COLUNAS):
        raise LinhaInvalida(f"esperava {len(COLUNAS)} campos, veio {len(campos)}")

    bruto = dict(zip(COLUNAS, campos))
    try:
        numeros = {c: int(bruto[c]) for c in _INTEIRAS}
    except ValueError as erro:
        raise LinhaInvalida(f"campo numérico inválido: {erro}") from None

    data = bruto["data"].strip()
    if not (data.startswith("[") and data.endswith("]")):
        raise LinhaInvalida("campo data não está entre colchetes")
    try:
        valores = [int(v) for v in data[1:-1].split(",") if v.strip()]
    except ValueError:
        raise LinhaInvalida("campo data tem valor não numérico") from None
    if len(valores) != numeros["len"]:
        raise LinhaInvalida(f"len={numeros['len']} mas data tem {len(valores)} valores")

    principais = ("id", "rssi", "channel", "secondary_channel", "local_timestamp", "len", "first_word")
    return RegistroCSI(
        mac=bruto["mac"],
        valores=valores,
        extras={c: v for c, v in numeros.items() if c not in principais},
        **{c: numeros[c] for c in principais},
    )

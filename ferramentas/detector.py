"""Detector de movimento: a mesma regra da tela de demonstração (demo/nucleo.js).

As duas versões precisam dar o mesmo resultado para os mesmos dados. O teste
ferramentas/testes/test_nucleo_js.py confere isso rodando as duas.

Regra:
  1. A cada PASSO_S segundos, pega os pacotes do último JANELA_S segundo.
  2. Cada pacote é levado ao volume médio da janela (tira o efeito do ganho automático).
     Oscilação = desvio padrão da amplitude de cada subportadora nessa janela,
     média entre as subportadoras úteis (média >= 0,5; as nulas ficam de fora).
     As subportadoras 0 e 1 são sempre ignoradas, porque a Espressif avisa que
     os 4 primeiros bytes do CSI podem vir inválidos (campo first_word).
  3. Limiar = média + K_DESVIOS desvios da oscilação com a zona vazia
     (no mínimo FATOR_MIN vezes a média).
  4. "Movimento" depois de CONFIRMA_LIGA medições seguidas acima do limiar;
     volta a "parado" depois de CONFIRMA_DESLIGA seguidas abaixo.

Uso:
    python ferramentas/detector.py dados/brutos/ARQUIVO.csv --limiar 0.36
"""

import argparse

import numpy as np

JANELA_S = 2.0  # 2 s e mínimo de 6 pacotes: funciona com 10 a 20 pacotes/s (feira, 22/10); igual ao demo/nucleo.js
PASSO_S = 0.2
CONFIRMA_LIGA = 3
CONFIRMA_DESLIGA = 5
K_DESVIOS = 3.0
FATOR_MIN = 1.3
MIN_PACOTES = 6
IGNORAR = (0, 1)


def oscilacao_janela(amps):
    """amps: matriz (pacotes x subportadoras). Devolve NaN se houver poucos pacotes.

    Antes de medir, cada pacote é levado ao volume médio da janela (normalizar_volume).
    """
    if amps.shape[0] < MIN_PACOTES:
        return float("nan")
    a = np.array(amps, dtype=float)
    a[:, list(IGNORAR)] = 0.0
    a = normalizar_volume(a)
    if a.shape[0] < MIN_PACOTES:
        return float("nan")
    medias = a.mean(axis=0)
    uteis = medias >= 0.5
    if not uteis.any():
        return float("nan")
    return float(a[:, uteis].std(axis=0).mean())


def normalizar_volume(a):
    """Leva cada pacote (linha) ao volume médio da janela; tira os pacotes com volume zero.

    O ganho automático da placa B sobe e desce o volume de todas as subportadoras de uma vez,
    pacote a pacote. Isso não é movimento, mas aparecia como oscilação. No ESP32 o exemplo
    oficial (csi_recv) não corrige o ganho. Volume = amplitude média do pacote, com as
    subportadoras ignoradas valendo zero. Testado com as coletas S0 de 15/10/2026.
    """
    vol = a.mean(axis=1)
    a = a[vol > 0]
    vol = vol[vol > 0]
    if len(vol) == 0:
        return a
    return a * (vol.mean() / vol)[:, None]


def serie_oscilacao(t, amps, janela=JANELA_S, passo=PASSO_S):
    """Oscilação medida a cada `passo` segundos, olhando o último `janela` segundo.

    Devolve (tempos, valores). A primeira medida sai quando já existe uma janela inteira.
    """
    t = np.asarray(t, dtype=float)
    if len(t) == 0:
        return np.array([]), np.array([])
    # Conta feita igual ao nucleo.js (início + i * passo). O np.arange com passo fracionário
    # arredonda diferente e mudava a janela de um pacote que caía bem na borda.
    inicio = t[0] + janela
    n = max(0, int(np.ceil((t[-1] + 1e-9 - inicio) / passo)))
    tempos = inicio + np.arange(n) * passo
    valores = np.empty(len(tempos))
    for i, fim in enumerate(tempos):
        sel = (t >= fim - janela) & (t <= fim)
        valores[i] = oscilacao_janela(amps[sel])
    return tempos, valores


def limiar_de_calibracao(valores):
    v = np.asarray(valores, dtype=float)
    v = v[~np.isnan(v)]
    if len(v) < 5:
        raise ValueError("poucas medidas para calibrar (mínimo 5)")
    m, dp = float(v.mean()), float(v.std())
    return max(m + K_DESVIOS * dp, m * FATOR_MIN)


class Detector:
    def __init__(self, limiar, liga=CONFIRMA_LIGA, desliga=CONFIRMA_DESLIGA):
        self.limiar, self.liga, self.desliga = limiar, liga, desliga
        self.detectado, self.acima, self.abaixo = False, 0, 0

    def passo(self, v):
        if np.isnan(v):
            return self.detectado
        if v > self.limiar:
            self.acima, self.abaixo = self.acima + 1, 0
        else:
            self.abaixo, self.acima = self.abaixo + 1, 0
        if not self.detectado and self.acima >= self.liga:
            self.detectado = True
        elif self.detectado and self.abaixo >= self.desliga:
            self.detectado = False
        return self.detectado


def detectar(valores, limiar):
    d = Detector(limiar)
    return np.array([d.passo(v) for v in valores], dtype=bool)


def main():
    from analise import carregar

    p = argparse.ArgumentParser(description="Roda o detector numa coleta gravada.")
    p.add_argument("arquivo")
    p.add_argument("--limiar", type=float, required=True)
    args = p.parse_args()
    dados = carregar(args.arquivo, remover_nulas=False)
    tempos, valores = serie_oscilacao(dados["t"], dados["amp_completa"])
    estados = detectar(valores, args.limiar)
    ok = ~np.isnan(valores)
    print(f"{args.arquivo}: {ok.sum()} medidas, {estados[ok].mean() * 100:.0f}% marcadas como movimento "
          f"(limiar {args.limiar:g}, oscilação média {np.nanmean(valores):.3f})")


if __name__ == "__main__":
    main()

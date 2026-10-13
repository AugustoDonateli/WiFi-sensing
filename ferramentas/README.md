# Ferramentas

| Arquivo | Para quê | Precisa de |
|---|---|---|
| `capturar.py` | Grava uma coleta da Placa B com rótulo e anotações | pyserial (já vem no ESP-IDF) |
| `plotar.py` | Gráficos de uma ou mais coletas, lado a lado | numpy, matplotlib |
| `analise.py` | Funções usadas pelo `plotar.py` (carregar, oscilação) | numpy |
| `csi_formato.py` | Lê as linhas `CSI_DATA` do firmware | nada além do Python |
| `testes/` | Testes que rodam sem placa | nada além do Python (numpy opcional) |

## Capturar (no "ESP-IDF PowerShell", na pasta do repositório)

```
python ferramentas/capturar.py --porta COM3 --rotulo vazio --duracao 30 --distancia 2 --participante -
python ferramentas/capturar.py --porta COM3 --rotulo andando --duracao 30 --distancia 2 --participante P1
```

- Feche o `idf.py monitor` antes.
- Há uma contagem regressiva de 5 s (`--espera`) para a pessoa se posicionar.
- Cada coleta gera `dados/brutos/AAAAMMDD-HHMMSS_rotulo.csv`, um `.json` com as condições e uma linha em `experimentos/registro_coletas.csv`.
- `Ctrl+C` interrompe; a coleta fica marcada como "interrompida".

## Gráficos (num Python com numpy e matplotlib)

```
python -m pip install -r ferramentas/requirements.txt
python ferramentas/plotar.py dados/brutos/ARQUIVO_vazio.csv dados/brutos/ARQUIVO_andando.csv --mostrar
```

A imagem fica em `dados/graficos/`.

## Testes

```
python -m unittest discover -s ferramentas/testes -v
```

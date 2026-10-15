# Ferramentas

| Arquivo | Para quê | Precisa de |
|---|---|---|
| `capturar.py` | Grava uma coleta da Placa B com sessão, rótulo e anotações | pyserial (já vem no ESP-IDF) |
| `sessao.py` | Guia uma sessão inteira na ordem do protocolo (18 coletas), com refazer e descarte | pyserial |
| `plotar.py` | Gráficos de uma ou mais coletas, lado a lado | numpy, matplotlib |
| `detector.py` | A regra do detector de movimento (a mesma da tela, em `demo/nucleo.js`) | numpy |
| `avaliar.py` | Mede os acertos do detector: limiar com as sessões de ajuste, teste nas outras | numpy |
| `classificar.py` | Random Forest para separar vazio / parado / andando etc., treino e teste por sessão | numpy, scikit-learn |
| `poster.py` | Pôster "antes e depois" com coletas reais, no mesmo estilo da tela (PDF + PNG) | numpy, matplotlib |
| `analise.py` | Carrega as coletas (usado pelos outros) | numpy |
| `conjunto.py` | Lista as coletas e separa as sessões de ajuste e de teste | nada além do Python |
| `csi_formato.py` | Lê as linhas `CSI_DATA` do firmware | nada além do Python |
| `testes/` | Testes que rodam sem placa | nada além do Python (o resto é opcional) |
| `laboratorio-escuta/` | Página para comparar sons do modo escuta (escolhido: Batimento) | um navegador |
| `laboratorio-passagens/` | Página para comparar o som das trocas de tela, com as passagens de verdade | um navegador |

## Capturar (no "ESP-IDF PowerShell", na pasta do repositório)

```
python ferramentas/capturar.py --porta COM3 --sessao S1 --rotulo vazio --duracao 30 --distancia 2 --participante -
python ferramentas/capturar.py --porta COM3 --sessao S1 --rotulo andando --duracao 30 --distancia 2 --participante P1
```

- Feche o `idf.py monitor` antes.
- `--sessao` é obrigatório: S1, S2, S3... Uma sessão é um bloco de coletas feito de uma vez, no mesmo lugar (ver `experimentos/protocolo.md`).
- Há uma contagem regressiva de 5 s (`--espera`) para a pessoa se posicionar.
- Cada coleta gera `dados/brutos/AAAAMMDD-HHMMSS_rotulo.csv`, um `.json` com as condições e uma linha em `experimentos/registro_coletas.csv`.
- `Ctrl+C` interrompe; a coleta fica marcada como "interrompida".

## Instalar o resto (uma vez, num Python normal)

```
python -m pip install -r ferramentas/requirements.txt
```

## Gráficos

```
python ferramentas/plotar.py dados/brutos/ARQUIVO_vazio.csv dados/brutos/ARQUIVO_andando.csv --mostrar
```

A imagem fica em `dados/graficos/`.

## Medir o detector

```
python ferramentas/avaliar.py
python ferramentas/avaliar.py --ajuste S1 S3 --teste S2 S4
```

- Sem opções: sessões ímpares ajustam o limiar, sessões pares testam.
- O limiar sai só das coletas `vazio` do ajuste. Nenhuma coleta de teste é usada para escolher nada.
- O relatório (`resultados/avaliacao-*.md`) traz o resultado por medição e por coleta. **Cite o por coleta:** as medições vizinhas se sobrepõem.

## Classificador (depois que o detector estiver funcionando)

```
python ferramentas/classificar.py
python ferramentas/classificar.py --rotulos vazio parado andando
```

- Mesma separação por sessão. O relatório (`resultados/classificador-*.md`) compara com o "chute" de sempre responder a classe mais comum. Se o modelo não ganhar do chute com folga, ele não está aprendendo nada útil.
- Com poucas coletas por classe (menos de 5 no teste), o relatório avisa que os números ainda variam muito.

## Pôster antes e depois

```
python ferramentas/poster.py dados/brutos/ARQ_vazio.csv dados/brutos/ARQ_andando.csv --titulos "Sala vazia" "Pessoa andando"
```

- Escolha coletas da **mesma sessão**, para só uma coisa mudar entre os painéis.
- `--inicio 12` desenha a partir do segundo 12 da coleta (padrão: o meio).
- Sai `dados/graficos/poster-antes-depois.pdf` (para imprimir) e `.png`.

## Testes

```
python -m unittest discover -s ferramentas/testes -v
```

- Rodam sem placa, com dados **inventados** (`testes/sintetico.py`). Servem para checar o código, não o projeto.
- `test_nucleo_js.py` roda a regra do detector no Python e no `demo/nucleo.js` (precisa do Node.js) e confere que as duas dão o mesmo resultado. Se alguém mudar uma e esquecer a outra, o teste falha.
- Testes que precisam de algo que não está instalado (numpy, matplotlib, scikit-learn, Node.js) são pulados, não falham.

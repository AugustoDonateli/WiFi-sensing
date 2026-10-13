# Plano do código

## Visão geral

```
Placa A (csi_send) ──Wi-Fi──> Placa B (csi_recv) ──USB 921600──> computador
                                                                  │
                     ┌────────────────────────────────────────────┤
                     │                                            │
        visualizador oficial no navegador            ferramentas/capturar.py
        (csi_viewer.html, Chrome/Edge)               grava .csv + .json + registro
        primeira olhada, ao vivo                                  │
                                                     ferramentas/plotar.py
                                                     gráficos para comparar coletas
                                                                  │
                                                     (depois) detector.py
                                                     limiar calibrado com sala vazia
                                                                  │
                                                     (depois) demo no navegador
                                                     cascata, indicador, Desafio Ninja
```

## O que existe e o que falta

| Parte | Situação | Como foi verificada |
|---|---|---|
| Firmware `csi_send` e `csi_recv` | Oficiais da Espressif, sem alteração | Compilaram com ESP-IDF v5.5.5 para `esp32` no ambiente da IA. Falta compilar no Windows e rodar nas placas. |
| `ferramentas/csi_formato.py` | Pronto | Testado com a linha de exemplo oficial do ESP-CSI e com linhas sintéticas. |
| `ferramentas/capturar.py` | Pronto | Testado com porta serial falsa enviando linhas sintéticas a ~100/s. Falta testar na placa. |
| `ferramentas/analise.py` e `plotar.py` | Prontos para uma primeira olhada | Testados com dados sintéticos (só para ver se o código roda). |
| Detector de movimento | **Não escrito de propósito** | Depende de ver dados reais primeiro. |
| Demonstração no navegador | **Não escrita** | Depois do detector. |

Nenhum resultado foi gerado. Os testes usam dados inventados apenas para checar se o código funciona.

## Decisões e motivos

1. **Firmware oficial, sem mudanças.** Menos risco: o código já foi testado pela Espressif e compila para o nosso chip.
2. **Captura só com pyserial.** O Python do ESP-IDF já tem o pyserial, então dá para capturar sem instalar nada além do ESP-IDF.
3. **Arquivo bruto + metadados.** Cada coleta grava as linhas originais do firmware (com o tempo do PC na frente), um `.json` com rótulo e condições, e uma linha na planilha `experimentos/registro_coletas.csv`. Assim sempre dá para refazer a análise do zero.
4. **Segmento LLTF por padrão nos gráficos.** Ele tem 64 subportadoras em todos os tipos de pacote da tabela oficial (len 128, 256 e 384). O segmento HT-LTF pode ser escolhido com `--segmento ht_ltf`.
5. **Medida candidata de "oscilação":** desvio padrão da amplitude em janelas de 1 s, média entre subportadoras. É simples de explicar. O exemplo oficial de detecção da Espressif (`esp-radar`) também calibra com a sala vazia e usa limiares, mas com medidas próprias (`wander` para presença, `jitter` para movimento) num código fechado. Quando houver dados reais, comparamos pelo menos duas medidas e escolhemos a que separa melhor as classes.

## Ordem de trabalho quando as placas chegarem

1. Compilar e gravar (ver `docs/erros-provaveis.md`, seções 2 a 5).
2. Abrir o visualizador oficial `csi_viewer.html` no Chrome para ver os dados ao vivo.
3. Primeira coleta curta com `capturar.py` e mandar o arquivo para conferirmos o formato real (especialmente o `len`).
4. `plotar.py` com uma coleta "vazio" e uma "andando".
5. Só então: escrever o detector com base no que os gráficos mostrarem.

## Formato esperado (a confirmar)

Pela tabela oficial do ESP-IDF, no ESP32 com canal secundário "below" e pacotes HT de 40 MHz (como o `csi_send` configura), o `len` deve ser **384**: 64 subportadoras do LLTF e 128 do HT-LTF. Outros tipos de pacote dariam 128 ou 256. Isso é uma previsão a partir da documentação; a primeira captura confirma.

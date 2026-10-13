# Plano do código

## Visão geral

```
Placa A (csi_send) ──Wi-Fi──> Placa B (csi_recv) ──USB 921600──> computador
                                                                  │
          ┌───────────────────────────────────────────────────────┤
          │                                                       │
  demo/index.html (navegador)                          ferramentas/capturar.py
  linhas, Parado/Movimento, Desafio Ninja              grava .csv + .json + registro
          │                                                       │
  demo/nucleo.js  ◄──── mesma regra, conferida ────►   ferramentas/detector.py
  (leitura + detector)   pelo test_nucleo_js.py        (leitura + detector)
                                                                  │
                                          plotar.py · avaliar.py · classificar.py · poster.py
                                          gráficos · acertos do detector · Random Forest · pôster
```

## O que existe e o que falta

| Parte | Situação | Como foi verificada |
|---|---|---|
| Firmware `csi_send` e `csi_recv` | Oficiais da Espressif, sem alteração | Compilaram com ESP-IDF v5.5.5 para `esp32` no ambiente da IA. Falta compilar no Windows e rodar nas placas. |
| `ferramentas/csi_formato.py` | Pronto | Testado com a linha de exemplo oficial do ESP-CSI e com linhas sintéticas. |
| `ferramentas/capturar.py` | Pronto | Testado com porta serial falsa enviando linhas sintéticas a ~100/s. Falta testar na placa. |
| `ferramentas/detector.py` + `demo/nucleo.js` | Prontos; constantes ainda provisórias | Uma regra só, em duas linguagens. O `test_nucleo_js.py` roda as duas com os mesmos dados e confere série, limiar e estados (e falha se alguém mudar só uma). As constantes (janela, 3 desvios, confirmações) serão revistas com dados reais. |
| `ferramentas/avaliar.py` | Pronto | Testado com sessões sintéticas. Separa ajuste e teste por sessão. |
| `ferramentas/classificar.py` | Pronto, mas **só faz sentido com dados reais** | Testado com sessões sintéticas onde a diferença é óbvia, só para ver se o código roda. Nenhum número dele vale como resultado ainda. |
| `ferramentas/poster.py` | Pronto | Testado com coletas sintéticas; o pôster ganha o aviso "DADOS SINTÉTICOS" nesse caso. |
| `ferramentas/plotar.py` | Pronto para uma primeira olhada | Testado com dados sintéticos. |
| Demonstração (`demo/index.html`) | Pronta, com simulação, gravação e leitura USB | Testada no Chromium abrindo o arquivo e servida por HTTP (como no Vercel): calibração, detecção na simulação e numa gravação sintética. Leitura USB não testada sem placa. |
| Site no Vercel | Configurado (`vercel.json`), falta o grupo fazer o primeiro deploy | Ver `docs/publicar-vercel.md`. |

Nenhum resultado foi gerado. Os testes usam dados inventados apenas para checar se o código funciona.

## Decisões e motivos

1. **Firmware oficial, sem mudanças.** Menos risco: o código já foi testado pela Espressif e compila para o nosso chip.
2. **Captura só com pyserial.** O Python do ESP-IDF já tem o pyserial, então dá para capturar sem instalar nada além do ESP-IDF.
3. **Arquivo bruto + metadados.** Cada coleta grava as linhas originais do firmware (com o tempo do PC na frente), um `.json` com sessão, rótulo e condições, e uma linha na planilha `experimentos/registro_coletas.csv`. Assim sempre dá para refazer a análise do zero.
4. **Segmento LLTF.** Ele tem 64 subportadoras em todos os tipos de pacote da tabela oficial (len 128, 256 e 384). O HT-LTF pode ser escolhido nos gráficos com `--segmento ht_ltf`.
5. **Medida de "oscilação":** desvio padrão da amplitude numa janela de 1 s, média entre as subportadoras úteis, recalculada a cada 0,2 s. É simples de explicar. O exemplo oficial de detecção da Espressif (`esp-radar`) também calibra com a sala vazia e usa limiares, mas com medidas próprias (`wander` e `jitter`) num código fechado.
6. **Uma regra só para a tela e para os números.** Antes, a tela tinha um detector e o Python outro, parecidos mas não iguais. Agora o que a tela mostra na feira é exatamente o que o `avaliar.py` mede.
7. **Separar por sessão, não por gravação.** Gravações da mesma sessão se parecem (mesmo lugar, mesma hora, mesmas redes por perto). Se uma ficar no ajuste e outra no teste, o resultado sai melhor do que é. Padrão: sessões ímpares ajustam, pares testam.
8. **Random Forest com 6 medidas simples, não rede neural.** Com poucas dezenas de coletas, um modelo pequeno é mais honesto e dá para explicar o que ele usa (o relatório mostra o peso de cada medida). Sempre comparado com o "chute" da classe mais comum.
9. **Resultado por coleta além de por medição.** As medições vizinhas se sobrepõem e se parecem; contar cada uma como independente infla os números.

## Ordem de trabalho quando as placas chegarem

1. Compilar e gravar (ver `docs/erros-provaveis.md`, seções 2 a 5).
2. Abrir o visualizador oficial `csi_viewer.html` no Chrome para ver os dados ao vivo.
3. Primeira coleta curta com `capturar.py` e mandar o arquivo para conferirmos o formato real (especialmente o `len`).
4. `plotar.py` com uma coleta "vazio" e uma "andando".
5. Revisar as constantes do detector com base no que os gráficos mostrarem (nos dois arquivos: `detector.py` e `nucleo.js`; o teste avisa se ficarem diferentes).
6. Coletas por sessão (protocolo) e `avaliar.py`. Só depois, se sobrar tempo, `classificar.py`.

## Formato esperado (a confirmar)

Pela tabela oficial do ESP-IDF, no ESP32 com canal secundário "below" e pacotes HT de 40 MHz (como o `csi_send` configura), o `len` deve ser **384**: 64 subportadoras do LLTF e 128 do HT-LTF. Outros tipos de pacote dariam 128 ou 256. Isso é uma previsão a partir da documentação; a primeira captura confirma.

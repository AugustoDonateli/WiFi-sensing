# Wave Sense — Wi-Fi Sensing com ESP32 (JACITEC 2026)

Protótipo experimental para investigar se alterações no CSI (*Channel State Information*) do Wi-Fi permitem detectar movimento humano sem câmeras. Não é um dispositivo médico.

## Status

- [ ] Inscrição na JACITEC enviada
- [ ] Placas compradas (decidido: 2× ESP32 DevKit USB-C/CP2102)
- [ ] Placas recebidas
- [ ] ESP-IDF v5.5.5 instalado no Windows (`idf.py --version` funcionando)
- [ ] Exemplos `csi_send` e `csi_recv` compilados (sem placa)
- [ ] Firmware gravado nas duas placas
- [ ] Primeira captura de CSI salva em arquivo
- [ ] Script Python lendo e plotando o CSI
- [ ] Coletas: vazio / pessoa parada / pessoa caminhando
- [ ] Detecção de movimento simples funcionando e medida
- [ ] (Opcional) Classificador, testes de distância/parede, queda simulada, interface

Só marcar um item depois de testado de verdade.

## Hardware escolhido

| Item | Qtd. | Observação |
|---|---|---|
| ESP32 DevKit "clássico" (módulo tipo WROOM-32), USB-C, ponte USB-serial CP2102 | 2 | Uma transmite (`csi_send`), outra recebe e mede o CSI (`csi_recv`). O ESP32 clássico está na lista oficial de chips suportados pelo ESP-CSI. |
| Cabo USB de **dados** com ponta USB-C | 1 (mínimo) | Serve para gravar as duas placas, uma de cada vez, e depois fica no receptor. Um segundo cabo é conveniência. |
| Carregador de celular ou power bank | 1 | Alimenta o transmissor depois de gravado (não precisa de dados). |
| Colchonete | 1 | Só na etapa de queda simulada. Emprestar. |

**Não é necessário:** roteador, sensores extras, protoboard, solda, display ou buzzer.

**Como saber se o cabo transmite dados:** ligar um celular no PC com o cabo. Se o celular mostrar a notificação de USB (opções como "Transferência de arquivos") ou aparecer no Explorador de Arquivos, o cabo tem dados. Com a placa: ela deve aparecer no Gerenciador de Dispositivos em "Portas (COM e LPT)" como "Silicon Labs CP210x ... (COMx)".

## Ambiente (Windows)

- ESP-IDF **v5.5.5**, instalador offline oficial: https://dl.espressif.com/dl/esp-idf/
- ESP-CSI oficial: https://github.com/espressif/esp-csi (exemplos em `examples/get-started`)
- A configuração dos exemplos foi gerada com ESP-IDF 5.5.0. Alvo de compilação: `esp32`.
- O receptor envia linhas `CSI_DATA,...` pela UART a 921600 baud.

## Referências

- Guia de instalação no Windows (v5.5): https://docs.espressif.com/projects/esp-idf/en/v5.5/esp32/get-started/windows-setup.html
- Exemplos get-started do ESP-CSI: https://github.com/espressif/esp-csi/tree/master/examples/get-started

# Wave Sense — Wi-Fi Sensing com ESP32 (JACITEC 2026)

Protótipo experimental para investigar se alterações no CSI (*Channel State Information*) do Wi-Fi permitem detectar movimento humano sem câmeras. Não é um dispositivo médico.

## Status

- [ ] Inscrição na JACITEC enviada
- [ ] Placas compradas / recebidas
- [ ] ESP-IDF v5.5.5 instalado no Windows (`idf.py --version` funcionando)
- [ ] Exemplos `csi_send` e `csi_recv` compilados (sem placa)
- [ ] Firmware gravado nas duas placas
- [ ] Primeira captura de CSI salva em arquivo
- [ ] Script Python lendo e plotando o CSI
- [ ] Coletas: vazio / pessoa parada / pessoa caminhando
- [ ] Detecção de movimento simples funcionando e medida
- [ ] (Opcional) Classificador, testes de distância/parede, queda simulada, interface

Só marcar um item depois de testado de verdade.

## Lista de compras

| Item | Qtd. | Obrigatório? | Observação |
|---|---|---|---|
| ESP32-C6-DevKitC-1 (módulo ESP32-C6-WROOM-1, antena na placa) | 2 (3 se der) | Sim | A 3ª é reserva. Precisa ter **duas** portas USB-C (uma delas "UART"). Evitar versões "-1U" (precisam de antena externa) e placas "Super Mini"/"Zero" (só uma USB nativa; o exemplo oficial envia o CSI pela UART). |
| Cabo USB de **dados** com ponta USB-C (A→C ou C→C, conforme o PC) | 2 | Sim | Testar antes com um celular: se o PC reconhece o celular para transferir arquivos, o cabo transmite dados. |
| Carregador USB de celular ou power bank | 1 | Já devem ter | Só para alimentar o transmissor; ele não precisa ficar ligado ao PC. |
| Colchonete | 1 | Só na etapa de queda | Emprestar. |

**Não é necessário:** roteador, sensores extras, protoboard, solda, display ou buzzer. Os exemplos oficiais usam ESP-NOW direto entre as duas placas.

**Alternativa se não houver ESP32-C6-DevKitC-1 com entrega rápida:** comprar **duas placas do mesmo modelo** entre ESP32-S3-DevKitC-1, ESP32-C3 DevKit ou ESP32 (WROOM-32) DevKit. O código do exemplo oficial tem suporte a esses chips, mas confirmar o anúncio antes de comprar.

Comprar de vendedor no Brasil com estoque e entrega em poucos dias; compras internacionais não chegam a tempo.

## Ambiente (Windows)

- ESP-IDF **v5.5.5**, instalador offline oficial: https://dl.espressif.com/dl/esp-idf/
- ESP-CSI oficial: https://github.com/espressif/esp-csi (exemplos em `examples/get-started`)
- Os exemplos exigem ESP-IDF ≥ 5.4 para o ESP32-C6, e a configuração deles foi gerada com ESP-IDF 5.5.0.
- O receptor envia linhas `CSI_DATA,...` pela UART a 921600 baud.

## Referências

- Guia de instalação no Windows (v5.5): https://docs.espressif.com/projects/esp-idf/en/v5.5/esp32c6/get-started/windows-setup.html
- Guia da placa ESP32-C6-DevKitC-1: https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32c6/esp32-c6-devkitc-1/user_guide.html
- Exemplos get-started do ESP-CSI: https://github.com/espressif/esp-csi/tree/master/examples/get-started

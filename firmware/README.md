# Proveniência do firmware das placas

Inspeção da cópia local em `C:\esp\esp-csi`, em 15/10/2026:

- Origem: [Espressif ESP-CSI](https://github.com/espressif/esp-csi).
- Commit: [`8633d67152db2808f141cc1595970aa9cf406045`](https://github.com/espressif/esp-csi/tree/8633d67152db2808f141cc1595970aa9cf406045).
- Receptora: `examples/get-started/csi_recv`, sem alterações locais rastreadas pelo Git.
- Emissora: `examples/get-started/csi_send`, única alteração rastreada: `CONFIG_SEND_FREQUENCY` de 100 para 50.
- ESP-IDF: v5.5.5; alvo `esp32`, conforme os artefatos locais de compilação.
- Dependências resolvidas da receptora: `esp_csi_gain_ctrl` 0.1.5 e `cmake_utilities` 0.5.3, conforme `dependencies.lock`.

O patch `send-50pps.patch` registra a mudança da emissora. Aplicar sobre uma cópia no commit acima, a partir da raiz do ESP-CSI, com `git apply --unidiff-zero CAMINHO_DO_PATCH` (o hunk tem contexto anterior e nenhum posterior). A validação reversa foi conferida com esse mesmo parâmetro na cópia que já tem 50/s. A instalação original foi apenas lida nesta inspeção.

`inspecao-local.json` identifica fontes, configurações e binários locais por SHA-256. Esses hashes ajudam a comparar cópias. O estado observado no computador **não comprova qual binário está atualmente gravado em cada placa**. Para futuras coletas, registrar também o hash do binário efetivamente gravado e o commit/configuração junto aos dados.

## Piloto sem peças adicionais: botão BOOT

A variante própria `csi_recv_boot` usa o botão BOOT/GPIO0 como marcador. Foi compilada para ESP32 clássico com ESP-IDF v5.5.5 em 16/10/2026. Ainda precisa ser executada e conferida nas placas físicas. A configuração de rádio parte do exemplo no commit indicado acima; esta variante não depende do componente de compensação de ganho usado em outros chips pelo exemplo upstream.

[Roteiro curto para o operador](PILOTO-BOOT.md). O pacote pré-compilado pode ser gerado na raiz do Wave Sense com `python -m firmware.empacotar_boot --build CAMINHO_DO_BUILD --saida CAMINHO_NOVO_DO_PACOTE`. O gerador não acessa portas seriais.

**Decisão do usuário, 16/10/2026:** a configuração atual das duas placas e do site é a referência estável da apresentação. Ao terminar os testes, restaurar o backup original da receptora e conferir o funcionamento habitual, mesmo se o piloto BOOT for bem-sucedido. Preservar o primeiro backup de `csi_recv`; um backup de `wave_boot` não o substitui. [Registro da decisão](../docs/decisoes.md).

- Firmware: ISR registra bordas do BOOT; callback CSI copia dados para uma fila. Uma única tarefa imprime as linhas e os contadores de descarte. Não se imprime nem se espera na interrupção ou no callback Wi-Fi.
- Aquisição: `python -m ferramentas.pose.capturar_boot --help`. Preserva CSI_DATA, relógio de rádio, horário de entrada do callback e eventos do BOOT. O computador registra também o horário após ler cada linha, para diagnóstico.
- Preparação: nas novas coletas, `read_recording` usa o relógio compartilhado `esp_timer` no início do callback CSI. O horário de rádio fica intacto no CSV e no arquivo auxiliar. Modelos distinguem as bases de tempo e não misturam automaticamente S0 com a captura BOOT.
- Alinhamento: `python -m ferramentas.pose.sincronizar_boot --help`. Exige pelo menos quatro apertos anotados por intervalos no vídeo, incerteza adicional informada e trecho útil separado da manipulação. A janela inteira de CSI precisa caber no trecho útil para virar exemplo rotulado.
- Instalação: `gravar_boot.py` lê a tabela e a partição atual, exige um aplicativo receptor reconhecido e salva backup antes de escrever somente o aplicativo. Nenhuma gravação foi executada pelo agente nesta entrega.

O relógio de hardware do rádio não é assumido igual ao relógio GPIO. Usamos explicitamente o horário de **entrada do callback** para essa versão experimental. A latência interna entre recepção física e callback continua sendo uma limitação a estudar. Registrar duas coisas no mesmo relógio não elimina atraso do driver, ISR ou câmera. A precisão do contato/clique filmado precisa ser medida; o ajuste não inventa incerteza zero e não certifica sincronização física.

Referências: [BOOT e GPIO0](https://docs.espressif.com/projects/esptool/en/latest/esp32/advanced-topics/boot-mode-selection.html), [ESP Timer / uso em ISR](https://docs.espressif.com/projects/esp-idf/en/v5.5.5/esp32/api-reference/system/esp_timer.html), [orientações para o callback CSI](https://docs.espressif.com/projects/esp-idf/en/v5.5.5/esp32/api-guides/wifi.html#wi-fi-channel-state-information).

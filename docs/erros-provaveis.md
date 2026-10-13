# Erros prováveis e como resolver

Lista feita **antes** de mexer no hardware, para não travar no dia. Cada item diz como reconhecer o problema e o que fazer. Quando acontecer um erro que não está aqui, copie a mensagem inteira e mande antes de mudar qualquer coisa.

Legenda da origem de cada item:
- **[oficial]**: está na documentação ou no código da Espressif.
- **[testado]**: reproduzido no ambiente da IA (Linux, ESP-IDF v5.5.5, alvo `esp32`).
- **[provável]**: problema comum, ainda não visto por nós.

---

## 1. Instalação do ESP-IDF (Windows)

| Sintoma | Causa | O que fazer |
|---|---|---|
| Instalador reclama do caminho ou a instalação falha no meio | Caminho com espaço, parênteses, acento ou mais de 90 caracteres **[oficial]** | Instalar em pasta curta, como `C:\Espressif`. Seu nome de usuário do Windows tem acento ou espaço? Então não use pastas dentro de `C:\Users\...`. |
| `idf.py não é reconhecido como comando` | Terminal errado **[provável]** | Abrir pelo Menu Iniciar o atalho **"ESP-IDF 5.5 PowerShell"** (ou "CMD"). O PowerShell comum não conhece o `idf.py`. |
| Windows Defender pergunta se pode permitir algo | Ferramentas novas sendo executadas **[provável]** | Permitir. Se a instalação ficar muito lenta, esperar; ela baixa e descompacta muita coisa. |

**Deu certo quando:** `idf.py --version` mostra `ESP-IDF v5.5.5`.

## 2. Primeira compilação (ainda sem placa)

| Sintoma | Causa | O que fazer |
|---|---|---|
| Erro ao baixar `espressif/esp_csi_gain_ctrl` | A primeira compilação precisa de internet para baixar componentes **[testado]** | Conectar à internet e repetir `idf.py build`. |
| Demora vários minutos | Normal na primeira vez: são cerca de 1.000 etapas **[testado]** | Esperar. As próximas compilações são bem mais rápidas. |
| 2 avisos `unused variable 'fft_gain'` e `'agc_gain'` no `csi_recv` | O controle de ganho só é usado nos chips mais novos, não no ESP32 **[testado]** | Ignorar. São avisos, não erros. |
| `set-target` apaga a pasta `build` e o `sdkconfig` | Comportamento normal **[oficial]** | Rodar `set-target` só uma vez por exemplo. |

**Deu certo quando:** a compilação termina com `Project build complete` e `csi_recv.bin binary size ... (30%) free` (assim terminou aqui no teste).

## 3. Conectar a placa

| Sintoma | Causa | O que fazer |
|---|---|---|
| A placa acende, mas nenhuma porta COM aparece no Gerenciador de Dispositivos | Cabo só de carga **[provável]** | Trocar o cabo (testar antes com o celular). |
| Aparece "Dispositivo desconhecido" ou "CP2102" com triângulo amarelo | Falta o driver da Silicon Labs **[provável]** | Instalar o driver oficial "CP210x Universal Windows Driver" do site da Silicon Labs (fazemos juntos). |
| O número da porta muda de um dia para o outro | O Windows dá números diferentes por porta USB física **[provável]** | Sempre conferir no Gerenciador de Dispositivos antes de gravar. |

**Deu certo quando:** aparece "Silicon Labs CP210x USB to UART Bridge (COMx)" em "Portas (COM e LPT)".

## 4. Gravar o firmware

| Sintoma | Causa | O que fazer |
|---|---|---|
| `Failed to connect to ESP32` ou `Wrong boot mode detected` | A placa não entrou no modo de gravação **[provável]** | Segurar o botão **BOOT**, rodar o `idf.py -p COMx flash` e soltar quando aparecer `Connecting...`. |
| `could not open port` ou "Acesso negado" | Outro programa usa a porta (monitor, Arduino IDE, outro terminal, o visualizador no navegador) **[provável]** | Fechar o outro programa. |
| Gravou a placa errada | As duas placas são iguais **[provável]** | Colar fita escrita **A** e **B** antes de começar. A = `csi_send`, B = `csi_recv`. |

## 5. Ver se está funcionando (monitor)

| Sintoma | Causa | O que fazer |
|---|---|---|
| Caracteres estranhos nas primeiras linhas do monitor | As mensagens iniciais do chip saem em outra velocidade (115200) e o monitor está a 921600 **[provável]** | Normal, ignorar. As mensagens do programa aparecem certas logo depois. |
| Placa A não mostra `wifi_channel: 11, send_frequency: 100` | Placa A sem o programa certo **[oficial: mensagem do `csi_send`]** | Regravar a A com `csi_send`. |
| Placa A mostra `ESP_ERR_ESPNOW_NO_MEM` | Canal 11 congestionado **[oficial]** | Mudar de local. Se continuar, trocar o canal no código das **duas** placas (fazemos juntos). |
| Placa B mostra `CSI RECV` mas nenhuma linha `CSI_DATA` | A Placa A está desligada, longe demais ou com o programa errado **[provável]** | Conferir a energia da A e o que o monitor dela mostra. O receptor só aceita pacotes do endereço `1a:00:00:00:00:00`, que é o da A **[oficial: código]**. |
| Texto todo embaralhado, sempre | Velocidade errada no monitor **[provável]** | Usar `idf.py -p COMx monitor` sem mudar a velocidade. O projeto já configura 921600 **[testado: sdkconfig]**. |

**Deu certo quando:** a Placa B mostra `================ CSI RECV ================`, uma linha de cabeçalho `type,id,mac,...` e depois várias linhas começando com `CSI_DATA,`. Para sair do monitor: `Ctrl` + `]`.

## 6. Captura com `ferramentas/capturar.py`

| Sintoma | Causa | O que fazer |
|---|---|---|
| `Não consegui abrir COMx` | Porta errada ou ocupada | Conferir o número e fechar o monitor. |
| `pyserial não encontrado` | Script rodado fora do "ESP-IDF PowerShell" | Rodar dentro do ESP-IDF PowerShell, que já tem o pyserial **[testado]**. |
| `! Nenhuma linha CSI_DATA ainda` | Mesmas causas da seção 5 | Ver seção 5. |
| Bem menos de 100 pacotes/s ou muitos "perdidos" | Distância, obstáculos ou canal congestionado **[provável]** | Anotar na coleta (`--obs`). Se for sempre assim, aproximar as placas ou mudar de lugar. |
| Muitas "linhas inválidas" | Computador não está lendo a porta rápido o bastante **[oficial: "element number is not equal"]** | Fechar programas pesados, usar outra porta USB. |
| `len` diferente de 128, 256 ou 384 | Tipo de pacote não previsto na tabela que usamos | O `plotar.py` avisa quantos ignorou. Mande o número, ajustamos. |

## 7. Gráficos com `ferramentas/plotar.py`

| Sintoma | Causa | O que fazer |
|---|---|---|
| `No module named 'numpy'` ou `'matplotlib'` | O Python do ESP-IDF não tem essas bibliotecas **[testado]** | Usar um Python separado (python.org) com `python -m pip install -r ferramentas/requirements.txt`. |
| `Sem pacotes utilizáveis` | Arquivo vazio ou formato inesperado | Abrir o `.csv` no Bloco de Notas e mandar as primeiras linhas. |

## 8. Coletas (experimento)

| Risco | Como evitar |
|---|---|
| Alguém passa perto durante a gravação de "vazio" | Avisar quem está por perto. Anotar em `--obs` se aconteceu. |
| As placas mudam de lugar entre coletas | Marcar com fita no chão. Foto da montagem no início de cada sessão. |
| Testar o detector com as mesmas gravações usadas para ajustá-lo | Separar desde o início: algumas gravações só para ajuste, outras só para teste final. |
| Todas as coletas de uma classe no mesmo horário | Alternar a ordem: vazio, andando, parado, vazio... |

## 9. Na feira

| Risco | Como evitar |
|---|---|
| Muita gente e muitas redes Wi-Fi fazem o detector disparar sozinho | Recalibrar com a zona vazia no local. Corredor de público fora da linha entre A e B. |
| A demonstração ao vivo falha | Ter o modo replay (gravação com o aviso "GRAVAÇÃO" na tela) e um vídeo de reserva. |
| Windows reinicia para atualizar no meio da apresentação | Pausar as atualizações do Windows na véspera. |
| Notebook sem bateria ou sem tomada | Confirmar tomada no estande e levar extensão. |
| Visualizador no navegador não conecta | Web Serial só funciona no **Chrome** ou no **Edge** **[oficial]**. |

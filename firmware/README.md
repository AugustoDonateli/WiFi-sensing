# Firmware Wave Sense v2 (placas A e B)

Firmware próprio, feito depois da feira de 22/10, quando a Placa B recebia só 10 a 20 pacotes por segundo. Ele continua mandando as linhas `CSI_DATA` no mesmo formato do exemplo oficial, então a tela (`demo/`) e as ferramentas (`ferramentas/`) funcionam sem mudança.

**Estado:** compila com o ESP-IDF v5.5.5 para o ESP32 (e para o ESP32-S3). A tela foi testada com uma placa B simulada. **Ainda não rodou nas placas de verdade.** Testem em casa antes da feira (passo a passo em [docs/interferencia.md](../docs/interferencia.md#teste-em-casa-antes-da-feira)).

**As duas placas precisam deste firmware.** A placa A nova não conversa com a B antiga, nem o contrário.

## O que mudou e por quê

O exemplo oficial (`csi_recv`) foi feito para mostrar o CSI numa bancada calma. Numa feira cheia, três escolhas dele pesam contra:

| Problema no oficial | O que acontece na feira | No v2 |
|---|---|---|
| A Placa B liga o **modo promíscuo**: escuta todos os pacotes do canal, de todas as redes. | Centenas de celulares e o Wi-Fi do evento. A placa gasta tempo e memória com milhares de pacotes que não são da A. | Sem modo promíscuo. O próprio rádio descarta o que não é para a B. |
| A B escreve cada linha (~1.280 letras, ~14 ms na USB) **dentro da função que o Wi-Fi chama**. A Espressif pede para não fazer isso. | A 50 linhas por segundo, a placa fica ~70% do tempo travada escrevendo, sem atender o rádio. | A medida vai para uma fila e outra parte do programa escreve. O rádio nunca espera a USB. |
| Manda os blocos LLTF, HT-LTF e STBC (384 números). O detector só usa o LLTF. | A linha é 3 vezes maior que o necessário; a USB aguenta no máximo ~72 por segundo. | Só o LLTF (128 números, ~460 letras). A USB aguenta ~200 por segundo. |
| A A manda em **broadcast**: cada pacote sai uma vez só. | Se bateu com o pacote de outro aparelho, perdeu. | **Unicast:** a A manda direto para a B, a B confirma (ACK) e o rádio da A repete o pacote que não foi confirmado. |
| 40 MHz no canal 11 (ocupa do 7 ao 11). | Pega o dobro das redes por cima e divide a potência pela faixa larga. | 20 MHz: um canal só, com a potência concentrada (+3 dB por subportadora). |
| Canal fixo no código. Trocar exige compilar e regravar as duas placas. | Na feira não dá tempo. | A tela mede todos os canais e passa as duas placas para o mais livre (botão **Procurar canal livre**). |
| 50 pacotes por segundo (por causa do teto da USB). | Com metade perdida, sobram 25. | 100 por segundo. Com metade perdida, sobram 50. |

Também:
- potência máxima e país **BR** (canais 1 a 13, como a Anatel permite);
- se a Placa A some por 3 s, a B procura a A em todos os canais;
- cada placa guarda o último canal na memória;
- **LED azul** das duas placas: **aceso** = os pacotes estão chegando; **piscando devagar** = perdendo muitos; **piscando rápido** = quase nada chega. Na placa A (que fica no carregador, sem computador), é o único jeito de saber se a B a está ouvindo.

## Como gravar

### Jeito 1: pelo Chrome, sem instalar nada (recomendado)

Os arquivos prontos estão em `firmware/binarios/`:
- `wavesense-placa-A-esp32.bin`: para a placa **A** (a que fala);
- `wavesense-placa-B-esp32.bin`: para a placa **B** (a que escuta, ligada no notebook).

Para cada placa:
1. Feche a tela do Wave Sense e qualquer `idf.py monitor` (a porta só pode estar aberta num lugar).
2. Ligue a placa no notebook pelo cabo de dados.
3. No **Chrome** ou no **Edge**, abra a página oficial da Espressif para gravar: https://espressif.github.io/esptool-js/
4. Em **Baudrate**, deixe 921600 (se der erro, use 115200). Clique em **Connect** e escolha a porta "CP210x".
   - Não conectou? Segure o botão **BOOT** da placa, clique em Connect e solte quando aparecer "Connecting...".
5. Em **Flash Address**, escreva `0x0` (zero x zero). Escolha o arquivo `.bin` da placa certa.
6. Clique em **Program** e espere chegar a 100%.
7. Aperte o botão **EN** (ou RST) da placa, ou tire e ponha o cabo.

**Confira a letra antes de gravar.** As placas são iguais por fora; a fita A/B que vocês colaram evita trocar.

### Jeito 2: com o ESP-IDF (o que vocês já têm no Windows)

No atalho **ESP-IDF 5.5 PowerShell**:

```bat
cd CAMINHO\WiFi-sensing\firmware\transmissor
idf.py set-target esp32
idf.py -p COMx flash
```

e depois, com a placa B ligada:

```bat
cd CAMINHO\WiFi-sensing\firmware\receptor
idf.py set-target esp32
idf.py -p COMx flash monitor
```

O `set-target` só precisa ser feito uma vez em cada pasta. No monitor da B devem aparecer `WS_INFO,v2,placa=B,...`, linhas `CSI_DATA` e uma linha `WS_STAT` por segundo. Para sair: `Ctrl` + `]`.

### Voltar para o firmware oficial

Gravem de novo os exemplos `csi_send` (na A) e `csi_recv` (na B) do ESP-CSI, como em 15/10. A tela funciona com os dois firmwares.

## Na tela

Com o firmware v2, o painel do Operador (tecla O) ganha a seção **Rádio (firmware v2)**:
- **canal**, **A mandou/s** e **chegaram/s**;
- uma frase que diz **onde** os pacotes se perdem:
  - **nem saem da Placa A** → o canal está ocupado demais: procure um canal livre;
  - **se perdem no ar** → aproxime as placas, vire as antenas, use o refletor ou troque de canal;
  - **não cabem na USB** → o notebook não está dando conta;
- o botão **Procurar canal livre**: mede o canal 1 ao 13 por uns 4 s, mostra quanto cada um está ocupado e passa as duas placas para o melhor. Clicar num canal da lista também troca.

Depois de trocar de canal, **calibre de novo** (tecla C): o sinal de cada canal é um pouco diferente.

## Para quem for mexer no código

```
firmware/
  comum/ws_protocolo.h   o que A e B combinam: endereços, canal padrão, 100/s, formato da sonda
  comum/ws_radio.c       rádio, ESP-NOW, memória do canal, LED (igual nas duas)
  transmissor/           Placa A
  receptor/              Placa B
  binarios/              os .bin prontos (gravar no endereço 0x0)
```

Para gerar os `.bin` de novo depois de mudar o código (no ESP-IDF PowerShell, dentro de `transmissor` ou `receptor`):

```bat
idf.py build
cd build
python -m esptool --chip esp32 merge-bin -o ..\..\binarios\wavesense-placa-A-esp32.bin @flash_args
```

(troque `A` por `B` na pasta `receptor`).

### Linhas que a Placa B manda

| Linha | Quando | Campos |
|---|---|---|
| `CSI_DATA,...` | a cada sonda recebida | as mesmas 25 colunas do `csi_recv` oficial; `len` = 128 (só LLTF) |
| `WS_STAT,...` | uma por segundo | `tempo_ms, canal, recebidos, repetidos, fila_cheia, a_tentou, a_sem_resposta, a_nao_saiu, rssi, ruido, estado, a_freq` (`-` = sem como saber) |
| `WS_CANAL,N,resultado` | depois de trocar ou achar o canal | `ok`, `achou`, `erro_a_nao_respondeu`, `erro_canal_invalido`, `erro_radio` |
| `WS_VARREDURA,canal,quadros,ocupacao_%,nota_%,ruido` | na varredura, um por canal | a nota soma a ocupação do canal e parte da dos vizinhos (a 1, 2 e 3 canais: 75%, 50%, 25%) |
| `WS_VARREDURA,fim,N` | fim da varredura | o canal de menor nota |
| `WS_INFO,...` | avisos | texto livre |

Comandos que a B aceita pela USB (uma linha cada): `canal N`, `varrer`, `estado`.

### O que ainda não foi medido

- Se o unicast com repetição realmente recupera pacotes na feira (depende de quantas perdas são colisão e quantas são sinal fraco).
- Se o ESP32 entrega o ponteiro do corpo do pacote fora do modo promíscuo. Se não entregar, o firmware tenta pelo cabeçalho; se nem assim, a contagem de perdidos fica em zero (a detecção funciona igual).
- A ocupação da varredura é uma estimativa: só conta pacotes Wi-Fi que a B consegue ler. Bluetooth, micro-ondas e outros ruídos não entram na conta.

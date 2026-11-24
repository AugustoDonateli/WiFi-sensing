# Tutorial: gravar o firmware v2 nas duas placas

Uns 15 minutos. Dá para gravar quantas vezes quiser: se algo der errado, é só gravar de novo. Nada aqui estraga a placa.

**Precisa de:**
- o notebook com o **Chrome** ou o **Edge** (o Firefox não serve);
- o cabo USB-C **de dados** (o mesmo que vocês usaram em outubro);
- as duas placas, com a fita **A** e **B**;
- internet, para baixar os arquivos e abrir a página de gravação.

**Não precisa** do ESP-IDF, de terminal nem de compilar nada.

## Antes de começar

- **Feche** a tela do Wave Sense, o `idf.py monitor` e o Arduino IDE, se estiverem abertos. Cada porta USB só pode ser usada por um programa de cada vez.
- Confira a fita **A** e **B** nas placas. Por fora as duas são iguais.

## Passo 1: baixar os dois arquivos

Clique nos dois links. O Chrome baixa os arquivos para a pasta **Downloads**:

- Placa A: [wavesense-placa-A-esp32.bin](https://github.com/AugustoDonateli/wifi-sensing/raw/claude/firmware-v2-feira-vitoria/firmware/binarios/wavesense-placa-A-esp32.bin)
- Placa B: [wavesense-placa-B-esp32.bin](https://github.com/AugustoDonateli/wifi-sensing/raw/claude/firmware-v2-feira-vitoria/firmware/binarios/wavesense-placa-B-esp32.bin)

Se o Chrome perguntar se quer manter o arquivo, clique em **Manter**.

## Passo 2: gravar a placa A

1. Ligue **só a placa A** no notebook.
2. No Chrome, abra a página oficial da Espressif: **https://espressif.github.io/esptool-js/**
3. Em **Baudrate**, deixe **921600**.
4. Clique em **Connect**.
   - O Chrome abre uma janelinha com as portas. Escolha a que tem **CP210x** (ou "Silicon Labs") no nome e clique em **Conectar**.
   - **Deu certo** quando aparece "Connected to device: ESP32..." e o quadro preto embaixo mostra informações do chip.
5. Clique em **Add File**. Aparece uma linha com **Flash Address** e um botão **Escolher arquivo**.
6. Em **Flash Address**, apague o que estiver escrito e escreva **`0x0`** (zero, x, zero).
7. Clique em **Escolher arquivo** e escolha o **`wavesense-placa-A-esp32.bin`** na pasta Downloads.
8. Não mexa no resto: **Flash Mode** em keep, **Flash Frequency** em keep, **Flash Size** em detect e **Erase all** desmarcado.
9. Clique em **Program**. A barra vai até 100% em uns 20 a 40 segundos. **Não tire o cabo** nesse tempo.
10. Clique em **Disconnect**. Depois aperte o botão **EN** da placa (às vezes vem escrito RST, fica ao lado do USB), ou tire e ponha o cabo.
11. **Conferir:** o LED azul da placa A deve **piscar rápido**. É normal: ela ainda não tem ninguém para ouvi-la, porque a B continua com o firmware antigo.

## Passo 3: gravar a placa B

1. Tire a placa A do notebook e ligue-a no **carregador de celular**.
2. Ligue a **placa B** no notebook.
3. Repita os itens 3 a 10 do passo 2, escolhendo o arquivo **`wavesense-placa-B-esp32.bin`**.
4. **Conferir:** em poucos segundos, o LED azul das **duas** placas deve ficar **aceso fixo**. Quer dizer que a B está ouvindo a A.

## Passo 4: a tela nova

A tela de antes continua mostrando o sinal, mas a seção nova (**Rádio**) só existe na versão nova. Para pegar a versão nova, escolha um dos dois jeitos:

- **Sem Git:** baixe o [ZIP do projeto](https://github.com/AugustoDonateli/wifi-sensing/archive/refs/heads/claude/firmware-v2-feira-vitoria.zip), clique com o botão direito no arquivo baixado e escolha **Extrair tudo**. Use a pasta nova, não a antiga.
- **Com Git**, na pasta do projeto:
  ```bash
  git fetch origin claude/firmware-v2-feira-vitoria
  git checkout claude/firmware-v2-feira-vitoria
  ```

Depois:
1. Abra o `demo/index.html` no Chrome (dois cliques no arquivo; se abrir em outro navegador, botão direito → Abrir com → Chrome).
2. Aperte **O** para abrir o painel do Operador e clique em **Placa USB**. Escolha a porta CP210x.
3. Deve aparecer a seção **Rádio (firmware v2)**, com **canal** 11, **A mandou/s** perto de 100 e **chegaram/s** perto disso.
4. Tire um print do painel e mandem.

## Se der problema

| O que acontece | O que fazer |
|---|---|
| Nenhuma porta aparece na janelinha do Connect | O cabo pode ser só de carga: teste com o celular (ver o README principal). Ou falta o driver: no Gerenciador de Dispositivos, se aparecer "CP2102" com um triângulo amarelo, instale o "CP210x Universal Windows Driver" do site da Silicon Labs. |
| "Failed to open serial port" ou erro ao abrir a porta | Outro programa está usando a porta: feche a tela do Wave Sense, o monitor e outras abas do esptool-js. |
| Fica em "Connecting..." ou "Failed to connect" | Segure o botão **BOOT** da placa, clique em **Connect** e solte quando conectar. Se continuar, mude o Baudrate para **115200**. |
| Erro no meio da gravação | Baudrate em **115200**, outra porta USB do notebook (sem hub) e grave de novo. |
| Gravou, mas o LED azul nunca acende | Algumas placas não têm o LED azul (só o vermelho, de energia). Confira pela tela, no passo 4. |
| LED da A pisca rápido mesmo com a B ligada | A B está desligada ou ainda com o firmware antigo. As **duas** precisam do firmware novo. |
| A seção Rádio não aparece na tela | A tela é a versão antiga (passo 4) ou a placa B está com o firmware antigo. |
| Gravei o arquivo da A na placa B (ou o contrário) | Sem problema: grave de novo com o arquivo certo. |
| Quero voltar ao firmware oficial | Grave os exemplos `csi_send` (na A) e `csi_recv` (na B) com o `idf.py`, como em 15/10. A tela funciona com os dois. |

Mais detalhes do que mudou no firmware: [firmware/README.md](../firmware/README.md).

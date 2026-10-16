# Piloto de sincronização sem comprar peças

Primeiro teste: confirmar que o botão BOOT é registrado e que conseguimos localizar os apertos na filmagem. Não é uma coleta de treinamento de pose. A câmera pode ficar perto da placa neste piloto.

**Acordo registrado em 16/10/2026:** a montagem atual já funciona no site e é a referência da apresentação. Este teste é temporário. Ao terminar, mesmo que o piloto funcione, restaurar o aplicativo original da receptora e conferir o site. A versão experimental só poderá virar versão de apresentação por uma decisão futura explícita do grupo.

## 1. Preparação

- Extraia o pacote ZIP inteiro para uma pasta. Abra **ESP-IDF PowerShell** e entre nessa pasta, a que contém `manifesto.json`.
- Conecte a **placa B, receptora**, ao USB. Feche o monitor do ESP-IDF e a conexão USB do site.
- Confira a porta no Gerenciador de Dispositivos. `COM9` abaixo é um exemplo: use a porta real da receptora.
- Deixe BOOT e EN soltos. A placa A permanece com a configuração de 50 pacotes/s.

## 2. Gravar a versão de teste na receptora

```powershell
python firmware/gravar_boot.py --porta COM9 --pacote .
```

Esse comando é a etapa que altera a placa. Antes de escrever, ele lê a tabela, exige o layout conferido e salva a partição do aplicativo em `backups/`. O aplicativo atual precisa se identificar como `csi_recv` ou `wave_boot`; uma placa que se identifique como `csi_send` é recusada. A escrita fica apenas na partição do aplicativo, em `0x20000`.

Guarde o caminho do backup da **primeira instalação**, quando a placa ainda está na versão estável. O `backup.json` dessa pasta deve identificar `project_name` como `csi_recv`. Preserve uma cópia dessa pasta fora da pasta de trabalho antes de continuar os experimentos. Um backup de uma instalação posterior que identifique `wave_boot` não é o aplicativo original da apresentação.

Se aparecer erro, guarde a mensagem. Não use `erase_flash` para tentar resolver. O pacote é destinado ao ESP32 clássico e ao layout do exemplo já usado pelo grupo; foi compilado com ESP-IDF v5.5.5. Ainda não foi executado nas placas físicas nesta entrega.

## 3. Filmar o botão e capturar por 40 segundos

Ligue a placa A. Apoie a receptora sem puxar o cabo. Posicione o celular para ver o botão **BOOT**, com luz suficiente, e grave com áudio em 1080p/60 fps. Preserve o arquivo original.

Comece a filmagem antes de executar:

```powershell
python -m ferramentas.pose.capturar_boot --porta COM9 --sessao PILOTO-BOOT --duracao 40 --saida dados/piloto-01
```

Com a captura em andamento:

1. Espere a tela mostrar contagem de CSI aumentando.
2. Faça três apertos em BOOT no começo, mantendo cada aperto por aproximadamente meio segundo e deixando ao menos um segundo entre eles.
3. Espere cerca de vinte segundos sem tocar na placa.
4. Faça mais três apertos semelhantes antes de acabar a captura.
5. Espere a mensagem `Fim`; depois termine a filmagem.

Use o botão **BOOT**, não o EN: EN reinicia a placa. Os cliques precisam aparecer de perto e ser audíveis quando possível. Não suponha que o som coincida perfeitamente com o contato elétrico; vamos comparar os eventos e medir a ambiguidade. Não precisamos de uma pessoa movimentando os braços neste primeiro teste.

O terminal deve mostrar `apertos BOOT` crescendo até seis, além dos pacotes CSI. O gravador não reinicia a placa deliberadamente ao abrir a porta. Se houver reinício, troca de firmware ou erro de associação entre CSI e relógio, a captura fica inválida para investigação.

## 4. O que guardar e enviar para análise

- O vídeo original do celular.
- A pasta inteira `dados/piloto-01`, compactada em ZIP: `csi.csv`, `csi.json`, `relogio.csv`, `boot.csv` e `serial.txt`.

Esses arquivos bastam para começar a conferir contagem, continuidade dos relógios e se os apertos são identificáveis no vídeo. A aceitação do piloto depende também da qualidade da filmagem e da incerteza de sincronização. Se o botão estiver encoberto ou o instante de contato for ambíguo demais, este método pode ser insuficiente; o software não vai atribuir precisão perfeita aos cliques.

## 5. Encerramento obrigatório: voltar à versão estável

Depois de guardar a coleta, restaure o backup original da primeira instalação, na mesma receptora. Faça isso tanto se o piloto funcionar quanto se ele falhar:

```powershell
python firmware/gravar_boot.py --porta COM9 --restaurar backups/NOME_DA_PASTA
```

Ele verifica o hash do backup e o layout antes de restaurar a partição do aplicativo. Esse backup é lido da placa pelo instalador; não é apenas uma cópia de um `.bin` antigo do computador. Preserve a pasta do pacote até terminar o piloto.

Feche o gravador e reconecte a receptora ao site, com a placa A ligada e a montagem habitual. Confira as leituras reais, faça a calibração usual e teste a resposta ao movimento e as funções que serão usadas na apresentação. O piloto só está encerrado quando esse funcionamento habitual estiver confirmado. Se houver diferença, guarde a mensagem e resolva a recuperação antes de iniciar outra rodada de pesquisa.

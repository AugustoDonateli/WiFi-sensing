# Wave Sense Pose — laboratório experimental

Esta parte já prepara as três coletas S0 e oferece um caminho executável de **CSI → gabarito sincronizado → treino → teste em outra sessão → coordenadas 2D em replay**.

**Ainda não existe um modelo treinado/validado com poses reais das nossas placas.** S0 tem somente os rótulos vazio/andando; isso não informa onde estavam os membros. O programa recusa treinar sem esse gabarito. O alvo inicial são seis pontos: ombros, cotovelos e punhos, com uma pessoa em posição controlada. Inferência ao vivo, corpo inteiro e generalização através de concreto continuam como etapas futuras.

É uma implementação própria de referência, orientada pela pesquisa, e não uma reprodução do artigo CSIPose. [Decisões e referências](REFERENCIAS.md).

## Usar agora, com S0

Python 3.12 recomendado. Rodar na raiz do repositório, em um ambiente Python separado do usado para gravar as placas. Nenhum comando abaixo grava firmware ou abre câmera/porta serial.

```powershell
python -m pip install -r ferramentas/pose/requirements.txt
python -m ferramentas.pose preparar dados/brutos --saida dados/pose/preparados-S0
```

São produzidos, para cada CSV, um `.npz` com janelas e máscaras e um `.qualidade.json`. `resumo.json` reúne a auditoria. Não sobrescreve saídas existentes; em outro experimento, escolha outra pasta.

Com os critérios iniciais (janela de 1 s, bins de 50 ms, cobertura mínima 80%, intervalo máximo 100 ms e pelo menos dez pacotes), S0 produziu:

| Coleta | Janelas aceitas / candidatas | Janelas com gabarito |
|---|---:|---:|
| Vazio a 1,5 m | 580 / 580 | 0 |
| Andando a 1,5 m | 436 / 580 | 0 |
| Andando a 3,75 m com parede | 317 / 577 | 0 |

Isso mede **qualidade da entrada**, não acerto da pose. As janelas se sobrepõem; não são centenas de experimentos independentes. O fato de o vazio ter boa cobertura não significa presença de uma pessoa. S0 continua reservado para diagnóstico, conforme o protocolo do projeto.

## Como o sinal é preparado

- O perfil implementado é o observado nas coletas: ESP32 clássico, CSI de 384 bytes, HT40, sem STBC e canal secundário abaixo. Um formato diferente gera erro explícito para exigir adaptação, em vez de interpretar colunas incorretamente.
- O tempo vem de `local_timestamp` da placa, relativo à primeira linha salva. O atraso do USB não organiza os movimentos. Estouro de uint32 do relógio é tratado; duplicatas, reinícios e mudanças de perfil exigem arquivos separados, mantendo o mesmo código de sessão quando pertencem ao mesmo experimento.
- Os dois primeiros pares complexos são descartados. Os 190 restantes abrangem LLTF e HT-LTF; são posições no buffer, não 190 frequências independentes. Na v0 mantemos a disposição fixa, inclusive guardas, e não inventamos resolução espacial a partir dela.
- Entrada: amplitude relativa por pacote, logaritmo da amplitude média como auxiliar e RSSI. A amplitude relativa reduz variação comum; não equivale a medir/corrigir perfeitamente o AGC. Fase não é usada nesta versão.
- A média é feita por tempo, em intervalos de 50 ms. Bins vazios têm máscara explícita. Não há interpolação nem preenchimento de buracos com movimento inventado. Cada janela só usa pacotes anteriores ao seu instante final.
- Os limites de qualidade são hipóteses de engenharia e podem ser estudados com `--cobertura-minima` e `--intervalo-maximo`. Alterá-los muda o contrato do modelo; ajuste com treino/validação, não olhando o teste final.

## O que precisamos gravar a seguir

1. Estabilizar o fluxo a 50 pacotes/s e completar vazio/parado/andando na montagem com concreto. Anotar material/espessura da parede, alturas, posição e orientação das placas e da pessoa, além do commit/configuração do firmware.
2. Para pose, gravar CSI e vídeo ao mesmo tempo, com a câmera fixa vendo ombros, cotovelos e punhos. Manter uma pessoa e variar alturas, pausas e ordem dos movimentos dos braços; não repetir sempre a mesma coreografia no mesmo segundo.
3. Registrar tempos dos quadros e eventos de sincronização em um relógio comum ou por marcadores instrumentados. `capturar.py` atual mede o tempo do PC antes da leitura serial; isso é insuficiente para simplesmente assumir igualdade com o tempo do vídeo. É necessário medir o alinhamento e sua incerteza. Uma gravação iniciada “mais ou menos junto” não recebe sincronização perfeita automaticamente.
4. Fazer sessões independentes para treino, validação e teste. Manter os três grupos definidos antes de ajustar parâmetros. Para estudar a parede, coletar também gabarito nessa montagem e guardar sessões novas com parede para avaliação; não presumir transferência do modelo sem parede.

O vídeo é usado para criar/conferir o gabarito durante a pesquisa. Depois de treinado, o regressor recebe somente CSI. A câmera e as coordenadas verdadeiras não entram em sua inferência. A coleta visual requer atualizar a explicação dada aos participantes: o protocolo original de movimento dizia que não havia vídeo.

## Preparar o gabarito

```powershell
python -m ferramentas.pose modelo-gabarito --saida dados/pose/gabarito-S1
```

O CSV tem `tempo_video_s,pessoas` e, para cada articulação, `x,y,confianca`. Coordenadas entre 0 e 1, referidas à imagem original, sem espelhar ou centralizar cada corpo. Esquerda/direita são da pessoa. Confiança é a do extrator visual, não uma confiança do Wi-Fi.

Pode ser produzido por um extrator de pose ou anotação revisada. Há um importador para **JSONs BODY_25 do OpenPose já processados**:

```powershell
python -m ferramentas.pose importar-openpose dados/pose/openpose-S1 --tempos dados/pose/tempos-S1.csv --largura 1280 --altura 720 --escala pixels --saida dados/pose/gabarito-S1.csv
```

`tempos-S1.csv` tem `arquivo,tempo_video_s`, um nome de JSON por quadro, na ordem correta. Os timestamps devem corresponder aos quadros realmente processados. O importador não executa OpenPose, não baixa pesos e não deduz tempos pelo FPS nominal. Confirme a escala real da saída (`pixels` da imagem original ou `normalizada`) e as dimensões do vídeo. Quadros com zero ou múltiplas pessoas ficam sem alvos de pose.

Preencha `sincronizacao.json` com dimensões da imagem, método, observações, incerteza medida e pelo menos dois pares `{csi_s, video_s}` separados por cinco segundos ou mais. `csi_s=0` é o primeiro pacote salvo no CSV. Prefira vários marcadores distribuídos pelo vídeo: dois pontos permitem um ajuste, mas não demonstram ausência de erro entre eles. O modelo vazio criado pelo comando é intencionalmente inválido até ser preenchido com medições.

```powershell
python -m ferramentas.pose rotular dados/pose/preparados-S1/S1_bracos.npz --gabarito dados/pose/gabarito-S1.csv --sincronizacao dados/pose/sincronizacao-S1.json --saida dados/pose/rotulados/S1.npz
```

Os nomes S1/S2/S3 abaixo são exemplos de futuras coletas, não arquivos incluídos no projeto. O alinhamento rejeita extrapolação, frames muito distantes, pessoas múltiplas e confiança visual abaixo de 0,5. Não atribui braços em posição padrão quando o professor visual falha.

## Treinar e avaliar quando houver gabarito

Para CPU, instalar PyTorch pelo índice oficial e depois conferir as versões:

```powershell
python -m pip install torch==2.14.1 --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r ferramentas/pose/requirements-modelo.txt
python -m ferramentas.pose treinar --treino dados/pose/rotulados/S1.npz --validacao dados/pose/rotulados/S2.npz --saida modelos/pose/bracos-v0.pt
python -m ferramentas.pose avaliar --teste dados/pose/rotulados/S3.npz --modelo modelos/pose/bracos-v0.pt --saida resultados/pose/teste-S3.json
```

**Para pose, use três grupos explícitos.** A divisão ímpar/par padrão do detector de movimento não é aplicada aqui. Uma sessão não pode aparecer em mais de um grupo, nem renomeando/copíando o mesmo CSV. Normalização é ajustada só com o treino; validação escolhe a época; teste permanece reservado. Trocas de pessoa, ambiente e parede devem ser identificadas nos relatórios como cenários diferentes.

Rede: duas convoluções temporais e uma saída de 12 coordenadas, com 107.532 parâmetros na configuração padrão. Recebe 20 bins × 192 características, mais máscara de observação. Treina em CPU, com semente registrada, atualização de gradientes e checkpoint da melhor época de validação. Não há pesos pré-treinados de outro hardware nem promessa de que essa arquitetura será suficiente. É uma primeira hipótese comparável e substituível.

O relatório inclui erro em pixels e porcentagem da diagonal, PCK a 5% da diagonal, resultados por articulação, cobertura e duas referências: pose média do treino e janelas de CSI embaralhadas. PCK não é “percentual de pessoas detectadas”, nem precisão em centímetros. As previsões não são alinhadas à pose verdadeira antes da pontuação. O controle embaralhado é um diagnóstico, não um teste de significância estatística.

## Exportar um replay depois do treinamento

```powershell
python -m ferramentas.pose prever dados/pose/preparados-S3/S3_bracos.npz --modelo modelos/pose/bracos-v0.pt --uma-pessoa-confirmada --saida resultados/pose/replay-S3.csv
```

V0 pressupõe que há exatamente uma pessoa no experimento. **Não detecta presença**, não decide quantas pessoas existem e não deve gerar uma vitrine de bonecos a partir de uma sala desconhecida. O CSV exportado mantém coordenadas vazias quando a qualidade do sinal falha. O status de aquisição não é confiança da pose. Um modelo treinado em fixtures sintéticas é recusado em CSI marcado como medido.

Saídas ficam em `dados/pose/`, `modelos/pose/` e `resultados/pose/`, ignorados pelo Git. Guarde originais e gabaritos localmente. Nenhum artefato de treino fictício é distribuído como modelo do projeto.

## Verificação do software

```powershell
python -m unittest discover -s ferramentas/pose/testes -v
```

Testes cobrem as três coletas reais, interpretação dos bytes, relógios, wraps, falhas, causalidade, sincronização, lateralidade, isolamento de sessões, atualização de pesos, persistência e avaliação completa. Fixtures inventadas exercitam o treinamento: seu sucesso comprova funcionamento do código, não reconstrução física através da parede. A captura conjunta com câmera/rádio e a qualidade do professor visual ainda precisam de validação no hardware.

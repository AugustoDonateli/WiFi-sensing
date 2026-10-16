# Referências e decisões da versão 0.1

Consultadas em 15/10/2026. O objetivo desta versão é tornar experimentos reproduzíveis; não afirmar que já reproduzimos uma pesquisa publicada.

| Fonte primária | O que orienta a implementação | Limite da transferência |
|---|---|---|
| [CSIPose, IEEE TMC 2025](https://yebof.github.io/assets/pdf/gu2025tmc.pdf) | Aprender coordenadas com supervisão visual; começar por amplitude e agregação em tempo fixo. | Nexus 5/nexmon, poses/movimentos limitados; não valida duas WROOM-32. Não reproduzimos seu teacher–student nem sua arquitetura. |
| [Código publicado do CSIPose](https://github.com/luojiazhishu/CSIPose-code/tree/cbd41a9489f293feb35d7eb2da8a8d3dbd5397d8) | Auditoria do procedimento de treino e das métricas. | No `main.py` auditado, o laço principal chama `optimizer.step()` sem `total_loss.backward()`. O avaliador alinha a previsão a um ponto verdadeiro. Isso motivou testes de atualização dos pesos e erro sem realinhamento; não é refutação do artigo. Código/pesos não foram copiados. |
| [csi-pose, seis ESP32-S3](https://github.com/sel00000/csi-pose) | Importância de alinhar rádio/vídeo, mascarar casos inválidos e comparar contra pose média. | Usa nove enlaces, não um; seus números de demonstração não valem para nossas placas ou concreto. |
| [ESP-IDF 5.5.5 — CSI](https://docs.espressif.com/projects/esp-idf/en/v5.5.5/esp32/api-guides/wifi.html#wi-fi-channel-state-information) | Ordem imaginária/real, LTFs, metadados e quatro bytes iniciais inválidos. | O parser da v0 só aceita o perfil HT40 sem STBC/secundário abaixo observado em S0. Outros perfis precisam de adaptação explícita. |
| [OpenPose — formato da saída](https://github.com/CMU-Perceptual-Computing-Lab/openpose/blob/master/doc/02_output.md) | JSON por quadro, BODY_25, triplas x/y/confiança e escala explícita. | Importamos saída já existente; não instalamos nem testamos a extração visual em vídeos do grupo. |
| [PyTorch Conv1d](https://docs.pytorch.org/docs/2.14/generated/torch.nn.Conv1d.html), [persistência](https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html), [reprodutibilidade](https://docs.pytorch.org/docs/2.14/notes/randomness.html) | Regressor temporal pequeno, `state_dict`, CPU e carregamento `weights_only=True`. | Sementes ajudam a reproduzir uma execução, mas não garantem igualdade entre todas as versões/plataformas. |
| [scikit-learn — vazamento de dados](https://scikit-learn.org/stable/common_pitfalls.html#data-leakage) | Ajustar pré-processamento só no treino; separar sessões antes de treinar. | Não tratamos janelas sobrepostas como amostras independentes de generalização. |

## Decisões próprias, ainda experimentais

1. **Seis articulações primeiro.** É um problema mais limitado que um corpo inteiro. O modelo prevê coordenadas contínuas na imagem da câmera de referência; não toca uma animação escolhida por classe de atividade.
2. **Manter o perfil bruto e a escala auxiliar.** A normalização por pacote pode ajudar com variação comum, mas retirar amplitude absoluta também pode apagar informação do movimento. Preservar a escala permite comparar escolhas depois. Não afirmamos conhecer o ganho analógico real de cada pacote.
3. **Janela causal de um segundo.** Vinte médias de 50 ms dão uma hipótese inicial para movimento lento. Janelas maiores/menores e outras redes devem ser comparadas com validação, mantendo o teste final intacto.
4. **Recusar buracos longos.** Os limites 80% / 100 ms / dez pacotes são parâmetros iniciais de qualidade. Aprovação nesses limites não significa que o sinal contém informação suficiente para pose; reprovação não significa impossibilidade física.
5. **Modelo pequeno e auditável.** A convolução temporal própria permite verificar gradientes, aprender em CPU e testar todo o fluxo sem depender dos pesos de dispositivos diferentes. Um resultado inferior à pose média pede investigação, não uma animação mais suave.
6. **Sem assumir localização universal.** Trocar pessoa, cômodo, posição, antenas ou parede muda a distribuição dos dados. Perfis de rádio incompatíveis são bloqueados; alterações físicas não registradas não podem ser detectadas automaticamente pelo software.

## Critério para chamar de reconstrução real

É preciso coletar rádio e vídeo sincronizados, treinar em sessões determinadas e prever coordenadas de movimentos não decorados em outras sessões. Exibir os erros por membro, cobertura de dados e comparações de referência. Avaliar a montagem com parede usando seu próprio controle vazio e seu próprio conjunto reservado. Separar do ensaio sem parede. Não converter pixels em centímetros sem calibração geométrica.

Os únicos resultados físicos usados nesta implementação são os arquivos S0 do grupo. Não há rótulos de pose nesses arquivos, portanto não existe acurácia física de pose a reportar nesta entrega.

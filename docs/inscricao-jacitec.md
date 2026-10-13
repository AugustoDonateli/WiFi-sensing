# Inscrição na Mostra Científica da XV JACITEC

Textos preparados em 13/10/2026 para o orientador colar no Projetin. Fonte das regras: Edital nº 23/2026 do Ifes Cachoeiro de Itapemirim.

## Regras do edital que afetam o projeto

- **Prazo:** o edital diz que as inscrições fecham em **12/10/2026, às 23h59**. Se ainda estiverem abertas, foi prorrogação: conferir no Projetin.
- **Quem inscreve:** só o orientador. Antes disso, cada aluno precisa ter **cadastro individual** no Projetin, validado pelo link do e-mail.
- **Caminho:** Projetin → menu "Usuário" → "Feiras disponíveis" → "Mostra Científica da XV JACITEC do Ifes - Cachoeiro de Itapemirim" → "Submeter" (canto superior direito) → preencher, salvar e submeter.
- **Projeto em andamento é aceito:** na seleção, "resultados esperados" valem o mesmo que "resultados obtidos".
- **Contam como fraude (item da 1ª fase):**
  - fabricar ou simular dados: a simulação da tela é só ensaio e fica sempre identificada; nenhum número simulado vai como resultado;
  - pesquisa com pessoas sem Termo de Consentimento: **falta fazer o termo para os voluntários das coletas**;
  - usar IA sem revisão, ou usar IA sem informar no resumo e no relatório (CNPq, Portaria nº 2.664/2026): a declaração está em "Observações" e no resumo.
- **Seleção (50 pontos):** originalidade (15), conhecimento científico (10), profundidade (10), metodologia e executabilidade (15).
- **Apresentação (50 pontos):** visual (10), domínio do conteúdo (15), viabilidade técnica (10), impacto social (15).
- **Datas:** a mostra é nos dias 21 e 22/10. A lista dos selecionados sai em 15/10. A feira **não fornece notebook nem datashow**.
- **Tema da JACITEC 2026:** "Ciência delas: Mulheres em Ciência, Tecnologia e Inovação".

## Textos para o formulário

Os limites de caracteres são os do formulário; as contagens incluem espaços.

**Título sugerido:** Wave Sense: detecção de movimento humano sem câmeras usando sinais Wi-Fi e ESP32

**Área sugerida:** Ensino Médio → **Engenharias** (Engenharia Elétrica / Telecomunicações). Alternativa: Ciências Exatas e da Terra (Ciência da Computação).

**Palavras-chave (se pedir):** Wi-Fi sensing; CSI; ESP32; detecção de movimento; privacidade

**Resumo (se pedir; o edital exige a declaração de IA no resumo):**
O Wave Sense investiga se o Wi-Fi pode funcionar como sensor de movimento, sem câmeras. Duas placas ESP32 de baixo custo trocam pacotes Wi-Fi, e uma delas mede o CSI (Channel State Information), que descreve como o sinal chega em 64 frequências. Quando uma pessoa se move entre as placas, o sinal oscila. Com coletas rotuladas (ambiente vazio, pessoa parada, andando e queda simulada em colchonete), vamos medir o acerto de um detector calibrado com o ambiente vazio, testar distância e parede e mostrar ao público, de forma interativa, as possibilidades e os limites da tecnologia, inclusive os riscos à privacidade. Uso de IA: assistente Claude (Anthropic) como apoio em código e textos, com revisão da equipe.

**Justificativa do Projeto (295/300):**
Câmeras invadem a privacidade e sensores vestíveis são esquecidos. O Wi-Fi já está em quase todo lugar, e quem se move altera o sinal entre os aparelhos. Entender o que dá para detectar assim, a baixo custo, e seus limites e riscos à privacidade é útil para casas, cuidado de idosos e segurança.

**Objetivo do Projeto (494/500):**
Investigar se as variações do CSI (Channel State Information) do Wi-Fi, medidas com duas placas ESP32 de baixo custo, permitem detectar movimento humano sem câmeras. Específicos: captar e visualizar o CSI; criar e medir um detector de movimento calibrado com o ambiente vazio; testar o efeito da distância e de uma parede; avaliar se dá para distinguir atividades (parado, andando, queda simulada em colchonete); e mostrar ao público, de forma interativa, o que a tecnologia faz e seus limites.

**Metodologia do Projeto (495/500):**
Uma ESP32 envia 100 pacotes/s e outra mede o CSI (64 subportadoras), com os exemplos oficiais da Espressif (ESP-IDF). Um programa em Python grava cada coleta com rótulo e condições. Coletas em sessões: ambiente vazio, pessoa parada, andando e queda simulada em colchonete, com voluntários e termo de consentimento. O detector usa a oscilação do sinal e um limiar calibrado com o ambiente vazio. Sessões diferentes para ajuste e teste; depois, um classificador Random Forest comparado a um chute.

**Resultados Obtidos (288/300):**
Projeto em andamento. Prontos: firmware oficial compilado para ESP32, programas de captura, gráficos e avaliação (testados com dados simulados) e a tela interativa da demonstração. Esperado: medir, com coletas reais, o acerto da detecção de movimento e seus limites de distância e parede.

**Conclusão (281/300):**
Conclusão parcial: a tecnologia é acessível e as ferramentas estão prontas para as coletas. A conclusão final mostrará, com dados medidos, o que o Wi-Fi consegue detectar, onde falha e que cuidados de privacidade exige, já que o sinal pode revelar movimento até através de paredes.

**Referências:**
ESPRESSIF. ESP-CSI. GitHub, 2026. Disponível em: https://github.com/espressif/esp-csi. ESPRESSIF. ESP-IDF Programming Guide v5.5: Wi-Fi Channel State Information. MA, Y.; ZHOU, G.; WANG, S. WiFi sensing with channel state information: a survey. ACM Computing Surveys, v. 52, n. 3, 2019. WANG, Y.; WU, K.; NI, L. M. WiFall: device-free fall detection by wireless networks. IEEE Transactions on Mobile Computing, v. 16, n. 2, 2017. BREIMAN, L. Random forests. Machine Learning, v. 45, 2001.

**Turno Preferencial:** escolha do grupo (o comitê pode mudar).

**Observações:**
Uso de IA: usamos um assistente de IA (Claude, da Anthropic) como apoio para consultar documentação, escrever partes do código e revisar textos. Tudo é revisado e testado pela equipe, e os dados serão medidos por nós; a tela da demonstração tem um modo simulação, sempre identificado na tela. Levaremos notebook e as placas; a demonstração não depende da rede Wi-Fi do evento. Precisamos de uma tomada.

## Pendências depois da inscrição

- Termo de consentimento para os voluntários das coletas (com assinatura dos responsáveis, no caso de menores de idade).
- Guardar o comprovante da submissão.

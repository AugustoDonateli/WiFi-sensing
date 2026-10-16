# Decisões do projeto

Registro do que o grupo já decidiu, com a data. Quando uma decisão mudar, a anterior fica riscada aqui, com o motivo.

## 13/10/2026

### Hardware e software base
- **Placas:** 2× ESP32 DevKit clássico (WROOM-32), com USB-C e chip CP2102. Placa A transmite (`csi_send`) e Placa B recebe (`csi_recv`).
- **Cabos e energia:** pelo menos 1 cabo USB-C de dados. A Placa A pode ficar num carregador de celular.
- **Firmware:** exemplos oficiais do ESP-CSI, sem alteração. ESP-IDF v5.5.5.

### Faixa no chão (aprovada)
- Marcar com fita o caminho entre as placas, com uma linha de **PARTIDA** e outra de **CHEGADA**.
- Imprimir duas folhas, "PARTIDA" e "CHEGADA", na mesma fonte da tela (Instrument Serif).
- Marcar também onde ficam as Placas A e B, para a montagem ser sempre a mesma.
- A distância entre A e B deve ser a mesma das coletas (mais de 1 m, recomendação da Espressif).
- O corredor do público deve ficar fora da linha entre A e B, senão o detector dispara à toa.
- **Falta:** saber o tamanho do espaço do estande.

### Pôster "antes e depois" (aprovado, depende de dados reais)
- Dois desenhos de linhas lado a lado, feitos com gravações reais de 30 s: sala vazia e pessoa andando.
- Um terceiro painel, "atrás da parede", se o teste com parede acontecer.
- Cada painel traz as condições escritas: distância, data e tempo de gravação.
- O script já existe: `ferramentas/poster.py` (PDF para imprimir + PNG), no mesmo estilo da tela. Com dados inventados ele escreve "DADOS SINTÉTICOS" em vermelho no pôster.
- **Falta:** fazer as gravações (mesma sessão para os dois painéis).

### Tela da demonstração
- Estilo minimalista: linhas empilhadas do sinal, uma palavra grande (*Parado.* / *Movimento.*) e a tela inverte as cores quando há movimento.
- Quando o painel do operador abre, a tela encolhe para o lado. As linhas continuam visíveis.
- **Medidor de tremor** na coluna da esquerda: número "N,N×" comparado com a sala vazia, a regra do limite escrita embaixo, o último minuto com a linha do limite e o recorde do dia. Ele mostra a decisão do detector, em vez de escondê-la.
- **Tudo em preto e branco** (14/10, pedido do grupo): ~~o aviso de onde vêm os dados ficou cinza, com um círculo vazado~~.
- **Sem aviso de fonte na TV** (14/10, pedido do grupo): no dia do evento os dados são das placas, e o aviso "Simulação · dados inventados para ensaio" quebrava a tela. A fonte continua no painel do Operador e no título da cena ao vivo do "Como funciona". Combinado: se na feira for preciso usar a simulação ou uma gravação, quem estiver no estande diz isso ao visitante. O pôster continua com "DADOS SINTÉTICOS" quando for feito com dados inventados.
- **Hierarquia da tela principal com proporções fixas** (14/10, pedido do grupo, a partir de um print num monitor grande): a TV e o notebook mostram a mesma hierarquia do print, com o gráfico de linhas dominando. Antes, em telas menores, a palavra e o número ficavam proporcionalmente maiores.
- **Menos letra pequena na tela principal** (pedido do grupo): a legenda do gráfico e os rótulos do medidor viraram uma frase normal e uma linha só; contador do dia e dados técnicos foram para o painel do Operador.
- **Roteiro do estande** em `docs/apresentacao.md`. Os jogos (número, Estátua, Travessia, Superpoder) explicam o que a tecnologia faz e onde ela falha.

### Som
- Tudo suave: sem onda quadrada e com limitador de volume.
- **Modo escuta** (tecla E): tela "Feche os olhos." e um som que muda quando alguém se mexe. É para usar com fone de ouvido.
  - ~~Vento baixo que abre e ganha "gotas".~~ Saiu em 14/10: misturado com o alerta de dois toques, não ficou agradável.
  - **Batimento** (14/10, escolhido pelo grupo entre quatro propostas no laboratório de escuta, `ferramentas/laboratorio-escuta/`): um acorde calmo; com movimento, as notas desafinam e pulsam, porque duas ondas quase iguais se somam e se cancelam, o mesmo fenômeno do Wi-Fi entre os caminhos da sala.
  - O pedido: a pessoa tem que sentir que está ouvindo uma onda, sem a mudança passar despercebida. Por isso, na versão 2: o pulso começa já no limiar do detector, o acorde sobe uns 11 dB (medido na simulação), abre, ganha uma nota grave pulsando e o pulso passa de um ouvido para o outro.
  - No modo escuta, os dois toques de alerta não tocam. Nos outros modos, continuam.
  - **Falta:** ouvir com as placas, no estande, e ajustar o volume com fone.
- **Som das trocas de tela** (15/10, pedido do grupo: um som próprio para entrar e sair de cada tela, com a personalidade do site). Três propostas em `demo/sons.js`, para escolher no laboratório de passagens (`ferramentas/laboratorio-passagens/`):
  - **Sinal:** o som é feito da última leitura do Wi-Fi (12 notas igualmente espaçadas, como as subportadoras; se alguém se mexe, elas tremem).
  - **Notas:** uma frase curta de marimba por tela.
  - **Ar:** sopros com o gesto de cada tela.
  - A regra, a mesma do desenho: a saída de uma tela é a entrada tocada de trás para a frente, e toda troca passa pelo mesmo som no meio.
  - O sopro de antes só tocava com o som ligado e ficava uns 17 dB abaixo do alerta (quase não se ouvia). Agora as trocas têm o próprio botão no painel ("Trocas de tela") e tocam mesmo com o detector no Mudo. As três propostas têm volume parecido, um pouco abaixo do alerta.
  - Feitos na hora (Web Audio), sem arquivos de som: funcionam sem internet e não têm problema de licença.
  - **Escolha do grupo (15/10): Sinal.** O som das trocas vem do próprio Wi-Fi da sala, como as linhas. No painel, "Trocas de tela" só liga e desliga; Notas e Ar ficam no laboratório (e pela URL, `?trocas=notas`).
  - **Falta:** ouvir na caixa de som da TV, no estande, e ajustar o volume.
- A pergunta "dá para ouvir alguém atrás da parede?" fica ligada ao teste de parede do projeto. Não vamos afirmar que funciona antes de testar.
- Na parte de ética da apresentação: a mesma ideia poderia ser usada para espionar. É justamente por isso que o projeto discute privacidade.

### Marca de cada visitante
- Na Travessia, o percurso vira uma **marca em estrela**: contornos lisos, encaixados, que giram em espiral.
- A marca tem uma **melodia** (tecla M), feita com as mesmas leituras.
- A marca vira um **cartão para guardar** (tecla B).
- **Refeita em 14/10 (pedido do grupo: o "Quem passou" era confuso e as frases "Te vi." e "o Wi-Fi sentiu X passar" não combinavam com o site):**
  - **Problemas encontrados:**
    - cada marca era ajustada pelo próprio máximo, então quem passou sem ser percebido ficava com a marca mais torta;
    - a marca guardava só os últimos 4,8 s, quase só a contagem;
    - todas tinham 32 anéis.
  - **Agora** (`demo/marca.js`):
    - a marca guarda a contagem e a travessia inteiras;
    - contorno grosso = instante da detecção.
  - ~~Entorte na escala fixa da sala vazia~~ (testado em 14/10): ficou honesto, mas as marcas de quem se mexeu pouco viraram círculos perfeitos, todas iguais. O grupo preferiu a marca antiga, mais pessoal. Os textos dizem "onde o sinal mais variou" (na própria travessia), não que a pessoa se mexeu muito.
  - **Textos como registro de leitura**, escolha do grupo: "Não detectado." / "Detectado aos 0,6 s.", com pico de tremor e limite, e "Registro Nº 003 · data · hora". Se o tremor passou do limite por um instante sem o detector confirmar, o texto diz isso, em vez de "abaixo do limite o tempo todo".
  - **Explicação nos dois lugares:**
    - no resultado, a marca se forma na frente da pessoa;
    - no "Quem passou", uma marca em destaque se forma de novo a cada ~8 s (vitrine), com os 3 passos de como a marca é feita.
- **Estrela no lugar dos anéis (15/10, pedido do grupo):** os anéis pareciam um miolo de árvore, sem harmonia, e as marcas ficavam parecidas demais. O grupo mandou uma referência de estrelas encaixadas, girando em espiral.
  - **Como a estrela sai das leituras:**
    - 28 contornos, um por leitura (8 da contagem, 20 da travessia), do centro (a partida) até a borda (o fim);
    - todas as leituras juntas viram uma "impressão digital" (um hash), que escolhe a família da marca: 4 a 9 pontas, pontas redondas ou finas, onde a estrela é mais pontuda (centro, borda ou igual), quanto e para que lado a espiral gira;
    - as leituras uma a uma decidem o resto: onde o sinal mais variou, o contorno fica mais pontudo e gira mais. O contorno mais forte é o de maior tremor.
  - **O que é honesto dizer:** a família vem de um hash das leituras. Leituras diferentes dão marcas diferentes, mas a família não "quer dizer" nada (5 pontas não é melhor que 7). O que tem leitura direta é o giro e as pontas de cada contorno, e o contorno grosso da detecção.
  - **Animação:** os contornos nascem do centro para fora (a caneta corre em volta, as pontas desabrocham e giram até o lugar, ~3 s). Pronta, a marca respira, a espiral enrola e desenrola devagar, e de 6 em 6 s um brilho corre do centro à borda. Com movimento reduzido, fica parada.
  - **Para ficar harmônica:** o giro total é medido em pontas (de 0,6 a 2 pontas inteiras, do centro à borda), então uma estrela de 9 pontas gira menos que uma de 4. Os giros e as pontas de cada contorno são médias com os vizinhos, então a espiral fica lisa.
  - Ficou de fora (testado com 40 marcas lado a lado): a espiral que vai e volta (um S) e o giro grande demais viravam uma renda embaralhada; pontas finas com 8 ou 9 pontas viravam uma teia; e as estrelas de 3 pontas pareciam um triângulo arredondado.
- **Falta:**
  - ver, com dados reais, se as marcas de pessoas diferentes ficam diferentes de verdade;
  - descobrir se haverá impressora na feira.

### Banner da JACITEC (16/10/2026)
- Feito no **modelo oficial** (`modelo_de_banner_XV_JACITEC.pptx`, 90 × 120 cm): cabeçalho, rodapé, título, linha e as seis seções do modelo, em Arial (título 60 pt, autores 40 pt, instituição 30 pt, texto 26 pt, legendas e referências 24 pt).
- Arquivo: `docs/banner/banner-wave-sense-jacitec.pptx`. A `previa-banner.pdf` saiu do LibreOffice, que troca algumas fontes do cabeçalho: **para imprimir, exportem o PDF pelo PowerPoint**.
- **Falta preencher:** nomes dos autores, orientação e escola (estão entre colchetes).
- **Só dados reais:** as figuras 1 e 3 e a Tabela 1 saem das coletas S0 (`ferramentas/figuras_banner.py`, a mesma regra da tela). A figura 2 é um desenho da montagem, e a legenda diz isso.
- Números conferidos de novo com o `detector.py`: 7 de 7 travessias a 1,5 m, 2 alarmes curtos (1,2 s cada) em 30 s de sala vazia; com parede, nenhum alarme e a pessoa marcada quase o tempo todo. Pacotes: de 76% a 92% (a coleta andando com parede chegou a 76%; antes estava anotado 86% a 92%).
- Sem porcentagem de acerto: é uma gravação de 30 s por situação, e o banner diz isso em "Limites".
- Cita a OMS (quedas), a pesquisa (Ma et al., 2019; WiFall, 2017), a patente de Hedy Lamarr (tema Ciência Delas) e o IEEE 802.11bf, e declara o uso de IA, como pede o edital.

### Detector e avaliação
- A tela (`demo/nucleo.js`) e o Python (`ferramentas/detector.py`) usam **a mesma regra**, conferida por teste. O que aparece na feira é o que foi medido.
- Coletas separadas por **sessão** (`--sessao S1`, `S2`...): sessões ímpares ajustam o limiar, sessões pares testam. Nada da sessão de teste é usado para escolher nada.
- Citar no pôster e na apresentação o resultado **por coleta**, sempre ao lado do "chute" (responder sempre a classe mais comum).
- Classificador (Random Forest) só depois de o detector funcionar com dados reais, e só se sobrar tempo.

### Primeiros testes com as placas (15/10/2026, em casa, sessão S0)
- **Funcionou de ponta a ponta:** as duas placas gravadas, linhas `CSI_DATA` chegando, site mostrando o sinal real e coletas salvas. O `len` veio **384**, como previsto pela documentação.
- **Antenas:** com as antenas viradas uma para a outra, o RSSI a 1,5 m passou de -80 para -67 dBm.
- **Perda de pacotes, duas causas:**
  - **O cabo tem teto.** Cada linha tem ~1.280 letras e a 921600 baud cabem ~92 mil letras por segundo: no máximo **~72 linhas por segundo**. A placa A mandava ~91/s. Enquanto a placa B escreve uma linha (~14 ms), o pacote seguinte se perde.
  - **O roteador de casa estava ao lado da placa B.** A B escuta todos os pacotes do canal; com muito tráfego, chegou a 42/s.
  - Os buracos eram quase todos de 1 ou 2 pacotes, espalhados: placa ocupada, não sinal ruim no ar.
- **Decisão: placa A em 50 pacotes por segundo** (`CONFIG_SEND_FREQUENCY 50` no `csi_send/main/app_main.c`), abaixo do teto do cabo. 50/s sobra para detectar movimento: o detector pede no mínimo 10 por janela de 1 s. Todas as coletas S1 em diante com 50/s, e placas **longe do roteador**.
- **Detector: cada pacote é levado ao volume médio da janela antes de medir a oscilação** (`normalizar_volume` no `detector.py`, `volume` no `nucleo.js`).
  - **Por quê:** a placa B tem ganho automático, que sobe e desce o volume do pacote inteiro. Nos chips mais novos o exemplo oficial corrige isso (`esp_csi_gain_ctrl`), mas **no ESP32 não**. Com a sala vazia, a oscilação pulava entre 0,8 e 4,8 sozinha, e a calibração punha o limiar alto demais.
  - **Medido nas 3 coletas S0** (1 vazio perto, 1 andando perto, 1 andando com parede a 3,75 m):

    | | Oscilação típica (vazio / andando perto / andando parede) | Andando detectado (perto / parede) | Vazio marcado como movimento |
    |---|---|---|---|
    | Antes | 1,49 / 3,44 / 4,83 | 5% / 11% | 0% |
    | Depois | 0,40 / 1,27 / 1,40 | 97% / 98% | 10% |

  - **Não é resultado:** é 1 coleta de cada, com a placa perdendo metade dos pacotes, e o limiar foi calibrado e conferido nas mesmas coletas. Serve para escolher o método; o número de acertos vem da S2.
  - A simulação do site continua separando as cenas do mesmo jeito (conferido).
- **Segunda rodada em casa (15/10, notebook, placa A em 50/s, longe do roteador, antenas viradas):**
  - **Pacotes:** a placa A manda ~47,6/s e chegaram **86% a 92%** (antes, 30% a 49%). Buracos quase só de 1 pacote.
  - **Uma coleta descartada:** a 1ª "andando" perto (`20261015-165043`) perdeu 72% dos pacotes, provavelmente pela TV ao lado. Mudaram a posição e refizeram (`20261015-165324`). Ela continua no repositório, marcada `"descartada": true` no `.json`; as ferramentas deixam de fora.
  - **Detector (limiar calibrado na coleta vazio da mesma montagem):**

    | Montagem | Oscilação típica vazio / andando | Vazio marcado como movimento | Andando |
    |---|---|---|---|
    | Perto (1,5 m), sem parede | 0,41 / 0,64 | 2 alarmes curtos (~1 s) em 30 s | as **7 travessias** da linha detectadas, uma a uma |
    | Longe (3,75 m), com parede | 0,66 / 1,16 | nenhum | marcado quase o tempo todo (94%) |

  - **O que isso mostra:** perto, só treme quando a pessoa **cruza a linha** entre as placas (picos a cada ~3,3 s, entre eles volta ao nível do vazio). É o que a Travessia precisa. Longe e com parede, a zona sensível é maior. Os 2 alarmes no vazio perto ainda não têm causa conhecida (alguém andando na casa? a TV?).
  - **Ainda não é resultado:** 1 coleta de cada, em casa. O resultado vem das sessões S1 (ajuste) e S2 (teste), na escola.

### Hedy Lamarr volta, agora como cena (15/10/2026, pedido do grupo)
- O tema da JACITEC 2026 é **"Ciência Delas: Mulheres em Ciência, Tecnologia e Inovação"** (o mesmo da 23ª Semana Nacional de Ciência e Tecnologia). Na rodada 2 a cena tinha saído; o grupo pediu de volta, por causa do tema.
- **Onde:** logo depois de "O Wi-Fi usa 64 ondas juntas" (cena 9, nas duas versões). As 64 barras apagam, um rolo de pianola desce, e cada furo acende uma frequência, uma de cada vez. Na cena seguinte, as 64 acendem juntas e viram a linha: "em 1942, uma de cada vez; hoje, todas juntas".
- **O que é verdade e o que não é:**
  - verdade: em 1942 (patente nº 2.292.387, de 11/08/1942), Hedy Lamarr e George Antheil patentearam o salto de frequência, com rolos perfurados como os de pianola (88 frequências); a Marinha dos EUA não adotou na época; prêmio Pioneer da EFF em 1997 e Hall da Fama dos Inventores dos EUA em 2014; o Bluetooth pula de frequência até hoje; a primeira versão do Wi-Fi (IEEE 802.11, 1997) tinha um modo com salto de frequência;
  - **não dizer** que ela inventou o Wi-Fi. A colinha tem a frase "NÃO DIGA" e a resposta para "Ela inventou o Wi-Fi?".
- O rolo da tela tem 64 colunas (as subportadoras), não 88: é ilustração, com a etiqueta.
- **Retrato dela (pedido do grupo):** feito com as mesmas linhas empilhadas do sinal, no estilo do site.
  - **Fonte:** "Hedy lamarr - 1940.jpg", de Clarence Bull para a MGM, no Wikimedia Commons, marcada como **domínio público**. Na tela, a legenda dá o crédito ("foto de Clarence Bull").
  - **Por que não imagem de IA:** é uma pessoa real; um rosto gerado poderia sair parecido, mas não seria ela. A foto de verdade, redesenhada com as linhas, é honesta e combina com o resto.
  - **Como:** a foto foi recortada no rosto, com o contraste ajustado e o fundo apagado por uma elipse. Virou uma grade de 72 × 120 pontos de luz (8.640 caracteres no `historia.js`); a foto não vai no site. Cada linha sobe (até 1,15 espaço) e fica mais clara e mais grossa onde a foto é clara.
  - **Animação:** as linhas chegam retas e apagadas, como o sinal; o rosto sobe de baixo para cima, linha por linha; parado, uma faixa de luz desce a cada 6 s, como uma leitura; saindo, o relevo baixa.

### Site no Vercel (aprovado)
- A pasta `demo/` vai para o Vercel, para mandar um link em vez de arquivos. Passo a passo em `docs/publicar-vercel.md`.
- O site não guarda nada em servidor; recordes e marcas ficam no navegador de cada aparelho.
- Na feira, a pasta `demo/` no notebook continua sendo o plano principal (funciona sem internet); o site é reserva.

### Apresentação "Como funciona" (aprovada)
- Virou uma **história em motion design** na própria página (tecla H), para ser o apoio da apresentação no estande. Cada desenho se transforma no próximo; não são slides.
- **Rolagem contínua** (a animação anda com a rolagem e volta exatamente se rolar para trás), mais setas e passador de slides.
- **Janela do apresentador** no notebook com a fala de cada cena; a TV mostra só a animação.
- **Duas versões:** completa (17 cenas, para o avaliador) e curta (11 cenas, para visitantes). Em 15/10: 20 e 12 cenas.
- **Textos diretos**, sem frase de efeito (pedido do grupo). Ficam em `demo/roteiro.js`, separados do código.
- Dados sintéticos só com a etiqueta "Ilustração". A cena ao vivo diz de onde vem o sinal (placas, simulação ou gravação). Resultados só com números do `avaliar.py`.
- **Rodada 2 (pedido do grupo):**
  - Transições mais lentas: cada passagem leva 2,6 s (ajustável em `transicao` no `roteiro.js`), começa a andar assim que a tecla é apertada e desacelera no fim.
  - A cena da Hedy Lamarr saiu.
  - Revisão "como visitante":
    - o tremor e a pessoa parada ganharam a sala em miniatura em cima das linhas, para mostrar causa e efeito;
    - o texto das 64 frequências explica por que as barras têm alturas diferentes (os caminhos se somam ou se cancelam);
    - o número diz que 1,0× é a sala vazia.
  - Revisão "como avaliador":
    - cena nova de viabilidade (versão completa); o preço só aparece se o grupo preencher `CUSTO`;
    - na fala da pergunta, o dado da OMS (ficha "Falls", 26/04/2021): quedas são a segunda maior causa de morte por acidente no mundo, e os maiores de 60 anos são os mais atingidos;
    - na fala da viabilidade, o padrão IEEE 802.11bf-2025 (publicado em 26/09/2025), só para sensoriamento por Wi-Fi.
  - O ponto fraco que continua: os resultados dependem das gravações com as placas.
- **Rodada 3: motion mais profissional, sem atrapalhar o entendimento (pedido do grupo):**
  - Curvas de aceleração Bézier, como as do After Effects (cada elemento chega rápido e assenta devagar; o que sai acelera).
  - O que entra desenhando sai desdesenhando; o número e as linhas saem subindo, como o texto.
  - Quatro passagens que mostram a causa:
    - roteador → placa A;
    - caminhos → para dentro da placa B → 64 barras;
    - gravações de teste → barra do resultado;
    - exemplo → sinal de verdade, com uma linha de varredura.
  - Redesenhos:
    - placa ESP32 parecida com a DevKit do estande, com LED piscando quando a mensagem sai e chega;
    - pessoa com cotovelos e joelhos;
    - roteador, câmera, casa (parede grossa, porta, janela, sino), luminária que apaga e acende, notebook.
  - Destaques:
    - pulso quando o tremor passa do limite;
    - ponto "agora" no gráfico;
    - palavra-chave do título sublinhada (marcada com `*...*` no `roteiro.js`).
  - **Ficou de fora de propósito:** câmera tremendo, zoom contínuo, desfoque e cores novas. Com a cena parada, nada muda de lugar.

### "Como funciona": revisão da explicação do Wi-Fi (14/10/2026, pedido do grupo)
- **O pedido:** a explicação do Wi-Fi estava rasa: faltava o que acontece entre transmitir o sinal e perceber movimento. O objetivo era o "agora entendi", com pouco texto, uma ideia por cena e uma colinha melhor.
- **O arco novo:** abre com as linhas de verdade da sala ("mexa o braço") e fecha com "Agora você sabe ler estas linhas".
- **No meio, três cenas novas:**
  - "Na placa B, os caminhos se somam": direto + rebatido = soma; crista com crista reforça, crista com vale cancela;
  - "Quando alguém se mexe, a soma muda": a soma sobe e desce no ritmo dos passos; meia onda ~6 cm;
  - "O Wi-Fi usa 64 ondas juntas": a força da soma vira uma barra, e as outras 63 nascem em volta. "CSI" só aparece depois de entendido.
- **Refeitas:**
  - a onda, com a régua de 12 cm;
  - os caminhos, em que os pulsos saem juntos e os longos chegam depois;
  - a abertura e o fim.
- **Saíram:** "O Wi-Fi está em quase todo lugar" (virou "O Wi-Fi é uma onda") e "64 frequências" (virou "64 ondas").
- **Colinha:** cada cena tem fala, ações, ponte e perguntas de avaliador. Aparece na janela do apresentador (Q mostra as perguntas) e em `docs/colinha.md`, gerada do roteiro.
- **Ensaio com alguém de fora:** em `docs/apresentacao.md`, com as 4 coisas que a pessoa deve saber explicar no fim.
- **Honestidade:** as cenas novas são física desenhada, com a etiqueta "Ilustração"; a abertura diz a fonte do sinal no título.

### Passagens entre as telas do site (14/10/2026, pedido do grupo)
- **O pedido:** toda troca de tela com uma animação de transição ambiciosa e com personalidade, que não pareça genérica. O caso citado: modo escuta → Desafio Ninja (hoje Travessia).
- **A ideia:** toda troca passa pelo sinal. A tela que sai vira as linhas do Wi-Fi (as leituras de verdade), as linhas tomam a tela e depois viram a tela que chega, com um gesto que diz o que ela é:
  - escuta: fechar os olhos (as linhas viram o ponto que pulsa com o som);
  - Travessia: uma pessoa invisível atravessa e só o sinal treme;
  - mural: as linhas viram uma estrela em espiral, como as marcas (até 15/10, anéis);
  - principal: as linhas pousam no gráfico;
  - história: na saída, o sinal é desenhado por cima.
- **Honestidade:**
  - a passagem não inverte a tela (isso é só do detector);
  - não finge que as linhas reais viram a ilustração da história;
  - sem dados, as linhas ficam retas.
- **No estande:**
  - Esc no meio encerra o desafio na hora;
  - um movimento de verdade fecha a vitrine com a passagem rápida (cerca de 1 s);
  - dá para desligar as passagens no Operador ou com `?passagem=0`.
- **Ficou de fora:** brilho, partículas, degradê, desfoque e cores novas.

### Imagens geradas por IA
- Não usar na tela principal: lá tudo deve ser sinal medido.
- Uso possível em divulgação (post, convite) e rascunho de layout do banner, sempre com confirmação do grupo, porque gasta créditos.
- No lugar de foto de IA, preferir **fotos reais em preto e branco** da montagem.

### Pendências gerais
- Confirmar com o professor Rafael os critérios de avaliação da JACITEC 2026.
- Medir o espaço do estande.
- Ver se haverá impressora e TV ou monitor no local.
- Tirar fotos em preto e branco das placas montadas e da faixa.

## 16/10/2026: menos repetição na parte das ondas e um "para que serve" mais forte

- **O problema, nas palavras do grupo:** a história ficava presa explicando, cena após cena, que as ondas mudam com o movimento. E "Onde isso pode ajudar" (luz que apaga sozinha, alarme) era a parte mais fraca do projeto.
- **Juntamos cenas** (de 20 para 16; a curta continua com 12):
  - "O Wi-Fi é uma onda" entrou em "Duas placas": a onda de 12 cm corre entre as placas;
  - "Na placa B, os caminhos se somam" entrou em "Quem se mexe muda a soma": é **o único lugar** que explica que o movimento muda o sinal;
  - "As linhas tremem" entrou em "Cada instante vira uma linha";
  - "Como testamos" entrou em "O que os testes mostraram";
  - "Agora com o sinal das placas" virou o fim: o sinal de verdade já abre e fecha a história.
- **Para que serve**, só com o que dá para defender com fonte:
  - **Pessoa parada não aparece. Ainda.** Um estudo de 2024 (Burimas e outros, Applied Sciences) mediu a respiração de 8 pessoas com a mesma ESP32, com erro médio de 2,6 respirações por minuto. É a ponte para o resto.
  - **Alguém vivo debaixo dos escombros?** O FINDER (radar da NASA e do Departamento de Segurança Interna dos EUA) achou 4 pessoas vivas no Nepal, em 2015, pela respiração e pelos batimentos. Petrópolis (2022) como exemplo brasileiro. É uma ideia para testar: a cena e a colinha dizem que o nosso sistema ainda não faz isso, e que o entulho enfraquece muito o Wi-Fi.
  - **Quem mora sozinho:** IBGE (Censo 2022): 5,66 milhões de idosos moram sozinhos; o Espírito Santo é o 3º estado em casas de uma pessoa só (20,6%). OMS: quedas são a 2ª causa de morte por lesão acidental. A ideia usa só o que o detector já faz.
  - **Viabilidade e privacidade:** a Comcast já oferece detecção de movimento por Wi-Fi nos roteadores dos clientes nos EUA (opcional), e os termos dizem que os dados podem ir para a polícia com ordem judicial. Isso mostra as duas coisas: a ideia está virando produto, e o risco é real.
- **Saiu:** a luz que apaga sozinha e o alarme. Funcionam, mas não convencem ninguém de que o projeto importa.
- **Desenho:** a pessoa parada da cena anterior cai, o entulho cai por cima deixando um vão e, do peito, sobem ondinhas no ritmo da respiração (15 por minuto). Na rotina, um cursor percorre ontem desenhando os movimentos e hoje até as 10h, sem nenhum, e sai o aviso. As duas cenas têm a etiqueta "Ilustração".


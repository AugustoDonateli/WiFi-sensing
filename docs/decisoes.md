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
- **Hierarquia da tela principal com proporções fixas** (14/10, pedido do grupo, a partir de um print num monitor grande): a TV e o notebook mostram a mesma hierarquia do print, com o gráfico de linhas dominando. Antes, em telas menores, a palavra e o número ficavam proporcionalmente maiores.
- **Menos letra pequena na tela principal** (pedido do grupo): a legenda do gráfico e os rótulos do medidor viraram uma frase normal e uma linha só; contador do dia e dados técnicos foram para o painel do Operador.
- **Roteiro do estande** em `docs/apresentacao.md`. Os jogos (número, Estátua, Travessia, Superpoder) explicam o que a tecnologia faz e onde ela falha.

### Som
- Tudo suave: sem onda quadrada e com limitador de volume.
- **Modo escuta** (tecla E): tela "Feche os olhos." e um som de vento baixo que abre e ganha "gotas" quando alguém se mexe. É para usar com fone de ouvido.
- A pergunta "dá para ouvir alguém atrás da parede?" fica ligada ao teste de parede do projeto. Não vamos afirmar que funciona antes de testar.
- Na parte de ética da apresentação: a mesma ideia poderia ser usada para espionar. É justamente por isso que o projeto discute privacidade.

### Marca de cada visitante (em desenvolvimento)
- Na Travessia, o percurso vira uma **marca em anéis**, como anéis de árvore. Cada anel é um momento da travessia; momentos de mais movimento deixam anéis mais largos e tortos.
- A marca tem uma **melodia** (tecla M), feita com as mesmas leituras.
- A marca vira um **cartão para guardar** (tecla B), com nome, número, data e hora. Ele diz "Travessia sem ser percebido" se a pessoa passou, ou "Registro de passagem" se o Wi-Fi a percebeu.
- O mural de marcas (tecla G) mostra os últimos 12.
- **Falta:**
  - ver, com dados reais, se as marcas de pessoas diferentes ficam diferentes de verdade;
  - descobrir se haverá impressora na feira.

### Detector e avaliação
- A tela (`demo/nucleo.js`) e o Python (`ferramentas/detector.py`) usam **a mesma regra**, conferida por teste. O que aparece na feira é o que foi medido.
- Coletas separadas por **sessão** (`--sessao S1`, `S2`...): sessões ímpares ajustam o limiar, sessões pares testam. Nada da sessão de teste é usado para escolher nada.
- Citar no pôster e na apresentação o resultado **por coleta**, sempre ao lado do "chute" (responder sempre a classe mais comum).
- Classificador (Random Forest) só depois de o detector funcionar com dados reais, e só se sobrar tempo.

### Site no Vercel (aprovado)
- A pasta `demo/` vai para o Vercel, para mandar um link em vez de arquivos. Passo a passo em `docs/publicar-vercel.md`.
- O site não guarda nada em servidor; recordes e marcas ficam no navegador de cada aparelho.
- Na feira, a pasta `demo/` no notebook continua sendo o plano principal (funciona sem internet); o site é reserva.

### Apresentação "Como funciona" (aprovada)
- Virou uma **história em motion design** na própria página (tecla H), para ser o apoio da apresentação no estande. Cada desenho se transforma no próximo; não são slides.
- **Rolagem contínua** (a animação anda com a rolagem e volta exatamente se rolar para trás), mais setas e passador de slides.
- **Janela do apresentador** no notebook com a fala de cada cena; a TV mostra só a animação.
- **Duas versões:** completa (17 cenas, para o avaliador) e curta (11 cenas, para visitantes).
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

### Passagens entre as telas do site (14/10/2026, pedido do grupo)
- **O pedido:** toda troca de tela com uma animação de transição ambiciosa e com personalidade, que não pareça genérica. O caso citado: modo escuta → Desafio Ninja (hoje Travessia).
- **A ideia:** toda troca passa pelo sinal. A tela que sai vira as linhas do Wi-Fi (as leituras de verdade), as linhas tomam a tela e depois viram a tela que chega, com um gesto que diz o que ela é:
  - escuta: fechar os olhos (as linhas viram o ponto que pulsa com o som);
  - Travessia: uma pessoa invisível atravessa e só o sinal treme;
  - mural: as linhas viram anéis, como as marcas;
  - principal: as linhas pousam no gráfico;
  - história: na saída, o sinal é desenhado por cima.
- **Honestidade:**
  - a passagem não inverte a tela (isso é só do detector);
  - não finge que as linhas reais viram a ilustração da história;
  - o aviso amarelo continua no canto;
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

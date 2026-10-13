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

### Som
- Tudo suave: sem onda quadrada e com limitador de volume.
- **Modo escuta** (tecla E): tela "Feche os olhos." e um som de vento baixo que abre e ganha "gotas" quando alguém se mexe. É para usar com fone de ouvido.
- A pergunta "dá para ouvir alguém atrás da parede?" fica ligada ao teste de parede do projeto. Não vamos afirmar que funciona antes de testar.
- Na parte de ética da apresentação: a mesma ideia poderia ser usada para espionar. É justamente por isso que o projeto discute privacidade.

### Marca de cada visitante (em desenvolvimento)
- No Desafio Ninja, a travessia vira uma **marca em anéis**, como anéis de árvore. Cada anel é um momento da travessia; momentos de mais movimento deixam anéis mais largos e tortos.
- A marca tem uma **melodia** (tecla M), feita com as mesmas leituras.
- A marca vira um **cartão para guardar** (tecla B), com nome, número, data e hora. Ele diz "Carteira de ninja" se a pessoa passou, ou "Registro de passagem" se o Wi-Fi a percebeu.
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

### Imagens geradas por IA
- Não usar na tela principal: lá tudo deve ser sinal medido.
- Uso possível em divulgação (post, convite) e rascunho de layout do banner, sempre com confirmação do grupo, porque gasta créditos.
- No lugar de foto de IA, preferir **fotos reais em preto e branco** da montagem.

### Pendências gerais
- Confirmar com o professor Rafael os critérios de avaliação da JACITEC 2026.
- Medir o espaço do estande.
- Ver se haverá impressora e TV ou monitor no local.
- Tirar fotos em preto e branco das placas montadas e da faixa.

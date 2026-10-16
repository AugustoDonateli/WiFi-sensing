# Colinha da apresentação "Como funciona"

Gerada por `ferramentas/colinha.py` a partir do `demo/roteiro.js`. Não edite aqui: edite o roteiro e gere de novo.

- **Completa:** 16 cenas, cerca de 6:30 (para avaliador).
- **Curta:** 12 cenas, cerca de 3:54 (para visitante). As cenas da curta estão marcadas com ●.
- Na janela do apresentador (tecla P na TV), a mesma colinha aparece cena a cena. A tecla Q mostra as perguntas.

Como ler: a **fala** é o que dizer, em frases curtas (não precisa decorar). As **ações** dizem o que fazer:
APONTE, PERGUNTE (e espere a resposta), PAUSA (deixe a animação falar), FAÇA. A **ponte** leva para a próxima cena.

### 1. Estas linhas são o Wi-Fi desta sala. ●
*20 s (curta: 15 s)*

Na simulação, a TV mostra: "Estas linhas imitam o Wi-Fi de uma sala."

**Fala.** Estas linhas são o Wi-Fi desta sala, medido agora. Mexe o braço aqui, perto das placas. Viu? Ninguém tocou em nada. Vou mostrar como isso acontece.

- FAÇA: convide o visitante a mexer o braço entre as placas.
- ESPERE: as linhas tremerem antes de falar de novo.
- SIMULAÇÃO: diga que é simulação e faça alguém "andar" com a tecla 3.

→ *Por que isso importa? Pense em quem mora sozinho, ou em alguém preso debaixo de escombros.*

## I · A pergunta

### 2. Como perceber alguém sem câmera?
*20 s*

**Fala.** Para saber se alguém caiu em casa, ou se ainda tem alguém vivo atrás de uma parede, hoje se usa câmera, que invade a privacidade e não enxerga através de parede, ou pulseira, que a pessoa esquece. Nossa pergunta: dá para usar o Wi-Fi?

- PERGUNTE: "Você colocaria uma câmera no banheiro da sua avó?" Espere a resposta.

→ *Para responder, usamos duas plaquinhas.*

## II · Como funciona

### 3. Duas placas: uma fala, a outra escuta. ●
*20 s (curta: 16 s)*

**Fala.** O Wi-Fi é uma onda de rádio, invisível, com uns 12 centímetros de crista a crista. A placa A manda cinquenta mensagens por segundo nessa onda. A placa B não liga para o conteúdo: ela mede como cada mensagem chegou.

- APONTE: as placas A e B no estande, e na tela a régua de 12 cm em cima da onda.

→ *E a mensagem não vai só em linha reta.*

> **Por que 12 cm?** Comprimento de onda = velocidade da luz ÷ frequência: 300 mil km/s ÷ 2,4 GHz ≈ 12,5 cm.
>
> **Por que ESP32, e não o roteador de casa?** Roteadores comuns não mostram a medida do canal (CSI). A ESP32 mostra, com o programa oficial da Espressif (ESP-CSI), e custa pouco.
>
> **O que vai dentro da mensagem?** Nada importante: é um pacote de teste. O que interessa é como ele chegou, não o que ele diz.

### 4. O sinal chega por vários caminhos. ●
*20 s (curta: 18 s)*

**Fala.** A mensagem sai da placa A para todos os lados. Um pedaço vai direto para a B. Os outros batem no teto, no chão, em quem está na sala, e chegam um pouquinho depois. A B recebe tudo junto.

- DEIXE A ANIMAÇÃO: os pontinhos saem juntos de A; os dos caminhos longos chegam depois.
- APONTE: o caminho que bate na pessoa.

→ *Na placa B, esses caminhos se encontram.*

> **Quanto "depois" chega o caminho rebatido?** Bilionésimos de segundo: a onda anda 30 cm por nanossegundo. Numa sala, os caminhos diferem de 1 a 25 m, ou seja, de 3 a 80 ns.

### 5. Quem se mexe muda a soma. ●
*30 s (curta: 26 s)*

**Fala.** Na placa B, os caminhos se somam. Crista com crista, o sinal fica forte; crista com vale, um apaga o outro. Quando alguém anda, o caminho que passa por ela muda de tamanho. Basta meia onda, uns 6 centímetros, para trocar crista por vale. Por isso a soma sobe e desce a cada passo. Essa é a ideia do projeto inteiro.

- APONTE: embaixo, o caminho direto, o que passa pela pessoa e a soma, mais grossa, subindo e descendo no ritmo dos passos.
- ANALOGIA: duas pessoas balançando a mesma corda, no mesmo ritmo ou em ritmos opostos.

→ *Só que o Wi-Fi não usa uma onda só: usa 64.*

> **Isso tem nome?** Interferência: construtiva (reforça) e destrutiva (cancela). No Wi-Fi, o efeito se chama desvanecimento por múltiplos percursos (multipath fading).
>
> **6 cm não é muito pouco?** Para uma onda de 12 cm, 6 cm é meia volta. Um movimento de braço já passa disso; por isso o sinal é tão sensível a movimento.

### 6. O Wi-Fi usa 64 ondas juntas. ●
*22 s (curta: 18 s)*

**Fala.** O canal do Wi-Fi é dividido em 64 ondas, de tamanhos um pouquinho diferentes. Cada uma soma de um jeito: umas chegam fortes, outras fracas. A placa B mede as 64 de uma vez. Esse conjunto se chama CSI.

- APONTE: a barra que veio da cena anterior; depois, as outras 63 nascendo da placa B.

→ *Espalhar o sinal por várias frequências tem uma inventora.*

> **O que é CSI?** Channel State Information: para cada uma das 64 partes do canal, quanto a viagem mudou a força e a fase da onda. Usamos só a força (amplitude).
>
> **Por que 64?** O canal de 20 MHz do Wi-Fi é dividido em 64 subportadoras, a cada 312,5 kHz. Algumas ficam vazias (bordas e centro): são os pontinhos sem barra.

### 7. Uma ideia de Hedy Lamarr. ●
*30 s (curta: 18 s)*

**Fala.** O tema desta JACITEC é Ciência Delas, e essa parte do Wi-Fi tem uma inventora. Em 1942, a atriz Hedy Lamarr e o compositor George Antheil patentearam o salto de frequência: o rádio pula de uma frequência para outra, numa ordem que só quem manda e quem recebe conhecem. A ordem vinha de um rolo de pianola, com 88 frequências, uma para cada tecla do piano. A ideia era guiar torpedos sem que o inimigo bloqueasse o sinal. Espalhar o sinal por várias frequências virou base da comunicação sem fio: o Bluetooth pula de frequência até hoje, e o Wi-Fi de hoje usa as 64 de uma vez.

- APONTE: o rosto dela, feito com as mesmas linhas do sinal (de uma foto de 1940).
- APONTE: o rolo descendo; cada furo que passa pela barra de leitura acende uma frequência, uma de cada vez.
- FALE: o tema da JACITEC, "Ciência Delas: Mulheres em Ciência, Tecnologia e Inovação".
- NÃO DIGA: que ela inventou o Wi-Fi. Ela inventou o salto de frequência, uma das ideias que abriram caminho.

→ *Hoje, as 64 acendem juntas. E viram uma linha.*

> **Ela inventou o Wi-Fi?** Não o Wi-Fi inteiro. Ela inventou, com George Antheil, o salto de frequência, uma forma de espalhar o sinal por várias frequências. O Bluetooth usa salto de frequência até hoje, e a primeira versão do Wi-Fi, de 1997, tinha um modo com salto. O Wi-Fi de hoje espalha o sinal de outro jeito (as 64 ondas ao mesmo tempo).
>
> **Funcionou na guerra?** A Marinha dos EUA não adotou na época, e a patente venceu sem que ela ganhasse dinheiro com ela. O reconhecimento veio depois: o prêmio Pioneer da Electronic Frontier Foundation, em 1997, e o Hall da Fama dos Inventores dos EUA, em 2014.
>
> **Por que um rolo de pianola?** O transmissor e o receptor precisavam pular juntos, na mesma ordem. Antheil era compositor e já sincronizava pianolas; os rolos perfurados guardavam a ordem, como uma partitura. A patente é a nº 2.292.387, de 11 de agosto de 1942.
>
> **De onde vem o retrato?** De uma foto de 1940, de Clarence Bull para o estúdio MGM, que está em domínio público. Nós desenhamos o rosto com as mesmas linhas que mostram o sinal do Wi-Fi: onde a foto é mais clara, a linha sobe e fica mais forte. Não é imagem gerada por IA.
>
> **O que é o tema "Ciência Delas"?** É o tema da JACITEC 2026: "Ciência Delas: Mulheres em Ciência, Tecnologia e Inovação". É também o tema da Semana Nacional de Ciência e Tecnologia deste ano.

### 8. Cada instante vira uma linha. ●
*18 s (curta: 15 s)*

**Fala.** Ligando o topo das 64 barras, temos uma linha. Chega uma nova a cada décimo de segundo e empurra as outras para cima. São as linhas do começo: quando elas tremem, alguém se mexeu.

- APONTE: a linha de baixo, mais grossa (agora), e as de cima (o passado).

→ *Para o computador decidir sozinho, o tremor vira um número.*

> **Cada linha é uma mensagem?** É a média das mensagens de 0,1 s (cerca de 5). O desenho realça o tremor 3 vezes para ficar visível; a detecção usa os valores sem realce.

### 9. Um número diz o quanto tremeu.
*22 s*

**Fala.** O número compara o tremor de agora com o da sala vazia, que vale 1,0. Quando passa da linha tracejada, o sistema marca movimento.

- APONTE: o número e a linha tracejada.
- ESPERE: o tremidinho curto no fim do ciclo, que fica abaixo da linha: "um pico solto não dispara".

→ *E com as placas de verdade, funcionou?*

> **Como o número é calculado?** Primeiro, cada pacote é ajustado para o mesmo volume, porque a placa muda o volume sozinha (ganho automático). Depois, para cada subportadora, o desvio padrão da amplitude em 1 segundo, e a média entre elas, a cada 0,2 s. Divide pelo valor da sala vazia, medido na calibração.
>
> **Por que ajustar o volume?** Nos testes, com a sala vazia, o número pulava sozinho de 0,8 a 4,8: era a placa subindo e descendo o volume. Ajustando cada pacote, a sala vazia ficou estável e a pessoa andando passou a se destacar.
>
> **E a linha tracejada?** Média da sala vazia + 3 desvios, no mínimo 1,3×. Três medidas seguidas acima viram "movimento"; cinco abaixo voltam a "parado".

## III · O experimento

### 10. O que os testes mostraram.
*35 s*

**Fala.** Gravamos 30 segundos com a sala vazia e 30 com alguém cruzando a linha entre as placas. Cada traço é o tremor medido de verdade, e o limite tracejado sai da sala vazia. A pessoa cruzou a linha 7 vezes, e o sistema percebeu as 7. Com a sala vazia, deu 2 alarmes curtos. Num outro teste, a 3,75 metros e com uma parede no meio, ele também percebeu a pessoa andando. É um teste de cada: mostra que funciona, ainda não é a taxa de acerto.

- APONTE: a linha de cima (sala vazia), quase reta; o limite tracejado; a de baixo subindo a cada travessia.
- APONTE: os números 1 a 7 em cima de cada travessia, e os 2 "alarme" na sala vazia.
- FALE: "é um teste de cada". Nunca transforme em porcentagem.

→ *E o que o sistema não consegue ver?*

> **Quanto ele acerta?** Ainda não medimos a taxa de acerto com um teste separado. O que temos são testes de montagem: num deles, a pessoa cruzou a linha 7 vezes e ele detectou as 7; com a sala vazia, 2 alarmes curtos em 30 segundos. O próximo passo é gravar sessões separadas, uma para ajustar e outra para testar.
>
> **Por que não têm a porcentagem de acerto?** Porque ainda não fizemos as sessões separadas (uma para ajustar, outra para testar). Preferimos não dar um número que não foi medido do jeito certo.
>
> **Por que separar as gravações?** Se o limite é escolhido e conferido nas mesmas gravações, o resultado sai bom demais, como fazer a prova com as questões da lista de exercícios. Gravações vizinhas da mesma sessão também são quase iguais; por isso a separação é por sessão.
>
> **Que problemas vocês tiveram?** Três. 1) O roteador ao lado da placa B fazia metade dos pacotes se perder (a placa escuta todo o tráfego do canal). 2) O cabo USB só leva umas 72 linhas por segundo, então baixamos a placa A de 100 para 50 pacotes por segundo. 3) O ganho automático da placa fazia a sala vazia "tremer"; ajustamos o volume de cada pacote. Depois disso, chegaram de 76% a 92% dos pacotes e a sala vazia ficou estável.
>
> **Por que comparar com o chute?** Quando houver porcentagem: se 80% das gravações são "parado", responder sempre "parado" já acerta 80%. O resultado só vale alguma coisa acima disso.

### 11. Pessoa parada não aparece. Ainda. ●
*24 s (curta: 20 s)*

**Fala.** Se a pessoa fica parada, a soma não muda e as linhas ficam calmas: o sistema percebe movimento, não presença. Mas quem está parado ainda respira. Em 2024, um grupo de pesquisa mediu a respiração de 8 pessoas com a mesma placa ESP32 que a gente usa, errando em média 2,6 respirações por minuto. É o nosso próximo passo.

- FAÇA: o Jogo da Estátua; alguém fica parado entre as placas e "some" para o Wi-Fi.

→ *E para que serve perceber uma respiração?*

> **Vocês mediram isso?** Mostramos ao vivo, no Jogo da Estátua. Nos testes, entre uma travessia e outra, quando a pessoa sai da linha, o número volta ao nível da sala vazia. Gravações com a pessoa parada ainda não fizemos.
>
> **De onde vem o estudo da respiração?** Burimas e outros, "Monitoring the Sleep Respiratory Rate with Low-Cost Microcontroller Wi-Fi in a Controlled Environment", Applied Sciences, 2024. Usaram a ESP32 e compararam com uma cinta de respiração no peito, em 8 pessoas: erro médio de 2,6 respirações por minuto (1,4 com respiração normal).
>
> **Quais são os outros limites?** Distância entre as placas, paredes, várias pessoas ao mesmo tempo, interferência de outras redes e objetos que se mexem (ventilador, cortina, bicho). Cada lugar precisa calibrar de novo.

## IV · Para que serve

### 12. Alguém vivo debaixo dos escombros? ●
*30 s (curta: 25 s)*

**Fala.** Depois de um deslizamento ou de um desabamento, a pergunta é: onde ainda tem alguém vivo? Em 2015, no terremoto do Nepal, um radar da NASA, o FINDER, achou quatro homens soterrados pela respiração e pelos batimentos. Esse radar é caro. A nossa ideia é testar o mesmo com placas de Wi-Fi baratas: já percebemos uma pessoa andando através de uma parede. O que falta é a respiração.

- APONTE: a pessoa no vão entre as lajes e, embaixo, as linhas subindo e descendo devagar, no ritmo de uma respiração.
- FALE: o desenho é ilustração: é a ideia que queremos testar.
- NÃO DIGA: que o nosso sistema já acha pessoas em escombros.

→ *Isso é o futuro. E o que já dá para fazer, com o que medimos?*

> **O Wi-Fi atravessa escombros?** Em parte. O entulho enfraquece muito o sinal, e a pesquisa com Wi-Fi para isso ainda é inicial (Khan e outros estudam exatamente essa dificuldade na IEEE Access, em 2019). O FINDER é um radar feito para isso. A vantagem do Wi-Fi seria o custo.
>
> **O que é o FINDER?** Um radar do JPL, o laboratório da NASA, feito com o Departamento de Segurança Interna dos EUA, do tamanho de uma mala. Em 2015, no terremoto do Nepal, ajudou a achar 4 homens soterrados sob até 3 m de tijolo e lama, pela respiração e pelos batimentos.
>
> **Isso acontece no Brasil?** Nos deslizamentos de Petrópolis, em fevereiro de 2022, morreram mais de 200 pessoas, e 24 foram tiradas vivas nos primeiros dias. Achar rápido onde ainda tem alguém vivo faz diferença.

### 13. Dá para montar com pouco.
*22 s*

**Fala.** São duas placas baratas, o programa aberto da Espressif e um notebook; a tela e a análise são nossas, em JavaScript e Python. E isso já está saindo do laboratório: desde 2025 existe um padrão do Wi-Fi só para sensoriamento, o 802.11bf, e nos Estados Unidos a operadora Comcast oferece a detecção de movimento no próprio roteador dos clientes, para quem ativar.

- FALE: o preço que pagaram nas placas (e preencham CUSTO no roteiro.js para ele aparecer na tela).

→ *E o que já dá para fazer em casa?*

> **Isso já existe no mercado?** Sim. A Comcast oferece o "WiFi Motion" nos roteadores dos clientes nos EUA (opcional, vem desligado). Empresas como a Cognitive Systems vendem o programa para fabricantes de roteadores. E em 2025 o IEEE publicou o 802.11bf, um padrão só para sensoriamento por Wi-Fi.
>
> **Como isso cresce?** Hoje são duas placas por cômodo. O caminho natural é o próprio roteador fazer a medida, como no 802.11bf e no produto da Comcast: aí não precisa comprar nada a mais. O programa da placa é aberto, e cada cômodo só precisa ser calibrado uma vez.

### 14. Quem mora sozinho. ●
*30 s (curta: 25 s)*

**Fala.** No Brasil, 5,7 milhões de idosos moram sozinhos, e o Espírito Santo é o terceiro estado com mais casas de uma pessoa só. Quedas são a segunda maior causa de morte por acidente no mundo. Com as placas, a casa aprende a rotina: se até as dez da manhã ninguém se mexeu, ela manda uma mensagem para a família. Não precisa de câmera nem de pulseira, e usa só o que o nosso detector já faz: dizer se teve movimento.

- APONTE: ontem, o dia cheio de movimentos desde as 6h40; hoje, nada desde a noite, e o aviso às 10h.
- FALE: é uma ideia de uso; ainda não testamos ao longo de dias.

→ *Mas tem o outro lado.*

> **E se a pessoa só dormiu até mais tarde?** O horário se ajusta à rotina de cada um, e o aviso pode primeiro perguntar "está tudo bem?" no celular da própria pessoa, antes de chamar a família.
>
> **De onde vêm os números?** Censo 2022 do IBGE, divulgado em outubro de 2024: 5,66 milhões de pessoas com 60 anos ou mais moram sozinhas no Brasil. No Espírito Santo, 20,6% dos lares têm um morador só, o 3º maior do país. As quedas: OMS, ficha "Falls", 2021: segunda maior causa de morte por lesão acidental.
>
> **Isso já existe?** Empresas já vendem sensoriamento por Wi-Fi para cuidado de idosos, como a Origin Wireless, nos EUA. Os números de acerto que elas divulgam são delas mesmas.

### 15. E a privacidade? ●
*22 s (curta: 18 s)*

**Fala.** O outro lado: se o sinal atravessa paredes, alguém de fora poderia saber se tem gente em casa. Isso já não é só hipótese: a Comcast avisa que os dados do detector dela podem ser entregues à polícia com ordem judicial. Por isso medimos até onde funciona e defendemos regras: só com consentimento, e o dado fica dentro de casa, como no nosso projeto.

- PERGUNTE: "Você gostaria que o vizinho soubesse quando você está em casa?"

→ *Agora volte para as linhas do começo.*

> **Dá mesmo para ver através da parede?** Pesquisadores do MIT mostraram movimento atrás de parede em 2013 (Wi-Vi), com equipamento especial. Com a nossa placa, num teste, a 3,75 m e com uma parede no meio, percebemos a pessoa andando. Foi um teste só: funciona, mas ainda não sabemos o quanto acerta.
>
> **De onde vem o caso da Comcast?** Dos termos do próprio recurso WiFi Motion, noticiados pelo site BleepingComputer em 18/08/2026: os dados podem ser entregues sem aviso em investigações, disputas ou com ordem judicial. O recurso é opcional e vem desligado.
>
> **E no projeto de vocês, onde ficam os dados?** No notebook. A tela não manda nada para a internet; o apelido e a marca de cada visitante ficam no navegador e são apagados no fim do dia.

### 16. Agora você sabe ler estas linhas. ●
*25 s (curta: 20 s)*

**Fala.** Lembra das linhas do começo? São ondas se somando na placa B. Agora é com você: mexe o braço entre as placas e olha as linhas. Quer um desafio? Atravesse a faixa sem que elas tremam.

- FAÇA: o visitante mexe o braço e depois fica parado.
- FAÇA: abra a Travessia (tecla N).
- SIMULAÇÃO: na simulação ou numa gravação, diga isso.
- AVALIADOR: "Usamos um assistente de IA como apoio no código e nos textos. Revisamos tudo, e os dados são medidos por nós."

## Perguntas que podem aparecer em qualquer momento

- **Dá para saber quem é a pessoa?** Não. O sistema mede o quanto o sinal tremeu, não forma, rosto ou nome. Ele percebe movimento.
- **E se tiver duas pessoas?** O tremor fica maior, mas o sistema não conta pessoas. Contar é um próximo passo, e ainda não testamos.
- **Ventilador ou cortina disparam?** Podem disparar, porque também mudam os caminhos do sinal. Por isso calibramos com a sala como ela fica normalmente e testamos com as gravações.
- **Por que não usar inteligência artificial (aprendizado de máquina)?** Primeiro, uma regra simples que dá para explicar e conferir. Um classificador (Random Forest) só entra se a regra funcionar com dados reais e sobrar tempo, e sempre testado por sessão.
- **Usaram IA no projeto?** Sim, um assistente de IA como apoio para consultar documentação, escrever partes do código e revisar textos. Tudo foi revisado e testado pela equipe, e os dados são medidos por nós.
- **Por que 50 pacotes por segundo, e não 100?** Cada medida vira uma linha de ~1.280 letras no cabo USB, e o cabo leva umas 72 por segundo. Com 100, sempre se perdiam pelo menos 20%. Com 50 sobra folga, e o detector precisa de só 10 por segundo.
- **O que ainda é simulação?** As ilustrações da história usam um modelo do canal com 4 caminhos. Os escombros e o aviso para a família são ideias de uso, ainda não testadas. Na feira, as linhas e o número vêm das placas. Resultados, só os medidos.

# Colinha da apresentação "Como funciona"

Gerada por `ferramentas/colinha.py` a partir do `demo/roteiro.js`. Não edite aqui: edite o roteiro e gere de novo.

## Antes de tudo (leia isto e já dá para apresentar)

**O projeto em 30 segundos.** "Você sabia que o Wi-Fi consegue perceber a gente? Quase ninguém sabe. O sinal passa pela gente o tempo todo, e isso virou padrão oficial do Wi-Fi só em 2025. A nossa pesquisa é descobrir o que dá para perceber de uma pessoa só com esse sinal, sem câmera. Com duas plaquinhas baratas, a gente percebeu cada vez que alguém cruzou entre elas, até através de uma parede. Quer testar? Mexe o braço aqui."

**As 3 ideias que a pessoa tem que levar para casa:**

1. O Wi-Fi consegue perceber gente, sem câmera, e isso é novo: virou padrão oficial do Wi-Fi em 2025.
2. Como: o sinal chega por vários caminhos que se somam; quem se mexe muda essa soma, e as linhas tremem.
3. Funcionou (7 travessias, 7 detecções; e através de uma parede). Serve para coisas boas, mas pede cuidado com a privacidade.

**Como falar.** É conversa, não prova oral. Não precisa decorar: leia a fala uma vez e conte do seu jeito. Comece pelo que a pessoa vê na tela, use "você" e faça perguntas. Se não souber algo, diga "boa pergunta, isso a gente ainda vai testar": é pesquisa, e pesquisa tem próximo passo.

- **Completa:** 15 cenas, cerca de 6:13 (para avaliador ou quem quer ver tudo).
- **Curta:** 14 cenas, cerca de 4:12 (para visitante). As cenas da curta estão marcadas com ●.
- Na janela do apresentador (tecla P na TV), a mesma colinha aparece cena a cena. A tecla Q mostra as perguntas.

Como ler cada cena: a **fala** é o que dizer. As **ações** dizem o que fazer: APONTE, PERGUNTE (e espere a resposta), FAÇA, DEIXE A ANIMAÇÃO (fique quieto um segundo). A **ponte** leva para a próxima cena. Embaixo, as perguntas que podem aparecer.

### 1. Detectar movimento só com o Wi-Fi. ●
*35 s (curta: 30 s)*

**Fala.** Bom dia, pessoal! A gente é o Augusto e o Daniel, e este é o nosso trabalho: detectar movimento usando só o Wi-Fi. A ideia é descobrir onde isso pode ser usado, quais são os limites e quais são os perigos, como a privacidade. É uma pesquisa bem recente, pouco explorada, e ainda tem muita coisa para descobrir. O que a gente fez: estas duas placas medem o Wi-Fi e mandam para o nosso site, que diz se alguém se mexeu ou não. Já já a gente explica cada parte.

- APONTE: as duas placas de verdade e a tela com o site.
- FALE: devagar e olhando para as pessoas (à tarde, "boa tarde"). É aqui que elas decidem se vão ficar.

→ *A primeira coisa: o Wi-Fi, na verdade, é uma onda.*

> **Então é um detector de movimento?** É uma pesquisa sobre o que o Wi-Fi consegue perceber das pessoas. Perceber movimento é a primeira coisa que a gente fez funcionar; a partir dela, a gente estuda os limites, os usos e os riscos.
>
> **Tem câmera ou sensor escondido?** Não. São só duas placas de Wi-Fi: uma manda mensagens e a outra mede como elas chegaram. Pode olhar as placas.

## I · Como funciona

### 2. Primeiro: o Wi-Fi é uma onda. ●
*20 s (curta: 12 s)*

**Fala.** O Wi-Fi é uma onda de rádio, invisível, com uns 12 centímetros de uma crista até a outra. A placa A fala: ela manda 50 mensagens por segundo nessa onda. A placa B escuta, mas não liga para o que a mensagem diz: ela mede como a mensagem chegou.

- APONTE: as placas A e B de verdade, no estande.
- APONTE: a régua de 12 cm em cima da onda.

→ *E a mensagem não vai só em linha reta.*

> **Por que 12 cm?** Comprimento de onda = velocidade da luz ÷ frequência: 300 mil km/s ÷ 2,4 GHz ≈ 12,5 cm.
>
> **Por que ESP32, e não o roteador de casa?** O roteador comum não mostra a medida do canal (CSI). A ESP32 mostra, com o programa oficial e aberto da fabricante (ESP-CSI), e custa pouco.
>
> **O que vai dentro da mensagem?** Nada importante: é um pacote de teste. O que interessa é como ele chegou, não o que ele diz.

### 3. O sinal chega por vários caminhos. ●
*18 s (curta: 12 s)*

**Fala.** A mensagem sai da placa A para todo lado, tipo eco. Um pedaço vai reto até a B; outros batem no teto, no chão, em você, e chegam um tiquinho depois. A placa B recebe tudo misturado.

- DEIXE A ANIMAÇÃO: os pontinhos saem juntos; os dos caminhos longos chegam depois.
- APONTE: o caminho que bate na pessoa. "Esse aqui é você."

→ *E o que acontece quando esses caminhos se encontram na placa B?*

> **Quanto "depois" chega o caminho rebatido?** Bilionésimos de segundo: a onda anda 30 cm por nanossegundo. Numa sala, os caminhos diferem de 1 a 25 m, ou seja, de 3 a 80 ns.

### 4. Quem se mexe muda a soma. ●
*30 s (curta: 22 s)*

**Fala.** Aqui está o segredo do projeto. Na placa B, os caminhos se somam. Se chegam crista com crista, o sinal fica forte; crista com vale, um apaga o outro. Quando você anda, o caminho que passa por você muda de tamanho. Uns 6 centímetros, meia onda, já trocam forte por fraco. Por isso a soma sobe e desce a cada passo.

- APONTE: embaixo, o caminho direto, o que passa pela pessoa e a soma, mais grossa, subindo e descendo no ritmo dos passos.
- ANALOGIA: duas pessoas balançando a mesma corda. No mesmo ritmo, a onda cresce; em ritmos opostos, ela some.

→ *E como a gente vê isso na tela?*

> **Isso tem nome?** Interferência: construtiva (reforça) e destrutiva (cancela). No Wi-Fi, o efeito se chama desvanecimento por múltiplos percursos (multipath fading).
>
> **6 cm não é muito pouco?** Para uma onda de 12 cm, 6 cm é meia volta. Um movimento de braço já passa disso; por isso o sinal é tão sensível a movimento.

### 5. Cada instante vira uma linha. ●
*20 s (curta: 14 s)*

**Fala.** É assim que a gente enxerga isso na tela. O Wi-Fi manda o sinal em vários pedacinhos de frequência ao mesmo tempo, e a placa B mede a força de cada um. Juntando essas medidas, sai uma linha, e as linhas vão se empilhando: a de baixo é agora, as de cima são o passado. Sala parada, linhas calmas. Alguém se mexeu, as linhas tremem.

- APONTE: a linha de baixo, mais grossa (agora), e as de cima (o passado).
- APONTE: as linhas da tela principal: "agora vocês sabem ler isso".

→ *Para o computador decidir sozinho, o tremor vira um número.* (na curta: *E com as placas de verdade, funcionou?*)

> **O que é CSI?** Channel State Information, a informação do estado do canal: para cada um dos 64 pedacinhos do canal, quanto a viagem mudou a força e a fase da onda. A gente usa a força (amplitude).
>
> **Por que 64?** O canal de 20 MHz do Wi-Fi é dividido em 64 subportadoras, a cada 312,5 kHz. Algumas ficam vazias (nas bordas e no centro).
>
> **Cada linha é uma mensagem?** É a média das mensagens de 0,1 s (cerca de 5). O desenho realça o tremor 3 vezes para ficar visível; a detecção usa os valores sem realce.

### 6. Um número diz o quanto tremeu.
*20 s*

**Fala.** O computador compara o tremor de agora com o da sala vazia, que vale 1,0. Passou da linha tracejada, ele marca movimento. E um tremidinho solto não engana: precisa de três medidas seguidas.

- APONTE: o número e a linha tracejada.
- ESPERE: o tremidinho curto no fim do ciclo, que fica abaixo da linha: "um pico solto não dispara".

→ *E com as placas de verdade, deu certo?*

> **Como o número é calculado?** Primeiro, cada pacote é ajustado para o mesmo volume, porque a placa muda o volume sozinha (ganho automático). Depois, para cada subportadora, o desvio padrão da amplitude em 1 segundo, e a média entre elas, a cada 0,2 s. Divide pelo valor da sala vazia, medido na calibração.
>
> **Por que ajustar o volume?** Nos testes, com a sala vazia, o número pulava sozinho de 0,8 a 4,8: era a placa subindo e descendo o volume. Ajustando cada pacote, a sala vazia ficou estável e a pessoa andando passou a se destacar.
>
> **E a linha tracejada?** Média da sala vazia + 3 desvios, no mínimo 1,3×. Três medidas seguidas acima viram "movimento"; cinco abaixo voltam a "parado".

## II · O experimento

### 7. Testamos de verdade, e funcionou. ●
*30 s (curta: 20 s)*

**Fala.** Hora da verdade. Gravamos 30 segundos com a sala vazia e 30 com alguém cruzando entre as placas. Cada risco é o sinal medido de verdade. A pessoa cruzou 7 vezes, e o sistema marcou as 7, uma por uma. Em cada travessia, o sinal chegou a quase 6 vezes o da sala vazia. E num outro teste, a 3,75 metros e com uma parede no meio, ele percebeu a pessoa andando do outro lado.

- APONTE: os números 1 a 7 acendendo em cima de cada travessia.
- APONTE: os três números embaixo: 7 de 7, quase 6 vezes, e a parede.
- SE PERGUNTAREM DE PORCENTAGEM: a resposta está na tecla Q. Nunca invente uma.

→ *E o que ele ainda não consegue ver?*

> **Quanto ele acerta?** Ainda não calculamos uma porcentagem: para isso, a pesquisa precisa de muitas gravações, umas para ajustar e outras só para testar. É o nosso próximo passo. O que já medimos: 7 travessias, 7 detecções; com a sala vazia, 2 alarmes curtos em 30 segundos.
>
> **Como vocês testaram?** Duas montagens em casa: placas a 1,5 m, sem parede, e a 3,75 m, com uma parede no meio. Em cada uma, 30 s de sala vazia (para calibrar o limite) e 30 s com uma pessoa se mexendo. A mesma regra roda no Python e na tela da demonstração.
>
> **Por que separar as gravações para medir o acerto?** Se o limite é escolhido e conferido nas mesmas gravações, o resultado sai bom demais, como fazer a prova com as questões da lista de exercícios. Por isso a separação é por sessão.
>
> **Que problemas vocês resolveram?** Três. O roteador ao lado da placa B fazia metade dos pacotes se perder: afastamos. O cabo USB só leva umas 72 linhas por segundo: baixamos a placa A de 100 para 50 pacotes por segundo. E o ganho automático da placa fazia a sala vazia "tremer": ajustamos o volume de cada pacote. Depois disso, chegaram de 76% a 92% dos pacotes e a sala vazia ficou estável.
>
> **De onde vem o "quase 6 vezes"?** Dos mesmos dados do gráfico: o maior tremor com a pessoa cruzando dividido pelo tremor típico (mediana) da sala vazia dá 5,9.

### 8. Pessoa parada não aparece. Ainda. ●
*22 s (curta: 16 s)*

**Fala.** Quer brincar de estátua? Fica paradinho entre as placas... sumiu! Para o Wi-Fi, quem está parado não muda a soma. Mas parado você ainda respira, e em 2024 pesquisadores mediram a respiração de 8 pessoas com essa mesma plaquinha. É o próximo passo da nossa pesquisa.

- FAÇA: o Jogo da Estátua. A pessoa fica parada entre as placas e "some" para o Wi-Fi.

→ *E essa área de pesquisa é bem nova. Olha só.*

> **De onde vem o estudo da respiração?** Burimas e outros, "Monitoring the Sleep Respiratory Rate with Low-Cost Microcontroller Wi-Fi in a Controlled Environment", Applied Sciences, 2024. Usaram a ESP32 e compararam com uma cinta de respiração no peito, em 8 pessoas: erro médio de 2,6 respirações por minuto (1,4 com respiração normal).
>
> **Vocês mediram a pessoa parada?** Mostramos ao vivo, no Jogo da Estátua. Nos testes, entre uma travessia e outra, quando a pessoa sai da linha, o número volta ao nível da sala vazia. Gravações só com a pessoa parada são a próxima rodada.
>
> **O que mais atrapalha?** Distância entre as placas, várias pessoas ao mesmo tempo, outras redes no mesmo canal e coisas que se mexem sozinhas (ventilador, cortina, bicho). Por isso cada lugar é calibrado de novo.

## III · Ciência de agora

### 9. Isso é ciência de agora. ●
*25 s (curta: 18 s)*

**Fala.** Isso é ciência de agora. Em 2013, o grupo da professora Dina Katabi, no MIT, mostrou o Wi-Fi percebendo gente se mexendo atrás de uma parede, com equipamento de rádio especial e caro. Em 2025, isso virou padrão oficial do Wi-Fi, o 802.11bf, e nos Estados Unidos já tem roteador fazendo isso na casa das pessoas. A nossa novidade é fazer com duas placas ESP32 baratinhas, programas abertos e um notebook. Dá para qualquer escola repetir.

- APONTE: cada ponto da linha do tempo acendendo.
- APONTE: as placas de verdade: "o nosso é só isso aqui".
- FALE: o preço que pagaram nas placas (e preencham CUSTO no roteiro.js para ele aparecer na tela).

→ *E essa história tem uma inventora lá no começo.*

> **Se já existe, qual é a novidade de vocês?** A tecnologia é nova e pouca gente conhece. Os produtos são fechados; a gente montou do zero com duas placas baratas e programas abertos, mediu, testou com gravações reais e explica ao público como funciona, com os riscos.
>
> **O que é o 802.11bf?** É a parte do padrão Wi-Fi, publicada pelo IEEE em 2025, que define como os aparelhos de Wi-Fi podem medir o ambiente: perceber presença e movimento, além de levar internet.
>
> **Quem é Dina Katabi?** Professora do MIT, uma das pesquisadoras mais conhecidas da área. Em 2013, com Fadel Adib, apresentou o Wi-Vi, que percebia pessoas se mexendo atrás de uma parede usando Wi-Fi.
>
> **Isso já existe no mercado?** Sim. A Comcast oferece o "WiFi Motion" nos roteadores dos clientes nos EUA (é opcional). Empresas como a Cognitive Systems vendem o programa para fabricantes de roteadores. E em 2025 o IEEE publicou o 802.11bf, um padrão só para sensoriamento por Wi-Fi.
>
> **Como isso cresce?** Hoje são duas placas por cômodo. O caminho natural é o próprio roteador fazer a medida, como no 802.11bf e no produto da Comcast: aí não precisa comprar nada a mais. O programa da placa é aberto, e cada cômodo só precisa ser calibrado uma vez.

## Ciência Delas

### 10. A inventora Hedy Lamarr. ●
*35 s (curta: 22 s)*

**Fala.** O tema desta JACITEC é Ciência Delas, e o Wi-Fi tem uma inventora na sua história: Hedy Lamarr, uma das atrizes mais famosas de Hollywood, que nas horas vagas inventava. Na Segunda Guerra, ela e o compositor George Antheil criaram o salto de frequência: o rádio pula de uma frequência para outra numa ordem secreta, guardada num rolo de pianola. Patentearam em 1942, mas a Marinha engavetou a ideia, e por décadas ela foi lembrada só pelos filmes. O reconhecimento como inventora veio em 1997, mais de 50 anos depois. Hoje, espalhar o sinal por várias frequências é base da comunicação sem fio, e o Bluetooth pula de frequência até hoje. E a história continua com mulheres: lembra da Dina Katabi, do MIT, na linha do tempo?

**Na curta.** Tema da JACITEC: Ciência Delas. Hedy Lamarr era uma atriz famosa de Hollywood, e também inventora. Em 1942, ela e George Antheil patentearam o salto de frequência: o rádio pula de frequência numa ordem secreta, guardada num rolo de pianola. A Marinha engavetou a ideia, e o reconhecimento só veio em 1997. Hoje, espalhar o sinal por várias frequências é base da comunicação sem fio.

- APONTE: o rosto dela, feito com as mesmas linhas do sinal (de uma foto de 1940).
- APONTE: o rolo descendo; cada furo que passa pela barra de leitura acende uma frequência, uma de cada vez.
- FALE: o tema da JACITEC, "Ciência Delas: Mulheres em Ciência, Tecnologia e Inovação".
- CUIDADO: ela não inventou o Wi-Fi. Ela inventou o salto de frequência, uma das ideias que abriram o caminho.

→ *E para que serve tudo isso?*

> **Ela inventou o Wi-Fi?** Não o Wi-Fi inteiro. Ela inventou, com George Antheil, o salto de frequência, uma forma de espalhar o sinal por várias frequências. O Bluetooth usa salto de frequência até hoje, e a primeira versão do Wi-Fi, de 1997, tinha um modo com salto. O Wi-Fi de hoje espalha o sinal de outro jeito: vários pedacinhos de frequência ao mesmo tempo.
>
> **Por que uma atriz inventou isso?** Ela gostava de inventar e aprendeu muito sobre armas e rádio ouvindo as conversas do primeiro marido, um fabricante de armas. Na guerra, os torpedos guiados por rádio podiam ser bloqueados pelo inimigo; o salto de frequência resolvia isso. Antheil, compositor, trouxe a ideia de sincronizar tudo com rolos de pianola.
>
> **Funcionou na guerra?** A Marinha dos EUA não adotou na época, e a patente venceu sem que ela ganhasse dinheiro. O reconhecimento veio depois: o prêmio Pioneer da Electronic Frontier Foundation, em 1997, e o Hall da Fama dos Inventores dos EUA, em 2014.
>
> **E hoje, tem mulheres nessa área?** Sim. Uma das mais conhecidas é Dina Katabi, professora do MIT. Em 2013, o grupo dela, com Fadel Adib, apresentou o Wi-Vi: Wi-Fi percebendo pessoas que se mexem atrás de uma parede. É a mesma área da nossa pesquisa.
>
> **Por que um rolo de pianola?** O transmissor e o receptor precisavam pular juntos, na mesma ordem. Antheil já sincronizava pianolas; os rolos perfurados guardavam a ordem, como uma partitura. A patente é a nº 2.292.387, de 11 de agosto de 1942.
>
> **De onde vem o retrato?** De uma foto de 1940, de Clarence Bull para o estúdio MGM, em domínio público. Nós desenhamos o rosto com as mesmas linhas que mostram o sinal do Wi-Fi: onde a foto é mais clara, a linha sobe. Não é imagem gerada por IA.

## IV · Para que serve

### 11. E para que serve isso? ●
*15 s (curta: 10 s)*

**Fala.** E para que serve tudo isso? Perceber movimento sem câmera e sem nada no corpo abre muita porta. Dá para pensar em achar gente viva debaixo de escombros, em cuidar de quem mora sozinho e, aqui no estande, até em brincar. Vamos começar pela mais séria.

- DEIXE A ANIMAÇÃO: alguém andando entre as placas e as linhas tremendo.

→ *Imagina um desabamento.*

> **Já usam isso de verdade?** Já tem produto: nos EUA, a Comcast oferece detecção de movimento nos roteadores dos clientes, e empresas como a Origin Wireless vendem para cuidado de idosos. Achar gente em escombros com Wi-Fi ainda é pesquisa.

### 12. Alguém vivo debaixo dos escombros? ●
*28 s (curta: 20 s)*

**Fala.** Imagina um desabamento. A pergunta mais urgente é: onde ainda tem alguém vivo? Em 2015, no terremoto do Nepal, um radar da NASA, o FINDER, achou quatro homens soterrados pelos sinais da respiração e do coração. Só que esse radar é caro. A nossa ideia é tentar o mesmo com placas de Wi-Fi baratas: a gente já percebeu uma pessoa através de uma parede. Falta a respiração.

- APONTE: a pessoa no vão entre as lajes e, embaixo, as linhas subindo e descendo devagar, no ritmo de uma respiração.
- LEMBRE: o desenho é a ideia para o futuro. Em escombros, a gente ainda não testou.

→ *Isso é o futuro. E o que já dá para fazer hoje?*

> **O Wi-Fi atravessa escombros?** Em parte. O entulho enfraquece muito o sinal, e a pesquisa com Wi-Fi para isso ainda está no começo (Khan e outros estudam essa dificuldade na IEEE Access, em 2019). O FINDER é um radar feito para isso. A vantagem do Wi-Fi seria o preço.
>
> **O que é o FINDER?** Um radar do JPL, o laboratório da NASA, feito com o Departamento de Segurança Interna dos EUA, do tamanho de uma mala. Em 2015, no terremoto do Nepal, ajudou a achar 4 homens soterrados, pela respiração e pelos batimentos.
>
> **Isso acontece no Brasil?** Nos deslizamentos de Petrópolis, em fevereiro de 2022, morreram mais de 200 pessoas, e 24 foram tiradas vivas nos primeiros dias. Achar rápido onde ainda tem alguém vivo faz diferença.

### 13. Quem mora sozinho. ●
*25 s (curta: 18 s)*

**Fala.** No Brasil, 5,7 milhões de idosos moram sozinhos; aqui no Espírito Santo, um em cada cinco lares tem um morador só. Com as placas, a casa aprende a rotina: se até as 10 da manhã ninguém se mexeu, ela manda uma mensagem para a família. Sem câmera, sem pulseira, e usando só o que o nosso detector já faz.

- APONTE: ontem, o dia cheio de movimentos desde as 6h40; hoje, nada desde a noite, e o aviso às 10h.
- DICA: se perguntarem se já testaram por vários dias, diga que esse é um próximo passo.

→ *E tem uma vantagem enorme sobre a câmera: a privacidade.*

> **E se a pessoa só dormiu até mais tarde?** O horário se ajusta à rotina de cada um, e o aviso pode primeiro perguntar "está tudo bem?" no celular da própria pessoa, antes de chamar a família.
>
> **De onde vêm os números?** Censo 2022 do IBGE, divulgado em outubro de 2024: 5,66 milhões de pessoas com 60 anos ou mais moram sozinhas no Brasil. No Espírito Santo, 20,6% dos lares têm um morador só, o 3º maior do país. E, segundo a OMS (2021), quedas são a segunda maior causa de morte por lesão acidental no mundo.
>
> **Isso já existe?** Empresas já vendem sensoriamento por Wi-Fi para cuidado de idosos, como a Origin Wireless, nos EUA. Os números de acerto que elas divulgam são delas mesmas.

### 14. Privacidade: o Wi-Fi não te filma. ●
*25 s (curta: 18 s)*

**Fala.** E aqui está uma grande vantagem: a privacidade. Uma câmera grava o seu rosto, a sua roupa, tudo: você colocaria uma no seu quarto, ou no banheiro? O Wi-Fi não forma imagem nenhuma, ele só percebe que alguém se mexeu. E ainda funciona no escuro e atravessa a parede, onde a câmera não vê nada. No nosso projeto, os dados nem saem do notebook.

- PERGUNTE: "Você colocaria uma câmera no seu quarto?" Espere a resposta.
- APONTE: o campo de visão da câmera batendo na parede, e os anéis do Wi-Fi passando por ela.
- ESPERE: a luz apagar. A câmera não vê nada; o Wi-Fi continua percebendo a pessoa.

→ *E agora, a parte divertida.*

> **Por que não usar câmera?** Câmera grava rosto e intimidade, precisa de luz e não enxerga através da parede. O Wi-Fi não forma imagem: ele só percebe que algo mudou no sinal.
>
> **Atravessa qualquer parede?** Paredes comuns, sim, com o sinal mais fraco; metal e concreto grosso atrapalham bastante. No nosso teste, a 3,75 m, percebemos a pessoa andando do outro lado de uma parede da casa.
>
> **No escuro funciona mesmo?** Sim: o Wi-Fi é onda de rádio, não precisa de luz. A demonstração funciona igual com a luz apagada.
>
> **Então não tem risco nenhum?** Tem: se o sinal atravessa parede, alguém de fora também poderia perceber se tem gente em casa. Nos EUA, os termos do WiFi Motion, da Comcast, dizem que os dados podem ir para a polícia com ordem judicial (noticiado pelo site BleepingComputer). Por isso a gente defende duas regras: só com consentimento, e o dado fica dentro de casa, como no nosso projeto.
>
> **E no projeto de vocês, onde ficam os dados?** No notebook. A tela não manda nada para a internet; o apelido e a marca de cada visitante ficam no navegador e são apagados no fim do dia.

### 15. Agora é a sua vez. ●
*25 s (curta: 20 s)*

**Fala.** E não é só coisa séria: a gente trouxe duas brincadeiras para vocês. A primeira é a Travessia: você tenta passar entre as duas placas sem elas te perceberem. Dica: quem anda bem devagar quase some, porque o sistema percebe movimento. A segunda é Escutar o Wi-Fi: a gente transformou as mudanças do sinal em som, então dá para fechar os olhos e ouvir quando alguém se mexe perto das placas. Quer tentar?

- FAÇA: abra a Travessia (tecla N) e chame a pessoa para a PARTIDA.
- FAÇA: para escutar, aperte E e entregue o fone.
- SIMULAÇÃO: na simulação ou numa gravação, diga isso.
- AVALIADOR: "Usamos um assistente de IA como apoio no código e nos textos. Revisamos tudo, e os dados são medidos por nós."

## Perguntas de quem passa pelo estande

Respostas curtas: uma frase e um sorriso.

- **Faz mal para a saúde?** É o mesmo tipo de sinal do Wi-Fi da sua casa e da escola, com potência parecida à de um roteador comum. A gente não usa nada mais forte que isso.
- **Ele está me filmando?** Não tem câmera nem microfone, pode olhar as placas. Ele só mede como o sinal chegou.
- **Dá para saber quem eu sou?** Não. Ele mede o quanto o sinal tremeu, não forma rosto nem nome. Ele percebe movimento.
- **Funciona com o Wi-Fi da minha casa?** O roteador comum não mostra essa medida; a plaquinha ESP32 mostra, e custa pouco. O padrão novo do Wi-Fi, o 802.11bf, é o caminho para os roteadores fazerem isso sozinhos.
- **Dá para ver através da parede?** Ver uma imagem, não. Perceber que alguém se mexeu, sim: num teste nosso, a 3,75 m, percebemos uma pessoa andando do outro lado da parede.
- **E se eu ficar parado?** Você some para o detector, porque ele percebe movimento. Experimenta o Jogo da Estátua!
- **Quem fez isso?** Nós dois, Augusto e Daniel, com orientação do professor Diego Barcelos Rodrigues. Os programas das placas são da fabricante e abertos; a tela, a análise e os testes são nossos.

## Perguntas que podem aparecer em qualquer momento (mais de avaliador)

- **É uma pesquisa ou um produto?** Uma pesquisa: a gente quis descobrir o que o Wi-Fi consegue perceber de pessoas, montando, medindo e testando. Os usos (escombros, quem mora sozinho) mostram para onde isso pode ir.
- **E se tiver duas pessoas?** O tremor fica maior, mas o sistema não conta pessoas. Contar é um próximo passo.
- **Ventilador ou cortina disparam?** Podem disparar, porque também mudam os caminhos do sinal. Por isso calibramos com a sala como ela fica normalmente.
- **Por que não usar inteligência artificial (aprendizado de máquina)?** Primeiro, uma regra simples que dá para explicar e conferir. Um classificador (Random Forest) entra depois, com mais gravações, sempre testado por sessão.
- **Usaram IA no projeto?** Sim, um assistente de IA como apoio para consultar documentação, escrever partes do código e revisar textos. Tudo foi revisado e testado pela equipe, e os dados são medidos por nós.
- **Por que 50 pacotes por segundo, e não 100?** Cada medida vira uma linha de ~1.280 letras no cabo USB, e o cabo leva umas 72 por segundo. Com 100, sempre se perdiam pelo menos 20%. Com 50 sobra folga, e o detector precisa de só 10 por segundo.
- **O que é desenho e o que é medido?** O que explica a física (ondas, soma, 64 barras) é desenho, com a etiqueta "Ilustração". Escombros e o aviso para a família são ideias de uso. As linhas ao vivo e os resultados dos testes são medidos.

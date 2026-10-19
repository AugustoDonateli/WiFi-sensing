# Colinha da apresentação "Como funciona"

Gerada por `ferramentas/colinha.py` a partir do `demo/roteiro.js`. Não edite aqui: edite o roteiro e gere de novo.

## Antes de tudo (leia isto e já dá para apresentar)

**O projeto em 30 segundos.** "Quase todo lugar tem Wi-Fi, e o sinal passa pela gente o tempo todo. A nossa pesquisa é descobrir o que dá para perceber de uma pessoa só com esse sinal, sem câmera. Com duas plaquinhas baratas, a gente percebeu cada vez que alguém cruzou entre elas, até através de uma parede. Quer testar? Mexe o braço aqui."

**As 3 ideias que a pessoa tem que levar para casa:**

1. O Wi-Fi chega por vários caminhos que se somam; quem se mexe muda essa soma, e as linhas tremem.
2. Funcionou: 7 travessias, 7 detecções; e através de uma parede.
3. Serve para coisas boas (resgate, quem mora sozinho), mas pede cuidado com a privacidade.

**Como falar.** É conversa, não prova oral. Não precisa decorar: leia a fala uma vez e conte do seu jeito. Comece pelo que a pessoa vê na tela, use "você" e faça perguntas. Se não souber algo, diga "boa pergunta, isso a gente ainda vai testar": é pesquisa, e pesquisa tem próximo passo.

- **Completa:** 16 cenas, cerca de 6:08 (para avaliador ou quem quer ver tudo).
- **Curta:** 14 cenas, cerca de 3:50 (para visitante). As cenas da curta estão marcadas com ●.
- Na janela do apresentador (tecla P na TV), a mesma colinha aparece cena a cena. A tecla Q mostra as perguntas.

Como ler cada cena: a **fala** é o que dizer. As **ações** dizem o que fazer: APONTE, PERGUNTE (e espere a resposta), FAÇA, DEIXE A ANIMAÇÃO (fique quieto um segundo). A **ponte** leva para a próxima cena. Embaixo, as perguntas que podem aparecer.

### 1. Estas linhas são o Wi-Fi desta sala. ●
*20 s (curta: 15 s)*

Na simulação, a TV mostra: "Estas linhas imitam o Wi-Fi de uma sala."

**Fala.** Sabe essas linhas? É o Wi-Fi desta sala, medido agora. Mexe o braço aqui, entre as plaquinhas. Viu? Você não encostou em nada e o sinal mudou. A nossa pesquisa é sobre isso: o que o Wi-Fi consegue perceber da gente.

- FAÇA: chame a pessoa para mexer o braço entre as placas.
- ESPERE: as linhas tremerem. É o momento do "uau"; deixe a pessoa curtir.
- SIMULAÇÃO: sem placa, diga que é simulação e use a tecla 3 para alguém "andar".

→ *Mas como isso é possível?*

## I · A pergunta

### 2. E se o Wi-Fi percebesse a gente? ●
*18 s (curta: 12 s)*

**Fala.** O Wi-Fi está em todo lugar e passa pela gente o tempo todo, até agora, enquanto você usa o celular. A pergunta da nossa pesquisa: dá para usar esse mesmo sinal para perceber pessoas? Sem câmera filmando e sem pulseira no braço.

- APONTE: os anéis saindo do roteador e passando pela pessoa.
- PERGUNTE: "Você colocaria uma câmera no seu quarto?" Espere a resposta.

→ *Para testar, a gente trocou o roteador por duas plaquinhas.*

> **Por que não usar câmera?** Câmera grava rosto e intimidade, precisa de luz e não enxerga através da parede. O Wi-Fi não forma imagem: ele só percebe que algo mudou no sinal.
>
> **Isso é coisa nova?** A ideia é estudada há mais de dez anos (em inglês, Wi-Fi sensing) e em 2025 ganhou um padrão oficial do Wi-Fi, o IEEE 802.11bf. A gente montou, mediu e testou com material barato.

## II · Como funciona

### 3. Duas placas: uma fala, a outra escuta. ●
*20 s (curta: 14 s)*

**Fala.** Repara: o roteador virou a placa A. Ela manda 50 mensagens por segundo numa onda de rádio invisível, com uns 12 centímetros de crista a crista. A placa B não liga para o que a mensagem diz: ela mede como a mensagem chegou.

- APONTE: as placas A e B de verdade, no estande.
- APONTE: a régua de 12 cm em cima da onda.

→ *E a mensagem não vai só em linha reta.*

> **Por que 12 cm?** Comprimento de onda = velocidade da luz ÷ frequência: 300 mil km/s ÷ 2,4 GHz ≈ 12,5 cm.
>
> **Por que ESP32, e não o roteador de casa?** O roteador comum não mostra a medida do canal (CSI). A ESP32 mostra, com o programa oficial e aberto da fabricante (ESP-CSI), e custa pouco.
>
> **O que vai dentro da mensagem?** Nada importante: é um pacote de teste. O que interessa é como ele chegou, não o que ele diz.

### 4. O sinal chega por vários caminhos. ●
*18 s (curta: 14 s)*

**Fala.** A mensagem sai da placa A para todo lado, tipo eco. Um pedaço vai reto até a B; outros batem no teto, no chão, em você, e chegam um tiquinho depois. A placa B recebe tudo misturado.

- DEIXE A ANIMAÇÃO: os pontinhos saem juntos; os dos caminhos longos chegam depois.
- APONTE: o caminho que bate na pessoa. "Esse aqui é você."

→ *E o que acontece quando esses caminhos se encontram na placa B?*

> **Quanto "depois" chega o caminho rebatido?** Bilionésimos de segundo: a onda anda 30 cm por nanossegundo. Numa sala, os caminhos diferem de 1 a 25 m, ou seja, de 3 a 80 ns.

### 5. Quem se mexe muda a soma. ●
*30 s (curta: 22 s)*

**Fala.** Aqui está o segredo do projeto. Na placa B, os caminhos se somam. Se chegam crista com crista, o sinal fica forte; crista com vale, um apaga o outro. Quando você anda, o caminho que passa por você muda de tamanho. Uns 6 centímetros, meia onda, já trocam forte por fraco. Por isso a soma sobe e desce a cada passo.

- APONTE: embaixo, o caminho direto, o que passa pela pessoa e a soma, mais grossa, subindo e descendo no ritmo dos passos.
- ANALOGIA: duas pessoas balançando a mesma corda. No mesmo ritmo, a onda cresce; em ritmos opostos, ela some.

→ *E o Wi-Fi não usa uma onda só: usa 64.*

> **Isso tem nome?** Interferência: construtiva (reforça) e destrutiva (cancela). No Wi-Fi, o efeito se chama desvanecimento por múltiplos percursos (multipath fading).
>
> **6 cm não é muito pouco?** Para uma onda de 12 cm, 6 cm é meia volta. Um movimento de braço já passa disso; por isso o sinal é tão sensível a movimento.

### 6. O Wi-Fi usa 64 ondas juntas. ●
*20 s (curta: 14 s)*

**Fala.** O canal do Wi-Fi é dividido em 64 ondas, cada uma de um tamanho um pouquinho diferente. Então cada uma soma de um jeito: umas chegam fortes, outras fracas. A placa B mede as 64 ao mesmo tempo. Essa medida tem nome: CSI, a informação do estado do canal.

- APONTE: a barra que veio da cena anterior; depois, as outras 63 nascendo da placa B.

→ *E usar várias frequências tem uma história. De uma inventora.*

> **O que é CSI?** Channel State Information: para cada uma das 64 partes do canal, quanto a viagem mudou a força e a fase da onda. A gente usa a força (amplitude).
>
> **Por que 64?** O canal de 20 MHz do Wi-Fi é dividido em 64 subportadoras, a cada 312,5 kHz. Algumas ficam vazias (bordas e centro): são os pontinhos sem barra.

## Ciência Delas

### 7. A inventora Hedy Lamarr. ●
*35 s (curta: 22 s)*

**Fala.** O tema desta JACITEC é Ciência Delas, e o Wi-Fi tem uma inventora na sua história: Hedy Lamarr, uma das atrizes mais famosas de Hollywood, que nas horas vagas inventava. Na Segunda Guerra, ela e o compositor George Antheil criaram o salto de frequência: o rádio pula de uma frequência para outra numa ordem secreta, guardada num rolo de pianola. Patentearam em 1942, mas a Marinha engavetou a ideia, e por décadas ela foi lembrada só pelos filmes. O reconhecimento como inventora veio em 1997, mais de 50 anos depois. Hoje, espalhar o sinal por várias frequências é base da comunicação sem fio, e o Bluetooth pula de frequência até hoje. E a história continua com mulheres: uma das pesquisadoras mais conhecidas em Wi-Fi que percebe pessoas é Dina Katabi, professora do MIT.

**Na curta.** Tema da JACITEC: Ciência Delas. Hedy Lamarr era uma atriz famosa de Hollywood, e também inventora. Em 1942, ela e George Antheil patentearam o salto de frequência: o rádio pula de frequência numa ordem secreta, guardada num rolo de pianola. A Marinha engavetou a ideia, e o reconhecimento só veio em 1997. Hoje, espalhar o sinal por várias frequências é base da comunicação sem fio.

- APONTE: o rosto dela, feito com as mesmas linhas do sinal (de uma foto de 1940).
- APONTE: o rolo descendo; cada furo que passa pela barra de leitura acende uma frequência, uma de cada vez.
- FALE: o tema da JACITEC, "Ciência Delas: Mulheres em Ciência, Tecnologia e Inovação".
- CUIDADO: ela não inventou o Wi-Fi. Ela inventou o salto de frequência, uma das ideias que abriram o caminho.

→ *Hoje, as 64 acendem juntas. E viram uma linha.*

> **Ela inventou o Wi-Fi?** Não o Wi-Fi inteiro. Ela inventou, com George Antheil, o salto de frequência, uma forma de espalhar o sinal por várias frequências. O Bluetooth usa salto de frequência até hoje, e a primeira versão do Wi-Fi, de 1997, tinha um modo com salto. O Wi-Fi de hoje espalha o sinal de outro jeito (as 64 ondas ao mesmo tempo).
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

## II · Como funciona (continua)

### 8. Cada instante vira uma linha. ●
*16 s (curta: 12 s)*

**Fala.** Liga o topo das 64 barras e vira uma linha. Chega uma nova a cada décimo de segundo e empurra as outras para cima. São as linhas do começo! Agora você sabe: quando elas tremem, alguém se mexeu.

- APONTE: a linha de baixo, mais grossa (agora), e as de cima (o passado).

→ *Para o computador decidir sozinho, o tremor vira um número.* (na curta: *E com as placas de verdade, deu certo?*)

> **Cada linha é uma mensagem?** É a média das mensagens de 0,1 s (cerca de 5). O desenho realça o tremor 3 vezes para ficar visível; a detecção usa os valores sem realce.

### 9. Um número diz o quanto tremeu.
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

## III · O experimento

### 10. Testamos de verdade, e funcionou. ●
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

### 11. Pessoa parada não aparece. Ainda. ●
*22 s (curta: 16 s)*

**Fala.** Quer brincar de estátua? Fica paradinho entre as placas... sumiu! Para o Wi-Fi, quem está parado não muda a soma. Mas parado você ainda respira, e em 2024 pesquisadores mediram a respiração de 8 pessoas com essa mesma plaquinha. É o próximo passo da nossa pesquisa.

- FAÇA: o Jogo da Estátua. A pessoa fica parada entre as placas e "some" para o Wi-Fi.

→ *E por que perceber uma respiração pode salvar vidas?*

> **De onde vem o estudo da respiração?** Burimas e outros, "Monitoring the Sleep Respiratory Rate with Low-Cost Microcontroller Wi-Fi in a Controlled Environment", Applied Sciences, 2024. Usaram a ESP32 e compararam com uma cinta de respiração no peito, em 8 pessoas: erro médio de 2,6 respirações por minuto (1,4 com respiração normal).
>
> **Vocês mediram a pessoa parada?** Mostramos ao vivo, no Jogo da Estátua. Nos testes, entre uma travessia e outra, quando a pessoa sai da linha, o número volta ao nível da sala vazia. Gravações só com a pessoa parada são a próxima rodada.
>
> **O que mais atrapalha?** Distância entre as placas, várias pessoas ao mesmo tempo, outras redes no mesmo canal e coisas que se mexem sozinhas (ventilador, cortina, bicho). Por isso cada lugar é calibrado de novo.

## IV · Para que serve

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

→ *E montar isso custa caro?* (na curta: *Mas tem o outro lado.*)

> **E se a pessoa só dormiu até mais tarde?** O horário se ajusta à rotina de cada um, e o aviso pode primeiro perguntar "está tudo bem?" no celular da própria pessoa, antes de chamar a família.
>
> **De onde vêm os números?** Censo 2022 do IBGE, divulgado em outubro de 2024: 5,66 milhões de pessoas com 60 anos ou mais moram sozinhas no Brasil. No Espírito Santo, 20,6% dos lares têm um morador só, o 3º maior do país. E, segundo a OMS (2021), quedas são a segunda maior causa de morte por lesão acidental no mundo.
>
> **Isso já existe?** Empresas já vendem sensoriamento por Wi-Fi para cuidado de idosos, como a Origin Wireless, nos EUA. Os números de acerto que elas divulgam são delas mesmas.

### 14. Dá para montar com pouco.
*22 s*

**Fala.** Não! São duas placas baratas, o programa aberto da fabricante e um notebook; a tela e a análise a gente programou, em JavaScript e Python. E isso já está saindo do laboratório: desde 2025 existe um padrão do Wi-Fi só para perceber o ambiente, o 802.11bf, e nos Estados Unidos a operadora Comcast já liga a detecção de movimento no roteador de quem quiser.

- FALE: o preço que pagaram nas placas (e preencham CUSTO no roteiro.js para ele aparecer na tela).

→ *Se já está chegando nas casas, tem o outro lado.*

> **Isso já existe no mercado?** Sim. A Comcast oferece o "WiFi Motion" nos roteadores dos clientes nos EUA (é opcional). Empresas como a Cognitive Systems vendem o programa para fabricantes de roteadores. E em 2025 o IEEE publicou o 802.11bf, um padrão só para sensoriamento por Wi-Fi.
>
> **Como isso cresce?** Hoje são duas placas por cômodo. O caminho natural é o próprio roteador fazer a medida, como no 802.11bf e no produto da Comcast: aí não precisa comprar nada a mais. O programa da placa é aberto, e cada cômodo só precisa ser calibrado uma vez.

### 15. E a privacidade? ●
*22 s (curta: 15 s)*

**Fala.** Se o sinal atravessa parede, alguém de fora poderia saber se tem gente na sua casa. E isso já não é só hipótese: a Comcast avisa que os dados do detector dela podem ir para a polícia com ordem judicial. Por isso a gente defende duas regras: só com consentimento, e o dado fica dentro de casa, como no nosso projeto.

- PERGUNTE: "Você gostaria que o vizinho soubesse quando você está em casa?"

→ *Agora volte para as linhas do começo.*

> **Dá mesmo para perceber através da parede?** Sim, e não só a gente: o grupo de Dina Katabi, no MIT, mostrou isso em 2013 (Wi-Vi), com equipamento especial. Com a nossa placa, a 3,75 m e com uma parede no meio, percebemos a pessoa andando do outro lado.
>
> **De onde vem o caso da Comcast?** Dos termos do próprio recurso WiFi Motion, noticiados pelo site BleepingComputer em 2026: os dados podem ser entregues sem aviso em investigações, disputas ou com ordem judicial. O recurso é opcional.
>
> **E no projeto de vocês, onde ficam os dados?** No notebook. A tela não manda nada para a internet; o apelido e a marca de cada visitante ficam no navegador e são apagados no fim do dia.

### 16. Agora você sabe ler estas linhas. ●
*22 s (curta: 16 s)*

**Fala.** Lembra das linhas do começo? Agora você sabe: são ondas se somando na placa B, e cada tremida é alguém se mexendo. Sua vez: mexe o braço e olha as linhas. Quer um desafio? Tenta atravessar a faixa sem fazer elas tremerem.

- FAÇA: a pessoa mexe o braço e depois fica parada.
- FAÇA: abra a Travessia (tecla N).
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

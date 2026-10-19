/* Roteiro da história "Como funciona". SÓ CONTEÚDO: pode editar à vontade.
 *
 * Cada cena tem:
 *   id       nome interno (não mude: o desenho de cada cena é ligado a ele)
 *   cap      capítulo (chave de `capitulos`) ou null
 *   titulo   frase grande da tela. A palavra-chave vai entre *asteriscos*: ela é sublinhada. No máximo uma por título.
 *            Cenas com o sinal de verdade têm um título para cada fonte: tituloSimulacao, tituloGravacao, tituloSemFonte
 *            (o mesmo vale para a frase: fraseSimulacao, fraseGravacao, fraseSemFonte).
 *   frase    frase menor, embaixo do título
 *   seg      segundos sugeridos em cada versão (sem `curta`, a cena não entra na versão curta)
 *   vitrine  false = não aparece quando a explicação toca sozinha
 *
 * A colinha (janela do apresentador e docs/colinha.md, gerada por ferramentas/colinha.py):
 *   fala       o que dizer, em frases curtas
 *   acao       o que fazer, sempre como 'ETIQUETA: texto' (APONTE, PERGUNTE, PAUSA, ESPERE, FAÇA, DEIXE A ANIMAÇÃO, LEIA...)
 *   ponte      a frase que leva para a próxima cena
 *   perguntas  perguntas que um avaliador pode fazer nesta cena, com a resposta: [{ p, r }]
 *
 * Jeito de escrever: direto, como quem explica para um colega. Uma ideia por cena. Nada de frase de efeito.
 * Regras do projeto: nada de número inventado, e simulação nunca vira "medição".
 */
(function (raiz) {
  'use strict';

  // `cap` = o capítulo que aparece no canto da tela. 'CD' (Ciência Delas) é só a cena da Hedy Lamarr.
  const capitulos = {
    I: 'I · A pergunta',
    II: 'II · Como funciona',
    CD: 'Ciência Delas',
    III: 'III · O experimento',
    IV: 'IV · Para que serve',
  };

  // Campos de cada cena: titulo e frase (na TV); fala, acao, ponte e perguntas (na colinha e no apresentador).
  // `falaCurta` e `ponteCurta`, quando existem, valem na versão curta. `seg` = segundos sugeridos.
  const cenas = [
    {
      id: 'abertura', cap: null,
      titulo: 'Estas linhas são o Wi-Fi desta sala.',
      tituloSimulacao: 'Estas linhas imitam o Wi-Fi de uma sala.',
      tituloGravacao: 'Estas linhas são o Wi-Fi de uma gravação.',
      tituloSemFonte: 'Wave Sense',
      frase: 'Mexa o braço perto das placas e veja o que acontece.',
      fraseSimulacao: 'Por enquanto é uma simulação. Na feira, as linhas vêm das placas.',
      fraseGravacao: 'É uma gravação repetida. Ao vivo, as linhas vêm das placas.',
      fraseSemFonte: 'Uma pesquisa sobre o que o Wi-Fi consegue perceber de nós.',
      seg: { completa: 20, curta: 15 },
      fala: 'Sabe essas linhas? É o Wi-Fi desta sala, medido agora. Mexe o braço aqui, entre as plaquinhas. Viu? Você não encostou em nada e o sinal mudou. A nossa pesquisa é sobre isso: o que o Wi-Fi consegue perceber da gente.',
      acao: [
        'FAÇA: chame a pessoa para mexer o braço entre as placas.',
        'ESPERE: as linhas tremerem. É o momento do "uau"; deixe a pessoa curtir.',
        'SIMULAÇÃO: sem placa, diga que é simulação e use a tecla 3 para alguém "andar".',
      ],
      ponte: 'Mas como isso é possível?',
    },
    {
      id: 'pergunta', cap: 'I',
      titulo: 'E se o Wi-Fi *percebesse* a gente?',
      frase: 'Ele já está em quase toda casa e escola. A gente quis descobrir o que dá para perceber só com esse sinal: sem câmera e sem nada no corpo.',
      seg: { completa: 18, curta: 12 },
      fala: 'O Wi-Fi está em todo lugar e passa pela gente o tempo todo, até agora, enquanto você usa o celular. A pergunta da nossa pesquisa: dá para usar esse mesmo sinal para perceber pessoas? Sem câmera filmando e sem pulseira no braço.',
      acao: [
        'APONTE: os anéis saindo do roteador e passando pela pessoa.',
        'PERGUNTE: "Você colocaria uma câmera no seu quarto?" Espere a resposta.',
      ],
      ponte: 'Para testar, a gente trocou o roteador por duas plaquinhas.',
      perguntas: [
        { p: 'Por que não usar câmera?', r: 'Câmera grava rosto e intimidade, precisa de luz e não enxerga através da parede. O Wi-Fi não forma imagem: ele só percebe que algo mudou no sinal.' },
        { p: 'Isso é coisa nova?', r: 'A ideia é estudada há mais de dez anos (em inglês, Wi-Fi sensing) e em 2025 ganhou um padrão oficial do Wi-Fi, o IEEE 802.11bf. A gente montou, mediu e testou com material barato.' },
      ],
    },
    {
      id: 'placas', cap: 'II',
      titulo: 'Duas placas: *uma fala*, a outra escuta.',
      frase: 'O Wi-Fi é uma onda de rádio de uns 12 cm. A placa A manda 50 mensagens por segundo; a placa B mede como cada uma chegou.',
      seg: { completa: 20, curta: 14 },
      fala: 'Repara: o roteador virou a placa A. Ela manda 50 mensagens por segundo numa onda de rádio invisível, com uns 12 centímetros de crista a crista. A placa B não liga para o que a mensagem diz: ela mede como a mensagem chegou.',
      acao: [
        'APONTE: as placas A e B de verdade, no estande.',
        'APONTE: a régua de 12 cm em cima da onda.',
      ],
      ponte: 'E a mensagem não vai só em linha reta.',
      perguntas: [
        { p: 'Por que 12 cm?', r: 'Comprimento de onda = velocidade da luz ÷ frequência: 300 mil km/s ÷ 2,4 GHz ≈ 12,5 cm.' },
        { p: 'Por que ESP32, e não o roteador de casa?', r: 'O roteador comum não mostra a medida do canal (CSI). A ESP32 mostra, com o programa oficial e aberto da fabricante (ESP-CSI), e custa pouco.' },
        { p: 'O que vai dentro da mensagem?', r: 'Nada importante: é um pacote de teste. O que interessa é como ele chegou, não o que ele diz.' },
      ],
    },
    {
      id: 'caminhos', cap: 'II',
      titulo: 'O sinal chega por *vários caminhos*.',
      frase: 'Um vai direto. Os outros batem no teto, no chão e nas pessoas, e chegam um pouquinho depois.',
      seg: { completa: 18, curta: 14 },
      fala: 'A mensagem sai da placa A para todo lado, tipo eco. Um pedaço vai reto até a B; outros batem no teto, no chão, em você, e chegam um tiquinho depois. A placa B recebe tudo misturado.',
      acao: [
        'DEIXE A ANIMAÇÃO: os pontinhos saem juntos; os dos caminhos longos chegam depois.',
        'APONTE: o caminho que bate na pessoa. "Esse aqui é você."',
      ],
      ponte: 'E o que acontece quando esses caminhos se encontram na placa B?',
      perguntas: [
        { p: 'Quanto "depois" chega o caminho rebatido?', r: 'Bilionésimos de segundo: a onda anda 30 cm por nanossegundo. Numa sala, os caminhos diferem de 1 a 25 m, ou seja, de 3 a 80 ns.' },
      ],
    },
    {
      id: 'mexe', cap: 'II',
      titulo: 'Quem se mexe *muda a soma*.',
      frase: 'Na placa B, os caminhos se somam: crista com crista reforça, crista com vale apaga. Mexer uns 6 cm já troca uma pela outra.',
      seg: { completa: 30, curta: 22 },
      fala: 'Aqui está o segredo do projeto. Na placa B, os caminhos se somam. Se chegam crista com crista, o sinal fica forte; crista com vale, um apaga o outro. Quando você anda, o caminho que passa por você muda de tamanho. Uns 6 centímetros, meia onda, já trocam forte por fraco. Por isso a soma sobe e desce a cada passo.',
      acao: [
        'APONTE: embaixo, o caminho direto, o que passa pela pessoa e a soma, mais grossa, subindo e descendo no ritmo dos passos.',
        'ANALOGIA: duas pessoas balançando a mesma corda. No mesmo ritmo, a onda cresce; em ritmos opostos, ela some.',
      ],
      ponte: 'E o Wi-Fi não usa uma onda só: usa 64.',
      perguntas: [
        { p: 'Isso tem nome?', r: 'Interferência: construtiva (reforça) e destrutiva (cancela). No Wi-Fi, o efeito se chama desvanecimento por múltiplos percursos (multipath fading).' },
        { p: '6 cm não é muito pouco?', r: 'Para uma onda de 12 cm, 6 cm é meia volta. Um movimento de braço já passa disso; por isso o sinal é tão sensível a movimento.' },
      ],
    },
    {
      id: 'frequencias', cap: 'II',
      titulo: 'O Wi-Fi usa *64 ondas* juntas.',
      frase: 'Cada uma tem um tamanho um pouco diferente e soma de um jeito. A placa B mede as 64 de uma vez: isso se chama CSI.',
      seg: { completa: 20, curta: 14 },
      fala: 'O canal do Wi-Fi é dividido em 64 ondas, cada uma de um tamanho um pouquinho diferente. Então cada uma soma de um jeito: umas chegam fortes, outras fracas. A placa B mede as 64 ao mesmo tempo. Essa medida tem nome: CSI, a informação do estado do canal.',
      acao: ['APONTE: a barra que veio da cena anterior; depois, as outras 63 nascendo da placa B.'],
      ponte: 'E usar várias frequências tem uma história. De uma inventora.',
      perguntas: [
        { p: 'O que é CSI?', r: 'Channel State Information: para cada uma das 64 partes do canal, quanto a viagem mudou a força e a fase da onda. A gente usa a força (amplitude).' },
        { p: 'Por que 64?', r: 'O canal de 20 MHz do Wi-Fi é dividido em 64 subportadoras, a cada 312,5 kHz. Algumas ficam vazias (bordas e centro): são os pontinhos sem barra.' },
      ],
    },
    {
      id: 'salto', cap: 'CD',
      titulo: 'A inventora *Hedy Lamarr*.',
      frase: 'Famosa como atriz de Hollywood, ela também inventava. Em 1942, patenteou com George Antheil o salto de frequência. O reconhecimento só veio em 1997.',
      seg: { completa: 35, curta: 22 },
      fala: 'O tema desta JACITEC é Ciência Delas, e o Wi-Fi tem uma inventora na sua história: Hedy Lamarr, uma das atrizes mais famosas de Hollywood, que nas horas vagas inventava. Na Segunda Guerra, ela e o compositor George Antheil criaram o salto de frequência: o rádio pula de uma frequência para outra numa ordem secreta, guardada num rolo de pianola. Patentearam em 1942, mas a Marinha engavetou a ideia, e por décadas ela foi lembrada só pelos filmes. O reconhecimento como inventora veio em 1997, mais de 50 anos depois. Hoje, espalhar o sinal por várias frequências é base da comunicação sem fio, e o Bluetooth pula de frequência até hoje. E a história continua com mulheres: uma das pesquisadoras mais conhecidas em Wi-Fi que percebe pessoas é Dina Katabi, professora do MIT.',
      falaCurta: 'Tema da JACITEC: Ciência Delas. Hedy Lamarr era uma atriz famosa de Hollywood, e também inventora. Em 1942, ela e George Antheil patentearam o salto de frequência: o rádio pula de frequência numa ordem secreta, guardada num rolo de pianola. A Marinha engavetou a ideia, e o reconhecimento só veio em 1997. Hoje, espalhar o sinal por várias frequências é base da comunicação sem fio.',
      acao: [
        'APONTE: o rosto dela, feito com as mesmas linhas do sinal (de uma foto de 1940).',
        'APONTE: o rolo descendo; cada furo que passa pela barra de leitura acende uma frequência, uma de cada vez.',
        'FALE: o tema da JACITEC, "Ciência Delas: Mulheres em Ciência, Tecnologia e Inovação".',
        'CUIDADO: ela não inventou o Wi-Fi. Ela inventou o salto de frequência, uma das ideias que abriram o caminho.',
      ],
      ponte: 'Hoje, as 64 acendem juntas. E viram uma linha.',
      perguntas: [
        { p: 'Ela inventou o Wi-Fi?', r: 'Não o Wi-Fi inteiro. Ela inventou, com George Antheil, o salto de frequência, uma forma de espalhar o sinal por várias frequências. O Bluetooth usa salto de frequência até hoje, e a primeira versão do Wi-Fi, de 1997, tinha um modo com salto. O Wi-Fi de hoje espalha o sinal de outro jeito (as 64 ondas ao mesmo tempo).' },
        { p: 'Por que uma atriz inventou isso?', r: 'Ela gostava de inventar e aprendeu muito sobre armas e rádio ouvindo as conversas do primeiro marido, um fabricante de armas. Na guerra, os torpedos guiados por rádio podiam ser bloqueados pelo inimigo; o salto de frequência resolvia isso. Antheil, compositor, trouxe a ideia de sincronizar tudo com rolos de pianola.' },
        { p: 'Funcionou na guerra?', r: 'A Marinha dos EUA não adotou na época, e a patente venceu sem que ela ganhasse dinheiro. O reconhecimento veio depois: o prêmio Pioneer da Electronic Frontier Foundation, em 1997, e o Hall da Fama dos Inventores dos EUA, em 2014.' },
        { p: 'E hoje, tem mulheres nessa área?', r: 'Sim. Uma das mais conhecidas é Dina Katabi, professora do MIT. Em 2013, o grupo dela, com Fadel Adib, apresentou o Wi-Vi: Wi-Fi percebendo pessoas que se mexem atrás de uma parede. É a mesma área da nossa pesquisa.' },
        { p: 'Por que um rolo de pianola?', r: 'O transmissor e o receptor precisavam pular juntos, na mesma ordem. Antheil já sincronizava pianolas; os rolos perfurados guardavam a ordem, como uma partitura. A patente é a nº 2.292.387, de 11 de agosto de 1942.' },
        { p: 'De onde vem o retrato?', r: 'De uma foto de 1940, de Clarence Bull para o estúdio MGM, em domínio público. Nós desenhamos o rosto com as mesmas linhas que mostram o sinal do Wi-Fi: onde a foto é mais clara, a linha sobe. Não é imagem gerada por IA.' },
      ],
    },
    {
      id: 'linhas', cap: 'II',
      titulo: 'Cada instante vira *uma linha*.',
      frase: 'As 64 somas viram uma linha a cada 0,1 s. A de baixo é agora; as de cima, o passado. Quando elas tremem, alguém se mexeu.',
      seg: { completa: 16, curta: 12 },
      fala: 'Liga o topo das 64 barras e vira uma linha. Chega uma nova a cada décimo de segundo e empurra as outras para cima. São as linhas do começo! Agora você sabe: quando elas tremem, alguém se mexeu.',
      acao: ['APONTE: a linha de baixo, mais grossa (agora), e as de cima (o passado).'],
      ponte: 'Para o computador decidir sozinho, o tremor vira um número.',
      ponteCurta: 'E com as placas de verdade, deu certo?',
      perguntas: [
        { p: 'Cada linha é uma mensagem?', r: 'É a média das mensagens de 0,1 s (cerca de 5). O desenho realça o tremor 3 vezes para ficar visível; a detecção usa os valores sem realce.' },
      ],
    },
    {
      id: 'numero', cap: 'II',
      titulo: '*Um número* diz o quanto tremeu.',
      frase: '1,0× é a sala vazia. Passou da linha tracejada, o sistema marca movimento.',
      seg: { completa: 20 },
      fala: 'O computador compara o tremor de agora com o da sala vazia, que vale 1,0. Passou da linha tracejada, ele marca movimento. E um tremidinho solto não engana: precisa de três medidas seguidas.',
      acao: [
        'APONTE: o número e a linha tracejada.',
        'ESPERE: o tremidinho curto no fim do ciclo, que fica abaixo da linha: "um pico solto não dispara".',
      ],
      ponte: 'E com as placas de verdade, deu certo?',
      perguntas: [
        { p: 'Como o número é calculado?', r: 'Primeiro, cada pacote é ajustado para o mesmo volume, porque a placa muda o volume sozinha (ganho automático). Depois, para cada subportadora, o desvio padrão da amplitude em 1 segundo, e a média entre elas, a cada 0,2 s. Divide pelo valor da sala vazia, medido na calibração.' },
        { p: 'Por que ajustar o volume?', r: 'Nos testes, com a sala vazia, o número pulava sozinho de 0,8 a 4,8: era a placa subindo e descendo o volume. Ajustando cada pacote, a sala vazia ficou estável e a pessoa andando passou a se destacar.' },
        { p: 'E a linha tracejada?', r: 'Média da sala vazia + 3 desvios, no mínimo 1,3×. Três medidas seguidas acima viram "movimento"; cinco abaixo voltam a "parado".' },
      ],
    },
    {
      id: 'resultados', cap: 'III',
      titulo: 'Testamos de verdade, e *funcionou*.',
      frase: 'Uma pessoa cruzou entre as placas 7 vezes, e o sistema percebeu as 7. Em outro teste, percebeu alguém andando atrás de uma parede.',
      seg: { completa: 30, curta: 20 },
      fala: 'Hora da verdade. Gravamos 30 segundos com a sala vazia e 30 com alguém cruzando entre as placas. Cada risco é o sinal medido de verdade. A pessoa cruzou 7 vezes, e o sistema marcou as 7, uma por uma. Em cada travessia, o sinal chegou a quase 6 vezes o da sala vazia. E num outro teste, a 3,75 metros e com uma parede no meio, ele percebeu a pessoa andando do outro lado.',
      acao: [
        'APONTE: os números 1 a 7 acendendo em cima de cada travessia.',
        'APONTE: os três números embaixo: 7 de 7, quase 6 vezes, e a parede.',
        'SE PERGUNTAREM DE PORCENTAGEM: a resposta está na tecla Q. Nunca invente uma.',
      ],
      ponte: 'E o que ele ainda não consegue ver?',
      perguntas: [
        { p: 'Quanto ele acerta?', r: 'Ainda não calculamos uma porcentagem: para isso, a pesquisa precisa de muitas gravações, umas para ajustar e outras só para testar. É o nosso próximo passo. O que já medimos: 7 travessias, 7 detecções; com a sala vazia, 2 alarmes curtos em 30 segundos.' },
        { p: 'Como vocês testaram?', r: 'Duas montagens em casa: placas a 1,5 m, sem parede, e a 3,75 m, com uma parede no meio. Em cada uma, 30 s de sala vazia (para calibrar o limite) e 30 s com uma pessoa se mexendo. A mesma regra roda no Python e na tela da demonstração.' },
        { p: 'Por que separar as gravações para medir o acerto?', r: 'Se o limite é escolhido e conferido nas mesmas gravações, o resultado sai bom demais, como fazer a prova com as questões da lista de exercícios. Por isso a separação é por sessão.' },
        { p: 'Que problemas vocês resolveram?', r: 'Três. O roteador ao lado da placa B fazia metade dos pacotes se perder: afastamos. O cabo USB só leva umas 72 linhas por segundo: baixamos a placa A de 100 para 50 pacotes por segundo. E o ganho automático da placa fazia a sala vazia "tremer": ajustamos o volume de cada pacote. Depois disso, chegaram de 76% a 92% dos pacotes e a sala vazia ficou estável.' },
        { p: 'De onde vem o "quase 6 vezes"?', r: 'Dos mesmos dados do gráfico: o maior tremor com a pessoa cruzando dividido pelo tremor típico (mediana) da sala vazia dá 5,9.' },
      ],
    },
    {
      id: 'parado', cap: 'III',
      titulo: 'Pessoa parada não aparece. *Ainda*.',
      frase: 'O sistema percebe movimento, não presença. Mas quem está parado respira, e um grupo de pesquisa já mediu a respiração com a mesma placa.',
      seg: { completa: 22, curta: 16 },
      fala: 'Quer brincar de estátua? Fica paradinho entre as placas... sumiu! Para o Wi-Fi, quem está parado não muda a soma. Mas parado você ainda respira, e em 2024 pesquisadores mediram a respiração de 8 pessoas com essa mesma plaquinha. É o próximo passo da nossa pesquisa.',
      acao: ['FAÇA: o Jogo da Estátua. A pessoa fica parada entre as placas e "some" para o Wi-Fi.'],
      ponte: 'E por que perceber uma respiração pode salvar vidas?',
      perguntas: [
        { p: 'De onde vem o estudo da respiração?', r: 'Burimas e outros, "Monitoring the Sleep Respiratory Rate with Low-Cost Microcontroller Wi-Fi in a Controlled Environment", Applied Sciences, 2024. Usaram a ESP32 e compararam com uma cinta de respiração no peito, em 8 pessoas: erro médio de 2,6 respirações por minuto (1,4 com respiração normal).' },
        { p: 'Vocês mediram a pessoa parada?', r: 'Mostramos ao vivo, no Jogo da Estátua. Nos testes, entre uma travessia e outra, quando a pessoa sai da linha, o número volta ao nível da sala vazia. Gravações só com a pessoa parada são a próxima rodada.' },
        { p: 'O que mais atrapalha?', r: 'Distância entre as placas, várias pessoas ao mesmo tempo, outras redes no mesmo canal e coisas que se mexem sozinhas (ventilador, cortina, bicho). Por isso cada lugar é calibrado de novo.' },
      ],
    },
    {
      id: 'escombros', cap: 'IV',
      titulo: 'Alguém vivo *debaixo dos escombros*?',
      frase: 'Ondas de rádio atravessam entulho. Em 2015, no Nepal, um radar da NASA achou 4 pessoas vivas pela respiração e pelo coração.',
      seg: { completa: 28, curta: 20 },
      fala: 'Imagina um desabamento. A pergunta mais urgente é: onde ainda tem alguém vivo? Em 2015, no terremoto do Nepal, um radar da NASA, o FINDER, achou quatro homens soterrados pelos sinais da respiração e do coração. Só que esse radar é caro. A nossa ideia é tentar o mesmo com placas de Wi-Fi baratas: a gente já percebeu uma pessoa através de uma parede. Falta a respiração.',
      acao: [
        'APONTE: a pessoa no vão entre as lajes e, embaixo, as linhas subindo e descendo devagar, no ritmo de uma respiração.',
        'LEMBRE: o desenho é a ideia para o futuro. Em escombros, a gente ainda não testou.',
      ],
      ponte: 'Isso é o futuro. E o que já dá para fazer hoje?',
      perguntas: [
        { p: 'O Wi-Fi atravessa escombros?', r: 'Em parte. O entulho enfraquece muito o sinal, e a pesquisa com Wi-Fi para isso ainda está no começo (Khan e outros estudam essa dificuldade na IEEE Access, em 2019). O FINDER é um radar feito para isso. A vantagem do Wi-Fi seria o preço.' },
        { p: 'O que é o FINDER?', r: 'Um radar do JPL, o laboratório da NASA, feito com o Departamento de Segurança Interna dos EUA, do tamanho de uma mala. Em 2015, no terremoto do Nepal, ajudou a achar 4 homens soterrados, pela respiração e pelos batimentos.' },
        { p: 'Isso acontece no Brasil?', r: 'Nos deslizamentos de Petrópolis, em fevereiro de 2022, morreram mais de 200 pessoas, e 24 foram tiradas vivas nos primeiros dias. Achar rápido onde ainda tem alguém vivo faz diferença.' },
      ],
    },
    {
      id: 'sozinho', cap: 'IV',
      titulo: 'Quem mora *sozinho*.',
      frase: 'Se até as 10h ninguém se mexeu, a casa avisa a família. Sem câmera e sem pulseira: só o detector que já mostramos.',
      seg: { completa: 25, curta: 18 },
      fala: 'No Brasil, 5,7 milhões de idosos moram sozinhos; aqui no Espírito Santo, um em cada cinco lares tem um morador só. Com as placas, a casa aprende a rotina: se até as 10 da manhã ninguém se mexeu, ela manda uma mensagem para a família. Sem câmera, sem pulseira, e usando só o que o nosso detector já faz.',
      acao: [
        'APONTE: ontem, o dia cheio de movimentos desde as 6h40; hoje, nada desde a noite, e o aviso às 10h.',
        'DICA: se perguntarem se já testaram por vários dias, diga que esse é um próximo passo.',
      ],
      ponte: 'E montar isso custa caro?',
      ponteCurta: 'Mas tem o outro lado.',
      perguntas: [
        { p: 'E se a pessoa só dormiu até mais tarde?', r: 'O horário se ajusta à rotina de cada um, e o aviso pode primeiro perguntar "está tudo bem?" no celular da própria pessoa, antes de chamar a família.' },
        { p: 'De onde vêm os números?', r: 'Censo 2022 do IBGE, divulgado em outubro de 2024: 5,66 milhões de pessoas com 60 anos ou mais moram sozinhas no Brasil. No Espírito Santo, 20,6% dos lares têm um morador só, o 3º maior do país. E, segundo a OMS (2021), quedas são a segunda maior causa de morte por lesão acidental no mundo.' },
        { p: 'Isso já existe?', r: 'Empresas já vendem sensoriamento por Wi-Fi para cuidado de idosos, como a Origin Wireless, nos EUA. Os números de acerto que elas divulgam são delas mesmas.' },
      ],
    },
    {
      id: 'viabilidade', cap: 'IV',
      titulo: 'Dá para montar *com pouco*.',
      frase: 'Duas placas ESP32, programas abertos e um notebook. Nos EUA, a operadora Comcast já oferece isso no roteador dos clientes.',
      fraseComCusto: 'Duas placas ESP32 ({custo}), programas abertos e um notebook. Nos EUA, a operadora Comcast já oferece isso no roteador dos clientes.',
      seg: { completa: 22 },
      fala: 'Não! São duas placas baratas, o programa aberto da fabricante e um notebook; a tela e a análise a gente programou, em JavaScript e Python. E isso já está saindo do laboratório: desde 2025 existe um padrão do Wi-Fi só para perceber o ambiente, o 802.11bf, e nos Estados Unidos a operadora Comcast já liga a detecção de movimento no roteador de quem quiser.',
      acao: ['FALE: o preço que pagaram nas placas (e preencham CUSTO no roteiro.js para ele aparecer na tela).'],
      ponte: 'Se já está chegando nas casas, tem o outro lado.',
      perguntas: [
        { p: 'Isso já existe no mercado?', r: 'Sim. A Comcast oferece o "WiFi Motion" nos roteadores dos clientes nos EUA (é opcional). Empresas como a Cognitive Systems vendem o programa para fabricantes de roteadores. E em 2025 o IEEE publicou o 802.11bf, um padrão só para sensoriamento por Wi-Fi.' },
        { p: 'Como isso cresce?', r: 'Hoje são duas placas por cômodo. O caminho natural é o próprio roteador fazer a medida, como no 802.11bf e no produto da Comcast: aí não precisa comprar nada a mais. O programa da placa é aberto, e cada cômodo só precisa ser calibrado uma vez.' },
      ],
    },
    {
      id: 'privacidade', cap: 'IV',
      titulo: 'E a *privacidade*?',
      frase: 'Se o Wi-Fi percebe alguém através da parede, quem está de fora também poderia. Os dados da Comcast podem ir para a polícia com ordem judicial.',
      seg: { completa: 22, curta: 15 },
      fala: 'Se o sinal atravessa parede, alguém de fora poderia saber se tem gente na sua casa. E isso já não é só hipótese: a Comcast avisa que os dados do detector dela podem ir para a polícia com ordem judicial. Por isso a gente defende duas regras: só com consentimento, e o dado fica dentro de casa, como no nosso projeto.',
      acao: ['PERGUNTE: "Você gostaria que o vizinho soubesse quando você está em casa?"'],
      ponte: 'Agora volte para as linhas do começo.',
      perguntas: [
        { p: 'Dá mesmo para perceber através da parede?', r: 'Sim, e não só a gente: o grupo de Dina Katabi, no MIT, mostrou isso em 2013 (Wi-Vi), com equipamento especial. Com a nossa placa, a 3,75 m e com uma parede no meio, percebemos a pessoa andando do outro lado.' },
        { p: 'De onde vem o caso da Comcast?', r: 'Dos termos do próprio recurso WiFi Motion, noticiados pelo site BleepingComputer em 2026: os dados podem ser entregues sem aviso em investigações, disputas ou com ordem judicial. O recurso é opcional.' },
        { p: 'E no projeto de vocês, onde ficam os dados?', r: 'No notebook. A tela não manda nada para a internet; o apelido e a marca de cada visitante ficam no navegador e são apagados no fim do dia.' },
      ],
    },
    {
      id: 'fim', cap: null,
      titulo: 'Agora você sabe ler *estas linhas*.',
      frase: 'Mexa o braço entre as placas e veja as linhas tremerem. Depois, tente atravessar a faixa sem fazê-las tremer.',
      fraseSimulacao: 'Na simulação, a tecla 3 faz alguém andar. Na feira, as linhas vêm das placas.',
      fraseGravacao: 'É uma gravação repetida. Ao vivo, as linhas vêm das placas.',
      seg: { completa: 22, curta: 16 },
      fala: 'Lembra das linhas do começo? Agora você sabe: são ondas se somando na placa B, e cada tremida é alguém se mexendo. Sua vez: mexe o braço e olha as linhas. Quer um desafio? Tenta atravessar a faixa sem fazer elas tremerem.',
      acao: [
        'FAÇA: a pessoa mexe o braço e depois fica parada.',
        'FAÇA: abra a Travessia (tecla N).',
        'SIMULAÇÃO: na simulação ou numa gravação, diga isso.',
        'AVALIADOR: "Usamos um assistente de IA como apoio no código e nos textos. Revisamos tudo, e os dados são medidos por nós."',
      ],
      ponte: null,
    },
  ];

  // Perguntas de quem passa pelo estande (qualquer pessoa). Respostas curtas, para falar em uma frase.
  const perguntasVisitante = [
    { p: 'Faz mal para a saúde?', r: 'É o mesmo tipo de sinal do Wi-Fi da sua casa e da escola, com potência parecida à de um roteador comum. A gente não usa nada mais forte que isso.' },
    { p: 'Ele está me filmando?', r: 'Não tem câmera nem microfone, pode olhar as placas. Ele só mede como o sinal chegou.' },
    { p: 'Dá para saber quem eu sou?', r: 'Não. Ele mede o quanto o sinal tremeu, não forma rosto nem nome. Ele percebe movimento.' },
    { p: 'Funciona com o Wi-Fi da minha casa?', r: 'O roteador comum não mostra essa medida; a plaquinha ESP32 mostra, e custa pouco. O padrão novo do Wi-Fi, o 802.11bf, é o caminho para os roteadores fazerem isso sozinhos.' },
    { p: 'Dá para ver através da parede?', r: 'Ver uma imagem, não. Perceber que alguém se mexeu, sim: num teste nosso, a 3,75 m, percebemos uma pessoa andando do outro lado da parede.' },
    { p: 'E se eu ficar parado?', r: 'Você some para o detector, porque ele percebe movimento. Experimenta o Jogo da Estátua!' },
    { p: 'Quem fez isso?', r: 'Nós dois, Augusto e Daniel, com orientação do professor Diego Barcelos Rodrigues. Os programas das placas são da fabricante e abertos; a tela, a análise e os testes são nossos.' },
  ];

  // Perguntas que podem vir de qualquer um, mais comuns de avaliador.
  const perguntasGerais = [
    { p: 'É uma pesquisa ou um produto?', r: 'Uma pesquisa: a gente quis descobrir o que o Wi-Fi consegue perceber de pessoas, montando, medindo e testando. Os usos (escombros, quem mora sozinho) mostram para onde isso pode ir.' },
    { p: 'E se tiver duas pessoas?', r: 'O tremor fica maior, mas o sistema não conta pessoas. Contar é um próximo passo.' },
    { p: 'Ventilador ou cortina disparam?', r: 'Podem disparar, porque também mudam os caminhos do sinal. Por isso calibramos com a sala como ela fica normalmente.' },
    { p: 'Por que não usar inteligência artificial (aprendizado de máquina)?', r: 'Primeiro, uma regra simples que dá para explicar e conferir. Um classificador (Random Forest) entra depois, com mais gravações, sempre testado por sessão.' },
    { p: 'Usaram IA no projeto?', r: 'Sim, um assistente de IA como apoio para consultar documentação, escrever partes do código e revisar textos. Tudo foi revisado e testado pela equipe, e os dados são medidos por nós.' },
    { p: 'Por que 50 pacotes por segundo, e não 100?', r: 'Cada medida vira uma linha de ~1.280 letras no cabo USB, e o cabo leva umas 72 por segundo. Com 100, sempre se perdiam pelo menos 20%. Com 50 sobra folga, e o detector precisa de só 10 por segundo.' },
    { p: 'O que é desenho e o que é medido?', r: 'O que explica a física (ondas, soma, 64 barras) é desenho, com a etiqueta "Ilustração". Escombros e o aviso para a família são ideias de uso. As linhas ao vivo e os resultados dos testes são medidos.' },
  ];

  // Preço que vocês pagaram nas duas placas, como texto. Exemplo: 'R$ 90'. Sem preço, a frase não fala de valor.
  const CUSTO = null;

  // Segundos de cada transição entre cenas, nas setas e no passador. Mais = mais devagar.
  const transicao = 2.6;

  const api = { capitulos, cenas, perguntasVisitante, perguntasGerais, CUSTO, transicao };
  raiz.WaveRoteiro = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

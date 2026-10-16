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

  const capitulos = {
    I: 'I · A pergunta',
    II: 'II · Como funciona',
    III: 'III · O experimento',
    IV: 'IV · Limites e usos',
  };

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
      fraseSemFonte: 'O Wi-Fi que já existe percebendo movimento, sem câmera.',
      seg: { completa: 20, curta: 15 },
      fala: 'Estas linhas são o Wi-Fi desta sala, medido agora. Mexe o braço aqui, perto das placas. Viu? Ninguém tocou em nada. Vou mostrar como isso acontece.',
      acao: [
        'FAÇA: convide o visitante a mexer o braço entre as placas.',
        'ESPERE: as linhas tremerem antes de falar de novo.',
        'SIMULAÇÃO: diga que é simulação e faça alguém "andar" com a tecla 3.',
      ],
      ponte: 'Por que isso importa? Pense em alguém que mora sozinho.',
    },
    {
      id: 'pergunta', cap: 'I',
      titulo: 'Como saber se alguém caiu *sem câmera*?',
      frase: 'Câmera expõe a intimidade. Pulseira depende de a pessoa lembrar de usar.',
      seg: { completa: 20 },
      fala: 'Queda é a segunda maior causa de morte por acidente no mundo, e quem mais morre são pessoas com mais de 60 anos. Para perceber uma queda, hoje se usa câmera, que invade a privacidade, ou pulseira, que a pessoa esquece. Nossa pergunta: dá para usar o Wi-Fi?',
      acao: ['PERGUNTE: "Você colocaria uma câmera no banheiro da sua avó?" Espere a resposta.'],
      ponte: 'Para responder, primeiro: o que é o Wi-Fi?',
      perguntas: [
        { p: 'De onde vem o dado das quedas?', r: 'Da OMS, ficha "Falls" (26/04/2021): quedas são a segunda maior causa de morte por lesão não intencional no mundo, e os maiores de 60 anos são os mais atingidos.' },
      ],
    },
    {
      id: 'onda', cap: 'II',
      titulo: 'O Wi-Fi é uma *onda*.',
      frase: 'Invisível, com uns 12 cm de crista a crista. Ela enche a sala e bate em tudo.',
      seg: { completa: 15 },
      fala: 'O Wi-Fi é uma onda de rádio. Parecida com a da água, só que invisível. Cada onda tem uns 12 centímetros, mais ou menos um palmo. Ela sai do roteador, enche a sala e bate em tudo: parede, móvel, gente.',
      acao: ['APONTE: a régua de 12 cm em cima da onda.'],
      ponte: 'Para medir essa onda, usamos duas plaquinhas.',
      perguntas: [
        { p: 'Por que 12 cm?', r: 'Comprimento de onda = velocidade da luz ÷ frequência: 300 mil km/s ÷ 2,4 GHz ≈ 12,5 cm.' },
      ],
    },
    {
      id: 'placas', cap: 'II',
      titulo: 'Duas placas: *uma fala*, a outra escuta.',
      frase: 'A placa A envia 50 mensagens de Wi-Fi por segundo. A placa B mede como cada uma chegou.',
      seg: { completa: 18, curta: 15 },
      fala: 'Estas são as placas. A placa A manda cinquenta mensagens por segundo. A placa B não liga para o conteúdo: ela mede como cada mensagem chegou.',
      acao: ['APONTE: as placas A e B no estande.'],
      ponte: 'E a mensagem não vai só em linha reta.',
      perguntas: [
        { p: 'Por que ESP32, e não o roteador de casa?', r: 'Roteadores comuns não mostram a medida do canal (CSI). A ESP32 mostra, com o programa oficial da Espressif (ESP-CSI), e custa pouco.' },
        { p: 'O que vai dentro da mensagem?', r: 'Nada importante: é um pacote de teste. O que interessa é como ele chegou, não o que ele diz.' },
      ],
    },
    {
      id: 'caminhos', cap: 'II',
      titulo: 'O sinal chega por *vários caminhos*.',
      frase: 'Um vai direto. Os outros batem no teto, no chão e nas pessoas, e chegam um pouco depois.',
      seg: { completa: 20, curta: 18 },
      fala: 'A mensagem sai da placa A para todos os lados. Um pedaço vai direto para a B. Os outros batem no teto, no chão, em quem está na sala, e chegam um pouquinho depois. A B recebe tudo junto.',
      acao: [
        'DEIXE A ANIMAÇÃO: os pontinhos saem juntos de A; os dos caminhos longos chegam depois.',
        'APONTE: o caminho que bate na pessoa.',
      ],
      ponte: 'E o que acontece quando esses caminhos se encontram na placa B?',
      perguntas: [
        { p: 'Quanto "depois" chega o caminho rebatido?', r: 'Bilionésimos de segundo: a onda anda 30 cm por nanossegundo. Numa sala, os caminhos diferem de 1 a 25 m, ou seja, de 3 a 80 ns.' },
      ],
    },
    {
      id: 'soma', cap: 'II',
      titulo: 'Na placa B, os caminhos *se somam*.',
      frase: 'Crista com crista, o sinal fica forte. Crista com vale, ele some.',
      seg: { completa: 25, curta: 22 },
      fala: 'Aqui está o que chega na B, separado: o caminho direto e um caminho que rebateu. Quando as cristas se encontram, as ondas se somam e o sinal fica forte. Quando a crista de uma encontra o vale da outra, uma apaga a outra.',
      acao: [
        'PAUSA: fique em silêncio enquanto a animação vai de "reforça" para "cancela" uma vez.',
        'APONTE: a linha tracejada passando pelas cristas.',
        'ANALOGIA: duas pessoas balançando a mesma corda, no mesmo ritmo ou em ritmos opostos.',
      ],
      ponte: 'Agora a parte importante: e se alguém se mexer?',
      perguntas: [
        { p: 'Isso tem nome?', r: 'Interferência: construtiva (reforça) e destrutiva (cancela). No Wi-Fi, o efeito se chama desvanecimento por múltiplos percursos (multipath fading).' },
      ],
    },
    {
      id: 'mexe', cap: 'II',
      titulo: 'Quando alguém se mexe, *a soma muda*.',
      frase: 'Um passo muda o tamanho de um caminho. Meia onda, uns 6 cm, já troca crista por vale.',
      seg: { completa: 25, curta: 22 },
      fala: 'Quando a pessoa anda, o caminho que passa por ela fica mais curto ou mais longo. Basta meia onda, uns 6 centímetros, para a crista virar vale. Por isso a soma na placa B sobe e desce a cada passo.',
      acao: [
        'APONTE: o caminho que passa pela pessoa e, embaixo, a soma subindo e descendo no ritmo dela.',
        'PERGUNTE: "E se ela ficar parada?" Espere. (A soma para de mudar. Isso volta mais para a frente.)',
      ],
      ponte: 'Só que o Wi-Fi não usa uma onda só: usa 64.',
      perguntas: [
        { p: '6 cm não é muito pouco?', r: 'Para uma onda de 12 cm, 6 cm é meia volta. Um movimento de braço já passa disso; por isso o sinal é tão sensível a movimento.' },
      ],
    },
    {
      id: 'frequencias', cap: 'II',
      titulo: 'O Wi-Fi usa *64 ondas* juntas.',
      frase: 'Cada uma tem um tamanho um pouco diferente, então cada uma soma de um jeito. A placa B mede as 64: isso se chama CSI.',
      seg: { completa: 25, curta: 20 },
      fala: 'O canal do Wi-Fi é dividido em 64 ondas, de tamanhos um pouquinho diferentes. Como o tamanho muda, cada uma soma de um jeito: umas chegam fortes, outras fracas. A placa B mede as 64 de uma vez. Esse conjunto se chama CSI.',
      acao: ['APONTE: a barra que veio da cena anterior; depois, as outras 63 nascendo da placa B.'],
      ponte: 'Espalhar o sinal por várias frequências tem uma inventora.',
      perguntas: [
        { p: 'O que é CSI?', r: 'Channel State Information: para cada uma das 64 partes do canal, quanto a viagem mudou a força e a fase da onda. Usamos só a força (amplitude).' },
        { p: 'Por que 64?', r: 'O canal de 20 MHz do Wi-Fi é dividido em 64 subportadoras, a cada 312,5 kHz. Algumas ficam vazias (bordas e centro): são os pontinhos sem barra.' },
      ],
    },
    {
      id: 'salto', cap: 'II',
      titulo: 'Uma ideia de *Hedy Lamarr*.',
      frase: 'Em 1942, a atriz e inventora Hedy Lamarr patenteou, com George Antheil, o salto de frequência: o sinal pula de uma frequência para outra.',
      seg: { completa: 30, curta: 18 },
      fala: 'O tema desta JACITEC é Ciência Delas, e essa parte do Wi-Fi tem uma inventora. Em 1942, a atriz Hedy Lamarr e o compositor George Antheil patentearam o salto de frequência: o rádio pula de uma frequência para outra, numa ordem que só quem manda e quem recebe conhecem. A ordem vinha de um rolo de pianola, com 88 frequências, uma para cada tecla do piano. A ideia era guiar torpedos sem que o inimigo bloqueasse o sinal. Espalhar o sinal por várias frequências virou base da comunicação sem fio: o Bluetooth pula de frequência até hoje, e o Wi-Fi de hoje usa as 64 de uma vez.',
      acao: [
        'APONTE: o rosto dela, feito com as mesmas linhas do sinal (de uma foto de 1940).',
        'APONTE: o rolo descendo; cada furo que passa pela barra de leitura acende uma frequência, uma de cada vez.',
        'FALE: o tema da JACITEC, "Ciência Delas: Mulheres em Ciência, Tecnologia e Inovação".',
        'NÃO DIGA: que ela inventou o Wi-Fi. Ela inventou o salto de frequência, uma das ideias que abriram caminho.',
      ],
      ponte: 'Hoje, as 64 acendem juntas. E viram uma linha.',
      perguntas: [
        { p: 'Ela inventou o Wi-Fi?', r: 'Não o Wi-Fi inteiro. Ela inventou, com George Antheil, o salto de frequência, uma forma de espalhar o sinal por várias frequências. O Bluetooth usa salto de frequência até hoje, e a primeira versão do Wi-Fi, de 1997, tinha um modo com salto. O Wi-Fi de hoje espalha o sinal de outro jeito (as 64 ondas ao mesmo tempo).' },
        { p: 'Funcionou na guerra?', r: 'A Marinha dos EUA não adotou na época, e a patente venceu sem que ela ganhasse dinheiro com ela. O reconhecimento veio depois: o prêmio Pioneer da Electronic Frontier Foundation, em 1997, e o Hall da Fama dos Inventores dos EUA, em 2014.' },
        { p: 'Por que um rolo de pianola?', r: 'O transmissor e o receptor precisavam pular juntos, na mesma ordem. Antheil era compositor e já sincronizava pianolas; os rolos perfurados guardavam a ordem, como uma partitura. A patente é a nº 2.292.387, de 11 de agosto de 1942.' },
        { p: 'De onde vem o retrato?', r: 'De uma foto de 1940, de Clarence Bull para o estúdio MGM, que está em domínio público. Nós desenhamos o rosto com as mesmas linhas que mostram o sinal do Wi-Fi: onde a foto é mais clara, a linha sobe e fica mais forte. Não é imagem gerada por IA.' },
        { p: 'O que é o tema "Ciência Delas"?', r: 'É o tema da JACITEC 2026: "Ciência Delas: Mulheres em Ciência, Tecnologia e Inovação". É também o tema da Semana Nacional de Ciência e Tecnologia deste ano.' },
      ],
    },
    {
      id: 'linhas', cap: 'II',
      titulo: 'As 64 barras viram *uma linha*.',
      frase: 'Uma linha nova a cada 0,1 s. A de baixo é agora; as de cima são o passado.',
      seg: { completa: 15 },
      fala: 'Ligando o topo das barras, temos uma linha. Chega uma nova a cada décimo de segundo e empurra as outras para cima. São as linhas que vocês viram no começo.',
      acao: ['APONTE: a linha de baixo, mais grossa (agora), e as de cima (o passado).'],
      ponte: 'Com a sala parada, essas linhas se repetem. E com alguém andando?',
      perguntas: [
        { p: 'Cada linha é uma mensagem?', r: 'É a média das mensagens de 0,1 s (cerca de 10). O desenho realça o tremor 3 vezes para ficar visível; a detecção usa os valores sem realce.' },
      ],
    },
    {
      id: 'tremor', cap: 'II',
      titulo: 'Quando alguém anda, *as linhas tremem*.',
      frase: 'Com a sala parada, o desenho se repete. Cada passo muda as 64 somas ao mesmo tempo.',
      seg: { completa: 15, curta: 15 },
      fala: 'Com a sala parada, as linhas repetem o mesmo desenho. Quando alguém anda, as 64 somas mudam a cada passo, e as linhas tremem. É isso que o Wave Sense procura.',
      acao: ['APONTE: a pessoa entrando e as linhas de baixo, as mais novas, mudando primeiro.'],
      ponte: 'Para o computador decidir sozinho, o tremor vira um número.',
    },
    {
      id: 'numero', cap: 'II',
      titulo: '*Um número* diz o quanto tremeu.',
      frase: '1,0× é a sala vazia. Passou da linha tracejada, o sistema marca movimento.',
      seg: { completa: 25 },
      fala: 'O número compara o tremor de agora com o da sala vazia, que vale 1,0. Quando passa da linha tracejada, o sistema marca movimento.',
      acao: [
        'APONTE: o número e a linha tracejada.',
        'ESPERE: o tremidinho curto no fim do ciclo, que fica abaixo da linha: "um pico solto não dispara".',
      ],
      ponte: 'Agora com o sinal de verdade.',
      perguntas: [
        { p: 'Como o número é calculado?', r: 'Primeiro, cada pacote é ajustado para o mesmo volume, porque a placa muda o volume sozinha (ganho automático). Depois, para cada subportadora, o desvio padrão da amplitude em 1 segundo, e a média entre elas, a cada 0,2 s. Divide pelo valor da sala vazia, medido na calibração.' },
        { p: 'Por que ajustar o volume?', r: 'Nos testes, com a sala vazia, o número pulava sozinho de 0,8 a 4,8: era a placa subindo e descendo o volume. Ajustando cada pacote, a sala vazia ficou estável e a pessoa andando passou a se destacar.' },
        { p: 'E a linha tracejada?', r: 'Média da sala vazia + 3 desvios, no mínimo 1,3×. Três medidas seguidas acima viram "movimento"; cinco abaixo voltam a "parado".' },
      ],
    },
    {
      id: 'aovivo', cap: 'II', vitrine: false,
      titulo: 'Agora com o sinal das placas.', tituloSimulacao: 'Agora na simulação.', tituloGravacao: 'Agora com uma gravação.',
      tituloSemFonte: 'Aqui entra o sinal das placas.',
      frase: 'Mexa o braço entre as placas e veja o número subir.',
      seg: { completa: 35, curta: 30 },
      fala: 'Agora é com você: mexe o braço entre as placas e olha o número. Agora fica parado.',
      acao: [
        'FAÇA: o visitante mexe o braço e depois fica parado.',
        'LEIA: o número que aparecer na tela, nunca um número inventado.',
        'SIMULAÇÃO: na simulação ou numa gravação, diga isso; o título da cena mostra a fonte.',
      ],
      ponte: 'Funcionar uma vez não basta. Como a gente testou?',
    },
    {
      id: 'metodo', cap: 'III',
      titulo: 'Como *testamos*.',
      frase: 'Gravamos 30 s com a sala vazia e 30 s com alguém cruzando a linha entre as placas. O limite sai da sala vazia.',
      seg: { completa: 25 },
      fala: 'Gravamos 30 segundos com a sala vazia e 30 com alguém andando, cruzando a linha entre as placas. Cada traço é o tremor medido de verdade. O limite, a linha tracejada, sai da sala vazia: o normal dela, mais uma folga.',
      acao: [
        'APONTE: a linha de cima (sala vazia), quase reta; o limite tracejado; a de baixo subindo a cada travessia.',
        'SE PERGUNTAREM: foi 1 teste de cada (teste de montagem). Ainda não separamos gravações para ajustar e para conferir.',
      ],
      ponte: 'E o que o sistema percebeu?',
      perguntas: [
        { p: 'Por que separar as gravações?', r: 'Se o limite é escolhido e conferido nas mesmas gravações, o resultado sai bom demais, como fazer a prova com as questões da lista de exercícios. Gravações vizinhas da mesma sessão também são quase iguais; por isso a separação é por sessão.' },
        { p: 'Por que não têm a porcentagem de acerto?', r: 'Porque ainda não fizemos as sessões separadas (uma para ajustar, outra para testar). Preferimos não dar um número que não foi medido do jeito certo.' },
      ],
    },
    {
      id: 'resultados', cap: 'III', vitrine: false,
      titulo: 'O que os testes *mostraram*.', frase: 'A pessoa cruzou a linha 7 vezes, e o sistema percebeu as 7. Com a sala vazia, 2 alarmes curtos em 30 s.',
      seg: { completa: 25 },
      fala: 'Cada faixa clara é um momento em que o sistema disse "movimento". A pessoa cruzou a linha 7 vezes, e ele percebeu as 7. Com a sala vazia, deu 2 alarmes curtos em 30 segundos. Num outro teste, a 3,75 metros e com uma parede no meio, ele também percebeu a pessoa andando. É um teste de cada: mostra que funciona, ainda não é a taxa de acerto.',
      acao: [
        'APONTE: os números 1 a 7 em cima de cada travessia, e os 2 "alarme" na sala vazia.',
        'FALE: "é um teste de cada". Nunca transforme em porcentagem.',
        'SE PERGUNTAREM DE PROBLEMAS: o roteador e a TV perto da placa faziam metade dos pacotes se perder; afastando, passaram a chegar ~90%.',
      ],
      ponte: 'E o que o sistema não consegue ver?',
      perguntas: [
        { p: 'Quanto ele acerta?', r: 'Ainda não medimos a taxa de acerto com um teste separado. O que temos são testes de montagem: num deles, a pessoa cruzou a linha 7 vezes e ele detectou as 7; com a sala vazia, 2 alarmes curtos em 30 segundos. O próximo passo é gravar sessões separadas, uma para ajustar e outra para testar.' },
        { p: 'Que problemas vocês tiveram?', r: 'Três. 1) O roteador ao lado da placa B fazia metade dos pacotes se perder (a placa escuta todo o tráfego do canal). 2) O cabo USB só leva umas 72 linhas por segundo, então baixamos a placa A de 100 para 50 pacotes por segundo. 3) O ganho automático da placa fazia a sala vazia "tremer"; ajustamos o volume de cada pacote. Depois disso, chegaram de 76% a 92% dos pacotes e a sala vazia ficou estável.' },
        { p: 'Por que comparar com o chute?', r: 'Quando houver porcentagem: se 80% das gravações são "parado", responder sempre "parado" já acerta 80%. O resultado só vale alguma coisa acima disso.' },
      ],
    },
    {
      id: 'parado', cap: 'IV',
      titulo: 'Pessoa parada *não aparece*.',
      frase: 'Sem movimento, a soma não muda e as linhas ficam calmas. O sistema percebe movimento, não pessoas.',
      seg: { completa: 20, curta: 18 },
      fala: 'Lembra da pergunta da pessoa parada? A soma não muda, e as linhas ficam calmas. O sistema percebe movimento, não pessoas.',
      acao: ['FAÇA: o Jogo da Estátua; alguém fica parado entre as placas e "some" para o Wi-Fi.'],
      ponte: 'Mesmo com esses limites, dá para montar com pouco.',
      perguntas: [
        { p: 'Vocês mediram isso?', r: 'Mostramos ao vivo, no Jogo da Estátua. Nos testes, entre uma travessia e outra, quando a pessoa sai da linha, o número volta ao nível da sala vazia. Gravações com a pessoa parada ainda não fizemos.' },
        { p: 'Quais são os outros limites?', r: 'Distância entre as placas, paredes, várias pessoas ao mesmo tempo, interferência de outras redes e objetos que se mexem (ventilador, cortina, bicho). Cada lugar precisa calibrar de novo.' },
      ],
    },
    {
      id: 'viabilidade', cap: 'IV',
      titulo: 'Dá para montar *com pouco*.',
      frase: 'Duas placas ESP32, o programa aberto da Espressif e um notebook com Python.',
      fraseComCusto: 'Duas placas ESP32, o programa aberto da Espressif e um notebook com Python. As duas placas custaram {custo}.',
      seg: { completa: 20 },
      fala: 'São duas placas baratas, o programa oficial e aberto da Espressif e um notebook. A tela e a análise são nossas, em JavaScript e Python.',
      acao: ['FALE: o preço que pagaram (e preencham CUSTO no roteiro.js para ele aparecer na tela).'],
      ponte: 'E para que isso serve?',
      perguntas: [
        { p: 'Isso já existe no mercado?', r: 'Em 2025 o IEEE publicou um padrão só para sensoriamento por Wi-Fi, o 802.11bf. A ideia está indo para produtos; nosso projeto testa os limites com placas simples.' },
      ],
    },
    {
      id: 'usos', cap: 'IV',
      titulo: 'Onde isso pode ajudar.',
      frase: 'Perceber uma queda sem câmera, apagar a luz de uma sala vazia, alarme sem câmera.',
      seg: { completa: 15 },
      fala: 'Uma queda é um movimento forte e depois silêncio: dá para avisar alguém. Também dá para apagar a luz de uma sala vazia, ou fazer um alarme sem câmera.',
      acao: [],
      ponte: 'Mas tem o outro lado.',
    },
    {
      id: 'privacidade', cap: 'IV',
      titulo: 'E a *privacidade*?',
      frase: 'Se der para perceber alguém através da parede, quem está do lado de fora também poderia. Por isso medimos os limites.',
      seg: { completa: 20, curta: 18 },
      fala: 'Se o sinal atravessa paredes, alguém de fora poderia saber se tem gente em casa. Por isso medimos até onde funciona e discutimos regras de uso.',
      acao: ['PERGUNTE: "Você gostaria que o vizinho soubesse quando você está em casa?"'],
      ponte: 'Agora volte para as linhas do começo.',
      perguntas: [
        { p: 'Dá mesmo para ver através da parede?', r: 'Pesquisadores do MIT mostraram movimento atrás de parede em 2013 (Wi-Vi), com equipamento especial. Com a nossa placa, num teste, a 3,75 m e com uma parede no meio, percebemos a pessoa andando. Foi um teste só: funciona, mas ainda não sabemos o quanto acerta.' },
      ],
    },
    {
      id: 'fim', cap: null,
      titulo: 'Agora você sabe ler *estas linhas*.',
      frase: 'Tente atravessar a faixa sem fazê-las tremer: é a Travessia.',
      seg: { completa: 15, curta: 12 },
      fala: 'Lembra das linhas do começo? São ondas se somando na placa B. Quer testar? Tente atravessar a faixa sem que elas tremam.',
      acao: ['FAÇA: abra a Travessia (tecla N).', 'AVALIADOR: "Usamos um assistente de IA como apoio no código e nos textos. Revisamos tudo, e os dados são medidos por nós."'],
      ponte: null,
    },
  ];

  // Perguntas que não pertencem a uma cena só.
  const perguntasGerais = [
    { p: 'Dá para saber quem é a pessoa?', r: 'Não. O sistema mede o quanto o sinal tremeu, não forma, rosto ou nome. Ele percebe movimento.' },
    { p: 'E se tiver duas pessoas?', r: 'O tremor fica maior, mas o sistema não conta pessoas. Contar é um próximo passo, e ainda não testamos.' },
    { p: 'Ventilador ou cortina disparam?', r: 'Podem disparar, porque também mudam os caminhos do sinal. Por isso calibramos com a sala como ela fica normalmente e testamos com as gravações.' },
    { p: 'Por que não usar inteligência artificial (aprendizado de máquina)?', r: 'Primeiro, uma regra simples que dá para explicar e conferir. Um classificador (Random Forest) só entra se a regra funcionar com dados reais e sobrar tempo, e sempre testado por sessão.' },
    { p: 'Usaram IA no projeto?', r: 'Sim, um assistente de IA como apoio para consultar documentação, escrever partes do código e revisar textos. Tudo foi revisado e testado pela equipe, e os dados são medidos por nós.' },
    { p: 'Por que 50 pacotes por segundo, e não 100?', r: 'Cada medida vira uma linha de ~1.280 letras no cabo USB, e o cabo leva umas 72 por segundo. Com 100, sempre se perdiam pelo menos 20%. Com 50 sobra folga, e o detector precisa de só 10 por segundo.' },
    { p: 'O que ainda é simulação?', r: 'As ilustrações da história usam um modelo do canal com 4 caminhos. Na feira, as linhas e o número vêm das placas. Resultados, só os medidos.' },
  ];

  // Preço que vocês pagaram nas duas placas, como texto. Exemplo: 'R$ 90'. Sem preço, a frase não fala de valor.
  const CUSTO = null;

  // Segundos de cada transição entre cenas, nas setas e no passador. Mais = mais devagar.
  const transicao = 2.6;

  const api = { capitulos, cenas, perguntasGerais, CUSTO, transicao };
  raiz.WaveRoteiro = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

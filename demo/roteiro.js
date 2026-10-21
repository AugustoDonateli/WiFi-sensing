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
 * Para estudar (aba Estudar da janela do apresentador): o que precisa saber para explicar a cena, em linguagem simples.
 *   estudo     { ideia: a cena numa frase, saber: [3 a 5 coisas], explique: uma comparação do dia a dia,
 *                cuidado: o que não dizer (opcional) }
 *
 * Jeito de escrever: direto, como quem explica para um colega. Uma ideia por cena. Nada de frase de efeito.
 * Regras do projeto: nada de número inventado, e simulação nunca vira "medição".
 */
(function (raiz) {
  'use strict';

  // `cap` = o capítulo que aparece no canto da tela. 'CD' (Ciência Delas) é só a cena da Hedy Lamarr.
  // Ordem (ensaio de 21/10): quem somos e o que é; como funciona; o experimento; ciência de agora e Hedy;
  // para que serve (usos, escombros, quem mora sozinho, privacidade); e o convite para as brincadeiras.
  const capitulos = {
    I: 'I · Como funciona',
    II: 'II · O experimento',
    III: 'III · Ciência de agora',
    CD: 'Ciência Delas',
    IV: 'IV · Para que serve',
  };

  // Campos de cada cena: titulo e frase (na TV); fala, acao, ponte e perguntas (na colinha e no apresentador).
  // `falaCurta` e `ponteCurta`, quando existem, valem na versão curta. `seg` = segundos sugeridos.
  const cenas = [
    {
      id: 'intro', cap: null,
      titulo: 'Detectar movimento *só com o Wi-Fi*.',
      frase: 'Uma pesquisa sobre o que o Wi-Fi consegue perceber: onde dá para usar, quais os limites e quais os riscos. Duas placas medem o sinal, e o nosso site diz se alguém se mexeu.',
      seg: { completa: 35, curta: 30 },
      fala: 'Bom dia, pessoal! A gente é o Augusto e o Daniel, e este é o nosso trabalho: detectar movimento usando só o Wi-Fi. A ideia é descobrir onde isso pode ser usado, quais são os limites e quais são os perigos, como a privacidade. É uma pesquisa bem recente, pouco explorada, e ainda tem muita coisa para descobrir. O que a gente fez: estas duas placas medem o Wi-Fi e mandam para o nosso site, que diz se alguém se mexeu ou não. Já já a gente explica cada parte.',
      acao: [
        'APONTE: as duas placas de verdade e a tela com o site.',
        'FALE: devagar e olhando para as pessoas (à tarde, "boa tarde"). É aqui que elas decidem se vão ficar.',
      ],
      ponte: 'A primeira coisa: o Wi-Fi, na verdade, é uma onda.',
      perguntas: [
        { p: 'Então é um detector de movimento?', r: 'É uma pesquisa sobre o que o Wi-Fi consegue perceber das pessoas. Perceber movimento é a primeira coisa que a gente fez funcionar; a partir dela, a gente estuda os limites, os usos e os riscos.' },
        { p: 'Tem câmera ou sensor escondido?', r: 'Não. São só duas placas de Wi-Fi: uma manda mensagens e a outra mede como elas chegaram. Pode olhar as placas.' },
      ],
      estudo: {
        ideia: 'O Wave Sense é uma pesquisa sobre o que o Wi-Fi consegue perceber das pessoas. A primeira coisa que fizemos funcionar: perceber movimento, sem câmera.',
        saber: [
          'O sistema tem três partes: a placa A manda mensagens de Wi-Fi, a placa B mede como elas chegaram e o notebook roda o nosso site, que decide se alguém se mexeu.',
          'Os objetivos: descobrir onde isso pode ser usado, até onde funciona (os limites) e quais são os riscos (a privacidade).',
          'É ciência recente: virou padrão oficial do Wi-Fi só em 2025, e quase ninguém sabe que o Wi-Fi faz isso.',
          'As placas são ESP32, pequenas e baratas. O site e a análise foram programados pela gente.',
        ],
        explique: 'Pensa num morcego: ele solta um som e escuta o eco para perceber o que tem em volta. A gente faz parecido, só que com o sinal do Wi-Fi.',
        cuidado: 'Não prometa demais logo no começo: fale "perceber movimento", não "ver pessoas".',
      },
    },
    {
      id: 'placas', cap: 'I',
      titulo: 'Primeiro: o Wi-Fi é *uma onda*.',
      frase: 'Uma onda de rádio invisível, de uns 12 cm. A placa A manda 50 mensagens por segundo; a placa B mede como cada uma chegou.',
      seg: { completa: 20, curta: 12 },
      fala: 'O Wi-Fi é uma onda de rádio, invisível, com uns 12 centímetros de uma crista até a outra. A placa A fala: ela manda 50 mensagens por segundo nessa onda. A placa B escuta, mas não liga para o que a mensagem diz: ela mede como a mensagem chegou.',
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
      estudo: {
        ideia: 'A placa A manda mensagens de Wi-Fi o tempo todo. A placa B não liga para o que a mensagem diz, só para como ela chegou.',
        saber: [
          'As duas são placas ESP32: pequenas, baratas e com Wi-Fi.',
          'A placa A manda 50 mensagens por segundo. É uma mensagem de teste: o conteúdo não importa.',
          'A placa B mede, em cada mensagem, como o sinal chegou: forte ou fraco, em cada pedacinho do canal.',
          'O Wi-Fi é uma onda de rádio invisível. A de 2,4 GHz tem uns 12 cm de uma crista até a outra.',
          'Usamos a ESP32 porque o roteador comum não mostra essa medida. A ESP32 mostra, com um programa aberto da própria fabricante.',
        ],
        explique: 'É como gritar num corredor e prestar atenção no eco, não nas palavras. O eco conta como é o lugar.',
        cuidado: 'Não diga que as placas leem a internet de alguém. A placa B só mede o sinal das mensagens de teste da placa A.',
      },
    },
    {
      id: 'caminhos', cap: 'I',
      titulo: 'O sinal chega por *vários caminhos*.',
      frase: 'Um vai direto. Os outros batem no teto, no chão e nas pessoas, e chegam um pouquinho depois.',
      seg: { completa: 18, curta: 12 },
      fala: 'A mensagem sai da placa A para todo lado, tipo eco. Um pedaço vai reto até a B; outros batem no teto, no chão, em você, e chegam um tiquinho depois. A placa B recebe tudo misturado.',
      acao: [
        'DEIXE A ANIMAÇÃO: os pontinhos saem juntos; os dos caminhos longos chegam depois.',
        'APONTE: o caminho que bate na pessoa. "Esse aqui é você."',
      ],
      ponte: 'E o que acontece quando esses caminhos se encontram na placa B?',
      perguntas: [
        { p: 'Quanto "depois" chega o caminho rebatido?', r: 'Bilionésimos de segundo: a onda anda 30 cm por nanossegundo. Numa sala, os caminhos diferem de 1 a 25 m, ou seja, de 3 a 80 ns.' },
      ],
      estudo: {
        ideia: 'O sinal não vai só em linha reta: ele bate nas coisas e chega na placa B por vários caminhos ao mesmo tempo.',
        saber: [
          'A placa A espalha o sinal para todo lado, não só na direção da B.',
          'Um pedaço vai reto. Outros batem no teto, no chão, nos móveis e nas pessoas antes de chegar.',
          'Os caminhos mais longos chegam um tiquinho depois: bilionésimos de segundo.',
          'A placa B recebe tudo misturado, e é essa mistura que ela mede.',
          'Uma das coisas no caminho pode ser você. Por isso o seu corpo muda o que chega na B.',
        ],
        explique: 'É como cantar no banheiro: você ouve a sua voz direto e também o eco nas paredes, tudo junto.',
      },
    },
    {
      id: 'mexe', cap: 'I',
      titulo: 'Quem se mexe *muda a soma*.',
      frase: 'Na placa B, os caminhos se somam: crista com crista reforça, crista com vale apaga. Mexer uns 6 cm já troca uma pela outra.',
      seg: { completa: 30, curta: 22 },
      fala: 'Aqui está o segredo do projeto. Na placa B, os caminhos se somam. Se chegam crista com crista, o sinal fica forte; crista com vale, um apaga o outro. Quando você anda, o caminho que passa por você muda de tamanho. Uns 6 centímetros, meia onda, já trocam forte por fraco. Por isso a soma sobe e desce a cada passo.',
      acao: [
        'APONTE: embaixo, o caminho direto, o que passa pela pessoa e a soma, mais grossa, subindo e descendo no ritmo dos passos.',
        'ANALOGIA: duas pessoas balançando a mesma corda. No mesmo ritmo, a onda cresce; em ritmos opostos, ela some.',
      ],
      ponte: 'E como a gente vê isso na tela?',
      perguntas: [
        { p: 'Isso tem nome?', r: 'Interferência: construtiva (reforça) e destrutiva (cancela). No Wi-Fi, o efeito se chama desvanecimento por múltiplos percursos (multipath fading).' },
        { p: '6 cm não é muito pouco?', r: 'Para uma onda de 12 cm, 6 cm é meia volta. Um movimento de braço já passa disso; por isso o sinal é tão sensível a movimento.' },
      ],
      estudo: {
        ideia: 'Na placa B, os caminhos se somam. Quando alguém se mexe, essa soma muda, e é isso que a gente detecta.',
        saber: [
          'Ondas que chegam juntas se somam. Crista com crista: o sinal fica mais forte. Crista com vale: uma apaga a outra.',
          'Isso tem nome: interferência.',
          'Quando você anda, o caminho que passa por você fica mais curto ou mais comprido.',
          'Uns 6 cm, metade da onda, já trocam "reforça" por "apaga". Um movimento de braço já passa disso.',
          'Por isso o sinal é tão sensível a movimento, e por isso as linhas tremem. Esta é a ideia mais importante do projeto.',
        ],
        explique: 'Duas pessoas balançando a mesma corda: no mesmo ritmo, a onda cresce; em ritmos opostos, ela some. Quem anda pela sala muda o ritmo de um dos caminhos.',
        cuidado: 'Não diga que o sistema sabe onde a pessoa está ou a que distância. Ele só percebe que a soma mudou.',
      },
    },
    {
      id: 'linhas', cap: 'I',
      titulo: 'Cada instante vira *uma linha*.',
      frase: 'A placa B mede o sinal em vários pedacinhos do canal, 50 vezes por segundo. Cada medida vira uma linha; a de baixo é agora. Quando elas tremem, alguém se mexeu.',
      seg: { completa: 20, curta: 14 },
      fala: 'É assim que a gente enxerga isso na tela. O Wi-Fi manda o sinal em vários pedacinhos de frequência ao mesmo tempo, e a placa B mede a força de cada um. Juntando essas medidas, sai uma linha, e as linhas vão se empilhando: a de baixo é agora, as de cima são o passado. Sala parada, linhas calmas. Alguém se mexeu, as linhas tremem.',
      acao: [
        'APONTE: a linha de baixo, mais grossa (agora), e as de cima (o passado).',
        'APONTE: as linhas da tela principal: "agora vocês sabem ler isso".',
      ],
      ponte: 'Para o computador decidir sozinho, o tremor vira um número.',
      ponteCurta: 'E com as placas de verdade, funcionou?',
      perguntas: [
        { p: 'O que é CSI?', r: 'Channel State Information, a informação do estado do canal: para cada um dos 64 pedacinhos do canal, quanto a viagem mudou a força e a fase da onda. A gente usa a força (amplitude).' },
        { p: 'Por que 64?', r: 'O canal de 20 MHz do Wi-Fi é dividido em 64 subportadoras, a cada 312,5 kHz. Algumas ficam vazias (nas bordas e no centro).' },
        { p: 'Cada linha é uma mensagem?', r: 'É a média das mensagens de 0,1 s (cerca de 5). O desenho realça o tremor 3 vezes para ficar visível; a detecção usa os valores sem realce.' },
      ],
      estudo: {
        ideia: 'Cada medida da placa B vira uma linha. As linhas empilhadas mostram o sinal ao longo do tempo: calmas, ninguém se mexendo; tremendo, alguém se mexeu.',
        saber: [
          'O Wi-Fi não manda o sinal numa frequência só: o canal é dividido em 64 pedacinhos (subportadoras), e cada um soma de um jeito.',
          'A placa B mede a força de cada pedacinho em cada mensagem. Esse conjunto de medidas se chama CSI, a informação do estado do canal.',
          'Ligando as medidas de um instante, sai uma linha. Chega uma nova a cada décimo de segundo, embaixo, e empurra as outras para cima.',
          'Cada linha é a média de umas 5 mensagens. Na tela, o tremor aparece realçado para ficar visível; o detector usa os valores sem realce.',
        ],
        explique: 'É como um sismógrafo, o aparelho que registra terremotos: a linha fica calma até alguma coisa balançar.',
        cuidado: 'Fale em "pedacinhos de frequência"; não precisa explicar as 64 uma por uma. Se perguntarem, a resposta está nas perguntas.',
      },
    },
    {
      id: 'numero', cap: 'I',
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
      estudo: {
        ideia: 'Para o computador decidir sozinho, o tremor das linhas vira um número, comparado com a sala vazia.',
        saber: [
          'Primeiro, o sistema calibra: mede a sala vazia por um tempo. O tremor da sala vazia vale 1,0.',
          'Depois, a cada instante, ele mede o quanto o sinal variou no último segundo e compara com a sala vazia. Um número 3,0 quer dizer "três vezes mais que a sala vazia".',
          'Passou da linha tracejada, o limite, é movimento. Um pico solto não engana: precisa passar três vezes seguidas.',
          'A placa muda o volume do sinal sozinha. Por isso, antes da conta, cada mensagem é ajustada para o mesmo volume. Sem isso, a sala vazia parecia tremer.',
          'É uma regra simples, que dá para explicar e conferir. Inteligência artificial pode vir depois, com mais gravações.',
        ],
        explique: 'É como o termômetro e a febre: o número sozinho não diz nada; o que importa é se passou do limite.',
        cuidado: 'Não fale em porcentagem de acerto: ela ainda não foi calculada.',
      },
    },
    {
      id: 'resultados', cap: 'II',
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
      estudo: {
        ideia: 'Testamos com as placas de verdade, e o sistema percebeu cada travessia, até com uma parede no meio.',
        saber: [
          'Teste 1, com as placas a 1,5 m: 30 s de sala vazia e 30 s com uma pessoa cruzando. Ela cruzou 7 vezes, e o sistema percebeu as 7.',
          'Com a sala vazia, deu 2 alarmes curtos em 30 segundos. Vale falar disso: mostra que a gente olhou os erros também.',
          'Nas travessias, o sinal chegou a quase 6 vezes (5,9×) o da sala vazia. Esse número sai dos mesmos dados do gráfico.',
          'Teste 2, com as placas a 3,75 m e uma parede no meio: percebeu a pessoa andando do outro lado, e nenhum alarme com a sala vazia.',
          'Ainda não existe taxa de acerto: para isso, precisa de muitas gravações, umas para ajustar e outras só para testar. É o próximo passo.',
        ],
        explique: 'É como testar um alarme de carro: passamos na frente 7 vezes e ele tocou nas 7; com ninguém por perto, deu 2 toques curtos à toa.',
        cuidado: 'Os testes foram feitos em casa. Fale "nos nossos testes" e nunca invente uma porcentagem.',
      },
    },
    {
      id: 'parado', cap: 'II',
      titulo: 'Pessoa parada não aparece. *Ainda*.',
      frase: 'O sistema percebe movimento, não presença. Mas quem está parado respira, e um grupo de pesquisa já mediu a respiração com a mesma placa.',
      seg: { completa: 22, curta: 16 },
      fala: 'Quer brincar de estátua? Fica paradinho entre as placas... sumiu! Para o Wi-Fi, quem está parado não muda a soma. Mas parado você ainda respira, e em 2024 pesquisadores mediram a respiração de 8 pessoas com essa mesma plaquinha. É o próximo passo da nossa pesquisa.',
      acao: ['FAÇA: o Jogo da Estátua. A pessoa fica parada entre as placas e "some" para o Wi-Fi.'],
      ponte: 'E essa área de pesquisa é bem nova. Olha só.',
      perguntas: [
        { p: 'De onde vem o estudo da respiração?', r: 'Burimas e outros, "Monitoring the Sleep Respiratory Rate with Low-Cost Microcontroller Wi-Fi in a Controlled Environment", Applied Sciences, 2024. Usaram a ESP32 e compararam com uma cinta de respiração no peito, em 8 pessoas: erro médio de 2,6 respirações por minuto (1,4 com respiração normal).' },
        { p: 'Vocês mediram a pessoa parada?', r: 'Mostramos ao vivo, no Jogo da Estátua. Nos testes, entre uma travessia e outra, quando a pessoa sai da linha, o número volta ao nível da sala vazia. Gravações só com a pessoa parada são a próxima rodada.' },
        { p: 'O que mais atrapalha?', r: 'Distância entre as placas, várias pessoas ao mesmo tempo, outras redes no mesmo canal e coisas que se mexem sozinhas (ventilador, cortina, bicho). Por isso cada lugar é calibrado de novo.' },
      ],
      estudo: {
        ideia: 'O sistema percebe movimento, não presença: quem fica parado some. A respiração é o próximo passo.',
        saber: [
          'Parado, você não muda o tamanho dos caminhos. A soma não muda, e as linhas ficam calmas.',
          'Mas parado você ainda respira: o peito sobe e desce, bem pouco.',
          'Em 2024, pesquisadores mediram a respiração de 8 pessoas com essa mesma placa, a ESP32, comparando com uma cinta no peito.',
          'Para a gente, medir a respiração é o próximo passo: ainda não fizemos.',
          'Outras coisas atrapalham: muita distância, várias pessoas, outras redes no mesmo canal, ventilador e cortina. Por isso cada lugar é calibrado.',
        ],
        explique: 'É o Jogo da Estátua: quem fica parado some para o Wi-Fi. Mexeu, apareceu.',
        cuidado: 'Não diga que o nosso sistema já mede respiração. Quem mediu foi outro grupo de pesquisa.',
      },
    },
    {
      id: 'novo', cap: 'III',
      titulo: 'Isso é *ciência de agora*.',
      frase: 'Em 2013, o MIT mostrou o Wi-Fi percebendo gente atrás da parede, com equipamento de rádio especial. Em 2025, isso virou padrão oficial do Wi-Fi. Em 2026, a gente fez com duas placas baratas.',
      fraseComCusto: 'Em 2013, o MIT mostrou o Wi-Fi percebendo gente atrás da parede, com equipamento de rádio especial. Em 2025, isso virou padrão oficial do Wi-Fi. Em 2026, a gente fez com duas placas baratas ({custo}).',
      seg: { completa: 25, curta: 18 },
      fala: 'Isso é ciência de agora. Em 2013, o grupo da professora Dina Katabi, no MIT, mostrou o Wi-Fi percebendo gente se mexendo atrás de uma parede, com equipamento de rádio especial e caro. Em 2025, isso virou padrão oficial do Wi-Fi, o 802.11bf, e nos Estados Unidos já tem roteador fazendo isso na casa das pessoas. A nossa novidade é fazer com duas placas ESP32 baratinhas, programas abertos e um notebook. Dá para qualquer escola repetir.',
      acao: [
        'APONTE: cada ponto da linha do tempo acendendo.',
        'APONTE: as placas de verdade: "o nosso é só isso aqui".',
        'FALE: o preço que pagaram nas placas (e preencham CUSTO no roteiro.js para ele aparecer na tela).',
      ],
      ponte: 'E essa história tem uma inventora lá no começo.',
      perguntas: [
        { p: 'Se já existe, qual é a novidade de vocês?', r: 'A tecnologia é nova e pouca gente conhece. Os produtos são fechados; a gente montou do zero com duas placas baratas e programas abertos, mediu, testou com gravações reais e explica ao público como funciona, com os riscos.' },
        { p: 'O que é o 802.11bf?', r: 'É a parte do padrão Wi-Fi, publicada pelo IEEE em 2025, que define como os aparelhos de Wi-Fi podem medir o ambiente: perceber presença e movimento, além de levar internet.' },
        { p: 'Quem é Dina Katabi?', r: 'Professora do MIT, uma das pesquisadoras mais conhecidas da área. Em 2013, com Fadel Adib, apresentou o Wi-Vi, que percebia pessoas se mexendo atrás de uma parede usando Wi-Fi.' },
        { p: 'Isso já existe no mercado?', r: 'Sim. A Comcast oferece o "WiFi Motion" nos roteadores dos clientes nos EUA (é opcional). Empresas como a Cognitive Systems vendem o programa para fabricantes de roteadores. E em 2025 o IEEE publicou o 802.11bf, um padrão só para sensoriamento por Wi-Fi.' },
        { p: 'Como isso cresce?', r: 'Hoje são duas placas por cômodo. O caminho natural é o próprio roteador fazer a medida, como no 802.11bf e no produto da Comcast: aí não precisa comprar nada a mais. O programa da placa é aberto, e cada cômodo só precisa ser calibrado uma vez.' },
      ],
      estudo: {
        ideia: 'Perceber gente pelo Wi-Fi é ciência recente, que está chegando agora nas casas. O MIT começou com equipamento especial; a gente fez com duas placas baratas.',
        saber: [
          '2013: no MIT, nos EUA, o grupo da professora Dina Katabi, com Fadel Adib, apresentou o Wi-Vi, que percebia pessoas se mexendo atrás de uma parede, com equipamento de rádio especial.',
          '2025: o IEEE, a organização que escreve as regras do Wi-Fi, publicou o 802.11bf: a parte do padrão que diz como os aparelhos de Wi-Fi podem perceber presença e movimento.',
          'Hoje: nos EUA, a operadora Comcast já oferece detecção de movimento nos roteadores dos clientes (o WiFi Motion). É opcional, e o produto é fechado.',
          'O nosso: duas placas ESP32, o programa aberto da fabricante (Espressif), a tela e a análise programadas pela gente em JavaScript e Python, e um notebook.',
          'A nossa novidade não é a ideia: é ter feito do zero, como estudantes, com placas baratas e programas abertos, medindo, testando e explicando para o público. Dá para qualquer escola repetir.',
        ],
        explique: 'Pensa no Pix: pouco tempo atrás ninguém conhecia, hoje todo mundo usa. O Wi-Fi que percebe gente está no começo desse caminho.',
        cuidado: 'Não diga que fomos os primeiros. E falem o preço de verdade das placas; se não souberem, não chutem.',
      },
    },
    {
      id: 'salto', cap: 'CD',
      titulo: 'A inventora *Hedy Lamarr*.',
      frase: 'Famosa como atriz de Hollywood, ela também inventava. Em 1942, patenteou com George Antheil o salto de frequência. O reconhecimento só veio em 1997.',
      seg: { completa: 35, curta: 22 },
      fala: 'O tema desta JACITEC é Ciência Delas, e o Wi-Fi tem uma inventora na sua história: Hedy Lamarr, uma das atrizes mais famosas de Hollywood, que nas horas vagas inventava. Na Segunda Guerra, ela e o compositor George Antheil criaram o salto de frequência: o rádio pula de uma frequência para outra numa ordem secreta, guardada num rolo de pianola. Patentearam em 1942, mas a Marinha engavetou a ideia, e por décadas ela foi lembrada só pelos filmes. O reconhecimento como inventora veio em 1997, mais de 50 anos depois. Hoje, espalhar o sinal por várias frequências é base da comunicação sem fio, e o Bluetooth pula de frequência até hoje. E a história continua com mulheres: lembra da Dina Katabi, do MIT, na linha do tempo?',
      falaCurta: 'Tema da JACITEC: Ciência Delas. Hedy Lamarr era uma atriz famosa de Hollywood, e também inventora. Em 1942, ela e George Antheil patentearam o salto de frequência: o rádio pula de frequência numa ordem secreta, guardada num rolo de pianola. A Marinha engavetou a ideia, e o reconhecimento só veio em 1997. Hoje, espalhar o sinal por várias frequências é base da comunicação sem fio.',
      acao: [
        'APONTE: o rosto dela, feito com as mesmas linhas do sinal (de uma foto de 1940).',
        'APONTE: o rolo descendo; cada furo que passa pela barra de leitura acende uma frequência, uma de cada vez.',
        'FALE: o tema da JACITEC, "Ciência Delas: Mulheres em Ciência, Tecnologia e Inovação".',
        'CUIDADO: ela não inventou o Wi-Fi. Ela inventou o salto de frequência, uma das ideias que abriram o caminho.',
      ],
      ponte: 'E para que serve tudo isso?',
      perguntas: [
        { p: 'Ela inventou o Wi-Fi?', r: 'Não o Wi-Fi inteiro. Ela inventou, com George Antheil, o salto de frequência, uma forma de espalhar o sinal por várias frequências. O Bluetooth usa salto de frequência até hoje, e a primeira versão do Wi-Fi, de 1997, tinha um modo com salto. O Wi-Fi de hoje espalha o sinal de outro jeito: vários pedacinhos de frequência ao mesmo tempo.' },
        { p: 'Por que uma atriz inventou isso?', r: 'Ela gostava de inventar e aprendeu muito sobre armas e rádio ouvindo as conversas do primeiro marido, um fabricante de armas. Na guerra, os torpedos guiados por rádio podiam ser bloqueados pelo inimigo; o salto de frequência resolvia isso. Antheil, compositor, trouxe a ideia de sincronizar tudo com rolos de pianola.' },
        { p: 'Funcionou na guerra?', r: 'A Marinha dos EUA não adotou na época, e a patente venceu sem que ela ganhasse dinheiro. O reconhecimento veio depois: o prêmio Pioneer da Electronic Frontier Foundation, em 1997, e o Hall da Fama dos Inventores dos EUA, em 2014.' },
        { p: 'E hoje, tem mulheres nessa área?', r: 'Sim. Uma das mais conhecidas é Dina Katabi, professora do MIT. Em 2013, o grupo dela, com Fadel Adib, apresentou o Wi-Vi: Wi-Fi percebendo pessoas que se mexem atrás de uma parede. É a mesma área da nossa pesquisa.' },
        { p: 'Por que um rolo de pianola?', r: 'O transmissor e o receptor precisavam pular juntos, na mesma ordem. Antheil já sincronizava pianolas; os rolos perfurados guardavam a ordem, como uma partitura. A patente é a nº 2.292.387, de 11 de agosto de 1942.' },
        { p: 'De onde vem o retrato?', r: 'De uma foto de 1940, de Clarence Bull para o estúdio MGM, em domínio público. Nós desenhamos o rosto com as mesmas linhas que mostram o sinal do Wi-Fi: onde a foto é mais clara, a linha sobe. Não é imagem gerada por IA.' },
      ],
      estudo: {
        ideia: 'Hedy Lamarr, atriz de Hollywood, inventou com George Antheil o salto de frequência, uma das ideias que abriram caminho para a comunicação sem fio.',
        saber: [
          'Ela era uma das atrizes mais famosas de Hollywood e inventava nas horas vagas.',
          'Na Segunda Guerra, ela e o compositor George Antheil criaram o salto de frequência: o rádio pula de uma frequência para outra numa ordem secreta, guardada num rolo de pianola. Assim, o inimigo não consegue bloquear o sinal.',
          'Patentearam em 1942. A Marinha dos EUA engavetou a ideia, e por décadas ela foi lembrada só pelos filmes.',
          'O reconhecimento como inventora veio em 1997, com o prêmio Pioneer da EFF, e em 2014 ela entrou no Hall da Fama dos Inventores dos EUA.',
          'Por que ela está aqui: o tema da JACITEC é Ciência Delas. E, hoje, uma das pesquisadoras mais conhecidas da nossa área é uma mulher: Dina Katabi, do MIT.',
        ],
        explique: 'É como combinar com um amigo uma sequência de canais de rádio: vocês dois pulam juntos, e quem tenta atrapalhar nunca sabe em que canal vocês estão.',
        cuidado: 'Ela não inventou o Wi-Fi. Inventou o salto de frequência, uma das ideias que abriram o caminho. O Bluetooth usa salto de frequência até hoje.',
      },
    },
    {
      id: 'usos', cap: 'IV',
      titulo: 'E para que *serve* isso?',
      frase: 'Para achar gente viva debaixo de escombros, cuidar de quem mora sozinho e, aqui no estande, até para brincar.',
      seg: { completa: 15, curta: 10 },
      fala: 'E para que serve tudo isso? Perceber movimento sem câmera e sem nada no corpo abre muita porta. Dá para pensar em achar gente viva debaixo de escombros, em cuidar de quem mora sozinho e, aqui no estande, até em brincar. Vamos começar pela mais séria.',
      acao: [
        'DEIXE A ANIMAÇÃO: alguém andando entre as placas e as linhas tremendo.',
      ],
      ponte: 'Imagina um desabamento.',
      perguntas: [
        { p: 'Já usam isso de verdade?', r: 'Já tem produto: nos EUA, a Comcast oferece detecção de movimento nos roteadores dos clientes, e empresas como a Origin Wireless vendem para cuidado de idosos. Achar gente em escombros com Wi-Fi ainda é pesquisa.' },
      ],
      estudo: {
        ideia: 'Perceber movimento sem câmera e sem nada no corpo serve para muita coisa: das sérias (resgate, cuidado) às divertidas.',
        saber: [
          'Resgate: perceber alguém vivo debaixo de escombros pela respiração. É o futuro: ainda não testamos.',
          'Cuidado: avisar a família quando quem mora sozinho não se mexeu no horário de sempre. Usa só o que já funciona.',
          'Diversão: aqui no estande, a Travessia e o Escutar o Wi-Fi.',
          'Tudo isso sem câmera e sem a pessoa precisar usar nada no corpo.',
        ],
        explique: 'É como a luz do corredor que acende sozinha quando você passa, só que sem sensor especial: com o Wi-Fi que já está lá.',
        cuidado: 'Separe o que já funciona (perceber movimento) do que é ideia para o futuro (respiração, escombros).',
      },
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
      estudo: {
        ideia: 'Ondas de rádio atravessam entulho, e perceber a respiração de alguém soterrado pode salvar vidas. Para nós, é uma ideia para o futuro.',
        saber: [
          'Depois de um desabamento, a pergunta mais urgente é: onde ainda tem alguém vivo?',
          'Em 2015, no terremoto do Nepal, o FINDER, um radar da NASA do tamanho de uma mala, achou 4 homens soterrados pela respiração e pelos batimentos do coração.',
          'O FINDER é feito para isso e é caro. A ideia seria tentar algo parecido com placas de Wi-Fi baratas.',
          'O entulho enfraquece muito o sinal, e a pesquisa com Wi-Fi para isso ainda está no começo.',
          'A cena é uma ilustração. A gente ainda não testou em escombros.',
        ],
        explique: 'É como procurar alguém num quarto escuro pelo barulho da respiração, só que com ondas de rádio no lugar do ouvido.',
        cuidado: 'Não diga que o Wave Sense acha gente em escombros. É uma possibilidade para o futuro.',
      },
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
      ponte: 'E tem uma vantagem enorme sobre a câmera: a privacidade.',
      perguntas: [
        { p: 'E se a pessoa só dormiu até mais tarde?', r: 'O horário se ajusta à rotina de cada um, e o aviso pode primeiro perguntar "está tudo bem?" no celular da própria pessoa, antes de chamar a família.' },
        { p: 'De onde vêm os números?', r: 'Censo 2022 do IBGE, divulgado em outubro de 2024: 5,66 milhões de pessoas com 60 anos ou mais moram sozinhas no Brasil. No Espírito Santo, 20,6% dos lares têm um morador só, o 3º maior do país. E, segundo a OMS (2021), quedas são a segunda maior causa de morte por lesão acidental no mundo.' },
        { p: 'Isso já existe?', r: 'Empresas já vendem sensoriamento por Wi-Fi para cuidado de idosos, como a Origin Wireless, nos EUA. Os números de acerto que elas divulgam são delas mesmas.' },
      ],
      estudo: {
        ideia: 'Com o que o sistema já faz hoje (mexeu ou não mexeu), dá para avisar a família quando quem mora sozinho não se mexeu no horário de sempre.',
        saber: [
          'No Brasil, 5,7 milhões de idosos moram sozinhos (IBGE, Censo 2022). No Espírito Santo, um em cada cinco lares tem um morador só.',
          'A ideia: a casa aprende a rotina. Se até as 10h ninguém se mexeu, ela manda uma mensagem para a família.',
          'Não precisa de câmera nem de pulseira, e usa só o detector de movimento que já funciona.',
          'A rotina do desenho (acordou às 6h40) é inventada para explicar. Testar por vários dias é um próximo passo.',
          'Já existem empresas vendendo sensoriamento por Wi-Fi para cuidado de idosos, como a Origin Wireless, nos EUA.',
        ],
        explique: 'É como o vizinho que estranha quando você não abre a janela de manhã: ele não te vigia, só nota que a rotina mudou.',
        cuidado: 'Não diga que o sistema detecta queda. Ele percebe se houve movimento ou não.',
      },
    },
    {
      id: 'camera', cap: 'IV',
      titulo: 'Privacidade: o Wi-Fi *não te filma*.',
      frase: 'A câmera grava o seu rosto e precisa de luz. O Wi-Fi só percebe que alguém se mexeu: sem imagem, sem rosto, até no escuro.',
      seg: { completa: 25, curta: 18 },
      fala: 'E aqui está uma grande vantagem: a privacidade. Uma câmera grava o seu rosto, a sua roupa, tudo: você colocaria uma no seu quarto, ou no banheiro? O Wi-Fi não forma imagem nenhuma, ele só percebe que alguém se mexeu. E ainda funciona no escuro e atravessa a parede, onde a câmera não vê nada. No nosso projeto, os dados nem saem do notebook.',
      acao: [
        'PERGUNTE: "Você colocaria uma câmera no seu quarto?" Espere a resposta.',
        'APONTE: o campo de visão da câmera batendo na parede, e os anéis do Wi-Fi passando por ela.',
        'ESPERE: a luz apagar. A câmera não vê nada; o Wi-Fi continua percebendo a pessoa.',
      ],
      ponte: 'E agora, a parte divertida.',
      perguntas: [
        { p: 'Por que não usar câmera?', r: 'Câmera grava rosto e intimidade, precisa de luz e não enxerga através da parede. O Wi-Fi não forma imagem: ele só percebe que algo mudou no sinal.' },
        { p: 'Atravessa qualquer parede?', r: 'Paredes comuns, sim, com o sinal mais fraco; metal e concreto grosso atrapalham bastante. No nosso teste, a 3,75 m, percebemos a pessoa andando do outro lado de uma parede da casa.' },
        { p: 'No escuro funciona mesmo?', r: 'Sim: o Wi-Fi é onda de rádio, não precisa de luz. A demonstração funciona igual com a luz apagada.' },
        { p: 'Então não tem risco nenhum?', r: 'Tem: se o sinal atravessa parede, alguém de fora também poderia perceber se tem gente em casa. Nos EUA, os termos do WiFi Motion, da Comcast, dizem que os dados podem ir para a polícia com ordem judicial (noticiado pelo site BleepingComputer). Por isso a gente defende duas regras: só com consentimento, e o dado fica dentro de casa, como no nosso projeto.' },
        { p: 'E no projeto de vocês, onde ficam os dados?', r: 'No notebook. A tela não manda nada para a internet; o apelido e a marca de cada visitante ficam no navegador e são apagados no fim do dia.' },
      ],
      estudo: {
        ideia: 'A grande vantagem do Wi-Fi sobre a câmera é a privacidade: ele percebe movimento sem formar imagem nenhuma.',
        saber: [
          'A câmera grava rosto, roupa e tudo o que acontece. Ninguém quer uma câmera no quarto ou no banheiro.',
          'O Wi-Fi não forma imagem nem rosto. Ele só mostra que alguma coisa mudou no caminho do sinal.',
          'Ele funciona no escuro e atravessa paredes comuns, onde a câmera não vê nada. No nosso teste, a 3,75 m e com uma parede no meio, percebeu a pessoa andando do outro lado.',
          'No nosso projeto, tudo fica no notebook: a tela não manda nada para a internet.',
          'Tem risco também: quem está de fora poderia perceber se tem gente em casa. Por isso: só com consentimento, e o dado dentro de casa.',
        ],
        explique: 'É a diferença entre alguém te filmar e alguém só ouvir que tem gente andando na casa: dá para saber que tem movimento, mas não quem é nem o que está fazendo.',
        cuidado: 'Não diga que o Wi-Fi "enxerga através da parede". Ele percebe movimento do outro lado; imagem, não.',
      },
    },
    {
      id: 'fim', cap: null,
      titulo: 'Agora é *a sua vez*.',
      frase: 'Travessia: passe entre as placas sem fazer as linhas tremerem. Escutar: feche os olhos e ouça o Wi-Fi mudar quando alguém se mexe perto das placas.',
      fraseSimulacao: 'Estas linhas são uma simulação. Com as placas: tente a Travessia, ou feche os olhos e escute o Wi-Fi.',
      fraseGravacao: 'Estas linhas são uma gravação. Com as placas: tente a Travessia, ou feche os olhos e escute o Wi-Fi.',
      seg: { completa: 25, curta: 20 },
      fala: 'E não é só coisa séria: a gente trouxe duas brincadeiras para vocês. A primeira é a Travessia: você tenta passar entre as duas placas sem elas te perceberem. Dica: quem anda bem devagar quase some, porque o sistema percebe movimento. A segunda é Escutar o Wi-Fi: a gente transformou as mudanças do sinal em som, então dá para fechar os olhos e ouvir quando alguém se mexe perto das placas. Quer tentar?',
      acao: [
        'FAÇA: abra a Travessia (tecla N) e chame a pessoa para a PARTIDA.',
        'FAÇA: para escutar, aperte E e entregue o fone.',
        'SIMULAÇÃO: na simulação ou numa gravação, diga isso.',
        'AVALIADOR: "Usamos um assistente de IA como apoio no código e nos textos. Revisamos tudo, e os dados são medidos por nós."',
      ],
      ponte: null,
      estudo: {
        ideia: 'Fechar com o visitante testando: na Travessia ele vê o limite do sistema, e no Escutar ele ouve o sinal mudar.',
        saber: [
          'Travessia (tecla N): a pessoa atravessa a faixa entre as placas e tenta não fazer as linhas tremerem. Quem passa devagar tem mais chance, porque o sistema percebe movimento.',
          'Escutar o Wi-Fi (tecla E): as mudanças do sinal viram som. Com o fone, dá para fechar os olhos e ouvir quando alguém se mexe perto das placas.',
          'As linhas da tela agora fazem sentido para quem viu a apresentação: são o sinal medido, uma linha por instante.',
          'Se for um avaliador, conte que vocês usaram um assistente de IA como apoio no código e nos textos, e que revisaram tudo.',
        ],
        explique: 'Termine com uma pergunta: "E aí, quer tentar passar sem o Wi-Fi te perceber?". Deixe a pessoa responder.',
        cuidado: 'Não prometa que dá para passar invisível: às vezes dá, às vezes não. É isso que mostra o limite do sistema.',
      },
    },
  ];

  // A abertura da colinha e da aba Estudar: o projeto em 30 segundos, as 3 ideias para levar para casa e como falar.
  const kit = {
    trintaSegundos: 'Você sabia que o Wi-Fi consegue perceber a gente? Quase ninguém sabe. O sinal passa pela gente o tempo todo, e isso virou padrão oficial do Wi-Fi só em 2025. A nossa pesquisa é descobrir o que dá para perceber de uma pessoa só com esse sinal, sem câmera. Com duas plaquinhas baratas, a gente percebeu cada vez que alguém cruzou entre elas, até através de uma parede. Quer testar? Mexe o braço aqui.',
    ideias: [
      'O Wi-Fi consegue perceber gente, sem câmera, e isso é novo: virou padrão oficial do Wi-Fi em 2025.',
      'Como: o sinal chega por vários caminhos que se somam; quem se mexe muda essa soma, e as linhas tremem.',
      'Funcionou (7 travessias, 7 detecções; e através de uma parede). Serve para coisas boas, mas pede cuidado com a privacidade.',
    ],
    falar: 'É conversa, não prova oral. Não precisa decorar: leia a fala uma vez e conte do seu jeito. Comece pelo que a pessoa vê na tela, use "você" e faça perguntas. Se não souber algo, diga "boa pergunta, isso a gente ainda vai testar": é pesquisa, e pesquisa tem próximo passo.',
  };

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

  const api = { capitulos, cenas, kit, perguntasVisitante, perguntasGerais, CUSTO, transicao };
  raiz.WaveRoteiro = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

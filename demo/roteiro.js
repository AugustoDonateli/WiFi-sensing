/* Roteiro da história "Como funciona". SÓ CONTEÚDO: pode editar à vontade.
 *
 * Cada cena tem:
 *   id       nome interno (não mude: o desenho de cada cena é ligado a ele)
 *   cap      capítulo (chave de `capitulos`) ou null
 *   titulo   frase grande da tela
 *   frase    frase menor, embaixo do título
 *   notas    o que falar (aparece só na janela do apresentador)
 *   seg      segundos sugeridos em cada versão (sem `curta`, a cena não entra na versão curta)
 *   vitrine  false = não aparece quando a explicação toca sozinha
 *
 * Regras do projeto: nada de número inventado, e simulação nunca vira "medição".
 */
(function (raiz) {
  'use strict';

  const capitulos = {
    I: 'I · A pergunta',
    II: 'II · Como funciona',
    III: 'III · O experimento',
    IV: 'IV · Limites e usos',
    V: 'V · Ciência delas',
  };

  const cenas = [
    {
      id: 'abertura', cap: null,
      titulo: 'Wave Sense', frase: 'O Wi-Fi que percebe você. Sem câmera.',
      seg: { completa: 15, curta: 12 },
      notas: 'Apresente o projeto numa frase: o Wi-Fi que já existe em todo lugar consegue perceber quando alguém se mexe, sem nenhuma câmera. Diga que vão mostrar como funciona, até onde funciona e por que isso também é uma questão de privacidade.',
    },
    {
      id: 'pergunta', cap: 'I',
      titulo: 'Como saber se alguém caiu, sem uma câmera no banheiro?', frase: 'Câmeras invadem. Pulseiras são esquecidas.',
      seg: { completa: 20 },
      notas: 'O problema: para saber se alguém caiu (por exemplo, um idoso que mora sozinho), hoje se usa câmera, que invade a privacidade, ou pulseira, que a pessoa esquece de usar. A pergunta do projeto: dá para perceber movimento só com o Wi-Fi?',
    },
    {
      id: 'wifi', cap: 'I',
      titulo: 'O Wi-Fi já está em quase todo lugar.', frase: 'E atravessa a sala inteira, o tempo todo.',
      seg: { completa: 20, curta: 14 },
      notas: 'O Wi-Fi é onda de rádio: 2,4 GHz, ondas de uns 12 cm. Ele enche o ambiente e bate em tudo: paredes, móveis, pessoas. A ideia é usar isso como sensor, sem colocar nada no corpo de ninguém.',
    },
    {
      id: 'placas', cap: 'II',
      titulo: 'Uma placa fala. A outra escuta.', frase: '100 mensagens de Wi-Fi por segundo, entre duas placas ESP32.',
      seg: { completa: 25, curta: 18 },
      notas: 'Aponte para as placas A e B do estande. A placa A manda 100 mensagens por segundo; a B recebe e mede como cada uma chegou. São placas ESP32 de baixo custo, com o programa oficial da Espressif (ESP-CSI).',
    },
    {
      id: 'caminhos', cap: 'II',
      titulo: 'O sinal chega por vários caminhos.', frase: 'Ele bate nas paredes, nos móveis e em você.',
      seg: { completa: 25, curta: 18 },
      notas: 'Comparação da piscina: a placa A faz ondinhas e a B sente do outro lado. Sem ninguém na água, as ondas chegam sempre iguais. Quando alguém se mexe, os caminhos mudam, e o que chega na B muda.',
    },
    {
      id: 'acorde', cap: 'II',
      titulo: 'O Wi-Fi não é uma nota. É um acorde de 64.', frase: 'A placa B mede a força de cada uma. Isso se chama CSI.',
      seg: { completa: 30 },
      notas: 'O Wi-Fi não usa uma frequência só: divide o canal em 64 pedacinhos (subportadoras), a cada 312,5 kHz. A placa B mede a força de cada um. Esse conjunto de medidas se chama CSI, Channel State Information. Comparação do acorde: 64 notas tocando juntas.',
    },
    {
      id: 'linhas', cap: 'II',
      titulo: 'Cada linha é um décimo de segundo.', frase: 'A de baixo é agora.',
      seg: { completa: 20, curta: 14 },
      notas: 'Cada linha é a média de um décimo de segundo dessas 64 medidas. A mais nova entra embaixo e empurra as outras para cima; a de baixo, mais grossa, é agora. Isto ainda é ilustração: a tela de verdade vem daqui a pouco.',
    },
    {
      id: 'tremor', cap: 'II',
      titulo: 'Quando você se mexe, as linhas tremem.', frase: 'Os caminhos mudam, e as 64 notas mudam junto.',
      seg: { completa: 20, curta: 14 },
      notas: 'Quando alguém se mexe, os caminhos do sinal mudam a cada instante e as linhas tremem. Com a sala parada, elas repetem sempre o mesmo relevo.',
    },
    {
      id: 'numero', cap: 'II',
      titulo: 'Um número decide.', frase: 'Tremor comparado com a sala vazia. Passou da linha, é movimento.',
      seg: { completa: 30 },
      notas: 'O tremor é o desvio padrão de cada uma das 64 medidas em 1 segundo, com a média entre elas. Antes, medimos a sala vazia: esse é o 1,0×. O limite é a média da sala vazia mais 3 desvios. Três medidas seguidas acima do limite viram "movimento"; cinco abaixo voltam para "parado".',
    },
    {
      id: 'aovivo', cap: 'II', vitrine: false,
      titulo: 'Agora é de verdade.', tituloSimulacao: 'Agora, na simulação.', tituloGravacao: 'Agora, numa gravação.',
      frase: 'Mexa o braço entre as placas.',
      seg: { completa: 35, curta: 30 },
      notas: 'Peça para alguém mexer o braço entre as placas. Leia o número que aparecer na tela, nunca um número inventado. Se estiver na simulação ou numa gravação, diga isso: a etiqueta no canto mostra a fonte.',
    },
    {
      id: 'metodo', cap: 'III',
      titulo: 'Aprender com uma parte. Testar com outra.', frase: 'O teste nunca é usado para ajustar.',
      seg: { completa: 30 },
      notas: 'Gravamos coletas com rótulo: sala vazia, pessoa parada, andando e queda simulada no colchonete (nunca queda de verdade), com voluntários que assinaram o termo de consentimento. Cada sessão é um bloco gravado de uma vez. Sessões ímpares ajustam o limite; as pares só testam. Assim o teste é honesto.',
    },
    {
      id: 'resultados', cap: 'III', vitrine: false,
      titulo: 'O que medimos.', frase: 'Medindo. Os números entram aqui depois das coletas.',
      seg: { completa: 35 },
      notas: 'Diga o resultado por coleta (não por janela: as janelas vizinhas se parecem), sempre ao lado do chute, que é responder sempre a classe mais comum. Se ainda não houver números, diga que estão medindo.',
    },
    {
      id: 'parado', cap: 'IV',
      titulo: 'Parado, você some.', frase: 'Ele percebe movimento, não pessoas. Distância, paredes e várias pessoas também atrapalham.',
      seg: { completa: 25, curta: 18 },
      notas: 'Jogo da Estátua: peça para a pessoa ficar parada entre as placas. Ela some para o Wi-Fi, porque o detector percebe movimento, não pessoas. Outros limites: distância entre as placas, paredes, várias pessoas ao mesmo tempo e interferência. Cada lugar precisa calibrar.',
    },
    {
      id: 'usos', cap: 'IV',
      titulo: 'Cuidar sem vigiar.', frase: 'Queda de idosos, luz que apaga sozinha, alarme sem câmera.',
      seg: { completa: 25, curta: 18 },
      notas: 'Usos: perceber queda de idoso sem câmera no banheiro (uma queda é um movimento forte e depois silêncio), apagar a luz quando a sala esvazia, alarme sem câmera. É viável: duas placas baratas, programa aberto e Python.',
    },
    {
      id: 'privacidade', cap: 'IV',
      titulo: 'E se alguém de fora perceber você?', frase: 'Por isso a gente mede os limites e discute as regras.',
      seg: { completa: 25, curta: 18 },
      notas: 'O lado ruim: se o sinal atravessa paredes, alguém de fora poderia saber se tem gente em casa. Pesquisadores do MIT mostraram movimento atrás de parede em 2013 (Wi-Vi), com equipamento especial. Com a nossa placa, é o que estamos testando. Por isso medimos os limites e discutimos regras de uso.',
    },
    {
      id: 'lamarr', cap: 'V',
      titulo: 'Em 1942, Hedy Lamarr patenteou o salto de frequência.', frase: '88 frequências, como as teclas de um piano.',
      seg: { completa: 20 },
      notas: 'Tema da JACITEC, Ciência delas. Em 1942, a atriz e inventora Hedy Lamarr patenteou, com George Antheil, o salto de frequência: o sinal pula entre 88 frequências, como as 88 teclas de um piano, para não ser interceptado. É uma das ideias que abriram caminho para comunicações sem fio como o Bluetooth.',
    },
    {
      id: 'fim', cap: null,
      titulo: 'Agora tente passar sem ser percebido.', frase: 'Desafio Ninja.',
      seg: { completa: 15, curta: 12 },
      notas: 'Convide para o Desafio Ninja (tecla N). Para o avaliador: "Usamos um assistente de IA como apoio no código e nos textos. Revisamos tudo, e os dados foram medidos por nós." Agradeça.',
    },
  ];

  // Preencher só com números do ferramentas/avaliar.py (resultado POR COLETA), sempre com o chute ao lado.
  // Exemplo: { coletas: 24, acerto: 0.88, chute: 0.5, data: '19/10/2026' }
  const RESULTADOS = null;

  const api = { capitulos, cenas, RESULTADOS };
  raiz.WaveRoteiro = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

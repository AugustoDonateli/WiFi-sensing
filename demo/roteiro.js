/* Conteúdo da apresentação. A colinha usa Diga / Faça / Conecte; detalhes ficam recolhidos.
 * O projeto está em simulação. Ilustrações nunca são apresentadas como medições.
 */
(function (raiz) {
  'use strict';
  const capitulos = { I: 'I · O invisível', II: 'II · Do sinal ao movimento', III: 'III · O que falta provar', IV: 'IV · Sua vez' };
  const cenas = [
    {
      id: 'abertura', cap: 'I', layout: 'lateral',
      titulo: 'O que mudou *aqui*?', frase: 'Uma sala. Nenhuma câmera. Um sinal que conta outra história.',
      seg: { completa: 16, curta: 12 },
      diga: 'Algo se moveu nesta sala. Como perceber isso sem uma câmera? O Wave Sense explora uma pista que atravessa o ambiente: o Wi-Fi. Hoje, vocês vão ver uma simulação dessa ideia.',
      faca: 'Espere o desenho mudar. Pergunte o que o público percebeu antes de explicar.',
      conecte: 'Para entender essa pista, vamos acompanhar uma mensagem.',
      detalhes: 'A abertura é uma ilustração. Ainda não realizamos medições com as placas. Identificar quedas exigiria outra etapa de pesquisa.',
    },
    {
      id: 'mensagem', cap: 'I', layout: 'lateral',
      titulo: 'Uma mensagem. Uma *onda de rádio*.', frase: 'A envia. B recebe. Entre as duas, existe uma sala inteira.',
      seg: { completa: 23, curta: 16 },
      diga: 'Wi-Fi transmite informações usando ondas de rádio. No experimento planejado, uma ESP32 envia mensagens e outra recebe. Vamos observar como o ambiente altera o sinal que chega.',
      faca: 'Acompanhe o ponto de A até B. Se houver placas no estande, mostre-as como o próximo passo.',
      conecte: 'Só que a mensagem não chega por uma estrada única.',
      detalhes: 'O ESP-CSI da Espressif permite acessar informações do canal nas ESP32. Roteadores domésticos comuns nem sempre expõem esses dados. A taxa de mensagens será verificada nas coletas.',
    },
    {
      id: 'caminhos', cap: 'I', layout: 'panorama',
      titulo: 'A sala também *participa* da mensagem.', frase: 'Paredes, móveis e pessoas criam vários caminhos até o receptor.',
      seg: { completa: 26, curta: 18 },
      diga: 'Uma parte do sinal chega diretamente. Outras partes refletem no ambiente. Quando algo se move, esses caminhos mudam. O receptor recebe uma mistura dessas contribuições.',
      faca: 'Mostre o caminho direto e depois as reflexões. Espere a pessoa deslocar um caminho.',
      conecte: 'O que acontece quando essas ondas se encontram?',
      detalhes: 'A planta é esquemática, sem escala física. Ela não representa uma posição calculada pelo sistema. Os caminhos reais são muito mais numerosos.',
    },
    {
      id: 'mistura', cap: 'II', layout: 'panorama',
      titulo: 'Juntas, as ondas podem *mudar tudo*.', frase: 'Às vezes se reforçam. Às vezes se cancelam. O receptor mede o resultado.',
      seg: { completa: 29, curta: 21 },
      diga: 'Estas ondas são um exemplo simplificado. Alinhadas, elas se reforçam. Deslocadas, podem se cancelar. Mover uma pessoa altera os caminhos e a maneira como as contribuições se somam.',
      faca: 'Espere a soma crescer e diminuir. Use Repetir para mostrar o efeito outra vez.',
      conecte: 'Essa mistura não é igual em todas as partes do canal Wi-Fi.',
      detalhes: 'A soma envolve a fase dos sinais. A animação usa duas contribuições iguais para deixar o cancelamento visível; isso não significa que todo o sinal desapareça numa sala real.',
    },
    {
      id: 'acorde', cap: 'II', layout: 'panorama',
      titulo: 'Um retrato do *canal*.', frase: 'O CSI descreve como o sinal chegou em diferentes subportadoras.',
      seg: { completa: 26, curta: 19 },
      diga: 'O canal Wi-Fi usa várias subportadoras. O CSI descreve como o sinal chegou em cada uma. Aqui mostramos amplitudes: as barras formam um perfil. É um retrato do canal, não uma imagem da pessoa.',
      faca: 'Mostre a mesma forma nas barras e na curva. Diga partes do canal antes de usar subportadoras.',
      conecte: 'Um perfil mostra um instante. E se guardarmos os próximos?',
      detalhes: 'CSI significa Channel State Information e inclui amplitude e fase. Nosso detector usa a variação das amplitudes. O vetor tem 64 posições, mas posições inválidas ou nulas são descartadas; não são 64 frequências úteis em toda configuração.',
    },
    {
      id: 'linhas', cap: 'II', layout: 'lateral',
      titulo: 'O presente vira *memória*.', frase: 'A nova leitura entra embaixo. As anteriores sobem guardando sua forma.',
      seg: { completa: 24, curta: 17 },
      diga: 'O perfil vira uma linha. A próxima leitura entra embaixo e a anterior sobe sem perder o desenho. Assim vemos a mudança ao longo do tempo. Não estamos desenhando o corpo de alguém.',
      faca: 'Aponte a linha mais recente e acompanhe-a subindo. Espere duas leituras.',
      conecte: 'Mas um sinal nunca fica perfeitamente imóvel. Como decidir o que é movimento?',
      detalhes: 'A tela principal recebe uma linha a cada 0,1 segundo. O detector usa as amplitudes antes do realce visual. Nesta ilustração usamos menos linhas e tempo mais lento para acompanhar cada leitura.',
    },
    {
      id: 'calibracao', cap: 'II', layout: 'panorama',
      titulo: 'Primeiro, aprender o *normal*.', frase: 'Referência → variação → confirmação. Um pico sozinho não decide.',
      seg: { completa: 29, curta: 21 },
      diga: 'Começamos com a sala vazia e parada, porque o sinal já oscila um pouco. Essa referência ajuda a definir um limite. Depois comparamos a variação recente e exigimos confirmações seguidas antes de marcar movimento.',
      faca: 'Siga a referência, o pico isolado e as três confirmações. O gráfico é um exemplo, sem valores medidos.',
      conecte: 'Agora faça uma previsão: o que acontece se a pessoa parar?',
      detalhes: 'O detector calcula a média dos desvios padrão das amplitudes em 1 s, a cada 0,2 s. O limiar usa média + 3 desvios da referência, com mínimo de 1,3 vezes sua média. Liga após 3 confirmações; desliga após 5.',
    },
    {
      id: 'aovivo', cap: 'II', layout: 'lateral', vitrine: false,
      titulo: 'E se a pessoa *parar*?', tituloGravacao: 'O que mudou na *gravação*?', tituloSemFonte: 'Vamos testar uma *previsão*.',
      frase: 'Observe a variação recente e a memória que continua subindo.',
      fraseSimulacao: 'Faça uma previsão. Depois escolha Mover e Parar na simulação.',
      fraseGravacao: 'O trecho já aconteceu. Esta reprodução não responde ao movimento do público.',
      fraseSemFonte: 'Conecte uma fonte de dados para observar as linhas e o detector.',
      seg: { completa: 40, curta: 32 },
      diga: 'O detector procura mudanças ao longo do tempo. O que acontece quando a pessoa para? Vamos observar o número e esperar a memória passar.',
      digaSimulacao: 'Esta é a simulação do site. O que acontece quando a pessoa para? Vou escolher Mover e depois Parar. Observem a variação diminuir e o movimento antigo continuar subindo na memória.',
      digaGravacao: 'Este sinal vem de uma gravação. Podemos observar o que aconteceu, mas mover o braço agora não altera estes dados.',
      digaSemFonte: 'Estamos sem uma fonte conectada. Para a demonstração, precisamos da simulação, de uma gravação ou das placas.',
      faca: 'Pergunte, espere a resposta, escolha Mover, aguarde o detector e escolha Parar. Espere cerca de 5 s para observar a memória.',
      facaAoVivo: 'Peça um movimento entre as placas e depois uma pausa. Leia o resultado que aparecer, mesmo se não houver detecção.',
      facaGravacao: 'Aponte trechos de mudança e de calma. Não peça uma ação como se alterasse o sinal.',
      facaSemFonte: 'Avance ou conecte uma fonte nas opções do site.',
      conecte: 'Uma simulação explica a ideia. O experimento vai dizer até onde ela funciona.',
      detalhes: 'Pouca variação não prova que a sala está vazia. A janela de análise e as confirmações causam atraso. Uma pessoa parada ainda pode produzir pequenas mudanças. O desempenho real permanece por medir.',
    },
    {
      id: 'metodo', cap: 'III', layout: 'panorama',
      titulo: 'Da demonstração à *evidência*.', frase: 'Hoje: simulação. Próximo passo: coletar, separar sessões e testar.',
      seg: { completa: 31 },
      diga: 'Ainda estamos na simulação. Vamos coletar situações identificadas, separar sessões para ajustar e outras para testar. Só depois apresentaremos acertos e erros, comparados com uma resposta simples de referência.',
      faca: 'Mostre a divisão entre ajustar e testar. A seta representa um plano de trabalho.',
      conecte: 'Mesmo um bom resultado precisa vir acompanhado dos seus limites.',
      detalhes: 'Plano inicial: sala vazia, pessoa parada e movimento, em sessões independentes. Avaliar por coleta, sem misturar janelas vizinhas entre ajuste e teste. Queda exigiria protocolo seguro e validação próprios. Ainda não há porcentagem de acerto.',
    },
    {
      id: 'limites', cap: 'III', layout: 'lateral',
      titulo: 'Movimento é uma *pista*.', frase: 'Não é identidade, localização nem prova de que a sala está vazia.',
      seg: { completa: 25, curta: 19 },
      diga: 'O detector resume quanto o canal variou. Não identifica quem passou nem determina onde está a pessoa. Pouca variação não prova ausência. Paredes, distância e outras mudanças precisam entrar no teste.',
      faca: 'Use as três perguntas. Dê um exemplo: uma pessoa parada pode continuar ali.',
      conecte: 'Com esses limites claros, podemos pensar numa aplicação responsável.',
      detalhes: 'O apelido da Travessia é informado pela pessoa. O desenho registra aquela passagem, sem comprovação de identidade. Outras pessoas, interferência e objetos em movimento podem alterar o canal.',
    },
    {
      id: 'aplicacao', cap: 'III', layout: 'panorama',
      titulo: 'Uma pista abre *uma pergunta*.', frase: 'Uma mudança inesperada poderia motivar uma verificação. Reconhecer uma queda é outra pesquisa.',
      seg: { completa: 25 },
      diga: 'Uma possibilidade futura é perceber uma mudança inesperada e pedir que alguém verifique o ambiente. Detectar movimento não basta para reconhecer uma queda. Essa aplicação exigiria outro detector e testes específicos.',
      faca: 'Siga o movimento até a pergunta Vale verificar? Esta é uma hipótese de uso.',
      conecte: 'Até uma pista sem imagem pode revelar algo sobre uma pessoa.',
      detalhes: 'Não há um sistema de monitoramento de saúde validado. Movimento seguido de silêncio não comprova uma queda; silêncio não comprova sala vazia.',
    },
    {
      id: 'privacidade', cap: 'IV', layout: 'panorama',
      titulo: 'Sem imagem. Ainda com *responsabilidade*.', frase: 'O que medir? Quem pode ver? Por quanto tempo guardar?',
      seg: { completa: 25, curta: 18 },
      diga: 'Sem câmera, não produzimos uma imagem da pessoa. Ainda assim, registros de movimento podem revelar hábitos. Precisamos explicar a coleta, limitar o acesso e guardar só o necessário.',
      faca: 'Passe pelas três escolhas. Relacione-as ao convite voluntário para a Travessia.',
      conecte: 'Agora vocês podem participar sabendo o que o desenho significa.',
      detalhes: 'Não demonstramos sensoriamento através de paredes com estas placas. A Travessia atual guarda registros neste navegador; isso não equivale a uma política completa para um experimento real.',
    },
    {
      id: 'fim', cap: null, layout: 'lateral',
      titulo: 'Sua passagem deixa *um desenho*.', frase: 'Wave Sense · Experimente a Travessia. O apelido é seu; o registro é do sinal.',
      seg: { completa: 16, curta: 12 },
      diga: 'Na Travessia, a mudança do sinal vira um desenho da participação. O apelido é escolhido pela pessoa; o desenho não identifica ninguém. Quer experimentar a versão simulada?',
      digaAoVivo: 'Na Travessia, a mudança do sinal durante sua participação vira um desenho. Ele não identifica você. O apelido é opcional. Quer experimentar?',
      faca: 'Espere as linhas virarem anéis. Aperte N para abrir a Travessia.',
      conecte: 'Convide uma pessoa por vez e explique os controles.',
      detalhes: 'O encerramento é uma transformação artística de dados ilustrativos. No jogo, os anéis usam o registro da participação. Na simulação, a mudança vem dos controles. A IA apoiou código e textos; a revisão é do grupo e as medições físicas ainda serão realizadas.',
    },
  ];
  const CUSTO = null, RESULTADOS = null, transicao = 2.6;
  function conteudo(c, fonte) {
    const sufixo = { sim: 'Simulacao', replay: 'Gravacao', live: 'AoVivo' }[fonte] || 'SemFonte';
    const obter = (chave) => c[chave + sufixo] || c[chave] || '';
    return { titulo: obter('titulo'), frase: obter('frase'), diga: obter('diga'), faca: obter('faca'), conecte: c.conecte || '', detalhes: c.detalhes || '' };
  }
  cenas.forEach((c) => { c.notas = c.diga + '\n\nFaça: ' + c.faca + '\n\nConecte: ' + c.conecte; });
  const api = { capitulos, cenas, CUSTO, RESULTADOS, transicao, conteudo };
  raiz.WaveRoteiro = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

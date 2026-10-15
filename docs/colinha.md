# Colinha da apresentação "Como funciona"

Gerada por `ferramentas/colinha.py` a partir do `demo/roteiro.js`. Não edite aqui: edite o roteiro e gere de novo.

- **Completa:** 19 cenas, cerca de 6:38 (para avaliador).
- **Curta:** 11 cenas, cerca de 3:25 (para visitante). As cenas da curta estão marcadas com ●.
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

→ *Por que isso importa? Pense em alguém que mora sozinho.*

## I · A pergunta

### 2. Como saber se alguém caiu sem câmera?
*20 s*

**Fala.** Queda é a segunda maior causa de morte por acidente no mundo, e quem mais morre são pessoas com mais de 60 anos. Para perceber uma queda, hoje se usa câmera, que invade a privacidade, ou pulseira, que a pessoa esquece. Nossa pergunta: dá para usar o Wi-Fi?

- PERGUNTE: "Você colocaria uma câmera no banheiro da sua avó?" Espere a resposta.

→ *Para responder, primeiro: o que é o Wi-Fi?*

> **De onde vem o dado das quedas?** Da OMS, ficha "Falls" (26/04/2021): quedas são a segunda maior causa de morte por lesão não intencional no mundo, e os maiores de 60 anos são os mais atingidos.

## II · Como funciona

### 3. O Wi-Fi é uma onda.
*15 s*

**Fala.** O Wi-Fi é uma onda de rádio. Parecida com a da água, só que invisível. Cada onda tem uns 12 centímetros, mais ou menos um palmo. Ela sai do roteador, enche a sala e bate em tudo: parede, móvel, gente.

- APONTE: a régua de 12 cm em cima da onda.

→ *Para medir essa onda, usamos duas plaquinhas.*

> **Por que 12 cm?** Comprimento de onda = velocidade da luz ÷ frequência: 300 mil km/s ÷ 2,4 GHz ≈ 12,5 cm.

### 4. Duas placas: uma fala, a outra escuta. ●
*18 s (curta: 15 s)*

**Fala.** Estas são as placas. A placa A manda cem mensagens por segundo. A placa B não liga para o conteúdo: ela mede como cada mensagem chegou.

- APONTE: as placas A e B no estande.

→ *E a mensagem não vai só em linha reta.*

> **Por que ESP32, e não o roteador de casa?** Roteadores comuns não mostram a medida do canal (CSI). A ESP32 mostra, com o programa oficial da Espressif (ESP-CSI), e custa pouco.
>
> **O que vai dentro da mensagem?** Nada importante: é um pacote de teste. O que interessa é como ele chegou, não o que ele diz.

### 5. O sinal chega por vários caminhos. ●
*20 s (curta: 18 s)*

**Fala.** A mensagem sai da placa A para todos os lados. Um pedaço vai direto para a B. Os outros batem no teto, no chão, em quem está na sala, e chegam um pouquinho depois. A B recebe tudo junto.

- DEIXE A ANIMAÇÃO: os pontinhos saem juntos de A; os dos caminhos longos chegam depois.
- APONTE: o caminho que bate na pessoa.

→ *E o que acontece quando esses caminhos se encontram na placa B?*

> **Quanto "depois" chega o caminho rebatido?** Bilionésimos de segundo: a onda anda 30 cm por nanossegundo. Numa sala, os caminhos diferem de 1 a 25 m, ou seja, de 3 a 80 ns.

### 6. Na placa B, os caminhos se somam. ●
*25 s (curta: 22 s)*

**Fala.** Aqui está o que chega na B, separado: o caminho direto e um caminho que rebateu. Quando as cristas se encontram, as ondas se somam e o sinal fica forte. Quando a crista de uma encontra o vale da outra, uma apaga a outra.

- PAUSA: fique em silêncio enquanto a animação vai de "reforça" para "cancela" uma vez.
- APONTE: a linha tracejada passando pelas cristas.
- ANALOGIA: duas pessoas balançando a mesma corda, no mesmo ritmo ou em ritmos opostos.

→ *Agora a parte importante: e se alguém se mexer?*

> **Isso tem nome?** Interferência: construtiva (reforça) e destrutiva (cancela). No Wi-Fi, o efeito se chama desvanecimento por múltiplos percursos (multipath fading).

### 7. Quando alguém se mexe, a soma muda. ●
*25 s (curta: 22 s)*

**Fala.** Quando a pessoa anda, o caminho que passa por ela fica mais curto ou mais longo. Basta meia onda, uns 6 centímetros, para a crista virar vale. Por isso a soma na placa B sobe e desce a cada passo.

- APONTE: o caminho que passa pela pessoa e, embaixo, a soma subindo e descendo no ritmo dela.
- PERGUNTE: "E se ela ficar parada?" Espere. (A soma para de mudar. Isso volta mais para a frente.)

→ *Só que o Wi-Fi não usa uma onda só: usa 64.*

> **6 cm não é muito pouco?** Para uma onda de 12 cm, 6 cm é meia volta. Um movimento de braço já passa disso; por isso o sinal é tão sensível a movimento.

### 8. O Wi-Fi usa 64 ondas juntas. ●
*25 s (curta: 20 s)*

**Fala.** O canal do Wi-Fi é dividido em 64 ondas, de tamanhos um pouquinho diferentes. Como o tamanho muda, cada uma soma de um jeito: umas chegam fortes, outras fracas. A placa B mede as 64 de uma vez. Esse conjunto se chama CSI.

- APONTE: a barra que veio da cena anterior; depois, as outras 63 nascendo da placa B.

→ *Agora, vamos transformar essas barras numa linha.*

> **O que é CSI?** Channel State Information: para cada uma das 64 partes do canal, quanto a viagem mudou a força e a fase da onda. Usamos só a força (amplitude).
>
> **Por que 64?** O canal de 20 MHz do Wi-Fi é dividido em 64 subportadoras, a cada 312,5 kHz. Algumas ficam vazias (bordas e centro): são os pontinhos sem barra.

### 9. As 64 barras viram uma linha.
*15 s*

**Fala.** Ligando o topo das barras, temos uma linha. Chega uma nova a cada décimo de segundo e empurra as outras para cima. São as linhas que vocês viram no começo.

- APONTE: a linha de baixo, mais grossa (agora), e as de cima (o passado).

→ *Com a sala parada, essas linhas se repetem. E com alguém andando?*

> **Cada linha é uma mensagem?** É a média das mensagens de 0,1 s (cerca de 10). O desenho realça o tremor 3 vezes para ficar visível; a detecção usa os valores sem realce.

### 10. Quando alguém anda, as linhas tremem. ●
*15 s (curta: 15 s)*

**Fala.** Com a sala parada, as linhas repetem o mesmo desenho. Quando alguém anda, as 64 somas mudam a cada passo, e as linhas tremem. É isso que o Wave Sense procura.

- APONTE: a pessoa entrando e as linhas de baixo, as mais novas, mudando primeiro.

→ *Para o computador decidir sozinho, o tremor vira um número.*

### 11. Um número diz o quanto tremeu.
*25 s*

**Fala.** O número compara o tremor de agora com o da sala vazia, que vale 1,0. Quando passa da linha tracejada, o sistema marca movimento.

- APONTE: o número e a linha tracejada.
- ESPERE: o tremidinho curto no fim do ciclo, que fica abaixo da linha: "um pico solto não dispara".

→ *Agora com o sinal de verdade.*

> **Como o número é calculado?** Primeiro, cada pacote é ajustado para o mesmo volume, porque a placa muda o volume sozinha (ganho automático). Depois, para cada subportadora, o desvio padrão da amplitude em 1 segundo, e a média entre elas, a cada 0,2 s. Divide pelo valor da sala vazia, medido na calibração.
>
> **Por que ajustar o volume?** Nos testes em casa, com a sala vazia, o número pulava sozinho de 0,8 a 4,8: era a placa subindo e descendo o volume. Ajustando cada pacote, a sala vazia ficou estável e a pessoa andando passou a se destacar.
>
> **E a linha tracejada?** Média da sala vazia + 3 desvios, no mínimo 1,3×. Três medidas seguidas acima viram "movimento"; cinco abaixo voltam a "parado".

### 12. Agora com o sinal das placas. ●
*35 s (curta: 30 s)*

Na simulação, a TV mostra: "Agora na simulação."

**Fala.** Agora é com você: mexe o braço entre as placas e olha o número. Agora fica parado.

- FAÇA: o visitante mexe o braço e depois fica parado.
- LEIA: o número que aparecer na tela, nunca um número inventado.
- SIMULAÇÃO: na simulação ou numa gravação, diga isso; o título da cena mostra a fonte.

→ *Funcionar uma vez não basta. Como a gente testou?*

## III · O experimento

### 13. Como se mede de verdade.
*25 s*

**Fala.** Para medir quanto o sistema acerta, umas gravações servem para escolher o limite e outras, novas, só para conferir. Como uma prova com questões que você não viu. Até agora fizemos os testes de montagem, em casa: eles mostram que funciona, mas ainda não dão uma porcentagem.

- APONTE: a coluna "ajustam o limite" e a coluna "só testam".
- NÃO DIGA: que essa separação já foi feita. Os testes até agora são de montagem (S0).

→ *E o que os testes em casa mostraram?*

> **Por que separar as gravações?** Se o limite é escolhido e conferido nas mesmas gravações, o resultado sai bom demais, como fazer a prova com as questões da lista de exercícios. Gravações vizinhas da mesma sessão também são quase iguais; por isso a separação é por sessão.
>
> **Por que não têm a porcentagem de acerto?** Porque ainda não fizemos as sessões separadas (uma para ajustar, outra para testar). Preferimos não dar um número que não foi medido do jeito certo.

### 14. O que vimos em casa.
*25 s*

**Fala.** Nos testes de montagem em casa, com as placas a 1,5 metro, a pessoa cruzou a linha 7 vezes e o sistema percebeu as 7. Com a sala vazia, deu 2 alarmes curtos em 30 segundos. Num outro teste, a 3,75 metros e com uma parede no meio, ele também percebeu a pessoa andando. É um teste de cada: mostra que funciona, ainda não é a taxa de acerto.

- FALE: "é um teste de cada, em casa". Nunca transforme em porcentagem.
- SE PERGUNTAREM DE PROBLEMAS: o roteador e a TV perto da placa faziam metade dos pacotes se perder; afastando, passaram a chegar ~90%.

→ *E o que o sistema não consegue ver?*

> **Quanto ele acerta?** Ainda não medimos a taxa de acerto com um teste separado. O que temos são testes de montagem: num deles, a pessoa cruzou a linha 7 vezes e ele detectou as 7; com a sala vazia, 2 alarmes curtos em 30 segundos. O próximo passo é gravar sessões separadas, uma para ajustar e outra para testar.
>
> **Que problemas vocês tiveram?** Três. 1) O roteador ao lado da placa B fazia metade dos pacotes se perder (a placa escuta todo o tráfego do canal). 2) O cabo USB só leva umas 72 linhas por segundo, então baixamos a placa A de 100 para 50 pacotes por segundo. 3) O ganho automático da placa fazia a sala vazia "tremer"; ajustamos o volume de cada pacote. Depois disso, chegaram cerca de 90% dos pacotes e a sala vazia ficou estável.
>
> **Por que comparar com o chute?** Quando houver porcentagem: se 80% das gravações são "parado", responder sempre "parado" já acerta 80%. O resultado só vale alguma coisa acima disso.

## IV · Limites e usos

### 15. Pessoa parada não aparece. ●
*20 s (curta: 18 s)*

**Fala.** Lembra da pergunta da pessoa parada? A soma não muda, e as linhas ficam calmas. O sistema percebe movimento, não pessoas.

- FAÇA: o Jogo da Estátua; alguém fica parado entre as placas e "some" para o Wi-Fi.

→ *Mesmo com esses limites, dá para montar com pouco.*

> **Vocês mediram isso?** Mostramos ao vivo, no Jogo da Estátua. Nos testes em casa, entre uma travessia e outra, quando a pessoa sai da linha, o número volta ao nível da sala vazia. Gravações com a pessoa parada ainda não fizemos.
>
> **Quais são os outros limites?** Distância entre as placas, paredes, várias pessoas ao mesmo tempo, interferência de outras redes e objetos que se mexem (ventilador, cortina, bicho). Cada lugar precisa calibrar de novo.

### 16. Dá para montar com pouco.
*20 s*

**Fala.** São duas placas baratas, o programa oficial e aberto da Espressif e um notebook. A tela e a análise são nossas, em JavaScript e Python.

- FALE: o preço que pagaram (e preencham CUSTO no roteiro.js para ele aparecer na tela).

→ *E para que isso serve?*

> **Isso já existe no mercado?** Em 2025 o IEEE publicou um padrão só para sensoriamento por Wi-Fi, o 802.11bf. A ideia está indo para produtos; nosso projeto testa os limites com placas simples.

### 17. Onde isso pode ajudar.
*15 s*

**Fala.** Uma queda é um movimento forte e depois silêncio: dá para avisar alguém. Também dá para apagar a luz de uma sala vazia, ou fazer um alarme sem câmera.

→ *Mas tem o outro lado.*

### 18. E a privacidade? ●
*20 s (curta: 18 s)*

**Fala.** Se o sinal atravessa paredes, alguém de fora poderia saber se tem gente em casa. Por isso medimos até onde funciona e discutimos regras de uso.

- PERGUNTE: "Você gostaria que o vizinho soubesse quando você está em casa?"

→ *Agora volte para as linhas do começo.*

> **Dá mesmo para ver através da parede?** Pesquisadores do MIT mostraram movimento atrás de parede em 2013 (Wi-Vi), com equipamento especial. Com a nossa placa, num teste em casa, a 3,75 m e com uma parede no meio, percebemos a pessoa andando. Foi um teste só: funciona, mas ainda não sabemos o quanto acerta.

### 19. Agora você sabe ler estas linhas. ●
*15 s (curta: 12 s)*

**Fala.** Lembra das linhas do começo? São ondas se somando na placa B. Quer testar? Tente atravessar a faixa sem que elas tremam.

- FAÇA: abra a Travessia (tecla N).
- AVALIADOR: "Usamos um assistente de IA como apoio no código e nos textos. Revisamos tudo, e os dados são medidos por nós."

## Perguntas que podem aparecer em qualquer momento

- **Dá para saber quem é a pessoa?** Não. O sistema mede o quanto o sinal tremeu, não forma, rosto ou nome. Ele percebe movimento.
- **E se tiver duas pessoas?** O tremor fica maior, mas o sistema não conta pessoas. Contar é um próximo passo, e ainda não testamos.
- **Ventilador ou cortina disparam?** Podem disparar, porque também mudam os caminhos do sinal. Por isso calibramos com a sala como ela fica normalmente e testamos com as gravações.
- **Por que não usar inteligência artificial (aprendizado de máquina)?** Primeiro, uma regra simples que dá para explicar e conferir. Um classificador (Random Forest) só entra se a regra funcionar com dados reais e sobrar tempo, e sempre testado por sessão.
- **Usaram IA no projeto?** Sim, um assistente de IA como apoio para consultar documentação, escrever partes do código e revisar textos. Tudo foi revisado e testado pela equipe, e os dados são medidos por nós.
- **Por que 50 pacotes por segundo, e não 100?** Cada medida vira uma linha de ~1.280 letras no cabo USB, e o cabo leva umas 72 por segundo. Com 100, sempre se perdiam pelo menos 20%. Com 50 sobra folga, e o detector precisa de só 10 por segundo.
- **O que ainda é simulação?** As ilustrações da história usam um modelo do canal com 4 caminhos. Na feira, as linhas e o número vêm das placas. Resultados, só os medidos.

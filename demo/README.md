# Tela de demonstração

`index.html` é a tela para a feira. É um arquivo só, sem instalação.

**Como abrir:** botão direito em `index.html` → "Abrir com" → **Google Chrome** ou **Microsoft Edge**. A conexão com a placa pela USB (Web Serial) só funciona nesses dois navegadores.

**Site:** a pasta `demo/` pode ir para o Vercel e virar um link para mandar aos amigos (passo a passo em `docs/publicar-vercel.md`). Lá a USB também funciona, no Chrome ou no Edge do computador.

Versão no claude.ai (só simulação e gravação, sem USB): https://claude.ai/artifact/1q55pHmnJivTx6Z7pzt68o

**Arquivos** (todos na mesma pasta):
- `index.html`: a tela.
- `nucleo.js`: leitura das linhas `CSI_DATA` e a regra do detector, a mesma do `ferramentas/detector.py`.
- `roteiro.js`: os textos da apresentação "Como funciona" e a colinha de cada cena (fala, ações, ponte e perguntas). **Só texto: o grupo pode editar.** A colinha impressa (`docs/colinha.md`) sai dele com `python ferramentas/colinha.py`.
- `historia.js`: o desenho e o movimento da apresentação.
- `passagem.js`: as passagens entre as telas (escuta, Travessia, mural, "Como funciona"). Sem ele, as telas trocam na hora.
- `escuta.js`: o som do modo escuta ("Batimento"). Sem ele, a escuta fica muda.
- `marca.js`: a marca em estrela de cada travessia, os textos do resultado e o registro.
- `apresentador.html`: a janela do apresentador (fica no notebook).
- `fontes.css`: as fontes embutidas, para a tela ficar igual sem internet.

## Ideia do visual

Minimalista, como os sites premiados (Awwwards): muito espaço vazio, a tipografia carregando a página, poucos elementos, preto e branco.

- **O sinal como linhas empilhadas.** A referência é o gráfico do pulsar CP1919, feito por Harold Craft a partir de sinais de rádio de Arecibo. Peter Saville usou esse gráfico na capa de *Unknown Pleasures*, do Joy Division (1979). Aqui cada linha é uma leitura do Wi-Fi: a média dos pacotes de 0,1 s, com a amplitude de cada subportadora. A mais nova aparece embaixo. Com a sala parada, as linhas repetem o mesmo desenho; quando alguém se mexe, elas tremem e se cruzam.
- **Uma palavra só para o estado:** *Parado.* ou *Movimento.*, em letra enorme.
- **A tela inteira inverte** (preto vira branco) quando há movimento. Dá para ver de longe.
- **Travessia (o desafio) em tela cheia:** *Pronto?* → 5, 4, 3, 2, 1 → *Vai.* → o resultado como um registro de leitura: *Não detectado.* (com o pico de tremor e o limite) ou *Detectado aos 0,6 s.* (com o tremor que chegou).
- **Sem aviso de fonte na tela** (pedido do grupo, 14/10): a TV não diz se os dados são da simulação, de uma gravação ou das placas. A fonte aparece no painel do Operador (botão apertado) e no título da cena ao vivo do "Como funciona". **Na feira, use as placas;** se precisar da simulação ou de uma gravação, diga isso ao visitante.
- **Fontes:** Instrument Serif (títulos), Geist e Geist Mono (texto pequeno). Todas gratuitas (licença OFL), embutidas no `fontes.css`, então funcionam sem internet.

O desenho das linhas realça o relevo para ficar bonito. A decisão de "parado" ou "movimento" não usa esse desenho: usa a oscilação, calculada pelo `nucleo.js` com a mesma regra do `ferramentas/detector.py` (um teste confere que as duas dão o mesmo resultado).

## Tela principal (versão 7)

Pouca letra pequena: só o nome do projeto, o botão Operador, uma linha embaixo do gráfico do medidor e os quatro botões do rodapé. O resto foi tirado ou virou frase normal.

- **Medidor de tremor** (coluna da esquerda, em cima):
  - O número grande, como "1,0×", diz quanto o Wi-Fi está tremendo agora comparado com a sala vazia da calibração. É a mesma oscilação do detector dividida pela média da sala vazia, não um desenho à parte.
  - A frase embaixo explica tudo: "Tremor do Wi-Fi, comparado com a sala vazia. Passou da linha tracejada (1,3×), é movimento."
  - O gráfico mostra o último minuto. A linha tracejada é o limite e as faixas sombreadas são os momentos de *Movimento.*
  - Embaixo, uma linha só: "Último minuto", e o recorde do dia depois do primeiro movimento.
- **Gráfico de linhas sem legenda:** a linha mais nova (embaixo) é um pouco mais grossa, e as frases que se revezam explicam ("A de baixo é agora.").
- **Movimentos do dia e dados técnicos** (pacotes por segundo, oscilação, limiar) ficam no painel do Operador.
- **O limite não desce abaixo de 1,1× a sala vazia** no controle deslizante. Abaixo disso, a tela diria *Movimento.* para sempre.
- **Proporções fixas:** em tela larga (TV, notebook, monitor), tudo na tela principal cresce e diminui junto com a tela, então a hierarquia é a mesma em qualquer tamanho: as linhas mandam, *Parado.* vem em segundo, o número em terceiro. Os textos pequenos têm um tamanho mínimo. No celular continua o layout em coluna.

## Telas extras (versão 4)

- **Abertura com contador:** a calibração virou a abertura da tela. Um número grande vai de 0% a 100% enquanto o sistema "aprende" a sala vazia. A ideia vem dos sites premiados que abrem com contador (Lusion, Immersive Garden), mas aqui o número mede algo de verdade.
- **Tremor realçado:** a forma das linhas mostra o "relevo" da sala, e a diferença em relação à forma média aparece 3x maior. Assim, quando o detector diz *Movimento.*, dá para ver as linhas tremerem. É só no desenho; a detecção não muda.
- **Frases que se revezam:** com a sala parada, a frase embaixo da palavra troca a cada 7 s, convidando o visitante.
- **Contador do dia** (no topo): quantos movimentos foram detectados. A simulação conta separado e aparece como "na simulação".
- **Marca de cada visitante** (`marca.js`): na Travessia, as leituras viram uma estrela de contornos lisos, encaixados, que gira em espiral.
  - Cada leitura vira um contorno (28 no total), de dentro para fora: a contagem no centro (traço fino), a travessia até a borda.
  - Todas as leituras juntas, como uma impressão digital, escolhem a família: 4 a 9 pontas, pontas redondas ou finas, onde a estrela é mais pontuda, quanto e para que lado a espiral gira. Por isso cada marca sai diferente.
  - Onde o sinal mais variou (na própria travessia), o contorno fica mais pontudo e gira mais.
  - Se o Wi-Fi detectou, o último contorno é grosso: o instante da detecção.
  - No resultado, a marca **se forma na frente da pessoa** (~3 s, do centro para fora). Depois respira, a espiral enrola e desenrola devagar, e um brilho corre do centro até a borda de 6 em 6 s.
  - Cada marca tem um registro: "Registro Nº 003 · 21/10/2026 · 14:32:08".
- **Melodia da marca** (tecla `M`): as leituras da travessia viram 16 notas.
- **Cartão para guardar** (tecla `B`): PNG de 1080×1350 com a marca, o nome, o resultado, o registro, o pico de tremor e o limite. Na versão do claude.ai o botão fica escondido, porque lá não dá para salvar arquivos.
- **Quem passou** (tecla `G`): as últimas 12 marcas. À esquerda, uma delas em destaque se forma de novo, com nome e dados, e os 3 passos de como a marca é feita acendem junto; depois de 4,5 s, passa para a próxima. Marcas do formato antigo (antes de 14/10) não aparecem mais.
- **Modo escuta** (tecla `E`): tela "Feche os olhos." com o som "Batimento" (`escuta.js`): um acorde calmo que, quando alguém se mexe, cresce, abre e pulsa (uá-uá-uá), com uma nota grave pulsando junto e o pulso passando de um ouvido para o outro. O ponto da tela pulsa com o volume do próprio som. Para usar com fone de ouvido. Detalhes em "Som do modo escuta", abaixo.
- **Painel do operador não cobre mais as linhas:** quando abre, a tela encolhe para o lado (no celular, o painel abre embaixo).
- **Grão de foto** bem leve por cima de tudo, para a tela não parecer "plástica".

Recordes, retratos e contador ficam guardados só neste navegador. O painel do operador tem um botão para apagar tudo antes da feira.

## Passagens entre telas (`passagem.js`)

Toda troca de tela passa pelo sinal. A tela que sai se desfaz nas linhas do Wi-Fi, que tomam a tela inteira por um instante; depois as linhas viram a tela que chega, com um gesto que diz o que ela é. As linhas são as leituras de verdade (ou da simulação).

| Tela | Chegando | Saindo |
|---|---|---|
| Principal | As linhas encolhem até caber no gráfico e viram o próprio gráfico. | O gráfico cresce até ocupar a tela. |
| Escuta | **Fechar os olhos:** as linhas se juntam numa só, que vira o ponto que pulsa com o som. | **Abrir os olhos:** o ponto vira linha e a linha se abre nas 48. |
| Travessia | Alguém invisível atravessa da partida (esquerda) para a chegada (direita). Ninguém aparece; só o sinal treme onde a pessoa passa. Atrás dela, o desafio. | A mesma travessia, de volta. |
| Mural | As linhas se curvam numa estrela em espiral, como as marcas, e o mural aparece de dentro dela. | A estrela se fecha e desenrola em linhas. |
| Como funciona | As linhas vão para a metade direita e somem por cima da primeira cena (que é ilustração). | O sinal é desenhado por cima da história, uma linha por vez. Na cena "ao vivo" e na última, as próprias linhas de verdade da história crescem até a tela inteira. |

**Regras:**
- A passagem não muda nada na detecção.
- Ela nunca inverte a tela; isso continua sendo só do detector.
- Sem fonte de dados, as linhas ficam retas (nada de relevo inventado).

**Tempo:** cerca de 2 s por troca: saída, um instante só de sinal e entrada. Os tempos ficam em `TEMPOS` no começo do `passagem.js`. Quando um movimento de verdade fecha a vitrine, a passagem é a rápida (cerca de 1 s).

**Teclas no meio da passagem:**
- Outra troca (N, E, G, H, Esc) muda o destino: antes do meio, só troca para onde vai; depois do meio, volta de ré até o sinal e segue.
- Enter, Espaço e as setas da história esperam a tela nova aparecer.
- A lógica da tela que sai para na hora. Esc no meio da travessia encerra o desafio, sem salvar marca.

**Som:** com o som ligado (Alerta ou Escuta), um sopro baixo acompanha cada passagem; na travessia, ele passa de uma caixa de som para a outra, junto com a pessoa invisível. Com o som mudo, nada toca.

**Desligar:**
- Botão "Passagens entre telas" no painel do Operador (fica guardado no navegador);
- ou abrir com `?passagem=0` no endereço.
- Com "reduzir movimento" ligado no sistema, a troca é só um esmaecimento curto.

## Apresentação "Como funciona" (tecla `H`)

Uma história em motion design que explica o projeto, para passar na TV do estande. Não são slides: cada desenho se transforma no próximo (o roteador vira a placa A, as barras viram a primeira linha, a pessoa caída se levanta dentro da casa...).

O arco: abre com **as linhas da sala, de verdade**, sem explicar nada ("mexa o braço"), e fecha com "Agora você sabe ler estas linhas". O miolo explica o que acontece entre a placa A e as linhas:
1. o Wi-Fi é uma onda de ~12 cm;
2. ela chega à placa B por vários caminhos (os longos chegam depois);
3. **na B, os caminhos se somam**: crista com crista reforça, crista com vale cancela;
4. **quando alguém se mexe, a soma muda**, porque meia onda (~6 cm) já troca crista por vale;
5. são 64 ondas, e cada uma soma de um jeito (CSI);
6. as 64 barras viram uma linha, e as linhas tremem.

- **Navegar:** setas, `Espaço`, `PageUp`/`PageDown` (o passador de slides manda essas teclas), rolagem do mouse ou do trackpad, ou arrastar no celular. A rolagem acompanha o dedo, como arrastar a agulha de um vídeo, e encaixa na cena mais próxima na direção do movimento.
- **Duas versões** (tecla `V`): **completa**, com 20 cenas, para o avaliador (cerca de 7 min), e **curta**, com 12 cenas, para visitantes (cerca de 3 min 45 s).
- **Janela do apresentador** (tecla `P` ou o botão no painel do Operador): abre o `apresentador.html` com a colinha de cada cena, a próxima cena, o tempo e uma miniatura. A TV fica só com a história.
  - A colinha: a fala em letra grande, as ações (APONTE, PERGUNTE, PAUSA, FAÇA) e a ponte para a próxima cena. A tecla `Q` (ou o botão) mostra as perguntas que um avaliador pode fazer, com a resposta.
  - Ordem de montagem: **P** (abre a janela), arrastar a página principal para a TV, **F** (tela cheia). O Chrome sai da tela cheia quando abre uma janela nova, por isso o F vem por último.
  - Se o navegador bloquear a janela, a fala aparece numa faixa na própria tela.
- `B` ou `.` deixa a tela preta (o botão de "tela preta" do passador). `Esc` fecha. `Home`/`End` vão para a primeira e a última cena.
- **Modo vitrine:** depois de 45 s sem movimento, a versão curta passa sozinha (6 s por cena) e some no primeiro movimento. Ela pula as cenas "ao vivo" e "resultados" e fica desligada enquanto a janela do apresentador estiver aberta.

**Honestidade dos dados:**
- As cenas que explicam (linhas, barras, número de exemplo, gravações) usam **dados sintéticos** do mesmo modelo da simulação, com semente fixa. Sempre que eles aparecem, o canto de cima mostra "Ilustração".
- A abertura, a cena "ao vivo" e a última usam o sinal de verdade. O título e a etiqueta dizem de onde ele vem; por exemplo, na abertura: "Estas linhas são o Wi-Fi desta sala." (Placa USB), "Estas linhas imitam o Wi-Fi de uma sala." (simulação) ou "... de uma gravação.".
- As cenas da onda, da soma e das 64 ondas são física desenhada (com a etiqueta "Ilustração"): 12 cm é o comprimento de onda de 2,4 GHz; na soma, o caminho rebatido tem 90% da força do direto.
- **Cena "Uma ideia de Hedy Lamarr"** (tema da JACITEC, "Ciência Delas"): depois das 64 ondas, as barras apagam e um rolo de pianola desce sobre elas; cada furo que passa pela barra de leitura acende uma frequência, uma de cada vez, com um rastro que apaga. É o salto de frequência patenteado em 1942 por Hedy Lamarr e George Antheil. Na cena seguinte, as 64 acendem juntas e viram a linha. A sequência de saltos é fixa (semente 1942). À esquerda (na TV) ou embaixo do palco (no celular), o **retrato dela feito com as linhas do sinal**: 72 linhas, cada uma sobe e fica mais forte onde a foto é clara. Vem de uma foto de domínio público (Clarence Bull, MGM, 1940); no código vai só a grade de luz (`RETRATO` no `historia.js`), não a foto. As linhas chegam retas e apagadas, o rosto sobe de baixo para cima e, parado, uma faixa de luz desce devagar.
- A cena de resultados só mostra números quando alguém preencher `RESULTADOS` no `roteiro.js` com o resultado do `ferramentas/avaliar.py` (por coleta, com o chute ao lado). Até lá ela diz que as gravações ainda estão sendo feitas.

**Para mudar um texto:** edite `roteiro.js` (título, frase e fala de cada cena). Não mude o `id`: o desenho de cada cena é ligado a ele.

**Palavra-chave:** no título, o trecho entre `*asteriscos*` é sublinhado na tela depois que o título aparece (por exemplo `'O sinal chega por *vários caminhos*.'`). No máximo um trecho por título; a janela do apresentador mostra o texto sem os asteriscos.

**Como o movimento foi feito** (para quem for mexer no `historia.js`):
- Curvas de aceleração como as do After Effects (Bézier): o que entra chega rápido e assenta devagar, o que sai acelera.
- O que entra desenhando sai desdesenhando (casa, notebook, sala, câmera); o número e as linhas saem subindo um pouco, como o texto.
- Passagens que mostram a causa:
  - o roteador vira a placa A;
  - os caminhos do sinal são puxados para dentro da placa B e saem dela separados (direto, rebatido e a soma);
  - a força da soma vira uma das 64 barras, e as outras nascem em volta;
  - as gravações de teste se empilham dentro da barra do resultado;
  - uma linha varre a tela e troca o exemplo pelo sinal de verdade.
- A placa ESP32 é desenhada como a DevKit do estande (módulo com antena, pinos, USB) e o LED pisca quando a mensagem sai de A e chega em B.

**Velocidade:** cada passagem de cena dura `transicao` segundos (no `roteiro.js`, hoje 2,6). A animação começa assim que a tecla é apertada; apertar de novo no meio continua sem tranco, e um salto de mais de uma cena e meia vira um corte rápido.

**Preço das placas:** preencha `CUSTO` no `roteiro.js` (por exemplo `'R$ 90'`) para a cena "Dá para montar com pouco." falar o valor. Sem isso, ela não fala de preço.

## Controles

Tudo que é técnico fica no **painel do operador** (tecla `O`):
- fonte dos dados: Simulação, Gravação ou Placa USB;
- calibração e limiar;
- som;
- cenas da simulação;
- tela cheia;
- passagens entre telas (ligadas ou desligadas).

| Fonte | O que faz |
|---|---|
| Simulação | Dados gerados no computador para ensaiar. Abre sozinha. **Não é medição.** |
| Gravação… | Reproduz em loop um `.csv` do `ferramentas/capturar.py`. Plano B se o ao vivo falhar. |
| Placa USB | Lê a Placa B a 921600 baud. Feche o `idf.py monitor` antes. |

**Som** (começa mudo; tudo suave, sem onda quadrada e com limitador de volume):
- **Alerta:** dois toques suaves quando começa um movimento.
- **Escuta:** o "Batimento" (veja abaixo). Os dois toques de alerta não tocam nesse modo: o próprio acorde avisa.
- **Travessia:** notas na contagem, um arpejo no *Não detectado.* e duas notas graves no *Detectado.*

Teste o volume no lugar da feira.

### Som do modo escuta (`escuta.js`)

Três notas (ré, lá, mi). Cada uma é tocada por dois osciladores: um fixo e um que desafina um pouco. As duas ondas se somam e se cancelam e o som pulsa, como o sinal do Wi-Fi entre os caminhos da sala. O ritmo vem do tremor medido pelo detector (a cada 0,2 s), comparado com o limiar da calibração:

| Tremor | O que se ouve |
|---|---|
| Abaixo do limiar (sala parada) | O acorde baixo e calmo, com um respiro a cada ~17 s. |
| No limiar (quando a tela diz *Movimento.*) | Já pulsa, cerca de 1 vez por segundo, e fica um pouco mais alto. |
| 2,5× o limiar ou mais | Pulso de 4,5 por segundo, bem mais alto (uns 11 dB, na simulação), mais brilhante, com a nota grave (ré, 73 Hz) pulsando junto. |

- O pulso chega em 0,25 s e vai embora em cerca de 1,6 s.
- O ouvido direito pulsa 12% mais rápido que o esquerdo, então o pulso passeia de um lado para o outro.
- Sem sinal ou durante a calibração, fica calado.
- Tem um limitador próprio, mais leve que o dos alertas, para não achatar a diferença entre parado e movimento.
- Os números ficam no começo do `escuta.js`. Teste: `ferramentas/testes/test_escuta_js.py`.
- Medido na simulação (`ferramentas/laboratorio-escuta/medir.py`): sala vazia -27 dBFS, alguém andando -16 dBFS, movimento bem devagar -21 dBFS. Com as placas, o tremor real é menor que o simulado; por isso o pulso já começa no limiar.

## Atalhos

`N` travessia · `Enter` começar · `Espaço` chegou · `M` melodia da marca · `B` salvar cartão · `G` mural · `E` escutar · `H` como funciona · `P` janela do apresentador · `Esc` voltar · `O` operador · `S` som · `C` calibrar · `F` tela cheia · `1`–`5` cenas da simulação

Com a apresentação aberta: setas, `Espaço` e `PageUp`/`PageDown` navegam · `V` versão curta ou completa · `B` ou `.` tela preta · `Home`/`End` primeira e última cena.

## Situação

- Testado no Chromium: simulação, calibração, detecção, inversão de cor, Travessia (passando e sendo pego), gravação e celular.
- Testado também servido por HTTP, como no Vercel: carrega o `nucleo.js`, calibra, detecta e libera o Web Serial (página segura), sem erros no console.
- A leitura pela USB segue o jeito do visualizador oficial da Espressif (`csi_viewer.html`), mas **ainda não foi testada com a placa**.
- O limiar e as constantes (janela de 1 s, 3 e 5 confirmações) são pontos de partida. Vão ser ajustados com dados reais, no `nucleo.js` **e** no `ferramentas/detector.py`.

## Referências

- Awwwards, vencedores anuais: https://www.awwwards.com/annual-awards/winners
- Inspiração "big typography" do Awwwards: https://www.awwwards.com/inspiration/big-typography-website
- Tipografia grande e espaço vazio (Designmodo): https://designmodo.com/big-typography
- História do gráfico do pulsar (Scientific American): https://www.scientificamerican.com/article/the-pulsar-chart-that-became-a-pop-icon-turns-50-joy-division-rsquo-s-unknown-pleasures
- Pulsares e a capa do disco (Chalkdust): https://chalkdustmagazine.com/blog/unknown-pleasures/

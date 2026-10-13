# Tela de demonstração

`index.html` é a tela para a feira. É um arquivo só, sem instalação.

**Como abrir:** botão direito em `index.html` → "Abrir com" → **Google Chrome** ou **Microsoft Edge**. A conexão com a placa pela USB (Web Serial) só funciona nesses dois navegadores.

**Site:** a pasta `demo/` pode ir para o Vercel e virar um link para mandar aos amigos (passo a passo em `docs/publicar-vercel.md`). Lá a USB também funciona, no Chrome ou no Edge do computador.

Versão no claude.ai (só simulação e gravação, sem USB): https://claude.ai/artifact/1q55pHmnJivTx6Z7pzt68o

**Arquivos** (todos na mesma pasta):
- `index.html`: a tela.
- `nucleo.js`: leitura das linhas `CSI_DATA` e a regra do detector, a mesma do `ferramentas/detector.py`.
- `roteiro.js`: os textos da apresentação "Como funciona" e a fala de cada cena. **Só texto: o grupo pode editar.**
- `historia.js`: o desenho e o movimento da apresentação.
- `apresentador.html`: a janela do apresentador (fica no notebook).
- `fontes.css`: as fontes embutidas, para a tela ficar igual sem internet.

## Ideia do visual

Minimalista, como os sites premiados (Awwwards): muito espaço vazio, a tipografia carregando a página, poucos elementos, preto e branco.

- **O sinal como linhas empilhadas.** A referência é o gráfico do pulsar CP1919, feito por Harold Craft a partir de sinais de rádio de Arecibo. Peter Saville usou esse gráfico na capa de *Unknown Pleasures*, do Joy Division (1979). Aqui cada linha é uma leitura do Wi-Fi: a média dos pacotes de 0,1 s, com a amplitude de cada subportadora. A mais nova aparece embaixo. Com a sala parada, as linhas repetem o mesmo desenho; quando alguém se mexe, elas tremem e se cruzam.
- **Uma palavra só para o estado:** *Parado.* ou *Movimento.*, em letra enorme.
- **A tela inteira inverte** (preto vira branco) quando há movimento. Dá para ver de longe.
- **Desafio Ninja em tela cheia:** *Pronto?* → 3, 2, 1 → *Vai.* → *Passou.* ou *Te vi.*
- **A única cor é o aviso amarelo** "Simulação · dados inventados para ensaio". Ele some quando os dados são reais.
- **Fontes:** Instrument Serif (títulos), Geist e Geist Mono (texto pequeno). Todas gratuitas (licença OFL), embutidas no `fontes.css`, então funcionam sem internet.

O desenho das linhas realça o relevo para ficar bonito. A decisão de "parado" ou "movimento" não usa esse desenho: usa a oscilação, calculada pelo `nucleo.js` com a mesma regra do `ferramentas/detector.py` (um teste confere que as duas dão o mesmo resultado).

## Tela principal (versão 7)

Pouca letra pequena: só o nome do projeto, o aviso de simulação, o botão Operador, uma linha embaixo do gráfico do medidor e os quatro botões do rodapé. O resto foi tirado ou virou frase normal.

- **Medidor de tremor** (coluna da esquerda, em cima):
  - O número grande, como "1,0×", diz quanto o Wi-Fi está tremendo agora comparado com a sala vazia da calibração. É a mesma oscilação do detector dividida pela média da sala vazia, não um desenho à parte.
  - A frase embaixo explica tudo: "Tremor do Wi-Fi, comparado com a sala vazia. Passou da linha tracejada (1,3×), é movimento."
  - O gráfico mostra o último minuto. A linha tracejada é o limite e as faixas sombreadas são os momentos de *Movimento.*
  - Embaixo, uma linha só: "Último minuto", e o recorde do dia depois do primeiro movimento.
- **Gráfico de linhas sem legenda:** a linha mais nova (embaixo) é um pouco mais grossa, e as frases que se revezam explicam ("A de baixo é agora.").
- **Movimentos do dia e dados técnicos** (pacotes por segundo, oscilação, limiar) ficam no painel do Operador.
- **O limite não desce abaixo de 1,1× a sala vazia** no controle deslizante. Abaixo disso, a tela diria *Movimento.* para sempre.

## Telas extras (versão 4)

- **Abertura com contador:** a calibração virou a abertura da tela. Um número grande vai de 0% a 100% enquanto o sistema "aprende" a sala vazia. A ideia vem dos sites premiados que abrem com contador (Lusion, Immersive Garden), mas aqui o número mede algo de verdade.
- **Tremor realçado:** a forma das linhas mostra o "relevo" da sala, e a diferença em relação à forma média aparece 3x maior. Assim, quando o detector diz *Movimento.*, dá para ver as linhas tremerem. É só no desenho; a detecção não muda.
- **Frases que se revezam:** com a sala parada, a frase embaixo da palavra troca a cada 7 s, convidando o visitante.
- **Contador do dia** (no topo): quantos movimentos foram detectados. A simulação conta separado e aparece como "na simulação".
- **Marca de cada visitante:** no Desafio Ninja, as leituras dos 3 s de contagem e da travessia viram uma marca em anéis, como anéis de árvore. Cada anel é um momento da travessia; momentos de mais movimento deixam anéis mais largos, tortos e girados. Cada marca é numerada (Nº 001, Nº 002...) e tem uma frase com data e hora.
- **Melodia da marca** (tecla `M`): as mesmas leituras viram 16 notas.
- **Cartão para guardar** (tecla `B`): PNG de 1080×1350 com a marca, o nome e a frase. Diz "Carteira de ninja" se a pessoa passou, ou "Registro de passagem" se foi percebida. Na versão do claude.ai o botão fica escondido, porque lá não dá para salvar arquivos.
- **Mural de marcas** (tecla `G`): os últimos 12.
- **Modo escuta** (tecla `E`): tela "Feche os olhos." com som de vento baixo que abre e ganha "gotas" quando alguém se mexe. Para usar com fone de ouvido.
- **Painel do operador não cobre mais as linhas:** quando abre, a tela encolhe para o lado (no celular, o painel abre embaixo).
- **Grão de foto** bem leve por cima de tudo, para a tela não parecer "plástica".

Recordes, retratos e contador ficam guardados só neste navegador. O painel do operador tem um botão para apagar tudo antes da feira.

## Apresentação "Como funciona" (tecla `H`)

Uma história em motion design que explica o projeto, para passar na TV do estande. Não são slides: cada desenho se transforma no próximo (o roteador vira a placa A, as barras viram a primeira linha, a pessoa caída se levanta dentro da casa...).

- **Navegar:** setas, `Espaço`, `PageUp`/`PageDown` (o passador de slides manda essas teclas), rolagem do mouse ou do trackpad, ou arrastar no celular. A rolagem acompanha o dedo, como arrastar a agulha de um vídeo, e encaixa na cena mais próxima na direção do movimento.
- **Duas versões** (tecla `V`): **completa**, com 17 cenas, para o avaliador (5 a 7 min), e **curta**, com 11 cenas, para visitantes (cerca de 3 min).
- **Janela do apresentador** (tecla `P` ou o botão no painel do Operador): abre o `apresentador.html` com a fala de cada cena, a próxima cena, o tempo e uma miniatura. A TV fica só com a história.
  - Ordem de montagem: **P** (abre a janela), arrastar a página principal para a TV, **F** (tela cheia). O Chrome sai da tela cheia quando abre uma janela nova, por isso o F vem por último.
  - Se o navegador bloquear a janela, a fala aparece numa faixa na própria tela.
- `B` ou `.` deixa a tela preta (o botão de "tela preta" do passador). `Esc` fecha. `Home`/`End` vão para a primeira e a última cena.
- **Modo vitrine:** depois de 45 s sem movimento, a versão curta passa sozinha (6 s por cena) e some no primeiro movimento. Ela pula as cenas "ao vivo" e "resultados" e fica desligada enquanto a janela do apresentador estiver aberta.

**Honestidade dos dados:**
- As cenas que explicam (linhas, barras, número de exemplo, gravações) usam **dados sintéticos** do mesmo modelo da simulação, com semente fixa. Sempre que eles aparecem, o canto de cima mostra "Ilustração".
- A cena "ao vivo" e a última usam o sinal de verdade. O título e a etiqueta dizem de onde ele vem: "Agora com o sinal das placas." (Placa USB), "Agora na simulação." ou "Agora com uma gravação.".
- A cena de resultados só mostra números quando alguém preencher `RESULTADOS` no `roteiro.js` com o resultado do `ferramentas/avaliar.py` (por coleta, com o chute ao lado). Até lá ela diz que as gravações ainda estão sendo feitas.

**Para mudar um texto:** edite `roteiro.js` (título, frase e fala de cada cena). Não mude o `id`: o desenho de cada cena é ligado a ele.

**Velocidade:** cada passagem de cena dura `transicao` segundos (no `roteiro.js`, hoje 2,6). A animação começa assim que a tecla é apertada; apertar de novo no meio continua sem tranco, e um salto de mais de uma cena e meia vira um corte rápido.

**Preço das placas:** preencha `CUSTO` no `roteiro.js` (por exemplo `'R$ 90'`) para a cena "Dá para montar com pouco." falar o valor. Sem isso, ela não fala de preço.

## Controles

Tudo que é técnico fica no **painel do operador** (tecla `O`):
- fonte dos dados: Simulação, Gravação ou Placa USB;
- calibração e limiar;
- som;
- cenas da simulação;
- tela cheia.

| Fonte | O que faz |
|---|---|
| Simulação | Dados gerados no computador para ensaiar. Abre sozinha. **Não é medição.** |
| Gravação… | Reproduz em loop um `.csv` do `ferramentas/capturar.py`. Plano B se o ao vivo falhar. |
| Placa USB | Lê a Placa B a 921600 baud. Feche o `idf.py monitor` antes. |

**Som** (começa mudo; tudo suave, sem onda quadrada e com limitador de volume):
- **Alerta:** dois toques suaves quando começa um movimento.
- **Escuta:** sopro baixo, como vento, que abre e ganha "gotas" quando alguém se mexe.
- **Desafio:** notas na contagem, um arpejo no *Passou.* e duas notas graves no *Te vi.*

Teste o volume no lugar da feira.

## Atalhos

`N` desafio · `Enter` começar · `Espaço` chegou · `M` melodia da marca · `B` salvar cartão · `G` mural · `E` escutar · `H` como funciona · `P` janela do apresentador · `Esc` voltar · `O` operador · `S` som · `C` calibrar · `F` tela cheia · `1`–`5` cenas da simulação

Com a apresentação aberta: setas, `Espaço` e `PageUp`/`PageDown` navegam · `V` versão curta ou completa · `B` ou `.` tela preta · `Home`/`End` primeira e última cena.

## Situação

- Testado no Chromium: simulação, calibração, detecção, inversão de cor, Desafio Ninja (passando e sendo pego), gravação e celular.
- Testado também servido por HTTP, como no Vercel: carrega o `nucleo.js`, calibra, detecta e libera o Web Serial (página segura), sem erros no console.
- A leitura pela USB segue o jeito do visualizador oficial da Espressif (`csi_viewer.html`), mas **ainda não foi testada com a placa**.
- O limiar e as constantes (janela de 1 s, 3 e 5 confirmações) são pontos de partida. Vão ser ajustados com dados reais, no `nucleo.js` **e** no `ferramentas/detector.py`.

## Referências

- Awwwards, vencedores anuais: https://www.awwwards.com/annual-awards/winners
- Inspiração "big typography" do Awwwards: https://www.awwwards.com/inspiration/big-typography-website
- Tipografia grande e espaço vazio (Designmodo): https://designmodo.com/big-typography
- História do gráfico do pulsar (Scientific American): https://www.scientificamerican.com/article/the-pulsar-chart-that-became-a-pop-icon-turns-50-joy-division-rsquo-s-unknown-pleasures
- Pulsares e a capa do disco (Chalkdust): https://chalkdustmagazine.com/blog/unknown-pleasures/

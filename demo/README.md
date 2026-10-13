# Tela de demonstração

`index.html` é a tela para a feira. É um arquivo só, sem instalação.

**Como abrir:** botão direito em `index.html` → "Abrir com" → **Google Chrome** ou **Microsoft Edge**. A conexão com a placa pela USB (Web Serial) só funciona nesses dois navegadores.

**Site:** a pasta `demo/` pode ir para o Vercel e virar um link para mandar aos amigos (passo a passo em `docs/publicar-vercel.md`). Lá a USB também funciona, no Chrome ou no Edge do computador.

Versão no claude.ai (só simulação e gravação, sem USB): https://claude.ai/artifact/1q55pHmnJivTx6Z7pzt68o

**Arquivos:** `index.html` (a tela) e `nucleo.js` (leitura das linhas `CSI_DATA` e a regra do detector, a mesma do `ferramentas/detector.py`). Os dois precisam ficar na mesma pasta.

## Ideia do visual

Minimalista, como os sites premiados (Awwwards): muito espaço vazio, a tipografia carregando a página, poucos elementos, preto e branco.

- **O sinal como linhas empilhadas.** A referência é o gráfico do pulsar CP1919, feito por Harold Craft a partir de sinais de rádio de Arecibo. Peter Saville usou esse gráfico na capa de *Unknown Pleasures*, do Joy Division (1979). Aqui cada linha é uma leitura do Wi-Fi: a média dos pacotes de 0,1 s, com a amplitude de cada subportadora. A mais nova aparece embaixo. Com a sala parada, as linhas repetem o mesmo desenho; quando alguém se mexe, elas tremem e se cruzam.
- **Uma palavra só para o estado:** *Parado.* ou *Movimento.*, em letra enorme.
- **A tela inteira inverte** (preto vira branco) quando há movimento. Dá para ver de longe.
- **Desafio Ninja em tela cheia:** *Pronto?* → 3, 2, 1 → *Vai.* → *Passou.* ou *Te vi.*
- **A única cor é o aviso amarelo** "Simulação · dados inventados para ensaio". Ele some quando os dados são reais.
- **Fontes:** Instrument Serif (títulos), Geist e Geist Mono (texto pequeno). Todas gratuitas, do Google Fonts.

O desenho das linhas realça o relevo para ficar bonito. A decisão de "parado" ou "movimento" não usa esse desenho: usa a oscilação, calculada pelo `nucleo.js` com a mesma regra do `ferramentas/detector.py` (um teste confere que as duas dão o mesmo resultado).

## Tela principal (versão 7)

- **Medidor de tremor** (coluna da esquerda, em cima): um número grande, como "1,0×", diz quanto o Wi-Fi está tremendo agora comparado com a sala vazia da calibração.
  - A frase embaixo explica a regra: "Acima de 1,3×, é movimento." O 1,3× vem do limite calibrado.
  - O gráfico mostra o último minuto. A linha tracejada é o limite e as faixas sombreadas são os momentos em que o detector disse *Movimento.*
  - O **recorde do dia** aparece depois do primeiro movimento. A simulação conta separado.
  - O número é a mesma oscilação do detector dividida pela média da sala vazia; não é um desenho à parte.
- **Legenda do gráfico de linhas:** "4,8 s atrás" em cima, "↑ Agora" embaixo e "← frequências do Wi-Fi →". A linha mais nova fica um pouco mais grossa.
- **Rodapé mais limpo:** Desafio ninja, Escutar o Wi-Fi, Como funciona e Quem passou, sem as teclas no nome (elas continuam funcionando e estão listadas no painel). O botão **Operador** foi para o canto de cima.

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
- **Como funciona** (tecla `H`): três passos com desenhos de linha. No modo vitrine, ela aparece sozinha depois de 45 s sem movimento e some no primeiro movimento.
- **Grão de foto** bem leve por cima de tudo, para a tela não parecer "plástica".

Recordes, retratos e contador ficam guardados só neste navegador. O painel do operador tem um botão para apagar tudo antes da feira.

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

`N` desafio · `Enter` começar · `Espaço` chegou · `M` melodia da marca · `B` salvar cartão · `G` mural · `E` escutar · `H` como funciona · `Esc` voltar · `O` operador · `S` som · `C` calibrar · `F` tela cheia · `1`–`5` cenas da simulação

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

# Tela de demonstração

`index.html` é a tela para a feira. É um arquivo só, sem instalação.

**Como abrir:** botão direito em `index.html` → "Abrir com" → **Google Chrome** ou **Microsoft Edge**. A conexão com a placa pela USB (Web Serial) só funciona nesses dois navegadores.

Versão online para ver no celular (só simulação e gravação, sem USB): https://claude.ai/artifact/1q55pHmnJivTx6Z7pzt68o

## Ideia do visual

Minimalista, como os sites premiados (Awwwards): muito espaço vazio, a tipografia carregando a página, poucos elementos, preto e branco.

- **O sinal como linhas empilhadas.** A referência é o gráfico do pulsar CP1919, feito por Harold Craft a partir de sinais de rádio de Arecibo. Peter Saville usou esse gráfico na capa de *Unknown Pleasures*, do Joy Division (1979). Aqui cada linha é uma leitura do Wi-Fi: a média dos pacotes de 0,1 s, com a amplitude de cada subportadora. A mais nova aparece embaixo. Com a sala parada, as linhas repetem o mesmo desenho; quando alguém se mexe, elas tremem e se cruzam.
- **Uma palavra só para o estado:** *Parado.* ou *Movimento.*, em letra enorme.
- **A tela inteira inverte** (preto vira branco) quando há movimento. Dá para ver de longe.
- **Desafio Ninja em tela cheia:** *Pronto?* → 3, 2, 1 → *Vai.* → *Passou.* ou *Te vi.*
- **A única cor é o aviso amarelo** "Simulação · dados inventados para ensaio". Ele some quando os dados são reais.
- **Fontes:** Instrument Serif (títulos), Geist e Geist Mono (texto pequeno). Todas gratuitas, do Google Fonts.

O desenho das linhas realça o relevo para ficar bonito. A decisão de "parado" ou "movimento" não usa esse desenho: usa a oscilação, a mesma medida do `ferramentas/analise.py`.

## Telas extras (versão 4)

- **Abertura com contador:** a calibração virou a abertura da tela. Um número grande vai de 0% a 100% enquanto o sistema "aprende" a sala vazia. A ideia vem dos sites premiados que abrem com contador (Lusion, Immersive Garden), mas aqui o número mede algo de verdade.
- **Tremor realçado:** a forma das linhas mostra o "relevo" da sala, e a diferença em relação à forma média aparece 3x maior. Assim, quando o detector diz *Movimento.*, dá para ver as linhas tremerem. É só no desenho; a detecção não muda.
- **Frases que se revezam:** com a sala parada, a frase embaixo da palavra troca a cada 7 s, convidando o visitante.
- **Contador do dia** (no topo): quantos movimentos foram detectados. A simulação conta separado e aparece como "na simulação".
- **Retrato de cada visitante:** no Desafio Ninja, as leituras dos 3 s de contagem e da travessia viram o "rastro" da pessoa, numerado (Nº 001, Nº 002...). No computador do estande, a tecla `B` salva um cartão PNG de 1080×1350 para a pessoa fotografar ou postar. Na versão do claude.ai o botão fica escondido, porque lá não dá para salvar arquivos.
- **Quem passou hoje** (tecla `G`): galeria com os últimos 12 retratos.
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

**Som** (começa mudo):
- **Alerta:** dois toques quando começa um movimento.
- **Contador:** estalos como um contador Geiger, mais rápidos quanto mais a pessoa se mexe.
- **Desafio:** bipes na contagem, fanfarra no *Passou.* e buzina no *Te vi.*

Teste o volume no lugar da feira.

## Atalhos

`N` desafio · `Enter` começar · `Espaço` chegou · `B` salvar retrato · `G` quem passou · `H` como funciona · `Esc` voltar · `O` operador · `S` som · `C` calibrar · `F` tela cheia · `1`–`5` cenas da simulação

## Situação

- Testado no Chromium: simulação, calibração, detecção, inversão de cor, Desafio Ninja (passando e sendo pego), gravação e celular.
- A leitura pela USB segue o jeito do visualizador oficial da Espressif (`csi_viewer.html`), mas **ainda não foi testada com a placa**.
- O limiar e as constantes (janela de 1 s, 3 e 5 confirmações) são pontos de partida. Vão ser ajustados com dados reais.

## Referências

- Awwwards, vencedores anuais: https://www.awwwards.com/annual-awards/winners
- Inspiração "big typography" do Awwwards: https://www.awwwards.com/inspiration/big-typography-website
- Tipografia grande e espaço vazio (Designmodo): https://designmodo.com/big-typography
- História do gráfico do pulsar (Scientific American): https://www.scientificamerican.com/article/the-pulsar-chart-that-became-a-pop-icon-turns-50-joy-division-rsquo-s-unknown-pleasures
- Pulsares e a capa do disco (Chalkdust): https://chalkdustmagazine.com/blog/unknown-pleasures/

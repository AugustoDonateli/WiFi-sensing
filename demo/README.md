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

`N` desafio · `Enter` começar · `Espaço` chegou · `Esc` voltar · `O` operador · `S` som · `C` calibrar · `F` tela cheia · `1`–`5` cenas da simulação

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

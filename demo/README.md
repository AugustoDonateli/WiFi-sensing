# Tela de demonstração

`index.html` é a tela para a feira. É um arquivo só, sem instalação.

**Como abrir:** botão direito em `index.html` → "Abrir com" → **Google Chrome** ou **Microsoft Edge**. A conexão com a placa pela USB (Web Serial) só funciona nesses dois navegadores.

Versão online para ver no celular (só simulação e gravação, sem USB): https://claude.ai/artifact/1q55pHmnJivTx6Z7pzt68o

## Ideia do visual

A tela imita instrumentos de medição de verdade, em vez de um painel genérico de computador:

- **Registrador de papel:** uma caneta desenha numa folha quadriculada que corre, e uma "caneta de eventos" vermelha marca embaixo quando há movimento.
- **Sismograma do dia:** inspirado nos *webicorders* de observatórios sismológicos. Cada linha é um minuto, lida de cima para baixo. Cada "pancada" no traço é alguém se mexendo, e os resultados do Desafio Ninja ficam anotados no papel.
- **Medidor de agulha** com faixa vermelha a partir do limiar.
- **Placa de museu** com "Experimente / Repare / O que está acontecendo", em letra grande, para o visitante entender sem ninguém explicar.
- **Fonte Atkinson Hyperlegible**, criada pelo Braille Institute para leitura com baixa visão. Combina com um projeto que pensa em idosos.
- **Fita amarela listrada** "SIMULAÇÃO" sempre que os dados forem inventados. Gravação usa fita azul, e ao vivo usa fita verde.

## Fontes de dados (no painel do operador, tecla O)

| Botão | O que faz | Fita na tela |
|---|---|---|
| Simulação | Gera dados no computador para ensaiar. Abre sozinha. **Não é medição.** | amarela listrada, SIMULAÇÃO |
| Gravação… | Reproduz em loop um `.csv` gravado pelo `ferramentas/capturar.py`. Plano B se o ao vivo falhar. | azul, GRAVAÇÃO |
| Placa USB | Lê a Placa B pela USB a 921600 baud. Feche o `idf.py monitor` antes. | verde piscando, AO VIVO |

## Som

Fica mudo até alguém escolher (o navegador só deixa tocar som depois de um clique).

- **Alerta:** dois toques curtos quando começa um movimento.
- **Contador:** estalos como um contador Geiger, mais rápidos quanto maior a oscilação.
- **Desafio:** bipes na contagem 3-2-1, fanfarra no NINJA e buzina no DETECTADO.

Todas as notas são da mesma escala, para não brigarem entre si. Na feira, teste o volume no lugar: barulho de gente conversando encobre sons baixos.

## Cascata

- Desenhada pixel a pixel, sem esticar a imagem, para não ficar borrada.
- Os pacotes chegam da USB em rajadas, então cada um é espalhado no seu lugar no tempo (no máximo 0,3 s de atraso).
- Depois de calibrar, a escala de cor fica presa ao nível da zona vazia: parado fica claro e movimento escurece.
- Faixas cinza em cima e embaixo são as bordas do canal, onde o chip não mede sinal.

## Atalhos

`1`–`5` cenas da simulação · `N` começa o desafio · `Espaço` chegou · `C` calibrar · `S` som · `O` painel do operador · `F` tela cheia

## Situação

- Testado no Chromium: simulação, calibração, detecção, sons, Desafio Ninja (vencendo e sendo detectado), gravação e layout de celular.
- A leitura pela USB segue o mesmo jeito do visualizador oficial da Espressif (`csi_viewer.html`), mas **ainda não foi testada com a placa**.
- O limiar e as constantes (janela de 1 s, 3 e 5 confirmações) são pontos de partida. Vão ser ajustados com os dados reais.

## Referências usadas no visual

- Como ler um webicorder (Universidade de Utah): https://quake.utah.edu/resources/reading-a-webicorder/
- Webicorders do Alaska Volcano Observatory: https://avo.alaska.edu/webicorders/index.php
- Atkinson Hyperlegible (Braille Institute, fonte livre): https://github.com/googlefonts/atkinson-hyperlegible
- Acessibilidade em textos de exposição (tamanho de letra e linhas curtas): https://www.miamidadearts.org/sites/default/files/files/inline/the_how-to_of_accessible_arts_exhibitions.pdf e https://info.gaylord.com/ada-compliant-exhibit-labels
- Som em museus (frases curtas, testar no local, sons que combinam entre si): https://arxiv.org/pdf/2312.13953 e https://www.hakanlidbo.com/thenobelmuseum

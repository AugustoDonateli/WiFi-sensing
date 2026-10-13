# Tela de demonstração

`index.html` é a tela para a feira. É um arquivo só, sem instalação.

**Como abrir:** botão direito em `index.html` → "Abrir com" → **Google Chrome** ou **Microsoft Edge**. A conexão com a placa pela USB (Web Serial) só funciona nesses dois navegadores.

Versão online para ver no celular (só simulação e gravação, sem USB): https://claude.ai/artifact/1q55pHmnJivTx6Z7pzt68o

## Fontes de dados

| Botão | O que faz | Faixa na tela |
|---|---|---|
| Simulação | Gera dados no computador para ensaiar a apresentação. Abre sozinha. **Não é medição.** | amarela, SIMULAÇÃO |
| Gravação… | Reproduz em loop um `.csv` gravado pelo `ferramentas/capturar.py`. Serve de plano B se o ao vivo falhar. | azul, GRAVAÇÃO |
| Placa USB | Lê a Placa B direto pela USB, a 921600 baud. Feche o `idf.py monitor` antes. | verde, AO VIVO |

## O que aparece

- **Cascata:** cada faixa horizontal é uma subportadora. "Variação" destaca o que mudou no último segundo; "Amplitude" mostra o sinal bruto.
- **Estado da zona:** SEM MOVIMENTO ou MOVIMENTO, com a barra de oscilação e a marca do limiar.
- **Limiar:** o botão "Calibrar com a zona vazia" mede 10 s e põe o limiar em média + 3 desvios. O controle deslizante deixa o visitante mudar o limiar e ver o efeito.
- **Oscilação nos últimos 60 s:** a mesma medida do `ferramentas/analise.py` (desvio padrão da amplitude em 1 s, média das subportadoras). Movimento só é declarado após 3 medições seguidas acima do limiar e termina após 5 abaixo.
- **Desafio Ninja:** contagem de 3 s, depois o visitante atravessa a zona. Se o detector disparar, aparece DETECTADO. Se o operador apertar "Chegou" (ou Espaço) antes, aparece NINJA. O ranking fica salvo só neste navegador.

## Atalhos

`1`–`5` cenas da simulação · `N` começa o desafio · `Espaço` chegou · `C` calibrar · `F` tela cheia

## Situação

- Testado no Chromium: simulação, calibração, detecção, Desafio Ninja (vencendo e sendo detectado), gravação e layout de celular.
- A leitura pela USB segue o mesmo jeito do visualizador oficial da Espressif (`csi_viewer.html`), mas **ainda não foi testada com a placa**.
- O limiar e as constantes (janela de 1 s, 3 e 5 confirmações) são pontos de partida. Vão ser ajustados com os dados reais.

# Apresentação no estande

## A frase do projeto

> O Wi-Fi que já existe em todo lugar consegue perceber quando alguém se mexe, sem câmera. A gente mostra como, até onde funciona e por que isso também é uma questão de privacidade.

Todo mundo do grupo deve saber dizer essa frase do seu jeito, em 10 segundos.

## O que o visitante precisa levar para casa

1. **O Wi-Fi bate nas pessoas e volta diferente.** Uma placa manda o sinal, a outra mede como ele chega.
2. **Um limite decide o que é movimento.** O medidor da tela mostra isso: "1,0×" é a sala vazia; passou da linha tracejada (por exemplo 1,3×), é movimento.
3. **Serve para coisas boas, tem limites e tem riscos.**
   - Coisas boas: perceber queda de idoso sem câmera no banheiro, casa que apaga a luz sozinha.
   - Limite: uma pessoa parada não aparece.
   - Risco: alguém poderia saber se tem gente em casa.

Se o visitante sair sabendo essas três coisas, a apresentação funcionou.

## Montagem

```
                    parede do fundo
  ┌──────────────────────────────────────────────────┐
  │   [TV ou monitor virado para o público] [pôster] │
  │                                                  │
  │                    CHEGADA                       │
  │                       ┃                          │
  │   A ● ─ ─ ─ ─ ─ ─ ─ ─ ╂ ─ ─ ─ ─ ─ ─ ─ ─ ● B      │
  │   (banquinho,         ┃          (mesa, cabo USB │
  │    ~1 m de altura)    ┃           no notebook)   │
  │                    PARTIDA                       │
  │                                                  │
  └──────────────────────────────────────────────────┘
            corredor do público (fora da linha A–B)
```

- **Distância:** 2 a 3 m entre A e B, a mesma das coletas.
- **A faixa cruza a linha A–B.** O visitante sai da PARTIDA (perto do público), atravessa a "linha invisível" e chega na CHEGADA, andando de frente para a TV. Assim ele se vê na tela enquanto anda.
- **Corredor fora da linha:** quem passa no corredor não pode cruzar a linha entre A e B, senão a tela dispara sozinha.
- **Placas à vista e com plaquinha:**
  - "PLACA A · fala: 100 mensagens de Wi-Fi por segundo";
  - "PLACA B · escuta e mede".
  - Ver as placas pequenas e baratas é parte do "uau".
- **Calibre no lugar**, com a faixa vazia, sempre que a TV ficar disparando sozinha (tecla `C`, ou o botão no painel do Operador).

## Os jogos que explicam

Cada jogo ensina uma coisa. Não precisa fazer todos com todo mundo.

| Jogo | O que a pessoa faz | O que ela aprende |
|---|---|---|
| **Faça o número subir** | Mexe os braços entre as placas e tenta bater o recorde do dia (embaixo do gráfico do medidor) | Movimento muda o sinal. O limite decide o que é movimento. |
| **Estátua** | Fica totalmente parada no meio da faixa por 10 s | A tela volta para *Parado.* com a pessoa ali. O detector vê **movimento**, não **pessoa**. É o maior limite do projeto. |
| **Desafio Ninja** (tecla `N`) | Atravessa a faixa bem devagar tentando não ser percebida | Até onde vai a sensibilidade. No fim ela ganha a marca em anéis e o cartão. |
| **Superpoder** (tecla `E`) | Fecha os olhos com fone; alguém do grupo se mexe (atrás de um painel, se o teste de parede der certo); ela diz quando ouviu | O Wi-Fi "vê" sem câmera, e isso pode invadir a privacidade. |

**Teste a Estátua com as placas antes da feira.** Se a pessoa parada ainda fizer o número subir (respiração, balanço do corpo), mude a fala para: "ele percebe até você respirando, olha o número". É um achado interessante de qualquer jeito, e só vale dizer o que foi visto.

## Comparações que funcionam

- **Piscina:** "A Placa A faz ondinhas numa piscina e a B sente as ondas do outro lado. Sem ninguém na água, elas chegam sempre iguais. Entrou alguém e se mexeu, elas mudam."
- **Acorde:** "O Wi-Fi manda 64 frequências ao mesmo tempo, como 64 notas tocando juntas. Cada linha da tela mostra a força dessas 64. Quando você se mexe, algumas mudam e a linha treme."
- **Morcego:** "O morcego se guia pelo eco do som. Aqui o eco é de rádio, e esse rádio já está no ar de qualquer jeito."

## A apresentação na TV (tecla H)

A página tem uma apresentação animada, "Como funciona", que serve de apoio para a fala. A fala de cada cena aparece na **janela do apresentador** (tecla `P`), no notebook; a TV mostra só a animação.

**Montagem, nessa ordem:**
1. Abra a página no notebook e aperte **P**. Abre a janela do apresentador.
2. Arraste a página principal para a TV.
3. Na TV, aperte **F** (tela cheia). O Chrome sai da tela cheia quando abre uma janela nova, por isso o F vem por último.
4. Aperte **H** para abrir a apresentação. O passador de slides funciona nas duas janelas. `B` deixa a TV preta.

**As cenas** (★ = também na versão curta, tecla `V`):

| # | Cena | O que aparece | Onde usar no roteiro |
|---|---|---|---|
| 1 ★ | Wave Sense | As linhas do sinal | Abertura |
| 2 | Como perceber que alguém caiu sem usar câmera? | Pessoa caída numa sala, câmera riscada | Problema (o dado da OMS está na fala) |
| 3 ★ | O Wi-Fi está em quase todo lugar. | Roteador e ondas enchendo a sala | Problema |
| 4 ★ | Usamos duas placas ESP32. | O roteador muda de forma e vira a placa A (desenhada como a do estande); mensagens indo de A para B, e o LED de cada placa pisca | Como funciona (aponte as placas de verdade) |
| 5 ★ | O sinal chega por vários caminhos. | Caminho direto, pelo teto, pelo chão e pela pessoa | Como funciona (piscina) |
| 6 | A placa B mede o sinal em 64 frequências. | Os caminhos são puxados para dentro da placa B, e dela saem as 64 barras | Como funciona (acorde) |
| 7 ★ | Cada linha é uma medida das 64 frequências. | O topo das barras vira a primeira linha | Como funciona |
| 8 ★ | Quando alguém se mexe, as linhas mudam. | A sala pequena em cima, com alguém andando; embaixo, as linhas começam a tremer | Como funciona |
| 9 | Um número resume o quanto o sinal mudou. | Número, gráfico e a linha do limite; quando passa do limite, "movimento" dá um pulso | Como funciona |
| 10 ★ | Agora com o sinal das placas. | A tela de verdade (o título diz se é simulação ou gravação) | Peça para mexer o braço |
| 11 | Como testamos. | 4 situações × 4 sessões; as sessões se separam em "ajustam o limite" e "só testam" | Método |
| 12 | Resultados. | As gravações de teste se empilham na barra do resultado; acerto por coleta ao lado do chute (ou "ainda estamos gravando") | Resultados |
| 13 ★ | Pessoa parada não aparece. | A mesma sala pequena, com a pessoa parada e tracejada; as linhas ficam calmas | Limites (Estátua) |
| 14 | Dá para montar com pouco. | A sala volta ao tamanho normal e as linhas viram a tela de um notebook ligado à placa B | Viabilidade (falem o preço) |
| 15 ★ | Onde isso pode ajudar. | Pessoa caída com um sinal de alerta, luminária que apaga e acende sozinha, casa com o sino do alarme | Impacto |
| 16 ★ | E a privacidade? | Casa de parede grossa com as ondas atravessando, alguém do lado de fora | Ética |
| 17 ★ | Experimente o Desafio Ninja. | A tela de verdade | Convite |

- O que é ilustração aparece com a etiqueta "Ilustração" no canto. Fale "isto é um exemplo" nessas cenas; o número de verdade é o da cena 10.
- Os textos estão em `demo/roteiro.js`. Mudem o que quiserem lá, com o mesmo cuidado: nada de número inventado.
- No mesmo arquivo:
  - `transicao` é quantos segundos dura cada passagem de cena (hoje 2,6 s; mais = mais devagar);
  - `CUSTO` é o preço que pagaram nas duas placas (por exemplo `'R$ 90'`). Com ele preenchido, a cena 14 fala o valor.

## Roteiros

### 30 segundos (para quem está passando)
1. "Quer ver o Wi-Fi te perceber sem câmera? Fica aqui na partida."
2. "Mexe os braços." A tela inverte, o número sobe.
3. "Não tem câmera nenhuma. É só o sinal entre essas duas plaquinhas."
4. "Quer tentar passar sem ser visto? É o Desafio Ninja."

### 3 minutos (visitante curioso)

| Tempo | O que acontece | O que falar |
|---|---|---|
| 0:00 | Convite | "Quer ver o Wi-Fi te perceber sem câmera?" |
| 0:15 | Mexe os braços entre as placas | "Olha o número: você está mexendo no Wi-Fi 12 vezes mais que a sala vazia. Passou da linha tracejada, a tela diz *Movimento.*" (Leia o número que aparecer, não um inventado.) |
| 0:45 | Aponta para A, B e as linhas | Comparação da piscina ou do acorde. "Cada linha é uma leitura. A de baixo, mais grossa, é agora." |
| 1:20 | Estátua | "Agora fica paradão... Viu? Você está aí, mas para o Wi-Fi você sumiu. A gente detecta movimento, não pessoa." |
| 1:50 | Para que serve | "Cuidar de idoso sem câmera no banheiro, apagar a luz quando a sala esvazia, alarme." |
| 2:15 | Limites e privacidade | "Pessoa parada some, várias pessoas viram um borrão, e cada lugar precisa calibrar. E pensa: se isso funcionar através da parede, alguém de fora saberia se tem gente na sua casa. Por isso a gente discute privacidade." |
| 2:40 | Convite final | Desafio Ninja e o cartão, ou o modo escuta. |

### 5 a 7 minutos (avaliador)

Siga a ordem de um trabalho científico. A nota da apresentação vem de: **visual (10), domínio do conteúdo (15), viabilidade técnica (10) e impacto (15)**.

1. **Problema** (30 s): câmeras invadem a privacidade e sensores vestíveis são esquecidos. Será que o Wi-Fi resolve?
2. **Como funciona** (1 min): CSI, as 64 subportadoras, 100 pacotes por segundo, ESP32 com o firmware oficial da Espressif. Mostre na tela, com alguém se mexendo.
3. **Método** (1 min30):
   - coletas rotuladas em sessões (vazio, parado, andando, queda simulada no colchonete);
   - limite calibrado com a sala vazia;
   - **sessões diferentes para ajustar e para testar**, para não "colar".
4. **Resultados** (1 min30):
   - o pôster antes/depois;
   - os números do `avaliar.py` **por coleta**, sempre ao lado do "chute" (responder sempre a classe mais comum);
   - se ainda não houver números, diga isso.
5. **Limites** (45 s): pessoa parada, distância, parede, várias pessoas, interferência, calibrar em cada lugar.
6. **Viabilidade** (30 s): duas placas baratas, firmware aberto, programas em Python. Anotem o preço que pagaram e falem o número. Em setembro de 2025 o IEEE publicou um padrão só para sensoriamento por Wi-Fi, o 802.11bf, o que mostra que a ideia está indo para produtos. É a cena 14 da apresentação.
7. **Impacto e ética** (30 s): cuidado de idosos e economia de energia de um lado, privacidade do outro.
8. **Uso de IA** (15 s): "Usamos um assistente de IA como apoio no código e nos textos. Revisamos tudo, e os dados foram medidos por nós." Está declarado na inscrição; é regra do edital.

**Tema da JACITEC ("Ciência delas"), opcional, 15 s (não está na tela, só na fala):** em 1942, a atriz e inventora Hedy Lamarr patenteou, com George Antheil, o salto de frequência, uma das ideias que abriram caminho para comunicações sem fio como o Bluetooth.

## Quem faz o quê

| Papel | Faz | Fica |
|---|---|---|
| **Anfitrião** | Chama as pessoas, conduz os jogos, entrega o cartão | Perto da PARTIDA |
| **Explicador** | Comparações, limites, privacidade; atende avaliadores | Perto da TV |
| **Operador** | Notebook: calibrar, trocar de tela, cuidar das placas e dos cabos, zerar o dia | Na mesa da Placa B |

Revezem a cada 30 minutos. **Todos** precisam saber o roteiro de 3 minutos e a versão do avaliador, porque o avaliador pode perguntar para qualquer um.

## Perguntas difíceis (respostas honestas)

- **"Tem câmera escondida?"** Não. Pode olhar as placas. Não tem câmera nem microfone, só rádio.
- **"Dá para ver através da parede?"**
  - Pesquisadores do MIT mostraram isso em 2013 (Wi-Vi), com equipamento especial.
  - Com a nossa placa barata, é o que estamos testando. Só fale "funciona" se o teste der certo.
- **"Ele sabe quem eu sou?"** Não. Ele só percebe que algo mudou no sinal.
- **"E com duas pessoas?"** Ele diz que tem movimento, mas não quantas pessoas, nem onde.
- **"Funciona com o Wi-Fi da minha casa?"** Os roteadores comuns não mostram essas medidas; a ESP32 mostra. O padrão 802.11bf é o começo disso virar produto.
- **"Qual a precisão?"** Só o número medido, por coleta e com o chute ao lado. Se ainda não tiver: "estamos medindo, e é isso que a gente vai mostrar".
- **"Detecta queda?"**
  - Testamos só quedas simuladas no colchonete. Falem o resultado que tiverem.
  - A queda é um movimento forte e depois silêncio. O difícil é que a pessoa caída fica parada, e parada ela some (é a Estátua).
- **"Por que não câmera?"** Privacidade (banheiro, quarto), funciona no escuro, e a pessoa não precisa usar nada no corpo.
- **"Os dados dos visitantes ficam guardados?"** A tela guarda só o apelido e a marca, no navegador do notebook, e o operador apaga no fim do dia. Nada vai para a internet.

## Checklist do dia

- [ ] Notebook e carregador, extensão ou filtro de linha
- [ ] Placas A e B, cabo USB de dados, carregador ou power bank para a A
- [ ] Banquinho ou suporte para a Placa A (~1 m de altura)
- [ ] Fita para a faixa, folhas PARTIDA e CHEGADA, plaquinhas "A fala" e "B escuta"
- [ ] TV ou monitor e cabo HDMI (a feira não fornece notebook nem datashow)
- [ ] Pôster impresso
- [ ] Fone de ouvido para o modo escuta e álcool para limpar
- [ ] Colchonete (se a parte de queda simulada entrar)
- [ ] Plano B:
  - pasta `demo/` no notebook (funciona sem internet);
  - uma gravação `.csv` para o modo Gravação;
  - um vídeo curto da demonstração.
- [ ] Atualizações do Windows pausadas na véspera
- [ ] Antes de abrir: calibrar no local e zerar recordes e mural (painel do Operador)

## Ensaios antes da feira

1. Cronometrar o roteiro de 3 minutos com alguém de fora do grupo, que nunca ouviu falar do projeto. No fim, perguntar: "o que você entendeu?". Comparar com as três coisas do começo deste documento.
2. Testar a Estátua, o Desafio Ninja e o número do medidor com as placas de verdade, e ajustar as falas ao que acontecer.
3. Cada um faz a versão do avaliador pelo menos uma vez, e os outros fazem as perguntas difíceis.

# Protocolo de coleta

Rascunho para a primeira sessão. Os números (duração, repetições) são pontos de partida e podem mudar depois que virmos os primeiros dados reais. Qualquer mudança fica anotada aqui, com a data.

## Antes de cada sessão

1. Montar as placas paradas, na mesma altura, a mais de 1 m uma da outra (recomendação da Espressif).
   - Antenas (a ponta com o zigue-zague dourado, do lado oposto ao USB) viradas uma para a outra.
   - Longe do roteador e de aparelhos usando Wi-Fi (em 15/10, o roteador ao lado da placa B fez metade dos pacotes se perder).
   - Placa A gravada com **50 pacotes por segundo** (ver `docs/decisoes.md`, 15/10). Anotar no `--obs`.
2. Marcar com fita no chão a posição das placas, da mesa e da área onde a pessoa anda.
3. Tirar uma foto da montagem e anotar a distância entre as placas.
4. Dar um código para a sessão (S1, S2...) e usar em todas as coletas dela, com `--sessao S1`.
5. Abrir o monitor por alguns segundos para conferir que chegam linhas `CSI_DATA`, e fechar.

## Classes da primeira etapa

| Rótulo | O que a pessoa faz |
|---|---|
| `vazio` | Ninguém na sala, nem perto da porta. |
| `parado` | Pessoa de pé no ponto marcado, sem andar, respirando normalmente. |
| `andando` | Pessoa vai e volta na área marcada, em ritmo normal, durante toda a gravação. |

Depois, se a primeira etapa funcionar: `sentar_levantar` e `queda_simulada` (sempre no colchonete, deitando de forma controlada, nunca uma queda de verdade).

## Sequência sugerida por sessão

1. Duas coletas `vazio` de 60 s no início (servem para calibrar).
2. Cinco coletas de 30 s de cada classe, em ordem alternada: vazio, andando, parado, andando, vazio, parado...
3. Uma coleta `vazio` de 60 s no fim (mostra se algo mudou durante a sessão).

Comando, no "ESP-IDF PowerShell":

```
python ferramentas/capturar.py --porta COM3 --sessao S1 --rotulo andando --duracao 30 --espera 10 --participante P1 --distancia 2 --parede nao --obs "A em 50/s"
```

## Separar ajuste e teste

Decidir **antes** de olhar os resultados: as sessões ímpares (S1, S3...) servem para escolher o limiar e treinar o classificador, e as sessões pares (S2, S4...) só para medir os acertos no fim. É isso que `ferramentas/avaliar.py` e `ferramentas/classificar.py` fazem por padrão. Gravações vizinhas da mesma sessão são muito parecidas; misturá-las entre ajuste e teste faz o resultado parecer melhor do que é.

## Participantes

- Usar só códigos (P1, P2...). O nome não vai para nenhum arquivo.
- Antes de gravar, explicar: "Vamos gravar números sobre o sinal Wi-Fi enquanto você fica parado ou anda. Não tem câmera nem áudio. Você pode desistir a qualquer momento."
- Pedir autorização. Se for menor de idade, seguir a orientação do professor sobre autorização dos responsáveis.

## Experimento de distância e parede (depois)

Variar uma coisa por vez, mantendo o resto igual:

1. Linha de base: sem parede, distância D1.
2. Outras distâncias: D2, D3 (anotar em `--distancia`).
3. Com parede: mesma distância da linha de base, pessoa do outro lado da parede (`--parede sim`), anotando o material da parede e a posição de tudo.

# Laboratório de passagens

Página para comparar o som das trocas de tela (`demo/sons.js`). Abra o `index.html` no navegador (com internet, para as fontes) e use fone ou a caixa de som da TV.

- O palco tem as cinco telas do site, simplificadas, com as **passagens de verdade** (`demo/passagem.js`). Clique nas telas (ou use as teclas do site: E, N, G, H, Esc).
- À direita, as propostas: **Sinal**, **Notas**, **Ar** e o sopro de antes, para comparar. A escolha vale para o palco.
- Embaixo, o que cada proposta faz em cada tela, com "Ouvir" para tocar só o som de entrar ou de sair.
- "Alguém andando" mexe na sala simulada: as linhas tremem e, na proposta Sinal, o som também.
- "Passeio por todas as telas" faz as trocas sozinho, uma depois da outra.
- Na tela "Como funciona", a primeira cena tem as linhas; depois de 2,6 s ela passa para a segunda (ilustração). Saindo da primeira, o som é o do pouso; saindo da segunda, o das linhas desenhadas por cima, que é o caso mais comum no estande.

As linhas vêm da sala simulada do laboratório de escuta (`../laboratorio-escuta/escuta-sim.js`). **Dados inventados**: servem para comparar os sons.

## Medir

`medir.py` + `medir.html` gravam cada uma das 20 trocas sem tocar (OfflineAudioContext, no Chromium do Playwright), pela mesma cadeia do site (limitador e volume 0,6), e medem o pico de volume em janelas de 50 ms.

```
python ferramentas/laboratorio-passagens/medir.py
```

Medição em 15/10/2026 (dBFS; mais perto de 0 = mais alto):

| | Pico em 50 ms (média das 20 trocas) | Pico de amostra |
|---|---|---|
| Sinal | −26,8 | −14,2 |
| Notas | −26,5 | −17,1 |
| Ar | −26,3 | −14,7 |
| Alerta do detector (para comparar) | −25,4 | −19,0 |
| Sopro de antes | −43,9 | −32,5 |

O volume de cada proposta fica em `FAMILIAS` (`nivel`), no fim do `demo/sons.js`.

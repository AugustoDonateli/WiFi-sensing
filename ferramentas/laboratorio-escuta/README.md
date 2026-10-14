# Laboratório de escuta

Página para comparar sons do modo escuta (tecla E). Abra o `index.html` no navegador (com internet, para as fontes) e use fone.

**Escolha do grupo (14/10/2026): Batimento.** A versão 2 é a do site: o próprio `demo/escuta.js`, carregado daqui. A primeira versão e as outras propostas (Vogal, Harpa de vento, Partitura) ficam na página para comparar, junto com o som antigo (vento, gotas e alerta).

- `escuta-sim.js`: a mesma sala simulada do `demo/index.html` e a mesma regra do `demo/nucleo.js`. **Dados inventados.**
- `escuta-sons.js`: as outras propostas e o som antigo. Nenhuma proposta tem bipe de alerta.
- `medir.py` + `medir.html`: grava cada opção sem tocar (OfflineAudioContext, no Chromium do Playwright) e mede, em cada cena:
  - o volume médio (dBFS; quanto mais perto de 0, mais alto);
  - o quanto o volume sobe e desce dentro do trecho, em cada ouvido (0 = liso; 0,6 = o vale fica com 40% do pico).

Medição na simulação, em 14/10/2026:

| Opção | Sala vazia | Andando | Bem devagar | Mão perto | Pulso, andando |
|---|---|---|---|---|---|
| **Batimento, versão 2 (site)** | -27,1 | -15,8 | -21,2 | -15,7 | 0,59 |
| Batimento, primeira versão | -22,7 | -21,2 | -24,5 | -21,3 | 0,59 |
| Vogal | -25,4 | -21,6 | -24,6 | -22,5 | 0,24 |
| Harpa de vento | -34,3 | -14,1 | -24,0 | -14,5 | 0,47 |
| Partitura | -27,9 | -18,8 | -25,8 | -19,6 | 0,62 |
| Som antigo (vento, gotas, alerta) | -32,6 | -18,1 | -27,7 | -17,8 | 0,47 |

Na primeira versão do Batimento, o volume quase não mudava (1,5 dB entre sala vazia e alguém andando); a mudança estava só no pulso, e o grupo achou que podia passar despercebida. Na versão 2 o acorde sobe 11 dB, e o pulso continua tão fundo quanto antes. Na Partitura, o "pulso" alto com a sala vazia são as próprias notas da melodia.

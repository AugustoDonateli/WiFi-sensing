# Laboratório de escuta

Página para comparar propostas de som do modo escuta (tecla E) antes de levar uma para o `demo/index.html`.
Abra o `index.html` no navegador (com internet, para as fontes) e use fone.

- `escuta-sim.js`: a mesma sala simulada do `demo/index.html` e a mesma regra do `demo/nucleo.js`. **Dados inventados.**
- `escuta-sons.js`: as opções (Vogal, Harpa de vento, Batimento, Partitura) e o som de hoje, para comparar. Nenhuma tem bipe de alerta.
- `medir.py` + `medir.html`: grava cada opção sem tocar (OfflineAudioContext, no Chromium do Playwright) e mostra o volume em cada cena.
  Serve para conferir o contraste entre sala parada e movimento e se nada estoura.

Medição na simulação, em 14/10/2026 (dBFS, média de cada trecho; quanto mais perto de 0, mais alto):

| Opção | Sala vazia | Andando | Pessoa parada | Mão perto |
|---|---|---|---|---|
| Vogal | -25,4 | -21,6 | -25,2 | -22,5 |
| Harpa de vento | -34,3 | -14,1 | -27,3 | -13,9 |
| Batimento | -22,7 | -21,2 | -25,4 | -21,3 |
| Partitura | -27,9 | -18,8 | -26,1 | -19,3 |
| Hoje (vento, gotas, alerta) | -32,6 | -18,1 | -28,7 | -18,2 |

Na Vogal e no Batimento a diferença principal não é o volume: é o timbre (a vogal muda) e o pulso (as notas batem).

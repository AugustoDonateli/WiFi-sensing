/* A marca de cada travessia: anéis feitos com as leituras do Wi-Fi, como anéis de árvore.
 *
 * Como ela é feita (é a mesma explicação que aparece na tela):
 *   1. O Wi-Fi é lido 10 vezes por segundo. Cada leitura é uma linha: o formato das 64 frequências.
 *   2. Os 3 s de contagem, com a pessoa parada na partida, viram o miolo (anéis finos, cinza).
 *   3. A travessia vira os anéis de fora, do começo (dentro) ao fim (borda). O disco sempre fica cheio:
 *      travessia curta tem as leituras interpoladas; longa, amostradas.
 *   4. O quanto o anel entorta vem do tremor daquele instante, na escala da sala vazia: abaixo do limite
 *      do detector, o anel fica quase liso; acima, fica torto. (Antes, cada marca era ajustada pelo próprio
 *      máximo, e quem passou sem ser percebido ficava com a marca mais torta. Não é mais assim.)
 *   5. Se o Wi-Fi detectou a pessoa, o último anel é grosso: é o instante da detecção.
 *
 * É desenho feito com as leituras; não identifica ninguém. Partes puras testadas no Node
 * (ferramentas/testes/test_marca_js.py). No navegador: window.WaveMarca.
 */
(function (raiz) {
  'use strict';

  const VERSAO = 2;
  const MAX_ANEIS = 90;        // até 9 s de travessia, um anel por leitura; mais que isso, amostra
  const MAX_MIOLO = 6;
  const REALCE = 3;            // o mesmo realce do tremor das linhas da tela
  const TAU = Math.PI * 2;
  const limitar = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const r1 = (x) => Math.round(x * 10) / 10;
  const r2 = (x) => Math.round(x * 100) / 100;

  // n itens espalhados por xs, sempre com o primeiro e o último (o último é o fim da travessia).
  function amostrar(xs, n) {
    if (xs.length <= n) return xs.slice();
    if (n <= 1) return [xs[xs.length - 1]];
    return Array.from({ length: n }, (_, i) => xs[Math.round((i * (xs.length - 1)) / (n - 1))]);
  }
  const linha = (l) => ({ a: Array.from(l.a, r1), d: Array.from(l.d, r1), x: r2(l.x || 0) });

  // O registro guardado de uma travessia.
  // rastro: [{ a, d, x, fase }], x = tremor daquele instante comparado com a sala vazia (1 = sala vazia),
  // fase = 'contagem' | 'correndo'. lim = o limite do detector na mesma escala.
  function registro({ n, nome, tempo, ok, quando, fonte, lim, rastro }) {
    const miolo = rastro.filter((l) => l.fase === 'contagem');
    const trav = rastro.filter((l) => l.fase === 'correndo');
    const pico = trav.reduce((m, l) => Math.max(m, l.x || 0), 0);
    return {
      v: VERSAO, n, nome, tempo: r2(tempo), ok, quando, fonte, lim: r2(lim || 0), pico: r2(pico),
      miolo: amostrar(miolo, MAX_MIOLO).map(linha),
      linhas: amostrar(trav, MAX_ANEIS).map(linha),
    };
  }
  const valido = (r) => Boolean(r && r.v === VERSAO && Array.isArray(r.linhas) && r.linhas.length);

  // O relevo de uma leitura em volta do anel: o formato do sinal (a) e, 3x maior, o tremor (d).
  // A inclinação de uma ponta à outra sai, para o fim do anel encontrar o começo sem degrau.
  function relevo(l) {
    const uteis = [];
    let soma = 0;
    for (let k = 0; k < l.a.length; k++) if (l.a[k] > 0.5) { uteis.push(k); soma += l.a[k]; }
    if (uteis.length < 3) return null;
    const media = soma / uteis.length;
    const v = uteis.map((k) => (l.a[k] / media - 1) * 1.2 + (2 * REALCE * l.d[k]) / media);
    const m = v.length, ini = v[0], fim = v[m - 1];
    return v.map((x, j) => limitar(x - (ini + ((fim - ini) * j) / (m - 1)), -2.5, 2.5));
  }

  // Raio, entorte, giro e espessura de cada anel, para uma marca de raio R.
  // A travessia sempre enche o disco com 28 a 64 anéis (como a marca antiga, que o grupo achava mais bonita):
  // travessia curta = leituras interpoladas; longa = amostradas. O entorte fica contido no espaço entre os anéis,
  // para eles quase não se cruzarem. O que muda entre marcas vem do tremor, na escala da sala vazia.
  const MIN_ANEIS = 28, MAX_DESENHO = 64;
  function geometria(r, R) {
    const lim = r.lim > 0 ? r.lim : 1.3;
    const miolo = r.miolo || [], trav = r.linhas || [];
    const rIni = 0.08 * R, rMiolo = miolo.length ? 0.22 * R : rIni;
    const aneis = [];
    miolo.forEach((l, i) => {
      const raio = rIni + ((rMiolo - rIni) * (i + 1)) / miolo.length;
      aneis.push({ raio, relevo: relevo(l), amp: 0.01 * R, giro: 0, tipo: 'miolo' });
    });
    if (!trav.length) return aneis;
    // as leituras da travessia, já como relevo e força (0 = sala vazia, 1 = no limite do detector)
    const base = trav.map((l) => ({ rel: relevo(l), forca: limitar(((l.x || 0) - 1) / Math.max(0.05, lim - 1), 0, 4) }));
    const N = Math.max(MIN_ANEIS, Math.min(MAX_DESENHO, base.length));
    const em = (p) => {                      // p de 0 (começo) a 1 (fim): mistura as duas leituras vizinhas
      const u = p * (base.length - 1), i = Math.floor(u), f = u - i, A = base[i], B = base[Math.min(base.length - 1, i + 1)];
      const rel = A.rel && B.rel && A.rel.length === B.rel.length ? A.rel.map((x, j) => x + f * (B.rel[j] - x)) : (A.rel || B.rel);
      return { rel, forca: A.forca + f * (B.forca - A.forca) };
    };
    const pontos = Array.from({ length: N }, (_, i) => em(N === 1 ? 1 : i / (N - 1)));
    // momentos de mais tremor ganham anéis mais largos (como os anos bons de uma árvore)
    const largura = pontos.map((q) => 0.6 + 1.4 * Math.min(1, q.forca));
    const soma = largura.reduce((a, x) => a + x, 0);
    let raio = rMiolo, giro = 0;
    pontos.forEach((q, i) => {
      const vao = ((R - rMiolo) * largura[i]) / soma;
      raio += vao;
      giro += 0.12 * Math.max(0, Math.min(q.forca, 3) - 0.3);   // só gira com tremor de verdade
      aneis.push({
        raio, relevo: q.rel, giro, forca: q.forca,
        // abaixo do limite: quase liso; acima: torto, encostando nos vizinhos (como os anéis de um ano de seca)
        amp: vao * (0.25 + 1.6 * Math.pow(Math.min(1.2, q.forca), 1.5)),
        tipo: r.ok === false && i === N - 1 ? 'deteccao' : 'travessia',
      });
    });
    return aneis;
  }

  // Tempo da animação em que a marca se forma: cada anel começa um pouco depois do anterior.
  const MORFE_S = 0.55;
  function passoAnel(total) { return Math.min(0.12, 3.2 / Math.max(1, total)); }
  function duracao(r) {
    const n = (r.linhas || []).length;
    const total = (r.miolo || []).length + (n ? Math.max(MIN_ANEIS, Math.min(MAX_DESENHO, n)) : 0);
    return (total - 1) * passoAnel(total) + MORFE_S;
  }

  const suave = (x) => { x = limitar(x); return x * x * (3 - 2 * x); };

  // Desenha a marca. o = { fundo, tinta, apagado, esp, t } (t em segundos desde o começo da formação;
  // sem t, a marca já pronta). Durante a formação, cada linha aparece reta, encostada embaixo do seu anel,
  // e se fecha nele: o meio encosta primeiro, as pontas dão a volta por último.
  function desenhar(c, W, H, r, o = {}) {
    const fundo = o.fundo || '#0B0B0A', tinta = o.tinta || '#EDEDE8', apagado = o.apagado || tinta, esp = o.esp || 1;
    if (o.limpar !== false) { c.fillStyle = fundo; c.fillRect(0, 0, W, H); }
    if (!valido(r)) return;
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.44;
    const aneis = geometria(r, R), total = aneis.length;
    // anéis muito tortos passariam da borda: a marca inteira encolhe para caber
    let ext = R;
    for (const an of aneis) if (an.relevo) ext = Math.max(ext, an.raio + an.amp * Math.max(...an.relevo.map(Math.abs)));
    const k = Math.min(1, (Math.min(W, H) * 0.48) / ext);
    if (k < 1) for (const an of aneis) { an.raio *= k; an.amp *= k; }
    const dt = passoAnel(total), t = o.t == null ? Infinity : o.t;
    const passos = R > 150 ? 220 : 140;
    c.lineJoin = 'round'; c.lineCap = 'round';
    for (let k = 0; k < total; k++) {
      const e = t === Infinity ? 1 : limitar((t - k * dt) / MORFE_S);
      if (e <= 0) break;
      const an = aneis[k], rel = an.relevo;
      if (!rel) continue;
      const m = rel.length, base = Math.PI / 2 + an.giro;
      const tx = -Math.sin(base), ty = Math.cos(base);          // direção da tangente no ponto de baixo
      const comp = Math.min(TAU * an.raio, 1.9 * R);            // a linha reta (encurtada nos anéis de fora)
      c.globalAlpha = e < 1 ? Math.min(1, e * 4) : 1;
      c.strokeStyle = an.tipo === 'miolo' ? apagado : tinta;
      c.lineWidth = esp * (an.tipo === 'miolo' ? 0.8 : an.tipo === 'deteccao' ? 2.8 : 1);
      c.beginPath();
      for (let s = 0; s <= passos; s++) {
        const q = s / passos;
        const u = q * m, j0 = Math.floor(u) % m, j1 = (j0 + 1) % m, f = u - Math.floor(u);
        const v = (1 - f) * rel[j0] + f * rel[j1];
        const ang = base + TAU * (q - 0.5);
        const rr = an.raio + v * an.amp;
        let x = cx + rr * Math.cos(ang), y = cy + rr * Math.sin(ang);
        if (e < 1) {
          const es = suave((e * 1.6 - Math.abs(q - 0.5) * 1.1) / 0.5);
          const px = cx + an.raio * Math.cos(base) + tx * comp * (q - 0.5) + Math.cos(base) * v * an.amp;
          const py = cy + an.raio * Math.sin(base) + ty * comp * (q - 0.5) + Math.sin(base) * v * an.amp;
          x = px + (x - px) * es; y = py + (y - py) * es;
        }
        if (s) c.lineTo(x, y); else c.moveTo(x, y);
      }
      if (e >= 1) c.closePath();
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  /* ---------- textos (registro de leitura) ---------- */
  const num = (x, casas = 1) => x.toFixed(casas).replace('.', ',');
  const seg = (s) => `${num(s)} s`;
  const vezes = (x) => `${num(x)}×`;
  function titulo(r) {
    return r.ok ? 'Não detectado.' : r.ok === false ? `Detectado aos ${seg(r.tempo)}.` : 'Tempo esgotado.';
  }
  function detalhe(r) {
    const lim = vezes(r.lim);
    if (r.ok) {
      return r.pico <= r.lim
        ? `${r.nome} atravessou em ${seg(r.tempo)}. O tremor ficou abaixo do limite o tempo todo: pico ${vezes(r.pico)} (limite ${lim}).`
        : `${r.nome} atravessou em ${seg(r.tempo)}. O tremor passou do limite por um instante (pico ${vezes(r.pico)}, limite ${lim}), curto demais para o detector confirmar.`;
    }
    if (r.ok === false) return `O tremor passou do limite (${lim}) e o detector confirmou aos ${seg(r.tempo)}. Chegou a ${vezes(r.pico)}.`;
    return 'Passou de 60 s sem chegar. Tente de novo.';
  }
  function resumo(r) {   // uma linha, para o mural
    return r.ok ? `Não detectado · ${seg(r.tempo)}` : r.ok === false ? `Detectado aos ${seg(r.tempo)}` : 'Tempo esgotado';
  }
  function numero(n) { return `Nº ${String(n).padStart(3, '0')}`; }
  function carimbo(r) {
    const q = new Date(r.quando), p = (x) => String(x).padStart(2, '0');
    return `Registro ${numero(r.n)} · ${p(q.getDate())}/${p(q.getMonth() + 1)}/${q.getFullYear()} · ${p(q.getHours())}:${p(q.getMinutes())}:${p(q.getSeconds())}`;
  }

  const api = { VERSAO, MAX_ANEIS, MAX_MIOLO, registro, valido, relevo, geometria, duracao, desenhar, titulo, detalhe, resumo, numero, carimbo, amostrar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.WaveMarca = api;
})(typeof window !== 'undefined' ? window : globalThis);

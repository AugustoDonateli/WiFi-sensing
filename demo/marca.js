/* A marca de cada travessia: anéis feitos com as leituras do Wi-Fi, como anéis de árvore.
 *
 * Como ela é feita (é a mesma explicação que aparece na tela):
 *   1. O Wi-Fi é lido 10 vezes por segundo. Cada leitura é uma linha: o formato das 64 frequências.
 *   2. Cada leitura vira um anel, de dentro para fora: a contagem no miolo (traço fino), a travessia até a borda.
 *   3. Cada marca é medida em relação à própria travessia: o momento em que o sinal mais variou para aquela
 *      pessoa vira o anel mais largo, torto e girado. Por isso cada marca sai diferente.
 *   4. Se o Wi-Fi detectou a pessoa, o último anel é grosso: é o instante da detecção.
 *
 * É desenho feito com as leituras; não identifica ninguém. Partes puras testadas no Node
 * (ferramentas/testes/test_marca_js.py). No navegador: window.WaveMarca.
 */
(function (raiz) {
  'use strict';

  const VERSAO = 2;
  const MAX_ANEIS = 90;        // até 9 s de travessia, um anel por leitura; mais que isso, amostra
  const MAX_MIOLO = 30;        // a contagem inteira (3 s)
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
  // Para o fim do anel encontrar o começo sem degrau, só o último trecho (20%) se curva até o começo;
  // o resto do formato fica como o sinal mostrou.
  // `escalaD`: quanto o tremor pesa (a marca usa o maior tremor da própria travessia; o padrão é o realce da tela).
  function relevo(l, escalaD) {
    const uteis = [];
    let soma = 0;
    for (let k = 0; k < l.a.length; k++) if (l.a[k] > 0.5) { uteis.push(k); soma += l.a[k]; }
    if (uteis.length < 3) return null;
    const media = soma / uteis.length;
    const v = escalaD == null
      ? uteis.map((k) => (l.a[k] / media - 1) * 1.2 + (2 * REALCE * l.d[k]) / media)
      : uteis.map((k) => (l.a[k] / media - 1) * 0.8 + (escalaD * l.d[k]) / media);
    // suaviza entre frequências vizinhas (duas passadas 1-2-1, como as linhas da tela): ondas, não espinhos
    for (let p = 0; p < 2; p++) {
      const w = v.slice();
      for (let j = 0; j < v.length; j++) v[j] = (w[Math.max(0, j - 1)] + 2 * w[j] + w[Math.min(v.length - 1, j + 1)]) / 4;
    }
    const m = v.length, salto = v[m - 1] - v[0];
    return v.map((x, j) => {
      const q = limitar((j / (m - 1) - 0.8) / 0.2);
      return limitar(x - salto * q * q * (3 - 2 * q), -2.5, 2.5);
    });
  }

  // Raio, entorte, giro e espessura de cada anel, para uma marca de raio R.
  // Como a marca antiga (a que o grupo achava mais bonita e mais pessoal): até 40 leituras reais, da contagem
  // (miolo) ao fim da travessia (borda), cada uma um anel. Cada marca é medida em relação à própria travessia:
  // o momento em que o sinal mais variou para aquela pessoa vira o anel mais largo, torto e girado.
  // O anel grosso continua sendo o instante da detecção.
  const MAX_DESENHO = 32;
  function energia(l) {
    let soma = 0, n = 0, en = 0;
    for (let k = 0; k < l.a.length; k++) if (l.a[k] > 0.5) { soma += l.a[k]; en += Math.abs(l.d[k]); n++; }
    return n ? en / soma : 0;
  }
  function geometria(r, R) {
    const todas = (r.miolo || []).map((l) => ({ l, tipo: 'miolo' })).concat((r.linhas || []).map((l) => ({ l, tipo: 'travessia' })));
    if (!todas.length) return [];
    const ls = amostrar(todas, MAX_DESENHO), N = ls.length;
    const en = ls.map((x) => energia(x.l)), emax = Math.max(...en, 1e-6);
    // O tremor de cada leitura: é a parte que muda de pessoa para pessoa. A escala fica entre a do próprio anel
    // e a do maior tremor da travessia, para os anéis calmos também mostrarem textura, e os agitados, mais.
    const dRing = ls.map(({ l }) => {
      let m = 0, n = 0; for (const a of l.a) if (a > 0.5) { m += a; n++; } m = m / (n || 1);
      let mx = 0; for (const d of l.d) mx = Math.max(mx, Math.abs(d) / m); return mx;
    });
    const dmax = Math.max(...dRing, 1e-6);
    // comprimido (raiz): o tremor forte do fim não deixa o resto da travessia sem variação
    const rel = en.map((e) => Math.sqrt(e / emax));
    const largura = rel.map((q) => 0.5 + 1.5 * q);
    const total = largura.reduce((a, x) => a + x, 0);
    const r0 = 0.1 * R, unidade = (R - r0) / N;
    let raio = r0, giro = 0;
    return ls.map((x, i) => {
      raio += ((R - r0) * largura[i]) / total;
      giro += rel[i] * 0.6 * (32 / N);
      return {
        raio, giro, relevo: relevo(x.l, 1.4 / (Math.pow(dmax, 0.15) * Math.pow(Math.max(dRing[i], 0.03 * dmax), 0.85))),
        amp: unidade * 1.2,
        tipo: r.ok === false && i === N - 1 ? 'deteccao' : x.tipo,
      };
    });
  }

  // Tempo da animação em que a marca se forma: cada anel começa um pouco depois do anterior.
  const MORFE_S = 0.55;
  function passoAnel(total) { return Math.min(0.12, 3.2 / Math.max(1, total)); }
  function duracao(r) {
    const total = Math.min(MAX_DESENHO, (r.miolo || []).length + (r.linhas || []).length);
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
      c.strokeStyle = tinta;
      c.lineWidth = esp * (an.tipo === 'miolo' ? 0.7 : an.tipo === 'deteccao' ? 2.8 : 1);
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

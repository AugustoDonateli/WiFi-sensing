/* A marca de cada travessia: uma estrela de contornos lisos, encaixados, que gira em espiral.
 *
 * Como ela é feita (é a mesma explicação que aparece na tela):
 *   1. O Wi-Fi é lido 10 vezes por segundo durante a travessia.
 *   2. Cada leitura vira um contorno, de dentro para fora: o centro é a partida (a contagem), a borda é o fim.
 *   3. O número de pontas, o jeito das pontas e o sentido do giro saem de todas as leituras juntas, como uma
 *      impressão digital: leituras diferentes dão marcas diferentes.
 *   4. Onde o sinal mais variou (em relação à própria travessia), o contorno fica mais pontudo e gira mais;
 *      o contorno mais forte é o momento de maior tremor.
 *   5. Se o Wi-Fi detectou a pessoa, o último contorno é grosso: é o instante da detecção.
 *
 * É desenho feito com as leituras; não identifica ninguém. Partes puras testadas no Node
 * (ferramentas/testes/test_marca_js.py). No navegador: window.WaveMarca.
 */
(function (raiz) {
  'use strict';

  const VERSAO = 2;
  const MAX_ANEIS = 90;        // até 9 s de travessia, um anel por leitura; mais que isso, amostra
  const MAX_MIOLO = 30;        // a contagem inteira (3 s)
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

  /* ---------- a forma: uma estrela de contornos lisos que gira em espiral ---------- */

  // Uma "impressão digital" das leituras: um número tirado de todas elas (como um hash). Leituras diferentes
  // dão números diferentes, e o número escolhe a família da forma (quantas pontas, o jeito das pontas,
  // o sentido do giro). O registro guarda as leituras arredondadas, então a mesma travessia dá sempre a mesma marca.
  function assinatura(r) {
    let h = 2166136261 >>> 0;
    for (const l of [...(r.miolo || []), ...(r.linhas || [])]) {
      for (let k = 0; k < l.a.length; k += 2) { h ^= Math.round(l.a[k] * 10) & 0xffff; h = Math.imul(h, 16777619) >>> 0; }
      h ^= Math.round((l.x || 0) * 100) & 0xffff; h = Math.imul(h, 16777619) >>> 0;
    }
    return h || 1;
  }
  function aleatorio(semente) {
    let a = semente >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Quanto aquela leitura se afastou da forma média do sinal (o tremor daquele instante).
  function energia(l) {
    let soma = 0, n = 0, en = 0;
    for (let k = 0; k < l.a.length; k++) if (l.a[k] > 0.5) { soma += l.a[k]; en += Math.abs(l.d[k]); n++; }
    return n ? en / soma : 0;
  }

  // Os anéis de uma marca de raio R: do centro (a partida) até a borda (o fim da travessia), um anel por
  // leitura (28 leituras espalhadas pela contagem e pela travessia). Todos são a mesma estrela, cada um
  // um pouco girado em relação ao de dentro: as pontas, somadas, desenham os braços da espiral.
  //   - A impressão digital (todas as leituras juntas) escolhe a família: quantas pontas (4 a 9), se são
  //     redondas ou finas, onde a estrela é mais pontuda (perto do centro, na borda ou igual em tudo),
  //     quanto a espiral gira e para que lado.
  //   - As leituras uma a uma decidem o resto: onde o sinal mais variou (em relação à própria travessia),
  //     o anel fica mais pontudo e gira mais. Médias de vizinhos deixam a espiral lisa.
  const N_ANEIS = 28, N_MIOLO = 8;
  const PONTAS = [4, 5, 5, 6, 6, 7, 7, 8, 9];
  const PERFIS = ['estrela', 'flor', 'nucleo'];   // igual em tudo; mais pontuda na borda; mais pontuda no centro
  function geometria(r, R) {
    const todas = (r.miolo || []).map((l) => ({ l, tipo: 'miolo' })).concat((r.linhas || []).map((l) => ({ l, tipo: 'travessia' })));
    const aneis = [];
    if (!todas.length) return Object.assign(aneis, { k: 5, agudo: 1, sentido: 1, perfil: 'estrela', torcao: 0 });
    const rnd = aleatorio(assinatura(r));
    const k = PONTAS[Math.floor(rnd() * PONTAS.length)];
    // 1 = pontas redondas; 3 = pontas finas (com muitas pontas, finas demais viram uma teia)
    const agudo = Math.min(1 + rnd() * rnd() * 2.6, k >= 8 ? 1.9 : 3);
    const perfil = PERFIS[Math.floor(rnd() * PERFIS.length)];
    const sentido = rnd() < 0.5 ? -1 : 1;
    // quanto a espiral gira do centro à borda: de 0,6 a 2 pontas inteiras (mais que isso vira uma renda;
    // pontuda na borda, gira menos, senão as pontas de fora se cruzam)
    const torcao = (0.6 + rnd() * 1.4) * (perfil === 'flor' ? 0.75 : 1) * TAU / k;
    let giro = rnd() * TAU;
    // 8 contornos para a contagem (o miolo) e 20 para a travessia, espalhados pelas leituras de cada parte
    const espalhar = (xs, n) => (xs.length ? Array.from({ length: n }, (_, i) => xs[Math.round((i * (xs.length - 1)) / Math.max(1, n - 1))]) : []);
    const mi = todas.filter((x) => x.tipo === 'miolo'), tr = todas.filter((x) => x.tipo === 'travessia');
    const nMi = mi.length ? N_MIOLO : 0;
    const ls = espalhar(mi, nMi).concat(espalhar(tr.length ? tr : mi, N_ANEIS - nMi)), N = ls.length;
    const en = ls.map((x) => energia(x.l)), emax = Math.max(...en, 1e-6);
    const rel = en.map((e) => Math.sqrt(e / emax));      // comprimido: os momentos calmos também contam
    let iPico = 0;
    rel.forEach((q, i) => { if (ls[i].tipo === 'travessia' && q > rel[iPico]) iPico = i; });
    // médias de vizinhos: as pontas andam numa espiral lisa, sem tremer de um anel para o outro
    const media = (xs, m) => xs.map((_, i) => { let a = 0, n = 0; for (let j = Math.max(0, i - m); j <= Math.min(xs.length - 1, i + m); j++) { a += xs[j]; n++; } return a / n; });
    const liso = media(rel, 2), peso = media(rel.map((q) => 0.25 + q), 3);
    const soma = peso.reduce((a, b) => a + b, 0);
    ls.forEach((x, i) => {
      const u = N > 1 ? i / (N - 1) : 1;
      if (i) giro += sentido * torcao * peso[i] / soma;   // a torção, repartida pelas leituras
      const base = perfil === 'flor' ? 0.05 + 0.2 * u : perfil === 'nucleo' ? 0.28 - 0.15 * u : 0.17;
      const amp = base * (0.6 + 0.4 * liso[i]);
      aneis.push({
        raio: R * (0.08 + 0.92 * Math.pow(u, 0.95)) / (1 + 1.4 * amp), amp, giro,   // a ponta mais longa cabe em R
        alfa: 0.3 + 0.7 * Math.pow(u, 0.8), forca: rel[i],
        tipo: r.ok === false && i === N - 1 ? 'deteccao' : i === iPico && x.tipo === 'travessia' ? 'pico' : x.tipo,
      });
    });
    return Object.assign(aneis, { k, agudo, sentido, perfil, torcao });
  }
  // O raio da estrela no ângulo fi (já descontado o giro do anel), em vezes o raio do anel: de 1 - 0,6·amp
  // (no vão) até 1 + 1,4·amp (na ponta). agudo > 1 afina as pontas e alarga os vãos.
  function contorno(fi, k, amp, agudo) {
    return 1 + amp * (2 * Math.pow((1 + Math.cos(k * fi)) / 2, agudo) - 0.6);
  }

  // A animação: os anéis nascem do centro para fora; cada um cresce, desabrocha as pontas e gira até o lugar,
  // enquanto o traço corre em volta (como uma caneta). Pronta, a marca não para: respira, a espiral enrola e
  // desenrola devagar, e de 6 em 6 s um brilho corre do centro até a borda (uma leitura passando).
  const PASSO_ANEL = 0.075, MORFE_S = 0.95, LUZ_S = 6;
  function duracao(r) { return (N_ANEIS - 1) * PASSO_ANEL + MORFE_S; }

  const chega = (x) => 1 - Math.pow(1 - limitar(x), 3);
  const desabrocha = (x) => { x = limitar(x); return 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2); };   // passa um pouco e volta

  // Desenha a marca. o = { fundo, tinta, esp, t }: t em segundos desde o começo da formação (sem t, a marca
  // pronta e parada, como no mural e no cartão).
  function desenhar(c, W, H, r, o = {}) {
    const fundo = o.fundo || '#0B0B0A', tinta = o.tinta || '#EDEDE8', esp = o.esp || 1;
    if (o.limpar !== false) { c.fillStyle = fundo; c.fillRect(0, 0, W, H); }
    if (!valido(r)) return;
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.44;
    const g = geometria(r, R), total = g.length, k = g.k;
    const t = o.t == null ? Infinity : o.t, dur = duracao(r);
    const pronta = t === Infinity ? 0 : Math.max(0, t - dur);
    const vem = limitar(pronta / 2);                     // o movimento de "pronta" entra devagar
    const rot = pronta * 0.04 * g.sentido;
    const passos = R > 150 ? 300 : 180;
    c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = tinta;
    for (let i = 0; i < total; i++) {
      const an = g[i], u = total > 1 ? i / (total - 1) : 1;
      const e = t === Infinity ? 1 : limitar((t - i * PASSO_ANEL) / MORFE_S);
      if (e <= 0) break;
      const raio = an.raio * (0.55 + 0.45 * chega(e));
      const resp = 1 + 0.08 * Math.sin(pronta * 1.2 - i * 0.3) * vem;
      const amp = an.amp * desabrocha(e) * resp;
      const enrola = 0.28 * Math.sin(pronta * 0.55) * u * vem * g.sentido;   // cada anel gira um pouco diferente
      const giro = an.giro + (1 - chega(e)) * 1.3 * g.sentido + rot + enrola;
      const trilha = limitar(e * 1.7);
      const frente = pronta > 0 ? ((pronta % LUZ_S) / 1.8) * 1.3 - 0.15 : -1;
      const luz = Math.exp(-Math.pow(u - frente, 2) / 0.006);
      c.globalAlpha = Math.min(1, an.alfa * limitar(e * 3) + 0.55 * luz);
      c.lineWidth = esp * (an.tipo === 'deteccao' ? 2.6 : an.tipo === 'pico' ? 1.7 : an.tipo === 'miolo' ? 0.8 : 1) * (1 + 0.7 * luz);
      c.beginPath();
      const fim = Math.round(passos * trilha);
      for (let s = 0; s <= fim; s++) {
        const fi = (s / passos) * TAU, th = fi + giro;
        const rr = raio * contorno(fi, k, amp, g.agudo);
        const x = cx + rr * Math.cos(th), y = cy + rr * Math.sin(th);
        if (s) c.lineTo(x, y); else c.moveTo(x, y);
      }
      if (trilha >= 1) c.closePath();
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

  const api = { VERSAO, MAX_ANEIS, MAX_MIOLO, N_ANEIS, registro, valido, assinatura, geometria, contorno, duracao, desenhar, titulo, detalhe, resumo, numero, carimbo, amostrar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.WaveMarca = api;
})(typeof window !== 'undefined' ? window : globalThis);

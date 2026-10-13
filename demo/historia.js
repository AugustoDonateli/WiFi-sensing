/* História "Como funciona": a apresentação em motion design que anda com a rolagem.
 *
 * Ideia central: tudo o que aparece é função de T, um número real. A cena i fica parada em T = i;
 * entre i e i+1, cada camada vai da POSE da cena i para a pose da cena i+1. Rolar para trás desfaz
 * exatamente, como arrastar a agulha da linha do tempo num programa de animação.
 *
 * Poses são ligadas ao id da cena (não à posição), então a versão curta, que pula cenas, continua
 * funcionando. O texto das cenas vem do roteiro.js. Funciona no navegador (window.WaveHistoria) e no
 * Node (só as funções puras, para os testes).
 */
(function (raiz) {
  'use strict';

  /* ================= Funções puras ================= */

  const limitar = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const misturar = (a, b, t) => a + (b - a) * t;
  const janela = (u, a, b) => limitar((u - a) / (b - a));
  const curvas = {
    entra: (t) => 1 - Math.pow(1 - t, 3),                                          // desacelera no fim
    sai: (t) => t * t * t,                                                         // acelera no começo
    suave: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),    // devagar nas duas pontas
  };

  // Mola criticamente amortecida, resolvida de forma exata: não oscila, não explode com dt grande e,
  // se o alvo muda no meio do caminho, a velocidade continua (o movimento não dá tranco).
  function mola(x, v, alvo, dt, omega = 6.5) {
    dt = limitar(dt, 0, 0.05);
    const c1 = x - alvo, c2 = v + omega * c1, e = Math.exp(-omega * dt);
    let nx = alvo + (c1 + c2 * dt) * e;
    let nv = (c2 - omega * (c1 + c2 * dt)) * e;
    if (Math.abs(nx - alvo) < 4e-4 && Math.abs(nv) < 4e-3) { nx = alvo; nv = 0; }
    return [nx, nv];
  }

  // Depois de rolar, para onde encaixar: na direção do movimento, se andou mais que `limiar` da cena.
  function alvoDirecional(alvo, direcao, limiar = 0.12) {
    const base = Math.floor(alvo), frac = alvo - base;
    if (frac < 1e-9) return base;
    if (direcao > 0) return frac > limiar ? base + 1 : base;
    if (direcao < 0) return frac < 1 - limiar ? base : base + 1;
    return Math.round(alvo);
  }

  function ordemDa(cenas, versao, filtro = () => true) {
    return cenas.filter((c) => (versao === 'curta' ? Boolean(c.seg && c.seg.curta) : true) && filtro(c)).map((c) => c.id);
  }

  // Ao trocar de versão, a cena atual pode não existir na outra: vai para a próxima que existe.
  function remapear(id, cenas, versao, filtro) {
    const ordem = ordemDa(cenas, versao, filtro);
    if (ordem.includes(id)) return id;
    const todos = cenas.map((c) => c.id);
    for (let i = Math.max(0, todos.indexOf(id)); i < todos.length; i++) if (ordem.includes(todos[i])) return todos[i];
    return ordem[ordem.length - 1];
  }

  // Progresso (0 a 1) da palavra j de n, dentro da janela [a, b] da transição, com escalonamento.
  function revelacao(u, j, n, a, b, esc = 0.4) {
    const t = janela(u, a, b);
    const atraso = n > 1 ? (j / (n - 1)) * esc : 0;
    return limitar((t - atraso) / (1 - esc));
  }

  // Interpola as poses. Devolve, para cada camada visível, os parâmetros e a presença p (0 a 1).
  // Janelas (u = T − i): saídas em [0,12; 0,55], entradas em [0,40; 0,88], mudanças em [0,15; 0,85].
  // Cada camada pode trocar as janelas na pose de destino: `entrada`, `saida` e `mover` (este também
  // por parâmetro: { x: [a, b], _: [a, b] }).
  // Perto de cada cena inteira (±0,12) nada se mexe.
  function poseEm(T, ordem, poses, padroes) {
    const n = ordem.length;
    const i = Math.max(0, Math.min(Math.floor(T), n - 1));
    const u = i >= n - 1 ? 0 : T - i;
    const A = poses[ordem[i]] || {}, B = poses[ordem[Math.min(i + 1, n - 1)]] || {};
    const k = curvas.suave(janela(u, 0.15, 0.85));
    const saida = { _i: i, _u: u };
    for (const nome of Object.keys(padroes)) {
      const a = A[nome], b = B[nome];
      const pa = a ? (a.p ?? 1) : 0, pb = b ? (b.p ?? 1) : 0;
      if (!pa && !pb) continue;
      const de = { ...padroes[nome], ...(a || b) }, para = { ...padroes[nome], ...(a || {}), ...(b || {}) };
      const mv = b && b.mover;
      const kDe = (chave) => {
        const w = mv && (Array.isArray(mv) ? mv : mv[chave] || mv._);
        return w ? curvas.suave(janela(u, w[0], w[1])) : k;
      };
      const q = {};
      for (const chave of Object.keys(para)) {
        if (chave === 'p' || chave === 'entrada' || chave === 'saida' || chave === 'mover') continue;
        const km = kDe(chave);
        q[chave] = typeof para[chave] === 'number' && typeof de[chave] === 'number' ? misturar(de[chave], para[chave], km) : (km < 0.5 ? de[chave] : para[chave]);
      }
      // quem anda de um lugar para outro (pessoa) precisa saber quanto e em que ponto do caminho está
      q.km = kDe('x');
      q.vx = typeof para.x === 'number' && typeof de.x === 'number' ? para.x - de.x : 0;
      if (pa === pb) { q.p = pa; q.dir = 0; }
      else if (pb > pa) { const [w0, w1] = (b && b.entrada) || [0.4, 0.88]; q.p = misturar(pa, pb, curvas.entra(janela(u, w0, w1))); q.dir = 1; }
      else { const [w0, w1] = (b && b.saida) || [0.12, 0.55]; q.p = misturar(pa, pb, curvas.sai(janela(u, w0, w1))); q.dir = -1; }
      saida[nome] = q;
    }
    return saida;
  }

  /* ---------- Dados de ilustração: o mesmo modelo de canal da simulação, com semente fixa ---------- */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gaussiana(rnd) { const u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  const DF = 312.5e3;
  const CAMINHOS = [[1, 5e-9, 0], [0.55, 22e-9, 1.1], [0.35, 48e-9, 2.3], [0.2, 85e-9, 4.0]];
  const NULAS = new Set([0, 1, 2, 3, 4, 60, 61, 62, 63]);

  function canal(k, am = 0, tau = 30e-9, fase = 0, nre = 0, nim = 0) {
    if (NULAS.has(k)) return 0;
    const f = k - 32;
    let re = nre, im = nim;
    for (const [a, t, ph] of CAMINHOS) { const ang = -2 * Math.PI * f * DF * t + ph; re += a * Math.cos(ang); im += a * Math.sin(ang); }
    if (am) { const ang = -2 * Math.PI * f * DF * tau + fase; re += am * Math.cos(ang); im += am * Math.sin(ang); }
    return 14 * Math.hypot(re, im);
  }

  function perfilParado() {
    const a = new Float64Array(64);
    for (let k = 0; k < 64; k++) a[k] = canal(k);
    return a;
  }

  // Duas sequências com o mesmo ruído: sala parada e alguém andando (am 0,6, como na simulação).
  // Cada leitura é a média de 4 instantes dentro do 0,1 s. Sempre iguais para a mesma semente.
  function sinteticas(semente = 7, n = 480) {
    const rnd = mulberry32(semente);
    const parado = [], mexendo = [];
    let fp = null, fm = null;
    for (let r = 0; r < n; r++) {
      const ap = new Float64Array(64), am = new Float64Array(64);
      for (let k = 0; k < 64; k++) {
        const nre = 0.0065 * gaussiana(rnd), nim = 0.0065 * gaussiana(rnd);
        ap[k] = canal(k, 0, 30e-9, 0, nre, nim);
        let soma = 0;
        for (let s = 0; s < 4; s++) {
          const t = r * 0.1 + s * 0.025;
          soma += canal(k, 0.6, 40e-9 + 25e-9 * Math.sin((2 * Math.PI * t) / 6), 54 * Math.sin((2 * Math.PI * t) / 6), nre, nim);
        }
        am[k] = soma / 4;
      }
      if (!fp) { fp = Float64Array.from(ap); fm = Float64Array.from(am); }
      const dp = new Float64Array(64), dm = new Float64Array(64);
      for (let k = 0; k < 64; k++) {
        dp[k] = ap[k] - fp[k]; fp[k] += 0.05 * (ap[k] - fp[k]);
        dm[k] = am[k] - fm[k]; fm[k] += 0.05 * (am[k] - fm[k]);
      }
      parado.push({ a: ap, d: dp }); mexendo.push({ a: am, d: dm });
    }
    return { parado, mexendo };
  }

  /* ================= Desenho ================= */

  // As linhas empilhadas, no mesmo estilo da tela principal, dentro de um retângulo r.
  // `visiveis` revela de baixo (mais nova) para cima; a linha de cima da revelação entra em fade.
  // `relevo` (0 a 1) achata o desenho; `juntar` (0 a 1) leva todas as linhas para a de baixo.
  function desenharLinhas(c, r, ls, frac, cor, esp, opc = {}) {
    const n = opc.linhas || 48, realce = opc.realce ?? 3, visiveis = opc.visiveis ?? Infinity;
    const juntar = opc.juntar ?? 0;
    const topo = r.y, base = r.y + r.h, passo = (base - topo) / n, altura = passo * (opc.alturaRelevo ?? 9) * (opc.relevo ?? 1);
    const margem = r.w * 0.12, largura = r.w - 2 * margem;
    c.lineJoin = 'round'; c.strokeStyle = cor.tinta; c.fillStyle = cor.fundo;
    const alfa0 = c.globalAlpha;
    for (let i = 0; i < ls.length; i++) {
      const idade = ls.length - 1 - i;
      const mostrar = limitar(visiveis - idade);
      if (mostrar <= 0) continue;
      const y0 = base - (idade + frac) * passo * (1 - juntar);
      if (y0 < topo - passo) continue;
      const { a, d } = ls[i];
      const uteis = [];
      let soma = 0;
      for (let k = 0; k < a.length; k++) if (a[k] > 0.5) { uteis.push(k); soma += a[k]; }
      if (uteis.length < 3) continue;
      const media = soma / uteis.length;
      c.beginPath();
      c.moveTo(r.x, y0); c.lineTo(r.x + margem, y0);
      for (let j = 0; j < uteis.length; j++) {
        const k0 = uteis[Math.max(0, j - 1)], k = uteis[j], k1 = uteis[Math.min(uteis.length - 1, j + 1)];
        const forma = (a[k0] + 2 * a[k] + a[k1]) / 4, tremor = (d[k0] + 2 * d[k] + d[k1]) / 4;
        const relevo = Math.max(0, forma / media - 0.3 + (realce * tremor) / media);
        const borda = Math.sin((Math.PI * (j + 0.5)) / uteis.length);
        c.lineTo(r.x + margem + (largura * (j + 0.5)) / uteis.length, y0 - relevo * altura * borda);
      }
      c.lineTo(r.x + r.w - margem, y0); c.lineTo(r.x + r.w, y0);
      c.globalAlpha = alfa0 * mostrar;
      c.closePath(); c.fill();
      c.lineWidth = opc.destaque && idade === 0 ? esp * 2 : esp;
      c.stroke();
    }
    c.globalAlpha = alfa0;
  }

  // Constantes das cenas (em unidades da caixa do palco: 0 a 1 na horizontal e na vertical).
  const CHAO = 0.8, TAM_PLACA = 0.13, HASTE = 0.2;
  const Y_ANTENA = CHAO - HASTE - TAM_PLACA / 2;               // altura de onde sai o sinal das placas
  const SALA = { x0: 0.03, x1: 0.97, teto: 0.1 };
  const BARRAS = { x0: 0.2, x1: 0.97, base: 0.8, alt: 0.56 };
  const PILHA = { x: 0, y: 0.1, w: 1, h: 0.88 };
  const MEDIDOR = { y: 0.62, h: 0.36 };                        // o número e o gráfico, embaixo das linhas
  const ALTURA_PESSOA = 0.34;

  // Ilustração do número: um ciclo de 24 s que se repete. Sala calma, alguém anda, calma de novo,
  // um tremidinho curto (que fica abaixo do limite) e calma. É só para explicar: os dados são sintéticos.
  const CICLO = 24;
  function agitoNoTempo(t) {
    t = ((t % CICLO) + CICLO) % CICLO;
    const sobe = (a, b) => curvas.suave(janela(t, a, b));
    return 0.22 * (sobe(5, 6.5) - sobe(13, 14.5)) + 0.013 * (sobe(18.4, 18.9) - sobe(19.6, 20.2));
  }

  let cacheSint = null, cachePerfil = null, cacheNumero = null;
  const dadosSint = () => cacheSint || (cacheSint = sinteticas(7, CICLO * 10));
  const perfil = () => cachePerfil || (cachePerfil = perfilParado());
  const ciclico = (i, n) => ((i % n) + n) % n;

  // As 49 leituras de ilustração que terminam no `tempo`. `agito` (0 a 1) mistura a sala parada com
  // alguém andando, começando pelas linhas de baixo (as mais novas); `roteiro` usa a linha do tempo acima.
  function pilhaSint(tempo, agito, roteiro) {
    const { parado, mexendo } = dadosSint(), N = parado.length;
    const pos = tempo / 0.1, fim = Math.floor(pos);
    const ls = [];
    for (let idade = 48; idade >= 0; idade--) {
      const r = fim - idade, i = ciclico(r, N);
      const ag = misturar(limitar(agito * 1.6 - (idade / 47) * 0.6), agitoNoTempo(r * 0.1), roteiro);
      if (ag <= 0) { ls.push(parado[i]); continue; }
      if (ag >= 1) { ls.push(mexendo[i]); continue; }
      const a = new Float64Array(64), d = new Float64Array(64);
      for (let k = 0; k < 64; k++) { a[k] = misturar(parado[i].a[k], mexendo[i].a[k], ag); d[k] = misturar(parado[i].d[k], mexendo[i].d[k], ag); }
      ls.push({ a, d });
    }
    return { ls, frac: pos - fim };
  }

  // O mesmo cálculo da tela de verdade, aplicado à ilustração: o tremor (desvio padrão de cada
  // subportadora em 1 s, médio) a cada 0,2 s, dividido pela média da sala parada; limite = média + 3
  // desvios (no mínimo 1,3×); 3 medidas acima viram "movimento", 5 abaixo voltam a "parado".
  function serieNumero() {
    if (cacheNumero) return cacheNumero;
    const { parado, mexendo } = dadosSint(), N = parado.length;
    const mist = parado.map((p, i) => {
      const ag = agitoNoTempo(i * 0.1), a = new Float64Array(64);
      for (let k = 0; k < 64; k++) a[k] = misturar(p.a[k], mexendo[i].a[k], ag);
      return a;
    });
    const quietas = parado.map((p) => p.a);
    const tremor = (ls, fim) => {
      let soma = 0, cont = 0;
      for (let k = 0; k < 64; k++) {
        let m = 0;
        for (let j = 0; j < 10; j++) m += ls[ciclico(fim - j, N)][k];
        m /= 10;
        if (m < 0.5) continue;
        let v = 0;
        for (let j = 0; j < 10; j++) v += (ls[ciclico(fim - j, N)][k] - m) ** 2;
        soma += Math.sqrt(v / 10); cont++;
      }
      return soma / cont;
    };
    const passos = N / 2, serie = [], calma = [];
    for (let m = 0; m < passos; m++) { serie.push(tremor(mist, 2 * m + 1)); calma.push(tremor(quietas, 2 * m + 1)); }
    const media = calma.reduce((s, x) => s + x, 0) / passos;
    const desvio = Math.sqrt(calma.reduce((s, x) => s + (x - media) ** 2, 0) / passos);
    const lim = Math.max(media + 3 * desvio, media * 1.3) / media;
    const rel = serie.map((v) => v / media), dets = new Array(passos).fill(false);
    let det = false, acima = 0, abaixo = 0;
    for (let volta = 0; volta < 2; volta++) {         // duas voltas: o ciclo se repete, então começa já "aquecido"
      for (let m = 0; m < passos; m++) {
        if (rel[m] > lim) { acima++; abaixo = 0; } else { abaixo++; acima = 0; }
        if (!det && acima >= 3) det = true; else if (det && abaixo >= 5) det = false;
        dets[m] = det;
      }
    }
    return (cacheNumero = { rel, dets, lim });
  }

  // O que o medidor de ilustração mostra no `tempo`: valor atual e os últimos 20 s.
  function medidaSint(tempo) {
    const S = serieNumero(), n = S.rel.length;
    const m = ciclico(tempo, CICLO) / 0.2, i = Math.floor(m);
    const serie = [], dets = [];
    for (let j = 99; j >= 0; j--) { const k = ciclico(i - j, n); serie.push(S.rel[k]); dets.push(S.dets[k]); }
    const ligado = S.dets[ciclico(i, n)];
    return { valor: misturar(S.rel[ciclico(i, n)], S.rel[ciclico(i + 1, n)], m - i), serie, dets, lim: S.lim, ligado, rotulo: ligado ? 'movimento' : 'parado' };
  }

  // As 16 "gravações" da cena do método (5 leituras cada): vazio, parado, andando e queda (forte e depois quieta).
  let cacheGravacoes = null;
  function gravacoes() {
    if (cacheGravacoes) return cacheGravacoes;
    const { parado, mexendo } = dadosSint();
    const AGITO = [[0, 0, 0, 0, 0], [0.04, 0.04, 0.04, 0.04, 0.04], [0.8, 0.8, 0.8, 0.8, 0.8], [0, 0.15, 1, 0.05, 0]];
    cacheGravacoes = AGITO.map((ags, r) => [0, 1, 2, 3].map((s) => ags.map((m, j) => {
      const i = 20 + s * 41 + r * 13 + j, a = new Float64Array(64), d = new Float64Array(64);
      for (let k = 0; k < 64; k++) { a[k] = misturar(parado[i].a[k], mexendo[i].a[k], m); d[k] = misturar(parado[i].d[k], mexendo[i].d[k], m); }
      return { a, d };
    })));
    return cacheGravacoes;
  }

  const fmtX = (x) => `${x < 10 ? x.toFixed(1).replace('.', ',') : Math.round(x)}×`;
  // Progresso linear de uma camada que está entrando (a presença p vem com desaceleração; aqui ela é desfeita).
  const linear = (q) => (q.dir === 1 ? 1 - Math.cbrt(1 - limitar(q.p)) : 1);

  // Pontos da curva nas duas formas: topo das barras (forma 0) e linha mais nova da pilha (forma 1).
  function pontosCurva(G) {
    const a = perfil();
    const uteis = [];
    let soma = 0, max = 0;
    for (let k = 0; k < 64; k++) if (a[k] > 0.5) { uteis.push(k); soma += a[k]; max = Math.max(max, a[k]); }
    const media = soma / uteis.length;
    const passo = (PILHA.h * G.bh) / 48, altura = passo * 9;
    const px = G.X(PILHA.x), pw = PILHA.w * G.bw, margem = pw * 0.12, largura = pw - 2 * margem, py = G.Y(PILHA.y + PILHA.h);
    const barras = [], pilha = [];
    uteis.forEach((k, j) => {
      barras.push([G.X(BARRAS.x0 + ((BARRAS.x1 - BARRAS.x0) * (k + 0.5)) / 64), G.Y(BARRAS.base - (BARRAS.alt * a[k]) / max)]);
      const relevo = Math.max(0, a[k] / media - 0.3) * Math.sin((Math.PI * (j + 0.5)) / uteis.length);
      pilha.push([px + margem + (largura * (j + 0.5)) / uteis.length, py - relevo * altura]);
    });
    return { barras, pilha, px, pw, py, margem };
  }

  function linha(c, x0, y0, x1, y1) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  function tracejado(c, G, sim) { c.setLineDash(sim ? [4 * G.dpr, 5 * G.dpr] : []); }
  function pilula(c, x, y, w, h) {
    const r = h / 2;
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    c.lineTo(x + r, y + h); c.arc(x + r, y + r, r, Math.PI / 2, (3 * Math.PI) / 2); c.closePath();
  }
  function rotulo(c, G, cor, texto, x, y, opc = {}) {
    c.fillStyle = opc.cor || cor.apagado;
    c.font = `${Math.round(Math.max(11 * G.dpr, G.bh * (opc.tam || 0.036)))}px ${G.sans}`;   // no celular, não menor que 11 px
    c.textAlign = opc.alinhar || 'center'; c.textBaseline = opc.base || 'top';
    c.fillText(texto, x, y);
  }

  // Um caminho de vários segmentos: comprimento total e o ponto numa fração dele.
  function trajeto(pts) {
    const segs = [];
    let L = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); L += l; }
    return {
      em(t) {
        let d = limitar(t) * L;
        for (let i = 0; i < segs.length; i++) {
          if (d <= segs[i] || i === segs.length - 1) { const f = segs[i] ? limitar(d / segs[i]) : 0; return [misturar(pts[i][0], pts[i + 1][0], f), misturar(pts[i][1], pts[i + 1][1], f)]; }
          d -= segs[i];
        }
        return pts[pts.length - 1];
      },
      tracar(c, t) {        // desenha só até a fração t, como uma caneta
        let d = limitar(t) * L;
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 0; i < segs.length; i++) {
          if (d >= segs[i]) { c.lineTo(pts[i + 1][0], pts[i + 1][1]); d -= segs[i]; continue; }
          const f = segs[i] ? d / segs[i] : 0;
          c.lineTo(misturar(pts[i][0], pts[i + 1][0], f), misturar(pts[i][1], pts[i + 1][1], f));
          break;
        }
        c.stroke();
      },
    };
  }

  function desenharPlaca(c, G, q, cor, letra) {
    const p = q.p;
    const x = G.X(q.x), yc = G.Y(CHAO), s = G.bh * TAM_PLACA * (q.esc ?? 1);
    const haste = G.bh * HASTE * curvas.entra(janela(p, 0, 0.6));
    const k = curvas.entra(janela(p, 0.35, 1));
    c.globalAlpha = limitar(p * 1.6);
    c.strokeStyle = cor.tinta; c.lineWidth = 1.4 * G.dpr;
    linha(c, x, yc, x, yc - haste);
    if (k <= 0) return;
    const w = s * 0.62 * k, h = s * k, topo = yc - haste - h;
    c.lineWidth = 1.6 * G.dpr;
    c.strokeRect(x - w / 2, topo, w, h);
    // antena em zigue-zague no alto da placa e o "chip" (blindagem) logo abaixo
    c.lineWidth = 1.1 * G.dpr;
    c.beginPath();
    const zx0 = x - w * 0.32, zx1 = x + w * 0.32, zy = topo + h * 0.12, zh = h * 0.1;
    for (let i = 0; i <= 6; i++) { const zx = misturar(zx0, zx1, i / 6); c.lineTo(zx, i % 2 ? zy + zh : zy); }
    c.stroke();
    c.strokeRect(x - w * 0.3, topo + h * 0.36, w * 0.6, h * 0.36);
    c.fillStyle = cor.tinta;
    c.font = `italic ${Math.round(s * 0.55)}px ${G.serif}`;
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText(letra, x, topo - s * 0.22);
  }

  // Pessoa de palitinho com os pés no chão, em x. `deitada` (0 a 1) gira até ficar caída no chão,
  // `fantasma` (0 a 1) vira tracejada, `amp` balança pernas e braços (andando), `halo` abre um vão
  // em volta do traço para o que passa atrás parecer passar atrás. `ergue` levanta um braço com um aparelho.
  function desenharPessoa(c, G, cor, o) {
    const H = G.bh * ALTURA_PESSOA * (o.esc ?? 1), dei = o.deitada || 0, fan = o.fantasma || 0;
    const amp = o.amp || 0, s = Math.sin(o.fase || 0), r = H * 0.075, erg = o.ergue || 0;
    const abre = H * 0.07 * (1 - amp), pe = s * H * 0.17 * amp, mao = s * H * 0.12 * amp;
    // caída, os membros vão para o lado de cima do corpo (depois de girar): um braço passa da cabeça, uma perna dobra
    const mist = (de, para) => [misturar(de[0], para[0], dei), misturar(de[1], para[1], dei)];
    const maoE = mist([misturar(-H * 0.1 * (1 - amp) - mao, -H * 0.24, erg), misturar(-0.43 * H, -0.62 * H, erg)], [H * 0.2, -0.98 * H]);
    const maoD = mist([H * 0.1 * (1 - amp) + mao, -0.43 * H], [H * 0.14, -0.52 * H]);
    const pe1 = mist([-abre + pe, 0], [H * 0.17, -0.06 * H]), pe2 = mist([abre - pe, 0], [H * 0.03, 0]);
    const tracos = [
      [[0, -0.8 * H], [0, -0.44 * H]],
      [[0, -0.44 * H], pe1], [[0, -0.44 * H], pe2],
      [[0, -0.72 * H], maoE], [[0, -0.72 * H], maoD],
    ];
    const cab = [0, -0.88 * H];
    c.save();
    c.translate(G.X(o.x), G.Y(CHAO) - dei * r * 1.15);   // cai girando sobre os pés (a cabeça vai para a esquerda)
    c.rotate((-Math.PI / 2) * dei);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const alfa = o.alfa ?? 1, tinta = o.cor || cor.tinta;
    const tracar = (larg, estilo) => {
      c.lineWidth = larg; c.strokeStyle = estilo;
      c.beginPath();
      for (const [[x0, y0], [x1, y1]] of tracos) { c.moveTo(x0, y0); c.lineTo(x1, y1); }
      c.moveTo(cab[0] + r, cab[1]); c.arc(cab[0], cab[1], r, 0, 2 * Math.PI);
      if (erg > 0.5 && o.aparelho) c.rect(maoE[0] - H * 0.075, maoE[1] - H * 0.11, H * 0.06, H * 0.1);
      c.stroke();
    };
    if (o.halo && fan < 1) {
      c.globalAlpha = alfa * (1 - fan);
      tracar(6 * G.dpr, cor.fundo);
      c.fillStyle = cor.fundo; c.beginPath(); c.arc(cab[0], cab[1], r, 0, 2 * Math.PI); c.fill();
    }
    if (fan < 1) { c.globalAlpha = alfa * (1 - fan); tracar(1.7 * G.dpr, tinta); }
    if (fan > 0) { c.globalAlpha = alfa * fan * 0.75; c.setLineDash([3 * G.dpr, 4 * G.dpr]); tracar(1.4 * G.dpr, tinta); c.setLineDash([]); }
    c.restore();
  }

  // O número grande, "movimento"/"parado" e o gráfico dos últimos 20 s com a linha do limite, como na
  // tela principal. d = { valor, serie (×, do mais antigo ao mais novo), dets, lim, ligado, rotulo }.
  function desenharMedidor(c, G, cor, r, d, alfa, mostra = 1) {
    if (alfa <= 0.001) return;
    const tam = r.h * 0.6;
    c.globalAlpha = alfa; c.fillStyle = cor.tinta;
    c.font = `${Math.round(tam)}px ${G.serif}`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText(Number.isFinite(d.valor) ? fmtX(d.valor) : '–', r.x, r.y + tam * 0.86);
    const ft = Math.round(Math.max(11 * G.dpr, r.h * 0.105)), ly = r.y + r.h * 0.84;
    c.font = `${ft}px ${G.sans}`; c.textBaseline = 'middle';
    if (d.ligado) {
      const w = c.measureText(d.rotulo).width + ft * 1.3;
      pilula(c, r.x, ly - ft * 0.85, w, ft * 1.7); c.fill();
      c.fillStyle = cor.fundo; c.fillText(d.rotulo, r.x + ft * 0.65, ly);
    } else { c.fillStyle = cor.apagado; c.fillText(d.rotulo, r.x, ly); }
    // gráfico: escala de raiz quadrada a partir de 0,6× (a sala vazia fica no meio, um salto grande não achata o resto)
    const gx = r.x + r.w * 0.4, gw = r.w * 0.6, gy = r.y + r.h * 0.06, gh = r.h * 0.86, N = 100;
    const passo = gw / (N - 1), xs = (i, n) => gx + gw - (n - 1 - i) * passo;
    c.strokeStyle = cor.tinta; c.fillStyle = cor.tinta;
    c.globalAlpha = alfa * 0.3; c.fillRect(gx, gy + gh - G.dpr, gw * mostra, G.dpr);
    const s = d.serie || [], n = s.length;
    if (!Number.isFinite(d.lim) || n < 2) return;
    let teto = d.lim * 2.2;
    for (const v of s) teto = Math.max(teto, v * 1.08);
    const PISO = 0.6, y = (v) => gy + gh - G.dpr - Math.sqrt(Math.max(0, v - PISO) / (teto - PISO)) * (gh - 3 * G.dpr);
    c.save();
    c.beginPath(); c.rect(gx - 4 * G.dpr, gy - 4 * G.dpr, (gw + 8 * G.dpr) * mostra, gh + 8 * G.dpr); c.clip();
    c.globalAlpha = alfa * 0.14;
    for (let i = 0; i < n; i++) {
      if (!d.dets[i] || d.dets[i - 1]) continue;
      let f = i; while (f + 1 < n && d.dets[f + 1]) f++;
      c.fillRect(xs(i, n) - passo / 2, gy, xs(f, n) - xs(i, n) + passo, gh);
    }
    c.globalAlpha = alfa * 0.7; c.lineWidth = G.dpr; tracejado(c, G, true);
    linha(c, gx, y(d.lim), gx + gw, y(d.lim)); tracejado(c, G, false);
    c.globalAlpha = alfa; c.lineWidth = 1.8 * G.dpr; c.lineJoin = 'round';
    c.beginPath();
    s.forEach((v, i) => { const px = xs(i, n), py = y(v); i ? c.lineTo(px, py) : c.moveTo(px, py); });
    c.stroke();
    c.restore();
    c.globalAlpha = alfa * mostra;
    rotulo(c, G, cor, 'limite', gx + gw, y(d.lim) - G.bh * 0.012, { alinhar: 'right', base: 'bottom', tam: 0.03 });
  }

  // Piano de 88 teclas (52 brancas) e a sequência de saltos de frequência da cena da Hedy Lamarr.
  const PIANO = (() => {
    const teclas = [];
    let b = 0;
    for (let k = 0; k < 88; k++) {
      const preta = [1, 3, 6, 8, 10].includes((k + 9) % 12);   // a primeira tecla é um lá
      teclas.push({ preta, branca: preta ? b - 1 : b });
      if (!preta) b++;
    }
    return { teclas, brancas: b };
  })();
  const SALTOS = (() => {
    const rnd = mulberry32(1942), s = [];
    while (s.length < 48) { const k = 4 + Math.floor(rnd() * 80); if (!s.length || Math.abs(k - s[s.length - 1]) > 6) s.push(k); }
    return s;
  })();

  // Camadas: ordem de desenho e parâmetros padrão. `sintetica` liga a etiqueta "Ilustração".
  const CAMADAS = {
    sala: { padrao: {} },
    ondas: { padrao: { ox: 0.2, oy: 0.42, cx0: SALA.x0, cx1: SALA.x1, ctopo: SALA.teto, cap: 0, vaza: 0 } },
    casa: { padrao: { cx: 0.8, larg: 0.2, alt: 0.17, tel: 0.09, sino: 0 } },
    chao: { padrao: { x0: 0, x1: 1, cresce: 1 } },
    raios: { padrao: {} },
    pacotes: { padrao: {} },
    roteador: { padrao: { x: 0.2, y: 0.42, prat: -1 } },
    camera: { padrao: { risco: 0 } },
    placaA: { padrao: { x: 0.14, esc: 1 } },
    placaB: { padrao: { x: 0.86, esc: 1 } },
    icones: { padrao: {} },
    vulto: { padrao: { x: 0.86 } },
    pessoa: { padrao: { x: 0.6, esc: 1, deitada: 0, fantasma: 0 } },
    barras: { padrao: {}, sintetica: true },
    pilha: { padrao: { agito: 0, roteiro: 0, py: PILHA.y, ph: PILHA.h, relevo: 1, juntar: 0 }, sintetica: true },
    curva: { padrao: { forma: 0 }, sintetica: true },
    medidor: { padrao: {}, sintetica: true },
    vivo: { padrao: { py: PILHA.y, ph: PILHA.h, med: 0 } },
    grade: { padrao: { agrupar: 1 }, sintetica: true },
    resultado: { padrao: {} },
    teclas: { padrao: {} },
  };
  const PADROES = Object.fromEntries(Object.entries(CAMADAS).map(([k, v]) => [k, v.padrao]));

  // Cada desenho recebe (contexto, geometria, parâmetros da camada, cores, tempo, todas as camadas, extras).
  // q.p é a presença (0 a 1) e q.dir diz se a camada está entrando (1), saindo (−1) ou parada (0).
  const DESENHOS = {
    sala(c, G, q, cor) {
      // paredes e teto: entram subindo dos cantos do chão e se encontram no meio do teto
      const x0 = G.X(SALA.x0), x1 = G.X(SALA.x1), yc = G.Y(CHAO), yt = G.Y(SALA.teto);
      const parede = yc - yt, meio = (x1 - x0) / 2, d = (q.dir === 0 ? 1 : curvas.suave(q.p)) * (parede + meio);
      c.globalAlpha = 0.55 * limitar(q.p * 2); c.strokeStyle = cor.tinta; c.lineWidth = G.dpr;
      for (const [xb, lado] of [[x0, 1], [x1, -1]]) {
        c.beginPath(); c.moveTo(xb, yc);
        if (d <= parede) c.lineTo(xb, yc - d); else { c.lineTo(xb, yt); c.lineTo(xb + lado * (d - parede), yt); }
        c.stroke();
      }
    },
    ondas(c, G, q, cor, amb) {
      // anéis saindo do roteador; dentro da área (sala ou casa) são cheios, fora (vaza) tracejados
      const ox = G.X(q.ox), oy = G.Y(q.oy);
      const x0 = G.X(q.cx0), x1 = G.X(q.cx1), xm = (x0 + x1) / 2, yc = G.Y(CHAO), yt = G.Y(q.ctopo), ya = G.Y(q.ctopo - q.cap);
      const forma = () => { c.moveTo(x0, yc); c.lineTo(x0, yt); c.lineTo(xm, ya); c.lineTo(x1, yt); c.lineTo(x1, yc); c.closePath(); };
      const R = Math.max(...[[x0, ya], [x0, yc], [x1, ya], [x1, yc]].map(([x, y]) => Math.hypot(x - ox, y - oy)));
      const forca = q.dir === 0 ? 1 : q.p;
      const aneis = (Rmax, alfa) => {
        for (let i = 0; i < 6; i++) {
          const f = (amb * 0.2 + i / 6) % 1;
          c.globalAlpha = alfa * Math.pow(1 - f, 1.2);
          c.beginPath(); c.arc(ox, oy, 6 * G.dpr + f * Rmax, 0, 2 * Math.PI); c.stroke();
        }
      };
      c.strokeStyle = cor.tinta; c.lineWidth = 1.2 * G.dpr;
      c.save(); c.beginPath(); forma(); c.clip(); aneis(R, 0.55 * forca); c.restore();
      if (q.vaza > 0.01) {
        c.save();
        c.beginPath(); c.rect(G.X(0), G.Y(0), G.bw, G.bh); forma(); c.clip('evenodd');
        tracejado(c, G, true); aneis(R * 1.5, 0.45 * forca * q.vaza); tracejado(c, G, false);
        c.restore();
      }
    },
    casa(c, G, q, cor) {
      const x0 = G.X(q.cx - q.larg / 2), x1 = G.X(q.cx + q.larg / 2), xm = G.X(q.cx);
      const yc = G.Y(CHAO), yt = G.Y(CHAO - q.alt), ya = G.Y(CHAO - q.alt - q.tel);
      const t = linear(q), parede = yc - yt, telhado = Math.hypot(xm - x0, yt - ya), d = curvas.suave(t) * (parede + telhado);
      c.globalAlpha = q.dir === -1 ? q.p : 1; c.strokeStyle = cor.tinta; c.lineWidth = 1.6 * G.dpr; c.lineJoin = 'round';
      for (const xb of [x0, x1]) {
        c.beginPath(); c.moveTo(xb, yc);
        if (d <= parede) c.lineTo(xb, yc - d);
        else { const f = (d - parede) / telhado; c.lineTo(xb, yt); c.lineTo(misturar(xb, xm, f), misturar(yt, ya, f)); }
        c.stroke();
      }
      if (q.sino > 0.01) {
        // um sino dentro da casa: o alarme
        const s = parede * 0.5, bx = xm, by = misturar(yc, yt, 0.5);
        c.globalAlpha *= q.sino * limitar(t * 2 - 1);
        c.lineWidth = 1.4 * G.dpr;
        c.beginPath();
        c.moveTo(bx - s * 0.5, by + s * 0.3);
        c.quadraticCurveTo(bx - s * 0.42, by - s * 0.55, bx, by - s * 0.55);
        c.quadraticCurveTo(bx + s * 0.42, by - s * 0.55, bx + s * 0.5, by + s * 0.3);
        c.closePath(); c.stroke();
        c.beginPath(); c.arc(bx, by + s * 0.44, s * 0.09, 0, 2 * Math.PI); c.stroke();
      }
    },
    chao(c, G, q, cor) {
      const x0 = G.X(q.x0), x1 = G.X(q.x1), meio = (x0 + x1) / 2;
      const meia = ((x1 - x0) / 2) * (q.dir === 1 ? misturar(1, curvas.entra(q.p), q.cresce) : curvas.entra(q.p));
      c.globalAlpha = Math.min(1, q.p * 1.4) * 0.55;
      c.strokeStyle = cor.tinta; c.lineWidth = G.dpr;
      linha(c, meio - meia, G.Y(CHAO), meio + meia, G.Y(CHAO));
    },
    raios(c, G, q, cor, amb, prm) {
      // os caminhos de A até B: direto, pelo teto, pelo chão e pela pessoa (destacado)
      const A = prm.placaA, B = prm.placaB;
      if (!A || !B) return;
      const ya = G.Y(Y_ANTENA), xa = G.X(A.x), xb = G.X(B.x), xm = (xa + xb) / 2;
      const px = G.X(prm.pessoa ? prm.pessoa.x : 0.66) - 9 * G.dpr, py = G.Y(CHAO - ALTURA_PESSOA * 0.66);
      const lista = [
        { pts: [[xa, ya], [xb, ya]] },
        { pts: [[xa, ya], [xm, G.Y(SALA.teto)], [xb, ya]] },
        { pts: [[xa, ya], [xm, G.Y(CHAO)], [xb, ya]] },
        { pts: [[xa, ya], [px, py], [xb, ya]], forte: true },
      ];
      const t = linear(q), alfa = q.dir === -1 ? q.p : 1;
      c.strokeStyle = cor.tinta; c.fillStyle = cor.tinta; c.lineJoin = 'round'; c.lineCap = 'round';
      lista.forEach((cm, i) => {
        const pk = curvas.suave(limitar(t * 1.9 - i * 0.3));
        if (pk <= 0) return;
        const tr = trajeto(cm.pts);
        c.lineWidth = (cm.forte ? 1.5 : 1.1) * G.dpr;
        c.globalAlpha = alfa * (cm.forte ? 0.9 : 0.42);
        tr.tracar(c, pk);
        if (cm.forte && pk > 0.5) {      // onde o sinal bate na pessoa
          c.globalAlpha = alfa * limitar(pk * 4 - 2);
          c.beginPath(); c.arc(px, py, 4.5 * G.dpr, 0, 2 * Math.PI); c.stroke();
        }
        for (let j = 0; j < 2; j++) {
          const s = (amb * 0.42 + i * 0.27 + j * 0.5) % 1;
          if (s > pk) continue;
          const [x, y] = tr.em(s);
          c.globalAlpha = alfa * Math.pow(Math.sin(Math.PI * s), 0.7) * (cm.forte ? 1 : 0.75);
          c.beginPath(); c.arc(x, y, (cm.forte ? 2.8 : 2.1) * G.dpr, 0, 2 * Math.PI); c.fill();
        }
      });
      c.lineCap = 'butt';
    },
    pacotes(c, G, q, cor, amb, prm) {
      const A = prm.placaA, B = prm.placaB;
      if (!A || !B) return;
      const s = G.bh * TAM_PLACA, y = G.Y(Y_ANTENA);
      const xa = G.X(A.x) + s * 0.45, xb = G.X(B.x) - s * 0.45;
      const vis = curvas.entra(q.p);
      c.fillStyle = cor.tinta;
      // pacotes: pontinhos indo de A para B (é um símbolo: 100 por segundo não daria para ver)
      const N = 11, fase = (amb * 0.18) % 1;
      for (let i = 0; i < N; i++) {
        const t = (i / N + fase) % 1;
        if (t > vis) continue;
        c.globalAlpha = Math.pow(Math.sin(Math.PI * t), 0.8) * Math.min(1, q.p * 1.5);
        c.beginPath(); c.arc(misturar(xa, xb, t), y, 2.2 * G.dpr, 0, 2 * Math.PI); c.fill();
      }
      // arcos que saem da placa A
      c.strokeStyle = cor.tinta; c.lineWidth = 1.1 * G.dpr;
      for (let i = 0; i < 3; i++) {
        const t = (amb * 0.45 + i / 3) % 1;
        c.globalAlpha = (1 - t) * 0.6 * q.p;
        c.beginPath(); c.arc(G.X(A.x), y, s * (0.55 + t * 1.6), -0.55, 0.55); c.stroke();
      }
    },
    roteador(c, G, q, cor) {
      const s = G.bh * 0.085, x = G.X(q.x), y = G.Y(q.y);
      const k = q.dir === 1 ? curvas.entra(q.p) : 1;
      const alfa = limitar(q.p * 1.5), w = s * 1.7 * k, h = s * 0.6 * k;
      c.strokeStyle = cor.tinta; c.lineJoin = 'round';
      if (q.prat >= 0) {      // prateleira presa na parede
        const xp = G.X(q.prat), yp = y + h / 2 + 1.5 * G.dpr;
        c.globalAlpha = alfa * 0.6; c.lineWidth = G.dpr;
        linha(c, xp, yp, misturar(xp, x + Math.sign(x - xp) * w * 0.7, k), yp);
      }
      c.globalAlpha = alfa; c.lineWidth = 1.5 * G.dpr;
      c.strokeRect(x - w / 2, y - h / 2, w, h);
      linha(c, x - w * 0.3, y - h / 2, x - w * 0.42, y - h / 2 - s * 0.9 * k);
      linha(c, x + w * 0.3, y - h / 2, x + w * 0.42, y - h / 2 - s * 0.9 * k);
      c.fillStyle = cor.tinta;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x - w * 0.24 + i * w * 0.12, y, 1.6 * G.dpr, 0, 2 * Math.PI); c.fill(); }
    },
    camera(c, G, q, cor) {
      // câmera no canto do teto, olhando a pessoa; no fim da entrada ela é riscada
      const t = linear(q), alfa = q.dir === -1 ? q.p : limitar(t * 2.5);
      const s = G.bh * 0.07, x = G.X(0.85), y = G.Y(SALA.teto + 0.1);
      const ang = Math.atan2(G.Y(0.72) - y, G.X(0.46) - x);
      const risco = q.risco * (q.dir === 1 ? curvas.suave(janela(t, 0.5, 0.95)) : 1);
      c.globalAlpha = alfa; c.strokeStyle = cor.tinta; c.lineWidth = 1.5 * G.dpr; c.lineJoin = 'round';
      linha(c, G.X(SALA.x1), y - s * 0.55, x + s * 0.35, y - s * 0.55);
      linha(c, x + s * 0.35, y - s * 0.55, x + s * 0.2, y - s * 0.2);
      c.save(); c.translate(x, y); c.rotate(ang);
      c.strokeRect(-s * 0.9, -s * 0.36, s * 1.4, s * 0.72);
      c.beginPath(); c.moveTo(s * 0.5, -s * 0.22); c.lineTo(s * 0.85, -s * 0.36); c.lineTo(s * 0.85, s * 0.36); c.lineTo(s * 0.5, s * 0.22); c.stroke();
      c.restore();
      // o campo de visão (tracejado) some quando a câmera é riscada
      const xl = x + Math.cos(ang) * s * 0.85, yl = y + Math.sin(ang) * s * 0.85;
      c.globalAlpha = alfa * 0.4 * (1 - risco); c.lineWidth = G.dpr; tracejado(c, G, true);
      linha(c, xl, yl, G.X(0.2), G.Y(CHAO)); linha(c, xl, yl, G.X(0.68), G.Y(CHAO));
      tracejado(c, G, false);
      if (risco > 0) {
        const R = s * 1.35, a0 = -Math.PI * 0.75;
        c.globalAlpha = alfa; c.lineWidth = 1.8 * G.dpr;
        c.beginPath(); c.arc(x, y, R, a0, a0 + 2 * Math.PI * limitar(risco * 1.6)); c.stroke();
        const dd = limitar(risco * 2.5 - 1.5);
        if (dd > 0) { const x0 = x + R * Math.cos(a0), y0 = y + R * Math.sin(a0); linha(c, x0, y0, misturar(x0, 2 * x - x0, dd), misturar(y0, 2 * y - y0, dd)); }
      }
    },
    placaA(c, G, q, cor) { desenharPlaca(c, G, q, cor, 'A'); },
    placaB(c, G, q, cor) { desenharPlaca(c, G, q, cor, 'B'); },
    icones(c, G, q, cor) {
      // a luminária (luz que apaga sozinha) e os nomes dos três usos
      const t = linear(q), alfa = q.dir === -1 ? q.p : limitar(t * 2);
      const x = G.X(0.5), yc = G.Y(CHAO), yt = G.Y(0.5), s = G.bh * 0.05, k = curvas.entra(t);
      c.globalAlpha = alfa; c.strokeStyle = cor.tinta; c.lineWidth = 1.6 * G.dpr; c.lineJoin = 'round';
      linha(c, x, yc, x, misturar(yc, yt, k));
      linha(c, x - s * 0.7, yc, x + s * 0.7, yc);
      const kk = janela(k, 0.6, 1);
      if (kk > 0) {
        c.globalAlpha = alfa * kk;
        c.beginPath(); c.moveTo(x - s * 0.55, yt - s * 0.9); c.lineTo(x + s * 0.55, yt - s * 0.9); c.lineTo(x + s, yt); c.lineTo(x - s, yt); c.closePath(); c.stroke();
        c.globalAlpha = alfa * kk * 0.4; c.lineWidth = G.dpr; tracejado(c, G, true);
        linha(c, x - s, yt, x - s * 2.6, yc); linha(c, x + s, yt, x + s * 2.6, yc);
        tracejado(c, G, false);
      }
      c.globalAlpha = alfa * limitar(t * 2 - 0.8);
      for (const [u, txt] of [[0.2, 'queda'], [0.5, 'luz'], [0.8, 'alarme']]) rotulo(c, G, cor, txt, G.X(u), G.Y(CHAO + 0.045));
    },
    vulto(c, G, q, cor, amb) {
      // alguém do lado de fora, com um aparelho na mão
      const t = linear(q);
      desenharPessoa(c, G, cor, {
        x: q.x + (q.dir === 1 ? (1 - curvas.entra(t)) * 0.12 : 0), alfa: q.dir === -1 ? q.p : limitar(t * 2.5),
        amp: q.dir === 1 ? limitar((1 - t) * 2.5) : 0, fase: amb * 7, cor: cor.apagado, ergue: curvas.suave(janela(t, 0.6, 1)), aparelho: true,
      });
    },
    pessoa(c, G, q, cor, amb) {
      // entrando, ela chega andando pela direita; se muda de lugar entre cenas, anda até lá
      const t = linear(q);
      let x = q.x, amp = 0, alfa = 1, fan = q.fantasma;
      let dei = q.deitada;
      if (q.dir === 1) {
        x += (1 - curvas.entra(t)) * 0.3; amp = limitar((1 - t) * 2.5); alfa = limitar(t * 3);
        fan *= janela(t, 0.75, 1); dei *= curvas.sai(janela(t, 0.62, 0.9));     // entra andando; se a pose é caída, cai no fim
      } else if (q.dir === -1) alfa = q.p;
      if (q.vx) amp = Math.max(amp, limitar(Math.abs(q.vx) * 8) * Math.sin(Math.PI * limitar(q.km)));
      desenharPessoa(c, G, cor, { x, esc: q.esc, deitada: dei, fantasma: fan, alfa, amp, fase: amb * 7, halo: true });
    },
    barras(c, G, q, cor, amb, prm) {
      const a = perfil();
      let max = 0;
      for (let k = 0; k < 64; k++) max = Math.max(max, a[k]);
      const largura = ((BARRAS.x1 - BARRAS.x0) * G.bw) / 64;
      const origem = G.X(prm.placaB ? prm.placaB.x : 0.07), base = G.Y(BARRAS.base);
      c.strokeStyle = cor.tinta; c.fillStyle = cor.tinta;
      c.lineWidth = Math.max(G.dpr, largura * 0.34); c.lineCap = 'butt';
      for (let k = 0; k < 64; k++) {
        // entrando: cada barra sai da placa B e cresce, da esquerda para a direita; saindo: só apaga
        const pk = q.dir === 1 ? curvas.entra(limitar(q.p * 1.6 - (k / 63) * 0.6)) : 1;
        if (pk <= 0) continue;
        c.globalAlpha = q.dir === -1 ? q.p : Math.min(1, pk * 1.4);
        const x = misturar(origem, G.X(BARRAS.x0) + largura * (k + 0.5), pk);
        if (NULAS.has(k)) { c.beginPath(); c.arc(x, base, 1.4 * G.dpr, 0, 2 * Math.PI); c.globalAlpha *= 0.45; c.fill(); continue; }
        const h = ((BARRAS.alt * G.bh * a[k]) / max) * pk * (1 + 0.018 * Math.sin(amb * 1.7 + k * 0.9));
        linha(c, x, base, x, base - h);
      }
    },
    pilha(c, G, q, cor, amb) {
      const { ls, frac } = pilhaSint(amb, q.agito, q.roteiro);
      c.globalAlpha = q.dir === -1 ? q.p : 1;
      const r = { x: G.X(0), y: G.Y(q.py), w: G.bw, h: q.ph * G.bh };
      desenharLinhas(c, r, ls, frac, cor, 1.4 * G.dpr, { visiveis: q.dir === 1 ? q.p * 50 : Infinity, destaque: true, relevo: q.relevo, juntar: q.juntar });
    },
    curva(c, G, q, cor) {
      const pts = pontosCurva(G);
      const f = curvas.suave(limitar(q.forma));
      const P = pts.barras.map(([x, y], j) => [misturar(x, pts.pilha[j][0], f), misturar(y, pts.pilha[j][1], f)]);
      // entrando: a curva é "desenhada" da esquerda para a direita, como uma caneta
      const m = q.dir === 1 ? curvas.suave(q.p) : 1;
      const ultimo = Math.max(1, Math.floor(m * (P.length - 1)));
      c.globalAlpha = q.dir === -1 ? q.p : 1;
      c.strokeStyle = cor.tinta; c.lineJoin = 'round'; c.lineCap = 'round';
      c.lineWidth = misturar(2, 2.8, f) * G.dpr;
      c.beginPath();
      const b0 = pts.barras[0], b1 = pts.barras[P.length - 1];
      if (f > 0) { c.moveTo(misturar(b0[0], pts.px, f), misturar(b0[1], pts.py, f)); c.lineTo(misturar(b0[0], pts.px + pts.margem, f), misturar(b0[1], pts.py, f)); }
      else c.moveTo(P[0][0], P[0][1]);
      for (let j = 0; j <= ultimo; j++) c.lineTo(P[j][0], P[j][1]);
      if (f > 0 && ultimo === P.length - 1) {
        c.lineTo(misturar(b1[0], pts.px + pts.pw - pts.margem, f), misturar(b1[1], pts.py, f));
        c.lineTo(misturar(b1[0], pts.px + pts.pw, f), misturar(b1[1], pts.py, f));
      }
      c.stroke();
      c.lineCap = 'butt';
    },
    medidor(c, G, q, cor, amb) {
      const t = linear(q);
      const r = { x: G.X(0), y: G.Y(MEDIDOR.y), w: G.bw, h: MEDIDOR.h * G.bh };
      desenharMedidor(c, G, cor, r, medidaSint(amb), q.dir === -1 ? q.p : limitar(t * 2), q.dir === 1 ? curvas.suave(t) : 1);
    },
    vivo(c, G, q, cor, amb, prm, ex) {
      // as linhas e o número da tela de verdade; sem fonte ligada, volta para a ilustração (e a etiqueta avisa)
      const dv = ex.vivo, real = ex.vivoReal;
      const alfa = q.dir === -1 ? q.p : 1;
      const { ls, frac } = real ? { ls: dv.leituras.slice(-49), frac: limitar(dv.frac || 0) } : pilhaSint(amb, 0, 1);
      c.globalAlpha = alfa;
      desenharLinhas(c, { x: G.X(0), y: G.Y(q.py), w: G.bw, h: q.ph * G.bh }, ls, frac, cor, 1.4 * G.dpr, { visiveis: q.dir === 1 ? q.p * 50 : Infinity, destaque: true });
      if (q.med <= 0.01) return;
      let d;
      if (real) {
        const ok = Boolean(dv.base) && !dv.calibrando;
        const alvo = ok && Number.isFinite(dv.osc) ? dv.osc / dv.base : NaN;
        ex.suave.v = !Number.isFinite(alvo) ? NaN : Number.isFinite(ex.suave.v) ? ex.suave.v + (alvo - ex.suave.v) * 0.18 : alvo;
        d = {
          valor: ex.suave.v, serie: ok ? (dv.historico || []).slice(-100).map((v) => v / dv.base) : [], dets: (dv.historicoDet || []).slice(-100),
          lim: ok && dv.limiar ? dv.limiar / dv.base : NaN, ligado: Boolean(dv.detectado) && !dv.calibrando,
          rotulo: dv.calibrando ? 'calibrando' : dv.limiar == null ? 'sem calibrar' : dv.detectado ? 'movimento' : 'parado',
        };
      } else d = medidaSint(amb);
      desenharMedidor(c, G, cor, { x: G.X(0), y: G.Y(MEDIDOR.y), w: G.bw, h: MEDIDOR.h * G.bh }, d, alfa * q.med * (q.dir === 1 ? limitar(q.p * 2 - 1) : 1));
    },
    grade(c, G, q, cor) {
      // as gravações: 4 situações × 4 sessões. Cheias ajustam o limite, tracejadas só testam.
      const t = linear(q), alfa = q.dir === -1 ? q.p : 1;
      const ag = curvas.suave(janela(t, 0.62, 1)) * q.agrupar;
      const ANTES = [0.2, 0.4, 0.6, 0.8], DEPOIS = [0.2, 0.63, 0.39, 0.82], w = 0.17, h = 0.13;
      ['vazio', 'parado', 'andando', 'queda'].forEach((nome, r) => {
        const y = 0.2 + r * 0.17;
        c.globalAlpha = alfa * limitar(t * 3 - r * 0.3);
        rotulo(c, G, cor, nome, G.X(0), G.Y(y + h / 2), { alinhar: 'left', base: 'middle' });
        for (let s = 0; s < 4; s++) {
          const pk = curvas.entra(limitar(t * 2.4 - (s * 0.2 + r * 0.08)));
          if (pk <= 0) continue;
          // as sessões 2 e 3 trocam de lugar como cartas: uma passa por cima, a outra por baixo, meio apagadas
          const troca = s === 1 || s === 2 ? Math.sin(Math.PI * ag) : 0;
          const rx = G.X(misturar(ANTES[s], DEPOIS[s], ag)), rw = w * G.bw, rh = h * G.bh;
          const ry = G.Y(y) + (1 - pk) * G.bh * 0.03 + (s === 1 ? 1 : -1) * troca * G.bh * 0.022;
          c.globalAlpha = alfa * pk * (1 - 0.55 * troca); c.strokeStyle = cor.tinta; c.lineWidth = 1.2 * G.dpr;
          tracejado(c, G, s % 2 === 1); c.strokeRect(rx, ry, rw, rh); tracejado(c, G, false);
          desenharLinhas(c, { x: rx + rw * 0.04, y: ry + rh * 0.2, w: rw * 0.92, h: rh * 0.72 }, gravacoes()[r][s], 0, cor, G.dpr, { linhas: 5, alturaRelevo: 2.4 });
        }
      });
      c.globalAlpha = alfa * ag;
      rotulo(c, G, cor, 'ajustam o limite', G.X(0.2 + (0.39 + w - 0.2) / 2), G.Y(0.12), { cor: cor.tinta, base: 'alphabetic' });
      rotulo(c, G, cor, 'só testam', G.X(0.63 + (0.82 + w - 0.63) / 2), G.Y(0.12), { cor: cor.tinta, base: 'alphabetic' });
    },
    resultado(c, G, q, cor, amb, prm, ex) {
      // acerto do sistema ao lado do chute; sem números ainda, só os contornos com "?"
      const R = ex.resultados, tem = R && typeof R.acerto === 'number' && typeof R.chute === 'number';
      const t = linear(q), alfa = q.dir === -1 ? q.p : limitar(t * 2.5);
      const base = G.Y(CHAO), alt = G.bh * 0.58, w = G.bw * 0.2;
      c.globalAlpha = alfa * 0.55; c.strokeStyle = cor.tinta; c.lineWidth = G.dpr;
      linha(c, G.X(0.18), base, G.X(0.94), base);
      [{ u: 0.28, v: tem ? R.acerto : null, nome: 'Wave Sense' }, { u: 0.64, v: tem ? R.chute : null, nome: 'chute' }].forEach((b, i) => {
        const pk = curvas.entra(limitar(t * 1.8 - i * 0.3));
        const x = G.X(b.u), h = (b.v === null ? 0.55 : b.v) * alt * pk;
        c.globalAlpha = alfa;
        rotulo(c, G, cor, b.nome, x + w / 2, base + G.bh * 0.03);
        c.strokeStyle = cor.tinta; c.fillStyle = cor.tinta; c.lineWidth = 1.4 * G.dpr;
        if (b.v === null) {
          c.globalAlpha = alfa * 0.7; tracejado(c, G, true); c.strokeRect(x, base - h, w, h); tracejado(c, G, false);
          c.globalAlpha = alfa * pk * 0.7; c.font = `${Math.round(G.bh * 0.13)}px ${G.serif}`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText('?', x + w / 2, base - h / 2);
        } else {
          if (i === 0) c.fillRect(x, base - h, w, h); else c.strokeRect(x, base - h, w, h);
          c.globalAlpha = alfa * limitar(pk * 2 - 1); c.font = `${Math.round(G.bh * 0.1)}px ${G.serif}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
          c.fillText(`${Math.round(b.v * 100)}%`, x + w / 2, base - h - G.bh * 0.02);
        }
      });
    },
    teclas(c, G, q, cor, amb) {
      // 88 teclas e um rolo de pianola: cada furo desce e acende uma tecla, pulando de frequência
      const t = linear(q), alfa = q.dir === -1 ? q.p : 1;
      const x0 = G.X(0), wb = G.bw / PIANO.brancas, ytec = G.Y(0.6), hb = G.bh * 0.22, hp = hb * 0.62, wp = wb * 0.62;
      const cx = (k) => { const tk = PIANO.teclas[k]; return x0 + (tk.preta ? tk.branca + 1 : tk.branca + 0.5) * wb; };
      const RITMO = 4, agora = amb * RITMO, n = SALTOS.length, i0 = Math.floor(agora), fr = agora - i0;
      const brilho = new Float32Array(88);
      for (let j = 0; j < 4; j++) { const k = SALTOS[ciclico(i0 - j, n)]; brilho[k] = Math.max(brilho[k], j === 0 ? 1 : 0.55 * Math.pow(0.4, j - 1 + fr)); }
      const surge = (k) => curvas.entra(limitar(t * 1.8 - (PIANO.teclas[k].branca / (PIANO.brancas - 1)) * 0.8));
      c.strokeStyle = cor.tinta; c.lineWidth = G.dpr;
      for (const preta of [false, true]) {
        for (let k = 0; k < 88; k++) {
          const tk = PIANO.teclas[k];
          if (tk.preta !== preta) continue;
          const pk = surge(k);
          if (pk <= 0) continue;
          const x = preta ? cx(k) - wp / 2 : x0 + tk.branca * wb, ww = preta ? wp : wb, hh = (preta ? hp : hb) * pk;
          if (preta) { c.globalAlpha = alfa * pk; c.fillStyle = cor.fundo; c.fillRect(x, ytec, ww, hh); }
          c.globalAlpha = alfa * pk * 0.7; c.strokeRect(x, ytec, ww, hh);
          if (brilho[k] > 0.01) { c.globalAlpha = alfa * pk * brilho[k]; c.fillStyle = cor.tinta; c.fillRect(x, ytec, ww, hh); }
        }
      }
      // o rolo: furos descendo até o teclado
      const QUEDA = 2.2, yTopo = G.Y(0.06), vel = (ytec - yTopo) / QUEDA, comp = (0.8 / RITMO) * vel;
      c.globalAlpha = alfa * 0.25 * limitar(t * 2 - 0.5);
      linha(c, x0, yTopo, x0, ytec); linha(c, x0 + G.bw, yTopo, x0 + G.bw, ytec);
      c.fillStyle = cor.tinta;
      for (let i = i0 - 1; i <= i0 + QUEDA * RITMO + 1; i++) {
        const k = SALTOS[ciclico(i, n)], yb = ytec - (i / RITMO - amb) * vel;
        const a = Math.max(yb - comp, yTopo), b = Math.min(yb, ytec);
        if (b <= a) continue;
        const largura = (PIANO.teclas[k].preta ? wp : wb) * 0.7;
        c.globalAlpha = alfa * 0.85 * limitar(t * 2 - 0.6) * limitar((a - yTopo) / (G.bh * 0.06) + 0.2);
        c.fillRect(cx(k) - largura / 2, a, largura, b - a);
      }
    },
  };

  // Poses de cada cena (por id). Camada ausente = invisível. `entrada`/`saida` mudam a janela daquela
  // camada; `mover` muda a janela das mudanças (uma lista [a, b] ou uma por parâmetro: { x: [a, b], _: [a, b] }).
  const PILHA_VIRA_CHAO = { p: 0, relevo: 0, juntar: 1, py: CHAO - PILHA.h, mover: [0.04, 0.42], saida: [0.36, 0.5] };
  const POSES = {
    abertura: {
      pilha: { roteiro: 1 },
    },
    pergunta: {
      pilha: PILHA_VIRA_CHAO,
      chao: { cresce: 0, entrada: [0.38, 0.5] },
      sala: { entrada: [0.46, 0.86] },
      pessoa: { x: 0.62, deitada: 1, entrada: [0.4, 0.88] },
      camera: { risco: 1, entrada: [0.4, 0.88] },
    },
    wifi: {
      pilha: PILHA_VIRA_CHAO,
      chao: { cresce: 0, entrada: [0.38, 0.5] },
      sala: { entrada: [0.46, 0.86] },
      pessoa: { x: 0.62, deitada: 0, entrada: [0.5, 0.88], mover: { deitada: [0.2, 0.6] } },
      camera: { p: 0, risco: 1, saida: [0.06, 0.36] },
      roteador: { x: 0.2, y: 0.42, prat: SALA.x0, entrada: [0.3, 0.7] },
      ondas: { ox: 0.2, oy: 0.42, entrada: [0.45, 0.88] },
    },
    placas: {
      chao: {},
      sala: { p: 0, saida: [0.1, 0.5] },
      pessoa: { p: 0, x: 0.62, saida: [0.04, 0.36] },
      roteador: { p: 0, x: 0.14, y: Y_ANTENA, prat: SALA.x0, mover: [0.08, 0.5], saida: [0.38, 0.62] },
      ondas: { p: 0, ox: 0.14, oy: Y_ANTENA, mover: [0.08, 0.5], saida: [0.2, 0.55] },
      placaA: { x: 0.14, entrada: [0.4, 0.88] },
      placaB: { x: 0.86 },
      pacotes: { entrada: [0.55, 0.88] },
    },
    caminhos: {
      chao: {},
      placaA: { x: 0.14 },
      placaB: { x: 0.86 },
      pacotes: { p: 0, saida: [0.04, 0.3] },
      sala: { entrada: [0.3, 0.7] },
      pessoa: { x: 0.66, entrada: [0.34, 0.8] },
      raios: { entrada: [0.4, 0.88] },
    },
    acorde: {
      chao: {},
      sala: { p: 0, saida: [0.04, 0.3] },
      raios: { p: 0, saida: [0.02, 0.22] },
      pessoa: { p: 0, x: 0.66, saida: [0.02, 0.26] },
      placaA: { p: 0, x: 0.02, saida: [0.06, 0.32], mover: [0.06, 0.32] },
      placaB: { x: 0.07, esc: 1.1, mover: [0.1, 0.5] },
      pacotes: { p: 0, saida: [0.04, 0.28] },
      barras: { entrada: [0.44, 0.9] },
      curva: { forma: 0, entrada: [0.62, 0.9] },
    },
    linhas: {
      chao: { p: 0 },
      sala: { p: 0, saida: [0.04, 0.34] },
      raios: { p: 0, saida: [0.02, 0.24] },
      pessoa: { p: 0, x: 0.66, saida: [0.02, 0.28] },
      placaA: { p: 0, x: 0.14, saida: [0.06, 0.36] },
      placaB: { p: 0, x: 0.07, esc: 1.1, saida: [0.1, 0.4] },
      barras: { p: 0, saida: [0.12, 0.45] },
      curva: { p: 0, forma: 1, saida: [0.7, 0.92] },
      pilha: { agito: 0, entrada: [0.5, 0.9] },
    },
    tremor: {
      pilha: { agito: 1 },
    },
    numero: {
      pilha: { agito: 1, roteiro: 1, py: 0.02, ph: 0.52, mover: [0.08, 0.6] },
      medidor: { entrada: [0.55, 0.88] },
    },
    aovivo: {
      pilha: { p: 0, agito: 1, roteiro: 1, py: 0.02, ph: 0.52, saida: [0.15, 0.55] },
      medidor: { p: 0, saida: [0.12, 0.5] },
      vivo: { py: 0.02, ph: 0.52, med: 1, entrada: [0.35, 0.86] },
    },
    metodo: {
      grade: { entrada: [0.3, 0.88] },
    },
    resultados: {
      resultado: { entrada: [0.4, 0.88] },
    },
    parado: {
      chao: {},
      placaA: { x: 0.14 },
      placaB: { x: 0.86 },
      pacotes: {},
      pessoa: { x: 0.5, fantasma: 1, entrada: [0.45, 0.88] },
    },
    usos: {
      chao: {},
      placaA: { p: 0, x: 0.14, saida: [0.06, 0.36] },
      placaB: { p: 0, x: 0.86, saida: [0.06, 0.36] },
      pacotes: { p: 0, saida: [0.04, 0.3] },
      pessoa: { x: 0.33, fantasma: 0, deitada: 1, esc: 0.8, mover: { x: [0.1, 0.5], fantasma: [0.1, 0.4], esc: [0.3, 0.6], deitada: [0.5, 0.8] } },
      icones: { entrada: [0.5, 0.88] },
      casa: { cx: 0.8, larg: 0.2, alt: 0.17, tel: 0.09, sino: 1, entrada: [0.45, 0.88] },
    },
    privacidade: {
      chao: {},
      icones: { p: 0, saida: [0.04, 0.3] },
      casa: { cx: 0.38, larg: 0.56, alt: 0.4, tel: 0.16, sino: 0, mover: { _: [0.12, 0.6], sino: [0.04, 0.24] } },
      pessoa: { x: 0.28, deitada: 0, esc: 1, fantasma: 0, mover: { _: [0.2, 0.6], deitada: [0.1, 0.42] } },
      roteador: { x: 0.52, y: 0.5, prat: 0.66, entrada: [0.5, 0.8] },
      ondas: { ox: 0.52, oy: 0.5, cx0: 0.1, cx1: 0.66, ctopo: 0.4, cap: 0.16, vaza: 1, entrada: [0.55, 0.88] },
      vulto: { x: 0.86, entrada: [0.5, 0.88] },
    },
    lamarr: {
      teclas: { entrada: [0.4, 0.88] },
    },
    fim: {
      vivo: { py: PILHA.y, ph: PILHA.h, med: 0, entrada: [0.4, 0.88] },
    },
  };

  /* ================= O palco ================= */

  const CSS = `
.historia { position: fixed; inset: 0; z-index: 6; overflow: hidden; touch-action: none; overscroll-behavior: none; outline: none;
  --h-fundo: #0B0B0A; --h-tinta: #EDEDE8; --h-apagado: #8A8A84; --h-seguro: 0px;
  --h-margem: clamp(16px, 4vw, 64px); --h-margem-b: clamp(56px, 9vh, 120px);
  background: var(--h-fundo); color: var(--h-tinta); font-family: var(--sans, "Geist", system-ui, sans-serif); user-select: none; -webkit-user-select: none; }
.historia[hidden] { display: none !important; }
.historia.miniatura { position: relative; inset: auto; z-index: auto; width: 100%; aspect-ratio: 16 / 9; height: auto; --h-margem: 4%; --h-margem-b: 9%; }
.h-palco { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.h-textos { position: absolute; left: calc(var(--h-margem) + var(--h-seguro)); bottom: calc(var(--h-margem-b) + var(--h-seguro)); width: min(38vw, 760px); pointer-events: none; }
.h-texto { position: absolute; left: 0; bottom: 0; width: 100%; visibility: hidden; }
.h-titulo { font-family: var(--serif, "Instrument Serif", Georgia, serif); font-weight: 400; font-size: clamp(38px, 4.3vw, 92px); line-height: 1.0; letter-spacing: -0.012em; margin: 0 0 0.45em; text-wrap: balance; }
.h-frase { margin: 0; font-size: clamp(16px, 1.25vw, 24px); line-height: 1.4; color: var(--h-apagado); max-width: 36ch; text-wrap: pretty; }
.h-m { display: inline-block; overflow: hidden; vertical-align: bottom; padding: 0.12em 0.05em 0.22em; margin: -0.12em -0.05em -0.22em; }
.h-p { display: inline-block; will-change: transform; }
.h-topo { position: absolute; top: calc(clamp(16px, 3vw, 40px) + var(--h-seguro)); left: calc(var(--h-margem) + var(--h-seguro)); right: calc(var(--h-margem) + var(--h-seguro));
  display: flex; justify-content: space-between; font-family: var(--mono, "Geist Mono", monospace); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--h-apagado); pointer-events: none; }
.h-ilustra { opacity: 0; }
.h-progresso { position: absolute; left: calc(var(--h-margem) + var(--h-seguro)); right: calc(var(--h-margem) + var(--h-seguro)); bottom: calc(clamp(18px, 3vh, 32px) + var(--h-seguro)); height: 1px; background: rgba(138, 138, 132, 0.28); pointer-events: none; }
.h-progresso i { display: block; height: 100%; background: var(--h-tinta); transform-origin: 0 50%; transform: scaleX(0); }
.h-cortina { position: absolute; inset: 0; background: #000; opacity: 0; pointer-events: none; }
.h-controles { position: absolute; right: calc(var(--h-margem) + var(--h-seguro)); bottom: calc(clamp(28px, 5vh, 48px) + var(--h-seguro)); display: none; gap: 8px; }
.h-controles button { background: transparent; color: var(--h-tinta); border: 1px solid rgba(138, 138, 132, 0.5); border-radius: 999px; width: 44px; height: 44px; font-size: 18px; cursor: pointer; }
.h-notas { position: absolute; left: calc(var(--h-margem) + var(--h-seguro)); right: calc(var(--h-margem) + var(--h-seguro)); top: calc(clamp(40px, 6vh, 72px) + var(--h-seguro));
  max-width: 980px; padding: 14px 18px; border-left: 2px solid #F5B83D; background: rgba(21, 21, 20, 0.92); color: #EDEDE8; font-size: 16px; line-height: 1.45; pointer-events: none; }
.h-notas b { display: block; font-family: var(--mono, "Geist Mono", monospace); font-weight: 400; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #8A8A84; margin-bottom: 6px; }
.h-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.historia.miniatura .h-topo, .historia.miniatura .h-controles { display: none; }
.historia.miniatura { container-type: inline-size; }
.historia.miniatura .h-textos { width: 38%; }
.historia.miniatura .h-titulo { font-size: 3.6cqw; }
.historia.miniatura .h-frase { font-size: 1.15cqw; }
@media (pointer: coarse) { .historia:not(.miniatura) .h-controles { display: flex; } }
@media (max-aspect-ratio: 11/10) {
  .historia:not(.miniatura) .h-textos { right: calc(var(--h-margem) + var(--h-seguro)); width: auto; bottom: calc(110px + var(--h-seguro)); }
  .historia:not(.miniatura) .h-titulo { font-size: clamp(30px, 8.5vw, 64px); }
}`;

  function injetarCSS() {
    if (typeof document === 'undefined' || document.getElementById('historia-css')) return;
    const s = document.createElement('style');
    s.id = 'historia-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function escapar(t) { return String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
  function palavras(texto) {
    return String(texto).split(/\s+/).filter(Boolean).map((w) => `<span class="h-m"><span class="h-p">${escapar(w)}</span></span>`).join(' ');
  }

  function criarPalco(opcoes) {
    injetarCSS();
    const el = opcoes.raiz, roteiro = opcoes.roteiro;
    const miniatura = Boolean(opcoes.miniatura);
    const dadosVivos = opcoes.dadosVivos || (() => null);
    const aoMudar = opcoes.aoMudar || (() => {});
    el.classList.add('historia');
    if (miniatura) el.classList.add('miniatura');
    if (!miniatura) { el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Como funciona'); el.tabIndex = -1; }
    el.innerHTML = `<canvas class="h-palco" aria-hidden="true"></canvas>
<div class="h-textos" aria-hidden="true"></div>
<div class="h-topo"><span class="h-cap"></span><span class="h-ilustra">Ilustração</span></div>
<div class="h-progresso" aria-hidden="true"><i></i></div>
<div class="h-controles"><button type="button" data-acao="anterior" aria-label="Cena anterior">←</button><button type="button" data-acao="proxima" aria-label="Próxima cena">→</button><button type="button" data-acao="fechar" aria-label="Fechar">✕</button></div>
<div class="h-notas" hidden></div>
<div class="h-cortina" aria-hidden="true"></div>
<div class="h-sr" aria-live="polite"></div>`;
    const cv = el.querySelector('.h-palco'), ctx = cv.getContext('2d');
    const elTextos = el.querySelector('.h-textos'), elCap = el.querySelector('.h-cap'), elIlustra = el.querySelector('.h-ilustra');
    const elBarra = el.querySelector('.h-progresso i'), elCortina = el.querySelector('.h-cortina'), elSr = el.querySelector('.h-sr');
    const elNotas = el.querySelector('.h-notas');

    const temPose = (c) => Boolean(POSES[c.id]);
    const st = {
      aberta: miniatura, versao: opcoes.versao || 'completa', ordem: [], blocos: [],
      T: 0, v: 0, alvo: 0, ultimo: 0, congelado: null, quadroPedido: false,
      rolando: null, direcao: 0, toque: null, corte: null, preto: false, anunciado: -1,
      cache: { tam: [0, 0] }, escala: 1, auto: null, notas: false, fonte: null, suave: { v: NaN },
      omega: 3.8,   // rigidez da mola: mais baixa nas setas (transição com cerca de 1 s), mais alta na rolagem
    };
    const OMEGA = { tecla: 3.8, rolagem: 7.5, encaixe: 4.6 };
    const relogio = () => (st.congelado !== null ? st.congelado : performance.now() / 1000);

    // A cena ao vivo diz de onde vem o sinal (placas, simulação ou gravação): nunca "ao vivo" com dado simulado.
    function fonteAtual() { const dv = dadosVivos(); return (dv && dv.fonte) || null; }
    function tituloDe(c) {
      if (c.id !== 'aovivo') return c.titulo;
      const f = fonteAtual();
      return (f === 'sim' && c.tituloSimulacao) || (f === 'replay' && c.tituloGravacao) || (!f && c.tituloSemFonte) || c.titulo;
    }
    // Resultados: só com os números do avaliar.py (acerto por coleta e o chute ao lado); senão, a frase de espera.
    function fraseDe(c) {
      const R = roteiro.RESULTADOS;
      if (c.id !== 'resultados' || !c.fraseComResultados || !R || typeof R.acerto !== 'number' || typeof R.chute !== 'number') return c.frase;
      const pct = (x) => `${Math.round(x * 100)}%`;
      return c.fraseComResultados.replace('{coletas}', String(R.coletas ?? '')).replace('{acerto}', pct(R.acerto)).replace('{chute}', pct(R.chute));
    }
    function montarTextos() {
      st.ordem = ordemDa(roteiro.cenas, st.versao, temPose);
      st.fonte = fonteAtual();
      elTextos.innerHTML = st.ordem.map((id) => {
        const c = roteiro.cenas.find((x) => x.id === id);
        return `<div class="h-texto" data-id="${id}"><h2 class="h-titulo">${palavras(tituloDe(c))}</h2><p class="h-frase">${palavras(fraseDe(c))}</p></div>`;
      }).join('');
      st.blocos = [...elTextos.children].map((b) => ({
        el: b, tit: [...b.querySelectorAll('.h-titulo .h-p')], fra: [...b.querySelectorAll('.h-frase .h-p')], vis: null, ult: new Map(),
      }));
    }

    function cena(i) { return roteiro.cenas.find((c) => c.id === st.ordem[i]); }
    const ultimaCena = () => st.ordem.length - 1;

    /* ---------- Tamanho do canvas (sem forçar layout a cada quadro) ---------- */
    function medir() {
      const r = cv.getBoundingClientRect();
      const cs = getComputedStyle(el);
      st.cache.tam = [r.width, r.height];
      st.cache.seguro = parseFloat(cs.getPropertyValue('--h-seguro')) || 0;
      st.cache.serif = cs.getPropertyValue('--serif').trim() || 'Georgia, serif';
      st.cache.sans = cs.getPropertyValue('--sans').trim() || 'system-ui, sans-serif';
    }
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(medir).observe(cv);

    function geometria(W, H, dpr) {
      const seguro = (st.cache.seguro || 0) * dpr;
      let fx, fy, fw, fh;
      if (W / H > 1.1) { fx = W * 0.43; fy = H * 0.11; fw = W * 0.52 - seguro; fh = H * 0.66; }
      else { fx = W * 0.06; fy = H * 0.08 + seguro; fw = W * 0.88; fh = H * 0.42; }
      const prop = 1.45, bw = Math.min(fw, fh * prop), bh = bw / prop;
      const bx = fx + (fw - bw) / 2, by = fy + (fh - bh) / 2;
      return { bx, by, bw, bh, dpr, X: (u) => bx + u * bw, Y: (v) => by + v * bh, serif: st.cache.serif || 'Georgia, serif', sans: st.cache.sans || 'system-ui, sans-serif' };
    }

    /* ---------- Um quadro ---------- */
    function desenhar() {
      const agora = relogio();
      const dt = st.ultimo ? agora - st.ultimo : 0;
      st.ultimo = agora;
      // corte (salto longo): apaga, pula, acende
      if (st.corte) {
        const t = performance.now() / 1000 - st.corte.inicio;
        if (t >= 0.22 && !st.corte.pulou) { st.T = st.alvo = st.corte.alvo; st.v = 0; st.corte.pulou = true; }
        const op = t < 0.22 ? t / 0.22 : 1 - limitar((t - 0.22) / 0.33);
        elCortina.style.opacity = String(Math.max(st.preto ? 1 : 0, op));
        if (t > 0.55) st.corte = null;
      } else {
        elCortina.style.opacity = st.preto ? '1' : '0';
        [st.T, st.v] = mola(st.T, st.v, st.alvo, dt, st.omega);
      }
      // vitrine: depois de `espera` segundos parada numa cena, vai para a próxima permitida; no fim, avisa
      if (st.auto && !st.corte) {
        if (st.T === st.alvo && Number.isInteger(st.T)) {
          if (st.auto.desde === null) st.auto.desde = agora;
          else if (agora - st.auto.desde >= st.auto.espera) {
            st.auto.desde = null;
            let j = st.T + 1;
            while (j < st.ordem.length && !st.auto.permitido(cena(j))) j++;
            if (j >= st.ordem.length) { const fim = st.auto.aoTerminar; st.auto = null; if (fim) fim(); }
            else irPara(j);
          }
        } else st.auto.desde = null;
      }

      if (!st.cache.tam[0]) medir();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * st.escala;
      const W = Math.max(1, Math.round(st.cache.tam[0] * dpr)), H = Math.max(1, Math.round(st.cache.tam[1] * dpr));
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const G = geometria(W, H, dpr);
      const cor = { fundo: '#0B0B0A', tinta: '#EDEDE8', apagado: '#8A8A84' };
      ctx.globalAlpha = 1; ctx.fillStyle = cor.fundo; ctx.fillRect(0, 0, W, H);

      const prm = poseEm(st.T, st.ordem, POSES, PADROES);
      // o sinal de verdade (placas, simulação ou gravação), quando a página principal passa um
      const dv = dadosVivos();
      const ex = { vivo: dv, vivoReal: Boolean(dv && dv.fonte && dv.leituras && dv.leituras.length > 1), resultados: roteiro.RESULTADOS, suave: st.suave };
      if (fonteAtual() !== st.fonte) { montarTextos(); }
      let sintetica = 0;
      for (const nome of Object.keys(CAMADAS)) {
        const q = prm[nome];
        if (!q || q.p <= 0.001) continue;
        if (CAMADAS[nome].sintetica || (nome === 'vivo' && !ex.vivoReal)) sintetica = Math.max(sintetica, q.p);
        ctx.save();
        DESENHOS[nome](ctx, G, q, cor, agora, prm, ex);
        ctx.restore();
      }
      // etiqueta no canto: de onde vem o que está na tela. Ilustração (dado sintético) ou a fonte real.
      const vivo = prm.vivo && ex.vivoReal ? prm.vivo.p : 0;
      const etiqueta = vivo > sintetica ? ({ live: 'Ao vivo · placa B', sim: 'Simulação', replay: 'Gravação' }[dv.fonte] || '') : 'Ilustração';
      if (elIlustra.textContent !== etiqueta) elIlustra.textContent = etiqueta;
      const forca = Math.max(vivo, sintetica);
      elIlustra.style.opacity = forca > 0.05 ? String(limitar(forca * 1.5)) : '0';
      textos(prm._i, prm._u);
      // capítulo: troca no meio da transição, com fade
      const ci = cena(prm._i), cj = cena(Math.min(prm._i + 1, ultimaCena()));
      const capAtual = prm._u < 0.5 ? ci.cap : cj.cap;
      const nomeCap = capAtual ? roteiro.capitulos[capAtual] : '';
      if (elCap.textContent !== nomeCap) elCap.textContent = nomeCap;
      elCap.style.opacity = ci.cap !== cj.cap ? String(Math.abs(1 - 2 * janela(prm._u, 0.2, 0.8))) : '1';
      elBarra.style.transform = `scaleX(${ultimaCena() ? st.T / ultimaCena() : 1})`;
      // anuncia a cena para leitores de tela quando ela para
      if (!miniatura && st.T === st.alvo && Number.isInteger(st.T) && st.anunciado !== st.T) {
        st.anunciado = st.T;
        const c = cena(st.T);
        elSr.textContent = `Cena ${st.T + 1} de ${st.ordem.length}. ${tituloDe(c)} ${fraseDe(c)}`;
        if (st.notas) mostrarNotas();
        aoMudar(estado());
      }
    }

    function estilo(bloco, el, valor) {
      if (bloco.ult.get(el) === valor) return;
      bloco.ult.set(el, valor);
      el.style.transform = valor;
    }
    function mostrarBloco(b, sim) {
      if (b.vis === sim) return;
      b.vis = sim;
      b.el.style.visibility = sim ? 'visible' : 'hidden';
    }
    function textos(i, u) {
      const sai = st.blocos[i], entra = u > 0 ? st.blocos[i + 1] : null;
      st.blocos.forEach((b) => { if (b !== sai && b !== entra) mostrarBloco(b, false); });
      if (sai) {
        mostrarBloco(sai, u < 0.45);
        sai.tit.forEach((w, j) => estilo(sai, w, `translate3d(0, ${(-110 * curvas.sai(revelacao(u, j, sai.tit.length, 0.12, 0.42, 0.35))).toFixed(2)}%, 0)`));
        sai.fra.forEach((w, j) => estilo(sai, w, `translate3d(0, ${(-110 * curvas.sai(revelacao(u, j, sai.fra.length, 0.08, 0.32, 0.3))).toFixed(2)}%, 0)`));
      }
      if (entra) {
        mostrarBloco(entra, u > 0.48);
        entra.tit.forEach((w, j) => estilo(entra, w, `translate3d(0, ${(110 * (1 - curvas.entra(revelacao(u, j, entra.tit.length, 0.5, 0.86, 0.4)))).toFixed(2)}%, 0)`));
        entra.fra.forEach((w, j) => estilo(entra, w, `translate3d(0, ${(110 * (1 - curvas.entra(revelacao(u, j, entra.fra.length, 0.64, 0.94, 0.35)))).toFixed(2)}%, 0)`));
      }
    }

    function mostrarNotas() {
      const i = Math.round(destino()), c = cena(i);
      elNotas.innerHTML = `<b>Cena ${i + 1} de ${st.ordem.length} · ${escapar(tituloDe(c))}</b>${escapar(c.notas || '')}`;
    }

    function laco() {
      if (!st.aberta) { st.quadroPedido = false; return; }
      desenhar();
      requestAnimationFrame(laco);
    }
    function iniciarLaco() { if (!st.quadroPedido) { st.quadroPedido = true; st.ultimo = 0; requestAnimationFrame(laco); } }

    /* ---------- Navegação ---------- */
    function irPara(alvo, opc = {}) {
      alvo = limitar(alvo, 0, ultimaCena());
      st.omega = opc.omega || OMEGA.tecla;
      const longe = Math.abs(alvo - st.T) > 1.5;
      if ((longe || opc.cortar) && !opc.semCorte) st.corte = { inicio: performance.now() / 1000, alvo };
      else st.alvo = alvo;
    }
    // Para onde a história está indo. Durante um corte, até o salto, vale o alvo do corte; depois dele,
    // o alvo normal (que já pode ter andado com outra seta, sem perder o toque).
    const destino = () => (st.corte && !st.corte.pulou ? st.corte.alvo : st.alvo);
    const proxima = () => irPara(Math.round(destino()) + 1);
    const anterior = () => irPara(Math.round(destino()) - 1);
    function irParaId(id, opc) { const i = st.ordem.indexOf(id); if (i >= 0) irPara(i, opc); }

    function versao(v) {
      if (v === st.versao) return;
      const atual = st.ordem[Math.round(st.alvo)];
      st.versao = v;
      montarTextos();
      const i = st.ordem.indexOf(remapear(atual, roteiro.cenas, v, temPose));
      st.T = st.alvo = Math.max(0, i); st.v = 0; st.anunciado = -1;
      st.corte = { inicio: performance.now() / 1000 - 0.22, alvo: st.alvo, pulou: true };
      aoMudar(estado());
    }

    /* ---------- Entrada: roda, toque, teclas, clique ---------- */
    const distancia = () => 0.9 * (window.innerHeight || 800);
    function soltarRolagem() {
      st.rolando = null;
      irPara(alvoDirecional(st.alvo, st.direcao), { semCorte: true, omega: OMEGA.encaixe });
    }
    function roda(e) {
      if (e.ctrlKey) return;           // pinça do trackpad: deixa o navegador
      e.preventDefault();
      let d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      d *= e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? window.innerHeight : 1;
      d = limitar(d, -240, 240);
      if (!d) return;
      st.direcao = Math.sign(d);
      st.omega = OMEGA.rolagem;
      st.alvo = limitar(st.alvo + d / distancia(), 0, ultimaCena());
      clearTimeout(st.rolando);
      st.rolando = setTimeout(soltarRolagem, 180);
      if (opcoes.aoInteragir) opcoes.aoInteragir();
    }
    function tocar(e) {
      if (e.pointerType === 'mouse') return;
      if (e.type === 'pointerdown') { st.toque = { y: e.clientY, x: e.clientX, mexeu: false }; return; }
      if (!st.toque) return;
      if (e.type === 'pointermove') {
        const dy = st.toque.y - e.clientY;
        if (Math.abs(dy) > 4) st.toque.mexeu = true;
        st.toque.y = e.clientY;
        if (dy) { st.direcao = Math.sign(dy); st.omega = OMEGA.rolagem; st.alvo = limitar(st.alvo + dy / distancia(), 0, ultimaCena()); }
      } else {
        const mexeu = st.toque.mexeu;
        st.toque = null;
        if (mexeu) irPara(alvoDirecional(st.alvo, st.direcao), { semCorte: true, omega: OMEGA.encaixe });
      }
      if (opcoes.aoInteragir) opcoes.aoInteragir();
    }
    function clique(e) {
      const b = e.target.closest('button');
      if (b) { const a = b.dataset.acao; if (a === 'anterior') anterior(); else if (a === 'proxima') proxima(); else if (a === 'fechar') opcoes.aoFechar && opcoes.aoFechar(); }
      else if (!st.toque) proxima();
      if (opcoes.aoInteragir) opcoes.aoInteragir();
    }
    // Devolve true se a tecla foi usada pela história (aí o resto da página não deve tratá-la).
    function tecla(e) {
      if (!st.aberta || miniatura || e.ctrlKey || e.metaKey || e.altKey) return false;
      const k = e.key;
      const nav = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': 1, Enter: 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 };
      if (k in nav || k === 'Home' || k === 'End' || k === 'F5' || k === '.' || k === 'b' || k === 'B') {
        e.preventDefault();
        if (e.repeat) return true;
        if (opcoes.aoInteragir) opcoes.aoInteragir();
        if (k === '.' || k === 'b' || k === 'B') { st.preto = !st.preto; return true; }
        if (st.preto) { st.preto = false; return true; }   // qualquer avanço primeiro acende a tela
        if (k === 'F5') return true;                        // passador mandando "começar": não recarrega
        if (k === 'Home') irPara(0); else if (k === 'End') irPara(ultimaCena());
        else if (nav[k] > 0) proxima(); else anterior();
        return true;
      }
      if (k === 'v' || k === 'V') { versao(st.versao === 'completa' ? 'curta' : 'completa'); return true; }
      if (k === 'p' || k === 'P') { if (opcoes.aoApresentador) opcoes.aoApresentador(); return true; }
      return false;
    }
    if (!miniatura) {
      el.addEventListener('wheel', roda, { passive: false });
      for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) el.addEventListener(t, tocar);
      el.addEventListener('click', clique);
    }

    function estado() {
      const i = Math.round(destino());
      return { aberta: st.aberta, versao: st.versao, ordem: st.ordem.slice(), indice: i, cenaId: st.ordem[i], T: st.T, alvo: st.alvo, preto: st.preto, auto: Boolean(st.auto), notas: st.notas };
    }

    montarTextos();
    // prepara os dados de ilustração com calma, para a primeira passagem por cada cena não engasgar
    setTimeout(() => { perfil(); serieNumero(); gravacoes(); }, 400);
    const api = {
      get aberta() { return st.aberta; },
      abrir(opc = {}) {
        if (opc.versao && opc.versao !== st.versao) versao(opc.versao);
        st.aberta = true; el.hidden = false; st.anunciado = -1; st.preto = false;
        if (opc.cenaId) { const i = st.ordem.indexOf(remapear(opc.cenaId, roteiro.cenas, st.versao, temPose)); st.T = st.alvo = Math.max(0, i); st.v = 0; }
        medir(); iniciarLaco();
        if (!miniatura) el.focus({ preventScroll: true });
      },
      fechar() { st.aberta = miniatura; st.auto = null; if (!miniatura) el.hidden = true; clearTimeout(st.rolando); },
      // vitrine: avança sozinha pelas cenas permitidas; qualquer mexida manual deve chamar pararAuto()
      autoplay({ permitido = () => true, espera = 6, aoTerminar } = {}) {
        st.auto = { permitido, espera, aoTerminar, desde: null };
        let j = Math.round(st.alvo);
        while (j < st.ordem.length && !permitido(cena(j))) j++;
        if (j < st.ordem.length && j !== Math.round(st.alvo)) irPara(j, { cortar: true });
      },
      pararAuto() { st.auto = null; },
      preto(sim) { st.preto = sim === undefined ? !st.preto : Boolean(sim); },
      notas(sim) { st.notas = sim === undefined ? !st.notas : Boolean(sim); elNotas.hidden = !st.notas; if (st.notas) mostrarNotas(); return st.notas; },
      tecla, proxima, anterior, irPara, irParaId, versao, estado,
      // ganchos para testes e para gravar vídeo quadro a quadro
      _teste: {
        irPara(T) { st.T = st.alvo = T; st.v = 0; st.corte = null; },
        congelar(t) { st.congelado = t; st.ultimo = 0; },
        avancar(t) { st.congelado = t; },          // relógio parado andando quadro a quadro (a mola usa a diferença)
        quadro() { desenhar(); },
      },
    };
    if (miniatura) iniciarLaco();
    return api;
  }

  /* ================= Canal entre o palco e a janela do apresentador ================= */

  // Manda cada mensagem pelos três caminhos ao mesmo tempo (postMessage, BroadcastChannel e localStorage),
  // porque em file:// algum deles pode falhar sem avisar. Duplicatas são descartadas por (origem, seq).
  function criarCanal(papel, aoReceber) {
    const origem = `${papel}-${Math.random().toString(36).slice(2, 8)}`, CHAVE = 'wavesense-historia-msg';
    let seq = 0, par = null, bc = null;
    const vistos = new Map();
    function receber(env) {
      if (!env || env.tipo !== 'wavesense-historia' || env.origem === origem) return;
      if ((vistos.get(env.origem) || 0) >= env.seq) return;
      vistos.set(env.origem, env.seq);
      aoReceber(env.msg, env);
    }
    try { bc = new BroadcastChannel('wavesense-historia'); bc.onmessage = (e) => receber(e.data); } catch (e) { bc = null; }
    window.addEventListener('storage', (e) => { if (e.key === CHAVE && e.newValue) { try { receber(JSON.parse(e.newValue)); } catch (err) { /* ignora */ } } });
    window.addEventListener('message', (e) => { if (e.data && e.data.tipo === 'wavesense-historia') receber(e.data); });
    return {
      origem,
      ligar(janela) { par = janela; },
      enviar(msg) {
        const env = { tipo: 'wavesense-historia', origem, seq: ++seq, msg };
        try { if (bc) bc.postMessage(env); } catch (e) { /* ignora */ }
        try { localStorage.setItem(CHAVE, JSON.stringify(env)); } catch (e) { /* ignora */ }
        const alvo = par && !par.closed ? par : (window.opener && !window.opener.closed ? window.opener : null);
        try { if (alvo) alvo.postMessage(env, '*'); } catch (e) { /* ignora */ }
      },
    };
  }

  const WaveHistoria = {
    limitar, misturar, janela, curvas, mola, alvoDirecional, ordemDa, remapear, revelacao, poseEm,
    mulberry32, canal, perfilParado, sinteticas, desenharLinhas, criarPalco, criarCanal, POSES, CAMADAS,
    agitoNoTempo, serieNumero, medidaSint, PIANO, SALTOS,
  };
  raiz.WaveHistoria = WaveHistoria;
  if (typeof module !== 'undefined' && module.exports) module.exports = WaveHistoria;
})(typeof window !== 'undefined' ? window : globalThis);

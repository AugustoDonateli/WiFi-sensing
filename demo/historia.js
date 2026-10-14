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
  // Curva Bézier como a do "graph editor" do After Effects (e o cubic-bezier do CSS): os pontos de
  // controle (x1, y1) e (x2, y2) dão a forma; resolve x(t) = x por Newton, com bisseção de reserva.
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const e = X(t) - x, d = dX(t);
        if (Math.abs(e) < 1e-7) return Y(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
        if (t < 0 || t > 1) break;
      }
      let a = 0, b = 1;
      t = x;
      for (let i = 0; i < 40; i++) {
        const e = X(t) - x;
        if (Math.abs(e) < 1e-7) break;
        if (e > 0) b = t; else a = t;
        t = (a + b) / 2;
      }
      return Y(t);
    };
  }
  const curvas = {
    entra: bezier(0.16, 1, 0.3, 1),      // chega rápido e assenta devagar (movimento de cada elemento)
    sai: bezier(0.7, 0, 0.84, 0),        // sai acelerando
    suave: bezier(0.65, 0, 0.35, 1),     // devagar nas duas pontas (transformações de uma forma em outra)
    pop: bezier(0.34, 1.3, 0.64, 1),     // passa uns 4% e volta: só para ícones pequenos
    presenca: (t) => 1 - Math.pow(1 - t, 3),   // presença de uma camada que entra (opacidade)
    ausencia: (t) => t * t * t,                // presença de uma camada que sai
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

  // Curva de uma transição com tempo fixo: s (0 a 1, fração da duração) → progresso (0 a 1).
  // Começa já andando com inclinação m0 (1 = como uma reta, a tela responde na hora) e termina parada.
  // Com m0 entre 0 e 3, nunca passa do fim nem volta.
  function transicao(s, m0 = 1) {
    s = limitar(s);
    return m0 * (s * s * s - 2 * s * s + s) + 3 * s * s - 2 * s * s * s;
  }
  function inclinacaoTransicao(s, m0 = 1) {
    s = limitar(s);
    return m0 * (3 * s * s - 4 * s + 1) + 6 * s - 6 * s * s;
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
      // entrando, a camada nasce já com os parâmetros da pose de destino (o que ela tinha invisível não conta)
      const de = { ...padroes[nome], ...(pa > 0 ? a : b) }, para = { ...padroes[nome], ...(a || {}), ...(b || {}) };
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
      // `lin` é o progresso linear da entrada ou da saída (0 a 1): cada desenho aplica nele a própria curva
      if (pa === pb) { q.p = pa; q.dir = 0; q.lin = 1; }
      else if (pb > pa) { const [w0, w1] = (b && b.entrada) || [0.4, 0.88]; q.lin = janela(u, w0, w1); q.p = misturar(pa, pb, curvas.presenca(q.lin)); q.dir = 1; }
      else { const [w0, w1] = (b && b.saida) || [0.12, 0.55]; q.lin = janela(u, w0, w1); q.p = misturar(pa, pb, curvas.ausencia(q.lin)); q.dir = -1; }
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
  // Zoom de uma camada: o ponto (0,5; chão) da cena vai para (zx; zy) com escala zs. A "sala em miniatura"
  // fica pequena no alto da caixa, com as linhas do sinal embaixo (tremor e pessoa parada).
  const ZOOM_NORMAL = { zs: 1, zx: 0.5, zy: CHAO };
  const ZOOM_MINI = { zs: 0.56, zx: 0.5, zy: 0.36 };
  const PILHA_MINI = { px: 0, pw: 1, py: 0.47, ph: 0.51, relevo: 0.8, teto: 0.39 };   // `teto`: as linhas somem antes da sala
  // Notebook da cena de viabilidade: a tela (onde as linhas encolhem) e a base, apoiada no chão.
  const NOTE = { x0: 0.675, x1: 0.945, y0: 0.485, y1: 0.74, borda: 0.012 };
  // Barras dos resultados: o acerto do sistema (x) e o chute (x2); `alt` é a altura de 100%.
  const RES = { x: 0.28, x2: 0.64, w: 0.2, alt: 0.58 };
  const PILHA_NOTE = { px: NOTE.x0 + NOTE.borda, pw: NOTE.x1 - NOTE.x0 - 2 * NOTE.borda, py: NOTE.y0 + NOTE.borda * 1.45, ph: NOTE.y1 - NOTE.y0 - 2 * NOTE.borda * 1.45 };
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
    return { valor: misturar(S.rel[ciclico(i, n)], S.rel[ciclico(i + 1, n)], m - i), serie, dets, lim: S.lim, ligado, rotulo: ligado ? 'movimento' : 'parado', frac: m - i };
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
  // Progresso linear de uma camada que está entrando (0 a 1); parada ou saindo, vale 1.
  const linear = (q) => (q.dir === 1 ? q.lin : 1);
  // Progresso linear da saída (0 = ainda inteira, 1 = já saiu); parada ou entrando, vale 0.
  const saindo = (q) => (q.dir === -1 ? q.lin : 0);
  // Quanto do desenho está "construído": sobe de 0 a 1 na entrada e desce de 1 a 0 na saída, para o que
  // entra desenhando sair desdesenhando (o mesmo caminho ao contrário).
  const construcao = (q) => (q.dir === 1 ? q.lin : q.dir === -1 ? 1 - q.lin : 1);
  // LED das placas: acende quando um pacote sai de A (e, ao mesmo tempo, outro chega em B) e apaga devagar.
  function ledPacotes(amb, prm) {
    const pc = prm.pacotes;
    if (!pc || pc.p < 0.05) return 0;
    const g = ((((amb * 0.14) % 1) * 11) % 1) / 11;            // tempo (em fração do caminho) desde a última chegada
    return limitar(1 - g / 0.05) * limitar(pc.p * 1.5);
  }

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
      // Desenha só o trecho entre as frações `inicio` e `fim`, como o "trim paths" do After Effects:
      // `fim` andando = a caneta desenhando; `inicio` andando = o traço sendo recolhido.
      tracar(c, fim, inicio = 0) {
        const a = limitar(inicio) * L, b = limitar(fim) * L;
        if (b - a <= 0.01) return;
        c.beginPath();
        let acum = 0, comecou = false;
        for (let i = 0; i < segs.length; i++) {
          const s0 = acum, s1 = acum + segs[i];
          acum = s1;
          if (s1 < a) continue;
          if (s0 > b) break;
          const f0 = segs[i] ? limitar((a - s0) / segs[i]) : 0, f1 = segs[i] ? limitar((b - s0) / segs[i]) : 0;
          const p0 = [misturar(pts[i][0], pts[i + 1][0], f0), misturar(pts[i][1], pts[i + 1][1], f0)];
          const p1 = [misturar(pts[i][0], pts[i + 1][0], f1), misturar(pts[i][1], pts[i + 1][1], f1)];
          if (!comecou) { c.moveTo(p0[0], p0[1]); comecou = true; }
          c.lineTo(p1[0], p1[1]);
        }
        c.stroke();
      },
    };
  }

  // Pesos de traço (vezes o dpr): o desenho inteiro usa só estes três.
  const PESO = { principal: 1.6, secundario: 1.1, detalhe: 0.8 };
  function retArred(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  // O contorno de um retângulo de cantos arredondados como lista de pontos, começando no meio de baixo
  // (para desenhar com a caneta ou recolher com `trajeto`).
  function contornoRet(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    const pts = [[x + w / 2, y + h]], canto = (cx, cy, a0) => { for (let i = 0; i <= 4; i++) { const a = a0 + (i / 4) * (Math.PI / 2); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    canto(x + r, y + h - r, Math.PI / 2); canto(x + r, y + r, Math.PI); canto(x + w - r, y + r, -Math.PI / 2); canto(x + w - r, y + h - r, 0);
    pts.push([x + w / 2, y + h]);
    return pts;
  }

  // Placa ESP32 (DevKit) em pé num suporte, como as do estande: o módulo com a antena em zigue-zague no
  // alto, duas fileiras de pinos, os botões e o conector USB embaixo, e um LED que acende quando uma
  // mensagem sai (A) ou chega (B). Entrando: o suporte sobe, o contorno se desenha, depois os detalhes;
  // saindo, o contrário. `nasce` = 1: a caixa já está no lugar (o roteador virou ela) e o suporte desce.
  function desenharPlaca(c, G, q, cor, letra, led = 0) {
    const t = q.dir === 1 ? q.lin : q.dir === -1 ? 1 - q.lin : 1;
    const x = G.X(q.x), yc = G.Y(CHAO), s = G.bh * TAM_PLACA * (q.esc ?? 1);
    const w = s * 0.58, h = s, haste = G.bh * HASTE, topo = yc - haste - h, base = topo + h;
    const nasce = (q.nasce || 0) > 0.5;
    const kHaste = curvas.entra(janela(t, nasce ? 0.2 : 0, nasce ? 0.7 : 0.45));
    const kCont = nasce ? 1 : curvas.suave(janela(t, 0.25, 0.7));
    const kDet = curvas.entra(janela(t, nasce ? 0.3 : 0.55, 0.95));
    const alfa = q.dir === -1 ? limitar(q.p * 1.5) : nasce ? limitar(t * 5) : limitar(t * 4);
    c.globalAlpha = alfa; c.strokeStyle = cor.tinta; c.fillStyle = cor.tinta; c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = PESO.secundario * G.dpr * 1.25;
    if (nasce) linha(c, x, base, x, base + haste * kHaste);       // desce da caixa até o chão
    else linha(c, x, yc, x, yc - haste * kHaste);                  // sobe do chão
    if (kCont <= 0) return;
    c.lineWidth = PESO.principal * G.dpr;
    trajeto(contornoRet(x - w / 2, topo, w, h, w * 0.09)).tracar(c, kCont);
    if (kDet <= 0) { c.lineCap = 'butt'; return; }
    c.globalAlpha = alfa * kDet;
    // o módulo (a blindagem de metal) e, em cima dele, a antena desenhada na placa, em zigue-zague
    const mx = x - w * 0.36, mw = w * 0.72, my = topo + h * 0.06, mh = h * 0.5;
    c.lineWidth = PESO.secundario * G.dpr;
    c.beginPath(); retArred(c, mx, my, mw, mh, w * 0.04); c.stroke();
    c.lineWidth = PESO.detalhe * G.dpr;
    linha(c, mx, my + mh * 0.4, mx + mw, my + mh * 0.4);
    const zx0 = mx + mw * 0.12, zx1 = mx + mw * 0.88, zy0 = my + mh * 0.1, zy1 = my + mh * 0.3;
    c.beginPath(); c.moveTo(zx0, zy1);
    for (let i = 0; i < 6; i++) { const ya = i % 2 ? zy1 : zy0; c.lineTo(misturar(zx0, zx1, i / 6), ya); c.lineTo(misturar(zx0, zx1, (i + 1) / 6), ya); }
    c.lineTo(zx1, zy1); c.stroke();
    // as duas fileiras de pinos
    const lado = Math.max(G.dpr * 0.9, w * 0.045);
    for (let i = 0; i < 12; i++) {
      const py = misturar(topo + h * 0.1, base - h * 0.08, i / 11);
      c.fillRect(x - w * 0.43 - lado / 2, py - lado / 2, lado, lado);
      c.fillRect(x + w * 0.43 - lado / 2, py - lado / 2, lado, lado);
    }
    // botões, conector USB (saindo um pouco por baixo) e o LED
    c.beginPath(); c.arc(x - w * 0.24, base - h * 0.13, w * 0.05, 0, 2 * Math.PI); c.stroke();
    c.beginPath(); c.arc(x + w * 0.24, base - h * 0.13, w * 0.05, 0, 2 * Math.PI); c.stroke();
    c.beginPath(); retArred(c, x - w * 0.17, base - h * 0.06, w * 0.34, h * 0.09, w * 0.02); c.stroke();
    const lx = x + w * 0.2, ly = my + mh + h * 0.09, lr = Math.max(G.dpr * 1.2, w * 0.05);
    c.beginPath(); c.arc(lx, ly, lr, 0, 2 * Math.PI); c.stroke();
    if (led > 0.01) {
      c.globalAlpha = alfa * kDet * led; c.beginPath(); c.arc(lx, ly, lr, 0, 2 * Math.PI); c.fill();
      c.globalAlpha = alfa * kDet * led * 0.35; c.beginPath(); c.arc(lx, ly, lr * 2.6, 0, 2 * Math.PI); c.fill();
    }
    c.globalAlpha = alfa * kDet;
    c.font = `italic ${Math.round(s * 0.55)}px ${G.serif}`;
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText(letra, x, topo - s * 0.22 + (1 - kDet) * s * 0.15);
    c.lineCap = 'butt';
  }

  // Pessoa de palitinho com os pés no chão, em x. `deitada` (0 a 1) gira até ficar caída no chão,
  // `fantasma` (0 a 1) vira tracejada, `amp` balança pernas e braços (andando), `halo` abre um vão
  // em volta do traço para o que passa atrás parecer passar atrás. `ergue` levanta um braço com um aparelho.
  function desenharPessoa(c, G, cor, o) {
    const H = G.bh * ALTURA_PESSOA * (o.esc ?? 1), dei = o.deitada || 0, fan = o.fantasma || 0;
    const amp = o.amp || 0, f = o.fase || 0, r = H * 0.07, erg = o.ergue || 0, dx = o.dirx || -1;
    // Em pé ou andando (coordenadas locais: pés em y = 0, para cima é negativo). Cada perna tem coxa e
    // canela: o joelho dobra quando a perna vai à frente; os braços balançam ao contrário das pernas.
    const QUADRIL = 0.48 * H, OMBRO = 0.75 * H, COXA = 0.25 * H, CANELA = 0.235 * H, BRACO = 0.155 * H, ANTEBRACO = 0.15 * H;
    const membro = (ox, oy, a1, l1, a2, l2) => {
      const j = [ox + Math.sin(a1) * l1 * dx, oy + Math.cos(a1) * l1];
      return [j, [j[0] + Math.sin(a2) * l2 * dx, j[1] + Math.cos(a2) * l2]];
    };
    const perna = (lado) => {
      const fs = f + (lado > 0 ? 0 : Math.PI);
      const a = 0.42 * amp * Math.sin(fs) + lado * 0.07 * (1 - amp);
      return membro(0, -QUADRIL, a, COXA, a - amp * 0.75 * Math.max(0, Math.sin(fs + 1.3)), CANELA);
    };
    const braco = (lado) => {
      const fs = f + (lado > 0 ? Math.PI : 0);
      const a = 0.38 * amp * Math.sin(fs) + lado * 0.12 * (1 - amp);
      return membro(0, -OMBRO, a, BRACO, a + 0.22 + amp * 0.35 * Math.max(0, Math.sin(fs)), ANTEBRACO);
    };
    const [j1, p1] = perna(1), [j2, p2] = perna(-1), [c1, m1] = braco(1), [c2, m2] = braco(-1);
    const sobe = -Math.max(p1[1], p2[1]);                       // o pé mais baixo encosta no chão
    const empe = {
      cab: [0, -0.885 * H], pesc: [0, -0.815 * H], ombro: [0, -OMBRO], quadril: [0, -QUADRIL],
      j1, p1, j2, p2, c1, m1, c2, m2,
    };
    for (const k of Object.keys(empe)) empe[k] = [empe[k][0], empe[k][1] + sobe];
    if (erg > 0) {                                               // braço erguido para a frente, segurando um aparelho
      empe.c1 = [misturar(empe.c1[0], 0.13 * H * dx, erg), misturar(empe.c1[1], -0.66 * H, erg)];
      empe.m1 = [misturar(empe.m1[0], 0.25 * H * dx, erg), misturar(empe.m1[1], -0.64 * H, erg)];
    }
    // Caída (antes de girar 90°: x positivo vira "para cima"): deitada no chão, um braço levantado (pedindo
    // ajuda), o outro junto do corpo, uma perna reta e a outra com o joelho dobrado.
    const caida = {
      cab: [0, -0.885 * H], pesc: [0, -0.815 * H], ombro: [0, -OMBRO], quadril: [0, -QUADRIL],
      j1: [0.15 * H, -0.26 * H], p1: [0.02 * H, -0.08 * H], j2: [0, -0.24 * H], p2: [0, 0],
      c1: [0.19 * H, -0.7 * H], m1: [0.28 * H, -0.83 * H], c2: [0.03 * H, -0.6 * H], m2: [0.01 * H, -0.46 * H],
    };
    const P = {};
    for (const k of Object.keys(empe)) P[k] = [misturar(empe[k][0], caida[k][0], dei), misturar(empe[k][1], caida[k][1], dei)];
    const cab = P.cab;
    c.save();
    c.translate(G.X(o.x), G.Y(CHAO) - dei * r * 0.95);   // cai girando sobre os pés (a cabeça vai para a esquerda)
    c.rotate((-Math.PI / 2) * dei);
    c.lineCap = 'round'; c.lineJoin = 'round';
    const alfa = o.alfa ?? 1, tinta = o.cor || cor.tinta;
    const tracar = (larg, estilo) => {
      c.lineWidth = larg; c.strokeStyle = estilo;
      c.beginPath();
      for (const cad of [[P.pesc, P.quadril], [P.quadril, P.j1, P.p1], [P.quadril, P.j2, P.p2], [P.ombro, P.c1, P.m1], [P.ombro, P.c2, P.m2]]) {
        c.moveTo(cad[0][0], cad[0][1]);
        for (let i = 1; i < cad.length; i++) c.lineTo(cad[i][0], cad[i][1]);
      }
      c.moveTo(cab[0] + r, cab[1]); c.arc(cab[0], cab[1], r, 0, 2 * Math.PI);
      if (erg > 0.5 && o.aparelho) c.rect(P.m1[0] - H * 0.03, P.m1[1] - H * 0.11, H * 0.06, H * 0.1);
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
    // há quanto tempo o sistema marcou "movimento" (as medidas chegam a cada 0,2 s): o momento da decisão
    // ganha um destaque curto, a pílula aparece com um pulinho e um anel se abre em volta dela
    let seguidas = 0;
    for (let i = (d.dets || []).length - 1; i >= 0 && d.dets[i]; i--) seguidas++;
    const desde = d.ligado ? Math.max(0, (seguidas - 1 + (d.frac || 0)) * 0.2) : Infinity;
    const pulso = Number.isFinite(desde) ? Math.exp(-desde * 3) : 0;
    if (d.ligado) {
      const w = c.measureText(d.rotulo).width + ft * 1.3, hh = ft * 1.7;
      const esc = curvas.pop(limitar(desde / 0.35));
      c.save(); c.translate(r.x + w / 2, ly); c.scale(esc, esc);
      pilula(c, -w / 2, -hh / 2, w, hh); c.fill();
      c.fillStyle = cor.fundo; c.fillText(d.rotulo, -w / 2 + ft * 0.65, 0);
      c.restore();
      if (pulso > 0.02) {
        const ab = 1 - pulso, ex = ft * (0.25 + ab * 1.1);
        c.globalAlpha = alfa * pulso; c.strokeStyle = cor.tinta; c.lineWidth = PESO.secundario * G.dpr;
        pilula(c, r.x - ex, ly - hh / 2 - ex, w + 2 * ex, hh + 2 * ex); c.stroke();
        c.globalAlpha = alfa;
      }
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
    // a linha do limite clareia por um instante quando o tremor passa dela
    c.globalAlpha = alfa * (0.7 + 0.3 * pulso); c.lineWidth = G.dpr * (1 + pulso); tracejado(c, G, true);
    linha(c, gx, y(d.lim), gx + gw, y(d.lim)); tracejado(c, G, false);
    c.globalAlpha = alfa; c.lineWidth = 1.8 * G.dpr; c.lineJoin = 'round';
    c.beginPath();
    s.forEach((v, i) => { const px = xs(i, n), py = y(v); i ? c.lineTo(px, py) : c.moveTo(px, py); });
    c.stroke();
    // "agora": um ponto no valor mais recente, como a agulha de um aparelho
    const ax = xs(n - 1, n), ay = y(s[n - 1]);
    if (mostra >= 0.999) {
      const g = c.createRadialGradient(ax, ay, 0, ax, ay, 9 * G.dpr);
      g.addColorStop(0, 'rgba(237, 237, 232, 0.35)'); g.addColorStop(1, 'rgba(237, 237, 232, 0)');
      c.fillStyle = g; c.beginPath(); c.arc(ax, ay, 9 * G.dpr, 0, 2 * Math.PI); c.fill();
      c.fillStyle = cor.tinta; c.beginPath(); c.arc(ax, ay, 2.6 * G.dpr, 0, 2 * Math.PI); c.fill();
    }
    c.restore();
    c.globalAlpha = alfa * mostra;
    rotulo(c, G, cor, 'limite', gx + gw, y(d.lim) - G.bh * 0.012, { alinhar: 'right', base: 'bottom', tam: 0.03 });
  }

  // Camadas: ordem de desenho e parâmetros padrão. `sintetica` liga a etiqueta "Ilustração".
  const CAMADAS = {
    composicao: { padrao: { x: 0.44, y: 0.15, w: 0.52, h: 0.65, prop: 1.45 } },
    editorial: { padrao: {}, sintetica: true },
    sala: { padrao: {} },
    ondas: { padrao: { ox: 0.2, oy: 0.42, cx0: SALA.x0, cx1: SALA.x1, ctopo: SALA.teto, cap: 0, vaza: 0 } },
    casa: { padrao: { cx: 0.8, larg: 0.2, alt: 0.17, tel: 0.09, sino: 0, fachada: 0 } },
    pilha: { padrao: { agito: 0, roteiro: 0, px: PILHA.x, pw: PILHA.w, py: PILHA.y, ph: PILHA.h, relevo: 1, juntar: 0, teto: -1 }, sintetica: true },
    chao: { padrao: { x0: 0, x1: 1, cresce: 1, ...ZOOM_NORMAL } },
    raios: { padrao: {} },
    pacotes: { padrao: { ...ZOOM_NORMAL } },
    roteador: { padrao: { x: 0.2, y: 0.42, prat: -1, forma: 0 } },
    camera: { padrao: { risco: 0 } },
    placaA: { padrao: { x: 0.14, esc: 1, nasce: 0, ...ZOOM_NORMAL } },
    placaB: { padrao: { x: 0.86, esc: 1, nasce: 0, ...ZOOM_NORMAL } },
    notebook: { padrao: {} },
    icones: { padrao: {} },
    vulto: { padrao: { x: 0.86 } },
    pessoa: { padrao: { x: 0.6, esc: 1, deitada: 0, fantasma: 0, andar: 0, ...ZOOM_NORMAL } },
    barras: { padrao: {}, sintetica: true },
    curva: { padrao: { forma: 0 }, sintetica: true },
    medidor: { padrao: {}, sintetica: true, sobe: true },
    vivo: { padrao: { py: PILHA.y, ph: PILHA.h, med: 0 }, sobe: true },
    grade: { padrao: { agrupar: 1, junta: 0 }, sintetica: true },
    resultado: { padrao: {} },
  };
  const PADROES = Object.fromEntries(Object.entries(CAMADAS).map(([k, v]) => [k, v.padrao]));

  // Cada desenho recebe (contexto, geometria, parâmetros da camada, cores, tempo, todas as camadas, extras).
  // q.p é a presença (0 a 1) e q.dir diz se a camada está entrando (1), saindo (−1) ou parada (0).
  const DESENHOS = {
    composicao() {},
    editorial(c, G, q, cor, amb, prm, ex) { raiz.WaveCenas.desenhar(c, G, q, cor, ex.tempoCena, prm, ex); },
    sala(c, G, q, cor) {
      // paredes e teto: entram subindo dos cantos do chão e se encontram no meio do teto
      const x0 = G.X(SALA.x0), x1 = G.X(SALA.x1), yc = G.Y(CHAO), yt = G.Y(SALA.teto);
      const parede = yc - yt, meio = (x1 - x0) / 2, d = curvas.suave(construcao(q)) * (parede + meio);
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
          const f = (amb * 0.15 + i / 6) % 1;
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
    casa(c, G, q, cor, amb) {
      // Paredes e telhado com beiral, desenhados do chão até a cumeeira (e recolhidos na saída); por dentro,
      // a espessura da parede (é por ela que o sinal passa). Na casa pequena dos usos, a fachada: porta,
      // janela redonda e um sino de alarme que toca de vez em quando.
      const b = construcao(q), m = curvas.suave(b);
      const x0 = G.X(q.cx - q.larg / 2), x1 = G.X(q.cx + q.larg / 2), xm = G.X(q.cx);
      const yc = G.Y(CHAO), yt = G.Y(CHAO - q.alt), ya = G.Y(CHAO - q.alt - q.tel);
      const esp = Math.max(G.dpr * 2.5, (x1 - x0) * 0.035), incl = (yt - ya) / (xm - x0), beiral = (x1 - x0) * 0.07;
      const alfa = q.dir === -1 ? limitar(q.p * 2) : 1;
      c.globalAlpha = alfa; c.strokeStyle = cor.tinta; c.fillStyle = cor.tinta; c.lineJoin = 'round'; c.lineCap = 'round';
      c.lineWidth = PESO.principal * G.dpr;
      trajeto([[x0, yc], [x0, yt], [x0 - beiral, yt + beiral * incl], [xm, ya]]).tracar(c, m);
      trajeto([[x1, yc], [x1, yt], [x1 + beiral, yt + beiral * incl], [xm, ya]]).tracar(c, m);
      const kIn = curvas.suave(janela(b, 0.3, 0.9));
      if (kIn > 0) {
        const yai = ya + esp * 1.7, yRoof = (xx) => yai + incl * Math.abs(xm - xx);
        c.lineWidth = PESO.detalhe * G.dpr; c.globalAlpha = alfa * 0.85;
        trajeto([[x0 + esp, yc], [x0 + esp, yRoof(x0 + esp)], [xm, yai]]).tracar(c, kIn);
        trajeto([[x1 - esp, yc], [x1 - esp, yRoof(x1 - esp)], [xm, yai]]).tracar(c, kIn);
      }
      const fach = (q.fachada || 0) * curvas.entra(janela(b, 0.55, 1));
      if (fach > 0.01) {
        const larg = x1 - x0, alt = yc - yt;
        c.globalAlpha = alfa * fach; c.lineWidth = PESO.secundario * G.dpr;
        const pw = larg * 0.26, ph = alt * 0.6;                                 // porta, com maçaneta
        c.beginPath(); c.moveTo(xm - pw / 2, yc); c.lineTo(xm - pw / 2, yc - ph); c.lineTo(xm + pw / 2, yc - ph); c.lineTo(xm + pw / 2, yc); c.stroke();
        c.beginPath(); c.arc(xm + pw * 0.28, yc - ph * 0.48, Math.max(G.dpr, larg * 0.012), 0, 2 * Math.PI); c.fill();
        const jy = (yt + ya) / 2 + (yt - ya) * 0.12, jr = Math.min(larg * 0.06, (yt - ya) * 0.22);   // janela redonda no oitão
        c.beginPath(); c.arc(xm, jy, jr, 0, 2 * Math.PI); c.stroke();
        c.lineWidth = PESO.detalhe * G.dpr; linha(c, xm - jr, jy, xm + jr, jy); linha(c, xm, jy - jr, xm, jy + jr);
      }
      if (q.sino > 0.01) {
        // o sino do alarme, em cima da porta: de tempos em tempos ele balança e solta ondinhas de som
        const alt = yc - yt, sz = alt * 0.2, bx = xm, by = yc - alt * 0.6 - sz * 0.9;
        const ciclo = ((amb % 3.4) + 3.4) % 3.4, env = ciclo < 1.3 ? Math.sin(Math.PI * (ciclo / 1.3)) : 0;
        const ang = 0.34 * Math.sin(amb * 15) * env;
        c.globalAlpha = alfa * q.sino * curvas.entra(janela(b, 0.6, 1)); c.lineWidth = PESO.secundario * G.dpr;
        c.save(); c.translate(bx, by - sz * 0.55); c.rotate(ang);
        c.beginPath();
        c.moveTo(-sz * 0.5, sz * 0.85);
        c.quadraticCurveTo(-sz * 0.42, 0, 0, 0);
        c.quadraticCurveTo(sz * 0.42, 0, sz * 0.5, sz * 0.85);
        c.closePath(); c.stroke();
        c.beginPath(); c.arc(0, sz * 0.98, sz * 0.09, 0, 2 * Math.PI); c.fill();
        c.restore();
        if (env > 0.01) {
          c.lineWidth = PESO.detalhe * G.dpr;
          for (let i = 0; i < 2; i++) {
            const rr = sz * (0.75 + i * 0.32 + env * 0.12);
            c.globalAlpha = alfa * q.sino * env * (0.8 - i * 0.3);
            c.beginPath(); c.arc(bx, by, rr, -0.5, 0.5); c.stroke();
            c.beginPath(); c.arc(bx, by, rr, Math.PI - 0.5, Math.PI + 0.5); c.stroke();
          }
        }
      }
      c.lineCap = 'butt';
    },
    chao(c, G, q, cor) {
      const x0 = G.X(q.x0), x1 = G.X(q.x1), meio = (x0 + x1) / 2, b = construcao(q);
      const meia = ((x1 - x0) / 2) * (q.dir === 1 ? misturar(1, curvas.entra(b), q.cresce) : curvas.suave(b));
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
      // Entrando, cada caminho é desenhado de A até B, um depois do outro. Saindo, eles não somem:
      // são "puxados" para dentro da placa B (o começo corre até B), e a B dá um pulso. É a B que mede.
      const t = linear(q), sai = saindo(q);
      c.strokeStyle = cor.tinta; c.fillStyle = cor.tinta; c.lineJoin = 'round'; c.lineCap = 'round';
      lista.forEach((cm, i) => {
        const pk = curvas.suave(limitar(t * 1.9 - i * 0.3));
        const ini = curvas.suave(limitar(sai * 1.5 - i * 0.12));
        if (pk <= 0 || ini >= 1) return;
        const tr = trajeto(cm.pts);
        c.lineWidth = (cm.forte ? 1.5 : 1.1) * G.dpr;
        c.globalAlpha = cm.forte ? 0.9 : 0.42;
        tr.tracar(c, pk, ini);
        if (cm.forte && pk > 0.5 && ini < 0.45) {      // onde o sinal bate na pessoa
          c.globalAlpha = limitar(pk * 4 - 2) * (1 - ini * 2.2);
          c.beginPath(); c.arc(px, py, 4.5 * G.dpr, 0, 2 * Math.PI); c.stroke();
        }
        for (let j = 0; j < 2; j++) {
          const s = (amb * 0.3 + i * 0.27 + j * 0.5) % 1;
          if (s > pk || s < ini) continue;
          const [x, y] = tr.em(s);
          c.globalAlpha = Math.pow(Math.sin(Math.PI * s), 0.7) * (cm.forte ? 1 : 0.75);
          c.beginPath(); c.arc(x, y, (cm.forte ? 2.8 : 2.1) * G.dpr, 0, 2 * Math.PI); c.fill();
        }
      });
      const kp = janela(sai, 0.45, 1);
      if (kp > 0 && kp < 1) {                       // o pulso da placa B recebendo tudo
        c.lineWidth = PESO.secundario * G.dpr; c.globalAlpha = (1 - kp) * 0.9;
        c.beginPath(); c.arc(xb, ya, G.bh * TAM_PLACA * (0.35 + curvas.entra(kp) * 1.1), 0, 2 * Math.PI); c.stroke();
      }
      c.lineCap = 'butt';
    },
    pacotes(c, G, q, cor, amb, prm) {
      const A = prm.placaA, B = prm.placaB;
      if (!A || !B) return;
      const s = G.bh * TAM_PLACA, y = G.Y(Y_ANTENA);
      const xa = G.X(A.x) + s * 0.4, xb = G.X(B.x) - s * 0.4;
      const b = construcao(q), vis = curvas.entra(b), forca = q.dir === -1 ? q.p : limitar(b * 1.5);
      // pacotes: pontinhos com um brilho e um rastro curto, indo de A para B
      // (é um símbolo: 100 por segundo não daria para ver)
      const N = 11, fase = (amb * 0.14) % 1, R = 2.2 * G.dpr;
      for (let i = 0; i < N; i++) {
        const t = (i / N + fase) % 1;
        if (t > vis) continue;
        const env = Math.pow(Math.sin(Math.PI * t), 0.8) * forca, px = misturar(xa, xb, t);
        c.fillStyle = cor.tinta;
        for (let k = 3; k >= 1; k--) {
          const tk = t - k * 0.012;
          if (tk < 0) continue;
          c.globalAlpha = env * 0.24 * (1 - k / 4);
          c.beginPath(); c.arc(misturar(xa, xb, tk), y, R * (1 - k * 0.18), 0, 2 * Math.PI); c.fill();
        }
        const g = c.createRadialGradient(px, y, 0, px, y, R * 3.6);
        g.addColorStop(0, 'rgba(237, 237, 232, 0.32)'); g.addColorStop(1, 'rgba(237, 237, 232, 0)');
        c.globalAlpha = env; c.fillStyle = g;
        c.beginPath(); c.arc(px, y, R * 3.6, 0, 2 * Math.PI); c.fill();
        c.fillStyle = cor.tinta; c.beginPath(); c.arc(px, y, R, 0, 2 * Math.PI); c.fill();
      }
      // arcos que saem da placa A
      c.strokeStyle = cor.tinta; c.lineWidth = 1.1 * G.dpr;
      for (let i = 0; i < 3; i++) {
        const t = (amb * 0.45 + i / 3) % 1;
        c.globalAlpha = (1 - t) * 0.6 * q.p;
        c.beginPath(); c.arc(G.X(A.x), y, s * (0.55 + t * 1.6), -0.55, 0.55); c.stroke();
      }
    },
    roteador(c, G, q, cor, amb) {
      // Roteador de Wi-Fi: caixa de cantos arredondados, pezinhos, duas antenas e três luzes piscando em
      // sequência. `forma` 1 = vira a caixa da placa A (mesmo tamanho e lugar): é o mesmo tipo de rádio.
      const t = linear(q), forma = limitar(q.forma || 0), resto = 1 - forma;
      const s = G.bh * 0.085, sp = G.bh * TAM_PLACA, x = G.X(q.x), y = G.Y(q.y);
      const k = q.dir === 1 ? curvas.pop(janela(t, 0, 0.75)) : 1;
      const alfa = q.dir === -1 ? limitar(q.p * 1.5) : limitar(t * 3);
      const w = misturar(s * 1.7, sp * 0.58, forma) * k, h = misturar(s * 0.56, sp, forma) * k;
      c.strokeStyle = cor.tinta; c.fillStyle = cor.tinta; c.lineJoin = 'round'; c.lineCap = 'round';
      if (q.prat >= 0 && resto > 0.01) {      // prateleira presa na parede
        const xp = G.X(q.prat), yp = y + s * 0.28 + s * 0.1 + 1.5 * G.dpr;
        c.globalAlpha = alfa * 0.6 * resto; c.lineWidth = PESO.detalhe * G.dpr * 1.2;
        linha(c, xp, yp, misturar(xp, x + Math.sign(x - xp) * s * 1.2, k), yp);
      }
      c.globalAlpha = alfa; c.lineWidth = PESO.principal * G.dpr;
      c.beginPath(); retArred(c, x - w / 2, y - h / 2, w, h, misturar(h * 0.28, w * 0.09, forma)); c.stroke();
      if (resto <= 0.01) { c.lineCap = 'butt'; return; }
      c.globalAlpha = alfa * resto; c.lineWidth = PESO.secundario * G.dpr;
      const L = s * 1.0 * k * resto;
      for (const lado of [-1, 1]) {
        const bx = x + lado * w * 0.32, by = y - h / 2, tx = bx + lado * L * 0.16, ty = by - L;
        linha(c, bx, by, tx, ty);
        c.beginPath(); c.arc(tx, ty, Math.max(G.dpr * 1.3, s * 0.045), 0, 2 * Math.PI); c.fill();
        linha(c, x + lado * w * 0.3, y + h / 2, x + lado * w * 0.3, y + h / 2 + s * 0.1);   // pezinhos
      }
      const seq = (amb * 2.2) % 3, rl = Math.max(G.dpr * 1.1, s * 0.04);
      for (let i = 0; i < 3; i++) {
        const lx = x - w * 0.3 + i * w * 0.11, brilho = Math.max(0, 1 - Math.min(Math.abs(seq - i), 3 - Math.abs(seq - i)));
        c.globalAlpha = alfa * resto * (0.35 + 0.65 * brilho);
        c.beginPath(); c.arc(lx, y + h * 0.12, rl, 0, 2 * Math.PI); c.fill();
      }
      c.lineCap = 'butt';
    },
    camera(c, G, q, cor) {
      // câmera no canto do teto, olhando a pessoa; no fim da entrada ela é riscada
      // câmera de segurança: placa na parede, braço com junta, corpo com para-sol e lente
      const t = linear(q), sai = saindo(q);
      const alfa = q.dir === -1 ? 1 - curvas.sai(janela(sai, 0.4, 1)) : limitar(t * 2.5);
      const s = G.bh * 0.07, x = G.X(0.85), y = G.Y(SALA.teto + 0.1);
      const ang = Math.atan2(G.Y(0.72) - y, G.X(0.46) - x);
      // riscada no fim da entrada; na saída, o risco se desfaz antes da câmera sumir
      const risco = q.risco * (q.dir === 1 ? curvas.suave(janela(t, 0.5, 0.95)) : q.dir === -1 ? 1 - curvas.suave(janela(sai, 0, 0.45)) : 1);
      const k = q.dir === 1 ? curvas.pop(janela(t, 0, 0.55)) : 1;
      const xw = G.X(SALA.x1), yb = y - s * 0.78, xj = x + s * 0.5;
      c.globalAlpha = alfa; c.strokeStyle = cor.tinta; c.fillStyle = cor.tinta; c.lineJoin = 'round'; c.lineCap = 'round';
      c.lineWidth = PESO.secundario * G.dpr;
      c.beginPath(); retArred(c, xw - s * 0.13, yb - s * 0.26, s * 0.13, s * 0.52, s * 0.03); c.stroke();
      linha(c, xw - s * 0.13, yb, xj + s * 0.08, yb);
      c.beginPath(); c.arc(xj, yb, s * 0.08, 0, 2 * Math.PI); c.stroke();
      linha(c, xj - s * 0.03, yb + s * 0.08, x + s * 0.12, y - s * 0.3 * k);
      c.save(); c.translate(x, y); c.rotate(ang); c.scale(k, k);
      c.lineWidth = PESO.principal * G.dpr;
      c.beginPath(); retArred(c, -s * 0.85, -s * 0.3, s * 1.32, s * 0.6, s * 0.13); c.stroke();
      c.lineWidth = PESO.secundario * G.dpr;
      c.beginPath(); c.moveTo(-s * 0.72, -s * 0.42); c.lineTo(s * 0.62, -s * 0.42); c.lineTo(s * 0.74, -s * 0.3); c.stroke();   // para-sol
      c.beginPath(); c.arc(s * 0.47, 0, s * 0.19, 0, 2 * Math.PI); c.stroke();                                              // lente
      c.lineWidth = PESO.detalhe * G.dpr;
      c.beginPath(); c.arc(s * 0.47, 0, s * 0.08, 0, 2 * Math.PI); c.stroke();
      c.beginPath(); c.arc(-s * 0.58, -s * 0.1, s * 0.045, 0, 2 * Math.PI); c.fill();                                        // luz de "gravando"
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
      c.lineCap = 'butt';
    },
    placaA(c, G, q, cor, amb, prm) { desenharPlaca(c, G, q, cor, 'A', ledPacotes(amb, prm)); },
    placaB(c, G, q, cor, amb, prm) { desenharPlaca(c, G, q, cor, 'B', ledPacotes(amb, prm)); },
    icones(c, G, q, cor, amb) {
      // Os três usos: o aviso de queda (um sinal de alerta saindo da pessoa caída), a luminária que apaga
      // sozinha quando a sala fica vazia (e volta) e os nomes embaixo. O alarme é o sino da casa.
      const b = construcao(q), alfa = q.dir === -1 ? q.p : limitar(b * 2);
      const x = G.X(0.5), yc = G.Y(CHAO), s = G.bh * 0.05, ytopo = G.Y(0.47), ybase = ytopo + s * 0.95;
      c.globalAlpha = alfa; c.strokeStyle = cor.tinta; c.fillStyle = cor.tinta; c.lineJoin = 'round'; c.lineCap = 'round';
      // luminária de chão: base, haste, cúpula e lâmpada
      const kh = curvas.entra(janela(b, 0, 0.5)), kc = curvas.pop(janela(b, 0.35, 0.8));
      c.lineWidth = PESO.principal * G.dpr;
      c.beginPath(); c.ellipse(x, yc, s * 0.75 * kh + 0.01, s * 0.17 * kh + 0.01, 0, Math.PI, 2 * Math.PI); c.stroke();
      linha(c, x, yc - s * 0.17 * kh, x, misturar(yc, ybase, kh));
      if (kc > 0) {
        c.save(); c.translate(x, ybase); c.scale(kc, kc);
        c.beginPath(); c.moveTo(-s * 0.48, -s * 0.95); c.lineTo(s * 0.48, -s * 0.95); c.lineTo(s * 1.05, 0);
        c.quadraticCurveTo(0, s * 0.16, -s * 1.05, 0); c.closePath(); c.stroke();
        c.restore();
        // a luz: acesa 4 s, apaga devagar, fica apagada um pouco e volta
        const ciclo = ((amb % 7) + 7) % 7;
        const luz = ciclo < 4 ? 1 : ciclo < 4.8 ? 1 - curvas.suave((ciclo - 4) / 0.8) : ciclo < 6.2 ? 0 : curvas.suave((ciclo - 6.2) / 0.8);
        const acesa = luz * curvas.entra(janela(b, 0.6, 1));
        c.lineWidth = PESO.secundario * G.dpr;
        c.beginPath(); c.arc(x, ybase + s * 0.12, s * 0.2 * kc, 0, Math.PI); c.stroke();
        if (acesa > 0.01) {
          c.globalAlpha = alfa * acesa; c.beginPath(); c.arc(x, ybase + s * 0.12, s * 0.2 * kc, 0, Math.PI); c.fill();
          const g = c.createLinearGradient(0, ybase, 0, yc);
          g.addColorStop(0, 'rgba(237, 237, 232, 0.2)'); g.addColorStop(1, 'rgba(237, 237, 232, 0)');
          c.fillStyle = g; c.globalAlpha = alfa * acesa;
          c.beginPath(); c.moveTo(x - s * 1.0, ybase + s * 0.05); c.lineTo(x + s * 1.0, ybase + s * 0.05); c.lineTo(x + s * 2.9, yc); c.lineTo(x - s * 2.9, yc); c.closePath(); c.fill();
          c.fillStyle = cor.tinta;
        }
      }
      // alerta de queda: arcos subindo da pessoa caída, um depois do outro
      const ka = curvas.entra(janela(b, 0.85, 1));       // só depois que a pessoa terminou de cair
      if (ka > 0.01) {
        const ax = G.X(0.2), ay = G.Y(CHAO - 0.075), fa = (amb * 0.8) % 1;
        c.lineWidth = PESO.secundario * G.dpr;
        for (let i = 0; i < 3; i++) {
          const ff = (fa + i / 3) % 1;
          c.globalAlpha = alfa * ka * Math.sin(Math.PI * ff) * 0.85;
          c.beginPath(); c.arc(ax, ay, s * (0.35 + ff * 1.0), -Math.PI * 0.78, -Math.PI * 0.22); c.stroke();
        }
      }
      c.lineCap = 'butt';
      c.globalAlpha = alfa * limitar(b * 2 - 0.8);
      for (const [u, txt] of [[0.2, 'queda'], [0.5, 'luz'], [0.8, 'alarme']]) rotulo(c, G, cor, txt, G.X(u), G.Y(CHAO + 0.045));
    },
    vulto(c, G, q, cor, amb) {
      // alguém do lado de fora, com um aparelho na mão
      const t = linear(q);
      desenharPessoa(c, G, cor, {
        x: q.x + (q.dir === 1 ? (1 - curvas.entra(t)) * 0.12 : 0), alfa: q.dir === -1 ? q.p : limitar(t * 2.5), dirx: -1,
        amp: q.dir === 1 ? limitar((1 - t) * 2.5) : 0, fase: amb * 7, cor: cor.apagado, ergue: curvas.suave(janela(t, 0.6, 1)), aparelho: true,
      });
    },
    pessoa(c, G, q, cor, amb) {
      // entrando, ela chega andando pela direita; se muda de lugar entre cenas, anda até lá
      const t = linear(q);
      let x = q.x, amp = 0, alfa = 1, fan = q.fantasma, dirx = -1;
      let dei = q.deitada;
      if (q.dir === 1) {
        x += (1 - curvas.entra(t)) * 0.3; amp = limitar((1 - t) * 2.5); alfa = limitar(t * 3);
        fan *= janela(t, 0.75, 1); dei *= curvas.sai(janela(t, 0.62, 0.9));     // entra andando; se a pose é caída, cai no fim
      } else if (q.dir === -1) alfa = q.p;
      if (q.vx) {
        const andando = limitar(Math.abs(q.vx) * 8) * Math.sin(Math.PI * limitar(q.km));
        if (andando > amp) { amp = andando; dirx = Math.sign(q.vx); }
      }
      if (q.andar > 0.001) {      // anda de um lado para o outro entre as placas, sem parar
        const f = amb * 0.5;
        x += q.andar * 0.2 * Math.sin(f);
        amp = Math.max(amp, q.andar * limitar(Math.abs(Math.cos(f)) * 1.6));
        dirx = Math.cos(f) >= 0 ? 1 : -1;
      }
      desenharPessoa(c, G, cor, { x, esc: q.esc, deitada: dei, fantasma: fan, alfa, amp, fase: amb * 7, halo: true, dirx });
    },
    notebook(c, G, q, cor, amb, prm) {
      // A tela (cantos arredondados, câmera em cima) se desenha em volta das linhas, depois a base com o
      // teclado e o touchpad, e por fim o cabo que vem da placa B. Na saída, tudo se desfaz ao contrário.
      const b = construcao(q), alfa = q.dir === -1 ? limitar(q.p * 2) : 1;
      const x0 = G.X(NOTE.x0), x1 = G.X(NOTE.x1), y0 = G.Y(NOTE.y0), y1 = G.Y(NOTE.y1), yc = G.Y(CHAO);
      c.globalAlpha = alfa; c.strokeStyle = cor.tinta; c.fillStyle = cor.tinta; c.lineJoin = 'round'; c.lineCap = 'round';
      c.lineWidth = PESO.principal * G.dpr;
      trajeto(contornoRet(x0, y0, x1 - x0, y1 - y0, (x1 - x0) * 0.035)).tracar(c, curvas.suave(janela(b, 0.05, 0.6)));
      const kd = curvas.entra(janela(b, 0.4, 0.75));
      if (kd > 0) {
        c.globalAlpha = alfa * kd;
        c.beginPath(); c.arc((x0 + x1) / 2, y0 + G.bh * NOTE.borda * 0.72, Math.max(G.dpr, G.bh * 0.004), 0, 2 * Math.PI); c.fill();
      }
      const kb = curvas.suave(janela(b, 0.45, 0.8));
      if (kb > 0) {
        const meio = (x0 + x1) / 2, at = ((x1 - x0) / 2) * kb, ab = ((x1 - x0) / 2 + G.bw * 0.024) * kb, yb = y1 + G.bh * 0.006;
        c.globalAlpha = alfa; c.lineWidth = PESO.principal * G.dpr;
        c.beginPath(); c.moveTo(meio - at, yb); c.lineTo(meio + at, yb); c.lineTo(meio + ab, yc); c.lineTo(meio - ab, yc); c.closePath(); c.stroke();
        const kt = curvas.entra(janela(b, 0.65, 0.95));
        if (kt > 0) {
          // teclado (duas fileiras de teclas) e touchpad, em perspectiva
          c.globalAlpha = alfa * kt * 0.7; c.lineWidth = PESO.detalhe * G.dpr; tracejado(c, G, false);
          c.setLineDash([2.2 * G.dpr, 1.6 * G.dpr]);
          for (const f of [0.3, 0.55]) { const yy = misturar(yb, yc, f), aa = misturar(at, ab, f) * 0.82; linha(c, meio - aa, yy, meio + aa, yy); }
          c.setLineDash([]);
          const ty = misturar(yb, yc, 0.68), th = (yc - yb) * 0.22, tw = (x1 - x0) * 0.16;
          c.strokeRect(meio - tw / 2, ty, tw, th);
        }
      }
      const B = prm.placaB, kc = curvas.suave(janela(b, 0.6, 1));
      if (B && kc > 0) {
        const s = G.bh * TAM_PLACA * (B.esc ?? 1), xb = G.X(B.x) + s * 0.31, yb = G.Y(Y_ANTENA) + s * 0.3;
        const xf = x0 - G.bw * 0.008, yf = y1 - G.bh * 0.02, cx = (xb + xf) / 2, cy = yc + G.bh * 0.01;
        const pts = [];
        for (let i = 0; i <= 24; i++) { const u = i / 24, v = 1 - u; pts.push([v * v * xb + 2 * u * v * cx + u * u * xf, v * v * yb + 2 * u * v * cy + u * u * yf]); }
        c.lineWidth = 1.2 * G.dpr; c.globalAlpha = alfa * 0.7;
        trajeto(pts).tracar(c, kc);
      }
      c.lineCap = 'butt';
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
    pilha(c, G, q, cor, amb, prm, ex) {
      const { ls, frac } = pilhaSint(amb, q.agito, q.roteiro);
      c.globalAlpha = q.dir === -1 ? q.p : 1;
      if (ex && ex.varredura !== null && q.dir === -1) {      // na varredura, fica inteira à direita da linha
        c.globalAlpha = 1; c.beginPath(); c.rect(ex.varredura, G.Y(-0.1), G.bw * 1.2, G.bh * 1.2); c.clip();
      }
      const r = { x: G.X(q.px), y: G.Y(q.py), w: q.pw * G.bw, h: q.ph * G.bh };
      // numa área pequena (a tela do notebook), o traço afina junto
      const esp = 1.4 * G.dpr * misturar(0.55, 1, limitar((q.ph - 0.2) / 0.4));
      const teto = q.teto > 0 ? G.Y(q.teto) : null;
      if (teto !== null) { c.save(); c.beginPath(); c.rect(G.X(-0.1), teto, G.bw * 1.2, G.bh * 1.2); c.clip(); }
      desenharLinhas(c, r, ls, frac, cor, esp, { visiveis: q.dir === 1 ? q.p * 50 : Infinity, destaque: true, relevo: q.relevo, juntar: q.juntar });
      if (teto !== null) {
        // o relevo que sobe demais some num degradê, embaixo da sala em miniatura
        c.restore();
        const g = c.createLinearGradient(0, teto, 0, teto + G.bh * 0.07);
        g.addColorStop(0, cor.fundo); g.addColorStop(1, 'rgba(11, 11, 10, 0)');
        c.globalAlpha = 1; c.fillStyle = g; c.fillRect(G.X(-0.05), teto - 1, G.bw * 1.1, G.bh * 0.07 + 1);
      }
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
    medidor(c, G, q, cor, amb, prm, ex) {
      const t = linear(q), r = { x: G.X(0), y: G.Y(MEDIDOR.y), w: G.bw, h: MEDIDOR.h * G.bh };
      if (ex.varredura !== null && q.dir === -1) {
        c.beginPath(); c.rect(ex.varredura, G.Y(-0.1), G.bw * 1.2, G.bh * 1.2); c.clip();
        desenharMedidor(c, G, cor, r, medidaSint(amb), 1, 1);
        return;
      }
      desenharMedidor(c, G, cor, r, medidaSint(amb), q.dir === -1 ? q.p : limitar(t * 2), q.dir === 1 ? curvas.suave(t) : 1);
    },
    vivo(c, G, q, cor, amb, prm, ex) {
      // as linhas e o número da tela de verdade; sem fonte ligada, volta para a ilustração (e a etiqueta avisa)
      const dv = ex.vivo, real = ex.vivoReal, varrendo = ex.varredura !== null && q.dir === 1;
      const alfa = q.dir === -1 ? q.p : 1;
      if (varrendo) { c.beginPath(); c.rect(G.X(-0.2), G.Y(-0.1), ex.varredura - G.X(-0.2), G.bh * 1.2); c.clip(); }
      const { ls, frac } = real ? { ls: dv.leituras.slice(-49), frac: limitar(dv.frac || 0) } : pilhaSint(amb, 0, 1);
      c.globalAlpha = alfa;
      desenharLinhas(c, { x: G.X(0), y: G.Y(q.py), w: G.bw, h: q.ph * G.bh }, ls, frac, cor, 1.4 * G.dpr, { visiveis: q.dir === 1 && !varrendo ? q.p * 50 : Infinity, destaque: true });
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
      desenharMedidor(c, G, cor, { x: G.X(0), y: G.Y(MEDIDOR.y), w: G.bw, h: MEDIDOR.h * G.bh }, d, alfa * q.med * (q.dir === 1 && !varrendo ? limitar(q.p * 2 - 1) : 1));
    },
    grade(c, G, q, cor, amb, prm, ex) {
      // As gravações: 4 situações × 4 sessões. Cheias ajustam o limite, tracejadas só testam.
      // `junta` (indo para os resultados): as de teste deslizam e se empilham dentro da barra do resultado,
      // as de ajuste somem. O resultado vem só das gravações de teste.
      const t = linear(q), alfa = q.dir === -1 ? q.p : 1, jt = limitar(q.junta || 0);
      const ag = curvas.suave(janela(t, 0.62, 1)) * q.agrupar;
      const ANTES = [0.2, 0.4, 0.6, 0.8], DEPOIS = [0.2, 0.63, 0.39, 0.82], w = 0.17, h = 0.13;
      const R = ex.resultados, tem = R && typeof R.acerto === 'number' && typeof R.chute === 'number';
      const barH = (tem ? R.acerto : 0.55) * RES.alt * G.bh, slot = barH / 8, bx = G.X(RES.x), bw = RES.w * G.bw;
      const somem = 1 - limitar(jt * 2.4);
      ['vazio', 'parado', 'andando', 'queda'].forEach((nome, r) => {
        const y = 0.2 + r * 0.17;
        c.globalAlpha = alfa * limitar(t * 3 - r * 0.3) * somem;
        if (somem > 0.01) rotulo(c, G, cor, nome, G.X(0), G.Y(y + h / 2), { alinhar: 'left', base: 'middle' });
        for (let s = 0; s < 4; s++) {
          const pk = curvas.entra(limitar(t * 2.4 - (s * 0.2 + r * 0.08)));
          if (pk <= 0) continue;
          const teste = s % 2 === 1;
          if (!teste && somem <= 0.01) continue;
          // as sessões 2 e 3 trocam de lugar como cartas: uma passa por cima, a outra por baixo, meio apagadas
          const troca = s === 1 || s === 2 ? Math.sin(Math.PI * ag) * (1 - jt) : 0;
          let rx = G.X(misturar(ANTES[s], DEPOIS[s], ag)), rw = w * G.bw, rh = h * G.bh;
          let ry = G.Y(y) + (1 - pk) * G.bh * 0.03 + (s === 1 ? 1 : -1) * troca * G.bh * 0.022;
          let a = alfa * pk * (1 - 0.55 * troca);
          if (teste && jt > 0) {
            const j = r * 2 + (s === 3 ? 1 : 0), kj = curvas.suave(limitar(jt * 1.5 - j * 0.06));
            const tx = bx + bw * 0.06, ty = G.Y(CHAO) - (j + 1) * slot + slot * 0.12, tw = bw * 0.88, th = slot * 0.76;
            rx = misturar(rx, tx, kj); ry = misturar(ry, ty, kj); rw = misturar(rw, tw, kj); rh = misturar(rh, th, kj);
          } else if (!teste) {
            a *= somem;
            const cx = rx + rw / 2, cy = ry + rh / 2, e = misturar(1, 0.85, 1 - somem);
            rw *= e; rh *= e; rx = cx - rw / 2; ry = cy - rh / 2;
          }
          c.globalAlpha = a; c.strokeStyle = cor.tinta; c.lineWidth = 1.2 * G.dpr;
          tracejado(c, G, teste); c.strokeRect(rx, ry, rw, rh); tracejado(c, G, false);
          if (rh > G.dpr * 6) desenharLinhas(c, { x: rx + rw * 0.04, y: ry + rh * 0.2, w: rw * 0.92, h: rh * 0.72 }, gravacoes()[r][s], 0, cor, G.dpr, { linhas: 5, alturaRelevo: 2.4 });
        }
      });
      c.globalAlpha = alfa * ag * somem;
      rotulo(c, G, cor, 'ajustam o limite', G.X(0.2 + (0.39 + w - 0.2) / 2), G.Y(0.12), { cor: cor.tinta, base: 'alphabetic' });
      rotulo(c, G, cor, 'só testam', G.X(0.63 + (0.82 + w - 0.63) / 2), G.Y(0.12), { cor: cor.tinta, base: 'alphabetic' });
    },
    resultado(c, G, q, cor, amb, prm, ex) {
      // acerto do sistema ao lado do chute; sem números ainda, só os contornos com "?". As barras crescem
      // da base na entrada e voltam para a base na saída.
      const R = ex.resultados, tem = R && typeof R.acerto === 'number' && typeof R.chute === 'number';
      const t = construcao(q), alfa = q.dir === -1 ? limitar(q.p * 2) : limitar(t * 2.5);
      const base = G.Y(CHAO), alt = G.bh * RES.alt, w = G.bw * RES.w;
      c.globalAlpha = alfa * 0.55; c.strokeStyle = cor.tinta; c.lineWidth = G.dpr;
      linha(c, G.X(0.18), base, G.X(0.94), base);
      [{ u: RES.x, v: tem ? R.acerto : null, nome: 'Wave Sense' }, { u: RES.x2, v: tem ? R.chute : null, nome: 'chute' }].forEach((b, i) => {
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
  };

  // Poses de cada cena (por id). Camada ausente = invisível. `entrada`/`saida` mudam a janela daquela
  // camada; `mover` muda a janela das mudanças (uma lista [a, b] ou uma por parâmetro: { x: [a, b], _: [a, b] }).
  // saída rápida da sala em miniatura, para as linhas terem espaço para subir
  const SAI_MINI = {
    chao: { p: 0, saida: [0.04, 0.34] }, placaA: { p: 0, saida: [0.04, 0.34] }, placaB: { p: 0, saida: [0.04, 0.34] },
    pacotes: { p: 0, saida: [0.02, 0.26] }, pessoa: { p: 0, saida: [0.02, 0.3] },
  };
  const PILHA_VIRA_CHAO = { p: 0, relevo: 0, juntar: 1, py: CHAO - PILHA.h, mover: [0.04, 0.42], saida: [0.36, 0.5] };
  // As composições mudam junto com a linha do tempo. O motor de curvas continua o mesmo.
  const LATERAL = { x: 0.45, y: 0.17, w: 0.50, h: 0.64, prop: 1.45 };
  const PANORAMA = { x: 0.06, y: 0.43, w: 0.88, h: 0.43, prop: 3.4 };
  const editorial = (layout) => ({ composicao: layout, editorial: {} });
  const POSES = {
    abertura: editorial(LATERAL),
    mensagem: editorial(LATERAL),
    caminhos: editorial(PANORAMA),
    mistura: editorial(PANORAMA),
    acorde: editorial(PANORAMA),
    linhas: editorial(LATERAL),
    calibracao: editorial(PANORAMA),
    aovivo: { composicao: LATERAL, editorial: { p: 0 }, vivo: { py: 0.02, ph: 0.52, med: 1, entrada: [0.35, 0.86] } },
    metodo: editorial(PANORAMA),
    limites: editorial(LATERAL),
    aplicacao: editorial(PANORAMA),
    privacidade: editorial(PANORAMA),
    fim: editorial(LATERAL),
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
.h-textos { position: absolute; inset: 0; pointer-events: none; }
.h-texto { position: absolute; left: calc(var(--h-margem) + var(--h-seguro)); bottom: calc(var(--h-margem-b) + var(--h-seguro)); width: min(36vw, 700px); visibility: hidden; }
.h-titulo { font-family: var(--serif, "Instrument Serif", Georgia, serif); font-weight: 400; font-size: clamp(38px, 4.3vw, 92px); line-height: 1.0; letter-spacing: -0.012em; margin: 0 0 0.45em; text-wrap: balance; }
.h-frase { margin: 0; font-size: clamp(16px, 1.25vw, 24px); line-height: 1.4; color: var(--h-apagado); max-width: 36ch; text-wrap: pretty; }
.h-m { display: inline-block; overflow: hidden; vertical-align: bottom; padding: 0.12em 0.05em 0.22em; margin: -0.12em -0.05em -0.22em; }
.h-p { display: inline-block; will-change: transform; }
.h-enf { white-space: nowrap; }
.h-sub { position: relative; display: inline-block; }
.h-sub::after { content: ''; position: absolute; left: 0.02em; right: 0.02em; bottom: 0.06em; height: max(2px, 0.042em); background: currentColor;
  transform-origin: 0 50%; transform: scaleX(var(--sub, 1)); }
.h-topo { position: absolute; top: calc(clamp(16px, 3vw, 40px) + var(--h-seguro)); left: calc(var(--h-margem) + var(--h-seguro)); right: calc(var(--h-margem) + var(--h-seguro));
  display: flex; justify-content: space-between; font-family: var(--mono, "Geist Mono", monospace); font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--h-apagado); pointer-events: none; }
.h-ilustra { opacity: 0; }
.h-progresso { position: absolute; left: calc(var(--h-margem) + var(--h-seguro)); right: calc(var(--h-margem) + var(--h-seguro)); bottom: calc(clamp(18px, 3vh, 32px) + var(--h-seguro)); height: 1px; background: rgba(138, 138, 132, 0.28); pointer-events: none; }
.h-progresso i { display: block; height: 100%; background: var(--h-tinta); transform-origin: 0 50%; transform: scaleX(0); }
.h-cortina { position: absolute; inset: 0; background: #000; opacity: 0; pointer-events: none; }
.h-controles { position: absolute; right: calc(var(--h-margem) + var(--h-seguro)); bottom: calc(clamp(28px, 5vh, 48px) + var(--h-seguro)); display: flex; gap: 8px; }
.h-controles button { background: transparent; color: var(--h-tinta); border: 1px solid rgba(138, 138, 132, 0.5); border-radius: 999px; min-width: 44px; height: 44px; padding: 0 12px; font-size: 18px; cursor: pointer; }
.h-notas { position: absolute; left: calc(var(--h-margem) + var(--h-seguro)); right: calc(var(--h-margem) + var(--h-seguro)); top: calc(clamp(40px, 6vh, 72px) + var(--h-seguro));
  max-width: 980px; padding: 14px 18px; border-left: 2px solid #8A8A84; background: rgba(21, 21, 20, 0.92); color: #EDEDE8; font-size: 16px; line-height: 1.45; pointer-events: none; }
.h-notas b { display: block; font-family: var(--mono, "Geist Mono", monospace); font-weight: 400; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #8A8A84; margin-bottom: 6px; }
.h-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.historia.miniatura .h-topo, .historia.miniatura .h-controles { display: none; }
.historia.miniatura { container-type: inline-size; }
.historia.miniatura .h-texto { width: 36%; }
.historia.miniatura .h-titulo { font-size: 3.6cqw; }
.historia.miniatura .h-frase { font-size: 1.15cqw; }
@media (max-aspect-ratio: 11/10) {
  .historia:not(.miniatura) .h-titulo { font-size: clamp(30px, 8.5vw, 64px); }
}
.h-texto[data-layout="panorama"] { top: calc(13vh + var(--h-seguro)); bottom: auto; width: 88%; max-width: 1320px; }
.h-texto[data-layout="panorama"] .h-titulo { font-size: clamp(36px, 4.1vw, 82px); margin-bottom: 0.24em; }
.h-texto[data-layout="panorama"] .h-frase { max-width: 78ch; }
.h-experimento { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 20px; pointer-events: auto; }
.h-experimento button { font: inherit; font-size: 15px; padding: 10px 20px; border: 1px solid var(--h-apagado); border-radius: 999px; color: var(--h-tinta); background: transparent; cursor: pointer; }
.h-experimento button[aria-pressed="true"] { background: var(--h-tinta); color: var(--h-fundo); }
.historia button:focus-visible { outline: 2px solid var(--h-tinta); outline-offset: 4px; }
.h-notas { overflow: auto; max-height: 60vh; pointer-events: auto; border-color: var(--h-tinta); }
.h-notas p { margin: 8px 0 18px; }
.h-notas b { margin-bottom: 4px; }
.historia.miniatura .h-texto[data-layout="panorama"] { top: 13%; width: 88%; }
.historia.miniatura .h-texto[data-layout="panorama"] .h-titulo { font-size: 3.9cqw; }
@media (max-aspect-ratio: 11/10) {
  .historia:not(.miniatura) .h-texto, .historia:not(.miniatura) .h-texto[data-layout="panorama"] { left: var(--h-margem); right: var(--h-margem); width: auto; top: auto; bottom: 115px; }
  .historia:not(.miniatura) .h-texto[data-layout="panorama"] .h-titulo { font-size: clamp(30px, 8.5vw, 64px); }
  .h-enf { white-space: normal; }
  .h-topo { font-size: 10px; gap: 14px; }
  .h-ilustra { text-align: right; }
  .h-controles { left: var(--h-margem); right: auto; bottom: 44px; }
}
@media (prefers-reduced-motion: reduce) { .h-p { will-change: auto; } }
`;

  function injetarCSS() {
    if (typeof document === 'undefined' || document.getElementById('historia-css')) return;
    const s = document.createElement('style');
    s.id = 'historia-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function escapar(t) { return String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
  const semMarcas = (t) => String(t).replace(/\*/g, '');
  // O texto em palavras, cada uma numa máscara (para entrar e sair deslizando). Um trecho entre *asteriscos*
  // é a palavra-chave: vira uma unidade só, que não quebra linha e ganha um sublinhado que se desenha.
  function palavras(texto) {
    const partes = String(texto).split(/(\*[^*]+\*)/);
    let html = '';
    for (let i = 0; i < partes.length; i++) {
      const parte = partes[i];
      if (/^\*[^*]+\*$/.test(parte)) {
        // pontuação colada depois do trecho (".", "?") vai junto, sem sublinhado, para não ficar sozinha na linha
        const seguinte = partes[i + 1] || '', cola = (seguinte.match(/^\S+/) || [''])[0];
        partes[i + 1] = seguinte.slice(cola.length);
        html += `<span class="h-m h-enf"><span class="h-p"><span class="h-sub">${escapar(parte.slice(1, -1))}</span>${escapar(cola)}</span></span>`;
      } else {
        html += parte.split(/(\s+)/).map((tk) => (!tk ? '' : /^\s+$/.test(tk) ? ' ' : `<span class="h-m"><span class="h-p">${escapar(tk)}</span></span>`)).join('');
      }
    }
    return html;
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
<div class="h-textos"></div>
<div class="h-topo"><span class="h-cap"></span><span class="h-ilustra">Ilustração</span></div>
<div class="h-progresso" aria-hidden="true"><i></i></div>
<div class="h-controles"><button type="button" data-acao="repetir" aria-label="Repetir animação da cena">Repetir</button><button type="button" data-acao="anterior" aria-label="Cena anterior">←</button><button type="button" data-acao="proxima" aria-label="Próxima cena">→</button><button type="button" data-acao="fechar" aria-label="Fechar">✕</button></div>
<div class="h-notas" hidden></div>
<div class="h-cortina" aria-hidden="true"></div>
<div class="h-sr" aria-live="polite"></div>`;
    const cv = el.querySelector('.h-palco'), ctx = cv.getContext('2d');
    const elTextos = el.querySelector('.h-textos'), elCap = el.querySelector('.h-cap'), elIlustra = el.querySelector('.h-ilustra');
    const elBarra = el.querySelector('.h-progresso i'), elCortina = el.querySelector('.h-cortina'), elSr = el.querySelector(':scope > .h-sr');
    const elNotas = el.querySelector('.h-notas');

    const temPose = (c) => Boolean(POSES[c.id]);
    const st = {
      aberta: miniatura, versao: opcoes.versao || 'completa', ordem: [], blocos: [],
      T: 0, v: 0, alvo: 0, ultimo: 0, congelado: null, quadroPedido: false,
      rolando: null, direcao: 0, toque: null, corte: null, preto: false, anunciado: -1,
      cache: { tam: [0, 0] }, escala: 1, auto: null, notas: false, fonte: null, suave: { v: NaN },
      cenaRelogio: null, cenaDesde: 0,
      anim: null,   // transição em andamento (setas, passador, apresentador, encaixe): { t0, de, para, D, m0 }
    };
    // Setas e passador: cada transição dura TRANSICAO_S segundos (ajustável no roteiro.js).
    // Rolagem e toque: uma mola segue o dedo (OMEGA_ROLAGEM) e, ao soltar, a transição encaixa na cena.
    const TRANSICAO_S = roteiro.transicao > 0 ? roteiro.transicao : 2.6;
    const OMEGA_ROLAGEM = 7.5;
    const relogio = () => (st.congelado !== null ? st.congelado : performance.now() / 1000);

    // A cena ao vivo diz de onde vem o sinal (placas, simulação ou gravação): nunca "ao vivo" com dado simulado.
    function fonteAtual() { const dv = dadosVivos(); return (dv && dv.fonte) || null; }
    const conteudoDe = (c) => roteiro.conteudo(c, fonteAtual());
    const tituloDe = (c) => conteudoDe(c).titulo;
    const fraseDe = (c) => conteudoDe(c).frase;
    function montarTextos() {
      st.ordem = ordemDa(roteiro.cenas, st.versao, temPose);
      st.fonte = fonteAtual();
      elTextos.innerHTML = st.ordem.map((id) => {
        const c = roteiro.cenas.find((x) => x.id === id);
        const botoes = !miniatura && id === 'aovivo' && st.fonte === 'sim' ? '<div class="h-experimento"><button type="button" data-acao="mover" aria-pressed="false">Mover</button><button type="button" data-acao="parar" aria-pressed="false">Parar</button><span class="h-sr">Controles de movimento simulado</span></div>' : '';
        return `<div class="h-texto" data-id="${id}" data-layout="${c.layout || 'lateral'}"><h2 class="h-titulo">${palavras(tituloDe(c))}</h2><p class="h-frase">${palavras(fraseDe(c))}</p>${botoes}</div>`;
      }).join('');
      st.blocos = [...elTextos.children].map((b) => ({
        el: b, tit: [...b.querySelectorAll('.h-titulo .h-p')], fra: [...b.querySelectorAll('.h-frase .h-p')], vis: null, ult: new Map(),
        enf: [...b.querySelectorAll('.h-titulo .h-enf > .h-p')], sub: null,
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
      const prm = poseEm(st.T, st.ordem, POSES, PADROES);
      const layout = prm.composicao || LATERAL;
      let fx, fy, fw, fh;
      if (W / H > 1.1) { fx = W * layout.x; fy = H * layout.y + seguro; fw = W * layout.w - seguro; fh = H * layout.h - seguro; }
      else { fx = W * 0.06; fy = H * 0.08 + seguro; fw = W * 0.88; fh = H * 0.42; }
      const prop = W / H > 1.1 ? layout.prop : 1.45, bw = Math.min(fw, fh * prop), bh = bw / prop;
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
        if (t >= 0.22 && !st.corte.pulou) { st.T = st.alvo = st.corte.alvo; st.v = 0; st.anim = null; st.corte.pulou = true; }
        const op = t < 0.22 ? t / 0.22 : 1 - limitar((t - 0.22) / 0.33);
        elCortina.style.opacity = String(Math.max(st.preto ? 1 : 0, op));
        if (t > 0.55) st.corte = null;
      } else elCortina.style.opacity = st.preto ? '1' : '0';
      if (!st.corte || st.corte.pulou) {
        if (st.anim) {
          const a = st.anim, s = (agora - a.t0) / a.D;
          if (s >= 1) { st.T = a.para; st.v = 0; st.anim = null; }
          else { st.T = a.de + (a.para - a.de) * transicao(s, a.m0); st.v = ((a.para - a.de) * inclinacaoTransicao(s, a.m0)) / a.D; }
        } else [st.T, st.v] = mola(st.T, st.v, st.alvo, dt, OMEGA_ROLAGEM);
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
      const indiceVisual = Math.min(ultimaCena(), prm._i + (prm._u >= 0.5 ? 1 : 0));
      if (st.cenaRelogio !== st.ordem[indiceVisual]) { st.cenaRelogio = st.ordem[indiceVisual]; st.cenaDesde = agora; }
      const ex = { tempoCena: Math.max(0, agora - st.cenaDesde), reduz: Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
        cenaDe: st.ordem[prm._i], cenaPara: st.ordem[Math.min(ultimaCena(), prm._i + 1)], vivo: dv, vivoReal: Boolean(dv && dv.fonte && dv.leituras && dv.leituras.length > 1), resultados: roteiro.RESULTADOS, suave: st.suave };
      // Do número de exemplo para o sinal de verdade: uma linha varre da esquerda para a direita; à esquerda
      // dela já é o sinal das placas, à direita ainda é a ilustração (só quando o layout é o mesmo).
      const varre = prm.vivo && prm.vivo.dir === 1 && prm.medidor && prm.medidor.dir === -1 && prm.pilha ? curvas.suave(prm.vivo.lin) : null;
      ex.varredura = varre === null ? null : G.X(-0.02 + 1.04 * varre);
      if (fonteAtual() !== st.fonte) { montarTextos(); st.anunciado = -1; if (st.notas) mostrarNotas(); }
      let sintetica = 0;
      for (const nome of Object.keys(CAMADAS)) {
        const q = prm[nome];
        // na varredura, o exemplo fica inteiro à direita da linha até ela passar (quem esconde é o recorte)
        const naVarredura = ex.varredura !== null && (nome === 'pilha' || nome === 'medidor');
        if (!q || (q.p <= 0.001 && !naVarredura)) continue;
        if (CAMADAS[nome].sintetica || (nome === 'vivo' && !ex.vivoReal)) sintetica = Math.max(sintetica, q.p);
        ctx.save();
        let Gc = G;
        if (q.zs !== undefined && (q.zs !== 1 || q.zx !== 0.5 || q.zy !== CHAO)) {
          ctx.translate(G.X(q.zx), G.Y(q.zy)); ctx.scale(q.zs, q.zs); ctx.translate(-G.X(0.5), -G.Y(CHAO));
          Gc = { ...G, dpr: G.dpr * (0.7 / q.zs + 0.3) };     // diminuída, o traço não pode ficar fino demais
        }
        // o que só some sai subindo um pouco (como o texto) e o que só aparece chega de baixo
        if (CAMADAS[nome].sobe && ex.varredura === null) {
          if (q.dir === -1) ctx.translate(0, -G.bh * 0.03 * curvas.sai(q.lin));
          else if (q.dir === 1) ctx.translate(0, G.bh * 0.03 * (1 - curvas.entra(q.lin)));
        }
        DESENHOS[nome](ctx, Gc, q, cor, agora, prm, ex);
        ctx.restore();
      }
      if (ex.varredura !== null) {
        // a linha da varredura, com um brilho fraco atrás dela
        const xv = ex.varredura, g = ctx.createLinearGradient(xv - G.bw * 0.05, 0, xv, 0);
        g.addColorStop(0, 'rgba(237, 237, 232, 0)'); g.addColorStop(1, 'rgba(237, 237, 232, 0.1)');
        ctx.globalAlpha = Math.sin(Math.PI * varre); ctx.fillStyle = g;
        ctx.fillRect(xv - G.bw * 0.05, G.Y(0), G.bw * 0.05, G.bh);
        ctx.fillStyle = cor.tinta; ctx.fillRect(xv - G.dpr * 0.75, G.Y(0), G.dpr * 1.5, G.bh);
        ctx.globalAlpha = 1;
      }
      // etiqueta no canto: de onde vem o que está na tela. Ilustração (dado sintético) ou a fonte real.
      const vivo = prm.vivo && ex.vivoReal ? (varre !== null ? (varre > 0.5 ? 1 : 0) : prm.vivo.p) : 0;
      if (varre !== null && ex.vivoReal) sintetica = varre > 0.5 ? 0 : 1;
      const etiqueta = vivo > sintetica ? ({ live: 'Ao vivo · placa B', sim: 'Simulação', replay: 'Gravação' }[dv.fonte] || '') : 'Ilustração';
      if (elIlustra.textContent !== etiqueta) elIlustra.textContent = etiqueta;
      const forca = Math.max(vivo, sintetica);
      elIlustra.style.opacity = forca > 0.05 ? String(limitar(forca * 1.5)) : '0';
      el.querySelectorAll('.h-experimento button').forEach((b) => {
        const ativo = dv && dv.cenaSim === (b.dataset.acao === 'mover' ? 'andando' : 'parado');
        b.setAttribute('aria-pressed', String(Boolean(ativo)));
      });
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
        elSr.textContent = `Cena ${st.T + 1} de ${st.ordem.length}. ${semMarcas(tituloDe(c))} ${semMarcas(fraseDe(c))}`;
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
      // a palavra-chave é sublinhada depois que o título chega, e o traço sai junto com ela
      sublinhar(sai, 1);
      if (entra) sublinhar(entra, curvas.entra(janela(u, 0.72, 0.88)));
    }
    function sublinhar(b, k) {
      if (!b || !b.enf.length) return;
      const v = k.toFixed(3);
      if (b.sub === v) return;
      b.sub = v;
      b.enf.forEach((w) => w.style.setProperty('--sub', v));
    }

    function mostrarNotas() {
      const i = Math.round(st.T), c = cena(i), fala = conteudoDe(c);
      elNotas.innerHTML = `<b>Cena ${i + 1} de ${st.ordem.length} · ${escapar(semMarcas(fala.titulo))}</b>` +
        ['diga', 'faca', 'conecte'].map((k) => `<b>${{ diga: 'Diga', faca: 'Faça e espere', conecte: 'Conecte' }[k]}</b><p>${escapar(fala[k])}</p>`).join('');
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
      const longe = Math.abs(alvo - st.T) > 1.5;
      if ((longe || opc.cortar) && !opc.semCorte) { st.corte = { inicio: performance.now() / 1000, alvo }; st.anim = null; }
      else animar(alvo, opc.minimo ?? 1);
    }
    // Transição de tempo fixo até `alvo`, continuando a velocidade atual (sem tranco se já estava andando).
    // Uma cena leva TRANSICAO_S; distâncias maiores ou menores, proporcionalmente à raiz da distância.
    function animar(alvo, minimo) {
      st.alvo = alvo;
      const delta = alvo - st.T;
      if (Math.abs(delta) < 1e-6) { st.T = alvo; st.v = 0; st.anim = null; return; }
      const D = Math.max(0.6, TRANSICAO_S * Math.sqrt(Math.abs(delta)));
      const m0 = limitar((st.v * D) / delta, minimo, 3);
      st.anim = { t0: relogio(), de: st.T, para: alvo, D, m0 };
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
      st.T = st.alvo = Math.max(0, i); st.v = 0; st.anim = null; st.anunciado = -1;
      st.corte = { inicio: performance.now() / 1000 - 0.22, alvo: st.alvo, pulou: true };
      aoMudar(estado());
    }

    /* ---------- Entrada: roda, toque, teclas, clique ---------- */
    const distancia = () => 0.9 * (window.innerHeight || 800);
    function soltarRolagem() {
      st.rolando = null;
      irPara(alvoDirecional(st.alvo, st.direcao), { semCorte: true, minimo: 0 });
    }
    function roda(e) {
      if (e.ctrlKey) return;           // pinça do trackpad: deixa o navegador
      e.preventDefault();
      let d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      d *= e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? window.innerHeight : 1;
      d = limitar(d, -240, 240);
      if (!d) return;
      st.direcao = Math.sign(d);
      st.anim = null;                  // rolar no meio de uma transição: a mola continua de onde ela estava
      st.alvo = limitar(st.alvo + d / distancia(), 0, ultimaCena());
      clearTimeout(st.rolando);
      st.rolando = setTimeout(soltarRolagem, 180);
      if (opcoes.aoInteragir) opcoes.aoInteragir();
    }
    function tocar(e) {
      if (e.pointerType === 'mouse' || e.target.closest('button, .h-notas')) return;
      if (e.type === 'pointerdown') { st.toque = { y: e.clientY, x: e.clientX, mexeu: false }; return; }
      if (!st.toque) return;
      if (e.type === 'pointermove') {
        const dy = st.toque.y - e.clientY;
        if (Math.abs(dy) > 4) st.toque.mexeu = true;
        st.toque.y = e.clientY;
        if (dy) { st.direcao = Math.sign(dy); st.anim = null; st.alvo = limitar(st.alvo + dy / distancia(), 0, ultimaCena()); }
      } else {
        const mexeu = st.toque.mexeu;
        st.toque = null;
        if (mexeu) irPara(alvoDirecional(st.alvo, st.direcao), { semCorte: true, minimo: 0 });
      }
      if (opcoes.aoInteragir) opcoes.aoInteragir();
    }
    function clique(e) {
      const b = e.target.closest('button');
      if (b) { const a = b.dataset.acao; if (a === 'repetir') { st.cenaDesde = relogio(); } else if (a === 'mover' || a === 'parar') { if (fonteAtual() === 'sim' && opcoes.aoSimular) opcoes.aoSimular(a === 'mover' ? 'andando' : 'parado'); } else if (a === 'anterior') anterior(); else if (a === 'proxima') proxima(); else if (a === 'fechar') opcoes.aoFechar && opcoes.aoFechar(); }
      else if (!st.toque && !e.target.closest('.h-notas')) proxima();
      if (opcoes.aoInteragir) opcoes.aoInteragir();
    }
    // Devolve true se a tecla foi usada pela história (aí o resto da página não deve tratá-la).
    function tecla(e) {
      if (!st.aberta || miniatura || e.ctrlKey || e.metaKey || e.altKey) return false;
      const k = e.key;
      if (e.target.closest && e.target.closest('button, .h-notas') && (k === ' ' || k === 'Enter')) return false;
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
      return { indiceVisivel: Math.round(st.T), cenaVisivel: st.ordem[Math.round(st.T)], cenaSim: (dadosVivos() || {}).cenaSim, aberta: st.aberta, versao: st.versao, ordem: st.ordem.slice(), indice: i, cenaId: st.ordem[i], T: st.T, alvo: st.alvo, preto: st.preto, auto: Boolean(st.auto), notas: st.notas };
    }

    montarTextos();
    // prepara os dados de ilustração com calma, para a primeira passagem por cada cena não engasgar
    setTimeout(() => { perfil(); serieNumero(); gravacoes(); }, 400);
    const api = {
      get aberta() { return st.aberta; },
      abrir(opc = {}) {
        if (opc.versao && opc.versao !== st.versao) versao(opc.versao);
        st.aberta = true; el.hidden = false; st.anunciado = -1; st.preto = false;
        if (opc.cenaId) { const i = st.ordem.indexOf(remapear(opc.cenaId, roteiro.cenas, st.versao, temPose)); st.T = st.alvo = Math.max(0, i); st.v = 0; st.anim = null; }
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
      // Onde estão as linhas da cena atual, em px da tela, e se são o sinal de verdade (cena "ao vivo" e a
      // última) ou a ilustração. A passagem entre telas usa isso para sair da história a partir das linhas.
      retanguloLinhas() {
        if (!st.aberta) return null;
        if (!st.cache.tam || !st.cache.tam[0]) medir();
        const G = geometria(st.cache.tam[0], st.cache.tam[1], 1), q = poseEm(st.T, st.ordem, POSES, PADROES);
        const dv = dadosVivos(), real = Boolean(dv && dv.fonte && dv.leituras && dv.leituras.length > 1);
        let r = null, ehReal = false;
        if (q.vivo && q.vivo.p > 0.5) { r = { x: G.X(0), y: G.Y(q.vivo.py), w: G.bw, h: q.vivo.ph * G.bh }; ehReal = real; }
        else if (q.pilha && q.pilha.p > 0.5) r = { x: G.X(q.pilha.px), y: G.Y(q.pilha.py), w: q.pilha.pw * G.bw, h: q.pilha.ph * G.bh };
        if (!r) return null;
        const b = cv.getBoundingClientRect();
        return { x: r.x + b.x, y: r.y + b.y, w: r.w, h: r.h, real: ehReal };
      },
      preto(sim) { st.preto = sim === undefined ? !st.preto : Boolean(sim); },
      repetir() { st.cenaDesde = relogio(); },
      notas(sim) { st.notas = sim === undefined ? !st.notas : Boolean(sim); elNotas.hidden = !st.notas; if (st.notas) mostrarNotas(); return st.notas; },
      tecla, proxima, anterior, irPara, irParaId, versao, estado,
      // ganchos para testes e para gravar vídeo quadro a quadro
      _teste: {
        irPara(T) { st.T = st.alvo = T; st.v = 0; st.corte = null; st.anim = null; },
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
    limitar, misturar, janela, curvas, bezier, mola, transicao, inclinacaoTransicao, alvoDirecional, ordemDa, remapear, revelacao, poseEm,
    mulberry32, canal, perfilParado, sinteticas, desenharLinhas, criarPalco, criarCanal, POSES, CAMADAS,
    agitoNoTempo, serieNumero, medidaSint,
  };
  raiz.WaveHistoria = WaveHistoria;
  if (typeof module !== 'undefined' && module.exports) module.exports = WaveHistoria;
})(typeof window !== 'undefined' ? window : globalThis);

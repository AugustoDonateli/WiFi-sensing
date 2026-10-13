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
  // Cada camada pode trocar as janelas na pose de destino: `entrada`, `saida` e `mover`.
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
      const km = b && b.mover ? curvas.suave(janela(u, b.mover[0], b.mover[1])) : k;
      const q = {};
      for (const chave of Object.keys(para)) {
        if (chave === 'p' || chave === 'entrada' || chave === 'saida' || chave === 'mover') continue;
        q[chave] = typeof para[chave] === 'number' && typeof de[chave] === 'number' ? misturar(de[chave], para[chave], km) : (km < 0.5 ? de[chave] : para[chave]);
      }
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
  function desenharLinhas(c, r, ls, frac, cor, esp, opc = {}) {
    const n = opc.linhas || 48, realce = opc.realce ?? 3, visiveis = opc.visiveis ?? Infinity;
    const topo = r.y, base = r.y + r.h, passo = (base - topo) / n, altura = passo * 9;
    const margem = r.w * 0.12, largura = r.w - 2 * margem;
    c.lineJoin = 'round'; c.strokeStyle = cor.tinta; c.fillStyle = cor.fundo;
    const alfa0 = c.globalAlpha;
    for (let i = 0; i < ls.length; i++) {
      const idade = ls.length - 1 - i;
      const mostrar = limitar(visiveis - idade);
      if (mostrar <= 0) continue;
      const y0 = base - (idade + frac) * passo;
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
  const BARRAS = { x0: 0.2, x1: 0.97, base: 0.8, alt: 0.56 };
  const PILHA = { x: 0, y: 0.1, w: 1, h: 0.88 };

  let cacheSint = null, cachePerfil = null;
  const dadosSint = () => cacheSint || (cacheSint = sinteticas());
  const perfil = () => cachePerfil || (cachePerfil = perfilParado());

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

  // Camadas: ordem de desenho e parâmetros padrão. `sintetica` liga a etiqueta "ilustração".
  const CAMADAS = {
    chao: { padrao: { x0: 0, x1: 1 } },
    pacotes: { padrao: {} },
    placaA: { padrao: { x: 0.14, esc: 1 } },
    placaB: { padrao: { x: 0.86, esc: 1 } },
    barras: { padrao: {}, sintetica: true },
    pilha: { padrao: { agito: 0 }, sintetica: true },
    curva: { padrao: { forma: 0 }, sintetica: true },
  };
  const PADROES = Object.fromEntries(Object.entries(CAMADAS).map(([k, v]) => [k, v.padrao]));

  const DESENHOS = {
    chao(c, G, q, cor) {
      const x0 = G.X(q.x0), x1 = G.X(q.x1), meio = (x0 + x1) / 2, meia = ((x1 - x0) / 2) * curvas.entra(q.p);
      c.globalAlpha = Math.min(1, q.p * 1.4) * 0.55;
      c.strokeStyle = cor.tinta; c.lineWidth = G.dpr;
      linha(c, meio - meia, G.Y(CHAO), meio + meia, G.Y(CHAO));
    },
    placaA(c, G, q, cor) { desenharPlaca(c, G, q, cor, 'A'); },
    placaB(c, G, q, cor) { desenharPlaca(c, G, q, cor, 'B'); },
    pacotes(c, G, q, cor, amb, prm) {
      const A = prm.placaA, B = prm.placaB;
      if (!A || !B) return;
      const s = G.bh * TAM_PLACA, y = G.Y(CHAO) - G.bh * HASTE - s * 0.5;
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
      // A "fala": arcos que saem da placa A
      c.strokeStyle = cor.tinta; c.lineWidth = 1.1 * G.dpr;
      for (let i = 0; i < 3; i++) {
        const t = (amb * 0.45 + i / 3) % 1;
        c.globalAlpha = (1 - t) * 0.6 * q.p;
        c.beginPath(); c.arc(G.X(A.x), y, s * (0.55 + t * 1.6), -0.55, 0.55); c.stroke();
      }
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
    pilha(c, G, q, cor, amb) {
      const { parado, mexendo } = dadosSint();
      const n = parado.length, passoLeitura = amb / 0.1, fim = Math.floor(passoLeitura) % (n - 60) + 49, frac = passoLeitura % 1;
      const ls = [];
      for (let j = fim - 48; j <= fim; j++) {
        const P = parado[j], M = mexendo[j], ag = q.agito;
        if (ag <= 0) { ls.push(P); continue; }
        const a = new Float64Array(64), d = new Float64Array(64);
        for (let k = 0; k < 64; k++) { a[k] = misturar(P.a[k], M.a[k], ag); d[k] = misturar(P.d[k], M.d[k], ag); }
        ls.push({ a, d });
      }
      c.globalAlpha = q.dir === -1 ? q.p : 1;
      const r = { x: G.X(PILHA.x), y: G.Y(PILHA.y), w: PILHA.w * G.bw, h: PILHA.h * G.bh };
      desenharLinhas(c, r, ls, frac, cor, 1.4 * G.dpr, { visiveis: q.dir === 1 ? q.p * 50 : Infinity, destaque: true });
    },
  };

  // Poses de cada cena (por id). Camada ausente = invisível. `entrada`/`saida` mudam a janela daquela camada.
  const POSES = {
    placas: {
      chao: {},
      placaA: { x: 0.14 },
      placaB: { x: 0.86 },
      pacotes: {},
    },
    acorde: {
      chao: {},
      placaA: { p: 0, x: 0.02, saida: [0.06, 0.32], mover: [0.06, 0.32] },
      placaB: { x: 0.07, esc: 1.1, mover: [0.1, 0.5] },
      pacotes: { p: 0, saida: [0.04, 0.28] },
      barras: { entrada: [0.44, 0.9] },
      curva: { forma: 0, entrada: [0.62, 0.9] },
    },
    linhas: {
      chao: { p: 0 },
      placaB: { p: 0, x: 0.07, esc: 1.1, saida: [0.1, 0.4] },
      barras: { p: 0, saida: [0.12, 0.45] },
      curva: { p: 0, forma: 1, saida: [0.7, 0.92] },
      pilha: { agito: 0, entrada: [0.5, 0.9] },
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
      cache: { tam: [0, 0] }, escala: 1, auto: null, notas: false,
      omega: 3.8,   // rigidez da mola: mais baixa nas setas (transição com cerca de 1 s), mais alta na rolagem
    };
    const OMEGA = { tecla: 3.8, rolagem: 7.5, encaixe: 4.6 };
    const relogio = () => (st.congelado !== null ? st.congelado : performance.now() / 1000);

    function montarTextos() {
      st.ordem = ordemDa(roteiro.cenas, st.versao, temPose);
      elTextos.innerHTML = st.ordem.map((id) => {
        const c = roteiro.cenas.find((x) => x.id === id);
        return `<div class="h-texto" data-id="${id}"><h2 class="h-titulo">${palavras(c.titulo)}</h2><p class="h-frase">${palavras(c.frase)}</p></div>`;
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
    }
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(medir).observe(cv);

    function geometria(W, H, dpr) {
      const seguro = (st.cache.seguro || 0) * dpr;
      let fx, fy, fw, fh;
      if (W / H > 1.1) { fx = W * 0.43; fy = H * 0.11; fw = W * 0.52 - seguro; fh = H * 0.66; }
      else { fx = W * 0.06; fy = H * 0.08 + seguro; fw = W * 0.88; fh = H * 0.42; }
      const prop = 1.45, bw = Math.min(fw, fh * prop), bh = bw / prop;
      const bx = fx + (fw - bw) / 2, by = fy + (fh - bh) / 2;
      return { bx, by, bw, bh, dpr, X: (u) => bx + u * bw, Y: (v) => by + v * bh, serif: st.cache.serif || 'Georgia, serif' };
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
      let sintetica = 0;
      for (const nome of Object.keys(CAMADAS)) {
        const q = prm[nome];
        if (!q || q.p <= 0.001) continue;
        if (CAMADAS[nome].sintetica) sintetica = Math.max(sintetica, q.p);
        ctx.save();
        DESENHOS[nome](ctx, G, q, cor, agora, prm);
        ctx.restore();
      }
      elIlustra.style.opacity = sintetica > 0.05 ? String(limitar(sintetica * 1.5)) : '0';
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
        elSr.textContent = `Cena ${st.T + 1} de ${st.ordem.length}. ${c.titulo} ${c.frase}`;
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
      const i = Math.round(st.corte ? st.corte.alvo : st.alvo), c = cena(i);
      elNotas.innerHTML = `<b>Cena ${i + 1} de ${st.ordem.length} · ${escapar(c.titulo)}</b>${escapar(c.notas || '')}`;
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
    const proxima = () => irPara(Math.round(st.corte ? st.corte.alvo : st.alvo) + 1);
    const anterior = () => irPara(Math.round(st.corte ? st.corte.alvo : st.alvo) - 1);
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
      const i = Math.round(st.corte ? st.corte.alvo : st.alvo);
      return { aberta: st.aberta, versao: st.versao, ordem: st.ordem.slice(), indice: i, cenaId: st.ordem[i], T: st.T, alvo: st.alvo, preto: st.preto, auto: Boolean(st.auto), notas: st.notas };
    }

    montarTextos();
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
  };
  raiz.WaveHistoria = WaveHistoria;
  if (typeof module !== 'undefined' && module.exports) module.exports = WaveHistoria;
})(typeof window !== 'undefined' ? window : globalThis);

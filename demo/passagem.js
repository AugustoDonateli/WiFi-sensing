/* Passagens entre as telas do site: principal, escuta, Travessia, mural e "Como funciona".
 *
 * Toda troca de tela passa pelo sinal. A tela de origem se desfaz nas linhas do Wi-Fi (as leituras de
 * verdade, as mesmas do gráfico), as linhas tomam a tela inteira por um instante e depois viram a tela
 * de destino, com um gesto que diz o que ela é:
 *   principal  pouso: as linhas encolhem até virar o próprio gráfico (na saída, o mergulho)
 *   escuta     fechar os olhos: as linhas se juntam numa só, que vira o ponto que pulsa com o som
 *   desafio    travessia: alguém invisível atravessa da partida para a chegada; só o sinal treme
 *   mural      anéis: as linhas se curvam em anéis, como os das marcas, e o mural aparece de dentro
 *   história   as linhas vão para a metade direita e somem por cima da primeira cena; na saída,
 *              o sinal é desenhado por cima da história, uma linha por vez
 * A saída de cada tela é a entrada tocada de trás para a frente (menos a da história). Saída e entrada
 * se encontram sempre no mesmo quadro, o SINAL (a pilha de linhas na tela inteira), então qualquer
 * saída emenda em qualquer entrada.
 *
 * A troca de verdade (abrir a outra tela) acontece no meio, com a tela coberta. É só desenho: não mexe
 * na detecção e nunca inverte as cores (isso é só do detector). Sem leituras, as linhas ficam retas.
 * Funciona no navegador (window.WavePassagem) e no Node (as partes puras, para os testes).
 */
(function (raiz) {
  'use strict';
  const H = typeof module !== 'undefined' && module.exports ? require('./historia.js') : raiz.WaveHistoria;
  const { limitar, misturar, janela, curvas } = H;

  /* ================= Tempos ================= */

  // [saída, entrada] de cada gesto, em segundos. Entre as duas fica SINAL_S só de sinal.
  const TEMPOS = {
    pouso: [0.75, 0.95], pousoHistoria: [0.75, 0.95], historia: [0.75, 0.95], tomar: [0.85, 0.85],
    fecharOlhos: [0.8, 1.05], travessia: [0.85, 1.15], aneis: [0.8, 1.1], fade: [0.15, 0.15],
  };
  const SINAL_S = 0.18;     // o instante só de sinal
  const RAPIDA = 0.55;      // fator da passagem rápida (um movimento de verdade fechando a vitrine)
  const RE = 0.6;           // voltar de ré leva 60% do tempo da entrada
  const ENTRADA = { tela: 'pouso', escuta: 'fecharOlhos', desafio: 'travessia', galeria: 'aneis', historia: 'historia' };
  function gestoDeSaida(modo, cx) {
    if (modo === 'historia') return cx && cx.historiaReal ? 'pousoHistoria' : 'tomar';
    return ENTRADA[modo] || 'fade';
  }

  /* ================= A troca (pura) ================= */

  // Fases: livre → saindo → sinal (a troca acontece ao entrar aqui) → entrando → livre.
  // Pedido novo no meio: saindo/recuando só mudam o destino; no sinal, troca de novo na hora; entrando,
  // volta de ré até o sinal e segue para o destino novo. A lógica da tela que sai para quando o pedido
  // chega (aoSair); a tela nova abre no meio (executar); o gesto de entrada é o da tela que abriu de fato.
  function criarMaquina({ executar, modoAtual, aoSair = () => {}, gestos = {}, quadrosMin = 2 }) {
    const m = { fase: 'livre', u: 0, origem: null, modo: null, pedido: null, opc: {}, gSaida: null, gEntrada: null, tSinal: 0, quadros: 0, trocas: 0, erro: null };
    const reduzido = () => Boolean(gestos.reduzido && gestos.reduzido());
    const fator = () => (m.opc && m.opc.rapida ? RAPIDA : 1);
    const dur = (g, i) => (TEMPOS[g] || TEMPOS.fade)[i] * fator();
    const avisar = (nome, ...args) => { if (gestos[nome]) gestos[nome](...args); };
    function trocar() {
      const d = m.pedido, o = m.opc;
      m.pedido = null;
      try { executar(d, o); } catch (e) { m.erro = e; }
      m.modo = modoAtual(); m.trocas++;
      m.fase = 'sinal'; m.u = 0; m.tSinal = 0; m.quadros = 0;
      avisar('aoTrocar', m.modo);
    }
    function pedir(destino, opc = {}) {
      switch (m.fase) {
        case 'livre': {
          const atual = modoAtual();
          if (destino === atual) { executar(destino, opc); return 'direto'; }
          aoSair(atual);
          const g = reduzido() ? 'fade' : gestos.saida ? gestos.saida(atual) : gestoDeSaida(atual);
          Object.assign(m, { fase: 'saindo', u: 0, origem: atual, modo: atual, pedido: destino, opc, gSaida: g, gEntrada: null });
          return 'saindo';
        }
        case 'saindo': case 'recuando':
          m.pedido = destino; m.opc = opc;
          return m.fase;
        case 'sinal':
          if (destino === m.modo) return 'sinal';
          aoSair(m.modo); m.pedido = destino; m.opc = opc; trocar();
          return 'sinal';
        default:   // entrando
          if (destino === m.modo) return 'entrando';
          aoSair(m.modo); m.pedido = destino; m.opc = opc; m.fase = 'recuando';
          return 'recuando';
      }
    }
    // dt em segundos. Um salto grande atravessa as fases em ordem; o sinal espera alguns quadros pintados
    // (a tela nova precisa ser desenhada uma vez antes de ser medida).
    function passo(dt) {
      let resto = Math.max(0, dt);
      for (let guarda = 0; guarda < 8 && m.fase !== 'livre'; guarda++) {
        if (m.fase === 'saindo') {
          const d = dur(m.gSaida, 0), falta = (1 - m.u) * d;
          if (resto < falta) { m.u += resto / d; return; }
          resto -= falta; m.u = 1; trocar();
        } else if (m.fase === 'sinal') {
          m.tSinal += resto; m.quadros++;
          if (m.tSinal >= SINAL_S * fator() && m.quadros >= quadrosMin) {
            m.fase = 'entrando'; m.u = 0;
            m.gEntrada = reduzido() ? 'fade' : ENTRADA[m.modo] || 'fade';
            avisar('aoEntrar', m.modo, m.gEntrada);
          }
          return;
        } else if (m.fase === 'entrando') {
          const d = dur(m.gEntrada, 1), falta = (1 - m.u) * d;
          if (resto < falta) { m.u += resto / d; return; }
          m.u = 1; m.fase = 'livre';
          avisar('aoTerminar', m.modo);
          return;
        } else {   // recuando
          const d = dur(m.gEntrada, 1) * RE, falta = m.u * d;
          if (resto < falta) { m.u -= resto / d; return; }
          resto -= falta; m.u = 0; trocar();
        }
      }
    }
    // Termina na hora: faz a troca que faltava e para de desenhar.
    function concluir() {
      if (m.fase === 'saindo' || m.fase === 'recuando') trocar();
      if (m.fase !== 'livre') { m.fase = 'livre'; m.u = 0; avisar('aoTerminar', m.modo); }
    }
    return {
      pedir, passo, concluir,
      estado: () => ({ ...m, opc: { ...m.opc } }),
      duracao: (fase) => (fase === 'saindo' ? dur(m.gSaida, 0) : fase === 'entrando' ? dur(m.gEntrada, 1) : SINAL_S * fator()),
    };
  }

  /* ================= As poses (puras) ================= */

  // A pilha usa as proporções do gráfico da tela principal: 16% livres em cima, 3% embaixo e 12% de cada
  // lado retos. `L` é a caixa das linhas; a do fundo é a caixa inteira do gráfico.
  const N = 48;
  const caixaLinhas = (b) => ({ x: b.x, y: b.y + 0.16 * b.h, w: b.w, h: 0.81 * b.h });
  const caixaFundo = (L) => ({ x: L.x, y: L.y - (0.16 / 0.81) * L.h, w: L.w, h: L.h / 0.81 });
  const entre = (a, b, t) => ({ x: misturar(a.x, b.x, t), y: misturar(a.y, b.y, t), w: misturar(a.w, b.w, t), h: misturar(a.h, b.h, t) });
  const metadeDireita = (V) => ({ x: V.x + V.w * 0.45, y: V.y + V.h * 0.2, w: V.w * 0.5, h: V.h * 0.6 });
  const raiosAneis = (V) => { const m = Math.min(V.w, V.h); return { r0: 0.025 * m, R: 0.46 * m }; };   // miolo pequeno, como numa árvore

  // O SINAL: fundo na tela toda e a pilha de linhas ocupando a tela. Toda saída termina aqui e toda
  // entrada começa aqui.
  function neutro(cx) {
    return {
      L: caixaLinhas(cx.V), fora: 1, dentro: 1, linhas: 1,
      aperto: 0, yAperto: 0, ponto: 0, alvo: null,
      aneis: 0, escala: 1, revela: 0, centro: null,
      frente: null, pena: null,
    };
  }

  // Entradas: u = 0 é o sinal, u = 1 é a tela de destino.
  const POSES = {
    // as linhas encolhem até caber no gráfico da tela principal e viram o próprio gráfico
    pouso(u, cx) {
      const P = neutro(cx);
      if (u <= 0) return P;
      if (!cx.grafico) return POSES.fade(u, cx);
      P.L = entre(P.L, cx.grafico, curvas.suave(janela(u, 0, 0.8)));
      P.fora = 1 - curvas.suave(janela(u, 0.3, 0.92));
      return P;
    },
    // as linhas de verdade de uma cena da história (só usada de trás para a frente, na saída)
    pousoHistoria(u, cx) {
      const P = neutro(cx);
      if (u <= 0) return P;
      if (!cx.historiaReal) return POSES.fade(u, cx);
      P.L = entre(P.L, cx.historiaReal, curvas.suave(janela(u, 0, 0.8)));
      P.fora = P.dentro = 1 - curvas.suave(janela(u, 0.3, 0.92));
      return P;
    },
    // a abertura da história é ilustração: as linhas vão para o lugar dela e somem por cima (sem fingir
    // que viraram o desenho)
    historia(u, cx) {
      const P = neutro(cx);
      if (u <= 0) return P;
      P.L = entre(P.L, cx.historia || metadeDireita(cx.V), curvas.suave(janela(u, 0, 0.6)));
      P.fora = 1 - curvas.suave(janela(u, 0.25, 0.7));
      P.dentro = P.linhas = 1 - curvas.suave(janela(u, 0.5, 0.95));
      return P;
    },
    // fechar os olhos: as linhas se juntam numa só (horizonte), que encolhe até o ponto que pulsa com o som
    fecharOlhos(u, cx) {
      const P = neutro(cx);
      if (u <= 0) return P;
      const alvo = cx.ponto || { x: cx.V.x + cx.V.w * 0.8, y: cx.V.y + cx.V.h / 2, r: 14 };
      P.aperto = curvas.suave(janela(u, 0, 0.42));
      P.yAperto = alvo.y;
      P.ponto = curvas.suave(janela(u, 0.4, 0.74));
      P.alvo = alvo;
      const f = curvas.suave(janela(u, 0.62, 1));
      P.fora = P.dentro = 1 - f;
      P.linhas = misturar(1, 0.25, f);   // o ponto de verdade tem 25% de opacidade
      return P;
    },
    // travessia: uma pessoa invisível vai da esquerda (partida) para a direita (chegada). Onde ela passa,
    // o sinal treme; atrás dela, a tela do desafio
    travessia(u, cx) {
      const P = neutro(cx);
      if (u <= 0) return P;
      // passo de quem anda: quase constante, só um pouco mais devagar na partida e na chegada
      const V = cx.V, s = Math.max(30, 0.07 * V.w);
      P.frente = { x: misturar(V.x - 3 * s, V.x + V.w + 3 * s, misturar(u, curvas.suave(u), 0.5)), s };
      return P;
    },
    // anéis: as linhas se curvam em anéis (a mais antiga por dentro, como na marca) e se abrem como
    // ondas; o mural aparece de dentro deles
    aneis(u, cx) {
      const P = neutro(cx);
      if (u <= 0) return P;
      // o abrir começa antes de os anéis terminarem de se fechar: o movimento não para no meio
      // o abrir começa antes de os anéis terminarem de se fechar (o movimento não para no meio), mas o mural
      // só aparece com os anéis já fechados
      const e = janela(u, 0.25, 1);
      P.aneis = curvas.suave(janela(u, 0, 0.5));
      P.escala = 1 + 3.4 * (0.3 * e + 0.7 * e * e);   // já sai andando e acelera, como onda
      P.revela = janela(u, 0.5, 1);
      P.centro = cx.centro || { x: cx.V.x + cx.V.w / 2, y: cx.V.y + cx.V.h / 2 };
      return P;
    },
    // movimento reduzido (preferência do sistema): só esmaece
    fade(u, cx) {
      const P = neutro(cx);
      P.fora = P.dentro = P.linhas = 1 - limitar(u);
      return P;
    },
  };
  // Saída da história: o sinal é desenhado por cima, da esquerda para a direita, uma linha por vez
  // (a mais nova primeiro), até cobrir tudo. u = 0 é a história, u = 1 é o sinal.
  function tomar(u, cx) {
    const P = neutro(cx);
    if (u >= 1) return P;
    P.pena = { u: limitar(u) };
    P.fora = curvas.suave(janela(u, 0.3, 1));
    return P;
  }
  // A saída toca a entrada da mesma tela de trás para a frente (menos a da história).
  const poseSaida = (g, u, cx) => (g === 'tomar' ? tomar(u, cx) : (POSES[g] || POSES.fade)(1 - u, cx));
  const poseEntrada = (g, u, cx) => (POSES[g] || POSES.fade)(u, cx);

  /* ================= Desenho ================= */

  const REALCE = 3, TAU = Math.PI * 2;
  const formas = new WeakMap();
  // A forma de cada leitura, com a mesma conta do gráfico: onde cai cada subportadora útil (0 a 1) e a
  // altura do relevo. Calculada uma vez por leitura (as leituras não mudam depois de guardadas).
  function formaDe(l) {
    if (formas.has(l)) return formas.get(l);
    const { a, d } = l, uteis = [];
    let soma = 0;
    for (let k = 0; k < a.length; k++) if (a[k] > 0.5) { uteis.push(k); soma += a[k]; }
    let f = null;
    if (uteis.length >= 3) {
      const m = uteis.length, media = soma / m, fx = new Float32Array(m), rel = new Float32Array(m);
      for (let j = 0; j < m; j++) {
        const k0 = uteis[Math.max(0, j - 1)], k = uteis[j], k1 = uteis[Math.min(m - 1, j + 1)];
        const forma = (a[k0] + 2 * a[k] + a[k1]) / 4, tremor = (d[k0] + 2 * d[k] + d[k1]) / 4;
        fx[j] = (j + 0.5) / m;
        rel[j] = Math.max(0, forma / media - 0.3 + (REALCE * tremor) / media) * Math.sin((Math.PI * (j + 0.5)) / m);
      }
      f = { fx, rel };
    }
    formas.set(l, f);
    return f;
  }
  // sem fonte de dados: 49 linhas retas (nada de relevo inventado)
  const RETA = { fx: new Float32Array([0.5]), rel: new Float32Array([0]) };
  const RETAS = Array.from({ length: N + 1 }, () => RETA);

  const buf = { fx: new Float32Array(128), rel: new Float32Array(128), tx: new Float32Array(128), ty: new Float32Array(128), bx: new Float32Array(128), by: new Float32Array(128) };
  // Os pontos de uma linha, de 0 a 1 na largura toda: as pontas retas (12% de cada lado, em 6 pedaços,
  // para virarem arco nos anéis) e o relevo no meio. O desenho fica igual ao do gráfico.
  function pontosDaLinha(f) {
    let n = 0;
    for (let s = 0; s <= 6; s++) { buf.fx[n] = (0.12 * s) / 6; buf.rel[n++] = 0; }
    for (let j = 0; j < f.fx.length; j++) { buf.fx[n] = 0.12 + 0.76 * f.fx[j]; buf.rel[n++] = f.rel[j]; }
    for (let s = 0; s <= 6; s++) { buf.fx[n] = 0.88 + (0.12 * s) / 6; buf.rel[n++] = 0; }
    return n;
  }

  // Desenha uma pose. `cor` = { fundo, tinta }; `aviso` = o aviso amarelo da tela (texto, cor, caixa), que
  // continua no mesmo canto enquanto a passagem cobre a tela.
  function desenharPose(c, P, leituras, frac, cor, t, V, aviso) {
    const L = P.L, passo = L.h / N, altura = passo * 9 * (1 - P.aperto), esp = 1.4;
    const real = Boolean(leituras && leituras.length);
    const ls = real ? leituras : RETAS, fr = real ? limitar(frac || 0) : 0, n = ls.length;
    const { r0, R } = raiosAneis(V), alturaPolar = ((R - r0) / N) * 9;
    const bandas = Boolean(P.frente || P.pena);
    c.save();
    c.lineJoin = 'round'; c.lineCap = 'butt';
    // o que já é a tela de destino fica sem desenho: o mural aparece de dentro dos anéis
    if (P.revela > 0) {
      c.beginPath(); c.rect(V.x - 2, V.y - 2, V.w + 4, V.h + 4);
      c.arc(P.centro.x, P.centro.y, P.revela * R * 1.05 * P.escala, 0, TAU);
      c.clip('evenodd');
    }
    // fundo: inteiro, ou só fora da caixa do gráfico (pouso), ou por faixas (travessia e "tomar")
    c.fillStyle = cor.fundo;
    let borda = V.x;   // na travessia, à esquerda disto já é a tela do desafio
    if (P.frente) borda = P.frente.x - 0.6 * P.frente.s;
    const idadeMax = Math.min(n - 1, Math.floor(N + 1 - fr));
    const yTopo = L.y + L.h - (idadeMax + fr) * passo - passo, yBase = L.y + L.h - fr * passo;
    if (!bandas) {
      if (Math.abs(P.fora - P.dentro) < 1e-3) {
        if (P.fora > 0.001) { c.globalAlpha = P.fora; c.fillRect(V.x, V.y, V.w, V.h); }
      } else {
        const B = caixaFundo(L);
        if (P.fora > 0.001) { c.globalAlpha = P.fora; c.beginPath(); c.rect(V.x, V.y, V.w, V.h); c.rect(B.x, B.y, B.w, B.h); c.fill('evenodd'); }
        if (P.dentro > 0.001) { c.globalAlpha = P.dentro; c.fillRect(B.x, B.y, B.w, B.h); }
      }
    } else {
      // acima da pilha: na travessia, tudo à direita da pessoa; no "tomar", a tela toda esmaecendo
      c.globalAlpha = P.frente ? 1 : P.fora;
      if (c.globalAlpha > 0.001) c.fillRect(borda, V.y, V.x + V.w - borda, yTopo - V.y + 1);
    }
    // perfil de uma pessoa em pé: o tremor é mais forte na altura do corpo
    const yCorpo = L.y + 0.62 * L.h, hCorpo = 0.32 * L.h;
    for (let i = 0; i < n; i++) {
      const idade = n - 1 - i;
      const y0 = L.y + L.h - (idade + fr) * passo;
      if (y0 < L.y - passo) continue;
      if ((P.aperto > 0.999 || P.ponto > 0) && idade !== 0) continue;   // todas na mesma linha: basta uma
      const f = real ? formaDe(ls[i]) : RETA;
      if (!f) continue;
      // trecho desta linha (travessia e "tomar"): a borda de cada linha é um pouco diferente
      let a = V.x - 10, b = V.x + V.w + 10;
      if (P.frente) a = P.frente.x - P.frente.s * (0.3 + 0.45 * (0.5 + 0.5 * Math.sin(i * 2.399 + 0.7)));
      if (P.pena) { const a0 = 0.45 * (idade / N); b = V.x + V.w * curvas.suave(janela(P.pena.u, a0, a0 + 0.55)); }
      if (b <= a) continue;
      const m = pontosDaLinha(f);
      const y0a = misturar(y0, P.yAperto, P.aperto);
      const rho0 = r0 + (R - r0) * limitar((y0 - L.y) / L.h, -0.05, 1.05);
      const perfil = 0.35 + 0.65 * Math.exp(-(((y0 - yCorpo) / hCorpo) ** 2));
      for (let p = 0; p < m; p++) {
        const fxL = buf.fx[p], rel = buf.rel[p], xc = L.x + L.w * fxL;
        let x = xc, y = y0a - rel * altura, xb = xc, yb = y0a;
        if (P.frente) {
          const g = Math.exp(-(((xc - P.frente.x) / P.frente.s) ** 2));
          if (g > 0.003) y -= g * (rel * altura * 1.3 + passo * 2.6 * perfil * Math.sin(t * 9 + i * 1.7 + xc * 0.021));
        }
        if (P.ponto > 0) {
          x = misturar(x, P.alvo.x, P.ponto); xb = x;
          y = misturar(y, P.alvo.y, P.ponto); yb = misturar(yb, P.alvo.y, P.ponto);
        }
        if (P.aneis > 0) {
          // o relevo aponta para dentro (para as leituras mais antigas, como "para cima" na pilha), menor nos
          // anéis de dentro, e nunca passa do centro
          const th = Math.PI / 2 + TAU * fxL, co = Math.cos(th), se = Math.sin(th);
          const rt = Math.max(rho0 * 0.15, rho0 - rel * alturaPolar * (rho0 / R)) * P.escala, rb = rho0 * P.escala;
          x = misturar(x, P.centro.x + rt * co, P.aneis); y = misturar(y, P.centro.y + rt * se, P.aneis);
          xb = misturar(xb, P.centro.x + rb * co, P.aneis); yb = misturar(yb, P.centro.y + rb * se, P.aneis);
        }
        buf.tx[p] = x; buf.ty[p] = y; buf.bx[p] = xb; buf.by[p] = yb;
      }
      if (bandas) { c.save(); c.beginPath(); c.rect(a, V.y - 50, b - a, V.h + 100); c.clip(); }
      if (bandas) {
        // a faixa entre esta linha e a de cima: junto com as outras, cobre a tela inteira
        c.globalAlpha = 1; c.fillStyle = cor.fundo;
        c.fillRect(V.x, y0 - passo + esp * 0.6, V.w, passo - esp * 0.6 + (idade === 0 ? 0.5 : 0));
      }
      const largura = idade === 0 ? esp * 2 : esp;   // a linha de "agora" um pouco mais grossa, como no gráfico
      if (P.ponto > 0) {
        // a linha vira o ponto: fica curta e grossa até ser um círculo
        const w = misturar(largura, 2 * P.alvo.r, P.ponto * P.ponto);
        const x0 = buf.tx[0], x1 = buf.tx[m - 1], yy = buf.ty[0];
        c.globalAlpha = P.linhas; c.fillStyle = cor.tinta; c.strokeStyle = cor.tinta;
        if (x1 - x0 > 0.5) { c.lineCap = 'round'; c.lineWidth = w; c.beginPath(); c.moveTo(x0, yy); c.lineTo(x1, yy); c.stroke(); c.lineCap = 'butt'; }
        else { c.beginPath(); c.arc((x0 + x1) / 2, yy, w / 2, 0, TAU); c.fill(); }
      } else {
        // o fundo embaixo da linha tapa as mais antigas, como no gráfico
        c.beginPath(); c.moveTo(buf.tx[0], buf.ty[0]);
        for (let p = 1; p < m; p++) c.lineTo(buf.tx[p], buf.ty[p]);
        for (let p = m - 1; p >= 0; p--) c.lineTo(buf.bx[p], buf.by[p]);
        c.closePath();
        c.globalAlpha = P.linhas; c.fillStyle = cor.fundo; c.fill();
        c.beginPath(); c.moveTo(buf.tx[0], buf.ty[0]);
        for (let p = 1; p < m; p++) c.lineTo(buf.tx[p], buf.ty[p]);
        c.lineWidth = largura; c.strokeStyle = cor.tinta; c.stroke();
      }
      if (bandas) c.restore();
    }
    if (bandas) {
      // abaixo da linha mais nova
      c.globalAlpha = P.frente ? 1 : P.fora; c.fillStyle = cor.fundo;
      if (c.globalAlpha > 0.001) c.fillRect(borda, yBase, V.x + V.w - borda, V.y + V.h - yBase);
    }
    // o aviso amarelo continua no mesmo canto (com "Simulação", a tela nunca fica sem dizer)
    if (aviso && aviso.texto) {
      const al = P.frente ? (aviso.x > borda ? 1 : 0) : P.fora;
      if (al > 0.01) {
        c.globalAlpha = al; c.fillStyle = aviso.cor || '#F5B83D';
        c.beginPath(); c.arc(aviso.x + 3.5, aviso.y + aviso.h / 2, 3.5, 0, TAU); c.fill();
        c.font = `11px ${aviso.fonte || 'monospace'}`; c.textBaseline = 'middle';
        if ('letterSpacing' in c) c.letterSpacing = '0.88px';
        c.fillText(String(aviso.texto).toUpperCase(), aviso.x + 15, aviso.y + aviso.h / 2 + 0.5);
      }
    }
    c.restore();
  }

  function rgb(hex) {
    const h = String(hex || '').trim().replace('#', '');
    return h.length === 6 ? [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) : null;
  }
  function misturarCores(a, b, t) {
    const A = rgb(a), B = rgb(b);
    if (!A || !B) return t < 0.5 ? a : b;
    return `#${A.map((v, i) => Math.round(misturar(v, B[i], t)).toString(16).padStart(2, '0')).join('')}`;
  }

  /* ================= No navegador ================= */

  // opcoes: canvas, modoAtual(), executar(destino, opc), aoSair(modo), medir(modo) (caixas em px da
  // janela: grafico, ponto, historia, historiaReal, aviso), dados() ({ leituras, frac }), paleta(modo)
  // ({ fundo, tinta }), eventos(nome, info) ('saida' | 'entrada' | 'fim'), reduzido().
  function criar(o) {
    const canvas = o.canvas, ctx = canvas.getContext('2d');
    const paleta = o.paleta || (() => ({ fundo: '#0B0B0A', tinta: '#EDEDE8' }));
    const eventos = o.eventos || (() => {});
    let cxS = null, cxE = null, ultimo = 0, congelado = false, relogio = 0, vigia = null, ultimoQuadro = 0;
    const tempos = [];

    // Tamanho do canvas: lido de novo só quando muda (ler a cada quadro força o navegador a refazer o layout).
    let tam = null;
    const medirCanvas = () => { const r = canvas.getBoundingClientRect(); tam = { x: r.left, y: r.top, width: r.width, height: r.height }; return tam; };
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(medirCanvas).observe(canvas);
    function medidas(modo) {
      const b = medirCanvas();
      const V = { x: 0, y: 0, w: b.width || raiz.innerWidth, h: b.height || raiz.innerHeight };
      const m = (o.medir && o.medir(modo)) || {};
      const rel = (r) => r && { x: r.x - b.x, y: r.y - b.y, w: r.w ?? r.width, h: r.h ?? r.height };
      const cx = { V, centro: { x: V.w / 2, y: V.h / 2 } };
      if (m.grafico) cx.grafico = caixaLinhas(rel(m.grafico));
      if (m.historia) cx.historia = rel(m.historia);
      if (m.historiaReal) cx.historiaReal = rel(m.historiaReal);
      if (m.ponto) cx.ponto = { x: m.ponto.x - b.x, y: m.ponto.y - b.y, r: m.ponto.r };
      if (m.aviso) cx.aviso = { ...rel(m.aviso), texto: m.aviso.texto, cor: m.aviso.cor, fonte: m.aviso.fonte };
      return cx;
    }
    const maq = criarMaquina({
      executar: (d, op) => o.executar(d, op),
      modoAtual: o.modoAtual,
      aoSair: (modo) => { if (o.aoSair) o.aoSair(modo); },
      gestos: {
        reduzido: () => Boolean(o.reduzido && o.reduzido()),
        saida: (modo) => { cxS = medidas(modo); return gestoDeSaida(modo, cxS); },
        aoTrocar: (modo) => { cxE = medidas(modo); },
        aoEntrar: (modo, g) => { cxE = medidas(modo); eventos('entrada', { modo, gesto: g, dur: maq.duracao('entrando') }); },
        aoTerminar: (modo) => { desativar(); eventos('fim', { modo }); },
      },
    });

    function ativar() {
      canvas.classList.add('ativa');
      ultimoQuadro = performance.now();
      if (!vigia) {
        // se os quadros pararem (janela escondida, erro), a troca termina sozinha
        vigia = setInterval(() => {
          if (maq.estado().fase === 'livre') { clearInterval(vigia); vigia = null; return; }
          if (!congelado && performance.now() - ultimoQuadro > 1200) concluir();
        }, 300);
      }
    }
    function desativar() {
      canvas.classList.remove('ativa');
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      ultimo = 0;
    }
    function passar(destino, opc = {}) {
      const r = maq.pedir(destino, opc);
      if (r === 'direto') return r;
      if (maq.estado().fase !== 'livre') ativar();
      if (r === 'saindo') { ultimo = 0; const e = maq.estado(); eventos('saida', { origem: e.origem, destino, gesto: e.gSaida, dur: maq.duracao('saindo') }); }
      return r;
    }
    function concluir() { maq.concluir(); desativar(); }

    function desenhar(t) {
      const b = tam || medirCanvas(), dpr = Math.min(raiz.devicePixelRatio || 1, 1.5);
      const W = Math.max(1, Math.round(b.width * dpr)), Hc = Math.max(1, Math.round(b.height * dpr));
      if (canvas.width !== W || canvas.height !== Hc) { canvas.width = W; canvas.height = Hc; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, b.width, b.height);
      const e = maq.estado(), V = { x: 0, y: 0, w: b.width, h: b.height };
      let P, cor, aviso;
      if (e.fase === 'saindo') {
        P = poseSaida(e.gSaida, e.u, cxS); cor = paleta(e.origem); aviso = cxS.aviso;
      } else if (e.fase === 'sinal') {
        // só sinal: as cores e o aviso vão da tela de origem para a de destino
        const k = curvas.suave(limitar(e.tSinal / (SINAL_S * (e.opc.rapida ? RAPIDA : 1))));
        P = neutro({ V });
        const a = paleta(e.origem), z = paleta(e.modo);
        cor = { fundo: misturarCores(a.fundo, z.fundo, k), tinta: misturarCores(a.tinta, z.tinta, k) };
        const s = cxS && cxS.aviso, d = cxE && cxE.aviso;
        aviso = s && d ? { ...d, x: misturar(s.x, d.x, k), y: misturar(s.y, d.y, k) } : d || s;
      } else {
        P = poseEntrada(e.gEntrada, e.u, cxE); cor = paleta(e.modo); aviso = cxE.aviso;
      }
      const d = o.dados();
      desenharPose(ctx, P, d.leituras, d.frac, cor, t, V, aviso);
    }
    function quadro(agora) {
      if (maq.estado().fase === 'livre') { if (canvas.classList.contains('ativa')) desativar(); return; }
      ultimoQuadro = performance.now();
      if (!congelado) { const dt = ultimo ? agora - ultimo : 0; ultimo = agora; maq.passo(Math.min(dt, 0.1)); }
      if (maq.estado().fase === 'livre') return;
      const t0 = performance.now();
      try { desenhar(congelado ? relogio : agora); } catch (err) { if (raiz.console) console.error(err); concluir(); return; }
      tempos.push(performance.now() - t0);
      if (tempos.length > 300) tempos.shift();
    }

    return {
      passar, quadro, concluir,
      ocupada: () => maq.estado().fase !== 'livre',
      // a tela de destino já está aparecendo (as teclas dela podem valer)
      vivo: () => { const f = maq.estado().fase; return f === 'livre' || f === 'entrando'; },
      // para onde a passagem está indo (null quando parada)
      alvo: () => { const e = maq.estado(); return e.fase === 'livre' ? null : { modo: e.pedido || e.modo, opc: e.opc }; },
      cobreTudo: () => maq.estado().fase === 'sinal',
      estado: () => maq.estado(),
      // ganchos para testes e para gravar vídeo quadro a quadro
      _teste: {
        congelar(sim) { congelado = Boolean(sim); },
        avancar(dt) {
          relogio += dt; maq.passo(dt);
          if (maq.estado().fase === 'livre') { desativar(); return maq.estado(); }
          ultimoQuadro = performance.now();
          desenhar(relogio);
          return maq.estado();
        },
        tempos: () => tempos.slice(),
      },
    };
  }

  const WavePassagem = {
    criar, criarMaquina, POSES, tomar, poseSaida, poseEntrada, neutro, caixaLinhas, caixaFundo, raiosAneis,
    gestoDeSaida, desenharPose, formaDe, misturarCores, TEMPOS, SINAL_S, RAPIDA, ENTRADA, N,
  };
  raiz.WavePassagem = WavePassagem;
  if (typeof module !== 'undefined' && module.exports) module.exports = WavePassagem;
})(typeof window !== 'undefined' ? window : globalThis);

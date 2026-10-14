/* Composições da apresentação: diagramas didáticos, sem dados de desempenho inventados.
 * O motor de historia.js continua responsável pela navegação e pelas curvas de transição.
 */
(function (raiz) {
  'use strict';
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (v) => { v = clamp(v); return v * v * (3 - 2 * v); };
  const mix = (a, b, k) => a + (b - a) * k;
  const TAU = Math.PI * 2;
  const soma = (x, fase) => Math.sin(x) + Math.sin(x + fase);
  function perfil(instante = 0, n = 48) {
    return Array.from({ length: n }, (_, k) => {
      const f = k / (n - 1), a = f * 7 + 0.9, b = f * 15 + instante * 0.37;
      return Math.hypot(1 + 0.55 * Math.cos(a) + 0.32 * Math.cos(b), 0.55 * Math.sin(a) + 0.32 * Math.sin(b)) / 2;
    });
  }
  // Uma leitura depende apenas de seu índice. Subir na pilha nunca recalcula seu passado.
  function memoria(tempo, quantidade = 16) {
    const pos = Math.max(0, tempo) / 0.55, fim = Math.floor(pos);
    return { frac: pos - fim, linhas: Array.from({ length: quantidade }, (_, i) => ({ indice: fim - quantidade + 1 + i, a: perfil(fim - quantidade + 1 + i) })) };
  }

  function desenho(c, G, cor, nome, tempo, ex) {
    const X = G.X, Y = G.Y, W = G.bw, H = G.bh, D = G.dpr;
    const tinta = cor.tinta, apagado = cor.apagado;
    const a0 = c.globalAlpha;
    const tam = (n) => Math.max(11 * D, H * n);
    const texto = (s, x, y, n = 0.045, alinhar = 'left', serif = false, cinza = false) => {
      c.fillStyle = cinza ? apagado : tinta;
      c.font = `${tam(n)}px ${serif ? G.serif : G.sans}`;
      c.textAlign = alinhar; c.textBaseline = 'middle'; c.fillText(s, X(x), Y(y));
    };
    const textoEmLinhas = (s, x, y, largura, n = 0.034) => {
      c.font = `${tam(n)}px ${G.sans}`;
      let atual = '', linha = 0;
      for (const palavra of s.split(' ')) {
        const proxima = atual ? atual + ' ' + palavra : palavra;
        if (atual && c.measureText(proxima).width > W * largura) {
          texto(atual, x, y + linha++ * tam(n) * 1.35 / H, n, 'left', false, true);
          atual = palavra;
        } else atual = proxima;
      }
      texto(atual, x, y + linha * tam(n) * 1.35 / H, n, 'left', false, true);
    };
    const traco = (pts, alpha = 1, largura = 1.2, tracejado = false, revelar = 1) => {
      c.globalAlpha = a0 * alpha; c.strokeStyle = tinta; c.lineWidth = largura * D;
      c.setLineDash(tracejado ? [4 * D, 5 * D] : []);
      c.beginPath();
      pts.slice(0, Math.max(2, Math.ceil(pts.length * clamp(revelar)))).forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)));
      c.stroke(); c.setLineDash([]); c.globalAlpha = a0;
    };
    const ponto = (x, y, r = 0.012, cheio = true) => {
      c.fillStyle = tinta; c.strokeStyle = tinta; c.lineWidth = 1.2 * D;
      c.beginPath(); c.arc(X(x), Y(y), Math.max(2 * D, H * r), 0, TAU); cheio ? c.fill() : c.stroke();
    };
    const caixa = (x, y, w, h, alpha = 0.3) => {
      c.globalAlpha = a0 * alpha; c.strokeStyle = tinta; c.lineWidth = D;
      c.strokeRect(X(x), Y(y), W * w, H * h); c.globalAlpha = a0;
    };
    const onda = (x0, x1, y, amp, fase = 0, alpha = 1, revelar = 1) => traco(Array.from({ length: 121 }, (_, j) => {
      const u = j / 120;
      return [mix(x0, x1, u), y - Math.sin(u * TAU * 2 + fase) * amp];
    }), alpha, 1.6, false, revelar);
    const serie = (a, x, y, w, h, alpha = 1) => traco(a.map((v, j) => [x + j / (a.length - 1) * w, y - v * h]), alpha, 1.5);
    const placa = (x, y, letra, descricao) => {
      const r = H * 0.065;
      c.fillStyle = cor.fundo; c.strokeStyle = tinta; c.lineWidth = 1.4 * D;
      c.beginPath(); c.arc(X(x), Y(y), r, 0, TAU); c.fill(); c.stroke();
      texto(letra, x, y, 0.062, 'center', true);
      texto(descricao, x, y + 0.14, 0.035, 'center', false, true);
    };
    const caminho = (pts, p) => {
      const lens = pts.slice(1).map((v, i) => Math.hypot((v[0] - pts[i][0]) * W, (v[1] - pts[i][1]) * H));
      let d = clamp(p) * lens.reduce((s, v) => s + v, 0);
      for (let i = 0; i < lens.length; i++) {
        if (d <= lens[i] || i === lens.length - 1) { const k = d / (lens[i] || 1); return [mix(pts[i][0], pts[i + 1][0], k), mix(pts[i][1], pts[i + 1][1], k)]; }
        d -= lens[i];
      }
      return pts[0];
    };
    const t = ex.reduz ? 12 : tempo;

    if (nome === 'abertura') {
      const k = ease((t - 1.1) / 2), a = perfil(0), b = perfil(11);
      texto('UM MESMO AMBIENTE', 0.04, 0.05, 0.033, 'left', false, true);
      caixa(0.04, 0.17, 0.92, 0.57);
      traco([[0.08, 0.57], [0.92, 0.57]], 0.2);
      serie(a, 0.10, 0.64, 0.80, 0.36, 0.22);
      serie(a.map((v, i) => mix(v, b[i], k)), 0.10, 0.64, 0.80, 0.36);
      ponto(0.5 + 0.12 * k, 0.29, 0.016, false);
      texto(k < 0.1 ? 'Algo está prestes a mudar.' : 'O ambiente mudou. O sinal também.', 0.5, 0.87, 0.048, 'center', true);
    }
    if (nome === 'mensagem' || nome === 'caminhos') {
      const planta = nome === 'caminhos';
      const k = ease((t - 0.3) / 2.2);
      const px = 0.53 + 0.08 * ease((t - 2.8) / 2), py = 0.64;
      const direto = [[0.10, 0.48], [0.90, 0.48]];
      if (planta) {
        caixa(0.02, 0.06, 0.96, 0.77, 0.42);
        caixa(0.19, 0.13, 0.18, 0.16, 0.22); caixa(0.72, 0.65, 0.16, 0.12, 0.22);
        texto('VISTA DE CIMA · ESQUEMA', 0.03, 0.94, 0.032, 'left', false, true);
        const caminhos = [[[0.10, 0.48], [0.48, 0.07], [0.90, 0.48]], [[0.10, 0.48], [0.4, 0.82], [0.90, 0.48]], [[0.10, 0.48], [px, py], [0.90, 0.48]]];
        caminhos.forEach((p, i) => {
          traco(p, i === 2 ? 0.9 : 0.3, 1.1, i !== 2);
          if (t < 6 && !ex.reduz) ponto(...caminho(p, clamp((t - i * 0.35) / 3)), 0.009);
        });
        ponto(px, py, 0.025, false);
        texto('pessoa', px, py + 0.09, 0.034, 'center', false, true);
      } else {
        texto('DUAS ESP32 · EXPERIMENTO PLANEJADO', 0.5, 0.13, 0.031, 'center', false, true);
        for (let i = 0; i < 3; i++) onda(0.23, 0.77, 0.48 + (i - 1) * 0.055, 0.018, i * 0.3, 0.12 + i * 0.06);
        texto('informação transportada por rádio', 0.5, 0.84, 0.048, 'center', true);
      }
      traco(direto, 0.55, 1.1);
      if (!ex.reduz && t < 5) ponto(...caminho(direto, k));
      placa(0.10, 0.48, 'A', 'envia'); placa(0.90, 0.48, 'B', 'recebe');
    }
    if (nome === 'mistura') {
      const fase = Math.PI * ease((t - 2.4) / 3.1);
      const v = ease(t / 1.5);
      texto('CONTRIBUIÇÕES', 0.02, 0.035, 0.034, 'left', false, true);
      texto('NO RECEPTOR', 0.62, 0.035, 0.034, 'left', false, true);
      texto('01', 0.015, 0.23, 0.04, 'left', false, true);
      texto('02', 0.015, 0.63, 0.04, 'left', false, true);
      onda(0.10, 0.44, 0.23, 0.11, 0, 0.9, v);
      onda(0.10, 0.44, 0.63, 0.11, fase, 0.55, v);
      traco([[0.49, 0.10], [0.49, 0.78]], 0.2);
      texto('+', 0.065, 0.43, 0.10, 'center', true);
      texto('=', 0.55, 0.43, 0.10, 'center', true);
      traco([[0.62, 0.43], [0.98, 0.43]], 0.22, 1, true);
      traco(Array.from({ length: 121 }, (_, j) => [0.62 + j / 120 * 0.36, 0.43 - soma(j / 120 * TAU * 2, fase) * 0.12]), 1, 2);
      texto(fase < 0.4 ? 'reforço' : fase > 2.8 ? 'cancelamento' : 'o caminho muda a soma', 0.8, 0.83, 0.064, 'center', true);
      texto('Duas contribuições iguais · exemplo simplificado', 0.02, 0.97, 0.032, 'left', false, true);
    }
    if (nome === 'acorde') {
      const a = perfil(0), k = ease((t - 1) / 2);
      texto('AMPLITUDES DO CSI', 0.02, 0.02, 0.032, 'left', false, true);
      traco([[0.04, 0.10], [0.04, 0.81], [0.97, 0.81]], 0.3);
      a.forEach((v, i) => {
        const x = 0.08 + i / (a.length - 1) * 0.85;
        traco([[x, 0.80], [x, 0.80 - v * 0.66 * ease(t / 1.1)]], 0.36, 2);
      });
      c.globalAlpha = a0 * k; serie(a, 0.08, 0.80, 0.85, 0.66); c.globalAlpha = a0;
      texto('subportadoras →', 0.97, 0.91, 0.036, 'right', false, true);
      texto('um instante do canal', 0.04, 0.91, 0.036, 'left', false, true);
    }
    if (nome === 'linhas') {
      const m = memoria(t, Math.min(16, Math.floor(t / 0.55) + 1));
      texto('ANTES', 0.96, 0.035, 0.032, 'right', false, true);
      m.linhas.forEach((l, i) => {
        const idade = m.linhas.length - 1 - i, y = 0.90 - (idade + m.frac) * 0.045;
        const a = l.a;
        c.fillStyle = cor.fundo; c.strokeStyle = tinta; c.lineWidth = (idade === 0 ? 2 : 0.85) * D;
        c.globalAlpha = a0 * (0.3 + i / m.linhas.length * 0.7);
        c.beginPath(); c.moveTo(X(0.03), Y(y));
        a.forEach((v, j) => c.lineTo(X(0.08 + j / (a.length - 1) * 0.77), Y(y - v * 0.14)));
        c.lineTo(X(0.88), Y(y)); c.lineTo(X(0.88), Y(y + 0.08)); c.lineTo(X(0.03), Y(y + 0.08));
        c.closePath(); c.fill(); c.beginPath();
        a.forEach((v, j) => j ? c.lineTo(X(0.08 + j / (a.length - 1) * 0.77), Y(y - v * 0.14)) : c.moveTo(X(0.08), Y(y - v * 0.14)));
        c.stroke();
      });
      c.globalAlpha = a0;
      texto('AGORA', 0.96, 0.9, 0.032, 'right');
      traco([[0.94, 0.82], [0.94, 0.18]], 0.4);
      traco([[0.925, 0.21], [0.94, 0.18], [0.955, 0.21]], 0.4);
      texto('tempo mais lento · ilustração', 0.03, 0.99, 0.031, 'left', false, true);
    }
    if (nome === 'calibracao') {
      const pts = [[0.04, 0.67], [0.10, 0.64], [0.16, 0.69], [0.22, 0.65], [0.28, 0.67], [0.34, 0.25], [0.40, 0.65], [0.46, 0.68], [0.52, 0.66], [0.60, 0.33], [0.67, 0.27], [0.74, 0.30], [0.81, 0.24], [0.88, 0.29], [0.96, 0.26]];
      texto('REFERÊNCIA', 0.04, 0.035, 0.034, 'left', false, true);
      texto('UM PICO', 0.34, 0.035, 0.034, 'center', false, true);
      texto('CONFIRMAÇÃO', 0.74, 0.035, 0.034, 'center', false, true);
      c.globalAlpha = a0 * 0.055; c.fillStyle = tinta; c.fillRect(X(0.03), Y(0.59), W * 0.23, H * 0.16); c.globalAlpha = a0;
      traco([[0.03, 0.47], [0.97, 0.47]], 0.45, 1, true);
      texto('limite', 0.97, 0.41, 0.032, 'right', false, true);
      const av = ease(t / 5.8);
      traco(pts, 1, 1.8, false, av);
      [0.60, 0.67, 0.74].forEach((x, i) => { if (av > (9 + i) / 15) { ponto(x, [0.33, 0.27, 0.30][i], 0.016); texto(String(i + 1), x, 0.87, 0.05, 'center'); } });
      texto(av < 0.79 ? 'observar antes de decidir' : 'movimento confirmado', 0.04, 0.97, 0.053, 'left', true);
    }
    if (nome === 'metodo') {
      const etapas = [ ['01', 'Simular', 'entender a ideia'], ['02', 'Coletar', 'registrar situações'], ['03', 'Separar', 'ajuste / teste'], ['04', 'Avaliar', 'acertos e erros'] ];
      etapas.forEach(([num, tit, sub], i) => {
        const pequeno = W / D < 500;
        const x = pequeno ? 0.02 + i % 2 * 0.51 : 0.02 + i * 0.25;
        const y = pequeno ? Math.floor(i / 2) * 0.49 : 0;
        const k = ease((t - i * 0.4) / 0.9);
        c.globalAlpha = a0 * (i === 0 ? 1 : 0.6) * k;
        texto(num, x, y + (pequeno ? 0.04 : 0.14), pequeno ? 0.09 : 0.12, 'left', true);
        texto(tit, x + (pequeno ? 0.12 : 0), y + (pequeno ? 0.04 : 0.37), 0.065, 'left', true);
        textoEmLinhas(sub, x, y + (pequeno ? 0.18 : 0.51), pequeno ? 0.43 : 0.22);
        traco([[x, y + (pequeno ? 0.29 : 0.65)], [x + (pequeno ? 0.42 : 0.20), y + (pequeno ? 0.29 : 0.65)]], i === 0 ? 0.9 : 0.3, 1, i !== 0);
        if (i === 0) texto('ESTAMOS AQUI', x, pequeno ? 0.38 : 0.79, 0.030);
      });
      c.globalAlpha = a0;
      if (W / D >= 500) texto('Separar sessões evita testar com os mesmos dados usados no ajuste.', 0.02, 0.99, 0.034, 'left', false, true);
    }
    if (nome === 'limites') {
      [['Quem?', 'não identifica a pessoa'], ['Onde?', 'não calcula sua posição'], ['Sala vazia?', 'calma não prova ausência']].forEach(([q, r], i) => {
        const y = 0.11 + i * 0.31, k = ease((t - i * 0.4) / 0.8);
        c.globalAlpha = a0 * k;
        texto(q, 0.05, y, 0.11, 'left', true);
        texto(r, 0.05, y + 0.12, 0.044, 'left', false, true);
        traco([[0.05, y + 0.21], [0.95, y + 0.21]], 0.22);
      }); c.globalAlpha = a0;
    }
    if (nome === 'aplicacao') {
      const a = perfil(0), k = ease((t - 1) / 2.5);
      serie(a, 0.03, 0.61, 0.29, 0.32, 0.3);
      serie(perfil(10 * k), 0.03, 0.61, 0.29, 0.32);
      texto('mudança inesperada', 0.03, 0.84, 0.036, 'left', false, true);
      traco([[0.36, 0.45], [0.49, 0.45]], 0.4 * k);
      c.globalAlpha = a0 * k;
      if (W / D < 500) {
        texto('Vale', 0.55, 0.34, 0.12, 'left', true);
        texto('verificar?', 0.55, 0.47, 0.12, 'left', true);
      } else texto('Vale verificar?', 0.55, 0.40, 0.14, 'left', true);
      textoEmLinhas('Uma pessoa decide o próximo passo.', 0.55, 0.65, 0.43, 0.037);
      c.globalAlpha = a0;
      texto('HIPÓTESE DE USO · AINDA NÃO VALIDADA', 0.03, 0.05, 0.032, 'left', false, true);
    }
    if (nome === 'privacidade') {
      const itens = [['Medir', 'Explicar a coleta.'], ['Acessar', 'Limitar quem vê.'], ['Guardar', 'Só o necessário.']];
      itens.forEach(([tit, sub], i) => {
        const x = 0.02 + i * 0.335, k = ease((t - i * 0.5) / 1.2);
        c.globalAlpha = a0 * k;
        texto('0' + (i + 1), x, 0.12, 0.04, 'left', false, true);
        texto(tit, x, 0.37, 0.13, 'left', true);
        texto(sub, x, 0.60, 0.04, 'left', false, true);
        traco([[x, 0.77], [x + 0.26, 0.77]], 0.35);
      }); c.globalAlpha = a0;
      texto('Participar começa por entender.', 0.02, 0.98, 0.052, 'left', true);
    }
    if (nome === 'fim') {
      const k = ease((t - 1) / 4), N = 18, cx = X(0.5), cy = Y(0.48), R = Math.min(W, H) * 0.38;
      for (let i = 0; i < N; i++) {
        const a = perfil(i), r = R * (0.14 + i / N * 0.86);
        c.globalAlpha = a0 * (0.26 + i / N * 0.65); c.strokeStyle = tinta; c.lineWidth = (i === N - 1 ? 1.8 : 0.9) * D;
        c.beginPath();
        for (let j = 0; j <= 96; j++) {
          const u = j / 96, v = a[Math.min(a.length - 1, Math.floor(u * (a.length - 1)))];
          const rr = r + (v - 0.5) * R * 0.08, ang = u * TAU - Math.PI / 2;
          const x = mix(X(0.08 + u * 0.84), cx + Math.cos(ang) * rr, k);
          const y = mix(Y(0.17 + i / N * 0.64 - v * 0.075), cy + Math.sin(ang) * rr, k);
          j ? c.lineTo(x, y) : c.moveTo(x, y);
        } c.stroke();
      } c.globalAlpha = a0;
      texto('TEMPO → DESENHO', 0.5, 0.94, 0.033, 'center', false, true);
    }
  }

  function desenhar(c, G, q, cor, tempo, prm, ex) {
    const u = prm._u, a = ex.cenaDe, b = ex.cenaPara;
    const render = (nome, alfa, deslocar) => {
      if (alfa < 0.001 || nome === 'aovivo') return;
      c.save(); c.globalAlpha = alfa; c.translate(0, G.bh * deslocar);
      desenho(c, G, cor, nome, tempo, ex); c.restore();
    };
    if (!u) render(a, 1, 0);
    else {
      render(a, 1 - ease((u - 0.12) / 0.48), -0.025 * ease(u));
      render(b, ease((u - 0.38) / 0.5), 0.035 * (1 - ease((u - 0.38) / 0.5)));
    }
  }
  const api = { soma, perfil, memoria, desenhar };
  raiz.WaveCenas = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* Sons do modo escuta: quatro propostas e o som de hoje, para comparar.
 *
 * Cada opção tem duas partes:
 *   calcular(S)      -> o estado do som a partir da sala (puro; serve também para o desenho)
 *   audio(ctx, M)    -> { aplicar(estado, t, S), parar(t) } (Web Audio)
 * `t` é o tempo do áudio em que a mudança acontece. Assim a mesma opção toca ao vivo
 * e também é gravada num OfflineAudioContext para medir volume e contraste.
 * Nenhuma opção toca bipe de alerta: o próprio som muda quando alguém se mexe.
 */
(function (raiz) {
  'use strict';

  /* ---------- peças comuns ---------- */
  const cache = new WeakMap();
  function guardado(ctx, chave, fazer) {
    let m = cache.get(ctx);
    if (!m) { m = {}; cache.set(ctx, m); }
    if (!m[chave]) m[chave] = fazer();
    return m[chave];
  }
  function aleatorio(semente) {
    let s = semente >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  // ruído rosado (Paul Kellet, versão econômica), um canal por lado, de tamanhos diferentes para não repetir junto
  function ruidoRosa(ctx) {
    return guardado(ctx, 'rosa', () => {
      const r = aleatorio(11);
      const buf = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 5.3), ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < d.length; i++) {
          const w = r() * 2 - 1;
          b0 = 0.997 * b0 + w * 0.0296; b1 = 0.985 * b1 + w * 0.0325; b2 = 0.95 * b2 + w * 0.048;
          d[i] = (b0 + b1 + b2 + w * 0.05) * 0.5;
        }
      }
      return buf;
    });
  }
  function ruidoBranco(ctx) {
    return guardado(ctx, 'branco', () => {
      const r = aleatorio(23);
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 4.7), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
      return buf;
    });
  }
  function tocarBuffer(ctx, buf) {
    const f = ctx.createBufferSource(); f.buffer = buf; f.loop = true; f.start(0);
    return f;
  }
  // Reverberação feita na hora: ruído que decai e escurece, um pouco diferente em cada ouvido.
  function respostaSala(ctx, dur = 3.4) {
    return guardado(ctx, 'rev', () => {
      const r = aleatorio(5), n = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(2, n, ctx.sampleRate);
      const pre = Math.floor(ctx.sampleRate * 0.018);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let y = 0;
        for (let i = pre; i < n; i++) {
          const t = (i - pre) / ctx.sampleRate;
          const c = 0.08 + 0.75 * Math.exp(-t / 0.5);   // o filtro fecha com o tempo: a cauda fica escura
          y += c * ((r() * 2 - 1) - y);
          d[i] = y * Math.exp(-t / 0.75);
        }
      }
      return buf;
    });
  }

  // Saída comum: entrada -> seco + reverberação -> limitador -> volume.
  function mesa(ctx, destino = ctx.destination) {
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.25;
    const volume = ctx.createGain(); volume.gain.value = 0.8;
    lim.connect(volume).connect(destino);
    const rev = ctx.createConvolver(); rev.normalize = true; rev.buffer = respostaSala(ctx);
    const revVolta = ctx.createGain(); revVolta.gain.value = 0.9;
    rev.connect(revVolta).connect(lim);
    return { ctx, seco: lim, rev, volume, lim };
  }
  // Uma saída de opção com fade e quanto vai para a reverberação.
  function saida(ctx, M, molhado) {
    const g = ctx.createGain(); g.gain.value = 0;
    const w = ctx.createGain(); w.gain.value = molhado;
    g.connect(M.seco); g.connect(w).connect(M.rev);
    return g;
  }
  function entrar(g, t, alvo = 1, tau = 0.25) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0, t); g.gain.setTargetAtTime(alvo, t, tau); }
  function sumir(g, t, fontes, tau = 0.2) {
    g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, tau);
    for (const f of fontes) { try { f.stop(t + tau * 6); } catch (e) { /* já parou */ } }
  }
  const media = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const limitar = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  function ultima(S) { return S.leituras[S.leituras.length - 1]; }

  /* ---------- 1. Vogal: o formato do sinal vira o timbre de uma voz ---------- */
  const vogal = {
    id: 'vogal',
    f0: 87.31,                      // fá grave (F2), perto de uma voz masculina
    N: 36,                          // harmônicos até ~3,1 kHz, onde ficam as vogais
    calcular(S) {
      const l = ultima(S), u = S.uteis;
      if (!l || !u.length) return { w: [], nivel: S.nivel };
      const m = media(u.map((k) => l.a[k]));
      // A forma é suavizada (mais devagar com a sala parada, para o ruído não fazer a voz tremular).
      if (!this.forma || this.forma.length !== u.length) this.forma = u.map((k) => l.a[k] / m);
      const alfa = 0.3 + 0.5 * S.nivel;
      u.forEach((k, j) => { this.forma[j] += alfa * (l.a[k] / m - this.forma[j]); });
      // O formato das subportadoras vira a "boca": um filtro de 180 Hz a 3,2 kHz, a faixa das vogais.
      // Cada harmônico da nota passa por ele. A forma é exagerada (cubo) para a vogal ficar clara.
      const F = this.forma, ult = F.length - 1;
      const w = [];
      for (let n = 1; n <= this.N; n++) {
        const p = limitar(Math.log((n * this.f0) / 180) / Math.log(3200 / 180)) * ult;
        const i = Math.floor(p), fr = p - i;
        const r = F[i] * (1 - fr) + F[Math.min(ult, i + 1)] * fr;
        w.push(Math.pow(Math.max(0, r), 3) / Math.pow(n, 1.6));   // os agudos caem rápido: voz macia, não buzina
      }
      const norma = Math.sqrt(w.reduce((a, x) => a + x * x, 0)) || 1;
      return { w: w.map((x) => x / norma), nivel: S.nivel };
    },
    audio(ctx, M) {
      const N = this.N, saidaV = saida(ctx, M, 0.5);
      const passaBaixa = ctx.createBiquadFilter(); passaBaixa.type = 'lowpass'; passaBaixa.frequency.value = 3000; passaBaixa.Q.value = 0.4;
      const esq = ctx.createStereoPanner(); esq.pan.value = -0.4;
      const dir = ctx.createStereoPanner(); dir.pan.value = 0.4;
      esq.connect(passaBaixa); dir.connect(passaBaixa); passaBaixa.connect(saidaV);
      const vib = ctx.createOscillator(); vib.frequency.value = 4.7;
      const vibG = ctx.createGain(); vibG.gain.value = 3;
      vib.connect(vibG); vib.start();
      const r = aleatorio(3), ganhos = [], fontes = [vib];
      for (let n = 1; n <= N; n++) {
        const o = ctx.createOscillator(); o.frequency.value = this.f0 * n; o.detune.value = (r() - 0.5) * 7;
        const g = ctx.createGain(); g.gain.value = 0;
        vibG.connect(o.detune);
        o.connect(g).connect(n % 2 ? esq : dir); o.start();
        ganhos.push(g); fontes.push(o);
      }
      let primeira = true;
      return {
        aplicar(e, t) {
          if (primeira) { entrar(saidaV, t, 1, 0.4); primeira = false; }
          const L = 0.085 + 0.06 * e.nivel;
          for (let j = 0; j < N; j++) ganhos[j].gain.setTargetAtTime((e.w[j] || 0) * L, t, 0.09);
          vibG.gain.setTargetAtTime(3 + 24 * e.nivel, t, 0.35);      // a voz treme quando alguém se mexe
        },
        parar(t) { sumir(saidaV, t, fontes); },
      };
    },
  };

  /* ---------- 2. Harpa de vento: o vento de hoje passa por cordas afinadas ---------- */
  const HARMONICOS = [4, 5, 6, 7, 8, 9, 10, 12];   // como numa harpa eólica: as cordas soam harmônicos de uma nota só
  const harpa = {
    id: 'harpa',
    f0: 65.41,                      // dó grave (C2)
    calcular(S) {
      return { nivel: S.nivel, cordas: Array.from(S.grupos) };
    },
    audio(ctx, M) {
      const sV = saida(ctx, M, 0.25), sC = saida(ctx, M, 0.7);
      const vento = tocarBuffer(ctx, ruidoRosa(ctx));
      const filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 320; filtro.Q.value = 0.6;
      const gV = ctx.createGain(); gV.gain.value = 0.06;
      vento.connect(filtro).connect(gV).connect(sV);
      const branco = tocarBuffer(ctx, ruidoBranco(ctx));
      const cordas = HARMONICOS.map((h, i) => {
        const f = this.f0 * h;
        const b1 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = f; b1.Q.value = 38;
        const b2 = ctx.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = f; b2.Q.value = 38;
        const g = ctx.createGain(); g.gain.value = 0;
        const p = ctx.createStereoPanner(); p.pan.value = -0.7 + (1.4 * i) / (HARMONICOS.length - 1);
        branco.connect(b1).connect(b2).connect(g).connect(p).connect(sC);
        return g;
      });
      const r = aleatorio(9), fase = HARMONICOS.map(() => r() * 6.28), vel = HARMONICOS.map(() => 0.6 + r() * 0.9);
      let primeira = true;
      return {
        aplicar(e, t) {
          if (primeira) { entrar(sV, t, 1, 0.5); entrar(sC, t, 1, 0.5); primeira = false; }
          filtro.frequency.setTargetAtTime(320 + 1500 * e.nivel, t, 0.3);
          gV.gain.setTargetAtTime(0.06 + 0.1 * e.nivel, t, 0.3);
          for (let i = 0; i < cordas.length; i++) {
            // o vento não é constante: cada corda oscila devagar no próprio ritmo
            const sopro = 0.7 + 0.3 * Math.sin(fase[i] + vel[i] * t);
            const alvo = (0.035 + 0.95 * Math.pow(e.cordas[i], 0.8)) * sopro * 14 / Math.sqrt(HARMONICOS[i] / 4);
            cordas[i].gain.setTargetAtTime(alvo, t, 0.35);
          }
        },
        parar(t) { sumir(sV, t, [vento, branco]); sumir(sC, t, []); },
      };
    },
  };

  /* ---------- 3. Batimento: o acorde desafina e pulsa ---------- */
  const NOTAS_B = [146.83, 220.0, 329.63];   // ré, lá, mi
  const batimento1 = {
    id: 'batimento1',
    calcular(S) {
      const g = S.grupos;
      const acts = [media([g[0], g[1], g[2]]), media([g[3], g[4]]), media([g[5], g[6], g[7]])];
      // parado: 0,07 Hz (um respiro a cada 14 s); mexendo: até uns 6 Hz
      return { df: acts.map((a) => 0.07 + 6 * Math.pow(a, 0.85)), acts, nivel: S.nivel };
    },
    audio(ctx, M) {
      const s = saida(ctx, M, 0.45);
      const onda = ctx.createPeriodicWave(new Float32Array([0, 0, 0, 0, 0]), new Float32Array([0, 1, 0.32, 0.1, 0.04]));
      const fontes = [], segundas = [];
      NOTAS_B.forEach((f, i) => {
        const p = ctx.createStereoPanner(); p.pan.value = [-0.35, 0.35, 0][i];
        p.connect(s);
        const ganho = [0.04, 0.032, 0.022][i];
        for (let k = 0; k < 2; k++) {
          const o = ctx.createOscillator(); o.setPeriodicWave(onda); o.frequency.value = f;
          const g = ctx.createGain(); g.gain.value = k ? ganho * 0.75 : ganho;
          o.connect(g).connect(p); o.start();
          fontes.push(o);
          if (k) segundas.push(o);
        }
      });
      let primeira = true;
      return {
        aplicar(e, t) {
          if (primeira) { entrar(s, t, 1, 0.5); primeira = false; }
          segundas.forEach((o, i) => o.frequency.setTargetAtTime(NOTAS_B[i] + e.df[i], t, 0.5));
          s.gain.setTargetAtTime(1 + 0.7 * e.nivel, t, 0.5);    // e o acorde cresce um pouco
        },
        parar(t) { sumir(s, t, fontes); },
      };
    },
  };

  /* ---------- 3b. Batimento, versão 2: o som do demo/escuta.js, o mesmo que vai para o site ---------- */
  const batimento = {
    id: 'batimento',
    calcular(S) {
      const E = raiz.WaveEscuta || (typeof require !== 'undefined' && require('./escuta.js'));
      const dt = this.t == null ? 0.2 : S.t - this.t;
      if (dt <= 0 && this.e) return this.e;
      this.t = S.t;
      this.e = E.passo(this.e, { v: S.v, limiar: S.cal && S.cal.limiar, leitura: ultima(S) }, dt);
      return this.e;
    },
    audio(ctx, M) {
      const E = raiz.WaveEscuta;
      const som = E.criar(ctx, M.seco);
      let tAnt = null;
      return {
        som,
        // o site atualiza o som a cada medida do detector (0,2 s); aqui é igual
        aplicar(e, t, S, passo) {
          if (!passo) return;
          const dt = tAnt == null ? 0.2 : Math.max(0.01, t - tAnt);
          tAnt = t;
          som.atualizar({ v: S.v, limiar: S.cal && S.cal.limiar, leitura: ultima(S) }, dt, t);
        },
        parar(t) { som.parar(t); },
      };
    },
  };

  /* ---------- 4. Partitura: as linhas lidas como o cilindro de uma caixinha de música ---------- */
  const ESCALA = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0, 493.88, 587.33];   // ré pentatônica, de D3 a D5
  const PASSO_NOTA = 0.32, PASSOS = 8;
  const partitura = {
    id: 'partitura',
    calcular(S) {
      const l = ultima(S);
      if (!l || !S.cal) return { base: [], graus: [], forca: [] };
      const p = S.cal.perfil, gs = S.gruposDe;
      const pgs = gs.map((ks) => media(ks.map((k) => p[k])));
      const menor = Math.min(...pgs), maior = Math.max(...pgs);
      const base = [], graus = [], forca = [];
      for (let i = 0; i < PASSOS; i++) {
        const ks = gs[i];
        const pg = pgs[i], ag = media(ks.map((k) => l.a[k]));
        // a melodia da sala vazia: grupos mais fortes = notas mais agudas, usando da 2ª à 9ª nota da escala
        const b = 1 + Math.round(((pg - menor) / (maior - menor || 1)) * 7);
        const desvio = (ag - pg) / pg;
        const salto = Math.abs(desvio) < 0.06 ? 0 : Math.round(desvio * 9);
        base.push(b);
        graus.push(Math.round(limitar(b + salto, 0, ESCALA.length - 1)));
        forca.push(S.grupos[i]);
      }
      return { base, graus, forca, nivel: S.nivel };
    },
    audio(ctx, M) {
      const s = saida(ctx, M, 0.55);
      const passaBaixa = ctx.createBiquadFilter(); passaBaixa.type = 'lowpass'; passaBaixa.frequency.value = 2600;
      passaBaixa.connect(s);
      let prox = null, passo = 0, primeira = true;
      const tocadas = [];
      const nota = (t, f, vel, pan) => {
        const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(passaBaixa);
        // corpo (f e 2f) e um "estalo" agudo que some rápido, como uma lâmina de caixinha de música abafada
        for (const [mult, amp, dur] of [[1, 1, 1.9], [2, 0.28, 0.9], [4.01, 0.07, 0.25]]) {
          const o = ctx.createOscillator(); o.frequency.value = f * mult;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.24 * vel * amp, t + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          o.connect(g).connect(p); o.start(t); o.stop(t + dur + 0.05);
        }
      };
      return {
        tocadas,
        aplicar(e, t) {
          if (!e.graus.length) return;
          if (primeira) { entrar(s, t, 1, 0.05); prox = t + 0.08; primeira = false; }
          while (prox < t + 0.2) {
            const i = passo % PASSOS, f = e.forca[i] || 0;
            const vel = 0.32 + 0.68 * Math.pow(f, 0.7);
            nota(prox, ESCALA[e.graus[i]], vel, -0.5 + i / (PASSOS - 1));
            // quando o grupo treme muito, a mesma nota uma oitava acima, no contratempo
            if (f > 0.45 && e.graus[i] + 5 < ESCALA.length) nota(prox + PASSO_NOTA / 2, ESCALA[e.graus[i] + 5], vel * 0.45, 0.5 - i / (PASSOS - 1));
            tocadas.push({ t: prox, i, grau: e.graus[i] });
            if (tocadas.length > 32) tocadas.shift();
            prox += PASSO_NOTA; passo++;
          }
        },
        parar(t) { sumir(s, t, [], 0.3); },
      };
    },
  };

  /* ---------- Hoje: o som que está no site (vento, gotas e o alerta de dois toques) ---------- */
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
  const hoje = {
    id: 'hoje',
    calcular(S) { return { nivel: S.nivel, detectado: S.detectado }; },
    audio(ctx, M) {
      // a cadeia de hoje: limitador em -28 dB, como no index.html
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -28; comp.knee.value = 20; comp.ratio.value = 8; comp.attack.value = 0.01; comp.release.value = 0.3;
      const s = saida(ctx, M, 0);
      comp.connect(s);
      const vento = tocarBuffer(ctx, ruidoRosa(ctx));
      const filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 260; filtro.Q.value = 0.7;
      const gV = ctx.createGain(); gV.gain.value = 0.0001;
      vento.connect(filtro).connect(gV).connect(comp);
      const r = aleatorio(17);
      let antes = false, primeira = true, nivel = 0;
      const tom = (f, dur, quando, ganho) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, quando); g.gain.exponentialRampToValueAtTime(ganho, quando + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
        o.connect(g).connect(comp); o.start(quando); o.stop(quando + dur + 0.05);
      };
      const gota = (t, forca) => {
        const f = PENTA[Math.floor(r() * PENTA.length)];
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03 + 0.04 * forca, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        o.connect(g).connect(comp); o.start(t); o.stop(t + 0.5);
      };
      return {
        // chamado a cada 0,1 s; no site o vento e as gotas mudam a cada 0,2 s, junto com a medida
        aplicar(e, t, S, passo) {
          if (primeira) { entrar(s, t, 1, 0.05); primeira = false; }
          if (e.detectado && !antes) { tom(659.25, 0.5, t, 0.07); tom(880, 0.7, t + 0.14, 0.06); }
          antes = e.detectado;
          if (!passo) return;
          nivel = e.nivel;
          filtro.frequency.setTargetAtTime(260 + 2000 * nivel, t, 0.25);
          gV.gain.setTargetAtTime(0.03 + 0.15 * nivel, t, 0.25);
          const taxa = 5 * Math.max(0, nivel - 0.08);
          let dt = 0;
          while (taxa > 0) { dt += -Math.log(1 - r()) / taxa; if (dt >= 0.2) break; gota(t + dt, nivel); }
        },
        parar(t) { sumir(s, t, [vento]); },
      };
    },
  };

  const OPCOES = { vogal, harpa, batimento, batimento1, partitura, hoje };
  for (const o of Object.values(OPCOES)) o.reiniciar = function () { this.forma = null; this.e = null; this.t = null; };
  const api = { OPCOES, mesa, HARMONICOS, ESCALA, PASSOS, PASSO_NOTA, NOTAS_B };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.WaveSons = api;
})(typeof window !== 'undefined' ? window : globalThis);

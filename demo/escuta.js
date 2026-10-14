/* Som do modo escuta: "Batimento".
 *
 * Um acorde de três notas (ré, lá, mi). Cada nota é tocada por dois osciladores: um fixo e um que
 * pode desafinar um pouco. Com a sala parada, os dois ficam quase iguais e o acorde só "respira"
 * devagar. Quando alguém se mexe, o segundo desafina e as duas ondas passam a se somar e se cancelar:
 * o som pulsa (uá-uá-uá), como o sinal do Wi-Fi faz entre os caminhos da sala.
 *
 * Para a mudança não passar despercebida:
 *   - o pulso fica fundo e mais rápido conforme o movimento;
 *   - o acorde sobe de volume e abre (fica mais brilhante);
 *   - uma nota grave (ré, 73 Hz) entra pulsando devagar, para sentir no corpo;
 *   - cada ouvido pulsa num ritmo um pouco diferente, então o pulso anda de um lado para o outro;
 *   - chega rápido (0,25 s) e vai embora devagar (1,6 s).
 *
 * passo() é puro (testado no Node, em ferramentas/testes/test_escuta_js.py). criar() monta o som.
 * Funciona no navegador (window.WaveEscuta) e no Node (require).
 */
(function (raiz) {
  'use strict';

  const NOTAS = [146.83, 220.0, 329.63];   // ré, lá, mi
  const CORPO = 73.42;                     // ré grave
  const RESPIRO = 0.06;                    // Hz: com a sala parada, um respiro a cada ~17 s
  const PULSO_MAX = 4.5;                   // Hz: o pulso mais rápido, com bastante movimento
  const OUVIDO_DIR = 1.12;                 // o ouvido direito pulsa 12% mais rápido: o pulso passeia
  const SOBE_S = 0.25, DESCE_S = 1.6;

  // 0 = sala parada (abaixo do limiar do detector); 1 = tremor de 2,5x o limiar ou mais.
  // No limiar já dá uns 0,1: o pulso começa junto com o "Movimento." da tela.
  function alvoMovimento(v, limiar) {
    if (!(limiar > 0) || !Number.isFinite(v)) return null;
    return Math.max(0, Math.min(1, (v / limiar - 0.85) / 1.6));
  }

  function inicial() { return { m: 0, ...derivar(0) }; }

  function derivar(m) {
    const s = Math.sqrt(m);
    return {
      // Hz. As três notas e a nota grave pulsam juntas: assim o pulso fica fundo
      // (com ritmos diferentes, o vale de uma nota é tapado pelo pico da outra).
      pulso: RESPIRO + PULSO_MAX * s,
      fundo: 0.15 + 0.8 * Math.min(1, 1.15 * s),   // força do oscilador que desafina: parado, o respiro é raso
      ganho: 0.65 + Math.pow(m, 0.6),              // o acorde cresce (até 2,5x, uns 8 dB)
      brilho: 700 + 3000 * m,                      // e abre (passa-baixa de 700 Hz até 3,7 kHz)
      corpo: Math.pow(m, 0.8),                     // a nota grave só entra com movimento
    };
  }

  // Um passo de tempo. medida = { v, limiar } (a medida do detector); dt em segundos.
  function passo(estado, medida, dt) {
    const e = estado || inicial();
    const alvo = alvoMovimento(medida.v, medida.limiar);
    let m = e.m;
    if (alvo !== null) m += (1 - Math.exp(-dt / (alvo > e.m ? SOBE_S : DESCE_S))) * (alvo - e.m);
    return { m, ...derivar(m) };
  }

  /* ---------- o som (Web Audio) ---------- */
  function respostaSala(ctx, dur = 3.4) {
    let s = 5;
    const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    const n = Math.floor(ctx.sampleRate * dur), pre = Math.floor(ctx.sampleRate * 0.018);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let y = 0;
      for (let i = pre; i < n; i++) {
        const t = (i - pre) / ctx.sampleRate;
        y += (0.08 + 0.75 * Math.exp(-t / 0.5)) * ((r() * 2 - 1) - y);   // a cauda escurece com o tempo
        d[i] = y * Math.exp(-t / 0.75);
      }
    }
    return buf;
  }

  // Monta o som e liga em `destino`. Fica em silêncio até a primeira medida: sem sinal, não toca nada.
  function criar(ctx, destino) {
    const t0 = ctx.currentTime;
    const onda = ctx.createPeriodicWave(new Float32Array(7), new Float32Array([0, 1, 0.32, 0.12, 0.06, 0.03, 0.015]));
    const junta = ctx.createChannelMerger(2);
    const passaBaixa = ctx.createBiquadFilter(); passaBaixa.type = 'lowpass'; passaBaixa.frequency.value = 700; passaBaixa.Q.value = 0.5;
    const total = ctx.createGain(); total.gain.value = 0.65;
    const entrada = ctx.createGain(); entrada.gain.value = 0;
    const rev = ctx.createConvolver(); rev.buffer = respostaSala(ctx);
    const molhado = ctx.createGain(); molhado.gain.value = 0.25;
    const medidor = ctx.createAnalyser(); medidor.fftSize = 1024;
    junta.connect(passaBaixa).connect(total).connect(entrada);
    entrada.connect(destino); entrada.connect(molhado).connect(rev).connect(destino);
    entrada.connect(medidor);

    const fontes = [], fixos = [], esq = [], dir = [], ganhosB = [];
    const osc = (f, tipo) => { const o = ctx.createOscillator(); if (tipo) o.setPeriodicWave(tipo); o.frequency.value = f; o.start(t0); fontes.push(o); return o; };
    NOTAS.forEach((f, i) => {
      const forca = [0.042, 0.034, 0.024][i];
      const gA = ctx.createGain(); gA.gain.value = forca;
      osc(f, onda).connect(gA);
      gA.connect(junta, 0, 0); gA.connect(junta, 0, 1);              // a nota fixa, nos dois ouvidos
      const gL = ctx.createGain(), gR = ctx.createGain();
      gL.gain.value = gR.gain.value = forca * 0.15;
      const oL = osc(f + RESPIRO, onda), oR = osc(f + RESPIRO * OUVIDO_DIR, onda);
      oL.connect(gL).connect(junta, 0, 0);                            // a que desafina, uma em cada ouvido
      oR.connect(gR).connect(junta, 0, 1);
      fixos.push(f); esq.push(oL); dir.push(oR); ganhosB.push([gL, gR, forca]);
    });
    const gC = ctx.createGain(); gC.gain.value = 0;
    const c1 = osc(CORPO), c2 = osc(CORPO + RESPIRO);
    c1.connect(gC); c2.connect(gC);
    gC.connect(junta, 0, 0); gC.connect(junta, 0, 1);

    const amostras = new Float32Array(medidor.fftSize);
    let estado = inicial(), tocando = false;
    return {
      get estado() { return estado; },
      // Chamado a cada medida do detector (0,2 s). `t` = quando a mudança começa (tempo do áudio).
      atualizar(medida, dt, t = ctx.currentTime) {
        estado = passo(estado, medida, dt);
        const e = estado;
        if (!tocando) { entrada.gain.cancelScheduledValues(t); entrada.gain.setTargetAtTime(1, t, 0.3); tocando = true; }
        for (let i = 0; i < NOTAS.length; i++) {
          esq[i].frequency.setTargetAtTime(fixos[i] + e.pulso, t, 0.3);
          dir[i].frequency.setTargetAtTime(fixos[i] + e.pulso * OUVIDO_DIR, t, 0.3);
          const [gL, gR, forca] = ganhosB[i];
          gL.gain.setTargetAtTime(forca * e.fundo, t, 0.25); gR.gain.setTargetAtTime(forca * e.fundo, t, 0.25);
        }
        c2.frequency.setTargetAtTime(CORPO + e.pulso, t, 0.3);
        gC.gain.setTargetAtTime(0.05 * e.corpo, t, 0.3);
        total.gain.setTargetAtTime(e.ganho, t, 0.3);
        passaBaixa.frequency.setTargetAtTime(e.brilho, t, 0.3);
        return e;
      },
      // Volume de agora (0 a ~1), medido no próprio som: serve para o ponto da tela pulsar junto.
      nivel() {
        medidor.getFloatTimeDomainData(amostras);
        let s = 0;
        for (let i = 0; i < amostras.length; i++) s += amostras[i] * amostras[i];
        return Math.sqrt(s / amostras.length);
      },
      // O sinal parou de chegar: o som some devagar (e volta na próxima medida).
      calar(t = ctx.currentTime) {
        if (!tocando) return;
        entrada.gain.cancelScheduledValues(t); entrada.gain.setTargetAtTime(0, t, 0.6); tocando = false;
      },
      parar(t = ctx.currentTime) {
        entrada.gain.cancelScheduledValues(t);
        entrada.gain.setTargetAtTime(0, t, 0.25);
        for (const o of fontes) { try { o.stop(t + 1.5); } catch (e) { /* já parou */ } }
        if (!(typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext)) {
          setTimeout(() => { try { entrada.disconnect(); } catch (e) { /* ok */ } }, 1800);
        }
      },
    };
  }

  const api = { criar, passo, inicial, alvoMovimento, NOTAS, CORPO, RESPIRO, PULSO_MAX, OUVIDO_DIR, SOBE_S, DESCE_S };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.WaveEscuta = api;
})(typeof window !== 'undefined' ? window : globalThis);

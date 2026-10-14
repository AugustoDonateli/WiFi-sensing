/* Sala simulada para o laboratório de escuta.
 *
 * É a mesma simulação do demo/index.html (gerarPacote, movimento, CAMINHOS) e a mesma
 * regra do demo/nucleo.js (oscilação em janela de 1 s, passo de 0,2 s, limiar = média + 3 desvios).
 * Dados inventados: servem para comparar os sons, não para medir nada.
 */
(function (raiz) {
  'use strict';

  const DF = 312.5e3;
  const CAMINHOS = [[1, 5e-9, 0], [0.55, 22e-9, 1.1], [0.35, 48e-9, 2.3], [0.2, 85e-9, 4.0]];
  const NULAS = new Set([0, 1, 2, 3, 4, 60, 61, 62, 63]);
  const CENAS = { vazio: 0, parado: 0.22, andando: 0.6, devagar: 0.14, mao: 1.2 };
  const TAXA = 100, LEITURA_S = 0.1, PASSO_S = 0.2, JANELA_S = 1, LINHAS = 48, GRUPOS = 8;

  function movimento(cena, t) {
    switch (cena) {
      case 'parado': return { tau: 35e-9, fase: 0.12 * Math.sin(2 * Math.PI * 0.25 * t) };
      case 'andando': return { tau: 40e-9 + 25e-9 * Math.sin(2 * Math.PI * t / 6), fase: 54 * Math.sin(2 * Math.PI * t / 6) };
      case 'devagar': return { tau: 40e-9 + 6e-9 * Math.sin(2 * Math.PI * t / 14), fase: 3 * Math.sin(2 * Math.PI * t / 14) };
      case 'mao': return { tau: 8e-9, fase: 3 * Math.sin(2 * Math.PI * 2 * t) + 2 * Math.sin(2 * Math.PI * 3.3 * t) };
      default: return { tau: 30e-9, fase: 0 };
    }
  }

  function criar(semente = 1) {
    let s = semente >>> 0 || 1;
    const rand = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let extra = null;
    const gauss = () => {
      if (extra !== null) { const g = extra; extra = null; return g; }
      const u = rand() || 1e-9, v = rand(), r = Math.sqrt(-2 * Math.log(u));
      extra = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    };

    const S = {
      cena: 'vazio', am: 0, t: 0, gerados: 0,
      janela: [],              // pacotes do último 1 s
      leituras: [],            // { a, d } a cada 0,1 s (as linhas da tela)
      formaLenta: null,
      v: NaN, sd: new Float32Array(64), nivel: 0, detectado: false,
      grupos: new Float32Array(GRUPOS), // 0 = como a sala vazia, 1 = bem agitado
      uteis: [], gruposDe: [],
      cal: null,               // { vMedia, vDesvio, limiar, perfil, sd0 }
      proxLeitura: LEITURA_S, proxPasso: PASSO_S,
      acima: 0, abaixo: 0,
      ouvintes: [],
    };

    function pacote(t) {
      S.am += 0.02 * (CENAS[S.cena] - S.am);
      const mv = movimento(S.cena, t);
      const amps = new Float32Array(64);
      for (let k = 0; k < 64; k++) {
        if (NULAS.has(k)) continue;
        const f = k - 32;
        let re = 0, im = 0;
        for (const [a, tau, ph] of CAMINHOS) { const ang = -2 * Math.PI * f * DF * tau + ph; re += a * Math.cos(ang); im += a * Math.sin(ang); }
        const angM = -2 * Math.PI * f * DF * mv.tau + mv.fase;
        re += S.am * Math.cos(angM) + 0.02 * gauss();
        im += S.am * Math.sin(angM) + 0.02 * gauss();
        amps[k] = 14 * Math.hypot(re, im);
      }
      return { t, amps };
    }

    // Oscilação do nucleo.js, guardando também o desvio de cada subportadora.
    function medir() {
      const ps = S.janela, n = ps.length;
      if (n < 10) return NaN;
      let soma = 0, cont = 0;
      for (let k = 2; k < 64; k++) {
        let m = 0;
        for (const p of ps) m += p.amps[k];
        m /= n;
        if (m < 0.5) { S.sd[k] = 0; continue; }
        let v = 0;
        for (const p of ps) { const d = p.amps[k] - m; v += d * d; }
        S.sd[k] = Math.sqrt(v / n);
        soma += S.sd[k]; cont++;
      }
      return cont ? soma / cont : NaN;
    }

    function guardarLeitura() {
      const ps = S.janela.filter((p) => p.t > S.t - LEITURA_S);
      if (!ps.length) return;
      const a = new Float32Array(64);
      for (const p of ps) for (let k = 0; k < 64; k++) a[k] += p.amps[k];
      for (let k = 0; k < 64; k++) a[k] /= ps.length;
      if (!S.formaLenta) S.formaLenta = Float32Array.from(a);
      const d = new Float32Array(64);
      for (let k = 0; k < 64; k++) { d[k] = a[k] - S.formaLenta[k]; S.formaLenta[k] += 0.05 * (a[k] - S.formaLenta[k]); }
      S.leituras.push({ a, d });
      if (S.leituras.length > LINHAS + 1) S.leituras.shift();
      for (const f of S.ouvintes) f('leitura', S);
    }

    function passo() {
      S.v = medir();
      if (!S.cal || Number.isNaN(S.v)) return;
      const c = S.cal;
      if (S.v > c.limiar) { S.acima++; S.abaixo = 0; } else { S.abaixo++; S.acima = 0; }
      if (!S.detectado && S.acima >= 3) S.detectado = true;
      else if (S.detectado && S.abaixo >= 5) S.detectado = false;
      // o mesmo "nível" do modo escuta de hoje: 0 = sala parada, 1 = bem agitada
      const x = Math.max(0, Math.min(1, (S.v / c.limiar - 0.7) / 3));
      S.nivel += 0.35 * (x - S.nivel);
      // cada grupo de subportadoras: quanto o desvio passou do da sala vazia
      for (let g = 0; g < GRUPOS; g++) {
        let r = 0;
        for (const k of S.gruposDe[g]) r += S.sd[k] / c.sd0[k];
        r /= S.gruposDe[g].length;
        // escala de log: 1,25x o desvio da sala vazia = 0; 10x = 1. Assim um tremor real, bem menor que o da simulação, ainda aparece.
        const alvo = Math.max(0, Math.min(1, Math.log(r / 1.25) / Math.log(8)));
        S.grupos[g] += 0.35 * (alvo - S.grupos[g]);
      }
      for (const f of S.ouvintes) f('passo', S);
    }

    function avancar(dt) {
      const fim = S.t + dt;
      while (S.gerados / TAXA <= fim) {
        const t = S.gerados / TAXA;
        S.gerados++;
        S.t = t;
        S.janela.push(pacote(t));
        while (S.janela.length && S.janela[0].t < t - JANELA_S) S.janela.shift();
        if (t >= S.proxLeitura) { guardarLeitura(); S.proxLeitura += LEITURA_S; }
        if (t >= S.proxPasso) { passo(); S.proxPasso += PASSO_S; }
      }
      S.t = fim;
    }

    // Calibração: 6 s de sala vazia, feitos na hora, como a calibração da página.
    function calibrar() {
      const vs = [], sds = [];
      const ouvir = (tipo) => { if (tipo === 'passo') return; };
      S.ouvintes.push(ouvir);
      const fim = S.t + 6;
      while (S.t < fim) {
        avancar(PASSO_S);
        if (!Number.isNaN(S.v)) { vs.push(S.v); sds.push(Float32Array.from(S.sd)); }
      }
      S.ouvintes.pop();
      const m = vs.reduce((a, b) => a + b, 0) / vs.length;
      const dp = Math.sqrt(vs.reduce((a, b) => a + (b - m) ** 2, 0) / vs.length);
      const sd0 = new Float32Array(64), perfil = new Float32Array(64);
      for (const x of sds) for (let k = 0; k < 64; k++) sd0[k] += x[k] / sds.length;
      for (const p of S.janela) for (let k = 0; k < 64; k++) perfil[k] += p.amps[k] / S.janela.length;
      S.uteis = [];
      for (let k = 2; k < 64; k++) if (perfil[k] > 0.5) { S.uteis.push(k); sd0[k] = Math.max(sd0[k], 1e-3); }
      S.gruposDe = Array.from({ length: GRUPOS }, (_, g) => S.uteis.filter((_, j) => Math.floor((j * GRUPOS) / S.uteis.length) === g));
      S.cal = { vMedia: m, vDesvio: dp, limiar: Math.max(m + 3 * dp, m * 1.3), perfil, sd0 };
    }

    calibrar();
    return {
      estado: S,
      avancar,
      definirCena(c) { if (c in CENAS) S.cena = c; },
      ouvir(f) { S.ouvintes.push(f); },
      razao() { return S.cal && !Number.isNaN(S.v) ? S.v / S.cal.vMedia : NaN; },
    };
  }

  const api = { criar, CENAS, LINHAS, GRUPOS, LEITURA_S, PASSO_S };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.WaveSala = api;
})(typeof window !== 'undefined' ? window : globalThis);

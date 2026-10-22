/* Núcleo do Wave Sense: leitura das linhas CSI_DATA e a regra do detector de movimento.
 *
 * É a mesma regra de ferramentas/detector.py. O teste ferramentas/testes/test_nucleo_js.py
 * roda as duas versões com os mesmos dados e confere que dão o mesmo resultado.
 * Funciona no navegador (window.WaveNucleo) e no Node (require), sem nenhuma biblioteca.
 */
(function (raiz) {
  'use strict';

  // Janela de 2 s e mínimo de 6 pacotes (feira, 22/10): com o canal cheio, chegavam só 10 a 20 pacotes por segundo,
  // e com 1 s e mínimo de 10 a medida sumia. Com 50 por segundo, funciona igual (só meio segundo mais lento).
  const JANELA_S = 2.0;          // janela da oscilação
  const PASSO_S = 0.2;           // uma medida nova a cada 0,2 s
  const CONFIRMA_LIGA = 3;       // medições seguidas acima do limiar para marcar movimento
  const CONFIRMA_DESLIGA = 5;    // medições seguidas abaixo para voltar a "parado"
  const K_DESVIOS = 3;
  const FATOR_MIN = 1.3;
  const MIN_PACOTES = 6;
  const IGNORAR = [0, 1];        // a Espressif avisa que os 4 primeiros bytes podem vir inválidos

  // Converte uma linha do firmware csi_recv (ESP32) em { id, rssi, amps }.
  // Para len 128/256/384 usa o bloco LLTF (64 subportadoras), como o ferramentas/analise.py.
  function lerLinhaCSI(texto) {
    texto = texto.trim();
    if (!texto.startsWith('CSI_DATA,')) return null;
    const a = texto.indexOf('"['), b = texto.lastIndexOf(']"');
    if (a < 0 || b < a) return null;
    const campos = texto.slice(0, a).split(',');   // 24 campos + vazio final
    if (campos.length !== 25) return null;
    const id = Number(campos[1]), rssi = Number(campos[3]);
    const len = Number(campos[22]), primeiraInvalida = Number(campos[23]);
    const vals = texto.slice(a + 2, b).split(',').map(Number);
    if (vals.length !== len || vals.some(Number.isNaN)) return null;
    const n = (len === 128 || len === 256 || len === 384) ? 64 : Math.floor(len / 2);
    const amps = new Float64Array(n);
    for (let k = 0; k < n; k++) amps[k] = Math.hypot(vals[2 * k], vals[2 * k + 1]);
    if (primeiraInvalida) { amps[0] = 0; amps[1] = 0; }
    return { id, rssi, amps };
  }

  // Volume de um pacote: a amplitude média (as subportadoras ignoradas contam como zero).
  function volume(amps) {
    let s = 0;
    for (let k = 0; k < amps.length; k++) if (!IGNORAR.includes(k)) s += amps[k];
    return s / amps.length;
  }

  // Oscilação de uma janela: desvio padrão de cada subportadora útil, média entre elas.
  // Antes, cada pacote é levado ao volume médio da janela: o ganho automático da placa B
  // sobe e desce o volume de tudo de uma vez, pacote a pacote, e isso não é movimento
  // (no ESP32 o exemplo oficial não corrige o ganho; testado com as coletas S0 de 15/10).
  function oscilacao(pacotes) {
    if (pacotes.length < MIN_PACOTES) return NaN;
    const K = pacotes[pacotes.length - 1].amps.length;
    const ps = [], vols = [];
    for (const p of pacotes) {
      if (p.amps.length !== K) continue;
      const v = volume(p.amps);
      if (v > 0) { ps.push(p); vols.push(v); }
    }
    const n = ps.length;
    if (n < MIN_PACOTES) return NaN;
    const ref = vols.reduce((s, v) => s + v, 0) / n;
    const esc = vols.map((v) => ref / v);
    let soma = 0, cont = 0;
    for (let k = 0; k < K; k++) {
      if (IGNORAR.includes(k)) continue;
      let m = 0;
      for (let i = 0; i < n; i++) m += ps[i].amps[k] * esc[i];
      m /= n;
      if (m < 0.5) continue;                    // subportadora nula
      let v = 0;
      for (let i = 0; i < n; i++) { const d = ps[i].amps[k] * esc[i] - m; v += d * d; }
      soma += Math.sqrt(v / n);
      cont++;
    }
    return cont ? soma / cont : NaN;
  }

  // Mesma série que detector.serie_oscilacao do Python (usada nos testes e em análises).
  function serieOscilacao(pacotes, janela = JANELA_S, passo = PASSO_S) {
    if (!pacotes.length) return { tempos: [], valores: [] };
    const inicio = pacotes[0].t + janela, fimTotal = pacotes[pacotes.length - 1].t + 1e-9;
    const n = Math.max(0, Math.ceil((fimTotal - inicio) / passo));   // mesma conta do detector.py
    const tempos = [], valores = [];
    for (let i = 0; i < n; i++) {
      const fim = inicio + i * passo;
      tempos.push(fim);
      valores.push(oscilacao(pacotes.filter((p) => p.t >= fim - janela && p.t <= fim)));
    }
    return { tempos, valores };
  }

  function estatisticas(valores) {
    const v = valores.filter((x) => !Number.isNaN(x));
    const media = v.reduce((s, x) => s + x, 0) / v.length;
    const desvio = Math.sqrt(v.reduce((s, x) => s + (x - media) ** 2, 0) / v.length);
    return { n: v.length, media, desvio };
  }

  function limiarDeCalibracao(valores) {
    const { n, media, desvio } = estatisticas(valores);
    if (n < 5) throw new Error('poucas medidas para calibrar (mínimo 5)');
    return Math.max(media + K_DESVIOS * desvio, media * FATOR_MIN);
  }

  class Detector {
    constructor(limiar) { this.limiar = limiar; this.detectado = false; this.acima = 0; this.abaixo = 0; }
    passo(v) {
      if (Number.isNaN(v)) return this.detectado;
      if (v > this.limiar) { this.acima++; this.abaixo = 0; } else { this.abaixo++; this.acima = 0; }
      if (!this.detectado && this.acima >= CONFIRMA_LIGA) this.detectado = true;
      else if (this.detectado && this.abaixo >= CONFIRMA_DESLIGA) this.detectado = false;
      return this.detectado;
    }
  }

  const api = {
    JANELA_S, PASSO_S, CONFIRMA_LIGA, CONFIRMA_DESLIGA, K_DESVIOS, FATOR_MIN, MIN_PACOTES,
    lerLinhaCSI, oscilacao, serieOscilacao, estatisticas, limiarDeCalibracao, Detector,
  };
  raiz.WaveNucleo = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

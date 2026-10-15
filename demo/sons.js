/* Sons das trocas de tela (as passagens do passagem.js).
 *
 * Cada passagem tem duas partes: a tela que sai se desfaz nas linhas do Wi-Fi (saída) e as linhas viram a
 * tela que chega (entrada). O som segue o mesmo desenho:
 *   - cada som é uma "partitura" em função de u, de 0 (o SINAL: as linhas na tela toda) a 1 (a tela pronta);
 *   - a saída de uma tela é a entrada dela tocada de trás para a frente, como no desenho (menos a da
 *     história, que tem saída própria);
 *   - toda saída termina no som do SINAL e toda entrada começa nele: qualquer saída emenda em qualquer
 *     entrada, e no meio da troca (a tela coberta) o som segura.
 *
 * Propostas (famílias), comparadas no laboratório (ferramentas/laboratorio-passagens/). O grupo escolheu
 * a "sinal" (15/10): é a do site. As outras ficam para comparar.
 *   sinal   o som é feito da última leitura do Wi-Fi: 12 notas igualmente espaçadas, como as subportadoras,
 *           cada uma tão forte quanto o seu pedaço do sinal. Se alguém se mexe perto das placas, elas tremem.
 *   notas   uma frase curta de marimba para cada tela, nas notas da marca e da escuta.
 *   ar      sopros de ruído filtrado, cada um com o gesto da tela. O mais discreto.
 *   antigo  o sopro que o site tinha antes (para comparar).
 *
 * Tudo é feito na hora pelo navegador (Web Audio): nenhum arquivo de som, funciona sem internet. Nada de
 * onda quadrada; tudo passa pelo limitador do site. As partituras são puras (testadas no Node, em
 * ferramentas/testes/test_sons_js.py); criar() toca. No navegador: window.WaveSons.
 */
(function (raiz) {
  'use strict';
  const H = typeof module !== 'undefined' && module.exports ? require('./historia.js') : raiz.WaveHistoria;
  const { limitar, misturar, janela, curvas } = H;
  const s = curvas.suave, TAU = Math.PI * 2;
  // entre duas frequências (ou dois cortes de filtro) andando em notas, não em Hz
  const geo = (a, b, t) => a * Math.pow(b / a, t);

  /* ================= Notas ================= */

  const RE2 = 73.42, RE3 = 146.83, LA3 = 220, RE4 = 293.66, MI4 = 329.63, SOL4 = 392, LA4 = 440;
  const DO5 = 523.25, RE5 = 587.33, MI5 = 659.25, SOL5 = 783.99, LA5 = 880, RE6 = 1174.66, MI6 = 1318.51;
  const ACORDE = [RE3, LA3, MI4];   // o acorde da escuta (escuta.js): ré, lá, mi
  // a escala da melodia da marca (dó, ré, mi, sol, lá), com uma oitava a mais embaixo
  const ESCALA = [RE3, 164.81, 196, LA3, 261.63, RE4, MI4, SOL4, LA4, DO5, RE5, MI5, SOL5, LA5, 1046.5];
  const maisPerto = (lista, f) => lista.reduce((m, x) => (Math.abs(Math.log(x / f)) < Math.abs(Math.log(m / f)) ? x : m));

  /* ================= O Wi-Fi como som (família sinal) ================= */

  const PARCIAIS = 12;      // 12 notas: cada uma é um pedaço das subportadoras úteis
  const CORTE = 2600;       // o filtro do som do SINAL (Hz)
  const SEGURA = 0.35;      // quanto a saída segura o som do SINAL esperando a entrada (o SINAL dura 0,18 s)
  const CRUZA = 0.15;       // a entrada cruza com o som do SINAL que a saída segurava (mesma potência)

  // A última leitura vira 12 pesos (a força de cada pedaço do sinal, 1 = a média) e 12 tremores (o quanto
  // cada pedaço mudou em relação à forma de sempre, relativo à média). Sem leitura: tudo igual, sem tremor.
  function espectro(l, n = PARCIAIS) {
    const plano = { peso: new Array(n).fill(1), tremor: new Array(n).fill(0), real: false };
    if (!l || !l.a) return plano;
    const uteis = [];
    for (let k = 0; k < l.a.length; k++) if (l.a[k] > 0.5) uteis.push(k);
    if (uteis.length < n) return plano;
    const media = uteis.reduce((t, k) => t + l.a[k], 0) / uteis.length;
    const peso = [], tremor = [];
    for (let j = 0; j < n; j++) {
      const ks = uteis.slice(Math.floor((j * uteis.length) / n), Math.floor(((j + 1) * uteis.length) / n));
      const a = ks.reduce((t, k) => t + l.a[k], 0) / ks.length;
      const d = ks.reduce((t, k) => t + Math.abs((l.d && l.d[k]) || 0), 0) / ks.length;
      peso.push(limitar(a / media, 0.25, 2.2));
      tremor.push(d / media);
    }
    return { peso, tremor, real: true };
  }

  // As 12 notas do SINAL: harmônicos de um ré grave (igualmente espaçados, como as subportadoras, de 147 a
  // 954 Hz), mais fracas para o agudo. Cada nota tem um segundo oscilador desafinado `bat` Hz: as duas
  // ondas se somam e se cancelam (o mesmo batimento da escuta). Sala parada: um respiro lento. Mexeu: treme.
  function notasDoSinal(c) {
    const E = c.espectro || espectro(null);
    const brutos = E.peso.map((p, k) => p / (1 + 0.12 * k));
    const soma = brutos.reduce((t, x) => t + x, 0);
    return brutos.map((p, k) => ({
      f: RE2 * (k + 2),
      p: p / soma,
      bat: 0.3 + 0.17 * (k % 4) + 3.2 * limitar((E.tremor[k] - 0.03) / 0.3),   // ritmos diferentes: o respiro não afunda tudo junto
    }));
  }
  // Uma nota do SINAL: em u = 0, exatamente o som do SINAL; `o` muda o que o gesto mexe.
  function parcial(b, o = {}) {
    return {
      tipo: 'seno',
      f: o.f || (() => b.f), g: o.g || (() => b.p), pan: o.pan || (() => 0),
      corte: o.corte || (() => CORTE), bat: o.bat || (() => b.bat), trem: o.trem,
    };
  }
  // a pessoa invisível da travessia: anda quase constante, um pouco mais devagar na partida e na chegada
  const andar = (u) => misturar(u, s(u), 0.5);
  const lado = (u) => limitar(-1.2 + 2.4 * andar(u), -0.95, 0.95);
  const meio = (u) => Math.exp(-(((andar(u) - 0.5) / 0.22) ** 2));   // no meio do caminho, entre as placas
  const PASSOS = [0.16, 0.38, 0.6, 0.82];

  const SINAL = {
    // as linhas encolhem até virar o gráfico: as notas se apertam numa só região, o som abafa e pousa
    pouso(c) {
      const B = notasDoSinal(c), k = (u) => s(janela(u, 0, 0.8)), pan = c.pan || 0;
      return {
        vozes: B.map((b) => parcial(b, {
          f: (u) => geo(b.f, RE4, 0.65 * k(u)),
          g: (u) => b.p * (1 - s(janela(u, 0.3, 0.92))),
          corte: (u) => geo(CORTE, 700, k(u)),
          bat: (u) => misturar(b.bat, 0.2, k(u)),
          pan: (u) => pan * k(u),
        })),
        toques: [
          { u: 0.8, tipo: 'tum', f: RE2, g: 0.6, dur: 0.45, pan },
          { u: 0.8, tipo: 'tic', f: RE6, g: 0.12, dur: 0.07, pan },
        ],
      };
    },
    // saída da história quando a cena tem as linhas de verdade (elas ficam à direita)
    pousoHistoria(c) { return SINAL.pouso({ ...c, pan: 0.35 }); },
    // as linhas vão para a metade direita e somem por cima da primeira cena: o som vai para a direita,
    // as notas apagam uma por uma, do grave para o agudo, e duas notas abrem a história
    historia(c) {
      const B = notasDoSinal(c);
      return {
        vozes: B.map((b, i) => parcial(b, {
          pan: (u) => 0.55 * s(janela(u, 0, 0.6)),
          f: (u) => b.f * (1 + 0.06 * s(janela(u, 0.2, 1))),
          g: (u) => b.p * (1 - s(janela(u, 0.3 + 0.035 * i, 0.62 + 0.03 * i))),
        })),
        toques: [
          { u: 0.42, tipo: 'sino', f: RE4, g: 0.35, dur: 1.6, pan: 0.45 },
          { u: 0.62, tipo: 'sino', f: LA4, g: 0.3, dur: 1.9, pan: 0.55 },
        ],
      };
    },
    // saída da história: o sinal é desenhado por cima, uma linha por vez. Cada linha é uma nota pinçada,
    // do grave para o agudo, da esquerda para a direita; juntas, viram o som do SINAL. (u = 0 é a história)
    tomar(c) {
      const B = notasDoSinal(c);
      return {
        sentido: 'direto',
        vozes: B.map((b) => parcial(b, { g: (u) => b.p * s(janela(u, 0.3, 1)) })),
        toques: Array.from({ length: 14 }, (_, i) => ({ u: 0.03 + (0.52 * i) / 13, tipo: 'pluck', f: RE2 * (i + 2), g: 0.32, dur: 0.5, pan: -0.5 + i / 13 })),
      };
    },
    // fechar os olhos: as linhas viram uma só, que vira o ponto. As 12 notas escorregam para as 3 notas do
    // acorde da escuta, o som abafa até o filtro da escuta parada e fica só o respiro lento: é onde o som
    // da escuta começa
    fecharOlhos(c) {
      const B = notasDoSinal(c), a = (u) => s(janela(u, 0, 0.42)), pt = (u) => s(janela(u, 0.4, 0.74)), fim = (u) => s(janela(u, 0.62, 1));
      return {
        vozes: B.map((b, i) => parcial(b, {
          f: (u) => geo(b.f, ACORDE[i % 3], a(u)),
          g: (u) => misturar(b.p, 1 / B.length, a(u)) * misturar(1, 0.5, pt(u)) * (1 - fim(u)),
          corte: (u) => geo(CORTE, 700, a(u)),
          bat: (u) => misturar(b.bat, 0.12 + 0.11 * (i % 4), a(u)),
        })),
        toques: [],
      };
    },
    // travessia: alguém invisível atravessa da esquerda para a direita. O som do sinal treme (9 vezes por
    // segundo, como o desenho) quando a pessoa passa no meio; um sopro e os passos vão com ela de uma caixa
    // de som para a outra; na chegada, duas notas
    travessia(c) {
      const B = notasDoSinal(c);
      const vozes = B.map((b) => parcial(b, {
        g: (u) => b.p * (1 - s(janela(u, 0.55, 1))),
        trem: { f: 9, prof: (u) => 0.75 * meio(u) },
      }));
      vozes.push({
        tipo: 'ruido', filtro: 'bandpass', q: () => 1.1, pan: lado,
        corte: (u) => geo(500, 1100, andar(u)),
        g: (u) => 0.9 * Math.pow(Math.sin(Math.PI * andar(u)), 1.5) * (1 - s(janela(u, 0.85, 1))),
        trem: { f: 9, prof: (u) => 0.8 * meio(u) },
      });
      return {
        vozes,
        toques: [
          ...PASSOS.map((u) => ({ u, tipo: 'passo', f: 0, g: 0.7, dur: 0.14, pan: lado(u) })),
          { u: 0.9, tipo: 'sino', f: MI5, g: 0.28, dur: 0.9, pan: 0.7 },
          { u: 0.96, tipo: 'sino', f: LA5, g: 0.24, dur: 1.1, pan: 0.75 },
        ],
      };
    },
    // anéis: as linhas se curvam numa estrela em espiral e se abrem como ondas. As notas afinam na escala
    // da marca, giram de uma caixa de som para a outra e apagam quando a onda passa (as de dentro antes);
    // seis sininhos, um por ponta da estrela
    aneis(c) {
      const B = notasDoSinal(c), an = (u) => s(janela(u, 0, 0.5)), e = (u) => janela(u, 0.25, 1);
      return {
        vozes: B.map((b, i) => {
          const q = maisPerto(ESCALA, b.f), r = i / (B.length - 1);
          return parcial(b, {
            f: (u) => geo(b.f, q, an(u)),
            pan: (u) => 0.8 * an(u) * Math.sin(TAU * (i / B.length + 1.5 * u)),
            g: (u) => b.p * (1 - s(janela(e(u), 0.05 + 0.5 * r, 0.35 + 0.6 * r))),
            corte: (u) => geo(CORTE, 4000, an(u)),
            bat: (u) => misturar(b.bat, 0.5, an(u)),
          });
        }),
        toques: [SOL4, LA4, DO5, RE5, MI5, SOL5].map((f, i) => ({ u: 0.4 + 0.09 * i, tipo: 'sino', f, g: 0.22 - 0.012 * i, dur: 1.1, pan: 0.7 * Math.sin((TAU * i) / 6) })),
      };
    },
    // movimento reduzido: só esmaece
    fade(c) { return { vozes: notasDoSinal(c).map((b) => parcial(b, { g: (u) => b.p * (1 - u) })), toques: [] }; },
  };

  /* ================= Marimba (família notas) ================= */

  // O som do SINAL desta família: o acorde da escuta, baixinho e abafado, respirando devagar.
  const PESO_PAD = [0.4, 0.33, 0.27];
  function pad(o = {}) {
    return ACORDE.map((f, i) => ({
      tipo: 'seno', f: () => f, bat: () => 0.3 + 0.1 * i,
      g: (u) => PESO_PAD[i] * (o.g ? o.g(u) : 1),
      pan: o.pan || (() => 0), corte: o.corte || (() => 1200),
    }));
  }
  const nota = (u, f, g, dur, pan = 0, tipo = 'marimba') => ({ u, tipo, f, g, dur, pan });
  const NOTAS = {
    // pouso: três notas descendo, a última com um grave (a tela assenta)
    pouso(c) {
      const pan = c.pan || 0;
      return {
        vozes: pad({ g: (u) => 1 - s(janela(u, 0.05, 0.55)) }),
        toques: [nota(0.1, RE5, 0.5, 0.9, pan), nota(0.4, LA4, 0.45, 1.0, pan), nota(0.75, RE4, 0.42, 1.4, pan), nota(0.75, RE2, 0.4, 0.4, pan, 'tum')],
      };
    },
    pousoHistoria(c) { return NOTAS.pouso({ ...c, pan: 0.35 }); },
    // a história: ré, mi, lá, devagar, indo para a direita, com um ré grave embaixo
    historia() {
      return {
        vozes: pad({ g: (u) => 1 - s(janela(u, 0.2, 0.7)), pan: (u) => 0.5 * s(janela(u, 0, 0.6)) }),
        toques: [nota(0.15, RE4, 0.45, 1.1, 0.3), nota(0.33, MI4, 0.45, 1.2, 0.4), nota(0.55, LA4, 0.45, 1.8, 0.5), nota(0.55, RE3, 0.35, 2.2, 0.5)],
      };
    },
    // saída da história: oito notas subindo depressa, da esquerda para a direita (as linhas sendo desenhadas)
    tomar() {
      return {
        sentido: 'direto',
        vozes: pad({ g: (u) => s(janela(u, 0.3, 1)) }),
        toques: ESCALA.slice(4, 12).map((f, i) => nota(0.03 + 0.07 * i, f, 0.32, 0.6, -0.5 + i / 7)),
      };
    },
    // fechar os olhos: mi, lá, ré, descendo, cada uma mais longa e mais baixa, até o acorde da escuta
    fecharOlhos() {
      return {
        vozes: pad({ g: (u) => 1 - s(janela(u, 0.55, 1)), corte: (u) => geo(1200, 700, s(janela(u, 0, 0.5))) }),
        toques: [nota(0.06, MI5, 0.4, 1.2), nota(0.28, LA4, 0.32, 1.5), nota(0.52, RE4, 0.26, 2.2)],
      };
    },
    // travessia: cinco notas subindo no ritmo dos passos, da esquerda para a direita; na chegada, ré e lá juntos
    travessia() {
      return {
        vozes: pad({ g: (u) => 1 - s(janela(u, 0.5, 1)) }),
        toques: [
          ...[RE4, MI4, SOL4, LA4, RE5].map((f, i) => { const u = [0.12, 0.3, 0.48, 0.66, 0.82][i]; return nota(u, f, 0.42, 0.7, lado(u)); }),
          nota(0.92, RE5, 0.25, 1.2, 0.7, 'sino'), nota(0.92, LA5, 0.2, 1.2, 0.75, 'sino'),
        ],
      };
    },
    // anéis: seis notas em espiral (uma por ponta da estrela), girando entre as caixas de som, e um brilho no fim
    aneis() {
      return {
        vozes: pad({ g: (u) => 1 - s(janela(u, 0.15, 0.6)) }),
        toques: [...[SOL4, LA4, DO5, RE5, MI5, SOL5].map((f, i) => nota(0.2 + 0.09 * i, f, 0.38, 1.0, 0.7 * Math.sin((TAU * i) / 6))), nota(0.9, MI6, 0.12, 1.4, 0, 'sino')],
      };
    },
    fade() { return { vozes: pad({ g: (u) => 1 - u }), toques: [] }; },
  };

  /* ================= Sopros (família ar) ================= */

  // O som do SINAL desta família: um sopro de ruído rosa, passa-baixa em 1,4 kHz.
  function sopro(o = {}) {
    return {
      tipo: 'ruido', filtro: 'lowpass', q: o.q || (() => 0.7),
      corte: o.corte || (() => 1400), g: o.g || (() => 1), pan: o.pan || (() => 0),
    };
  }
  const graos = (n, u0, du, f0, df, g, pan0, pan1) => Array.from({ length: n }, (_, i) => ({ u: u0 + du * i, tipo: 'grao', f: f0 + df * i, g, dur: 0.04, pan: misturar(pan0, pan1, n > 1 ? i / (n - 1) : 0) }));
  const AR = {
    // pouso: o sopro abafa até um grave, e a tela pousa
    pouso(c) {
      const k = (u) => s(janela(u, 0, 0.8)), pan = c.pan || 0;
      return {
        vozes: [sopro({ corte: (u) => geo(1400, 260, k(u)), g: (u) => 1 - s(janela(u, 0.3, 0.92)), pan: (u) => pan * k(u) })],
        toques: [{ u: 0.8, tipo: 'tum', f: RE2, g: 0.45, dur: 0.4, pan }],
      };
    },
    pousoHistoria(c) { return AR.pouso({ ...c, pan: 0.35 }); },
    // a história: o sopro clareia e vai para a direita; cinco grãos de ruído, como uma página virando
    historia() {
      const v = (u) => s(janela(u, 0, 0.6));
      return {
        vozes: [sopro({ corte: (u) => geo(1400, 2200, v(u)), pan: (u) => 0.55 * v(u), g: (u) => 1 - s(janela(u, 0.45, 0.95)) })],
        toques: graos(5, 0.45, 0.06, 2600, 300, 0.35, 0.45, 0.6),
      };
    },
    // saída da história: catorze riscos de lápis, da esquerda para a direita (as linhas sendo desenhadas)
    tomar() {
      return {
        sentido: 'direto',
        vozes: [sopro({ corte: (u) => geo(500, 1400, u), g: (u) => s(janela(u, 0.3, 1)) })],
        toques: graos(14, 0.03, 0.04, 1800, 90, 0.3, -0.6, 0.6),
      };
    },
    // fechar os olhos: o sopro se estreita até virar um assobio em ré, que some onde o som da escuta começa
    fecharOlhos() {
      const a = (u) => s(janela(u, 0, 0.6)), q = (u) => geo(0.7, 30, s(janela(u, 0, 0.7))), fim = (u) => 1 - s(janela(u, 0.62, 1));
      return {
        vozes: [
          sopro({ g: (u) => 1 - s(janela(u, 0, 0.5)) }),
          { tipo: 'ruido', filtro: 'bandpass', corte: (u) => geo(1400, RE4, a(u)), q, pan: () => 0, g: (u) => s(janela(u, 0, 0.25)) * fim(u) * (0.8 + 0.25 * Math.sqrt(q(u))) },
          { tipo: 'seno', f: () => RE4, bat: () => 0.15, pan: () => 0, corte: () => 2000, g: (u) => 0.25 * s(janela(u, 0.3, 0.6)) * fim(u) },
        ],
        toques: [],
      };
    },
    // travessia: o sopro de antes, que vai com a pessoa, agora tremendo no meio do caminho e com passos
    travessia() {
      return {
        vozes: [
          sopro({ g: (u) => 1 - s(janela(u, 0, 0.3)) }),
          { tipo: 'ruido', filtro: 'bandpass', q: () => 0.9, pan: lado, corte: (u) => geo(500, 1100, andar(u)), g: (u) => 1.4 * Math.pow(Math.sin(Math.PI * andar(u)), 1.2) * (1 - s(janela(u, 0.85, 1))), trem: { f: 9, prof: (u) => 0.6 * meio(u) } },
        ],
        toques: PASSOS.map((u) => ({ u, tipo: 'passo', f: 0, g: 0.7, dur: 0.14, pan: lado(u) })),
      };
    },
    // anéis: um redemoinho (o filtro sobe e desce em espiral, girando entre as caixas de som) e um sininho
    aneis() {
      const an = (u) => s(janela(u, 0, 0.5));
      return {
        vozes: [
          sopro({ g: (u) => 1 - s(janela(u, 0, 0.35)) }),
          { tipo: 'ruido', filtro: 'bandpass', q: () => 2, corte: (u) => 600 * Math.pow(2, 1.6 * an(u) + 0.5 * Math.sin(TAU * 2.2 * u) * an(u)), pan: (u) => 0.8 * an(u) * Math.sin(TAU * 1.5 * u), g: (u) => 1.3 * s(janela(u, 0, 0.25)) * (1 - s(janela(u, 0.6, 1))) },
        ],
        toques: [{ u: 0.55, tipo: 'sino', f: MI6, g: 0.14, dur: 1.3, pan: 0 }],
      };
    },
    fade() { return { vozes: [sopro({ g: (u) => 1 - u })], toques: [] }; },
  };

  /* ================= O sopro de antes (família antigo) ================= */

  // Igual ao que o index.html fazia: rampas exponenciais de 0,0001 até o ganho (em 45% do tempo) e de volta.
  const envAntigo = (u) => (u < 0.45 ? 1e-4 * Math.pow(1e4, u / 0.45) : Math.pow(1e-4, (u - 0.45) / 0.55));
  function soproAntigo({ f0, f1, ganho, pan0 = 0, pan1 = 0, tipo = 'lowpass' }) {
    return {
      sentido: 'direto',
      vozes: [{ tipo: 'ruido', filtro: tipo, q: () => (tipo === 'bandpass' ? 0.9 : 0.7), corte: (u) => geo(f0, f1, u), pan: (u) => misturar(pan0, pan1, u), g: (u) => ganho * envAntigo(u) }],
      toques: [],
    };
  }
  function antigo(evento, gesto) {
    if (evento === 'saida') {
      if (gesto === 'travessia') return soproAntigo({ f0: 500, f1: 1100, ganho: 0.05, pan0: 0.8, pan1: -0.8, tipo: 'bandpass' });
      return gesto === 'fecharOlhos' ? null : soproAntigo({ f0: 260, f1: 900, ganho: 0.04 });
    }
    if (gesto === 'travessia') return soproAntigo({ f0: 500, f1: 1100, ganho: 0.06, pan0: -0.8, pan1: 0.8, tipo: 'bandpass' });
    if (gesto === 'aneis') return soproAntigo({ f0: 900, f1: 220, ganho: 0.04 });
    if (gesto === 'pouso' || gesto === 'historia') return soproAntigo({ f0: 900, f1: 240, ganho: 0.035 });
    return null;   // fechar os olhos: o acorde da escuta já entra sozinho
  }

  /* ================= As famílias ================= */

  // nivel: o volume da família (medido para as três soarem parecido; ver o README do laboratório).
  const FAMILIAS = {
    sinal: { nome: 'Sinal', gestos: SINAL, nivel: 0.146 },
    notas: { nome: 'Notas', gestos: NOTAS, nivel: 0.089 },
    ar: { nome: 'Ar', gestos: AR, nivel: 0.168 },
    antigo: { nome: 'Antigo', direto: antigo, nivel: 1 },
  };
  const PADRAO = 'sinal';   // a escolhida pelo grupo

  // A partitura de um evento da passagem ('saida' ou 'entrada') com o gesto da tela. contexto = { espectro }.
  // null: esse evento não tem som nessa família.
  function partitura(familia, evento, gesto, contexto = {}) {
    const F = FAMILIAS[familia];
    if (!F || (evento !== 'saida' && evento !== 'entrada')) return null;
    if (F.direto) { const P = F.direto(evento, gesto); return P && { ...P, ponte: false, nivel: F.nivel }; }
    let g = F.gestos[gesto] ? gesto : 'fade';
    if (evento === 'entrada' && g === 'tomar') g = 'fade';
    if (evento === 'saida' && g === 'historia') g = 'tomar';
    const P = F.gestos[g](contexto);
    return { sentido: 'reverso', ponte: true, ...P, nivel: F.nivel };
  }

  // As curvas de um evento no tempo: n pontos de 0 a dur. A saída anda de u = 1 até u = 0 (a entrada de trás
  // para a frente), menos as partituras "diretas". Os toques vão para o tempo espelhado.
  function amostrar(P, evento, dur, n = 48) {
    const reverso = evento === 'saida' && P.sentido !== 'direto';
    const us = Array.from({ length: n }, (_, i) => (reverso ? 1 - i / (n - 1) : i / (n - 1)));
    const curva = (fn, padrao, a, b) => Float32Array.from(us, (u) => {
      const v = fn ? fn(u) : padrao;
      return limitar(Number.isFinite(v) ? v : padrao, a, b);
    });
    return {
      dur,
      vozes: P.vozes.map((v) => ({
        tipo: v.tipo, filtro: v.filtro || 'lowpass',
        f: v.f ? curva(v.f, 440, 20, 20000) : null,
        bat: v.bat ? curva(v.bat, 0, 0, 20) : null,
        g: curva(v.g, 0, 0, 4),
        pan: curva(v.pan, 0, -1, 1),
        corte: curva(v.corte, 20000, 20, 20000),
        q: curva(v.q, 0.7, 0.0001, 100),
        trem: v.trem ? { f: v.trem.f, prof: curva(v.trem.prof, 0, 0, 1) } : null,
      })),
      toques: P.toques.map((t) => ({ ...t, t: (reverso ? 1 - t.u : t.u) * dur })).sort((a, b) => a.t - b.t),
    };
  }

  /* ================= No navegador (Web Audio) ================= */

  // ctx: o AudioContext (ou OfflineAudioContext); destino: onde ligar (o limitador do site).
  function criar(ctx, destino) {
    const ativos = new Set();
    let ruido = null;
    // ruído rosa (o mesmo do sopro de antes), 2 s em laço
    function ruidoRosa() {
      if (ruido) return ruido;
      const n = ctx.sampleRate * 2, d = (ruido = ctx.createBuffer(1, n, ctx.sampleRate)).getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = 0.997 * b0 + w * 0.0296; b1 = 0.985 * b1 + w * 0.0325; b2 = 0.95 * b2 + w * 0.048; d[i] = (b0 + b1 + b2 + w * 0.05) * 0.5; }
      return ruido;
    }
    const curvaEm = (param, valores, t0, dur, k = 1) => {
      const v = k === 1 ? valores : valores.map((x) => x * k);
      param.value = v[0];
      param.setValueCurveAtTime(v, t0, dur);
    };
    const painel = () => (ctx.createStereoPanner ? ctx.createStereoPanner() : null);

    // Uma voz contínua: fonte(s) -> filtro -> ganho -> tremor -> lado -> env.
    function voz(v, t0, dur, nivel, env, fontes) {
      const filtro = ctx.createBiquadFilter(); filtro.type = v.filtro;
      curvaEm(filtro.frequency, v.corte, t0, dur); curvaEm(filtro.Q, v.q, t0, dur);
      if (v.tipo === 'ruido') {
        const r = ctx.createBufferSource(); r.buffer = ruidoRosa(); r.loop = true;
        r.connect(filtro); r.start(t0, Math.random() * 1.5); fontes.push(r);
      } else {
        const tipo = v.tipo === 'triangulo' ? 'triangle' : 'sine';
        const ondas = v.bat ? [v.f, v.f.map((f, i) => f + v.bat[i])] : [v.f];
        for (const fs of ondas) {
          const o = ctx.createOscillator(), m = ctx.createGain();
          o.type = tipo; curvaEm(o.frequency, fs, t0, dur); m.gain.value = 1 / ondas.length;
          o.connect(m).connect(filtro); o.start(t0); fontes.push(o);
        }
      }
      const g = ctx.createGain(); curvaEm(g.gain, v.g, t0, dur, nivel);
      let fim = filtro.connect(g);
      if (v.trem && v.trem.prof.some((x) => x > 0.01)) {
        // tremor: o ganho oscila entre 1 - prof e 1, `f` vezes por segundo
        const tg = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        curvaEm(tg.gain, v.trem.prof.map((p) => 1 - 0.5 * p), t0, dur);
        curvaEm(lg.gain, v.trem.prof.map((p) => 0.5 * p), t0, dur);
        lfo.frequency.value = v.trem.f; lfo.connect(lg).connect(tg.gain); lfo.start(t0); fontes.push(lfo);
        fim = fim.connect(tg);
      }
      const p = painel();
      if (p) { curvaEm(p.pan, v.pan, t0, dur); fim = fim.connect(p); }
      fim.connect(env);
    }

    // Um toque: um som curto num instante.
    function toque(tq, t0, nivel, env, fontes) {
      const t = t0 + tq.t, g = tq.g * nivel, dur = tq.dur;
      const saida = ctx.createGain(); saida.gain.value = 0;
      const p = painel();
      if (p) p.pan.value = tq.pan || 0;
      (p ? saida.connect(p) : saida).connect(env);
      const envelope = (param, pico, ataque, queda) => {
        param.setValueAtTime(0.0001, t); param.exponentialRampToValueAtTime(Math.max(pico, 0.0002), t + ataque);
        param.exponentialRampToValueAtTime(0.0001, t + queda);
      };
      const osc = (tipo, f) => { const o = ctx.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + 0.05); fontes.push(o); return o; };
      const ruidoCurto = () => { const r = ctx.createBufferSource(); r.buffer = ruidoRosa(); r.start(t, Math.random() * 1.5); r.stop(t + dur + 0.05); fontes.push(r); return r; };
      const filtroDe = (tipo, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = tipo; b.frequency.setValueAtTime(f, t); b.Q.value = q; return b; };
      envelope(saida.gain, g, tq.tipo === 'grao' ? 0.002 : tq.tipo === 'tum' ? 0.015 : 0.006, dur);
      if (tq.tipo === 'tum') {
        // um grave curto que cai um pouco: a tela pousando
        const o = osc('sine', tq.f); o.frequency.exponentialRampToValueAtTime(tq.f * 0.72, t + dur);
        o.connect(saida);
      } else if (tq.tipo === 'tic') {
        osc('sine', tq.f).connect(saida);
      } else if (tq.tipo === 'sino') {
        // sino suave: uma senoide com outra modulando a frequência (FM), o brilho apagando antes do som
        const o = osc('sine', tq.f), m = osc('sine', tq.f * 2.756), mg = ctx.createGain();
        mg.gain.setValueAtTime(tq.f * 1.1, t); mg.gain.exponentialRampToValueAtTime(tq.f * 0.02, t + dur * 0.5);
        m.connect(mg).connect(o.frequency);
        o.connect(filtroDe('lowpass', 5000)).connect(saida);
      } else if (tq.tipo === 'marimba') {
        // marimba: triângulo com um brilho de 4x a frequência que some logo
        const o = osc('triangle', tq.f), b = osc('sine', tq.f * 4), bg = ctx.createGain();
        bg.gain.setValueAtTime(0.25, t); bg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        const lp = filtroDe('lowpass', 2400);
        o.connect(lp); b.connect(bg).connect(lp); lp.connect(saida);
      } else if (tq.tipo === 'pluck') {
        // corda pinçada: triângulo com o filtro fechando depressa
        const lp = filtroDe('lowpass', 3200, 1.2); lp.frequency.exponentialRampToValueAtTime(500, t + 0.25);
        osc('triangle', tq.f).connect(lp).connect(saida);
      } else if (tq.tipo === 'passo') {
        // um passo: ruído grave e um baque baixinho
        ruidoCurto().connect(filtroDe('lowpass', 260, 1)).connect(saida);
        const o = osc('sine', 62); o.frequency.exponentialRampToValueAtTime(45, t + dur);
        const og = ctx.createGain(); og.gain.value = 0.5; o.connect(og).connect(saida);
      } else if (tq.tipo === 'grao') {
        // um grão: um risco curtinho de ruído numa faixa
        ruidoCurto().connect(filtroDe('bandpass', tq.f, 3)).connect(saida);
      }
      return t + dur;
    }

    function montar(P, evento, dur) {
      const A = amostrar(P, evento, dur);
      const t0 = ctx.currentTime + 0.01, nivel = P.nivel;
      // env: a forma do som inteiro; solta: só para soltar antes da hora (sem mexer nas curvas do env)
      const env = ctx.createGain(), solta = ctx.createGain(), fontes = [], curtas = [];
      let fim = t0 + dur;
      if (P.ponte && evento === 'entrada') {
        // entra cruzando com a saída: seno e cosseno, a soma das potências fica igual
        env.gain.value = 0;
        env.gain.setValueCurveAtTime(Float32Array.from({ length: 16 }, (_, i) => Math.sin((Math.PI / 2) * (i / 15))), t0, CRUZA);
      } else env.gain.setValueAtTime(1, t0);
      if (P.ponte && evento === 'saida') {
        // segura o som do SINAL até a entrada chegar (ela solta este); se não chegar, some sozinho
        env.gain.setValueAtTime(1, fim + SEGURA); env.gain.linearRampToValueAtTime(0, fim + SEGURA + 0.3);
        fim += SEGURA + 0.3;
      }
      env.connect(solta).connect(destino);
      for (const v of A.vozes) voz(v, t0, dur, nivel, env, fontes);
      for (const tq of A.toques) fim = Math.max(fim, toque(tq, t0, nivel, env, curtas));
      for (const f of fontes) f.stop(fim + 0.05);   // os toques param sozinhos
      // um relógio mudo marca o fim do som, para soltar os nós
      const relogio = ctx.createConstantSource ? ctx.createConstantSource() : ctx.createOscillator();
      const mudo = ctx.createGain(); mudo.gain.value = 0;
      relogio.connect(mudo).connect(env); relogio.start(t0); relogio.stop(fim + 0.1);
      const som = {
        evento, fim,
        soltar(t, r) {
          if (som.solto || t >= som.fim) return;
          som.solto = true;
          solta.gain.setValueCurveAtTime(Float32Array.from({ length: 16 }, (_, i) => Math.cos((Math.PI / 2) * (i / 15))), t, r);
          for (const f of [...fontes, ...curtas, relogio]) { try { f.stop(t + r + 0.03); } catch (e) { /* já parou */ } }
          som.fim = t + r;
        },
      };
      ativos.add(som);
      relogio.onended = () => { ativos.delete(som); try { solta.disconnect(); } catch (e) { /* ok */ } };
      return som;
    }

    return {
      // Toca o som de um evento da passagem. info = { gesto, dur } (o que o passagem.js manda).
      tocar(familia, evento, info = {}, contexto = {}) {
        const P = partitura(familia, evento, info.gesto, contexto);
        if (!P || !(info.dur > 0)) return null;
        // o que estava tocando abre espaço: a entrada cruza com o som do SINAL que a saída segurava
        soltar(evento === 'entrada' ? CRUZA : 0.08);
        return montar(P, evento, info.dur);
      },
      soltar,
      ativos: () => ativos.size,
    };
    function soltar(r = 0.08) { const t = ctx.currentTime; for (const a of [...ativos]) a.soltar(t, r); }
  }

  const WaveSons = { criar, partitura, amostrar, espectro, notasDoSinal, FAMILIAS, PADRAO, ACORDE, ESCALA, PARCIAIS, SEGURA, CRUZA };
  raiz.WaveSons = WaveSons;
  if (typeof module !== 'undefined' && module.exports) module.exports = WaveSons;
})(typeof window !== 'undefined' ? window : globalThis);

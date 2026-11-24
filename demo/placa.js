/* Linhas de estado do firmware Wave Sense v2 da Placa B (firmware/receptor).
 *
 *   WS_STAT,tempo_ms,canal,recebidos,repetidos,fila_cheia,a_tentou,a_sem_resposta,a_nao_saiu,rssi,ruido,estado,a_freq
 *   WS_CANAL,canal,resultado            (ok | achou | erro_...)
 *   WS_VARREDURA,canal,quadros,ocupacao_%,nota_%,ruido   ...   WS_VARREDURA,fim,melhor
 *   WS_INFO,texto
 *
 * Com o firmware oficial essas linhas não existem e nada aqui é usado.
 * Funciona no navegador (window.WavePlaca) e no Node (require), sem nenhuma biblioteca.
 */
(function (raiz) {
  'use strict';

  function num(s) {
    if (s === undefined || s === '' || s === '-') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function lerLinhaPlaca(texto) {
    texto = String(texto).trim();
    if (!texto.startsWith('WS_')) return null;
    const c = texto.split(',');
    switch (c[0]) {
      case 'WS_STAT':
        if (c.length < 13) return null;
        return {
          tipo: 'stat', tempoMs: num(c[1]), canal: num(c[2]), recebidos: num(c[3]), repetidos: num(c[4]),
          filaCheia: num(c[5]), aTentou: num(c[6]), aSemResposta: num(c[7]), aNaoSaiu: num(c[8]),
          rssi: num(c[9]), ruido: num(c[10]), estado: c[11], aFreq: num(c[12]),
        };
      case 'WS_CANAL':
        if (c.length < 3) return null;
        return { tipo: 'canal', canal: num(c[1]), resultado: c[2] };
      case 'WS_VARREDURA':
        if (c[1] === 'fim') return { tipo: 'varredura-fim', melhor: num(c[2]) };
        if (c.length < 6) return null;
        return { tipo: 'varredura', canal: num(c[1]), quadros: num(c[2]), ocupacao: num(c[3]), nota: num(c[4]), ruido: num(c[5]) };
      case 'WS_INFO':
        return { tipo: 'info', texto: c.slice(1).join(',') };
      default:
        return null;
    }
  }

  // Junta os últimos segundos (WS_STAT) e diz onde os pacotes se perdem.
  //   tentou   = sondas que a A tentou mandar (pelo número de cada uma)
  //   naoSaiu  = nem saíram da A (fila do rádio cheia: o canal estava ocupado demais)
  //   noAr     = saíram e não chegaram à B
  //   naUsb    = chegaram à B, mas não couberam na USB
  function diagnostico(stats) {
    const s = stats.filter((x) => x && x.tipo === 'stat' && x.estado === 'ok');
    if (!s.length) return { situacao: 'sem-dados', frase: 'Esperando as primeiras leituras da Placa B.' };
    let recebidos = 0, filaCheia = 0, tentou = 0, naoSaiu = 0, comTentou = 0;
    for (const x of s) {
      recebidos += x.recebidos || 0;
      filaCheia += x.filaCheia || 0;
      if (x.aTentou !== null && x.recebidos) { tentou += x.aTentou; naoSaiu += x.aNaoSaiu || 0; comTentou++; }
    }
    const seg = s.length;
    const r = {
      segundos: seg,
      chegamPorS: (recebidos - filaCheia) / seg,
      recebidosPorS: recebidos / seg,
      tentouPorS: comTentou ? tentou / comTentou : null,
      fracaoNaoSaiu: 0, fracaoNoAr: 0, fracaoUsb: 0,
    };
    if (!recebidos) {
      return Object.assign(r, {
        situacao: 'sem-a',
        frase: 'A Placa B não está ouvindo a Placa A. Ela está ligada e com o firmware v2? A B vai procurar sozinha em todos os canais.',
      });
    }
    if (comTentou && tentou > 0) {
      const recComTentou = s.filter((x) => x.aTentou !== null && x.recebidos).reduce((a, x) => a + x.recebidos, 0);
      r.fracaoNaoSaiu = Math.min(1, naoSaiu / tentou);
      r.fracaoNoAr = Math.max(0, Math.min(1, (tentou - naoSaiu - recComTentou) / tentou));
    }
    r.fracaoUsb = recebidos ? filaCheia / recebidos : 0;

    const pct = (f) => `${Math.round(f * 100)}%`;
    if (r.fracaoNaoSaiu > 0.15) {
      r.situacao = 'canal-ocupado';
      r.frase = `${pct(r.fracaoNaoSaiu)} das sondas nem saem da Placa A: o canal está ocupado demais. Procure um canal livre.`;
    } else if (r.fracaoNoAr > 0.3) {
      r.situacao = 'ar';
      r.frase = `${pct(r.fracaoNoAr)} das sondas se perdem no ar. Aproxime as placas, vire as antenas uma para a outra, use o refletor ou procure um canal livre.`;
    } else if (r.fracaoUsb > 0.05) {
      r.situacao = 'usb';
      r.frase = `${pct(r.fracaoUsb)} das medidas não cabem na USB. Feche outros programas e evite hub USB.`;
    } else {
      r.situacao = 'ok';
      r.frase = r.fracaoNoAr > 0.05
        ? `Funcionando: ${pct(r.fracaoNoAr)} se perdem no ar, o que o detector aguenta.`
        : 'Funcionando: quase todas as sondas chegam.';
    }
    return r;
  }

  const api = { lerLinhaPlaca, diagnostico };
  raiz.WavePlaca = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* Testa a tela (demo/index.html) com uma Placa B de mentira na USB, falando como o firmware v2.
 *
 * A porta falsa substitui navigator.serial: manda linhas CSI_DATA (só LLTF, len 128) e WS_STAT,
 * responde a "varrer" e "canal N" e guarda o que a página escreveu. Roda com o Playwright:
 *   node ferramentas/testes/navegador_placa.js
 * Imprime um JSON com { passou, total, falhas }.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..', '..');
const PAGINA = 'file://' + path.join(RAIZ, 'demo', 'index.html');

// Uma linha real (coleta de 15/10), cortada para o formato do firmware v2: só os 128 números do LLTF.
function linhaModelo() {
  const csv = fs.readdirSync(path.join(RAIZ, 'dados', 'brutos')).find((f) => f.endsWith('_vazio.csv'));
  const texto = fs.readFileSync(path.join(RAIZ, 'dados', 'brutos', csv), 'utf8').split('\n');
  const l = texto.find((x) => x.includes('CSI_DATA'));
  const bruta = l.slice(l.indexOf('CSI_DATA'));
  const a = bruta.indexOf('"[');
  const campos = bruta.slice(0, a).split(',');
  const vals = bruta.slice(a + 2, bruta.lastIndexOf(']"')).split(',').slice(0, 128);
  campos[22] = '128';
  return { campos, vals };
}

function portaFalsa({ modelo, modo }) {
  /* eslint-disable no-undef */
  const escritos = [];
  let canal = 11, seq = 0, varrendo = false, controlador = null, t0 = Date.now();
  const enc = new TextEncoder();
  const manda = (s) => { if (controlador) controlador.enqueue(enc.encode(s + '\n')); };
  const linhaCSI = () => {
    const c = modelo.campos.slice();
    c[1] = String(seq); c[16] = String(canal);
    // um pouco de variação, para o detector ter o que medir
    const v = modelo.vals.map((x) => String(Number(x) + Math.round((Math.random() - 0.5) * 2)));
    return c.join(',') + '"[' + v.join(',') + ']"';
  };
  let recebidosSeg = 0;
  setInterval(() => {   // 100 sondas/s, 70 chegam
    if (varrendo) return;
    seq++;
    if (Math.random() < 0.7) { manda(linhaCSI()); recebidosSeg++; }
  }, 10);
  if (modo === 'v2') {
    setInterval(() => {
      manda(`WS_STAT,${Date.now() - t0},${canal},${recebidosSeg},0,0,${varrendo ? '-' : 100},0,0,-62,-95,${varrendo ? 'varrendo' : 'ok'},100`);
      recebidosSeg = 0;
    }, 1000);
  }
  function comando(txt) {
    escritos.push(txt);
    if (modo !== 'v2') return;
    const m = /^canal (\d+)/.exec(txt.trim());
    if (m) { setTimeout(() => { canal = Number(m[1]); manda(`WS_CANAL,${canal},ok`); }, 150); }
    if (txt.trim() === 'varrer') {
      varrendo = true;
      manda('WS_INFO,varrendo os canais de 1 a 13 (300 ms cada)');
      setTimeout(() => {
        const ocup = [30, 25, 20, 12, 6, 2, 8, 15, 22, 35, 40, 18, 10];
        ocup.forEach((o, i) => manda(`WS_VARREDURA,${i + 1},${o * 10},${o},${o + 3},-95`));
        manda('WS_VARREDURA,fim,6');
        varrendo = false;
      }, 600);
    }
  }
  const porta = {
    async open() {},
    async close() {},
    readable: new ReadableStream({ start(c) { controlador = c; } }),
    writable: new WritableStream({ write(chunk) { comando(new TextDecoder().decode(chunk)); } }),
  };
  Object.defineProperty(navigator, 'serial', { value: { requestPort: async () => porta }, configurable: true });
  window.__escritos = escritos;
}

async function main() {
  const modelo = linhaModelo();
  const navegador = await chromium.launch();
  const falhas = [];
  let total = 0;
  const confere = (ok, nome) => { total++; if (!ok) falhas.push(nome); };

  for (const modo of ['v2', 'oficial']) {
    const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
    const erros = [];
    pagina.on('pageerror', (e) => erros.push(String(e)));
    await pagina.addInitScript(portaFalsa, { modelo, modo });
    await pagina.goto(PAGINA);
    await pagina.keyboard.press('o');
    await pagina.click('#src-live');
    await pagina.waitForTimeout(2600);
    const taxa = Number(await pagina.textContent('#st-taxa'));
    confere(taxa > 40 && taxa < 100, `${modo}: pacotes/s chegando (${taxa})`);

    if (modo === 'oficial') {
      confere(await pagina.isHidden('#radio-grupo'), 'oficial: seção do rádio fica escondida');
    } else {
      confere(await pagina.isVisible('#radio-grupo'), 'v2: seção do rádio aparece');
      confere((await pagina.textContent('#rd-canal')) === '11', 'v2: mostra o canal 11');
      const diag = await pagina.textContent('#rd-diag');
      const perda = Number((/(\d+)%/.exec(diag) || [])[1]);
      confere(perda >= 15 && perda <= 50 && /no ar/.test(diag), `v2: diagnóstico fala da perda no ar, ~30% (${diag})`);
      confere((await pagina.textContent('#rd-tentou')) === '100', 'v2: A mandou 100/s');

      await pagina.click('#btn-varrer');
      await pagina.waitForTimeout(150);
      confere(await pagina.isDisabled('#btn-varrer'), 'v2: botão travado durante a varredura');
      await pagina.waitForTimeout(1500);
      const escritos = await pagina.evaluate(() => window.__escritos);
      confere(escritos[0] === 'varrer\n', `v2: mandou "varrer" (${JSON.stringify(escritos)})`);
      confere(escritos[1] === 'canal 6\n', 'v2: trocou sozinho para o canal mais livre (6)');
      confere((await pagina.locator('#rd-canais button').count()) === 13, 'v2: lista os 13 canais');
      confere((await pagina.textContent('#rd-canal')) === '6', 'v2: canal 6 depois da troca');
      confere(/calibre de novo/.test(await pagina.textContent('#msg')), 'v2: pede para calibrar de novo');
      confere(!(await pagina.isDisabled('#btn-varrer')), 'v2: botão destravado no fim');
      confere((await pagina.getAttribute('#rd-canais button:nth-child(6)', 'aria-current')) === 'true', 'v2: canal 6 marcado na lista');
      await pagina.screenshot({ path: process.env.CAPTURA || path.join(require('os').tmpdir(), 'operador-radio.png') });

      await pagina.click('#rd-canais button:nth-child(1)');
      await pagina.waitForTimeout(500);
      const e2 = await pagina.evaluate(() => window.__escritos);
      confere(e2[2] === 'canal 1\n', 'v2: clicar num canal da lista troca para ele');
      confere((await pagina.textContent('#rd-canal')) === '1', 'v2: canal 1 depois do clique');
    }
    confere(erros.length === 0, `${modo}: sem erros na página (${erros.join(' | ')})`);
    await pagina.close();
  }
  await navegador.close();
  console.log(JSON.stringify({ passou: total - falhas.length, total, falhas }));
  process.exit(falhas.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });

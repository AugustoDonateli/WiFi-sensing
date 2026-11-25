/* Gera o PDF do banner (90 x 120 cm, para a gráfica) e uma prévia em PNG, a partir do banner.html.
 *   node docs/banner-fecinc/exportar.js
 * Precisa do Playwright com o Chromium. Também confere se algum bloco passou da página ou se encostou em outro.
 */
const path = require('path');
const { chromium } = require('playwright');

const AQUI = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 3402, height: 4536 }, deviceScaleFactor: 0.5 });
  await p.goto('file://' + path.join(AQUI, 'banner.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  // Conferência: blocos que vazam da página ou se sobrepõem (em mm).
  const relatorio = await p.evaluate(() => {
    const mm = 96 / 25.4;
    const caixa = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { sel, topo: +(r.top / mm).toFixed(1), base: +(r.bottom / mm).toFixed(1) }; };
    const blocos = ['.heroi', '.identidade', '.numeros', '.corpo', '.corpo > :nth-child(1)', '.corpo > :nth-child(1) > div', '.corpo > :nth-child(1) > section', '.resultados', '.texto-duas', '.rodape'].map(caixa);
    const fontes = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.style);
    return { blocos, fontes };
  });
  console.log(JSON.stringify(relatorio, null, 1));
  await p.screenshot({ path: path.join(AQUI, 'previa.png'), fullPage: false });
  await p.pdf({ path: path.join(AQUI, 'banner-fecinc.pdf'), width: '900mm', height: '1200mm', printBackground: true, pageRanges: '1' });
  await b.close();
})();

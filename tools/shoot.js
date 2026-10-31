// Usage: node tools/shoot.js <path> <outPrefix>   Screens both themes at 375 and 1440 px.
const { chromium } = require('playwright');
(async () => {
  const [path, out] = process.argv.slice(2);
  const browser = await chromium.launch();
  for (const theme of ['blackboard', 'whiteboard']) {
    for (const width of [375, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: width < 500 ? 2 : 1 });
      await ctx.addInitScript(t => { try { localStorage.setItem('vnl-theme', t); } catch (e) {} }, theme);
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await page.goto('http://127.0.0.1:8080' + path, { waitUntil: 'networkidle' });
      // scroll through so on-scroll annotations draw
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${out}-${theme}-${width}.png`, fullPage: true });
      if (errs.length) console.log(theme, width, errs);
      await ctx.close();
    }
  }
  await browser.close();
})();

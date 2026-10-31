// Runs axe-core (WCAG 2.1 A/AA rules) on a page in both themes.
// Usage: node tools/axe.js /style-tile/   (needs the site served on 127.0.0.1:8080)
const { chromium } = require('playwright');
const axeSource = require('fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
(async () => {
  const path = process.argv[2] || '/';
  const browser = await chromium.launch();
  let total = 0;
  for (const theme of ['blackboard', 'whiteboard']) {
    for (const width of [375, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      await ctx.addInitScript(t => { try { localStorage.setItem('vnl-theme', t); } catch (e) {} }, theme);
      const page = await ctx.newPage();
      await page.goto('http://127.0.0.1:8080' + path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await page.addScriptTag({ content: axeSource });
      const res = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }));
      console.log(`${theme} @${width}px: ${res.violations.length} violations, ${res.incomplete.length} need review`);
      for (const v of res.violations) {
        total++;
        console.log(`  - ${v.id} (${v.impact}): ${v.help}`);
        v.nodes.slice(0, 4).forEach(n => console.log('      ', n.target.join(' '), '|', (n.failureSummary || '').split('\n')[1] || ''));
      }
      await ctx.close();
    }
  }
  await browser.close();
  process.exitCode = total ? 1 : 0;
})();

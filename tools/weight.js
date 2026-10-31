// Page weight: bytes transferred on first load (no scrolling) and after a full scroll.
// Usage: node tools/weight.js /   (needs the local server)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 375, height: 800 } });
  const page = await ctx.newPage();
  const sizes = [];
  page.on('response', async r => { try { const buf = await r.body(); sizes.push([r.url().replace('http://127.0.0.1:8080', ''), buf.length]); } catch (e) {} });
  await page.goto('http://127.0.0.1:8080' + (process.argv[2] || '/'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const first = sizes.reduce((s, x) => s + x[1], 0);
  console.log('First load:', (first / 1024).toFixed(0) + ' KB in ' + sizes.length + ' requests (uncompressed)');
  sizes.sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(x => console.log('  ', (x[1] / 1024).toFixed(1) + ' KB', x[0]));
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); } });
  await page.waitForTimeout(1500);
  console.log('After full scroll:', (sizes.reduce((s, x) => s + x[1], 0) / 1024).toFixed(0) + ' KB in ' + sizes.length + ' requests');
  await b.close();
})();

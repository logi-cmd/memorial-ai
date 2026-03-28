const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  const page = await context.newPage();

  const pages = [
    ['http://localhost:3000', 'homepage'],
    ['http://localhost:3000/settings', 'settings'],
    ['http://localhost:3000/share/demo-avatar', 'share'],
  ];

  for (const [url, name] of pages) {
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const outPath = `docs/images/${name}.png`;
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`✓ ${name}`);
    } catch (e) {
      console.error(`✗ ${name}: ${e.message}`);
    }
  }

  await browser.close();
})();

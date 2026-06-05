const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Handle initialization if needed
  const initBtn = page.locator('button:has-text("Inicializar NEXUS")');
  if (await initBtn.count() > 0 && await initBtn.isVisible()) {
    await initBtn.click();
    await page.waitForTimeout(6000);
  }

  // Screenshot 1: Banner with corrected text
  await page.screenshot({ path: '/home/z/my-project/download/nexus-banner-v2.png', fullPage: false });
  console.log('OK: nexus-banner-v2.png');

  // Screenshot 2: Oleadas tab with Quick Prompts
  const oleadasBtn = page.locator('button[role="tab"]').filter({ hasText: 'Oleadas' });
  if (await oleadasBtn.count() > 0) {
    await oleadasBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/home/z/my-project/download/nexus-oleadas-v2.png', fullPage: false });
    console.log('OK: nexus-oleadas-v2.png');
  }

  // Screenshot 3: Roadmap tab with Phase 3
  const roadmapBtn = page.locator('button[role="tab"]').filter({ hasText: 'Roadmap' });
  if (await roadmapBtn.count() > 0) {
    await roadmapBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/home/z/my-project/download/nexus-roadmap-v2.png', fullPage: false });
    console.log('OK: nexus-roadmap-v2.png');
  }

  await browser.close();
})();

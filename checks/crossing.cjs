const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function check() {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage();
    const origin = process.env.STUDIO_ORIGIN || 'https://jollychubbystudio.com';
    for (const suffix of ['', '/']) {
      const url = origin + '/pedestrian-living-hell/crossing' + suffix;
      await page.goto(url);
      await page.locator('#action').click();
      await page.waitForFunction(() => document.querySelector('#panel').hidden);
      await page.waitForFunction(() => {
        const canvas = document.querySelector('#scene');
        const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        const colors = new Set();
        for (let i = 0; i < data.length; i += 508) {
          if (data[i + 3]) colors.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
          if (colors.size > 32) return true;
        }
        return false;
      });
      const distance = page.locator('#distance');
      const before = await distance.textContent();
      await page.keyboard.down('ArrowUp');
      try {
        await page.waitForFunction(previous => document.querySelector('#distance').textContent !== previous, before);
      } finally {
        await page.keyboard.up('ArrowUp');
      }
      assert.equal(new URL(await page.locator('#back').evaluate(a => a.href)).pathname, '/pedestrian-living-hell/index.html');
      console.log('Rendered scene and moved pedestrian at', url);
    }
  } finally {
    await browser.close();
  }
}

check().catch(error => { console.error(error); process.exitCode = 1; });

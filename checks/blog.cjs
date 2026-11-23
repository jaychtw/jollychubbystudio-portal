const assert = require("node:assert/strict");
const { chromium } = require("playwright");

async function verify() {
  const origin = process.env.STUDIO_ORIGIN || "http://127.0.0.1:5000";
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ locale: "en-US", viewport: { width: 390, height: 844 } });
    await page.goto(origin);
    await page.locator('nav a[href="/blog/"]').click();
    await page.locator(".language-toggle").click();
    assert.equal(await page.locator("h1").textContent(), "部落格");
    const links = page.locator('[data-list="zh"]:visible h2 a');
    const routes = await links.evaluateAll(nodes => nodes.map(a => a.getAttribute("href")));
    for (const route of routes) {
      const response = await page.goto(origin + route);
      assert.equal(response.status(), 200);
      const lang = route.startsWith("/blog/zh/") ? "zh-Hant" : "en";
      assert.equal(await page.locator("html").getAttribute("lang"), lang);
      assert.equal(await page.locator('meta[property="og:type"]').getAttribute("content"), "article");
      const canonical = "https://jollychubbystudio.com" + route;
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), canonical);
      assert.equal(await page.locator('meta[property="og:url"]').getAttribute("content"), canonical);
      const image = new URL(await page.locator('meta[property="og:image"]').getAttribute("content"));
      assert.equal((await page.request.get(origin + image.pathname)).status(), 200);
      const counterpart = page.locator("a.blog-switch");
      if (await counterpart.count()) {
        const href = await counterpart.getAttribute("href");
        await counterpart.click();
        assert.equal(new URL(page.url()).pathname, href);
        assert.equal(await page.evaluate(() => localStorage.getItem("possibility:language")), href.includes("/en/") ? "en" : "zh-TW");
        await page.locator("a.blog-switch").click();
        assert.equal(new URL(page.url()).pathname, route);
      } else {
        assert.ok(await page.locator("button.blog-switch").isDisabled());
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    console.log("Verified mobile blog navigation, saved language, post metadata and translations for", routes.length, "posts.");
  } finally { await browser.close(); }
}
verify().catch(e => { console.error(e); process.exitCode = 1; });

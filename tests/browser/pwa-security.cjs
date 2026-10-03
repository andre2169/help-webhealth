const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { once } = require('node:events');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const modulePath = process.env.UI_TEST_SERVER_MODULE || path.join(__dirname, '../../index.js');
  const documentRoot = process.env.UI_TEST_SERVE_DIST || path.join(__dirname, '../../dist');
  const { createWebServer } = await import(pathToFileURL(modulePath).href);
  const server = createWebServer({ documentRoot });
  let browser;
  try {
    server.listen(5173, 'localhost');
    await once(server, 'listening');
    browser = await chromium.launch({ channel: process.env.UI_TEST_BROWSER || 'msedge', headless: true });
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    await context.route('**/api/v1/auth/me', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":"Sessao encerrada"}' }));
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto('http://localhost:5173/login');
    await page.getByRole('heading', { name: 'Login', exact: true }).waitFor();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.waitForFunction(() => navigator.serviceWorker.controller);

    await page.evaluate(async () => {
      await caches.open('helpweb-health-static-v3');
      await caches.open('unrelated-app');
    });
    // A fresh install exercises activation, rather than merely inspecting its source.
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.unregister();
    });
    await page.reload();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.waitForFunction(async () => !(await caches.keys()).includes('helpweb-health-static-v3'));
    assert.ok(await page.evaluate(async () => (await caches.keys()).includes('unrelated-app')));
    console.log('PASS real PWA activation removes old app cache and preserves unrelated caches');

    await page.evaluate(async () => {
      await fetch('/api/v1/private').catch(() => undefined);
      await fetch('/api/v1/private', { method: 'POST', body: 'private-test-data' }).catch(() => undefined);
      await fetch('/health');
    });
    await page.goto('http://localhost:5173/api/v1/private');
    assert.match(await page.locator('body').innerText(), /Not found/);
    await page.goto('http://localhost:5173/login');
    await page.getByRole('heading', { name: 'Login', exact: true }).waitFor();
    const cachedUrls = await page.evaluate(async () => {
      const cache = await caches.open('helpweb-health-static-v4');
      return (await cache.keys()).map(request => request.url);
    });
    assert.ok(cachedUrls.length >= 11);
    assert.ok(!cachedUrls.some(url => /\/api\/|\/health(?:$|\?)/.test(url)));
    console.log('PASS real PWA does not cache API GET, POST, API navigation or health responses');

    await page.waitForFunction(async () => {
      const cache = await caches.open('helpweb-health-static-v4');
      return (await cache.keys()).some(request => request.url.includes('/assets/') && request.url.endsWith('.js'));
    });
    await context.setOffline(true);
    await page.goto('http://localhost:5173/login');
    await page.getByRole('heading', { name: 'Login', exact: true }).waitFor();
    assert.equal(await page.locator('input[type="password"]').count(), 1);
    await context.setOffline(false);
    await context.close();
    console.log('PASS real PWA loads static login shell offline without recovering a private session');
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

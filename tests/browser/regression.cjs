const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = path.resolve(process.env.UI_TEST_OUTPUT || path.join(__dirname, '../../test-results/ui'));
const base = process.env.UI_TEST_BASE_URL || 'http://localhost:5173';
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'UI mocks are allowed only on loopback');

async function fixture(browser, { role = 'user', theme = 'dark', width = 390, standalone = true, authenticated = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width > 720 ? 900 : 844 }, locale: 'pt-BR', serviceWorkers: 'block' });
  await context.addInitScript(({ theme, standalone }) => {
    localStorage.setItem('helpwebhealth_theme', theme);
    if (standalone) Object.defineProperty(navigator, 'standalone', { value: true });
  }, { theme, standalone });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [], requests = [];
  let ticket = {
    id: 42, title: 'Computador da recepção', description: 'Sem conexão com a rede.',
    user_id: 1, owner_name: 'André', technician_id: null, technician_name: null,
    status: 'open', priority: 'medium', operational_impact: 'medium',
    category: 'Rede', sector: 'Recepção', equipment: 'Computador', sla_hours: 24,
    created_at: '2026-10-03T12:00:00Z', due_at: '2060-10-04T12:00:00Z', can_cancel: true,
  };
  let empty = false, failCancel = false, failList = false;
  const comments = [];
  const user = { id: 1, role, name: 'André Vilas Boas', email: 'qa@example.invalid', email_verified: true };
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), suffix = url.pathname.replace(/^\/api\/v1/, '');
    let status = 200, body;
    if (suffix === '/auth/me') { body = authenticated ? user : { detail: 'Sessão não autenticada' }; if (!authenticated) status = 401; }
    else if (suffix === '/auth/csrf') body = { csrf_token: 'qa-session-csrf' };
    else if (suffix === '/notifications/') body = { items: [], unread_count: 0 };
    else if (suffix === '/maintenance-notices/') body = [];
    else if (suffix === '/ticket-catalog/') body = [{ id: 1, kind: 'sector', name: 'Recepção', active: true }, { id: 2, kind: 'category', name: 'Rede', active: true }];
    else if (suffix === '/tickets/') {
      if (failList) { status = 503; body = { detail: 'Serviço temporariamente indisponível' }; }
      else body = { items: empty || ticket.deleted_at ? [] : [ticket], total: empty ? 0 : 7, has_more: false };
    }
    else if (suffix === '/tickets/deleted') body = { items: ticket.deleted_at ? [{ ...ticket, ticket_id: ticket.id }] : [], has_more: false };
    else if (suffix === '/tickets/42' || suffix === '/tickets/42/deleted') body = ticket;
    else if (suffix.endsWith('/timeline')) body = [{ id: 1, type: 'event', event_type: 'CREATED', created_at: ticket.created_at, author: user }, ...comments];
    else if (suffix === '/tickets/42/comments/') {
      assert.equal(request.method(), 'POST');
      assert.ok(request.headers()['x-csrf-token']);
      const { content } = request.postDataJSON();
      assert.ok(content.length <= 250);
      body = { id: comments.length + 2, type: 'comment', content, author: user, created_at: new Date().toISOString() };
      comments.push(body); requests.push('comment'); status = 201;
    }
    else if (suffix === '/dashboard/summary') body = { total: 90, by_status: { open: 60, in_progress: 20, resolved: 10 }, sla: { overdue: 3 }, technician_queue: [], my_active_tickets: [], technician_queue_total: 60, my_active_total: 4 };
    else if (suffix === '/tickets/42/cancel') {
      assert.equal(request.method(), 'PATCH');
      assert.ok(request.headers()['x-csrf-token']);
      requests.push('cancel');
      await new Promise(resolve => setTimeout(resolve, 120));
      if (failCancel) {
        failCancel = false;
        ticket = { ...ticket, technician_id: 2, status: 'in_progress', can_cancel: false };
        status = 400; body = { detail: 'Só é possível cancelar antes de um técnico assumir o chamado.' };
      } else {
        ticket = { ...ticket, deleted_at: '2026-10-03T14:00:00Z', deleted_by_name: user.name, status: 'cancelled', can_cancel: false };
        return route.fulfill({ status: 204 });
      }
    } else if (suffix === '/admin/deleted-tickets/42/restore') {
      assert.equal(role, 'admin'); requests.push('restore');
      ticket = { ...ticket, status: 'open', deleted_at: null, can_cancel: true }; body = ticket;
    } else throw new Error(`Unexpected mock request: ${request.method()} ${suffix}`);
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return { context, page, errors, requests, setEmpty: value => empty = value, setTicket: value => ticket = { ...ticket, ...value }, setName: value => user.name = value, failList: () => failList = true, failCancel: () => failCancel = true };
}

async function fits(page) {
  const geometry = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll('body *')].filter(node => node.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(node).position !== 'absolute').slice(0, 8).map(node => ({ tag: node.tagName, className: node.className })) }));
  if (geometry.scrollWidth > geometry.width) await page.screenshot({ path: path.join(output, 'overflow-failure.png'), fullPage: true });
  assert.ok(geometry.scrollWidth <= geometry.width, `No horizontal page overflow: ${JSON.stringify(geometry)}`);
  const footer = page.locator('.site-footer');
  await footer.waitFor();
  assert.equal(await footer.locator('a[href^="tel:"], a[href^="mailto:"]').count(), 0);
  await footer.getByText('André Vilas Boas', { exact: true }).waitFor();
  const boxes = await page.locator('.topbar-home-link, .topbar-actions > *, .site-footer-content > div').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect(); return { x: rect.x, right: rect.right, width: rect.width };
  }));
  const width = page.viewportSize().width;
  assert.ok(boxes.filter(box => box.width > 0).every(box => box.x >= -1 && box.right <= width + 1), `Actions and footer fit: ${JSON.stringify(boxes)}`);
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  let server, browser;
  let scenarios = 0;
  try {
    if (process.env.UI_TEST_SERVE_DIST) {
      const { pathToFileURL } = require('node:url');
      const { once } = require('node:events');
      const modulePath = process.env.UI_TEST_SERVER_MODULE || path.join(__dirname, '../../index.js');
      const { createWebServer } = await import(pathToFileURL(modulePath).href);
      server = createWebServer({ documentRoot: process.env.UI_TEST_SERVE_DIST });
      const address = new URL(base);
      server.listen(Number(address.port || 5173), address.hostname);
      await once(server, 'listening');
    }
    browser = await chromium.launch({ channel: process.env.UI_TEST_BROWSER || 'msedge', headless: true });
    if (!process.env.UI_TEST_EXTENDED_ONLY && !process.env.UI_TEST_DETAIL_ONLY) {
    for (const role of ['user', 'technician', 'admin']) for (const theme of ['dark', 'light']) for (const width of [320, 390, 844, 1440]) {
      const state = await fixture(browser, { role, theme, width });
      const { context, page, errors } = state;
      await page.goto(base);
      await page.locator('.home-action-grid').waitFor();
      await fits(page);
      assert.equal(await page.locator('.home-stat-card').count(), role === 'user' ? 1 : 4);
      const welcome = await page.locator('.home-hero-copy p').innerText();
      assert.ok(welcome.includes(role === 'user' ? 'Precisa de ajuda' : role === 'technician' ? 'Organize seus atendimentos' : 'Acompanhe a operação'));
      if (width <= 720) {
        const home = await page.locator('.topbar-home-link').boundingBox();
        assert.equal(home.width, 44); assert.equal(home.height, 44);
        assert.ok(await page.locator('.topbar-user-chip .user-avatar > span').isVisible(), 'Avatar initials remain visible');
        assert.equal(await page.locator('.topbar-shell').evaluate(element => getComputedStyle(element).position), 'relative', 'Only the mobile navigation is sticky');
        const menu = await page.locator('.sidebar-link').evaluateAll(nodes => nodes.map(node => ({ y: node.getBoundingClientRect().y, clipped: node.querySelector('span').scrollWidth > node.querySelector('span').clientWidth })));
        assert.ok(menu.every(item => Math.abs(item.y - menu[0].y) <= 1 && !item.clipped), 'Single menu row with complete labels');
        const strip = page.locator('.sidebar-navigation');
        await strip.evaluate(element => { element.scrollLeft = element.scrollWidth; });
        const last = await page.locator('.sidebar-link').last().boundingBox();
        assert.ok(last.x >= 0 && last.x + last.width <= width + 1, 'Last operation reachable by scrolling');
        await strip.evaluate(element => { element.scrollLeft = 0; });
      } else {
        const before = (await page.locator('.app-body').boundingBox()).width;
        await page.getByRole('button', { name: 'Recolher barra lateral' }).click();
        await page.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().width <= 77);
        const after = (await page.locator('.app-body').boundingBox()).width;
        assert.ok(after > before + 80, `Collapsed sidebar expands page: ${before} -> ${after}`);
        await page.getByRole('button', { name: 'Expandir barra lateral' }).click();
        await page.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().width > 150);
      }
      const logo = await page.locator('.sidebar .brand-logo').evaluate(async element => {
        if (getComputedStyle(element).display === 'none' || !element.getBoundingClientRect().width) return true;
        const match = getComputedStyle(element).maskImage.match(/url\("?([^"\)]+)"?\)/);
        return match && new Promise(resolve => { const image = new Image(); image.onload = () => resolve(image.naturalWidth > 0); image.onerror = () => resolve(false); image.src = match[1]; });
      });
      assert.ok(logo, 'Existing brand image loads');
      if ([390, 1440].includes(width)) await page.screenshot({ path: path.join(output, `${role}-${theme}-${width}.png`), fullPage: true, animations: 'disabled' });
      await page.goto(`${base}/tickets`);
      await page.locator('.ticket-row').waitFor();
      await page.getByRole('note').getByText(/Todos os status inclui/).waitFor();
      await page.locator('#ticket-status').selectOption('resolved');
      await page.getByRole('note').getByText(/status Resolvido/).waitFor();
      state.setEmpty(true);
      await page.locator('#ticket-status').selectOption('open');
      await page.getByText('Nenhum chamado corresponde a esta seleção', { exact: true }).waitFor();
      await page.locator('#ticket-status').selectOption('deleted');
      await page.getByRole('note').getByText(/Somente o administrador pode recuperá-los/).waitFor();
      await fits(page);
      if (role === 'admin' && width === 390) await page.screenshot({ path: path.join(output, `${role}-${theme}-${width}-filters.png`), fullPage: true, animations: 'disabled' });
      assert.deepEqual(errors, []);
      await context.close(); scenarios++;
      console.log(`PASS ${role} ${theme} ${width}: home, navigation, footer and filters`);
    }

    for (const theme of ['dark', 'light']) {
      const state = await fixture(browser, { theme, standalone: false });
      await state.page.goto(base);
      await state.page.locator('.home-action-grid').waitFor();
      const ys = await state.page.locator('.sidebar-link').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().y));
      assert.ok(ys.every(y => y === ys[0]));
      await fits(state.page); await state.context.close(); scenarios++;
      const login = await fixture(browser, { theme, width: 320, authenticated: false });
      await login.page.goto(`${base}/login`);
      await login.page.getByRole('heading', { name: 'Login', exact: true }).waitFor();
      await fits(login.page);
      await login.page.screenshot({ path: path.join(output, `login-${theme}-320.png`), fullPage: true });
      await login.context.close(); scenarios++;
    }

    const success = await fixture(browser);
    await success.page.goto(`${base}/tickets/42`);
    const cancel = success.page.getByRole('button', { name: 'Cancelar chamado', exact: true });
    await cancel.waitFor();
    success.page.on('dialog', dialog => dialog.accept());
    await cancel.evaluate(button => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await success.page.getByText('CHM-0042 foi cancelado e retirado da fila.', { exact: true }).waitFor();
    assert.deepEqual(success.requests, ['cancel']);
    assert.equal(await success.page.locator('.ticket-row').count(), 0);
    await success.page.locator('#ticket-status').selectOption('deleted');
    await success.page.locator('.ticket-row').waitFor();
    await success.page.locator('.ticket-row').click();
    await success.page.getByRole('dialog').getByText(/foi cancelado e está em modo de consulta/).waitFor();
    assert.equal(await success.page.getByRole('button', { name: 'Recuperar chamado', exact: true }).count(), 0);
    await success.context.close(); scenarios++;

    const failed = await fixture(browser);
    failed.failCancel();
    await failed.page.goto(`${base}/tickets/42`);
    await failed.page.getByRole('button', { name: 'Cancelar chamado', exact: true }).waitFor();
    failed.page.on('dialog', dialog => dialog.accept());
    await failed.page.getByRole('button', { name: 'Cancelar chamado', exact: true }).click();
    await failed.page.getByRole('alert').getByText(/Só é possível cancelar/).waitFor();
    await failed.page.getByRole('button', { name: 'Cancelar chamado', exact: true }).waitFor({ state: 'detached' });
    assert.deepEqual(failed.requests, ['cancel']);
    assert.equal(new URL(failed.page.url()).pathname, '/tickets/42');
    await failed.context.close(); scenarios++;

    for (const role of ['user', 'technician', 'admin']) {
      const state = await fixture(browser, { role });
      state.setTicket({ status: 'resolved', can_cancel: false, technician_id: 2 });
      await state.page.goto(`${base}/tickets/42`);
      await state.page.locator('.detail-title').waitFor();
      assert.equal(await state.page.getByRole('button', { name: 'Reabrir chamado', exact: true }).count(), role === 'admin' ? 1 : 0);
      assert.equal(await state.page.getByRole('button', { name: 'Excluir chamado', exact: true }).count(), role === 'admin' ? 1 : 0);
      assert.equal(await state.page.getByRole('button', { name: 'Cancelar chamado', exact: true }).count(), 0);
      if (role === 'admin') {
        state.setTicket({ status: 'cancelled', deleted_at: '2026-10-03T14:00:00Z' });
        await state.page.goto(`${base}/tickets/42?deleted=1`);
        await state.page.getByRole('button', { name: 'Recuperar chamado', exact: true }).waitFor();
        state.page.on('dialog', async dialog => { assert.ok(dialog.message().includes('status Aberto')); await dialog.accept(); });
        await state.page.getByRole('button', { name: 'Recuperar chamado', exact: true }).click();
        await state.page.getByText('CHM-0042 foi recuperado como Aberto.', { exact: true }).waitFor();
        assert.deepEqual(state.requests, ['restore']);
      }
      assert.deepEqual(state.errors, []);
      await state.context.close(); scenarios++;
    }
    }
    if (!process.env.UI_TEST_DETAIL_ONLY) {
    const dismissed = await fixture(browser);
    await dismissed.page.goto(`${base}/tickets/42`);
    dismissed.page.on('dialog', dialog => dialog.dismiss());
    await dismissed.page.getByRole('button', { name: 'Cancelar chamado', exact: true }).click();
    assert.deepEqual(dismissed.requests, []);
    assert.equal(new URL(dismissed.page.url()).pathname, '/tickets/42');
    await dismissed.context.close(); scenarios++;

    const outage = await fixture(browser);
    outage.failList();
    await outage.page.goto(`${base}/tickets`);
    await outage.page.getByText('Serviço temporariamente indisponível', { exact: true }).waitFor();
    assert.equal(await outage.page.getByText('Nenhum chamado nesta lista', { exact: true }).count(), 0);
    assert.equal(await outage.page.locator('.ticket-row').count(), 0);
    await outage.context.close(); scenarios++;

    const rotation = await fixture(browser, { role: 'admin', width: 320 });
    await rotation.page.goto(base);
    await rotation.page.locator('.home-action-grid').waitFor();
    for (const width of [844, 320]) {
      await rotation.page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
      await fits(rotation.page);
      assert.ok(await rotation.page.getByRole('link', { name: 'Início', exact: true }).first().isVisible());
    }
    await rotation.context.close(); scenarios++;

    const longText = await fixture(browser, { width: 320 });
    longText.setName('André ' + 'Vilas '.repeat(17));
    longText.setTicket({ title: 'Equipamento'.repeat(12) });
    await longText.page.goto(base); await longText.page.locator('.home-action-grid').waitFor();
    await fits(longText.page);
    await longText.page.goto(`${base}/tickets`); await longText.page.locator('.ticket-row').waitFor();
    await fits(longText.page);
    await longText.page.screenshot({ path: path.join(output, 'long-content-320.png'), fullPage: true });
    await longText.context.close(); scenarios++;

    const hostile = await fixture(browser);
    const payload = '<img src=x onerror="window.attackExecuted=true">';
    hostile.setTicket({ title: payload, description: payload });
    await hostile.page.goto(`${base}/tickets/42`); await hostile.page.locator('.detail-title').waitFor();
    assert.ok((await hostile.page.locator('.detail-title').innerText()).includes(payload));
    assert.equal(await hostile.page.locator('.detail-title img').count(), 0);
    assert.equal(await hostile.page.evaluate(() => window.attackExecuted), undefined);
    assert.deepEqual(hostile.errors, []);
    await hostile.context.close(); scenarios++;

    const keyboard = await fixture(browser, { role: 'admin', width: 320 });
    await keyboard.page.goto(base); await keyboard.page.locator('.home-action-grid').waitFor();
    const links = keyboard.page.locator('.sidebar-link');
    await links.last().focus();
    const active = await keyboard.page.evaluate(() => {
      const element = document.activeElement, rect = element.getBoundingClientRect();
      return { linked: element.classList.contains('sidebar-link'), left: rect.left, right: rect.right };
    });
    assert.ok(active.linked && active.left >= 0 && active.right <= 321, 'Keyboard focus scrolls the last menu item into view');
    const destination = new URL(await links.last().getAttribute('href'), base).href;
    await keyboard.page.keyboard.press('Enter');
    await keyboard.page.waitForURL(destination);
    await keyboard.context.close(); scenarios++;

    const unauthorized = await fixture(browser, { authenticated: false });
    await unauthorized.page.goto(`${base}/tickets/42`);
    await unauthorized.page.waitForURL('**/login');
    assert.equal(await unauthorized.page.getByRole('button', { name: 'Cancelar chamado', exact: true }).count(), 0);
    await unauthorized.context.close(); scenarios++;
    }

    for (const theme of ['dark', 'light']) for (const width of [320, 390, 844, 1440]) {
      const state = await fixture(browser, { theme, width });
      state.setTicket({ due_at: new Date(Date.now() + 8 * 3600000).toISOString() });
      const { page } = state;
      await page.goto(`${base}/tickets/42`);
      const badges = page.locator('.detail-badges');
      await badges.locator('.sla-indicator').getByText(/^Restam/).waitFor();
      assert.equal(await badges.locator(':scope > span').count(), 3);
      assert.equal(await page.locator('.sla-indicator').count(), 1, 'SLA countdown is not duplicated in the context strip');
      const boxes = await badges.locator(':scope > span').evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, height: rect.height };
      }));
      assert.ok(boxes.every(box => Math.abs(box.height - boxes[0].height) < 1), 'Badge heights match');
      if (width >= 390) assert.ok(boxes.every(box => Math.abs(box.top - boxes[0].top) < 1), 'Badges share one row when space permits');
      const header = await badges.boundingBox();
      const title = await page.locator('.detail-title').boundingBox();
      const strip = await page.locator('.health-context-strip').boundingBox();
      assert.ok(title.y >= header.y + header.height + 7, 'Badges precede the title without overlap');
      assert.ok(strip.y >= title.y + title.height + 8 && strip.y <= title.y + title.height + 16, 'Context follows the title closely');
      await fits(page);
      await page.screenshot({ path: path.join(output, `detail-${theme}-${width}.png`), fullPage: true });

      const input = page.getByRole('textbox', { name: 'Adicionar comentário', exact: true });
      const counter = page.locator('#ticket-comment-counter');
      const submit = page.getByRole('button', { name: 'Comentar', exact: true });
      await input.scrollIntoViewIfNeeded();
      assert.equal(await input.getAttribute('aria-describedby'), 'ticket-comment-counter');
      assert.equal(await counter.innerText(), '0/250');
      assert.equal(await submit.isDisabled(), true);
      const area = await input.boundingBox();
      const countBox = await counter.boundingBox();
      assert.ok(countBox.y >= area.y + area.height + 8, 'Counter sits below the textarea with positive spacing');
      assert.ok(countBox.x + countBox.width <= area.x + area.width + 1, 'Counter stays within the textarea width');
      await input.fill('a'.repeat(250));
      await input.press('End'); await page.keyboard.insertText('b');
      assert.equal((await input.inputValue()).length, 250);
      assert.equal(await counter.innerText(), '250/250');
      assert.ok(await counter.evaluate(element => element.classList.contains('is-warning')));
      await page.locator('.comment-form').screenshot({ path: path.join(output, `comment-${theme}-${width}.png`) });

      await input.fill('<script>alert(1)</script>'); await submit.click();
      await page.locator('#ticket-comment-error').waitFor();
      assert.equal(await input.getAttribute('aria-invalid'), 'true');
      const error = await page.locator('#ticket-comment-error').boundingBox();
      const counterWithError = await counter.boundingBox();
      assert.ok(error.y >= counterWithError.y + counterWithError.height, 'Validation error does not overlap the counter');
      assert.deepEqual(state.requests, []);
      const message = 'Impressora reiniciada.\nAguardando teste do setor.';
      await input.fill(message); await submit.click();
      await page.locator('.timeline-body').getByText(message, { exact: true }).waitFor();
      assert.equal(await input.inputValue(), '');
      assert.equal(await counter.innerText(), '0/250');
      assert.equal(await input.getAttribute('aria-invalid'), 'false');
      assert.deepEqual(state.requests, ['comment']);

      state.setTicket({ status: 'in_progress', technician_id: 2, can_cancel: false, due_at: new Date(Date.now() - 2 * 3600000).toISOString() });
      await page.reload();
      await badges.locator('.status-badge').getByText('Em andamento', { exact: true }).waitFor();
      await badges.locator('.sla-indicator').getByText(/^Vencido/).waitFor();
      await fits(page);
      state.setTicket({ status: 'cancelled', deleted_at: '2026-10-03T14:00:00Z' });
      await page.goto(`${base}/tickets/42?deleted=1`);
      await badges.locator('.status-badge').getByText('Cancelado', { exact: true }).waitFor();
      assert.equal(await badges.locator(':scope > span').count(), 2);
      assert.equal(await page.locator('.sla-indicator, .comment-form').count(), 0, 'Archived tickets remain read-only without an active deadline');
      await fits(page);
      assert.deepEqual(state.errors, []);
      await state.context.close(); scenarios++;
      console.log(`PASS ticket detail ${theme} ${width}: badges, spacing, comment limit/submission and archived state`);
    }
    console.log(`PASS ${scenarios} UI scenarios; screenshots: ${output}`);
  } finally {
    if (browser) await browser.close();
    if (server?.listening) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

import { expect, test } from '@playwright/test';

const runtimeErrors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const errors = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
});
test.afterEach(async ({ page }) => expect(runtimeErrors.get(page)).toEqual([]));

const realisticNames = [
  'Существо3.Новая карта', 'Существо2.Новая карта', 'Громм Кровавый Торн',
  'Очень Длинное Имя Персонажа Для Проверки Интерфейса',
  'Лазарь', 'Рейнай', 'Азраэль', 'Страж Северных Врат'
];

async function setup(page, status = null, names = null) {
  await page.goto('/');
  await page.evaluate(async ({ status, names }) => {
    const { CampaignMapModel } = await import('/js/editor/campaignMapModel.js');
    const { getCampaignMapStore } = await import('/js/editor/campaignMapStore.js');
    const { serializeCampaignMapModelHTML, serializeCampaignMapDocumentHTML } = await import('/js/editor/campaignMapDataSerializer.js');
    const { getMapControlsHTML } = await import('/js/editor/campaignMapToolbar.js');
    const { handleCampaignMapToolbarClick } = await import('/js/editor/campaignMapToolbarController.js');
    const { closeMapPopup } = await import('/js/editor/campaignMapPopupController.js');
    const { getPageById } = await import('/js/repository/pageRepository.js');
    const { setPages } = await import('/js/stateActions.js');
    const { applyAppearance } = await import('/js/ui/themeManager.js');
    applyAppearance({ theme: 'dark', accent: 'gold', background: 'stone', scale: 'normal' });
    setPages([{ id: 'page-a', title: 'Альфа' }, { id: 'page-b', title: 'Бета' }]);
    const initial = new CampaignMapModel({
      tokens: ['a', 'b', 'c'].map((tokenId, i) => ({ tokenId, type: 'creature', pageId: i < 2 ? `page-${tokenId}` : '',
        name: ['Альфа', 'Бета', 'Гамма'][i], x: 10 + i * 10, y: 10, initiativeModifier: 0 })),
      initiative: status ? { activeParticipantId: 'token:b', participants: [
        { participantId: 'token:a', tokenId: 'a', pageId: 'page-a', name: 'Альфа', roll: 18, total: 18 },
        { participantId: 'token:b', tokenId: 'b', pageId: 'page-b', name: 'Бета', roll: 12, total: 12 }
      ] } : {},
      combatSession: status ? { sessionId: 'combat-ui-fixture', status, round: 3, participants: [
        { participantId: 'token:a', ready: true }, { participantId: 'token:b', delayed: true }
      ] } : null
    });
    if (names) {
      const tokens = names.map((name, i) => ({ tokenId: String.fromCharCode(97 + i), name,
        type: 'creature', pageId: `fixture-page-${i}`, x: 10 + i * 5, y: 10, initiativeModifier: i % 3 - 1 }));
      setPages(tokens.filter((_, i) => i !== 3).map(token => ({ id: token.pageId, title: token.name })));
      initial.tokens = tokens;
      if (status) {
        initial.initiative = { activeParticipantId: 'token:c', participants: tokens.map((token, i) => ({
          participantId: `token:${token.tokenId}`, tokenId: token.tokenId, pageId: token.pageId,
          name: token.name, sourceMode: 'original', roll: [20, 4, 12, 18, 1, 9, 7, 15][i],
          modifier: token.initiativeModifier, total: [20, 4, 12, 18, 1, 9, 7, 15][i] + token.initiativeModifier
        })) };
        initial.combatSession.participants = tokens.map((token, i) => ({
          participantId: `token:${token.tokenId}`, ready: i % 2 === 0 || i === 3, delayed: i % 3 === 0
        }));
        initial.combatSession.participants.push({ participantId: 'missing:Страж-забытой-переправы', ready: true, delayed: false });
      }
    }
    const editor = document.querySelector('#editorArea');
    const harness = window.combatUI = { saves: 0, saved: '', failSave: false, failResolver: false };
    harness.snapshot = () => structuredClone(harness.store.getModel().toJSON());
    harness.mount = html => {
      closeMapPopup();
      editor.innerHTML = html;
      const map = editor.querySelector('.campaign-map-document');
      map.querySelector('.campaign-map-topbar').insertAdjacentHTML('beforeend', `<div class="campaign-map-controls">${getMapControlsHTML()}</div>`);
      harness.map = map;
      harness.store = getCampaignMapStore(map);
      harness.store.clearDirty();
      map.addEventListener('click', event => {
        if (!event.target.closest('.campaign-initiative-btn')) return;
        event.stopPropagation();
        void handleCampaignMapToolbarClick(event, map, {
          resolvePage: id => { if (harness.failResolver) throw new Error('fixture resolver'); return getPageById(id); },
          saveAndSync: async () => {
            if (harness.failSave) throw new Error('fixture write failure');
            harness.saves++;
            harness.saved = serializeCampaignMapDocumentHTML(map);
          }
        });
      });
    };
    harness.reload = () => harness.mount(harness.saved);
    harness.mount(serializeCampaignMapModelHTML({ title: 'Бой у переправы', model: initial }));
    harness.saved = serializeCampaignMapDocumentHTML(harness.map);
  }, { status, names });
  await page.locator('.campaign-initiative-btn').click();
  await expect(page.locator('#campaignMapPopup')).toBeVisible();
}

async function expectRosterGeometry(page) {
  const errors = await popup(page).evaluate(root => {
    const errors = [];
    const rect = node => node.getBoundingClientRect();
    const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
      && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    const inside = (a, b) => a.left >= b.left - 1 && a.top >= b.top - 1 && a.right <= b.right + 1 && a.bottom <= b.bottom + 1;
    const cards = [...root.querySelectorAll('.campaign-initiative-row, .campaign-combat-unresolved')];
    const scrollAreas = [...root.querySelectorAll('*')].filter(node =>
      ['auto', 'scroll'].includes(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1);
    if (scrollAreas.length > 1 || scrollAreas.some(node => !node.classList.contains('campaign-initiative-scroll'))) errors.push('unexpected nested scrolling');
    for (const [i, card] of cards.entries()) {
      card.scrollIntoView({ block: 'nearest' });
      const bounds = rect(card);
      if (bounds.height <= 0 || card.scrollWidth > card.clientWidth + 1) errors.push(`card ${i}: size/overflow`);
      const name = card.querySelector('.campaign-initiative-name') || card.querySelector('strong');
      const text = document.createRange();
      text.selectNodeContents(name);
      const nameBounds = text.getBoundingClientRect();
      if (!inside(nameBounds, bounds)) errors.push(`card ${i}: name outside card`);
      const controls = [...card.querySelectorAll('input, button, .campaign-initiative-result, .campaign-combat-warning, .campaign-initiative-current-label')];
      for (const control of controls) {
        const controlBounds = rect(control);
        if (!inside(controlBounds, bounds)) errors.push(`card ${i}: ${control.className} outside card`);
        if (control !== name && !name.contains(control) && overlaps(nameBounds, controlBounds)) errors.push(`card ${i}: name overlaps ${control.className}`);
      }
      for (let j = 0; j < controls.length; j++) {
        for (const other of controls.slice(j + 1)) {
          if (!controls[j].contains(other) && !other.contains(controls[j]) && overlaps(rect(controls[j]), rect(other))) {
            errors.push(`card ${i}: controls overlap`);
          }
        }
      }
      if (cards[i + 1] && overlaps(bounds, rect(cards[i + 1]))) errors.push(`card ${i}: overlaps next card`);
    }
    const bounds = rect(root);
    if (!inside(bounds, { left: 0, top: 0, right: innerWidth, bottom: innerHeight })) errors.push(`popup outside viewport: ${JSON.stringify(bounds.toJSON())}`);
    if (root.scrollWidth > root.clientWidth + 1 || root.scrollHeight > root.clientHeight + 1) errors.push('popup scrolls/overflows');
    if (document.scrollingElement.scrollWidth > innerWidth + 1 || document.scrollingElement.scrollTop !== 0) errors.push('page scrolls/overflows');
    return errors;
  });
  expect(errors).toEqual([]);
}

async function expectReachableFooter(page, status) {
  const scroll = popup(page).locator('.campaign-initiative-scroll');
  expect(await scroll.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  const lifecycle = status === 'active' ? '.campaign-combat-pause-btn' : '.campaign-combat-resume-btn';
  for (const selector of [lifecycle, '.campaign-combat-finish-btn', '.campaign-initiative-close-btn']) {
    const button = popup(page).locator(selector);
    await expect(button).toBeInViewport({ ratio: 1 });
    expect(await button.evaluate(node => {
      const r = node.getBoundingClientRect();
      return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    })).toBe(true);
    await button.click({ trial: true });
  }
}

for (const viewport of [{ width: 1280, height: 900 }, { width: 480, height: 720 }, { width: 1024, height: 768 }]) {
  test(`realistic roster geometry, footer and evidence ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await setup(page, 'active', realisticNames);
    await page.evaluate(() => document.fonts.ready);
    await expect(popup(page).locator('.campaign-initiative-order-row')).toHaveCount(8);
    await expect(row(page, 'd')).toContainText('Не найдена страница источника');
    await expect(row(page, 'd').locator('[aria-pressed="true"]')).toHaveCount(2);
    for (const status of ['active', 'paused']) {
      await expectRosterGeometry(page);
      await expectReachableFooter(page, status);
      await popup(page).locator('.campaign-initiative-scroll').evaluate(node => { node.scrollTop = 0; });
      const path = testInfo.outputPath(`combat-realistic-${status}-${viewport.width}.png`);
      await popup(page).screenshot({ path, animations: 'disabled' });
      await testInfo.attach(`combat-realistic-${status}`, { path, contentType: 'image/png' });
      if (status === 'active') {
        await row(page, 'd').evaluate(node => node.scrollIntoView({ block: 'start' }));
        const detailPath = testInfo.outputPath(`combat-realistic-details-${viewport.width}.png`);
        await popup(page).screenshot({ path: detailPath, animations: 'disabled' });
        await testInfo.attach('combat-realistic-details', { path: detailPath, contentType: 'image/png' });
      }
      if (status === 'active') await action(page, '.campaign-combat-pause-btn');
    }
    await popup(page).locator('.campaign-combat-resume-btn').focus();
    await page.keyboard.press('Enter');
    await expect(popup(page).locator('.campaign-combat-pause-btn')).toBeFocused();
    const select = row(page, 'h').locator('.campaign-initiative-select');
    await select.focus();
    await expect(select).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Tab');
    await expect(row(page, 'h').locator('.campaign-initiative-value')).toBeFocused();
    await page.keyboard.press('Tab');
    const ready = row(page, 'h').locator('[data-combat-flag="ready"]');
    await expect(ready).toBeFocused();
    await page.keyboard.press('Space');
    await expect(ready).toHaveAttribute('aria-pressed', 'true');
    await expect(ready).toBeFocused();
    await expect(ready).toBeInViewport({ ratio: 1 });
    expect(await ready.evaluate(node => getComputedStyle(node).outlineStyle)).not.toBe('none');
    await action(page, '.campaign-combat-finish-btn');
    await expect(popup(page).locator('.campaign-combat-status')).toHaveText('Завершён');
    await action(page, '.campaign-initiative-close-btn');
    await expect(popup(page)).toBeHidden();
    await expect(page.locator('.campaign-initiative-btn')).toBeFocused();
  });
}

test('realistic pre-combat picker rolls, edits, applies and starts without losing long names', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 720 });
  await setup(page, null, realisticNames);
  await expectRosterGeometry(page);
  await action(page, '.campaign-initiative-roll-btn');
  for (const input of await popup(page).locator('.campaign-initiative-value').all()) {
    expect(Number(await input.inputValue())).toBeGreaterThanOrEqual(0);
    expect(Number(await input.inputValue())).toBeLessThanOrEqual(21);
  }
  await popup(page).locator('[data-participant-id="token:d"] .campaign-initiative-value').fill('31');
  await popup(page).locator('.campaign-initiative-checkbox[value="h"]').uncheck();
  await action(page, '.campaign-initiative-save-btn');
  await expect(popup(page).locator('.campaign-initiative-order-row')).toHaveCount(7);
  await expect(row(page, 'd').locator('.campaign-initiative-value')).toHaveValue('31');
  await expect(row(page, 'd').locator('.campaign-initiative-name')).toHaveText(realisticNames[3]);
  await expectRosterGeometry(page);
  await action(page, '.campaign-combat-start-btn');
  expect((await snapshot(page)).combatSession).toMatchObject({ status: 'active', round: 1 });
  await reload(page);
  await expect(row(page, 'd').locator('.campaign-initiative-value')).toHaveValue('31');
});

const popup = page => page.locator('#campaignMapPopup');
const row = (page, id) => popup(page).locator(`.campaign-initiative-order-row[data-participant-id="token:${id}"]`);
const snapshot = page => page.evaluate(() => window.combatUI.snapshot());
async function action(page, selector) {
  await popup(page).locator(selector).click();
  await expect(popup(page)).not.toHaveAttribute('aria-busy', 'true');
}
async function reload(page) {
  await page.evaluate(() => window.combatUI.reload());
  await page.locator('.campaign-initiative-btn').click();
  await expect(popup(page)).toBeVisible();
}

test('prepare without combat, start, UI progression and markers survive active reload', async ({ page }) => {
  await setup(page);
  await expect(popup(page).locator('.campaign-initiative-save-btn')).toHaveText('Применить');
  await popup(page).locator('.campaign-initiative-checkbox[value="c"]').uncheck();
  await popup(page).locator('.campaign-initiative-row').filter({ has: page.locator('[value="a"]') }).locator('.campaign-initiative-value').fill('18');
  await popup(page).locator('.campaign-initiative-row').filter({ has: page.locator('[value="b"]') }).locator('.campaign-initiative-value').fill('12');
  await action(page, '.campaign-initiative-save-btn');
  const prepared = await snapshot(page);
  expect(prepared.combatSession).toBeNull();
  await action(page, '.campaign-combat-start-btn');
  const started = await snapshot(page);
  expect(started.initiative).toEqual(prepared.initiative);
  expect(started.combatSession).toMatchObject({ status: 'active', round: 1 });
  expect(started.combatSession.participants.every(p => !p.ready && !p.delayed)).toBe(true);
  await expect(popup(page).locator('.campaign-combat-round')).toHaveText('Раунд 1');
  await row(page, 'a').locator('[data-combat-flag="ready"]').click();
  await row(page, 'b').locator('[data-combat-flag="delayed"]').click();
  await row(page, 'b').locator('[data-combat-flag="ready"]').click();
  await expect(row(page, 'b').locator('[data-combat-flag="ready"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(row(page, 'b').locator('[data-combat-flag="delayed"]')).toHaveAttribute('aria-pressed', 'true');
  expect((await snapshot(page)).initiative).toEqual(prepared.initiative);
  for (let i = 0; i < 5; i++) await action(page, '.campaign-initiative-next-btn');
  await expect(popup(page).locator('.campaign-combat-round')).toHaveText('Раунд 3');
  await expect(popup(page).locator('.campaign-initiative-active')).toContainText('Бета');
  await expect(page.locator('.campaign-map-token[data-token-id="b"]')).toHaveClass(/is-initiative-active/);
  const before = await snapshot(page);
  await reload(page);
  const after = await snapshot(page);
  expect(after.combatSession).toEqual(before.combatSession);
  expect(after.initiative).toEqual(before.initiative);
  await expect(row(page, 'a').locator('[data-combat-flag="ready"]')).toHaveAttribute('aria-pressed', 'true');
  await action(page, '.campaign-initiative-next-btn');
  await expect(popup(page).locator('.campaign-combat-round')).toHaveText('Раунд 4');
  await action(page, '.campaign-initiative-prev-btn');
  await expect(popup(page).locator('.campaign-combat-round')).toHaveText('Раунд 4');
  expect((await snapshot(page)).combatSession.participants).toEqual(before.combatSession.participants);
  expect(await page.evaluate(() => window.combatUI.saves)).toBe(12);
});

test('pause resume finish and new combat use one save each and retain read-only reload state', async ({ page }) => {
  await setup(page, 'active');
  const original = await snapshot(page);
  await action(page, '.campaign-combat-pause-btn');
  await expect(popup(page).locator('.campaign-combat-status')).toHaveText('Пауза');
  for (const selector of ['.campaign-initiative-next-btn', '.campaign-initiative-prev-btn', '.campaign-initiative-edit-btn',
    '.campaign-initiative-save-order-btn', '.campaign-initiative-select', '.campaign-initiative-value', '[data-combat-flag]']) {
    for (const control of await popup(page).locator(selector).all()) await expect(control).toBeDisabled();
  }
  const paused = await snapshot(page);
  expect(paused.combatSession).toEqual({ ...original.combatSession, status: 'paused' });
  expect(paused.initiative).toEqual(original.initiative);
  await reload(page);
  expect((await snapshot(page)).combatSession).toEqual(paused.combatSession);
  await expect(popup(page).locator('.campaign-initiative-next-btn')).toBeDisabled();
  await expect(popup(page).locator('.campaign-combat-finish-btn')).toBeEnabled();
  await action(page, '.campaign-combat-resume-btn');
  await expect(popup(page).locator('.campaign-initiative-next-btn')).toBeEnabled();
  await action(page, '.campaign-combat-finish-btn');
  const finished = await snapshot(page);
  await reload(page);
  expect((await snapshot(page)).combatSession).toEqual(finished.combatSession);
  expect((await snapshot(page)).initiative).toEqual(original.initiative);
  await expect(popup(page).locator('.campaign-combat-status')).toHaveText('Завершён');
  await expect(popup(page).locator('.campaign-combat-start-btn')).toHaveText('Новый бой');
  await expect(popup(page).locator('.campaign-initiative-select').first()).toBeDisabled();
  await action(page, '.campaign-combat-start-btn');
  const fresh = await snapshot(page);
  expect(fresh.combatSession.sessionId).not.toBe(original.combatSession.sessionId);
  expect(fresh.combatSession).toMatchObject({ status: 'active', round: 1 });
  expect(fresh.combatSession.participants.every(member => !member.ready && !member.delayed)).toBe(true);
  expect(fresh.initiative).toEqual(original.initiative);
  expect(await page.evaluate(() => window.combatUI.saves)).toBe(4);
});

test('active participant edits reconcile retained/new/removed markers and manual values preserve round', async ({ page }) => {
  await setup(page, 'active');
  const original = await snapshot(page);
  await action(page, '.campaign-initiative-edit-btn');
  await popup(page).locator('.campaign-initiative-checkbox[value="a"]').uncheck();
  await popup(page).locator('.campaign-initiative-checkbox[value="c"]').check();
  await action(page, '.campaign-initiative-save-btn');
  const edited = await snapshot(page);
  expect(edited.combatSession).toEqual({ ...original.combatSession, participants: [
    original.combatSession.participants[1], { participantId: 'token:c', ready: false, delayed: false }
  ] });
  await row(page, 'c').locator('.campaign-initiative-value').fill('35');
  await action(page, '.campaign-initiative-save-order-btn');
  expect((await snapshot(page)).combatSession).toEqual(edited.combatSession);
  await row(page, 'c').locator('.campaign-initiative-select').click();
  expect((await snapshot(page)).initiative.activeParticipantId).toBe('token:c');
  expect((await snapshot(page)).combatSession.round).toBe(3);
  await expect(page.locator('.campaign-map-token[data-token-id="c"]')).toHaveClass(/is-initiative-active/);
  expect(await page.evaluate(() => window.combatUI.saves)).toBe(3);
});

for (const [layer, message] of [
  ['token', 'Не найден токен'], ['page', 'Не найдена страница источника'],
  ['initiative-participant', 'Не найден участник инициативы']
]) {
  test(`missing ${layer} remains visible and local markers work without repair`, async ({ page }) => {
    await setup(page, 'active');
    await page.evaluate(async layer => {
      const h = window.combatUI;
      const { closeMapPopup } = await import('/js/editor/campaignMapPopupController.js');
      const { setPages } = await import('/js/stateActions.js');
      const model = h.store.getModel();
      closeMapPopup();
      if (layer === 'token') {
        model.removeToken('b');
        h.map.querySelector('.campaign-map-token[data-token-id="b"]').remove();
      }
      if (layer === 'page') setPages([{ id: 'page-a', title: 'Альфа' }, { id: 'wrong-b', title: 'Бета' }]);
      if (layer === 'initiative-participant') model.initiative.participants.pop();
      h.store.commitToDOM();
      h.store.clearDirty();
    }, layer);
    const before = await snapshot(page);
    await page.locator('.campaign-initiative-btn').click();
    const target = layer === 'initiative-participant'
      ? popup(page).locator('.campaign-combat-unresolved[data-participant-id="token:b"]') : row(page, 'b');
    await expect(target).toContainText(message);
    if (layer === 'initiative-participant') {
      await expect(row(page, 'b')).toHaveCount(0);
      await expect(target).toContainText('token:b');
      await expect(target.locator('.campaign-initiative-value')).toHaveCount(0);
    }
    expect(await snapshot(page)).toEqual(before);
    expect(await page.evaluate(() => window.combatUI.store.isDirty())).toBe(false);
    expect(await page.evaluate(() => window.combatUI.saves)).toBe(0);
    await target.locator('[data-combat-flag="ready"]').click();
    const after = await snapshot(page);
    expect(after.combatSession.participants[1]).toEqual({ participantId: 'token:b', ready: true, delayed: true });
    expect(after.initiative).toEqual(before.initiative);
    expect(after.tokens).toEqual(before.tokens);
    await expect(target).toContainText(message);
    expect(await page.evaluate(() => window.combatUI.saves)).toBe(1);
  });
}

test('diagnostic resolver failure is readable and opening closing and no-op selection never save', async ({ page }) => {
  await setup(page, 'active');
  const before = await snapshot(page);
  await action(page, '.campaign-initiative-save-order-btn');
  await row(page, 'b').locator('.campaign-initiative-select').click();
  await page.keyboard.press('Escape');
  await expect(popup(page)).toBeHidden();
  await expect(page.locator('.campaign-initiative-btn')).toBeFocused();
  await page.evaluate(() => { window.combatUI.failResolver = true; });
  await page.locator('.campaign-initiative-btn').click();
  await expect(popup(page).locator('.campaign-initiative-message')).toContainText('Не удалось проверить ссылки боя');
  await expect(popup(page).locator('.campaign-combat-warning')).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
  expect(await page.evaluate(() => window.combatUI.saves)).toBe(0);
  expect(await page.evaluate(() => window.combatUI.store.isDirty())).toBe(false);
});

test('rejected progression preserves pending manual input and domain state with zero saves', async ({ page }) => {
  await setup(page, 'active');
  await page.evaluate(() => {
    window.combatUI.store.getModel().combatSession.participants.push({ participantId: 'missing', ready: true, delayed: false });
  });
  const before = await snapshot(page);
  await row(page, 'a').locator('.campaign-initiative-value').fill('99');
  await action(page, '.campaign-initiative-next-btn');
  await expect(popup(page).locator('.campaign-initiative-message')).toContainText('Состав боя не совпадает');
  expect(await snapshot(page)).toEqual(before);
  await expect(row(page, 'a').locator('.campaign-initiative-value')).toHaveValue('99');
  expect(await page.evaluate(() => window.combatUI.saves)).toBe(0);
  expect(await page.evaluate(() => window.combatUI.store.isDirty())).toBe(false);
});

test('pending initiative correction and next use one durable save through the Combat Store', async ({ page }) => {
  await setup(page, 'active');
  await page.evaluate(() => {
    const h = window.combatUI;
    h.nextCalls = 0;
    const next = h.store.nextCombatTurn.bind(h.store);
    h.store.nextCombatTurn = (...args) => { h.nextCalls++; return next(...args); };
    h.store.setInitiative = () => { throw new Error('Active next cannot use initiative-only setter'); };
  });
  await row(page, 'a').locator('.campaign-initiative-value').fill('27');
  await action(page, '.campaign-initiative-next-btn');
  const after = await snapshot(page);
  expect(after.initiative.participants[0].total).toBe(27);
  expect(after.initiative.activeParticipantId).toBe('token:a');
  expect(after.combatSession.round).toBe(4);
  expect(await page.evaluate(() => [window.combatUI.nextCalls, window.combatUI.saves])).toEqual([1, 1]);
  await reload(page);
  expect((await snapshot(page)).initiative).toEqual(after.initiative);
});

test('markers preserve unsaved inputs and lifecycle waits for explicit initiative save', async ({ page }) => {
  await setup(page, 'active');
  await row(page, 'a').locator('.campaign-initiative-value').fill('27');
  await row(page, 'a').locator('[data-combat-flag="delayed"]').click();
  await expect(row(page, 'a').locator('.campaign-initiative-value')).toHaveValue('27');
  expect((await snapshot(page)).initiative.participants[0].total).toBe(18);
  await action(page, '.campaign-combat-pause-btn');
  await expect(popup(page).locator('.campaign-initiative-message')).toContainText('Сначала сохраните изменения инициативы');
  expect((await snapshot(page)).combatSession.status).toBe('active');
  expect(await page.evaluate(() => window.combatUI.saves)).toBe(1);
  await action(page, '.campaign-initiative-save-order-btn');
  await action(page, '.campaign-combat-pause-btn');
  await expect(row(page, 'a').locator('.campaign-initiative-value')).toHaveValue('27');
  await expect(row(page, 'a').locator('.campaign-initiative-value')).toBeDisabled();
  expect(await page.evaluate(() => window.combatUI.saves)).toBe(3);
});

for (const mismatch of ['combat-only', 'initiative-only']) {
  test(`manual correction does not reconcile ${mismatch} membership implicitly`, async ({ page }) => {
    await setup(page, 'active');
    await page.evaluate(mismatch => {
      const model = window.combatUI.store.getModel();
      if (mismatch === 'combat-only') model.combatSession.participants.push({ participantId: 'missing', ready: true, delayed: false });
      else model.combatSession.participants.pop();
    }, mismatch);
    const before = await snapshot(page);
    await row(page, 'a').locator('.campaign-initiative-value').fill('27');
    await action(page, '.campaign-initiative-save-order-btn');
    expect((await snapshot(page)).combatSession).toEqual(before.combatSession);
    expect((await snapshot(page)).initiative.participants[0].total).toBe(27);
    expect(await page.evaluate(() => window.combatUI.saves)).toBe(1);
  });
}

test('empty start rejects and save failure is not reported as durable success', async ({ page }) => {
  await setup(page);
  for (const checkbox of await popup(page).locator('.campaign-initiative-checkbox').all()) await checkbox.uncheck();
  await action(page, '.campaign-initiative-save-btn');
  await action(page, '.campaign-combat-start-btn');
  await expect(popup(page).locator('.campaign-initiative-message')).toContainText('Сначала выберите участников');
  expect((await snapshot(page)).combatSession).toBeNull();
  expect(await page.evaluate(() => window.combatUI.saves)).toBe(0);
  await setup(page, 'active');
  const before = await snapshot(page);
  await page.evaluate(() => { window.combatUI.failSave = true; });
  await action(page, '.campaign-combat-pause-btn');
  await expect(popup(page).locator('.campaign-initiative-message')).toContainText('Не удалось сохранить');
  expect(await page.evaluate(() => window.combatUI.saves)).toBe(0);
  expect(await page.evaluate(() => window.combatUI.store.isDirty())).toBe(true);
  await reload(page);
  expect((await snapshot(page)).combatSession).toEqual(before.combatSession);
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 480, height: 720 }]) {
  test(`keyboard markers and deterministic combat screenshot evidence ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await setup(page, 'active');
    const ready = row(page, 'b').locator('[data-combat-flag="ready"]');
    await ready.focus();
    await page.keyboard.press('Space');
    await expect(ready).toHaveAttribute('aria-pressed', 'true');
    await expect(ready).toBeFocused();
    await expect(row(page, 'b').locator('.campaign-initiative-select')).toHaveAttribute('aria-current', 'true');
    await page.evaluate(() => document.fonts.ready);
    const bounds = await popup(page).boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    expect(await popup(page).evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    const path = testInfo.outputPath(`combat-active-${viewport.width}.png`);
    await popup(page).screenshot({ path, animations: 'disabled' });
    await testInfo.attach('combat-active', { path, contentType: 'image/png' });
    await action(page, '.campaign-combat-pause-btn');
    expect(await popup(page).evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    const pausedPath = testInfo.outputPath(`combat-paused-${viewport.width}.png`);
    await popup(page).screenshot({ path: pausedPath, animations: 'disabled' });
    await testInfo.attach('combat-paused', { path: pausedPath, contentType: 'image/png' });
  });
}

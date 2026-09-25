import { expect, test } from '@playwright/test';

const DEFINITION = {
  id: 'test-card', version: 1, label: 'Inspector fixture', includes: [],
  sections: [{ id: 'main', label: 'Основное', order: 1 }, { id: 'links', label: 'Связи', order: 2 }],
  fields: [
    { key: 'test.name', label: 'Имя', help: 'Имя сущности', datatype: 'string', binding: { owner: 'variables' }, required: true, section: 'main', order: 1 },
    { key: 'test.count', label: 'Количество', datatype: 'integer', binding: { owner: 'variables' }, default: 2, min: 0, section: 'main', order: 2 },
    { key: 'test.flag', label: 'Флаг', datatype: 'boolean', binding: { owner: 'variables' }, section: 'main', order: 3 },
    { key: 'test.double', label: 'Расчёт', datatype: 'integer', binding: { owner: 'variables' }, readonly: true, computed: { resolverId: 'test.double', version: 1, inputs: ['test.count'], allowOverride: true }, section: 'main', order: 4 },
    { key: 'test.ref', label: 'Ссылка', datatype: 'reference', binding: { owner: 'variables' }, targetTypes: ['test-card'], section: 'links', order: 1 },
    { key: 'test.rows', label: 'Строки', datatype: 'array', binding: { owner: 'variables' }, section: 'links', order: 2, items: {
      datatype: 'object', rowIdentityKey: 'test.rowId', properties: [
        { key: 'test.rowId', label: 'Id', datatype: 'string', required: true, readonly: true },
        { key: 'test.rowName', label: 'Название', datatype: 'string' },
        { key: 'test.rowKind', label: 'Тип строки', datatype: 'enum', options: [{ value: 'row-first', label: 'Первый' }, { value: 'row-second', label: 'Второй' }] },
        { key: 'test.rowFlag', label: 'Флаг строки', datatype: 'boolean' },
        { key: 'test.rowCount', label: 'Количество строки', datatype: 'integer', min: 0 },
        { key: 'test.rowAsset', label: 'Asset строки', datatype: 'asset' },
        { key: 'test.rowRef', label: 'Ссылка строки', datatype: 'reference', targetTypes: ['test-card'] }
      ]
    } },
    { key: 'test.details', label: 'Детали', datatype: 'object', binding: { owner: 'variables' }, section: 'links', order: 3, properties: [
      { key: 'test.detailName', label: 'Название детали', datatype: 'string' },
      { key: 'test.detailKind', label: 'Тип детали', datatype: 'enum', options: [{ value: 'detail-first', label: 'Первый detail' }, { value: 'detail-second', label: 'Второй detail' }] },
      { key: 'test.detailFlag', label: 'Флаг детали', datatype: 'boolean' },
      { key: 'test.detailCount', label: 'Количество детали', datatype: 'integer', min: 0 },
      { key: 'test.detailAsset', label: 'Asset детали', datatype: 'asset' },
      { key: 'test.detailRef', label: 'Ссылка детали', datatype: 'reference', targetTypes: ['test-card'] },
      { key: 'test.detailRows', label: 'Строки детали', datatype: 'array', items: { datatype: 'object', rowIdentityKey: 'test.detailRowId', properties: [
        { key: 'test.detailRowId', label: 'Id детали', datatype: 'string', required: true, readonly: true },
        { key: 'test.detailRowName', label: 'Название строки детали', datatype: 'string' },
        { key: 'test.detailRowFlag', label: 'Флаг строки детали', datatype: 'boolean' },
        { key: 'test.detailRowCount', label: 'Количество строки детали', datatype: 'integer', min: 0 }
      ] } }
    ] }
  ]
};

async function setup(page, { legacy = false } = {}) {
  await page.goto('/');
  await page.evaluate(async ({ definition, legacy }) => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { setStorageAdapter, captureStorageWorkspaceContext } = await import('/js/storage/storageAdapter.js');
    const { setPages, setCurrentPage } = await import('/js/stateActions.js');
    const { buildPageRecordContent } = await import('/js/core/pageRecord.js');
    const { CardTypeRegistry } = await import('/js/cardTypes/cardTypeRegistry.js');
    const { serializeCardTypeCatalog, CARD_TYPE_CATALOG_PATH } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { createComputedResolverRegistry } = await import('/js/variables/computedResolvers.js');
    const { captureEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    const { renderUniversalCardInspector } = await import('/js/ui/cardInspector/universalCardInspector.js');
    const adapter = createMemoryStorageAdapter();
    setStorageAdapter(adapter);
    const registry = new CardTypeRegistry({ activatedTypes: [definition] });
    const catalog = { formatVersion: 1, revision: 1, types: [definition], fieldSets: [] };
    await adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
    const variablesJson = legacy ? undefined : {
      formatVersion: 1, schemaVersion: 1,
      schemaDigest: registry.getResolvedType('test-card', 1).digest,
      values: { 'test.name': 'Начальное', 'test.flag': false, 'test.rows': [], 'test.details': { 'test.detailName': 'Не терять', 'test.detailRows': [] } }
    };
    const content = buildPageRecordContent({ id: 'inspector-page', type: 'test-card', template: 'card', tags: ['card'],
      body: '<h1>Inspector</h1><p contenteditable="true" data-persistent-editable="true">Body</p>', variablesJson,
      now: '2026-09-25T00:00:00Z' });
    const targetContent = buildPageRecordContent({ id: 'target-page', type: 'test-card', template: 'card',
      body: '<h1>Цель</h1>', now: '2026-09-25T00:00:00Z' });
    const makePage = (id, value, title) => ({ id, path: `/pages/${id}.md`, name: `${id}.md`, title, type: 'test-card',
      template: 'card', tags: [], aliases: [], relationships: [], parent: null, order: 1, content: value });
    const record = makePage('inspector-page', content, 'Inspector');
    const target = makePage('target-page', targetContent, 'Цель');
    await adapter.writeText(record.path, content);
    await adapter.writeText(target.path, targetContent);
    setPages([record, target]);
    setCurrentPage(record);
    captureEditorPageBase(record, record.content);
    const editor = document.getElementById('editorArea');
    editor.innerHTML = '<p contenteditable="true" data-persistent-editable="true">Body</p>';
    const resolvers = createComputedResolverRegistry([{ id: 'test.double', version: 1, resolve: inputs => inputs['test.count'] * 2 }]);
    window.__inspectorFixture = { adapter, registry, resolvers, record, workspaceContext: captureStorageWorkspaceContext() };
    await renderUniversalCardInspector(record, { registry, resolvers, editor, workspaceContext: window.__inspectorFixture.workspaceContext });
  }, { definition: DEFINITION, legacy });
}

test('Universal Inspector renders schema, commits values and keeps lazy computed/default semantics after reload', async ({ page }) => {
  await setup(page);
  await expect(page.getByRole('heading', { name: 'Inspector' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Основное' })).toBeVisible();
  await expect(page.getByLabel('Количество', { exact: true })).toHaveValue('2');
  await expect(page.getByLabel('Расчёт')).toHaveValue('4');
  await page.getByLabel('Имя *').fill('Сохранённое');
  await page.getByLabel('Имя *').press('Tab');
  await page.getByLabel('Количество', { exact: true }).fill('5');
  await page.getByLabel('Количество', { exact: true }).press('Tab');
  await page.getByRole('button', { name: 'Сохранить поля' }).click();
  await expect(page.locator('.card-inspector__save-status')).toContainText('сохранены');
  const stored = await page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { renderUniversalCardInspector } = await import('/js/ui/cardInspector/universalCardInspector.js');
    const fixture = window.__inspectorFixture;
    await renderUniversalCardInspector(fixture.record, { registry: fixture.registry, resolvers: fixture.resolvers,
      editor: document.getElementById('editorArea'), workspaceContext: fixture.workspaceContext });
    return parsePageRecordContent(fixture.record.content).variablesJson.values;
  });
  expect(stored['test.name']).toBe('Сохранённое');
  expect(stored['test.count']).toBe(5);
  expect(stored['test.double']).toBeUndefined();
  await expect(page.getByLabel('Расчёт')).toHaveValue('10');
  await page.getByLabel('Расчёт').fill('0');
  await page.getByLabel('Расчёт').press('Tab');
  await page.getByRole('button', { name: 'Сохранить поля' }).click();
  const override = await page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    return parsePageRecordContent(window.__inspectorFixture.record.content).variablesJson.overrides['test.double'];
  });
  expect(override).toBe(0);
  await page.getByRole('button', { name: 'Сбросить override' }).click();
  await page.getByRole('button', { name: 'Сохранить поля' }).click();
  await expect(page.getByLabel('Расчёт')).toHaveValue('10');
});

test('reference stores exact page id and repeatable rows retain stable identity and order', async ({ page }) => {
  await setup(page);
  await page.getByLabel('Поиск: Ссылка', { exact: true }).fill('Цель');
  await page.getByLabel('Ссылка', { exact: true }).selectOption('target-page');
  const rows = page.locator('[data-field-key="test.rows"]');
  await rows.getByRole('button', { name: 'Добавить строку' }).click();
  const row = rows.locator('.card-inspector__row').first();
  const rowId = await row.getAttribute('data-row-id');
  await row.getByLabel('Название').fill('Первая');
  await row.getByLabel('Название').press('Tab');
  await page.getByRole('button', { name: 'Сохранить поля' }).click();
  await expect(page.locator('.card-inspector__save-status')).toContainText('сохранены');
  const values = await page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    return parsePageRecordContent(window.__inspectorFixture.record.content).variablesJson.values;
  });
  expect(values['test.ref']).toEqual({ pageId: 'target-page' });
  expect(values['test.rows'][0]['test.rowId']).toBe(rowId);
  expect(values['test.rows'][0]['test.rowName']).toBe('Первая');
});

test('nested and repeatable fields use the same datatype semantics without enum blank corruption', async ({ page }) => {
  await setup(page);
  const rootRows = page.locator('[data-field-key="test.rows"]');
  await rootRows.getByRole('button', { name: 'Добавить строку' }).click();
  await rootRows.getByRole('button', { name: 'Добавить строку' }).click();
  const firstRow = rootRows.locator('.card-inspector__row').filter({ hasText: 'Строка 1' });
  const secondRow = rootRows.locator('.card-inspector__row').filter({ hasText: 'Строка 2' });
  const firstId = await firstRow.getAttribute('data-row-id');
  await firstRow.getByLabel('Название').fill('Первая');
  await firstRow.getByLabel('Название').press('Tab');
  await firstRow.getByLabel('Количество строки').fill('0');
  await firstRow.getByLabel('Количество строки').press('Tab');
  await firstRow.getByLabel('Флаг строки').check();
  await firstRow.getByLabel('Флаг строки').uncheck();
  await firstRow.getByLabel('Тип строки').selectOption('enum:1');
  await firstRow.getByLabel('Asset строки').fill('assets/first.png');
  await firstRow.getByLabel('Asset строки').press('Tab');
  await firstRow.getByLabel('Поиск: Ссылка строки').fill('Цель');
  await firstRow.getByLabel('Ссылка строки', { exact: true }).selectOption('target-page');
  await secondRow.getByLabel('Тип строки').selectOption('enum:0');
  await secondRow.getByLabel('Тип строки').selectOption('');

  const details = page.locator('[data-field-key="test.details"]');
  await details.getByLabel('Количество детали').fill('0');
  await details.getByLabel('Количество детали').press('Tab');
  await details.getByLabel('Флаг детали').check();
  await details.getByLabel('Флаг детали').uncheck();
  await details.getByLabel('Тип детали').selectOption('enum:1');
  await details.getByLabel('Asset детали').fill('assets/detail.png');
  await details.getByLabel('Asset детали').press('Tab');
  await details.getByLabel('Поиск: Ссылка детали').fill('Цель');
  await details.getByLabel('Ссылка детали', { exact: true }).selectOption('target-page');
  const childRows = details.locator('[data-field-key="test.details.test.detailRows"]');
  await childRows.getByRole('button', { name: 'Добавить строку' }).click();
  const child = childRows.locator('.card-inspector__row').first();
  const childId = await child.getAttribute('data-row-id');
  await child.getByLabel('Название строки детали').fill('Вложенная');
  await child.getByLabel('Название строки детали').press('Tab');
  await child.getByLabel('Количество строки детали').fill('0');
  await child.getByLabel('Количество строки детали').press('Tab');
  await child.getByLabel('Флаг строки детали').check();
  await child.getByLabel('Флаг строки детали').uncheck();
  await childRows.getByRole('button', { name: 'Добавить строку' }).click();
  const transientChild = childRows.locator('.card-inspector__row').filter({ hasText: 'Строка 2' });
  const transientId = await transientChild.getAttribute('data-row-id');
  await transientChild.getByRole('button', { name: 'Вверх' }).click();
  await childRows.locator(`[data-row-id="${transientId}"]`).getByRole('button', { name: 'Удалить строку' }).click();

  await page.getByRole('button', { name: 'Сохранить поля' }).click();
  await expect(page.locator('.card-inspector__save-status')).toContainText('сохранены');
  const values = await page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    return parsePageRecordContent(window.__inspectorFixture.record.content).variablesJson.values;
  });
  expect(values['test.rows'][0]).toMatchObject({
    'test.rowId': firstId, 'test.rowName': 'Первая', 'test.rowKind': 'row-second', 'test.rowFlag': false,
    'test.rowCount': 0, 'test.rowAsset': { kind: 'asset', path: 'assets/first.png' }, 'test.rowRef': { pageId: 'target-page' }
  });
  expect(values['test.rows'][1]['test.rowKind']).toBeUndefined();
  expect(values['test.details']).toMatchObject({
    'test.detailName': 'Не терять', 'test.detailKind': 'detail-second', 'test.detailFlag': false,
    'test.detailCount': 0, 'test.detailAsset': { kind: 'asset', path: 'assets/detail.png' }, 'test.detailRef': { pageId: 'target-page' }
  });
  expect(values['test.details']['test.detailRows']).toHaveLength(1);
  expect(values['test.details']['test.detailRows'][0]).toMatchObject({
    'test.detailRowId': childId, 'test.detailRowName': 'Вложенная', 'test.detailRowFlag': false, 'test.detailRowCount': 0
  });
  expect(values['test.rows'][0]['test.rowId']).toBe(firstId);
});

test('legacy is read-only and dirty body blocks variable save without losing Inspector draft', async ({ page }) => {
  await setup(page, { legacy: true });
  await expect(page.getByText(/legacy data source/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Сохранить поля' })).toHaveCount(0);
  await setup(page);
  await page.getByLabel('Имя *').fill('Draft survives');
  await page.getByLabel('Имя *').press('Tab');
  await page.evaluate(() => {
    const editor = document.getElementById('editorArea');
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'x' }));
  });
  await page.getByRole('button', { name: 'Сохранить поля' }).click();
  await expect(page.getByText(/draft Inspector сохранён/i)).toBeVisible();
  await expect(page.getByLabel('Имя *')).toHaveValue('Draft survives');
});

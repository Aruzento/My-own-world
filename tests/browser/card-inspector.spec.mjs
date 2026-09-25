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
        { key: 'test.rowName', label: 'Название', datatype: 'string' }
      ]
    } }
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
      values: { 'test.name': 'Начальное', 'test.flag': false, 'test.rows': [] }
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
  await expect(page.getByLabel('Количество *').or(page.getByLabel('Количество'))).toHaveValue('2');
  await expect(page.getByLabel('Расчёт')).toHaveValue('4');
  await page.getByLabel('Имя *').fill('Сохранённое');
  await page.getByLabel('Имя *').press('Tab');
  await page.getByLabel('Количество').fill('5');
  await page.getByLabel('Количество').press('Tab');
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
  await page.getByLabel('Поиск: Ссылка').fill('Цель');
  await page.getByLabel('Ссылка', { exact: true }).selectOption('target-page');
  await page.getByRole('button', { name: 'Добавить строку' }).click();
  const row = page.locator('.card-inspector__row').first();
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

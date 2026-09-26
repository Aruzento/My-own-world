import { expect, test } from '@playwright/test';

test('Stage 5 game-core schemas render all eight types and edit complex item data generically', async ({ page }) => {
  await page.goto('/');
  const rendered = await page.evaluate(async () => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { setStorageAdapter, captureStorageWorkspaceContext } = await import('/js/storage/storageAdapter.js');
    const { setPages, setCurrentPage } = await import('/js/stateActions.js');
    const { buildPageRecordContent } = await import('/js/core/pageRecord.js');
    const { BUNDLED_CARD_TYPE_DEFINITIONS: types, BUNDLED_FIELD_SET_DEFINITIONS: fieldSets } = await import('/js/cardTypes/definitions/bundledDefinitions.js');
    const { serializeCardTypeCatalog, parseCardTypeCatalog, createCardTypeRegistryFromCatalog, CARD_TYPE_CATALOG_PATH } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { captureEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    const { renderUniversalCardInspector } = await import('/js/ui/cardInspector/universalCardInspector.js');
    const adapter=createMemoryStorageAdapter(); setStorageAdapter(adapter);
    const catalog=parseCardTypeCatalog(serializeCardTypeCatalog({formatVersion:1,revision:1,types,fieldSets}));
    const registry=createCardTypeRegistryFromCatalog(catalog,{bundledTypes:[],bundledFieldSets:[]});
    await adapter.writeText(CARD_TYPE_CATALOG_PATH,serializeCardTypeCatalog(catalog));
    const pages=[];
    for(const definition of types){
      const resolved=registry.getResolvedType(definition.id,1);
      const metadata=definition.id==='item'?{parent:'stage5-player',order:1.5,relationships:[{type:'related',targetId:'stage5-player',targetTitle:'Игрок',label:'Владелец'}]}:{parent:null,order:1,relationships:[]};
      const content=buildPageRecordContent({id:`stage5-${definition.id}`,type:definition.id,template:'card',body:`<h1>${definition.label}</h1>`,variablesJson:{formatVersion:1,schemaVersion:1,schemaDigest:resolved.digest,values:{}},now:'2026-09-25T00:00:00Z',...metadata});
      const record={id:`stage5-${definition.id}`,path:`/pages/stage5-${definition.id}.md`,name:`stage5-${definition.id}.md`,title:definition.label,type:definition.id,template:'card',tags:[],aliases:[],content,...metadata};
      await adapter.writeText(record.path,content); pages.push(record);
    }
    setPages(pages);
    const editor=document.getElementById('editorArea'); editor.innerHTML='<p contenteditable="true" data-persistent-editable="true">Body</p>';
    const labels=[];
    for(const record of pages){setCurrentPage(record);captureEditorPageBase(record,record.content);await renderUniversalCardInspector(record,{registry,editor,workspaceContext:captureStorageWorkspaceContext()});labels.push({id:record.type,fields:document.querySelectorAll('[data-field-key]').length,heading:document.querySelector('.card-inspector__title')?.textContent});}
    const item=pages.find(x=>x.type==='item');setCurrentPage(item);captureEditorPageBase(item,item.content);await renderUniversalCardInspector(item,{registry,editor,workspaceContext:captureStorageWorkspaceContext()});
    window.__stage5={item,registry,editor,workspaceContext:captureStorageWorkspaceContext()}; return labels;
  });
  expect(rendered.map(x=>x.id)).toEqual(['player','character','item','skill','spell','effect','race','class']);
  expect(rendered.every(x=>x.fields>0)).toBe(true);
  await expect(page.locator('[data-field-key="item.category"]')).toBeVisible();
  await expect(page.getByLabel('Порядок',{exact:true})).toHaveValue('1.5');
  await expect(page.getByLabel('Родитель',{exact:true})).toHaveValue('stage5-player');
  await expect(page.getByLabel('Связи',{exact:true})).toHaveValue(/core\.relationship\.targetId/);
  await expect(page.locator('[data-field-key="page.order"] input')).not.toHaveAttribute('aria-invalid','true');
  await expect(page.locator('[data-field-key="page.relationships"] textarea')).not.toHaveAttribute('aria-invalid','true');
  await page.getByLabel('Количество',{exact:true}).fill('0'); await page.getByLabel('Количество',{exact:true}).press('Tab');
  await page.getByLabel('Категория',{exact:true}).selectOption({label:'Оружие'});
  await page.getByLabel('Является объектом').click();
  const damage=page.locator('[data-field-key$="item.weapon.damage"]'); await damage.getByRole('button',{name:'Добавить строку'}).click();
  const rowId=await damage.locator('.card-inspector__row').first().getAttribute('data-row-id');
  await damage.getByLabel('Формула').fill('1d6'); await damage.getByLabel('Формула').press('Tab');
  await page.getByRole('button',{name:'Сохранить поля'}).click();
  await expect(page.locator('.card-inspector__save-status')).toContainText('сохранены');
  const stored=await page.evaluate(async()=>{
    const{parsePageRecordContent}=await import('/js/core/pageRecord.js');
    const{renderUniversalCardInspector}=await import('/js/ui/cardInspector/universalCardInspector.js');
    const state=window.__stage5;
    await renderUniversalCardInspector(state.item,{registry:state.registry,editor:state.editor,workspaceContext:state.workspaceContext});
    return parsePageRecordContent(state.item.content);
  });
  expect(stored.variablesJson.values['item.quantity']).toBe(0); expect(stored.variablesJson.values['item.category']).toBe('weapon'); expect(stored.variablesJson.values['item.isObject']).toBe(true);
  expect(stored.variablesJson.values['item.weapon']['item.weapon.damage'][0]['item.weapon.damage.rowId']).toBe(rowId);
  expect(stored.order).toBe(1.5); expect(stored.parent).toBe('stage5-player');
  expect(stored.relationships).toEqual([{type:'related',targetId:'stage5-player',targetTitle:'Игрок',label:'Владелец'}]);
});

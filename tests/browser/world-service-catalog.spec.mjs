import { expect, test } from '@playwright/test';

test('Stage 6 schemas render seven types and persist complex country data generically', async ({ page }) => {
  await page.goto('/');
  const rendered = await page.evaluate(async () => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { setStorageAdapter, captureStorageWorkspaceContext } = await import('/js/storage/storageAdapter.js');
    const { setPages, setCurrentPage } = await import('/js/stateActions.js');
    const { buildPageRecordContent } = await import('/js/core/pageRecord.js');
    const { BUNDLED_CARD_TYPE_DEFINITIONS: types, BUNDLED_FIELD_SET_DEFINITIONS: fieldSets } = await import('/js/cardTypes/definitions/bundledDefinitions.js');
    const { WORLD_SERVICE_CARD_TYPE_DEFINITIONS: worldTypes } = await import('/js/cardTypes/definitions/worldServiceCatalog.js');
    const { serializeCardTypeCatalog, parseCardTypeCatalog, createCardTypeRegistryFromCatalog, CARD_TYPE_CATALOG_PATH } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { captureEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    const { renderUniversalCardInspector } = await import('/js/ui/cardInspector/universalCardInspector.js');
    const adapter=createMemoryStorageAdapter(); setStorageAdapter(adapter);
    const catalog=parseCardTypeCatalog(serializeCardTypeCatalog({formatVersion:1,revision:1,types,fieldSets}));
    const registry=createCardTypeRegistryFromCatalog(catalog,{bundledTypes:[],bundledFieldSets:[]});
    await adapter.writeText(CARD_TYPE_CATALOG_PATH,serializeCardTypeCatalog(catalog));
    const pages=[];
    for(const definition of worldTypes){
      const resolved=registry.getResolvedType(definition.id,1);
      const content=buildPageRecordContent({id:`stage6-${definition.id}`,type:definition.id,template:'card',body:`<h1>${definition.label}</h1>`,variablesJson:{formatVersion:1,schemaVersion:1,schemaDigest:resolved.digest,values:{}},now:'2026-09-26T00:00:00Z'});
      const record={id:`stage6-${definition.id}`,path:`/pages/stage6-${definition.id}.md`,name:`stage6-${definition.id}.md`,title:definition.label,type:definition.id,template:'card',tags:[],aliases:[],content};
      await adapter.writeText(record.path,content); pages.push(record);
    }
    const map={id:'stage6-map',path:'/pages/stage6-map.md',name:'stage6-map.md',title:'Карта столицы',type:'campaignMap',template:'campaignMap',tags:[],aliases:[],content:'---\nid: stage6-map\ntitle: Карта столицы\ntype: campaignMap\ntemplate: campaignMap\n---\n<div class="campaign-map-document"></div>'};
    const region=pages.find(x=>x.type==='region'); pages.push(map);
    setPages(pages);
    const editor=document.getElementById('editorArea'); editor.innerHTML='<p contenteditable="true" data-persistent-editable="true">Body</p>';
    const labels=[];
    for(const record of pages.filter(x=>x.template==='card')){setCurrentPage(record);captureEditorPageBase(record,record.content);await renderUniversalCardInspector(record,{registry,editor,workspaceContext:captureStorageWorkspaceContext()});labels.push({id:record.type,fields:document.querySelectorAll('[data-field-key]').length,keys:[...document.querySelectorAll('[data-field-key]')].map(node=>node.dataset.fieldKey)});}
    const country=pages.find(x=>x.type==='country');setCurrentPage(country);captureEditorPageBase(country,country.content);await renderUniversalCardInspector(country,{registry,editor,workspaceContext:captureStorageWorkspaceContext()});
    window.__stage6={country,registry,editor,workspaceContext:captureStorageWorkspaceContext(),regionId:region.id}; return labels;
  });
  expect(rendered.map(x=>x.id)).toEqual(['location','region','country','organization','lore','folder','project']);
  expect(rendered.every(x=>x.fields>0)).toBe(true);
  const folder=rendered.find(x=>x.id==='folder');
  const project=rendered.find(x=>x.id==='project');
  expect(folder.keys).toEqual(expect.arrayContaining(['page.icon','page.archived']));
  expect(folder.keys).not.toEqual(expect.arrayContaining(['folder.icon','folder.archived']));
  expect(project.keys).toEqual(expect.arrayContaining(['page.tags','page.archived']));
  expect(project.keys).not.toEqual(expect.arrayContaining(['project.tags','project.archived']));

  await page.getByLabel('Форма государства',{exact:true}).selectOption({label:'Федерация'});
  await page.getByLabel('Население',{exact:true}).fill('125000');
  await page.getByLabel('Население',{exact:true}).press('Tab');
  await page.locator('[data-field-key="country.mapScene"] select').selectOption('stage6-map');
  const regions=page.locator('[data-field-key="country.regions"] textarea');
  await regions.fill('[{"pageId":"stage6-region"}]'); await regions.press('Tab');
  const economy=page.locator('[data-field-key="country.economy"]');
  await economy.getByLabel('Уровень',{exact:true}).fill('4'); await economy.getByLabel('Уровень',{exact:true}).press('Tab');
  const laws=page.locator('[data-field-key="country.laws"]');
  await laws.getByRole('button',{name:'Добавить строку'}).click();
  const rowId=await laws.locator('.card-inspector__row').getAttribute('data-row-id');
  await laws.getByLabel('Вид',{exact:true}).selectOption({label:'Текст'});
  await laws.getByLabel('Текст',{exact:true}).fill('Закон гостеприимства'); await laws.getByLabel('Текст',{exact:true}).press('Tab');
  await page.getByRole('button',{name:'Сохранить поля'}).click();
  await expect(page.locator('.card-inspector__save-status')).toContainText('сохранены');

  const stored=await page.evaluate(async()=>{
    const{parsePageRecordContent}=await import('/js/core/pageRecord.js');
    const{renderUniversalCardInspector}=await import('/js/ui/cardInspector/universalCardInspector.js');
    const state=window.__stage6;
    await renderUniversalCardInspector(state.country,{registry:state.registry,editor:state.editor,workspaceContext:state.workspaceContext});
    return parsePageRecordContent(state.country.content).variablesJson.values;
  });
  expect(stored['country.form']).toBe('federation');
  expect(stored['country.population']).toBe(125000);
  expect(stored['country.mapScene']).toEqual({pageId:'stage6-map'});
  expect(stored['country.regions']).toEqual([{pageId:'stage6-region'}]);
  expect(stored['country.economy']['country.economy.level']).toBe(4);
  expect(stored['country.laws'][0]['country.laws.rowId']).toBe(rowId);
  expect(stored['country.laws'][0]['country.laws.text']).toBe('Закон гостеприимства');
});

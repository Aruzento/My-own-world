import {expect,test} from '@playwright/test';

test('canonical type selector has keyboard/ARIA preview-confirm and preserves user tags',async({page})=>{
 await page.setViewportSize({width:760,height:520});await page.goto('/');
 await page.evaluate(async()=>{
  const {installStructuredActor}=await import('/tests/fixtures/structuredActorFixture.mjs');
  const {createCardShellTemplate}=await import('/js/templates/cardShell.js');
  const {openPage}=await import('/js/editor/editor.js');
  const f=await installStructuredActor({id:'type-aria',body:createCardShellTemplate().content});window.__typeAria=f;await openPage(f.actor);
 });
 const combo=page.getByRole('combobox',{name:/Тип/});
 await expect(combo).toContainText('Персонаж');await combo.focus();await page.keyboard.press('ArrowDown');
 await expect(combo).toHaveAttribute('aria-expanded','true');const list=page.getByRole('listbox',{name:/Тип/});
 await expect(list.getByRole('option')).toHaveCount(15);
 const ids=await list.getByRole('option').evaluateAll(options=>options.map(option=>option.dataset.value));
 expect(ids).not.toEqual(expect.arrayContaining(['creature','magic','object','note']));
 await page.keyboard.press('Escape');await expect(combo).toHaveAttribute('aria-expanded','false');await expect(combo).toBeFocused();
 await page.keyboard.press('ArrowDown');await page.keyboard.press('Home');await page.keyboard.press('Enter');
 await expect(page.getByRole('button',{name:'Изменить тип',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.__typeAria.actor.type)).toBe('character');
 await page.getByRole('button',{name:'Изменить тип',exact:true}).click();
 await expect(combo).toContainText('Игрок');
 const result=await page.evaluate(async()=>{
  const {parsePageRecordContent}=await import('/js/core/pageRecord.js');const f=window.__typeAria;
  return parsePageRecordContent(await f.adapter.readText(f.actor.path));
 });expect(result.type).toBe('player');expect(result.tags).toEqual(['card','user-tag']);expect(result.variablesJson.inactive.some(entry=>entry.path?.includes('dnd.level'))).toBe(true);
});

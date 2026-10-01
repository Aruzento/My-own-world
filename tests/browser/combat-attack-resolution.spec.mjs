import {expect,test} from '@playwright/test';

test('single-target structured resolution keeps hit equality miss temp and no-op side-effect free',async({page})=>{
 await page.goto('/');
 const results=await page.evaluate(async()=>{
  const {createStructuredCombatActionWorld,attackRequest}=await import('/tests/fixtures/combatActionFixtures.mjs');
  const {resolveSingleTargetAttack}=await import('/js/combat/combatAttackResolution.js');
  const {createCombatCharacterContext}=await import('/js/combat/combatCharacterHealth.js');
  const {captureStorageWorkspaceContext}=await import('/js/storage/storageAdapter.js');
  const result=[];
  for(const [name,dice,temp,current] of [['hit',[10,3],0,10],['equality',[8,3],0,10],['miss',[3],0,10],['temp',[10,3],2,10],['no-op',[10,3],0,0]]){
   const w=await createStructuredCombatActionWorld({dice,temp,current,max:20});
   const context=await createCombatCharacterContext({pages:w.pages,pageIds:[w.actor.id,w.target.id],workspaceContext:captureStorageWorkspaceContext()});
   const before=w.target.content,map=JSON.stringify(w.mapModel.toJSON());
   const resolution=await resolveSingleTargetAttack(attackRequest(),{mapPageId:w.map.id,mapModel:w.mapModel,pages:w.pages,resolvePage:id=>w.pages.find(page=>page.id===id),randomInt:w.rng.randomInt,combatCharacterContext:context});
   result.push({name,resolution,rng:w.rng.calls,writes:w.effects.writes,appends:w.effects.appends,unchanged:before===w.target.content&&map===JSON.stringify(w.mapModel.toJSON()),frozen:Object.isFrozen(resolution)});
  }return result;
 });
 for(const result of results){expect(result.writes).toBe(0);expect(result.appends).toBe(0);expect(result.unchanged).toBe(true);expect(result.frozen).toBe(true);expect(result.resolution.outcome).toBe(result.name==='miss'?'miss':'hit');expect(result.rng.length).toBe(result.name==='miss'?1:2);}
});

test('structured resolution rejects broken identity, unavailable source and invalid defense before RNG',async({page})=>{
 await page.goto('/');
 const results=await page.evaluate(async()=>{
  const {createStructuredCombatActionWorld,attackRequest}=await import('/tests/fixtures/combatActionFixtures.mjs');
  const {resolveSingleTargetAttack}=await import('/js/combat/combatAttackResolution.js');
  const {createCombatCharacterContext}=await import('/js/combat/combatCharacterHealth.js');
  const {captureStorageWorkspaceContext}=await import('/js/storage/storageAdapter.js');
  const {parsePageRecordContent,updatePageRecordContent}=await import('/js/core/pageRecord.js');
  const result=[];
  for(const name of ['page-missing','token-mismatch','same-page','legacy-source','future-source','missing-defense','invalid-defense','map-mismatch','session-mismatch','stale-actor']){
   const w=await createStructuredCombatActionWorld();const request=attackRequest();
   if(name==='page-missing')w.pages.splice(w.pages.indexOf(w.target),1);
   if(name==='token-mismatch')w.mapModel.tokens[1].pageId='other';
   if(name==='same-page'){w.mapModel.tokens[1].pageId=w.actor.id;w.mapModel.initiative.participants[1].pageId=w.actor.id;}
   if(name==='legacy-source')w.target.content='<p>Legacy source is migration-required</p>';
   if(['future-source','missing-defense','invalid-defense'].includes(name)){
    const envelope=parsePageRecordContent(w.target.content).variablesJson;
    if(name==='future-source')envelope.formatVersion=99;
    if(name==='missing-defense')delete envelope.values['dnd.armorClass'];
    if(name==='invalid-defense')envelope.values['dnd.armorClass']['dnd.armorClass.value']='invalid';
    w.target.content=name==='future-source' ? w.target.content.replace(/^variablesJson:.*$/m, 'variablesJson: '+JSON.stringify(envelope)) : updatePageRecordContent(w.target.content,{variablesJson:envelope});
   }
   if(name==='map-mismatch')request.mapPageId='other';
   if(name==='session-mismatch')request.sessionId='other';
   if(name==='stale-actor')w.mapModel.initiative.activeParticipantId='token:target';
   let blocked=false;
   try{const context=await createCombatCharacterContext({pages:w.pages,pageIds:[w.actor.id,w.target.id],workspaceContext:captureStorageWorkspaceContext()});await resolveSingleTargetAttack(request,{mapPageId:w.map.id,mapModel:w.mapModel,pages:w.pages,resolvePage:id=>w.pages.find(page=>page.id===id),randomInt:w.rng.randomInt,combatCharacterContext:context});}catch{blocked=true;}
   result.push({name,blocked,rng:w.rng.calls,writes:w.effects.writes,appends:w.effects.appends});
  }return result;
 });
 for(const result of results){expect(result.blocked,result.name).toBe(true);expect(result.rng,result.name).toHaveLength(0);expect(result.writes).toBe(0);expect(result.appends).toBe(0);}
});

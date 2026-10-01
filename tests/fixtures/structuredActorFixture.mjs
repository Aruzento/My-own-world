import { buildPageRecordContent, createRuntimePageFromContent } from '../../js/core/pageRecord.js';
import { createEditConflictFixture } from './editConflictFixtures.mjs';
import { catalog, registry } from './inventoryAdoptionFixtures.mjs';
import { CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog } from '../../js/storage/cardTypeCatalogStorage.js';
import { encodeOwnEffects } from '../../js/character/ownEffectsDefinition.js';
import { createSerializableEffectsData } from '../../js/character/effectsModel.js';
import { setPageRepositoryRegistry } from '../../js/repository/pageRepository.js';
import { setPages } from '../../js/stateActions.js';

export function structuredCharacterContent(id, values = {}, effects = {}, body = '<h1>Character fixture</h1>') {
 const abilities = ['strength','dexterity','constitution','intelligence','wisdom','charisma'];
 const scores = ['str','dex','con','int','wis','cha'];
 const envelope = { formatVersion:1, schemaVersion:1, schemaDigest:registry.getResolvedType('character',1).digest,
  values:{ 'dnd.level':values.level ?? 5, 'character.abilities':Object.fromEntries(abilities.map((name,index)=>['character.abilities.'+name, values[scores[index]] ?? 10])),
   'dnd.health':{'dnd.hpCurrent':values.hpCurrent ?? 10,'dnd.hpMax':values.hpMax ?? 20,'dnd.hpTemporary':values.hpTemp ?? 0},
   'dnd.items':[], 'dnd.equippedItems':[], 'dnd.ownEffects':encodeOwnEffects(createSerializableEffectsData(effects)),
   ...(values.armorClass!==undefined ? {'dnd.armorClass':{'dnd.armorClass.value':values.armorClass}} : {}),
   ...(values.speed!==undefined ? {'dnd.movement':[{'dnd.movement.rowId':'walk','dnd.movement.type':'walk','dnd.movement.speed':values.speed,'dnd.movement.units':'feet'}]} : {}) },
  overrides:{},extensions:{revision:1,fields:[{id:'dnd.own-effects',version:1}]}};
 if(values.skills){envelope.extensions.fields.push({id:'dnd.character-gameplay',version:1});envelope.values['character.standardSkills']=values.skills;}
 return buildPageRecordContent({id,type:'character',template:'card',tags:['card','user-tag'],body,variablesJson:envelope});
}
export async function installStructuredActor({id='actor',values={},effects={},body}={}) {
 const f=await createEditConflictFixture(); await f.adapter.removeFile(f.page.path);
 const actor=createRuntimePageFromContent({content:structuredCharacterContent(id,values,effects,body),path:'pages/'+id+'.md',name:id+'.md'});
 await f.adapter.writeText(actor.path,actor.content);await f.adapter.writeText(CARD_TYPE_CATALOG_PATH,serializeCardTypeCatalog(catalog));
 setPageRepositoryRegistry(registry);setPages([actor]);return {...f,actor,registry};
}

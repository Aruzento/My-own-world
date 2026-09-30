import { deepFreeze, createDefinitionIdentity } from '../cardTypes/definitionIdentity.js';
import { DND_STANDARD_SKILLS } from './dndCheckContract.js';

export const CHARACTER_GAMEPLAY_ID = 'dnd.character-gameplay';
export const CHARACTER_SKILLS_KEY = 'character.standardSkills';
export const CHARACTER_DEATH_KEY = 'character.deathSaves';
const member = (key, datatype, extra = {}) => ({ key, label: key.split('.').at(-1), datatype, ...extra });
const object = (key, properties, extra = {}) => member(key, 'object', { properties, ...extra });
export const CHARACTER_GAMEPLAY_FIELD_SET = deepFreeze({
  id: CHARACTER_GAMEPLAY_ID, version: 1, label: 'Игровые навыки и спасброски от смерти персонажа', includes: [], sections: [],
  fields: [
    object(CHARACTER_SKILLS_KEY, DND_STANDARD_SKILLS.map(skill => object(`${CHARACTER_SKILLS_KEY}.${skill.id}`, [
      member(`${CHARACTER_SKILLS_KEY}.${skill.id}.proficient`, 'boolean'),
      member(`${CHARACTER_SKILLS_KEY}.${skill.id}.expertise`, 'boolean'),
      member(`${CHARACTER_SKILLS_KEY}.${skill.id}.bonus`, 'number')
    ])), { binding: { owner: 'variables' } }),
    object(CHARACTER_DEATH_KEY, ['successes', 'failures'].map(key => member(`${CHARACTER_DEATH_KEY}.${key}`, 'integer', { required: true, min: 0, max: 3 })), { binding: { owner: 'variables' } })
  ], metadata: { semanticOwner: 'character-standard-gameplay', representationVersion: 1 }
});
export const CHARACTER_GAMEPLAY_IDENTITY = createDefinitionIdentity('fieldSet', CHARACTER_GAMEPLAY_FIELD_SET);

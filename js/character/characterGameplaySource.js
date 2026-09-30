import { CHARACTER_GAMEPLAY_ID, CHARACTER_GAMEPLAY_IDENTITY, CHARACTER_SKILLS_KEY, CHARACTER_DEATH_KEY } from './characterGameplayDefinition.js';
import { canonicalJSON } from '../core/pageVariablesCodec.js';
import { getValue } from '../variables/entityVariables.js';
import { createDefinitionIdentity } from '../cardTypes/definitionIdentity.js';
// Optional domains are never inferred from generic content or preserved HTML.
export function readCharacterGameplay(snapshot, context) {
  const declared = snapshot.extensions?.fields?.filter(entry => entry.id === CHARACTER_GAMEPLAY_ID) || [];
  const stored = [CHARACTER_SKILLS_KEY, CHARACTER_DEATH_KEY].filter(key => Object.hasOwn(snapshot.values, key));
  const unavailable = reason => ({ status: 'unavailable', reason });
  if (!declared.length && !stored.length) return { status: 'absent' };
  if (snapshot.type !== 'character' || snapshot.mode !== 'structured' || declared.length !== 1 || declared[0].version !== 1 || !stored.length) return unavailable('character-gameplay-partial-or-unsupported');
  try {
    if (canonicalJSON(createDefinitionIdentity('fieldSet', context.registry.getFieldSetDefinition(CHARACTER_GAMEPLAY_ID, 1))) !== canonicalJSON(CHARACTER_GAMEPLAY_IDENTITY)) return unavailable('character-gameplay-definition-incompatible');
    const skills = getValue(snapshot, CHARACTER_SKILLS_KEY, 'stored', context);
    const deathSaves = getValue(snapshot, CHARACTER_DEATH_KEY, 'stored', context);
    if ([skills, deathSaves].some(value => !['value', 'absent'].includes(value.status))) return unavailable('character-gameplay-invalid');
    return { status: 'ready', skills, deathSaves };
  } catch { return unavailable('character-gameplay-definition-unavailable'); }
}

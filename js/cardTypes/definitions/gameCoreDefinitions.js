import { deepFreeze } from '../definitionIdentity.js';
import { PLAYER_DEFINITION, CHARACTER_DEFINITION } from './gameCoreActors.js';
import { ITEM_DEFINITION } from './gameCoreItem.js';
import { SKILL_DEFINITION, SPELL_DEFINITION, EFFECT_DEFINITION } from './gameCoreRules.js';
import { RACE_DEFINITION, CLASS_DEFINITION } from './gameCoreAdvancement.js';
import { GAME_CORE_FIELD_SET_DEFINITIONS } from './gameCoreShared.js';

export const GAME_CORE_CARD_TYPE_DEFINITIONS = deepFreeze([
  PLAYER_DEFINITION, CHARACTER_DEFINITION, ITEM_DEFINITION, SKILL_DEFINITION,
  SPELL_DEFINITION, EFFECT_DEFINITION, RACE_DEFINITION, CLASS_DEFINITION
]);
export { GAME_CORE_FIELD_SET_DEFINITIONS };

import {
  createEffectsModel,
  createLinkedCharacterEffect
} from './effectsModel.js';


const KNOWN_INTEGRATION_SOURCES = new Set([
  'rule',
  'world-package',
  'external'
]);


// CharacterIntegrationApi - маленький contract-layer для будущих систем.
// Rule Tree, World Packages и другие подсистемы не должны менять CharacterModel
// напрямую: они передают сюда свои эффекты, а модель объединяет их с карточкой.
export function createCharacterIntegrations(
  {
    effects = [],
    ruleEffects = [],
    worldPackageEffects = []
  } = {}
) {

  const normalizedEffects =
    [
      ...normalizeEffectsList(
        effects,
        'external'
      ),
      ...normalizeEffectsList(
        ruleEffects,
        'rule'
      ),
      ...normalizeEffectsList(
        worldPackageEffects,
        'world-package'
      )
    ];

  return {
    kind: 'CharacterIntegrations',
    version: 1,
    effects:
      normalizedEffects,
    sources:
      [...new Set(
        normalizedEffects
          .map(model =>
            model.source
          )
          .filter(source =>
            source !== 'empty'
          )
      )]
  };
}


export function createRuleTreeCharacterEffect(
  {
    ruleId = '',
    title = '',
    note = '',
    duration = '',
    modifiers = {},
    flags = {}
  } = {}
) {

  return createEffectsModel({
    effects: [
      createLinkedCharacterEffect(
        {
          id:
            createIntegrationEffectId(
              'rule',
              ruleId,
              title
            ),
          title:
            title || ruleId || 'Правило',
          note,
          duration,
          modifiers,
          flags
        },
        {
          sourceType:
            'rule',
          ruleId
        }
      )
    ],
    source:
      'rule'
  });
}


export function createWorldPackageCharacterEffect(
  {
    sourcePackageId = '',
    ruleId = '',
    title = '',
    note = '',
    duration = '',
    modifiers = {},
    flags = {}
  } = {}
) {

  return createEffectsModel({
    effects: [
      createLinkedCharacterEffect(
        {
          id:
            createIntegrationEffectId(
              'world-package',
              sourcePackageId,
              title || ruleId
            ),
          title:
            title ||
            ruleId ||
            sourcePackageId ||
            'World Package',
          note,
          duration,
          modifiers,
          flags
        },
        {
          sourceType:
            'world-package',
          sourcePackageId,
          ruleId
        }
      )
    ],
    source:
      'world-package'
  });
}


export function getCharacterIntegrationEffects(
  integrations
) {

  return createCharacterIntegrations(
    integrations
  ).effects;
}


function normalizeEffectsList(
  effects,
  source
) {

  return (Array.isArray(effects) ? effects : [effects])
    .filter(Boolean)
    .map(effect =>
      createEffectsModel({
        ...effect,
        source:
          normalizeIntegrationSource(
            effect.source ||
            source
          )
      })
    )
    .filter(model =>
      model.conditions.length ||
      model.effects.length
    );
}


function normalizeIntegrationSource(
  source
) {

  const normalized =
    String(source || '')
      .trim()
      .toLowerCase();

  return KNOWN_INTEGRATION_SOURCES.has(
    normalized
  )
    ? normalized
    : 'external';
}


function createIntegrationEffectId(
  source,
  id,
  title
) {

  return [
    source,
    id,
    title
  ]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/giu, '-')
    .replace(/^-+|-+$/g, '');
}

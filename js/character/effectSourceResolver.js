import {
  createEffectsModel,
  createLinkedCharacterEffect,
  createSerializableEffectsData,
  readEffectsModelFromHTML
} from './effectsModel.js';

import {
  getPropertyValue,
  readPropertiesModelsFromHTML
} from '../properties/propertiesModel.js';


export const EFFECT_SOURCE_TYPES_WITH_PAGES = [
  'item',
  'spell',
  'skill'
];

const SOURCE_TYPE_TO_CARD_TYPE = {
  item: 'item',
  spell: 'magic',
  skill: 'skill'
};

const SOURCE_TYPE_LABELS = {
  item: 'Предмет',
  spell: 'Заклинание',
  skill: 'Навык',
  rule: 'Правило',
  'world-package': 'World Package'
};


// Resolver держит связь между карточкой-источником и EffectsModel.
// Важно: он не парсит произвольный русский текст как формулу, а берет явный
// блок эффектов источника или создает безопасный информационный эффект.
export function getEffectSourceCandidates(
  {
    pages = [],
    sourceType = 'item',
    currentPageId = ''
  } = {}
) {

  const cardType =
    SOURCE_TYPE_TO_CARD_TYPE[sourceType];

  if (!cardType) return [];

  return pages
    .filter(page =>
      page?.id &&
      page.id !== currentPageId &&
      page.type === cardType
    )
    .map(page =>
      createSourceCandidate(
        page,
        sourceType
      )
    )
    .sort((left, right) =>
      left.title.localeCompare(
        right.title,
        'ru'
      )
    );
}


export function createEffectFromSourcePage(
  page,
  {
    sourceType = 'item',
    fallbackTitle = '',
    includeInfoEffect = true
  } = {}
) {

  if (!page?.id) return null;

  const sourceEffects =
    readEffectsModelFromHTML(
      page.content
    );

  if (sourceEffects.effects.length) {

    return createEffectsModel({
      effects:
        sourceEffects.effects.map(effect =>
          createLinkedCharacterEffect(
            {
              ...effect,
              id:
                createLinkedEffectId(
                  page.id,
                  effect.id
                ),
              title:
                `${getPageTitle(page)}: ${effect.title}`
            },
            {
              sourceType,
              sourcePageId:
                page.id
            }
          )
        ),
      source:
        sourceType
    });
  }

  if (!includeInfoEffect) return null;

  const note =
    readEffectNoteFromProperties(
      page
    );

  if (!note) return null;

  return createEffectsModel({
    effects: [
      createLinkedCharacterEffect(
        {
          id:
            createLinkedEffectId(
              page.id,
              'info'
            ),
          title:
            fallbackTitle ||
            getPageTitle(
              page
            ),
          note
        },
        {
          sourceType,
          sourcePageId:
            page.id
        }
      )
    ],
    source:
      sourceType
  });
}


export function createEffectsFromInventory(
  {
    inventory,
    pages = []
  } = {}
) {

  const effects =
    [];

  const pageById =
    new Map(
      pages.map(page => [
        page?.id,
        page
      ])
    );

  (inventory?.items || [])
    .forEach(item => {

      const page =
        pageById.get(
          item.pageId
        );

      const sourceEffects =
        createEffectFromSourcePage(
          page,
          {
            sourceType: 'item',
            fallbackTitle:
              item.title,
            includeInfoEffect:
              false
          }
        );

      if (!sourceEffects) return;

      effects.push(
        ...sourceEffects.effects
      );
    });

  return createEffectsModel({
    effects,
    source:
      effects.length
        ? 'item'
        : 'empty'
  });
}


export function mergeEffectsModels(
  ...models
) {

  const conditions = [];
  const effects = [];

  models
    .map(model =>
      createEffectsModel(
        model
      )
    )
    .forEach(model => {

      conditions.push(
        ...model.conditions
      );

      effects.push(
        ...model.effects
      );
    });

  return createEffectsModel({
    conditions,
    effects,
    source:
      conditions.length ||
      effects.length
        ? 'merged'
        : 'empty'
  });
}


export function getEffectSourceLabel(
  sourceType
) {

  return SOURCE_TYPE_LABELS[sourceType] || 'Источник';
}


export function serializeSourceEffectsForStorage(
  effectsModel
) {

  return createSerializableEffectsData(
    effectsModel
  );
}


function createSourceCandidate(
  page,
  sourceType
) {

  const sourceEffects =
    readEffectsModelFromHTML(
      page.content
    );

  const note =
    readEffectNoteFromProperties(
      page
    );

  return {
    id:
      page.id,
    title:
      getPageTitle(
        page
      ),
    sourceType,
    hasEffects:
      sourceEffects.effects.length > 0,
    note
  };
}


function readEffectNoteFromProperties(
  page
) {

  const model =
    readPropertiesModelsFromHTML(
      page?.content
    )
      .find(item =>
        item.cardType === page?.type
      );

  return getPropertyValue(
    model,
    'effect',
    ''
  );
}


function getPageTitle(
  page
) {

  return String(
    page?.title ||
    page?.name ||
    'Источник'
  ).trim();
}


function createLinkedEffectId(
  pageId,
  effectId
) {

  return `source-${pageId}-${effectId}`;
}

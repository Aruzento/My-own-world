import {
  createEffectsModel,
  createLinkedCharacterEffect,
  readEffectsModelFromHTML
} from '../character/effectsModel.js';

import {
  createCharacterIntegrations
} from '../character/characterIntegrationApi.js';

import {
  readRuleTreeDataFromHTML
} from '../ruleTree/ruleTreeReadData.js';


const RULE_TAGS = new Set([
  'rule',
  'rules',
  'правило',
  'правила'
]);


// RuleTreeProvider - foundation настоящего Rule Tree без UI.
// Сейчас он читает страницы-правила из workspace и отдает их эффекты
// в CharacterModel. Позже поверх него появится дерево, выбор правил и права.
export function createRuleTreeModel(
  {
    rules = [],
    activeRuleIds = []
  } = {}
) {

  const normalizedRules =
    [
      ...new Map(
        rules
          .map(normalizeRule)
          .filter(Boolean)
          .map(rule => [
            rule.id,
            rule
          ])
      ).values()
    ];

  return {
    kind: 'RuleTreeModel',
    version: 1,
    rules:
      normalizedRules,
    activeRuleIds:
      normalizeActiveRuleIds(
        activeRuleIds,
        normalizedRules
      ),
    byId:
      Object.fromEntries(
        normalizedRules.map(rule => [
          rule.id,
          rule
        ])
      )
  };
}


export function createRuleTreeModelFromPages(
  pages = []
) {

  const ruleTreeData =
    getRuleTreeEntityData(
      pages
    );

  return createRuleTreeModel({
    activeRuleIds:
      ruleTreeData.flatMap(data =>
        data.activeRuleIds
      ),
    rules:
      [
        ...getLegacyRulePageImports(
          pages
        ),
        ...ruleTreeData.flatMap(data =>
          data.rules
        )
      ]
  });
}


export function createRuleTreeCharacterIntegrations(
  {
    pages = [],
    selectedRuleIds = []
  } = {}
) {

  const model =
    createRuleTreeModelFromPages(
      pages
    );

  const ids =
    new Set(
      [
        ...model.activeRuleIds,
        ...selectedRuleIds
      ]
        .map(id =>
          String(id || '').trim()
        )
        .filter(Boolean)
    );

  const ruleEffects =
    model.rules
      .filter(rule =>
        ids.has(
          rule.id
        )
      )
      .map(rule =>
        createRuleEffectsModel(
          rule
        )
      )
      .filter(effectModel =>
        effectModel.effects.length
      );

  return createCharacterIntegrations({
    ruleEffects
  });
}


export function getRuleTreeRuleOptions(
  pages = []
) {

  return createRuleTreeModelFromPages(
    pages
  )
    .rules
    .map(rule => ({
      id:
        rule.id,
      title:
        rule.title,
      parentId:
        rule.parentId,
      groupId:
        rule.groupId,
      category:
        rule.category,
      effectCount:
        rule.effects.length
    }));
}


export function getLegacyRulePageImports(
  pages = []
) {

  return pages
    .filter(isRulePage)
    .map(createRuleFromPage);
}


function getRuleTreeEntityRules(
  pages = []
) {

  return getRuleTreeEntityData(
    pages
  )
    .flatMap(data =>
      data.rules
    );
}


function getRuleTreeEntityData(
  pages = []
) {

  return pages
    .filter(isRuleTreeEntityPage)
    .map(page => {

      const data =
        readRuleTreeDataFromHTML(
          page.content
        );

      return {
        activeRuleIds:
          data.activeRuleIds,
        rules:
          data.rules.map(rule => ({
            ...rule,
            sourceRuleTreeId:
              page.id,
            sourceType:
              rule.sourceType || 'ruleTree'
          }))
      };
    });
}


function isRulePage(
  page
) {

  return Boolean(
    page?.id &&
    normalizeTags(
      page
    )
      .some(tag =>
        RULE_TAGS.has(
          tag
        )
      )
  );
}


function isRuleTreeEntityPage(
  page
) {

  return (
    page?.template === 'ruleTree' ||
    page?.type === 'ruleTree' ||
    normalizeTags(page).includes('rule-tree')
  );
}


function createRuleFromPage(
  page
) {

  const effects =
    readRuleEffectsFromPage(
      page
    );

  return {
    id:
      page.id,
    title:
      page.title ||
      page.name ||
      'Правило',
    parentId:
      page.parent || page.parentId || null,
    sourcePageId:
      page.id,
    sourceType:
      'legacyRuleCard',
    tags:
      normalizeTags(
        page
      ),
    effects:
      effects.map(effect => ({
        ...effect,
        ruleId:
          effect.ruleId ||
          page.id
      }))
  };
}


function normalizeRule(
  rule
) {

  const id =
    String(rule?.id || '').trim();

  if (!id) return null;

  return {
    id,
    title:
      String(rule?.title || 'Правило').trim(),
    parentId:
      rule?.parentId || null,
    groupId:
      rule?.groupId ||
      (
        rule?.sourceType === 'legacyRuleCard'
          ? 'legacy'
          : 'core'
      ),
    category:
      rule?.category || 'Общее',
    conditions:
      Array.isArray(rule?.conditions)
        ? rule.conditions
        : [],
    inheritsRuleIds:
      Array.isArray(rule?.inheritsRuleIds)
        ? rule.inheritsRuleIds
        : [],
    sourcePackageId:
      rule?.sourcePackageId || null,
    sourcePageId:
      rule?.sourcePageId || null,
    sourceRuleTreeId:
      rule?.sourceRuleTreeId || null,
    sourceType:
      rule?.sourceType || 'ruleTree',
    tags:
      Array.isArray(rule?.tags)
        ? rule.tags
        : [],
    effects:
      Array.isArray(rule?.effects)
        ? rule.effects
        : []
  };
}


function normalizeActiveRuleIds(
  ids,
  rules
) {

  const ruleIds =
    new Set(
      rules.map(rule => rule.id)
    );

  return [
    ...new Set(
      (Array.isArray(ids) ? ids : [])
        .map(id => String(id || '').trim())
        .filter(id => id && ruleIds.has(id))
    )
  ];
}


function createRuleEffectsModel(
  rule
) {

  return createEffectsModel({
    effects:
      rule.effects.map(effect =>
        createLinkedCharacterEffect(
          {
            ...effect,
            id:
              createRuleEffectId(
                rule.id,
                effect.id
              ),
            title:
              `${rule.title}: ${effect.title}`
          },
          {
            sourceType:
              'rule',
            ruleId:
              rule.id
          }
        )
      ),
    source:
      'rule'
  });
}


function readRuleEffectsFromPage(
  page
) {

  const model =
    readEffectsModelFromHTML(
      page.content
    );

  if (model.effects.length) {

    return model.effects;
  }

  return readRuleEffectsWithoutDOM(
    page.content
  );
}


function readRuleEffectsWithoutDOM(
  html
) {

  if (
    typeof document !== 'undefined' ||
    !html
  ) {

    return [];
  }

  const match =
    String(html)
      .match(/<script\b[^>]*data-character-effects[^>]*>([\s\S]*?)<\/script>/i);

  if (!match) return [];

  try {

    return createEffectsModel({
      ...JSON.parse(
        match[1]
      ),
      source:
        'effects-data'
    }).effects;

  } catch {

    return [];
  }
}


function createRuleEffectId(
  ruleId,
  effectId
) {

  return `rule-${ruleId}-${effectId || 'effect'}`
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/giu, '-')
    .replace(/^-+|-+$/g, '');
}


function normalizeTags(
  page
) {

  return (Array.isArray(page?.tags) ? page.tags : [])
    .map(tag =>
      String(tag || '')
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);
}

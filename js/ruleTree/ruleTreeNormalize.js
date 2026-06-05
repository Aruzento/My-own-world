import {
  createDefaultRuleTreeData
} from './ruleTreeDefaults.js';


// Нормализация нужна, чтобы старые или поврежденные JSON-данные не ломали UI Rule Tree.

export function normalizeRuleTreeData(
  data
) {

  const fallback =
    createDefaultRuleTreeData();

  if (!data || typeof data !== 'object') {

    return fallback;
  }

  const rules =
    Array.isArray(data.rules)
      ? data.rules.map(normalizeRule).filter(Boolean)
      : [];

  const groups =
    normalizeGroups(
      data.groups
    );

  const existingRuleIds =
    new Set(
      rules.map(rule => rule.id)
    );

  const activeRuleIds =
    Array.isArray(data.activeRuleIds)
      ? data.activeRuleIds
        .map(id => String(id || '').trim())
        .filter(id => id && existingRuleIds.has(id))
      : [];

  return {
    version: 1,
    groups,
    activeRuleIds:
      [...new Set(activeRuleIds)],
    rules
  };
}


export function normalizeRule(
  rule
) {

  const id =
    String(rule?.id || '').trim();

  if (!id) return null;

  return {
    id,
    title:
      String(rule?.title || 'Правило').trim() || 'Правило',
    description:
      String(rule?.description || '').trim(),
    parentId:
      rule?.parentId || null,
    groupId:
      String(rule?.groupId || inferDefaultGroupId(rule)).trim(),
    category:
      String(rule?.category || 'Общее').trim() || 'Общее',
    conditions:
      normalizeConditions(
        rule?.conditions
      ),
    inheritsRuleIds:
      normalizeIdList(
        rule?.inheritsRuleIds
      ),
    sourcePackageId:
      rule?.sourcePackageId || null,
    sourcePageId:
      rule?.sourcePageId || null,
    sourceType:
      String(rule?.sourceType || 'ruleTree').trim() || 'ruleTree',
    tags:
      Array.isArray(rule?.tags)
        ? rule.tags.map(tag => String(tag || '').trim()).filter(Boolean)
        : [],
    effects:
      Array.isArray(rule?.effects)
        ? rule.effects
        : []
  };
}


export function normalizeRuleTreeGroup(
  group
) {

  const id =
    String(group?.id || '').trim();

  if (!id) return null;

  return {
    id,
    title:
      String(group?.title || 'Группа правил').trim() || 'Группа правил',
    parentId:
      group?.parentId || null
  };
}


function normalizeGroups(
  groups
) {

  const defaults =
    createDefaultRuleTreeData()
      .groups;

  const merged =
    [
      ...defaults,
      ...(Array.isArray(groups) ? groups : [])
    ];

  return [
    ...new Map(
      merged
        .map(normalizeRuleTreeGroup)
        .filter(Boolean)
        .map(group => [
          group.id,
          group
        ])
    ).values()
  ];
}


function normalizeConditions(
  conditions
) {

  return (Array.isArray(conditions) ? conditions : [])
    .map(condition => ({
      type:
        String(condition?.type || 'manual').trim() || 'manual',
      value:
        String(condition?.value || '').trim(),
      note:
        String(condition?.note || '').trim()
    }))
    .filter(condition =>
      condition.value || condition.note
    );
}


function normalizeIdList(
  values
) {

  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map(value => String(value || '').trim())
        .filter(Boolean)
    )
  ];
}


function inferDefaultGroupId(
  rule
) {

  return rule?.sourceType === 'legacyRuleCard'
    ? 'legacy'
    : 'core';
}

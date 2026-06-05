import {
  normalizeRule,
  normalizeRuleTreeData,
  normalizeRuleTreeGroup
} from './ruleTreeNormalize.js';


// Модель Rule Tree: единственный источник истины для списка правил и выбранных активных правил.

export class RuleTreeModel {

  constructor(
    data
  ) {

    this.data =
      normalizeRuleTreeData(
        data
      );
  }


  getRule(
    ruleId
  ) {

    return this.data.rules.find(rule =>
      rule.id === ruleId
    ) || null;
  }


  toggleActiveRule(
    ruleId,
    active
  ) {

    if (!this.getRule(ruleId)) return;

    const ids =
      new Set(
        this.data.activeRuleIds
      );

    if (active) {

      ids.add(
        ruleId
      );

    } else {

      ids.delete(
        ruleId
      );
    }

    this.data.activeRuleIds =
      [...ids];
  }


  importRule(
    rule
  ) {

    const normalized =
      normalizeRule(
        {
          groupId:
            'legacy',
          ...rule
        }
      );

    if (!normalized) return null;

    const existingIndex =
      this.data.rules.findIndex(item =>
        item.id === normalized.id
      );

    if (existingIndex >= 0) {

      this.data.rules[existingIndex] =
        {
          ...this.data.rules[existingIndex],
          ...normalized
        };

      return this.data.rules[existingIndex];
    }

    this.data.rules.push(
      normalized
    );

    return normalized;
  }


  addGroup(
    title,
    parentId = null
  ) {

    const group =
      normalizeRuleTreeGroup({
        id:
          createGroupId(
            title
          ),
        title,
        parentId
      });

    if (!group) return null;

    const existing =
      this.data.groups.find(item =>
        item.id === group.id
      );

    if (existing) {

      return existing;
    }

    this.data.groups.push(
      group
    );

    return group;
  }


  updateRule(
    ruleId,
    patch
  ) {

    const current =
      this.getRule(
        ruleId
      );

    if (!current) return null;

    const updated =
      normalizeRule({
        ...current,
        ...patch,
        id:
          current.id
      });

    if (!updated) return null;

    this.data.rules =
      this.data.rules.map(rule =>
        rule.id === ruleId
          ? updated
          : rule
      );

    return updated;
  }


  addCondition(
    ruleId,
    condition
  ) {

    const rule =
      this.getRule(
        ruleId
      );

    if (!rule) return null;

    return this.updateRule(
      ruleId,
      {
        conditions: [
          ...rule.conditions,
          condition
        ]
      }
    );
  }


  removeCondition(
    ruleId,
    conditionIndex
  ) {

    const rule =
      this.getRule(
        ruleId
      );

    if (!rule) return null;

    return this.updateRule(
      ruleId,
      {
        conditions:
          rule.conditions.filter((_, index) =>
            index !== Number(conditionIndex)
          )
      }
    );
  }


  importPackage(
    packageData
  ) {

    const imported =
      normalizeRuleTreeData(
        packageData
      );

    imported.groups.forEach(group => {

      if (
        !this.data.groups.some(item => item.id === group.id)
      ) {

        this.data.groups.push(
          group
        );
      }
    });

    imported.rules.forEach(rule => {

      const sourceType =
        !rule.sourceType || rule.sourceType === 'ruleTree'
          ? 'rulePackage'
          : rule.sourceType;

      this.importRule({
        ...rule,
        sourceType
      });
    });

    this.data.activeRuleIds =
      [
        ...new Set([
          ...this.data.activeRuleIds,
          ...imported.activeRuleIds
        ])
      ]
        .filter(id =>
          this.getRule(
            id
          )
        );
  }


  exportPackage() {

    return {
      version:
        this.data.version,
      groups:
        this.data.groups.map(group => ({
          ...group
        })),
      activeRuleIds:
        [
          ...this.data.activeRuleIds
        ],
      rules:
        this.data.rules.map(rule => ({
          ...rule,
          conditions:
            rule.conditions.map(condition => ({
              ...condition
            })),
          inheritsRuleIds:
            [
              ...rule.inheritsRuleIds
            ],
          effects:
            rule.effects.map(effect => ({
              ...effect,
              modifiers: {
                ...(effect.modifiers || {})
              }
            }))
        }))
    };
  }


  removeRule(
    ruleId
  ) {

    this.data.rules =
      this.data.rules.filter(rule =>
        rule.id !== ruleId
      );

    this.data.activeRuleIds =
      this.data.activeRuleIds.filter(id =>
        id !== ruleId
      );
  }
}


function createGroupId(
  title
) {

  return String(title || 'group')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/giu, '-')
    .replace(/^-+|-+$/g, '') ||
    `group-${Date.now()}`;
}

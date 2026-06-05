import {
  readEffectsModelFromPage
} from '../character/effectsModel.js';

import {
  getCardVariableValue,
  readCardVariablesFromPage
} from '../properties/cardVariablesModel.js';


// Rule Tree Engine превращает metadata правил в исполняемую проверку.
// Он не меняет HTML и не сохраняет данные: только решает, какие правила применимы.

export function createRuleEvaluationContext(
  {
    page = null,
    variablesModel = null,
    effectsModel = null,
    extraValues = {}
  } = {}
) {

  const variables =
    variablesModel ||
    page?.variablesModel ||
    readCardVariablesFromPage(
      page
    );

  const effects =
    effectsModel ||
    page?.effectsModel ||
    readEffectsModelFromPage(
      page
    );

  return {
    page,
    variables,
    effects,
    values: {
      level:
        normalizeNumber(
          getCardVariableValue(
            variables,
            'level',
            1
          ),
          1
        ),
      hpCurrent:
        normalizeNumber(
          getCardVariableValue(
            variables,
            'hpCurrent',
            0
          ),
          0
        ),
      hpMax:
        normalizeNumber(
          getCardVariableValue(
            variables,
            'hpMax',
            0
          ),
          0
        ),
      armorClass:
        normalizeNumber(
          getCardVariableValue(
            variables,
            'armorClass',
            10
          ),
          10
        ),
      speed:
        normalizeNumber(
          getCardVariableValue(
            variables,
            'speed',
            30
          ),
          30
        ),
      ...(page?.ruleContext || {}),
      ...extraValues
    }
  };
}


export function evaluateRuleTreeRules(
  {
    rules = [],
    activeRuleIds = [],
    context = createRuleEvaluationContext()
  } = {}
) {

  const inheritance =
    resolveRuleInheritance(
      rules
    );

  const active =
    new Set(
      activeRuleIds
    );

  const evaluations =
    inheritance.rules
      .filter(rule =>
        active.has(
          rule.id
        )
      )
      .map(rule =>
        evaluateRuleApplicability(
          rule,
          context
        )
      );

  return {
    applicableRules:
      evaluations
        .filter(result => result.applicable)
        .map(result => result.rule),
    skippedRules:
      evaluations
        .filter(result => !result.applicable)
        .map(result => result.rule),
    evaluations,
    diagnostics:
      [
        ...inheritance.diagnostics,
        ...evaluations.flatMap(result =>
          result.diagnostics
        )
      ]
  };
}


export function resolveRuleInheritance(
  rules = []
) {

  const byId =
    new Map(
      rules.map(rule => [
        rule.id,
        rule
      ])
    );

  const cache =
    new Map();

  const diagnostics =
    [];

  const resolvedRules =
    rules.map(rule =>
      resolveRule(
        rule,
        byId,
        cache,
        diagnostics,
        []
      )
    );

  return {
    rules:
      resolvedRules,
    diagnostics
  };
}


export function evaluateRuleApplicability(
  rule,
  context = createRuleEvaluationContext()
) {

  const conditionResults =
    (rule.conditions || []).map(condition =>
      evaluateRuleCondition(
        condition,
        context
      )
    );

  const applicable =
    conditionResults.every(result =>
      result.passed
    );

  return {
    rule,
    applicable,
    conditionResults,
    diagnostics:
      conditionResults
        .filter(result => result.warning)
        .map(result => ({
          ruleId:
            rule.id,
          condition:
            result.condition,
          message:
            result.warning
        }))
  };
}


export function evaluateRuleCondition(
  condition,
  context = createRuleEvaluationContext()
) {

  const type =
    String(condition?.type || 'manual').trim();

  if (type === 'manual') {

    return createConditionResult(
      condition,
      true,
      'manual condition'
    );
  }

  if (type === 'level') {

    return createConditionResult(
      condition,
      compareNumber(
        context.values.level,
        condition?.value,
        '>='
      ),
      `level ${condition?.value || ''}`.trim()
    );
  }

  if (type === 'state') {

    const key =
      String(condition?.value || '').trim().toLowerCase();

    const passed =
      Boolean(
        key &&
        context.effects?.conditions?.some(item =>
          item.key === key
        )
      );

    return createConditionResult(
      condition,
      passed,
      `state ${key}`
    );
  }

  if (type === 'card-variable') {

    return evaluateVariableCondition(
      condition,
      context
    );
  }

  if (type === 'formula') {

    return evaluateFormulaCondition(
      condition,
      context
    );
  }

  return createConditionResult(
    condition,
    false,
    '',
    `Unknown rule condition type: ${type}`
  );
}


function resolveRule(
  rule,
  byId,
  cache,
  diagnostics,
  stack
) {

  if (cache.has(rule.id)) {

    return cache.get(
      rule.id
    );
  }

  if (stack.includes(rule.id)) {

    diagnostics.push({
      ruleId:
        rule.id,
      message:
        `Rule inheritance cycle: ${[...stack, rule.id].join(' -> ')}`
    });

    return rule;
  }

  const inheritedRules =
    (rule.inheritsRuleIds || [])
      .map(id => {

        const inherited =
          byId.get(
            id
          );

        if (!inherited) {

          diagnostics.push({
            ruleId:
              rule.id,
            message:
              `Missing inherited rule: ${id}`
          });
        }

        return inherited;
      })
      .filter(Boolean)
      .map(inherited =>
        resolveRule(
          inherited,
          byId,
          cache,
          diagnostics,
          [
            ...stack,
            rule.id
          ]
        )
      );

  const resolved =
    {
      ...rule,
      conditions:
        mergeUniqueByJSON(
          inheritedRules.flatMap(item => item.conditions || []),
          rule.conditions || []
        ),
      effects:
        mergeUniqueById(
          inheritedRules.flatMap(item => item.effects || []),
          rule.effects || []
        )
    };

  cache.set(
    rule.id,
    resolved
  );

  return resolved;
}


function evaluateVariableCondition(
  condition,
  context
) {

  const expression =
    parseComparison(
      condition?.value
    );

  if (!expression) {

    const value =
      getCardVariableValue(
        context.variables,
        condition?.value,
        ''
      );

    return createConditionResult(
      condition,
      Boolean(value),
      `variable ${condition?.value || ''}`.trim()
    );
  }

  const actual =
    getCardVariableValue(
      context.variables,
      expression.left,
      ''
    );

  return createConditionResult(
    condition,
    compareValues(
      actual,
      expression.operator,
      expression.right
    ),
    `${expression.left} ${expression.operator} ${expression.right}`
  );
}


function evaluateFormulaCondition(
  condition,
  context
) {

  const expression =
    parseComparison(
      condition?.value
    );

  if (!expression) {

    return createConditionResult(
      condition,
      false,
      '',
      'Formula condition supports only simple comparison: left >= right'
    );
  }

  const left =
    readContextValue(
      context,
      expression.left
    );

  const right =
    readContextValue(
      context,
      expression.right,
      expression.right
    );

  return createConditionResult(
    condition,
    compareValues(
      left,
      expression.operator,
      right
    ),
    `${expression.left} ${expression.operator} ${expression.right}`
  );
}


function readContextValue(
  context,
  key,
  fallback = ''
) {

  const normalized =
    String(key || '').trim();

  if (Object.hasOwn(context.values || {}, normalized)) {

    return context.values[normalized];
  }

  return getCardVariableValue(
    context.variables,
    normalized,
    fallback
  );
}


function parseComparison(
  value
) {

  const match =
    String(value || '')
      .trim()
      .match(/^([a-zA-Z0-9_.-]+)\s*(>=|<=|==|=|>|<|!=)\s*(.+)$/);

  if (!match) return null;

  return {
    left:
      match[1],
    operator:
      match[2] === '='
        ? '=='
        : match[2],
    right:
      match[3].trim()
  };
}


function compareNumber(
  actual,
  expression,
  defaultOperator
) {

  const raw =
    String(expression || '').trim();

  const match =
    raw.match(/^(>=|<=|==|=|>|<|!=)?\s*(-?\d+(\.\d+)?)$/);

  if (!match) return false;

  return compareValues(
    actual,
    match[1] || defaultOperator,
    Number(match[2])
  );
}


function compareValues(
  left,
  operator,
  right
) {

  const leftNumber =
    Number(left);

  const rightNumber =
    Number(right);

  const comparableLeft =
    Number.isFinite(leftNumber)
      ? leftNumber
      : String(left);

  const comparableRight =
    Number.isFinite(rightNumber)
      ? rightNumber
      : String(right);

  if (operator === '>=') return comparableLeft >= comparableRight;
  if (operator === '<=') return comparableLeft <= comparableRight;
  if (operator === '>') return comparableLeft > comparableRight;
  if (operator === '<') return comparableLeft < comparableRight;
  if (operator === '!=') return comparableLeft !== comparableRight;

  return comparableLeft === comparableRight;
}


function createConditionResult(
  condition,
  passed,
  explanation,
  warning = ''
) {

  return {
    condition,
    passed:
      Boolean(passed),
    explanation,
    warning
  };
}


function mergeUniqueById(
  left,
  right
) {

  return [
    ...new Map(
      [
        ...left,
        ...right
      ]
        .map(item => [
          item.id || JSON.stringify(item),
          item
        ])
    ).values()
  ];
}


function mergeUniqueByJSON(
  left,
  right
) {

  return [
    ...new Map(
      [
        ...left,
        ...right
      ]
        .map(item => [
          JSON.stringify(item),
          item
        ])
    ).values()
  ];
}


function normalizeNumber(
  value,
  fallback
) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}
